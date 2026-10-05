/**
 * HR specialist: doesn't do project work. Advises the player on who to train or hire.
 *
 * - With accepted projects: lists only those that can't be completed, either because nobody in the company has a
 *   required skill level ("blocked"), or because even everyone qualified can't finish before the deadline ("late").
 * - With no accepted projects: lists skills the company lacks, judged by the open client requests and by what
 *   clients typically ask for at the current reputation.
 *
 * Idle people (on the bench, or on a project they can't contribute to) are the preferred people to train: they cost no
 * output while they learn, and the advice says so. The panel also lists who is idle.
 *
 * With accepted projects, idle people also get their own entries: put them on a project they can already help with,
 * or (if there is none) train them to join one where they would save days.
 *
 * The advice is plain data (see AdviceItem); js/ui/panels/hr.js turns it into HTML. Text may use two tiny bits of
 * markup that the UI understands: **bold** and [[cls:text]] for a coloured span (cls = good / warn / bad).
 *
 * @typedef {{kind: 'train', employeeId: number, skill: string, primary: boolean}
 *         | {kind: 'hire', candidateId: number, primary: boolean}
 *         | {kind: 'assign', employeeId: number, projectId: number, primary: boolean}} AdviceAction
 * @typedef {{label: string, lines: string[], actions: AdviceAction[]}} AdviceRow
 * @typedef {Object} AdviceItem
 * @property {'blocked'|'late'|'bench'|'requests'|'market'} group
 * @property {string} title
 * @property {string} tag        Short label, e.g. "CAN'T BE DONE".
 * @property {'bad'|'ok'} severity
 * @property {string} sub        One line under the title.
 * @property {AdviceRow[]} rows
 * @property {number} order      Sort: group order first...
 * @property {number} key        ...then this, ascending.
 */
