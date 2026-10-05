/**
 * HTML builders for the cards and buttons used in several windows.
 *
 * Buttons never call functions directly: they carry data-action (and data-id, ...) attributes, and
 * js/ui/actions.js handles every click in one place. Text from the game is always escaped with esc().
 */
(function (CFT) {
  'use strict';
  const { config, util, staff, projects } = CFT;
  const { esc, money } = util;

  const $ = id => document.getElementById(id);

  /**
   * Escapes text, then applies the two bits of markup the HR advisor uses:
   * **bold** and [[cls:text]] (a span with a CSS class such as good / warn / bad).
   */
  const rich = text => esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\[\[(\w+):(.+?)\]\]/g, '<span class="$1">$2</span>');

  const empty = text => `<div class="empty">${esc(text)}</div>`;

  const skillTags = skills => config.SKILLS.filter(s => skills[s] > 0).map(s => `<span class="tag">${s} ${skills[s]}</span>`).join('');

  /** Role badges (e.g. "Management 3") followed by skill levels. */
  function personTags(e) {
    const badges = (staff.roleOf(e).badges || (() => []))(e);
    return badges.map(b => `<span class="tag ok" title="${esc(b.hint)}">${esc(b.label)}</span>`).join('') + skillTags(e.skills);
  }

  // ---------- Buttons ----------

  function trainButton(s, e, skill, primary) {
    const cost = staff.trainCost(e, skill);
    return `<button class="small ${primary ? 'primary' : ''}" data-action="train-skill" data-id="${e.id}" data-skill="${esc(skill)}"
      ${s.money < cost ? 'disabled' : ''}>Train ${esc(e.name)} (${money(cost)})</button>`;
  }

  function assignButton(e, p, primary) {
    return `<button class="small ${primary ? 'primary' : ''}" data-action="assign-project" data-id="${e.id}" data-project="${p.id}">Assign ${esc(e.name)}</button>`;
  }

  function hireButton(s, c, primary, small = true) {
    const blocked = s.employees.length >= s.desks || s.money < c.salary;
    return `<button class="${small ? 'small ' : ''}${primary ? 'primary' : ''}" data-action="hire" data-id="${c.id}"
      ${blocked ? 'disabled' : ''}>Hire ${esc(c.name)} (fee ${money(c.salary)})</button>`;
  }

  // ---------- Cards ----------

  function offerCard(o, s) {
    const tags = o.reqs.map(r => {
      const have = s.employees.some(e => projects.qualifies(e, r));
      return `<span class="tag ${have ? 'ok' : 'missing'}" title="${have ? 'You have someone qualified' : 'Nobody on your team is qualified yet'}">${r.skill} ≥${r.minLevel} · ${r.need} pts</span>`;
    }).join('');
    return `<div class="card">
      <div class="row"><span class="title">${esc(o.title)}</span><span class="good">${money(o.reward)}</span></div>
      <div class="muted">${esc(o.client)} · ${o.duration} days to deliver · offer expires day ${o.expires}</div>
      <div class="tags">${tags}</div>
      <button class="primary" data-action="accept-offer" data-id="${o.id}">Accept</button>
    </div>`;
  }

  function projectCard(p, s) {
    const left = p.deadline - s.day;
    const team = projects.teamOf(s, p);
    const { pct } = projects.progress(p);
    const eta = projects.eta(p, team);
    const status = eta === Infinity ? '<span class="bad">Stalled</span>'
      : eta <= left ? `<span class="good">On track · ~${eta}d to finish</span>`
        : `<span class="warn">At risk · ~${eta}d to finish</span>`;
    const reqs = p.reqs.map(r => {
      const capable = team.some(e => projects.qualifies(e, r));
      const warning = r.done < r.need && !capable ? ' <span class="bad">no qualified staff assigned</span>' : '';
      return `<div class="req">${r.skill} (min lvl ${r.minLevel}) ${r.done}/${r.need}${warning}
        <div class="bar"><i style="width:${Math.round(r.done / r.need * 100)}%"></i></div></div>`;
    }).join('');
    return `<div class="card">
      <div class="row"><span class="title">${esc(p.title)}</span><span class="good">${money(p.reward)}</span></div>
      <div class="muted">${esc(p.client)} · <span class="${left <= 5 ? 'bad' : ''}">${Math.max(0, left)} days left</span> · ${status}</div>
      <div class="bar big"><i style="width:${pct}%"></i></div>
      <div class="muted">Overall ${pct}% · team: ${team.map(e => esc(e.name)).join(', ') || 'nobody'}</div>
      ${reqs}
    </div>`;
  }

  /**
   * The skill picked in each employee's training dropdown, by employee id. The screen is redrawn from the state
   * every game day, so without this a pick made before pressing Train would jump back on the next redraw.
   */
  const trainPicks = {};

  /** Employee card with the project picker (or the role's status line), training and firing. */
  function employeeCard(e, s) {
    const role = staff.roleOf(e);
    const projectOptions = ['<option value="">Idle (bench)</option>']
      .concat(s.projects.map(p => `<option value="${p.id}" ${e.assignedTo === p.id ? 'selected' : ''}>${esc(p.title)}</option>`)).join('');
    const picked = trainPicks[e.id] || e.lastTrained;
    const trainOptions = staff.trainableSkills(e).filter(skill => staff.skillLevel(e, skill) < config.MAX_SKILL_LEVEL)
      .map(skill => `<option value="${esc(skill)}" ${picked === skill ? 'selected' : ''}>${skill} → ${staff.skillLevel(e, skill) + 1} (${money(staff.trainCost(e, skill))})</option>`).join('');
    const status = role.cardStatus
      ? `<span class="muted">${esc(role.cardStatus(e, s))}</span>`
      : `<select data-action="assign" data-id="${e.id}">${projectOptions}</select>${e.managed ? ' <span class="tag ok">managed</span>' : ''}`;
    return `<div class="card">
      <div class="row"><span class="title">${esc(e.name)}</span><span class="muted">${e.owner ? 'no salary' : money(e.salary) + '/mo'}</span></div>
      <div class="muted">${esc(e.title)}</div>
      <div class="tags">${personTags(e)}</div>
      <div class="row">
        <span>${status}</span>
        <span>
          <select class="train-select" data-action="train-pick" data-id="${e.id}">${trainOptions}</select>
          <button class="small" data-action="train" data-id="${e.id}">Train</button>
          ${e.owner ? '' : `<button class="small danger" data-action="fire" data-id="${e.id}">Fire</button>`}
        </span>
      </div>
    </div>`;
  }

  function candidateCard(c, s) {
    return `<div class="card">
      <div class="row"><span class="title">${esc(c.name)}</span><span class="muted">${money(c.salary)}/mo</span></div>
      <div class="muted">${esc(c.title)}</div>
      <div class="tags">${personTags(c)}</div>
      <button class="primary" data-action="hire" data-id="${c.id}"
        ${s.employees.length >= s.desks || s.money < c.salary ? 'disabled' : ''}>Hire (fee ${money(c.salary)})</button>
    </div>`;
  }

  CFT.ui.components = {
    $, rich, empty, skillTags, personTags, trainPicks,
    trainButton, hireButton, assignButton,
    offerCard, projectCard, employeeCard, candidateCard,
  };
})(window.CFT);
