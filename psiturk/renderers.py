"""
Defines "trial renderers" which convert experimental materials into actual
raw data for trial sequences. Final minimal rendering happens on frontend.
"""

import functools
import itertools
import math
import random
import re

from util import random_name


class TrialRenderer(object):
    # NB not threadsafe.

    def __init__(self, experiment_name):
        self.experiment_name = experiment_name

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

    def process_field(self, item_data, field):
        field = item_data[field]

        # Find--replace person name variables and related possessives
        field = re.sub(
            r"%PERSON(\d+)(?:_([^%]+))?%",
            lambda match: self._replace_name(match.group(1), match.group(2)),
            field)

        return field

    def get_trials(self, materials: list, materials_id: str, args=None):
        """
        Render trials for the given set of materials.

        Args:
            materials:
            materials_id:
            args: Other arguments from the request.
        """
        raise NotImplementedError()

        for item in materials:
            self._reset_var_cache()

            # render trial from item
            pass


TRIAL_RENDERERS = {}


def register_trial_renderer(experiment_name):
    def decorator(cls):
        TRIAL_RENDERERS[experiment_name] = cls
        return cls

    return decorator


class SwarmPilotRenderer(TrialRenderer):

    # Drop materials items which have empty values for any of these fields.
    required_nonempty_fields = ["A", "L", "V", "P", "prompt P", "L det",
                                "topic A", "topic L", "conj"]

    def _filter_materials(self, materials):
        # drop any materials marked for exclusion
        items = [item for item in materials["items"]
                 if not item.get("exclude", False)]

        # drop materials with missing fields
        items = [item for item in items
                 if not any(not item[field]
                 for field in self.required_nonempty_fields)]
        return items

    def _filter_and_sample_materials(self, materials):
        items = self._filter_materials(materials)
        items = random.sample(items, self.NUM_EXP_TRIALS)

        return items

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

    required_nonempty_fields = SwarmPilotRenderer.required_nonempty_fields + \
        ["A", "L", "V", "P", "prompt P", "L det",
         "given A", "given L", "given A pron subj",
         "given A pron obj", "given L pron subj",
         "given L pron obj"]

    def build_trial(self, item, condition, materials_id):
        trial = super().build_trial(item, condition, materials_id)

        trial.update({
            "agent_pronoun_subject": item["given A pron subj"],
            "agent_pronoun_object": item["given A pron obj"],
            "location_pronoun_subject": item["given L pron subj"],
            "location_pronoun_object": item["given L pron obj"],
        })

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
            "sentence": self.process_field(trial, "sentence"),
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


@register_trial_renderer("08_acceptability_swarm-withprefix")
class AcceptabilitySwarmFullRenderer(AcceptabilityFillerMixin, SwarmAnaphorPilotRenderer):

    TOTAL_NUM_TRIALS = 38
    NUM_EXP_TRIALS = 18

    def build_trial(self, item, condition, materials_id):
        trial = super().build_trial(item, condition, materials_id)

        agent_is_given, agent_is_subject = condition
        trial["sentences"] = [
            trial["setup_clause"]["agent" if agent_is_given
                                  else "location"].capitalize() + ".",
            trial["critical_clause"]["agent" if agent_is_subject
                                     else "location"].capitalize() + "."
        ]
        trial["sentence"] = "\n".join(trial["sentences"])

        return trial

    def get_exp_trials(self, materials):
        items = self._filter_and_sample_materials(materials)

        # all possible sentence combinations
        condition_choices = [
            (0, 0),  # given = l, subject = l
            (0, 1),  # given = l, subject = a
            (1, 0),  # given = a, subject = l
            (1, 1),  # given = a, subject = a
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
                         trial["critical_clause"]["agent"].capitalize(), "."]),
            "location":
                "".join([setup, ". ",
                         trial["critical_clause"]["location"].capitalize(), "."]),
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


