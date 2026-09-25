/* audio-c tools: Piano & Chord Finder. A playable keyboard with a small Web
   Audio synth, a chord namer for whatever notes are down, and a chord and
   scale library that lights up the keys. No samples: every note is made by
   oscillators in the tab. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-audio-c-style')) {
    document.head.appendChild(el('style', { id: 'g-audio-c-style', text: [
      '.g-pno .pno-wrap{overflow-x:auto;padding-bottom:4px}',
      '.g-pno .pno{position:relative;height:190px;user-select:none;touch-action:none;margin:0 auto}',
      '.g-pno .pk{position:absolute;top:0;box-sizing:border-box;border:1px solid #555;border-radius:0 0 6px 6px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;padding-bottom:6px;font:600 11px var(--sans);cursor:pointer}',
      '.g-pno .pk.w{height:100%;background:#fdfdfd;color:#666;z-index:1}',
      '.g-pno .pk.b{height:62%;background:#1b1c20;color:#bbb;z-index:2;border-color:#000}',
      '.g-pno .pk.hint{background:var(--accent-weak)}',
      '.g-pno .pk.b.hint{background:#4a4670}',
      '.g-pno .pk.sel{background:var(--accent);color:var(--accent-fg)}',
      '.g-pno .pk.b.sel{background:var(--accent);color:var(--accent-fg)}',
      '.g-pno .pk.down{filter:brightness(.85);box-shadow:inset 0 -4px 0 #0003}',
      '.g-pno .pk .kb{opacity:.55;font-size:10px;font-family:var(--mono)}',
      '.g-pno .pk .nm{font-size:11px}',
      '.g-pno .pno-bar{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center}',
      '.g-pno .pno-bar select{width:auto}',
      '.g-pno .chord-name{font-size:2.2em;font-weight:800;line-height:1.1;min-height:1.1em}',
      '.g-pno .chord-alt{color:var(--fg-muted);font-size:14px}',
      '.g-pno .ivals{display:flex;flex-wrap:wrap;gap:6px}',
      '.g-pno .ival{border:1px solid var(--border);border-radius:var(--radius-s);padding:6px 10px;background:var(--bg-sunken);text-align:center;min-width:52px}',
      '.g-pno .ival b{display:block;font-size:18px}',
      '.g-pno .ival span{font-size:12px;color:var(--fg-muted)}',
      '.g-pno .diatonic{display:flex;flex-wrap:wrap;gap:6px}',
      '.g-pno .diatonic .btn{padding:6px 10px}'
    ].join('\n') }));
  }

  var SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  var FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
  var IVAL = ['R', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♯5', '6', '♭7', '7'];
  var IVAL_LONG = ['root', 'minor 2nd', 'major 2nd', 'minor 3rd', 'major 3rd', 'perfect 4th', 'tritone', 'perfect 5th', 'minor 6th', 'major 6th', 'minor 7th', 'major 7th'];
  var BLACK = [1, 3, 6, 8, 10];

  /* Chord shapes as semitones above the root. Order is preference when two
     names fit the same notes equally well. Extended chords name their
     degrees above the octave (9 = 2, 11 = 4, 13 = 6). */
  var CHORDS = [
    { sym: '', name: 'major', iv: [0, 4, 7] },
    { sym: 'm', name: 'minor', iv: [0, 3, 7] },
    { sym: '7', name: 'dominant 7th', iv: [0, 4, 7, 10] },
    { sym: 'maj7', name: 'major 7th', iv: [0, 4, 7, 11] },
    { sym: 'm7', name: 'minor 7th', iv: [0, 3, 7, 10] },
    { sym: 'dim', name: 'diminished', iv: [0, 3, 6] },
    { sym: 'aug', name: 'augmented', iv: [0, 4, 8] },
    { sym: 'sus4', name: 'suspended 4th', iv: [0, 5, 7] },
    { sym: 'sus2', name: 'suspended 2nd', iv: [0, 2, 7] },
    { sym: '6', name: 'major 6th', iv: [0, 4, 7, 9] },
    { sym: 'm6', name: 'minor 6th', iv: [0, 3, 7, 9] },
    { sym: 'dim7', name: 'diminished 7th', iv: [0, 3, 6, 9] },
    { sym: 'm7♭5', name: 'half-diminished', iv: [0, 3, 6, 10] },
    { sym: 'm(maj7)', name: 'minor major 7th', iv: [0, 3, 7, 11] },
    { sym: '7sus4', name: 'dominant 7th sus4', iv: [0, 5, 7, 10] },
    { sym: 'aug7', name: 'augmented 7th', iv: [0, 4, 8, 10] },
    { sym: 'maj7♯5', name: 'augmented major 7th', iv: [0, 4, 8, 11] },
    { sym: '7♭5', name: 'dominant 7th flat 5', iv: [0, 4, 6, 10] },
    { sym: 'add9', name: 'added 9th', iv: [0, 2, 4, 7] },
    { sym: 'm(add9)', name: 'minor added 9th', iv: [0, 2, 3, 7] },
    { sym: '9', name: 'dominant 9th', iv: [0, 2, 4, 7, 10] },
    { sym: 'maj9', name: 'major 9th', iv: [0, 2, 4, 7, 11] },
    { sym: 'm9', name: 'minor 9th', iv: [0, 2, 3, 7, 10] },
    { sym: '6/9', name: 'six-nine', iv: [0, 2, 4, 7, 9] },
    { sym: '7♭9', name: 'dominant 7th flat 9', iv: [0, 1, 4, 7, 10] },
    { sym: '7♯9', name: 'dominant 7th sharp 9', iv: [0, 3, 4, 7, 10] },
    { sym: '11', name: 'dominant 11th', iv: [0, 2, 4, 5, 7, 10] },
    { sym: 'm11', name: 'minor 11th', iv: [0, 2, 3, 5, 7, 10] },
    { sym: '13', name: 'dominant 13th', iv: [0, 2, 4, 7, 9, 10] },
    { sym: 'maj13', name: 'major 13th', iv: [0, 2, 4, 7, 9, 11] },
    { sym: '5', name: 'power chord', iv: [0, 7] },
    /* Common voicings that leave the 5th out. */
    { sym: '7', name: 'dominant 7th (no 5th)', iv: [0, 4, 10], no5: true },
    { sym: 'maj7', name: 'major 7th (no 5th)', iv: [0, 4, 11], no5: true },
    { sym: 'm7', name: 'minor 7th (no 5th)', iv: [0, 3, 10], no5: true },
    { sym: '9', name: 'dominant 9th (no 5th)', iv: [0, 2, 4, 10], no5: true }
  ];
  var LIB = CHORDS.filter(function (c) { return !c.no5; });

  var SCALES = [
    { name: 'Major (Ionian)', iv: [0, 2, 4, 5, 7, 9, 11], triads: true },
    { name: 'Natural minor (Aeolian)', iv: [0, 2, 3, 5, 7, 8, 10], triads: true },
    { name: 'Harmonic minor', iv: [0, 2, 3, 5, 7, 8, 11], triads: true },
    { name: 'Melodic minor (ascending)', iv: [0, 2, 3, 5, 7, 9, 11], triads: true },
    { name: 'Major pentatonic', iv: [0, 2, 4, 7, 9] },
    { name: 'Minor pentatonic', iv: [0, 3, 5, 7, 10] },
    { name: 'Blues', iv: [0, 3, 5, 6, 7, 10] },
    { name: 'Dorian', iv: [0, 2, 3, 5, 7, 9, 10], triads: true },
    { name: 'Phrygian', iv: [0, 1, 3, 5, 7, 8, 10], triads: true },
    { name: 'Lydian', iv: [0, 2, 4, 6, 7, 9, 11], triads: true },
    { name: 'Mixolydian', iv: [0, 2, 4, 5, 7, 9, 10], triads: true },
    { name: 'Locrian', iv: [0, 1, 3, 5, 6, 8, 10], triads: true },
    { name: 'Whole tone', iv: [0, 2, 4, 6, 8, 10] },
    { name: 'Chromatic', iv: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }
  ];

  function mod12(n) { return ((n % 12) + 12) % 12; }

  /* Name the chord made by a set of MIDI notes. Returns a ranked list of
     { label, name, root, bass, kind } or [] when nothing fits. */
  function identify(notes, names) {
    names = names || SHARP;
    if (!notes.length) return [];
    var sorted = notes.slice().sort(function (a, b) { return a - b; });
    var bass = mod12(sorted[0]);
    var pcs = [];
    sorted.forEach(function (n) { var p = mod12(n); if (pcs.indexOf(p) === -1) pcs.push(p); });
    if (pcs.length === 1) return [{ label: names[pcs[0]], name: 'single note', root: pcs[0], bass: bass, rank: 0 }];

    var found = [];
    function tryMatch(set, slash) {
      set.forEach(function (root) {
        var rel = set.map(function (p) { return mod12(p - root); }).sort(function (a, b) { return a - b; });
        CHORDS.forEach(function (c, ci) {
          if (c.iv.length !== rel.length || c.iv.some(function (v, i) { return v !== rel[i]; })) return;
          var label = names[root] + c.sym, name = names[root] + ' ' + c.name, rank;
          if (slash) {
            label += '/' + names[bass];
            name += ' over ' + names[bass];
            rank = 20;
          } else if (root === bass) {
            rank = 0;
          } else {
            var deg = mod12(bass - root);
            var inv = deg === 3 || deg === 4 ? 'first inversion' : (deg === 7 || deg === 6 || deg === 8) ? 'second inversion' : (deg === 10 || deg === 11 || deg === 9) && c.iv.length >= 4 ? 'third inversion' : 'inversion';
            label += '/' + names[bass];
            name += ', ' + inv;
            rank = 10;
          }
          found.push({ label: label, name: name, root: root, bass: bass, rank: rank + ci / 100 + (c.no5 ? 3 : 0) });
        });
      });
    }
    tryMatch(pcs, false);
    if (pcs.length >= 3) tryMatch(pcs.filter(function (p) { return p !== bass; }), true);
    found.sort(function (a, b) { return a.rank - b.rank; });
    var seen = {};
    return found.filter(function (f) { return !seen[f.label] && (seen[f.label] = true); });
  }

  /* --- synth ------------------------------------------------------------ */

  function Synth() {
    var ctx = null, master = null, voices = {};
    function ensure() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) throw new Error('This browser has no Web Audio');
        ctx = new AC();
        var comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -18; comp.ratio.value = 4;
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(comp); comp.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function freq(n) { return 440 * Math.pow(2, (n - 69) / 12); }
    /* A soft electric-piano-ish tone: a triangle and a quieter sine an octave
       up, through a low-pass that closes as the note decays. */
    function start(note, velocity, when) {
      var c = ensure(), t = when || c.currentTime, v = (velocity === undefined ? 0.8 : velocity);
      stop(note, t);
      var f = freq(note);
      var o1 = c.createOscillator(), o2 = c.createOscillator(), o3 = c.createOscillator();
      o1.type = 'triangle'; o1.frequency.value = f;
      o2.type = 'sine'; o2.frequency.value = f * 2;
      o3.type = 'sine'; o3.frequency.value = f; o3.detune.value = 4;
      var g2 = c.createGain(); g2.gain.value = 0.25;
      var filt = c.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(Math.min(12000, f * 8), t);
      filt.frequency.exponentialRampToValueAtTime(Math.max(300, f * 2), t + 1.6);
      var env = c.createGain();
      var peak = 0.22 * v;
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(peak, t + 0.008);
      env.gain.exponentialRampToValueAtTime(peak * 0.35, t + 0.9);
      env.gain.exponentialRampToValueAtTime(peak * 0.12, t + 4);
      o1.connect(filt); o3.connect(filt); o2.connect(g2); g2.connect(filt);
      filt.connect(env); env.connect(master);
      [o1, o2, o3].forEach(function (o) { o.start(t); });
      voices[note] = { env: env, oscs: [o1, o2, o3] };
    }
    function stop(note, when) {
      var v = voices[note];
      if (!v || !ctx) return;
      var t = Math.max(when || 0, ctx.currentTime);
      v.env.gain.cancelScheduledValues(t);
      v.env.gain.setTargetAtTime(0.0001, t, 0.12);
      v.oscs.forEach(function (o) { try { o.stop(t + 0.8); } catch (e) { /* already stopped */ } });
      delete voices[note];
    }
    function now() { return ensure().currentTime; }
    function close() { if (ctx) { try { ctx.close(); } catch (e) { /* closed */ } ctx = null; voices = {}; } }
    return { start: start, stop: stop, now: now, close: close, stopAll: function () { Object.keys(voices).forEach(function (n) { stop(+n); }); } };
  }

  /* Computer keyboard: the home row plays white keys, the row above the black
     keys, starting at the left-hand C of the visible range. */
  var KEYMAP = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14, p: 15, ';': 16, "'": 17 };

  Tools.register({
    id: 'piano-chords', category: 'audio', name: 'Piano & Chord Finder',
    description: 'Play an on-screen piano with the mouse, touch, your computer keyboard or a MIDI keyboard, name any chord you play, and look up chords and scales on the keys.',
    keywords: ['piano', 'keyboard', 'chord', 'chord finder', 'chord namer', 'what chord is this', 'identify chord', 'chord library', 'chord chart',
      'scale', 'scales', 'inversion', 'slash chord', 'music theory', 'intervals', 'midi', 'virtual piano', 'online piano', 'synth', 'modes', 'arpeggio'],
    render: function (root) {
      root.classList.add('g-pno');
      var synth = Synth();
      var names = SHARP;
      var lowC = 48; /* C3 */
      var octaves = 3;
      var selected = {};   /* latched notes in the finder */
      var held = {};       /* notes physically down right now (mouse, keys, MIDI) */
      var hint = {};       /* keys lit by the library */
      var keyEls = {};

      var mode = U.chips([{ value: 'find', label: 'Chord finder' }, { value: 'chords', label: 'Chord library' }, { value: 'scales', label: 'Scales' }], function (v) { setMode(v); }, 'find');
      var spell = U.chips([{ value: 'sharp', label: '♯' }, { value: 'flat', label: '♭' }], function (v) { names = v === 'flat' ? FLAT : SHARP; buildKeys(); refresh(); }, 'sharp');
      var octSel = U.select({ options: [{ value: '2', label: '2 octaves' }, { value: '3', label: '3 octaves' }, { value: '4', label: '4 octaves' }], value: '3' });
      octSel.addEventListener('change', function () { octaves = +octSel.value; buildKeys(); refresh(); });
      var showLabels = U.checkbox('Note names', { checked: true });
      showLabels.input.addEventListener('change', function () { buildKeys(); refresh(); });
      var showKeys = U.checkbox('Keyboard letters', { checked: true });
      showKeys.input.addEventListener('change', function () { buildKeys(); refresh(); });

      var keyboard = el('div', { class: 'pno', dataset: { k: 'piano' } });
      var midiNote = U.note('');

      function noteName(n) { return names[mod12(n)] + (Math.floor(n / 12) - 1); }

      function buildKeys() {
        keyboard.replaceChildren();
        keyEls = {};
        var whiteW = Math.max(26, Math.min(44, Math.floor(880 / (octaves * 7 + 1)))), x = 0;
        var top = lowC + octaves * 12;
        for (var n = lowC; n <= top; n++) {
          var pc = mod12(n), black = BLACK.indexOf(pc) > -1, off = n - lowC;
          var kbLetter = null;
          Object.keys(KEYMAP).forEach(function (k) { if (KEYMAP[k] === off) kbLetter = k.toUpperCase(); });
          var key = el('div', { class: 'pk ' + (black ? 'b' : 'w'), dataset: { note: n } },
            showKeys.input.checked && kbLetter ? el('span', { class: 'kb', text: kbLetter }) : null,
            showLabels.input.checked && (!black || whiteW >= 34) ? el('span', { class: 'nm', text: black ? names[pc] : noteName(n) }) : null);
          if (black) { key.style.left = (x - whiteW * 0.32) + 'px'; key.style.width = (whiteW * 0.64) + 'px'; }
          else { key.style.left = x + 'px'; key.style.width = whiteW + 'px'; x += whiteW; }
          keyEls[n] = key;
          keyboard.appendChild(key);
        }
        keyboard.style.width = x + 'px';
      }

      function paintKeys() {
        var finder = mode.value === 'find';
        Object.keys(keyEls).forEach(function (n) {
          var k = keyEls[n], on = (finder && !!selected[n]) || !!held[n];
          k.classList.toggle('sel', on);
          k.classList.toggle('down', !!held[n]);
          k.classList.toggle('hint', !!hint[n] && !on);
        });
      }

      /* --- playing ------------------------------------------------------- */

      function press(n, vel) {
        if (held[n]) return;
        held[n] = true;
        try { synth.start(n, vel); } catch (e) { U.toast(e.message, 'err'); }
        if (mode.value === 'find') {
          if (latch.input.checked && pointerDown) { if (selected[n]) delete selected[n]; else selected[n] = true; }
        }
        refresh();
      }
      function release(n) {
        if (!held[n]) return;
        delete held[n];
        synth.stop(n);
        /* Without latching, the chord you last held stays named until you
           play something else. */
        if (mode.value === 'find' && !latch.input.checked && !Object.keys(held).length) {
          paintKeys();
          return;
        }
        refresh();
      }
      var lastHeld = [];

      var pointerDown = false, pointerNotes = {};
      function noteAt(ev) {
        var t = document.elementFromPoint(ev.clientX, ev.clientY);
        var k = t && t.closest ? t.closest('.pk') : null;
        return k && keyboard.contains(k) ? +k.dataset.note : null;
      }
      keyboard.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        var n = noteAt(ev);
        if (n === null) return;
        pointerDown = true;
        pointerNotes[ev.pointerId] = n;
        press(n, 0.8);
        pointerDown = false;
        try { keyboard.setPointerCapture(ev.pointerId); } catch (e) { /* synthetic event */ }
      });
      keyboard.addEventListener('pointermove', function (ev) {
        if (!(ev.pointerId in pointerNotes)) return;
        var n = noteAt(ev);
        if (n === null || n === pointerNotes[ev.pointerId]) return;
        release(pointerNotes[ev.pointerId]);
        pointerNotes[ev.pointerId] = n;
        if (mode.value === 'find' && latch.input.checked) { held[n] = true; synth.start(n, 0.8); refresh(); }
        else press(n, 0.8);
      });
      function endPointer(ev) {
        if (!(ev.pointerId in pointerNotes)) return;
        release(pointerNotes[ev.pointerId]);
        delete pointerNotes[ev.pointerId];
      }
      keyboard.addEventListener('pointerup', endPointer);
      keyboard.addEventListener('pointercancel', endPointer);

      function typing(ev) { var t = ev.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); }
      function onKeyDown(ev) {
        if (ev.ctrlKey || ev.metaKey || ev.altKey || typing(ev)) return;
        var k = ev.key.toLowerCase();
        if (k === 'z' || k === 'x') {
          lowC = Math.max(24, Math.min(84, lowC + (k === 'z' ? -12 : 12)));
          synth.stopAll(); held = {};
          buildKeys(); refresh(); ev.preventDefault(); return;
        }
        if (!(k in KEYMAP) || ev.repeat) { if (k in KEYMAP) ev.preventDefault(); return; }
        ev.preventDefault();
        var n = lowC + KEYMAP[k];
        if (mode.value === 'find' && latch.input.checked) { if (selected[n]) delete selected[n]; else selected[n] = true; }
        press(n, 0.8);
      }
      function onKeyUp(ev) {
        var k = ev.key.toLowerCase();
        if (k in KEYMAP) release(lowC + KEYMAP[k]);
      }
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);

      /* --- MIDI --------------------------------------------------------------- */
      var midi = null;
      function onMidi(ev) {
        var d = ev.data, cmd = d[0] & 0xf0;
        if (cmd === 0x90 && d[2] > 0) {
          if (mode.value === 'find' && latch.input.checked) { if (selected[d[1]]) delete selected[d[1]]; else selected[d[1]] = true; }
          if (d[1] < lowC || d[1] > lowC + octaves * 12) { lowC = Math.max(24, Math.min(84, d[1] - mod12(d[1]) - 12)); buildKeys(); }
          press(d[1], d[2] / 127);
        } else if (cmd === 0x80 || (cmd === 0x90 && d[2] === 0)) release(d[1]);
      }
      function attach() {
        if (!midi) return;
        var n = 0;
        midi.inputs.forEach(function (input) { input.onmidimessage = onMidi; n++; });
        midiNote.className = 'note' + (n ? ' ok' : '');
        midiNote.textContent = n ? 'Listening to ' + n + ' MIDI input' + (n > 1 ? 's' : '') + '.' : 'No MIDI keyboard found. Plug one in and it will be picked up.';
      }
      var midiBtn = U.button('Connect MIDI keyboard', function () {
        if (!navigator.requestMIDIAccess) { midiNote.className = 'note err'; midiNote.textContent = 'This browser has no Web MIDI. Chrome and Edge do.'; return; }
        navigator.requestMIDIAccess().then(function (access) {
          midi = access;
          midi.onstatechange = attach;
          attach();
        }, function () { midiNote.className = 'note err'; midiNote.textContent = 'MIDI access was refused.'; });
      }, 'ghost');

      /* --- finder -------------------------------------------------------------- */
      var latch = U.checkbox('Click keys to add or remove them', { checked: true });
      latch.input.addEventListener('change', function () { selected = {}; refresh(); });
      var chordName = el('div', { class: 'chord-name', dataset: { k: 'chord' } });
      var chordFull = el('div', { class: 'chord-alt', dataset: { k: 'chord-full' } });
      var chordAlt = el('div', { class: 'chord-alt' });
      var noteList = el('div', { class: 'ivals' });
      var findPane = U.panel('Chord', chordName, chordFull, chordAlt, noteList,
        el('div', { style: { height: '8px' } }),
        latch,
        U.btnrow(U.button('Play', function () { playNotes(currentNotes(), false); }), U.button('Arpeggio', function () { playNotes(currentNotes(), true); }, 'ghost'),
          U.button('Clear', function () { selected = {}; lastHeld = []; refresh(); }, 'ghost')));

      function currentNotes() {
        var h = Object.keys(held).map(Number);
        if (mode.value === 'find' && !latch.input.checked) return h.length ? h : lastHeld;
        return Object.keys(selected).map(Number);
      }

      function ivalTiles(notes, rootPc) {
        return notes.slice().sort(function (a, b) { return a - b; }).map(function (n) {
          var iv = mod12(n - rootPc);
          return el('div', { class: 'ival', title: IVAL_LONG[iv] }, el('b', { text: names[mod12(n)] }), el('span', { text: IVAL[iv] }));
        });
      }

      function refreshFinder() {
        var h = Object.keys(held).map(Number);
        if (!latch.input.checked && h.length) lastHeld = h;
        var notes = currentNotes();
        var res = identify(notes, names);
        if (!notes.length) {
          chordName.textContent = '—';
          chordFull.textContent = latch.input.checked ? 'Click keys, type on your keyboard or play a MIDI keyboard to build a chord.' : 'Hold down some notes.';
          chordAlt.textContent = ''; noteList.replaceChildren();
        } else if (!res.length) {
          chordName.textContent = '?';
          chordFull.textContent = 'No common chord uses exactly these notes.';
          chordAlt.textContent = '';
          noteList.replaceChildren.apply(noteList, ivalTiles(notes, mod12(Math.min.apply(null, notes))));
        } else {
          chordName.textContent = res[0].label;
          chordFull.textContent = res[0].name;
          chordAlt.textContent = res.length > 1 ? 'Also: ' + res.slice(1, 5).map(function (r) { return r.label; }).join(', ') : '';
          noteList.replaceChildren.apply(noteList, ivalTiles(notes, res[0].root));
        }
      }

      /* --- library --------------------------------------------------------------- */
      var rootOpts = function () { return names.map(function (n, i) { return { value: String(i), label: n }; }); };
      var cRoot = U.select({ label: 'Root', options: rootOpts(), value: '0', dataset: { k: 'chord-root' } });
      var cType = U.select({ label: 'Chord', options: LIB.map(function (c, i) { return { value: String(i), label: (c.sym || 'maj') + ' — ' + c.name }; }), value: '0', dataset: { k: 'chord-type' } });
      var cInv = U.select({ label: 'Voicing', options: [{ value: '0', label: 'Root position' }, { value: '1', label: '1st inversion' }, { value: '2', label: '2nd inversion' }, { value: '3', label: '3rd inversion' }], value: '0' });
      var cInfo = el('div', { class: 'stack' });
      function selVal(s) { return +(s.querySelector ? s.querySelector('select') : s).value; }

      function libNotes() {
        var c = LIB[selVal(cType)], r = selVal(cRoot), inv = Math.min(selVal(cInv), c.iv.length - 1);
        var base = lowC + 12 + r;
        if (base + c.iv[c.iv.length - 1] > lowC + octaves * 12) base -= 12;
        var notes = c.iv.map(function (v) { return base + v; });
        for (var i = 0; i < inv; i++) notes.push(notes.shift() + 12);
        if (notes[notes.length - 1] > lowC + octaves * 12) notes = notes.map(function (n) { return n - 12; });
        return notes;
      }
      function refreshLibrary() {
        var c = LIB[selVal(cType)], r = selVal(cRoot), notes = libNotes();
        hint = {}; notes.forEach(function (n) { hint[n] = true; });
        cInfo.replaceChildren(
          el('div', { class: 'chord-name', text: names[r] + c.sym }),
          el('div', { class: 'chord-alt', text: names[r] + ' ' + c.name + ' · ' + c.iv.map(function (v) { return IVAL[v]; }).join(' – ') }),
          el('div', { class: 'ivals' }, ivalTiles(notes, r)));
      }
      var libPane = U.panel('Chord library', U.row(cRoot, cType, cInv), cInfo,
        U.btnrow(U.button('Play chord', function () { playNotes(libNotes(), false); }, 'primary'), U.button('Arpeggio', function () { playNotes(libNotes(), true); })));
      [cRoot, cType, cInv].forEach(function (s) { s.addEventListener('change', refresh); });

      /* --- scales --------------------------------------------------------------- */
      var sRoot = U.select({ label: 'Root', options: rootOpts(), value: '0' });
      var sType = U.select({ label: 'Scale', options: SCALES.map(function (s, i) { return { value: String(i), label: s.name }; }), value: '0' });
      var sInfo = el('div', { class: 'stack' });
      function scaleNotes() {
        var s = SCALES[selVal(sType)], base = lowC + selVal(sRoot);
        return s.iv.map(function (v) { return base + v; }).concat([base + 12]);
      }
      function refreshScales() {
        var s = SCALES[selVal(sType)], r = selVal(sRoot), notes = scaleNotes();
        hint = {};
        for (var o = 0; o < octaves; o++) s.iv.forEach(function (v) { hint[lowC + r + v + o * 12] = true; });
        var kids = [
          el('div', { class: 'chord-alt', text: s.iv.map(function (v) { return names[mod12(r + v)]; }).join(' · ') + '   (' + s.iv.map(function (v) { return IVAL[v]; }).join(' ') + ')' }),
          el('div', { class: 'ivals' }, ivalTiles(notes.slice(0, -1), r))];
        if (s.triads) {
          var roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
          var btns = s.iv.map(function (v, i) {
            var tri = [v, s.iv[(i + 2) % 7] + (i + 2 >= 7 ? 12 : 0), s.iv[(i + 4) % 7] + (i + 4 >= 7 ? 12 : 0)];
            var notesT = tri.map(function (t) { return lowC + 12 + r + t; });
            var id = identify(notesT, names)[0];
            var sym = id ? id.label : '?';
            var third = mod12(tri[1] - tri[0]), fifth = mod12(tri[2] - tri[0]);
            var rn = third === 3 ? roman[i].toLowerCase() : roman[i];
            if (fifth === 6) rn += '°'; else if (fifth === 8) rn += '+';
            return U.button(rn + ' ' + sym, function () { playNotes(notesT, false); }, 'ghost');
          });
          kids.push(el('div', null, el('b', { text: 'Chords in this scale' })), el('div', { class: 'diatonic' }, btns));
        }
        sInfo.replaceChildren.apply(sInfo, kids);
      }
      var scalePane = U.panel('Scales', U.row(sRoot, sType), sInfo,
        U.btnrow(U.button('Play scale', function () { var n = scaleNotes(); playNotes(n.concat(n.slice(0, -1).reverse()), true, 0.22); }, 'primary')));
      [sRoot, sType].forEach(function (s) { s.addEventListener('change', refresh); });

      /* --- shared ---------------------------------------------------------------- */
      var timers = [];
      function playNotes(notes, arp, step) {
        if (!notes.length) return U.toast('No notes to play', 'err');
        try {
          timers.forEach(clearTimeout); timers = [];
          var t0 = synth.now() + 0.02, gap = arp ? (step || 0.16) : 0;
          notes.forEach(function (n, i) {
            synth.start(n, 0.7, t0 + i * gap);
            var on = setTimeout(function () { var k = keyEls[n]; if (k) k.classList.add('down'); }, (i * gap) * 1000);
            var off = setTimeout(function () { var k = keyEls[n]; if (k) k.classList.remove('down'); synth.stop(n); }, (i * gap + (arp ? Math.max(gap, 0.3) : 1.4)) * 1000);
            timers.push(on, off);
          });
        } catch (e) { U.toast(e.message, 'err'); }
      }

      function refresh() {
        var m = mode.value;
        if (m === 'find') { hint = {}; refreshFinder(); }
        else if (m === 'chords') refreshLibrary();
        else refreshScales();
        paintKeys();
      }
      function setMode(m) {
        findPane.hidden = m !== 'find'; libPane.hidden = m !== 'chords'; scalePane.hidden = m !== 'scales';
        refresh();
      }
      spell.addEventListener('click', function () {
        [cRoot, sRoot].forEach(function (f) {
          var s = f.querySelector('select'), v = s.value;
          s.replaceChildren.apply(s, rootOpts().map(function (o) { return el('option', { value: o.value, text: o.label }); }));
          s.value = v;
        });
      });

      U.onTeardown(root, function () {
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
        timers.forEach(clearTimeout);
        if (midi) { midi.onstatechange = null; midi.inputs.forEach(function (i) { i.onmidimessage = null; }); }
        synth.close();
      });

      buildKeys();
      root.append(
        U.panel(null, el('div', { class: 'pno-bar' }, mode, spell, octSel, showLabels, showKeys),
          el('div', { style: { height: '12px' } }),
          el('div', { class: 'pno-wrap' }, keyboard),
          U.note('Keys A to ; play the white notes and W E T Y U O P the black ones; Z and X shift down or up an octave.'),
          U.btnrow(midiBtn), midiNote),
        findPane, libPane, scalePane);
      setMode('find');
    }
  });

  window.PianoKit = { identify: identify, CHORDS: CHORDS };
})();
