/**
 * Tests whether construction choice has an effect on inferred meaning for
 * *spray/load*-construction. Includes (in practice and filler and critical
 * trials) two types of response measures: the usual slider response, and also
 * for a small set of items a forced-choice response over images depicting
 * scenes possibly described by the utterance.
 *
 * We are floating a test balloon here, trying to maximize the measured effect
 * size of the construction, since the between-subject main effect was extremely
 * small under the slider measure.
 *
 * @title 5-10min English sentence understanding task (Explaining 07-00)
 * @description Help us understand the meanings of English words and sentences.
 * @version
 */

// You can import the custom stylesheets you use (.scss or .css).
import "../../styles/main.scss";
import "../../styles/comprehension_experiment.scss";
import "../../styles/image_experiment.scss";

import * as _ from "underscore";

// jsPsych and plugins
import "jspsych/plugins/jspsych-instructions";
import "jspsych/plugins/jspsych-html-button-response";
import "jspsych/plugins/jspsych-preload";
import "../plugins/html-image-response-with-copout";

import { get_trials } from "../materials";
import * as trials from "../trials";
import { default_on_finish, default_on_data_update } from "../psiturk";

const EXPERIMENT_NAME = "07_comprehension_spray-load-construction-meaning-with-images";
const MATERIALS_HASH = "spray-load-003-images";
const FILLERS_HASH = "fillers/spray-load_comprehension-002-prompt";

const MATERIALS_SEQ = [MATERIALS_HASH, FILLERS_HASH];

const COMPENSATION = "$1.00";
// Don't display images or allow responses for 250 ms on each trial
const IMAGE_ACTIVATE_DELAY = 250;

const slider_trial_template = {
  type: "html-slider-response-with-copout",
  pre_stimulus_prompt: "Please read the following sentence:",
  copout_text: "This sentence doesn't make sense to me.",
  require_movement: true,
};

const image_trial_template = {
  type: "html-image-response-with-copout",
  pre_stimulus_prompt: "Please read the following sentence:",
  post_stimulus_prompt:
    "Which of the following images is this sentence most likely to apply to?",
  copout_text: "This sentence doesn't make sense to me.",
  shuffle: true,
  activate_delay: IMAGE_ACTIVATE_DELAY,
};
const make_full_image_path = (image_path) => {
  return `images/${MATERIALS_HASH}/${image_path}`;
}

// Helper function to add experiment ID to block spec
const a = (block) => trials.add_data_fields(block, { experiment_id: EXPERIMENT_NAME });


export async function createTimeline() {
  const trial_materials = await get_trials(EXPERIMENT_NAME, MATERIALS_SEQ);

  let timeline = [];

  timeline.push(a(trials.age_block));
  timeline.push(a(trials.demo_block));

  // slider labels for practice trials
  const make_slider_labels_fill = (L) => [
    "0% / none",
    `100% / the ${L} is completely full`
  ];
  const make_slider_labels_cover = (L) => [
    "0% / none",
    `100% / the ${L} is completely covered`
  ];

  // TODO see if we need to change intro / practice phases
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
          On the next pages, you'll read a sentence describing a real-world
          scene.
        </p>

        <p class="jspsych-instructions">
          Your job is to share your best guess about <strong>how full</strong>
          some object is, or <strong>how completely covered</strong> it is by
          some material.
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
      ...image_trial_template,
      stimulus: "The bookshelf is chock-full of books.",
      data: { condition_id: ["practice", "fill", "full"] },
      image_choices: _.mapObject({
        "max": "_practice_bookshelf_full.jpg",
        "min": "_practice_bookshelf_empty.jpg",
      }, make_full_image_path),

      css_classes: ["jspsych-swarm-trial-practice"],
    }),

    a({
      ...slider_trial_template,
      stimulus: "The pool is starting to overflow.",
      post_stimulus_prompt: "How much water is in the pool?",
      labels: make_slider_labels_fill("pool"),
      data: { condition_id: ["practice", "fill", "full"] },
      css_classes: ["jspsych-swarm-trial-practice"],
    }),

    a({
      ...slider_trial_template,
      stimulus: "There was not even a speck of dust on the glass table.",
      post_stimulus_prompt: "How much dust is on the table?",
      labels: make_slider_labels_cover("table"),
      data: { condition_id: ["practice", "cover", "empty"] },
      css_classes: ["jspsych-swarm-trial-practice"],
    }),

    a({
      ...image_trial_template,
      stimulus: "The bookshelf is devoid of books.",
      data: { condition_id: ["practice", "fill", "empty"] },
      image_choices: _.mapObject({
        "max": "_practice_bookshelf_full.jpg",
        "min": "_practice_bookshelf_empty.jpg",
      }, make_full_image_path),

      css_classes: ["jspsych-swarm-trial-practice"],
    }),

    a({
      ...slider_trial_template,
      stimulus: "He spread the grass seed over the entire lawn.",
      post_stimulus_prompt: "How much grass seed is on the lawn?",
      labels: make_slider_labels_cover("lawn"),
      data: { condition_id: ["practice", "cover", "full"] },
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
    const trial_data = {
      experiment_id: EXPERIMENT_NAME,
      materials_id: trial.materials_id,
      item_id: trial.item_id,
      condition_id: trial.condition_id,

      stim_sentence: trial.sentence,
    };

    if (trial.measure == "slider") {
      return {
        stimulus: trial.sentence,
        post_stimulus_prompt: trial.prompt,
        labels: trial.slider_labels,

        data: trial_data,
        ...slider_trial_template
      };
    } else if (trial.measure == "forced_choice_images") {
      const images = _.mapObject(trial.images, make_full_image_path);
      return {
        stimulus: trial.sentence,
        image_choices: images,

        data: trial_data,
        ...image_trial_template
      }
    }
  }));

  timeline.push(a(trials.make_comments_block(COMPENSATION)));

  // Preload images from all image forced choice trials
  const all_images = timeline
    .filter((t) => t.type == "html-image-response-with-copout")
    .flatMap((t) => Object.values(t.image_choices));
  timeline.unshift({
    type: "preload",
    images: all_images,
  });

  return timeline;
}


export const show_progress_bar = true;
export const experiment_width = 1024;
export let on_finish = default_on_finish;
export let on_data_update = default_on_data_update;
