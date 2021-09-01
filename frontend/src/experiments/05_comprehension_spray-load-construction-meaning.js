/**
 * Tests whether construction choice has an effect on inferred meaning for
 * *spray/load*-construction.
 *
 * @title 5-10min English sentence understanding task (Explaining 05-01)
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

const EXPERIMENT_NAME = "05_comprehension_spray-load-construction-meaning";
const MATERIALS_HASH = "spray-load_comprehension-001-matchdet-diffscales";
const FILLERS_HASH = "fillers/spray-load_comprehension-001-diffscale";

const MATERIALS_SEQ = [MATERIALS_HASH, FILLERS_HASH];

const slider_trial_template = {
  type: "html-slider-response-with-copout",
  pre_stimulus_prompt: "Please read the following sentence:",
  copout_text: "This sentence doesn't make sense to me.",
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

  // slider labels for practice trials
  const slider_labels_fill = [
    "0% / empty",
    "100% / completely full"
  ];
  const slider_labels_cover = [
    "0% / not covered at all",
    "100% / completely covered"
  ];

  // TODO see if we need to change intro / practice phases
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
          by a sentence</strong>, and to share your best guess about how that
          scene looks.
        </p>
        `,

        `
        <p class="jspsych-instructions">
          Let's begin with some practice items.
        </p>

        <p class="jspsych-instructions">
          On the next pages, you'll read a sentence describing a real-world
          scene.
        </p>

        <p class="jspsych-instructions">
          Your job is to share your best guess about <strong>how full</strong>
          some object is, or <strong>how completely covered</strong> it is by
          some material.
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
      stimulus: "The bookshelf is chock-full of books.",
      post_stimulus_prompt: "To what degree is the bookshelf full of books?",
      slider_labels: slider_labels_fill,
      data: { condition_id: ["practice", "fill", "full"] },
      css_classes: ["jspsych-swarm-trial-practice"],
    }),

    a({
      ...slider_trial_template,
      stimulus: "The pool is starting to overflow.",
      post_stimulus_prompt: "To what degree is the pool full of water?",
      slider_labels: slider_labels_fill,
      data: { condition_id: ["practice", "fill", "full"] },
      css_classes: ["jspsych-swarm-trial-practice"],
    }),

    a({
      ...slider_trial_template,
      stimulus: "There was not even a speck of dust on the glass table.",
      post_stimulus_prompt: "To what degree is the glass table covered in dust?",
      slider_labels: slider_labels_cover,
      data: { condition_id: ["practice", "cover", "empty"] },
      css_classes: ["jspsych-swarm-trial-practice"],
    }),

    a({
      ...slider_trial_template,
      stimulus: "The books are missing from the bookshelf.",
      post_stimulus_prompt: "To what degree is the bookshelf full of books?",
      slider_labels: slider_labels_fill,
      data: { condition_id: ["practice", "fill", "empty"] },
      css_classes: ["jspsych-swarm-trial-practice"],
    }),

    a({
      ...slider_trial_template,
      stimulus: "He spread the grass seed over the entire lawn.",
      post_stimulus_prompt: "To what degree is the lawn covered by grass seed?",
      slider_labels: slider_labels_cover,
      data: { condition_id: ["practice", "cover", "full"] },
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
      stimulus: trial.sentence,
      post_stimulus_prompt: trial.prompt,
      labels: trial.slider_labels,

      data: {
        experiment_id: EXPERIMENT_NAME,
        materials_id: trial.materials_id,
        item_id: trial.item_id,
        condition_id: trial.condition_id,
        stim_sentence: trial.sentence,
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
