'use strict';
// 2D retro office view. Reads the game state `S` from game.js every frame; everything is drawn with canvas rectangles.

const T = 16, MAP_W = 30, MAP_H = 20;
const DESK_COLS = [2, 6, 10, 14, 18], DESK_ROWS = [3, 7, 11, 15];
const SKILL_COLOR = { Strategy: '#ff6b6b', Analytics: '#4dabf7', Technology: '#9775fa', Finance: '#51cf66', Operations: '#ffa94d' };
const HAIR = ['#3b2a1e', '#7a4a24', '#c9772e', '#f2c94c', '#1e1e24', '#b8b8c8', '#e8567a'];
const SKIN = ['#ffd9b3', '#f0b98d', '#c98b5b', '#8d5a3b'];

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

// Fixed furniture: rectangles in tile coordinates that block walking.
const STATIC_BLOCKS = [
  [24, 6, 4, 2],   // recruiting desk + recruiter
  [24, 16, 4, 2],  // facilities blueprint table
  [24, 13, 4, 2],  // boardroom table
  [28, 2, 1, 1],   // coffee machine
  [1, 18, 1, 1], [21, 18, 1, 1], [28, 18, 1, 1], [23, 3, 1, 1], [28, 10, 1, 1], // plants
];
const PLANTS = [[1, 18], [21, 18], [28, 18], [23, 3], [28, 10]];

const STATIONS = [
  { id: 'requests', label: 'Client requests board', x: 25 * T + 8, y: 2 * T + 8 },
  { id: 'projects', label: 'Project whiteboard', x: 21 * T + 8, y: 2 * T + 8 },
  { id: 'hiring', label: 'Recruiting desk', x: 26 * T, y: 8 * T + 8 },
  { id: 'strategy', label: 'Boardroom (company strategy)', x: 26 * T, y: 15 * T + 8 },
  { id: 'office', label: 'Facilities (expand the office)', x: 26 * T, y: 18 * T + 8 },
];

const deskPos = i => ({ x: DESK_COLS[i % 5], y: DESK_ROWS[Math.floor(i / 5)] });
const hash = n => { let h = (n * 2654435761) >>> 0; h ^= h >>> 13; return (h * 1274126177) >>> 0; };
const primarySkill = e => SKILLS.reduce((a, b) => (e.skills[b] > e.skills[a] ? b : a));
const look = e => {
  const h = hash(e.id);
  if (e.role === 'hr') return { id: e.id, shirt: '#e64980', glasses: false, hair: HAIR[h % HAIR.length], skin: SKIN[(h >> 4) % SKIN.length], style: 1 };
  if (e.role === 'manager') return { id: e.id, shirt: '#5c677d', tie: '#fab005', glasses: true, hair: HAIR[h % HAIR.length], skin: SKIN[(h >> 4) % SKIN.length], style: (h >> 8) % 3 };
  return { id: e.id, shirt: SKILL_COLOR[primarySkill(e)], hair: HAIR[h % HAIR.length], skin: SKIN[(h >> 4) % SKIN.length],
    style: (h >> 8) % 4, glasses: (h >> 10) % 4 === 0, tie: (h >> 12) % 3 === 0 ? '#e5484d' : null };
};

