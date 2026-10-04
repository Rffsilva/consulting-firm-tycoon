/**
 * The player's character: walking with the keyboard, or along a path after a click / tap (breadth-first search over
 * free tiles). What happens on arrival is decided by the caller (js/office/interaction.js).
 */
(function (CFT) {
  'use strict';
  const { store, staff } = CFT;
  const { windows } = CFT.ui;
  const { T, W, solid, collides } = CFT.office.map;
  const { drawPerson } = CFT.office.sprites;
  const { text } = CFT.office.painter;

  const SPEED = 70; // px per second
  const KEYMAP = {
    ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down',
    ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
  };
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  /** Feet position in px, facing direction, and walk-cycle state. Starts in the corridor by the lounge. */
  const me = { x: 22 * T + 8, y: 10 * T + 14, dir: 'down', step: 0, moving: false };
  const keys = { up: false, down: false, left: false, right: false };
  let path = [];          // waypoints, feet positions in px
  let onArrive = null;    // called when the path ends

  const releaseKeys = () => { for (const k in keys) keys[k] = false; };
  const tileKey = (x, y) => y * W + x;

  function clearPath() {
    path = [];
    onArrive = null;
  }

  function face(dx, dy) {
    if (Math.abs(dx) >= Math.abs(dy)) me.dir = dx > 0 ? 'right' : 'left';
    else me.dir = dy > 0 ? 'down' : 'up';
  }

  /** Every tile reachable from (sx, sy), mapped to the tile it was reached from. Diagonals can't cut corners. */
  function reachable(s, sx, sy) {
    const prev = new Map([[tileKey(sx, sy), -1]]);
    const queue = [[sx, sy]];
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy, k = tileKey(nx, ny);
        if (prev.has(k) || solid(s, nx, ny)) continue;
        if (dx && dy && (solid(s, x + dx, y) || solid(s, x, y + dy))) continue;
        prev.set(k, tileKey(x, y));
        queue.push([nx, ny]);
      }
    }
    return prev;
  }

  /** Walks to the reachable tile closest to (gx, gy) px, then calls `arrive` (also when already there). */
  function walkTo(gx, gy, arrive = null) {
    const s = store.state;
    const sx = Math.floor(me.x / T), sy = Math.floor(me.y / T);
    const prev = reachable(s, sx, sy);
    let goal = null, goalDist = Infinity;
    for (const k of prev.keys()) {
      const d = Math.hypot((k % W) * T + 8 - gx, Math.floor(k / W) * T + 8 - gy);
      if (d < goalDist) { goalDist = d; goal = k; }
    }
    const waypoints = [];
    for (let k = goal; k !== -1 && k !== tileKey(sx, sy); k = prev.get(k)) {
      waypoints.push({ x: (k % W) * T + 8, y: Math.floor(k / W) * T + 14 });
    }
    path = waypoints.reverse();
    onArrive = arrive;
    if (!path.length) finishPath();
  }

  function finishPath() {
    me.moving = false;
    const done = onArrive;
    clearPath();
    if (done) done();
  }

  function followPath(dt) {
    const w = path[0], vx = w.x - me.x, vy = w.y - me.y, dist = Math.hypot(vx, vy), step = SPEED * dt;
    me.moving = true;
    me.step += dt * 8;
    face(vx, vy);
    if (dist <= step) {
      me.x = w.x; me.y = w.y;
      path.shift();
      if (!path.length) finishPath();
    } else {
      me.x += vx / dist * step;
      me.y += vy / dist * step;
    }
  }

  /** Moves the player for one frame. The keyboard always takes over from a click/tap walk. */
  function update(dt) {
    let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    if (dx || dy) clearPath();
    else if (path.length) return followPath(dt);
    me.moving = !!(dx || dy);
    if (!me.moving) return;
    if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
    face(dx, dy);
    const s = store.state, step = SPEED * dt;
    if (!collides(s, me.x + dx * step, me.y)) me.x += dx * step; // x and y separately so you slide along walls
    if (!collides(s, me.x, me.y + dy * step)) me.y += dy * step;
    me.step += dt * 8;
  }

  function draw() {
    const owner = staff.roles.owner;
    drawPerson(me.x, me.y, { ...owner.look(), dir: me.dir, step: me.step, moving: me.moving });
    text('YOU', me.x, me.y - 31, CFT.palette.HIGHLIGHT, 'center');
  }

  /** Where the current walk ends (for the floor marker), or null. */
  const destination = () => (path.length ? path[path.length - 1] : null);

  function init() {
    addEventListener('keydown', e => {
      if (windows.isOpen() || ['SELECT', 'INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (KEYMAP[e.key]) { keys[KEYMAP[e.key]] = true; e.preventDefault(); }
    });
    addEventListener('keyup', e => { if (KEYMAP[e.key]) keys[KEYMAP[e.key]] = false; });
    addEventListener('blur', releaseKeys);
    windows.onOpen(releaseKeys);
  }

  CFT.office.player = { me, update, walkTo, clearPath, destination, draw, init };
})(window.CFT);
