/* electronics tools: Ohm's law, LED series resistors, voltage dividers,
   capacitor codes, wire gauges, battery life, 555 timers and PCB traces. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-elec-style')) {
    document.head.appendChild(el('style', { id: 'g-elec-style', text: [
      '.g-elec .el-big{font-size:1.6em;font-weight:700;margin:4px 0;font-variant-numeric:tabular-nums}',
      '.g-elec .el-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}',
      '.g-elec .el-card{border:1px solid var(--border);border-radius:var(--radius);padding:8px 10px;background:var(--bg-sunken);min-width:0}',
      '.g-elec .el-card span{display:block;color:var(--fg-muted);font-size:12px}',
      '.g-elec .el-card b{display:block;font-size:1.15em;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}',
      '.g-elec .el-card.hl{border-color:var(--accent);background:var(--accent-weak)}',
      '.g-elec .el-warn{color:var(--err);margin:4px 0}',
      '.g-elec .el-ok{color:var(--ok);margin:4px 0}',
      '.g-elec .el-scroll{overflow:auto;max-width:100%}',
      '.g-elec .el-si{display:flex;gap:6px;align-items:stretch}',
      '.g-elec .el-si input{flex:1 1 90px;min-width:0}',
      '.g-elec .el-si select{flex:0 0 auto;width:auto}',
      '.g-elec .el-calc input{background:var(--accent-weak);font-style:italic}',
      '.g-elec svg.el-fig{display:block;width:100%;max-width:560px;height:auto;margin:8px auto}',
      '.g-elec svg.el-fig text{fill:var(--fg);font:12px system-ui,sans-serif}',
      '.g-elec svg.el-fig .ln{stroke:var(--fg);fill:none;stroke-width:1.6}',
      '.g-elec svg.el-fig .ac{stroke:var(--accent);fill:none;stroke-width:2}',
      '.g-elec svg.el-fig .mu{stroke:var(--fg-muted);fill:none;stroke-width:1;stroke-dasharray:3 3}',
      '.g-elec svg.el-fig .wedge{fill:var(--bg-sunken);stroke:var(--border)}',
      '.g-elec svg.el-fig .wedge.on{fill:var(--accent-weak);stroke:var(--accent);stroke-width:2}',
      '.g-elec svg.el-fig .hub{fill:var(--bg-elev);stroke:var(--border)}',
      '.g-elec table.data tr.cur td{background:var(--accent-weak);font-weight:600}',
      '.g-elec .el-list{margin:6px 0;padding-left:20px}',
      '.g-elec .field{max-width:100%}'
    ].join('\n') }));
  }

  function box(root) { root.classList.add('g-elec'); return root; }
  /* Append children, skipping null/false and flattening arrays: the native
     append() would print them as text. */
  function put(node) {
    (function add(list) {
      list.forEach(function (k) {
        if (k === null || k === undefined || k === false) return;
        if (Array.isArray(k)) add(k); else node.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
      });
    })(Array.prototype.slice.call(arguments, 1));
    return node;
  }
  function inp(field) { return field.querySelector ? (field.querySelector('input, select, textarea') || field) : field; }
  function num(v) { var n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : NaN; }
  function sig(v, p) { return String(parseFloat(v.toPrecision(p))); }
  function card(label, value, k, hl) {
    return el('div', { class: 'el-card' + (hl ? ' hl' : '') }, el('span', { text: label }), el('b', { dataset: k ? { k: k } : null, text: value }));
  }
  function svgEl(tag, attrs) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]); });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) n.appendChild(typeof arguments[i] === 'string' ? document.createTextNode(arguments[i]) : arguments[i]);
    return n;
  }

  /* --- SI prefixes ---------------------------------------------------------- */

  var PREFIX = { p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, 'μ': 1e-6, m: 1e-3, '': 1, k: 1e3, K: 1e3, M: 1e6, G: 1e9 };
  var PREFIX_NAMES = { '-12': 'p', '-9': 'n', '-6': 'µ', '-3': 'm', '0': '', '3': 'k', '6': 'M', '9': 'G' };

  /* "4.7k", "4k7", "4R7", "2.2 µF", "100n", "0.5 mA", "1e-6" → { value, prefixed }.
     Case matters for m (milli) and M (mega), as on component markings. */
  function parseSI(text) {
    var t = String(text || '').trim().replace(/\s+/g, '').replace(/,/g, '');
    t = t.replace(/(ohms?|Ω|Ω|V|A|W|F|Hz|s)$/i, function (m) { return /^m$/.test(m) ? m : ''; });
    if (!t) return { value: NaN, prefixed: false };
    var rkm = /^(\d*)([pnuµμmkKMGR])(\d+)$/.exec(t);
    if (rkm && rkm[1] + rkm[3]) {
      return { value: parseFloat((rkm[1] || '0') + '.' + rkm[3]) * (rkm[2] === 'R' ? 1 : PREFIX[rkm[2]]), prefixed: rkm[2] !== 'R' };
    }
    var m = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)([pnuµμmkKMGR]?)$/i.exec(t);
    if (!m) return { value: NaN, prefixed: false };
    var p = m[2] === 'R' || m[2] === 'r' ? '' : m[2];
    if (p && !(p in PREFIX)) p = p === 'K' ? 'k' : p;
    return { value: parseFloat(m[1]) * (PREFIX[p] || 1), prefixed: !!p };
  }
  /* Engineering notation: 0.0025532 A → "2.553 mA". */
  function fmtSI(v, unit, digits) {
    if (!isFinite(v)) return '—';
    if (v === 0) return '0 ' + unit;
    var e = Math.floor(Math.log10(Math.abs(v)) / 3) * 3;
    e = Math.max(-12, Math.min(9, e));
    var mant = v / Math.pow(10, e);
    if (Math.abs(parseFloat(mant.toPrecision(digits || 4))) >= 1000 && e < 9) { e += 3; mant /= 1000; }
    return sig(mant, digits || 4) + ' ' + PREFIX_NAMES[String(e)] + unit;
  }
  function bestPrefix(v, allowed) {
    var best = '';
    allowed.forEach(function (p) { if (Math.abs(v) >= PREFIX[p] * 0.9999) best = p; });
    if (!best && allowed.length) best = allowed[0];
    return best;
  }

  /* A number box with a unit prefix picker. get() returns base units; a
     prefix typed into the box ("4.7k") wins over the picker. */
  function siInput(label, unit, prefixes, value, prefix, role, hint) {
    var input = el('input', { type: 'text', inputMode: 'decimal', value: value, spellcheck: false, autocomplete: 'off', 'aria-label': label, dataset: { role: role } });
    var sel = el('select', { 'aria-label': label + ' unit', dataset: { role: role + '-unit' } }, prefixes.map(function (p) {
      return el('option', { value: p, text: (p === 'u' ? 'µ' : p) + unit });
    }));
    sel.value = prefix;
    var wrap = U.field(label, el('div', { class: 'el-si' }, input, sel), hint);
    wrap.input = input; wrap.sel = sel;
    wrap.get = function () {
      var r = parseSI(input.value);
      return r.prefixed ? r.value : r.value * PREFIX[sel.value];
    };
    wrap.set = function (v) {
      if (!isFinite(v)) { input.value = ''; return; }
      var p = bestPrefix(v, prefixes);
      sel.value = p;
      input.value = sig(v / PREFIX[p], 4);
    };
    wrap.onchange = function (fn) { input.addEventListener('input', fn); sel.addEventListener('change', fn); };
    return wrap;
  }

  /* --- E-series preferred values (IEC 60063) --------------------------------- */

  var E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
  var E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
  var E96 = [1.00, 1.02, 1.05, 1.07, 1.10, 1.13, 1.15, 1.18, 1.21, 1.24, 1.27, 1.30, 1.33, 1.37, 1.40, 1.43, 1.47, 1.50, 1.54, 1.58, 1.62, 1.65,
    1.69, 1.74, 1.78, 1.82, 1.87, 1.91, 1.96, 2.00, 2.05, 2.10, 2.15, 2.21, 2.26, 2.32, 2.37, 2.43, 2.49, 2.55, 2.61, 2.67, 2.74, 2.80, 2.87, 2.94,
    3.01, 3.09, 3.16, 3.24, 3.32, 3.40, 3.48, 3.57, 3.65, 3.74, 3.83, 3.92, 4.02, 4.12, 4.22, 4.32, 4.42, 4.53, 4.64, 4.75, 4.87, 4.99, 5.11, 5.23,
    5.36, 5.49, 5.62, 5.76, 5.90, 6.04, 6.19, 6.34, 6.49, 6.65, 6.81, 6.98, 7.15, 7.32, 7.50, 7.68, 7.87, 8.06, 8.25, 8.45, 8.66, 8.87, 9.09, 9.31, 9.53, 9.76];
  var SERIES = { E12: E12, E24: E24, E96: E96 };
  /* The smallest preferred value at or above v. */
  function nextUp(v, series) {
    if (!(v > 0)) return NaN;
    var dec = Math.pow(10, Math.floor(Math.log10(v)));
    for (var k = 0; k < 2; k++) {
      for (var i = 0; i < series.length; i++) {
        var c = series[i] * dec * Math.pow(10, k);
        if (c >= v * (1 - 1e-9)) return parseFloat(c.toPrecision(3));
      }
    }
    return NaN;
  }
  function nearest(v, series) {
    if (!(v > 0)) return NaN;
    var dec = Math.pow(10, Math.floor(Math.log10(v))), best = NaN;
    [dec / 10, dec, dec * 10].forEach(function (d) {
      series.forEach(function (s) { var c = s * d; if (isNaN(best) || Math.abs(Math.log(c / v)) < Math.abs(Math.log(best / v))) best = c; });
    });
    return parseFloat(best.toPrecision(3));
  }
  var WATTS = [[0.125, '⅛ W'], [0.25, '¼ W'], [0.5, '½ W'], [1, '1 W'], [2, '2 W'], [3, '3 W'], [5, '5 W'], [10, '10 W']];
  /* A resistor rated for at least twice what it dissipates runs cool enough. */
  function ratingFor(p) {
    for (var i = 0; i < WATTS.length; i++) if (WATTS[i][0] >= 2 * p) return WATTS[i];
    return null;
  }

  /* --- Ohm's law ---------------------------------------------------------------- */

  var OHM_Q = [
    { key: 'V', label: 'Voltage', unit: 'V', prefixes: ['u', 'm', '', 'k'] },
    { key: 'I', label: 'Current', unit: 'A', prefixes: ['u', 'm', ''] },
    { key: 'R', label: 'Resistance', unit: 'Ω', prefixes: ['m', '', 'k', 'M'] },
    { key: 'P', label: 'Power', unit: 'W', prefixes: ['u', 'm', '', 'k'] }
  ];
  /* For each unknown, the formula that uses each pair of knowns. */
  var OHM_F = {
    V: { IR: ['V = I × R', function (q) { return q.I * q.R; }], IP: ['V = P ÷ I', function (q) { return q.P / q.I; }], PR: ['V = √(P × R)', function (q) { return Math.sqrt(q.P * q.R); }] },
    I: { RV: ['I = V ÷ R', function (q) { return q.V / q.R; }], PV: ['I = P ÷ V', function (q) { return q.P / q.V; }], PR: ['I = √(P ÷ R)', function (q) { return Math.sqrt(q.P / q.R); }] },
    R: { IV: ['R = V ÷ I', function (q) { return q.V / q.I; }], PV: ['R = V² ÷ P', function (q) { return q.V * q.V / q.P; }], IP: ['R = P ÷ I²', function (q) { return q.P / (q.I * q.I); }] },
    P: { IV: ['P = V × I', function (q) { return q.V * q.I; }], IR: ['P = I² × R', function (q) { return q.I * q.I * q.R; }], RV: ['P = V² ÷ R', function (q) { return q.V * q.V / q.R; }] }
  };
  var WHEEL = ['V', 'I', 'R', 'P'];

  Tools.register({
    id: 'ohms-law', category: 'electronics', name: "Ohm's Law & Power Calculator",
    description: 'Enter any two of voltage, current, resistance and power to get the other two, with µ, m, k and M prefixes and the formula wheel.',
    keywords: ['ohms law', "ohm's law", 'voltage', 'current', 'resistance', 'power', 'watts', 'amps', 'volts', 'ohms', 'v=ir', 'p=vi', 'formula wheel', 'electronics', 'circuit'],
    render: function (root) {
      box(root);
      var fields = {}, order = ['V', 'R'];
      var out = el('div', { dataset: { role: 'result' } });
      var wheel = el('div');
      OHM_Q.forEach(function (q) {
        fields[q.key] = siInput(q.label + ' (' + q.key + ')', q.unit, q.prefixes, q.key === 'V' ? '12' : q.key === 'R' ? '4.7' : '', q.key === 'R' ? 'k' : '', 'q-' + q.key);
        fields[q.key].onchange(function () {
          order = order.filter(function (k) { return k !== q.key; });
          if (fields[q.key].input.value.trim()) order.push(q.key);
          run();
        });
      });

      function run() {
        var known = order.filter(function (k) { var v = fields[k].get(); return isFinite(v); }).slice(-2);
        OHM_Q.forEach(function (q) { fields[q.key].classList.toggle('el-calc', known.indexOf(q.key) < 0); });
        out.replaceChildren();
        if (known.length < 2) { out.appendChild(U.note('Type any two values; the other two are worked out.')); drawWheel([]); return; }
        var q = {};
        known.forEach(function (k) { q[k] = fields[k].get(); });
        if ((known.indexOf('R') > -1 && !(q.R > 0)) || (known.indexOf('P') > -1 && q.P < 0)) {
          out.appendChild(U.note('Resistance must be above zero and power zero or more.', 'err')); drawWheel([]); return;
        }
        var pair = known.slice().sort().join(''), used = [];
        OHM_Q.forEach(function (x) {
          if (known.indexOf(x.key) > -1) return;
          var f = OHM_F[x.key][pair];
          q[x.key] = f[1](q);
          used.push(f[0]);
          fields[x.key].set(q[x.key]);
        });
        if (!OHM_Q.every(function (x) { return isFinite(q[x.key]); })) { out.appendChild(U.note('Those values do not give a real answer (check for a zero).', 'err')); drawWheel([]); return; }
        put(out, el('div', { class: 'el-grid' }, OHM_Q.map(function (x) { return card(x.label, fmtSI(q[x.key], x.unit), x.key, known.indexOf(x.key) < 0); })),
          el('p', { class: 'note', dataset: { k: 'formulas' }, text: 'Worked out with ' + used.join(' and ') + '.' }));
        drawWheel(used);
      }
      /* Twelve formulas round a circle, three per quantity. */
      function drawWheel(used) {
        var S = 300, c = S / 2, r1 = 58, r2 = 142, svg = svgEl('svg', { class: 'el-fig', viewBox: '0 0 ' + S + ' ' + S, role: 'img', 'aria-label': "Ohm's law formula wheel", style: 'max-width:320px' });
        var list = [];
        WHEEL.forEach(function (k) { Object.keys(OHM_F[k]).forEach(function (p) { list.push(OHM_F[k][p][0]); }); });
        list.forEach(function (f, i) {
          var a0 = (i * 30 - 90) * Math.PI / 180, a1 = ((i + 1) * 30 - 90) * Math.PI / 180, am = (a0 + a1) / 2;
          var d = 'M' + (c + r1 * Math.cos(a0)) + ' ' + (c + r1 * Math.sin(a0)) + ' L' + (c + r2 * Math.cos(a0)) + ' ' + (c + r2 * Math.sin(a0)) +
            ' A' + r2 + ' ' + r2 + ' 0 0 1 ' + (c + r2 * Math.cos(a1)) + ' ' + (c + r2 * Math.sin(a1)) +
            ' L' + (c + r1 * Math.cos(a1)) + ' ' + (c + r1 * Math.sin(a1)) + ' A' + r1 + ' ' + r1 + ' 0 0 0 ' + (c + r1 * Math.cos(a0)) + ' ' + (c + r1 * Math.sin(a0)) + 'Z';
          svg.appendChild(svgEl('path', { class: 'wedge' + (used.indexOf(f) > -1 ? ' on' : ''), d: d }));
          var tr = (r1 + r2) / 2;
          svg.appendChild(svgEl('text', { x: c + tr * Math.cos(am), y: c + tr * Math.sin(am) + 4, 'text-anchor': 'middle', 'font-size': '10.5' }, f.replace(/ /g, '')));
        });
        svg.appendChild(svgEl('circle', { class: 'hub', cx: c, cy: c, r: r1 }));
        WHEEL.forEach(function (k, i) {
          var a = (i * 90 + 45 - 90) * Math.PI / 180;
          svg.appendChild(svgEl('text', { x: c + 30 * Math.cos(a), y: c + 30 * Math.sin(a) + 6, 'text-anchor': 'middle', 'font-size': '18', 'font-weight': '700' }, k));
        });
        wheel.replaceChildren(svg);
      }
      run();
      root.appendChild(U.panel(null, U.row.apply(null, OHM_Q.map(function (q) { return fields[q.key]; })),
        U.btnrow(U.button('Clear', function () { OHM_Q.forEach(function (q) { fields[q.key].input.value = ''; fields[q.key].sel.value = ''; }); order = []; run(); }, 'ghost')),
        U.note('The two values you typed last are used; the shaded boxes are worked out. You can type prefixes too, such as 4k7, 330m or 2.2M.')));
      root.appendChild(U.panel('Result', out));
      root.appendChild(U.panel('Formula wheel', wheel, U.note('V = voltage (volts), I = current (amps), R = resistance (ohms), P = power (watts). The formulas used are highlighted.')));
    }
  });

  /* --- LED series resistor ---------------------------------------------------- */

  /* Typical forward voltage at 20 mA; datasheets give the exact figure. */
  var LEDS = [['red', 'Red', 2.0], ['orange', 'Orange', 2.1], ['yellow', 'Yellow', 2.1], ['green', 'Green (yellow-green, older type)', 2.2],
    ['truegreen', 'Green (bright, InGaN)', 3.2], ['blue', 'Blue', 3.2], ['white', 'White', 3.2], ['pink', 'Pink or purple', 3.2],
    ['uv', 'Ultraviolet (395 nm)', 3.4], ['ir', 'Infrared (940 nm)', 1.3], ['custom', 'Custom', null]];

  Tools.register({
    id: 'led-resistor', category: 'electronics', name: 'LED Series Resistor Calculator',
    description: 'Work out the resistor for one LED or strings of LEDs from the supply voltage, LED colour and current, with the next E12/E24 values, power rating and warnings.',
    keywords: ['led resistor', 'led calculator', 'current limiting resistor', 'series resistor', 'forward voltage', 'led string', 'arduino led', 'e12', 'e24', 'resistor value', 'leds in series', 'leds in parallel'],
    render: function (root) {
      box(root);
      var supply = U.input({ label: 'Supply voltage (V)', type: 'number', value: '5', step: 'any', min: '0', dataset: { role: 'supply' } });
      var colour = U.select({ label: 'LED colour', dataset: { role: 'colour' }, value: 'red', options: LEDS.map(function (l) { return { value: l[0], label: l[1] + (l[2] ? ' (' + l[2] + ' V)' : '') }; }) });
      var vf = U.input({ label: 'Forward voltage (V)', type: 'number', value: '2.0', step: 'any', min: '0', dataset: { role: 'vf' } });
      var ma = U.input({ label: 'LED current (mA)', type: 'number', value: '20', step: 'any', min: '0', dataset: { role: 'ma' } });
      var series = U.input({ label: 'LEDs in series (per string)', type: 'number', value: '1', step: '1', min: '1', dataset: { role: 'series' } });
      var strings = U.input({ label: 'Parallel strings', type: 'number', value: '1', step: '1', min: '1', dataset: { role: 'strings' } });
      var out = el('div', { dataset: { role: 'result' } });
      var fig = el('div');
      inp(colour).addEventListener('change', function () {
        var l = LEDS.filter(function (x) { return x[0] === inp(colour).value; })[0];
        if (l[2]) inp(vf).value = l[2].toFixed(1);
      });
      inp(vf).addEventListener('input', function () {
        var l = LEDS.filter(function (x) { return x[0] === inp(colour).value; })[0];
        if (l[2] && Math.abs(num(inp(vf).value) - l[2]) > 1e-9) inp(colour).value = 'custom';
      });

      function run() {
        var vs = num(inp(supply).value), f = num(inp(vf).value), i = num(inp(ma).value) / 1000;
        var n = Math.round(num(inp(series).value)), m = Math.round(num(inp(strings).value));
        out.replaceChildren();
        if (!(vs > 0) || !(f > 0) || !(i > 0) || !(n >= 1) || !(m >= 1)) { out.appendChild(U.note('Enter a supply voltage, forward voltage and current above zero, and at least one LED.', 'err')); fig.replaceChildren(); return; }
        var vr = vs - n * f;
        drawFig(n, m);
        if (vr <= 0) {
          out.appendChild(el('p', { class: 'el-warn', dataset: { k: 'error' }, text: 'The supply (' + vs + ' V) is not enough to light ' + n + ' LED' + (n > 1 ? 's' : '') +
            ' in series (' + sig(n * f, 4) + ' V needed). Use fewer LEDs per string or a higher supply voltage.' }));
          return;
        }
        var r = vr / i, r12 = nextUp(r, E12), r24 = nextUp(r, E24);
        var i12 = vr / r12, p12 = vr * i12, i24 = vr / r24, p24 = vr * i24;
        var rating = ratingFor(Math.max(p12, p24));
        var total = i12 * m, pTot = vs * total, pLed = n * m * f * i12;
        var warns = [];
        if (vr < 1 || vr / vs < 0.15) warns.push('Only ' + sig(vr, 3) + ' V is left for the resistor, so the current will swing a lot with supply and LED variation. Consider one fewer LED per string.');
        if (i > 0.03) warns.push('Most 3 mm and 5 mm indicator LEDs are rated at 20 mA (some 30 mA). Check the datasheet; high-power LEDs need a constant-current driver.');
        if (p12 > 0.5) warns.push('The resistor burns ' + fmtSI(p12, 'W') + '. A constant-current driver would waste much less.');
        if (!rating) warns.push('That is more than a single 10 W resistor should take; use a constant-current driver.');
        if (m > 1) warns.push('Give each of the ' + m + ' strings its own resistor. Sharing one resistor between parallel strings lets the brightest string hog the current.');
        put(out, 
          el('div', { class: 'el-grid' },
            card('Exact resistance', fmtSI(r, 'Ω'), 'exact'),
            card('Next E12 value up', fmtSI(r12, 'Ω'), 'e12', true),
            card('Next E24 value up', fmtSI(r24, 'Ω'), 'e24'),
            card('Current with E12 value', fmtSI(i12, 'A'), 'i12'),
            card('Resistor power (E12)', fmtSI(p12, 'W'), 'p12'),
            card('Resistor rating', rating ? rating[1] + ' or more' : 'Too much for one resistor', 'watt'),
            card('Total supply current', fmtSI(total, 'A'), 'total'),
            card('Power from the supply', fmtSI(pTot, 'W'), 'ptotal'),
            card('Efficiency (light share)', Math.round(pLed / pTot * 100) + '%', 'eff')),
          el('p', { class: 'note', text: (m > 1 ? m + ' strings, each: ' : 'Circuit: ') + 'one ' + fmtSI(r12, 'Ω') + ' resistor in series with ' + n + ' LED' + (n > 1 ? 's' : '') +
            '. With the E24 value (' + fmtSI(r24, 'Ω') + ') the current is ' + fmtSI(i24, 'A') + ' and the resistor takes ' + fmtSI(p24, 'W') + '.' }),
          warns.map(function (w) { return el('p', { class: 'el-warn', text: '⚠ ' + w }); }));
      }
      /* One string: supply, resistor and the LEDs in a row. */
      function drawFig(n, m) {
        var shown = Math.min(n, 5), W = 120 + shown * 60 + 40, H = 110;
        var svg = svgEl('svg', { class: 'el-fig', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Circuit of one LED string' });
        svg.appendChild(svgEl('path', { class: 'ln', d: 'M20 30 H40 M40 30 l5 -8 l10 16 l10 -16 l10 16 l10 -16 l5 8 H110' }));
        svg.appendChild(svgEl('text', { x: 70, y: 15, 'text-anchor': 'middle' }, 'R'));
        for (var k = 0; k < shown; k++) {
          var x = 110 + k * 60;
          svg.appendChild(svgEl('path', { class: 'ln', d: 'M' + x + ' 30 H' + (x + 18) + ' M' + (x + 18) + ' 20 V40 L' + (x + 34) + ' 30 Z M' + (x + 34) + ' 20 V40 M' + (x + 34) + ' 30 H' + (x + 60) }));
          svg.appendChild(svgEl('path', { class: 'ac', d: 'M' + (x + 26) + ' 16 l6 -8 M' + (x + 32) + ' 18 l6 -8' }));
        }
        var end = 110 + shown * 60;
        if (n > shown) svg.appendChild(svgEl('text', { x: end - 30, y: 56, 'text-anchor': 'middle' }, '… ' + n + ' LEDs'));
        svg.appendChild(svgEl('path', { class: 'ln', d: 'M' + end + ' 30 H' + (W - 20) + ' V85 H20 V30' }));
        svg.appendChild(svgEl('text', { x: 24, y: 76 }, '+ supply'));
        svg.appendChild(svgEl('text', { x: W - 24, y: 76, 'text-anchor': 'end' }, m > 1 ? '× ' + m + ' strings' : '0 V'));
        fig.replaceChildren(svg);
      }
      U.live([supply, colour, vf, ma, series, strings], run);
      root.appendChild(U.panel(null, U.row(supply, colour, vf, ma), U.row(series, strings)));
      root.appendChild(U.panel('Result', out, fig));
      root.appendChild(U.panel(null, U.note('R = (supply − LEDs × forward voltage) ÷ current. The next preferred value up keeps the current at or below what you asked for. Forward voltages are typical; your LED\'s datasheet has the real figure, and it changes a little with temperature.')));
    }
  });

  /* --- Voltage divider ---------------------------------------------------------- */

  function parallel(a, b) { return a * b / (a + b); }

  Tools.register({
    id: 'voltage-divider', category: 'electronics', name: 'Voltage Divider Calculator',
    description: 'Work out a voltage divider output from Vin, R1 and R2 (with an optional load), or find the best E12, E24 or E96 resistor pairs for a target voltage or ratio.',
    keywords: ['voltage divider', 'potential divider', 'resistor divider', 'r1 r2', 'vout', 'ratio', 'e12', 'e24', 'e96', 'level shift', 'adc input', 'feedback resistors'],
    render: function (root) {
      box(root);
      var mode = U.chips([{ value: 'out', label: 'Find the output voltage' }, { value: 'pick', label: 'Choose resistors' }], function () { show(); }, 'out');
      var vin = U.input({ label: 'Input voltage Vin (V)', type: 'number', value: '12', step: 'any', dataset: { role: 'vin' } });
      var r1 = siInput('R1 (top)', 'Ω', ['', 'k', 'M'], '10', 'k', 'r1');
      var r2 = siInput('R2 (bottom)', 'Ω', ['', 'k', 'M'], '4.7', 'k', 'r2');
      var rl = siInput('Load RL (optional)', 'Ω', ['', 'k', 'M'], '', 'k', 'rl', 'Leave empty for no load');
      var target = U.input({ label: 'Target output (V) or ratio', value: '3.3', dataset: { role: 'target' }, hint: 'A voltage, or a ratio such as 0.5 or 1:2' });
      var pickVin = U.input({ label: 'Input voltage Vin (V)', type: 'number', value: '5', step: 'any', dataset: { role: 'pick-vin' } });
      var series = U.select({ label: 'Resistor series', dataset: { role: 'series' }, value: 'E24', options: ['E12', 'E24', 'E96'] });
      var total = siInput('Roughly how much total resistance', 'Ω', ['', 'k', 'M'], '10', 'k', 'total', 'Sets the current the divider draws');
      var outBox = el('div', { dataset: { role: 'result' } }), pickBox = el('div', { dataset: { role: 'pairs' } });
      var p1 = U.panel(null, U.row(vin, r1, r2, rl), outBox), p2 = U.panel(null, U.row(pickVin, target, series, total), pickBox);

      function show() { p1.style.display = mode.value === 'out' ? '' : 'none'; p2.style.display = mode.value === 'pick' ? '' : 'none'; if (mode.value === 'out') runOut(); else runPick(); }
      function fig(loaded) {
        var svg = svgEl('svg', { class: 'el-fig', viewBox: '0 0 260 200', role: 'img', 'aria-label': 'Voltage divider circuit', style: 'max-width:260px' });
        var zig = function (x, y) { return 'M' + x + ' ' + y + ' v8 l8 4 l-16 8 l16 8 l-16 8 l16 8 l-8 4 v8'; };
        svg.appendChild(svgEl('path', { class: 'ln', d: 'M60 10 V30 ' + zig(60, 30) + ' V100 ' + zig(60, 100) + ' V190 M40 190 H80' }));
        svg.appendChild(svgEl('text', { x: 70, y: 16 }, 'Vin'));
        svg.appendChild(svgEl('text', { x: 82, y: 64 }, 'R1'));
        svg.appendChild(svgEl('text', { x: 82, y: 134 }, 'R2'));
        svg.appendChild(svgEl('path', { class: 'ac', d: 'M60 100 H' + (loaded ? 180 : 150) }));
        svg.appendChild(svgEl('text', { x: 150, y: 94 }, 'Vout'));
        if (loaded) {
          svg.appendChild(svgEl('path', { class: 'ln', d: 'M180 100 V110 ' + zig(180, 110) + ' V190 H60' }));
          svg.appendChild(svgEl('text', { x: 200, y: 144 }, 'RL'));
        }
        return svg;
      }
      function runOut() {
        var v = num(inp(vin).value), a = r1.get(), b = r2.get(), l = rl.get();
        outBox.replaceChildren();
        if (!isFinite(v) || !(a >= 0) || !(b > 0) || a + b === 0) { outBox.appendChild(U.note('Enter Vin, and R1 and R2 of zero or more (R2 above zero).', 'err')); return; }
        var ratio = b / (a + b), vout = v * ratio, idiv = v / (a + b);
        var kids = [card('Output voltage (no load)', fmtSI(vout, 'V'), 'vout', !(l > 0)), card('Ratio Vout ÷ Vin', sig(ratio, 5), 'ratio'),
          card('Divider current', fmtSI(idiv, 'A'), 'idiv'), card('Output resistance (R1 ∥ R2)', fmtSI(parallel(a, b), 'Ω'), 'rout'),
          card('Power in R1', fmtSI(idiv * idiv * a, 'W'), 'pr1'), card('Power in R2', fmtSI(idiv * idiv * b, 'W'), 'pr2')];
        if (l > 0) {
          var b2 = parallel(b, l), vl = v * b2 / (a + b2);
          kids.splice(1, 0, card('Output voltage with load', fmtSI(vl, 'V'), 'vload', true));
          kids.push(card('Load current', fmtSI(vl / l, 'A'), 'iload'), card('Drop caused by the load', sig((vl / vout - 1) * 100, 3) + '%', 'drop'));
        }
        put(outBox, el('div', { class: 'el-grid' }, kids), fig(l > 0),
          U.note('Vout = Vin × R2 ÷ (R1 + R2). A load in parallel with R2 pulls the output down; keep the load at least ten times R2 for under about 10% error.'));
      }
      function runPick() {
        pickBox.replaceChildren();
        var v = num(inp(pickVin).value), t = String(inp(target).value).trim(), ratio;
        var rm = /^(\d*\.?\d+)\s*:\s*(\d*\.?\d+)$/.exec(t);
        if (rm) ratio = parseFloat(rm[1]) / (parseFloat(rm[1]) + parseFloat(rm[2]));
        else { var x = num(t.replace(/v$/i, '')); ratio = x > 0 && x < 1 && !/v$/i.test(t) && !(v > 0 && x < v && x >= 1) ? x : x / v; }
        var tot = total.get();
        if (!(ratio > 0 && ratio < 1) || !(tot > 0)) { pickBox.appendChild(U.note('Enter an input voltage and a lower target voltage, or a ratio between 0 and 1.', 'err')); return; }
        var list = SERIES[inp(series).value], seen = {}, cands = [];
        /* R2/(R1+R2) only depends on R2/R1, so search mantissas over a few
           decades and scale the pair to the total resistance asked for. */
        list.forEach(function (a) {
          [-2, -1, 0, 1, 2].forEach(function (d) {
            list.forEach(function (b) {
              var bb = b * Math.pow(10, d), rr = bb / (a + bb), key = (bb / a).toPrecision(6);
              if (seen[key]) return;
              seen[key] = true;
              cands.push({ a: a, b: bb, r: rr, err: rr / ratio - 1 });
            });
          });
        });
        cands.sort(function (x, y) { return Math.abs(x.err) - Math.abs(y.err); });
        var rows = cands.slice(0, 8).map(function (c) {
          var k = Math.round(Math.log10(tot / (c.a + c.b)));
          var R1 = parseFloat((c.a * Math.pow(10, k)).toPrecision(3)), R2 = parseFloat((c.b * Math.pow(10, k)).toPrecision(3));
          var vout = v > 0 ? v * R2 / (R1 + R2) : NaN;
          return [fmtSI(R1, 'Ω'), fmtSI(R2, 'Ω'), v > 0 ? fmtSI(vout, 'V') : '—', (c.err >= 0 ? '+' : '') + sig(c.err * 100, 3) + '%', v > 0 ? fmtSI(v / (R1 + R2), 'A') : '—'];
        });
        var t0 = U.table(['R1 (top)', 'R2 (bottom)', 'Vout', 'Error', 'Current'], rows);
        var first = t0.querySelector('tbody tr');
        if (first) first.className = 'cur';
        put(pickBox, el('p', { dataset: { k: 'best' }, text: 'Best pair: R1 = ' + rows[0][0] + ', R2 = ' + rows[0][1] + (v > 0 ? ', giving ' + rows[0][2] : '') + ' (' + rows[0][3] + ').' }),
          el('div', { class: 'el-scroll' }, t0), U.note('Target ratio ' + sig(ratio, 5) + '. Errors ignore resistor tolerance: 1% resistors can add up to about ±1% more.'));
      }
      [r1, r2, rl].forEach(function (f) { f.onchange(runOut); });
      inp(vin).addEventListener('input', runOut);
      total.onchange(runPick);
      [pickVin, target, series].forEach(function (f) { inp(f).addEventListener('input', runPick); inp(f).addEventListener('change', runPick); });
      root.appendChild(U.panel(null, mode));
      root.appendChild(p1); root.appendChild(p2);
      show();
    }
  });

  /* --- Capacitor codes --------------------------------------------------------- */

  /* IEC 60062 tolerance letters. [letter, below 10 pF, from 10 pF] */
  var CAP_TOL = [['B', '±0.1 pF', '±0.1%'], ['C', '±0.25 pF', '±0.25%'], ['D', '±0.5 pF', '±0.5%'], ['F', '±1 pF', '±1%'], ['G', '±2 pF', '±2%'],
    ['J', null, '±5%'], ['K', null, '±10%'], ['M', null, '±20%'], ['N', null, '±30%'], ['P', null, '+100% −0%'], ['S', null, '+50% −20%'], ['Z', null, '+80% −20%']];
  /* EIA voltage codes: the digit is a power of ten, the letter the first figures. */
  var VOLT_LETTER = { A: 1.0, B: 1.25, C: 1.6, D: 2.0, E: 2.5, F: 3.15, G: 4.0, H: 5.0, J: 6.3, K: 8.0, L: 5.5, P: 2.2, Q: 1.1, V: 3.5, W: 4.5, Z: 1.8 };
  var VOLT_CODES = ['0E', '0G', '0J', '1A', '1C', '1E', '1V', '1H', '1J', '1K', '2A', '2Q', '2B', '2C', '2Z', '2D', '2P', '2E', '2F', '2V', '2G', '2W', '2H', '2J', '3A'];
  function voltOf(code) { var m = /^([0-3])([A-Z])$/.exec(code); return m && VOLT_LETTER[m[2]] ? parseFloat((VOLT_LETTER[m[2]] * Math.pow(10, +m[1])).toPrecision(3)) : NaN; }
  function tolText(letter, pf) {
    var t = CAP_TOL.filter(function (x) { return x[0] === letter; })[0];
    if (!t) return null;
    return pf < 10 && t[1] ? t[1] : t[2];
  }
  function fmtCap(pf) {
    return { pf: sig(pf, 4) + ' pF', nf: sig(pf / 1e3, 4) + ' nF', uf: sig(pf / 1e6, 4) + ' µF' };
  }
  /* Read "104K 2A", "2A104J", "4R7", "4n7", "225", "0.1uF 50V" → pF, tolerance letter, volts. */
  function readCap(text) {
    var s = String(text || '').toUpperCase().replace(/[µΜμ]/g, 'U').replace(/Ω/g, '').trim();
    var res = { pf: NaN, tol: null, volts: NaN, tolText: null };
    s = s.replace(/(\d+(?:\.\d+)?)\s*V(?:DC|AC)?\b/, function (m, v) { res.volts = parseFloat(v); return ' '; });
    s = s.replace(/±\s*(\d+(?:\.\d+)?)\s*%/, function (m, v) { res.tolText = '±' + v + '%'; return ' '; });
    var unitVal = /(\d*\.?\d+)\s*(PF|NF|UF|MFD|MF|F)\b/.exec(s);
    if (unitVal) {
      var mult = { PF: 1, NF: 1e3, UF: 1e6, MFD: 1e6, MF: 1e6, F: 1e12 }[unitVal[2]];
      res.pf = parseFloat(unitVal[1]) * mult;
      s = s.replace(unitVal[0], ' ');
    }
    var compact = s.replace(/[\s,;/]+/g, '');
    if (compact) {
      var m = /^([0-3][A-HJ-NP-Z])?(\d{1,3}|\d*[RPNU]\d*)([A-Z])?([0-3][A-HJ-NP-Z])?$/.exec(compact);
      if (!m) return null;
      if (m[1] && isFinite(voltOf(m[1]))) res.volts = voltOf(m[1]);
      if (m[4] && isFinite(voltOf(m[4]))) res.volts = voltOf(m[4]);
      var c = m[2];
      if (/[RPNU]/.test(c)) {
        var r = /^(\d*)([RPNU])(\d*)$/.exec(c);
        if (!(r[1] + r[3])) return null;
        res.pf = parseFloat((r[1] || '0') + '.' + (r[3] || '0')) * { R: 1, P: 1, N: 1e3, U: 1e6 }[r[2]];
      } else if (c.length === 3) {
        var mul = +c[2];
        res.pf = parseInt(c.slice(0, 2), 10) * (mul === 8 ? 0.01 : mul === 9 ? 0.1 : Math.pow(10, mul));
      } else res.pf = parseInt(c, 10);
      if (m[3]) res.tol = m[3];
    }
    if (!isFinite(res.pf)) return null;
    if (res.tol) res.tolText = tolText(res.tol, res.pf);
    return res;
  }
  /* Value in pF → the usual marking (two figures and a multiplier, or R for the point below 10 pF). */
  function capCode(pf) {
    if (!(pf > 0)) return null;
    if (pf < 10) {
      var t = sig(pf, 2), parts = t.split('.');
      var code = parts[0] === '0' ? 'R' + (parts[1] || '0') : parts[0] + 'R' + (parts[1] || '0');
      return { code: code, value: parseFloat(t), alt: pf >= 1 ? String(Math.round(pf * 10)) + '9' : null };
    }
    var e = Math.floor(Math.log10(pf)) - 1, d = Math.round(pf / Math.pow(10, e));
    if (d >= 100) { d = Math.round(d / 10); e++; }
    if (e > 7) return null;
    return { code: String(d) + e, value: d * Math.pow(10, e), alt: null };
  }

  Tools.register({
    id: 'capacitor-code', category: 'electronics', name: 'Capacitor Code Decoder',
    description: 'Decode capacitor markings such as 104K 2A into capacitance, tolerance and voltage, make the code for a value, and convert between pF, nF and µF.',
    keywords: ['capacitor code', 'capacitor marking', 'ceramic capacitor', '104', '103', '474', 'pf to nf', 'nf to uf', 'microfarad', 'picofarad', 'nanofarad', 'tolerance letter', 'voltage code', '2a', '1h', 'film capacitor', 'eia'],
    render: function (root) {
      box(root);
      var code = U.input({ label: 'Marking on the capacitor', value: '104K 2A', spellcheck: false, autocomplete: 'off', dataset: { role: 'code' }, hint: 'For example 104, 472J, 4R7, 4n7, 2A104K or 0.1µF 50V' });
      var readOut = el('div', { dataset: { role: 'read' } });
      var value = siInput('Capacitance', 'F', ['p', 'n', 'u'], '4.7', 'n', 'value');
      var tol = U.select({ label: 'Tolerance', dataset: { role: 'tol' }, value: 'K', options: [{ value: '', label: 'None' }].concat(CAP_TOL.map(function (t) { return { value: t[0], label: t[0] + ' (' + t[2] + (t[1] ? ', or ' + t[1] + ' under 10 pF' : '') + ')' }; })) });
      var volt = U.select({ label: 'Voltage', dataset: { role: 'volt' }, value: '1H', options: [{ value: '', label: 'None' }].concat(VOLT_CODES.map(function (c) { return { value: c, label: c + ' (' + voltOf(c) + ' V)' }; })) });
      var makeOut = el('div', { dataset: { role: 'make' } });

      function runRead() {
        var r = readCap(inp(code).value);
        readOut.replaceChildren();
        if (!r) { if (inp(code).value.trim()) readOut.appendChild(U.note('Could not read that marking. Try the digits as printed, such as 104 or 4R7, then any letter.', 'err')); return; }
        var f = fmtCap(r.pf), kids = [card('Picofarads', f.pf, 'pf', r.pf < 1000), card('Nanofarads', f.nf, 'nf', r.pf >= 1000 && r.pf < 1e6), card('Microfarads', f.uf, 'uf', r.pf >= 1e6)];
        kids.push(card('Tolerance', r.tolText || (r.tol ? 'Unknown letter ' + r.tol : 'Not marked'), 'tol'));
        kids.push(card('Voltage rating', isFinite(r.volts) ? r.volts + ' V' : 'Not marked', 'volts'));
        var range = null, pm = r.tolText && /^±(\d*\.?\d+)(%| pF)$/.exec(r.tolText);
        if (pm) {
          var d = pm[2] === '%' ? r.pf * parseFloat(pm[1]) / 100 : parseFloat(pm[1]);
          range = 'Actual value between ' + fmtSI((r.pf - d) * 1e-12, 'F') + ' and ' + fmtSI((r.pf + d) * 1e-12, 'F') + '.';
        }
        put(readOut, el('div', { class: 'el-big', dataset: { k: 'value' }, text: fmtSI(r.pf * 1e-12, 'F') }), el('div', { class: 'el-grid' }, kids),
          range ? el('p', { class: 'note', text: range }) : null);
      }
      function runMake() {
        makeOut.replaceChildren();
        var pf = value.get() * 1e12;
        var c = capCode(pf);
        if (!c) { makeOut.appendChild(U.note('Enter a capacitance between 0.1 pF and 99 µF for a printed code.', 'err')); return; }
        var t = inp(tol).value, v = inp(volt).value;
        var full = c.code + t + (v ? ' ' + v : '');
        var off = c.value / pf - 1;
        put(makeOut, el('div', { class: 'el-big', dataset: { k: 'code' }, text: full }),
          el('p', { class: 'note', text: c.code + ' = ' + fmtSI(c.value * 1e-12, 'F') + (c.alt ? ' (sometimes written ' + c.alt + ')' : '') +
            (Math.abs(off) > 1e-6 ? '. The code carries only two figures, so this is ' + sig(off * 100, 2) + '% from the value you typed.' : '.') +
            (t ? ' ' + t + ' = ' + tolText(t, c.value) + '.' : '') + (v ? ' ' + v + ' = ' + voltOf(v) + ' V.' : '') }));
      }
      inp(code).addEventListener('input', runRead);
      value.onchange(runMake);
      [tol, volt].forEach(function (f) { inp(f).addEventListener('change', runMake); });
      runRead(); runMake();

      var common = [10, 22, 47, 100, 220, 470, 1e3, 2.2e3, 4.7e3, 1e4, 2.2e4, 4.7e4, 1e5, 2.2e5, 4.7e5, 1e6, 2.2e6, 4.7e6, 1e7].map(function (pf) {
        var f = fmtCap(pf);
        return [capCode(pf).code, f.pf, f.nf, f.uf];
      });
      root.appendChild(U.panel('Read a marking', code, readOut));
      root.appendChild(U.panel('Make a marking', U.row(value, tol, volt), makeOut));
      root.appendChild(U.panel('Common values', el('div', { class: 'el-scroll' }, U.table(['Code', 'pF', 'nF', 'µF'], common)),
        U.note('Three digits: the first two are the value and the third is how many zeros follow, in picofarads (104 = 10 and four zeros = 100,000 pF = 100 nF). A third digit of 8 means × 0.01 and 9 means × 0.1. R, p, n or µ in the middle marks the decimal point: 4R7 = 4.7 pF, 4n7 = 4.7 nF.')));
      root.appendChild(U.split(
        U.panel('Tolerance letters', U.table(['Letter', 'From 10 pF', 'Below 10 pF'], CAP_TOL.map(function (t) { return [t[0], t[2], t[1] || '—']; }))),
        U.panel('Voltage codes', el('div', { class: 'el-scroll' }, U.table(['Code', 'Volts', 'Code', 'Volts'], (function () {
          var rows = [], half = Math.ceil(VOLT_CODES.length / 2);
          for (var i = 0; i < half; i++) rows.push([VOLT_CODES[i], voltOf(VOLT_CODES[i]) + ' V', VOLT_CODES[i + half] || '', VOLT_CODES[i + half] ? voltOf(VOLT_CODES[i + half]) + ' V' : '']);
          return rows;
        })())))));
    }
  });

  /* --- Wire gauge ----------------------------------------------------------------- */

  /* AWG diameters follow the definition d = 0.127 mm × 92^((36 − n) / 39),
     with 0 to 0000 as n = 0 to −3. Resistivity at 20 °C: annealed copper
     1/58 Ω·mm²/m (100% IACS), EC-grade aluminium 61% IACS. */
  var RHO_CU = 0.017241, RHO_AL = 0.017241 / 0.61;
  function awgDia(n) { return 0.127 * Math.pow(92, (36 - n) / 39); }
  function diaAwg(d) { return 36 - 39 * Math.log(d / 0.127) / Math.log(92); }
  function awgName(n) { return n >= 1 ? String(n) : n === 0 ? '0 (1/0)' : n === -1 ? '00 (2/0)' : n === -2 ? '000 (3/0)' : '0000 (4/0)'; }
  function parseAwg(t) {
    t = String(t).trim().toLowerCase().replace(/\s*awg$/, '');
    var m = /^([1-4])\/0$/.exec(t);
    if (m) return 1 - +m[1];
    if (/^0+$/.test(t)) return 1 - t.length;
    var v = num(t);
    return isFinite(v) ? v : NaN;
  }
  /* Imperial Standard Wire Gauge (BS 3737), inches, from 7/0 to 50. */
  var SWG_IN = [0.5, 0.464, 0.432, 0.4, 0.372, 0.348, 0.324, 0.3, 0.276, 0.252, 0.232, 0.212, 0.192, 0.176, 0.16, 0.144, 0.128, 0.116, 0.104, 0.092,
    0.08, 0.072, 0.064, 0.056, 0.048, 0.04, 0.036, 0.032, 0.028, 0.024, 0.022, 0.02, 0.018, 0.0164, 0.0148, 0.0136, 0.0124, 0.0116, 0.0108, 0.01,
    0.0092, 0.0084, 0.0076, 0.0068, 0.006, 0.0052, 0.0048, 0.0044, 0.004, 0.0036, 0.0032, 0.0028, 0.0024, 0.002, 0.0016, 0.0012, 0.001];
  function swgName(i) { return i < 7 ? (7 - i) + '/0' : String(i - 6); }
  var METRIC = [0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400, 500, 630];
  /* Indicative ratings only. BS 7671 Table 4D5: flat twin and earth,
     reference method C (clipped direct), 30 °C ambient. US NEC 310.16:
     copper, not more than three conductors, 60/75/90 °C insulation. */
  var BS_4D5 = { 1: 16, 1.5: 20, 2.5: 27, 4: 37, 6: 47, 10: 64, 16: 85 };
  var NEC = { 14: [15, 20, 25], 12: [20, 25, 30], 10: [30, 35, 40], 8: [40, 50, 55], 6: [55, 65, 75], 4: [70, 85, 95], 3: [85, 100, 115],
    2: [95, 115, 130], 1: [110, 130, 145], 0: [125, 150, 170], '-1': [145, 175, 195], '-2': [165, 200, 225], '-3': [195, 230, 260] };

  Tools.register({
    id: 'wire-gauge', category: 'electronics', name: 'Wire Gauge Converter (AWG & mm²)',
    description: 'Convert between AWG, SWG, diameter, cross-section in mm² and kcmil, with copper and aluminium resistance, the nearest metric cable size and indicative current ratings.',
    keywords: ['awg', 'american wire gauge', 'swg', 'standard wire gauge', 'wire gauge', 'mm2', 'mm²', 'cross section', 'kcmil', 'circular mils', 'wire size', 'cable size', 'ampacity', 'current rating', 'resistance per km', 'bs 7671'],
    render: function (root) {
      box(root);
      var mode = U.select({ label: 'I know the', dataset: { role: 'mode' }, value: 'awg', options: [
        { value: 'awg', label: 'AWG number' }, { value: 'mm2', label: 'Area in mm²' }, { value: 'dmm', label: 'Diameter in mm' },
        { value: 'din', label: 'Diameter in inches' }, { value: 'kcmil', label: 'Area in kcmil' }, { value: 'swg', label: 'SWG number' }] });
      var val = U.input({ label: 'Value', value: '10', spellcheck: false, dataset: { role: 'value' }, hint: 'AWG takes 4/0 or 0000 too' });
      var out = el('div', { dataset: { role: 'result' } });
      var tables = el('div');

      function diameter() {
        var m = inp(mode).value, t = inp(val).value, v = num(t);
        if (m === 'awg') { var n = parseAwg(t); return n >= -3 && n <= 56 ? awgDia(n) : NaN; }
        if (m === 'swg') {
          var s = String(t).trim().toLowerCase(), mm = /^([1-7])\/0$/.exec(s), idx = mm ? 7 - +mm[1] : /^0+$/.test(s) ? 7 - s.length : v + 6;
          return idx >= 0 && idx < SWG_IN.length && idx === Math.round(idx) ? SWG_IN[idx] * 25.4 : NaN;
        }
        if (!(v > 0)) return NaN;
        if (m === 'mm2') return Math.sqrt(v * 4 / Math.PI);
        if (m === 'dmm') return v;
        if (m === 'din') return v * 25.4;
        if (m === 'kcmil') return Math.sqrt(v * 1000) * 0.0254;
        return NaN;
      }
      function run() {
        var d = diameter();
        out.replaceChildren();
        if (!(d > 0)) { out.appendChild(U.note('Enter a gauge or size, such as 10 AWG, 4/0, 2.5 mm² or 1.6 mm.', 'err')); drawTables(NaN); return; }
        var area = Math.PI / 4 * d * d, mils = d / 0.0254, n = diaAwg(d), nr = Math.round(n);
        var awgText = Math.abs(n - nr) < 0.05 ? awgName(nr) + ' AWG' : '≈ ' + sig(n, 3) + ' AWG (between ' + awgName(Math.ceil(n)) + ' and ' + awgName(Math.floor(n)) + ')';
        var near = METRIC.reduce(function (a, b) { return Math.abs(b - area) < Math.abs(a - area) ? b : a; });
        var up = METRIC.filter(function (m) { return m >= area * 0.98; })[0];
        var swgI = 0;
        SWG_IN.forEach(function (s, i) { if (Math.abs(s * 25.4 - d) < Math.abs(SWG_IN[swgI] * 25.4 - d)) swgI = i; });
        var rcu = RHO_CU / area * 1000, ral = RHO_AL / area * 1000;
        var amps = [];
        var bsSize = up && BS_4D5[up] ? up : (BS_4D5[near] ? near : null);
        if (bsSize) amps.push(bsSize + ' mm² twin and earth clipped direct (BS 7671 Table 4D5, method C): ' + BS_4D5[bsSize] + ' A.');
        if (Math.abs(n - nr) < 0.05 && NEC[String(nr)]) amps.push(awgName(nr) + ' AWG copper (US NEC 310.16): ' + NEC[String(nr)].join(' / ') + ' A at 60 / 75 / 90 °C insulation.');
        put(out, 
          el('div', { class: 'el-big', dataset: { k: 'awg' }, text: awgText }),
          el('div', { class: 'el-grid' },
            card('Diameter', d.toFixed(3) + ' mm', 'dmm'), card('Diameter (inches)', (d / 25.4).toFixed(4) + ' in (' + sig(mils, 4) + ' mil)', 'din'),
            card('Cross-section', sig(area, 4) + ' mm²', 'area'), card('Area in kcmil', sig(mils * mils / 1000, 4) + ' kcmil', 'kcmil'),
            card('Copper resistance', sig(rcu, 4) + ' Ω/km · ' + sig(rcu * 0.3048, 4) + ' Ω/1000 ft', 'rcu'),
            card('Aluminium resistance', sig(ral, 4) + ' Ω/km · ' + sig(ral * 0.3048, 4) + ' Ω/1000 ft', 'ral'),
            card('Nearest metric size', near + ' mm²' + (up && up !== near ? ' (next up ' + up + ' mm²)' : ''), 'metric', true),
            card('Nearest SWG', swgName(swgI) + ' SWG (' + (SWG_IN[swgI] * 25.4).toFixed(3) + ' mm)', 'swg')),
          el('h4', { text: 'Indicative current rating' }),
          amps.length ? el('ul', { class: 'el-list', dataset: { k: 'amps' } }, amps.map(function (a) { return el('li', { text: a }); }))
            : el('p', { class: 'note', dataset: { k: 'amps' }, text: 'No standard table entry for this size. Thin hook-up wire is rated by its maker (22 AWG is typically 1 to 3 A in free air).' }),
          U.note('Indicative only: the safe current depends on how the cable is installed, grouping, insulation, ambient temperature, cable length (voltage drop) and the protective device. In the UK follow BS 7671, elsewhere your local wiring rules, and use a qualified electrician for mains work.'));
        drawTables(n);
      }
      function drawTables(n) {
        var rows = [], cur = -1;
        for (var g = -3; g <= 40; g++) {
          var d = awgDia(g), a = Math.PI / 4 * d * d;
          if (isFinite(n) && Math.round(n) === g) cur = rows.length;
          rows.push([awgName(g), d.toFixed(3), (d / 25.4).toFixed(4), sig(a, 4), sig(Math.pow(d / 0.0254, 2) / 1000, 4), sig(RHO_CU / a * 1000, 4)]);
        }
        var t = U.table(['AWG', 'Diameter (mm)', 'Diameter (in)', 'Area (mm²)', 'kcmil', 'Copper Ω/km'], rows);
        t.dataset.role = 'awg-table';
        if (cur > -1) t.querySelectorAll('tbody tr')[cur].className = 'cur';
        var mt = U.table(['Metric size', 'Diameter (solid)', 'Nearest AWG', 'Copper Ω/km'], METRIC.map(function (m) {
          var d = Math.sqrt(m * 4 / Math.PI);
          return [m + ' mm²', d.toFixed(2) + ' mm', awgName(Math.round(diaAwg(d))) + ' (' + sig(diaAwg(d), 3) + ')', sig(RHO_CU / m * 1000, 4)];
        }));
        tables.replaceChildren(el('div', { class: 'el-scroll' }, t), el('h4', { text: 'Metric cable sizes' }), el('div', { class: 'el-scroll' }, mt));
      }
      U.live([mode, val], run);
      inp(mode).addEventListener('change', function () {
        inp(val).value = { awg: '10', mm2: '2.5', dmm: '1.6', din: '0.064', kcmil: '250', swg: '20' }[inp(mode).value];
        run();
      });
      root.appendChild(U.panel(null, U.row(mode, val)));
      root.appendChild(U.panel('Result', out));
      root.appendChild(U.panel('AWG table', tables, U.note('Resistance is for solid conductors at 20 °C; stranded cable is a few percent higher, and resistance rises about 0.4% per °C.')));
    }
  });

  /* --- Battery life ---------------------------------------------------------------- */

  var CHEMS = [['liion', 'Li-ion or LiPo cell', 3.7, 1.05], ['lifepo4', 'LiFePO4 cell', 3.2, 1.03], ['nimh', 'NiMH cell', 1.2, 1.1],
    ['alk', 'Alkaline cell', 1.5, 1.3], ['lead', '12 V lead-acid battery', 12, 1.2], ['custom', 'Other', null, 1.1]];
  function fmtDuration(h) {
    if (!isFinite(h) || h < 0) return '—';
    if (h < 1 / 60) return Math.round(h * 3600) + ' s';
    if (h < 48) { var hh = Math.floor(h), mm = Math.round((h - hh) * 60); if (mm === 60) { hh++; mm = 0; } return hh + ' h ' + mm + ' min'; }
    var days = Math.floor(h / 24), rh = Math.round(h - days * 24);
    if (rh === 24) { days++; rh = 0; }
    if (days >= 730) return sig(h / 8766, 3) + ' years';
    return days + ' days ' + rh + ' h';
  }

  Tools.register({
    id: 'battery-runtime', category: 'electronics', name: 'Battery Life Calculator',
    description: 'Estimate how long a battery lasts from its capacity (mAh, Ah or Wh), voltage and load, with efficiency, Peukert correction, sleep and wake duty cycles and a series/parallel pack builder.',
    keywords: ['battery life', 'battery runtime', 'mah', 'amp hours', 'watt hours', 'how long will my battery last', 'duty cycle', 'sleep current', 'peukert', 'lipo', 'li-ion', '18650', 'battery pack', 'series parallel', 'power bank'],
    render: function (root) {
      box(root);
      var chem = U.select({ label: 'Battery type', dataset: { role: 'chem' }, value: 'liion', options: CHEMS.map(function (c) { return { value: c[0], label: c[1] + (c[2] ? ' (' + c[2] + ' V)' : '') }; }) });
      var cap = U.input({ label: 'Capacity', type: 'number', value: '2000', step: 'any', min: '0', dataset: { role: 'cap' } });
      var capUnit = U.select({ label: 'Unit', dataset: { role: 'cap-unit' }, value: 'mAh', options: ['mAh', 'Ah', 'Wh'] });
      var volts = U.input({ label: 'Voltage (V)', type: 'number', value: '3.7', step: 'any', min: '0', dataset: { role: 'volts' } });
      var eff = U.input({ label: 'Usable capacity (%)', type: 'number', value: '85', step: 'any', min: '1', max: '100', dataset: { role: 'eff' }, hint: 'Allows for regulator losses, ageing and cut-off' });
      var peuk = U.checkbox("Correct for Peukert's law (lead-acid at high current)");
      peuk.input.dataset.role = 'peukert';
      var k = U.input({ label: 'Peukert exponent', type: 'number', value: '1.2', step: 'any', dataset: { role: 'k' } });
      var hrs = U.input({ label: 'Rated at (hours)', type: 'number', value: '20', step: 'any', dataset: { role: 'rated' } });
      var loadMode = U.chips([{ value: 'steady', label: 'Steady load' }, { value: 'cycle', label: 'Sleep and wake cycle' }], function () { layout(); run(); }, 'steady');
      var load = U.input({ label: 'Load', type: 'number', value: '100', step: 'any', min: '0', dataset: { role: 'load' } });
      var loadUnit = U.select({ label: 'Unit', dataset: { role: 'load-unit' }, value: 'mA', options: ['mA', 'A', 'mW', 'W'] });
      var act = U.input({ label: 'Awake current (mA)', type: 'number', value: '20', step: 'any', min: '0', dataset: { role: 'active' } });
      var actT = U.input({ label: 'Awake for (s)', type: 'number', value: '1', step: 'any', min: '0', dataset: { role: 'active-t' } });
      var every = U.input({ label: 'Once every (s)', type: 'number', value: '60', step: 'any', min: '0', dataset: { role: 'period' } });
      var sleep = U.input({ label: 'Sleep current (µA)', type: 'number', value: '10', step: 'any', min: '0', dataset: { role: 'sleep' } });
      var steadyRow = U.row(load, loadUnit), cycleRow = U.row(act, actT, every, sleep), peukRow = U.row(k, hrs);
      var out = el('div', { dataset: { role: 'result' } });
      var cellV = U.input({ label: 'Cell voltage (V)', type: 'number', value: '3.6', step: 'any', dataset: { role: 'cell-v' } });
      var cellC = U.input({ label: 'Cell capacity (mAh)', type: 'number', value: '3000', step: 'any', dataset: { role: 'cell-c' } });
      var ns = U.input({ label: 'In series (S)', type: 'number', value: '3', step: '1', min: '1', dataset: { role: 's' } });
      var np = U.input({ label: 'In parallel (P)', type: 'number', value: '2', step: '1', min: '1', dataset: { role: 'p' } });
      var packOut = el('div', { dataset: { role: 'pack' } });

      inp(chem).addEventListener('change', function () {
        var c = CHEMS.filter(function (x) { return x[0] === inp(chem).value; })[0];
        if (c[2]) inp(volts).value = String(c[2]);
        inp(k).value = String(c[3]);
        peuk.input.checked = c[0] === 'lead';
        layout(); run();
      });
      function layout() {
        steadyRow.style.display = loadMode.value === 'steady' ? '' : 'none';
        cycleRow.style.display = loadMode.value === 'cycle' ? '' : 'none';
        peukRow.style.display = peuk.input.checked ? '' : 'none';
      }
      peuk.input.addEventListener('change', layout);

      function run() {
        out.replaceChildren();
        var c = num(inp(cap).value), u = inp(capUnit).value, v = num(inp(volts).value), e = num(inp(eff).value) / 100;
        if (!(c > 0) || !(v > 0) || !(e > 0 && e <= 1)) { out.appendChild(U.note('Enter a capacity and voltage above zero and a usable share between 1 and 100%.', 'err')); return; }
        var ah = u === 'mAh' ? c / 1000 : u === 'Ah' ? c : c / v, amps, duty = null;
        if (loadMode.value === 'steady') {
          var l = num(inp(load).value), lu = inp(loadUnit).value;
          amps = lu === 'mA' ? l / 1000 : lu === 'A' ? l : lu === 'mW' ? l / 1000 / v : l / v;
        } else {
          var ia = num(inp(act).value) / 1000, ta = num(inp(actT).value), T = num(inp(every).value), is = num(inp(sleep).value) / 1e6;
          if (!(T > 0) || !(ta >= 0) || ta > T) { out.appendChild(U.note('The awake time must be between zero and the cycle length.', 'err')); return; }
          amps = (ia * ta + is * (T - ta)) / T;
          duty = ta / T;
        }
        if (!(amps > 0)) { out.appendChild(U.note('Enter a load above zero.', 'err')); return; }
        var h = ah * e / amps, note = 'Runtime = capacity × usable share ÷ average current.';
        if (peuk.input.checked) {
          var kk = num(inp(k).value), H = num(inp(hrs).value);
          if (!(kk >= 1 && kk < 2) || !(H > 0)) { out.appendChild(U.note('Enter a Peukert exponent between 1 and 2 and the rated discharge time.', 'err')); return; }
          h = H * Math.pow(ah / (amps * H), kk) * e;
          note = "Peukert's law: runtime = H × (C ÷ (I × H))^k × usable share, with C rated over H hours.";
        }
        put(out, el('div', { class: 'el-big', dataset: { k: 'runtime' }, text: fmtDuration(h) }),
          el('div', { class: 'el-grid' },
            card('Hours', sig(h, 4) + ' h', 'hours', true), card('Average current', fmtSI(amps, 'A'), 'avg'),
            card('Energy in the battery', sig(ah * v, 4) + ' Wh', 'wh'), card('Capacity', sig(ah * 1000, 4) + ' mAh', 'mah'),
            card('Discharge rate', sig(amps / ah, 3) + ' C', 'crate'), duty !== null ? card('Awake share', sig(duty * 100, 3) + '%', 'duty') : null),
          el('p', { class: 'note', text: note + ' Real batteries also self-discharge (NiMH and alkaline more than lithium), and cold weather cuts capacity.' }),
          amps / ah > 1 ? el('p', { class: 'el-warn', text: '⚠ That is above 1C. Many cells lose capacity or overheat at such a rate; check the datasheet.' }) : null);
      }
      function runPack() {
        var cv = num(inp(cellV).value), cc = num(inp(cellC).value), s = Math.round(num(inp(ns).value)), p = Math.round(num(inp(np).value));
        packOut.replaceChildren();
        if (!(cv > 0) || !(cc > 0) || !(s >= 1) || !(p >= 1)) { packOut.appendChild(U.note('Enter the cell voltage and capacity and at least one cell each way.', 'err')); return; }
        var pv = cv * s, pc = cc * p;
        put(packOut, el('div', { class: 'el-grid' },
          card('Pack voltage', sig(pv, 4) + ' V', 'pack-v', true), card('Pack capacity', sig(pc, 5) + ' mAh', 'pack-c'),
          card('Energy', sig(pv * pc / 1000, 4) + ' Wh', 'pack-wh'), card('Cells', s * p + ' (' + s + 'S' + p + 'P)', 'pack-n')),
          U.btnrow(U.button('Use this pack above', function () {
            inp(cap).value = String(pc); inp(capUnit).value = 'mAh'; inp(volts).value = String(pv); inp(chem).value = 'custom'; run();
          })));
      }
      U.live([cap, capUnit, volts, eff, peuk, k, hrs, load, loadUnit, act, actT, every, sleep], run);
      U.live([cellV, cellC, ns, np], runPack);
      layout();
      root.appendChild(U.panel('Battery', U.row(chem, cap, capUnit, volts, eff), peuk, peukRow));
      root.appendChild(U.panel('Load', loadMode, steadyRow, cycleRow));
      root.appendChild(U.panel('Estimated runtime', out));
      root.appendChild(U.panel('Pack builder', U.row(cellV, cellC, ns, np), packOut,
        U.note('Cells in series add their voltages; cells in parallel add their capacities. Only combine identical cells at the same charge, and use a protection circuit for lithium packs.')));
    }
  });

  /* --- 555 timer -------------------------------------------------------------------- */

  var LN2 = Math.LN2, LN3 = Math.log(3);

  Tools.register({
    id: 'timer-555', category: 'electronics', name: '555 Timer Calculator',
    description: 'Work out a 555 astable’s frequency, duty cycle and high and low times from R1, R2 and C, solve R2 and C for a target frequency, or time a monostable pulse, with a waveform.',
    keywords: ['555 timer', 'ne555', '555 astable', '555 monostable', 'oscillator', 'duty cycle', 'frequency', 'pulse width', 'rc timing', 'blinker', 'flasher', 'square wave'],
    render: function (root) {
      box(root);
      var mode = U.chips([{ value: 'astable', label: 'Astable (oscillator)' }, { value: 'mono', label: 'Monostable (one pulse)' }], function () { show(); }, 'astable');
      var r1 = siInput('R1', 'Ω', ['', 'k', 'M'], '1', 'k', 'r1');
      var r2 = siInput('R2', 'Ω', ['', 'k', 'M'], '10', 'k', 'r2');
      var c = siInput('C', 'F', ['p', 'n', 'u'], '10', 'u', 'c');
      var astOut = el('div', { dataset: { role: 'astable' } }), wave = el('div');
      var tf = siInput('Target frequency', 'Hz', ['', 'k', 'M'], '1', 'k', 'tf');
      var td = U.input({ label: 'Target duty cycle (%)', type: 'number', value: '60', step: 'any', dataset: { role: 'td' } });
      var tr1 = siInput('R1 to use', 'Ω', ['', 'k', 'M'], '1', 'k', 'tr1');
      var solveOut = el('div', { dataset: { role: 'solve' } });
      var mr = siInput('R', 'Ω', ['', 'k', 'M'], '100', 'k', 'mr');
      var mc = siInput('C', 'F', ['p', 'n', 'u'], '10', 'u', 'mc');
      var monoOut = el('div', { dataset: { role: 'mono' } });
      var mt = siInput('Target pulse length', 's', ['u', 'm', ''], '1', '', 'mt');
      var mOut2 = el('div', { dataset: { role: 'mono-solve' } });
      var pA = el('div', {}, U.panel('Astable', U.row(r1, r2, c), astOut, wave), U.panel('Solve for a frequency', U.row(tf, td, tr1), solveOut));
      var pM = el('div', {}, U.panel('Monostable', U.row(mr, mc), monoOut), U.panel('Solve for a pulse length', U.row(mt), U.note('Uses the C from the monostable panel above.'), mOut2));

      function show() { pA.style.display = mode.value === 'astable' ? '' : 'none'; pM.style.display = mode.value === 'mono' ? '' : 'none'; }
      function runAst() {
        var a = r1.get(), b = r2.get(), cc = c.get();
        astOut.replaceChildren();
        if (!(a > 0) || !(b > 0) || !(cc > 0)) { astOut.appendChild(U.note('Enter R1, R2 and C above zero.', 'err')); wave.replaceChildren(); return; }
        var th = LN2 * (a + b) * cc, tl = LN2 * b * cc, T = th + tl, f = 1 / T, duty = th / T;
        put(astOut, el('div', { class: 'el-grid' },
          card('Frequency', fmtSI(f, 'Hz'), 'f', true), card('Period', fmtSI(T, 's'), 'period'),
          card('High time', fmtSI(th, 's'), 'th'), card('Low time', fmtSI(tl, 's'), 'tl'), card('Duty cycle', sig(duty * 100, 4) + '%', 'duty')),
          U.note('f = 1 ÷ (ln 2 × (R1 + 2R2) × C) ≈ 1.44 ÷ ((R1 + 2R2) × C). High time = 0.693 (R1 + R2) C, low time = 0.693 R2 C. Keep R1 at 1 kΩ or more.'));
        drawWave(th, tl);
      }
      function drawWave(th, tl) {
        var W = 520, H = 170, x0 = 40, span = W - x0 - 10, T = th + tl, per = 2.5, sx = span / (per * T);
        var svg = svgEl('svg', { class: 'el-fig', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Output and capacitor waveforms' });
        var d = 'M' + x0 + ' 70', t = 0;
        while (t < per * T - 1e-12) {
          var hi = Math.min(th, per * T - t);
          d += ' V20 H' + (x0 + (t + hi) * sx); t += hi;
          if (t >= per * T - 1e-12) break;
          var lo = Math.min(tl, per * T - t);
          d += ' V70 H' + (x0 + (t + lo) * sx); t += lo;
        }
        svg.appendChild(svgEl('path', { class: 'ac', d: d }));
        svg.appendChild(svgEl('text', { x: 4, y: 24 }, 'Out'));
        /* Capacitor voltage swings between 1/3 and 2/3 of the supply. */
        var cd = '', tt = 0, steps = 240, top = 100, bot = 160;
        var vAt = function (tm) {
          var ph = tm % T;
          return ph < th ? 2 / 3 - (1 / 3) * Math.exp(-ph / th * LN2) : (2 / 3) * Math.exp(-(ph - th) / tl * LN2);
        };
        for (var i = 0; i <= steps; i++) {
          tt = per * T * i / steps;
          var vv = vAt(tt), yy = bot - (vv - 1 / 3) / (1 / 3) * (bot - top);
          cd += (i ? ' L' : 'M') + (x0 + tt * sx).toFixed(1) + ' ' + yy.toFixed(1);
        }
        svg.appendChild(svgEl('path', { class: 'ln', d: cd }));
        svg.appendChild(svgEl('path', { class: 'mu', d: 'M' + x0 + ' ' + top + ' H' + (W - 10) + ' M' + x0 + ' ' + bot + ' H' + (W - 10) }));
        svg.appendChild(svgEl('text', { x: 4, y: top + 4 }, '⅔'));
        svg.appendChild(svgEl('text', { x: 4, y: bot + 4 }, '⅓'));
        svg.appendChild(svgEl('text', { x: x0 + th * sx / 2, y: 14, 'text-anchor': 'middle' }, 'high ' + fmtSI(th, 's')));
        svg.appendChild(svgEl('text', { x: x0 + (th + tl / 2) * sx, y: 86, 'text-anchor': 'middle' }, 'low ' + fmtSI(tl, 's')));
        wave.replaceChildren(svg, U.note('Top: the output. Bottom: the timing capacitor charging to ⅔ and discharging to ⅓ of the supply.'));
      }
      function runSolve() {
        solveOut.replaceChildren();
        var f = tf.get(), D = num(inp(td).value) / 100, a = tr1.get();
        if (!(f > 0) || !(D > 0 && D < 1) || !(a > 0)) { solveOut.appendChild(U.note('Enter a frequency, a duty cycle between 0 and 100%, and R1.', 'err')); return; }
        if (D > 0.5) {
          var b = a * (1 - D) / (2 * D - 1), cc = 1 / (f * LN2 * (a + 2 * b));
          var b12 = nearest(b, E12), c12 = nearest(cc, E12);
          var th = LN2 * (a + b12) * c12, tl = LN2 * b12 * c12;
          put(solveOut, el('div', { class: 'el-grid' }, card('R2', fmtSI(b, 'Ω'), 'r2', true), card('C', fmtSI(cc, 'F'), 'cap', true),
            card('With E12 values', fmtSI(b12, 'Ω') + ' and ' + fmtSI(c12, 'F'), 'std'), card('Which gives', fmtSI(1 / (th + tl), 'Hz') + ' at ' + sig(th / (th + tl) * 100, 3) + '%', 'std-f')),
            U.note('R2 = R1 (1 − D) ÷ (2D − 1); C = 1 ÷ (f × ln 2 × (R1 + 2R2)).'));
        } else {
          var c2 = D / (f * LN2 * a), b2 = (1 - D) / (f * LN2 * c2);
          put(solveOut, el('p', { class: 'note', text: 'A plain 555 astable always runs above 50% duty. Add a diode across R2 (anode at pin 7) so the capacitor charges through R1 only; then:' }),
            el('div', { class: 'el-grid' }, card('R2 (with diode)', fmtSI(b2, 'Ω'), 'r2', true), card('C', fmtSI(c2, 'F'), 'cap', true)));
        }
      }
      function runMono() {
        monoOut.replaceChildren();
        var r = mr.get(), cc = mc.get();
        if (!(r > 0) || !(cc > 0)) { monoOut.appendChild(U.note('Enter R and C above zero.', 'err')); return; }
        put(monoOut, el('div', { class: 'el-grid' }, card('Pulse length', fmtSI(LN3 * r * cc, 's'), 'pulse', true)),
          U.note('t = ln 3 × R × C ≈ 1.1 R C. The pulse starts when the trigger (pin 2) falls below ⅓ of the supply.'));
        runMonoSolve();
      }
      function runMonoSolve() {
        mOut2.replaceChildren();
        var t = mt.get(), cc = mc.get();
        if (!(t > 0) || !(cc > 0)) { mOut2.appendChild(U.note('Enter a pulse length and the C above.', 'err')); return; }
        var r = t / (LN3 * cc);
        put(mOut2, el('div', { class: 'el-grid' }, card('R for that C', fmtSI(r, 'Ω'), 'mono-r', true), card('Nearest E12', fmtSI(nearest(r, E12), 'Ω'), 'mono-r12')));
      }
      [r1, r2, c].forEach(function (f) { f.onchange(runAst); });
      [tf, tr1].forEach(function (f) { f.onchange(runSolve); });
      inp(td).addEventListener('input', runSolve);
      [mr, mc].forEach(function (f) { f.onchange(runMono); });
      mt.onchange(runMonoSolve);
      root.appendChild(U.panel(null, mode));
      root.appendChild(pA); root.appendChild(pM);
      runAst(); runSolve(); runMono(); show();
    }
  });

  /* --- PCB trace width ---------------------------------------------------------- */

  /* IPC-2221: I = k × ΔT^0.44 × A^0.725, A in square mils; k = 0.048 for
     outer layers and 0.024 for inner layers. 1 oz/ft² copper = 35 µm. */
  var IPC_K = { ext: 0.048, int: 0.024 };
  var CU_RHO20 = 1.724e-8, CU_ALPHA = 0.00393;
  function ipcArea(I, dT, layer) { return Math.pow(I / (IPC_K[layer] * Math.pow(dT, 0.44)), 1 / 0.725); }
  function ipcCurrent(area, dT, layer) { return IPC_K[layer] * Math.pow(dT, 0.44) * Math.pow(area, 0.725); }

  Tools.register({
    id: 'pcb-trace-width', category: 'electronics', name: 'PCB Trace Width Calculator',
    description: 'Find the minimum PCB trace width for a current and temperature rise with IPC-2221 (outer and inner layers), with resistance, voltage drop and power loss, or the current a given width can carry.',
    keywords: ['pcb trace width', 'trace width calculator', 'ipc-2221', 'ipc 2221', 'track width', 'copper weight', 'oz copper', 'current capacity', 'mil', 'temperature rise', 'pcb design', 'kicad', 'circuit board'],
    render: function (root) {
      box(root);
      var mode = U.chips([{ value: 'width', label: 'Width for a current' }, { value: 'current', label: 'Current for a width' }], function () { show(); run(); }, 'width');
      var amps = U.input({ label: 'Current (A)', type: 'number', value: '1', step: 'any', min: '0', dataset: { role: 'amps' } });
      var width = U.input({ label: 'Trace width', type: 'number', value: '0.5', step: 'any', min: '0', dataset: { role: 'width' } });
      var wUnit = U.select({ label: 'Unit', dataset: { role: 'width-unit' }, value: 'mm', options: [{ value: 'mm', label: 'mm' }, { value: 'mil', label: 'mil (thou)' }] });
      var rise = U.input({ label: 'Temperature rise (°C)', type: 'number', value: '10', step: 'any', min: '0', dataset: { role: 'rise' } });
      var oz = U.select({ label: 'Copper weight', dataset: { role: 'oz' }, value: '1', options: [{ value: '0.5', label: '½ oz (18 µm)' }, { value: '1', label: '1 oz (35 µm)' },
        { value: '2', label: '2 oz (70 µm)' }, { value: '3', label: '3 oz (105 µm)' }] });
      var amb = U.input({ label: 'Ambient (°C)', type: 'number', value: '25', step: 'any', dataset: { role: 'ambient' } });
      var len = U.input({ label: 'Trace length', type: 'number', value: '100', step: 'any', min: '0', dataset: { role: 'length' } });
      var lUnit = U.select({ label: 'Unit', dataset: { role: 'length-unit' }, value: 'mm', options: [{ value: 'mm', label: 'mm' }, { value: 'in', label: 'inches' }] });
      var layer = U.chips([{ value: 'ext', label: 'Outer layer' }, { value: 'int', label: 'Inner layer' }], function () { run(); }, 'ext');
      var widthRow = U.row(width, wUnit), ampsRow = U.row(amps);
      var out = el('div', { dataset: { role: 'result' } });

      function show() { widthRow.style.display = mode.value === 'current' ? '' : 'none'; ampsRow.style.display = mode.value === 'width' ? '' : 'none'; }
      function run() {
        out.replaceChildren();
        var dT = num(inp(rise).value), ozv = num(inp(oz).value), tMil = ozv * 35 / 25.4, tM = ozv * 35e-6;
        var L = num(inp(len).value) * (inp(lUnit).value === 'in' ? 0.0254 : 0.001), T = num(inp(amb).value) + dT;
        if (!(dT > 0) || !(ozv > 0)) { out.appendChild(U.note('Enter a temperature rise above zero.', 'err')); return; }
        var kids = [], I, wMil;
        if (mode.value === 'width') {
          I = num(inp(amps).value);
          if (!(I > 0)) { out.appendChild(U.note('Enter a current above zero.', 'err')); return; }
          ['ext', 'int'].forEach(function (ly) {
            var a = ipcArea(I, dT, ly), w = a / tMil;
            kids.push(card((ly === 'ext' ? 'Outer' : 'Inner') + ' layer width', sig(w, 4) + ' mil · ' + sig(w * 0.0254, 3) + ' mm', 'w' + ly, ly === layer.value));
          });
          wMil = ipcArea(I, dT, layer.value) / tMil;
          kids.push(card('Cross-section', sig(ipcArea(I, dT, layer.value), 4) + ' mil² (' + sig(ipcArea(I, dT, layer.value) * 0.00064516, 3) + ' mm²)', 'area'));
        } else {
          var wv = num(inp(width).value);
          if (!(wv > 0)) { out.appendChild(U.note('Enter a width above zero.', 'err')); return; }
          wMil = inp(wUnit).value === 'mm' ? wv / 0.0254 : wv;
          ['ext', 'int'].forEach(function (ly) {
            kids.push(card((ly === 'ext' ? 'Outer' : 'Inner') + ' layer current', sig(ipcCurrent(wMil * tMil, dT, ly), 4) + ' A', 'i' + ly, ly === layer.value));
          });
          I = ipcCurrent(wMil * tMil, dT, layer.value);
        }
        if (L > 0 && isFinite(T)) {
          var rho = CU_RHO20 * (1 + CU_ALPHA * (T - 20)), R = rho * L / (wMil * 0.0254e-3 * tM);
          kids.push(card('Resistance at ' + sig(T, 3) + ' °C', fmtSI(R, 'Ω'), 'res'), card('Voltage drop', fmtSI(I * R, 'V'), 'vdrop'), card('Power lost', fmtSI(I * I * R, 'W'), 'ploss'));
        }
        put(out, el('div', { class: 'el-grid' }, kids),
          (I > 35 || wMil > 400 || dT > 100) ? el('p', { class: 'el-warn', text: '⚠ Outside the range the IPC-2221 curves were fitted to (up to 35 A, 400 mil wide and 100 °C rise); treat the result with care.' }) : null);
      }
      U.live([amps, width, wUnit, rise, oz, amb, len, lUnit], run);
      show();
      root.appendChild(U.panel(null, mode, ampsRow, widthRow, U.row(rise, oz, amb, len, lUnit), layer));
      root.appendChild(U.panel('Result', out));
      root.appendChild(U.panel(null, U.note('IPC-2221: I = k × ΔT^0.44 × A^0.725 (A in square mils, k = 0.048 outer and 0.024 inner). Inner layers need about 2.6 times the width because heat escapes more slowly. The newer IPC-2152 charts are more precise and usually allow narrower outer traces. Resistance uses copper at 1.724 × 10⁻⁸ Ω·m at 20 °C, rising 0.393% per °C.')));
    }
  });
})();