// ---------- Scaling ----------
// The canvas keeps its 480x320 pixel grid; CSS size is the largest 3:2 box that fits the available area.
const view = document.getElementById('view'), screenEl = document.getElementById('screen');
function fitScreen() {
  const w = view.clientWidth, h = view.clientHeight;
  if (!w || !h) return;
  const s = Math.min(w / (MAP_W * T), h / (MAP_H * T));
  screenEl.style.width = Math.floor(MAP_W * T * s) + 'px';
  screenEl.style.height = Math.floor(MAP_H * T * s) + 'px';
}
new ResizeObserver(fitScreen).observe(view);
addEventListener('resize', fitScreen);
fitScreen();

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
    out.push({ x: d.x * T + 24, y: (d.y + 1) * T + 8,
      act: () => (e.role === 'hr' ? openPanel('hr') : openEmployee(e.id)),
      label: e.owner ? 'Your desk' : e.role === 'hr' ? `${e.name} · HR advice` : `${e.name} · ${e.title}` });
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
let resumeSpeed = null; // game speed to restore when the window closes
function openPanel(name) {
  if (resumeSpeed === null) { resumeSpeed = speed; setSpeed(0); } // menus pause the game
  modalOpen = true;
  for (const k in keys) keys[k] = false;
  document.querySelectorAll('#modal section').forEach(s => { s.hidden = s.dataset.panel !== name; });
  document.getElementById('modal').hidden = false;
  render();
}
function openEmployee(id) { openEmp = id; openPanel('employee'); }
function closeModal() {
  modalOpen = false; openEmp = null;
  if (resumeSpeed !== null) { setSpeed(resumeSpeed); resumeSpeed = null; }
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
const OL = '#2b2140'; // outline colour shared by every sprite
const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
// Rounded, outlined box: the corners are left empty so shapes look soft.
const ob = (x, y, w, h, fill) => { R(x, y - 1, w, h + 2, OL); R(x - 1, y, w + 2, h, OL); R(x, y, w, h, fill); };
function text(str, x, y, color = '#fff', align = 'left', plain = false) {
  ctx.font = 'bold 6px monospace'; ctx.textAlign = align; ctx.textBaseline = 'top';
  if (!plain) { ctx.fillStyle = OL; for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]]) ctx.fillText(str, Math.round(x) + ox, Math.round(y) + oy); }
  ctx.fillStyle = color; ctx.fillText(str, Math.round(x), Math.round(y));
}
const now = () => performance.now() / 1000;

function drawFloor() {
  for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < MAP_W; tx++) {
    const x = tx * T, y = ty * T;
    if (ty < 2) continue;
    if (ty === MAP_H - 1 || tx === 0 || tx === MAP_W - 1) { R(x, y, T, T, '#d8c29a'); R(x, y, T, 2, '#b9a077'); continue; }
    if (tx >= 23) { // lounge: wooden planks
      R(x, y, T, T, (ty + (tx >> 1)) % 2 ? '#e0a96d' : '#d9a066');
      R(x, y + 7, T, 1, '#c58c52'); R(x, y + 15, T, 1, '#c58c52'); R(x + ((ty % 2) ? 5 : 11), y, 1, 7, '#c58c52');
    } else { // work area: blue carpet
      R(x, y, T, T, (tx + ty) % 2 ? '#7ab3e6' : '#72abdf');
      if ((tx * 7 + ty * 3) % 5 === 0) R(x + 5, y + 6, 2, 2, '#8cc0ee');
    }
  }
  // top wall: cream paint, wooden wainscot, windows
  R(0, 0, MAP_W * T, 2 * T, '#f6ead2'); R(0, 21, MAP_W * T, 9, '#c58f5c'); R(0, 21, MAP_W * T, 1, '#e0b07c'); R(0, 30, MAP_W * T, 2, '#7d5330');
  for (const tx of [2, 6, 10, 14, 18]) {
    const x = tx * T;
    ob(x, 4, 48, 15, '#fff'); R(x + 2, 6, 44, 11, '#9fd8ff'); R(x + 2, 12, 44, 5, '#b9e6ff');
    const cx = (tx * 11 + Math.floor(now() * 2)) % 30; R(x + 6 + cx % 20, 8, 8, 3, '#fff'); R(x + 8 + cx % 20, 7, 5, 2, '#fff');
    R(x + 23, 6, 2, 11, '#fff');
  }
  R(22 * T + 6, 2 * T, 2, (MAP_H - 3) * T, 'rgba(43,33,64,.18)');
  // lounge rug
  ob(24 * T, 9 * T + 4, 4 * T, 3 * T + 4, '#e8706a'); R(24 * T + 3, 9 * T + 7, 4 * T - 6, 3 * T - 2, '#f58f84');
  R(24 * T + 3, 9 * T + 7, 4 * T - 6, 1, '#ffd98a'); R(24 * T + 3, 12 * T + 3, 4 * T - 6, 1, '#ffd98a');
  // coffee machine
  const cx = 28 * T, cy = 2 * T;
  ob(cx + 2, cy + 1, 12, 14, '#e5484d'); R(cx + 4, cy + 3, 8, 4, '#2b2140'); R(cx + 5, cy + 4, 2, 2, '#5cff9a'); ob(cx + 5, cy + 9, 6, 4, '#fff');
  const st = Math.floor(now() * 3) % 3; R(cx + 6 + st, cy - 3 - st, 1, 2, 'rgba(255,255,255,.8)'); R(cx + 9 - st, cy - 5 - st, 1, 2, 'rgba(255,255,255,.6)');
  // plants
  for (const [px, py] of PLANTS) {
    const x = px * T, y = py * T, sway = Math.round(Math.sin(now() * 1.5 + px));
    R(x + 3, y + 14, 10, 2, 'rgba(43,33,64,.2)');
    ob(x + 4, y + 10, 8, 5, '#d2691e'); R(x + 5, y + 11, 6, 1, '#f0894a');
    ob(x + 1 + sway, y + 3, 6, 8, '#3fbf6a'); ob(x + 9 + sway, y + 3, 6, 8, '#3fbf6a'); ob(x + 5, y, 6, 10, '#5fd987');
  }
}

