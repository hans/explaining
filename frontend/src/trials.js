/**
 * Defines trials shared across experiments
 */

import "jspsych/plugins/jspsych-instructions";
import "jspsych/plugins/jspsych-survey-text";
import "jspsych/plugins/jspsych-survey-multi-choice";
import "./plugins/html-slider-response-with-copout";

import { get_trials } from './materials';


export function add_data_fields(trial_object, data_fields) {
  trial_object = {
    ...trial_object,
    data: { ...trial_object.data, ...data_fields },
  }

  return trial_object;
}


 export const age_block = {
   type: "survey-text",
   preamble: "Please provide us with some demographic information.",
   questions: [{prompt: "How old are you (in years)?"}]
 };

 export const demo_block = {
   type: "survey-multi-choice",
   questions: [
     {
       prompt: "What is the highest level of education you have completed?",
       options: ["Did not complete high school", "High school/GED", "Some college", "Bachelor's degree", "Master's degree", "Ph.D."],
       required: true
     },
     {
       prompt: "Is English your first language?",
       options: ["Yes", "No"],
       required: true
     }
   ]
 };


export function make_comments_block(compensation) {
  return {
    type: "survey-text",
    preamble: "<p>Thanks for participating in our study. You will be compensated " + compensation + " in total.</p><p><strong>Click \"Finish\" to complete the experiment and receive compensation.</strong> If you have any comments, please let us know in the form below.</p>",
    questions: [{prompt: "Do you have any comments to share with us?"}],
    button_label: "Finish",
  };
}


export const acceptability_block = {
  type: "html-slider-response-with-copout",
  required: true,
  copout_text: null,

  pre_stimulus_prompt: "How acceptable is the following sentence?",
  labels: ["1<br/>bad / very unnatural", "2", "3", "4", "5", "6",
           "7<br/>good / very natural"],

  min: 1,
  max: 7,
  slider_start: 4,
}


export const acceptability_intro_sequence = [
  {
    type: "instructions",
    show_clickable_nav: true,
    pages: [
      "<p class='jspsych-instructions'>" +
      "Welcome! In this experiment, you will be asked to judge a series of " +
      "sentences. For each sentence, you'll be asked to judge if the sentence " +
      "is an <strong>acceptable sentence of English</strong> using a scale from " +
      "1-7, where 1 is the least acceptable sentence and 7 is the most " +
      "acceptable sentence." +
      "</p>",

      "<p class='jspsych-instructions'>" +
      "<p>You are <em>not</em> being asked to judge the plausibility of the " +
      "sentence; you are simply being asked to judge whether the sentence " +
      "sounds like a <strong>natural sentence of English</strong>.</p>" +
      "<p>You are also not being asked to judge whether each sentence is " +
      "acceptable according to a 'school grammar.' As a native speaker of " +
      "English, you have <strong>intuitions or gut feelings</strong> about " +
      "what sounds like an acceptable sentence.</p>" +
      "</p>",

      "<p class='jspsych-instructions'>" +
      "Sometimes you may not be sure which answer is correct. When this " +
      "happens, go with your first instinct. Don't overthink it!" +
      "</p>",

      "<p class='jspsych-instructions'>" +
      "Let's begin with a few practice sentences." +
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
]

const swarm_slider_trial_template = {
  type: "html-slider-response-with-copout",
  pre_stimulus_prompt: "Please read the following sentence:",
  copout_text: "This sentence doesn't make sense to me.",
  labels: ["0% / none", "100% / as much/many as there possibly could be"],
  require_movement: true,
};

export function createFullSwarmComprehensionTimeline(experiment_name, materials_seq, compensation) {
  // Helper function to add experiment ID to block spec
  const a = (block) => add_data_fields(block, { experiment_id: experiment_name });

  return async () => {
    const trial_materials = await get_trials(experiment_name, materials_seq);

    let timeline = [];

    timeline.push(a(age_block));
    timeline.push(a(demo_block));

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
        ...swarm_slider_trial_template,
        stimulus: "Joe marveled at the bookshelf. It is chock-full of books.",
        post_stimulus_prompt: "How many books are on the bookshelf?",
        data: { condition_id: ["practice", "solid", "full"] },
        css_classes: ["jspsych-swarm-trial-practice"],
      }),

      a({
        ...swarm_slider_trial_template,
        stimulus: "The pool is starting to overflow.",
        post_stimulus_prompt: "How much water is in the pool?",
        data: { condition_id: ["practice", "liquid", "full"] },
        css_classes: ["jspsych-swarm-trial-practice"],
      }),

      a({
        ...swarm_slider_trial_template,
        stimulus: "Everyone agreed that there was very little passion in the music.",
        post_stimulus_prompt: "How much passion was in the music?",
        data: { condition_id: ["practice", "abstract", "empty"] },
        css_classes: ["jspsych-swarm-trial-practice"],
      }),

      a({
        ...swarm_slider_trial_template,
        stimulus: "The books are missing from the bookshelf.",
        post_stimulus_prompt: "How many books are on the bookshelf?",
        data: { condition_id: ["practice", "solid", "empty"] },
        css_classes: ["jspsych-swarm-trial-practice"],
      }),

      a({
        ...swarm_slider_trial_template,
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
          experiment_id: experiment_name,
          materials_id: trial.materials_id,
          item_id: trial.item_id,
          condition_id: trial.condition_id,
          stim_sentences: trial.sentences,
        },

        ...swarm_slider_trial_template
      }
    }));

    timeline.push(a(make_comments_block(compensation)));

    return timeline;
  }
}
