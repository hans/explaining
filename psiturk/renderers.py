"""
Defines "trial renderers" which convert experimental materials into actual
raw data for trial sequences. Final minimal rendering happens on frontend.
"""

import functools
import random
import re

from util import random_name


class TrialRenderer(object):

    def __init__(self, experiment_name):
        self.experiment_name = experiment_name

    def get_trials(materials: list, materials_id: str, args=None):
        """
        Render trials for the given set of materials.

        Args:
            materials:
            materials_id:
            args: Other arguments from the request.
        """
        raise NotImplementedError()


TRIAL_RENDERERS = {}


def register_trial_renderer(experiment_name):
    def decorator(cls):
        TRIAL_RENDERERS[experiment_name] = cls
        return cls

    return decorator


class SwarmPilotRenderer(TrialRenderer):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Template variables deployed in a given item/trial
        self._var_cache = {}

    def _reset_var_cache(self):
        self._var_cache = {}

    def _draw_name(self):
        existing_names = set([name for k, name in self._var_cache.items()
                              if k.startswith("PERSON")])

        # rejection-sample a unique name
        name, gender = random_name()
        while name in existing_names:
            name, gender = random_name()

        return name, gender

    def _replace_name(self, name_id: str, subtype: str = None):
        if f"PERSON{name_id}" in self._var_cache:
            return self._var_cache[f"PERSON{name_id}"
                                   + (f"_{subtype}" if subtype else "")]

        name, gender = self._draw_name()
        self._var_cache[f"PERSON{name_id}"] = name
        self._var_cache[f"PERSON{name_id}_POSS"] = \
            "her" if gender == "female" else "his"

        return self._replace_name(name_id, subtype=subtype)

    def _filter_materials(self, materials):
        # drop any materials marked for exclusion
        items = [item for item in materials["items"] if not item["exclude"]]

        # drop materials with missing fields
        critical_fields = ["A", "L", "V", "P", "prompt P", "L det",
                           "topic A", "topic L", "conj"]
        items = [item for item in items
                 if not any(not item[field] for field in critical_fields)]
        return items

    def _filter_and_sample_materials(self, materials):
        items = self._filter_materials(materials)
        items = random.sample(items, self.NUM_EXP_TRIALS)

        return items

    def process_field(self, item_data, field):
        field = item_data[field]

        # Find--replace person name variables and related possessives
        field = re.sub(
            r"%PERSON(\d+)(?:_([^%]+))?%",
            lambda match: self._replace_name(match.group(1), match.group(2)),
            field)

        return field

    def build_trial(self, item, condition, materials_id):
        self._reset_var_cache()

        # prepare function for quickly processing item data
        p = functools.partial(self.process_field, item)

        trial = {
            "materials_id": materials_id,
            "item_id": item["id"],
            "condition_id": condition,

            "agent": item["A"],
            "location": item["L"],
            "verb": item["V"],

            "agent_plural": item["A countable?"],
            "location_plural": item["L plural?"],
            "location_determiner": p("L det"),
            "preposition": item["P"],
            "prompt_preposition": item["prompt P"],
            "conjunction": item["conj"],

            "agent_pronoun_subject": item["given A pron subj"],
            "agent_pronoun_object": item["given A pron obj"],
            "location_pronoun_subject": item["given L pron subj"],
            "location_pronoun_object": item["given L pron obj"],
        }

        return trial

    def get_filler_trials(self, materials, num_trials: int):
        raise NotImplementedError()

    def get_exp_trials(self, materials):
        raise NotImplementedError()

    def get_trials(self, materials, materials_id, args=None):
        exp_materials, filler_materials = materials

        exp_trials = self.get_exp_trials(exp_materials)

        num_fillers = self.TOTAL_NUM_TRIALS - self.NUM_EXP_TRIALS
        filler_trials = self.get_filler_trials(filler_materials, num_fillers)

        trials = exp_trials + filler_trials
        random.shuffle(trials)

        ret = dict(experiment=self.experiment_name, materials_id=materials_id,
                   trials=trials)

        return ret


class SwarmNPPilotRenderer(SwarmPilotRenderer):
    """
    renderer establishing setup with topicality, and critical clause
    uses swarm-alternation with actual NPs (as opposed to pronouns)
    """

    def build_trial(self, item, condition, materials_id):
        trial = super().build_trial(item, condition, materials_id)

        # prepare function for quickly processing item data
        p = functools.partial(self.process_field, item)

        # clause setup which makes agent / location topical
        trial["topic_clause"] = {
            "agent": p("topic A"),
            "location": p("topic L"),
        }

        trial["critical_clause"] = {
            "agent": "".join([
                trial["agent"], " ",
                "are" if trial["agent_plural"] else "is", " ",
                trial["verb"], "ing ",
                trial["preposition"], " ",
                trial["location_determiner"], " ",
                trial["location"],
            ]),

            "location": "".join([
                trial["location_determiner"], " ",
                trial["location"], " ",
                "are" if trial["location_plural"] else "is", " ",
                trial["verb"], "ing with ",
                trial["agent"],
            ]),
        }

        return trial


