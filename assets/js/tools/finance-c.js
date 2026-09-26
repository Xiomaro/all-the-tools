/* finance-c tools: a savings goal planner (by a date, or by a set amount a
   month) and a pay rise and overtime calculator. Builds on the helpers and
   charts finance.js exports as window.FinKit. UK take-home figures come from
   FinKit.ukTakeHome when finance.js shares it; otherwise the pay tool shows
   gross pay and points to UK Take-Home Pay. */
(function () {
  'use strict';
  var U = window.UI, el = U.el, K = window.FinKit;
  if (!K) return;

  var money0 = K.money0, money2 = K.money2, sym = K.sym, pct = K.pct, pctShow = K.pctShow, numIn = K.numIn, card = K.card, grid = K.grid,
    tabs = K.tabs, val = K.val, selVal = K.selVal, yearsMonths = K.yearsMonths, scrollTable = K.scrollTable, slider = K.slider;

  if (!document.getElementById('g-finc-style')) {
    document.head.appendChild(el('style', { id: 'g-finc-style', text: [
      '.g-finc .fc-ot{display:grid;grid-template-columns:minmax(0,1.4fr) repeat(2,minmax(0,1fr));gap:8px;align-items:end;padding-bottom:8px;border-bottom:1px solid var(--border);margin-bottom:8px}',
      '@media (max-width:560px){.g-finc .fc-ot{grid-template-columns:1fr 1fr}.g-finc .fc-ot>.fc-ot-name{grid-column:1/-1}}',
      '.g-finc .fc-ot-name{font-weight:600;padding-bottom:8px}',
      '.g-finc .fc-ot-name small{display:block;font-weight:400;color:var(--fg-muted)}',
      '.g-finc .fc-good{color:var(--ok);font-weight:600}',
      '.g-finc .fc-bad{color:var(--err);font-weight:600}',
      '.g-finc .fc-progress{height:12px;border-radius:6px;background:var(--bg-sunken);border:1px solid var(--border);overflow:hidden;margin:8px 0 4px}',
      '.g-finc .fc-progress i{display:block;height:100%;background:var(--fn-s3)}'
    ].join('\n') }));
  }

  function prep(root, regional) { K.prep(root, regional); root.classList.add('g-finc'); }
  /* Savings rates are AERs, so the monthly rate is the twelfth root (as in
     finance-b), and deposits go in at the end of each month. */
  function monthlyRate(aer) { return Math.pow(1 + aer / 100, 1 / 12) - 1; }
  function isoToday() { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function addMonths(months) { var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + months); return d; }
  function monthLabel(offset) { return addMonths(offset).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }); }
  /* Whole months from today to an ISO date (a part month does not count). */
  function monthsUntil(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return NaN;
    var now = new Date(), n = (+m[1] - now.getFullYear()) * 12 + (+m[2] - 1 - now.getMonth());
    if (+m[3] < now.getDate()) n--;
    return n;
  }
  /* replaceChildren would print a null as text, so drop the gaps first. */
  function fill(node) { node.replaceChildren.apply(node, Array.prototype.slice.call(arguments, 1).filter(function (k) { return k !== null && k !== undefined && k !== false; })); }

  /* ======================================================================= */
  /* Savings Goal Planner                                                    */
  /* ======================================================================= */

  /* Month-by-month balance with a fixed monthly deposit. Stops at `months`,
     or (when `until` is given) as soon as the balance reaches until(m). */
  function project(start, rateAer, monthly, months, until) {
    var g = monthlyRate(rateAer), bal = start, paid = start, rows = [{ m: 0, bal: bal, paid: paid }];
    for (var m = 1; m <= months; m++) {
      bal = bal * (1 + g) + monthly;
      paid += monthly;
      rows.push({ m: m, bal: bal, paid: paid });
      if (until && bal >= until(m)) break;
    }
    return rows;
  }
  /* Monthly deposit that turns `start` into `target` after n months. */
  function neededMonthly(start, target, rateAer, n) {
    var g = monthlyRate(rateAer), grow = Math.pow(1 + g, n);
    var factor = g === 0 ? n : (grow - 1) / g;
    return Math.max(0, (target - start * grow) / factor);
  }

  Tools.register({
    id: 'savings-goal', category: 'finance', name: 'Savings Goal Planner',
    description: 'How much to put away each week or month to reach a savings goal by a date, or when a set amount a month gets you there, with interest, inflation and milestones.',
    keywords: ['savings goal', 'save for', 'saving plan', 'how much to save', 'deposit', 'house deposit', 'holiday fund', 'emergency fund', 'target', 'monthly saving', 'weekly saving', 'isa', 'aer', 'inflation', 'milestones', 'sinking fund'],
    render: function (root) {
      prep(root, true);
      var mode = tabs([{ value: 'date', label: 'Reach it by a date' }, { value: 'amount', label: 'Save a set amount' }], function () { run(); }, 'date');
      var name = U.input({ label: 'What are you saving for?', value: 'House deposit', maxLength: 60 });
      var target = numIn('Goal', 20000, { min: 0, step: 100 }, { before: sym() });
      var start = numIn('Already saved', 2000, { min: 0, step: 50 }, { before: sym() });
      var def = new Date(); def.setFullYear(def.getFullYear() + 3);
      var deadline = U.input({ label: 'Reach it by', type: 'date', min: isoToday(), value: def.getFullYear() + '-' + pad2(def.getMonth() + 1) + '-' + pad2(def.getDate()) });
      var monthly = numIn('Save each month', 400, { min: 0, step: 10 }, { before: sym() });
      var rate = slider('Interest rate (AER)', 0, 10, 0.05, 4, pctShow, { after: '%' });
      var inflate = U.checkbox('The goal is in today’s money: raise it with inflation');
      var inflation = numIn('Inflation a year', 2.5, { min: -5, max: 30, step: 0.1 }, { after: '%' });
      var dateBox = el('div', null, deadline), amountBox = el('div', null, monthly), inflBox = el('div', null, inflation);
      var board = el('div'), milestones = el('div');
      var chart = K.lineChart(root);
      var lastRows = [];

      function run() {
        var G = val(target), P = val(start) || 0, r = rate.get() || 0, inf = inflate.input.checked ? (val(inflation) || 0) : 0;
        var label = (name.querySelector('input').value || '').trim() || 'your goal';
        dateBox.hidden = mode.value !== 'date';
        amountBox.hidden = mode.value !== 'amount';
        inflBox.hidden = !inflate.input.checked;
        milestones.replaceChildren(); lastRows = [];
        if (!(G > 0)) { board.replaceChildren(U.note('Enter the amount you want to save', 'err')); chart.update({}); return; }
        /* The goal in the pounds of month m. */
        var goalAt = function (m) { return G * Math.pow(1 + inf / 100, m / 12); };
        var rows, pay, months;

        if (mode.value === 'date') {
          months = monthsUntil(deadline.querySelector('input').value);
          if (!(months >= 1)) { board.replaceChildren(U.note('Pick a date at least a month from now', 'err')); chart.update({}); return; }
          if (months > 1200) { board.replaceChildren(U.note('Pick a date within 100 years', 'err')); chart.update({}); return; }
          var goal = goalAt(months);
          pay = neededMonthly(P, goal, r, months);
          rows = project(P, r, pay, months);
          var end = rows[rows.length - 1];
          fill(board,
            el('div', { class: 'fn-big', dataset: { k: 'monthly' }, text: money2(pay) }),
            el('div', { class: 'fn-muted', text: 'a month for ' + yearsMonths(months) + ' to reach ' + money0(goal) + ' for ' + label + ' by ' + monthLabel(months) }),
            grid(card('Each week', money2(pay * 12 / 52), 'weekly'),
              card('Each day', money2(pay * 12 / 365), 'daily'),
              card('You pay in', money0(end.paid - P), 'paidin'),
              card('Interest earned', money0(end.bal - end.paid), 'interest'),
              inf ? card('Goal after inflation', money0(goal), 'goal') : null),
            pay === 0 ? U.note('What you already have grows past the goal on its own by then.', 'ok') : null);
        } else {
          var m0 = val(monthly) || 0;
          rows = project(P, r, m0, 1200, goalAt);
          var last = rows[rows.length - 1];
          months = last.m;
          var reached = last.bal >= goalAt(months);
          if (P >= G) { months = 0; reached = true; }
          fill(board,
            el('div', { class: 'fn-big', dataset: { k: 'when' }, text: reached ? (months === 0 ? 'Already there' : monthLabel(months)) : 'Not within 100 years' }),
            el('div', { class: 'fn-muted', text: reached && months ? 'in ' + yearsMonths(months) + ', saving ' + money0(m0) + ' a month (' + money2(m0 * 12 / 52) + ' a week) for ' + label : 'Save more each month, or earn more interest, to get there.' }),
            reached && months ? grid(card('Time to goal', yearsMonths(months), 'time'),
              card('You pay in', money0(last.paid - P), 'paidin'),
              card('Interest earned', money0(last.bal - last.paid), 'interest'),
              inf ? card('Goal by then, after inflation', money0(goalAt(months)), 'goal') : null) : null);
          if (!reached || months === 0) { chart.update({}); return; }
        }
        lastRows = rows;

        /* Milestones: the month the balance first passes each quarter of the goal. */
        var marks = [0.25, 0.5, 0.75, 1].map(function (f) {
          for (var i = 0; i < rows.length; i++) if (rows[i].bal >= goalAt(rows[i].m) * f - 0.005) return { f: f, row: rows[i] };
          return { f: f, row: null };
        });
        milestones.replaceChildren(
          el('div', { class: 'fc-progress', title: 'Saved so far' }, el('i', { style: { width: Math.min(100, P / G * 100).toFixed(1) + '%' } })),
          el('p', { class: 'fn-muted', text: 'You have ' + pct(Math.min(100, P / G * 100), 0) + ' of the goal already.' }),
          scrollTable(['Milestone', 'Reached', 'Balance'], marks.map(function (mk) {
            return [pct(mk.f * 100, 0), mk.row ? (mk.row.m === 0 ? 'Already' : monthLabel(mk.row.m)) : '—', mk.row ? money0(mk.row.bal) : '—'];
          })));

        var step = rows.length > 120 ? 12 : 1;
        var pick = rows.filter(function (q, i) { return i % step === 0 || i === rows.length - 1; });
        chart.update({
          label: 'Savings balance by month',
          x: pick.map(function (q) { return q.m; }), xInteger: true,
          xFormat: function (v) { return v % 1 ? '' : v % 12 === 0 ? 'Yr ' + v / 12 : 'M' + v; },
          tipTitle: function (v) { return monthLabel(v); },
          series: [{ name: 'Balance', slot: 1, values: pick.map(function (q) { return q.bal; }) },
            { name: 'Paid in', slot: 2, values: pick.map(function (q) { return q.paid; }) },
            { name: 'Goal', slot: 3, values: pick.map(function (q) { return goalAt(q.m); }) }]
        });
      }
      U.live([name, target, start, deadline, monthly, rate, inflate, inflation], run);

      function csv() {
        return lastRows.length ? CSV.stringify([['Month', 'Date', 'Paid in', 'Balance']].concat(lastRows.map(function (q) {
          return [q.m, monthLabel(q.m), q.paid.toFixed(2), q.bal.toFixed(2)];
        }))) : '';
      }
      root.appendChild(U.panel(null, mode, name, U.row(target, start), dateBox, amountBox, rate, inflate, inflBox,
        U.note('Deposits go in at the end of each month and interest is compounded monthly from the AER. Tax on interest outside an ISA (beyond your Personal Savings Allowance) is not taken off.')));
      root.appendChild(U.panel(null, board));
      root.appendChild(U.panel('Balance over time', chart));
      root.appendChild(U.panel('Milestones', milestones, U.btnrow(U.downloadBtn('Download plan (CSV)', 'savings-plan.csv', csv, 'text/csv'))));
    }
  });

  /* ======================================================================= */
  /* Pay Rise & Overtime Calculator                                          */
  /* ======================================================================= */

  /* UK take-home for a gross salary, when finance.js shares its calculator:
     England, Wales and NI rates for the newest tax year, no pension or loan. */
  function takeHome(gross) {
    if (typeof K.ukTakeHome !== 'function' || !K.UK_TAX) return null;
    var year = Object.keys(K.UK_TAX)[0];
    try { return K.ukTakeHome({ gross: gross, year: year, scotland: false, pension: 0, pensionType: 'none' }).net; } catch (e) { return null; }
  }

  Tools.register({
    id: 'pay-rise-calculator', category: 'finance', name: 'Pay Rise & Overtime Calculator',
    description: 'What a pay rise is worth each year, month, week and hour, whether it beats inflation, and what overtime at time and a half or double time adds.',
    keywords: ['pay rise', 'salary increase', 'raise', 'percentage increase', 'real terms', 'inflation', 'cost of living', 'overtime', 'time and a half', 'double time', 'overtime pay', 'hourly rate', 'wage increase', 'promotion', 'pay award'],
    render: function (root) {
      prep(root, true);
      var basis = tabs([{ value: 'year', label: 'Annual salary' }, { value: 'hour', label: 'Hourly rate' }], function () { relabel(); run(); }, 'year');
      var current = numIn('Current salary (a year)', 32000, { min: 0, step: 'any' }, { before: sym() });
      var hours = numIn('Hours a week', 37.5, { min: 0.5, max: 100, step: 0.5 });
      var how = tabs([{ value: 'pct', label: 'Rise in %' }, { value: 'amount', label: 'Rise as an amount' }, { value: 'new', label: 'New pay' }], function () { relabel(); run(); }, 'pct');
      var rise = numIn('Pay rise', 4, { step: 'any' }, { after: '%' });
      var inflation = numIn('Inflation over the same year', 3, { min: -10, max: 50, step: 0.1 }, { after: '%' });
      var riseBox = el('div'), realBox = el('div'), taxBox = el('div');

      function relabel() {
        var hourly = basis.value === 'hour';
        current.querySelector('label').textContent = hourly ? 'Current hourly rate' : 'Current salary (a year)';
        var after = rise.querySelector('.fn-prefix span:last-child'), before = rise.querySelector('.fn-prefix span:first-child');
        rise.querySelector('label').textContent = how.value === 'pct' ? 'Pay rise' : how.value === 'amount' ? (hourly ? 'Rise an hour' : 'Rise a year') : (hourly ? 'New hourly rate' : 'New salary (a year)');
        before.textContent = how.value === 'pct' ? '' : sym();
        after.textContent = how.value === 'pct' ? '%' : '';
        before.hidden = how.value === 'pct';
        after.hidden = how.value !== 'pct';
      }
      /* numIn only builds a prefix wrapper when given one; give the rise both
         ends so relabel can swap % for the currency symbol. */
      (function () {
        var input = rise.input, wrapper = el('div', { class: 'fn-prefix' }, el('span', { text: '', hidden: true }), input, el('span', { text: '%' }));
        rise.querySelector('.fn-prefix').replaceWith(wrapper);
      })();

      /* Overtime: hours a week at each rate. */
      var otRows = [
        { label: 'Plain time', sub: '× 1', mult: 1, hours: 0 },
        { label: 'Time and a half', sub: '× 1.5', mult: 1.5, hours: 4 },
        { label: 'Double time', sub: '× 2', mult: 2, hours: 0 }
      ].map(function (o) {
        var h = numIn('Hours a week', o.hours, { min: 0, max: 100, step: 0.5 });
        var m = numIn('Rate multiplier', o.mult, { min: 0, max: 5, step: 0.05 });
        return { h: h, m: m, box: el('div', { class: 'fc-ot' }, el('div', { class: 'fc-ot-name' }, o.label, el('small', { text: 'normally ' + o.sub })), h, m) };
      });
      var otWeeks = numIn('Weeks a year you do overtime', 46, { min: 0, max: 52, step: 1 });
      var otOut = el('div');

      function run() {
        var hourly = basis.value === 'hour', h = val(hours), cur = val(current), r = val(rise), inf = val(inflation) || 0;
        if (!(cur > 0) || !(h > 0)) { riseBox.replaceChildren(U.note('Enter your current pay and hours', 'err')); realBox.replaceChildren(); taxBox.replaceChildren(); otOut.replaceChildren(); return; }
        if (!isFinite(r)) r = 0;
        var oldYear = hourly ? cur * h * 52 : cur;
        var newYear = how.value === 'pct' ? oldYear * (1 + r / 100)
          : how.value === 'amount' ? oldYear + (hourly ? r * h * 52 : r)
          : (hourly ? r * h * 52 : r);
        if (!(newYear >= 0)) newYear = 0;
        var diff = newYear - oldYear, risePct = diff / oldYear * 100;
        var per = function (y) { return { year: y, month: y / 12, week: y / 52, hour: y / 52 / h }; };
        var o = per(oldYear), n = per(newYear), d = per(diff);
        riseBox.replaceChildren(
          el('div', { class: 'fn-big', dataset: { k: 'pct' }, text: (diff >= 0 ? '+' : '') + pct(risePct, 2) }),
          el('div', { class: 'fn-muted', text: (diff >= 0 ? 'a rise of ' : 'a cut of ') + money0(Math.abs(diff)) + ' a year before tax' }),
          scrollTable(['', 'Before', 'After', 'Change'], [['year', 'A year'], ['month', 'A month'], ['week', 'A week'], ['hour', 'An hour']].map(function (p) {
            return [p[1], money2(o[p[0]]), el('span', { class: 'mono', text: money2(n[p[0]]), dataset: { k: 'new-' + p[0] } }),
              el('span', { class: 'mono', text: (d[p[0]] >= 0 ? '+' : '−') + money2(Math.abs(d[p[0]])), dataset: { k: 'diff-' + p[0] } })];
          })));

        /* Real terms: what the new pay buys compared with the old. */
        var real = ((1 + risePct / 100) / (1 + inf / 100) - 1) * 100;
        var keepUp = oldYear * (1 + inf / 100);
        realBox.replaceChildren(grid(
          card('Real-terms change', (real >= 0 ? '+' : '') + pct(real, 2), 'real', true),
          card('Needed to keep up with inflation', money0(keepUp), 'keepup'),
          card('New pay in today’s money', money0(newYear / (1 + inf / 100)), 'todays')),
          U.note(real >= 0.005 ? 'The rise beats inflation: your pay buys more than it did.' : real <= -0.005 ? 'The rise is below inflation: your pay buys less than it did, even though the number went up.' : 'The rise matches inflation: your pay buys about the same.', real >= 0.005 ? 'ok' : real <= -0.005 ? 'err' : ''));

        var tOld = takeHome(oldYear), tNew = takeHome(newYear);
        if (tOld === null) {
          taxBox.replaceChildren(U.note('These are gross figures, before tax. '), el('a', { href: '#/t/uk-take-home-pay', text: 'Work out take-home pay in UK Take-Home Pay →' }));
        } else {
          var kept = tNew - tOld;
          taxBox.replaceChildren(grid(
            card('Take-home before', money0(tOld / 12) + ' a month', 'net-old'),
            card('Take-home after', money0(tNew / 12) + ' a month', 'net-new', true),
            card('Extra take-home', money0(kept / 12) + ' a month', 'net-diff'),
            card('Share of the rise you keep', diff ? pct(kept / diff * 100, 0) : '—', 'kept')),
            U.note('UK take-home with England, Wales and Northern Ireland rates for ' + Object.keys(K.UK_TAX)[0] + ', no pension or student loan. '),
            el('a', { href: '#/t/uk-take-home-pay', text: 'Adjust for Scotland, pensions and loans in UK Take-Home Pay →' }));
        }

        /* Overtime is paid on the new hourly rate. */
        var base = n.hour, weeks = val(otWeeks) || 0, week = 0, extraHours = 0;
        var lines = otRows.map(function (row) {
          var hh = val(row.h) || 0, mm = val(row.m) || 0, pay = hh * base * mm;
          week += pay; extraHours += hh;
          return ['× ' + K.num2.format(mm),K.num2.format(hh) + ' h', money2(base * mm), money2(pay)];
        });
        var otYear = week * weeks;
        var tOt = tNew === null ? null : takeHome(newYear + otYear);
        otOut.replaceChildren(
          scrollTable(['Rate', 'Hours a week', 'Hourly', 'A week'], lines),
          grid(card('Overtime a week', money2(week), 'ot-week', true),
            card('Overtime a month (average)', money2(otYear / 12), 'ot-month'),
            card('Overtime a year', money0(otYear), 'ot-year'),
            card('Average hourly across all hours', extraHours + h > 0 ? money2((n.week + week) / (h + extraHours)) : '—', 'ot-avg'),
            tOt !== null ? card('Overtime you keep after tax', money0((tOt - tNew) / 12) + ' a month', 'ot-net') : null),
          U.note('Overtime is worked out on the new hourly rate of ' + money2(base) + ' (' + K.num2.format(h) + ' hours a week over 52 weeks). Your contract sets the actual multipliers: the law does not require time and a half.'));
      }

      U.live([current, hours, rise, inflation, otWeeks].concat(otRows.reduce(function (a, r) { return a.concat([r.h, r.m]); }, [])), run);
      relabel();
      run();
      root.appendChild(U.panel('Your pay', basis, U.row(current, hours), how, U.row(rise, inflation)));
      root.appendChild(U.panel('The rise', riseBox));
      root.appendChild(U.panel('Against inflation', realBox));
      root.appendChild(U.panel('Take-home', taxBox));
      root.appendChild(U.panel('Overtime', otRows.map(function (r) { return r.box; }), otWeeks, otOut));
    }
  });
})();
