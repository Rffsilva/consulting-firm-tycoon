'use strict';
// HR advisor: studies projects, offers and the team, then recommends who to hire or train.
// Loaded before game.js; everything here runs on demand, after game.js has defined the shared helpers.

const isHR = e => e.role === 'hr';
let hrAlerts = 0; // urgent recommendations, shown as a bubble over the HR desk in the office

const MONTHS_HORIZON = 3; // hire-vs-train costs are compared over this many months of salary

function trainPlanCost(e, skill, steps) {
  let c = 0;
  for (let i = 0; i < steps; i++) c += 400 + (e.skills[skill] + i) * 350;
  return c;
}

// Cheapest way to get someone with `skill` at `minLevel`: train a current employee (up to 2 levels) or hire a listed candidate.
function fixSkillGap(skill, minLevel, people) {
  let train = null, hire = null;
  for (const e of people) {
    const gap = minLevel - e.skills[skill];
    if (gap < 1 || gap > 2) continue;
    const cost = trainPlanCost(e, skill, gap), cost3 = cost + gap * 60 * MONTHS_HORIZON;
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

// Turns a fixSkillGap result into advice lines, action buttons and a verdict tag.
function gapAdvice(fix) {
  const lines = [], actions = [];
  const order = fix.pick === 'hire' ? ['hire', 'train'] : ['train', 'hire'];
  for (const k of order) {
    if (k === 'train' && fix.train) {
      const t = fix.train, lvl = t.e.skills[t.skill];
      lines.push(`Train ${esc(t.e.name)} in ${t.skill} (${lvl} → ${lvl + t.gap}): ${money(t.cost)} one-off, +${money(60 * t.gap)}/mo${t.gap > 1 ? ' (one level at a time)' : ''}.`);
      actions.push(trainBtn(t.e, t.skill, fix.pick === 'train'));
    }
    if (k === 'hire' && fix.hire) {
      const h = fix.hire;
      lines.push(`Hire ${esc(h.c.name)} (${h.skill} ${h.c.skills[h.skill]}): ${money(h.c.salary)} fee + ${money(h.c.salary)}/mo.${noDesk()}`);
      actions.push(hireBtn(h.c, fix.pick === 'hire'));
    }
  }
  if (!fix.pick) lines.push(`No current employee is close enough and no candidate qualifies. Refresh candidates ($300) or wait for the next batch (day ${S.day + 10 - (S.day % 10)}).`);
  return { lines, actions, tag: fix.pick === 'train' ? 'TRAIN' : 'HIRE' };
}

function hrAdvice() {
  const out = [];
  const people = S.employees.filter(e => !isManager(e) && !isHR(e)); // the owner counts: they can work too
  const blocked = new Set();

  for (const p of S.projects) {
    const left = p.deadline - S.day;
    const team = people.filter(e => e.assignedTo === p.id);

    // 1. Requirements nobody in the company can work on.
    for (const r of p.reqs.filter(r => r.done < r.need)) {
      if (people.some(e => e.skills[r.skill] >= r.minLevel)) continue;
      const key = `${r.skill}|${r.minLevel}`;
      if (blocked.has(key)) continue;
      blocked.add(key);
      const a = gapAdvice(fixSkillGap(r.skill, r.minLevel, people));
      out.push({ pri: 100 - Math.max(0, Math.min(left, 20)), tag: a.tag, title: `"${p.title}" is blocked: nobody has ${r.skill} ${r.minLevel}+`,
        lines: [`${r.need - r.done} points of ${r.skill} are waiting and ${left} days remain.`, ...a.lines], actions: a.actions });
    }

    // 2. Qualified people exist but none are on the project.
    if (!team.length) {
      if (p.reqs.some(r => r.done < r.need) && people.some(e => canHelp(e, p)))
        out.push({ pri: 70, tag: 'TIP', title: `"${p.title}" has nobody assigned`, lines: [`${people.filter(e => canHelp(e, p)).map(e => esc(e.name)).join(', ')} can work on it. A manager would assign them automatically.`], actions: [] });
      continue;
    }

    // 3. Staffed but too slow.
    const eta = projectETA(p, team);
    if (eta === Infinity) {
      const missing = p.reqs.find(r => r.done < r.need && !team.some(e => e.skills[r.skill] >= r.minLevel));
      const able = missing && people.filter(e => e.skills[missing.skill] >= missing.minLevel);
      if (able && able.length) out.push({ pri: 70, tag: 'TIP', title: `"${p.title}" is missing ${missing.skill} skills on its team`, lines: [`${able.map(e => esc(e.name)).join(', ')} could cover it. Assign them or let a manager do it.`], actions: [] });
      continue;
    }
    if (eta <= left - 2) continue;
    const late = eta > left;

    let bt = null, bh = null;
    for (const m of team) for (const r of p.reqs) {
      if (r.done >= r.need || m.skills[r.skill] < r.minLevel || m.skills[r.skill] >= 10) continue;
      const shadow = { ...m, skills: { ...m.skills, [r.skill]: m.skills[r.skill] + 1 } };
      const saved = eta - projectETA(p, team.map(x => (x === m ? shadow : x)));
      if (saved <= 0) continue;
      const cost = trainCost(m, r.skill), cost3 = cost + 60 * MONTHS_HORIZON, score = saved / cost3;
      if (!bt || score > bt.score) bt = { e: m, skill: r.skill, saved, cost, cost3, score };
    }
    for (const c of S.candidates) {
      if (c.role) continue;
      const saved = eta - projectETA(p, team.concat([c]));
      if (saved <= 0) continue;
      const cost3 = c.salary * (1 + MONTHS_HORIZON), score = saved / cost3;
      if (!bh || score > bh.score) bh = { c, saved, cost3, score };
    }
    const pickHire = bh && (!bt || bh.score > bt.score);
    const lines = [`Projected finish in ~${eta} days with ${left} left${late ? `: about ${eta - left} day(s) late.` : ': very little margin.'}`];
    const actions = [];
    const tLine = bt && (() => { const l = bt.e.skills[bt.skill]; return `Train ${esc(bt.e.name)} in ${bt.skill} (${l} → ${l + 1}) for ${money(bt.cost)}: saves ~${bt.saved} day(s)${eta - bt.saved <= left ? ', enough to make the deadline' : ''}.`; })();
    const hLine = bh && `Hire ${esc(bh.c.name)} (${esc(bh.c.title)}, ${money(bh.c.salary)}/mo): saves ~${bh.saved} day(s)${eta - bh.saved <= left ? ', enough to make the deadline' : ''}.${noDesk()}`;
    if (pickHire) { lines.push(hLine); actions.push(hireBtn(bh.c, true)); if (bt) { lines.push(tLine); actions.push(trainBtn(bt.e, bt.skill, false)); } }
    else { if (bt) { lines.push(tLine); actions.push(trainBtn(bt.e, bt.skill, true)); } if (bh) { lines.push(hLine); actions.push(hireBtn(bh.c, false)); } }
    if (!bt && !bh) lines.push('No single hire or training session helps enough. Consider adding several people, or accept the penalty.');
    out.push({ pri: late ? 90 + Math.min(9, eta - left) : 60, tag: !bt && !bh ? 'TIP' : pickHire ? 'HIRE' : 'TRAIN', title: `"${p.title}" is ${late ? 'running late' : 'cutting it close'}`, lines, actions });
  }

  // 4. Management capacity.
  const staff = people.filter(e => !e.owner);
  if (!S.employees.some(isManager)) {
    if (staff.length >= 3) {
      const m = S.candidates.find(isManager);
      out.push({ pri: 55, tag: 'HIRE', title: 'Hire a manager', lines: [`You have ${staff.length} consultants to place by hand. A manager assigns them automatically.${m ? ` ${esc(m.name)} (Management ${m.mgmt}) is available.${noDesk()}` : ''}`], actions: m ? [hireBtn(m, true)] : [] });
    }
  } else if (staff.some(e => e.assignedTo === null) && managedCount() >= managerCapacity()) {
    const m = S.candidates.find(isManager);
    out.push({ pri: 55, tag: 'HIRE', title: 'Your managers are at capacity', lines: [`They handle ${managedCount()}/${managerCapacity()} staff and some people are idle. Train a manager's Management skill or hire another.${m ? ` ${esc(m.name)} (Management ${m.mgmt}) is available.${noDesk()}` : ''}`], actions: m ? [hireBtn(m, true)] : [] });
  }

  // 5. Skills that incoming offers need and nobody has.
  const demand = new Map();
  for (const o of S.offers) for (const r of o.reqs) {
    if (people.some(e => e.skills[r.skill] >= r.minLevel)) continue;
    const key = `${r.skill}|${r.minLevel}`;
    demand.set(key, { skill: r.skill, minLevel: r.minLevel, n: (demand.get(key)?.n || 0) + 1, reward: (demand.get(key)?.reward || 0) + o.reward });
  }
  const top = [...demand.entries()].filter(([k]) => !blocked.has(k)).sort((a, b) => b[1].reward - a[1].reward)[0];
  if (top) {
    const d = top[1], a = gapAdvice(fixSkillGap(d.skill, d.minLevel, people));
    out.push({ pri: 35, tag: a.tag, title: `${d.n} client request(s) need ${d.skill} ${d.minLevel}+ and nobody has it`,
      lines: [`Worth ${money(d.reward)} in total. Having this skill would open them up.`, ...a.lines], actions: a.actions });
  }

  // 6. Work the current team could already take on.
  const idle = people.filter(e => !e.owner && e.assignedTo === null);
  if (idle.length || !S.projects.length) {
    for (const o of [...S.offers].sort((a, b) => b.reward - a.reward)) {
      if (!o.reqs.every(r => people.some(e => e.skills[r.skill] >= r.minLevel))) continue;
      out.push({ pri: 30, tag: 'TIP', title: `Your team can take "${o.title}" (${money(o.reward)})`, lines: [`${idle.length ? `${idle.length} ${idle.length === 1 ? 'person is' : 'people are'} idle. ` : ''}Everyone needed for it is already on staff.`],
        actions: [`<button class="small primary" onclick="acceptOffer(${o.id})">Accept request</button>`] });
      break;
    }
  }
  return out.sort((a, b) => b.pri - a.pri);
}

function renderHR() {
  const el = document.getElementById('hr');
  if (!el) return;
  const hr = S.employees.find(isHR);
  if (!hr) {
    hrAlerts = 0;
    const cand = S.candidates.find(isHR);
    el.innerHTML = `<div class="card"><div class="title">No HR specialist yet</div>
      <div class="muted">HR watches your projects and team, and tells you when to hire or train people and who.</div>
      ${cand ? `<div class="muted">${esc(cand.name)} is available for ${money(cand.salary)}/mo.${noDesk()}</div>${hireBtn(cand, true).replace('class="small primary"', 'class="primary"')}` : '<div class="muted">No HR candidate right now. Check the recruiting desk after the next candidate refresh.</div>'}</div>`;
    return;
  }
  const items = hrAdvice();
  hrAlerts = items.filter(i => i.pri >= 80).length;
  const cards = items.map(i => `<div class="card">
    <div class="row"><span class="title">${esc(i.title)}</span><span class="tag ${i.pri >= 80 ? 'missing' : 'ok'}">${i.tag}</span></div>
    ${i.lines.map(l => `<div class="muted">${l}</div>`).join('')}
    ${i.actions.length ? `<div class="tags">${i.actions.join('')}</div>` : ''}
  </div>`).join('');
  el.innerHTML = `<div class="muted">${esc(hr.name)} reviewed your company on day ${S.day}.</div>` +
    (cards || '<div class="card"><div class="title">All good</div><div class="muted">Your team can handle the current projects. Nothing to hire or train right now.</div></div>');
}