class SwarmAnaphorPilotRenderer(SwarmPilotRenderer):
    """
    renderer establishing setup with clear discourse referent, and critical
    clause uses swarm-alternation with pronoun for established referent
    """

    def _filter_materials(self, materials):
        # drop any materials marked for exclusion
        items = [item for item in materials["items"] if not item["exclude"]]

        # drop materials with missing fields
        critical_fields = ["A", "L", "V", "P", "prompt P", "L det",
                           "given A", "given L", "given A pron subj",
                           "given A pron obj", "given L pron subj",
                           "given L pron obj"]
        items = [item for item in items
                 if not any(not item[field] for field in critical_fields)]
        return items

    def build_trial(self, item, condition, materials_id):
        trial = super().build_trial(item, condition, materials_id)

        # prepare function for quickly processing item data
        p = functools.partial(self.process_field, item)

        agent_is_given, _ = condition

        # clause setup which makes agent / location topical
        trial["setup_clause"] = {
            "agent": p("given A"),
            "location": p("given L"),
        }

        trial["critical_clause"] = {
            "agent": "".join([
                trial["agent_pronoun_subject"]
                    if agent_is_given else trial["agent"], " ",
                "are" if trial["agent_plural"] else "is", " ",
                trial["verb"], "ing ",
                trial["preposition"], " ",
                "".join([trial["location_determiner"], " ",
                         trial["location"]])
                    if agent_is_given else trial["location_pronoun_object"],
            ]),

            "location": "".join([
                "".join([trial["location_determiner"], " ",
                         trial["location"]])
                    if agent_is_given else trial["location_pronoun_subject"],
                " ",
                "are" if trial["location_plural"] else "is", " ",
                trial["verb"], "ing with ",
                trial["agent_pronoun_object"]
                    if agent_is_given else trial["agent"],
            ]),
        }

        return trial


@register_trial_renderer("00_comprehension_swarm-construction-meaning")
class ComprehensionSwarmMeaningRenderer(SwarmNPPilotRenderer):

    TOTAL_NUM_TRIALS = 30
    NUM_EXP_TRIALS = 18

    def build_trial(self, item, condition, materials_id):
        trial = super().build_trial(item, condition, materials_id)

        _, agent_is_subject = condition
        clause = trial["critical_clause"]["agent" if agent_is_subject
                                          else "location"]
        trial["sentence"] = clause.capitalize() + "."

        trial["prompt"] = " ".join([
            "How", "many" if trial["agent_plural"] else "much",
            trial["agent"],
            "are" if trial["agent_plural"] else "is",
            trial["prompt_preposition"],
            trial["location_determiner"],
            trial["location"]
        ]) + "?"

        return trial

    def get_filler_trials(self, materials, num_trials: int):
        empty_items = [item for item in materials["items"]
                       if item["rating"] == "empty"]
        full_items = [item for item in materials["items"]
                      if item["rating"] == "full"]

        # Sample an equal balance of "empty" and "full"
        num_empty = num_trials // 2

        bad_trials = random.sample(empty_items, num_empty)
        good_trials = random.sample(full_items, num_trials - num_empty)
        all_trials = bad_trials + good_trials

        all_trials = [{
            "item_id": trial["id"],
            "condition_id": ["filler", trial["rating"]],

            "sentence": trial["sentence"],
            "prompt": trial["prompt"],
        } for trial in all_trials]

        return all_trials

    def get_exp_trials(self, materials):
        items = self._filter_and_sample_materials(materials)

        # sample random subject settings for each item
        # topic manipulation is not relevant here -- we'll just set to
        # zero = location. Not actually used by our `build_trial`.
        condition_choices = [
            (0, 0),  # topic = l, subject = l
            (0, 1),  # topic = l, subject = a
        ]

        trial_conditions = random.choices(condition_choices, k=self.NUM_EXP_TRIALS)

        trials = [self.build_trial(item, condition, materials["name"])
                  for item, condition in zip(items, trial_conditions)]
        return trials