function badge(x, y, n) { ob(x - 4, y - 3, 8, 7, '#ff4d4d'); text(String(Math.min(n, 9)), x, y - 2, '#fff', 'center', true); }

function drawBoards() {
  // client requests cork board
  const bx = 24 * T;
  ob(bx, 7, 48, 22, '#a8743c'); R(bx + 2, 9, 44, 18, '#e0b070');
  const notes = ['#fff6a8', '#ffc2d1', '#bde4ff', '#c8f7c5', '#fff', '#ffd9a0'];
  const n = Math.min(S.offers.length, 6);
  for (let i = 0; i < n; i++) { const nx = bx + 4 + (i % 3) * 14, ny = 11 + Math.floor(i / 3) * 8; R(nx, ny, 10, 6, notes[i]); R(nx + 4, ny, 2, 1, '#e5484d'); R(nx + 2, ny + 3, 6, 1, 'rgba(43,33,64,.35)'); }
  text('CLIENT REQUESTS', bx + 24, 0, '#ffe08a', 'center');
  if (n) badge(bx + 47, 8, S.offers.length);
  // project whiteboard
  const wx = 20 * T;
  ob(wx, 7, 48, 22, '#8d96a8'); R(wx + 2, 9, 44, 18, '#fff'); R(wx + 2, 26, 44, 1, '#d5dae3');
  S.projects.slice(0, 3).forEach((p, i) => {
    const pct = p.reqs.reduce((a, r) => a + r.done, 0) / p.reqs.reduce((a, r) => a + r.need, 0);
    R(wx + 5, 11 + i * 5, 38, 3, '#dfe4ec'); R(wx + 5, 11 + i * 5, Math.round(38 * pct), 3, ['#3fbf6a', '#4dabf7', '#ffa94d'][i]);
  });
  text('PROJECTS', wx + 24, 0, '#a5d8ff', 'center');
  if (S.projects.length) badge(wx + 47, 8, S.projects.length);
}

