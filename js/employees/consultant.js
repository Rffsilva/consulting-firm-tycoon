/**
 * Consultants: the people who do project work. One strong skill (their title) and one or two weaker ones.
 * Shirt colour shows their strongest skill.
 */
(function (CFT) {
  'use strict';
  const { config, palette, util, store, projects, staff } = CFT;
  const { rnd, pick, sum } = util;

  const strongestSkill = e => config.SKILLS.reduce((a, b) => (e.skills[b] > e.skills[a] ? b : a));

  staff.registerRole({
    id: 'consultant',
    worksOnProjects: true,
    managedByManagers: true,

    createCandidate(s) {
      const primary = pick(config.SKILLS);
      const cap = staff.marketSkillCap(s);
      const skills = staff.emptySkills();
      skills[primary] = rnd(Math.max(2, cap - 4), cap);
      for (let i = 0; i < rnd(1, 2); i++) {
        const secondary = pick(config.SKILLS);
        if (secondary !== primary) {
          skills[secondary] = Math.max(skills[secondary], rnd(1, Math.max(2, Math.floor(skills[primary] * 0.7))));
        }
      }
      const total = sum(Object.values(skills));
      return {
        id: store.nextId(s), name: staff.randomName(), title: `${primary} Consultant`, skills,
        salary: staff.roundSalary(500 + total * 110 + rnd(-100, 100)), assignedTo: null,
      };
    },

    look(e) {
      const h = staff.lookSeed(e);
      return { ...staff.baseLook(e), shirt: palette.SKILL[strongestSkill(e)], style: (h >> 8) % 4, glasses: (h >> 10) % 4 === 0, tie: (h >> 12) % 3 === 0 ? '#e5484d' : null };
    },

    isBusy: (e, s) => projects.canHelp(e, projects.find(s, e.assignedTo)),

    /** "z" when on the bench, a red "?" when on a project they can't do anything for. */
    deskBubble(e, s) {
      const p = projects.find(s, e.assignedTo);
      if (!p) return { text: 'z', color: '#4a6ea8', bob: true };
      if (!projects.canHelp(e, p)) return { text: '?', color: '#e5484d' };
      return null;
    },
  });
})(window.CFT);
