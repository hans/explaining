/**
 * Tests whether topicality manipulation has an effect on production preference
 * for the *swarm*-construction.
 */

// You can import the custom stylesheets you use (.scss or .css).
import "../../styles/main.scss";

import * as _ from "underscore";

// jsPsych plugins
import "jspsych/plugins/jspsych-survey-multi-choice";

import { get_trials } from "../materials";
import * as trials from "../trials";

const EXPERIMENT_NAME = "01_production_swarm-topicality";
const MATERIALS_HASH = "TODO";

export async function createTimeline() {
  const trial_materials = await get_trials(EXPERIMENT_NAME, MATERIALS_HASH);

  let timeline = [trials.age_block, trials.demo_block];

  // Prepare main experimental trials.
  timeline = timeline.concat(_.map(trial_materials, (trial) => {
    return {
      type: "survey-multi-choice",
      preamble: "TODO",

      questions: [
        {
          prompt: "TODO",
          options: trial.sentences,
        },
      ],

      data: {
        materials_id: MATERIALS_HASH,
        item_id: trial.item_id,
        condition_id: trial.condition_id,
      }
    }
  }));

  timeline.push(trials.comments_block);

  return timeline;
}
