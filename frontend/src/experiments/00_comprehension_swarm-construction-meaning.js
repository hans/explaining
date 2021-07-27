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
import "jspsych/plugins/jspsych-instructions";
import "jspsych/plugins/jspsych-html-keyboard-response";
import "../plugins/html-slider-response-with-copout";

import { get_trials } from "../materials";
import * as trials from "../trials";
import { default_on_finish, default_on_data_update } from "../psiturk";

const EXPERIMENT_NAME = "00_comprehension_swarm-construction-meaning";
const MATERIALS_HASH = "swarm-002-promptP";

const PRACTICE_FULL_SENTENCE = "The bookshelf is chock-full of books.";
const PRACTICE_FULL_PROMPT = "How many books are on the bookshelf?"
const PRACTICE_EMPTY_SENTENCE = "The books are missing from the bookshelf.";
const PRACTICE_EMPTY_PROMPT = "How many books are on the bookshelf?";

const slider_trial_template = {
  type: "html-slider-response-with-copout",
  pre_stimulus_prompt: "Please read the following sentence:",
  copout_text: "This sentence doesn't make sense to me.",
  labels: ["completely empty", "completely full"],
  require_movement: true,
};


export async function createTimeline() {
  const trial_materials = await get_trials(EXPERIMENT_NAME, MATERIALS_HASH);

  let timeline = [];

  // DEV skip demo stuff for time
  // timeline.push(trials.age_block);
  // timeline.push(trials.demo_block);

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
          On the next page, you'll read a sentence describing a scene with a
          <strong>bookshelf</strong>.
        </p>

        <p class="jspsych-instructions">
          Your job is to share your best guess about <strong>how full</strong>
          the bookshelf is, from completely empty to completely full.
        </p>

        <p class="jspsych-instructions">
          If the particular sentence does not make sense to you, you can click
          the checkbox <em>"This sentence doesn't make sense to me."</em> to
          proceed to the next page.
        </p>
        `,
      ],
    },

    {
      stimulus: PRACTICE_FULL_SENTENCE,
      post_stimulus_prompt: PRACTICE_FULL_PROMPT,
      data: { practice_sentence: "full" },
      ...slider_trial_template
    },

    {
      stimulus: PRACTICE_EMPTY_SENTENCE,
      post_stimulus_prompt: PRACTICE_EMPTY_PROMPT,
      data: { practice_sentence: "empty" },
      ...slider_trial_template
    },

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
    const stimulus = trial.sentence;

    return {
      stimulus: stimulus,
      post_stimulus_prompt: trial.prompt,

      data: {
        experiment_id: EXPERIMENT_NAME,
        materials_id: MATERIALS_HASH,
        item_id: trial.item_id,
        condition_id: trial.condition_id,
        stim_sentence: trial.sentence,
      },

      ...slider_trial_template
    }
  }));

  timeline.push(trials.comments_block);

  return timeline;
}


export const show_progress_bar = true;
export let on_finish = default_on_finish;
export let on_data_update = default_on_data_update;
