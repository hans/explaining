/**
 * Used to source acceptability for each side of swarm-with alternation,
 * in order to norm data.
 *
 * @title 2-5min English sentence rating task (Explaining 08-00)
 * @description
 * @version
 */

// You can import the custom stylesheets you use (.scss or .css).
import "../../styles/main.scss";
import "../../styles/acceptability_experiment.scss";

import * as _ from "underscore";

import { get_trials } from "../materials";
import * as trials from "../trials";
import { default_on_finish, default_on_data_update } from "../psiturk";

const EXPERIMENT_NAME = "08_acceptability_swarm-withprefix";
const MATERIALS_HASH = "swarm-004-given";
const FILLERS_HASH = "fillers/swarm_acceptability-001-withprefix";

const MATERIALS_SEQ = [MATERIALS_HASH, FILLERS_HASH];

const COMPENSATION = "0.50";

// Helper function to add experiment ID to block spec
const a = (block) => trials.add_data_fields(block, { experiment_id: EXPERIMENT_NAME });

const acceptability_block = {
  ...trials.acceptability_block,

  pre_stimulus_prompt: "How acceptable is the following passage of English?",
  require_movement: true,
}

export async function createTimeline() {
  const trial_materials = await get_trials(EXPERIMENT_NAME, MATERIALS_SEQ);

  let timeline = [a(trials.age_block), a(trials.demo_block)];

  let intro_sequence = [
    {
      type: "instructions",
      show_clickable_nav: true,
      pages: [
        "<p class='jspsych-instructions'>" +
        "Welcome! In this experiment, you will be asked to judge a series of " +
        "English passages. For each passage, you'll be asked to judge if the passage " +
        "is an <strong>acceptable passage of English</strong> using a scale from " +
        "1-7, where 1 is the least acceptable passage and 7 is the most " +
        "acceptable passage." +
        "</p>",

        "<p class='jspsych-instructions'>" +
        "<p>You are <em>not</em> being asked to judge the plausibility of the " +
        "passage; you are simply being asked to judge whether the passage " +
        "sounds like a <strong>natural excerpt of English</strong>.</p>" +
        "<p>You are also not being asked to judge whether each passage is " +
        "acceptable according to a 'school grammar.' As a native speaker of " +
        "English, you have <strong>intuitions or gut feelings</strong> about " +
        "what sounds like an acceptable excerpt of English.</p>" +
        "</p>",

        "<p class='jspsych-instructions'>" +
        "Sometimes you may not be sure which answer is correct. When this " +
        "happens, go with your first instinct. Don't overthink it!" +
        "</p>",

        "<p class='jspsych-instructions'>" +
        "Let's begin with a few practice passages." +
        "</p>",
      ]
    },

    {
      ...acceptability_block,

      pre_stimulus_prompt:
        "The following sentence is completely unacceptable. Please rate it a 1.",
      stimulus: "Sally sent yesterday to every kid in the class cookies.",
      data: {practice_sentence: "1-1"},
    },

    {
      ...acceptability_block,

      pre_stimulus_prompt:
        "The following sentence is somewhat acceptable. Please rate it a 4.",
      stimulus:
        "Matthew bought this week two records.",
      data: {practice_sentence: "4-1"},
    },

    {
      ...acceptability_block,

      pre_stimulus_prompt:
        "The following sentence is perfectly acceptable. Please rate it a 7.",
      stimulus: "The children are playing in the backyard.",
      data: {practice_sentence: "7-1"},
    },

    {
      type: "instructions",
      show_clickable_nav: true,
      pages: [
        "<p class='jspsych-instructions'>" +
        "We will now begin the experiment." +
        "</p>",
      ],
    }
  ];
  intro_sequence = intro_sequence.map(a);
  timeline = timeline.concat(intro_sequence);

  // Prepare main experimental trials.
  timeline = timeline.concat(_.map(trial_materials.trials, (trial) => {
    return {
      ...acceptability_block,

      stimulus: trial.sentence,

      data: {
        experiment_id: EXPERIMENT_NAME,
        materials_id: MATERIALS_HASH,
        item_id: trial.item_id,
        condition_id: trial.condition_id,
      },
    }
  }));

  timeline.push(a(trials.make_comments_block(COMPENSATION)));

  return timeline;
}


export const show_progress_bar = true;
export let on_finish = default_on_finish;
export let on_data_update = default_on_data_update;