@register_trial_renderer("04_comprehension_swarm-full")
class ComprehensionSwarmFullRenderer(SwarmAnaphorPilotRenderer):

    TOTAL_NUM_TRIALS = 30
    NUM_EXP_TRIALS = 18

    def build_trial(self, item, condition, materials_id):
        trial = super().build_trial(item, condition, materials_id)

        agent_is_given, agent_is_subject = condition
        trial["sentences"] = [
            trial["setup_clause"]["agent" if agent_is_given
                                  else "location"].capitalize() + ".",
            trial["critical_clause"]["agent" if agent_is_subject
                                     else "location"].capitalize() + "."
        ]

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
            "materials_id": materials["name"],
            "item_id": trial["id"],
            "condition_id": ["filler", trial["rating"]],

            "sentences": [trial["sentence"]],
            "prompt": trial["prompt"],
        } for trial in all_trials]

        return all_trials

    def get_exp_trials(self, materials):
        items = self._filter_and_sample_materials(materials)

        # sample random subject settings for each item
        # topic manipulation is not relevant here -- we'll just set to
        # zero = location. Not actually used by our `build_trial`.
        condition_choices = [
            (0, 0),  # given = l, subject = l
            (0, 1),  # given = l, subject = a
            (1, 0),  # given = a, subject = l
            (1, 1),  # given = a, subject = a
        ]

        trial_conditions = random.choices(condition_choices, k=self.NUM_EXP_TRIALS)

        trials = [self.build_trial(item, condition, materials["name"])
                  for item, condition in zip(items, trial_conditions)]
        return trials


@register_trial_renderer("09_comprehension_swarm-full-nonalternating-control")
class ComprehensionSwarmFullWithNonAlternatingControlRenderer(
  ComprehensionSwarmFullRenderer):

    required_nonempty_fields = \
        ComprehensionSwarmFullRenderer.required_nonempty_fields + \
        ["non alternating given A", "non alternating given A.P",
         "non alternating given L"]

    def build_trial(self, item, condition, materials_id):
        trial = super().build_trial(item, condition, materials_id)
        agent_is_given, agent_is_subject = condition

        p = functools.partial(self.process_field, item)

        if agent_is_given:
            trial["critical_clause"]["nonalternating"] = " ".join([
                trial["agent_pronoun_subject"],
                "are" if trial["agent_plural"] else "is",
                item["non alternating given A"],
                item["non alternating given A.P"],
                trial["location_determiner"],
                trial["location"],
            ])
        else:
            trial["critical_clause"]["nonalternating"] = " ".join([
                p("non alternating given L.det")
                    if item["non alternating given L.det"] else "",
                trial["agent"],
                "are" if trial["agent_plural"] else "is",
                item["non alternating given A"],
                item["non alternating given L"],
            ]).strip()

        trial["sentences"] = [
            trial["setup_clause"]["agent" if agent_is_given
                                  else "location"].capitalize() + "."
        ]

        critical_clause = None
        if agent_is_subject == 0:
            critical_clause = trial["critical_clause"]["location"]
        elif agent_is_subject == 1:
            critical_clause = trial["critical_clause"]["agent"]
        elif agent_is_subject == 2:
            critical_clause = trial["critical_clause"]["nonalternating"]
        trial["sentences"].append(critical_clause.capitalize() + ".")

        trial["prompt"] = " ".join([
            "How", "many" if trial["agent_plural"] else "much",
            trial["agent"],
            "are" if trial["agent_plural"] else "is",
            trial["prompt_preposition"],
            trial["location_determiner"],
            trial["location"]
        ]) + "?"

        return trial

    def get_exp_trials(self, materials):
        items = self._filter_and_sample_materials(materials)

        # sample random subject settings for each item
        # topic manipulation is not relevant here -- we'll just set to
        # zero = location. Not actually used by our `build_trial`.
        condition_choices = [
            (0, 0),  # given = l, subject = l
            (0, 1),  # given = l, subject = a
            (1, 0),  # given = a, subject = l
            (1, 1),  # given = a, subject = a
            (0, 2),  # given = l, nonalternating
            (1, 2),  # given = a, nonalternating
        ]

        trial_conditions = random.choices(condition_choices, k=self.NUM_EXP_TRIALS)

        trials = [self.build_trial(item, condition, materials["name"])
                  for item, condition in zip(items, trial_conditions)]
        return trials


