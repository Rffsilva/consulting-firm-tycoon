/**
 * "Company Strategy" window (the boardroom): how managers prioritise projects.
 */
(function (CFT) {
  'use strict';
  const { util, staff, projects, management } = CFT;
  const { esc } = util;
  const { $, empty } = CFT.ui.components;

  CFT.ui.panels.strategy = function renderStrategy(s) {
    const current = management.strategyOf(s);
    const options = Object.entries(management.STRATEGIES).map(([id, st]) =>
      `<button class="strat ${id === current ? 'active' : ''}" data-action="set-strategy" data-strategy="${id}">
        <b>${st.name}</b><span class="muted">${st.desc}</span></button>`).join('');

    const managers = s.employees.filter(e => staff.is(e, 'manager'));
    const crew = s.employees.filter(e => e.managed && e.assignedTo !== null).map(e => {
      const p = projects.find(s, e.assignedTo);
      return p ? `<div class="muted">${esc(e.name)} → ${esc(p.title)}</div>` : '';
    }).join('');
    const team = managers.length
      ? `<div class="card"><div class="title">Management team</div>
          ${managers.map(m => `<div class="muted">${esc(m.name)} · Management ${m.mgmt}</div>`).join('')}
          <div class="muted">Managing ${management.managedCount(s)}/${management.capacity(s)} staff</div>${crew}</div>`
      : empty('No managers yet. Hire one from the recruiting desk so the strategy can be carried out.');

    $('strategy').innerHTML = options + team;
  };
})(window.CFT);
