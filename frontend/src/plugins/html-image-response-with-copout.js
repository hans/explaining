/**
 * jspsych-html-button-response
 * Josh de Leeuw
 *
 * plugin for displaying a stimulus and getting a button response
 *
 * documentation: docs.jspsych.org
 *
 **/

 const $ = window.jQuery;

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

      activate_delay: {
        type: jsPsych.plugins.parameterType.INT,
        description: 'Duration (in ms) before images should appear and be clickable',
        default: null,
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
    display_element = $(display_element);

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
        <button class="jspsych-btn" disabled="true">
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
    display_element.html(html);

    let enabled = false;

    // add event listeners to buttons
    display_element.find('.jspsych-html-image-response-button').click((e) => {
      if (!enabled) return;

      const choice = $(e.currentTarget).data("choice");
      after_response(choice);
    });

    const activate = () => {
      enabled = true;
      $('#jspsych-html-image-response-btngroup button').removeAttr('disabled');
    };
    if (trial.activate_delay) {
      jsPsych.pluginAPI.setTimeout(activate, trial.activate_delay);
    } else {
      activate();
    }

    // start time
    var start_time = performance.now();

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
      response.button = choice;
      response.rt = rt;

      // after a valid response, the stimulus will have the CSS class 'responded'
      // which can be used to provide visual feedback that a response was recorded
      display_element.find('#jspsych-html-image-response-stimulus').addClass("responded");

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
      display_element.html("");

      // move on to the next trial
      jsPsych.finishTrial(trial_data);
    };

    // hide image if timing is set
    if (trial.stimulus_duration !== null) {
      jsPsych.pluginAPI.setTimeout(function() {
        display_element.find('#jspsych-html-image-response-stimulus').css("visibility", "hidden");
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
