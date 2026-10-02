'use strict';
// HR advisor. With accepted projects it explains which of them can't be completed and what to train (or hire) to fix that.
// With no accepted projects it points at skills the company is lacking, judged by the open client requests and the market.
// Loaded before game.js; everything here runs on demand, after game.js has defined the shared helpers.

const isHR = e => e.role === 'hr';
let hrAlerts = 0; // projects that can't be completed, shown as a bubble over the HR desk in the office

const MONTHS_HORIZON = 3; // hire-vs-train costs are compared over this many months of salary

function trainPlanCost(e, skill, steps) {
  let c = 0;
  for (let i = 0; i < steps; i++) c += 400 + (e.skills[skill] + i) * 350;
  return c;
}

// Cheapest way to get someone with `skill` at `minLevel`: train a current employee or hire a listed candidate.
function fixSkillGap(skill, minLevel, people) {
  let train = null, hire = null;
  for (const e of people) {
    const gap = minLevel - e.skills[skill];
    if (gap < 1 || e.skills[skill] + gap > 10) continue;
    const cost = trainPlanCost(e, skill, gap), cost3 = cost + (e.owner ? 0 : gap * 60 * MONTHS_HORIZON); // the owner has no salary
    if (!train || cost3 < train.cost3) train = { e, gap, cost, cost3, skill };
  }
  for (const c of S.candidates) {
    if (c.role || c.skills[skill] < minLevel) continue;
    const cost3 = c.salary * (1 + MONTHS_HORIZON);
    if (!hire || cost3 < hire.cost3) hire = { c, cost3, skill };
  }
  const pick = train && hire ? (train.cost3 <= hire.cost3 ? 'train' : 'hire') : train ? 'train' : hire ? 'hire' : null;
  return { train, hire, pick };
}

const trainBtn = (e, skill, primary) => `<button class="small ${primary ? 'primary' : ''}" onclick="trainSkill(${e.id},'${skill}')" ${S.money < trainCost(e, skill) ? 'disabled' : ''}>Train ${esc(e.name)} (${money(trainCost(e, skill))})</button>`;
const hireBtn = (c, primary) => `<button class="small ${primary ? 'primary' : ''}" onclick="hire(${c.id})" ${S.employees.length >= S.desks || S.money < c.salary ? 'disabled' : ''}>Hire ${esc(c.name)} (fee ${money(c.salary)})</button>`;
const noDesk = () => (S.employees.length >= S.desks ? ' <span class="warn">No free desk: expand the office first.</span>' : '');

// Turns a fixSkillGap result into advice lines and action buttons. Training is listed first unless hiring is clearly cheaper.
function gapAdvice(fix) {
  const lines = [], actions = [];
  for (const k of fix.pick === 'hire' ? ['hire', 'train'] : ['train', 'hire']) {
    if (k === 'train' && fix.train) {
      const t = fix.train, lvl = t.e.skills[t.skill];
      lines.push(`<b>Train</b> ${esc(t.e.name)} in ${t.skill} (${lvl} → ${lvl + t.gap}): ${money(t.cost)} in total${t.e.owner ? '' : `, +${money(60 * t.gap)}/mo`}${t.gap > 1 ? `, ${t.gap} sessions, one level at a time` : ''}.${fix.pick === 'hire' ? '' : ' <span class="good">Recommended</span>'}`);
      actions.push(trainBtn(t.e, t.skill, fix.pick === 'train'));
    }
    if (k === 'hire' && fix.hire) {
      const h = fix.hire;
      lines.push(`<b>Or hire</b> ${esc(h.c.name)} (${h.skill} ${h.c.skills[h.skill]}): ${money(h.c.salary)} fee + ${money(h.c.salary)}/mo.${fix.pick === 'hire' ? ' <span class="good">Recommended</span>' : ''}${noDesk()}`);
      actions.push(hireBtn(h.c, fix.pick === 'hire'));
    }
  }
  if (!fix.pick) lines.push(`Nobody can be trained up to it and no candidate qualifies. Refresh candidates ($300) or wait for the next batch (day ${S.day + 10 - (S.day % 10)}).`);
  return { lines, actions };
}

const openReqs = p => p.reqs.filter(r => r.done < r.need);

