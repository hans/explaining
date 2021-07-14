/**
 * Defines trials shared across experiments
 */

 import "jspsych/plugins/jspsych-survey-text";
 import "jspsych/plugins/jspsych-survey-multi-choice";

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

const COMPENSATION = "TODO";
 export const comments_block = {
   type: "survey-text",
   // TODO
   preamble: "<p>Thanks for participating in our study. You will be compensated " + COMPENSATION + " in total.</p><p><strong>Click \"Finish\" to complete the experiment and receive compensation.</strong> If you have any comments, please let us know in the form below.</p>",
   questions: [{prompt: "Do you have any comments to share with us?"}],
   button_label: "Finish",
 };
