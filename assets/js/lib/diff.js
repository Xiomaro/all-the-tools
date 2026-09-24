/* Line-oriented diff via a longest-common-subsequence table. The table is
   O(n*m), which is fine for the document sizes this app deals with; past the
   guard we fall back to a cheap prefix/suffix trim plus a block replace. */
(function (global) {
  'use strict';

  var MAX_CELLS = 4000000;

  function diffLines(a, b, opts) {
    opts = opts || {};
    var left = String(a).split(/\r?\n/);
    var right = String(b).split(/\r?\n/);

    var key = function (s) {
      if (opts.ignoreWhitespace) s = s.replace(/\s+/g, ' ').trim();
      if (opts.ignoreCase) s = s.toLowerCase();
      return s;
    };

    /* Trim the identical head and tail first; most edits are local. */
    var head = 0;
    while (head < left.length && head < right.length && key(left[head]) === key(right[head])) head++;

    var tail = 0;
    while (tail < left.length - head && tail < right.length - head &&
           key(left[left.length - 1 - tail]) === key(right[right.length - 1 - tail])) tail++;

    var midLeft = left.slice(head, left.length - tail);
    var midRight = right.slice(head, right.length - tail);

    var ops = [];
    for (var i = 0; i < head; i++) ops.push({ type: 'same', text: left[i] });

    if (midLeft.length * midRight.length > MAX_CELLS) {
      midLeft.forEach(function (l) { ops.push({ type: 'del', text: l }); });
      midRight.forEach(function (r) { ops.push({ type: 'add', text: r }); });
    } else {
      ops = ops.concat(lcsOps(midLeft, midRight, key));
    }

    for (var j = right.length - tail; j < right.length; j++) ops.push({ type: 'same', text: right[j] });
    return ops;
  }

  function lcsOps(a, b, key) {
    var n = a.length, m = b.length;
    var table = [];
    for (var i = 0; i <= n; i++) table.push(new Uint32Array(m + 1));

    for (i = n - 1; i >= 0; i--) {
      for (var j = m - 1; j >= 0; j--) {
        table[i][j] = key(a[i]) === key(b[j])
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
      }
    }

    var ops = [];
    i = 0; j = 0;
    while (i < n && j < m) {
      if (key(a[i]) === key(b[j])) { ops.push({ type: 'same', text: a[i] }); i++; j++; }
      else if (table[i + 1][j] >= table[i][j + 1]) { ops.push({ type: 'del', text: a[i] }); i++; }
      else { ops.push({ type: 'add', text: b[j] }); j++; }
    }
    while (i < n) { ops.push({ type: 'del', text: a[i] }); i++; }
    while (j < m) { ops.push({ type: 'add', text: b[j] }); j++; }
    return ops;
  }

  function summarise(ops) {
    var s = { same: 0, add: 0, del: 0 };
    ops.forEach(function (o) { s[o.type]++; });
    return s;
  }

  /* Unified diff text, for pasting into a review or saving as a .patch. */
  function unified(ops, nameA, nameB, context) {
    var ctx = context === undefined ? 3 : context;
    var hunks = [], current = null;
    var lineA = 1, lineB = 1, pending = [];

    ops.forEach(function (op) {
      if (op.type === 'same') {
        if (current) {
          current.trailing.push(' ' + op.text);
          if (current.trailing.length > ctx) { hunks.push(closeHunk(current, ctx)); current = null; pending = []; }
        }
        if (!current) { pending.push({ text: ' ' + op.text, a: lineA, b: lineB }); if (pending.length > ctx) pending.shift(); }
        lineA++; lineB++;
        return;
      }
      if (!current) {
        current = { startA: pending.length ? pending[0].a : lineA, startB: pending.length ? pending[0].b : lineB,
                    lines: pending.map(function (p) { return p.text; }), trailing: [] };
        pending = [];
      }
      if (current.trailing.length) { current.lines = current.lines.concat(current.trailing); current.trailing = []; }
      current.lines.push((op.type === 'add' ? '+' : '-') + op.text);
      if (op.type === 'add') lineB++; else lineA++;
    });

    if (current) hunks.push(closeHunk(current, ctx));
    if (!hunks.length) return '';

    return ['--- ' + (nameA || 'a'), '+++ ' + (nameB || 'b')].concat(hunks.map(function (h) {
      var countA = h.lines.filter(function (l) { return l[0] === ' ' || l[0] === '-'; }).length;
      var countB = h.lines.filter(function (l) { return l[0] === ' ' || l[0] === '+'; }).length;
      return '@@ -' + h.startA + ',' + countA + ' +' + h.startB + ',' + countB + ' @@\n' + h.lines.join('\n');
    })).join('\n');
  }

  function closeHunk(h, ctx) {
    h.lines = h.lines.concat(h.trailing.slice(0, ctx));
    delete h.trailing;
    return h;
  }

  global.Diff = { lines: diffLines, summarise: summarise, unified: unified };
})(window);
