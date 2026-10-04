/**
 * What the player can use in the office (stations and desks), the prompt that appears near them, and the input
 * that uses them: E / Enter, clicking or tapping them, or tapping the prompt.
 */
(function (CFT) {
  'use strict';
  const { config, palette, store, staff } = CFT;
  const { windows } = CFT.ui;
  const { T, deskPos, STATIONS } = CFT.office.map;
  const { canvas, OL, rect, now } = CFT.office.painter;
  const player = CFT.office.player;

  const REACH = 26; // px from the player's feet to a target's standing spot
  const TOUCH = matchMedia('(pointer: coarse)').matches;

  /**
   * Everything that can be used right now: the fixed stations, plus one desk per employee.
   * @returns {{x: number, y: number, label: string, rects: number[][], use: () => void}[]}
   */
  function targets(s) {
    const list = STATIONS.map(st => ({ x: st.x, y: st.y, label: st.label, rects: st.rects, use: () => windows.open(st.window) }));
    s.employees.forEach((e, i) => {
      if (i >= config.MAX_DESKS) return;
      const role = staff.roleOf(e), d = deskPos(i);
      list.push({
        x: d.x * T + 24, y: (d.y + 1) * T + 8, rects: [[d.x * T, d.y * T, 48, 32]],
        label: role.deskLabel ? role.deskLabel(e) : `${e.name} · ${e.title}`,
        use: () => (role.deskWindow ? windows.open(role.deskWindow) : windows.openEmployee(e.id)),
      });
    });
    return list;
  }

  const distanceTo = t => Math.hypot(t.x - player.me.x, t.y - (player.me.y - 4));
  const inReach = t => distanceTo(t) < REACH;

  /** The target in reach of the player this frame, if any. */
  let nearest = null;

  function update(s) {
    nearest = null;
    let best = REACH;
    for (const t of targets(s)) {
      const d = distanceTo(t);
      if (d < best) { best = d; nearest = t; }
    }
    const prompt = document.getElementById('prompt');
    prompt.hidden = !nearest || windows.isOpen();
    if (!prompt.hidden) prompt.textContent = `${TOUCH ? 'Tap' : 'E'} — ${nearest.label}`;
  }

  /** A click/tap on the canvas at (px, py): walk there, and use whatever was clicked once next to it. */
  function clickAt(px, py) {
    const s = store.state;
    const hit = targets(s).find(t => t.rects.some(([x, y, w, h]) => px >= x && px < x + w && py >= y && py < y + h));
    if (!hit) return player.walkTo(px, py);
    if (inReach(hit)) return hit.use();
    player.walkTo(hit.x, hit.y, () => {
      // Targets are rebuilt from the state, so find the same one again by position before using it.
      const t = targets(store.state).find(x => x.x === hit.x && x.y === hit.y);
      if (t && inReach(t)) t.use();
    });
  }

  /** Floor marker where a click/tap walk ends, and a bobbing arrow over the target in reach. */
  function drawOverlays() {
    const dest = player.destination();
    if (dest) {
      const r = Math.floor(now() * 4) % 2 ? 6 : 5, x = Math.round(dest.x), y = Math.round(dest.y) - 4;
      for (const [ox, oy] of [[-r, 0], [r - 1, 0], [0, -r / 2], [0, r / 2 - 1]]) rect(x + ox, y + Math.round(oy), 2, 2, palette.HIGHLIGHT);
    }
    if (nearest && !windows.isOpen()) {
      const ay = nearest.y - 22 + Math.round(Math.sin(now() * 6) * 2), ax = Math.round(nearest.x);
      rect(ax - 3, ay, 7, 1, OL); rect(ax - 2, ay + 1, 5, 1, OL); rect(ax - 1, ay + 2, 3, 1, OL); rect(ax, ay + 3, 1, 1, OL);
      rect(ax - 2, ay, 5, 1, palette.HIGHLIGHT); rect(ax - 1, ay + 1, 3, 1, palette.HIGHLIGHT); rect(ax, ay + 2, 1, 1, palette.HIGHLIGHT);
    }
  }

  function init() {
    canvas.addEventListener('pointerdown', e => {
      if (windows.isOpen()) return;
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      clickAt((e.clientX - r.left) / r.width * canvas.width, (e.clientY - r.top) / r.height * canvas.height);
    });
    document.getElementById('prompt').addEventListener('pointerdown', e => {
      e.preventDefault();
      e.stopPropagation();
      if (nearest && !windows.isOpen()) nearest.use();
    });
    addEventListener('keydown', e => {
      if (windows.isOpen() || ['SELECT', 'INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && nearest && !e.repeat) {
        if (document.activeElement.tagName === 'BUTTON') document.activeElement.blur(); // don't also "press" the focused button
        nearest.use();
      }
    });
    document.getElementById('help').textContent = TOUCH
      ? 'Tap the floor to walk · tap a desk or board to open it'
      : 'Click the floor or use WASD / arrows to walk · click a desk or board, or press E, to open it · Esc: close window';
  }

  CFT.office.interaction = { targets, update, clickAt, drawOverlays, init };
})(window.CFT);