function drawDesk(i) {
  const d = deskPos(i), x = d.x * T, y = d.y * T, emp = S.employees[i];
  if (i >= S.desks) { // locked slot
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.setLineDash([3, 3]); ctx.strokeRect(x + 1.5, y + 1.5, 3 * T - 3, 2 * T - 3); ctx.setLineDash([]);
    return;
  }
  const working = emp && emp.assignedTo !== null && S.projects.some(p => p.id === emp.assignedTo);
  // chair (behind the person)
  const chair = ['#2fb5a8', '#f08c3a', '#9775fa', '#e5484d'][i % 4];
  ob(x + 19, (d.y + 1) * T + 1, 10, 5, chair); ob(x + 18, (d.y + 1) * T + 6, 12, 7, chair); R(x + 20, (d.y + 1) * T + 7, 8, 1, 'rgba(255,255,255,.4)');
  // desk
  R(x + 2, y + 15, 3 * T - 2, 3, 'rgba(43,33,64,.2)');
  ob(x + 1, y + 6, 3 * T - 2, 7, '#eab676'); R(x + 2, y + 7, 3 * T - 4, 1, '#f8d6a0');
  ob(x + 3, y + 12, 3 * T - 6, 3, '#b97b45'); ob(x + 31, y + 12, 11, 3, '#a06a3a'); R(x + 35, y + 13, 3, 1, '#ffd98a');
  // monitor
  ob(x + 16, y - 3, 16, 10, '#4a4a63');
  R(x + 17, y - 2, 14, 7, working ? '#8cf7bf' : emp ? '#79b5ff' : '#32324a');
  if (working) for (let l = 0; l < 3; l++) R(x + 19, y - 1 + ((l * 2 + Math.floor(now() * 4)) % 6), 5 + (l * 3) % 6, 1, '#1f8a55');
  else if (emp) R(x + 24, y, 4, 3, '#fff'); // idle: screensaver
  R(x + 22, y + 7, 4, 2, OL);
  // keyboard, mug, papers
  ob(x + 18, y + 8, 12, 3, '#fff'); R(x + 20, y + 9, 8, 1, '#c5c9d6');
  ob(x + 35, y + 6, 4, 4, '#fff'); R(x + 35, y + 7, 4, 1, '#e5484d');
  ob(x + 5, y + 6, 9, 5, '#fff'); R(x + 7, y + 8, 5, 1, '#b8bdd0');
}

function drawPerson(x, y, o) {
  x = Math.round(x); y = Math.round(y);
  const t = now(), id = o.id || 0;
  const walk = o.moving ? Math.floor(o.step) % 2 : 0;
  const bob = o.moving ? Math.floor(o.step * 2) % 2 : o.sit ? (o.typing ? Math.floor(t * 6) % 2 : 0) : Math.floor(t * 1.5 + id) % 2;
  const yo = o.sit ? 0 : -bob;
  const r = (dx, dy, w, h, c) => R(x + dx, y + dy, w, h, c);
  const box = (dx, dy, w, h, c) => ob(x + dx, y + dy, w, h, c); // outlined box relative to the feet
  const back = o.dir === 'up' || o.sit;
  r(-5, -2, 10, 3, 'rgba(43,33,64,.22)');
  if (!o.sit) { // legs + shoes
    r(-3, -5 - walk, 2, 3, '#3b4a7a'); r(1, -5 - (o.moving ? 1 - walk : 0), 2, 3, '#3b4a7a');
    r(-4, -2 - walk, 3, 2, OL); r(1, -2 - (o.moving ? 1 - walk : 0), 3, 2, OL);
  }
  // arms behind/beside body
  if (o.sit) { const k = o.typing ? Math.floor(t * 8) % 2 : 0; r(-6, -9 - k, 2, 4, OL); r(4, -9 - (o.typing ? 1 - k : 0), 2, 4, OL); r(-5, -9 - k, 1, 3, o.shirt); r(4, -9 - (o.typing ? 1 - k : 0), 1, 3, o.shirt); }
  else { r(-6, -8 + yo + walk, 2, 4, OL); r(4, -8 + yo + (o.moving ? 1 - walk : 0), 2, 4, OL); r(-5, -8 + yo + walk, 1, 3, o.shirt); r(4, -8 + yo + (o.moving ? 1 - walk : 0), 1, 3, o.shirt); }
  // torso
  box(-3, -9 + yo, 6, 6, o.shirt); r(-2, -8 + yo, 2, 1, 'rgba(255,255,255,.5)');
  if (o.tie && !back) { r(0, -9 + yo, 1, 1, '#fff'); r(0, -8 + yo, 1, 4, o.tie); }
  // head
  box(-5, -18 + yo, 10, 9, o.skin);
  if (back) { r(-5, -18 + yo, 10, 9, o.hair); r(-5, -18 + yo, 10, 9, 'rgba(0,0,0,0)'); r(-3, -17 + yo, 3, 1, 'rgba(255,255,255,.3)'); }
  else {
    const st = o.style % 4;
    r(-5, -18 + yo, 10, 3, o.hair); r(-3, -18 + yo, 2, 1, 'rgba(255,255,255,.35)');
    if (st === 1) { r(-5, -15 + yo, 2, 7, o.hair); r(3, -15 + yo, 2, 7, o.hair); } // long hair
    else { r(-5, -15 + yo, 1, 3, o.hair); r(4, -15 + yo, 1, 3, o.hair); }
    if (st === 0) r(-5, -15 + yo, 5, 2, o.hair); // side fringe
    if (st === 2) { box(-1, -21 + yo, 3, 3, o.hair); } // top tuft
    if (st === 3) { r(-5, -18 + yo, 10, 4, '#ff6b6b'); r(-5, -15 + yo, 10, 1, '#c93b3b'); } // cap
    const sx = o.dir === 'left' ? -1 : o.dir === 'right' ? 1 : 0;
    const blink = ((t * 0.8 + id * 0.37) % 3.4) < 0.13;
    for (const ex of [-3 + sx, 1 + sx]) {
      if (blink) r(ex, -12 + yo, 2, 1, OL); else { r(ex, -14 + yo, 2, 3, OL); r(ex, -14 + yo, 1, 1, '#fff'); }
    }
    r(-4 + sx, -11 + yo, 2, 1, '#ff9a9a'); r(2 + sx, -11 + yo, 2, 1, '#ff9a9a');
    r(-1 + sx, -10 + yo, 2, 1, '#b8434a');
    if (o.glasses) { r(-4 + sx, -15 + yo, 4, 1, OL); r(1 + sx, -15 + yo, 4, 1, OL); r(0 + sx, -14 + yo, 1, 1, OL); }
  }
}

