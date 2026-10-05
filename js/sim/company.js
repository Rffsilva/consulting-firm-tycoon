/**
 * Everything the player can do to the company: hire, fire, train, assign, expand the office, refresh candidates.
 *
 * These functions only change the state. They never touch the page: when an action can't be done they return
 * `{ ok: false, error }` and the UI decides how to tell the player (js/ui/actions.js).
 *
 * @typedef {{ok: true} | {ok: false, error: string|null}} Result   error is null when there is nothing to report.
 */
(function (CFT) {
  'use strict';
  const { config, util, store, staff } = CFT;
  const { money, sum } = util;

  const OK = { ok: true };
  const fail = (error = null) => ({ ok: false, error });
  const employee = (s, id) => s.employees.find(e => e.id === id);

  /** New batch for the job market: three consultants, one manager, and an HR specialist until you have one. */
  function refillCandidates(s) {
    s.candidates = [];
    for (let i = 0; i < 3; i++) s.candidates.push(staff.roles.consultant.createCandidate(s));
    s.candidates.push(staff.roles.manager.createCandidate(s));
    if (!s.employees.some(e => staff.is(e, 'hr'))) s.candidates[0] = staff.roles.hr.createCandidate(s);
  }

  /** @returns {Result} */
  function refreshCandidates(s) {
    if (s.money < config.CANDIDATE_REFRESH_COST) return fail();
    s.money -= config.CANDIDATE_REFRESH_COST;
    refillCandidates(s);
    return OK;
  }

  /** Hiring costs one month's salary as a recruiting fee. @returns {Result} */
  function hire(s, candidateId) {
    const c = s.candidates.find(x => x.id === candidateId);
    if (!c) return fail();
    if (s.employees.length >= s.desks) return fail('No free desks. Expand the office.');
    if (s.money < c.salary) return fail('Not enough cash for the recruiting fee.');
    s.money -= c.salary;
    s.candidates = s.candidates.filter(x => x !== c);
    s.employees.push(c);
    store.log(s, `Hired ${c.name} (${c.title}) for ${money(c.salary)}/month.`, 'good');
    return OK;
  }

  /** @returns {Result} */
  function fire(s, employeeId) {
    const e = employee(s, employeeId);
    if (!e || e.owner) return fail();
    s.employees = s.employees.filter(x => x !== e);
    store.log(s, `Fired ${e.name}.`, 'warn');
    return OK;
  }

  /** One level of training in `skill` (a normal skill or 'Management'). Raises the salary and remembers the skill. @returns {Result} */
  function train(s, employeeId, skill) {
    const e = employee(s, employeeId);
    if (!e || !skill || staff.skillLevel(e, skill) >= config.MAX_SKILL_LEVEL) return fail();
    const cost = staff.trainCost(e, skill);
    if (s.money < cost) return fail('Not enough cash.');
    s.money -= cost;
    if (skill === staff.MANAGEMENT) e.mgmt++; else e.skills[skill]++;
    if (!e.owner) e.salary += staff.salaryRaise(skill);
    e.lastTrained = skill; // the card's training dropdown starts on this next time
    store.log(s, `${e.name} trained ${skill} to level ${staff.skillLevel(e, skill)} (${money(cost)}).`);
    return OK;
  }

  /** Puts someone on a project (or the bench, with null). Managers never move people assigned this way. */
  function assign(s, employeeId, projectId) {
    const e = employee(s, employeeId);
    if (!e) return fail();
    e.assignedTo = projectId;
    e.managed = false;
    return OK;
  }

  /** @returns {Result} */
  function expandOffice(s) {
    if (s.desks >= config.MAX_DESKS) return fail();
    if (s.money < config.DESK_COST) return fail('Not enough cash.');
    s.money -= config.DESK_COST;
    s.desks = Math.min(config.MAX_DESKS, s.desks + config.DESKS_PER_EXPANSION);
    store.log(s, `Office expanded to ${s.desks} desks.`, 'good');
    return OK;
  }

  /** What the company pays at the end of every month. */
  function monthlyCosts(s) {
    const wages = sum(s.employees, e => e.salary);
    const rent = s.desks * config.RENT_PER_DESK;
    return { wages, rent, total: wages + rent };
  }

  CFT.company = { refillCandidates, refreshCandidates, hire, fire, train, assign, expandOffice, monthlyCosts };
})(window.CFT);
