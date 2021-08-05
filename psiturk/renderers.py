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

    def _filter_and_sample_materials(self, materials):
        # drop any materials marked for exclusion
        items = [item for item in materials["items"] if not item["exclude"]]

        # drop materials with missing fields
        critical_fields = ["A", "L", "V", "P", "prompt P", "L det",
                           "topic A", "topic L", "conj"]
        items = [item for item in items
                 if not any(not item[field] for field in critical_fields)]

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

    def build_trial(self, item, condition):
        self._reset_var_cache()

        # prepare function for quickly processing item data
        p = functools.partial(self.process_field, item)

        agent_is_topic, agent_is_subject = condition

        trial = {
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
        }

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

    def get_trials(self, materials, materials_id, args=None):
        raise NotImplementedError()


@register_trial_renderer("00_comprehension_swarm-construction-meaning")
class ComprehensionSwarmMeaningRenderer(SwarmPilotRenderer):

    TOTAL_NUM_TRIALS = 30
    NUM_EXP_TRIALS = 18

    def build_trial(self, item, condition):
        trial = super().build_trial(item, condition)

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
        # zero = agent. Not actually used by our `build_trial`.
        condition_choices = [
            (0, 0),  # topic = a, subject = a
            (0, 1),  # topic = a, subject = l
        ]

        trial_conditions = random.choices(condition_choices, k=self.NUM_EXP_TRIALS)

        trials = [self.build_trial(item, condition)
                  for item, condition in zip(items, trial_conditions)]
        return trials

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


@register_trial_renderer("01_production_swarm-topicality")
class ProductionSwarmTopicalityRenderer(SwarmPilotRenderer):

    # DEV
    NUM_TRIALS = 20

    def build_trial(self, item, condition):
        trial = super().build_trial(item, condition)

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

    def get_trials(self, materials, materials_id, args=None):
        materials, = materials
        items = self._filter_and_sample_materials(materials)

        # sample random topic settings for each item. both subject options
        # presented to exp subject
        condition_choices = [
            (0, 0),  # topic = a, subject = a
            (1, 0),  # topic = b, subject = a
        ]

        trial_conditions = random.choices(condition_choices, k=self.NUM_TRIALS)

        trials = [self.build_trial(item, condition)
                  for item, condition in zip(items, trial_conditions)]
        ret = dict(experiment=self.experiment_name, materials_id=materials_id,
                   trials=trials)

        return ret


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
class AcceptabilitySwarmRenderer(SwarmPilotRenderer, AcceptabilityFillerMixin):

    # DEV
    TOTAL_NUM_TRIALS = 40
    NUM_EXP_TRIALS = 20

    def build_trial(self, item, condition):
        trial = super().build_trial(item, condition)

        _, agent_is_subject = condition

        sentence_key = "agent" if agent_is_subject else "location"
        trial["sentence"] = \
            trial["critical_clause"][sentence_key].capitalize() + "."

        return trial

    def get_exp_trials(self, materials):
        items = self._filter_and_sample_materials(materials)

        # sample random subject settings. topic clause not used in this exp
        condition_choices = [
            (0, 1),  # topic = a, subject = a
            (0, 1),  # topic = b, subject = a
        ]

        trial_conditions = random.choices(condition_choices, k=self.NUM_TRIALS)

        trials = [self.build_trial(item, condition)
                  for item, condition in zip(items, trial_conditions)]
        return trials

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
