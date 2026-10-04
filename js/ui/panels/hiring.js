/**
 * "Candidates" window: the job market.
 */
(function (CFT) {
  'use strict';
  const { config, util } = CFT;
  const { $, candidateCard, empty } = CFT.ui.components;

  CFT.ui.panels.hiring = function renderHiring(s) {
    $('refreshCand').textContent = `Refresh (${util.money(config.CANDIDATE_REFRESH_COST)})`;
    $('candidates').innerHTML = s.candidates.map(c => candidateCard(c, s)).join('') || empty('No candidates.');
  };
})(window.CFT);
