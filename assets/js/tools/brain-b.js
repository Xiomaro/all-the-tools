/* brain-b tools: Dual N-Back, Schulte Table and Mental Maths Drill. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  /* append children, flattening arrays and skipping null (append() would
     print them as text) */
  function put(node) {
    (function walk(list) {
      list.forEach(function (k) {
        if (k === null || k === undefined || k === false) return;
        if (Array.isArray(k)) return walk(k);
        node.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
      });
    })(Array.prototype.slice.call(arguments, 1));
    return node;
  }
  function fill(node) { node.replaceChildren(); return put.apply(null, arguments); }

  if (!document.getElementById('g-brain-b-style')) {
    document.head.appendChild(el('style', { id: 'g-brain-b-style', text: [
      '.g-brainb .center{text-align:center}',
      '.g-brainb .bigscore{font-size:40px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums}',
      '.g-brainb .hud{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;justify-content:space-between;font-weight:600}',
      '.g-brainb .hud .grow{flex:1 1 auto}',
      '.g-brainb .hud b{font-variant-numeric:tabular-nums}',
      '.g-brainb .opts{display:grid;gap:12px;margin:4px 0 16px}',
      '.g-brainb .opts .field>label{margin-bottom:2px}',
      '.g-brainb .chips .chip:disabled{opacity:.45;cursor:not-allowed}',
      '.g-brainb .scroll{overflow-x:auto}',
      '.g-brainb table.data td.num,.g-brainb table.data th.num{text-align:right;font-variant-numeric:tabular-nums}',
      '.g-brainb canvas.hist{width:100%;height:120px;display:block;background:var(--bg-sunken);border-radius:var(--radius-s)}',
      /* dual n-back */
      '.g-brainb .nb-stage{display:flex;flex-direction:column;align-items:center;gap:14px;touch-action:manipulation;user-select:none;-webkit-user-select:none}',
      '.g-brainb .nb-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:8px;width:min(100%,340px);aspect-ratio:1}',
      '.g-brainb .nb-cell{border-radius:10px;background:var(--bg-sunken);border:1px solid var(--border);transition:background .06s}',
      '.g-brainb .nb-cell.lit{background:var(--accent);border-color:var(--accent)}',
      '.g-brainb .nb-cell.fix{background:transparent;border-color:transparent;display:flex;align-items:center;justify-content:center;font-size:30px;color:var(--fg-muted)}',
      '.g-brainb .nb-keys{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:min(100%,460px)}',
      '.g-brainb .nb-key{padding:18px 8px;font-size:17px;white-space:normal;display:flex;flex-direction:column;align-items:center;gap:4px;touch-action:manipulation}',
      '.g-brainb .nb-key kbd{font:12px var(--mono);border:1px solid var(--border);border-radius:4px;padding:0 6px;color:var(--fg-muted)}',
      '.g-brainb .nb-key.ok{background:color-mix(in srgb,var(--ok) 28%,var(--bg));border-color:var(--ok)}',
      '.g-brainb .nb-key.bad{background:color-mix(in srgb,var(--err) 28%,var(--bg));border-color:var(--err)}',
      '.g-brainb .nb-key.wait{opacity:.5}',
      /* schulte table */
      '.g-brainb .sch-wrap{position:relative;width:min(100%,520px);margin:0 auto;container-type:inline-size}',
      '.g-brainb .sch-grid{display:grid;gap:4px;width:100%;aspect-ratio:1}',
      '.g-brainb .sch-grid>*{min-height:0}',
      '.g-brainb .sch-cell{border:1px solid var(--border);border-radius:6px;background:var(--bg-elev);color:var(--fg);font:inherit;font-weight:700;line-height:1;font-variant-numeric:tabular-nums;cursor:pointer;padding:0;min-width:0;touch-action:manipulation;user-select:none;-webkit-user-select:none}',
      '.g-brainb .sch-cell.found{color:var(--fg-muted);background:var(--bg-sunken);opacity:.55}',
      '.g-brainb .sch-cell.wrong{background:color-mix(in srgb,var(--err) 35%,var(--bg-elev));border-color:var(--err)}',
      '.g-brainb .sch-cell.under-dot{display:flex;align-items:flex-end;justify-content:center;padding-bottom:7%;font-size:.7em}',
      '.g-brainb .sch-fix{position:absolute;left:50%;top:50%;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:#dc2626;box-shadow:0 0 0 3px rgba(255,255,255,.85);pointer-events:none}',
      '.g-brainb .sch-find{font-size:22px;font-weight:700}',
      /* mental maths */
      '.g-brainb .mm-q{font-size:clamp(34px,9vw,56px);font-weight:700;font-variant-numeric:tabular-nums;text-align:center;margin:8px 0 4px;word-break:break-word}',
      '.g-brainb .mm-a{font:700 clamp(30px,8vw,46px) var(--mono);text-align:center;min-height:1.3em;border-bottom:3px solid var(--accent);width:min(100%,280px);margin:0 auto;padding:2px 0}',
      '.g-brainb .mm-a.ok{border-color:var(--ok);color:var(--ok)}',
      '.g-brainb .mm-a.bad{border-color:var(--err);color:var(--err)}',
      '.g-brainb .mm-fb{min-height:1.5em;text-align:center;margin-top:6px}',
      '.g-brainb .mm-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:min(100%,340px);margin:14px auto 0}',
      '.g-brainb .mm-pad button{font-size:24px;padding:14px 0;min-height:56px;touch-action:manipulation}',
      '.g-brainb .mm-pad .wide{grid-column:span 3}',
      '.g-brainb .tables{display:flex;flex-wrap:wrap;gap:6px}'
    ].join('\n') }));
  }

  function store(key, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem('att-brain-' + key));
      if (value === null) localStorage.removeItem('att-brain-' + key);
      else localStorage.setItem('att-brain-' + key, JSON.stringify(value));
    } catch (e) { return null; }
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dateTime(ts) { var d = new Date(ts); return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function keyTarget(e) { var t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); }

  /* "Your results on this device": best, recent average and count, with a
     Clear button; the same block the other brain tests show. */
  function historyBlock(title, list, fmt, better, onClear) {
    if (!list || !list.length) return null;
    var best = list.reduce(function (a, b) { return better(b, a) ? b : a; });
    var last = list.slice(-5);
    var avg = last.reduce(function (a, b) { return a + b; }, 0) / last.length;
    var box = U.panel(title || 'Your results on this device', U.stats([
      { label: 'Best', value: fmt(best) }, { label: 'Average of last ' + last.length, value: fmt(avg) }, { label: 'Played', value: String(list.length) }]),
      U.btnrow(U.button('Clear', function () { if (onClear) onClear(); box.remove(); }, 'ghost')));
    return box;
  }
  function td(text, k, cls) { return el('td', { class: cls || null, text: String(text), dataset: k ? { k: k } : null }); }
  function tableEl(heads, rows) {
    return el('div', { class: 'scroll' }, el('table', { class: 'data' },
      el('thead', el('tr', heads.map(function (h) { return el('th', { text: h }); }))),
      el('tbody', rows)));
  }
  /* Bring a game panel fully into view on small screens, clear of the
     sticky top bar. */
  function reveal(node) {
    try {
      var r = node.getBoundingClientRect(), top = 72;
      if (r.top < top || r.bottom > window.innerHeight) window.scrollTo(0, Math.max(0, r.top + window.scrollY - top));
    } catch (e) { /* cosmetic only */ }
  }
  function cssVar(node, name, fallback) {
    try { return getComputedStyle(node).getPropertyValue(name).trim() || fallback; } catch (e) { return fallback; }
  }

  /* ======================================================================
     Dual N-Back
     ====================================================================== */

  /* Set-up follows Jaeggi et al. (2008): eight squares round a central
     fixation point, eight spoken consonants, 20 + N trials a block, 3 s a
     trial with the square shown for 500 ms, and six targets per stream of
     which two land on the same trial. */
  var NB_LETTERS = ['C', 'H', 'K', 'L', 'Q', 'R', 'S', 'T'];
  /* The tone fallback is pentatonic, so no two sounds are a semitone apart. */
  var NB_TONES = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
  var NB_CELLS = [0, 1, 2, 3, 5, 6, 7, 8];

  function nbBlock(n) {
    var T = 20 + n, slots = [];
    for (var i = n; i < T; i++) slots.push(i);
    shuffle(slots);
    function stream(targets) {
      var s = [];
      for (var i = 0; i < T; i++) {
        if (i >= n && targets.indexOf(i) > -1) { s.push(s[i - n]); continue; }
        var v;
        do { v = randInt(0, 7); } while (i >= n && v === s[i - n]);
        s.push(v);
      }
      return s;
    }
    return { n: n, T: T, pos: stream(slots.slice(0, 6)), snd: stream(slots.slice(0, 2).concat(slots.slice(6, 10))) };
  }

  /* Inverse of the standard normal CDF: Acklam's rational approximation,
     relative error under 1.2e-9. */
  function probit(p) {
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    var q, r;
    if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  /* d′ = z(hit rate) − z(false-alarm rate), with the log-linear correction
     (Hautus 1995) so a perfect block still gives a finite number. */
  function dPrime(c) {
    var h = (c.hit + 0.5) / (c.hit + c.miss + 1), f = (c.fa + 0.5) / (c.fa + c.cr + 1);
    return probit(h) - probit(f);
  }
  function nbScore(c) { var d = c.hit + c.miss + c.fa; return d ? c.hit / d : 1; }

  Tools.register({
    id: 'dual-n-back',
    category: 'brain',
    name: 'Dual N-Back',
    description: 'Working-memory training: spot squares and spoken letters that match N steps back. Levels adjust themselves, with d′ scoring and a history.',
    keywords: ['dual n-back', 'n-back', 'n back', 'nback', 'working memory', 'jaeggi', 'brain workshop', 'memory training', 'brain training', 'fluid intelligence', 'd prime', 'dprime', 'focus', 'concentration', 'attention', 'game'],
    render: function (root) {
      root.classList.add('g-brainb');
      var hasSpeech = typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance === 'function';
      var level = Math.max(1, Math.min(9, Number(store('nback-level')) || 2));
      var state = 'setup', block = null, cur = -1, resp = null, counts = null, timers = [], lit = null;
      var trialMs = 3000, override = 0, speechOk = hasSpeech, audio = null, voice = null, played = 0;

      /* --- set-up ------------------------------------------------------- */
      var nChips = U.chips([1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return { value: String(n), label: n + '-back' }; }), function (v) { level = Number(v); }, String(level));
      var speedChips = U.chips([{ value: '2000', label: '2 s' }, { value: '2500', label: '2.5 s' }, { value: '3000', label: '3 s' }], null, '3000');
      var soundChips = U.chips(hasSpeech ? [{ value: 'speech', label: 'Spoken letters' }, { value: 'tones', label: 'Tones' }] : [{ value: 'tones', label: 'Tones' }], null, hasSpeech ? 'speech' : 'tones');
      var autoBox = U.checkbox('Change N automatically (80% or more goes up, under 50% goes down)', { checked: true });
      var fbBox = U.checkbox('Show whether each press was right', { checked: true });
      var intro = el('p', { text: 'Each trial a square lights up and you hear a letter. Press Position match when the square is where it was N trials ago, and Sound match when the letter is the one you heard N trials ago. Both can match at once. A block is 20 + N trials of about 3 seconds.' });
      var setup = U.panel(null, el('h2', { text: 'Dual N-Back', style: { margin: '0 0 6px' } }), intro,
        el('div', { class: 'opts' },
          U.field('Level', nChips), U.field('Time per trial', speedChips), U.field('Sound', soundChips),
          hasSpeech ? null : U.note('This browser cannot speak, so each letter is a musical tone instead. Match the tones the same way.'),
          autoBox, fbBox),
        U.btnrow(U.button('Start', start, 'primary')),
        U.note('Keys: A for a position match, L for a sound match, Esc to stop. On a phone, use the two big buttons.'));

      /* --- play ----------------------------------------------------------- */
      var hudN = el('b'), hudT = el('b');
      var cells = [];
      var grid = el('div', { class: 'nb-grid', 'aria-hidden': 'true' });
      for (var i = 0; i < 9; i++) {
        var cell = el('div', { class: 'nb-cell' + (i === 4 ? ' fix' : '') }, i === 4 ? '+' : null);
        cells.push(cell); grid.appendChild(cell);
      }
      var posBtn = el('button', { type: 'button', class: 'btn nb-key', onclick: function () { respond('pos'); } }, el('span', { text: 'Position match' }), el('kbd', { text: 'A' }));
      var sndBtn = el('button', { type: 'button', class: 'btn nb-key', onclick: function () { respond('snd'); } }, el('span', { text: 'Sound match' }), el('kbd', { text: 'L' }));
      var soundNote = U.note('');
      var stage = el('div', { class: 'nb-stage', dataset: { state: 'idle' } }, grid, el('div', { class: 'nb-keys' }, posBtn, sndBtn), soundNote);
      var play = U.panel(null, el('div', { class: 'hud' }, el('span', {}, hudN), el('span', { class: 'grow' }, hudT), U.button('Stop', stop, 'ghost')),
        el('div', { style: { marginTop: '12px' } }, stage));
      play.style.display = 'none';

      var after = el('div');

      function clearTimers() { timers.forEach(clearTimeout); timers = []; }
      function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
      function ac() {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try {
          if (!audio) audio = new AC();
          if (audio.state === 'suspended') audio.resume().catch(function () {});
        } catch (e) { return null; }
        return audio;
      }
      function tone(k) {
        var c = ac();
        if (!c) return;
        try {
          var o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
          o.type = 'sine'; o.frequency.value = NB_TONES[k];
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
          g.gain.setValueAtTime(0.3, t + 0.33); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
          o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.5);
        } catch (e) { /* sound is best effort */ }
      }
      function pickVoice() {
        try {
          var vs = speechSynthesis.getVoices();
          voice = vs.filter(function (v) { return /^en[-_]GB/i.test(v.lang); })[0] || vs.filter(function (v) { return /^en/i.test(v.lang); })[0] || null;
        } catch (e) { voice = null; }
      }
      function sound(k, trial) {
        if (soundChips.value !== 'speech' || !speechOk) { tone(k); return; }
        try {
          speechSynthesis.cancel();
          var u = new SpeechSynthesisUtterance(NB_LETTERS[k]);
          u.lang = voice ? voice.lang : 'en-GB'; u.rate = 1.1;
          if (voice) u.voice = voice;
          u.onerror = function (e) {
            if (e.error === 'interrupted' || e.error === 'canceled') return;
            /* No voice or speech blocked: switch to tones for good and
               replay this trial's sound so it still counts. */
            speechOk = false;
            soundNote.textContent = 'Speech is not available here, so letters are played as tones for the rest of the block.';
            if (state === 'running' && cur === trial) tone(k);
          };
          speechSynthesis.speak(u);
        } catch (e) { speechOk = false; tone(k); }
      }

      function start() {
        clearTimers();
        trialMs = override || Number(speedChips.value);
        block = nbBlock(level);
        counts = { pos: { hit: 0, miss: 0, fa: 0, cr: 0 }, snd: { hit: 0, miss: 0, fa: 0, cr: 0 } };
        cur = -1; state = 'running';
        soundNote.textContent = '';
        if (soundChips.value === 'speech' && speechOk) pickVoice();
        ac(); /* unlock audio inside the click */
        setup.style.display = 'none'; fill(after); play.style.display = '';
        reveal(play);
        stage.dataset.state = 'running'; stage.dataset.n = String(level);
        hudN.textContent = level + '-back';
        later(next, Math.min(800, trialMs / 3));
      }
      function next() {
        cur++;
        if (cur >= block.T) { finish(); return; }
        resp = { pos: false, snd: false };
        var p = block.pos[cur], s = block.snd[cur];
        stage.dataset.trial = String(cur);
        stage.dataset.pos = String(p);
        stage.dataset.sound = NB_LETTERS[s];
        hudT.textContent = 'Trial ' + (cur + 1) + ' of ' + block.T;
        [posBtn, sndBtn].forEach(function (b) { b.classList.remove('ok', 'bad'); b.classList.toggle('wait', cur < block.n); });
        if (lit) lit.classList.remove('lit');
        lit = cells[NB_CELLS[p]]; lit.classList.add('lit');
        sound(s, cur);
        var shown = Math.min(500, trialMs * 0.4), here = cur;
        later(function () { if (cur === here && lit) lit.classList.remove('lit'); }, shown);
        later(score, trialMs);
      }
      function isTarget(m, i) { return i >= block.n && block[m][i] === block[m][i - block.n]; }
      function respond(m) {
        if (state !== 'running' || cur < 0 || cur < block.n || resp[m]) return;
        resp[m] = true;
        if (fbBox.input.checked) (m === 'pos' ? posBtn : sndBtn).classList.add(isTarget(m, cur) ? 'ok' : 'bad');
      }
      function score() {
        if (cur >= block.n) {
          ['pos', 'snd'].forEach(function (m) {
            var t = isTarget(m, cur), r = resp[m], c = counts[m];
            if (t && r) c.hit++; else if (t) c.miss++; else if (r) c.fa++; else c.cr++;
          });
        }
        next();
      }
      function stop() {
        clearTimers();
        try { if (hasSpeech) speechSynthesis.cancel(); } catch (e) { /* ignore */ }
        state = 'setup';
        stage.dataset.state = 'idle';
        if (lit) lit.classList.remove('lit');
        play.style.display = 'none'; setup.style.display = '';
        showHistory();
      }
      function finish() {
        clearTimers();
        state = 'results';
        stage.dataset.state = 'done';
        if (lit) lit.classList.remove('lit');
        var all = { hit: 0, miss: 0, fa: 0, cr: 0 };
        ['hit', 'miss', 'fa', 'cr'].forEach(function (k) { all[k] = counts.pos[k] + counts.snd[k]; });
        var pct = nbScore(all), n = block.n, nextN = n;
        if (autoBox.input.checked) { if (pct >= 0.8) nextN = Math.min(9, n + 1); else if (pct < 0.5) nextN = Math.max(1, n - 1); }
        level = nextN;
        store('nback-level', level);
        var hist = store('nback-history') || [];
        hist.push({ t: Date.now(), n: n, pct: Math.round(pct * 100), pos: Math.round(nbScore(counts.pos) * 100), snd: Math.round(nbScore(counts.snd) * 100), d: Math.round(dPrime(all) * 100) / 100 });
        if (hist.length > 300) hist = hist.slice(-300);
        store('nback-history', hist);
        played++;
        var verdict = nextN > n ? 'Level up! Next block: ' + nextN + '-back.' : nextN < n ? 'Down to ' + nextN + '-back for the next block.' : 'Staying at ' + n + '-back.';
        function row(label, key, c) {
          return el('tr', td(label, null), td(c.hit, key + '-hit', 'num'), td(c.miss, key + '-miss', 'num'), td(c.fa, key + '-fa', 'num'), td(c.cr, key + '-cr', 'num'),
            td(Math.round(nbScore(c) * 100) + '%', key + '-pct', 'num'), td(dPrime(c).toFixed(2), key + '-d', 'num'));
        }
        play.style.display = 'none';
        fill(after,
          U.panel('Your results', el('div', { class: 'bigscore', dataset: { k: 'score' }, text: n + '-back: ' + Math.round(pct * 100) + '%' }),
            el('p', { dataset: { k: 'verdict', next: String(nextN) }, text: verdict }),
            tableEl(['', 'Hits', 'Misses', 'False alarms', 'Correct rejections', 'Score', 'd′'],
              [row('Position', 'pos', counts.pos), row('Sound', 'snd', counts.snd), row('Both', 'all', all)]),
            U.note('Score = hits ÷ (hits + misses + false alarms), both streams together; it decides the next level. d′ (d-prime) measures how well you tell matches from non-matches whatever your pressing style: 0 is guessing, 1 is fair, 2 is good, 3 or more is excellent.'),
            U.btnrow(U.button('Next block (' + nextN + '-back)', start, 'primary'), U.button('Settings', stop, 'ghost'))));
        showHistory(true);
      }

      function showHistory(keep) {
        if (!keep) fill(after);
        var hist = store('nback-history') || [];
        if (!hist.length) return;
        var best = hist.reduce(function (a, h) { return Math.max(a, h.n); }, 0);
        var last10 = hist.slice(-10);
        var avgN = last10.reduce(function (a, h) { return a + h.n; }, 0) / last10.length;
        var chart = el('canvas', { class: 'hist', width: 800, height: 160 });
        var box = U.panel('Your training on this device',
          U.stats([{ label: 'Highest N', value: best + '-back' }, { label: 'Average N, last ' + last10.length, value: avgN.toFixed(1) }, { label: 'Blocks played', value: String(hist.length) }]),
          el('div', { style: { margin: '12px 0' } }, chart),
          tableEl(['When', 'N', 'Score', 'Position', 'Sound', 'd′'], hist.slice(-8).reverse().map(function (h) {
            return el('tr', td(dateTime(h.t)), td(h.n, null, 'num'), td(h.pct + '%', null, 'num'), td(h.pos + '%', null, 'num'), td(h.snd + '%', null, 'num'), td(Number(h.d).toFixed(2), null, 'num'));
          })),
          U.btnrow(U.button('Clear history', function () { store('nback-history', null); box.remove(); }, 'ghost')));
        put(after, box);
        drawChart(chart, hist.slice(-40));
      }
      function drawChart(cv, list) {
        var c = cv.getContext('2d'), W = cv.width, H = cv.height, pad = 22;
        var fg = cssVar(root, '--fg-muted', '#888'), acc = cssVar(root, '--accent', '#4f46e5');
        c.clearRect(0, 0, W, H);
        c.font = '20px system-ui'; c.fillStyle = fg; c.strokeStyle = fg; c.globalAlpha = 0.35; c.lineWidth = 1;
        for (var n = 1; n <= 9; n += 2) { var y = H - pad - (n - 1) / 8 * (H - 2 * pad); c.beginPath(); c.moveTo(34, y); c.lineTo(W, y); c.stroke(); }
        c.globalAlpha = 1;
        for (n = 1; n <= 9; n += 4) c.fillText(String(n), 6, H - pad - (n - 1) / 8 * (H - 2 * pad) + 7);
        c.strokeStyle = acc; c.fillStyle = acc; c.lineWidth = 3; c.beginPath();
        list.forEach(function (h, i) {
          var x = 44 + (list.length > 1 ? i / (list.length - 1) : 0.5) * (W - 60), y = H - pad - (h.n - 1) / 8 * (H - 2 * pad);
          if (i) c.lineTo(x, y); else c.moveTo(x, y);
        });
        c.stroke();
        list.forEach(function (h, i) {
          var x = 44 + (list.length > 1 ? i / (list.length - 1) : 0.5) * (W - 60), y = H - pad - (h.n - 1) / 8 * (H - 2 * pad);
          c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill();
        });
      }

      function key(e) {
        if (state !== 'running' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || keyTarget(e)) return;
        var k = e.key.toLowerCase();
        if (k === 'a') { e.preventDefault(); respond('pos'); }
        else if (k === 'l') { e.preventDefault(); respond('snd'); }
        else if (k === 'escape') { e.preventDefault(); stop(); }
      }
      document.addEventListener('keydown', key);
      if (hasSpeech) {
        pickVoice();
        try { speechSynthesis.addEventListener('voiceschanged', pickVoice); } catch (e) { /* older engines */ }
      }
      put(root, setup, play, after);
      showHistory();
      /* Exposed for the behaviour checks: the scoring maths, and a way to run
         a block at test speed. */
      root._nback = { dPrime: dPrime, probit: probit, trialMs: function (ms) { override = ms; } };
      U.onTeardown(root, function () {
        clearTimers();
        document.removeEventListener('keydown', key);
        if (hasSpeech) { try { speechSynthesis.cancel(); speechSynthesis.removeEventListener('voiceschanged', pickVoice); } catch (e) { /* ignore */ } }
        if (audio) audio.close().catch(function () {});
      });
    }
  });

  /* ======================================================================
     Schulte Table
     ====================================================================== */

  var SCH_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  Tools.register({
    id: 'schulte-table',
    category: 'brain',
    name: 'Schulte Table',
    description: 'Find the numbers (or letters) in order as fast as you can, from 3×3 to 7×7, with a timer, mistakes, a fixation dot and best times.',
    keywords: ['schulte table', 'schulte grid', 'speed reading', 'peripheral vision', 'attention', 'focus', 'concentration', 'visual search', 'numbers in order', 'eye training', 'brain', 'game'],
    render: function (root) {
      root.classList.add('g-brainb');
      var size = 5, mode = 'numbers', seq = [], next = 0, mistakes = 0, t0 = 0, tick = 0, running = false;
      var sizeChips = U.chips([3, 4, 5, 6, 7].map(function (n) { return { value: String(n), label: n + '×' + n }; }), function (v) { size = Number(v); showBest(); }, '5');
      var modeChips = U.chips([{ value: 'numbers', label: 'Numbers' }, { value: 'letters', label: 'Letters' }], function (v) { mode = v; syncSizes(); showBest(); }, 'numbers');
      var dotBox = U.checkbox('Fixation dot in the centre (keep your eyes on it and search with your side vision)');
      var markBox = U.checkbox('Fade cells once found', { checked: true });
      var bestLine = U.note('');
      var setup = U.panel(null, el('h2', { text: 'Schulte Table', style: { margin: '0 0 6px' } }),
        el('p', { text: 'Click the numbers from 1 upwards (or the letters from A) as fast as you can. The clock starts when the table appears. Training with the fixation dot widens how much you take in at a glance, which helps with speed reading.' }),
        el('div', { class: 'opts' }, U.field('Table', sizeChips), U.field('Fill with', modeChips), dotBox, markBox),
        bestLine,
        U.btnrow(U.button('Start', start, 'primary')));

      var findEl = el('span', { class: 'sch-find' }), timeEl = el('b', { text: '0.0 s' }), missEl = el('b', { text: '0' });
      var gridEl = el('div', { class: 'sch-grid' });
      var wrap = el('div', { class: 'sch-wrap' }, gridEl);
      var play = U.panel(null, el('div', { class: 'hud' }, el('span', {}, 'Find: ', findEl), el('span', {}, 'Time ', timeEl), el('span', {}, 'Mistakes ', missEl), U.button('Stop', stop, 'ghost')),
        el('div', { style: { marginTop: '12px' } }, wrap));
      play.style.display = 'none';
      var after = el('div');

      function syncSizes() {
        /* 26 letters fill at most a 5×5 table */
        Array.prototype.forEach.call(sizeChips.children, function (c, i) {
          var n = i + 3, off = mode === 'letters' && n * n > 26;
          c.disabled = off; c.title = off ? 'Letters only go up to 5×5' : '';
        });
        if (mode === 'letters' && size * size > 26) sizeChips.children[2].click();
      }
      function label(v) { return mode === 'letters' ? SCH_LETTERS[v] : String(v + 1); }
      function keyName() { return 'schulte-' + size + '-' + (mode === 'letters' ? 'l' : 'n'); }
      function showBest() {
        var h = store(keyName()) || [];
        bestLine.textContent = h.length ? 'Your best at ' + size + '×' + size + (mode === 'letters' ? ' letters' : '') + ': ' + Math.min.apply(null, h).toFixed(2) + ' s' : '';
      }
      function start() {
        var cells = size * size;
        seq = shuffle(Array.apply(null, Array(cells)).map(function (_, i) { return i; }));
        next = 0; mistakes = 0; running = true;
        gridEl.style.gridTemplateColumns = gridEl.style.gridTemplateRows = 'repeat(' + size + ',1fr)';
        /* numbers fill about 40% of a cell, measured against the table's own
           width (container units), with a fixed size where those are missing */
        gridEl.style.fontSize = Math.round(200 / size) + 'px';
        gridEl.style.fontSize = (42 / size).toFixed(2) + 'cqi';
        fill(gridEl, seq.map(function (v) {
          var b = el('button', { type: 'button', class: 'sch-cell', dataset: { v: label(v) }, text: label(v) });
          /* React on pointerdown, which is quicker than click on touch
             screens; the click that follows is ignored. Keyboard users get
             the click alone. */
          b.addEventListener('pointerdown', function (e) { if (e.button) return; e.preventDefault(); b._pd = performance.now(); press(v, b); });
          b.addEventListener('click', function () { if (performance.now() - (b._pd || -1e9) > 800) press(v, b); });
          return b;
        }));
        var old = wrap.querySelector('.sch-fix'); if (old) old.remove();
        if (dotBox.input.checked) {
          wrap.appendChild(el('i', { class: 'sch-fix' }));
          /* on odd tables the dot sits on the middle cell: drop its label below the dot */
          if (size % 2) gridEl.children[(cells - 1) / 2].classList.add('under-dot');
        }
        gridEl.dataset.state = 'running';
        findEl.textContent = label(0); missEl.textContent = '0'; timeEl.textContent = '0.0 s';
        setup.style.display = 'none'; fill(after); play.style.display = '';
        reveal(play);
        t0 = performance.now();
        clearInterval(tick);
        tick = setInterval(function () { timeEl.textContent = ((performance.now() - t0) / 1000).toFixed(1) + ' s'; }, 100);
      }
      function press(v, b) {
        if (!running || b.classList.contains('found')) return;
        if (v !== next) {
          mistakes++; missEl.textContent = String(mistakes);
          b.classList.add('wrong');
          setTimeout(function () { b.classList.remove('wrong'); }, 250);
          return;
        }
        next++;
        if (markBox.input.checked) b.classList.add('found');
        if (next >= seq.length) { finish(); return; }
        findEl.textContent = label(next);
      }
      function stop() {
        running = false; clearInterval(tick);
        play.style.display = 'none'; setup.style.display = '';
        showBest(); showHistory();
      }
      function finish() {
        running = false; clearInterval(tick);
        var secs = Math.round((performance.now() - t0) / 10) / 100;
        timeEl.textContent = secs.toFixed(2) + ' s';
        gridEl.dataset.state = 'done';
        var key = keyName(), h = store(key) || [], best = h.length ? Math.min.apply(null, h) : null;
        h.push(secs); if (h.length > 100) h = h.slice(-100);
        store(key, h);
        var cells = size * size;
        fill(after,
          U.panel('Your results', el('div', { class: 'bigscore', dataset: { k: 'time' }, text: secs.toFixed(2) + ' s' }),
            el('p', { text: size + '×' + size + (mode === 'letters' ? ' letters' : ' numbers') + (dotBox.input.checked ? ', with the fixation dot' : '') + '.' }),
            U.stats([{ label: 'Mistakes', value: String(mistakes) }, { label: 'Per cell', value: (secs / cells).toFixed(2) + ' s' }, { label: 'Cells', value: String(cells) }]),
            best === null || secs < best ? U.note('New personal best', 'ok') : U.note('Your best: ' + best.toFixed(2) + ' s'),
            el('span', { hidden: true, dataset: { k: 'mistakes' }, text: String(mistakes) }),
            U.btnrow(U.button('Play again', start, 'primary'), U.button('Settings', stop, 'ghost'))));
        showHistory(true);
      }
      function showHistory(keep) {
        if (!keep) fill(after);
        var rows = [];
        [3, 4, 5, 6, 7].forEach(function (n) {
          ['n', 'l'].forEach(function (m) {
            var h = store('schulte-' + n + '-' + m) || [];
            if (!h.length) return;
            var last = h.slice(-5), avg = last.reduce(function (a, b) { return a + b; }, 0) / last.length;
            rows.push(el('tr', td(n + '×' + n + (m === 'l' ? ' letters' : '')), td(Math.min.apply(null, h).toFixed(2) + ' s', 'best-' + n + '-' + m, 'num'), td(avg.toFixed(2) + ' s', null, 'num'), td(h.length, null, 'num')));
          });
        });
        if (!rows.length) return;
        var box = U.panel('Best times on this device', tableEl(['Table', 'Best', 'Average of last 5', 'Played'], rows),
          U.btnrow(U.button('Clear', function () {
            [3, 4, 5, 6, 7].forEach(function (n) { store('schulte-' + n + '-n', null); store('schulte-' + n + '-l', null); });
            box.remove(); showBest();
          }, 'ghost')));
        put(after, box);
      }
      put(root, setup, play, after);
      syncSizes(); showBest(); showHistory();
      U.onTeardown(root, function () { clearInterval(tick); });
    }
  });

  /* ======================================================================
     Mental Maths Drill
     ====================================================================== */

  var MM_OPS = { add: '+', sub: '−', mul: '×', div: '÷' };

  /* An n-digit operand. One-digit factors and divisors start at 2, so the
     drill never asks for × 1 or ÷ 1. */
  function mmRange(d, noOne) { return d <= 1 ? [noOne ? 2 : 1, 9] : [Math.pow(10, d - 1), Math.pow(10, d) - 1]; }
  function mmQuestion(op, cfg) {
    var a, b, ans, r;
    if (op === 'add' || op === 'sub') {
      r = mmRange(cfg.da); a = randInt(r[0], r[1]);
      r = mmRange(cfg.db); b = randInt(r[0], r[1]);
      if (op === 'sub' && !cfg.negatives && b > a) { var t = a; a = b; b = t; }
      ans = op === 'add' ? a + b : a - b;
    } else if (op === 'mul') {
      if (cfg.tables) { var tb = pick(cfg.tableList), k = randInt(1, 12); if (Math.random() < 0.5) { a = tb; b = k; } else { a = k; b = tb; } }
      else { r = mmRange(cfg.da, true); a = randInt(r[0], r[1]); r = mmRange(cfg.db, true); b = randInt(r[0], r[1]); }
      ans = a * b;
    } else {
      /* build division backwards so the answer is always whole */
      var d, q;
      if (cfg.tables) { d = pick(cfg.tableList); q = randInt(1, 12); }
      else { r = mmRange(cfg.db, true); d = randInt(r[0], r[1]); r = mmRange(cfg.da, true); q = randInt(r[0], r[1]); }
      a = d * q; b = d; ans = q;
    }
    return { a: a, b: b, op: op, answer: ans, text: a + ' ' + MM_OPS[op] + ' ' + b };
  }

  Tools.register({
    id: 'mental-maths',
    category: 'brain',
    name: 'Mental Maths Drill',
    description: 'Quick-fire sums: add, subtract, multiply, divide or mix them, by digit size or chosen times tables, against the clock, with streaks, speed stats and a review of mistakes.',
    keywords: ['mental maths', 'mental math', 'arithmetic', 'times tables', 'multiplication', 'division', 'addition', 'subtraction', 'sums', 'quick maths', 'speed maths', 'math drill', 'zetamac', 'practice', 'kids', 'school', 'brain', 'game'],
    render: function (root) {
      root.classList.add('g-brainb');
      var cfg = null, q = null, typed = '', log = [], streak = 0, bestStreak = 0, shownAt = 0, t0 = 0, endAt = 0, tick = 0, state = 'setup', fbTimer = 0;
      var opChips = U.chips([{ value: 'add', label: '+ Add' }, { value: 'sub', label: '− Subtract' }, { value: 'mul', label: '× Multiply' }, { value: 'div', label: '÷ Divide' }, { value: 'mix', label: 'Mixed' }], sync, 'mix');
      var digitOpts = [1, 2, 3, 4].map(function (n) { return { value: String(n), label: n + (n === 1 ? ' digit' : ' digits') }; });
      var daSel = U.select({ label: 'First number', options: digitOpts, value: '2' });
      var dbSel = U.select({ label: 'Second number', options: digitOpts, value: '1' });
      var tablesBox = U.checkbox('Use times tables for × and ÷', { checked: false });
      var tableBtns = [];
      var tablesWrap = el('div', { class: 'tables', role: 'group', 'aria-label': 'Times tables' });
      for (var n = 1; n <= 12; n++) (function (t) {
        var b = el('button', { type: 'button', class: 'chip' + (t >= 2 ? ' on' : ''), 'aria-pressed': String(t >= 2), dataset: { t: String(t) }, text: t + '×' });
        b.addEventListener('click', function () { var on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
        tableBtns.push(b); tablesWrap.appendChild(b);
      })(n);
      var tablesField = U.field('Tables (each up to × 12)', tablesWrap);
      var negBox = U.checkbox('Allow negative answers');
      var roundChips = U.chips([{ value: 't60', label: '60 seconds' }, { value: 'q10', label: '10 questions' }, { value: 'q20', label: '20 questions' }, { value: 'q50', label: '50 questions' }], null, 't60');
      var autoBox = U.checkbox('Accept the right answer as soon as it is typed (no Enter needed)', { checked: true });
      var bestLine = U.note('');
      var digitsRow = el('div', { class: 'row' }, el('div', { class: 'grow' }, daSel), el('div', { class: 'grow' }, dbSel));
      var digitsHint = U.note('');
      var setup = U.panel(null, el('h2', { text: 'Mental Maths Drill', style: { margin: '0 0 6px' } }),
        el('p', { text: 'Answer as many as you can. Type with the keyboard or tap the number pad, then press Enter.' }),
        el('div', { class: 'opts' }, U.field('Sums', opChips), digitsRow, digitsHint, tablesBox, tablesField, negBox, U.field('Round', roundChips), autoBox),
        bestLine,
        U.btnrow(U.button('Start', start, 'primary')));

      var hudLeft = el('b'), hudScore = el('b', { text: '0' }), hudStreak = el('b', { text: '0' });
      var qEl = el('div', { class: 'mm-q', 'aria-live': 'polite' });
      var aEl = el('div', { class: 'mm-a', dataset: { k: 'typed' } });
      var fbEl = el('div', { class: 'mm-fb note' });
      /* Pad keys never take focus, so Enter on a real keyboard cannot also
         "press" the last key tapped. */
      function padBtn(label, fn, cls, aria) {
        return el('button', { type: 'button', class: 'btn' + (cls ? ' ' + cls : ''), 'aria-label': aria || label, onclick: fn, onpointerdown: function (e) { e.preventDefault(); } }, label);
      }
      var signBtn = padBtn('±', function () { typeKey('-'); }, null, 'Minus sign');
      var pad = el('div', { class: 'mm-pad' },
        [7, 8, 9, 4, 5, 6, 1, 2, 3].map(function (d) { return padBtn(String(d), function () { typeKey(String(d)); }); }),
        signBtn, padBtn('0', function () { typeKey('0'); }), padBtn('⌫', function () { typeKey('Backspace'); }, null, 'Delete'),
        padBtn('Enter ✓', function () { typeKey('Enter'); }, 'primary wide', 'Enter'));
      var play = U.panel(null, el('div', { class: 'hud' }, el('span', {}, hudLeft), el('span', {}, 'Correct ', hudScore), el('span', {}, 'Streak ', hudStreak), U.button('End round', finish, 'ghost')),
        qEl, aEl, fbEl, pad);
      play.style.display = 'none';
      var after = el('div');

      function selectedTables() { return tableBtns.filter(function (b) { return b.classList.contains('on'); }).map(function (b) { return Number(b.dataset.t); }); }
      function sync() {
        var op = opChips.value, usesTables = op === 'mul' || op === 'div' || op === 'mix';
        tablesBox.style.display = usesTables ? '' : 'none';
        tablesField.style.display = usesTables && tablesBox.input.checked ? '' : 'none';
        negBox.style.display = op === 'sub' || op === 'mix' ? '' : 'none';
        var tablesOnly = (op === 'mul' || op === 'div') && tablesBox.input.checked;
        digitsRow.style.display = tablesOnly ? 'none' : '';
        digitsHint.textContent = op === 'div' || op === 'mix' ? 'For ÷ the answer has the first number of digits and the divisor the second, and it always divides exactly.' : '';
        showBest();
      }
      tablesBox.input.addEventListener('change', sync);
      function settingsKey() {
        var op = opChips.value, tab = tablesBox.input.checked && op !== 'add' && op !== 'sub';
        return 'maths-' + op + '-' + (tab ? 't' + selectedTables().join('.') : daSel.querySelector('select').value + dbSel.querySelector('select').value) + '-' + roundChips.value;
      }
      function showBest() {
        var h = store(settingsKey()) || [];
        bestLine.textContent = h.length ? 'Your best with these settings: ' + Math.max.apply(null, h).toFixed(1) + ' correct a minute.' : '';
      }
      function start() {
        var op = opChips.value;
        cfg = {
          ops: op === 'mix' ? ['add', 'sub', 'mul', 'div'] : [op],
          da: Number(daSel.querySelector('select').value), db: Number(dbSel.querySelector('select').value),
          tables: tablesBox.input.checked && op !== 'add' && op !== 'sub', tableList: selectedTables(),
          negatives: negBox.input.checked, round: roundChips.value, key: settingsKey()
        };
        if (cfg.tables && !cfg.tableList.length) { U.toast('Pick at least one times table', 'err'); return; }
        log = []; streak = 0; bestStreak = 0; q = null; state = 'running';
        signBtn.disabled = !cfg.negatives || cfg.ops.indexOf('sub') === -1;
        hudScore.textContent = '0'; hudStreak.textContent = '0'; fbEl.textContent = '';
        setup.style.display = 'none'; fill(after); play.style.display = '';
        reveal(play);
        t0 = performance.now();
        endAt = cfg.round === 't60' ? t0 + 60000 : 0;
        clearInterval(tick);
        tick = setInterval(updateClock, 100);
        updateClock();
        ask();
      }
      function totalQs() { return cfg.round === 't60' ? 0 : Number(cfg.round.slice(1)); }
      function updateClock() {
        if (state !== 'running') return;
        var now = performance.now();
        if (endAt) {
          var left = Math.max(0, Math.ceil((endAt - now) / 1000));
          hudLeft.textContent = left + ' s left';
          hudLeft.dataset.left = String(left);
          if (now >= endAt) finish();
        } else hudLeft.textContent = 'Question ' + Math.min(log.length + 1, totalQs()) + ' of ' + totalQs() + ' · ' + ((now - t0) / 1000).toFixed(0) + ' s';
      }
      function ask() {
        var nq, tries = 0;
        do { nq = mmQuestion(pick(cfg.ops), cfg); tries++; } while (q && nq.text === q.text && tries < 20);
        q = nq; typed = '';
        qEl.textContent = q.text + ' =';
        qEl.dataset.a = String(q.a); qEl.dataset.b = String(q.b); qEl.dataset.op = q.op;
        aEl.textContent = ''; aEl.className = 'mm-a';
        shownAt = performance.now();
        if (!endAt) updateClock();
      }
      function typeKey(k) {
        if (state !== 'running') return;
        if (k === 'Enter') { if (typed !== '' && typed !== '-') submit(); return; }
        if (k === 'Backspace') typed = typed.slice(0, -1);
        else if (k === '-') { if (!signBtn.disabled) typed = typed.charAt(0) === '-' ? typed.slice(1) : '-' + typed; }
        else if (/^\d$/.test(k) && typed.replace('-', '').length < 7) typed += k;
        aEl.textContent = typed;
        aEl.className = 'mm-a';
        if (autoBox.input.checked && typed !== '' && typed !== '-' && Number(typed) === q.answer) submit();
      }
      function submit() {
        var given = Number(typed), ok = given === q.answer, ms = performance.now() - shownAt;
        log.push({ text: q.text, op: q.op, answer: q.answer, given: typed, ok: ok, ms: ms });
        if (ok) { streak++; bestStreak = Math.max(bestStreak, streak); }
        else streak = 0;
        hudScore.textContent = String(log.filter(function (r) { return r.ok; }).length);
        hudStreak.textContent = String(streak);
        aEl.className = 'mm-a ' + (ok ? 'ok' : 'bad');
        fbEl.textContent = ok ? (streak >= 5 && streak % 5 === 0 ? streak + ' in a row!' : '') : '✗ ' + q.text + ' = ' + q.answer;
        fbEl.className = 'mm-fb note' + (ok ? ' ok' : ' err');
        clearTimeout(fbTimer);
        if (!ok) fbTimer = setTimeout(function () { if (state === 'running') { fbEl.textContent = ''; } }, 1800);
        if (totalQs() && log.length >= totalQs()) { finish(); return; }
        ask();
      }
      function fmtS(ms) { return (ms / 1000).toFixed(2) + ' s'; }
      function finish() {
        if (state !== 'running') return;
        state = 'results';
        clearInterval(tick);
        var elapsed = Math.min(performance.now(), endAt || Infinity) - t0;
        var right = log.filter(function (r) { return r.ok; }), wrong = log.filter(function (r) { return !r.ok; });
        var perMin = elapsed > 0 ? right.length / (elapsed / 60000) : 0;
        var acc = log.length ? Math.round(right.length / log.length * 100) : 0;
        var times = right.map(function (r) { return r.ms; });
        var avg = times.length ? times.reduce(function (a, b) { return a + b; }, 0) / times.length : 0;
        var key = cfg.key, h = store(key) || [], best = h.length ? Math.max.apply(null, h) : null;
        var score = Math.round(perMin * 10) / 10;
        if (log.length) { h.push(score); if (h.length > 100) h = h.slice(-100); store(key, h); }
        var ops = ['add', 'sub', 'mul', 'div'].filter(function (o) { return log.some(function (r) { return r.op === o; }); });
        var slow = right.slice().sort(function (a, b) { return b.ms - a.ms; }).slice(0, 3);
        play.style.display = 'none';
        fill(after,
          U.panel('Your results',
            el('div', { class: 'bigscore', dataset: { k: 'correct' }, text: right.length + ' correct' }),
            el('p', { text: (cfg.round === 't60' && elapsed >= 59990 ? 'In 60 seconds' : log.length + ' question' + (log.length === 1 ? '' : 's') + ' in ' + (elapsed / 1000).toFixed(1) + ' s') + ' · ' + score + ' correct a minute.' }),
            U.stats([{ label: 'Wrong', value: String(wrong.length) }, { label: 'Accuracy', value: acc + '%' }, { label: 'Average per right answer', value: times.length ? fmtS(avg) : '–' },
              { label: 'Fastest', value: times.length ? fmtS(Math.min.apply(null, times)) : '–' }, { label: 'Slowest', value: times.length ? fmtS(Math.max.apply(null, times)) : '–' }, { label: 'Best streak', value: String(bestStreak) }]),
            el('span', { hidden: true, dataset: { k: 'summary', right: String(right.length), wrong: String(wrong.length), acc: String(acc), streak: String(bestStreak) } }),
            !log.length ? null : best === null || score > best ? U.note('New personal best for these settings', 'ok') : U.note('Your best with these settings: ' + best.toFixed(1) + ' correct a minute'),
            ops.length > 1 ? tableEl(['Sum', 'Asked', 'Right', 'Average time'], ops.map(function (o) {
              var list = log.filter(function (r) { return r.op === o; }), ok = list.filter(function (r) { return r.ok; });
              return el('tr', td(MM_OPS[o]), td(list.length, null, 'num'), td(ok.length, null, 'num'), td(ok.length ? fmtS(ok.reduce(function (a, r) { return a + r.ms; }, 0) / ok.length) : '–', null, 'num'));
            })) : null,
            U.btnrow(U.button('Play again', start, 'primary'), U.button('Settings', toSetup, 'ghost'))),
          U.panel('Mistakes to review', wrong.length ? tableEl(['Question', 'You said', 'Answer'], wrong.map(function (r) {
            return el('tr', { dataset: { k: 'mistake' } }, td(r.text), td(r.given, null, 'num'), td(r.answer, null, 'num'));
          })) : U.note(log.length ? 'No mistakes. Well done.' : 'No answers this round.', log.length ? 'ok' : null)),
          slow.length ? U.panel('Your slowest right answers', U.note('Worth practising: these took longest.'), tableEl(['Question', 'Time'], slow.map(function (r) { return el('tr', td(r.text + ' = ' + r.answer), td(fmtS(r.ms), null, 'num')); }))) : null,
          historyBlock('Your results with these settings', store(key), function (v) { return (Math.round(v * 10) / 10) + ' a minute'; }, function (a, b) { return a > b; }, function () { store(key, null); showBest(); }));
      }
      function toSetup() {
        state = 'setup'; clearInterval(tick);
        play.style.display = 'none'; setup.style.display = ''; fill(after);
        showBest();
      }
      function key(e) {
        if (state !== 'running' || e.ctrlKey || e.metaKey || e.altKey || keyTarget(e)) return;
        if (/^\d$/.test(e.key) || e.key === 'Backspace' || e.key === 'Enter' || e.key === '-') { e.preventDefault(); typeKey(e.key); }
        else if (e.key === 'Escape') { e.preventDefault(); finish(); }
      }
      document.addEventListener('keydown', key);
      [daSel, dbSel].forEach(function (s) { s.querySelector('select').addEventListener('change', showBest); });
      roundChips.addEventListener('click', showBest);
      put(root, setup, play, after);
      sync();
      root._maths = { question: mmQuestion };
      U.onTeardown(root, function () { clearInterval(tick); clearTimeout(fbTimer); document.removeEventListener('keydown', key); });
    }
  });
})();
