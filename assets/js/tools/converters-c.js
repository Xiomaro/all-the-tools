/* Converters, part three: the Recipe Scaler. Merged with the Cooking
   Converter (converters.js) into one tabbed tool by merged.js, so it reuses
   that tool's .g-conv styling and, when converters.js has shared it as
   window.CookKit, its ingredient densities. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-convc-style')) {
    document.head.appendChild(el('style', { id: 'g-convc-style', text: [
      '.g-convc textarea{width:100%;min-height:210px;font-family:var(--mono);font-size:14px;line-height:1.5}',
      '.g-convc .rs-out{border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elev);padding:10px 12px;font-size:15px;line-height:1.65;min-height:3em}',
      '.g-convc .rs-line{white-space:pre-wrap;overflow-wrap:anywhere;min-height:1.65em;padding-left:8px;border-left:3px solid transparent}',
      '.g-convc .rs-line.same{color:var(--fg-muted)}',
      '.g-convc .rs-line.flag{border-left-color:var(--warn)}',
      '.g-convc .rs-notes{margin:10px 0 0;padding-left:20px;font-size:13px;color:var(--fg-muted)}',
      '.g-convc .rs-notes li{margin:2px 0}',
      '.g-convc .rs-factor-row{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}',
      '.g-convc .rs-factor-row>.field{flex:0 1 160px;min-width:0}',
      '.g-convc .rs-tin{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}',
      '.g-convc .rs-tin .row>.field{flex:1 1 90px;min-width:0}',
      '.g-convc .rs-opts{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:flex-end}',
      '.g-convc .rs-opts>.field{flex:1 1 200px;min-width:0}'
    ].join('\n') }));
  }

  function inp(field) { return field.querySelector ? (field.querySelector('input, select, textarea') || field) : field; }
  function trim(v, d) { return String(parseFloat(v.toFixed(d))); }

  /* --- numbers ------------------------------------------------------------ */

  var UNI = { '½': 1 / 2, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 1 / 4, '¾': 3 / 4, '⅕': 1 / 5, '⅖': 2 / 5, '⅗': 3 / 5, '⅘': 4 / 5,
    '⅙': 1 / 6, '⅚': 5 / 6, '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8 };
  var GLYPH = { '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾', '1/8': '⅛', '3/8': '⅜', '5/8': '⅝', '7/8': '⅞' };
  var UCH = '[' + Object.keys(UNI).join('') + ']';
  /* Mixed number, whole + glyph, fraction, decimal, whole, lone glyph. */
  var NUM = '(?:\\d+\\s+\\d+\\/\\d+|\\d+\\s*' + UCH + '|\\d+\\/\\d+|\\d*\\.\\d+|\\d+|' + UCH + ')';
  var QTY_RE = new RegExp('^(' + NUM + ')(?:(\\s*(?:-|–|—|to|or)\\s*)(' + NUM + '))?');

  function parseNum(s) {
    s = String(s).replace(/\s+/g, ' ').trim();
    var m;
    if ((m = /^(\d+) (\d+)\/(\d+)$/.exec(s))) return +m[3] ? +m[1] + m[2] / m[3] : NaN;
    if ((m = new RegExp('^(\\d+) ?(' + UCH + ')$').exec(s))) return +m[1] + UNI[m[2]];
    if ((m = /^(\d+)\/(\d+)$/.exec(s))) return +m[2] ? m[1] / m[2] : NaN;
    if (UNI[s] !== undefined) return UNI[s];
    var n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  /* The nearest kitchen-friendly amount using the given denominators, as
     { n: number, s: '1½' }. Anything above zero shows as at least the
     smallest fraction, so a scaled-down pinch never becomes 0. */
  function friendly(v, den) {
    var best = null;
    den.forEach(function (d) {
      var n = Math.round(v * d), err = Math.abs(n / d - v);
      if (!best || err < best.err - 1e-9) best = { n: n, d: d, err: err };
    });
    if (best.n === 0 && v > 0) best = { n: 1, d: Math.max.apply(null, den) };
    var whole = Math.floor(best.n / best.d), rem = best.n - whole * best.d, d = best.d;
    if (rem) { var g = gcd(rem, d); rem /= g; d /= g; }
    var frac = rem ? (GLYPH[rem + '/' + d] || rem + '/' + d) : '';
    return { n: best.n / best.d, s: (whole || !frac ? String(whole) : '') + frac };
  }
  function nearFriendly(v, den, tol) { return v > 0 && Math.abs(friendly(v, den).n - v) / v <= tol; }
  /* Grams and millilitres: whole numbers, to the nearest 5 from 100 and the
     nearest 10 from 1,000; halves under 10. */
  function metricRound(v) {
    var r = v < 1 ? Math.round(v * 10) / 10 : v < 10 ? Math.round(v * 2) / 2 : v < 100 ? Math.round(v) : v < 1000 ? Math.round(v / 5) * 5 : Math.round(v / 10) * 10;
    return { n: r, s: trim(r, 1) };
  }
  function fixed(v, d) { var r = parseFloat(v.toFixed(d)); return { n: r, s: String(r) }; }

  /* --- units -------------------------------------------------------------- */

  /* kind: spoon and cup share the US spoon system (3 tsp = 1 tbsp, 16 tbsp
     = 1 cup), counted in teaspoons; mvol is millilitres, mw grams, iw ounces;
     ivol (fl oz, pints) depends on US or UK measures; count and whole are
     things you count (whole ones can't be split). */
  var UNITS = [
    { id: 'tsp', kind: 'spoon', tsp: 1, den: [2, 4, 8], forms: [['tsp', 'tsp'], ['tsps', 'tsps'], ['tspn', 'tspn'], ['teaspoon', 'teaspoons'], ['teasp', 'teasp']] },
    { id: 'dsp', kind: 'spoon', tsp: 2, den: [2], forms: [['dsp', 'dsp'], ['dessertspoon', 'dessertspoons'], ['dessert spoon', 'dessert spoons']] },
    { id: 'tbsp', kind: 'spoon', tsp: 3, den: [2, 3, 4], forms: [['tbsp', 'tbsp'], ['tbsps', 'tbsps'], ['tbs', 'tbs'], ['tbl', 'tbl'], ['tblsp', 'tblsp'], ['tablespoon', 'tablespoons']] },
    { id: 'cup', kind: 'cup', tsp: 48, den: [2, 3, 4, 8], forms: [['cup', 'cups']] },
    { id: 'ml', kind: 'mvol', f: 1, forms: [['ml', 'ml'], ['mls', 'mls'], ['millilitre', 'millilitres'], ['milliliter', 'milliliters']] },
    { id: 'cl', kind: 'mvol', f: 10, forms: [['cl', 'cl'], ['centilitre', 'centilitres'], ['centiliter', 'centiliters']] },
    { id: 'dl', kind: 'mvol', f: 100, forms: [['dl', 'dl'], ['decilitre', 'decilitres'], ['deciliter', 'deciliters']] },
    { id: 'l', kind: 'mvol', f: 1000, forms: [['l', 'l'], ['ltr', 'ltr'], ['litre', 'litres'], ['liter', 'liters']] },
    { id: 'mg', kind: 'mw', f: 0.001, forms: [['mg', 'mg'], ['milligram', 'milligrams']] },
    { id: 'g', kind: 'mw', f: 1, forms: [['g', 'g'], ['gr', 'gr'], ['grm', 'grm'], ['gram', 'grams'], ['gramme', 'grammes']] },
    { id: 'kg', kind: 'mw', f: 1000, forms: [['kg', 'kg'], ['kgs', 'kgs'], ['kilo', 'kilos'], ['kilogram', 'kilograms'], ['kilogramme', 'kilogrammes']] },
    { id: 'oz', kind: 'iw', f: 1, den: [2, 4], forms: [['oz', 'oz'], ['ounce', 'ounces']] },
    { id: 'lb', kind: 'iw', f: 16, den: [2, 4], forms: [['lb', 'lb'], ['lbs', 'lbs'], ['pound', 'pounds']] },
    { id: 'floz', kind: 'ivol', fl: 1, den: [2], forms: [['fl oz', 'fl oz'], ['fl. oz', 'fl. oz'], ['fl.oz', 'fl.oz'], ['floz', 'floz'], ['fluid ounce', 'fluid ounces']] },
    { id: 'pint', kind: 'ivol', pint: 1, den: [2, 4], forms: [['pint', 'pints'], ['pt', 'pt']] },
    { id: 'quart', kind: 'ivol', pint: 2, den: [2, 4], forms: [['quart', 'quarts'], ['qt', 'qt']] },
    { id: 'gallon', kind: 'ivol', pint: 8, den: [2, 4], forms: [['gallon', 'gallons'], ['gal', 'gal']] },
    { id: 'stick', kind: 'count', forms: [['stick', 'sticks']] },
    { id: 'pinch', kind: 'count', forms: [['pinch', 'pinches']] },
    { id: 'dash', kind: 'count', forms: [['dash', 'dashes']] },
    { id: 'splash', kind: 'count', forms: [['splash', 'splashes']] },
    { id: 'drop', kind: 'count', forms: [['drop', 'drops']] },
    { id: 'knob', kind: 'count', forms: [['knob', 'knobs']] },
    { id: 'handful', kind: 'count', forms: [['handful', 'handfuls']] },
    { id: 'bunch', kind: 'count', forms: [['bunch', 'bunches']] },
    { id: 'can', kind: 'count', forms: [['can', 'cans']] },
    { id: 'tin', kind: 'count', forms: [['tin', 'tins']] },
    { id: 'jar', kind: 'count', forms: [['jar', 'jars']] },
    { id: 'pack', kind: 'count', forms: [['pack', 'packs'], ['packet', 'packets'], ['pkt', 'pkts']] },
    { id: 'sachet', kind: 'count', forms: [['sachet', 'sachets']] },
    { id: 'bag', kind: 'count', forms: [['bag', 'bags']] },
    { id: 'bottle', kind: 'count', forms: [['bottle', 'bottles']] },
    { id: 'carton', kind: 'count', forms: [['carton', 'cartons']] },
    { id: 'piece', kind: 'count', forms: [['piece', 'pieces']] },
    { id: 'cube', kind: 'count', forms: [['cube', 'cubes']] },
    { id: 'head', kind: 'count', forms: [['head', 'heads']] },
    { id: 'clove', kind: 'whole', forms: [['clove', 'cloves']] },
    { id: 'slice', kind: 'whole', forms: [['slice', 'slices']] },
    { id: 'rasher', kind: 'whole', forms: [['rasher', 'rashers']] },
    { id: 'sheet', kind: 'whole', forms: [['sheet', 'sheets']] },
    { id: 'sprig', kind: 'whole', forms: [['sprig', 'sprigs']] },
    { id: 'stalk', kind: 'whole', forms: [['stalk', 'stalks']] },
    { id: 'fillet', kind: 'whole', forms: [['fillet', 'fillets']] },
    { id: 'leaf', kind: 'whole', forms: [['leaf', 'leaves']] }
  ];
  var UNIT = {};
  var ALIASES = [];
  UNITS.forEach(function (u) {
    UNIT[u.id] = u;
    u.forms.forEach(function (f) {
      [f[0], f[1]].forEach(function (a) { ALIASES.push({ a: a, unit: u, form: f }); });
    });
  });
  ALIASES.sort(function (x, y) { return y.a.length - x.a.length; });
  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  var ADJ = '(?:heaped|heaping|rounded|level|scant|generous|good|large|medium|small|big|extra[- ]large)';
  var UNIT_RE = new RegExp('^(\\s*)(?:(' + ADJ + ')(\\s+))?(' + ALIASES.map(function (x) { return reEsc(x.a).replace(/ /g, '\\s*'); }).filter(function (a, i, all) { return all.indexOf(a) === i; }).join('|') + ')(?=$|[\\s.,;:()/-])', 'i');
  /* The words to write for a unit the scaler switched to. */
  var CANON = { tsp: ['tsp', 'tsp'], tbsp: ['tbsp', 'tbsp'], cup: ['cup', 'cups'], ml: ['ml', 'ml'], l: ['litre', 'litres'],
    g: ['g', 'g'], kg: ['kg', 'kg'], oz: ['oz', 'oz'], lb: ['lb', 'lb'] };

  function matchUnit(rest) {
    var m = UNIT_RE.exec(rest);
    if (!m) return null;
    var typed = m[4].toLowerCase().replace(/\s+/g, ' ');
    var hit = ALIASES.filter(function (x) { return x.a === typed; })[0];
    if (!hit) return null;
    return { unit: hit.unit, form: hit.form, gap: m[1], adj: m[2] || '', adjGap: m[3] || '', len: m[0].length };
  }

  /* --- ingredients -------------------------------------------------------- */

  /* Which of the Cooking Converter's ingredients a line is about, so cups
     can become grams and back. The densities come from converters.js. */
  var FALLBACK_DENSITY = { water: 1, milk: 1.03, oil: 0.92, butter: 0.96, honey: 1.42, cream: 1, flour: 0.53, 'bread-flour': 0.55, wholemeal: 0.54,
    cornflour: 0.54, sugar: 0.85, caster: 0.8, icing: 0.51, 'brown-sugar': 0.93, cocoa: 0.42, oats: 0.38, rice: 0.78, salt: 1.22, 'baking-powder': 0.9,
    yeast: 0.65, 'ground-almonds': 0.4, 'chocolate-chips': 0.72, breadcrumbs: 0.45, 'peanut-butter': 1.08 };
  var MATCH = [
    [/peanut butter/, 'peanut-butter'], [/ground almonds|almond flour/, 'ground-almonds'], [/chocolate chips|choc chips/, 'chocolate-chips'],
    [/breadcrumbs|panko/, 'breadcrumbs'], [/cornflour|corn ?starch/, 'cornflour'], [/bread flour|strong (?:white |wholemeal )?flour/, 'bread-flour'],
    [/wholemeal|whole ?wheat/, 'wholemeal'], [/flour/, 'flour'], [/icing sugar|powdered sugar|confectioners/, 'icing'],
    [/caster|superfine/, 'caster'], [/brown sugar|muscovado|demerara/, 'brown-sugar'], [/sugar/, 'sugar'], [/cocoa/, 'cocoa'],
    [/\boats\b|porridge/, 'oats'], [/\brice\b/, 'rice'], [/baking powder|bicarb|baking soda/, 'baking-powder'], [/yeast/, 'yeast'],
    [/\bsalt\b/, 'salt'], [/\bbutter\b/, 'butter'], [/honey|golden syrup|maple syrup|treacle/, 'honey'], [/\boil\b/, 'oil'],
    [/\bcream\b/, 'cream'], [/milk/, 'milk'], [/water|stock|broth|juice|wine/, 'water']
  ];
  var LIQUID = { water: 1, milk: 1, oil: 1, cream: 1 };
  function density(id) {
    var list = window.CookKit && window.CookKit.ingredients;
    var row = list && list.filter(function (r) { return r[0] === id; })[0];
    return row ? row[2] : FALLBACK_DENSITY[id];
  }
  function ingredientOf(text) {
    var t = text.toLowerCase();
    for (var i = 0; i < MATCH.length; i++) if (MATCH[i][0].test(t)) return { id: MATCH[i][1], g: density(MATCH[i][1]), liquid: !!LIQUID[MATCH[i][1]] };
    return null;
  }

  /* Cup, pint and fluid ounce sizes. Cups mostly mean an American recipe
     and pints a British one, hence the mixed default. */
  var SYSTEMS = {
    mixed: { cup: 236.588, pint: 568.261, floz: 28.4131 },
    us: { cup: 236.588, pint: 473.176, floz: 29.5735 },
    uk: { cup: 250, pint: 568.261, floz: 28.4131 }
  };

  /* --- parsing ------------------------------------------------------------ */

  function parseLine(line) {
    var norm = line.replace(/⁄/g, '/');
    var m = /^(\s*(?:[-*•·▪]\s*|\d+[.)]\s+)?)([\s\S]*)$/.exec(norm);
    var lead = m[1], body = m[2], q = QTY_RE.exec(body), lo, hi = null, sep = '', rest;
    if (q) {
      lo = parseNum(q[1]);
      if (q[3]) {
        hi = parseNum(q[3]); sep = q[2];
        /* "1-1/2 cups" is one and a half, not one to a half. */
        if (sep.trim() === '-' && hi < 1 && hi < lo && lo % 1 === 0) { lo += hi; hi = null; sep = ''; }
      }
      rest = body.slice(q[0].length);
    } else {
      /* "a pinch of salt", "an 8 oz pack" only when a unit follows. */
      var a = /^(an?|one)(?=\s)/i.exec(body);
      if (!a || !matchUnit(body.slice(a[0].length))) return null;
      lo = 1; rest = body.slice(a[0].length);
    }
    if (!(lo > 0) || (hi !== null && !(hi > 0))) return null;
    var u = matchUnit(rest), out = { lead: lead, lo: lo, hi: hi, sep: sep, rest: rest, unit: null };
    if (u) {
      out.unit = u.unit; out.form = u.form; out.gap = u.gap; out.adj = u.adj; out.adjGap = u.adjGap;
      out.rest = rest.slice(u.len);
    }
    return out;
  }

  /* --- scaling and converting ------------------------------------------- */

  /* Pick a spoon or cup for an amount in teaspoons: cups from half a cup, or
     from a quarter when it lands on a quarter, third or half; tablespoons
     from one; teaspoons below that. */
  function spoonUnit(tsp, cupsAllowed) {
    var cups = tsp / 48;
    if (cupsAllowed && (cups >= 0.5 || (cups >= 0.25 && nearFriendly(cups, [2, 3, 4], 0.04)))) return 'cup';
    return tsp / 3 >= 1 ? 'tbsp' : 'tsp';
  }
  function impUnit(oz) {
    if (oz >= 16 && nearFriendly(oz / 16, [2, 4], 0.04)) return 'lb';
    return oz >= 32 ? 'lb' : 'oz';
  }

  /* The amounts of a line in its final unit: { lo, hi, unit (id), form }. */
  function convert(p, f, opts) {
    var u = p.unit, lo = p.lo * f, hi = p.hi === null ? null : p.hi * f;
    var sys = SYSTEMS[opts.system] || SYSTEMS.mixed, ing = ingredientOf(p.rest);
    var keep = { lo: lo, hi: hi, unit: u ? u.id : null, form: p.form };
    if (!u) return keep;
    function to(id, conv) { return { lo: conv(lo), hi: hi === null ? null : conv(hi), unit: id, form: CANON[id] }; }
    /* Choose the unit from the lower end, so a range shares one unit. */
    function spoons(tspOf, cupsAllowed) {
      var id = spoonUnit(tspOf(lo), cupsAllowed);
      var r = to(id, function (v) { return tspOf(v) / UNIT[id].tsp; });
      if (id === u.id) r.form = p.form;
      return r;
    }
    function mlToGramsOrMl(mlOf) {
      if (ing && !ing.liquid) return grams(function (v) { return mlOf(v) * ing.g; });
      return millilitres(mlOf);
    }
    function grams(gOf) {
      var id = opts.tidy && gOf(lo) >= 1000 ? 'kg' : 'g';
      return to(id, function (v) { return gOf(v) / (id === 'kg' ? 1000 : 1); });
    }
    function millilitres(mlOf) {
      var id = opts.tidy && mlOf(lo) >= 1000 ? 'l' : 'ml';
      return to(id, function (v) { return mlOf(v) / (id === 'l' ? 1000 : 1); });
    }
    function ounces(ozOf) {
      var id = impUnit(ozOf(lo));
      return to(id, function (v) { return ozOf(v) / (id === 'lb' ? 16 : 1); });
    }
    var spoonMl = function (v) { return v * u.tsp * (u.id === 'cup' ? sys.cup / 48 : 5); };
    var ivolMl = function (v) { return v * (u.fl ? sys.floz : sys.pint * u.pint); };
    var usTsp = function (mlOf) { return function (v) { return mlOf(v) / (236.588 / 48); }; };

    if (opts.to === 'metric') {
      if (u.kind === 'cup' || (u.kind === 'spoon' && lo * u.tsp >= 12)) return mlToGramsOrMl(spoonMl);
      if (u.kind === 'spoon') return opts.tidy ? spoons(function (v) { return v * u.tsp; }, false) : keep;
      if (u.kind === 'iw') return grams(function (v) { return v * u.f * 28.3495; });
      if (u.kind === 'ivol') return millilitres(ivolMl);
      if (u.id === 'stick' && ing && ing.id === 'butter') return grams(function (v) { return v * 113.4; });
    } else if (opts.to === 'us') {
      if (u.kind === 'mw' || u.kind === 'mvol') {
        var base = function (v) { return v * u.f; };
        if (u.kind === 'mvol') return spoons(usTsp(base), true);
        if (ing) return spoons(usTsp(function (v) { return base(v) / ing.g; }), true);
        return ounces(function (v) { return base(v) / 28.3495; });
      }
      if (u.kind === 'ivol') return spoons(usTsp(ivolMl), true);
    }
    if (!opts.tidy) return keep;
    if (u.kind === 'spoon' || u.kind === 'cup') return spoons(function (v) { return v * u.tsp; }, opts.to !== 'metric');
    if (u.kind === 'mw' && u.id !== 'mg') { var r = grams(function (v) { return v * u.f; }); if (r.unit === u.id) r.form = p.form; return r; }
    if (u.kind === 'mvol' && (u.id === 'ml' || u.id === 'l')) { var s = millilitres(function (v) { return v * u.f; }); if (s.unit === u.id) s.form = p.form; return s; }
    if (u.kind === 'iw' && (u.id === 'oz' || lo < 1)) {
      var t = u.id === 'lb' ? to('oz', function (v) { return v * 16; }) : ounces(function (v) { return v; });
      if (t.unit === u.id) t.form = p.form;
      return t;
    }
    return keep;
  }

  function fmtIn(v, id, kind) {
    var u = id ? UNIT[id] : null;
    if (kind === 'whole' || (u && u.kind === 'whole')) { var w = Math.max(1, Math.round(v)); return { n: w, s: String(w) }; }
    if (!u) return v >= 10 ? { n: Math.round(v), s: String(Math.round(v)) } : friendly(v, [2, 3, 4]);
    if (u.kind === 'mw' || u.kind === 'mvol') {
      if (id === 'g' || id === 'ml') return metricRound(v);
      if (id === 'mg') return { n: Math.round(v), s: String(Math.round(v)) };
      return fixed(v, id === 'kg' || id === 'l' ? 2 : 1);
    }
    if (u.kind === 'count' && v >= 10) return { n: Math.round(v), s: String(Math.round(v)) };
    return friendly(v, u.den || [2, 3, 4]);
  }
  function word(form, n) { return form[n > 1 ? 1 : 0]; }
  function eggWord(w, n) { var s = n === 1 ? 'egg' : 'eggs'; return w[0] === 'E' ? 'E' + s.slice(1) : s; }

  var EGG = /\beggs?\b/i, YOLK = /\b(?:yolks?|whites?)\b/i;

  /* One scaled line: { text, flag, same }. */
  function scaleLine(line, f, opts) {
    var p = parseLine(line);
    if (!p) return { text: line, same: true };
    var flag = null, eggs = !p.unit && EGG.test(p.rest) && !YOLK.test(p.rest);
    var yolks = !p.unit && YOLK.test(p.rest);
    var c = convert(p, f, opts), qty, n, rest = p.rest;

    if (eggs && c.hi === null) {
      var v = c.lo, whole = Math.floor(v + 1e-9), frac = v - whole, vs = friendly(v, [2, 3, 4]).s;
      if (v < 0.75) {
        qty = v < 0.375 ? '¼' : '½'; n = 1;
        flag = vs + ' of an egg: beat 1 egg and use ' + (v < 0.375 ? 'a quarter of it (about 12 g)' : 'half of it (about 25 g)') + '.';
      } else if (frac < 0.25) {
        n = whole; qty = String(whole);
        if (frac > 0.01) flag = vs + ' eggs, rounded down to ' + whole + '.';
      } else if (frac < 0.75) {
        n = whole; qty = String(whole);
        rest = rest.replace(EGG, function (w) { return eggWord(w, whole) + ' plus 1 yolk'; });
        flag = vs + ' eggs: use ' + whole + ' ' + eggWord('eggs', whole) + ' plus 1 extra yolk.';
      } else {
        n = whole + 1; qty = String(n);
        if (n - v > 0.01) flag = vs + ' eggs, rounded up to ' + n + '.';
      }
      if (rest === p.rest) rest = rest.replace(EGG, function (w) { return eggWord(w, n); });
    } else {
      var kind = yolks ? 'whole' : null;
      var a = fmtIn(c.lo, c.unit, kind), b = c.hi === null ? null : fmtIn(c.hi, c.unit, kind);
      qty = b && b.s !== a.s ? a.s + p.sep + b.s : a.s;
      n = b ? b.n : a.n;
      if (eggs) rest = rest.replace(EGG, function (w) { return eggWord(w, n); });
      var whole2 = kind === 'whole' || (c.unit && UNIT[c.unit].kind === 'whole');
      if (whole2 && c.hi === null && Math.abs(a.n - c.lo) / c.lo > 0.1) {
        flag = friendly(c.lo, [2, 3, 4]).s + ' ' + (c.form ? c.form[1] : /white/i.test(p.rest) ? 'egg whites' : 'egg yolks') + ', rounded to ' + a.s + '.';
      }
    }

    var unitText = '';
    if (c.unit) {
      var form = c.form || CANON[c.unit];
      var uw = word(form, n);
      var gap = p.gap || (uw.length > 2 ? ' ' : '');
      unitText = p.adj ? gap + p.adj + p.adjGap + uw : gap + uw;
    }
    return { text: p.lead + qty + unitText + rest, flag: flag, same: false };
  }

  function scaleText(text, f, opts) {
    var lines = String(text).replace(/\r\n?/g, '\n').split('\n');
    return lines.map(function (l) { return l.trim() ? scaleLine(l, f, opts) : { text: l, same: true, blank: true }; });
  }

  /* --- tins --------------------------------------------------------------- */

  function tinArea(shape, a, b) {
    if (shape === 'round') return Math.PI * a * a / 4;
    if (shape === 'square') return a * a;
    return a * b;
  }

  /* ======================================================================= */

  var EXAMPLE = [
    'Chocolate brownies (serves 4)',
    '225 g butter',
    '1 1/2 cups caster sugar',
    '3 large eggs',
    '½ tsp vanilla extract',
    '3/4 cup plain flour',
    '2–3 tbsp cocoa powder',
    'a pinch of salt',
    '100g dark chocolate, chopped',
    'Icing sugar, to dust'
  ].join('\n');

  Tools.register({
    id: 'recipe-scaler', category: 'converters', name: 'Recipe Scaler',
    description: 'Scale a recipe’s ingredients up or down by servings or by a factor, with kitchen-friendly fractions and optional metric or US cup conversion.',
    keywords: ['recipe scaler', 'scale a recipe', 'scale recipe', 'recipe converter', 'resize recipe', 'halve a recipe', 'double a recipe', 'triple a recipe',
      'servings calculator', 'serving size', 'portion calculator', 'portions', 'recipe multiplier', 'ingredient calculator', 'cooking for more people',
      'batch cooking', 'cups to grams', 'grams to cups', 'metric recipe', 'us cups', 'american recipe', 'baking', 'cake tin size', 'tin size converter',
      'pan size converter', 'bigger tin', 'fractions', 'eggs'],
    render: function (root) {
      root.classList.add('g-conv', 'g-convc');
      var recipe = U.textarea({ label: 'Ingredients, one per line', rows: 10, value: EXAMPLE, spellcheck: false, dataset: { role: 'recipe' } });
      var mode = U.chips([{ value: 'servings', label: 'By servings' }, { value: 'factor', label: 'By a factor' }], function () { run(); }, 'servings');
      var from = U.input({ label: 'Recipe serves', type: 'number', min: 0, step: 'any', value: '4', dataset: { role: 'from' } });
      var want = U.input({ label: 'You want to serve', type: 'number', min: 0, step: 'any', value: '6', dataset: { role: 'to' } });
      var factorIn = U.input({ label: 'Multiply by', type: 'text', inputMode: 'decimal', value: '2', spellcheck: false, dataset: { role: 'factor' } });
      var presets = [['¼', 0.25], ['⅓', 1 / 3], ['½', 0.5], ['1½', 1.5], ['2', 2], ['3', 3]];
      var presetRow = el('div', { class: 'cv-chip-row' }, presets.map(function (pr) {
        return el('button', { type: 'button', class: 'chip', dataset: { factor: String(pr[1]) }, onclick: function () { setFactor(pr[0]); } }, '×' + pr[0]);
      }));
      var toSel = U.select({ label: 'Units', value: 'keep', dataset: { role: 'units' }, options: [
        { value: 'keep', label: 'Keep the recipe’s units' }, { value: 'metric', label: 'Convert to metric (g, ml)' }, { value: 'us', label: 'Convert to US cups and spoons' }] });
      var sysSel = U.select({ label: 'Cups, pints and fl oz in the recipe', value: 'mixed', dataset: { role: 'system' }, options: [
        { value: 'mixed', label: 'US cups (237 ml), UK pints (568 ml)' }, { value: 'us', label: 'All US (cup 237 ml, pint 473 ml)' }, { value: 'uk', label: 'All UK and metric (cup 250 ml, pint 568 ml)' }] });
      var tidy = U.checkbox('Tidy units (48 tsp → 1 cup, 1500 g → 1.5 kg)', { checked: true, dataset: { role: 'tidy' } });
      var servBox = el('div', { class: 'rs-factor-row' }, from, want);
      var factorBox = el('div', null, el('div', { class: 'rs-factor-row' }, factorIn), presetRow);
      var factorOut = el('div', { class: 'cv-big', dataset: { k: 'factor' } }), factorSub = el('div', { class: 'cv-muted' });
      var out = el('div', { class: 'rs-out', dataset: { k: 'out' }, 'aria-live': 'polite' }), notes = el('ul', { class: 'rs-notes', dataset: { k: 'notes' } });
      var summary = U.note('');
      var lastText = '';

      function setFactor(text) {
        mode.querySelectorAll('.chip').forEach(function (c, i) { c.classList.toggle('on', i === 1); });
        mode.value = 'factor';
        inp(factorIn).value = text;
        run();
      }
      function factor() {
        if (mode.value === 'servings') {
          var a = parseFloat(inp(from).value), b = parseFloat(inp(want).value);
          return a > 0 && b > 0 ? b / a : NaN;
        }
        return parseNum(inp(factorIn).value.trim().replace(/^[x×*]\s*/i, '').replace(/^(\d+),(\d+)$/, '$1.$2'));
      }
      function run() {
        servBox.hidden = mode.value !== 'servings';
        factorBox.hidden = mode.value !== 'factor';
        var f = factor();
        presetRow.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('on', Math.abs(+c.dataset.factor - f) < 1e-9); });
        if (!(f > 0) || f > 1000) {
          factorOut.textContent = '—';
          factorSub.textContent = mode.value === 'servings' ? 'Enter how many the recipe serves and how many you want to feed.' : 'Enter a number to multiply by, such as 2, 0.5 or 1/3.';
          out.replaceChildren(); notes.replaceChildren(); summary.textContent = ''; lastText = '';
          return;
        }
        factorOut.textContent = '×' + trim(f, 3);
        factorSub.textContent = f === 1 ? 'Same size as the recipe.' : f > 1 ? 'Making ' + trim(f, 2) + ' times as much.' : 'Making ' + trim(f * 100, 1) + '% of the recipe.';
        var opts = { to: inp(toSel).value, tidy: tidy.input.checked, system: inp(sysSel).value };
        var rows = scaleText(inp(recipe).value, f, opts);
        out.replaceChildren.apply(out, rows.map(function (r) {
          return el('div', { class: 'rs-line' + (r.same && !r.blank ? ' same' : '') + (r.flag ? ' flag' : ''), text: r.text });
        }));
        var flags = rows.filter(function (r) { return r.flag; });
        notes.replaceChildren.apply(notes, flags.map(function (r) { return el('li', { text: r.flag }); }));
        var scaled = rows.filter(function (r) { return !r.same; }).length, kept = rows.filter(function (r) { return r.same && !r.blank; }).length;
        summary.textContent = scaled + ' line' + (scaled === 1 ? '' : 's') + ' scaled' + (kept ? ', ' + kept + ' without an amount left as they were (shown in grey)' : '') + '.' +
          (flags.length ? ' Lines marked on the left were rounded: see the notes below.' : '');
        lastText = rows.map(function (r) { return r.text; }).join('\n');
      }
      U.live([recipe, from, want, factorIn, toSel, sysSel, tidy], run);

      /* --- tin helper --- */
      function tinSide(role, shape, a, b) {
        var shapeSel = U.select({ label: 'Shape', value: shape, dataset: { role: role + '-shape' }, options: [
          { value: 'round', label: 'Round' }, { value: 'square', label: 'Square' }, { value: 'rect', label: 'Rectangle' }] });
        var aIn = U.input({ label: 'Diameter', type: 'number', min: 0, step: 'any', value: String(a), dataset: { role: role + '-a' } });
        var bIn = U.input({ label: 'Length', type: 'number', min: 0, step: 'any', value: String(b), dataset: { role: role + '-b' } });
        return { shape: shapeSel, a: aIn, b: bIn };
      }
      var tFrom = tinSide('tin-from', 'round', 20, 30), tTo = tinSide('tin-to', 'round', 23, 30);
      var tinOut = el('div'), useTin = U.button('Scale the recipe to fit', function () {
        var f = tinFactor();
        if (f > 0) setFactor(trim(f, 2));
      });
      function tinFactor() {
        var A = tinArea(inp(tFrom.shape).value, +inp(tFrom.a).value, +inp(tFrom.b).value);
        var B = tinArea(inp(tTo.shape).value, +inp(tTo.a).value, +inp(tTo.b).value);
        return A > 0 && B > 0 ? B / A : NaN;
      }
      function runTin() {
        [tFrom, tTo].forEach(function (t) {
          var s = inp(t.shape).value;
          t.a.querySelector('label').textContent = s === 'round' ? 'Diameter' : s === 'square' ? 'Side' : 'Width';
          t.b.hidden = s !== 'rect';
        });
        var f = tinFactor();
        useTin.disabled = !(f > 0);
        if (!(f > 0)) { tinOut.replaceChildren(U.note('Enter both tin sizes, in the same units.', 'err')); return; }
        tinOut.replaceChildren(
          el('div', { class: 'cv-big', dataset: { k: 'tinfactor' }, text: '×' + trim(f, 2) }),
          el('div', { class: 'cv-muted', text: f > 1.005 ? 'Your tin holds ' + trim((f - 1) * 100, 0) + '% more mixture at the same depth.' : f < 0.995 ? 'Your tin holds ' + trim((1 - f) * 100, 0) + '% less mixture at the same depth.' : 'Your tin is the same size.' }));
      }
      U.live([tFrom.shape, tFrom.a, tFrom.b, tTo.shape, tTo.a, tTo.b], runTin);

      root.appendChild(U.panel(null, recipe, U.btnrow(
        U.button('Example', function () { inp(recipe).value = EXAMPLE; run(); }, 'ghost'),
        U.button('Clear', function () { inp(recipe).value = ''; inp(recipe).focus(); run(); }, 'ghost')),
        U.note('Paste the ingredient list only. Amounts at the start of a line are scaled: 2, 1.5, 1/2, 1 1/2, ½, and ranges such as 2–3. Lines without an amount, like headings or “salt to taste”, are left as they are.')));
      root.appendChild(U.panel('Scale', mode, servBox, factorBox,
        el('div', { class: 'rs-opts', style: { marginTop: '10px' } }, toSel, sysSel), el('div', { style: { marginTop: '8px' } }, tidy)));
      root.appendChild(U.panel('Scaled recipe', factorOut, factorSub, out, summary, notes,
        U.btnrow(U.copyBtn('Copy', function () { return lastText; }), U.downloadBtn('Download (.txt)', 'recipe-scaled.txt', function () { return lastText; })),
        U.note('Spoons and cups come out as the nearest ⅛, ¼ or ⅓, grams and millilitres to a sensible round number, and eggs, cloves and slices as whole ones. Conversions between cups and grams use a typical density for the ingredient, so for baking a kitchen scale is best. Seasoning, raising agents and spices rarely need scaling exactly: add a little less when making much more, and taste.')));
      root.appendChild(U.panel('Using a different tin',
        el('div', { class: 'rs-tin' },
          el('div', null, el('h4', { text: 'The recipe’s tin', style: { margin: '0 0 6px' } }), el('div', { class: 'row' }, tFrom.shape, tFrom.a, tFrom.b)),
          el('div', null, el('h4', { text: 'Your tin', style: { margin: '0 0 6px' } }), el('div', { class: 'row' }, tTo.shape, tTo.a, tTo.b))),
        tinOut, U.btnrow(useTin),
        U.note('Scaling by the tin’s area keeps the mixture the same depth, so the baking time stays about the same: start checking 5 minutes early in a smaller tin. If you keep the recipe as it is in a bigger tin, it will be shallower and bake faster. In a smaller or deeper tin, lower the oven by about 10 °C, bake for longer and test the middle with a skewer. Cupcakes and muffins take the same time however many you make.')));
    }
  });
})();
