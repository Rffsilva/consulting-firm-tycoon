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

  const SHADOW = 'rgba(43,33,64,.2)';

  // ---------- Floor and walls ----------

  function drawFloor() {
    for (let ty = 2; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        const x = tx * T, y = ty * T;
        if (ty === H - 1 || tx === 0 || tx === W - 1) { // side and bottom walls
          rect(x, y, T, T, '#d8c29a'); rect(x, y, T, 2, '#b9a077');
        } else if (tx >= 23) { // lounge: wooden planks
          rect(x, y, T, T, (ty + (tx >> 1)) % 2 ? '#e0a96d' : '#d9a066');
          rect(x, y + 7, T, 1, '#c58c52'); rect(x, y + 15, T, 1, '#c58c52'); rect(x + ((ty % 2) ? 5 : 11), y, 1, 7, '#c58c52');
        } else { // work area: blue carpet with flecks
          rect(x, y, T, T, (tx + ty) % 2 ? '#7ab3e6' : '#72abdf');
          if ((tx * 7 + ty * 3) % 5 === 0) rect(x + 5, y + 6, 2, 2, '#8cc0ee');
        }
      }
    }
    // top wall: cream paint, wooden wainscot, windows with drifting clouds
    rect(0, 0, W * T, 2 * T, '#f6ead2');
    rect(0, 21, W * T, 9, '#c58f5c'); rect(0, 21, W * T, 1, '#e0b07c'); rect(0, 30, W * T, 2, '#7d5330');
    for (const tx of [2, 6, 10, 14, 18]) {
      const x = tx * T, cloud = (tx * 11 + Math.floor(now() * 2)) % 30;
      box(x, 4, 48, 15, '#fff'); rect(x + 2, 6, 44, 11, '#9fd8ff'); rect(x + 2, 12, 44, 5, '#b9e6ff');
      rect(x + 6 + cloud % 20, 8, 8, 3, '#fff'); rect(x + 8 + cloud % 20, 7, 5, 2, '#fff');
      rect(x + 23, 6, 2, 11, '#fff');
    }
    rect(22 * T + 6, 2 * T, 2, (H - 3) * T, 'rgba(43,33,64,.18)'); // divider between work area and lounge
  }

  function drawDecor() {
    // lounge rug
    box(24 * T, 9 * T + 4, 4 * T, 3 * T + 4, '#e8706a'); rect(24 * T + 3, 9 * T + 7, 4 * T - 6, 3 * T - 2, '#f58f84');
    rect(24 * T + 3, 9 * T + 7, 4 * T - 6, 1, '#ffd98a'); rect(24 * T + 3, 12 * T + 3, 4 * T - 6, 1, '#ffd98a');
    // coffee machine with rising steam
    const cx = 28 * T, cy = 2 * T, steam = Math.floor(now() * 3) % 3;
    box(cx + 2, cy + 1, 12, 14, '#e5484d'); rect(cx + 4, cy + 3, 8, 4, OL); rect(cx + 5, cy + 4, 2, 2, '#5cff9a'); box(cx + 5, cy + 9, 6, 4, '#fff');
    rect(cx + 6 + steam, cy - 3 - steam, 1, 2, 'rgba(255,255,255,.8)'); rect(cx + 9 - steam, cy - 5 - steam, 1, 2, 'rgba(255,255,255,.6)');
    // swaying plants
    for (const [px, py] of PLANTS) {
      const x = px * T, y = py * T, sway = Math.round(Math.sin(now() * 1.5 + px));
      rect(x + 3, y + 14, 10, 2, SHADOW);
      box(x + 4, y + 10, 8, 5, '#d2691e'); rect(x + 5, y + 11, 6, 1, '#f0894a');
      box(x + 1 + sway, y + 3, 6, 8, '#3fbf6a'); box(x + 9 + sway, y + 3, 6, 8, '#3fbf6a'); box(x + 5, y, 6, 10, '#5fd987');
    }
  }

  // ---------- Wall boards ----------

  function drawBoards(s) {
    // client requests: one sticky note per open request
    const bx = 24 * T;
    box(bx, 7, 48, 22, '#a8743c'); rect(bx + 2, 9, 44, 18, '#e0b070');
    const notes = ['#fff6a8', '#ffc2d1', '#bde4ff', '#c8f7c5', '#fff', '#ffd9a0'];
    const n = Math.min(s.offers.length, 6);
    for (let i = 0; i < n; i++) {
      const nx = bx + 4 + (i % 3) * 14, ny = 11 + Math.floor(i / 3) * 8;
      rect(nx, ny, 10, 6, notes[i]); rect(nx + 4, ny, 2, 1, '#e5484d'); rect(nx + 2, ny + 3, 6, 1, 'rgba(43,33,64,.35)');
    }
    text('CLIENT REQUESTS', bx + 24, 0, palette.HIGHLIGHT, 'center');
    if (n) badge(bx + 47, 8, s.offers.length);

    // project whiteboard: a progress bar for each of the first three projects
    const wx = 20 * T;
    box(wx, 7, 48, 22, '#8d96a8'); rect(wx + 2, 9, 44, 18, '#fff'); rect(wx + 2, 26, 44, 1, '#d5dae3');
    s.projects.slice(0, 3).forEach((p, i) => {
      const { done, need } = projects.progress(p);
      rect(wx + 5, 11 + i * 5, 38, 3, '#dfe4ec');
      rect(wx + 5, 11 + i * 5, Math.round(38 * done / need), 3, ['#3fbf6a', '#4dabf7', '#ffa94d'][i]);
    });
    text('PROJECTS', wx + 24, 0, '#a5d8ff', 'center');
    if (s.projects.length) badge(wx + 47, 8, s.projects.length);
  }

  // ---------- Desks and staff ----------

  const CHAIR_COLORS = ['#2fb5a8', '#f08c3a', '#9775fa', '#e5484d'];

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
    box(x + 1, y + 6, 3 * T - 2, 7, '#eab676'); rect(x + 2, y + 7, 3 * T - 4, 1, '#f8d6a0');
    box(x + 3, y + 12, 3 * T - 6, 3, '#b97b45'); box(x + 31, y + 12, 11, 3, '#a06a3a'); rect(x + 35, y + 13, 3, 1, '#ffd98a');
    // monitor: scrolling green text when working, a screensaver when idle, off when the desk is empty
    box(x + 16, y - 3, 16, 10, '#4a4a63');
    rect(x + 17, y - 2, 14, 7, working ? '#8cf7bf' : e ? '#79b5ff' : '#32324a');
    if (working) for (let l = 0; l < 3; l++) rect(x + 19, y - 1 + ((l * 2 + Math.floor(now() * 4)) % 6), 5 + (l * 3) % 6, 1, '#1f8a55');
    else if (e) rect(x + 24, y, 4, 3, '#fff');
    rect(x + 22, y + 7, 4, 2, OL);
    // keyboard, mug, papers
    box(x + 18, y + 8, 12, 3, '#fff'); rect(x + 20, y + 9, 8, 1, '#c5c9d6');
    box(x + 35, y + 6, 4, 4, '#fff'); rect(x + 35, y + 7, 4, 1, '#e5484d');
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

  const RECRUITER = { id: 500, shirt: '#ff8fc7', hair: '#3b2a1e', skin: palette.SKIN[1], style: 1, glasses: true };

  function drawRecruiting(s) {
    const x = 24 * T, y = 7 * T;
    drawPerson(26 * T, 7 * T - 1, { ...RECRUITER, sit: true, typing: true });
    rect(x + 2, y + 15, 4 * T - 2, 3, SHADOW);
    box(x, y + 2, 4 * T, 12, '#9b87e8'); rect(x + 1, y + 3, 4 * T - 2, 2, '#c4b5fa');
    box(x + 6, y + 6, 12, 5, '#fff'); rect(x + 8, y + 8, 7, 1, '#b8bdd0');
    box(x + 40, y - 3, 14, 9, '#4a4a63'); rect(x + 41, y - 2, 12, 6, '#8cf7bf');
    box(x + 8, 6 * T - 13, 48, 8, '#ffe08a'); text('RECRUITING', x + 32, 6 * T - 12, OL, 'center', true);
    if (s.candidates.length) badge(x + 62, y - 1, s.candidates.length);
    s.candidates.forEach((c, i) => drawPerson((CANDIDATE_X + i) * T + 8, CANDIDATE_Y * T + 14, { ...lookOf(c), dir: 'down' }));
  }

  function drawBoardroom() {
    const x = 24 * T, y = 13 * T;
    rect(x + 2, y + 30, 4 * T - 2, 3, SHADOW);
    for (const cx of [10, 26, 42]) { box(x + cx, y - 1, 12, 5, '#2fb5a8'); box(x + cx, y + 28, 12, 4, '#2fb5a8'); }
    box(x, y + 4, 4 * T, 24, '#8a5a3a'); rect(x + 2, y + 6, 4 * T - 4, 20, '#a9724a'); rect(x + 2, y + 6, 4 * T - 4, 1, '#c8915f');
    box(x + 20, y + 10, 24, 12, '#fff');
    rect(x + 23, y + 18, 3, 3, '#ff6b6b'); rect(x + 28, y + 15, 3, 6, '#ffa94d'); rect(x + 33, y + 12, 3, 9, '#51cf66'); rect(x + 38, y + 14, 3, 7, '#4dabf7');
    box(x + 8, y - 8, 48, 8, '#ffd8a8'); text('BOARDROOM', x + 32, y - 7, OL, 'center', true);
  }

  function drawFacilities() {
    const x = 24 * T, y = 16 * T;
    rect(x + 2, y + 30, 4 * T - 2, 3, SHADOW);
    box(x, y + 4, 4 * T, 26, '#6b8fc9'); rect(x + 2, y + 6, 4 * T - 4, 22, '#2f5aa8');
    for (let i = 0; i < 4; i++) { // blueprint lines
      rect(x + 6 + i * 14, y + 10, 8, 1, '#a5c8ff'); rect(x + 6 + i * 14, y + 18, 8, 1, '#a5c8ff'); rect(x + 10 + i * 14, y + 10, 1, 9, '#a5c8ff');
    }
    box(x + 48, y + 9, 8, 5, '#ffd43b'); rect(x + 50, y + 9, 4, 1, '#fff3a0'); // hard hat
    box(x + 8, y - 5, 48, 8, '#a5d8ff'); text('FACILITIES', x + 32, y - 4, OL, 'center', true);
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
