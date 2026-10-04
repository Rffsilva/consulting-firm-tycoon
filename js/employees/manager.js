/**
 * Managers: don't do project work themselves. Every morning they put idle consultants on projects, choosing
 * projects by the company strategy (set in the boardroom). Each manager handles
 * config.MANAGER_BASE_CAPACITY + their Management level people; capacity adds up across managers.
 * People the player assigns by hand are never touched.
 */
(function (CFT) {
  'use strict';
  const { config, util, store, projects, staff } = CFT;
  const { rnd, pick, sum } = util;

  const STRATEGIES = {
    deadline: { name: 'Protect deadlines', desc: 'Help the project closest to missing its deadline first. Fewest failures, but big payouts may wait.' },
    revenue: { name: 'Maximise revenue', desc: 'Put people on the highest-paying project first. Cheaper projects can slip past their deadline.' },
    fifo: { name: 'First come, first served', desc: 'Finish projects in the order you accepted them.' },
  };
  const DEFAULT_STRATEGY = 'deadline';

  const isManager = e => staff.is(e, 'manager');
  const strategyOf = s => s.strategy || DEFAULT_STRATEGY;
  const capacityOf = m => config.MANAGER_BASE_CAPACITY + m.mgmt;
  const capacity = s => sum(s.employees.filter(isManager), capacityOf);
  const managedCount = s => s.employees.filter(e => e.managed && e.assignedTo !== null).length;

  function setStrategy(s, id) {
    s.strategy = id;
    store.log(s, `Company strategy set to "${STRATEGIES[id].name}".`);
  }

  /**
   * Days of margin before a project's deadline. A project nobody can work on yet is estimated as if `e` alone took
   * it on, so tight deadlines still rank as more urgent than relaxed ones.
   */
  function slack(s, p, e) {
    let eta = projects.eta(p, projects.teamOf(s, p));
    if (eta === Infinity) {
      const rate = Math.max(1, ...projects.openReqs(p).filter(r => projects.qualifies(e, r)).map(r => e.skills[r.skill]));
      eta = Math.ceil(projects.remaining(p) / rate);
    }
    return (p.deadline - s.day) - eta;
  }

  /** Projects in the order the strategy wants them staffed, from the point of view of person `e`. */
  function ranked(s, e) {
    const cmp = (a, b) => (a === b ? 0 : a < b ? -1 : 1);
    const list = [...s.projects]; // already in the order they were accepted (first come, first served)
    const strat = strategyOf(s);
    if (strat === 'revenue') list.sort((a, b) => b.reward - a.reward || cmp(slack(s, a, e), slack(s, b, e)));
    else if (strat === 'deadline') list.sort((a, b) => cmp(slack(s, a, e), slack(s, b, e)));
    return list;
  }

  /** Runs every morning: places idle staff, and moves managed staff when the strategy says so. */
  function autoAssign(s) {
    const mgr = s.employees.find(isManager);
    if (!mgr || !s.projects.length) return;
    const strat = strategyOf(s);
    const cap = capacity(s);
    let used = managedCount(s);

    for (const e of s.employees.filter(x => staff.roleOf(x).managedByManagers)) {
      const current = projects.find(s, e.assignedTo);
      const wasManaged = !!(e.managed && current);
      if (e.assignedTo !== null && !wasManaged) continue; // the player assigned this person: hands off
      if (!wasManaged && used >= cap) continue;

      const best = ranked(s, e).find(p => projects.canHelp(e, p));
      if (wasManaged) {
        if (!best) { e.assignedTo = null; e.managed = false; used--; continue; }
        if (best.id === current.id) continue;
        // Moving someone who is busy: always for the stable rankings; under "deadlines" only to rescue a late project.
        if (projects.canHelp(e, current) && strat === 'deadline' && !(slack(s, best, e) < 0 && slack(s, current, e) > 2)) continue;
      } else if (!best) {
        continue;
      }
      e.assignedTo = best.id;
      e.managed = true;
      if (!wasManaged) used++;
      store.log(s, `${mgr.name} put ${e.name} on "${best.title}".`);
    }
  }

  staff.registerRole({
    id: 'manager',
    worksOnProjects: false,
    managedByManagers: false,
    extraSkills: [staff.MANAGEMENT],

    createCandidate(s) {
      const mgmt = rnd(2, Math.max(3, staff.marketSkillCap(s) - 1));
      const skills = staff.emptySkills();
      const sideSkill = rnd(1, 3);
      skills[pick(config.SKILLS)] = sideSkill;
      return {
        id: store.nextId(s), name: staff.randomName(), title: 'Manager', role: 'manager', mgmt, skills,
        salary: staff.roundSalary(800 + mgmt * 230 + sideSkill * 60 + rnd(-100, 100)), assignedTo: null,
      };
    },

    badges: e => [{ label: `Management ${e.mgmt} · handles ${capacityOf(e)} staff`, hint: 'Assigns idle staff to projects' }],
    cardStatus: (e, s) => `Managing ${managedCount(s)}/${capacity(s)} staff (all managers combined)`,

    look(e) {
      return { ...staff.baseLook(e), shirt: '#5c677d', tie: '#fab005', glasses: true, style: (staff.lookSeed(e) >> 8) % 3 };
    },
    isBusy: (e, s) => s.projects.length > 0,

    onDayStart: autoAssign,
  });

  CFT.management = { STRATEGIES, DEFAULT_STRATEGY, strategyOf, setStrategy, capacity, managedCount, autoAssign };
})(window.CFT);
