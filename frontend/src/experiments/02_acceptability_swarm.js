/**
 * Used to source acceptability for each side of swarm-with alternation,
 * in order to norm data.
 *
 * @title 5-10min English sentence rating task (Explaining 02-00)
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
const MATERIALS_HASH = "swarm-003-drops";
const FILLERS_HASH = "fillers/swarm_acceptability-000-base";

const MATERIALS_SEQ = [MATERIALS_HASH, FILLERS_HASH];

const COMPENSATION = "1.00";

// Helper function to add experiment ID to block spec
const a = (block) => trials.add_data_fields(block, { experiment_id: EXPERIMENT_NAME });

export async function createTimeline() {
  const trial_materials = await get_trials(EXPERIMENT_NAME, MATERIALS_SEQ);

  let timeline = [a(trials.age_block), a(trials.demo_block)];

  const acceptability_intro_sequence =
    trials.acceptability_intro_sequence.map(a);
  timeline = timeline.concat(acceptability_intro_sequence);

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

  timeline.push(a(trials.make_comments_block(COMPENSATION)));

  return timeline;
}


export const show_progress_bar = true;
export let on_finish = default_on_finish;
export let on_data_update = default_on_data_update;
