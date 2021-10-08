/**
 * jspsych-html-button-response
 * Josh de Leeuw
 *
 * plugin for displaying a stimulus and getting a button response
 *
 * documentation: docs.jspsych.org
 *
 **/

jsPsych.plugins["html-image-response-with-copout"] = (function() {

  var plugin = {};

  plugin.info = {
    name: 'html-image-response-with-copout',
    description: '',
    parameters: {
      stimulus: {
        type: jsPsych.plugins.parameterType.HTML_STRING,
        pretty_name: 'Stimulus',
        default: undefined,
        description: 'The HTML string to be displayed'
      },
      image_choices: {
        type: jsPsych.plugins.parameterType.COMPLEX,
        pretty_name: 'Choices',
        default: undefined,
        description: 'The labels for the buttons.'
      },
      prompt: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Prompt',
        default: null,
        description: 'Any content here will be displayed under the button.'
      },
      pre_stimulus_prompt: {
        type: jsPsych.plugins.parameterType.STRING,
        default: null,
      },
      post_stimulus_prompt: {
        type: jsPsych.plugins.parameterType.STRING,
        default: null,
      },
      stimulus_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Stimulus duration',
        default: null,
        description: 'How long to hide the stimulus.'
      },
      trial_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Trial duration',
        default: null,
        description: 'How long to show the trial.'
      },
      response_ends_trial: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Response ends trial',
        default: true,
        description: 'If true, then trial will end when user responds.'
      },

      copout_text: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: "Cop-out text",
        default: null
      },
      shuffle: {
        type: jsPsych.plugins.parameterType.BOOL,
        default: false,
      }
    }
  }

  plugin.trial = function(display_element, trial) {

    const pre_stimulus_prompt = trial.pre_stimulus_prompt == null ? ""
      : `<div id="jspsych-html-image-response-pre-stimulus">${trial.pre_stimulus_prompt}</div>`;
    const post_stimulus_prompt = trial.post_stimulus_prompt == null ? ""
      : `<div id="jspsych-html-image-response-post-stimulus">${trial.post_stimulus_prompt}</div>`;

    let options = Object.entries(trial.image_choices);
    if (trial.shuffle) {
      options = jsPsych.randomization.shuffle(options);
    }
    const buttons = options.map(([id, path]) =>
      `<div class="jspsych-html-image-response-button" data-choice="${id}">
        <button class="jspsych-btn">
          <img src="${path}" />
        </button>
      </div>`
    );

    const html = `
      <div id="jspsych-html-image-response-wrapper">
        ${pre_stimulus_prompt}
        <div id="jspsych-html-image-response-stimulus">
          ${trial.stimulus}
        </div>
        ${post_stimulus_prompt}

        <div id="jspsych-html-image-response-btngroup">
          ${buttons.join("\n")}
        </div>
      </div>`;
    display_element.innerHTML = html;

    // start time
    var start_time = performance.now();

    // add event listeners to buttons
    display_element.querySelector('.jspsych-html-image-response-button').addEventListener('click', function(e){
      var choice = e.currentTarget.getAttribute('data-choice'); // don't use dataset for jsdom compatibility
      after_response(choice);
    });

    // store response
    var response = {
      rt: null,
      button: null
    };

    // function to handle responses by the subject
    function after_response(choice) {

      // measure rt
      var end_time = performance.now();
      var rt = end_time - start_time;
      response.button = parseInt(choice);
      response.rt = rt;

      // after a valid response, the stimulus will have the CSS class 'responded'
      // which can be used to provide visual feedback that a response was recorded
      display_element.querySelector('#jspsych-html-image-response-stimulus').className += ' responded';

      // disable all the buttons after a response
      var btns = document.querySelectorAll('.jspsych-html-image-response-button button');
      for(var i=0; i<btns.length; i++){
        //btns[i].removeEventListener('click');
        btns[i].setAttribute('disabled', 'disabled');
      }

      if (trial.response_ends_trial) {
        end_trial();
      }
    };

    // function to end trial when it is time
    function end_trial() {

      // kill any remaining setTimeout handlers
      jsPsych.pluginAPI.clearAllTimeouts();

      // gather the data to store for the trial
      var trial_data = {
        rt: response.rt,
        stimulus: trial.stimulus,
        response: response.button
      };

      // clear the display
      display_element.innerHTML = '';

      // move on to the next trial
      jsPsych.finishTrial(trial_data);
    };

    // hide image if timing is set
    if (trial.stimulus_duration !== null) {
      jsPsych.pluginAPI.setTimeout(function() {
        display_element.querySelector('#jspsych-html-image-response-stimulus').style.visibility = 'hidden';
      }, trial.stimulus_duration);
    }

    // end trial if time limit is set
    if (trial.trial_duration !== null) {
      jsPsych.pluginAPI.setTimeout(function() {
        end_trial();
      }, trial.trial_duration);
    }

  };

  return plugin;
})();
