/* home-b tools: solar panel payback. Reuses home.js's styles (.g-home) and
   its Ofgem price cap (window.HomeKit) for the default electricity price, and
   finance.js's line chart (window.FinKit) for the savings curve when it is
   loaded. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  /* ---- Time-sensitive figures ----------------------------------------------
     Typical values to start from, not quotes: every one of them is editable
     in the tool. Check them again each spring, when installers reprice and
     export tariffs move. */
  var SOLAR = {
    asOf: '25/09/2026',
    /* kWh a year from each kWp of panels facing south at about 35°, by region
       (MCS and PVGIS figures, rounded). */
    regions: [
      { id: 'south', label: 'South of England', yield: 950 },
      { id: 'mid', label: 'Midlands and Wales', yield: 900 },
      { id: 'north', label: 'North of England', yield: 850 },
      { id: 'ni', label: 'Northern Ireland', yield: 820 },
      { id: 'scot', label: 'Scotland', yield: 800 }
    ],
    /* Share of the best case by roof pitch (rows) and direction (columns). */
    directions: ['S', 'SE/SW', 'E/W', 'NE/NW', 'N'],
    pitches: [
      { deg: 0, f: [0.87, 0.87, 0.87, 0.87, 0.87] },
      { deg: 15, f: [0.95, 0.93, 0.85, 0.76, 0.72] },
      { deg: 30, f: [1.00, 0.96, 0.82, 0.67, 0.60] },
      { deg: 45, f: [0.99, 0.93, 0.77, 0.58, 0.48] },
      { deg: 60, f: [0.93, 0.86, 0.70, 0.49, 0.38] }
    ],
    shading: [{ id: '1', label: 'None', f: 1 }, { id: '0.9', label: 'Light (a chimney, some trees)', f: 0.9 }, { id: '0.75', label: 'Moderate (part of the day)', f: 0.75 }, { id: '0.6', label: 'Heavy', f: 0.6 }],
    costPerKwp: 1500,        /* £ per kWp installed, 0% VAT on domestic installs until 31 March 2027 */
    batteryCost: 3500,       /* £ for about 5 kWh, installed */
    exportRate: 15,          /* p per kWh, a typical Smart Export Guarantee fixed tariff */
    selfUse: 35,             /* % of generation used in the home without a battery */
    selfUseBattery: 70,      /* % with a battery */
    degradation: 0.5,        /* % output lost each year */
    inverterCost: 1000,      /* £, one replacement during the panels' life */
    inverterYear: 12,
    source: 'https://www.energysavingtrust.org.uk/advice/solar-panels/'
  };

  var gbp0 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
  function money(n) { return isFinite(n) ? gbp0.format(n) : '—'; }
  function nf(n, d) { return isFinite(n) ? new Intl.NumberFormat('en-GB', { maximumFractionDigits: d === undefined ? 1 : d }).format(n) : '—'; }
  function val(w) {
    var s = String((w.input || w).value).trim().replace(/,/g, '');
    if (s === '') return NaN;
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }
  function num(label, value, attrs, after, before) {
    var input = el('input', Object.assign({ type: 'number', step: 'any', min: 0 }, attrs || {}));
    input.value = String(value);
    var inner = after || before ? el('div', { class: 'hm-prefix' }, before ? el('span', { text: before }) : null, input, after ? el('span', { text: after }) : null) : input;
    var wrap = U.field(label, inner);
    wrap.input = input;
    return wrap;
  }
  function card(label, value, key, hi) {
    return el('div', { class: 'hm-card' + (hi ? ' hi' : '') }, el('span', { text: label }), el('b', { text: value, dataset: key ? { k: key } : undefined }));
  }
  function grid() { return el('div', { class: 'hm-grid' }, Array.prototype.slice.call(arguments)); }
  function selVal(field) { return field.querySelector('select').value; }

  /* Year-by-year savings. o: { kwp, yield, cost, price (p), rise (%), exportRate (p),
     selfUse (%), degradation (%), years, inverterCost, inverterYear } */
  function solarModel(o) {
    var rows = [], cum = -o.cost, payback = null, totalGen = 0, totalSave = 0;
    for (var y = 1; y <= o.years; y++) {
      var gen = o.kwp * o.yield * Math.pow(1 - o.degradation / 100, y - 1);
      var price = o.price * Math.pow(1 + o.rise / 100, y - 1) / 100;
      var used = gen * o.selfUse / 100, sold = gen - used;
      var save = used * price + sold * o.exportRate / 100;
      var extra = y === o.inverterYear ? o.inverterCost : 0;
      var before = cum;
      cum += save - extra;
      if (payback === null && cum >= 0) payback = y - 1 + (save - extra > 0 ? -before / (save - extra) : 1);
      totalGen += gen; totalSave += save;
      rows.push({ year: y, gen: gen, used: used, sold: sold, save: save, extra: extra, cum: cum });
    }
    return { rows: rows, payback: payback, totalGen: totalGen, totalSave: totalSave, net: cum };
  }

  Tools.register({
    id: 'solar-payback', category: 'home', name: 'Solar Panel Payback Calculator',
    description: 'How much solar panels would generate and save each year, how long they take to pay for themselves and what they return over 25 years, with or without a battery.',
    keywords: ['solar panels', 'solar pv', 'payback', 'solar savings', 'is solar worth it', 'photovoltaic', 'kwp', 'seg', 'smart export guarantee', 'export tariff',
      'solar battery', 'home battery', 'roof', 'return on investment', 'electricity bill', 'renewable', 'feed in'],
    render: function (root) {
      root.classList.add('g-home');
      var K = window.FinKit;
      if (K) K.prep(root);
      var cap = window.HomeKit ? HomeKit.priceCap() : null;

      var kwp = num('System size', 4, { min: 0.5, max: 50, step: 0.1 }, 'kWp');
      var cost = num('Installed cost', 4 * SOLAR.costPerKwp, { step: 100 }, null, '£');
      var region = U.select({ label: 'Where you live', value: 'mid', options: SOLAR.regions.map(function (r) { return { value: r.id, label: r.label + ' (' + r.yield + ' kWh/kWp)' }; }) });
      var direction = U.select({ label: 'Roof faces', value: '0', options: SOLAR.directions.map(function (d, i) { return { value: String(i), label: d }; }) });
      var pitch = U.select({ label: 'Roof pitch', value: '30', options: SOLAR.pitches.map(function (p) { return { value: String(p.deg), label: p.deg === 0 ? 'Flat' : p.deg + '°' }; }) });
      var shade = U.select({ label: 'Shading', value: '1', options: SOLAR.shading.map(function (s) { return { value: s.id, label: s.label }; }) });
      var customYield = num('Or your installer’s estimate (optional)', '', { step: 10 }, 'kWh a year');
      var price = num('Electricity price', cap ? cap.unit : 26, { step: 0.01 }, 'p/kWh');
      var rise = num('Electricity price rise each year', 3, { min: -10, max: 30, step: 0.1 }, '%');
      var exportRate = num('Export tariff (SEG)', SOLAR.exportRate, { step: 0.1 }, 'p/kWh');
      var selfUse = num('Share you use yourself', SOLAR.selfUse, { max: 100, step: 1 }, '%');
      var battery = U.checkbox('Add a home battery');
      var batteryCost = num('Battery cost', SOLAR.batteryCost, { step: 100 }, null, '£');
      var selfUseBat = num('Share you use yourself with the battery', SOLAR.selfUseBattery, { max: 100, step: 1 }, '%');
      var batBox = el('div', null, U.row(batteryCost, selfUseBat));
      var degradation = num('Output lost each year', SOLAR.degradation, { max: 5, step: 0.1 }, '%');
      var inverter = num('Inverter replacement', SOLAR.inverterCost, { step: 50 }, 'in year ' + SOLAR.inverterYear, '£');
      var years = num('Years to look ahead', 25, { min: 5, max: 40, step: 1 });

      var board = el('div'), tableBox = el('div'), factorBox = el('div');
      var chart = K ? K.lineChart(root) : null;
      /* Keep the cost in step with the size until the cost is edited by hand. */
      var costTouched = false;
      cost.input.addEventListener('input', function () { costTouched = true; });
      kwp.input.addEventListener('input', function () { if (!costTouched && val(kwp) > 0) cost.input.value = String(Math.round(val(kwp) * SOLAR.costPerKwp / 100) * 100); });

      function run() {
        var reg = SOLAR.regions.filter(function (r) { return r.id === selVal(region); })[0];
        var dir = +selVal(direction), pr = SOLAR.pitches.filter(function (p) { return String(p.deg) === selVal(pitch); })[0];
        var sh = +selVal(shade), orient = pr.f[dir];
        var perKwp = reg.yield * orient * sh;
        var size = val(kwp), own = val(customYield);
        var yearly = own > 0 ? own : size * perKwp;
        var bat = battery.input.checked;
        batBox.hidden = !bat;
        var total = (val(cost) || 0) + (bat ? (val(batteryCost) || 0) : 0);
        var o = {
          kwp: size, yield: size > 0 ? yearly / size : 0, cost: total, price: val(price), rise: val(rise) || 0, exportRate: val(exportRate) || 0,
          selfUse: Math.min(100, Math.max(0, bat ? val(selfUseBat) : val(selfUse))), degradation: val(degradation) || 0,
          years: Math.min(40, Math.max(5, Math.round(val(years) || 25))), inverterCost: val(inverter) || 0, inverterYear: SOLAR.inverterYear
        };
        factorBox.replaceChildren(U.note(own > 0 ? 'Using your installer’s estimate of ' + nf(own, 0) + ' kWh a year.'
          : reg.label + ': ' + reg.yield + ' kWh per kWp facing south × ' + Math.round(orient * 100) + '% for ' + SOLAR.directions[dir] + (pr.deg ? ' at ' + pr.deg + '°' : ', flat') + (sh < 1 ? ' × ' + Math.round(sh * 100) + '% for shading' : '') + ' = ' + nf(perKwp, 0) + ' kWh per kWp a year.'));
        if (!(size > 0) || !(o.price >= 0) || !(total >= 0)) { board.replaceChildren(U.note('Enter the system size, its cost and your electricity price', 'err')); tableBox.replaceChildren(); if (chart) chart.update({}); return; }
        var r = solarModel(o), first = r.rows[0];
        board.replaceChildren(
          el('div', { class: 'hm-big', dataset: { k: 'payback' }, text: r.payback === null ? 'Not within ' + o.years + ' years' : nf(r.payback, 1) + ' years' }),
          el('div', { class: 'hm-muted', text: 'to pay back ' + money(total) + (r.payback === null ? '' : ', about ' + (new Date().getFullYear() + Math.ceil(r.payback))) }),
          grid(card('Generated in year one', nf(first.gen, 0) + ' kWh', 'gen'),
            card('Saved in year one', money(first.save), 'save1', true),
            card('A month in year one', money(first.save / 12), 'month1'),
            card('Saving over ' + o.years + ' years', money(r.totalSave), 'total'),
            card('Net gain over ' + o.years + ' years', money(r.net), 'net'),
            card('Return on the cost', total > 0 ? nf(r.net / total * 100, 0) + '%' : '—', 'roi')),
          U.note('Year one: you use ' + nf(first.used, 0) + ' kWh yourself (' + money(first.used * o.price / 100) + ' off your bill) and export ' + nf(first.sold, 0) + ' kWh (' + money(first.sold * o.exportRate / 100) + ').'));
        tableBox.replaceChildren(el('div', { class: 'hm-scroll' }, U.table(['Year', 'Generated', 'Used at home', 'Exported', 'Saved', 'Running total'], r.rows.map(function (q) {
          return [q.year, nf(q.gen, 0) + ' kWh', nf(q.used, 0) + ' kWh', nf(q.sold, 0) + ' kWh', money(q.save) + (q.extra ? ' − ' + money(q.extra) + ' inverter' : ''), money(q.cum)];
        }))));
        if (chart) {
          chart.update({
            label: 'Running total of savings less the cost, by year',
            x: [0].concat(r.rows.map(function (q) { return q.year; })), xInteger: true,
            xFormat: function (v) { return v % 1 ? '' : 'Yr ' + v; }, tipTitle: function (v) { return 'After ' + v + (v === 1 ? ' year' : ' years'); },
            series: [{ name: 'Running total', slot: 3, values: [-total].concat(r.rows.map(function (q) { return q.cum; })) }],
            markers: r.payback === null ? [] : [{ x: r.payback, y: 0, label: 'Paid back' }]
          });
        }
      }

      U.live([kwp, cost, region, direction, pitch, shade, customYield, price, rise, exportRate, selfUse, battery, batteryCost, selfUseBat, degradation, inverter, years], run);
      root.appendChild(U.panel('Your system', U.row(kwp, cost), U.row(region, direction, pitch, shade), customYield, factorBox));
      root.appendChild(U.panel('Energy and prices', U.row(price, rise), U.row(exportRate, selfUse), battery, batBox,
        U.note(cap ? 'The electricity price starts at the Ofgem price cap unit rate for ' + cap.period + ' (' + cap.unit + 'p/kWh).' : 'Use the unit rate from your bill.')));
      root.appendChild(U.panel('Assumptions', U.row(degradation, inverter, years),
        el('p', { class: 'hm-src' }, 'Typical figures as of ' + SOLAR.asOf + ': about ' + money(SOLAR.costPerKwp) + ' per kWp installed (0% VAT on home installs until 31 March 2027), ' + SOLAR.exportRate + 'p/kWh export, ' + SOLAR.selfUse + '% used at home without a battery. Get quotes for real prices. ',
          el('a', { href: SOLAR.source, target: '_blank', rel: 'noopener noreferrer', text: 'Energy Saving Trust guide' }))));
      root.appendChild(U.panel(null, board));
      if (chart) root.appendChild(U.panel('Running total', chart));
      root.appendChild(U.panel('Year by year', tableBox));
    }
  });
})();
