/**
 * The canvas and the few drawing primitives everything else is built from. Everything in the office is drawn
 * with filled rectangles on a small 480 x 320 canvas that CSS scales up with crisp pixels.
 */
(function (CFT) {
  'use strict';
  const { palette } = CFT;
  const { T, W, H } = CFT.office.map;

  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const OL = palette.OUTLINE;

  /** Filled rectangle, snapped to whole pixels. */
  const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

  /** Outlined box with soft (missing) corners: the basic cartoon shape. */
  const box = (x, y, w, h, fill) => { rect(x, y - 1, w, h + 2, OL); rect(x - 1, y, w + 2, h, OL); rect(x, y, w, h, fill); };

  /** Tiny pixel text, outlined unless `plain`. */
  function text(str, x, y, color = '#fff', align = 'left', plain = false) {
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    if (!plain) {
      ctx.fillStyle = OL;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]]) ctx.fillText(str, Math.round(x) + ox, Math.round(y) + oy);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, Math.round(x), Math.round(y));
  }

  /** Red counter badge (shows up to 9). */
  function badge(x, y, n) {
    box(x - 4, y - 3, 8, 7, '#ff4d4d');
    text(String(Math.min(n, 9)), x, y - 2, '#fff', 'center', true);
  }

  /** Speech bubble with one character, pointing down at (x, y). */
  function bubble(x, y, str, color) {
    box(x - 6, y - 9, 12, 9, '#fff');
    rect(x - 1, y, 3, 2, OL);
    rect(x, y, 1, 1, '#fff');
    text(str, x, y - 8, color, 'center', true);
  }

  /** Seconds since the page loaded; drives all animations. */
  const now = () => performance.now() / 1000;

  /** Keeps the canvas the largest 3:2 box that fits its container (it keeps its 480x320 pixel grid). */
  function fitToContainer() {
    const view = document.getElementById('view'), screen = document.getElementById('screen');
    const resize = () => {
      const w = view.clientWidth, h = view.clientHeight;
      if (!w || !h) return;
      const scale = Math.min(w / (W * T), h / (H * T));
      screen.style.width = Math.floor(W * T * scale) + 'px';
      screen.style.height = Math.floor(H * T * scale) + 'px';
    };
    new ResizeObserver(resize).observe(view);
    addEventListener('resize', resize);
    resize();
  }

  CFT.office.painter = { canvas, ctx, OL, rect, box, text, badge, bubble, now, fitToContainer };
})(window.CFT);
