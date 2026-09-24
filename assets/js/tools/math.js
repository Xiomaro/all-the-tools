/* math tools. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  /* ---- shared styling (every selector is scoped to .g-mf) --------------- */
  if (!document.getElementById('g-mf-style')) {
    document.head.appendChild(el('style', { id: 'g-mf-style', text: [
      '.g-mf .mf-big{font-size:1.9rem;font-weight:700;font-family:var(--mono);word-break:break-all;margin:6px 0}',
      '.g-mf .mf-mid{font-size:1.25rem;font-weight:600;font-family:var(--mono);word-break:break-all}',
      '.g-mf .mf-muted{color:var(--fg-muted);font-size:.9rem}',
      '.g-mf .mf-ok{color:var(--ok);font-weight:700}',
      '.g-mf .mf-err{color:var(--err);font-weight:700}',
      '.g-mf .mf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}',
      '.g-mf .mf-card{background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px}',
      '.g-mf .mf-card b{display:block;font-family:var(--mono);font-size:1.1rem;word-break:break-all}',
      '.g-mf .mf-card span{color:var(--fg-muted);font-size:.85rem}',
      '.g-mf .mf-tags{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}',
      '.g-mf .mf-tag{font-family:var(--mono);background:var(--bg-sunken);border:1px solid var(--border);border-radius:6px;padding:2px 8px;word-break:break-all}',
      '.g-mf .mf-bits{display:grid;grid-template-columns:repeat(32,1fr);gap:2px;font-family:var(--mono);font-size:.8rem;text-align:center}',
      '.g-mf .mf-bits span{background:var(--bg-sunken);border:1px solid var(--border);border-radius:3px;padding:2px 0}',
      '.g-mf .mf-bits span.on{background:var(--accent);color:var(--bg);border-color:var(--accent)}',
      '.g-mf .mf-inline{display:flex;flex-wrap:wrap;align-items:flex-end;gap:8px}',
      '.g-mf .mf-inline input{width:90px}',
      '.g-mf .mf-frac{display:inline-flex;flex-direction:column;align-items:center;font-family:var(--mono);font-size:1.4rem;font-weight:700;vertical-align:middle}',
      '.g-mf .mf-frac i{font-style:normal;border-top:2px solid var(--fg);padding-top:2px}',
      '.g-mf .mf-calc{max-width:420px}',
      '.g-mf .mf-screen{background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px;text-align:right;font-family:var(--mono);margin-bottom:8px}',
      '.g-mf .mf-screen .mf-expr{color:var(--fg-muted);min-height:1.2em;word-break:break-all}',
      '.g-mf .mf-screen .mf-disp{font-size:2rem;font-weight:700;word-break:break-all;min-height:1.2em}',
      '.g-mf .mf-keys{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}',
      '.g-mf .mf-keys .btn{padding:12px 0;font-size:1.05rem}',
      '.g-mf .mf-mem{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:6px}',
      '.g-mf .mf-mem .btn{padding:6px 10px}',
      '.g-mf .mf-row-copy{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)}',
      '.g-mf .mf-row-copy code{font-family:var(--mono);word-break:break-all}',
      '.g-mf .mf-tabs{margin-bottom:10px}'
    ].join('\n') }));
  }

  /* ---- helpers ------------------------------------------------------------ */
  function numIn(label, value, attrs) {
    var input = el('input', Object.assign({ type: 'number', step: 'any' }, attrs || {}));
    input.value = value === undefined ? '' : String(value);
    var wrap = U.field(label, input);
    wrap.input = input;
    return wrap;
  }
  function textIn(label, value, attrs) {
    var input = el('input', Object.assign({ type: 'text', spellcheck: false }, attrs || {}));
    input.value = value === undefined ? '' : String(value);
    var wrap = label ? U.field(label, input) : input;
    wrap.input = input;
    return wrap;
  }
  function val(w) {
    var s = String((w.input || w).value).trim().replace(/,/g, '');
    if (s === '') return NaN;
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }
  /* Round to `d` places and drop trailing zeros. */
  function trim(n, d) {
    if (!isFinite(n)) return String(n);
    var r = parseFloat(n.toFixed(d === undefined ? 6 : d));
    if (Object.is(r, -0)) r = 0;
    return String(r);
  }
  function fixed(n, d) { return isFinite(n) ? (Object.is(+n.toFixed(d), -0) ? (0).toFixed(d) : n.toFixed(d)) : '—'; }
  function card(label, value, key) {
    return el('div', { class: 'mf-card' }, el('span', { text: label }), el('b', { text: value, dataset: key ? { k: key } : undefined }));
  }
  function tags(list, cls) {
    return el('div', { class: 'mf-tags' + (cls ? ' ' + cls : '') }, list.map(function (x) { return el('span', { class: 'mf-tag', text: String(x) }); }));
  }
  function root$(root) { root.classList.add('g-mf'); return root; }

  /* BigInt helpers */
  function babs(n) { return n < 0n ? -n : n; }
  function bgcd(a, b) { a = babs(a); b = babs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
  function bsqrt(n) {
    if (n < 0n) return -1n;
    if (n < 2n) return n;
    /* Newton's method: exact for any size. */
    var x = 1n << BigInt(Math.ceil(n.toString(2).length / 2) + 1);
    for (;;) {
      var y = (x + n / x) >> 1n;
      if (y >= x) break;
      x = y;
    }
    while (x * x > n) x--;
    while ((x + 1n) * (x + 1n) <= n) x++;
    return x;
  }
  function modpow(b, e, m) {
    var r = 1n; b %= m;
    while (e > 0n) { if (e & 1n) r = r * b % m; e >>= 1n; b = b * b % m; }
    return r;
  }
  var SMALL_PRIMES = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n, 47n];
  function isPrimeBig(n) {
    if (n < 2n) return false;
    for (var i = 0; i < SMALL_PRIMES.length; i++) {
      if (n === SMALL_PRIMES[i]) return true;
      if (n % SMALL_PRIMES[i] === 0n) return false;
    }
    var d = n - 1n, s = 0;
    while ((d & 1n) === 0n) { d >>= 1n; s++; }
    outer: for (var j = 0; j < 13; j++) {
      var a = SMALL_PRIMES[j];
      var x = modpow(a, d, n);
      if (x === 1n || x === n - 1n) continue;
      for (var k = 1; k < s; k++) {
        x = x * x % n;
        if (x === n - 1n) continue outer;
      }
      return false;
    }
    return true;
  }
  function smallestFactor(n) {
    if (n % 2n === 0n) return 2n;
    for (var p = 3n; p * p <= n && p < 100000n; p += 2n) if (n % p === 0n) return p;
    return null;
  }
  function pollard(n) {
    if (n % 2n === 0n) return 2n;
    for (var c = 1n; c < 4n; c++) {
      var x = 2n, y = 2n, d = 1n, steps = 0;
      var f = function (v) { return (v * v + c) % n; };
      while (d === 1n && steps < 150000) {
        x = f(x); y = f(f(y)); d = bgcd(x - y, n); steps++;
      }
      if (d !== 1n && d !== n) return d;
    }
    return null;
  }
  /* Returns a sorted array of prime factors (with multiplicity), or null if it gives up. */
  function factorize(n) {
    var out = [];
    function rec(m) {
      if (m === 1n) return true;
      if (isPrimeBig(m)) { out.push(m); return true; }
      var f = smallestFactor(m);
      if (f === null) f = pollard(m);
      if (f === null) return false;
      return rec(f) && rec(m / f);
    }
    if (!rec(n)) return null;
    return out.sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; });
  }
  function parseBig(s) {
    s = String(s).trim().replace(/[\s,_]/g, '');
    if (!/^[+-]?\d+$/.test(s)) return null;
    try { return BigInt(s); } catch (e) { return null; }
  }
  function sup(n) {
    return String(n).split('').map(function (c) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(c)] || c; }).join('');
  }

  /* ======================================================================= */
  /* Percentage Calculator (also covers the old Percentage Change tool)      */
  /* ======================================================================= */
  Tools.register({
    id: 'percentage-calc', category: 'math', name: 'Percentage Calculator',
    description: 'Answer the common percentage questions: X% of Y, percentage change between two values, increases, decreases and reverse percentages, with a quick reference table.',
    keywords: ['percent', 'percentage', 'calculate', 'math', 'maths', 'increase', 'decrease', 'change', 'of', 'percentage change',
      'percent change', 'percent difference', 'percentage difference', 'growth', 'original value', 'markup',
      'multiplier', 'percentages chart'],
    render: function (root) {
      root$(root);
      /* One question per panel: two inputs, optional chips, a big answer and
         an optional line of working underneath. */
      function block(title, labels, defaults, key, compute, extra) {
        var a = numIn(labels[0], defaults[0]), b = numIn(labels[1], defaults[1]);
        var res = el('div', { class: 'mf-big', text: '—', dataset: { k: key } });
        var line = el('div', { class: 'mf-muted', dataset: { k: key + '-line' } });
        function run() {
          var x = val(a), y = val(b);
          var r = isNaN(x) || isNaN(y) ? null : compute(x, y);
          if (r === null || r === undefined) r = { text: '—' };
          if (typeof r === 'string') r = { text: r };
          res.textContent = r.text;
          res.className = 'mf-big' + (r.cls ? ' ' + r.cls : '');
          line.textContent = r.line || '';
          if (p.after) p.after(x, y);
        }
        var p = U.panel(title, U.row(a, b), extra || null, el('div', { class: 'mf-muted', text: 'Result' }), res, line);
        p.run = run; p.a = a; p.b = b;
        U.live([a, b], run);
        return p;
      }
      function sign(c) { return (c > 0 ? '+' : '') + trim(c, 6) + '%'; }

      root.appendChild(block('What is X% of Y?', ['Percentage (X)', 'Of number (Y)'], [25, 200], 'of',
        function (x, y) { return { text: trim(x / 100 * y, 6), line: trim(x, 6) + '% of ' + trim(y, 6) + ' = ' + trim(x / 100 * y, 6) }; }));
      root.appendChild(block('X is what % of Y?', ['Number (X)', 'Total (Y)'], [50, 200], 'what',
        function (x, y) { return y === 0 ? { text: '—', line: 'The total cannot be 0' } : trim(x / y * 100, 6) + '%'; }));
      root.appendChild(block('Percentage change from X to Y', ['From (original value)', 'To (new value)'], [100, 150], 'change',
        function (x, y) {
          if (x === 0) return { text: '—', line: 'A percentage change from 0 is undefined' };
          var c = (y - x) / Math.abs(x) * 100;
          var diff = Math.abs(y - x), mean = (Math.abs(x) + Math.abs(y)) / 2;
          return {
            text: sign(c) + ' ' + (c > 0 ? '(increase)' : c < 0 ? '(decrease)' : '(no change)'),
            cls: c > 0 ? 'mf-ok' : c < 0 ? 'mf-err' : '',
            line: trim(x, 6) + ' → ' + trim(y, 6) + ' (' + (y >= x ? 'increase' : 'decrease') + ' of ' + trim(diff, 6) + ')' +
              '   ·   multiplier ×' + trim(y / x, 6) +
              (mean ? '   ·   percentage difference ' + trim(diff / mean * 100, 4) + '%' : '')
          };
        }));

      var op = U.chips([{ value: 'inc', label: 'Increase' }, { value: 'dec', label: 'Decrease' }], function () { incdec.run(); }, 'inc');
      op.dataset.k = 'incdec-op';
      var incdec = block('Increase or decrease by a percentage', ['Original value', 'Percentage'], [500, 20], 'incdec',
        function (x, y) {
          var m = op.value === 'inc' ? 1 + y / 100 : 1 - y / 100;
          return { text: trim(x * m, 6), line: trim(x, 6) + ' × ' + trim(m, 6) + ' = ' + trim(x * m, 6) + '   ·   a change of ' + trim(Math.abs(x * m - x), 6) };
        }, op);
      root.appendChild(incdec);

      /* Reverse percentages: the original before a known increase or
         decrease (a price before VAT, a salary before a pay rise). */
      var rop = U.chips([{ value: 'inc', label: 'After an increase' }, { value: 'dec', label: 'After a decrease' }], function () { reverse.run(); }, 'inc');
      rop.dataset.k = 'reverse-op';
      var reverse = block('Reverse percentage: find the original value', ['Value after the change', 'Percentage'], [120, 20], 'reverse',
        function (x, y) {
          var m = rop.value === 'inc' ? 1 + y / 100 : 1 - y / 100;
          if (m <= 0) return { text: '—', line: 'A decrease of 100% or more leaves nothing to reverse' };
          return { text: trim(x / m, 6), line: trim(x, 6) + ' ÷ ' + trim(m, 6) + ' = ' + trim(x / m, 6) };
        }, rop);
      root.appendChild(reverse);

      /* Quick reference table for the "original value" above. */
      var tHead = el('div', { class: 'mf-muted' });
      var tbl = el('div', { class: 'scroll', dataset: { k: 'ref-table' } });
      incdec.after = function (x) {
        if (isNaN(x)) { tHead.textContent = ''; tbl.replaceChildren(); return; }
        tHead.textContent = 'Increase or decrease ' + trim(x, 6) + ' by common percentages';
        tbl.replaceChildren(U.table(['%', 'Increase', 'Decrease'], [5, 10, 15, 20, 25, 30, 40, 50, 75, 100].map(function (p) {
          return [p + '%', trim(x * (1 + p / 100), 6), trim(x * (1 - p / 100), 6)];
        })));
      };
      incdec.run();
      root.appendChild(U.panel('Quick reference table', tHead, tbl));
    }
  });

  /* ======================================================================= */
  /* Scientific Calculator                                                   */
  /* ======================================================================= */
  var FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, log: Math.log10, ln: Math.log, '√': Math.sqrt, sqrt: Math.sqrt,
    asin: Math.asin, acos: Math.acos, atan: Math.atan, abs: Math.abs, exp: Math.exp
  };
  function evaluate(src, deg) {
    var s = String(src).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\*\*/g, '^');
    var toks = [], i = 0;
    while (i < s.length) {
      var ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (/[0-9.]/.test(ch)) {
        var m = /^(\d*\.?\d*)(e[+-]?\d+)?/i.exec(s.slice(i));
        if (!m[0] || m[0] === '.') throw new Error('bad number');
        toks.push({ t: 'n', v: parseFloat(m[0]) }); i += m[0].length; continue;
      }
      if (/[a-z]/i.test(ch)) {
        var w = /^[a-z]+/i.exec(s.slice(i))[0]; i += w.length;
        var lw = w.toLowerCase();
        if (lw === 'pi') toks.push({ t: 'n', v: Math.PI });
        else if (lw === 'e') toks.push({ t: 'n', v: Math.E });
        else if (FUNCS[lw]) toks.push({ t: 'f', v: lw });
        else throw new Error('unknown ' + w);
        continue;
      }
      if (ch === 'π') { toks.push({ t: 'n', v: Math.PI }); i++; continue; }
      if (ch === '√') { toks.push({ t: 'f', v: '√' }); i++; continue; }
      if ('+-*/^()%!'.indexOf(ch) > -1) { toks.push({ t: ch }); i++; continue; }
      throw new Error('unexpected ' + ch);
    }
    var p = 0;
    function peek() { return toks[p]; }
    function eat(t) { if (toks[p] && toks[p].t === t) { p++; return true; } return false; }
    function startsPrimary(tk) { return tk && (tk.t === 'n' || tk.t === 'f' || tk.t === '('); }
    function expr() {
      var v = term();
      for (;;) {
        if (eat('+')) v += term();
        else if (eat('-')) v -= term();
        else return v;
      }
    }
    function term() {
      var v = unary();
      for (;;) {
        if (eat('*')) v *= unary();
        else if (eat('/')) v /= unary();
        else if (startsPrimary(peek())) v *= unary();
        else return v;
      }
    }
    function unary() {
      if (eat('-')) return -unary();
      if (eat('+')) return unary();
      return power();
    }
    function power() {
      var b = postfix();
      if (eat('^')) return Math.pow(b, unary());
      return b;
    }
    function postfix() {
      var v = primary();
      for (;;) {
        if (eat('%')) v /= 100;
        else if (eat('!')) v = fact(v);
        else return v;
      }
    }
    function primary() {
      var tk = toks[p++];
      if (!tk) throw new Error('incomplete');
      if (tk.t === 'n') return tk.v;
      if (tk.t === '(') { var v = expr(); eat(')'); return v; }
      if (tk.t === 'f') {
        var arg;
        if (eat('(')) { arg = expr(); eat(')'); } else arg = unary();
        var fn = FUNCS[tk.v];
        if (deg && /^(sin|cos|tan)$/.test(tk.v)) arg = arg * Math.PI / 180;
        var r = fn(arg);
        if (deg && /^a(sin|cos|tan)$/.test(tk.v)) r = r * 180 / Math.PI;
        return r;
      }
      throw new Error('unexpected ' + tk.t);
    }
    function fact(n) {
      if (n < 0 || !Number.isInteger(n)) return NaN;
      var r = 1; for (var k = 2; k <= n && r !== Infinity; k++) r *= k; return r;
    }
    if (!toks.length) return 0;
    var result = expr();
    if (p < toks.length) throw new Error('syntax');
    return result;
  }
  function fmtCalc(x) {
    if (typeof x !== 'number' || isNaN(x)) return 'Error';
    if (!isFinite(x)) return x > 0 ? 'Infinity' : '-Infinity';
    var r = parseFloat(x.toPrecision(10));
    if (Math.abs(r) < 1e-12) r = 0;
    return String(r);
  }

  Tools.register({
    id: 'scientific-calc', category: 'math', name: 'Scientific Calculator',
    description: 'A button and keyboard calculator with trig, logs, powers, roots and memory.',
    keywords: ['calculator', 'scientific', 'trigonometry', 'sin', 'cos', 'log', 'memory'],
    render: function (root) {
      root$(root);
      var expr = '', last = '', mem = 0, justEval = false, deg = false;
      var exprLine = el('div', { class: 'mf-expr', dataset: { k: 'expr' } });
      var disp = el('div', { class: 'mf-disp', text: '0', dataset: { k: 'display' } });
      var memLabel = el('span', { class: 'mf-muted', text: 'M: 0', dataset: { k: 'mem' } });
      var angle = U.chips([{ value: 'rad', label: 'RAD' }, { value: 'deg', label: 'DEG' }], function (v) { deg = v === 'deg'; update(); }, 'rad');

      function current() {
        try { return evaluate(expr || '0', deg); } catch (e) { return NaN; }
      }
      function update() {
        disp.textContent = expr || '0';
        var preview = '';
        if (expr && !justEval) { var v = current(); if (!isNaN(v)) preview = '= ' + fmtCalc(v); }
        exprLine.textContent = justEval ? last : preview;
        memLabel.textContent = 'M: ' + fmtCalc(mem);
      }
      function append(s, isOperator) {
        if (justEval) {
          if (!isOperator || expr === 'Error') expr = '';
          justEval = false;
        }
        expr += s;
        update();
      }
      function equals() {
        if (!expr) return;
        var v;
        try { v = evaluate(expr, deg); } catch (e) { v = NaN; }
        var open = (expr.match(/\(/g) || []).length - (expr.match(/\)/g) || []).length;
        last = expr + (open > 0 ? new Array(open + 1).join(')') : '') + ' =';
        expr = fmtCalc(v);
        justEval = true;
        update();
      }
      function negate() {
        if (!expr) { append('−'); return; }
        var v = current();
        if (isNaN(v)) return;
        last = '−(' + expr + ') =';
        expr = fmtCalc(-v); justEval = true;
        update();
      }
      function press(k) {
        switch (k) {
          case 'C': expr = ''; last = ''; justEval = false; update(); break;
          case '⌫': if (justEval) { expr = ''; justEval = false; } else expr = expr.replace(/(sin\(|cos\(|tan\(|log\(|ln\(|√\(|.)$/, ''); update(); break;
          case '=': equals(); break;
          case '±': negate(); break;
          case '%': append('%', true); break;
          case '÷': case '×': case '−': case '+': append(k, true); break;
          case 'sin': case 'cos': case 'tan': case 'log': case 'ln': append(k + '('); break;
          case '√': append('√('); break;
          case 'x²': append('^2', true); break;
          case 'xʸ': append('^', true); break;
          case 'π': append('π'); break;
          case 'MC': mem = 0; update(); break;
          case 'MR': append(fmtCalc(mem)); break;
          case 'M+': { var a = current(); if (!isNaN(a)) mem += a; update(); break; }
          case 'M-': { var b = current(); if (!isNaN(b)) mem -= b; update(); break; }
          default: append(k);
        }
      }

      var memRow = el('div', { class: 'mf-mem' }, memLabel, el('div', { class: 'btnrow' },
        ['MC', 'MR', 'M+', 'M-'].map(function (k) { var mb = U.button(k, function () { press(k); }, 'ghost'); mb.dataset.key = k; return mb; })), angle);
      var keys = ['C', '±', '%', '÷', 'sin', 'cos', 'tan', '×', 'log', 'ln', '√', '−', 'x²', 'xʸ', 'π', '+',
        '7', '8', '9', '(', '4', '5', '6', ')', '1', '2', '3', '⌫', '0', '.', '=', ''];
      var pad = el('div', { class: 'mf-keys' }, keys.filter(Boolean).map(function (k) {
        var b = U.button(k, function () { press(k); }, /^[0-9.]$/.test(k) ? '' : (k === '=' ? 'primary' : 'ghost'));
        b.dataset.key = k;
        if (k === '=') b.style.gridColumn = 'span 2';
        return b;
      }));
      var copy = U.copyBtn('Copy result', function () { return expr || '0'; });

      function onKey(e) {
        if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        var map = { '*': '×', '/': '÷', '-': '−', '+': '+', 'Enter': '=', '=': '=', 'Backspace': '⌫', 'Escape': 'C', 'Delete': 'C', '^': 'xʸ', '%': '%', '(': '(', ')': ')', '.': '.', ',': '.', 'p': 'π', 's': 'sin', 'c': 'cos', 't': 'tan', 'l': 'log', 'n': 'ln', 'r': '√' };
        var k = /^[0-9]$/.test(e.key) ? e.key : map[e.key];
        if (!k) return;
        e.preventDefault();
        press(k);
      }
      document.addEventListener('keydown', onKey);
      U.onTeardown(root, function () { document.removeEventListener('keydown', onKey); });

      root.appendChild(U.panel(null, el('div', { class: 'mf-calc' },
        el('div', { class: 'mf-screen' }, exprLine, disp), memRow, pad, el('div', { class: 'btnrow', style: { marginTop: '8px' } }, copy)),
        U.note('Keyboard works too: digits, + − * / ^ ( ) %, Enter for =, Backspace, Esc to clear. Trig uses radians unless DEG is selected.')));
      update();
    }
  });

  /* ======================================================================= */
  /* Number Base Converter                                                   */
  /* ======================================================================= */
  var DIG64 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
  function toBase(n, base) {
    if (base <= 36) { var s = babs(n).toString(base).toUpperCase(); return (n < 0n ? '-' : '') + s; }
    var neg = n < 0n, m = babs(n), out = '', b = BigInt(base);
    if (m === 0n) return '0';
    while (m > 0n) { out = DIG64[Number(m % b)] + out; m /= b; }
    return (neg ? '-' : '') + out;
  }
  Tools.register({
    id: 'number-base', category: 'math', name: 'Number Base Converter',
    description: 'Convert integers of any size between binary, octal, decimal, hex, base 32, 36 and 64.',
    keywords: ['binary', 'hex', 'decimal', 'octal', 'convert', 'radix', 'base64'],
    render: function (root) {
      root$(root);
      var num = textIn('Number', '255');
      var base = U.select({ label: 'Input Base', value: '10', options: [
        { value: '2', label: 'Base 2' }, { value: '8', label: 'Base 8' }, { value: '10', label: 'Base 10' }, { value: '16', label: 'Base 16' }] });
      var status = U.note('');
      var list = el('div');
      var bits = el('div');

      U.live([num, base], function () {
        var from = parseInt(base.querySelector('select').value, 10);
        var raw = num.input.value.trim().replace(/[\s_,]/g, '');
        list.replaceChildren(); bits.replaceChildren(); status.textContent = ''; status.className = 'note';
        if (!raw) return;
        var neg = false;
        if (raw[0] === '-') { neg = true; raw = raw.slice(1); }
        var pre = raw.slice(0, 2).toLowerCase();
        if ((from === 2 && pre === '0b') || (from === 8 && pre === '0o') || (from === 16 && pre === '0x')) raw = raw.slice(2);
        var digits = '0123456789abcdef'.slice(0, from);
        if (!raw || !raw.toLowerCase().split('').every(function (c) { return digits.indexOf(c) > -1; })) {
          status.className = 'note err';
          status.textContent = 'Invalid base-' + from + ' number (allowed digits: ' + digits.toUpperCase() + ')';
          return;
        }
        var n = 0n, b = BigInt(from);
        for (var i = 0; i < raw.length; i++) n = n * b + BigInt(digits.indexOf(raw[i].toLowerCase()));
        if (neg) n = -n;
        var sign = n < 0n ? '-' : '';
        var rows = [
          ['Binary', 2, sign + '0b' + toBase(babs(n), 2)],
          ['Octal', 8, sign + '0o' + toBase(babs(n), 8)],
          ['Decimal', 10, n.toString()],
          ['Hexadecimal', 16, sign + '0x' + toBase(babs(n), 16)],
          ['Base 32', 32, toBase(n, 32)],
          ['Base 36', 36, toBase(n, 36)],
          ['Base 64 (custom)', 64, toBase(n, 64)]
        ];
        rows.forEach(function (r) {
          list.appendChild(el('div', { class: 'mf-row-copy' },
            el('div', null, el('div', { class: 'mf-muted', text: r[0] + ' (Base ' + (r[1] === 64 ? '64' : r[1]) + ')' }),
              el('code', { text: r[2], dataset: { k: 'b' + r[1] } })),
            U.copyBtn('Copy', r[2])));
        });
        var v32 = BigInt.asUintN(32, n);
        var bitStr = v32.toString(2).padStart(32, '0');
        bits.appendChild(el('div', { class: 'mf-muted', text: 'Bitwise Representation (32-bit)' + (babs(n) >= 4294967296n ? ' — lower 32 bits shown' : '') }));
        bits.appendChild(el('div', { class: 'mf-bits', dataset: { k: 'bits' } }, bitStr.split('').map(function (c) {
          return el('span', { class: c === '1' ? 'on' : '', text: c });
        })));
      });
      root.appendChild(U.panel('Input', U.row(el('div', { class: 'field grow' }, num), base), status));
      root.appendChild(U.panel('Conversions', list, el('div', { style: { marginTop: '12px' } }, bits)));
    }
  });

  /* ======================================================================= */
  /* Prime Number Checker                                                    */
  /* ======================================================================= */
  Tools.register({
    id: 'prime-checker', category: 'math', name: 'Prime Number Checker',
    description: 'Test whether a number (of any size) is prime, see the next primes, and list primes up to a limit.',
    keywords: ['prime', 'primality', 'sieve', 'number theory'],
    render: function (root) {
      root$(root);
      var n = textIn('', '97', { inputMode: 'numeric', 'aria-label': 'Number to check' });
      var verdict = el('div', { class: 'mf-big', dataset: { k: 'verdict' } });
      var detail = el('div', { class: 'mf-muted', dataset: { k: 'next' } });
      U.live([n], function () {
        var v = parseBig(n.input.value);
        verdict.className = 'mf-big';
        if (v === null) { verdict.textContent = n.input.value.trim() ? 'Enter a whole number' : ''; detail.textContent = ''; return; }
        if (String(v).length > 400) { verdict.textContent = 'Too large (max 400 digits)'; detail.textContent = ''; return; }
        var prime = isPrimeBig(v);
        verdict.className = 'mf-big ' + (prime ? 'mf-ok' : 'mf-err');
        if (prime) verdict.textContent = '✓ Prime';
        else {
          var why = '';
          if (v < 2n) why = ' (primes are greater than 1)';
          else {
            var f = smallestFactor(v) || (String(v).length <= 40 ? pollard(v) : null);
            if (f) why = ' (divisible by ' + f + ')';
          }
          verdict.textContent = '✗ Not Prime' + why;
        }
        var next = [], c = v < 2n ? 1n : v;
        var limit = String(v).length > 60 ? 2 : 5;
        while (next.length < limit) { c++; if (isPrimeBig(c)) next.push(c.toString()); }
        detail.textContent = 'Next primes: ' + next.join(', ');
      });

      var upto = numIn('Primes up to', 100, { min: 2, max: 10000, step: 1 });
      var found = el('div', { class: 'mf-muted', dataset: { k: 'found' } });
      var listBox = el('div');
      var primes = [];
      U.live([upto], function () {
        var lim = Math.min(10000, Math.max(0, Math.floor(val(upto) || 0)));
        var sieve = new Uint8Array(lim + 1); primes = [];
        for (var i = 2; i <= lim; i++) {
          if (!sieve[i]) { primes.push(i); for (var j = i * i; j <= lim; j += i) sieve[j] = 1; }
        }
        found.textContent = 'Found: ' + primes.length + ' primes' + (val(upto) > 10000 ? ' (limit is 10,000)' : '');
        listBox.replaceChildren(tags(primes));
      });
      root.appendChild(U.panel('Check a Number', n, verdict, detail));
      root.appendChild(U.panel(null, upto, found, listBox, U.btnrow(U.copyBtn('Copy All', function () { return primes.join(', '); }))));
    }
  });

  /* ======================================================================= */
  /* Prime Factorization                                                     */
  /* ======================================================================= */
  function treeText(n, factors) {
    /* A simple factor tree: split off the smallest prime at each level. */
    var lines = [], cur = n, pad = '';
    factors.forEach(function (p, i) {
      if (i === factors.length - 1) { lines.push(pad + cur.toString()); return; }
      lines.push(pad + cur.toString());
      lines.push(pad + '├── ' + p.toString());
      lines.push(pad + '└─┐');
      cur = cur / p;
      pad += '  ';
    });
    return lines.join('\n');
  }
  Tools.register({
    id: 'prime-factorization', category: 'math', name: 'Prime Factorisation',
    description: 'Break any whole number into its prime factors, with exponents, a factor tree and every divisor.',
    keywords: ['prime', 'factor', 'factor tree', 'divisors', 'decompose'],
    render: function (root) {
      root$(root);
      var n = textIn('Number to Factorize', '360', { inputMode: 'numeric' });
      var out = el('div');
      var divisors = [];
      U.live([n], function () {
        out.replaceChildren(); divisors = [];
        var v = parseBig(n.input.value);
        if (v === null) { if (n.input.value.trim()) out.appendChild(U.note('Enter a whole number of 2 or more', 'err')); return; }
        if (v < 2n) { out.appendChild(U.note('Enter a whole number of 2 or more', 'err')); return; }
        if (String(v).length > 36) { out.appendChild(U.note('Numbers up to 36 digits are supported', 'err')); return; }
        var f = factorize(v);
        if (!f) { out.appendChild(U.note('Could not fully factor this number in reasonable time', 'err')); return; }
        var groups = [];
        f.forEach(function (p) {
          var g = groups[groups.length - 1];
          if (g && g.p === p) g.e++; else groups.push({ p: p, e: 1 });
        });
        var expStr = groups.map(function (g) { return g.p + (g.e > 1 ? '^' + g.e : ''); }).join(' × ');
        var expSup = groups.map(function (g) { return g.p + (g.e > 1 ? sup(g.e) : ''); }).join(' × ');
        var count = groups.reduce(function (a, g) { return a * (g.e + 1); }, 1);
        out.appendChild(el('div', { class: 'mf-muted', text: v + ' =' }));
        out.appendChild(el('div', { class: 'mf-big', text: expStr, dataset: { k: 'factors' }, title: expSup }));
        out.appendChild(el('div', { class: 'mf-muted', text: expSup + '   ·   ' + f.join(' × ') }));
        out.appendChild(el('div', { class: 'mf-grid', style: { marginTop: '10px' } },
          card('Prime Factors', String(groups.length), 'unique'),
          card('Total Factors', String(f.length), 'total'),
          card('Is Prime?', f.length === 1 ? '✓ Yes' : '✗ No', 'isprime'),
          card('Number of Divisors', String(count), 'ndiv')));
        out.appendChild(el('h4', { text: 'Unique Prime Factors' }));
        out.appendChild(tags(groups.map(function (g) { return g.p; })));
        out.appendChild(el('h4', { text: 'Factor Tree' }));
        out.appendChild(U.out(treeText(v, f)));
        if (count <= 20000) {
          var ds = [1n];
          groups.forEach(function (g) {
            var next = [], pw = 1n;
            for (var e = 0; e <= g.e; e++) { ds.forEach(function (d) { next.push(d * pw); }); pw *= g.p; }
            ds = next;
          });
          ds.sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; });
          divisors = ds.map(String);
          out.appendChild(el('h4', { text: 'All Divisors of ' + v }));
          out.appendChild(el('div', { dataset: { k: 'divisors' } }, tags(divisors)));
          out.appendChild(U.btnrow(U.copyBtn('Copy', function () { return divisors.join(', '); })));
        } else {
          out.appendChild(U.note(count + ' divisors — too many to list.'));
        }
      });
      root.appendChild(U.panel(null, n));
      root.appendChild(U.panel(null, out));
    }
  });

  /* ======================================================================= */
  /* GCD & LCM                                                               */
  /* ======================================================================= */
  Tools.register({
    id: 'gcd-lcm', category: 'math', name: 'GCD & LCM',
    description: 'Find the greatest common divisor and least common multiple of a list of whole numbers.',
    keywords: ['gcd', 'hcf', 'lcm', 'greatest common divisor', 'least common multiple'],
    render: function (root) {
      root$(root);
      var inp = textIn('Numbers (comma or space separated)', '12, 18, 24', { placeholder: 'e.g. 12, 18, 24' });
      var out = el('div');
      U.live([inp], function () {
        out.replaceChildren();
        var parts = inp.input.value.split(/[\s,;]+/).filter(Boolean);
        if (!parts.length) return;
        var nums = parts.map(parseBig);
        if (nums.some(function (x) { return x === null; })) { out.appendChild(U.note('Only whole numbers are allowed', 'err')); return; }
        nums = nums.map(babs);
        if (nums.length < 2) { out.appendChild(U.note('Enter at least two numbers')); }
        var g = nums.reduce(function (a, b) { return bgcd(a, b); });
        var zero = nums.some(function (x) { return x === 0n; });
        var l = zero ? 0n : nums.reduce(function (a, b) { return a / bgcd(a, b) * b; });
        out.appendChild(el('div', { class: 'mf-grid' },
          el('div', { class: 'mf-card' }, el('span', { text: 'GCD (HCF)' }), el('b', { class: 'mf-big', text: g.toString(), dataset: { k: 'gcd' } }), el('span', { text: 'Greatest Common Divisor' })),
          el('div', { class: 'mf-card' }, el('span', { text: 'LCM' }), el('b', { class: 'mf-big', text: l.toString(), dataset: { k: 'lcm' } }), el('span', { text: 'Least Common Multiple' }))));
        out.appendChild(U.note('Numbers: ' + nums.join(', ')));
        out.appendChild(U.note('Each number is divisible by ' + g));
        if (!zero) out.appendChild(U.note(l + ' is the smallest number divisible by all'));
        if (g === 1n && nums.length > 1) out.appendChild(U.note('The numbers are coprime'));
      });
      root.appendChild(U.panel(null, inp, out));
    }
  });

  /* ======================================================================= */
  /* Fibonacci Sequence                                                      */
  /* ======================================================================= */
  function isFib(n) {
    if (n < 0n) return false;
    var a = 5n * n * n;
    function sq(x) { var r = bsqrt(x); return r * r === x; }
    return sq(a + 4n) || sq(a - 4n);
  }
  Tools.register({
    id: 'fibonacci', category: 'math', name: 'Fibonacci Sequence',
    description: 'List the first N Fibonacci numbers exactly and test whether a number is in the sequence.',
    keywords: ['fibonacci', 'sequence', 'golden ratio', 'series'],
    render: function (root) {
      root$(root);
      var n = numIn('Generate first N Fibonacci numbers (max 100)', 20, { min: 1, max: 100, step: 1 });
      var box = el('div', { dataset: { k: 'seq' } });
      var seq = [];
      U.live([n], function () {
        var count = Math.max(1, Math.min(100, Math.floor(val(n) || 1)));
        seq = []; var a = 0n, b = 1n;
        for (var i = 0; i < count; i++) { seq.push(a.toString()); var t = a + b; a = b; b = t; }
        box.replaceChildren(tags(seq));
      });
      var chk = textIn('', '21', { placeholder: 'Enter number...' });
      var res = el('div', { class: 'mf-mid', dataset: { k: 'check' } });
      U.live([chk], function () {
        var v = parseBig(chk.input.value);
        res.className = 'mf-mid';
        if (v === null) { res.textContent = chk.input.value.trim() ? 'Enter a whole number' : ''; return; }
        if (isFib(v)) {
          var a = 0n, b = 1n, idx = 0;
          while (a < v) { var t = a + b; a = b; b = t; idx++; }
          res.className = 'mf-mid mf-ok';
          res.textContent = v + ' ✓ is a Fibonacci number (F' + idx + ')';
        } else {
          res.className = 'mf-mid mf-err';
          res.textContent = v + ' ✗ is not a Fibonacci number';
        }
      });
      root.appendChild(U.panel(null, n, box, U.btnrow(
        U.copyBtn('Copy CSV', function () { return seq.join(', '); }),
        U.copyBtn('Copy Lines', function () { return seq.join('\n'); }))));
      root.appendChild(U.panel('Check if a number is Fibonacci', chk, res));
    }
  });

  /* ======================================================================= */
  /* Random Number Generator (also covers the old Random Number List tool)   */
  /* ======================================================================= */
  /* Unbiased integer in 0..n-1 from crypto.getRandomValues, for any n up to
     2^53 (rejection sampling, so no value is favoured). */
  function randBelow(n) {
    if (n <= 1) return 0;
    var buf, lim, x;
    if (n <= 4294967296) {
      buf = new Uint32Array(1); lim = Math.floor(4294967296 / n) * n;
      do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= lim);
      return x % n;
    }
    buf = new Uint32Array(2); lim = Math.floor(9007199254740992 / n) * n;
    do { crypto.getRandomValues(buf); x = (buf[0] & 0x1fffff) * 4294967296 + buf[1]; } while (x >= lim);
    return x % n;
  }
  Tools.register({
    id: 'random-number', category: 'generators', name: 'Random Number Generator',
    description: 'Draw one random whole number or a list of them in a range, with or without repeats, sorted or in draw order, ready to copy or download.',
    keywords: ['random', 'rng', 'random number', 'random number list', 'number list', 'random integer', 'dice', 'lottery', 'raffle',
      'pick', 'pick numbers', 'draw', 'no duplicates', 'unique', 'shuffle'],
    render: function (root) {
      root$(root);
      var min = numIn('Min', 1, { step: 1 }), max = numIn('Max', 100, { step: 1 });
      var count = numIn('How many numbers?', 1, { min: 1, max: 10000, step: 1 });
      var uniq = U.checkbox('No duplicates', { checked: true });
      var order = U.select({ label: 'Order', value: 'asc', options: [
        { value: 'asc', label: 'Sorted, lowest first' }, { value: 'desc', label: 'Sorted, highest first' }, { value: 'none', label: 'Draw order' }] });
      var sep = U.select({ label: 'Separator', value: ', ', options: [
        { value: ', ', label: 'Comma and space' }, { value: ',', label: 'Comma' }, { value: '\n', label: 'New line' },
        { value: ' ', label: 'Space' }, { value: '\t', label: 'Tab' }, { value: '; ', label: 'Semicolon' }] });
      var format = U.select({ label: 'Format', value: 'plain', options: [
        { value: 'plain', label: 'Plain list' }, { value: 'json', label: 'JSON array' }, { value: 'numbered', label: 'Numbered lines' }] });
      var status = U.note('');
      var shown = el('div', { dataset: { k: 'results' } });
      var text = U.out('');
      text.dataset.k = 'text';
      var stats = el('div');
      var results = [];

      function formatted() {
        if (!results.length) return '';
        var f = format.querySelector('select').value;
        if (f === 'json') return '[' + results.join(', ') + ']';
        if (f === 'numbered') return results.map(function (v, i) { return (i + 1) + '. ' + v; }).join('\n');
        return results.join(sep.querySelector('select').value);
      }
      function paintText() { text.textContent = formatted(); }

      function gen() {
        status.textContent = ''; status.className = 'note';
        var lo = Math.ceil(val(min)), hi = Math.floor(val(max));
        if (isNaN(lo) || isNaN(hi)) { status.className = 'note err'; status.textContent = 'Enter a minimum and a maximum.'; return; }
        if (hi < lo) { var t = lo; lo = hi; hi = t; }
        if (!Number.isSafeInteger(lo) || !Number.isSafeInteger(hi) || hi - lo >= 9007199254740991) {
          status.className = 'note err'; status.textContent = 'That range is too big: keep it within ±9,007,199,254,740,991.'; return;
        }
        var n = Math.max(1, Math.min(10000, Math.floor(val(count) || 1)));
        var span = hi - lo + 1;
        if (uniq.input.checked && n > span) {
          status.className = 'note err';
          status.textContent = 'Only ' + span + ' unique numbers exist between ' + lo + ' and ' + hi + '. Turn off "No duplicates" or widen the range.';
          return;
        }
        results = [];
        if (uniq.input.checked && span <= 200000) {
          /* partial Fisher-Yates over the range, with a sparse map for the swaps */
          var pool = new Map();
          for (var i = 0; i < n; i++) {
            var j = i + randBelow(span - i);
            var vj = pool.has(j) ? pool.get(j) : j;
            pool.set(j, pool.has(i) ? pool.get(i) : i);
            results.push(lo + vj);
          }
        } else if (uniq.input.checked) {
          var seen = new Set();
          while (results.length < n) { var r = lo + randBelow(span); if (!seen.has(r)) { seen.add(r); results.push(r); } }
        } else {
          for (var k = 0; k < n; k++) results.push(lo + randBelow(span));
        }
        var o = order.querySelector('select').value;
        if (o === 'asc') results.sort(function (a, b) { return a - b; });
        if (o === 'desc') results.sort(function (a, b) { return b - a; });
        shown.replaceChildren(n === 1 ? el('div', { class: 'mf-big', text: String(results[0]) }) : (n <= 500 ? tags(results) : U.note(n + ' numbers: see the list below.')));
        paintText();
        text.style.display = n === 1 ? 'none' : '';
        var sum = results.reduce(function (a, b) { return a + b; }, 0);
        stats.replaceChildren(n > 1 ? U.stats([{ label: 'Count', value: String(n) }, { label: 'Sum', value: String(sum) },
          { label: 'Average', value: trim(sum / n, 3) }, { label: 'Lowest', value: String(Math.min.apply(null, results)) },
          { label: 'Highest', value: String(Math.max.apply(null, results)) }]) : '');
      }
      [sep, format].forEach(function (s) { s.querySelector('select').addEventListener('change', paintText); });

      root.appendChild(U.panel(null, U.row(min, max, count), U.row(uniq), U.row(order, sep, format),
        U.btnrow(U.button('Generate', gen, 'primary'))));
      root.appendChild(U.panel('Result', status, shown, text, stats, U.btnrow(
        U.copyBtn('Copy', formatted),
        U.downloadBtn('Download .txt', 'random-numbers.txt', formatted))));
      gen();
    }
  });

  /* ======================================================================= */
  /* Statistics Calculator                                                   */
  /* ======================================================================= */
  function median(sorted) {
    var n = sorted.length, h = Math.floor(n / 2);
    return n % 2 ? sorted[h] : (sorted[h - 1] + sorted[h]) / 2;
  }
  Tools.register({
    id: 'statistics-calc', category: 'math', name: 'Statistics Calculator',
    description: 'Mean, median, mode, standard deviation, variance, range and quartiles of a list of numbers.',
    keywords: ['statistics', 'mean', 'median', 'mode', 'average', 'standard deviation', 'variance', 'quartile'],
    render: function (root) {
      root$(root);
      var ta = U.textarea({ placeholder: 'Enter numbers separated by commas...', spellcheck: false, rows: 4 });
      ta.value = '4, 7, 13, 2, 8, 1, 16, 4, 7, 9, 3';
      var nums = [];
      function parse() {
        return (ta.value.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi) || []).map(Number).filter(isFinite);
      }
      var sep = U.chips([{ value: ', ', label: 'Comma separated' }, { value: ' ', label: 'Space separated' }, { value: '\n', label: 'Line separated' }],
        function (v) { var n = parse(); if (n.length) { ta.value = n.join(v); ta.dispatchEvent(new Event('input')); } }, ', ');
      var board = el('div');
      var sample = U.checkbox('Sample (n − 1) standard deviation & variance');
      U.live([ta, sample], function () {
        nums = parse();
        board.replaceChildren();
        if (!nums.length) { board.appendChild(U.note('Enter some numbers')); return; }
        var n = nums.length;
        var s = nums.slice().sort(function (a, b) { return a - b; });
        var sum = nums.reduce(function (a, b) { return a + b; }, 0);
        var mean = sum / n;
        var ss = nums.reduce(function (a, v) { return a + (v - mean) * (v - mean); }, 0);
        var variance = sample.input.checked ? (n > 1 ? ss / (n - 1) : NaN) : ss / n;
        var counts = new Map(); nums.forEach(function (v) { counts.set(v, (counts.get(v) || 0) + 1); });
        var top = 0; counts.forEach(function (c) { if (c > top) top = c; });
        var modes = [];
        if (top > 1) counts.forEach(function (c, v) { if (c === top) modes.push(v); });
        modes.sort(function (a, b) { return a - b; });
        var h = Math.floor(n / 2);
        var lower = s.slice(0, h), upper = s.slice(n % 2 ? h + 1 : h);
        var q1 = lower.length ? median(lower) : s[0], q3 = upper.length ? median(upper) : s[n - 1];
        var f = function (x) { return isFinite(x) ? trim(x, 6) : '—'; };
        board.appendChild(el('div', { class: 'mf-grid' },
          card('Count', String(n), 'count'), card('Sum', f(sum), 'sum'), card('Mean (Avg)', f(mean), 'mean'),
          card('Median', f(median(s)), 'median'), card('Mode', modes.length ? modes.map(f).join(', ') : 'None', 'mode'),
          card('Std Deviation', f(Math.sqrt(variance)), 'sd'), card('Variance', f(variance), 'var'),
          card('Minimum', f(s[0]), 'min'), card('Maximum', f(s[n - 1]), 'max'), card('Range', f(s[n - 1] - s[0]), 'range'),
          card('Q1', f(q1), 'q1'), card('Q3', f(q3), 'q3'), card('IQR', f(q3 - q1), 'iqr')));
        board.appendChild(U.note('Sorted: ' + s.map(f).join(', ')));
      });
      root.appendChild(U.panel('Numbers', ta, sep, sample));
      root.appendChild(U.panel(null, board));
    }
  });

  /* ======================================================================= */
  /* Matrix Calculator                                                       */
  /* ======================================================================= */
  function parseMatrix(text) {
    var rows = text.trim().split(/\n+/).map(function (r) { return r.trim().split(/[\s,;]+/).filter(Boolean).map(Number); }).filter(function (r) { return r.length; });
    if (!rows.length) throw new Error('Matrix is empty');
    var w = rows[0].length;
    if (rows.some(function (r) { return r.length !== w; })) throw new Error('Every row needs the same number of values');
    if (rows.some(function (r) { return r.some(function (x) { return !isFinite(x); }); })) throw new Error('Matrices may only contain numbers');
    return rows;
  }
  function det(m) {
    var n = m.length;
    if (!n || m[0].length !== n) throw new Error('Determinant needs a square matrix');
    var a = m.map(function (r) { return r.slice(); }), d = 1;
    for (var c = 0; c < n; c++) {
      var p = c;
      for (var r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
      if (Math.abs(a[p][c]) < 1e-14) return 0;
      if (p !== c) { var t = a[p]; a[p] = a[c]; a[c] = t; d = -d; }
      d *= a[c][c];
      for (var r2 = c + 1; r2 < n; r2++) {
        var f = a[r2][c] / a[c][c];
        for (var k = c; k < n; k++) a[r2][k] -= f * a[c][k];
      }
    }
    return d;
  }
  function inverse(m) {
    var n = m.length;
    if (m[0].length !== n) throw new Error('Inverse needs a square matrix');
    var a = m.map(function (r, i) { return r.concat(m.map(function (_, j) { return i === j ? 1 : 0; })); });
    for (var c = 0; c < n; c++) {
      var p = c;
      for (var r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
      if (Math.abs(a[p][c]) < 1e-12) throw new Error('Matrix is singular (determinant is 0), so it has no inverse');
      var t = a[p]; a[p] = a[c]; a[c] = t;
      var pv = a[c][c];
      for (var k = 0; k < 2 * n; k++) a[c][k] /= pv;
      for (var r2 = 0; r2 < n; r2++) {
        if (r2 === c) continue;
        var f = a[r2][c];
        for (var k2 = 0; k2 < 2 * n; k2++) a[r2][k2] -= f * a[c][k2];
      }
    }
    return a.map(function (r) { return r.slice(n); });
  }
  function mul(a, b) {
    if (a[0].length !== b.length) throw new Error('Columns of the first matrix (' + a[0].length + ') must equal rows of the second (' + b.length + ')');
    return a.map(function (r) { return b[0].map(function (_, j) { return r.reduce(function (s, v, k) { return s + v * b[k][j]; }, 0); }); });
  }
  function addm(a, b, sgn) {
    if (a.length !== b.length || a[0].length !== b[0].length) throw new Error('Matrices must be the same size');
    return a.map(function (r, i) { return r.map(function (v, j) { return v + sgn * b[i][j]; }); });
  }
  function transpose(a) { return a[0].map(function (_, j) { return a.map(function (r) { return r[j]; }); }); }
  Tools.register({
    id: 'matrix-calc', category: 'math', name: 'Matrix Calculator',
    description: 'Multiply, add and subtract matrices, and find determinants, transposes, inverses and powers.',
    keywords: ['matrix', 'determinant', 'inverse', 'transpose', 'linear algebra', 'multiply'],
    render: function (root) {
      root$(root);
      var A = U.textarea({ rows: 4, spellcheck: false }); A.value = '1 2\n3 4';
      var B = U.textarea({ rows: 4, spellcheck: false }); B.value = '5 6\n7 8';
      var dimA = el('span', { class: 'mf-muted' }), dimB = el('span', { class: 'mf-muted' });
      var op = U.select({ label: 'Operation', value: 'mul', options: [
        { value: 'mul', label: 'A × B (Multiply)' }, { value: 'mulba', label: 'B × A (Multiply)' },
        { value: 'add', label: 'A + B (Add)' }, { value: 'sub', label: 'A − B (Subtract)' },
        { value: 'detA', label: 'det(A) (Determinant)' }, { value: 'detB', label: 'det(B) (Determinant)' },
        { value: 'tA', label: 'Aᵀ (Transpose A)' }, { value: 'tB', label: 'Bᵀ (Transpose B)' },
        { value: 'invA', label: 'A⁻¹ (Inverse A)' }, { value: 'invB', label: 'B⁻¹ (Inverse B)' },
        { value: 'sqA', label: 'A² (Square A)' }, { value: 'scalar', label: 'k × A (Scalar multiply)' }] });
      var k = numIn('Scalar k', 2);
      var res = U.out('');
      res.dataset.k = 'result';
      var status = U.note('');
      function fmtM(m) { return m.map(function (r) { return r.map(function (v) { return trim(v, 6); }).join('\t'); }).join('\n'); }
      function dims(t, node) { try { var m = parseMatrix(t); node.textContent = m.length + '×' + m[0].length; } catch (e) { node.textContent = '—'; } }
      U.live([A, B, op, k], function () {
        dims(A.value, dimA); dims(B.value, dimB);
        var o = op.querySelector('select').value;
        k.style.display = o === 'scalar' ? '' : 'none';
        status.textContent = ''; status.className = 'note';
        try {
          var a = parseMatrix(A.value);
          var needB = /mul|add|sub|B$/.test(o) && o !== 'sqA';
          var b = needB ? parseMatrix(B.value) : null;
          var r;
          switch (o) {
            case 'mul': r = mul(a, b); break;
            case 'mulba': r = mul(b, a); break;
            case 'add': r = addm(a, b, 1); break;
            case 'sub': r = addm(a, b, -1); break;
            case 'detA': r = trim(det(a), 6); break;
            case 'detB': r = trim(det(b), 6); break;
            case 'tA': r = transpose(a); break;
            case 'tB': r = transpose(b); break;
            case 'invA': r = inverse(a); break;
            case 'invB': r = inverse(b); break;
            case 'sqA': r = mul(a, a); break;
            case 'scalar': var kv = val(k); r = a.map(function (row) { return row.map(function (v) { return v * kv; }); }); break;
          }
          res.textContent = typeof r === 'string' ? r : fmtM(r);
          if (typeof r !== 'string') status.textContent = 'Result: ' + r.length + '×' + r[0].length;
        } catch (e) {
          res.textContent = '';
          status.className = 'note err';
          status.textContent = e.message;
        }
      });
      root.appendChild(U.panel(null, U.split(
        el('div', null, el('label', { text: 'Matrix A (rows separated by newlines, values by spaces) ' }), dimA, A),
        el('div', null, el('label', { text: 'Matrix B ' }), dimB, B)), U.row(op, k)));
      root.appendChild(U.panel('Result', res, status, U.btnrow(U.copyBtn('Copy', function () { return res.textContent; }))));
    }
  });

  /* ======================================================================= */
  /* Ratio Calculator                                                        */
  /* ======================================================================= */
  /* Scale decimals up to integers so they can be reduced exactly. */
  function toInts(list) {
    var dp = Math.max.apply(null, list.map(function (x) { var s = String(x); return s.indexOf('.') > -1 && !/e/i.test(s) ? s.split('.')[1].length : 0; }));
    dp = Math.min(dp, 12);
    var m = Math.pow(10, dp);
    return list.map(function (x) { return Math.round(x * m); });
  }
  function simplify(list) {
    var ints = toInts(list);
    var g = ints.reduce(function (a, b) { return Number(bgcd(BigInt(a), BigInt(b))); }, 0) || 1;
    return ints.map(function (x) { return x / g; });
  }
  Tools.register({
    id: 'ratio-calc', category: 'math', name: 'Ratio Calculator',
    description: 'Simplify ratios, check or solve proportions, and scale a ratio to a new total.',
    keywords: ['ratio', 'proportion', 'simplify', 'scale', 'aspect'],
    render: function (root) {
      root$(root);
      var box = el('div');
      var tabs = U.chips(['Simplify', 'Proportion', 'Scale'], function (v) { show(v); }, 'Simplify');
      tabs.classList.add('mf-tabs');

      /* Simplify */
      var sa = textIn('', '4', { 'aria-label': 'A' }), sb = textIn('', '6', { 'aria-label': 'B' });
      var sOut = el('div', { class: 'mf-big', dataset: { k: 'simple' } }), sNote = el('div', { class: 'mf-muted', dataset: { k: 'simple-note' } });
      var simplifyPane = el('div', null, el('div', { class: 'mf-inline' }, sa, el('b', { text: ':' }), sb, el('b', { text: '=' })), sOut, sNote);
      U.live([sa, sb], function () {
        var a = val(sa), b = val(sb);
        if (isNaN(a) || isNaN(b) || (a === 0 && b === 0)) { sOut.textContent = '—'; sNote.textContent = ''; return; }
        var s = simplify([a, b]);
        sOut.textContent = s[0] + ':' + s[1];
        var tot = a + b;
        sNote.textContent = 'As decimal: ' + (b === 0 ? '∞' : (a / b).toFixed(4)) + ' | As %: ' +
          (tot ? (a / tot * 100).toFixed(1) + '% : ' + (b / tot * 100).toFixed(1) + '%' : '—');
      });

      /* Proportion  a:b = c:d  (leave one blank to solve it) */
      var pa = textIn('', '4'), pb = textIn('', '6'), pc = textIn('', '10'), pd = textIn('', '15');
      var pOut = el('div', { class: 'mf-mid', dataset: { k: 'prop' } }), pNote = el('div', { class: 'mf-muted', dataset: { k: 'prop-note' } });
      var propPane = el('div', null, el('div', { class: 'mf-inline' }, pa, el('b', { text: ':' }), pb, el('b', { text: '=' }), pc, el('b', { text: ':' }), pd),
        U.note('Leave one box empty to solve for it.'), pOut, pNote);
      U.live([pa, pb, pc, pd], function () {
        var v = [val(pa), val(pb), val(pc), val(pd)];
        var blanks = v.filter(isNaN).length;
        pOut.className = 'mf-mid';
        if (blanks === 1) {
          var i = v.findIndex(isNaN), x;
          if (i === 0) x = v[1] * v[2] / v[3];
          if (i === 1) x = v[0] * v[3] / v[2];
          if (i === 2) x = v[0] * v[3] / v[1];
          if (i === 3) x = v[1] * v[2] / v[0];
          pOut.textContent = isFinite(x) ? ['A', 'B', 'C', 'D'][i] + ' = ' + trim(x, 6) : 'Cannot solve (division by zero)';
          pNote.textContent = '';
          return;
        }
        if (blanks) { pOut.textContent = '—'; pNote.textContent = ''; return; }
        var ok = Math.abs(v[0] * v[3] - v[1] * v[2]) < 1e-9 * Math.max(1, Math.abs(v[0] * v[3]));
        pOut.className = 'mf-mid ' + (ok ? 'mf-ok' : 'mf-err');
        pOut.textContent = ok ? '✓ Ratios are proportional' : '✗ Ratios are not proportional';
        var s1 = (v[0] || v[1]) ? simplify([v[0], v[1]]) : [0, 0], s2 = (v[2] || v[3]) ? simplify([v[2], v[3]]) : [0, 0];
        pNote.textContent = 'Simplified: ' + s1.join(':') + ' vs ' + s2.join(':');
      });

      /* Scale */
      var co = textIn('Original:', '100'), cn = textIn('New total:', '250'), ca = textIn('Part A:', '3'), cb = textIn('Part B:', '4');
      var cOut = el('div'), cA = el('div', { class: 'mf-big', dataset: { k: 'scaleA' } }), cB = el('div', { class: 'mf-mid', dataset: { k: 'scaleB' } });
      var scalePane = el('div', null, U.row(co, cn, ca, cb), cOut, cA, cB);
      U.live([co, cn, ca, cb], function () {
        var o = val(co), nn = val(cn), a = val(ca), b = val(cb);
        if ([o, nn, a, b].some(isNaN) || o === 0) { cOut.textContent = ''; cA.textContent = '—'; cB.textContent = ''; return; }
        var f = nn / o;
        cOut.className = 'mf-muted';
        cOut.textContent = 'When ' + trim(o) + ' scales to ' + trim(nn) + ', Part A (' + trim(a) + ':' + trim(b) + ') becomes:';
        cA.textContent = (a * f).toFixed(4);
        cB.textContent = 'Part B becomes: ' + (b * f).toFixed(4) + '   ·   factor ×' + trim(f, 6);
      });

      var panes = { Simplify: simplifyPane, Proportion: propPane, Scale: scalePane };
      function show(v) { box.replaceChildren(panes[v]); }
      show('Simplify');
      root.appendChild(U.panel(null, tabs, box));
    }
  });

  /* ======================================================================= */
  /* Bitwise Calculator                                                      */
  /* ======================================================================= */
  function bin32(n) { return (n >>> 0).toString(2).padStart(32, '0').replace(/(.{8})(?!$)/g, '$1 '); }
  function hex32(n) { return '0x' + (n >>> 0).toString(16).toUpperCase().padStart(8, '0'); }
  function parseIntFlexible(s) {
    s = String(s).trim().replace(/[_\s]/g, '');
    if (!s) return NaN;
    var neg = s[0] === '-'; if (neg || s[0] === '+') s = s.slice(1);
    var v;
    if (/^0x[0-9a-f]+$/i.test(s)) v = parseInt(s.slice(2), 16);
    else if (/^0b[01]+$/i.test(s)) v = parseInt(s.slice(2), 2);
    else if (/^0o[0-7]+$/i.test(s)) v = parseInt(s.slice(2), 8);
    else if (/^\d+$/.test(s)) v = parseInt(s, 10);
    else return NaN;
    return neg ? -v : v;
  }
  Tools.register({
    id: 'bitwise-calc', category: 'math', name: 'Bitwise Calculator',
    description: 'AND, OR, XOR, NOT and shifts on 32-bit integers, shown in decimal, hex and binary.',
    keywords: ['bitwise', 'and', 'or', 'xor', 'not', 'shift', 'binary', 'bits'],
    render: function (root) {
      root$(root);
      var a = textIn('Value A (decimal)', '60'), b = textIn('Value B (decimal)', '13');
      var shift = numIn('Shift by', 1, { min: 0, max: 31, step: 1 });
      var aInfo = el('div', { class: 'mf-muted mono' }), bInfo = el('div', { class: 'mf-muted mono' });
      var list = el('div', { class: 'mf-grid', style: { gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' } });
      U.live([a, b, shift], function () {
        var x = parseIntFlexible(a.input.value), y = parseIntFlexible(b.input.value);
        var s = Math.max(0, Math.min(31, Math.floor(val(shift) || 0)));
        list.replaceChildren();
        aInfo.textContent = isNaN(x) ? 'Not a whole number' : 'Bin: ' + bin32(x) + '\nHex: ' + hex32(x);
        bInfo.textContent = isNaN(y) ? 'Not a whole number' : 'Bin: ' + bin32(y) + '\nHex: ' + hex32(y);
        aInfo.style.whiteSpace = bInfo.style.whiteSpace = 'pre';
        if (isNaN(x) || isNaN(y)) return;
        x = x | 0; y = y | 0;
        [['AND (&)', x & y, 'and'], ['OR (|)', x | y, 'or'], ['XOR (^)', x ^ y, 'xor'], ['NOT A (~A)', ~x, 'nota'], ['NOT B (~B)', ~y, 'notb'],
         ['Left Shift A << ' + s, x << s, 'shl'], ['Right Shift A >> ' + s, x >> s, 'shr'], ['Unsigned Right A >>> ' + s, x >>> s, 'ushr']]
          .forEach(function (r) {
            list.appendChild(el('div', { class: 'mf-card' }, el('span', { text: r[0] }),
              el('b', { text: r[1] + ' (' + hex32(r[1]) + ')', dataset: { k: r[2] } }),
              el('div', { class: 'mono mf-muted', text: bin32(r[1]) })));
          });
      });
      root.appendChild(U.panel(null, U.split(el('div', null, a, aInfo), el('div', null, b, bInfo)), U.row(shift),
        U.note('Accepts decimal, or 0x / 0b / 0o prefixed values. Values are treated as signed 32-bit integers.')));
      root.appendChild(U.panel(null, list));
    }
  });

  /* ======================================================================= */
  /* Fraction Calculator                                                     */
  /* ======================================================================= */
  function reduceFrac(n, d) {
    if (d === 0n) return null;
    if (d < 0n) { n = -n; d = -d; }
    var g = bgcd(n, d) || 1n;
    return [n / g, d / g];
  }
  function fracDecimal(n, d) { return trim(Number(n) / Number(d), 6); }
  function mixed(n, d) {
    if (d === 1n) return n.toString();
    var neg = n < 0n, an = babs(n), w = an / d, r = an % d;
    if (w === 0n) return (neg ? '-' : '') + r + '/' + d;
    return (neg ? '-' : '') + w + (r ? ' ' + r + '/' + d : '');
  }
  function fracNode(n, d) {
    return el('span', { class: 'mf-frac' }, el('span', { text: n.toString() }), el('i', { text: d.toString() }));
  }
  /* Accept "3", "-3", "0.25" as numerator/denominator parts. */
  function fracPart(s) {
    s = String(s).trim();
    if (/^[+-]?\d+$/.test(s)) return [BigInt(s), 1n];
    var m = /^([+-]?)(\d*)\.(\d+)$/.exec(s);
    if (m) { var d = 10n ** BigInt(m[3].length); return [BigInt(m[1] + (m[2] || '0') + m[3]), d]; }
    return null;
  }
  Tools.register({
    id: 'fraction-calc', category: 'math', name: 'Fraction Calculator',
    description: 'Add, subtract, multiply and divide fractions, with simplified, decimal and mixed-number answers.',
    keywords: ['fraction', 'add fractions', 'simplify', 'mixed number', 'numerator', 'denominator'],
    render: function (root) {
      root$(root);
      var n1 = textIn('', '3', { 'aria-label': 'Numerator 1' }), d1 = textIn('', '4', { 'aria-label': 'Denominator 1' });
      var n2 = textIn('', '1', { 'aria-label': 'Numerator 2' }), d2 = textIn('', '3', { 'aria-label': 'Denominator 2' });
      var op = U.select({ value: '+', options: ['+', '−', '×', '÷'] });
      var out = el('div');
      function frac(nw, dw) {
        var a = fracPart(nw.input.value), b = fracPart(dw.input.value || '1');
        if (!a || !b) return null;
        return [a[0] * b[1], a[1] * b[0]];
      }
      U.live([n1, d1, n2, d2, op], function () {
        out.replaceChildren();
        var f1 = frac(n1, d1), f2 = frac(n2, d2);
        if (!f1 || !f2) { out.appendChild(U.note('Enter whole numbers (or decimals) in every box', 'err')); return; }
        if (f1[1] === 0n || f2[1] === 0n) { out.appendChild(U.note('A denominator cannot be zero', 'err')); return; }
        var o = op.value, n, d;
        if (o === '+') { n = f1[0] * f2[1] + f2[0] * f1[1]; d = f1[1] * f2[1]; }
        if (o === '−') { n = f1[0] * f2[1] - f2[0] * f1[1]; d = f1[1] * f2[1]; }
        if (o === '×') { n = f1[0] * f2[0]; d = f1[1] * f2[1]; }
        if (o === '÷') { n = f1[0] * f2[1]; d = f1[1] * f2[0]; }
        var r = reduceFrac(n, d);
        if (!r) { out.appendChild(U.note('Division by zero', 'err')); return; }
        out.appendChild(el('div', { style: { margin: '6px 0' } }, fracNode(r[0], r[1])));
        out.appendChild(el('div', null, el('span', { class: 'mf-muted', text: 'Simplified: ' }), el('b', { class: 'mono', text: r[1] === 1n ? r[0].toString() : r[0] + '/' + r[1], dataset: { k: 'simplified' } })));
        out.appendChild(el('div', null, el('span', { class: 'mf-muted', text: 'Decimal: ' }), el('b', { class: 'mono', text: fracDecimal(r[0], r[1]), dataset: { k: 'decimal' } })));
        out.appendChild(el('div', null, el('span', { class: 'mf-muted', text: 'Mixed number: ' }), el('b', { class: 'mono', text: mixed(r[0], r[1]), dataset: { k: 'mixed' } })));
      });
      function stackF(n, d) { return el('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', width: '90px' } }, n, d); }
      root.appendChild(U.panel(null, el('div', { class: 'mf-inline', style: { alignItems: 'center' } },
        stackF(n1, d1), op, stackF(n2, d2), el('b', { text: '=' })), out));

      var sn = textIn('', '', { placeholder: 'N', 'aria-label': 'Numerator' }), sd = textIn('', '', { placeholder: 'D', 'aria-label': 'Denominator' });
      var sOut = el('div', { class: 'mf-mid', dataset: { k: 'simp' } });
      function go() {
        var a = parseBig(sn.input.value), b = parseBig(sd.input.value);
        if (a === null || b === null) { sOut.textContent = 'Enter a whole numerator and denominator'; return; }
        var r = reduceFrac(a, b);
        if (!r) { sOut.textContent = 'Denominator cannot be zero'; return; }
        sOut.textContent = a + '/' + b + ' = ' + (r[1] === 1n ? r[0] : r[0] + '/' + r[1]) + '   (' + fracDecimal(r[0], r[1]) + ', ' + mixed(r[0], r[1]) + ')';
      }
      [sn, sd].forEach(function (w) { w.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); }); });
      root.appendChild(U.panel('Simplify fraction', el('div', { class: 'mf-inline' }, sn, el('b', { text: '/' }), sd, U.button('Go', go, 'primary')), sOut));
    }
  });

  /* ======================================================================= */
  /* Quadratic Solver                                                        */
  /* ======================================================================= */
  Tools.register({
    id: 'quadratic-solver', category: 'math', name: 'Quadratic Solver',
    description: 'Solve ax² + bx + c = 0 for real or complex roots, with the discriminant and vertex.',
    keywords: ['quadratic', 'equation', 'roots', 'discriminant', 'vertex', 'parabola'],
    render: function (root) {
      root$(root);
      var a = textIn('', '1', { 'aria-label': 'a' }), b = textIn('', '-5', { 'aria-label': 'b' }), c = textIn('', '6', { 'aria-label': 'c' });
      var out = el('div');
      U.live([a, b, c], function () {
        out.replaceChildren();
        var A = val(a), B = val(b), C = val(c);
        if ([A, B, C].some(isNaN)) { out.appendChild(U.note('Enter numbers for a, b and c', 'err')); return; }
        var f4 = function (x) { return fixed(x, 4); };
        if (A === 0) {
          if (B === 0) { out.appendChild(U.note(C === 0 ? 'Every x is a solution (0 = 0)' : 'No solution (' + C + ' ≠ 0)', 'err')); return; }
          out.appendChild(U.note('a = 0, so this is linear: bx + c = 0'));
          out.appendChild(el('div', { class: 'mf-mid', text: 'x = ' + f4(-C / B), dataset: { k: 'x1' } }));
          return;
        }
        var D = B * B - 4 * A * C;
        out.appendChild(el('div', { class: 'mf-card' }, el('span', { text: 'Discriminant (b² - 4ac)' }), el('b', { text: f4(D), dataset: { k: 'disc' } }),
          el('span', { text: D > 0 ? 'Two distinct real roots' : D === 0 ? 'One repeated real root' : 'Two complex roots' })));
        var roots = el('div', { class: 'mf-card', style: { marginTop: '10px' } });
        if (D > 0) {
          var sq = Math.sqrt(D);
          /* numerically stable form */
          var q = -0.5 * (B + (B >= 0 ? sq : -sq));
          var r1 = q / A, r2 = q !== 0 ? C / q : -r1;
          var hi = Math.max(r1, r2), lo = Math.min(r1, r2);
          roots.append(el('b', { text: 'x₁ = ' + f4(hi), dataset: { k: 'x1' } }), el('b', { text: 'x₂ = ' + f4(lo), dataset: { k: 'x2' } }));
        } else if (D === 0) {
          roots.append(el('b', { text: 'x₁ = x₂ = ' + f4(-B / (2 * A)), dataset: { k: 'x1' } }));
        } else {
          var re = -B / (2 * A), im = Math.abs(Math.sqrt(-D) / (2 * A));
          roots.append(el('b', { text: 'x₁ = ' + f4(re) + ' + ' + f4(im) + 'i', dataset: { k: 'x1' } }), el('b', { text: 'x₂ = ' + f4(re) + ' − ' + f4(im) + 'i', dataset: { k: 'x2' } }));
        }
        out.appendChild(roots);
        var vx = -B / (2 * A), vy = C - B * B / (4 * A);
        out.appendChild(el('div', { class: 'mf-card', style: { marginTop: '10px' } }, el('span', { text: 'Vertex (parabola peak/trough)' }),
          el('b', { text: '(' + f4(vx) + ', ' + f4(vy) + ')', dataset: { k: 'vertex' } }),
          el('span', { text: A > 0 ? 'Opens upward (minimum at vertex)' : 'Opens downward (maximum at vertex)' })));
        out.appendChild(U.note('Axis of symmetry: x = ' + f4(vx) + '   ·   y-intercept: (0, ' + f4(C) + ')'));
      });
      root.appendChild(U.panel(null, el('div', { class: 'mf-inline', style: { alignItems: 'center' } },
        a, el('b', { text: 'x² +' }), b, el('b', { text: 'x +' }), c, el('b', { text: '= 0' })), out));
    }
  });

  /* ======================================================================= */
  /* Logarithm Calculator                                                    */
  /* ======================================================================= */
  Tools.register({
    id: 'logarithm-calc', category: 'math', name: 'Logarithm Calculator',
    description: 'Logarithms in any base, the common logs of a value, and exponentiation.',
    keywords: ['log', 'logarithm', 'ln', 'natural log', 'exponent', 'power'],
    render: function (root) {
      root$(root);
      var n = numIn('Value (n)', 100), base = numIn('Base', 10);
      var head = el('div', { class: 'mf-muted' }), res = el('div', { class: 'mf-big', dataset: { k: 'log' } });
      var tbl = el('div');
      U.live([n, base], function () {
        var x = val(n), b = val(base);
        head.textContent = 'log' + (isNaN(b) ? 'b' : trim(b, 6)) + '(' + (isNaN(x) ? 'n' : trim(x, 10)) + ')';
        tbl.replaceChildren();
        if (isNaN(x) || x <= 0) { res.textContent = 'n must be > 0'; return; }
        if (isNaN(b) || b <= 0 || b === 1) res.textContent = 'Base must be > 0 and ≠ 1';
        else res.textContent = (Math.log(x) / Math.log(b)).toFixed(9);
        tbl.append(el('h4', { text: 'Common Logarithms of ' + trim(x, 10) }), el('div', { class: 'mf-grid' },
          card('log₁₀(n)', Math.log10(x).toFixed(7), 'log10'), card('ln(n) — log base e', Math.log(x).toFixed(7), 'ln'),
          card('log₂(n)', Math.log2(x).toFixed(7), 'log2'), card('log₃(n)', (Math.log(x) / Math.log(3)).toFixed(7), 'log3')));
      });
      var eb = numIn('Base', 10), ex = numIn('Exponent', 3);
      var eHead = el('div', { class: 'mf-muted' }), eRes = el('div', { class: 'mf-big', dataset: { k: 'pow' } });
      U.live([eb, ex], function () {
        var b = val(eb), e = val(ex);
        eHead.replaceChildren(document.createTextNode(isNaN(b) ? 'b' : trim(b, 10)), el('sup', { text: isNaN(e) ? 'x' : trim(e, 10) }));
        if (isNaN(b) || isNaN(e)) { eRes.textContent = '—'; return; }
        var r = Math.pow(b, e);
        eRes.textContent = isNaN(r) ? 'Undefined (complex result)' : !isFinite(r) ? 'Infinity' : Math.abs(r) >= 1e21 ? r.toExponential(6) : r.toFixed(6);
      });
      root.appendChild(U.panel('Logarithm', U.row(n, base), head, res, tbl));
      root.appendChild(U.panel('Exponentiation', U.row(eb, ex), eHead, eRes));
    }
  });

  /* ======================================================================= */
  /* Factorial & Combinatorics                                               */
  /* ======================================================================= */
  function bfact(n) { var r = 1n; for (var i = 2n; i <= BigInt(n); i++) r *= i; return r; }
  Tools.register({
    id: 'factorial-calc', category: 'math', name: 'Factorial & Combinatorics',
    description: 'Exact factorials, combinations C(n,r) and permutations P(n,r), plus a factorial table.',
    keywords: ['factorial', 'combination', 'permutation', 'ncr', 'npr', 'combinatorics'],
    render: function (root) {
      root$(root);
      var n = numIn('n (0–100)', 10, { min: 0, max: 100, step: 1 }), r = numIn('r (for C & P)', 3, { min: 0, max: 100, step: 1 });
      var out = el('div');
      U.live([n, r], function () {
        out.replaceChildren();
        var N = Math.floor(val(n)), R = Math.floor(val(r));
        if (isNaN(N) || N < 0 || N > 100) { out.appendChild(U.note('n must be a whole number from 0 to 100', 'err')); return; }
        var f = bfact(N).toString();
        out.appendChild(el('div', { class: 'mf-card' }, el('span', { text: 'n! = ' + N + '!' }), el('b', { text: f, dataset: { k: 'fact' } }),
          el('span', { text: f.length + ' digit' + (f.length === 1 ? '' : 's') }), U.btnrow(U.copyBtn('Copy', f))));
        if (isNaN(R) || R < 0) { out.appendChild(U.note('r must be a whole number ≥ 0', 'err')); return; }
        if (R > N) { out.appendChild(U.note('r cannot be larger than n', 'err')); return; }
        var P = bfact(N) / bfact(N - R), C = P / bfact(R);
        out.appendChild(el('div', { class: 'mf-card', style: { marginTop: '10px' } }, el('span', { text: 'C(n, r) = C(' + N + ', ' + R + ') — Combinations (order doesn\'t matter)' }),
          el('b', { text: C.toString(), dataset: { k: 'comb' } }), el('span', { text: 'n! / (r! × (n-r)!)' })));
        out.appendChild(el('div', { class: 'mf-card', style: { marginTop: '10px' } }, el('span', { text: 'P(n, r) = P(' + N + ', ' + R + ') — Permutations (order matters)' }),
          el('b', { text: P.toString(), dataset: { k: 'perm' } }), el('span', { text: 'n! / (n-r)!' })));
      });
      var rows = []; for (var i = 1; i <= 20; i++) rows.push([i, bfact(i).toString()]);
      root.appendChild(U.panel(null, U.row(n, r), out));
      root.appendChild(U.panel('Factorial table (1–20)', U.table(['n', 'n!'], rows)));
    }
  });

  /* ======================================================================= */
  /* Triangle Calculator                                                     */
  /* ======================================================================= */
  Tools.register({
    id: 'triangle-calc', category: 'math', name: 'Triangle Calculator',
    description: 'Solve a triangle from three sides (SSS) or two sides and the included angle (SAS).',
    keywords: ['triangle', 'sss', 'sas', 'law of cosines', 'area', 'angles', 'heron'],
    render: function (root) {
      root$(root);
      var mode = 'SSS';
      var tabs = U.chips([{ value: 'SSS', label: 'SSS (3 sides)' }, { value: 'SAS', label: 'SAS (2 sides + angle)' }], function (v) {
        mode = v; thirdLabel.textContent = v === 'SSS' ? 'Side c' : 'Angle C (°)'; third.input.value = v === 'SSS' ? '5' : '90'; out.replaceChildren();
      }, 'SSS');
      tabs.classList.add('mf-tabs');
      var a = numIn('Side a', 3, { min: 0 }), b = numIn('Side b', 4, { min: 0 }), third = numIn('Side c', 5, { min: 0 });
      var thirdLabel = third.querySelector('label');
      var out = el('div');
      var f = function (x) { return trim(x, 4); };
      var deg = function (x) { return x * 180 / Math.PI; };
      function calc() {
        out.replaceChildren();
        var A = val(a), B = val(b), X = val(third), c, angA, angB, angC;
        if ([A, B, X].some(isNaN) || A <= 0 || B <= 0 || X <= 0) { out.appendChild(U.note('Enter positive values', 'err')); return; }
        if (mode === 'SSS') {
          c = X;
          if (A + B <= c || A + c <= B || B + c <= A) { out.appendChild(U.note('Invalid triangle: each side must be shorter than the other two combined', 'err')); return; }
          angA = Math.acos(Math.max(-1, Math.min(1, (B * B + c * c - A * A) / (2 * B * c))));
          angB = Math.acos(Math.max(-1, Math.min(1, (A * A + c * c - B * B) / (2 * A * c))));
          angC = Math.PI - angA - angB;
        } else {
          if (X >= 180) { out.appendChild(U.note('The angle must be between 0 and 180°', 'err')); return; }
          angC = X * Math.PI / 180;
          c = Math.sqrt(A * A + B * B - 2 * A * B * Math.cos(angC));
          angA = Math.acos(Math.max(-1, Math.min(1, (B * B + c * c - A * A) / (2 * B * c))));
          angB = Math.PI - angA - angC;
        }
        var area = 0.5 * A * B * Math.sin(angC);
        var per = A + B + c;
        var degs = [deg(angA), deg(angB), deg(angC)];
        var eq = Math.abs(A - B) < 1e-9 && Math.abs(B - c) < 1e-9, iso = Math.abs(A - B) < 1e-9 || Math.abs(B - c) < 1e-9 || Math.abs(A - c) < 1e-9;
        var maxAng = Math.max.apply(null, degs);
        var type = (eq ? 'Equilateral' : iso ? 'Isosceles' : 'Scalene') + ', ' + (Math.abs(maxAng - 90) < 1e-6 ? 'right' : maxAng > 90 ? 'obtuse' : 'acute');
        out.appendChild(el('div', { class: 'mf-grid' },
          card('Side a', f(A), 'a'), card('Side b', f(B), 'b'), card('Side c', f(c), 'c'),
          card('Angle A', f(degs[0]) + '°', 'A'), card('Angle B', f(degs[1]) + '°', 'B'), card('Angle C', f(degs[2]) + '°', 'C'),
          card('Area', f(area), 'area'), card('Perimeter', f(per), 'perimeter'), card('Height (to c)', f(2 * area / c), 'height')));
        out.appendChild(U.note('Type: ' + type + '   ·   inradius ' + f(area / (per / 2)) + '   ·   circumradius ' + f(A * B * c / (4 * area))));
      }
      root.appendChild(U.panel(null, tabs, U.row(a, b, third), U.btnrow(U.button('Calculate', calc, 'primary')), out));
    }
  });

  /* ======================================================================= */
  /* Circle Calculator                                                       */
  /* ======================================================================= */
  Tools.register({
    id: 'circle-calc', category: 'math', name: 'Circle Calculator',
    description: 'Get radius, diameter, circumference and area of a circle from any one of them.',
    keywords: ['circle', 'radius', 'diameter', 'circumference', 'area', 'pi', 'sector', 'arc'],
    render: function (root) {
      root$(root);
      var from = U.chips(['Radius', 'Diameter', 'Circumference', 'Area'], function (v) { label.textContent = v; run(); }, 'Radius');
      var v = numIn('Radius', 5, { min: 0 });
      var label = v.querySelector('label');
      var sector = numIn('Sector angle (°)', 90, { min: 0, max: 360 });
      var out = el('div');
      var svg = el('div', { style: { maxWidth: '220px', margin: '10px auto 0' } });
      var f = function (x) { return trim(x, 6); };
      function run() {
        out.replaceChildren();
        var x = val(v), ang = val(sector);
        if (isNaN(x) || x < 0) { out.appendChild(U.note('Enter a non-negative number', 'err')); svg.innerHTML = ''; return; }
        if (isNaN(ang)) ang = 90;
        var r;
        switch (from.value) {
          case 'Radius': r = x; break;
          case 'Diameter': r = x / 2; break;
          case 'Circumference': r = x / (2 * Math.PI); break;
          case 'Area': r = Math.sqrt(x / Math.PI); break;
        }
        out.appendChild(el('div', { class: 'mf-grid' },
          card('Radius (r)', f(r), 'r'), card('Diameter (d)', f(2 * r), 'd'),
          card('Circumference (2πr)', f(2 * Math.PI * r), 'circ'), card('Area (πr²)', f(Math.PI * r * r), 'area'),
          card(trim(ang, 4) + '° Sector Area', f(Math.PI * r * r * ang / 360), 'sector'), card(trim(ang, 4) + '° Arc Length', f(2 * Math.PI * r * ang / 360), 'arc')));
        svg.innerHTML = '<svg viewBox="0 0 200 200" width="100%"><circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" stroke-width="2"/>' +
          '<line x1="100" y1="100" x2="180" y2="100" stroke="var(--accent)" stroke-width="2"/><circle cx="100" cy="100" r="3" fill="currentColor"/>' +
          '<text x="140" y="92" text-anchor="middle" font-size="16" fill="currentColor">r</text></svg>';
      }
      U.live([v, sector], run);
      root.appendChild(U.panel(null, el('div', { class: 'mf-muted', text: 'Calculate from:' }), from, U.row(v, sector), out, svg));
    }
  });

  /* ======================================================================= */
  /* Number to Words                                                         */
  /* ======================================================================= */
  var ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  var SCALES = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion', 'sextillion', 'septillion', 'octillion',
    'nonillion', 'decillion', 'undecillion', 'duodecillion', 'tredecillion', 'quattuordecillion', 'quindecillion', 'sexdecillion',
    'septendecillion', 'octodecillion', 'novemdecillion', 'vigintillion'];
  function under1000(n) {
    var parts = [];
    if (n >= 100) { parts.push(ONES[Math.floor(n / 100)] + ' hundred'); n %= 100; }
    if (n) {
      if (n < 20) parts.push(ONES[n]);
      else parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : ''));
    }
    return parts.join(' ');
  }
  function intWords(digits) {
    digits = digits.replace(/^0+(?=\d)/, '');
    if (digits === '0') return 'zero';
    var groups = [];
    for (var i = digits.length; i > 0; i -= 3) groups.unshift(parseInt(digits.slice(Math.max(0, i - 3), i), 10));
    if (groups.length > SCALES.length) throw new Error('Number too large (up to 66 digits)');
    var words = [];
    groups.forEach(function (g, idx) {
      if (!g) return;
      var scale = SCALES[groups.length - 1 - idx];
      words.push(under1000(g) + (scale ? ' ' + scale : ''));
    });
    return words.join(' ');
  }
  function ordinalize(words) {
    var m = /([a-z]+)$/.exec(words);
    var last = m[1], stem = words.slice(0, words.length - last.length);
    var irregular = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };
    var o = irregular[last] || (/y$/.test(last) ? last.slice(0, -1) + 'ieth' : last + 'th');
    return stem + o;
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  Tools.register({
    id: 'number-to-words', category: 'math', name: 'Number to Words',
    description: 'Spell out any number in English words, as a cardinal and an ordinal.',
    keywords: ['number', 'words', 'spell', 'cheque', 'ordinal', 'cardinal', 'english'],
    render: function (root) {
      root$(root);
      var n = textIn('Number', '42', { placeholder: 'e.g. 1234567' });
      var card1 = el('div', { class: 'mf-mid', dataset: { k: 'cardinal' } }), card2 = el('div', { class: 'mf-mid', dataset: { k: 'ordinal' } });
      var status = U.note('');
      U.live([n], function () {
        status.textContent = ''; status.className = 'note';
        var raw = n.input.value.trim().replace(/[,\s_]/g, '');
        card1.textContent = card2.textContent = '';
        if (!raw) return;
        var m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(raw);
        if (!m || (!m[2] && !m[3])) { status.className = 'note err'; status.textContent = 'Enter a valid number'; return; }
        try {
          var neg = m[1] === '-' && /[1-9]/.test((m[2] || '') + (m[3] || ''));
          var w = intWords(m[2] || '0');
          if (m[3]) w += ' point ' + m[3].split('').map(function (d) { return ONES[+d]; }).join(' ');
          card1.textContent = cap((neg ? 'negative ' : '') + w);
          if (!m[3] && !neg) card2.textContent = cap(ordinalize(intWords(m[2])));
          else card2.textContent = '— (ordinals need a non-negative whole number)';
        } catch (e) { status.className = 'note err'; status.textContent = e.message; }
      });
      root.appendChild(U.panel(null, n, status));
      root.appendChild(U.panel('Cardinal (quantity)', card1, U.btnrow(U.copyBtn('Copy', function () { return card1.textContent; }))));
      root.appendChild(U.panel('Ordinal (position)', card2, U.btnrow(U.copyBtn('Copy', function () { return /^—/.test(card2.textContent) ? '' : card2.textContent; }))));
    }
  });

  /* ======================================================================= */
  /* Function Grapher                                                        */
  /* ======================================================================= */

  var FN_NAMES = { sin: 'Math.sin', cos: 'Math.cos', tan: 'Math.tan', asin: 'Math.asin', acos: 'Math.acos', atan: 'Math.atan', sinh: 'Math.sinh', cosh: 'Math.cosh', tanh: 'Math.tanh',
    sqrt: 'Math.sqrt', cbrt: 'Math.cbrt', abs: 'Math.abs', ln: 'Math.log', log: 'Math.log10', log10: 'Math.log10', log2: 'Math.log2', exp: 'Math.exp', floor: 'Math.floor', ceil: 'Math.ceil',
    round: 'Math.round', sign: 'Math.sign', min: 'Math.min', max: 'Math.max', sec: 'sec', csc: 'csc', cot: 'cot' };
  /* Compile "2x^2 + sin(x)" into a JS function of x. Only whitelisted tokens
     reach new Function, so nothing the user types can run as code. */
  function compileFn(src) {
    var s = String(src).trim().replace(/^y\s*=\s*/i, '').replace(/^f\(x\)\s*=\s*/i, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi');
    if (!s) throw new Error('Enter a function of x');
    var toks = [], i = 0, m;
    while (i < s.length) {
      var rest = s.slice(i);
      if ((m = /^\s+/.exec(rest))) { i += m[0].length; continue; }
      if ((m = /^\d*\.?\d+(?:e[+-]?\d+)?|^\d+\./i.exec(rest))) { toks.push(['n', m[0]]); i += m[0].length; continue; }
      if ((m = /^[a-z]+/i.exec(rest))) {
        var w = m[0].toLowerCase();
        if (FN_NAMES[w]) toks.push(['f', w]);
        else if (w === 'x') toks.push(['x']);
        else if (w === 'pi') toks.push(['n', 'Math.PI']);
        else if (w === 'e') toks.push(['n', 'Math.E']);
        else {
          /* "xsinx" or "2xx": split known pieces greedily */
          var j = 0, ok = true, parts = [];
          while (j < w.length) {
            var hit = null;
            Object.keys(FN_NAMES).concat(['pi', 'x', 'e']).sort(function (a, b) { return b.length - a.length; }).some(function (k) { if (w.indexOf(k, j) === j) { hit = k; return true; } });
            if (!hit) { ok = false; break; }
            parts.push(hit); j += hit.length;
          }
          if (!ok) throw new Error('Unknown name "' + m[0] + '"');
          parts.forEach(function (p) { toks.push(FN_NAMES[p] ? ['f', p] : p === 'x' ? ['x'] : ['n', p === 'pi' ? 'Math.PI' : 'Math.E']); });
        }
        i += m[0].length; continue;
      }
      if ('+-*/^(),'.indexOf(s[i]) > -1) { toks.push([s[i]]); i++; continue; }
      throw new Error('Unexpected "' + s[i] + '"');
    }
    /* implicit multiplication */
    var out = [];
    for (var k = 0; k < toks.length; k++) {
      var t = toks[k], prev = out[out.length - 1];
      if (prev && (prev[0] === 'n' || prev[0] === 'x' || prev[0] === ')') && (t[0] === 'n' || t[0] === 'x' || t[0] === 'f' || t[0] === '(')) out.push(['*']);
      out.push(t);
    }
    toks = out;
    var p = 0;
    function peek() { return toks[p]; }
    function eat(t) { if (toks[p] && toks[p][0] === t) { p++; return true; } return false; }
    function expr() { var v = term(); for (;;) { if (eat('+')) v = '(' + v + '+' + term() + ')'; else if (eat('-')) v = '(' + v + '-' + term() + ')'; else return v; } }
    function term() { var v = unary(); for (;;) { if (eat('*')) v = '(' + v + '*' + unary() + ')'; else if (eat('/')) v = '(' + v + '/' + unary() + ')'; else return v; } }
    function unary() { if (eat('-')) return '(-' + unary() + ')'; if (eat('+')) return unary(); return power(); }
    function power() { var b = primary(); if (eat('^')) return 'Math.pow(' + b + ',' + unary() + ')'; return b; }
    function primary() {
      var t = toks[p++];
      if (!t) throw new Error('The expression ends too soon');
      if (t[0] === 'n') return t[1];
      if (t[0] === 'x') return 'x';
      if (t[0] === '(') { var v = expr(); if (!eat(')')) throw new Error('Missing )'); return v; }
      if (t[0] === 'f') {
        var args = [];
        if (eat('(')) { args.push(expr()); while (eat(',')) args.push(expr()); if (!eat(')')) throw new Error('Missing ) after ' + t[1]); }
        else args.push(unary());
        return FN_NAMES[t[1]] + '(' + args.join(',') + ')';
      }
      throw new Error('Unexpected "' + t[0] + '"');
    }
    var body = expr();
    if (p < toks.length) throw new Error('Unexpected "' + toks[p][0] + '"');
    var fn = new Function('x', 'sec', 'csc', 'cot', 'return ' + body + ';');
    var sec = function (v) { return 1 / Math.cos(v); }, csc = function (v) { return 1 / Math.sin(v); }, cot = function (v) { return 1 / Math.tan(v); };
    return function (x) { return fn(x, sec, csc, cot); };
  }

  var GRAPH_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706'];

  Tools.register({
    id: 'function-grapher', category: 'math', name: 'Function Grapher',
    description: 'Plot up to four functions of x on a pannable, zoomable graph, trace values and read off the table.',
    keywords: ['graph', 'plot', 'function', 'equation', 'y=', 'curve', 'sin', 'parabola', 'grapher', 'plotter', 'desmos', 'calculator', 'axes'],
    render: function (root) {
      root$(root);
      var view = { xmin: -10, xmax: 10, ymin: -6, ymax: 6 };
      var inputs = [], fns = [null, null, null, null];
      var canvas = el('canvas', { style: { width: '100%', height: '440px', display: 'block', background: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)', cursor: 'crosshair', touchAction: 'none' } });
      var readout = el('div', { class: 'mf-muted', dataset: { k: 'readout' }, text: 'Hover over the graph to read values.' });
      var errs = el('div');
      var defaults = ['sin(x)', 'x^2/10 - 2', '', ''];
      var list = el('div', { class: 'stack' });
      defaults.forEach(function (d, i) {
        var ip = el('input', { type: 'text', value: d, placeholder: 'e.g. ' + ['cos(x)', '2x+1', 'sqrt(x)', 'e^-x'][i], spellcheck: false, style: { borderLeft: '6px solid ' + GRAPH_COLORS[i], fontFamily: 'var(--mono)' }, dataset: { fn: String(i) } });
        inputs.push(ip);
        list.appendChild(el('div', { class: 'row', style: { alignItems: 'center' } }, el('span', { class: 'mf-muted', style: { fontFamily: 'var(--mono)', width: '54px' }, text: 'y' + (i + 1) + ' =' }), el('div', { style: { flex: '1' } }, ip)));
      });
      var rangeIn = ['xmin', 'xmax', 'ymin', 'ymax'].map(function (k) { return numIn(k.replace('min', ' min').replace('max', ' max'), view[k], { step: 'any', dataset: { k: k } }); });
      var tbody = el('tbody');

      function compileAll() {
        errs.replaceChildren();
        inputs.forEach(function (ip, i) {
          var v = ip.value.trim();
          if (!v) { fns[i] = null; return; }
          try { fns[i] = compileFn(v); } catch (e) { fns[i] = null; errs.appendChild(el('div', { class: 'mf-err', style: { fontSize: '13px' }, text: 'y' + (i + 1) + ': ' + e.message })); }
        });
      }
      function niceStep(span, px, target) {
        var raw = span / (px / target), p = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / p;
        return (r < 1.5 ? 1 : r < 3.5 ? 2 : r < 7.5 ? 5 : 10) * p;
      }
      function fmt(v) { return Math.abs(v) < 1e-9 ? '0' : parseFloat(v.toPrecision(6)).toString(); }
      function draw() {
        var W = canvas.clientWidth || 800, H = 440, dpr = window.devicePixelRatio || 1;
        canvas.width = W * dpr; canvas.height = H * dpr;
        var g = canvas.getContext('2d'); g.scale(dpr, dpr);
        g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
        var sx = W / (view.xmax - view.xmin), sy = H / (view.ymax - view.ymin);
        function X(x) { return (x - view.xmin) * sx; } function Y(y) { return H - (y - view.ymin) * sy; }
        /* grid */
        var xs = niceStep(view.xmax - view.xmin, W, 70), ys = niceStep(view.ymax - view.ymin, H, 60);
        g.font = '11px system-ui, sans-serif'; g.fillStyle = '#64748b'; g.textAlign = 'center'; g.textBaseline = 'top';
        for (var x = Math.ceil(view.xmin / xs) * xs; x <= view.xmax; x += xs) {
          g.strokeStyle = Math.abs(x) < xs / 1000 ? '#334155' : '#e2e8f0'; g.lineWidth = Math.abs(x) < xs / 1000 ? 1.5 : 1;
          g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), H); g.stroke();
          if (Math.abs(x) > xs / 1000) g.fillText(fmt(x), X(x), Math.min(H - 14, Math.max(2, Y(0) + 3)));
        }
        g.textAlign = 'left'; g.textBaseline = 'middle';
        for (var y = Math.ceil(view.ymin / ys) * ys; y <= view.ymax; y += ys) {
          g.strokeStyle = Math.abs(y) < ys / 1000 ? '#334155' : '#e2e8f0'; g.lineWidth = Math.abs(y) < ys / 1000 ? 1.5 : 1;
          g.beginPath(); g.moveTo(0, Y(y)); g.lineTo(W, Y(y)); g.stroke();
          if (Math.abs(y) > ys / 1000) g.fillText(fmt(y), Math.min(W - 30, Math.max(3, X(0) + 4)), Y(y));
        }
        /* curves */
        fns.forEach(function (fn, i) {
          if (!fn) return;
          g.strokeStyle = GRAPH_COLORS[i]; g.lineWidth = 2; g.lineJoin = 'round';
          g.beginPath();
          var pen = false, prevY = NaN, span = view.ymax - view.ymin;
          for (var px = 0; px <= W; px += 0.5) {
            var xv = view.xmin + px / sx, yv;
            try { yv = fn(xv); } catch (e) { yv = NaN; }
            if (typeof yv !== 'number' || !isFinite(yv)) { pen = false; prevY = NaN; continue; }
            var cy = Y(yv);
            /* break at asymptotes: a jump bigger than the whole view between neighbouring samples */
            if (pen && isFinite(prevY) && Math.abs(yv - prevY) > span * 2) pen = false;
            var cyc = Math.max(-1e5, Math.min(1e5, cy));
            if (!pen) { g.moveTo(px, cyc); pen = true; } else g.lineTo(px, cyc);
            prevY = yv;
          }
          g.stroke();
        });
        /* legend */
        var ly = 8;
        fns.forEach(function (fn, i) {
          if (!fn) return;
          g.fillStyle = GRAPH_COLORS[i]; g.fillRect(8, ly + 3, 14, 4);
          g.fillStyle = '#0f172a'; g.font = '12px ui-monospace, monospace'; g.textAlign = 'left'; g.textBaseline = 'top';
          g.fillText('y' + (i + 1) + ' = ' + inputs[i].value.trim(), 28, ly); ly += 16;
        });
        table();
      }
      function table() {
        tbody.replaceChildren();
        var n = 11, step = (view.xmax - view.xmin) / (n - 1);
        for (var k = 0; k < n; k++) {
          var xv = view.xmin + k * step;
          tbody.appendChild(el('tr', {}, el('td', { class: 'mono', text: fmt(xv) }), fns.map(function (fn) {
            var v = '—'; if (fn) { try { var r = fn(xv); v = typeof r === 'number' && isFinite(r) ? fmt(r) : 'undefined'; } catch (e) { v = 'error'; } }
            return el('td', { class: 'mono', text: v });
          })));
        }
      }
      function syncRange() { rangeIn.forEach(function (w) { w.input.value = fmt(view[w.input.dataset.k]); }); }
      function fromRange() {
        var v = {}; rangeIn.forEach(function (w) { v[w.input.dataset.k] = val(w); });
        if (isFinite(v.xmin) && isFinite(v.xmax) && v.xmax > v.xmin && isFinite(v.ymin) && isFinite(v.ymax) && v.ymax > v.ymin) { view = v; draw(); }
      }
      function fitY() {
        var lo = Infinity, hi = -Infinity;
        fns.forEach(function (fn) { if (!fn) return; for (var k = 0; k <= 400; k++) { var y; try { y = fn(view.xmin + (view.xmax - view.xmin) * k / 400); } catch (e) { continue; } if (typeof y === 'number' && isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); } } });
        if (lo === Infinity) return;
        if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
        var pad = (hi - lo) * 0.1; view.ymin = lo - pad; view.ymax = hi + pad; syncRange(); draw();
      }
      /* interaction: hover readout, drag pan, wheel zoom */
      var drag = null;
      canvas.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, v: Object.assign({}, view) }; canvas.setPointerCapture(e.pointerId); });
      canvas.addEventListener('pointermove', function (e) {
        var r = canvas.getBoundingClientRect(), W = r.width, H = r.height;
        if (drag) {
          var dx = (e.clientX - drag.x) / W * (drag.v.xmax - drag.v.xmin), dy = (e.clientY - drag.y) / H * (drag.v.ymax - drag.v.ymin);
          view = { xmin: drag.v.xmin - dx, xmax: drag.v.xmax - dx, ymin: drag.v.ymin + dy, ymax: drag.v.ymax + dy };
          syncRange(); draw(); return;
        }
        var xv = view.xmin + (e.clientX - r.left) / W * (view.xmax - view.xmin);
        readout.textContent = 'x = ' + fmt(xv) + '   ' + fns.map(function (fn, i) { if (!fn) return ''; var y; try { y = fn(xv); } catch (er) { y = NaN; } return 'y' + (i + 1) + ' = ' + (isFinite(y) ? fmt(y) : 'undefined'); }).filter(Boolean).join('   ');
      });
      canvas.addEventListener('pointerup', function () { drag = null; });
      canvas.addEventListener('wheel', function (e) {
        e.preventDefault();
        var r = canvas.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = 1 - (e.clientY - r.top) / r.height, z = e.deltaY > 0 ? 1.2 : 1 / 1.2;
        var cx = view.xmin + fx * (view.xmax - view.xmin), cy = view.ymin + fy * (view.ymax - view.ymin);
        view = { xmin: cx - (cx - view.xmin) * z, xmax: cx + (view.xmax - cx) * z, ymin: cy - (cy - view.ymin) * z, ymax: cy + (view.ymax - cy) * z };
        syncRange(); draw();
      }, { passive: false });
      function zoom(z) { var cx = (view.xmin + view.xmax) / 2, cy = (view.ymin + view.ymax) / 2, hw = (view.xmax - view.xmin) / 2 * z, hh = (view.ymax - view.ymin) / 2 * z; view = { xmin: cx - hw, xmax: cx + hw, ymin: cy - hh, ymax: cy + hh }; syncRange(); draw(); }
      function reset() { view = { xmin: -10, xmax: 10, ymin: -6, ymax: 6 }; syncRange(); draw(); }
      var presets = [['Trig', ['sin(x)', 'cos(x)', 'tan(x)', '']], ['Powers', ['x^2', 'x^3', 'sqrt(x)', '1/x']], ['Exponential & log', ['e^x', 'ln(x)', '2^x', 'log(x)']], ['Damped wave', ['e^(-x/5) * sin(2x)', 'e^(-x/5)', '-e^(-x/5)', '']], ['Gaussian', ['e^(-x^2/2)/sqrt(2pi)', '', '', '']]];
      U.live(inputs, function () { compileAll(); draw(); });
      U.live(rangeIn, fromRange);
      compileAll(); draw();
      var ro = window.ResizeObserver ? new ResizeObserver(function () { draw(); }) : null;
      if (ro) ro.observe(canvas);
      U.onTeardown(root, function () { if (ro) ro.disconnect(); });
      root.appendChild(U.panel(null, list, errs, el('div', { class: 'chips' }, presets.map(function (p) { return el('button', { type: 'button', class: 'chip', onclick: function () { inputs.forEach(function (ip, i) { ip.value = p[1][i]; }); compileAll(); draw(); } }, p[0]); })),
        U.note('Use x as the variable. Supports + − × ÷ ^, brackets, implicit multiplication (2x, x sin x), sin cos tan asin acos atan sinh cosh tanh sqrt cbrt abs ln log log2 exp floor ceil round sign min max, and the constants pi and e.')));
      root.appendChild(U.panel(null, canvas, readout, U.btnrow(U.button('Zoom in', function () { zoom(1 / 1.5); }), U.button('Zoom out', function () { zoom(1.5); }), U.button('Fit y to curves', fitY), U.button('Reset view', reset, 'ghost')),
        el('div', { class: 'mf-inline' }, rangeIn), U.note('Drag to pan, scroll to zoom around the pointer.')));
      root.appendChild(U.panel('Table of values', el('table', { class: 'data' }, el('thead', el('tr', {}, el('th', { text: 'x' }), [1, 2, 3, 4].map(function (i) { return el('th', { text: 'y' + i }); }))), tbody)));
    }
  });

  /* ======================================================================= */
  /* Truth Table & Boolean Simplifier                                        */
  /* ======================================================================= */

  function parseBool(src) {
    var s = String(src).replace(/∧|·|\band\b/gi, '&').replace(/∨|\bor\b/gi, '|').replace(/¬|\bnot\b/gi, '!').replace(/⊕|\bxor\b/gi, '^').replace(/\bnand\b/gi, '@').replace(/\bnor\b/gi, '#')
      .replace(/<->|<=>|↔|==|\biff\b/gi, '=').replace(/->|=>|→|\bimplies\b/gi, '>').replace(/&&/g, '&').replace(/\|\|/g, '|').replace(/\*/g, '&').replace(/\+/g, '|');
    var toks = [], i = 0, m, vars = [];
    while (i < s.length) {
      var rest = s.slice(i);
      if ((m = /^\s+/.exec(rest))) { i += m[0].length; continue; }
      if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest))) { var w = m[0]; if (w === 'TRUE' || w === 'true' || w === 'T') toks.push(['c', 1]); else if (w === 'FALSE' || w === 'false' || w === 'F') toks.push(['c', 0]); else { toks.push(['v', w]); if (vars.indexOf(w) === -1) vars.push(w); } i += w.length; continue; }
      if (/[01]/.test(s[i])) { toks.push(['c', +s[i]]); i++; continue; }
      if ("&|!^@#=>()'".indexOf(s[i]) > -1) { toks.push([s[i]]); i++; continue; }
      throw new Error('Unexpected "' + s[i] + '"');
    }
    var p = 0;
    function eat(t) { if (toks[p] && toks[p][0] === t) { p++; return true; } return false; }
    /* precedence: = < > < | # ^ < & @ < ! */
    function eq() { var a = imp(); while (eat('=')) { var b = imp(); a = (function (x, y) { return function (e) { return x(e) === y(e) ? 1 : 0; }; })(a, b); } return a; }
    function imp() { var a = or(); if (eat('>')) { var b = imp(); return (function (x, y) { return function (e) { return (!x(e) || y(e)) ? 1 : 0; }; })(a, b); } return a; }
    function or() { var a = xor(); for (;;) { if (eat('|')) { a = (function (x, y) { return function (e) { return (x(e) || y(e)) ? 1 : 0; }; })(a, xor()); } else if (eat('#')) { a = (function (x, y) { return function (e) { return (x(e) || y(e)) ? 0 : 1; }; })(a, xor()); } else return a; } }
    function xor() { var a = and(); while (eat('^')) a = (function (x, y) { return function (e) { return x(e) !== y(e) ? 1 : 0; }; })(a, and()); return a; }
    function and() {
      var a = not();
      for (;;) {
        if (eat('&')) a = (function (x, y) { return function (e) { return (x(e) && y(e)) ? 1 : 0; }; })(a, not());
        else if (eat('@')) a = (function (x, y) { return function (e) { return (x(e) && y(e)) ? 0 : 1; }; })(a, not());
        else if (toks[p] && (toks[p][0] === 'v' || toks[p][0] === '(' || toks[p][0] === '!' || toks[p][0] === 'c')) a = (function (x, y) { return function (e) { return (x(e) && y(e)) ? 1 : 0; }; })(a, not()); /* AB = A AND B */
        else return a;
      }
    }
    function not() { if (eat('!')) { var a = not(); return function (e) { return a(e) ? 0 : 1; }; } return post(); }
    function post() { var a = atom(); while (eat("'")) a = (function (x) { return function (e) { return x(e) ? 0 : 1; }; })(a); return a; }
    function atom() {
      var t = toks[p++];
      if (!t) throw new Error('The expression ends too soon');
      if (t[0] === 'v') return function (e) { return e[t[1]]; };
      if (t[0] === 'c') return function () { return t[1]; };
      if (t[0] === '(') { var a = eq(); if (!eat(')')) throw new Error('Missing )'); return a; }
      throw new Error('Unexpected "' + t[0] + '"');
    }
    var fn = eq();
    if (p < toks.length) throw new Error('Unexpected "' + toks[p][0] + '"');
    return { fn: fn, vars: vars };
  }
  /* Quine–McCluskey: minterms -> prime implicants -> greedy cover. */
  function qmc(minterms, nVars) {
    if (!minterms.length) return [];
    if (minterms.length === (1 << nVars)) return [new Array(nVars + 1).join('-')];   /* no literals: always true */
    var groups = {};
    minterms.forEach(function (m) { var s = m.toString(2).padStart(nVars, '0'); groups[s] = [m]; });
    var primes = [], current = Object.keys(groups).map(function (k) { return { t: k, ms: groups[k] }; });
    while (current.length) {
      var next = {}, used = {};
      for (var i = 0; i < current.length; i++) for (var j = i + 1; j < current.length; j++) {
        var a = current[i].t, b = current[j].t, diff = -1, ok = true;
        for (var k = 0; k < nVars; k++) { if (a[k] !== b[k]) { if (a[k] === '-' || b[k] === '-' || diff > -1) { ok = false; break; } diff = k; } }
        if (!ok || diff < 0) continue;
        var t = a.slice(0, diff) + '-' + a.slice(diff + 1);
        used[i] = used[j] = 1;
        if (!next[t]) next[t] = { t: t, ms: current[i].ms.concat(current[j].ms).filter(function (v, idx, arr) { return arr.indexOf(v) === idx; }) };
      }
      current.forEach(function (c, idx) { if (!used[idx] && !primes.some(function (p) { return p.t === c.t; })) primes.push(c); });
      current = Object.keys(next).map(function (k) { return next[k]; });
    }
    /* cover */
    var remaining = minterms.slice(), chosen = [];
    minterms.forEach(function (m) {
      var covering = primes.filter(function (p) { return p.ms.indexOf(m) > -1; });
      if (covering.length === 1 && chosen.indexOf(covering[0]) === -1) chosen.push(covering[0]);
    });
    remaining = remaining.filter(function (m) { return !chosen.some(function (p) { return p.ms.indexOf(m) > -1; }); });
    while (remaining.length) {
      var best = null, bestN = 0;
      primes.forEach(function (p) { if (chosen.indexOf(p) > -1) return; var n = p.ms.filter(function (m) { return remaining.indexOf(m) > -1; }).length; if (n > bestN) { bestN = n; best = p; } });
      if (!best) break;
      chosen.push(best);
      remaining = remaining.filter(function (m) { return best.ms.indexOf(m) === -1; });
    }
    return chosen.map(function (p) { return p.t; });
  }
  function termText(t, vars, style) {
    var parts = [];
    for (var i = 0; i < t.length; i++) { if (t[i] === '1') parts.push(vars[i]); else if (t[i] === '0') parts.push(style === 'math' ? '¬' + vars[i] : vars[i] + "'"); }
    return parts.length ? parts.join(style === 'math' ? ' ∧ ' : style === 'code' ? ' && ' : '') : '1';
  }

  Tools.register({
    id: 'truth-table', category: 'math', name: 'Truth Table & Boolean Simplifier',
    description: 'Build the truth table for a Boolean expression and get its minimal sum-of-products form.',
    keywords: ['truth table', 'boolean', 'logic', 'simplify', 'minimise', 'karnaugh', 'quine mccluskey', 'and or not xor', 'propositional', 'sum of products', 'gates'],
    render: function (root) {
      root$(root);
      var input = textIn(null, "(A & B) | (A & !B & C) | (!A & B & C)", { placeholder: 'e.g. (A AND B) OR NOT C', style: { fontFamily: 'var(--mono)', fontSize: '16px' } });
      var status = el('div');
      var table = el('div', { style: { overflow: 'auto' } });
      var out = el('div');
      function run() {
        table.replaceChildren(); out.replaceChildren(); status.replaceChildren();
        var src = input.input.value.trim();
        if (!src) return;
        var parsed;
        try { parsed = parseBool(src); } catch (e) { status.appendChild(el('div', { class: 'mf-err', text: e.message })); return; }
        var vars = parsed.vars, n = vars.length;
        if (n > 8) { status.appendChild(el('div', { class: 'mf-err', text: 'Up to 8 variables (that is already 256 rows).' })); return; }
        var rows = [], minterms = [], maxterms = [];
        for (var i = 0; i < (1 << n); i++) {
          var env = {}; vars.forEach(function (v, k) { env[v] = (i >> (n - 1 - k)) & 1; });
          var r = parsed.fn(env) ? 1 : 0;
          rows.push({ bits: vars.map(function (v) { return env[v]; }), r: r });
          (r ? minterms : maxterms).push(i);
        }
        table.appendChild(el('table', { class: 'data', dataset: { k: 'table' } },
          el('thead', el('tr', {}, vars.map(function (v) { return el('th', { text: v }); }), el('th', { text: 'Result' }))),
          el('tbody', rows.map(function (row) { return el('tr', { class: row.r ? 'mf-true' : '' }, row.bits.map(function (b) { return el('td', { class: 'mono', text: String(b) }); }), el('td', { class: 'mono', style: { fontWeight: '700', color: row.r ? 'var(--ok)' : 'var(--err)' }, text: String(row.r) })); }))));
        var terms = qmc(minterms, n);
        var sop = terms.length ? terms.map(function (t) { return termText(t, vars, 'math'); }).join(' ∨ ') : '0';
        var sopCode = !terms.length ? 'false' : terms.length === 1 && !terms[0].replace(/-/g, '') ? 'true' : terms.map(function (t) { return terms.length > 1 && t.replace(/-/g, '').length > 1 ? '(' + termText(t, vars, 'code') + ')' : termText(t, vars, 'code'); }).join(' || ');
        var kind = !minterms.length ? 'Contradiction: always false.' : !maxterms.length ? 'Tautology: always true.' : minterms.length + ' of ' + rows.length + ' rows are true.';
        out.append(
          card('Simplified (sum of products)', sop === '1' ? '1 (always true)' : sop, 'sop'),
          card('As code', sopCode.replace(/&&/g, '&&').replace(/\bnot\b/g, '!'), 'code'),
          el('div', { class: 'mf-muted', style: { marginTop: '8px' }, text: kind + ' Minterms Σm(' + minterms.join(', ') + ')' + (n <= 6 ? ' · Maxterms ΠM(' + maxterms.join(', ') + ')' : '') }),
          U.btnrow(U.copyBtn('Copy simplified', function () { return sop; }), U.copyBtn('Copy table as CSV', function () { return vars.join(',') + ',result\n' + rows.map(function (r) { return r.bits.join(',') + ',' + r.r; }).join('\n'); })));
      }
      U.live([input], run);
      root.appendChild(U.panel(null, U.field('Expression', input), status,
        U.note('Variables are letters or words. Operators: AND (& · * ∧), OR (| + ∨), NOT (! ~ ¬ or a trailing \'), XOR (^ ⊕), NAND, NOR, → (implies) and ↔ (iff). AB means A AND B. Precedence: NOT, then AND, XOR, OR, →, ↔.'),
        el('div', { class: 'chips' }, [["A & B | !A & C", 'Mux'], ["(A ^ B) ^ C", 'Parity'], ["!(A & B) == (!A | !B)", "De Morgan"], ["(A -> B) & (B -> C) -> (A -> C)", 'Syllogism'], ["A&B&C | A&B&!C | A&!B&C | !A&B&C", 'Majority']].map(function (p) {
          return el('button', { type: 'button', class: 'chip', onclick: function () { input.input.value = p[0]; run(); } }, p[1]);
        }))));
      root.appendChild(U.panel('Result', out));
      root.appendChild(U.panel('Truth table', table));
    }
  });

  /* Shared with math-b.js (which loads after this file). */
  window.MathKit = {
    evaluate: evaluate, compileFn: compileFn, parseBool: parseBool, qmc: qmc,
    big: { abs: babs, gcd: bgcd, sqrt: bsqrt, modpow: modpow, isPrime: isPrimeBig, factorize: factorize, parse: parseBig }
  };
})();
