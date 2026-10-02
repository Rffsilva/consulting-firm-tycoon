'use strict';

// ---------- Config ----------
const SKILLS = ['Strategy', 'Analytics', 'Technology', 'Finance', 'Operations'];
const FIRST = ['Alex', 'Sam', 'Priya', 'Jon', 'Mei', 'Carlos', 'Fatima', 'Liam', 'Aiko', 'Noah', 'Sofia', 'Omar', 'Greta', 'Raj', 'Elena', 'Tom'];
const LAST = ['Smith', 'Patel', 'Garcia', 'Chen', 'Novak', 'Silva', 'Khan', 'Rossi', 'Müller', 'Okafor', 'Kim', 'Dubois', 'Ivanov'];
const CLIENTS = ['Acme Corp', 'Globex', 'Initech', 'Umbrella Ltd', 'Hooli', 'Stark Retail', 'Wayne Logistics', 'Soylent Foods', 'Vandelay Imports', 'Pied Piper', 'Cyberdyne', 'Wonka Industries'];
const TASKS = {
  Strategy: ['Market entry plan', 'Growth strategy', 'Merger due diligence'],
  Analytics: ['Customer churn study', 'Sales forecasting', 'Pricing analysis'],
  Technology: ['Cloud migration', 'ERP rollout', 'Cybersecurity audit'],
  Finance: ['Cost reduction review', 'Budget restructuring', 'Investor deck'],
  Operations: ['Supply chain redesign', 'Process optimisation', 'Warehouse audit'],
};
const DAYS_PER_MONTH = 30;
const DESK_COST = 6000, RENT_PER_DESK = 250;
const MAX_OFFERS = 5, OFFER_LIFETIME = 12;
const MAX_DESKS = 20;
const SAVE_KEY = 'cft-save-v1';

// ---------- Helpers ----------
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const money = n => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString();
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = id => document.getElementById(id);

// ---------- State ----------
let S;
let openEmp = null; // employee id shown in the desk pop-up

function newState() {
  const s = {
    day: 1, money: 15000, rep: 0, desks: 3, nextId: 1,
    employees: [], candidates: [], offers: [], projects: [], log: [], completed: 0, failed: 0,
  };
  s.employees.push({ id: s.nextId++, name: 'You (Owner)', title: 'Founder', owner: true, salary: 0, assignedTo: null,
    skills: { Strategy: 4, Analytics: 2, Technology: 1, Finance: 3, Operations: 3 } });
  return s;
}

function logMsg(text, cls = '') {
  S.log.unshift({ day: S.day, text, cls });
  if (S.log.length > 80) S.log.pop();
}

// ---------- Generation ----------
function makeCandidate() {
  const primary = pick(SKILLS);
  const cap = Math.min(10, 5 + Math.floor(S.rep / 12));
  const skills = {};
  SKILLS.forEach(s => skills[s] = 0);
  skills[primary] = rnd(Math.max(2, cap - 4), cap);
  for (let i = 0; i < rnd(1, 2); i++) {
    const sec = pick(SKILLS);
    if (sec !== primary) skills[sec] = Math.max(skills[sec], rnd(1, Math.max(2, Math.floor(skills[primary] * 0.7))));
  }
  const total = Object.values(skills).reduce((a, b) => a + b, 0);
  return { id: S.nextId++, name: `${pick(FIRST)} ${pick(LAST)}`, title: `${primary} Consultant`, skills,
    salary: Math.round((500 + total * 110 + rnd(-100, 100)) / 10) * 10, assignedTo: null };
}

function makeManager() {
  const cap = Math.min(10, 5 + Math.floor(S.rep / 12));
  const mgmt = rnd(2, Math.max(3, cap - 1));
  const skills = {};
  SKILLS.forEach(s => skills[s] = 0);
  const total = rnd(1, 3);
  skills[pick(SKILLS)] = total;
  return { id: S.nextId++, name: `${pick(FIRST)} ${pick(LAST)}`, title: 'Manager', role: 'manager', mgmt, skills,
    salary: Math.round((800 + mgmt * 230 + total * 60 + rnd(-100, 100)) / 10) * 10, assignedTo: null };
}

function makeHR() {
  const skills = {};
  SKILLS.forEach(s => skills[s] = 0);
  skills[pick(SKILLS)] = rnd(1, 3);
  return { id: S.nextId++, name: `${pick(FIRST)} ${pick(LAST)}`, title: 'HR Specialist', role: 'hr', skills,
    salary: Math.round((1000 + rnd(0, 300)) / 10) * 10, assignedTo: null };
}

