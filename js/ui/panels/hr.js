/**
 * "HR Advisor" window. Shows the advice computed by CFT.hrAdvisor (js/employees/hr.js), or an offer to hire an HR
 * specialist when the company has none.
 */
(function (CFT) {
  'use strict';
  const { util, staff, hrAdvisor } = CFT;
  const { esc, money } = util;
  const { $, rich, trainButton, hireButton } = CFT.ui.components;

  const GROUP_TITLES = {
    blocked: "Accepted projects you can't complete yet",
    late: 'Accepted projects that will miss their deadline',
    bench: 'Idle people who could be working',
    requests: 'Skills that open client requests need',
    market: 'Skills clients commonly ask for that you are weak in',
  };

  function actionButton(s, a) {
    if (a.kind === 'train') {
      const e = s.employees.find(x => x.id === a.employeeId);
      return e ? trainButton(s, e, a.skill, a.primary) : '';
    }
    const c = s.candidates.find(x => x.id === a.candidateId);
    return c ? hireButton(s, c, a.primary) : '';
  }

  function itemCard(s, item) {
    const rows = item.rows.map(r => `<div class="hrrow">
      <div>${rich(r.label)}</div>
      ${r.lines.map(l => `<div class="muted">${rich(l)}</div>`).join('')}
      ${r.actions.length ? `<div class="tags">${r.actions.map(a => actionButton(s, a)).join('')}</div>` : ''}
    </div>`).join('');
    return `<div class="card">
      <div class="row"><span class="title">${esc(item.title)}</span><span class="tag ${item.severity === 'bad' ? 'missing' : 'ok'}">${item.tag}</span></div>
      <div class="muted">${esc(item.sub)}</div>
      ${rows}
    </div>`;
  }

  function noHrYet(s) {
    const candidate = s.candidates.find(c => staff.is(c, 'hr'));
    const offer = candidate
      ? `<div class="muted">${esc(candidate.name)} is available for ${money(candidate.salary)}/mo.${
        s.employees.length >= s.desks ? ' <span class="warn">No free desk: expand the office first.</span>' : ''}</div>
         ${hireButton(s, candidate, true, false)}`
      : '<div class="muted">No HR candidate right now. Check the recruiting desk after the next candidate refresh.</div>';
    return `<div class="card"><div class="title">No HR specialist yet</div>
      <div class="muted">HR looks at the projects you have accepted, tells you which ones can't be completed with your current skills, and what to train to fix that.</div>
      ${offer}</div>`;
  }

  CFT.ui.panels.hr = function renderHR(s) {
    const hr = s.employees.find(e => staff.is(e, 'hr'));
    if (!hr) { $('hr').innerHTML = noHrYet(s); return; }

    const { mode, items } = hrAdvisor.advise(s);
    let html = `<div class="muted">${esc(hr.name)} reviewed your company on day ${s.day}.</div>`;
    const idle = hrAdvisor.idleWorkers(s);
    if (idle.length) {
      const wages = idle.reduce((sum, e) => sum + (e.salary || 0), 0);
      html += `<div class="muted">Idle right now: ${idle.map(e => esc(e.name)).join(', ')}${wages ? ` (${money(wages)}/mo in wages)` : ''}. ` +
        (mode === 'projects' ? 'Managers put them on projects they can help with; see below for who needs training first.' : 'Training them for the skills below puts them to work.') + '</div>';
    }
    if (mode === 'lacking') html += '<div class="muted">You have no accepted projects, so here is where the company is lacking skills.</div>';
    if (!items.length) {
      html += mode === 'projects'
        ? '<div class="card"><div class="title">All good</div><div class="muted">Every accepted project can be completed on time with the people you have.</div></div>'
        : '<div class="card"><div class="title">No skill gaps</div><div class="muted">Your team covers every open request and the skill levels clients commonly ask for.</div></div>';
    }
    let group = null;
    for (const item of items) {
      if (item.group !== group) { group = item.group; html += `<h3 class="hrgroup">${GROUP_TITLES[group]}</h3>`; }
      html += itemCard(s, item);
    }
    $('hr').innerHTML = html;
  };
})(window.CFT);