// Returns { mode, items }. Each item: { group, order, key, title, tag, cls, sub, rows: [{ label, lines, actions }] }.
function hrAdvice() {
  const people = S.employees.filter(e => !isManager(e) && !isHR(e)); // the owner counts: they can work too
  const best = skill => Math.max(0, ...people.map(e => e.skills[skill]));
  const items = [];

  if (S.projects.length) {
    for (const p of S.projects) {
      const left = p.deadline - S.day;
      const sub = `${esc(p.client)} · ${money(p.reward)} · ${Math.max(0, left)} days left`;

      // 1. Requirements nobody in the company can work on: the project cannot be completed at all.
      const missing = openReqs(p).filter(r => !people.some(e => e.skills[r.skill] >= r.minLevel));
      if (missing.length) {
        items.push({ group: 'blocked', order: 0, key: left, title: p.title, tag: 'CAN\'T BE DONE', cls: 'missing', sub,
          rows: missing.map(r => ({ label: `Needs <b>${r.skill} ${r.minLevel}+</b> (${r.need - r.done} points to go). Your best is ${best(r.skill)}.`, ...gapAdvice(fixSkillGap(r.skill, r.minLevel, people)) })) });
        continue;
      }

      // 2. Everyone needed exists, but even with all of them on it the deadline is out of reach.
      const team = people.filter(e => canHelp(e, p));
      const eta = projectETA(p, team);
      if (eta <= left) continue;
      let bt = null, bh = null;
      for (const m of team) for (const r of openReqs(p)) {
        if (m.skills[r.skill] < r.minLevel || m.skills[r.skill] >= 10) continue;
        const shadow = { ...m, skills: { ...m.skills, [r.skill]: m.skills[r.skill] + 1 } };
        const saved = eta - projectETA(p, team.map(x => (x === m ? shadow : x)));
        if (saved <= 0) continue;
        const cost = trainCost(m, r.skill), score = saved / (cost + (m.owner ? 0 : 60 * MONTHS_HORIZON));
        if (!bt || score > bt.score) bt = { e: m, skill: r.skill, saved, cost, score };
      }
      for (const c of S.candidates) {
        if (c.role) continue;
        const saved = eta - projectETA(p, team.concat([c]));
        if (saved <= 0) continue;
        const score = saved / (c.salary * (1 + MONTHS_HORIZON));
        if (!bh || score > bh.score) bh = { c, saved, score };
      }
      const hireFirst = bh && (!bt || bh.score > bt.score);
      const enough = s => (eta - s <= left ? ', enough to make the deadline' : '');
      const lines = [], actions = [];
      const addTrain = () => { const l = bt.e.skills[bt.skill]; lines.push(`<b>Train</b> ${esc(bt.e.name)} in ${bt.skill} (${l} → ${l + 1}) for ${money(bt.cost)}: saves ~${bt.saved} day(s)${enough(bt.saved)}.`); actions.push(trainBtn(bt.e, bt.skill, !hireFirst)); };
      const addHire = () => { lines.push(`<b>Or hire</b> ${esc(bh.c.name)} (${esc(bh.c.title)}, ${money(bh.c.salary)}/mo): saves ~${bh.saved} day(s)${enough(bh.saved)}.${noDesk()}`); actions.push(hireBtn(bh.c, hireFirst)); };
      if (hireFirst) { addHire(); if (bt) addTrain(); } else { if (bt) addTrain(); if (bh) addHire(); }
      if (!bt && !bh) lines.push('No single training session or hire closes the gap. Several upgrades are needed, or the deadline will be missed.');
      items.push({ group: 'late', order: 1, key: -(eta - left), title: p.title, tag: 'TOO SLOW', cls: 'missing', sub,
        rows: [{ label: `Even with everyone who can work on it, it needs ~<b>${eta} days</b> and only ${left} remain.`, lines, actions }] });
    }
    items.sort((a, b) => a.order - b.order || a.key - b.key);
    return { mode: 'projects', items };
  }

  // No accepted projects: look for skills the company lacks.
  // a) skills that open client requests need and nobody has
  const needs = new Map(); // skill -> unmet requirements of open requests
  for (const o of S.offers) {
    const miss = o.reqs.filter(r => best(r.skill) < r.minLevel);
    for (const r of miss) needs.set(r.skill, (needs.get(r.skill) || []).concat([{ minLevel: r.minLevel, reward: o.reward, alone: miss.length === 1 }]));
  }
  // Target the lowest missing level per skill, and only count the requests that level would actually open up.
  const demand = new Map();
  for (const [skill, list] of needs) {
    const target = Math.min(...list.map(x => x.minLevel)), got = list.filter(x => x.minLevel <= target);
    demand.set(skill, { skill, target, n: got.length, reward: got.reduce((a, x) => a + x.reward, 0), unlock: got.filter(x => x.alone).reduce((a, x) => a + x.reward, 0) });
  }
  const wanted = [...demand.values()].sort((a, b) => b.unlock - a.unlock || b.reward - a.reward).slice(0, 3);
  for (const d of wanted) {
    items.push({ group: 'requests', order: 0, key: -d.reward, title: `${d.skill} ${d.target}+`, tag: 'LACKING', cls: 'missing',
      sub: `Your best ${d.skill} is ${best(d.skill)}.`,
      rows: [{ label: `${d.n} client request${d.n > 1 ? 's' : ''} would open up, worth ${money(d.reward)}${d.unlock && d.unlock < d.reward ? `; ${money(d.unlock)} of that needs nothing else` : ''}.`, ...gapAdvice(fixSkillGap(d.skill, d.target, people)) }] });
  }
  // b) skills where the team is behind what clients typically ask for at your reputation
  const market = Math.min(9, 1 + Math.floor(S.rep / 12) + 2);
  SKILLS.filter(s => !demand.has(s) && best(s) < market)
    .sort((a, b) => best(a) - best(b)).slice(0, Math.max(1, 3 - items.length))
    .forEach(s => items.push({ group: 'market', order: 1, key: best(s), title: `${s} ${market}`, tag: 'WEAK SPOT', cls: 'ok',
      sub: `Your best ${s} is ${best(s)}.`,
      rows: [{ label: `Clients at your reputation can ask for ${s} up to level ${market}.`, ...gapAdvice(fixSkillGap(s, market, people)) }] }));
  items.sort((a, b) => a.order - b.order || a.key - b.key);
  return { mode: 'lacking', items };
}

