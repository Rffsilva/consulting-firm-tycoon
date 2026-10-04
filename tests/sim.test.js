/* Tests for js/sim: projects, company actions and the daily simulation. */
(function (CFT) {
  'use strict';
  const { config, projects, company, simulation, store } = CFT;

  describe('projects', () => {
    test('people work on the open requirement they are best at', () => {
      const s = fx.state();
      const ann = fx.person(s, 'Ann', { Strategy: 3, Analytics: 5 });
      const p = fx.project(s, 'P', [{ skill: 'Strategy', need: 10 }, { skill: 'Analytics', need: 10 }]);
      assert.equal(projects.taskFor(ann, p).skill, 'Analytics');
      p.reqs[1].done = 10;
      assert.equal(projects.taskFor(ann, p).skill, 'Strategy', 'moves on once Analytics is done');
    });

    test('minimum levels decide who can help', () => {
      const s = fx.state();
      const bob = fx.person(s, 'Bob', { Technology: 2 });
      const p = fx.project(s, 'P', [{ skill: 'Technology', need: 10, minLevel: 3 }]);
      assert.equal(projects.canHelp(bob, p), false);
      bob.skills.Technology = 3;
      assert.equal(projects.canHelp(bob, p), true);
    });

    test('eta adds up the team and is Infinity when a requirement has nobody', () => {
      const s = fx.state();
      const a = fx.person(s, 'A', { Strategy: 4 }), b = fx.person(s, 'B', { Strategy: 6 });
      const p = fx.project(s, 'P', [{ skill: 'Strategy', need: 50 }]);
      assert.equal(projects.eta(p, [a, b]), 5);
      p.reqs.push({ skill: 'Finance', need: 10, done: 0, minLevel: 1 });
      assert.equal(projects.eta(p, [a, b]), Infinity);
    });

    test('delivering pays the reward, an early bonus and reputation', () => {
      const s = fx.state();
      const p = fx.project(s, 'P', [{ skill: 'Strategy', need: 10, done: 10 }], { days: 10, reward: 1000 });
      projects.settle(s);
      // 10 days early: 10% bonus
      assert.equal(s.money, config.STARTING_CASH + 1100);
      assert.equal(s.rep, p.repGain);
      assert.equal(s.projects.length, 0);
      assert.equal(s.completed, 1);
    });

    test('missing a deadline costs a fine and reputation (never below 0)', () => {
      const s = fx.state();
      fx.project(s, 'P', [{ skill: 'Strategy', need: 10 }], { days: 0, reward: 1000 });
      s.day++;
      projects.settle(s);
      assert.equal(s.money, config.STARTING_CASH - 250);
      assert.equal(s.rep, 0);
      assert.equal(s.failed, 1);
    });

    test('closing a project sends its people back to the bench', () => {
      const s = fx.state();
      const ann = fx.person(s, 'Ann', { Strategy: 3 });
      const p = fx.project(s, 'P', [{ skill: 'Strategy', need: 10 }]);
      ann.assignedTo = p.id; ann.managed = true;
      projects.close(s, p);
      assert.equal(ann.assignedTo, null);
      assert.equal(ann.managed, false);
    });
  });

  describe('company', () => {
    test('hiring needs a free desk and the recruiting fee', () => {
      const s = fx.state();
      s.desks = 1;
      const c = fx.candidate(s, 'Cora', { Finance: 4 }, { salary: 1200 });
      assert.equal(company.hire(s, c.id).error, 'No free desks. Expand the office.');
      s.desks = 3; s.money = 100;
      assert.equal(company.hire(s, c.id).error, 'Not enough cash for the recruiting fee.');
      s.money = 5000;
      assert.equal(company.hire(s, c.id).ok, true);
      assert.equal(s.money, 3800);
      assert.equal(s.employees.length, 2);
      assert.equal(s.candidates.length, 0);
    });

    test('training costs more at higher levels and raises the salary', () => {
      const s = fx.state();
      const ann = fx.person(s, 'Ann', { Analytics: 2 });
      company.train(s, ann.id, 'Analytics');
      assert.equal(ann.skills.Analytics, 3);
      assert.equal(s.money, config.STARTING_CASH - (config.TRAIN_BASE_COST + 2 * config.TRAIN_COST_PER_LEVEL));
      assert.equal(ann.salary, 1000 + config.TRAIN_SALARY_RAISE);
    });

    test('the owner trains without a salary, managers can train Management', () => {
      const s = fx.state();
      const owner = s.employees[0], mia = fx.manager(s, 'Mia', 2);
      company.train(s, owner.id, 'Strategy');
      assert.equal(owner.salary, 0);
      company.train(s, mia.id, 'Management');
      assert.equal(mia.mgmt, 3);
      assert.equal(mia.salary, 1000 + config.MANAGEMENT_SALARY_RAISE);
    });

    test('training stops at level 10', () => {
      const s = fx.state();
      const ann = fx.person(s, 'Ann', { Analytics: 10 });
      assert.equal(company.train(s, ann.id, 'Analytics').ok, false);
      assert.equal(ann.skills.Analytics, 10);
    });

    test('assigning by hand clears the managed flag', () => {
      const s = fx.state();
      const ann = fx.person(s, 'Ann', {}, { managed: true });
      company.assign(s, ann.id, null);
      assert.equal(ann.managed, false);
    });

    test('the office grows two desks at a time up to the maximum', () => {
      const s = fx.state();
      s.money = 1e6; s.desks = config.MAX_DESKS - 1;
      assert.equal(company.expandOffice(s).ok, true);
      assert.equal(s.desks, config.MAX_DESKS);
      assert.equal(company.expandOffice(s).ok, false);
    });

    test('there is always a manager on the market, and an HR specialist until you hire one', () => {
      const s = fx.state();
      company.refillCandidates(s);
      assert.equal(s.candidates.length, 4);
      assert.ok(s.candidates.some(c => c.role === 'manager'));
      assert.ok(s.candidates.some(c => c.role === 'hr'));
      fx.person(s, 'Hana', {}, { role: 'hr' });
      company.refillCandidates(s);
      assert.ok(!s.candidates.some(c => c.role === 'hr'));
    });
  });

  describe('simulation', () => {
    test('a new game has the owner, five requests and four candidates', () => {
      const s = simulation.newGame();
      assert.ok(s.employees[0].owner);
      assert.equal(s.offers.length, config.MAX_OFFERS);
      assert.equal(s.candidates.length, 4);
    });

    test('a day of work: each person adds their level; managers do no project work', () => {
      const s = fx.state();
      const ann = fx.person(s, 'Ann', { Strategy: 4 });
      const mia = fx.manager(s, 'Mia', 1);
      mia.skills.Strategy = 9;
      const p = fx.project(s, 'P', [{ skill: 'Strategy', need: 100 }]);
      ann.assignedTo = p.id; mia.assignedTo = p.id;
      simulation.advanceDay(s);
      assert.equal(p.reqs[0].done, 4);
    });

    test('wages and rent are paid at the end of each month', () => {
      const s = fx.state();
      fx.person(s, 'Ann', {}, { salary: 1000 });
      s.day = config.DAYS_PER_MONTH - 1;
      const before = s.money;
      simulation.advanceDay(s);
      assert.equal(s.money, before - 1000 - s.desks * config.RENT_PER_DESK);
    });

    test('dropping below the bankruptcy limit ends the game', () => {
      const s = fx.state();
      s.money = config.BANKRUPTCY_LIMIT - 1;
      assert.equal(simulation.advanceDay(s).bankrupt, true);
    });
  });

  describe('store', () => {
    test('a saved game loads back unchanged', () => {
      const s = simulation.newGame();
      store.save(s, 'cft-test-save');
      assert.deepEqual(store.load('cft-test-save'), s);
      store.clear('cft-test-save');
      assert.equal(store.load('cft-test-save'), null);
    });
  });
})(window.CFT);
