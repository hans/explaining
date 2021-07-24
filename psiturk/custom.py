import functools
import json
from pathlib import Path
import random
import re

import logging

from flask import Blueprint, jsonify, send_file, request

from psiturk.psiturk_config import PsiturkConfig
from psiturk.user_utils import PsiTurkAuthorization

logging.basicConfig(level=logging.DEBUG)
L = logging.getLogger(__name__)


config = PsiturkConfig()
config.load_config()
# myauth = PsiTurkAuthorization(config) # if you want to add a password protected route use this

# explore the Blueprint
custom_code = Blueprint("custom_code", __name__, template_folder="templates", static_folder="static")


###############
# custom routes

# DEV dummy base64 images
YELLOW_SQUARE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAA4ElEQVR42u3SAQ0AAAQAMJLLJxU1bP4Mz56o4K0UQAABBEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAAAQQQQAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABEAABuGEB1MwkED8Ofe0AAAAASUVORK5CYII="
RED_SQUARE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAA30lEQVR42u3SAQ0AAAgDoJvc6FrDTchATdLhrRJAAAEEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAABBBBAAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAEQAAG4YQHtTL+BUtmRkAAAAABJRU5ErkJggg=="

@custom_code.route("/trials", methods=["GET"])
def get_trials():
    # DEV
    trials = [
        {
            "item_id": 1,
            "alternation": "swarm",
            "condition": {"topic": "agent", "subject": "agent"},

            "sentence": "Mary is looking for butterflies, but bees are swarming in the garden.",
            "scenes": [
                {"scene_image": YELLOW_SQUARE, "value": 0},
                {"scene_image": RED_SQUARE, "value": 1},
            ]
        },
        {
            "item_id": 2,
            "alternation": "swarm",
            "condition": {"topic": "location", "subject": "agent"},

            "sentence": "Adam needs to set the table, but ants are crawling on the table.",
            "scenes": [
                {"scene_image": YELLOW_SQUARE, "value": 0},
                {"scene_image": RED_SQUARE, "value": 1},
            ]
        },

    ]

    ret = {
        "phase": ("comprehension", "semantic"),
        "trials": trials,
    }

    return jsonify(ret)


class TrialRenderer(object):

    def __init__(self, experiment_name):
        self.experiment_name = experiment_name

    def get_trials(materials, materials_id: str = None):
        raise NotImplementedError()


TRIAL_RENDERERS = {}


def register_trial_renderer(experiment_name):
    def decorator(cls):
        TRIAL_RENDERERS[experiment_name] = cls
        return cls

    return decorator


class SwarmPilotRenderer(TrialRenderer):

    NUM_TRIALS = 20

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Template variables deployed in a given item/trial
        self._var_cache = {}

    def _reset_var_cache(self):
        self._var_cache = {}

    def _replace_name(self, name_id: str, subtype: str = None):
        if f"PERSON{name_id}" in self._var_cache:
            return self._var_cache[f"PERSON{name_id}"
                                   + (f"_{subtype}" if subtype else "")]

        # TODO make a new nonce name
        self._var_cache[f"PERSON{name_id}"] = "Mary"
        self._var_cache[f"PERSON{name_id}_POSS"] = "her"

        return self._replace_name(name_id, subtype=subtype)

    def _filter_and_sample_materials(self, materials):
        # drop any materials marked for exclusion
        items = [item for item in materials["items"] if not item["exclude"]]

        # drop materials with missing fields
        critical_fields = ["A", "L", "V", "P", "L det", "topic A", "topic L",
                           "conj"]
        items = [item for item in materials["items"]
                 if not any(not item[field] for field in critical_fields)]

        items = random.sample(items, self.NUM_TRIALS)

        return items

    def process_field(self, item_data, field):
        field = item_data[field]

        # Find--replace person name variables and related possessives
        field = re.sub(
            r"%PERSON(\d+)(_[^%]+)?%",
            lambda match: self._replace_name(match.group(1), match.group(2)),
            field)

    def build_trial(self, item, condition):
        self._reset_var_cache()

        # prepare function for quickly processing item data
        p = functools.partial(self.process_field, item)

        agent_is_topic, agent_is_subject = condition
        subject_is_plural = item["A countable?"] \
            if agent_is_subject else item["L plural?"]

        trial = {
            "item_id": item["id"],
            "condition_id": condition,

            "topic_setup": p("topic A" if agent_is_topic else "topic L"),

            "agent": item["A"],
            "location": item["L"],
            "verb": item["V"],
            "auxiliary": "are" if subject_is_plural else "is",

            "agent_plural": item["A countable?"],
            "location_plural": item["L plural?"],
            "location_determiner": p("L det"),
            "preposition": item["P"],
            "conjunction": item["conj"],
        }

        if agent_is_subject:
            trial["critical_clause"] = "".join([
                trial["agent"], " ",
                trial["auxiliary"], " ",
                trial["verb"], "ing ",
                trial["preposition"], " ",
                trial["location_determiner"], " ",
                trial["location"],
            ])
        else:
            trial["critical_clause"] = "".join([
                trial["location_determiner"], " ",
                trial["location"], " ",
                trial["auxiliary"], " ",
                trial["verb"], "ing with ",
                trial["agent"],
            ])

        return trial

    def get_trials(self, materials, materials_id=None):
        raise NotImplementedError()


