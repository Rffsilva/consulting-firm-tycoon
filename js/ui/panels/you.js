/**
 * The "You" card in the side panel: puts the owner on a project.
 */
(function (CFT) {
  'use strict';
  const { util, projects } = CFT;
  const { esc } = util;
  const { $, skillTags } = CFT.ui.components;

  CFT.ui.panels.you = function renderYou(s) {
    const me = s.employees.find(e => e.owner);
    if (!me) return;
    const current = projects.find(s, me.assignedTo);
    const options = ['<option value="">Not working on a project</option>'].concat(s.projects.map(p => {
      const task = projects.taskFor(me, p);
      const selected = me.assignedTo === p.id;
      const label = `${esc(p.title)} ${task ? `(${task.skill} ${me.skills[task.skill]})` : "(you can't help)"}`;
      return `<option value="${p.id}" ${selected ? 'selected' : ''} ${task || selected ? '' : 'disabled'}>${label}</option>`;
    })).join('');
    const task = current && projects.taskFor(me, current);
    const status = !current ? '<span class="muted">You are free. Pick a project to pitch in.</span>'
      : task ? `<span class="good">Contributing ${me.skills[task.skill]} ${task.skill} points a day to "${esc(current.title)}".</span>`
        : `<span class="warn">Nothing left on "${esc(current.title)}" that you can do.</span>`;
    $('you').innerHTML = `<div class="card">
      <div class="title">Your job</div>
      <div class="tags">${skillTags(me.skills)}</div>
      <div class="row"><select id="youSelect" data-action="assign" data-id="${me.id}">${options}</select></div>
      <div>${status}</div>
    </div>`;
  };
})(window.CFT);
