/**
 * Used to source acceptability for each side of swarm-with alternation,
 * in order to norm data.
 *
 * @title 02_acceptability_swarm
 * @description
 * @version
 */

// You can import the custom stylesheets you use (.scss or .css).
import "../../styles/main.scss";

import * as _ from "underscore";

import { get_trials } from "../materials";
import * as trials from "../trials";
import { default_on_finish, default_on_data_update } from "../psiturk";

const EXPERIMENT_NAME = "02_acceptability_swarm";
const MATERIALS_HASH = "swarm-002-promptP";

export async function createTimeline() {
  const trial_materials = await get_trials(EXPERIMENT_NAME, MATERIALS_HASH);

  // DEV: skip demographic stuff
  let timeline = [];
  // let timeline = [trials.age_block, trials.demo_block];

  timeline = timeline.concat(trials.acceptability_intro_sequence);

  // Prepare main experimental trials.
  timeline = timeline.concat(_.map(trial_materials.trials, (trial) => {
    return {
      stimulus: trial.sentence,

      data: {
        experiment_id: EXPERIMENT_NAME,
        materials_id: MATERIALS_HASH,
        item_id: trial.item_id,
        condition_id: trial.condition_id,
      },

      ...trials.acceptability_block
    }
  }));

  timeline.push(trials.comments_block);

  return timeline;
}


export const show_progress_bar = true;
export let on_finish = default_on_finish;
export let on_data_update = default_on_data_update;