(function (CFT) {
  'use strict';
  const { config, util, store, projects, staff } = CFT;
  const { rnd, pick, money } = util;

  const isHR = e => staff.is(e, 'hr');
  const hasHR = s => s.employees.some(isHR);
  const isConsultant = c => staff.is(c, 'consultant');
  const HORIZON = config.HR_COST_HORIZON_MONTHS;

  /** Idle: not working on anything useful right now (on the bench, or on a project they can't help with). */
  const isIdle = (s, e) => !projects.canHelp(e, projects.find(s, e.assignedTo));
  const idleWorkers = s => staff.projectWorkers(s).filter(e => isIdle(s, e));
  const busyFactor = (s, e) => (isIdle(s, e) ? 1 : config.HR_BUSY_TRAINEE_PENALTY);

  const noFreeDesk = s => (s.employees.length >= s.desks ? ' [[warn:No free desk: expand the office first.]]' : '');
  const nextCandidateDay = s => s.day + config.CANDIDATE_REFRESH_DAYS - (s.day % config.CANDIDATE_REFRESH_DAYS);

  /**
   * Cheapest way to get someone with `skill` at `minLevel`: train an existing project worker (any number of levels),
   * or hire a listed consultant. Compared over HR_COST_HORIZON_MONTHS of salary. Training a busy person counts for
   * more (HR_BUSY_TRAINEE_PENALTY), so an idle person wins unless a busy one is much closer.
   */
  function fixSkillGap(s, skill, minLevel, workers) {
    let train = null, hire = null;
    for (const e of workers) {
      const gap = minLevel - e.skills[skill];
      if (gap < 1 || e.skills[skill] + gap > config.MAX_SKILL_LEVEL) continue;
      const cost = staff.trainPlanCost(e, skill, gap);
      const total = cost + (e.owner ? 0 : gap * config.TRAIN_SALARY_RAISE * HORIZON); // the owner has no salary
      const weighed = total * busyFactor(s, e);
      if (!train || weighed < train.weighed) train = { e, gap, cost, total, weighed, skill };
    }
    for (const c of s.candidates) {
      if (!isConsultant(c) || c.skills[skill] < minLevel) continue;
      const total = c.salary * (1 + HORIZON);
      if (!hire || total < hire.total) hire = { c, total, skill };
    }
    const pickOption = train && hire ? (train.weighed <= hire.total ? 'train' : 'hire') : train ? 'train' : hire ? 'hire' : null;
    return { train, hire, pick: pickOption };
  }

  /** Sentence saying the trainee has nothing to do right now. `title`: the project this would start, if any. */
  const idleNote = (s, e, title) => (isIdle(s, e) && !e.owner
    ? ` ${e.name} is idle, so this puts them to work${title ? ` on "${title}"` : ''}.` : '');

  /** Advice lines and actions for a skill gap. Training is listed first unless hiring is cheaper. */
  function gapAdvice(s, fix, title) {
    const lines = [], actions = [];
    for (const kind of fix.pick === 'hire' ? ['hire', 'train'] : ['train', 'hire']) {
      if (kind === 'train' && fix.train) {
        const { e, skill, gap, cost } = fix.train, lvl = e.skills[skill];
        lines.push(`**Train** ${e.name} in ${skill} (${lvl} → ${lvl + gap}): ${money(cost)} in total` +
          `${e.owner ? '' : `, +${money(config.TRAIN_SALARY_RAISE * gap)}/mo`}${gap > 1 ? `, ${gap} sessions, one level at a time` : ''}.` +
          `${fix.pick === 'hire' ? '' : ' [[good:Recommended]]'}${idleNote(s, e, title)}`);
        actions.push({ kind: 'train', employeeId: e.id, skill, primary: fix.pick === 'train' });
      }
      if (kind === 'hire' && fix.hire) {
        const { c, skill } = fix.hire;
        lines.push(`**Or hire** ${c.name} (${skill} ${c.skills[skill]}): ${money(c.salary)} fee + ${money(c.salary)}/mo.` +
          `${fix.pick === 'hire' ? ' [[good:Recommended]]' : ''}${noFreeDesk(s)}`);
        actions.push({ kind: 'hire', candidateId: c.id, primary: fix.pick === 'hire' });
      }
    }
    if (!fix.pick) {
      lines.push(`Nobody can be trained up to it and no candidate qualifies. Refresh candidates (${money(config.CANDIDATE_REFRESH_COST)}) ` +
        `or wait for the next batch (day ${nextCandidateDay(s)}).`);
    }
    return { lines, actions };
  }

  /**
   * The single training plan or hire that saves the most days per dollar on a project that is too slow. Someone
   * already on the team gains one level in a requirement; an idle person outside the team trains up to the
   * requirement's minimum level to join it.
   */
  function trainingOption(s, p, team, eta, workers, maxSteps = Infinity) {
    let train = null;
    for (const m of workers) {
      const onTeam = team.includes(m);
      if (!onTeam && !isIdle(s, m)) continue; // don't pull people off other work
      for (const r of projects.openReqs(p)) {
        const level = m.skills[r.skill];
        const steps = projects.qualifies(m, r) ? 1 : r.minLevel - level;
        if (level + steps > config.MAX_SKILL_LEVEL || steps > maxSteps) continue;
        const better = { ...m, skills: { ...m.skills, [r.skill]: level + steps } };
        const after = onTeam ? team.map(x => (x === m ? better : x)) : team.concat([better]);
        const saved = eta - projects.eta(p, after);
        if (saved <= 0) continue;
        const cost = staff.trainPlanCost(m, r.skill, steps);
        const score = saved / ((cost + (m.owner ? 0 : config.TRAIN_SALARY_RAISE * steps * HORIZON)) * busyFactor(s, m));
        if (!train || score > train.score) train = { e: m, skill: r.skill, steps, saved, cost, score };
      }
    }
    return train;
  }

  /** The hire that saves the most days per dollar on a project that is too slow. */
  function hireOption(s, p, team, eta) {
    let hire = null;
    for (const c of s.candidates) {
      if (!isConsultant(c)) continue;
      const saved = eta - projects.eta(p, team.concat([c]));
      if (saved <= 0) continue;
      const score = saved / (c.salary * (1 + HORIZON));
      if (!hire || score > hire.score) hire = { c, saved, score };
    }
    return hire;
  }

  /** Idle people who could be put to work: assign them, or train them so they can join a project. */
  function adviseOnBench(s, workers, items) {
    const trainedAlready = new Set();
    for (const item of items) for (const r of item.rows) for (const a of r.actions) if (a.kind === 'train') trainedAlready.add(a.employeeId);
    const margin = p => {
      const e = projects.eta(p, projects.teamOf(s, p));
      return e === Infinity ? -Infinity : (p.deadline - s.day) - e;
    };
    const out = [];
    for (const w of workers.filter(x => !x.owner && isIdle(s, x))) { // the player directs themselves
      const sub = `Costs ${money(w.salary || 0)}/mo while waiting for work.`;
      const help = s.projects.filter(p => projects.canHelp(w, p)).sort((a, b) => margin(a) - margin(b))[0];
      if (help) {
        out.push({
          group: 'bench', order: 2, key: out.length, title: `${w.name} is idle`, tag: 'IDLE', severity: 'ok', sub,
          rows: [{
            label: `${w.name} can already work on "${help.title}" (${help.client}).`,
            lines: [`**Assign** ${w.name} to it: ${money(help.reward)} on the line, ${Math.max(0, help.deadline - s.day)} days left. Managers do this on their own, within their capacity.`],
            actions: [{ kind: 'assign', employeeId: w.id, projectId: help.id, primary: true }],
          }],
        });
        continue;
      }
      if (trainedAlready.has(w.id)) continue;
      let best = null;
      for (const p of s.projects) {
        const team = workers.filter(x => projects.canHelp(x, p));
        const eta = projects.eta(p, team);
        if (eta === Infinity) continue; // blocked: covered above
        const train = trainingOption(s, p, team, eta, [w], config.HR_IDLE_TRAIN_MAX_STEPS);
        if (train && (!best || train.score > best.train.score)) best = { p, train };
      }
      if (!best) continue;
      const { p, train } = best, l = w.skills[train.skill];
      out.push({
        group: 'bench', order: 2, key: out.length, title: `${w.name} is idle`, tag: 'IDLE', severity: 'ok', sub,
        rows: [{
          label: `${w.name} can't work on any accepted project yet, but could join "${p.title}" (${p.client}).`,
          lines: [`**Train** ${w.name} in ${train.skill} (${l} → ${l + train.steps}) for ${money(train.cost)}: saves ~${train.saved} day(s) on "${p.title}"` +
            `${train.steps > 1 ? `, ${train.steps} sessions, one level at a time` : ''}.`],
          actions: [{ kind: 'train', employeeId: w.id, skill: train.skill, primary: true }],
        }],
      });
    }
    return out;
  }

  /** Advice while there are accepted projects. */
  function adviseOnProjects(s) {
    const workers = staff.projectWorkers(s);
    const best = skill => Math.max(0, ...workers.map(e => e.skills[skill]));
    const items = [];

    for (const p of s.projects) {
      const left = p.deadline - s.day;
      const sub = `${p.client} · ${money(p.reward)} · ${Math.max(0, left)} days left`;

      // Blocked: some requirement that nobody in the company can work on.
      const missing = projects.openReqs(p).filter(r => !workers.some(e => projects.qualifies(e, r)));
      if (missing.length) {
        items.push({
          group: 'blocked', order: 0, key: left, title: p.title, tag: "CAN'T BE DONE", severity: 'bad', sub,
          rows: missing.map(r => ({
            label: `Needs **${r.skill} ${r.minLevel}+** (${r.need - r.done} points to go). Your best is ${best(r.skill)}.`,
            ...gapAdvice(s, fixSkillGap(s, r.skill, r.minLevel, workers), p.title),
          })),
        });
        continue;
      }

      // Late: everyone needed exists, but even all of them together can't make the deadline.
      const team = workers.filter(e => projects.canHelp(e, p));
      const eta = projects.eta(p, team);
      if (eta <= left) continue;
      const train = trainingOption(s, p, team, eta, workers), hire = hireOption(s, p, team, eta);
      const hireFirst = hire && (!train || hire.score > train.score);
      const enough = saved => (eta - saved <= left ? ', enough to make the deadline' : '');
      const lines = [], actions = [];
      const addTrain = () => {
        const l = train.e.skills[train.skill];
        lines.push(`**Train** ${train.e.name} in ${train.skill} (${l} → ${l + train.steps}) for ${money(train.cost)}: saves ~${train.saved} day(s)${enough(train.saved)}` +
          `${train.steps > 1 ? `, ${train.steps} sessions, one level at a time` : ''}.${idleNote(s, train.e, p.title)}`);
        actions.push({ kind: 'train', employeeId: train.e.id, skill: train.skill, primary: !hireFirst });
      };
      const addHire = () => {
        lines.push(`**Or hire** ${hire.c.name} (${hire.c.title}, ${money(hire.c.salary)}/mo): saves ~${hire.saved} day(s)${enough(hire.saved)}.${noFreeDesk(s)}`);
        actions.push({ kind: 'hire', candidateId: hire.c.id, primary: hireFirst });
      };
      if (hireFirst) { addHire(); if (train) addTrain(); } else { if (train) addTrain(); if (hire) addHire(); }
      if (!train && !hire) lines.push('No single training session or hire closes the gap. Several upgrades are needed, or the deadline will be missed.');
      items.push({
        group: 'late', order: 1, key: -(eta - left), title: p.title, tag: 'TOO SLOW', severity: 'bad', sub,
        rows: [{ label: `Even with everyone who can work on it, it needs ~**${eta} days** and only ${left} remain.`, lines, actions }],
      });
    }
    return items.concat(adviseOnBench(s, workers, items));
  }

  /** Advice while there are no accepted projects: where the company lacks skills. */
  function adviseOnSkills(s) {
    const workers = staff.projectWorkers(s);
    const best = skill => Math.max(0, ...workers.map(e => e.skills[skill]));
    const items = [];

    // a) Skills that open client requests need and nobody has. Target the lowest missing level per skill, and only
    //    count the requests that reaching that level would actually open up.
    const needs = new Map(); // skill -> unmet requirements
    for (const o of s.offers) {
      const unmet = o.reqs.filter(r => best(r.skill) < r.minLevel);
      for (const r of unmet) {
        needs.set(r.skill, (needs.get(r.skill) || []).concat([{ minLevel: r.minLevel, reward: o.reward, alone: unmet.length === 1 }]));
      }
    }
    const demand = [];
    for (const [skill, list] of needs) {
      const target = Math.min(...list.map(x => x.minLevel));
      const opened = list.filter(x => x.minLevel <= target);
      const reward = opened.reduce((a, x) => a + x.reward, 0);
      const unlock = opened.filter(x => x.alone).reduce((a, x) => a + x.reward, 0);
      demand.push({ skill, target, n: opened.length, reward, unlock });
    }
    demand.sort((a, b) => b.unlock - a.unlock || b.reward - a.reward);
    for (const d of demand.slice(0, 3)) {
      items.push({
        group: 'requests', order: 0, key: -d.reward, title: `${d.skill} ${d.target}+`, tag: 'LACKING', severity: 'bad',
        sub: `Your best ${d.skill} is ${best(d.skill)}.`,
        rows: [{
          label: `${d.n} client request${d.n > 1 ? 's' : ''} would open up, worth ${money(d.reward)}` +
            `${d.unlock && d.unlock < d.reward ? `; ${money(d.unlock)} of that needs nothing else` : ''}.`,
          ...gapAdvice(s, fixSkillGap(s, d.skill, d.target, workers)),
        }],
      });
    }

    // b) Skills where the team is behind what clients typically ask for at this reputation.
    const market = projects.typicalMaxLevel(s);
    config.SKILLS
      .filter(skill => !needs.has(skill) && best(skill) < market)
      .sort((a, b) => best(a) - best(b))
      .slice(0, Math.max(1, 3 - items.length))
      .forEach(skill => items.push({
        group: 'market', order: 1, key: best(skill), title: `${skill} ${market}`, tag: 'WEAK SPOT', severity: 'ok',
        sub: `Your best ${skill} is ${best(skill)}.`,
        rows: [{ label: `Clients at your reputation can ask for ${skill} up to level ${market}.`, ...gapAdvice(s, fixSkillGap(s, skill, market, workers)) }],
      }));
    return items;
  }

  /** @returns {{mode: 'projects'|'lacking', items: AdviceItem[]}} */
  function advise(s) {
    const mode = s.projects.length ? 'projects' : 'lacking';
    const items = mode === 'projects' ? adviseOnProjects(s) : adviseOnSkills(s);
    items.sort((a, b) => a.order - b.order || a.key - b.key);
    return { mode, items };
  }

  // Number of problem projects (not idle-people tips), for the "!" over the HR desk. Recomputed at most twice a second (it runs every frame).
  let cached = { at: 0, value: 0 };
  function urgentCount(s) {
    const t = Date.now();
    if (t - cached.at > 500) {
      const result = hasHR(s) ? advise(s) : null;
      cached = { at: t, value: result && result.mode === 'projects' ? result.items.filter(i => i.severity === 'bad').length : 0 };
    }
    return cached.value;
  }

  staff.registerRole({
    id: 'hr',
    worksOnProjects: false,
    managedByManagers: false,

    createCandidate(s) {
      const skills = staff.emptySkills();
      skills[pick(config.SKILLS)] = rnd(1, 3);
      return {
        id: store.nextId(s), name: staff.randomName(), title: 'HR Specialist', role: 'hr', skills,
        salary: staff.roundSalary(1000 + rnd(0, 300)), assignedTo: null,
      };
    },

    badges: () => [{ label: 'HR · advises on hiring and training', hint: 'Recommends who to hire or train' }],
    cardStatus: () => 'Reviewing the company (see the HR window)',

    look: e => ({ ...staff.baseLook(e), shirt: '#e64980', glasses: false, style: 1 }),
    isBusy: () => true,
    deskBubble: (e, s) => (urgentCount(s) > 0 ? { text: '!', color: '#e8590c', bob: true } : null),
    deskWindow: 'hr',
    deskLabel: e => `${e.name} · HR advice`,
  });

  CFT.hrAdvisor = { hasHR, advise, urgentCount, idleWorkers };
})(window.CFT);
