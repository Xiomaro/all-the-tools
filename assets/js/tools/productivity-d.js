/* productivity-d tools: a habit tracker and reusable checklists. Like the
   rest of Productivity, everything stays in this browser's localStorage (the
   same "att:" namespace), with JSON export and import to move it elsewhere.
   Both keep working in memory when storage is blocked. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-prodd-style')) {
    document.head.appendChild(el('style', { id: 'g-prodd-style', text: [
      '.g-prodd .muted { color: var(--fg-muted); font-size: 13px; }',
      '.g-prodd .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }',
      '.g-prodd .toolbar .grow { flex: 1 1 160px; min-width: 0; }',
      '.g-prodd .toolbar > select { width: auto; max-width: 100%; }',
      '.g-prodd .filebtn { display: inline-flex; }',
      '.g-prodd .btn.armed { background: var(--err); border-color: var(--err); color: #fff; }',
      '.g-prodd details > summary { cursor: pointer; font-weight: 600; color: var(--fg-muted); }',
      '.g-prodd details[open] > summary { margin-bottom: 10px; }',
      '.g-prodd .undo-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 8px 12px; border-radius: var(--radius-s); background: var(--fg); color: var(--bg); }',
      '.g-prodd .undo-bar .grow { flex: 1 1 160px; }',
      '.g-prodd .undo-bar .btn { background: var(--bg); color: var(--fg); padding: 4px 12px; }',
      /* habits */
      '.g-prodd .hb-form { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; }',
      '.g-prodd .hb-form .f-name { flex: 1 1 200px; }',
      '.g-prodd .hb-form .f-emoji { flex: 0 0 78px; }',
      '.g-prodd .hb-form .f-colour { flex: 0 0 64px; }',
      '.g-prodd .hb-form .f-colour input { width: 100%; height: 38px; padding: 2px; cursor: pointer; }',
      '.g-prodd .hb-form .f-target { flex: 0 1 180px; }',
      '.g-prodd .hb-list { display: flex; flex-direction: column; gap: 10px; }',
      '.g-prodd .hb-card { border: 1px solid var(--border); border-left: 5px solid var(--hb); border-radius: var(--radius); background: var(--bg-elev); padding: 10px 12px; display: flex; flex-direction: column; gap: 9px; min-width: 0; }',
      '.g-prodd .hb-head { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: baseline; }',
      '.g-prodd .hb-title { flex: 1 1 200px; min-width: 0; font-weight: 700; overflow-wrap: anywhere; }',
      '.g-prodd .hb-title small { font-weight: 400; color: var(--fg-muted); margin-left: 6px; font-size: 13px; }',
      '.g-prodd .hb-stats { display: flex; flex-wrap: wrap; gap: 3px 14px; font-size: 13px; color: var(--fg-muted); }',
      '.g-prodd .hb-stats b { color: var(--fg); font-variant-numeric: tabular-nums; }',
      '.g-prodd .hb-week, .g-prodd .hb-month { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }',
      '.g-prodd .hb-month { max-width: 560px; }',
      '.g-prodd .hb-dow { text-align: center; font-size: 12px; font-weight: 600; color: var(--fg-muted); }',
      '.g-prodd .hb-day { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; min-height: 54px; padding: 5px 2px; border: 1px solid var(--border); border-radius: var(--radius-s); background: var(--bg); color: var(--fg); font: inherit; font-size: 12px; cursor: pointer; }',
      '.g-prodd .hb-month .hb-day { min-height: 46px; }',
      '.g-prodd .hb-day b { font-size: 15px; font-variant-numeric: tabular-nums; }',
      '.g-prodd .hb-day .tk { height: 16px; line-height: 16px; font-size: 14px; }',
      '.g-prodd .hb-day:hover:not(:disabled) { border-color: var(--hb); }',
      '.g-prodd .hb-day[aria-pressed="true"] { background: var(--hb); border-color: var(--hb); color: #fff; }',
      '.g-prodd .hb-day.today { box-shadow: 0 0 0 2px var(--accent); }',
      '.g-prodd .hb-day:disabled { opacity: .38; cursor: default; }',
      '.g-prodd .hb-day:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }',
      '.g-prodd .hb-actions { display: flex; flex-wrap: wrap; gap: 6px; }',
      '.g-prodd .hb-actions .btn, .g-prodd .cl-btns .btn, .g-prodd .hb-arch .btn { padding: 3px 10px; font-size: 13px; }',
      '.g-prodd .hb-heat { display: grid; grid-template-rows: repeat(7, 12px); grid-auto-flow: column; grid-auto-columns: 12px; gap: 3px; overflow-x: auto; padding: 2px 2px 6px; }',
      '.g-prodd .hb-heat i { display: block; width: 12px; height: 12px; border-radius: 3px; background: var(--bg-sunken); border: 1px solid var(--border); box-sizing: border-box; }',
      '.g-prodd .hb-heat i.on { background: var(--hb); border-color: var(--hb); }',
      '.g-prodd .hb-heat i.today { outline: 1px solid var(--fg); }',
      '.g-prodd .hb-heat i.future { visibility: hidden; }',
      '.g-prodd .hb-arch { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; padding: 6px 0; border-bottom: 1px solid var(--border); }',
      '.g-prodd .hb-arch > span { flex: 1 1 160px; min-width: 0; overflow-wrap: anywhere; }',
      /* checklists */
      '.g-prodd .cl-progress { display: flex; flex-direction: column; gap: 6px; }',
      '.g-prodd .cl-bar { height: 10px; border-radius: 999px; background: var(--bg-sunken); border: 1px solid var(--border); overflow: hidden; }',
      '.g-prodd .cl-bar i { display: block; height: 100%; width: 0; background: var(--ok); transition: width .2s; }',
      '.g-prodd .cl-items { display: flex; flex-direction: column; }',
      '.g-prodd .cl-row { display: flex; align-items: center; gap: 8px; padding: 7px 2px; border-bottom: 1px solid var(--border); }',
      '.g-prodd .cl-row input[type=checkbox] { width: 20px; height: 20px; margin: 0; accent-color: var(--accent); flex: none; cursor: pointer; }',
      '.g-prodd .cl-text { flex: 1 1 0; min-width: 0; overflow-wrap: anywhere; cursor: pointer; }',
      '.g-prodd .cl-row.done .cl-text { text-decoration: line-through; color: var(--fg-muted); }',
      '.g-prodd .cl-row.heading { padding-top: 16px; border-bottom: 2px solid var(--border); }',
      '.g-prodd .cl-row.heading .cl-text { font-weight: 700; cursor: default; }',
      '.g-prodd .cl-row.heading .cl-sec { font-size: 12px; font-weight: 600; color: var(--fg-muted); }',
      '.g-prodd .cl-row .cl-edit { flex: 1 1 180px; min-width: 0; }',
      '.g-prodd .cl-btns { display: flex; gap: 2px; margin-left: auto; flex: none; }',
      '@media (max-width: 480px) { .g-prodd .cl-btns .btn { padding: 3px 7px; } }',
      '.g-prodd .cl-add textarea { min-height: 120px; }'
    ].join('\n') }));
  }

  /* --- storage ------------------------------------------------------------ */

  /* Same approach as the other Productivity tools: reads and writes are
     wrapped because storage can be blocked (private windows, strict privacy
     settings) or full, and the tools must still work for the session. */
  function load(key, fallback) {
    try { var s = localStorage.getItem('att:' + key); return s ? JSON.parse(s) : fallback; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem('att:' + key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function storageOk() {
    try { localStorage.setItem('att:probe', '1'); localStorage.removeItem('att:probe'); return true; } catch (e) { return false; }
  }
  var warned = false;
  function warnStorage() {
    if (warned) return;
    warned = true;
    U.toast('Could not save: this browser is blocking storage or it is full. Export a backup to keep your work.', 'err');
  }
  function storageNote(what) {
    return storageOk() ? null : U.note('This browser is blocking storage for this page, so ' + what + ' will be lost when you close the tab. Use Export to keep a copy.', 'err');
  }

  function uid() {
    var b = new Uint8Array(6);
    crypto.getRandomValues(b);
    return Date.now().toString(36) + Array.prototype.map.call(b, function (x) { return (x % 36).toString(36); }).join('');
  }

  function exportJson(filename, tool, payload) {
    var doc = Object.assign({ app: 'All The Tools', tool: tool, version: 1, exported: new Date().toISOString() }, payload);
    U.saveText(filename, JSON.stringify(doc, null, 2), 'application/json');
  }
  function readJsonFile(file) {
    return U.readAs(file, 'text').then(function (text) {
      try { return JSON.parse(String(text).replace(/^﻿/, '')); } catch (e) { throw new Error(file.name + ' is not valid JSON.'); }
    });
  }
  function fileButton(label, accept, onFiles, aria) {
    var input = el('input', {
      type: 'file', accept: accept, style: { display: 'none' }, 'aria-label': aria || label,
      onchange: function () {
        var files = Array.prototype.slice.call(input.files);
        input.value = '';
        if (files.length) onFiles(files);
      }
    });
    return el('span', { class: 'filebtn' }, U.button(label, function () { input.click(); }), input);
  }

  /* A button that asks again inline before doing something permanent. */
  function confirmButton(label, onConfirm, aria) {
    var timer = 0;
    var b = U.button(label, function () {
      if (b.dataset.armed !== '1') {
        b.dataset.armed = '1';
        b.textContent = 'Really delete?';
        b.classList.add('armed');
        timer = setTimeout(reset, 4000);
        return;
      }
      reset();
      onConfirm();
    }, 'ghost');
    function reset() {
      clearTimeout(timer);
      b.dataset.armed = '';
      b.textContent = label;
      b.classList.remove('armed');
    }
    if (aria) b.setAttribute('aria-label', aria);
    return b;
  }

  function undoBar(host, message, onUndo, root) {
    clearTimeout(host._undoTimer);
    var undo = U.button('Undo', function () { clearTimeout(host._undoTimer); host.replaceChildren(); onUndo(); });
    host.replaceChildren(el('div', { class: 'undo-bar', role: 'status' }, el('span', { class: 'grow', text: message }), undo));
    host._undoTimer = setTimeout(function () { host.replaceChildren(); }, 12000);
    if (root && !host._undoHooked) {
      host._undoHooked = true;
      U.onTeardown(root, function () { clearTimeout(host._undoTimer); });
    }
  }

  /* Redraw without losing the keyboard user's place: controls carry a
     data-fk key, and whichever had focus gets it back afterwards. */
  function keepFocus(scope, fn) {
    var a = document.activeElement;
    var key = a && scope.contains(a) && a.dataset ? a.dataset.fk : null;
    fn();
    if (!key) return;
    var again = scope.querySelector('[data-fk="' + key + '"]');
    if (!again) return;
    /* A move button that just became disabled (top or bottom of the list)
       hands focus to its neighbour. */
    if (again.disabled) again = Array.prototype.filter.call(again.parentNode.querySelectorAll('button'), function (b) { return !b.disabled; })[0];
    if (again) again.focus();
  }

  /* --- dates (local time, weeks start on Monday) ------------------------------ */

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function pad2(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function parseYmd(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.getMonth() === +m[2] - 1 ? d : null;
  }
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function mondayOf(d) { return addDays(d, -((d.getDay() + 6) % 7)); }
  function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
  function longDate(d) { return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  function weekLabel(mon) {
    var sun = addDays(mon, 6);
    if (mon.getMonth() === sun.getMonth()) return mon.getDate() + '–' + sun.getDate() + ' ' + MONTHS[mon.getMonth()] + ' ' + mon.getFullYear();
    if (mon.getFullYear() === sun.getFullYear()) return mon.getDate() + ' ' + MONTHS[mon.getMonth()] + ' – ' + sun.getDate() + ' ' + MONTHS[sun.getMonth()] + ' ' + sun.getFullYear();
    return mon.getDate() + ' ' + MONTHS[mon.getMonth()] + ' ' + mon.getFullYear() + ' – ' + sun.getDate() + ' ' + MONTHS[sun.getMonth()] + ' ' + sun.getFullYear();
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function slug(s, fallback) {
    var out = String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
    return out || fallback;
  }

  /* ===================================================================== */
  /* Habit tracker                                                          */
  /* ===================================================================== */

  var COLOURS = ['#4f46e5', '#0284c7', '#16a34a', '#d97706', '#e11d48', '#9333ea', '#0d9488', '#64748b'];
  var TARGETS = [{ value: '7', label: 'Every day' }].concat([6, 5, 4, 3, 2, 1].map(function (n) {
    return { value: String(n), label: plural(n, 'day') + ' a week' };
  }));

  function cleanHabit(h) {
    if (!h || typeof h !== 'object' || h.name === undefined || h.name === null) return null;
    var per = Math.round(+h.perWeek);
    if (!(per >= 1 && per <= 7)) per = 7;
    if (h.target !== 'weekly') per = 7;
    var seen = {};
    var done = (Array.isArray(h.done) ? h.done : []).map(String).filter(function (s) {
      if (seen[s] || !parseYmd(s)) return false;
      seen[s] = 1;
      return true;
    }).sort();
    return {
      id: typeof h.id === 'string' && h.id ? h.id : uid(),
      name: String(h.name).trim().slice(0, 80) || 'Untitled habit',
      emoji: String(h.emoji || '').trim().slice(0, 8),
      colour: /^#[0-9a-f]{6}$/i.test(h.colour || '') ? h.colour.toLowerCase() : COLOURS[0],
      target: per < 7 ? 'weekly' : 'daily',
      perWeek: per,
      done: done,
      archived: !!h.archived,
      created: +h.created || Date.now()
    };
  }
  function cleanHabits(list) { return (Array.isArray(list) ? list : []).map(cleanHabit).filter(Boolean); }

  function hbExample() {
    var t = today(), back = function (n) { return ymd(addDays(t, -n)); };
    return {
      habits: [
        { id: uid(), name: 'Drink 8 glasses of water', emoji: '💧', colour: '#0284c7', target: 'daily', perWeek: 7,
          done: [1, 2, 3, 5, 6, 7, 8, 9, 10, 12, 13].map(back), created: addDays(t, -14).getTime() },
        { id: uid(), name: 'Exercise', emoji: '🏃', colour: '#16a34a', target: 'weekly', perWeek: 3,
          done: [1, 3, 6, 8, 10, 12].map(back), created: addDays(t, -14).getTime() }
      ],
      view: 'week'
    };
  }
  function hbLoad() {
    var raw = load('habits', null);
    if (raw === null || typeof raw !== 'object') { var ex = hbExample(); return { habits: cleanHabits(ex.habits), view: 'week', example: true }; }
    return { habits: cleanHabits(raw.habits), view: raw.view === 'month' ? 'month' : 'week' };
  }

  /* Streaks and the 30-day rate. A daily habit's streak counts days in a
     row; one done N days a week counts weeks (Monday to Sunday) in which it
     hit N. Today, and this week, only add to a streak: not having ticked
     them yet does not break it. */
  function habitStats(h, t) {
    t = t || today();
    var tk = ymd(t), set = {};
    var done = h.done.filter(function (s) { return s <= tk; });
    done.forEach(function (s) { set[s] = 1; });
    var out = { unit: h.target === 'daily' ? 'day' : 'week', current: 0, best: 0, thisWeek: 0 };

    if (h.target === 'daily') {
      var d = set[tk] ? t : addDays(t, -1);
      while (set[ymd(d)]) { out.current++; d = addDays(d, -1); }
      var run = 0, prev = '';
      done.forEach(function (s) {
        run = prev && ymd(addDays(parseYmd(prev), 1)) === s ? run + 1 : 1;
        prev = s;
        if (run > out.best) out.best = run;
      });
    } else {
      var counts = {};
      done.forEach(function (s) { var k = ymd(mondayOf(parseYmd(s))); counts[k] = (counts[k] || 0) + 1; });
      var thisMon = mondayOf(t), n = h.perWeek;
      out.thisWeek = counts[ymd(thisMon)] || 0;
      var w = out.thisWeek >= n ? thisMon : addDays(thisMon, -7);
      while ((counts[ymd(w)] || 0) >= n) { out.current++; w = addDays(w, -7); }
      if (done.length) {
        var r = 0;
        for (var m = mondayOf(parseYmd(done[0])); m <= thisMon; m = addDays(m, 7)) {
          r = (counts[ymd(m)] || 0) >= n ? r + 1 : 0;
          if (r > out.best) out.best = r;
        }
      }
    }

    /* The last 30 days, or fewer for a habit younger than that (from when
       it was added, or its first tick if that is earlier). */
    var created = new Date(h.created); created.setHours(0, 0, 0, 0);
    var start = done.length && parseYmd(done[0]) < created ? parseYmd(done[0]) : created;
    var from = addDays(t, -29);
    if (start > from) from = start;
    if (from > t) from = t;
    var days = daysBetween(from, t) + 1, fk = ymd(from);
    var ticks = done.filter(function (s) { return s >= fk; }).length;
    var expected = days * h.perWeek / 7;
    out.rate = expected ? Math.min(100, Math.round(ticks / expected * 100)) : 0;
    out.days = days;
    out.ticks = ticks;
    return out;
  }

  Tools.register({
    id: 'habit-tracker',
    category: 'productivity',
    name: 'Habit Tracker',
    description: 'Tick off your habits each day and see your current streak, best streak and how often you kept them up over the last 30 days.',
    keywords: ['habit tracker', 'habits', 'habit', 'streak', 'streaks', 'daily habits', 'routine', 'daily routine', 'goals', 'goal tracker',
      'habit calendar', 'habit chart', 'tracker', 'don\'t break the chain', 'seinfeld calendar', 'good habits', 'new year resolutions',
      'resolution tracker', 'self improvement', 'daily checklist', 'weekly goals', 'exercise tracker', 'water tracker', 'heatmap'],
    render: function (root) {
      root.classList.add('g-prodd');
      var data = hbLoad();
      var example = !!data.example;
      delete data.example;
      var t0 = today();
      var ui = { week: mondayOf(t0), month: new Date(t0.getFullYear(), t0.getMonth(), 1), focus: null, editing: null };

      function persist() {
        if (example) { example = false; exampleNote.remove(); }
        if (!save('habits', data)) warnStorage();
      }
      function active() { return data.habits.filter(function (h) { return !h.archived; }); }
      function byId(id) { return data.habits.filter(function (h) { return h.id === id; })[0] || null; }

      /* --- add / edit form ---------------------------------------------------- */
      function habitForm(h, submitLabel, onSubmit, onCancel) {
        var n = uid();
        var name = el('input', { type: 'text', id: 'hbn-' + n, maxLength: 80, value: h ? h.name : '', placeholder: 'e.g. Read for 20 minutes', 'aria-label': 'Habit name' });
        var emoji = el('input', { type: 'text', id: 'hbe-' + n, maxLength: 8, value: h ? h.emoji : '', placeholder: '📚', 'aria-label': 'Emoji (optional)' });
        var colour = el('input', { type: 'color', id: 'hbc-' + n, value: h ? h.colour : COLOURS[data.habits.length % COLOURS.length], 'aria-label': 'Colour' });
        var target = U.select({ id: 'hbt-' + n, options: TARGETS, value: String(h ? h.perWeek : 7), 'aria-label': 'Target' });
        function submit() {
          var nm = name.value.trim();
          if (!nm) { U.toast('Give the habit a name', 'err'); name.focus(); return; }
          var per = +target.value;
          onSubmit({ name: nm.slice(0, 80), emoji: emoji.value.trim().slice(0, 8), colour: colour.value, perWeek: per, target: per < 7 ? 'weekly' : 'daily' });
          if (!h) { name.value = ''; emoji.value = ''; colour.value = COLOURS[data.habits.length % COLOURS.length]; target.value = '7'; }
        }
        [name, emoji].forEach(function (c) {
          c.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); submit(); }
            if (e.key === 'Escape' && onCancel) { e.preventDefault(); onCancel(); }
          });
        });
        var go = U.button(submitLabel, submit, 'primary');
        go.dataset.k = h ? 'hb-save' : 'hb-add';
        var form = el('div', { class: 'hb-form' },
          el('div', { class: 'field f-name' }, el('label', { htmlFor: name.id, text: 'Habit' }), name),
          el('div', { class: 'field f-emoji' }, el('label', { htmlFor: emoji.id, text: 'Emoji' }), emoji),
          el('div', { class: 'field f-colour' }, el('label', { htmlFor: colour.id, text: 'Colour' }), colour),
          el('div', { class: 'field f-target' }, el('label', { htmlFor: target.id, text: 'Target' }), target),
          el('div', { class: 'btnrow' }, go, onCancel ? U.button('Cancel', onCancel, 'ghost') : null));
        form.focusName = function () { name.focus(); };
        return form;
      }

      var addForm = habitForm(null, 'Add habit', function (v) {
        var h = cleanHabit(Object.assign({ id: uid(), done: [], created: Date.now() }, v));
        data.habits.push(h);
        ui.focus = h.id;
        persist(); draw();
        U.toast('Added “' + h.name + '”');
      });
      addForm.classList.add('hb-add');

      /* --- pieces --------------------------------------------------------------- */
      function toggle(h, day) {
        var i = h.done.indexOf(day);
        if (i >= 0) h.done.splice(i, 1); else { h.done.push(day); h.done.sort(); }
        persist(); draw();
      }
      function dayButton(h, d, big) {
        var s = ymd(d), on = h.done.indexOf(s) >= 0, future = d > today(), isToday = s === ymd(today());
        var b = el('button', {
          type: 'button', class: 'hb-day' + (isToday ? ' today' : ''), disabled: future,
          'aria-pressed': on ? 'true' : 'false', 'aria-current': isToday ? 'date' : null,
          'aria-label': h.name + ', ' + longDate(d) + (isToday ? ' (today)' : ''),
          dataset: { day: s, fk: 'd-' + h.id + '-' + s },
          onclick: function () { toggle(h, s); }
        },
        big ? el('span', { text: DOW[(d.getDay() + 6) % 7] }) : null,
        el('b', { text: String(d.getDate()) }),
        el('span', { class: 'tk', 'aria-hidden': 'true', text: on ? '✓' : '' }));
        return b;
      }
      function statsLine(h) {
        var s = habitStats(h);
        var unit = function (n) { return plural(n, s.unit); };
        var line = el('div', { class: 'hb-stats' },
          el('span', {}, 'Streak ', el('b', { dataset: { k: 'hb-current' }, text: String(s.current) }), ' ' + (s.current === 1 ? s.unit : s.unit + 's')),
          el('span', {}, 'Best ', el('b', { dataset: { k: 'hb-best' }, text: String(s.best) }), ' ' + (s.best === 1 ? s.unit : s.unit + 's')),
          el('span', { title: s.ticks + ' ticks in the last ' + plural(s.days, 'day') }, el('b', { dataset: { k: 'hb-rate' }, text: s.rate + '%' }), ' of the last ' + (s.days === 30 ? '30 days' : plural(s.days, 'day'))),
          h.target === 'weekly' ? el('span', {}, 'This week ', el('b', { dataset: { k: 'hb-week' }, text: s.thisWeek + ' of ' + h.perWeek })) : null);
        line.setAttribute('aria-label', h.name + ': current streak ' + unit(s.current) + ', best ' + unit(s.best) + ', ' + s.rate + '% of the last ' + plural(s.days, 'day'));
        return line;
      }
      function titleNode(h) {
        var tgt = h.target === 'daily' ? 'Every day' : plural(h.perWeek, 'day') + ' a week';
        return el('div', { class: 'hb-title' }, h.emoji ? h.emoji + ' ' : '', el('span', { class: 'hb-name', text: h.name }), el('small', { text: tgt }));
      }
      function moveHabit(id, dir) {
        var list = active(), i = -1;
        list.forEach(function (h, k) { if (h.id === id) i = k; });
        var j = i + dir;
        if (i < 0 || j < 0 || j >= list.length) return;
        var a = data.habits.indexOf(list[i]), b = data.habits.indexOf(list[j]);
        data.habits[a] = list[j]; data.habits[b] = list[i];
        persist(); draw();
      }
      function smallBtn(label, aria, fk, fn, disabled) {
        var b = U.button(label, fn, 'ghost');
        b.setAttribute('aria-label', aria);
        b.dataset.fk = fk;
        b.disabled = !!disabled;
        return b;
      }

      function card(h, idx, count) {
        var node = el('article', { class: 'hb-card', dataset: { id: h.id, k: 'hb-card' }, style: { '--hb': h.colour }, 'aria-label': h.name });
        if (ui.editing === h.id) {
          var form = habitForm(h, 'Save', function (v) {
            Object.assign(h, v);
            ui.editing = null;
            persist(); draw();
          }, function () { ui.editing = null; draw(); });
          node.append(el('div', { class: 'hb-head' }, titleNode(h)), form);
          setTimeout(form.focusName, 0);
          return node;
        }
        var week = el('div', { class: 'hb-week', role: 'group', 'aria-label': h.name + ', ' + weekLabel(ui.week) });
        for (var i = 0; i < 7; i++) week.appendChild(dayButton(h, addDays(ui.week, i), true));
        var del = confirmButton('Delete', function () {
          data.habits = data.habits.filter(function (x) { return x !== h; });
          persist(); draw();
          U.toast('Deleted “' + h.name + '”');
        }, 'Delete ' + h.name);
        del.dataset.fk = 'del-' + h.id;
        node.append(
          el('div', { class: 'hb-head' }, titleNode(h), statsLine(h)),
          week,
          el('div', { class: 'hb-actions' },
            smallBtn('Edit', 'Edit ' + h.name, 'ed-' + h.id, function () { ui.editing = h.id; draw(); }),
            smallBtn('↑', 'Move ' + h.name + ' up', 'up-' + h.id, function () { moveHabit(h.id, -1); }, idx === 0),
            smallBtn('↓', 'Move ' + h.name + ' down', 'dn-' + h.id, function () { moveHabit(h.id, 1); }, idx === count - 1),
            smallBtn('Archive', 'Archive ' + h.name, 'ar-' + h.id, function () {
              h.archived = true;
              persist(); draw();
              U.toast('Archived “' + h.name + '”. Find it under Archived habits.');
            }),
            del));
        return node;
      }

      /* --- views ------------------------------------------------------------------ */
      var viewChips = U.chips([{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }], function (v) {
        data.view = v;
        if (!example) persist();
        draw();
      }, data.view);
      var navLabel = el('b', { dataset: { k: 'hb-range' }, 'aria-live': 'polite' });
      var prevBtn = U.button('◀', function () { step(-1); }, 'ghost');
      var nowBtn = U.button('This week', function () { step(0); }, 'ghost');
      var nextBtn = U.button('▶', function () { step(1); }, 'ghost');
      function step(dir) {
        var t = today();
        if (data.view === 'week') ui.week = dir ? addDays(ui.week, 7 * dir) : mondayOf(t);
        else ui.month = dir ? new Date(ui.month.getFullYear(), ui.month.getMonth() + dir, 1) : new Date(t.getFullYear(), t.getMonth(), 1);
        draw();
      }
      var main = el('div', { class: 'hb-main' });
      var archBox = el('div');

      function drawWeek() {
        var list = active();
        if (!list.length) return U.note(data.habits.length ? 'Every habit is archived. Restore one below, or add a new one.' : 'No habits yet. Add one above.');
        return el('div', { class: 'hb-list', dataset: { k: 'hb-list' } }, list.map(function (h, i) { return card(h, i, list.length); }));
      }
      function drawMonth() {
        var list = active();
        if (!list.length) return U.note('No habits yet. Add one above.');
        var h = byId(ui.focus);
        if (!h || h.archived) { h = list[0]; ui.focus = h.id; }
        var pick = U.select({ 'aria-label': 'Habit', options: list.map(function (x) { return { value: x.id, label: (x.emoji ? x.emoji + ' ' : '') + x.name }; }), value: h.id });
        pick.addEventListener('change', function () { ui.focus = pick.value; draw(); });

        var grid = el('div', { class: 'hb-month', role: 'group', 'aria-label': h.name + ', ' + MONTHS[ui.month.getMonth()] + ' ' + ui.month.getFullYear() });
        DOW.forEach(function (d) { grid.appendChild(el('div', { class: 'hb-dow', 'aria-hidden': 'true', text: d })); });
        var lead = (ui.month.getDay() + 6) % 7;
        for (var i = 0; i < lead; i++) grid.appendChild(el('div'));
        for (var d = new Date(ui.month); d.getMonth() === ui.month.getMonth(); d = addDays(d, 1)) grid.appendChild(dayButton(h, d, false));

        /* The last 26 weeks as a heatmap, a column per week, Monday at the top. */
        var t = today(), start = addDays(mondayOf(t), -7 * 25), heat = el('div', { class: 'hb-heat' });
        var hits = 0, days = 0;
        for (var k = 0; k < 26 * 7; k++) {
          var day = addDays(start, k), s = ymd(day), on = h.done.indexOf(s) >= 0, fut = day > t;
          if (!fut) { days++; if (on) hits++; }
          heat.appendChild(el('i', { class: (on ? 'on' : '') + (fut ? ' future' : '') + (s === ymd(t) ? ' today' : ''), title: longDate(day) + ' ' + day.getFullYear() + (on ? ': done' : '') }));
        }
        heat.setAttribute('role', 'img');
        heat.setAttribute('aria-label', h.name + ': done on ' + hits + ' of the last ' + days + ' days');

        return el('div', { class: 'hb-card', style: { '--hb': h.colour }, dataset: { id: h.id, k: 'hb-card' } },
          el('div', { class: 'toolbar' }, pick),
          el('div', { class: 'hb-head' }, titleNode(h), statsLine(h)),
          grid,
          el('div', { class: 'muted', text: 'Last 26 weeks · ' + hits + ' of ' + days + ' days' }),
          heat);
      }
      function drawArchived() {
        var list = data.habits.filter(function (h) { return h.archived; });
        if (!list.length) { archBox.replaceChildren(); return; }
        var open = archBox.querySelector('details') && archBox.querySelector('details').open;
        archBox.replaceChildren(U.panel(null, el('details', { open: !!open },
          el('summary', { text: 'Archived habits (' + list.length + ')' }),
          list.map(function (h) {
            var del = confirmButton('Delete', function () {
              data.habits = data.habits.filter(function (x) { return x !== h; });
              persist(); draw();
            }, 'Delete ' + h.name);
            return el('div', { class: 'hb-arch', dataset: { id: h.id } },
              el('span', { text: (h.emoji ? h.emoji + ' ' : '') + h.name + ' · best streak ' + plural(habitStats(h).best, habitStats(h).unit) }),
              smallBtn('Restore', 'Restore ' + h.name, 'rs-' + h.id, function () { h.archived = false; persist(); draw(); }),
              del);
          }),
          U.note('Archived habits keep their history but are hidden from the week and month views.'))));
      }
      function draw() {
        keepFocus(root, function () {
          var t = today(), wk = data.view === 'week';
          navLabel.textContent = wk ? weekLabel(ui.week) : MONTHS[ui.month.getMonth()] + ' ' + ui.month.getFullYear();
          nowBtn.textContent = wk ? 'This week' : 'This month';
          prevBtn.setAttribute('aria-label', wk ? 'Previous week' : 'Previous month');
          nextBtn.setAttribute('aria-label', wk ? 'Next week' : 'Next month');
          nextBtn.disabled = wk ? ui.week >= mondayOf(t) : ui.month >= new Date(t.getFullYear(), t.getMonth(), 1);
          main.replaceChildren(wk ? drawWeek() : drawMonth());
          drawArchived();
        });
      }

      /* --- backup ---------------------------------------------------------------- */
      function importHabits(files) {
        readJsonFile(files[0]).then(function (doc) {
          var list = cleanHabits(doc && (doc.habits || (Array.isArray(doc) ? doc : null)));
          if (!list.length) throw new Error('No habits found in that file.');
          var added = 0, merged = 0;
          list.forEach(function (h) {
            var mine = byId(h.id);
            if (!mine) { data.habits.push(h); added++; return; }
            var before = mine.done.length;
            h.done.forEach(function (s) { if (mine.done.indexOf(s) < 0) mine.done.push(s); });
            mine.done.sort();
            if (mine.done.length !== before) merged++;
          });
          persist(); draw();
          U.toast('Imported ' + plural(added, 'new habit') + (merged ? ', added ticks to ' + plural(merged, 'habit') : ''));
        }).catch(function (err) { U.toast(err.message || String(err), 'err'); });
      }

      var exampleNote = U.note('These two habits are examples to show how it works. Edit or delete them, or add your own.');
      exampleNote.dataset.k = 'hb-example';
      var warn = storageNote('your habits');
      if (warn) root.appendChild(warn);
      root.append(
        U.panel(null, addForm, example ? exampleNote : null),
        U.panel(null,
          el('div', { class: 'toolbar', style: { justifyContent: 'space-between', marginBottom: '12px' } }, viewChips,
            el('div', { class: 'toolbar' }, prevBtn, navLabel, nextBtn, nowBtn)),
          main),
        archBox,
        U.panel(null,
          el('div', { class: 'btnrow' },
            U.button('Export habits', function () {
              if (!data.habits.length) { U.toast('No habits to export yet', 'err'); return; }
              exportJson('habits-' + ymd(new Date()) + '.json', 'habit-tracker', { habits: data.habits });
            }),
            fileButton('Import habits', '.json,application/json', importHabits, 'Import habits file')),
          U.note('Your habits are saved only in this browser, never uploaded. To move them to another browser or device, export a file here and import it there. Importing adds to what is already here.')));
      draw();
    }
  });

  /* ===================================================================== */
  /* Checklists                                                             */
  /* ===================================================================== */

  function cleanItem(it) {
    if (!it || typeof it !== 'object' || it.text === undefined || it.text === null) return null;
    var text = String(it.text).replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!text) return null;
    return { id: typeof it.id === 'string' && it.id ? it.id : uid(), text: text, done: !it.heading && !!it.done, heading: !!it.heading };
  }
  function cleanList(l) {
    if (!l || typeof l !== 'object') return null;
    return {
      id: typeof l.id === 'string' && l.id ? l.id : uid(),
      name: String(l.name || '').trim().slice(0, 80) || 'Untitled checklist',
      items: (Array.isArray(l.items) ? l.items : []).map(cleanItem).filter(Boolean),
      updated: +l.updated || Date.now()
    };
  }
  function newList(name, items) { return { id: uid(), name: name, items: items || [], updated: Date.now() }; }

  function clExample() {
    var mk = function (text, done) { return { id: uid(), text: text, done: !!done, heading: false }; };
    var hd = function (text) { return { id: uid(), text: text, done: false, heading: true }; };
    var l = newList('Packing for a weekend away', [
      hd('Clothes'), mk('T-shirts', true), mk('Socks and underwear', true), mk('Jumper'), mk('Pyjamas'),
      hd('Wash bag'), mk('Toothbrush and toothpaste'), mk('Deodorant'), mk('Any medicines'),
      hd('Before you leave'), mk('Phone charger'), mk('Tickets or booking reference'), mk('Wallet and keys'), mk('Lock the back door')
    ]);
    return { lists: [l], current: l.id, example: true };
  }
  function clLoad() {
    var raw = load('checklists', null);
    if (raw === null || typeof raw !== 'object') return clExample();
    var lists = (Array.isArray(raw.lists) ? raw.lists : []).map(cleanList).filter(Boolean);
    if (!lists.length) lists = [newList('My checklist')];
    return { lists: lists, current: lists.some(function (l) { return l.id === raw.current; }) ? raw.current : lists[0].id };
  }

  /* Pasted lines become items. "# Heading" makes a section; bullets,
     numbers and Markdown task boxes are stripped, and "[x]" stays ticked,
     so a list copied as Markdown pastes back the way it was. */
  function parseLines(text) {
    return String(text || '').replace(/\r\n?/g, '\n').split('\n').map(function (line) {
      var l = line.trim();
      if (!l) return null;
      var h = /^#{1,6}\s+(.+)$/.exec(l);
      if (h) return { heading: true, text: h[1].trim(), done: false };
      var b = /^(?:[-*+•]|\d{1,3}[.)])\s+(.*)$/.exec(l);
      if (b) l = b[1];
      var done = false;
      var c = /^\[([ xX✓✔])\]\s*(.*)$/.exec(l);
      if (c) { done = c[1] !== ' '; l = c[2]; } else {
        var g = /^([☐☑✅])\s*(.*)$/.exec(l);
        if (g) { done = g[1] !== '☐'; l = g[2]; }
      }
      return { heading: false, text: l.trim(), done: done };
    }).map(cleanItem).filter(Boolean);
  }
  function counts(items) {
    var real = items.filter(function (i) { return !i.heading; });
    return { total: real.length, done: real.filter(function (i) { return i.done; }).length };
  }
  function listText(list, md) {
    var out = [md ? '# ' + list.name : list.name], gap = true;
    list.items.forEach(function (it) {
      if (it.heading) { out.push('', md ? '## ' + it.text : it.text); gap = md; return; }
      if (gap) { out.push(''); gap = false; }
      out.push((md ? '- ' : '') + (it.done ? '[x] ' : '[ ] ') + it.text);
    });
    return out.join('\n') + '\n';
  }

  /* Print just the list: a print-only host, black on white. */
  function printList(list) {
    var old = document.getElementById('g-prodd-print');
    if (old) old.remove();
    var style = document.getElementById('g-prodd-print-style');
    if (!style) { style = el('style', { id: 'g-prodd-print-style' }); document.head.appendChild(style); }
    style.textContent = '@media screen { #g-prodd-print { display: none !important; } }\n' +
      '@media print { body.g-prodd-printing > *:not(#g-prodd-print) { display: none !important; } ' +
      'body.g-prodd-printing { margin: 0 !important; background: #fff !important; color: #000 !important; } ' +
      '#g-prodd-print { font: 12pt/1.45 system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #000; } ' +
      '#g-prodd-print h1 { font-size: 18pt; margin: 0 0 4pt; } #g-prodd-print .sub { color: #555; font-size: 10pt; margin: 0 0 10pt; } ' +
      '#g-prodd-print h2 { font-size: 13pt; margin: 14pt 0 4pt; border-bottom: 1px solid #999; padding-bottom: 2pt; break-after: avoid; } ' +
      '#g-prodd-print ul { list-style: none; margin: 0; padding: 0; } ' +
      '#g-prodd-print li { display: flex; gap: 8pt; align-items: baseline; padding: 3pt 0; break-inside: avoid; } ' +
      '#g-prodd-print li span.box { display: inline-block; width: 11pt; height: 11pt; border: 1.2pt solid #000; flex: none; text-align: center; line-height: 10pt; font-size: 10pt; } ' +
      '#g-prodd-print li.done span.txt { text-decoration: line-through; color: #555; } }\n' +
      '@page { margin: 15mm; }';
    var c = counts(list.items);
    var host = el('div', { id: 'g-prodd-print' }, el('h1', { text: list.name }), el('p', { class: 'sub', text: c.done + ' of ' + c.total + ' done' }));
    var ul = null;
    list.items.forEach(function (it) {
      if (it.heading) { host.appendChild(el('h2', { text: it.text })); ul = null; return; }
      if (!ul) { ul = el('ul'); host.appendChild(ul); }
      ul.appendChild(el('li', { class: it.done ? 'done' : '' }, el('span', { class: 'box', text: it.done ? '✓' : '' }), el('span', { class: 'txt', text: it.text })));
    });
    document.body.appendChild(host);
    document.body.classList.add('g-prodd-printing');
    function done() {
      window.removeEventListener('afterprint', done);
      document.body.classList.remove('g-prodd-printing');
      host.remove();
      style.textContent = '';
    }
    window.addEventListener('afterprint', done);
    try { window.print(); } catch (e) { done(); U.toast('Printing is not available in this browser', 'err'); }
  }

  Tools.register({
    id: 'checklist',
    category: 'productivity',
    name: 'Checklists',
    description: 'Keep reusable checklists with sections, tick items off as you go, then untick them all to use the list again.',
    keywords: ['checklist', 'checklists', 'check list', 'to do list', 'todo', 'to-do', 'todo list', 'task list', 'packing list', 'packing checklist',
      'shopping list', 'grocery list', 'weekly shop', 'list maker', 'reusable checklist', 'checklist template', 'printable checklist',
      'moving house checklist', 'holiday packing', 'tick list', 'tick box', 'checkbox list', 'markdown checklist', 'routine'],
    render: function (root) {
      root.classList.add('g-prodd');
      var data = clLoad();
      var example = !!data.example;
      delete data.example;
      var ui = { editing: null };

      function persist() {
        if (example) { example = false; exampleNote.remove(); }
        list().updated = Date.now();
        if (!save('checklists', data)) warnStorage();
      }
      function list() { return data.lists.filter(function (l) { return l.id === data.current; })[0] || data.lists[0]; }

      /* --- choosing lists ------------------------------------------------------ */
      var listSel = U.select({ 'aria-label': 'Checklist', options: [] });
      listSel.addEventListener('change', function () { data.current = listSel.value; ui.editing = null; persist(); draw(); });
      var nameIn = el('input', { type: 'text', maxLength: 80, 'aria-label': 'List name', placeholder: 'List name' });
      nameIn.addEventListener('input', function () {
        list().name = nameIn.value.trim() || 'Untitled checklist';
        persist();
        var opt = listSel.querySelector('option[value="' + list().id + '"]');
        if (opt) opt.textContent = list().name;
      });
      var delList = confirmButton('Delete list', function () {
        var gone = list();
        data.lists = data.lists.filter(function (l) { return l !== gone; });
        if (!data.lists.length) data.lists.push(newList('My checklist'));
        data.current = data.lists[0].id;
        persist(); draw();
        U.toast('Deleted “' + gone.name + '”');
      });

      /* --- adding items ------------------------------------------------------- */
      var addIn = el('input', { type: 'text', maxLength: 300, 'aria-label': 'New item', placeholder: 'Add an item, or paste several lines' });
      function addItems(items) {
        if (!items.length) return 0;
        Array.prototype.push.apply(list().items, items);
        persist(); draw();
        return items.length;
      }
      function addOne(heading) {
        var text = addIn.value.trim();
        if (!text) { U.toast(heading ? 'Type the heading first' : 'Type an item first', 'err'); addIn.focus(); return; }
        addItems([cleanItem({ text: text, heading: !!heading })]);
        addIn.value = '';
        addIn.focus();
      }
      addIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addOne(false); } });
      addIn.addEventListener('paste', function (e) {
        var text = e.clipboardData && e.clipboardData.getData('text');
        if (!text || !/\n/.test(text.trim())) return;
        e.preventDefault();
        var n = addItems(parseLines(text));
        U.toast('Added ' + plural(n, 'line'));
      });
      var many = el('textarea', { 'aria-label': 'Items, one per line', placeholder: 'Passport\nPhone charger\n# Toiletries\nToothbrush' });
      var manyBox = el('details', { class: 'cl-add' }, el('summary', { text: 'Add several at once' }),
        el('div', { class: 'stack' }, many,
          el('div', { class: 'btnrow' }, U.button('Add these', function () {
            var items = parseLines(many.value);
            if (!items.length) { U.toast('Type or paste some lines first', 'err'); return; }
            addItems(items);
            many.value = '';
            U.toast('Added ' + plural(items.length, 'line'));
          }, 'primary')),
          U.note('One item per line. Start a line with # to make it a section heading. Bullets and numbers are removed, and lines starting [x] are added already ticked.')));

      /* --- the list ----------------------------------------------------------- */
      var progText = el('span', { dataset: { k: 'cl-progress' } });
      var progPct = el('span', { class: 'muted', dataset: { k: 'cl-pct' } });
      var bar = el('div', { class: 'cl-bar', role: 'progressbar', 'aria-label': 'Progress', 'aria-valuemin': '0' }, el('i'));
      var itemsBox = el('div', { class: 'cl-items', dataset: { k: 'cl-items' } });
      var undoHost = el('div');

      function findIndex(id) {
        var items = list().items;
        for (var i = 0; i < items.length; i++) if (items[i].id === id) return i;
        return -1;
      }
      function move(id, dir) {
        var items = list().items, i = findIndex(id), j = i + dir;
        if (i < 0 || j < 0 || j >= items.length) return;
        var t = items[i]; items[i] = items[j]; items[j] = t;
        persist(); draw();
      }
      function removeItem(id) {
        var l = list(), i = findIndex(id);
        if (i < 0) return;
        var it = l.items.splice(i, 1)[0];
        persist(); draw();
        undoBar(undoHost, 'Removed “' + it.text + '”', function () {
          l.items.splice(Math.min(i, l.items.length), 0, it);
          data.current = l.id;
          persist(); draw();
        }, root);
      }
      function sectionCount(items, i) {
        var total = 0, done = 0;
        for (var k = i + 1; k < items.length && !items[k].heading; k++) { total++; if (items[k].done) done++; }
        return total ? done + '/' + total : '';
      }

      function rowNode(it, i, items) {
        var row = el('div', { class: 'cl-row' + (it.heading ? ' heading' : '') + (it.done ? ' done' : ''), dataset: { id: it.id } });
        if (ui.editing === it.id) {
          var inp = el('input', { type: 'text', class: 'cl-edit', value: it.text, maxLength: 300, 'aria-label': 'Edit ' + (it.heading ? 'heading' : 'item') });
          var finished = false;
          var finish = function (keep) {
            if (finished) return;
            finished = true;
            var v = inp.value.replace(/\s+/g, ' ').trim();
            ui.editing = null;
            if (keep && v) { it.text = v; persist(); }
            draw();
            var again = itemsBox.querySelector('[data-fk="ed-' + it.id + '"]');
            if (again) again.focus();
          };
          inp.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); finish(true); }
            if (e.key === 'Escape') { e.preventDefault(); finish(false); }
          });
          inp.addEventListener('blur', function () { finish(true); });
          row.append(inp, el('div', { class: 'cl-btns' }, U.button('Save', function () { finish(true); }, 'primary')));
          setTimeout(function () { inp.focus(); inp.select(); }, 0);
          return row;
        }
        var btns = el('div', { class: 'cl-btns' },
          btn('Edit', 'Edit ' + it.text, 'ed-' + it.id, function () { ui.editing = it.id; draw(); }),
          btn('↑', 'Move ' + it.text + ' up', 'up-' + it.id, function () { move(it.id, -1); }, i === 0),
          btn('↓', 'Move ' + it.text + ' down', 'dn-' + it.id, function () { move(it.id, 1); }, i === items.length - 1),
          btn('✕', 'Remove ' + it.text, 'rm-' + it.id, function () { removeItem(it.id); }));
        if (it.heading) {
          row.append(el('span', { class: 'cl-text', role: 'heading', 'aria-level': '4', text: it.text }), el('span', { class: 'cl-sec', text: sectionCount(items, i) }), btns);
          return row;
        }
        var id = 'cl-' + it.id;
        var box = el('input', { type: 'checkbox', id: id, checked: it.done, dataset: { fk: 'cb-' + it.id } });
        box.addEventListener('change', function () { it.done = box.checked; persist(); draw(); });
        row.append(box, el('label', { class: 'cl-text', htmlFor: id, text: it.text }), btns);
        return row;
      }
      function btn(label, aria, fk, fn, disabled) {
        var b = U.button(label, fn, 'ghost');
        b.setAttribute('aria-label', aria);
        b.dataset.fk = fk;
        b.disabled = !!disabled;
        return b;
      }

      function draw() {
        keepFocus(root, function () {
          var l = list();
          listSel.replaceChildren.apply(listSel, data.lists.map(function (x) { return el('option', { value: x.id, text: x.name }); }));
          listSel.value = l.id;
          if (document.activeElement !== nameIn) nameIn.value = l.name;
          var c = counts(l.items), pct = c.total ? Math.round(c.done / c.total * 100) : 0;
          progText.textContent = c.done + ' of ' + c.total + ' done';
          progPct.textContent = c.total ? pct + '%' + (c.done === c.total ? ' · all done' : '') : '';
          bar.firstChild.style.width = pct + '%';
          bar.setAttribute('aria-valuemax', String(c.total));
          bar.setAttribute('aria-valuenow', String(c.done));
          bar.setAttribute('aria-valuetext', progText.textContent);
          if (!l.items.length) itemsBox.replaceChildren(U.note('This list is empty. Add items above.'));
          else itemsBox.replaceChildren.apply(itemsBox, l.items.map(function (it, i) { return rowNode(it, i, l.items); }));
        });
      }

      function setAll(done) {
        var l = list(), n = 0;
        l.items.forEach(function (it) { if (!it.heading && it.done !== done) { it.done = done; n++; } });
        if (!n) { U.toast(done ? 'Everything is already ticked' : 'Nothing is ticked', 'err'); return; }
        persist(); draw();
      }
      function removeTicked() {
        var l = list(), before = l.items.slice();
        var kept = l.items.filter(function (it) { return it.heading || !it.done; });
        var n = before.length - kept.length;
        if (!n) { U.toast('Nothing is ticked', 'err'); return; }
        l.items = kept;
        persist(); draw();
        undoBar(undoHost, 'Removed ' + plural(n, 'ticked item'), function () { l.items = before; data.current = l.id; persist(); draw(); }, root);
      }

      /* --- backup ---------------------------------------------------------------- */
      function importLists(files) {
        readJsonFile(files[0]).then(function (doc) {
          var raw = doc && (doc.lists || doc.checklists || (Array.isArray(doc) ? doc : (doc.items ? [doc] : null)));
          var lists = (Array.isArray(raw) ? raw : []).map(cleanList).filter(Boolean);
          if (!lists.length) throw new Error('No checklists found in that file.');
          /* A single blank list left from starting afresh isn't worth keeping. */
          if (data.lists.length === 1 && !data.lists[0].items.length) data.lists = [];
          var added = 0, updated = 0;
          lists.forEach(function (l) {
            var i = -1;
            data.lists.forEach(function (x, k) { if (x.id === l.id) i = k; });
            if (i < 0) { data.lists.push(l); added++; } else if (l.updated >= data.lists[i].updated) { data.lists[i] = l; updated++; }
          });
          data.current = lists[0].id;
          persist(); draw();
          U.toast('Imported ' + plural(added, 'new list') + (updated ? ', updated ' + updated : ''));
        }).catch(function (err) { U.toast(err.message || String(err), 'err'); });
      }

      var exampleNote = U.note('This is an example list. Rename it, change it or delete it, or start a new list.');
      exampleNote.dataset.k = 'cl-example';
      var warn = storageNote('your checklists');
      if (warn) root.appendChild(warn);
      root.append(
        U.panel(null,
          el('div', { class: 'toolbar' }, listSel,
            U.button('New list', function () {
              var l = newList('New checklist');
              data.lists.push(l);
              data.current = l.id;
              persist(); draw();
              nameIn.focus(); nameIn.select();
            }),
            U.button('Duplicate', function () {
              var src = list();
              var l = newList('Copy of ' + src.name, src.items.map(function (it) { return Object.assign({}, it, { id: uid() }); }));
              data.lists.push(l);
              data.current = l.id;
              persist(); draw();
              U.toast('Made a copy of “' + src.name + '”');
            }),
            delList),
          el('div', { class: 'field', style: { marginTop: '10px' } }, nameIn),
          example ? exampleNote : null),
        U.panel(null,
          el('div', { class: 'cl-progress' }, el('div', { class: 'toolbar', style: { justifyContent: 'space-between' } }, progText, progPct), bar),
          el('div', { class: 'toolbar', style: { margin: '12px 0 8px' } },
            el('div', { class: 'grow' }, addIn),
            U.button('Add item', function () { addOne(false); }, 'primary'),
            U.button('Add heading', function () { addOne(true); })),
          manyBox,
          undoHost,
          itemsBox,
          el('div', { class: 'btnrow', style: { marginTop: '12px' } },
            U.button('Untick all', function () { setAll(false); }),
            U.button('Tick all', function () { setAll(true); }, 'ghost'),
            U.button('Remove ticked', removeTicked, 'ghost')),
          el('div', { class: 'btnrow', style: { marginTop: '8px' } },
            U.copyBtn('Copy as text', function () { return listText(list(), false); }),
            U.copyBtn('Copy as Markdown', function () { return listText(list(), true); }),
            U.button('Print', function () { printList(list()); })),
          U.note('Untick all to reuse a list, such as a packing list or the weekly shop. Duplicate makes a copy to change without touching the original.')),
        U.panel(null,
          el('div', { class: 'btnrow' },
            U.button('Export all lists', function () { exportJson('checklists-' + ymd(new Date()) + '.json', 'checklist', { lists: data.lists }); }),
            U.button('Download this list (.md)', function () { U.saveText(slug(list().name, 'checklist') + '.md', listText(list(), true), 'text/markdown'); }),
            fileButton('Import lists', '.json,application/json', importLists, 'Import checklists file')),
          U.note('Your lists are saved only in this browser, never uploaded. To move them to another browser or device, export a file here and import it there.')));
      draw();
    }
  });
})();
