/**
 * Tests whether weight manipulation has an effect on production preference
 * for the *spray/load* alternation.
 *
 * @title 5-10min English writing task (Explaining 06-00)
 * @description Help us pick out natural English sentences.
 * @version
 */

// You can import the custom stylesheets you use (.scss or .css).
import "../../styles/main.scss";

import * as _ from "underscore";

// jsPsych plugins
import "jspsych/plugins/jspsych-instructions";
import "../plugins/survey-multi-choice-ext";

import { get_trials } from "../materials";
import * as trials from "../trials";
import { default_on_finish, default_on_data_update } from "../psiturk";

const EXPERIMENT_NAME = "06_production_spray-load-weight";
const MATERIALS_HASH = "spray-load_comprehension-001-matchdet-diffscales";
const FILLERS_HASH = "fillers/spray-load_production-000-base";

const MATERIALS_SEQ = [MATERIALS_HASH, FILLERS_HASH];

const COMPENSATION = "$1.00";

// Helper function to add experiment ID to block spec
const a = (block) => trials.add_data_fields(block, { experiment_id: EXPERIMENT_NAME });


export async function createTimeline() {
  const trial_materials = await get_trials(EXPERIMENT_NAME, MATERIALS_SEQ);

  let timeline = [a(trials.age_block), a(trials.demo_block)];

  timeline = timeline.concat([
    {
      type: "instructions",
      show_clickable_nav: true,
      pages: [
        `
        <p class="jspsych-instructions">
          Welcome! In this experiment, you will make multiple-choice answers
          about the most natural way to complete English sentences.
        </p>
        <p class="jspsych-instructions">
          On each page, we'll present two sentences which express similar ideas
          but <strong>using different word orders</strong> and
          <strong>different function words</strong> (<em>on</em>, <em>in</em>,
          <em>with</em>, etc.).
        </p>
        <p class="jspsych-instructions">
          Your job is to pick the sentence which sounds the
          <strong>most natural</strong> to you. Go with your gut feeling here --
          no need to worry about the rules you learned in English class.
        </p>
        `,

        `
        <p class="jspsych-instructions">
          We'll begin with a practice item on the next page.
        </p>
        `
      ]
    },

    a({
      type: "survey-multi-choice-ext",
      required: true,

      questions: [
        {
          prompt:
            "The following two sentences are slightly different. Which " +
            "sentence sounds more natural to you?",
          options: _.shuffle([
            {
              value: "good",
              label: "John went to the store. He bought a guitar.",
            },
            {
              value: "bad",
              label: "John went to the store. A guitar was bought by him.",
            },
          ]),
        },
      ],

      data: { practice_sentence: true },
    }),

    {
      type: "instructions",
      show_clickable_nav: true,
      pages: [
        `
        <p class="jspsych-instructions">
        Good work! The experiment will now begin.
        </p>
        `,
      ],
    },
  ])

  // Prepare main experimental trials.
  timeline = timeline.concat(_.map(trial_materials.trials, (trial) => {
    // Randomly order sentence options.
    const options = _.shuffle(_.keys(trial.sentence_options));
    const sentences = options.map(o => ({value: o, label: trial.sentence_options[o]}));

    return {
      type: "survey-multi-choice-ext",
      required: true,

      questions: [
        {
          prompt:
            "The following two sentences are slightly different. Which " +
            "sentence sounds more natural to you?",
          options: sentences,
        },
      ],

      data: {
        experiment_id: EXPERIMENT_NAME,
        materials_id: trial.materials_id,
        item_id: trial.item_id,
        condition_id: trial.condition_id,

        ordered_options: sentences,
      },
    }
  }));

  timeline.push(a(trials.make_comments_block(COMPENSATION)));

  return timeline;
}


export const show_progress_bar = true;
export let on_finish = default_on_finish;
export let on_data_update = default_on_data_update;
