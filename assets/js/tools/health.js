/* health tools: Body Fat, Ideal Weight, Macros, Water Intake, Heart Rate
   Zones, One-Rep Max, UK Alcohol Units, Pregnancy Due Date & Ovulation,
   Calories Burned and Box Breathing. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-health-style')) {
    document.head.appendChild(el('style', { id: 'g-health-style', text: [
      '.g-health .hl-meas { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }',
      '.g-health .hl-meas input { width: 92px; }',
      '.g-health .hl-meas span { color: var(--fg-muted); font-size: 13px; }',
      '.g-health .hl-meas select { width: auto; }',
      '.g-health .hl-big { font-size: 32px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.2; }',
      '.g-health .hl-muted { color: var(--fg-muted); font-size: 13px; }',
      '.g-health .hl-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }',
      '.g-health .hl-card { border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-elev); padding: 12px 14px; }',
      '.g-health .hl-card.hi { border-color: var(--accent); }',
      '.g-health .hl-card h4 { margin: 0 0 4px; font-size: 14px; }',
      '.g-health tr.on td { background: var(--bg-sunken); font-weight: 700; }',
      '.g-health td.num, .g-health th.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }',
      '.g-health .hl-drinks { min-width: 560px; }',
      '.g-health .hl-drinks input, .g-health .hl-drinks select { width: 100%; min-width: 64px; }',
      '.g-health .row > .field { max-width: 100%; }',
      '.g-health .hl-bar { height: 12px; border-radius: 6px; background: var(--bg-sunken); overflow: hidden; }',
      '.g-health .hl-bar > i { display: block; height: 100%; background: var(--accent); }',
      '.g-health .hl-bar.over > i { background: var(--err); }',
      '.g-health .hl-stage { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 12px 0; }',
      '.g-health .hl-orb { width: min(280px, 70vw); height: min(280px, 70vw); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-direction: column;',
      '  background: radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--accent) 55%, transparent), color-mix(in srgb, var(--accent) 18%, transparent)); border: 2px solid var(--accent); will-change: transform; }',
      '.g-health .hl-phase { font-size: 28px; font-weight: 700; }',
      '.g-health .hl-count { font-size: 56px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1; }',
      '.g-health .hl-stage.full { position: fixed; inset: 0; z-index: 50; background: var(--bg); justify-content: center; }',
      '.g-health .hl-stage.full .hl-orb { width: min(70vmin, 520px); height: min(70vmin, 520px); }'
    ].join('\n') }));
  }

  /* --- shared helpers ---------------------------------------------------- */

  var LB = 0.45359237, INCH = 2.54, UK_PINT = 568.26125;
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function inp(node) { return node.querySelector ? (node.querySelector('input, select, textarea') || node) : node; }
  function val(node) { return inp(node).value; }
  function setVal(node, v) { inp(node).value = v; }
  function num(node) { var n = parseFloat(String(val(node)).replace(/,/g, '')); return isFinite(n) ? n : NaN; }
  function fmt(n, dp) { return isFinite(n) ? Number(n).toLocaleString('en-GB', { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 }) : '—'; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stlb(kg) {
    var lb = kg / LB, st = Math.floor(lb / 14), rem = Math.round(lb - st * 14);
    if (rem === 14) { st++; rem = 0; }
    return st + ' st ' + rem + ' lb';
  }
  function weightText(kg) { return fmt(kg, 1) + ' kg · ' + stlb(kg) + ' · ' + fmt(kg / LB, 0) + ' lb'; }
  function stat(label, value, key) { return el('div', { class: 'stat' }, el('b', { dataset: key ? { k: key } : undefined, text: value }), el('span', { text: label })); }
  function prep(root) { root.classList.add('g-health'); }
  function advice(text) { return U.note(text || 'A guide only, not medical advice. Talk to your GP, pharmacist or midwife about your own health.'); }

  /* Unit choices are remembered in this browser, since someone who weighs
     themselves in stones wants stones in every health tool. */
  var UNIT_KEY = 'att-health-units';
  function units() { try { return JSON.parse(localStorage.getItem(UNIT_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function saveUnit(k, v) { try { var u = units(); u[k] = v; localStorage.setItem(UNIT_KEY, JSON.stringify(u)); } catch (e) { /* not kept */ } }
  /* Until a unit has been picked, start from the regional settings. */
  function imperial() { return !!(window.Region && Region.imperial()); }

  function numBox(aria, value) { return el('input', { type: 'number', min: 0, step: 'any', inputMode: 'decimal', value: value === undefined ? '' : String(value), 'aria-label': aria }); }

  /* Body weight in kg, stones and pounds, or pounds. .kg() reads it back in kg. */
  function weightField(label, kg) {
    var a = numBox(label + ' (kg)'), b = numBox(label + ' (pounds)');
    var ua = el('span'), ub = el('span', { text: 'lb' });
    var unit = el('select', { 'aria-label': label + ' unit' },
      el('option', { value: 'kg', text: 'kg' }), el('option', { value: 'stlb', text: 'st & lb' }), el('option', { value: 'lb', text: 'lb' }));
    unit.value = units().w || (imperial() ? 'lb' : 'kg');
    if (!unit.value) unit.value = 'kg';
    var shown = unit.value;
    var wrap = U.field(label, el('div', { class: 'hl-meas' }, a, ua, b, ub, unit));
    function read(u) {
      var x = parseFloat(a.value), y = parseFloat(b.value) || 0;
      if (!isFinite(x)) x = u === 'stlb' && y ? 0 : NaN;
      var v = u === 'kg' ? x : u === 'lb' ? x * LB : (x * 14 + y) * LB;
      return v > 0 ? v : NaN;
    }
    function layout() {
      ua.textContent = shown === 'kg' ? 'kg' : shown === 'lb' ? 'lb' : 'st';
      a.setAttribute('aria-label', label + (shown === 'kg' ? ' (kg)' : shown === 'lb' ? ' (lb)' : ' (stone)'));
      b.style.display = ub.style.display = shown === 'stlb' ? '' : 'none';
    }
    wrap.kg = function () { return read(shown); };
    wrap.set = function (v) {
      if (!(v > 0)) return;
      var lb = v / LB;
      if (shown === 'kg') a.value = String(Math.round(v * 10) / 10);
      else if (shown === 'lb') a.value = String(Math.round(lb));
      else { var st = Math.floor(lb / 14), rem = Math.round(lb - st * 14); if (rem === 14) { st++; rem = 0; } a.value = String(st); b.value = String(rem); }
    };
    unit.addEventListener('change', function () {
      var before = read(shown);
      shown = unit.value;
      layout();
      saveUnit('w', shown);
      wrap.set(before);
      a.dispatchEvent(new Event('input', { bubbles: true }));
    });
    layout();
    wrap.set(kg);
    wrap.inputs = [a, b, unit];
    return wrap;
  }

  /* Height in cm, or feet and inches. .cm() reads it back in cm. */
  function heightField(label, cm) {
    var a = numBox(label + ' (cm)'), b = numBox(label + ' (inches)');
    var ua = el('span'), ub = el('span', { text: 'in' });
    var unit = el('select', { 'aria-label': label + ' unit' }, el('option', { value: 'cm', text: 'cm' }), el('option', { value: 'ftin', text: 'ft & in' }));
    unit.value = units().h || (imperial() ? 'ftin' : 'cm');
    if (!unit.value) unit.value = 'cm';
    var shown = unit.value;
    var wrap = U.field(label, el('div', { class: 'hl-meas' }, a, ua, b, ub, unit));
    function read(u) {
      var x = parseFloat(a.value), y = parseFloat(b.value) || 0;
      if (!isFinite(x)) x = u === 'ftin' && y ? 0 : NaN;
      var v = u === 'cm' ? x : (x * 12 + y) * INCH;
      return v > 0 ? v : NaN;
    }
    function layout() {
      ua.textContent = shown === 'cm' ? 'cm' : 'ft';
      a.setAttribute('aria-label', label + (shown === 'cm' ? ' (cm)' : ' (feet)'));
      b.style.display = ub.style.display = shown === 'ftin' ? '' : 'none';
    }
    wrap.cm = function () { return read(shown); };
    wrap.set = function (v) {
      if (!(v > 0)) return;
      if (shown === 'cm') a.value = String(Math.round(v));
      else { var inches = v / INCH, ft = Math.floor(inches / 12), rem = Math.round(inches - ft * 12); if (rem === 12) { ft++; rem = 0; } a.value = String(ft); b.value = String(rem); }
    };
    unit.addEventListener('change', function () {
      var before = read(shown);
      shown = unit.value;
      layout();
      saveUnit('h', shown);
      wrap.set(before);
      a.dispatchEvent(new Event('input', { bubbles: true }));
    });
    layout();
    wrap.set(cm);
    wrap.inputs = [a, b, unit];
    return wrap;
  }

  function sexField() { return U.select({ label: 'Sex', options: [{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }], value: 'female' }); }
  function watch(fields, fn) {
    var nodes = [];
    fields.forEach(function (f) { if (f.inputs) nodes = nodes.concat(f.inputs); else nodes.push(f); });
    return U.live(nodes, fn);
  }

  /* Calendar dates as UTC midnights, so adding days ignores clock changes. */
  function utcDate(y, m, d) { var dt = new Date(0); dt.setUTCFullYear(y, m - 1, d); return dt; }
  function parseISO(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? utcDate(+m[1], +m[2], +m[3]) : null; }
  function addDays(dt, n) { return new Date(dt.getTime() + n * 86400000); }
  function isoOf(dt) { return dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate()); }
  function longOf(dt) { return DAYS[dt.getUTCDay()] + ' ' + dt.getUTCDate() + ' ' + MONTHS[dt.getUTCMonth()] + ' ' + dt.getUTCFullYear(); }
  function shortOf(dt) { return dt.getUTCDate() + ' ' + MONTHS[dt.getUTCMonth()].slice(0, 3) + ' ' + dt.getUTCFullYear(); }
  function todayISO() { var n = new Date(); return n.getFullYear() + '-' + pad(n.getMonth() + 1) + '-' + pad(n.getDate()); }
  function dayCount(a, b) { return Math.round((b - a) / 86400000); }

  /* ======================================================================= */
  /* Body Fat Calculator                                                     */
  /* ======================================================================= */

  /* US Navy circumference method: Hodgdon & Beckett (1984), Naval Health
     Research Center reports 84-11 and 84-29, body density in cm, then Siri's
     equation (495 / density − 450). */
  function navyBodyFat(sex, heightCm, neck, waist, hip) {
    var d = sex === 'male'
      ? 1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(heightCm)
      : 1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(heightCm);
    return 495 / d - 450;
  }
  /* Deurenberg, Weststrate & Seidell (1991), Br J Nutr 65:105–114, adults. */
  function deurenberg(sex, bmi, age) { return 1.2 * bmi + 0.23 * age - 10.8 * (sex === 'male' ? 1 : 0) - 5.4; }
  /* American Council on Exercise body-fat categories. */
  var ACE = {
    female: [['Essential fat', 10, 14], ['Athletes', 14, 21], ['Fitness', 21, 25], ['Average', 25, 32], ['Obese', 32, 100]],
    male: [['Essential fat', 2, 6], ['Athletes', 6, 14], ['Fitness', 14, 18], ['Average', 18, 25], ['Obese', 25, 100]]
  };
  function aceCategory(sex, bf) {
    var bands = ACE[sex];
    if (bf < bands[0][1]) return 'Below essential fat';
    for (var i = 0; i < bands.length; i++) if (bf < bands[i][2]) return bands[i][0];
    return 'Obese';
  }

  Tools.register({
    id: 'body-fat', category: 'health', name: 'Body Fat Calculator',
    description: 'Estimate body fat with the US Navy tape-measure method and from BMI, with ACE categories and fat and lean mass.',
    keywords: ['body fat', 'body fat percentage', 'navy method', 'us navy', 'lean mass', 'fat mass', 'lean body mass', 'deurenberg', 'bmi', 'ace', 'waist', 'neck', 'hips', 'body composition'],
    render: function (root) {
      prep(root);
      var sex = sexField();
      var age = U.input({ label: 'Age', type: 'number', min: 18, max: 110, value: '35' });
      var weight = weightField('Weight', 70), height = heightField('Height', 170);
      var mUnit = U.select({ label: 'Tape measurements in', options: [{ value: 'cm', label: 'centimetres' }, { value: 'in', label: 'inches' }], value: (units().h || (imperial() ? 'ftin' : 'cm')) === 'ftin' ? 'in' : 'cm' });
      var neck = U.input({ label: 'Neck', type: 'number', min: 0, step: 'any', value: '34', hint: 'Just below the larynx (Adam’s apple).' });
      var waist = U.input({ label: 'Waist', type: 'number', min: 0, step: 'any', value: '76', hint: 'Men: level with the navel. Women: at the narrowest point.' });
      var hip = U.input({ label: 'Hips', type: 'number', min: 0, step: 'any', value: '98', hint: 'At the widest point.' });
      var out = el('div'), scale = el('div');

      function run() {
        var s = val(sex), f = val(mUnit) === 'in' ? INCH : 1;
        hip.style.display = s === 'male' ? 'none' : '';
        var kg = weight.kg(), cm = height.cm(), a = num(age);
        var n = num(neck) * f, w = num(waist) * f, h = num(hip) * f;
        out.replaceChildren();
        if (!(kg > 0) || !(cm > 0) || !(a > 0)) { out.appendChild(U.note('Enter age, weight and height.', 'err')); return; }
        var bmi = kg / Math.pow(cm / 100, 2);
        var bmiBf = deurenberg(s, bmi, a);
        var navy = NaN, problem = '';
        if (!(n > 0) || !(w > 0) || (s === 'female' && !(h > 0))) problem = 'Enter the tape measurements for the Navy method.';
        else if ((s === 'male' ? w : w + h) <= n) problem = 'The waist' + (s === 'male' ? '' : ' and hips') + ' must measure more than the neck.';
        else navy = navyBodyFat(s, cm, n, w, h);
        var main = isFinite(navy) ? navy : bmiBf;
        var fat = kg * main / 100;
        out.append(el('div', { class: 'stats' },
          stat('Body fat (US Navy)', isFinite(navy) ? fmt(navy, 1) + '%' : '—', 'navy'),
          stat('Category (ACE)', aceCategory(s, main), 'cat'),
          stat('Fat mass', fmt(fat, 1) + ' kg', 'fat-mass'),
          stat('Lean mass', fmt(kg - fat, 1) + ' kg', 'lean-mass'),
          stat('Body fat from BMI', fmt(bmiBf, 1) + '%', 'bmi-bf'),
          stat('BMI', fmt(bmi, 1), 'bmi')),
          el('p', { class: 'hl-muted', text: 'Fat ' + stlb(fat) + ', lean ' + stlb(kg - fat) + (isFinite(navy) ? '' : '. Fat and lean mass use the BMI estimate.') }),
          problem ? U.note(problem, 'err') : null);
        var bands = ACE[s], cat = aceCategory(s, main);
        scale.replaceChildren(U.table(['ACE category', s === 'male' ? 'Men' : 'Women'], bands.map(function (b) {
          return [b[0], b[1] + (b[2] >= 100 ? '% and over' : '–' + (b[2] - 1) + '%')];
        })));
        Array.prototype.forEach.call(scale.querySelectorAll('tbody tr'), function (tr, i) { tr.classList.toggle('on', bands[i][0] === cat); });
      }
      watch([sex, age, weight, height, mUnit, neck, waist, hip], run);
      root.appendChild(U.panel(null, U.row(sex, age), U.row(weight, height), U.row(mUnit), U.row(neck, waist, hip)));
      root.appendChild(U.panel('Result', out, scale,
        U.note('The Navy method uses tape measurements (Hodgdon and Beckett, 1984) and is usually within 3–4% of lab measurements. The BMI estimate (Deurenberg, 1991) cannot tell muscle from fat, so it reads high for muscular people. Measure on bare skin, relaxed, without pulling the tape tight.'),
        advice()));
    }
  });

  /* ======================================================================= */
  /* Ideal Weight Calculator                                                 */
  /* ======================================================================= */

  /* Each formula: base kg at 5 ft plus kg for every inch over (Hamwi 1964,
     Devine 1974, Robinson 1983, Miller 1983). */
  var IBW = [
    ['devine', 'Devine (1974)', { male: [50, 2.3], female: [45.5, 2.3] }],
    ['robinson', 'Robinson (1983)', { male: [52, 1.9], female: [49, 1.7] }],
    ['miller', 'Miller (1983)', { male: [56.2, 1.41], female: [53.1, 1.36] }],
    ['hamwi', 'Hamwi (1964)', { male: [48, 2.7], female: [45.5, 2.2] }]
  ];

  Tools.register({
    id: 'ideal-weight', category: 'health', name: 'Ideal Weight Calculator',
    description: 'Ideal weight by the Devine, Robinson, Miller and Hamwi formulas, and the healthy BMI weight range for your height, in kg, stones and pounds.',
    keywords: ['ideal weight', 'ideal body weight', 'ibw', 'healthy weight', 'target weight', 'devine', 'robinson', 'miller', 'hamwi', 'bmi range', 'stones', 'pounds'],
    render: function (root) {
      prep(root);
      var sex = sexField(), height = heightField('Height', 170);
      var out = el('div');
      function run() {
        var s = val(sex), cm = height.cm();
        out.replaceChildren();
        if (!(cm > 0)) { out.appendChild(U.note('Enter your height.', 'err')); return; }
        var over = cm / INCH - 60, m = cm / 100;
        var rows = IBW.map(function (f) { var c = f[2][s]; return [f[0], f[1], c[0] + c[1] * over]; });
        var lo = 18.5 * m * m, hi = 24.9 * m * m;
        var table = el('table', { class: 'data' },
          el('thead', el('tr', {}, ['Formula', 'kg', 'Stones', 'Pounds'].map(function (h, i) { return el('th', { class: i ? 'num' : '', text: h }); }))),
          el('tbody', rows.map(function (r) {
            return el('tr', { dataset: { formula: r[0], kg: r[2].toFixed(2) } }, el('td', { text: r[1] }), el('td', { class: 'num', text: fmt(r[2], 1) }),
              el('td', { class: 'num', text: stlb(r[2]) }), el('td', { class: 'num', text: fmt(r[2] / LB, 0) }));
          })));
        out.append(
          el('div', { class: 'hl-card hi' }, el('h4', { text: 'Healthy BMI range for your height (18.5–24.9)' }),
            el('div', { class: 'hl-big', dataset: { k: 'bmi-range', lo: lo.toFixed(2), hi: hi.toFixed(2) }, text: fmt(lo, 1) + '–' + fmt(hi, 1) + ' kg' }),
            el('div', { text: stlb(lo) + ' to ' + stlb(hi) + ' · ' + fmt(lo / LB, 0) + '–' + fmt(hi / LB, 0) + ' lb' })),
          el('div', { class: 'scroll' }, table),
          el('p', { class: 'hl-muted', text: 'Average of the four formulas: ' + weightText(rows.reduce(function (t, r) { return t + r[2]; }, 0) / rows.length) }),
          cm < 152.4 ? U.note('These formulas were designed for heights of 5 ft (152 cm) and over, so they are less reliable below that.', 'err') : null);
      }
      watch([sex, height], run);
      root.appendChild(U.panel(null, U.row(sex, height)));
      root.appendChild(U.panel('Ideal weight', out,
        U.note('The formulas date from the 1960s–80s and were made for working out drug doses, so treat them as rough. The NHS uses BMI: 18.5 to 24.9 is a healthy weight for most adults. People of South Asian, Chinese, other Asian, Middle Eastern, Black African or African-Caribbean family background have a higher risk of some conditions at a lower BMI, so for them 23 and over counts as overweight (NICE).'),
        advice()));
    }
  });

  /* ======================================================================= */
  /* Macro Calculator                                                        */
  /* ======================================================================= */

  var ACTIVITY = [
    { value: '1.2', label: 'Sedentary (desk job, little exercise)' }, { value: '1.375', label: 'Light (exercise 1–3 days a week)' },
    { value: '1.55', label: 'Moderate (exercise 3–5 days a week)' }, { value: '1.725', label: 'Active (exercise 6–7 days a week)' },
    { value: '1.9', label: 'Very active (hard training or a physical job)' }
  ];
  /* Mifflin-St Jeor (1990), kcal a day. */
  function mifflin(sex, kg, cm, age) { return 10 * kg + 6.25 * cm - 5 * age + (sex === 'male' ? 5 : -161); }
  var SPLITS = {
    balanced: { label: 'Balanced', p: 20, c: 50, f: 30 },
    lowcarb: { label: 'Low carb', p: 30, c: 25, f: 45 },
    highprotein: { label: 'High protein', p: 40, c: 35, f: 25 },
    keto: { label: 'Keto', p: 20, c: 5, f: 75 }
  };

  Tools.register({
    id: 'macro-calculator', category: 'health', name: 'Macro Calculator',
    description: 'Daily protein, carbohydrate and fat in grams and calories, per day and per meal, from your TDEE or a calorie target.',
    keywords: ['macros', 'macro calculator', 'macronutrients', 'protein', 'carbs', 'carbohydrates', 'fat', 'keto', 'low carb', 'high protein', 'iifym', 'tdee', 'mifflin', 'diet', 'cutting', 'bulking', 'calories'],
    render: function (root) {
      prep(root);
      var source = U.chips([{ value: 'tdee', label: 'Work it out from my details' }, { value: 'kcal', label: 'I know my calories' }], function () { run(); }, 'tdee');
      var sex = sexField(), age = U.input({ label: 'Age', type: 'number', min: 15, max: 110, value: '35' });
      var weight = weightField('Weight', 70), height = heightField('Height', 170);
      var act = U.select({ label: 'Activity', options: ACTIVITY, value: '1.375' });
      var kcalIn = U.input({ label: 'Calories a day', type: 'number', min: 800, step: 10, value: '2000' });
      var goal = U.chips([{ value: '-500', label: 'Lose weight' }, { value: '0', label: 'Maintain' }, { value: '300', label: 'Gain weight' }], function () { run(); }, '0');
      var split = U.chips(Object.keys(SPLITS).map(function (k) { return { value: k, label: SPLITS[k].label }; }).concat([{ value: 'gkg', label: 'Protein by g/kg' }]), function () { run(); }, 'balanced');
      var gkg = U.input({ label: 'Protein (g per kg of body weight)', type: 'number', min: 0.5, max: 3.5, step: 0.1, value: '1.6' });
      var fatPct = U.input({ label: 'Fat (% of calories)', type: 'number', min: 10, max: 80, step: 1, value: '30' });
      var meals = U.select({ label: 'Meals a day', options: ['2', '3', '4', '5', '6'], value: '3' });
      var details = el('div', {}, U.row(sex, age), U.row(weight, height), act);
      var custom = el('div', {}, U.row(gkg, fatPct));
      var out = el('div');

      function run() {
        var fromDetails = source.value === 'tdee';
        details.style.display = fromDetails ? '' : 'none';
        kcalIn.style.display = fromDetails ? 'none' : '';
        custom.style.display = split.value === 'gkg' ? '' : 'none';
        out.replaceChildren();
        var kg = weight.kg(), base, bmr = NaN;
        if (fromDetails) {
          var cm = height.cm(), a = num(age);
          if (!(kg > 0) || !(cm > 0) || !(a > 0)) { out.appendChild(U.note('Enter age, weight and height.', 'err')); return; }
          bmr = mifflin(val(sex), kg, cm, a);
          base = bmr * parseFloat(val(act));
        } else {
          base = num(kcalIn);
          if (!(base > 0)) { out.appendChild(U.note('Enter your daily calories.', 'err')); return; }
        }
        var kcal = base + (fromDetails ? +goal.value : 0);
        var p, c, f;
        if (split.value === 'gkg') {
          if (!(kg > 0)) { out.appendChild(U.note('Enter your weight for protein per kg.', 'err')); return; }
          var pk = num(gkg) * kg * 4, fk = kcal * num(fatPct) / 100;
          if (pk + fk > kcal) { out.appendChild(U.note('That much protein and fat is more than the whole calorie target.', 'err')); return; }
          p = pk; f = fk; c = kcal - pk - fk;
        } else {
          var sp = SPLITS[split.value];
          p = kcal * sp.p / 100; c = kcal * sp.c / 100; f = kcal * sp.f / 100;
        }
        var n = +val(meals);
        /* 4 kcal per gram of protein and carbohydrate, 9 of fat (Atwater factors). */
        var rows = [['p', 'Protein', p, p / 4], ['c', 'Carbohydrate', c, c / 4], ['f', 'Fat', f, f / 9]];
        out.append(el('div', { class: 'stats' },
          fromDetails ? stat('BMR (Mifflin-St Jeor)', fmt(bmr, 0) + ' kcal', 'bmr') : null,
          fromDetails ? stat('TDEE (maintenance)', fmt(base, 0) + ' kcal', 'tdee') : null,
          stat('Daily target', fmt(kcal, 0) + ' kcal', 'kcal')),
          el('div', { class: 'scroll' }, el('table', { class: 'data' },
            el('thead', el('tr', {}, ['', 'Grams a day', 'kcal a day', 'Share', 'Grams per meal'].map(function (h, i) { return el('th', { class: i ? 'num' : '', text: h }); }))),
            el('tbody', rows.map(function (r) {
              return el('tr', {}, el('td', { text: r[1] }),
                el('td', { class: 'num', dataset: { k: r[0] + '-g' }, text: fmt(r[3], 0) + ' g' }),
                el('td', { class: 'num', text: fmt(r[2], 0) }),
                el('td', { class: 'num', text: fmt(r[2] / kcal * 100, 0) + '%' }),
                el('td', { class: 'num', dataset: { k: r[0] + '-meal' }, text: fmt(r[3] / n, 0) + ' g' }));
            })))),
          kg > 0 ? el('p', { class: 'hl-muted', text: 'Protein works out at ' + fmt(p / 4 / kg, 1) + ' g per kg of body weight.' }) : null,
          kcal < (val(sex) === 'male' ? 1500 : 1200) ? U.note('This is a low calorie target. Diets of 800 kcal a day or less should only be followed with medical supervision (NHS).', 'err') : null);
      }
      watch([sex, age, weight, height, act, kcalIn, gkg, fatPct, meals], run);
      root.appendChild(U.panel(null, source, details, kcalIn));
      root.appendChild(U.panel('Goal and split', goal, split, custom, meals,
        U.note('Losing weight takes 500 kcal a day off maintenance (about 0.5 kg a week); gaining adds 300 kcal. Splits are protein/carbs/fat as shares of calories: balanced 20/50/30, low carb 30/25/45, high protein 40/35/25, keto 20/5/75.')));
      root.appendChild(U.panel('Your macros', out,
        advice('A guide only, not medical advice. The UK reference intake for an average adult is 2,000 kcal, 50 g protein, 260 g carbohydrate and 70 g fat a day.')));
    }
  });

  /* ======================================================================= */
  /* Water Intake Calculator                                                 */
  /* ======================================================================= */

  Tools.register({
    id: 'water-intake', category: 'health', name: 'Water Intake Calculator',
    description: 'A daily fluid estimate from your weight, exercise and the weather, in litres, glasses and pints, with the basis shown.',
    keywords: ['water intake', 'how much water', 'hydration', 'fluid', 'drink water', 'litres', 'liters', 'glasses of water', 'pints', 'dehydration', 'eatwell'],
    render: function (root) {
      prep(root);
      var weight = weightField('Weight', 70);
      var mins = U.input({ label: 'Exercise (minutes a day)', type: 'number', min: 0, step: 5, value: '30' });
      var climate = U.select({ label: 'Weather', options: [{ value: '0', label: 'Mild (UK most of the year)' }, { value: '500', label: 'Warm (over about 25 °C)' }, { value: '1000', label: 'Hot or humid (over about 30 °C)' }], value: '0' });
      var life = U.select({ label: 'Pregnancy', options: [{ value: '0', label: 'Not pregnant or breastfeeding' }, { value: '300', label: 'Pregnant' }, { value: '700', label: 'Breastfeeding' }], value: '0' });
      var glass = U.select({ label: 'Glass size', options: [{ value: '200', label: '200 ml' }, { value: '250', label: '250 ml' }, { value: '300', label: '300 ml' }], value: '250' });
      var out = el('div');
      function run() {
        var kg = weight.kg();
        out.replaceChildren();
        if (!(kg > 0)) { out.appendChild(U.note('Enter your weight.', 'err')); return; }
        var m = Math.max(0, num(mins) || 0);
        /* 35 ml per kg is the top of the 30–35 ml/kg rule of thumb dietitians
           use for total fluid; about a fifth usually comes from food (EFSA
           2010), leaving 28 ml/kg from drinks. Exercise adds 0.6 L an hour,
           the middle of ACSM's 0.4–0.8 L/h. EFSA adds 300 ml in pregnancy and
           700 ml when breastfeeding. */
        var parts = [['Body weight: ' + fmt(kg, 1) + ' kg × 28 ml', kg * 28], ['Exercise: ' + m + ' min × 10 ml', m * 10], ['Weather', +val(climate)], ['Pregnancy or breastfeeding', +val(life)]];
        var ml = parts.reduce(function (t, p) { return t + p[1]; }, 0), g = +val(glass);
        out.append(el('div', { class: 'stats' },
          stat('Litres a day', fmt(ml / 1000, 2), 'litres'),
          stat('Glasses of ' + g + ' ml', fmt(ml / g, 1), 'glasses'),
          stat('UK pints', fmt(ml / UK_PINT, 1), 'pints')),
          U.table(['Basis', 'ml'], parts.filter(function (p) { return p[1]; }).map(function (p) { return [p[0], fmt(p[1], 0)]; }).concat([['Total from drinks', fmt(ml, 0)]])));
      }
      watch([weight, mins, climate, life, glass], run);
      root.appendChild(U.panel(null, weight, U.row(mins, climate), U.row(life, glass)));
      root.appendChild(U.panel('Daily fluid from drinks', out,
        U.note('The NHS Eatwell Guide says to aim for 6 to 8 cups or glasses of fluid a day, more when it is hot or you are active. Water, lower-fat milk and sugar-free drinks, including tea and coffee, all count. For comparison, EFSA’s adequate total intake (food and drink) is 2.0 litres a day for women and 2.5 litres for men. Pale straw-coloured urine is a good sign you are drinking enough.'),
        advice('A rough estimate, not medical advice. If you have heart or kidney problems you may have been told to limit fluids: follow that advice instead.')));
    }
  });

  /* ======================================================================= */
  /* Heart Rate Zones                                                        */
  /* ======================================================================= */

  var ZONES = [
    [1, 'Recovery', 0.5, 0.6, 'Very easy; warm-ups and cool-downs'],
    [2, 'Endurance', 0.6, 0.7, 'Easy, conversational; builds aerobic base'],
    [3, 'Aerobic', 0.7, 0.8, 'Moderate; talking gets harder'],
    [4, 'Threshold', 0.8, 0.9, 'Hard; a few words at a time'],
    [5, 'Maximum', 0.9, 1.0, 'All-out efforts for short intervals']
  ];

  Tools.register({
    id: 'heart-rate-zones', category: 'health', name: 'Heart Rate Zones',
    description: 'Five training zones in beats per minute from your maximum and resting heart rate, by the Karvonen heart-rate-reserve method and by percentage of maximum.',
    keywords: ['heart rate zones', 'training zones', 'max heart rate', 'maximum heart rate', 'resting heart rate', 'karvonen', 'heart rate reserve', 'hrr', 'tanaka', '220 minus age', 'bpm', 'zone 2', 'cardio'],
    render: function (root) {
      prep(root);
      var age = U.input({ label: 'Age', type: 'number', min: 10, max: 110, value: '35' });
      var rest = U.input({ label: 'Resting heart rate (bpm)', type: 'number', min: 30, max: 120, value: '60', hint: 'Count your pulse for a minute before getting up.' });
      var method = U.chips([{ value: 'fox', label: '220 − age' }, { value: 'tanaka', label: 'Tanaka (208 − 0.7 × age)' }, { value: 'measured', label: 'I know my maximum' }], function () { run(); }, 'tanaka');
      var measured = U.input({ label: 'Measured maximum (bpm)', type: 'number', min: 100, max: 230, value: '185' });
      var out = el('div');
      function run() {
        measured.style.display = method.value === 'measured' ? '' : 'none';
        var a = num(age), r = num(rest);
        var max = method.value === 'fox' ? 220 - a : method.value === 'tanaka' ? 208 - 0.7 * a : num(measured);
        out.replaceChildren();
        if (!(max > 0) || !(r > 0)) { out.appendChild(U.note('Enter your age and resting heart rate.', 'err')); return; }
        if (r >= max) { out.appendChild(U.note('The resting heart rate must be below the maximum.', 'err')); return; }
        max = Math.round(max);
        var hrr = max - r;
        out.append(el('div', { class: 'stats' }, stat('Maximum heart rate', max + ' bpm', 'max'), stat('Heart rate reserve', hrr + ' bpm', 'hrr'), stat('Resting', Math.round(r) + ' bpm', 'rest')),
          el('div', { class: 'scroll' }, el('table', { class: 'data' },
            el('thead', el('tr', {}, ['Zone', 'Karvonen (bpm)', '% of max (bpm)', 'Feels like'].map(function (h) { return el('th', { text: h }); }))),
            el('tbody', ZONES.map(function (z) {
              var k = Math.round(r + z[2] * hrr) + '–' + Math.round(r + z[3] * hrr), p = Math.round(z[2] * max) + '–' + Math.round(z[3] * max);
              return el('tr', { dataset: { zone: z[0], karvonen: k, pct: p } },
                el('td', { text: z[0] + ' · ' + z[1] + ' (' + z[2] * 100 + '–' + z[3] * 100 + '%)' }), el('td', { class: 'mono', text: k }), el('td', { class: 'mono', text: p }), el('td', { text: z[4] }));
            })))));
      }
      U.live([age, rest, measured], run);
      root.appendChild(U.panel(null, U.row(age, rest), method, measured));
      root.appendChild(U.panel('Your zones', out,
        U.note('Karvonen (1957) takes each percentage of your heart rate reserve (maximum minus resting) and adds it to your resting rate, so it adjusts for fitness. Tanaka, Monahan and Seals (2001) found 208 − 0.7 × age fits adults better than 220 − age; both can be 10 or more bpm out for any one person, so a measured maximum is best.'),
        advice('A guide only, not medical advice. If you have a heart condition or take medicine that affects your heart rate, ask your GP before training by heart rate.')));
    }
  });

  /* ======================================================================= */
  /* One-Rep Max Calculator                                                  */
  /* ======================================================================= */

  var ORM = [
    ['epley', 'Epley', function (w, r) { return w * (1 + r / 30); }],
    ['brzycki', 'Brzycki', function (w, r) { return w * 36 / (37 - r); }],
    ['lombardi', 'Lombardi', function (w, r) { return w * Math.pow(r, 0.1); }],
    ['mayhew', 'Mayhew et al.', function (w, r) { return 100 * w / (52.2 + 41.9 * Math.exp(-0.055 * r)); }],
    ['oconner', 'O’Conner et al.', function (w, r) { return w * (1 + 0.025 * r); }],
    ['wathan', 'Wathan', function (w, r) { return 100 * w / (48.8 + 53.8 * Math.exp(-0.075 * r)); }]
  ];
  /* NSCA training load chart (Baechle & Earle, after Landers 1984): the
     share of 1RM most people can lift for a given number of reps. */
  var NSCA = [[100, 1], [95, 2], [93, 3], [90, 4], [87, 5], [85, 6], [83, 7], [80, 8], [77, 9], [75, 10], [67, 12], [65, 15], [60, null], [50, null]];
  var PLATES = { kg: [25, 20, 15, 10, 5, 2.5, 1.25], lb: [45, 35, 25, 10, 5, 2.5] };

  Tools.register({
    id: 'one-rep-max', category: 'health', name: 'One-Rep Max Calculator',
    description: 'Estimate your one-rep max from any weight and reps with six formulas, then see training weights by percentage, rounded to the plates you have.',
    keywords: ['one rep max', '1rm', 'one-rep max', 'max lift', 'bench press', 'squat', 'deadlift', 'epley', 'brzycki', 'lombardi', 'mayhew', 'wathan', 'oconner', 'percentage chart', 'plate calculator', 'strength training', 'powerlifting', 'weightlifting'],
    render: function (root) {
      prep(root);
      var weight = U.input({ label: 'Weight lifted', type: 'number', min: 0, step: 'any', value: imperial() ? '225' : '100' });
      var unit = U.select({ label: 'Unit', options: [{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }], value: imperial() ? 'lb' : 'kg' });
      var reps = U.input({ label: 'Reps', type: 'number', min: 1, max: 20, step: 1, value: '5' });
      var step = U.select({ label: 'Round to', options: [], value: '' });
      var bar = U.input({ label: 'Bar weight', type: 'number', min: 0, step: 'any', value: '20' });
      var out = el('div'), table = el('div');
      var lastUnit = 'kg';
      function steps() {
        var u = val(unit), s = inp(step);
        var list = u === 'kg' ? [['2.5', '2.5 kg (1.25 kg plates)'], ['1', '1 kg (0.5 kg plates)'], ['5', '5 kg (2.5 kg plates)']] : [['5', '5 lb (2.5 lb plates)'], ['2.5', '2.5 lb (1.25 lb plates)'], ['10', '10 lb (5 lb plates)']];
        s.replaceChildren.apply(s, list.map(function (o) { return el('option', { value: o[0], text: o[1] }); }));
        if (u !== lastUnit) { setVal(bar, u === 'kg' ? '20' : '45'); lastUnit = u; }
      }
      function plates(load, u, b) {
        var side = (load - b) / 2, used = [];
        if (side < 0) return '—';
        PLATES[u].concat(u === 'kg' ? [0.5] : [1.25]).forEach(function (p) { while (side >= p - 1e-9) { used.push(p); side -= p; } });
        return used.length ? used.join(' + ') : 'Bar only';
      }
      function run() {
        var w = num(weight), r = Math.round(num(reps)), u = val(unit), inc = parseFloat(val(step)) || (u === 'kg' ? 2.5 : 5), b = num(bar) || 0;
        out.replaceChildren(); table.replaceChildren();
        if (!(w > 0) || !(r >= 1) || r > 20) { out.appendChild(U.note('Enter the weight and 1 to 20 reps.', 'err')); return; }
        var est = ORM.map(function (f) { return [f[0], f[1], r === 1 ? w : f[2](w, r)]; });
        var avg = est.reduce(function (t, e) { return t + e[2]; }, 0) / est.length;
        function round(x) { return Math.round(x / inc) * inc; }
        out.append(el('div', { class: 'stats' },
          stat('Estimated 1RM (average)', fmt(avg, 1) + ' ' + u, 'avg'),
          stat('Rounded to ' + inc + ' ' + u, fmt(round(avg), inc % 1 ? 2 : 0).replace(/\.?0+$/, '') + ' ' + u, 'rounded')),
          el('div', { class: 'scroll' }, el('table', { class: 'data' },
            el('thead', el('tr', {}, el('th', { text: 'Formula' }), el('th', { class: 'num', text: '1RM (' + u + ')' }))),
            el('tbody', est.map(function (e) { return el('tr', { dataset: { formula: e[0], value: e[2].toFixed(2) } }, el('td', { text: e[1] }), el('td', { class: 'num', text: fmt(e[2], 1) })); })))),
          r > 10 ? U.note('Estimates get less reliable above about 10 reps.', 'err') : null);
        table.appendChild(el('div', { class: 'scroll' }, el('table', { class: 'data' },
          el('thead', el('tr', {}, ['% of 1RM', 'Reps (NSCA)', 'Weight (' + u + ')', 'Plates per side'].map(function (h) { return el('th', { text: h }); }))),
          el('tbody', NSCA.map(function (row) {
            var load = round(avg * row[0] / 100);
            return el('tr', { dataset: { pct: row[0], load: String(load) } }, el('td', { text: row[0] + '%' }), el('td', { text: row[1] ? String(row[1]) : '—' }),
              el('td', { class: 'mono', text: String(+load.toFixed(2)) }), el('td', { class: 'mono', text: plates(load, u, b) }));
          })))));
      }
      steps();
      U.live([weight, unit, reps, step, bar], function () { if (val(unit) !== lastUnit) steps(); run(); });
      root.appendChild(U.panel(null, U.row(weight, unit, reps), U.row(step, bar)));
      root.appendChild(U.panel('Estimated one-rep max', out,
        U.note('Formulas: Epley w × (1 + r/30); Brzycki w × 36/(37 − r); Lombardi w × r^0.1; Mayhew 100w/(52.2 + 41.9e^(−0.055r)); O’Conner w × (1 + 0.025r); Wathan 100w/(48.8 + 53.8e^(−0.075r)). One rep counts as your 1RM.')));
      root.appendChild(U.panel('Training weights', table,
        U.note('Reps are from the NSCA training load chart. Always warm up and use a spotter or safety bars for heavy sets.')));
    }
  });

  /* ======================================================================= */
  /* UK Alcohol Units Calculator                                             */
  /* ======================================================================= */

  /* Units = ABV % × ml ÷ 1000 (NHS). Calories: 7 kcal per gram of alcohol
     (0.789 g/ml) plus the sugars typical of the drink, per 100 ml, fitted to
     Drinkaware's figures: a pint of 4% beer 182 kcal, a pint of 4.5% cider
     216 kcal, 175 ml of 13% wine 159 kcal, 25 ml of 40% spirit about 55 kcal. */
  var EXTRA_KCAL = { beer: 10, cider: 13, wine: 19, spirit: 0, other: 0 };
  var DRINKS = [
    ['pint-lager', 'Pint of lager or beer (4%)', 568, 4, 'beer'], ['pint-strong', 'Pint of strong lager (5.2%)', 568, 5.2, 'beer'],
    ['pint-cider', 'Pint of cider (4.5%)', 568, 4.5, 'cider'], ['bottle-beer', 'Bottle of beer (330 ml, 5%)', 330, 5, 'beer'],
    ['can-beer', 'Can of beer (440 ml, 4%)', 440, 4, 'beer'], ['wine-small', 'Small glass of wine (125 ml, 12%)', 125, 12, 'wine'],
    ['wine-std', 'Standard glass of wine (175 ml, 12%)', 175, 12, 'wine'], ['wine-large', 'Large glass of wine (250 ml, 12%)', 250, 12, 'wine'],
    ['wine-bottle', 'Bottle of wine (750 ml, 12%)', 750, 12, 'wine'], ['spirit-25', 'Single spirit (25 ml, 40%)', 25, 40, 'spirit'],
    ['spirit-35', 'Single spirit (35 ml, 40%)', 35, 40, 'spirit'], ['spirit-50', 'Double spirit (50 ml, 40%)', 50, 40, 'spirit'],
    ['custom', 'Other drink (alcohol calories only)', 330, 5, 'other']
  ];
  function drinkUnits(ml, abv) { return abv * ml / 1000; }
  function drinkKcal(ml, abv, type) { return ml * abv / 100 * 0.789 * 7 + ml * (EXTRA_KCAL[type] || 0) / 100; }

  Tools.register({
    id: 'alcohol-units', category: 'health', name: 'UK Alcohol Units Calculator',
    description: 'Add up a week’s drinks in UK units against the Chief Medical Officers’ 14-unit guideline, with calories and a rough time to process them.',
    keywords: ['alcohol units', 'units of alcohol', 'uk units', 'drink units', '14 units', 'drinking guidelines', 'cmo', 'abv', 'pint', 'wine', 'beer', 'spirits', 'calories in alcohol', 'drink driving', 'drinkaware', 'booze'],
    render: function (root) {
      prep(root);
      var body = el('tbody'), rows = [];
      var days = U.input({ label: 'Days you drink on in a week', type: 'number', min: 1, max: 7, step: 1, value: '3' });
      var out = el('div');
      function addRow(preset, count) {
        var d = DRINKS.filter(function (x) { return x[0] === (preset || 'pint-lager'); })[0];
        var n = rows.length + 1;
        var sel = el('select', { 'aria-label': 'Drink, row ' + n }, DRINKS.map(function (x) { return el('option', { value: x[0], text: x[1] }); }));
        sel.value = d[0];
        var row = {
          sel: sel,
          ml: el('input', { type: 'number', min: 0, step: 'any', value: String(d[2]), 'aria-label': 'Volume in ml, row ' + n }),
          abv: el('input', { type: 'number', min: 0, max: 100, step: 'any', value: String(d[3]), 'aria-label': 'ABV %, row ' + n }),
          count: el('input', { type: 'number', min: 0, step: 1, value: String(count === undefined ? 1 : count), 'aria-label': 'How many a week, row ' + n }),
          units: el('td', { class: 'num', dataset: { k: 'row-units' } }), kcal: el('td', { class: 'num', dataset: { k: 'row-kcal' } })
        };
        sel.addEventListener('change', function () {
          var p = DRINKS.filter(function (x) { return x[0] === sel.value; })[0];
          row.ml.value = String(p[2]); row.abv.value = String(p[3]);
          run();
        });
        row.tr = el('tr', {}, el('td', sel), el('td', row.ml), el('td', row.abv), el('td', row.count), row.units, row.kcal,
          el('td', U.button('×', function () { rows.splice(rows.indexOf(row), 1); row.tr.remove(); run(); }, 'ghost')));
        rows.push(row);
        body.appendChild(row.tr);
        return row;
      }
      function run() {
        var total = 0, kcal = 0;
        rows.forEach(function (r) {
          var p = DRINKS.filter(function (x) { return x[0] === r.sel.value; })[0];
          var ml = Math.max(0, parseFloat(r.ml.value) || 0), abv = Math.max(0, parseFloat(r.abv.value) || 0), n = Math.max(0, parseFloat(r.count.value) || 0);
          var u = drinkUnits(ml, abv), k = drinkKcal(ml, abv, p[4]);
          r.units.textContent = fmt(u, 1);
          r.kcal.textContent = fmt(k, 0);
          total += u * n; kcal += k * n;
        });
        var d = Math.min(7, Math.max(1, Math.round(num(days)) || 1)), perDay = total / d;
        var pct = total / 14 * 100;
        var msgs = [];
        if (total > 14) msgs.push('That is ' + fmt(total - 14, 1) + ' units over the 14 units a week the UK Chief Medical Officers advise not to regularly exceed.');
        else msgs.push('That is within the 14 units a week guideline.');
        if (total >= 14 && d < 3) msgs.push('If you drink as much as 14 units a week, it is best to spread it evenly over 3 or more days.');
        if (d > 5) msgs.push('Having several drink-free days each week is a good way to cut down.');
        if (perDay > 6) msgs.push('More than 6 units in a day counts as binge drinking for men and women.');
        out.replaceChildren(
          el('div', { class: 'stats' },
            stat('Units a week', fmt(total, 1), 'units'),
            stat('Of the 14-unit guideline', fmt(pct, 0) + '%', 'pct'),
            stat('Calories a week', fmt(kcal, 0) + ' kcal', 'kcal'),
            stat('Units per drinking day', fmt(perDay, 1), 'per-day'),
            stat('Rough time to process a day’s drinking', fmt(perDay, 0) + ' h', 'hours')),
          el('div', { class: 'hl-bar' + (total > 14 ? ' over' : '') }, el('i', { style: { width: Math.min(100, pct) + '%' } })),
          U.note(msgs.join(' '), total > 14 ? 'err' : 'ok'));
      }
      body.addEventListener('input', U.debounce(run, 120));
      var table = el('table', { class: 'data hl-drinks' },
        el('thead', el('tr', {}, ['Drink', 'ml', 'ABV %', 'A week', 'Units each', 'kcal each', ''].map(function (h) { return el('th', { text: h }); }))), body);
      U.live([days], run);
      addRow('pint-lager', 4);
      addRow('wine-std', 2);
      run();
      root.appendChild(U.panel('A typical week', el('div', { class: 'scroll' }, table),
        U.btnrow(U.button('Add a drink', function () { addRow('pint-lager', 1); run(); }),
          U.button('Clear', function () { rows.slice().forEach(function (r) { r.tr.remove(); }); rows = []; run(); }, 'ghost')), days));
      root.appendChild(U.panel('Your week', out,
        U.note('One unit is 10 ml (8 g) of pure alcohol: units = ABV % × ml ÷ 1,000. The body clears about 1 unit an hour, but that is a very rough average that varies with weight, sex, food and your liver, and there is no safe way to speed it up. You can still be over the drink-drive limit the morning after.'),
        advice('A guide only, not medical advice. For support, talk to your GP or call Drinkline free on 0300 123 1110.')));
    }
  });

  /* ======================================================================= */
  /* Pregnancy Due Date & Ovulation Calculator                               */
  /* ======================================================================= */

  function gaText(days) { var w = Math.floor(days / 7), d = days % 7; return w + ' week' + (w === 1 ? '' : 's') + ' ' + d + ' day' + (d === 1 ? '' : 's'); }

  Tools.register({
    id: 'due-date', category: 'health', name: 'Pregnancy Due Date & Ovulation Calculator',
    description: 'Your due date from your last period, conception or IVF transfer, how many weeks pregnant you are, trimester and scan dates, and your fertile window.',
    keywords: ['due date', 'pregnancy calculator', 'due date calculator', 'how many weeks pregnant', 'edd', 'naegele', 'last period', 'lmp', 'conception', 'ivf', 'embryo transfer',
      'trimester', 'dating scan', '12 week scan', '20 week scan', 'ovulation', 'fertile window', 'ovulation calculator', 'period tracker', 'menstrual cycle'],
    render: function (root) {
      prep(root);
      var today = todayISO();
      var tabs = U.chips([{ value: 'due', label: 'Due date' }, { value: 'ovulation', label: 'Ovulation' }], function () { run(); }, 'due');
      var method = U.select({ label: 'Work it out from', options: [{ value: 'lmp', label: 'First day of last period' }, { value: 'conception', label: 'Conception date' },
        { value: 'ivf5', label: 'IVF transfer, day-5 blastocyst' }, { value: 'ivf3', label: 'IVF transfer, day-3 embryo' }], value: 'lmp' });
      var start = U.input({ label: 'Date', type: 'date', value: isoOf(addDays(parseISO(today), -70)) });
      var cycle = U.input({ label: 'Cycle length (days)', type: 'number', min: 20, max: 45, step: 1, value: '28' });
      var on = U.input({ label: 'How far along on', type: 'date', value: today });
      var lmp2 = U.input({ label: 'First day of last period', type: 'date', value: isoOf(addDays(parseISO(today), -10)) });
      var cycle2 = U.input({ label: 'Cycle length (days)', type: 'number', min: 20, max: 45, step: 1, value: '28' });
      var luteal = U.input({ label: 'Luteal phase (days)', type: 'number', min: 10, max: 16, step: 1, value: '14', hint: 'Ovulation is usually 10 to 16 days before the next period; 14 is typical.' });
      var duePanel = el('div'), ovPanel = el('div'), out = el('div');

      function milestone(key, label, lmp, fromDays, toDays) {
        var a = addDays(lmp, fromDays), b = toDays === undefined ? null : addDays(lmp, toDays);
        return el('tr', { dataset: { m: key, from: isoOf(a), to: b ? isoOf(b) : '' } }, el('td', { text: label }),
          el('td', { text: b ? shortOf(a) + ' to ' + shortOf(b) : longOf(a) }),
          el('td', { class: 'hl-muted', text: Math.floor(fromDays / 7) + '+' + fromDays % 7 + (toDays === undefined ? '' : ' to ' + Math.floor(toDays / 7) + '+' + toDays % 7) + ' weeks' }));
      }
      function runDue() {
        var d = parseISO(val(start)), m = val(method);
        cycle.style.display = m === 'lmp' ? '' : 'none';
        if (!d) { out.appendChild(U.note('Pick a date.', 'err')); return; }
        var c = Math.round(num(cycle)) || 28;
        if (m === 'lmp' && (c < 20 || c > 45)) { out.appendChild(U.note('Cycle length should be between 20 and 45 days.', 'err')); return; }
        /* Naegele's rule: 280 days from the last period for a 28-day cycle,
           moved by the difference for longer or shorter cycles; conception
           is 266 days before the due date; a day-5 embryo is 5 days past it. */
        var due = m === 'lmp' ? addDays(d, 280 + (c - 28)) : m === 'conception' ? addDays(d, 266) : addDays(d, m === 'ivf5' ? 261 : 263);
        var lmp = addDays(due, -280);
        var at = parseISO(val(on)) || parseISO(today);
        var ga = dayCount(lmp, at);
        var tri = ga < 0 ? 'Not yet pregnant on that date' : ga < 91 ? 'First trimester' : ga < 196 ? 'Second trimester' : ga <= 294 ? 'Third trimester' : 'Past 42 weeks';
        out.append(el('div', { class: 'hl-cards' },
          el('div', { class: 'hl-card hi' }, el('h4', { text: 'Estimated due date' }), el('div', { class: 'hl-big', dataset: { k: 'due', date: isoOf(due) }, text: shortOf(due) }), el('div', { text: longOf(due) })),
          el('div', { class: 'hl-card' }, el('h4', { text: 'On ' + shortOf(at) }),
            el('div', { class: 'hl-big', dataset: { k: 'ga', ga: ga >= 0 ? Math.floor(ga / 7) + '+' + ga % 7 : '' }, text: ga >= 0 ? gaText(ga) : '—' }),
            el('div', { dataset: { k: 'trimester' }, text: tri }),
            ga >= 0 && ga <= 280 ? el('div', { class: 'hl-muted', text: (280 - ga) + ' days to go' }) : null)),
          el('div', { class: 'scroll' }, el('table', { class: 'data' },
            el('thead', el('tr', {}, ['Milestone', 'Dates', 'Weeks'].map(function (h) { return el('th', { text: h }); }))),
            el('tbody',
              milestone('tri1', 'First trimester', lmp, 0, 90),
              milestone('scan12', '12-week (dating) scan', lmp, 70, 98),
              milestone('screening', 'Combined screening test window', lmp, 79, 99),
              milestone('tri2', 'Second trimester', lmp, 91, 195),
              milestone('scan20', '20-week screening scan', lmp, 126, 153),
              milestone('tri3', 'Third trimester begins', lmp, 196),
              milestone('term', 'Full term', lmp, 259),
              milestone('due', 'Due date (40 weeks)', lmp, 280),
              milestone('late', '42 weeks', lmp, 294)))));
        if (m !== 'lmp') out.appendChild(el('p', { class: 'hl-muted', text: 'Weeks are counted from ' + longOf(lmp) + ', the equivalent first day of the last period, as midwives do.' }));
      }
      function runOvulation() {
        var d = parseISO(val(lmp2)), c = Math.round(num(cycle2)), l = Math.round(num(luteal));
        if (!d || !(c >= 20 && c <= 45) || !(l >= 10 && l <= 16) || l >= c) { out.appendChild(U.note('Enter the first day of your last period, a cycle of 20 to 45 days and a luteal phase of 10 to 16 days.', 'err')); return; }
        var rows = [];
        for (var i = 0; i < 6; i++) {
          var period = addDays(d, i * c), next = addDays(period, c), ov = addDays(next, -l);
          rows.push(el('tr', { dataset: { cycle: i + 1, period: isoOf(period), ovulation: isoOf(ov), fertile: isoOf(addDays(ov, -5)) + '/' + isoOf(ov) } },
            el('td', { text: shortOf(period) }), el('td', { text: shortOf(addDays(ov, -5)) + ' to ' + shortOf(ov) }), el('td', { text: shortOf(ov) }), el('td', { text: shortOf(next) })));
        }
        out.append(el('div', { class: 'scroll' }, el('table', { class: 'data' },
          el('thead', el('tr', {}, ['Period starts', 'Fertile window', 'Likely ovulation', 'Next period'].map(function (h) { return el('th', { text: h }); }))), el('tbody', rows))),
          U.note('The fertile window is the 5 days before ovulation and the day itself; sperm can survive for up to 7 days. Cycles vary, so these are estimates, and this is not a method of contraception.'));
      }
      function run() {
        var due = tabs.value === 'due';
        duePanel.style.display = due ? '' : 'none';
        ovPanel.style.display = due ? 'none' : '';
        out.replaceChildren();
        if (due) runDue(); else runOvulation();
      }
      duePanel.append(U.row(method, start, cycle), on);
      ovPanel.append(U.row(lmp2, cycle2, luteal));
      U.live([method, start, cycle, on, lmp2, cycle2, luteal], run);
      root.appendChild(U.panel(null, tabs, duePanel, ovPanel));
      root.appendChild(U.panel(null, out,
        U.note('NHS scan times: the dating scan is offered between 10 and 14 weeks (the combined screening test needs 11 weeks 2 days to 14 weeks 1 day), and the 20-week scan between 18 and 21 weeks. Only about 1 in 20 babies arrives on the due date; your midwife may adjust it after the dating scan.'),
        advice('A guide only, not medical advice. Contact your midwife or GP about your pregnancy.')));
    }
  });

  /* ======================================================================= */
  /* Calories Burned Calculator                                              */
  /* ======================================================================= */

  /* MET values and codes from the 2024 Adult Compendium of Physical
     Activities (Herrmann et al., J Sport Health Sci 2024;13(1):6–10,
     pacompendium.com); the short descriptions are ours. */
  var ACTIVITIES = [
    ['17151', 'walk', 2.3, 'Walking, strolling, under 2 mph (3.2 km/h)'],
    ['17152', 'walk', 2.8, 'Walking, slow, 2–2.4 mph (3.2–3.9 km/h)'],
    ['17170', 'walk', 3, 'Walking, 2.5 mph (4 km/h)'],
    ['17190', 'walk', 3.8, 'Walking, moderate, 2.8–3.4 mph (4.5–5.5 km/h)'],
    ['17200', 'walk', 4.8, 'Walking, brisk, 3.5–3.9 mph (5.6–6.3 km/h)'],
    ['17220', 'walk', 5.5, 'Walking, very brisk, 4–4.4 mph (6.4–7.1 km/h)'],
    ['17230', 'walk', 7, 'Walking, 4.5–4.9 mph (7.2–7.9 km/h)'],
    ['17231', 'walk', 8.5, 'Walking, 5–5.5 mph (8–8.9 km/h)'],
    ['17165', 'walk', 3, 'Walking the dog'],
    ['17100', 'walk', 3.8, 'Pushing a pram or walking with children'],
    ['17034', 'walk', 5.3, 'Walking uphill, no load, 1–5% slope, moderate to brisk'],
    ['17082', 'walk', 5.3, 'Hill walking at a normal pace, no load'],
    ['17080', 'walk', 6, 'Hiking, cross-country'],
    ['17012', 'walk', 7.8, 'Hiking with a day pack'],
    ['17110', 'walk', 6.5, 'Race walking'],
    ['17302', 'walk', 4.3, 'Nordic walking, moderate pace'],
    ['17131', 'walk', 6.8, 'Climbing stairs'],
    ['17133', 'walk', 4.5, 'Climbing stairs, slowly'],
    ['17355', 'walk', 3.8, 'Treadmill walking, 3–3.4 mph, flat'],
    ['12020', 'run', 7.5, 'Jogging, own pace'],
    ['12028', 'run', 6.5, 'Running, 4–4.2 mph (13 min/mile)'],
    ['12030', 'run', 8.5, 'Running, 5–5.2 mph (12 min/mile, 7:27 min/km)'],
    ['12045', 'run', 9, 'Running, 5.5–5.8 mph'],
    ['12050', 'run', 9.3, 'Running, 6–6.3 mph (10 min/mile, 6:13 min/km)'],
    ['12060', 'run', 10.5, 'Running, 6.7 mph (9 min/mile, 5:36 min/km)'],
    ['12070', 'run', 11, 'Running, 7 mph (8.5 min/mile)'],
    ['12080', 'run', 11.8, 'Running, 7.5 mph (8 min/mile, 4:58 min/km)'],
    ['12090', 'run', 12, 'Running, 8 mph (7.5 min/mile)'],
    ['12100', 'run', 12.5, 'Running, 8.6 mph (7 min/mile, 4:21 min/km)'],
    ['12110', 'run', 13, 'Running, 9 mph (6.5 min/mile)'],
    ['12120', 'run', 14.8, 'Running, 10 mph (6 min/mile, 3:44 min/km)'],
    ['12130', 'run', 16.8, 'Running, 11 mph (5.5 min/mile)'],
    ['12140', 'run', 9.3, 'Cross-country running'],
    ['12200', 'run', 13.3, 'Running a marathon'],
    ['12170', 'run', 15, 'Running up stairs'],
    ['01010', 'cycle', 4, 'Cycling, leisurely, under 10 mph (16 km/h)'],
    ['01020', 'cycle', 6.8, 'Cycling, 10–11.9 mph (16–19 km/h), light effort'],
    ['01030', 'cycle', 8, 'Cycling, 12–13.9 mph (19–22 km/h), moderate effort'],
    ['01040', 'cycle', 10, 'Cycling, 14–15.9 mph (22–25.5 km/h), fast'],
    ['01050', 'cycle', 12, 'Cycling, 16–19 mph (25.5–30.5 km/h), racing'],
    ['01060', 'cycle', 16.8, 'Cycling, over 20 mph (32 km/h), racing'],
    ['01011', 'cycle', 6.8, 'Cycling to and from work, own pace'],
    ['01009', 'cycle', 8.5, 'Mountain biking, general'],
    ['01003', 'cycle', 14, 'Mountain biking uphill, vigorous'],
    ['01084', 'cycle', 6, 'E-bike with light assistance'],
    ['01088', 'cycle', 4, 'E-bike with high assistance'],
    ['01200', 'cycle', 6.8, 'Exercise bike, general'],
    ['01214', 'cycle', 4, 'Exercise bike, 50 watts, light'],
    ['01228', 'cycle', 8, 'Exercise bike, 126–150 watts'],
    ['01232', 'cycle', 10.3, 'Exercise bike, 151–199 watts'],
    ['01270', 'cycle', 9, 'Spin class'],
    ['18240', 'swim', 5.8, 'Swimming lengths, front crawl, slow'],
    ['18290', 'swim', 8, 'Swimming, front crawl, medium (about 45 m a minute)'],
    ['18230', 'swim', 9.8, 'Swimming lengths, front crawl, fast'],
    ['18265', 'swim', 5.3, 'Swimming, breaststroke, leisurely'],
    ['18260', 'swim', 10.3, 'Swimming, breaststroke, training'],
    ['18255', 'swim', 4.8, 'Swimming, backstroke, leisurely'],
    ['18250', 'swim', 9.5, 'Swimming, backstroke, training'],
    ['18270', 'swim', 13.8, 'Swimming, butterfly'],
    ['18310', 'swim', 6, 'Swimming for fun, not lengths'],
    ['18300', 'swim', 6, 'Open-water swimming (sea, lake, river)'],
    ['18350', 'swim', 3.5, 'Treading water, moderate'],
    ['18355', 'swim', 5.5, 'Aqua aerobics'],
    ['18070', 'swim', 3.5, 'Canoeing or rowing for pleasure'],
    ['18100', 'swim', 5, 'Kayaking, moderate'],
    ['18224', 'swim', 6.5, 'Stand-up paddleboarding'],
    ['18220', 'swim', 3, 'Surfing'],
    ['02054', 'gym', 3.5, 'Weight training, several exercises, 8–15 reps'],
    ['02050', 'gym', 6, 'Weightlifting or bodybuilding, vigorous'],
    ['02052', 'gym', 5, 'Squats and deadlifts'],
    ['02022', 'gym', 3.8, 'Circuit of press-ups, sit-ups, lunges, moderate'],
    ['02020', 'gym', 7.5, 'Burpees, star jumps, press-ups, vigorous'],
    ['02035', 'gym', 5, 'Circuit training, moderate'],
    ['02040', 'gym', 7.5, 'Circuit training with kettlebells, vigorous'],
    ['02058', 'gym', 9.8, 'Kettlebell swings'],
    ['02048', 'gym', 5, 'Cross-trainer (elliptical), moderate'],
    ['02049', 'gym', 9, 'Cross-trainer (elliptical), vigorous'],
    ['02071', 'gym', 5, 'Rowing machine, under 100 watts'],
    ['02072', 'gym', 7.5, 'Rowing machine, 100–149 watts'],
    ['02073', 'gym', 11, 'Rowing machine, 150–199 watts'],
    ['02065', 'gym', 9.3, 'Stair machine'],
    ['02068', 'gym', 11, 'Skipping rope'],
    ['02210', 'gym', 7, 'HIIT, moderate'],
    ['02214', 'gym', 11, 'HIIT or Tabata, vigorous'],
    ['02002', 'gym', 7.3, 'Step aerobics, 6–8 inch step'],
    ['02062', 'gym', 7.8, 'Gym conditioning class'],
    ['02310', 'gym', 6.5, 'Zumba class'],
    ['02105', 'gym', 2.8, 'Pilates'],
    ['02150', 'gym', 2.3, 'Yoga, hatha'],
    ['02160', 'gym', 4, 'Yoga, power'],
    ['02101', 'gym', 2.3, 'Stretching, gentle'],
    ['02143', 'gym', 4, 'Exercise video, moderate'],
    ['05043', 'home', 3, 'Hoovering'],
    ['05021', 'home', 3.5, 'Mopping'],
    ['05010', 'home', 3.3, 'Sweeping floors'],
    ['05022', 'home', 3.3, 'Cleaning windows'],
    ['05030', 'home', 3.3, 'Cleaning the house, moderate'],
    ['05032', 'home', 2.5, 'Dusting or polishing'],
    ['05020', 'home', 3.5, 'Heavy cleaning, such as washing the car'],
    ['05035', 'home', 3.3, 'Cooking and washing up, moderate'],
    ['05050', 'home', 2, 'Cooking, light'],
    ['05041', 'home', 2, 'Washing dishes'],
    ['05070', 'home', 1.8, 'Ironing'],
    ['05090', 'home', 2.3, 'Laundry, folding or hanging out'],
    ['05100', 'home', 3, 'Making beds'],
    ['05060', 'home', 3.3, 'Food shopping'],
    ['05056', 'home', 5.3, 'Carrying shopping upstairs'],
    ['05120', 'home', 5.8, 'Moving furniture or carrying boxes'],
    ['05150', 'home', 9, 'Carrying boxes or furniture upstairs'],
    ['05175', 'home', 3.5, 'Playing with children, moderate'],
    ['05193', 'home', 4, 'Walking or running with a pet, moderate'],
    ['08095', 'garden', 5.5, 'Mowing the lawn, walking'],
    ['08110', 'garden', 6, 'Mowing with a hand mower'],
    ['08160', 'garden', 4, 'Raking leaves or lawn'],
    ['08240', 'garden', 4.5, 'Weeding, moderate'],
    ['08050', 'garden', 5, 'Digging'],
    ['08245', 'garden', 3.8, 'Gardening, general, moderate'],
    ['08210', 'garden', 3.8, 'Trimming hedges by hand'],
    ['08255', 'garden', 4.8, 'Pushing a wheelbarrow'],
    ['08200', 'garden', 6, 'Shovelling snow'],
    ['08020', 'garden', 6.5, 'Chopping wood, vigorous'],
    ['15610', 'sport', 7, 'Football (soccer), casual'],
    ['15605', 'sport', 9.5, 'Football (soccer), competitive'],
    ['15615', 'sport', 3.5, 'Walking football'],
    ['15055', 'sport', 7.5, 'Basketball, general'],
    ['15040', 'sport', 8, 'Basketball, game'],
    ['15477', 'sport', 7, 'Netball'],
    ['15560', 'sport', 8.3, 'Rugby union, competitive'],
    ['15562', 'sport', 6.3, 'Touch rugby'],
    ['15350', 'sport', 7.8, 'Field hockey'],
    ['15150', 'sport', 4.8, 'Cricket'],
    ['15675', 'sport', 6.8, 'Tennis, moderate'],
    ['15690', 'sport', 8, 'Tennis, singles'],
    ['15685', 'sport', 4.5, 'Tennis, doubles'],
    ['15030', 'sport', 5.5, 'Badminton, social'],
    ['15020', 'sport', 7, 'Badminton, competitive'],
    ['15652', 'sport', 7.3, 'Squash'],
    ['15660', 'sport', 4, 'Table tennis'],
    ['15255', 'sport', 4.5, 'Golf, general'],
    ['15265', 'sport', 4.3, 'Golf, walking and carrying clubs'],
    ['15285', 'sport', 4.5, 'Golf, walking with a trolley'],
    ['15720', 'sport', 3, 'Volleyball, non-competitive'],
    ['15110', 'sport', 5.8, 'Boxing, punchbag'],
    ['15430', 'sport', 10.3, 'Martial arts (judo, karate, kickboxing), moderate'],
    ['15533', 'sport', 8, 'Rock climbing'],
    ['15534', 'sport', 8.8, 'Bouldering'],
    ['15537', 'sport', 5.8, 'Climbing, easy to moderate routes'],
    ['15370', 'sport', 5.5, 'Horse riding'],
    ['15390', 'sport', 5.8, 'Horse riding, trotting'],
    ['15092', 'sport', 3.8, 'Tenpin bowling'],
    ['15465', 'sport', 3.3, 'Lawn bowls'],
    ['15180', 'sport', 2.5, 'Darts'],
    ['15080', 'sport', 2.5, 'Snooker or pool'],
    ['15670', 'sport', 3.3, 'Tai chi'],
    ['15591', 'sport', 7.5, 'Inline skating, 9 mph'],
    ['15580', 'sport', 5, 'Skateboarding'],
    ['15480', 'sport', 9, 'Orienteering'],
    ['03040', 'dance', 3, 'Ballroom dancing, slow (waltz, foxtrot)'],
    ['03030', 'dance', 5.5, 'Ballroom dancing, fast'],
    ['03031', 'dance', 9.8, 'Disco, line, folk or Irish dancing, vigorous'],
    ['03025', 'dance', 4.5, 'Salsa, flamenco, belly or swing dancing'],
    ['03010', 'dance', 5, 'Ballet, modern or jazz class'],
    ['03014', 'dance', 4.8, 'Tap dancing'],
    ['19160', 'winter', 6.3, 'Skiing or snowboarding, moderate'],
    ['19090', 'winter', 8.5, 'Cross-country skiing, moderate'],
    ['19030', 'winter', 7, 'Ice skating'],
    ['19190', 'winter', 5.3, 'Snowshoeing'],
    ['07030', 'daily', 1, 'Sleeping'],
    ['07021', 'daily', 1, 'Sitting quietly'],
    ['07040', 'daily', 1.3, 'Standing quietly'],
    ['09040', 'daily', 1.3, 'Desk work or typing'],
    ['16010', 'daily', 2, 'Driving a car'],
    ['16016', 'daily', 1.3, 'Riding a bus or train']
  ];
  var ACT_CATS = [['all', 'All'], ['walk', 'Walking'], ['run', 'Running'], ['cycle', 'Cycling'], ['swim', 'Swimming & water'], ['gym', 'Gym & classes'],
    ['home', 'Housework'], ['garden', 'Garden'], ['sport', 'Sports'], ['dance', 'Dancing'], ['winter', 'Winter'], ['daily', 'Everyday']];

  Tools.register({
    id: 'calories-burned', category: 'health', name: 'Calories Burned Calculator',
    description: 'Calories burned by walking, running, cycling, swimming, gym work, housework, gardening and sports, from 2024 Compendium MET values, your weight and the time.',
    keywords: ['calories burned', 'calories burnt', 'kcal', 'met', 'mets', 'exercise calories', 'energy expenditure', 'compendium of physical activities', 'walking', 'running', 'cycling',
      'swimming', 'gym', 'housework', 'gardening', 'sports', 'football', 'soccer', 'fitness', 'workout'],
    render: function (root) {
      prep(root);
      var weight = weightField('Weight', 70);
      var mins = U.input({ label: 'Duration (minutes)', type: 'number', min: 1, step: 5, value: '30' });
      var search = U.input({ type: 'search', placeholder: 'Search activities, e.g. brisk walk, swimming, hoovering…', 'aria-label': 'Search activities' });
      var cat = U.chips(ACT_CATS.map(function (c) { return { value: c[0], label: c[1] }; }), function () { run(); }, 'all');
      var picked = null;
      var card = el('div'), list = el('div');
      function kcal(met, kg, m) { return met * kg * m / 60; }
      function run() {
        var kg = weight.kg(), m = num(mins);
        var terms = String(val(search)).toLowerCase().trim().split(/\s+/).filter(Boolean);
        var rows = ACTIVITIES.filter(function (a) {
          if (cat.value !== 'all' && a[1] !== cat.value) return false;
          var hay = (a[3] + ' ' + a[0] + ' ' + ACT_CATS.filter(function (c) { return c[0] === a[1]; })[0][1]).toLowerCase();
          return terms.every(function (t) { return hay.indexOf(t) > -1; });
        });
        card.replaceChildren(); list.replaceChildren();
        if (!(kg > 0) || !(m > 0)) { card.appendChild(U.note('Enter your weight and how long.', 'err')); return; }
        var p = picked && ACTIVITIES.filter(function (a) { return a[0] === picked; })[0];
        if (p) card.appendChild(el('div', { class: 'hl-card hi' }, el('h4', { text: p[3] }),
          el('div', { class: 'hl-big', dataset: { k: 'picked-kcal' }, text: fmt(kcal(p[2], kg, m), 0) + ' kcal' }),
          el('div', { class: 'hl-muted', text: 'MET ' + p[2] + ' (code ' + p[0] + ') × ' + fmt(kg, 1) + ' kg × ' + fmt(m / 60, 2) + ' h' })));
        list.appendChild(el('div', { class: 'scroll', style: { maxHeight: '460px' } }, el('table', { class: 'data' },
          el('thead', el('tr', {}, el('th', { text: 'Activity' }), el('th', { class: 'num', text: 'MET' }), el('th', { class: 'num', text: 'kcal' }))),
          el('tbody', rows.map(function (a) {
            return el('tr', { class: a[0] === picked ? 'on' : '', dataset: { code: a[0], kcal: kcal(a[2], kg, m).toFixed(1) }, style: { cursor: 'pointer' },
              onclick: function () { picked = a[0]; run(); } },
              el('td', { text: a[3] }), el('td', { class: 'num', text: String(a[2]) }), el('td', { class: 'num', text: fmt(kcal(a[2], kg, m), 0) }));
          })))),
          el('p', { class: 'hl-muted', text: rows.length ? rows.length + ' activities. Tap one to pin it at the top.' : 'No activity matches that search.' }));
      }
      watch([weight, mins, search], run);
      root.appendChild(U.panel(null, U.row(weight, mins), search, cat));
      root.appendChild(U.panel('Calories burned', card, list,
        U.note('kcal = MET × weight in kg × hours. A MET is the energy you use sitting quietly, about 1 kcal per kg an hour, so these are gross figures that include what you would burn at rest. Real burns vary with fitness, age, sex and effort; MET values are from the 2024 Adult Compendium of Physical Activities.')));
    }
  });

  /* ======================================================================= */
  /* Box Breathing & Breathing Exercises                                     */
  /* ======================================================================= */

  var BREATHS = {
    box: { label: 'Box 4-4-4-4', phases: [['in', 4], ['hold', 4], ['out', 4], ['holdout', 4]], about: 'Breathe in, hold, out and hold for four seconds each. Used by the armed forces to stay calm under pressure.' },
    relax478: { label: '4-7-8', phases: [['in', 4], ['hold', 7], ['out', 8]], about: 'In through the nose for 4, hold for 7, out through the mouth for 8. Often used to wind down for sleep; start with four cycles.' },
    coherent: { label: 'Coherent 5.5', phases: [['in', 5.5], ['out', 5.5]], about: 'Slow, even breathing at about 5.5 breaths a minute, with no holds.' },
    sigh: { label: 'Physiological sigh', phases: [['in', 3], ['in2', 1], ['out', 6]], about: 'Two breaths in through the nose, the second a short top-up, then a long slow breath out through the mouth.' },
    custom: { label: 'Custom', phases: null, about: 'Set your own timings. Leave a hold at 0 to skip it.' }
  };
  var PHASE_NAME = { in: 'Breathe in', in2: 'In again', hold: 'Hold', out: 'Breathe out', holdout: 'Hold' };
  /* Circle size at the start and end of each phase. */
  var PHASE_SCALE = { in: [0.55, 1], in2: [0.9, 1], hold: [1, 1], out: [1, 0.55], holdout: [0.55, 0.55] };

  Tools.register({
    id: 'box-breathing', category: 'health', name: 'Box Breathing & Breathing Exercises',
    description: 'Guided breathing with an animated circle: box breathing, 4-7-8, coherent breathing, the physiological sigh or your own timings, with optional sound and vibration.',
    keywords: ['box breathing', 'breathing exercise', 'breathwork', '4-7-8', '478 breathing', 'coherent breathing', 'resonant breathing', 'physiological sigh', 'cyclic sighing',
      'relaxation', 'calm', 'anxiety', 'stress', 'meditation', 'mindfulness', 'sleep', 'square breathing'],
    render: function (root) {
      prep(root);
      var pattern = U.chips(Object.keys(BREATHS).map(function (k) { return { value: k, label: BREATHS[k].label }; }), function () { stop(); refresh(); }, 'box');
      var cin = U.input({ label: 'Breathe in (s)', type: 'number', min: 0.5, max: 30, step: 0.5, value: '4' });
      var chold = U.input({ label: 'Hold (s)', type: 'number', min: 0, max: 30, step: 0.5, value: '4' });
      var cout = U.input({ label: 'Breathe out (s)', type: 'number', min: 0.5, max: 30, step: 0.5, value: '4' });
      var chold2 = U.input({ label: 'Hold after out (s)', type: 'number', min: 0, max: 30, step: 0.5, value: '4' });
      var custom = el('div', { class: 'row' }, cin, chold, cout, chold2);
      var mode = U.select({ label: 'Session', options: [{ value: 'cycles', label: 'Number of cycles' }, { value: 'minutes', label: 'Minutes' }], value: 'cycles' });
      var amount = U.input({ label: 'How many', type: 'number', min: 1, max: 120, step: 1, value: '10' });
      var sound = U.checkbox('Sound cues'), buzz = U.checkbox('Vibrate on each change'), wake = U.checkbox('Keep the screen on', { checked: true });
      var about = U.note(''), plan = el('p', { class: 'hl-muted' });
      var phaseEl = el('div', { class: 'hl-phase', dataset: { k: 'phase' }, text: 'Ready' });
      var countEl = el('div', { class: 'hl-count', dataset: { k: 'count' }, text: '' });
      var orb = el('div', { class: 'hl-orb' }, phaseEl, countEl);
      var cycleEl = el('div', { class: 'hl-muted', dataset: { k: 'cycle' } });
      var stage = el('div', { class: 'hl-stage' }, orb, cycleEl);
      var startBtn = U.button('Start', function () { running ? pause() : start(); }, 'primary');
      var stopBtn = U.button('Stop', function () { stop(); });
      var fullBtn = U.button('Full screen', function () { stage.classList.toggle('full'); fullBtn.textContent = stage.classList.contains('full') ? 'Exit full screen' : 'Full screen'; });
      stage.addEventListener('click', function () { if (stage.classList.contains('full')) fullBtn.click(); });
      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      var phases = [], cycleLen = 0, cycles = 0, raf = 0, running = false, t0 = 0, pausedAt = 0, lastKey = '', actx = null, lock = null;

      function phaseList() {
        var k = pattern.value;
        if (k !== 'custom') return BREATHS[k].phases.map(function (p) { return { kind: p[0], secs: p[1] }; });
        return [['in', num(cin)], ['hold', num(chold)], ['out', num(cout)], ['holdout', num(chold2)]]
          .filter(function (p) { return p[1] > 0; }).map(function (p) { return { kind: p[0], secs: Math.min(30, p[1]) }; });
      }
      function clock(s) { s = Math.round(s); return Math.floor(s / 60) + ':' + pad(s % 60); }
      function refresh() {
        custom.style.display = pattern.value === 'custom' ? '' : 'none';
        about.textContent = BREATHS[pattern.value].about;
        phases = phaseList();
        cycleLen = phases.reduce(function (t, p) { return t + p.secs; }, 0);
        var n = Math.max(1, num(amount) || 1);
        cycles = cycleLen > 0 ? (val(mode) === 'minutes' ? Math.max(1, Math.round(n * 60 / cycleLen)) : Math.round(n)) : 0;
        plan.replaceChildren();
        if (!cycleLen) { plan.textContent = 'Set at least a breath in and a breath out.'; return; }
        plan.append(phases.map(function (p) { return PHASE_NAME[p.kind] + ' ' + p.secs; }).join(' · ') + ' seconds. ',
          el('span', { dataset: { k: 'total' }, text: clock(cycles * cycleLen) }), ' for ', el('span', { dataset: { k: 'cycles' }, text: String(cycles) }), ' cycles, ',
          el('span', { dataset: { k: 'bpm' }, text: fmt(60 / cycleLen, 1) }), ' breaths a minute.');
        if (!running) paint(0);
      }
      function cue(kind) {
        if (sound.input.checked) {
          try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (AC) {
              actx = actx || new AC();
              if (actx.state === 'suspended') actx.resume();
              var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
              o.frequency.value = kind === 'in' || kind === 'in2' ? 528 : kind === 'out' ? 352 : 440;
              g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
              o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 0.55);
            }
          } catch (e) { /* sound is optional */ }
        }
        if (buzz.input.checked && navigator.vibrate) { try { navigator.vibrate(kind === 'hold' || kind === 'holdout' ? [40, 60, 40] : 80); } catch (e) { /* not supported */ } }
      }
      function paint(elapsed) {
        if (!cycleLen) return;
        var done = elapsed >= cycles * cycleLen;
        if (done) {
          phaseEl.textContent = 'Done';
          countEl.textContent = '';
          cycleEl.textContent = cycles + ' cycles in ' + clock(cycles * cycleLen) + '. Well done.';
          orb.style.transform = reduced ? '' : 'scale(0.55)';
          return true;
        }
        var c = Math.floor(elapsed / cycleLen), t = elapsed - c * cycleLen, i = 0;
        while (i < phases.length - 1 && t >= phases[i].secs) { t -= phases[i].secs; i++; }
        var p = phases[i], frac = Math.min(1, t / p.secs), sc = PHASE_SCALE[p.kind];
        var ease = 0.5 - Math.cos(Math.PI * frac) / 2;
        phaseEl.textContent = running || elapsed > 0 ? PHASE_NAME[p.kind] : 'Ready';
        countEl.textContent = running || elapsed > 0 ? String(Math.ceil(p.secs - t - 1e-6)) : '';
        cycleEl.textContent = 'Cycle ' + (c + 1) + ' of ' + cycles;
        if (!reduced) orb.style.transform = 'scale(' + (sc[0] + (sc[1] - sc[0]) * (running || elapsed > 0 ? ease : 0)) + ')';
        var key = c + ':' + i;
        if (running && key !== lastKey) { lastKey = key; cue(p.kind); }
        return false;
      }
      function frame() {
        raf = 0;
        if (!running) return;
        var elapsed = (performance.now() - t0) / 1000;
        if (paint(elapsed)) { finish(); return; }
        raf = requestAnimationFrame(frame);
      }
      function start() {
        refresh();
        if (!cycleLen) return;
        t0 = performance.now() - (pausedAt || 0) * 1000;
        running = true;
        startBtn.textContent = 'Pause';
        if (wake.input.checked && navigator.wakeLock && navigator.wakeLock.request && !lock) {
          navigator.wakeLock.request('screen').then(function (l) { if (running) lock = l; else l.release().catch(function () {}); }).catch(function () { /* not allowed here */ });
        }
        raf = requestAnimationFrame(frame);
      }
      function release() { if (lock) { lock.release().catch(function () {}); lock = null; } }
      function pause() {
        running = false;
        pausedAt = (performance.now() - t0) / 1000;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        startBtn.textContent = 'Resume';
        phaseEl.textContent = 'Paused';
        release();
      }
      function finish() { running = false; pausedAt = 0; lastKey = ''; startBtn.textContent = 'Start again'; release(); cue('out'); }
      function stop() {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0; pausedAt = 0; lastKey = '';
        startBtn.textContent = 'Start';
        release();
        if (navigator.vibrate) { try { navigator.vibrate(0); } catch (e) { /* ignore */ } }
        refresh();
        paint(0);
      }
      U.onTeardown(root, function () {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        release();
        if (navigator.vibrate) { try { navigator.vibrate(0); } catch (e) { /* ignore */ } }
        if (actx) { try { actx.close(); } catch (e) { /* ignore */ } actx = null; }
      });
      U.live([cin, chold, cout, chold2, mode, amount], function () { if (!running) { pausedAt = 0; refresh(); } });
      function key(e) {
        if (!root.isConnected || (e.target && /INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName))) return;
        if (e.code === 'Space') { e.preventDefault(); startBtn.click(); }
        else if (e.key === 'Escape' && stage.classList.contains('full')) fullBtn.click();
      }
      document.addEventListener('keydown', key);
      U.onTeardown(root, function () { document.removeEventListener('keydown', key); });

      root.appendChild(U.panel(null, pattern, about, custom, U.row(mode, amount), plan));
      root.appendChild(U.panel(null, stage, U.btnrow(startBtn, stopBtn, fullBtn), U.row(sound, buzz, wake),
        U.note('Space starts and pauses. Breathe gently; if you feel dizzy or light-headed, stop and breathe normally.')));
      refresh();
    }
  });
})();
