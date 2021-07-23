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

const EXPERIMENT_NAME = "00_comprehension_swarm-construction-meaning";
const MATERIALS_HASH = "swarm-000-base";

export async function createTimeline() {
  const trial_materials = await get_trials(EXPERIMENT_NAME, MATERIALS_HASH);

  let timeline = [trials.age_block, trials.demo_block];

  // Prepare main experimental trials.
  timeline = timeline.concat(_.map(trial_materials.trials, (trial) => {
    const stimulus = trial.sentence; // TODO format template with stim sentence
    const prompt = (`
      How ${trial.agent_plural ? "many" : "much"} ${trial.agent} ` +
      `${trial.agent_plural ? "are" : "is"} ${trial.preposition} ` +
      `${trial.location_determiner} ${trial.location}?`).trim();

    return {
      type: "html-slider-response-with-copout",
      stimulus: stimulus,
      prompt: prompt,
      labels: ["completely empty", "completely full"],

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
