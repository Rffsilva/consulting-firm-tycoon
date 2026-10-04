/**
 * Small general-purpose helpers.
 */
(function (CFT) {
  'use strict';

  /** Random integer between a and b, both included. */
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  /** Random element of an array. */
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  /** Sum of `fn(item)` over an array (or of the items themselves). */
  const sum = (arr, fn = x => x) => arr.reduce((total, x) => total + fn(x), 0);

  /** Formats a number as dollars: 12345 -> "$12,345", -50 -> "-$50". */
  const money = n => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString();

  /** Escapes text for safe use inside HTML. */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** Deterministic pseudo-random number from an id. Gives every person a stable look. */
  const hash = n => {
    let h = (n * 2654435761) >>> 0;
    h ^= h >>> 13;
    return (h * 1274126177) >>> 0;
  };

  CFT.util = { rnd, pick, sum, money, esc, hash };
})(window.CFT);
