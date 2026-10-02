'use strict';
// 2D retro office view. Reads the game state `S` from game.js every frame; everything is drawn with canvas rectangles.

const T = 16, MAP_W = 30, MAP_H = 20;
const DESK_COLS = [2, 6, 10, 14, 18], DESK_ROWS = [3, 7, 11, 15];
const SKILL_COLOR = { Strategy: '#c0504d', Analytics: '#4f9cff', Technology: '#8a63d2', Finance: '#46c27a', Operations: '#e8a33a' };
const HAIR = ['#2b1d12', '#5a3a1e', '#a0522d', '#d9b46a', '#1a1a1a', '#8c8c8c'];
const SKIN = ['#f1c9a0', '#e0a97c', '#c68642', '#8d5524'];

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

// Fixed furniture: rectangles in tile coordinates that block walking.
const STATIC_BLOCKS = [
  [24, 6, 4, 2],   // recruiting desk + recruiter
  [24, 14, 4, 2],  // facilities blueprint table
  [28, 2, 1, 1],   // coffee machine
  [1, 18, 1, 1], [21, 18, 1, 1], [28, 18, 1, 1], [23, 3, 1, 1], [28, 10, 1, 1], // plants
];
const PLANTS = [[1, 18], [21, 18], [28, 18], [23, 3], [28, 10]];

const STATIONS = [
  { id: 'requests', label: 'Client requests board', x: 25 * T + 8, y: 2 * T + 8 },
  { id: 'projects', label: 'Project whiteboard', x: 21 * T + 8, y: 2 * T + 8 },
  { id: 'hiring', label: 'Recruiting desk', x: 26 * T, y: 8 * T + 8 },
  { id: 'office', label: 'Facilities (expand the office)', x: 26 * T, y: 16 * T + 8 },
];

const deskPos = i => ({ x: DESK_COLS[i % 5], y: DESK_ROWS[Math.floor(i / 5)] });
const hash = n => { let h = (n * 2654435761) >>> 0; h ^= h >>> 13; return (h * 1274126177) >>> 0; };
const primarySkill = e => SKILLS.reduce((a, b) => (e.skills[b] > e.skills[a] ? b : a));
const look = e => { const h = hash(e.id); return { shirt: SKILL_COLOR[primarySkill(e)], hair: HAIR[h % HAIR.length], skin: SKIN[(h >> 4) % SKIN.length] }; };

// ---------- Collision ----------
function solid(tx, ty) {
  if (tx < 1 || tx >= MAP_W - 1 || ty < 2 || ty >= MAP_H - 1) return true;
  for (const [x, y, w, h] of STATIC_BLOCKS) if (tx >= x && tx < x + w && ty >= y && ty < y + h) return true;
  for (let i = 0; i < Math.min(S.desks, MAX_DESKS); i++) {
    const d = deskPos(i);
    if (ty === d.y && tx >= d.x && tx < d.x + 3) return true;
    const emp = S.employees[i];
    if (emp && !emp.owner && tx === d.x + 1 && ty === d.y + 1) return true;
  }
  for (let i = 0; i < S.candidates.length; i++) if (tx === 24 + i && ty === 10) return true;
  return false;
}
const hits = (x, y) => solid(Math.floor((x - 4) / T), Math.floor((y - 5) / T)) || solid(Math.floor((x + 3.99) / T), Math.floor((y - 5) / T))
  || solid(Math.floor((x - 4) / T), Math.floor(y / T)) || solid(Math.floor((x + 3.99) / T), Math.floor(y / T));

// ---------- Player ----------
const player = { x: 22 * T + 8, y: 10 * T + 14, dir: 'down', step: 0, moving: false };
const keys = {};
let modalOpen = false;

function movePlayer(dt) {
  let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  player.moving = !!(dx || dy);
  if (!player.moving) return;
  if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
  if (Math.abs(dx) >= Math.abs(dy)) player.dir = dx > 0 ? 'right' : 'left'; else player.dir = dy > 0 ? 'down' : 'up';
  const sp = 70 * dt;
  if (!hits(player.x + dx * sp, player.y)) player.x += dx * sp;
  if (!hits(player.x, player.y + dy * sp)) player.y += dy * sp;
  player.step += dt * 8;
}

// ---------- Interaction ----------
function targets() {
  const out = STATIONS.map(s => ({ x: s.x, y: s.y, label: s.label, act: () => openPanel(s.id) }));
  S.employees.forEach((e, i) => {
    if (i >= MAX_DESKS) return;
    const d = deskPos(i);
    out.push({ x: d.x * T + 24, y: (d.y + 1) * T + 8, act: () => openEmployee(e.id),
      label: e.owner ? 'Your desk' : `${e.name} · ${e.title}` });
  });
  return out;
}
let nearest = null;
function updateNearest() {
  nearest = null;
  let best = 26;
  for (const t of targets()) {
    const d = Math.hypot(t.x - player.x, t.y - (player.y - 4));
    if (d < best) { best = d; nearest = t; }
  }
  const p = document.getElementById('prompt');
  if (nearest && !modalOpen) { p.hidden = false; p.textContent = `E — ${nearest.label}`; } else p.hidden = true;
}

