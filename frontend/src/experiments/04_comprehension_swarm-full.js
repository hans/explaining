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

import { get_trials } from "../materials";
import * as trials from "../trials";
import { default_on_finish, default_on_data_update } from "../psiturk";

const EXPERIMENT_NAME = "04_comprehension_swarm-full";
const MATERIALS_HASH = "swarm-004-given";
const FILLERS_HASH = "fillers/swarm_comprehension-000-base";

const MATERIALS_SEQ = [MATERIALS_HASH, FILLERS_HASH];

const slider_trial_template = {
  type: "html-slider-response-with-copout",
  pre_stimulus_prompt: "Please read the following sentence:",
  copout_text: "This sentence doesn't make sense to me.",
  labels: ["0% / none", "100% / as much/many as there possibly could be"],
  require_movement: true,
};

const COMPENSATION = "$1.00";

// Helper function to add experiment ID to block spec
const a = (block) => trials.add_data_fields(block, { experiment_id: EXPERIMENT_NAME });


export async function createTimeline() {
  const trial_materials = await get_trials(EXPERIMENT_NAME, MATERIALS_SEQ);

  let timeline = [];

  timeline.push(a(trials.age_block));
  timeline.push(a(trials.demo_block));

  timeline = timeline.concat([
    {
      type: "instructions",
      show_clickable_nav: true,
      pages: [
        `
        <p class="jspsych-instructions">
          Welcome! In this experiment, you will help us research how
          <strong>English speakers understand the meanings of different
          words and phrases</strong>.
        </p>

        <p class="jspsych-instructions">
          On each page, we'll ask you to <strong>imagine the scene described
          by an English passage</strong>, and to share your best guess about how
          that scene looks.
        </p>
        `,

        `
        <p class="jspsych-instructions">
          Let's begin with some practice items.
        </p>

        <p class="jspsych-instructions">
          On the next pages, you'll read some sentences describing a real-world
          scene.
        </p>

        <p class="jspsych-instructions">
          Your job is to share your best guess about <strong>how full</strong>
          some object is in the scene, possibly in an abstract sense.
        </p>

        <p class="jspsych-instructions">
          If the particular sentence does not make sense to you, you can click
          the checkbox <em>"This sentence doesn't make sense to me."</em> to
          proceed to the next page.
        </p>
        `,
      ],
    },

    a({
      ...slider_trial_template,
      stimulus: "Joe marveled at the bookshelf. It is chock-full of books.",
      post_stimulus_prompt: "How many books are on the bookshelf?",
      data: { condition_id: ["practice", "solid", "full"] },
      css_classes: ["jspsych-swarm-trial-practice"],
    }),

    a({
      ...slider_trial_template,
      stimulus: "The pool is starting to overflow.",
      post_stimulus_prompt: "How much water is in the pool?",
      data: { condition_id: ["practice", "liquid", "full"] },
      css_classes: ["jspsych-swarm-trial-practice"],
    }),

    a({
      ...slider_trial_template,
      stimulus: "Everyone agreed that there was very little passion in the music.",
      post_stimulus_prompt: "How much passion was in the music?",
      data: { condition_id: ["practice", "abstract", "empty"] },
      css_classes: ["jspsych-swarm-trial-practice"],
    }),

    a({
      ...slider_trial_template,
      stimulus: "The books are missing from the bookshelf.",
      post_stimulus_prompt: "How many books are on the bookshelf?",
      data: { condition_id: ["practice", "solid", "empty"] },
      css_classes: ["jspsych-swarm-trial-practice"],
    }),

    a({
      ...slider_trial_template,
      stimulus:
        `The future of the company was at stake.` +
        ` Everyone at the meeting felt anxiety about it.`,
      post_stimulus_prompt: "How much anxiety was at the meeting?",
      data: { condition_id: ["practice", "abstract", "full"] },
      css_classes: ["jspsych-swarm-trial-practice"],
    }),

    {
      type: "instructions",
      show_clickable_nav: true,
      pages: [
        `
        <p class="jspsych-instructions">
          Good work! The experiment will now begin.
        </p>
        `
      ]
    }
  ]);

  // Prepare main experimental trials.
  timeline = timeline.concat(_.map(trial_materials.trials, (trial) => {
    return {
      stimulus: trial.sentences.join("<br/>"),
      post_stimulus_prompt: trial.prompt,

      data: {
        experiment_id: EXPERIMENT_NAME,
        materials_id: trial.materials_id,
        item_id: trial.item_id,
        condition_id: trial.condition_id,
        stim_sentences: trial.sentences,
      },

      ...slider_trial_template
    }
  }));

  timeline.push(a(trials.make_comments_block(COMPENSATION)));

  return timeline;
}


export const show_progress_bar = true;
export let on_finish = default_on_finish;
export let on_data_update = default_on_data_update;
