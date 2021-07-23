import json
from pathlib import Path
import random

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


@register_trial_renderer("00_comprehension_swarm-construction-meaning")
class ComprehensionSwarmMeaningRenderer(TrialRenderer):

    NUM_TRIALS = 20

    def build_trial(self, item, condition):
        trial = {
            "item_id": item["id"],
            "condition_id": condition,

            "agent": item["A"],
            "location": item["L"],
            "verb": item["V"],

            "agent_plural": item["A countable?"],
            "location_determiner": item["L det"],
            "preposition": item["P"],
            "conjunction": item["conj"],
        }

        # build sentence based on condition
        agent_is_topic, agent_is_subject = condition
        sentence_parts = [
            item["topic A"] if agent_is_topic else item["topic L"],
            ", ",
            item["conj"], " "
        ]

        if agent_is_subject:
            sentence_parts.extend([
                item["A"], " "
                "are" if item["A countable?"] else "is", " ",
                item["V"], "ing ",
                item["P"], " ",
                item["L det"], " ",
                item["L"],
            ])
        else:
            sentence_parts.extend([
                item["L det"], " ",
                item["L"], " is ",
                item["V"], "ing with ",
                item["A"],
            ])

        sentence_parts.append(".")
        trial["sentence"] = "".join(sentence_parts)

        return trial

    def get_trials(self, materials, materials_id=None):
        # drop any materials marked for exclusion
        items = [item for item in materials["items"] if not item["exclude"]]

        items = random.sample(items, self.NUM_TRIALS)

        # sample random T--A settings for each item
        condition_choices = [
            (0, 0),  # topic = a, subject = a
            (0, 1),  # topic = a, subject = l
            (1, 0),
            (1, 1),
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
