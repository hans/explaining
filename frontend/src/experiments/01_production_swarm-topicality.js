/**
 * Tests whether topicality manipulation has an effect on production preference
 * for the *swarm*-construction.
 *
 * @title 01_production_swarm-topicality
 * @description
 * @version
 */

// You can import the custom stylesheets you use (.scss or .css).
import "../../styles/main.scss";

import * as _ from "underscore";

// jsPsych plugins
import "jspsych/plugins/jspsych-survey-multi-choice";

import { get_trials } from "../materials";
import * as trials from "../trials";
import { default_on_finish, default_on_data_update } from "../psiturk";

const EXPERIMENT_NAME = "01_production_swarm-topicality";
const MATERIALS_HASH = "swarm-002-promptP";

export async function createTimeline() {
  const trial_materials = await get_trials(EXPERIMENT_NAME, MATERIALS_HASH);

  // DEV: skip demographic stuff
  let timeline = [];
  // let timeline = [trials.age_block, trials.demo_block];

  // Prepare main experimental trials.
  timeline = timeline.concat(_.map(trial_materials.trials, (trial) => {
    // Randomly order sentence options.
    const options = _.shuffle(["agent", "location"]);
    const sentences = options.map(o => trial.sentences[o]);

    return {
      type: "survey-multi-choice",

      questions: [
        {
          prompt:
            "The following two sentences differ in the way they are " +
            "completed after the <em>but</em>. Which sentence sounds more " +
            "natural to you?",
          options: sentences,
        },
      ],

      data: {
        experiment_id: EXPERIMENT_NAME,
        materials_id: MATERIALS_HASH,
        item_id: trial.item_id,
        condition_id: trial.condition_id,
        option_order: options,
      },
    }
  }));

  timeline.push(trials.comments_block);

  return timeline;
}


export let on_finish = default_on_finish;
export let on_data_update = default_on_data_update;
