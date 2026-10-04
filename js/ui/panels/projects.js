/**
 * Active projects: shown both in the "Active Projects" window and in the side panel next to the office.
 */
(function (CFT) {
  'use strict';
  const { $, projectCard, empty } = CFT.ui.components;

  CFT.ui.panels.projects = function renderProjects(s) {
    const html = s.projects.map(p => projectCard(p, s)).join('') || empty('No active projects. Accept a client request.');
    $('projects').innerHTML = html;
    $('sideProjects').innerHTML = html;
  };
})(window.CFT);