function bubble(x, y, str, color) {
  ob(x - 6, y - 9, 12, 9, '#fff'); R(x - 1, y, 3, 2, OL); R(x, y, 1, 1, '#fff');
  text(str, x, y - 8, color, 'center', true);
}

function drawEmployees() {
  S.employees.forEach((e, i) => {
    if (e.owner || i >= S.desks) return;
    const d = deskPos(i), px = d.x * T + 24, py = (d.y + 1) * T + 14;
    if (e.role === 'hr') {
      drawPerson(px, py, { ...look(e), dir: 'up', sit: true, typing: true });
      if (hrAlerts > 0) bubble(px + 10, py - 18 - Math.floor(now() * 2) % 2, '!', '#e8590c');
      return;
    }
    if (e.role === 'manager') { drawPerson(px, py, { ...look(e), dir: 'up', sit: true, typing: S.projects.length > 0 }); return; }
    const proj = S.projects.find(p => p.id === e.assignedTo);
    const useful = proj && proj.reqs.some(r => r.done < r.need && e.skills[r.skill] >= r.minLevel);
    drawPerson(px, py, { ...look(e), dir: 'up', sit: true, typing: !!useful });
    if (!proj) bubble(px + 10, py - 18 - Math.floor(now() * 2) % 2, 'z', '#4a6ea8');
    else if (!useful) bubble(px + 10, py - 18, '?', '#e5484d');
  });
}