// ---------- Modal ----------
function openPanel(name) {
  modalOpen = true;
  for (const k in keys) keys[k] = false;
  document.querySelectorAll('#modal section').forEach(s => { s.hidden = s.dataset.panel !== name; });
  document.getElementById('modal').hidden = false;
  render();
}
function openEmployee(id) { openEmp = id; openPanel('employee'); }
function closeModal() {
  modalOpen = false; openEmp = null;
  document.getElementById('modal').hidden = true;
}
document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openPanel(b.dataset.open)));
document.getElementById('mclose').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') closeModal(); });

const KEYMAP = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalOpen) return closeModal();
  if (modalOpen || ['SELECT', 'INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (KEYMAP[e.key]) { keys[KEYMAP[e.key]] = true; e.preventDefault(); }
  else if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && nearest && !e.repeat) {
    if (document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
    nearest.act();
  }
});
addEventListener('keyup', e => { if (KEYMAP[e.key]) keys[KEYMAP[e.key]] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// ---------- Drawing ----------
const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
function text(str, x, y, color = '#fff', align = 'left') {
  ctx.font = 'bold 6px monospace'; ctx.textAlign = align; ctx.textBaseline = 'top';
  ctx.fillStyle = '#000'; for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ctx.fillText(str, Math.round(x) + ox, Math.round(y) + oy);
  ctx.fillStyle = color; ctx.fillText(str, Math.round(x), Math.round(y));
}

function drawFloor() {
  for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < MAP_W; tx++) {
    const wall = ty < 2 || ty === MAP_H - 1 || tx === 0 || tx === MAP_W - 1;
    const right = tx >= 23;
    let c;
    if (wall) c = ty === 1 ? '#5b6478' : '#4a5266';
    else c = (tx + ty) % 2 ? (right ? '#5a4668' : '#46506a') : (right ? '#54405f' : '#414b64');
    R(tx * T, ty * T, T, T, c);
  }
  R(0, 2 * T - 3, MAP_W * T, 3, '#2d3345'); // baseboard under the top wall
  R(22 * T + 6, 2 * T, 2, (MAP_H - 3) * T, 'rgba(0,0,0,.25)'); // divider between work area and visitor area
  // coffee machine
  R(28 * T + 3, 2 * T + 3, 10, 12, '#2a2a2a'); R(28 * T + 5, 2 * T + 6, 6, 4, '#d9534f'); R(28 * T + 6, 2 * T + 11, 4, 3, '#eee');
  for (const [px, py] of PLANTS) { R(px * T + 4, py * T + 10, 8, 5, '#8a5a2b'); R(px * T + 2, py * T + 2, 12, 9, '#2f8f4a'); R(px * T + 5, py * T, 6, 6, '#3fae5e'); }
}

function drawBoards() {
  // client requests cork board
  R(24 * T, 7, 48, 24, '#6b4423'); R(24 * T + 2, 9, 44, 20, '#c89a5a');
  const n = Math.min(S.offers.length, 6);
  for (let i = 0; i < n; i++) R(24 * T + 4 + (i % 3) * 14, 11 + Math.floor(i / 3) * 9, 10, 7, i % 2 ? '#fff6c9' : '#fff');
  text('CLIENT REQUESTS', 24 * T + 24, 1, '#ffd479', 'center');
  if (n) badge(24 * T + 46, 9, S.offers.length);
  // project whiteboard
  R(20 * T, 7, 48, 24, '#888'); R(20 * T + 2, 9, 44, 20, '#f2f2f2');
  S.projects.slice(0, 3).forEach((p, i) => {
    const pct = p.reqs.reduce((a, r) => a + r.done, 0) / p.reqs.reduce((a, r) => a + r.need, 0);
    R(20 * T + 5, 12 + i * 6, 38, 3, '#ccc'); R(20 * T + 5, 12 + i * 6, Math.round(38 * pct), 3, '#2f9e5b');
  });
  text('PROJECTS', 20 * T + 24, 1, '#9ad0ff', 'center');
  if (S.projects.length) badge(20 * T + 46, 9, S.projects.length);
}
function badge(x, y, n) {
  R(x - 4, y - 3, 9, 9, '#d9362f'); text(String(Math.min(n, 9)), x + 1, y - 1, '#fff', 'center');
}

function drawDesk(i) {
  const d = deskPos(i), x = d.x * T, y = d.y * T;
  const emp = S.employees[i];
  if (i >= S.desks) { // locked slot
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.setLineDash([2, 2]); ctx.strokeRect(x + 0.5, y + 0.5, 3 * T - 1, 2 * T - 1); ctx.setLineDash([]);
    return;
  }
  R(x, y + 6, 3 * T, 10, '#a8763e'); R(x, y + 6, 3 * T, 2, '#c4924f'); R(x, y + 14, 3 * T, 2, '#7d5528');
  const working = emp && emp.assignedTo !== null && S.projects.some(p => p.id === emp.assignedTo);
  R(x + 17, y - 1, 14, 10, '#222'); R(x + 18, y, 12, 7, working ? '#5cff9a' : emp ? '#3b5b8a' : '#1a1a1a');
  if (working && Math.floor(performance.now() / 300) % 2) R(x + 20, y + 2, 6, 1, '#1d7a43');
  R(x + 22, y + 9, 4, 2, '#222');
  R(x + 6, y + 8, 7, 4, '#ddd'); // paper pile
  R(x + 1 * T + 4, (d.y + 1) * T + 3, 8, 9, '#2b2f3a'); // chair
}

function drawPerson(x, y, o) {
  x = Math.round(x); y = Math.round(y);
  const r = (dx, dy, w, h, c) => R(x + dx, y + dy, w, h, c);
  r(-5, -2, 10, 3, 'rgba(0,0,0,.25)');
  const back = o.dir === 'up' || o.sit;
  if (!o.sit) {
    const s = o.moving ? Math.floor(o.step) % 2 : 0;
    r(-3, -5, 3, 5 - s, '#2c3550'); r(0, -5, 3, 5 - (1 - s) * (o.moving ? 1 : 0), '#2c3550');
  }
  r(-4, -10, 8, 6, o.shirt);
  if (o.sit) { const k = o.typing ? Math.floor(performance.now() / 150) % 2 : 0; r(-5, -11 - k, 2, 4, o.shirt); r(3, -12 + k, 2, 4, o.shirt); }
  else { r(-5, -9, 1, 4, o.shirt); r(4, -9, 1, 4, o.shirt); }
  r(-3, -15, 6, 5, o.skin);
  r(-3, -16, 6, back ? 5 : 2, o.hair);
  if (!back) {
    const ex = o.dir === 'left' ? [-3, -1] : o.dir === 'right' ? [0, 2] : [-2, 1];
    r(ex[0], -13, 1, 1, '#111'); r(ex[1], -13, 1, 1, '#111');
  }
}

function bubble(x, y, str, color) {
  R(x - 5, y - 8, 11, 8, '#fff'); R(x - 1, y, 3, 2, '#fff');
  text(str, x, y - 7, color, 'center');
}

function drawEmployees() {
  const now = performance.now();
  S.employees.forEach((e, i) => {
    if (e.owner || i >= S.desks) return;
    const d = deskPos(i), px = d.x * T + 24, py = (d.y + 1) * T + 14;
    const proj = S.projects.find(p => p.id === e.assignedTo);
    const useful = proj && proj.reqs.some(r => r.done < r.need && e.skills[r.skill] >= r.minLevel);
    drawPerson(px, py, { ...look(e), dir: 'up', sit: true, typing: !!useful });
    if (!proj) bubble(px + 8, py - 14 - Math.floor(now / 500) % 2, 'z', '#4a6ea8');
    else if (!useful) bubble(px + 8, py - 14, '?', '#d9362f');
  });
}

function drawStationsFront() {
  // recruiting desk with recruiter
  const x = 24 * T, y = 7 * T;
  drawPerson(26 * T, 7 * T - 1, { shirt: '#d96ca8', hair: '#3a2314', skin: SKIN[1], sit: true, typing: true });
  R(x, y + 2, 4 * T, 14, '#8a8f9c'); R(x, y + 2, 4 * T, 3, '#aab0be');
  R(x + 6, y + 6, 12, 6, '#eee'); R(x + 40, y - 2, 12, 9, '#222'); R(x + 41, y - 1, 10, 6, '#5cff9a');
  text('RECRUITING', x + 32, 6 * T - 12, '#ffb3dd', 'center');
  if (S.candidates.length) badge(x + 60, y - 4, S.candidates.length);
  S.candidates.forEach((c, i) => drawPerson((24 + i) * T + 8, 10 * T + 14, { ...look(c), dir: 'up' }));
  // facilities table with blueprints
  const fx = 24 * T, fy = 14 * T;
  R(fx, fy + 4, 4 * T, 26, '#3d5a8c'); R(fx + 2, fy + 6, 4 * T - 4, 22, '#2b4570');
  for (let i = 0; i < 4; i++) R(fx + 6 + i * 14, fy + 10, 8, 1, '#8fb4ee'), R(fx + 6 + i * 14, fy + 16, 8, 1, '#8fb4ee'), R(fx + 10 + i * 14, fy + 10, 1, 7, '#8fb4ee');
  text('FACILITIES', fx + 32, fy - 4, '#9ad0ff', 'center');
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!modalOpen) movePlayer(dt);
  updateNearest();

  drawFloor(); drawBoards();
  for (let i = 0; i < MAX_DESKS; i++) drawDesk(i);
  drawEmployees(); drawStationsFront();
  drawPerson(player.x, player.y, { shirt: '#f2f2f2', hair: '#2b1d12', skin: SKIN[0], dir: player.dir, step: player.step, moving: player.moving });
  text('YOU', player.x, player.y - 24, '#ffd479', 'center');
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
