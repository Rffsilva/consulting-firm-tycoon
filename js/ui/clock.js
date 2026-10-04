/**
 * The game clock: advances one day every config.MS_PER_DAY / speed milliseconds, and the speed buttons.
 */
(function (CFT) {
  'use strict';
  const { config, store, simulation } = CFT;

  let timer = null;

  const clock = {
    /** 0 = paused, 1, 2 or 4. */
    speed: 1,

    setSpeed(n) {
      clock.speed = n;
      clearInterval(timer);
      if (n > 0) timer = setInterval(clock.tick, config.MS_PER_DAY / n);
      document.querySelectorAll('[data-speed]').forEach(b => b.classList.toggle('active', Number(b.dataset.speed) === n));
    },

    tick() {
      const s = store.state;
      const { bankrupt } = simulation.advanceDay(s);
      if (bankrupt) return CFT.ui.session.gameOver(); // (session.js loads later)
      store.save(s);
      CFT.ui.renderTick();
    },

    init() {
      document.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => clock.setSpeed(Number(b.dataset.speed))));
    },
  };

  CFT.ui.clock = clock;
})(window.CFT);
