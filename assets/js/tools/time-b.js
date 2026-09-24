/* time-b tools: Timesheet & Hours Worked Calculator, Date Format Converter,
   UK Bank Holidays and Easter Date Calculator. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-time-b-style')) {
    document.head.appendChild(el('style', { id: 'g-time-b-style', text: [
      '.g-timeb .tb-big { font-size: 28px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.2; }',
      '.g-timeb .tb-muted { color: var(--fg-muted); font-size: 13px; }',
      '.g-timeb .tb-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; }',
      '.g-timeb .tb-card { border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-elev); padding: 12px 14px; }',
      '.g-timeb .tb-card h4 { margin: 0 0 4px; font-size: 14px; }',
      '.g-timeb .tb-card.hi { border-color: var(--accent); }',
      '.g-timeb .tb-ts { min-width: 640px; }',
      '.g-timeb .tb-ts input { width: 100%; min-width: 58px; }',
      '.g-timeb .tb-ts td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }',
      '.g-timeb .tb-ts input.bad { border-color: var(--err); outline-color: var(--err); }',
      '.g-timeb .tb-sub { display: block; color: var(--fg-muted); font-size: 11px; }',
      '.g-timeb .tb-out { font-family: var(--mono); font-size: 18px; word-break: break-word; white-space: pre-wrap; padding: 10px 12px; border-radius: var(--radius); background: var(--bg-sunken); border: 1px solid var(--border); min-height: 1.6em; }',
      '.g-timeb .tb-warn { margin: 6px 0 0; padding-left: 18px; color: var(--fg-muted); font-size: 13px; }',
      '.g-timeb .tb-warn:empty { display: none; }',
      '.g-timeb .tb-fmt { display: grid; grid-template-columns: minmax(120px, 210px) minmax(0, 1fr) auto; gap: 6px 10px; align-items: center; }',
      '.g-timeb .tb-fmt b { font-size: 13px; color: var(--fg-muted); font-weight: 600; }',
      '.g-timeb .tb-fmt code, .g-timeb td code { font-family: var(--mono); overflow-wrap: anywhere; }',
      '.g-timeb details > summary { cursor: pointer; font-weight: 600; margin-bottom: 8px; }',
      '.g-timeb .row > .field { max-width: 100%; }',
      '.g-timeb .tb-yes { color: var(--ok); font-weight: 700; }',
      '@media (max-width: 560px) { .g-timeb .tb-fmt { grid-template-columns: minmax(0, 1fr) auto; } .g-timeb .tb-fmt b { grid-column: 1 / -1; } }'
    ].join('\n') }));
  }

  /* --- shared helpers ---------------------------------------------------- */

  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAY3 = DAYS.map(function (d) { return d.slice(0, 3); });
  var MON3 = MONTHS.map(function (m) { return m.slice(0, 3); });

  function pad(n, w) { var s = String(Math.abs(n)); while (s.length < (w || 2)) s = '0' + s; return (n < 0 ? '-' : '') + s; }
  function spad(n, w) { var s = String(n); while (s.length < w) s = ' ' + s; return s; }
  function inp(node) { return node.querySelector ? (node.querySelector('input, select, textarea') || node) : node; }
  function val(node) { return inp(node).value; }
  function setVal(node, v) { inp(node).value = v; }
  function num(node) { var n = parseFloat(String(val(node)).replace(/,/g, '')); return isFinite(n) ? n : NaN; }
  function mod(a, b) { return ((a % b) + b) % b; }
  function ordinal(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

  /* Calendar dates are held as UTC midnights, so adding days never trips over
     the clocks changing. setUTCFullYear keeps years below 100 as written. */
  function utcDate(y, m, d) { var dt = new Date(0); dt.setUTCFullYear(y, m - 1, d); return dt; }
  function addDays(dt, n) { return new Date(dt.getTime() + n * 86400000); }
  function isoOf(dt) { return pad(dt.getUTCFullYear(), 4) + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate()); }
  function ukOf(dt) { return pad(dt.getUTCDate()) + '/' + pad(dt.getUTCMonth() + 1) + '/' + pad(dt.getUTCFullYear(), 4); }
  function longOf(dt) { return DAYS[dt.getUTCDay()] + ' ' + dt.getUTCDate() + ' ' + MONTHS[dt.getUTCMonth()] + ' ' + dt.getUTCFullYear(); }
  function todayUTC() { var n = new Date(); return utcDate(n.getFullYear(), n.getMonth() + 1, n.getDate()); }
  function dayCount(a, b) { return Math.round((b - a) / 86400000); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  function yearField(label, value, min, max) {
    var f = U.input({ label: label, type: 'number', min: min, max: max, step: 1, value: String(value) });
    f.year = function () { var y = Math.round(num(f)); return y >= min && y <= max ? y : NaN; };
    f.bump = function (by) { var y = f.year(); if (isNaN(y)) y = new Date().getFullYear(); setVal(f, String(Math.max(min, Math.min(max, y + by)))); inp(f).dispatchEvent(new Event('input', { bubbles: true })); };
    return f;
  }

  /* Minimal .ics pieces for the bank-holiday export. time.js exports the
     full versions as TimeKit; these stand in when it is not loaded. */
  function icsEscape(s) { return window.TimeKit ? TimeKit.icsEscape(s) : String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function icsFold(line) { return window.TimeKit ? TimeKit.icsFold(line) : line; }
  function icsStampNow() { var d = new Date(); return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z'; }

  /* ======================================================================= */
  /* Timesheet & Hours Worked Calculator                                     */
  /* ======================================================================= */

  var TS_KEY = 'att-timesheet-v1';
  var WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  /* "9", "0930", "9:30", "9.30" and "21h15" all read as 24-hour times.
     null means the box is empty, NaN means it cannot be read. */
  function parseHM(s) {
    s = String(s === null || s === undefined ? '' : s).trim();
    if (!s) return null;
    var m = /^(\d{1,2})(?:[:.h]?(\d{2}))?$/i.exec(s);
    if (!m) return NaN;
    var h = +m[1], mi = m[2] ? +m[2] : 0;
    if (mi > 59 || h > 24 || (h === 24 && mi > 0)) return NaN;
    return h * 60 + mi;
  }
  function hmText(min) { return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
  function hm(min) { min = Math.round(min); return Math.floor(min / 60) + ':' + pad(min % 60); }
  function decHours(min) { return (min / 60).toFixed(2); }
  function gbp(n) { return '£' + (Math.round(n * 100) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  Tools.register({
    id: 'timesheet-calculator', category: 'time', name: 'Timesheet & Hours Worked Calculator',
    description: 'Add up hours worked from start and finish times, with unpaid breaks, overnight shifts, overtime and pay in pounds.',
    keywords: ['timesheet', 'hours worked', 'time card', 'timecard', 'work hours', 'shift calculator', 'overtime', 'pay', 'wages',
      'clock in', 'clock out', 'break', 'decimal hours', 'payroll', 'rota', 'night shift', 'labor', 'labour', 'csv'],
    render: function (root) {
      root.classList.add('g-timeb');
      var saved = null;
      try { saved = JSON.parse(localStorage.getItem(TS_KEY) || 'null'); } catch (e) { saved = null; }
      var s0 = saved || {};

      var rate = U.input({ label: 'Hourly rate (£)', type: 'number', min: 0, step: '0.01', value: s0.rate !== undefined ? s0.rate : '12.71',
        hint: 'The National Living Wage for ages 21 and over is £12.71 from 1 April 2026.' });
      var thresh = U.input({ label: 'Overtime after (hours)', type: 'number', min: 0, step: '0.25', value: s0.thresh !== undefined ? s0.thresh : '37.5' });
      var basis = U.select({ label: 'Overtime counted', options: [{ value: 'week', label: 'per week' }, { value: 'day', label: 'per day' }], value: s0.basis || 'week' });
      var mult = U.input({ label: 'Overtime rate (× hourly rate)', type: 'number', min: 0, step: '0.05', value: s0.mult !== undefined ? s0.mult : '1.5' });

      var body = el('tbody');
      var rows = [];
      var last = { total: 0, reg: 0, ot: 0, regPay: 0, otPay: 0, rate: 0, mult: 0 };

      function addRow(r) {
        r = r || {};
        var n = rows.length + 1;
        var row = {
          day: el('input', { type: 'text', value: r.day !== undefined ? r.day : (WEEK[rows.length % 7] || ''), 'aria-label': 'Day, row ' + n }),
          start: el('input', { type: 'text', inputMode: 'numeric', placeholder: '09:00', maxLength: 5, value: r.start || '', 'aria-label': 'Start, row ' + n }),
          end: el('input', { type: 'text', inputMode: 'numeric', placeholder: '17:00', maxLength: 5, value: r.end || '', 'aria-label': 'End, row ' + n }),
          brk: el('input', { type: 'number', min: 0, step: 5, value: r.brk !== undefined ? String(r.brk) : '0', 'aria-label': 'Unpaid break in minutes, row ' + n }),
          hours: el('td', { class: 'num' }),
          dec: el('td', { class: 'num', dataset: { k: 'row-dec' } }),
          mins: 0
        };
        row.tr = el('tr', {}, el('td', row.day), el('td', row.start), el('td', row.end), el('td', row.brk), row.hours, row.dec,
          el('td', U.button('×', function () {
            rows.splice(rows.indexOf(row), 1);
            row.tr.remove();
            relabel();
            recalc();
          }, 'ghost')));
        [row.start, row.end].forEach(function (box) {
          box.addEventListener('blur', function () { var t = parseHM(box.value); if (t !== null && !isNaN(t)) box.value = hmText(t); });
        });
        rows.push(row);
        body.appendChild(row.tr);
        relabel();
        return row;
      }
      function relabel() {
        rows.forEach(function (r, i) {
          r.day.setAttribute('aria-label', 'Day, row ' + (i + 1));
          r.start.setAttribute('aria-label', 'Start, row ' + (i + 1));
          r.end.setAttribute('aria-label', 'End, row ' + (i + 1));
          r.brk.setAttribute('aria-label', 'Unpaid break in minutes, row ' + (i + 1));
          r.tr.lastChild.firstChild.setAttribute('aria-label', 'Remove row ' + (i + 1));
        });
      }
      function setRows(list) {
        rows.slice().forEach(function (r) { r.tr.remove(); });
        rows = [];
        list.forEach(addRow);
        recalc();
      }

      var totals = el('div');
      var status = U.note('');

      function recalc() {
        var th = Math.max(0, num(thresh) || 0) * 60;
        var perDay = val(basis) === 'day';
        var total = 0, otDay = 0, problems = [];
        rows.forEach(function (r, i) {
          var s = parseHM(r.start.value), e = parseHM(r.end.value), b = Math.max(0, +r.brk.value || 0);
          r.start.classList.toggle('bad', s !== null && isNaN(s));
          r.end.classList.toggle('bad', e !== null && isNaN(e));
          r.mins = 0;
          r.dec.textContent = '';
          r.hours.replaceChildren();
          if (s === null && e === null) return;
          if (s === null || e === null || isNaN(s) || isNaN(e)) {
            r.hours.textContent = '—';
            problems.push('Row ' + (i + 1) + ': enter both times as 24-hour hh:mm.');
            return;
          }
          var span = e - s, overnight = span < 0;
          if (overnight) span += 1440;
          if (span === 0) { r.hours.textContent = '0:00'; problems.push('Row ' + (i + 1) + ': the start and end times are the same.'); return; }
          if (b > span) { r.hours.textContent = '—'; problems.push('Row ' + (i + 1) + ': the break is longer than the shift.'); return; }
          r.mins = span - b;
          total += r.mins;
          if (perDay) otDay += Math.max(0, r.mins - th);
          r.hours.append(el('span', { dataset: { k: 'row-hm' }, text: hm(r.mins) }), overnight ? el('span', { class: 'tb-sub', text: 'overnight' }) : null);
          r.dec.textContent = decHours(r.mins);
        });
        var ot = perDay ? otDay : Math.max(0, total - th);
        var reg = total - ot, rt = Math.max(0, num(rate) || 0), m = Math.max(0, num(mult) || 0);
        last = { total: total, reg: reg, ot: ot, rate: rt, mult: m, regPay: Math.round(reg / 60 * rt * 100) / 100, otPay: Math.round(ot / 60 * rt * m * 100) / 100 };
        function stat(label, value, k) { return el('div', { class: 'stat' }, el('b', { dataset: { k: k }, text: value }), el('span', { text: label })); }
        totals.replaceChildren(el('div', { class: 'stats' },
          stat('Total hours', hm(total), 'total-hm'),
          stat('Total (decimal)', decHours(total), 'total-dec'),
          stat('Regular hours', decHours(reg), 'regular-dec'),
          stat('Overtime hours', decHours(ot), 'overtime-dec'),
          stat('Regular pay', gbp(last.regPay), 'pay-regular'),
          stat('Overtime pay', gbp(last.otPay), 'pay-overtime'),
          stat('Total pay', gbp(last.regPay + last.otPay), 'pay-total')));
        status.className = 'note' + (problems.length ? ' err' : '');
        status.textContent = problems.join(' ');
        save();
      }
      function save() {
        try {
          localStorage.setItem(TS_KEY, JSON.stringify({ rate: val(rate), thresh: val(thresh), basis: val(basis), mult: val(mult),
            rows: rows.map(function (r) { return { day: r.day.value, start: r.start.value, end: r.end.value, brk: r.brk.value }; }) }));
        } catch (e) { /* private mode: the sheet just is not kept */ }
      }
      function csv() {
        var lines = [['Day', 'Start', 'End', 'Unpaid break (min)', 'Hours (h:mm)', 'Hours (decimal)']];
        rows.forEach(function (r) {
          if (!r.start.value && !r.end.value) return;
          var s = parseHM(r.start.value), e = parseHM(r.end.value);
          lines.push([r.day.value, s === null || isNaN(s) ? r.start.value : hmText(s), e === null || isNaN(e) ? r.end.value : hmText(e),
            String(Math.max(0, +r.brk.value || 0)), r.mins ? hm(r.mins) : '', r.mins ? decHours(r.mins) : '']);
        });
        lines.push([]);
        lines.push(['Total', '', '', '', hm(last.total), decHours(last.total)]);
        lines.push(['Regular hours', '', '', '', hm(last.reg), decHours(last.reg)]);
        lines.push(['Overtime hours', '', '', '', hm(last.ot), decHours(last.ot)]);
        lines.push(['Hourly rate (£)', last.rate.toFixed(2)]);
        lines.push(['Overtime rate (× hourly)', String(last.mult)]);
        lines.push(['Regular pay (£)', last.regPay.toFixed(2)]);
        lines.push(['Overtime pay (£)', last.otPay.toFixed(2)]);
        lines.push(['Total pay (£)', (last.regPay + last.otPay).toFixed(2)]);
        /* The byte-order mark makes Excel read the £ signs as UTF-8. */
        return '\uFEFF' + window.CSV.stringify(lines) + '\r\n';
      }

      body.addEventListener('input', U.debounce(recalc, 120));
      body.addEventListener('change', recalc);
      [rate, thresh, basis, mult].forEach(function (f) { inp(f).addEventListener('input', recalc); inp(f).addEventListener('change', recalc); });

      var table = el('table', { class: 'data tb-ts' },
        el('thead', el('tr', {}, ['Day', 'Start', 'End', 'Unpaid break (min)', 'Hours', 'Decimal', ''].map(function (h) { return el('th', { text: h }); }))),
        body);

      root.appendChild(U.panel(null, el('div', { class: 'scroll' }, table),
        U.btnrow(
          U.button('Add row', function () { addRow({ day: '' }); recalc(); }),
          U.button('Standard week', function () {
            setRows(WEEK.map(function (d, i) { return i < 5 ? { day: d, start: '09:00', end: '17:00', brk: 30 } : { day: d, brk: 0 }; }));
          }),
          U.button('Clear times', function () { setRows(WEEK.map(function (d) { return { day: d, brk: 0 }; })); }, 'ghost')),
        status,
        U.note('Times are 24-hour (09:30, 0930 or 9.30 all work). A finish earlier than the start counts as the next day, for night shifts.')));
      root.appendChild(U.panel('Overtime and pay', U.row(rate, thresh, basis, mult)));
      root.appendChild(U.panel('Totals', totals,
        U.btnrow(U.downloadBtn('Download CSV', 'timesheet.csv', csv, 'text/csv'),
          U.copyBtn('Copy totals', function () {
            return 'Total ' + hm(last.total) + ' (' + decHours(last.total) + ' h), overtime ' + decHours(last.ot) + ' h, pay ' + gbp(last.regPay + last.otPay);
          })),
        U.note('Pay is before tax and National Insurance. The timesheet is kept in this browser so you can come back to it.')));

      if (s0.rows && s0.rows.length) setRows(s0.rows);
      else setRows(WEEK.map(function (d, i) { return i < 5 ? { day: d, start: '09:00', end: '17:00', brk: 30 } : { day: d, brk: 0 }; }));
    }
  });

  /* ======================================================================= */
  /* Date Format Converter                                                   */
  /* ======================================================================= */

  /* Patterns in every syntax are read into one list of neutral tokens
     ({t: 'M', w: 'long'} is "the month's full name"), formatted from that
     list, and written back out in any other syntax. A token a syntax cannot
     express falls back to its nearest relative with a warning. */

  var SYNTAXES = [
    { id: 'strftime', chip: 'strftime', name: 'strftime (C, Python, PHP)' },
    { id: 'ldml', chip: 'Unicode LDML', name: 'Unicode LDML (Java, ICU, date-fns)' },
    { id: 'moment', chip: 'Moment / Day.js', name: 'Moment.js / Day.js' },
    { id: 'dotnet', chip: '.NET', name: '.NET custom format' },
    { id: 'go', chip: 'Go', name: 'Go reference layout' }
  ];
  function syntaxName(id) { return SYNTAXES.filter(function (s) { return s.id === id; })[0].name; }

  /* --- wall-clock fields for an instant in a time zone -------------------- */

  var dtfCache = {};
  function utcMs(y, mo, d, h, mi, s, ms) { var dt = new Date(0); dt.setUTCFullYear(y, mo - 1, d); dt.setUTCHours(h || 0, mi || 0, s || 0, ms || 0); return dt.getTime(); }
  function wallParts(ms, zone) {
    var f = dtfCache[zone] || (dtfCache[zone] = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23', era: 'short', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'
    }));
    var o = {};
    f.formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = p.value; });
    var y = +o.year;
    if (/^B/.test(o.era || '')) y = 1 - y;
    return { y: y, mo: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second };
  }
  function offsetAt(ms, zone) {
    var w = wallParts(ms, zone);
    return Math.round((utcMs(w.y, w.mo, w.d, w.h, w.mi, w.s, 0) - Math.floor(ms / 1000) * 1000) / 60000);
  }
  /* A wall-clock time in a zone -> the instant. The second pass settles
     times near a clock change. */
  function zonedToUtc(zone, y, mo, d, h, mi, s, ms) {
    var guess = utcMs(y, mo, d, h, mi, s, ms);
    var off = offsetAt(guess, zone);
    var t = guess - off * 60000;
    var off2 = offsetAt(t, zone);
    if (off2 !== off) t = guess - off2 * 60000;
    return t;
  }
  function zoneName(ms, zone, style) {
    var got = '';
    var locales = style === 'long' ? ['en-GB'] : ['en-GB', 'en-US'];
    for (var i = 0; i < locales.length; i++) {
      try {
        var part = new Intl.DateTimeFormat(locales[i], { timeZone: zone, timeZoneName: style }).formatToParts(new Date(ms))
          .filter(function (p) { return p.type === 'timeZoneName'; })[0];
        got = part ? part.value : got;
      } catch (e) { /* unknown zone */ }
      if (got && !/^(GMT|UTC)[+\-−]/.test(got)) return got;
    }
    return got;
  }
  function isoWeekOf(dt) {
    var t = new Date(dt.getTime());
    var day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    var y = t.getUTCFullYear();
    return { year: y, week: Math.ceil((dayCount(utcDate(y, 1, 1), t) + 1) / 7) };
  }
  function fieldsAt(ms, zone) {
    var w = wallParts(ms, zone);
    var msec = mod(ms, 1000);
    var off = Math.round((utcMs(w.y, w.mo, w.d, w.h, w.mi, w.s, 0) - (ms - msec)) / 60000);
    var date = utcDate(w.y, w.mo, w.d);
    var wd = date.getUTCDay();
    var doy = dayCount(utcDate(w.y, 1, 1), date) + 1;
    var iw = isoWeekOf(date);
    return { ms: ms, zone: zone, y: w.y, mo: w.mo, d: w.d, h: w.h, mi: w.mi, s: w.s, msec: msec, off: off, wd: wd, doy: doy,
      isoWeek: iw.week, isoYear: iw.year, weekU: Math.floor((doy + 6 - wd) / 7), weekW: Math.floor((doy + 6 - (wd + 6) % 7) / 7) };
  }

  /* --- formatting one token --------------------------------------------- */

  function padYear(y, n) { return n ? pad(y, n) : String(y); }
  function fmtOffset(off, w, z) {
    if (z && off === 0) return 'Z';
    var sign = off < 0 ? '-' : '+', a = Math.abs(off), hh = pad(Math.floor(a / 60)), mm = pad(a % 60);
    switch (w) {
      case 'hhmm': return sign + hh + mm;
      case 'hh:mm': return sign + hh + ':' + mm;
      case 'hh': return sign + hh;
      case 'hhOptMm': return sign + hh + (a % 60 ? mm : '');
      case 'h': return sign + Math.floor(a / 60);
      case 'hhmmss': return sign + hh + mm + '00';
      case 'hh:mm:ss': return sign + hh + ':' + mm + ':00';
      case 'gmt': return off === 0 ? 'GMT' : 'GMT' + sign + hh + ':' + mm;
      case 'gmtShort': return off === 0 ? 'GMT' : 'GMT' + sign + Math.floor(a / 60) + (a % 60 ? ':' + mm : '');
    }
    return '';
  }
  function fmtToken(tok, F) {
    var out = fmtRaw(tok, F);
    return tok.upper ? String(out).toUpperCase() : String(out);
  }
  function fmtRaw(tok, F) {
    var h12 = F.h % 12 || 12;
    switch (tok.t) {
      case 'lit': return tok.v;
      case 'year': return padYear(F.y, tok.pad);
      case 'yy': return pad(mod(F.y, 100), 2);
      case 'y2n': return String(mod(F.y, 100));
      case 'isoYear': return padYear(F.isoYear, tok.pad);
      case 'isoYY': return pad(mod(F.isoYear, 100), 2);
      case 'century': return pad(Math.floor(F.y / 100), 2);
      case 'era': return F.y > 0 ? { short: 'AD', long: 'Anno Domini', narrow: 'A', dotted: 'A.D.' }[tok.w] : { short: 'BC', long: 'Before Christ', narrow: 'B', dotted: 'B.C.' }[tok.w];
      case 'q':
        var q = Math.floor((F.mo - 1) / 3) + 1;
        return { num: q, num2: pad(q), short: 'Q' + q, long: ordinal(q) + ' quarter', ord: ordinal(q) }[tok.w];
      case 'M': return { num: F.mo, num2: pad(F.mo), short: MON3[F.mo - 1], long: MONTHS[F.mo - 1], narrow: MONTHS[F.mo - 1][0], ord: ordinal(F.mo) }[tok.w];
      case 'd': return { num: F.d, num2: pad(F.d), sp: spad(F.d, 2), ord: ordinal(F.d) }[tok.w];
      case 'doy': return { num: F.doy, num2: pad(F.doy), num3: pad(F.doy, 3), sp3: spad(F.doy, 3), ord: ordinal(F.doy) }[tok.w];
      case 'wd': return { short: DAY3[F.wd], long: DAYS[F.wd], narrow: DAYS[F.wd][0], min2: DAYS[F.wd].slice(0, 2) }[tok.w];
      case 'wdnum': var n = tok.base === 'iso' ? (F.wd || 7) : tok.base === 'sun0' ? F.wd : (F.wd + 6) % 7; return tok.pad ? pad(n, tok.pad) : n;
      case 'isoWeek': return { num: F.isoWeek, num2: pad(F.isoWeek), ord: ordinal(F.isoWeek) }[tok.w];
      case 'weekU': return pad(F.weekU);
      case 'weekW': return pad(F.weekW);
      case 'H': return { num: F.h, num2: pad(F.h), sp: spad(F.h, 2) }[tok.w];
      case 'h': return { num: h12, num2: pad(h12), sp: spad(h12, 2) }[tok.w];
      case 'k': return tok.w === 'num2' ? pad(F.h || 24) : (F.h || 24);
      case 'K': return tok.w === 'num2' ? pad(F.h % 12) : F.h % 12;
      case 'm': return tok.w === 'num2' ? pad(F.mi) : F.mi;
      case 's': return tok.w === 'num2' ? pad(F.s) : F.s;
      case 'frac':
        var digits = (pad(F.msec, 3) + '000000').slice(0, tok.n);
        if (tok.trim) { digits = digits.replace(/0+$/, ''); return digits ? (tok.sep || '') + digits : ''; }
        return digits;
      case 'ampm':
        var pm = F.h >= 12;
        return { upper: pm ? 'PM' : 'AM', lower: pm ? 'pm' : 'am', upper1: pm ? 'P' : 'A', lower1: pm ? 'p' : 'a', dotted: pm ? 'p.m.' : 'a.m.' }[tok.w];
      case 'off': return fmtOffset(F.off, tok.w, tok.z);
      case 'tzAbbr': return zoneName(F.ms, F.zone, 'short');
      case 'tzLong': return zoneName(F.ms, F.zone, 'long');
      case 'tzId': return F.zone;
      case 'epochS': return String(Math.floor(F.ms / 1000));
      case 'epochMs': return String(F.ms);
    }
    return '';
  }
  function formatTokens(parsed, ms, zone) {
    var F = fieldsAt(ms, parsed.utc ? 'UTC' : zone);
    return parsed.tokens.map(function (t) { return fmtToken(t, F); }).join('');
  }

  /* --- reading patterns -------------------------------------------------- */

  function T(t, w, extra) { var o = { t: t }; if (w !== undefined && w !== null) o.w = w; return extra ? Object.assign(o, extra) : o; }
  function lit(list, text) {
    if (!text) return;
    var lastTok = list[list.length - 1];
    if (lastTok && lastTok.t === 'lit') lastTok.v += text;
    else list.push({ t: 'lit', v: text });
  }
  function pushAll(list, toks) { [].concat(toks).forEach(function (t) { if (t.t === 'lit') lit(list, t.v); else list.push(t); }); }

  var STRF = {
    Y: T('year', null, { pad: 4 }), y: T('yy'), C: T('century'), G: T('isoYear', null, { pad: 4 }), g: T('isoYY'),
    m: T('M', 'num2'), b: T('M', 'short'), h: T('M', 'short'), B: T('M', 'long'),
    d: T('d', 'num2'), e: T('d', 'sp'), j: T('doy', 'num3'),
    a: T('wd', 'short'), A: T('wd', 'long'), u: T('wdnum', null, { base: 'iso' }), w: T('wdnum', null, { base: 'sun0' }),
    V: T('isoWeek', 'num2'), U: T('weekU'), W: T('weekW'),
    H: T('H', 'num2'), k: T('H', 'sp'), I: T('h', 'num2'), l: T('h', 'sp'),
    M: T('m', 'num2'), S: T('s', 'num2'), f: T('frac', null, { n: 6 }),
    p: T('ampm', 'upper'), P: T('ampm', 'lower'),
    z: T('off', 'hhmm'), Z: T('tzAbbr'), s: T('epochS'),
    n: { t: 'lit', v: '\n' }, t: { t: 'lit', v: '\t' }, '%': { t: 'lit', v: '%' }
  };
  /* Composite conversions, in the C/POSIX locale. */
  var STRF_COMPOSITE = { D: '%m/%d/%y', F: '%Y-%m-%d', T: '%H:%M:%S', R: '%H:%M', r: '%I:%M:%S %p', c: '%a %b %e %H:%M:%S %Y', x: '%m/%d/%y', X: '%H:%M:%S', '+': '%a %b %e %H:%M:%S %Z %Y' };

  function copyTok(t) { return Object.assign({}, t); }
  function unpadded(t) {
    var c = copyTok(t);
    if (c.w === 'num2' || c.w === 'sp' || c.w === 'num3') c.w = 'num';
    else if (c.t === 'yy') { c.t = 'y2n'; }
    else if (c.t === 'year' || c.t === 'isoYear') c.pad = 0;
    return c;
  }
  function spacePadded(t) {
    var c = copyTok(t);
    if (c.w === 'num2' || c.w === 'num') c.w = c.t === 'doy' ? 'sp3' : 'sp';
    return c;
  }

  function readStrftime(p) {
    var out = [], warn = [], i = 0;
    while (i < p.length) {
      var c = p[i];
      if (c !== '%') { lit(out, c); i++; continue; }
      var j = i + 1, flag = '';
      if (j < p.length - 1 && '-_0^#'.indexOf(p[j]) > -1) { flag = p[j]; j++; }
      if (p[j] === ':' && p[j + 1] === 'z') { out.push(T('off', 'hh:mm')); i = j + 2; continue; }
      var d = p[j];
      if (d === undefined) { lit(out, '%'); warn.push('The pattern ends with a lone %.'); break; }
      if (STRF_COMPOSITE[d]) { pushAll(out, readStrftime(STRF_COMPOSITE[d]).tokens); i = j + 1; continue; }
      var tok = STRF[d];
      if (!tok) { lit(out, '%' + flag + d); warn.push('%' + d + ' is not a strftime directive, so it is shown as it is.'); i = j + 1; continue; }
      if (tok.t === 'lit') { lit(out, tok.v); i = j + 1; continue; }
      tok = copyTok(tok);
      if (flag === '-' || flag === '#') tok = unpadded(tok);
      else if (flag === '_') tok = spacePadded(tok);
      else if (flag === '0' && tok.w === 'sp') tok.w = tok.t === 'doy' ? 'num3' : 'num2';
      else if (flag === '^') tok.upper = true;
      out.push(tok);
      i = j + 1;
    }
    return { tokens: out, warnings: warn };
  }

  /* date-fns en-GB long formats (P, PP, … and p, pp). */
  var LDML_LOCAL = { P: 'dd/MM/yyyy', PP: 'd MMM yyyy', PPP: 'd MMMM yyyy', PPPP: 'EEEE, d MMMM yyyy', p: 'HH:mm', pp: 'HH:mm:ss' };

  function ldmlToken(c, n, ord) {
    if (ord) {
      var o = { d: T('d', 'ord'), D: T('doy', 'ord'), M: T('M', 'ord'), L: T('M', 'ord'), Q: T('q', 'ord'), q: T('q', 'ord'), w: T('isoWeek', 'ord'), I: T('isoWeek', 'ord') }[c];
      if (o) return o;
    }
    switch (c) {
      case 'G': return T('era', n <= 3 ? 'short' : n === 4 ? 'long' : 'narrow');
      case 'y': case 'u': return n === 2 && c === 'y' ? T('yy') : T('year', null, { pad: n === 1 ? 0 : n });
      case 'Y': case 'R': return n === 2 && c === 'Y' ? T('isoYY') : T('isoYear', null, { pad: n === 1 ? 0 : n });
      case 'Q': case 'q': return T('q', ['num', 'num', 'num2', 'short', 'long', 'num'][Math.min(n, 5)]);
      case 'M': case 'L': return T('M', ['num', 'num', 'num2', 'short', 'long', 'narrow'][Math.min(n, 5)]);
      case 'w': case 'I': return T('isoWeek', n >= 2 ? 'num2' : 'num');
      case 'd': return T('d', n >= 2 ? 'num2' : 'num');
      case 'D': return T('doy', n === 1 ? 'num' : n === 2 ? 'num2' : 'num3');
      case 'E': return T('wd', n <= 3 ? 'short' : n === 4 ? 'long' : n === 5 ? 'narrow' : 'min2');
      case 'e': case 'c': case 'i':
        if (n <= 2) return T('wdnum', null, { base: 'iso', pad: n === 2 ? 2 : 0 });
        return T('wd', n === 3 ? 'short' : n === 4 ? 'long' : n === 5 ? 'narrow' : 'min2');
      case 'a': return T('ampm', n <= 2 ? 'upper' : n === 3 ? 'lower' : n === 4 ? 'dotted' : 'lower1');
      case 'h': return T('h', n >= 2 ? 'num2' : 'num');
      case 'H': return T('H', n >= 2 ? 'num2' : 'num');
      case 'k': return T('k', n >= 2 ? 'num2' : 'num');
      case 'K': return T('K', n >= 2 ? 'num2' : 'num');
      case 'm': return T('m', n >= 2 ? 'num2' : 'num');
      case 's': return T('s', n >= 2 ? 'num2' : 'num');
      case 'S': return T('frac', null, { n: n });
      case 'z': return T(n <= 3 ? 'tzAbbr' : 'tzLong');
      case 'Z': return n <= 3 ? T('off', 'hhmm') : n === 4 ? T('off', 'gmt') : T('off', 'hh:mm', { z: true });
      case 'O': return T('off', n === 1 ? 'gmtShort' : 'gmt');
      case 'X': return T('off', n === 1 ? 'hhOptMm' : n === 2 || n === 4 ? 'hhmm' : 'hh:mm', { z: true });
      case 'x': return T('off', n === 1 ? 'hhOptMm' : n === 2 || n === 4 ? 'hhmm' : 'hh:mm');
      case 'V': return n === 2 ? T('tzId') : null;
      case 'v': return T(n === 1 ? 'tzAbbr' : 'tzLong');
      case 't': return T('epochS');
      case 'T': return T('epochMs');
    }
    return null;
  }

  function readLdml(p) {
    var out = [], warn = [], i = 0;
    while (i < p.length) {
      var c = p[i];
      if (c === "'") {
        if (p[i + 1] === "'") { lit(out, "'"); i += 2; continue; }
        var j = i + 1, buf = '', closed = false;
        while (j < p.length) {
          if (p[j] === "'") {
            if (p[j + 1] === "'") { buf += "'"; j += 2; continue; }
            closed = true; j++; break;
          }
          buf += p[j]; j++;
        }
        if (!closed) warn.push('A quote was not closed, so the rest is read as text.');
        lit(out, buf);
        i = j;
        continue;
      }
      if (/[A-Za-z]/.test(c)) {
        var n = 1;
        while (p[i + n] === c) n++;
        /* date-fns ordinals: do, Do, Mo, Qo, wo… */
        var ord = n === 1 && p[i + 1] === 'o' && 'dDMLQqwI'.indexOf(c) > -1;
        if (c === 'P' || c === 'p') {
          var key = p.slice(i, i + n);
          if (LDML_LOCAL[key]) pushAll(out, readLdml(LDML_LOCAL[key]).tokens);
          else { lit(out, key); warn.push('"' + key + '" is not a supported date-fns long format; P to PPPP and p or pp are.'); }
          i += n;
          continue;
        }
        var tok = ldmlToken(c, n, ord);
        if (!tok) { lit(out, p.slice(i, i + n)); warn.push('"' + p.slice(i, i + n) + '" is not a supported pattern letter here; quote text like \'this\'.'); i += n; continue; }
        out.push(tok);
        i += n + (ord ? 1 : 0);
        continue;
      }
      lit(out, c);
      i++;
    }
    return { tokens: out, warnings: warn };
  }

  /* moment's own tokeniser, from its source (formattingTokens). */
  var MOMENT_RE = /(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|N{1,5}|YYYYYY|YYYYY|YYYY|YY|y{2,4}|yo?|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g;
  /* moment's en-gb locale formats. */
  var MOMENT_LOCAL = { LT: 'HH:mm', LTS: 'HH:mm:ss', L: 'DD/MM/YYYY', LL: 'D MMMM YYYY', LLL: 'D MMMM YYYY HH:mm', LLLL: 'dddd, D MMMM YYYY HH:mm',
    l: 'D/M/YYYY', ll: 'D MMM YYYY', lll: 'D MMM YYYY HH:mm', llll: 'ddd, D MMM YYYY HH:mm' };
  var MOMENT_MAP = {
    M: T('M', 'num'), Mo: T('M', 'ord'), MM: T('M', 'num2'), MMM: T('M', 'short'), MMMM: T('M', 'long'),
    Q: T('q', 'num'), Qo: T('q', 'ord'),
    D: T('d', 'num'), Do: T('d', 'ord'), DD: T('d', 'num2'), DDD: T('doy', 'num'), DDDo: T('doy', 'ord'), DDDD: T('doy', 'num3'),
    d: T('wdnum', null, { base: 'sun0' }), dd: T('wd', 'min2'), ddd: T('wd', 'short'), dddd: T('wd', 'long'),
    e: T('wdnum', null, { base: 'mon0' }), E: T('wdnum', null, { base: 'iso' }),
    w: T('isoWeek', 'num'), wo: T('isoWeek', 'ord'), ww: T('isoWeek', 'num2'), W: T('isoWeek', 'num'), Wo: T('isoWeek', 'ord'), WW: T('isoWeek', 'num2'),
    YY: T('yy'), YYYY: T('year', null, { pad: 4 }), YYYYY: T('year', null, { pad: 5 }), YYYYYY: T('year', null, { pad: 6 }), Y: T('year', null, { pad: 0 }),
    gg: T('isoYY'), gggg: T('isoYear', null, { pad: 4 }), ggggg: T('isoYear', null, { pad: 5 }),
    GG: T('isoYY'), GGGG: T('isoYear', null, { pad: 4 }), GGGGG: T('isoYear', null, { pad: 5 }),
    N: T('era', 'short'), NN: T('era', 'short'), NNN: T('era', 'short'), NNNN: T('era', 'long'), NNNNN: T('era', 'short'),
    A: T('ampm', 'upper'), a: T('ampm', 'lower'),
    H: T('H', 'num'), HH: T('H', 'num2'), h: T('h', 'num'), hh: T('h', 'num2'), k: T('k', 'num'), kk: T('k', 'num2'),
    m: T('m', 'num'), mm: T('m', 'num2'), s: T('s', 'num'), ss: T('s', 'num2'),
    z: T('tzAbbr'), zz: T('tzAbbr'), Z: T('off', 'hh:mm'), ZZ: T('off', 'hhmm'), X: T('epochS'), x: T('epochMs')
  };

  function readMoment(p) {
    var out = [], warn = [];
    p = p.replace(/(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g, function (all, esc, slash, key) {
      return esc || slash || !MOMENT_LOCAL[key] ? all : MOMENT_LOCAL[key];
    });
    var m, re = new RegExp(MOMENT_RE.source, 'g');
    while ((m = re.exec(p)) !== null) {
      if (!m[0]) { re.lastIndex++; continue; }
      if (m[1]) { lit(out, m[1].slice(1, -1)); continue; }
      if (m[2]) { lit(out, m[3]); continue; }
      var t = m[3];
      if (/^[Hh]mm(ss)?$/.test(t)) { pushAll(out, [T(t[0], 'num'), T('m', 'num2')].concat(t.length > 3 ? [T('s', 'num2')] : [])); continue; }
      if (/^S+$/.test(t)) { out.push(T('frac', null, { n: t.length })); continue; }
      if (MOMENT_MAP[t]) { out.push(copyTok(MOMENT_MAP[t])); continue; }
      if (/^[A-Za-z]+$/.test(t) && t.length > 1) warn.push('"' + t + '" is not supported here, so it is shown as text.');
      lit(out, t);
    }
    return { tokens: out, warnings: warn };
  }

  /* .NET standard formats that are the same in every culture. The
     culture-specific ones (d, D, f, F, g, G, M, t, T, U, Y) depend on the
     machine's culture, so a custom pattern is asked for instead. */
  var DOTNET_STD = {
    o: { p: "yyyy'-'MM'-'dd'T'HH':'mm':'ss'.'fffffffK" }, O: { p: "yyyy'-'MM'-'dd'T'HH':'mm':'ss'.'fffffffK" },
    r: { p: "ddd, dd MMM yyyy HH':'mm':'ss 'GMT'", utc: true }, R: { p: "ddd, dd MMM yyyy HH':'mm':'ss 'GMT'", utc: true },
    s: { p: "yyyy'-'MM'-'dd'T'HH':'mm':'ss" }, u: { p: "yyyy'-'MM'-'dd HH':'mm':'ss'Z'", utc: true }
  };
  function dotnetToken(c, n) {
    switch (c) {
      case 'd': return n === 1 ? T('d', 'num') : n === 2 ? T('d', 'num2') : T('wd', n === 3 ? 'short' : 'long');
      case 'f': return T('frac', null, { n: Math.min(n, 7) });
      case 'F': return T('frac', null, { n: Math.min(n, 7), trim: true });
      case 'g': return T('era', 'dotted');
      case 'h': return T('h', n === 1 ? 'num' : 'num2');
      case 'H': return T('H', n === 1 ? 'num' : 'num2');
      case 'K': return T('off', 'hh:mm', { z: true });
      case 'm': return T('m', n === 1 ? 'num' : 'num2');
      case 'M': return T('M', ['num', 'num', 'num2', 'short', 'long'][Math.min(n, 4)]);
      case 's': return T('s', n === 1 ? 'num' : 'num2');
      case 't': return T('ampm', n === 1 ? 'upper1' : 'upper');
      case 'y': return n === 1 ? T('y2n') : n === 2 ? T('yy') : T('year', null, { pad: n });
      case 'z': return T('off', n === 1 ? 'h' : n === 2 ? 'hh' : 'hh:mm');
    }
    return null;
  }
  function readDotnet(p) {
    var out = [], warn = [], utc = false;
    if (p.length === 1) {
      if (DOTNET_STD[p]) { var std = readDotnet(DOTNET_STD[p].p); return { tokens: std.tokens, warnings: [], utc: !!DOTNET_STD[p].utc }; }
      if ('dDfFgGmMtTUyY'.indexOf(p) > -1) {
        return { tokens: [], warnings: ['"' + p + '" on its own is a .NET standard format that depends on the culture. Write it as a custom pattern such as dd/MM/yyyy, or use %' + p + ' for the single field.'], utc: false };
      }
      if ('hHKz'.indexOf(p) > -1) return { tokens: [], warnings: ['A lone "' + p + '" is not a valid .NET format; write %' + p + ' for that field on its own.'], utc: false };
    }
    var i = 0;
    function one(c, n) {
      var tok = dotnetToken(c, n);
      if (c === 'f' || c === 'F') {
        if (n > 7) warn.push('.NET allows at most seven ' + c + ' characters.');
        if (c === 'F') {
          /* .NET drops the decimal point before F when nothing is printed. */
          var prev = out[out.length - 1];
          if (prev && prev.t === 'lit' && /[.]$/.test(prev.v)) { tok.sep = '.'; prev.v = prev.v.slice(0, -1); if (!prev.v) out.pop(); }
        }
      }
      out.push(tok);
    }
    while (i < p.length) {
      var c = p[i];
      if (c === '%' && i + 1 < p.length && 'dfFghHKmMstyz'.indexOf(p[i + 1]) > -1) { one(p[i + 1], 1); i += 2; continue; }
      if (c === '\\') { lit(out, p[i + 1] || ''); i += 2; continue; }
      if (c === "'" || c === '"') {
        var j = i + 1, buf = '';
        while (j < p.length && p[j] !== c) { if (p[j] === '\\' && j + 1 < p.length) j++; buf += p[j]; j++; }
        if (j >= p.length) warn.push('A quote was not closed, so the rest is read as text.');
        lit(out, buf);
        i = j + 1;
        continue;
      }
      if ('dfFghHKmMstyz'.indexOf(c) > -1) {
        var n = 1;
        while (p[i + n] === c) n++;
        one(c, n);
        i += n;
        continue;
      }
      lit(out, c);
      i++;
    }
    return { tokens: out, warnings: warn, utc: utc };
  }

  /* Go's layout scanner, ported from nextStdChunk in src/time/format.go. */
  function goChunk(l) {
    function res(i, std, len) { return { prefix: l.slice(0, i), std: std, suffix: l.slice(i + len) }; }
    function lowerNext(s) { return s.length > 0 && s[0] >= 'a' && s[0] <= 'z'; }
    for (var i = 0; i < l.length; i++) {
      var c = l[i], r = l.slice(i);
      switch (c) {
        case 'J':
          if (r.slice(0, 3) === 'Jan') {
            if (r.slice(0, 7) === 'January') return res(i, T('M', 'long'), 7);
            if (!lowerNext(r.slice(3))) return res(i, T('M', 'short'), 3);
          }
          break;
        case 'M':
          if (r.slice(0, 3) === 'Mon') {
            if (r.slice(0, 6) === 'Monday') return res(i, T('wd', 'long'), 6);
            if (!lowerNext(r.slice(3))) return res(i, T('wd', 'short'), 3);
          }
          if (r.slice(0, 3) === 'MST') return res(i, T('tzAbbr'), 3);
          break;
        case '0':
          if (r.length >= 2 && r[1] >= '1' && r[1] <= '6') return res(i, [T('M', 'num2'), T('d', 'num2'), T('h', 'num2'), T('m', 'num2'), T('s', 'num2'), T('yy')][+r[1] - 1], 2);
          if (r.slice(0, 3) === '002') return res(i, T('doy', 'num3'), 3);
          break;
        case '1':
          if (r[1] === '5') return res(i, T('H', 'num2'), 2);
          return res(i, T('M', 'num'), 1);
        case '2':
          if (r.slice(0, 4) === '2006') return res(i, T('year', null, { pad: 4 }), 4);
          return res(i, T('d', 'num'), 1);
        case '_':
          if (r[1] === '2') {
            if (r.slice(1, 5) === '2006') return { prefix: l.slice(0, i + 1), std: T('year', null, { pad: 4 }), suffix: l.slice(i + 5) };
            return res(i, T('d', 'sp'), 2);
          }
          if (r[1] === '_' && r[2] === '2') return res(i, T('doy', 'sp3'), 3);
          break;
        case '3': return res(i, T('h', 'num'), 1);
        case '4': return res(i, T('m', 'num'), 1);
        case '5': return res(i, T('s', 'num'), 1);
        case 'P': if (r[1] === 'M') return res(i, T('ampm', 'upper'), 2); break;
        case 'p': if (r[1] === 'm') return res(i, T('ampm', 'lower'), 2); break;
        case '-': case 'Z':
          var z = c === 'Z' ? { z: true } : undefined;
          if (r.slice(1, 7) === '070000') return res(i, T('off', 'hhmmss', z), 7);
          if (r.slice(1, 9) === '07:00:00') return res(i, T('off', 'hh:mm:ss', z), 9);
          if (r.slice(1, 5) === '0700') return res(i, T('off', 'hhmm', z), 5);
          if (r.slice(1, 6) === '07:00') return res(i, T('off', 'hh:mm', z), 6);
          if (r.slice(1, 3) === '07') return res(i, T('off', 'hh', z), 3);
          break;
        case '.': case ',':
          if (i + 1 < l.length && (l[i + 1] === '0' || l[i + 1] === '9')) {
            var ch = l[i + 1], j = i + 1;
            while (j < l.length && l[j] === ch) j++;
            if (!(j < l.length && l[j] >= '0' && l[j] <= '9')) {
              var n = j - (i + 1);
              return { prefix: l.slice(0, i), std: ch === '0' ? [{ t: 'lit', v: c }, T('frac', null, { n: n })] : T('frac', null, { n: n, trim: true, sep: c }), suffix: l.slice(j) };
            }
          }
          break;
      }
    }
    return { prefix: l, std: null, suffix: '' };
  }
  function readGo(p) {
    var out = [], rest = p;
    while (rest.length) {
      var c = goChunk(rest);
      lit(out, c.prefix);
      if (!c.std) break;
      pushAll(out, c.std);
      rest = c.suffix;
    }
    return { tokens: out, warnings: [] };
  }

  var READERS = { strftime: readStrftime, ldml: readLdml, moment: readMoment, dotnet: readDotnet, go: readGo };
  function readPattern(syntax, p) { var r = READERS[syntax](String(p)); r.utc = !!r.utc; return r; }

  /* --- writing patterns -------------------------------------------------- */

  function tkey(tok) {
    switch (tok.t) {
      case 'year': case 'isoYear': return tok.t + ':' + (tok.pad || 0);
      case 'frac': return (tok.trim ? 'fracT:' : 'frac:') + tok.n;
      case 'off': return (tok.z ? 'offZ:' : 'off:') + tok.w;
      case 'wdnum': return 'wdnum:' + tok.base;
      default: return tok.w ? tok.t + ':' + tok.w : tok.t;
    }
  }
  var DESC = {
    'year:0': 'the year without padding', 'year:4': 'the four-digit year', 'yy': 'the two-digit year', 'y2n': 'the unpadded two-digit year',
    'isoYear:0': 'the ISO week-numbering year', 'isoYear:4': 'the ISO week-numbering year', 'isoYY': 'the two-digit ISO week-numbering year',
    'century': 'the century', 'era:short': 'the era (AD)', 'era:long': 'the era in full', 'era:narrow': 'the narrow era', 'era:dotted': 'the era (A.D.)',
    'q:num': 'the quarter', 'q:num2': 'the two-digit quarter', 'q:short': 'the quarter as Q3', 'q:long': 'the quarter in words', 'q:ord': 'the quarter as 3rd',
    'M:num': 'the unpadded month number', 'M:num2': 'the two-digit month', 'M:short': 'the short month name', 'M:long': 'the month name', 'M:narrow': 'the one-letter month', 'M:ord': 'the month as an ordinal',
    'd:num': 'the unpadded day', 'd:num2': 'the two-digit day', 'd:sp': 'the space-padded day', 'd:ord': 'the day with an ordinal suffix (22nd)',
    'doy:num': 'the day of the year', 'doy:num2': 'the two-digit day of the year', 'doy:num3': 'the three-digit day of the year', 'doy:sp3': 'the space-padded day of the year', 'doy:ord': 'the day of the year as an ordinal',
    'wd:short': 'the short weekday name', 'wd:long': 'the weekday name', 'wd:narrow': 'the one-letter weekday', 'wd:min2': 'the two-letter weekday',
    'wdnum:iso': 'the weekday number (Monday = 1)', 'wdnum:sun0': 'the weekday number (Sunday = 0)', 'wdnum:mon0': 'the weekday number (Monday = 0)',
    'isoWeek:num': 'the ISO week number', 'isoWeek:num2': 'the two-digit ISO week number', 'isoWeek:ord': 'the ISO week as an ordinal',
    'weekU': 'the week of the year counted from Sunday', 'weekW': 'the week of the year counted from Monday',
    'H:num': 'the unpadded 24-hour hour', 'H:num2': 'the two-digit 24-hour hour', 'H:sp': 'the space-padded 24-hour hour',
    'h:num': 'the unpadded 12-hour hour', 'h:num2': 'the two-digit 12-hour hour', 'h:sp': 'the space-padded 12-hour hour',
    'k:num': 'the hour 1–24', 'k:num2': 'the two-digit hour 1–24', 'K:num': 'the hour 0–11', 'K:num2': 'the two-digit hour 0–11',
    'm:num': 'the unpadded minute', 'm:num2': 'the two-digit minute', 's:num': 'the unpadded second', 's:num2': 'the two-digit second',
    'ampm:upper': 'AM/PM', 'ampm:lower': 'am/pm', 'ampm:upper1': 'A/P', 'ampm:lower1': 'a/p', 'ampm:dotted': 'a.m./p.m.',
    'off:hhmm': 'the offset as +0100', 'off:hh:mm': 'the offset as +01:00', 'off:hh': 'the offset as +01', 'off:h': 'the offset as +1', 'off:hhOptMm': 'the offset as +01 or +0530',
    'offZ:hhmm': 'the offset as +0100 or Z', 'offZ:hh:mm': 'the offset as +01:00 or Z', 'offZ:hh': 'the offset as +01 or Z', 'offZ:hhOptMm': 'the offset as +01, +0530 or Z',
    'off:hhmmss': 'the offset with seconds', 'off:hh:mm:ss': 'the offset with seconds', 'offZ:hhmmss': 'the offset with seconds', 'offZ:hh:mm:ss': 'the offset with seconds',
    'off:gmt': 'the offset as GMT+01:00', 'off:gmtShort': 'the offset as GMT+1',
    'tzAbbr': 'the time zone abbreviation', 'tzLong': 'the time zone name', 'tzId': 'the time zone ID', 'epochS': 'Unix time in seconds', 'epochMs': 'Unix time in milliseconds'
  };
  function describe(tok) {
    var k = tkey(tok);
    if (DESC[k]) return DESC[k];
    if (tok.t === 'frac') return (tok.trim ? 'up to ' : '') + tok.n + ' digit' + (tok.n === 1 ? '' : 's') + ' of fractional seconds';
    if (tok.t === 'year' || tok.t === 'isoYear') return 'the year padded to ' + tok.pad + ' digits';
    return k;
  }

  var WRITE = {
    strftime: {
      'year:4': '%Y', 'year:0': '%Y', 'yy': '%y', 'y2n': '%-y', 'century': '%C', 'isoYear:4': '%G', 'isoYear:0': '%G', 'isoYY': '%g',
      'M:num': '%-m', 'M:num2': '%m', 'M:short': '%b', 'M:long': '%B', 'd:num': '%-d', 'd:num2': '%d', 'd:sp': '%e',
      'doy:num': '%-j', 'doy:num3': '%j', 'wd:short': '%a', 'wd:long': '%A', 'wdnum:iso': '%u', 'wdnum:sun0': '%w',
      'isoWeek:num': '%-V', 'isoWeek:num2': '%V', 'weekU': '%U', 'weekW': '%W',
      'H:num': '%-H', 'H:num2': '%H', 'H:sp': '%k', 'h:num': '%-I', 'h:num2': '%I', 'h:sp': '%l',
      'm:num': '%-M', 'm:num2': '%M', 's:num': '%-S', 's:num2': '%S', 'frac:6': '%f', 'ampm:upper': '%p', 'ampm:lower': '%P',
      'off:hhmm': '%z', 'off:hh:mm': '%:z', 'tzAbbr': '%Z', 'epochS': '%s'
    },
    ldml: {
      'era:short': 'G', 'era:long': 'GGGG', 'era:narrow': 'GGGGG', 'year:0': 'y', 'yy': 'yy', 'year:4': 'yyyy', 'isoYear:0': 'Y', 'isoYY': 'YY', 'isoYear:4': 'YYYY',
      'q:num': 'Q', 'q:num2': 'QQ', 'q:short': 'QQQ', 'q:long': 'QQQQ', 'q:ord': 'Qo',
      'M:num': 'M', 'M:num2': 'MM', 'M:short': 'MMM', 'M:long': 'MMMM', 'M:narrow': 'MMMMM', 'M:ord': 'Mo',
      'd:num': 'd', 'd:num2': 'dd', 'd:ord': 'do', 'doy:num': 'D', 'doy:num2': 'DD', 'doy:num3': 'DDD', 'doy:ord': 'Do',
      'wd:short': 'EEE', 'wd:long': 'EEEE', 'wd:narrow': 'EEEEE', 'wd:min2': 'EEEEEE', 'wdnum:iso': 'e',
      'isoWeek:num': 'w', 'isoWeek:num2': 'ww', 'isoWeek:ord': 'wo',
      'H:num': 'H', 'H:num2': 'HH', 'h:num': 'h', 'h:num2': 'hh', 'k:num': 'k', 'k:num2': 'kk', 'K:num': 'K', 'K:num2': 'KK',
      'm:num': 'm', 'm:num2': 'mm', 's:num': 's', 's:num2': 'ss',
      'ampm:upper': 'a', 'ampm:lower': 'aaa', 'ampm:dotted': 'aaaa', 'ampm:lower1': 'aaaaa',
      'off:hhmm': 'xx', 'off:hh:mm': 'xxx', 'off:hhOptMm': 'x', 'offZ:hhmm': 'XX', 'offZ:hh:mm': 'XXX', 'offZ:hhOptMm': 'X', 'off:gmt': 'ZZZZ', 'off:gmtShort': 'O',
      'tzAbbr': 'z', 'tzLong': 'zzzz', 'tzId': 'VV', 'epochS': 't', 'epochMs': 'T'
    },
    moment: {
      'year:4': 'YYYY', 'year:0': 'Y', 'yy': 'YY', 'isoYear:4': 'GGGG', 'isoYY': 'GG', 'era:short': 'N', 'era:long': 'NNNN',
      'q:num': 'Q', 'q:ord': 'Qo', 'M:num': 'M', 'M:num2': 'MM', 'M:short': 'MMM', 'M:long': 'MMMM', 'M:ord': 'Mo',
      'd:num': 'D', 'd:num2': 'DD', 'd:ord': 'Do', 'doy:num': 'DDD', 'doy:num3': 'DDDD', 'doy:ord': 'DDDo',
      'wd:short': 'ddd', 'wd:long': 'dddd', 'wd:min2': 'dd', 'wdnum:sun0': 'd', 'wdnum:iso': 'E', 'wdnum:mon0': 'e',
      'isoWeek:num': 'W', 'isoWeek:num2': 'WW', 'isoWeek:ord': 'Wo',
      'H:num': 'H', 'H:num2': 'HH', 'h:num': 'h', 'h:num2': 'hh', 'k:num': 'k', 'k:num2': 'kk',
      'm:num': 'm', 'm:num2': 'mm', 's:num': 's', 's:num2': 'ss', 'ampm:upper': 'A', 'ampm:lower': 'a',
      'off:hh:mm': 'Z', 'off:hhmm': 'ZZ', 'tzAbbr': 'z', 'epochS': 'X', 'epochMs': 'x'
    },
    dotnet: {
      'year:4': 'yyyy', 'year:0': 'yyyy', 'year:3': 'yyy', 'year:5': 'yyyyy', 'yy': 'yy', 'y2n': 'y', 'era:dotted': 'gg',
      'M:num': 'M', 'M:num2': 'MM', 'M:short': 'MMM', 'M:long': 'MMMM', 'd:num': 'd', 'd:num2': 'dd',
      'wd:short': 'ddd', 'wd:long': 'dddd', 'H:num': 'H', 'H:num2': 'HH', 'h:num': 'h', 'h:num2': 'hh',
      'm:num': 'm', 'm:num2': 'mm', 's:num': 's', 's:num2': 'ss', 'ampm:upper': 'tt', 'ampm:upper1': 't',
      'off:h': 'z', 'off:hh': 'zz', 'off:hh:mm': 'zzz', 'offZ:hh:mm': 'K'
    },
    go: {
      'year:4': '2006', 'year:0': '2006', 'yy': '06', 'M:num': '1', 'M:num2': '01', 'M:short': 'Jan', 'M:long': 'January',
      'd:num': '2', 'd:num2': '02', 'd:sp': '_2', 'doy:num3': '002', 'doy:sp3': '__2', 'wd:short': 'Mon', 'wd:long': 'Monday',
      'H:num2': '15', 'h:num': '3', 'h:num2': '03', 'm:num': '4', 'm:num2': '04', 's:num': '5', 's:num2': '05',
      'ampm:upper': 'PM', 'ampm:lower': 'pm', 'tzAbbr': 'MST',
      'off:hhmm': '-0700', 'off:hh:mm': '-07:00', 'off:hh': '-07', 'off:hhmmss': '-070000', 'off:hh:mm:ss': '-07:00:00',
      'offZ:hhmm': 'Z0700', 'offZ:hh:mm': 'Z07:00', 'offZ:hh': 'Z07', 'offZ:hhmmss': 'Z070000', 'offZ:hh:mm:ss': 'Z07:00:00'
    }
  };
  /* Where there is no exact match, the nearest relative to try next. */
  var NEAR = {
    'year:0': 'year:4', 'year:3': 'year:4', 'year:5': 'year:4', 'year:6': 'year:4', 'isoYear:0': 'isoYear:4', 'isoYear:5': 'isoYear:4', 'y2n': 'yy',
    'era:long': 'era:short', 'era:narrow': 'era:short', 'era:dotted': 'era:short', 'era:short': 'era:dotted',
    'q:num2': 'q:num', 'q:short': 'q:num', 'q:long': 'q:num', 'q:ord': 'q:num',
    'M:ord': 'M:num', 'M:narrow': 'M:short', 'd:ord': 'd:num', 'd:sp': 'd:num', 'd:num': 'd:num2',
    'doy:ord': 'doy:num', 'doy:sp3': 'doy:num', 'doy:num2': 'doy:num3', 'doy:num': 'doy:num3',
    'wd:min2': 'wd:short', 'wd:narrow': 'wd:short', 'isoWeek:ord': 'isoWeek:num', 'isoWeek:num': 'isoWeek:num2',
    'H:sp': 'H:num', 'H:num': 'H:num2', 'h:sp': 'h:num', 'k:num': 'k:num2', 'K:num': 'K:num2',
    'ampm:lower': 'ampm:upper', 'ampm:upper1': 'ampm:upper', 'ampm:lower1': 'ampm:lower', 'ampm:dotted': 'ampm:lower',
    'offZ:hhmm': 'off:hhmm', 'offZ:hh:mm': 'off:hh:mm', 'offZ:hh': 'off:hh', 'offZ:hhOptMm': 'offZ:hhmm', 'off:hhOptMm': 'off:hhmm',
    'off:hh': 'off:hhmm', 'off:h': 'off:hh', 'off:hhmm': 'off:hh:mm', 'off:gmt': 'off:hh:mm', 'off:gmtShort': 'off:hh',
    'off:hhmmss': 'off:hhmm', 'off:hh:mm:ss': 'off:hh:mm', 'offZ:hhmmss': 'offZ:hhmm', 'offZ:hh:mm:ss': 'offZ:hh:mm',
    'tzLong': 'tzAbbr', 'tzId': 'tzAbbr'
  };
  /* Notes worth showing once when a pattern uses a less portable piece. */
  var PORTABILITY = {
    strftime: { '%-': 'Codes with a dash (%-d) drop the padding on Linux, macOS and Python there; on Windows write %#d.', '%e': '%e, %k and %l are not available on Windows.',
      '%P': '%P is a glibc extension.', '%:z': '%:z needs Python 3.12 or later.', '%s': '%s is not available in Python on Windows.', '%f': '%f is Python only and always gives six digits.' },
    ldml: { 'o': 'Ordinals (do, Mo…) are a date-fns extension.', 'aaa': 'aaa (am/pm) and aaaa (a.m.) follow date-fns; Java and ICU print AM/PM for a in English, or am/pm in en-GB.',
      't': 't and T (Unix time) are date-fns extensions.', 'YYYY': 'Y is the week-numbering year; date-fns needs the useAdditionalWeekYearTokens option for it.', 'D': 'D is the day of the year; date-fns needs the useAdditionalDayOfYearTokens option.' },
    moment: { 'plugin': 'Day.js needs its AdvancedFormat plugin for Q, Do, k, X, x, w, W, gggg, GGGG and z.', 'z': 'z needs moment-timezone.' },
    dotnet: { 'K': 'K prints Z only for UTC values; local times show their offset.' },
    go: {}
  };

  function escLiteral(syntax, text) {
    if (!text) return '';
    switch (syntax) {
      case 'strftime': return text.replace(/%/g, '%%');
      case 'ldml':
        /* Letters are pattern characters, and java.time reserves [ ] # { }. */
        return /[A-Za-z\[\]#{}]/.test(text) ? "'" + text.replace(/'/g, "''") + "'" : text.replace(/'/g, "''");
      case 'moment':
        if (!/[A-Za-z]/.test(text)) return text;
        return /[\[\]]/.test(text) ? text.replace(/[A-Za-z]+/g, function (run) { return '[' + run + ']'; }) : '[' + text + ']';
      case 'dotnet':
        return /[A-Za-z']/.test(text) ? "'" + text.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'" : text.replace(/[\\%"]/g, '\\$&');
      default: return text;
    }
  }

  function writePattern(syntax, tokens) {
    var out = '', warns = [], used = [], table = WRITE[syntax];
    var list = tokens.map(copyTok);
    for (var i = 0; i < list.length; i++) {
      var tok = list[i];
      if (tok.t === 'lit') {
        /* Go and .NET carry the separator inside a trimmed fraction. */
        var next = list[i + 1];
        if (next && next.t === 'frac' && !next.sep && (syntax === 'go' || (syntax === 'dotnet' && next.trim)) && /[.,]$/.test(tok.v)) {
          next.sep = tok.v.slice(-1);
          tok.v = tok.v.slice(0, -1);
        }
        out += escLiteral(syntax, tok.v);
        continue;
      }
      if (tok.t === 'frac') { out += writeFrac(syntax, tok, warns); used.push(tkey(tok)); continue; }
      var key = tkey(tok), s = table[key], from = key, steps = 0;
      while (s === undefined && NEAR[from] && steps < 4) { from = NEAR[from]; s = table[from]; steps++; }
      if (s === undefined) { warns.push(syntaxName(syntax) + ' cannot write ' + describe(tok) + ', so it was left out.'); continue; }
      if (from !== key) warns.push(syntaxName(syntax) + ' cannot write ' + describe(tok) + ', so ' + describe(parseKey(from)) + ' is used instead.');
      if (tok.upper && syntax !== 'strftime') warns.push(syntaxName(syntax) + ' cannot force capitals, so ' + describe(tok) + ' keeps its usual case.');
      used.push(from);
      out += tok.upper && syntax === 'strftime' ? s.replace('%', '%^') : s;
    }
    if (syntax === 'dotnet' && out.length === 1) out = '%' + out;
    if (syntax === 'go' && used.length) {
      /* Go has no escapes, so check the layout reads back the way it was meant. */
      var back = readGo(out).tokens.filter(function (t) { return t.t !== 'lit'; }).map(tkey);
      if (back.join(' ') !== used.join(' ')) warns.push('Go layouts cannot escape text, and part of the literal text here would be read as a layout element.');
    }
    return { pattern: out, warnings: uniq(warns) };
  }
  function parseKey(k) {
    var p = k.split(':');
    if (p[0] === 'year' || p[0] === 'isoYear') return { t: p[0], pad: +p[1] };
    if (p[0] === 'off' || p[0] === 'offZ') return { t: 'off', w: p.slice(1).join(':'), z: p[0] === 'offZ' };
    if (p[0] === 'wdnum') return { t: 'wdnum', base: p[1] };
    return p[1] ? { t: p[0], w: p[1] } : { t: p[0] };
  }
  function writeFrac(syntax, tok, warns) {
    var n = tok.n, sep = tok.sep || '';
    if (syntax === 'go') {
      if (!sep) { warns.push('Go only writes fractional seconds after a . or , so a . was added.'); sep = '.'; }
      return sep + (tok.trim ? '9' : '0').repeat(n);
    }
    if (syntax === 'dotnet') {
      if (n > 7) { warns.push('.NET shows at most seven digits of fractional seconds.'); n = 7; }
      return tok.trim ? escLiteral(syntax, sep) + 'F'.repeat(n) : 'f'.repeat(n);
    }
    if (tok.trim) warns.push(syntaxName(syntax) + ' cannot drop trailing zeros from fractional seconds, so all ' + n + ' digits are shown.');
    var lead = escLiteral(syntax, sep);
    if (syntax === 'strftime') {
      if (n !== 6) warns.push('strftime only has %f, which always gives six digits (microseconds).');
      return lead + '%f';
    }
    if (syntax === 'moment' && n > 9) { warns.push('Moment shows at most nine digits of fractional seconds.'); n = 9; }
    return lead + 'S'.repeat(n);
  }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }

  function portabilityNotes(syntax, pattern) {
    var notes = [], P = PORTABILITY[syntax], p = String(pattern);
    if (syntax === 'strftime') {
      if (/%[-#]/.test(p)) notes.push(P['%-']);
      if (/%[ekl]/.test(p)) notes.push(P['%e']);
      ['%P', '%:z', '%s', '%f'].forEach(function (k) { if (p.indexOf(k) > -1) notes.push(P[k]); });
    } else if (syntax === 'ldml') {
      var bare = p.replace(/'[^']*'/g, '');
      if (/[dDMLQqwI]o/.test(bare)) notes.push(P.o);
      if (/(^|[^a])aaaa?(?!a)/.test(bare)) notes.push(P.aaa);
      if (/[tT]/.test(bare)) notes.push(P.t);
      if (/Y/.test(bare)) notes.push(P.YYYY);
      if (/D/.test(bare)) notes.push(P.D);
    } else if (syntax === 'moment') {
      var plain = p.replace(/\[[^\]]*\]/g, '');
      if (/Q|Do|k|X|x|w|W|g|G|z/.test(plain)) notes.push(P.plugin);
      if (/z/.test(plain)) notes.push(P.z);
    } else if (syntax === 'dotnet') {
      if (/K/.test(p.replace(/'[^']*'|"[^"]*"/g, ''))) notes.push(P.K);
    }
    return notes;
  }

  /* --- parsing text with a pattern -------------------------------------- */

  var ABBR_OFFSETS = { UTC: 0, GMT: 0, Z: 0, UT: 0, BST: 60, IST: 60, CET: 60, CEST: 120, EET: 120, EEST: 180, WET: 0, WEST: 60,
    EST: -300, EDT: -240, CST: -360, CDT: -300, MST: -420, MDT: -360, PST: -480, PDT: -420, AKST: -540, AKDT: -480, HST: -600,
    JST: 540, KST: 540, AEST: 600, AEDT: 660, ACST: 570, ACDT: 630, AWST: 480, NZST: 720, NZDT: 780 };
  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function namesRe(list) { return '(' + list.slice().sort(function (a, b) { return b.length - a.length; }).map(reEsc).join('|') + ')'; }
  function nameIndex(list, s) { s = s.toLowerCase(); for (var i = 0; i < list.length; i++) if (list[i].toLowerCase() === s) return i; return -1; }
  function readOffset(s) {
    if (/^z$/i.test(s)) return 0;
    var m = /^(?:GMT|UTC)?([+\-−])(\d{1,2})(?::?(\d{2}))?(?::?(\d{2}))?$/i.exec(s);
    if (!m) return /^(GMT|UTC)$/i.test(s) ? 0 : NaN;
    return (m[1] === '+' ? 1 : -1) * (+m[2] * 60 + (+m[3] || 0));
  }
  function pivotYear(yy, syntax) {
    if (syntax === 'dotnet') return yy <= 49 ? 2000 + yy : 1900 + yy;
    if (syntax === 'ldml') {
      /* Java and ICU put two-digit years within 80 years before and 20 after today. */
      var now = new Date().getFullYear(), lo = now - 80;
      var c = lo - mod(lo, 100) + yy;
      return c < lo ? c + 100 : c;
    }
    return yy < 69 ? 2000 + yy : 1900 + yy;
  }

  function tokenRegex(tok) {
    var n2 = '(\\d{2})', n12 = '(\\d{1,2})';
    switch (tok.t) {
      case 'lit': return { re: tok.v.split(/(\s+)/).map(function (part) { return /^\s+$/.test(part) ? '\\s+' : reEsc(part); }).join(''), noGroup: true };
      case 'year': return { re: tok.pad >= 4 ? '([+\\-]?\\d{' + tok.pad + ',6})' : '([+\\-]?\\d{1,6})', set: function (a, v) { a.year = +v; } };
      case 'isoYear': return { re: '(\\d{1,6})', set: function (a, v) { a.isoYear = +v; } };
      case 'yy': return { re: n2, set: function (a, v) { a.yy = +v; } };
      case 'isoYY': return { re: n2, set: function (a, v) { a.isoYY = +v; } };
      case 'y2n': return { re: n12, set: function (a, v) { a.yy = +v; } };
      case 'century': return { re: n2, set: function (a, v) { a.century = +v; } };
      case 'era': return { re: '(AD|BC|A\\.D\\.|B\\.C\\.|CE|BCE|Anno Domini|Before Christ|A|B)', set: function (a, v) { a.bc = /^B/i.test(v); } };
      case 'q': return { re: tok.w === 'short' ? 'Q([1-4])' : tok.w === 'ord' ? '([1-4])(?:st|nd|rd|th)' : tok.w === 'long' ? '([1-4])(?:st|nd|rd|th) quarter' : '0?([1-4])', set: function () {} };
      case 'M':
        if (tok.w === 'short') return { re: namesRe(MON3.concat(['Sept'])), set: function (a, v) { a.mo = (nameIndex(MON3, v.slice(0, 3))) + 1; } };
        if (tok.w === 'long') return { re: namesRe(MONTHS), set: function (a, v) { a.mo = nameIndex(MONTHS, v) + 1; } };
        if (tok.w === 'narrow') return { re: '([A-Z])', set: function (a) { a.warn.push('A one-letter month cannot be read back, so January is assumed.'); } };
        return { re: tok.w === 'num2' ? n2 : tok.w === 'ord' ? '(\\d{1,2})(?:st|nd|rd|th)' : n12, set: function (a, v) { a.mo = +v; } };
      case 'd': return { re: tok.w === 'num2' ? n2 : tok.w === 'sp' ? ' ?(\\d{1,2})' : tok.w === 'ord' ? '(\\d{1,2})(?:st|nd|rd|th)' : n12, set: function (a, v) { a.d = +v; } };
      case 'doy': return { re: tok.w === 'num3' ? '(\\d{3})' : tok.w === 'sp3' ? ' {0,2}(\\d{1,3})' : tok.w === 'ord' ? '(\\d{1,3})(?:st|nd|rd|th)' : '(\\d{1,3})', set: function (a, v) { a.doy = +v; } };
      case 'wd':
        if (tok.w === 'narrow') return { re: '([A-Za-z])', set: function () {} };
        var list = tok.w === 'long' ? DAYS : tok.w === 'min2' ? DAYS.map(function (d) { return d.slice(0, 2); }) : DAY3;
        return { re: namesRe(list), set: function (a, v) { a.wd = nameIndex(list, v); } };
      case 'wdnum': return { re: '(\\d{1,2})', set: function (a, v) { var n = +v; a.wd = tok.base === 'iso' ? n % 7 : tok.base === 'sun0' ? n : (n + 1) % 7; a.wdNum = true; } };
      case 'isoWeek': return { re: tok.w === 'ord' ? '(\\d{1,2})(?:st|nd|rd|th)' : tok.w === 'num2' ? n2 : n12, set: function (a, v) { a.isoWeek = +v; } };
      case 'weekU': case 'weekW': return { re: n2, set: function (a) { a.warn.push('Week-of-year numbers counted from Sunday or Monday are not used to find the date.'); } };
      case 'H': return { re: tok.w === 'num2' ? n2 : tok.w === 'sp' ? ' ?(\\d{1,2})' : n12, set: function (a, v) { a.H = +v; } };
      case 'h': return { re: tok.w === 'num2' ? n2 : tok.w === 'sp' ? ' ?(\\d{1,2})' : n12, set: function (a, v) { a.h12 = +v; } };
      case 'k': return { re: tok.w === 'num2' ? n2 : n12, set: function (a, v) { a.H = +v === 24 ? 0 : +v; } };
      case 'K': return { re: tok.w === 'num2' ? n2 : n12, set: function (a, v) { a.h12 = +v === 0 ? 12 : +v; } };
      case 'm': return { re: tok.w === 'num2' ? n2 : n12, set: function (a, v) { a.mi = +v; } };
      case 's': return { re: tok.w === 'num2' ? n2 : n12, set: function (a, v) { a.s = +v; } };
      case 'frac':
        if (tok.trim) return { re: '(?:' + reEsc(tok.sep || '') + '(\\d{1,' + tok.n + '}))?', set: function (a, v) { if (v) a.msec = Math.round(+('0.' + v) * 1000); } };
        return { re: '(\\d{' + tok.n + '})', set: function (a, v) { a.msec = Math.floor(+('0.' + v) * 1000 + 1e-6); } };
      case 'ampm': return { re: '([AaPp](?:\\.?[Mm]\\.?)?)', set: function (a, v) { a.pm = /^p/i.test(v); } };
      case 'off':
        var offRe = { hhmm: '[+\\-−]\\d{4}', 'hh:mm': '[+\\-−]\\d{2}:\\d{2}', hh: '[+\\-−]\\d{2}', h: '[+\\-−]\\d{1,2}', hhOptMm: '[+\\-−]\\d{2}(?:\\d{2})?',
          hhmmss: '[+\\-−]\\d{6}', 'hh:mm:ss': '[+\\-−]\\d{2}:\\d{2}:\\d{2}', gmt: 'GMT(?:[+\\-−]\\d{1,2}(?::\\d{2})?)?', gmtShort: 'GMT(?:[+\\-−]\\d{1,2}(?::\\d{2})?)?' }[tok.w];
        return { re: '(' + (tok.z ? 'Z|' : '') + offRe + ')', set: function (a, v) { a.off = readOffset(v); } };
      case 'tzAbbr': return { re: '([A-Za-z]{1,5}|[+\\-]\\d{2,4})', set: function (a, v) {
        var o = /^[+\-]/.test(v) ? readOffset(v) : ABBR_OFFSETS[v.toUpperCase()];
        if (o === undefined || isNaN(o)) a.warn.push('The abbreviation ' + v + ' is not one this tool knows, so the chosen time zone is used.');
        else { a.off = o; if (v.toUpperCase() === 'IST') a.warn.push('IST is read as Irish Standard Time (UTC+1); India Standard Time is UTC+5:30.'); }
      } };
      case 'tzLong': return { re: '([A-Za-z][A-Za-z .\\-]*?)', set: function (a) { a.warn.push('Time zone names are not read back; the chosen time zone is used.'); } };
      case 'tzId': return { re: '([A-Za-z_]+(?:/[A-Za-z0-9_+\\-]+)*)', set: function (a, v) { a.zone = v; } };
      case 'epochS': return { re: '(-?\\d{1,12})', set: function (a, v) { a.epochS = +v; } };
      case 'epochMs': return { re: '(-?\\d{1,15})', set: function (a, v) { a.epochMs = +v; } };
    }
    return { re: '', noGroup: true };
  }

  function parseText(parsed, text, zone, syntax) {
    var src = '', setters = [];
    parsed.tokens.forEach(function (tok) {
      var r = tokenRegex(tok);
      src += r.re;
      if (!r.noGroup) setters.push(r.set);
    });
    var m = new RegExp('^\\s*' + src + '\\s*$', 'i').exec(String(text));
    if (!m) throw new Error('The text does not match the pattern.');
    var a = { warn: [] };
    setters.forEach(function (fn, i) { if (m[i + 1] !== undefined) fn(a, m[i + 1]); });
    return buildInstant(a, zone, syntax);
  }

  function buildInstant(a, zone, syntax) {
    var notes = a.warn;
    if (a.epochMs !== undefined) return { ms: a.epochMs, notes: notes };
    if (a.epochS !== undefined) return { ms: a.epochS * 1000 + (a.msec || 0), notes: notes };
    var y = a.year;
    if (y === undefined && a.yy !== undefined) y = a.century !== undefined ? a.century * 100 + a.yy : pivotYear(a.yy, syntax);
    if (y !== undefined && a.bc) y = 1 - y;
    var mo = a.mo, d = a.d;
    if (y === undefined && (a.isoYear !== undefined || a.isoYY !== undefined) && a.isoWeek !== undefined) {
      var iy = a.isoYear !== undefined ? a.isoYear : pivotYear(a.isoYY, syntax);
      var jan4 = utcDate(iy, 1, 4);
      var monday = addDays(jan4, -((jan4.getUTCDay() + 6) % 7) + (a.isoWeek - 1) * 7);
      var day = addDays(monday, a.wd !== undefined ? (a.wd + 6) % 7 : 0);
      y = day.getUTCFullYear(); mo = day.getUTCMonth() + 1; d = day.getUTCDate();
    }
    if (y === undefined) { y = new Date().getFullYear(); notes.push('There is no year in the pattern, so ' + y + ' is assumed.'); }
    if (mo === undefined && a.doy !== undefined) {
      var fromDoy = addDays(utcDate(y, 1, 1), a.doy - 1);
      if (fromDoy.getUTCFullYear() !== y) throw new Error('Day ' + a.doy + ' is past the end of ' + y + '.');
      mo = fromDoy.getUTCMonth() + 1; d = fromDoy.getUTCDate();
    }
    if (mo === undefined) { mo = 1; if (d !== undefined) notes.push('There is no month in the pattern, so January is assumed.'); }
    if (d === undefined) d = 1;
    if (mo < 1 || mo > 12) throw new Error('There is no month ' + mo + '.');
    var dim = utcDate(y, mo + 1, 0).getUTCDate();
    if (d < 1 || d > dim) throw new Error(MONTHS[mo - 1] + ' ' + y + ' has ' + dim + ' days, so day ' + d + ' does not exist.');
    var h = 0;
    if (a.h12 !== undefined) {
      if (a.h12 < 1 || a.h12 > 12) throw new Error('A 12-hour clock has no hour ' + a.h12 + '.');
      if (a.pm === undefined) notes.push('There is no AM or PM, so AM is assumed.');
      h = a.h12 % 12 + (a.pm ? 12 : 0);
    } else if (a.H !== undefined) {
      if (a.H > 23) throw new Error('There is no hour ' + a.H + '.');
      h = a.H;
    }
    var mi = a.mi || 0, s = a.s || 0;
    if (mi > 59) throw new Error('There is no minute ' + mi + '.');
    if (s > 59) throw new Error('There is no second ' + s + '.');
    var ms;
    if (a.off !== undefined && !isNaN(a.off)) ms = utcMs(y, mo, d, h, mi, s, a.msec || 0) - a.off * 60000;
    else {
      var z = zone;
      if (a.zone) { if (zoneOk(a.zone)) z = a.zone; else notes.push(a.zone + ' is not a time zone this browser knows, so the chosen one is used.'); }
      ms = zonedToUtc(z, y, mo, d, h, mi, s, a.msec || 0);
    }
    if (a.wd !== undefined && a.wd !== utcDate(y, mo, d).getUTCDay()) {
      notes.push('The text says ' + DAYS[a.wd] + ', but ' + d + ' ' + MONTHS[mo - 1] + ' ' + y + ' is a ' + DAYS[utcDate(y, mo, d).getUTCDay()] + '.');
    }
    return { ms: ms, notes: notes };
  }
  function zoneOk(z) { try { new Intl.DateTimeFormat('en-GB', { timeZone: z }); return true; } catch (e) { return false; } }

  /* --- well-known formats ------------------------------------------------ */

  function commonFormats(ms, zone) {
    var F = fieldsAt(ms, zone), Z = fieldsAt(ms, 'UTC');
    var off = fmtOffset(F.off, 'hh:mm'), offBasic = fmtOffset(F.off, 'hhmm');
    var time = pad(F.h) + ':' + pad(F.mi) + ':' + pad(F.s), frac = F.msec ? '.' + pad(F.msec, 3) : '';
    var date = pad(F.y, 4) + '-' + pad(F.mo) + '-' + pad(F.d);
    var h12 = F.h % 12 || 12, ampm = F.h >= 12 ? 'PM' : 'AM';
    return [
      ['iso', 'ISO 8601', date + 'T' + time + frac + off],
      ['iso-utc', 'ISO 8601 in UTC', new Date(ms).toISOString()],
      ['iso-basic', 'ISO 8601 basic', date.replace(/-/g, '') + 'T' + time.replace(/:/g, '') + offBasic],
      ['iso-week', 'ISO week date', pad(F.isoYear, 4) + '-W' + pad(F.isoWeek) + '-' + (F.wd || 7)],
      ['iso-ordinal', 'ISO ordinal date', pad(F.y, 4) + '-' + pad(F.doy, 3)],
      ['rfc3339', 'RFC 3339', date + 'T' + time + frac + (F.off === 0 ? 'Z' : off)],
      ['rfc2822', 'RFC 2822 / 5322 (email)', DAY3[F.wd] + ', ' + pad(F.d) + ' ' + MON3[F.mo - 1] + ' ' + pad(F.y, 4) + ' ' + time + ' ' + offBasic],
      ['http', 'HTTP date (RFC 9110)', DAY3[Z.wd] + ', ' + pad(Z.d) + ' ' + MON3[Z.mo - 1] + ' ' + pad(Z.y, 4) + ' ' + pad(Z.h) + ':' + pad(Z.mi) + ':' + pad(Z.s) + ' GMT'],
      ['uk', 'UK (dd/mm/yyyy)', pad(F.d) + '/' + pad(F.mo) + '/' + pad(F.y, 4) + ' ' + pad(F.h) + ':' + pad(F.mi)],
      ['uk-long', 'UK, written out', DAYS[F.wd] + ' ' + F.d + ' ' + MONTHS[F.mo - 1] + ' ' + F.y + ', ' + pad(F.h) + ':' + pad(F.mi)],
      ['us', 'US (mm/dd/yyyy)', pad(F.mo) + '/' + pad(F.d) + '/' + pad(F.y, 4) + ' ' + h12 + ':' + pad(F.mi) + ' ' + ampm],
      ['us-long', 'US, written out', DAYS[F.wd] + ', ' + MONTHS[F.mo - 1] + ' ' + F.d + ', ' + F.y],
      ['sql', 'SQL date and time', date + ' ' + time],
      ['unix', 'Unix time (seconds)', String(Math.floor(ms / 1000))],
      ['unix-ms', 'Unix time (milliseconds)', String(ms)]
    ];
  }

  var EXAMPLES = {
    strftime: ['%d/%m/%Y', '%A %d %B %Y', '%Y-%m-%dT%H:%M:%S%z', '%a, %d %b %Y %H:%M:%S %z', '%H:%M', '%I:%M %p'],
    ldml: ['dd/MM/yyyy', 'EEEE d MMMM yyyy', "yyyy-MM-dd'T'HH:mm:ss.SSSXXX", 'EEE, d MMM yyyy HH:mm:ss Z', 'HH:mm', 'h:mm a'],
    moment: ['DD/MM/YYYY', 'dddd D MMMM YYYY', 'YYYY-MM-DDTHH:mm:ssZ', 'ddd, DD MMM YYYY HH:mm:ss ZZ', 'Do MMMM YYYY', 'LLLL'],
    dotnet: ['dd/MM/yyyy', 'dddd d MMMM yyyy', 'yyyy-MM-ddTHH:mm:ss.fffK', 'o', 'R', 'h:mm tt'],
    go: ['02/01/2006', 'Monday 2 January 2006', '2006-01-02T15:04:05Z07:00', 'Mon, 02 Jan 2006 15:04:05 -0700', '15:04', '3:04PM']
  };
  var CHEATS = {
    strftime: [['%Y', 'Year'], ['%y', 'Two-digit year'], ['%m', 'Month 01–12'], ['%-m', 'Month 1–12'], ['%b', 'Short month name'], ['%B', 'Month name'],
      ['%d', 'Day 01–31'], ['%-d', 'Day 1–31'], ['%e', 'Day, space-padded'], ['%j', 'Day of the year'], ['%a', 'Short weekday'], ['%A', 'Weekday'],
      ['%u', 'Weekday 1–7, Monday = 1'], ['%w', 'Weekday 0–6, Sunday = 0'], ['%V', 'ISO week'], ['%G', 'ISO week-numbering year'], ['%U', 'Week, Sunday first'],
      ['%W', 'Week, Monday first'], ['%H', 'Hour 00–23'], ['%I', 'Hour 01–12'], ['%p', 'AM or PM'], ['%M', 'Minute'], ['%S', 'Second'], ['%f', 'Microseconds (Python)'],
      ['%z', 'Offset +hhmm'], ['%:z', 'Offset +hh:mm'], ['%Z', 'Zone abbreviation'], ['%s', 'Unix seconds'], ['%F', '%Y-%m-%d'], ['%T', '%H:%M:%S'], ['%c', 'Date and time (C locale)'], ['%%', 'A % sign']],
    ldml: [['yyyy', 'Year'], ['yy', 'Two-digit year'], ['YYYY', 'Week-numbering year'], ['Q', 'Quarter'], ['M', 'Month 1–12'], ['MM', 'Month 01–12'], ['MMM', 'Short month name'],
      ['MMMM', 'Month name'], ['d', 'Day 1–31'], ['dd', 'Day 01–31'], ['do', 'Ordinal day (date-fns)'], ['D', 'Day of the year'], ['EEE', 'Short weekday'], ['EEEE', 'Weekday'],
      ['e', 'Weekday number (Monday = 1 in en-GB)'], ['w', 'Week of the year'], ['H', 'Hour 0–23'], ['HH', 'Hour 00–23'], ['h', 'Hour 1–12'], ['K', 'Hour 0–11'], ['k', 'Hour 1–24'],
      ['a', 'AM or PM'], ['mm', 'Minute'], ['ss', 'Second'], ['SSS', 'Milliseconds'], ['z', 'Zone abbreviation'], ['zzzz', 'Zone name'], ['Z', 'Offset +hhmm'],
      ['XXX', 'Offset +hh:mm or Z'], ['xxx', 'Offset +hh:mm'], ['VV', 'Zone ID'], ['G', 'Era'], ["'text'", 'Literal text'], ["''", 'A single quote']],
    moment: [['YYYY', 'Year'], ['YY', 'Two-digit year'], ['Q', 'Quarter'], ['M', 'Month 1–12'], ['MM', 'Month 01–12'], ['MMM', 'Short month name'], ['MMMM', 'Month name'],
      ['D', 'Day 1–31'], ['DD', 'Day 01–31'], ['Do', 'Ordinal day'], ['DDD', 'Day of the year'], ['d', 'Weekday 0–6, Sunday = 0'], ['dd', 'Two-letter weekday'], ['ddd', 'Short weekday'],
      ['dddd', 'Weekday'], ['E', 'ISO weekday 1–7'], ['W', 'ISO week'], ['GGGG', 'ISO week year'], ['H', 'Hour 0–23'], ['HH', 'Hour 00–23'], ['h', 'Hour 1–12'], ['k', 'Hour 1–24'],
      ['A', 'AM or PM'], ['a', 'am or pm'], ['mm', 'Minute'], ['ss', 'Second'], ['SSS', 'Milliseconds'], ['Z', 'Offset +hh:mm'], ['ZZ', 'Offset +hhmm'], ['X', 'Unix seconds'],
      ['x', 'Unix milliseconds'], ['L', 'Date (en-gb)'], ['LLLL', 'Date and time (en-gb)'], ['[text]', 'Literal text']],
    dotnet: [['yyyy', 'Year'], ['yy', 'Two-digit year'], ['M', 'Month 1–12'], ['MM', 'Month 01–12'], ['MMM', 'Short month name'], ['MMMM', 'Month name'], ['d', 'Day 1–31'],
      ['dd', 'Day 01–31'], ['ddd', 'Short weekday'], ['dddd', 'Weekday'], ['H', 'Hour 0–23'], ['HH', 'Hour 00–23'], ['h', 'Hour 1–12'], ['tt', 'AM or PM'], ['t', 'A or P'],
      ['mm', 'Minute'], ['ss', 'Second'], ['fff', 'Milliseconds'], ['FFF', 'Milliseconds, no trailing zeros'], ['z', 'Offset hours +1'], ['zz', 'Offset +01'], ['zzz', 'Offset +01:00'],
      ['K', 'Offset or Z'], ['gg', 'Era'], ['%d', 'One field on its own'], ["'text'", 'Literal text'], ['\\x', 'A literal character'], ['o', 'Round-trip (standard format)'],
      ['R', 'RFC 1123 (standard format)'], ['s', 'Sortable (standard format)'], ['u', 'Universal sortable (standard format)']],
    go: [['2006', 'Year'], ['06', 'Two-digit year'], ['1', 'Month 1–12'], ['01', 'Month 01–12'], ['Jan', 'Short month name'], ['January', 'Month name'], ['2', 'Day 1–31'],
      ['02', 'Day 01–31'], ['_2', 'Day, space-padded'], ['002', 'Day of the year'], ['Mon', 'Short weekday'], ['Monday', 'Weekday'], ['15', 'Hour 00–23'], ['3', 'Hour 1–12'],
      ['03', 'Hour 01–12'], ['PM', 'AM or PM'], ['pm', 'am or pm'], ['04', 'Minute'], ['05', 'Second'], ['.000', 'Milliseconds'], ['.999', 'Fraction, no trailing zeros'],
      ['-0700', 'Offset +hhmm'], ['-07:00', 'Offset +hh:mm'], ['Z07:00', 'Offset or Z'], ['MST', 'Zone abbreviation']]
  };

  Tools.register({
    id: 'date-format', category: 'time', name: 'Date Format Converter',
    description: 'Format a date with strftime, Unicode (Java, date-fns), Moment/Day.js, .NET or Go patterns, translate a pattern between them, and parse a date string with a pattern.',
    keywords: ['date format', 'strftime', 'strptime', 'python date format', 'php date', 'simpledateformat', 'datetimeformatter', 'java date format', 'icu', 'ldml',
      'date-fns', 'moment', 'momentjs', 'dayjs', 'day.js', 'dotnet', 'c# date format', 'tostring format', 'golang time format', 'go layout', 'iso 8601', 'rfc 3339',
      'rfc 2822', 'rfc 5322', 'unix time', 'parse date', 'format string', 'datetime'],
    render: function (root) {
      root.classList.add('g-timeb');
      var zones = [];
      try { zones = Intl.supportedValuesOf('timeZone').slice(); } catch (e) { zones = ['Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney']; }
      var local = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      if (zones.indexOf('UTC') === -1) zones.unshift('UTC');
      if (zones.indexOf(local) === -1) zones.unshift(local);
      var zone = U.select({ label: 'Time zone', options: zones, value: local });
      var when = U.input({ label: 'Date and time', type: 'datetime-local', step: '0.001' });

      var syntax = 'strftime';
      var chips = U.chips(SYNTAXES.map(function (s) { return { value: s.id, label: s.chip }; }), function (v) {
        /* Switching syntax rewrites the pattern so the result stays the same. */
        var prev = readPattern(syntax, val(pattern));
        var moved = writePattern(v, prev.tokens);
        syntax = v;
        setVal(pattern, prev.tokens.length ? moved.pattern : EXAMPLES[v][0]);
        examples();
        run();
      }, 'strftime');
      var pattern = U.input({ label: 'Pattern', value: '%A %d %B %Y, %H:%M', spellcheck: false, autocomplete: 'off' });
      var output = el('div', { class: 'tb-out', dataset: { k: 'df-out' } });
      var warns = el('ul', { class: 'tb-warn', dataset: { k: 'df-warn' } });
      var exampleRow = el('div', { class: 'chips' });
      var cheat = el('div', { class: 'scroll' });
      var cheatBox = el('details', {}, el('summary', { text: 'Pattern reference' }), cheat);
      var transBody = el('tbody');
      var common = el('div', { class: 'tb-fmt' });
      var parseIn = U.input({ label: 'Text to read', placeholder: 'Type a date written in the pattern above', spellcheck: false, autocomplete: 'off' });
      var parseOut = el('div');

      function instant() {
        var m = /^(\d{4,})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(val(when));
        if (!m) return NaN;
        return zonedToUtc(val(zone), +m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] || 0), m[7] ? Math.round(+('0.' + m[7]) * 1000) : 0);
      }
      function setInstant(ms) {
        var F = fieldsAt(ms, val(zone));
        setVal(when, pad(F.y, 4) + '-' + pad(F.mo) + '-' + pad(F.d) + 'T' + pad(F.h) + ':' + pad(F.mi) + ':' + pad(F.s) + '.' + pad(F.msec, 3));
      }
      function examples() {
        exampleRow.replaceChildren.apply(exampleRow, EXAMPLES[syntax].map(function (p) {
          return el('button', { class: 'chip', type: 'button', onclick: function () { setVal(pattern, p); run(); } }, p);
        }));
      }
      function run() {
        var ms = instant();
        var parsed = readPattern(syntax, val(pattern));
        warns.replaceChildren();
        if (isNaN(ms)) { output.textContent = ''; warns.appendChild(el('li', { text: 'Pick a date and time.' })); return; }
        output.textContent = formatTokens(parsed, ms, val(zone));
        parsed.warnings.concat(portabilityNotes(syntax, val(pattern))).forEach(function (w) { warns.appendChild(el('li', { text: w })); });

        transBody.replaceChildren();
        SYNTAXES.forEach(function (s) {
          if (s.id === syntax) return;
          var w = writePattern(s.id, parsed.tokens);
          var back = readPattern(s.id, w.pattern);
          if (parsed.utc) back.utc = true;
          var result = w.pattern ? formatTokens(back, ms, val(zone)) : '';
          transBody.appendChild(el('tr', { dataset: { syntax: s.id } },
            el('td', { text: s.name }),
            el('td', el('code', { dataset: { k: 'tr-pattern' }, text: w.pattern || '—' })),
            el('td', el('code', { dataset: { k: 'tr-output' }, text: result })),
            el('td', { class: 'tb-muted', dataset: { k: 'tr-notes' }, text: w.warnings.concat(parsed.utc ? ['The original converts the time to UTC first, so format a UTC value with this pattern.'] : []).concat(result === output.textContent ? [] : ['The result differs from the original.']).join(' ') }),
            el('td', U.button('Use', function () { chips.querySelectorAll('.chip')[SYNTAXES.indexOf(s)].click(); }, 'ghost'))));
        });

        common.replaceChildren();
        commonFormats(ms, val(zone)).forEach(function (r) {
          common.append(el('b', { text: r[1] }), el('code', { dataset: { k: 'cf-' + r[0] }, text: r[2] }), U.copyBtn('Copy', r[2]));
        });

        cheat.replaceChildren(el('table', { class: 'data' },
          el('thead', el('tr', {}, el('th', { text: 'Code' }), el('th', { text: 'Meaning' }), el('th', { text: 'Now' }))),
          el('tbody', CHEATS[syntax].map(function (c) {
            var sample = '';
            try { sample = formatTokens(readPattern(syntax, c[0]), ms, val(zone)); } catch (e) { sample = ''; }
            return el('tr', {}, el('td', el('code', { text: c[0] })), el('td', { text: c[1] }), el('td', el('code', { text: sample })));
          }))));
        cheatBox.querySelector('summary').textContent = 'Pattern reference: ' + syntaxName(syntax);
        doParse();
      }
      function doParse() {
        parseOut.replaceChildren();
        var text = val(parseIn);
        if (!String(text).trim()) return;
        try {
          var got = parseText(readPattern(syntax, val(pattern)), text, val(zone), syntax);
          if (isNaN(got.ms) || Math.abs(got.ms) > 8.64e15) throw new Error('That date is out of range.');
          var F = fieldsAt(got.ms, val(zone));
          parseOut.append(
            el('p', {}, 'Read as ', el('code', { dataset: { k: 'df-parsed' }, text: new Date(got.ms).toISOString() }), ' (UTC)'),
            el('p', { class: 'tb-muted', text: DAYS[F.wd] + ' ' + F.d + ' ' + MONTHS[F.mo - 1] + ' ' + F.y + ', ' + pad(F.h) + ':' + pad(F.mi) + ':' + pad(F.s) + ' in ' + val(zone) }),
            got.notes.length ? el('ul', { class: 'tb-warn', dataset: { k: 'df-parse-note' } }, got.notes.map(function (n) { return el('li', { text: n }); })) : null,
            U.button('Use this date above', function () { setInstant(got.ms); run(); }));
        } catch (err) {
          parseOut.appendChild(U.note(err.message || String(err), 'err'));
        }
      }

      setInstant(Date.now());
      examples();
      U.live([when, zone, pattern], run);
      inp(parseIn).addEventListener('input', U.debounce(doParse, 150));

      root.appendChild(U.panel(null, U.row(when, zone, U.button('Now', function () { setInstant(Date.now()); run(); }))));
      root.appendChild(U.panel('Format with a pattern', chips, pattern, exampleRow, output, warns,
        U.btnrow(U.copyBtn('Copy result', function () { return output.textContent; }), U.copyBtn('Copy pattern', function () { return val(pattern); })), cheatBox));
      root.appendChild(U.panel('The same pattern in other syntaxes', el('div', { class: 'scroll' }, el('table', { class: 'data' },
        el('thead', el('tr', {}, ['Syntax', 'Pattern', 'Result', 'Notes', ''].map(function (h) { return el('th', { text: h }); }))), transBody)),
        U.note('Letters, names and am/pm are English. Two-digit years read back as 1969–2068 (strftime, Moment, Go), 1950–2049 (.NET) or within 80 years before and 20 after today (Java, ICU).')));
      root.appendChild(U.panel('Common formats', common));
      root.appendChild(U.panel('Parse a string with this pattern', parseIn, parseOut));
    }
  });

  /* ======================================================================= */
  /* Easter (shared by UK Bank Holidays and the Easter calculator)            */
  /* ======================================================================= */

  /* Western Easter: the anonymous Gregorian algorithm (Meeus, Astronomical
     Algorithms, ch. 8), valid for every Gregorian year. */
  function easterWestern(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var n = h + l - 7 * m + 114;
    return utcDate(y, Math.floor(n / 31), (n % 31) + 1);
  }
  /* Orthodox Easter: Meeus's Julian algorithm gives the Julian calendar
     date, then the gap between the calendars is added (13 days in 1900–2099). */
  function easterOrthodox(y) {
    var a = y % 4, b = y % 7, c = y % 19;
    var d = (19 * c + 15) % 30;
    var e = (2 * a + 4 * b - d + 34) % 7;
    var n = d + e + 114;
    var month = Math.floor(n / 31), day = (n % 31) + 1;
    var gap = Math.floor(y / 100) - Math.floor(y / 400) - 2;
    return { julianMonth: month, julianDay: day, date: addDays(utcDate(y, month, day), gap) };
  }

  /* ======================================================================= */
  /* UK Bank Holidays                                                        */
  /* ======================================================================= */

  /* Rules from GOV.UK (gov.uk/bank-holidays) and the Banking and Financial
     Dealings Act 1971. The output was checked against GOV.UK's published
     data for 2015–2028 (alphagov/frontend lib/data/bank-holidays.json), which
     also supplied the Scottish World Cup holiday of 15 June 2026. */
  var NATIONS = [
    { id: 'ew', name: 'England and Wales', short: 'England & Wales' },
    { id: 'sc', name: 'Scotland', short: 'Scotland' },
    { id: 'ni', name: 'Northern Ireland', short: 'Northern Ireland' }
  ];
  var BH_FIRST = 1978; /* the early May bank holiday began in 1978 */
  /* One-off changes: moved holidays and extra days. Each applies UK-wide
     unless `only` says otherwise. */
  var BH_ONE_OFF = {
    1981: [{ add: [7, 29], title: 'Royal wedding bank holiday (Prince Charles and Lady Diana Spencer)' }],
    1995: [{ move: 'early_may', to: [5, 8], title: 'Early May bank holiday (VE day)' }],
    1999: [{ add: [12, 31], title: 'Millennium bank holiday' }],
    2002: [{ move: 'spring', to: [6, 4] }, { add: [6, 3], title: 'Queen’s Golden Jubilee' }],
    2011: [{ add: [4, 29], title: 'Royal wedding bank holiday (Prince William and Catherine Middleton)' }],
    2012: [{ move: 'spring', to: [6, 4] }, { add: [6, 5], title: 'Queen’s Diamond Jubilee' }],
    2020: [{ move: 'early_may', to: [5, 8], title: 'Early May bank holiday (VE day)' }],
    2022: [{ move: 'spring', to: [6, 2] }, { add: [6, 3], title: 'Platinum Jubilee bank holiday' },
      { add: [9, 19], title: 'Bank Holiday for the State Funeral of Queen Elizabeth II' }],
    2023: [{ add: [5, 8], title: 'Bank holiday for the coronation of King Charles III' }],
    2026: [{ add: [6, 15], title: 'World Cup bank holiday', only: 'sc' }]
  };

  function bankHolidays(nation, y) {
    function isWeekend(dt) { var w = dt.getUTCDay(); return w === 0 || w === 6; }
    function firstMonday(m) { var d = utcDate(y, m, 1); return addDays(d, (8 - d.getUTCDay()) % 7); }
    function lastMonday(m) { var d = utcDate(y, m + 1, 0); return addDays(d, -((d.getUTCDay() + 6) % 7)); }
    var easter = easterWestern(y);
    var fixed = [], moving = [];
    fixed.push({ key: 'new_year', title: 'New Year’s Day', date: utcDate(y, 1, 1) });
    if (nation === 'sc') fixed.push({ key: 'jan2', title: '2nd January', date: utcDate(y, 1, 2) });
    if (nation === 'ni') fixed.push({ key: 'st_patrick', title: 'St Patrick’s Day', date: utcDate(y, 3, 17) });
    moving.push({ key: 'good_friday', title: 'Good Friday', date: addDays(easter, -2) });
    if (nation !== 'sc') moving.push({ key: 'easter_monday', title: 'Easter Monday', date: addDays(easter, 1) });
    moving.push({ key: 'early_may', title: 'Early May bank holiday', date: firstMonday(5) });
    moving.push({ key: 'spring', title: 'Spring bank holiday', date: lastMonday(5) });
    if (nation === 'ni') fixed.push({ key: 'boyne', title: 'Battle of the Boyne (Orangemen’s Day)', date: utcDate(y, 7, 12) });
    moving.push({ key: 'summer', title: 'Summer bank holiday', date: nation === 'sc' ? firstMonday(8) : lastMonday(8) });
    if (nation === 'sc' && y >= 2007) fixed.push({ key: 'st_andrew', title: 'St Andrew’s Day', date: utcDate(y, 11, 30) });
    fixed.push({ key: 'christmas', title: 'Christmas Day', date: utcDate(y, 12, 25) });
    fixed.push({ key: 'boxing', title: 'Boxing Day', date: utcDate(y, 12, 26) });

    (BH_ONE_OFF[y] || []).forEach(function (c) {
      if (c.only && c.only !== nation) return;
      if (c.move) moving.forEach(function (h) { if (h.key === c.move) { h.date = utcDate(y, c.to[0], c.to[1]); if (c.title) h.title = c.title; } });
      if (c.add) moving.push({ key: 'extra', title: c.title, date: utcDate(y, c.add[0], c.add[1]) });
    });

    /* A fixed-date holiday on a weekend moves to the next weekday that is
       not already a bank holiday, normally the following Monday. */
    var taken = {};
    fixed.concat(moving).forEach(function (h) { if (!isWeekend(h.date)) taken[isoOf(h.date)] = true; });
    fixed.forEach(function (h) {
      if (!isWeekend(h.date)) return;
      var d = h.date;
      while (isWeekend(d) || taken[isoOf(d)]) d = addDays(d, 1);
      h.date = d;
      h.sub = true;
      taken[isoOf(d)] = true;
    });
    /* GOV.UK labels a Sunday New Year in Scotland as the substitute on the
       2nd and "2nd January" on the 3rd; the dates are the same either way. */
    if (nation === 'sc' && utcDate(y, 1, 1).getUTCDay() === 0) {
      fixed[0].date = utcDate(y, 1, 2); fixed[1].date = utcDate(y, 1, 3); fixed[1].sub = true;
    }
    return fixed.concat(moving).sort(function (a, b) { return a.date - b.date; });
  }

  function holidayTitle(h) { return h.title + (h.sub ? ' (substitute day)' : ''); }

  Tools.register({
    id: 'uk-bank-holidays', category: 'time', name: 'UK Bank Holidays',
    description: 'Bank holidays in England and Wales, Scotland and Northern Ireland for any year, with substitute days, one-off holidays, a countdown to the next one and a calendar download.',
    keywords: ['bank holiday', 'bank holidays', 'public holidays', 'uk holidays', 'next bank holiday', 'england', 'wales', 'scotland', 'northern ireland',
      'substitute day', 'christmas', 'boxing day', 'easter monday', 'good friday', 'may day', 'st andrews day', 'st patricks day', 'twelfth of july',
      'orangemens day', 'ics', 'ical', 'calendar', 'holiday', 'vacation', 'day off'],
    render: function (root) {
      root.classList.add('g-timeb');
      var thisYear = new Date().getFullYear();
      var year = yearField('Year', thisYear, BH_FIRST, 4099);
      var nation = U.chips(NATIONS.map(function (n) { return { value: n.id, label: n.short }; }).concat([{ value: 'all', label: 'All' }]), function () { draw(); }, 'ew');
      var next = el('div', { class: 'tb-cards' });
      var list = el('div');
      var status = U.note('');

      function combined(y) {
        var byDate = {};
        NATIONS.forEach(function (n) {
          bankHolidays(n.id, y).forEach(function (h) {
            var k = isoOf(h.date);
            var row = byDate[k] || (byDate[k] = { date: h.date, titles: [], nations: {} });
            if (row.titles.indexOf(holidayTitle(h)) === -1) row.titles.push(holidayTitle(h));
            row.nations[n.id] = true;
          });
        });
        return Object.keys(byDate).sort().map(function (k) { return byDate[k]; });
      }
      function nextFor(n) {
        var today = todayUTC(), y = today.getUTCFullYear();
        for (var yy = y; yy <= y + 1; yy++) {
          var hit = bankHolidays(n, yy).filter(function (h) { return h.date >= today; })[0];
          if (hit) return hit;
        }
        return null;
      }
      function draw() {
        var y = year.year();
        var n = nation.value;
        next.replaceChildren();
        (n === 'all' ? NATIONS : NATIONS.filter(function (x) { return x.id === n; })).forEach(function (x) {
          var h = nextFor(x.id);
          if (!h) return;
          var days = dayCount(todayUTC(), h.date);
          next.appendChild(el('div', { class: 'tb-card hi', dataset: { nation: x.id } },
            el('h4', { text: 'Next in ' + x.name }),
            el('div', { class: 'tb-big', dataset: { k: 'bh-next-days' }, text: days === 0 ? 'Today' : plural(days, 'day') }),
            el('div', { dataset: { k: 'bh-next', date: isoOf(h.date) }, text: longOf(h.date) }),
            el('div', { class: 'tb-muted', text: holidayTitle(h) })));
        });
        list.replaceChildren();
        if (isNaN(y)) { status.className = 'note err'; status.textContent = 'Pick a year from ' + BH_FIRST + ' to 4099.'; return; }
        status.className = 'note';
        status.textContent = y > thisYear + 3 ? 'Years this far ahead follow today’s rules; one-off holidays are announced a year or two in advance.' : '';
        var head, rows;
        if (n === 'all') {
          head = ['Date', 'Day', 'Bank holiday'].concat(NATIONS.map(function (x) { return x.short; }));
          rows = combined(y).map(function (r) {
            return el('tr', { dataset: { date: isoOf(r.date), title: r.titles.join(' / ') } },
              el('td', { class: 'mono', text: ukOf(r.date) }), el('td', { text: DAYS[r.date.getUTCDay()] }), el('td', { text: r.titles.join(' / ') }),
              NATIONS.map(function (x) { return el('td', { class: 'tb-yes', text: r.nations[x.id] ? '✓' : '' }); }));
          });
        } else {
          head = ['Date', 'Day', 'Bank holiday'];
          rows = bankHolidays(n, y).map(function (h) {
            return el('tr', { dataset: { date: isoOf(h.date), title: holidayTitle(h) } },
              el('td', { class: 'mono', text: ukOf(h.date) }), el('td', { text: DAYS[h.date.getUTCDay()] }), el('td', { text: holidayTitle(h) }));
          });
        }
        list.appendChild(el('div', { class: 'scroll' }, el('table', { class: 'data', dataset: { bh: n + '-' + y } },
          el('thead', el('tr', {}, head.map(function (t) { return el('th', { text: t }); }))), el('tbody', rows))));
        list.appendChild(el('p', { class: 'tb-muted', text: rows.length + ' bank holidays in ' + y + '.' }));
      }

      function ics(from, to) {
        var n = nation.value, label = n === 'all' ? 'the UK' : NATIONS.filter(function (x) { return x.id === n; })[0].name;
        var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//All The Tools//UK Bank Holidays//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
          'X-WR-CALNAME:' + icsEscape('UK bank holidays: ' + label)];
        var stamp = icsStampNow();
        for (var y = from; y <= to; y++) {
          var items = n === 'all' ? combined(y).map(function (r) {
            var who = NATIONS.filter(function (x) { return r.nations[x.id]; });
            return { date: r.date, title: r.titles.join(' / ') + (who.length < 3 ? ' (' + who.map(function (x) { return x.name; }).join(', ') + ')' : '') };
          }) : bankHolidays(n, y).map(function (h) { return { date: h.date, title: holidayTitle(h) }; });
          items.forEach(function (it) {
            var d = isoOf(it.date).replace(/-/g, '');
            lines.push('BEGIN:VEVENT', 'UID:' + d + '-' + n + '@uk-bank-holidays.all-the-tools', 'DTSTAMP:' + stamp,
              'DTSTART;VALUE=DATE:' + d, 'DTEND;VALUE=DATE:' + isoOf(addDays(it.date, 1)).replace(/-/g, ''),
              'SUMMARY:' + icsEscape(it.title), 'TRANSP:TRANSPARENT', 'END:VEVENT');
          });
        }
        lines.push('END:VCALENDAR');
        return lines.map(icsFold).join('\r\n') + '\r\n';
      }
      function download(span) {
        var y = year.year();
        if (isNaN(y)) return U.toast('Pick a year first', 'err');
        var to = Math.min(4099, y + span - 1);
        U.saveBlob('uk-bank-holidays-' + nation.value + '-' + y + (to > y ? '-' + to : '') + '.ics', new Blob([ics(y, to)], { type: 'text/calendar;charset=utf-8' }));
      }

      U.live([year], draw);
      root.appendChild(U.panel(null, U.row(year,
        U.button('‹ Previous', function () { year.bump(-1); }), U.button('Next ›', function () { year.bump(1); }),
        U.button('This year', function () { setVal(year, String(thisYear)); draw(); }, 'ghost')), nation));
      root.appendChild(U.panel(null, next));
      root.appendChild(U.panel('Bank holidays', status, list,
        U.btnrow(U.button('Download .ics for this year', function () { download(1); }, 'primary'), U.button('Download .ics for five years', function () { download(5); })),
        U.note('If a bank holiday falls on a weekend, a substitute weekday becomes a bank holiday, normally the following Monday. Dates come from the rules, with the one-off changes since ' + BH_FIRST + ' (the royal weddings of 1981 and 2011, the millennium, jubilees, VE day moves, the Queen’s funeral, the coronation and Scotland’s 2026 World Cup holiday). Your employer does not have to give paid leave on bank holidays.')));
    }
  });

  /* ======================================================================= */
  /* Easter Date Calculator                                                  */
  /* ======================================================================= */

  var WESTERN_DAYS = [
    ['shrove', 'Shrove Tuesday (Pancake Day)', -47], ['ash', 'Ash Wednesday', -46], ['mothering', 'Mothering Sunday (UK)', -21],
    ['palm', 'Palm Sunday', -7], ['maundy', 'Maundy Thursday', -3], ['good-friday', 'Good Friday', -2], ['holy-saturday', 'Holy Saturday', -1],
    ['easter', 'Easter Sunday', 0], ['easter-monday', 'Easter Monday', 1], ['ascension', 'Ascension Day', 39],
    ['pentecost', 'Pentecost (Whit Sunday)', 49], ['whit-monday', 'Whit Monday', 50], ['trinity', 'Trinity Sunday', 56], ['corpus-christi', 'Corpus Christi', 60]
  ];
  var ORTHODOX_DAYS = [
    ['clean-monday', 'Clean Monday (Great Lent begins)', -48], ['lazarus', 'Lazarus Saturday', -8], ['palm', 'Palm Sunday', -7],
    ['great-friday', 'Holy and Great Friday', -2], ['pascha', 'Pascha (Easter Sunday)', 0], ['ascension', 'Ascension', 39], ['pentecost', 'Pentecost', 49]
  ];
  function offsetText(n) { return n === 0 ? 'Easter' : 'Easter ' + (n < 0 ? '− ' : '+ ') + plural(Math.abs(n), 'day'); }

  Tools.register({
    id: 'easter-date', category: 'time', name: 'Easter Date Calculator',
    description: 'Western and Orthodox Easter for any year from 1583 to 4099, with Shrove Tuesday, Mothering Sunday, Good Friday, Ascension, Pentecost and the other movable days.',
    keywords: ['easter', 'easter sunday', 'when is easter', 'orthodox easter', 'pascha', 'computus', 'good friday', 'easter monday', 'shrove tuesday',
      'pancake day', 'ash wednesday', 'lent', 'mothering sunday', 'mothers day', 'palm sunday', 'maundy thursday', 'ascension day', 'pentecost', 'whitsun',
      'whit sunday', 'trinity sunday', 'corpus christi', 'movable feasts', 'church calendar'],
    render: function (root) {
      root.classList.add('g-timeb');
      var thisYear = new Date().getFullYear();
      var year = yearField('Year', thisYear, 1583, 4099);
      var cards = el('div', { class: 'tb-cards' });
      var western = el('div'), orthodox = el('div');
      var from = yearField('From', thisYear, 1583, 4099), to = yearField('To', thisYear + 9, 1583, 4099);
      var range = el('div');
      var status = U.note('');
      var rangeRows = [];

      function feastTable(rows, base, kind) {
        return el('div', { class: 'scroll' }, el('table', { class: 'data', dataset: { feasts: kind } },
          el('thead', el('tr', {}, ['Day', 'Date', 'When'].map(function (t) { return el('th', { text: t }); }))),
          el('tbody', rows.map(function (f) {
            var d = addDays(base, f[2]);
            return el('tr', { dataset: { feast: f[0], date: isoOf(d) } }, el('td', { text: f[1] }), el('td', { text: longOf(d) }), el('td', { class: 'tb-muted', text: offsetText(f[2]) }));
          }))));
      }
      function draw() {
        var y = year.year();
        cards.replaceChildren(); western.replaceChildren(); orthodox.replaceChildren();
        if (isNaN(y)) { status.className = 'note err'; status.textContent = 'Pick a year from 1583 to 4099.'; return; }
        status.className = 'note'; status.textContent = '';
        var w = easterWestern(y), o = easterOrthodox(y), today = todayUTC();
        function until(d) { var n = dayCount(today, d); return n > 0 ? 'in ' + plural(n, 'day') : n === 0 ? 'today' : plural(-n, 'day') + ' ago'; }
        cards.append(
          el('div', { class: 'tb-card hi' }, el('h4', { text: 'Western Easter (Gregorian)' }),
            el('div', { class: 'tb-big', dataset: { k: 'easter-western', date: isoOf(w) }, text: w.getUTCDate() + ' ' + MONTHS[w.getUTCMonth()] }),
            el('div', { text: longOf(w) }), el('div', { class: 'tb-muted', text: until(w) })),
          el('div', { class: 'tb-card' }, el('h4', { text: 'Orthodox Easter (Julian)' }),
            el('div', { class: 'tb-big', dataset: { k: 'easter-orthodox', date: isoOf(o.date) }, text: o.date.getUTCDate() + ' ' + MONTHS[o.date.getUTCMonth()] }),
            el('div', { text: longOf(o.date) }),
            el('div', { class: 'tb-muted', text: o.julianDay + ' ' + MONTHS[o.julianMonth - 1] + ' in the Julian calendar · ' + until(o.date) })),
          el('div', { class: 'tb-card' }, el('h4', { text: 'Gap' }),
            el('div', { class: 'tb-big', dataset: { k: 'easter-gap' }, text: dayCount(w, o.date) === 0 ? 'Same day' : plural(Math.abs(dayCount(w, o.date)) / 7, 'week') }),
            el('div', { class: 'tb-muted', text: dayCount(w, o.date) === 0 ? 'Both churches celebrate together this year.' : 'Orthodox Easter comes ' + (dayCount(w, o.date) > 0 ? 'later' : 'earlier') + ' this year.' })));
        western.appendChild(feastTable(WESTERN_DAYS, w, 'western'));
        orthodox.appendChild(feastTable(ORTHODOX_DAYS, o.date, 'orthodox'));
      }
      function drawRange() {
        var a = from.year(), b = to.year();
        range.replaceChildren();
        rangeRows = [];
        if (isNaN(a) || isNaN(b)) { range.appendChild(U.note('Years must be from 1583 to 4099.', 'err')); return; }
        if (b < a) { var t = a; a = b; b = t; }
        if (b - a > 999) { range.appendChild(U.note('Show up to 1,000 years at a time.', 'err')); return; }
        for (var y = a; y <= b; y++) {
          var w = easterWestern(y), o = easterOrthodox(y).date;
          rangeRows.push([y, w, o]);
        }
        range.appendChild(el('div', { class: 'scroll', style: { maxHeight: '420px' } }, el('table', { class: 'data' },
          el('thead', el('tr', {}, ['Year', 'Western Easter', 'Orthodox Easter', ''].map(function (t) { return el('th', { text: t }); }))),
          el('tbody', rangeRows.map(function (r) {
            return el('tr', { dataset: { year: r[0], western: isoOf(r[1]), orthodox: isoOf(r[2]) } },
              el('td', { class: 'mono', text: String(r[0]) }), el('td', { text: DAY3[0] + ' ' + r[1].getUTCDate() + ' ' + MON3[r[1].getUTCMonth()] }),
              el('td', { text: DAY3[0] + ' ' + r[2].getUTCDate() + ' ' + MON3[r[2].getUTCMonth()] }),
              el('td', { class: 'tb-muted', text: +r[1] === +r[2] ? 'Same day' : '' }));
          })))));
      }

      U.live([year], draw);
      U.live([from, to], drawRange);
      root.appendChild(U.panel(null, U.row(year,
        U.button('‹ Previous', function () { year.bump(-1); }), U.button('Next ›', function () { year.bump(1); }),
        U.button('This year', function () { setVal(year, String(thisYear)); draw(); }, 'ghost')), status, cards));
      root.appendChild(U.panel('Western movable days', western,
        U.note('Western churches use the Gregorian calendar. Mothering Sunday is the fourth Sunday of Lent, three weeks before Easter; it is the UK and Irish Mother’s Day.')));
      root.appendChild(U.panel('Orthodox movable days', orthodox,
        U.note('Orthodox churches work out Easter in the Julian calendar, which is 13 days behind the Gregorian calendar from 1900 to 2099; dates here are converted to the Gregorian calendar.')));
      root.appendChild(U.panel('Easter over a range of years', U.row(from, to), range,
        U.btnrow(U.downloadBtn('Download CSV', 'easter-dates.csv', function () {
          return window.CSV.stringify([['Year', 'Western Easter', 'Orthodox Easter']].concat(rangeRows.map(function (r) { return [r[0], isoOf(r[1]), isoOf(r[2])]; }))) + '\r\n';
        }, 'text/csv'))));
    }
  });
})();
