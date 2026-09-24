/* color-b tools: Tailwind Colour Palette, Data Visualisation Palette
   Generator and Colour-Blind Safe Palette Checker. The colour-space maths
   (OKLab/OKLCH, CIE Lab, gamut mapping, deltaE) comes from window.ColourKit
   in color.js. The Tailwind palette is assets/data/color-b-tailwind.json,
   generated from the official tailwindcss npm packages (v3.4.19 colors.js
   for v3 hex, v4.3.3 theme.css for v4 OKLCH; MIT licence, Tailwind Labs). */
(function () {
  'use strict';
  var U = window.UI, el = U.el;
  var K = window.ColourKit;

  if (!document.getElementById('g-colorb-style')) document.head.appendChild(el('style', { id: 'g-colorb-style', text: [
    '.g-colorb .tw-scroll{overflow-x:auto;padding:2px 2px 6px}',
    '.g-colorb .tw-grid{display:grid;gap:5px;min-width:560px}',
    '.g-colorb .tw-row{display:grid;grid-template-columns:70px repeat(11,minmax(34px,1fr));gap:4px;align-items:center}',
    '.g-colorb .tw-row.hidden{display:none}',
    '.g-colorb .tw-row > b{font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis}',
    '.g-colorb .tw-row > b small{display:block;font-weight:400;font-size:10px;color:var(--fg-muted)}',
    '.g-colorb .tw-head span{font-size:11px;color:var(--fg-muted);text-align:center}',
    '.g-colorb .tw-sw{height:38px;border-radius:6px;border:1px solid rgb(127 127 127 / 25%);cursor:pointer;font:inherit;font-size:10px;padding:0 0 3px;display:flex;align-items:flex-end;justify-content:center;min-width:0}',
    '.g-colorb .tw-sw span{opacity:0}',
    '.g-colorb .tw-sw:hover span,.g-colorb .tw-sw:focus-visible span,.g-colorb .tw-sw.on span{opacity:1}',
    '.g-colorb .tw-sw.dim{opacity:.12}',
    '.g-colorb .tw-sw.on{outline:2px solid var(--fg);outline-offset:2px}',
    '.g-colorb .tw-big{height:90px;border-radius:var(--radius);border:1px solid var(--border);display:flex;align-items:flex-end;padding:10px;font-weight:700}',
    '.g-colorb .near{display:grid;gap:6px;margin-top:10px}',
    '.g-colorb .near button{display:flex;gap:10px;align-items:center;border:1px solid var(--border);background:var(--bg-sunken);border-radius:var(--radius);padding:6px 10px;cursor:pointer;color:var(--fg);font:inherit;text-align:left}',
    '.g-colorb .near i{width:34px;height:26px;border-radius:5px;border:1px solid var(--border);flex:none}',
    '.g-colorb .near code{font-family:var(--mono);font-size:12px;color:var(--fg-muted)}',
    '.g-colorb .near .de{margin-left:auto;font-family:var(--mono);font-size:12px}',
    '.g-colorb .strip{display:flex;gap:4px}',
    '.g-colorb .strip i{flex:1 1 0;min-width:0;height:34px;border-radius:5px;border:1px solid rgb(127 127 127 / 25%)}',
    '.g-colorb .simrow{display:grid;grid-template-columns:minmax(110px,190px) 1fr;gap:10px;align-items:center;margin-bottom:8px}',
    '.g-colorb .simrow > span{font-size:13px}',
    '.g-colorb .simrow > span small{display:block;color:var(--fg-muted);font-size:12px}',
    '.g-colorb .dv-sws{display:flex;gap:6px;flex-wrap:wrap}',
    '.g-colorb .dv-sw{flex:1 1 64px;min-width:58px;border:1px solid var(--border);border-radius:var(--radius);padding:5px;background:var(--bg-elev);cursor:pointer;font:inherit;color:var(--fg);text-align:left}',
    '.g-colorb .dv-sw i{display:block;height:46px;border-radius:5px;margin-bottom:4px}',
    '.g-colorb .dv-sw code{display:block;font-family:var(--mono);font-size:11px}',
    '.g-colorb .dv-sw small{display:block;font-size:10px;color:var(--fg-muted)}',
    '.g-colorb .chart{width:100%;max-width:560px;height:auto;display:block;border-radius:var(--radius);border:1px solid var(--border)}',
    '.g-colorb .charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}',
    '.g-colorb .verdict{font-weight:700}',
    '.g-colorb .verdict.ok{color:var(--ok)}',
    '.g-colorb .verdict.warn{color:var(--warn)}',
    '.g-colorb .verdict.bad{color:var(--err)}',
    '.g-colorb .grid2{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}',
    '.g-colorb table.matrix{border-collapse:separate;border-spacing:3px;font-size:12px}',
    '.g-colorb table.matrix th{font-weight:600;font-size:11px;color:var(--fg-muted);padding:2px}',
    '.g-colorb table.matrix th i{display:block;width:30px;height:18px;border-radius:4px;border:1px solid rgb(127 127 127 / 30%);margin:0 auto 2px}',
    '.g-colorb table.matrix td{font-family:var(--mono);text-align:center;padding:6px 5px;border-radius:5px;background:var(--bg-sunken);min-width:46px}',
    '.g-colorb table.matrix td.bad{background:color-mix(in srgb,var(--err) 20%,transparent);color:var(--err);font-weight:700}',
    '.g-colorb table.matrix td.self{background:transparent}',
    '.g-colorb .problems li{margin-bottom:10px}',
    '.g-colorb .problems .fix{display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:4px}',
    '.g-colorb .problems .fix i{display:inline-block;width:18px;height:18px;border-radius:4px;border:1px solid var(--border);vertical-align:middle}',
    '.g-colorb .checks{display:flex;flex-wrap:wrap;gap:6px 16px}',
    '.g-colorb textarea.cb-list{min-height:120px}'
  ].join('\n') }));

  /* --- shared helpers ------------------------------------------------------- */

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function hex01(rgb) { return K.hex(K.from01(K.gamutMap(rgb))); }
  function num(v, dp) { return K.num(v, dp); }
  function rgbText(rgb) { var c = K.from01(K.gamutMap(rgb)); return 'rgb(' + c.r + ', ' + c.g + ', ' + c.b + ')'; }
  function hslText(rgb) { var c = K.from01(K.gamutMap(rgb)), h = K.rgbToHsl(c); return 'hsl(' + Math.round(h.h) % 360 + ', ' + Math.round(h.s) + '%, ' + Math.round(h.l) + '%)'; }
  function inkOn(rgb) { return K.toOklab(K.clip(rgb))[0] > 0.62 ? '#000000' : '#ffffff'; }
  /* OKLab distance x 100 (about 2 is just noticeable), the scale used by data-viz guidance. */
  function dOK(a, b) { return 100 * K.deltaEOK(K.toOklab(a), K.toOklab(b)); }
  function d2000(a, b) { return K.deltaE2000(K.toLab65(a), K.toLab65(b)); }

  /* Splits a pasted list of colours on newlines, commas, semicolons or spaces,
     but not inside rgb(...) and friends. */
  function splitColours(text) {
    var out = [], cur = '', depth = 0;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ch === '(') depth++;
      if (ch === ')') depth = Math.max(0, depth - 1);
      if (depth === 0 && /[\s,;]/.test(ch)) { if (cur.trim()) out.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  /* --- colour-vision deficiency simulation ------------------------------------- */

  /* Machado, Oliveira & Fernandes (2009), "A Physiologically-based Model for
     Simulation of Color Vision Deficiency", severity 1.0 matrices, applied to
     linear sRGB and clamped. Achromatopsia keeps only relative luminance. */
  var MACHADO = {
    protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]]
  };
  var VISIONS = [
    { key: 'normal', label: 'Normal vision', short: 'N', note: 'as designed' },
    { key: 'protanopia', label: 'Protanopia', short: 'P', note: 'no red cones, about 1% of men' },
    { key: 'deuteranopia', label: 'Deuteranopia', short: 'D', note: 'no green cones, about 1% of men' },
    { key: 'tritanopia', label: 'Tritanopia', short: 'T', note: 'no blue cones, rare' },
    { key: 'achromatopsia', label: 'Achromatopsia', short: 'A', note: 'no colour at all, very rare' }
  ];
  function simulate(rgb, type) {
    if (type === 'normal') return K.clip(rgb);
    var l = K.linear(K.clip(rgb)), o;
    if (type === 'achromatopsia') {
      var y = 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
      o = [y, y, y];
    } else {
      var M = MACHADO[type];
      o = [0, 1, 2].map(function (i) { return M[i][0] * l[0] + M[i][1] * l[1] + M[i][2] * l[2]; });
    }
    return K.unlinear(o.map(function (v) { return clamp(v, 0, 1); }));
  }

  /* --- Tailwind palette data -------------------------------------------------- */

  var twPromise = null;
  function loadTailwind() {
    if (!twPromise) {
      twPromise = fetch('assets/data/color-b-tailwind.json').then(function (r) {
        if (!r.ok) throw new Error('Could not load the Tailwind palette (HTTP ' + r.status + ')');
        return r.json();
      }).then(prepareTailwind).catch(function (err) { twPromise = null; throw err; });
    }
    return twPromise;
  }
  /* Each shade gets its official value plus precise sRGB (v4 colours can sit
     outside sRGB, so their HEX is gamut-mapped, as a browser would). */
  function prepareTailwind(data) {
    function entry(name, shade, v3, v4) {
      var e = { name: shade ? name + '-' + shade : name, family: name, shade: shade };
      if (v3) { var p3 = K.parseCss(v3); e.v3 = { css: v3.length === 4 ? K.hex(K.from01(p3.rgb)) : v3, rgb: p3.rgb, hex: K.hex(K.from01(p3.rgb)), ok: K.toOklab(p3.rgb) }; }
      if (v4) {
        var p4 = K.parseCss(v4);
        e.v4 = { css: v4.length === 4 ? K.hex(K.from01(p4.rgb)) : v4, rgb: p4.rgb, hex: hex01(p4.rgb), ok: K.toOklab(p4.rgb), outside: !K.inGamut(p4.rgb) };
      }
      return e;
    }
    return {
      source: data.source,
      shades: data.shades,
      families: data.colors.map(function (c) {
        return { name: c.name, v4only: !c.v3, shades: data.shades.map(function (s, i) { return entry(c.name, s, c.v3 && c.v3[i], c.v4[i]); }) };
      }),
      extras: [entry('black', null, data.black.v3, data.black.v4), entry('white', null, data.white.v3, data.white.v4)]
    };
  }
  function twAll(tw, version) {
    var list = [];
    tw.families.forEach(function (f) { f.shades.forEach(function (s) { if (s[version]) list.push(s); }); });
    return list.concat(tw.extras);
  }

  /* --- Tailwind Colour Palette ------------------------------------------------ */

  Tools.register({
    id: 'tailwind-colors', category: 'color', name: 'Tailwind Colour Palette',
    description: 'Browse the default Tailwind CSS palette in v4 OKLCH and v3 HEX, copy any shade as a class, HEX, RGB, HSL, OKLCH or CSS variable, and find the nearest Tailwind colour to any colour.',
    keywords: ['tailwind', 'tailwindcss', 'tailwind colors', 'tailwind colours', 'palette', 'swatches', 'shades', 'oklch', 'hex', 'class',
      'utility', 'bg', 'text', 'nearest', 'closest', 'design tokens', 'css variables', 'v3', 'v4', 'color', 'colour', 'slate', 'zinc'],
    render: function (root) {
      root.classList.add('g-color', 'g-colorb');
      if (!K) { root.appendChild(U.note('The colour maths module did not load.', 'err')); return; }
      var tw = null, version = 'v4', format = 'class', selected = null;
      var search = el('input', { type: 'search', placeholder: 'Search: blue, sky-300, 500 or #3b82f6', 'aria-label': 'Search colours', spellcheck: false });
      var count = el('p', { class: 'note', dataset: { k: 'count' } });
      var status = el('p', { class: 'note', dataset: { k: 'copied' } }, 'Click a swatch to copy it.');
      var grid = el('div', { class: 'tw-grid' }, U.note('Loading the palette…'));
      var detail = el('div', {}, U.note('Pick a swatch to see all of its values.'));
      var nearList = el('div', { class: 'near' });
      var prefix = U.select({ label: 'Class prefix', options: ['bg', 'text', 'border', 'ring', 'outline', 'fill', 'stroke', 'from', 'via', 'to',
        'decoration', 'shadow', 'accent', 'caret', 'divide', 'placeholder'], value: 'bg' });
      var prefixSel = prefix.querySelector('select');
      var versionChips = U.chips([{ value: 'v4', label: 'v4 (OKLCH)' }, { value: 'v3', label: 'v3 (HEX)' }], function (v) {
        version = v;
        if (selected && !selected[version]) selected = null;
        draw(); showDetail(); nearest();
      }, 'v4');
      var formatChips = U.chips([{ value: 'class', label: 'Class' }, { value: 'hex', label: 'HEX' }, { value: 'rgb', label: 'RGB' },
        { value: 'hsl', label: 'HSL' }, { value: 'oklch', label: 'OKLCH' }, { value: 'var', label: 'CSS variable' }], function (v) { format = v; }, 'class');
      var nearText = el('input', { type: 'text', value: '#3b82f6', spellcheck: false, 'aria-label': 'Colour to match', class: 'mono' });
      var nearPick = el('input', { type: 'color', value: '#3b82f6', 'aria-label': 'Pick a colour to match' });

      function valueOf(e, fmt, ver) {
        var v = e[ver || version];
        if (!v) return '';
        switch (fmt) {
          case 'class': return prefixSel.value + '-' + e.name;
          case 'hex': return v.hex;
          case 'rgb': return rgbText(v.rgb);
          case 'hsl': return hslText(v.rgb);
          case 'oklch': return (ver || version) === 'v4' && /^oklch/.test(v.css) ? v.css : K.cssOklch(v.rgb);
          default: return '--color-' + e.name + ': ' + ((ver || version) === 'v4' ? v.css : v.hex) + ';';
        }
      }

      function copyEntry(e) {
        var text = valueOf(e, format);
        U.copy(text);
        status.textContent = 'Copied ' + text;
        selected = e;
        showDetail();
        Array.prototype.forEach.call(grid.querySelectorAll('.tw-sw'), function (b) { b.classList.toggle('on', b.dataset.name === e.name); });
      }

      function swatchFor(e) {
        var v = e[version];
        var b = el('button', {
          type: 'button', class: 'tw-sw', title: e.name + ' ' + (version === 'v4' ? v.css + ' ≈ ' + v.hex : v.hex),
          dataset: { name: e.name, hex: v.hex, oklch: version === 'v4' ? v.css : K.cssOklch(v.rgb) },
          style: { background: version === 'v4' ? v.css : v.hex, color: inkOn(v.rgb) },
          onclick: function () { copyEntry(e); }
        }, el('span', { text: e.shade || e.name }));
        if (selected && selected.name === e.name) b.classList.add('on');
        return b;
      }

      function draw() {
        if (!tw) return;
        var rows = [el('div', { class: 'tw-row tw-head' }, el('span'), tw.shades.map(function (s) { return el('span', { text: s }); }))];
        tw.families.forEach(function (f) {
          if (!f.shades[0][version]) return;
          rows.push(el('div', { class: 'tw-row', dataset: { family: f.name } },
            el('b', { text: f.name }, f.v4only ? el('small', { text: 'v4.2+' }) : null), f.shades.map(swatchFor)));
        });
        rows.push(el('div', { class: 'tw-row', dataset: { family: 'black white' } }, el('b', { text: 'black · white' }), tw.extras.map(swatchFor)));
        grid.replaceChildren.apply(grid, rows);
        filter();
      }

      function filter() {
        var q = search.value.trim().toLowerCase().replace(/\s+/g, '-');
        var hexq = q.replace(/^#/, ''), hits = 0;
        Array.prototype.forEach.call(grid.querySelectorAll('.tw-row[data-family]'), function (row) {
          var any = false;
          Array.prototype.forEach.call(row.querySelectorAll('.tw-sw'), function (b) {
            var match = !q || b.dataset.name.indexOf(q) > -1 || (hexq.length >= 3 && b.dataset.hex.slice(1).indexOf(hexq) === 0);
            b.classList.toggle('dim', !match);
            if (match) { any = true; hits++; }
          });
          row.classList.toggle('hidden', !any);
        });
        count.textContent = q ? hits + (hits === 1 ? ' match' : ' matches') : twAll(tw, version).length + ' colours in the ' + version + ' palette';
      }

      function showDetail() {
        if (!selected || !tw) { detail.replaceChildren(U.note('Pick a swatch to see all of its values.')); return; }
        var e = selected, v = e[version];
        var tiles = el('div', { class: 'kv' },
          ['class', 'hex', 'rgb', 'hsl', 'oklch', 'var'].map(function (f) {
            var label = { class: 'Class', hex: 'HEX', rgb: 'RGB', hsl: 'HSL', oklch: 'OKLCH', var: 'CSS variable' }[f];
            var value = valueOf(e, f);
            return el('button', { type: 'button', title: 'Copy', dataset: { key: f }, onclick: function () { U.copy(value); status.textContent = 'Copied ' + value; } },
              el('b', { text: label }), el('code', { text: value }));
          }));
        var notes = [];
        if (version === 'v4') {
          notes.push('In Tailwind v4 this colour is var(--color-' + e.name + ').');
          if (v.outside) notes.push('Its OKLCH value is outside sRGB, so HEX, RGB and HSL are the nearest sRGB colour (CSS gamut mapping); wide-gamut screens show it more saturated.');
        }
        if (e.v3 && e.v4) {
          notes.push('v3 ' + e.name + ' is ' + e.v3.hex + '; v4 is ' + e.v4.css + ' (ΔE OK ' + num(dOK(e.v3.rgb, e.v4.rgb), 1) + ' apart).');
        } else if (!e.v3) notes.push('Added in Tailwind v4.2; there is no v3 equivalent.');
        detail.replaceChildren(
          el('div', { class: 'tw-big', style: { background: version === 'v4' ? v.css : v.hex, color: inkOn(v.rgb) }, dataset: { k: 'selected' }, text: e.name }),
          tiles, U.note(notes.join(' ')));
      }

      function nearest() {
        if (!tw) return;
        var p = K.parseCss(nearText.value);
        if (!p) { nearText.style.borderColor = 'var(--err)'; return; }
        nearText.style.borderColor = '';
        nearPick.value = hex01(p.rgb);
        var target = K.toOklab(p.rgb);
        var ranked = twAll(tw, version).map(function (e) { return { e: e, d: 100 * K.deltaEOK(target, e[version].ok) }; })
          .sort(function (a, b) { return a.d - b.d; }).slice(0, 5);
        nearList.replaceChildren.apply(nearList, ranked.map(function (r, i) {
          var v = r.e[version];
          return el('button', { type: 'button', dataset: { name: r.e.name, de: num(r.d, 2) }, onclick: function () { copyEntry(r.e); } },
            el('i', { style: { background: version === 'v4' ? v.css : v.hex } }),
            el('span', {}, el('b', { text: r.e.name + (i === 0 ? ' (closest)' : '') }), el('br'), el('code', { text: version === 'v4' ? v.css : v.hex })),
            el('span', { class: 'de', text: 'ΔE ' + num(r.d, 2) }));
        }));
      }

      search.addEventListener('input', filter);
      prefixSel.addEventListener('change', showDetail);
      nearText.addEventListener('input', U.debounce(nearest, 120));
      nearPick.addEventListener('input', function () { nearText.value = nearPick.value; nearest(); });

      root.appendChild(U.panel('Palette',
        U.row(el('div', { class: 'field grow' }, el('label', { text: 'Search' }), search), el('div', { class: 'field' }, el('label', { text: 'Version' }), versionChips)),
        U.row(el('div', { class: 'field grow' }, el('label', { text: 'Click copies' }), formatChips), prefix),
        count, el('div', { class: 'tw-scroll' }, grid), status));
      root.appendChild(U.panel('Selected colour', detail));
      root.appendChild(U.panel('Nearest Tailwind colour', el('div', { class: 'pick' }, nearPick, nearText), nearList,
        U.note('Distance is ΔE OK: the straight-line distance in OKLab × 100, where about 2 is just noticeable. It compares against the ' +
          'palette version chosen above.')));
      root.appendChild(U.note('Tailwind CSS default palette (MIT licence, Tailwind Labs): v3 values from tailwindcss 3.4, v4 values from tailwindcss 4.3.'));

      loadTailwind().then(function (data) {
        tw = data;
        draw();
        nearest();
      }).catch(function (err) {
        grid.replaceChildren(U.note(err.message + '. Open the toolbox through serve.py (http://) rather than from a file.', 'err'));
      });
    }
  });

  /* --- Data Visualisation Palette Generator ------------------------------------- */

  var DV_PRESETS = [
    { label: 'Blues (sequential)', o: { type: 'seq1', base: '#2563eb', lMin: 28, lMax: 96, cMax: 0.17 } },
    { label: 'Greens (sequential)', o: { type: 'seq1', base: '#15803d', lMin: 30, lMax: 96, cMax: 0.16 } },
    { label: 'Oranges (sequential)', o: { type: 'seq1', base: '#ea580c', lMin: 36, lMax: 96, cMax: 0.17 } },
    { label: 'Viridis-like (multi-hue)', o: { type: 'seqm', base: '#440154', lMin: 28, lMax: 93, cMax: 0.16, shift: -195 } },
    { label: 'Magma-like (multi-hue)', o: { type: 'seqm', base: '#3b0f70', lMin: 22, lMax: 94, cMax: 0.17, shift: 160 } },
    { label: 'Yellow–green–blue (multi-hue)', o: { type: 'seqm', base: '#1e3a8a', lMin: 30, lMax: 96, cMax: 0.15, shift: -150 } },
    { label: 'Blue–red (diverging)', o: { type: 'div', base: '#2563eb', second: '#dc2626', lMin: 38, lMax: 96, cMax: 0.17 } },
    { label: 'Purple–green (diverging)', o: { type: 'div', base: '#7e22ce', second: '#15803d', lMin: 38, lMax: 96, cMax: 0.15 } },
    { label: 'Brown–teal (diverging)', o: { type: 'div', base: '#92400e', second: '#0f766e', lMin: 36, lMax: 96, cMax: 0.12 } },
    { label: 'Categorical, bright', o: { type: 'cat', base: '#e11d48', catL: 65, catC: 0.15 } },
    { label: 'Categorical, muted', o: { type: 'cat', base: '#be123c', catL: 60, catC: 0.09 } },
    { label: 'Categorical, pastel', o: { type: 'cat', base: '#fb7185', catL: 82, catC: 0.08 } }
  ];

  /* Largest in-gamut OKLCH chroma for a lightness and hue (binary search). */
  function maxChroma(L, H) {
    var lo = 0, hi = 0.4;
    for (var i = 0; i < 24; i++) {
      var mid = (lo + hi) / 2;
      if (K.inGamut(K.fromOklch([L, mid, H]))) lo = mid; else hi = mid;
    }
    return lo;
  }
  function baseHue(text, fallback) {
    var p = K.parseCss(text);
    if (!p) return fallback;
    var h = K.toOklch(p.rgb)[2];
    return isNaN(h) ? fallback : h;
  }
  /* Categorical hues are spread so neighbours in the list differ a lot:
     step round the wheel by a stride that shares no factor with n. */
  function spreadOrder(n) {
    if (n < 4) return Array.from({ length: n }, function (_, i) { return i; });
    var stride = Math.round(n * 0.382);
    function gcd(a, b) { return b ? gcd(b, a % b) : a; }
    while (gcd(stride, n) !== 1) stride++;
    return Array.from({ length: n }, function (_, i) { return (i * stride) % n; });
  }

  /* Builds the palette in OKLCH. Sequential and diverging palettes use even
     lightness steps; the chroma follows a gentle arch so the light end stays
     soft; gamut mapping lowers chroma only, so the lightness steps survive. */
  function makePalette(o) {
    var n = clamp(Math.round(o.n) || 2, 2, 16), target = [], i;
    var h0 = baseHue(o.base, 250), lMin = o.lMin / 100, lMax = o.lMax / 100;
    if (o.type === 'seq1' || o.type === 'seqm') {
      for (i = 0; i < n; i++) {
        var u = i / (n - 1);
        target.push([lMax - u * (lMax - lMin), o.cMax * (0.35 + 0.65 * Math.sin(Math.PI * (0.12 + 0.76 * u))),
          ((o.type === 'seqm' ? h0 + o.shift * (1 - u) : h0) % 360 + 360) % 360]);
      }
    } else if (o.type === 'div') {
      var h1 = baseHue(o.second, (h0 + 180) % 360);
      for (i = 0; i < n; i++) {
        var p = i / (n - 1), d = Math.abs(2 * p - 1);
        target.push([lMax - d * (lMax - lMin), o.cMax * Math.pow(d, 0.8), p < 0.5 ? h0 : h1]);
      }
    } else {
      var hues = [];
      for (i = 0; i < n; i++) hues.push((h0 + i * 360 / n) % 360);
      if (o.order === 'spread') hues = spreadOrder(n).map(function (k) { return hues[k]; });
      var L = o.catL / 100, C = o.catC;
      if (o.uniform) C = Math.min(C, Math.min.apply(null, hues.map(function (h) { return maxChroma(L, h); })));
      hues.forEach(function (h) { target.push([L, C, h]); });
    }
    if (o.reverse) target.reverse();
    return target.map(function (t) {
      /* Lower chroma until the colour is inside sRGB: lightness and hue stay exact. */
      var fit = [t[0], Math.min(t[1], maxChroma(t[0], t[2])), t[2]];
      var rgb = K.clip(K.fromOklch(fit)), c8 = K.from01(rgb), exact = K.to01(c8);
      return { target: t, rgb: exact, hex: K.hex(c8), lch: K.toOklch(exact) };
    });
  }

  function svgEl(tag, attrs, kids) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (k) { if (k) node.appendChild(typeof k === 'string' ? document.createTextNode(k) : k); });
    return node;
  }

  /* Deterministic sample data so the preview doesn't jump on every change. */
  function sampleValue(i, j) { var x = Math.sin((i + 1) * 12.9898 + (j + 1) * 78.233) * 43758.5453; return x - Math.floor(x); }

  function barChart(pal, dark) {
    var W = 360, H = 200, pad = 26, n = pal.length, gap = 2, bw = (W - pad * 2) / n;
    var bg = dark ? '#16181f' : '#ffffff', ink = dark ? '#9aa2b8' : '#5d6478';
    var kids = [svgEl('rect', { x: 0, y: 0, width: W, height: H, fill: bg }),
      svgEl('line', { x1: pad, y1: H - pad, x2: W - pad, y2: H - pad, stroke: ink, 'stroke-width': 1 })];
    pal.forEach(function (c, i) {
      var v = 0.25 + 0.75 * sampleValue(i, 1), h = (H - pad * 2) * v;
      kids.push(svgEl('rect', { x: pad + i * bw + gap / 2, y: H - pad - h, width: Math.max(1, bw - gap), height: h, rx: 3, fill: c.hex }));
    });
    kids.push(svgEl('text', { x: pad, y: 16, 'font-size': 11, fill: ink }, ['Bars']));
    return svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img', 'aria-label': 'Sample bar chart in the palette' }, kids);
  }

  function lineChart(pal, dark) {
    var W = 360, H = 200, pad = 26, pts = 9;
    var bg = dark ? '#16181f' : '#ffffff', ink = dark ? '#9aa2b8' : '#5d6478';
    var kids = [svgEl('rect', { x: 0, y: 0, width: W, height: H, fill: bg })];
    pal.slice(0, 10).forEach(function (c, s) {
      var d = '';
      for (var i = 0; i < pts; i++) {
        var x = pad + i * (W - pad * 2) / (pts - 1);
        var y = pad + (H - pad * 2) * (0.1 + 0.8 * (0.6 * sampleValue(i, s + 3) + 0.4 * (s / Math.max(1, pal.length - 1))));
        d += (i ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      kids.push(svgEl('path', { d: d, fill: 'none', stroke: bg, 'stroke-width': 5, 'stroke-linejoin': 'round' }));
      kids.push(svgEl('path', { d: d, fill: 'none', stroke: c.hex, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    });
    kids.push(svgEl('text', { x: pad, y: 16, 'font-size': 11, fill: ink }, ['Lines' + (pal.length > 10 ? ' (first 10)' : '')]));
    return svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img', 'aria-label': 'Sample line chart in the palette' }, kids);
  }

  function lightnessChart(pal) {
    var W = 360, H = 190, padL = 34, pad = 16, n = pal.length;
    function x(i) { return padL + (n === 1 ? 0 : i * (W - padL - pad) / (n - 1)); }
    function y(v) { return pad + (1 - v) * (H - pad * 2); }
    var kids = [];
    [0, 0.25, 0.5, 0.75, 1].forEach(function (g) {
      kids.push(svgEl('line', { x1: padL, y1: y(g), x2: W - pad, y2: y(g), stroke: 'currentColor', 'stroke-opacity': 0.15 }));
      kids.push(svgEl('text', { x: 4, y: y(g) + 4, 'font-size': 10, fill: 'currentColor', 'fill-opacity': 0.7 }, [String(g * 100) + '%']));
    });
    var line = pal.map(function (c, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(c.lch[0]).toFixed(1); }).join(' ');
    var chroma = pal.map(function (c, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(c.lch[1] / 0.4).toFixed(1); }).join(' ');
    kids.push(svgEl('path', { d: chroma, fill: 'none', stroke: 'currentColor', 'stroke-opacity': 0.5, 'stroke-dasharray': '4 4', 'stroke-width': 1.5 }));
    kids.push(svgEl('path', { d: line, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }));
    pal.forEach(function (c, i) { kids.push(svgEl('circle', { cx: x(i), cy: y(c.lch[0]), r: 6, fill: c.hex, stroke: 'currentColor', 'stroke-width': 1 })); });
    return svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img', 'aria-label': 'OKLCH lightness (solid) and chroma (dashed) of each colour' }, kids);
  }

  /* Minimum distance over neighbouring pairs and over all pairs, per vision type. */
  function distances(rgbs, type) {
    var sims = rgbs.map(function (c) { return simulate(c, type); }), adj = Infinity, all = Infinity, worst = null;
    for (var i = 0; i < sims.length; i++) {
      for (var j = i + 1; j < sims.length; j++) {
        var d = dOK(sims[i], sims[j]);
        if (j === i + 1) adj = Math.min(adj, d);
        if (d < all) { all = d; worst = [i, j]; }
      }
    }
    return { sims: sims, adjacent: adj, all: all, worst: worst };
  }

  Tools.register({
    id: 'data-viz-palette', category: 'color', name: 'Data Visualisation Palette Generator',
    description: 'Generate sequential, diverging and categorical chart palettes in OKLCH with even lightness steps, preview them on charts, check them for colour blindness and export CSS, JSON or SVG.',
    keywords: ['data visualisation', 'data visualization', 'dataviz', 'chart colours', 'chart colors', 'palette', 'sequential', 'diverging',
      'categorical', 'qualitative', 'oklch', 'colour scale', 'color scale', 'colour ramp', 'colorblind', 'colour blind', 'viridis', 'heatmap',
      'choropleth', 'd3', 'graph colours', 'color', 'colour'],
    render: function (root) {
      root.classList.add('g-color', 'g-colorb');
      if (!K) { root.appendChild(U.note('The colour maths module did not load.', 'err')); return; }
      var o = { type: 'seq1', n: 7, base: '#2563eb', second: '#dc2626', lMin: 28, lMax: 96, cMax: 0.17, shift: -150,
        catL: 65, catC: 0.15, uniform: true, order: 'spread', reverse: false };
      var pal = [], dark = false;

      function numInput(label, key, min, max, step, hint) {
        var inp = el('input', { type: 'number', min: min, max: max, step: step, value: o[key], dataset: { k: key } });
        inp.addEventListener('input', function () { var v = parseFloat(inp.value); if (!isNaN(v)) { o[key] = clamp(v, min, max); update(); } });
        var f = U.field(label, inp, hint);
        f.input = inp;
        return f;
      }
      function colourInput(label, key) {
        var pick = el('input', { type: 'color', value: o[key], 'aria-label': label });
        var txt = el('input', { type: 'text', value: o[key], spellcheck: false, class: 'mono', dataset: { k: key }, 'aria-label': label + ' value' });
        pick.addEventListener('input', function () { txt.value = pick.value; o[key] = pick.value; update(); });
        txt.addEventListener('input', function () {
          var p = K.parseCss(txt.value);
          txt.style.borderColor = p ? '' : 'var(--err)';
          if (p) { o[key] = txt.value.trim(); pick.value = hex01(p.rgb); update(); }
        });
        var f = el('div', { class: 'field' }, el('label', { text: label }), el('div', { class: 'pick' }, pick, txt));
        f.set = function (v) { txt.value = v; pick.value = hex01(K.parseCss(v).rgb); };
        return f;
      }

      var typeChips = U.chips([{ value: 'seq1', label: 'Sequential (one hue)' }, { value: 'seqm', label: 'Sequential (multi-hue)' },
        { value: 'div', label: 'Diverging' }, { value: 'cat', label: 'Categorical' }], function (v) { o.type = v; update(); }, o.type);
      var presetSel = U.select({ label: 'Preset', options: [{ value: '', label: 'Choose a preset…' }].concat(DV_PRESETS.map(function (p, i) { return { value: String(i), label: p.label }; })) });
      var baseIn = colourInput('Base colour', 'base');
      var secondIn = colourInput('Second colour (right arm)', 'second');
      var nIn = numInput('Colours', 'n', 2, 16, 1);
      var lMinIn = numInput('Darkest L (%)', 'lMin', 5, 95, 1);
      var lMaxIn = numInput('Lightest L (%)', 'lMax', 10, 99, 1);
      var cMaxIn = numInput('Peak chroma', 'cMax', 0, 0.37, 0.01, 'OKLCH C, 0 to 0.37');
      var shiftIn = numInput('Hue shift (°)', 'shift', -360, 360, 5, 'Hue turn from the dark end to the light end');
      var catLIn = numInput('Lightness (%)', 'catL', 10, 95, 1);
      var catCIn = numInput('Chroma', 'catC', 0, 0.37, 0.01);
      var uniform = U.checkbox('Same chroma for every hue', { checked: true });
      var orderChips = U.chips([{ value: 'spread', label: 'Spread hues apart' }, { value: 'wheel', label: 'Round the wheel' }], function (v) { o.order = v; update(); }, 'spread');
      var reverse = U.checkbox('Reverse order');
      var prefixIn = el('input', { type: 'text', value: 'viz', spellcheck: false, 'aria-label': 'CSS variable prefix', class: 'mono' });
      uniform.input.addEventListener('change', function () { o.uniform = uniform.input.checked; update(); });
      reverse.input.addEventListener('change', function () { o.reverse = reverse.input.checked; update(); });
      prefixIn.addEventListener('input', function () { exports(); });
      presetSel.querySelector('select').addEventListener('change', function () {
        var p = DV_PRESETS[+this.value];
        if (!p) return;
        Object.keys(p.o).forEach(function (k) { o[k] = p.o[k]; });
        typeChips.querySelectorAll('.chip').forEach(function (c, i) { c.classList.toggle('on', ['seq1', 'seqm', 'div', 'cat'][i] === o.type); });
        typeChips.value = o.type;
        baseIn.set(o.base);
        if (p.o.second) secondIn.set(o.second);
        [[lMinIn, 'lMin'], [lMaxIn, 'lMax'], [cMaxIn, 'cMax'], [shiftIn, 'shift'], [catLIn, 'catL'], [catCIn, 'catC']].forEach(function (x) { x[0].input.value = o[x[1]]; });
        update();
      });

      var swRow = el('div', { class: 'dv-sws' });
      var charts = el('div', { class: 'charts' });
      var bgChips = U.chips([{ value: 'light', label: 'Light background' }, { value: 'dark', label: 'Dark background' }], function (v) { dark = v === 'dark'; drawCharts(); }, 'light');
      var lightBox = el('div');
      var lightNote = el('p', { class: 'note', dataset: { k: 'lsteps' } });
      var sims = el('div');
      var stats = el('div');
      var verdict = el('p', { class: 'verdict', dataset: { k: 'verdict' } });
      var cssOut = U.out(''), jsonOut = U.out('');
      cssOut.dataset.k = 'css'; jsonOut.dataset.k = 'json';
      var seqFields = el('div', { class: 'grid2' }, lMinIn, lMaxIn, cMaxIn, shiftIn);
      var catFields = el('div', { class: 'grid2' }, catLIn, catCIn);
      var catExtras = el('div', { class: 'stack' }, uniform, orderChips);

      function drawCharts() { charts.replaceChildren(barChart(pal, dark), lineChart(pal, dark)); }

      function svgFile() {
        var w = 80, H = 110, parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="' + (pal.length * w) + '" height="' + H + '" viewBox="0 0 ' + (pal.length * w) + ' ' + H + '">'];
        pal.forEach(function (c, i) {
          parts.push('  <rect x="' + (i * w) + '" y="0" width="' + w + '" height="80" fill="' + c.hex + '"/>');
          parts.push('  <text x="' + (i * w + w / 2) + '" y="98" font-family="monospace" font-size="12" text-anchor="middle" fill="#333">' + c.hex + '</text>');
        });
        parts.push('</svg>');
        return parts.join('\n') + '\n';
      }

      function exports() {
        var pre = (prefixIn.value.trim().replace(/[^a-zA-Z0-9_-]/g, '') || 'viz');
        cssOut.textContent = ':root {\n' + pal.map(function (c, i) {
          return '  --' + pre + '-' + (i + 1) + ': ' + c.hex + '; /* ' + K.cssOklch(c.rgb) + ' */';
        }).join('\n') + '\n}';
        jsonOut.textContent = JSON.stringify({
          type: { seq1: 'sequential', seqm: 'sequential-multi-hue', div: 'diverging', cat: 'categorical' }[o.type],
          colors: pal.map(function (c) { return c.hex; }),
          oklch: pal.map(function (c) { return [+num(c.lch[0], 4), +num(c.lch[1], 4), isNaN(c.lch[2]) ? null : +num(c.lch[2], 2)]; })
        }, null, 2).replace(/\[\s+(-?[\d.]+|null),\s+(-?[\d.]+|null),\s+(-?[\d.]+|null)\s+\]/g, '[$1, $2, $3]');
      }

      function update() {
        var cat = o.type === 'cat';
        secondIn.style.display = o.type === 'div' ? '' : 'none';
        seqFields.style.display = cat ? 'none' : '';
        shiftIn.style.display = o.type === 'seqm' ? '' : 'none';
        catFields.style.display = cat ? '' : 'none';
        catExtras.style.display = cat ? '' : 'none';
        pal = makePalette(o);
        swRow.replaceChildren.apply(swRow, pal.map(function (c, i) {
          return el('button', { type: 'button', class: 'dv-sw', title: 'Copy ' + c.hex,
            dataset: { hex: c.hex, l: num(c.lch[0], 4), c: num(c.lch[1], 4), h: isNaN(c.lch[2]) ? '' : num(c.lch[2], 2) },
            onclick: function () { U.copy(c.hex); } },
            el('i', { style: { background: c.hex } }), el('code', { text: c.hex }), el('small', { text: (i + 1) + ' · L ' + num(c.lch[0] * 100, 1) + '%' }));
        }));
        drawCharts();
        lightBox.replaceChildren(lightnessChart(pal));
        /* Ordered palettes need lightness to change monotonically by a visible step. */
        var steps = pal.slice(1).map(function (c, i) { return c.lch[0] - pal[i].lch[0]; });
        if (!cat) {
          var mono = steps.every(function (s) { return s > 0; }) || steps.every(function (s) { return s < 0; });
          var minStep = Math.min.apply(null, steps.map(Math.abs));
          if (o.type === 'div') {
            var half = Math.floor(pal.length / 2), left = steps.slice(0, half), right = steps.slice(pal.length - 1 - half);
            mono = left.every(function (s) { return s > 0; }) && right.every(function (s) { return s < 0; }) || left.every(function (s) { return s < 0; }) && right.every(function (s) { return s > 0; });
            minStep = Math.min.apply(null, left.concat(right).map(Math.abs).filter(function (s) { return s > 0.001; }).concat([1]));
          }
          lightNote.textContent = 'Lightness steps: ' + steps.map(function (s) { return num(s * 100, 1); }).join(', ') + ' (OKLCH L %). ' +
            (mono ? 'Lightness runs in one direction' + (o.type === 'div' ? ' on each arm' : '') + '. ' : 'Lightness does not run in one direction. ') +
            (minStep >= 0.06 ? 'Every step is at least 6% (visible).' : 'Some steps are under 6%: use fewer colours or a wider lightness range.');
          lightNote.className = 'note' + (mono && minStep >= 0.06 ? ' ok' : ' err');
        } else {
          lightNote.textContent = 'Categorical colours share one lightness so no series looks more important; they differ by hue.';
          lightNote.className = 'note';
        }
        var rgbs = pal.map(function (c) { return c.rgb; });
        var res = VISIONS.map(function (v) { return { v: v, d: distances(rgbs, v.key) }; });
        sims.replaceChildren.apply(sims, res.map(function (r) {
          return el('div', { class: 'simrow', dataset: { vision: r.v.key } },
            el('span', { text: r.v.label }, el('small', { text: r.v.note })),
            el('div', { class: 'strip' }, r.d.sims.map(function (s) { return el('i', { style: { background: hex01(s) }, title: hex01(s) }); })));
        }));
        var key = cat ? 'all' : 'adjacent';
        stats.replaceChildren(U.stats(res.map(function (r) {
          return { label: r.v.label + (cat ? ' · any pair' : ' · neighbours'), value: num(r.d[key], 1) };
        })));
        Array.prototype.forEach.call(stats.querySelectorAll('.stat'), function (node, i) { node.dataset.k = 'min-' + res[i].v.key; node.dataset.v = num(res[i].d[key], 2); });
        var normal = res[0].d[key], cvd = Math.min(res[1].d[key], res[2].d[key]);
        if (cat) {
          if (normal < 15) { verdict.className = 'verdict bad'; verdict.textContent = 'Two colours are too close even for full colour vision (ΔE ' + num(normal, 1) + ', aim for 15+). Use fewer colours or more chroma.'; }
          else if (cvd < 6) { verdict.className = 'verdict bad'; verdict.textContent = 'Some colours merge for red-green colour blindness (ΔE ' + num(cvd, 1) + ', aim for 8+). Use fewer colours, vary lightness, or label series directly.'; }
          else if (cvd < 8) { verdict.className = 'verdict warn'; verdict.textContent = 'Usable with direct labels or patterns: the closest pair for red-green colour blindness is ΔE ' + num(cvd, 1) + ' (aim for 8+).'; }
          else { verdict.className = 'verdict ok'; verdict.textContent = 'Every pair stays at least ΔE ' + num(Math.min(normal, cvd), 1) + ' apart for normal and red-green colour-blind vision.'; }
        } else {
          var worstSim = Math.min(res[1].d.adjacent, res[2].d.adjacent, res[3].d.adjacent, res[4].d.adjacent);
          verdict.className = 'verdict ' + (worstSim >= 5 ? 'ok' : 'warn');
          verdict.textContent = worstSim >= 5 ? 'Neighbouring steps stay distinguishable under every simulation (closest ΔE ' + num(worstSim, 1) + '), because lightness carries the order.'
            : 'Some neighbouring steps are close under a simulation (ΔE ' + num(worstSim, 1) + '): use fewer steps or a wider lightness range.';
        }
        exports();
      }

      root.appendChild(U.panel('Palette type', typeChips, U.row(presetSel)));
      root.appendChild(U.panel('Settings', el('div', { class: 'grid2' }, baseIn, secondIn, nIn), seqFields, catFields, catExtras, reverse,
        U.note('Colours are built in OKLCH, where equal lightness steps look equal. Chroma is lowered where a colour would fall outside sRGB, keeping its lightness and hue.')));
      root.appendChild(U.panel('Swatches', swRow, U.note('Click a swatch to copy its HEX.')));
      root.appendChild(U.panel('Preview', bgChips, charts));
      root.appendChild(U.panel('Lightness curve', lightBox, lightNote, U.note('Solid line: OKLCH lightness. Dashed: chroma (0 to 0.4).')));
      root.appendChild(U.panel('Colour-blind check', sims, el('h4', { text: 'Minimum distance (ΔE OK × 100)' }), stats, verdict,
        U.note('Simulated with Machado et al. (2009). Aim for 8+ between colours that sit next to each other for colour-blind viewers, and 15+ for full colour vision; 6–8 needs labels or patterns as well.')));
      root.appendChild(U.panel('Export', el('div', { class: 'field', style: { maxWidth: '220px' } }, el('label', { text: 'CSS variable prefix' }), prefixIn),
        el('h4', { text: 'CSS variables' }), cssOut, U.btnrow(U.copyBtn('Copy CSS', function () { return cssOut.textContent; })),
        el('h4', { text: 'JSON' }), jsonOut, U.btnrow(U.copyBtn('Copy JSON', function () { return jsonOut.textContent; }),
          U.downloadBtn('Download JSON', 'palette.json', function () { return jsonOut.textContent; }, 'application/json'),
          U.downloadBtn('Download SVG', 'palette.svg', svgFile, 'image/svg+xml'),
          U.copyBtn('Copy SVG', svgFile))));
      update();
    }
  });

  /* --- Colour-Blind Safe Palette Checker ---------------------------------------- */

  var CB_PRESETS = [
    /* d3-scale-chromatic schemeCategory10 and schemeTableau10; Okabe & Ito (2008). */
    { label: 'd3 Category10', colours: '#1f77b4\n#ff7f0e\n#2ca02c\n#d62728\n#9467bd\n#8c564b\n#e377c2\n#7f7f7f\n#bcbd22\n#17becf' },
    { label: 'Tableau 10', colours: '#4e79a7\n#f28e2c\n#e15759\n#76b7b2\n#59a14f\n#edc949\n#af7aa1\n#ff9da7\n#9c755f\n#bab0ab' },
    { label: 'Okabe–Ito', colours: '#E69F00\n#56B4E9\n#009E73\n#F0E442\n#0072B2\n#D55E00\n#CC79A7\n#000000' },
    { label: 'Traffic lights', colours: '#e53935\n#fdd835\n#43a047' }
  ];

  Tools.register({
    id: 'colorblind-palette-checker', category: 'color', name: 'Colour-Blind Safe Palette Checker',
    description: 'Check a palette for colour blindness: simulate protanopia, deuteranopia, tritanopia and achromatopsia, see which pairs become hard to tell apart, and get suggested fixes.',
    keywords: ['colour blind', 'color blind', 'colorblind', 'colourblind', 'cvd', 'palette', 'checker', 'accessibility', 'a11y', 'protanopia',
      'deuteranopia', 'tritanopia', 'achromatopsia', 'delta e', 'ciede2000', 'oklab', 'safe palette', 'chart colours', 'color', 'colour'],
    render: function (root) {
      root.classList.add('g-color', 'g-colorb');
      if (!K) { root.appendChild(U.note('The colour maths module did not load.', 'err')); return; }
      var input = el('textarea', { class: 'cb-list', spellcheck: false, value: '#1f77b4\n#ff7f0e\n#2ca02c\n#d62728\n#9467bd', 'aria-label': 'Palette colours' });
      var metric = 'ok', view = 'worst';
      var threshold = el('input', { type: 'number', min: 0.5, max: 50, step: 0.5, value: 8, dataset: { k: 'threshold' } });
      var metricChips = U.chips([{ value: 'ok', label: 'ΔE OK (OKLab × 100)' }, { value: '2000', label: 'ΔE 2000 (CIELAB D65)' }], function (v) { metric = v; run(); }, 'ok');
      var types = {};
      var typeChecks = el('div', { class: 'checks' }, VISIONS.slice(1).map(function (v) {
        var c = U.checkbox(v.label, { checked: true });
        c.input.addEventListener('change', run);
        types[v.key] = c.input;
        return c;
      }));
      var viewChips = U.chips([{ value: 'worst', label: 'Worst case' }].concat(VISIONS.map(function (v) { return { value: v.key, label: v.label }; })),
        function (v) { view = v; run(); }, 'worst');
      var parseNote = el('p', { class: 'note' });
      var simBox = el('div');
      var matrixBox = el('div', { class: 'scroll', style: { overflowX: 'auto' } });
      var summary = el('p', { class: 'verdict', dataset: { k: 'summary' } });
      var problems = el('ol', { class: 'problems' });

      function dist(a, b) { return metric === 'ok' ? dOK(a, b) : d2000(a, b); }
      function checkedTypes() { return VISIONS.slice(1).filter(function (v) { return types[v.key].checked; }).map(function (v) { return v.key; }); }

      /* Smallest distance from colour `rgb` (at index j) to every other colour, under normal vision and each checked simulation. */
      function worstAgainst(colours, j, rgb, list) {
        var worst = Infinity;
        list.forEach(function (t) {
          var s = simulate(rgb, t);
          colours.forEach(function (c, k) { if (k !== j) worst = Math.min(worst, dist(s, simulate(c.rgb, t))); });
        });
        return worst;
      }

      /* Try small lightness changes to one colour of a pair, then hue turns, until nothing it touches is below the threshold. */
      function suggest(colours, j, limit) {
        var list = ['normal'].concat(checkedTypes()), lch = K.toOklch(colours[j].rgb), h = isNaN(lch[2]) ? 0 : lch[2];
        for (var step = 1; step <= 22; step++) {
          for (var sgn = 1; sgn >= -1; sgn -= 2) {
            var L = lch[0] + sgn * step * 0.02;
            if (L < 0.04 || L > 0.98) continue;
            var cand = K.to01(K.from01(K.gamutMap(K.fromOklch([L, lch[1], h]))));
            if (worstAgainst(colours, j, cand, list) >= limit) return { rgb: cand, how: (sgn > 0 ? 'lighter' : 'darker') + ' by ' + Math.round(step * 2) + '% (OKLCH L)' };
          }
        }
        for (var turn = 15; turn <= 180; turn += 15) {
          for (var s2 = 1; s2 >= -1; s2 -= 2) {
            var cand2 = K.to01(K.from01(K.gamutMap(K.fromOklch([lch[0], Math.max(lch[1], 0.1), h + s2 * turn]))));
            if (worstAgainst(colours, j, cand2, list) >= limit) return { rgb: cand2, how: 'hue turned ' + (s2 > 0 ? '+' : '−') + turn + '°' };
          }
        }
        return null;
      }

      function run() {
        var raw = splitColours(input.value), colours = [], bad = [];
        raw.forEach(function (t) {
          var p = K.parseCss(t);
          if (p) colours.push({ text: t, rgb: K.gamutMap(p.rgb), hex: hex01(p.rgb) });
          else bad.push(t);
        });
        parseNote.className = 'note' + (bad.length ? ' err' : '');
        parseNote.textContent = bad.length ? 'Not understood: ' + bad.join(', ') : colours.length + ' colours.';
        if (colours.length > 24) { colours = colours.slice(0, 24); parseNote.textContent += ' Only the first 24 are checked.'; }
        if (colours.length < 2) {
          simBox.replaceChildren(U.note('Enter at least two colours.'));
          matrixBox.replaceChildren(); problems.replaceChildren(); summary.textContent = '';
          return;
        }
        var limit = parseFloat(threshold.value) || 8, active = checkedTypes();
        /* d[type][i][j] for every vision type. */
        var D = {};
        VISIONS.forEach(function (v) {
          var sims = colours.map(function (c) { return simulate(c.rgb, v.key); });
          D[v.key] = { sims: sims, m: sims.map(function (a) { return sims.map(function (b) { return dist(a, b); }); }) };
        });

        simBox.replaceChildren.apply(simBox, VISIONS.map(function (v) {
          return el('div', { class: 'simrow', dataset: { vision: v.key } }, el('span', { text: v.label }, el('small', { text: v.note })),
            el('div', { class: 'strip' }, D[v.key].sims.map(function (s, i) { return el('i', { style: { background: hex01(s) }, title: (i + 1) + ': ' + hex01(s), dataset: { hex: hex01(s) } }); })));
        }));

        /* Matrix for the chosen view; "worst case" is the lowest value over the checked simulations. */
        var n = colours.length;
        function cell(i, j) {
          if (view !== 'worst') return { d: D[view].m[i][j], t: view };
          var best = { d: Infinity, t: '' };
          active.forEach(function (t) { if (D[t].m[i][j] < best.d) best = { d: D[t].m[i][j], t: t }; });
          return best;
        }
        var table = el('table', { class: 'matrix' });
        table.appendChild(el('thead', el('tr', {}, el('th'), colours.map(function (c, i) {
          return el('th', { title: c.text }, el('i', { style: { background: c.hex } }), String(i + 1));
        }))));
        var tbody = el('tbody');
        for (var i = 0; i < n; i++) {
          var tr = el('tr', {}, el('th', { title: colours[i].text }, el('i', { style: { background: colours[i].hex } }), String(i + 1)));
          for (var j = 0; j < n; j++) {
            if (i === j) { tr.appendChild(el('td', { class: 'self' })); continue; }
            var c = cell(i, j), flag = isFinite(c.d) && c.d < limit;
            var short = view === 'worst' && c.t ? VISIONS.filter(function (v) { return v.key === c.t; })[0].short : '';
            tr.appendChild(el('td', { class: flag ? 'bad' : '', dataset: { i: i, j: j, de: isFinite(c.d) ? num(c.d, 2) : '' },
              title: (i + 1) + ' vs ' + (j + 1) + (c.t ? ' · ' + c.t : '') + ': ΔE ' + (isFinite(c.d) ? num(c.d, 2) : '—') },
              isFinite(c.d) ? num(c.d, 1) + (short ? ' ' + short : '') + (flag ? ' ✗' : '') : '—'));
          }
          tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        matrixBox.replaceChildren(table);

        /* Problems: every pair under the limit for any checked simulation (or normal vision). */
        var found = [];
        for (var a = 0; a < n; a++) {
          for (var b = a + 1; b < n; b++) {
            var hits = ['normal'].concat(active).filter(function (t) { return D[t].m[a][b] < limit; });
            if (hits.length) found.push({ a: a, b: b, hits: hits });
          }
        }
        var perType = {};
        found.forEach(function (f) { f.hits.forEach(function (t) { perType[t] = (perType[t] || 0) + 1; }); });
        summary.dataset.flags = String(found.length);
        VISIONS.forEach(function (v) { summary.dataset[v.key] = String(perType[v.key] || 0); });
        summary.className = 'verdict ' + (found.length ? 'bad' : 'ok');
        summary.textContent = found.length
          ? found.length + (found.length === 1 ? ' pair is' : ' pairs are') + ' hard to tell apart (ΔE under ' + limit + '): ' +
            VISIONS.filter(function (v) { return perType[v.key]; }).map(function (v) { return v.label.toLowerCase() + ' ' + perType[v.key]; }).join(', ') + '.'
          : 'No pair falls under ΔE ' + limit + ' for normal vision or the ' + active.length + ' simulation' + (active.length === 1 ? '' : 's') + ' checked.';

        problems.replaceChildren.apply(problems, found.slice(0, 30).map(function (f) {
          var ca = colours[f.a], cb = colours[f.b];
          var li = el('li', {}, el('b', { text: (f.a + 1) + ' (' + ca.hex + ') and ' + (f.b + 1) + ' (' + cb.hex + ')' }), ' — ',
            f.hits.map(function (t) { return t + ' ΔE ' + num(D[t].m[f.a][f.b], 1); }).join(', ') + '.');
          var fix = suggest(colours, f.b, limit), which = f.b;
          if (!fix) { fix = suggest(colours, f.a, limit); which = f.a; }
          if (fix) {
            var hx = hex01(fix.rgb);
            li.appendChild(el('div', { class: 'fix' }, 'Try ', el('i', { style: { background: hx } }), el('code', { text: hx, dataset: { k: 'fix' } }),
              ' for colour ' + (which + 1) + ' (' + fix.how + ').',
              U.button('Use it', function () {
                var parts = splitColours(input.value), seen = -1;
                /* Replace the entry that produced this colour, counting only readable entries. */
                for (var k = 0; k < parts.length; k++) { if (K.parseCss(parts[k])) seen++; if (seen === which) { parts[k] = hx; break; } }
                input.value = parts.join('\n');
                run();
              }, 'ghost')));
          } else {
            li.appendChild(el('div', { class: 'note', text: 'No small change fixes this pair without creating another clash: drop a colour, or add labels, patterns or line styles.' }));
          }
          return li;
        }));
      }

      input.addEventListener('input', U.debounce(run, 200));
      threshold.addEventListener('input', U.debounce(run, 150));

      root.appendChild(U.panel('Palette', input, parseNote, U.btnrow.apply(null, CB_PRESETS.map(function (p) {
        return U.button(p.label, function () { input.value = p.colours; run(); }, 'ghost');
      })), U.note('One colour per line (or separated by commas): HEX, rgb(), hsl(), oklch(), names…')));
      root.appendChild(U.panel('Check', U.row(el('div', { class: 'field grow' }, el('label', { text: 'Difference measure' }), metricChips),
        U.field('Hard to tell apart below', threshold)), typeChecks,
        U.note('8 on the OK scale is a common data-viz target for colours that sit side by side; 6–8 needs labels or patterns too. ΔE 2000 values run on a similar scale for small differences.')));
      root.appendChild(U.panel('Simulations', simBox, U.note('Machado, Oliveira & Fernandes (2009) at full severity; achromatopsia keeps only luminance.')));
      root.appendChild(U.panel('Pair matrix', viewChips, summary, matrixBox,
        U.note('Each cell is the difference between two colours as seen with the chosen vision type. Worst case shows the lowest value over the ticked simulations (P, D, T, A); ✗ marks pairs under the limit.')));
      root.appendChild(U.panel('Problems and suggestions', problems,
        U.note('Colour should never be the only cue: direct labels, patterns, line styles and shapes help everyone. Changing lightness is the most reliable fix, because every kind of colour blindness still sees lightness.')));
      run();
    }
  });
})();
