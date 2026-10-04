/**
 * Colours used by the office drawing code and by the role files (each role decides how its people look).
 */
(function (CFT) {
  'use strict';

  CFT.palette = Object.freeze({
    OUTLINE: '#2b2140', // dark outline around every sprite
    SKILL: { Strategy: '#ff6b6b', Analytics: '#4dabf7', Technology: '#9775fa', Finance: '#51cf66', Operations: '#ffa94d' },
    HAIR: ['#3b2a1e', '#7a4a24', '#c9772e', '#f2c94c', '#1e1e24', '#b8b8c8', '#e8567a'],
    SKIN: ['#ffd9b3', '#f0b98d', '#c98b5b', '#8d5a3b'],
    HIGHLIGHT: '#ffe08a',
  });
})(window.CFT);
