/**
 * Starting a new game, and simulating one day. Pure game logic: no page or timer code here (see js/ui/clock.js).
 *
 * A day, in order:
 *   1. role behaviour (managers assign idle staff)
 *   2. work: everyone on a project adds points to the requirement they are best at
 *   3. projects are delivered (reward, reputation) or failed (fine)
 *   4. month end: wages and rent
 *   5. the market moves: old requests expire, new requests and candidates appear
 */
(function (CFT) {
  'use strict';
  const { config, util, store, projects, staff, company } = CFT;
  const { money } = util;

  function newGame() {
    const s = store.create();
    s.employees.push(staff.roles.owner.create(s));
    projects.refillOffers(s);
    company.refillCandidates(s);
    store.log(s, 'You founded your consulting firm. Accept a request, then assign people to it.');
    return s;
  }

  /** Runs each role's daily behaviour once if anyone in the company has that role. */
  function runRoleBehaviour(s) {
    for (const role of Object.values(staff.roles)) {
      if (role.onDayStart && s.employees.some(e => staff.roleOf(e) === role)) role.onDayStart(s);
    }
  }

  function doWork(s) {
    for (const p of s.projects) {
      for (const e of projects.teamOf(s, p)) {
        if (!staff.roleOf(e).worksOnProjects) continue;
        const r = projects.taskFor(e, p);
        if (r) r.done = Math.min(r.need, r.done + e.skills[r.skill]);
      }
    }
  }

  function payMonthlyCosts(s) {
    if (s.day % config.DAYS_PER_MONTH !== 0) return;
    const { wages, rent, total } = company.monthlyCosts(s);
    s.money -= total;
    store.log(s, `Month end: wages ${money(wages)}, rent ${money(rent)}.`, 'warn');
  }

  function moveMarket(s) {
    s.offers = s.offers.filter(o => o.expires > s.day);
    if (s.day % config.OFFER_REFILL_DAYS === 0) projects.refillOffers(s);
    if (s.day % config.CANDIDATE_REFRESH_DAYS === 0) company.refillCandidates(s);
  }

  /** Simulates one day. @returns {{bankrupt: boolean}} */
  function advanceDay(s) {
    s.day++;
    runRoleBehaviour(s);
    doWork(s);
    projects.settle(s);
    payMonthlyCosts(s);
    moveMarket(s);
    return { bankrupt: s.money < config.BANKRUPTCY_LIMIT };
  }

  CFT.simulation = { newGame, advanceDay };
})(window.CFT);
