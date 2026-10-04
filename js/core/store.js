/**
 * The game state: its shape, the running game, the event log, and saving to the browser.
 *
 * The whole state is plain JSON and is saved to localStorage after every simulated day.
 * Keep it that way: no functions, classes or circular references in the state.
 *
 * @typedef {Object} Employee           Also used for candidates on the job market.
 * @property {number} id
 * @property {string} name
 * @property {string} title
 * @property {Object<string, number>} skills   Level 0-10 for each skill in config.SKILLS.
 * @property {number} salary                   Per month. Also the one-off recruiting fee.
 * @property {number|null} assignedTo          Project id, or null when on the bench.
 * @property {boolean} [owner]                 True for the player's own character.
 * @property {'manager'|'hr'} [role]           Special staff. Consultants have no role field.
 * @property {number} [mgmt]                   Managers only: Management level.
 * @property {boolean} [managed]               True when a manager (not the player) made the assignment.
 *
 * @typedef {Object} Requirement
 * @property {string} skill
 * @property {number} need       Points required.
 * @property {number} done       Points delivered so far.
 * @property {number} minLevel   Minimum skill level needed to work on it.
 *
 * @typedef {Object} Offer       A client request on the board.
 * @property {number} id
 * @property {string} client
 * @property {string} title
 * @property {Requirement[]} reqs
 * @property {number} reward
 * @property {number} duration   Days to deliver once accepted.
 * @property {number} expires    Day the request disappears from the board.
 * @property {number} repGain    Reputation gained on delivery (and lost on failure).
 *
 * @typedef {Offer & {deadline: number}} Project   An accepted request.
 *
 * @typedef {Object} LogEntry
 * @property {number} day
 * @property {string} text
 * @property {''|'good'|'bad'|'warn'} cls
 *
 * @typedef {Object} State
 * @property {number} day
 * @property {number} money
 * @property {number} rep          Reputation.
 * @property {number} desks        Desks owned (the headcount limit).
 * @property {number} nextId       Next free id for people, offers and projects.
 * @property {Employee[]} employees  The owner is always first; desk i belongs to employees[i].
 * @property {Employee[]} candidates
 * @property {Offer[]} offers
 * @property {Project[]} projects    In the order they were accepted.
 * @property {LogEntry[]} log        Newest first.
 * @property {number} completed
 * @property {number} failed
 * @property {string} [strategy]     Manager strategy id (see management.STRATEGIES).
 */
(function (CFT) {
  'use strict';
  const { config } = CFT;

  CFT.store = {
    /** @type {State|null} The running game. Replaced when a new game starts. */
    state: null,

    /** An empty company. The owner, offers and candidates are added by simulation.newGame(). */
    create() {
      return {
        day: 1, money: config.STARTING_CASH, rep: 0, desks: config.STARTING_DESKS, nextId: 1,
        employees: [], candidates: [], offers: [], projects: [], log: [], completed: 0, failed: 0,
      };
    },

    /** Takes the next free id. */
    nextId(s) {
      return s.nextId++;
    },

    /** Adds a line to the event log shown under the office. `cls` colours it: 'good', 'bad' or 'warn'. */
    log(s, text, cls = '') {
      s.log.unshift({ day: s.day, text, cls });
      if (s.log.length > config.LOG_LIMIT) s.log.pop();
    },

    save(s, key = config.SAVE_KEY) {
      try { localStorage.setItem(key, JSON.stringify(s)); } catch (e) { /* storage blocked or full: play on unsaved */ }
    },

    /** @returns {State|null} */
    load(key = config.SAVE_KEY) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },

    clear(key = config.SAVE_KEY) {
      try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    },
  };
})(window.CFT);
