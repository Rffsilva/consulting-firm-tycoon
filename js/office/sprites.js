/**
 * Drawing people. A person is about 10 x 20 px, drawn relative to their feet (x, y). How someone looks comes from
 * their role's look() (js/employees/*.js); this file only knows how to draw a Look.
 */
(function (CFT) {
  'use strict';
  const { staff } = CFT;
  const { OL, rect, box, now } = CFT.office.painter;

  const PANTS = '#3b4a7a';

  /** The Look for an employee or candidate, decided by their role. */
  const lookOf = e => staff.roleOf(e).look(e);

  /**
   * @param {number} x  feet, px
   * @param {number} y  feet, px
   * @param {Object} o  a Look plus pose: dir ('up'|'down'|'left'|'right'), sit, typing, moving, step (walk cycle)
   */
  function drawPerson(x, y, o) {
    x = Math.round(x); y = Math.round(y);
    const t = now(), id = o.id || 0;
    const walk = o.moving ? Math.floor(o.step) % 2 : 0;          // which leg is up
    const otherLeg = o.moving ? 1 - walk : 0;
    const bob = o.moving ? Math.floor(o.step * 2) % 2            // bounce while walking
      : o.sit ? (o.typing ? Math.floor(t * 6) % 2 : 0)
        : Math.floor(t * 1.5 + id) % 2;                          // breathing while standing
    const yo = o.sit ? 0 : -bob;
    const r = (dx, dy, w, h, c) => rect(x + dx, y + dy, w, h, c);
    const b = (dx, dy, w, h, c) => box(x + dx, y + dy, w, h, c);
    const fromBehind = o.dir === 'up' || o.sit;

    r(-5, -2, 10, 3, 'rgba(43,33,64,.22)'); // shadow

    if (!o.sit) { // legs and shoes
      r(-3, -5 - walk, 2, 3, PANTS); r(1, -5 - otherLeg, 2, 3, PANTS);
      r(-4, -2 - walk, 3, 2, OL); r(1, -2 - otherLeg, 3, 2, OL);
    }

    if (o.sit) { // arms reaching for the keyboard
      const k = o.typing ? Math.floor(t * 8) % 2 : 0, k2 = o.typing ? 1 - k : 0;
      r(-6, -9 - k, 2, 4, OL); r(4, -9 - k2, 2, 4, OL);
      r(-5, -9 - k, 1, 3, o.shirt); r(4, -9 - k2, 1, 3, o.shirt);
    } else { // arms swinging
      r(-6, -8 + yo + walk, 2, 4, OL); r(4, -8 + yo + otherLeg, 2, 4, OL);
      r(-5, -8 + yo + walk, 1, 3, o.shirt); r(4, -8 + yo + otherLeg, 1, 3, o.shirt);
    }

    // torso
    b(-3, -9 + yo, 6, 6, o.shirt);
    r(-2, -8 + yo, 2, 1, 'rgba(255,255,255,.5)');
    if (o.tie && !fromBehind) { r(0, -9 + yo, 1, 1, '#fff'); r(0, -8 + yo, 1, 4, o.tie); }

    // head
    b(-5, -18 + yo, 10, 9, o.skin);
    if (fromBehind) {
      r(-5, -18 + yo, 10, 9, o.hair);
      r(-3, -17 + yo, 3, 1, 'rgba(255,255,255,.3)');
      return;
    }
    const style = o.style % 4;
    r(-5, -18 + yo, 10, 3, o.hair);
    r(-3, -18 + yo, 2, 1, 'rgba(255,255,255,.35)');
    if (style === 1) { r(-5, -15 + yo, 2, 7, o.hair); r(3, -15 + yo, 2, 7, o.hair); }      // long hair
    else { r(-5, -15 + yo, 1, 3, o.hair); r(4, -15 + yo, 1, 3, o.hair); }
    if (style === 0) r(-5, -15 + yo, 5, 2, o.hair);                                       // side fringe
    if (style === 2) b(-1, -21 + yo, 3, 3, o.hair);                                       // top tuft
    if (style === 3) { r(-5, -18 + yo, 10, 4, '#ff6b6b'); r(-5, -15 + yo, 10, 1, '#c93b3b'); } // cap

    // face: eyes look where the person is going and blink now and then
    const sx = o.dir === 'left' ? -1 : o.dir === 'right' ? 1 : 0;
    const blinking = ((t * 0.8 + id * 0.37) % 3.4) < 0.13;
    for (const ex of [-3 + sx, 1 + sx]) {
      if (blinking) r(ex, -12 + yo, 2, 1, OL);
      else { r(ex, -14 + yo, 2, 3, OL); r(ex, -14 + yo, 1, 1, '#fff'); }
    }
    r(-4 + sx, -11 + yo, 2, 1, '#ff9a9a'); r(2 + sx, -11 + yo, 2, 1, '#ff9a9a'); // cheeks
    r(-1 + sx, -10 + yo, 2, 1, '#b8434a');                                       // mouth
    if (o.glasses) { r(-4 + sx, -15 + yo, 4, 1, OL); r(1 + sx, -15 + yo, 4, 1, OL); r(0 + sx, -14 + yo, 1, 1, OL); }
  }

  CFT.office.sprites = { lookOf, drawPerson };
})(window.CFT);
