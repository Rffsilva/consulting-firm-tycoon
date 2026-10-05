/**
 * Draws the office: floor, walls, boards, desks with seated staff, the lounge stations, and candidates.
 * Called every frame by js/office/loop.js, back to front.
 */
(function (CFT) {
  'use strict';
  const { config, palette, staff, projects } = CFT;
  const { T, W, H, deskPos, PLANTS, CANDIDATE_X, CANDIDATE_Y } = CFT.office.map;
  const { ctx, OL, rect, box, text, badge, bubble, now } = CFT.office.painter;
  const { lookOf, drawPerson } = CFT.office.sprites;

  const SHADOW = 'rgba(42,32,56,.2)';

  // ---------- Floor and walls ----------

  function drawFloor() {
    for (let ty = 2; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        const x = tx * T, y = ty * T;
        if (ty === H - 1 || tx === 0 || tx === W - 1) { // side and bottom walls: dark timber with a paper-lantern trim
          rect(x, y, T, T, '#5a3b2e'); rect(x, y, T, 2, '#7d5640'); rect(x + 7, y, 2, T, '#4a2f24');
        } else if (tx >= 23) { // lounge: polished engawa wooden planks
          rect(x, y, T, T, (ty + (tx >> 1)) % 2 ? '#d9a574' : '#d09a69');
          rect(x, y + 7, T, 1, '#b57e4e'); rect(x, y + 15, T, 1, '#b57e4e'); rect(x + ((ty % 2) ? 5 : 11), y, 1, 7, '#b57e4e');
        } else { // work area: tatami mats (2 x 1 tiles) with dark woven borders
          rect(x, y, T, T, (tx >> 1) % 2 ? '#c8d29a' : '#bfca90');
          rect(x, y, T, 1, '#8f9a62'); rect(x, y + 15, T, 1, '#8f9a62');
          if (tx % 2 === 0) rect(x, y, 1, T, '#8f9a62');
          for (let w = 3; w < 15; w += 4) rect(x, y + w, T, 1, 'rgba(255,255,255,.13)'); // weave
        }
      }
    }
    // top wall: cream plaster, dark timber wainscot
    rect(0, 0, W * T, 2 * T, '#f4e8d2');
    rect(0, 21, W * T, 9, '#6b4430'); rect(0, 21, W * T, 1, '#8a5c42'); rect(0, 30, W * T, 2, '#3f2a20');
    for (let x = 4; x < W * T; x += 16) rect(x, 22, 1, 8, '#573625');
    // shoji window frames with a view of Mt. Fuji and drifting sakura petals
    for (const tx of [2, 6, 10, 14, 18]) {
      const x = tx * T, t = now();
      box(x, 4, 48, 15, '#5a3b2e');
      rect(x + 2, 6, 44, 11, '#bfe4f7'); rect(x + 2, 13, 44, 4, '#d9f0fb');
      // Mt. Fuji: snow-capped cone behind green hills
      for (let r = 0; r < 8; r++) { const w = 4 + r * 4; rect(x + 24 - w / 2, 7 + r, w, 1, r < 2 ? '#fff' : '#6c7fb5'); }
      rect(x + 2, 15, 44, 2, '#8fc79a');
      // petals
      for (let p = 0; p < 3; p++) {
        const px = x + 4 + Math.floor(((t * (3 + p) + tx * 5 + p * 17) % 42)), py = 7 + Math.floor((t * 2 + p * 3 + tx) % 9);
        rect(px, py, 2, 1, palette.SAKURA); rect(px, py + 1, 1, 1, palette.SAKURA_DEEP);
      }
      // shoji lattice
      rect(x + 23, 6, 2, 11, '#6b4430'); rect(x + 2, 11, 44, 1, '#6b4430');
      rect(x + 12, 6, 1, 11, '#8a5c42'); rect(x + 35, 6, 1, 11, '#8a5c42');
    }
    // hanging paper lanterns (chochin) between the windows
    for (const tx of [1, 5, 9, 13, 17]) {
      const lx = tx * T + 8, sway = Math.round(Math.sin(now() * 1.3 + tx));
      rect(lx, 0, 1, 3, OL);
      box(lx - 4 + sway, 3, 8, 10, palette.VERMILION); rect(lx - 4 + sway, 3, 8, 1, '#3a2a2a'); rect(lx - 4 + sway, 12, 8, 1, '#3a2a2a');
      rect(lx - 2 + sway, 6, 4, 1, '#ffd98a'); rect(lx - 2 + sway, 9, 4, 1, '#ffd98a'); rect(lx - 3 + sway, 5, 1, 5, '#f07a6a');
    }
    rect(22 * T + 6, 2 * T, 2, (H - 3) * T, 'rgba(42,32,56,.2)'); // divider between work area and lounge
  }

  function drawDecor() {
    // lounge rug: sakura pink with gold trim and a cherry-blossom motif
    box(24 * T, 9 * T + 4, 4 * T, 3 * T + 4, '#c9506a'); rect(24 * T + 3, 9 * T + 7, 4 * T - 6, 3 * T - 2, '#ffb7c5');
    rect(24 * T + 3, 9 * T + 7, 4 * T - 6, 1, palette.GOLD); rect(24 * T + 3, 12 * T + 3, 4 * T - 6, 1, palette.GOLD);
    for (const [dx, dy] of [[14, 14], [30, 12], [46, 16], [22, 22], [40, 24]]) {
      rect(24 * T + dx, 9 * T + dy, 3, 1, '#fff'); rect(24 * T + dx + 1, 9 * T + dy - 1, 1, 3, '#fff'); rect(24 * T + dx + 1, 9 * T + dy, 1, 1, palette.SAKURA_DEEP);
    }
    // tea & drinks vending machine with a glowing display
    const cx = 28 * T, cy = 2 * T, glow = Math.floor(now() * 2) % 2;
    box(cx + 1, cy, 14, 16, '#3d6bd1'); rect(cx + 3, cy + 2, 10, 8, OL);
    ['#ff7a8a', '#ffd84d', '#6fe39a', '#7ad7ff'].forEach((c, i) => { rect(cx + 4 + (i % 2) * 4, cy + 3 + Math.floor(i / 2) * 3, 3, 2, c); });
    rect(cx + 4, cy + 11, 8, 2, glow ? '#fff3a0' : '#ffd84d'); rect(cx + 11, cy + 13, 2, 2, OL); rect(cx + 3, cy + 14, 5, 1, '#9db8f0');
    // bonsai & sakura pots with swaying blossoms
    for (const [px, py] of PLANTS) {
      const x = px * T, y = py * T, sway = Math.round(Math.sin(now() * 1.5 + px));
      rect(x + 3, y + 14, 10, 2, SHADOW);
      box(x + 4, y + 10, 8, 5, '#3d5a80'); rect(x + 5, y + 11, 6, 1, '#6c8ebf');
      rect(x + 7, y + 5, 2, 6, '#6b4430'); rect(x + 5, y + 7, 2, 1, '#6b4430'); rect(x + 9, y + 6, 2, 1, '#6b4430');
      box(x + 1 + sway, y + 2, 7, 6, palette.SAKURA); box(x + 8 + sway, y + 3, 7, 6, palette.SAKURA); box(x + 4, y, 8, 6, '#ffd0dc');
      rect(x + 3 + sway, y + 4, 1, 1, palette.SAKURA_DEEP); rect(x + 11 + sway, y + 5, 1, 1, palette.SAKURA_DEEP); rect(x + 7, y + 2, 1, 1, palette.SAKURA_DEEP);
    }
  }

  // ---------- Wall boards ----------

  function drawBoards(s) {
    // client requests: one sticky note per open request
    const bx = 24 * T;
    box(bx, 7, 48, 22, palette.VERMILION); rect(bx + 2, 9, 44, 18, '#f0d6a8');
    const notes = ['#fff6a8', '#ffc2d1', '#bde4ff', '#c8f7c5', '#fff', '#e3d0ff'];
    const n = Math.min(s.offers.length, 6);
    for (let i = 0; i < n; i++) {
      const nx = bx + 4 + (i % 3) * 14, ny = 11 + Math.floor(i / 3) * 8;
      rect(nx, ny, 10, 6, notes[i]); rect(nx + 4, ny, 2, 1, '#e5484d'); rect(nx + 2, ny + 3, 6, 1, 'rgba(43,33,64,.35)');
    }
    text('CLIENT REQUESTS', bx + 24, 0, palette.HIGHLIGHT, 'center');
    if (n) badge(bx + 47, 8, s.offers.length);

    // project whiteboard: a progress bar for each of the first three projects
    const wx = 20 * T;
    box(wx, 7, 48, 22, '#6b4430'); rect(wx + 2, 9, 44, 18, '#fff8ea'); rect(wx + 2, 26, 44, 1, '#e3d3b5');
    s.projects.slice(0, 3).forEach((p, i) => {
      const { done, need } = projects.progress(p);
      rect(wx + 5, 11 + i * 5, 38, 3, '#dfe4ec');
      rect(wx + 5, 11 + i * 5, Math.round(38 * done / need), 3, ['#3fbf6a', '#4dabf7', '#ffa94d'][i]);
    });
    text('PROJECTS', wx + 24, 0, '#a5d8ff', 'center');
    if (s.projects.length) badge(wx + 47, 8, s.projects.length);
  }

  // ---------- Desks and staff ----------

  const CHAIR_COLORS = ['#c0392b', '#34447a', '#c9a227', '#3f7d5a']; // vermilion, indigo, gold, matcha

  function drawDesk(s, i) {
    const d = deskPos(i), x = d.x * T, y = d.y * T, e = s.employees[i];
    if (i >= s.desks) { // not bought yet: dashed outline
      ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.setLineDash([3, 3]);
      ctx.strokeRect(x + 1.5, y + 1.5, 3 * T - 3, 2 * T - 3);
      ctx.setLineDash([]);
      return;
    }
    const working = e && e.assignedTo !== null && !!projects.find(s, e.assignedTo);
    // chair (behind the person)
    const chair = CHAIR_COLORS[i % 4], cy = (d.y + 1) * T;
    box(x + 19, cy + 1, 10, 5, chair); box(x + 18, cy + 6, 12, 7, chair); rect(x + 20, cy + 7, 8, 1, 'rgba(255,255,255,.4)');
    // desk
    rect(x + 2, y + 15, 3 * T - 2, 3, SHADOW);
    box(x + 1, y + 6, 3 * T - 2, 7, '#b8764a'); rect(x + 2, y + 7, 3 * T - 4, 1, '#d9986a'); rect(x + 1, y + 12, 3 * T - 2, 1, '#8a5232');
    box(x + 3, y + 12, 3 * T - 6, 3, '#7a4a2c'); box(x + 31, y + 12, 11, 3, '#6b4430'); rect(x + 35, y + 13, 3, 1, palette.GOLD);
    // monitor: scrolling green text when working, a screensaver when idle, off when the desk is empty
    box(x + 16, y - 3, 16, 10, '#3a3556');
    rect(x + 17, y - 2, 14, 7, working ? '#8cf7bf' : e ? '#79b5ff' : '#32324a');
    if (working) for (let l = 0; l < 3; l++) rect(x + 19, y - 1 + ((l * 2 + Math.floor(now() * 4)) % 6), 5 + (l * 3) % 6, 1, '#1f8a55');
    else if (e) rect(x + 24, y, 4, 3, '#fff');
    rect(x + 22, y + 7, 4, 2, OL);
    // keyboard, mug, papers
    box(x + 18, y + 8, 12, 3, '#fff'); rect(x + 20, y + 9, 8, 1, '#c5c9d6');
    box(x + 35, y + 6, 4, 4, '#fff'); rect(x + 35, y + 7, 4, 1, '#3d6bd1'); rect(x + 36, y + 5, 2, 1, 'rgba(255,255,255,.7)'); // yunomi teacup
    box(x + 5, y + 6, 9, 5, '#fff'); rect(x + 7, y + 8, 5, 1, '#b8bdd0');
  }

  /** Staff sit at their desks, seen from behind, with a status bubble when their role has one. */
  function drawStaff(s) {
    s.employees.forEach((e, i) => {
      const role = staff.roleOf(e);
      if (role.drawnAtDesk === false || i >= s.desks) return;
      const d = deskPos(i), px = d.x * T + 24, py = (d.y + 1) * T + 14;
      drawPerson(px, py, { ...lookOf(e), dir: 'up', sit: true, typing: !!(role.isBusy && role.isBusy(e, s)) });
      const b = role.deskBubble && role.deskBubble(e, s);
      if (b) bubble(px + 10, py - 18 - (b.bob ? Math.floor(now() * 2) % 2 : 0), b.text, b.color);
    });
  }

  // ---------- Lounge stations ----------

  const RECRUITER = { id: 500, shirt: '#ff8fc7', hair: '#6b8cff', skin: palette.SKIN[1], style: 1, glasses: true };

  function drawRecruiting(s) {
    const x = 24 * T, y = 7 * T;
    drawPerson(26 * T, 7 * T - 1, { ...RECRUITER, sit: true, typing: true });
    rect(x + 2, y + 15, 4 * T - 2, 3, SHADOW);
    box(x, y + 2, 4 * T, 12, palette.INDIGO); rect(x + 1, y + 3, 4 * T - 2, 2, '#5a6cb0');
    box(x + 6, y + 6, 12, 5, '#fff'); rect(x + 8, y + 8, 7, 1, '#b8bdd0');
    box(x + 40, y - 3, 14, 9, '#4a4a63'); rect(x + 41, y - 2, 12, 6, '#8cf7bf');
    box(x + 8, 6 * T - 13, 48, 8, '#ffe08a'); text('RECRUITING', x + 32, 6 * T - 12, OL, 'center', true);
    // maneki-neko lucky cat waving at the desk
    const wave = Math.floor(now() * 2) % 2;
    box(x + 24, y + 1, 7, 6, '#fff'); rect(x + 24, y, 2, 1, '#fff'); rect(x + 29, y, 2, 1, '#fff'); rect(x + 26, y + 2, 1, 1, OL); rect(x + 28, y + 2, 1, 1, OL); rect(x + 25, y + 5, 5, 1, palette.GOLD); rect(x + 31, y - wave, 2, 3, '#fff');
    if (s.candidates.length) badge(x + 62, y - 1, s.candidates.length);
    s.candidates.forEach((c, i) => drawPerson((CANDIDATE_X + i) * T + 8, CANDIDATE_Y * T + 14, { ...lookOf(c), dir: 'down' }));
  }

  function drawBoardroom() {
    const x = 24 * T, y = 13 * T;
    rect(x + 2, y + 30, 4 * T - 2, 3, SHADOW);
    for (const cx of [10, 26, 42]) { box(x + cx, y - 1, 12, 5, '#c0392b'); box(x + cx, y + 28, 12, 4, '#c0392b'); }
    box(x, y + 4, 4 * T, 24, '#3a2430'); rect(x + 2, y + 6, 4 * T - 4, 20, '#7a2f3a'); rect(x + 2, y + 6, 4 * T - 4, 1, palette.GOLD); rect(x + 2, y + 25, 4 * T - 4, 1, palette.GOLD);
    box(x + 20, y + 10, 24, 12, '#fff');
    rect(x + 23, y + 18, 3, 3, '#ff6b6b'); rect(x + 28, y + 15, 3, 6, '#ffa94d'); rect(x + 33, y + 12, 3, 9, '#51cf66'); rect(x + 38, y + 14, 3, 7, '#4dabf7');
    box(x + 8, y - 8, 48, 8, '#ffc2d1'); text('BOARDROOM', x + 32, y - 7, OL, 'center', true);
  }

  function drawFacilities() {
    const x = 24 * T, y = 16 * T;
    rect(x + 2, y + 30, 4 * T - 2, 3, SHADOW);
    box(x, y + 4, 4 * T, 26, '#6b4430'); rect(x + 2, y + 6, 4 * T - 4, 22, '#2b3f7a');
    for (let i = 0; i < 4; i++) { // blueprint lines
      rect(x + 6 + i * 14, y + 10, 8, 1, '#a5c8ff'); rect(x + 6 + i * 14, y + 18, 8, 1, '#a5c8ff'); rect(x + 10 + i * 14, y + 10, 1, 9, '#a5c8ff');
    }
    box(x + 48, y + 9, 8, 5, '#ffd43b'); rect(x + 50, y + 9, 4, 1, '#fff3a0'); // hard hat
    box(x + 8, y - 5, 48, 8, '#d9ccff'); text('FACILITIES', x + 32, y - 4, OL, 'center', true);
  }

  /** Everything except the player and the overlays. */
  function drawScene(s) {
    drawFloor();
    drawDecor();
    drawBoards(s);
    for (let i = 0; i < config.MAX_DESKS; i++) drawDesk(s, i);
    drawStaff(s);
    drawRecruiting(s);
    drawBoardroom();
    drawFacilities();
  }

  CFT.office.scene = { drawScene };
})(window.CFT);
