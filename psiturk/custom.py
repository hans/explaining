import functools
import json
from pathlib import Path
import random
import re

import logging

from flask import Blueprint, jsonify, send_file, request

from psiturk.psiturk_config import PsiturkConfig
from psiturk.user_utils import PsiTurkAuthorization

from renderers import TRIAL_RENDERERS


logging.basicConfig(level=logging.DEBUG)
L = logging.getLogger(__name__)


config = PsiturkConfig()
config.load_config()
# myauth = PsiTurkAuthorization(config) # if you want to add a password protected route use this

# explore the Blueprint
custom_code = Blueprint("custom_code", __name__, template_folder="templates", static_folder="static")


###############
# custom routes


@custom_code.route("/trials/<string:experiment>")
def get_trials_for_experiment(experiment: str):
    # Get unique materials ID
    try:
        materials_id = request.args["materials"].split(",")
    except KeyError:
        # TODO use latest materials by default
        return 'missing materials parameter', 400

    def load_materials(materials_id):
        if ".." in materials_id:
            raise ValueError('STOP, injection attack detected', 400)

        # Try loading.
        materials_path = Path("/materials") / (f"{materials_id}.json")
        if not materials_path.exists():
            raise ValueError(f'could not find materials with id {materials_id}', 404)

        with materials_path.open() as f:
            materials = json.load(f)

        return materials

    try:
        materials = tuple([load_materials(id) for id in materials_id])
    except ValueError as exc:
        return exc.args

    # render trials from materials
    try:
        renderer = TRIAL_RENDERERS[experiment](experiment)
    except KeyError:
        return f'cannot find trial renderer for experiment {experiment}', 500

    trials = renderer.get_trials(materials, materials_id, args=request.args)

    return jsonify(trials)
