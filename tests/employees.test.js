/* Tests for js/employees: roles, managers and the HR advisor. */
(function (CFT) {
  'use strict';
  const { staff, management, hrAdvisor } = CFT;

  describe('roles', () => {
    test('every employee type resolves to its role', () => {
      const s = fx.state();
      const ann = fx.person(s, 'Ann'), mia = fx.manager(s, 'Mia', 2), hana = fx.person(s, 'Hana', {}, { role: 'hr' });
      assert.deepEqual([s.employees[0], ann, mia, hana].map(e => staff.roleOf(e).id), ['owner', 'consultant', 'manager', 'hr']);
    });

    test('only the owner and consultants do project work', () => {
      const s = fx.state();
      fx.person(s, 'Ann'); fx.manager(s, 'Mia', 2); fx.person(s, 'Hana', {}, { role: 'hr' });
      assert.deepEqual(staff.projectWorkers(s).map(e => e.name), ['You (Owner)', 'Ann']);
    });

    test('managers can also train Management', () => {
      const s = fx.state();
      assert.equal(staff.trainableSkills(fx.manager(s, 'Mia', 2))[0], 'Management');
      assert.ok(!staff.trainableSkills(fx.person(s, 'Ann')).includes('Management'));
    });
  });

  // Three equally skilled workers and three Strategy projects: a cheap one accepted first, a rich one, a tight one.
  function strategyScenario(strategy) {
    const s = fx.state({ withOwner: false });
    fx.manager(s, 'Mia', 3);
    const workers = ['W1', 'W2', 'W3'].map(n => fx.person(s, n, { Strategy: 5 }));
    fx.project(s, 'First and cheap', [{ skill: 'Strategy', need: 100, minLevel: 2 }], { days: 30, reward: 2000 });
    fx.project(s, 'Rich', [{ skill: 'Strategy', need: 100, minLevel: 2 }], { days: 30, reward: 9000 });
    fx.project(s, 'Tight', [{ skill: 'Strategy', need: 100, minLevel: 2 }], { days: 8, reward: 4000 });
    s.strategy = strategy;
    management.autoAssign(s);
    return workers.map(w => s.projects.find(p => p.id === w.assignedTo).title);
  }

  describe('managers', () => {
    test('first come, first served staffs the oldest project', () => {
      assert.deepEqual(strategyScenario('fifo'), ['First and cheap', 'First and cheap', 'First and cheap']);
    });

    test('maximise revenue staffs the best-paying project', () => {
      assert.deepEqual(strategyScenario('revenue'), ['Rich', 'Rich', 'Rich']);
    });

    test('protect deadlines staffs the tightest project', () => {
      assert.deepEqual(strategyScenario('deadline'), ['Tight', 'Tight', 'Tight']);
    });

    test('managers only place people who can contribute, and never move manual assignments', () => {
      const s = fx.state({ withOwner: false });
      fx.manager(s, 'Mia', 3);
      const coder = fx.person(s, 'Coder', { Technology: 5 });
      const placed = fx.person(s, 'Placed', { Strategy: 5 });
      const p = fx.project(s, 'Strategy job', [{ skill: 'Strategy', need: 50 }]);
      const other = fx.project(s, 'Other job', [{ skill: 'Strategy', need: 50 }]);
      placed.assignedTo = other.id; // the player's choice
      management.autoAssign(s);
      assert.equal(coder.assignedTo, null, 'nobody needs Technology');
      assert.equal(placed.assignedTo, other.id);
      assert.ok(p);
    });

    test('managers respect their capacity (2 + Management level)', () => {
      const s = fx.state({ withOwner: false });
      fx.manager(s, 'Mia', 1); // handles 3
      const workers = [1, 2, 3, 4, 5].map(n => fx.person(s, `W${n}`, { Strategy: 3 }));
      fx.project(s, 'P', [{ skill: 'Strategy', need: 500 }]);
      management.autoAssign(s);
      assert.equal(workers.filter(w => w.assignedTo !== null).length, 3);
      assert.equal(management.managedCount(s), 3);
    });
  });

  describe('HR advisor', () => {
    test('a project nobody can do: suggests training the closest person', () => {
      const s = fx.state();
      fx.person(s, 'Hana', {}, { role: 'hr' });
      fx.project(s, 'Blocked', [{ skill: 'Analytics', need: 40, minLevel: 3 }]);
      fx.project(s, 'Fine', [{ skill: 'Strategy', need: 10, minLevel: 2 }]);
      const { mode, items } = hrAdvisor.advise(s);
      assert.equal(mode, 'projects');
      assert.deepEqual(items.map(i => i.title), ['Blocked'], 'only the project with a problem is listed');
      const [action] = items[0].rows[0].actions;
      assert.deepEqual(action, { kind: 'train', employeeId: s.employees[0].id, skill: 'Analytics', primary: true });
    });

    test('an idle person is trained rather than someone already busy, even at the same cost', () => {
      const s = fx.state();
      const ann = fx.person(s, 'Ann', { Analytics: 2 });
      const busy = fx.project(s, 'Busy work', [{ skill: 'Strategy', need: 100, minLevel: 2 }]);
      s.employees[0].assignedTo = busy.id; // the owner (Analytics 2) is working
      fx.project(s, 'Stalled', [{ skill: 'Analytics', need: 40, minLevel: 3 }]);
      const item = hrAdvisor.advise(s).items.find(i => i.title === 'Stalled');
      const [action] = item.rows[0].actions;
      assert.equal(action.employeeId, ann.id);
      assert.ok(item.rows[0].lines[0].includes('Ann is idle'), item.rows[0].lines[0]);
      assert.deepEqual(hrAdvisor.idleWorkers(s).map(e => e.name), ['Ann']);
    });

    test('a too-slow project suggests training an idle person to join it', () => {
      const s = fx.state();
      const ann = fx.person(s, 'Ann', { Strategy: 1 });
      fx.project(s, 'Huge', [{ skill: 'Strategy', need: 200, minLevel: 2 }], { days: 10 });
      const [item] = hrAdvisor.advise(s).items;
      assert.equal(item.group, 'late');
      assert.deepEqual(item.rows[0].actions[0], { kind: 'train', employeeId: ann.id, skill: 'Strategy', primary: true });
    });

    test('a project that can be staffed but not in time is flagged as too slow', () => {
      const s = fx.state();
      fx.project(s, 'Huge', [{ skill: 'Strategy', need: 200, minLevel: 2 }], { days: 10 });
      const { items } = hrAdvisor.advise(s);
      assert.equal(items[0].group, 'late');
      assert.equal(items[0].tag, 'TOO SLOW');
    });

    test('hiring is recommended when it is cheaper than a long training plan', () => {
      const s = fx.state();
      fx.project(s, 'Tech', [{ skill: 'Technology', need: 40, minLevel: 6 }]); // owner has Technology 1
      fx.candidate(s, 'Cheap Coder', { Technology: 6 }, { salary: 500 });
      const action = hrAdvisor.advise(s).items[0].rows[0].actions.find(a => a.primary);
      assert.equal(action.kind, 'hire');
    });

    test('with no projects: lists missing skills, counting only requests that level opens up', () => {
      const s = fx.state(); // best Finance is 3 (the owner)
      fx.offer(s, 'Needs Finance 4', [{ skill: 'Finance', need: 30, minLevel: 4 }], { reward: 4000 });
      fx.offer(s, 'Needs Finance 5', [{ skill: 'Finance', need: 30, minLevel: 5 }], { reward: 6000 });
      const { mode, items } = hrAdvisor.advise(s);
      assert.equal(mode, 'lacking');
      const finance = items.find(i => i.title === 'Finance 4+');
      assert.ok(finance, 'Finance 4+ is listed');
      assert.ok(finance.rows[0].label.startsWith('1 client request would open up, worth $4,000'), finance.rows[0].label);
    });
  });
})(window.CFT);