#####################


class SprayLoadPilotRenderer(TrialRenderer):

    def _filter_materials(self, materials):
        # drop any materials marked for exclusion
        items = [item for item in materials["items"] if not item["exclude"]]

        # drop materials with missing fields
        critical_fields = ["S", "T", "T heavy", "V", "V pres", "V past simp",
                           "L", "L heavy", "P", "scale type"]
        items = [item for item in items
                 if not any(not item[field]
                                or (type(item[field]) == float
                                    and math.isnan(item[field]))
                            for field in critical_fields)]
        return items

    def _filter_and_sample_materials(self, materials):
        items = self._filter_materials(materials)
        items = random.sample(items, self.NUM_EXP_TRIALS)

        return items

    def build_trial(self, item, condition, materials_id):
        self._reset_var_cache()

        # prepare function for quickly processing item data
        p = functools.partial(self.process_field, item)

        # Prepare data.
        trial = {
            "materials_id": materials_id,
            "item_id": item["id"],
            "condition_id": condition,

            "images": {},

            "subject": p("S"),
            "theme": {
                "light": p("T"),
                "heavy": p("T heavy"),

                "is_plural": item["T plural?"],
            },
            "location": {
                "light": p("L"),
                "heavy": p("L heavy"),

                "is_plural": item["L plural?"],
            },
            "verb": {
                "lemma": item["V"],
                "present": item["V pres"],
                "past simp": item["V past simp"],
            },

            "scale_type": item["scale type"],

            "preposition": item["P"],
            "prompt_preposition": item["Prompt P"],
        }

        # Build all sentences for all possible conditions. They are identified
        # in the output map by the concatenation of the int values of the
        # condition tuple as a string, e.g. "010" for T is not object, L heavy,
        # T not heavy.
        all_conditions = itertools.product([0, 1], repeat=3)
        trial["sentences"] = {}
        for t_is_object, l_heavy, t_heavy in all_conditions:
            key = f"{t_is_object}{l_heavy}{t_heavy}"

            location = trial["location"]["heavy" if l_heavy else "light"]
            theme = trial["theme"]["heavy" if t_heavy else "light"]
            postverb = " ".join(
                [theme, trial["preposition"], location.strip(",")]
                if t_is_object else
                [location, "with", theme.strip(",")]
            )

            trial["sentences"][key] = " ".join([
                trial["subject"],
                trial["verb"]["past simp"],
                postverb
            ]) + "."

        # Add image paths if available.
        for image_key in ["image max", "image mid intention complete",
                          "image mid intention incomplete", "image min"]:
            if item.get(image_key) is not None:
                dst = image_key[len("image "):].replace(" ", "_")
                trial["images"][dst] = item[image_key]

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


@register_trial_renderer("05_comprehension_spray-load-construction-meaning")
class ComprehensionSprayLoadMeaningRenderer(SprayLoadPilotRenderer):

    TOTAL_NUM_TRIALS = 32
    NUM_EXP_TRIALS = 20

    def build_trial(self, item, condition, materials_id):
        trial = super().build_trial(item, condition, materials_id)

        prompt = " ".join([
            "How", "many" if trial["theme"]["is_plural"] else "much",
            trial["theme"]["light"],
            "are" if trial["theme"]["is_plural"] else "is",
            trial["prompt_preposition"],
            trial["location"]["light"],
        ]) + "?"

        if trial["scale_type"] == "cover":
            slider_labels = [
                "0% / none",

                f"100% / {trial['location']['light']} "
                f"{'are' if trial['location']['is_plural'] else 'is'} "
                f"completely covered",
            ]
        elif trial["scale_type"] == "fill":
            slider_labels = [
                "0% / empty",

                f"100% / {trial['location']['light']} "
                f"{'are' if trial['location']['is_plural'] else 'is'} "
                f"completely full",
            ]
        else:
            raise ValueError("Unknown item scale type %s" % trial["scale_type"])

        trial["prompt"] = prompt
        trial["slider_labels"] = slider_labels

        sentence_key = "".join(map(str, condition))
        trial["sentence"] = trial["sentences"][sentence_key]

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
            "materials_id": materials["name"],
            "condition_id": ["filler", trial["rating"]],
            "measure": "slider",

            "sentence": trial["sentence"],
            "prompt": trial["prompt"],
            "slider_labels":
                ["0% / empty", f"100% / {trial['label_max']}"]
                if trial["scale type"] == "fill"
                else ["0% / not covered at all", f"100% / {trial['label_max']}"],
        } for trial in all_trials]

        return all_trials

    def get_exp_trials(self, materials):
        items = self._filter_and_sample_materials(materials)

        # sample random object settings for each item
        # weight fixed to light for all conditions.
        condition_choices = [
            (0, 0, 0),  # object = L, L not heavy, T not heavy
            (1, 0, 0),  # object = T, L not heavy, T not heavy
        ]

        trial_conditions = random.choices(condition_choices, k=self.NUM_EXP_TRIALS)

        trials = [self.build_trial(item, condition, materials["name"])
                  for item, condition in zip(items, trial_conditions)]
        return trials


