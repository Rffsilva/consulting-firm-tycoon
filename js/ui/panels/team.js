/**
 * "Your Team" window, and the single-employee window opened from a desk.
 */
(function (CFT) {
  'use strict';
  const { windows } = CFT.ui;
  const { $, employeeCard } = CFT.ui.components;

  CFT.ui.panels.team = function renderTeam(s) {
    $('team').innerHTML = s.employees.map(e => employeeCard(e, s)).join('');

    if (windows.employeeId !== null) {
      const e = s.employees.find(x => x.id === windows.employeeId);
      if (e) $('empDetail').innerHTML = employeeCard(e, s);
      else windows.close(); // the employee was just fired
    }
  };
})(window.CFT);
