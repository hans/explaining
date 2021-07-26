/**
 * Tests whether construction choice has an effect on inferred meaning for
 * *swarm*-construction.
 *
 * @title 00_comprehension_swarm-construction-meaning
 * @description
 * @version
 */

// You can import the custom stylesheets you use (.scss or .css).
import "../../styles/main.scss";

import * as _ from "underscore";

// jsPsych and plugins
import "jspsych/plugins/jspsych-html-keyboard-response";
import "../plugins/html-slider-response-with-copout";
import "jspsych/plugins/jspsych-fullscreen";

import { get_trials } from "../materials";
import * as trials from "../trials";
import psiturk from "../psiturk";

const EXPERIMENT_NAME = "00_comprehension_swarm-construction-meaning";
const MATERIALS_HASH = "swarm-001-more";

export async function createTimeline() {
  const trial_materials = await get_trials(EXPERIMENT_NAME, MATERIALS_HASH);

  let timeline = [trials.age_block, trials.demo_block];

  // Prepare main experimental trials.
  timeline = timeline.concat(_.map(trial_materials.trials, (trial) => {
    const stimulus = trial.sentence;
    const prompt = (`
      How ${trial.agent_plural ? "many" : "much"} ${trial.agent} ` +
      `${trial.agent_plural ? "are" : "is"} ${trial.preposition} ` +
      `${trial.location_determiner} ${trial.location}?`).trim();

    return {
      type: "html-slider-response-with-copout",
      stimulus: stimulus,
      pre_stimulus_prompt: "Please read the following sentence:",
      post_stimulus_prompt: prompt,
      copout_text: "This sentence doesn't make sense to me.",
      labels: ["completely empty", "completely full"],
      require_movement: true,

      data: {
        materials_id: MATERIALS_HASH,
        item_id: trial.item_id,
        condition_id: trial.condition_id,
        stim_sentence: trial.sentence,
      }
    }
  }));

  timeline.push(trials.comments_block);

  return timeline;
}


export async function on_finish() {
  psiturk.saveData({
    // DEV
    success: () => jsPsych.data.displayData(),
    // success: () => psiturk.completeHIT(),
    error: () => console.log("error saving data"),
  });
}


export async function on_data_update(data) {
  psiturk.recordTrialData(data);
}
