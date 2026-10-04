/**
 * The office's animation loop: every frame, move the player, find what's in reach, and redraw everything.
 */
(function (CFT) {
  'use strict';
  const { store } = CFT;
  const { windows } = CFT.ui;
  const { painter, scene, player, interaction } = CFT.office;

  let last = performance.now();

  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000); // seconds since the last frame, capped after tab switches
    last = ts;
    const s = store.state;
    if (!windows.isOpen()) player.update(dt);
    interaction.update(s);

    scene.drawScene(s);
    player.draw();
    interaction.drawOverlays();
    requestAnimationFrame(frame);
  }

  CFT.office.loop = {
    start() {
      painter.fitToContainer();
      player.init();
      interaction.init();
      requestAnimationFrame(frame);
    },
  };
})(window.CFT);
