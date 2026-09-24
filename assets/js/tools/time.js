/* Time & Date tools. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  /* --- shared styling ------------------------------------------------------ */

  document.head.appendChild(el('style', { text: [
    '.g-time .big { font-size: 34px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.15; }',
    '.g-time .mid { font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums; }',
    '.g-time .muted { color: var(--fg-muted); font-size: 13px; }',
    '.g-time .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; }',
    '.g-time .card { border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-elev); padding: 12px 14px; }',
    '.g-time .card h4 { margin: 0 0 4px; font-size: 14px; }',
    '.g-time .fmt { display: grid; grid-template-columns: 140px 1fr auto; gap: 6px 10px; align-items: center; }',
    '.g-time .fmt b { font-size: 13px; color: var(--fg-muted); font-weight: 600; }',
    '.g-time .fmt code { font-family: var(--mono); word-break: break-all; }',
    '.g-time .bar { height: 12px; border-radius: 6px; background: var(--bg-sunken); overflow: hidden; position: relative; }',
    '.g-time .bar > i { position: absolute; top: 0; bottom: 0; background: var(--accent); border-radius: 6px; }',
    '.g-time .ticks { display: flex; justify-content: space-between; font-size: 11px; color: var(--fg-muted); margin-top: 4px; }',
    '.g-time .cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; max-width: 360px; text-align: center; }',
    '.g-time .cal span { padding: 6px 0; border-radius: 6px; font-variant-numeric: tabular-nums; }',
    '.g-time .cal .hd { font-size: 12px; color: var(--fg-muted); font-weight: 600; }',
    '.g-time .cal .on { background: var(--accent); color: var(--accent-fg); font-weight: 700; }',
    '.g-time .cal .past { color: var(--fg-muted); }',
    '.g-time .count { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center; }',
    '.g-time .count div { border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 4px; background: var(--bg-elev); }',
    '.g-time .count b { display: block; font-size: 38px; font-variant-numeric: tabular-nums; }',
    '.g-time .moon { font-size: 80px; line-height: 1; }',
    '.g-time .timeinputs { display: flex; gap: 6px; align-items: flex-end; }',
    '.g-time .timeinputs input { width: 80px; }',
    '.g-time .cc-board { display: grid; gap: 8px; user-select: none; }',
    '.g-time .cc-side { border-radius: var(--radius); border: 2px solid var(--border); background: var(--bg-sunken); min-height: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; padding: 12px; }',
    '.g-time .cc-side.active { background: var(--accent); color: var(--accent-fg); border-color: var(--accent); }',
    '.g-time .cc-side.low { box-shadow: inset 0 0 0 4px var(--err); }',
    '.g-time .cc-side.flag { background: var(--err); color: #fff; }',
    '.g-time .cc-side .t { font-size: 64px; font-weight: 700; font-variant-numeric: tabular-nums; }',
    '.g-time .cc-side .n { font-size: 14px; opacity: .85; }',
    '.g-time .cc-side.flip .t { transform: rotate(180deg); }',
    '.g-time .cc-full { position: fixed; inset: 0; z-index: 50; background: var(--bg); padding: 12px; display: flex; flex-direction: column; gap: 8px; }',
    '.g-time .cc-full .cc-board { flex: 1; }',
    '.g-time .cc-full .cc-side { min-height: 0; }',
    '.g-time .daynight { font-size: 12px; }'
  ].join('\n') }));

  function pad(n, w) { return String(n).padStart(w || 2, '0'); }
  /* UK conventions throughout: 22 September 2026, dd/mm/yyyy, 24-hour times
     and Monday-first weeks. Names are built by hand so the output does not
     shift with the browser's ICU version. */
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function fmtNum(n) { return Number(n).toLocaleString('en-GB'); }
  function val(node) { return (node.querySelector ? (node.querySelector('input, select, textarea') || node) : node).value; }
  function inp(node) { return node.querySelector ? (node.querySelector('input, select, textarea') || node) : node; }
  function setVal(node, v) { inp(node).value = v; }

  function parseDate(s) {
    var m = /^(\d{4,6})-(\d{2})-(\d{2})$/.exec(String(s || '').trim());
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    if (m[1].length === 4) d.setFullYear(+m[1]);
    return isNaN(d) ? null : d;
  }
  function isoDate(d) { return pad(d.getFullYear(), 4) + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function localDT(d) { return isoDate(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function longDate(d) { return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function weekday(d) { return DAYS[d.getDay()]; }
  function ukDate(d) { return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); }
  function hhmm(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function dayMonth(d) { return d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3); }
  function dayMs(a, b) { return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000); }
  function daysInYear(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365; }
  function dayOfYear(d) { return dayMs(new Date(d.getFullYear(), 0, 1), d) + 1; }

  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    var yStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return { week: Math.ceil(((t - yStart) / 86400000 + 1) / 7), year: t.getUTCFullYear() };
  }
  function isoWeekStart(year, week) {
    var jan4 = new Date(year, 0, 4);
    var day = jan4.getDay() || 7;
    var mon = new Date(year, 0, 4 - day + 1);
    mon.setDate(mon.getDate() + (week - 1) * 7);
    return mon;
  }
  function isoWeeksInYear(y) { return isoWeek(new Date(y, 11, 28)).week; }

  /* Calendar difference (years, months, days) between two dates, a <= b. */
  function ymd(a, b) {
    var years = b.getFullYear() - a.getFullYear();
    var months = b.getMonth() - a.getMonth();
    var days = b.getDate() - a.getDate();
    if (days < 0) { months--; days += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); }
    if (months < 0) { years--; months += 12; }
    return { years: years, months: months, days: days };
  }

  function plural(n, word) { return n + ' ' + word + (Math.abs(n) === 1 ? '' : 's'); }

  function relative(ms) {
    var diff = ms - Date.now();
    var abs = Math.abs(diff) / 1000;
    if (abs < 45) return 'just now';
    var steps = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
    for (var i = 0; i < steps.length; i++) {
      var n = Math.floor(abs / steps[i][1]);
      if (n >= 1) return diff < 0 ? plural(n, steps[i][0]) + ' ago' : 'in ' + plural(n, steps[i][0]);
    }
    return 'just now';
  }

  /* --- time zone arithmetic ---------------------------------------------- */

  var dtfCache = {};
  function zoneParts(zone, date) {
    var f = dtfCache[zone] || (dtfCache[zone] = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }));
    var o = {};
    f.formatToParts(date).forEach(function (p) { o[p.type] = p.value; });
    return { y: +o.year, mo: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second };
  }
  /* Offset in minutes (east positive) of zone at instant. */
  function zoneOffset(zone, date) {
    var p = zoneParts(zone, date);
    var asUTC = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
    return Math.round((asUTC - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  }
  /* A wall-clock time in a zone -> the real instant. */
  function zonedToUtc(zone, y, mo, d, h, mi) {
    var guess = Date.UTC(y, mo - 1, d, h, mi);
    var off = zoneOffset(zone, new Date(guess));
    var t = guess - off * 60000;
    var off2 = zoneOffset(zone, new Date(t));
    if (off2 !== off) t = guess - off2 * 60000;
    return new Date(t);
  }
  function offsetDecimal(min) {
    var h = min / 60;
    return 'UTC' + (h >= 0 ? '+' : '') + (Number.isInteger(h) ? h : +h.toFixed(2));
  }
  function offsetClock(min) {
    var sign = min >= 0 ? '+' : '-';
    var a = Math.abs(min);
    return 'UTC' + sign + Math.floor(a / 60) + (a % 60 ? ':' + pad(a % 60) : '');
  }
  function time12(zone, date, seconds) {
    return date.toLocaleTimeString('en-US', { timeZone: zone, hour: '2-digit', minute: '2-digit', second: seconds ? '2-digit' : undefined, hour12: true });
  }
  function time24(zone, date, seconds) {
    return date.toLocaleTimeString('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', second: seconds ? '2-digit' : undefined, hour12: false });
  }
  function shortDay(zone, date) {
    var p = zoneParts(zone, date);
    var wd = new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay();
    return DAYS[wd].slice(0, 3) + ' ' + p.d + ' ' + MONTHS[p.mo - 1].slice(0, 3);
  }

  var TZ21 = [
    ['Pacific/Honolulu', 'Honolulu', 'HST'], ['America/Anchorage', 'Alaska', 'AKST'],
    ['America/Los_Angeles', 'Los Angeles', 'PST'], ['America/Denver', 'Denver', 'MST'],
    ['America/Chicago', 'Chicago', 'CST'], ['America/New_York', 'New York', 'EST'],
    ['America/Toronto', 'Toronto', 'EST'], ['America/Sao_Paulo', 'São Paulo', 'BRT'],
    ['Europe/London', 'London', 'GMT'], ['Europe/Paris', 'Paris', 'CET'],
    ['Europe/Berlin', 'Berlin', 'CET'], ['Europe/Moscow', 'Moscow', 'MSK'],
    ['Asia/Dubai', 'Dubai', 'GST'], ['Asia/Karachi', 'Karachi', 'PKT'],
    ['Asia/Kolkata', 'India', 'IST'], ['Asia/Dhaka', 'Dhaka', 'BST'],
    ['Asia/Bangkok', 'Bangkok', 'ICT'], ['Asia/Shanghai', 'Shanghai', 'CST'],
    ['Asia/Tokyo', 'Tokyo', 'JST'], ['Australia/Sydney', 'Sydney', 'AEDT'],
    ['Pacific/Auckland', 'Auckland', 'NZDT']
  ];

  Tools.register({
    id: 'timestamp-converter', category: 'time', name: 'Timestamp Converter',
    description: 'Turn Unix timestamps into readable dates and dates back into timestamps.',
    keywords: ['timestamp', 'unix', 'epoch', 'date', 'convert', 'iso 8601', 'milliseconds'],
    render: function (root) {
      root.classList.add('g-time');
      var now = new Date();
      var stamp = U.input({ label: 'Unix Timestamp', type: 'number', value: String(Math.floor(now.getTime() / 1000)) });
      var picker = U.input({ label: 'Date & Time', type: 'datetime-local', step: '1', value: localDT(now) });
      var live = el('div', { class: 'muted' });
      var formats = el('div', { class: 'fmt' });
      var status = U.note('');
      var current = now;

      function show(date) {
        current = date;
        formats.replaceChildren();
        if (!date || isNaN(date)) return;
        var rows = [
          ['ISO 8601', date.toISOString()],
          ['UTC', date.toUTCString()],
          ['Local', ukDate(date) + ' ' + hhmm(date) + ':' + pad(date.getSeconds())],
          ['Date Only', ukDate(date)],
          ['Time Only', hhmm(date) + ':' + pad(date.getSeconds())],
          ['Unix (s)', String(Math.floor(date.getTime() / 1000))],
          ['Unix (ms)', String(date.getTime())],
          ['Day of Week', weekday(date)],
          ['Relative', relative(date.getTime())]
        ];
        rows.forEach(function (r) {
          formats.append(el('b', { text: r[0] }), el('code', { dataset: { fmt: r[0] }, text: r[1] }), U.copyBtn('Copy', r[1]));
        });
      }

      function fromStamp() {
        var raw = String(val(stamp)).trim();
        if (!raw) { status.textContent = ''; formats.replaceChildren(); return; }
        var n = Number(raw);
        if (!isFinite(n)) { status.className = 'note err'; status.textContent = 'Enter a number.'; return; }
        var isMs = Math.abs(n) >= 1e11;
        var d = new Date(isMs ? n : n * 1000);
        if (isNaN(d)) { status.className = 'note err'; status.textContent = 'That timestamp is out of range.'; formats.replaceChildren(); return; }
        status.className = 'note';
        status.textContent = 'Read as ' + (isMs ? 'milliseconds' : 'seconds') + ' since 1 January 1970 UTC.';
        show(d);
      }
      function fromDate() {
        var v = val(picker);
        if (!v) return;
        var d = new Date(v);
        if (isNaN(d)) { status.className = 'note err'; status.textContent = 'Invalid date.'; return; }
        setVal(stamp, Math.floor(d.getTime() / 1000));
        status.className = 'note'; status.textContent = '';
        show(d);
      }

      function tick() { live.textContent = 'Current Unix time: ' + Math.floor(Date.now() / 1000); }
      tick();
      var timer = setInterval(function () { tick(); if (current && !isNaN(current)) { var r = formats.querySelector('[data-fmt="Relative"]'); if (r) r.textContent = relative(current.getTime()); } }, 1000);
      U.onTeardown(root, function () { clearInterval(timer); });

      root.appendChild(U.panel(null, live,
        U.row(stamp, U.button('Now', function () {
          var d = new Date(); setVal(stamp, Math.floor(d.getTime() / 1000)); setVal(picker, localDT(d)); show(d);
        }), U.button('Convert to Date', function () { fromStamp(); var d = current; if (d && !isNaN(d)) setVal(picker, localDT(d) + ':' + pad(d.getSeconds())); }, 'primary')),
        U.row(picker, U.button('Convert to Unix', fromDate, 'primary')), status));
      root.appendChild(U.panel('All Formats', formats));
      inp(stamp).addEventListener('input', function () { fromStamp(); var d = current; if (d && !isNaN(d)) setVal(picker, localDT(d) + ':' + pad(d.getSeconds())); });
      inp(picker).addEventListener('input', fromDate);
      show(now);
    }
  });

  Tools.register({
    id: 'date-difference', category: 'time', name: 'Date Difference',
    description: 'Count the days, weeks, months and years between two dates.',
    keywords: ['days between', 'date difference', 'duration', 'how many days', 'weeks between'],
    render: function (root) {
      root.classList.add('g-time');
      var today = new Date();
      var next = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
      var a = U.input({ label: 'Start Date', type: 'date', value: isoDate(today) });
      var b = U.input({ label: 'End Date', type: 'date', value: isoDate(next) });
      var head = el('p', { class: 'mid' });
      var board = el('div');
      var total = el('p', { class: 'muted' });

      function draw() {
        var s = parseDate(val(a)), e = parseDate(val(b));
        board.replaceChildren(); head.textContent = ''; total.textContent = '';
        if (!s || !e) { head.textContent = 'Pick two dates.'; return; }
        var days = dayMs(s, e);
        var neg = days < 0;
        var lo = neg ? e : s, hi = neg ? s : e;
        var c = ymd(lo, hi);
        var sign = neg ? -1 : 1;
        var ad = Math.abs(days);
        head.textContent = longDate(s) + ' → ' + longDate(e);
        board.appendChild(U.stats([
          { label: 'Days', value: fmtNum(days) },
          { label: 'Weeks', value: fmtNum(sign * Math.floor(ad / 7)) },
          { label: 'Months', value: fmtNum(sign * (c.years * 12 + c.months)) },
          { label: 'Years', value: fmtNum(sign * c.years) },
          { label: 'Hours', value: fmtNum(days * 24) },
          { label: 'Minutes', value: fmtNum(days * 1440) }
        ]));
        board.appendChild(el('p', { text: (neg ? '−' : '') + plural(c.years, 'year') + ', ' + plural(c.months, 'month') + ', ' + plural(c.days, 'day') +
          (ad % 7 ? ' · ' + Math.floor(ad / 7) + ' weeks and ' + plural(ad % 7, 'day') : '') }));
        total.textContent = fmtNum(days * 86400) + ' seconds total';
      }
      U.live([a, b], draw);
      root.appendChild(U.panel(null, U.row(a, b),
        U.btnrow(U.button('Today as Start', function () { setVal(a, isoDate(new Date())); draw(); }),
                 U.button('Today as End', function () { setVal(b, isoDate(new Date())); draw(); }),
                 U.button('Swap', function () { var t = val(a); setVal(a, val(b)); setVal(b, t); draw(); }, 'ghost'))));
      root.appendChild(U.panel(null, head, board, total));
    }
  });

  Tools.register({
    id: 'date-add-subtract', category: 'time', name: 'Date Add/Subtract',
    description: 'Add or take away minutes, hours, days, weeks, months or years from a date.',
    keywords: ['add days', 'subtract days', 'date calculator', 'days from today', 'future date'],
    render: function (root) {
      root.classList.add('g-time');
      var start = U.input({ label: 'Start Date', type: 'date', value: isoDate(new Date()) });
      var mode = U.chips([{ value: 'add', label: '+ Add' }, { value: 'sub', label: '- Subtract' }], function () { draw(); }, 'add');
      var amount = U.input({ label: 'Amount', type: 'number', value: '30', min: '1' });
      var unit = U.select({ label: 'Unit', options: ['minutes', 'hours', 'days', 'weeks', 'months', 'years'], value: 'days' });
      var line = el('p', { class: 'muted' });
      var big = el('p', { class: 'big' });
      var iso = el('p', { class: 'mono' });
      var board = el('div');

      function addUnits(d, n, u) {
        var r = new Date(d.getTime());
        if (u === 'minutes') r.setMinutes(r.getMinutes() + n);
        else if (u === 'hours') r.setHours(r.getHours() + n);
        else if (u === 'days') r.setDate(r.getDate() + n);
        else if (u === 'weeks') r.setDate(r.getDate() + n * 7);
        else {
          var day = r.getDate();
          r.setDate(1);
          if (u === 'months') r.setMonth(r.getMonth() + n); else r.setFullYear(r.getFullYear() + n);
          var last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
          r.setDate(Math.min(day, last));
        }
        return r;
      }

      function draw() {
        var d = parseDate(val(start));
        var n = Math.floor(Number(val(amount)));
        board.replaceChildren();
        if (!d || !isFinite(n)) { line.textContent = 'Pick a date and an amount.'; big.textContent = ''; iso.textContent = ''; return; }
        var u = val(unit);
        var signed = mode.value === 'sub' ? -n : n;
        var r = addUnits(d, signed, u);
        if (isNaN(r)) { line.textContent = 'That is outside the range of dates a browser can handle.'; big.textContent = ''; iso.textContent = ''; return; }
        line.textContent = longDate(d) + ' ' + (mode.value === 'sub' ? '-' : '+') + ' ' + n + ' ' + (n === 1 ? u.replace(/s$/, '') : u) + ' =';
        var timed = u === 'minutes' || u === 'hours';
        big.textContent = longDate(r) + (timed ? ', ' + hhmm(r) : '');
        iso.textContent = isoDate(r) + (timed ? ' ' + pad(r.getHours()) + ':' + pad(r.getMinutes()) : '');
        var days = Math.abs(dayMs(d, r));
        var c = ymd(d < r ? d : r, d < r ? r : d);
        board.appendChild(U.stats([
          { label: 'Days', value: fmtNum(days) },
          { label: 'Weeks', value: fmtNum(Math.floor(days / 7)) },
          { label: 'Months', value: fmtNum(c.years * 12 + c.months) }
        ]));
      }
      var quick = el('div', { class: 'chips' }, [[1, 'days', '1 day'], [7, 'days', '7 days'], [30, 'days', '30 days'], [90, 'days', '90 days'], [1, 'years', '1 year']].map(function (q) {
        return el('button', { class: 'chip', type: 'button', onclick: function () { setVal(amount, q[0]); setVal(unit, q[1]); draw(); } }, q[2]);
      }));
      U.live([start, amount, unit], draw);
      root.appendChild(U.panel(null, start, mode, U.row(amount, unit), quick));
      root.appendChild(U.panel(null, line, big, iso, board));
    }
  });

  Tools.register({
    id: 'timezone-converter', category: 'time', name: 'Time Zone Converter',
    description: 'Convert a date and time from one world time zone to several others at once.',
    /* Multi-Timezone Converter was merged into this tool; its name and
       keywords stay here so search still finds it. */
    keywords: ['timezone', 'time zone', 'convert', 'world', 'utc', 'gmt', 'meeting', 'multi-timezone converter',
      'multiple time zones', 'meeting planner'],
    render: function (root) {
      root.classList.add('g-time');
      var now = new Date();
      var when = U.input({ label: 'Date & Time', type: 'datetime-local', value: localDT(now) });
      var from = U.select({ label: 'From Timezone', options: TZ21.map(function (z) { return { value: z[0], label: z[1] + ' (' + z[2] + ')' }; }), value: 'America/New_York' });
      var shown = { 'America/Los_Angeles': 1, 'Europe/London': 1, 'Asia/Kolkata': 1, 'Asia/Tokyo': 1 };
      var chipWrap = el('div', { class: 'chips' });
      TZ21.forEach(function (z) {
        var chip = el('button', { class: 'chip' + (shown[z[0]] ? ' on' : ''), type: 'button', dataset: { zone: z[0] }, onclick: function () {
          if (shown[z[0]]) delete shown[z[0]]; else shown[z[0]] = 1;
          chip.classList.toggle('on', !!shown[z[0]]);
          draw();
        } }, z[1]);
        chipWrap.appendChild(chip);
      });
      var cards = el('div', { class: 'cards' });
      var status = U.note('');
      var h12 = U.checkbox('12-hour clock');

      function draw() {
        var v = val(when);
        var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v);
        cards.replaceChildren();
        if (!m) { status.textContent = 'Pick a date and time.'; return; }
        status.textContent = '';
        var zone = val(from);
        var instant = zonedToUtc(zone, +m[1], +m[2], +m[3], +m[4], +m[5]);
        var fz = TZ21.filter(function (z) { return z[0] === zone; })[0];
        status.textContent = m[4] + ':' + m[5] + ' in ' + fz[1] + ' (' + offsetDecimal(zoneOffset(zone, instant)) + ') is ' +
          instant.toISOString().slice(11, 16) + ' UTC.';
        TZ21.forEach(function (z) {
          if (!shown[z[0]]) return;
          var off = zoneOffset(z[0], instant);
          cards.appendChild(el('div', { class: 'card', dataset: { zone: z[0] } },
            el('h4', { text: z[1] + ' (' + z[2] + ')' }),
            el('div', { class: 'mid tz-time', text: h12.input.checked ? time12(z[0], instant) : time24(z[0], instant) }),
            el('div', { class: 'muted', text: shortDay(z[0], instant) }),
            el('div', { class: 'muted', text: offsetDecimal(off) })));
        });
        if (!cards.children.length) cards.appendChild(U.note('Choose at least one time zone to show.'));
      }
      U.live([when, from, h12], draw);

      root.appendChild(U.panel(null, U.row(when, from, U.button('Now', function () { setVal(when, localDT(new Date())); draw(); }), h12), status));
      root.appendChild(U.panel('Show Timezones', chipWrap));
      root.appendChild(U.panel(null, cards));
    }
  });

  var ZODIAC = [
    [1, 20, 'Capricorn'], [2, 19, 'Aquarius'], [3, 20, 'Pisces'], [4, 20, 'Aries'], [5, 21, 'Taurus'], [6, 21, 'Gemini'],
    [7, 22, 'Cancer'], [8, 23, 'Leo'], [9, 23, 'Virgo'], [10, 23, 'Libra'], [11, 22, 'Scorpio'], [12, 22, 'Sagittarius'], [12, 32, 'Capricorn']
  ];
  function zodiac(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    for (var i = 0; i < ZODIAC.length; i++) {
      if (m < ZODIAC[i][0] || (m === ZODIAC[i][0] && day < ZODIAC[i][1])) return ZODIAC[i][2];
    }
    return 'Capricorn';
  }

  Tools.register({
    id: 'age-calculator', category: 'time', name: 'Age Calculator',
    description: 'Work out an exact age from a date of birth, with totals and the next birthday.',
    keywords: ['age', 'birthday', 'calculate', 'how old', 'date of birth', 'zodiac'],
    render: function (root) {
      root.classList.add('g-time');
      var birth = U.input({ label: 'Date of Birth', type: 'date', value: '1990-01-01' });
      var at = U.input({ label: 'Age at Date', type: 'date', value: isoDate(new Date()) });
      var out = el('div');
      function draw() {
        var b = parseDate(val(birth)), t = parseDate(val(at));
        out.replaceChildren();
        if (!b || !t) { out.appendChild(U.note('Pick a date of birth.')); return; }
        if (b > t) { out.appendChild(U.note('The date of birth is after the date you are measuring to.', 'err')); return; }
        var c = ymd(b, t);
        var days = dayMs(b, t);
        var next = new Date(t.getFullYear(), b.getMonth(), b.getDate());
        if (b.getMonth() === 1 && b.getDate() === 29 && next.getMonth() !== 1) next = new Date(t.getFullYear(), 2, 1);
        if (next < t) next = new Date(t.getFullYear() + 1, b.getMonth(), b.getDate());
        var toBday = dayMs(t, next);
        out.append(
          el('p', { class: 'muted', text: 'Exact Age' }),
          el('p', { class: 'big', text: plural(c.years, 'year') }),
          el('p', { class: 'mid', text: plural(c.months, 'month') + ', ' + plural(c.days, 'day') }),
          U.stats([
            { label: 'Total Days', value: fmtNum(days) },
            { label: 'Total Weeks', value: fmtNum(Math.floor(days / 7)) },
            { label: 'Total Months', value: fmtNum(c.years * 12 + c.months) },
            { label: 'Total Hours', value: fmtNum(days * 24) },
            { label: 'Days to Birthday', value: toBday === 0 ? 'Today! 🎂' : fmtNum(toBday) },
            { label: 'Zodiac Sign', value: zodiac(b) }
          ]),
          el('p', { text: 'You were born on a ' + weekday(b) }),
          el('p', { class: 'muted', text: 'Next birthday: ' + longDate(next) + ' (turning ' + (next.getFullYear() - b.getFullYear()) + ')' }));
      }
      U.live([birth, at], draw);
      root.appendChild(U.panel(null, U.row(birth, at)));
      root.appendChild(U.panel(null, out));
    }
  });

  Tools.register({
    id: 'countdown-timer', category: 'time', name: 'Countdown Timer',
    description: 'Count down the days, hours, minutes and seconds to any date and time.',
    keywords: ['countdown', 'timer', 'date', 'days until', 'event'],
    render: function (root) {
      root.classList.add('g-time');
      var name = U.input({ label: 'Event Name', placeholder: 'My Event', value: 'My Event' });
      var d0 = new Date(); d0.setDate(d0.getDate() + 30);
      var target = U.input({ label: 'Target Date & Time', type: 'datetime-local', value: localDT(d0) });
      var paused = false, frozen = null;
      var pauseBtn = U.button('Pause', function () {
        paused = !paused;
        frozen = paused ? Date.now() : null;
        pauseBtn.textContent = paused ? 'Resume' : 'Pause';
        tick();
      });
      var title = el('h3', { class: 'mid' });
      var cells = {};
      var grid = el('div', { class: 'count' }, ['Days', 'Hours', 'Mins', 'Secs'].map(function (k) {
        cells[k] = el('b', { text: '0' });
        return el('div', cells[k], el('span', { class: 'muted', text: k }));
      }));
      var done = el('p', { class: 'mid' });

      function tick() {
        title.textContent = val(name) || 'My Event';
        var t = new Date(val(target));
        if (isNaN(t)) { done.textContent = 'Pick a target date.'; return; }
        var nowMs = paused ? frozen : Date.now();
        var left = Math.max(0, t.getTime() - nowMs);
        var s = Math.floor(left / 1000);
        cells.Days.textContent = Math.floor(s / 86400);
        cells.Hours.textContent = pad(Math.floor(s / 3600) % 24);
        cells.Mins.textContent = pad(Math.floor(s / 60) % 60);
        cells.Secs.textContent = pad(s % 60);
        done.textContent = left === 0 ? '🎉 ' + (val(name) || 'The event') + ' is here!' :
          (paused ? 'Paused · ' : '') + longDate(t) + ' at ' + hhmm(t);
      }
      var timer = setInterval(tick, 250);
      U.onTeardown(root, function () { clearInterval(timer); });
      U.live([name, target], tick);

      function nextOccurrence(month, day) {
        var n = new Date();
        var d = new Date(n.getFullYear(), month, day);
        if (d <= n) d = new Date(n.getFullYear() + 1, month, day);
        return d;
      }
      var presets = [['New Year', 0, 1], ['Christmas', 11, 25], ['Halloween', 9, 31], ["Valentine's Day", 1, 14]].map(function (p) {
        var d = nextOccurrence(p[1], p[2]);
        return el('button', { class: 'chip', type: 'button', onclick: function () {
          setVal(name, p[0] + ' ' + d.getFullYear()); setVal(target, localDT(d)); tick();
        } }, p[0] + ' ' + d.getFullYear());
      });
      root.appendChild(U.panel(null, U.row(name, target, pauseBtn)));
      root.appendChild(U.panel(null, title, grid, done));
      root.appendChild(U.panel('Quick Presets', el('div', { class: 'chips' }, presets)));
    }
  });

  var CITIES = [
    ['🌐', 'UTC', 'UTC', 'Coordinated Universal Time'],
    ['🇺🇸', 'New York', 'America/New_York'], ['🇬🇧', 'London', 'Europe/London'], ['🇮🇸', 'Reykjavik', 'Atlantic/Reykjavik'],
    ['🇬🇭', 'Accra', 'Africa/Accra'], ['🇫🇷', 'Paris', 'Europe/Paris'], ['🇩🇪', 'Berlin', 'Europe/Berlin'],
    ['🇷🇺', 'Moscow', 'Europe/Moscow'], ['🇦🇪', 'Dubai', 'Asia/Dubai'], ['🇮🇳', 'Mumbai', 'Asia/Kolkata'],
    ['🇸🇬', 'Singapore', 'Asia/Singapore'], ['🇯🇵', 'Tokyo', 'Asia/Tokyo'], ['🇦🇺', 'Sydney', 'Australia/Sydney'],
    ['🇺🇸', 'Los Angeles', 'America/Los_Angeles'], ['🇺🇸', 'Chicago', 'America/Chicago'], ['🇧🇷', 'São Paulo', 'America/Sao_Paulo'],
    ['🇨🇦', 'Toronto', 'America/Toronto'], ['🇰🇷', 'Seoul', 'Asia/Seoul'], ['🇨🇳', 'Beijing', 'Asia/Shanghai'],
    ['🇪🇬', 'Cairo', 'Africa/Cairo'], ['🇲🇽', 'Mexico City', 'America/Mexico_City'], ['🇮🇩', 'Jakarta', 'Asia/Jakarta'],
    ['🇳🇿', 'Auckland', 'Pacific/Auckland']
  ];
  var MORE_CITIES = [
    ['🇺🇸', 'Honolulu', 'Pacific/Honolulu'], ['🇺🇸', 'Anchorage', 'America/Anchorage'], ['🇺🇸', 'Denver', 'America/Denver'],
    ['🇺🇸', 'Phoenix', 'America/Phoenix'], ['🇨🇦', 'Vancouver', 'America/Vancouver'], ['🇦🇷', 'Buenos Aires', 'America/Argentina/Buenos_Aires'],
    ['🇨🇱', 'Santiago', 'America/Santiago'], ['🇨🇴', 'Bogotá', 'America/Bogota'], ['🇵🇪', 'Lima', 'America/Lima'],
    ['🇮🇪', 'Dublin', 'Europe/Dublin'], ['🇵🇹', 'Lisbon', 'Europe/Lisbon'], ['🇪🇸', 'Madrid', 'Europe/Madrid'],
    ['🇮🇹', 'Rome', 'Europe/Rome'], ['🇳🇱', 'Amsterdam', 'Europe/Amsterdam'], ['🇸🇪', 'Stockholm', 'Europe/Stockholm'],
    ['🇵🇱', 'Warsaw', 'Europe/Warsaw'], ['🇬🇷', 'Athens', 'Europe/Athens'], ['🇹🇷', 'Istanbul', 'Europe/Istanbul'],
    ['🇺🇦', 'Kyiv', 'Europe/Kyiv'], ['🇿🇦', 'Johannesburg', 'Africa/Johannesburg'], ['🇳🇬', 'Lagos', 'Africa/Lagos'],
    ['🇰🇪', 'Nairobi', 'Africa/Nairobi'], ['🇸🇦', 'Riyadh', 'Asia/Riyadh'], ['🇮🇷', 'Tehran', 'Asia/Tehran'],
    ['🇵🇰', 'Karachi', 'Asia/Karachi'], ['🇳🇵', 'Kathmandu', 'Asia/Kathmandu'], ['🇧🇩', 'Dhaka', 'Asia/Dhaka'],
    ['🇹🇭', 'Bangkok', 'Asia/Bangkok'], ['🇻🇳', 'Ho Chi Minh City', 'Asia/Ho_Chi_Minh'], ['🇭🇰', 'Hong Kong', 'Asia/Hong_Kong'],
    ['🇹🇼', 'Taipei', 'Asia/Taipei'], ['🇵🇭', 'Manila', 'Asia/Manila'], ['🇦🇺', 'Perth', 'Australia/Perth'],
    ['🇦🇺', 'Adelaide', 'Australia/Adelaide'], ['🇦🇺', 'Brisbane', 'Australia/Brisbane'], ['🇫🇯', 'Fiji', 'Pacific/Fiji']
  ];
  function zoneExists(z) { try { new Intl.DateTimeFormat('en-US', { timeZone: z }); return true; } catch (e) { return false; } }

  Tools.register({
    id: 'world-clock', category: 'time', name: 'World Clock',
    description: 'Live clocks for cities around the world, with offsets and day or night.',
    keywords: ['time', 'world', 'timezone', 'world clock', 'current time', 'cities'],
    render: function (root) {
      root.classList.add('g-time');
      var search = U.input({ type: 'search', placeholder: 'Search cities, or an offset like UTC+1...' });
      var h24 = U.checkbox('24-hour clock', { checked: true });
      var grid = el('div', { class: 'cards' });
      var all = CITIES.concat(MORE_CITIES).filter(function (c) { return zoneExists(c[2]); });

      function noDst(zone, now) {
        var y = now.getUTCFullYear();
        var a = zoneOffset(zone, new Date(Date.UTC(y, 0, 15))), b = zoneOffset(zone, new Date(Date.UTC(y, 6, 15)));
        return a === b ? a : null;
      }
      function draw() {
        var now = new Date();
        var q = String(val(search)).trim().toLowerCase().replace(/\s+/g, '');
        var list = q ? all : CITIES;
        grid.replaceChildren();
        list.forEach(function (c) {
          var off = zoneOffset(c[2], now);
          var offText = offsetClock(off);
          if (q) {
            var hay = (c[1] + ' ' + c[2] + ' ' + offText + ' ' + (c[3] || '')).toLowerCase().replace(/\s+/g, '');
            var qq = q.replace(/^gmt/, 'utc');
            if (hay.indexOf(qq) === -1 && offText.toLowerCase() !== qq) return;
          }
          var hour = zoneParts(c[2], now).h;
          var sub;
          if (c[2] === 'UTC') sub = c[3];
          else if (noDst(c[2], now) === 0) sub = 'UTC all year, no daylight saving';
          else sub = hour >= 6 && hour < 18 ? '☀️ Day' : '🌙 Night';
          grid.appendChild(el('div', { class: 'card', dataset: { zone: c[2] } },
            el('h4', el('span', { text: c[0] + ' ' }), c[2] === 'UTC' ? 'UTC' : c[1] + ' · ' + offText),
            el('div', { class: 'mid wc-time', text: h24.input.checked ? time24(c[2], now, true) : time12(c[2], now, true) }),
            el('div', { class: 'muted', text: shortDay(c[2], now) }),
            el('div', { class: 'daynight muted', text: sub })));
        });
        if (!grid.children.length) grid.appendChild(U.note('No city matches that search.'));
      }
      draw();
      var timer = setInterval(draw, 1000);
      U.onTeardown(root, function () { clearInterval(timer); });
      U.live([search, h24], draw);
      root.appendChild(U.panel(null, U.row(el('div', { class: 'grow' }, search), h24),
        U.note('Your time zone: ' + Intl.DateTimeFormat().resolvedOptions().timeZone)));
      root.appendChild(U.panel(null, grid));
    }
  });

  /* --- chess clock ---------------------------------------------------------- */

  function fmtClock(ms) {
    if (ms <= 0) return '0:00';
    var tenths = ms < 10000;
    var s = tenths ? ms / 1000 : Math.ceil(ms / 1000);
    if (tenths) return '0:' + pad(Math.floor(s)) + '.' + Math.floor((ms % 1000) / 100);
    var h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = s % 60;
    return (h ? h + ':' + pad(m) : m) + ':' + pad(sec);
  }

  var audioCtx = null;
  function beep(freq, dur, vol) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = freq || 880;
      g.gain.value = vol || 0.08;
      o.connect(g); g.connect(audioCtx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (dur || 0.08));
      o.stop(audioCtx.currentTime + (dur || 0.08) + 0.02);
    } catch (e) { /* audio is optional */ }
  }

  Tools.register({
    id: 'chess-clock', category: 'games', name: 'Chess Clock & Game Timer',
    description: 'A chess clock with increment, delay and Bronstein, and a turn timer for 3 to 6 players.',
    keywords: ['chess clock', 'online chess timer', 'blitz clock', 'board game timer', 'turn timer', 'fischer', 'bronstein'],
    render: function (root) {
      root.classList.add('g-time');
      var players = U.chips([{ value: '2', label: '2 (chess clock)' }, '3', '4', '5', '6'], function () { names(); }, '2');
      var minutes = U.input({ label: 'Minutes each', type: 'number', value: '5', min: '0.25', max: '600', step: '0.25' });
      var bonus = U.input({ label: 'Bonus seconds per move', type: 'number', value: '3', min: '0', max: '300' });
      var btype = U.select({ label: 'Bonus type', options: [
        { value: 'fischer', label: 'Increment' }, { value: 'delay', label: 'Delay' }, { value: 'bronstein', label: 'Bronstein' }], value: 'fischer' });
      var explain = U.note('');
      var sound = U.checkbox('Sound', { checked: true });
      var nameBox = el('div', { class: 'row' });
      var EXPLAIN = {
        fischer: 'Bonus seconds added after every move. Tap your side, or press Space, to end your turn.',
        delay: 'Your clock waits the bonus seconds before it starts counting down each turn (US delay). Tap your side, or press Space, to end your turn.',
        bronstein: 'After each move you get back the time you used, up to the bonus. Tap your side, or press Space, to end your turn.'
      };
      function names() {
        var n = +players.value;
        var old = Array.prototype.map.call(nameBox.querySelectorAll('input'), function (i) { return i.value; });
        nameBox.replaceChildren();
        for (var i = 0; i < n; i++) {
          var def = n === 2 ? (i === 0 ? 'White' : 'Black') : 'Player ' + (i + 1);
          nameBox.appendChild(U.input({ label: 'Name ' + (i + 1), value: old[i] || def, 'aria-label': 'Player ' + (i + 1) + ' name' }));
        }
      }
      names();
      U.live([btype], function () { explain.textContent = EXPLAIN[val(btype)]; });

      var presetGroups = [['Bullet', [[1, 0], [2, 1]]], ['Blitz', [[3, 0], [3, 2], [5, 0], [5, 3]]], ['Rapid', [[10, 0], [10, 5], [15, 10]]], ['Classical', [[30, 0], [90, 30]]]];
      var presets = el('div', { class: 'stack' }, presetGroups.map(function (g) {
        return el('div', { class: 'row' }, el('b', { style: { minWidth: '80px' }, text: g[0] }), el('div', { class: 'chips' }, g[1].map(function (p) {
          return el('button', { class: 'chip', type: 'button', onclick: function () {
            setVal(minutes, p[0]); setVal(bonus, p[1]); setVal(btype, 'fischer'); explain.textContent = EXPLAIN.fischer;
            players.querySelector('.chip').click();
            start();
          } }, p[0] + ' + ' + p[1]);
        })));
      }));

      var setup = el('div', { class: 'stack' },
        U.panel('Players', players, nameBox),
        U.panel('Quick start', presets),
        U.panel(null, U.row(minutes, bonus, btype), explain, sound, U.btnrow(U.button('Set up the clock', function () { start(); }, 'primary'))));
      var game = el('div', { class: 'stack', style: { display: 'none' } });
      root.appendChild(setup);
      root.appendChild(game);

      var st = null, raf = 0;

      function start() {
        var n = +players.value;
        var baseMs = Math.max(0.25, Math.min(600, Number(val(minutes)) || 5)) * 60000;
        var bonusMs = Math.max(0, Math.min(300, Number(val(bonus)) || 0)) * 1000;
        var nm = Array.prototype.map.call(nameBox.querySelectorAll('input'), function (i) { return i.value || 'Player'; });
        st = { n: n, base: baseMs, bonus: bonusMs, type: val(btype), left: [], moves: [], names: nm, active: -1, running: false,
               turnStart: 0, turnUsed: 0, flagged: -1, history: [] };
        for (var i = 0; i < n; i++) { st.left.push(baseMs); st.moves.push(0); }
        setup.style.display = 'none';
        game.style.display = '';
        buildGame();
      }

      var sides = [], statusLine, pauseBtn, wrap, fullBtn;
      function buildGame() {
        game.replaceChildren();
        sides = [];
        var board = el('div', { class: 'cc-board', style: { gridTemplateColumns: st.n === 2 ? '1fr 1fr' : 'repeat(auto-fit, minmax(160px, 1fr))' } });
        for (var i = 0; i < st.n; i++) {
          (function (idx) {
            var t = el('div', { class: 't', text: fmtClock(st.left[idx]) });
            var nmNode = el('div', { class: 'n', text: st.names[idx] });
            var mv = el('div', { class: 'n', text: '0 moves' });
            var side = el('div', { class: 'cc-side', role: 'button', tabIndex: 0, dataset: { idx: idx },
              onpointerdown: function (e) { e.preventDefault(); press(idx); } }, nmNode, t, mv);
            side.t = t; side.mv = mv;
            sides.push(side);
            board.appendChild(side);
          })(i);
        }
        statusLine = U.note(st.n === 2 ? 'Tap a side to start the other player\'s clock, or press Space.' : 'Tap the glowing player, or press Space, to pass the turn.');
        pauseBtn = U.button('Pause', function () { togglePause(); });
        fullBtn = U.button('Full screen', function () { wrap.classList.toggle('cc-full'); fullBtn.textContent = wrap.classList.contains('cc-full') ? 'Exit full screen' : 'Full screen'; });
        wrap = el('div', { class: 'stack' }, board, statusLine,
          U.btnrow(pauseBtn, U.button('Reset', function () { start(); }), U.button('Undo move', undo), fullBtn,
            U.button('Change settings', function () { stop(); game.style.display = 'none'; setup.style.display = ''; }, 'ghost')));
        game.appendChild(wrap);
        paint();
      }

      function now() { return performance.now(); }
      function elapsedThisTurn() { return st.running ? now() - st.turnStart : 0; }
      function currentLeft(i) {
        if (i !== st.active || !st.running) return st.left[i];
        var used = st.turnUsed + elapsedThisTurn();
        if (st.type === 'delay') return st.left[i] - Math.max(0, used - st.bonus);
        return st.left[i] - used;
      }

      function commitTurn() {
        var i = st.active;
        if (i < 0) return;
        var used = st.turnUsed + elapsedThisTurn();
        var before = st.left[i];
        if (st.type === 'delay') st.left[i] -= Math.max(0, used - st.bonus);
        else st.left[i] -= used;
        if (st.type === 'fischer') st.left[i] += st.bonus;
        if (st.type === 'bronstein') st.left[i] += Math.min(used, st.bonus);
        st.moves[i]++;
        st.history.push({ idx: i, before: before, used: used });
      }

      function press(idx) {
        if (!st || st.flagged >= 0) return;
        if (st.n === 2) {
          if (st.active === -1) { st.active = 1 - idx; begin(); return; }
          if (idx !== st.active) return;
          if (!st.running) { resume(); return; }
          commitTurn();
          st.active = 1 - idx;
          begin();
        } else {
          if (st.active === -1) { st.active = idx; begin(); return; }
          if (idx !== st.active) return;
          if (!st.running) { resume(); return; }
          commitTurn();
          st.active = (idx + 1) % st.n;
          begin();
        }
        if (sound.input.checked) beep(660, 0.05);
      }
      function begin() { st.turnUsed = 0; st.turnStart = now(); st.running = true; pauseBtn.textContent = 'Pause'; loop(); }
      function resume() { st.turnStart = now(); st.running = true; pauseBtn.textContent = 'Pause'; loop(); }
      function togglePause() {
        if (!st || st.active < 0 || st.flagged >= 0) return;
        if (st.running) { st.turnUsed += elapsedThisTurn(); st.running = false; pauseBtn.textContent = 'Resume'; cancelAnimationFrame(raf); paint(); }
        else resume();
      }
      function undo() {
        if (!st || !st.history.length) return;
        var h = st.history.pop();
        st.left[h.idx] = h.before;
        st.moves[h.idx]--;
        st.active = h.idx; st.flagged = -1;
        st.turnUsed = h.used; st.running = false; pauseBtn.textContent = 'Resume';
        cancelAnimationFrame(raf);
        paint();
      }
      function stop() { cancelAnimationFrame(raf); if (st) st.running = false; }
      function loop() {
        cancelAnimationFrame(raf);
        var tickFn = function () {
          if (!st || !st.running) return;
          if (currentLeft(st.active) <= 0) {
            st.left[st.active] = 0; st.running = false; st.flagged = st.active;
            if (sound.input.checked) { beep(440, 0.4, 0.15); }
            paint();
            return;
          }
          paint();
          raf = requestAnimationFrame(tickFn);
        };
        raf = requestAnimationFrame(tickFn);
      }
      function paint() {
        if (!st) return;
        sides.forEach(function (s, i) {
          var left = currentLeft(i);
          s.t.textContent = fmtClock(left);
          s.mv.textContent = st.moves[i] + (st.moves[i] === 1 ? ' move' : ' moves');
          s.classList.toggle('active', i === st.active && st.flagged < 0);
          s.classList.toggle('low', left < 10000 && left > 0);
          s.classList.toggle('flag', i === st.flagged);
        });
        if (st.flagged >= 0) statusLine.textContent = st.names[st.flagged] + ' ran out of time.' + (st.n === 2 ? ' ' + st.names[1 - st.flagged] + ' wins on time.' : '');
        else if (st.active >= 0 && !st.running) statusLine.textContent = 'Paused. Tap the active side or Resume to continue.';
        else if (st.active >= 0) statusLine.textContent = st.names[st.active] + ' to move.';
      }
      function onKey(e) {
        if (!root.isConnected || game.style.display === 'none') return;
        if (/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return;
        if (e.code === 'Space') {
          e.preventDefault();
          if (!st) return;
          if (st.active === -1) press(0);
          else press(st.active);
        } else if (e.key === 'p' || e.key === 'P') togglePause();
        else if (e.key === 'Escape' && wrap && wrap.classList.contains('cc-full')) fullBtn.click();
      }
      document.addEventListener('keydown', onKey);
      U.onTeardown(root, function () { stop(); document.removeEventListener('keydown', onKey); });
    }
  });

  Tools.register({
    id: 'working-days', category: 'time', name: 'Working Days Calculator',
    description: 'Count working days between two dates and add business days to a date.',
    keywords: ['working days', 'business days', 'weekdays', 'exclude weekends', 'holidays'],
    render: function (root) {
      root.classList.add('g-time');
      var today = new Date();
      var exSat = U.checkbox('Exclude Saturdays', { checked: true });
      var exSun = U.checkbox('Exclude Sundays', { checked: true });
      var holidays = U.textarea({ label: 'Holidays to skip (optional, one YYYY-MM-DD per line)', rows: 3, placeholder: '2026-12-25' });
      var s1 = U.input({ label: 'Start Date', type: 'date', value: isoDate(today) });
      var e1 = U.input({ label: 'End Date', type: 'date', value: isoDate(new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())) });
      var r1 = el('div');
      var s2 = U.input({ label: 'Start Date', type: 'date', value: isoDate(today) });
      var add = U.input({ label: 'Add Days', type: 'number', value: '10', min: '1' });
      var r2 = el('div');

      function holidaySet() {
        var set = {};
        String(val(holidays)).split(/[\s,]+/).forEach(function (h) { var d = parseDate(h); if (d) set[isoDate(d)] = 1; });
        return set;
      }
      function isOff(d, hol) {
        var w = d.getDay();
        return (w === 6 && exSat.input.checked) || (w === 0 && exSun.input.checked) || !!hol[isoDate(d)];
      }
      function draw() {
        var hol = holidaySet();
        var a = parseDate(val(s1)), b = parseDate(val(e1));
        r1.replaceChildren();
        if (a && b) {
          var lo = a <= b ? a : b, hi = a <= b ? b : a;
          var total = dayMs(lo, hi) + 1;
          if (total > 200000) { r1.appendChild(U.note('That range is too long to count day by day.', 'err')); }
          else {
            var work = 0, weekend = 0, holi = 0;
            for (var d = new Date(lo); d <= hi; d.setDate(d.getDate() + 1)) {
              var w = d.getDay();
              var we = (w === 6 && exSat.input.checked) || (w === 0 && exSun.input.checked);
              if (we) weekend++; else if (hol[isoDate(d)]) holi++; else work++;
            }
            var items = [{ label: 'Working Days', value: fmtNum(work) }, { label: 'Total Days', value: fmtNum(total) }, { label: 'Weekend Days', value: fmtNum(weekend) }];
            if (holi) items.push({ label: 'Holidays', value: fmtNum(holi) });
            r1.appendChild(U.stats(items));
            r1.appendChild(U.note('Both the start and end dates are counted.'));
          }
        }
        r2.replaceChildren();
        var c = parseDate(val(s2)), n = Math.floor(Number(val(add)));
        if (c && isFinite(n) && n >= 0) {
          if (!exSat.input.checked && !exSun.input.checked && !Object.keys(hol).length) { /* every day counts */ }
          if (n > 100000) { r2.appendChild(U.note('Keep it under 100,000 days.', 'err')); return; }
          var cur = new Date(c), left = n, guard = 0;
          while (left > 0 && guard++ < 1000000) { cur.setDate(cur.getDate() + 1); if (!isOff(cur, hol)) left--; }
          r2.append(el('p', { class: 'muted', text: '+ ' + n + ' working days from ' + ukDate(c) + ' =' }),
            el('p', { class: 'big', text: longDate(cur) }), el('p', { class: 'mono', text: isoDate(cur) }));
        }
      }
      U.live([exSat, exSun, holidays, s1, e1, s2, add], draw);
      root.appendChild(U.panel(null, U.row(exSat, exSun), holidays));
      root.appendChild(U.panel('Count Working Days Between Dates', U.row(s1, e1), r1));
      root.appendChild(U.panel('Add Business Days to a Date', U.row(s2, add), r2));
    }
  });

  Tools.register({
    id: 'week-number', category: 'time', name: 'Week Number',
    description: 'Find the ISO week number of any date, and the dates in any week.',
    keywords: ['week number', 'iso week', 'calendar week', 'what week is it', 'kw'],
    render: function (root) {
      root.classList.add('g-time');
      var date = U.input({ label: 'Select Date', type: 'date', value: isoDate(new Date()) });
      var r1 = el('div');
      var wk = isoWeek(new Date());
      var weekIn = U.input({ label: 'Week (YYYY-Www)', placeholder: '2024-W01', value: wk.year + '-W' + pad(wk.week) });
      var r2 = el('div');
      function drawDate() {
        var d = parseDate(val(date));
        r1.replaceChildren();
        if (!d) return;
        var w = isoWeek(d);
        r1.append(el('p', { class: 'big', text: 'W' + pad(w.week) }), el('p', { class: 'muted', text: 'ISO Week · Year ' + w.year }),
          U.stats([
            { label: 'Day of year', value: dayOfYear(d) },
            { label: 'Quarter', value: 'Q' + (Math.floor(d.getMonth() / 3) + 1) },
            { label: 'Weekday', value: weekday(d) },
            { label: 'Month week', value: 'Week ' + Math.ceil(d.getDate() / 7) + ' of month' },
            { label: 'Weeks in ' + w.year, value: isoWeeksInYear(w.year) }
          ]));
      }
      function drawWeek() {
        r2.replaceChildren();
        var m = /^(\d{4})\s*-?\s*W?(\d{1,2})$/i.exec(String(val(weekIn)).trim());
        if (!m) { r2.appendChild(U.note('Use the form 2026-W39.', 'err')); return; }
        var y = +m[1], w = +m[2];
        if (w < 1 || w > isoWeeksInYear(y)) { r2.appendChild(U.note(y + ' has ' + isoWeeksInYear(y) + ' ISO weeks.', 'err')); return; }
        var mon = isoWeekStart(y, w);
        var rows = [];
        for (var i = 0; i < 7; i++) {
          var d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
          rows.push([weekday(d).slice(0, 3), d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(), isoDate(d)]);
        }
        r2.appendChild(U.table(['Day', 'Date', 'ISO'], rows));
      }
      U.live([date], drawDate);
      U.live([weekIn], drawWeek);
      root.appendChild(U.panel('Date → Week Number', date, r1));
      root.appendChild(U.panel('Week Number → Dates', weekIn, r2));
    }
  });

  Tools.register({
    id: 'time-to-decimal', category: 'time', name: 'Time to Decimal',
    description: 'Convert HH:MM:SS to decimal hours, and decimal hours back to a time.',
    keywords: ['time to decimal', 'decimal hours', 'timesheet', 'hours minutes', 'payroll'],
    render: function (root) {
      root.classList.add('g-time');
      var h = U.input({ label: 'Hours', type: 'number', value: '8', min: '0' });
      var m = U.input({ label: 'Minutes', type: 'number', value: '30', min: '0', max: '59' });
      var s = U.input({ label: 'Seconds', type: 'number', value: '0', min: '0', max: '59' });
      var r1 = el('div');
      var dec = U.input({ label: 'Decimal hours', type: 'number', value: '8.5', step: '0.01', min: '0' });
      var r2 = el('div');
      var p1 = el('div', {}, el('div', { class: 'timeinputs' }, h, el('span', { text: ':' }), m, el('span', { text: ':' }), s), r1);
      var p2 = el('div', { style: { display: 'none' } }, dec, r2);
      var tabs = U.chips(['Time → Decimal', 'Decimal → Time'], function (v) {
        p1.style.display = v === 'Time → Decimal' ? '' : 'none';
        p2.style.display = v === 'Time → Decimal' ? 'none' : '';
      });
      function drawA() {
        var hh = Number(val(h)) || 0, mm = Number(val(m)) || 0, ss = Number(val(s)) || 0;
        var total = hh * 3600 + mm * 60 + ss;
        r1.replaceChildren(el('p', { class: 'muted', text: pad(Math.floor(hh)) + ':' + pad(Math.floor(mm)) + ':' + pad(Math.floor(ss)) + ' =' }),
          el('p', { class: 'big', text: (total / 3600).toFixed(4) }), el('p', { class: 'muted', text: 'decimal hours' }),
          U.stats([{ label: 'Minutes', value: (total / 60).toFixed(2) }, { label: 'Seconds', value: String(Math.round(total)) }, { label: 'Days', value: (total / 86400).toFixed(4) }]));
      }
      function drawB() {
        var d = Number(val(dec));
        r2.replaceChildren();
        if (!isFinite(d) || d < 0) { r2.appendChild(U.note('Enter a positive number of hours.', 'err')); return; }
        var total = Math.round(d * 3600);
        var hh = Math.floor(total / 3600), mm = Math.floor(total / 60) % 60, ss = total % 60;
        r2.append(el('p', { class: 'muted', text: d + ' hours =' }), el('p', { class: 'big', text: pad(hh) + ':' + pad(mm) + ':' + pad(ss) }),
          el('p', { class: 'muted', text: hh + ' hours, ' + mm + ' minutes, ' + ss + ' seconds' }),
          U.stats([{ label: 'Minutes', value: (d * 60).toFixed(2) }, { label: 'Seconds', value: String(total) }]));
      }
      U.live([h, m, s], drawA);
      U.live([dec], drawB);
      var quick = el('div', { class: 'chips' }, [[0.25, '0.25h = 15 min'], [0.5, '0.5h = 30 min'], [0.75, '0.75h = 45 min'], [1.5, '1.5h = 1.5 hrs'], [2.5, '2.5h = 2.5 hrs'], [7.5, '7.5h = 7.5 hrs']].map(function (q) {
        return el('button', { class: 'chip', type: 'button', onclick: function () { setVal(dec, q[0]); drawB(); tabs.children[1].click(); } }, q[1]);
      }));
      root.appendChild(U.panel(null, tabs, p1, p2));
      root.appendChild(U.panel('Quick conversions', quick));
    }
  });

  Tools.register({
    id: 'day-of-year', category: 'time', name: 'Day of Year',
    description: 'See which day of the year a date is, with its week, quarter and year progress.',
    keywords: ['day of year', 'day number', 'julian day', 'ordinal date', 'year progress'],
    render: function (root) {
      root.classList.add('g-time');
      var date = U.input({ label: 'Date', type: 'date', value: isoDate(new Date()) });
      var out = el('div');
      var cal = el('div');
      function draw() {
        var d = parseDate(val(date));
        out.replaceChildren(); cal.replaceChildren();
        if (!d) return;
        var n = dayOfYear(d), total = daysInYear(d.getFullYear());
        var pct = (n / total * 100).toFixed(1);
        out.append(U.stats([
          { label: 'Day of Year', value: n + ' / ' + total },
          { label: 'Day of Week', value: weekday(d) },
          { label: 'Week Number (ISO)', value: 'Week ' + isoWeek(d).week },
          { label: 'Quarter', value: 'Q' + (Math.floor(d.getMonth() / 3) + 1) },
          { label: 'Days Remaining', value: plural(total - n, 'day') },
          { label: 'Year Progress', value: pct + '%' }
        ]), el('p', { class: 'muted', style: { marginTop: '12px' }, text: 'Year Progress' }),
          el('div', { class: 'bar' }, el('i', { style: { left: 0, width: pct + '%' } })),
          el('p', { class: 'muted', text: pct + '% of ' + d.getFullYear() + ' complete' }),
          el('p', { class: 'muted', text: 'Ordinal date: ' + d.getFullYear() + '-' + pad(n, 3) }));
        var y = d.getFullYear(), mo = d.getMonth();
        var first = (new Date(y, mo, 1).getDay() + 6) % 7;   /* Monday-first */
        var dim = new Date(y, mo + 1, 0).getDate();
        var grid = el('div', { class: 'cal' }, ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(function (x) { return el('span', { class: 'hd', text: x }); }));
        for (var i = 0; i < first; i++) grid.appendChild(el('span'));
        for (var day = 1; day <= dim; day++) {
          (function (dd) {
            var dn = dayOfYear(new Date(y, mo, dd));
            grid.appendChild(el('span', { class: dd === d.getDate() ? 'on' : (dd < d.getDate() ? 'past' : ''), title: 'Day ' + dn, text: String(dd),
              style: { cursor: 'pointer' }, onclick: function () { setVal(date, isoDate(new Date(y, mo, dd))); draw(); } }));
          })(day);
        }
        cal.append(el('h3', { text: 'All days in ' + MONTHS[mo] + ' ' + y }), grid);
      }
      U.live([date], draw);
      root.appendChild(U.panel(null, date, out));
      root.appendChild(U.panel(null, cal));
    }
  });

  /* --- moon ------------------------------------------------------------- */

  var SYNODIC = 29.530588853;
  var NEW_MOON_REF = Date.UTC(1970, 0, 7, 20, 35);
  var PHASES = [
    ['🌑', 'New Moon', '0 days'], ['🌒', 'Waxing Crescent', '~3.5 days'], ['🌓', 'First Quarter', '~7.4 days'], ['🌔', 'Waxing Gibbous', '~11 days'],
    ['🌕', 'Full Moon', '~14.8 days'], ['🌖', 'Waning Gibbous', '~18 days'], ['🌗', 'Last Quarter', '~22 days'], ['🌘', 'Waning Crescent', '~26 days']
  ];
  function moonAge(ms) { var a = ((ms - NEW_MOON_REF) / 86400000) % SYNODIC; return a < 0 ? a + SYNODIC : a; }
  function phaseIndex(age) { return Math.floor((age / SYNODIC) * 8 + 0.5) % 8; }

  Tools.register({
    id: 'moon-phase', category: 'time', name: 'Moon Phase Calculator',
    description: 'Find the moon phase, illumination and next full and new moon for any date.',
    keywords: ['moon phase', 'full moon', 'new moon', 'lunar', 'crescent', 'illumination'],
    render: function (root) {
      root.classList.add('g-time');
      var date = U.input({ label: 'Date', type: 'date', value: isoDate(new Date()) });
      var out = el('div');
      var sc = null;
      U.module('assets/vendor/suncalc/suncalc.mjs').then(function (m) { sc = m; draw(); }).catch(function () { /* the mean model still works */ });
      function draw() {
        var d = parseDate(val(date));
        out.replaceChildren();
        if (!d) return;
        var nowT = new Date();
        var t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), nowT.getHours(), nowT.getMinutes()).getTime();
        var age = moonAge(t);
        var illum = (1 - Math.cos(2 * Math.PI * age / SYNODIC)) / 2;
        var p = PHASES[phaseIndex(age)];
        var full = SYNODIC / 2;
        var toFull = age <= full ? full - age : SYNODIC - age + full;
        var nextNew = new Date(t + (SYNODIC - age) * 86400000);
        var nextFull = new Date(t + toFull * 86400000);
        var items = [
          { label: 'Phase', value: age.toFixed(1) + ' / 29.5 days' },
          { label: 'Illumination', value: (illum * 100).toFixed(1) + '%' },
          { label: 'Days Until Full', value: Math.round(toFull) === 0 ? 'Today' : plural(Math.round(toFull), 'day') },
          { label: 'Next Full Moon', value: dayMonth(nextFull) },
          { label: 'Next New Moon', value: dayMonth(nextNew) }
        ];
        if (sc) {
          var ill = sc.getMoonIllumination(new Date(t));
          items.push({ label: 'Precise illumination (SunCalc)', value: (ill.fraction * 100).toFixed(1) + '%' });
        }
        out.append(
          el('div', { class: 'moon', text: p[0] }),
          el('p', { class: 'big moon-name', text: p[1] }),
          el('p', { class: 'muted', text: longDate(d) }),
          U.stats(items),
          el('p', { class: 'muted', style: { marginTop: '12px' }, text: 'Lunar Cycle Progress' }),
          el('div', { class: 'bar' }, el('i', { style: { left: 0, width: (age / SYNODIC * 100).toFixed(1) + '%' } })),
          el('div', { class: 'ticks' }, el('span', { text: '🌑 New Moon' }), el('span', { text: '🌓 First Quarter' }), el('span', { text: '🌕 Full Moon' }), el('span', { text: '🌗 Last Quarter' }), el('span', { text: '🌑 New' })));
      }
      U.live([date], draw);
      root.appendChild(U.panel(null, date, out));
      root.appendChild(U.panel('Phase Guide', U.table(['', 'Phase', 'Moon age'], PHASES.map(function (p) { return [p[0], p[1], p[2]]; }))));
    }
  });

  var SUN_CITIES = [['New York, USA', 40.7128, -74.0060], ['London, UK', 51.5074, -0.1278], ['Tokyo, Japan', 35.6762, 139.6503],
    ['Sydney, Australia', -33.8688, 151.2093], ['Dubai, UAE', 25.2048, 55.2708], ['Paris, France', 48.8566, 2.3522]];

  Tools.register({
    id: 'sunrise-sunset', category: 'time', name: 'Sunrise & Sunset',
    description: 'Sunrise, sunset and day length for any place on any date.',
    keywords: ['sunrise', 'sunset', 'day length', 'daylight', 'golden hour', 'twilight'],
    render: function (root) {
      root.classList.add('g-time');
      var date = U.input({ label: 'Date', type: 'date', value: isoDate(new Date()) });
      var home = SUN_CITIES[0];
      if (Region.isSet()) SUN_CITIES.forEach(function (c) { if (c[0].indexOf(Region.get().city + ',') === 0) home = c; });
      var lat = U.input({ label: 'Latitude', placeholder: '40.7128', value: home === SUN_CITIES[0] ? '40.7128' : String(home[1]) });
      var lng = U.input({ label: 'Longitude', placeholder: '-74.0060', value: home === SUN_CITIES[0] ? '-74.0060' : String(home[2]) });
      var out = el('div');
      var status = U.note('');
      var cities = el('div', { class: 'chips' }, SUN_CITIES.map(function (c) {
        return el('button', { class: 'chip', type: 'button', onclick: function () { setVal(lat, c[1]); setVal(lng, c[2]); draw(); } }, c[0]);
      }));
      var locBtn = U.button('📍 Use My Location', function () {
        if (!navigator.geolocation) { status.textContent = 'This browser cannot share its location.'; return; }
        status.textContent = 'Asking for your location…';
        navigator.geolocation.getCurrentPosition(function (pos) {
          setVal(lat, pos.coords.latitude.toFixed(4)); setVal(lng, pos.coords.longitude.toFixed(4)); status.textContent = ''; draw();
        }, function (err) { status.textContent = 'Location unavailable: ' + err.message; }, { timeout: 10000 });
      });
      var sc = null;
      function t(d) { return d instanceof Date && !isNaN(d) ? hhmm(d) + ':' + pad(d.getSeconds()) : '—'; }
      function hm(ms) { var mins = Math.round(ms / 60000); return Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm'; }
      function draw() {
        out.replaceChildren();
        if (!sc) { out.appendChild(U.note('Loading the solar calculator…')); return; }
        var d = parseDate(val(date));
        var la = parseFloat(val(lat)), lo = parseFloat(val(lng));
        if (!d || !isFinite(la) || !isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) {
          out.appendChild(U.note('Enter a latitude between -90 and 90 and a longitude between -180 and 180.', 'err')); return;
        }
        var noon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
        var times = sc.getTimes(noon, la, lo);
        var rise = times.sunrise, set = times.sunset;
        var dayLen;
        var polar = null;
        if (!rise || !set || isNaN(rise) || isNaN(set)) {
          var alt = sc.getPosition(times.solarNoon || noon, la, lo).altitude;
          polar = alt > 0 ? 'Midnight sun: the sun stays up all day.' : 'Polar night: the sun does not rise.';
          dayLen = alt > 0 ? 86400000 : 0;
        } else {
          dayLen = set - rise;
          if (dayLen < 0) dayLen += 86400000;
        }
        out.append(U.stats([
          { label: '🌅 Sunrise', value: t(rise) },
          { label: '🌇 Sunset', value: t(set) },
          { label: '☀️ Day Length', value: hm(dayLen) },
          { label: '🌙 Night Length', value: hm(86400000 - dayLen) }
        ]));
        if (polar) out.appendChild(U.note(polar));
        out.appendChild(U.table(['Event', 'Time'], [
          ['Dawn (civil twilight)', t(times.dawn)], ['Golden hour ends', t(times.goldenHourEnd)], ['Solar noon', t(times.solarNoon)],
          ['Golden hour starts', t(times.goldenHour)], ['Dusk (civil twilight)', t(times.dusk)], ['Night starts', t(times.night)]
        ]));
        out.appendChild(U.note('Times are shown in your device\'s time zone (' + Intl.DateTimeFormat().resolvedOptions().timeZone + ').'));
        var dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        var bar = el('div', { class: 'bar', style: { height: '18px', marginTop: '10px' } });
        function frac(x) { return Math.max(0, Math.min(1, (x - dayStart) / 86400000)); }
        if (!polar) {
          var a = frac(rise.getTime()), b = frac(set.getTime());
          if (b >= a) bar.appendChild(el('i', { style: { left: a * 100 + '%', width: (b - a) * 100 + '%', background: '#f5b301' } }));
          else {
            bar.appendChild(el('i', { style: { left: 0, width: b * 100 + '%', background: '#f5b301' } }));
            bar.appendChild(el('i', { style: { left: a * 100 + '%', width: (1 - a) * 100 + '%', background: '#f5b301' } }));
          }
        } else if (dayLen) bar.appendChild(el('i', { style: { left: 0, width: '100%', background: '#f5b301' } }));
        out.append(el('h3', { text: 'Day Timeline' }), bar, el('div', { class: 'ticks' }, ['00:00', '06:00', '12:00', '18:00', '24:00'].map(function (x) { return el('span', { text: x }); })));
      }
      U.module('assets/vendor/suncalc/suncalc.mjs').then(function (m) { sc = m; draw(); })
        .catch(function (e) { out.replaceChildren(U.note('Could not load the solar calculator: ' + e.message, 'err')); });
      U.live([date, lat, lng], draw);
      root.appendChild(U.panel(null, cities, date, U.row(lat, lng, locBtn), status));
      root.appendChild(U.panel(null, out));
    }
  });

  /* --- Calendar Event (.ics) Generator ------------------------------------ */

  function icsEscape(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function icsFold(line) {
    var out = [], bytes = new TextEncoder().encode(line), i = 0;
    /* fold at 75 octets without splitting a UTF-8 sequence */
    while (i < bytes.length) {
      var take = Math.min(bytes.length - i, i === 0 ? 75 : 74);
      while (take > 1 && i + take < bytes.length && (bytes[i + take] & 0xc0) === 0x80) take--;
      out.push((i === 0 ? '' : ' ') + new TextDecoder().decode(bytes.subarray(i, i + take)));
      i += take;
    }
    return out.join('\r\n');
  }
  function icsStamp(d) { return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z'; }
  function icsLocal(s) { var t = String(s).replace(/[-:]/g, ''); return t.length === 13 ? t + '00' : t.slice(0, 15); }
  function buildIcs(o) {
    var uid = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)) + '@all-the-tools';
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//All The Tools//Calendar Event Generator//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT', 'UID:' + uid, 'DTSTAMP:' + icsStamp(new Date())];
    if (o.allDay) {
      var endDay = new Date(o.endDate + 'T00:00:00'); endDay.setDate(endDay.getDate() + 1);
      lines.push('DTSTART;VALUE=DATE:' + o.startDate.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + isoDate(endDay).replace(/-/g, ''));
    } else if (o.tz === 'UTC') {
      lines.push('DTSTART:' + icsStamp(new Date(o.start + 'Z')), 'DTEND:' + icsStamp(new Date(o.end + 'Z')));
    } else {
      lines.push('DTSTART;TZID=' + o.tz + ':' + icsLocal(o.start), 'DTEND;TZID=' + o.tz + ':' + icsLocal(o.end));
    }
    lines.push('SUMMARY:' + icsEscape(o.title));
    if (o.location) lines.push('LOCATION:' + icsEscape(o.location));
    if (o.description) lines.push('DESCRIPTION:' + icsEscape(o.description));
    if (o.url) lines.push('URL:' + o.url);
    if (o.repeat && o.repeat !== 'none') lines.push('RRULE:FREQ=' + o.repeat.toUpperCase() + (o.count > 0 ? ';COUNT=' + o.count : '') + (o.repeat === 'weekly' && o.byday ? ';BYDAY=' + o.byday : ''));
    if (o.reminder >= 0) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(o.title), 'TRIGGER:-PT' + (o.reminder >= 60 && o.reminder % 60 === 0 ? (o.reminder / 60) + 'H' : o.reminder + 'M'), 'END:VALARM');
    if (o.busy === false) lines.push('TRANSP:TRANSPARENT');
    lines.push('END:VEVENT', 'END:VCALENDAR');
    return lines.map(icsFold).join('\r\n') + '\r\n';
  }

  Tools.register({
    id: 'ics-generator', category: 'time', name: 'Calendar Event (.ics) Generator',
    description: 'Create an .ics file, or a Google Calendar and Outlook link, for any event with a time zone, repeat rule and reminder.',
    keywords: ['ics', 'ical', 'icalendar', 'calendar event', 'add to calendar', 'google calendar link', 'outlook', 'apple calendar', 'invite', 'rrule', 'reminder', 'vevent', 'export'],
    render: function (root) {
      root.classList.add('g-time');
      var now = new Date(); now.setMinutes(0, 0, 0); now.setHours(now.getHours() + 1);
      var end = new Date(now.getTime() + 3600000);
      var title = U.input({ label: 'Title', value: 'Team meeting' });
      var location = U.input({ label: 'Location', placeholder: 'Room, address or a video call link' });
      var description = U.textarea({ label: 'Description', rows: 3 });
      var start = U.input({ label: 'Starts', type: 'datetime-local', value: localDT(now) });
      var endIn = U.input({ label: 'Ends', type: 'datetime-local', value: localDT(end) });
      var allDay = U.checkbox('All-day event');
      var zones = ['UTC'];
      try { zones = zones.concat(Intl.supportedValuesOf('timeZone')); } catch (e) { zones = zones.concat(['Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Australia/Sydney']); }
      var localZone = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';
      var tz = U.select({ label: 'Time zone', options: zones, value: zones.indexOf(localZone) > -1 ? localZone : 'UTC' });
      var repeat = U.select({ label: 'Repeats', options: [{ value: 'none', label: 'Does not repeat' }, { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }], value: 'none' });
      var count = U.input({ label: 'Number of times (0 = forever)', type: 'number', min: 0, value: '0' });
      var reminder = U.select({ label: 'Reminder', options: [{ value: '-1', label: 'None' }, { value: '0', label: 'At the start' }, { value: '5', label: '5 minutes before' }, { value: '10', label: '10 minutes before' }, { value: '15', label: '15 minutes before' }, { value: '30', label: '30 minutes before' }, { value: '60', label: '1 hour before' }, { value: '1440', label: '1 day before' }], value: '15' });
      var url = U.input({ label: 'Link (optional)', type: 'url', placeholder: 'https://…' });
      var busy = U.checkbox('Show as busy', { checked: true });
      var out = el('pre', { class: 'out', style: { maxHeight: '260px' } });
      var links = el('div', { class: 'btnrow' });
      var status = U.note('');
      function opts() {
        var s = val(start), e = val(endIn);
        return { title: val(title).trim() || 'Event', location: val(location).trim(), description: val(description), start: s, end: e, startDate: s.slice(0, 10), endDate: e.slice(0, 10), allDay: allDay.input.checked, tz: val(tz), repeat: val(repeat), count: +val(count) || 0, reminder: +val(reminder), url: val(url).trim(), busy: busy.input.checked };
      }
      function googleLink(o) {
        var dates = o.allDay ? o.startDate.replace(/-/g, '') + '/' + (function () { var d = new Date(o.endDate + 'T00:00:00'); d.setDate(d.getDate() + 1); return isoDate(d).replace(/-/g, ''); })() : icsLocal(o.start) + '/' + icsLocal(o.end);
        var p = new URLSearchParams({ action: 'TEMPLATE', text: o.title, dates: dates, details: o.description + (o.url ? '\n' + o.url : ''), location: o.location });
        if (!o.allDay) p.set('ctz', o.tz);
        if (o.repeat !== 'none') p.set('recur', 'RRULE:FREQ=' + o.repeat.toUpperCase() + (o.count ? ';COUNT=' + o.count : ''));
        return 'https://calendar.google.com/calendar/render?' + p.toString();
      }
      function outlookLink(o) {
        var p = new URLSearchParams({ path: '/calendar/action/compose', rru: 'addevent', subject: o.title, body: o.description, location: o.location, startdt: o.allDay ? o.startDate : o.start, enddt: o.allDay ? o.endDate : o.end });
        if (o.allDay) p.set('allday', 'true');
        return 'https://outlook.live.com/calendar/0/action/compose?' + p.toString();
      }
      function run() {
        var o = opts();
        if (!o.start || !o.end) { status.className = 'note err'; status.textContent = 'Pick a start and end.'; return; }
        if (!o.allDay && new Date(o.end) <= new Date(o.start)) { status.className = 'note err'; status.textContent = 'The end must be after the start.'; return; }
        status.className = 'note'; status.textContent = '';
        out.textContent = buildIcs(o);
        links.replaceChildren(
          U.button('Download .ics', function () { U.saveBlob((o.title.replace(/[^\w.-]+/g, '-') || 'event') + '.ics', new Blob([out.textContent], { type: 'text/calendar;charset=utf-8' })); }, 'primary'),
          el('a', { class: 'btn', href: googleLink(o), target: '_blank', rel: 'noopener' }, 'Add to Google Calendar'),
          el('a', { class: 'btn', href: outlookLink(o), target: '_blank', rel: 'noopener' }, 'Add to Outlook.com'),
          U.copyBtn('Copy .ics text', function () { return out.textContent; }));
      }
      allDay.input.addEventListener('change', function () {
        var s = val(start).slice(0, 10), e = val(endIn).slice(0, 10), all = allDay.input.checked;
        inp(start).type = all ? 'date' : 'datetime-local'; inp(endIn).type = inp(start).type;
        setVal(start, all ? s : s + 'T09:00'); setVal(endIn, all ? e : e + 'T10:00');
        run();
      });
      inp(start).addEventListener('change', function () { if (!allDay.input.checked && new Date(val(endIn)) <= new Date(val(start))) { var d = new Date(val(start)); d.setHours(d.getHours() + 1); setVal(endIn, localDT(d)); } });
      U.live([title, location, description, start, endIn, tz, repeat, count, reminder, url, busy], run);
      root.appendChild(U.panel(null, title, U.row(start, endIn, allDay), U.row(tz, repeat, count), U.row(reminder, busy), location, description, url));
      root.appendChild(U.panel('Calendar file', status, links, out, U.note('The .ics opens in Apple Calendar, Outlook, Thunderbird and Google Calendar (import). Times carry the time zone you picked, so guests elsewhere see the right local time.')));
    }
  });

  window.TimeKit = { buildIcs: buildIcs, icsFold: icsFold, icsEscape: icsEscape };

  /* --- Pomodoro & Interval Timer ------------------------------------------ */

  Tools.register({
    id: 'interval-timer', category: 'time', name: 'Pomodoro & Interval Timer',
    description: 'Work and rest cycles that repeat: Pomodoro with long breaks, or HIIT rounds with warm-up and cool-down, with beeps and a big display.',
    keywords: ['pomodoro', 'interval timer', 'hiit', 'tabata', 'work rest', 'focus timer', 'study timer', 'rounds', 'circuit', 'exercise', 'productivity', 'countdown', 'repeat'],
    render: function (root) {
      root.classList.add('g-time');
      var AC = window.AudioContext || window.webkitAudioContext, actx = null;
      var mode = U.chips([{ value: 'pomodoro', label: 'Pomodoro' }, { value: 'hiit', label: 'HIIT / Tabata' }, { value: 'custom', label: 'Custom' }], function (v) { applyPreset(v); build(); }, 'pomodoro');
      var work = U.input({ label: 'Work', type: 'number', min: 1, value: '25' }), rest = U.input({ label: 'Rest', type: 'number', min: 0, value: '5' }), rounds = U.input({ label: 'Rounds', type: 'number', min: 1, value: '4' });
      var longRest = U.input({ label: 'Long break after all rounds', type: 'number', min: 0, value: '15' }), warm = U.input({ label: 'Warm-up', type: 'number', min: 0, value: '0' }), cool = U.input({ label: 'Cool-down', type: 'number', min: 0, value: '0' });
      var unit = U.select({ label: 'Units', options: [{ value: '60', label: 'minutes' }, { value: '1', label: 'seconds' }], value: '60' });
      var sound = U.checkbox('Beeps', { checked: true }), notify = U.checkbox('Browser notification');
      var phaseEl = el('div', { class: 'mid', dataset: { k: 'phase' } }), timeEl = el('div', { class: 'big', style: { fontSize: '72px' }, dataset: { k: 'time' } }), roundEl = el('div', { class: 'muted', dataset: { k: 'round' } });
      var ring = el('div', { class: 'bar', style: { height: '14px' } }, el('i', { style: { left: 0, width: '0%' } }));
      var plan = el('div', { class: 'muted' });
      var startBtn = U.button('Start', toggle, 'primary'), skipBtn = U.button('Skip', skip), resetBtn = U.button('Reset', reset, 'ghost');
      var stage = el('div', { style: { textAlign: 'center', padding: '10px 0', borderRadius: 'var(--radius)', transition: 'background .3s' } }, phaseEl, timeEl, roundEl);
      var phases = [], idx = 0, remaining = 0, running = false, timer = 0, endAt = 0, done = 0;
      function presets(v) { return v === 'pomodoro' ? [25, 5, 4, 15, 0, 0, '60'] : v === 'hiit' ? [20, 10, 8, 0, 60, 60, '1'] : null; }
      function applyPreset(v) { var p = presets(v); if (!p) return; [work, rest, rounds, longRest, warm, cool].forEach(function (w, i) { setVal(w, String(p[i])); }); setVal(unit, p[6]); }
      function build() {
        var m = +val(unit), w = (+val(work) || 0) * m, r = (+val(rest) || 0) * m, n = Math.max(1, +val(rounds) || 1), lr = (+val(longRest) || 0) * m, wu = (+val(warm) || 0) * m, cd = (+val(cool) || 0) * m;
        phases = [];
        if (wu) phases.push({ name: 'Warm-up', secs: wu, kind: 'rest' });
        for (var i = 1; i <= n; i++) { phases.push({ name: 'Work', secs: w, kind: 'work', round: i }); if (r && i < n) phases.push({ name: 'Rest', secs: r, kind: 'rest', round: i }); }
        if (lr) phases.push({ name: 'Long break', secs: lr, kind: 'rest' });
        if (cd) phases.push({ name: 'Cool-down', secs: cd, kind: 'rest' });
        var total = phases.reduce(function (a, p) { return a + p.secs; }, 0);
        plan.textContent = phases.length + ' phases, ' + fmt(total) + ' in total.';
        if (!running) { idx = 0; remaining = phases.length ? phases[0].secs : 0; paint(); }
      }
      function fmt(s) { s = Math.max(0, Math.round(s)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60; return (h ? h + ':' + pad(m) : String(m)) + ':' + pad(sec); }
      function paint() {
        var p = phases[idx];
        if (!p) { phaseEl.textContent = 'Finished'; timeEl.textContent = '0:00'; roundEl.textContent = 'All rounds complete. ' + done + ' completed today.'; stage.style.background = 'var(--bg-sunken)'; document.title = 'Done — All The Tools'; return; }
        phaseEl.textContent = p.name; timeEl.textContent = fmt(remaining);
        roundEl.textContent = (p.round ? 'Round ' + p.round + ' of ' + (+val(rounds) || 1) + ' · ' : '') + 'phase ' + (idx + 1) + ' of ' + phases.length;
        stage.style.background = p.kind === 'work' ? 'color-mix(in srgb, var(--err) 14%, transparent)' : 'color-mix(in srgb, var(--ok) 14%, transparent)';
        ring.firstChild.style.width = (p.secs ? (1 - remaining / p.secs) * 100 : 100) + '%';
        if (running) document.title = fmt(remaining) + ' ' + p.name + ' — All The Tools';
      }
      function beep(n) {
        if (!sound.input.checked || !AC) return;
        try {
          actx = actx || new AC(); if (actx.state === 'suspended') actx.resume();
          for (var i = 0; i < n; i++) { var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * 0.25; o.frequency.value = n === 3 ? 660 : 880; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 0.22); }
        } catch (e) { /* no audio */ }
      }
      function tick() {
        remaining = Math.max(0, (endAt - Date.now()) / 1000);
        if (remaining <= 0.05) { advance(); return; }
        paint();
      }
      function advance() {
        var p = phases[idx];
        if (p && p.kind === 'work') { done++; try { localStorage.setItem('att-pomodoro-' + isoDate(new Date()), String(done)); } catch (e) { /* ignore */ } }
        idx++;
        if (idx >= phases.length) { running = false; clearInterval(timer); startBtn.textContent = 'Start'; beep(3); note('Finished'); paint(); return; }
        remaining = phases[idx].secs; endAt = Date.now() + remaining * 1000;
        beep(phases[idx].kind === 'work' ? 2 : 1); note(phases[idx].name + ' · ' + fmt(remaining));
        paint();
      }
      function note(text) { if (notify.input.checked && window.Notification && Notification.permission === 'granted') { try { new Notification('Interval timer', { body: text }); } catch (e) { /* ignore */ } } }
      function toggle() {
        if (!phases.length) build();
        if (running) { running = false; clearInterval(timer); startBtn.textContent = 'Resume'; return; }
        if (idx >= phases.length) reset();
        running = true; endAt = Date.now() + remaining * 1000; startBtn.textContent = 'Pause';
        timer = setInterval(tick, 200); beep(1); paint();
      }
      function skip() { if (idx < phases.length) { advance(); if (!running) paint(); } }
      function reset() { running = false; clearInterval(timer); idx = 0; remaining = phases.length ? phases[0].secs : 0; startBtn.textContent = 'Start'; document.title = 'Pomodoro & Interval Timer — All The Tools'; paint(); }
      notify.input.addEventListener('change', function () { if (notify.input.checked && window.Notification && Notification.permission !== 'granted') Notification.requestPermission(); });
      function key(e) { if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return; if (e.code === 'Space') { e.preventDefault(); toggle(); } }
      document.addEventListener('keydown', key);
      try { done = +localStorage.getItem('att-pomodoro-' + isoDate(new Date())) || 0; } catch (e) { done = 0; }
      U.live([work, rest, rounds, longRest, warm, cool, unit], build);
      root.appendChild(U.panel(null, mode, stage, ring, U.btnrow(startBtn, skipBtn, resetBtn), plan));
      root.appendChild(U.panel('Settings', el('div', { class: 'row' }, work, rest, rounds, unit), el('div', { class: 'row' }, longRest, warm, cool), U.row(sound, notify),
        U.note('Space starts and pauses. Pomodoro: 25 minutes of work, 5 of rest, a long break after four rounds. Tabata: 20 seconds on, 10 off, eight rounds. Work phases you finish are counted for today in this browser.')));
      U.onTeardown(root, function () { clearInterval(timer); document.removeEventListener('keydown', key); document.title = 'All The Tools'; if (actx) actx.close(); });
    }
  });

  /* --- Sleep Cycle Calculator --------------------------------------------- */

  Tools.register({
    id: 'sleep-calculator', category: 'health', name: 'Sleep Cycle Calculator',
    description: 'The best times to fall asleep or wake up so you finish a full 90-minute cycle instead of waking groggy in the middle of one.',
    keywords: ['sleep', 'sleep cycle', 'bedtime', 'wake up time', 'when to go to bed', 'rem', '90 minutes', 'alarm', 'nap', 'sleep calculator', 'health'],
    render: function (root) {
      root.classList.add('g-time');
      var which = U.chips([{ value: 'wake', label: 'I need to wake up at…' }, { value: 'bed', label: 'I am going to bed at…' }, { value: 'now', label: 'I am going to bed now' }], function () { run(); }, 'wake');
      var t = U.input({ label: 'Time', type: 'time', value: '07:00' });
      var cycle = U.input({ label: 'Cycle length (min)', type: 'number', min: 60, max: 120, value: '90' });
      var latency = U.input({ label: 'Time to fall asleep (min)', type: 'number', min: 0, max: 60, value: '14' });
      var out = el('div', { class: 'cards' });
      var lead = el('p', { class: 'mid' });
      function fmt(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
      function run() {
        var c = +val(cycle) || 90, lat = +val(latency) || 0, m = val(which) === 'now' ? null : val(t);
        t.style.display = which.value === 'now' ? 'none' : '';
        var base = new Date(); base.setSeconds(0, 0);
        if (which.value !== 'now') { if (!m) return; base.setHours(+m.slice(0, 2), +m.slice(3, 5), 0, 0); }
        out.replaceChildren();
        var rows = [];
        if (which.value === 'wake') {
          lead.textContent = 'To wake at ' + fmt(base) + ' at the end of a cycle, fall asleep at one of these times (bed ' + lat + ' minutes earlier):';
          for (var n = 6; n >= 3; n--) { var d = new Date(base.getTime() - (n * c + lat) * 60000); rows.push([d, n]); }
        } else {
          lead.textContent = 'Going to bed at ' + fmt(base) + ' and asleep by ' + fmt(new Date(base.getTime() + lat * 60000)) + ', set the alarm for one of these:';
          for (var k = 3; k <= 6; k++) { var w = new Date(base.getTime() + (k * c + lat) * 60000); rows.push([w, k]); }
        }
        rows.forEach(function (r) {
          var hrs = r[1] * c / 60;
          out.appendChild(el('div', { class: 'card' + (r[1] >= 5 ? ' on' : ''), style: r[1] >= 5 ? { borderColor: 'var(--ok)' } : {} }, el('div', { class: 'big', dataset: { k: 'time' }, text: fmt(r[0]) }), el('h4', { text: r[1] + ' cycles · ' + (Math.round(hrs * 10) / 10) + ' h' }), el('div', { class: 'muted', text: r[1] >= 5 ? 'Recommended for adults' : r[1] === 4 ? 'Short night' : 'Emergency only' })));
        });
      }
      U.live([t, cycle, latency], run);
      var ages = U.table(['Age', 'Recommended sleep'], [['Newborn (0–3 months)', '14–17 h'], ['Infant (4–11 months)', '12–15 h'], ['Toddler (1–2 years)', '11–14 h'], ['Preschool (3–5)', '10–13 h'], ['School age (6–13)', '9–11 h'], ['Teenager (14–17)', '8–10 h'], ['Adult (18–64)', '7–9 h'], ['Older adult (65+)', '7–8 h']]);
      root.appendChild(U.panel(null, which, U.row(t, cycle, latency), lead, out));
      root.appendChild(U.panel('How much sleep', ages, U.note('Sleep runs in cycles of roughly 90 minutes that end in light sleep; an alarm at a cycle boundary feels far better than one 20 minutes into deep sleep. The average adult takes about 14 minutes to fall asleep. Recommendations are the National Sleep Foundation figures.')));
    }
  });
})();
