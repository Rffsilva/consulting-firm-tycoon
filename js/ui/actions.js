/**
 * Handles every button and dropdown in the windows. Elements declare what they do with data attributes:
 *
 *   <button data-action="hire" data-id="12">       ->  ACTIONS.hire(button)
 *   <select data-action="assign" data-id="3">      ->  CHANGE_ACTIONS.assign(select)
 *
 * To add a button: give it a data-action and add a handler below. Handlers change the state through CFT.company
 * (or another sim module); the screen is re-rendered afterwards.
 */
(function (CFT) {
  'use strict';
  const { store, company, projects, management } = CFT;

  const id = el => Number(el.dataset.id);

  /** Tells the player why an action didn't happen, when there is something to say. */
  function report(result) {
    if (!result.ok && result.error) alert(result.error);
  }

  const ACTIONS = {
    'accept-offer': el => projects.accept(store.state, id(el)),
    'hire': el => report(company.hire(store.state, id(el))),
    'fire': el => {
      const e = store.state.employees.find(x => x.id === id(el));
      if (e && confirm(`Fire ${e.name}?`)) report(company.fire(store.state, e.id));
    },
    // The Train button on an employee card trains whatever is picked in the dropdown next to it.
    // (The same card can be on screen twice, so look next to the button rather than up an id.)
    'train': el => {
      const select = el.parentElement.querySelector('select.train-select');
      if (select && select.value) report(company.train(store.state, id(el), select.value));
    },
    'train-skill': el => report(company.train(store.state, id(el), el.dataset.skill)),
    'set-strategy': el => { management.setStrategy(store.state, el.dataset.strategy); store.save(store.state); },
    'expand-office': () => report(company.expandOffice(store.state)),
    'refresh-candidates': () => report(company.refreshCandidates(store.state)),
    'new-game': () => { if (confirm('Discard this game and start over?')) CFT.ui.session.newGame(); },
    'restart': () => { CFT.ui.session.newGame(); CFT.ui.clock.setSpeed(1); },
  };

  const CHANGE_ACTIONS = {
    assign: el => company.assign(store.state, id(el), el.value === '' ? null : Number(el.value)),
  };

  CFT.ui.actions = {
    init() {
      document.addEventListener('click', e => {
        const el = e.target.closest('button[data-action]');
        if (!el || el.disabled || !ACTIONS[el.dataset.action]) return;
        ACTIONS[el.dataset.action](el);
        CFT.ui.render();
      });
      document.addEventListener('change', e => {
        const el = e.target;
        if (el.tagName !== 'SELECT') return;
        // Dropdowns keep focus after a choice, which would pause the clock-driven screen updates; release it.
        el.blur();
        if (!CHANGE_ACTIONS[el.dataset.action]) return;
        CHANGE_ACTIONS[el.dataset.action](el);
        CFT.ui.render();
      });
    },
  };
})(window.CFT);
