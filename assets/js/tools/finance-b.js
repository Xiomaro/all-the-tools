/* finance-b tools: stamp duty (SDLT, LBTT and LTT), credit card payoff, debt
   snowball and avalanche, a 50/30/20 budget, pension pot, break-even, rent vs
   buy, salary conversion and fuel/EV journey costs. UK-first, in pounds.
   Builds on the helpers and charts finance.js exports as window.FinKit. */
(function () {
  'use strict';
  var U = window.UI, el = U.el, K = window.FinKit;
  if (!K) return;

  var money0 = K.money0, money2 = K.money2, pct = K.pct, numIn = K.numIn, card = K.card, grid = K.grid,
    tabs = K.tabs, val = K.val, selVal = K.selVal, yearsMonths = K.yearsMonths, scrollTable = K.scrollTable, source = K.source;

  if (!document.getElementById('g-finb-style')) {
    document.head.appendChild(el('style', { id: 'g-finb-style', text: [
      '.g-finb .fb-list{display:flex;flex-direction:column;gap:8px}',
      '.g-finb .fb-line{display:grid;grid-template-columns:minmax(0,2fr) repeat(3,minmax(0,1fr)) auto;gap:8px;align-items:end;padding-bottom:8px;border-bottom:1px solid var(--border)}',
      '.g-finb .fb-line.b2{grid-template-columns:minmax(0,2fr) minmax(0,1fr) auto}',
      '.g-finb .fb-line .btnrow{gap:2px}',
      '.g-finb .fb-line .btn{padding:8px 10px}',
      '@media (max-width:620px){.g-finb .fb-line{grid-template-columns:1fr 1fr}.g-finb .fb-line>.field:first-child{grid-column:1/-1}}',
      '.g-finb .fb-good{color:var(--ok);font-weight:600}',
      '.g-finb .fb-bad{color:var(--err);font-weight:600}',
      '.g-finb .fb-sub{display:block;font-size:12px;color:var(--fg-muted);font-weight:400}',
      '.g-finb .fb-groups{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}',
      '.g-finb .fb-group h4{margin:0 0 8px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}',
      '.g-finb .fb-side{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}',
      '.g-finb .fb-side>div{border:1px solid var(--border);border-radius:var(--radius);padding:12px;min-width:0}',
      '.g-finb .fb-side h4{margin:0 0 8px}',
      '.g-finb .fb-inline{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}',
      '.g-finb .fb-inline>.field{flex:1 1 150px}',
      '.g-finb details.fb-rates summary{cursor:pointer;font-weight:600;margin-bottom:6px}'
    ].join('\n') }));
  }

  function prep(root, regional) { K.prep(root, regional); root.classList.add('g-finb'); }
  /* UK APRs are effective annual rates, so the monthly rate is the twelfth
     root rather than a twelfth. */
  function monthlyRate(apr) { return Math.pow(1 + apr / 100, 1 / 12) - 1; }
  function monthLabel(offset) {
    var d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + offset);
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }
  function csvDownload(label, file, producer) { return U.downloadBtn(label, file, function () { var rows = producer(); return rows ? CSV.stringify(rows) : ''; }, 'text/csv'); }
  function fixed2(n) { return (Math.round(n * 100) / 100).toFixed(2); }

  /* ---- Time-sensitive UK figures -------------------------------------------
     Each constant names its source and the date it was last checked. They
     change at Budgets (the next UK Budget is on 28 October 2026), so check
     them again after each one. */

  /* Residential property purchase taxes. Bands are [upper limit, rate %]. */
  var PROPERTY_TAX_RATES = {
    asOf: '22/09/2026',
    sdlt: {
      name: 'Stamp Duty Land Tax (England and Northern Ireland)',
      since: 'Rates from 1 April 2025; the higher rates surcharge is 5% (since 31 October 2024) and the non-UK resident surcharge 2% (since 1 April 2021).',
      standard: [[125000, 0], [250000, 2], [925000, 5], [1500000, 10], [Infinity, 12]],
      firstTime: [[300000, 0], [500000, 5]],
      firstTimeMax: 500000,
      additional: 5,
      nonResident: 2,
      source: 'https://www.gov.uk/stamp-duty-land-tax/residential-property-rates'
    },
    lbtt: {
      name: 'Land and Buildings Transaction Tax (Scotland)',
      since: 'Rates unchanged for 2026/27. First-time buyer relief raises the nil-rate band to £175,000 (worth up to £600). The Additional Dwelling Supplement is 8% of the whole price (since 5 December 2024).',
      standard: [[145000, 0], [250000, 2], [325000, 5], [750000, 10], [Infinity, 12]],
      firstTime: [[175000, 0], [250000, 2], [325000, 5], [750000, 10], [Infinity, 12]],
      ads: 8,
      source: 'https://revenue.scot/taxes/land-buildings-transaction-tax/residential-property'
    },
    ltt: {
      name: 'Land Transaction Tax (Wales)',
      since: 'Main rates from 10 October 2022, higher rates from 11 December 2024, both unchanged for 2026/27. Wales has no first-time buyer relief.',
      standard: [[225000, 0], [400000, 6], [750000, 7.5], [1500000, 10], [Infinity, 12]],
      higher: [[180000, 5], [250000, 8.5], [400000, 10], [750000, 12.5], [1500000, 15], [Infinity, 17]],
      source: 'https://www.gov.wales/land-transaction-tax-rates-and-bands'
    },
    /* Second-home surcharges only apply from this price. */
    surchargeFrom: 40000
  };

  /* Full new State Pension for 2026/27 (from 6 April 2026), and the most
     tax-free cash anyone can take from their pensions (since 6 April 2024). */
  var STATE_PENSION = {
    weekly: 241.30, taxYear: '2026/27', asOf: '22/09/2026', fullYears: 35, minYears: 10,
    source: 'https://www.gov.uk/new-state-pension/what-youll-get'
  };
  var LUMP_SUM_ALLOWANCE = { amount: 268275, source: 'https://www.gov.uk/tax-on-pension/tax-free' };

  /* National Minimum Wage and National Living Wage from 1 April 2026. */
  var MINIMUM_WAGE = {
    from: '01/04/2026', asOf: '22/09/2026',
    rates: [
      { id: '21', label: '21 and over (National Living Wage)', rate: 12.71 },
      { id: '18', label: '18 to 20', rate: 10.85 },
      { id: '16', label: 'Under 18', rate: 8.00 },
      { id: 'app', label: 'Apprentice (under 19, or in the first year)', rate: 8.00 }
    ],
    source: 'https://www.gov.uk/national-minimum-wage-rates'
  };
  var STATUTORY_HOLIDAY_WEEKS = 5.6;

  /* ======================================================================= */
  /* Stamp Duty, LBTT & LTT Calculator                                       */
  /* ======================================================================= */
  function sliceBands(price, bands, add) {
    var lower = 0, rows = [], total = 0;
    for (var i = 0; i < bands.length && price > lower; i++) {
      var upper = bands[i][0], rate = bands[i][1] + (add || 0);
      var amount = Math.min(price, upper) - lower;
      rows.push({ from: lower, to: upper, rate: rate, amount: amount, tax: amount * rate / 100 });
      total += amount * rate / 100;
      lower = upper;
    }
    return { rows: rows, total: total };
  }
  /* nation: sdlt | lbtt | ltt; buyer: home | first | additional. Tax is
     rounded down to the pound, as all three authorities do. */
  function propertyTax(price, nation, buyer, nonResident) {
    var R = PROPERTY_TAX_RATES[nation], bands = R.standard, add = 0, extra = null, notes = [];
    var surcharge = buyer === 'additional' && price >= PROPERTY_TAX_RATES.surchargeFrom;
    if (nation === 'sdlt') {
      if (buyer === 'first') {
        if (price <= R.firstTimeMax) bands = R.firstTime;
        else notes.push('First-time buyer relief stops above ' + money0(R.firstTimeMax) + ', so the standard rates apply to the whole price.');
      }
      if (surcharge) add += R.additional;
      if (nonResident) add += R.nonResident;
    } else if (nation === 'lbtt') {
      if (buyer === 'first') bands = R.firstTime;
      if (surcharge) extra = { label: 'Additional Dwelling Supplement: ' + R.ads + '% of ' + money0(price), tax: price * R.ads / 100 };
    } else {
      if (surcharge) bands = R.higher;
      if (buyer === 'first') notes.push('Wales has no separate first-time buyer relief: the main rates apply, with nothing to pay up to £225,000.');
    }
    if (buyer === 'additional' && !surcharge && price > 0) notes.push('Second-home surcharges do not apply below ' + money0(PROPERTY_TAX_RATES.surchargeFrom) + '.');
    var res = sliceBands(price, bands, add);
    var exact = res.total + (extra ? extra.tax : 0);
    return { rows: res.rows, extra: extra, total: Math.floor(exact + 1e-9), notes: notes };
  }
  function bandLabel(row) {
    if (row.from === 0) return 'Up to ' + money0(row.to);
    if (row.to === Infinity) return 'Over ' + money0(row.from);
    return money0(row.from + 1) + ' to ' + money0(row.to);
  }
  function rateTable(bands, add) {
    return scrollTable(['Portion of the price', 'Rate'], bands.map(function (b, i) {
      return [bandLabel({ from: i ? bands[i - 1][0] : 0, to: b[0] }), (b[1] + (add || 0)) + '%'];
    }));
  }

  Tools.register({
    id: 'stamp-duty', category: 'finance', name: 'Stamp Duty, LBTT & LTT Calculator',
    description: 'Tax on buying a home in England and Northern Ireland (SDLT), Scotland (LBTT) or Wales (LTT), with first-time buyer relief, second-home and non-resident surcharges, and a band-by-band breakdown.',
    keywords: ['stamp duty', 'sdlt', 'lbtt', 'ltt', 'land transaction tax', 'land and buildings transaction tax', 'property tax', 'house purchase', 'buying a house', 'first time buyer', 'second home', 'buy to let', 'additional dwelling supplement', 'ads', 'higher rates', 'surcharge', 'non-resident', 'scotland', 'wales', 'england', 'northern ireland', 'conveyancing'],
    render: function (root) {
      prep(root);
      var price = numIn('Property price', 300000, { min: 0, step: 1000 }, { before: '£' });
      var nation = tabs([{ value: 'sdlt', label: 'England & NI (SDLT)' }, { value: 'lbtt', label: 'Scotland (LBTT)' }, { value: 'ltt', label: 'Wales (LTT)' }], function () { run(); }, 'sdlt');
      var buyer = U.select({ label: 'Who is buying', value: 'home', options: [
        { value: 'home', label: 'Moving home, or buying your only home' },
        { value: 'first', label: 'First-time buyer' },
        { value: 'additional', label: 'Additional property (second home, buy-to-let)' }] });
      var nonRes = U.checkbox('Buyer is not UK resident (adds 2%)');
      var big = el('div', { class: 'fn-big', dataset: { k: 'tax' } });
      var sub = el('div', { class: 'fn-muted', dataset: { k: 'eff' } });
      var breakdown = el('div'), notes = el('div'), compare = el('div'), rates = el('div');
      var names = { sdlt: 'England & NI', lbtt: 'Scotland', ltt: 'Wales' };
      var taxNames = { sdlt: 'Stamp Duty Land Tax', lbtt: 'Land and Buildings Transaction Tax', ltt: 'Land Transaction Tax' };
      function run() {
        var p = val(price), n = nation.value, b = selVal(buyer);
        nonRes.hidden = n !== 'sdlt';
        var nr = n === 'sdlt' && nonRes.input.checked;
        if (!(p >= 0)) { big.textContent = '—'; sub.textContent = 'Enter the price'; breakdown.replaceChildren(); return; }
        var r = propertyTax(p, n, b, nr);
        big.textContent = money0(r.total);
        sub.textContent = taxNames[n] + (p > 0 ? ': ' + pct(r.total / p * 100, 2) + ' of the price' : '');
        var rows = r.rows.filter(function (q) { return q.amount > 0; }).map(function (q) {
          return [bandLabel(q), q.rate + '%', money0(q.amount), money2(q.tax)];
        });
        if (r.extra) rows.push([r.extra.label, PROPERTY_TAX_RATES.lbtt.ads + '%', money0(p), money2(r.extra.tax)]);
        rows.push([el('b', { text: 'Total (rounded down to the pound)' }), '', '', el('b', { text: money0(r.total), dataset: { k: 'total' } })]);
        breakdown.replaceChildren(scrollTable(['Portion of the price', 'Rate', 'Amount taxed', 'Tax'], rows));
        notes.replaceChildren.apply(notes, r.notes.map(function (t) { return U.note(t); }));
        /* the same price everywhere, for every kind of buyer */
        compare.replaceChildren(scrollTable(['At ' + money0(p), 'Moving home', 'First-time buyer', 'Additional property'], ['sdlt', 'lbtt', 'ltt'].map(function (code) {
          return [names[code]].concat(['home', 'first', 'additional'].map(function (kind) {
            return el('span', { class: 'mono', text: money0(propertyTax(p, code, kind, false).total), dataset: { k: 'cmp-' + code + '-' + kind } });
          }));
        })));
        var R = PROPERTY_TAX_RATES[n];
        var parts = [el('h4', { text: R.name }), el('p', { class: 'fn-muted', text: R.since }), el('b', { text: 'Main rates' }), rateTable(R.standard)];
        if (n === 'sdlt') parts.push(el('b', { text: 'First-time buyers (price up to £500,000)' }), rateTable(R.firstTime), el('b', { text: 'Additional properties' }), rateTable(R.standard, R.additional));
        if (n === 'lbtt') parts.push(el('b', { text: 'First-time buyers' }), rateTable(R.firstTime));
        if (n === 'ltt') parts.push(el('b', { text: 'Higher rates (additional properties)' }), rateTable(R.higher));
        parts.push(source('Rates as of ' + PROPERTY_TAX_RATES.asOf + '. Source:', R.source));
        rates.replaceChildren.apply(rates, parts);
      }
      U.live([price, buyer, nonRes], run);
      root.appendChild(U.panel(null, nation, U.row(price, buyer), nonRes));
      root.appendChild(U.panel('Tax to pay', big, sub, breakdown, notes,
        U.note('Residential purchases only. Reliefs such as multiple dwellings relief, shared ownership and the rules for companies are not covered; your solicitor or conveyancer will confirm the figure.')));
      root.appendChild(U.panel('Same price across the UK', compare));
      root.appendChild(U.panel('Current rates', rates));
    }
  });

  /* ======================================================================= */
  /* Credit Card Payoff Calculator                                           */
  /* ======================================================================= */
  /* Month-by-month: interest is added, then the payment the rule asks for
     (never more than what is owed). Stops if a payment cannot even cover the
     interest, because the balance would never clear. */
  function payoff(balance, r, rule, cap) {
    var bal = balance, rows = [], interest = 0, m = 0;
    cap = cap || 1200;
    while (bal > 0.005 && m < cap) {
      m++;
      var it = bal * r;
      var pay = Math.min(rule(bal, it, m), bal + it);
      if (!(pay > it + 1e-9) && pay < bal + it) return { never: true, rows: rows, months: m, interest: interest, first: pay };
      bal = bal + it - pay;
      interest += it;
      rows.push({ month: m, payment: pay, interest: it, balance: bal > 0.005 ? bal : 0 });
    }
    return { never: bal > 0.005, rows: rows, months: m, interest: interest, paid: balance + interest, first: rows.length ? rows[0].payment : 0 };
  }
  function levelPayment(balance, r, months) { return r === 0 ? balance / months : balance * r / (1 - Math.pow(1 + r, -months)); }

  Tools.register({
    id: 'credit-card-payoff', category: 'finance', name: 'Credit Card Payoff Calculator',
    description: 'How long a credit card balance takes to clear and what it costs if you pay the minimum, a fixed amount, or enough to clear it by a target date, side by side.',
    keywords: ['credit card', 'payoff', 'pay off', 'minimum payment', 'minimum repayment', 'apr', 'debt', 'card interest', 'balance', 'repayment', 'how long to pay off', 'clear my card'],
    render: function (root) {
      prep(root, true);
      var balance = numIn('Balance', 3000, { min: 0, step: 50 }, { before: K.sym() });
      var apr = numIn('APR', 24.9, { min: 0, step: 0.1 }, { after: '%' });
      var minPct = numIn('Minimum payment: % of balance', 1, { min: 0, step: 0.25 }, { after: '%' });
      var minInt = U.checkbox('plus that month’s interest', { checked: true });
      var minFloor = numIn('or at least', 25, { min: 0 }, { before: K.sym() });
      var fixedPay = numIn('Fixed payment each month', 150, { min: 0, step: 5 }, { before: K.sym() });
      var months = numIn('Clear it in (months)', 24, { min: 1, max: 600, step: 1 });
      var table = el('div'), notes = el('div'), sched = el('div');
      var chart = K.lineChart(root);
      var which = tabs([{ value: 'min', label: 'Minimum payments' }, { value: 'fixed', label: 'Fixed payment' }, { value: 'target', label: 'Target date' }], function () { draw(); }, 'target');
      var plans = [];
      function run() {
        var B = val(balance), A = val(apr), mp = val(minPct) || 0, mf = val(minFloor) || 0, F = val(fixedPay), T = Math.round(val(months));
        if (!(B > 0) || !(A >= 0)) { table.replaceChildren(U.note('Enter a balance and an APR', 'err')); plans = []; draw(); return; }
        var r = monthlyRate(A), withInt = minInt.input.checked;
        var tPay = T >= 1 ? levelPayment(B, r, T) : NaN;
        plans = [
          { key: 'min', slot: 1, name: 'Minimum payments', res: payoff(B, r, function (bal, it) { return Math.max(mf, bal * mp / 100 + (withInt ? it : 0)); }) },
          { key: 'fixed', slot: 2, name: 'Fixed ' + money0(F) + ' a month', res: F > 0 ? payoff(B, r, function () { return F; }) : null },
          { key: 'target', slot: 3, name: 'Clear in ' + T + ' months', res: isFinite(tPay) ? payoff(B, r, function () { return tPay; }) : null }
        ];
        table.replaceChildren(scrollTable(['Plan', 'First payment', 'Time to clear', 'Total interest', 'Total paid'], plans.map(function (p) {
          var res = p.res;
          if (!res) return [p.name, '—', '—', '—', '—'];
          if (res.never) return [p.name, el('span', { class: 'mono', text: money2(res.first), dataset: { k: p.key + '-first' } }), el('span', { class: 'fb-bad', text: 'Never: the payment does not cover the interest', dataset: { k: p.key + '-months' } }), '—', '—'];
          return [p.name, el('span', { class: 'mono', text: money2(res.first), dataset: { k: p.key + '-first' } }),
            el('span', null, el('b', { text: res.months + ' months', dataset: { k: p.key + '-months' } }), el('span', { class: 'fb-sub', text: yearsMonths(res.months) })),
            el('span', { class: 'mono', text: money2(res.interest), dataset: { k: p.key + '-interest' } }),
            el('span', { class: 'mono', text: money2(res.paid), dataset: { k: p.key + '-paid' } })];
        })));
        var mins = plans[0].res, tgt = plans[2].res;
        var msgs = [];
        if (mins && !mins.never && tgt && !tgt.never && mins.interest > tgt.interest) msgs.push(U.note('Paying ' + money2(tPay) + ' a month instead of the minimum saves ' + money0(mins.interest - tgt.interest) + ' in interest and ' + yearsMonths(mins.months - tgt.months) + '.', 'ok'));
        notes.replaceChildren.apply(notes, msgs);
        draw();
      }
      function draw() {
        var ok = plans.filter(function (p) { return p.res && p.res.rows.length; });
        if (!ok.length) { chart.update(null); sched.replaceChildren(); return; }
        var B = val(balance), longest = Math.min(600, Math.max.apply(null, ok.map(function (p) { return p.res.rows.length; })));
        var xs = [];
        for (var i = 0; i <= longest; i++) xs.push(i / 12);
        chart.update({
          label: 'Balance over time for each plan', x: xs,
          xFormat: function (v) { return 'Yr ' + Math.round(v); }, tipTitle: function (v) { var m = Math.round(v * 12); return 'Month ' + m + (m >= 12 ? ' (' + yearsMonths(m) + ')' : ''); },
          tipFormat: money2,
          series: ok.map(function (p) {
            return { name: p.name, slot: p.slot, values: xs.map(function (x, i) { return i === 0 ? B : i <= p.res.rows.length ? p.res.rows[i - 1].balance : (p.res.never ? NaN : 0); }) };
          })
        });
        var pick = plans.filter(function (p) { return p.key === which.value; })[0];
        if (!pick || !pick.res) { sched.replaceChildren(U.note('Nothing to show for this plan.')); return; }
        sched.replaceChildren(scrollTable(['Month', 'Payment', 'Interest', 'Balance'], pick.res.rows.map(function (q) {
          return [q.month, money2(q.payment), money2(q.interest), money2(q.balance)];
        }), true));
      }
      U.live([balance, apr, minPct, minInt, minFloor, fixedPay, months], run);
      root.appendChild(U.panel(null, U.row(balance, apr), el('div', { class: 'fb-inline' }, minPct, minInt, minFloor), U.row(fixedPay, months),
        U.note('Check your statement for your card’s minimum payment rule: many use 1% of the balance plus interest, with a floor of ' + money0(5) + ' to ' + money0(25) + '.')));
      root.appendChild(U.panel('Plans side by side', table, notes));
      root.appendChild(U.panel('Balance over time', chart));
      root.appendChild(U.panel('Month by month', which, sched, U.btnrow(csvDownload('Download this plan (CSV)', 'credit-card-plan.csv', function () {
        var pick = plans.filter(function (p) { return p.key === which.value; })[0];
        return pick && pick.res ? [['Month', 'Payment', 'Interest', 'Balance']].concat(pick.res.rows.map(function (q) { return [q.month, fixed2(q.payment), fixed2(q.interest), fixed2(q.balance)]; })) : null;
      })), U.note('Interest is worked out monthly from the APR (the monthly rate is (1 + APR)^(1/12) − 1); card providers charge daily, so real statements differ a little. New spending, fees and 0% offers are not included.')));
    }
  });

  /* ======================================================================= */
  /* Debt Snowball & Avalanche Planner                                        */
  /* ======================================================================= */
  /* Every month: interest is added to each debt, every debt gets its minimum,
     and whatever is left of the budget (the extra plus the minimums of debts
     already cleared) goes to the first unpaid debt in priority order. */
  function planDebts(debts, extra, order) {
    var bal = debts.map(function (d) { return d.balance; }), rates = debts.map(function (d) { return monthlyRate(d.apr); });
    var budget = debts.reduce(function (s, d) { return s + d.min; }, 0) + extra;
    var cleared = debts.map(function () { return 0; }), interest = debts.map(function () { return 0; });
    var rows = [], month = 0, before = Infinity;
    while (bal.some(function (b) { return b > 0.005; }) && month < 1200) {
      month++;
      var pays = debts.map(function () { return 0; }), left = budget;
      bal = bal.map(function (b, i) { var it = b > 0.005 ? b * rates[i] : 0; interest[i] += it; return b + it; });
      debts.forEach(function (d, i) {
        if (bal[i] <= 0.005) return;
        var p = Math.min(d.min, bal[i], left);
        pays[i] += p; bal[i] -= p; left -= p;
      });
      order.forEach(function (i) {
        if (left <= 0.005 || bal[i] <= 0.005) return;
        var p = Math.min(left, bal[i]);
        pays[i] += p; bal[i] -= p; left -= p;
      });
      bal = bal.map(function (b, i) { if (b <= 0.005) { if (!cleared[i]) cleared[i] = month; return 0; } return b; });
      var total = bal.reduce(function (s, b) { return s + b; }, 0);
      rows.push({ month: month, pays: pays, bal: bal.slice(), total: total });
      /* A budget that cannot keep up with the interest never finishes. */
      if (month % 12 === 0) { if (total >= before - 0.005) break; before = total; }
    }
    var done = bal.every(function (b) { return b <= 0.005; });
    return { rows: rows, months: done ? month : Infinity, cleared: cleared, interest: interest, totalInterest: interest.reduce(function (s, v) { return s + v; }, 0), done: done, budget: budget };
  }
  function strategyOrder(debts, strategy) {
    var idx = debts.map(function (d, i) { return i; });
    if (strategy === 'snowball') idx.sort(function (a, b) { return debts[a].balance - debts[b].balance || debts[b].apr - debts[a].apr || a - b; });
    else if (strategy === 'avalanche') idx.sort(function (a, b) { return debts[b].apr - debts[a].apr || debts[a].balance - debts[b].balance || a - b; });
    return idx;
  }

  Tools.register({
    id: 'debt-payoff', category: 'finance', name: 'Debt Snowball & Avalanche Planner',
    description: 'Plan paying off several debts with an extra monthly amount: smallest balance first (snowball), highest interest first (avalanche) or your own order, with payoff dates, total interest and a timeline.',
    keywords: ['debt', 'snowball', 'avalanche', 'debt free', 'pay off debt', 'credit cards', 'loans', 'overdraft', 'payoff plan', 'debt payoff', 'repayment plan', 'interest', 'budget'],
    render: function (root) {
      prep(root, true);
      var list = el('div', { class: 'fb-list' });
      var lines = [];
      var extra = numIn('Extra each month, on top of the minimums', 150, { min: 0, step: 10 }, { before: K.sym() });
      var strategy = tabs([{ value: 'avalanche', label: 'Avalanche (highest rate first)' }, { value: 'snowball', label: 'Snowball (smallest balance first)' }, { value: 'custom', label: 'My order (as listed)' }], function () { run(); }, 'avalanche');
      var summary = el('div'), perDebt = el('div'), compare = el('div');
      var chart = K.lineChart(root), bars = K.barChart();
      var last = null;
      function addLine(d) {
        var name = el('input', { type: 'text', value: d.name, 'aria-label': 'Debt name' });
        var bal = el('input', { type: 'number', min: 0, step: 'any', value: d.balance, 'aria-label': 'Balance' });
        var apr = el('input', { type: 'number', min: 0, step: 'any', value: d.apr, 'aria-label': 'APR' });
        var min = el('input', { type: 'number', min: 0, step: 'any', value: d.min, 'aria-label': 'Minimum payment' });
        var line = { name: name, bal: bal, apr: apr, min: min };
        line.box = el('div', { class: 'fb-line' }, U.field('Debt', name), U.field('Balance (' + K.sym() + ')', bal), U.field('APR (%)', apr), U.field('Minimum (' + K.sym() + '/month)', min),
          U.btnrow(
            U.button('↑', function () { move(line, -1); }, 'ghost'),
            U.button('↓', function () { move(line, 1); }, 'ghost'),
            U.button('Remove', function () { lines.splice(lines.indexOf(line), 1); line.box.remove(); run(); }, 'ghost')));
        line.box.querySelectorAll('.btnrow .btn')[0].setAttribute('aria-label', 'Move up');
        line.box.querySelectorAll('.btnrow .btn')[1].setAttribute('aria-label', 'Move down');
        [name, bal, apr, min].forEach(function (i) { i.addEventListener('input', U.debounce(run, 150)); });
        lines.push(line);
        list.appendChild(line.box);
      }
      function move(line, dir) {
        var i = lines.indexOf(line), j = i + dir;
        if (j < 0 || j >= lines.length) return;
        lines.splice(i, 1);
        lines.splice(j, 0, line);
        list.replaceChildren.apply(list, lines.map(function (l) { return l.box; }));
        run();
      }
      function debts() {
        return lines.map(function (l, i) {
          return { name: l.name.value.trim() || 'Debt ' + (i + 1), balance: parseFloat(l.bal.value), apr: parseFloat(l.apr.value) || 0, min: parseFloat(l.min.value) || 0 };
        }).filter(function (d) { return d.balance > 0; });
      }
      function run() {
        var ds = debts(), x = val(extra) || 0;
        if (!ds.length) { summary.replaceChildren(U.note('Add at least one debt with a balance', 'err')); perDebt.replaceChildren(); compare.replaceChildren(); chart.update(null); bars.update({ categories: [], series: [] }); last = null; return; }
        var results = {};
        ['avalanche', 'snowball', 'custom'].forEach(function (s) { results[s] = planDebts(ds, x, strategyOrder(ds, s)); });
        var res = results[strategy.value];
        last = { ds: ds, res: res };
        if (!res.done) {
          summary.replaceChildren(U.note('At ' + money0(res.budget) + ' a month these debts never clear: the payments do not keep up with the interest. Raise the extra amount or the minimums.', 'err'));
        } else {
          summary.replaceChildren(grid(
            card('Debt-free in', res.months + ' months', 'months', true),
            card('Debt-free by', monthLabel(res.months), 'date'),
            card('Total interest', money2(res.totalInterest), 'interest'),
            card('Monthly budget', money0(res.budget), 'budget')));
        }
        perDebt.replaceChildren(scrollTable(['Debt', 'Balance', 'APR', 'Cleared in', 'Interest paid'], ds.map(function (d, i) {
          return [d.name, money2(d.balance), d.apr + '%', res.cleared[i] ? el('span', null, el('b', { text: 'Month ' + res.cleared[i], dataset: { k: 'cleared' + i } }), el('span', { class: 'fb-sub', text: monthLabel(res.cleared[i]) })) : 'Not cleared',
            el('span', { class: 'mono', text: money2(res.interest[i]), dataset: { k: 'int' + i } })];
        })));
        var labels = { avalanche: 'Avalanche', snowball: 'Snowball', custom: 'My order' };
        compare.replaceChildren(scrollTable(['Strategy', 'Debt-free in', 'Total interest'], ['avalanche', 'snowball', 'custom'].map(function (s) {
          var q = results[s];
          return [labels[s], el('span', { class: 'mono', text: q.done ? q.months + ' months' : 'Never', dataset: { k: s + '-months' } }), el('span', { class: 'mono', text: q.done ? money2(q.totalInterest) : '—', dataset: { k: s + '-interest' } })];
        })));
        var longest = Math.min(600, Math.max.apply(null, ['avalanche', 'snowball', 'custom'].map(function (s) { return results[s].rows.length; })));
        var start = ds.reduce(function (s, d) { return s + d.balance; }, 0), xs = [];
        for (var i = 0; i <= longest; i++) xs.push(i);
        chart.update({
          label: 'Total owed each month under each strategy', x: xs, xInteger: true,
          xFormat: function (v) { return v === 0 ? 'Now' : v + ' m'; }, tipTitle: function (v) { return v === 0 ? 'Now' : 'Month ' + v + ' (' + monthLabel(v) + ')'; }, tipFormat: money2,
          series: [['avalanche', 1], ['snowball', 2], ['custom', 3]].map(function (s) {
            var rr = results[s[0]].rows;
            return { name: labels[s[0]], slot: s[1], values: xs.map(function (m) { return m === 0 ? start : m <= rr.length ? rr[m - 1].total : (results[s[0]].done ? 0 : NaN); }) };
          })
        });
        bars.update({ categories: ds.map(function (d) { return d.name; }), series: [{ name: 'Months to clear', slot: 1, values: ds.map(function (d, j) { return res.cleared[j] || 0; }) }], format: function (v) { return v ? v + ' months' : '—'; } });
      }
      [{ name: 'Credit card', balance: 3000, apr: 29.9, min: 90 }, { name: 'Store card', balance: 800, apr: 19.9, min: 25 }, { name: 'Personal loan', balance: 5000, apr: 8.9, min: 160 }].forEach(addLine);
      U.live([extra], run);
      root.appendChild(U.panel('Your debts', list, U.btnrow(U.button('+ Add a debt', function () { addLine({ name: '', balance: '', apr: '', min: '' }); }, 'primary')), extra));
      root.appendChild(U.panel('Plan', strategy, summary, perDebt));
      root.appendChild(U.panel('Strategies compared', compare, chart));
      root.appendChild(U.panel('When each debt is cleared', bars, U.btnrow(csvDownload('Download the month-by-month plan (CSV)', 'debt-payoff-plan.csv', function () {
        if (!last) return null;
        var head = ['Month', 'Date'];
        last.ds.forEach(function (d) { head.push(d.name + ' payment', d.name + ' balance'); });
        return [head].concat(last.res.rows.map(function (q) {
          var row = [q.month, monthLabel(q.month)];
          last.ds.forEach(function (d, i) { row.push(fixed2(q.pays[i]), fixed2(q.bal[i])); });
          return row;
        }));
      })), U.note('Interest is added monthly from each APR. Avalanche usually costs least; snowball clears small debts sooner, which some people find keeps them going. The monthly budget stays the same throughout: when a debt is cleared its minimum rolls on to the next one.')));
      run();
    }
  });

  /* ======================================================================= */
  /* Budget Planner (50/30/20)                                               */
  /* ======================================================================= */
  var BUDGET_KEY = 'att-budget-planner';
  var BUDGET_GROUPS = [['needs', 'Needs'], ['wants', 'Wants'], ['savings', 'Savings & debt repayments']];
  function budgetExample() {
    return {
      income: 2500, split: [50, 30, 20], custom: false,
      lines: {
        needs: [['Rent or mortgage', 800], ['Council tax', 130], ['Gas and electricity', 120], ['Food shopping', 250], ['Transport', 100], ['Phone and broadband', 40]],
        wants: [['Eating out', 120], ['Subscriptions', 30], ['Hobbies', 80], ['Clothes', 50], ['Holiday fund', 100]],
        savings: [['Emergency fund', 200], ['Pension top-up', 100], ['Credit card overpayment', 50]]
      }
    };
  }
  Tools.register({
    id: 'budget-planner', category: 'finance', name: 'Budget Planner (50/30/20)',
    description: 'Plan a monthly budget from your take-home pay: list your needs, wants and savings, compare them with the 50/30/20 rule or your own split, and see what is left over.',
    keywords: ['budget', 'budget planner', '50/30/20', '50 30 20', 'monthly budget', 'spending plan', 'household budget', 'money plan', 'needs wants savings', 'bills', 'expenses', 'spreadsheet'],
    render: function (root) {
      prep(root, true);
      var state = budgetExample(), loaded = false;
      try {
        var saved = JSON.parse(localStorage.getItem(BUDGET_KEY));
        if (saved && saved.lines && isFinite(saved.income)) { state = saved; loaded = true; }
      } catch (e) { /* nothing saved, or storage blocked */ }
      var income = numIn('Monthly take-home pay', state.income, { min: 0, step: 10 }, { before: K.sym() });
      var splitMode = tabs([{ value: 'rule', label: '50/30/20' }, { value: 'custom', label: 'My own split' }], function () { syncSplit(); run(); }, state.custom ? 'custom' : 'rule');
      var splitIns = BUDGET_GROUPS.map(function (g, i) { return numIn(g[1] + ' (%)', state.split[i], { min: 0, max: 100, step: 1 }); });
      var splitRow = U.row.apply(null, splitIns);
      var groupsBox = el('div', { class: 'fb-groups' });
      var groupEls = {};
      var summary = el('div'), status = U.note(loaded ? 'Loaded the budget saved in this browser.' : '');
      var chart = K.barChart();
      function syncSplit() { splitRow.hidden = splitMode.value !== 'custom'; }
      function addLine(g, label, amount) {
        var name = el('input', { type: 'text', value: label, 'aria-label': 'Item' });
        var amt = el('input', { type: 'number', min: 0, step: 'any', value: amount, 'aria-label': 'Amount for ' + (label || 'item') });
        var box = el('div', { class: 'fb-line b2' }, U.field('', name), U.field('', amt), U.button('×', function () { box.remove(); run(); }, 'ghost'));
        box.querySelector('button').setAttribute('aria-label', 'Remove ' + (label || 'item'));
        box.dataset.group = g;
        [name, amt].forEach(function (i) { i.addEventListener('input', U.debounce(run, 150)); });
        groupEls[g].list.appendChild(box);
      }
      function build() {
        groupsBox.replaceChildren.apply(groupsBox, BUDGET_GROUPS.map(function (g) {
          var total = el('span', { class: 'mono', dataset: { k: g[0] + '-total' } });
          var listEl = el('div', { class: 'fb-list' });
          groupEls[g[0]] = { list: listEl, total: total };
          return el('div', { class: 'fb-group' }, el('h4', null, el('span', { text: g[1] }), total), listEl,
            U.btnrow(U.button('+ Add line', function () { addLine(g[0], '', ''); listEl.lastChild.querySelector('input').focus(); }, 'ghost')));
        }));
        BUDGET_GROUPS.forEach(function (g) { (state.lines[g[0]] || []).forEach(function (l) { addLine(g[0], l[0], l[1]); }); });
      }
      function read() {
        var lines = {};
        BUDGET_GROUPS.forEach(function (g) {
          lines[g[0]] = Array.prototype.map.call(groupEls[g[0]].list.children, function (box) {
            var ins = box.querySelectorAll('input');
            return [ins[0].value.trim(), parseFloat(ins[1].value) || 0];
          });
        });
        return { income: val(income) || 0, split: splitIns.map(function (s) { return val(s) || 0; }), custom: splitMode.value === 'custom', lines: lines };
      }
      function run() {
        var s = read(), split = s.custom ? s.split : [50, 30, 20];
        var sums = BUDGET_GROUPS.map(function (g) { return s.lines[g[0]].reduce(function (a, l) { return a + l[1]; }, 0); });
        var spent = sums.reduce(function (a, b) { return a + b; }, 0), left = s.income - spent;
        var splitTotal = split.reduce(function (a, b) { return a + b; }, 0);
        BUDGET_GROUPS.forEach(function (g, i) { groupEls[g[0]].total.textContent = money2(sums[i]); });
        var rows = BUDGET_GROUPS.map(function (g, i) {
          var target = s.income * split[i] / 100, diff = sums[i] - target, share = s.income > 0 ? sums[i] / s.income * 100 : 0;
          var over = i < 2 ? diff > 0.005 : diff < -0.005;
          return [g[1], el('span', { class: 'mono', text: money2(sums[i]), dataset: { k: g[0] } }), el('span', { class: 'mono', text: pct(share), dataset: { k: g[0] + '-pct' } }), money2(target) + ' (' + split[i] + '%)',
            el('span', { class: over ? 'fb-bad' : 'fb-good', text: (diff >= 0 ? '+' : '−') + money2(Math.abs(diff)), dataset: { k: g[0] + '-diff' } })];
        });
        summary.replaceChildren(
          grid(card('Take-home pay', money2(s.income), 'income'), card('Planned spending and saving', money2(spent), 'spent'),
            card(left >= 0 ? 'Left over' : 'Over budget by', money2(Math.abs(left)), 'left', true)),
          scrollTable(['Group', 'Planned', 'Share of pay', 'Target', 'Against target'], rows),
          splitTotal !== 100 ? U.note('Your split adds up to ' + splitTotal + '%, not 100%.', 'err') : null,
          left > 0.005 ? U.note('Unallocated money: moving it to savings takes you to ' + pct((sums[2] + left) / (s.income || 1) * 100) + ' of your pay.') : null);
        chart.update({
          categories: BUDGET_GROUPS.map(function (g) { return g[1]; }),
          series: [{ name: 'Your plan', slot: 1, values: sums }, { name: 'Target', slot: 2, values: split.map(function (p) { return s.income * p / 100; }) }]
        });
      }
      function csv() {
        var s = read(), rows = [['Group', 'Item', 'Monthly amount (' + K.sym() + ')']];
        BUDGET_GROUPS.forEach(function (g) { s.lines[g[0]].forEach(function (l) { rows.push([g[1], l[0], fixed2(l[1])]); }); });
        rows.push(['', 'Take-home pay', fixed2(s.income)]);
        return rows;
      }
      function save() {
        try { localStorage.setItem(BUDGET_KEY, JSON.stringify(read())); status.className = 'note ok'; status.textContent = 'Saved in this browser. It stays on this device only.'; }
        catch (e) { status.className = 'note err'; status.textContent = 'This browser would not let the page save (private mode or storage turned off).'; }
      }
      function forget() {
        try { localStorage.removeItem(BUDGET_KEY); } catch (e) { /* nothing to remove */ }
        status.className = 'note'; status.textContent = 'The saved budget was removed from this browser.';
      }
      function reset() {
        state = budgetExample();
        income.input.value = String(state.income);
        splitIns.forEach(function (s, i) { s.input.value = String(state.split[i]); });
        build(); run();
      }
      build();
      syncSplit();
      U.live([income].concat(splitIns), run);
      root.appendChild(U.panel(null, U.row(income), el('label', { class: 'fn-muted', text: 'Compare with' }), splitMode, splitRow,
        U.note('50/30/20: about half of take-home pay on needs (bills you must pay), 30% on wants and 20% on savings and paying off debt.')));
      root.appendChild(U.panel('Your budget (monthly)', groupsBox));
      root.appendChild(U.panel('Summary', summary, chart,
        U.btnrow(U.button('Save in this browser', save, 'primary'), csvDownload('Download CSV', 'budget.csv', csv), U.button('Forget saved budget', forget, 'ghost'), U.button('Start again from the example', reset, 'ghost')), status));
    }
  });

  /* ======================================================================= */
  /* Pension Pot Calculator                                                  */
  /* ======================================================================= */
  Tools.register({
    id: 'pension-calculator', category: 'finance', name: 'Pension Pot Calculator',
    description: 'Project your pension pot at retirement from contributions, growth, charges and inflation, in today’s money and future pounds, with the 25% tax-free lump sum, drawdown or annuity income and the State Pension.',
    keywords: ['pension', 'retirement', 'pension pot', 'workplace pension', 'sipp', 'auto enrolment', 'employer contribution', 'drawdown', 'annuity', 'tax free lump sum', 'state pension', 'retire', 'savings'],
    render: function (root) {
      prep(root);
      var age = numIn('Age now', 30, { min: 16, max: 90, step: 1 });
      var retire = numIn('Retire at', 67, { min: 50, max: 90, step: 1 });
      var pot = numIn('Pension pot now', 20000, { min: 0, step: 500 }, { before: '£' });
      var how = tabs([{ value: 'salary', label: '% of salary' }, { value: 'fixed', label: 'Fixed monthly amount' }], function () { sync(); run(); }, 'salary');
      var salary = numIn('Salary', 35000, { min: 0, step: 500 }, { before: '£' });
      var you = numIn('You pay', 5, { min: 0, max: 100, step: 0.5 }, { after: '%' });
      var boss = numIn('Employer pays', 3, { min: 0, max: 100, step: 0.5 }, { after: '%' });
      var raise = numIn('Salary growth a year', 2.5, { step: 0.1 }, { after: '%' });
      var monthly = numIn('Paid in each month', 300, { min: 0, step: 10 }, { before: '£' });
      var monthlyUp = numIn('Increase each year', 0, { step: 0.5 }, { after: '%' });
      var salaryBox = U.row(salary, you, boss, raise), fixedBox = U.row(monthly, monthlyUp);
      var growth = numIn('Investment growth a year', 5, { step: 0.1 }, { after: '%' });
      var charges = numIn('Charges a year', 0.5, { min: 0, step: 0.05 }, { after: '%' });
      var inflation = numIn('Inflation a year', 2.5, { step: 0.1 }, { after: '%' });
      var lump = U.checkbox('Take the 25% tax-free lump sum', { checked: true });
      var income = tabs([{ value: 'draw', label: 'Drawdown' }, { value: 'annuity', label: 'Annuity' }], function () { sync(); run(); }, 'draw');
      var drawYears = numIn('Make it last (years)', 25, { min: 1, max: 60, step: 1 });
      var annuityRate = numIn('Annuity rate', 6.5, { min: 0, step: 0.1 }, { after: '%' });
      var drawBox = U.row(drawYears), annBox = U.row(annuityRate);
      var spWeekly = numIn('Full new State Pension (a week)', STATE_PENSION.weekly, { min: 0, step: 0.05 }, { before: '£' });
      var spYears = numIn('Your National Insurance years', 35, { min: 0, max: 50, step: 1 });
      var spAge = numIn('State Pension age', 67, { min: 60, max: 75, step: 1 });
      var out = el('div'), table = el('div'), chart = K.lineChart(root);
      var rows = [];
      function sync() { salaryBox.hidden = how.value !== 'salary'; fixedBox.hidden = how.value !== 'fixed'; drawBox.hidden = income.value !== 'draw'; annBox.hidden = income.value !== 'annuity'; }
      function run() {
        var a = Math.round(val(age)), ra = Math.round(val(retire)), start = val(pot) || 0;
        var g = (val(growth) || 0) - (val(charges) || 0), inf = val(inflation) || 0;
        if (!(a >= 0) || !(ra > a)) { out.replaceChildren(U.note('Retirement age must be after your age now', 'err')); table.replaceChildren(); chart.update(null); rows = []; return; }
        var years = ra - a, mg = Math.pow(1 + g / 100, 1 / 12) - 1;
        var sal = val(salary) || 0, rate = ((val(you) || 0) + (val(boss) || 0)) / 100, fixedAmt = val(monthly) || 0;
        var bal = start, paid = 0;
        rows = [{ age: a, paidIn: 0, growth: 0, pot: start, real: start }];
        for (var y = 1; y <= years; y++) {
          var inYear = 0, before = bal;
          var each = how.value === 'salary' ? sal * rate / 12 : fixedAmt;
          for (var m = 0; m < 12; m++) { bal = bal * (1 + mg) + each; inYear += each; }
          paid += inYear;
          rows.push({ age: a + y, paidIn: inYear, growth: bal - before - inYear, pot: bal, real: bal / Math.pow(1 + inf / 100, y) });
          if (how.value === 'salary') sal *= 1 + (val(raise) || 0) / 100;
          else fixedAmt *= 1 + (val(monthlyUp) || 0) / 100;
        }
        var deflate = Math.pow(1 + inf / 100, years);
        var lumpSum = lump.input.checked ? Math.min(bal * 0.25, LUMP_SUM_ALLOWANCE.amount) : 0;
        var rest = bal - lumpSum, restReal = rest / deflate;
        var potIncome, potLabel;
        if (income.value === 'draw') {
          var n = Math.max(1, Math.round(val(drawYears) || 25)), rr = (1 + g / 100) / (1 + inf / 100) - 1;
          potIncome = Math.abs(rr) < 1e-12 ? restReal / n : restReal * rr / (1 - Math.pow(1 + rr, -n));
          potLabel = 'Drawdown income for ' + n + ' years (rises with prices)';
        } else {
          potIncome = rest * (val(annuityRate) || 0) / 100 / deflate;
          potLabel = 'Level annuity, first year';
        }
        var ny = Math.max(0, val(spYears) || 0);
        var sp = ny < STATE_PENSION.minYears ? 0 : (val(spWeekly) || 0) * 52 * Math.min(ny, STATE_PENSION.fullYears) / STATE_PENSION.fullYears;
        var spFrom = Math.round(val(spAge) || 67);
        out.replaceChildren(
          grid(card('Pot at ' + ra + ' (future pounds)', money0(bal), 'pot', true),
            card('Pot in today’s money', money0(bal / deflate), 'pot-real'),
            card('Paid in', money0(paid), 'paid'),
            card('Investment growth', money0(bal - start - paid), 'growth')),
          el('h4', { text: 'At retirement (in today’s money)' }),
          grid(card('Tax-free lump sum', money0(lumpSum / deflate), 'lump'),
            card(potLabel, money0(potIncome) + ' a year', 'income'),
            card('State Pension from ' + spFrom, money0(sp) + ' a year', 'sp'),
            card('Total income once both are paid', money0(potIncome + sp) + ' a year', 'total', true)),
          el('p', { class: 'fn-muted' }, 'That is about ', el('b', { text: money0((potIncome + sp) / 12), dataset: { k: 'total-month' } }), ' a month before tax' +
            (spFrom > ra ? ', with the State Pension starting ' + (spFrom - ra) + ' years after you retire.' : '.')),
          lumpSum > 0 && lumpSum >= LUMP_SUM_ALLOWANCE.amount ? U.note('The tax-free lump sum is capped at ' + money0(LUMP_SUM_ALLOWANCE.amount) + ' (the lump sum allowance).') : null,
          U.note('Tax-free cash is ' + money0(lumpSum) + ' in future pounds. Income from the pot and the State Pension is taxable. An annuity rate depends on your age and health when you buy it; a level annuity loses buying power as prices rise.'));
        table.replaceChildren(scrollTable(['Age', 'Paid in that year', 'Growth that year', 'Pot', 'In today’s money'], rows.slice(1).map(function (q) {
          return [q.age, money0(q.paidIn), money0(q.growth), money0(q.pot), money0(q.real)];
        }), true));
        chart.update({
          label: 'Pension pot by age', x: rows.map(function (q) { return q.age; }), xInteger: true,
          xFormat: function (v) { return 'Age ' + v; }, tipTitle: function (v) { return 'Age ' + v; },
          series: [{ name: 'Future pounds', slot: 1, values: rows.map(function (q) { return q.pot; }) }, { name: 'Today’s money', slot: 2, values: rows.map(function (q) { return q.real; }) }]
        });
      }
      sync();
      U.live([age, retire, pot, salary, you, boss, raise, monthly, monthlyUp, growth, charges, inflation, lump, drawYears, annuityRate, spWeekly, spYears, spAge], run);
      root.appendChild(U.panel('You', U.row(age, retire, pot), el('label', { class: 'fn-muted', text: 'Contributions' }), how, salaryBox, fixedBox,
        U.note('Enter everything that goes in, including tax relief: with relief at source, £80 from you becomes £100 in the pot.')));
      root.appendChild(U.panel('Growth', U.row(growth, charges, inflation), lump, el('label', { class: 'fn-muted', text: 'Retirement income from the pot' }), income, drawBox, annBox));
      root.appendChild(U.panel('State Pension', U.row(spWeekly, spYears, spAge),
        U.note('You need 35 qualifying years for the full new State Pension and at least 10 for any. State Pension age is 66 now and rises to 67 between 2026 and 2028; check yours on GOV.UK.'),
        source('Full new State Pension: ' + money2(STATE_PENSION.weekly) + ' a week in ' + STATE_PENSION.taxYear + ' (as of ' + STATE_PENSION.asOf + '). Source:', STATE_PENSION.source)));
      root.appendChild(U.panel('Projection', out, chart));
      root.appendChild(U.panel('Year by year', table, U.btnrow(csvDownload('Download projection (CSV)', 'pension-projection.csv', function () {
        return rows.length ? [['Age', 'Paid in', 'Growth', 'Pot', 'Pot in today’s money']].concat(rows.map(function (q) { return [q.age, fixed2(q.paidIn), fixed2(q.growth), fixed2(q.pot), fixed2(q.real)]; })) : null;
      })), U.note('Contributions go in monthly and growth is net of charges (growth minus charges). This is an illustration, not advice: investments can fall as well as rise.')));
    }
  });

  /* ======================================================================= */
  /* Break-Even Calculator                                                   */
  /* ======================================================================= */
  Tools.register({
    id: 'break-even', category: 'finance', name: 'Break-Even Calculator',
    description: 'How many units you need to sell to cover your costs, with contribution margin, break-even revenue, margin of safety and the sales needed for a target profit.',
    keywords: ['break even', 'break-even', 'breakeven', 'contribution margin', 'fixed costs', 'variable costs', 'margin of safety', 'target profit', 'small business', 'pricing', 'units'],
    render: function (root) {
      prep(root, true);
      var fixedCosts = numIn('Fixed costs (for the period)', 10000, { min: 0, step: 100 }, { before: K.sym() });
      var unitCost = numIn('Variable cost per unit', 15, { min: 0, step: 0.01 }, { before: K.sym() });
      var unitPrice = numIn('Selling price per unit', 40, { min: 0, step: 0.01 }, { before: K.sym() });
      var expected = numIn('Expected sales (units)', 600, { min: 0, step: 1 });
      var targetProfit = numIn('Target profit', 5000, { min: 0, step: 100 }, { before: K.sym() });
      var out = el('div'), chart = K.lineChart(root);
      function run() {
        var F = val(fixedCosts), v = val(unitCost), p = val(unitPrice), q = val(expected) || 0, tp = val(targetProfit) || 0;
        if ([F, v, p].some(isNaN)) { out.replaceChildren(U.note('Enter the fixed costs, cost per unit and price', 'err')); chart.update(null); return; }
        var cm = p - v;
        if (!(cm > 0)) { out.replaceChildren(U.note('The price must be higher than the variable cost per unit, or every sale loses money.', 'err')); chart.update(null); return; }
        var be = F / cm, beUnits = Math.ceil(be - 1e-9), mos = q - be;
        var fmtU = function (n) { return K.num2.format(n); };
        out.replaceChildren(
          grid(card('Break-even point', beUnits.toLocaleString('en-GB') + ' units', 'units', true),
            card('Break-even revenue', money2(be * p), 'revenue'),
            card('Contribution per unit', money2(cm), 'cm'),
            card('Contribution margin', pct(cm / p * 100), 'cmr'),
            card('Units for ' + money0(tp) + ' profit', Math.ceil((F + tp) / cm - 1e-9).toLocaleString('en-GB'), 'target'),
            card('Profit at ' + fmtU(q) + ' units', money2(q * cm - F), 'profit'),
            card('Margin of safety', q > 0 ? fmtU(Math.round(mos * 100) / 100) + ' units (' + pct(mos / q * 100) + ')' : '—', 'mos')),
          U.note('Exactly ' + fmtU(Math.round(be * 100) / 100) + ' units cover the fixed costs; you need whole units, so ' + beUnits.toLocaleString('en-GB') + '. Margin of safety is how far sales can fall before you make a loss.'));
        var top = Math.max(Math.ceil(be * 2), Math.ceil(q * 1.25), 10), step = Math.max(1, Math.ceil(top / 60)), xs = [];
        for (var u = 0; u <= top; u += step) xs.push(u);
        if (xs[xs.length - 1] !== top) xs.push(top);
        chart.update({
          label: 'Revenue and total costs by units sold', x: xs, xInteger: true,
          xFormat: function (x) { return x.toLocaleString('en-GB'); }, tipTitle: function (x) { return x.toLocaleString('en-GB') + ' units'; }, tipFormat: money0,
          series: [{ name: 'Revenue', slot: 1, values: xs.map(function (x) { return x * p; }) }, { name: 'Total costs', slot: 2, values: xs.map(function (x) { return F + x * v; }) }],
          markers: [{ x: be, y: be * p, label: 'Break-even: ' + beUnits.toLocaleString('en-GB') + ' units' }]
        });
      }
      U.live([fixedCosts, unitCost, unitPrice, expected, targetProfit], run);
      root.appendChild(U.panel(null, U.row(fixedCosts, unitCost, unitPrice), U.row(expected, targetProfit),
        U.note('Fixed costs stay the same however much you sell (rent, salaries, insurance); variable costs rise with each unit (materials, packaging, card fees). Use prices before VAT.')));
      root.appendChild(U.panel('Results', out));
      root.appendChild(U.panel('Costs and revenue', chart));
    }
  });

  /* ======================================================================= */
  /* Rent vs Buy Calculator                                                  */
  /* ======================================================================= */
  /* Both households spend the same each month: whoever's housing costs less
     that month invests the difference, and the renter invests the cash the
     buyer puts into the deposit, tax and fees. Net wealth is compared year by
     year (for the buyer: home value after selling costs, minus the mortgage,
     plus any investments). */
  function rentVsBuy(o) {
    var loan = Math.max(0, o.price - o.deposit), mRate = o.rate / 100 / 12, n = Math.round(o.term * 12);
    var pay = loan > 0 ? K.payment(loan, o.rate, n) : 0;
    var hg = Math.pow(1 + o.growth / 100, 1 / 12), ig = Math.pow(1 + o.invest / 100, 1 / 12);
    var value = o.price, bal = loan, rent = o.rent, buyerPot = 0, renterPot = o.deposit + o.stampDuty + o.buyCosts;
    var worth = function () { return value * (1 - o.sellPct / 100) - bal + buyerPot; };
    var rows = [{ year: 0, value: value, balance: bal, buy: worth(), rent: renterPot, rentPaid: 0, buyPaid: 0 }];
    var rentPaid = 0, buyPaid = 0;
    for (var m = 1; m <= o.years * 12; m++) {
      var interest = bal * mRate, due = bal > 0.005 ? Math.min(pay, bal + interest) : 0;
      bal = Math.max(0, bal + interest - due);
      var own = due + value * o.maint / 100 / 12 + o.service / 12;
      value *= hg;
      buyerPot *= ig; renterPot *= ig;
      if (own > rent) renterPot += own - rent; else buyerPot += rent - own;
      rentPaid += rent; buyPaid += own;
      if (m % 12 === 0) {
        rows.push({ year: m / 12, value: value, balance: bal, buy: worth(), rent: renterPot, rentPaid: rentPaid, buyPaid: buyPaid });
        rent *= 1 + o.rentRise / 100;
      }
    }
    var even = 0;
    for (var i = 1; i < rows.length; i++) if (rows[i].buy >= rows[i].rent) { even = i; break; }
    return { rows: rows, payment: pay, loan: loan, breakEven: even };
  }
  Tools.register({
    id: 'rent-vs-buy', category: 'finance', name: 'Rent vs Buy Calculator',
    description: 'Compare buying a home with renting and investing the difference: mortgage, stamp duty, fees, upkeep, house prices, rent rises and investment returns, with net wealth year by year and the break-even year.',
    keywords: ['rent vs buy', 'rent or buy', 'buy or rent', 'renting', 'buying a house', 'first home', 'mortgage', 'house prices', 'deposit', 'stamp duty', 'property', 'invest the difference', 'net worth'],
    render: function (root) {
      prep(root);
      var price = numIn('Property price', 300000, { min: 0, step: 1000 }, { before: '£' });
      var deposit = numIn('Deposit', 30000, { min: 0, step: 1000 }, { before: '£' });
      var rate = numIn('Mortgage rate', 4.5, { min: 0, step: 0.05 }, { after: '%' });
      var term = numIn('Mortgage term (years)', 25, { min: 1, max: 40, step: 1 });
      var sdMode = U.select({ label: 'Stamp duty', value: 'sdlt-first', options: [
        { value: 'sdlt-first', label: 'Estimate: England & NI, first-time buyer' }, { value: 'sdlt-home', label: 'Estimate: England & NI, moving home' },
        { value: 'lbtt-first', label: 'Estimate: Scotland, first-time buyer' }, { value: 'lbtt-home', label: 'Estimate: Scotland, moving home' },
        { value: 'ltt-home', label: 'Estimate: Wales' }, { value: 'own', label: 'Enter my own figure' }] });
      var sdOwn = numIn('Stamp duty (your figure)', 0, { min: 0, step: 100 }, { before: '£' });
      var buyCosts = numIn('Buying costs (legal, survey, fees)', 3000, { min: 0, step: 100 }, { before: '£' });
      var sellPct = numIn('Selling costs (agent and legal)', 2, { min: 0, step: 0.1 }, { after: '% of value' });
      var maint = numIn('Maintenance and insurance a year', 1, { min: 0, step: 0.1 }, { after: '% of value' });
      var service = numIn('Service charge and ground rent a year', 0, { min: 0, step: 50 }, { before: '£' });
      var growth = numIn('House prices rise a year', 3, { step: 0.1 }, { after: '%' });
      var rent = numIn('Rent a month', 1200, { min: 0, step: 10 }, { before: '£' });
      var rentRise = numIn('Rent rises a year', 3, { step: 0.1 }, { after: '%' });
      var invest = numIn('Investment return a year (renting)', 5, { step: 0.1 }, { after: '%' });
      var years = numIn('Compare over (years)', 25, { min: 1, max: 40, step: 1 });
      var out = el('div'), table = el('div'), chart = K.lineChart(root);
      var last = null;
      function run() {
        var p = val(price), d = val(deposit) || 0;
        var mode = selVal(sdMode);
        sdOwn.hidden = mode !== 'own';
        if (!(p > 0) || d > p) { out.replaceChildren(U.note('Enter a price and a deposit no bigger than the price', 'err')); chart.update(null); table.replaceChildren(); last = null; return; }
        var sd = mode === 'own' ? (val(sdOwn) || 0) : propertyTax(p, mode.split('-')[0], mode.split('-')[1], false).total;
        var o = { price: p, deposit: d, rate: val(rate) || 0, term: val(term) || 25, stampDuty: sd, buyCosts: val(buyCosts) || 0, sellPct: val(sellPct) || 0,
          maint: val(maint) || 0, service: val(service) || 0, growth: val(growth) || 0, rent: val(rent) || 0, rentRise: val(rentRise) || 0, invest: val(invest) || 0,
          years: Math.max(1, Math.min(40, Math.round(val(years) || 25))) };
        var r = rentVsBuy(o), end = r.rows[r.rows.length - 1];
        last = r;
        var ahead = end.buy - end.rent;
        out.replaceChildren(
          grid(card('Cash needed to buy', money0(d + sd + o.buyCosts), 'upfront'), card('Stamp duty', money0(sd), 'sd'),
            card('Monthly mortgage payment', money2(r.payment), 'payment'),
            card('Buying pulls ahead', r.breakEven ? 'Year ' + r.breakEven : 'Not within ' + o.years + ' years', 'even', true),
            card('Net wealth if you buy (year ' + o.years + ')', money0(end.buy), 'buy'), card('Net wealth if you rent (year ' + o.years + ')', money0(end.rent), 'rent')),
          U.note((ahead >= 0 ? 'Buying' : 'Renting') + ' leaves you ' + money0(Math.abs(ahead)) + ' better off after ' + o.years + ' years with these assumptions.', ahead >= 0 ? 'ok' : ''));
        table.replaceChildren(scrollTable(['Year', 'Home value', 'Mortgage left', 'Buy: net wealth', 'Rent: net wealth', 'Difference'], r.rows.map(function (q) {
          return [q.year, money0(q.value), money0(q.balance), money0(q.buy), money0(q.rent), money0(q.buy - q.rent)];
        }), true));
        chart.update({
          label: 'Net wealth if you buy and if you rent, by year', x: r.rows.map(function (q) { return q.year; }), xInteger: true,
          xFormat: function (v) { return 'Yr ' + v; }, tipTitle: function (v) { return 'After ' + K.yrs(v); },
          series: [{ name: 'Buy', slot: 1, values: r.rows.map(function (q) { return q.buy; }) }, { name: 'Rent and invest', slot: 2, values: r.rows.map(function (q) { return q.rent; }) }],
          markers: r.breakEven ? [{ x: r.breakEven, y: r.rows[r.breakEven].buy, label: 'Buying ahead from year ' + r.breakEven }] : []
        });
      }
      U.live([price, deposit, rate, term, sdMode, sdOwn, buyCosts, sellPct, maint, service, growth, rent, rentRise, invest, years], run);
      root.appendChild(U.panel('Buying', U.row(price, deposit, rate, term), U.row(sdMode, sdOwn, buyCosts), U.row(sellPct, maint, service, growth)));
      root.appendChild(U.panel('Renting', U.row(rent, rentRise, invest, years)));
      root.appendChild(U.panel('Result', out, chart,
        U.note('Each month both households spend the same: whoever’s housing is cheaper that month invests the difference, and the renter invests the deposit, stamp duty and fees instead. Investment returns are treated as tax-free (an ISA). Moving costs, remortgage fees and changes in rates are not included.')));
      root.appendChild(U.panel('Year by year', table, U.btnrow(csvDownload('Download year by year (CSV)', 'rent-vs-buy.csv', function () {
        return last ? [['Year', 'Home value', 'Mortgage left', 'Buy net wealth', 'Rent net wealth', 'Rent paid to date', 'Buying costs paid to date']].concat(last.rows.map(function (q) {
          return [q.year, fixed2(q.value), fixed2(q.balance), fixed2(q.buy), fixed2(q.rent), fixed2(q.rentPaid), fixed2(q.buyPaid)];
        })) : null;
      }))));
    }
  });

  /* ======================================================================= */
  /* Hourly, Daily & Annual Salary Converter                                 */
  /* ======================================================================= */
  Tools.register({
    id: 'salary-converter', category: 'finance', name: 'Hourly, Daily & Annual Salary Converter',
    description: 'Convert pay between hourly, daily, weekly, monthly and yearly figures for your hours, work out part-time pro-rata pay, and compare it with the National Minimum and Living Wage.',
    keywords: ['salary', 'hourly rate', 'day rate', 'annual salary', 'wage', 'pay', 'per hour', 'per year', 'pro rata', 'part time', 'minimum wage', 'national living wage', 'contractor', 'holiday', 'salary to hourly', 'hourly to salary'],
    render: function (root) {
      prep(root);
      var amount = numIn('Pay', 30000, { min: 0, step: 'any' }, { before: '£' });
      var per = tabs([{ value: 'hour', label: 'an hour' }, { value: 'day', label: 'a day' }, { value: 'week', label: 'a week' }, { value: 'month', label: 'a month' }, { value: 'year', label: 'a year' }], function () { run(); }, 'year');
      var hours = numIn('Hours a week', 37.5, { min: 0.5, max: 100, step: 0.5 });
      var days = numIn('Days a week', 5, { min: 0.5, max: 7, step: 0.5 });
      var weeks = numIn('Paid weeks a year', 52, { min: 1, max: 52.143, step: 0.1 });
      var contractor = U.checkbox('Unpaid holiday (contractor or freelancer): take off 5.6 weeks');
      var fte = numIn('Full-time hours (for pro rata)', 37.5, { min: 1, max: 100, step: 0.5 });
      var mine = numIn('Hours you work', 37.5, { min: 0, max: 100, step: 0.5 });
      var band = U.select({ label: 'Minimum wage band', value: '21', options: MINIMUM_WAGE.rates.map(function (r) { return { value: r.id, label: r.label + ': £' + r.rate.toFixed(2) }; }) });
      var nmwRate = numIn('Minimum hourly rate to compare with', MINIMUM_WAGE.rates[0].rate, { min: 0, step: 0.01 }, { before: '£' });
      var out = el('div'), nmwOut = el('div');
      band.querySelector('select').addEventListener('change', function () {
        var r = MINIMUM_WAGE.rates.filter(function (x) { return x.id === selVal(band); })[0];
        nmwRate.input.value = r.rate.toFixed(2);
        run();
      });
      function run() {
        var a = val(amount), h = val(hours), d = val(days), w = val(weeks), full = val(fte), own = val(mine);
        if (contractor.input.checked) w = Math.max(1, w - STATUTORY_HOLIDAY_WEEKS);
        if (!(a >= 0) || !(h > 0) || !(d > 0) || !(w > 0)) { out.replaceChildren(U.note('Enter the pay, hours, days and weeks', 'err')); return; }
        /* Everything goes through a yearly figure. */
        var yearly = { hour: a * h * w, day: a * d * w, week: a * w, month: a * 12, year: a }[per.value];
        var fig = function (y) { return { hour: y / w / h, day: y / w / d, week: y / w, month: y / 12, year: y }; };
        var f = fig(yearly), ratio = full > 0 && own >= 0 ? own / full : 1;
        var proRata = Math.abs(ratio - 1) > 1e-9;
        /* Part-time keeps the same hourly and daily rates; the pay for the week, month and year shrinks. */
        var p = { hour: f.hour, day: f.day, week: f.week * ratio, month: f.month * ratio, year: f.year * ratio };
        var names = [['hour', 'Hourly'], ['day', 'Daily'], ['week', 'Weekly'], ['month', 'Monthly'], ['year', 'Yearly']];
        out.replaceChildren(scrollTable(['', proRata ? 'Full-time' : 'Pay', proRata ? 'Pro rata (' + pct(ratio * 100, 1) + ')' : null].filter(function (x) { return x !== null; }), names.map(function (nm) {
          var row = [nm[1], el('span', { class: 'mono', text: money2(f[nm[0]]), dataset: { k: nm[0] } })];
          if (proRata) row.push(el('span', { class: 'mono', text: money2(p[nm[0]]), dataset: { k: 'pr-' + nm[0] } }));
          return row;
        })), U.note(contractor.input.checked
          ? 'Worked over ' + K.num2.format(w) + ' weeks a year (52 minus 5.6 weeks’ unpaid holiday), so a day rate is spread over fewer paid days.'
          : 'Employees are paid for all 52 weeks, including at least ' + STATUTORY_HOLIDAY_WEEKS + ' weeks’ paid holiday (28 days for a five-day week, which can include bank holidays).'));
        var rate = val(nmwRate), hourly = (proRata ? p : f).hour;
        if (rate > 0) {
          var diff = hourly - rate;
          nmwOut.replaceChildren(
            el('p', { class: diff >= -0.004 ? 'fb-good' : 'fb-bad', dataset: { k: 'nmw' } }, diff >= -0.004
              ? 'Your hourly rate of ' + money2(hourly) + ' is ' + money2(diff) + ' (' + pct(diff / rate * 100) + ') above the minimum of ' + money2(rate) + '.'
              : 'Your hourly rate of ' + money2(hourly) + ' is ' + money2(-diff) + ' below the minimum of ' + money2(rate) + '.'),
            el('p', { class: 'fn-muted' }, 'The minimum at ' + K.num2.format(proRata ? own : h) + ' hours a week is ', el('b', { text: money2(rate * (proRata ? own : h) * w), dataset: { k: 'nmw-year' } }), ' a year (' + money2(rate * (proRata ? own : h) * w / 12) + ' a month).'),
            source('Minimum wage rates from ' + MINIMUM_WAGE.from + ' (as of ' + MINIMUM_WAGE.asOf + '). Source:', MINIMUM_WAGE.source));
        } else nmwOut.replaceChildren();
      }
      U.live([amount, hours, days, weeks, contractor, fte, mine, nmwRate], run);
      root.appendChild(U.panel(null, U.row(amount), per, U.row(hours, days, weeks), contractor));
      root.appendChild(U.panel('Part-time', U.row(fte, mine), U.note('Pro rata pay is the full-time figure scaled by your hours ÷ full-time hours.')));
      root.appendChild(U.panel('Converted', out));
      root.appendChild(U.panel('Against the minimum wage', U.row(band, nmwRate), nmwOut));
    }
  });

  /* ======================================================================= */
  /* Fuel & EV Journey Cost Calculator                                       */
  /* ======================================================================= */
  var LITRES_PER_UK_GALLON = 4.54609, KM_PER_MILE = 1.609344;
  /* Rough DESNZ greenhouse gas conversion factors (kg CO2e): per litre of
     pump petrol and diesel (average biofuel blend), and per kWh of UK grid
     electricity. Editable, since they are revised every year. */
  var CO2 = { petrol: 2.07, diesel: 2.58, grid: 0.177 };
  /* Pump prices move weekly: these are rough UK averages for mid-September
     2026 (DESNZ weekly road fuel prices) and are meant to be overwritten. */
  var PUMP_PENCE = { petrol: 168, diesel: 191 };
  Tools.register({
    id: 'journey-cost', category: 'finance', name: 'Fuel & EV Journey Cost Calculator',
    description: 'What a trip costs in a petrol or diesel car and in an electric car, side by side: fuel or charging, return trips, splitting between passengers and a CO₂ estimate.',
    keywords: ['fuel cost', 'petrol', 'diesel', 'ev', 'electric car', 'charging cost', 'journey', 'trip cost', 'mpg', 'miles per kwh', 'road trip', 'car share', 'split fuel', 'co2', 'emissions', 'gas mileage'],
    render: function (root) {
      prep(root);
      var distance = numIn('Distance (one way)', 100, { min: 0, step: 1 });
      var unit = tabs([{ value: 'mi', label: 'miles' }, { value: 'km', label: 'km' }], function () { run(); }, 'mi');
      var ret = U.checkbox('Return trip (double it)');
      var people = numIn('People sharing the cost', 1, { min: 1, max: 9, step: 1 });
      var fuel = tabs([{ value: 'petrol', label: 'Petrol' }, { value: 'diesel', label: 'Diesel' }], function (v) { pump.input.value = String(PUMP_PENCE[v]); co2Fuel.input.value = String(CO2[v]); run(); }, 'petrol');
      var eff = numIn('Fuel economy', 45, { min: 0.1, step: 0.1 });
      var effUnit = tabs([{ value: 'mpg', label: 'mpg (UK)' }, { value: 'l100', label: 'L/100 km' }], function () { run(); }, 'mpg');
      var pump = numIn('Fuel price', PUMP_PENCE.petrol, { min: 0, step: 0.1 }, { after: 'p per litre' });
      var evEff = numIn('EV efficiency', 3.5, { min: 0.1, step: 0.1 });
      var evUnit = tabs([{ value: 'mpk', label: 'miles/kWh' }, { value: 'k100', label: 'kWh/100 km' }], function () { run(); }, 'mpk');
      /* Home charging defaults to the Ofgem price cap unit rate kept by
         home.js (energy-cost), when that module is loaded. */
      var cap = window.HomeKit && window.HomeKit.priceCap ? window.HomeKit.priceCap() : null;
      var homePence = cap ? cap.unit : 26;
      var evPrice = numIn('Charging price', homePence, { min: 0, step: 0.01 }, { after: 'p per kWh' });
      var co2Fuel = numIn('CO₂ per litre', CO2.petrol, { min: 0, step: 0.01 }, { after: 'kg' });
      var co2Grid = numIn('CO₂ per kWh', CO2.grid, { min: 0, step: 0.001 }, { after: 'kg' });
      var loss = numIn('Charging losses', 10, { min: 0, max: 50, step: 1 }, { after: '%' });
      function setEv(p) { evPrice.input.value = String(p); run(); }
      var evPresets = U.btnrow(U.button('Home: ' + homePence + 'p' + (cap ? ' (price cap)' : ''), function () { setEv(homePence); }, 'ghost'), U.button('Public rapid charger: about 79p', function () { setEv(79); }, 'ghost'));
      var iceBox = el('div'), evBox = el('div'), verdict = el('div');
      function run() {
        var dist = val(distance), n = Math.max(1, Math.round(val(people) || 1));
        if (!(dist >= 0)) { verdict.replaceChildren(U.note('Enter a distance', 'err')); return; }
        var miles = (unit.value === 'km' ? dist / KM_PER_MILE : dist) * (ret.input.checked ? 2 : 1), km = miles * KM_PER_MILE;
        var e = val(eff), litres = effUnit.value === 'mpg' ? miles / e * LITRES_PER_UK_GALLON : km * e / 100;
        var fuelCost = litres * (val(pump) || 0) / 100, fuelCo2 = litres * (val(co2Fuel) || 0);
        var ee = val(evEff), kwh = evUnit.value === 'mpk' ? miles / ee : km * ee / 100;
        var drawn = kwh * (1 + (val(loss) || 0) / 100), evCost = drawn * (val(evPrice) || 0) / 100, evCo2 = drawn * (val(co2Grid) || 0);
        var perMile = function (c) { return miles > 0 ? (c / miles * 100).toFixed(1) + 'p a mile' : '—'; };
        var distText = K.num2.format(Math.round(miles * 10) / 10) + ' miles (' + K.num2.format(Math.round(km * 10) / 10) + ' km)';
        iceBox.replaceChildren(el('h4', { text: fuel.value === 'petrol' ? 'Petrol car' : 'Diesel car' }),
          grid(card('Fuel cost', isFinite(fuelCost) ? money2(fuelCost) : '—', 'ice-cost', true), card('Each person', money2(fuelCost / n), 'ice-pp')),
          el('p', { class: 'fn-muted' }, el('span', { text: K.num2.format(Math.round(litres * 100) / 100) + ' litres', dataset: { k: 'ice-litres' } }), ' · ' + perMile(fuelCost) + ' · ',
            el('span', { text: K.num2.format(Math.round(fuelCo2 * 10) / 10) + ' kg CO₂e', dataset: { k: 'ice-co2' } })));
        evBox.replaceChildren(el('h4', { text: 'Electric car' }),
          grid(card('Charging cost', isFinite(evCost) ? money2(evCost) : '—', 'ev-cost', true), card('Each person', money2(evCost / n), 'ev-pp')),
          el('p', { class: 'fn-muted' }, el('span', { text: K.num2.format(Math.round(drawn * 100) / 100) + ' kWh from the charger', dataset: { k: 'ev-kwh' } }), ' · ' + perMile(evCost) + ' · ',
            el('span', { text: K.num2.format(Math.round(evCo2 * 10) / 10) + ' kg CO₂e', dataset: { k: 'ev-co2' } })));
        var diff = fuelCost - evCost;
        verdict.replaceChildren(el('p', { class: 'fn-muted', text: 'For ' + distText + (n > 1 ? ', split ' + n + ' ways' : '') + ':' }),
          isFinite(diff) ? U.note((diff >= 0 ? 'The electric car is ' : 'The ' + fuel.value + ' car is ') + money2(Math.abs(diff)) + ' cheaper for this trip.', 'ok') : null);
      }
      U.live([distance, ret, people, eff, pump, evEff, evPrice, co2Fuel, co2Grid, loss], run);
      root.appendChild(U.panel('Journey', U.row(distance), unit, ret, U.row(people)));
      root.appendChild(el('div', { class: 'fb-side' },
        U.panel('Petrol or diesel', fuel, U.row(eff), effUnit, U.row(pump), U.note('Default price: rough UK average for mid-September 2026. Type what you pay.')),
        U.panel('Electric', U.row(evEff), evUnit, U.row(evPrice), evPresets, U.note(cap ? 'Home default: Ofgem price cap unit rate, ' + cap.period + ' (as of ' + cap.asOf + '). A smart EV tariff overnight is often much cheaper.' : 'Type your home electricity rate: a smart EV tariff overnight is often much cheaper.'))));
      root.appendChild(U.panel('Cost of the trip', verdict, el('div', { class: 'fb-side' }, iceBox, evBox)));
      root.appendChild(U.panel('CO₂ estimate', U.row(co2Fuel, co2Grid, loss),
        U.note('Rough figures from the UK government’s greenhouse gas conversion factors: about 2.07 kg CO₂e per litre of petrol, 2.58 per litre of diesel and 0.18 per kWh of grid electricity. Charging losses add to what the car uses. Tailpipe and grid only, not making the car or fuel.')));
    }
  });

  /* Kept so other modules (and tests) can reuse the figures. */
  window.FinKitB = { PROPERTY_TAX_RATES: PROPERTY_TAX_RATES, STATE_PENSION: STATE_PENSION, MINIMUM_WAGE: MINIMUM_WAGE, propertyTax: propertyTax };
})();
