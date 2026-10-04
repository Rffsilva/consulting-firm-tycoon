/**
 * The event log under the office.
 */
(function (CFT) {
  'use strict';
  const { esc } = CFT.util;
  const { $ } = CFT.ui.components;

  CFT.ui.panels.log = function renderLog(s) {
    $('log').innerHTML = s.log.map(l => `<div class="${l.cls}"><span class="muted">D${l.day}</span> ${esc(l.text)}</div>`).join('');
  };
})(window.CFT);
