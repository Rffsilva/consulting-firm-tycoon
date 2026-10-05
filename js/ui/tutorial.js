/**
 * "How to play": a short, step-by-step introduction in the 'tutorial' window. Opened from the header button, and
 * automatically once for brand-new players. Numbers come from config so the text stays in sync with the game.
 */
(function (CFT) {
  'use strict';
  const { config, palette, util } = CFT;
  const { money } = util;
  const { windows, components: { $ } } = CFT.ui;

  const SEEN_KEY = 'cft-tutorial-seen';

  const TOUCH = () => matchMedia('(pointer: coarse)').matches;
  const swatch = color => `<span class="swatch" style="background:${color}"></span>`;
  const key = k => `<kbd>${k}</kbd>`;

  /** Each step: a title and some HTML. Keep them short: this is a quick intro, not a manual. */
  const STEPS = [
    {
      title: 'Welcome to your consulting firm',
      body: `
        <p>You've just founded a consulting firm. Clients post projects, and you need people with the right skills to deliver them.</p>
        <ul>
          <li><b>Win work:</b> accept client requests.</li>
          <li><b>Build a team:</b> hire and train people with the skills those requests need.</li>
          <li><b>Deliver on time</b> to earn money and reputation. More reputation brings bigger, better-paid projects.</li>
        </ul>
        <p>Watch your cash: wages and rent are paid every ${config.DAYS_PER_MONTH} days, and the firm goes bankrupt below ${money(config.BANKRUPTCY_LIMIT)}.</p>`,
    },
    {
      title: 'Getting around',
      body: `
        <p>You are the character in the blue suit. ${TOUCH()
          ? 'Tap the floor to walk, and tap a desk or board to walk over and open it.'
          : `Click the floor or use ${key('W')}${key('A')}${key('S')}${key('D')} / arrow keys to walk. Click a desk or board, or stand next to it and press ${key('E')}, to open it.`}</p>
        <ul class="tut-places">
          <li><b>Client requests board</b> (top wall): new work.</li>
          <li><b>Project whiteboard</b> (top wall): progress on your projects.</li>
          <li><b>Recruiting desk</b>: hire people. Candidates wait on the rug.</li>
          <li><b>Boardroom</b>: company strategy for your managers.</li>
          <li><b>Facilities</b>: buy more desks.</li>
          <li><b>Desks</b>: open an employee to assign or train them.</li>
        </ul>
        <p>Every window is also in the buttons at the top. The game pauses while a window is open. Use ⏸ 1× 2× 4× to control time.</p>`,
    },
    {
      title: 'How work gets done',
      body: `
        <p>Each request needs <b>points</b> in some skills (Strategy, Analytics, Technology, Finance, Operations), with a <b>minimum level</b>.
          On the board, a <span class="tag ok">green</span> tag means someone on your team qualifies, and a <span class="tag missing">red</span> one means nobody does yet.</p>
        <p>Every day, each person on a project adds points equal to their skill level to the requirement they're best at. Someone with Analytics 5 adds 5 points a day.</p>
        <p>Finish before the deadline for the reward, a bonus for finishing early, and reputation. Miss it and you pay a fine and lose reputation.</p>
        <p>Over desks: a <b>z</b> means that person is idle, and a red <b>?</b> means they're on a project they can't help with.</p>`,
    },
    {
      title: 'Who does what',
      body: `
        <ul class="tut-roles">
          <li>${swatch('#4c6ef5')}<div><b>You (the owner)</b>: can work on projects too, for free. Use the <b>You</b> card on the side to pick one.</div></li>
          <li>${swatch(palette.SKILL.Strategy)}${swatch(palette.SKILL.Analytics)}${swatch(palette.SKILL.Technology)}<div><b>Consultants</b> do the project work.
            Their shirt colour shows their strongest skill. Train them to raise a skill; it costs money and raises their salary a little.</div></li>
          <li>${swatch('#5c677d')}<div><b>Managers</b> (grey suit, yellow tie) don't do project work. Every morning they put idle consultants
            on projects they can help with. Each handles ${config.MANAGER_BASE_CAPACITY} + their Management level people.
            Anyone you assign by hand is left alone.</div></li>
          <li>${swatch('#e64980')}<div><b>HR specialist</b> (pink) tells you which accepted projects can't be done and who to train or hire to fix it.
            An orange <b>!</b> over their desk means there's a problem.</div></li>
        </ul>
        <p>In the <b>boardroom</b>, choose how managers prioritise: protect deadlines, maximise revenue, or first come, first served.</p>`,
    },
    {
      title: 'Your first few minutes',
      body: `
        <ol>
          <li>Open the <b>client requests board</b> and accept a request with mostly green tags.</li>
          <li>Put yourself on it from the <b>You</b> card.</li>
          <li>At the <b>recruiting desk</b>, hire a consultant whose skills match your red tags. The fee is one month's salary.</li>
          <li>Once you have a few consultants, hire a <b>manager</b>. When projects get stuck, hire an <b>HR specialist</b>.</li>
          <li>Keep an eye on the <b>Office</b> window's monthly burn before hiring more.</li>
        </ol>
        <p>You can reopen this guide any time with <b>How to play</b>. Good luck!</p>`,
    },
  ];

  const tutorial = {
    step: 0,

    next() { tutorial.step = Math.min(STEPS.length - 1, tutorial.step + 1); },
    prev() { tutorial.step = Math.max(0, tutorial.step - 1); },

    /** Opens the guide for players who have never played (no saved game) and haven't seen it. */
    showToNewPlayer(isNewPlayer) {
      let seen = false;
      try { seen = localStorage.getItem(SEEN_KEY) === '1'; localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* storage blocked */ }
      if (isNewPlayer && !seen) windows.open('tutorial');
    },

    init() {
      windows.onOpen(name => { if (name === 'tutorial') tutorial.step = 0; }); // always start from the beginning
    },
  };

  CFT.ui.panels.tutorial = function renderTutorial() {
    const i = tutorial.step, step = STEPS[i], last = i === STEPS.length - 1;
    const dots = STEPS.map((_, n) => `<span class="tut-dot ${n === i ? 'on' : ''}"></span>`).join('');
    $('tutorial').innerHTML = `
      <div class="muted">Step ${i + 1} of ${STEPS.length}</div>
      <h3 class="tut-title">${step.title}</h3>
      <div class="tut-body">${step.body}</div>
      <div class="tut-nav">
        <button data-action="tutorial-prev" ${i === 0 ? 'disabled' : ''}>Back</button>
        <span class="tut-dots">${dots}</span>
        ${last ? '<button class="primary" data-action="tutorial-done">Start playing</button>'
          : '<button class="primary" data-action="tutorial-next">Next</button>'}
      </div>`;
  };

  CFT.ui.tutorial = tutorial;
})(window.CFT);
