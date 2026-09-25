/* data-c tools: Chart Maker. Paste CSV or edit a grid, pick a chart type and
   the columns to plot, and export the result as SVG or PNG. The chart is drawn
   as plain SVG here, with no charting library. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-data-c-style')) {
    document.head.appendChild(el('style', { id: 'g-data-c-style', text: [
      '.g-datac textarea.cm-csv { min-height: 190px; font-family: var(--mono); font-size: 13px; tab-size: 12; }',
      '.g-datac .cm-grid-wrap { overflow: auto; max-height: 340px; border: 1px solid var(--border); border-radius: var(--radius-s); background: var(--bg-elev); }',
      '.g-datac .cm-grid { border-collapse: collapse; font-size: 13px; }',
      '.g-datac .cm-grid td, .g-datac .cm-grid th { border: 1px solid var(--border); padding: 0; }',
      '.g-datac .cm-grid th { background: var(--bg-sunken); font-weight: 600; font-size: 11px; color: var(--fg-muted); padding: 2px 4px; }',
      '.g-datac .cm-grid input { border: 0; border-radius: 0; background: transparent; width: 110px; padding: 5px 7px; font: inherit; color: var(--fg); }',
      '.g-datac .cm-grid tr:first-child input { font-weight: 600; }',
      '.g-datac .cm-grid input:focus { outline: 2px solid var(--accent); outline-offset: -2px; background: var(--accent-weak); }',
      '.g-datac .cm-grid .cm-x { font: inherit; border: 0; background: none; color: var(--fg-muted); cursor: pointer; padding: 2px 6px; }',
      '.g-datac .cm-grid .cm-x:hover { color: var(--err); }',
      '.g-datac .cm-series { display: flex; flex-wrap: wrap; gap: 6px 10px; }',
      '.g-datac .cm-ser { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--border); border-radius: var(--radius-s); padding: 3px 8px 3px 4px; background: var(--bg-elev); font-size: 13px; }',
      '.g-datac .cm-ser input[type=color] { width: 26px; height: 22px; padding: 0; border: 0; background: none; cursor: pointer; }',
      '.g-datac .cm-ser input[type=checkbox] { accent-color: var(--accent); }',
      '.g-datac .cm-stage { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; background-image: repeating-conic-gradient(var(--bg-sunken) 0 25%, transparent 0 50%); background-size: 16px 16px; }',
      '.g-datac .cm-stage svg { display: block; width: 100%; height: auto; }',
      '.g-datac .cm-types .chip { min-width: 0; }',
      '.g-datac .cm-muted { color: var(--fg-muted); font-size: 13px; }'
    ].join('\n') }));
  }

  /* Two categorical palettes that stay legible on both white and near-black
     backgrounds, plus a few for taste. The first is the default. */
  var PALETTES = {
    standard: { label: 'Standard (10 colours)', colours: ['#4269d0', '#efb118', '#ff725c', '#6cc5b0', '#3ca951', '#ff8ab7', '#a463f2', '#97bbf5', '#9c6b4e', '#9498a0'] },
    okabe: { label: 'Colour-blind safe (Okabe–Ito)', colours: ['#0072b2', '#e69f00', '#009e73', '#cc79a7', '#56b4e9', '#d55e00', '#f0e442', '#999999'] },
    warm: { label: 'Warm', colours: ['#d1495b', '#edae49', '#f28e2b', '#b5485d', '#e07a5f', '#f2cc8f', '#8c2f39', '#c97b63'] },
    cool: { label: 'Cool', colours: ['#1f6f8b', '#2a9d8f', '#5e60ce', '#48bfe3', '#4ea8de', '#80b918', '#6930c3', '#64dfdf'] },
    mono: { label: 'Single hue (blues)', colours: ['#08306b', '#2171b5', '#4292c6', '#6baed6', '#9ecae1', '#c6dbef', '#185fa8', '#3a7cc0'] }
  };

  var BACKGROUNDS = {
    light: { label: 'White', fill: '#ffffff', ink: '#1f2330', soft: '#5d6478', grid: '#e3e6ee' },
    dark: { label: 'Dark', fill: '#171a23', ink: '#e8eaf2', soft: '#9aa2b8', grid: '#2e3342' },
    clearDark: { label: 'Transparent, dark text', fill: null, ink: '#1f2330', soft: '#5d6478', grid: '#d5d9e4' },
    clearLight: { label: 'Transparent, light text', fill: null, ink: '#e8eaf2', soft: '#9aa2b8', grid: '#3a4052' }
  };

  var TYPES = [
    { value: 'bar', label: 'Bar' }, { value: 'hbar', label: 'Horizontal bar' }, { value: 'stacked', label: 'Stacked bar' },
    { value: 'line', label: 'Line' }, { value: 'area', label: 'Area' }, { value: 'pie', label: 'Pie' },
    { value: 'doughnut', label: 'Doughnut' }, { value: 'scatter', label: 'Scatter' }
  ];

  var SAMPLE = 'Month,Online,In store,Wholesale\nJan,4200,3100,1800\nFeb,3900,2900,2100\nMar,4800,3300,1900\nApr,5200,3600,2300\nMay,6100,3400,2600\nJun,6800,3900,2500';

  var FONT = 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';

  /* --- numbers ------------------------------------------------------------ */

  /* "£1,234.50", "12%", " 3 400 " and "(120)" all read as numbers. */
  function parseNum(v) {
    var s = String(v === undefined || v === null ? '' : v).trim();
    if (!s) return NaN;
    var neg = /^\(.*\)$/.test(s);
    s = s.replace(/[()\s,£$€¥₹%]/g, '').replace(/−/g, '-');
    if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return NaN;
    var n = parseFloat(s);
    return neg ? -n : n;
  }

  function niceStep(span, count) {
    var raw = span / Math.max(1, count);
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var norm = raw / mag;
    return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  }

  /* Rounded axis bounds and ticks covering [lo, hi]. */
  function niceScale(lo, hi, count) {
    if (!isFinite(lo) || !isFinite(hi)) { lo = 0; hi = 1; }
    if (lo === hi) { if (lo === 0) hi = 1; else if (lo > 0) lo = 0; else hi = 0; }
    var step = niceStep(hi - lo, count || 5);
    var min = Math.floor(lo / step) * step, max = Math.ceil(hi / step) * step;
    var ticks = [];
    for (var t = min; t <= max + step / 2; t += step) ticks.push(Math.abs(t) < step / 1e6 ? 0 : +t.toPrecision(12));
    return { min: min, max: max, ticks: ticks };
  }

  function fmtTick(n) {
    var a = Math.abs(n);
    if (a >= 1e9) return trim(n / 1e9) + 'B';
    if (a >= 1e6) return trim(n / 1e6) + 'M';
    if (a >= 1e4) return trim(n / 1e3) + 'k';
    return trim(n);
  }
  function trim(n) { return String(+n.toFixed(2)); }
  function fmtValue(n) { return n.toLocaleString('en-GB', { maximumFractionDigits: 2 }); }

  function esc(s) { return U.escapeHtml(String(s)); }
  /* Rough label width at a given font size; good enough to leave room. */
  function textW(s, size) { return String(s).length * size * 0.56; }
  function clip(s, max) { s = String(s); return s.length > max ? s.slice(0, max - 1) + '…' : s; }

  /* --- data --------------------------------------------------------------- */

  function readTable(text) {
    var t = String(text || '').replace(/^﻿/, '');
    if (!t.trim()) return { head: [], rows: [] };
    var rows = CSV.parse(t, CSV.sniff(t)).filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
    var width = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    rows = rows.map(function (r) { r = r.map(function (c) { return String(c).trim(); }); while (r.length < width) r.push(''); return r; });
    var head = (rows.shift() || []).map(function (h, i) { return h || 'Column ' + (i + 1); });
    return { head: head, rows: rows };
  }

  function isNumericCol(table, i) {
    var seen = 0, good = 0;
    table.rows.forEach(function (r) { if (r[i] !== '') { seen++; if (!isNaN(parseNum(r[i]))) good++; } });
    return seen > 0 && good / seen >= 0.8;
  }

  /* --- drawing ------------------------------------------------------------ */

  /* opts: { type, title, xLabel, yLabel, legend, values, grid, zero, width,
     height, bg, labels[], series[{ name, colour, values[] }], xs[] } */
  function draw(o) {
    var W = o.width, H = o.height, bg = BACKGROUNDS[o.bg] || BACKGROUNDS.light;
    var parts = [];
    var titleH = o.title ? 34 : 10;
    var pad = 18;

    parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.title || 'Chart') + '" font-family="' + FONT + '">');
    if (o.title) parts.push('<title>' + esc(o.title) + '</title>');
    if (bg.fill) parts.push('<rect width="100%" height="100%" fill="' + bg.fill + '"/>');
    if (o.title) parts.push('<text x="' + W / 2 + '" y="26" text-anchor="middle" font-size="18" font-weight="600" fill="' + bg.ink + '">' + esc(o.title) + '</text>');

    var round = o.type === 'pie' || o.type === 'doughnut';

    /* Legend: a wrapping row under the title for axis charts, a column on the
       right for pies. */
    var legendItems = round
      ? o.labels.map(function (l, i) { return { name: l, colour: o.sliceColours[i] }; })
      : o.series.map(function (s) { return { name: s.name, colour: s.colour }; });
    var showLegend = o.legend && legendItems.length > (round ? 0 : 1);
    var top = titleH, right = pad;

    if (showLegend && !round) {
      var lx = pad, ly = top + 8, rowH = 20;
      var items = [];
      legendItems.forEach(function (it) {
        var w = 18 + textW(clip(it.name, 28), 12) + 16;
        if (lx + w > W - pad && lx > pad) { lx = pad; ly += rowH; }
        items.push('<rect x="' + lx + '" y="' + (ly - 9) + '" width="11" height="11" rx="2" fill="' + it.colour + '"/>' +
          '<text x="' + (lx + 16) + '" y="' + ly + '" font-size="12" fill="' + bg.ink + '">' + esc(clip(it.name, 28)) + '</text>');
        lx += w;
      });
      /* Centre a single line of legend; leave wrapped lines left-aligned. */
      var single = ly === top + 8;
      var shift = single ? Math.max(0, (W - pad - lx) / 2) : 0;
      parts.push('<g transform="translate(' + shift + ',0)">' + items.join('') + '</g>');
      top = ly + 14;
    }

    if (round) drawPie(o, parts, bg, top, showLegend ? legendItems : null, pad);
    else if (o.type === 'scatter') drawScatter(o, parts, bg, top, right, pad);
    else drawAxes(o, parts, bg, top, right, pad);

    parts.push('</svg>');
    return parts.join('');
  }

  function drawAxes(o, parts, bg, top, right, pad) {
    var W = o.width, H = o.height;
    var horizontal = o.type === 'hbar';
    var stacked = o.type === 'stacked';
    var n = o.labels.length;

    /* Value range. Bars and areas always include zero. */
    var lo = Infinity, hi = -Infinity;
    if (stacked) {
      for (var i = 0; i < n; i++) {
        var pos = 0, neg = 0;
        o.series.forEach(function (s) { var v = s.values[i]; if (isFinite(v)) { if (v >= 0) pos += v; else neg += v; } });
        hi = Math.max(hi, pos); lo = Math.min(lo, neg);
      }
    } else {
      o.series.forEach(function (s) { s.values.forEach(function (v) { if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }); });
    }
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    if (o.zero || o.type !== 'line') { lo = Math.min(0, lo); hi = Math.max(0, hi); }
    else { var slack = (hi - lo) * 0.05 || 1; lo -= slack; hi += slack; }
    var sc = niceScale(lo, hi, horizontal ? 6 : 5);

    var tickW = sc.ticks.reduce(function (m, t) { return Math.max(m, textW(fmtTick(t), 12)); }, 0);
    var catW = o.labels.reduce(function (m, l) { return Math.max(m, textW(clip(l, 22), 12)); }, 0);

    var sideTitle = horizontal ? o.xLabel : o.yLabel, footTitle = horizontal ? o.yLabel : o.xLabel;
    var left = pad + (sideTitle ? 22 : 0) + (horizontal ? Math.min(catW, W * 0.3) : tickW) + 10;
    var plotW = W - left - right;
    /* Rotate category labels when they would collide. */
    var slot = (horizontal ? 0 : plotW / Math.max(1, n));
    var rotate = !horizontal && catW + 6 > slot;
    var bottomLabels = horizontal ? 18 : (rotate ? Math.min(catW * 0.72 + 12, H * 0.28) : 20);
    var bottom = pad + bottomLabels + (footTitle ? 22 : 0);
    var plotH = H - top - bottom - 6;
    var plotTop = top + 6;
    if (plotW < 40 || plotH < 40) { parts.push(msg(W, H, 'Make the chart bigger to fit this data', bg)); return; }

    function vPos(v) {
      var f = (v - sc.min) / (sc.max - sc.min || 1);
      return horizontal ? left + f * plotW : plotTop + plotH - f * plotH;
    }
    var zeroAt = vPos(Math.max(sc.min, Math.min(sc.max, 0)));

    /* Grid and value ticks. */
    sc.ticks.forEach(function (t) {
      var p = vPos(t);
      if (horizontal) {
        if (o.grid) parts.push('<line x1="' + p + '" x2="' + p + '" y1="' + plotTop + '" y2="' + (plotTop + plotH) + '" stroke="' + bg.grid + '"/>');
        parts.push('<text x="' + p + '" y="' + (plotTop + plotH + 16) + '" text-anchor="middle" font-size="12" fill="' + bg.soft + '">' + esc(fmtTick(t)) + '</text>');
      } else {
        if (o.grid) parts.push('<line x1="' + left + '" x2="' + (left + plotW) + '" y1="' + p + '" y2="' + p + '" stroke="' + bg.grid + '"/>');
        parts.push('<text x="' + (left - 8) + '" y="' + (p + 4) + '" text-anchor="end" font-size="12" fill="' + bg.soft + '">' + esc(fmtTick(t)) + '</text>');
      }
    });

    /* Category positions. */
    var band = (horizontal ? plotH : plotW) / Math.max(1, n);
    function catCentre(i) { return (horizontal ? plotTop : left) + band * (i + 0.5); }

    o.labels.forEach(function (l, i) {
      var c = catCentre(i), label = esc(clip(l, 22));
      if (horizontal) {
        parts.push('<text x="' + (left - 8) + '" y="' + (c + 4) + '" text-anchor="end" font-size="12" fill="' + bg.ink + '">' + label + '</text>');
      } else if (rotate) {
        var y = plotTop + plotH + 14;
        parts.push('<text transform="translate(' + c + ',' + y + ') rotate(-35)" text-anchor="end" font-size="12" fill="' + bg.ink + '">' + label + '</text>');
      } else {
        parts.push('<text x="' + c + '" y="' + (plotTop + plotH + 17) + '" text-anchor="middle" font-size="12" fill="' + bg.ink + '">' + label + '</text>');
      }
    });

    var marks = [], labels = [];
    var S = o.series.length;

    if (o.type === 'bar' || horizontal) {
      var inner = band * 0.78, bw = inner / Math.max(1, S);
      o.series.forEach(function (s, si) {
        s.values.forEach(function (v, i) {
          if (!isFinite(v)) return;
          var start = catCentre(i) - inner / 2 + si * bw, p = vPos(v);
          if (horizontal) {
            var x = Math.min(p, zeroAt), w = Math.abs(p - zeroAt);
            marks.push(rect(x, start + 1, w, Math.max(1, bw - 2), s.colour, s.name + ', ' + o.labels[i] + ': ' + fmtValue(v)));
            if (o.values) labels.push(txt(v >= 0 ? p + 4 : p - 4, start + bw / 2 + 4, fmtValue(v), v >= 0 ? 'start' : 'end', bg.ink, 11));
          } else {
            var y = Math.min(p, zeroAt), h = Math.abs(p - zeroAt);
            marks.push(rect(start + 1, y, Math.max(1, bw - 2), h, s.colour, s.name + ', ' + o.labels[i] + ': ' + fmtValue(v)));
            if (o.values) labels.push(txt(start + bw / 2, v >= 0 ? p - 5 : p + 14, fmtValue(v), 'middle', bg.ink, 11));
          }
        });
      });
    } else if (stacked) {
      var bw2 = band * 0.66;
      for (var k = 0; k < n; k++) {
        var up = 0, down = 0, x0 = catCentre(k) - bw2 / 2;
        o.series.forEach(function (s) {
          var v = s.values[k];
          if (!isFinite(v) || v === 0) return;
          var from = v >= 0 ? up : down, to = from + v;
          if (v >= 0) up = to; else down = to;
          var a = vPos(from), b = vPos(to);
          marks.push(rect(x0, Math.min(a, b), bw2, Math.abs(a - b), s.colour, s.name + ', ' + o.labels[k] + ': ' + fmtValue(v)));
          if (o.values && Math.abs(a - b) > 14) labels.push(txt(x0 + bw2 / 2, (a + b) / 2 + 4, fmtValue(v), 'middle', '#ffffff', 11, true));
        });
        if (o.values && S > 1) labels.push(txt(catCentre(k), vPos(up) - 5, fmtValue(up + down), 'middle', bg.ink, 11));
      }
    } else {
      /* line and area */
      o.series.forEach(function (s) {
        var pts = [];
        s.values.forEach(function (v, i) { if (isFinite(v)) pts.push([catCentre(i), vPos(v), v, i]); });
        if (!pts.length) return;
        var path = pts.map(function (p, i) { return (i ? 'L' : 'M') + r2(p[0]) + ' ' + r2(p[1]); }).join('');
        if (o.type === 'area') {
          marks.push('<path d="' + path + 'L' + r2(pts[pts.length - 1][0]) + ' ' + r2(zeroAt) + 'L' + r2(pts[0][0]) + ' ' + r2(zeroAt) + 'Z" fill="' + s.colour + '" fill-opacity="' + (S > 1 ? 0.22 : 0.32) + '"/>');
        }
        marks.push('<path d="' + path + '" fill="none" stroke="' + s.colour + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>');
        pts.forEach(function (p) {
          marks.push('<circle cx="' + r2(p[0]) + '" cy="' + r2(p[1]) + '" r="3.5" fill="' + s.colour + '"><title>' + esc(s.name + ', ' + o.labels[p[3]] + ': ' + fmtValue(p[2])) + '</title></circle>');
          if (o.values) labels.push(txt(p[0], p[1] - 9, fmtValue(p[2]), 'middle', bg.ink, 11));
        });
      });
    }

    parts.push(marks.join(''));
    /* Baseline at zero. */
    if (horizontal) parts.push('<line x1="' + zeroAt + '" x2="' + zeroAt + '" y1="' + plotTop + '" y2="' + (plotTop + plotH) + '" stroke="' + bg.soft + '"/>');
    else parts.push('<line x1="' + left + '" x2="' + (left + plotW) + '" y1="' + zeroAt + '" y2="' + zeroAt + '" stroke="' + bg.soft + '"/>');
    parts.push(labels.join(''));

    axisTitles(o, parts, bg, left, plotW, plotTop, plotH, H, pad, horizontal);
  }

  function drawScatter(o, parts, bg, top, right, pad) {
    var W = o.width, H = o.height;
    var xs = o.xs;
    var xlo = Infinity, xhi = -Infinity, ylo = Infinity, yhi = -Infinity;
    xs.forEach(function (x) { if (isFinite(x)) { xlo = Math.min(xlo, x); xhi = Math.max(xhi, x); } });
    o.series.forEach(function (s) { s.values.forEach(function (v) { if (isFinite(v)) { ylo = Math.min(ylo, v); yhi = Math.max(yhi, v); } }); });
    if (!isFinite(xlo) || !isFinite(ylo)) { parts.push(msg(W, H, 'Scatter needs numbers in the label column and the series', bg)); return; }
    if (o.zero) { xlo = Math.min(0, xlo); ylo = Math.min(0, ylo); xhi = Math.max(0, xhi); yhi = Math.max(0, yhi); }
    var sx = niceScale(xlo, xhi, 6), sy = niceScale(ylo, yhi, 5);
    var tickW = sy.ticks.reduce(function (m, t) { return Math.max(m, textW(fmtTick(t), 12)); }, 0);
    var left = pad + (o.yLabel ? 22 : 0) + tickW + 10;
    var bottom = pad + 20 + (o.xLabel ? 22 : 0);
    var plotTop = top + 6, plotW = W - left - right, plotH = H - plotTop - bottom;
    if (plotW < 40 || plotH < 40) { parts.push(msg(W, H, 'Make the chart bigger to fit this data', bg)); return; }
    function X(v) { return left + (v - sx.min) / (sx.max - sx.min || 1) * plotW; }
    function Y(v) { return plotTop + plotH - (v - sy.min) / (sy.max - sy.min || 1) * plotH; }

    sy.ticks.forEach(function (t) {
      if (o.grid) parts.push('<line x1="' + left + '" x2="' + (left + plotW) + '" y1="' + Y(t) + '" y2="' + Y(t) + '" stroke="' + bg.grid + '"/>');
      parts.push(txt(left - 8, Y(t) + 4, fmtTick(t), 'end', bg.soft, 12));
    });
    sx.ticks.forEach(function (t) {
      if (o.grid) parts.push('<line x1="' + X(t) + '" x2="' + X(t) + '" y1="' + plotTop + '" y2="' + (plotTop + plotH) + '" stroke="' + bg.grid + '"/>');
      parts.push(txt(X(t), plotTop + plotH + 17, fmtTick(t), 'middle', bg.soft, 12));
    });
    parts.push('<rect x="' + left + '" y="' + plotTop + '" width="' + plotW + '" height="' + plotH + '" fill="none" stroke="' + bg.soft + '" stroke-opacity=".5"/>');
    o.series.forEach(function (s) {
      s.values.forEach(function (v, i) {
        if (!isFinite(v) || !isFinite(xs[i])) return;
        parts.push('<circle cx="' + r2(X(xs[i])) + '" cy="' + r2(Y(v)) + '" r="4.5" fill="' + s.colour + '" fill-opacity=".85"><title>' + esc(s.name + ': (' + fmtValue(xs[i]) + ', ' + fmtValue(v) + ')') + '</title></circle>');
        if (o.values) parts.push(txt(X(xs[i]), Y(v) - 8, fmtValue(v), 'middle', bg.ink, 11));
      });
    });
    axisTitles(o, parts, bg, left, plotW, plotTop, plotH, H, pad, false);
  }

  function drawPie(o, parts, bg, top, legend, pad) {
    var W = o.width, H = o.height;
    var s = o.series[0];
    var vals = s.values.map(function (v) { return isFinite(v) && v > 0 ? v : 0; });
    var total = vals.reduce(function (a, b) { return a + b; }, 0);
    if (!total) { parts.push(msg(W, H, 'A pie needs at least one positive value', bg)); return; }

    var legendW = 0;
    if (legend) legendW = Math.min(W * 0.4, legend.reduce(function (m, it) { return Math.max(m, textW(clip(it.name, 26), 12)); }, 0) + 40);
    var areaW = W - pad * 2 - legendW, areaH = H - top - pad;
    var R = Math.max(10, Math.min(areaW, areaH) / 2 - (o.values ? 6 : 2));
    var cx = pad + areaW / 2, cy = top + areaH / 2 + 4;
    var hole = o.type === 'doughnut' ? R * 0.56 : 0;

    var a0 = -Math.PI / 2;
    vals.forEach(function (v, i) {
      if (!v) return;
      var frac = v / total, a1 = a0 + frac * Math.PI * 2;
      var colour = o.sliceColours[i];
      var tip = esc(o.labels[i] + ': ' + fmtValue(v) + ' (' + pctText(frac) + ')');
      if (frac >= 0.9999) {
        parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="' + colour + '"><title>' + tip + '</title></circle>');
        if (hole) parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + hole + '" fill="' + (bg.fill || 'none') + '"/>');
      } else {
        parts.push('<path d="' + arc(cx, cy, R, hole, a0, a1) + '" fill="' + colour + '" stroke="' + (bg.fill || bg.ink) + '" stroke-opacity="' + (bg.fill ? 1 : 0.25) + '" stroke-width="1.5"><title>' + tip + '</title></path>');
      }
      if (o.values && frac >= 0.04) {
        var mid = (a0 + a1) / 2, rr = hole ? (R + hole) / 2 : R * 0.64;
        parts.push(txt(cx + Math.cos(mid) * rr, cy + Math.sin(mid) * rr + 4, pctText(frac), 'middle', '#ffffff', 12, true));
      }
      a0 = a1;
    });
    if (hole) {
      parts.push(txt(cx, cy + 2, fmtValue(total), 'middle', bg.ink, Math.max(12, Math.min(22, hole / 3))));
      parts.push(txt(cx, cy + 18, clip(s.name, 20), 'middle', bg.soft, 11));
    }

    if (legend) {
      var lx = W - pad - legendW + 12, rowH = 20;
      var ly = top + Math.max(12, (areaH - legend.length * rowH) / 2 + 12);
      legend.forEach(function (it, i) {
        var y = ly + i * rowH;
        if (y > H - 6) return;
        parts.push('<rect x="' + lx + '" y="' + (y - 9) + '" width="11" height="11" rx="2" fill="' + it.colour + '"/>' +
          txt(lx + 17, y, clip(it.name, 26), 'start', bg.ink, 12));
      });
    }
  }

  function arc(cx, cy, R, r, a0, a1) {
    var large = a1 - a0 > Math.PI ? 1 : 0;
    function p(rad, a) { return r2(cx + Math.cos(a) * rad) + ' ' + r2(cy + Math.sin(a) * rad); }
    if (!r) return 'M' + cx + ' ' + cy + 'L' + p(R, a0) + 'A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + p(R, a1) + 'Z';
    return 'M' + p(R, a0) + 'A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + p(R, a1) + 'L' + p(r, a1) + 'A' + r + ' ' + r + ' 0 ' + large + ' 0 ' + p(r, a0) + 'Z';
  }

  function axisTitles(o, parts, bg, left, plotW, plotTop, plotH, H, pad, horizontal) {
    var xl = horizontal ? o.yLabel : o.xLabel, yl = horizontal ? o.xLabel : o.yLabel;
    if (xl) parts.push(txt(left + plotW / 2, H - pad + 4, xl, 'middle', bg.ink, 13));
    if (yl) parts.push('<text transform="translate(' + (pad + 4) + ',' + (plotTop + plotH / 2) + ') rotate(-90)" text-anchor="middle" font-size="13" fill="' + bg.ink + '">' + esc(yl) + '</text>');
  }

  function rect(x, y, w, h, fill, tip) {
    return '<rect x="' + r2(x) + '" y="' + r2(y) + '" width="' + r2(Math.max(0, w)) + '" height="' + r2(Math.max(0, h)) + '" fill="' + fill + '"><title>' + esc(tip) + '</title></rect>';
  }
  function txt(x, y, s, anchor, fill, size, halo) {
    return '<text x="' + r2(x) + '" y="' + r2(y) + '" text-anchor="' + anchor + '" font-size="' + size + '" fill="' + fill + '"' +
      (halo ? ' stroke="#000" stroke-opacity=".35" stroke-width="2.5" paint-order="stroke" font-weight="600"' : '') + '>' + esc(s) + '</text>';
  }
  function msg(W, H, s, bg) { return txt(W / 2, H / 2, s, 'middle', bg.soft, 14); }
  function r2(n) { return Math.round(n * 100) / 100; }
  function pctText(f) { return (f * 100 >= 10 ? Math.round(f * 100) : +(f * 100).toFixed(1)) + '%'; }

  /* --- export ------------------------------------------------------------- */

  function svgToPng(svg, width, height, scale) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas');
        c.width = Math.round(width * scale); c.height = Math.round(height * scale);
        var ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { if (b) resolve(b); else reject(new Error('Could not make the PNG')); }, 'image/png');
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Could not render the chart to PNG')); };
      img.src = url;
    });
  }

  function fileBase(title) {
    return (String(title || 'chart').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'chart').slice(0, 60);
  }

  /* ======================================================================= */
  /* Chart Maker                                                             */
  /* ======================================================================= */
  Tools.register({
    id: 'chart-maker', category: 'data', name: 'Chart Maker',
    description: 'Turn CSV or a quick table into a bar, line, area, pie, doughnut or scatter chart, then download it as SVG or PNG.',
    keywords: ['chart', 'graph', 'bar chart', 'line graph', 'pie chart', 'doughnut', 'donut', 'scatter plot', 'area chart', 'stacked bar',
      'csv to chart', 'plot', 'visualise', 'visualize', 'data visualisation', 'infographic', 'svg chart', 'png chart', 'excel chart'],
    render: function (root) {
      root.classList.add('g-datac');
      var dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
        (!document.documentElement.getAttribute('data-theme') && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);

      /* ---- data input: text or grid ---- */
      var csv = U.textarea({ class: 'cm-csv', value: SAMPLE, spellcheck: false, placeholder: 'Paste CSV or tab-separated data. The first row is the column names.' });
      csv.dataset.k = 'csv';
      var gridWrap = el('div', { class: 'cm-grid-wrap' });
      var gridPane = el('div', { style: { display: 'none' } }, gridWrap,
        U.btnrow(U.button('+ Row', function () { editGrid(function (t) { t.push(t[0].map(function () { return ''; })); }); }, 'ghost'),
          U.button('+ Column', function () { editGrid(function (t) { t.forEach(function (r, i) { r.push(i ? '' : 'Series ' + t[0].length); }); }); }, 'ghost')));
      var textPane = el('div', null, csv);
      var mode = U.chips([{ value: 'text', label: 'Text' }, { value: 'grid', label: 'Grid' }], function (v) {
        if (v === 'grid') buildGrid();
        textPane.style.display = v === 'text' ? '' : 'none';
        gridPane.style.display = v === 'grid' ? '' : 'none';
      }, 'text');

      function gridRows() {
        var t = readTable(csv.value);
        var rows = [t.head.length ? t.head : ['Label', 'Value']].concat(t.rows);
        if (rows.length < 2) rows.push(rows[0].map(function () { return ''; }));
        return rows;
      }
      function editGrid(fn) { var rows = gridRows(); fn(rows); csv.value = CSV.stringify(rows); buildGrid(); update(); }
      function buildGrid() {
        var rows = gridRows();
        var table = el('table', { class: 'cm-grid' },
          el('tr', el('th'), rows[0].map(function (_, c) {
            return el('th', null, String.fromCharCode(65 + (c % 26)), rows[0].length > 1 ? el('button', { class: 'cm-x', type: 'button', title: 'Remove column', text: '×',
              onclick: function () { editGrid(function (t) { t.forEach(function (r) { r.splice(c, 1); }); }); } }) : null);
          })),
          rows.map(function (r, ri) {
            return el('tr', null, el('th', null, ri ? String(ri) : '', ri && rows.length > 2 ? el('button', { class: 'cm-x', type: 'button', title: 'Remove row', text: '×',
              onclick: function () { editGrid(function (t) { t.splice(ri, 1); }); } }) : null),
            r.map(function (v, ci) {
              return el('td', el('input', { value: v, 'aria-label': (ri ? 'Row ' + ri : 'Header') + ', column ' + (ci + 1), oninput: function (e) {
                rows[ri][ci] = e.target.value; csv.value = CSV.stringify(rows); update();
              } }));
            }));
          }));
        gridWrap.replaceChildren(table);
      }

      var fileIn = el('input', { type: 'file', accept: '.csv,.tsv,.txt,text/csv,text/plain', style: { display: 'none' }, onchange: function () {
        var f = fileIn.files[0]; if (!f) return;
        U.readAs(f, 'text').then(function (t) { csv.value = t; resetColumns = true; if (mode.value === 'grid') buildGrid(); update(); });
        fileIn.value = '';
      } });

      /* ---- chart settings ---- */
      var type = U.chips(TYPES, function () { update(); }, 'bar');
      type.classList.add('cm-types');
      var labelSel = U.select({ label: 'Labels (x axis)', options: [] });
      var seriesBox = el('div', { class: 'cm-series' });
      var title = U.input({ label: 'Title', value: 'Sales by channel' });
      var xLabel = U.input({ label: 'X axis title', value: '' });
      var yLabel = U.input({ label: 'Y axis title', value: 'Sales (£)' });
      var palette = U.select({ label: 'Colours', value: 'standard', options: Object.keys(PALETTES).map(function (k) { return { value: k, label: PALETTES[k].label }; }) });
      var bgSel = U.select({ label: 'Background', value: dark ? 'dark' : 'light', options: Object.keys(BACKGROUNDS).map(function (k) { return { value: k, label: BACKGROUNDS[k].label }; }) });
      var width = U.input({ label: 'Width (px)', type: 'number', value: 800, min: 240, max: 4000 });
      var height = U.input({ label: 'Height (px)', type: 'number', value: 480, min: 180, max: 4000 });
      var legend = U.checkbox('Legend', { checked: true });
      var values = U.checkbox('Value labels');
      var gridLines = U.checkbox('Gridlines', { checked: true });
      var zero = U.checkbox('Start axis at zero', { checked: true });

      var stage = el('div', { class: 'cm-stage' });
      stage.dataset.k = 'chart';
      var status = U.note('');
      var svgText = '';
      var custom = {};            /* series name -> colour picked by hand */
      var chosen = null;          /* series names ticked, or null for "all numeric" */
      var resetColumns = true;
      var lastHead = '';

      function refreshColumns(table) {
        var head = table.head;
        var key = head.join('\u0001');
        if (key === lastHead && !resetColumns) return;
        var sel = labelSel.querySelector('select');
        var prevLabel = resetColumns ? null : sel.value;
        lastHead = key;
        sel.replaceChildren.apply(sel, head.map(function (h, i) { return el('option', { value: String(i), text: h }); }));
        /* Default label column: the first non-numeric one, else the first. */
        var def = head.findIndex(function (_, i) { return !isNumericCol(table, i); });
        sel.value = prevLabel !== null && +prevLabel < head.length ? prevLabel : String(def < 0 ? 0 : def);
        if (resetColumns) chosen = null;
        resetColumns = false;
      }

      function buildSeriesPicker(table, labelIdx, cols) {
        seriesBox.replaceChildren.apply(seriesBox, table.head.map(function (h, i) {
          if (i === labelIdx) return null;
          var numeric = isNumericCol(table, i);
          var on = cols.some(function (c) { return c.index === i; });
          var col = cols.filter(function (c) { return c.index === i; })[0];
          var box = el('input', { type: 'checkbox', checked: on, disabled: !numeric, onchange: function () {
            var names = table.head.filter(function (_, j) { return j !== labelIdx && isNumericCol(table, j); });
            chosen = (chosen || names.slice()).filter(function (n) { return n !== h; });
            if (box.checked) chosen.push(h);
            update();
          } });
          var colour = el('input', { type: 'color', value: col ? col.colour : '#888888', disabled: !numeric, title: 'Colour for ' + h, 'aria-label': 'Colour for ' + h, oninput: function () { custom[h] = colour.value; update(); } });
          return el('label', { class: 'cm-ser', title: numeric ? '' : 'Not a number column' }, box, colour, el('span', { text: h + (numeric ? '' : ' (text)') }));
        }).filter(Boolean));
      }

      function update() {
        var table = readTable(csv.value);
        status.className = 'note';
        status.textContent = '';
        if (!table.head.length || !table.rows.length) {
          svgText = '';
          stage.replaceChildren(el('p', { class: 'cm-muted', style: { padding: '24px', textAlign: 'center' }, text: 'Add a header row and at least one row of data.' }));
          seriesBox.replaceChildren();
          return;
        }
        refreshColumns(table);
        var labelIdx = +labelSel.querySelector('select').value || 0;
        var pal = PALETTES[palette.querySelector('select').value].colours;
        var t = type.value, round = t === 'pie' || t === 'doughnut';

        var numericCols = table.head.map(function (h, i) { return i; }).filter(function (i) { return i !== labelIdx && isNumericCol(table, i); });
        var picked = numericCols.filter(function (i) { return !chosen || chosen.indexOf(table.head[i]) > -1; });
        var cols = picked.map(function (i, k) {
          return { index: i, name: table.head[i], colour: custom[table.head[i]] || pal[numericCols.indexOf(i) % pal.length] };
        });
        buildSeriesPicker(table, labelIdx, cols);

        if (!cols.length) {
          svgText = '';
          stage.replaceChildren(el('p', { class: 'cm-muted', style: { padding: '24px', textAlign: 'center' }, text: 'Tick at least one column of numbers to plot.' }));
          return;
        }
        if (round && cols.length > 1) { status.textContent = 'Pie and doughnut charts show one series: using “' + cols[0].name + '”. Untick the others to choose.'; }

        var W = Math.max(240, Math.min(4000, +width.querySelector('input').value || 800));
        var H = Math.max(180, Math.min(4000, +height.querySelector('input').value || 480));
        var labels = table.rows.map(function (r) { return r[labelIdx]; });
        var opts = {
          type: t, width: W, height: H, bg: bgSel.querySelector('select').value,
          title: title.querySelector('input').value.trim(), xLabel: xLabel.querySelector('input').value.trim(), yLabel: yLabel.querySelector('input').value.trim(),
          legend: legend.input.checked, values: values.input.checked, grid: gridLines.input.checked, zero: zero.input.checked,
          labels: labels,
          xs: table.rows.map(function (r) { return parseNum(r[labelIdx]); }),
          series: (round ? cols.slice(0, 1) : cols).map(function (c) {
            return { name: c.name, colour: c.colour, values: table.rows.map(function (r) { return parseNum(r[c.index]); }) };
          }),
          sliceColours: labels.map(function (_, i) { return pal[i % pal.length]; })
        };
        /* A scatter with text labels plots the first ticked series against the rest. */
        if (t === 'scatter' && !isNumericCol(table, labelIdx)) {
          if (opts.series.length > 1) {
            var xs = opts.series.shift();
            opts.xs = xs.values;
            if (!opts.xLabel) opts.xLabel = xs.name;
            status.textContent = 'Plotting against “' + xs.name + '” on the x axis. To use another column, pick it under “Labels (x axis)”.';
          } else {
            status.className = 'note err';
            status.textContent = 'Scatter plots need two columns of numbers: tick another series, or pick a number column for “Labels (x axis)”.';
          }
        }
        svgText = draw(opts);
        stage.innerHTML = svgText;
        var skipped = 0;
        opts.series.forEach(function (s) { s.values.forEach(function (v) { if (!isFinite(v)) skipped++; }); });
        if (skipped && !status.textContent) status.textContent = skipped + ' empty or non-numeric ' + (skipped === 1 ? 'cell was' : 'cells were') + ' left out.';
      }

      csv.addEventListener('input', U.debounce(function () { update(); }, 200));
      U.live([labelSel, title, xLabel, yLabel, palette, bgSel, width, height, legend, values, gridLines, zero], update);
      labelSel.querySelector('select').addEventListener('change', function () { chosen = null; });
      palette.querySelector('select').addEventListener('change', function () { custom = {}; });

      function exportSvg() { return svgText ? '<?xml version="1.0" encoding="UTF-8"?>\n' + svgText : ''; }
      function dims() { var m = /width="(\d+)" height="(\d+)"/.exec(svgText); return m ? [+m[1], +m[2]] : [800, 480]; }

      var actions = U.btnrow(
        U.button('Download PNG', function () {
          if (!svgText) return U.toast('Nothing to download yet', 'err');
          var d = dims();
          svgToPng(svgText, d[0], d[1], 2).then(function (b) { U.saveBlob(fileBase(title.querySelector('input').value) + '.png', b); },
            function (e) { U.toast(e.message, 'err'); });
        }, 'primary'),
        U.button('Download SVG', function () {
          if (!svgText) return U.toast('Nothing to download yet', 'err');
          U.saveText(fileBase(title.querySelector('input').value) + '.svg', exportSvg(), 'image/svg+xml');
        }),
        U.copyBtn('Copy SVG', function () { return svgText; }));

      root.appendChild(U.split(
        U.panel('Data',
          el('div', { class: 'row', style: { alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' } }, mode,
            U.btnrow(U.button('Open CSV…', function () { fileIn.click(); }, 'ghost'),
              U.button('Sample', function () { csv.value = SAMPLE; resetColumns = true; custom = {}; if (mode.value === 'grid') buildGrid(); update(); }, 'ghost'),
              U.button('Clear', function () { csv.value = ''; resetColumns = true; if (mode.value === 'grid') buildGrid(); update(); }, 'ghost'))),
          textPane, gridPane, fileIn,
          U.note('First row = column names. One column holds the labels; every column of numbers can be a series.')),
        U.panel('Chart',
          type,
          el('div', { style: { height: '10px' } }),
          labelSel,
          el('div', { class: 'field' }, el('label', { text: 'Series' }), seriesBox),
          U.row(title),
          U.row(xLabel, yLabel),
          U.row(palette, bgSel),
          U.row(width, height),
          el('div', { class: 'row' }, legend, values, gridLines, zero))));
      root.appendChild(U.panel('Preview', stage, status, actions));

      update();
    }
  });
})();
