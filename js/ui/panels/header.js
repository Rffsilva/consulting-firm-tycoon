/**
 * The numbers in the header: day, cash, reputation, desks used.
 */
(function (CFT) {
  'use strict';
  const { util } = CFT;
  const { $ } = CFT.ui.components;

  CFT.ui.panels.header = function renderHeader(s) {
    $('day').textContent = s.day;
    $('money').textContent = util.money(s.money);
    $('money').className = s.money < 0 ? 'bad' : '';
    $('rep').textContent = s.rep;
    $('desks').textContent = `${s.employees.length}/${s.desks}`;
  };
})(window.CFT);
