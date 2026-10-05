/**
 * Starts the game. Everything else has already been loaded by index.html; this wires it together.
 */
(function (CFT) {
  'use strict';
  const { ui, office } = CFT;

  ui.clock.init();      // speed buttons
  ui.windows.init();    // pop-up windows, Esc, header buttons
  ui.actions.init();    // every data-action button and dropdown
  ui.tutorial.init();   // "How to play"

  const firstGame = ui.session.resumeOrStart();
  ui.clock.setSpeed(1);
  ui.tutorial.showToNewPlayer(firstGame); // after setSpeed, so closing the guide resumes the clock

  office.loop.start();  // the 2D office
})(window.CFT);