@register_trial_renderer("06_production_spray-load-weight")
class ProductionSprayLoadWeightRenderer(SprayLoadPilotRenderer):

    TOTAL_NUM_TRIALS = 32
    NUM_EXP_TRIALS = 20

    def build_trial(self, item, condition, materials_id):
        trial = super().build_trial(item, condition, materials_id)

        _, l_heavy, t_heavy = condition
        key_suffix = f"{l_heavy}{t_heavy}"

        # NB keys in sentence_options match with 0th element of condition tuple
        # in other experiments. i.e. 0 <=> !t_is_object <=> locative
        # construction.
        trial["sentence_options"] = {
            0: trial["sentences"][f"0{key_suffix}"],
            1: trial["sentences"][f"1{key_suffix}"]
        }

        return trial

    def get_filler_trials(self, materials, num_trials: int):
        trials = random.sample(materials["items"], num_trials)

        def build_trial(t):
            self._reset_var_cache()

            # prepare function for quickly processing item data
            p = functools.partial(self.process_field, t)

            return {
                "materials_id": materials["name"],
                "item_id": t["id"],
                "condition_id": ["filler", t["manipulation"],
                                 t["bad_ungrammatical"]],

                "sentence_options": {
                    "good": p("good_sentence"),
                    "bad": p("bad_sentence"),
                },
            }
        trials = [build_trial(t) for t in trials]

        return trials

    def get_exp_trials(self, materials):
        items = self._filter_and_sample_materials(materials)

        # fix object setting -- this will be compared within-item /
        # within-subject -- and vary heaviness.
        condition_choices = [
            (None, 0, 0),  # L not heavy, T not heavy
            (None, 1, 0),  # L heavy, T not heavy
            (None, 0, 1),
        ]

        trial_conditions = random.choices(condition_choices, k=self.NUM_EXP_TRIALS)

        trials = [self.build_trial(item, condition, materials["name"])
                  for item, condition in zip(items, trial_conditions)]
        return trials


@register_trial_renderer("07_comprehension_spray-load-construction-meaning-with-images")
class ComprehensionSprayLoadMeaningWithImagesRenderer(ComprehensionSprayLoadMeaningRenderer):

    TOTAL_NUM_TRIALS = 32
    NUM_EXP_TRIALS = 20

    def build_trial(self, item, condition, materials_id):
        trial = super().build_trial(item, condition, materials_id)

        # If images are available for this trial, overwrite prompt usw.
        if any(image is not None for image in trial["images"].values()):
            trial["prompt"] += "<br/>Pick the image which is best described by the sentence."
            trial["measure"] = "forced_choice_images"
        else:
            trial["measure"] = "slider"

        return trial

    def get_exp_trials(self, materials):
        trials = super().get_exp_trials(materials)

        # Make sure we begin with one image trial.
        try:
            image_trial_idx = \
                next(i for i, trial in enumerate(trials)
                     if trial["measure"] == "forced_choice_images")
        except StopIteration:
            pass
        else:
            image_trial = trials.pop(image_trial_idx)
            trials = [image_trial] + trials

        return trials
