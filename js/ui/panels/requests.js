/**
 * "Client Requests" window: the offers on the board.
 */
(function (CFT) {
  'use strict';
  const { $, offerCard, empty } = CFT.ui.components;

  CFT.ui.panels.requests = function renderRequests(s) {
    $('offers').innerHTML = s.offers.map(o => offerCard(o, s)).join('') || empty('No requests right now.');
  };
})(window.CFT);
