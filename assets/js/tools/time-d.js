/* Time zones: the Time Zone Converter, laid out as a meeting planner in the
   style of World Time Buddy, and the World Clock. Both share one saved list
   of your places and your home zone (Memory.state 'tz-places'), so the
   places you add in one show up in the other the next time you visit.

   Planner: a row per place, each with the 24 hours of your home day
   (shaded night, early or late, and working hours). Drag across the hours
   to pick a meeting; drag its edges to change the length or its middle to
   move it; arrow keys nudge it. Every place's times for the pick are listed
   underneath, with copy, .ics and Google Calendar. The Date & Time field
   and "From Timezone" still convert one exact time, and stay in step with
   the pick. Uses the zone helpers time.js exports as window.TimeKit. */
(function () {
  'use strict';
  var U = window.UI, el = U.el, K = window.TimeKit;
  if (!K || !K.zoneParts) return;
  var pad = K.pad, DAYS = K.DAYS, MONTHS = K.MONTHS;

  document.head.appendChild(el('style', { text: [
    '.g-tz .tzp-scroll { overflow-x: auto; margin: 0 -4px; padding: 30px 4px 4px; }',
    '.g-tz .tzp-rows { position: relative; min-width: 780px; display: grid; grid-template-columns: 250px 1fr; outline: none; user-select: none; -webkit-user-select: none; touch-action: pan-y; }',
    '.g-tz .tzp-rows:focus-visible { box-shadow: 0 0 0 2px var(--accent); border-radius: var(--radius-s); }',
    '.g-tz .tzp-info { position: sticky; left: 0; z-index: 3; background: var(--bg-elev); display: flex; align-items: center; gap: 6px; padding: 6px 8px 6px 0; border-bottom: 1px solid var(--border); min-height: 52px; }',
    '.g-tz .tzp-line { display: flex; border-bottom: 1px solid var(--border); cursor: crosshair; min-height: 52px; }',
    '.g-tz .tzp-row-home .tzp-info .tzp-name { color: var(--accent); }',
    '.g-tz .tzp-grip { cursor: grab; color: var(--fg-muted); padding: 2px; font-size: 14px; line-height: 1; opacity: .6; }',
    '.g-tz .tzp-grip:hover { opacity: 1; }',
    '.g-tz .tzp-text { flex: 1; min-width: 0; }',
    '.g-tz .tzp-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }',
    '.g-tz .tzp-sub { color: var(--fg-muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }',
    '.g-tz .tzp-now { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }',
    '.g-tz .tzp-now b { display: block; font-size: 15px; }',
    '.g-tz .tzp-now span { font-size: 11px; color: var(--fg-muted); }',
    '.g-tz .tzp-btn { border: 0; background: none; color: var(--fg-muted); cursor: pointer; padding: 2px 4px; border-radius: 4px; font: inherit; font-size: 13px; line-height: 1; }',
    '.g-tz .tzp-btn:hover { background: var(--bg-sunken); color: var(--fg); }',
    '.g-tz .tzp-row:not(:hover) .tzp-hide { visibility: hidden; }',
    '.g-tz .tzp-homebadge { font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--accent); border: 1px solid var(--accent); border-radius: 4px; padding: 1px 4px; }',
    '.g-tz .tzp-cell { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 12px; font-variant-numeric: tabular-nums; border-left: 1px solid transparent; line-height: 1.1; }',
    '.g-tz .tzp-cell small { font-size: 9px; opacity: .75; }',
    '.g-tz .tzp-cell.night { background: color-mix(in srgb, var(--fg) 13%, var(--bg-elev)); color: var(--fg-muted); }',
    '.g-tz .tzp-cell.edge { background: color-mix(in srgb, var(--fg) 5%, var(--bg-elev)); }',
    '.g-tz .tzp-cell.day { background: var(--bg-elev); }',
    '.g-tz .tzp-cell.work { background: color-mix(in srgb, var(--ok) 16%, var(--bg-elev)); }',
    '.g-tz .tzp-cell.daystart { border-left: 2px solid var(--fg-muted); font-weight: 700; font-size: 11px; }',
    '.g-tz .tzp-cell.daystart small { font-size: 10px; opacity: 1; font-weight: 600; }',
    '.g-tz .tzp-overlay { position: absolute; top: 0; bottom: 0; left: 250px; right: 0; pointer-events: none; z-index: 2; }',
    '.g-tz .tzp-nowline { position: absolute; top: 0; bottom: 0; width: 2px; background: var(--err); opacity: .8; }',
    '.g-tz .tzp-hover { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--fg-muted); opacity: .5; display: none; }',
    '.g-tz .tzp-sel { position: absolute; top: 0; bottom: 0; border: 2px solid var(--accent); border-radius: 6px; background: color-mix(in srgb, var(--accent) 16%, transparent); pointer-events: auto; cursor: grab; }',
    '.g-tz .tzp-sel.dragging { cursor: grabbing; }',
    '.g-tz .tzp-sel-h { position: absolute; top: 0; bottom: 0; width: 10px; cursor: ew-resize; }',
    '.g-tz .tzp-sel-l { left: -6px; } .g-tz .tzp-sel-r { right: -6px; }',
    '.g-tz .tzp-sel-tag { position: absolute; top: -24px; left: 50%; transform: translateX(-50%); background: var(--accent); color: var(--accent-fg); font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 10px; white-space: nowrap; }',
    '.g-tz .tzp-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }',
    '.g-tz .tzp-head strong { font-size: 16px; min-width: 210px; text-align: center; }',
    '.g-tz .tzp-add { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; margin-top: 12px; }',
    '.g-tz .tzp-add .field { margin: 0; }',
    '.g-tz .tzp-add .tzp-place { flex: 1 1 260px; }',
    '.g-tz .tzp-add .tzp-work select { width: 96px; }',
    '.g-tz .tzp-legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: var(--fg-muted); margin-top: 8px; }',
    '.g-tz .tzp-legend i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; vertical-align: -2px; margin-right: 4px; border: 1px solid var(--border); }',
    '.g-tz .tzp-sum { font-size: 15px; }',
    '.g-tz .tzp-sum-list { display: grid; grid-template-columns: max-content 1fr; gap: 4px 14px; margin: 10px 0; font-variant-numeric: tabular-nums; }',
    '.g-tz .tzp-sum-list .off { color: var(--fg-muted); }',
    '.g-tz .tzp-sum-list .bad { color: var(--warn); }',
    '.g-tz .card.wc-mine { border-color: var(--accent); }',
    '.g-tz .card.wc-home { box-shadow: inset 0 0 0 1px var(--accent); }',
    '.g-tz .card { position: relative; }',
    '.g-tz .wc-star { position: absolute; top: 8px; right: 8px; border: 0; background: none; cursor: pointer; font-size: 16px; color: var(--fg-muted); line-height: 1; padding: 2px; }',
    '.g-tz .wc-star.on { color: var(--warn); }',
    '.g-tz .wc-rel { font-size: 12px; color: var(--accent); font-weight: 600; }',
    '.g-tz .tzp-drop-before { box-shadow: 0 -2px 0 var(--accent) inset; }'
  ].join('\n') }));

  /* --- places ----------------------------------------------------------------- */

  var HOME = (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } })();

  /* Names and flags for zones we know a city for; anything else is named
     from its IANA id ("America/Argentina/Buenos_Aires" -> "Buenos Aires"). */
  var KNOWN = {};
  K.CITIES.concat(K.MORE_CITIES).forEach(function (c) { if (!KNOWN[c[2]]) KNOWN[c[2]] = { flag: c[0], name: c[1] }; });
  K.TZ21.forEach(function (z) { if (!KNOWN[z[0]]) KNOWN[z[0]] = { flag: '', name: z[1] }; });
  KNOWN.UTC = { flag: '🌐', name: 'UTC' };

  var ALL_ZONES = (function () {
    var list = [];
    try { list = Intl.supportedValuesOf('timeZone').slice(); } catch (e) { list = Object.keys(KNOWN); }
    if (list.indexOf('UTC') < 0) list.unshift('UTC');
    Object.keys(KNOWN).forEach(function (z) { if (list.indexOf(z) < 0 && K.zoneExists(z)) list.push(z); });
    return list.filter(K.zoneExists);
  })();

  function placeName(zone) {
    if (KNOWN[zone]) return KNOWN[zone].name;
    var m = /^Etc\/GMT([+-])(\d+)$/.exec(zone);
    if (m) return 'UTC' + (m[1] === '+' ? '−' : '+') + m[2];
    return zone.split('/').pop().replace(/_/g, ' ');
  }
  function flagOf(zone) { return KNOWN[zone] ? KNOWN[zone].flag : ''; }

  var abbrCache = {};
  /* A short name for the zone at an instant: "EST", "BST", else "UTC+5:30". */
  function abbr(zone, date) {
    var k = zone + '|' + Math.floor(date.getTime() / 3600000);
    if (abbrCache[k]) return abbrCache[k];
    var out = '';
    try {
      var p = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' }).formatToParts(date)
        .filter(function (x) { return x.type === 'timeZoneName'; })[0];
      out = p ? p.value : '';
      if (/^GMT[+-]/.test(out) || !out) {
        var gb = new Intl.DateTimeFormat('en-GB', { timeZone: zone, timeZoneName: 'short' }).formatToParts(date)
          .filter(function (x) { return x.type === 'timeZoneName'; })[0];
        if (gb && /^[A-Z]{2,5}$/.test(gb.value)) out = gb.value;
      }
    } catch (e) { /* older engines */ }
    if (!out || /^GMT[+-]/.test(out)) out = K.offsetClock(K.zoneOffset(zone, date));
    return (abbrCache[k] = out);
  }

  /* Common abbreviations, for typing "EST" or pasting "3pm PST". */
  var ABBR_ZONES = {
    utc: 'UTC', gmt: 'Europe/London', bst: 'Europe/London', wet: 'Europe/Lisbon', cet: 'Europe/Paris', cest: 'Europe/Paris',
    eet: 'Europe/Athens', eest: 'Europe/Athens', msk: 'Europe/Moscow', gst: 'Asia/Dubai', pkt: 'Asia/Karachi', ist: 'Asia/Kolkata',
    ict: 'Asia/Bangkok', sgt: 'Asia/Singapore', hkt: 'Asia/Hong_Kong', jst: 'Asia/Tokyo', kst: 'Asia/Seoul',
    awst: 'Australia/Perth', acst: 'Australia/Adelaide', aest: 'Australia/Sydney', aedt: 'Australia/Sydney',
    nzst: 'Pacific/Auckland', nzdt: 'Pacific/Auckland', hst: 'Pacific/Honolulu', akst: 'America/Anchorage', akdt: 'America/Anchorage',
    pst: 'America/Los_Angeles', pdt: 'America/Los_Angeles', mst: 'America/Denver', mdt: 'America/Denver',
    cst: 'America/Chicago', cdt: 'America/Chicago', est: 'America/New_York', edt: 'America/New_York', brt: 'America/Sao_Paulo'
  };

  /* A zone from what someone typed: a city, an IANA id, an abbreviation,
     or an offset like "UTC+9" / "GMT-3:30". */
  function findZone(text) {
    var q = String(text || '').trim();
    if (!q) return null;
    var lower = q.toLowerCase();
    var i, z;
    for (i = 0; i < ALL_ZONES.length; i++) if (ALL_ZONES[i].toLowerCase() === lower) return ALL_ZONES[i];
    var names = Object.keys(KNOWN);
    for (i = 0; i < names.length; i++) if (KNOWN[names[i]].name.toLowerCase() === lower) return names[i];
    /* "Paris — Europe/Paris", as the suggestion list shows them. */
    var m = /—\s*([A-Za-z_\/+-]+\d*)\s*$/.exec(q);
    if (m && ALL_ZONES.indexOf(m[1]) > -1) return m[1];
    if (ABBR_ZONES[lower]) return ABBR_ZONES[lower];
    m = /^(?:utc|gmt)\s*([+-−])\s*(\d{1,2})(?::?(\d{2}))?$/i.exec(q);
    if (m) {
      var sign = m[1] === '+' ? 1 : -1, mins = sign * (+m[2] * 60 + +(m[3] || 0));
      if (!+(m[3] || 0) && +m[2] <= 14) {
        z = +m[2] === 0 ? 'UTC' : 'Etc/GMT' + (sign > 0 ? '-' : '+') + (+m[2]);
        if (K.zoneExists(z)) return z;
      }
      var now = new Date();
      var hit = Object.keys(KNOWN).concat(ALL_ZONES).filter(function (x) { return K.zoneOffset(x, now) === mins; })[0];
      return hit || null;
    }
    for (i = 0; i < names.length; i++) if (KNOWN[names[i]].name.toLowerCase().indexOf(lower) === 0) return names[i];
    for (i = 0; i < ALL_ZONES.length; i++) {
      var seg = ALL_ZONES[i].split('/').pop().replace(/_/g, ' ').toLowerCase();
      if (seg === lower || seg.indexOf(lower) === 0) return ALL_ZONES[i];
    }
    return null;
  }

  var DEFAULT_PLACES = [HOME, 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo'];
  var store = window.Memory ? Memory.state('tz-places', {}) : (function () {
    var mem = {};
    return { get: function () { return Object.assign({}, mem); }, set: function (p) { Object.assign(mem, p); return mem; } };
  })();

  function prefs() {
    var s = store.get();
    var places = (Array.isArray(s.places) && s.places.length ? s.places : DEFAULT_PLACES).filter(K.zoneExists);
    places = places.filter(function (z, i) { return places.indexOf(z) === i; });
    var home = s.home && K.zoneExists(s.home) ? s.home : HOME;
    if (places.indexOf(home) < 0) places.unshift(home);
    var work = Array.isArray(s.work) && s.work.length === 2 ? s.work : [9, 17];
    return { places: places, home: home, h12: !!s.h12, step: [15, 30, 60].indexOf(+s.step) > -1 ? +s.step : 60, work: work };
  }
  function savePrefs(patch) { store.set(patch); }

  /* --- time helpers ---------------------------------------------------------------- */

  function fmt(zone, date, h12, seconds) { return h12 ? K.time12(zone, date, seconds) : K.time24(zone, date, seconds); }

  function shortTime(zone, date, h12) {
    var p = K.zoneParts(zone, date);
    if (!h12) return pad(p.h) + ':' + pad(p.mi);
    var hh = p.h % 12 || 12;
    return hh + (p.mi ? ':' + pad(p.mi) : '') + (p.h < 12 ? 'am' : 'pm');
  }

  function dayStart(zone, ms) {
    var p = K.zoneParts(zone, new Date(ms));
    return K.zonedToUtc(zone, p.y, p.mo, p.d, 0, 0).getTime();
  }

  function longDay(zone, ms) {
    var p = K.zoneParts(zone, new Date(ms));
    var wd = new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay();
    return DAYS[wd] + ' ' + p.d + ' ' + MONTHS[p.mo - 1] + ' ' + p.y;
  }

  function durLabel(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return (h ? h + ' h' : '') + (h && m ? ' ' : '') + (m ? m + ' min' : '') || '0 min';
  }

  /* "+5 h", "−3 h 30", "same time" relative to home. */
  function relLabel(zone, home, date) {
    var d = K.zoneOffset(zone, date) - K.zoneOffset(home, date);
    if (!d) return 'same time';
    var a = Math.abs(d);
    return (d > 0 ? '+' : '−') + Math.floor(a / 60) + (a % 60 ? ':' + pad(a % 60) : '') + ' h';
  }

  function zoneOptions(places) {
    var sel = el('select');
    var mine = el('optgroup', { label: 'Your places' });
    places.forEach(function (z) { mine.appendChild(el('option', { value: z, text: placeName(z) + ' (' + abbr(z, new Date()) + ')' })); });
    var rest = el('optgroup', { label: 'All time zones' });
    ALL_ZONES.forEach(function (z) { if (places.indexOf(z) < 0) rest.appendChild(el('option', { value: z, text: z.replace(/_/g, ' ') })); });
    sel.append(mine, rest);
    return sel;
  }

  var datalistId = 'tz-place-list';
  function placeDatalist() {
    if (document.getElementById(datalistId)) return null;
    var list = el('datalist', { id: datalistId });
    var seen = {};
    Object.keys(KNOWN).forEach(function (z) {
      if (!K.zoneExists(z)) return;
      seen[z] = 1;
      list.appendChild(el('option', { value: KNOWN[z].name + ' — ' + z }));
    });
    ALL_ZONES.forEach(function (z) { if (!seen[z]) list.appendChild(el('option', { value: placeName(z) + ' — ' + z })); });
    return list;
  }

  /* --- the planner ------------------------------------------------------------------ */

  Tools.register({
    id: 'timezone-converter', category: 'time', name: 'Time Zone Converter',
    description: 'Plan a meeting across time zones: drag across the hours to see the time in every place, or convert one exact time.',
    keywords: ['timezone', 'time zone', 'convert', 'world', 'utc', 'gmt', 'meeting', 'multi-timezone converter',
      'multiple time zones', 'meeting planner', 'world time buddy', 'time difference', 'schedule across time zones'],
    remember: false,
    render: function (root, params) {
      root.classList.add('g-time', 'g-tz');
      var P = prefs();
      var step = P.step;

      var whenInput = el('input', { type: 'datetime-local' });
      var when = U.field('Date & Time', whenInput);
      var fromSelect = zoneOptions(P.places);
      fromSelect.value = P.home;
      var from = U.field('From Timezone', fromSelect);
      var h12 = U.checkbox('12-hour clock', { checked: P.h12 });
      var stepChips = U.chips([{ value: '60', label: '1 hour' }, { value: '30', label: '30 min' }, { value: '15', label: '15 min' }],
        function (v) { step = +v; savePrefs({ step: step }); }, String(step));
      stepChips.setAttribute('aria-label', 'Snap to');
      var hoursOpts = []; for (var hh = 0; hh <= 24; hh++) hoursOpts.push({ value: String(hh), label: pad(hh) + ':00' });
      var workFrom = U.select({ label: 'Working hours from', options: hoursOpts.slice(0, 24), value: String(P.work[0]) });
      var workTo = U.select({ label: 'to', options: hoursOpts.slice(1), value: String(P.work[1]) });
      var status = U.note('');

      /* The pick: an instant and a length in minutes. */
      var sel = { start: 0, dur: 60 };
      var T0 = 0;

      function setFieldFromSel() {
        var p = K.zoneParts(fromSelect.value, new Date(sel.start));
        whenInput.value = pad(p.y, 4) + '-' + pad(p.mo) + '-' + pad(p.d) + 'T' + pad(p.h) + ':' + pad(p.mi);
      }
      function selFromField() {
        var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(whenInput.value);
        if (!m) return false;
        sel.start = K.zonedToUtc(fromSelect.value, +m[1], +m[2], +m[3], +m[4], +m[5]).getTime();
        return true;
      }

      /* Start on the next whole hour in the From zone, an hour long. */
      (function () {
        var now = new Date();
        var p = K.zoneParts(fromSelect.value, now);
        sel.start = K.zonedToUtc(fromSelect.value, p.y, p.mo, p.d, p.h, 0).getTime() + (p.mi ? 3600000 : 0);
        sel.dur = 60;
        setFieldFromSel();
      })();

      /* Something pasted on the home page, like "3pm PST". */
      var hand = U.pendingHandoff && U.pendingHandoff();
      if (hand && hand.text && !hand.taken && window.Discover && Discover.values) {
        var v = Discover.values(hand.text.trim());
        var z = v.zone && (ABBR_ZONES[v.zone.toLowerCase()] || findZone(v.zone));
        if (v.time && z) {
          if (!fromSelect.querySelector('option[value="' + z + '"]')) fromSelect.appendChild(el('option', { value: z, text: z }));
          fromSelect.value = z;
          var today = K.zoneParts(z, new Date());
          whenInput.value = (v.date || (pad(today.y, 4) + '-' + pad(today.mo) + '-' + pad(today.d))) + 'T' + v.time;
          selFromField();
          hand.taken = true;
        }
      }
      if (params && params.zones) {
        var fromLink = String(params.zones).split(',').filter(K.zoneExists);
        if (fromLink.length) { P.places = fromLink; }
      }
      if (params && params.at && !isNaN(+params.at)) { sel.start = +params.at; setFieldFromSel(); }
      if (params && params.dur && +params.dur > 0) sel.dur = Math.min(1440, +params.dur);

      /* Planner DOM. */
      var dayTitle = el('strong');
      var prevDay = U.button('‹', function () { shiftDays(-1); }, 'ghost');
      var nextDay = U.button('›', function () { shiftDays(1); }, 'ghost');
      prevDay.setAttribute('aria-label', 'Previous day');
      nextDay.setAttribute('aria-label', 'Next day');
      var todayBtn = U.button('Today', function () {
        var now = Date.now();
        var p = K.zoneParts(P.home, new Date(now));
        sel.start = K.zonedToUtc(P.home, p.y, p.mo, p.d, p.h, 0).getTime() + (p.mi ? 3600000 : 0);
        setFieldFromSel(); drawAll();
      }, 'ghost');
      var head = el('div', { class: 'tzp-head' }, prevDay, dayTitle, nextDay, todayBtn,
        el('span', { class: 'muted', text: 'Drag across the hours to pick a meeting time.' }));

      var rows = el('div', { class: 'tzp-rows', tabIndex: 0, role: 'application', 'aria-label': 'Meeting planner. Left and right move the meeting; with Shift they change its length.' });
      var overlay = el('div', { class: 'tzp-overlay' });
      var nowLine = el('div', { class: 'tzp-nowline', title: 'Now' });
      var hoverLine = el('div', { class: 'tzp-hover' });
      var selTag = el('span', { class: 'tzp-sel-tag' });
      var selBox = el('div', { class: 'tzp-sel' }, el('div', { class: 'tzp-sel-h tzp-sel-l' }), el('div', { class: 'tzp-sel-h tzp-sel-r' }), selTag);
      overlay.append(nowLine, hoverLine, selBox);
      var legend = el('div', { class: 'tzp-legend' },
        el('span', {}, el('i', { style: { background: 'color-mix(in srgb, var(--ok) 16%, var(--bg-elev))' } }), 'Working hours'),
        el('span', {}, el('i', { style: { background: 'color-mix(in srgb, var(--fg) 5%, var(--bg-elev))' } }), 'Early or late'),
        el('span', {}, el('i', { style: { background: 'color-mix(in srgb, var(--fg) 13%, var(--bg-elev))' } }), 'Night (22:00 to 06:00)'),
        el('span', {}, el('i', { style: { background: 'var(--err)', border: '0', width: '3px' } }), 'Now'));

      var addInput = el('input', { type: 'search', placeholder: 'City, country zone, EST or UTC+9', list: datalistId, 'aria-label': 'Add a place' });
      var addField = U.field('Add a place', addInput);
      addField.classList.add('tzp-place');
      workFrom.classList.add('tzp-work'); workTo.classList.add('tzp-work');
      var addBtn = U.button('Add', function () { addFromInput(); }, 'primary');
      addInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addFromInput(); } });
      addInput.addEventListener('change', function () { if (findZone(addInput.value) && /—/.test(addInput.value)) addFromInput(); });
      var chipWrap = el('div', { class: 'chips', 'data-remember': 'off' });
      K.TZ21.forEach(function (z) {
        var chip = el('button', { class: 'chip', type: 'button', dataset: { zone: z[0] }, onclick: function () {
          var i = P.places.indexOf(z[0]);
          if (i > -1) { if (z[0] !== P.home) P.places.splice(i, 1); }
          else P.places.push(z[0]);
          savePlaces();
        } }, z[1]);
        chipWrap.appendChild(chip);
      });

      var summary = el('div', { class: 'tzp-sum' });
      var cards = el('div', { class: 'cards' });

      function savePlaces() {
        savePrefs({ places: P.places.slice(), home: P.home });
        rebuildFrom();
        drawAll();
      }

      function rebuildFrom() {
        var cur = fromSelect.value;
        var fresh = zoneOptions(P.places);
        fromSelect.replaceChildren.apply(fromSelect, Array.prototype.slice.call(fresh.childNodes));
        fromSelect.value = cur;
        if (fromSelect.value !== cur) { fromSelect.appendChild(el('option', { value: cur, text: cur })); fromSelect.value = cur; }
      }

      function addFromInput() {
        var z = findZone(addInput.value);
        if (!z) { U.toast('No time zone matches “' + addInput.value + '”. Try a city, an IANA name like Asia/Kathmandu, or UTC+5:45.', 'err'); return; }
        if (P.places.indexOf(z) < 0) P.places.push(z);
        addInput.value = '';
        savePlaces();
        U.toast(placeName(z) + ' added');
      }

      function shiftDays(n) { sel.start += n * 86400000; setFieldFromSel(); drawAll(); }

      /* --- drawing --- */

      function cellClass(h) {
        var w0 = +P.work[0], w1 = +P.work[1];
        if (h >= w0 && h < w1) return 'work';
        if (h < 6 || h >= 22) return 'night';
        if (h < 8 || h >= 19) return 'edge';
        return 'day';
      }

      function drawRows() {
        T0 = dayStart(P.home, sel.start);
        dayTitle.textContent = longDay(P.home, T0);
        var now = new Date();
        var parts = [];
        P.places.forEach(function (zone, index) {
          var isHome = zone === P.home;
          var info = el('div', { class: 'tzp-info', dataset: { zone: zone } },
            el('span', { class: 'tzp-grip', title: 'Drag to reorder', draggable: 'true', 'aria-hidden': 'true' }, '⠿'),
            el('div', { class: 'tzp-text' },
              el('span', { class: 'tzp-name', text: (flagOf(zone) ? flagOf(zone) + ' ' : '') + placeName(zone) }),
              el('span', { class: 'tzp-sub', text: abbr(zone, new Date(T0 + 12 * 3600000)) + (isHome ? '' : ' · ' + relLabel(zone, P.home, new Date(T0 + 12 * 3600000))) })),
            isHome ? el('span', { class: 'tzp-homebadge', title: 'Your home time zone: the hours are laid out on its day' }, 'Home')
              : el('button', { class: 'tzp-btn tzp-hide', type: 'button', title: 'Make this home', 'aria-label': 'Make ' + placeName(zone) + ' home', onclick: function () {
                P.home = zone; savePrefs({ home: zone }); rebuildFrom(); drawAll(); } }, '⌂'),
            el('div', { class: 'tzp-now', title: 'Time there now' },
              el('b', { class: 'tzp-clock', text: shortTime(zone, now, P.h12) }),
              el('span', { text: K.shortDay(zone, now) })),
            isHome ? el('span', { class: 'tzp-btn', style: { visibility: 'hidden' } }, '×')
              : el('button', { class: 'tzp-btn tzp-hide', type: 'button', title: 'Remove', 'aria-label': 'Remove ' + placeName(zone), onclick: function () {
                P.places.splice(P.places.indexOf(zone), 1); savePlaces(); } }, '×'));
          var line = el('div', { class: 'tzp-line', dataset: { zone: zone } });
          var prevDay = null;
          for (var i = 0; i < 24; i++) {
            var at = new Date(T0 + i * 3600000);
            var p = K.zoneParts(zone, at);
            var cell = el('div', { class: 'tzp-cell ' + cellClass(p.h), title: placeName(zone) + ': ' + K.shortDay(zone, at) + ', ' + fmt(zone, at, P.h12) });
            /* The cell where the date changes there (for half-hour zones
               that's 00:30, not 00:00). */
            var newDay = i === 0 ? p.h === 0 : p.d !== prevDay;
            prevDay = p.d;
            if (newDay) {
              var wd = new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay();
              cell.classList.add('daystart');
              cell.append(el('small', { text: DAYS[wd].slice(0, 3) }), String(p.d));
            } else if (P.h12) {
              cell.append(String(p.h % 12 || 12) + (p.mi ? ':' + pad(p.mi) : ''), el('small', { text: p.h < 12 ? 'am' : 'pm' }));
            } else {
              cell.append(String(p.h), el('small', { text: p.mi ? ':' + pad(p.mi) : '' }));
            }
            line.appendChild(cell);
          }
          var row = [info, line];
          info.classList.add('tzp-row'); line.classList.add('tzp-row');
          if (isHome) { info.classList.add('tzp-row-home'); }
          wireReorder(info, index);
          parts.push(row);
        });
        rows.replaceChildren.apply(rows, [].concat.apply([], parts).concat([overlay]));
        Array.prototype.forEach.call(chipWrap.children, function (c) { c.classList.toggle('on', P.places.indexOf(c.dataset.zone) > -1); });
      }

      function drawOverlay() {
        var a = (sel.start - T0) / 60000, b = a + sel.dur;
        var ca = Math.max(0, a), cb = Math.min(1440, b);
        if (cb <= ca) selBox.style.display = 'none';
        else {
          selBox.style.display = '';
          selBox.style.left = (ca / 1440 * 100) + '%';
          selBox.style.width = ((cb - ca) / 1440 * 100) + '%';
        }
        selTag.textContent = shortTime(P.home, new Date(sel.start), P.h12) + '–' + shortTime(P.home, new Date(sel.start + sel.dur * 60000), P.h12) + ' · ' + durLabel(sel.dur);
        var nowM = (Date.now() - T0) / 60000;
        nowLine.style.display = nowM >= 0 && nowM < 1440 ? '' : 'none';
        nowLine.style.left = (nowM / 1440 * 100) + '%';
      }

      function drawResults() {
        var start = new Date(sel.start), end = new Date(sel.start + sel.dur * 60000);
        var zone = fromSelect.value;
        status.textContent = K.time24(zone, start) + ' in ' + placeName(zone) + ' (' + K.offsetDecimal(K.zoneOffset(zone, start)) + ') is ' +
          start.toISOString().slice(11, 16) + ' UTC.';
        var list = el('div', { class: 'tzp-sum-list' });
        P.places.forEach(function (z) {
          var ps = K.zoneParts(z, start), pe = K.zoneParts(z, new Date(end - 1));
          var odd = ps.h < 7 || ps.h >= 21 || pe.h < 7 || pe.h >= 21;
          list.append(el('span', { text: (flagOf(z) ? flagOf(z) + ' ' : '') + placeName(z) }),
            el('span', { class: odd ? 'bad' : '' }, K.shortDay(z, start) + ', ' + shortTime(z, start, P.h12) + ' – ' + shortTime(z, end, P.h12) +
              (ps.d !== K.zoneParts(z, end).d ? ' (' + K.shortDay(z, end) + ')' : ''),
              el('span', { class: 'off', text: '  ' + abbr(z, start) + (odd ? ' · outside 07:00–21:00' : '') })));
        });
        summary.replaceChildren(
          el('div', {}, el('b', { text: longDay(P.home, sel.start) + ', ' + shortTime(P.home, start, P.h12) + '–' + shortTime(P.home, end, P.h12) }),
            ' in ' + placeName(P.home) + ' · ' + durLabel(sel.dur)),
          list,
          U.btnrow(
            U.copyBtn('Copy times', summaryText),
            U.button('Download .ics', downloadIcs),
            el('a', { class: 'btn', href: googleLink(), target: '_blank', rel: 'noopener', text: 'Google Calendar' }),
            U.copyBtn('Copy link', shareLink)));

        cards.replaceChildren();
        P.places.forEach(function (z) {
          cards.appendChild(el('div', { class: 'card', dataset: { zone: z } },
            el('h4', { text: placeName(z) + ' (' + abbr(z, start) + ')' }),
            el('div', { class: 'mid tz-time', text: P.h12 ? K.time12(z, start) : K.time24(z, start) }),
            el('div', { class: 'muted', text: K.shortDay(z, start) }),
            el('div', { class: 'muted', text: K.offsetDecimal(K.zoneOffset(z, start)) })));
        });
      }

      function drawAll() { drawRows(); drawOverlay(); drawResults(); }

      function summaryText() {
        var start = new Date(sel.start), end = new Date(sel.start + sel.dur * 60000);
        return ['Meeting: ' + durLabel(sel.dur)].concat(P.places.map(function (z) {
          return placeName(z) + ': ' + K.shortDay(z, start) + ', ' + shortTime(z, start, P.h12) + ' – ' + shortTime(z, end, P.h12) + ' ' + abbr(z, start);
        })).join('\n');
      }

      function isoMinute(ms) { return new Date(ms).toISOString().slice(0, 16); }

      function downloadIcs() {
        var ics = K.buildIcs ? K.buildIcs({ title: 'Meeting', tz: 'UTC', start: isoMinute(sel.start), end: isoMinute(sel.start + sel.dur * 60000),
          description: summaryText(), reminder: -1 }) : null;
        if (!ics) return U.toast('The calendar file builder isn’t loaded.', 'err');
        U.saveText('meeting.ics', ics, 'text/calendar');
      }

      function googleLink() {
        var f = function (ms) { return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''); };
        return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Meeting&dates=' + f(sel.start) + '/' + f(sel.start + sel.dur * 60000) +
          '&details=' + encodeURIComponent(summaryText());
      }

      function shareLink() {
        return location.href.replace(/#.*$/, '') + '#/t/timezone-converter?zones=' + encodeURIComponent(P.places.join(',')) +
          '&at=' + sel.start + '&dur=' + sel.dur;
      }

      /* --- dragging a meeting --- */

      function minuteAt(clientX) {
        var line = rows.querySelector('.tzp-line');
        var r = line.getBoundingClientRect();
        return Math.max(0, Math.min(1440, (clientX - r.left) / r.width * 1440));
      }

      var drag = null;
      rows.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        var onSel = e.target.closest('.tzp-sel');
        var onLine = e.target.closest('.tzp-line');
        if (!onSel && !onLine) return;
        e.preventDefault();
        rows.focus({ preventScroll: true });
        var m = minuteAt(e.clientX);
        var a = (sel.start - T0) / 60000;
        if (onSel) {
          var mode = e.target.classList.contains('tzp-sel-l') ? 'left' : e.target.classList.contains('tzp-sel-r') ? 'right' : 'move';
          drag = { mode: mode, offset: m - a, a: a, b: a + sel.dur };
          selBox.classList.add('dragging');
        } else {
          var anchor = Math.floor(m / step) * step;
          drag = { mode: 'new', anchor: anchor };
          sel.start = T0 + anchor * 60000; sel.dur = step;
        }
        rows.setPointerCapture(e.pointerId);
        drawOverlay();
      });
      rows.addEventListener('pointermove', function (e) {
        var line = rows.querySelector('.tzp-line');
        if (!drag) {
          if (!line || !e.target.closest('.tzp-line, .tzp-sel')) { hoverLine.style.display = 'none'; return; }
          hoverLine.style.display = '';
          hoverLine.style.left = (minuteAt(e.clientX) / 1440 * 100) + '%';
          return;
        }
        var m = minuteAt(e.clientX);
        var a, b;
        if (drag.mode === 'new') {
          if (m >= drag.anchor) { a = drag.anchor; b = Math.max(drag.anchor + step, Math.ceil(m / step) * step); }
          else { a = Math.floor(m / step) * step; b = drag.anchor + step; }
        } else if (drag.mode === 'move') {
          var len = drag.b - drag.a;
          a = Math.round((m - drag.offset) / step) * step;
          a = Math.max(0, Math.min(1440 - len, a)); b = a + len;
        } else if (drag.mode === 'left') {
          a = Math.min(Math.round(m / step) * step, drag.b - step); b = drag.b;
        } else {
          a = drag.a; b = Math.max(Math.round(m / step) * step, drag.a + step);
        }
        sel.start = T0 + a * 60000; sel.dur = Math.min(1440, b - a);
        drawOverlay();
      });
      function endDrag() {
        if (!drag) return;
        drag = null;
        selBox.classList.remove('dragging');
        setFieldFromSel();
        drawResults();
      }
      rows.addEventListener('pointerup', endDrag);
      rows.addEventListener('pointercancel', endDrag);
      rows.addEventListener('pointerleave', function () { if (!drag) hoverLine.style.display = 'none'; });
      rows.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        var d = (e.key === 'ArrowLeft' ? -1 : 1) * step;
        if (e.shiftKey) sel.dur = Math.max(step, Math.min(1440, sel.dur + d));
        else sel.start += d * 60000;
        setFieldFromSel();
        if (dayStart(P.home, sel.start) !== T0) drawAll(); else { drawOverlay(); drawResults(); }
      });

      /* --- reordering places --- */
      var dragIndex = -1;
      function wireReorder(info, index) {
        var grip = info.querySelector('.tzp-grip');
        grip.addEventListener('dragstart', function (e) { dragIndex = index; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', P.places[index]); });
        info.addEventListener('dragover', function (e) { if (dragIndex < 0) return; e.preventDefault(); info.classList.add('tzp-drop-before'); });
        info.addEventListener('dragleave', function () { info.classList.remove('tzp-drop-before'); });
        info.addEventListener('drop', function (e) {
          e.preventDefault();
          info.classList.remove('tzp-drop-before');
          if (dragIndex < 0 || dragIndex === index) return;
          var z = P.places.splice(dragIndex, 1)[0];
          P.places.splice(index > dragIndex ? index - 1 : index, 0, z);
          dragIndex = -1;
          savePlaces();
        });
        grip.addEventListener('dragend', function () { dragIndex = -1; });
      }

      /* --- the form fields --- */

      whenInput.addEventListener('input', function () { if (selFromField()) drawAll(); });
      whenInput.addEventListener('change', function () { if (selFromField()) drawAll(); });
      fromSelect.addEventListener('change', function () { if (selFromField()) drawAll(); });
      h12.input.addEventListener('change', function () { P.h12 = h12.input.checked; savePrefs({ h12: P.h12 }); drawAll(); });
      [workFrom, workTo].forEach(function (f) {
        f.querySelector('select').addEventListener('change', function () {
          var a = +workFrom.querySelector('select').value, b = +workTo.querySelector('select').value;
          if (b <= a) b = Math.min(24, a + 1);
          P.work = [a, b];
          savePrefs({ work: P.work });
          drawAll();
        });
      });
      var nowBtn = U.button('Now', function () {
        var p = K.zoneParts(fromSelect.value, new Date());
        whenInput.value = pad(p.y, 4) + '-' + pad(p.mo) + '-' + pad(p.d) + 'T' + pad(p.h) + ':' + pad(p.mi);
        selFromField(); drawAll();
      });

      var tick = setInterval(function () {
        var now = new Date();
        rows.querySelectorAll('.tzp-info').forEach(function (info) {
          var z = info.dataset.zone;
          info.querySelector('.tzp-clock').textContent = shortTime(z, now, P.h12);
        });
        drawOverlay();
      }, 15000);
      U.onTeardown(root, function () { clearInterval(tick); });

      var list = placeDatalist();
      root.appendChild(U.panel(null,
        U.row(when, from, nowBtn, h12), status));
      root.appendChild(U.panel(null, head,
        el('div', { class: 'tzp-scroll' }, rows), legend,
        el('div', { class: 'tzp-add' }, addField, addBtn, el('span', { class: 'muted', text: 'Snap to' }), stepChips, workFrom, workTo),
        el('p', { class: 'muted', style: { margin: '10px 0 4px', fontSize: '13px' }, text: 'Popular places' }), chipWrap, list));
      root.appendChild(U.panel('Meeting time', summary));
      root.appendChild(U.panel('At the start time', cards));
      drawAll();
    }
  });

  /* --- the world clock ---------------------------------------------------------------- */

  function noDst(zone, now) {
    var y = now.getUTCFullYear();
    var a = K.zoneOffset(zone, new Date(Date.UTC(y, 0, 15))), b = K.zoneOffset(zone, new Date(Date.UTC(y, 6, 15)));
    return a === b ? a : null;
  }

  Tools.register({
    id: 'world-clock', category: 'time', name: 'World Clock',
    description: 'Live clocks for your places and cities around the world, with the difference from your own time.',
    keywords: ['time', 'world', 'timezone', 'world clock', 'current time', 'cities', 'time difference'],
    remember: false,
    render: function (root) {
      root.classList.add('g-time', 'g-tz');
      var P = prefs();
      var search = U.input({ type: 'search', placeholder: 'Search cities, or an offset like UTC+1...' });
      var h24 = U.checkbox('24-hour clock', { checked: !P.h12 });
      var mineWrap = el('div', { class: 'wc-group' });
      var mineGrid = el('div', { class: 'cards' });
      var grid = el('div', { class: 'cards' });
      var all = K.CITIES.concat(K.MORE_CITIES).filter(function (c) { return K.zoneExists(c[2]); });

      function card(c, now, mine) {
        var zone = c[2];
        var off = K.zoneOffset(zone, now);
        var offText = K.offsetClock(off);
        var hour = K.zoneParts(zone, now).h;
        var sub;
        if (zone === 'UTC') sub = c[3] || 'Coordinated Universal Time';
        else if (noDst(zone, now) === 0) sub = 'UTC all year, no daylight saving';
        else sub = hour >= 6 && hour < 18 ? '☀️ Day' : '🌙 Night';
        var isMine = P.places.indexOf(zone) > -1;
        var isHome = zone === P.home;
        return el('div', { class: 'card' + (mine ? ' wc-mine' : '') + (mine && isHome ? ' wc-home' : ''), dataset: { zone: zone } },
          el('button', { class: 'wc-star' + (isMine ? ' on' : ''), type: 'button', title: isHome ? 'Your home time zone' : isMine ? 'Remove from your places' : 'Add to your places',
            'aria-label': (isMine ? 'Remove ' : 'Add ') + c[1] + (isMine ? ' from' : ' to') + ' your places', disabled: isHome, onclick: function () {
              var i = P.places.indexOf(zone);
              if (i > -1) P.places.splice(i, 1); else P.places.push(zone);
              savePrefs({ places: P.places.slice(), home: P.home });
              draw();
            } }, isHome ? '⌂' : isMine ? '★' : '☆'),
          el('h4', el('span', { text: (c[0] ? c[0] + ' ' : '') }), zone === 'UTC' ? 'UTC' : c[1] + ' · ' + offText),
          el('div', { class: 'mid wc-time', text: h24.input.checked ? K.time24(zone, now, true) : K.time12(zone, now, true) }),
          el('div', { class: 'muted', text: K.shortDay(zone, now) }),
          mine ? el('div', { class: 'wc-rel', text: isHome ? 'Home' : relLabel(zone, P.home, now) + ' from ' + placeName(P.home) }) : null,
          el('div', { class: 'daynight muted', text: sub }));
      }

      function draw() {
        var now = new Date();
        var q = String(search.value).trim().toLowerCase().replace(/\s+/g, '');
        /* A search shows only matching cities; otherwise your places come first. */
        minePanel.hidden = !!q;
        mineGrid.replaceChildren.apply(mineGrid, q ? [] : P.places.map(function (z) {
          var known = all.filter(function (c) { return c[2] === z; })[0];
          return card(known || [flagOf(z), placeName(z), z], now, true);
        }));
        var list = q ? all : K.CITIES;
        grid.replaceChildren();
        list.forEach(function (c) {
          var offText = K.offsetClock(K.zoneOffset(c[2], now));
          if (q) {
            var hay = (c[1] + ' ' + c[2] + ' ' + offText + ' ' + (c[3] || '')).toLowerCase().replace(/\s+/g, '');
            var qq = q.replace(/^gmt/, 'utc');
            if (hay.indexOf(qq) === -1 && offText.toLowerCase() !== qq) return;
          }
          grid.appendChild(card(c, now, false));
        });
        if (q && !grid.children.length) {
          var z = findZone(q);
          grid.appendChild(z ? card([flagOf(z), placeName(z), z], now, false) : U.note('No city matches that search.'));
        }
      }
      var minePanel = U.panel('Your places', mineWrap);
      draw();
      var timer = setInterval(draw, 1000);
      U.onTeardown(root, function () { clearInterval(timer); });
      U.live([search], draw);
      h24.input.addEventListener('change', function () { P.h12 = !h24.input.checked; savePrefs({ h12: P.h12 }); draw(); });
      mineWrap.append(mineGrid,
        el('p', { class: 'muted', style: { fontSize: '13px', margin: '8px 0 0' }, text: 'Star a city to add it. The same places appear in the Time Zone Converter. Kept in this browser.' }));
      root.appendChild(U.panel(null, U.row(el('div', { class: 'grow' }, search), h24),
        U.note('Your time zone: ' + HOME + (P.home !== HOME ? ' (home is set to ' + placeName(P.home) + ')' : ''))));
      root.appendChild(minePanel);
      root.appendChild(U.panel('Cities around the world', grid));
    }
  });
})();
