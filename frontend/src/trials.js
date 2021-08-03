/**
 * Defines trials shared across experiments
 */

import "jspsych/plugins/jspsych-instructions";
import "jspsych/plugins/jspsych-survey-text";
import "jspsych/plugins/jspsych-survey-multi-choice";
import "./plugins/html-slider-response-with-copout";


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
