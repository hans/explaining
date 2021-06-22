/**
* Main experiment logic.
*
* Assumes globals are already set: uniqueId, adServerLoc, mode
*/

/* load psiturk */
var psiturk = new PsiTurk(uniqueId, adServerLoc, mode);
var R = jsPsych.randomization;

const COMPENSATION = "$0.60";

const PHASES = [
  // semantic effect of construction in comprehension
  ["comprehension", "sem"],
  // semantically driven choice of construction in production
  ["production", "sem"],
  // non-semantically driven choice of construction in production
  ["production", "nonsem"],
];
const CONDITIONS = ["verb", "syntax"]; // TODO

var instructions_block = {
  type: "instructions",
  pages: [
    "<p>TODO instructions</p>",
  ],
  show_clickable_nav: true,
};

var age_block = {
  type: "survey-text",
  preamble: "Please provide us with some demographic information.",
  questions: [{prompt: "How old are you (in years)?"}]
};

var demo_block = {
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

var comments_block = {
  type: "survey-text",
  // TODO
  preamble: "<p>Thanks for participating in our study. You will be compensated " + COMPENSATION + " in total.</p><p><strong>Click \"Finish\" to complete the experiment and receive compensation.</strong> If you have any comments, please let us know in the form below.</p>",
  questions: [{prompt: "Do you have any comments to share with us?"}],
  button_label: "Finish",
};

$.getJSON("/trials", {uniqueId: uniqueId}, function(trials) {
  setup_experiment(trials)
});

var setup_experiment = function(data) {
  var preload_images = [];
  console.log(data);

  var trials = $.map(data['trials'], function(trial) {
    // var condition = R.sampleWithReplacement(CONDITIONS, 1)[0];

    // var item_intro_block = {
    //   type: "instructions",
    //   show_clickable_nav: true,
    //   pages: [
    //     "<p>We are now going to study this Zarf verb:</p>"
    //     + "<p class='zarf-verb'>" + block.nonce_verb + "</p>"
    //     + "<p>We will hear Zarf speakers use this verb to describe things they see.</p>"
    //     + "<p>Next, we'll ask you to guess their translations in English.</p>"
    //   ],
    //   data: {
    //     condition: condition,
    //     stage: "introduction",
    //     item_idx: block.item_idx,
    //     verb: block.verb,
    //     contrast_verbs: block.contrast_verbs,
    //     nonce_verb: block.nonce_verb
    //   }
    // }

    const phase = data.phase;
    if (phase[0] == 'production') {
      // TODO
    } else if (phase[0] == 'comprehension') {
      const sentence_stimulus = ''; // TODO

      const alternatives = R.shuffle(trial.scenes);
      const alternative_stimuli = $.map(alternatives, (a) => a.scene_image);
      const alternative_values = $.map(alternatives, (a) => a.value);

      const stimuli = [sentence_stimulus].concat(alternative_stimuli);

      var trial = {
        type: 'xab',
        stimuli: stimuli,
        data: {
          phase: phase,
          item_id: trial.item_id,

          // comprehension-specific data
          stim_sentence: sentence_stimulus,
          stim_scenes: alternatives,
        }
      };

      return trial;
    }
  });;

  /* define experiment structure */

  var experiment_blocks = [];

  // DEV
  experiment_blocks.push(instructions_block);
  experiment_blocks.push(age_block);
  experiment_blocks.push(demo_block);

  experiment_blocks = experiment_blocks.concat(trials);

  experiment_blocks.push(comments_block);


  /* start the experiment */

  jsPsych.init({
    timeline: experiment_blocks,
    show_progress_bar: true,
    preload_images: preload_images,

    on_finish: function() {
      psiturk.saveData({
        success: function() { psiturk.completeHIT(); },
        error: function() { console.log("error saving data"); }
      });
    },
    on_data_update: function(data) {
      psiturk.recordTrialData(data);
    },
  });
};