function makeOffer() {
  const nSkills = rnd(1, Math.min(3, 1 + Math.floor(S.rep / 15) + 1));
  const chosen = [...SKILLS].sort(() => Math.random() - 0.5).slice(0, nSkills);
  const minBase = 1 + Math.floor(S.rep / 12);
  const reqs = chosen.map(skill => ({
    skill, need: rnd(20, 40) + Math.floor(S.rep * 1.2), done: 0,
    minLevel: Math.min(9, minBase + rnd(0, 2)),
  }));
  const points = reqs.reduce((a, r) => a + r.need, 0);
  const days = Math.round(points / (nSkills * 4.5)) + rnd(8, 16);
  return {
    id: S.nextId++, client: pick(CLIENTS), title: pick(TASKS[chosen[0]]),
    reqs, reward: Math.round(points * rnd(80, 110) / 10) * 10, duration: days, expires: S.day + OFFER_LIFETIME,
    repGain: 2 + Math.floor(points / 50),
  };
}

function refillOffers() {
  while (S.offers.length < MAX_OFFERS) S.offers.push(makeOffer());
}
function refillCandidates() {
  S.candidates = [];
  for (let i = 0; i < 3; i++) S.candidates.push(makeCandidate());
  S.candidates.push(makeManager()); // always one manager on the market
  if (!S.employees.some(isHR)) S.candidates[0] = makeHR(); // and one HR specialist until you have one
}

// ---------- Actions ----------
function acceptOffer(id) {
  const i = S.offers.findIndex(o => o.id === id);
  if (i < 0) return;
  const o = S.offers.splice(i, 1)[0];
  o.deadline = S.day + o.duration;
  S.projects.push(o);
  logMsg(`Accepted "${o.title}" for ${o.client}. Deadline day ${o.deadline}.`);
  render();
}

function hire(id) {
  const c = S.candidates.find(c => c.id === id);
  if (!c) return;
  if (S.employees.length >= S.desks) return alert('No free desks. Expand the office.');
  if (S.money < c.salary) return alert('Not enough cash for the recruiting fee.');
  S.money -= c.salary;
  S.candidates = S.candidates.filter(x => x !== c);
  S.employees.push(c);
  logMsg(`Hired ${c.name} (${c.title}) for ${money(c.salary)}/month.`, 'good');
  render();
}

function fire(id) {
  const e = S.employees.find(e => e.id === id);
  if (!e || e.owner || !confirm(`Fire ${e.name}?`)) return;
  S.employees = S.employees.filter(x => x !== e);
  logMsg(`Fired ${e.name}.`, 'warn');
  render();
}

// The same card can exist in several windows, so read the select that sits next to the clicked button (ids would clash).
function train(id, btn) {
  const sel = btn.parentElement.querySelector('select');
  if (sel && sel.value) trainSkill(id, sel.value);
}
function trainSkill(id, skill) {
  const e = S.employees.find(e => e.id === id);
  if (!e || !skill) return;
  const cost = trainCost(e, skill);
  if (skillLevel(e, skill) >= 10) return;
  if (S.money < cost) return alert('Not enough cash.');
  S.money -= cost;
  if (skill === 'Management') e.mgmt++; else e.skills[skill]++;
  if (!e.owner) e.salary += skill === 'Management' ? 80 : 60;
  logMsg(`${e.name} trained ${skill} to level ${skillLevel(e, skill)} (${money(cost)}).`);
  render();
}
const skillLevel = (e, skill) => (skill === 'Management' ? e.mgmt : e.skills[skill]);
const trainCost = (e, skill) => (skill === 'Management' ? 600 + e.mgmt * 400 : 400 + e.skills[skill] * 350);

function assign(empId, projId) {
  const e = S.employees.find(e => e.id === empId);
  e.assignedTo = projId === '' ? null : Number(projId);
  e.managed = false; // manual choices are never touched by managers
  render();
}

function expandOffice() {
  if (S.desks >= MAX_DESKS) return;
  if (S.money < DESK_COST) return alert('Not enough cash.');
  S.money -= DESK_COST;
  S.desks = Math.min(MAX_DESKS, S.desks + 2);
  logMsg(`Office expanded to ${S.desks} desks.`, 'good');
  render();
}

function refreshCandidates() {
  if (S.money < 300) return;
  S.money -= 300;
  refillCandidates();
  render();
}

