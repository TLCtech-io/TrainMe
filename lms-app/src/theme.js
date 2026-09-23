/* Brand tokens and font stacks for components, read from lms.config.js.
   Components import T and F from here rather than reaching into the config,
   so a token lookup reads the same everywhere: T.neutral900, F.heading. */

import LMS_CONFIG from './lms.config.js';

export const T = LMS_CONFIG.theme;

export const F = {
  heading: LMS_CONFIG.fonts.heading,
  body: LMS_CONFIG.fonts.body,
};
