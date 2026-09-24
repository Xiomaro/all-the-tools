/* css-b tools: Cubic Bézier Easing Editor, Fluid Type Scale & clamp()
   Generator, CSS Transform Generator, Glassmorphism Generator, SVG Blob &
   Wave Generator and CSS to Tailwind Converter. Colour matching in the
   Tailwind converter uses window.ColourKit (color.js) and the palette in
   assets/data/color-b-tailwind.json (Tailwind CSS, MIT licence). */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-cssb-style')) document.head.appendChild(el('style', { id: 'g-cssb-style', text: [
    '.g-cssb input[type=range]{width:100%}',
    '.g-cssb .sliders{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px 16px}',
    '.g-cssb .nums{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}',
    '.g-cssb .nums input,.g-cssb .mono{font-family:var(--mono)}',
    '.g-cssb .bz{display:block;width:100%;max-width:330px;height:auto;margin:0 auto;touch-action:none;user-select:none;color:var(--fg)}',
    '.g-cssb .bz circle.h{cursor:grab}',
    '.g-cssb .track{position:relative;height:34px;border-radius:17px;background:var(--bg-sunken);border:1px solid var(--border);margin:6px 0 10px}',
    '.g-cssb .track b{position:absolute;top:3px;left:3px;width:26px;height:26px;border-radius:50%;background:var(--accent)}',
    '.g-cssb .track.lin b{background:var(--fg-muted)}',
    '.g-cssb .track span{position:absolute;right:12px;top:7px;font-size:12px;color:var(--fg-muted)}',
    '.g-cssb .chips.small .chip{font-size:12px;padding:4px 9px}',
    '.g-cssb .stage{position:relative;min-height:300px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;display:flex;align-items:center;justify-content:center;background:repeating-conic-gradient(var(--bg-sunken) 0% 25%,var(--bg) 0% 50%) 0 0/24px 24px}',
    '.g-cssb .tf-ghost,.g-cssb .tf-box{position:absolute;width:130px;height:130px;left:50%;top:50%;margin:-65px 0 0 -65px;border-radius:10px}',
    '.g-cssb .tf-ghost{border:2px dashed var(--fg-muted);opacity:.5}',
    '.g-cssb .tf-box{background:linear-gradient(135deg,#6366f1,#ec4899);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 8px 20px rgb(0 0 0 / 25%)}',
    '.g-cssb .glass-stage{position:relative;min-height:320px;border-radius:var(--radius);overflow:hidden;display:flex;align-items:center;justify-content:center;padding:24px}',
    '.g-cssb .glass-stage .blob{position:absolute;border-radius:50%}',
    '.g-cssb .glass-card{position:relative;width:min(320px,100%);padding:26px;color:#fff;text-shadow:0 1px 2px rgb(0 0 0 / 30%)}',
    '.g-cssb .glass-card h4{margin:0 0 8px;font-size:22px}',
    '.g-cssb .svgprev{border:1px solid var(--border);border-radius:var(--radius);padding:10px;background:repeating-conic-gradient(var(--bg-sunken) 0% 25%,var(--bg) 0% 50%) 0 0/20px 20px}',
    '.g-cssb .svgprev svg{display:block;width:100%;height:auto;max-height:420px}',
    '.g-cssb .fluid-prev{overflow:hidden;border:1px solid var(--border);border-radius:var(--radius);padding:12px;background:var(--bg)}',
    '.g-cssb .fluid-prev div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2;margin-bottom:6px}',
    '.g-cssb .fluid-prev small{font-size:12px;color:var(--fg-muted);font-family:var(--mono);margin-right:8px}',
    '.g-cssb textarea{min-height:220px}',
    '.g-cssb .tw-out{display:grid;gap:10px}',
    '.g-cssb .tw-out > div{border:1px solid var(--border);border-radius:var(--radius);padding:10px;background:var(--bg-sunken)}',
    '.g-cssb .tw-out code{font-family:var(--mono);font-size:13px;word-break:break-word}',
    '.g-cssb .tw-out b{display:block;font-family:var(--mono);font-size:12px;color:var(--fg-muted);margin-bottom:4px}',
    '.g-cssb td.note-cell{font-size:12px;color:var(--fg-muted)}'
  ].join('\n') }));

  /* --- shared helpers ------------------------------------------------------- */

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  /* Fixed decimals with trailing zeros trimmed. */
  function num(v, dp) {
    var s = Number(v).toFixed(dp === undefined ? 4 : dp);
    if (s.indexOf('.') > -1) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s === '-0' ? '0' : s;
  }
  function svgEl(tag, attrs, kids) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (k) { if (k) node.appendChild(typeof k === 'string' ? document.createTextNode(k) : k); });
    return node;
  }
  /* A labelled range whose label shows its value: slider('Blur', {min, max, value, unit}, fn). */
  function slider(label, o, onInput) {
    var lab = el('label');
    var inp = el('input', { type: 'range', min: o.min, max: o.max, step: o.step || 1, value: o.value, dataset: { k: o.key || '' } });
    var unit = o.unit === undefined ? 'px' : o.unit;
    function upd() { lab.textContent = label + ': ' + inp.value + unit; }
    inp.addEventListener('input', function () { upd(); if (onInput) onInput(Number(inp.value)); });
    var wrap = el('div', { class: 'field' }, lab, inp);
    wrap.input = inp;
    wrap.get = function () { return Number(inp.value); };
    wrap.set = function (x) { inp.value = x; upd(); };
    upd();
    return wrap;
  }
  function outBox(k) { var o = U.out(''); o.dataset.k = k; return o; }
  function colourField(label, value, onInput) {
    var inp = el('input', { type: 'color', value: value, 'aria-label': label });
    inp.addEventListener('input', function () { onInput(inp.value); });
    var f = el('div', { class: 'field' }, el('label', { text: label }), inp);
    f.input = inp;
    return f;
  }
  function hexToRgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }

  /* ========================================================================= */
  /* Cubic Bézier Easing Editor                                                 */
  /* ========================================================================= */

  function bz(a1, a2, t) { var u = 1 - t; return 3 * a1 * u * u * t + 3 * a2 * u * t * t + t * t * t; }
  function bzd(a1, a2, t) { var u = 1 - t; return 3 * a1 * u * u + 6 * (a2 - a1) * u * t + 3 * (1 - a2) * t * t; }
  /* y for a given x (progress): Newton steps, then bisection as a safety net. */
  function bezierAt(p, x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var t = x, i;
    for (i = 0; i < 8; i++) {
      var dx = bz(p[0], p[2], t) - x;
      if (Math.abs(dx) < 1e-7) return bz(p[1], p[3], t);
      var d = bzd(p[0], p[2], t);
      if (Math.abs(d) < 1e-6) break;
      t -= dx / d;
    }
    var lo = 0, hi = 1;
    t = x;
    for (i = 0; i < 60; i++) {
      var xv = bz(p[0], p[2], t);
      if (Math.abs(xv - x) < 1e-7) break;
      if (xv < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return bz(p[1], p[3], t);
  }
  /* CSS steps() per CSS Easing Level 1 (before flag ignored). */
  function stepsAt(n, pos, x) {
    if (x >= 1) return 1;
    if (x < 0) return 0;
    var jumps = pos === 'jump-none' ? n - 1 : pos === 'jump-both' ? n + 1 : n;
    var step = Math.floor(x * n);
    if (pos === 'jump-start' || pos === 'start' || pos === 'jump-both') step += 1;
    return Math.min(step, jumps) / jumps;
  }
  function linearAt(pts, x) {
    if (x <= pts[0][0]) return pts[0][1];
    for (var i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) {
        var a = pts[i - 1], b = pts[i];
        return b[0] === a[0] ? b[1] : a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
      }
    }
    return pts[pts.length - 1][1];
  }

  /* Easings that a cubic Bézier can't express, sampled into CSS linear(). */
  var CURVES = {
    bounce: { label: 'Bounce (out)', fn: function (x) {
      /* Robert Penner's easeOutBounce. */
      var n1 = 7.5625, d1 = 2.75;
      if (x < 1 / d1) return n1 * x * x;
      if (x < 2 / d1) { x -= 1.5 / d1; return n1 * x * x + 0.75; }
      if (x < 2.5 / d1) { x -= 2.25 / d1; return n1 * x * x + 0.9375; }
      x -= 2.625 / d1; return n1 * x * x + 0.984375;
    } },
    elastic: { label: 'Elastic (out)', fn: function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
    } },
    spring: { label: 'Spring', fn: null }
  };
  /* A damped spring from rest at 0 towards 1, stretched so it has settled
     (within 0.1%) at the end of the animation. */
  function springFn(stiffness, damping, mass) {
    var w0 = Math.sqrt(stiffness / mass), zeta = damping / (2 * Math.sqrt(stiffness * mass));
    function pos(t) {
      if (zeta < 1) {
        var wd = w0 * Math.sqrt(1 - zeta * zeta);
        return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + (zeta * w0 / wd) * Math.sin(wd * t));
      }
      return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
    }
    var end = 0.1, lastBad = 0;
    for (var t = 0; t < 60; t += 0.01) { if (Math.abs(pos(t) - 1) > 0.001) lastBad = t; if (t - lastBad > 1) break; }
    end = Math.max(0.1, lastBad + 0.01);
    return function (x) { return x >= 1 ? 1 : pos(x * end); };
  }
  /* Samples fn and keeps only the points needed to stay within `tol`
     (Ramer–Douglas–Peucker), so linear() stays short but faithful. */
  function toLinear(fn, tol) {
    var N = 1000, pts = [];
    for (var i = 0; i <= N; i++) pts.push([i / N, fn(i / N)]);
    pts[0][1] = 0; pts[N][1] = 1;
    var keep = new Array(pts.length).fill(false);
    keep[0] = keep[N] = true;
    var stack = [[0, N]];
    while (stack.length) {
      var seg = stack.pop(), a = pts[seg[0]], b = pts[seg[1]], worst = -1, idx = -1;
      for (var k = seg[0] + 1; k < seg[1]; k++) {
        var y = a[1] + (b[1] - a[1]) * (pts[k][0] - a[0]) / (b[0] - a[0]);
        var d = Math.abs(pts[k][1] - y);
        if (d > worst) { worst = d; idx = k; }
      }
      if (worst > tol) { keep[idx] = true; stack.push([seg[0], idx], [idx, seg[1]]); }
    }
    var kept = pts.filter(function (p, j) { return keep[j]; });
    var css = 'linear(' + kept.map(function (p, j) {
      if (j === 0 || j === kept.length - 1) return num(p[1], 4);
      return num(p[1], 4) + ' ' + num(p[0] * 100, 2) + '%';
    }).join(', ') + ')';
    return { css: css, points: kept.map(function (p) { return [p[0], +num(p[1], 4)]; }) };
  }

  var BEZIER_PRESETS = [
    ['CSS keywords', [['linear', [0, 0, 1, 1]], ['ease', [0.25, 0.1, 0.25, 1]], ['ease-in', [0.42, 0, 1, 1]], ['ease-out', [0, 0, 0.58, 1]], ['ease-in-out', [0.42, 0, 0.58, 1]]]],
    ['Sine', [['In Sine', [0.12, 0, 0.39, 0]], ['Out Sine', [0.61, 1, 0.88, 1]], ['In-Out Sine', [0.37, 0, 0.63, 1]]]],
    ['Quad', [['In Quad', [0.11, 0, 0.5, 0]], ['Out Quad', [0.5, 1, 0.89, 1]], ['In-Out Quad', [0.45, 0, 0.55, 1]]]],
    ['Cubic', [['In Cubic', [0.32, 0, 0.67, 0]], ['Out Cubic', [0.33, 1, 0.68, 1]], ['In-Out Cubic', [0.65, 0, 0.35, 1]]]],
    ['Quart', [['In Quart', [0.5, 0, 0.75, 0]], ['Out Quart', [0.25, 1, 0.5, 1]], ['In-Out Quart', [0.76, 0, 0.24, 1]]]],
    ['Quint', [['In Quint', [0.64, 0, 0.78, 0]], ['Out Quint', [0.22, 1, 0.36, 1]], ['In-Out Quint', [0.83, 0, 0.17, 1]]]],
    ['Expo', [['In Expo', [0.7, 0, 0.84, 0]], ['Out Expo', [0.16, 1, 0.3, 1]], ['In-Out Expo', [0.87, 0, 0.13, 1]]]],
    ['Circ', [['In Circ', [0.55, 0, 1, 0.45]], ['Out Circ', [0, 0.55, 0.45, 1]], ['In-Out Circ', [0.85, 0, 0.15, 1]]]],
    ['Back', [['In Back (anticipate)', [0.36, 0, 0.66, -0.56]], ['Out Back (overshoot)', [0.34, 1.56, 0.64, 1]], ['In-Out Back', [0.68, -0.6, 0.32, 1.6]]]]
  ];

  Tools.register({
    id: 'cubic-bezier', category: 'css', name: 'Cubic Bézier Easing Editor',
    description: 'Drag the control points of a CSS cubic-bezier() easing, compare it with linear in an animated preview, or build steps() and linear() bounce and spring easings.',
    keywords: ['cubic bezier', 'cubic-bezier', 'bezier', 'easing', 'ease', 'timing function', 'transition', 'animation', 'steps', 'linear()',
      'bounce', 'spring', 'elastic', 'back', 'anticipate', 'overshoot', 'motion', 'css'],
    render: function (root) {
      root.classList.add('g-cssb');
      var mode = 'bezier', p = [0.25, 0.1, 0.25, 1], stepsN = 5, stepsPos = 'jump-end', curve = 'bounce', lin = null;
      var X0 = 30, Y0 = 290, S = 160;
      function sx(x) { return X0 + x * S; }
      function sy(y) { return Y0 - y * S; }
      var svg = svgEl('svg', { viewBox: '0 0 220 410', class: 'bz', role: 'img', 'aria-label': 'Easing curve' });
      var grid = svgEl('g');
      [0, 0.25, 0.5, 0.75, 1].forEach(function (g) {
        grid.appendChild(svgEl('line', { x1: sx(0), y1: sy(g), x2: sx(1), y2: sy(g), stroke: 'currentColor', 'stroke-opacity': g % 1 ? 0.08 : 0.25 }));
        grid.appendChild(svgEl('line', { x1: sx(g), y1: sy(0), x2: sx(g), y2: sy(1), stroke: 'currentColor', 'stroke-opacity': g % 1 ? 0.08 : 0.25 }));
      });
      grid.appendChild(svgEl('text', { x: 4, y: sy(1) + 4, 'font-size': 10, fill: 'currentColor', 'fill-opacity': 0.6 }, ['1']));
      grid.appendChild(svgEl('text', { x: 4, y: sy(0) + 4, 'font-size': 10, fill: 'currentColor', 'fill-opacity': 0.6 }, ['0']));
      var diag = svgEl('line', { x1: sx(0), y1: sy(0), x2: sx(1), y2: sy(1), stroke: 'currentColor', 'stroke-opacity': 0.25, 'stroke-dasharray': '3 4' });
      var arm1 = svgEl('line', { stroke: '#ec4899', 'stroke-width': 1.5 }), arm2 = svgEl('line', { stroke: '#0ea5e9', 'stroke-width': 1.5 });
      var path = svgEl('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 3, 'stroke-linejoin': 'round' });
      var h1 = svgEl('circle', { r: 9, fill: '#ec4899', class: 'h', 'data-h': '1' }), h2 = svgEl('circle', { r: 9, fill: '#0ea5e9', class: 'h', 'data-h': '2' });
      [grid, diag, arm1, arm2, path, h1, h2].forEach(function (n) { svg.appendChild(n); });

      var inputs = ['x1', 'y1', 'x2', 'y2'].map(function (k, i) {
        var inp = el('input', { type: 'number', step: 0.01, min: i % 2 ? -2 : 0, max: i % 2 ? 3 : 1, dataset: { k: k }, 'aria-label': k });
        inp.addEventListener('input', function () {
          var v = parseFloat(inp.value);
          if (isNaN(v)) return;
          p[i] = i % 2 ? clamp(v, -2, 3) : clamp(v, 0, 1);
          mode = 'bezier'; modeChips.set('bezier'); draw('inputs');
        });
        return U.field(k, inp);
      });
      var paste = el('input', { type: 'text', spellcheck: false, class: 'mono', placeholder: 'Paste cubic-bezier(…) or a keyword', 'aria-label': 'Paste an easing', dataset: { k: 'paste' } });
      paste.addEventListener('input', function () {
        var t = paste.value.trim().toLowerCase().replace(/;$/, '');
        var kw = BEZIER_PRESETS[0][1].filter(function (e) { return e[0] === t; })[0];
        var m = t.match(/^cubic-bezier\(\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*\)$/);
        var v = kw ? kw[1] : m ? m.slice(1).map(Number) : null;
        if (!v || v.some(isNaN) || v[0] < 0 || v[0] > 1 || v[2] < 0 || v[2] > 1) { paste.style.borderColor = t ? 'var(--err)' : ''; return; }
        paste.style.borderColor = '';
        p = v.slice(); mode = 'bezier'; modeChips.set('bezier'); draw('paste');
      });

      var modeChips = U.chips([{ value: 'bezier', label: 'cubic-bezier()' }, { value: 'steps', label: 'steps()' }, { value: 'linear', label: 'linear() curve' }],
        function (v) { mode = v; draw(); }, 'bezier');
      modeChips.set = function (v) { modeChips.value = v; Array.prototype.forEach.call(modeChips.children, function (c, i) { c.classList.toggle('on', ['bezier', 'steps', 'linear'][i] === v); }); };
      var stepsIn = el('input', { type: 'number', min: 1, max: 100, value: stepsN, dataset: { k: 'steps' } });
      var posSel = U.select({ label: 'Jump', options: ['jump-end', 'jump-start', 'jump-none', 'jump-both'], value: stepsPos });
      stepsIn.addEventListener('input', function () { var v = parseInt(stepsIn.value, 10); if (v >= 1) { stepsN = Math.min(v, 100); draw(); } });
      posSel.querySelector('select').addEventListener('change', function () { stepsPos = this.value; draw(); });
      var curveChips = U.chips(Object.keys(CURVES).map(function (k) { return { value: k, label: CURVES[k].label }; }), function (v) { curve = v; draw(); }, 'bounce');
      var stiff = slider('Stiffness', { min: 20, max: 400, value: 180, unit: '' }, function () { draw(); });
      var damp = slider('Damping', { min: 1, max: 40, value: 12, unit: '' }, function () { draw(); });
      var mass = slider('Mass', { min: 0.2, max: 5, step: 0.1, value: 1, unit: '' }, function () { draw(); });
      var springBox = el('div', { class: 'sliders' }, stiff, damp, mass);
      var stepsBox = el('div', { class: 'row' }, U.field('Steps', stepsIn), posSel);
      var linBox = el('div', { class: 'stack' }, curveChips, springBox);

      var code = outBox('css');
      var valueOut = el('code', { class: 'mono' });
      var atIn = el('input', { type: 'number', min: 0, max: 100, step: 1, value: 50, dataset: { k: 'at-input' } });
      var atOut = el('b', { class: 'mono', dataset: { k: 'at' } });
      atIn.addEventListener('input', showAt);
      var dur = slider('Duration', { min: 0.2, max: 4, step: 0.1, value: 1.2, unit: ' s' });
      var loop = U.checkbox('Loop', { checked: true });
      var ball = el('b'), ballLin = el('b');
      var track = el('div', { class: 'track' }, ball, el('span', { text: 'your easing' }));
      var trackLin = el('div', { class: 'track lin' }, ballLin, el('span', { text: 'linear' }));
      var anims = [];

      function easingCss() {
        if (mode === 'steps') return 'steps(' + stepsN + ', ' + stepsPos + ')';
        if (mode === 'linear') return lin.css;
        return 'cubic-bezier(' + p.map(function (v) { return num(v, 3); }).join(', ') + ')';
      }
      function easeAt(x) {
        if (mode === 'steps') return stepsAt(stepsN, stepsPos, x);
        if (mode === 'linear') return linearAt(lin.points, x);
        return bezierAt(p, x);
      }
      function showAt() {
        var x = clamp(parseFloat(atIn.value) || 0, 0, 100) / 100;
        atOut.textContent = num(easeAt(x), 4);
      }

      function draw(source) {
        stepsBox.style.display = mode === 'steps' ? '' : 'none';
        linBox.style.display = mode === 'linear' ? '' : 'none';
        springBox.style.display = mode === 'linear' && curve === 'spring' ? '' : 'none';
        var showHandles = mode === 'bezier';
        [h1, h2, arm1, arm2].forEach(function (n) { n.style.display = showHandles ? '' : 'none'; });
        if (mode === 'linear') lin = toLinear(curve === 'spring' ? springFn(stiff.get(), damp.get(), mass.get()) : CURVES[curve].fn, 0.002);
        var d;
        if (mode === 'bezier') {
          d = 'M' + sx(0) + ' ' + sy(0) + ' C' + sx(p[0]) + ' ' + sy(p[1]) + ' ' + sx(p[2]) + ' ' + sy(p[3]) + ' ' + sx(1) + ' ' + sy(1);
          arm1.setAttribute('x1', sx(0)); arm1.setAttribute('y1', sy(0)); arm1.setAttribute('x2', sx(p[0])); arm1.setAttribute('y2', sy(p[1]));
          arm2.setAttribute('x1', sx(1)); arm2.setAttribute('y1', sy(1)); arm2.setAttribute('x2', sx(p[2])); arm2.setAttribute('y2', sy(p[3]));
          h1.setAttribute('cx', sx(p[0])); h1.setAttribute('cy', sy(p[1]));
          h2.setAttribute('cx', sx(p[2])); h2.setAttribute('cy', sy(p[3]));
          if (source !== 'inputs') inputs.forEach(function (f, i) { f.querySelector('input').value = num(p[i], 3); });
        } else if (mode === 'steps') {
          d = '';
          for (var i = 0; i <= 400; i++) { var x = i / 400; d += (i ? ' L' : 'M') + num(sx(x), 2) + ' ' + num(sy(stepsAt(stepsN, stepsPos, x)), 2); }
        } else {
          d = lin.points.map(function (q, j) { return (j ? 'L' : 'M') + num(sx(q[0]), 2) + ' ' + num(sy(q[1]), 2); }).join(' ');
        }
        path.setAttribute('d', d);
        var value = easingCss();
        var kw = mode === 'bezier' ? BEZIER_PRESETS[0][1].filter(function (e) { return e[1].join() === p.join(); })[0] : null;
        valueOut.textContent = value;
        code.textContent = 'transition-timing-function: ' + value + ';\nanimation-timing-function: ' + value + ';' +
          (kw ? '\n/* the same as the "' + kw[0] + '" keyword */' : '') +
          (mode === 'linear' ? '\n/* linear() needs Chrome 113, Firefox 112 or Safari 17.2 and later */' : '');
        showAt();
        if (anims.length) play();
      }

      /* Dragging a handle: x stays in 0..1 (a CSS rule), y may overshoot. */
      var dragging = null;
      function toCurve(e) {
        var pt = svg.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        var q = pt.matrixTransform(svg.getScreenCTM().inverse());
        return [clamp((q.x - X0) / S, 0, 1), clamp((Y0 - q.y) / S, -0.6, 1.6)];
      }
      [h1, h2].forEach(function (h, idx) {
        h.addEventListener('pointerdown', function (e) {
          e.preventDefault();
          dragging = idx;
          try { svg.setPointerCapture(e.pointerId); } catch (err) { /* optional */ }
        });
      });
      svg.addEventListener('pointermove', function (e) {
        if (dragging === null) return;
        var v = toCurve(e);
        p[dragging * 2] = Math.round(v[0] * 100) / 100;
        p[dragging * 2 + 1] = Math.round(v[1] * 100) / 100;
        draw('drag');
      });
      function stopDrag() { dragging = null; }
      svg.addEventListener('pointerup', stopDrag);
      svg.addEventListener('pointercancel', stopDrag);

      function stop() { anims.forEach(function (a) { try { a.cancel(); } catch (e) { /* already gone */ } }); anims = []; }
      function play() {
        stop();
        var ms = dur.get() * 1000, opts = { duration: ms, iterations: loop.input.checked ? Infinity : 1, fill: 'forwards', delay: 200, endDelay: 400 };
        var frames = [{ left: '3px' }, { left: 'calc(100% - 29px)' }];
        if (!ball.animate) return;
        try {
          anims.push(ball.animate(frames, Object.assign({}, opts, { easing: easingCss() })));
        } catch (err) {
          U.toast('This browser cannot preview that easing: ' + err.message, 'err');
        }
        anims.push(ballLin.animate(frames, Object.assign({}, opts, { easing: 'linear' })));
      }
      dur.input.addEventListener('change', function () { if (anims.length) play(); });
      loop.input.addEventListener('change', function () { if (anims.length) play(); });
      U.onTeardown(root, stop);

      var presetBox = el('div', { class: 'stack' }, BEZIER_PRESETS.map(function (grp) {
        return el('div', {}, el('div', { class: 'note', text: grp[0] }), el('div', { class: 'btnrow' }, grp[1].map(function (e) {
          return U.button(e[0], function () { p = e[1].slice(); mode = 'bezier'; modeChips.set('bezier'); draw(); }, 'ghost');
        })));
      }));

      root.appendChild(U.split(
        U.panel('Curve', svg, el('div', { class: 'nums' }, inputs), paste, U.note('Drag the pink and blue handles. x must stay between 0 and 1; y can overshoot for anticipation and bounce.')),
        U.panel('Type', modeChips, stepsBox, linBox,
          el('h4', { text: 'Preview' }), track, trackLin, U.row(dur, loop),
          U.btnrow(U.button('Play', play, 'primary'), U.button('Stop', stop, 'ghost')),
          el('p', { class: 'note' }, 'Progress at ', atIn, '% of the time: ', atOut))));
      root.appendChild(U.panel('Presets', presetBox));
      root.appendChild(U.panel('CSS', el('p', {}, valueOut), code, U.btnrow(
        U.copyBtn('Copy value', function () { return easingCss(); }),
        U.copyBtn('Copy CSS', function () { return code.textContent; }))));
      atIn.style.width = '80px';
      draw();
    }
  });

  /* ========================================================================= */
  /* Fluid Type Scale & clamp() Generator                                        */
  /* ========================================================================= */

  var SCALES = [['Minor second', 1.067], ['Major second', 1.125], ['Minor third', 1.2], ['Major third', 1.25], ['Perfect fourth', 1.333],
    ['Augmented fourth', 1.414], ['Perfect fifth', 1.5], ['Golden ratio', 1.618]];

  /* Utopia-style fluid value: min size at the min viewport, max size at the
     max viewport, linear in between, as clamp() in rem. */
  function fluid(minPx, maxPx, minVw, maxVw, root) {
    var slope = (maxPx - minPx) / (maxVw - minVw), intercept = minPx - slope * minVw;
    var lo = Math.min(minPx, maxPx), hi = Math.max(minPx, maxPx);
    var vw = slope * 100;
    var mid = num(intercept / root, 4) + 'rem ' + (vw < 0 ? '- ' : '+ ') + num(Math.abs(vw), 4) + 'vw';
    return {
      slope: slope, intercept: intercept,
      css: 'clamp(' + num(lo / root, 4) + 'rem, ' + mid + ', ' + num(hi / root, 4) + 'rem)',
      at: function (w) { return clamp(intercept + slope * w, lo, hi); }
    };
  }

  Tools.register({
    id: 'fluid-type-scale', category: 'css', name: 'Fluid Type Scale & clamp() Generator',
    description: 'Build a fluid modular type scale that grows between two viewport widths, as clamp() values in rem with CSS custom properties, plus a single clamp() calculator.',
    keywords: ['fluid type', 'fluid typography', 'type scale', 'modular scale', 'clamp', 'clamp()', 'responsive font size', 'utopia', 'rem', 'vw',
      'font size', 'typography', 'css variables', 'custom properties', 'golden ratio', 'major third'],
    render: function (root) {
      root.classList.add('g-cssb');
      function numField(label, value, k, hint) {
        var inp = el('input', { type: 'number', value: value, step: 'any', dataset: { k: k } });
        inp.addEventListener('input', run);
        var f = U.field(label, inp, hint);
        f.get = function () { return parseFloat(inp.value); };
        return f;
      }
      function ratioField(label, value, k) {
        var sel = el('select', { dataset: { k: k + '-name' } },
          SCALES.map(function (s) { return el('option', { value: String(s[1]), text: s[0] + ' (' + s[1] + ')' }); }), el('option', { value: 'custom', text: 'Custom' }));
        var inp = el('input', { type: 'number', step: 0.001, min: 1, value: value, dataset: { k: k } });
        sel.value = String(value);
        sel.addEventListener('change', function () { if (sel.value !== 'custom') { inp.value = sel.value; run(); } });
        inp.addEventListener('input', function () {
          var m = SCALES.filter(function (s) { return String(s[1]) === inp.value; })[0];
          sel.value = m ? String(m[1]) : 'custom';
          run();
        });
        var f = el('div', { class: 'field' }, el('label', { text: label }), sel, inp);
        f.get = function () { return parseFloat(inp.value); };
        return f;
      }
      var minVw = numField('Min viewport (px)', 320, 'min-vw'), maxVw = numField('Max viewport (px)', 1240, 'max-vw');
      var minBase = numField('Base size at min (px)', 18, 'min-base'), maxBase = numField('Base size at max (px)', 20, 'max-base');
      var minRatio = ratioField('Scale ratio at min', 1.2, 'min-ratio'), maxRatio = ratioField('Scale ratio at max', 1.25, 'max-ratio');
      var up = numField('Steps up', 5, 'up'), down = numField('Steps down', 2, 'down');
      var rootPx = numField('Root font size (px)', 16, 'root', 'rem values assume this root size');
      var prefix = el('input', { type: 'text', value: 'step', spellcheck: false, class: 'mono', 'aria-label': 'Variable name prefix' });
      prefix.addEventListener('input', run);
      var width = slider('Preview width', { min: 320, max: 1240, value: 780, key: 'width' }, function () { preview(); });
      var tableBox = el('div', { class: 'scroll', style: { overflowX: 'auto' } });
      var prev = el('div', { class: 'fluid-prev' });
      var cssOut = outBox('css');
      var note = el('p', { class: 'note' });
      var steps = [];

      function run() {
        var a = minVw.get(), b = maxVw.get(), r = rootPx.get() || 16;
        if (!(b > a) || !(minBase.get() > 0) || !(maxBase.get() > 0) || !(minRatio.get() > 0) || !(maxRatio.get() > 0)) {
          note.className = 'note err'; note.textContent = 'The max viewport must be wider than the min, and sizes and ratios must be positive.';
          return;
        }
        note.className = 'note'; note.textContent = '';
        var u = clamp(Math.round(up.get()) || 0, 0, 12), dn = clamp(Math.round(down.get()) || 0, 0, 8);
        steps = [];
        for (var s = -dn; s <= u; s++) {
          var lo = minBase.get() * Math.pow(minRatio.get(), s), hi = maxBase.get() * Math.pow(maxRatio.get(), s);
          steps.push({ step: s, min: lo, max: hi, f: fluid(lo, hi, a, b, r) });
        }
        if (steps.some(function (x) { return x.min > x.max; })) { note.textContent = 'Some steps shrink as the screen grows (min size above max size); their clamp() bounds are swapped so it stays valid.'; }
        var pre = prefix.value.trim().replace(/[^a-zA-Z0-9_-]/g, '') || 'step';
        width.input.min = a; width.input.max = b;
        if (width.get() < a || width.get() > b) width.set(Math.round((a + b) / 2));
        tableBox.replaceChildren(U.table(['Step', 'Min', 'Max', 'clamp()'], steps.slice().reverse().map(function (x) {
          var code = el('code', { class: 'mono', text: x.f.css, dataset: { k: 'clamp' + x.step } });
          return [String(x.step), num(x.min, 2) + 'px · ' + num(x.min / r, 4) + 'rem', num(x.max, 2) + 'px · ' + num(x.max / r, 4) + 'rem', code];
        })));
        cssOut.textContent = ':root {\n' + steps.map(function (x) { return '  --' + pre + '-' + x.step + ': ' + x.f.css + ';'; }).join('\n') + '\n}';
        preview();
      }
      function preview() {
        var w = width.get();
        prev.replaceChildren.apply(prev, steps.slice().reverse().map(function (x) {
          var px = x.f.at(w);
          return el('div', { style: { fontSize: px + 'px' }, dataset: { k: 'size' + x.step, px: num(px, 3) } },
            el('small', { text: x.step + ' · ' + num(px, 1) + 'px' }), 'The quick brown fox');
        }));
      }

      /* Single clamp(): A px at X px wide to B px at Y px wide. */
      var sA = numField('Size A (px)', 16, 'single-a'), sX = numField('at viewport X (px)', 320, 'single-x');
      var sB = numField('Size B (px)', 24, 'single-b'), sY = numField('at viewport Y (px)', 1280, 'single-y');
      var singleOut = outBox('single');
      var singleNote = el('p', { class: 'note' });
      function single() {
        var x = sX.get(), y = sY.get(), r = rootPx.get() || 16;
        if (!(y !== x) || [sA.get(), sB.get(), x, y].some(isNaN)) { singleOut.textContent = ''; singleNote.textContent = 'Use two different viewport widths.'; return; }
        var lo = x < y ? [sA.get(), x] : [sB.get(), y], hi = x < y ? [sB.get(), y] : [sA.get(), x];
        var f = fluid(lo[0], hi[0], lo[1], hi[1], r);
        singleOut.textContent = f.css;
        singleNote.textContent = 'Grows ' + num(f.slope * 100, 4) + 'px for every 100px of viewport width; ' + num(lo[0], 2) + 'px up to ' + lo[1] + 'px wide and ' + num(hi[0], 2) + 'px from ' + hi[1] + 'px.';
      }
      [sA, sX, sB, sY].forEach(function (f) { f.querySelector('input').addEventListener('input', single); });
      rootPx.querySelector('input').addEventListener('input', single);

      root.appendChild(U.panel('Scale settings', el('div', { class: 'sliders' }, minVw, maxVw, minBase, maxBase, minRatio, maxRatio, up, down, rootPx,
        el('div', { class: 'field' }, el('label', { text: 'Variable prefix' }), prefix)), note));
      root.appendChild(U.panel('Scale', tableBox, U.note('Each step is base × ratio^step, worked out separately at the min and max viewport; in between the size grows in a straight line.')));
      root.appendChild(U.panel('Preview', width, prev));
      root.appendChild(U.panel('CSS custom properties', cssOut, U.btnrow(U.copyBtn('Copy CSS', function () { return cssOut.textContent; }))));
      root.appendChild(U.panel('Single clamp() calculator', el('div', { class: 'sliders' }, sA, sX, sB, sY), singleOut, singleNote,
        U.btnrow(U.copyBtn('Copy clamp()', function () { return singleOut.textContent; }))));
      run(); single();
    }
  });

  /* ========================================================================= */
  /* CSS Transform Generator                                                     */
  /* ========================================================================= */

  /* 4x4 matrices as row-major arrays m[row][col], acting on column vectors;
     CSS composes transform functions left to right as M1 · M2 · ... */
  function ident() { return [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]; }
  function mat4mul(a, b) {
    var out = ident();
    for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
      out[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j] + a[i][3] * b[3][j];
    }
    return out;
  }
  var D2R = Math.PI / 180;
  function mTranslate(x, y, z) { var m = ident(); m[0][3] = x; m[1][3] = y; m[2][3] = z; return m; }
  function mRotX(a) { var m = ident(), c = Math.cos(a * D2R), s = Math.sin(a * D2R); m[1][1] = c; m[1][2] = -s; m[2][1] = s; m[2][2] = c; return m; }
  function mRotY(a) { var m = ident(), c = Math.cos(a * D2R), s = Math.sin(a * D2R); m[0][0] = c; m[0][2] = s; m[2][0] = -s; m[2][2] = c; return m; }
  function mRotZ(a) { var m = ident(), c = Math.cos(a * D2R), s = Math.sin(a * D2R); m[0][0] = c; m[0][1] = -s; m[1][0] = s; m[1][1] = c; return m; }
  function mSkew(ax, ay) { var m = ident(); m[0][1] = Math.tan(ax * D2R); m[1][0] = Math.tan(ay * D2R); return m; }
  function mScale(x, y) { var m = ident(); m[0][0] = x; m[1][1] = y; return m; }
  function mPersp(d) { var m = ident(); m[3][2] = -1 / d; return m; }
  function n6(v) { var s = num(Math.abs(v) < 5e-7 ? 0 : v, 6); return s; }

  Tools.register({
    id: 'css-transform', category: 'css', name: 'CSS Transform Generator',
    description: 'Combine translate, rotate, scale, skew and 3D rotation with perspective, set transform-origin, see it live and copy the transform plus its matrix() or matrix3d().',
    keywords: ['css transform', 'transform', 'translate', 'rotate', 'scale', 'skew', 'rotatex', 'rotatey', 'perspective', 'translatez', '3d',
      'transform-origin', 'matrix', 'matrix3d', 'generator', 'css'],
    render: function (root) {
      root.classList.add('g-cssb');
      var s = {};
      function sl(key, label, min, max, step, value, unit) { s[key] = slider(label, { min: min, max: max, step: step, value: value, unit: unit, key: key }, update); return s[key]; }
      var lockScale = U.checkbox('Lock scale X and Y', { checked: true });
      var twoD = el('div', { class: 'sliders' },
        sl('tx', 'translateX', -200, 200, 1, 0, 'px'), sl('ty', 'translateY', -200, 200, 1, 0, 'px'), sl('rz', 'rotate', -180, 180, 1, 0, '°'),
        sl('sx', 'scaleX', 0, 3, 0.05, 1, ''), sl('sy', 'scaleY', 0, 3, 0.05, 1, ''), sl('kx', 'skewX', -60, 60, 1, 0, '°'), sl('ky', 'skewY', -60, 60, 1, 0, '°'));
      var threeD = el('div', { class: 'sliders' },
        sl('rx', 'rotateX', -180, 180, 1, 0, '°'), sl('ry', 'rotateY', -180, 180, 1, 0, '°'), sl('tz', 'translateZ', -300, 300, 1, 0, 'px'),
        sl('pe', 'perspective (0 = none)', 0, 2000, 10, 0, 'px'));
      s.sx.input.addEventListener('input', function () { if (lockScale.input.checked) { s.sy.set(s.sx.get()); update(); } });
      s.sy.input.addEventListener('input', function () { if (lockScale.input.checked) { s.sx.set(s.sy.get()); update(); } });
      var origin = ['50%', '50%'];
      var ORIGINS = [['top left', '0%', '0%'], ['top', '50%', '0%'], ['top right', '100%', '0%'], ['left', '0%', '50%'], ['center', '50%', '50%'],
        ['right', '100%', '50%'], ['bottom left', '0%', '100%'], ['bottom', '50%', '100%'], ['bottom right', '100%', '100%']];
      var ox = el('input', { type: 'text', value: '50%', class: 'mono', 'aria-label': 'Origin X', dataset: { k: 'ox' } });
      var oy = el('input', { type: 'text', value: '50%', class: 'mono', 'aria-label': 'Origin Y', dataset: { k: 'oy' } });
      var originChips = U.chips(ORIGINS.map(function (o) { return { value: o[0], label: o[0] }; }), function (v) {
        var o = ORIGINS.filter(function (x) { return x[0] === v; })[0];
        ox.value = o[1]; oy.value = o[2]; update();
      }, 'center');
      originChips.classList.add('small');
      [ox, oy].forEach(function (i) { i.addEventListener('input', update); });
      var box = el('div', { class: 'tf-box', text: 'CSS' }), ghost = el('div', { class: 'tf-ghost' });
      var stage = el('div', { class: 'stage' }, ghost, box);
      var cssOut = outBox('css'), matOut = outBox('matrix');

      function values() { var v = {}; Object.keys(s).forEach(function (k) { v[k] = s[k].get(); }); return v; }
      function transformCss(v) {
        var parts = [];
        if (v.pe > 0) parts.push('perspective(' + v.pe + 'px)');
        if (v.tz) parts.push('translate3d(' + v.tx + 'px, ' + v.ty + 'px, ' + v.tz + 'px)');
        else if (v.tx || v.ty) parts.push('translate(' + v.tx + 'px, ' + v.ty + 'px)');
        if (v.rx) parts.push('rotateX(' + v.rx + 'deg)');
        if (v.ry) parts.push('rotateY(' + v.ry + 'deg)');
        if (v.rz) parts.push('rotate(' + v.rz + 'deg)');
        if (v.kx || v.ky) parts.push('skew(' + v.kx + 'deg, ' + v.ky + 'deg)');
        if (v.sx !== 1 || v.sy !== 1) parts.push(v.sx === v.sy ? 'scale(' + num(v.sx, 2) + ')' : 'scale(' + num(v.sx, 2) + ', ' + num(v.sy, 2) + ')');
        return parts.length ? parts.join(' ') : 'none';
      }
      function matrixOf(v) {
        var m = ident();
        if (v.pe > 0) m = mat4mul(m, mPersp(v.pe));
        m = mat4mul(m, mTranslate(v.tx, v.ty, v.tz));
        m = mat4mul(m, mRotX(v.rx));
        m = mat4mul(m, mRotY(v.ry));
        m = mat4mul(m, mRotZ(v.rz));
        m = mat4mul(m, mSkew(v.kx, v.ky));
        return mat4mul(m, mScale(v.sx, v.sy));
      }
      function matrixCss(m) {
        var is2d = [m[0][2], m[1][2], m[2][0], m[2][1], m[2][3], m[3][0], m[3][1], m[3][2]].every(function (x) { return Math.abs(x) < 1e-9; }) &&
          Math.abs(m[2][2] - 1) < 1e-9 && Math.abs(m[3][3] - 1) < 1e-9;
        if (is2d) return 'matrix(' + [m[0][0], m[1][0], m[0][1], m[1][1], m[0][3], m[1][3]].map(n6).join(', ') + ')';
        var cols = [];
        for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) cols.push(n6(m[r][c]));
        return 'matrix3d(' + cols.join(', ') + ')';
      }
      function update() {
        var v = values(), t = transformCss(v), o = (ox.value.trim() || '50%') + ' ' + (oy.value.trim() || '50%');
        box.style.transform = t;
        box.style.transformOrigin = o;
        cssOut.textContent = 'transform: ' + t + ';\ntransform-origin: ' + o + ';';
        matOut.textContent = 'transform: ' + (t === 'none' ? 'none' : matrixCss(matrixOf(v))) + ';';
      }
      update();

      var reset = U.button('Reset', function () {
        Object.keys(s).forEach(function (k) { s[k].set(k === 'sx' || k === 'sy' ? 1 : 0); });
        ox.value = '50%'; oy.value = '50%';
        update();
      }, 'ghost');

      root.appendChild(U.split(
        el('div', { class: 'stack' },
          U.panel('2D', twoD, lockScale),
          U.panel('3D', threeD, U.note('perspective() here is part of the transform itself, so it only affects this element.')),
          U.panel('transform-origin', originChips, U.row(U.field('X', ox), U.field('Y', oy)))),
        el('div', { class: 'stack' },
          U.panel('Preview', stage, U.note('The dashed outline is the untransformed box.'), U.btnrow(reset)),
          U.panel('CSS', cssOut, U.btnrow(U.copyBtn('Copy CSS', function () { return cssOut.textContent; }))),
          U.panel('As a matrix', matOut, U.note('The same transform as one matrix() (2D) or matrix3d() (3D), in the order the functions are listed.'),
            U.btnrow(U.copyBtn('Copy matrix', function () { return matOut.textContent; }))))));
    }
  });

  /* ========================================================================= */
  /* Glassmorphism Generator                                                     */
  /* ========================================================================= */

  var GLASS_BACKGROUNDS = {
    Aurora: { bg: 'linear-gradient(135deg,#0f172a,#312e81)', blobs: [['#22d3ee', 8, 12, 190], ['#a855f7', 60, 50, 230], ['#f43f5e', 30, 70, 160]] },
    Sunset: { bg: 'linear-gradient(160deg,#fb923c,#db2777 60%,#7c3aed)', blobs: [['#fde047', 70, 8, 170], ['#f97316', 10, 60, 200]] },
    Ocean: { bg: 'linear-gradient(180deg,#0369a1,#0f766e)', blobs: [['#38bdf8', 15, 15, 200], ['#34d399', 65, 55, 220], ['#1e3a8a', 45, 5, 140]] },
    Pastel: { bg: 'linear-gradient(135deg,#fdf2f8,#e0f2fe)', blobs: [['#f9a8d4', 10, 20, 200], ['#93c5fd', 60, 45, 230], ['#fde68a', 35, 70, 150]] }
  };

  Tools.register({
    id: 'glassmorphism', category: 'css', name: 'Glassmorphism Generator',
    description: 'Design a frosted-glass panel with blur, transparency, saturation, border, radius and shadow over a colourful background, and copy the CSS with backdrop-filter, the -webkit- prefix and a fallback.',
    keywords: ['glassmorphism', 'glass', 'frosted glass', 'backdrop-filter', 'blur', 'translucent', 'transparency', 'card', 'ui', 'css generator', 'webkit'],
    render: function (root) {
      root.classList.add('g-cssb');
      var tint = '#ffffff', bgName = 'Aurora';
      var blur = slider('Blur', { min: 0, max: 40, value: 12, key: 'blur' }, update);
      var opacity = slider('Tint opacity', { min: 0, max: 100, value: 20, unit: '%', key: 'opacity' }, update);
      var sat = slider('Saturation', { min: 100, max: 250, step: 5, value: 180, unit: '%', key: 'saturation' }, update);
      var bw = slider('Border width', { min: 0, max: 4, value: 1, key: 'border' }, update);
      var bo = slider('Border opacity', { min: 0, max: 100, value: 30, unit: '%', key: 'border-opacity' }, update);
      var radius = slider('Radius', { min: 0, max: 48, value: 16, key: 'radius' }, update);
      var sh = slider('Shadow blur', { min: 0, max: 64, value: 32, key: 'shadow' }, update);
      var so = slider('Shadow opacity', { min: 0, max: 60, value: 15, unit: '%', key: 'shadow-opacity' }, update);
      var tintIn = colourField('Tint colour', tint, function (v) { tint = v; update(); });
      var stage = el('div', { class: 'glass-stage' });
      var card = el('div', { class: 'glass-card', dataset: { k: 'card' } }, el('h4', { text: 'Frosted glass' }), el('p', { text: 'Text on glass stays readable because the background is blurred behind it.' }));
      var cssOut = outBox('css');
      var bgChips = U.chips(Object.keys(GLASS_BACKGROUNDS), function (v) { bgName = v; drawBg(); }, 'Aurora');

      function drawBg() {
        var b = GLASS_BACKGROUNDS[bgName];
        stage.style.background = b.bg;
        stage.replaceChildren.apply(stage, b.blobs.map(function (x) {
          return el('i', { class: 'blob', style: { background: x[0], left: x[1] + '%', top: x[2] + '%', width: x[3] + 'px', height: x[3] + 'px' } });
        }).concat([card]));
        card.style.color = bgName === 'Pastel' ? '#1e293b' : '#fff';
        card.style.textShadow = bgName === 'Pastel' ? 'none' : '';
      }
      function rgba(hex, a) { var c = hexToRgb(hex); return 'rgba(' + c.join(', ') + ', ' + num(a, 2) + ')'; }
      function update() {
        var a = opacity.get() / 100, filter = 'blur(' + blur.get() + 'px) saturate(' + sat.get() + '%)';
        var fallback = Math.max(0.85, a);
        var shadow = sh.get() ? '0 ' + Math.round(sh.get() / 4) + 'px ' + sh.get() + 'px ' + rgba('#000000', so.get() / 100) : 'none';
        var border = bw.get() ? bw.get() + 'px solid ' + rgba(tint, bo.get() / 100) : 'none';
        card.style.background = rgba(tint, a);
        card.style.backdropFilter = filter;
        card.style.webkitBackdropFilter = filter;
        card.style.border = border;
        card.style.borderRadius = radius.get() + 'px';
        card.style.boxShadow = shadow;
        cssOut.textContent = [
          '.glass {',
          '  background: ' + rgba(tint, a) + ';',
          '  backdrop-filter: ' + filter + ';',
          '  -webkit-backdrop-filter: ' + filter + ';',
          '  border: ' + border + ';',
          '  border-radius: ' + radius.get() + 'px;',
          '  box-shadow: ' + shadow + ';',
          '}',
          '',
          '/* Without backdrop-filter, a nearly opaque panel keeps text readable. */',
          '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {',
          '  .glass { background: ' + rgba(tint, fallback) + '; }',
          '}'
        ].join('\n');
      }
      drawBg();
      update();

      root.appendChild(U.split(
        U.panel('Preview', bgChips, stage),
        U.panel('Glass', el('div', { class: 'sliders' }, blur, opacity, sat, bw, bo, radius, sh, so), tintIn,
          U.note('backdrop-filter blurs whatever is behind the element, so the panel needs a translucent background to show it.'))));
      root.appendChild(U.panel('CSS', cssOut, U.btnrow(U.copyBtn('Copy CSS', function () { return cssOut.textContent; }))));
    }
  });

  /* ========================================================================= */
  /* SVG Blob & Wave Generator                                                   */
  /* ========================================================================= */

  /* mulberry32: a small seeded PRNG, so the same seed gives the same shape. */
  function prng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pt(x, y) { return num(x, 1) + ',' + num(y, 1); }
  /* Closed Catmull-Rom spline through the points, as cubic Béziers. */
  function closedPath(pts) {
    var n = pts.length, d = 'M' + pt(pts[0][0], pts[0][1]);
    for (var i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += 'C' + pt(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6) + ' ' +
        pt(p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6) + ' ' + pt(p2[0], p2[1]);
    }
    return d + 'Z';
  }
  function mixHex(a, b, t) {
    var x = hexToRgb(a), y = hexToRgb(b);
    return '#' + x.map(function (v, i) { return Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0'); }).join('');
  }
  function svgDataUri(svg) {
    return 'data:image/svg+xml,' + svg.replace(/"/g, "'").replace(/\s+/g, ' ').replace(/[\r\n%#()<>?[\\\]^`{|}]/g, encodeURIComponent);
  }

  Tools.register({
    id: 'svg-blob-wave', category: 'css', name: 'SVG Blob & Wave Generator',
    description: 'Generate organic SVG blobs and layered waves from a seed, with solid or gradient fills, then download the SVG or copy it as code or a CSS data URI.',
    keywords: ['svg', 'blob', 'blobs', 'wave', 'waves', 'shape', 'organic', 'background', 'divider', 'section divider', 'generator', 'gradient',
      'data uri', 'css background', 'random shape', 'seed'],
    render: function (root) {
      root.classList.add('g-cssb');
      var kind = 'blob', svgText = '';
      var kindChips = U.chips([{ value: 'blob', label: 'Blob' }, { value: 'wave', label: 'Waves' }], function (v) { kind = v; draw(); }, 'blob');
      var points = slider('Points', { min: 3, max: 16, value: 6, unit: '', key: 'points' }, draw);
      var rand = slider('Randomness', { min: 0, max: 100, value: 40, unit: '%', key: 'random' }, draw);
      var seed = el('input', { type: 'number', value: 7, min: 0, step: 1, dataset: { k: 'seed' } });
      seed.addEventListener('input', draw);
      var reseed = U.button('New seed', function () { seed.value = Math.floor(Math.random() * 100000); draw(); }, 'ghost');
      var layers = slider('Layers', { min: 1, max: 5, value: 3, unit: '', key: 'layers' }, draw);
      var height = slider('Height', { min: 10, max: 90, value: 50, unit: '%', key: 'height' }, draw);
      var amp = slider('Wave height', { min: 0, max: 60, value: 20, unit: '%', key: 'amp' }, draw);
      var freq = slider('Waves across', { min: 1, max: 10, value: 3, unit: '', key: 'freq' }, draw);
      var flip = U.checkbox('Flip (hang from the top)');
      flip.input.addEventListener('change', draw);
      var c1 = colourField('Colour 1', '#6366f1', draw), c2 = colourField('Colour 2', '#ec4899', draw);
      var gradient = U.checkbox('Gradient fill', { checked: true });
      gradient.input.addEventListener('change', draw);
      var angle = slider('Gradient angle', { min: 0, max: 360, step: 5, value: 45, unit: '°', key: 'angle' }, draw);
      var blobBox = el('div', { class: 'sliders' }, points);
      var waveBox = el('div', { class: 'sliders' }, layers, height, amp, freq, flip);
      var prev = el('div', { class: 'svgprev' });
      var codeOut = outBox('svg'), uriOut = outBox('uri');

      function gradDef(id, a, b) {
        return '<linearGradient id="' + id + '" gradientTransform="rotate(' + angle.get() + ' 0.5 0.5)"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>';
      }
      function blobSvg() {
        var rnd = prng(parseInt(seed.value, 10) || 0), n = points.get(), r = rand.get() / 100, R = 150, cx = 200, cy = 200, pts = [];
        for (var i = 0; i < n; i++) {
          var jitter = (rnd() - 0.5) * r * (Math.PI / n) * 0.8;
          var a = i * 2 * Math.PI / n + jitter, rad = R * (1 - r * 0.55 * rnd());
          pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
        }
        var fill = gradient.input.checked ? 'url(#blob-fill)' : c1.input.value;
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">' +
          (gradient.input.checked ? '<defs>' + gradDef('blob-fill', c1.input.value, c2.input.value) + '</defs>' : '') +
          '<path d="' + closedPath(pts) + '" fill="' + fill + '"/></svg>';
      }
      function waveSvg() {
        var W = 1440, H = 320, L = layers.get(), rnd = prng(parseInt(seed.value, 10) || 0), r = rand.get() / 100, f = freq.get();
        var paths = [], defs = [];
        for (var li = 0; li < L; li++) {
          var mid = H - H * height.get() / 100 * (1 - 0.5 * li / L), A = H * amp.get() / 200, segs = f * 2, dx = W / segs, ys = [];
          for (var k = 0; k <= segs; k++) {
            var up = (k + li) % 2 === 0 ? -1 : 1;
            ys.push(mid + up * A * (1 - r * 0.7 * rnd()));
          }
          function Y(y) { return flip.input.checked ? H - y : y; }
          var d = 'M0,' + num(Y(ys[0]), 1);
          for (k = 1; k <= segs; k++) {
            var x0 = (k - 1) * dx, x1 = k * dx;
            d += 'C' + pt(x0 + dx / 2, Y(ys[k - 1])) + ' ' + pt(x1 - dx / 2, Y(ys[k])) + ' ' + pt(x1, Y(ys[k]));
          }
          d += flip.input.checked ? 'L' + W + ',0L0,0Z' : 'L' + W + ',' + H + 'L0,' + H + 'Z';
          var t = L === 1 ? 0 : li / (L - 1), col = mixHex(c1.input.value, c2.input.value, t);
          var fill = col;
          if (gradient.input.checked) { defs.push(gradDef('wave-' + li, col, mixHex(col, '#ffffff', 0.35))); fill = 'url(#wave-' + li + ')'; }
          paths.push('<path d="' + d + '" fill="' + fill + '"' + (L > 1 ? ' fill-opacity="' + num(0.45 + 0.55 * (li + 1) / L, 2) + '"' : '') + '/>');
        }
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" preserveAspectRatio="none">' +
          (defs.length ? '<defs>' + defs.join('') + '</defs>' : '') + paths.join('') + '</svg>';
      }
      function draw() {
        blobBox.style.display = kind === 'blob' ? '' : 'none';
        waveBox.style.display = kind === 'wave' ? '' : 'none';
        svgText = kind === 'blob' ? blobSvg() : waveSvg();
        var doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
        prev.replaceChildren(document.importNode(doc.documentElement, true));
        codeOut.textContent = svgText;
        uriOut.textContent = 'background-image: url("' + svgDataUri(svgText) + '");';
      }
      draw();

      root.appendChild(U.split(
        U.panel('Shape', kindChips, blobBox, waveBox, rand, U.row(U.field('Seed', seed), reseed),
          el('div', { class: 'row' }, c1, c2), gradient, angle),
        U.panel('Preview', prev, U.btnrow(
          U.downloadBtn('Download SVG', 'shape.svg', function () { return svgText; }, 'image/svg+xml'),
          U.copyBtn('Copy SVG', function () { return svgText; }),
          U.copyBtn('Copy CSS data URI', function () { return uriOut.textContent; })))));
      root.appendChild(U.panel('SVG code', codeOut));
      root.appendChild(U.panel('CSS background', uriOut, U.note('The SVG inlined as a data URI, so it needs no extra file.')));
    }
  });

  /* ========================================================================= */
  /* CSS to Tailwind Converter                                                   */
  /* ========================================================================= */

  /* Tailwind v4 default theme values (tailwindcss 4.3 theme.css). */
  var TW = {
    breakpoints: [['sm', 640], ['md', 768], ['lg', 1024], ['xl', 1280], ['2xl', 1536]],
    text: { 12: 'xs', 14: 'sm', 16: 'base', 18: 'lg', 20: 'xl', 24: '2xl', 30: '3xl', 36: '4xl', 48: '5xl', 60: '6xl', 72: '7xl', 96: '8xl', 128: '9xl' },
    weight: { 100: 'thin', 200: 'extralight', 300: 'light', 400: 'normal', 500: 'medium', 600: 'semibold', 700: 'bold', 800: 'extrabold', 900: 'black' },
    leading: { 1: 'none', 1.25: 'tight', 1.375: 'snug', 1.5: 'normal', 1.625: 'relaxed', 2: 'loose' },
    tracking: { '-0.05': 'tighter', '-0.025': 'tight', 0: 'normal', 0.025: 'wide', 0.05: 'wider', 0.1: 'widest' },
    radius: { 0: 'none', 2: 'xs', 4: 'sm', 6: 'md', 8: 'lg', 12: 'xl', 16: '2xl', 24: '3xl', 32: '4xl' },
    container: { 256: '3xs', 288: '2xs', 320: 'xs', 384: 'sm', 448: 'md', 512: 'lg', 576: 'xl', 672: '2xl', 768: '3xl', 896: '4xl', 1024: '5xl', 1152: '6xl', 1280: '7xl' },
    shadow: {
      '0 1px rgb(0 0 0 / 0.05)': 'shadow-2xs', '0 1px 2px 0 rgb(0 0 0 / 0.05)': 'shadow-xs',
      '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)': 'shadow-sm',
      '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)': 'shadow-md',
      '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)': 'shadow-lg',
      '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)': 'shadow-xl',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)': 'shadow-2xl', 'none': 'shadow-none'
    },
    ease: { 'linear': 'ease-linear', 'cubic-bezier(0.4, 0, 1, 1)': 'ease-in', 'cubic-bezier(0, 0, 0.2, 1)': 'ease-out', 'cubic-bezier(0.4, 0, 0.2, 1)': 'ease-in-out' }
  };
  var PSEUDO = {
    hover: 'hover', focus: 'focus', 'focus-visible': 'focus-visible', 'focus-within': 'focus-within', active: 'active', visited: 'visited',
    disabled: 'disabled', enabled: 'enabled', checked: 'checked', required: 'required', invalid: 'invalid', valid: 'valid',
    'placeholder-shown': 'placeholder-shown', 'read-only': 'read-only', 'first-child': 'first', 'last-child': 'last', 'only-child': 'only',
    'nth-child(odd)': 'odd', 'nth-child(even)': 'even', 'nth-child(2n+1)': 'odd', 'nth-child(2n)': 'even', 'first-of-type': 'first-of-type',
    'last-of-type': 'last-of-type', empty: 'empty', target: 'target', ':before': 'before', ':after': 'after', ':placeholder': 'placeholder',
    ':selection': 'selection', ':marker': 'marker', ':first-line': 'first-line', ':first-letter': 'first-letter', ':file-selector-button': 'file',
    ':backdrop': 'backdrop'
  };
  var KEYWORDS = {
    display: { block: 'block', 'inline-block': 'inline-block', inline: 'inline', flex: 'flex', 'inline-flex': 'inline-flex', grid: 'grid',
      'inline-grid': 'inline-grid', contents: 'contents', table: 'table', 'table-row': 'table-row', 'table-cell': 'table-cell',
      'flow-root': 'flow-root', 'list-item': 'list-item', none: 'hidden' },
    position: { static: 'static', fixed: 'fixed', absolute: 'absolute', relative: 'relative', sticky: 'sticky' },
    visibility: { visible: 'visible', hidden: 'invisible', collapse: 'collapse' },
    'box-sizing': { 'border-box': 'box-border', 'content-box': 'box-content' },
    'text-align': { left: 'text-left', center: 'text-center', right: 'text-right', justify: 'text-justify', start: 'text-start', end: 'text-end' },
    'text-transform': { uppercase: 'uppercase', lowercase: 'lowercase', capitalize: 'capitalize', none: 'normal-case' },
    'font-style': { italic: 'italic', normal: 'not-italic' },
    'text-decoration': { underline: 'underline', 'line-through': 'line-through', overline: 'overline', none: 'no-underline' },
    'text-decoration-line': { underline: 'underline', 'line-through': 'line-through', overline: 'overline', none: 'no-underline' },
    'white-space': { normal: 'whitespace-normal', nowrap: 'whitespace-nowrap', pre: 'whitespace-pre', 'pre-line': 'whitespace-pre-line', 'pre-wrap': 'whitespace-pre-wrap', 'break-spaces': 'whitespace-break-spaces' },
    'word-break': { 'break-all': 'break-all', 'keep-all': 'break-keep', normal: 'break-normal' },
    'overflow-wrap': { 'break-word': 'wrap-break-word', anywhere: 'wrap-anywhere', normal: 'wrap-normal' },
    'text-overflow': { ellipsis: 'text-ellipsis', clip: 'text-clip' },
    'vertical-align': { baseline: 'align-baseline', top: 'align-top', middle: 'align-middle', bottom: 'align-bottom', 'text-top': 'align-text-top', 'text-bottom': 'align-text-bottom', sub: 'align-sub', super: 'align-super' },
    'list-style-type': { none: 'list-none', disc: 'list-disc', decimal: 'list-decimal' },
    'flex-direction': { row: 'flex-row', 'row-reverse': 'flex-row-reverse', column: 'flex-col', 'column-reverse': 'flex-col-reverse' },
    'flex-wrap': { wrap: 'flex-wrap', nowrap: 'flex-nowrap', 'wrap-reverse': 'flex-wrap-reverse' },
    'justify-content': { 'flex-start': 'justify-start', start: 'justify-start', 'flex-end': 'justify-end', end: 'justify-end', center: 'justify-center',
      'space-between': 'justify-between', 'space-around': 'justify-around', 'space-evenly': 'justify-evenly', stretch: 'justify-stretch', normal: 'justify-normal' },
    'align-items': { 'flex-start': 'items-start', start: 'items-start', 'flex-end': 'items-end', end: 'items-end', center: 'items-center', baseline: 'items-baseline', stretch: 'items-stretch' },
    'align-content': { 'flex-start': 'content-start', start: 'content-start', 'flex-end': 'content-end', end: 'content-end', center: 'content-center',
      'space-between': 'content-between', 'space-around': 'content-around', 'space-evenly': 'content-evenly', stretch: 'content-stretch', normal: 'content-normal' },
    'align-self': { auto: 'self-auto', 'flex-start': 'self-start', start: 'self-start', 'flex-end': 'self-end', end: 'self-end', center: 'self-center', stretch: 'self-stretch', baseline: 'self-baseline' },
    'justify-items': { start: 'justify-items-start', end: 'justify-items-end', center: 'justify-items-center', stretch: 'justify-items-stretch' },
    'justify-self': { auto: 'justify-self-auto', start: 'justify-self-start', end: 'justify-self-end', center: 'justify-self-center', stretch: 'justify-self-stretch' },
    'place-items': { start: 'place-items-start', end: 'place-items-end', center: 'place-items-center', stretch: 'place-items-stretch', baseline: 'place-items-baseline' },
    'place-content': { start: 'place-content-start', end: 'place-content-end', center: 'place-content-center', stretch: 'place-content-stretch',
      'space-between': 'place-content-between', 'space-around': 'place-content-around', 'space-evenly': 'place-content-evenly' },
    'place-self': { auto: 'place-self-auto', start: 'place-self-start', end: 'place-self-end', center: 'place-self-center', stretch: 'place-self-stretch' },
    'grid-auto-flow': { row: 'grid-flow-row', column: 'grid-flow-col', dense: 'grid-flow-dense', 'row dense': 'grid-flow-row-dense', 'column dense': 'grid-flow-col-dense' },
    cursor: { auto: 'cursor-auto', default: 'cursor-default', pointer: 'cursor-pointer', wait: 'cursor-wait', text: 'cursor-text', move: 'cursor-move',
      help: 'cursor-help', 'not-allowed': 'cursor-not-allowed', none: 'cursor-none', grab: 'cursor-grab', grabbing: 'cursor-grabbing', crosshair: 'cursor-crosshair', progress: 'cursor-progress' },
    'pointer-events': { none: 'pointer-events-none', auto: 'pointer-events-auto' },
    'user-select': { none: 'select-none', text: 'select-text', all: 'select-all', auto: 'select-auto' },
    'object-fit': { contain: 'object-contain', cover: 'object-cover', fill: 'object-fill', none: 'object-none', 'scale-down': 'object-scale-down' },
    'background-size': { auto: 'bg-auto', cover: 'bg-cover', contain: 'bg-contain' },
    'background-repeat': { repeat: 'bg-repeat', 'no-repeat': 'bg-no-repeat', 'repeat-x': 'bg-repeat-x', 'repeat-y': 'bg-repeat-y', round: 'bg-repeat-round', space: 'bg-repeat-space' },
    'background-position': { center: 'bg-center', top: 'bg-top', bottom: 'bg-bottom', left: 'bg-left', right: 'bg-right', 'left top': 'bg-top-left', 'right top': 'bg-top-right', 'left bottom': 'bg-bottom-left', 'right bottom': 'bg-bottom-right' },
    'border-style': { solid: 'border-solid', dashed: 'border-dashed', dotted: 'border-dotted', double: 'border-double', hidden: 'border-hidden', none: 'border-none' },
    'font-family': { 'sans-serif': 'font-sans', serif: 'font-serif', monospace: 'font-mono' },
    isolation: { isolate: 'isolate', auto: 'isolation-auto' },
    resize: { none: 'resize-none', both: 'resize', vertical: 'resize-y', horizontal: 'resize-x' },
    'table-layout': { auto: 'table-auto', fixed: 'table-fixed' },
    'border-collapse': { collapse: 'border-collapse', separate: 'border-separate' }
  };
  var OVERFLOW = { visible: 'visible', hidden: 'hidden', scroll: 'scroll', auto: 'auto', clip: 'clip' };

  var twPalette = null;
  /* The palette file is shared with the Tailwind Colour Palette tool. */
  function loadPalette() {
    if (twPalette) return Promise.resolve(twPalette);
    var K = window.ColourKit;
    if (!K) return Promise.reject(new Error('Colour maths unavailable'));
    return fetch('assets/data/color-b-tailwind.json').then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (data) {
      var list = [];
      data.colors.forEach(function (c) {
        data.shades.forEach(function (s, i) {
          var p4 = K.parseCss(c.v4[i]).rgb;
          list.push({ name: c.name + '-' + s, v3: c.v3 ? c.v3[i] : null, v4hex: K.hex(K.from01(K.gamutMap(p4))), ok: K.toOklab(p4) });
        });
      });
      twPalette = list;
      return list;
    });
  }

  /* Splits on a separator only at the top level (not inside brackets or quotes). */
  function splitTop(text, sepRe) {
    var out = [], cur = '', depth = 0, quote = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (quote) { cur += ch; if (ch === quote && text[i - 1] !== '\\') quote = ''; continue; }
      if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
      if (ch === '(' || ch === '[') depth++;
      if (ch === ')' || ch === ']') depth--;
      if (depth === 0 && sepRe.test(ch)) { out.push(cur); cur = ''; continue; }
      cur += ch;
    }
    out.push(cur);
    return out.map(function (s) { return s.trim(); }).filter(Boolean);
  }

  /* A small CSS reader: rules, @media and @supports blocks, bare declarations.
     Other at-rules are reported rather than converted. */
  function readCss(src) {
    src = src.replace(/\/\*[\s\S]*?\*\//g, '');
    var rules = [], skipped = [];
    function decls(body) {
      return splitTop(body, /;/).map(function (d) {
        var i = d.indexOf(':');
        if (i < 1) return { bad: d };
        var value = d.slice(i + 1).trim(), important = /!\s*important\s*$/i.test(value);
        return { prop: d.slice(0, i).trim().toLowerCase(), value: value.replace(/!\s*important\s*$/i, '').trim(), important: important };
      });
    }
    function walk(text, media) {
      var i = 0, n = text.length;
      while (i < n) {
        var start = i, depth = 0, quote = '';
        while (i < n) {
          var ch = text[i];
          if (quote) { if (ch === quote) quote = ''; i++; continue; }
          if (ch === '"' || ch === "'") { quote = ch; i++; continue; }
          if (ch === '(') depth++;
          if (ch === ')') depth--;
          if (depth === 0 && (ch === '{' || ch === ';' || ch === '}')) break;
          i++;
        }
        var prelude = text.slice(start, i).trim();
        if (i >= n) { if (prelude) skipped.push({ what: prelude, why: 'no { } block' }); break; }
        if (text[i] === ';' || text[i] === '}') { if (prelude) skipped.push({ what: prelude, why: /^@/.test(prelude) ? 'at-rule not converted' : 'stray text' }); i++; continue; }
        var open = i, level = 0, j = i;
        for (; j < n; j++) { if (text[j] === '{') level++; else if (text[j] === '}') { level--; if (level === 0) break; } }
        var body = text.slice(open + 1, j);
        i = j + 1;
        var at = prelude.match(/^@([a-z-]+)\s*(.*)$/i);
        if (at) {
          var name = at[1].toLowerCase();
          if (name === 'media' || name === 'supports') walk(body, media.concat([{ type: name, cond: at[2].trim() }]));
          else skipped.push({ what: '@' + name + (at[2] ? ' ' + at[2].trim() : ''), why: '@' + name + ' has no utility-class equivalent; keep it in CSS' });
          continue;
        }
        splitTop(prelude, /,/).forEach(function (sel) { rules.push({ selector: sel, media: media, decls: decls(body) }); });
      }
    }
    if (src.indexOf('{') === -1) rules.push({ selector: '(declarations)', media: [], decls: decls(src) });
    else walk(src, []);
    return { rules: rules, skipped: skipped };
  }

  /* Pulls pseudo-classes off the last compound selector as variants. */
  function selectorParts(sel) {
    var m = sel.match(/^(.*?)((?::{1,2}[a-z-]+(?:\([^)]*\))?)+)$/i);
    var base = m ? m[1] : sel, pseudos = m ? m[2].match(/::?[a-z-]+(?:\([^)]*\))?/gi) : [];
    if (!base.trim()) base = '*';
    var variants = pseudos.map(function (ps) {
      var key = ps.replace(/^:/, '').toLowerCase().replace(/\s+/g, '');
      return PSEUDO[key] || '[&' + ps.replace(/\s+/g, '_') + ']';
    });
    return { base: base.trim(), variants: variants };
  }

  function toPx(v) {
    var m = String(v).trim().match(/^(-?(?:\d+\.?\d*|\.\d+))(px|rem|em)?$/i);
    if (!m) return null;
    var n = parseFloat(m[1]), u = (m[2] || '').toLowerCase();
    if (!u) return n === 0 ? 0 : null;
    return u === 'px' ? n : u === 'rem' ? n * 16 : null;
  }

  /* One media condition ("(min-width: 768px)", "print"...) -> variants. */
  function mediaVariants(m) {
    if (m.type === 'supports') {
      var s = m.cond.replace(/^\(|\)$/g, '').trim();
      return /^[a-z-]+\s*:\s*[^()]+$/i.test(s) ? ['supports-[' + s.replace(/\s*:\s*/, ':').replace(/\s+/g, '_') + ']'] : null;
    }
    var out = [], ok = true;
    m.cond.toLowerCase().split(/\s+and\s+/).forEach(function (part) {
      part = part.trim();
      if (!part || part === 'screen' || part === 'all' || part === 'only screen') return;
      if (part === 'print') { out.push('print'); return; }
      var q = part.match(/^\(\s*([a-z-]+)\s*:\s*([^)]+?)\s*\)$/), r = part.match(/^\(\s*width\s*(>=|<=|<|>)\s*([^)]+?)\s*\)$/);
      var feat, val;
      if (q) { feat = q[1]; val = q[2]; }
      else if (r) { feat = r[1] === '>=' || r[1] === '>' ? 'min-width' : 'max-width'; val = r[2]; if (r[1] === '<') feat = 'lt-width'; }
      else { ok = false; return; }
      if (feat === 'prefers-color-scheme' && val === 'dark') { out.push('dark'); return; }
      if (feat === 'prefers-reduced-motion') { out.push(val === 'reduce' ? 'motion-reduce' : 'motion-safe'); return; }
      if (feat === 'orientation') { out.push(val); return; }
      var px = /em$/.test(val) && !/rem$/.test(val) ? parseFloat(val) * 16 : toPx(val);
      if (px === null || !/width$/.test(feat)) { ok = false; return; }
      var bp;
      if (feat === 'min-width') {
        bp = TW.breakpoints.filter(function (b) { return b[1] === px; })[0];
        out.push(bp ? bp[0] : 'min-[' + num(px, 2) + 'px]');
      } else {
        bp = TW.breakpoints.filter(function (b) { return feat === 'lt-width' ? b[1] === px : (b[1] - px >= 0 && b[1] - px <= 1); })[0];
        out.push(bp ? 'max-' + bp[0] : 'max-[' + num(px, 2) + 'px]');
      }
    });
    return ok ? out : null;
  }

  function arb(v) { return '[' + String(v).trim().replace(/_/g, '\\_').replace(/\s*,\s*/g, ',').replace(/\s+/g, '_') + ']'; }

  /* Everything about converting one declaration. `ctx` carries the colour
     options and the loaded palette. Returns { cls: [], note } or { fail }. */
  function convertDecl(prop, value, ctx) {
    var v = value.trim(), lv = v.toLowerCase(), notes = [];
    function res(cls, note) { return { cls: [].concat(cls).filter(Boolean), note: note || notes.join(' ') }; }

    function spacing(val, fractions) {
      val = val.trim();
      if (val === 'auto') return 'auto';
      if (fractions && val === '100%') return 'full';
      if (fractions && /%$/.test(val)) {
        var pct = parseFloat(val);
        for (var d = 2; d <= 12; d++) {
          var nn = Math.round(pct / 100 * d);
          if (nn > 0 && nn < d && Math.abs(nn / d * 100 - pct) < 0.01) {
            var g = (function gcd(a, b) { return b ? gcd(b, a % b) : a; })(nn, d);
            return nn / g + '/' + d / g;
          }
        }
      }
      var px = toPx(val);
      if (px === null) return null;
      if (px === 0) return '0';
      if (px === 1) return 'px';
      var q = px / 4;
      return Math.abs(q * 4 - Math.round(q * 4)) < 1e-9 ? num(q, 2) : null;
    }
    function sp(prefix, val, opts) {
      opts = opts || {};
      val = val.trim();
      var neg = val.charAt(0) === '-' && val !== '-0';
      var s = spacing(neg ? val.slice(1) : val, opts.fractions);
      if (s !== null && (!neg || opts.negative) && !(neg && s === 'auto')) return (neg ? '-' : '') + prefix + '-' + s;
      if (opts.named && opts.named[val]) return prefix + '-' + opts.named[val];
      notes.push('arbitrary value');
      return prefix + '-' + arb(val);
    }
    function colour(prefix, val) {
      var t = val.trim().toLowerCase();
      if (t === 'transparent') return prefix + '-transparent';
      if (t === 'currentcolor') return prefix + '-current';
      if (t === 'inherit') return prefix + '-inherit';
      var K = window.ColourKit, p = K && K.parseCss(val);
      if (!p) { notes.push('arbitrary colour'); return prefix + '-' + arb(val); }
      var hex = K.hex(K.from01(K.gamutMap(p.rgb))), alpha = p.alpha;
      var suffix = alpha >= 1 ? '' : (Math.abs(alpha * 100 - Math.round(alpha * 100)) < 1e-6 ? '/' + Math.round(alpha * 100) : '/[' + num(alpha, 3) + ']');
      if (ctx.colours !== 'arbitrary') {
        if (hex === '#000000' || hex === '#ffffff') return prefix + '-' + (hex === '#000000' ? 'black' : 'white') + suffix;
        var pal = ctx.palette || [];
        var v3 = pal.filter(function (e) { return e.v3 === hex; })[0];
        if (v3) { notes.push(v3.name + ' in the v3 palette (v4\'s ' + v3.name + ' is a little different)'); return prefix + '-' + v3.name + suffix; }
        var v4 = pal.filter(function (e) { return e.v4hex === hex; })[0];
        if (v4) { notes.push('v4 palette colour'); return prefix + '-' + v4.name + suffix; }
        if (ctx.colours === 'near' && pal.length) {
          var ok = K.toOklab(p.rgb), best = null;
          pal.forEach(function (e) { var d = 100 * K.deltaEOK(ok, e.ok); if (!best || d < best.d) best = { e: e, d: d }; });
          if (best && best.d <= ctx.threshold) { notes.push('nearest palette colour, ΔE OK ' + num(best.d, 2)); return prefix + '-' + best.e.name + suffix; }
        }
        if (!pal.length) notes.push('palette not loaded');
      }
      notes.push('arbitrary colour');
      return prefix + '-[' + (alpha >= 1 ? hex : val.trim().replace(/\s+/g, '_')) + ']';
    }
    function sides(prefixes, vals, conv) {
      /* prefixes: [all, x, y, t, r, b, l] for 1-4 value shorthands. */
      var p = splitTop(vals, /\s/);
      if (!p.length || p.length > 4) return null;
      var t = p[0], r = p[1] || t, b = p[2] || t, l = p[3] || r;
      if (t === r && r === b && b === l) return [conv(prefixes[0], t)];
      if (t === b && r === l) return [conv(prefixes[1], r), conv(prefixes[2], t)];
      if (r === l) return [conv(prefixes[3], t), conv(prefixes[1], r), conv(prefixes[5], b)];
      return [conv(prefixes[3], t), conv(prefixes[4], r), conv(prefixes[5], b), conv(prefixes[6], l)];
    }
    function sizeCls(prefix, val, extra) {
      var named = { auto: 'auto', '100%': 'full', '100vw': 'screen', '100vh': 'screen', '100dvh': 'dvh', '100svh': 'svh', '100lvh': 'lvh', 'min-content': 'min', 'max-content': 'max', 'fit-content': 'fit' };
      if (prefix.charAt(0) === 'w' && val === '100vh') return prefix + '-' + arb(val);
      if (prefix.charAt(0) === 'h' && val === '100vw') return prefix + '-' + arb(val);
      if (extra && extra[val]) return prefix + '-' + extra[val];
      if (named[val]) return prefix + '-' + named[val];
      return sp(prefix, val, { fractions: true });
    }

    switch (prop) {
      case 'padding': return res(sides(['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl'], v, function (pre, x) { return sp(pre, x); }));
      case 'margin': return res(sides(['m', 'mx', 'my', 'mt', 'mr', 'mb', 'ml'], v, function (pre, x) { return sp(pre, x, { negative: true }); }));
      case 'padding-top': case 'padding-right': case 'padding-bottom': case 'padding-left':
        return res(sp('p' + prop.charAt(8), v));
      case 'margin-top': case 'margin-right': case 'margin-bottom': case 'margin-left':
        return res(sp('m' + prop.charAt(7), v, { negative: true }));
      case 'padding-inline': return res(sp('px', v));
      case 'padding-block': return res(sp('py', v));
      case 'margin-inline': return res(sp('mx', v, { negative: true }));
      case 'margin-block': return res(sp('my', v, { negative: true }));
      case 'padding-inline-start': return res(sp('ps', v));
      case 'padding-inline-end': return res(sp('pe', v));
      case 'margin-inline-start': return res(sp('ms', v, { negative: true }));
      case 'margin-inline-end': return res(sp('me', v, { negative: true }));
      case 'gap': {
        var g = splitTop(v, /\s/);
        return res(g.length === 1 ? sp('gap', g[0]) : [sp('gap-y', g[0]), sp('gap-x', g[1])]);
      }
      case 'row-gap': return res(sp('gap-y', v));
      case 'column-gap': return res(sp('gap-x', v));
      case 'inset': return res(sides(['inset', 'inset-x', 'inset-y', 'top', 'right', 'bottom', 'left'], v, function (pre, x) { return sp(pre, x, { negative: true, fractions: true }); }));
      case 'top': case 'right': case 'bottom': case 'left': return res(sp(prop, v, { negative: true, fractions: true }));
      case 'width': return res(sizeCls('w', lv));
      case 'height': return res(sizeCls('h', lv));
      case 'min-width': return res(sizeCls('min-w', lv));
      case 'min-height': return res(sizeCls('min-h', lv));
      case 'max-height': return res(sizeCls('max-h', lv, { none: 'none' }));
      case 'max-width': {
        var cpx = toPx(lv), cname = cpx !== null && TW.container[cpx];
        if (cname) return res('max-w-' + cname);
        return res(sizeCls('max-w', lv, { none: 'none', '65ch': 'prose' }));
      }
      case 'flex-basis': return res(sizeCls('basis', lv));
      case 'color': return res(colour('text', v));
      case 'background-color': return res(colour('bg', v));
      case 'background': {
        if (window.ColourKit && window.ColourKit.parseCss(v) || /^(transparent|currentcolor|inherit)$/.test(lv)) return res(colour('bg', v));
        if (/^(linear|radial|conic)-gradient\(|^url\(/.test(lv)) { notes.push('arbitrary value'); return res('bg-' + arb(v)); }
        return null;
      }
      case 'background-image':
        if (lv === 'none') return res('bg-none');
        notes.push('arbitrary value');
        return res('bg-' + arb(v));
      case 'border-color': return res(colour('border', v));
      case 'outline-color': return res(colour('outline', v));
      case 'fill': return res(colour('fill', v));
      case 'stroke': return res(colour('stroke', v));
      case 'caret-color': return res(colour('caret', v));
      case 'accent-color': return res(colour('accent', v));
      case 'text-decoration-color': return res(colour('decoration', v));
      case 'font-size': {
        var fpx = toPx(lv);
        if (fpx !== null && TW.text[fpx]) return res('text-' + TW.text[fpx], 'v4 text-' + TW.text[fpx] + ' also sets a line-height');
        notes.push('arbitrary value');
        return res('text-' + arb(v));
      }
      case 'font-weight': {
        var w = { normal: 400, bold: 700 }[lv] || parseInt(lv, 10);
        return TW.weight[w] ? res('font-' + TW.weight[w]) : res('font-' + arb(v), 'arbitrary value');
      }
      case 'line-height': {
        if (/^\d*\.?\d+$/.test(lv) && TW.leading[parseFloat(lv)]) return res('leading-' + TW.leading[parseFloat(lv)]);
        if (/^\d*\.?\d+$/.test(lv)) return res('leading-' + arb(v), 'arbitrary value');
        return res(sp('leading', lv));
      }
      case 'letter-spacing': {
        var em = lv.match(/^(-?\d*\.?\d+)em$/);
        if (em && TW.tracking[String(parseFloat(em[1]))]) return res('tracking-' + TW.tracking[String(parseFloat(em[1]))]);
        if (lv === '0' || lv === 'normal') return res('tracking-normal');
        return res('tracking-' + arb(v), 'arbitrary value');
      }
      case 'font-family': {
        var fams = splitTop(lv, /,/), last = fams[fams.length - 1];
        if (fams.length === 1 && KEYWORDS['font-family'][last]) return res(KEYWORDS['font-family'][last]);
        return res('font-' + arb(v.replace(/"/g, "'")), 'arbitrary font stack' + (KEYWORDS['font-family'][last] ? ' (or ' + KEYWORDS['font-family'][last] + ' for the generic fallback)' : ''));
      }
      case 'overflow': case 'overflow-x': case 'overflow-y': {
        var ov = splitTop(lv, /\s/);
        if (ov.length === 1 && OVERFLOW[ov[0]]) return res(prop + '-' + OVERFLOW[ov[0]]);
        return null;
      }
      case 'opacity': {
        var o = /%$/.test(lv) ? parseFloat(lv) : parseFloat(lv) * 100;
        if (isNaN(o)) return null;
        return Math.abs(o - Math.round(o)) < 1e-9 ? res('opacity-' + Math.round(o)) : res('opacity-' + arb(v), 'arbitrary value');
      }
      case 'z-index':
        if (lv === 'auto') return res('z-auto');
        if (/^-?\d+$/.test(lv)) return res((lv.charAt(0) === '-' ? '-z-' + lv.slice(1) : 'z-' + lv));
        return null;
      case 'order':
        if (/^-?\d+$/.test(lv)) return res(lv.charAt(0) === '-' ? '-order-' + lv.slice(1) : lv === '0' ? 'order-none' : 'order-' + lv);
        return null;
      case 'flex': {
        var flexMap = { '1': 'flex-1', '1 1 0%': 'flex-1', '1 1 0': 'flex-1', auto: 'flex-auto', '1 1 auto': 'flex-auto', none: 'flex-none', '0 0 auto': 'flex-none', '0 1 auto': 'flex-initial', initial: 'flex-initial' };
        return flexMap[lv] ? res(flexMap[lv]) : res('flex-' + arb(v), 'arbitrary value');
      }
      case 'flex-grow': return /^\d+$/.test(lv) ? res(lv === '1' ? 'grow' : 'grow-' + lv) : null;
      case 'flex-shrink': return /^\d+$/.test(lv) ? res(lv === '1' ? 'shrink' : 'shrink-' + lv) : null;
      case 'grid-template-columns': case 'grid-template-rows': {
        var pre = prop === 'grid-template-columns' ? 'grid-cols' : 'grid-rows';
        var rep = lv.match(/^repeat\(\s*(\d+)\s*,\s*(minmax\(\s*0(?:px)?\s*,\s*1fr\s*\)|1fr)\s*\)$/);
        if (rep) return res(pre + '-' + rep[1], /1fr\s*\)$/.test(lv) && rep[2] === '1fr' ? 'Tailwind uses minmax(0, 1fr), which also lets columns shrink below their content' : '');
        if (lv === 'none' || lv === 'subgrid') return res(pre + '-' + lv);
        notes.push('arbitrary value');
        return res(pre + '-' + arb(v));
      }
      case 'grid-column': case 'grid-row': {
        var gp = prop === 'grid-column' ? 'col' : 'row', span = lv.match(/^span\s+(\d+)(?:\s*\/\s*span\s+\1)?$/);
        if (span) return res(gp + '-span-' + span[1]);
        if (/^1\s*\/\s*-1$/.test(lv)) return res(gp + '-span-full');
        return res(gp + '-' + arb(v), 'arbitrary value');
      }
      case 'grid-column-start': case 'grid-column-end': case 'grid-row-start': case 'grid-row-end': {
        var gp2 = (prop.indexOf('column') > -1 ? 'col-' : 'row-') + (/start$/.test(prop) ? 'start' : 'end');
        return /^-?\d+$/.test(lv) || lv === 'auto' ? res(gp2 + '-' + lv) : res(gp2 + '-' + arb(v), 'arbitrary value');
      }
      case 'aspect-ratio': {
        var ar = lv.replace(/\s+/g, '');
        if (ar === '1' || ar === '1/1') return res('aspect-square');
        if (ar === '16/9') return res('aspect-video');
        if (ar === 'auto') return res('aspect-auto');
        return res('aspect-' + arb(ar), 'arbitrary value');
      }
      case 'border': case 'border-top': case 'border-right': case 'border-bottom': case 'border-left': {
        var side = { border: '', 'border-top': '-t', 'border-right': '-r', 'border-bottom': '-b', 'border-left': '-l' }[prop];
        if (lv === 'none' || lv === '0') return res('border' + side + '-0');
        var out = [], parts = splitTop(v, /\s/), ok = true;
        parts.forEach(function (x) {
          var lx = x.toLowerCase(), px = toPx(lx);
          if (px !== null) out.push(px === 1 ? 'border' + side : 'border' + side + '-' + (Math.round(px) === px ? px : arb(x)));
          else if (/^(thin|medium|thick)$/.test(lx)) out.push('border' + side + '-' + arb(x));
          else if (KEYWORDS['border-style'][lx]) { if (lx !== 'solid') out.push(KEYWORDS['border-style'][lx]); }
          else if (window.ColourKit && window.ColourKit.parseCss(x) || lx === 'currentcolor' || lx === 'transparent') out.push(colour('border' + side, x));
          else ok = false;
        });
        if (!ok) return null;
        if (!out.some(function (c) { return /^border(-[trbl])?(-\d+|-\[.*\])?$/.test(c); })) out.unshift('border' + side);
        return res(out, (notes.length ? notes.join(' ') + ' ' : '') + 'Tailwind borders are solid by default');
      }
      case 'border-width': return res(sides(['border', 'border-x', 'border-y', 'border-t', 'border-r', 'border-b', 'border-l'], lv, function (pre, x) {
        var px = toPx(x);
        if (px === 1) return pre;
        return px !== null && Math.round(px) === px ? pre + '-' + px : pre + '-' + arb(x);
      }));
      case 'border-radius': {
        if (/\//.test(lv) || splitTop(lv, /\s/).length > 4) return res('rounded-' + arb(v), 'arbitrary value');
        return res(radiusCorners(lv));
      }
      case 'box-shadow': {
        var norm = lv.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').replace(/\(\s*/g, '(').replace(/\s*\)/g, ')');
        if (TW.shadow[norm]) return res(TW.shadow[norm]);
        return res('shadow-' + arb(v), 'arbitrary value');
      }
      case 'outline':
        if (lv === 'none') return res('outline-none');
        return null;
      case 'transition-duration': case 'transition-delay': case 'animation-duration': {
        var ms = lv.match(/^(\d*\.?\d+)(ms|s)$/);
        if (!ms || prop === 'animation-duration') return null;
        var val = parseFloat(ms[1]) * (ms[2] === 's' ? 1000 : 1);
        return res((prop === 'transition-duration' ? 'duration-' : 'delay-') + (Math.round(val) === val ? val : arb(v)));
      }
      case 'transition-timing-function': {
        var e = lv.replace(/\s*,\s*/g, ', ');
        if (TW.ease[e]) return res(TW.ease[e]);
        return res('ease-' + arb(v), lv === 'ease-in-out' || lv === 'ease-in' || lv === 'ease-out' ? 'Tailwind\'s ease-* curves differ from the CSS keywords, so this keeps the keyword' : 'arbitrary value');
      }
      case 'transform': {
        var fns = lv.match(/[a-z0-9]+\([^)]*\)/g) || [];
        if (fns.length !== 1 || fns[0] !== lv) return null;
        var fm = lv.match(/^([a-z0-9]+)\(([^)]*)\)$/), fname = fm[1], arg = fm[2].trim();
        var degs = arg.match(/^(-?\d*\.?\d+)deg$/);
        if ((fname === 'rotate' || fname === 'rotatez') && degs) return res((degs[1].charAt(0) === '-' ? '-rotate-' + degs[1].slice(1) : 'rotate-' + degs[1]), 'uses the rotate property');
        if (fname === 'scale' && /^\d*\.?\d+$/.test(arg)) { var sc = parseFloat(arg) * 100; return res(Math.round(sc) === sc ? 'scale-' + sc : 'scale-' + arb(arg), 'uses the scale property'); }
        if (fname === 'translatex' || fname === 'translatey') return res(sp('translate-' + fname.slice(-1), arg, { negative: true, fractions: true }), 'uses the translate property');
        return null;
      }
      case 'content':
        return res('content-' + arb(v.replace(/"/g, "'")));
    }
    if (KEYWORDS[prop]) {
      var hit = KEYWORDS[prop][lv.replace(/\s+/g, ' ')];
      return hit ? res(hit) : null;
    }
    return null;

    function radiusCorners(val) {
      var p = splitTop(val, /\s/), c = [p[0], p[1] || p[0], p[2] || p[0], p[3] || p[1] || p[0]];
      function r(pre, x) {
        var px = toPx(x);
        if (px !== null && px >= 9999) return pre + '-full';
        if (px !== null && TW.radius[px] !== undefined) return pre + '-' + TW.radius[px];
        return pre + '-' + arb(x);
      }
      if (c[0] === c[1] && c[1] === c[2] && c[2] === c[3]) return [r('rounded', c[0])];
      if (c[0] === c[1] && c[2] === c[3]) return [r('rounded-t', c[0]), r('rounded-b', c[2])];
      if (c[0] === c[3] && c[1] === c[2]) return [r('rounded-l', c[0]), r('rounded-r', c[1])];
      return [r('rounded-tl', c[0]), r('rounded-tr', c[1]), r('rounded-br', c[2]), r('rounded-bl', c[3])];
    }
  }

  var CSS_SAMPLE = [
    '.btn {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  gap: 8px;',
    '  padding: 8px 16px;',
    '  margin: 0 auto;',
    '  background-color: #3b82f6;',
    '  color: #fff;',
    '  font-size: 14px;',
    '  font-weight: 600;',
    '  border: 1px solid #e5e7eb;',
    '  border-radius: 6px;',
    '  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);',
    '  transition-duration: 150ms;',
    '  mask-image: none;',
    '}',
    '.btn:hover { background-color: #2563eb; }',
    '.btn:focus-visible { outline-color: rgb(59 130 246 / 50%); }',
    '@media (min-width: 768px) {',
    '  .btn { padding: 12px 24px; }',
    '}',
    '@keyframes spin { to { transform: rotate(360deg); } }'
  ].join('\n');

  Tools.register({
    id: 'css-to-tailwind', category: 'css', name: 'CSS to Tailwind Converter',
    description: 'Turn CSS rules or declarations into Tailwind v4 utility classes, with :hover and breakpoint variants, palette colour matching, a per-declaration mapping table and a list of anything that could not be converted.',
    keywords: ['css to tailwind', 'tailwind', 'tailwindcss', 'convert', 'converter', 'utility classes', 'utilities', 'migrate', 'v4', 'classes',
      'arbitrary values', 'breakpoints', 'hover', 'css', 'transform css'],
    render: function (root) {
      root.classList.add('g-cssb');
      var ctx = { colours: 'near', threshold: 3, palette: null };
      var input = el('textarea', { spellcheck: false, value: CSS_SAMPLE, 'aria-label': 'CSS to convert' });
      var colourChips = U.chips([{ value: 'near', label: 'Nearest palette colour' }, { value: 'exact', label: 'Exact palette matches only' }, { value: 'arbitrary', label: 'Always arbitrary' }],
        function (v) { ctx.colours = v; run(); }, 'near');
      var threshold = el('input', { type: 'number', min: 0, max: 20, step: 0.5, value: 3, dataset: { k: 'threshold' } });
      threshold.addEventListener('input', function () { var t = parseFloat(threshold.value); if (!isNaN(t)) { ctx.threshold = t; run(); } });
      var outBoxEl = el('div', { class: 'tw-out' });
      var tableBox = el('div', { class: 'scroll', style: { overflowX: 'auto' } });
      var failList = el('ul', { dataset: { k: 'failed' } });
      var status = el('p', { class: 'note' });
      var results = [];

      function run() {
        var parsed = readCss(input.value), groups = [], byKey = {}, rows = [], fails = [];
        parsed.skipped.forEach(function (s) { fails.push(s.what + ' — ' + s.why); });
        parsed.rules.forEach(function (rule) {
          var sp = selectorParts(rule.selector), variants = [], mediaOk = true;
          rule.media.forEach(function (m) { var mv = mediaVariants(m); if (!mv) mediaOk = false; else variants = variants.concat(mv); });
          var where = rule.selector + (rule.media.length ? ' @' + rule.media.map(function (m) { return m.type + ' ' + m.cond; }).join(' @') : '');
          if (!mediaOk) {
            fails.push(where + ' — the media query has no Tailwind variant');
            return;
          }
          variants = variants.concat(sp.variants);
          var g = byKey[sp.base];
          if (!g) { g = byKey[sp.base] = { selector: sp.base, base: [], variant: [] }; groups.push(g); }
          rule.decls.forEach(function (d) {
            if (d.bad) { fails.push(where + ': "' + d.bad + '" — not a declaration'); return; }
            var decl = d.prop + ': ' + d.value + (d.important ? ' !important' : '');
            var valid = !window.CSS || !CSS.supports || /^--/.test(d.prop) || CSS.supports(d.prop, d.value);
            if (!valid) { fails.push(where + ': ' + decl + ' — not valid CSS in this browser'); rows.push([where, decl, '—', 'not converted']); return; }
            var r = null;
            try { r = convertDecl(d.prop, d.value, ctx); } catch (err) { r = null; }
            if (!r || !r.cls || !r.cls.length) {
              r = { cls: ['[' + d.prop + ':' + d.value.trim().replace(/_/g, '\\_').replace(/\s+/g, '_') + ']'], note: 'arbitrary property' };
            }
            var prefix = variants.length ? variants.join(':') + ':' : '';
            var cls = r.cls.map(function (c) { return prefix + c + (d.important ? '!' : ''); });
            (variants.length ? g.variant : g.base).push.apply(variants.length ? g.variant : g.base, cls);
            rows.push([where, decl, cls.join(' '), r.note || '']);
          });
        });
        results = groups.map(function (g) {
          var seen = {}, list = g.base.concat(g.variant).filter(function (c) { if (seen[c]) return false; seen[c] = true; return true; });
          return { selector: g.selector, classes: list.join(' ') };
        }).filter(function (r) { return r.classes; });
        outBoxEl.replaceChildren.apply(outBoxEl, results.length ? results.map(function (r) {
          return el('div', { dataset: { selector: r.selector } }, el('b', { text: r.selector }), el('code', { text: r.classes, dataset: { k: 'classes' } }),
            el('div', { class: 'btnrow', style: { marginTop: '6px' } }, U.copyBtn('Copy classes', r.classes), U.copyBtn('Copy as class=""', 'class="' + r.classes + '"')));
        }) : [U.note('Nothing to convert yet.')]);
        tableBox.replaceChildren(rows.length ? U.table(['Selector', 'CSS', 'Tailwind', 'Note'], rows.map(function (r) {
          return [r[0], r[1], el('code', { class: 'mono', text: r[2] }), el('span', { class: 'note', text: r[3] })];
        })) : U.note('No declarations found.'));
        failList.replaceChildren.apply(failList, fails.length ? fails.map(function (f) { return el('li', { text: f }); }) : [el('li', { class: 'note', text: 'Everything was converted.' })]);
        failList.dataset.count = String(fails.length);
        status.textContent = rows.length + ' declaration' + (rows.length === 1 ? '' : 's') + ' in ' + results.length + ' selector' + (results.length === 1 ? '' : 's') + (ctx.palette ? '' : ' (colour palette still loading)');
      }

      input.addEventListener('input', U.debounce(run, 200));
      root.appendChild(U.panel('CSS', input, U.row(el('div', { class: 'field grow' }, el('label', { text: 'Colours' }), colourChips),
        U.field('Nearest-match limit (ΔE OK)', threshold)),
        U.note('Paste whole rules (with @media and :hover) or just declarations. The output targets Tailwind v4 with its default theme and a 16px root.')));
      root.appendChild(U.panel('Tailwind classes', status, outBoxEl));
      root.appendChild(U.panel('Mapping', tableBox));
      root.appendChild(U.panel('Not converted', failList, U.note('At-rules such as @keyframes and @font-face stay in your CSS (in v4, inside @theme or a plain stylesheet).')));
      run();
      loadPalette().then(function (p) { ctx.palette = p; run(); }).catch(function (err) {
        status.textContent = 'Palette colours unavailable (' + err.message + '); colours are kept as arbitrary values.';
      });
      root.convert = function (css) { input.value = css; run(); return results; };
    }
  });
})();
