/**
 * Starting, resuming and losing a game.
 */
(function (CFT) {
  'use strict';
  const { store, simulation } = CFT;
  const { clock, components: { $ } } = CFT.ui;

  CFT.ui.session = {
    newGame() {
      store.state = simulation.newGame();
      $('gameover').hidden = true;
      store.save(store.state);
      CFT.ui.render();
    },

    /** Continues the saved game, or starts a new one. */
    resumeOrStart() {
      const saved = store.load();
      if (!saved) return CFT.ui.session.newGame();
      store.state = saved;
      CFT.ui.render();
    },

    gameOver() {
      const s = store.state;
      clock.setSpeed(0);
      store.clear();
      $('goText').textContent = `Your firm collapsed on day ${s.day}. Projects delivered: ${s.completed}, reputation: ${s.rep}.`;
      $('gameover').hidden = false;
      CFT.ui.render();
    },
  };
})(window.CFT);
