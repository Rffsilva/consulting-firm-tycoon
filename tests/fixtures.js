/**
 * Builders for small, predictable game states. Tests use these instead of simulation.newGame(), which is random.
 */
(function (CFT) {
  'use strict';
  const { store, staff } = CFT;

  window.fx = {
    /** An empty company, with the owner unless `withOwner` is false. Owner skills: Strategy 4, Analytics 2,
     *  Technology 1, Finance 3, Operations 3. */
    state({ withOwner = true } = {}) {
      const s = store.create();
      if (withOwner) s.employees.push(staff.roles.owner.create(s));
      return s;
    },

    /** Adds an employee. `skills` only needs the non-zero levels. */
    person(s, name, skills = {}, extra = {}) {
      const e = { id: store.nextId(s), name, title: 'Consultant', skills: { ...staff.emptySkills(), ...skills }, salary: 1000, assignedTo: null, ...extra };
      s.employees.push(e);
      return e;
    },

    manager(s, name, mgmt) {
      return fx.person(s, name, {}, { title: 'Manager', role: 'manager', mgmt });
    },

    candidate(s, name, skills = {}, extra = {}) {
      const c = { id: store.nextId(s), name, title: 'Consultant', skills: { ...staff.emptySkills(), ...skills }, salary: 1000, assignedTo: null, ...extra };
      s.candidates.push(c);
      return c;
    },

    /** Adds an accepted project. Each requirement defaults to done 0, minLevel 1. */
    project(s, title, reqs, { days = 20, reward = 5000 } = {}) {
      const p = {
        id: store.nextId(s), client: 'Test client', title, reward, duration: days, deadline: s.day + days, expires: s.day, repGain: 3,
        reqs: reqs.map(r => ({ done: 0, minLevel: 1, ...r })),
      };
      s.projects.push(p);
      return p;
    },

    /** Adds a client request to the board. */
    offer(s, title, reqs, { reward = 4000 } = {}) {
      const o = {
        id: store.nextId(s), client: 'Test client', title, reward, duration: 20, expires: s.day + 10, repGain: 3,
        reqs: reqs.map(r => ({ done: 0, minLevel: 1, ...r })),
      };
      s.offers.push(o);
      return o;
    },
  };
})(window.CFT);