// ---------- Simulation ----------
// ---------- Managers ----------
const isManager = e => e.role === 'manager';
const isWorker = e => !e.owner && !isManager(e) && !isHR(e);
const managerCapacity = () => S.employees.filter(isManager).reduce((a, m) => a + 2 + m.mgmt, 0);
const managedCount = () => S.employees.filter(e => e.managed && e.assignedTo !== null).length;
const canHelp = (e, p) => !!p && p.reqs.some(r => r.done < r.need && e.skills[r.skill] >= r.minLevel);

const STRATEGIES = {
  deadline: { name: 'Protect deadlines', desc: 'Help the project closest to missing its deadline first. Fewest failures, but big payouts may wait.' },
  revenue: { name: 'Maximise revenue', desc: 'Put people on the highest-paying project first. Cheaper projects can slip past their deadline.' },
  fifo: { name: 'First come, first served', desc: 'Finish projects in the order you accepted them.' },
};
function setStrategy(id) {
  S.strategy = id;
  logMsg(`Company strategy set to "${STRATEGIES[id].name}".`);
  save(); render();
}

// Managers place idle staff on the project the company strategy ranks first, among those where the person can contribute.
function autoAssign() {
  const mgr = S.employees.find(isManager);
  if (!mgr || !S.projects.length) return;
  const strat = S.strategy || 'deadline';
  const cap = managerCapacity();
  let used = managedCount();
  // Days of margin before the deadline. A project nobody is working on is estimated as if `e` alone took it on.
  const slack = (p, e) => {
    let eta = projectETA(p, S.employees.filter(x => x.assignedTo === p.id));
    if (eta === Infinity) {
      const rate = Math.max(1, ...p.reqs.filter(r => r.done < r.need && e.skills[r.skill] >= r.minLevel).map(r => e.skills[r.skill]));
      eta = Math.ceil(p.reqs.reduce((a, r) => a + r.need - r.done, 0) / rate);
    }
    return (p.deadline - S.day) - eta;
  };
  const cmp = (a, b) => (a === b ? 0 : a < b ? -1 : 1);
  const ranked = e => {
    const list = [...S.projects]; // already in the order they were accepted
    if (strat === 'revenue') list.sort((a, b) => b.reward - a.reward || cmp(slack(a, e), slack(b, e)));
    else if (strat === 'deadline') list.sort((a, b) => cmp(slack(a, e), slack(b, e)));
    return list;
  };
  for (const e of S.employees.filter(isWorker)) {
    const cur = S.projects.find(p => p.id === e.assignedTo);
    const wasManaged = !!(e.managed && cur);
    if (e.assignedTo !== null && !wasManaged) continue; // manual assignment
    if (!wasManaged && used >= cap) continue;
    const best = ranked(e).find(p => canHelp(e, p));
    if (wasManaged) {
      if (!best) { e.assignedTo = null; e.managed = false; used--; continue; }
      if (best.id === cur.id) continue;
      // Moving a busy person: always for stable rankings; for deadlines only to rescue a project that is already late.
      if (canHelp(e, cur) && strat === 'deadline' && !(slack(best, e) < 0 && slack(cur, e) > 2)) continue;
    } else if (!best) continue;
    e.assignedTo = best.id; e.managed = true;
    if (!wasManaged) used++;
    logMsg(`${mgr.name} put ${e.name} on "${best.title}".`);
  }
}

function tick() {
  S.day++;
  autoAssign();

  // Work
  for (const p of S.projects) {
    for (const e of S.employees.filter(e => e.assignedTo === p.id && !isManager(e) && !isHR(e))) {
      const open = p.reqs.filter(r => r.done < r.need && e.skills[r.skill] >= r.minLevel);
      if (!open.length) continue;
      open.sort((a, b) => e.skills[b.skill] - e.skills[a.skill]);
      const r = open[0];
      r.done = Math.min(r.need, r.done + e.skills[r.skill]);
    }
  }

  // Completion / failure
  for (const p of [...S.projects]) {
    const finished = p.reqs.every(r => r.done >= r.need);
    if (finished) {
      const early = p.deadline - S.day;
      const bonus = early > 0 ? Math.round(p.reward * Math.min(0.2, early * 0.01)) : 0;
      S.money += p.reward + bonus;
      S.rep += p.repGain;
      S.completed++;
      logMsg(`Delivered "${p.title}" to ${p.client}: +${money(p.reward + bonus)}${bonus ? ' (early bonus)' : ''}, +${p.repGain} rep.`, 'good');
      endProject(p);
    } else if (S.day > p.deadline) {
      const fine = Math.round(p.reward * 0.25);
      S.money -= fine;
      S.rep = Math.max(0, S.rep - p.repGain);
      S.failed++;
      logMsg(`Missed deadline on "${p.title}" (${p.client}). Fine ${money(fine)}, -${p.repGain} rep.`, 'bad');
      endProject(p);
    }
  }

  // Monthly costs
  if (S.day % DAYS_PER_MONTH === 0) {
    const wages = S.employees.reduce((a, e) => a + e.salary, 0);
    const rent = S.desks * RENT_PER_DESK;
    S.money -= wages + rent;
    logMsg(`Month end: wages ${money(wages)}, rent ${money(rent)}.`, 'warn');
  }

  // Market refresh
  S.offers = S.offers.filter(o => o.expires > S.day);
  if (S.day % 3 === 0) refillOffers();
  if (S.day % 10 === 0) refillCandidates();

  if (S.money < -5000) return gameOver();
  save();
  renderTick();
}

