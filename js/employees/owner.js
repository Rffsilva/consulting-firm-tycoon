/**
 * The owner: the player's own character. Can work on projects like a consultant, has no salary, is never moved by
 * managers, and is drawn as the walking character instead of sitting at a desk.
 */
(function (CFT) {
  'use strict';
  const { config, palette, store, staff } = CFT;

  staff.registerRole({
    id: 'owner',
    worksOnProjects: true,
    managedByManagers: false,
    drawnAtDesk: false,

    /** The owner is created once, with every new game. */
    create(s) {
      return {
        id: store.nextId(s), name: 'You (Owner)', title: 'Founder', owner: true, salary: 0, assignedTo: null,
        skills: { ...config.OWNER_SKILLS },
      };
    },

    look: () => ({ id: 999, shirt: '#4c6ef5', tie: '#e5484d', hair: '#4a2f1b', skin: palette.SKIN[0], style: 0 }),
    deskLabel: () => 'Your desk',
  });
})(window.CFT);
