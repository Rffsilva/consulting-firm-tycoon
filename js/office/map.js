/**
 * The office floor plan: a 30 x 20 grid of 16 px tiles (480 x 320 canvas pixels), what blocks walking, where the
 * desks and stations are.
 *
 *   x: 0         2 ... 20  22 23 ... 28 29
 *   y: 0-1  wall with windows, project whiteboard (x 20-22) and client requests board (x 24-26)
 *      2-18 work area with desks on the left (x < 23), lounge on the right (x >= 23)
 *      19   wall
 *
 * Coordinates: "tile" = grid cell; "px" = canvas pixel. A person's position is their feet, in px.
 */
(function (CFT) {
  'use strict';
  const { config } = CFT;

  const T = 16, W = 30, H = 20;

  // Desk i is at column DESK_COLS[i % 5], row DESK_ROWS[i / 5]. A desk is 3 tiles wide with its chair below the middle.
  const DESK_COLS = [2, 6, 10, 14, 18], DESK_ROWS = [3, 7, 11, 15];
  const deskPos = i => ({ x: DESK_COLS[i % 5], y: DESK_ROWS[Math.floor(i / 5)] });

  // Fixed furniture that blocks walking: [x, y, w, h] in tiles.
  const STATIC_BLOCKS = [
    [24, 6, 4, 2],   // recruiting desk + recruiter
    [24, 13, 4, 2],  // boardroom table
    [24, 16, 4, 2],  // facilities table
    [28, 2, 1, 1],   // coffee machine
    [1, 18, 1, 1], [21, 18, 1, 1], [28, 18, 1, 1], [23, 3, 1, 1], [28, 10, 1, 1], // plants
  ];
  const PLANTS = [[1, 18], [21, 18], [28, 18], [23, 3], [28, 10]];

  // Candidates wait in a row on the lounge rug: tile (CANDIDATE_X + i, CANDIDATE_Y).
  const CANDIDATE_X = 24, CANDIDATE_Y = 10;

  /**
   * Stations open a window. (x, y) is where you stand to use them, in px. `rects` are the areas that react to a
   * click or tap, [x, y, w, h] in px. `window` is a data-panel name from index.html.
   */
  const STATIONS = [
    { window: 'requests', label: 'Client requests board', x: 25 * T + 8, y: 2 * T + 8, rects: [[24 * T, 0, 48, 32]] },
    { window: 'projects', label: 'Project whiteboard', x: 21 * T + 8, y: 2 * T + 8, rects: [[20 * T, 0, 48, 32]] },
    { window: 'hiring', label: 'Recruiting desk', x: 26 * T, y: 8 * T + 8, rects: [[24 * T, 6 * T, 64, 32], [24 * T, 10 * T - 4, 64, 20]] },
    { window: 'strategy', label: 'Boardroom (company strategy)', x: 26 * T, y: 15 * T + 8, rects: [[24 * T, 13 * T, 64, 32]] },
    { window: 'office', label: 'Facilities (expand the office)', x: 26 * T, y: 18 * T + 8, rects: [[24 * T, 16 * T, 64, 32]] },
  ];

  /** True when a tile can't be walked on. Depends on the state: owned desks, seated staff and waiting candidates. */
  function solid(s, tx, ty) {
    if (tx < 1 || tx >= W - 1 || ty < 2 || ty >= H - 1) return true;
    for (const [x, y, w, h] of STATIC_BLOCKS) if (tx >= x && tx < x + w && ty >= y && ty < y + h) return true;
    for (let i = 0; i < Math.min(s.desks, config.MAX_DESKS); i++) {
      const d = deskPos(i);
      if (ty === d.y && tx >= d.x && tx < d.x + 3) return true;         // the desk
      const e = s.employees[i];
      if (e && !e.owner && tx === d.x + 1 && ty === d.y + 1) return true; // someone sitting in the chair
    }
    for (let i = 0; i < s.candidates.length; i++) if (tx === CANDIDATE_X + i && ty === CANDIDATE_Y) return true;
    return false;
  }

  /** True when a person standing with their feet at (x, y) px would overlap something solid (8 x 5 px feet box). */
  function collides(s, x, y) {
    const left = Math.floor((x - 4) / T), right = Math.floor((x + 3.99) / T);
    const top = Math.floor((y - 5) / T), bottom = Math.floor(y / T);
    return solid(s, left, top) || solid(s, right, top) || solid(s, left, bottom) || solid(s, right, bottom);
  }

  CFT.office.map = { T, W, H, DESK_COLS, DESK_ROWS, deskPos, STATIC_BLOCKS, PLANTS, CANDIDATE_X, CANDIDATE_Y, STATIONS, solid, collides };
})(window.CFT);
