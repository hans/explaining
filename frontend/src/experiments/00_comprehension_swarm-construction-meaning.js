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
import { default_on_finish, default_on_data_update } from "../psiturk";

const EXPERIMENT_NAME = "00_comprehension_swarm-construction-meaning";
const MATERIALS_HASH = "swarm-002-promptP";

export async function createTimeline() {
  const trial_materials = await get_trials(EXPERIMENT_NAME, MATERIALS_HASH);

  // DEV: skip demographic stuff
  let timeline = [];
  // let timeline = [trials.age_block, trials.demo_block];

  // Prepare main experimental trials.
  timeline = timeline.concat(_.map(trial_materials.trials, (trial) => {
    const stimulus = trial.sentence;

    return {
      type: "html-slider-response-with-copout",
      stimulus: stimulus,
      pre_stimulus_prompt: "Please read the following sentence:",
      post_stimulus_prompt: trial.prompt,
      copout_text: "This sentence doesn't make sense to me.",
      labels: ["completely empty", "completely full"],
      require_movement: true,

      data: {
        experiment_id: EXPERIMENT_NAME,
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


export let on_finish = default_on_finish;
export let on_data_update = default_on_data_update;