@register_trial_renderer("01_production_swarm-topicality")
class ProductionSwarmTopicalityRenderer(SwarmNPPilotRenderer):

    TOTAL_NUM_TRIALS = 30
    NUM_EXP_TRIALS = 18

    def build_trial(self, item, condition, materials_id):
        trial = super().build_trial(item, condition, materials_id)

        agent_is_topic, _ = condition
        topic_setup = trial["topic_clause"]["agent" if agent_is_topic
                                            else "location"]
        trial["sentences"] = {
            "agent": "".join([topic_setup, ", ", trial["conjunction"],
                              " ", trial["critical_clause"]["agent"], "."]),
            "location": "".join([topic_setup, ", ", trial["conjunction"],
                                 " ", trial["critical_clause"]["location"], "."])
        }

        return trial

    def get_filler_trials(self, materials, num_trials: int):
        trials = random.sample(materials["items"], num_trials)

        def build_trial(t):
            good_sentence = "".join(
                [t["prefix"], ", ", t["conj"], " ", t["good_completion"]])
            bad_sentence = "".join(
                [t["prefix"], ", ", t["conj"], " ", t["bad_completion"]])

            return {
                "materials_id": materials["name"],
                "item_id": t["id"],
                "condition_id": ["filler", t["manipulation"]],

                "sentences": {
                    "good": good_sentence,
                    "bad": bad_sentence,
                },
                "conjunction": t["conj"],
            }
        trials = [build_trial(t) for t in trials]

        return trials

    def get_exp_trials(self, materials):
        items = self._filter_and_sample_materials(materials)

        # sample random topic settings for each item. both subject options
        # presented to exp subject
        condition_choices = [
            (0, 1),  # topic = l, subject = a
            (1, 1),  # topic = a, subject = a
        ]

        trial_conditions = random.choices(condition_choices, k=self.NUM_EXP_TRIALS)

        trials = [self.build_trial(item, condition, materials["name"])
                  for item, condition in zip(items, trial_conditions)]
        return trials


class AcceptabilityFillerMixin(object):

    def get_filler_trials(self, materials, num_trials: int):
        bad_items = [item for item in materials["items"] if item["rating"] == "bad"]
        good_items = [item for item in materials["items"] if item["rating"] == "good"]

        # Sample an equal balance of "bad" and "good"
        num_bad = num_trials // 2

        bad_trials = random.sample(bad_items, num_bad)
        good_trials = random.sample(good_items, num_trials - num_bad)
        all_trials = bad_trials + good_trials

        all_trials = [{
            "item_id": trial["id"],
            "condition_id": ["filler", trial["rating"]],
            "sentence": trial["sentence"],
        } for trial in all_trials]

        random.shuffle(all_trials)

        return all_trials


@register_trial_renderer("02_acceptability_swarm")
class AcceptabilitySwarmRenderer(SwarmNPPilotRenderer, AcceptabilityFillerMixin):

    TOTAL_NUM_TRIALS = 38
    NUM_EXP_TRIALS = 18

    def build_trial(self, item, condition, materials_id):
        trial = super().build_trial(item, condition, materials_id)

        _, agent_is_subject = condition

        sentence_key = "agent" if agent_is_subject else "location"
        trial["sentence"] = \
            trial["critical_clause"][sentence_key].capitalize() + "."

        return trial

    def get_exp_trials(self, materials):
        items = self._filter_and_sample_materials(materials)

        # sample random subject settings. topic clause not used in this exp
        condition_choices = [
            (0, 0),  # topic = a, subject = l
            (0, 1),  # topic = b, subject = a
        ]

        trial_conditions = random.choices(condition_choices, k=self.NUM_EXP_TRIALS)

        trials = [self.build_trial(item, condition, materials["name"])
                  for item, condition in zip(items, trial_conditions)]
        return trials


@register_trial_renderer("03_production_swarm-givenness")
class ProductionSwarmGivennessRenderer(SwarmAnaphorPilotRenderer):

    TOTAL_NUM_TRIALS = 30
    NUM_EXP_TRIALS = 18

    def build_trial(self, item, condition, materials_id):
        trial = super().build_trial(item, condition, materials_id)

        agent_is_given, _ = condition
        setup = trial["setup_clause"]["agent" if agent_is_given
                                      else "location"]
        trial["sentences"] = {
            "agent":
                "".join([setup, ". ",
                         trial["critical_clause"]["agent"], "."]),
            "location":
                "".join([setup, ". ",
                         trial["critical_clause"]["location"], "."]),
        }

        return trial

    def get_filler_trials(self, materials, num_trials: int):
        trials = random.sample(materials["items"], num_trials)

        def build_trial(t):
            good_sentence = "".join(
                [t["prefix"], ". ",
                 t["good_completion"].capitalize()])
            bad_sentence = "".join(
                [t["prefix"], ". ",
                 t["bad_completion"].capitalize()])

            return {
                "materials_id": materials["name"],
                "item_id": t["id"],
                "condition_id": ["filler", t["manipulation"]],

                "sentences": {
                    "good": good_sentence,
                    "bad": bad_sentence,
                },
            }
        trials = [build_trial(t) for t in trials]

        return trials

    def get_exp_trials(self, materials):
        items = self._filter_and_sample_materials(materials)

        # sample random topic settings for each item. both subject options
        # presented to exp subject
        condition_choices = [
            (0, 1),  # given = l, subject = a
            (1, 1),  # given = a, subject = a
        ]

        trial_conditions = random.choices(condition_choices, k=self.NUM_EXP_TRIALS)

        trials = [self.build_trial(item, condition, materials["name"])
                  for item, condition in zip(items, trial_conditions)]
        return trials
