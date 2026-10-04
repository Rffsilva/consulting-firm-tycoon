/**
 * Starts the game. Everything else has already been loaded by index.html; this wires it together.
 */
(function (CFT) {
  'use strict';
  const { ui, office } = CFT;

  ui.clock.init();      // speed buttons
  ui.windows.init();    // pop-up windows, Esc, header buttons
  ui.actions.init();    // every data-action button and dropdown

  ui.session.resumeOrStart();
  ui.clock.setSpeed(1);

  office.loop.start();  // the 2D office
})(window.CFT);
