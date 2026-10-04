/**
 * Redraws every HTML panel from the current state. The office canvas redraws itself every frame (js/office/loop.js).
 */
(function (CFT) {
  'use strict';
  const { store } = CFT;
  const { panels } = CFT.ui;

  // Order doesn't matter for correctness; it is listed to show every panel in one place.
  const ALL_PANELS = [
    panels.header, panels.you, panels.projects, panels.requests, panels.team,
    panels.hiring, panels.hr, panels.strategy, panels.facilities, panels.log,
  ];

  CFT.ui.render = function render() {
    const s = store.state;
    for (const draw of ALL_PANELS) draw(s);
  };

  /** Used by the clock: re-rendering would close an open dropdown, so skip it while one has focus. */
  CFT.ui.renderTick = function renderTick() {
    const active = document.activeElement;
    if (active && active.tagName === 'SELECT') return;
    CFT.ui.render();
  };
})(window.CFT);
