/* science tools: periodic table, molar mass, equation balancer, SUVAT,
   half-life, UK degree classification and citations.

   Element data: assets/data/elements.json, generated once from
   chemical-elements (MIT; names, symbols, cross-check of masses), mendeleev's
   elements.db (MIT, github.com/lmmentel/mendeleev: CIAAW/IUPAC standard
   atomic weights and uncertainties with the 2017–2024 CIAAW revisions applied,
   CRC Handbook melting/boiling points and densities, main oxidation states,
   NUBASE2020 half-lives) and the PubChem periodic table (public domain:
   Pauling electronegativity, category, state, discovery year). */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-sci-style')) {
    document.head.appendChild(el('style', { id: 'g-sci-style', text: [
      '.g-sci .scroll{overflow-x:auto;max-width:100%}',
      '.g-sci .sc-big{font-size:1.9rem;font-weight:700;font-family:var(--mono);word-break:break-word;margin:4px 0}',
      '.g-sci .sc-mid{font-size:1.2rem;font-weight:600;font-family:var(--mono);word-break:break-word}',
      '.g-sci .sc-muted{color:var(--fg-muted);font-size:.9rem}',
      '.g-sci .sc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}',
      '.g-sci .sc-card{background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px}',
      '.g-sci .sc-card b{display:block;font-family:var(--mono);font-size:1.1rem;word-break:break-word}',
      '.g-sci .sc-card span{color:var(--fg-muted);font-size:.85rem}',
      '.g-sci .sc-ok{color:var(--ok);font-weight:700}',
      '.g-sci .sc-err{color:var(--err);font-weight:700}',
      /* periodic table */
      '.g-sci .pt{display:grid;grid-template-columns:repeat(18,minmax(40px,1fr));gap:3px;min-width:760px}',
      '.g-sci .pt-cell{--h:220;--s:60%;--l:88%;position:relative;border:1px solid transparent;border-radius:5px;padding:3px 2px 2px;min-height:52px;cursor:pointer;',
      '  background:hsl(var(--h) var(--s) var(--l));color:#14161f;font:inherit;text-align:center;line-height:1.1;display:flex;flex-direction:column;align-items:center;justify-content:center}',
      '.g-sci .pt-cell:hover,.g-sci .pt-cell:focus-visible{outline:2px solid var(--accent);outline-offset:1px;z-index:1}',
      '.g-sci .pt-cell.sel{outline:3px solid var(--accent);outline-offset:1px;z-index:2}',
      '.g-sci .pt-cell.dim{opacity:.18}',
      '.g-sci .pt-cell .z{font-size:9px;align-self:flex-start;padding-left:2px;opacity:.8}',
      '.g-sci .pt-cell .s{font-size:16px;font-weight:700}',
      '.g-sci .pt-cell .n{font-size:8px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.g-sci .pt-cell .w{font-size:8px;opacity:.8}',
      '.g-sci .pt-cell.ph{cursor:default;background:transparent;border:1px dashed var(--border);color:var(--fg-muted);font-size:10px}',
      '.g-sci .pt-gap{grid-column:1/-1;height:10px}',
      '.g-sci .pt-cell.grad{--h:calc(240 - var(--t) * 240);--s:75%}',
      '.g-sci .pt-cell.none{--s:0%}',
      '.g-sci .pt-legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:var(--fg-muted);margin-top:8px}',
      '.g-sci .pt-legend i{display:inline-block;width:13px;height:13px;border-radius:3px;margin-right:5px;vertical-align:-2px;background:hsl(var(--h) var(--s,60%) var(--l,88%))}',
      '.g-sci .pt-detail{display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;align-items:start}',
      '.g-sci .pt-tile{--h:220;--s:60%;--l:88%;width:120px;border-radius:10px;padding:10px;background:hsl(var(--h) var(--s) var(--l));color:#14161f;text-align:center}',
      '.g-sci .pt-tile .z{font-size:14px;text-align:left}.g-sci .pt-tile .s{font-size:44px;font-weight:700;line-height:1.1}.g-sci .pt-tile .n{font-size:14px}',
      '.g-sci dl.sc-kv{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:5px 14px;margin:0;font-size:14px}',
      '.g-sci dl.sc-kv dt{color:var(--fg-muted)}.g-sci dl.sc-kv dd{margin:0;word-break:break-word}',
      '@media (max-width:560px){.g-sci .pt-detail{grid-template-columns:1fr}}',
      '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .g-sci .pt-cell,:root:not([data-theme="light"]) .g-sci .pt-tile{--l:30%;color:#e8eaf2}:root:not([data-theme="light"]) .g-sci .pt-cell.grad{--s:55%}:root:not([data-theme="light"]) .g-sci .pt-legend i{--l:30%}}',
      ':root[data-theme="dark"] .g-sci .pt-cell,:root[data-theme="dark"] .g-sci .pt-tile{--l:30%;color:#e8eaf2}:root[data-theme="dark"] .g-sci .pt-cell.grad{--s:55%}:root[data-theme="dark"] .g-sci .pt-legend i{--l:30%}',
      /* formulas, equations */
      '.g-sci .sc-formula{font-size:1.5rem;font-weight:600;word-break:break-word}',
      '.g-sci .sc-eq{font-size:1.35rem;font-weight:600;line-height:1.6;word-break:break-word}',
      '.g-sci .sc-eq .co{color:var(--accent);font-weight:800}',
      /* charts */
      '.g-sci .sc-chart{background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--radius);padding:6px;margin-top:10px}',
      '.g-sci .sc-chart svg{width:100%;max-width:620px;margin:0 auto;height:auto;display:block;color:var(--fg)}',
      '.g-sci svg .curve{fill:none;stroke:var(--accent);stroke-width:2}',
      '.g-sci svg .axis{stroke:var(--fg-muted);stroke-width:1}',
      '.g-sci svg .grid{stroke:var(--border);stroke-width:1}',
      '.g-sci svg .tick{fill:var(--fg-muted);font:11px var(--sans)}',
      '.g-sci svg .pt{fill:var(--accent)}',
      '.g-sci svg .guide{stroke:var(--fg-muted);stroke-width:1;stroke-dasharray:4 3}',
      /* degree calculator */
      '.g-sci .dg-mods{display:flex;flex-direction:column;gap:6px}',
      '.g-sci .dg-mod{display:grid;grid-template-columns:minmax(0,1fr) 84px 84px auto;gap:6px;align-items:center}',
      '.g-sci .dg-mod input{min-width:0}',
      '.g-sci .dg-head{font-size:12px;color:var(--fg-muted);font-weight:600}',
      '@media (max-width:480px){.g-sci .dg-mod{grid-template-columns:minmax(0,1fr) 64px 64px auto}}',
      /* citations */
      '.g-sci .ct-out{background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--radius-s);padding:12px;line-height:1.6;word-break:break-word}',
      '.g-sci .ct-list{margin:0;padding-left:0;list-style:none;display:flex;flex-direction:column;gap:8px}',
      '.g-sci .ct-list li{display:flex;gap:8px;align-items:flex-start;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:8px}',
      '.g-sci .ct-list li > div{line-height:1.6;word-break:break-word;padding-left:2em;text-indent:-2em}',
      '.g-sci .ct-fields{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}',
      '.g-sci .ct-fields .wide{grid-column:1/-1}'
    ].join('\n') }));
  }

  /* ---- helpers ------------------------------------------------------------ */
  function setRoot(root) { root.classList.add('g-sci'); return root; }
  function numIn(label, value, attrs) {
    var input = el('input', Object.assign({ type: 'number', step: 'any' }, attrs || {}));
    input.value = value === undefined || value === null ? '' : String(value);
    var wrap = U.field(label, input);
    wrap.input = input;
    return wrap;
  }
  function textIn(label, value, attrs) {
    var input = el('input', Object.assign({ type: 'text', spellcheck: false, autocomplete: 'off' }, attrs || {}));
    input.value = value === undefined || value === null ? '' : String(value);
    var wrap = U.field(label, input);
    wrap.input = input;
    return wrap;
  }
  function val(w) {
    var s = String((w.input || w).value).trim().replace(/,/g, '').replace(/−/g, '-');
    if (s === '') return NaN;
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }
  function selVal(w) { return w.querySelector('select').value; }
  var SUPS = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '⁺' };
  function sup(s) { return String(s).split('').map(function (c) { return SUPS[c] || c; }).join(''); }
  function fmt(x, sig) {
    if (typeof x !== 'number' || isNaN(x)) return '—';
    if (!isFinite(x)) return x > 0 ? '∞' : '−∞';
    if (x === 0) return '0';
    sig = sig || 6;
    var ax = Math.abs(x);
    if (ax >= 1e9 || ax < 1e-4) {
      var p = x.toExponential(sig - 1).split('e');
      return p[0].replace(/\.?0+$/, '').replace(/^-/, '−') + ' × 10' + sup(parseInt(p[1], 10));
    }
    return String(parseFloat(x.toPrecision(sig))).replace(/^-/, '−');
  }
  function card(label, value, key) {
    return el('div', { class: 'sc-card' }, el('span', { text: label }), el('b', { text: value, dataset: key ? { k: key } : undefined }));
  }
  function store(key, value) {
    try {
      if (value === undefined) { var s = localStorage.getItem('att:' + key); return s ? JSON.parse(s) : null; }
      localStorage.setItem('att:' + key, JSON.stringify(value));
    } catch (e) { /* private mode or storage full: the tool still works */ }
    return null;
  }

  /* ---- element data (fetched once, shared by three tools) ------------------ */
  var elementsPromise = null;
  function loadElements() {
    if (!elementsPromise) {
      elementsPromise = fetch('assets/data/elements.json').then(function (r) {
        if (!r.ok) throw new Error('Could not load the element data (' + r.status + ')');
        return r.json();
      }).then(function (d) {
        var bySym = {};
        d.elements.forEach(function (e) { bySym[e.sym] = e; });
        return { list: d.elements, bySym: bySym };
      }).catch(function (e) { elementsPromise = null; throw e; });
    }
    return elementsPromise;
  }

  /* ---- chemical formulas ---------------------------------------------------- */
  /* parseFormula('CuSO4·5H2O') → { counts: { Cu: 1, S: 1, O: 9, H: 10 }, charge: 0, coef: 1 }.
     Brackets (), [], {} nest; hydrates join with · . * or •; a leading number
     multiplies its part; charges are written ^2-, {3+}, +3 or a lone + / −. */
  function parseFormula(src, opts) {
    opts = opts || {};
    var s = String(src).trim().replace(/[−–]/g, '-').replace(/\s+/g, '');
    if (!s) throw new Error('Empty formula');
    var charge = 0, m;
    if (/^e(\^?-|\{-\}|-1)?$/.test(s) && s !== 'e') return { counts: {}, charge: -1, coef: 1, electron: true };
    if ((m = /(?:\^|\{)([+-]?)(\d*)([+-]?)\}?$/.exec(s)) && (m[1] || m[3])) {
      charge = (m[1] || m[3]) === '-' ? -(+m[2] || 1) : (+m[2] || 1);
      s = s.slice(0, m.index);
    } else if ((m = /([A-Za-z)\]}\d])([+-])(\d*)$/.exec(s))) {
      charge = m[2] === '-' ? -(+m[3] || 1) : (+m[3] || 1);
      s = s.slice(0, m.index + 1);
    }
    var counts = {}, lead = 1;
    var parts = s.split(/[·•*]|\.(?=\d|[A-Z(\[])/);
    parts.forEach(function (part, pi) {
      var pm = /^(\d+)(.*)$/.exec(part), mult = 1;
      if (pm) { mult = +pm[1]; part = pm[2]; if (pi === 0) { lead = mult; mult = opts.leading === false ? 1 : mult; } }
      if (!part) throw new Error('Something is missing after a number in "' + src + '"');
      var i = 0;
      function group(close) {
        var c = {};
        while (i < part.length) {
          var ch = part[i];
          if (ch === '(' || ch === '[' || ch === '{') {
            i++;
            var inner = group({ '(': ')', '[': ']', '{': '}' }[ch]);
            var n = num();
            Object.keys(inner).forEach(function (k) { c[k] = (c[k] || 0) + inner[k] * n; });
          } else if (ch === ')' || ch === ']' || ch === '}') {
            if (ch !== close) throw new Error('Mismatched bracket "' + ch + '" in "' + src + '"');
            i++;
            return c;
          } else if (/[A-Z]/.test(ch)) {
            var sym = ch; i++;
            while (i < part.length && /[a-z]/.test(part[i])) sym += part[i++];
            var k = num();
            c[sym] = (c[sym] || 0) + k;
          } else if (/[a-z]/.test(ch)) {
            throw new Error('Element symbols start with a capital letter ("' + part.slice(i, i + 2) + '" in "' + src + '")');
          } else throw new Error('Unexpected "' + ch + '" in "' + src + '"');
        }
        if (close) throw new Error('A bracket is not closed in "' + src + '"');
        return c;
      }
      function num() { var d = ''; while (i < part.length && /\d/.test(part[i])) d += part[i++]; return d ? +d : 1; }
      var g = group(null);
      Object.keys(g).forEach(function (k) { counts[k] = (counts[k] || 0) + g[k] * mult; });
    });
    return { counts: counts, charge: charge, coef: lead };
  }
  /* HTML for a formula: subscript counts, superscript charge. */
  function formulaHtml(src) {
    var s = U.escapeHtml(String(src).trim()), chargeHtml = '', m;
    if ((m = /(?:\^|\{)([+-]?)(\d*)([+-]?)\}?$/.exec(s)) && (m[1] || m[3])) { chargeHtml = '<sup>' + (m[2] === '1' ? '' : m[2]) + ((m[1] || m[3]) === '-' ? '−' : '+') + '</sup>'; s = s.slice(0, m.index); }
    else if ((m = /([A-Za-z)\]}\d])([+-])(\d*)$/.exec(s))) { chargeHtml = '<sup>' + (m[3] === '1' ? '' : m[3]) + (m[2] === '-' ? '−' : '+') + '</sup>'; s = s.slice(0, m.index + 1); }
    s = s.replace(/[*•]/g, '·').replace(/\.(?=\d|[A-Z(\[])/g, '·');
    /* digits after an element or bracket are subscripts; a digit at the start or after · is a multiplier */
    s = s.replace(/([A-Za-z)\]}])(\d+)/g, '$1<sub>$2</sub>');
    return s + chargeHtml;
  }
  function formulaText(src) {
    return formulaHtml(src).replace(/<sub>(\d+)<\/sub>/g, function (_, d) { return d.split('').map(function (c) { return '₀₁₂₃₄₅₆₇₈₉'[+c]; }).join(''); })
      .replace(/<sup>([^<]*)<\/sup>/g, function (_, d) { return sup(d.replace('−', '-')); }).replace(/&amp;/g, '&');
  }

  /* ======================================================================= */
  /* Periodic Table                                                          */
  /* ======================================================================= */
  var CATS = {
    alkali: ['Alkali metal', 0], alkaline: ['Alkaline earth metal', 32], transition: ['Transition metal', 205], post: ['Post-transition metal', 170],
    metalloid: ['Metalloid', 85], nonmetal: ['Reactive non-metal', 130], halogen: ['Halogen', 55], noble: ['Noble gas', 275],
    lanthanide: ['Lanthanide', 320], actinide: ['Actinide', 345]
  };
  var BLOCKS = { s: ['s-block', 0], p: ['p-block', 55], d: ['d-block', 205], f: ['f-block', 300] };
  var STATES = { solid: ['Solid', 215], liquid: ['Liquid', 190], gas: ['Gas', 30], unknown: ['Unknown', 0] };
  function kToC(k) { return parseFloat((k - 273.15).toFixed(2)); }
  function temp(k) { return kToC(k).toLocaleString('en-GB', { maximumFractionDigits: 2 }) + ' °C (' + parseFloat(k.toFixed(2)).toLocaleString('en-GB', { maximumFractionDigits: 2 }) + ' K)'; }
  function configHtml(c) { return U.escapeHtml(c).replace(/([spdf])(\d+)/g, '$1<sup>$2</sup>'); }
  function position(e) {
    if (e.z >= 57 && e.z <= 71) return { row: 9, col: e.z - 57 + 3 };
    if (e.z >= 89 && e.z <= 103) return { row: 10, col: e.z - 89 + 3 };
    return { row: e.period, col: e.group };
  }

  Tools.register({
    id: 'periodic-table', category: 'science', name: 'Periodic Table',
    description: 'An interactive periodic table of all 118 elements, coloured by category, block, state, electronegativity or atomic weight, with standard atomic weights, electron configurations and physical data.',
    keywords: ['periodic table', 'elements', 'chemistry', 'atomic number', 'atomic mass', 'atomic weight', 'relative atomic mass', 'electron configuration',
      'electronegativity', 'melting point', 'boiling point', 'density', 'oxidation states', 'group', 'period', 'block', 'metals', 'noble gases', 'lanthanides', 'actinides'],
    render: function (root) {
      setRoot(root);
      var status = U.note('Loading the element data…');
      var search = textIn('Search', '', { placeholder: 'Name, symbol or atomic number', 'aria-label': 'Search elements' });
      var colour = U.select({ label: 'Colour by', value: 'cat', options: [{ value: 'cat', label: 'Category' }, { value: 'block', label: 'Block' },
        { value: 'state', label: 'State at 25 °C' }, { value: 'en', label: 'Electronegativity (Pauling)' }, { value: 'mass', label: 'Atomic weight' }] });
      var grid = el('div', { class: 'pt', role: 'grid', 'aria-label': 'Periodic table' });
      var legend = el('div', { class: 'pt-legend' });
      var detail = el('div', { dataset: { k: 'detail' } });
      var found = el('span', { class: 'sc-muted', dataset: { k: 'found' } });
      var data = null, cells = {}, selected = null;

      function paint() {
        var mode = selVal(colour);
        legend.replaceChildren();
        var maxEn = 3.98, minEn = 0.7, maxW = 295;
        data.list.forEach(function (e) {
          var c = cells[e.z];
          c.classList.remove('grad', 'none');
          c.style.removeProperty('--t'); c.style.removeProperty('--h');
          if (mode === 'cat') c.style.setProperty('--h', CATS[e.cat][1]);
          else if (mode === 'block') c.style.setProperty('--h', BLOCKS[e.block][1]);
          else if (mode === 'state') { c.style.setProperty('--h', STATES[e.state][1]); if (e.state === 'unknown') c.classList.add('none'); }
          else if (mode === 'en') { if (e.en === null || e.en === undefined) c.classList.add('none'); else { c.classList.add('grad'); c.style.setProperty('--t', ((e.en - minEn) / (maxEn - minEn)).toFixed(3)); } }
          else { c.classList.add('grad'); c.style.setProperty('--t', Math.min(1, e.w / maxW).toFixed(3)); }
        });
        var table = mode === 'cat' ? CATS : mode === 'block' ? BLOCKS : mode === 'state' ? STATES : null;
        if (table) Object.keys(table).forEach(function (k) { legend.appendChild(el('span', null, el('i', { style: { '--h': table[k][1], '--s': k === 'unknown' ? '0%' : '60%' } }), table[k][0])); });
        else {
          [0, 0.25, 0.5, 0.75, 1].forEach(function (t) {
            var v = mode === 'en' ? (minEn + t * (maxEn - minEn)).toFixed(2) : Math.round(t * maxW);
            legend.appendChild(el('span', null, el('i', { style: { '--h': String(240 - t * 240), '--s': '75%' } }), String(v)));
          });
          legend.appendChild(el('span', null, el('i', { style: { '--h': '0', '--s': '0%' } }), mode === 'en' ? 'no value' : ''));
        }
      }
      function show(e) {
        if (selected) cells[selected].classList.remove('sel');
        selected = e.z;
        cells[e.z].classList.add('sel');
        var mode = selVal(colour), h = mode === 'cat' ? CATS[e.cat][1] : mode === 'block' ? BLOCKS[e.block][1] : mode === 'state' ? STATES[e.state][1] : CATS[e.cat][1];
        var rows = [
          ['Atomic number', String(e.z)],
          ['Standard atomic weight', e.mass + (e.massU ? ' ± ' + e.massU : '') + (e.mass.charAt(0) === '[' ? ' (mass number of the longest-lived isotope' + (e.halfLife ? ', half-life ' + fmtYears(e.halfLife) : '') + ')' : ''), 'el-mass'],
          ['Category', CATS[e.cat][0]],
          ['Group', e.group ? String(e.group) : 'f-block row (no group number)'],
          ['Period', String(e.period)],
          ['Block', e.block + '-block'],
          ['Electron configuration', { html: configHtml(e.config) + (e.configPredicted ? ' <span class="sc-muted">(predicted)</span>' : '') }, 'el-config'],
          ['Electronegativity (Pauling)', e.en === null || e.en === undefined ? '—' : String(e.en), 'el-en'],
          ['Melting point', e.mp !== undefined ? temp(e.mp) + (e.sublimes && e.bp !== undefined && e.mp > e.bp ? ' (under pressure)' : '') + (e.allotrope ? ' (' + e.allotrope + ')' : '') + (e.mpEstimated ? ' (estimated)' : '') : (e.mpNote ? 'None: ' + e.mpNote : '—')],
          [e.sublimes ? 'Sublimes at' : 'Boiling point', e.bp !== undefined ? temp(e.bp) : '—'],
          ['Density', e.density === undefined ? '—' : (e.state === 'gas' ? fmt(e.density * 1000, 4) + ' g/L (gas at 25 °C)' : fmt(e.density, 5) + ' g/cm³') + (e.densityEstimated ? ' (estimated)' : '')],
          ['State at 25 °C', STATES[e.state][0] + (e.stateNote ? ' (' + e.stateNote + ')' : '')],
          ['Discovered', e.year === 'Ancient' ? 'Known since ancient times' : String(e.year)],
          ['Common oxidation states', e.ox.length ? e.ox.map(function (o) { return o > 0 ? '+' + o : String(o).replace('-', '−'); }).join(', ') + (e.oxPredicted ? ' (predicted)' : '') : '—'],
          ['Radioactive', e.radioactive ? 'Yes: no stable isotopes' : 'No']
        ];
        detail.replaceChildren(el('div', { class: 'pt-detail' },
          el('div', { class: 'pt-tile', style: { '--h': String(h) } }, el('div', { class: 'z', text: String(e.z) }), el('div', { class: 's', text: e.sym }),
            el('div', { class: 'n', text: e.name, dataset: { k: 'el-name' } }), el('div', { class: 'n', text: e.mass })),
          el('dl', { class: 'sc-kv' }, rows.map(function (r) {
            var dd = el('dd', r[2] ? { dataset: { k: r[2] } } : null);
            if (r[1] && r[1].html) dd.innerHTML = r[1].html; else dd.textContent = r[1];
            return [el('dt', { text: r[0] }), dd];
          }))));
        if ((e.z >= 57 && e.z <= 71) || (e.z >= 89 && e.z <= 103)) detail.appendChild(U.note('This table follows the IUPAC layout, with lanthanum to lutetium and actinium to lawrencium as the two f-block rows. Whether La/Ac or Lu/Lr belong in group 3 is still debated.'));
      }
      function filter() {
        var q = search.input.value.trim().toLowerCase(), first = null, n = 0;
        data.list.forEach(function (e) {
          var hit = !q || e.name.toLowerCase().indexOf(q) === 0 || e.sym.toLowerCase() === q || String(e.z) === q || (q.length > 2 && e.name.toLowerCase().indexOf(q) > -1);
          cells[e.z].classList.toggle('dim', !hit);
          if (hit) { n++; if (!first || e.sym.toLowerCase() === q) first = first && first.sym.toLowerCase() === q ? first : e; }
        });
        found.textContent = q ? n + ' match' + (n === 1 ? '' : 'es') : '';
        return first;
      }
      search.input.addEventListener('input', function () { var f = filter(); if (f && search.input.value.trim()) show(f); });
      search.input.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { var f = filter(); if (f) { show(f); cells[f.z].focus(); } } });
      colour.querySelector('select').addEventListener('change', function () { paint(); if (selected) show(data.list[selected - 1]); });

      loadElements().then(function (d) {
        data = d;
        status.textContent = '';
        d.list.forEach(function (e) {
          var p = position(e);
          var c = el('button', { type: 'button', class: 'pt-cell', title: e.name, dataset: { z: String(e.z), sym: e.sym }, style: { gridRow: String(p.row), gridColumn: String(p.col) },
            'aria-label': e.name + ', ' + e.z, onclick: function () { show(e); } },
          el('span', { class: 'z', text: String(e.z) }), el('span', { class: 's', text: e.sym }), el('span', { class: 'n', text: e.name }), el('span', { class: 'w', text: e.mass.replace(/^\[|\]$/g, '') }));
          cells[e.z] = c;
          grid.appendChild(c);
        });
        grid.appendChild(el('div', { class: 'pt-cell ph', style: { gridRow: '6', gridColumn: '3' }, text: '57–71' }));
        grid.appendChild(el('div', { class: 'pt-cell ph', style: { gridRow: '7', gridColumn: '3' }, text: '89–103' }));
        grid.appendChild(el('div', { class: 'pt-gap', style: { gridRow: '8' } }));
        paint();
        show(d.bySym.Fe);
      }).catch(function (e) { status.className = 'note err'; status.textContent = e.message; });

      root.appendChild(U.panel(null, U.row(el('div', { class: 'grow' }, search), colour, found), status,
        el('div', { class: 'scroll' }, grid), legend,
        U.note('Standard atomic weights are the CIAAW abridged values (2024); bracketed numbers are the mass number of the longest-lived isotope of an element with no stable isotopes.')));
      root.appendChild(U.panel('Element', detail));
    }
  });
  function fmtYears(y) {
    if (y >= 1e6) return fmt(y, 4) + ' years';
    if (y >= 1) return parseFloat(y.toPrecision(4)).toLocaleString('en-GB') + ' years';
    var d = y * 365.25;
    if (d >= 1) return parseFloat(d.toPrecision(4)) + ' days';
    var h = d * 24;
    if (h >= 1) return parseFloat(h.toPrecision(4)) + ' hours';
    var m = h * 60;
    if (m >= 1) return parseFloat(m.toPrecision(4)) + ' minutes';
    return fmt(m * 60, 4) + ' seconds';
  }

  /* ======================================================================= */
  /* Molar Mass Calculator                                                   */
  /* ======================================================================= */
  var AVOGADRO = 6.02214076e23;
  /* Exact sum of atomic weights in units of 10^-4 (every abridged weight has
     at most four decimal places), so rounding the total is exact too. */
  function molarMass(counts, bySym) {
    var rows = [], total = 0, dp = 4, unknown = [], approx = [];
    Object.keys(counts).forEach(function (sym) {
      var e = bySym[sym];
      if (!e) { unknown.push(sym); return; }
      var ws = e.mass.replace(/^\[|\]$/g, ''), d = (ws.split('.')[1] || '').length;
      var units = Math.round(Number(ws) * 1e4) * counts[sym];
      total += units;
      dp = Math.min(dp, d);
      if (e.mass.charAt(0) === '[') approx.push(sym);
      rows.push({ sym: sym, name: e.name, n: counts[sym], w: e.mass, units: units, z: e.z });
    });
    return { rows: rows, units: total, dp: Math.min(dp, 3), unknown: unknown, approx: approx };
  }
  function unitsTo(units, dp) {
    /* round half up at dp decimals from an exact integer in 1e-4 units */
    var step = Math.pow(10, 4 - dp), r = Math.floor((units + step / 2) / step) * step;
    return (r / 1e4).toFixed(dp);
  }

  Tools.register({
    id: 'molar-mass', category: 'science', name: 'Molar Mass Calculator',
    description: 'Molar mass of any chemical formula, including brackets, nested groups and hydrates such as CuSO4·5H2O, with a composition table by mass and a grams to moles converter.',
    keywords: ['molar mass', 'molecular weight', 'formula mass', 'relative formula mass', 'mr', 'molecular mass', 'g/mol', 'moles', 'grams to moles',
      'moles to grams', 'percentage composition', 'mass percent', 'chemistry', 'stoichiometry', 'hydrate', 'avogadro'],
    render: function (root) {
      setRoot(root);
      var f = textIn('Chemical formula', 'C6H12O6', { style: { fontFamily: 'var(--mono)' }, placeholder: 'e.g. H2O, Ca(OH)2, K4[Fe(CN)6], CuSO4·5H2O' });
      var pretty = el('div', { class: 'sc-formula', dataset: { k: 'formula' } });
      var result = el('div', { class: 'sc-big' }), note = U.note(''), table = el('div', { class: 'scroll' });
      var grams = numIn('Mass (g)', 10, { min: 0 }), moles = numIn('Amount (mol)', '', { min: 0 });
      var conv = el('div', { class: 'sc-muted', dataset: { k: 'conv' } });
      var mass = NaN, data = null;
      var examples = el('div', { class: 'chips' }, ['H2O', 'NaCl', 'C6H12O6', 'CuSO4·5H2O', 'Ca(OH)2', 'K4[Fe(CN)6]', 'Mg3(PO4)2', '(NH4)2SO4'].map(function (x) {
        return el('button', { type: 'button', class: 'chip', text: formulaText(x), onclick: function () { f.input.value = x; run(); } });
      }));
      function run() {
        result.replaceChildren(); table.replaceChildren(); note.textContent = ''; note.className = 'note'; pretty.innerHTML = ''; mass = NaN;
        if (!data) return;
        var src = f.input.value.trim();
        if (!src) return;
        var p;
        try { p = parseFormula(src); } catch (e) { note.className = 'note err'; note.textContent = e.message; convert('g'); return; }
        var mm = molarMass(p.counts, data.bySym);
        if (mm.unknown.length) {
          note.className = 'note err';
          note.textContent = 'Unknown element symbol' + (mm.unknown.length > 1 ? 's' : '') + ': ' + mm.unknown.join(', ') + '. Symbols are case-sensitive: Co is cobalt, CO is carbon monoxide.';
          convert('g'); return;
        }
        pretty.innerHTML = formulaHtml(src);
        var text = unitsTo(mm.units, mm.dp);
        mass = Number(text);
        result.append(el('span', { text: text, dataset: { k: 'molar-mass' } }), el('span', { class: 'sc-muted', text: ' g/mol' }));
        var exact = (mm.units / 1e4).toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
        note.textContent = 'Given to ' + mm.dp + ' decimal place' + (mm.dp === 1 ? '' : 's') + ', the precision of the least precise atomic weight used (unrounded sum ' + exact + ').' +
          (mm.approx.length ? ' ' + mm.approx.join(', ') + ' ha' + (mm.approx.length > 1 ? 've' : 's') + ' no stable isotopes, so the mass number of the longest-lived isotope is used.' : '') +
          (p.charge ? ' The charge does not change the mass noticeably (electrons weigh about 0.00055 g/mol each).' : '');
        mm.rows.sort(function (a, b) { return (a.sym === 'C' ? -2 : a.sym === 'H' ? -1 : 0) - (b.sym === 'C' ? -2 : b.sym === 'H' ? -1 : 0) || a.sym.localeCompare(b.sym); });
        table.appendChild(U.table(['Element', 'Symbol', 'Atoms', 'Atomic weight', 'Mass (g/mol)', '% by mass'], mm.rows.map(function (r) {
          return [r.name, r.sym, String(r.n), r.w, (r.units / 1e4).toFixed(4).replace(/0+$/, '').replace(/\.$/, ''), (r.units / mm.units * 100).toFixed(2) + '%'];
        })));
        convert(last);
      }
      var last = 'g';
      function convert(from) {
        last = from;
        if (!(mass > 0)) { conv.textContent = ''; return; }
        if (from === 'g') {
          var g = val(grams);
          if (isNaN(g)) { conv.textContent = ''; return; }
          moles.input.value = parseFloat((g / mass).toPrecision(8));
        } else {
          var n = val(moles);
          if (isNaN(n)) { conv.textContent = ''; return; }
          grams.input.value = parseFloat((n * mass).toPrecision(8));
        }
        var mol = val(moles);
        conv.textContent = val(grams) + ' g = ' + fmt(mol, 6) + ' mol = ' + fmt(mol * AVOGADRO, 6) + ' formula units (n = m ÷ M, N = n × 6.02214076 × 10²³)';
      }
      grams.input.addEventListener('input', function () { convert('g'); });
      moles.input.addEventListener('input', function () { convert('mol'); });
      U.live([f], run);
      loadElements().then(function (d) { data = d; run(); }).catch(function (e) { note.className = 'note err'; note.textContent = e.message; });
      root.appendChild(U.panel(null, f, examples, U.note('Brackets (), [] and {} can nest. Write hydrates with a dot: CuSO4·5H2O or CuSO4.5H2O. A number at the front multiplies the whole formula.')));
      root.appendChild(U.panel('Molar mass', pretty, result, note, table));
      root.appendChild(U.panel('Grams, moles and particles', U.row(grams, moles), conv));
    }
  });

  /* ======================================================================= */
  /* Chemical Equation Balancer                                              */
  /* ======================================================================= */
  /* Exact rationals for the null space: { n, d } BigInt. */
  function gcdB(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { var t = a % b; a = b; b = t; } return a; }
  function R(n, d) { if (d === undefined) d = 1n; if (d < 0n) { n = -n; d = -d; } var g = gcdB(n, d) || 1n; return { n: n / g, d: d / g }; }
  function rsub(a, b) { return R(a.n * b.d - b.n * a.d, a.d * b.d); }
  function rmul(a, b) { return R(a.n * b.n, a.d * b.d); }
  function rdiv(a, b) { return R(a.n * b.d, a.d * b.n); }
  /* Basis of the null space of an integer matrix, each vector scaled to the
     smallest whole numbers. */
  function nullspace(M, cols) {
    var A = M.map(function (r) { return r.map(function (x) { return R(BigInt(x)); }); }), rows = A.length, piv = [], r = 0;
    for (var c = 0; c < cols && r < rows; c++) {
      var p = -1;
      for (var i = r; i < rows; i++) if (A[i][c].n !== 0n) { p = i; break; }
      if (p < 0) continue;
      var t = A[p]; A[p] = A[r]; A[r] = t;
      var pv = A[r][c];
      A[r] = A[r].map(function (x) { return rdiv(x, pv); });
      for (var k = 0; k < rows; k++) {
        if (k === r || A[k][c].n === 0n) continue;
        var f = A[k][c], rr = A[r];
        A[k] = A[k].map(function (x, j) { return rsub(x, rmul(f, rr[j])); });
      }
      piv.push(c); r++;
    }
    var basis = [];
    for (var fc = 0; fc < cols; fc++) {
      if (piv.indexOf(fc) >= 0) continue;
      var v = [];
      for (var j = 0; j < cols; j++) v.push(R(j === fc ? 1n : 0n));
      piv.forEach(function (pc, pi) { v[pc] = R(-A[pi][fc].n, A[pi][fc].d); });
      var l = v.reduce(function (acc, q) { return acc / gcdB(acc, q.d) * q.d; }, 1n);
      var ints = v.map(function (q) { return q.n * (l / q.d); });
      var g = ints.reduce(function (acc, x) { return gcdB(acc, x); }, 0n) || 1n;
      ints = ints.map(function (x) { return x / g; });
      basis.push(ints);
    }
    return basis;
  }
  /* Split one side into species. A + between spaces always separates; Na+,
     Fe+3 and SO4^2- keep their charges. */
  function splitSpecies(side) {
    var parts = [], cur = '';
    for (var i = 0; i < side.length; i++) {
      var ch = side[i];
      if (ch !== '+') { cur += ch; continue; }
      var before = side[i - 1] || '', rest = side.slice(i + 1), restTrim = rest.replace(/^\s+/, '');
      var spaceBefore = /\s/.test(before), spaceAfter = /^\s/.test(rest);
      if (!cur.trim()) throw new Error('A "+" has nothing in front of it');
      if (before === '^' || /\{[^}]*$/.test(cur) || restTrim === '' || restTrim[0] === '+' || restTrim[0] === '}') { cur += ch; continue; }
      if (spaceBefore && spaceAfter) { parts.push(cur); cur = ''; continue; }
      var md = /^(\d+)(.?)/.exec(rest);
      if (md && !spaceBefore && (md[2] === '' || /[\s+}]/.test(md[2]))) { cur += '+' + md[1]; i += md[1].length; continue; }
      parts.push(cur); cur = '';
    }
    parts.push(cur);
    return parts.map(function (p) { return p.trim(); }).filter(function (p, k, all) {
      if (!p) throw new Error('Two "+" signs in a row, or one at the end');
      return true;
    });
  }
  function speciesHtml(s) { return s === 'e-' || /^e(\^?-|\{-\})$/.test(s) ? 'e<sup>−</sup>' : formulaHtml(s); }
  function speciesText(s) { return s === 'e-' || /^e(\^?-|\{-\})$/.test(s) ? 'e⁻' : formulaText(s); }

  Tools.register({
    id: 'equation-balancer', category: 'science', name: 'Chemical Equation Balancer',
    description: 'Balance chemical and ionic equations exactly: smallest whole-number coefficients from the element matrix by exact fraction arithmetic, with charges and electrons, and every independent solution when there is more than one.',
    keywords: ['balance equations', 'chemical equation', 'balancer', 'balancing', 'stoichiometry', 'coefficients', 'reaction', 'redox', 'ionic equation',
      'half equation', 'chemistry', 'reactants', 'products'],
    render: function (root) {
      setRoot(root);
      var inp = textIn('Equation', 'C3H8 + O2 -> CO2 + H2O', { style: { fontFamily: 'var(--mono)' }, placeholder: 'e.g. Fe + O2 -> Fe2O3' });
      var examples = el('div', { class: 'chips' }, [['Combustion', 'C3H8 + O2 -> CO2 + H2O'], ['Rusting', 'Fe + O2 -> Fe2O3'], ['Permanganate', 'KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2'],
        ['Copper and nitric acid (ionic)', 'Cu + NO3- + H+ -> Cu^2+ + NO + H2O'], ['Photosynthesis', 'CO2 + H2O -> C6H12O6 + O2'], ['Two solutions', 'H2 + O2 -> H2O + H2O2']].map(function (x) {
        return el('button', { type: 'button', class: 'chip', text: x[0], onclick: function () { inp.input.value = x[1]; run(); } });
      }));
      var out = el('div'), detail = el('div');
      var plainText = '';
      function run() {
        out.replaceChildren(); detail.replaceChildren(); plainText = '';
        var src = inp.input.value.trim();
        if (!src) return;
        try {
          var sides = src.split(/\s*(?:<=>|<->|⇌|⟶|→|->|=>|==>|=)\s*/);
          if (sides.length !== 2) throw new Error('Separate the reactants from the products with one arrow: -> or = or →');
          var lhs = splitSpecies(sides[0]), rhs = splitSpecies(sides[1]);
          if (!lhs.length || !rhs.length) throw new Error('Both sides need at least one substance');
          var species = lhs.concat(rhs).map(function (s) { return s.replace(/^\d+(?=[A-Z(\[e])/, ''); });   /* ignore any coefficients typed in */
          var parsed = species.map(function (s) { return parseFormula(s, { leading: false }); });
          var elems = [];
          parsed.forEach(function (p) { Object.keys(p.counts).forEach(function (k) { if (elems.indexOf(k) < 0) elems.push(k); }); });
          var hasCharge = parsed.some(function (p) { return p.charge !== 0; });
          var M = elems.map(function (k) { return parsed.map(function (p, j) { return (j < lhs.length ? 1 : -1) * (p.counts[k] || 0); }); });
          if (hasCharge) M.push(parsed.map(function (p, j) { return (j < lhs.length ? 1 : -1) * p.charge; }));
          var basis = nullspace(M, species.length);
          var lhsN = lhs.length;
          function eqn(v, html) {
            function side(from, to) {
              var bits = [];
              for (var j = from; j < to; j++) {
                if (v[j] === 0n) continue;
                var c = v[j] === 1n ? '' : String(v[j]);
                bits.push(html ? (c ? '<span class="co">' + c + '</span>' : '') + speciesHtml(species[j]) : c + speciesText(species[j]));
              }
              return bits.join(' + ');
            }
            return side(0, lhsN) + (html ? ' → ' : ' → ') + side(lhsN, species.length);
          }
          if (!basis.length) {
            out.appendChild(U.note('This equation cannot be balanced: no set of coefficients conserves every element' + (hasCharge ? ' and the charge' : '') + '. Check the formulas.', 'err'));
          } else if (basis.length === 1) {
            var v = basis[0];
            if (v.every(function (x) { return x <= 0n; })) v = v.map(function (x) { return -x; });
            if (v.some(function (x) { return x < 0n; })) {
              out.appendChild(U.note('It only balances with a substance on the other side of the arrow: ' + species.filter(function (s, j) { return v[j] < 0n; }).join(', ') + '.', 'err'));
            } else {
              var zero = species.filter(function (s, j) { return v[j] === 0n; });
              out.appendChild(el('div', { class: 'sc-eq', html: eqn(v, true), dataset: { k: 'equation' } }));
              out.appendChild(el('div', { class: 'sc-muted' }, 'Coefficients: ', el('span', { class: 'mono', text: v.join(', '), dataset: { k: 'coeffs' } })));
              if (zero.length) out.appendChild(U.note(zero.join(', ') + ' take' + (zero.length === 1 ? 's' : '') + ' no part: its coefficient is 0.', 'err'));
              plainText = eqn(v, false);
            }
          } else {
            out.appendChild(el('div', { class: 'sc-mid', text: basis.length + ' independent solutions', dataset: { k: 'multi' } }));
            out.appendChild(U.note('These reactions are independent: any positive combination of them also balances, so there is no single answer.'));
            basis.forEach(function (b, i) {
              if (b.every(function (x) { return x <= 0n; })) b = b.map(function (x) { return -x; });
              out.appendChild(el('div', { class: 'sc-eq', html: (i + 1) + '. ' + eqn(b, true), dataset: { k: 'solution-' + i } }));
            });
            var sum = basis.reduce(function (acc, b) { return acc.map(function (x, j) { return x + (b.every(function (y) { return y <= 0n; }) ? -b[j] : b[j]); }); }, species.map(function () { return 0n; }));
            if (sum.every(function (x) { return x > 0n; })) {
              var g = sum.reduce(function (a, x) { return gcdB(a, x); }, 0n);
              sum = sum.map(function (x) { return x / g; });
              out.appendChild(U.note('One combination using every substance: ' + eqn(sum, false)));
              plainText = eqn(sum, false);
            }
          }
          /* atom count check table */
          var rows = elems.map(function (k, i) { return [k, M[i]]; });
          if (hasCharge) rows.push(['charge', M[M.length - 1]]);
          detail.appendChild(el('details', null, el('summary', { text: 'Element matrix (reactants positive, products negative)' }),
            el('div', { class: 'scroll' }, U.table([''].concat(species.map(speciesText)), rows.map(function (r) { return [r[0]].concat(r[1].map(String)); }))),
            U.note('The coefficients form the null space of this matrix, found by exact fraction arithmetic (Gauss–Jordan elimination) and scaled to the smallest whole numbers.')));
        } catch (e) { out.appendChild(U.note(e.message, 'err')); }
      }
      U.live([inp], run);
      root.appendChild(U.panel(null, inp, examples, U.note('Separate substances with + and the two sides with -> (or = or →). Charges: Fe^3+, Fe{3+}, Fe+3, NO3- or Na+; an electron is e-.')));
      root.appendChild(U.panel('Balanced equation', out, U.btnrow(U.copyBtn('Copy equation', function () { return plainText; })), detail));
    }
  });

  /* ======================================================================= */
  /* SUVAT Equations Solver                                                  */
  /* ======================================================================= */
  var SUVAT_UNITS = {
    s: [['m', 1], ['km', 1000], ['cm', 0.01], ['mm', 0.001], ['ft', 0.3048], ['mi', 1609.344]],
    u: [['m/s', 1], ['km/h', 1 / 3.6], ['mph', 0.44704], ['ft/s', 0.3048]],
    v: [['m/s', 1], ['km/h', 1 / 3.6], ['mph', 0.44704], ['ft/s', 0.3048]],
    a: [['m/s²', 1], ['ft/s²', 0.3048], ['g', 9.80665]],
    t: [['s', 1], ['min', 60], ['h', 3600]]
  };
  var SUVAT_NAMES = { s: 'Displacement s', u: 'Initial velocity u', v: 'Final velocity v', a: 'Acceleration a', t: 'Time t' };
  function n4(x) { return fmt(x, 6); }
  /* Solve from any three of s, u, v, a, t (SI). Returns a list of complete
     solutions, each with the working. */
  function suvat(k) {
    var have = Object.keys(k).filter(function (x) { return k[x] !== null; }).sort().join('');
    var s = k.s, u = k.u, v = k.v, a = k.a, t = k.t, sols = [], rej = [];
    function add(o, work) { sols.push({ s: o.s, u: o.u, v: o.v, a: o.a, t: o.t, work: work }); }
    switch (have) {
      case 'auv': /* s, t from u v a */
        if (a === 0) { if (u !== v) throw new Error('With a = 0 the velocity cannot change, so u must equal v.'); throw new Error('With a = 0 and u = v, s and t cannot be found: any time works.'); }
        var tt = (v - u) / a;
        add({ s: (v * v - u * u) / (2 * a), u: u, v: v, a: a, t: tt }, ['t = (v − u) / a = (' + n4(v) + ' − ' + n4(u) + ') / ' + n4(a) + ' = ' + n4(tt) + ' s', 's = (v² − u²) / 2a = (' + n4(v * v) + ' − ' + n4(u * u) + ') / ' + n4(2 * a) + ' = ' + n4((v * v - u * u) / (2 * a)) + ' m']);
        break;
      case 'tuv':
        add({ s: (u + v) / 2 * t, u: u, v: v, a: (v - u) / t, t: t }, ['a = (v − u) / t = (' + n4(v) + ' − ' + n4(u) + ') / ' + n4(t) + ' = ' + n4((v - u) / t) + ' m/s²', 's = ½(u + v)t = ½ × (' + n4(u) + ' + ' + n4(v) + ') × ' + n4(t) + ' = ' + n4((u + v) / 2 * t) + ' m']);
        break;
      case 'suv':
        if (u + v === 0) throw new Error('With u + v = 0 the time cannot be found from s = ½(u + v)t.');
        var t3 = 2 * s / (u + v);
        if (s === 0) add({ s: 0, u: u, v: v, a: NaN, t: t3 }, ['t = 2s / (u + v) = 0']);
        else add({ s: s, u: u, v: v, a: (v * v - u * u) / (2 * s), t: t3 }, ['t = 2s / (u + v) = ' + n4(2 * s) + ' / ' + n4(u + v) + ' = ' + n4(t3) + ' s', 'a = (v² − u²) / 2s = ' + n4(v * v - u * u) + ' / ' + n4(2 * s) + ' = ' + n4((v * v - u * u) / (2 * s)) + ' m/s²']);
        break;
      case 'atu':
        add({ s: u * t + a * t * t / 2, u: u, v: u + a * t, a: a, t: t }, ['v = u + at = ' + n4(u) + ' + ' + n4(a) + ' × ' + n4(t) + ' = ' + n4(u + a * t) + ' m/s', 's = ut + ½at² = ' + n4(u) + ' × ' + n4(t) + ' + ½ × ' + n4(a) + ' × ' + n4(t) + '² = ' + n4(u * t + a * t * t / 2) + ' m']);
        break;
      case 'asu': case 'asv': {
        /* v² = u² + 2as gives up to two values; each fixes t */
        var known = have === 'asu' ? u : v, sq = have === 'asu' ? u * u + 2 * a * s : v * v - 2 * a * s;
        var other = have === 'asu' ? 'v' : 'u', eq = have === 'asu' ? 'v² = u² + 2as = ' + n4(u * u) + ' + 2 × ' + n4(a) + ' × ' + n4(s) + ' = ' + n4(sq) : 'u² = v² − 2as = ' + n4(v * v) + ' − 2 × ' + n4(a) + ' × ' + n4(s) + ' = ' + n4(sq);
        if (sq < -1e-12) throw new Error(eq + ', which is negative: the object never reaches that displacement.');
        var root = Math.sqrt(Math.max(0, sq)), vals = root === 0 ? [0] : [root, -root];
        vals.forEach(function (w) {
          var uu = have === 'asu' ? known : w, vv = have === 'asu' ? w : known;
          var tt2 = a !== 0 ? (vv - uu) / a : (uu !== 0 ? s / uu : NaN);
          var o = { s: s, u: uu, v: vv, a: a, t: tt2 };
          var work = [eq + ', so ' + other + ' = ' + (vals.length > 1 ? (w > 0 ? '+' : '−') : '') + n4(root) + ' m/s', a !== 0 ? 't = (v − u) / a = (' + n4(vv) + ' − ' + n4(uu) + ') / ' + n4(a) + ' = ' + n4(tt2) + ' s' : 't = s / u = ' + n4(tt2) + ' s'];
          if (tt2 < -1e-12) rej.push(o); else add(o, work);
        });
        break;
      }
      case 'stu':
        add({ s: s, u: u, v: 2 * s / t - u, a: 2 * (s - u * t) / (t * t), t: t }, ['a = 2(s − ut) / t² = 2 × (' + n4(s) + ' − ' + n4(u * t) + ') / ' + n4(t * t) + ' = ' + n4(2 * (s - u * t) / (t * t)) + ' m/s²', 'v = 2s / t − u = ' + n4(2 * s / t) + ' − ' + n4(u) + ' = ' + n4(2 * s / t - u) + ' m/s']);
        break;
      case 'atv':
        add({ s: v * t - a * t * t / 2, u: v - a * t, v: v, a: a, t: t }, ['u = v − at = ' + n4(v) + ' − ' + n4(a) + ' × ' + n4(t) + ' = ' + n4(v - a * t) + ' m/s', 's = vt − ½at² = ' + n4(v * t - a * t * t / 2) + ' m']);
        break;
      case 'stv':
        add({ s: s, u: 2 * s / t - v, v: v, a: 2 * (v * t - s) / (t * t), t: t }, ['u = 2s / t − v = ' + n4(2 * s / t) + ' − ' + n4(v) + ' = ' + n4(2 * s / t - v) + ' m/s', 'a = 2(vt − s) / t² = ' + n4(2 * (v * t - s) / (t * t)) + ' m/s²']);
        break;
      case 'ast':
        add({ s: s, u: s / t - a * t / 2, v: s / t + a * t / 2, a: a, t: t }, ['u = s/t − ½at = ' + n4(s / t) + ' − ' + n4(a * t / 2) + ' = ' + n4(s / t - a * t / 2) + ' m/s', 'v = u + at = ' + n4(s / t + a * t / 2) + ' m/s']);
        break;
      default: throw new Error('Enter exactly three of the five quantities and leave two blank.');
    }
    if ('t' in k && k.t !== null && k.t < 0) throw new Error('Time cannot be negative.');
    return { sols: sols, rejected: rej };
  }

  Tools.register({
    id: 'suvat-solver', category: 'science', name: 'SUVAT Equations Solver',
    description: 'Give any three of displacement, initial and final velocity, acceleration and time; get the other two (every valid solution) with the equation used and the working, in the units you choose.',
    keywords: ['suvat', 'equations of motion', 'kinematics', 'constant acceleration', 'displacement', 'velocity', 'acceleration', 'time', 'physics',
      'projectile', 'free fall', 'gravity', 'uniform acceleration', 'a level', 'gcse'],
    render: function (root) {
      setRoot(root);
      var fields = {}, units = {};
      var defaults = { s: '', u: '0', v: '', a: '9.81', t: '2' };
      var grid = el('div', { class: 'row' });
      Object.keys(SUVAT_NAMES).forEach(function (k) {
        fields[k] = textIn(SUVAT_NAMES[k], defaults[k], { inputMode: 'decimal', placeholder: 'unknown', dataset: { q: k } });
        units[k] = U.select({ label: 'Unit', value: SUVAT_UNITS[k][0][0], options: SUVAT_UNITS[k].map(function (x) { return x[0]; }) });
        units[k].querySelector('select').dataset.unit = k;
        grid.appendChild(el('div', { class: 'row', style: { alignItems: 'flex-end', gap: '4px' } }, fields[k], units[k]));
      });
      var presets = el('div', { class: 'chips' },
        el('button', { type: 'button', class: 'chip', text: 'a = g = 9.81 m/s² (down is positive)', onclick: function () { fields.a.input.value = '9.81'; units.a.querySelector('select').value = 'm/s²'; run(); } }),
        el('button', { type: 'button', class: 'chip', text: 'a = −9.81 m/s² (up is positive)', onclick: function () { fields.a.input.value = '-9.81'; units.a.querySelector('select').value = 'm/s²'; run(); } }),
        el('button', { type: 'button', class: 'chip', text: 'Clear all', onclick: function () { Object.keys(fields).forEach(function (k) { fields[k].input.value = ''; }); run(); } }));
      var out = el('div');
      function factor(k) { var u = selVal(units[k]); return SUVAT_UNITS[k].filter(function (x) { return x[0] === u; })[0][1]; }
      function run() {
        out.replaceChildren();
        var k = {}, filled = 0, bad = null;
        Object.keys(fields).forEach(function (q) {
          var raw = fields[q].input.value.trim();
          if (raw === '') { k[q] = null; return; }
          var x = val(fields[q]);
          if (isNaN(x)) bad = SUVAT_NAMES[q];
          k[q] = x * factor(q); filled++;
        });
        if (bad) { out.appendChild(U.note(bad + ' is not a number.', 'err')); return; }
        if (filled !== 3) { out.appendChild(U.note('Enter exactly three quantities and leave the other two blank (' + filled + ' entered).', filled > 3 ? 'err' : '')); return; }
        var r;
        try { r = suvat(k); } catch (e) { out.appendChild(U.note(e.message, 'err')); return; }
        var unknown = Object.keys(k).filter(function (q) { return k[q] === null; });
        r.sols.forEach(function (sol, i) {
          var box = el('div', { class: 'sc-card', style: { marginBottom: '10px' }, dataset: { k: 'sol-' + i } });
          if (r.sols.length > 1) box.appendChild(el('div', { class: 'sc-muted', text: 'Solution ' + (i + 1) + ' of ' + r.sols.length }));
          unknown.forEach(function (q) {
            var shown = sol[q] / factor(q);
            box.appendChild(el('div', { class: 'sc-mid' }, q + ' = ', el('span', { text: fmt(shown, 6), dataset: { k: 's' + (i + 1) + '-' + q } }), ' ' + selVal(units[q])));
          });
          box.appendChild(el('div', { class: 'sc-muted', style: { marginTop: '6px' } }, sol.work.map(function (w) { return el('div', { text: w }); })));
          out.appendChild(box);
        });
        if (r.rejected.length) out.appendChild(U.note(r.rejected.length + ' more solution' + (r.rejected.length > 1 ? 's give' : ' gives') + ' a negative time and ' + (r.rejected.length > 1 ? 'are' : 'is') + ' rejected (it describes the motion before t = 0).'));
        if (r.sols.length > 1) out.appendChild(U.note('Two valid answers: for example a thrown object passes the same height on the way up and on the way down.'));
        if (!r.sols.length) out.appendChild(U.note('No solution with a non-negative time.', 'err'));
        out.appendChild(U.note('Working is shown in SI units (m, m/s, m/s², s). Take one direction as positive and keep to it: a ball thrown upwards has u > 0 and a = −9.81 m/s².'));
      }
      U.live(Object.keys(fields).map(function (q) { return fields[q]; }).concat(Object.keys(units).map(function (q) { return units[q]; })), run);
      root.appendChild(U.panel(null, grid, presets, U.note('v = u + at   ·   s = ut + ½at²   ·   s = vt − ½at²   ·   v² = u² + 2as   ·   s = ½(u + v)t')));
      root.appendChild(U.panel('Result', out));
    }
  });

  /* ======================================================================= */
  /* Half-Life & Radioactive Decay Calculator                                */
  /* ======================================================================= */
  var YEAR_S = 31557600;  /* Julian year */
  var T_UNITS = [['s', 1], ['min', 60], ['h', 3600], ['d', 86400], ['y', YEAR_S]];
  var T_NAMES = { s: 'seconds', min: 'minutes', h: 'hours', d: 'days', y: 'years' };
  /* Half-lives from NUBASE2020 (via mendeleev); carbon-14 uses the 5,730-year
     Cambridge value that radiocarbon dating and school courses use. */
  var ISOTOPES = [
    ['Carbon-14', 5730, 'y', 14], ['Uranium-238', 4.463e9, 'y', 238], ['Uranium-235', 7.04e8, 'y', 235], ['Iodine-131', 8.02, 'd', 131],
    ['Cobalt-60', 5.27, 'y', 60], ['Radon-222', 3.8215, 'd', 222], ['Caesium-137', 30.04, 'y', 137], ['Strontium-90', 28.91, 'y', 90],
    ['Tritium (hydrogen-3)', 12.32, 'y', 3], ['Potassium-40', 1.248e9, 'y', 40], ['Plutonium-239', 24110, 'y', 239], ['Americium-241', 432.6, 'y', 241],
    ['Radium-226', 1600, 'y', 226], ['Polonium-210', 138.376, 'd', 210], ['Thorium-232', 1.4e10, 'y', 232], ['Lead-210', 22.2, 'y', 210],
    ['Fluorine-18', 109.734, 'min', 18], ['Phosphorus-32', 14.269, 'd', 32]
  ];
  function tFactor(u) { return T_UNITS.filter(function (x) { return x[0] === u; })[0][1]; }
  function unitSel(label, v) { return U.select({ label: label, value: v, options: T_UNITS.map(function (x) { return { value: x[0], label: T_NAMES[x[0]] }; }) }); }

  Tools.register({
    id: 'half-life', category: 'science', name: 'Half-Life & Radioactive Decay Calculator',
    description: 'Solve N = N₀(½)^(t/T) for the amount left, the starting amount, the time or the half-life, with the decay constant, mean lifetime, activity in becquerels and curies, isotope presets, a decay curve and carbon dating.',
    keywords: ['half life', 'half-life', 'radioactive decay', 'decay constant', 'mean lifetime', 'activity', 'becquerel', 'curie', 'isotope', 'radiocarbon',
      'carbon dating', 'carbon 14', 'exponential decay', 'nuclear', 'physics'],
    render: function (root) {
      setRoot(root);
      var solve = U.chips([{ value: 'N', label: 'Amount left N' }, { value: 'N0', label: 'Starting amount N₀' }, { value: 't', label: 'Time t' }, { value: 'T', label: 'Half-life T' }], function () { run(); }, 'N');
      solve.dataset.k = 'hl-solve';
      var preset = U.select({ label: 'Isotope', value: '0', options: [{ value: '', label: 'Custom half-life' }].concat(ISOTOPES.map(function (x, i) { return { value: String(i), label: x[0] + ' (' + fmtNum(x[1]) + ' ' + T_NAMES[x[2]] + ')' }; })) });
      var N0 = numIn('Starting amount N₀', 100, { min: 0 }), N = numIn('Amount left N', 25, { min: 0 });
      var t = numIn('Time elapsed t', 11460, { min: 0 }), tu = unitSel('Unit of t', 'y');
      var T = numIn('Half-life T', 5730, { min: 0 }), Tu = unitSel('Unit of T', 'y');
      var res = el('div', { class: 'sc-big', dataset: { k: 'hl-result' } }), cards = el('div', { class: 'sc-grid' }), chart = el('div', { class: 'sc-chart' });
      function fmtNum(x) { return x >= 1e6 ? fmt(x, 4) : x.toLocaleString('en-GB', { maximumFractionDigits: 4 }); }
      preset.querySelector('select').addEventListener('change', function () {
        var i = this.value;
        if (i === '') return;
        T.input.value = ISOTOPES[i][1]; Tu.querySelector('select').value = ISOTOPES[i][2];
        /* a preset fixes T, so stop solving for it */
        if (solve.value === 'T') solve.children[0].click();
        run(); runAct();
      });
      T.input.addEventListener('input', function () { preset.querySelector('select').value = ''; });
      function run() {
        var what = solve.value;
        [N0, N, t, T].forEach(function (w) { w.input.disabled = false; w.style.opacity = ''; });
        var target = { N: N, N0: N0, t: t, T: T }[what];
        target.input.disabled = true; target.style.opacity = '.6';
        res.textContent = '—'; cards.replaceChildren(); chart.innerHTML = '';
        var n0 = val(N0), n = val(N), ts = val(t) * tFactor(selVal(tu)), Ts = val(T) * tFactor(selVal(Tu));
        try {
          if (what === 'N') { if ([n0, ts, Ts].some(isNaN) || Ts <= 0) throw new Error('Enter N₀, t and a positive half-life.'); n = n0 * Math.pow(0.5, ts / Ts); res.textContent = 'N = ' + fmt(n, 6); N.input.value = parseFloat(n.toPrecision(10)); }
          else if (what === 'N0') { if ([n, ts, Ts].some(isNaN) || Ts <= 0) throw new Error('Enter N, t and a positive half-life.'); n0 = n / Math.pow(0.5, ts / Ts); res.textContent = 'N₀ = ' + fmt(n0, 6); N0.input.value = parseFloat(n0.toPrecision(10)); }
          else if (what === 't') {
            if ([n0, n, Ts].some(isNaN) || Ts <= 0 || n0 <= 0 || n <= 0) throw new Error('Enter N₀, N and the half-life, all positive.');
            if (n > n0) throw new Error('N cannot be larger than N₀: decay only reduces the amount.');
            ts = Ts * Math.log2(n0 / n);
            var tv = ts / tFactor(selVal(tu));
            res.textContent = 't = ' + fmt(tv, 6) + ' ' + T_NAMES[selVal(tu)]; t.input.value = parseFloat(tv.toPrecision(10));
          } else {
            if ([n0, n, ts].some(isNaN) || n0 <= 0 || n <= 0 || ts <= 0) throw new Error('Enter N₀, N and the time, all positive.');
            if (n >= n0) throw new Error('N must be smaller than N₀ to find a half-life.');
            Ts = ts / Math.log2(n0 / n);
            var Tv = Ts / tFactor(selVal(Tu));
            res.textContent = 'T = ' + fmt(Tv, 6) + ' ' + T_NAMES[selVal(Tu)]; T.input.value = parseFloat(Tv.toPrecision(10));
          }
        } catch (e) { res.textContent = '—'; cards.appendChild(U.note(e.message, 'err')); return; }
        var lam = Math.LN2 / Ts, halves = ts / Ts;
        cards.append(card('Fraction remaining', fmt(n / n0, 6) + ' (' + fmt(n / n0 * 100, 5) + '%)', 'hl-fraction'), card('Half-lives elapsed', fmt(halves, 6), 'hl-halves'),
          card('Decay constant λ = ln 2 / T', fmt(lam, 6) + ' s⁻¹', 'hl-lambda'), card('λ per ' + T_NAMES[selVal(Tu)].replace(/s$/, ''), fmt(lam * tFactor(selVal(Tu)), 6), 'hl-lambda-u'),
          card('Mean lifetime τ = 1/λ', fmt(1 / lam / tFactor(selVal(Tu)), 6) + ' ' + T_NAMES[selVal(Tu)], 'hl-tau'));
        /* decay curve: N/N0 against time, 0 to max(5T, 1.2t) */
        var span = Math.max(5 * Ts, ts * 1.2), W = 360, H = 170, Lp = 34, Rp = 10, Tp = 10, Bp = 26;
        function X(x) { return (Lp + x / span * (W - Lp - Rp)).toFixed(1); } function Y(y) { return (H - Bp - y * (H - Tp - Bp)).toFixed(1); }
        var d = '', svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">';
        for (var i = 0; i <= 120; i++) { var x = span * i / 120; d += (i ? 'L' : 'M') + X(x) + ' ' + Y(Math.pow(0.5, x / Ts)); }
        [0, 0.25, 0.5, 0.75, 1].forEach(function (y) { svg += '<line class="grid" x1="' + Lp + '" x2="' + (W - Rp) + '" y1="' + Y(y) + '" y2="' + Y(y) + '"/><text class="tick" x="' + (Lp - 4) + '" y="' + (Number(Y(y)) + 4) + '" text-anchor="end">' + (y * 100) + '%</text>'; });
        for (var h = 1; h * Ts <= span + 1e-9; h++) svg += '<text class="tick" x="' + X(h * Ts) + '" y="' + (H - 8) + '" text-anchor="middle">' + h + 'T</text>';
        svg += '<line class="axis" x1="' + Lp + '" x2="' + (W - Rp) + '" y1="' + Y(0) + '" y2="' + Y(0) + '"/><path class="curve" d="' + d + '"/>';
        if (ts >= 0 && ts <= span) svg += '<line class="guide" x1="' + X(ts) + '" x2="' + X(ts) + '" y1="' + Y(0) + '" y2="' + Y(n / n0) + '"/><circle class="pt" cx="' + X(ts) + '" cy="' + Y(n / n0) + '" r="4"/>';
        chart.innerHTML = svg + '</svg>';
      }
      U.live([N0, N, t, tu, T, Tu], run);

      /* activity */
      var mass = numIn('Mass of the isotope (g)', 1, { min: 0 }), molar = numIn('Molar mass (g/mol)', 14, { min: 0 });
      var atoms = el('div', { class: 'sc-muted' }), act = el('div', { class: 'sc-grid' });
      function runAct() {
        act.replaceChildren(); atoms.textContent = '';
        var i = preset.querySelector('select').value;
        if (i !== '' && document.activeElement !== molar.input) molar.input.value = ISOTOPES[i][3];
        var m = val(mass), M = val(molar), Ts = val(T) * tFactor(selVal(Tu));
        if (!(m >= 0) || !(M > 0) || !(Ts > 0)) { atoms.textContent = 'Enter the mass, the molar mass and a half-life above.'; return; }
        var nAt = m / M * AVOGADRO, A = Math.LN2 / Ts * nAt;
        atoms.textContent = 'N = (m ÷ M) × Nᴀ = ' + fmt(nAt, 6) + ' atoms; A = λN.';
        act.append(card('Activity', fmt(A, 5) + ' Bq', 'activity-bq'), card('In curies (1 Ci = 3.7 × 10¹⁰ Bq)', fmt(A / 3.7e10, 5) + ' Ci', 'activity-ci'),
          card('After the time t above', fmt(A * Math.pow(0.5, val(t) * tFactor(selVal(tu)) / Ts), 5) + ' Bq', 'activity-later'));
      }
      U.live([mass, molar, T, Tu, t, tu], runAct);

      /* carbon dating */
      var pct = numIn('Carbon-14 remaining (% of a living sample)', 25, { min: 0, max: 100 });
      var age = el('div', { class: 'sc-big', dataset: { k: 'c14-age' } }), ageNote = el('div', { class: 'sc-muted', dataset: { k: 'c14-libby' } });
      U.live([pct], function () {
        var p = val(pct);
        if (!(p > 0 && p <= 100)) { age.textContent = '—'; ageNote.textContent = 'Enter a percentage above 0.'; return; }
        var years = 5730 * Math.log2(100 / p), libby = 8033 * Math.log(100 / p);
        age.textContent = Math.round(years).toLocaleString('en-GB') + ' years';
        ageNote.textContent = 'Using the 5,730-year half-life. The conventional radiocarbon age, which laboratories quote with the Libby half-life of 5,568 years, is ' + Math.round(libby).toLocaleString('en-GB') +
          ' years BP; either still needs calibration against tree-ring records for a calendar date.';
      });

      root.appendChild(U.panel('Solve N = N₀ × (½)^(t / T)', el('div', null, el('div', { class: 'sc-muted', text: 'Find:', style: { marginBottom: '4px' } }), solve), preset, U.row(N0, N), U.row(t, tu), U.row(T, Tu),
        U.note('N and N₀ can be any amount that decays in proportion: atoms, grams, becquerels, counts per minute or a percentage.'), res, cards, chart));
      root.appendChild(U.panel('Activity', U.row(mass, molar), atoms, act));
      root.appendChild(U.panel('Carbon dating', pct, age, ageNote));
      runAct();
    }
  });

  /* ======================================================================= */
  /* UK Degree Classification Calculator                                     */
  /* ======================================================================= */
  var DEG_PRESETS = [
    { id: '0-40-60', label: 'Years 1–3: 0 / 40 / 60 (common in England, Wales and Northern Ireland)', w: [0, 40, 60] },
    { id: '0-33-67', label: 'Years 1–3: 0 / 33 / 67 (second year counts half as much as final)', w: [0, 1, 2] },
    { id: '0-50-50', label: 'Years 1–3: 0 / 50 / 50', w: [0, 50, 50] },
    { id: '0-25-75', label: 'Years 1–3: 0 / 25 / 75', w: [0, 25, 75] },
    { id: '0-20-80', label: 'Years 1–3: 0 / 20 / 80', w: [0, 20, 80] },
    { id: '0-0-100', label: 'Final year only', w: [0, 0, 100] },
    { id: 'mastr', label: 'Integrated master\'s, years 1–4: 0 / 20 / 40 / 40', w: [0, 20, 40, 40] },
    { id: 'scot-40-60', label: 'Scottish honours, years 3 and 4: 40 / 60', w: [0, 0, 40, 60] },
    { id: 'scot-50-50', label: 'Scottish honours, years 3 and 4: 50 / 50', w: [0, 0, 50, 50] },
    { id: 'custom', label: 'Custom weighting', w: null }
  ];
  var CLASSES = [[70, 'First-class honours (1st)'], [60, 'Upper second-class (2:1)'], [50, 'Lower second-class (2:2)'], [40, 'Third-class honours (3rd)']];
  function classify(avg) { for (var i = 0; i < CLASSES.length; i++) if (avg >= CLASSES[i][0]) return CLASSES[i]; return [0, 'Below honours (under 40%)']; }
  function degreeCalc(state) {
    /* per year: credit-weighted average of the marks so far, plus what is left */
    var years = state.years.map(function (mods, i) {
      var done = 0, doneCr = 0, remCr = 0;
      mods.forEach(function (m) {
        var c = Number(m.credits), k = String(m.mark).trim() === '' ? NaN : Number(m.mark);
        if (!(c > 0)) return;
        if (isNaN(k)) remCr += c; else { done += c * k; doneCr += c; }
      });
      return { w: Number(state.weights[i]) || 0, sum: done, doneCr: doneCr, remCr: remCr, avg: doneCr ? done / doneCr : NaN };
    });
    var counted = years.filter(function (y) { return y.w > 0 && (y.doneCr + y.remCr) > 0; });
    var W = counted.reduce(function (a, y) { return a + y.w; }, 0);
    var sofar = counted.filter(function (y) { return y.doneCr > 0; }), Ws = sofar.reduce(function (a, y) { return a + y.w; }, 0);
    var current = Ws ? sofar.reduce(function (a, y) { return a + y.w * y.avg; }, 0) / Ws : NaN;
    /* final = K + m × R if every remaining module scores m */
    var K = 0, Rr = 0;
    counted.forEach(function (y) { var tot = y.doneCr + y.remCr; K += y.w / W * y.sum / tot; Rr += y.w / W * y.remCr / tot; });
    return { years: years, current: current, K: K, R: Rr, W: W };
  }

  Tools.register({
    id: 'degree-classification', category: 'science', name: 'UK Degree Classification Calculator',
    description: 'Work out your weighted average and UK honours classification from module credits and marks, with common year weightings (including Scottish honours), a borderline note and the mark you need in your remaining modules.',
    keywords: ['degree classification', 'degree calculator', 'uk degree', 'university', 'honours', 'first', '2:1', '2:2', 'third', 'weighted average',
      'modules', 'credits', 'grade', 'marks', 'dissertation', 'student', 'scottish honours', 'what do i need'],
    render: function (root) {
      setRoot(root);
      var saved = store('degree-classification');
      var state = saved && saved.years ? saved : {
        preset: '0-40-60', weights: [0, 40, 60, 0],
        years: [[], [{ name: 'Module 1', credits: 60, mark: 60 }, { name: 'Module 2', credits: 60, mark: 70 }],
          [{ name: 'Dissertation', credits: 60, mark: 70 }, { name: 'Remaining modules', credits: 60, mark: '' }], []]
      };
      while (state.years.length < 4) state.years.push([]);
      while (state.weights.length < 4) state.weights.push(0);
      var preset = U.select({ label: 'Year weighting', value: state.preset, options: DEG_PRESETS.map(function (p) { return { value: p.id, label: p.label }; }) });
      var wRow = el('div', { class: 'row' }), yearsBox = el('div', { class: 'stack' }), out = el('div');
      var wInputs = [];
      function save() { store('degree-classification', state); }
      function buildWeights() {
        wRow.replaceChildren(); wInputs = [];
        state.weights.forEach(function (w, i) {
          var f = numIn('Year ' + (i + 1) + ' weight', w, { min: 0, dataset: { year: String(i + 1) } });
          f.style.maxWidth = '130px';
          f.input.addEventListener('input', function () { state.weights[i] = val(f) || 0; state.preset = 'custom'; preset.querySelector('select').value = 'custom'; save(); calc(); });
          wInputs.push(f);
          wRow.appendChild(f);
        });
      }
      function modRow(yi, m, idx) {
        var name = el('input', { type: 'text', value: m.name || '', placeholder: 'Module', 'aria-label': 'Module name' });
        var cr = el('input', { type: 'number', value: m.credits, min: 0, step: 'any', 'aria-label': 'Credits', dataset: { f: 'credits' } });
        var mk = el('input', { type: 'number', value: m.mark, min: 0, max: 100, step: 'any', placeholder: 'to come', 'aria-label': 'Mark (%)', dataset: { f: 'mark' } });
        [name, cr, mk].forEach(function (inp) { inp.addEventListener('input', function () { m.name = name.value; m.credits = cr.value; m.mark = mk.value; save(); calc(); }); });
        return el('div', { class: 'dg-mod' }, name, cr, mk, U.button('✕', function () { state.years[yi].splice(idx, 1); save(); buildYears(); calc(); }, 'ghost'));
      }
      function buildYears() {
        yearsBox.replaceChildren();
        state.years.forEach(function (mods, yi) {
          if (!(state.weights[yi] > 0) && !mods.length && yi > 2) return;
          var list = el('div', { class: 'dg-mods', dataset: { year: String(yi + 1) } }, el('div', { class: 'dg-mod dg-head' }, el('span', { text: 'Module' }), el('span', { text: 'Credits' }), el('span', { text: 'Mark %' }), el('span')));
          mods.forEach(function (m, i) { list.appendChild(modRow(yi, m, i)); });
          var avg = el('span', { class: 'sc-muted', dataset: { k: 'year-' + (yi + 1) } });
          yearsBox.appendChild(U.panel('Year ' + (yi + 1) + (state.weights[yi] > 0 ? '' : ' (not counted)'), list,
            U.btnrow(U.button('Add module', function () { state.years[yi].push({ name: '', credits: 20, mark: '' }); save(); buildYears(); calc(); }), avg)));
        });
      }
      preset.querySelector('select').addEventListener('change', function () {
        var p = DEG_PRESETS.filter(function (x) { return x.id === this.value; }, this)[0];
        state.preset = p.id;
        if (p.w) { var tot = p.w.reduce(function (a, b) { return a + b; }, 0); state.weights = [0, 1, 2, 3].map(function (i) { return p.w[i] ? parseFloat((p.w[i] / tot * 100).toFixed(4)) : 0; }); }
        save(); buildWeights(); buildYears(); calc();
      });
      function calc() {
        out.replaceChildren();
        var r = degreeCalc(state);
        r.years.forEach(function (y, i) {
          var n = yearsBox.querySelector('[data-k="year-' + (i + 1) + '"]');
          if (n) n.textContent = y.doneCr ? 'Average so far ' + y.avg.toFixed(2) + '% over ' + y.doneCr + ' credits' + (y.remCr ? ' (' + y.remCr + ' credits to come)' : '') : (y.remCr ? y.remCr + ' credits to come' : '');
        });
        if (!r.W) { out.appendChild(U.note('Give at least one year a weight and add its modules.', 'err')); return; }
        if (isNaN(r.current)) { out.appendChild(U.note('Enter some marks to see your average.')); }
        else {
          var cls = classify(r.current);
          out.append(el('div', { class: 'sc-muted', text: r.R > 0 ? 'Weighted average so far' : 'Final weighted average' }),
            el('div', { class: 'sc-big', text: r.current.toFixed(2) + '%', dataset: { k: 'average' } }),
            el('div', { class: 'sc-mid', text: cls[1], dataset: { k: 'class' } }));
          var next = CLASSES.filter(function (c) { return c[0] > r.current; }).pop();
          if (next && next[0] - r.current <= 2) out.appendChild(U.note('Borderline: within ' + (next[0] - r.current).toFixed(2) + ' points of ' + next[1].replace(/ \(.*/, '') + '. Many universities look again at borderline marks (often within 1 to 2 points), for example raising you if most of your final-year credits are in the higher class. The rules vary by university, so check your regulations.', 'ok'));
        }
        if (r.R > 0) {
          var rows = CLASSES.map(function (c) {
            var m = (c[0] - r.K) / r.R, txt = m <= 0 ? 'Already secured' : m > 100 ? 'Not reachable (would need ' + m.toFixed(1) + '%)' : m.toFixed(2) + '%';
            return [c[1], txt];
          });
          var rem = r.years.reduce(function (a, y) { return a + (y.w > 0 ? y.remCr : 0); }, 0);
          out.append(el('h4', { text: 'What you need across your remaining ' + rem + ' credits' }), el('div', { class: 'scroll', dataset: { k: 'needed' } }, U.table(['For', 'Average needed'], rows)));
        }
        out.appendChild(U.note('Boundaries: 70% First, 60% 2:1, 50% 2:2, 40% Third. Averages are weighted by credits within each year, then by the year weighting. Universities differ (some drop your lowest marks or use the median), so treat this as a guide.'));
      }
      buildWeights(); buildYears(); calc();
      root.appendChild(U.panel(null, preset, wRow, U.note('Leave a mark blank for a module you have not finished yet. Everything stays in this browser.'),
        U.btnrow(U.button('Start again', function () { state = { preset: '0-40-60', weights: [0, 40, 60, 0], years: [[], [], [], []] }; preset.querySelector('select').value = '0-40-60'; save(); buildWeights(); buildYears(); calc(); }, 'ghost'))));
      root.appendChild(yearsBox);
      root.appendChild(U.panel('Result', out));
    }
  });

  /* ======================================================================= */
  /* Citation Generator                                                      */
  /* ======================================================================= */
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MLA_MON = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
  var IEEE_MON = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
  var CT_TYPES = [
    { id: 'book', label: 'Book', fields: ['authors', 'year', 'title', 'edition', 'place', 'publisher', 'doi', 'url'] },
    { id: 'chapter', label: 'Chapter in an edited book', fields: ['authors', 'year', 'title', 'editors', 'container', 'edition', 'place', 'publisher', 'pages'] },
    { id: 'journal', label: 'Journal article', fields: ['authors', 'year', 'title', 'container', 'volume', 'issue', 'pages', 'doi', 'url'] },
    { id: 'website', label: 'Web page', fields: ['authors', 'year', 'date', 'title', 'container', 'url', 'accessed'] },
    { id: 'newspaper', label: 'Newspaper article', fields: ['authors', 'year', 'date', 'title', 'container', 'pages', 'url', 'accessed'] },
    { id: 'report', label: 'Report', fields: ['authors', 'year', 'title', 'number', 'place', 'publisher', 'url', 'accessed'] },
    { id: 'film', label: 'Film', fields: ['authors', 'year', 'title', 'publisher', 'place', 'url'] },
    { id: 'podcast', label: 'Podcast episode', fields: ['authors', 'year', 'date', 'title', 'container', 'number', 'publisher', 'url', 'accessed'] }
  ];
  var CT_LABELS = {
    authors: { book: 'Authors', chapter: 'Chapter authors', film: 'Director(s)', podcast: 'Host(s)', _: 'Authors or organisation' },
    title: { chapter: 'Chapter title', journal: 'Article title', website: 'Page title', newspaper: 'Headline', podcast: 'Episode title', _: 'Title' },
    container: { chapter: 'Book title', journal: 'Journal', website: 'Website name', newspaper: 'Newspaper', podcast: 'Podcast name', _: 'Container' },
    number: { report: 'Report number', podcast: 'Episode number', _: 'Number' },
    publisher: { film: 'Production company or distributor', podcast: 'Publisher or network', report: 'Publisher or organisation', _: 'Publisher' },
    year: { _: 'Year' }, date: { _: 'Date published (optional)' }, editors: { _: 'Editors' }, edition: { _: 'Edition (number)' },
    place: { _: 'Place of publication' }, volume: { _: 'Volume' }, issue: { _: 'Issue' }, pages: { _: 'Pages (e.g. 145-160)' },
    doi: { _: 'DOI' }, url: { _: 'URL' }, accessed: { _: 'Date accessed' }
  };
  function ctLabel(f, type) { var l = CT_LABELS[f]; return l[type] || l._; }
  var PARTICLES = /^(van|von|de|der|den|da|di|du|le|la|del|dos|das|ter|ten|al|el|bin)$/i;
  /* One name per line: "Jane Smith", "Smith, Jane" or {Organisation}. */
  function parseNames(text) {
    return String(text || '').split(/\n|;/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (line) {
      var m = /^\{(.+)\}$/.exec(line);
      if (m) return { org: m[1].trim() };
      if (line.indexOf(',') > -1) { var p = line.split(','); return { family: p[0].trim(), given: p.slice(1).join(',').trim() }; }
      var w = line.split(/\s+/);
      if (w.length === 1) return { org: line };
      var i = w.length - 1;
      while (i > 1 && PARTICLES.test(w[i - 1])) i--;
      return { family: w.slice(i).join(' '), given: w.slice(0, i).join(' ') };
    });
  }
  function initials(given, sep) {
    return given.split(/[\s.]+/).filter(Boolean).map(function (t) {
      return t.split('-').map(function (p) { return p.charAt(0).toUpperCase() + '.'; }).join('-');
    }).join(sep);
  }
  var NAME = {
    harvard: function (n) { return n.org || n.family + (n.given ? ', ' + initials(n.given, '') : ''); },
    apa: function (n) { return n.org || n.family + (n.given ? ', ' + initials(n.given, ' ') : ''); },
    apaEd: function (n) { return n.org || (n.given ? initials(n.given, ' ') + ' ' : '') + n.family; },
    inverted: function (n) { return n.org || n.family + (n.given ? ', ' + n.given : ''); },
    natural: function (n) { return n.org || (n.given ? n.given + ' ' : '') + n.family; },
    ieee: function (n) { return n.org || (n.given ? initials(n.given, ' ') + ' ' : '') + n.family; },
    harvardEd: function (n) { return n.org || n.family + (n.given ? ', ' + initials(n.given, '') : ''); }
  };
  function authorList(names, style) {
    var n = names.length;
    if (!n) return '';
    if (style === 'harvard') {
      var h = names.map(NAME.harvard);
      return n >= 4 ? h[0] + ' et al.' : n === 1 ? h[0] : h.slice(0, -1).join(', ') + ' and ' + h[n - 1];
    }
    if (style === 'apa') {
      var a = names.map(NAME.apa);
      if (n === 1) return a[0];
      if (n > 20) return a.slice(0, 19).join(', ') + ', . . . ' + a[n - 1];
      return a.slice(0, -1).join(', ') + ', & ' + a[n - 1];
    }
    if (style === 'mla') {
      if (n === 1) return NAME.inverted(names[0]);
      if (n === 2) return NAME.inverted(names[0]) + ', and ' + NAME.natural(names[1]);
      return NAME.inverted(names[0]) + ', et al.';
    }
    if (style === 'chicago') {
      if (n === 1) return NAME.inverted(names[0]);
      if (n > 10) return [NAME.inverted(names[0])].concat(names.slice(1, 7).map(NAME.natural)).join(', ') + ', et al.';
      var c = [NAME.inverted(names[0])].concat(names.slice(1).map(NAME.natural));
      return n === 2 ? c[0] + ', and ' + c[1] : c.slice(0, -1).join(', ') + ', and ' + c[n - 1];
    }
    var ie = names.map(NAME.ieee);
    if (n > 6) return ie[0] + ' et al.';
    return n === 1 ? ie[0] : n === 2 ? ie[0] + ' and ' + ie[1] : ie.slice(0, -1).join(', ') + ', and ' + ie[n - 1];
  }
  function surname(n) { return n.org || n.family; }
  function ordinal(n) { n = parseInt(n, 10); var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  var SMALL_WORDS = /^(a|an|the|and|but|or|nor|for|so|yet|as|at|by|in|of|off|on|per|to|up|via|from|into|onto|with|over|upon|than)$/i;
  function titleCase(s) {
    var words = String(s).split(/(\s+)/), idx = [];
    words.forEach(function (w, i) { if (w.trim()) idx.push(i); });
    var after = true;
    return words.map(function (w, i) {
      if (!w.trim()) return w;
      var out, bare = w.replace(/[^A-Za-z']/g, '');
      if (/[A-Z]/.test(w.slice(1)) || /\d/.test(w)) out = w;
      else if (!after && i !== idx[idx.length - 1] && SMALL_WORDS.test(bare)) out = w.toLowerCase();
      else out = w.split('-').map(function (p) { return p.replace(/^([^A-Za-z]*)([a-z])/, function (m, a, b) { return a + b.toUpperCase(); }); }).join('-');
      after = /[:?!—]$/.test(w);
      return out;
    }).join('');
  }
  /* Page ranges: en dash; MLA and Chicago shorten the second number
     (CMOS 9.61 inclusive numbers; MLA keeps at least two digits). */
  function pageRange(p, style) {
    var m = /^\s*(\d+)\s*[-–—]+\s*(\d+)\s*$/.exec(p || '');
    if (!m) return { text: String(p || '').trim(), multi: /[-–,]/.test(p || '') };
    var a = m[1], b = m[2];
    if ((style === 'mla' || style === 'chicago') && b.length === a.length && +a >= 100) {
      var keep = style === 'mla' ? 2 : (+a % 100 === 0 ? b.length : +a % 100 < 10 ? 1 : 2);
      var i = 0;
      while (i < b.length - keep && a[i] === b[i]) i++;
      b = b.slice(i);
    }
    return { text: a + '–' + b, multi: true };
  }
  function doiOf(d) { return String(d || '').trim().replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:\s*)/i, ''); }
  function dayMonth(iso, style) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return null;
    var y = m[1], mo = +m[2] - 1, d = +m[3];
    if (style === 'harvard') return { dm: d + ' ' + MONTHS[mo], full: d + ' ' + MONTHS[mo] + ' ' + y };
    if (style === 'apa') return { md: MONTHS[mo] + ' ' + d, full: MONTHS[mo] + ' ' + d + ', ' + y };
    if (style === 'mla') return { full: d + ' ' + MLA_MON[mo] + ' ' + y };
    if (style === 'chicago') return { full: MONTHS[mo] + ' ' + d + ', ' + y };
    return { full: IEEE_MON[mo] + ' ' + d + ', ' + y };
  }
  function dot(s) { return /[.?!]$/.test(s) ? s : s + '.'; }
  function I(t) { return { i: t }; }

  /* Build a reference as segments: strings and { i: italic text }. */
  function citeParts(e, style) {
    var names = parseNames(e.authors), eds = parseNames(e.editors), P = [], year = String(e.year || '').trim() || 'n.d.';
    var t = String(e.title || '').trim(), cont = String(e.container || '').trim(), ed = String(e.edition || '').trim();
    var edN = /^\d+$/.test(ed) && +ed > 1 ? ordinal(ed) : (ed && !/^\d+$/.test(ed) ? ed : '');
    var pg = pageRange(e.pages, style), doi = doiOf(e.doi), url = String(e.url || '').trim(), num = String(e.number || '').trim();
    var place = String(e.place || '').trim(), pub = String(e.publisher || '').trim(), vol = String(e.volume || '').trim(), iss = String(e.issue || '').trim();
    var acc = dayMonth(e.accessed, style), pd = dayMonth(e.date, style), authors = authorList(names, style);
    var type = e.type, TT = style === 'mla' || style === 'chicago' ? titleCase(t) : t, CT = style === 'mla' || style === 'chicago' ? titleCase(cont) : cont;
    var italicTitle = ['book', 'report', 'film', 'website'].indexOf(type) > -1;
    function push() { for (var i = 0; i < arguments.length; i++) if (arguments[i]) P.push(arguments[i]); }
    function pubPlace(sep) { return place && pub ? place + ': ' + pub : pub || place; }

    if (style === 'harvard') {
      var link = doi ? ' Available at: https://doi.org/' + doi + '.' : url ? ' Available at: ' + url + (acc ? ' (Accessed: ' + acc.full + ')' : '') + '.' : '';
      var lead = authors || (italicTitle ? null : '‘' + t + '’');
      if (type === 'film') { push(I(t), ' (' + year + ') ', names.length ? 'Directed by ' + names.map(NAME.natural).join(' and ') + '. ' : '', pubPlace() ? dot(pubPlace()) : ''); return P.concat(link ? [link] : []); }
      if (lead) push(lead, ' (' + year + ') '); else { push(I(t), ' (' + year + ')'); }
      if (type === 'book') push(lead ? I(t) : '', '.', edN ? ' ' + edN + ' edn.' : '', pubPlace() ? ' ' + dot(pubPlace()) : '');
      else if (type === 'chapter') push('‘' + t + '’, in ', eds.length ? eds.map(NAME.harvardEd).join(' and ') + ' (' + (eds.length > 1 ? 'eds' : 'ed.') + ') ' : '', I(cont), '.', edN ? ' ' + edN + ' edn.' : '', pubPlace() ? ' ' + pubPlace() : '', pg.text ? ', ' + (pg.multi ? 'pp. ' : 'p. ') + pg.text : '', '.');
      else if (type === 'journal') push(lead === authors && authors ? '‘' + t + '’, ' : ', ', I(cont), vol ? ', ' + vol + (iss ? '(' + iss + ')' : '') : '', pg.text ? ', ' + (pg.multi ? 'pp. ' : 'p. ') + pg.text : '', '.');
      else if (type === 'website') push(lead ? I(t) : '', '.');
      else if (type === 'newspaper') push(authors ? '‘' + t + '’, ' : ', ', I(cont), pd ? ', ' + pd.dm : '', pg.text ? ', ' + (pg.multi ? 'pp. ' : 'p. ') + pg.text : '', '.');
      else if (type === 'report') push(lead ? I(t) : '', '.', num ? ' ' + dot(num) : '', pubPlace() ? ' ' + dot(pubPlace()) : '');
      else if (type === 'podcast') push(authors ? '‘' + t + '’, ' : ', ', I(cont), num ? ', Episode ' + num : '', '.');
      return P.concat(link ? [link] : []);
    }
    if (style === 'apa') {
      var alink = doi ? ' https://doi.org/' + doi : url ? ' ' + url : '';
      var date = year + (pd && pd.md && ['website', 'newspaper', 'podcast'].indexOf(type) > -1 ? ', ' + pd.md : '');
      var role = type === 'film' ? ' (Director' + (names.length > 1 ? 's' : '') + ')' : type === 'podcast' ? ' (Host' + (names.length > 1 ? 's' : '') + ')' : '';
      if (authors) push(authors + role, role ? '. ' : ' ', '(' + date + '). ');
      if (type === 'book') push(authors ? I(t) : '', !authors ? I(t) : '', edN ? ' (' + edN + ' ed.)' : '', !authors ? ' (' + date + ')' : '', '. ', pub ? dot(pub) : '');
      else if (type === 'chapter') push(dot(t), ' In ', eds.length ? (eds.length === 1 ? NAME.apaEd(eds[0]) : eds.slice(0, -1).map(NAME.apaEd).join(', ') + (eds.length > 2 ? ',' : '') + ' & ' + NAME.apaEd(eds[eds.length - 1])) + ' (' + (eds.length > 1 ? 'Eds.' : 'Ed.') + '), ' : '', I(cont), edN || pg.text ? ' (' + [edN ? edN + ' ed.' : '', pg.text ? (pg.multi ? 'pp. ' : 'p. ') + pg.text : ''].filter(Boolean).join(', ') + ')' : '', '. ', pub ? dot(pub) : '');
      else if (type === 'journal') push(dot(t) + ' ', I(cont + (vol ? ', ' + vol : '')), iss ? '(' + iss + ')' : '', pg.text ? ', ' + pg.text : '', '.');
      else if (type === 'website') push(I(t), '. ', cont && cont !== authors ? dot(cont) : '');
      else if (type === 'newspaper') push(dot(t) + ' ', I(cont), '.');
      else if (type === 'report') push(I(t), num ? ' (' + (/^report/i.test(num) ? num : 'Report No. ' + num) + ')' : '', '. ', pub && pub !== authors ? dot(pub) : '');
      else if (type === 'film') push(I(t), ' [Film]. ', pub ? dot(pub) : '');
      else if (type === 'podcast') push(t, num ? ' (No. ' + num + ')' : '', ' [Audio podcast episode]. In ', I(cont), '. ', pub ? dot(pub) : '');
      return P.concat(alink ? [alink] : []);
    }
    if (style === 'mla') {
      var mlink = doi ? 'https://doi.org/' + doi : url.replace(/^https?:\/\//, '');
      var who = authors ? dot(authors + (type === 'film' ? '' : type === 'podcast' ? ', host' : '')) + ' ' : '';
      if (type === 'film') { push(I(TT), '. ', names.length ? 'Directed by ' + names.map(NAME.natural).join(' and ') + ', ' : '', pub ? pub + ', ' : '', year, mlink ? ', ' + mlink : '', '.'); return P; }
      push(who);
      if (type === 'book') push(I(TT), '. ', edN ? edN + ' ed., ' : '', pub ? pub + ', ' : '', year, mlink ? ', ' + mlink : '', '.');
      else if (type === 'chapter') push('“' + dot(TT) + '” ', I(CT), ', ', eds.length ? 'edited by ' + eds.map(NAME.natural).join(' and ') + ', ' : '', edN ? edN + ' ed., ' : '', pub ? pub + ', ' : '', year, pg.text ? ', ' + (pg.multi ? 'pp. ' : 'p. ') + pg.text : '', '.');
      else if (type === 'journal') push('“' + dot(TT) + '” ', I(CT), vol ? ', vol. ' + vol : '', iss ? ', no. ' + iss : '', ', ' + year, pg.text ? ', ' + (pg.multi ? 'pp. ' : 'p. ') + pg.text : '', mlink ? ', ' + mlink : '', '.');
      else if (type === 'website' || type === 'newspaper') push('“' + dot(TT) + '” ', I(CT), ', ' + (pd ? pd.full : year), type === 'newspaper' && pg.text ? ', ' + (pg.multi ? 'pp. ' : 'p. ') + pg.text : '', mlink ? ', ' + mlink : '', '.', !pd && acc ? ' Accessed ' + acc.full + '.' : '');
      else if (type === 'report') push(I(TT), '. ', pub && pub !== authors ? pub + ', ' : '', year, mlink ? ', ' + mlink : '', '.');
      else if (type === 'podcast') push('“' + dot(TT) + '” ', I(CT), num ? ', episode ' + num : '', pub ? ', ' + pub : '', ', ' + (pd ? pd.full : year), mlink ? ', ' + mlink : '', '.');
      return P;
    }
    if (style === 'chicago') {
      var clink = doi ? ' https://doi.org/' + doi + '.' : url ? ' ' + url + '.' : '';
      var cwho = authors ? dot(authors + (type === 'film' ? ', dir' : type === 'podcast' ? ', host' : '')) + ' ' + year + '. ' : '';
      push(cwho);
      if (!authors) push(italicTitle ? I(TT) : '“' + dot(TT) + '”', ' ' + year + '. ');
      if (type === 'book') push(authors ? I(TT) : '', authors ? '. ' : '', edN ? edN + ' ed. ' : '', pubPlace() ? dot(pubPlace()) : '');
      else if (type === 'chapter') push('“' + dot(TT) + '” In ', I(CT), eds.length ? ', edited by ' + eds.map(NAME.natural).join(' and ') : '', pg.text ? ', ' + pg.text : '', '. ', edN ? edN + ' ed. ' : '', pubPlace() ? dot(pubPlace()) : '');
      else if (type === 'journal') push(authors ? '“' + dot(TT) + '” ' : '', I(CT), vol ? ' ' + vol : '', iss ? ' (' + iss + ')' : '', pg.text ? ': ' + pg.text : '', '.');
      else if (type === 'website') push(authors ? '“' + dot(TT) + '” ' : '', cont ? dot(cont) + ' ' : '', pd ? dot(pd.full) : acc ? 'Accessed ' + dot(acc.full) : '');
      else if (type === 'newspaper') push(authors ? '“' + dot(TT) + '” ' : '', I(CT), pd ? ', ' + pd.full : '', '.');
      else if (type === 'report') push(authors ? I(TT) : '', authors ? '. ' : '', num ? dot(num) + ' ' : '', pubPlace() && pub !== authors ? dot(pubPlace()) : '');
      else if (type === 'film') push(authors ? I(TT) : '', authors ? '. ' : '', pubPlace() ? dot(pubPlace()) : '');
      else if (type === 'podcast') push(authors ? '“' + dot(TT) + '” ' : '', I(CT), num ? ', episode ' + num : '', '. ', pd ? dot(pd.full) : '');
      return P.concat(clink ? [clink.replace(/^ /, P.length && /\S$/.test(String(P[P.length - 1].i || P[P.length - 1])) ? ' ' : '')] : []);
    }
    /* IEEE */
    var online = url ? ' [Online]. Available: ' + url : '';
    var iwho = authors ? authors + ', ' : '';
    if (type === 'book') push(iwho, I(titleCase(t)), edN ? ', ' + edN + ' ed. ' : '. ', pubPlace() ? pubPlace() + ', ' : '', year + '.', doi ? ' doi: ' + doi + '.' : online);
    else if (type === 'chapter') push(iwho, '“' + t + ',” in ', I(titleCase(cont)), edN ? ', ' + edN + ' ed.' : '', eds.length ? ', ' + eds.map(NAME.ieee).join(' and ') + ', ' + (eds.length > 1 ? 'Eds.' : 'Ed.') : '', ' ', pubPlace() ? pubPlace() + ', ' : '', year, pg.text ? ', ' + (pg.multi ? 'pp. ' : 'p. ') + pg.text : '', '.');
    else if (type === 'journal') push(iwho, '“' + t + ',” ', I(cont), vol ? ', vol. ' + vol : '', iss ? ', no. ' + iss : '', pg.text ? ', ' + (pg.multi ? 'pp. ' : 'p. ') + pg.text : '', ', ' + year, doi ? ', doi: ' + doi + '.' : '.' + online);
    else if (type === 'website') push(authors ? dot(authors) + ' ' : '', '“' + t + '.” ', cont ? dot(cont) + ' ' : '', acc ? 'Accessed: ' + acc.full + '.' : '', online);
    else if (type === 'newspaper') push(iwho, '“' + t + ',” ', I(cont), ', ' + (pd ? pd.full : year) + '.', online);
    else if (type === 'report') push(iwho, '“' + t + ',” ', pub ? pub + ', ' : '', place ? place + ', ' : '', num ? 'Rep. ' + num + ', ' : '', year + '.', online);
    else if (type === 'film') push(I(titleCase(t)), '. ', names.length ? 'Directed by ' + names.map(NAME.ieee).join(' and ') + '. ' : '', pub ? pub + ', ' : '', year + '.', online);
    else if (type === 'podcast') push(iwho, '“' + t + ',” ', I(cont), num ? ', episode ' + num : '', ', ' + (pd ? pd.full : year) + '.', online);
    return P;
  }
  function inText(e, style, n) {
    var names = parseNames(e.authors), year = String(e.year || '').trim() || 'n.d.', pin = String(e.pin || '').trim(), c = names.length;
    var lead = c ? null : '‘' + String(e.title || '') + '’';
    if (style === 'ieee') return '[' + (n || 1) + (pin ? ', p. ' + pin : '') + ']';
    var s = names.map(surname);
    if (style === 'harvard') return '(' + (lead || (c >= 4 ? s[0] + ' et al.' : c === 1 ? s[0] : s.slice(0, -1).join(', ') + ' and ' + s[c - 1])) + ', ' + year + (pin ? ', p. ' + pin : '') + ')';
    if (style === 'apa') return '(' + (lead || (c >= 3 ? s[0] + ' et al.' : s.join(' & '))) + ', ' + year + (pin ? ', p. ' + pin : '') + ')';
    if (style === 'mla') return '(' + (lead || (c >= 3 ? s[0] + ' et al.' : s.join(' and '))) + (pin ? ' ' + pin : '') + ')';
    return '(' + (lead || (c >= 4 ? s[0] + ' et al.' : c === 3 ? s[0] + ', ' + s[1] + ', and ' + s[2] : s.join(' and '))) + ' ' + year + (pin ? ', ' + pin : '') + ')';
  }
  function partsHtml(P) { return P.map(function (p) { return typeof p === 'string' ? U.escapeHtml(p) : '<i>' + U.escapeHtml(p.i) + '</i>'; }).join(''); }
  function partsText(P) { return P.map(function (p) { return typeof p === 'string' ? p : p.i; }).join(''); }
  function richCopy(html, text) {
    if (navigator.clipboard && window.ClipboardItem) {
      navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })])
        .then(function () { U.toast('Copied with formatting'); }, function () { U.copy(text); });
    } else U.copy(text);
  }
  var CT_STYLES = [{ value: 'harvard', label: 'Harvard (Cite Them Right)' }, { value: 'apa', label: 'APA 7' }, { value: 'mla', label: 'MLA 9' },
    { value: 'chicago', label: 'Chicago author-date' }, { value: 'ieee', label: 'IEEE' }];

  Tools.register({
    id: 'citation-generator', category: 'science', name: 'Citation Generator',
    description: 'Reference books, chapters, journal articles, web pages, newspapers, reports, films and podcasts in Harvard (Cite Them Right), APA 7, MLA 9, Chicago author-date or IEEE, with the in-text citation and a sortable bibliography.',
    keywords: ['citation', 'reference', 'referencing', 'bibliography', 'works cited', 'harvard', 'cite them right', 'apa', 'apa 7', 'mla', 'chicago', 'ieee',
      'in-text citation', 'essay', 'dissertation', 'student', 'cite'],
    render: function (root) {
      setRoot(root);
      var today = new Date(), todayIso = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      var saved = store('citation-generator') || {};
      var bib = Array.isArray(saved.bib) ? saved.bib : [];
      var style = U.chips(CT_STYLES, function () { save(); preview(); renderBib(); }, saved.style || 'harvard');
      style.dataset.k = 'style';
      var type = U.select({ label: 'Source type', value: 'book', options: CT_TYPES.map(function (t) { return { value: t.id, label: t.label }; }) });
      var fieldsBox = el('div', { class: 'ct-fields' }), inputs = {};
      var sample = { type: 'book', authors: 'Jane Smith\nRobert Jones', year: '2019', title: 'Understanding statistics', edition: '3', place: 'London', publisher: 'Routledge', accessed: todayIso };
      var entry = Object.assign({}, sample);
      var refOut = el('div', { class: 'ct-out', dataset: { k: 'ref' } }), inOut = el('div', { class: 'ct-out', dataset: { k: 'intext' } });
      var pin = textIn('Page for the in-text citation (optional)', '', { dataset: { f: 'pin' } });
      var bibList = el('ol', { class: 'ct-list', dataset: { k: 'bib' } });
      var sortSel = U.select({ label: 'Sort', value: saved.sort || 'author', options: [{ value: 'author', label: 'By author (A–Z)' }, { value: 'year', label: 'By year' }, { value: 'added', label: 'In the order added' }] });
      function save() { store('citation-generator', { bib: bib, style: style.value, sort: sortSel.querySelector('select').value }); }
      function buildFields() {
        var t = type.querySelector('select').value, def = CT_TYPES.filter(function (x) { return x.id === t; })[0];
        entry.type = t;
        fieldsBox.replaceChildren(); inputs = {};
        def.fields.forEach(function (f) {
          var w;
          if (f === 'authors' || f === 'editors') {
            var ta = U.textarea({ rows: 3, spellcheck: false, placeholder: 'One per line: Jane Smith or Smith, Jane.\n{Organisation Name} for a group author.', dataset: { f: f } });
            ta.style.minHeight = '84px';
            ta.value = entry[f] || '';
            w = U.field(ctLabel(f, t), ta); w.input = ta; w.classList.add('wide');
          } else if (f === 'date' || f === 'accessed') {
            w = U.input({ label: ctLabel(f, t), type: 'date', value: entry[f] || (f === 'accessed' ? todayIso : ''), dataset: { f: f } });
            w.input = w.querySelector('input');
          } else {
            w = textIn(ctLabel(f, t), entry[f] || '', { dataset: { f: f } });
            if (f === 'title' || f === 'container' || f === 'url') w.classList.add('wide');
          }
          w.input.addEventListener('input', function () { entry[f] = w.input.value; preview(); });
          inputs[f] = w;
          fieldsBox.appendChild(w);
        });
        preview();
      }
      function current() { var e = Object.assign({}, entry); e.pin = pin.input.value; return e; }
      function preview() {
        var e = current(), P = citeParts(e, style.value);
        refOut.innerHTML = (style.value === 'ieee' ? '[1] ' : '') + partsHtml(P);
        inOut.textContent = inText(e, style.value, 1);
      }
      function sorted() {
        var how = sortSel.querySelector('select').value, list = bib.slice();
        function key(e) { var n = parseNames(e.authors)[0]; return (n ? (n.org || n.family + ' ' + (n.given || '')) : String(e.title || '')).toLowerCase(); }
        if (how === 'author') list.sort(function (a, b) { return key(a).localeCompare(key(b)) || String(a.year).localeCompare(String(b.year)); });
        if (how === 'year') list.sort(function (a, b) { return String(a.year).localeCompare(String(b.year)) || key(a).localeCompare(key(b)); });
        return list;
      }
      function renderBib() {
        bibList.replaceChildren();
        sorted().forEach(function (e, i) {
          var P = citeParts(e, style.value), num = style.value === 'ieee' ? '[' + (i + 1) + '] ' : '';
          bibList.appendChild(el('li', null, el('div', { html: num + partsHtml(P) }), U.button('Remove', function () { bib.splice(bib.indexOf(e), 1); save(); renderBib(); }, 'ghost')));
        });
        if (!bib.length) bibList.appendChild(el('li', { class: 'sc-muted', text: 'Nothing here yet: add references with "Add to bibliography".' }));
      }
      function allText(html) {
        return sorted().map(function (e, i) { var P = citeParts(e, style.value), num = style.value === 'ieee' ? '[' + (i + 1) + '] ' : ''; return html ? '<p>' + num + partsHtml(P) + '</p>' : num + partsText(P); }).join(html ? '' : '\n');
      }
      type.querySelector('select').addEventListener('change', buildFields);
      pin.input.addEventListener('input', preview);
      sortSel.querySelector('select').addEventListener('change', function () { save(); renderBib(); });
      buildFields();
      renderBib();
      root.appendChild(U.panel('Source', U.row(type), fieldsBox, U.note('Type titles in sentence case (only the first word and proper nouns capitalised): MLA, Chicago and IEEE book titles are converted to title case for you. Leave the edition blank for a first edition.')));
      root.appendChild(U.panel('Reference', style, refOut, el('div', { class: 'sc-muted', text: 'In-text citation', style: { marginTop: '10px' } }), inOut, pin,
        U.btnrow(U.button('Copy with formatting', function () { var e = current(), P = citeParts(e, style.value); richCopy((style.value === 'ieee' ? '[1] ' : '') + partsHtml(P), (style.value === 'ieee' ? '[1] ' : '') + partsText(P)); }, 'primary'),
          U.copyBtn('Copy as plain text', function () { var P = citeParts(current(), style.value); return (style.value === 'ieee' ? '[1] ' : '') + partsText(P); }),
          U.copyBtn('Copy in-text citation', function () { return inOut.textContent; }),
          U.button('Add to bibliography', function () { var e = current(); e.added = Date.now(); bib.push(e); save(); renderBib(); U.toast('Added'); }))));
      root.appendChild(U.panel('Bibliography', sortSel, bibList, U.btnrow(
        U.button('Copy all with formatting', function () { if (!bib.length) return U.toast('Nothing to copy', 'err'); richCopy(allText(true), allText(false)); }),
        U.copyBtn('Copy all as plain text', function () { return allText(false); }),
        U.button('Clear', function () { if (bib.length && window.confirm('Remove every reference from the bibliography?')) { bib = []; save(); renderBib(); } }, 'ghost')),
        U.note('Saved in this browser only. IEEE numbers follow the order shown; cite them in that order in your text.')));
    }
  });
})();
