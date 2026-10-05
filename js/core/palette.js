/**
 * Colours used by the office drawing code and by the role files (each role decides how its people look).
 */
(function (CFT) {
  'use strict';

  CFT.palette = Object.freeze({
    OUTLINE: '#2a2038', // soft ink outline around every sprite
    SKILL: { Strategy: '#ff6b6b', Analytics: '#4dabf7', Technology: '#9775fa', Finance: '#51cf66', Operations: '#ffa94d' },
    HAIR: ['#2b2438', '#5a3a2e', '#a8603a', '#f2d06b', '#1e2440', '#c9d3ea', '#ff8fb8', '#6b8cff', '#8a6bd6'], // anime hair: ink black, chestnut, blonde, navy, silver, pink, blue, violet
    SKIN: ['#fff0e2', '#ffe0c8', '#f4c9a5', '#d9a47c'],
    EYE: ['#4a6fe0', '#2fa88a', '#8a4fd6', '#d9534f', '#3a2a4a', '#e08a2f'],
    HIGHLIGHT: '#ffe08a',
    SAKURA: '#ffb7c5', SAKURA_DEEP: '#ff8fab', VERMILION: '#d9453a', INDIGO: '#34447a', GOLD: '#e8c25a',
  });
})(window.CFT);