const HR_GROUPS = {
  blocked: 'Accepted projects you can\'t complete yet',
  late: 'Accepted projects that will miss their deadline',
  requests: 'Skills that open client requests need',
  market: 'Skills clients commonly ask for that you are weak in',
};

function renderHR() {
  const el = document.getElementById('hr');
  if (!el) return;
  const hr = S.employees.find(isHR);
  if (!hr) {
    hrAlerts = 0;
    const cand = S.candidates.find(isHR);
    el.innerHTML = `<div class="card"><div class="title">No HR specialist yet</div>
      <div class="muted">HR looks at the projects you have accepted, tells you which ones can't be completed with your current skills, and what to train to fix that.</div>
      ${cand ? `<div class="muted">${esc(cand.name)} is available for ${money(cand.salary)}/mo.${noDesk()}</div>${hireBtn(cand, true).replace('class="small primary"', 'class="primary"')}` : '<div class="muted">No HR candidate right now. Check the recruiting desk after the next candidate refresh.</div>'}</div>`;
    return;
  }
  const { mode, items } = hrAdvice();
  hrAlerts = mode === 'projects' ? items.length : 0;
  let html = `<div class="muted">${esc(hr.name)} reviewed your company on day ${S.day}.</div>`;
  if (mode === 'lacking') html += '<div class="muted">You have no accepted projects, so here is where the company is lacking skills.</div>';
  if (!items.length) {
    html += mode === 'projects'
      ? '<div class="card"><div class="title">All good</div><div class="muted">Every accepted project can be completed on time with the people you have.</div></div>'
      : '<div class="card"><div class="title">No skill gaps</div><div class="muted">Your team covers every open request and the skill levels clients commonly ask for.</div></div>';
  }
  let group = null;
  for (const i of items) {
    if (i.group !== group) { group = i.group; html += `<h3 class="hrgroup">${HR_GROUPS[group]}</h3>`; }
    html += `<div class="card">
      <div class="row"><span class="title">${esc(i.title)}</span><span class="tag ${i.cls}">${i.tag}</span></div>
      <div class="muted">${i.sub}</div>
      ${i.rows.map(r => `<div class="hrrow"><div>${r.label}</div>${r.lines.map(l => `<div class="muted">${l}</div>`).join('')}${r.actions.length ? `<div class="tags">${r.actions.join('')}</div>` : ''}</div>`).join('')}
    </div>`;
  }
  el.innerHTML = html;
}