function drawStationsFront() {
  // recruiting desk with recruiter
  const x = 24 * T, y = 7 * T;
  drawPerson(26 * T, 7 * T - 1, { shirt: '#ff8fc7', hair: '#3b2a1e', skin: SKIN[1], style: 1, glasses: true, id: 500, sit: true, typing: true });
  R(x + 2, y + 15, 4 * T - 2, 3, 'rgba(43,33,64,.2)');
  ob(x, y + 2, 4 * T, 12, '#9b87e8'); R(x + 1, y + 3, 4 * T - 2, 2, '#c4b5fa');
  ob(x + 6, y + 6, 12, 5, '#fff'); R(x + 8, y + 8, 7, 1, '#b8bdd0');
  ob(x + 40, y - 3, 14, 9, '#4a4a63'); R(x + 41, y - 2, 12, 6, '#8cf7bf');
  ob(x + 8, 6 * T - 13, 48, 8, '#ffe08a'); text('RECRUITING', x + 32, 6 * T - 12, OL, 'center', true);
  if (S.candidates.length) badge(x + 62, y - 1, S.candidates.length);
  S.candidates.forEach((c, i) => drawPerson((24 + i) * T + 8, 10 * T + 14, { ...look(c), dir: 'down' }));
  // facilities table with blueprints and a hard hat
  // boardroom table with a strategy chart and chairs
  const bx = 24 * T, by = 13 * T;
  R(bx + 2, by + 30, 4 * T - 2, 3, 'rgba(43,33,64,.2)');
  for (const cx of [10, 26, 42]) { ob(bx + cx, by - 1, 12, 5, '#2fb5a8'); ob(bx + cx, by + 28, 12, 4, '#2fb5a8'); }
  ob(bx, by + 4, 4 * T, 24, '#8a5a3a'); R(bx + 2, by + 6, 4 * T - 4, 20, '#a9724a'); R(bx + 2, by + 6, 4 * T - 4, 1, '#c8915f');
  ob(bx + 20, by + 10, 24, 12, '#fff'); R(bx + 23, by + 18, 3, 3, '#ff6b6b'); R(bx + 28, by + 15, 3, 6, '#ffa94d'); R(bx + 33, by + 12, 3, 9, '#51cf66'); R(bx + 38, by + 14, 3, 7, '#4dabf7');
  ob(bx + 8, by - 8, 48, 8, '#ffd8a8'); text('BOARDROOM', bx + 32, by - 7, OL, 'center', true);
  // facilities table with blueprints and a hard hat
  const fx = 24 * T, fy = 16 * T;
  R(fx + 2, fy + 30, 4 * T - 2, 3, 'rgba(43,33,64,.2)');
  ob(fx, fy + 4, 4 * T, 26, '#6b8fc9'); R(fx + 2, fy + 6, 4 * T - 4, 22, '#2f5aa8');
  for (let i = 0; i < 4; i++) { R(fx + 6 + i * 14, fy + 10, 8, 1, '#a5c8ff'); R(fx + 6 + i * 14, fy + 18, 8, 1, '#a5c8ff'); R(fx + 10 + i * 14, fy + 10, 1, 9, '#a5c8ff'); }
  ob(fx + 48, fy + 9, 8, 5, '#ffd43b'); R(fx + 50, fy + 9, 4, 1, '#fff3a0');
  ob(fx + 8, fy - 5, 48, 8, '#a5d8ff'); text('FACILITIES', fx + 32, fy - 4, OL, 'center', true);
}

let last = performance.now();
function frame(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
  if (!modalOpen) movePlayer(dt);
  updateNearest();

  drawFloor(); drawBoards();
  for (let i = 0; i < MAX_DESKS; i++) drawDesk(i);
  drawEmployees(); drawStationsFront();
  drawPerson(player.x, player.y, { shirt: '#4c6ef5', tie: '#e5484d', hair: '#4a2f1b', skin: SKIN[0], style: 0, id: 999, dir: player.dir, step: player.step, moving: player.moving });
  text('YOU', player.x, player.y - 31, '#ffe08a', 'center');
  if (nearest && !modalOpen) { // bobbing arrow over whatever E will interact with
    const ay = nearest.y - 22 + Math.round(Math.sin(now() * 6) * 2), ax = Math.round(nearest.x);
    R(ax - 3, ay, 7, 1, OL); R(ax - 2, ay + 1, 5, 1, OL); R(ax - 1, ay + 2, 3, 1, OL); R(ax, ay + 3, 1, 1, OL);
    R(ax - 2, ay, 5, 1, '#ffe08a'); R(ax - 1, ay + 1, 3, 1, '#ffe08a'); R(ax, ay + 2, 1, 1, '#ffe08a');
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
