import type { MotionTokens } from '../types';

export const motion: MotionTokens = {
  duration: {
    instant: 100,
    fast:    200,
    normal:  300,
    slow:    500,
  },
  easing: {
    easeOut:   'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn:    'cubic-bezier(0.4, 0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};
