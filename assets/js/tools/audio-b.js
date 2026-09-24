/* audio-b tools: Fade Audio In & Out, Change Audio Speed & Pitch, Reverse
   Audio, Waveform & Spectrogram Viewer, BPM Detector & Tap Tempo, MP3 Tag
   Editor (ID3), Reduce Background Noise. Processing goes through the shared
   ffmpeg in window.MediaKit (video.js); analysis runs on samples decoded by
   Web Audio, with ffmpeg as the fallback decoder. */
(function () {
  'use strict';
  var U = window.UI, el = U.el, MK = window.MediaKit;
  if (!MK) return;
  var ffRun = MK.ffRun, choice = MK.choice, label = MK.label, desc = MK.desc, size = MK.size,
    baseName = MK.baseName, extOf = MK.extOf, fmtTime = MK.fmtTime, fmtSecs = MK.fmtSecs, parseTime = MK.parseTime;

  if (!document.getElementById('g-audio-b-style')) {
    document.head.appendChild(el('style', { id: 'g-audio-b-style', text: [
      '.g-ab .gab-wave{width:100%;height:110px;display:block;background:var(--bg-sunken);border-radius:var(--radius)}',
      '.g-ab .gab-num{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;align-items:end}',
      '.g-ab .gab-num input{width:100%;min-width:0}',
      '.g-ab .gab-view{position:relative;display:flex;flex-direction:column;gap:6px;touch-action:pan-y;cursor:crosshair;user-select:none}',
      '.g-ab .gab-view canvas{width:100%;display:block;border-radius:6px;background:#0b0d12}',
      '.g-ab .gab-cursor{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:#ff4d4d;pointer-events:none;left:0}',
      '.g-ab .gab-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
      '.g-ab .gab-toolbar select{width:auto}',
      '.g-ab .gab-pad{width:100%;min-height:150px;border-radius:var(--radius);border:2px solid var(--border);background:var(--bg-sunken);color:var(--fg);font-size:1.4em;font-weight:700;cursor:pointer;touch-action:manipulation}',
      '.g-ab .gab-pad:active,.g-ab .gab-pad.hit{background:var(--accent);color:var(--accent-fg);border-color:var(--accent)}',
      '.g-ab .gab-big{font-size:3em;font-weight:800;text-align:center;font-variant-numeric:tabular-nums;line-height:1.1}',
      '.g-ab .gab-bars{display:flex;flex-direction:column;gap:6px}',
      '.g-ab .gab-bar{display:grid;grid-template-columns:6.5em 1fr 3.5em;gap:8px;align-items:center;font-variant-numeric:tabular-nums}',
      '.g-ab .gab-bar i{display:block;height:10px;border-radius:5px;background:var(--accent)}',
      '.g-ab .gab-bar span:first-child{font-weight:700}',
      '.g-ab .gab-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}',
      '.g-ab .gab-form .gab-wide{grid-column:1/-1}',
      '.g-ab .gab-form input,.g-ab .gab-form textarea{width:100%;min-width:0}',
      '.g-ab .gab-form textarea{min-height:70px}',
      '.g-ab .gab-cover{display:flex;flex-wrap:wrap;gap:12px;align-items:center}',
      '.g-ab .gab-cover img{width:150px;height:150px;object-fit:contain;border-radius:8px;background:var(--bg-sunken);border:1px solid var(--border)}',
      '.g-ab .gab-scroll{overflow-x:auto;max-width:100%}',
      '.g-ab .gab-pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}',
      '.g-ab .gab-pair audio{width:100%}'
    ].join('\n') }));
  }

  function pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }
  function db(x) { return x > 0 ? 20 * Math.log10(x) : -Infinity; }
  function dbText(v, unit) { return isFinite(v) ? v.toFixed(1) + ' ' + unit : '−∞ ' + unit; }
  function num(node) { return parseFloat(String((node.querySelector ? node.querySelector('input') || node : node).value).replace(',', '.')); }

  /* --- decoding ------------------------------------------------------------ */

  function mixDown(chans) {
    var n = chans[0].length, out = new Float32Array(n), k = 1 / chans.length;
    for (var c = 0; c < chans.length; c++) { var d = chans[c]; for (var i = 0; i < n; i++) out[i] += d[i] * k; }
    return out;
  }
  /* Samples for analysis and drawing -> { channels, rate, duration }. Web
     Audio decodes most things; anything it cannot read goes through ffmpeg. */
  async function decodeAudio(file, o) {
    o = o || {};
    var rate = o.rate || 44100;
    try {
      var AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      var ab = await new AC(1, 1, rate).decodeAudioData(await file.arrayBuffer());
      var chans = [];
      for (var c = 0; c < ab.numberOfChannels; c++) chans.push(ab.getChannelData(c));
      if (o.mono && chans.length > 1) chans = [mixDown(chans)];
      return { channels: chans, rate: ab.sampleRate, duration: ab.duration };
    } catch (e) {
      var info = await MK.probe(file);
      if (!info.hasAudio) throw new Error('This file has no audio track.');
      var nch = o.mono ? 1 : Math.min(2, info.channels || 2);
      var out = await ffRun({ inputs: [file], duration: info.duration, onProgress: o.onProgress,
        args: function (p, d) { return ['-i', p[0], '-vn', '-map', '0:a:0', '-ac', String(nch), '-ar', String(rate), '-f', 'f32le', d + '/a.raw']; },
        outputs: ['a.raw'], emptyHint: 'audio' });
      var raw = out[0].data, all = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.byteLength / 4));
      var n = Math.floor(all.length / nch), chs = [];
      for (var k = 0; k < nch; k++) { var ch = new Float32Array(n); for (var i = 0; i < n; i++) ch[i] = all[i * nch + k]; chs.push(ch); }
      return { channels: chs, rate: rate, duration: n / rate };
    }
  }
  /* The first `secs` seconds as mono samples at the file's own rate, via
     ffmpeg so that long recordings do not fill the memory. */
  async function headSamples(file, info, secs) {
    var rate = info.sampleRate || 44100;
    var out = await ffRun({ inputs: [file], args: function (p, d) { return ['-i', p[0], '-t', String(secs), '-vn', '-map', '0:a:0', '-ac', '1', '-ar', String(rate), '-f', 'f32le', d + '/a.raw']; },
      outputs: ['a.raw'], emptyHint: 'audio' });
    var raw = out[0].data;
    return { samples: new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.byteLength / 4)), rate: rate };
  }

  /* Background noise level: the 10th percentile of the loudness of 50 ms
     slices, ignoring digital silence. For speech with pauses that is the
     room tone between words. */
  function noiseLevel(x, rate) {
    var w = Math.max(64, Math.round(rate * 0.05)), v = [];
    for (var i = 0; i + w <= x.length; i += w) {
      var s = 0;
      for (var j = i; j < i + w; j++) s += x[j] * x[j];
      var r = Math.sqrt(s / w);
      if (r > 1e-5) v.push(r);
    }
    if (!v.length) return -Infinity;
    v.sort(function (a, b) { return a - b; });
    return db(v[Math.floor(v.length * 0.1)]);
  }

  /* --- FFT (in place, radix 2) --------------------------------------------- */

  var fftCache = {};
  function fftPlan(n) {
    if (fftCache[n]) return fftCache[n];
    var rev = new Uint32Array(n), bits = Math.round(Math.log2(n));
    for (var i = 0; i < n; i++) { var r = 0; for (var b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); rev[i] = r; }
    var cos = new Float64Array(n / 2), sin = new Float64Array(n / 2);
    for (var k = 0; k < n / 2; k++) { cos[k] = Math.cos(2 * Math.PI * k / n); sin[k] = -Math.sin(2 * Math.PI * k / n); }
    var hann = new Float32Array(n), sum = 0;
    for (var h = 0; h < n; h++) { hann[h] = 0.5 - 0.5 * Math.cos(2 * Math.PI * h / (n - 1)); sum += hann[h]; }
    return (fftCache[n] = { rev: rev, cos: cos, sin: sin, hann: hann, hannSum: sum });
  }
  function fft(re, im) {
    var n = re.length, p = fftPlan(n), i, t;
    for (i = 0; i < n; i++) {
      var j = p.rev[i];
      if (j > i) { t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (var len = 2; len <= n; len <<= 1) {
      var half = len >> 1, step = n / len;
      for (i = 0; i < n; i += len) {
        for (var k = 0; k < half; k++) {
          var wr = p.cos[k * step], wi = p.sin[k * step], a = i + k, b = a + half;
          var xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        }
      }
    }
  }

  /* --- waveform drawing --------------------------------------------------- */

  /* Min/max per block at 256, 1024, 4096… samples, so any zoom draws fast. */
  function pyramid(x) {
    var levels = [], block = 256;
    var src = { min: x, max: x, block: 1 };
    while (block <= x.length * 2) {
      var n = Math.ceil(x.length / block), mn = new Float32Array(n), mx = new Float32Array(n), f = block / src.block;
      for (var i = 0; i < n; i++) {
        var lo = 1, hi = -1, a = i * f, b = Math.min(src.min.length, a + f);
        for (var j = a; j < b; j++) { if (src.min[j] < lo) lo = src.min[j]; if (src.max[j] > hi) hi = src.max[j]; }
        mn[i] = lo; mx[i] = hi;
      }
      src = { min: mn, max: mx, block: block };
      levels.push(src);
      block *= 4;
    }
    return levels;
  }
  /* Min and max of samples [a, b), using the coarsest level that fits. */
  function rangeMinMax(x, levels, a, b) {
    a = Math.max(0, Math.floor(a)); b = Math.min(x.length, Math.ceil(b));
    var lo = 1, hi = -1, lev = null;
    for (var k = levels.length - 1; k >= 0; k--) if (levels[k].block * 2 <= b - a) { lev = levels[k]; break; }
    if (!lev) { for (var i = a; i < b; i++) { var s = x[i]; if (s < lo) lo = s; if (s > hi) hi = s; } return [lo, hi]; }
    var bs = lev.block, ia = Math.ceil(a / bs), ib = Math.floor(b / bs);
    for (var j = a; j < Math.min(b, ia * bs); j++) { if (x[j] < lo) lo = x[j]; if (x[j] > hi) hi = x[j]; }
    for (var q = ia; q < ib; q++) { if (lev.min[q] < lo) lo = lev.min[q]; if (lev.max[q] > hi) hi = lev.max[q]; }
    for (var r = Math.max(a, ib * bs); r < b; r++) { if (x[r] < lo) lo = x[r]; if (x[r] > hi) hi = x[r]; }
    return [lo, hi];
  }
  function sizeCanvas(c, cssH) {
    var dpr = window.devicePixelRatio || 1;
    c.width = Math.max(50, Math.round((c.clientWidth || 600) * dpr));
    c.height = Math.round(cssH * dpr);
    return dpr;
  }
  function themeColour(node, name, fallback) {
    var v = getComputedStyle(node).getPropertyValue(name).trim();
    return v || fallback;
  }

  /* ======================================================================
     Fade Audio In & Out
     ====================================================================== */

  /* ffmpeg's afade curves (libavfilter/af_afade.c), x from 0 to 1. */
  var CURVES = {
    tri: function (x) { return x; },
    qsin: function (x) { return Math.sin(x * Math.PI / 2); },
    hsin: function (x) { return (1 - Math.cos(x * Math.PI)) / 2; },
    log: function (x) { return x <= 0 ? 0 : Math.max(0, Math.min(1, 1 + 0.2 * Math.log10(x))); },
    exp: function (x) { return Math.exp(-11.512925464970227 * (1 - x)); },
    qua: function (x) { return x * x; }
  };

  MK.register({
    id: 'audio-fade', category: 'audio', name: 'Fade Audio In & Out',
    description: 'Fade the start and end of a song or recording in and out with the curve you choose, or crossfade two files into one.',
    keywords: ['fade in', 'fade out', 'audio fade', 'crossfade', 'cross fade', 'afade', 'acrossfade', 'mp3 fade', 'volume ramp', 'transition', 'mix two songs'],
    render: function (root) {
      var fin, fout, curve, xOn, xZone, xDur, xWrap, ctl, canvas, note, second = null, secondInfo = null, wave1 = null, wave2 = null, ctxRef;
      function vals() { return { fin: Math.max(0, num(fin) || 0), fout: Math.max(0, num(fout) || 0), x: Math.max(0, num(xDur) || 0), on: xOn.input.checked && !!secondInfo }; }
      function draw() {
        if (!canvas || !ctxRef) return;
        var v = vals(), d1 = ctxRef.st.info.duration || 0, d2 = v.on ? secondInfo.duration || 0 : 0;
        var T = v.on ? d1 + d2 - v.x : d1;
        var dpr = sizeCanvas(canvas, 110), W = canvas.width, H = canvas.height, g = canvas.getContext('2d');
        var accent = themeColour(canvas, '--accent', '#4f46e5'), muted = themeColour(canvas, '--border', '#999');
        g.clearRect(0, 0, W, H);
        if (!(T > 0)) return;
        var c = CURVES[curve.value] || CURVES.tri;
        /* Overall gain at time t for track k (0 = first file, 1 = second). */
        function gain(k, t) {
          var gv = 1;
          if (k === 0 && v.fin > 0 && t < v.fin) gv *= c(t / v.fin);
          if (v.on) {
            if (k === 0 && t > d1 - v.x) gv *= c(Math.max(0, (d1 - t) / v.x));
            if (k === 1) { var t2 = t - (d1 - v.x); if (t2 < v.x) gv *= c(Math.max(0, t2 / v.x)); }
          }
          if (v.fout > 0 && t > T - v.fout && (k === (v.on ? 1 : 0))) gv *= c(Math.max(0, (T - t) / v.fout));
          return gv;
        }
        function track(w, k, offset, colour) {
          if (!w) return;
          var x = w.samples, rate = w.rate;
          for (var px = 0; px < W; px++) {
            var t0 = px / W * T - offset, t1 = (px + 1) / W * T - offset;
            if (t1 <= 0 || t0 >= x.length / rate) continue;
            var a = Math.max(0, Math.floor(t0 * rate)), b = Math.min(x.length, Math.ceil(t1 * rate)), lo = 0, hi = 0;
            for (var i = a; i < b; i++) { if (x[i] < lo) lo = x[i]; if (x[i] > hi) hi = x[i]; }
            var gm = gain(k, (px + 0.5) / W * T);
            g.fillStyle = muted; g.fillRect(px, (1 - hi) * H / 2, 1, Math.max(1, (hi - lo) * H / 2));
            g.fillStyle = colour; g.fillRect(px, (1 - hi * gm) * H / 2, 1, Math.max(1, (hi - lo) * gm * H / 2));
          }
        }
        g.globalAlpha = 1;
        track(wave1, 0, 0, accent);
        if (v.on) { g.globalAlpha = 0.75; track(wave2, 1, d1 - v.x, '#e0791f'); g.globalAlpha = 1; }
        /* the gain curves */
        g.lineWidth = 2 * dpr;
        [[0, accent], [1, '#e0791f']].forEach(function (p) {
          if (p[0] === 1 && !v.on) return;
          g.strokeStyle = p[1]; g.beginPath();
          var from = p[0] ? d1 - v.x : 0, to = p[0] ? T : d1;
          for (var px = Math.floor(from / T * W); px <= Math.ceil(to / T * W); px++) {
            var y = (1 - gain(p[0], px / W * T)) * (H - 4 * dpr) + 2 * dpr;
            if (px === Math.floor(from / T * W)) g.moveTo(px, y); else g.lineTo(px, y);
          }
          g.stroke();
        });
        var bits = [];
        if (v.fin) bits.push('fade in over ' + fmtSecs(v.fin));
        if (v.on) bits.push('crossfade ' + fmtSecs(v.x));
        if (v.fout) bits.push('fade out over ' + fmtSecs(v.fout));
        note.textContent = 'Result ' + fmtTime(T, true) + (bits.length ? ': ' + bits.join(', ') : '') + (v.fin + v.fout > T ? '. The fades overlap, so it never reaches full volume.' : '');
      }
      async function loadWave(file) { var d = await decodeAudio(file, { rate: 8000, mono: true }); return { samples: d.channels[0], rate: d.rate }; }
      MK.fileTool(root, {
        accept: 'audio/*,video/*', hint: 'MP3, WAV, M4A, OGG, FLAC — or a video', working: 'Fading', needAudio: true,
        action: function () { return xOn && xOn.input.checked ? 'Crossfade and save' : 'Apply the fades'; },
        ready: function () {
          if (!fin) return false;
          var v = vals();
          if (xOn.input.checked) return !!secondInfo && v.x > 0 && v.x < Math.min(ctxRef.st.info.duration || 0, secondInfo.duration || 0);
          return v.fin > 0 || v.fout > 0;
        },
        options: function (ctx) {
          ctxRef = ctx; wave1 = wave2 = null; second = secondInfo = null;
          root.classList.add('g-ab');
          var dur = ctx.st.info.duration || 0;
          fin = U.input({ label: 'Fade in (seconds)', type: 'number', value: String(Math.min(2, Math.round(dur / 4 * 10) / 10)), min: 0, step: 0.1 });
          fout = U.input({ label: 'Fade out (seconds)', type: 'number', value: String(Math.min(3, Math.round(dur / 4 * 10) / 10)), min: 0, step: 0.1 });
          fin.querySelector('input').dataset.k = 'fade-in'; fout.querySelector('input').dataset.k = 'fade-out';
          curve = choice('Curve', [
            { value: 'tri', label: 'Linear', desc: 'The volume changes at a steady rate.' },
            { value: 'qsin', label: 'Smooth', desc: 'Quarter sine: moves quickly at first, then eases into full volume (or silence).' },
            { value: 'hsin', label: 'S-curve', desc: 'Half sine: gentle at both ends, quicker in the middle.' },
            { value: 'log', label: 'Logarithmic', desc: 'Comes up fast and spends longest near full volume. Good for fade-outs that should linger.' },
            { value: 'exp', label: 'Exponential', desc: 'Even in decibels: stays quiet for longer, then swells. Sounds natural to the ear.' },
            { value: 'qua', label: 'Quadratic', desc: 'A gentler version of exponential.' }
          ], 'tri', function () { draw(); });
          xOn = U.checkbox('Crossfade into a second file');
          xZone = U.dropzone({ accept: 'audio/*,video/*', label: 'Drop the second file here', hint: 'It plays after the first, overlapping by the crossfade', onFiles: async function (f) {
            second = f[0]; secondInfo = null;
            xZone.querySelector('strong').textContent = second.name + ' (' + size(second.size) + ')';
            xZone.querySelector('span').textContent = 'Reading…';
            ctx.refresh();
            try {
              secondInfo = await MK.probe(second);
              if (!secondInfo.hasAudio) throw new Error('That file has no audio.');
              xZone.querySelector('span').textContent = fmtSecs(secondInfo.duration) + ' · click or drop to change';
              wave2 = await loadWave(second);
            } catch (e) { secondInfo = null; second = null; xZone.querySelector('span').textContent = e.message || String(e); }
            ctx.refresh(); draw();
          } });
          xDur = U.input({ label: 'Crossfade length (seconds)', type: 'number', value: '3', min: 0.1, step: 0.1 });
          xWrap = el('div', { class: 'stack' }, xZone, xDur);
          xWrap.style.display = 'none';
          xOn.input.addEventListener('change', function () { xWrap.style.display = xOn.input.checked ? '' : 'none'; draw(); ctx.refresh(); });
          [fin, fout, xDur].forEach(function (n) { n.querySelector('input').addEventListener('input', function () { draw(); ctx.refresh(); }); });
          canvas = el('canvas', { class: 'gab-wave', 'aria-label': 'Waveform with the fades drawn over it' });
          note = el('div', { class: 'gv-fileinfo', dataset: { k: 'fade-note' } });
          ctl = MK.audioOutputControls('mp3');
          loadWave(ctx.st.file).then(function (w) { wave1 = w; draw(); }).catch(function () { /* the drawing is optional */ });
          setTimeout(draw);
          return [canvas, note, el('div', { class: 'gab-num' }, fin, fout), curve, xOn, xWrap].concat(ctl.nodes);
        },
        run: async function (ctx) {
          var v = vals(), c = curve.value, d1 = ctx.st.info.duration || 0, f = ctl.fmt.value;
          var inputs = [ctx.st.file], fc, T = d1;
          var fadeIn = v.fin > 0 ? 'afade=t=in:st=0:d=' + v.fin.toFixed(3) + ':curve=' + c : '';
          if (v.on) {
            T = d1 + secondInfo.duration - v.x;
            var stereo = ctx.st.info.channels > 1 || secondInfo.channels > 1;
            var norm = 'aresample=' + (ctx.st.info.sampleRate || 44100) + ',aformat=sample_fmts=fltp:channel_layouts=' + (stereo ? 'stereo' : 'mono');
            inputs.push(second);
            fc = '[0:a:0]' + norm + (fadeIn ? ',' + fadeIn : '') + '[a0];[1:a:0]' + norm + '[a1];[a0][a1]acrossfade=d=' + v.x.toFixed(3) + ':c1=' + c + ':c2=' + c +
              (v.fout > 0 ? ',afade=t=out:st=' + Math.max(0, T - v.fout).toFixed(3) + ':d=' + v.fout.toFixed(3) + ':curve=' + c : '') + '[a]';
          } else {
            var parts = [];
            if (fadeIn) parts.push(fadeIn);
            if (v.fout > 0) parts.push('afade=t=out:st=' + Math.max(0, d1 - v.fout).toFixed(3) + ':d=' + v.fout.toFixed(3) + ':curve=' + c);
            fc = '[0:a:0]' + parts.join(',') + '[a]';
          }
          var out = await ffRun({ inputs: inputs, duration: T, onProgress: ctx.progress,
            args: function (p, d) {
              var a = ['-i', p[0]];
              if (p[1]) a.push('-i', p[1]);
              return a.concat(['-filter_complex', fc, '-map', '[a]', '-vn'], ctl.enc(), [d + '/out.' + f]);
            }, outputs: ['out.' + f], emptyHint: 'audio' });
          return MK.outCard(ctx, out[0], baseName(ctx.st.file.name) + (v.on ? '-crossfade.' : '-faded.') + f, fmtTime(T));
        },
        onReset: function () { second = secondInfo = null; wave1 = wave2 = null; }
      });
    }
  });

  /* ======================================================================
     Change Audio Speed & Pitch
     ====================================================================== */

  /* asetrate plays the samples faster (higher and quicker, like a record),
     aresample brings the rate back, atempo then undoes or sets the speed. */
  function speedPitchFilter(mode, speed, semis, sr) {
    if (mode === 'speed') return MK.atempoChain(speed);
    if (mode === 'pitch') {
      var r = Math.pow(2, semis / 12);
      return 'asetrate=' + Math.round(sr * r) + ',aresample=' + sr + ',' + MK.atempoChain(1 / r);
    }
    return 'asetrate=' + Math.round(sr * speed) + ',aresample=' + sr;
  }

  MK.register({
    id: 'audio-speed-pitch', category: 'audio', name: 'Change Audio Speed & Pitch',
    description: 'Speed audio up or slow it down without changing its pitch, shift the pitch by semitones without changing its speed, or change both together like a record.',
    keywords: ['speed', 'tempo', 'pitch', 'pitch shift', 'transpose', 'semitones', 'slow down audio', 'speed up audio', 'nightcore', 'slowed', 'time stretch',
      'atempo', 'key change', 'playback speed', 'chipmunk', 'vinyl'],
    render: function (root) {
      var mode, speedIn, pitchIn, info2, ctl, ctxRef;
      function speed() { return Math.max(0.25, Math.min(4, num(speedIn) || 1)); }
      function semis() { return Math.max(-12, Math.min(12, num(pitchIn) || 0)); }
      function upd() {
        if (!ctxRef) return;
        var d = ctxRef.st.info.duration || 0, m = mode.value, s = speed(), n = semis();
        speedIn.style.display = m === 'pitch' ? 'none' : '';
        pitchIn.style.display = m === 'pitch' ? '' : 'none';
        var newLen = m === 'pitch' ? d : d / s;
        var pitch = m === 'speed' ? 0 : m === 'pitch' ? n : 12 * Math.log2(s);
        info2.textContent = 'Length ' + fmtTime(d, true) + ' → ' + fmtTime(newLen, true) + ' · pitch ' +
          (Math.abs(pitch) < 0.005 ? 'unchanged' : (pitch > 0 ? '+' : '−') + Math.abs(pitch).toFixed(2).replace(/\.?0+$/, '') + ' semitone' + (Math.abs(Math.abs(pitch) - 1) < 0.005 ? '' : 's'));
        ctxRef.refresh();
      }
      function presetRow(input, values, fmt) {
        return el('div', { class: 'chips' }, values.map(function (v) {
          return el('button', { class: 'chip', type: 'button', text: fmt(v), onclick: function () { input.querySelector('input').value = String(v); upd(); } });
        }));
      }
      MK.fileTool(root, {
        accept: 'audio/*,video/*', hint: 'MP3, WAV, M4A, OGG, FLAC — or a video', working: 'Processing', needAudio: true,
        action: function () { return !mode ? 'Apply' : mode.value === 'speed' ? 'Change the speed' : mode.value === 'pitch' ? 'Change the pitch' : 'Change both'; },
        ready: function () { if (!mode) return false; return mode.value === 'pitch' ? Math.abs(semis()) > 0.001 : Math.abs(speed() - 1) > 0.001; },
        options: function (ctx) {
          ctxRef = ctx;
          root.classList.add('g-ab');
          mode = choice('What to change', [
            { value: 'speed', label: 'Speed, keep the pitch', desc: 'Faster or slower, with voices and notes staying in the same key.' },
            { value: 'pitch', label: 'Pitch, keep the speed', desc: 'Move the key up or down in semitones; the length stays the same. 12 semitones is one octave.' },
            { value: 'both', label: 'Both, like a record', desc: 'Faster is higher and slower is lower, exactly like changing a turntable\'s speed.' }
          ], 'speed', upd);
          speedIn = el('div', { class: 'stack' }, U.input({ label: 'Speed (0.25× to 4×)', type: 'number', value: '1.25', min: 0.25, max: 4, step: 0.05 }));
          speedIn.appendChild(presetRow(speedIn, [0.5, 0.75, 0.9, 1.1, 1.25, 1.5, 2], function (v) { return v + '×'; }));
          pitchIn = el('div', { class: 'stack' }, U.input({ label: 'Pitch shift (semitones, −12 to +12)', type: 'number', value: '2', min: -12, max: 12, step: 0.5 }));
          pitchIn.appendChild(presetRow(pitchIn, [-12, -7, -5, -2, -1, 1, 2, 5, 7, 12], function (v) { return (v > 0 ? '+' : '−') + Math.abs(v); }));
          speedIn.querySelector('input').dataset.k = 'speed'; pitchIn.querySelector('input').dataset.k = 'semitones';
          [speedIn, pitchIn].forEach(function (n) { n.querySelector('input').addEventListener('input', upd); });
          info2 = el('div', { class: 'gv-fileinfo', dataset: { k: 'sp-info' } });
          ctl = MK.audioOutputControls('mp3');
          setTimeout(upd);
          return [mode, speedIn, pitchIn, info2].concat(ctl.nodes);
        },
        run: async function (ctx) {
          var info = ctx.st.info, m = mode.value, s = speed(), n = semis(), f = ctl.fmt.value, sr = info.sampleRate || 44100;
          var af = speedPitchFilter(m, s, n, sr), len = m === 'pitch' ? info.duration : info.duration / s;
          var out = await ffRun({ inputs: [ctx.st.file], duration: len, onProgress: ctx.progress,
            args: function (p, d) { return ['-i', p[0], '-vn', '-map', '0:a:0', '-af', af].concat(ctl.enc(), [d + '/out.' + f]); },
            outputs: ['out.' + f], emptyHint: 'audio' });
          var tag = m === 'pitch' ? (n > 0 ? '+' : '') + n + 'st' : s + 'x' + (m === 'both' ? '-vinyl' : '');
          return MK.outCard(ctx, out[0], baseName(ctx.st.file.name) + '-' + tag + '.' + f, fmtTime(len));
        }
      });
    }
  });

  /* ======================================================================
     Reverse Audio
     ====================================================================== */

  MK.register({
    id: 'reverse-audio', category: 'audio', name: 'Reverse Audio',
    description: 'Play a whole recording backwards, or only the part between two times.',
    keywords: ['reverse audio', 'backwards', 'play backwards', 'reverse mp3', 'backmasking', 'areverse', 'reverse sound', 'reverse part'],
    render: function (root) {
      var scope, start, end, rangeBox, info2, ctl, durRef = 0, player;
      function range() {
        var a = parseTime(start.querySelector('input').value), bText = end.querySelector('input').value.trim(), b = bText ? parseTime(bText) : durRef;
        return [a, Math.min(b, durRef || b)];
      }
      MK.fileTool(root, {
        accept: 'audio/*,video/*', hint: 'MP3, WAV, M4A, OGG, FLAC — or a video', action: 'Reverse', working: 'Reversing', needAudio: true,
        ready: function () {
          if (!scope) return false;
          if (scope.value === 'all') return true;
          var r = range();
          return !isNaN(r[0]) && !isNaN(r[1]) && r[1] > r[0];
        },
        options: function (ctx) {
          root.classList.add('g-ab');
          var dur = durRef = ctx.st.info.duration || 0;
          scope = choice('Reverse', [
            { value: 'all', label: 'The whole file' },
            { value: 'part', label: 'Only part of it', desc: 'The rest plays normally, before and after the reversed part.' }
          ], 'all', function (v) { rangeBox.style.display = v === 'part' ? '' : 'none'; upd(); });
          start = U.input({ label: 'From', value: '0:00', placeholder: '0:00' });
          end = U.input({ label: 'To', value: '', placeholder: fmtTime(dur, dur < 60) + ' (the end)' });
          info2 = desc('');
          player = MK.mediaPreview(ctx.st.file, ctx.st.file.name);
          if (player && player.tagName === 'VIDEO') player.className = 'gv-preview';
          var setA = U.button('From = playhead', function () { start.querySelector('input').value = fmtTime(player.currentTime, true); upd(); }, 'ghost');
          var setB = U.button('To = playhead', function () { end.querySelector('input').value = fmtTime(player.currentTime, true); upd(); }, 'ghost');
          function upd() {
            var r = range();
            if (scope.value === 'all') info2.textContent = 'All ' + fmtTime(dur, true) + ' plays backwards.';
            else if (isNaN(r[0]) || isNaN(r[1])) info2.textContent = 'Use minutes:seconds, like 1:30, or plain seconds.';
            else if (r[1] <= r[0]) info2.textContent = 'The end has to be after the start.';
            else info2.textContent = fmtTime(r[0], true) + '–' + fmtTime(r[1], true) + ' plays backwards (' + fmtSecs(r[1] - r[0]) + '); the rest is unchanged.';
            ctx.refresh();
          }
          [start, end].forEach(function (n) { n.querySelector('input').addEventListener('input', upd); });
          rangeBox = el('div', { class: 'stack' }, U.row(start, end), U.btnrow(setA, setB));
          rangeBox.style.display = 'none';
          ctl = MK.audioOutputControls('mp3');
          upd();
          return [player, scope, rangeBox, info2].concat(dur > 900 ? [U.note('Reversing holds the whole stretch in memory. On a long recording, reverse only the part you need.')] : [], ctl.nodes);
        },
        run: async function (ctx) {
          var f = ctl.fmt.value, dur = ctx.st.info.duration || 0, fc;
          if (scope.value === 'all') fc = '[0:a:0]areverse[a]';
          else {
            var r = range(), a = Math.max(0, r[0]), b = Math.min(dur, r[1]);
            if (!(b > a)) throw new Error('The part to reverse is empty.');
            var segs = [], n = 0;
            if (a > 0.001) segs.push('atrim=end=' + a.toFixed(4) + ',asetpts=PTS-STARTPTS');
            segs.push('atrim=start=' + a.toFixed(4) + ':end=' + b.toFixed(4) + ',asetpts=PTS-STARTPTS,areverse');
            if (b < dur - 0.001) segs.push('atrim=start=' + b.toFixed(4) + ',asetpts=PTS-STARTPTS');
            n = segs.length;
            if (n === 1) fc = '[0:a:0]' + segs[0] + '[a]';
            else {
              fc = '[0:a:0]asplit=' + n + segs.map(function (s, i) { return '[s' + i + ']'; }).join('') + ';' +
                segs.map(function (s, i) { return '[s' + i + ']' + s + '[r' + i + ']'; }).join(';') + ';' +
                segs.map(function (s, i) { return '[r' + i + ']'; }).join('') + 'concat=n=' + n + ':v=0:a=1[a]';
            }
          }
          var out = await ffRun({ inputs: [ctx.st.file], duration: dur, onProgress: ctx.progress,
            args: function (p, d) { return ['-i', p[0], '-vn', '-filter_complex', fc, '-map', '[a]'].concat(ctl.enc(), [d + '/out.' + f]); },
            outputs: ['out.' + f], emptyHint: 'audio' });
          return MK.outCard(ctx, out[0], baseName(ctx.st.file.name) + '-reversed.' + f, scope.value === 'all' ? fmtTime(dur) : 'part reversed');
        }
      });
    }
  });

  /* ======================================================================
     Waveform & Spectrogram Viewer
     ====================================================================== */

  /* Colour maps as control points (approximations of matplotlib's viridis
     and magma, plus grey), interpolated into 256-entry tables. */
  var CMAPS = {
    magma: [[0, 0, 4], [28, 16, 68], [79, 18, 123], [129, 37, 129], [181, 54, 122], [229, 80, 100], [251, 135, 97], [254, 194, 135], [252, 253, 191]],
    viridis: [[68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142], [38, 130, 142], [31, 158, 137], [53, 183, 121], [109, 205, 89], [180, 222, 44], [253, 231, 37]],
    grey: [[0, 0, 0], [255, 255, 255]]
  };
  var cmapCache = {};
  function cmap(name) {
    if (cmapCache[name]) return cmapCache[name];
    var pts = CMAPS[name] || CMAPS.magma, lut = new Uint8Array(256 * 3);
    for (var i = 0; i < 256; i++) {
      var pos = i / 255 * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(pos)), f = pos - k;
      for (var c = 0; c < 3; c++) lut[i * 3 + c] = Math.round(pts[k][c] + (pts[k + 1][c] - pts[k][c]) * f);
    }
    return (cmapCache[name] = lut);
  }
  function niceStep(span, target) {
    var raw = span / target, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
  }
  function fmtHz(f) { return f >= 1000 ? (f / 1000).toFixed(f % 1000 ? 1 : 0).replace(/\.0$/, '') + ' kHz' : Math.round(f) + ' Hz'; }
  function tickTime(t, step) { return step < 1 ? fmtTime(t, true) : fmtTime(t); }

  MK.register({
    id: 'audio-visualiser', category: 'audio', name: 'Waveform & Spectrogram Viewer',
    description: 'See a recording as a zoomable waveform and spectrogram with a playback cursor, measure its peak, RMS and loudness, and save the picture as a PNG.',
    keywords: ['waveform', 'spectrogram', 'spectrum', 'audio visualizer', 'audio visualiser', 'frequency', 'fft', 'loudness', 'lufs', 'ebu r128', 'peak',
      'rms', 'true peak', 'audio analyser', 'audio analyzer', 'sonogram', 'visualize audio'],
    render: function (root) {
      root.classList.add('g-video', 'g-ab');
      var st = { file: null, url: null, data: null, mono: null, levels: null, view: [0, 1], raf: 0, drawTimer: 0, seq: 0 };
      var zone = U.dropzone({ accept: 'audio/*,video/*', label: 'Drop an audio file here or click to choose', hint: 'MP3, WAV, M4A, OGG, FLAC — or a video. Nothing is uploaded.', onFiles: function (f) { load(f[0]); } });
      var prog = U.progress();
      var statsBox = el('div');
      var audio = el('audio', { controls: true, preload: 'auto' });
      var waveC = el('canvas', { 'aria-label': 'Waveform' }), specC = el('canvas', { 'aria-label': 'Spectrogram' });
      var cursor = el('div', { class: 'gab-cursor' });
      var view = el('div', { class: 'gab-view', title: 'Click to play from here' }, waveC, specC, cursor);
      var viewInfo = el('div', { class: 'gv-fileinfo', dataset: { k: 'view' } });
      var scroll = el('input', { type: 'range', min: 0, max: 1000, value: 0, step: 1, 'aria-label': 'Scroll through the recording' });
      var mapSel = U.select({ options: [{ value: 'magma', label: 'Magma' }, { value: 'viridis', label: 'Viridis' }, { value: 'grey', label: 'Greyscale' }], value: 'magma' });
      var scaleSel = U.select({ options: [{ value: 'log', label: 'Log frequency' }, { value: 'lin', label: 'Linear frequency' }], value: 'log' });
      var fftSel = U.select({ options: ['512', '1024', '2048', '4096', '8192'].map(function (v) { return { value: v, label: 'FFT ' + v }; }), value: '2048' });
      var rangeSel = U.select({ options: [{ value: '60', label: '60 dB range' }, { value: '80', label: '80 dB range' }, { value: '100', label: '100 dB range' }, { value: '120', label: '120 dB range' }], value: '100' });
      var zin = U.button('Zoom in', function () { zoom(0.5); }, 'ghost'), zout = U.button('Zoom out', function () { zoom(2); }, 'ghost'), zall = U.button('Show all', function () { setView(0, st.data.duration); }, 'ghost');
      var png = U.button('Save PNG', savePng, 'ghost');
      var toolbar = el('div', { class: 'gab-toolbar' }, zin, zout, zall, mapSel, scaleSel, fftSel, rangeSel, png);
      var work = el('div', { class: 'stack' }, statsBox, audio, toolbar, view, scroll, viewInfo,
        desc('Click the picture to play from that point. Ctrl + mouse wheel zooms around the pointer. Frequencies are drawn with a Hann window; brighter means louder.'));
      work.style.display = 'none';
      root.appendChild(U.panel(null, zone, prog));
      root.appendChild(U.panel(null, work));

      function statsNodes(v) {
        var items = [
          ['peak', 'Sample peak', v.peak !== undefined ? dbText(v.peak, 'dBFS') : '…'],
          ['rms', 'RMS level', v.rms !== undefined ? dbText(v.rms, 'dBFS') : '…'],
          ['lufs', 'Integrated loudness', v.lufs !== undefined ? dbText(v.lufs, 'LUFS') : '…'],
          ['lra', 'Loudness range', v.lra !== undefined ? v.lra.toFixed(1) + ' LU' : '…'],
          ['tp', 'True peak', v.tp !== undefined ? dbText(v.tp, 'dBTP') : '…'],
          ['len', 'Length', fmtTime(v.duration || 0, true)],
          ['fmt', 'Format', (v.rate ? (v.rate / 1000) + ' kHz' : '') + (v.channels ? ' · ' + (v.channels === 1 ? 'mono' : v.channels === 2 ? 'stereo' : v.channels + ' channels') : '')]
        ];
        var s = U.stats(items.map(function (i) { return { label: i[1], value: i[2] }; }));
        Array.prototype.forEach.call(s.children, function (c, k) { c.dataset.k = items[k][0]; c.firstChild.dataset.k = items[k][0] + '-value'; });
        return s;
      }

      async function load(file) {
        if (!file) return;
        var seq = ++st.seq;
        st.file = file;
        zone.querySelector('strong').textContent = file.name + ' (' + size(file.size) + ')';
        zone.querySelector('span').textContent = 'Click or drop to view a different file';
        work.style.display = 'none';
        prog.set('Reading the audio…');
        try {
          var info = await MK.probe(file);
          if (seq !== st.seq) return;
          if (!info.hasAudio) throw new Error('This file has no audio track.');
          /* Long recordings are drawn from a lower sample rate to spare memory. */
          var dur = info.duration || 0, native = Math.min(96000, info.sampleRate || 44100);
          var rate = dur > 900 ? 16000 : dur > 420 ? Math.min(native, 22050) : native;
          var data = await decodeAudio(file, { rate: rate, mono: true, onProgress: function (f) { prog.set('Reading the audio… ' + Math.round(f * 100) + '%', f); } });
          if (seq !== st.seq) return;
          st.data = { duration: data.duration, rate: data.rate, channels: info.channels, reduced: rate < native };
          st.mono = data.channels[0];
          st.levels = pyramid(st.mono);
          if (st.url) URL.revokeObjectURL(st.url);
          st.url = URL.createObjectURL(file);
          audio.src = st.url;
          st.stats = { duration: data.duration, rate: info.sampleRate || data.rate, channels: info.channels };
          statsBox.replaceChildren(statsNodes(st.stats));
          work.style.display = '';
          prog.set(st.data.reduced ? 'Drawn from a ' + (rate / 1000) + ' kHz copy to spare memory; the measurements use the original.' : '');
          setView(0, data.duration);
          measure(file, seq);
        } catch (e) { if (seq === st.seq) prog.fail(e); }
      }
      /* Peak and RMS (astats) and EBU R128 loudness, from the original file. */
      async function measure(file, seq) {
        try {
          var lines = [];
          await ffRun({ inputs: [file], allowFail: true, outputs: [], onLog: function (l) { lines.push(l); },
            args: function (p) { return ['-i', p[0], '-vn', '-map', '0:a:0', '-af', 'astats=measure_perchannel=none,ebur128=peak=true', '-f', 'null', '-']; } });
          if (seq !== st.seq) return;
          var text = lines.join('\n'), s = st.stats;
          var ov = text.lastIndexOf('Overall'), tail = ov >= 0 ? text.slice(ov) : text;
          var m;
          if ((m = /Peak level dB:\s*(-?[\d.]+|-inf)/.exec(tail))) s.peak = m[1] === '-inf' ? -Infinity : +m[1];
          if ((m = /RMS level dB:\s*(-?[\d.]+|-inf)/.exec(tail))) s.rms = m[1] === '-inf' ? -Infinity : +m[1];
          var sum = text.slice(text.lastIndexOf('Summary:'));
          if ((m = /I:\s*(-?[\d.]+|-inf|nan) LUFS/.exec(sum))) s.lufs = /inf|nan/.test(m[1]) ? -Infinity : +m[1];
          if ((m = /LRA:\s*(-?[\d.]+) LU/.exec(sum))) s.lra = +m[1];
          if ((m = /Peak:\s*(-?[\d.]+|-inf) dBFS/.exec(sum))) s.tp = m[1] === '-inf' ? -Infinity : +m[1];
          statsBox.replaceChildren(statsNodes(s));
        } catch (e) { /* the pictures are still useful without the numbers */ }
      }

      function setView(a, b) {
        var D = st.data.duration, minSpan = Math.min(D, Math.max(0.01, 64 / st.data.rate * 4));
        var span = Math.max(minSpan, Math.min(D, b - a));
        a = Math.max(0, Math.min(D - span, a));
        st.view = [a, a + span];
        scroll.max = 1000;
        scroll.value = String(D > span ? Math.round(a / (D - span) * 1000) : 0);
        scroll.disabled = span >= D - 1e-6;
        redraw();
      }
      function zoom(factor, at) {
        if (!st.data) return;
        var a = st.view[0], b = st.view[1], span = b - a;
        var c = at !== undefined ? at : audio.currentTime >= a && audio.currentTime <= b ? audio.currentTime : (a + b) / 2;
        var ns = span * factor, f = (c - a) / span;
        setView(c - ns * f, c - ns * f + ns);
      }
      function redraw() {
        drawWave(); drawSpec(); placeCursor();
        var a = st.view[0], b = st.view[1];
        viewInfo.textContent = 'Showing ' + fmtTime(a, true) + ' – ' + fmtTime(b, true) + ' (' + fmtSecs(b - a) + ' of ' + fmtTime(st.data.duration, true) + ')';
        viewInfo.dataset.span = String(b - a);
      }
      function drawWave() {
        var dpr = sizeCanvas(waveC, 120), W = waveC.width, H = waveC.height, g = waveC.getContext('2d');
        var x = st.mono, rate = st.data.rate, a = st.view[0] * rate, b = st.view[1] * rate, spp = (b - a) / W;
        g.fillStyle = '#0b0d12'; g.fillRect(0, 0, W, H);
        g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(0, H / 2 + 0.5); g.lineTo(W, H / 2 + 0.5); g.stroke();
        var top = 16 * dpr, h = H - top - 4 * dpr, mid = top + h / 2;
        g.fillStyle = '#6fa8ff';
        if (spp < 1.5) {
          g.strokeStyle = '#6fa8ff'; g.lineWidth = 1.5 * dpr; g.beginPath();
          for (var px = 0; px < W; px++) {
            var s = x[Math.min(x.length - 1, Math.max(0, Math.round(a + px * spp)))] || 0, y = mid - s * h / 2;
            if (px) g.lineTo(px, y); else g.moveTo(px, y);
          }
          g.stroke();
        } else {
          for (var p2 = 0; p2 < W; p2++) {
            var mm = rangeMinMax(x, st.levels, a + p2 * spp, a + (p2 + 1) * spp);
            if (mm[0] > mm[1]) continue;
            g.fillRect(p2, mid - mm[1] * h / 2, 1, Math.max(1, (mm[1] - mm[0]) * h / 2));
          }
        }
        /* time ticks */
        var span = st.view[1] - st.view[0], step = niceStep(span, 8);
        g.fillStyle = 'rgba(255,255,255,.75)'; g.font = (11 * dpr) + 'px sans-serif'; g.textBaseline = 'top';
        for (var t = Math.ceil(st.view[0] / step) * step; t <= st.view[1] + 1e-9; t += step) {
          var tx = (t - st.view[0]) / span * W;
          g.fillRect(tx, 0, 1, 5 * dpr);
          g.fillText(tickTime(t, step), tx + 3 * dpr, 2 * dpr);
        }
      }
      function drawSpec() {
        var dpr = sizeCanvas(specC, 260), W = specC.width, H = specC.height, g = specC.getContext('2d');
        var N = +fftSel.value, rate = st.data.rate, x = st.mono, plan = fftPlan(N), lut = cmap(mapSel.value);
        var range = +rangeSel.value, log = scaleSel.value === 'log', nyq = rate / 2, fmin = Math.max(20, rate / N);
        var img = g.createImageData(W, H), px = img.data;
        var re = new Float32Array(N), im = new Float32Array(N), mag = new Float32Array(N / 2 + 1);
        var a = st.view[0], span = st.view[1] - st.view[0], norm = 2 / plan.hannSum;
        /* which FFT bins each pixel row covers */
        var rowLo = new Int32Array(H), rowHi = new Int32Array(H), binHz = rate / N;
        for (var y = 0; y < H; y++) {
          var f0 = freqAt(y + 1), f1 = freqAt(y);
          rowLo[y] = Math.max(0, Math.min(N / 2, Math.floor(f0 / binHz)));
          rowHi[y] = Math.max(rowLo[y], Math.min(N / 2, Math.ceil(f1 / binHz)));
        }
        function freqAt(yy) { var fr = 1 - yy / H; return log ? fmin * Math.pow(nyq / fmin, fr) : nyq * fr; }
        var peakHz = 0;
        for (var col = 0; col < W; col++) {
          var c = Math.round((a + (col + 0.5) / W * span) * rate) - N / 2;
          for (var i = 0; i < N; i++) { var k = c + i; re[i] = k >= 0 && k < x.length ? x[k] * plan.hann[i] : 0; im[i] = 0; }
          fft(re, im);
          for (var b = 0; b <= N / 2; b++) mag[b] = Math.sqrt(re[b % N] * re[b % N] + im[b % N] * im[b % N]) * norm;
          if (col === W >> 1) { var best = 1; for (var q = 1; q <= N / 2; q++) if (mag[q] > mag[best]) best = q; peakHz = best * binHz; }
          for (var yy2 = 0; yy2 < H; yy2++) {
            var m = 0;
            for (var bb = rowLo[yy2]; bb <= rowHi[yy2]; bb++) if (mag[bb] > m) m = mag[bb];
            var v = (db(m) + range) / range, ci = v <= 0 ? 0 : v >= 1 ? 255 : Math.round(v * 255), o = (yy2 * W + col) * 4;
            px[o] = lut[ci * 3]; px[o + 1] = lut[ci * 3 + 1]; px[o + 2] = lut[ci * 3 + 2]; px[o + 3] = 255;
          }
        }
        g.putImageData(img, 0, 0);
        specC.dataset.peakHz = peakHz.toFixed(1);
        /* frequency ticks */
        g.font = (11 * dpr) + 'px sans-serif'; g.textBaseline = 'middle';
        var ticks = log ? [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 40000] : (function () {
          var st2 = niceStep(nyq, 6), out = [];
          for (var f = st2; f < nyq; f += st2) out.push(f);
          return out;
        })();
        ticks.forEach(function (f) {
          if (f < fmin || f >= nyq) return;
          var fr = log ? Math.log(f / fmin) / Math.log(nyq / fmin) : f / nyq, ty = (1 - fr) * H;
          g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(0, ty, 6 * dpr, 1);
          g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(8 * dpr, ty - 7 * dpr, g.measureText(fmtHz(f)).width + 6 * dpr, 14 * dpr);
          g.fillStyle = '#fff'; g.fillText(fmtHz(f), 11 * dpr, ty);
        });
      }
      function placeCursor() {
        if (!st.data) return;
        var t = audio.currentTime || 0, a = st.view[0], b = st.view[1];
        cursor.style.display = t >= a && t <= b ? '' : 'none';
        cursor.style.left = ((t - a) / (b - a) * 100) + '%';
      }
      function tick() {
        if (st.data && !audio.paused) {
          var t = audio.currentTime, a = st.view[0], b = st.view[1];
          if (t > b || t < a) { var span = b - a; setView(Math.min(t, st.data.duration - span), Math.min(t, st.data.duration - span) + span); }
        }
        placeCursor();
        st.raf = requestAnimationFrame(tick);
      }
      st.raf = requestAnimationFrame(tick);

      function timeAt(clientX) { var r = view.getBoundingClientRect(); return st.view[0] + (clientX - r.left) / r.width * (st.view[1] - st.view[0]); }
      view.addEventListener('click', function (e) {
        if (!st.data) return;
        audio.currentTime = Math.max(0, Math.min(st.data.duration, timeAt(e.clientX)));
        placeCursor();
        var p = audio.play();
        if (p && p.catch) p.catch(function () { /* autoplay refused: the cursor still moved */ });
      });
      view.addEventListener('wheel', function (e) {
        if (!st.data || !e.ctrlKey) return;
        e.preventDefault();
        zoom(e.deltaY < 0 ? 0.8 : 1.25, timeAt(e.clientX));
      }, { passive: false });
      scroll.addEventListener('input', function () {
        if (!st.data) return;
        var span = st.view[1] - st.view[0], a = (+scroll.value / 1000) * (st.data.duration - span);
        setView(a, a + span);
      });
      [mapSel, scaleSel, fftSel, rangeSel].forEach(function (s) { s.addEventListener('change', function () { if (st.data) drawSpec(); }); });
      var onResize = U.debounce(function () { if (st.data && work.offsetParent) redraw(); }, 200);
      window.addEventListener('resize', onResize);

      function savePng() {
        if (!st.data) return;
        var W = waveC.width, H = waveC.height + specC.height, head = Math.round(28 * (window.devicePixelRatio || 1));
        var c = document.createElement('canvas'); c.width = W; c.height = H + head;
        var g = c.getContext('2d');
        g.fillStyle = '#0b0d12'; g.fillRect(0, 0, c.width, c.height);
        g.fillStyle = '#fff'; g.font = Math.round(head * 0.5) + 'px sans-serif'; g.textBaseline = 'middle';
        g.fillText(st.file.name + '  ·  ' + fmtTime(st.view[0], true) + ' – ' + fmtTime(st.view[1], true), 10, head / 2);
        g.drawImage(waveC, 0, head); g.drawImage(specC, 0, head + waveC.height);
        c.toBlob(function (blob) { if (blob) U.saveBlob(baseName(st.file.name) + '-spectrogram.png', blob); }, 'image/png');
      }
      root._viz = { zoom: zoom, setView: setView, view: function () { return st.view.slice(); } };
      U.onTeardown(root, function () {
        cancelAnimationFrame(st.raf); st.seq++;
        window.removeEventListener('resize', onResize);
        audio.pause(); if (st.url) URL.revokeObjectURL(st.url);
      });
    }
  });

  /* ======================================================================
     BPM Detector & Tap Tempo
     ====================================================================== */

  /* Tempo from audio: a spectral-flux onset envelope, its autocorrelation,
     and a score per beat period that adds the echoes at 2, 3 and 4 periods
     and leans gently towards 120 BPM, which is where most music sits. */
  function detectTempo(x, rate) {
    var N = 1024, hop = 256, plan = fftPlan(N), frames = Math.floor((x.length - N) / hop) + 1;
    if (frames < 64) throw new Error('This recording is too short to find a tempo. A few seconds of music is needed.');
    var re = new Float32Array(N), im = new Float32Array(N), prev = new Float32Array(N / 2), env = new Float32Array(frames);
    for (var f = 0; f < frames; f++) {
      var o = f * hop;
      for (var i = 0; i < N; i++) { re[i] = x[o + i] * plan.hann[i]; im[i] = 0; }
      fft(re, im);
      var flux = 0;
      for (var b = 1; b < N / 2; b++) {
        var m = Math.log(1 + 1000 * Math.sqrt(re[b] * re[b] + im[b] * im[b]));
        var d = m - prev[b];
        if (d > 0) flux += d;
        prev[b] = m;
      }
      env[f] = f ? flux : 0;
    }
    /* Remove the slow trend (about a second) and keep the rises. */
    var fps = rate / hop, w = Math.round(fps), mean = new Float32Array(frames), acc = 0;
    for (var k = 0; k < frames; k++) {
      acc += env[k];
      if (k >= w) acc -= env[k - w];
      mean[k] = acc / Math.min(k + 1, w);
    }
    var sum = 0;
    for (var q = 0; q < frames; q++) { var c = Math.max(0, env[q] - mean[Math.min(frames - 1, q + (w >> 1))]); env[q] = c; sum += c; }
    var mu = sum / frames;
    for (var r = 0; r < frames; r++) env[r] -= mu;
    var maxLag = Math.min(frames - 1, Math.ceil(fps * 60 / 40 * 4) + 4), ac = new Float64Array(maxLag + 2);
    for (var L = 0; L <= maxLag + 1 && L < frames; L++) {
      var s = 0;
      for (var n = 0; n + L < frames; n++) s += env[n] * env[n + L];
      ac[L] = s / (frames - L);
    }
    if (!(ac[0] > 0)) throw new Error('No beat could be found: the recording is silent or has no clear rhythm.');
    function acAt(l) { var i0 = Math.floor(l), fr = l - i0; return i0 + 1 < ac.length ? ac[i0] * (1 - fr) + ac[i0 + 1] * fr : 0; }
    function score(lag) {
      var sc = 0, wts = [1, 0.5, 0.33, 0.25];
      for (var h = 1; h <= 4; h++) if (lag * h < ac.length - 1) sc += wts[h - 1] * acAt(lag * h);
      var bpm = 60 * fps / lag;
      return sc * Math.exp(-0.5 * Math.pow(Math.log2(bpm / 120) / 1.1, 2));
    }
    var cands = [];
    for (var bpm = 40; bpm <= 240; bpm += 0.25) cands.push({ bpm: bpm, s: score(60 * fps / bpm) });
    /* local maxima, strongest first, at least 4% apart */
    var peaks = cands.filter(function (c, i) { return (!cands[i - 1] || c.s >= cands[i - 1].s) && (!cands[i + 1] || c.s > cands[i + 1].s) && c.s > 0; })
      .sort(function (a, b) { return b.s - a.s; });
    var picked = [];
    peaks.forEach(function (p) { if (picked.length < 5 && picked.every(function (q) { return Math.abs(Math.log(p.bpm / q.bpm)) > 0.04; })) picked.push(p); });
    if (!picked.length) throw new Error('No beat could be found.');
    /* Refine each: parabola through the autocorrelation peak near the period,
       then again near four periods for a finer reading. */
    function refine(bpm) {
      var lag = 60 * fps / bpm, best = lag;
      [1, 2, 4].forEach(function (mult) {
        var centre = best * mult;
        if (centre + 3 >= ac.length) return;
        var lo = Math.max(1, Math.floor(centre - Math.max(2, centre * 0.03))), hi = Math.min(ac.length - 2, Math.ceil(centre + Math.max(2, centre * 0.03))), top = lo;
        for (var l = lo; l <= hi; l++) if (ac[l] > ac[top]) top = l;
        var y0 = ac[top - 1], y1 = ac[top], y2 = ac[top + 1], den = y0 - 2 * y1 + y2;
        var peak = top + (den < 0 ? 0.5 * (y0 - y2) / den : 0);
        best = peak / mult;
      });
      return 60 * fps / best;
    }
    var top1 = picked[0].s;
    return picked.map(function (p) {
      var lag = 60 * fps / p.bpm;
      return { bpm: refine(p.bpm), strength: p.s / top1, periodicity: Math.max(0, Math.min(1, acAt(lag) / ac[0])) };
    });
  }

  MK.register({
    id: 'bpm-detector', category: 'audio', name: 'BPM Detector & Tap Tempo',
    description: 'Find the tempo of a song from the audio, with the likely alternatives, or tap along to measure it yourself.',
    keywords: ['bpm', 'tempo', 'beats per minute', 'bpm finder', 'bpm counter', 'tap tempo', 'tap bpm', 'beat detection', 'song tempo', 'dj', 'music', 'rhythm'],
    render: function (root) {
      root.classList.add('g-video', 'g-ab');
      var seq = 0;
      var zone = U.dropzone({ accept: 'audio/*,video/*', label: 'Drop a song here or click to choose', hint: 'MP3, WAV, M4A, OGG, FLAC — or a video. Nothing is uploaded.', onFiles: function (f) { analyse(f[0]); } });
      var prog = U.progress();
      var result = el('div', { class: 'stack' });
      root.appendChild(U.panel('Detect from a recording', zone, prog, result));

      async function analyse(file) {
        if (!file) return;
        var my = ++seq;
        zone.querySelector('strong').textContent = file.name + ' (' + size(file.size) + ')';
        zone.querySelector('span').textContent = 'Click or drop to try a different song';
        result.replaceChildren();
        prog.set('Reading the audio…');
        try {
          var d = await decodeAudio(file, { rate: 22050, mono: true });
          if (my !== seq) return;
          var x = d.channels[0], limit = 240 * d.rate;
          if (x.length > limit) { var from = Math.floor((x.length - limit) / 2); x = x.subarray(from, from + limit); }
          prog.set('Listening for the beat…');
          await new Promise(function (r) { setTimeout(r, 20); });
          var t0 = performance.now(), res = detectTempo(x, d.rate);
          if (my !== seq) return;
          var best = res[0], conf = best.periodicity > 0.5 ? 'High' : best.periodicity > 0.25 ? 'Medium' : 'Low';
          var big = el('div', { class: 'gab-big', dataset: { k: 'bpm' }, text: best.bpm.toFixed(1) });
          var bars = el('div', { class: 'gab-bars', dataset: { k: 'candidates' } }, res.map(function (c) {
            return el('div', { class: 'gab-bar', dataset: { bpm: c.bpm.toFixed(2) } },
              el('span', { text: c.bpm.toFixed(1) + ' BPM' }), el('i', { style: { width: Math.max(2, Math.round(c.strength * 100)) + '%' } }),
              el('span', { class: 'gvb-small', text: Math.round(c.strength * 100) + '%' }));
          }));
          var related = res.slice(1).filter(function (c) { var r = c.bpm / best.bpm; return Math.abs(r - 2) < 0.06 || Math.abs(r - 0.5) < 0.03 || Math.abs(r - 1.5) < 0.05 || Math.abs(r - 2 / 3) < 0.03; });
          result.replaceChildren(
            el('div', null, big, el('div', { class: 'gv-fileinfo', style: { textAlign: 'center' }, text: 'BPM · confidence ' + conf.toLowerCase() + ' (' + Math.round(best.periodicity * 100) + '% periodic)', dataset: { k: 'confidence' } })),
            label('Other likely tempos'), bars,
            desc(related.length ? 'Half or double of the main reading is common: count along to decide which feels right.' : 'The strength shows how well each tempo fits the beats that were heard.'));
          prog.done('Analysed ' + fmtSecs(x.length / d.rate) + ' of audio in ' + ((performance.now() - t0) / 1000).toFixed(1) + 's');
        } catch (e) { if (my === seq) prog.fail(e); }
      }

      /* Tap tempo: a running average of the gaps, reset after a pause. */
      var taps = [], lastHit = 0;
      var pad = el('button', { class: 'gab-pad', type: 'button', text: 'Tap here, or press Space', dataset: { k: 'tap' } });
      var tapBpm = el('div', { class: 'gab-big', dataset: { k: 'tap-bpm' }, text: '—' });
      var tapInfo = el('div', { class: 'gv-fileinfo', style: { textAlign: 'center' }, dataset: { k: 'tap-info' }, text: 'Tap at least twice' });
      var resetBtn = U.button('Reset', function () { taps = []; show(); }, 'ghost');
      function show() {
        if (taps.length < 2) { tapBpm.textContent = '—'; tapInfo.textContent = taps.length ? 'Keep tapping…' : 'Tap at least twice'; return; }
        var gaps = [];
        for (var i = 1; i < taps.length; i++) gaps.push(taps[i] - taps[i - 1]);
        var mean = gaps.reduce(function (a, b) { return a + b; }, 0) / gaps.length;
        var sd = Math.sqrt(gaps.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / gaps.length);
        tapBpm.textContent = (60000 / mean).toFixed(1);
        tapInfo.textContent = taps.length + ' taps · ' + Math.round(mean) + ' ms apart · steadiness ±' + Math.round(sd) + ' ms' + (taps.length >= 16 ? ' · averaging the last 16' : '');
      }
      function tap() {
        var now = performance.now();
        if (taps.length && now - taps[taps.length - 1] > 2500) taps = [];
        taps.push(now);
        if (taps.length > 16) taps.shift();
        pad.classList.add('hit'); clearTimeout(lastHit); lastHit = setTimeout(function () { pad.classList.remove('hit'); }, 90);
        show();
      }
      pad.addEventListener('pointerdown', function (e) { e.preventDefault(); tap(); });
      pad.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.repeat) tap(); } });
      function onKey(e) {
        if (e.code !== 'Space' || e.repeat || /INPUT|TEXTAREA|SELECT|BUTTON|AUDIO|VIDEO/.test((e.target || {}).tagName || '')) return;
        e.preventDefault(); tap();
      }
      document.addEventListener('keydown', onKey);
      root.appendChild(U.panel('Tap tempo', tapBpm, tapInfo, pad, U.btnrow(resetBtn),
        desc('Tap along with the beat. The reading averages your last 16 taps and starts again if you pause for more than 2.5 seconds.')));
      root._bpm = { detect: detectTempo };
      U.onTeardown(root, function () { document.removeEventListener('keydown', onKey); clearTimeout(lastHit); seq++; });
    }
  });

  /* ======================================================================
     MP3 Tag Editor (ID3). Our own ID3v1 / v2.2 / v2.3 / v2.4 reader and an
     ID3v2.3 writer (UTF-16 where the text needs it, which every player
     reads). Genre names: assets/data/audio-b-id3-genres.json, taken from
     music-metadata 7.14.0 (MIT licence), after the Winamp extended list.
     ====================================================================== */

  var GENRES = null;
  function loadGenres() {
    if (!GENRES) {
      GENRES = fetch('assets/data/audio-b-id3-genres.json').then(function (r) { return r.ok ? r.json() : { genres: [] }; })
        .then(function (j) { return j.genres || []; }).catch(function () { GENRES = null; return []; });
    }
    return GENRES;
  }

  function latin1(b) { var s = ''; for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return s; }
  function ascii(b, o, n) { return latin1(b.subarray(o, o + n)); }
  function syncsafe(b, o) { return (b[o] & 0x7f) << 21 | (b[o + 1] & 0x7f) << 14 | (b[o + 2] & 0x7f) << 7 | (b[o + 3] & 0x7f); }
  function u32(b, o) { return ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3]; }
  function u32le(b, o) { return b[o] + (b[o + 1] << 8) + (b[o + 2] << 16) + ((b[o + 3] << 24) >>> 0); }
  /* Undo unsynchronisation: 0xFF 0x00 -> 0xFF. */
  function unsync(b) {
    var out = new Uint8Array(b.length), n = 0;
    for (var i = 0; i < b.length; i++) { out[n++] = b[i]; if (b[i] === 0xFF && b[i + 1] === 0x00) i++; }
    return out.subarray(0, n);
  }
  function decodeStr(b, enc) {
    if (!b.length) return '';
    if (enc === 0) return latin1(b);
    if (enc === 3) return new TextDecoder('utf-8').decode(b);
    if (enc === 2) return new TextDecoder('utf-16be').decode(b);
    if (b[0] === 0xFE && b[1] === 0xFF) return new TextDecoder('utf-16be').decode(b.subarray(2));
    if (b[0] === 0xFF && b[1] === 0xFE) return new TextDecoder('utf-16le').decode(b.subarray(2));
    return new TextDecoder('utf-16le').decode(b);
  }
  /* Split at the first terminator (one zero byte, or two aligned for UTF-16). */
  function term(b, enc) {
    var wide = enc === 1 || enc === 2;
    for (var i = 0; i < b.length; i += wide ? 2 : 1) {
      if (b[i] === 0 && (!wide || b[i + 1] === 0)) return [b.subarray(0, i), b.subarray(i + (wide ? 2 : 1))];
    }
    return [b, b.subarray(b.length)];
  }
  function clean(s) { return String(s).replace(/\u0000+$/, '').replace(/\u0000/g, ' / ').trim(); }

  var V22 = { TT1: 'TIT1', TT2: 'TIT2', TT3: 'TIT3', TP1: 'TPE1', TP2: 'TPE2', TP3: 'TPE3', TP4: 'TPE4', TAL: 'TALB', TYE: 'TYER', TRK: 'TRCK',
    TPA: 'TPOS', TCO: 'TCON', TCM: 'TCOM', TBP: 'TBPM', TEN: 'TENC', TCR: 'TCOP', TPB: 'TPUB', TSS: 'TSSE', TLA: 'TLAN', TOR: 'TORY', TXT: 'TEXT',
    TXX: 'TXXX', COM: 'COMM', ULT: 'USLT', PIC: 'APIC', WXX: 'WXXX', UFI: 'UFID', CNT: 'PCNT', POP: 'POPM', TDA: 'TDAT', TKE: 'TKEY', TMT: 'TMED', TRC: 'TSRC' };

  /* One frame's payload -> a friendly value. */
  function readFrame(id, d, ver) {
    var enc = d[0], parts;
    if (id === 'TXXX') { parts = term(d.subarray(1), enc); return { desc: clean(decodeStr(parts[0], enc)), text: clean(decodeStr(parts[1], enc)) }; }
    if (id[0] === 'T') return { text: clean(decodeStr(d.subarray(1), enc)) };
    if (id === 'WXXX') { parts = term(d.subarray(1), enc); return { desc: clean(decodeStr(parts[0], enc)), text: clean(latin1(parts[1])) }; }
    if (id[0] === 'W') return { text: clean(latin1(d)) };
    if (id === 'COMM' || id === 'USLT') {
      var lang = ascii(d, 1, 3);
      parts = term(d.subarray(4), enc);
      return { lang: lang, desc: clean(decodeStr(parts[0], enc)), text: decodeStr(parts[1], enc).replace(/\u0000+$/, '') };
    }
    if (id === 'APIC') {
      var mime, rest;
      if (ver === 2) { var fmt = ascii(d, 1, 3).toUpperCase(); mime = fmt === 'PNG' ? 'image/png' : 'image/jpeg'; rest = d.subarray(4); }
      else { var p = term(d.subarray(1), 0); mime = latin1(p[0]).toLowerCase() || 'image/jpeg'; rest = p[1]; }
      if (mime.indexOf('/') < 0) mime = 'image/' + (mime === 'jpg' ? 'jpeg' : mime);
      var type = rest[0], dp = term(rest.subarray(1), enc);
      return { mime: mime, type: type, desc: clean(decodeStr(dp[0], enc)), data: new Uint8Array(dp[1]) };
    }
    return { raw: new Uint8Array(d) };
  }

  function parseV2(tag, ver, flags) {
    var body = tag.subarray(10), frames = [], skipped = [];
    if (flags & 0x80 && ver < 4) body = unsync(body);
    var pos = 0;
    if (flags & 0x40 && ver === 3) pos = 4 + u32(body, 0);
    else if (flags & 0x40 && ver === 4) pos = syncsafe(body, 0);
    var idLen = ver === 2 ? 3 : 4, hl = ver === 2 ? 6 : 10;
    function validId(o) { return o + idLen <= body.length && /^[A-Z0-9]{3,4}$/.test(ascii(body, o, idLen)); }
    while (pos + hl <= body.length) {
      var id = ascii(body, pos, idLen);
      if (!/^[A-Z][A-Z0-9]{2,3}$/.test(id)) break;
      var fsize;
      if (ver === 2) fsize = body[pos + 3] << 16 | body[pos + 4] << 8 | body[pos + 5];
      else if (ver === 3) fsize = u32(body, pos + 4);
      else {
        fsize = syncsafe(body, pos + 4);
        /* iTunes once wrote v2.4 sizes as plain integers: trust whichever lands on a frame. */
        var plain = u32(body, pos + 4);
        if (plain !== fsize && !validId(pos + hl + fsize) && pos + hl + fsize < body.length && (validId(pos + hl + plain) || pos + hl + plain === body.length)) fsize = plain;
      }
      var fl = ver === 2 ? 0 : body[pos + 8] << 8 | body[pos + 9];
      var data = body.subarray(pos + hl, Math.min(body.length, pos + hl + fsize));
      pos += hl + fsize;
      var fid = ver === 2 ? V22[id] || id : id;
      if (ver === 4) {
        if (fl & 0x000C) { skipped.push(fid); continue; }
        if (fl & 0x0040) data = data.subarray(1);
        if (fl & 0x0001) data = data.subarray(4);
        if (fl & 0x0002) data = unsync(data);
      } else if (ver === 3) {
        if (fl & 0x00C0) { skipped.push(fid); continue; }
        if (fl & 0x0020) data = data.subarray(1);
      }
      if (!data.length) continue;
      try { frames.push(Object.assign({ id: fid }, readFrame(fid, data, ver))); } catch (e) { skipped.push(fid); }
    }
    return { version: ver, frames: frames, skipped: skipped, size: tag.length };
  }

  function parseV1(t) {
    function s(o, n) { return latin1(t.subarray(o, o + n)).replace(/\u0000[\s\S]*$/, '').trim(); }
    var v11 = t[125] === 0 && t[126] !== 0;
    return { title: s(3, 30), artist: s(33, 30), album: s(63, 30), year: s(93, 4), comment: s(97, v11 ? 28 : 30), track: v11 ? String(t[126]) : '', genre: t[127] };
  }

  /* Where the tags are, and where the audio starts and ends. */
  function readTags(buf) {
    var b = new Uint8Array(buf), res = { v2: null, v1: null, ape: false, start: 0, end: b.length };
    var off = 0;
    while (off + 10 <= b.length && b[off] === 0x49 && b[off + 1] === 0x44 && b[off + 2] === 0x33 && b[off + 3] >= 2 && b[off + 3] <= 4 &&
      !((b[off + 6] | b[off + 7] | b[off + 8] | b[off + 9]) & 0x80)) {
      var ver = b[off + 3], flags = b[off + 5], sz = syncsafe(b, off + 6);
      if (!res.v2) res.v2 = parseV2(b.subarray(off, Math.min(b.length, off + 10 + sz)), ver, flags);
      off += 10 + sz + (ver === 4 && flags & 0x10 ? 10 : 0);
    }
    /* Some taggers pad past the declared size: skip zeros up to the first MPEG frame. */
    var z = off;
    while (z < b.length && z < off + 65536 && b[z] === 0) z++;
    if (z < b.length && b[z] === 0xFF && (b[z + 1] & 0xE0) === 0xE0) off = z;
    res.start = off;
    var end = b.length;
    if (end - off >= 128 && b[end - 128] === 0x54 && b[end - 127] === 0x41 && b[end - 126] === 0x47) { res.v1 = parseV1(b.subarray(end - 128, end)); end -= 128; }
    if (end - off >= 32 && ascii(b, end - 32, 8) === 'APETAGEX') {
      var apeSize = u32le(b, end - 20), apeFlags = u32le(b, end - 12);
      end -= apeSize + (apeFlags & 0x80000000 ? 32 : 0);
      res.ape = true;
    }
    if (end - off >= 15 && ascii(b, end - 9, 9) === 'LYRICS200') {
      var ls = parseInt(ascii(b, end - 15, 6), 10);
      if (ls > 0 && ascii(b, end - 15 - ls, 11) === 'LYRICSBEGIN') end -= 15 + ls;
    }
    res.end = Math.max(off, end);
    return res;
  }

  /* The first MPEG audio frame header, for a line of technical detail. */
  function mpegInfo(b, start, end) {
    var BR = { '1-1': [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448], '1-2': [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
      '1-3': [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], '2-1': [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
      '2-2': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] };
    for (var i = start; i < Math.min(end - 4, start + 65536); i++) {
      if (b[i] !== 0xFF || (b[i + 1] & 0xE0) !== 0xE0) continue;
      var vb = (b[i + 1] >> 3) & 3, lb = (b[i + 1] >> 1) & 3, bi = b[i + 2] >> 4, si = (b[i + 2] >> 2) & 3, mode = b[i + 3] >> 6;
      if (vb === 1 || lb === 0 || bi === 0 || bi === 15 || si === 3) continue;
      var ver = vb === 3 ? 1 : 2, layer = 4 - lb, key = ver + '-' + (ver === 1 ? layer : layer === 1 ? 1 : 2);
      var rate = [[44100, 48000, 32000], [22050, 24000, 16000], [11025, 12000, 8000]][vb === 3 ? 0 : vb === 2 ? 1 : 2][si];
      var kbps = BR[key][bi];
      /* A Xing/Info header gives the frame count, hence the true length of VBR files. */
      var side = ver === 1 ? (mode === 3 ? 17 : 32) : (mode === 3 ? 9 : 17), x = i + 4 + side, frames = 0, vbr = false;
      var tagName = ascii(b, x, 4);
      if ((tagName === 'Xing' || tagName === 'Info') && b[x + 7] & 1) { frames = u32(b, x + 8); vbr = tagName === 'Xing'; }
      var spf = layer === 1 ? 384 : layer === 3 && ver === 2 ? 576 : 1152;
      var dur = frames ? frames * spf / rate : (end - i) * 8 / (kbps * 1000);
      return { text: 'MPEG-' + (vb === 3 ? '1' : vb === 2 ? '2' : '2.5') + ' Layer ' + ['', 'I', 'II', 'III'][layer] + ' · ' + (vbr ? 'variable bitrate' : kbps + ' kb/s') +
        ' · ' + (rate / 1000) + ' kHz · ' + ['stereo', 'joint stereo', 'dual channel', 'mono'][mode] + ' · ' + fmtTime(dur), duration: dur };
    }
    return null;
  }

  /* --- ID3v2.3 writer ------------------------------------------------------ */

  function needsWide(s) { for (var i = 0; i < s.length; i++) if (s.charCodeAt(i) > 0xFF) return true; return false; }
  function strBytes(s, wide) {
    if (!wide) { var a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
    var u = new Uint8Array(2 + s.length * 2);
    u[0] = 0xFF; u[1] = 0xFE;
    for (var j = 0; j < s.length; j++) { var c = s.charCodeAt(j); u[2 + j * 2] = c & 0xFF; u[3 + j * 2] = c >> 8; }
    return u;
  }
  function concatBytes(list) {
    var n = list.reduce(function (a, x) { return a + x.length; }, 0), out = new Uint8Array(n), o = 0;
    list.forEach(function (x) { out.set(x, o); o += x.length; });
    return out;
  }
  function frameBytes(id, payload) {
    var h = new Uint8Array(10);
    for (var i = 0; i < 4; i++) h[i] = id.charCodeAt(i);
    var n = payload.length;
    h[4] = n >>> 24 & 0xFF; h[5] = n >>> 16 & 0xFF; h[6] = n >>> 8 & 0xFF; h[7] = n & 0xFF;
    return concatBytes([h, payload]);
  }
  function textFrame(id, text) { var w = needsWide(text); return frameBytes(id, concatBytes([new Uint8Array([w ? 1 : 0]), strBytes(text, w)])); }
  function langFrame(id, lang, d, text) {
    var w = needsWide(d + text), z = new Uint8Array(w ? 2 : 1);
    return frameBytes(id, concatBytes([new Uint8Array([w ? 1 : 0]), strBytes((lang || 'eng').slice(0, 3).padEnd(3, ' '), false), strBytes(d, w), z, strBytes(text, w)]));
  }
  function pairFrame(id, d, text, valueLatin) {
    var w = needsWide(d + (valueLatin ? '' : text)), z = new Uint8Array(w ? 2 : 1);
    return frameBytes(id, concatBytes([new Uint8Array([w ? 1 : 0]), strBytes(d, w), z, valueLatin ? strBytes(text.replace(/[^\x00-\xff]/g, '?'), false) : strBytes(text, w)]));
  }
  function picFrame(p) {
    var w = needsWide(p.desc || ''), z = new Uint8Array(w ? 2 : 1);
    return frameBytes('APIC', concatBytes([new Uint8Array([w ? 1 : 0]), strBytes(p.mime, false), new Uint8Array([0, p.type]), strBytes(p.desc || '', w), z, p.data]));
  }
  function syncsafeBytes(n) { return new Uint8Array([n >> 21 & 0x7f, n >> 14 & 0x7f, n >> 7 & 0x7f, n & 0x7f]); }
  function v2Tag(frames) {
    var body = concatBytes(frames), padding = 1024;
    return concatBytes([new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0]), syncsafeBytes(body.length + padding), body, new Uint8Array(padding)]);
  }
  function v1Tag(f, genreIndex) {
    var t = new Uint8Array(128);
    function put(o, n, s) { s = String(s || ''); for (var i = 0; i < Math.min(n, s.length); i++) { var c = s.charCodeAt(i); t[o + i] = c > 0xFF ? 63 : c; } }
    put(0, 3, 'TAG'); put(3, 30, f.title); put(33, 30, f.artist); put(63, 30, f.album); put(93, 4, (/\d{4}/.exec(f.year || '') || [''])[0]); put(97, 28, f.comment);
    var tr = parseInt(f.track, 10);
    t[125] = 0; t[126] = tr > 0 && tr < 256 ? tr : 0; t[127] = genreIndex >= 0 && genreIndex < 256 ? genreIndex : 255;
    return t;
  }

  var PIC_TYPES = ['Other', 'File icon', 'Other file icon', 'Front cover', 'Back cover', 'Leaflet page', 'Media', 'Lead artist', 'Artist', 'Conductor',
    'Band', 'Composer', 'Lyricist', 'Recording location', 'During recording', 'During performance', 'Screen capture', 'Bright coloured fish', 'Illustration', 'Band logotype', 'Publisher logotype'];
  var FRAME_NAMES = { TCOM: 'Composer', TPE3: 'Conductor', TPE4: 'Remixed by', TIT1: 'Grouping', TIT3: 'Subtitle', TPUB: 'Publisher', TCOP: 'Copyright', TENC: 'Encoded by',
    TSSE: 'Encoder settings', TBPM: 'BPM', TKEY: 'Key', TLAN: 'Language', TMED: 'Media', TSRC: 'ISRC', TEXT: 'Lyricist', TOPE: 'Original artist', TOAL: 'Original album',
    TCMP: 'Compilation', TSOA: 'Album sort order', TSOP: 'Artist sort order', TSOT: 'Title sort order', TSO2: 'Album artist sort order', TLEN: 'Length (ms)', TDEN: 'Encoding time',
    TDRL: 'Release time', TORY: 'Original year', TDOR: 'Original release time', TMOO: 'Mood', TOWN: 'Owner', TRSN: 'Radio station', TXXX: 'User text', WXXX: 'User link',
    PRIV: 'Private data', UFID: 'Unique file ID', POPM: 'Popularimeter (rating)', PCNT: 'Play counter', MCDI: 'Music CD ID', COMM: 'Comment', USLT: 'Lyrics', APIC: 'Picture' };
  /* Frames the form edits; everything else is carried over where possible. */
  var EDITED = /^(TIT2|TPE1|TALB|TPE2|TYER|TDRC|TDAT|TIME|TRDA|TRCK|TPOS|TCON)$/;
  var RAW_OK = /^(PRIV|UFID|POPM|PCNT|MCDI)$/;

  MK.register({
    id: 'id3-editor', category: 'audio', name: 'MP3 Tag Editor (ID3)',
    description: 'Read and edit the ID3 tags of an MP3 (title, artist, album, year, track, genre, comment, lyrics and cover art), or strip every tag.',
    keywords: ['id3', 'id3 tag editor', 'mp3 tag', 'mp3 metadata', 'tag editor', 'metadata editor', 'album art', 'cover art', 'artwork', 'lyrics',
      'artist', 'album', 'genre', 'id3v1', 'id3v2', 'remove tags', 'music tagger'],
    render: function (root) {
      root.classList.add('g-video', 'g-ab');
      var st = { file: null, buf: null, tags: null, pic: null, picChanged: false };
      var zone = U.dropzone({ accept: 'audio/mpeg,.mp3', label: 'Drop an MP3 here or click to choose', hint: 'Tags are read and written here; nothing is uploaded.', onFiles: function (f) { load(f[0]); } });
      var info = el('div', { class: 'gv-fileinfo', dataset: { k: 'id3-info' } });
      var prog = U.progress();
      var formBox = el('div', { class: 'stack' });
      formBox.style.display = 'none';
      root.appendChild(U.panel(null, zone, info, prog));
      root.appendChild(formBox);
      var genreList = el('datalist', { id: 'gab-genres-' + Math.random().toString(36).slice(2) });
      loadGenres().then(function (g) {
        g.forEach(function (name, i) { if (i !== 133) genreList.appendChild(el('option', { value: name })); });
      });

      var F = {};
      function field(key, lab, opts) {
        opts = opts || {};
        var input = opts.area ? el('textarea', { rows: opts.rows || 3, spellcheck: false, dataset: { k: 'id3-' + key } }) : el('input', { type: 'text', dataset: { k: 'id3-' + key }, placeholder: opts.ph || '' });
        if (opts.list) input.setAttribute('list', genreList.id);
        F[key] = input;
        var f = U.field(lab, input, opts.hint);
        if (opts.wide) f.classList.add('gab-wide');
        return f;
      }
      var coverImg = el('img', { alt: 'Cover art' }), coverInfo = el('div', { class: 'gv-fileinfo', dataset: { k: 'id3-cover' } });
      var picker = el('input', { type: 'file', accept: 'image/jpeg,image/png', style: { display: 'none' }, onchange: function () { if (picker.files[0]) setPicture(picker.files[0]); picker.value = ''; } });
      var keepV1 = U.checkbox('Also write an ID3v1 tag (for very old players; 30 characters per field)');
      var kept = el('div');
      var saveBtn = U.button('Save tagged MP3', save); saveBtn.classList.add('gv-act');
      var stripBtn = U.button('Remove all tags', strip, 'ghost');
      var resBox = el('div', { class: 'stack gv-result' });
      formBox.append(
        U.panel('Tags', el('div', { class: 'gab-form' },
          field('title', 'Title', { wide: true }), field('artist', 'Artist'), field('album', 'Album'), field('albumArtist', 'Album artist'),
          field('year', 'Year', { ph: '2024' }), field('track', 'Track', { ph: '3/12' }), field('disc', 'Disc', { ph: '1/2' }),
          field('genre', 'Genre', { list: true }), field('comment', 'Comment', { area: true, rows: 2, wide: true }),
          field('lyrics', 'Lyrics', { area: true, rows: 6, wide: true })), genreList),
        U.panel('Cover art', el('div', { class: 'gab-cover' }, coverImg, el('div', { class: 'stack' }, coverInfo,
          U.btnrow(U.button('Choose a picture', function () { picker.click(); }, 'ghost'), U.button('Remove picture', function () { st.pic = null; st.picChanged = true; showPic(); }, 'ghost')))), picker),
        U.panel('Save', kept, keepV1, U.btnrow(saveBtn, stripBtn), resBox));

      function showPic() {
        if (coverImg.src) URL.revokeObjectURL(coverImg.src);
        if (st.pic) {
          coverImg.src = URL.createObjectURL(new Blob([st.pic.data], { type: st.pic.mime }));
          coverImg.style.display = '';
          coverImg.onload = function () { coverInfo.textContent = st.pic.mime.replace('image/', '').toUpperCase() + ' · ' + coverImg.naturalWidth + '×' + coverImg.naturalHeight + ' · ' + size(st.pic.data.length) + ' · ' + (PIC_TYPES[st.pic.type] || 'Picture'); };
          coverInfo.textContent = st.pic.mime + ' · ' + size(st.pic.data.length);
        } else { coverImg.removeAttribute('src'); coverImg.style.display = 'none'; coverInfo.textContent = 'No cover picture.'; }
      }
      async function setPicture(file) {
        var data = new Uint8Array(await file.arrayBuffer());
        var png = data[0] === 0x89 && data[1] === 0x50, jpg = data[0] === 0xFF && data[1] === 0xD8;
        if (!png && !jpg) { U.toast('Use a JPEG or PNG picture', 'err'); return; }
        st.pic = { mime: png ? 'image/png' : 'image/jpeg', type: 3, desc: '', data: data };
        st.picChanged = true;
        showPic();
      }

      async function load(file) {
        if (!file) return;
        prog.set('Reading the tags…');
        resBox.replaceChildren();
        try {
          var buf = await file.arrayBuffer(), genres = await loadGenres();
          var t = readTags(buf), b = new Uint8Array(buf);
          st.file = file; st.buf = buf; st.tags = t; st.picChanged = false;
          zone.querySelector('strong').textContent = file.name + ' (' + size(file.size) + ')';
          zone.querySelector('span').textContent = 'Click or drop to edit a different MP3';
          var frames = t.v2 ? t.v2.frames : [], v1 = t.v1 || {};
          function first(id) { var f = frames.filter(function (x) { return x.id === id; })[0]; return f ? f.text : ''; }
          function genreName(g) {
            var m = /^\((\d+)\)(.*)$/.exec(g) || /^(\d+)()$/.exec(g);
            if (m) return m[2] || genres[+m[1]] || g;
            return g.replace(/\((RX|CR)\)/g, function (x, k) { return k === 'RX' ? 'Remix' : 'Cover'; });
          }
          var comm = frames.filter(function (x) { return x.id === 'COMM' && !x.desc; })[0] || frames.filter(function (x) { return x.id === 'COMM' && !/^(iTun|ID3v1)/.test(x.desc); })[0];
          var uslt = frames.filter(function (x) { return x.id === 'USLT'; })[0];
          var year = first('TYER') || (first('TDRC') || '').slice(0, 4) || v1.year || '';
          var values = {
            title: first('TIT2') || v1.title || '', artist: first('TPE1') || v1.artist || '', album: first('TALB') || v1.album || '',
            albumArtist: first('TPE2'), year: year, track: first('TRCK') || v1.track || '', disc: first('TPOS'),
            genre: first('TCON') ? first('TCON').split(' / ').map(genreName).join('; ') : v1.genre !== undefined && v1.genre < genres.length ? genres[v1.genre] : '',
            comment: comm ? comm.text : v1.comment || '', lyrics: uslt ? uslt.text : ''
          };
          Object.keys(F).forEach(function (k) { F[k].value = values[k] || ''; });
          st.comm = comm; st.uslt = uslt;
          var pics = frames.filter(function (x) { return x.id === 'APIC'; });
          st.pic = pics.filter(function (x) { return x.type === 3; })[0] || pics[0] || null;
          showPic();
          keepV1.input.checked = !!t.v1;
          /* what is carried over untouched */
          st.carry = frames.filter(function (f) {
            if (EDITED.test(f.id)) return false;
            if (f === comm || f === uslt || f === st.pic) return false;
            if (f.raw) return RAW_OK.test(f.id);
            return true;
          });
          var dropped = frames.filter(function (f) { return f.raw && !RAW_OK.test(f.id); }).map(function (f) { return f.id; }).concat(t.v2 ? t.v2.skipped : []);
          kept.replaceChildren();
          if (st.carry.length) {
            kept.appendChild(label('Also kept as they are'));
            kept.appendChild(el('div', { class: 'gab-scroll' }, U.table(['Frame', 'Value'], st.carry.map(function (f) {
              var v = f.data ? PIC_TYPES[f.type] + ' picture, ' + size(f.data.length) : f.raw ? size(f.raw.length) + ' of data' : (f.desc ? f.desc + ': ' : '') + String(f.text || '').slice(0, 120);
              return [f.id + (FRAME_NAMES[f.id] ? ' (' + FRAME_NAMES[f.id] + ')' : ''), v];
            }))));
          }
          if (dropped.length) kept.appendChild(U.note('These frames cannot be carried into an ID3v2.3 tag and will be left out: ' + dropped.join(', ') + '.'));
          var mp = mpegInfo(b, t.start, t.end);
          var bits = [];
          bits.push(t.v2 ? 'ID3v2.' + t.v2.version + ' tag (' + t.v2.frames.length + ' frames, ' + size(t.v2.size) + ')' : 'No ID3v2 tag');
          bits.push(t.v1 ? 'ID3v1 tag' : 'no ID3v1 tag');
          if (t.ape) bits.push('APE tag');
          if (mp) bits.push(mp.text); else bits.push('no MPEG audio frames found: is this really an MP3?');
          info.textContent = bits.join(' · ');
          formBox.style.display = '';
          prog.set('');
        } catch (e) { prog.fail(e); }
      }

      async function save() {
        if (!st.buf) return;
        saveBtn.disabled = true;
        try {
          var genres = await loadGenres(), v = {};
          Object.keys(F).forEach(function (k) { v[k] = F[k].value.trim(); });
          var frames = [];
          if (v.title) frames.push(textFrame('TIT2', v.title));
          if (v.artist) frames.push(textFrame('TPE1', v.artist));
          if (v.album) frames.push(textFrame('TALB', v.album));
          if (v.albumArtist) frames.push(textFrame('TPE2', v.albumArtist));
          var yr = /\d{4}/.exec(v.year);
          if (yr) frames.push(textFrame('TYER', yr[0]));
          if (v.track) frames.push(textFrame('TRCK', v.track));
          if (v.disc) frames.push(textFrame('TPOS', v.disc));
          var gi = genres.map(function (g) { return g.toLowerCase(); }).indexOf(v.genre.toLowerCase());
          if (v.genre) frames.push(textFrame('TCON', v.genre));
          if (v.comment) frames.push(langFrame('COMM', st.comm ? st.comm.lang : 'eng', '', v.comment));
          if (v.lyrics) frames.push(langFrame('USLT', st.uslt ? st.uslt.lang : 'eng', st.uslt ? st.uslt.desc : '', v.lyrics));
          if (st.pic) frames.push(picFrame(st.pic));
          (st.carry || []).forEach(function (f) {
            if (f.id === 'APIC') frames.push(picFrame(f));
            else if (f.id === 'COMM' || f.id === 'USLT') frames.push(langFrame(f.id, f.lang, f.desc, f.text));
            else if (f.id === 'TXXX') frames.push(pairFrame('TXXX', f.desc, f.text));
            else if (f.id === 'WXXX') frames.push(pairFrame('WXXX', f.desc, f.text, true));
            else if (f.raw) frames.push(frameBytes(f.id, f.raw));
            else if (f.id[0] === 'W') frames.push(frameBytes(f.id, strBytes(f.text.replace(/[^\x00-\xff]/g, '?'), false)));
            else if (f.id[0] === 'T' && f.id.length === 4) frames.push(textFrame(f.id, f.text));
          });
          var audio = new Uint8Array(st.buf, st.tags.start, st.tags.end - st.tags.start);
          var parts = [v2Tag(frames), audio];
          if (keepV1.input.checked) parts.push(v1Tag(v, gi));
          var blob = new Blob(parts, { type: 'audio/mpeg' });
          var name = baseName(st.file.name) + '.mp3';
          U.saveBlob(name, blob);
          showSaved(blob, name, 'Saved with an ID3v2.3 tag (' + frames.length + ' frames)' + (keepV1.input.checked ? ' and an ID3v1 tag' : '') + '.');
        } catch (e) { U.toast(e.message || String(e), 'err'); }
        finally { saveBtn.disabled = false; }
      }
      function strip() {
        if (!st.buf) return;
        var blob = new Blob([new Uint8Array(st.buf, st.tags.start, st.tags.end - st.tags.start)], { type: 'audio/mpeg' });
        var name = baseName(st.file.name) + '-untagged.mp3';
        U.saveBlob(name, blob);
        showSaved(blob, name, 'Saved without any tags: ' + size(st.buf.byteLength - blob.size) + ' of tag data removed.');
      }
      function showSaved(blob, name, text) {
        var node = el('div', { class: 'stack gv-out', dataset: { name: name, size: String(blob.size) } },
          U.note('✓ ' + text, 'ok'), el('audio', { src: URL.createObjectURL(blob), controls: true, preload: 'none' }),
          U.btnrow(U.button('Download again', function () { U.saveBlob(name, blob); }, 'ghost'), U.button('Edit the saved file', function () { load(new File([blob], name, { type: 'audio/mpeg' })); }, 'ghost')));
        node.blob = blob;
        var old = resBox.querySelector('audio');
        if (old && old.src) URL.revokeObjectURL(old.src);
        resBox.replaceChildren(node);
      }
      root._id3 = { read: readTags, v1: v1Tag };
      U.onTeardown(root, function () { if (coverImg.src) URL.revokeObjectURL(coverImg.src); var a = resBox.querySelector('audio'); if (a && a.src) URL.revokeObjectURL(a.src); });
    }
  });

  /* ======================================================================
     Reduce Background Noise
     ====================================================================== */

  var NR = { light: 8, medium: 14, strong: 24, max: 40 };

  MK.register({
    id: 'noise-reduction', category: 'audio', name: 'Reduce Background Noise',
    description: 'Clean hiss, hum and room noise out of a recording with ffmpeg\'s FFT noise reducer, with optional high-pass and low-pass filters and a before/after preview.',
    keywords: ['noise reduction', 'remove background noise', 'denoise', 'noise remover', 'hiss', 'hum', 'static', 'clean audio', 'podcast', 'voice',
      'afftdn', 'noise gate', 'high pass', 'low pass', 'rumble', 'audio cleaner'],
    render: function (root) {
      var strength, floorMode, floorIn, floorWrap, hp, lp, ctl, prevAt, prevBox, estNote, est = null, ctxRef;
      function nf() {
        var v = floorMode.value === 'auto' ? (isFinite(est) ? est + 6 : -50) : num(floorIn);
        return Math.max(-80, Math.min(-20, Math.round(isFinite(v) ? v : -50)));
      }
      function chain() {
        var parts = [];
        if (hp.value !== 'off') parts.push('highpass=f=' + hp.value);
        parts.push('afftdn=nr=' + NR[strength.value] + ':nf=' + nf());
        if (lp.value !== 'off') parts.push('lowpass=f=' + lp.value);
        return parts.join(',');
      }
      async function estimate(file, info) {
        var h = await headSamples(file, info, 180);
        return noiseLevel(h.samples, h.rate);
      }
      MK.fileTool(root, {
        accept: 'audio/*,video/*', hint: 'MP3, WAV, M4A, OGG, FLAC — or a video', action: 'Reduce the noise', working: 'Cleaning', needAudio: true,
        options: function (ctx) {
          ctxRef = ctx; est = null;
          root.classList.add('g-ab');
          strength = choice('Strength', [
            { value: 'light', label: 'Light', desc: 'Takes the edge off steady hiss. Safest for music.' },
            { value: 'medium', label: 'Medium', desc: 'A good start for speech recorded in an ordinary room.' },
            { value: 'strong', label: 'Strong', desc: 'For noisy recordings. Listen for a watery, "underwater" sound and step back if you hear it.' },
            { value: 'max', label: 'Maximum', desc: 'As much reduction as possible, whatever it costs the voice.' }
          ], 'medium');
          estNote = el('div', { class: 'gv-fileinfo', dataset: { k: 'noise-est' }, text: 'Measuring the background noise…' });
          floorIn = U.input({ label: 'Noise level (dB)', type: 'number', value: '-50', min: -80, max: -20, step: 1 });
          floorWrap = el('div', null, floorIn, desc('Set it just above the level of the noise: too low leaves noise behind, too high eats into quiet speech.'));
          floorWrap.style.display = 'none';
          floorMode = choice('How loud is the noise?', [
            { value: 'auto', label: 'Measure it for me', desc: 'Listens to the quietest moments (the pauses between words) to find the level of the noise.' },
            { value: 'manual', label: 'Set it myself' }
          ], 'auto', function (v) { floorWrap.style.display = v === 'manual' ? '' : 'none'; });
          hp = choice('Cut low rumble (high-pass)', [{ value: 'off', label: 'Off' }, { value: '80', label: 'Below 80 Hz' }, { value: '120', label: 'Below 120 Hz' }], 'off');
          hp.appendChild(desc('Removes traffic, air conditioning and handling noise. 80 Hz is safe for voices; 120 Hz also thins out hum.'));
          lp = choice('Cut high hiss (low-pass)', [{ value: 'off', label: 'Off' }, { value: '12000', label: 'Above 12 kHz' }, { value: '8000', label: 'Above 8 kHz' }], 'off');
          prevAt = U.input({ label: 'Preview from', value: '0:00', placeholder: '0:00' });
          prevBox = el('div', { class: 'gab-pair' });
          var prevBtn = U.button('Preview 8 seconds', preview, 'ghost');
          ctl = MK.audioOutputControls('mp3');
          estimate(ctx.st.file, ctx.st.info).then(function (v) {
            if (ctxRef !== ctx) return;
            est = v;
            estNote.textContent = isFinite(v) ? 'Background noise measured at about ' + v.toFixed(1) + ' dBFS.' : 'The recording is silent, so there is no noise to measure.';
            estNote.dataset.db = isFinite(v) ? v.toFixed(1) : '';
            if (isFinite(v)) floorIn.querySelector('input').value = String(Math.max(-80, Math.min(-20, Math.round(v + 6))));
          }).catch(function () { estNote.textContent = 'The noise level could not be measured; −50 dB will be used.'; });
          return [strength, floorMode, estNote, floorWrap, hp, lp, el('div', { class: 'stack' }, label('Before and after'), U.row(prevAt, prevBtn), prevBox)].concat(ctl.nodes);
        },
        run: async function (ctx) {
          var info = ctx.st.info, f = ctl.fmt.value, af = chain();
          var out = await ffRun({ inputs: [ctx.st.file], duration: info.duration, onProgress: ctx.progress,
            args: function (p, d) { return ['-i', p[0], '-vn', '-map', '0:a:0', '-af', af].concat(ctl.enc(), [d + '/out.' + f]); },
            outputs: ['out.' + f], emptyHint: 'audio' });
          var name = baseName(ctx.st.file.name) + '-clean.' + f;
          var card = MK.outCard(ctx, out[0], name, 'noise level ' + nf() + ' dB, reduction up to ' + NR[strength.value] + ' dB');
          var nodes = [card];
          try {
            var after = await estimate(new File([card.blob], name, { type: card.blob.type }), info);
            if (isFinite(est) && isFinite(after)) {
              var s = U.stats([{ label: 'Background before', value: est.toFixed(1) + ' dB' }, { label: 'Background after', value: after.toFixed(1) + ' dB' },
                { label: 'Quieter by', value: (est - after).toFixed(1) + ' dB' }]);
              s.dataset.k = 'noise-change';
              s.dataset.before = est.toFixed(2); s.dataset.after = after.toFixed(2);
              nodes.unshift(s);
            }
          } catch (e) { /* the file is still good */ }
          return nodes;
        }
      });
      async function preview() {
        if (!ctxRef) return;
        var info = ctxRef.st.info, at = parseTime(prevAt.querySelector('input').value) || 0;
        at = Math.max(0, Math.min(at, Math.max(0, (info.duration || 0) - 1)));
        prevBox.replaceChildren(U.note('Rendering the preview…'));
        try {
          var af = chain();
          var both = [];
          for (var k = 0; k < 2; k++) {
            var o = await ffRun({ inputs: [ctxRef.st.file], args: function (p, d) {
              return ['-ss', String(at), '-t', '8', '-i', p[0], '-vn', '-map', '0:a:0'].concat(k ? ['-af', af] : [], ['-c:a', 'pcm_s16le', d + '/p.wav']);
            }, outputs: ['p.wav'], emptyHint: 'audio' });
            both.push(new Blob([o[0].data], { type: 'audio/wav' }));
          }
          Array.prototype.forEach.call(prevBox.querySelectorAll('audio'), function (a) { URL.revokeObjectURL(a.src); });
          prevBox.replaceChildren(
            el('div', { class: 'stack' }, label('Before'), el('audio', { src: URL.createObjectURL(both[0]), controls: true })),
            el('div', { class: 'stack' }, label('After'), el('audio', { src: URL.createObjectURL(both[1]), controls: true })));
        } catch (e) { prevBox.replaceChildren(U.note(e.message || String(e), 'err')); }
      }
    }
  });
})();
