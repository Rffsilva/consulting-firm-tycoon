/**
 * "Office" window (the facilities table): running costs and buying more desks.
 */
(function (CFT) {
  'use strict';
  const { config, util, company } = CFT;
  const { money } = util;
  const { $ } = CFT.ui.components;

  CFT.ui.panels.facilities = function renderFacilities(s) {
    const { wages, rent, total } = company.monthlyCosts(s);
    const dueIn = config.DAYS_PER_MONTH - (s.day % config.DAYS_PER_MONTH);
    const full = s.desks >= config.MAX_DESKS;
    $('office').innerHTML = `<div class="card">
      <div class="muted">Monthly burn: ${money(total)} (wages ${money(wages)} + rent ${money(rent)}), due in ${dueIn} days.</div>
      <div class="muted">Delivered ${s.completed} · Failed ${s.failed}</div>
      <button data-action="expand-office" ${s.money < config.DESK_COST || full ? 'disabled' : ''}>
        ${full ? 'Office is full size' : `+${config.DESKS_PER_EXPANSION} desks (${money(config.DESK_COST)})`}</button>
    </div>`;
  };
})(window.CFT);
