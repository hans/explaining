/**
 * Tests whether topicality manipulation has an effect on production preference
 * for the *swarm*-construction.
 *
 * @title 5-10min English writing task (Explaining 01-00)
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

const EXPERIMENT_NAME = "01_production_swarm-topicality";
const MATERIALS_HASH = "swarm-003-drops";
const FILLERS_HASH = "fillers/swarm_production-000-base";

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
          On each page, we'll present two sentences which begin the same, but
          which <strong>end in slightly different ways</strong>.
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
            "The following two sentences differ in the way they are " +
            "completed after the <em>and</em>. Which sentence sounds more " +
            "natural to you?",
          options: _.shuffle([
            {
              value: "good",
              label: "John went to the store and he bought a guitar.",
            },
            {
              value: "bad",
              label: "John went to the store and a guitar was bought by him.",
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
    const options = _.shuffle(_.keys(trial.sentences));
    const sentences = options.map(o => ({value: o, label: trial.sentences[o]}));

    return {
      type: "survey-multi-choice-ext",
      required: true,

      questions: [
        {
          prompt:
            "The following two sentences differ in the way they are " +
            `completed after the <em>${trial.conjunction}</em>. Which ` +
            "sentence sounds more natural to you?",
          options: sentences,
        },
      ],

      data: {
        experiment_id: EXPERIMENT_NAME,
        materials_id: MATERIALS_HASH,
        item_id: trial.item_id,
        condition_id: trial.condition_id,

        ordered_options: sentences,
      },
    }
  }));

  timeline.push(trials.make_comments_block(COMPENSATION));

  return timeline;
}


export const show_progress_bar = true;
export let on_finish = default_on_finish;
export let on_data_update = default_on_data_update;