function endProject(p) {
  S.projects = S.projects.filter(x => x !== p);
  S.employees.forEach(e => { if (e.assignedTo === p.id) { e.assignedTo = null; e.managed = false; } });
}

// ---------- Game loop ----------
let speed = 1, timer = null;
function setSpeed(n) {
  speed = n;
  clearInterval(timer);
  if (n > 0) timer = setInterval(tick, 3000 / n);
  document.querySelectorAll('[data-speed]').forEach(b => b.classList.toggle('active', Number(b.dataset.speed) === n));
}

function gameOver() {
  setSpeed(0);
  localStorage.removeItem(SAVE_KEY);
  $('goText').textContent = `Your firm collapsed on day ${S.day}. Projects delivered: ${S.completed}, reputation: ${S.rep}.`;
  $('gameover').hidden = false;
  render();
}

// ---------- Persistence ----------
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
function load() {
  try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function startNew() {
  S = newState();
  refillOffers();
  refillCandidates();
  logMsg('You founded your consulting firm. Accept a request, then assign people to it.');
  $('gameover').hidden = true;
  save();
  render();
}

// ---------- Rendering ----------
function skillTags(skills) {
  return SKILLS.filter(s => skills[s] > 0).map(s => `<span class="tag">${s} ${skills[s]}</span>`).join('');
}
function personTags(e) {
  const m = isManager(e) ? `<span class="tag ok" title="Assigns idle staff to projects">Management ${e.mgmt} · handles ${2 + e.mgmt} staff</span>` : '';
  const h = isHR(e) ? '<span class="tag ok" title="Recommends who to hire or train">HR · advises on hiring and training</span>' : '';
  return m + h + skillTags(e.skills);
}

function offerCard(o) {
  const tags = o.reqs.map(r => {
    const have = S.employees.some(e => e.skills[r.skill] >= r.minLevel);
    return `<span class="tag ${have ? 'ok' : 'missing'}" title="${have ? 'You have someone qualified' : 'Nobody on your team is qualified yet'}">${r.skill} ≥${r.minLevel} · ${r.need} pts</span>`;
  }).join('');
  return `<div class="card">
    <div class="row"><span class="title">${esc(o.title)}</span><span class="good">${money(o.reward)}</span></div>
    <div class="muted">${esc(o.client)} · ${o.duration} days to deliver · offer expires day ${o.expires}</div>
    <div class="tags">${tags}</div>
    <button class="primary" onclick="acceptOffer(${o.id})">Accept</button>
  </div>`;
}

// Projected days to finish, using the same allocation rule as tick(): each person works the open requirement they are best at.
function projectETA(p, team) {
  const rate = new Map();
  for (const e of team) {
    const open = p.reqs.filter(r => r.done < r.need && e.skills[r.skill] >= r.minLevel);
    if (!open.length) continue;
    const r = open.reduce((a, b) => (e.skills[b.skill] > e.skills[a.skill] ? b : a));
    rate.set(r, (rate.get(r) || 0) + e.skills[r.skill]);
  }
  let eta = 0;
  for (const r of p.reqs) {
    if (r.done >= r.need) continue;
    const per = rate.get(r) || 0;
    if (!per) return Infinity;
    eta = Math.max(eta, Math.ceil((r.need - r.done) / per));
  }
  return eta;
}

function projectCard(p) {
  const left = p.deadline - S.day;
  const team = S.employees.filter(e => e.assignedTo === p.id);
  const done = p.reqs.reduce((a, r) => a + r.done, 0), need = p.reqs.reduce((a, r) => a + r.need, 0);
  const overall = Math.round(done / need * 100);
  const eta = projectETA(p, team);
  const status = eta === Infinity ? '<span class="bad">Stalled</span>'
    : eta <= left ? `<span class="good">On track · ~${eta}d to finish</span>`
    : `<span class="warn">At risk · ~${eta}d to finish</span>`;
  const reqs = p.reqs.map(r => {
    const pct = Math.round(r.done / r.need * 100);
    const capable = team.some(e => e.skills[r.skill] >= r.minLevel);
    const warn = r.done < r.need && !capable ? ' <span class="bad">no qualified staff assigned</span>' : '';
    return `<div class="req">${r.skill} (min lvl ${r.minLevel}) ${r.done}/${r.need}${warn}<div class="bar"><i style="width:${pct}%"></i></div></div>`;
  }).join('');
  return `<div class="card">
    <div class="row"><span class="title">${esc(p.title)}</span><span class="good">${money(p.reward)}</span></div>
    <div class="muted">${esc(p.client)} · <span class="${left <= 5 ? 'bad' : ''}">${Math.max(0, left)} days left</span> · ${status}</div>
    <div class="bar big"><i style="width:${overall}%"></i></div>
    <div class="muted">Overall ${overall}% · team: ${team.map(e => esc(e.name)).join(', ') || 'nobody'}</div>
    ${reqs}
  </div>`;
}

function employeeCard(e) {
  const mgr = isManager(e);
  const projOpts = ['<option value="">Idle (bench)</option>']
    .concat(S.projects.map(p => `<option value="${p.id}" ${e.assignedTo === p.id ? 'selected' : ''}>${esc(p.title)}</option>`)).join('');
  const trainSkills = (mgr ? ['Management'] : []).concat(SKILLS);
  const trainOpts = trainSkills.filter(s => skillLevel(e, s) < 10)
    .map(s => `<option value="${s}">${s} → ${skillLevel(e, s) + 1} (${money(trainCost(e, s))})</option>`).join('');
  const status = isHR(e) ? `<span class="muted">Reviewing the company (see the HR window)</span>` : mgr ? `<span class="muted">Managing ${managedCount()}/${managerCapacity()} staff (all managers combined)</span>`
    : `<select onchange="assign(${e.id}, this.value)">${projOpts}</select>${e.managed ? ' <span class="tag ok">managed</span>' : ''}`;
  return `<div class="card">
    <div class="row"><span class="title">${esc(e.name)}</span><span class="muted">${e.owner ? 'no salary' : money(e.salary) + '/mo'}</span></div>
    <div class="muted">${esc(e.title)}</div>
    <div class="tags">${personTags(e)}</div>
    <div class="row">
      <span>${status}</span>
      <span>
        <select class="train-select">${trainOpts}</select>
        <button class="small" onclick="train(${e.id}, this)">Train</button>
        ${e.owner ? '' : `<button class="small danger" onclick="fire(${e.id})">Fire</button>`}
      </span>
    </div>
  </div>`;
}

function candidateCard(c) {
  const full = S.employees.length >= S.desks;
  return `<div class="card">
    <div class="row"><span class="title">${esc(c.name)}</span><span class="muted">${money(c.salary)}/mo</span></div>
    <div class="muted">${esc(c.title)}</div>
    <div class="tags">${personTags(c)}</div>
    <button class="primary" onclick="hire(${c.id})" ${full || S.money < c.salary ? 'disabled' : ''}>Hire (fee ${money(c.salary)})</button>
  </div>`;
}

// Always-visible card for assigning the owner to a project.
function renderYou() {
  const me = S.employees.find(e => e.owner);
  if (!me) return;
  const cur = S.projects.find(p => p.id === me.assignedTo);
  const best = p => {
    const open = p.reqs.filter(r => r.done < r.need && me.skills[r.skill] >= r.minLevel);
    return open.length ? open.reduce((a, b) => (me.skills[b.skill] > me.skills[a.skill] ? b : a)) : null;
  };
  const opts = ['<option value="">Not working on a project</option>'].concat(S.projects.map(p => {
    const r = best(p);
    return `<option value="${p.id}" ${me.assignedTo === p.id ? 'selected' : ''} ${r || me.assignedTo === p.id ? '' : 'disabled'}>${esc(p.title)} ${r ? `(${r.skill} ${me.skills[r.skill]})` : "(you can't help)"}</option>`;
  })).join('');
  const r = cur && best(cur);
  const status = !cur ? '<span class="muted">You are free. Pick a project to pitch in.</span>'
    : r ? `<span class="good">Contributing ${me.skills[r.skill]} ${r.skill} points a day to "${esc(cur.title)}".</span>`
      : `<span class="warn">Nothing left on "${esc(cur.title)}" that you can do.</span>`;
  $('you').innerHTML = `<div class="card">
    <div class="title">Your job</div>
    <div class="tags">${skillTags(me.skills)}</div>
    <div class="row"><select id="youSelect" onchange="assign(${me.id}, this.value)">${opts}</select></div>
    <div>${status}</div>
  </div>`;
}

function renderStrategy() {
  const cur = S.strategy || 'deadline';
  const mgrs = S.employees.filter(isManager);
  const options = Object.entries(STRATEGIES).map(([id, st]) => `<button class="strat ${id === cur ? 'active' : ''}" onclick="setStrategy('${id}')">
    <b>${st.name}</b><span class="muted">${st.desc}</span></button>`).join('');
  const crew = S.employees.filter(e => e.managed && e.assignedTo !== null).map(e => {
    const p = S.projects.find(p => p.id === e.assignedTo);
    return p ? `<div class="muted">${esc(e.name)} → ${esc(p.title)}</div>` : '';
  }).join('');
  const team = mgrs.length
    ? `<div class="card"><div class="title">Management team</div>
        ${mgrs.map(m => `<div class="muted">${esc(m.name)} · Management ${m.mgmt}</div>`).join('')}
        <div class="muted">Managing ${managedCount()}/${managerCapacity()} staff</div>${crew}</div>`
    : '<div class="empty">No managers yet. Hire one from the recruiting desk so the strategy can be carried out.</div>';
  $('strategy').innerHTML = options + team;
}

function render() {
  $('day').textContent = S.day;
  $('money').textContent = money(S.money);
  $('money').className = S.money < 0 ? 'bad' : '';
  $('rep').textContent = S.rep;
  $('desks').textContent = `${S.employees.length}/${S.desks}`;
  $('refreshCand').textContent = 'Refresh ($300)';

  $('offers').innerHTML = S.offers.map(offerCard).join('') || '<div class="empty">No requests right now.</div>';
  const projHtml = S.projects.map(projectCard).join('') || '<div class="empty">No active projects. Accept a client request.</div>';
  $('projects').innerHTML = projHtml;
  $('sideProjects').innerHTML = projHtml;
  $('team').innerHTML = S.employees.map(employeeCard).join('');
  $('candidates').innerHTML = S.candidates.map(candidateCard).join('') || '<div class="empty">No candidates.</div>';

  const wages = S.employees.reduce((a, e) => a + e.salary, 0);
  const next = DAYS_PER_MONTH - (S.day % DAYS_PER_MONTH);
  $('office').innerHTML = `<div class="card">
    <div class="muted">Monthly burn: ${money(wages + S.desks * RENT_PER_DESK)} (wages ${money(wages)} + rent ${money(S.desks * RENT_PER_DESK)}), due in ${next} days.</div>
    <div class="muted">Delivered ${S.completed} · Failed ${S.failed}</div>
    <button onclick="expandOffice()" ${S.money < DESK_COST || S.desks >= MAX_DESKS ? 'disabled' : ''}>${S.desks >= MAX_DESKS ? 'Office is full size' : '+2 desks (' + money(DESK_COST) + ')'}</button>
  </div>`;

  renderYou();
  renderStrategy();
  renderHR();
  if (openEmp !== null) {
    const e = S.employees.find(x => x.id === openEmp);
    if (e) $('empDetail').innerHTML = employeeCard(e);
    else if (window.closeModal) closeModal();
  }
  $('log').innerHTML = S.log.map(l => `<div class="${l.cls}"><span class="muted">D${l.day}</span> ${esc(l.text)}</div>`).join('');
}

// Rerendering on a timer tick would close an open <select> menu, so ticks skip it while one is focused.
function renderTick() {
  const a = document.activeElement;
  if (a && a.tagName === 'SELECT') return;
  render();
}

// ---------- Init ----------
document.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => setSpeed(Number(b.dataset.speed))));
$('refreshCand').addEventListener('click', refreshCandidates);
$('reset').addEventListener('click', () => { if (confirm('Discard this game and start over?')) startNew(); });
$('goBtn').addEventListener('click', () => { startNew(); setSpeed(1); });

S = load();
if (S) { render(); } else { startNew(); }
setSpeed(1);
