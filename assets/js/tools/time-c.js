/* time-c tools: a stopwatch with laps and splits. Its running state is kept
   in localStorage, so a reload or a closed tab doesn't lose the time. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-timec-style')) {
    document.head.appendChild(el('style', { id: 'g-timec-style', text: [
      '.g-timec .sw-face { text-align: center; padding: 18px 8px 10px; border-radius: var(--radius); background: var(--bg-sunken); border: 1px solid var(--border); }',
      '.g-timec .sw-time { font-family: var(--mono); font-variant-numeric: tabular-nums; font-size: clamp(44px, 12vw, 104px); font-weight: 700; line-height: 1.05; letter-spacing: -.02em; }',
      '.g-timec .sw-time small { font-size: .5em; color: var(--fg-muted); font-weight: 600; }',
      '.g-timec .sw-lap { font-family: var(--mono); font-variant-numeric: tabular-nums; color: var(--fg-muted); font-size: clamp(16px, 3.4vw, 24px); min-height: 1.4em; margin-top: 4px; }',
      '.g-timec .sw-face.running .sw-time { color: var(--accent); }',
      '.g-timec .sw-face:fullscreen { display: flex; flex-direction: column; justify-content: center; align-items: center; background: var(--bg); border: 0; border-radius: 0; }',
      '.g-timec .sw-face:fullscreen .sw-time { font-size: 18vw; }',
      '.g-timec .sw-face:fullscreen .sw-lap { font-size: 4vw; }',
      '.g-timec .sw-face:fullscreen .sw-fsbtns { margin-top: 3vh; }',
      '.g-timec .sw-fsbtns { display: none; justify-content: center; gap: 8px; }',
      '.g-timec .sw-face:fullscreen .sw-fsbtns { display: flex; }',
      '.g-timec .sw-controls { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 14px; }',
      '.g-timec .sw-controls .btn { min-width: 104px; }',
      '.g-timec .btn.danger { background: var(--err); border-color: var(--err); color: #fff; }',
      '.g-timec .btn.danger:hover { filter: brightness(1.07); }',
      '.g-timec .sw-keys { text-align: center; color: var(--fg-muted); font-size: 13px; margin-top: 10px; }',
      '.g-timec .sw-keys kbd { font-family: var(--mono); border: 1px solid var(--border); border-bottom-width: 2px; border-radius: 4px; padding: 0 5px; background: var(--bg-elev); }',
      '.g-timec .sw-table { overflow: auto; max-height: 52vh; }',
      '.g-timec table.data td, .g-timec table.data th { text-align: right; }',
      '.g-timec table.data td:first-child, .g-timec table.data th:first-child { text-align: left; }',
      '.g-timec tr.fast td { color: var(--ok); font-weight: 600; }',
      '.g-timec tr.slow td { color: var(--err); font-weight: 600; }',
      '.g-timec .sw-tag { font-size: 11px; font-weight: 600; border: 1px solid currentColor; border-radius: 999px; padding: 0 6px; margin-left: 6px; font-family: inherit; }',
      '.g-timec .up { color: var(--err); } .g-timec .down { color: var(--ok); }'
    ].join('\n') }));
  }

  var KEY = 'att:stopwatch';
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && Array.isArray(s.laps)) return s; } catch (e) { /* private browsing */ }
    return null;
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private browsing */ } }

  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }

  /* h:mm:ss.cc (or .mmm), dropping the hours while they are zero. */
  function fmt(ms, digits) {
    ms = Math.max(0, Math.floor(ms));
    var h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
    var frac = digits === 3 ? pad(ms % 1000, 3) : pad(Math.floor(ms % 1000 / 10), 2);
    return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(s) + '.' + frac;
  }

  /* Laps are stored as the running total at each press; lap times are the
     gaps between them. */
  function lapRows(splits) {
    return splits.map(function (split, i) { return { n: i + 1, split: split, lap: split - (i ? splits[i - 1] : 0) }; });
  }

  function typing(e) {
    var t = e.target;
    return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  }

  Tools.register({
    id: 'stopwatch', category: 'time', name: 'Stopwatch & Lap Timer',
    description: 'An accurate stopwatch with laps, splits, fastest and slowest lap, keyboard shortcuts, full screen and CSV export. Keeps running if you reload.',
    keywords: ['stopwatch', 'stop watch', 'lap timer', 'laps', 'split', 'splits', 'chronograph', 'timer', 'time trial', 'race', 'running'],
    render: function (root) {
      root.classList.add('g-timec');

      /* acc: milliseconds banked before the current run. since: wall-clock
         start of the current run (null when stopped), which is what survives a
         reload. Inside the page, performance.now() does the measuring. */
      var st = load() || { acc: 0, since: null, laps: [], digits: 2 };
      var perfStart = st.since !== null ? performance.now() - (Date.now() - st.since) : 0;

      function running() { return st.since !== null; }
      function elapsed() { return st.acc + (running() ? performance.now() - perfStart : 0); }

      var timeNode = el('div', { class: 'sw-time', 'aria-live': 'off' });
      var lapNode = el('div', { class: 'sw-lap' });
      var startBtn = U.button('Start', toggle, 'primary');
      var lapBtn = U.button('Lap', lap);
      var resetBtn = U.button('Reset', reset, 'ghost');
      var fsStart = U.button('Start', toggle, 'primary');
      var fsLap = U.button('Lap', lap);
      var fsExit = U.button('Exit full screen', function () { if (document.exitFullscreen) document.exitFullscreen().catch(function () {}); }, 'ghost');
      var face = el('div', { class: 'sw-face' }, timeNode, lapNode, el('div', { class: 'sw-fsbtns' }, fsStart, fsLap, fsExit));
      var fsBtn = U.button('Full screen', function () {
        if (face.requestFullscreen) face.requestFullscreen().catch(function () { U.toast('Full screen is not available here', 'err'); });
        else U.toast('Full screen is not available here', 'err');
      }, 'ghost');
      var digits = U.chips([{ value: '2', label: 'Hundredths' }, { value: '3', label: 'Milliseconds' }], function (v) {
        st.digits = Number(v); save(st); paint(); drawLaps();
      }, String(st.digits || 2));

      var tableBox = el('div', { class: 'sw-table' });
      var summary = el('div');
      var csvBtn = U.downloadBtn('Download CSV', 'laps.csv', function () {
        if (!st.laps.length) return '';
        var d = st.digits || 2;
        return CSV.stringify([['Lap', 'Lap time', 'Split', 'Lap (ms)', 'Split (ms)']].concat(lapRows(st.laps).map(function (r) {
          return [r.n, fmt(r.lap, d), fmt(r.split, d), Math.round(r.lap), Math.round(r.split)];
        })));
      }, 'text/csv');
      var copyBtn = U.copyBtn('Copy laps', function () {
        var d = st.digits || 2;
        return lapRows(st.laps).map(function (r) { return 'Lap ' + r.n + '\t' + fmt(r.lap, d) + '\t' + fmt(r.split, d); }).join('\n');
      });

      function toggle() {
        if (running()) { st.acc = elapsed(); st.since = null; }
        else { st.since = Date.now(); perfStart = performance.now(); }
        save(st); buttons(); paint();
      }
      function lap() {
        var t = elapsed();
        if (!running() || t <= 0) return;
        st.laps.push(Math.round(t));
        save(st); drawLaps();
      }
      function reset() {
        st.acc = 0; st.since = null; st.laps = [];
        save(st); buttons(); paint(); drawLaps();
      }
      function buttons() {
        var on = running();
        [startBtn, fsStart].forEach(function (b) {
          b.textContent = on ? 'Stop' : (st.acc > 0 ? 'Resume' : 'Start');
          b.className = 'btn ' + (on ? 'danger' : 'primary');
        });
        lapBtn.disabled = fsLap.disabled = !on;
        face.classList.toggle('running', on);
      }
      function paint() {
        var d = st.digits || 2, t = elapsed();
        var text = fmt(t, d), dot = text.lastIndexOf('.');
        timeNode.replaceChildren(text.slice(0, dot), el('small', { text: text.slice(dot) }));
        var last = st.laps.length ? st.laps[st.laps.length - 1] : 0;
        lapNode.textContent = st.laps.length || running() ? 'Lap ' + (st.laps.length + 1) + '  ' + fmt(t - last, d) : '';
      }
      function drawLaps() {
        var d = st.digits || 2;
        var rows = lapRows(st.laps);
        if (!rows.length) {
          tableBox.replaceChildren(U.note('Press Lap (or L) while the stopwatch is running to record a lap.'));
          summary.replaceChildren();
          return;
        }
        var times = rows.map(function (r) { return r.lap; });
        var best = Math.min.apply(null, times), worst = Math.max.apply(null, times);
        var marks = rows.length >= 2;
        var body = rows.slice().reverse().map(function (r) {
          var prev = r.n > 1 ? rows[r.n - 2].lap : null;
          var delta = prev === null ? '—' : el('span', { class: r.lap > prev ? 'up' : 'down', text: (r.lap > prev ? '+' : '−') + fmt(Math.abs(r.lap - prev), d) });
          var tag = !marks ? null : r.lap === best ? el('span', { class: 'sw-tag', text: 'fastest' }) : r.lap === worst ? el('span', { class: 'sw-tag', text: 'slowest' }) : null;
          var tr = el('tr', { class: marks && r.lap === best ? 'fast' : marks && r.lap === worst ? 'slow' : '' },
            el('td', null, 'Lap ' + r.n, tag),
            el('td', { class: 'mono', text: fmt(r.lap, d) }),
            el('td', { class: 'mono' }, delta),
            el('td', { class: 'mono', text: fmt(r.split, d) }));
          return tr;
        });
        tableBox.replaceChildren(el('table', { class: 'data' },
          el('thead', el('tr', ['Lap', 'Lap time', 'vs previous', 'Split'].map(function (h) { return el('th', { text: h }); }))),
          el('tbody', body)));
        var total = times.reduce(function (a, b) { return a + b; }, 0);
        summary.replaceChildren(U.stats([
          { label: 'Laps', value: String(rows.length) },
          { label: 'Fastest', value: fmt(best, d) },
          { label: 'Slowest', value: fmt(worst, d) },
          { label: 'Average', value: fmt(total / rows.length, d) }
        ]));
      }

      function onKey(e) {
        if (e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
        var k = e.key.toLowerCase();
        if (k === ' ' || k === 'spacebar') {
          /* A focused button already reacts to Space itself. */
          if (e.target && e.target.tagName === 'BUTTON') return;
          e.preventDefault(); toggle();
        } else if (k === 'l' || k === 'enter' && !(e.target && e.target.tagName === 'BUTTON')) { e.preventDefault(); lap(); }
        else if (k === 'r') { e.preventDefault(); reset(); }
      }
      document.addEventListener('keydown', onKey);

      /* A frame loop for the display; hidden tabs pause it, which costs
         nothing because the time is worked out from the clock, not counted. */
      var raf = 0;
      function frame() { if (running()) paint(); raf = requestAnimationFrame(frame); }
      raf = requestAnimationFrame(frame);
      function onVisible() { if (!document.hidden) paint(); }
      document.addEventListener('visibilitychange', onVisible);

      U.onTeardown(root, function () {
        cancelAnimationFrame(raf);
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('visibilitychange', onVisible);
        if (document.fullscreenElement === face && document.exitFullscreen) document.exitFullscreen().catch(function () {});
      });

      root.appendChild(U.panel(null, face,
        el('div', { class: 'sw-controls' }, startBtn, lapBtn, resetBtn, fsBtn),
        el('p', { class: 'sw-keys' }, el('kbd', { text: 'Space' }), ' start / stop · ', el('kbd', { text: 'L' }), ' lap · ', el('kbd', { text: 'R' }), ' reset'),
        U.row(U.field('Show', digits))));
      root.appendChild(U.panel('Laps', summary, tableBox, U.btnrow(csvBtn, copyBtn)));
      root.appendChild(U.note('The time is saved in this browser as you go, so it keeps counting if you reload the page or come back later.'));

      buttons(); paint(); drawLaps();
    }
  });
})();
