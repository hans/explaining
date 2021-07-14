/**
 * @title explaining
 * @description
 * @version 0.1.0
 *
 * The following lines specify which media directories will be packaged and preloaded by jsPsych.
 * Modify them to arbitrary paths (or comma-separated lists of paths) within the `media` directory,
 * or delete them.
 * @imageDir images
 * @audioDir audio
 * @videoDir video
 */

// You can import the custom stylesheets you use (.scss or .css).
import "../../styles/main.scss";

import * as _ from "underscore";

// jsPsych plugins
import "jspsych/plugins/jspsych-html-keyboard-response";
import "jspsych/plugins/jspsych-html-slider-response";
import "jspsych/plugins/jspsych-fullscreen";

import { get_trials } from "../materials";
import * as trials from "../trials";

const EXPERIMENT_NAME = "00_comprehension_construction-meaning";
const MATERIALS_HASH = "TODO";

export async function createTimeline() {
  const trial_materials = await get_trials(EXPERIMENT_NAME, MATERIALS_HASH);

  let timeline = [trials.age_block, trials.demo_block];

  // Prepare main experimental trials.
  timeline = timeline.concat(_.map(trial_materials, (trial) => {
    const stimulus = trial.sentence; // TODO format template with stim sentence
    const prompt = (`
      How ${trial.agent_plural ? "many" : "much"} ${trial.agent} ` +
      `${trial.agent_plural ? "are" : "is"} ${trial.preposition} ` +
      `${trial.location_determiner} ${trial.location}?`).trim();

    return {
      type: "html-slider-response",
      stimulus: stimulus,
      prompt: prompt,
      labels: ["completely empty", "completely full"],

      data: {
        item_id: trial.item_id,
        condition_id: trial.condition_id,
        stim_sentence: trial.sentence,
      }
    }
  }));

  timeline.push(trials.comments_block);

  return timeline;
}
