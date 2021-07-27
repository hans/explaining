/**
 * html-slider-response-with-copout
 * extension of jspsych-html-slider-response, which also includes a "cop-out"
 * button as an alternative response (to allow the user to respond e.g. "the
 * premise of this question is false")
 */


const jsPsych = window.jsPsych;
const $ = window.jQuery;
const performance = window.performance;
const plugin = {};

plugin.info = {
  name: 'html-slider-response-with-copout',
  description: '',
  parameters: {
    stimulus: {
      type: jsPsych.plugins.parameterType.HTML_STRING,
      pretty_name: 'Stimulus',
      default: undefined,
      description: 'The HTML string to be displayed'
    },
    min: {
      type: jsPsych.plugins.parameterType.INT,
      pretty_name: 'Min slider',
      default: 0,
      description: 'Sets the minimum value of the slider.'
    },
    max: {
      type: jsPsych.plugins.parameterType.INT,
      pretty_name: 'Max slider',
      default: 100,
      description: 'Sets the maximum value of the slider',
    },
    slider_start: {
      type: jsPsych.plugins.parameterType.INT,
      pretty_name: 'Slider starting value',
      default: 50,
      description: 'Sets the starting value of the slider',
    },
    step: {
      type: jsPsych.plugins.parameterType.INT,
      pretty_name: 'Step',
      default: 1,
      description: 'Sets the step of the slider'
    },
    labels: {
      type: jsPsych.plugins.parameterType.HTML_STRING,
      pretty_name:'Labels',
      default: [],
      array: true,
      description: 'Labels of the slider.',
    },
    slider_width: {
      type: jsPsych.plugins.parameterType.INT,
      pretty_name:'Slider width',
      default: null,
      description: 'Width of the slider in pixels.'
    },
    button_label: {
      type: jsPsych.plugins.parameterType.STRING,
      pretty_name: 'Button label',
      default:  'Continue',
      array: false,
      description: 'Label of the button to advance.'
    },
    require_movement: {
      type: jsPsych.plugins.parameterType.BOOL,
      pretty_name: 'Require movement',
      default: false,
      description: 'If true, the participant will have to move the slider before continuing.'
    },
    prompt: {
      type: jsPsych.plugins.parameterType.STRING,
      pretty_name: 'Prompt',
      default: null,
      description: 'Any content here will be displayed below the slider.'
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
      description: 'If true, trial will end when user makes a response.'
    },

    copout_text: {
      type: jsPsych.plugins.parameterType.STRING,
      pretty_name: "Cop-out text",
      default: null
    },
  }
}

plugin.trial = function(display_element, trial) {
  display_element = $(display_element);

  // half of the thumb width value from jspsych.css, used to adjust the label positions
  var half_thumb_width = 7.5;

  const pre_stimulus_prompt = trial.pre_stimulus_prompt == null ? ""
    : `<div id="jspsych-html-slider-response-pre-stimulus">${trial.pre_stimulus_prompt}</div>`;
  const post_stimulus_prompt = trial.post_stimulus_prompt == null ? ""
    : `<div id="jspsych-html-slider-response-post-stimulus">${trial.post_stimulus_prompt}</div>`;

  let label_html = '';
  for(var j=0; j < trial.labels.length; j++){
    var label_width_perc = 100/(trial.labels.length-1);
    var percent_of_range = j * (100/(trial.labels.length - 1));
    var percent_dist_from_center = ((percent_of_range-50)/50)*100;
    var offset = (percent_dist_from_center * half_thumb_width)/100;
    label_html += `
      <div style="border: 1px solid transparent; display: inline-block; position: absolute; left:calc(${percent_of_range}% - (${label_width_perc}% / 2) - ${offset}px); text-align: center; width: ${label_width_perc}%;">
        <span style="text-align: center; font-size: 80%;">${trial.labels[j]}</span>
      </div>`;
  }

  const copout_html = trial.copout_text == null ? "" : `
  <div class="jspsych-html-slider-copout-response">
    <input type="checkbox" id="jspsych-html-slider-copout-checkbox" />
    &nbsp;<label for="jspsych-html-slider-copout-checkbox">
      ${trial.copout_text}
    </label>
  </div>`;

  var html = `
  <div id="jspsych-html-slider-response-wrapper" style="margin: 100px 0px;">
    ${pre_stimulus_prompt}
    <div id="jspsych-html-slider-response-stimulus">
      ${trial.stimulus}
    </div>
    ${post_stimulus_prompt}

    <div class="jspsych-html-slider-response-container"
         style="position:relative; margin: 0 auto 3em auto; width: ${trial.slider_width == null ? 'auto' : trial.slider_width + 'px'}">
      <input type="range" class="jspsych-slider" value="${trial.slider_start}"
             min="${trial.min}" max="${trial.max}" step="${trial.step}"
             id="jspsych-html-slider-response-response" />

      ${label_html}
    </div>

    ${copout_html}
  </div>

  ${trial.prompt || ""}

  <button id="jspsych-html-slider-response-next" class="jspsych-btn"
          ${trial.require_movement ? "disabled" : ""}>
    ${trial.button_label}
  </button>
  `;

  display_element.html(html);

  var response = {
    rt: null,
    response: null
  };

  const slider_wrapper_el = display_element.find('.jspsych-html-slider-response-container');
  const slider_el = display_element.find('#jspsych-html-slider-response-response');
  const copout_el = display_element.find('#jspsych-html-slider-copout-checkbox');
  const button_el = display_element.find('#jspsych-html-slider-response-next');

  if(trial.require_movement){
    slider_el.click(() => { button_el.prop("disabled", false) });
    copout_el.click(() => { button_el.prop("disabled", false) });
  }

  copout_el.click(() => {
    if (copout_el.prop("checked")) {
      slider_el.prop("disabled", true);
      slider_wrapper_el.addClass('jspsych-html-slider-response-disabled');
    } else {
      slider_el.prop("disabled", false);
      slider_wrapper_el.removeClass('jspsych-html-slider-response-disabled');
    }
  });

  button_el.click(() => {
    // measure response time
    var endTime = performance.now();
    response.rt = endTime - startTime;
    response.response = parseInt(slider_el.val());

    if(trial.response_ends_trial){
      end_trial();
    } else {
      button_el.disabled = true;
    }

  });

  function end_trial(){

    jsPsych.pluginAPI.clearAllTimeouts();

    const copout = copout_el.prop("checked");
    const final_response = copout ? null : response.response;

    // save data
    var trialdata = {
      rt: response.rt,
      stimulus: trial.stimulus,
      slider_start: trial.slider_start,

      response: final_response,
      copout: copout,
    };

    display_element.html("");

    // next trial
    jsPsych.finishTrial(trialdata);
  }

  if (trial.stimulus_duration !== null) {
    jsPsych.pluginAPI.setTimeout(function() {
      display_element.find('#jspsych-html-slider-response-stimulus').css("visibility", "hidden");
    }, trial.stimulus_duration);
  }

  // end trial if trial_duration is set
  if (trial.trial_duration !== null) {
    jsPsych.pluginAPI.setTimeout(function() {
      end_trial();
    }, trial.trial_duration);
  }

  var startTime = performance.now();
};

window.jsPsych.plugins['html-slider-response-with-copout'] = plugin;
