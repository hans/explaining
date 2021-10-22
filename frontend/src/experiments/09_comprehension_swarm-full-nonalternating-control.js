/**
 * Tests interaction between construction choice and givenness in fullness
 * inference.
 *
 * @title 5-10min English sentence understanding task (Explaining 04-00)
 * @description Help us understand the meanings of English words and sentences.
 * @version
 */

// You can import the custom stylesheets you use (.scss or .css).
import "../../styles/main.scss";
import "../../styles/comprehension_experiment.scss";

import * as _ from "underscore";

// jsPsych and plugins
import "jspsych/plugins/jspsych-instructions";
import "jspsych/plugins/jspsych-html-keyboard-response";
import "../plugins/html-slider-response-with-copout";

import * as trials from "../trials";
import { default_on_finish, default_on_data_update } from "../psiturk";

const EXPERIMENT_NAME = "09_comprehension_swarm-full-nonalternating-control";
const MATERIALS_HASH = "swarm-006-nonalternating-natural";
const FILLERS_HASH = "fillers/swarm_comprehension-000-base";

const MATERIALS_SEQ = [MATERIALS_HASH, FILLERS_HASH];

const COMPENSATION = "$1.00";

export const createTimeline = trials.createFullSwarmComprehensionTimeline(
  EXPERIMENT_NAME, MATERIALS_SEQ, COMPENSATION);

export const show_progress_bar = true;
export let on_finish = default_on_finish;
export let on_data_update = default_on_data_update;
