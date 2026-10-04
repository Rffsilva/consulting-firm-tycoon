/**
 * A tiny test runner, so tests run by opening tests/index.html in a browser: no install, no build.
 *
 *   test('name', () => { assert.equal(actual, expected); });
 *
 * Results are listed on the page and in the console.
 */
(function () {
  'use strict';
  const tests = [];
  let currentFile = '';

  window.describe = (file, fn) => { currentFile = file; fn(); currentFile = ''; };
  window.test = (name, fn) => tests.push({ name: currentFile ? `${currentFile} › ${name}` : name, fn });

  const show = v => JSON.stringify(v);
  window.assert = {
    ok(value, message = 'expected a truthy value') {
      if (!value) throw new Error(message);
    },
    equal(actual, expected, message = '') {
      if (actual !== expected) throw new Error(`${message ? message + ': ' : ''}expected ${show(expected)}, got ${show(actual)}`);
    },
    deepEqual(actual, expected, message = '') {
      if (show(actual) !== show(expected)) throw new Error(`${message ? message + ': ' : ''}expected ${show(expected)}, got ${show(actual)}`);
    },
  };

  addEventListener('load', () => {
    const list = document.getElementById('results');
    let failed = 0;
    for (const t of tests) {
      const li = document.createElement('li');
      try {
        t.fn();
        li.className = 'pass';
        li.textContent = `✓ ${t.name}`;
      } catch (err) {
        failed++;
        li.className = 'fail';
        li.textContent = `✗ ${t.name}: ${err.message}`;
        console.error(t.name, err);
      }
      list.appendChild(li);
    }
    const summary = failed ? `${failed} of ${tests.length} tests failed` : `All ${tests.length} tests passed`;
    document.getElementById('summary').textContent = summary;
    document.getElementById('summary').className = failed ? 'fail' : 'pass';
    document.title = (failed ? '✗ ' : '✓ ') + summary;
    console.log(summary);
  });
})();
