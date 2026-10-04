/**
 * The pop-up windows ("panels" inside #modal). Only one is open at a time. Opening one pauses the game; closing it
 * restores the previous speed.
 */
(function (CFT) {
  'use strict';
  const { clock } = CFT.ui;

  const modal = () => document.getElementById('modal');
  const openListeners = [];
  let resumeSpeed = null; // game speed to restore when the window closes

  const windows = {
    /** Name of the open panel (matches data-panel in index.html), or null. */
    current: null,
    /** Employee shown in the 'employee' panel. */
    employeeId: null,

    isOpen: () => windows.current !== null,

    /** Registers a function to run whenever a window opens (the office uses it to stop walking). */
    onOpen(fn) {
      openListeners.push(fn);
    },

    open(name) {
      if (resumeSpeed === null) { resumeSpeed = clock.speed; clock.setSpeed(0); }
      windows.current = name;
      document.body.classList.add('modal-open');
      document.querySelectorAll('#modal section').forEach(sec => { sec.hidden = sec.dataset.panel !== name; });
      modal().hidden = false;
      openListeners.forEach(fn => fn(name));
      CFT.ui.render(); // (render.js loads later)
    },

    openEmployee(id) {
      windows.employeeId = id;
      windows.open('employee');
    },

    close() {
      windows.current = null;
      windows.employeeId = null;
      document.body.classList.remove('modal-open');
      if (resumeSpeed !== null) { clock.setSpeed(resumeSpeed); resumeSpeed = null; }
      modal().hidden = true;
    },

    init() {
      document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => windows.open(b.dataset.open)));
      document.getElementById('mclose').addEventListener('click', windows.close);
      modal().addEventListener('mousedown', e => { if (e.target === modal()) windows.close(); }); // click on the backdrop
      addEventListener('keydown', e => { if (e.key === 'Escape' && windows.isOpen()) windows.close(); });
    },
  };

  CFT.ui.windows = windows;
})(window.CFT);
