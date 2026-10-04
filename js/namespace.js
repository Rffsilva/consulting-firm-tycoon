'use strict';
/**
 * The game's single global. Every script registers what it provides on this object instead of creating globals.
 *
 * Scripts are plain <script> tags (so index.html still works when opened straight from disk), which means
 * the order in index.html is the dependency order: a file may use anything registered by files above it.
 * See docs/ARCHITECTURE.md.
 */
window.CFT = {
  // js/core
  config: null,      // balance numbers
  content: null,     // names, clients, project titles
  palette: null,     // colours shared by the office and the role files
  util: null,        // small helpers
  store: null,       // the running game state, logging, saving

  // js/sim and js/employees
  projects: null,    // client requests and projects
  staff: null,       // employee role registry and shared employee helpers
  management: null,  // managers: strategies and auto-assignment
  hrAdvisor: null,   // HR: hire/train recommendations
  company: null,     // player actions: hire, fire, train, assign, expand
  simulation: null,  // new game and the daily simulation step

  // js/ui and js/office
  ui: { panels: {} },
  office: {},
};
