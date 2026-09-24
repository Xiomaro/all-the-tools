/* finance tools: loans, mortgages, compound interest and savings goals, tips,
   discounts, ROI, inflation, VAT, margins, unit prices, UK take-home pay and
   bill splitting (plus the BMI and calorie calculators). Everything is in
   pounds sterling. The shared helpers and the small SVG charts are exported
   as window.FinKit for finance-b.js, which loads straight after this file. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-fin-style')) {
    document.head.appendChild(el('style', { id: 'g-fin-style', text: [
      /* Chart series colours: a fixed, colour-blind-checked order (blue,
         orange, aqua, yellow, magenta), stepped separately for dark mode. */
      '.g-fin{--fn-s1:#2a78d6;--fn-s2:#eb6834;--fn-s3:#1baf7a;--fn-s4:#eda100;--fn-s5:#e87ba4}',
      '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .g-fin{--fn-s1:#3987e5;--fn-s2:#d95926;--fn-s3:#199e70;--fn-s4:#c98500;--fn-s5:#d55181}}',
      ':root[data-theme="dark"] .g-fin{--fn-s1:#3987e5;--fn-s2:#d95926;--fn-s3:#199e70;--fn-s4:#c98500;--fn-s5:#d55181}',
      '.g-fin [hidden]{display:none !important}',
      '.g-fin .row>.field{flex:1 1 150px;min-width:0}',
      '.g-fin select{max-width:100%;text-overflow:ellipsis}',
      '.g-fin .btn{white-space:normal;max-width:100%}',
      '.g-fin .fn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}',
      '.g-fin .fn-card{background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px;min-width:0}',
      '.g-fin .fn-card span{display:block;color:var(--fg-muted);font-size:.85rem}',
      '.g-fin .fn-card b{display:block;font-family:var(--mono);font-size:1.25rem;word-break:break-word}',
      '.g-fin .fn-card.hi{border-color:var(--accent)}',
      '.g-fin .fn-slider{margin-bottom:14px}',
      '.g-fin .fn-slider .fn-top{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}',
      '.g-fin .fn-slider .fn-top label{font-weight:600;font-size:14px}',
      '.g-fin .fn-num{display:inline-flex;align-items:center;gap:4px;font-family:var(--mono)}',
      '.g-fin .fn-num input{width:8.5em;padding:4px 8px;text-align:right;font-family:var(--mono)}',
      '.g-fin .fn-slider input[type=range]{width:100%}',
      '.g-fin .fn-slider .fn-ends{display:flex;justify-content:space-between;color:var(--fg-muted);font-size:.8rem}',
      '.g-fin .fn-muted{color:var(--fg-muted);font-size:.9rem}',
      '.g-fin .fn-big{font-size:2rem;font-weight:700;font-family:var(--mono);word-break:break-word}',
      '.g-fin .fn-bar{display:flex;align-items:center;gap:8px;margin:4px 0}',
      '.g-fin .fn-bar i{display:block;height:14px;background:var(--accent);border-radius:4px}',
      '.g-fin .fn-bar span{font-family:var(--mono);font-size:.85rem;min-width:60px}',
      '.g-fin .fn-scale{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px}',
      '.g-fin .fn-scale div{border:1px solid var(--border);border-radius:var(--radius);padding:8px;text-align:center;font-size:.85rem}',
      '.g-fin .fn-scale div.on{border-color:var(--accent);background:var(--bg-sunken);font-weight:700}',
      '.g-fin .fn-item{border:1px solid var(--border);border-radius:var(--radius);padding:10px;margin-bottom:10px}',
      '.g-fin .fn-item-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}',
      '.g-fin .fn-rank{border:1px solid var(--border);border-radius:var(--radius);padding:10px;margin-bottom:8px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}',
      '.g-fin .fn-rank.best{border-color:var(--ok)}',
      '.g-fin .fn-badge{background:var(--ok);color:var(--bg);border-radius:10px;padding:1px 8px;font-size:.75rem;margin-left:6px}',
      '.g-fin .fn-rates{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}',
      '.g-fin .fn-rates button{justify-content:space-between;display:flex;gap:6px;white-space:normal;text-align:left;min-width:0}',
      '.g-fin .fn-tabs{margin-bottom:12px}',
      '.g-fin .fn-prefix{display:flex;align-items:center;gap:6px}',
      '.g-fin .fn-prefix input{flex:1;min-width:0}',
      '.g-fin .fn-scroll{overflow-x:auto;max-width:100%}',
      '.g-fin .fn-scroll.tall{max-height:440px;overflow-y:auto}',
      '.g-fin .fn-scroll table.data th{position:sticky;top:0;background:var(--bg-elev)}',
      '.g-fin .fn-src{font-size:12px;color:var(--fg-muted);margin-top:8px}',
      '.g-fin .fn-src a{color:inherit}',
      /* charts */
      '.g-fin .fn-chart{margin:0;position:relative;min-width:0}',
      '.g-fin .fn-plot{position:relative;width:100%;min-width:0}',
      '.g-fin .fn-plot svg{display:block;overflow:visible;touch-action:pan-y}',
      '.g-fin .fn-plot svg:focus{outline:2px solid var(--accent);outline-offset:2px}',
      '.g-fin .fn-gl{stroke:var(--border);stroke-width:1}',
      '.g-fin .fn-base{stroke:var(--fg-muted);stroke-width:1;opacity:.6}',
      '.g-fin .fn-ax{fill:var(--fg-muted);font-size:11px;font-family:var(--sans);font-variant-numeric:tabular-nums}',
      '.g-fin .fn-ln{fill:none;stroke-width:2;stroke-linejoin:round;stroke-linecap:round}',
      '.g-fin .fn-cross{stroke:var(--fg-muted);stroke-width:1}',
      '.g-fin .fn-dot{stroke:var(--bg-elev);stroke-width:2}',
      '.g-fin .fn-mk{fill:var(--fg);stroke:var(--bg-elev);stroke-width:2}',
      '.g-fin .fn-mk-t{fill:var(--fg);font-size:11.5px;font-weight:600;font-family:var(--sans)}',
      '.g-fin .fn-tip{position:absolute;z-index:3;pointer-events:none;background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--radius-s);box-shadow:var(--shadow);padding:6px 9px;font-size:12px;min-width:120px;max-width:260px}',
      '.g-fin .fn-tip-h{color:var(--fg-muted);margin-bottom:3px}',
      '.g-fin .fn-tip-r{display:flex;align-items:center;gap:6px;white-space:nowrap}',
      '.g-fin .fn-tip-r i{display:inline-block;width:12px;height:2px;border-radius:1px;flex:none}',
      '.g-fin .fn-tip-r b{font-variant-numeric:tabular-nums}',
      '.g-fin .fn-tip-r span{color:var(--fg-muted)}',
      '.g-fin .fn-legend{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12.5px;color:var(--fg-muted);margin:0 0 6px}',
      '.g-fin .fn-legend span{display:inline-flex;align-items:center;gap:6px}',
      '.g-fin .fn-legend i{display:inline-block;width:14px;height:2px;border-radius:1px}',
      '.g-fin .fn-legend i.box{height:10px;width:10px;border-radius:2px}',
      '.g-fin .fn-brow{display:grid;grid-template-columns:minmax(64px,max-content) minmax(0,1fr);gap:4px 10px;align-items:center;margin:6px 0}',
      '.g-fin .fn-blabel{font-size:13px;color:var(--fg-muted);overflow-wrap:anywhere}',
      '.g-fin .fn-bars{display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.g-fin .fn-bline{display:flex;align-items:center;gap:6px;min-width:0}',
      '.g-fin .fn-bline i{display:block;height:14px;border-radius:0 4px 4px 0;min-width:2px;flex:none;cursor:default}',
      '.g-fin .fn-bline i:hover,.g-fin .fn-bline i:focus{filter:brightness(1.15);outline:2px solid var(--fg-muted);outline-offset:1px}',
      '.g-fin .fn-bline span{font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap}'
    ].join('\n') }));
  }

  /* ---- helpers ------------------------------------------------------------ */
  var gbp0 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
  var gbp2 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var num2 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });
  /* The currency money0, money2 and sym() use. Pounds unless the tool being
     shown opened with prep(root, true), which switches to the visitor's
     regional currency (see assets/js/region.js). */
  var cur = { f0: gbp0, f2: gbp2, sym: '£' };
  function useCurrency(regional) {
    var r = regional && window.Region ? Region.get() : null;
    if (!r || r.currency === 'GBP') { cur = { f0: gbp0, f2: gbp2, sym: '£' }; return; }
    var digits = new Intl.NumberFormat(r.locale, { style: 'currency', currency: r.currency }).resolvedOptions().maximumFractionDigits;
    cur = {
      f0: new Intl.NumberFormat(r.locale, { style: 'currency', currency: r.currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      f2: new Intl.NumberFormat(r.locale, { style: 'currency', currency: r.currency, minimumFractionDigits: digits, maximumFractionDigits: digits }),
      sym: Region.symbol(r.currency)
    };
  }
  function sym() { return cur.sym; }
  function money0(n) { return isFinite(n) ? cur.f0.format(n) : '—'; }
  function money2(n) { return isFinite(n) ? cur.f2.format(n) : '—'; }
  function pct(n, d) { return isFinite(n) ? n.toFixed(d === undefined ? 1 : d) + '%' : '—'; }
  function pctShow(v) { return +(+v).toFixed(2) + '%'; }
  function yrs(v) { return v + (v === 1 ? ' yr' : ' yrs'); }
  function val(w) {
    var s = String((w.input || w).value).trim().replace(/,/g, '');
    if (s === '') return NaN;
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }
  function numIn(label, value, attrs, prefix) {
    var input = el('input', Object.assign({ type: 'number', step: 'any' }, attrs || {}));
    input.value = String(value);
    var inner = prefix ? el('div', { class: 'fn-prefix' }, prefix.before ? el('span', { text: prefix.before }) : null, input, prefix.after ? el('span', { text: prefix.after }) : null) : input;
    var wrap = U.field(label, inner);
    wrap.input = input;
    return wrap;
  }
  function textIn(label, value, attrs, prefix) {
    var input = el('input', Object.assign({ type: 'text', inputMode: 'decimal' }, attrs || {}));
    input.value = String(value);
    var inner = prefix ? el('div', { class: 'fn-prefix' }, el('span', { text: prefix }), input) : input;
    var wrap = U.field(label, inner);
    wrap.input = input;
    return wrap;
  }
  /* A range slider paired with a number box: drag for a rough value or type
     an exact one (typing may go past the slider's range). `wrap.input` is the
     range, so U.live hears both; read the value with wrap.get(). */
  function slider(label, min, max, step, value, show, unit) {
    var range = el('input', { type: 'range', min: min, max: max, step: step, 'aria-label': label });
    var box = el('input', { type: 'number', min: min, step: 'any', inputMode: 'decimal', 'aria-label': label });
    range.value = String(value);
    box.value = String(value);
    var fromBox = false;
    var wrap = el('div', { class: 'fn-slider' },
      el('div', { class: 'fn-top' }, el('label', { text: label }),
        el('span', { class: 'fn-num' }, unit && unit.before ? el('span', { text: unit.before }) : null, box, unit && unit.after ? el('span', { text: unit.after }) : null)),
      range,
      el('div', { class: 'fn-ends' }, el('span', { text: show(min) }), el('span', { text: show(max) })));
    range.addEventListener('input', function () { if (!fromBox) box.value = range.value; });
    box.addEventListener('input', function () {
      var v = Number(box.value);
      if (box.value === '' || !isFinite(v)) return;
      range.value = String(Math.min(max, Math.max(min, v)));
      fromBox = true;
      range.dispatchEvent(new Event('input'));
      fromBox = false;
    });
    wrap.input = range;
    wrap.range = range;
    wrap.box = box;
    wrap.get = function () { var v = Number(box.value); return box.value !== '' && isFinite(v) ? v : Number(range.value); };
    wrap.set = function (v) { range.value = String(v); box.value = String(v); range.dispatchEvent(new Event('input')); };
    return wrap;
  }
  function card(label, value, key, hi) {
    return el('div', { class: 'fn-card' + (hi ? ' hi' : '') }, el('span', { text: label }), el('b', { text: value, dataset: key ? { k: key } : undefined }));
  }
  function grid() { return el('div', { class: 'fn-grid' }, Array.prototype.slice.call(arguments)); }
  function tabs(options, onChange, initial) {
    var c = U.chips(options, onChange, initial);
    c.classList.add('fn-tabs');
    return c;
  }
  function prep(root, regional) { root.classList.add('g-fin'); useCurrency(regional); }
  /* Tables can be wide: give them their own horizontal scroll on a phone. */
  function scrollTable(headers, rows, tall) { return el('div', { class: 'fn-scroll' + (tall ? ' tall' : '') }, U.table(headers, rows)); }
  function source(text, url) {
    return el('p', { class: 'fn-src' }, text, url ? [' ', el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', text: url.replace(/^https:\/\/(www\.)?/, '') })] : null);
  }
  function selVal(field) { return field.querySelector('select').value; }

  /* Standard amortising payment. */
  function payment(principal, annualRate, months) {
    var i = annualRate / 100 / 12;
    if (months <= 0) return NaN;
    return i === 0 ? principal / months : principal * i / (1 - Math.pow(1 + i, -months));
  }
  function amortize(principal, annualRate, months, extra) {
    var i = annualRate / 100 / 12, pay = payment(principal, annualRate, months);
    var bal = principal, rows = [], totalInt = 0, totalPaid = 0, m = 0;
    while (bal > 0.005 && m < months * 2 + 12) {
      m++;
      var interest = bal * i;
      var due = Math.min(pay + (extra || 0), bal + interest);
      var principalPart = due - interest;
      bal -= principalPart;
      totalInt += interest; totalPaid += due;
      rows.push({ month: m, payment: due, principal: principalPart, interest: interest, balance: Math.max(0, bal) });
    }
    return { payment: pay, rows: rows, totalInterest: totalInt, totalPaid: totalPaid, months: m };
  }
  function yearsMonths(m) {
    var y = Math.floor(m / 12), r = m % 12;
    return (y ? y + (y === 1 ? ' year' : ' years') : '') + (y && r ? ' ' : '') + (r || !y ? r + (r === 1 ? ' month' : ' months') : '');
  }

  /* ---- charts ------------------------------------------------------------- */
  var NS = 'http://www.w3.org/2000/svg';
  function sv(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, String(attrs[k])); });
    if (parent) parent.appendChild(n);
    return n;
  }
  function niceStep(span, count) {
    var raw = span / Math.max(1, count), mag = Math.pow(10, Math.floor(Math.log10(raw || 1))), f = raw / mag;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  }
  /* Axis labels: £12k, £1.5m (in the tool's currency). */
  function gbpShort(n) {
    var a = Math.abs(n), s = (n < 0 ? '−' : '') + cur.sym;
    if (a >= 1e6) return s + +(a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'm';
    if (a >= 1e3) return s + +(a / 1e3).toFixed(a >= 1e4 ? 0 : 1) + 'k';
    return s + +a.toFixed(a < 10 && a % 1 ? 1 : 0);
  }
  function legend(series, box) {
    return el('div', { class: 'fn-legend' }, series.map(function (s, k) {
      return el('span', null, el('i', { class: box ? 'box' : '', style: { background: 'var(--fn-s' + (s.slot || k + 1) + ')' } }), s.name);
    }));
  }

  /* A line chart drawn at the container's real width (so the text stays
     legible on a phone) and redrawn when that width changes. A crosshair
     follows the pointer (or the arrow keys) and the tooltip lists every
     series at that point. Call .update(opts) with
       { series: [{ name, values, slot }], x: [numbers], xFormat(x), tipTitle(x),
         yFormat(v), tipFormat(v), markers: [{ x, y, label }], height, label }.
     A series keeps its colour slot whatever else is shown. */
  function lineChart(root) {
    var legendBox = el('div');
    var plot = el('div', { class: 'fn-plot' });
    var tip = el('div', { class: 'fn-tip', 'aria-hidden': 'true' });
    tip.hidden = true;
    var wrap = el('figure', { class: 'fn-chart' }, legendBox, plot);
    var opts = null, drawnWidth = 0;

    function draw() {
      if (!opts || !opts.x || opts.x.length < 2) { plot.replaceChildren(); legendBox.replaceChildren(); return; }
      var W = plot.clientWidth || 600, H = opts.height || 240;
      drawnWidth = plot.clientWidth;
      var series = opts.series, xs = opts.x, n = xs.length;
      var vals = [];
      series.forEach(function (s) { s.values.forEach(function (v) { if (isFinite(v)) vals.push(v); }); });
      (opts.markers || []).forEach(function (m) { if (isFinite(m.y)) vals.push(m.y); });
      var lo = Math.min(0, Math.min.apply(null, vals)), hi = Math.max(0, Math.max.apply(null, vals));
      if (!(hi > lo)) hi = lo + 1;
      var step = niceStep(hi - lo, 4);
      lo = Math.floor(lo / step + 1e-9) * step;
      hi = Math.ceil(hi / step - 1e-9) * step;
      var yFmt = opts.yFormat || gbpShort, tipFmt = opts.tipFormat || money0, xFmt = opts.xFormat || String;
      var ticks = [];
      for (var t = lo; t <= hi + step / 2; t += step) ticks.push(Math.abs(t) < step / 1e6 ? 0 : t);
      var L = Math.max.apply(null, ticks.map(function (v) { return yFmt(v).length; })) * 6.6 + 12;
      var R = 14, T = 12, B = 26, pw = Math.max(60, W - L - R), ph = H - T - B;
      var x0 = xs[0], x1 = xs[n - 1] > x0 ? xs[n - 1] : x0 + 1;
      var X = function (v) { return L + (v - x0) / (x1 - x0) * pw; };
      var Y = function (v) { return T + (hi - v) / (hi - lo) * ph; };
      var svg = sv('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', tabindex: 0, 'aria-label': (opts.label || 'Chart') + '. Use the left and right arrow keys to read values.' });

      ticks.forEach(function (v) {
        sv('line', { class: v === 0 ? 'fn-base' : 'fn-gl', x1: L, x2: L + pw, y1: Y(v), y2: Y(v) }, svg);
        sv('text', { class: 'fn-ax', x: L - 6, y: Y(v) + 4, 'text-anchor': 'end' }, svg).textContent = yFmt(v);
      });
      /* x ticks at round steps, at most about one per 70px */
      var xStep = niceStep(x1 - x0, Math.max(2, Math.floor(pw / 70)));
      if (opts.xInteger && xStep < 1) xStep = 1;
      for (var xv = Math.ceil(x0 / xStep - 1e-9) * xStep; xv <= x1 + 1e-9; xv += xStep) {
        sv('text', { class: 'fn-ax', x: X(xv), y: T + ph + 17, 'text-anchor': 'middle' }, svg).textContent = xFmt(+xv.toFixed(6));
      }
      series.forEach(function (s, k) {
        var d = '', pen = false;
        s.values.forEach(function (v, i) {
          if (!isFinite(v)) { pen = false; return; }
          d += (pen ? 'L' : 'M') + X(xs[i]).toFixed(1) + ' ' + Y(v).toFixed(1);
          pen = true;
        });
        if (d) sv('path', { class: 'fn-ln', d: d, stroke: 'var(--fn-s' + (s.slot || k + 1) + ')' }, svg);
      });
      (opts.markers || []).forEach(function (m) {
        if (!isFinite(m.x) || !isFinite(m.y) || m.x < x0 || m.x > x1) return;
        var cx = X(m.x), cy = Y(m.y);
        sv('circle', { class: 'fn-mk', cx: cx, cy: cy, r: 5 }, svg);
        if (m.label) {
          var right = cx < L + pw * 0.6;
          sv('text', { class: 'fn-mk-t', x: cx + (right ? 9 : -9), y: Math.max(T + 10, cy - 9), 'text-anchor': right ? 'start' : 'end' }, svg).textContent = m.label;
        }
      });

      var cross = sv('line', { class: 'fn-cross', x1: -99, x2: -99, y1: T, y2: T + ph }, svg);
      var dots = series.map(function (s, k) { return sv('circle', { class: 'fn-dot', r: 4.5, cx: -99, cy: -99, fill: 'var(--fn-s' + (s.slot || k + 1) + ')' }, svg); });
      var hit = sv('rect', { x: L, y: T, width: pw, height: ph, fill: 'transparent' }, svg);
      var cur = -1;
      function show(i) {
        cur = i;
        var cx = X(xs[i]);
        cross.setAttribute('x1', cx); cross.setAttribute('x2', cx);
        series.forEach(function (s, k) {
          var v = s.values[i];
          dots[k].setAttribute('cx', isFinite(v) ? cx : -99);
          dots[k].setAttribute('cy', isFinite(v) ? Y(v) : -99);
        });
        tip.replaceChildren(el('div', { class: 'fn-tip-h', text: (opts.tipTitle || xFmt)(xs[i]) }),
          series.map(function (s, k) {
            var v = s.values[i];
            return el('div', { class: 'fn-tip-r' }, el('i', { style: { background: 'var(--fn-s' + (s.slot || k + 1) + ')' } }),
              el('b', { text: isFinite(v) ? tipFmt(v) : '—' }), el('span', { text: s.name }));
          }));
        tip.hidden = false;
        var tw = tip.offsetWidth, left = cx + 12;
        if (left + tw > W) left = cx - tw - 12;
        tip.style.left = Math.max(0, left) + 'px';
        tip.style.top = T + 'px';
      }
      function hide() { cur = -1; tip.hidden = true; cross.setAttribute('x1', -99); cross.setAttribute('x2', -99); dots.forEach(function (d) { d.setAttribute('cx', -99); }); }
      function nearest(px) {
        var best = 0, bd = Infinity;
        for (var i = 0; i < n; i++) { var dd = Math.abs(X(xs[i]) - px); if (dd < bd) { bd = dd; best = i; } }
        return best;
      }
      hit.addEventListener('pointermove', function (e) { show(nearest(e.clientX - svg.getBoundingClientRect().left)); });
      hit.addEventListener('pointerdown', function (e) { show(nearest(e.clientX - svg.getBoundingClientRect().left)); });
      hit.addEventListener('pointerleave', hide);
      svg.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        show(Math.max(0, Math.min(n - 1, (cur < 0 ? (e.key === 'ArrowRight' ? -1 : n) : cur) + (e.key === 'ArrowRight' ? 1 : -1))));
      });
      svg.addEventListener('blur', hide);

      legendBox.replaceChildren(series.length > 1 ? legend(series) : '');
      plot.replaceChildren(svg, tip);
    }

    wrap.update = function (o) { opts = o; draw(); };
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { if (opts && Math.abs(plot.clientWidth - drawnWidth) > 4) draw(); });
      ro.observe(plot);
      U.onTeardown(root, function () { ro.disconnect(); });
    }
    return wrap;
  }

  /* Horizontal bars, grouped when there is more than one series, with the
     value written at each bar's tip and repeated in a tooltip on hover or
     keyboard focus. .update({ categories, series: [{ name, values, slot }], format }) */
  function barChart() {
    var wrap = el('figure', { class: 'fn-chart' });
    wrap.update = function (o) {
      var fmt = o.format || money0, max = 0;
      o.series.forEach(function (s) { s.values.forEach(function (v) { if (v > max) max = v; }); });
      var tip = el('div', { class: 'fn-tip', 'aria-hidden': 'true' });
      tip.hidden = true;
      function show(bar, text) {
        tip.textContent = text;
        tip.hidden = false;
        var wr = wrap.getBoundingClientRect(), br = bar.getBoundingClientRect();
        tip.style.left = Math.max(0, Math.min(wr.width - tip.offsetWidth, br.right - wr.left + 8)) + 'px';
        tip.style.top = (br.top - wr.top - 4) + 'px';
      }
      var rows = o.categories.map(function (c, ci) {
        return el('div', { class: 'fn-brow' }, el('div', { class: 'fn-blabel', text: c }),
          el('div', { class: 'fn-bars' }, o.series.map(function (s, k) {
            var v = s.values[ci] || 0, share = max > 0 ? Math.max(0, v) / max : 0;
            var text = c + (o.series.length > 1 ? ' · ' + s.name : '') + ': ' + fmt(v);
            var bar = el('i', { tabIndex: 0, 'aria-label': text, style: { width: 'calc((100% - 6.5em) * ' + share.toFixed(4) + ')', background: 'var(--fn-s' + (s.slot || k + 1) + ')' } });
            bar.addEventListener('pointerenter', function () { show(bar, text); });
            bar.addEventListener('focus', function () { show(bar, text); });
            bar.addEventListener('pointerleave', function () { tip.hidden = true; });
            bar.addEventListener('blur', function () { tip.hidden = true; });
            return el('div', { class: 'fn-bline' }, bar, el('span', { text: fmt(v) }));
          })));
      });
      wrap.replaceChildren(o.series.length > 1 ? legend(o.series, true) : '', el('div', null, rows), tip);
    };
    return wrap;
  }

  /* ======================================================================= */
  /* Loan Calculator                                                         */
  /* ======================================================================= */
  Tools.register({
    id: 'loan-calculator', category: 'finance', name: 'Loan Calculator',
    description: 'Monthly repayment, total cost and total interest for a personal or car loan, with optional overpayments and a full repayment schedule.',
    keywords: ['loan', 'personal loan', 'car loan', 'interest', 'calculate', 'repayment', 'amortization', 'amortisation', 'overpayment', 'apr', 'borrowing'],
    render: function (root) {
      prep(root, true);
      var amount = slider('Loan amount', 500, 100000, 500, 10000, money0, { before: sym() });
      var rate = slider('Interest rate (a year)', 0, 30, 0.1, 6.5, pctShow, { after: '%' });
      var term = slider('Term', 1, 30, 1, 5, yrs, { after: 'yrs' });
      var extra = slider('Overpayment each month', 0, 2000, 10, 0, money0, { before: sym() });
      var board = el('div'), sched = el('div');
      var last = null;
      U.live([amount, rate, term, extra], function () {
        var P = amount.get(), r = rate.get(), n = Math.round(term.get() * 12), x = extra.get() || 0;
        if (!(P > 0) || !(n > 0) || !(r >= 0)) { board.replaceChildren(U.note('Enter an amount, a rate and a term', 'err')); sched.replaceChildren(); last = null; return; }
        var a = amortize(P, r, n, x);
        var base = amortize(P, r, n, 0);
        last = a;
        board.replaceChildren(grid(
          card('Monthly repayment', money2(a.payment + x), 'monthly', true),
          card('Total repaid', money0(a.totalPaid), 'total'),
          card('Total interest', money0(a.totalInterest), 'interest'),
          card('Interest share of total', pct(a.totalInterest / a.totalPaid * 100), 'intpct')));
        if (x > 0) {
          var saved = base.totalInterest - a.totalInterest, early = base.months - a.months;
          board.appendChild(U.note('Overpaying ' + money0(x) + ' a month clears the loan in ' + yearsMonths(a.months) + ' (' + early + ' months early) and saves ' +
            money0(saved) + ' in interest. Check your lender allows overpayments without a fee.', 'ok'));
        }
        var yearly = [];
        for (var y = 0; y * 12 < a.rows.length; y++) {
          var slice = a.rows.slice(y * 12, y * 12 + 12);
          yearly.push([y + 1, money2(slice.reduce(function (s, q) { return s + q.principal; }, 0)),
            money2(slice.reduce(function (s, q) { return s + q.interest; }, 0)), money2(slice[slice.length - 1].balance)]);
        }
        sched.replaceChildren(scrollTable(['Year', 'Capital repaid', 'Interest', 'Balance left'], yearly, true));
      });
      function csv() {
        if (!last) return '';
        return CSV.stringify([['Month', 'Payment', 'Capital', 'Interest', 'Balance']].concat(last.rows.map(function (q) {
          return [q.month, q.payment.toFixed(2), q.principal.toFixed(2), q.interest.toFixed(2), q.balance.toFixed(2)];
        })));
      }
      root.appendChild(U.panel(null, amount, rate, term, extra));
      root.appendChild(U.panel(null, board, U.note('The rate is treated as a yearly rate charged monthly. A lender’s APR also includes fees, so use the APR for a like-for-like comparison.')));
      root.appendChild(U.panel('Year by year', sched, U.btnrow(U.downloadBtn('Download full schedule (CSV)', 'loan-schedule.csv', csv, 'text/csv'))));
    }
  });

  /* ======================================================================= */
  /* Compound Interest (with the old Savings Calculator folded in)           */
  /* ======================================================================= */
  /* Month-by-month growth with deposits at the end of each month. The
     monthly factor matches the chosen compounding frequency, so yearly
     compounding at 5% still gives exactly 5% a year. */
  function monthlyFactor(rate, perYear) { return Math.pow(1 + rate / 100 / perYear, perYear / 12); }
  function grow(P, rate, years, monthly, perYear) {
    var g = monthlyFactor(rate, perYear), bal = P, paid = P, rows = [], months = Math.round(years * 12);
    for (var m = 1; m <= months; m++) {
      bal = bal * g + monthly;
      paid += monthly;
      if (m % 12 === 0 || m === months) rows.push({ year: m / 12, paid: paid, interest: bal - paid, balance: bal });
    }
    return { balance: bal, paid: paid, rows: rows };
  }
  Tools.register({
    id: 'compound-interest', category: 'finance', name: 'Compound Interest',
    description: 'Grow savings or an investment with compound interest and monthly deposits, see the year-by-year breakdown, or work out how much to save each month to reach a goal.',
    keywords: ['compound', 'interest', 'investment', 'growth', 'future value', 'savings', 'savings calculator', 'savings goal', 'deposit', 'regular saver', 'isa', 'aer', 'apy', 'target', 'save each month', 'goal'],
    render: function (root) {
      prep(root, true);
      var mode = tabs([{ value: 'grow', label: 'How much will I have?' }, { value: 'goal', label: 'Savings goal' }], function () { run(); }, 'grow');
      var P = slider('Starting amount', 0, 1000000, 100, 10000, money0, { before: sym() });
      var r = slider('Interest rate (AER or expected return)', 0, 20, 0.05, 8, pctShow, { after: '%' });
      var t = slider('Years', 1, 50, 1, 20, yrs, { after: 'yrs' });
      var c = slider('Monthly deposit', 0, 10000, 10, 100, money0, { before: sym() });
      var target = slider('Savings goal', 100, 2000000, 100, 50000, money0, { before: sym() });
      var goalBox = el('div', null, target);
      var freqs = { Yearly: 1, Quarterly: 4, Monthly: 12, Daily: 365 };
      var freq = tabs(['Yearly', 'Quarterly', 'Monthly', 'Daily'], function () { run(); }, 'Monthly');
      var board = el('div'), table = el('div');
      var chart = lineChart(root);
      var rows = [];
      function run() {
        var p = P.get() || 0, rate = r.get() || 0, years = Math.round(t.get()), m = c.get() || 0, per = freqs[freq.value];
        goalBox.hidden = mode.value !== 'goal';
        if (!(years >= 1) || years > 100) { board.replaceChildren(U.note('Years must be between 1 and 100', 'err')); return; }
        var monthly = m;
        if (mode.value === 'goal') {
          var G = target.get() || 0, g = monthlyFactor(rate, per), N = years * 12;
          var fromStart = p * Math.pow(g, N), factor = g === 1 ? N : (Math.pow(g, N) - 1) / (g - 1);
          var need = Math.max(0, (G - fromStart) / factor);
          /* When does the current monthly deposit get there? */
          var bal = p, month = 0;
          while (bal < G && month < 1200) { bal = bal * g + m; month++; }
          monthly = need;
          var reached = bal >= G ? (month === 0 ? 'Already there' : yearsMonths(month)) : 'Not within 100 years';
          var res = grow(p, rate, years, need, per);
          board.replaceChildren(grid(
            card('Save each month', money2(need), 'need', true),
            card('Paid in over ' + yrs(years), money0(res.paid), 'gpaid'),
            card('Interest earned', money0(res.balance - res.paid), 'ginterest'),
            card('With ' + money0(m) + ' a month you get there in', reached, 'reached')),
            need === 0 ? U.note('Your starting amount grows past the goal on its own.', 'ok') : null);
        }
        var out = grow(p, rate, years, monthly, per);
        rows = out.rows;
        if (mode.value === 'grow') {
          board.replaceChildren(grid(
            card('Final balance', money0(out.balance), 'fv', true),
            card('Total paid in', money0(out.paid), 'contrib'),
            card('Interest earned', money0(out.balance - out.paid), 'interest'),
            card('Growth on money paid in', out.paid > 0 ? pct((out.balance - out.paid) / out.paid * 100) : '—', 'roi')));
        }
        table.replaceChildren(scrollTable(['Year', 'Paid in', 'Interest earned', 'Balance'], rows.map(function (q) {
          return [q.year, money2(q.paid), money2(q.interest), money2(q.balance)];
        }), true));
        var xs = [0].concat(rows.map(function (q) { return q.year; }));
        chart.update({
          label: 'Balance and money paid in by year',
          x: xs, xInteger: true, xFormat: function (v) { return 'Yr ' + v; }, tipTitle: function (v) { return 'After ' + yrs(v); },
          series: [{ name: 'Balance', slot: 1, values: [p].concat(rows.map(function (q) { return q.balance; })) },
            { name: 'Paid in', slot: 2, values: [p].concat(rows.map(function (q) { return q.paid; })) }]
        });
      }
      U.live([P, r, t, c, target], run);
      function csv() {
        return rows.length ? CSV.stringify([['Year', 'Paid in', 'Interest earned', 'Balance']].concat(rows.map(function (q) {
          return [q.year, q.paid.toFixed(2), q.interest.toFixed(2), q.balance.toFixed(2)];
        }))) : '';
      }
      root.appendChild(U.panel(null, mode, P, r, t, c, goalBox, el('label', { class: 'fn-muted', text: 'Interest is added' }), freq,
        U.note('Deposits go in at the end of each month. Tax on interest (beyond your Personal Savings Allowance, or outside an ISA) is not taken off.')));
      root.appendChild(U.panel(null, board));
      root.appendChild(U.panel('Growth over time', chart));
      root.appendChild(U.panel('Year by year', table, U.btnrow(U.downloadBtn('Download breakdown (CSV)', 'savings-growth.csv', csv, 'text/csv'))));
    }
  });

  /* ======================================================================= */
  /* Tip Calculator                                                          */
  /* ======================================================================= */
  Tools.register({
    id: 'tip-calculator', category: 'finance', name: 'Tip Calculator',
    description: 'Work out the tip or service charge and split the bill between any number of people.',
    keywords: ['tip', 'restaurant', 'calculate', 'gratuity', 'split bill', 'service charge', 'tipping'],
    render: function (root) {
      prep(root, true);
      var bill = slider('Bill', 1, 500, 1, 50, money0, { before: sym() });
      var tip = slider('Tip', 0, 30, 0.5, 12.5, pctShow, { after: '%' });
      var presets = el('div', { class: 'btnrow' }, [10, 12.5, 15, 20].map(function (p) {
        return U.button(p + '%', function () { tip.set(p); }, 'ghost');
      }));
      var people = slider('People', 1, 20, 1, 2, String);
      var board = el('div');
      U.live([bill, tip, people], function () {
        var b = bill.get(), tp = tip.get(), n = Math.max(1, Math.round(people.get()));
        if (!(b >= 0) || !(tp >= 0)) { board.replaceChildren(U.note('Enter the bill and a tip percentage', 'err')); return; }
        var t = b * tp / 100, total = b + t;
        board.replaceChildren(grid(
          card('Each person pays', money2(total / n), 'per', true),
          card('Tip', money2(t), 'tip'),
          card('Total with tip', money2(total), 'total'),
          card('Tip per person', money2(t / n), 'tipper')));
      });
      root.appendChild(U.panel(null, bill, tip, presets, el('div', { style: { height: '10px' } }), people,
        U.note('Many UK restaurants add a discretionary 12.5% service charge to the bill: check before tipping on top.')));
      root.appendChild(U.panel(null, board));
    }
  });

  /* ======================================================================= */
  /* Discount Calculator                                                     */
  /* ======================================================================= */
  Tools.register({
    id: 'discount-calculator', category: 'finance', name: 'Discount Calculator',
    description: 'Sale price and savings from a percentage off, or the discount percentage from two prices.',
    keywords: ['discount', 'sale', 'percent off', 'savings', 'price', 'money off', 'reduction'],
    render: function (root) {
      prep(root, true);
      var box = el('div');
      var mode = tabs(['% Off', 'Find % Discount'], function (v) { show(v); }, '% Off');

      var orig = numIn('Original price', 100, { min: 0 }, { before: sym() });
      var disc = numIn('Discount', 20, { min: 0, max: 100 }, { after: '%' });
      var extra = numIn('Extra discount (stacked, optional)', 0, { min: 0, max: 100 }, { after: '%' });
      var aBoard = el('div');
      U.live([orig, disc, extra], function () {
        var o = val(orig), d = val(disc), e = val(extra) || 0;
        if (isNaN(o) || isNaN(d)) { aBoard.replaceChildren(U.note('Enter a price and a discount', 'err')); return; }
        var final = o * (1 - d / 100) * (1 - e / 100);
        aBoard.replaceChildren(grid(card('Original', money2(o), 'orig'), card('You save', money2(o - final), 'save'), card('Final price', money2(final), 'final', true)));
        if (e) aBoard.appendChild(U.note('Stacked ' + d + '% + ' + e + '% = ' + pct((1 - final / o) * 100, 2) + ' total discount'));
      });
      var presets = el('div', { class: 'btnrow' }, [10, 15, 20, 25, 30, 50, 70].map(function (p) {
        return U.button(p + '% off', function () { disc.input.value = String(p); disc.input.dispatchEvent(new Event('input')); }, 'ghost');
      }));
      var paneA = el('div', null, U.row(orig, disc, extra), aBoard, presets);

      var o2 = numIn('Original price', 100, { min: 0 }, { before: sym() });
      var sale = numIn('Sale price', 75, { min: 0 }, { before: sym() });
      var bBoard = el('div');
      U.live([o2, sale], function () {
        var o = val(o2), s = val(sale);
        if (isNaN(o) || isNaN(s) || o === 0) { bBoard.replaceChildren(U.note('Enter both prices (the original must not be 0)', 'err')); return; }
        bBoard.replaceChildren(grid(card('Discount', pct((o - s) / o * 100), 'pct', true), card('You save', money2(o - s), 'save2')));
      });
      var paneB = el('div', null, U.row(o2, sale), bBoard);
      function show(v) { box.replaceChildren(v === '% Off' ? paneA : paneB); }
      show('% Off');
      root.appendChild(U.panel(null, mode, box));
    }
  });

  /* ======================================================================= */
  /* ROI Calculator                                                          */
  /* ======================================================================= */
  Tools.register({
    id: 'roi-calculator', category: 'finance', name: 'ROI Calculator',
    description: 'Return on investment with annualised ROI, or marketing ROI and ROAS.',
    keywords: ['roi', 'return on investment', 'roas', 'marketing', 'cagr', 'profit', 'annualised return', 'annualized'],
    render: function (root) {
      prep(root, true);
      var box = el('div');
      var mode = tabs(['Basic ROI', 'Marketing ROI'], function (v) { show(v); }, 'Basic ROI');

      var inv = textIn('Amount invested', '10000', null, sym()), fin = textIn('Final value or return', '15000', null, sym());
      var years = numIn('Time period (years)', 3, { min: 0 });
      var aBoard = el('div');
      U.live([inv, fin, years], function () {
        var i = val(inv), f = val(fin), y = val(years);
        if (isNaN(i) || isNaN(f) || i === 0) { aBoard.replaceChildren(U.note('Enter an investment (not 0) and a final value', 'err')); return; }
        var profit = f - i, roi = profit / i * 100;
        var annual = y > 0 && f / i > 0 ? (Math.pow(f / i, 1 / y) - 1) * 100 : NaN;
        aBoard.replaceChildren(grid(
          card('Net profit', money0(profit), 'profit'), card('ROI', pct(roi, 2), 'roi', true),
          card('Annualised ROI', pct(annual, 2), 'annual'), card('Multiplier', (f / i).toFixed(2) + '×', 'mult')));
      });
      var paneA = el('div', null, U.row(inv, fin, years), aBoard);

      var rev = textIn('Revenue generated', '50000', null, sym()), cost = textIn('Marketing cost', '10000', null, sym());
      var bBoard = el('div');
      U.live([rev, cost], function () {
        var r = val(rev), c = val(cost);
        if (isNaN(r) || isNaN(c) || c === 0) { bBoard.replaceChildren(U.note('Enter revenue and a cost that is not 0', 'err')); return; }
        bBoard.replaceChildren(grid(
          card('Marketing ROI', pct((r - c) / c * 100), 'mroi', true), card('ROAS', (r / c).toFixed(2) + '×', 'roas'),
          card('Net revenue', money2(r - c), 'net'), card('Break-even revenue', money2(c), 'be')));
      });
      var paneB = el('div', null, U.row(rev, cost), bBoard);
      function show(v) { box.replaceChildren(v === 'Basic ROI' ? paneA : paneB); }
      show('Basic ROI');
      root.appendChild(U.panel(null, mode, box));
    }
  });

  /* ======================================================================= */
  /* BMI Calculator                                                          */
  /* ======================================================================= */
  function bmiCategory(b) {
    return b < 18.5 ? 'Underweight' : b < 25 ? 'Healthy weight' : b < 30 ? 'Overweight' : 'Obese';
  }
  Tools.register({
    id: 'bmi-calculator', category: 'health', name: 'BMI Calculator',
    description: 'Body Mass Index from weight and height, in kilograms and centimetres or stones, pounds, feet and inches.',
    keywords: ['bmi', 'health', 'body', 'weight', 'height', 'body mass index', 'stones', 'pounds', 'kg'],
    render: function (root) {
      prep(root);
      var box = el('div');
      var start = window.Region && Region.imperial() ? 'Imperial' : 'Metric';
      var mode = tabs(['Metric', 'Imperial'], function (v) { show(v); }, start);
      var kg = slider('Weight', 30, 200, 0.5, 70, function (v) { return v + ' kg'; }, { after: 'kg' });
      var cm = slider('Height', 100, 250, 1, 175, function (v) { return v + ' cm'; }, { after: 'cm' });
      var st = slider('Weight (stone)', 4, 30, 1, 11, function (v) { return v + ' st'; }, { after: 'st' });
      var lb = slider('and pounds', 0, 13, 0.5, 0, function (v) { return v + ' lb'; }, { after: 'lb' });
      var ft = slider('Height (feet)', 3, 8, 1, 5, function (v) { return v + ' ft'; }, { after: 'ft' });
      var inch = slider('and inches', 0, 11.5, 0.5, 9, function (v) { return v + ' in'; }, { after: 'in' });
      var metric = el('div', null, kg, cm), imperial = el('div', null, st, lb, ft, inch);
      var big = el('div', { class: 'fn-big', dataset: { k: 'bmi' } }), cat = el('div', { class: 'fn-muted', dataset: { k: 'cat' } });
      var healthy = el('div', { class: 'fn-muted', dataset: { k: 'healthy' } });
      var scale = el('div', { class: 'fn-scale' });
      var bands = [['Underweight', 'under 18.5'], ['Healthy', '18.5 – 24.9'], ['Overweight', '25 – 29.9'], ['Obese', '30 or more']];
      function run() {
        var b, hM;
        if (mode.value === 'Metric') { hM = cm.get() / 100; b = kg.get() / (hM * hM); }
        else {
          hM = (ft.get() * 12 + inch.get()) * 0.0254;
          b = (st.get() * 14 + lb.get()) * 0.45359237 / (hM * hM);
        }
        if (!isFinite(b) || b <= 0) { big.textContent = '—'; cat.textContent = 'Enter your weight and height'; healthy.textContent = ''; return; }
        big.textContent = b.toFixed(1);
        cat.textContent = bmiCategory(b);
        var lo = 18.5 * hM * hM, hi = 24.9 * hM * hM;
        var stLb = function (k) { var p = k / 0.45359237, s = Math.floor(p / 14); return s + ' st ' + Math.round(p - s * 14) + ' lb'; };
        healthy.textContent = 'Healthy weight for this height: ' + (mode.value === 'Metric' ? lo.toFixed(1) + ' – ' + hi.toFixed(1) + ' kg' : stLb(lo) + ' – ' + stLb(hi));
        var idx = b < 18.5 ? 0 : b < 25 ? 1 : b < 30 ? 2 : 3;
        scale.replaceChildren.apply(scale, bands.map(function (x, i) {
          return el('div', { class: i === idx ? 'on' : '' }, el('div', { text: x[0] }), el('div', { text: x[1] }));
        }));
      }
      function show(v) { box.replaceChildren(v === 'Metric' ? metric : imperial); run(); }
      U.live([kg, cm, st, lb, ft, inch], run);
      show(start);
      root.appendChild(U.panel(null, mode, box));
      root.appendChild(U.panel('BMI', big, cat, healthy, el('h4', { text: 'BMI scale' }), scale,
        U.note('The NHS uses lower thresholds for some ethnic groups (overweight from 23, obese from 27.5), and BMI is not a good guide for children, pregnant women or very muscular people.')));
    }
  });

  /* ======================================================================= */
  /* Calorie Calculator                                                      */
  /* ======================================================================= */
  Tools.register({
    id: 'calorie-calculator', category: 'health', name: 'Calorie Calculator',
    description: 'BMR and daily calorie needs (TDEE) from your stats and activity, with weight goals.',
    keywords: ['calorie', 'tdee', 'bmr', 'diet', 'weight loss', 'mifflin', 'kcal', 'calories'],
    render: function (root) {
      prep(root);
      var age = numIn('Age', 30, { min: 1, max: 120 });
      var gender = U.select({ label: 'Sex', value: 'male', options: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }] });
      var imp = !!(window.Region && Region.imperial());
      var w = numIn(imp ? 'Weight (lb)' : 'Weight (kg)', imp ? 154 : 70, { min: 1 }), h = numIn(imp ? 'Height (inches)' : 'Height (cm)', imp ? 69 : 175, { min: 1 });
      var units = tabs([{ value: 'metric', label: 'kg and cm' }, { value: 'imperial', label: 'lb and inches' }], function (v) {
        if ((v === 'imperial') === imp) return;
        imp = v === 'imperial';
        var kgs = val(w), cms = val(h);
        if (!isNaN(kgs)) w.input.value = String(imp ? Math.round(kgs / 0.45359237) : Math.round(kgs * 0.45359237 * 10) / 10);
        if (!isNaN(cms)) h.input.value = String(imp ? Math.round(cms / 2.54) : Math.round(cms * 2.54));
        w.querySelector('label').textContent = imp ? 'Weight (lb)' : 'Weight (kg)';
        h.querySelector('label').textContent = imp ? 'Height (inches)' : 'Height (cm)';
        update();
      }, imp ? 'imperial' : 'metric');
      var act = U.select({ label: 'Activity level', value: '1.375', options: [
        { value: '1.2', label: 'Sedentary (little or no exercise)' }, { value: '1.375', label: 'Light (1–3 days a week)' },
        { value: '1.55', label: 'Moderate (3–5 days a week)' }, { value: '1.725', label: 'Active (6–7 days a week)' },
        { value: '1.9', label: 'Very active (hard exercise twice a day)' }] });
      var board = el('div');
      var update = U.live([age, gender, w, h, act], function () {
        var a = val(age), kgs = val(w) * (imp ? 0.45359237 : 1), cms = val(h) * (imp ? 2.54 : 1), g = gender.querySelector('select').value, f = +act.querySelector('select').value;
        if ([a, kgs, cms].some(isNaN) || kgs <= 0 || cms <= 0) { board.replaceChildren(U.note('Enter age, weight and height', 'err')); return; }
        var bmr = 10 * kgs + 6.25 * cms - 5 * a + (g === 'male' ? 5 : -161);
        var tdee = bmr * f;
        var goals = [['Lose about 1 kg (2 lb) a week', -1000], ['Lose about 0.5 kg (1 lb) a week', -500], ['Stay the same', 0], ['Gain about 0.5 kg (1 lb) a week', 500], ['Gain about 1 kg (2 lb) a week', 1000]];
        var bmi = kgs / Math.pow(cms / 100, 2);
        var cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy' : bmi < 30 ? 'Overweight' : 'Obese';
        board.replaceChildren(
          grid(card('BMR', Math.round(bmr) + ' kcal', 'bmr'), card('TDEE', Math.round(tdee) + ' kcal', 'tdee', true)),
          el('h4', { text: 'Calorie goals' }),
          U.table(['Goal', 'Calories'], goals.map(function (x) {
            var v = Math.round(tdee + x[1]);
            return [x[0], v + ' kcal a day' + (v < (g === 'male' ? 1500 : 1200) ? ' ⚠' : '')];
          })),
          el('p', { class: 'fn-muted' }, 'BMI: ', el('b', { text: bmi.toFixed(1) + ' (' + cat + ')', dataset: { k: 'bmi' } })),
          U.note('BMR uses the Mifflin-St Jeor equation. ⚠ marks intakes below common safe minimums.'));
      });
      root.appendChild(U.panel(null, units, U.row(age, gender), U.row(w, h), act));
      root.appendChild(U.panel(null, board));
    }
  });

  /* ======================================================================= */
  /* Inflation Calculator                                                    */
  /* ======================================================================= */
  Tools.register({
    id: 'inflation-calculator', category: 'finance', name: 'Inflation Calculator',
    description: 'See how a steady inflation rate changes prices and purchasing power between two years.',
    keywords: ['inflation', 'purchasing power', 'cpi', 'value of money', 'prices', 'cost of living', 'real terms'],
    render: function (root) {
      prep(root, true);
      var amt = numIn('Amount', 1000, { min: 0 }, { before: sym() });
      var y1 = numIn('Start year', 2016, { min: 1900, max: 2100, step: 1 }), y2 = numIn('End year', 2026, { min: 1900, max: 2100, step: 1 });
      var rate = numIn('Inflation a year', 3, {}, { after: '%' });
      var board = el('div');
      U.live([amt, y1, y2, rate], function () {
        var a = val(amt), s = Math.round(val(y1)), e = Math.round(val(y2)), r = val(rate);
        if ([a, s, e, r].some(isNaN)) { board.replaceChildren(U.note('Fill in every field', 'err')); return; }
        var years = e - s, f = Math.pow(1 + r / 100, years);
        board.replaceChildren(
          el('div', { class: 'fn-muted', text: money2(a) + ' in ' + s + ' is the same as' }),
          el('div', { class: 'fn-big', text: money2(a * f), dataset: { k: 'future' } }),
          el('div', { class: 'fn-muted', text: 'in ' + e + ' (what it would cost then)' }),
          grid(card('What ' + money0(a) + ' buys in ' + e + ', in ' + s + ' money', money2(a / f), 'power'), card('Total inflation', pct((f - 1) * 100), 'total')),
          U.note('Over ' + years + ' years at a steady ' + r + '% a year. The Bank of England’s target is 2%; for real past UK prices use the ONS consumer price index (CPI).'));
      });
      root.appendChild(U.panel(null, U.row(amt, y1, y2, rate)));
      root.appendChild(U.panel(null, board));
    }
  });

  /* ======================================================================= */
  /* VAT Calculator (with the old Tax Calculator's VAT/sales-tax mode)       */
  /* ======================================================================= */
  var UK_VAT = [['Standard rate', 20], ['Reduced rate', 5], ['Zero rate', 0]];
  var VAT_RATES = [['Ireland', 23], ['Germany', 19], ['France', 20], ['Italy', 22], ['Spain', 21], ['Netherlands', 21],
    ['Australia (GST)', 10], ['Canada (GST)', 5], ['New Zealand (GST)', 15], ['India (GST)', 18], ['Japan', 10], ['US sales tax (varies by state)', 7]];
  Tools.register({
    id: 'vat-calculator', category: 'finance', name: 'VAT Calculator',
    description: 'Add VAT to a net price or take it off a gross price, at the UK’s 20%, 5% or 0% rates, another country’s VAT or GST, or a US-style sales tax.',
    keywords: ['vat', 'add vat', 'remove vat', 'reverse vat', 'gst', 'sales tax', 'tax calculator', 'tax', 'net', 'gross', 'inclusive', 'exclusive', 'ex vat', 'inc vat', 'hmrc'],
    render: function (root) {
      prep(root);
      var mode = tabs([{ value: 'excl', label: 'Add VAT (price excl. VAT)' }, { value: 'incl', label: 'Remove VAT (price incl. VAT)' }], function () { run(); }, 'excl');
      var price = numIn('Price', 100, { min: 0 }, { before: '£' });
      var rate = numIn('VAT rate', 20, { min: 0 }, { after: '%' });
      var board = el('div');
      function setRate(v) { rate.input.value = String(v); run(); }
      function run() {
        var p = val(price), r = val(rate);
        if (isNaN(p) || isNaN(r) || r < 0) { board.replaceChildren(U.note('Enter a price and a rate', 'err')); return; }
        var net, gross;
        if (mode.value === 'excl') { net = p; gross = p * (1 + r / 100); } else { gross = p; net = p / (1 + r / 100); }
        board.replaceChildren(grid(card('Price excl. VAT', money2(net), 'net'), card('VAT', money2(gross - net), 'vat', true), card('Price incl. VAT', money2(gross), 'gross')),
          mode.value === 'incl' && r > 0 ? U.note('The VAT inside a VAT-inclusive price is ' + num2.format(r) + '/' + num2.format(100 + r) + ' of it' + (r === 20 ? ' (one sixth).' : '.')) : null);
      }
      U.live([price, rate], run);
      function rateButtons(list) {
        return el('div', { class: 'fn-rates' }, list.map(function (x) {
          return el('button', { class: 'btn ghost', type: 'button', onclick: function () { setRate(x[1]); } }, el('span', { text: x[0] }), el('b', { text: x[1] + '%' }));
        }));
      }
      root.appendChild(U.panel(null, mode, U.row(price, rate), rateButtons(UK_VAT), board));
      root.appendChild(U.panel('Other countries', rateButtons(VAT_RATES),
        U.note('UK: 20% standard, 5% reduced (for example home energy and children’s car seats), 0% zero-rated (most food, children’s clothes, books). Other rates are headline standard rates and do change; US sales tax depends on the state and city. Tap one to use it.'),
        el('p', { class: 'fn-muted' }, 'Working out income tax? Use ', el('a', { href: '#/t/uk-take-home-pay', text: 'UK Take-Home Pay' }), '.')));
    }
  });

  /* ======================================================================= */
  /* Mortgage Calculator                                                     */
  /* ======================================================================= */
  Tools.register({
    id: 'mortgage-calculator', category: 'finance', name: 'Mortgage Calculator',
    description: 'Monthly mortgage payment, loan-to-value, total interest and a repayment schedule, for repayment or interest-only mortgages.',
    keywords: ['mortgage', 'home loan', 'amortization', 'amortisation', 'repayment schedule', 'deposit', 'down payment', 'house', 'ltv', 'loan to value', 'interest only', 'overpayment', 'remortgage'],
    render: function (root) {
      prep(root, true);
      var price = numIn('Property price', 300000, { min: 0, step: 1000 }, { before: sym() });
      var down = numIn('Deposit', 60000, { min: 0, step: 1000 }, { before: sym() });
      var rate = numIn('Interest rate', 4.5, { min: 0, step: 0.05 }, { after: '%' }), years = numIn('Term (years)', 25, { min: 1, max: 40 });
      var extra = numIn('Overpayment each month (optional)', 0, { min: 0 }, { before: sym() });
      var kind = tabs([{ value: 'repay', label: 'Repayment' }, { value: 'io', label: 'Interest-only' }], function () { calc(); }, 'repay');
      var full = U.checkbox('Show every month in the schedule');
      var board = el('div');
      var last = null;
      function calc() {
        var p = val(price), d = val(down) || 0, r = val(rate), y = val(years), x = val(extra) || 0;
        if ([p, r, y].some(isNaN) || p <= 0 || y <= 0 || r < 0) { board.replaceChildren(U.note('Enter a property price, rate and term', 'err')); last = null; return; }
        var loan = p - d;
        if (loan <= 0) { board.replaceChildren(U.note('The deposit covers the whole price, so there is no mortgage to pay.', 'ok')); last = null; return; }
        var ltv = card('Loan-to-value (LTV)', pct(loan / p * 100), 'ltv');
        if (kind.value === 'io') {
          var monthlyInt = loan * r / 100 / 12;
          last = null;
          board.replaceChildren(grid(card('Monthly interest', money2(monthlyInt), 'monthly', true), card('Mortgage', money2(loan), 'loan'), ltv,
            card('Interest over ' + y + ' years', money2(monthlyInt * 12 * y), 'interest')),
            U.note('On interest-only you still owe the full ' + money0(loan) + ' at the end of the term, so you need a plan to repay it.'));
          return;
        }
        var a = amortize(loan, r, Math.round(y * 12), x);
        last = a;
        var rows = (full.input.checked ? a.rows : a.rows.slice(0, 24)).map(function (q) {
          return [q.month, money2(q.payment), money2(q.principal), money2(q.interest), money2(q.balance)];
        });
        board.replaceChildren(
          grid(card('Monthly payment', money2(a.payment + x), 'monthly', true), card('Mortgage', money2(loan), 'loan'), ltv,
            card('Total interest', money2(a.totalInterest), 'interest'), card('Total repaid', money2(a.totalPaid), 'paid')),
          x > 0 ? U.note('Paid off in ' + yearsMonths(a.months) + ' with the overpayment. Most fixed deals allow up to 10% a year without an early repayment charge.', 'ok') : null,
          el('h4', { text: full.input.checked ? 'Repayment schedule (all ' + a.rows.length + ' months)' : 'Repayment schedule (first 24 months)' }),
          scrollTable(['Month', 'Payment', 'Capital', 'Interest', 'Balance'], rows, true),
          U.btnrow(U.downloadBtn('Download schedule (CSV)', 'mortgage-schedule.csv', function () {
            return last ? CSV.stringify([['Month', 'Payment', 'Capital', 'Interest', 'Balance']].concat(last.rows.map(function (q) {
              return [q.month, q.payment.toFixed(2), q.principal.toFixed(2), q.interest.toFixed(2), q.balance.toFixed(2)];
            }))) : '';
          }, 'text/csv')));
      }
      U.live([price, down, rate, years, extra, full], calc);
      root.appendChild(U.panel(null, kind, U.row(price, down), U.row(rate, years, extra), full,
        U.note('Stamp duty, fees and insurance are not included; see the Stamp Duty and Rent vs Buy calculators.')));
      root.appendChild(U.panel(null, board));
    }
  });

  /* ======================================================================= */
  /* Profit Margin Calculator                                                */
  /* ======================================================================= */
  Tools.register({
    id: 'profit-margin', category: 'finance', name: 'Profit Margin Calculator',
    description: 'Gross profit, margin and markup from cost and price, and the price needed for a target margin.',
    keywords: ['profit', 'margin', 'markup', 'mark-up', 'pricing', 'gross profit', 'cost'],
    render: function (root) {
      prep(root, true);
      var cost = numIn('Cost', 80, { min: 0 }, { before: sym() }), price = numIn('Selling price', 120, { min: 0 }, { before: sym() });
      var target = numIn('Your own target margin', 35, { min: 0, max: 99.99 }, { after: '%' });
      var board = el('div');
      U.live([cost, price, target], function () {
        var c = val(cost), p = val(price), t = val(target);
        if (isNaN(c) || isNaN(p)) { board.replaceChildren(U.note('Enter a cost and a price', 'err')); return; }
        var profit = p - c;
        var targets = [20, 25, 30, 40, 50];
        if (!isNaN(t) && t > 0 && t < 100 && targets.indexOf(t) < 0) targets.push(t);
        targets.sort(function (a, b) { return a - b; });
        board.replaceChildren(
          grid(card('Profit', money2(profit), 'profit', true), card('Gross margin', p ? pct(profit / p * 100, 2) : '—', 'margin'),
            card('Markup', c ? pct(profit / c * 100, 2) : '—', 'markup'), card('Break-even price', money2(c), 'be')),
          el('h4', { text: 'Pricing for target margins' }),
          scrollTable(['Target margin', 'Price needed', 'Profit'], targets.map(function (m) {
            var rp = c / (1 - m / 100);
            return [+m.toFixed(2) + '%', money2(rp), money2(rp - c)];
          })),
          U.note('Margin = profit ÷ price × 100  |  Markup = profit ÷ cost × 100. Prices here are before VAT.'));
      });
      root.appendChild(U.panel(null, U.row(cost, price, target)));
      root.appendChild(U.panel(null, board));
    }
  });

  /* ======================================================================= */
  /* Unit Price Calculator                                                   */
  /* ======================================================================= */
  /* Shelf labels in the UK quote prices per 100 g / 100 ml or per kg / litre,
     so weights and volumes are brought to grams and millilitres first. */
  var UNIT_BASE = { g: ['g', 1], gram: ['g', 1], grams: ['g', 1], kg: ['g', 1000], kilo: ['g', 1000], ml: ['ml', 1], cl: ['ml', 10], l: ['ml', 1000], litre: ['ml', 1000], litres: ['ml', 1000], liter: ['ml', 1000] };
  function unitPrice(price, qty, unit) {
    var u = String(unit || '').trim().toLowerCase(), base = UNIT_BASE[u];
    if (!base) return { dim: u || 'item', per: price / qty, label: '/' + (u || 'item') };
    var per = price / (qty * base[1]);
    return { dim: base[0], per: per, per100: per * 100, perK: per * 1000, label: '/100 ' + base[0], big: '/' + (base[0] === 'g' ? 'kg' : 'litre') };
  }
  Tools.register({
    id: 'unit-price-calc', category: 'finance', name: 'Unit Price Calculator',
    description: 'Compare price per 100 g, per kg, per litre or per item across products to find the best value.',
    keywords: ['unit price', 'price per unit', 'price per kg', 'price per 100g', 'compare', 'best value', 'grocery', 'shopping', 'supermarket'],
    render: function (root) {
      prep(root, true);
      var list = el('div'), results = el('div');
      var items = [];
      function addItem(d) {
        var name = el('input', { type: 'text' }); name.value = d.name;
        var price = el('input', { type: 'number', step: 'any', min: 0 }); price.value = d.price;
        var qty = el('input', { type: 'number', step: 'any', min: 0 }); qty.value = d.qty;
        var unit = el('input', { type: 'text', list: 'fn-units' }); unit.value = d.unit;
        var title = el('b');
        var box = el('div', { class: 'fn-item' },
          el('div', { class: 'fn-item-head' }, title, U.button('Remove', function () {
            items = items.filter(function (x) { return x !== item; }); box.remove(); renumber(); run();
          }, 'ghost')),
          U.row(U.field('Name', name), U.field('Price (' + sym() + ')', price), U.field('Quantity', qty), U.field('Unit (g, kg, ml, l, each…)', unit)));
        var item = { box: box, name: name, price: price, qty: qty, unit: unit, title: title };
        [name, price, qty, unit].forEach(function (i) { i.addEventListener('input', run); });
        items.push(item);
        list.appendChild(box);
        renumber();
      }
      function renumber() { items.forEach(function (it, i) { it.title.textContent = 'Item ' + (i + 1); }); }
      function run() {
        results.replaceChildren();
        var valid = items.map(function (it, i) {
          var p = parseFloat(it.price.value), q = parseFloat(it.qty.value);
          var u = unitPrice(p, q, it.unit.value);
          return { name: it.name.value.trim() || 'Item ' + (i + 1), p: p, q: q, unit: it.unit.value.trim(), u: u };
        }).filter(function (x) { return isFinite(x.u.per) && x.q > 0 && x.p >= 0; });
        if (!valid.length) { results.appendChild(U.note('Add at least one item with a price and quantity')); return; }
        if (valid.some(function (v) { return v.u.dim !== valid[0].u.dim; })) results.appendChild(U.note('These items are measured in different ways (for example grams and millilitres), so the comparison may not be fair.', 'err'));
        valid.sort(function (a, b) { return a.u.per - b.u.per; });
        var best = valid[0].u.per;
        valid.forEach(function (v, i) {
          var diff = best > 0 ? (v.u.per - best) / best * 100 : 0;
          var main = v.u.per100 !== undefined ? money2(v.u.per100) + v.u.label : money2(v.u.per) + v.u.label;
          results.appendChild(el('div', { class: 'fn-rank' + (i === 0 ? ' best' : ''), dataset: { k: 'rank' + i } },
            el('div', null, el('b', { text: v.name }), i === 0 ? el('span', { class: 'fn-badge', text: 'Best value' }) : null,
              el('div', { class: 'fn-muted', text: money2(v.p) + ' for ' + num2.format(v.q) + ' ' + (v.unit || 'items') })),
            el('div', { style: { textAlign: 'right' } }, el('b', { class: 'mono', text: main }),
              v.u.perK !== undefined ? el('div', { class: 'fn-muted', text: money2(v.u.perK) + v.u.big }) : null,
              i > 0 ? el('div', { class: 'fn-muted', text: '+' + diff.toFixed(1) + '% more' }) : null)));
        });
      }
      [{ name: 'Brand A', price: '3.99', qty: '500', unit: 'g' }, { name: 'Brand B', price: '5.49', qty: '750', unit: 'g' },
       { name: 'Brand C', price: '1.89', qty: '250', unit: 'g' }].forEach(addItem);
      var units = el('datalist', { id: 'fn-units' }, ['g', 'kg', 'ml', 'cl', 'l', 'each', 'sheets', 'tablets', 'washes'].map(function (u) { return el('option', { value: u }); }));
      root.appendChild(U.panel(null, units, list, U.btnrow(U.button('+ Add item', function () {
        addItem({ name: '', price: '', qty: '', unit: items.length ? items[items.length - 1].unit.value : 'g' }); run();
      }, 'primary'))));
      root.appendChild(U.panel('Comparison', results));
      run();
    }
  });

  /* ======================================================================= */
  /* UK Take-Home Pay                                                        */
  /* ======================================================================= */

  /* Rates as published for each tax year. rUK = England, Wales and Northern
     Ireland. Bands are [upper limit of taxable income, rate]. */
  var UK_TAX = {
    '2026/27': {
      allowance: 12570, taperFrom: 100000,
      ruk: [[37700, 20], [112570, 40], [Infinity, 45]],
      scot: [[3967, 19], [16956, 20], [31092, 21], [62430, 42], [112570, 45], [Infinity, 48]],
      ni: { pt: 12570, uel: 50270, main: 8, upper: 2, employerThreshold: 5000, employer: 15 },
      loans: { 1: [26900, 9], 2: [29385, 9], 4: [33795, 9], 5: [25000, 9], pg: [21000, 6] },
      note: 'Rates for the 2026/27 tax year (6 April 2026 to 5 April 2027) as published in the Autumn Budget 2025 and the Scottish Budget 2026/27. Checked 21 September 2026.'
    },
    '2025/26': {
      allowance: 12570, taperFrom: 100000,
      ruk: [[37700, 20], [112570, 40], [Infinity, 45]],
      scot: [[2827, 19], [14921, 20], [31092, 21], [62430, 42], [112570, 45], [Infinity, 48]],
      ni: { pt: 12570, uel: 50270, main: 8, upper: 2, employerThreshold: 5000, employer: 15 },
      loans: { 1: [26065, 9], 2: [28470, 9], 4: [32745, 9], 5: [25000, 9], pg: [21000, 6] },
      note: 'Rates for the 2025/26 tax year (6 April 2025 to 5 April 2026).'
    }
  };
  function ukTakeHome(o) {
    var Y = UK_TAX[o.year], gross = Math.max(0, o.gross);
    var pensionAmt = gross * (o.pension || 0) / 100;
    var forTax = gross - (o.pensionType === 'none' ? 0 : pensionAmt);
    var forNi = gross - (o.pensionType === 'sacrifice' ? pensionAmt : 0);
    var allowance = Y.allowance;
    if (forTax > Y.taperFrom) allowance = Math.max(0, allowance - Math.floor((forTax - Y.taperFrom) / 2));
    if (o.blind) allowance += 3130;
    var taxable = Math.max(0, forTax - allowance), bands = o.scotland ? Y.scot : Y.ruk, tax = 0, lower = 0, rows = [];
    bands.forEach(function (b) {
      var upto = b[0], amount = Math.max(0, Math.min(taxable, upto) - lower);
      if (amount > 0) { rows.push({ rate: b[1], amount: amount, tax: amount * b[1] / 100 }); tax += amount * b[1] / 100; }
      lower = upto;
    });
    var ni = 0;
    if (!o.noNi) { ni = Math.max(0, Math.min(forNi, Y.ni.uel) - Y.ni.pt) * Y.ni.main / 100 + Math.max(0, forNi - Y.ni.uel) * Y.ni.upper / 100; }
    var loan = 0, loanRows = [];
    if (o.plan && Y.loans[o.plan]) { var L = Y.loans[o.plan]; var l = Math.max(0, forNi - L[0]) * L[1] / 100; loan += l; loanRows.push(['Plan ' + o.plan, l]); }
    if (o.postgrad) { var P = Y.loans.pg; var pl = Math.max(0, forNi - P[0]) * P[1] / 100; loan += pl; loanRows.push(['Postgraduate', pl]); }
    var employerNi = Math.max(0, forNi - Y.ni.employerThreshold) * Y.ni.employer / 100;
    var net = gross - tax - ni - loan - pensionAmt;
    /* marginal rate on the next £1 */
    var next = ukTakeHomeQuick(Object.assign({}, o, { gross: gross + 100 }));
    return { gross: gross, taxable: taxable, allowance: allowance, tax: tax, ni: ni, loan: loan, pension: pensionAmt, net: net, rows: rows, loanRows: loanRows, employerNi: employerNi,
      effective: gross ? (tax + ni + loan) / gross * 100 : 0, marginal: next === null ? 0 : (100 - (next - net)) };
  }
  function ukTakeHomeQuick(o) {
    /* same maths without recursion, for the marginal rate */
    var Y = UK_TAX[o.year], gross = o.gross, pensionAmt = gross * (o.pension || 0) / 100;
    var forTax = gross - (o.pensionType === 'none' ? 0 : pensionAmt), forNi = gross - (o.pensionType === 'sacrifice' ? pensionAmt : 0);
    var allowance = Y.allowance; if (forTax > Y.taperFrom) allowance = Math.max(0, allowance - Math.floor((forTax - Y.taperFrom) / 2)); if (o.blind) allowance += 3130;
    var taxable = Math.max(0, forTax - allowance), bands = o.scotland ? Y.scot : Y.ruk, tax = 0, lower = 0;
    bands.forEach(function (b) { tax += Math.max(0, Math.min(taxable, b[0]) - lower) * b[1] / 100; lower = b[0]; });
    var ni = o.noNi ? 0 : Math.max(0, Math.min(forNi, Y.ni.uel) - Y.ni.pt) * Y.ni.main / 100 + Math.max(0, forNi - Y.ni.uel) * Y.ni.upper / 100;
    var loan = 0; if (o.plan && Y.loans[o.plan]) loan += Math.max(0, forNi - Y.loans[o.plan][0]) * Y.loans[o.plan][1] / 100; if (o.postgrad) loan += Math.max(0, forNi - Y.loans.pg[0]) * Y.loans.pg[1] / 100;
    return gross - tax - ni - loan - pensionAmt;
  }

  Tools.register({
    id: 'uk-take-home-pay', category: 'finance', name: 'UK Take-Home Pay',
    description: 'Salary after income tax (with the real bands, Scottish rates and the allowance taper), National Insurance, student loan and pension.',
    keywords: ['take home pay', 'salary calculator', 'uk tax', 'income tax', 'national insurance', 'paye', 'net salary', 'student loan', 'scotland', 'pension', 'after tax', '2026/27', 'hmrc', 'payslip'],
    render: function (root) {
      prep(root);
      var gross = numIn('Gross salary (per year)', 35000, { min: 0, step: 500 }, { before: '£' });
      var year = U.select({ label: 'Tax year', options: Object.keys(UK_TAX), value: '2026/27' });
      var region = U.select({ label: 'Where you pay tax', options: [{ value: 'ruk', label: 'England, Wales or Northern Ireland' }, { value: 'scot', label: 'Scotland' }], value: 'ruk' });
      var pension = numIn('Pension contribution', 5, { min: 0, max: 100, step: 0.5 }, { after: '%' });
      var pensionType = U.select({ label: 'Pension type', options: [{ value: 'netpay', label: 'Workplace pension (deducted before tax)' }, { value: 'sacrifice', label: 'Salary sacrifice (before tax and NI)' }, { value: 'none', label: 'Ignore pension' }], value: 'netpay' });
      var plan = U.select({ label: 'Student loan', options: [{ value: '', label: 'None' }, { value: '1', label: 'Plan 1 (pre-2012 England/Wales, NI)' }, { value: '2', label: 'Plan 2 (England/Wales 2012–2023)' }, { value: '4', label: 'Plan 4 (Scotland)' }, { value: '5', label: 'Plan 5 (England from 2023)' }], value: '' });
      var postgrad = U.checkbox('Postgraduate loan too');
      var noNi = U.checkbox('Over State Pension age (no NI)');
      var blind = U.checkbox("Blind Person's Allowance");
      var period = tabs([{ value: 'year', label: 'Yearly' }, { value: 'month', label: 'Monthly' }, { value: 'week', label: 'Weekly' }, { value: 'day', label: 'Daily' }, { value: 'hour', label: 'Hourly' }], function () { run(); }, 'month');
      var hours = numIn('Hours per week (for hourly)', 37.5, { min: 1, max: 100, step: 0.5 });
      var out = el('div');
      var bar = el('div', { class: 'fn-bar', style: { height: '22px', borderRadius: '6px', overflow: 'hidden', display: 'flex', gap: '0', margin: '10px 0' } });
      var legend = el('div', { class: 'fn-muted' });
      var tbl = el('div');
      var note = U.note('');
      function run() {
        var o = { gross: val(gross) || 0, year: year.querySelector('select').value, scotland: region.querySelector('select').value === 'scot', pension: val(pension) || 0, pensionType: pensionType.querySelector('select').value,
          plan: plan.querySelector('select').value, postgrad: postgrad.input.checked, noNi: noNi.input.checked, blind: blind.input.checked };
        var r = ukTakeHome(o);
        var div = { year: 1, month: 12, week: 52, day: 260, hour: 52 * (val(hours) || 37.5) }[period.value], label = { year: 'a year', month: 'a month', week: 'a week', day: 'a day', hour: 'an hour' }[period.value];
        var f = function (n) { return period.value === 'year' ? gbp0.format(n / div) : gbp2.format(n / div); };
        out.replaceChildren(
          el('div', { class: 'fn-big', dataset: { k: 'net' }, text: f(r.net) }), el('div', { class: 'fn-muted', text: 'take-home pay ' + label }),
          grid(card('Gross', f(r.gross), 'gross'), card('Income tax', f(r.tax), 'tax'), card('National Insurance', f(r.ni), 'ni'), r.loan ? card('Student loan', f(r.loan), 'loan') : null, r.pension ? card('Pension', f(r.pension), 'pension') : null,
            card('Effective deduction rate', pct(r.effective), 'eff'), card('Marginal rate on next £', pct(r.marginal, 0), 'marginal')));
        var parts = [['Take-home', r.net, 'var(--ok)'], ['Income tax', r.tax, '#dc2626'], ['NI', r.ni, '#f59e0b'], ['Student loan', r.loan, '#8b5cf6'], ['Pension', r.pension, '#3b82f6']].filter(function (p) { return p[1] > 0; });
        bar.replaceChildren.apply(bar, parts.map(function (p) { return el('i', { style: { flex: String(p[1]), background: p[2], height: '100%', borderRadius: '0' }, title: p[0] + ' ' + gbp0.format(p[1]) }); }));
        legend.textContent = parts.map(function (p) { return p[0] + ' ' + (r.gross ? Math.round(p[1] / r.gross * 100) : 0) + '%'; }).join(' · ');
        var rows = [['Personal allowance', gbp0.format(r.allowance) + (r.allowance < UK_TAX[o.year].allowance ? ' (tapered)' : '')], ['Taxable income', gbp0.format(r.taxable)]];
        r.rows.forEach(function (b) { rows.push(['Tax at ' + b.rate + '% on ' + gbp0.format(b.amount), gbp2.format(b.tax)]); });
        if (!o.noNi) rows.push(['Employee NI (' + UK_TAX[o.year].ni.main + '% / ' + UK_TAX[o.year].ni.upper + '%)', gbp2.format(r.ni)]);
        r.loanRows.forEach(function (l) { rows.push(['Student loan ' + l[0], gbp2.format(l[1])]); });
        rows.push(["Employer's NI (what the job costs on top)", gbp2.format(r.employerNi)]);
        tbl.replaceChildren(U.table(['Yearly breakdown', 'Amount'], rows));
        note.textContent = UK_TAX[o.year].note + ' Tax is worked out on the year; NI and student loans are really assessed per pay period, so a payslip can differ by a few pounds. Tax codes, benefits in kind, marriage allowance and Class 4 NI for the self-employed are not included.';
      }
      U.live([gross, year, region, pension, pensionType, plan, postgrad, noNi, blind, hours], run);
      root.appendChild(U.panel(null, grid(gross, year, region), grid(pension, pensionType, plan), U.row(postgrad, noNi, blind)));
      root.appendChild(U.panel('Take-home', period, out, bar, legend, U.row(hours)));
      root.appendChild(U.panel('Breakdown', tbl, note));
    }
  });

  /* ======================================================================= */
  /* Expense Splitter                                                        */
  /* ======================================================================= */

  function settleUp(balances) {
    /* balances: { name: net } positive = is owed. Greedy: biggest debtor pays biggest creditor. */
    var debtors = [], creditors = [], out = [];
    Object.keys(balances).forEach(function (n) { var v = balances[n]; if (v < -0.005) debtors.push({ n: n, v: -v }); else if (v > 0.005) creditors.push({ n: n, v: v }); });
    debtors.sort(function (a, b) { return b.v - a.v; }); creditors.sort(function (a, b) { return b.v - a.v; });
    var i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      var amt = Math.min(debtors[i].v, creditors[j].v);
      out.push({ from: debtors[i].n, to: creditors[j].n, amount: Math.round(amt * 100) / 100 });
      debtors[i].v -= amt; creditors[j].v -= amt;
      if (debtors[i].v < 0.005) i++;
      if (creditors[j].v < 0.005) j++;
    }
    return out;
  }

  Tools.register({
    id: 'expense-splitter', category: 'finance', name: 'Expense Splitter',
    description: 'Who paid what on the trip, who owes whom, and the fewest payments that settle everyone up.',
    keywords: ['split bill', 'expenses', 'settle up', 'who owes', 'splitwise', 'trip', 'holiday', 'group', 'shared costs', 'debts', 'iou', 'flatmates'],
    render: function (root) {
      prep(root, true);
      var KEY = 'att-expense-splitter';
      var state = { people: ['Alice', 'Bob', 'Chris'], expenses: [{ payer: 'Alice', amount: 120, what: 'Hotel', who: null }, { payer: 'Bob', amount: 45.5, what: 'Dinner', who: null }, { payer: 'Chris', amount: 30, what: 'Taxi', who: ['Alice', 'Chris'] }], symbol: sym() };
      try { var saved = JSON.parse(localStorage.getItem(KEY)); if (saved && saved.people && saved.expenses) state = saved; } catch (e) { /* fresh */ }
      function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ } }
      var peopleBox = el('div', { class: 'chips' });
      var newPerson = el('input', { type: 'text', placeholder: 'Add a person', maxLength: 30 });
      var symbol = el('input', { type: 'text', value: state.symbol || sym(), maxLength: 4, style: { width: '60px' } });
      var list = el('div');
      var payer = el('select'), amount = el('input', { type: 'number', min: 0, step: '0.01', placeholder: '0.00' }), what = el('input', { type: 'text', placeholder: 'What for' });
      var whoBox = el('div', { class: 'chips' });
      var results = el('div');
      var settle = el('div');
      function money(n) { return (state.symbol || sym()) + (Math.round(n * 100) / 100).toFixed(2); }
      function drawPeople() {
        peopleBox.replaceChildren.apply(peopleBox, state.people.map(function (p) {
          return el('span', { class: 'chip on', style: { display: 'inline-flex', gap: '6px', alignItems: 'center' } }, p, el('button', { type: 'button', 'aria-label': 'Remove ' + p, style: { border: 0, background: 'none', color: 'inherit', cursor: 'pointer', padding: 0, font: 'inherit' }, onclick: function () {
            state.people = state.people.filter(function (x) { return x !== p; });
            state.expenses = state.expenses.filter(function (e) { return e.payer !== p; }).map(function (e) { if (e.who) e.who = e.who.filter(function (x) { return x !== p; }); return e; });
            save(); drawAll();
          } }, '×'));
        }));
        payer.replaceChildren.apply(payer, state.people.map(function (p) { return el('option', { value: p, text: p }); }));
        whoBox.replaceChildren.apply(whoBox, state.people.map(function (p) { var c = el('button', { type: 'button', class: 'chip on', dataset: { who: p }, onclick: function () { c.classList.toggle('on'); } }, p); return c; }));
      }
      function drawExpenses() {
        if (!state.expenses.length) { list.replaceChildren(U.note('No expenses yet. Add the first one below.')); return; }
        list.replaceChildren(U.table(['Paid by', 'Amount', 'What', 'Split between', ''], state.expenses.map(function (e, i) {
          return [e.payer, money(e.amount), e.what || '—', (e.who || state.people).join(', '), U.button('Remove', function () { state.expenses.splice(i, 1); save(); drawAll(); }, 'ghost')];
        })));
      }
      function compute() {
        var paid = {}, share = {}, total = 0;
        state.people.forEach(function (p) { paid[p] = 0; share[p] = 0; });
        state.expenses.forEach(function (e) {
          var who = (e.who && e.who.length ? e.who : state.people).filter(function (p) { return state.people.indexOf(p) > -1; });
          if (!who.length || !(e.amount > 0)) return;
          total += e.amount;
          if (paid[e.payer] !== undefined) paid[e.payer] += e.amount;
          who.forEach(function (p) { share[p] += e.amount / who.length; });
        });
        var balances = {};
        state.people.forEach(function (p) { balances[p] = paid[p] - share[p]; });
        var rows = state.people.map(function (p) { var b = balances[p]; return [p, money(paid[p]), money(share[p]), el('b', { style: { color: b > 0.005 ? 'var(--ok)' : b < -0.005 ? 'var(--err)' : 'inherit' }, text: (b > 0.005 ? 'is owed ' : b < -0.005 ? 'owes ' : 'settled ') + (Math.abs(b) > 0.005 ? money(Math.abs(b)) : '') })]; });
        results.replaceChildren(grid(card('Total spent', money(total), 'total'), card('People', String(state.people.length)), card('Per person (if equal)', money(state.people.length ? total / state.people.length : 0))), U.table(['Person', 'Paid', 'Fair share', 'Balance'], rows));
        var tx = settleUp(balances);
        settle.replaceChildren(tx.length ? el('div', { class: 'stack', dataset: { k: 'settle' } }, tx.map(function (t) { return el('div', { class: 'fn-rank' }, el('span', {}, el('b', { text: t.from }), ' pays ', el('b', { text: t.to })), el('b', { text: money(t.amount) })); })) : U.note('Everyone is square. Nothing to pay.'),
          U.btnrow(U.copyBtn('Copy summary', function () { return 'Expenses total ' + money(total) + '\n' + tx.map(function (t) { return t.from + ' pays ' + t.to + ' ' + money(t.amount); }).join('\n'); })));
      }
      function drawAll() { drawPeople(); drawExpenses(); compute(); }
      function addPerson() { var n = newPerson.value.trim(); if (!n || state.people.indexOf(n) > -1) return; state.people.push(n); newPerson.value = ''; save(); drawAll(); }
      newPerson.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addPerson(); } });
      symbol.addEventListener('input', function () { state.symbol = symbol.value || sym(); save(); drawExpenses(); compute(); });
      function addExpense() {
        var a = parseFloat(amount.value);
        if (!(a > 0)) return U.toast('Enter an amount', 'err');
        var who = Array.prototype.filter.call(whoBox.children, function (c) { return c.classList.contains('on'); }).map(function (c) { return c.dataset.who; });
        state.expenses.push({ payer: payer.value, amount: Math.round(a * 100) / 100, what: what.value.trim(), who: who.length === state.people.length ? null : who });
        amount.value = ''; what.value = ''; Array.prototype.forEach.call(whoBox.children, function (c) { c.classList.add('on'); });
        save(); drawExpenses(); compute();
        amount.focus();
      }
      amount.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addExpense(); } });
      what.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addExpense(); } });
      drawAll();
      root.appendChild(U.panel('People', peopleBox, U.row(U.field('', newPerson), U.button('Add person', addPerson), U.field('Currency symbol', symbol))));
      root.appendChild(U.panel('Expenses', list, el('h4', { text: 'Add an expense', style: { margin: '12px 0 6px' } }), U.row(U.field('Paid by', payer), U.field('Amount', amount), U.field('What for', what)), U.field('Split between (tap to exclude)', whoBox), U.btnrow(U.button('Add expense', addExpense, 'primary'), U.button('Clear everything', function () { if (confirm('Remove all people and expenses?')) { state = { people: [], expenses: [], symbol: state.symbol }; save(); drawAll(); } }, 'ghost'))));
      root.appendChild(U.panel('Balances', results));
      root.appendChild(U.panel('Settle up (fewest payments)', settle, U.note('Saved in this browser so you can keep adding through the trip. Splits are equal between the people ticked for each expense.')));
    }
  });

  /* Shared with finance-b.js (loaded straight after this file). */
  window.FinKit = {
    gbp0: gbp0, gbp2: gbp2, num2: num2, money0: money0, money2: money2, sym: sym, pct: pct, pctShow: pctShow, yrs: yrs, yearsMonths: yearsMonths,
    val: val, numIn: numIn, textIn: textIn, slider: slider, card: card, grid: grid, tabs: tabs, prep: prep, selVal: selVal,
    scrollTable: scrollTable, source: source, payment: payment, amortize: amortize,
    lineChart: lineChart, barChart: barChart, gbpShort: gbpShort
  };
})();
