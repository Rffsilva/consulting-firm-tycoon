/**
 * Client requests (offers) and accepted projects: generating them, accepting them, and estimating progress.
 *
 * How work is done (the same rule is used everywhere, so estimates match the simulation):
 * each day, every person on a project works on the open requirement they are best at, among those whose
 * minimum level they meet, and adds points equal to their level in that skill.
 */
(function (CFT) {
  'use strict';
  const { config, content, util, store } = CFT;
  const { rnd, pick, sum, money } = util;

  // ---------- Requirements ----------

  /** Requirements that still need points. */
  const openReqs = p => p.reqs.filter(r => r.done < r.need);

  /** True when `e` is skilled enough to work on requirement `r`. */
  const qualifies = (e, r) => e.skills[r.skill] >= r.minLevel;

  /** The open requirement `e` would work on (the one they are best at; the first on ties), or null. */
  function taskFor(e, p) {
    let best = null;
    for (const r of openReqs(p)) {
      if (qualifies(e, r) && (!best || e.skills[r.skill] > e.skills[best.skill])) best = r;
    }
    return best;
  }

  /** True when `e` can contribute to project `p` right now. */
  const canHelp = (e, p) => !!p && taskFor(e, p) !== null;

  /** Points still missing across all requirements. */
  const remaining = p => sum(p.reqs, r => r.need - r.done);

  /** Overall progress of a project. */
  function progress(p) {
    const done = sum(p.reqs, r => r.done), need = sum(p.reqs, r => r.need);
    return { done, need, pct: Math.round(done / need * 100) };
  }

  // ---------- Lookups ----------

  const find = (s, id) => s.projects.find(p => p.id === id);
  const teamOf = (s, p) => s.employees.filter(e => e.assignedTo === p.id);

  /**
   * Projected days to finish with this team, or Infinity if some open requirement has nobody working on it.
   * Uses the same allocation rule as the daily simulation.
   */
  function eta(p, team) {
    const rate = new Map();
    for (const e of team) {
      const r = taskFor(e, p);
      if (r) rate.set(r, (rate.get(r) || 0) + e.skills[r.skill]);
    }
    let days = 0;
    for (const r of openReqs(p)) {
      const perDay = rate.get(r) || 0;
      if (!perDay) return Infinity;
      days = Math.max(days, Math.ceil((r.need - r.done) / perDay));
    }
    return days;
  }

  // ---------- Generating client requests ----------

  /** Reputation makes requests bigger, need more skills and higher minimum levels. */
  const minLevelBase = s => 1 + Math.floor(s.rep / 12);

  /** The highest minimum level a request can ask for at the current reputation. */
  const typicalMaxLevel = s => Math.min(9, minLevelBase(s) + 2);

  function makeOffer(s) {
    const nSkills = rnd(1, Math.min(3, 1 + Math.floor(s.rep / 15) + 1));
    const chosen = [...config.SKILLS].sort(() => Math.random() - 0.5).slice(0, nSkills);
    const reqs = chosen.map(skill => ({
      skill,
      need: rnd(20, 40) + Math.floor(s.rep * 1.2),
      done: 0,
      minLevel: Math.min(9, minLevelBase(s) + rnd(0, 2)),
    }));
    const points = sum(reqs, r => r.need);
    return {
      id: store.nextId(s),
      client: pick(content.CLIENTS),
      title: pick(content.TASKS[chosen[0]]),
      reqs,
      reward: Math.round(points * rnd(80, 110) / 10) * 10,
      duration: Math.round(points / (nSkills * 4.5)) + rnd(8, 16),
      expires: s.day + config.OFFER_LIFETIME,
      repGain: 2 + Math.floor(points / 50),
    };
  }

  function refillOffers(s) {
    while (s.offers.length < config.MAX_OFFERS) s.offers.push(makeOffer(s));
  }

  // ---------- Accepting and closing ----------

  /** Moves a request from the board to the active projects. Returns the project, or null. */
  function accept(s, offerId) {
    const i = s.offers.findIndex(o => o.id === offerId);
    if (i < 0) return null;
    const p = s.offers.splice(i, 1)[0];
    p.deadline = s.day + p.duration;
    s.projects.push(p);
    store.log(s, `Accepted "${p.title}" for ${p.client}. Deadline day ${p.deadline}.`);
    return p;
  }

  /** Removes a finished or failed project and sends its people back to the bench. */
  function close(s, p) {
    s.projects = s.projects.filter(x => x !== p);
    for (const e of s.employees) {
      if (e.assignedTo === p.id) { e.assignedTo = null; e.managed = false; }
    }
  }

  /** Pays out delivered projects and penalises missed deadlines. Called once per day. */
  function settle(s) {
    for (const p of [...s.projects]) {
      if (p.reqs.every(r => r.done >= r.need)) {
        const daysEarly = p.deadline - s.day;
        const bonus = daysEarly > 0 ? Math.round(p.reward * Math.min(config.EARLY_BONUS_MAX, daysEarly * config.EARLY_BONUS_PER_DAY)) : 0;
        s.money += p.reward + bonus;
        s.rep += p.repGain;
        s.completed++;
        store.log(s, `Delivered "${p.title}" to ${p.client}: +${money(p.reward + bonus)}${bonus ? ' (early bonus)' : ''}, +${p.repGain} rep.`, 'good');
        close(s, p);
      } else if (s.day > p.deadline) {
        const fine = Math.round(p.reward * config.LATE_FINE);
        s.money -= fine;
        s.rep = Math.max(0, s.rep - p.repGain);
        s.failed++;
        store.log(s, `Missed deadline on "${p.title}" (${p.client}). Fine ${money(fine)}, -${p.repGain} rep.`, 'bad');
        close(s, p);
      }
    }
  }

  CFT.projects = {
    openReqs, qualifies, taskFor, canHelp, remaining, progress,
    find, teamOf, eta,
    typicalMaxLevel, makeOffer, refillOffers,
    accept, close, settle,
  };
})(window.CFT);