@register_trial_renderer("00_comprehension_swarm-construction-meaning")
class ComprehensionSwarmMeaningRenderer(SwarmPilotRenderer):

    def build_trial(item, condition):
        trial = super().build_trial(item, condition)
        trial["sentence"] = f"{trial['critical_clause']}."

        return trial

    def get_trials(self, materials, materials_id=None):
        items = self._filter_and_sample_materials(materials)

        # sample random subject settings for each item
        # topic manipulation is not relevant here -- we'll just set to
        # zero = agent. Not actually used by our `build_trial`.
        condition_choices = [
            (0, 0),  # topic = a, subject = a
            (0, 1),  # topic = a, subject = l
        ]

        trial_conditions = random.choices(condition_choices, k=self.NUM_TRIALS)

        trials = [self.build_trial(item, condition)
                  for item, condition in zip(items, trial_conditions)]
        ret = dict(experiment=self.experiment_name, materials_id=materials_id,
                   trials=trials)

        return ret


@register_trial_renderer("01_production_swarm-topicality")
class ProductionSwarmTopicalityRenderer(SwarmPilotRenderer):

    def build_trial(item, condition):
        trial = super().build_trial(item, condition)

        sentence = "".join([trial["topic_setup"], ", ", trial["conjunction"],
                            " ", trial["critical_clause"], "."])
        trial["sentence"] = sentence

        return trial

    def get_trials(self, materials, materials_id=None):
        items = self._filter_and_sample_materials(materials)

        # sample random subject and topic settings for each item
        condition_choices = [
            (0, 0),  # topic = a, subject = a
            (0, 1),  # topic = a, subject = l
            (1, 0),
            (1, 1)
        ]

        trial_conditions = random.choices(condition_choices, k=self.NUM_TRIALS)

        trials = [self.build_trial(item, condition)
                  for item, condition in zip(items, trial_conditions)]
        ret = dict(experiment=self.experiment_name, materials_id=materials_id,
                   trials=trials)

        return ret


@custom_code.route("/trials/<string:experiment>")
def get_trials_for_experiment(experiment: str):
    # Get unique materials ID
    try:
        materials_id = request.args["materials"]
    except KeyError:
        # TODO use latest materials by default
        return 'missing materials parameter', 400

    if "/" in materials_id or ".." in materials_id:
        return 'STOP, injection attack detected', 400

    # Try loading.
    materials_path = Path("/materials") / (f"{materials_id}.json")
    if not materials_path.exists():
        return f'could not find materials with id {materials_id}', 404

    with materials_path.open() as f:
        materials = json.load(f)

    # render trials from materials
    try:
        renderer = TRIAL_RENDERERS[experiment](experiment)
    except KeyError:
        return f'cannot find trial renderer for experiment {experiment}', 500

    trials = renderer.get_trials(materials, materials_id)

    return jsonify(trials)
