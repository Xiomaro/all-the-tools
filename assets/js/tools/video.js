/* Video & audio tools. Nearly everything goes through one shared ffmpeg.wasm
   instance (loaded once, serialised jobs, progress, log capture, cancel).
   Transcription uses transformers.js + whisper-tiny, text to speech uses the
   system voices, and the recorders use MediaRecorder. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  /* --- styling (all selectors scoped to .g-video) ------------------------- */

  document.head.appendChild(el('style', { text: [
    '.g-video .gv-opts{display:flex;flex-direction:column;gap:14px}',
    '.g-video .gv-lbl{font-weight:600;font-size:.92em;margin:0 0 6px}',
    '.g-video .gv-desc{color:var(--fg-muted);font-size:.9em;margin:6px 0 0}',
    '.g-video .gv-fileinfo{color:var(--fg-muted);font-size:.9em}',
    '.g-video .gv-result video,.g-video .gv-result .gv-out > img{align-self:center;max-width:100%;max-height:420px;width:auto;border-radius:var(--radius);background:#000;display:block}',
    '.g-video .gv-result audio{width:100%}',
    '.g-video .gv-list{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none}',
    '.g-video .gv-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-sunken)}',
    '.g-video .gv-item .gv-grow{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}',
    '.g-video .gv-item small{color:var(--fg-muted)}',
    '.g-video .gv-item .btn{padding:2px 9px;min-width:0}',
    '.g-video .gv-thumb{width:56px;height:42px;object-fit:cover;border-radius:4px;background:#000}',
    '.g-video .gv-frames{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}',
    '.g-video .gv-frames figure{margin:0;display:flex;flex-direction:column;gap:4px}',
    '.g-video .gv-frames img{width:100%;border-radius:4px;background:#000}',
    '.g-video .gv-frames figcaption{font-size:.8em;color:var(--fg-muted);display:flex;justify-content:space-between;align-items:center}',
    '.g-video .gv-log{max-height:160px;overflow:auto;font-size:.75em}',
    '.g-video .gv-swatches{display:flex;gap:8px;flex-wrap:wrap;align-items:center}',
    '.g-video .gv-big{font-size:2.6em;font-family:var(--mono);text-align:center;margin:8px 0}',
    '.g-video .gv-rec{width:84px;height:84px;border-radius:50%;border:4px solid var(--border);background:#e0282e;cursor:pointer;display:block;margin:0 auto}',
    '.g-video .gv-rec.on{border-radius:18px;background:#b01418}',
    '.g-video .gv-meter{height:8px;border-radius:4px;background:var(--bg-sunken);overflow:hidden}',
    '.g-video .gv-meter i{display:block;height:100%;width:0;background:var(--ok)}',
    '.g-video .gv-preview{align-self:center;max-width:100%;max-height:360px;width:auto;height:auto;border-radius:var(--radius);background:#000}',
    '.g-video canvas.gv-preview{display:block}',
    '.g-video .gv-range{display:flex;flex-direction:column;gap:4px}',
    '.g-video .gv-range input{width:100%}',
    '.g-video .gv-wave{width:100%;height:90px;display:block;background:var(--bg-sunken);border-radius:var(--radius);cursor:crosshair}',
    '.g-video .gv-caption{min-height:2.8em;padding:8px 12px;border-radius:var(--radius);background:#000;color:#fff;text-align:center;white-space:pre-line}'
  ].join('\n') }));

  function abs(p) { return new URL(p, document.baseURI).href; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function baseName(name) { return String(name || 'file').replace(/\.[^.]+$/, '') || 'file'; }
  function extOf(name) { var m = /\.([^.]+)$/.exec(name || ''); return m ? m[1].toLowerCase() : ''; }

  var MIME = {
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
    gif: 'image/gif', mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', ogg: 'audio/ogg', flac: 'audio/flac',
    jpg: 'image/jpeg', png: 'image/png', srt: 'application/x-subrip', vtt: 'text/vtt', txt: 'text/plain', zip: 'application/zip'
  };
  function toBlob(data, name) { return new Blob([data], { type: MIME[extOf(name)] || 'application/octet-stream' }); }

  /* "1:30", "90", "1:02:03.5" -> seconds; NaN when unreadable. */
  function parseTime(s) {
    s = String(s || '').trim().replace(',', '.');
    if (!s) return NaN;
    if (!/^\d+(\.\d+)?(:\d{1,2}(\.\d+)?){0,2}$/.test(s)) return NaN;
    return s.split(':').reduce(function (acc, p) { return acc * 60 + parseFloat(p); }, 0);
  }
  /* seconds -> "m:ss" (or "h:mm:ss"), optional tenths. */
  function fmtTime(sec, tenths) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var t = tenths ? Math.floor(sec * 10) / 10 : Math.floor(sec + 1e-6);
    var h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    var ss = tenths ? (s < 10 ? '0' : '') + s.toFixed(1) : (s < 10 ? '0' : '') + Math.floor(s);
    return h ? h + ':' + (m < 10 ? '0' : '') + m + ':' + ss : m + ':' + ss;
  }
  function fmtSecs(s) { return (Math.round(s * 10) / 10).toFixed(1).replace(/\.0$/, '') + 's'; }

  /* Human-readable size, e.g. "4.15 KB". */
  function size(n) {
    if (!isFinite(n)) return '—';
    if (n < 1024) return n + ' Bytes';
    var u = ['KB', 'MB', 'GB', 'TB'], i = -1;
    do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
    return n.toFixed(2) + ' ' + u[i];
  }

  /* --- shared ffmpeg ------------------------------------------------------ */

  var FF = { inst: null, loading: null, queue: Promise.resolve(), onLog: null, onProgress: null, seq: 0 };

  function ffLoad() {
    if (FF.inst) return Promise.resolve(FF.inst);
    if (!FF.loading) {
      FF.loading = (async function () {
        if (location.protocol === 'file:') {
          throw new Error('Video and audio tools need the local server. Run "python serve.py" and open http://localhost:8000');
        }
        await U.script('assets/vendor/ffmpeg/ffmpeg.js');
        var ff = new window.FFmpegWASM.FFmpeg();
        ff.on('log', function (e) { if (FF.onLog) FF.onLog(e.message); });
        ff.on('progress', function (e) { if (FF.onProgress) FF.onProgress(e.progress); });
        await ff.load({ coreURL: abs('assets/vendor/ffmpeg/ffmpeg-core.js'), wasmURL: abs('assets/vendor/ffmpeg/ffmpeg-core.wasm') });
        FF.inst = ff;
        return ff;
      })().catch(function (err) { FF.loading = null; throw err; });
    }
    return FF.loading;
  }

  /* Kill whatever is running. The next job loads a fresh instance. */
  function ffCancel() {
    var ff = FF.inst;
    FF.inst = null; FF.loading = null;
    if (ff) { try { ff.terminate(); } catch (e) { /* already gone */ } }
  }

  function serial(fn) {
    var next = FF.queue.then(fn, fn);
    FF.queue = next.catch(function () {});
    return next;
  }

  /* Delete a folder in the ffmpeg file system and everything inside it. */
  async function rmTree(ff, path) {
    var list = await ff.listDir(path);
    for (var i = 0; i < list.length; i++) {
      var n = list[i].name;
      if (n === '.' || n === '..') continue;
      if (list[i].isDir) await rmTree(ff, path + '/' + n); else await ff.deleteFile(path + '/' + n);
    }
    await ff.deleteDir(path);
  }

  /* Run one ffmpeg job.
     job.inputs:  [File|Blob]            (mounted read-only, no copy)
     job.args:    function(paths, dir) -> []  (paths[i] is the input path, dir the job folder)
     job.files:   [{ name, data }] extra files written into the job folder; a
                  name may include a subfolder ("fonts/x.ttf"). data is
                  transferred to the worker, so pass a copy you can lose.
     job.outputs: ['out.mp4', ...] or a function(listDir) -> names to read
     job.ffprobe: true runs ffprobe instead of ffmpeg (same args contract)
     job.duration: expected output seconds, for the progress bar
     job.onProgress(fraction), job.onLog(line)
     Resolves with [{ name, data: Uint8Array }]. */
  function ffRun(job) {
    return serial(async function () {
      var ff = await ffLoad();
      var id = ++FF.seq;
      var dir = '/job' + id, inDir = dir + '/in';
      var logs = [];
      var dur = job.duration || 0;
      FF.onLog = function (line) {
        logs.push(line);
        if (logs.length > 400) logs.shift();
        if (job.onLog) job.onLog(line);
        var m = /time=\s*(-?\d+):(\d+):(\d+(?:\.\d+)?)/.exec(line);
        if (m && dur > 0 && job.onProgress) {
          var t = (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
          job.onProgress(Math.max(0, Math.min(1, t / dur)));
        }
      };
      FF.onProgress = function (p) { if (!dur && job.onProgress && p >= 0 && p <= 1) job.onProgress(p); };

      await ff.createDir(dir);
      await ff.createDir(inDir);
      var paths = [], mounted = false, broken = false;
      var inputs = (job.inputs || []).map(function (f, i) {
        var ext = extOf(f.name) || 'bin';
        return new File([f], 'i' + i + '.' + ext, { type: f.type || '' });
      });
      try {
        if (inputs.length) {
          try {
            await ff.mount('WORKERFS', { files: inputs }, inDir);
            mounted = true;
          } catch (e) {
            for (var i = 0; i < inputs.length; i++) {
              await ff.writeFile(inDir + '/' + inputs[i].name, new Uint8Array(await inputs[i].arrayBuffer()));
            }
          }
          paths = inputs.map(function (f) { return inDir + '/' + f.name; });
        }
        var extra = job.files || [];
        for (var k = 0; k < extra.length; k++) {
          var parts = extra[k].name.split('/'), sub = dir;
          for (var q = 0; q < parts.length - 1; q++) {
            sub += '/' + parts[q];
            try { await ff.createDir(sub); } catch (e) { /* already there */ }
          }
          await ff.writeFile(dir + '/' + extra[k].name, extra[k].data);
        }

        var args = job.args(paths, dir);
        var code;
        try { code = job.ffprobe ? await ff.ffprobe(['-hide_banner'].concat(args)) : await ff.exec(['-hide_banner', '-nostdin', '-y'].concat(args)); }
        catch (e) { broken = true; throw FF.inst !== ff ? new Error('Cancelled') : new Error('ffmpeg crashed (' + ((e && e.message) || e || 'unknown error') + '). Try again, or with a smaller file.'); }
        if (FF.inst !== ff) throw new Error('Cancelled');
        /* ffprobe changes global state (its -v log level sticks), so the next
           job gets a fresh instance. */
        if (job.ffprobe) broken = true;
        if (logs.some(function (l) { return /Aborted\(\)/.test(l); }) || (code !== 0 && !job.allowFail)) broken = true;
        if (code !== 0 && !job.allowFail) {
          var tail = logs.filter(function (l) { return /error|invalid|no such|not found|unable|could not|failed|does not/i.test(l); }).slice(-3);
          throw new Error('ffmpeg could not process this file' + (tail.length ? ': ' + tail.join(' · ') : ' (exit code ' + code + ').'));
        }
        var names = typeof job.outputs === 'function'
          ? job.outputs((await ff.listDir(dir)).filter(function (n) { return !n.isDir; }).map(function (n) { return n.name; }))
          : (job.outputs || []);
        var results = [];
        for (var j = 0; j < names.length; j++) {
          var data = await ff.readFile(dir + '/' + names[j]);
          if (!data || !data.length) throw new Error('ffmpeg produced an empty file. The input may have no ' + (job.emptyHint || 'usable streams') + '.');
          results.push({ name: names[j], data: data });
        }
        if (job.keepLogs) results.logs = logs.slice();
        return results;
      } finally {
        FF.onLog = null; FF.onProgress = null;
        /* A failed or aborted run can leave the wasm heap in a bad state:
           start the next job on a fresh instance. */
        if (broken && FF.inst === ff) ffCancel();
        if (FF.inst === ff) {
          try { if (mounted) await ff.unmount(inDir); } catch (e) {}
          try { await rmTree(ff, dir); } catch (e) { /* best effort */ }
        }
      }
    });
  }

  /* What's in a media file: duration, size, streams. ffmpeg's own banner is
     the source of truth; files without a duration header (MediaRecorder WebM)
     get a quick decode pass to measure them. */
  var probeCache = new WeakMap();
  function probe(file) {
    if (probeCache.has(file)) return probeCache.get(file);
    var p = (async function () {
      var res = await ffRun({ inputs: [file], args: function (p) { return ['-i', p[0]]; }, outputs: [], allowFail: true, keepLogs: true });
      var text = res.logs.join('\n');
      var info = { duration: NaN, width: 0, height: 0, hasVideo: false, hasAudio: false, fps: 0, sampleRate: 0, channels: 0, vcodec: '', acodec: '', rotate: 0 };
      var d = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(text);
      if (d) info.duration = (+d[1]) * 3600 + (+d[2]) * 60 + parseFloat(d[3]);
      var v = /Stream #\d+:\d+[^\n]*?: Video: ([^\n]*)/.exec(text);
      if (v) {
        var still = /\b(png|mjpeg|bmp|webp|gif)\b/.test(v[1]) && !/fps/.test(v[1]);
        info.hasVideo = true;
        info.isImage = still;
        info.vcodec = v[1].split(/[ ,(]/)[0];
        var wh = /(\d{2,5})x(\d{2,5})/.exec(v[1]);
        if (wh) { info.width = +wh[1]; info.height = +wh[2]; }
        var fps = /([\d.]+) fps/.exec(v[1]) || /([\d.]+) tbr/.exec(v[1]);
        if (fps) info.fps = parseFloat(fps[1]);
      }
      var rot = /rotate\s*:\s*(-?\d+)/.exec(text) || /rotation of (-?[\d.]+) degrees/.exec(text);
      if (rot) info.rotate = ((Math.round(parseFloat(rot[1])) % 360) + 360) % 360;
      if (info.rotate === 90 || info.rotate === 270) { var tw = info.width; info.width = info.height; info.height = tw; }
      var a = /Stream #\d+:\d+[^\n]*?: Audio: ([^\n]*)/.exec(text);
      if (a) {
        info.hasAudio = true;
        info.acodec = a[1].split(/[ ,(]/)[0];
        var sr = /(\d+) Hz/.exec(a[1]); if (sr) info.sampleRate = +sr[1];
        info.channels = /mono/.test(a[1]) ? 1 : 2;
      }
      if (!info.hasVideo && !info.hasAudio) throw new Error('This file does not look like audio or video that the browser can read.');
      if (!isFinite(info.duration) && !info.isImage) {
        var res2 = await ffRun({ inputs: [file], args: function (p) { return ['-i', p[0], '-f', 'null', '-']; }, outputs: [], allowFail: true, keepLogs: true });
        var last = null;
        res2.logs.forEach(function (l) { var m = /time=\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(l); if (m) last = m; });
        if (last) info.duration = (+last[1]) * 3600 + (+last[2]) * 60 + parseFloat(last[3]);
      }
      return info;
    })();
    probeCache.set(file, p);
    p.catch(function () { probeCache.delete(file); });
    return p;
  }

  /* --- encoding presets ---------------------------------------------------- */

  var H264 = ['-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p'];
  function vEnc(crf) { return H264.concat(['-crf', String(crf || 23)]); }
  var AAC = ['-c:a', 'aac', '-b:a', '160k'];
  var MP4_TAIL = ['-movflags', '+faststart'];

  var AUDIO_FORMATS = [
    { value: 'mp3', label: 'MP3' }, { value: 'wav', label: 'WAV' }, { value: 'm4a', label: 'M4A' },
    { value: 'ogg', label: 'OGG' }, { value: 'flac', label: 'FLAC' }
  ];
  var BITRATES = [{ value: '128', label: '128 kbps' }, { value: '192', label: '192 kbps' }, { value: '256', label: '256 kbps' }, { value: '320', label: '320 kbps' }];
  function audioEnc(fmt, kbps) {
    kbps = String(kbps || 192) + 'k';
    switch (fmt) {
      case 'wav': return ['-c:a', 'pcm_s16le'];
      case 'flac': return ['-c:a', 'flac'];
      case 'm4a': return ['-c:a', 'aac', '-b:a', kbps];
      case 'ogg': return ['-c:a', 'libvorbis', '-b:a', kbps];
      default: return ['-c:a', 'libmp3lame', '-b:a', kbps];
    }
  }
  function isLossless(fmt) { return fmt === 'wav' || fmt === 'flac'; }

  /* Pull audio out as 16 kHz mono float samples (for whisper). */
  async function decodeTo16k(file, onProgress) {
    try {
      var buf = await file.arrayBuffer();
      var ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 16000, 16000);
      var decoded = await ctx.decodeAudioData(buf.slice(0));
      var len = Math.max(1, Math.ceil(decoded.duration * 16000));
      var off = new OfflineAudioContext(1, len, 16000);
      var src = off.createBufferSource();
      src.buffer = decoded; src.connect(off.destination); src.start();
      var rendered = await off.startRendering();
      return rendered.getChannelData(0);
    } catch (e) {
      /* The browser can't decode this container: let ffmpeg do it. */
      var info = await probe(file);
      if (!info.hasAudio) throw new Error('This file has no audio track, so there is nothing to transcribe.');
      var out = await ffRun({
        inputs: [file], duration: info.duration, onProgress: onProgress,
        args: function (p, d) { return ['-i', p[0], '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', d + '/a.raw']; },
        outputs: ['a.raw']
      });
      var raw = out[0].data;
      return new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.byteLength / 4));
    }
  }

  /* --- small UI pieces ----------------------------------------------------- */

  function label(text) { return el('div', { class: 'gv-lbl', text: text }); }
  function desc(text) { return el('p', { class: 'gv-desc', text: text || '' }); }

  /* Chip group with a heading and optional per-option description. */
  function choice(title, options, initial, onChange) {
    var d = desc('');
    var wrap = el('div');
    var chips = U.chips(options, function (v) { update(v); if (onChange) onChange(v); }, initial);
    function update(v) {
      var o = options.filter(function (x) { return x.value === v; })[0];
      d.textContent = (o && o.desc) || '';
      d.style.display = d.textContent ? '' : 'none';
    }
    update(chips.value);
    wrap.appendChild(label(title));
    wrap.appendChild(chips);
    wrap.appendChild(d);
    wrap.chips = chips;
    wrap.desc = d;
    Object.defineProperty(wrap, 'value', { get: function () { return chips.value; } });
    wrap.set = function (v) {
      Array.prototype.forEach.call(chips.children, function (c, i) {
        var o = options[i];
        if ((typeof o === 'string' ? o : o.value) === v) c.click();
      });
    };
    return wrap;
  }

  function mediaPreview(blob, name) {
    var url = URL.createObjectURL(blob);
    var kind = (blob.type || '').split('/')[0];
    var node;
    if (kind === 'video') node = el('video', { src: url, controls: true, playsInline: true, preload: 'metadata' });
    else if (kind === 'audio') node = el('audio', { src: url, controls: true, preload: 'metadata' });
    else if (kind === 'image') node = el('img', { src: url, alt: name || '' });
    else node = null;
    return node;
  }

  function resultCard(blob, name, extra) {
    var prev = mediaPreview(blob, name);
    var node = el('div', { class: 'stack gv-out', dataset: { name: name, size: String(blob.size) } },
      prev,
      el('div', { class: 'gv-fileinfo', text: name + ' · ' + size(blob.size) + (extra ? ' · ' + extra : '') }),
      U.btnrow(U.button('Download ' + extOf(name).toUpperCase(), function () { U.saveBlob(name, blob); })));
    node.blob = blob;
    return node;
  }

  /* The common shape of a file tool: dropzone → options → action → result. */
  function fileTool(root, o) {
    root.classList.add('g-video');
    var st = { file: null, info: null, busy: false, results: [] };
    var zone = U.dropzone({
      accept: o.accept || 'video/*',
      label: o.drop || 'Drop a file here or click to choose',
      hint: o.hint || 'MP4, MOV, MKV, WebM… nothing is uploaded',
      onFiles: function (files) { load(files[0]); }
    });
    var optsBox = el('div', { class: 'gv-opts' });
    var actBtn = U.button(o.action || 'Go', function () { go(); }); actBtn.classList.add('gv-act');
    var resetBtn = U.button('Reset', function () { reset(); }, 'ghost');
    var cancelBtn = U.button('Cancel', function () { ffCancel(); }, 'ghost');
    cancelBtn.style.display = 'none';
    var prog = U.progress();
    var resultBox = el('div', { class: 'stack gv-result' });
    var work = el('div', { class: 'stack' }, optsBox, U.btnrow(actBtn, resetBtn, cancelBtn), prog);
    work.style.display = 'none';
    root.appendChild(U.panel(null, zone, work));
    root.appendChild(resultBox);
    resultBox.style.display = 'none';

    var ctx = {
      st: st, prog: prog, optsBox: optsBox, resultBox: resultBox, actBtn: actBtn,
      refresh: function () {
        actBtn.textContent = typeof o.action === 'function' ? o.action(ctx) : (o.action || 'Go');
        actBtn.disabled = st.busy || (o.ready ? !o.ready(ctx) : false);
      },
      progress: function (f) { prog.set((o.working || 'Working') + '… ' + Math.round(f * 100) + '%', f); }
    };

    function setZone(text, hint) {
      zone.querySelector('strong').textContent = text;
      zone.querySelector('span').textContent = hint;
    }

    async function load(file) {
      if (!file) return;
      st.file = file; st.info = null;
      setZone(file.name + ' (' + size(file.size) + ')', 'Click or drop to choose a different file');
      resultBox.replaceChildren(); resultBox.style.display = 'none';
      optsBox.replaceChildren();
      work.style.display = '';
      prog.set('Reading the file…');
      actBtn.disabled = true;
      try {
        st.info = await probe(file);
        if (st.file !== file) return;
        if (o.needVideo && !st.info.hasVideo) throw new Error('This file has no video track.');
        if (o.needAudio && !st.info.hasAudio) throw new Error('This file has no audio track.');
        prog.set('');
        var built = o.options ? o.options(ctx) : null;
        if (built) optsBox.replaceChildren.apply(optsBox, [].concat(built));
        ctx.refresh();
      } catch (err) {
        prog.fail(err);
      }
    }

    function reset() {
      if (st.busy) ffCancel();
      st.file = null; st.info = null;
      setZone(o.drop || 'Drop a file here or click to choose', o.hint || 'MP4, MOV, MKV, WebM… nothing is uploaded');
      optsBox.replaceChildren(); resultBox.replaceChildren(); resultBox.style.display = 'none';
      work.style.display = 'none'; prog.set('');
      if (o.onReset) o.onReset(ctx);
    }

    async function go() {
      if (!st.file || st.busy) return;
      st.busy = true; ctx.refresh();
      cancelBtn.style.display = '';
      resultBox.replaceChildren(); resultBox.style.display = 'none';
      prog.set((o.working || 'Working') + '…', 0);
      var t0 = performance.now();
      try {
        var out = await o.run(ctx);
        var secs = ((performance.now() - t0) / 1000).toFixed(1);
        if (out) {
          var nodes = [].concat(out);
          resultBox.replaceChildren.apply(resultBox, nodes);
          resultBox.style.display = '';
        }
        prog.done('Done in ' + secs + 's');
      } catch (err) {
        prog.fail(/Cancelled|terminate|called FFmpeg.terminate/i.test(err && err.message) ? new Error('Cancelled.') : err);
      } finally {
        st.busy = false; cancelBtn.style.display = 'none'; ctx.refresh();
      }
    }

    U.onTeardown(root, function () { if (st.busy) ffCancel(); });
    return ctx;
  }

  /* A result from a single ffmpeg output. */
  function outCard(ctx, res, name, extra) {
    var blob = toBlob(res.data, name);
    ctx.st.results = [{ name: name, blob: blob }];
    var before = ctx.st.file ? ctx.st.file.size : 0;
    return resultCard(blob, name, extra);
  }

  function register(def) {
    def.category = def.category || 'video';
    window.Tools.register(def);
  }

  /* Expose for other code paths (and for the behaviour tests). */

  /* ======================================================================== */
  /* Tools                                                                     */
  /* ======================================================================== */

  /* --- Extract Audio ------------------------------------------------------- */
  register({
    id: 'extract-audio', category: 'audio', name: 'Extract Audio from Video',
    description: 'Save the soundtrack of a video as an MP3, WAV or M4A file.',
    keywords: ['video to mp3', 'mp4 to mp3', 'audio', 'extract', 'rip', 'soundtrack', 'wav', 'm4a'],
    render: function (root) {
      var fmt;
      fileTool(root, {
        accept: 'video/*,audio/*', drop: 'Drop a video here or click to choose',
        hint: 'MP4, MOV, MKV, WebM, AVI… nothing is uploaded', action: 'Extract Audio', working: 'Extracting audio',
        needAudio: true,
        options: function () {
          fmt = choice('Output format', [
            { value: 'mp3', label: 'MP3', desc: 'Plays everywhere. 192 kbps, a good balance of size and quality.' },
            { value: 'wav', label: 'WAV', desc: 'Uncompressed and lossless, for editing. Much bigger files.' },
            { value: 'm4a', label: 'M4A', desc: 'AAC audio, smaller than MP3 at the same quality. Great on Apple devices.' }
          ], 'mp3');
          return fmt;
        },
        run: async function (ctx) {
          var f = fmt.value, name = baseName(ctx.st.file.name) + '.' + f;
          var out = await ffRun({ inputs: [ctx.st.file], duration: ctx.st.info.duration, onProgress: ctx.progress,
            args: function (p, d) { return ['-i', p[0], '-vn', '-map', '0:a:0'].concat(audioEnc(f, 192), [d + '/out.' + f]); },
            outputs: ['out.' + f], emptyHint: 'audio' });
          return outCard(ctx, out[0], name, fmtTime(ctx.st.info.duration));
        }
      });
    }
  });

  /* --- Compress Video ------------------------------------------------------ */
  register({
    id: 'compress-video', name: 'Compress Video',
    description: 'Make a video file smaller while keeping it watchable.',
    keywords: ['compress', 'shrink', 'reduce size', 'smaller', 'mp4', 'video size'],
    render: function (root) {
      var lvl;
      var LEVELS = {
        light: { crf: 23, maxH: 0, ab: '128k', desc: 'Barely any visible change. The file shrinks a little.' },
        balanced: { crf: 28, maxH: 1080, ab: '128k', desc: 'Looks nearly the same on a phone or laptop and is usually a fraction of the size.' },
        strong: { crf: 33, maxH: 720, ab: '96k', desc: 'The smallest file, scaled to 720p at most. Fine for sharing in chat or email.' }
      };
      fileTool(root, {
        accept: 'video/*', action: 'Compress Video', working: 'Compressing', needVideo: true,
        options: function () {
          lvl = choice('Compression level', [
            { value: 'light', label: 'Light — best quality', desc: LEVELS.light.desc },
            { value: 'balanced', label: 'Balanced — recommended', desc: LEVELS.balanced.desc },
            { value: 'strong', label: 'Strong — smallest file', desc: LEVELS.strong.desc }
          ], 'balanced');
          return lvl;
        },
        run: async function (ctx) {
          var L = LEVELS[lvl.value], info = ctx.st.info;
          var vf = [];
          if (L.maxH && info.height > L.maxH) vf.push('scale=-2:' + L.maxH);
          else vf.push('scale=trunc(iw/2)*2:trunc(ih/2)*2');
          var out = await ffRun({ inputs: [ctx.st.file], duration: info.duration, onProgress: ctx.progress,
            args: function (p, d) {
              return ['-i', p[0], '-map', '0:v:0', '-map', '0:a:0?', '-vf', vf.join(','), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(L.crf), '-pix_fmt', 'yuv420p',
                '-c:a', 'aac', '-b:a', L.ab].concat(MP4_TAIL, [d + '/out.mp4']);
            }, outputs: ['out.mp4'] });
          var before = ctx.st.file.size, after = out[0].data.length;
          var pct = Math.round((1 - after / before) * 100);
          var card = outCard(ctx, out[0], baseName(ctx.st.file.name) + '-compressed.mp4');
          var summary = U.stats([
            { label: 'Before', value: size(before) },
            { label: 'After', value: size(after) },
            { label: pct >= 0 ? 'Smaller' : 'Bigger', value: Math.abs(pct) + '%' }
          ]);
          var nodes = [summary, card];
          if (after >= before) nodes.unshift(U.note('This video was already well compressed, so the new file is not smaller. Keep the original.', 'err'));
          return nodes;
        }
      });
    }
  });

  /* --- Trim Video ---------------------------------------------------------- */
  register({
    id: 'trim-video', name: 'Trim Video',
    description: 'Cut out a clip between a start and an end time.',
    keywords: ['trim', 'cut', 'clip', 'shorten', 'video cutter'],
    render: function (root) {
      var start, end, player, info2;
      var ctx = fileTool(root, {
        accept: 'video/*', action: 'Trim Video', working: 'Trimming', needVideo: true,
        options: function (ctx) {
          var dur = ctx.st.info.duration;
          start = U.input({ label: 'Start (mm:ss)', value: '0:00', placeholder: '0:00' });
          end = U.input({ label: 'End (mm:ss)', value: fmtTime(Math.min(10, dur || 10)), placeholder: '0:10' });
          info2 = desc('');
          player = mediaPreview(ctx.st.file, ctx.st.file.name);
          if (player) player.className = 'gv-preview';
          var setStart = U.button('Set start to current time', function () { start.querySelector('input').value = fmtTime(player.currentTime, true); upd(); }, 'ghost');
          var setEnd = U.button('Set end to current time', function () { end.querySelector('input').value = fmtTime(player.currentTime, true); upd(); }, 'ghost');
          function upd() {
            var a = parseTime(start.querySelector('input').value), b = parseTime(end.querySelector('input').value);
            if (isNaN(a) || isNaN(b)) info2.textContent = 'Use minutes:seconds, like 1:30, or plain seconds.';
            else if (b <= a) info2.textContent = 'The end has to be after the start.';
            else info2.textContent = 'Clip length ' + fmtSecs(Math.min(b, dur || b) - a) + ' of ' + fmtTime(dur) + '.';
            ctx.refresh();
          }
          [start, end].forEach(function (f) { f.querySelector('input').addEventListener('input', upd); });
          upd();
          return [player, U.row(start, end), U.btnrow(setStart, setEnd), info2];
        },
        ready: function () {
          if (!start) return false;
          var a = parseTime(start.querySelector('input').value), b = parseTime(end.querySelector('input').value);
          return !isNaN(a) && !isNaN(b) && b > a;
        },
        run: async function (ctx) {
          var a = parseTime(start.querySelector('input').value), b = parseTime(end.querySelector('input').value);
          var dur = ctx.st.info.duration;
          if (isFinite(dur)) { b = Math.min(b, dur); if (a >= dur) throw new Error('The start is after the end of the video (' + fmtTime(dur) + ').'); }
          var out = await ffRun({ inputs: [ctx.st.file], duration: b - a, onProgress: ctx.progress,
            args: function (p, d) {
              return ['-ss', String(a), '-i', p[0], '-t', String(b - a), '-map', '0:v:0', '-map', '0:a:0?'].concat(vEnc(20), AAC, MP4_TAIL, [d + '/out.mp4']);
            }, outputs: ['out.mp4'] });
          return outCard(ctx, out[0], baseName(ctx.st.file.name) + '-trimmed.mp4', fmtSecs(b - a));
        }
      });
    }
  });

  /* --- Video to GIF -------------------------------------------------------- */
  register({
    id: 'video-to-gif', name: 'Video to GIF',
    description: 'Turn a video clip into an animated GIF with a proper colour palette.',
    keywords: ['gif', 'animated', 'mp4 to gif', 'convert', 'meme'],
    render: function (root) {
      var fps, width, maxLen, startAt;
      fileTool(root, {
        accept: 'video/*', action: 'Make GIF', working: 'Making the GIF', needVideo: true,
        options: function (ctx) {
          fps = U.input({ label: 'FPS', type: 'number', value: '12', min: 1, max: 30 });
          width = U.input({ label: 'Width (px)', type: 'number', value: '480', min: 16, max: 1920 });
          maxLen = U.input({ label: 'Max length (s)', type: 'number', value: '10', min: 1, max: 60 });
          startAt = U.input({ label: 'Start at (mm:ss)', value: '0:00' });
          return [U.row(fps, width, maxLen, startAt), U.note('Tip: lower FPS, width, and length all make a smaller GIF.')];
        },
        run: async function (ctx) {
          var f = Math.max(1, Math.min(50, +fps.querySelector('input').value || 12));
          var w = Math.max(16, Math.min(3840, Math.round(+width.querySelector('input').value || 480)));
          var t = Math.max(0.1, +maxLen.querySelector('input').value || 10);
          var ss = parseTime(startAt.querySelector('input').value) || 0;
          var dur = Math.min(t, (ctx.st.info.duration || t) - ss);
          if (!(dur > 0)) throw new Error('The start time is past the end of the video.');
          var out = await ffRun({ inputs: [ctx.st.file], duration: dur, onProgress: ctx.progress,
            args: function (p, d) {
              return ['-ss', String(ss), '-t', String(dur), '-i', p[0], '-filter_complex',
                'fps=' + f + ',scale=' + w + ':-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5',
                '-loop', '0', d + '/out.gif'];
            }, outputs: ['out.gif'] });
          return outCard(ctx, out[0], baseName(ctx.st.file.name) + '.gif', fmtSecs(dur) + ' · ' + f + ' fps · ' + w + 'px wide');
        }
      });
    }
  });

  /* --- Mute Video ---------------------------------------------------------- */
  register({
    id: 'mute-video', name: 'Mute Video',
    description: 'Strip the sound from a video without re-encoding the picture.',
    keywords: ['mute', 'remove audio', 'silent', 'no sound', 'strip audio'],
    render: function (root) {
      fileTool(root, {
        accept: 'video/*', action: 'Mute Video', working: 'Removing the audio', needVideo: true,
        options: function (ctx) {
          return ctx.st.info.hasAudio ? null : U.note('This video already has no sound track. Muting it will just copy it.');
        },
        run: async function (ctx) {
          var ext = extOf(ctx.st.file.name);
          if (['mp4', 'mov', 'mkv', 'webm', 'm4v', 'avi'].indexOf(ext) < 0) ext = 'mkv';
          if (ext === 'm4v') ext = 'mp4';
          var out = await ffRun({ inputs: [ctx.st.file], duration: ctx.st.info.duration, onProgress: ctx.progress,
            args: function (p, d) { return ['-i', p[0], '-map', '0:v', '-c:v', 'copy', '-an', d + '/out.' + ext]; },
            outputs: ['out.' + ext] });
          return outCard(ctx, out[0], baseName(ctx.st.file.name) + '-muted.' + ext, 'no audio');
        }
      });
    }
  });

  /* --- Whisper (Transcribe + Subtitles) ------------------------------------ */

  var whisperPipe = null;
  function loadWhisper(onStatus) {
    if (whisperPipe) return whisperPipe;
    whisperPipe = (async function () {
      var cfg = await fetch('assets/models/Xenova/whisper-tiny/config.json', { cache: 'no-store' }).catch(function () { return null; });
      if (!cfg || !cfg.ok) throw new Error('The speech model is not installed. Run "npm run vendor -- --models" in the app folder, then reload.');
      var T = await U.module('assets/vendor/transformers/transformers.min.js');
      T.env.allowRemoteModels = false;
      T.env.allowLocalModels = true;
      /* A path, not an http URL: transformers.js only runs its "does this
         local file exist" check for non-URL paths. */
      T.env.localModelPath = new URL('assets/models/', document.baseURI).pathname;
      T.env.useBrowserCache = false;
      T.env.backends.onnx.wasm.wasmPaths = abs('assets/vendor/transformers/');
      T.env.backends.onnx.wasm.numThreads = 1;
      return T.pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
        dtype: 'q8', device: 'wasm',
        progress_callback: function (p) {
          if (onStatus && p && p.status === 'progress' && p.total) onStatus('Loading the speech model… ' + Math.round(p.loaded / p.total * 100) + '%', p.loaded / p.total);
        }
      });
    })();
    whisperPipe.catch(function () { whisperPipe = null; });
    return whisperPipe;
  }

  var LANGS = [['auto', 'Detect automatically'], ['english', 'English'], ['spanish', 'Spanish'], ['french', 'French'], ['german', 'German'],
    ['italian', 'Italian'], ['portuguese', 'Portuguese'], ['dutch', 'Dutch'], ['russian', 'Russian'], ['polish', 'Polish'], ['turkish', 'Turkish'],
    ['arabic', 'Arabic'], ['hindi', 'Hindi'], ['chinese', 'Chinese'], ['japanese', 'Japanese'], ['korean', 'Korean'], ['ukrainian', 'Ukrainian'],
    ['swedish', 'Swedish'], ['indonesian', 'Indonesian'], ['vietnamese', 'Vietnamese']];

  async function transcribeFile(file, opts, prog) {
    prog.set('Reading the audio…', 0);
    var samples = await decodeTo16k(file, function (f) { prog.set('Reading the audio… ' + Math.round(f * 100) + '%', f); });
    if (!samples.length) throw new Error('There is no audio in this file.');
    prog.set('Loading the speech model…', 0);
    var asr = await loadWhisper(function (t, f) { prog.set(t, f); });
    var total = samples.length / 16000;
    prog.set('Listening… this runs on your own device, roughly real time for the first minute of audio.', null);
    var o = { chunk_length_s: 30, stride_length_s: 5, return_timestamps: true, task: opts.translate ? 'translate' : 'transcribe' };
    if (opts.language && opts.language !== 'auto') o.language = opts.language;
    var res = await asr(samples, o);
    var chunks = (res.chunks || []).map(function (c) {
      var ts = c.timestamp || [0, null];
      var a = ts[0] || 0, b = ts[1] === null || ts[1] === undefined ? Math.min(total, a + 5) : ts[1];
      return { start: a, end: Math.max(b, a + 0.2), text: String(c.text || '').trim() };
    }).filter(function (c) { return c.text; });
    return { text: String(res.text || '').trim(), chunks: chunks, duration: total };
  }

  function srtTime(s, sep) {
    var ms = Math.round(s * 1000);
    var h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60, r = ms % 1000;
    function p(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }
    return p(h, 2) + ':' + p(m, 2) + ':' + p(sec, 2) + sep + p(r, 3);
  }
  function toSRT(chunks) {
    return chunks.map(function (c, i) { return (i + 1) + '\n' + srtTime(c.start, ',') + ' --> ' + srtTime(c.end, ',') + '\n' + c.text + '\n'; }).join('\n');
  }
  function toVTT(chunks) {
    return 'WEBVTT\n\n' + chunks.map(function (c) { return srtTime(c.start, '.') + ' --> ' + srtTime(c.end, '.') + '\n' + c.text + '\n'; }).join('\n');
  }

  function whisperTool(root, o) {
    root.classList.add('g-video');
    var st = { file: null, busy: false };
    var zone = U.dropzone({ accept: 'video/*,audio/*', label: 'Drop a video or audio file here, or click to choose', hint: o.hint,
      onFiles: function (f) { load(f[0]); } });
    var translate = U.checkbox(o.translateLabel);
    var lang = U.select({ label: 'Spoken language', options: LANGS.map(function (l) { return { value: l[0], label: l[1] }; }), value: 'auto' });
    var act = U.button(o.action, function () { go(); }); act.classList.add('gv-act');
    var reset = U.button('Reset', function () { doReset(); }, 'ghost');
    var prog = U.progress();
    var resBox = el('div', { class: 'stack gv-result' });
    var work = el('div', { class: 'stack' }, lang, translate, U.btnrow(act, reset), prog);
    work.style.display = 'none';
    root.appendChild(U.panel(null, zone, work));
    root.appendChild(resBox);

    function load(file) {
      if (!file) return;
      st.file = file;
      zone.querySelector('strong').textContent = file.name + ' (' + size(file.size) + ')';
      zone.querySelector('span').textContent = 'Click or drop to choose a different file';
      work.style.display = '';
      resBox.replaceChildren();
      prog.set('');
    }
    function doReset() {
      st.file = null;
      zone.querySelector('strong').textContent = 'Drop a video or audio file here, or click to choose';
      zone.querySelector('span').textContent = o.hint;
      work.style.display = 'none'; resBox.replaceChildren(); prog.set('');
      translate.input.checked = false;
    }
    async function go() {
      if (!st.file || st.busy) return;
      st.busy = true; act.disabled = true;
      var t0 = performance.now();
      try {
        var opts = { translate: translate.input.checked, language: lang.querySelector('select').value };
        var r = await transcribeFile(st.file, opts, prog);
        resBox.replaceChildren.apply(resBox, [].concat(o.render(r, st.file, opts)));
        prog.done(r.chunks.length ? 'Done in ' + ((performance.now() - t0) / 1000).toFixed(1) + 's' : 'Done — no speech was heard in this file.');
      } catch (err) { prog.fail(err); }
      finally { st.busy = false; act.disabled = false; }
    }
    return { go: go };
  }

  /* SRT <-> WebVTT for the editable subtitle box, so corrections survive a
     format switch. WebVTT accepts SRT's cue numbers as cue identifiers, so
     SRT -> VTT is a header plus dots for commas. */
  function srtToVtt(s) {
    return 'WEBVTT\n\n' + String(s).replace(/^﻿/, '').replace(/\r/g, '').trim().replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2') + '\n';
  }
  var CUE_TIME = /^\s*((?:\d+:)?\d{1,2}:\d{2}[.,]\d{3})\s*-->\s*((?:\d+:)?\d{1,2}:\d{2}[.,]\d{3})/;
  function cueSecs(ts) { return ts.replace(',', '.').split(':').reduce(function (a, p) { return a * 60 + parseFloat(p); }, 0); }
  /* Cues from SRT or WebVTT text: [{ start, end, text }]. Blocks without a
     timing line (the WEBVTT header, NOTE, STYLE) are skipped. */
  function cuesFromText(s) {
    var cues = [];
    String(s).replace(/^﻿/, '').replace(/\r/g, '').split(/\n\s*\n/).forEach(function (b) {
      var lines = b.split('\n'), i = -1;
      for (var k = 0; k < lines.length; k++) if (lines[k].indexOf('-->') >= 0) { i = k; break; }
      var t = i >= 0 && CUE_TIME.exec(lines[i]);
      if (t) cues.push({ start: cueSecs(t[1]), end: cueSecs(t[2]), text: lines.slice(i + 1).join('\n').trim() });
    });
    return cues;
  }
  function vttToSrt(s) { return toSRT(cuesFromText(s)); }

  var LANG_CODES = { english: 'en', spanish: 'es', french: 'fr', german: 'de', italian: 'it', portuguese: 'pt', dutch: 'nl', russian: 'ru',
    polish: 'pl', turkish: 'tr', arabic: 'ar', hindi: 'hi', chinese: 'zh', japanese: 'ja', korean: 'ko', ukrainian: 'uk', swedish: 'sv',
    indonesian: 'id', vietnamese: 'vi' };

  register({
    id: 'transcribe', category: 'ai', name: 'Transcribe & Subtitle Audio or Video',
    description: 'Turn speech in an audio or video file into a transcript and SRT or WebVTT subtitles with an on-device Whisper model, and watch them on the video.',
    keywords: ['transcribe', 'speech to text', 'whisper', 'transcript', 'dictation', 'captions', 'closed captions', 'translate',
      'subtitles', 'subtitle generator', 'generate subtitles', 'srt', 'vtt', 'webvtt', 'audio to text', 'video to text', 'speech recognition'],
    render: function (root) {
      var urls = [];
      function blobUrl(b) { var u = URL.createObjectURL(b); urls.push(u); return u; }
      function freeUrls() { urls.forEach(function (u) { URL.revokeObjectURL(u); }); urls = []; }
      U.onTeardown(root, freeUrls);
      whisperTool(root, {
        hint: 'MP4, MOV, MKV, MP3, WAV, M4A… nothing is uploaded', action: 'Transcribe',
        translateLabel: 'Translate to English (instead of transcribing in the original language)',
        render: function (r, file, opts) {
          freeUrls();
          var base = baseName(file.name);

          /* Transcript */
          var stamps = U.checkbox('Show timestamps');
          var txt = U.textarea({ rows: 10, value: r.text, spellcheck: false, dataset: { k: 'transcript' } });
          stamps.input.addEventListener('change', function () {
            txt.value = stamps.input.checked
              ? r.chunks.map(function (c) { return '[' + fmtTime(c.start) + '] ' + c.text; }).join('\n')
              : r.text;
          });
          var words = r.text ? r.text.split(/\s+/).filter(Boolean).length : 0;
          var transcript = U.panel('Transcript',
            U.stats([{ label: 'Words', value: String(words) }, { label: 'Audio', value: fmtTime(r.duration) }, { label: 'Segments', value: String(r.chunks.length) }]),
            txt, stamps,
            U.btnrow(U.copyBtn('Copy', function () { return txt.value; }),
              U.button('Download TXT', function () { U.saveText(base + '.txt', txt.value); })));

          /* Subtitles: editable, in either format */
          var subs = U.textarea({ rows: 10, value: toSRT(r.chunks), spellcheck: false, class: 'mono', dataset: { k: 'subs' } });
          var fmt = choice('Subtitle format', [
            { value: 'srt', label: 'SRT', desc: 'SRT works with VLC, YouTube, Premiere and most players.' },
            { value: 'vtt', label: 'WebVTT', desc: 'WebVTT (.vtt) is the format for HTML5 video on the web.' }
          ], 'srt', function (v) { subs.value = v === 'vtt' ? srtToVtt(subs.value) : vttToSrt(subs.value); refresh(); });
          function asSrt() { return fmt.value === 'srt' ? subs.value : vttToSrt(subs.value); }
          function asVtt() { return fmt.value === 'vtt' ? subs.value : srtToVtt(subs.value); }
          var n = r.chunks.length;
          var subsPanel = U.panel('Subtitles · ' + n + ' cue' + (n === 1 ? '' : 's'), fmt, subs,
            desc('Correct any words here before you download. The preview below follows your edits.'),
            U.btnrow(U.button('Download SRT', function () { U.saveText(base + '.srt', asSrt(), 'application/x-subrip'); }),
              U.button('Download VTT', function () { U.saveText(base + '.vtt', asVtt(), 'text/vtt'); }, 'ghost'),
              U.copyBtn('Copy', function () { return subs.value; })));

          /* Preview: the video with the subtitles as a track, or the audio
             with the current line shown underneath. */
          var isVideo = /^video\//.test(file.type) || /^(mp4|m4v|mov|webm|mkv|ogv|avi)$/.test(extOf(file.name));
          var media = isVideo
            ? el('video', { src: blobUrl(file), controls: true, playsInline: true, preload: 'metadata', class: 'gv-preview' })
            : el('audio', { src: blobUrl(file), controls: true, preload: 'metadata' });
          var caption = isVideo ? null : el('div', { class: 'gv-caption', dataset: { k: 'caption' } });
          var trackEl = null, cues = [];
          var lang = opts && opts.translate ? 'en' : LANG_CODES[opts && opts.language] || 'und';
          function refresh() {
            cues = cuesFromText(subs.value);
            if (!isVideo) { showCaption(); return; }
            if (trackEl) { trackEl.remove(); URL.revokeObjectURL(trackEl.src); }
            trackEl = el('track', { kind: 'subtitles', label: 'Generated', srclang: lang, default: true,
              src: blobUrl(new Blob([asVtt()], { type: 'text/vtt' })) });
            media.appendChild(trackEl);
            var t = trackEl.track;
            setTimeout(function () { if (t) t.mode = 'showing'; });
          }
          function showCaption() {
            var now = media.currentTime, cue = cues.filter(function (c) { return now >= c.start && now < c.end; })[0];
            caption.textContent = cue ? cue.text : '';
          }
          if (!isVideo) media.addEventListener('timeupdate', showCaption);
          subs.addEventListener('input', U.debounce(refresh, 400));
          refresh();
          return [transcript, subsPanel, U.panel('Preview with subtitles', media, caption)];
        }
      });
    }
  });


  /* --- Video Converter ----------------------------------------------------- */
  register({
    id: 'video-converter', name: 'Video Converter',
    description: 'Convert between MP4, WebM, MOV, MKV and AVI.',
    keywords: ['convert', 'mp4', 'webm', 'mov', 'mkv', 'avi', 'format', 'video converter'],
    render: function (root) {
      var fmt, q;
      var Q = { high: [20, 12, 3], balanced: [26, 30, 6], small: [32, 42, 10] };
      fileTool(root, {
        accept: 'video/*', hint: 'MP4, MOV, MKV, WebM, AVI… nothing is uploaded', working: 'Converting', needVideo: true,
        action: function () { return 'Convert to ' + (fmt ? fmt.value.toUpperCase() : 'MP4'); },
        options: function (ctx) {
          fmt = choice('Convert to', [
            { value: 'mp4', label: 'MP4', desc: 'H.264 + AAC. Plays on every phone, browser and editor.' },
            { value: 'webm', label: 'WEBM', desc: 'VP8 + Vorbis. Open format for the web. Encoding is slower.' },
            { value: 'mov', label: 'MOV', desc: 'H.264 + AAC in a QuickTime file, for Apple apps and Final Cut.' },
            { value: 'mkv', label: 'MKV', desc: 'H.264 + AAC in Matroska. Flexible, loved by media players like VLC.' },
            { value: 'avi', label: 'AVI', desc: 'MPEG-4 Part 2 + MP3, for old players and devices.' }
          ], 'mp4', function () { ctx.refresh(); });
          q = choice('Quality', [
            { value: 'high', label: 'High — best quality' },
            { value: 'balanced', label: 'Balanced — recommended' },
            { value: 'small', label: 'Small — smallest file' }
          ], 'balanced');
          return [fmt, q];
        },
        run: async function (ctx) {
          var f = fmt.value, lv = Q[q.value], name = baseName(ctx.st.file.name) + '.' + f;
          var enc;
          if (f === 'webm') enc = ['-c:v', 'libvpx', '-deadline', 'realtime', '-cpu-used', '8', '-crf', String(lv[1]), '-b:v', q.value === 'high' ? '4M' : q.value === 'balanced' ? '1.5M' : '600k', '-c:a', 'libvorbis', '-b:a', '128k'];
          else if (f === 'avi') enc = ['-c:v', 'mpeg4', '-q:v', String(lv[2]), '-c:a', 'libmp3lame', '-b:a', '192k'];
          else enc = vEnc(lv[0]).concat(AAC, f === 'mkv' ? [] : MP4_TAIL);
          var out = await ffRun({ inputs: [ctx.st.file], duration: ctx.st.info.duration, onProgress: ctx.progress,
            args: function (p, d) { return ['-i', p[0], '-map', '0:v:0', '-map', '0:a:0?', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2'].concat(enc, [d + '/out.' + f]); },
            outputs: ['out.' + f] });
          return outCard(ctx, out[0], name);
        }
      });
    }
  });

  /* Format + bitrate controls shared by the audio tools. */
  function audioOutputControls(initialFmt, title) {
    var br = choice('Bitrate', BITRATES, '192');
    var hint = desc('192 kbps is a good default. Higher means a bigger file, not a better original.');
    var fmt = choice(title || 'Save as', AUDIO_FORMATS.map(function (f) {
      return { value: f.value, label: f.label, desc: {
        mp3: 'MP3 plays on everything.', wav: 'WAV is uncompressed: exact, but large.', m4a: 'M4A (AAC) is smaller than MP3 at the same quality.',
        ogg: 'OGG (Vorbis) is an open format, good for games and the web.', flac: 'FLAC is lossless but about half the size of WAV.'
      }[f.value] };
    }), initialFmt || 'mp3', function (v) { brWrap.style.display = isLossless(v) ? 'none' : ''; });
    var brWrap = el('div', null, br, hint);
    brWrap.style.display = isLossless(fmt.value) ? 'none' : '';
    return { fmt: fmt, br: br, nodes: [fmt, brWrap], enc: function () { return audioEnc(fmt.value, br.value); } };
  }

  /* --- Audio Converter ----------------------------------------------------- */
  register({
    id: 'audio-converter', category: 'audio', name: 'Audio Converter',
    description: 'Convert audio between MP3, WAV, M4A, OGG and FLAC.',
    keywords: ['audio', 'convert', 'mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'audio converter'],
    render: function (root) {
      var ctl;
      fileTool(root, {
        accept: 'audio/*,video/*', hint: 'MP3, WAV, M4A, OGG, FLAC — or a video to pull the audio out of', working: 'Converting', needAudio: true,
        action: function () { return 'Convert to ' + (ctl ? ctl.fmt.value.toUpperCase() : 'MP3'); },
        options: function (ctx) {
          ctl = audioOutputControls('mp3', 'Convert to');
          ctl.fmt.chips.addEventListener('click', function () { setTimeout(ctx.refresh); });
          return ctl.nodes;
        },
        run: async function (ctx) {
          var f = ctl.fmt.value;
          var out = await ffRun({ inputs: [ctx.st.file], duration: ctx.st.info.duration, onProgress: ctx.progress,
            args: function (p, d) { return ['-i', p[0], '-vn', '-map', '0:a:0'].concat(ctl.enc(), [d + '/out.' + f]); },
            outputs: ['out.' + f] });
          return outCard(ctx, out[0], baseName(ctx.st.file.name) + '.' + f, fmtTime(ctx.st.info.duration));
        }
      });
    }
  });

  /* --- Screen Recorder ----------------------------------------------------- */
  function pickMime(kind) {
    var list = kind === 'audio'
      ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
      : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    for (var i = 0; i < list.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported(list[i])) return list[i];
    return '';
  }

  register({
    id: 'screen-recorder', name: 'Screen Recorder',
    description: 'Record your screen, a window or a tab, with system sound and your microphone.',
    keywords: ['screen recorder', 'record screen', 'screencast', 'capture', 'tab recording', 'webm'],
    render: function (root) {
      root.classList.add('g-video');
      var mic = U.checkbox('Also record my microphone');
      var timer = el('div', { class: 'gv-big', text: '0:00' });
      var startBtn = U.button('Start recording', start);
      var pauseBtn = U.button('Pause', pause, 'ghost');
      var stopBtn = U.button('Stop', stop);
      var status = U.note('');
      var resBox = el('div', { class: 'stack gv-result' });
      pauseBtn.style.display = stopBtn.style.display = 'none';
      timer.style.display = 'none';
      root.appendChild(U.panel('Record a screen, a window, or a single browser tab',
        U.note('Your browser will ask which one to share. Nothing is uploaded.'), mic, timer, U.btnrow(startBtn, pauseBtn, stopBtn), status));
      root.appendChild(resBox);

      var rec = null, streams = [], chunks = [], t0 = 0, acc = 0, tick = null, actx = null;

      function cleanup() {
        clearInterval(tick); tick = null;
        streams.forEach(function (s) { s.getTracks().forEach(function (t) { t.stop(); }); });
        streams = [];
        if (actx) { actx.close().catch(function () {}); actx = null; }
      }
      function elapsed() { return acc + (rec && rec.state === 'recording' ? (performance.now() - t0) / 1000 : 0); }

      async function start() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          status.className = 'note err'; status.textContent = 'This browser cannot record the screen. Try a desktop version of Chrome, Edge or Firefox.'; return;
        }
        status.className = 'note'; status.textContent = '';
        try {
          var screen = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true });
          streams.push(screen);
          var tracks = screen.getVideoTracks().slice();
          var audioTracks = screen.getAudioTracks();
          if (mic.input.checked) {
            try {
              var m = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
              streams.push(m);
              audioTracks = audioTracks.concat(m.getAudioTracks());
            } catch (e) { status.textContent = 'Microphone not available (' + (e.message || e.name) + '). Recording without it.'; }
          }
          if (audioTracks.length > 1) {
            actx = new AudioContext();
            var dest = actx.createMediaStreamDestination();
            audioTracks.forEach(function (t) { actx.createMediaStreamSource(new MediaStream([t])).connect(dest); });
            tracks = tracks.concat(dest.stream.getAudioTracks());
          } else tracks = tracks.concat(audioTracks);
          var mime = pickMime('video');
          rec = new MediaRecorder(new MediaStream(tracks), mime ? { mimeType: mime } : undefined);
          chunks = [];
          rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
          rec.onstop = finish;
          screen.getVideoTracks()[0].addEventListener('ended', function () { if (rec && rec.state !== 'inactive') rec.stop(); });
          rec.start(1000);
          acc = 0; t0 = performance.now();
          tick = setInterval(function () { timer.textContent = fmtTime(elapsed()); }, 250);
          timer.style.display = ''; timer.textContent = '0:00';
          startBtn.style.display = 'none'; pauseBtn.style.display = stopBtn.style.display = '';
          pauseBtn.textContent = 'Pause';
          resBox.replaceChildren();
        } catch (err) {
          cleanup();
          status.className = 'note err';
          status.textContent = err && err.name === 'NotAllowedError' ? 'Recording was cancelled or permission was denied.' : (err.message || String(err));
        }
      }
      function pause() {
        if (!rec) return;
        if (rec.state === 'recording') { acc = elapsed(); rec.pause(); pauseBtn.textContent = 'Resume'; }
        else if (rec.state === 'paused') { t0 = performance.now(); rec.resume(); pauseBtn.textContent = 'Pause'; }
      }
      function stop() { if (rec && rec.state !== 'inactive') { acc = elapsed(); rec.stop(); } }
      function finish() {
        var secs = acc;
        cleanup();
        startBtn.style.display = ''; startBtn.textContent = 'Record again';
        pauseBtn.style.display = stopBtn.style.display = 'none';
        var type = (rec && rec.mimeType) || 'video/webm';
        var ext = /mp4/.test(type) ? 'mp4' : 'webm';
        var blob = new Blob(chunks, { type: type.split(';')[0] });
        rec = null;
        var stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
        var name = 'screen-recording-' + stamp + '.' + ext;
        var mp4Btn = U.button('Convert to MP4', async function () {
          mp4Btn.disabled = true;
          var p = U.progress(); card.appendChild(p);
          try {
            var src = new File([blob], name, { type: blob.type });
            var info = await probe(src);
            var out = await ffRun({ inputs: [src], duration: info.duration || secs, onProgress: function (f) { p.set('Converting… ' + Math.round(f * 100) + '%', f); },
              args: function (pp, d) { return ['-i', pp[0], '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-r', '30'].concat(vEnc(23), AAC, MP4_TAIL, [d + '/out.mp4']); },
              outputs: ['out.mp4'] });
            var mp4 = toBlob(out[0].data, 'x.mp4');
            p.done('MP4 ready · ' + size(mp4.size));
            card.appendChild(U.btnrow(U.button('Download MP4', function () { U.saveBlob(name.replace(/\.\w+$/, '.mp4'), mp4); })));
          } catch (e) { p.fail(e); mp4Btn.disabled = false; }
        }, 'ghost');
        var card = el('div', { class: 'stack' }, mediaPreview(blob, name),
          el('div', { class: 'gv-fileinfo', text: name + ' · ' + fmtTime(secs) + ' · ' + size(blob.size) }),
          U.btnrow(U.button('Download ' + ext.toUpperCase(), function () { U.saveBlob(name, blob); }), mp4Btn));
        resBox.replaceChildren(U.panel('Your recording', card));
      }
      U.onTeardown(root, function () { if (rec && rec.state !== 'inactive') { rec.onstop = null; rec.stop(); } cleanup(); });
    }
  });

  /* --- Resize Video -------------------------------------------------------- */
  register({
    id: 'resize-video', name: 'Resize Video',
    description: 'Scale a video down to a standard height or a percentage of its size.',
    keywords: ['resize', 'scale', 'downscale', '720p', '1080p', 'resolution', 'smaller video'],
    render: function (root) {
      var hChips, pChips, sel = { kind: 'h', v: 720 }, info2;
      function target(info) {
        var w = info.width, h = info.height, nh = sel.kind === 'h' ? sel.v : Math.round(h * sel.v / 100);
        nh = Math.max(2, nh - nh % 2);
        var nw = Math.round(w * nh / h); nw = Math.max(2, nw - nw % 2);
        return { w: nw, h: nh };
      }
      var ctx = fileTool(root, {
        accept: 'video/*', action: 'Resize Video', working: 'Resizing', needVideo: true,
        options: function (ctx) {
          var info = ctx.st.info;
          var hs = [2160, 1440, 1080, 720, 480, 360];
          var def = hs.filter(function (h) { return h < info.height; })[0];
          sel = def ? { kind: 'h', v: def } : { kind: 'p', v: 50 };
          info2 = desc('');
          function upd() {
            var t = target(info);
            info2.textContent = info.width + '×' + info.height + ' → ' + t.w + '×' + t.h +
              (t.h > info.height ? '. That is bigger than the original, so it will not look any sharper.' : '');
          }
          hChips = U.chips(hs.map(function (h) { return { value: String(h), label: h + 'p' }; }), function (v) {
            sel = { kind: 'h', v: +v }; Array.prototype.forEach.call(pChips.children, function (c) { c.classList.remove('on'); }); upd();
          }, sel.kind === 'h' ? String(sel.v) : 'none');
          pChips = U.chips([{ value: '75', label: '75%' }, { value: '50', label: '50%' }, { value: '25', label: '25%' }], function (v) {
            sel = { kind: 'p', v: +v }; Array.prototype.forEach.call(hChips.children, function (c) { c.classList.remove('on'); }); upd();
          }, sel.kind === 'p' ? String(sel.v) : 'none');
          upd();
          return [el('div', null, label('Resize to a height'), hChips), el('div', null, label('Or scale by percentage'), pChips), info2];
        },
        run: async function (ctx) {
          var t = target(ctx.st.info);
          var out = await ffRun({ inputs: [ctx.st.file], duration: ctx.st.info.duration, onProgress: ctx.progress,
            args: function (p, d) { return ['-i', p[0], '-map', '0:v:0', '-map', '0:a:0?', '-vf', 'scale=' + t.w + ':' + t.h + ':flags=lanczos,setsar=1'].concat(vEnc(22), AAC, MP4_TAIL, [d + '/out.mp4']); },
            outputs: ['out.mp4'] });
          return outCard(ctx, out[0], baseName(ctx.st.file.name) + '-' + t.h + 'p.mp4', t.w + '×' + t.h);
        }
      });
    }
  });

  /* --- Crop Video ---------------------------------------------------------- */
  var SHAPES = {
    '1:1': 'Square — Instagram feed', '9:16': 'Vertical — Reels, TikTok, Shorts', '16:9': 'Widescreen — YouTube',
    '4:5': 'Portrait — Instagram feed', '4:3': 'Classic'
  };
  function even(n) { return Math.max(2, Math.round(n / 2) * 2); }
  function cropBox(w, h, shape, pos) {
    var r = shape.split(':'), ar = +r[0] / +r[1];
    var cw = w, ch = h;
    if (w / h > ar + 1e-3) cw = Math.min(w - w % 2, even(h * ar));
    else if (w / h < ar - 1e-3) ch = Math.min(h - h % 2, even(w / ar));
    else { cw = w - w % 2; ch = h - h % 2; }
    var frac = pos === 'start' ? 0 : pos === 'end' ? 1 : 0.5;
    return { w: cw, h: ch, x: Math.round((w - cw) * frac), y: Math.round((h - ch) * frac),
      horizontal: cw < w - 1, vertical: ch < h - 1, same: cw >= w - 1 && ch >= h - 1 };
  }
  register({
    id: 'crop-video', name: 'Crop Video',
    description: 'Crop a video to square, vertical, widescreen or portrait.',
    keywords: ['crop', 'square', 'vertical', '9:16', '1:1', 'aspect ratio', 'instagram', 'tiktok'],
    render: function (root) {
      var shape, pos, posWrap, canvas, info2, frame, ctxRef;
      fileTool(root, {
        accept: 'video/*', action: 'Crop Video', working: 'Cropping', needVideo: true,
        ready: function () { return shape && !cropBox(ctxRef.st.info.width, ctxRef.st.info.height, shape.value, 'mid').same; },
        options: function (ctx) {
          ctxRef = ctx;
          var info = ctx.st.info;
          canvas = el('canvas', { class: 'gv-preview', width: 320, height: 180 });
          info2 = el('div', { class: 'gv-fileinfo' });
          shape = choice('Shape', Object.keys(SHAPES).map(function (k) { return { value: k, label: k, desc: SHAPES[k] }; }), '1:1', upd);
          posWrap = el('div');
          pos = null;
          function buildPos() {
            var b = cropBox(info.width, info.height, shape.value, 'mid');
            if (b.same) {
              posWrap.replaceChildren(desc('This video is already ' + shape.value + ', so there is nothing to crop away. Pick a different shape.'));
              return;
            }
            var labels = b.horizontal ? ['Left', 'Center', 'Right'] : ['Top', 'Middle', 'Bottom'];
            var cur = pos ? pos.value : 'mid';
            pos = choice('Keep which part (this clip crops ' + (b.horizontal ? 'left to right' : 'top to bottom') + ')',
              [{ value: 'start', label: labels[0] }, { value: 'mid', label: labels[1] }, { value: 'end', label: labels[2] }], cur, draw);
            posWrap.replaceChildren(pos);
          }
          function upd() { buildPos(); draw(); ctx.refresh(); }
          function draw() {
            var b = cropBox(info.width, info.height, shape.value, pos ? pos.value : 'mid');
            info2.textContent = 'Original ' + info.width + '×' + info.height + ' → Cropped ' + b.w + '×' + b.h;
            var s = Math.min(1, 360 / info.width, 300 / info.height);
            canvas.width = Math.max(1, Math.round(info.width * s)); canvas.height = Math.max(1, Math.round(info.height * s));
            var g = canvas.getContext('2d');
            if (frame) g.drawImage(frame, 0, 0, canvas.width, canvas.height); else { g.fillStyle = '#555'; g.fillRect(0, 0, canvas.width, canvas.height); }
            g.fillStyle = 'rgba(0,0,0,.6)';
            g.fillRect(0, 0, canvas.width, canvas.height);
            if (frame) g.drawImage(frame, b.x * frame.width / info.width, b.y * frame.height / info.height, b.w * frame.width / info.width, b.h * frame.height / info.height, b.x * s, b.y * s, b.w * s, b.h * s);
            else { g.fillStyle = '#999'; g.fillRect(b.x * s, b.y * s, b.w * s, b.h * s); }
            g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(b.x * s + 1, b.y * s + 1, b.w * s - 2, b.h * s - 2);
          }
          buildPos(); draw();
          grabFrame(ctx.st.file, info).then(function (img) { frame = img; if (img) draw(); });
          return [info2, canvas, shape, posWrap];
        },
        run: async function (ctx) {
          var info = ctx.st.info, b = cropBox(info.width, info.height, shape.value, pos ? pos.value : 'mid');
          var out = await ffRun({ inputs: [ctx.st.file], duration: info.duration, onProgress: ctx.progress,
            args: function (p, d) { return ['-i', p[0], '-map', '0:v:0', '-map', '0:a:0?', '-vf', 'crop=' + b.w + ':' + b.h + ':' + b.x + ':' + b.y + ',setsar=1'].concat(vEnc(20), AAC, MP4_TAIL, [d + '/out.mp4']); },
            outputs: ['out.mp4'] });
          return outCard(ctx, out[0], baseName(ctx.st.file.name) + '-' + shape.value.replace(':', 'x') + '.mp4', b.w + '×' + b.h);
        }
      });
    }
  });

  /* One still from a video (for previews), via ffmpeg so any codec works. */
  async function grabFrame(file, info, at) {
    try {
      var t = at !== undefined ? at : Math.min(1, (info.duration || 0) / 3);
      var out = await ffRun({ inputs: [file], args: function (p, d) { return ['-ss', String(t), '-i', p[0], '-frames:v', '1', '-vf', 'scale=480:-2', d + '/f.png']; }, outputs: ['f.png'] });
      var bmp = await createImageBitmap(new Blob([out[0].data], { type: 'image/png' }));
      return bmp;
    } catch (e) { return null; }
  }

  /* --- List-of-files tools (merge video / merge audio / slideshow) --------- */
  function listTool(root, o) {
    root.classList.add('g-video');
    var items = [];
    var zone = U.dropzone({ accept: o.accept, multiple: true, label: o.drop, hint: o.hint, onFiles: add });
    var summary = el('div', { class: 'gv-fileinfo' });
    var list = el('ol', { class: 'gv-list' });
    var optsBox = el('div', { class: 'gv-opts' });
    var act = U.button('', function () { go(); }); act.classList.add('gv-act');
    var reset = U.button('Reset', function () { items = []; draw(); resBox.replaceChildren(); prog.set(''); }, 'ghost');
    var cancel = U.button('Cancel', ffCancel, 'ghost'); cancel.style.display = 'none';
    var prog = U.progress();
    var resBox = el('div', { class: 'stack gv-result' });
    var work = el('div', { class: 'stack' }, summary, list, optsBox, U.btnrow(act, reset, cancel), prog);
    root.appendChild(U.panel(null, zone, work));
    root.appendChild(resBox);
    var busy = false;
    var ctx = { items: function () { return items; }, prog: prog, redraw: draw, optsBox: optsBox };
    if (o.options) optsBox.replaceChildren.apply(optsBox, [].concat(o.options(ctx)));

    async function add(files) {
      for (var i = 0; i < files.length; i++) {
        var it = { file: files[i], info: null, id: Math.random().toString(36).slice(2) };
        items.push(it);
      }
      draw();
      for (var j = 0; j < items.length; j++) {
        var x = items[j];
        if (x.info || x.error) continue;
        try { x.info = await (o.probe || probe)(x.file); } catch (e) { x.error = e.message || String(e); }
        draw();
      }
    }
    function move(i, d) { var j = i + d; if (j < 0 || j >= items.length) return; var t = items[i]; items[i] = items[j]; items[j] = t; draw(); }
    function draw() {
      var has = items.length > 0;
      zone.querySelector('strong').textContent = has ? o.addMore : o.drop;
      work.style.display = has ? '' : 'none';
      list.replaceChildren.apply(list, items.map(function (it, i) {
        var meta = it.error ? it.error : it.info ? o.meta(it) : 'Reading…';
        return el('li', { class: 'gv-item' },
          el('b', { text: (i + 1) + '.' }),
          it.thumb || null,
          el('div', { class: 'gv-grow' }, el('div', { text: it.file.name }), el('small', { text: meta })),
          el('button', { class: 'btn ghost', type: 'button', 'aria-label': 'Move up', title: 'Move up', text: o.arrows ? '←' : '↑', disabled: i === 0, onclick: function () { move(i, -1); } }),
          el('button', { class: 'btn ghost', type: 'button', 'aria-label': 'Move down', title: 'Move down', text: o.arrows ? '→' : '↓', disabled: i === items.length - 1, onclick: function () { move(i, 1); } }),
          el('button', { class: 'btn ghost', type: 'button', 'aria-label': 'Remove', title: 'Remove', text: '✕', onclick: function () { items.splice(i, 1); draw(); } }));
      }));
      summary.textContent = o.summary(items);
      act.textContent = o.action(items);
      act.disabled = busy || !o.ready(items);
      if (o.onDraw) o.onDraw(items);
    }
    async function go() {
      if (busy) return;
      busy = true; draw(); cancel.style.display = '';
      resBox.replaceChildren();
      prog.set((o.working || 'Working') + '…', 0);
      var t0 = performance.now();
      try {
        var nodes = await o.run(items.slice(), function (f) { prog.set((o.working || 'Working') + '… ' + Math.round(f * 100) + '%', f); });
        resBox.replaceChildren.apply(resBox, [].concat(nodes));
        prog.done('Done in ' + ((performance.now() - t0) / 1000).toFixed(1) + 's');
      } catch (err) {
        prog.fail(/terminate|Cancelled/i.test(err && err.message) ? new Error('Cancelled.') : err);
      } finally { busy = false; cancel.style.display = 'none'; draw(); }
    }
    U.onTeardown(root, function () { if (busy) ffCancel(); });
    draw();
    return ctx;
  }

  function evenDims(w, h) { return { w: Math.max(2, Math.round(w / 2) * 2), h: Math.max(2, Math.round(h / 2) * 2) }; }
  function outSizeFor(w, h, targetH) {
    /* Keep the shape of the source, fit the smaller side to the target (e.g. 720p). */
    var landscape = w >= h;
    var short = targetH;
    return landscape ? evenDims(short * w / h, short) : evenDims(short, short * h / w);
  }

  /* --- Merge Video --------------------------------------------------------- */
  register({
    id: 'merge-video', name: 'Merge Video',
    description: 'Join several clips into one video, in the order you choose.',
    keywords: ['merge', 'join', 'combine', 'concatenate', 'video joiner', 'append'],
    render: function (root) {
      var res, note, current = [];
      listTool(root, {
        accept: 'video/*', drop: 'Drop videos here, or click to choose several', addMore: 'Add more videos',
        hint: 'They can be different sizes and formats. Nothing is uploaded.',
        meta: function (it) { return it.info.width + '×' + it.info.height + ' · ' + fmtSecs(it.info.duration || 0) + ' · ' + size(it.file.size); },
        summary: function (items) {
          var t = items.reduce(function (a, it) { return a + ((it.info && it.info.duration) || 0); }, 0);
          return items.length + ' clip' + (items.length === 1 ? '' : 's') + ', about ' + Math.round(t) + 's total' + (items.length < 2 ? ' · add at least one more' : '');
        },
        action: function (items) { return 'Merge ' + items.length + ' clip' + (items.length === 1 ? '' : 's'); },
        ready: function (items) { return items.length >= 2 && items.every(function (it) { return it.info && it.info.hasVideo; }); },
        options: function () {
          note = desc('');
          res = choice('Output size', [{ value: '1080', label: '1080p' }, { value: '720', label: '720p' }, { value: '480', label: '480p' }], '720', function () { upd(); });
          return [res, note];
        },
        onDraw: function (items) { current = items; upd(); },
        working: 'Merging',
        run: async function (items, progress) {
          var first = items[0].info, sz = outSizeFor(first.width, first.height, +res.value);
          var total = items.reduce(function (a, it) { return a + (it.info.duration || 0); }, 0);
          var parts = [], fc = [];
          items.forEach(function (it, i) {
            fc.push('[' + i + ':v:0]scale=' + sz.w + ':' + sz.h + ':force_original_aspect_ratio=decrease,pad=' + sz.w + ':' + sz.h + ':(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=30,format=yuv420p[v' + i + ']');
            if (it.info.hasAudio) fc.push('[' + i + ':a:0]aresample=48000,aformat=channel_layouts=stereo,apad,atrim=0:' + (it.info.duration || 0).toFixed(3) + '[a' + i + ']');
            else fc.push('anullsrc=r=48000:cl=stereo,atrim=0:' + (it.info.duration || 0).toFixed(3) + '[a' + i + ']');
            parts.push('[v' + i + '][a' + i + ']');
          });
          fc.push(parts.join('') + 'concat=n=' + items.length + ':v=1:a=1[v][a]');
          var out = await ffRun({ inputs: items.map(function (it) { return it.file; }), duration: total, onProgress: progress,
            args: function (p, d) {
              var a = [];
              p.forEach(function (x) { a.push('-i', x); });
              return a.concat(['-filter_complex', fc.join(';'), '-map', '[v]', '-map', '[a]'], vEnc(22), AAC, MP4_TAIL, [d + '/out.mp4']);
            }, outputs: ['out.mp4'] });
          var blob = toBlob(out[0].data, 'merged.mp4');
          return resultCard(blob, 'merged.mp4', sz.w + '×' + sz.h + ' · ' + fmtTime(total));
        }
      });
      function upd() {
        var f = current[0] && current[0].info;
        if (!note) return;
        if (!f) { note.textContent = ''; return; }
        var sz = outSizeFor(f.width, f.height, +res.value);
        note.textContent = 'The video keeps the shape of clip 1: ' + sz.w + '×' + sz.h + '. A clip with a different shape is fitted inside with black bars. Nothing is stretched.';
      }
    }
  });
  /* Container to keep when the picture is copied rather than re-encoded. */
  function copyContainer(file) {
    var ext = extOf(file.name);
    if (ext === 'm4v') return 'mp4';
    return ['mp4', 'mov', 'mkv', 'webm'].indexOf(ext) >= 0 ? ext : 'mkv';
  }
  function audioFor(container) {
    return container === 'webm' ? ['-c:a', 'libopus', '-b:a', '128k', '-ar', '48000'] : ['-c:a', 'aac', '-b:a', '160k'];
  }

  /* atempo only accepts 0.5–2 per stage, so chain stages for 0.25x or 4x. */
  function atempoChain(s) {
    var parts = [];
    while (s > 2) { parts.push('atempo=2'); s /= 2; }
    while (s < 0.5) { parts.push('atempo=0.5'); s /= 0.5; }
    if (Math.abs(s - 1) > 1e-6) parts.push('atempo=' + s.toFixed(4));
    return parts.length ? parts.join(',') : 'anull';
  }

  /* --- Speed ---------------------------------------------------------------- */
  register({
    id: 'speed-video', name: 'Change Video Speed',
    description: 'Play a video faster or slower, with the sound kept in step and at its normal pitch.',
    keywords: ['speed', 'slow motion', 'fast forward', 'timelapse', '2x', 'playback speed'],
    render: function (root) {
      var sp;
      var slow = 'Slower than real time. The sound is stretched to match without dropping in pitch.';
      var fast = 'Faster than real time. The sound keeps up without turning into a chipmunk.';
      fileTool(root, {
        accept: 'video/*', working: 'Changing the speed', needVideo: true,
        action: function () { return 'Make it ' + (sp ? sp.value : '2') + 'x'; },
        options: function (ctx) {
          var len = el('div', { class: 'gv-fileinfo' });
          function upd() { len.textContent = 'Length ' + fmtSecs(ctx.st.info.duration) + ' → ' + fmtSecs(ctx.st.info.duration / +sp.value); }
          sp = choice('Speed', ['0.25', '0.5', '0.75', '1.25', '1.5', '2', '4'].map(function (v) {
            return { value: v, label: v + 'x', desc: +v < 1 ? slow : fast };
          }), '2', function () { upd(); ctx.refresh(); });
          upd();
          return [len, sp];
        },
        run: async function (ctx) {
          var s = +sp.value, info = ctx.st.info;
          var af = info.hasAudio ? ['-filter:a', atempoChain(s)] : ['-an'];
          var out = await ffRun({ inputs: [ctx.st.file], duration: info.duration / s, onProgress: ctx.progress,
            args: function (p, d) {
              return ['-i', p[0], '-map', '0:v:0', '-map', '0:a:0?', '-filter:v', 'setpts=PTS/' + s + ',scale=trunc(iw/2)*2:trunc(ih/2)*2'].concat(af, vEnc(21), info.hasAudio ? AAC : [], MP4_TAIL, [d + '/out.mp4']);
            }, outputs: ['out.mp4'] });
          return outCard(ctx, out[0], baseName(ctx.st.file.name) + '-' + sp.value + 'x.mp4', fmtTime(info.duration) + ' → ' + fmtTime(info.duration / s));
        }
      });
    }
  });

  /* --- Reverse -------------------------------------------------------------- */
  register({
    id: 'reverse-video', name: 'Reverse Video',
    description: 'Play a video backwards, with the sound reversed too.',
    keywords: ['reverse', 'backwards', 'rewind', 'play backwards'],
    render: function (root) {
      fileTool(root, {
        accept: 'video/*', action: 'Reverse Video', working: 'Reversing', needVideo: true,
        options: function (ctx) {
          return (ctx.st.info.duration || 0) > 60 ? U.note('Reversing holds every frame in memory. A clip this long may run out of memory; trim it first if it fails.') : null;
        },
        run: async function (ctx) {
          var info = ctx.st.info;
          var out = await ffRun({ inputs: [ctx.st.file], duration: info.duration, onProgress: ctx.progress,
            args: function (p, d) {
              return ['-i', p[0], '-map', '0:v:0', '-map', '0:a:0?', '-vf', 'reverse,scale=trunc(iw/2)*2:trunc(ih/2)*2'].concat(info.hasAudio ? ['-af', 'areverse'] : [], vEnc(21), info.hasAudio ? AAC : [], MP4_TAIL, [d + '/out.mp4']);
            }, outputs: ['out.mp4'] });
          return outCard(ctx, out[0], baseName(ctx.st.file.name) + '-reversed.mp4', fmtTime(info.duration));
        }
      });
    }
  });

  /* --- Loop ----------------------------------------------------------------- */
  register({
    id: 'loop-video', name: 'Loop Video',
    description: 'Repeat a video several times back to back, without re-encoding.',
    keywords: ['loop', 'repeat', 'longer', 'replay', 'lossless'],
    render: function (root) {
      var n;
      fileTool(root, {
        accept: 'video/*', working: 'Looping', needVideo: true,
        action: function () { return 'Repeat ' + (n ? n.value : '3') + ' times'; },
        options: function (ctx) {
          n = choice('How many times should it play?', ['2', '3', '5', '10'].map(function (v) { return { value: v, label: v + '×' }; }), '3', function () { ctx.refresh(); upd(); });
          var total = desc('');
          function upd() { total.textContent = 'The result is ' + fmtTime(ctx.st.info.duration * +n.value) + ' long.'; }
          upd();
          return [n, total, U.note('The video is copied rather than re-encoded, so this is lossless and finishes almost immediately.')];
        },
        run: async function (ctx) {
          var times = +n.value, c = copyContainer(ctx.st.file), dur = ctx.st.info.duration * times;
          var out = await ffRun({ inputs: [ctx.st.file], duration: dur, onProgress: ctx.progress,
            args: function (p, d) { return ['-stream_loop', String(times - 1), '-i', p[0], '-map', '0:v:0', '-map', '0:a:0?', '-c', 'copy'].concat(c === 'mp4' || c === 'mov' ? MP4_TAIL : [], [d + '/out.' + c]); },
            outputs: ['out.' + c] });
          return outCard(ctx, out[0], baseName(ctx.st.file.name) + '-x' + times + '.' + c, fmtTime(dur));
        }
      });
    }
  });

  /* --- Split ---------------------------------------------------------------- */
  function zipAndSave(zipName, files) {
    return U.script('assets/vendor/jszip/jszip.min.js').then(function () {
      var zip = new window.JSZip();
      files.forEach(function (f) { zip.file(f.name, f.blob); });
      return zip.generateAsync({ type: 'blob' });
    }).then(function (blob) { U.saveBlob(zipName, blob); return blob; });
  }
  function fileRow(n, f, meta) {
    var li = el('li', { class: 'gv-item gv-out', dataset: { name: f.name, size: String(f.blob.size) } },
      el('b', { text: n + '.' }),
      el('div', { class: 'gv-grow' }, el('div', { text: f.name }), el('small', { text: meta })),
      U.button('Download', function () { U.saveBlob(f.name, f.blob); }));
    li.blob = f.blob;
    return li;
  }

  register({
    id: 'split-video', name: 'Split Video',
    description: 'Cut a video into a number of equal parts and download them one by one or as a zip.',
    keywords: ['split', 'cut into parts', 'segments', 'divide', 'chop', 'pieces'],
    render: function (root) {
      var parts, plan;
      function ranges(dur, n) {
        var out = [];
        for (var i = 0; i < n; i++) out.push([dur * i / n, dur * (i + 1) / n]);
        return out;
      }
      fileTool(root, {
        accept: 'video/*', drop: 'Drop a video here, or click to choose one', working: 'Splitting', needVideo: true,
        action: function () { return 'Split into ' + (parts ? parts.value : '3') + ' parts'; },
        options: function (ctx) {
          plan = desc('');
          var list = el('div', { class: 'gv-fileinfo mono' });
          parts = choice('How many parts?', ['2', '3', '4', '5', '6', '8', '10'].map(function (v) { return { value: v, label: v }; }), '3', function () { upd(); ctx.refresh(); });
          function upd() {
            var dur = ctx.st.info.duration, n = +parts.value;
            plan.textContent = fmtTime(dur) + ' total, cut into ' + n + ' pieces of about ' + fmtSecs(dur / n) + ' each:';
            list.textContent = ranges(dur, n).map(function (r) { return fmtTime(r[0]) + '–' + fmtTime(r[1]); }).join('  ');
          }
          upd();
          return [parts, plan, list];
        },
        run: async function (ctx) {
          var dur = ctx.st.info.duration, n = +parts.value, base = baseName(ctx.st.file.name);
          if (!(dur > 0)) throw new Error('Could not work out how long this video is.');
          var rs = ranges(dur, n), files = [];
          for (var i = 0; i < n; i++) {
            var r = rs[i];
            var out = await ffRun({ inputs: [ctx.st.file], duration: r[1] - r[0],
              onProgress: function (f) { ctx.prog.set('Cutting part ' + (i + 1) + ' of ' + n + '… ', (i + f) / n); },
              args: function (p, d) { return ['-ss', r[0].toFixed(3), '-i', p[0], '-t', (r[1] - r[0]).toFixed(3), '-map', '0:v:0', '-map', '0:a:0?'].concat(vEnc(20), AAC, MP4_TAIL, [d + '/out.mp4']); },
              outputs: ['out.mp4'] });
            files.push({ name: base + '-part' + (i + 1) + '.mp4', blob: toBlob(out[0].data, 'x.mp4'), range: r });
          }
          ctx.st.results = files;
          return [el('div', { class: 'note ok', text: '✓ ' + n + ' parts ready' }),
            U.btnrow(U.button('Download all as a zip', function () { zipAndSave(base + '-parts.zip', files); })),
            el('ol', { class: 'gv-list' }, files.map(function (f, k) { return fileRow(k + 1, f, fmtTime(f.range[0]) + '–' + fmtTime(f.range[1]) + ' · ' + size(f.blob.size)); }))];
        }
      });
    }
  });

  /* --- Two-file tools (video + music, video + logo) ------------------------ */
  function twoFileTool(root, o) {
    root.classList.add('g-video');
    var st = { a: null, b: null, ai: null, bi: null, busy: false };
    function mkZone(i) {
      var spec = o.slots[i];
      var z = U.dropzone({ accept: spec.accept, label: spec.hint, hint: '', onFiles: function (f) { load(i, f[0]); } });
      return el('div', null, label(spec.title), z);
    }
    var zones = [mkZone(0), mkZone(1)];
    var status = el('div', { class: 'gv-fileinfo' });
    var optsBox = el('div', { class: 'gv-opts' });
    var act = U.button('', function () { go(); }); act.classList.add('gv-act');
    var reset = U.button('Reset', function () { doReset(); }, 'ghost');
    var cancel = U.button('Cancel', ffCancel, 'ghost'); cancel.style.display = 'none';
    var prog = U.progress();
    var resBox = el('div', { class: 'stack gv-result' });
    var work = el('div', { class: 'stack' }, optsBox, U.btnrow(act, reset, cancel));
    root.appendChild(U.panel(null, zones[0], zones[1], status, work, prog));
    root.appendChild(resBox);
    var ctx = { st: st, prog: prog, refresh: refresh, progress: function (f) { prog.set((o.working || 'Working') + '… ' + Math.round(f * 100) + '%', f); } };

    function refresh() {
      status.textContent = o.status ? o.status(ctx) : '';
      var ready = st.ai && st.bi;
      work.style.display = ready ? '' : 'none';
      if (ready && !optsBox.childNodes.length) optsBox.replaceChildren.apply(optsBox, [].concat(o.options(ctx)));
      act.textContent = typeof o.action === 'function' ? o.action(ctx) : o.action;
      act.disabled = st.busy || !ready;
    }
    async function load(i, file) {
      if (!file) return;
      var key = i ? 'b' : 'a';
      st[key] = file; st[key + 'i'] = null;
      var z = zones[i].querySelector('.dropzone');
      z.querySelector('strong').textContent = file.name + ' (' + size(file.size) + ')';
      optsBox.replaceChildren(); resBox.replaceChildren();
      prog.set('Reading ' + file.name + '…');
      try {
        st[key + 'i'] = await (o.slots[i].probe || probe)(file);
        prog.set('');
      } catch (e) { st[key] = null; prog.fail(e); }
      refresh();
    }
    function doReset() {
      if (st.busy) ffCancel();
      st.a = st.b = st.ai = st.bi = null;
      zones.forEach(function (z, i) { z.querySelector('.dropzone strong').textContent = o.slots[i].hint; });
      optsBox.replaceChildren(); resBox.replaceChildren(); prog.set('');
      refresh();
    }
    async function go() {
      if (st.busy) return;
      st.busy = true; refresh(); cancel.style.display = '';
      resBox.replaceChildren(); prog.set((o.working || 'Working') + '…', 0);
      var t0 = performance.now();
      try {
        var nodes = await o.run(ctx);
        resBox.replaceChildren.apply(resBox, [].concat(nodes));
        prog.done('Done in ' + ((performance.now() - t0) / 1000).toFixed(1) + 's');
      } catch (err) { prog.fail(/terminate|Cancelled/i.test(err && err.message) ? new Error('Cancelled.') : err); }
      finally { st.busy = false; cancel.style.display = 'none'; refresh(); }
    }
    U.onTeardown(root, function () { if (st.busy) ffCancel(); });
    refresh();
    return ctx;
  }

  /* An image's size without ffmpeg. */
  async function probeImage(file) {
    var img = await U.loadImage(file);
    return { width: img.naturalWidth, height: img.naturalHeight, img: img };
  }

  /* --- Add Music ------------------------------------------------------------ */
  register({
    id: 'add-music-to-video', name: 'Add Music to Video',
    description: 'Put a soundtrack under a video, replacing or mixing with its own sound.',
    keywords: ['music', 'soundtrack', 'background music', 'add audio', 'song', 'mix audio'],
    render: function (root) {
      var mode, vol;
      twoFileTool(root, {
        working: 'Adding the music',
        slots: [
          { title: '1. Your video', accept: 'video/*', hint: 'MP4, MOV, MKV, WebM…' },
          { title: '2. The music', accept: 'audio/*,video/*', hint: 'MP3, WAV, M4A…' }
        ],
        status: function (ctx) {
          var s = [];
          if (ctx.st.ai) s.push('Video ' + fmtSecs(ctx.st.ai.duration) + ' · ' + (ctx.st.ai.hasAudio ? 'has its own sound' : 'no sound of its own'));
          if (ctx.st.bi) s.push('Music ' + fmtSecs(ctx.st.bi.duration) + (ctx.st.ai && ctx.st.bi.duration < ctx.st.ai.duration ? ' · it loops to fill the video' : ctx.st.ai ? ' · it is cut to the video\'s length and fades out' : ''));
          return s.join(' · ');
        },
        action: 'Add the music',
        options: function (ctx) {
          var nodes = [];
          mode = null;
          if (ctx.st.ai.hasAudio) {
            mode = choice('What about the original sound?', [
              { value: 'replace', label: 'Replace it', desc: 'Only the music is heard.' },
              { value: 'both', label: 'Keep both', desc: 'The music plays under the video\'s own sound, so voices stay clear.' }
            ], 'replace');
            nodes.push(mode);
          }
          vol = choice('Music volume', ['25', '50', '75', '100'].map(function (v) { return { value: v, label: v + '%', desc: 'How loud the music plays.' }; }), '50');
          nodes.push(vol);
          return nodes;
        },
        run: async function (ctx) {
          var vi = ctx.st.ai, D = vi.duration, c = copyContainer(ctx.st.a), v = +vol.value / 100;
          var fade = Math.min(2, D / 4);
          var music = '[1:a]aresample=48000,aformat=channel_layouts=stereo,volume=' + v + ',atrim=0:' + D.toFixed(3) + ',afade=t=out:st=' + Math.max(0, D - fade).toFixed(3) + ':d=' + fade.toFixed(3);
          var fc = mode && mode.value === 'both'
            ? music + '[m];[0:a]aresample=48000,aformat=channel_layouts=stereo[o];[o][m]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]'
            : music + '[a]';
          var out = await ffRun({ inputs: [ctx.st.a, ctx.st.b], duration: D, onProgress: ctx.progress,
            args: function (p, d) {
              return ['-i', p[0], '-stream_loop', '-1', '-i', p[1], '-filter_complex', fc, '-map', '0:v:0', '-map', '[a]', '-c:v', 'copy']
                .concat(audioFor(c), ['-t', D.toFixed(3)], c === 'mp4' || c === 'mov' ? MP4_TAIL : [], [d + '/out.' + c]);
            }, outputs: ['out.' + c] });
          return outCard(ctx, out[0], baseName(ctx.st.a.name) + '-with-music.' + c, fmtTime(D));
        }
      });
    }
  });

  /* --- Cut Audio ------------------------------------------------------------ */
  register({
    id: 'cut-audio', category: 'audio', name: 'Cut Audio',
    description: 'Trim an audio file to the part between two times.',
    keywords: ['cut', 'trim', 'audio cutter', 'mp3 cutter', 'ringtone', 'clip audio'],
    render: function (root) {
      var start, end, ctl, info2, durRef = 0;
      /* An empty End means "to the end of the file". */
      function endVal() { var v = end.querySelector('input').value.trim(); return v ? parseTime(v) : durRef; }
      fileTool(root, {
        accept: 'audio/*,video/*', hint: 'MP3, WAV, M4A, OGG, FLAC — or a video', action: 'Cut Audio', working: 'Cutting', needAudio: true,
        options: function (ctx) {
          var dur = durRef = ctx.st.info.duration;
          start = U.input({ label: 'Start', value: '0:00', placeholder: '0:00' });
          end = U.input({ label: 'End', value: '', placeholder: fmtTime(dur, dur < 60 && dur % 1 > 0.05) + ' (the end)' });
          info2 = desc('');
          var player = mediaPreview(ctx.st.file, ctx.st.file.name);
          if (player && player.tagName === 'VIDEO') player.className = 'gv-preview';
          function upd() {
            var a = parseTime(start.querySelector('input').value), b = endVal();
            if (isNaN(a) || isNaN(b)) info2.textContent = 'Use minutes:seconds, like 1:30, or plain seconds.';
            else if (b <= a) info2.textContent = 'The end has to be after the start.';
            else info2.textContent = 'Keeps ' + fmtSecs(Math.min(b, dur) - a) + ' of ' + fmtTime(dur) + '. Use minutes:seconds, like 1:30, or plain seconds.';
            ctx.refresh();
          }
          [start, end].forEach(function (f) { f.querySelector('input').addEventListener('input', upd); });
          upd();
          ctl = audioOutputControls('mp3');
          var setA = U.button('Start = playhead', function () { start.querySelector('input').value = fmtTime(player.currentTime, true); upd(); }, 'ghost');
          var setB = U.button('End = playhead', function () { end.querySelector('input').value = fmtTime(player.currentTime, true); upd(); }, 'ghost');
          return [player, U.row(start, end), U.btnrow(setA, setB), info2].concat(ctl.nodes);
        },
        ready: function () {
          if (!start) return false;
          var a = parseTime(start.querySelector('input').value), b = endVal();
          return !isNaN(a) && !isNaN(b) && b > a;
        },
        run: async function (ctx) {
          var dur = ctx.st.info.duration;
          var a = parseTime(start.querySelector('input').value), b = Math.min(endVal(), dur || Infinity);
          if (a >= b) throw new Error('The start is at or after the end of the audio (' + fmtTime(dur) + ').');
          var f = ctl.fmt.value;
          var out = await ffRun({ inputs: [ctx.st.file], duration: b - a, onProgress: ctx.progress,
            args: function (p, d) { return ['-ss', String(a), '-i', p[0], '-t', String(b - a), '-vn', '-map', '0:a:0'].concat(ctl.enc(), [d + '/out.' + f]); },
            outputs: ['out.' + f] });
          return outCard(ctx, out[0], baseName(ctx.st.file.name) + '-cut.' + f, fmtTime(a) + '–' + fmtTime(b) + ' (' + fmtSecs(b - a) + ')');
        }
      });
    }
  });

  /* --- Merge Audio ---------------------------------------------------------- */
  register({
    id: 'merge-audio', category: 'audio', name: 'Merge Audio',
    description: 'Join several audio files into one track, in the order you choose.',
    keywords: ['merge', 'join', 'combine', 'concatenate', 'audio joiner', 'mp3 joiner'],
    render: function (root) {
      var ctl;
      listTool(root, {
        accept: 'audio/*,video/*', drop: 'Drop audio files here, or click to choose several', addMore: 'Add more files',
        hint: 'Different formats, sample rates and mono or stereo are all fine. Nothing is uploaded.',
        meta: function (it) { return fmtSecs(it.info.duration || 0) + ' · ' + size(it.file.size); },
        summary: function (items) {
          var t = items.reduce(function (a, it) { return a + ((it.info && it.info.duration) || 0); }, 0);
          return items.length + ' file' + (items.length === 1 ? '' : 's') + ', about ' + Math.round(t) + 's total' + (items.length < 2 ? ' · add at least one more' : '');
        },
        action: function (items) { return 'Join ' + items.length + ' file' + (items.length === 1 ? '' : 's'); },
        ready: function (items) { return items.length >= 2 && items.every(function (it) { return it.info && it.info.hasAudio; }); },
        options: function () { ctl = audioOutputControls('mp3'); return ctl.nodes; },
        working: 'Joining',
        run: async function (items, progress) {
          var total = items.reduce(function (a, it) { return a + (it.info.duration || 0); }, 0);
          var fc = items.map(function (it, i) { return '[' + i + ':a:0]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[a' + i + ']'; });
          fc.push(items.map(function (it, i) { return '[a' + i + ']'; }).join('') + 'concat=n=' + items.length + ':v=0:a=1[a]');
          var f = ctl.fmt.value;
          var out = await ffRun({ inputs: items.map(function (it) { return it.file; }), duration: total, onProgress: progress,
            args: function (p, d) {
              var a = [];
              p.forEach(function (x) { a.push('-i', x); });
              return a.concat(['-filter_complex', fc.join(';'), '-map', '[a]'], ctl.enc(), [d + '/out.' + f]);
            }, outputs: ['out.' + f] });
          return resultCard(toBlob(out[0].data, 'x.' + f), 'merged.' + f, fmtTime(total));
        }
      });
    }
  });

  /* --- Volume booster ------------------------------------------------------- */
  register({
    id: 'volume-booster', category: 'audio', name: 'Volume Booster & Normaliser',
    description: 'Make a quiet recording louder, or normalise it to a standard loudness.',
    keywords: ['volume', 'louder', 'boost', 'normalize', 'loudness', 'lufs', 'gain', 'amplify'],
    render: function (root) {
      var mode, target, gain, ctl, targetWrap, gainWrap;
      var TARGETS = {
        broadcast: { lufs: -23, desc: 'EBU R128, quiet and even (-23 LUFS)' },
        podcast: { lufs: -16, desc: 'Spotify, Apple Podcasts (-16 LUFS)' },
        streaming: { lufs: -14, desc: 'YouTube, Spotify music, TikTok (-14 LUFS)' }
      };
      fileTool(root, {
        accept: 'audio/*,video/*', hint: 'MP3, WAV, M4A, OGG, FLAC — or a video', working: 'Processing', needAudio: true,
        action: function () { return mode && mode.value === 'gain' ? 'Boost by ' + gain.value + 'x' : 'Level the audio'; },
        options: function (ctx) {
          mode = choice('How should it be louder?', [
            { value: 'level', label: 'Level it to a standard', desc: 'Measures the whole file and brings it to the loudness platforms expect, so quiet and loud parts even out.' },
            { value: 'gain', label: 'Just turn it up', desc: 'Multiplies the volume. A limiter catches the peaks so a big boost does not distort.' }
          ], 'level', function (v) { targetWrap.style.display = v === 'level' ? '' : 'none'; gainWrap.style.display = v === 'gain' ? '' : 'none'; ctx.refresh(); });
          target = choice('Target', [
            { value: 'broadcast', label: 'Broadcast', desc: TARGETS.broadcast.desc },
            { value: 'podcast', label: 'Podcast', desc: TARGETS.podcast.desc },
            { value: 'streaming', label: 'Streaming', desc: TARGETS.streaming.desc }
          ], 'podcast');
          gain = choice('How much louder', ['1.5', '2', '3', '5'].map(function (v) { return { value: v, label: v + 'x' }; }), '2', function () { ctx.refresh(); });
          targetWrap = el('div', null, target); gainWrap = el('div', null, gain); gainWrap.style.display = 'none';
          ctl = audioOutputControls('mp3');
          return [mode, targetWrap, gainWrap].concat(ctl.nodes);
        },
        run: async function (ctx) {
          var info = ctx.st.info, f = ctl.fmt.value, af, extra = '';
          if (mode.value === 'level') {
            var I = TARGETS[target.value].lufs;
            ctx.prog.set('Measuring the loudness…', 0);
            var m = await ffRun({ inputs: [ctx.st.file], duration: info.duration, onProgress: function (x) { ctx.prog.set('Measuring the loudness… ' + Math.round(x * 100) + '%', x * 0.4); },
              args: function (p) { return ['-i', p[0], '-vn', '-af', 'loudnorm=I=' + I + ':TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-']; },
              outputs: [], keepLogs: true });
            var js = m.logs.join('\n'), jm = /\{[\s\S]*?"input_i"[\s\S]*?\}/.exec(js), meas = null;
            try { meas = jm ? JSON.parse(jm[0]) : null; } catch (e) { meas = null; }
            if (meas && isFinite(+meas.input_i)) {
              af = 'loudnorm=I=' + I + ':TP=-1.5:LRA=11:measured_I=' + meas.input_i + ':measured_TP=' + meas.input_tp + ':measured_LRA=' + meas.input_lra +
                ':measured_thresh=' + meas.input_thresh + ':offset=' + meas.target_offset + ':linear=true';
              extra = (+meas.input_i).toFixed(1) + ' LUFS → ' + I + ' LUFS';
            } else af = 'loudnorm=I=' + I + ':TP=-1.5:LRA=11';
            af += ',aresample=' + (info.sampleRate || 44100) + ',aformat=channel_layouts=' + (info.channels === 1 ? 'mono' : 'stereo');
          } else {
            af = 'volume=' + gain.value + ',alimiter=limit=0.95:level=disabled';
            extra = gain.value + 'x louder';
          }
          var out = await ffRun({ inputs: [ctx.st.file], duration: info.duration,
            onProgress: function (x) { ctx.prog.set('Processing… ' + Math.round(x * 100) + '%', mode.value === 'level' ? 0.4 + x * 0.6 : x); },
            args: function (p, d) { return ['-i', p[0], '-vn', '-map', '0:a:0', '-af', af].concat(ctl.enc(), [d + '/out.' + f]); },
            outputs: ['out.' + f] });
          return outCard(ctx, out[0], baseName(ctx.st.file.name) + '-louder.' + f, extra);
        }
      });
    }
  });

  /* --- Remove silence ------------------------------------------------------- */
  register({
    id: 'remove-silence', category: 'audio', name: 'Remove Silence from Audio',
    description: 'Shorten the long pauses in a recording automatically.',
    keywords: ['silence', 'remove pauses', 'dead air', 'podcast', 'trim silence', 'tighten'],
    render: function (root) {
      var thr, pause, ctl;
      var TH = { gentle: -50, normal: -40, aggressive: -30 };
      fileTool(root, {
        accept: 'audio/*,video/*', hint: 'MP3, WAV, M4A, OGG, FLAC, or a video', action: 'Remove the silence', working: 'Removing silence', needAudio: true,
        options: function () {
          thr = choice('What counts as silence', [
            { value: 'gentle', label: 'Gentle', desc: 'Only near-total silence. Start with Normal, use Aggressive only if a hum or hiss is being kept.' },
            { value: 'normal', label: 'Normal', desc: 'A quiet room. Start with Normal, use Aggressive only if a hum or hiss is being kept.' },
            { value: 'aggressive', label: 'Aggressive', desc: 'Also cuts low background noise. Start with Normal, use Aggressive only if a hum or hiss is being kept.' }
          ], 'normal');
          pause = choice('Shorten every pause to', ['0.25', '0.5', '1'].map(function (v) {
            return { value: v, label: v + 's', desc: 'Pauses longer than this are cut down to it, so speech still breathes instead of running together.' };
          }), '0.5');
          ctl = audioOutputControls('mp3');
          return [thr, pause].concat(ctl.nodes);
        },
        run: async function (ctx) {
          var info = ctx.st.info, f = ctl.fmt.value, t = TH[thr.value], keep = +pause.value;
          var af = 'silenceremove=start_periods=1:start_duration=0:start_threshold=' + t + 'dB:start_silence=' + keep +
            ':stop_periods=-1:stop_duration=' + keep + ':stop_threshold=' + t + 'dB:stop_silence=' + keep + ':detection=rms:window=0.03';
          var out = await ffRun({ inputs: [ctx.st.file], duration: info.duration, onProgress: ctx.progress,
            args: function (p, d) { return ['-i', p[0], '-vn', '-map', '0:a:0', '-af', af].concat(ctl.enc(), [d + '/out.' + f]); },
            outputs: ['out.' + f] });
          var name = baseName(ctx.st.file.name) + '-no-silence.' + f;
          var blob = toBlob(out[0].data, name);
          var after = NaN;
          try { after = (await probe(new File([blob], name, { type: blob.type }))).duration; } catch (e) { /* keep NaN */ }
          var nodes = [];
          if (isFinite(after)) {
            nodes.push(U.stats([{ label: 'Before', value: fmtTime(info.duration, true) }, { label: 'After', value: fmtTime(after, true) },
              { label: 'Cut', value: fmtSecs(Math.max(0, info.duration - after)) }]));
            if (info.duration - after < 0.05) nodes.push(U.note('No pause long enough to cut was found. Try Aggressive, or a shorter pause length.'));
          }
          ctx.st.results = [{ name: name, blob: blob }];
          nodes.push(resultCard(blob, name));
          return nodes;
        }
      });
    }
  });

  /* --- Adjust Video --------------------------------------------------------- */
  register({
    id: 'adjust-video', name: 'Adjust Video',
    description: 'Change the brightness, contrast and saturation of a video, with presets.',
    keywords: ['brightness', 'contrast', 'saturation', 'color correction', 'grade', 'black and white', 'filter'],
    render: function (root) {
      var sliders = {}, msg, canvas, frame, ctxRef;
      var PRESETS = {
        'Brighten': { b: 0.15, c: 1.05, s: 1 },
        'Darken': { b: -0.15, c: 1.05, s: 1 },
        'Punchy': { b: 0.05, c: 1.3, s: 1.3 },
        'Muted': { b: 0, c: 0.9, s: 0.6 },
        'Black & white': { b: 0, c: 1.1, s: 0 }
      };
      function vals() { return { b: +sliders.b.input.value, c: +sliders.c.input.value, s: +sliders.s.input.value }; }
      function isNormal(v) { return Math.abs(v.b) < 1e-9 && Math.abs(v.c - 1) < 1e-9 && Math.abs(v.s - 1) < 1e-9; }
      function word(key, v) {
        if (key === 'b') return Math.abs(v) < 1e-9 ? 'normal' : (v > 0 ? '+' : '') + Math.round(v * 100) + '%';
        if (key === 's' && v < 1e-9) return 'black & white';
        return Math.abs(v - 1) < 1e-9 ? 'normal' : v.toFixed(2) + 'x';
      }
      function slider(key, title, min, max, step, def) {
        var lab = label(title + ' — normal');
        var input = el('input', { type: 'range', min: min, max: max, step: step, value: def });
        var w = el('div', { class: 'gv-range' }, lab, input);
        w.input = input;
        input.addEventListener('input', function () { upd(); });
        w.sync = function () { lab.textContent = title + ' — ' + word(key, +input.value); };
        return w;
      }
      function set(v) { sliders.b.input.value = v.b; sliders.c.input.value = v.c; sliders.s.input.value = v.s; upd(); }
      function upd() {
        ['b', 'c', 's'].forEach(function (k) { sliders[k].sync(); });
        var v = vals();
        msg.textContent = isNormal(v) ? 'Everything is at its normal setting, so the video would come back unchanged. Move a slider or pick a preset.' : '';
        msg.style.display = msg.textContent ? '' : 'none';
        draw();
        if (ctxRef) ctxRef.refresh();
      }
      function draw() {
        if (!canvas || !frame) return;
        var v = vals(), g = canvas.getContext('2d');
        g.filter = 'brightness(' + (1 + v.b) + ') contrast(' + v.c + ') saturate(' + v.s + ')';
        g.drawImage(frame, 0, 0, canvas.width, canvas.height);
        g.filter = 'none';
      }
      fileTool(root, {
        accept: 'video/*', action: 'Apply the changes', working: 'Applying', needVideo: true,
        ready: function () { return sliders.b && !isNormal(vals()); },
        options: function (ctx) {
          ctxRef = ctx;
          sliders.b = slider('b', 'Brightness', -1, 1, 0.05, 0);
          sliders.c = slider('c', 'Contrast', 0, 3, 0.05, 1);
          sliders.s = slider('s', 'Saturation', 0, 3, 0.05, 1);
          msg = desc('');
          canvas = el('canvas', { class: 'gv-preview', width: 480, height: 270 });
          canvas.style.display = 'none';
          var presets = el('div', { class: 'chips' }, Object.keys(PRESETS).map(function (k) {
            return el('button', { class: 'chip', type: 'button', text: k, onclick: function () { set(PRESETS[k]); } });
          }).concat([el('button', { class: 'chip', type: 'button', text: 'Reset', onclick: function () { set({ b: 0, c: 1, s: 1 }); } })]));
          grabFrame(ctx.st.file, ctx.st.info).then(function (img) {
            if (!img) return;
            frame = img; canvas.width = img.width; canvas.height = img.height; canvas.style.display = ''; draw();
          });
          setTimeout(upd);
          return [canvas, el('div', null, label('Start from a preset'), presets), sliders.b, sliders.c, sliders.s, msg];
        },
        run: async function (ctx) {
          var v = vals();
          var out = await ffRun({ inputs: [ctx.st.file], duration: ctx.st.info.duration, onProgress: ctx.progress,
            args: function (p, d) {
              return ['-i', p[0], '-map', '0:v:0', '-map', '0:a:0?', '-vf', 'eq=brightness=' + v.b + ':contrast=' + v.c + ':saturation=' + v.s + ',scale=trunc(iw/2)*2:trunc(ih/2)*2',
                '-c:a', 'copy'].concat(vEnc(20), MP4_TAIL, [d + '/out.mp4']);
            }, outputs: ['out.mp4'] }).catch(function () {
              /* The original audio codec may not fit in MP4: re-encode it. */
              return ffRun({ inputs: [ctx.st.file], duration: ctx.st.info.duration, onProgress: ctx.progress,
                args: function (p, d) {
                  return ['-i', p[0], '-map', '0:v:0', '-map', '0:a:0?', '-vf', 'eq=brightness=' + v.b + ':contrast=' + v.c + ':saturation=' + v.s + ',scale=trunc(iw/2)*2:trunc(ih/2)*2']
                    .concat(vEnc(20), AAC, MP4_TAIL, [d + '/out.mp4']);
                }, outputs: ['out.mp4'] });
            });
          return outCard(ctx, out[0], baseName(ctx.st.file.name) + '-adjusted.mp4');
        },
        onReset: function () { frame = null; }
      });
    }
  });

  /* --- Slideshow ------------------------------------------------------------ */
  var SIZES_169 = { '1080': [1920, 1080], '720': [1280, 720], '480': [854, 480] };
  register({
    id: 'slideshow-maker', name: 'Slideshow Maker',
    description: 'Turn a set of photos into an MP4 slideshow, with optional background music.',
    keywords: ['slideshow', 'photos to video', 'images to video', 'montage', 'photo video', 'music'],
    render: function (root) {
      var secs, res, music = null, musicInfo = null, musicZone, sizeNote;
      var ctl = listTool(root, {
        accept: 'image/*', drop: 'Drop photos here, or click to choose several', addMore: 'Add more photos', arrows: true,
        hint: 'Any size or shape. Nothing is uploaded.',
        probe: async function (file) {
          var img = await U.loadImage(file);
          return { width: img.naturalWidth, height: img.naturalHeight, img: img };
        },
        meta: function (it) { return it.info.width + '×' + it.info.height + ' · ' + size(it.file.size); },
        summary: function (items) {
          return items.length + ' photo' + (items.length === 1 ? '' : 's') + ' · ' + (items.length * (secs ? +secs.value : 3)) + 's video';
        },
        action: function () { return 'Make the slideshow'; },
        ready: function (items) { return items.length >= 1 && items.every(function (it) { return it.info; }); },
        options: function (ctx) {
          secs = choice('Seconds per photo', ['1', '2', '3', '5'].map(function (v) { return { value: v, label: v + 's' }; }), '3', function () { ctx.redraw(); });
          sizeNote = desc('');
          res = choice('Video size', [{ value: '1080', label: '1080p' }, { value: '720', label: '720p' }, { value: '480', label: '480p' }], '720', updSize);
          musicZone = U.dropzone({ accept: 'audio/*', label: 'Background music (optional)', hint: 'MP3, WAV, M4A… it loops to fit the slideshow', onFiles: async function (f) {
            music = f[0];
            musicZone.querySelector('strong').textContent = music.name + ' (' + size(music.size) + ')';
            try { musicInfo = await probe(music); musicZone.querySelector('span').textContent = fmtSecs(musicInfo.duration) + ' · it loops to fit the slideshow'; }
            catch (e) { musicZone.querySelector('span').textContent = e.message; music = null; }
          } });
          var clearMusic = U.button('No music', function () {
            music = musicInfo = null;
            musicZone.querySelector('strong').textContent = 'Background music (optional)';
            musicZone.querySelector('span').textContent = 'MP3, WAV, M4A… it loops to fit the slideshow';
          }, 'ghost');
          updSize();
          return [secs, el('div', null, res, sizeNote), el('div', null, musicZone, U.btnrow(clearMusic))];
        },
        working: 'Making the slideshow',
        run: async function (items, progress) {
          var wh = SIZES_169[res.value], W = wh[0], H = wh[1], S = +secs.value;
          var files = [];
          for (var i = 0; i < items.length; i++) {
            var c = document.createElement('canvas'); c.width = W; c.height = H;
            var g = c.getContext('2d'), img = items[i].info.img;
            g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
            var sc = Math.min(W / img.naturalWidth, H / img.naturalHeight);
            var dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
            g.imageSmoothingQuality = 'high';
            g.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
            var blob = await new Promise(function (r) { c.toBlob(r, 'image/jpeg', 0.92); });
            files.push({ name: 'img' + String(i + 1).padStart(3, '0') + '.jpg', data: new Uint8Array(await blob.arrayBuffer()) });
          }
          var total = S * items.length;
          var inputs = music ? [music] : [];
          var out = await ffRun({ inputs: inputs, files: files, duration: total, onProgress: progress,
            args: function (p, d) {
              var a = ['-framerate', '1/' + S, '-i', d + '/img%03d.jpg'];
              if (music) a.push('-stream_loop', '-1', '-i', p[0]);
              a.push('-vf', 'fps=30,format=yuv420p', '-map', '0:v');
              if (music) a.push('-map', '1:a:0', '-af', 'afade=t=out:st=' + Math.max(0, total - 2) + ':d=' + Math.min(2, total), '-c:a', 'aac', '-b:a', '160k');
              return a.concat(['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-tune', 'stillimage', '-t', String(total)], MP4_TAIL, [d + '/out.mp4']);
            }, outputs: ['out.mp4'] });
          return resultCard(toBlob(out[0].data, 'x.mp4'), 'slideshow.mp4', W + '×' + H + ' · ' + fmtTime(total) + (music ? ' · with music' : ''));
        }
      });
      function updSize() {
        var wh = SIZES_169[res.value];
        sizeNote.textContent = wh[0] + '×' + wh[1] + '. Photos are fitted inside the frame with black bars where the shape differs, never stretched.';
      }
    }
  });

  /* --- Reframe (vertical / square without cropping) ------------------------ */
  var REFRAME = {
    '9:16': { desc: 'Reels, TikTok, Shorts', 1080: [1080, 1920], 720: [720, 1280] },
    '1:1': { desc: 'Instagram feed', 1080: [1080, 1080], 720: [720, 720] },
    '4:5': { desc: 'Instagram portrait', 1080: [1080, 1350], 720: [720, 900] },
    '16:9': { desc: 'YouTube, widescreen', 1080: [1920, 1080], 720: [1280, 720] }
  };
  register({
    id: 'reframe-video', name: 'Reframe Video for Reels & Shorts',
    description: 'Fit any video into a vertical, square or widescreen frame without cropping it.',
    keywords: ['reels', 'tiktok', 'shorts', 'vertical video', '9:16', 'square', 'blur background', 'reframe'],
    render: function (root) {
      var shape, fill, q;
      fileTool(root, {
        accept: 'video/*', working: 'Reframing', needVideo: true,
        action: function () { return 'Make it ' + (shape ? shape.value : '9:16'); },
        options: function (ctx) {
          shape = choice('Shape', Object.keys(REFRAME).map(function (k) { return { value: k, label: k, desc: REFRAME[k].desc }; }), '9:16', function () { ctx.refresh(); });
          fill = choice('What fills the space', [
            { value: 'blur', label: 'Blurred video', desc: 'A blurred, zoomed copy of your own video fills the top and bottom, so nothing looks empty.' },
            { value: 'black', label: 'Black bars', desc: 'Plain bars above and below.' },
            { value: 'white', label: 'White bars', desc: 'Plain bars above and below.' }
          ], 'blur');
          q = choice('Quality', [{ value: '1080', label: '1080p' }, { value: '720', label: '720p' }], '1080', upd);
          var line = el('div', { class: 'gv-fileinfo' });
          function upd() {
            var wh = REFRAME[shape.value][q.value];
            line.textContent = 'Original ' + ctx.st.info.width + '×' + ctx.st.info.height + ' → New ' + wh[0] + '×' + wh[1];
          }
          shape.chips.addEventListener('click', function () { setTimeout(upd); });
          upd();
          return [line, shape, fill, q];
        },
        run: async function (ctx) {
          var wh = REFRAME[shape.value][q.value], W = wh[0], H = wh[1];
          var fc = fill.value === 'blur'
            ? '[0:v]split[a][b];[a]scale=' + W + ':' + H + ':force_original_aspect_ratio=increase,crop=' + W + ':' + H + ',boxblur=luma_radius=min(h\\,w)/20:luma_power=2[bg];[b]scale=' + W + ':' + H + ':force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1,format=yuv420p[v]'
            : '[0:v]scale=' + W + ':' + H + ':force_original_aspect_ratio=decrease,pad=' + W + ':' + H + ':(ow-iw)/2:(oh-ih)/2:' + (fill.value === 'white' ? 'white' : 'black') + ',setsar=1,format=yuv420p[v]';
          var out = await ffRun({ inputs: [ctx.st.file], duration: ctx.st.info.duration, onProgress: ctx.progress,
            args: function (p, d) { return ['-i', p[0], '-filter_complex', fc, '-map', '[v]', '-map', '0:a:0?'].concat(vEnc(21), AAC, MP4_TAIL, [d + '/out.mp4']); },
            outputs: ['out.mp4'] });
          return outCard(ctx, out[0], baseName(ctx.st.file.name) + '-' + shape.value.replace(':', 'x') + '.mp4', W + '×' + H);
        }
      });
    }
  });

  /* --- Extract frames ------------------------------------------------------- */
  register({
    id: 'extract-frames', name: 'Extract Frames from Video',
    description: 'Save still images from a video at a regular interval, as JPG or PNG.',
    keywords: ['frames', 'stills', 'screenshots', 'thumbnails', 'video to jpg', 'video to png', 'snapshot'],
    render: function (root) {
      var every, fmt, countNote;
      function count(dur) { return Math.max(1, Math.ceil(dur / +every.value - 1e-6)); }
      fileTool(root, {
        accept: 'video/*', drop: 'Drop a video here, or click to choose one', working: 'Extracting frames', needVideo: true,
        action: function () { return 'Extract ' + (every ? count(ctxDur()) : '') + ' stills'; },
        options: function (ctx) {
          countNote = desc('');
          every = choice('Take a frame every', ['0.5', '1', '2', '5', '10'].map(function (v) { return { value: v, label: v + 's' }; }), '1', function () { upd(); ctx.refresh(); });
          fmt = choice('Image format', [
            { value: 'jpg', label: 'JPG', desc: 'JPG is much smaller. PNG is lossless, which matters if you are going to edit the stills.' },
            { value: 'png', label: 'PNG', desc: 'JPG is much smaller. PNG is lossless, which matters if you are going to edit the stills.' }
          ], 'jpg');
          function upd() {
            var n = count(ctx.st.info.duration);
            countNote.textContent = ctx.st.info.duration.toFixed(1) + 's of video · ' + n + ' still' + (n === 1 ? '' : 's') + (n > 300 ? ' — that is a lot; the zip may be large' : '');
          }
          upd();
          ctxDur = function () { return ctx.st.info.duration; };
          return [every, countNote, fmt];
        },
        run: async function (ctx) {
          var iv = +every.value, f = fmt.value, n = count(ctx.st.info.duration), base = baseName(ctx.st.file.name);
          var out = await ffRun({ inputs: [ctx.st.file], duration: ctx.st.info.duration, onProgress: ctx.progress,
            args: function (p, d) {
              return ['-i', p[0], '-map', '0:v:0', '-vf', "select='isnan(prev_selected_t)+gte(t-prev_selected_t\\," + (iv - 0.001) + ")'", '-fps_mode', 'vfr', '-frames:v', String(n)]
                .concat([d + '/f%04d.png']);
            },
            outputs: function (names) { return names.filter(function (x) { return /^f\d{4}\./.test(x); }).sort(); } });
          /* ffmpeg.wasm's MJPEG encoder is unreliable, so frames come out as
             PNG and JPGs are made by the browser at high quality. */
          var files = [];
          for (var i = 0; i < out.length; i++) {
            var blob = toBlob(out[i].data, 'x.png');
            if (f === 'jpg') {
              var bmp = await createImageBitmap(blob);
              var c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
              c.getContext('2d').drawImage(bmp, 0, 0);
              blob = await new Promise(function (r) { c.toBlob(r, 'image/jpeg', 0.92); });
            }
            files.push({ name: base + '-' + fmtTime(i * iv, iv < 1).replace(/:/g, '-').replace('.', '_') + '.' + f, blob: blob, t: i * iv });
          }
          ctx.st.results = files;
          var grid = el('div', { class: 'gv-frames' }, files.map(function (x) {
            var fig = el('figure', { class: 'gv-out', dataset: { name: x.name } }, el('img', { src: URL.createObjectURL(x.blob), alt: 'Frame at ' + fmtTime(x.t, true), loading: 'lazy' }),
              el('figcaption', null, el('span', { text: fmtTime(x.t, iv < 1) }), U.button('Save', function () { U.saveBlob(x.name, x.blob); }, 'ghost')));
            fig.blob = x.blob;
            return fig;
          }));
          return [el('div', { class: 'note ok', text: '✓ ' + files.length + ' stills ready' }),
            U.btnrow(U.button('Download all as a zip', function () { zipAndSave(base + '-frames.zip', files); })), grid];
        }
      });
      var ctxDur = function () { return 0; };
    }
  });

  /* --- Watermark ------------------------------------------------------------ */
  register({
    id: 'add-watermark', name: 'Watermark Video',
    description: 'Put your logo on a video in the corner, size and opacity you choose.',
    keywords: ['watermark', 'logo', 'overlay', 'brand', 'video watermark', 'png overlay'],
    render: function (root) {
      var pos, sz, op, canvas, frame, ctxRef;
      var POS = { tl: 'Top left', tr: 'Top right', bl: 'Bottom left', br: 'Bottom right', c: 'Center' };
      function place(W, H, lw, lh, p) {
        var m = Math.round(W * 0.03);
        return { x: p === 'c' ? (W - lw) / 2 : p[1] === 'l' ? m : W - lw - m, y: p === 'c' ? (H - lh) / 2 : p[0] === 't' ? m : H - lh - m };
      }
      function draw() {
        if (!canvas || !ctxRef || !ctxRef.st.ai || !ctxRef.st.bi) return;
        var vi = ctxRef.st.ai, li = ctxRef.st.bi, s = Math.min(1, 480 / vi.width);
        canvas.width = Math.round(vi.width * s); canvas.height = Math.round(vi.height * s);
        var g = canvas.getContext('2d');
        if (frame) g.drawImage(frame, 0, 0, canvas.width, canvas.height); else { g.fillStyle = '#444'; g.fillRect(0, 0, canvas.width, canvas.height); }
        var lw = vi.width * +sz.value / 100, lh = lw * li.height / li.width, pl = place(vi.width, vi.height, lw, lh, pos.value);
        g.globalAlpha = +op.value / 100;
        g.drawImage(li.img, pl.x * s, pl.y * s, lw * s, lh * s);
        g.globalAlpha = 1;
      }
      twoFileTool(root, {
        working: 'Adding the watermark', action: 'Add the watermark',
        slots: [
          { title: '1. Your video', accept: 'video/*', hint: 'MP4, MOV, MKV, WebM' },
          { title: '2. Your logo', accept: 'image/*', hint: 'PNG with a transparent background works best', probe: probeImage }
        ],
        options: function (ctx) {
          ctxRef = ctx;
          canvas = el('canvas', { class: 'gv-preview' });
          pos = choice('Position', Object.keys(POS).map(function (k) { return { value: k, label: POS[k] }; }), 'br', draw);
          sz = choice('Size', ['10', '15', '20', '30'].map(function (v) { return { value: v, label: v + '%', desc: 'Share of the video\'s width. The logo keeps its own shape.' }; }), '15', draw);
          op = choice('Opacity', ['30', '50', '70', '100'].map(function (v) { return { value: v, label: v + '%' }; }), '70', draw);
          frame = null;
          grabFrame(ctx.st.a, ctx.st.ai).then(function (img) { frame = img; draw(); });
          setTimeout(draw);
          return [canvas, pos, sz, op];
        },
        run: async function (ctx) {
          var vi = ctx.st.ai, li = ctx.st.bi;
          var lw = Math.max(2, Math.round(vi.width * +sz.value / 100 / 2) * 2), lh = Math.max(2, Math.round(lw * li.height / li.width / 2) * 2);
          var pl = place(vi.width, vi.height, lw, lh, pos.value);
          var fc = '[1:v]scale=' + lw + ':' + lh + ',format=rgba,colorchannelmixer=aa=' + (+op.value / 100) + '[l];[0:v][l]overlay=' + Math.round(pl.x) + ':' + Math.round(pl.y) + ':format=auto,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p[v]';
          var out = await ffRun({ inputs: [ctx.st.a, ctx.st.b], duration: vi.duration, onProgress: ctx.progress,
            args: function (p, d) { return ['-i', p[0], '-i', p[1], '-filter_complex', fc, '-map', '[v]', '-map', '0:a:0?'].concat(vEnc(20), AAC, MP4_TAIL, [d + '/out.mp4']); },
            outputs: ['out.mp4'] });
          return resultCard(toBlob(out[0].data, 'x.mp4'), baseName(ctx.st.a.name) + '-watermarked.mp4', vi.width + '×' + vi.height);
        }
      });
    }
  });

  /* --- Boomerang ------------------------------------------------------------ */
  register({
    id: 'boomerang-video', name: 'Boomerang Video Maker',
    description: 'Make a clip play forwards then backwards, repeated.',
    keywords: ['boomerang', 'forward backward', 'ping pong', 'loop', 'instagram boomerang'],
    render: function (root) {
      var times, sound;
      fileTool(root, {
        accept: 'video/*', hint: 'A short clip works best. Nothing is uploaded.', action: 'Make the boomerang', working: 'Making the boomerang', needVideo: true,
        options: function (ctx) {
          var len = el('div', { class: 'gv-fileinfo' });
          function upd() { len.textContent = 'Clip ' + ctx.st.info.duration.toFixed(1) + 's → Boomerang ' + (ctx.st.info.duration * 2 * +times.value).toFixed(1) + 's'; }
          times = choice('How many times back and forth', ['1', '2', '3'].map(function (v) { return { value: v, label: v + '×' }; }), '2', upd);
          sound = U.checkbox('Keep the sound (it plays backwards too)', { checked: true });
          upd();
          var nodes = [len, times];
          if (ctx.st.info.hasAudio) nodes.push(sound); else sound.input.checked = false;
          if (ctx.st.info.duration > 15) nodes.push(U.note('Boomerangs hold every frame in memory. Trim long clips to a few seconds first.'));
          return nodes;
        },
        run: async function (ctx) {
          var n = +times.value, info = ctx.st.info, withA = sound.input.checked && info.hasAudio, k = n * 2;
          var fc = '[0:v]scale=trunc(iw/2)*2:trunc(ih/2)*2,setsar=1,split=' + k;
          for (var i = 0; i < k; i++) fc += '[v' + i + ']';
          fc += ';';
          var seq = '';
          for (var j = 0; j < k; j++) {
            if (j % 2) { fc += '[v' + j + ']reverse[r' + j + '];'; seq += '[r' + j + ']'; } else seq += '[v' + j + ']';
            if (withA) seq += j % 2 ? '[ar' + j + ']' : '[a' + j + ']';
          }
          if (withA) {
            fc += '[0:a:0]aresample=48000,asplit=' + k;
            for (var q = 0; q < k; q++) fc += '[a' + q + ']';
            fc += ';';
            for (var r = 1; r < k; r += 2) fc += '[a' + r + ']areverse[ar' + r + '];';
          }
          fc += seq + 'concat=n=' + k + ':v=1:a=' + (withA ? 1 : 0) + '[v]' + (withA ? '[a]' : '');
          var out = await ffRun({ inputs: [ctx.st.file], duration: info.duration * k, onProgress: ctx.progress,
            args: function (p, d) { return ['-i', p[0], '-filter_complex', fc, '-map', '[v]'].concat(withA ? ['-map', '[a]'] : ['-an'], vEnc(21), withA ? AAC : [], MP4_TAIL, [d + '/out.mp4']); },
            outputs: ['out.mp4'] });
          return outCard(ctx, out[0], baseName(ctx.st.file.name) + '-boomerang.mp4', fmtTime(info.duration * k));
        }
      });
    }
  });

  /* --- Green screen --------------------------------------------------------- */
  register({
    id: 'green-screen', name: 'Green Screen Background Remover',
    description: 'Key out a green or blue screen and put a colour or a picture behind you.',
    keywords: ['green screen', 'chroma key', 'blue screen', 'background', 'replace background', 'keying'],
    render: function (root) {
      var screen, strength, bgKind, colour, picture = null, pictureZone, bgBox, custom, ctxRef;
      var KEY = { green: '0x00B140', blue: '0x0047BB' };
      var STR = { light: [0.08, 0.04], normal: [0.13, 0.06], strong: [0.19, 0.08], strongest: [0.26, 0.1] };
      var COLOURS = { Black: '#000000', White: '#ffffff', Navy: '#1b2a4a', Purple: '#5b2a86' };
      fileTool(root, {
        accept: 'video/*', drop: 'Drop a video filmed on a green or blue screen', hint: 'Nothing is uploaded', action: 'Replace the background',
        working: 'Replacing the background', needVideo: true,
        ready: function () { return bgKind && (bgKind.value === 'colour' || picture); },
        options: function (ctx) {
          ctxRef = ctx;
          screen = choice('Screen colour', [{ value: 'green', label: 'Green screen' }, { value: 'blue', label: 'Blue screen' }], 'green');
          strength = choice('Removal strength', [
            { value: 'light', label: 'Light' }, { value: 'normal', label: 'Normal' }, { value: 'strong', label: 'Strong' }, { value: 'strongest', label: 'Strongest' }
          ], 'normal');
          strength.appendChild(desc('Start with Normal. Go stronger only if patches of screen are left, since too strong a setting starts removing clothes in similar colours.'));
          colour = choice('', Object.keys(COLOURS).map(function (k) { return { value: COLOURS[k], label: k }; }), '#000000', function () { custom.value = colour.value; });
          custom = el('input', { type: 'color', value: '#000000', title: 'Any colour', oninput: function () {
            Array.prototype.forEach.call(colour.chips.children, function (c) { c.classList.remove('on'); });
            colour.chips.value = custom.value;
          } });
          pictureZone = U.dropzone({ accept: 'image/*', label: 'Choose a background picture', hint: 'Choose a background picture. It is scaled to fill the frame.', onFiles: function (f) {
            picture = f[0];
            pictureZone.querySelector('strong').textContent = picture.name + ' (' + size(picture.size) + ')';
            ctx.refresh();
          } });
          bgBox = el('div');
          function showBg(v) { bgBox.replaceChildren(v === 'colour' ? el('div', { class: 'gv-swatches' }, colour, custom) : pictureZone); ctx.refresh(); }
          bgKind = choice('New background', [{ value: 'colour', label: 'A colour' }, { value: 'picture', label: 'A picture' }], 'colour', showBg);
          showBg('colour');
          return [screen, strength, bgKind, bgBox];
        },
        onReset: function () { picture = null; },
        run: async function (ctx) {
          var info = ctx.st.info, W = info.width - info.width % 2, H = info.height - info.height % 2, s = STR[strength.value];
          var key = '[0:v]scale=' + W + ':' + H + ',format=yuva420p,chromakey=' + KEY[screen.value] + ':' + s[0] + ':' + s[1] + ',despill=type=' + screen.value + ':mix=0.5:expand=0.1[fg];';
          var inputs = [ctx.st.file], fc;
          if (bgKind.value === 'picture') {
            inputs.push(picture);
            fc = key + '[1:v]scale=' + W + ':' + H + ':force_original_aspect_ratio=increase,crop=' + W + ':' + H + ',setsar=1,format=yuv420p[bg];[bg][fg]overlay=shortest=1:format=auto,format=yuv420p[v]';
          } else {
            var c = (colour.chips.value || '#000000').replace('#', '0x');
            fc = key + 'color=c=' + c + ':s=' + W + 'x' + H + ':r=' + (info.fps || 30) + '[bg];[bg][fg]overlay=shortest=1:format=auto,format=yuv420p[v]';
          }
          var out = await ffRun({ inputs: inputs, duration: info.duration, onProgress: ctx.progress,
            args: function (p, d) {
              var a = ['-i', p[0]];
              if (p[1]) a.push('-loop', '1', '-i', p[1]);
              return a.concat(['-filter_complex', fc, '-map', '[v]', '-map', '0:a:0?', '-t', String(info.duration)], vEnc(20), AAC, MP4_TAIL, [d + '/out.mp4']);
            }, outputs: ['out.mp4'] });
          return outCard(ctx, out[0], baseName(ctx.st.file.name) + '-new-background.mp4');
        }
      });
    }
  });

  /* --- Text to Speech ------------------------------------------------------- */
  register({
    id: 'text-to-speech', category: 'audio', name: 'Text to Speech',
    description: 'Read text aloud with the voices installed on your device.',
    keywords: ['tts', 'text to speech', 'read aloud', 'speak', 'voice', 'narrate', 'speech synthesis'],
    render: function (root) {
      root.classList.add('g-video');
      var synth = window.speechSynthesis;
      var text = U.textarea({ placeholder: 'Type or paste the text you want read aloud…', rows: 8 });
      var count = el('div', { class: 'gv-fileinfo', text: '0 characters' });
      var voiceSel = el('select');
      var voiceNote = U.note('Loading the voices installed on your device…');
      var langSel = el('select', { title: 'Filter voices by language' });
      var rate = el('input', { type: 'range', min: 0.5, max: 2, step: 0.1, value: 1 });
      var pitch = el('input', { type: 'range', min: 0, max: 2, step: 0.1, value: 1 });
      var rateLbl = label('Speed — 1.0x'), pitchLbl = label('Pitch — 1.0');
      var speak = U.button('Speak', doSpeak);
      var pause = U.button('Pause', doPause, 'ghost');
      var stop = U.button('Stop', function () { if (synth) synth.cancel(); state(); }, 'ghost');
      var progressLine = el('div', { class: 'gv-fileinfo' });
      var highlight = el('div', { class: 'out', style: { whiteSpace: 'pre-wrap', display: 'none' } });
      var voices = [];

      rate.addEventListener('input', function () { rateLbl.textContent = 'Speed — ' + (+rate.value).toFixed(1) + 'x'; });
      pitch.addEventListener('input', function () { pitchLbl.textContent = 'Pitch — ' + (+pitch.value).toFixed(1); });
      text.addEventListener('input', function () {
        var n = text.value.length, w = text.value.trim() ? text.value.trim().split(/\s+/).length : 0;
        count.textContent = n + ' character' + (n === 1 ? '' : 's') + (w ? ' · ' + w + ' word' + (w === 1 ? '' : 's') + ' · about ' + fmtTime(w / 150 * 60 / (+rate.value || 1)) + ' to read' : '');
        state();
      });
      text.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); doSpeak(); } });

      function loadVoices() {
        if (!synth) { voiceNote.textContent = 'This browser has no speech synthesis, so it cannot read text aloud.'; voiceNote.className = 'note err'; return; }
        voices = synth.getVoices().slice();
        if (!voices.length) return;
        var langs = {};
        voices.forEach(function (v) { langs[v.lang.split(/[-_]/)[0]] = true; });
        var curLang = langSel.value;
        langSel.replaceChildren(el('option', { value: '', text: 'All languages (' + voices.length + ' voices)' }));
        Object.keys(langs).sort().forEach(function (l) {
          var name = l;
          try { name = new Intl.DisplayNames([navigator.language || 'en'], { type: 'language' }).of(l) || l; } catch (e) { /* old browser */ }
          langSel.appendChild(el('option', { value: l, text: name }));
        });
        langSel.value = curLang || '';
        fillVoices();
        voiceNote.textContent = voices.length + ' voice' + (voices.length === 1 ? '' : 's') + ' found on this device.';
      }
      function fillVoices() {
        var cur = voiceSel.value, lang = langSel.value;
        voiceSel.replaceChildren();
        voices.filter(function (v) { return !lang || v.lang.split(/[-_]/)[0] === lang; }).forEach(function (v) {
          voiceSel.appendChild(el('option', { value: v.voiceURI, text: v.name, title: v.lang + (v.localService ? '' : ' · online voice') }));
        });
        if (cur && Array.prototype.some.call(voiceSel.options, function (o) { return o.value === cur; })) voiceSel.value = cur;
        else {
          var pref = voices.filter(function (v) { return v.default && (!lang || v.lang.indexOf(lang) === 0); })[0] ||
            voices.filter(function (v) { return (navigator.language || '').split('-')[0] === v.lang.split(/[-_]/)[0]; })[0];
          if (pref && (!lang || pref.lang.indexOf(lang) === 0)) voiceSel.value = pref.voiceURI;
        }
      }
      langSel.addEventListener('change', fillVoices);
      if (synth) {
        loadVoices();
        synth.addEventListener ? synth.addEventListener('voiceschanged', loadVoices) : (synth.onvoiceschanged = loadVoices);
        setTimeout(function () { if (!voices.length) { loadVoices(); if (!voices.length) voiceNote.textContent = 'No voices were reported by this browser yet. Speak will use the default voice.'; } }, 1500);
      } else loadVoices();

      function state() {
        var speaking = synth && (synth.speaking || synth.pending);
        speak.disabled = !text.value.trim() || !synth;
        pause.disabled = stop.disabled = !speaking;
        pause.textContent = synth && synth.paused ? 'Resume' : 'Pause';
        if (!speaking) { highlight.style.display = 'none'; progressLine.textContent = ''; }
      }
      /* Long text is spoken in sentence-sized pieces: some engines stop after ~15s. */
      function pieces(s) {
        var out = [], re = /[^.!?。！？\n]+[.!?。！？]*[\s\n]*|\n+/g, m, buf = '', start = 0, off = 0;
        while ((m = re.exec(s))) {
          if (!buf) start = m.index;
          buf += m[0];
          if (buf.length > 160 || /[.!?。！？\n]\s*$/.test(buf)) { out.push({ text: buf, start: start }); buf = ''; }
        }
        if (buf) out.push({ text: buf, start: start });
        return out.filter(function (p) { return p.text.trim(); });
      }
      function doSpeak() {
        if (!synth || !text.value.trim()) return;
        synth.cancel();
        var src = text.value, parts = pieces(src), voice = voices.filter(function (v) { return v.voiceURI === voiceSel.value; })[0];
        highlight.style.display = '';
        parts.forEach(function (p, i) {
          var u = new SpeechSynthesisUtterance(p.text);
          if (voice) { u.voice = voice; u.lang = voice.lang; }
          u.rate = +rate.value; u.pitch = +pitch.value;
          u.onstart = function () { progressLine.textContent = 'Reading part ' + (i + 1) + ' of ' + parts.length; mark(p.start, p.start + p.text.length); state(); };
          u.onboundary = function (e) {
            if (e.name && e.name !== 'word') return;
            var a = p.start + e.charIndex, len = e.charLength || (/^\S+/.exec(src.slice(a)) || [''])[0].length;
            mark(a, a + len);
          };
          u.onend = function () { if (i === parts.length - 1) setTimeout(state, 50); };
          u.onerror = function (e) { if (e.error !== 'interrupted' && e.error !== 'canceled') { progressLine.textContent = 'The voice stopped: ' + e.error; } setTimeout(state, 50); };
          synth.speak(u);
        });
        state();
      }
      function mark(a, b) {
        var s = text.value;
        highlight.replaceChildren(document.createTextNode(s.slice(0, a)), el('mark', { text: s.slice(a, b) }), document.createTextNode(s.slice(b)));
      }
      function doPause() {
        if (!synth) return;
        if (synth.paused) synth.resume(); else synth.pause();
        setTimeout(state, 30);
      }
      var poll = setInterval(state, 500);
      U.onTeardown(root, function () { clearInterval(poll); if (synth) synth.cancel(); });

      root.appendChild(U.panel(null,
        el('div', null, label('Text'), text, count),
        el('div', null, label('Voice'), voiceSel, voiceNote),
        U.row(el('div', { class: 'gv-range' }, rateLbl, rate), el('div', { class: 'gv-range' }, pitchLbl, pitch)),
        U.btnrow(speak, pause, stop), progressLine, highlight,
        U.note('The voices come from your own operating system, so the list differs between Windows, macOS, Android and iOS. Browsers don\'t expose this audio to the page, so it can be played but not saved as a file.')));
      state();
    }
  });

  /* --- Voice Recorder ------------------------------------------------------- */

  /* Recordings persist in IndexedDB so they survive a reload. */
  var VDB = {
    open: function () {
      if (this.p) return this.p;
      this.p = new Promise(function (res, rej) {
        if (!window.indexedDB) return rej(new Error('No IndexedDB'));
        var r = indexedDB.open('att-voice-recorder', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('recs', { keyPath: 'id' }); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
      });
      this.p.catch(function () { VDB.p = null; });
      return this.p;
    },
    tx: function (mode, fn) {
      return this.open().then(function (db) {
        return new Promise(function (res, rej) {
          var t = db.transaction('recs', mode), s = t.objectStore('recs'), out = fn(s);
          t.oncomplete = function () { res(out && out.result !== undefined ? out.result : out); };
          t.onerror = function () { rej(t.error); };
        });
      });
    },
    all: function () { return this.tx('readonly', function (s) { return s.getAll(); }).then(function (r) { return (r || []).sort(function (a, b) { return b.created - a.created; }); }); },
    put: function (rec) { return this.tx('readwrite', function (s) { s.put(rec); }); },
    del: function (id) { return this.tx('readwrite', function (s) { s.delete(id); }); }
  };

  function encodeWav(samples, rate) {
    var n = samples.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    function w(o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); }
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
    v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (var i = 0; i < n; i++) { var s = Math.max(-1, Math.min(1, samples[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
    return new Blob([buf], { type: 'audio/wav' });
  }
  async function encodeMp3(samples, rate, kbps) {
    await U.script('assets/vendor/lamejs/lamejs.iife.js');
    var enc = new window.lamejs.Mp3Encoder(1, rate, kbps || 128);
    var pcm = new Int16Array(samples.length);
    for (var i = 0; i < samples.length; i++) { var s = Math.max(-1, Math.min(1, samples[i])); pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff; }
    var parts = [], block = 1152;
    for (var j = 0; j < pcm.length; j += block) {
      var b = enc.encodeBuffer(pcm.subarray(j, j + block));
      if (b.length) parts.push(new Uint8Array(b));
    }
    var end = enc.flush();
    if (end.length) parts.push(new Uint8Array(end));
    return new Blob(parts, { type: 'audio/mpeg' });
  }
  /* Where the sound starts and stops (for "trim silence"). */
  function silenceBounds(samples, rate) {
    var win = Math.max(1, Math.round(rate * 0.02)), thr = 0.01, first = -1, last = -1;
    for (var i = 0; i < samples.length; i += win) {
      var sum = 0, end = Math.min(samples.length, i + win);
      for (var j = i; j < end; j++) sum += samples[j] * samples[j];
      if (Math.sqrt(sum / (end - i)) > thr) { if (first < 0) first = i; last = end; }
    }
    if (first < 0) return null;
    var pad = Math.round(rate * 0.15);
    return [Math.max(0, first - pad), Math.min(samples.length, last + pad)];
  }
  function drawWave(canvas, samples, sel) {
    var w = canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1) || 600, h = canvas.height = 90 * (window.devicePixelRatio || 1);
    var g = canvas.getContext('2d'), cs = getComputedStyle(canvas);
    g.clearRect(0, 0, w, h);
    var step = Math.max(1, Math.floor(samples.length / w));
    g.fillStyle = cs.getPropertyValue('--accent') || '#3b82f6';
    for (var x = 0; x < w; x++) {
      var mn = 1, mx = -1, o = x * step;
      for (var k = 0; k < step && o + k < samples.length; k++) { var s = samples[o + k]; if (s < mn) mn = s; if (s > mx) mx = s; }
      if (mn > mx) continue;
      g.fillRect(x, (1 - mx) * h / 2, 1, Math.max(1, (mx - mn) * h / 2));
    }
    if (sel) {
      g.fillStyle = 'rgba(0,0,0,.45)';
      g.fillRect(0, 0, sel[0] / samples.length * w, h);
      g.fillRect(sel[1] / samples.length * w, 0, w - sel[1] / samples.length * w, h);
    }
  }

  register({
    id: 'voice-recorder', category: 'audio', name: 'Voice Recorder',
    description: 'Record your voice, pause, trim the silence and save it as MP3 or WAV; recordings stay on your device.',
    keywords: ['online voice recorder', 'record audio online', 'voice memo', 'mp3 recorder', 'audio recorder', 'microphone', 'dictaphone'],
    render: function (root) {
      root.classList.add('g-video');
      var timer = el('div', { class: 'gv-big', text: '0:00.0' });
      var recBtn = el('button', { class: 'gv-rec', type: 'button', 'aria-label': 'Start recording', title: 'Start recording', onclick: toggle });
      var hint = U.note('Press the red button to record');
      hint.style.textAlign = 'center';
      var pauseBtn = U.button('Pause', pauseResume, 'ghost');
      var cancelBtn = U.button('Discard', discard, 'ghost');
      var ctrlRow = U.btnrow(pauseBtn, cancelBtn);
      ctrlRow.style.justifyContent = 'center';
      ctrlRow.style.display = 'none';
      var meter = el('div', { class: 'gv-meter' }, el('i'));
      meter.style.display = 'none';
      var cleanup = U.checkbox('Voice clean-up (reduces background noise and echo)', { checked: true });
      var micSel = el('select', { title: 'Microphone' });
      micSel.style.display = 'none';
      var status = U.note('');
      var editBox = el('div', { class: 'stack' });
      var listBox = el('div', { class: 'stack' });
      root.appendChild(U.panel(null, timer, recBtn, hint, meter, ctrlRow, cleanup, micSel, status));
      root.appendChild(editBox);
      root.appendChild(listBox);

      var stream = null, rec = null, chunks = [], t0 = 0, acc = 0, raf = null, actx = null, analyser = null, urls = [];

      function elapsed() { return acc + (rec && rec.state === 'recording' ? (performance.now() - t0) / 1000 : 0); }
      function loop() {
        timer.textContent = fmtTime(elapsed(), true);
        if (analyser) {
          var d = new Float32Array(analyser.fftSize);
          analyser.getFloatTimeDomainData(d);
          var peak = 0; for (var i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
          meter.firstChild.style.width = Math.min(100, Math.round(Math.sqrt(peak) * 100)) + '%';
        }
        raf = requestAnimationFrame(loop);
      }
      async function listMics() {
        try {
          var devs = (await navigator.mediaDevices.enumerateDevices()).filter(function (d) { return d.kind === 'audioinput'; });
          if (devs.length > 1 && devs[0].label) {
            var cur = micSel.value;
            micSel.replaceChildren.apply(micSel, devs.map(function (d, i) { return el('option', { value: d.deviceId, text: d.label || 'Microphone ' + (i + 1) }); }));
            if (cur) micSel.value = cur;
            micSel.style.display = '';
          }
        } catch (e) { /* not important */ }
      }
      async function toggle() {
        if (rec && rec.state !== 'inactive') { stop(); return; }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
          status.className = 'note err'; status.textContent = 'This browser cannot record audio.'; return;
        }
        status.className = 'note'; status.textContent = '';
        var on = cleanup.input.checked;
        try {
          var c = { echoCancellation: on, noiseSuppression: on, autoGainControl: on };
          if (micSel.value) c.deviceId = { exact: micSel.value };
          stream = await navigator.mediaDevices.getUserMedia({ audio: c });
        } catch (err) {
          status.className = 'note err';
          status.textContent = err.name === 'NotAllowedError' ? 'Microphone permission was denied. Allow it in the address bar and try again.' :
            err.name === 'NotFoundError' ? 'No microphone was found.' : (err.message || String(err));
          return;
        }
        listMics();
        actx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = actx.createAnalyser(); analyser.fftSize = 1024;
        actx.createMediaStreamSource(stream).connect(analyser);
        var mime = pickMime('audio');
        rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        chunks = [];
        rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = finished;
        rec.start(500);
        acc = 0; t0 = performance.now();
        recBtn.classList.add('on'); recBtn.setAttribute('aria-label', 'Stop recording'); recBtn.title = 'Stop recording';
        hint.textContent = 'Recording… press the button again to stop';
        ctrlRow.style.display = ''; meter.style.display = ''; pauseBtn.textContent = 'Pause';
        cleanup.input.disabled = true; micSel.disabled = true;
        editBox.replaceChildren();
        cancelAnimationFrame(raf); loop();
      }
      function pauseResume() {
        if (!rec) return;
        if (rec.state === 'recording') { acc = elapsed(); rec.pause(); pauseBtn.textContent = 'Resume'; hint.textContent = 'Paused'; }
        else if (rec.state === 'paused') { t0 = performance.now(); rec.resume(); pauseBtn.textContent = 'Pause'; hint.textContent = 'Recording… press the button again to stop'; }
      }
      function stop() { if (rec && rec.state !== 'inactive') { acc = elapsed(); rec.stop(); } }
      function discard() { if (rec) { rec.onstop = null; if (rec.state !== 'inactive') rec.stop(); } release(); timer.textContent = '0:00.0'; hint.textContent = 'Recording discarded. Press the red button to record'; }
      function release() {
        cancelAnimationFrame(raf); raf = null;
        if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
        stream = null;
        if (actx) { actx.close().catch(function () {}); actx = null; analyser = null; }
        rec = null;
        recBtn.classList.remove('on'); recBtn.setAttribute('aria-label', 'Start recording'); recBtn.title = 'Start recording';
        ctrlRow.style.display = 'none'; meter.style.display = 'none';
        cleanup.input.disabled = false; micSel.disabled = false;
      }
      async function finished() {
        var type = (rec && rec.mimeType) || 'audio/webm';
        var blob = new Blob(chunks, { type: type.split(';')[0] });
        var secs = acc;
        release();
        timer.textContent = fmtTime(secs, true);
        hint.textContent = 'Press the red button to record again';
        var recd = { id: 'r' + Date.now(), name: 'Recording ' + new Date().toLocaleString(), created: Date.now(), duration: secs, blob: blob };
        try { await VDB.put(recd); } catch (e) { status.textContent = 'This recording could not be saved in the browser (private mode?). Download it before leaving.'; }
        openEditor(recd);
        refreshList();
      }

      /* Decode to PCM for trimming and encoding. */
      async function decode(blob) {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        try {
          var ab = await ctx.decodeAudioData(await blob.arrayBuffer());
          var mono = new Float32Array(ab.length);
          for (var c = 0; c < ab.numberOfChannels; c++) { var d = ab.getChannelData(c); for (var i = 0; i < d.length; i++) mono[i] += d[i] / ab.numberOfChannels; }
          return { samples: mono, rate: ab.sampleRate };
        } finally { ctx.close().catch(function () {}); }
      }

      async function openEditor(recd) {
        editBox.replaceChildren(U.note('Preparing the recording…'));
        var pcm;
        try { pcm = await decode(recd.blob); } catch (e) {
          editBox.replaceChildren(U.panel(recd.name, mediaPreview(recd.blob), U.note('This browser could not decode the recording for editing. You can still download it as recorded.', 'err'),
            U.btnrow(U.button('Download original', function () { U.saveBlob(safe(recd.name) + '.' + (/ogg/.test(recd.blob.type) ? 'ogg' : /mp4/.test(recd.blob.type) ? 'm4a' : 'webm'), recd.blob); }))));
          return;
        }
        var sel = [0, pcm.samples.length];
        var nameIn = U.input({ label: 'Name', value: recd.name });
        var canvas = el('canvas', { class: 'gv-wave' });
        var player = el('audio', { controls: true, preload: 'auto' });
        var selInfo = el('div', { class: 'gv-fileinfo' });
        var fmt = choice('Download as', [{ value: 'mp3', label: 'MP3', desc: 'Small and plays everywhere (128 kbps).' }, { value: 'wav', label: 'WAV', desc: 'Uncompressed, for editing. About 10× bigger.' }], 'mp3');
        function trimmed() { return pcm.samples.subarray(sel[0], sel[1]); }
        function refreshPlayer() {
          urls.forEach(URL.revokeObjectURL); urls = [];
          var u = URL.createObjectURL(encodeWav(trimmed(), pcm.rate)); urls.push(u);
          player.src = u;
          selInfo.textContent = 'Keeping ' + fmtTime(sel[0] / pcm.rate, true) + ' – ' + fmtTime(sel[1] / pcm.rate, true) + ' (' + fmtTime((sel[1] - sel[0]) / pcm.rate, true) + ' of ' + fmtTime(pcm.samples.length / pcm.rate, true) + ')';
          drawWave(canvas, pcm.samples, sel);
        }
        /* Click the waveform to set the start (left half of the selection) or end. */
        canvas.addEventListener('click', function (e) {
          var r = canvas.getBoundingClientRect(), at = Math.round((e.clientX - r.left) / r.width * pcm.samples.length);
          if (Math.abs(at - sel[0]) < Math.abs(at - sel[1])) sel[0] = Math.min(at, sel[1] - 1); else sel[1] = Math.max(at, sel[0] + 1);
          refreshPlayer();
        });
        var trimBtn = U.button('Trim the silence', function () {
          var b = silenceBounds(pcm.samples, pcm.rate);
          if (!b) { U.toast('The whole recording is silent', 'err'); return; }
          sel = b; refreshPlayer(); U.toast('Trimmed the silence at the start and end');
        }, 'ghost');
        var undoBtn = U.button('Undo trim', function () { sel = [0, pcm.samples.length]; refreshPlayer(); }, 'ghost');
        var dl = U.button('Download', async function () {
          dl.disabled = true;
          try {
            var blob = fmt.value === 'wav' ? encodeWav(trimmed(), pcm.rate) : await encodeMp3(trimmed(), pcm.rate, 128);
            U.saveBlob(safe(nameIn.querySelector('input').value || recd.name) + '.' + fmt.value, blob);
          } catch (e) { U.toast(e.message || String(e), 'err'); }
          dl.disabled = false;
        });
        nameIn.querySelector('input').addEventListener('change', function () {
          recd.name = nameIn.querySelector('input').value || recd.name;
          VDB.put(recd).then(refreshList).catch(function () {});
        });
        editBox.replaceChildren(U.panel('Your recording', nameIn, canvas, selInfo, player, U.btnrow(trimBtn, undoBtn),
          U.note('Click the waveform near either edge of the kept part to move that edge.'), fmt, U.btnrow(dl)));
        requestAnimationFrame(refreshPlayer);
      }
      function safe(n) { return String(n).replace(/[\\/:*?"<>|]+/g, '-').trim() || 'recording'; }

      async function refreshList() {
        var recs;
        try { recs = await VDB.all(); } catch (e) { listBox.replaceChildren(); return; }
        if (!recs.length) { listBox.replaceChildren(); return; }
        listBox.replaceChildren(U.panel('Saved on this device (' + recs.length + ')',
          el('ul', { class: 'gv-list' }, recs.map(function (r) {
            return el('li', { class: 'gv-item' },
              el('div', { class: 'gv-grow' }, el('div', { text: r.name }), el('small', { text: fmtTime(r.duration || 0, true) + ' · ' + size(r.blob.size) + ' · ' + new Date(r.created).toLocaleString() })),
              U.button('Open', function () { openEditor(r); editBox.scrollIntoView({ behavior: 'smooth' }); }, 'ghost'),
              U.button('Delete', function () {
                if (!window.confirm('Delete "' + r.name + '" from this device?')) return;
                VDB.del(r.id).then(refreshList);
              }, 'ghost'));
          })),
          U.note('Recordings are stored in this browser only. Clearing site data removes them.')));
      }
      refreshList();
      document.addEventListener('keydown', onKey);
      function onKey(e) {
        if (e.code !== 'Space' || /INPUT|TEXTAREA|SELECT|BUTTON/.test((e.target || {}).tagName || '')) return;
        e.preventDefault(); toggle();
      }
      U.onTeardown(root, function () {
        document.removeEventListener('keydown', onKey);
        if (rec) { rec.onstop = null; if (rec.state !== 'inactive') rec.stop(); }
        release();
        urls.forEach(URL.revokeObjectURL);
      });
    }
  });
  /* Exposed for other code paths and for the behaviour tests. */
  window.VideoKit = { ffRun: ffRun, probe: probe, ffLoad: ffLoad, ffCancel: ffCancel, parseTime: parseTime, fmtTime: fmtTime,
    encodeWav: encodeWav, encodeMp3: encodeMp3, silenceBounds: silenceBounds, toSRT: toSRT, toVTT: toVTT };

  /* --- Vocal Remover ------------------------------------------------------- */
  register({
    id: 'vocal-remover', category: 'audio', name: 'Vocal Remover',
    description: 'Make a karaoke version of a song by cancelling the centre channel, with an option to keep the bass.',
    keywords: ['vocal remover', 'karaoke', 'instrumental', 'remove vocals', 'backing track', 'centre channel', 'center cancel', 'acapella', 'audio'],
    render: function (root) {
      var mode, fmt;
      fileTool(root, {
        accept: 'audio/*,video/*', drop: 'Drop a song here or click to choose',
        hint: 'MP3, WAV, M4A, FLAC, OGG or a video… nothing is uploaded', action: 'Remove Vocals', working: 'Processing',
        needAudio: true,
        options: function (ctx) {
          var stereo = !ctx.st.info.channels || ctx.st.info.channels >= 2;
          mode = choice('What to keep', [
            { value: 'bass', label: 'Instrumental, keep bass', desc: 'Cancels the centre, then adds the low end back so the kick and bass stay solid. Best for most songs.' },
            { value: 'plain', label: 'Instrumental (pure centre cancel)', desc: 'Everything mixed dead-centre goes: vocals, but often the bass and snare too.' },
            { value: 'sides', label: 'Sides only, as mono', desc: 'The stereo width alone: reverb, doubled guitars, pads. A ghostly, roomy result.' }
          ], 'bass');
          fmt = choice('Output format', [
            { value: 'mp3', label: 'MP3', desc: '192 kbps, plays anywhere.' },
            { value: 'wav', label: 'WAV', desc: 'Lossless, for editing.' },
            { value: 'm4a', label: 'M4A', desc: 'AAC, small files.' }
          ], 'mp3');
          return [mode, fmt, stereo ? null : U.note('This file is mono. Centre-channel cancelling needs a stereo mix: the vocals cannot be separated from a single channel.', 'err')].filter(Boolean);
        },
        run: async function (ctx) {
          var f = fmt.value, name = baseName(ctx.st.file.name) + '-instrumental.' + f;
          var graph;
          if (mode.value === 'plain') graph = 'pan=stereo|c0=c0-c1|c1=c1-c0';
          else if (mode.value === 'sides') graph = 'pan=mono|c0=0.5*c0-0.5*c1';
          else graph = 'asplit=2[s][b];[s]pan=stereo|c0=c0-c1|c1=c1-c0[side];[b]pan=stereo|c0=0.5*c0+0.5*c1|c1=0.5*c0+0.5*c1,lowpass=f=140[bass];[side][bass]amix=inputs=2:normalize=0';
          var out = await ffRun({ inputs: [ctx.st.file], duration: ctx.st.info.duration, onProgress: ctx.progress,
            args: function (p, d) { return ['-i', p[0], '-vn', '-filter_complex', '[0:a:0]' + graph + '[o]', '-map', '[o]'].concat(audioEnc(f, 192), [d + '/out.' + f]); },
            outputs: ['out.' + f], emptyHint: 'audio' });
          return [outCard(ctx, out[0], name, fmtTime(ctx.st.info.duration)),
            U.note('Centre-channel cancelling works on ordinary stereo mixes where the singer sits in the middle. Vocals with wide stereo reverb, or songs mixed in mono, will only partly disappear. That is the physics of the trick, not a setting.')];
        }
      });
    }
  });

  /* --- Metronome ----------------------------------------------------------- */
  register({
    id: 'metronome', category: 'audio', name: 'Metronome',
    description: 'A steady click at any tempo with accents, subdivisions, tap tempo and a visual beat.',
    keywords: ['metronome', 'tempo', 'bpm', 'beat', 'click track', 'tap tempo', 'time signature', 'practice', 'music', 'rhythm'],
    render: function (root) {
      root.classList.add('g-video');
      var AC = window.AudioContext || window.webkitAudioContext;
      var ctx = null, running = false, nextTime = 0, beat = 0, timer = 0, raf = 0, taps = [];
      var bpm = 120, beatsPerBar = 4, subdiv = 1, volume = 0.7, sound = 'click';
      var LOOKAHEAD = 0.12, TICK = 25;

      var bpmInput = el('input', { type: 'number', min: 20, max: 300, value: bpm, style: { width: '90px', fontSize: '22px', fontWeight: '700', textAlign: 'center' } });
      var bpmRange = el('input', { type: 'range', min: 20, max: 300, value: bpm, 'aria-label': 'Tempo' });
      var tempoName = el('span', { class: 'note', dataset: { k: 'tempo' } });
      var sig = U.select({ options: [1, 2, 3, 4, 5, 6, 7].map(function (n) { return { value: String(n), label: n + '/4' }; }), value: '4' });
      var sub = U.select({ options: [{ value: '1', label: 'Quarter notes' }, { value: '2', label: 'Eighths' }, { value: '3', label: 'Triplets' }, { value: '4', label: 'Sixteenths' }], value: '1' });
      var snd = U.select({ options: [{ value: 'click', label: 'Click' }, { value: 'wood', label: 'Woodblock' }, { value: 'beep', label: 'Beep' }], value: 'click' });
      var vol = el('input', { type: 'range', min: 0, max: 1, step: 0.01, value: volume, 'aria-label': 'Volume' });
      var lights = el('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center', margin: '14px 0' } });
      var startBtn = U.button('Start', toggle, 'primary');
      var tapBtn = U.button('Tap tempo', tap);
      var display = el('div', { style: { textAlign: 'center' } }, el('div', { style: { fontSize: '48px', fontWeight: '800', fontVariantNumeric: 'tabular-nums' }, dataset: { k: 'bpm' }, text: '120' }), el('div', { class: 'note', text: 'BPM' }));

      function tempoWord(b) {
        return b < 40 ? 'Grave' : b < 60 ? 'Largo' : b < 66 ? 'Larghetto' : b < 76 ? 'Adagio' : b < 108 ? 'Andante' : b < 120 ? 'Moderato' : b < 156 ? 'Allegro' : b < 176 ? 'Vivace' : b < 200 ? 'Presto' : 'Prestissimo';
      }
      function setBpm(v, fromRange) {
        bpm = Math.max(20, Math.min(300, Math.round(v) || 120));
        if (!fromRange) bpmRange.value = bpm;
        bpmInput.value = bpm;
        display.firstChild.textContent = String(bpm);
        tempoName.textContent = tempoWord(bpm) + ' · ' + (60000 / bpm).toFixed(0) + ' ms per beat';
      }
      function buildLights() {
        lights.replaceChildren.apply(lights, Array.apply(null, Array(beatsPerBar)).map(function (_, i) {
          return el('span', { style: { width: '22px', height: '22px', borderRadius: '50%', background: 'var(--bg-sunken)', border: '2px solid var(--border)', transition: 'background .05s' }, dataset: { beat: String(i) } });
        }));
      }
      function audio() {
        if (!AC) throw new Error('This browser has no Web Audio support.');
        if (!ctx) ctx = new AC();
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
      }
      function click(time, accent, weak) {
        var c = audio(), g = c.createGain();
        var level = volume * (accent ? 1 : weak ? 0.35 : 0.7);
        g.connect(c.destination);
        if (sound === 'beep') {
          var o = c.createOscillator(); o.type = 'sine'; o.frequency.value = accent ? 1320 : weak ? 660 : 880;
          g.gain.setValueAtTime(level, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
          o.connect(g); o.start(time); o.stop(time + 0.09);
        } else {
          var o2 = c.createOscillator(); o2.type = sound === 'wood' ? 'triangle' : 'square';
          var f0 = sound === 'wood' ? (accent ? 1800 : 1200) : (accent ? 2400 : 1600);
          o2.frequency.setValueAtTime(f0, time); o2.frequency.exponentialRampToValueAtTime(f0 * 0.4, time + 0.03);
          g.gain.setValueAtTime(level, time); g.gain.exponentialRampToValueAtTime(0.001, time + (sound === 'wood' ? 0.06 : 0.03));
          o2.connect(g); o2.start(time); o2.stop(time + 0.07);
        }
      }
      function flash(i) {
        Array.prototype.forEach.call(lights.children, function (l, k) {
          l.style.background = k === i ? (k === 0 ? 'var(--accent)' : 'var(--ok)') : 'var(--bg-sunken)';
        });
      }
      function schedule() {
        var c = audio();
        while (nextTime < c.currentTime + LOOKAHEAD) {
          var inBeat = beat % subdiv, beatIdx = Math.floor(beat / subdiv) % beatsPerBar;
          click(nextTime, inBeat === 0 && beatIdx === 0 && beatsPerBar > 1, inBeat !== 0);
          if (inBeat === 0) (function (idx, at) { var d = Math.max(0, (at - c.currentTime) * 1000); setTimeout(function () { if (running) flash(idx); }, d); })(beatIdx, nextTime);
          nextTime += 60 / bpm / subdiv;
          beat++;
        }
      }
      function toggle() {
        if (running) { stop(); return; }
        try { audio(); } catch (e) { U.toast(e.message, 'err'); return; }
        running = true; beat = 0; nextTime = ctx.currentTime + 0.05;
        startBtn.textContent = 'Stop';
        root.dataset.running = '1';
        timer = setInterval(schedule, TICK);
        schedule();
      }
      function stop() {
        running = false; clearInterval(timer); startBtn.textContent = 'Start'; delete root.dataset.running;
        Array.prototype.forEach.call(lights.children, function (l) { l.style.background = 'var(--bg-sunken)'; });
      }
      function tap() {
        var now = performance.now();
        if (taps.length && now - taps[taps.length - 1] > 2000) taps = [];
        taps.push(now);
        if (taps.length > 8) taps.shift();
        if (taps.length >= 2) {
          var gaps = 0;
          for (var i = 1; i < taps.length; i++) gaps += taps[i] - taps[i - 1];
          setBpm(60000 / (gaps / (taps.length - 1)));
          tapBtn.textContent = 'Tap tempo (' + taps.length + ')';
        } else tapBtn.textContent = 'Tap again…';
        if (running) { beat = 0; nextTime = ctx.currentTime + 0.02; }
      }

      bpmInput.addEventListener('input', function () { setBpm(+bpmInput.value); });
      bpmRange.addEventListener('input', function () { setBpm(+bpmRange.value, true); });
      sig.addEventListener('change', function () { beatsPerBar = +sig.value; buildLights(); beat = 0; });
      sub.addEventListener('change', function () { subdiv = +sub.value; beat = 0; });
      snd.addEventListener('change', function () { sound = snd.value; });
      vol.addEventListener('input', function () { volume = +vol.value; });
      function key(e) {
        if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
        if (e.code === 'Space') { e.preventDefault(); toggle(); }
        else if (e.key === 'ArrowUp') setBpm(bpm + 1); else if (e.key === 'ArrowDown') setBpm(bpm - 1);
        else if (e.key === 't' || e.key === 'T') tap();
      }
      document.addEventListener('keydown', key);
      setBpm(bpm); buildLights();
      var steps = U.btnrow.apply(null, [-10, -5, -1, 1, 5, 10].map(function (d) { return U.button((d > 0 ? '+' : '') + d, function () { setBpm(bpm + d); }, 'ghost'); }));
      var presets = el('div', { class: 'chips' }, [['Ballad', 70], ['Hip hop', 90], ['Pop', 120], ['House', 128], ['Drum & bass', 174]].map(function (p) {
        return el('button', { type: 'button', class: 'chip', onclick: function () { setBpm(p[1]); } }, p[0] + ' ' + p[1]);
      }));
      root.appendChild(U.panel(null, display, tempoName, lights, U.btnrow(startBtn, tapBtn), el('div', { class: 'row', style: { alignItems: 'center' } }, bpmInput, bpmRange), steps, presets));
      root.appendChild(U.panel('Settings', el('div', { class: 'row' }, U.field('Time signature', sig), U.field('Subdivision', sub), U.field('Sound', snd), U.field('Volume', vol)),
        U.note('Space starts and stops, ↑ and ↓ nudge the tempo, T taps. Timing comes from the audio clock, so it stays steady even when the page is busy.')));
      U.onTeardown(root, function () { stop(); document.removeEventListener('keydown', key); if (ctx) ctx.close(); });
    }
  });

  /* --- Instrument Tuner ---------------------------------------------------- */
  var NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  var TUNINGS = {
    chromatic: { label: 'Chromatic (any note)', strings: [] },
    guitar: { label: 'Guitar, standard', strings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
    'guitar-drop-d': { label: 'Guitar, drop D', strings: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
    bass: { label: 'Bass, 4-string', strings: ['E1', 'A1', 'D2', 'G2'] },
    ukulele: { label: 'Ukulele (GCEA)', strings: ['G4', 'C4', 'E4', 'A4'] },
    violin: { label: 'Violin', strings: ['G3', 'D4', 'A4', 'E5'] },
    cello: { label: 'Cello', strings: ['C2', 'G2', 'D3', 'A3'] },
    mandolin: { label: 'Mandolin', strings: ['G3', 'D4', 'A4', 'E5'] }
  };
  function noteToFreq(name, a4) {
    var m = /^([A-G])(♯|#|b|♭)?(-?\d)$/.exec(name);
    var idx = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' || m[2] === '♯' ? 1 : m[2] ? -1 : 0);
    var midi = (parseInt(m[3], 10) + 1) * 12 + idx;
    return a4 * Math.pow(2, (midi - 69) / 12);
  }
  function freqToNote(f, a4) {
    var midi = 69 + 12 * Math.log2(f / a4), n = Math.round(midi);
    return { name: NOTE_NAMES[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1), cents: Math.round((midi - n) * 100), midi: n };
  }
  /* Autocorrelation pitch detector (normalised, with parabolic refinement). */
  function detectPitch(buf, sampleRate) {
    var n = buf.length, rms = 0;
    for (var i = 0; i < n; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / n);
    if (rms < 0.01) return -1;
    var lo = Math.floor(sampleRate / 1500), hi = Math.floor(sampleRate / 40);
    var best = -1, bestCorr = 0, corr = new Float32Array(hi + 1);
    for (var lag = lo; lag <= hi; lag++) {
      var sum = 0, e1 = 0, e2 = 0;
      for (var j = 0; j < n - lag; j++) { sum += buf[j] * buf[j + lag]; e1 += buf[j] * buf[j]; e2 += buf[j + lag] * buf[j + lag]; }
      corr[lag] = sum / Math.sqrt(e1 * e2 || 1);
    }
    /* first strong peak after the first dip, so octave errors are avoided */
    var dipped = false;
    for (var k = lo; k <= hi; k++) {
      if (!dipped && corr[k] < 0.3) dipped = true;
      if (dipped && corr[k] > 0.85 && corr[k] > bestCorr) { bestCorr = corr[k]; best = k; }
      if (dipped && best > 0 && corr[k] < bestCorr - 0.15) break;
    }
    if (best < 0) {
      for (var k2 = lo; k2 <= hi; k2++) if (corr[k2] > bestCorr) { bestCorr = corr[k2]; best = k2; }
      if (bestCorr < 0.8) return -1;
    }
    var a = corr[best - 1] || 0, b = corr[best], c = corr[best + 1] || 0;
    var shift = (a - c) / (2 * (a - 2 * b + c) || 1);
    return sampleRate / (best + (isFinite(shift) ? shift : 0));
  }

  register({
    id: 'instrument-tuner', category: 'audio', name: 'Instrument Tuner',
    description: 'Tune a guitar, bass, ukulele, violin or any instrument by ear-free pitch detection from the microphone.',
    keywords: ['tuner', 'guitar tuner', 'bass tuner', 'ukulele', 'violin', 'pitch', 'chromatic', 'cents', 'microphone', 'a440', 'music', 'note'],
    render: function (root) {
      root.classList.add('g-video');
      var AC = window.AudioContext || window.webkitAudioContext;
      var actx = null, stream = null, analyser = null, raf = 0, buf = null, a4 = 440, hold = [];
      var inst = U.select({ options: Object.keys(TUNINGS).map(function (k) { return { value: k, label: TUNINGS[k].label }; }), value: 'guitar' });
      var ref = el('input', { type: 'number', min: 400, max: 480, value: 440, style: { width: '90px' } });
      var noteEl = el('div', { style: { fontSize: '72px', fontWeight: '800', lineHeight: '1' }, dataset: { k: 'note' }, text: '—' });
      var centsEl = el('div', { class: 'note', dataset: { k: 'cents' }, text: 'Play a note' });
      var freqEl = el('div', { class: 'note', dataset: { k: 'freq' } });
      var needleWrap = el('div', { style: { position: 'relative', height: '70px', margin: '10px auto', maxWidth: '520px' } });
      var scale = el('div', { style: { position: 'absolute', inset: '30px 0 auto', height: '10px', borderRadius: '5px', background: 'linear-gradient(90deg, var(--err), var(--warn) 35%, var(--ok) 47%, var(--ok) 53%, var(--warn) 65%, var(--err))' } });
      var needle = el('div', { style: { position: 'absolute', top: '10px', left: '50%', width: '4px', height: '50px', marginLeft: '-2px', background: 'var(--fg)', borderRadius: '2px', transition: 'left .08s' } });
      var ticks = el('div', { style: { position: 'absolute', left: 0, right: 0, top: '44px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--fg-muted)' } }, ['-50', '-25', '0', '+25', '+50'].map(function (t) { return el('span', { text: t }); }));
      needleWrap.append(scale, needle, ticks);
      var strings = el('div', { class: 'chips', style: { justifyContent: 'center' } });
      var status = U.note('');
      var startBtn = U.button('Start listening', start, 'primary');
      var stopBtn = U.button('Stop', stop, 'ghost');
      var verdict = el('div', { style: { textAlign: 'center', fontWeight: '700', minHeight: '24px' }, dataset: { k: 'verdict' } });

      function drawStrings() {
        var t = TUNINGS[inst.value];
        strings.replaceChildren.apply(strings, t.strings.map(function (s) {
          return el('span', { class: 'chip', dataset: { s: s }, text: s + ' · ' + noteToFreq(s, a4).toFixed(1) + ' Hz' });
        }));
      }
      function show(freq) {
        if (freq < 0) { verdict.textContent = ''; hold.push(0); if (hold.length > 12) hold.shift(); if (hold.every(function (h) { return !h; })) { noteEl.textContent = '—'; centsEl.textContent = 'Listening… play a single note'; freqEl.textContent = ''; needle.style.left = '50%'; } return; }
        hold.push(freq); if (hold.length > 12) hold.shift();
        var t = TUNINGS[inst.value], target, cents;
        if (t.strings.length) {
          var closest = t.strings.map(function (s) { return { s: s, f: noteToFreq(s, a4) }; }).sort(function (x, y) { return Math.abs(Math.log2(freq / x.f)) - Math.abs(Math.log2(freq / y.f)); })[0];
          target = closest.s; cents = Math.round(1200 * Math.log2(freq / closest.f));
          Array.prototype.forEach.call(strings.children, function (c) { c.classList.toggle('on', c.dataset.s === target); });
          if (Math.abs(cents) > 200) { var n = freqToNote(freq, a4); target = n.name; cents = n.cents; }
        } else { var nn = freqToNote(freq, a4); target = nn.name; cents = nn.cents; }
        noteEl.textContent = target;
        freqEl.textContent = freq.toFixed(1) + ' Hz';
        var c2 = Math.max(-50, Math.min(50, cents));
        needle.style.left = (50 + c2) + '%';
        centsEl.textContent = (cents > 0 ? '+' : '') + cents + ' cents';
        verdict.textContent = Math.abs(cents) <= 5 ? '✓ In tune' : cents < 0 ? '▲ Tune up' : '▼ Tune down';
        verdict.style.color = Math.abs(cents) <= 5 ? 'var(--ok)' : 'var(--warn)';
      }
      function loop() {
        analyser.getFloatTimeDomainData(buf);
        show(detectPitch(buf, actx.sampleRate));
        raf = requestAnimationFrame(loop);
      }
      async function start() {
        if (stream) return;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !AC) { status.className = 'note err'; status.textContent = 'This browser cannot access the microphone.'; return; }
        try {
          status.className = 'note'; status.textContent = 'Asking for the microphone…';
          stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
          actx = new AC();
          await actx.resume();
          analyser = actx.createAnalyser(); analyser.fftSize = 4096;
          actx.createMediaStreamSource(stream).connect(analyser);
          buf = new Float32Array(analyser.fftSize);
          status.textContent = 'Listening. Play one string at a time, close to the microphone.';
          startBtn.disabled = true;
          loop();
        } catch (e) {
          status.className = 'note err';
          status.textContent = /NotAllowed|Permission/i.test(e.name + e.message) ? 'Microphone access was refused. Allow it in the address bar and try again.' : (e.message || String(e));
          stream = null;
        }
      }
      function stop() {
        cancelAnimationFrame(raf);
        if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
        if (actx) actx.close();
        stream = null; actx = null; startBtn.disabled = false;
        status.textContent = '';
      }
      inst.addEventListener('change', drawStrings);
      ref.addEventListener('input', function () { a4 = Math.max(400, Math.min(480, +ref.value || 440)); drawStrings(); });
      drawStrings();
      root.appendChild(U.panel(null, el('div', { style: { textAlign: 'center' } }, noteEl, centsEl, freqEl), needleWrap, verdict, strings, U.btnrow(startBtn, stopBtn), status));
      root.appendChild(U.panel('Settings', el('div', { class: 'row' }, U.field('Instrument', inst), U.field('A4 reference (Hz)', ref)),
        U.note('Pitch is measured by autocorrelation over 4096 samples, which is accurate to a couple of cents for sustained notes. Within ±5 cents counts as in tune. For a wound low string, pluck it and let it ring; the reading settles after a moment.')));
      U.onTeardown(root, stop);
      root._tuner = { detect: detectPitch, feed: function (f) { show(f); } };
    }
  });

  /* Shared with the other media modules (video-b.js, audio-b.js): one ffmpeg
     instance and one job queue for the whole app, plus the common helpers. */
  window.MediaKit = {
    ffRun: ffRun, ffLoad: ffLoad, ffCancel: ffCancel, probe: probe,
    parseTime: parseTime, fmtTime: fmtTime, fmtSecs: fmtSecs, size: size,
    baseName: baseName, extOf: extOf, toBlob: toBlob, MIME: MIME,
    vEnc: vEnc, AAC: AAC, MP4_TAIL: MP4_TAIL, audioEnc: audioEnc, isLossless: isLossless,
    AUDIO_FORMATS: AUDIO_FORMATS, BITRATES: BITRATES, decodeTo16k: decodeTo16k,
    label: label, desc: desc, choice: choice, mediaPreview: mediaPreview, resultCard: resultCard,
    fileTool: fileTool, outCard: outCard, register: register, toSRT: toSRT, toVTT: toVTT, srtTime: srtTime,
    audioOutputControls: audioOutputControls, twoFileTool: twoFileTool, atempoChain: atempoChain, grabFrame: grabFrame,
    encodeWav: encodeWav, evenDims: evenDims, copyContainer: copyContainer, audioFor: audioFor
  };
})();
