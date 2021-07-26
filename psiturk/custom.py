import functools
import json
from pathlib import Path
import random
import re

import logging

from flask import Blueprint, jsonify, send_file, request

from psiturk.psiturk_config import PsiturkConfig
from psiturk.user_utils import PsiTurkAuthorization

from .renderers import TRIAL_RENDERERS


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
