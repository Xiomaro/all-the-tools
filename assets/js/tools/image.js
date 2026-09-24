/* Image tools. Everything runs on a canvas in this tab: nothing is uploaded. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  /* --- styles (all scoped to .g-image) ---------------------------------- */

  document.head.appendChild(el('style', { text: [
    '.g-image .g-hide { display: none !important; }',
    '.g-image .g-muted { color: var(--fg-muted); font-size: 13px; }',
    '.g-image .g-label { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; font-weight: 600; margin-bottom: 4px; }',
    '.g-image .g-range { display: flex; flex-direction: column; min-width: 180px; flex: 1; }',
    '.g-image .g-range input[type=range] { width: 100%; }',
    '.g-image .g-grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }',
    '.g-image .g-prev { display: grid; place-items: center; padding: 10px; background: var(--bg-sunken); border: 1px solid var(--border); border-radius: var(--radius); min-height: 60px; overflow: auto; }',
    '.g-image .g-prev canvas, .g-image .g-prev img, .g-image .g-prev svg { max-width: 100%; max-height: 520px; height: auto; width: auto; }',
    '.g-image .g-check { background-color: #fff; background-image: linear-gradient(45deg,#ddd 25%,transparent 25%),linear-gradient(-45deg,#ddd 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ddd 75%),linear-gradient(-45deg,transparent 75%,#ddd 75%); background-size: 16px 16px; background-position: 0 0,0 8px,8px -8px,-8px 0; }',
    '.g-image .g-info { font-family: var(--mono); font-size: 13px; margin: 8px 0; }',
    '.g-image .g-bigstat { display: flex; gap: 18px; flex-wrap: wrap; align-items: baseline; }',
    '.g-image .g-bigstat b { font-size: 20px; }',
    '.g-image .g-good { color: var(--ok); } .g-image .g-bad { color: var(--err); }',
    '.g-image .g-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }',
    '.g-image .g-color { display: flex; gap: 6px; align-items: center; }',
    '.g-image .g-color input[type=color] { width: 44px; height: 34px; padding: 0; border: 1px solid var(--border); border-radius: 6px; background: none; }',
    '.g-image .g-color input[type=text] { width: 100px; font-family: var(--mono); }',
    '.g-image .g-kv { display: grid; grid-template-columns: minmax(130px, max-content) 1fr; gap: 6px 16px; font-size: 14px; }',
    '.g-image .g-kv dt { color: var(--fg-muted); } .g-image .g-kv dd { margin: 0; font-family: var(--mono); word-break: break-word; }',
    '.g-image .g-picks { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }',
    '.g-image .g-pick { display: flex; align-items: center; gap: 8px; border: 1px solid var(--border); border-radius: 8px; padding: 6px; background: var(--bg-elev); cursor: pointer; font-family: var(--mono); font-size: 13px; color: var(--fg); }',
    '.g-image .g-pick i { width: 26px; height: 26px; border-radius: 5px; border: 1px solid var(--border); flex: none; }',
    '.g-image .g-thumbs { display: flex; flex-wrap: wrap; gap: 10px; }',
    '.g-image .g-thumb { position: relative; width: 110px; height: 110px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--bg-sunken); display: grid; place-items: center; }',
    '.g-image .g-thumb img { width: 100%; height: 100%; object-fit: cover; }',
    '.g-image .g-thumb button.g-x { position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; border-radius: 50%; border: 0; background: rgba(0,0,0,.65); color: #fff; cursor: pointer; line-height: 1; }',
    '.g-image .g-thumb.g-add { cursor: pointer; font-size: 34px; color: var(--fg-muted); border-style: dashed; }',
    '.g-image .g-fav { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }',
    '.g-image .g-fav > div { border: 1px solid var(--border); border-radius: 8px; padding: 10px; text-align: center; background: var(--bg-elev); }',
    '.g-image .g-fav canvas { image-rendering: pixelated; display: block; margin: 0 auto 6px; max-width: 64px; max-height: 64px; width: 64px; height: 64px; }',
    '.g-image pre.g-ascii { font-family: var(--mono); font-size: 8px; line-height: 1; white-space: pre; overflow: auto; background: var(--bg-sunken); padding: 10px; border-radius: 8px; border: 1px solid var(--border); max-height: 560px; }',
    '.g-image .g-cropstage { position: relative; display: inline-block; max-width: 100%; touch-action: none; user-select: none; }',
    '.g-image .g-cropstage canvas { display: block; max-width: 100%; height: auto; }',
    '.g-image .g-cropbox { position: absolute; border: 2px dashed #fff; outline: 1px solid rgba(0,0,0,.6); box-shadow: 0 0 0 9999px rgba(0,0,0,.45); cursor: move; }',
    '.g-image .g-cropbox .g-h { position: absolute; width: 12px; height: 12px; background: #fff; border: 1px solid #333; right: -7px; bottom: -7px; cursor: nwse-resize; }',
    '.g-image .g-filterimg { max-width: 100%; max-height: 460px; display: block; margin: 0 auto; }',
    '.g-image .g-toolbar { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; padding: 6px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg-elev); }',
    '.g-image .g-toolbar .g-sep { width: 1px; align-self: stretch; background: var(--border); margin: 0 4px; }',
    '.g-image .g-tb { min-width: 34px; height: 34px; border: 1px solid transparent; border-radius: 8px; background: none; color: var(--fg); cursor: pointer; font-size: 15px; padding: 0 8px; }',
    '.g-image .g-tb:hover { background: var(--bg-sunken); }',
    '.g-image .g-tb.on { border-color: var(--accent); background: var(--bg-sunken); color: var(--accent); }',
    '.g-image .g-sw { width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--border); cursor: pointer; padding: 0; }',
    '.g-image .g-sw.on { outline: 2px solid var(--accent); outline-offset: 2px; }',
    '.g-image .g-board { position: relative; height: 70vh; min-height: 380px; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; background: #fff; touch-action: none; }',
    '.g-image .g-board canvas { position: absolute; inset: 0; width: 100%; height: 100%; }',
    '.g-image .g-board textarea { position: absolute; border: 1px dashed #888; background: rgba(255,255,255,.85); outline: none; resize: none; padding: 0; margin: 0; overflow: hidden; line-height: 1.2; white-space: pre; min-width: 40px; }',
    '.g-image .g-board.g-full { position: fixed; inset: 0; height: auto; z-index: 1000; border-radius: 0; }',
    '.g-image .g-sigpad { position: relative; border: 1px solid var(--border); border-radius: 10px; background: #fff; height: 240px; touch-action: none; overflow: hidden; }',
    '.g-image .g-sigpad canvas { position: absolute; inset: 0; width: 100%; height: 100%; cursor: crosshair; }',
    '.g-image .g-sigpad .g-line { position: absolute; left: 24px; right: 24px; bottom: 56px; border-bottom: 1px solid #c8c8c8; pointer-events: none; }',
    '.g-image .g-sigpad .g-xmark { position: absolute; left: 24px; bottom: 60px; color: #999; font-size: 20px; pointer-events: none; }',
    '.g-image .g-sigpad .g-ph { position: absolute; left: 0; right: 0; bottom: 30px; text-align: center; color: #aaa; font-size: 13px; pointer-events: none; }',
    '.g-image .g-fonts { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }',
    '.g-image .g-fontbtn { border: 1px solid var(--border); border-radius: 10px; background: #fff; color: #111; font-size: 30px; padding: 12px; cursor: pointer; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }',
    '.g-image .g-fontbtn.on { outline: 2px solid var(--accent); }',
    '.g-image .g-cam { max-width: 760px; margin: 0 auto; width: 100%; position: relative; background: #000; border-radius: 10px; overflow: hidden; aspect-ratio: 4 / 3; display: grid; place-items: center; color: #ddd; }',
    '.g-image .g-cam video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }',
    '.g-image .g-cam .g-count { position: absolute; inset: 0; display: grid; place-items: center; font-size: 110px; font-weight: 800; color: #fff; text-shadow: 0 4px 20px rgba(0,0,0,.6); pointer-events: none; }',
    '.g-image .g-cam .g-flash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; transition: opacity .35s; }',
    '.g-image .g-pp { position: relative; margin: 0 auto; touch-action: none; user-select: none; cursor: grab; background: #ddd; overflow: hidden; border: 1px solid var(--border); }',
    '.g-image .g-pp canvas { display: block; width: 100%; height: 100%; }',
    '.g-image .g-pp .g-guide { position: absolute; left: 0; right: 0; border-top: 2px dashed #e11d48; pointer-events: none; }',
    '.g-image .g-pp .g-guide span { position: absolute; right: 4px; top: 2px; background: rgba(225,29,72,.85); color: #fff; font-size: 11px; padding: 1px 5px; border-radius: 4px; }',
    '.g-image .g-pp .g-oval { position: absolute; border: 2px dashed rgba(255,255,255,.85); border-radius: 50%; pointer-events: none; }',
    '.g-image ul.g-tips { margin: 0; padding-left: 20px; } .g-image ul.g-tips li { margin: 3px 0; }'
  ].join('\n') }));

  /* --- small helpers ----------------------------------------------------- */

  function kb(n) {
    if (n >= 1024 * 1024) return +(n / 1048576).toFixed(2) + ' MB';
    return +(n / 1024).toFixed(2) + ' KB';
  }
  function baseName(name) { return String(name || 'image').replace(/\.[^.]+$/, '') || 'image'; }
  function extFor(mime) {
    return { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/bmp': 'bmp', 'image/svg+xml': 'svg', 'image/avif': 'avif' }[mime] || 'png';
  }
  function fmtName(mime) {
    return { 'image/png': 'PNG', 'image/jpeg': 'JPEG', 'image/webp': 'WebP', 'image/gif': 'GIF', 'image/bmp': 'BMP',
             'image/tiff': 'TIFF', 'image/svg+xml': 'SVG', 'image/avif': 'AVIF', 'image/heic': 'HEIC', 'image/heif': 'HEIF',
             'image/x-icon': 'ICO', 'image/vnd.microsoft.icon': 'ICO' }[mime] || (mime ? mime.replace('image/', '').toUpperCase() : 'Unknown');
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function num(node, fallback) { var v = parseFloat((node.input || node.querySelector && node.querySelector('input') || node).value); return isFinite(v) ? v : fallback; }
  function inputOf(node) { return node.tagName === 'INPUT' || node.tagName === 'SELECT' || node.tagName === 'TEXTAREA' ? node : node.querySelector('input, select, textarea'); }

  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }
  function ctx2d(c) { return c.getContext('2d', { willReadFrequently: true }); }
  function cloneCanvas(src) { var c = makeCanvas(src.width, src.height); ctx2d(c).drawImage(src, 0, 0); return c; }

  function toBlob(canvas, mime, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) return reject(new Error('This browser could not encode ' + fmtName(mime)));
        resolve(blob);
      }, mime || 'image/png', quality);
    });
  }

  /* Paint over a solid colour so formats without alpha (JPEG) don't go black. */
  function flatten(canvas, color) {
    var c = makeCanvas(canvas.width, canvas.height), x = ctx2d(c);
    x.fillStyle = color || '#ffffff';
    x.fillRect(0, 0, c.width, c.height);
    x.drawImage(canvas, 0, 0);
    return c;
  }

  function hasAlpha(canvas) {
    var d = ctx2d(canvas).getImageData(0, 0, canvas.width, canvas.height).data;
    for (var i = 3; i < d.length; i += 16) if (d[i] < 255) return true;
    return false;
  }

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function ratioText(w, h) {
    var d = gcd(w, h), a = w / d, b = h / d;
    if (a <= 50 && b <= 50) return a + ':' + b;
    var common = [[1, 1], [4, 3], [3, 2], [16, 9], [16, 10], [21, 9], [5, 4], [2, 1], [3, 1], [9, 16], [3, 4], [2, 3], [4, 5]];
    for (var i = 0; i < common.length; i++) {
      if (Math.abs(w / h - common[i][0] / common[i][1]) < 0.01) return '≈ ' + common[i][0] + ':' + common[i][1];
    }
    return (w / h).toFixed(2) + ':1';
  }

  function rgbHex(r, g, b) { return '#' + [r, g, b].map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join(''); }

  /* A labelled slider whose label shows the current value. */
  function slider(label, opts, fmt) {
    var input = el('input', { type: 'range', min: opts.min, max: opts.max, step: opts.step || 1, value: opts.value });
    var shown = el('span', { class: 'g-val' });
    var wrap = el('label', { class: 'g-range' }, el('span', { class: 'g-label' }, el('span', { class: 'g-lt' }), shown), input);
    function paint() {
      var v = fmt ? fmt(input.value) : input.value;
      if (label.indexOf('{}') > -1) { wrap.querySelector('.g-lt').textContent = label.replace('{}', v); shown.textContent = ''; }
      else { wrap.querySelector('.g-lt').textContent = label; shown.textContent = v; }
    }
    input.addEventListener('input', paint);
    paint();
    wrap.input = input;
    wrap.paint = paint;
    wrap.get = function () { return parseFloat(input.value); };
    wrap.set = function (v) { input.value = v; paint(); };
    return wrap;
  }

  /* Colour picker plus a hex text box kept in sync. */
  function colorField(label, value) {
    var picker = el('input', { type: 'color', value: value });
    var text = el('input', { type: 'text', value: value, spellcheck: false, maxLength: 9 });
    var wrap = el('div', { class: 'field' }, label ? el('label', { text: label }) : null, el('div', { class: 'g-color' }, picker, text));
    picker.addEventListener('input', function () { text.value = picker.value; wrap.dispatchEvent(new Event('change')); });
    text.addEventListener('input', function () {
      var v = text.value.trim();
      if (/^#?[0-9a-f]{6}$/i.test(v)) { picker.value = v[0] === '#' ? v : '#' + v; wrap.dispatchEvent(new Event('change')); }
      else if (/^#?[0-9a-f]{3}$/i.test(v)) { v = v.replace('#', ''); picker.value = '#' + v[0] + v[0] + v[1] + v[1] + v[2] + v[2]; wrap.dispatchEvent(new Event('change')); }
    });
    wrap.input = picker;
    wrap.picker = picker;
    wrap.text = text;
    wrap.get = function () { return picker.value; };
    wrap.set = function (v) { picker.value = v; text.value = v; };
    return wrap;
  }

  /* An on/off chip group that behaves like a <select>. */
  function choice(options, initial, onChange) {
    var wrap = U.chips(options, onChange, initial);
    wrap.set = function (v) {
      wrap.value = v;
      Array.prototype.forEach.call(wrap.children, function (c, i) {
        var o = options[i], ov = typeof o === 'string' ? o : o.value;
        c.classList.toggle('on', ov === v);
      });
    };
    return wrap;
  }

  function onChange(nodes, fn) {
    nodes.forEach(function (n) {
      n.addEventListener('input', fn);
      n.addEventListener('change', fn);
    });
  }

  function root$(root) { root.classList.add('g-image'); return root; }

  /* --- decoding: anything the browser can read, plus TIFF and HEIC -------- */

  function sniff(bytes) {
    var b = bytes;
    var s = function (o, n) { var t = ''; for (var i = 0; i < n; i++) t += String.fromCharCode(b[o + i] || 0); return t; };
    if (b[0] === 0x89 && s(1, 3) === 'PNG') return 'image/png';
    if (b[0] === 0xFF && b[1] === 0xD8) return 'image/jpeg';
    if (s(0, 4) === 'GIF8') return 'image/gif';
    if (s(0, 4) === 'RIFF' && s(8, 4) === 'WEBP') return 'image/webp';
    if (s(0, 2) === 'BM') return 'image/bmp';
    if ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 42) || (b[0] === 0x4D && b[1] === 0x4D && b[3] === 42)) return 'image/tiff';
    if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return 'image/x-icon';
    if (s(4, 4) === 'ftyp') {
      /* The major brand plus the compatible brands: some AVIF encoders write
         the generic "mif1" first and only list "avif" further on. */
      var boxEnd = Math.min(b.length, ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0 || 32), brands = s(8, 4);
      for (var bo = 16; bo + 4 <= boxEnd; bo += 4) brands += ' ' + s(bo, 4);
      if (/avif|avis/.test(brands)) return 'image/avif';
      if (/heic|heix|hevc|hevx|heim|heis|mif1|msf1/.test(brands)) return 'image/heic';
    }
    var head = s(0, 256).trim().toLowerCase();
    if (head.indexOf('<svg') > -1 || (head.indexOf('<?xml') === 0 && s(0, 1024).indexOf('<svg') > -1)) return 'image/svg+xml';
    return '';
  }

  function imageFromBlob(blob) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('This browser cannot decode that image.')); };
      img.src = url;
    });
  }

  /* Returns { canvas, width, height, mime, file } for any supported image file. */
  async function decodeFile(file) {
    var buf = await U.readAs(file.slice(0, 1024), 'buffer');
    var mime = sniff(new Uint8Array(buf)) || file.type || '';
    if (/\.(heic|heif)$/i.test(file.name || '') && !/^image\/(png|jpeg|webp|gif)$/.test(mime)) mime = 'image/heic';
    var source;
    if (mime === 'image/tiff') {
      source = await decodeTiff(await U.readAs(file, 'buffer'));
    } else if (mime === 'image/heic' || mime === 'image/heif') {
      try { source = await imageFromBlob(file); } catch (e) {
        await U.script('assets/vendor/heic2any/heic2any.min.js');
        var out;
        try { out = await window.heic2any({ blob: file, toType: 'image/png' }); } catch (err) {
          throw new Error('Could not decode this HEIC file' + (err && err.message ? ': ' + err.message : '. It may be damaged or not a HEIC image.'));
        }
        source = await imageFromBlob(Array.isArray(out) ? out[0] : out);
      }
    } else {
      try { source = await imageFromBlob(file); } catch (e) {
        if (mime === 'image/avif') throw new Error('This browser cannot decode AVIF. Use a current Chrome, Edge, Firefox or Safari.');
        throw new Error('Could not read “' + (file.name || 'image') + '” as an image.');
      }
    }
    var w = source.naturalWidth || source.width, h = source.naturalHeight || source.height;
    if (!w || !h) { w = w || 300; h = h || 150; }
    var c = makeCanvas(w, h);
    ctx2d(c).drawImage(source, 0, 0, w, h);
    return { canvas: c, width: c.width, height: c.height, mime: mime || file.type || 'image/png', file: file };
  }

  /* Minimal baseline TIFF reader: strips, 8/16-bit or 1-bit, RGB(A), grey,
     palette; no compression, PackBits, LZW or Deflate. */
  async function decodeTiff(buffer) {
    var dv = new DataView(buffer);
    var le = dv.getUint16(0) === 0x4949;
    var u16 = function (o) { return dv.getUint16(o, le); };
    var u32 = function (o) { return dv.getUint32(o, le); };
    if (u16(2) !== 42) throw new Error('Not a TIFF file (BigTIFF is not supported).');
    var ifd = u32(4), count = u16(ifd), tags = {};
    var sizes = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };
    for (var i = 0; i < count; i++) {
      var e = ifd + 2 + i * 12, tag = u16(e), type = u16(e + 2), n = u32(e + 4), sz = sizes[type] || 1;
      var off = sz * n <= 4 ? e + 8 : u32(e + 8), vals = [];
      for (var k = 0; k < n && k < 1 << 20; k++) {
        var p = off + k * sz;
        vals.push(type === 3 ? u16(p) : type === 4 ? u32(p) : type === 5 ? u32(p) / (u32(p + 4) || 1) : dv.getUint8(p));
      }
      tags[tag] = vals;
    }
    var width = tags[256][0], height = tags[257][0];
    var bps = (tags[258] || [1])[0], comp = (tags[259] || [1])[0], photo = (tags[262] || [2])[0];
    var spp = (tags[277] || [1])[0], rps = (tags[278] || [height])[0], pred = (tags[317] || [1])[0];
    if (!tags[273]) throw new Error('Tiled TIFF files are not supported.');
    if ((tags[284] || [1])[0] !== 1) throw new Error('Planar TIFF files are not supported.');
    var offsets = tags[273], counts = tags[279] || [buffer.byteLength - offsets[0]];
    var chunks = [];
    for (var s = 0; s < offsets.length; s++) {
      var raw = new Uint8Array(buffer, offsets[s], Math.min(counts[s], buffer.byteLength - offsets[s]));
      if (comp === 1) chunks.push(raw);
      else if (comp === 32773) chunks.push(unpackBits(raw));
      else if (comp === 5) chunks.push(lzwDecode(raw));
      else if (comp === 8 || comp === 32946) chunks.push(new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer()));
      else throw new Error('This TIFF uses compression type ' + comp + ', which is not supported.');
    }
    var total = 0; chunks.forEach(function (c) { total += c.length; });
    var data = new Uint8Array(total), pos = 0;
    chunks.forEach(function (c) { data.set(c, pos); pos += c.length; });
    var bytesPer = bps / 8, rowLen = Math.ceil(width * spp * bps / 8);
    if (pred === 2 && bps === 8) {
      for (var y = 0; y < height; y++) for (var x = spp; x < width * spp; x++) data[y * rowLen + x] = (data[y * rowLen + x] + data[y * rowLen + x - spp]) & 255;
    }
    var c = makeCanvas(width, height), cx = ctx2d(c), img = cx.createImageData(width, height), o = img.data;
    var map = tags[320];
    var sample = function (idx) { return bps === 16 ? data[idx * 2 + (le ? 1 : 0)] : data[idx]; };
    for (var yy = 0; yy < height; yy++) {
      for (var xx = 0; xx < width; xx++) {
        var q = (yy * width + xx) * 4, r, g, b, a = 255;
        if (bps === 1) {
          var bit = (data[yy * rowLen + (xx >> 3)] >> (7 - (xx & 7))) & 1;
          r = g = b = (photo === 0 ? !bit : bit) ? 255 : 0;
        } else {
          var base = yy * (rowLen / bytesPer) + xx * spp;
          if (photo === 2) { r = sample(base); g = sample(base + 1); b = sample(base + 2); if (spp > 3) a = sample(base + 3); }
          else if (photo === 3 && map) { var ix = data[base], third = map.length / 3; r = map[ix] >> 8; g = map[third + ix] >> 8; b = map[2 * third + ix] >> 8; }
          else { r = g = b = photo === 0 ? 255 - sample(base) : sample(base); if (spp > 1) a = sample(base + 1); }
        }
        o[q] = r; o[q + 1] = g; o[q + 2] = b; o[q + 3] = a;
      }
    }
    cx.putImageData(img, 0, 0);
    return c;
  }

  function unpackBits(src) {
    var out = [], i = 0;
    while (i < src.length) {
      var n = (src[i++] << 24) >> 24;
      if (n >= 0) { for (var k = 0; k <= n; k++) out.push(src[i++]); }
      else if (n !== -128) { var v = src[i++]; for (var j = 0; j <= -n; j++) out.push(v); }
    }
    return Uint8Array.from(out);
  }

  function lzwDecode(input) {
    var out = [], dict, codeLen, bitPos = 0, prev = null, total = input.length * 8;
    function reset() { dict = []; for (var i = 0; i < 256; i++) dict[i] = [i]; dict[256] = null; dict[257] = null; codeLen = 9; }
    function read() {
      var v = 0;
      for (var k = 0; k < codeLen; k++) { v = (v << 1) | ((input[bitPos >> 3] >> (7 - (bitPos & 7))) & 1); bitPos++; }
      return v;
    }
    reset();
    while (bitPos + codeLen <= total) {
      var code = read();
      if (code === 257) break;
      if (code === 256) { reset(); prev = null; continue; }
      var entry;
      if (code < dict.length && dict[code]) entry = dict[code];
      else if (prev) entry = prev.concat([prev[0]]);
      else break;
      for (var i = 0; i < entry.length; i++) out.push(entry[i]);
      if (prev) dict.push(prev.concat([entry[0]]));
      prev = entry;
      if (dict.length + 1 >= (1 << codeLen) && codeLen < 12) codeLen++;
    }
    return Uint8Array.from(out);
  }

  /* --- page scaffolding ---------------------------------------------------- */

  /* Drop zone that swaps itself for the tool's controls once an image loads. */
  function loader(opts) {
    var progress = U.note('');
    var picker = el('input', { type: 'file', accept: opts.accept || 'image/*', multiple: !!opts.multiple, style: { display: 'none' } });
    var zone = U.dropzone({
      accept: opts.accept || 'image/*', multiple: !!opts.multiple,
      label: opts.label || 'Drop image here', hint: opts.hint || 'or click to choose',
      onFiles: take
    });
    picker.addEventListener('change', function () { if (picker.files.length) take(Array.prototype.slice.call(picker.files)); picker.value = ''; });
    var change = U.button(opts.changeLabel || 'Change Image', function () { picker.click(); }, 'ghost');
    change.classList.add('g-hide');

    async function take(files) {
      if (!files.length) return;
      progress.className = 'note';
      progress.textContent = 'Reading ' + files[0].name + '…';
      try {
        var result = opts.raw ? files : await decodeFile(files[0]);
        progress.textContent = '';
        if (!opts.keepZone) zone.classList.add('g-hide');
        change.classList.remove('g-hide');
        await opts.onLoad(result);
        /* Once the drop zone is gone, don't leave an empty card behind. */
        var host = zone.parentElement;
        if (host && host.classList.contains('panel') && !opts.keepZone) {
          var rest = Array.prototype.some.call(host.children, function (c) {
            return c !== zone && c !== progress && c !== picker && !c.classList.contains('g-hide') && c.style.display !== 'none' &&
              !(c.classList.contains('btnrow') && !Array.prototype.some.call(c.children, function (b) { return !b.classList.contains('g-hide'); }));
          });
          if (!rest) host.classList.add('g-hide');
        }
      } catch (err) {
        if (zone.parentElement) zone.parentElement.classList.remove('g-hide');
        progress.className = 'note err';
        progress.textContent = err.message || String(err);
      }
    }

    return { zone: zone, picker: picker, change: change, status: progress, take: take,
             reset: function () { if (zone.parentElement) zone.parentElement.classList.remove('g-hide'); zone.classList.remove('g-hide'); change.classList.add('g-hide'); progress.textContent = ''; } };
  }

  /* A result panel: preview canvas, size line and download button. */
  function resultPanel(title, dlLabel) {
    var wrap = el('div', { class: 'g-prev g-check' });
    var info = el('div', { class: 'g-info g-res-info' });
    var current = null;
    var dl = U.button(dlLabel || 'Download', function () {
      if (!current) return U.toast('Nothing to download yet', 'err');
      U.saveBlob(current.name, current.blob);
    }, 'primary');
    var extra = el('span');
    var panel = U.panel(title || 'Result', wrap, info, U.btnrow(dl, extra));
    panel.classList.add('g-hide');
    panel.classList.add('g-result');
    return {
      node: panel, extra: extra, dl: dl,
      show: function (canvas, blob, name, text) {
        current = { blob: blob, name: name, canvas: canvas };
        canvas.classList.add('g-out');
        wrap.replaceChildren(canvas);
        info.textContent = text !== undefined ? text : (canvas.width + ' × ' + canvas.height + ' px · ' + kb(blob.size));
        panel.classList.remove('g-hide');
      },
      hide: function () { panel.classList.add('g-hide'); current = null; },
      get: function () { return current; }
    };
  }

  function preview(canvasOrImg, checker) {
    return el('div', { class: 'g-prev' + (checker ? ' g-check' : '') }, canvasOrImg);
  }

  /* The format an edited copy should be saved in, given the source. */
  function keepFormat(mime) { return mime === 'image/jpeg' || mime === 'image/webp' ? mime : 'image/png'; }

  async function encode(canvas, mime, quality) {
    var c = mime === 'image/jpeg' ? flatten(canvas, '#ffffff') : canvas;
    return toBlob(c, mime, quality);
  }

  /* --- Compress Image ------------------------------------------------------ */

  Tools.register({
    id: 'image-compress', category: 'image', name: 'Compress Image',
    description: 'Shrink an image file by lowering its quality and capping its width.',
    keywords: ['compress', 'optimize', 'reduce', 'smaller', 'jpg', 'png', 'webp', 'file size', 'kb'],
    render: function (root) {
      root$(root);
      var src = null;
      var quality = slider('Quality: {}', { min: 10, max: 100, value: 80 }, function (v) { return v + '%'; });
      var maxWidth = slider('Max Width: {}', { min: 400, max: 4096, step: 100, value: 1900 }, function (v) { return v + 'px'; });
      var widthValue = 1920;
      maxWidth.input.addEventListener('input', function () { widthValue = parseInt(maxWidth.input.value, 10); maxWidth.paint(); });
      maxWidth.paint = (function (orig) { return function () { orig(); maxWidth.querySelector('.g-lt').textContent = 'Max Width: ' + widthValue + 'px'; }; })(maxWidth.paint);
      maxWidth.paint();
      var format = U.select({ label: 'Output format', value: 'auto', options: [
        { value: 'auto', label: 'Auto (JPEG, or WebP when the image has transparency)' },
        { value: 'image/jpeg', label: 'JPEG' }, { value: 'image/webp', label: 'WebP' }, { value: 'image/png', label: 'PNG (lossless)' }] });

      var origPrev = el('div', { class: 'g-prev g-check' });
      var origInfo = el('div', { class: 'g-bigstat' });
      var outPrev = el('div', { class: 'g-prev g-check' });
      var outInfo = el('div', { class: 'g-bigstat g-res-info' });
      var result = null;
      var dl = U.button('Download', function () { if (result) U.saveBlob(result.name, result.blob); }, 'primary');
      var outBox = el('div', { class: 'g-hide' }, el('h4', { text: 'Compressed' }), outPrev, outInfo, U.btnrow(dl));

      var ld = loader({ label: 'Drop image here', hint: 'Supports JPG, PNG, WebP, GIF', onLoad: function (r) {
        src = r;
        result = null;
        outBox.classList.add('g-hide');
        origPrev.replaceChildren(cloneCanvas(r.canvas));
        origInfo.replaceChildren(el('b', { text: kb(r.file.size) }), el('span', { class: 'g-muted', text: r.width + ' × ' + r.height + ' px · ' + fmtName(r.mime) }));
        settings.classList.remove('g-hide');
      } });

      async function compress() {
        if (!src) return;
        var w = src.width, h = src.height, cap = widthValue;
        if (w > cap) { h = Math.round(h * cap / w); w = cap; }
        var c = makeCanvas(w, h), x = ctx2d(c);
        x.imageSmoothingQuality = 'high';
        x.drawImage(src.canvas, 0, 0, w, h);
        var mime = inputOf(format).value;
        if (mime === 'auto') mime = src.mime === 'image/webp' || hasAlpha(src.canvas) ? 'image/webp' : 'image/jpeg';
        var blob = await encode(c, mime, quality.get() / 100);
        var pct = (blob.size - src.file.size) / src.file.size * 100;
        result = { blob: blob, name: baseName(src.file.name) + '-compressed.' + extFor(mime) };
        c.classList.add('g-out');
        outPrev.replaceChildren(c);
        outInfo.replaceChildren(el('b', { text: kb(blob.size) }),
          el('span', { class: pct <= 0 ? 'g-good' : 'g-bad', text: (pct > 0 ? '+' : '') + pct.toFixed(1) + '%' }),
          el('span', { class: 'g-muted', text: w + ' × ' + h + ' px · ' + fmtName(mime) }));
        outBox.classList.remove('g-hide');
      }

      var settings = el('div', { class: 'g-hide' },
        U.panel(null, el('div', { class: 'row' }, quality, maxWidth), format,
          U.btnrow(U.button('Compress Image', function () { compress().catch(function (e) { U.toast(e.message, 'err'); }); }, 'primary'), ld.change)),
        U.panel(null, el('div', { class: 'g-grid2' }, el('div', {}, el('h4', { text: 'Original' }), origPrev, origInfo), outBox)));
      root.append(U.panel(null, ld.zone, ld.status, ld.picker), settings);
    }
  });

  /* --- Resize Image -------------------------------------------------------- */

  Tools.register({
    id: 'image-resize', category: 'image', name: 'Resize Image',
    description: 'Scale an image to an exact width and height, optionally keeping its proportions.',
    keywords: ['resize', 'scale', 'dimensions', 'width', 'height', 'shrink', 'enlarge', 'pixels'],
    render: function (root) {
      root$(root);
      var src = null;
      var orig = el('div', { class: 'g-info' });
      var lock = U.checkbox('Keep aspect ratio', { checked: true });
      var w = U.input({ label: 'Width (px)', type: 'number', min: 1, value: '' });
      var h = U.input({ label: 'Height (px)', type: 'number', min: 1, value: '' });
      var wi = inputOf(w), hi = inputOf(h);
      var out = resultPanel('Result');

      wi.addEventListener('input', function () {
        if (src && lock.input.checked && wi.value) hi.value = Math.max(1, Math.round(wi.value * src.height / src.width));
      });
      hi.addEventListener('input', function () {
        if (src && lock.input.checked && hi.value) wi.value = Math.max(1, Math.round(hi.value * src.width / src.height));
      });

      async function run() {
        if (!src) return;
        var W = Math.round(num(wi, 0)), H = Math.round(num(hi, 0));
        if (!(W >= 1 && H >= 1)) return U.toast('Enter a width and height of at least 1 px', 'err');
        if (W * H > 16384 * 16384 || W > 32767 || H > 32767) return U.toast('That is larger than a browser canvas can hold', 'err');
        var c = makeCanvas(W, H), x = ctx2d(c);
        x.imageSmoothingQuality = 'high';
        x.drawImage(src.canvas, 0, 0, W, H);
        var mime = keepFormat(src.mime);
        var blob = await encode(c, mime, 0.92);
        out.show(c, blob, baseName(src.file.name) + '-' + W + 'x' + H + '.' + extFor(mime));
      }

      var ld = loader({ label: 'Drop image here or', hint: 'Choose Image', changeLabel: 'Choose Image', onLoad: function (r) {
        src = r;
        orig.textContent = 'Original: ' + r.width + ' × ' + r.height + 'px';
        wi.value = r.width; hi.value = r.height;
        settings.classList.remove('g-hide');
        out.hide();
      } });
      var settings = U.panel(null, orig, lock, el('div', { class: 'row' }, w, h),
        U.btnrow(U.button('Resize Image', function () { run().catch(function (e) { U.toast(e.message, 'err'); }); }, 'primary')));
      settings.classList.add('g-hide');
      root.append(U.panel(null, ld.zone, ld.status, ld.picker, U.btnrow(ld.change)), settings, out.node);
    }
  });

  /* --- Convert Image ------------------------------------------------------- */

  /* AVIF is offered only where this browser's canvas can write it. */
  var CONVERT_TARGETS = [{ value: 'image/jpeg', label: 'JPEG' }, { value: 'image/png', label: 'PNG' },
    { value: 'image/webp', label: 'WebP' }, { value: 'image/avif', label: 'AVIF' }];

  /* A browser that can't write a format quietly hands back a PNG instead,
     so the only honest test is to encode a tiny canvas and look at the type. */
  var encodable = {};
  function canEncode(mime) {
    if (!encodable[mime]) {
      encodable[mime] = new Promise(function (resolve) {
        try { makeCanvas(2, 2).toBlob(function (b) { resolve(!!b && b.type === mime); }, mime, 0.8); }
        catch (e) { resolve(false); }
      });
    }
    return encodable[mime];
  }

  /* The format of a file from its first bytes, falling back to its name. */
  async function sniffFile(file) {
    var mime = sniff(new Uint8Array(await U.readAs(file.slice(0, 1024), 'buffer'))) || file.type || '';
    if (/\.(heic|heif)$/i.test(file.name || '') && !/^image\/(png|jpeg|webp|gif|avif)$/.test(mime)) mime = 'image/heic';
    return mime;
  }

  /* photo.jpg, then photo (2).jpg… so a batch never overwrites itself. */
  function uniqueName(name, used) {
    var base = baseName(name), ext = name.slice(base.length), n = 1, out = name;
    while (used[out.toLowerCase()]) { n++; out = base + ' (' + n + ')' + ext; }
    used[out.toLowerCase()] = true;
    return out;
  }

  function pctChange(from, to) {
    var pct = (to - from) / from * 100;
    return el('span', { class: pct <= 0 ? 'g-good' : 'g-bad', text: (pct > 0 ? '+' : '') + pct.toFixed(1) + '%' });
  }

  Tools.register({
    id: 'image-convert', category: 'image', name: 'Convert Image',
    description: 'Convert photos between JPEG, PNG and WebP (and AVIF where the browser can), reading HEIC, AVIF, GIF, BMP and TIFF too, one at a time or a batch into a ZIP.',
    keywords: ['convert', 'converter', 'format', 'jpg', 'jpeg', 'png', 'webp', 'avif', 'heic', 'heif', 'gif', 'bmp', 'tiff',
      'iphone', 'apple photo', 'heic to jpg', 'heic to png', 'webp to png', 'png to webp', 'webp to jpg', 'jpg to webp',
      'avif to jpg', 'avif to png', 'batch', 'bulk', 'zip', 'change format', 'save as'],
    render: function (root) {
      root$(root);
      var items = [], busy = false;
      var quality = slider('Quality: {}', { min: 10, max: 100, value: 90 }, function (v) { return v + '%'; });
      var bg = colorField('Background for transparent areas', '#ffffff');
      var target = choice(CONVERT_TARGETS, 'image/jpeg', paintOptions);
      var avifChip = target.children[3];
      avifChip.classList.add('g-hide');
      canEncode('image/avif').then(function (ok) { if (ok) avifChip.classList.remove('g-hide'); });
      function paintOptions() {
        quality.classList.toggle('g-hide', target.value === 'image/png');
        bg.classList.toggle('g-hide', target.value !== 'image/jpeg');
      }
      paintOptions();

      var status = U.note('');
      var prog = U.progress();
      var picker = el('input', { type: 'file', accept: 'image/*,.heic,.heif,.avif,.tif,.tiff', multiple: true, style: { display: 'none' } });
      var zone = U.dropzone({ accept: 'image/*,.heic,.heif,.avif,.tif,.tiff', multiple: true, label: 'Drop images to convert',
        hint: 'HEIC, AVIF, WebP, PNG, JPEG, GIF, BMP or TIFF · several at once is fine', onFiles: add });
      picker.addEventListener('change', function () { var f = Array.prototype.slice.call(picker.files); picker.value = ''; add(f); });
      var convertBtn = U.button('Convert', function () { convertAll().catch(function (e) { prog.fail(e); busy = false; }); }, 'primary');
      var moreBtn = U.button('Add images', function () { picker.click(); }, 'ghost');
      var clearBtn = U.button('Clear', reset, 'ghost');

      /* One image: before/after previews. */
      var origPrev = el('div', { class: 'g-prev g-check' });
      var origHead = el('h4');
      var origInfo = el('div', { class: 'g-bigstat' });
      var outPrev = el('div', { class: 'g-prev g-check' });
      var outHead = el('h4');
      var outInfo = el('div', { class: 'g-bigstat g-res-info' });
      var dl = U.button('Download', function () { var r = items[0] && items[0].result; if (r) U.saveBlob(r.name, r.blob); }, 'primary');
      var outBox = el('div', { class: 'g-hide' }, outHead, outPrev, outInfo, U.btnrow(dl));
      var single = el('div', { class: 'g-grid2' }, el('div', {}, origHead, origPrev, origInfo), outBox);

      /* Several images: a table, one row per file, plus a ZIP of the lot. */
      var tbody = el('tbody');
      var summary = el('div', { class: 'g-bigstat g-res-info' });
      var zipBtn = U.button('Download all (ZIP)', function () { zipAll().catch(function (e) { prog.fail(e); }); }, 'primary');
      var batchDone = el('div', { class: 'g-hide' }, summary, U.btnrow(zipBtn));
      var batch = el('div', {}, el('div', { class: 'scroll' }, el('table', { class: 'data' },
        el('thead', el('tr', ['File', 'Type', 'Size', 'Result', 'Change', ''].map(function (h) { return el('th', { text: h }); }))), tbody)), batchDone);

      var settings = U.panel(null, U.field('Convert to', target), el('div', { class: 'row' }, quality, bg),
        U.btnrow(convertBtn, moreBtn, clearBtn), prog,
        U.note('Converted on this device. Camera details and location (EXIF) are not copied into the new files, and an animated GIF keeps only its first frame.'));
      var results = U.panel(null, single, batch);
      settings.classList.add('g-hide');
      results.classList.add('g-hide');

      async function add(files) {
        if (busy || !files.length) return;
        status.className = 'note'; status.textContent = 'Reading ' + files.length + (files.length === 1 ? ' file' : ' files') + '…';
        for (var i = 0; i < files.length; i++) items.push({ file: files[i], mime: await sniffFile(files[i]), result: null, error: null });
        status.textContent = '';
        zone.classList.add('g-hide');
        settings.classList.remove('g-hide');
        results.classList.remove('g-hide');
        items.forEach(function (it) { it.result = null; it.error = null; });
        prog.set('');
        await paint();
      }

      function reset() {
        if (busy) return;
        items = [];
        zone.classList.remove('g-hide');
        settings.classList.add('g-hide');
        results.classList.add('g-hide');
        status.textContent = '';
        prog.set('');
      }

      async function paint() {
        var one = items.length === 1;
        single.classList.toggle('g-hide', !one);
        batch.classList.toggle('g-hide', one);
        convertBtn.textContent = one ? 'Convert' : 'Convert ' + items.length + ' images';
        if (one) {
          var it = items[0];
          outBox.classList.add('g-hide');
          origHead.textContent = 'Original (' + fmtName(it.mime) + ')';
          origPrev.replaceChildren(el('span', { class: 'g-muted', text: it.mime === 'image/heic' ? 'Decoding HEIC…' : 'Reading…' }));
          origInfo.replaceChildren(el('b', { text: kb(it.file.size) }));
          try {
            it.decoded = it.decoded || await decodeFile(it.file);
            origPrev.replaceChildren(cloneCanvas(it.decoded.canvas));
            origInfo.replaceChildren(el('b', { text: kb(it.file.size) }), el('span', { class: 'g-muted', text: it.decoded.width + ' × ' + it.decoded.height + ' px' }));
          } catch (e) {
            origPrev.replaceChildren(el('span', { class: 'g-muted', text: 'Could not read this file.' }));
            status.className = 'note err'; status.textContent = e.message || String(e);
          }
        } else {
          tbody.replaceChildren.apply(tbody, items.map(row));
          batchDone.classList.add('g-hide');
        }
      }

      function row(it) {
        var remove = el('button', { class: 'btn ghost', type: 'button', text: 'Remove', onclick: function () {
          if (busy) return;
          items.splice(items.indexOf(it), 1);
          if (!items.length) reset(); else paint();
        } });
        var get = el('button', { class: 'btn', type: 'button', text: 'Download', onclick: function () { if (it.result) U.saveBlob(it.result.name, it.result.blob); } });
        var res = it.error ? el('span', { class: 'g-bad', text: it.error })
          : it.result ? el('span', { text: kb(it.result.blob.size) + ' · ' + it.result.w + ' × ' + it.result.h }) : el('span', { class: 'g-muted', text: '—' });
        it.row = el('tr', {},
          el('td', { class: 'mono', text: it.file.name }), el('td', { text: fmtName(it.mime) }), el('td', { class: 'mono', text: kb(it.file.size) }),
          el('td', {}, res), el('td', {}, it.result ? pctChange(it.file.size, it.result.blob.size) : ''),
          el('td', {}, it.result ? get : remove));
        return it.row;
      }

      async function convertAll() {
        if (busy || !items.length) return;
        var mime = target.value, q = quality.get() / 100, used = {}, fill = bg.get();
        if (!(await canEncode(mime))) throw new Error('This browser cannot write ' + fmtName(mime) + '. Pick another format.');
        busy = true; convertBtn.disabled = true;
        status.textContent = '';
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          prog.set('Converting ' + (items.length > 1 ? (i + 1) + ' of ' + items.length + ': ' : '') + it.file.name +
            (it.mime === 'image/heic' && !it.decoded ? ' (HEIC takes a few seconds)' : '') + '…', items.length > 1 ? i / items.length : null);
          try {
            var d = it.decoded || await decodeFile(it.file);
            var src = mime === 'image/jpeg' ? flatten(d.canvas, fill) : d.canvas;
            var blob = await toBlob(src, mime, mime === 'image/png' ? undefined : q);
            if (blob.type !== mime) throw new Error('This browser cannot write ' + fmtName(mime) + '.');
            it.result = { blob: blob, name: uniqueName(baseName(it.file.name) + '.' + extFor(mime), used), w: d.width, h: d.height, canvas: items.length === 1 ? src : null };
            it.error = null;
          } catch (e) {
            it.result = null;
            it.error = e.message || String(e);
          }
          if (items.length > 1 && it.row) it.row.replaceWith(row(it));
          await new Promise(function (r) { setTimeout(r, 0); });
        }
        busy = false; convertBtn.disabled = false;
        var ok = items.filter(function (x) { return x.result; });
        if (items.length === 1) {
          var one = items[0];
          if (one.error) { prog.fail(new Error(one.error)); return; }
          prog.set('');
          var c = cloneCanvas(one.result.canvas);
          c.classList.add('g-out');
          outPrev.replaceChildren(c);
          outHead.textContent = 'Converted (' + fmtName(mime) + ')';
          outInfo.replaceChildren(el('b', { text: kb(one.result.blob.size) }), pctChange(one.file.size, one.result.blob.size),
            el('span', { class: 'g-muted', text: one.result.w + ' × ' + one.result.h + ' px' }));
          dl.textContent = 'Download ' + fmtName(mime);
          outBox.classList.remove('g-hide');
          return;
        }
        var before = 0, after = 0;
        ok.forEach(function (x) { before += x.file.size; after += x.result.blob.size; });
        prog.done('Converted ' + ok.length + ' of ' + items.length + ' images to ' + fmtName(mime) + '.');
        summary.replaceChildren(el('b', { text: ok.length + ' × ' + fmtName(mime) }), el('span', { text: kb(before) + ' → ' + kb(after) }),
          ok.length ? pctChange(before, after) : '');
        zipBtn.disabled = !ok.length;
        batchDone.classList.remove('g-hide');
      }

      async function zipAll() {
        var ok = items.filter(function (x) { return x.result; });
        if (!ok.length) return;
        prog.set('Building the ZIP…');
        await U.script('assets/vendor/jszip/jszip.min.js');
        var zip = new window.JSZip();
        /* Images are compressed already; storing them keeps zipping instant. */
        ok.forEach(function (x) { zip.file(x.result.name, x.result.blob, { compression: 'STORE' }); });
        U.saveBlob('converted-' + extFor(ok[0].result.blob.type) + '.zip', await zip.generateAsync({ type: 'blob' }));
        prog.done('ZIP ready: ' + ok.length + ' images.');
      }

      root.append(U.panel(null, zone, status, picker), settings, results);
    }
  });

  /* --- Crop Image ---------------------------------------------------------- */

  var CROP_PRESETS = [
    { value: 'free', label: 'Free', r: 0 }, { value: '1:1', label: 'Square 1:1', r: 1 }, { value: '4:3', label: '4:3', r: 4 / 3 },
    { value: '16:9', label: '16:9', r: 16 / 9 }, { value: '3:4', label: '3:4 Portrait', r: 3 / 4 },
    { value: 'ig', label: 'Instagram 1:1', r: 1 }, { value: 'tw', label: 'Twitter Header', r: 3 },
    { value: 'fb', label: 'Facebook Cover', r: 820 / 312 }
  ];

  Tools.register({
    id: 'image-crop', category: 'image', name: 'Crop Image',
    description: 'Cut an image down to a rectangle, freely or at a preset aspect ratio.',
    keywords: ['crop', 'trim', 'cut', 'aspect ratio', 'square', 'instagram', 'twitter header', 'facebook cover'],
    render: function (root) {
      root$(root);
      var src = null;
      var preset = U.select({ label: 'Aspect Ratio Preset', options: CROP_PRESETS.map(function (p) { return { value: p.value, label: p.label }; }) });
      var fx = U.input({ label: 'X offset', type: 'number', min: 0, value: 0 });
      var fy = U.input({ label: 'Y offset', type: 'number', min: 0, value: 0 });
      var fw = U.input({ label: 'Width', type: 'number', min: 0, value: 0 });
      var fh = U.input({ label: 'Height', type: 'number', min: 0, value: 0 });
      var X = inputOf(fx), Y = inputOf(fy), W = inputOf(fw), H = inputOf(fh), P = inputOf(preset);
      var info = el('div', { class: 'g-info' });
      var stageCanvas = makeCanvas(1, 1);
      var box = el('div', { class: 'g-cropbox' }, el('div', { class: 'g-h' }));
      var stage = el('div', { class: 'g-cropstage' }, stageCanvas, box);
      var out = resultPanel('Result');

      function ratio() { return CROP_PRESETS.filter(function (p) { return p.value === P.value; })[0].r; }
      function get() {
        return { x: Math.round(num(X, 0)), y: Math.round(num(Y, 0)), w: Math.round(num(W, 0)), h: Math.round(num(H, 0)) };
      }
      function set(r) {
        r.x = clamp(Math.round(r.x), 0, src.width - 1); r.y = clamp(Math.round(r.y), 0, src.height - 1);
        r.w = clamp(Math.round(r.w), 1, src.width - r.x); r.h = clamp(Math.round(r.h), 1, src.height - r.y);
        X.value = r.x; Y.value = r.y; W.value = r.w; H.value = r.h;
        paint();
      }
      function paint() {
        if (!src) return;
        var r = get();
        info.textContent = 'Image: ' + src.width + '×' + src.height + 'px · Crop: ' + r.w + '×' + r.h + 'px from (' + r.x + ',' + r.y + ')';
        box.style.left = (r.x / src.width * 100) + '%';
        box.style.top = (r.y / src.height * 100) + '%';
        box.style.width = (r.w / src.width * 100) + '%';
        box.style.height = (r.h / src.height * 100) + '%';
      }
      function applyPreset() {
        if (!src) return;
        var k = ratio();
        if (!k) return paint();
        var w = src.width, h = Math.round(w / k);
        if (h > src.height) { h = src.height; w = Math.round(h * k); }
        set({ x: 0, y: 0, w: w, h: h });
      }
      P.addEventListener('change', applyPreset);
      [X, Y].forEach(function (n) { n.addEventListener('input', function () { if (src) set(get()); }); });
      W.addEventListener('input', function () {
        if (!src) return;
        var k = ratio(), r = get();
        if (k) r.h = Math.round(r.w / k);
        set(r);
      });
      H.addEventListener('input', function () {
        if (!src) return;
        var k = ratio(), r = get();
        if (k) r.w = Math.round(r.h * k);
        set(r);
      });

      /* Drag the box to move it, drag its corner to resize, drag elsewhere to draw. */
      var drag = null;
      function pt(e) {
        var b = stageCanvas.getBoundingClientRect();
        return { x: (e.clientX - b.left) * src.width / b.width, y: (e.clientY - b.top) * src.height / b.height };
      }
      stage.addEventListener('pointerdown', function (e) {
        if (!src) return;
        e.preventDefault();
        stage.setPointerCapture(e.pointerId);
        var p = pt(e), r = get();
        var mode = e.target.classList.contains('g-h') ? 'size' : e.target === box ? 'move' : 'draw';
        drag = { mode: mode, start: p, r0: r };
      });
      stage.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var p = pt(e), d = drag, k = ratio(), r;
        if (d.mode === 'move') r = { x: clamp(d.r0.x + p.x - d.start.x, 0, src.width - d.r0.w), y: clamp(d.r0.y + p.y - d.start.y, 0, src.height - d.r0.h), w: d.r0.w, h: d.r0.h };
        else if (d.mode === 'size') { r = { x: d.r0.x, y: d.r0.y, w: Math.max(1, p.x - d.r0.x), h: Math.max(1, p.y - d.r0.y) }; if (k) r.h = r.w / k; }
        else {
          r = { x: Math.min(d.start.x, p.x), y: Math.min(d.start.y, p.y), w: Math.abs(p.x - d.start.x), h: Math.abs(p.y - d.start.y) };
          if (k) { r.h = r.w / k; if (p.y < d.start.y) r.y = d.start.y - r.h; }
        }
        if (k && r.y + r.h > src.height) { r.h = src.height - r.y; r.w = r.h * k; }
        if (k && r.x + r.w > src.width) { r.w = src.width - r.x; r.h = r.w / k; }
        set(r);
      });
      stage.addEventListener('pointerup', function () { drag = null; });

      async function crop() {
        if (!src) return;
        var r = get();
        r.x = clamp(r.x, 0, src.width - 1); r.y = clamp(r.y, 0, src.height - 1);
        r.w = clamp(r.w, 1, src.width - r.x); r.h = clamp(r.h, 1, src.height - r.y);
        var c = makeCanvas(r.w, r.h);
        ctx2d(c).drawImage(src.canvas, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
        var mime = keepFormat(src.mime);
        out.show(c, await encode(c, mime, 0.92), baseName(src.file.name) + '-cropped.' + extFor(mime));
      }

      var ld = loader({ label: 'Drop image here or click to upload', hint: 'JPG, PNG, WebP, GIF…', onLoad: function (r) {
        src = r;
        stageCanvas.width = r.width; stageCanvas.height = r.height;
        ctx2d(stageCanvas).drawImage(r.canvas, 0, 0);
        [X, W].forEach(function (n) { n.max = r.width; });
        [Y, H].forEach(function (n) { n.max = r.height; });
        P.value = 'free';
        set({ x: 0, y: 0, w: Math.round(r.width / 2), h: Math.round(r.height / 2) });
        settings.classList.remove('g-hide');
        out.hide();
      } });
      var settings = U.panel(null, preset, el('div', { class: 'row' }, fx, fy, fw, fh), el('div', { class: 'g-prev' }, stage), info,
        U.btnrow(U.button('Crop Image', function () { crop().catch(function (e) { U.toast(e.message, 'err'); }); }, 'primary'), ld.change));
      settings.classList.add('g-hide');
      root.append(U.panel(null, ld.zone, ld.status, ld.picker), settings, out.node);
    }
  });

  /* --- Rotate & Flip ------------------------------------------------------- */

  function rotateCanvas(srcCanvas, degrees, flipH, flipV) {
    var rad = degrees * Math.PI / 180;
    var sin = Math.abs(Math.sin(rad)), cos = Math.abs(Math.cos(rad));
    if (Math.abs(degrees % 90) < 1e-9) { sin = Math.round(sin); cos = Math.round(cos); }
    var w = srcCanvas.width, h = srcCanvas.height;
    var c = makeCanvas(w * cos + h * sin, w * sin + h * cos), x = ctx2d(c);
    x.translate(c.width / 2, c.height / 2);
    x.rotate(rad);
    x.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    x.drawImage(srcCanvas, -w / 2, -h / 2);
    return c;
  }

  Tools.register({
    id: 'image-rotate', category: 'image', name: 'Rotate & Flip',
    description: 'Rotate an image by any angle and mirror it horizontally or vertically.',
    keywords: ['rotate', 'flip', 'mirror', 'turn', 'angle', 'orientation', '90', '180'],
    render: function (root) {
      root$(root);
      var src = null;
      var angle = U.input({ label: 'Angle (degrees)', type: 'number', value: 90, step: 1 });
      var A = inputOf(angle);
      var quick = el('div', { class: 'chips' }, [90, 180, 270, 45, -90].map(function (d) {
        return el('button', { class: 'chip', type: 'button', text: d + '°', onclick: function () { A.value = d; } });
      }));
      var fh = U.checkbox('Flip Horizontal'), fv = U.checkbox('Flip Vertical');
      var out = resultPanel('Result');

      async function apply() {
        if (!src) return;
        var deg = num(A, 0);
        if (!isFinite(deg)) deg = 0;
        var c = rotateCanvas(src.canvas, deg % 360, fh.input.checked, fv.input.checked);
        var mime = deg % 90 === 0 ? keepFormat(src.mime) : 'image/png';
        out.show(c, await encode(c, mime, 0.92), baseName(src.file.name) + '-rotated.' + extFor(mime));
      }

      var ld = loader({ label: 'Drop image here', hint: 'Choose Image', changeLabel: 'Choose Image', onLoad: function (r) {
        src = r; settings.classList.remove('g-hide'); out.hide();
      } });
      var settings = U.panel(null, angle, quick, el('div', { class: 'row' }, fh, fv),
        U.btnrow(U.button('Apply Rotation/Flip', function () { apply().catch(function (e) { U.toast(e.message, 'err'); }); }, 'primary')));
      settings.classList.add('g-hide');
      root.append(U.panel(null, ld.zone, ld.status, ld.picker, U.btnrow(ld.change)), settings, out.node);
    }
  });

  /* --- Image to Grayscale -------------------------------------------------- */

  var GRAY = {
    luminosity: function (r, g, b) { return 0.299 * r + 0.587 * g + 0.114 * b; },
    average: function (r, g, b) { return (r + g + b) / 3; },
    lightness: function (r, g, b) { return (Math.max(r, g, b) + Math.min(r, g, b)) / 2; },
    red: function (r) { return r; }
  };

  function grayscale(canvas, method) {
    var c = cloneCanvas(canvas), x = ctx2d(c), img = x.getImageData(0, 0, c.width, c.height), d = img.data, f = GRAY[method];
    for (var i = 0; i < d.length; i += 4) { var v = Math.round(f(d[i], d[i + 1], d[i + 2])); d[i] = d[i + 1] = d[i + 2] = v; }
    x.putImageData(img, 0, 0);
    return c;
  }

  Tools.register({
    id: 'image-grayscale', category: 'image', name: 'Image to Greyscale',
    description: 'Turn a colour image black and white using one of four conversion methods.',
    keywords: ['grayscale', 'greyscale', 'black and white', 'monochrome', 'desaturate', 'b&w'],
    render: function (root) {
      root$(root);
      var src = null;
      var method = U.select({ label: 'Grayscale Method', options: [
        { value: 'luminosity', label: 'Luminosity (Rec.601)' }, { value: 'average', label: 'Average' },
        { value: 'lightness', label: 'Lightness' }, { value: 'red', label: 'Red Channel' }] });
      var out = resultPanel('Result');
      async function run() {
        if (!src) return;
        var c = grayscale(src.canvas, inputOf(method).value), mime = keepFormat(src.mime);
        out.show(c, await encode(c, mime, 0.92), baseName(src.file.name) + '-grayscale.' + extFor(mime));
      }
      var ld = loader({ label: 'Drop image here', hint: 'Choose Image', changeLabel: 'Choose Image', onLoad: function (r) {
        src = r; settings.classList.remove('g-hide'); out.hide();
      } });
      var settings = U.panel(null, method, U.btnrow(U.button('Convert to Grayscale', function () { run().catch(function (e) { U.toast(e.message, 'err'); }); }, 'primary')));
      settings.classList.add('g-hide');
      root.append(U.panel(null, ld.zone, ld.status, ld.picker, U.btnrow(ld.change)), settings, out.node);
    }
  });

  /* --- Adjust Brightness --------------------------------------------------- */

  /* Same maths as the CSS brightness(), contrast() and saturate() filters. */
  function adjustBCS(canvas, bright, contrast, sat) {
    var c = cloneCanvas(canvas), x = ctx2d(c), img = x.getImageData(0, 0, c.width, c.height), d = img.data;
    var s = sat;
    var m = [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
             0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
             0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s];
    var off = (0.5 - 0.5 * contrast) * 255;
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i] * bright, g = d[i + 1] * bright, b = d[i + 2] * bright;
      r = r * contrast + off; g = g * contrast + off; b = b * contrast + off;
      r = clamp(r, 0, 255); g = clamp(g, 0, 255); b = clamp(b, 0, 255);
      d[i] = clamp(m[0] * r + m[1] * g + m[2] * b, 0, 255);
      d[i + 1] = clamp(m[3] * r + m[4] * g + m[5] * b, 0, 255);
      d[i + 2] = clamp(m[6] * r + m[7] * g + m[8] * b, 0, 255);
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  Tools.register({
    id: 'image-brightness', category: 'image', name: 'Adjust Brightness',
    description: 'Tune an image’s brightness, contrast and saturation with a live preview.',
    keywords: ['brightness', 'contrast', 'saturation', 'adjust', 'lighten', 'darken', 'exposure'],
    render: function (root) {
      root$(root);
      var src = null;
      var pct = function (v) { return v + '%'; };
      var b = slider('Brightness', { min: 0, max: 200, value: 100 }, pct);
      var c = slider('Contrast', { min: 0, max: 200, value: 100 }, pct);
      var s = slider('Saturation', { min: 0, max: 200, value: 100 }, pct);
      var view = makeCanvas(1, 1);
      var out = resultPanel('Exported');
      function live() {
        view.style.filter = 'brightness(' + b.get() + '%) contrast(' + c.get() + '%) saturate(' + s.get() + '%)';
      }
      onChange([b.input, c.input, s.input], live);
      async function exportIt() {
        if (!src) return;
        var r = adjustBCS(src.canvas, b.get() / 100, c.get() / 100, s.get() / 100), mime = keepFormat(src.mime);
        out.show(r, await encode(r, mime, 0.92), baseName(src.file.name) + '-adjusted.' + extFor(mime));
        U.saveBlob(out.get().name, out.get().blob);
      }
      var ld = loader({ label: 'Drop image here', hint: 'Choose Image', changeLabel: 'Choose Image', onLoad: function (r) {
        src = r;
        view.width = r.width; view.height = r.height;
        ctx2d(view).drawImage(r.canvas, 0, 0);
        live();
        settings.classList.remove('g-hide');
        out.hide();
      } });
      var settings = U.panel(null, el('div', { class: 'row' }, b, c, s), preview(view, true),
        U.btnrow(U.button('Apply & Export', function () { exportIt().catch(function (e) { U.toast(e.message, 'err'); }); }, 'primary'),
          U.button('Reset', function () { b.set(100); c.set(100); s.set(100); live(); }, 'ghost')));
      settings.classList.add('g-hide');
      root.append(U.panel(null, ld.zone, ld.status, ld.picker, U.btnrow(ld.change)), settings, out.node);
    }
  });

  /* --- Blur Image ---------------------------------------------------------- */

  /* One horizontal + one vertical box-blur pass over RGBA (premultiplied so
     transparent edges don't bleed dark). Three passes approximate a Gaussian. */
  function boxBlur(d, w, h, rx, ry) {
    var tmp = new Float32Array(d.length), i, x, y, k;
    if (rx > 0) {
      for (y = 0; y < h; y++) {
        var row = y * w * 4;
        for (k = 0; k < 4; k++) {
          var acc = 0, n = 0;
          for (x = -rx; x <= rx; x++) { var xx = clamp(x, 0, w - 1); acc += d[row + xx * 4 + k]; n++; }
          for (x = 0; x < w; x++) {
            tmp[row + x * 4 + k] = acc / n;
            var add = clamp(x + rx + 1, 0, w - 1), sub = clamp(x - rx, 0, w - 1);
            acc += d[row + add * 4 + k] - d[row + sub * 4 + k];
          }
        }
      }
    } else tmp.set(d);
    if (ry > 0) {
      for (x = 0; x < w; x++) {
        for (k = 0; k < 4; k++) {
          var acc2 = 0, n2 = 0;
          for (y = -ry; y <= ry; y++) { var yy = clamp(y, 0, h - 1); acc2 += tmp[(yy * w + x) * 4 + k]; n2++; }
          for (y = 0; y < h; y++) {
            d[(y * w + x) * 4 + k] = acc2 / n2;
            var a2 = clamp(y + ry + 1, 0, h - 1), s2 = clamp(y - ry, 0, h - 1);
            acc2 += tmp[(a2 * w + x) * 4 + k] - tmp[(s2 * w + x) * 4 + k];
          }
        }
      }
    } else for (i = 0; i < d.length; i++) d[i] = tmp[i];
  }

  function blurCanvas(canvas, type, radius) {
    var w = canvas.width, h = canvas.height;
    var srcData = ctx2d(canvas).getImageData(0, 0, w, h);
    var s = srcData.data, d = new Float32Array(s.length), i;
    for (i = 0; i < s.length; i += 4) {
      var a = s[i + 3] / 255;
      d[i] = s[i] * a; d[i + 1] = s[i + 1] * a; d[i + 2] = s[i + 2] * a; d[i + 3] = s[i + 3];
    }
    if (type === 'motion') {
      for (var p = 0; p < 3; p++) boxBlur(d, w, h, Math.round(radius), 0);
    } else {
      var r = Math.max(1, Math.round(radius / 1.8));
      for (var q = 0; q < 3; q++) boxBlur(d, w, h, r, r);
    }
    var out = makeCanvas(w, h), x = ctx2d(out), img = x.createImageData(w, h), o = img.data;
    var cx = w / 2, cy = h / 2, maxD = Math.sqrt(cx * cx + cy * cy);
    for (var yy = 0; yy < h; yy++) {
      for (var xx = 0; xx < w; xx++) {
        i = (yy * w + xx) * 4;
        var al = d[i + 3], f = al > 0 ? 255 / al : 0;
        var R = d[i] * f, G = d[i + 1] * f, B = d[i + 2] * f;
        if (type === 'radial') {
          /* Sharp in the middle, fading to fully blurred at the corners. */
          var dist = Math.sqrt((xx - cx) * (xx - cx) + (yy - cy) * (yy - cy)) / maxD;
          var t = clamp((dist - 0.25) / 0.6, 0, 1);
          t = t * t * (3 - 2 * t);
          R = s[i] + (R - s[i]) * t; G = s[i + 1] + (G - s[i + 1]) * t; B = s[i + 2] + (B - s[i + 2]) * t; al = s[i + 3] + (al - s[i + 3]) * t;
        }
        o[i] = R; o[i + 1] = G; o[i + 2] = B; o[i + 3] = al;
      }
    }
    x.putImageData(img, 0, 0);
    return out;
  }

  Tools.register({
    id: 'image-blur', category: 'image', name: 'Blur Image',
    description: 'Apply a Gaussian, motion or radial (edge) blur to an image.',
    keywords: ['blur', 'gaussian', 'motion blur', 'radial', 'soften', 'defocus', 'tilt shift'],
    render: function (root) {
      root$(root);
      var src = null;
      var type = U.select({ label: 'Blur Type', options: [
        { value: 'gaussian', label: 'Gaussian (Standard)' }, { value: 'motion', label: 'Motion Blur' }, { value: 'radial', label: 'Radial (Edge blur)' }] });
      var radius = slider('Radius: {}', { min: 1, max: 40, value: 8 }, function (v) { return v + 'px'; });
      var out = resultPanel('Result');
      async function run() {
        if (!src) return;
        var c = blurCanvas(src.canvas, inputOf(type).value, radius.get()), mime = keepFormat(src.mime);
        out.show(c, await encode(c, mime, 0.92), baseName(src.file.name) + '-blurred.' + extFor(mime));
      }
      var ld = loader({ label: 'Drop image here or click to upload', hint: 'JPG, PNG, WebP, GIF…', onLoad: function (r) {
        src = r; settings.classList.remove('g-hide'); out.hide();
      } });
      var settings = U.panel(null, type, radius, U.btnrow(U.button('Apply Blur', function () { run().catch(function (e) { U.toast(e.message, 'err'); }); }, 'primary'), ld.change));
      settings.classList.add('g-hide');
      root.append(U.panel(null, ld.zone, ld.status, ld.picker), settings, out.node);
    }
  });

  /* --- Image Watermark ----------------------------------------------------- */

  function drawWatermark(canvas, o) {
    var c = cloneCanvas(canvas), x = ctx2d(c);
    x.globalAlpha = o.opacity;
    x.fillStyle = o.color;
    x.font = '600 ' + o.size + 'px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    x.shadowColor = 'rgba(0,0,0,0.35)';
    x.shadowBlur = Math.max(2, o.size / 12);
    var text = o.text, tw = x.measureText(text).width, pad = Math.max(10, o.size * 0.5);
    if (o.position === 'tile') {
      x.save();
      x.textAlign = 'center'; x.textBaseline = 'middle';
      var stepX = tw + o.size * 3, stepY = o.size * 4, diag = Math.sqrt(c.width * c.width + c.height * c.height);
      x.translate(c.width / 2, c.height / 2);
      x.rotate(-Math.PI / 6);
      for (var yy = -diag / 2, row = 0; yy <= diag / 2; yy += stepY, row++) {
        for (var xx = -diag / 2 + (row % 2) * stepX / 2; xx <= diag / 2; xx += stepX) x.fillText(text, xx, yy);
      }
      x.restore();
    } else {
      var pos = o.position;
      x.textBaseline = pos.indexOf('top') === 0 ? 'top' : pos === 'center' ? 'middle' : 'bottom';
      x.textAlign = pos === 'center' ? 'center' : pos.indexOf('left') > -1 ? 'left' : 'right';
      var px = pos === 'center' ? c.width / 2 : pos.indexOf('left') > -1 ? pad : c.width - pad;
      var py = pos === 'center' ? c.height / 2 : pos.indexOf('top') === 0 ? pad : c.height - pad;
      x.fillText(text, px, py);
    }
    return c;
  }

  Tools.register({
    id: 'image-watermark', category: 'image', name: 'Watermark Image',
    description: 'Stamp text on an image in a corner, the centre, or tiled across it.',
    keywords: ['watermark', 'copyright', 'text overlay', 'protect', 'stamp', 'logo', 'tile'],
    render: function (root) {
      root$(root);
      var src = null;
      var text = U.input({ label: 'Watermark Text', value: '© 2025 Your Name', placeholder: '© 2025 Your Name' });
      var position = U.select({ label: 'Position', value: 'bottom-right', options: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center', 'tile'] });
      var color = colorField('Color', '#ffffff');
      var size = slider('Font Size: {}', { min: 12, max: 120, value: 36 }, function (v) { return v + 'px'; });
      var opacity = slider('Opacity: {}', { min: 10, max: 100, value: 60 }, function (v) { return v + '%'; });
      var out = resultPanel('Result');
      async function run() {
        if (!src) return;
        var c = drawWatermark(src.canvas, { text: inputOf(text).value, position: inputOf(position).value, color: color.get(), size: size.get(), opacity: opacity.get() / 100 });
        var mime = keepFormat(src.mime);
        out.show(c, await encode(c, mime, 0.92), baseName(src.file.name) + '-watermarked.' + extFor(mime));
      }
      var ld = loader({ label: 'Drop image here or click to upload', hint: 'JPG, PNG, WebP, GIF…', onLoad: function (r) {
        src = r; settings.classList.remove('g-hide'); out.hide();
      } });
      var settings = U.panel(null, text, el('div', { class: 'row' }, position, color), el('div', { class: 'row' }, size, opacity),
        U.btnrow(U.button('Apply Watermark', function () { run().catch(function (e) { U.toast(e.message, 'err'); }); }, 'primary'), ld.change));
      settings.classList.add('g-hide');
      root.append(U.panel(null, ld.zone, ld.status, ld.picker), settings, out.node);
    }
  });

  /* --- Image to Base64 / Base64 to Image ---------------------------------- */

  function base64Tool(startTab) {
    return function (root) {
      root$(root);
      var tab = choice([{ value: 'enc', label: 'Image → Base64' }, { value: 'dec', label: 'Base64 → Image' }], startTab, show);
      tab.classList.add('g-tabs');

      /* Image → Base64 */
      var meta = el('div', { class: 'g-bigstat' });
      var thumb = el('div', { class: 'g-prev g-check' });
      var b64 = U.textarea({ label: 'Base64 String', readOnly: true, rows: 5, spellcheck: false });
      var dataUrl = U.textarea({ label: 'Data URL (for use in HTML/CSS)', readOnly: true, rows: 5, spellcheck: false });
      var B = inputOf(b64), D = inputOf(dataUrl);
      var encOut = el('div', { class: 'g-hide' }, meta, thumb, b64, dataUrl,
        U.btnrow(U.copyBtn('Copy Base64', function () { return B.value; }), U.copyBtn('Copy Data URL', function () { return D.value; }),
          U.copyBtn('Copy as CSS', function () { return D.value ? 'background-image: url("' + D.value + '");' : ''; }),
          U.copyBtn('Copy as <img>', function () { return D.value ? '<img src="' + D.value + '" alt="">' : ''; })));
      var encZone = U.dropzone({ accept: 'image/*', label: 'Drop image here or', hint: 'Choose Image', onFiles: function (files) {
        var file = files[0];
        U.readAs(file, 'dataURL').then(function (url) {
          var comma = url.indexOf(','), mime = file.type || url.slice(5, url.indexOf(';')) || 'application/octet-stream';
          if (url.slice(0, comma).indexOf('application/octet-stream') > -1 || !file.type) url = 'data:' + mime + url.slice(url.indexOf(';'));
          D.value = url;
          B.value = url.slice(url.indexOf(',') + 1);
          meta.replaceChildren(el('b', { text: mime }), el('span', { text: Math.round(B.value.length / 1000) + ' KB (approx)' }),
            el('span', { class: 'g-muted', text: 'from ' + kb(file.size) + ' file, +' + Math.round((B.value.length / file.size - 1) * 100) + '%' }));
          thumb.replaceChildren(el('img', { src: url, alt: file.name, style: { maxHeight: '200px' } }));
          encOut.classList.remove('g-hide');
        });
      } });
      var encPane = el('div', {}, encZone, encOut);

      /* Base64 → Image */
      var input = U.textarea({ label: 'Base64 or Data URL', placeholder: 'Paste base64 string or data URL...', rows: 7, spellcheck: false });
      var I = inputOf(input);
      var status = U.note('');
      var decPrev = el('div', { class: 'g-prev g-check g-hide' });
      var decInfo = el('div', { class: 'g-info g-res-info' });
      var decBlob = null, decMime = 'image/png';
      var decDl = U.button('Download Image', function () { if (decBlob) U.saveBlob('image.' + extFor(decMime), decBlob); }, 'primary');
      decDl.classList.add('g-hide');
      function decode() {
        var raw = I.value.trim();
        decBlob = null; decPrev.classList.add('g-hide'); decDl.classList.add('g-hide'); decInfo.textContent = '';
        status.className = 'note'; status.textContent = '';
        if (!raw) return;
        var mime = '', body = raw;
        var m = /^data:([^;,]*)(;[^,]*)?,/i.exec(raw);
        if (m) { mime = m[1]; body = raw.slice(m[0].length); if (!/base64/i.test(m[2] || '')) { body = btoa(unescape(decodeURIComponent(body))); } }
        body = body.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
        while (body.length % 4) body += '=';
        var bin;
        try { bin = atob(body); } catch (e) { status.className = 'note err'; status.textContent = 'That is not valid Base64.'; return; }
        if (!bin.length) { status.className = 'note err'; status.textContent = 'There is no data after the “base64,” prefix.'; return; }
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        mime = sniff(bytes) || mime || 'image/png';
        decMime = mime;
        decBlob = new Blob([bytes], { type: mime });
        imageFromBlob(decBlob).then(function (img) {
          decPrev.replaceChildren(el('img', { src: URL.createObjectURL(decBlob), alt: 'Decoded image' }));
          decPrev.classList.remove('g-hide');
          decDl.classList.remove('g-hide');
          decInfo.textContent = fmtName(mime) + ' · ' + img.naturalWidth + ' × ' + img.naturalHeight + ' px · ' + kb(bytes.length);
        }).catch(function () {
          status.className = 'note err';
          status.textContent = 'Decoded ' + kb(bytes.length) + ', but it is not an image this browser can show.';
        });
      }
      I.addEventListener('input', U.debounce(decode, 200));
      var decPane = el('div', {}, input, status, decPrev, decInfo,
        U.btnrow(decDl, U.button('Clear', function () { I.value = ''; decode(); }, 'ghost')));

      function show(v) { encPane.classList.toggle('g-hide', v !== 'enc'); decPane.classList.toggle('g-hide', v !== 'dec'); }
      show(startTab);
      root.append(U.panel(null, tab, encPane, decPane));
    };
  }

  Tools.register({
    id: 'image-to-base64', category: 'image', name: 'Image to Base64',
    description: 'Encode an image as a Base64 string or data URL, or decode one back.',
    keywords: ['base64', 'data url', 'data uri', 'encode', 'inline', 'embed', 'css'],
    render: base64Tool('enc')
  });


  /* --- Image Metadata (with EXIF) ------------------------------------------ */

  var EXIF_TAGS = {
    0x010F: 'Make', 0x0110: 'Model', 0x0112: 'Orientation', 0x011A: 'XResolution', 0x011B: 'YResolution', 0x0128: 'ResolutionUnit',
    0x0131: 'Software', 0x0132: 'DateTime', 0x013B: 'Artist', 0x8298: 'Copyright', 0x010E: 'ImageDescription',
    0x829A: 'ExposureTime', 0x829D: 'FNumber', 0x8822: 'ExposureProgram', 0x8827: 'ISO', 0x9000: 'ExifVersion',
    0x9003: 'DateTimeOriginal', 0x9004: 'DateTimeDigitized', 0x9201: 'ShutterSpeedValue', 0x9202: 'ApertureValue',
    0x9204: 'ExposureBias', 0x9205: 'MaxApertureValue', 0x9207: 'MeteringMode', 0x9209: 'Flash', 0x920A: 'FocalLength',
    0xA002: 'PixelXDimension', 0xA003: 'PixelYDimension', 0xA402: 'ExposureMode', 0xA403: 'WhiteBalance',
    0xA405: 'FocalLengthIn35mm', 0xA406: 'SceneCaptureType', 0xA433: 'LensMake', 0xA434: 'LensModel', 0xA001: 'ColorSpace',
    0x9010: 'OffsetTime', 0xA420: 'ImageUniqueID', 0xA431: 'BodySerialNumber'
  };
  var GPS_TAGS = { 1: 'GPSLatitudeRef', 2: 'GPSLatitude', 3: 'GPSLongitudeRef', 4: 'GPSLongitude', 5: 'GPSAltitudeRef', 6: 'GPSAltitude', 7: 'GPSTimeStamp', 29: 'GPSDateStamp' };

  /* Reads the TIFF-structured EXIF block. Returns { tag: value }. */
  function parseTiffExif(dv, start) {
    var le = dv.getUint16(start) === 0x4949, out = {};
    var u16 = function (o) { return dv.getUint16(start + o, le); }, u32 = function (o) { return dv.getUint32(start + o, le); };
    var s32 = function (o) { return dv.getInt32(start + o, le); };
    function readIfd(off, names) {
      if (off + 2 > dv.byteLength - start) return;
      var n = u16(off);
      for (var i = 0; i < n; i++) {
        var e = off + 2 + i * 12;
        if (start + e + 12 > dv.byteLength) break;
        var tag = u16(e), type = u16(e + 2), count = u32(e + 4);
        var size = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }[type] || 1;
        var vo = size * count > 4 ? u32(e + 8) : e + 8, val;
        try {
          if (tag === 0x8769 || tag === 0x8825) { readIfd(u32(e + 8), tag === 0x8825 ? GPS_TAGS : EXIF_TAGS); continue; }
          if (type === 2) { val = ''; for (var k = 0; k < count - 1; k++) val += String.fromCharCode(dv.getUint8(start + vo + k)); val = val.replace(/\0+$/, '').trim(); }
          else if (type === 5 || type === 10) {
            val = [];
            for (var r = 0; r < Math.min(count, 4); r++) {
              var num = type === 5 ? u32(vo + r * 8) : s32(vo + r * 8), den = type === 5 ? u32(vo + r * 8 + 4) : s32(vo + r * 8 + 4);
              val.push(den ? num / den : 0);
            }
            if (val.length === 1) val = val[0];
          } else if (type === 3) val = count === 1 ? u16(vo) : [u16(vo), u16(vo + 2)];
          else if (type === 4 || type === 9) val = u32(vo);
          else if (type === 7) { val = ''; for (var q = 0; q < Math.min(count, 8); q++) val += String.fromCharCode(dv.getUint8(start + vo + q)); }
          else val = dv.getUint8(start + vo);
        } catch (err) { continue; }
        if (names[tag]) out[names[tag]] = val;
      }
    }
    readIfd(u32(4), EXIF_TAGS);
    return out;
  }

  function findExif(buffer) {
    var dv = new DataView(buffer), b = new Uint8Array(buffer);
    if (b[0] === 0xFF && b[1] === 0xD8) {
      var off = 2;
      while (off + 4 < b.length && b[off] === 0xFF) {
        var marker = b[off + 1], len = dv.getUint16(off + 2);
        if (marker === 0xE1 && String.fromCharCode(b[off + 4], b[off + 5], b[off + 6], b[off + 7]) === 'Exif') return parseTiffExif(dv, off + 10);
        if (marker === 0xDA) break;
        off += 2 + len;
      }
      return null;
    }
    if (b[0] === 0x89 && b[1] === 0x50) {
      var p = 8;
      while (p + 8 < b.length) {
        var clen = dv.getUint32(p), type = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]);
        if (type === 'eXIf') return parseTiffExif(dv, p + 8);
        if (type === 'IEND') break;
        p += 12 + clen;
      }
      return null;
    }
    if (String.fromCharCode(b[0], b[1], b[2], b[3]) === 'RIFF') {
      var q = 12;
      while (q + 8 < b.length) {
        var id = String.fromCharCode(b[q], b[q + 1], b[q + 2], b[q + 3]), sz = dv.getUint32(q + 4, true);
        if (id === 'EXIF') { var st = q + 8; if (String.fromCharCode(b[st], b[st + 1], b[st + 2], b[st + 3]) === 'Exif') st += 6; return parseTiffExif(dv, st); }
        q += 8 + sz + (sz & 1);
      }
    }
    return null;
  }

  /* Extra format facts that don't need EXIF: PNG bit depth, JPEG precision… */
  function formatFacts(buffer) {
    var b = new Uint8Array(buffer), dv = new DataView(buffer), facts = [];
    if (b[0] === 0x89 && b[1] === 0x50 && b.length > 29) {
      var types = { 0: 'Greyscale', 2: 'RGB', 3: 'Indexed', 4: 'Greyscale + alpha', 6: 'RGBA' };
      facts.push(['Bit Depth', b[24] + ' bits per channel'], ['Color Type', types[b[25]] || String(b[25])], ['Interlaced', b[28] ? 'Yes (Adam7)' : 'No']);
      var p = 8, texts = [];
      while (p + 8 < b.length) {
        var len = dv.getUint32(p), t = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]);
        if (t === 'tEXt' && len < 4096) {
          var s = ''; for (var i = 0; i < len; i++) s += String.fromCharCode(b[p + 8 + i]);
          texts.push(s.replace('\0', ': '));
        }
        if (t === 'pHYs' && dv.getUint8(p + 16) === 1) facts.push(['Resolution', Math.round(dv.getUint32(p + 8) * 0.0254) + ' DPI']);
        if (t === 'acTL') facts.push(['Animated', 'Yes (APNG, ' + dv.getUint32(p + 8) + ' frames)']);
        if (t === 'IEND') break;
        p += 12 + len;
      }
      texts.slice(0, 8).forEach(function (s) { facts.push(['Text', s]); });
    } else if (b[0] === 0xFF && b[1] === 0xD8) {
      var o = 2;
      while (o + 9 < b.length && b[o] === 0xFF) {
        var m = b[o + 1], l = dv.getUint16(o + 2);
        if (m === 0xE0 && String.fromCharCode(b[o + 4], b[o + 5], b[o + 6], b[o + 7]) === 'JFIF') {
          var unit = b[o + 11], xd = dv.getUint16(o + 12);
          if (unit === 1) facts.push(['Resolution', xd + ' DPI']);
        }
        if ((m >= 0xC0 && m <= 0xC3) || (m >= 0xC5 && m <= 0xC7) || (m >= 0xC9 && m <= 0xCB)) {
          facts.push(['Encoding', m === 0xC2 || m === 0xC6 ? 'Progressive' : 'Baseline'], ['Components', b[o + 9] === 3 ? '3 (YCbCr)' : b[o + 9] === 1 ? '1 (Greyscale)' : String(b[o + 9])]);
          break;
        }
        o += 2 + l;
      }
    } else if (String.fromCharCode(b[0], b[1], b[2]) === 'GIF') {
      var frames = 0;
      for (var g = 13; g < b.length - 1; g++) if (b[g] === 0x21 && b[g + 1] === 0xF9) frames++;
      facts.push(['Version', String.fromCharCode(b[3], b[4], b[5])], ['Frames', String(Math.max(1, frames))]);
    }
    return facts;
  }

  /* Pixel size as stored in the file, before any EXIF rotation. */
  function storedSize(buffer) {
    var b = new Uint8Array(buffer), dv = new DataView(buffer);
    if (b[0] === 0x89 && b[1] === 0x50 && b.length > 24) return { w: dv.getUint32(16), h: dv.getUint32(20) };
    if (b[0] === 0xFF && b[1] === 0xD8) {
      var o = 2;
      while (o + 9 < b.length && b[o] === 0xFF) {
        var m = b[o + 1];
        if ((m >= 0xC0 && m <= 0xC3) || (m >= 0xC5 && m <= 0xC7) || (m >= 0xC9 && m <= 0xCB)) return { h: dv.getUint16(o + 5), w: dv.getUint16(o + 7) };
        o += 2 + dv.getUint16(o + 2);
      }
    }
    return null;
  }

  function exifRows(ex) {
    var rows = [], fmt = {
      ExposureTime: function (v) { return v >= 1 ? v + ' s' : '1/' + Math.round(1 / v) + ' s'; },
      FNumber: function (v) { return 'f/' + (+v.toFixed(1)); },
      FocalLength: function (v) { return (+v.toFixed(1)) + ' mm'; },
      FocalLengthIn35mm: function (v) { return v + ' mm'; },
      ExposureBias: function (v) { return (v > 0 ? '+' : '') + (+v.toFixed(2)) + ' EV'; },
      Orientation: function (v) { return ({ 1: 'Normal', 2: 'Mirrored', 3: 'Rotated 180°', 4: 'Mirrored vertically', 5: 'Mirrored + 90° CCW', 6: 'Rotated 90° CW', 7: 'Mirrored + 90° CW', 8: 'Rotated 90° CCW' })[v] || v; },
      Flash: function (v) { return v & 1 ? 'Fired' : 'Did not fire'; },
      ExposureProgram: function (v) { return ['Not defined', 'Manual', 'Normal', 'Aperture priority', 'Shutter priority', 'Creative', 'Action', 'Portrait', 'Landscape'][v] || v; },
      MeteringMode: function (v) { return ({ 0: 'Unknown', 1: 'Average', 2: 'Center-weighted', 3: 'Spot', 4: 'Multi-spot', 5: 'Pattern', 6: 'Partial' })[v] || v; },
      WhiteBalance: function (v) { return v ? 'Manual' : 'Auto'; },
      ColorSpace: function (v) { return v === 1 ? 'sRGB' : v === 65535 ? 'Uncalibrated' : v; },
      ExifVersion: function (v) { return String(v).replace(/^0/, '').replace(/(\d)(\d\d)$/, '$1.$2'); },
      ResolutionUnit: function (v) { return v === 2 ? 'inches' : v === 3 ? 'cm' : 'none'; }
    };
    Object.keys(ex).forEach(function (k) {
      if (/^GPS/.test(k) || k === 'ShutterSpeedValue' || k === 'ApertureValue' || k === 'MaxApertureValue') return;
      var v = ex[k];
      if (Array.isArray(v)) v = v.map(function (n) { return +(+n).toFixed(4); }).join(', ');
      else if (typeof v === 'number' && !fmt[k]) v = +v.toFixed(4);
      rows.push([k.replace(/([a-z])([A-Z])/g, '$1 $2').replace('ISO', 'ISO'), fmt[k] ? fmt[k](ex[k]) : String(v)]);
    });
    if (ex.GPSLatitude && ex.GPSLongitude) {
      var dms = function (a) { return Array.isArray(a) ? a[0] + (a[1] || 0) / 60 + (a[2] || 0) / 3600 : a; };
      var lat = dms(ex.GPSLatitude) * (ex.GPSLatitudeRef === 'S' ? -1 : 1), lon = dms(ex.GPSLongitude) * (ex.GPSLongitudeRef === 'W' ? -1 : 1);
      rows.push(['GPS Position', lat.toFixed(6) + ', ' + lon.toFixed(6)]);
      if (typeof ex.GPSAltitude === 'number') rows.push(['GPS Altitude', ex.GPSAltitude.toFixed(1) + ' m']);
    }
    return rows;
  }

  Tools.register({
    id: 'image-metadata', category: 'image', name: 'Image Metadata',
    description: 'Show an image’s file details, dimensions, format facts and EXIF camera data.',
    keywords: ['metadata', 'exif', 'camera', 'gps', 'properties', 'dimensions', 'info', 'megapixels'],
    render: function (root) {
      root$(root);
      var head = el('h3');
      var list = el('dl', { class: 'g-kv' });
      var thumb = el('div', { class: 'g-prev g-check' });
      var rows = [];
      var note = U.note('');
      var box = U.panel(null, el('div', { class: 'row', style: { justifyContent: 'space-between', alignItems: 'center' } }, head,
        U.copyBtn('Copy All', function () { return rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n'); })), thumb, list, note);
      box.classList.add('g-hide');
      var ld = loader({ label: 'Drop an image here or click to upload', hint: 'JPG, PNG, WebP, GIF, HEIC, TIFF…', keepZone: true, raw: true, onLoad: async function (files) {
        var file = files[0], buf = await U.readAs(file, 'buffer');
        var r = await decodeFile(file);
        var w = r.width, h = r.height;
        head.textContent = 'Metadata for: ' + file.name;
        rows = [
          ['File Name', file.name],
          ['File Size', kb(file.size) + ' (' + file.size.toLocaleString('en-US') + ' bytes)'],
          ['MIME Type', file.type || r.mime || 'unknown'],
          ['Last Modified', new Date(file.lastModified || Date.now()).toLocaleString()],
          ['Dimensions', w + ' × ' + h + ' px' + (function () {
            var st = storedSize(buf);
            return st && (st.w !== w || st.h !== h) && st.w === h && st.h === w ? ' (stored as ' + st.w + ' × ' + st.h + ', turned upright by its EXIF orientation)' : '';
          })()],
          ['Aspect Ratio', ratioText(w, h)],
          ['Megapixels', (w * h / 1e6).toFixed(2) + ' MP'],
          ['Orientation', w > h ? 'Landscape' : w < h ? 'Portrait' : 'Square'],
          ['Has Transparency', hasAlpha(r.canvas) ? 'Yes' : 'No']
        ].concat(formatFacts(buf));
        var ex = null;
        try { ex = findExif(buf); } catch (e) { ex = null; }
        var er = ex ? exifRows(ex) : [];
        rows = rows.concat(er.map(function (x) { return ['EXIF · ' + x[0], x[1]]; }));
        list.replaceChildren.apply(list, rows.reduce(function (acc, row) { acc.push(el('dt', { text: row[0] }), el('dd', { text: row[1] })); return acc; }, []));
        var t = cloneCanvas(r.canvas); t.style.maxHeight = '220px';
        thumb.replaceChildren(t);
        note.textContent = er.length ? 'EXIF data found: ' + er.length + ' fields. Remember that photos can carry your location; strip EXIF before sharing if that matters.' : 'No EXIF block in this file (screenshots, web images and edited files often have none).';
        box.classList.remove('g-hide');
      } });
      root.append(U.panel(null, ld.zone, ld.status, ld.picker), box);
    }
  });

  /* --- Color Picker from Image --------------------------------------------- */

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
  }

  Tools.register({
    id: 'image-color-picker', category: 'color', name: 'Colour Picker from Image',
    description: 'Hover over an image to read colours and click to collect them as HEX, RGB and HSL.',
    keywords: ['color picker', 'colour picker', 'eyedropper', 'hex', 'rgb', 'sample', 'palette', 'from image'],
    render: function (root) {
      root$(root);
      var canvas = makeCanvas(1, 1);
      canvas.style.cursor = 'crosshair';
      canvas.style.maxWidth = '100%';
      var swatch = el('i', { style: { display: 'inline-block', width: '42px', height: '42px', borderRadius: '8px', border: '1px solid var(--border)', background: '#000' } });
      var hexOut = el('b', { class: 'g-hex', text: '#000000' }), rgbOut = el('span', { class: 'mono', text: 'rgb(0,0,0)' }), hslOut = el('span', { class: 'mono g-muted', text: 'hsl(0,0%,0%)' });
      var picks = [];
      var pickHead = el('h4');
      var pickList = el('div', { class: 'g-picks' });
      var picksBox = el('div', { class: 'g-hide' }, pickHead, pickList,
        U.btnrow(U.copyBtn('Copy All Hex Values', function () { return picks.join('\n'); })));

      function sample(e) {
        var b = canvas.getBoundingClientRect();
        var x = clamp(Math.floor((e.clientX - b.left) * canvas.width / b.width), 0, canvas.width - 1);
        var y = clamp(Math.floor((e.clientY - b.top) * canvas.height / b.height), 0, canvas.height - 1);
        var d = ctx2d(canvas).getImageData(x, y, 1, 1).data;
        var hex = rgbHex(d[0], d[1], d[2]), hsl = rgbToHsl(d[0], d[1], d[2]);
        swatch.style.background = hex;
        hexOut.textContent = hex;
        rgbOut.textContent = 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')';
        hslOut.textContent = 'hsl(' + hsl[0] + ',' + hsl[1] + '%,' + hsl[2] + '%)';
        return hex;
      }
      function renderPicks() {
        pickHead.textContent = 'Picked Colors (' + picks.length + ')';
        pickList.replaceChildren.apply(pickList, picks.map(function (hex) {
          return el('button', { class: 'g-pick', type: 'button', title: 'Copy ' + hex, onclick: function () { U.copy(hex); } },
            el('i', { style: { background: hex } }), el('span', { text: hex }), el('small', { class: 'g-muted', text: 'copy' }));
        }));
        picksBox.classList.toggle('g-hide', !picks.length);
      }
      canvas.addEventListener('mousemove', sample);
      canvas.addEventListener('click', function (e) { picks.push(sample(e)); renderPicks(); });

      var ld = loader({ label: 'Drop an image here or click to upload', hint: 'JPG, PNG, WebP, GIF…', onLoad: function (r) {
        canvas.width = r.width; canvas.height = r.height;
        ctx2d(canvas).drawImage(r.canvas, 0, 0);
        stage.classList.remove('g-hide');
      } });
      var stage = el('div', { class: 'g-hide' },
        U.panel(null, el('div', { class: 'row', style: { alignItems: 'center' } }, swatch, hexOut, rgbOut, hslOut,
          U.copyBtn('Copy HEX', function () { return hexOut.textContent; }), U.copyBtn('Copy RGB', function () { return rgbOut.textContent; })),
          U.btnrow(ld.change, U.button('Clear picks', function () { picks = []; renderPicks(); }, 'ghost')),
          el('div', { class: 'g-prev' }, canvas), U.note('Move over the image to preview a colour; click to add it to your picks.')),
        U.panel(null, picksBox));
      root.append(U.panel(null, ld.zone, ld.status, ld.picker), stage);
    }
  });

  /* --- Image Collage ------------------------------------------------------- */

  var COLLAGE = {
    'side': { label: '2 images side by side', n: 2, w: 2, h: 1, cells: [[0, 0, 1, 1], [1, 0, 1, 1]] },
    'stack': { label: '2 images stacked', n: 2, w: 1, h: 2, cells: [[0, 0, 1, 1], [0, 1, 1, 1]], unitW: 1200, unitH: 600 },
    'grid4': { label: '4 images grid', n: 4, w: 2, h: 2, cells: [[0, 0, 1, 1], [1, 0, 1, 1], [0, 1, 1, 1], [1, 1, 1, 1]] },
    'row3': { label: '3 in a row', n: 3, w: 3, h: 1, cells: [[0, 0, 1, 1], [1, 0, 1, 1], [2, 0, 1, 1]] },
    'two-one': { label: '2 top + 1 bottom', n: 3, w: 2, h: 2, cells: [[0, 0, 1, 1], [1, 0, 1, 1], [0, 1, 2, 1]] }
  };

  /* Draw a source into a box with object-fit: cover. */
  function drawCover(x, img, dx, dy, dw, dh) {
    var sw = img.width, sh = img.height, s = Math.max(dw / sw, dh / sh);
    var cw = dw / s, ch = dh / s;
    x.drawImage(img, (sw - cw) / 2, (sh - ch) / 2, cw, ch, dx, dy, dw, dh);
  }

  function buildCollage(layoutId, canvases, gap, bg) {
    var L = COLLAGE[layoutId], uw = L.unitW || 600, uh = L.unitH || 600;
    var W = L.w * uw + (L.w + 1) * gap, H = L.h * uh + (L.h + 1) * gap;
    var c = makeCanvas(W, H), x = ctx2d(c);
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.imageSmoothingQuality = 'high';
    L.cells.forEach(function (cell, i) {
      var img = canvases[i]; if (!img) return;
      var dx = gap + cell[0] * (uw + gap), dy = gap + cell[1] * (uh + gap);
      var dw = cell[2] * uw + (cell[2] - 1) * gap, dh = cell[3] * uh + (cell[3] - 1) * gap;
      drawCover(x, img, dx, dy, dw, dh);
    });
    return c;
  }

  Tools.register({
    id: 'image-collage', category: 'image', name: 'Image Collage',
    description: 'Arrange two to four images into a grid collage with a gap and background colour.',
    keywords: ['collage', 'grid', 'combine', 'merge images', 'photo grid', 'side by side', 'layout'],
    render: function (root) {
      root$(root);
      var items = [];
      var layout = U.select({ label: 'Layout', value: 'grid4', options: Object.keys(COLLAGE).map(function (k) { return { value: k, label: COLLAGE[k].label }; }) });
      var gap = slider('Gap: {}', { min: 0, max: 40, value: 8 }, function (v) { return v + 'px'; });
      var bg = colorField('Background', '#ffffff');
      var head = el('h4');
      var thumbs = el('div', { class: 'g-thumbs' });
      var picker = el('input', { type: 'file', accept: 'image/*', multiple: true, style: { display: 'none' } });
      var status = U.note('');
      var out = resultPanel('Collage Preview', 'Download Collage');
      function need() { return COLLAGE[inputOf(layout).value].n; }
      function paint() {
        head.textContent = 'Images (' + items.length + '/' + need() + ' needed)';
        var tiles = items.map(function (it, i) {
          return el('div', { class: 'g-thumb' }, el('img', { src: it.url, alt: it.name }),
            el('button', { class: 'g-x', type: 'button', text: '×', title: 'Remove', onclick: function () { URL.revokeObjectURL(it.url); items.splice(i, 1); paint(); } }));
        });
        tiles.push(el('button', { class: 'g-thumb g-add', type: 'button', text: '+', title: 'Add images', onclick: function () { picker.click(); } }));
        thumbs.replaceChildren.apply(thumbs, tiles);
      }
      async function add(files) {
        for (var i = 0; i < files.length; i++) {
          try {
            var r = await decodeFile(files[i]);
            items.push({ canvas: r.canvas, name: files[i].name, url: URL.createObjectURL(files[i]) });
          } catch (e) { U.toast(e.message, 'err'); }
        }
        paint();
      }
      picker.addEventListener('change', function () { var f = Array.prototype.slice.call(picker.files); picker.value = ''; add(f); });
      inputOf(layout).addEventListener('change', paint);
      var drop = el('div', { ondragover: function (e) { e.preventDefault(); }, ondrop: function (e) { e.preventDefault(); add(Array.prototype.slice.call(e.dataTransfer.files)); } }, thumbs);
      async function generate() {
        status.textContent = '';
        if (items.length < need()) { status.className = 'note err'; status.textContent = 'Add ' + (need() - items.length) + ' more image(s) for this layout.'; return; }
        var c = buildCollage(inputOf(layout).value, items.map(function (i) { return i.canvas; }), gap.get(), bg.get());
        out.show(c, await toBlob(c, 'image/png'), 'collage.png');
      }
      paint();
      root.append(U.panel(null, el('div', { class: 'row' }, layout, gap, bg), head, drop, picker, status,
        U.btnrow(U.button('Generate Collage', function () { generate().catch(function (e) { U.toast(e.message, 'err'); }); }, 'primary'))), out.node);
    }
  });

  /* --- Favicon Generator --------------------------------------------------- */

  function squareIcon(src, size) {
    var c = makeCanvas(size, size), x = ctx2d(c);
    x.imageSmoothingQuality = 'high';
    /* Step down in halves for small sizes so they stay crisp. */
    var cur = src, s = Math.min(src.width, src.height);
    var sq = makeCanvas(s, s);
    ctx2d(sq).drawImage(src, (src.width - s) / 2, (src.height - s) / 2, s, s, 0, 0, s, s);
    cur = sq;
    while (cur.width / 2 > size) {
      var half = makeCanvas(cur.width / 2, cur.height / 2), hx = ctx2d(half);
      hx.imageSmoothingQuality = 'high';
      hx.drawImage(cur, 0, 0, half.width, half.height);
      cur = half;
    }
    x.drawImage(cur, 0, 0, size, size);
    return c;
  }

  /* An .ico with PNG-compressed entries (supported by every current browser). */
  function buildIco(pngs) {
    var header = 6 + 16 * pngs.length, total = header;
    pngs.forEach(function (p) { total += p.bytes.length; });
    var buf = new Uint8Array(total), dv = new DataView(buf.buffer), off = header;
    dv.setUint16(0, 0, true); dv.setUint16(2, 1, true); dv.setUint16(4, pngs.length, true);
    pngs.forEach(function (p, i) {
      var e = 6 + i * 16;
      buf[e] = p.size >= 256 ? 0 : p.size; buf[e + 1] = p.size >= 256 ? 0 : p.size;
      dv.setUint16(e + 4, 1, true); dv.setUint16(e + 6, 32, true);
      dv.setUint32(e + 8, p.bytes.length, true); dv.setUint32(e + 12, off, true);
      buf.set(p.bytes, off); off += p.bytes.length;
    });
    return new Blob([buf], { type: 'image/x-icon' });
  }

  Tools.register({
    id: 'image-favicon', category: 'image', name: 'Favicon Generator',
    description: 'Make favicon PNGs from 16×16 to 256×256, plus a favicon.ico, from any image.',
    keywords: ['favicon', 'icon', 'ico', 'apple touch icon', 'website icon', 'png', '16x16', '32x32'],
    render: function (root) {
      root$(root);
      var SIZES = [16, 32, 48, 64, 128, 256];
      var src = null, name = 'favicon';
      var grid = el('div', { class: 'g-fav' });
      var usage = U.out('<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">\n<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180x180.png">');
      var status = U.note('');
      function pngOf(size) { return toBlob(squareIcon(src.canvas, size), 'image/png'); }
      async function downloadAll() {
        if (!src) return;
        status.className = 'note'; status.textContent = 'Building ZIP…';
        await U.script('assets/vendor/jszip/jszip.min.js');
        var zip = new window.JSZip(), icoParts = [];
        for (var i = 0; i < SIZES.concat([180, 192, 512]).length; i++) {
          var s = SIZES.concat([180, 192, 512])[i], blob = await pngOf(s);
          zip.file('favicon-' + s + 'x' + s + '.png', blob);
          if (s <= 48) icoParts.push({ size: s, bytes: new Uint8Array(await blob.arrayBuffer()) });
        }
        zip.file('favicon.ico', buildIco(icoParts));
        zip.file('site.webmanifest', JSON.stringify({ icons: [192, 512].map(function (s) { return { src: '/favicon-' + s + 'x' + s + '.png', sizes: s + 'x' + s, type: 'image/png' }; }) }, null, 2));
        zip.file('snippet.html', '<link rel="icon" href="/favicon.ico" sizes="any">\n<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">\n<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">\n<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180x180.png">\n<link rel="manifest" href="/site.webmanifest">\n');
        U.saveBlob(name + '-favicons.zip', await zip.generateAsync({ type: 'blob' }));
        status.className = 'note ok'; status.textContent = 'ZIP ready: ' + (SIZES.length + 3) + ' PNGs, favicon.ico, a web manifest and the HTML snippet.';
      }
      var result = el('div', { class: 'g-hide' },
        U.panel(null, el('div', { class: 'row', style: { justifyContent: 'space-between', alignItems: 'center' } }, el('h3', { text: 'Generated Favicons' }),
          U.btnrow(U.button('Download All', function () { downloadAll().catch(function (e) { status.className = 'note err'; status.textContent = e.message; }); }, 'primary'),
            U.button('Download favicon.ico', async function () {
              var parts = [];
              for (var s of [16, 32, 48]) parts.push({ size: s, bytes: new Uint8Array(await (await pngOf(s)).arrayBuffer()) });
              U.saveBlob('favicon.ico', buildIco(parts));
            }))), grid, status),
        U.panel('Usage', usage, U.btnrow(U.copyBtn('Copy', function () { return usage.textContent; }))));
      var ld = loader({ label: 'Drop an image here or click to upload', hint: 'Best results with square images (1:1 ratio)', keepZone: true, onLoad: function (r) {
        src = r; name = baseName(r.file.name).replace(/[^a-z0-9-]+/gi, '-').toLowerCase() || 'favicon';
        grid.replaceChildren.apply(grid, SIZES.map(function (s) {
          var c = squareIcon(r.canvas, s);
          c.dataset.size = s;
          return el('div', {}, c, el('div', { class: 'g-info', text: s + '×' + s }),
            U.button('↓ PNG', function () { toBlob(c, 'image/png').then(function (b) { U.saveBlob('favicon-' + s + 'x' + s + '.png', b); }); }));
        }));
        result.classList.remove('g-hide');
      } });
      root.append(U.panel(null, ld.zone, ld.status, ld.picker), result);
    }
  });

  /* --- Background Remover (RMBG-1.4 via transformers.js) -------------------- */

  var rmbg = null;
  function abs(p) { return new URL(p, document.baseURI).href; }
  function loadRmbg(onStatus) {
    if (rmbg) return rmbg;
    rmbg = (async function () {
      var probe = await fetch(abs('assets/models/briaai/RMBG-1.4/onnx/model_quantized.onnx'), { method: 'HEAD' }).catch(function () { return null; });
      if (!probe || !probe.ok) throw new Error('The background-removal model is not installed. Run "npm run vendor -- --models" in the app folder, then reload.');
      onStatus('Loading the AI model (about 44 MB, first time only)…');
      var T = await U.module('assets/vendor/transformers/transformers.min.js');
      T.env.allowRemoteModels = false;
      T.env.allowLocalModels = true;
      T.env.localModelPath = abs('assets/models/');
      T.env.backends.onnx.wasm.wasmPaths = abs('assets/vendor/transformers/');
      var model = await T.AutoModel.from_pretrained('briaai/RMBG-1.4', { config: { model_type: 'custom' }, dtype: 'q8' });
      var processor = await T.AutoProcessor.from_pretrained('briaai/RMBG-1.4', { config: {
        do_normalize: true, do_pad: false, do_rescale: true, do_resize: true, image_mean: [0.5, 0.5, 0.5],
        feature_extractor_type: 'ImageFeatureExtractor', image_std: [1, 1, 1], resample: 2, rescale_factor: 0.00392156862745098,
        size: { width: 1024, height: 1024 } } });
      return { T: T, model: model, processor: processor };
    })();
    rmbg.catch(function () { rmbg = null; });
    return rmbg;
  }

  async function removeBackground(canvas, onStatus) {
    var m = await loadRmbg(onStatus);
    onStatus('Removing the background on your device…');
    var blob = await toBlob(canvas, 'image/png');
    var image = await m.T.RawImage.fromBlob(blob);
    var inputs = await m.processor(image);
    var result = await m.model({ input: inputs.pixel_values });
    var out = result.output || result[Object.keys(result)[0]];
    var mask = await m.T.RawImage.fromTensor(out[0].mul(255).to('uint8')).resize(image.width, image.height);
    var c = cloneCanvas(canvas), x = ctx2d(c), img = x.getImageData(0, 0, c.width, c.height);
    for (var i = 0; i < mask.data.length; i++) img.data[i * 4 + 3] = Math.min(img.data[i * 4 + 3], mask.data[i * mask.channels]);
    x.putImageData(img, 0, 0);
    return c;
  }

  Tools.register({
    id: 'background-remover', category: 'ai', name: 'Background Remover',
    description: 'Cut the subject out of a photo with an on-device AI model and save a transparent PNG.',
    keywords: ['background remover', 'remove background', 'transparent', 'cut out', 'ai', 'rmbg', 'png', 'product photo'],
    render: function (root) {
      root$(root);
      var src = null, cut = null;
      var origBox = el('div', { class: 'g-prev' });
      var resBox = el('div', { class: 'g-prev g-check' }, el('span', { class: 'g-muted', text: 'Click “Remove Background”' }));
      var fileInfo = el('div', { class: 'g-info' });
      var prog = U.progress();
      var bgChoice = choice([{ value: 'transparent', label: 'Transparent' }, { value: '#ffffff', label: 'White' }, { value: '#000000', label: 'Black' }, { value: 'custom', label: 'Custom' }], 'transparent', paintResult);
      var custom = el('input', { type: 'color', value: '#22c55e', oninput: function () { if (bgChoice.value === 'custom') paintResult(); } });
      var finalCanvas = null;
      function composite() {
        if (!cut) return null;
        var v = bgChoice.value;
        if (v === 'transparent') return cloneCanvas(cut);
        return flatten(cut, v === 'custom' ? custom.value : v);
      }
      function paintResult() {
        if (!cut) return;
        finalCanvas = composite();
        finalCanvas.classList.add('g-out');
        resBox.replaceChildren(finalCanvas);
      }
      var goBtn = U.button('Remove Background', function () { go(); }, 'primary');
      var dlBtn = U.button('Download PNG', function () {
        if (!finalCanvas) return;
        var jpg = bgChoice.value !== 'transparent';
        toBlob(finalCanvas, jpg ? 'image/jpeg' : 'image/png', 0.95).then(function (b) { U.saveBlob(baseName(src.file.name) + '-no-bg.' + (jpg ? 'jpg' : 'png'), b); });
      }, 'primary');
      var after = el('div', { class: 'g-hide' }, el('div', { class: 'field' }, el('label', { text: 'Background' }), el('div', { class: 'row', style: { alignItems: 'center' } }, bgChoice, custom)), U.btnrow(dlBtn));
      bgChoice.addEventListener('click', function () { dlBtn.textContent = bgChoice.value === 'transparent' ? 'Download PNG' : 'Download JPG'; });
      async function go() {
        if (!src) return;
        goBtn.disabled = true; goBtn.textContent = 'Removing background…';
        resBox.replaceChildren(el('span', { class: 'g-muted', text: 'Working…' }));
        try {
          /* Very large photos are processed at up to 2048 px on the long side. */
          var s = Math.min(1, 2048 / Math.max(src.width, src.height)), base = src.canvas;
          if (s < 1) { base = makeCanvas(src.width * s, src.height * s); ctx2d(base).drawImage(src.canvas, 0, 0, base.width, base.height); }
          cut = await removeBackground(base, function (t) { prog.set(t); });
          prog.done('Done. The result is ' + cut.width + ' × ' + cut.height + ' px.');
          paintResult();
          after.classList.remove('g-hide');
        } catch (e) {
          prog.fail(e);
          resBox.replaceChildren(el('span', { class: 'g-muted', text: 'Could not remove the background.' }));
        }
        goBtn.disabled = false; goBtn.textContent = 'Remove Background';
      }
      var ld = loader({ label: 'Drop an image here, or click to choose', hint: 'PNG, JPG, WebP… portraits, products and objects — nothing is uploaded', onLoad: function (r) {
        src = r; cut = null; finalCanvas = null;
        origBox.replaceChildren(cloneCanvas(r.canvas));
        resBox.replaceChildren(el('span', { class: 'g-muted', text: 'Click “Remove Background”' }));
        fileInfo.textContent = r.file.name + ' (' + kb(r.file.size) + ')';
        after.classList.add('g-hide');
        prog.set('');
        work.classList.remove('g-hide');
      } });
      var work = U.panel(null, el('div', { class: 'g-grid2' }, el('div', {}, el('h4', { text: 'Original' }), origBox), el('div', {}, el('h4', { text: 'Result' }), resBox)),
        fileInfo, U.btnrow(goBtn, U.button('Reset', function () { src = null; work.classList.add('g-hide'); ld.reset(); }, 'ghost')), prog, after);
      work.classList.add('g-hide');
      root.append(U.panel(null, ld.zone, ld.status, ld.picker), work);
    }
  });

  /* --- SVG to PNG ---------------------------------------------------------- */

  var DEFAULT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><circle cx="100" cy="100" r="80" fill="#3b82f6"/><text x="100" y="110" text-anchor="middle" fill="white" font-size="24">SVG</text></svg>';

  /* Rasterise SVG markup. Returns a canvas at `scale` × its intrinsic size. */
  function svgToCanvas(markup, scale) {
    return new Promise(function (resolve, reject) {
      var doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
      var svg = doc.documentElement;
      if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) return reject(new Error('That is not valid SVG markup.'));
      if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      var vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
      var w = parseFloat(svg.getAttribute('width')), h = parseFloat(svg.getAttribute('height'));
      if (/%/.test(svg.getAttribute('width') || '')) w = NaN;
      if (/%/.test(svg.getAttribute('height') || '')) h = NaN;
      if (!(w > 0) && vb.length === 4 && vb[2] > 0) w = h > 0 ? h * vb[2] / vb[3] : vb[2];
      if (!(h > 0) && vb.length === 4 && vb[3] > 0) h = w * vb[3] / vb[2];
      if (!(w > 0)) w = 300;
      if (!(h > 0)) h = 150;
      svg.setAttribute('width', w); svg.setAttribute('height', h);
      var text = new XMLSerializer().serializeToString(svg);
      var img = new Image();
      if (w * scale > 16384 || h * scale > 16384 || w * h * scale * scale > 150e6) return reject(new Error('At ' + scale + 'x this SVG would be ' + Math.round(w * scale) + ' × ' + Math.round(h * scale) + ' px, which is too large for a browser canvas. Lower the scale or the SVG size.'));
      img.onload = function () {
        var c = makeCanvas(w * scale, h * scale);
        ctx2d(c).drawImage(img, 0, 0, c.width, c.height);
        resolve(c);
      };
      img.onerror = function () { reject(new Error('The browser could not render this SVG.')); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text);
    });
  }

  Tools.register({
    id: 'svg-to-png', category: 'image', name: 'SVG to PNG',
    description: 'Render SVG code or an SVG file to a PNG at 1× to 4× resolution.',
    keywords: ['svg', 'png', 'rasterize', 'vector to png', 'convert', 'export'],
    render: function (root) {
      root$(root);
      var name = 'image';
      var tab = choice([{ value: 'code', label: 'SVG Code' }, { value: 'upload', label: 'Upload SVG' }], 'code', function (v) {
        codePane.classList.toggle('g-hide', v !== 'code'); upPane.classList.toggle('g-hide', v !== 'upload');
      });
      tab.classList.add('g-tabs');
      var code = U.textarea({ rows: 8, spellcheck: false, value: DEFAULT_SVG });
      var C = inputOf(code);
      var codePane = el('div', {}, code);
      var upZone = U.dropzone({ accept: '.svg,image/svg+xml', label: 'Drop an SVG file here', hint: 'or click to choose', onFiles: function (f) {
        name = baseName(f[0].name);
        U.readAs(f[0], 'text').then(function (t) { C.value = t; livePreview(); tab.set('code'); codePane.classList.remove('g-hide'); upPane.classList.add('g-hide'); });
      } });
      var upPane = el('div', { class: 'g-hide' }, upZone);
      var scale = slider('Scale (resolution multiplier): {}', { min: 1, max: 4, value: 2 }, function (v) { return v + 'x'; });
      var svgPrev = el('div', { class: 'g-prev g-check' });
      var status = U.note('');
      var out = resultPanel('PNG', 'Download PNG');
      function livePreview() {
        var t = C.value.trim();
        if (!t) { svgPrev.replaceChildren(el('span', { class: 'g-muted', text: 'SVG' })); return; }
        var img = el('img', { alt: 'SVG preview', style: { maxHeight: '300px' } });
        img.onerror = function () { svgPrev.replaceChildren(el('span', { class: 'g-muted', text: 'The SVG does not render yet.' })); };
        var doc = new DOMParser().parseFromString(t, 'image/svg+xml');
        if (doc.getElementsByTagName('parsererror').length || doc.documentElement.nodeName.toLowerCase() !== 'svg') { svgPrev.replaceChildren(el('span', { class: 'g-muted', text: 'Invalid SVG' })); return; }
        if (!doc.documentElement.getAttribute('xmlns')) doc.documentElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(doc));
        svgPrev.replaceChildren(img);
      }
      C.addEventListener('input', U.debounce(livePreview, 200));
      async function convert() {
        status.className = 'note'; status.textContent = '';
        try {
          var c = await svgToCanvas(C.value, scale.get());
          out.show(c, await toBlob(c, 'image/png'), name + '@' + scale.get() + 'x.png');
        } catch (e) { status.className = 'note err'; status.textContent = e.message; out.hide(); }
      }
      livePreview();
      root.append(U.panel(null, tab, codePane, upPane, scale, status, U.btnrow(U.button('Convert to PNG', convert, 'primary'))),
        U.panel('SVG Preview', svgPrev), out.node);
    }
  });

  /* --- PNG to SVG ---------------------------------------------------------- */

  /* Threshold trace: dark pixels become runs of rectangles, and identical runs
     on consecutive rows are merged into taller rectangles. */
  function traceToSvg(canvas, threshold, invert) {
    var w = canvas.width, h = canvas.height, d = ctx2d(canvas).getImageData(0, 0, w, h).data;
    var open = {}, rects = [];
    for (var y = 0; y <= h; y++) {
      var runs = {};
      if (y < h) {
        var x = 0;
        while (x < w) {
          var on = function (xx) {
            var i = (y * w + xx) * 4;
            if (d[i + 3] < 128) return invert;
            var lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            return invert ? lum >= threshold : lum < threshold;
          };
          if (on(x)) { var s = x; while (x < w && on(x)) x++; runs[s + ',' + (x - s)] = true; } else x++;
        }
      }
      Object.keys(open).forEach(function (k) {
        if (runs[k]) { open[k].h++; delete runs[k]; }
        else { rects.push(open[k]); delete open[k]; }
      });
      Object.keys(runs).forEach(function (k) { var p = k.split(','); open[k] = { x: +p[0], y: y, w: +p[1], h: 1 }; });
    }
    var fg = invert ? '#fff' : '#000';
    var body = rects.map(function (r) { return 'M' + r.x + ' ' + r.y + 'h' + r.w + 'v' + r.h + 'h-' + r.w + 'z'; }).join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" shape-rendering="crispEdges">' +
      (invert ? '<rect width="100%" height="100%" fill="#000"/>' : '') +
      '<path fill="' + fg + '" d="' + body + '"/></svg>';
  }

  Tools.register({
    id: 'png-to-svg', category: 'image', name: 'PNG to SVG',
    description: 'Vectorise a PNG or JPG into SVG by threshold tracing, or trace it in full colour.',
    keywords: ['png to svg', 'vectorize', 'vectorise', 'trace', 'svg', 'logo', 'icon', 'bitmap to vector'],
    render: function (root) {
      root$(root);
      var src = null, svgText = '';
      var mode = choice([{ value: 'threshold', label: 'Threshold (black & white)' }, { value: 'color', label: 'Colour trace' }], 'threshold', function (v) {
        thrRow.classList.toggle('g-hide', v !== 'threshold'); colRow.classList.toggle('g-hide', v !== 'color');
      });
      var thr = slider('Threshold: {} (darker = more detail)', { min: 10, max: 245, value: 128 });
      var inv = U.checkbox('Invert (white on black)');
      var thrRow = el('div', {}, thr, inv);
      var colors = slider('Colours: {}', { min: 2, max: 32, value: 8 });
      var detail = U.select({ label: 'Detail', value: 'default', options: [{ value: 'detailed', label: 'High detail' }, { value: 'default', label: 'Balanced' }, { value: 'posterized2', label: 'Smooth / posterised' }] });
      var colRow = el('div', { class: 'g-hide' }, el('div', { class: 'row' }, colors, detail));
      var prev = el('div', { class: 'g-prev g-check' });
      var info = el('div', { class: 'g-info g-res-info' });
      var status = U.note('');
      var res = el('div', { class: 'g-hide' }, el('h4', { text: 'SVG Preview' }), prev, info,
        U.btnrow(U.button('Download SVG', function () { U.saveText(baseName(src.file.name) + '.svg', svgText, 'image/svg+xml'); }, 'primary'),
          U.copyBtn('Copy SVG Code', function () { return svgText; })));
      async function convert() {
        if (!src) return;
        status.className = 'note'; status.textContent = 'Tracing…';
        await new Promise(function (r) { setTimeout(r, 20); });
        var c = src.canvas, cap = mode.value === 'color' ? 800 : 2000;
        if (Math.max(c.width, c.height) > cap) {
          var s = cap / Math.max(c.width, c.height), sc = makeCanvas(c.width * s, c.height * s);
          ctx2d(sc).drawImage(c, 0, 0, sc.width, sc.height); c = sc;
          status.textContent = 'Large image: traced at ' + sc.width + ' × ' + sc.height + ' px.';
        } else status.textContent = '';
        if (mode.value === 'threshold') svgText = traceToSvg(c, thr.get(), inv.input.checked);
        else {
          await U.script('assets/vendor/imagetracer/imagetracer_v1.2.6.js');
          var opts = Object.assign({}, window.ImageTracer.optionpresets[inputOf(detail).value] || {}, { numberofcolors: colors.get(), viewbox: true });
          svgText = window.ImageTracer.imagedataToSVG(ctx2d(c).getImageData(0, 0, c.width, c.height), opts);
          if (!/width=/.test(svgText.slice(0, 200))) svgText = svgText.replace('<svg ', '<svg width="' + c.width + '" height="' + c.height + '" ');
        }
        prev.innerHTML = svgText;
        var svgEl = prev.querySelector('svg');
        if (svgEl) { svgEl.style.maxWidth = '100%'; svgEl.style.height = 'auto'; }
        info.textContent = c.width + '×' + c.height + 'px · ' + kb(new Blob([svgText]).size);
        res.classList.remove('g-hide');
      }
      var ld = loader({ accept: 'image/png,image/jpeg,image/webp', label: 'Drop PNG/image here or click to upload', hint: 'PNG, JPG or WebP', onLoad: function (r) {
        src = r; settings.classList.remove('g-hide'); res.classList.add('g-hide');
      } });
      var settings = U.panel(null, mode, thrRow, colRow, status,
        U.btnrow(U.button('Convert to SVG', function () { convert().catch(function (e) { status.className = 'note err'; status.textContent = e.message; }); }, 'primary'), ld.change), res);
      settings.classList.add('g-hide');
      root.append(U.note('ℹ This tool creates an SVG representation by converting pixels to filled rectangles. Best for simple logos, icons, and high-contrast images. Colour trace uses ImageTracer to build smooth coloured paths instead.'),
        U.panel(null, ld.zone, ld.status, ld.picker), settings);
    }
  });

  /* --- Placeholder Image --------------------------------------------------- */

  function drawPlaceholder(w, h, bg, fg, text) {
    var c = makeCanvas(w, h), x = ctx2d(c);
    x.fillStyle = bg; x.fillRect(0, 0, w, h);
    var label = text || (w + ' × ' + h);
    var size = Math.max(8, Math.min(w, h) / 6);
    x.font = '600 ' + size + 'px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    var tw = x.measureText(label).width;
    if (tw > w * 0.9) { size = size * w * 0.9 / tw; x.font = '600 ' + size + 'px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'; }
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(label, w / 2, h / 2);
    return c;
  }

  Tools.register({
    id: 'image-placeholder', category: 'image', name: 'Placeholder Image',
    description: 'Generate a sized placeholder image with your own colours and label.',
    keywords: ['placeholder', 'dummy image', 'mockup', 'wireframe', 'size', 'og image', 'banner'],
    render: function (root) {
      root$(root);
      var w = U.input({ label: 'Width (px)', type: 'number', min: 1, max: 2000, value: 400 });
      var h = U.input({ label: 'Height (px)', type: 'number', min: 1, max: 2000, value: 300 });
      var W = inputOf(w), H = inputOf(h);
      var bg = colorField('Background', '#cccccc'), fg = colorField('Text Color', '#666666');
      var text = U.input({ label: 'Custom Text (optional)', placeholder: '400 × 300' });
      var T = inputOf(text);
      var presets = el('div', { class: 'chips' }, [['16:9', 1280, 720], ['4:3', 800, 600], ['1:1', 500, 500], ['OG', 1200, 630], ['Twitter', 1200, 675], ['Banner', 728, 90]].map(function (p) {
        return el('button', { class: 'chip', type: 'button', text: p[0] + ' (' + p[1] + 'x' + p[2] + ')', onclick: function () { W.value = p[1]; H.value = p[2]; draw(); } });
      }));
      var prev = el('div', { class: 'g-prev' });
      var info = el('div', { class: 'g-info g-res-info' });
      var canvas = null;
      function size(node) { var v = Math.round(num(node, node === W ? 400 : 300)); return clamp(v || 1, 1, 2000); }
      function draw() {
        var ww = size(W), hh = size(H);
        T.placeholder = ww + ' × ' + hh;
        canvas = drawPlaceholder(ww, hh, bg.get(), fg.get(), T.value.trim());
        canvas.classList.add('g-out');
        prev.replaceChildren(canvas);
        info.textContent = ww + ' × ' + hh + ' px';
      }
      onChange([W, H, T, bg, fg], draw);
      draw();
      root.append(U.panel(null, presets, el('div', { class: 'row' }, w, h, bg, fg), text),
        U.panel('Preview', prev, info, U.btnrow(
          U.button('Download PNG', function () { toBlob(canvas, 'image/png').then(function (b) { U.saveBlob('placeholder-' + canvas.width + 'x' + canvas.height + '.png', b); }); }, 'primary'),
          U.button('Download JPG', function () { toBlob(canvas, 'image/jpeg', 0.92).then(function (b) { U.saveBlob('placeholder-' + canvas.width + 'x' + canvas.height + '.jpg', b); }); }),
          U.copyBtn('Copy Data URL', function () { return canvas.toDataURL('image/png'); }))));
    }
  });

  /* --- Add Border ---------------------------------------------------------- */

  function roundRect(x, px, py, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    x.beginPath();
    x.moveTo(px + r, py);
    x.arcTo(px + w, py, px + w, py + h, r);
    x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r);
    x.arcTo(px, py, px + w, py, r);
    x.closePath();
  }

  function addBorder(src, style, color, t, radius) {
    var w = src.width, h = src.height, c, x;
    if (style === 'shadow') {
      var pad = t * 2;
      c = makeCanvas(w + pad * 2, h + pad * 2); x = ctx2d(c);
      x.save();
      x.shadowColor = color; x.shadowBlur = t; x.shadowOffsetX = t / 3; x.shadowOffsetY = t / 3;
      roundRect(x, pad, pad, w, h, radius); x.fillStyle = '#fff'; x.fill();
      x.restore();
      x.save(); roundRect(x, pad, pad, w, h, radius); x.clip(); x.drawImage(src, pad, pad); x.restore();
      return c;
    }
    if (style === 'polaroid') {
      var bottom = t * 4;
      c = makeCanvas(w + t * 2, h + t + bottom); x = ctx2d(c);
      roundRect(x, 0, 0, c.width, c.height, radius); x.fillStyle = color; x.fill();
      x.drawImage(src, t, t);
      return c;
    }
    c = makeCanvas(w + t * 2, h + t * 2); x = ctx2d(c);
    x.save();
    roundRect(x, 0, 0, c.width, c.height, radius); x.clip();
    if (style === 'solid') { x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); }
    if (style === 'double') {
      var line = Math.max(1, t / 3);
      x.strokeStyle = color; x.lineWidth = line;
      roundRect(x, line / 2, line / 2, c.width - line, c.height - line, radius); x.stroke();
      roundRect(x, t - line / 2, t - line / 2, w + line, h + line, Math.max(0, radius - t)); x.stroke();
    }
    if (style === 'dashed') {
      x.strokeStyle = color; x.lineWidth = t; x.setLineDash([t * 1.5, t]);
      roundRect(x, t / 2, t / 2, c.width - t, c.height - t, radius); x.stroke();
    }
    roundRect(x, t, t, w, h, Math.max(0, radius - t)); x.clip();
    x.drawImage(src, t, t);
    x.restore();
    return c;
  }

  Tools.register({
    id: 'image-border', category: 'image', name: 'Add Border',
    description: 'Frame an image with a solid, dashed, double, drop-shadow or Polaroid border.',
    keywords: ['border', 'frame', 'polaroid', 'shadow', 'rounded corners', 'outline', 'padding'],
    render: function (root) {
      root$(root);
      var src = null;
      var style = U.select({ label: 'Border Style', options: [{ value: 'solid', label: 'Solid' }, { value: 'dashed', label: 'Dashed' }, { value: 'double', label: 'Double' }, { value: 'shadow', label: 'Drop Shadow' }, { value: 'polaroid', label: 'Polaroid' }] });
      var color = colorField('Color', '#000000');
      var thick = slider('Thickness: {}', { min: 2, max: 100, value: 20 }, function (v) { return v + 'px'; });
      var radius = slider('Corner Radius: {}', { min: 0, max: 80, value: 0 }, function (v) { return v + 'px'; });
      var out = resultPanel('Result');
      inputOf(style).addEventListener('change', function () {
        var v = inputOf(style).value;
        if (v === 'polaroid' && color.get() === '#000000') color.set('#ffffff');
        if (v === 'shadow' && color.get() === '#ffffff') color.set('#000000');
      });
      async function run() {
        if (!src) return;
        var c = addBorder(src.canvas, inputOf(style).value, color.get(), thick.get(), radius.get());
        out.show(c, await toBlob(c, 'image/png'), baseName(src.file.name) + '-border.png');
      }
      var ld = loader({ label: 'Drop image here or click to upload', hint: 'JPG, PNG, WebP, GIF…', onLoad: function (r) {
        src = r; settings.classList.remove('g-hide'); out.hide();
      } });
      var settings = U.panel(null, el('div', { class: 'row' }, style, color), el('div', { class: 'row' }, thick, radius),
        U.btnrow(U.button('Apply Border', function () { run().catch(function (e) { U.toast(e.message, 'err'); }); }, 'primary'), ld.change));
      settings.classList.add('g-hide');
      root.append(U.panel(null, ld.zone, ld.status, ld.picker), settings, out.node);
    }
  });

  /* --- Image to ASCII ------------------------------------------------------ */

  var ASCII_RAMP = '@%#*+=-:. ';

  function toAscii(canvas, cols) {
    var rows = Math.max(1, Math.floor(cols * canvas.height / canvas.width * 0.47));
    var c = makeCanvas(cols, rows), x = ctx2d(c);
    x.fillStyle = '#fff'; x.fillRect(0, 0, cols, rows);
    x.imageSmoothingQuality = 'high';
    x.drawImage(canvas, 0, 0, cols, rows);
    var d = x.getImageData(0, 0, cols, rows).data, lines = [];
    for (var y = 0; y < rows; y++) {
      var line = '';
      for (var xx = 0; xx < cols; xx++) {
        var i = (y * cols + xx) * 4, lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        line += ASCII_RAMP[Math.min(ASCII_RAMP.length - 1, Math.floor(lum / 255 * (ASCII_RAMP.length - 1) + 0.0001))];
      }
      lines.push(line);
    }
    return lines.join('\n');
  }

  Tools.register({
    id: 'image-ascii', category: 'image', name: 'Image to ASCII',
    description: 'Turn a picture into ASCII art with an adjustable number of columns.',
    keywords: ['ascii', 'ascii art', 'text art', 'characters', 'image to text'],
    render: function (root) {
      root$(root);
      var src = null, text = '';
      var cols = slider('Columns: {}', { min: 20, max: 200, value: 80 });
      var invert = U.checkbox('Invert (for light text on a dark background)');
      var out = el('pre', { class: 'g-ascii', text: 'Select an image to convert it to ASCII art.' });
      function run() {
        if (!src) return;
        text = toAscii(src.canvas, cols.get());
        if (invert.input.checked) text = text.replace(/[^\n]/g, function (ch) { return ASCII_RAMP[ASCII_RAMP.length - 1 - ASCII_RAMP.indexOf(ch)]; });
        out.textContent = text;
      }
      onChange([cols.input, invert.input], run);
      var ld = loader({ label: 'Drop image here or', hint: 'Choose Image', changeLabel: 'Choose Image', keepZone: false, onLoad: function (r) { src = r; run(); } });
      root.append(U.panel(null, cols, invert, ld.zone, ld.status, ld.picker, U.btnrow(ld.change)),
        U.panel(null, out, U.btnrow(U.copyBtn('Copy ASCII', function () { return text; }),
          U.button('Download TXT', function () { if (text) U.saveText('ascii-art.txt', text); else U.toast('Choose an image first', 'err'); }))));
    }
  });

  /* --- CSS Image Filters --------------------------------------------------- */

  var FILTER_DEFS = [
    ['brightness', 'Brightness', 0, 200, 100, '%'], ['contrast', 'Contrast', 0, 300, 100, '%'], ['saturate', 'Saturation', 0, 300, 100, '%'],
    ['hue-rotate', 'Hue Rotate', 0, 360, 0, 'deg'], ['sepia', 'Sepia', 0, 100, 0, '%'], ['grayscale', 'Grayscale', 0, 100, 0, '%'],
    ['blur', 'Blur', 0, 20, 0, 'px'], ['invert', 'Invert', 0, 100, 0, '%'], ['opacity', 'Opacity', 0, 100, 100, '%']
  ];
  var FILTER_ORDER = ['brightness', 'contrast', 'saturate', 'hue-rotate', 'blur', 'sepia', 'grayscale', 'invert', 'opacity'];
  var FILTER_PRESETS = {
    'Original': {},
    'Vivid': { brightness: 110, contrast: 120, saturate: 160 },
    'Vintage': { brightness: 105, contrast: 90, saturate: 80, sepia: 50, 'hue-rotate': 350 },
    'B&W': { grayscale: 100, contrast: 120 },
    'Cool Blue': { brightness: 105, saturate: 120, 'hue-rotate': 190, sepia: 20 },
    'Warm Sunset': { brightness: 110, contrast: 110, saturate: 140, sepia: 30, 'hue-rotate': 345 },
    'Faded': { brightness: 115, contrast: 75, saturate: 70, opacity: 90 },
    'Dreamy': { brightness: 115, contrast: 90, saturate: 120, blur: 1 },
    'High Contrast': { contrast: 200, saturate: 110 },
    'Night Vision': { brightness: 120, contrast: 150, grayscale: 100, sepia: 100, 'hue-rotate': 70, saturate: 300 }
  };

  function demoImage() {
    var c = makeCanvas(640, 420), x = ctx2d(c);
    var sky = x.createLinearGradient(0, 0, 0, 260); sky.addColorStop(0, '#2563eb'); sky.addColorStop(1, '#f59e0b');
    x.fillStyle = sky; x.fillRect(0, 0, 640, 420);
    x.fillStyle = '#fde68a'; x.beginPath(); x.arc(470, 170, 55, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#166534'; x.beginPath(); x.moveTo(0, 300); x.lineTo(160, 170); x.lineTo(320, 300); x.fill();
    x.fillStyle = '#15803d'; x.beginPath(); x.moveTo(200, 310); x.lineTo(390, 150); x.lineTo(600, 310); x.fill();
    var ground = x.createLinearGradient(0, 290, 0, 420); ground.addColorStop(0, '#22c55e'); ground.addColorStop(1, '#14532d');
    x.fillStyle = ground; x.fillRect(0, 290, 640, 130);
    x.fillStyle = '#dc2626'; x.fillRect(80, 320, 80, 60); x.fillStyle = '#7c2d12'; x.beginPath(); x.moveTo(70, 320); x.lineTo(120, 285); x.lineTo(170, 320); x.fill();
    x.fillStyle = '#e0f2fe'; x.fillRect(105, 345, 24, 35);
    return c;
  }

  Tools.register({
    id: 'image-filters', category: 'image', name: 'CSS Image Filters',
    description: 'Play with CSS filter effects and presets on an image, then copy the CSS or save the picture.',
    keywords: ['css filter', 'filters', 'brightness', 'contrast', 'sepia', 'hue rotate', 'instagram filter', 'blur', 'grayscale', 'invert'],
    render: function (root) {
      root$(root);
      var img = el('img', { class: 'g-filterimg', alt: 'Preview' });
      var source = demoImage(), name = 'demo';
      img.src = source.toDataURL('image/png');
      var sliders = {};
      FILTER_DEFS.forEach(function (f) {
        sliders[f[0]] = slider(f[1], { min: f[2], max: f[3], value: f[4] }, function (v) { return v + (f[5] === 'deg' ? '°' : f[5]); });
      });
      var cssOut = U.out('');
      function css() {
        return FILTER_ORDER.map(function (k) {
          var def = FILTER_DEFS.filter(function (f) { return f[0] === k; })[0];
          return k + '(' + sliders[k].get() + def[5] + ')';
        }).join(' ');
      }
      function update() { var v = css(); img.style.filter = v; cssOut.textContent = 'filter: ' + v + ';'; }
      Object.keys(sliders).forEach(function (k) { sliders[k].input.addEventListener('input', update); });
      var presetRow = choice(Object.keys(FILTER_PRESETS), 'Original', function (p) {
        FILTER_DEFS.forEach(function (f) { sliders[f[0]].set(FILTER_PRESETS[p][f[0]] !== undefined ? FILTER_PRESETS[p][f[0]] : f[4]); });
        update();
      });
      var picker = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
      picker.addEventListener('change', function () {
        var f = picker.files[0]; picker.value = '';
        if (!f) return;
        decodeFile(f).then(function (r) { source = r.canvas; name = baseName(f.name); img.src = r.canvas.toDataURL('image/png'); }).catch(function (e) { U.toast(e.message, 'err'); });
      });
      async function save() {
        var c = makeCanvas(source.width, source.height), x = ctx2d(c);
        x.filter = css();
        x.drawImage(source, 0, 0);
        if (x.filter === 'none' && css() !== 'none') U.toast('This browser cannot bake filters into a file; the CSS still works.', 'err');
        U.saveBlob(name + '-filtered.png', await toBlob(c, 'image/png'));
      }
      update();
      root.append(U.panel(null, presetRow, el('div', { class: 'g-prev g-check' }, img),
          U.btnrow(U.button('Upload Image', function () { picker.click(); }), U.button('Use Demo', function () { source = demoImage(); name = 'demo'; img.src = source.toDataURL('image/png'); }, 'ghost'),
            U.button('Download Image', function () { save().catch(function (e) { U.toast(e.message, 'err'); }); }, 'primary'), picker)),
        U.panel(null, el('div', { class: 'g-grid2' }, FILTER_DEFS.map(function (f) { return sliders[f[0]]; })),
          U.btnrow(U.button('Reset', function () { presetRow.set('Original'); FILTER_DEFS.forEach(function (f) { sliders[f[0]].set(f[4]); }); update(); }, 'ghost'))),
        U.panel('CSS Output', cssOut, U.btnrow(U.copyBtn('Copy', function () { return cssOut.textContent; }))));
    }
  });

  /* --- Signature Maker ----------------------------------------------------- */

  var SIG_FONTS = [
    ['Great Vibes', 'great-vibes'], ['Dancing Script', 'dancing-script'], ['Allura', 'allura'], ['Sacramento', 'sacramento'],
    ['Mrs Saint Delafield', 'mrs-saint-delafield'], ['Herr Von Muellerhoff', 'herr-von-muellerhoff'], ['Homemade Apple', 'homemade-apple'], ['Caveat', 'caveat']
  ];
  var sigFontsReady = null;
  function loadSigFonts() {
    if (sigFontsReady) return sigFontsReady;
    sigFontsReady = Promise.all(SIG_FONTS.map(function (f) {
      if (typeof FontFace === 'undefined') return null;
      var face = new FontFace(f[0], 'url(' + abs('assets/vendor/signature-fonts/' + f[1] + '-latin-400-normal.woff2') + ') format("woff2")');
      return face.load().then(function (loaded) { document.fonts.add(loaded); }).catch(function () { return null; });
    }));
    return sigFontsReady;
  }

  /* Crop a canvas to its non-transparent pixels plus padding. */
  function trimCanvas(c, pad) {
    var x = ctx2d(c), d = x.getImageData(0, 0, c.width, c.height).data;
    var minX = c.width, minY = c.height, maxX = -1, maxY = -1;
    for (var y = 0; y < c.height; y++) for (var xx = 0; xx < c.width; xx++) {
      if (d[(y * c.width + xx) * 4 + 3] > 8) { if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
    if (maxX < 0) return null;
    var out = makeCanvas(maxX - minX + 1 + pad * 2, maxY - minY + 1 + pad * 2);
    ctx2d(out).drawImage(c, minX, minY, maxX - minX + 1, maxY - minY + 1, pad, pad, maxX - minX + 1, maxY - minY + 1);
    out.box = { x: minX - pad, y: minY - pad, w: out.width, h: out.height };
    return out;
  }

  /* Otsu's method: a sensible starting threshold for ink on paper. */
  function otsu(hist, total) {
    var sum = 0, i; for (i = 0; i < 256; i++) sum += i * hist[i];
    var sumB = 0, wB = 0, best = 0, t = 128;
    for (i = 0; i < 256; i++) {
      wB += hist[i]; if (!wB) continue;
      var wF = total - wB; if (!wF) break;
      sumB += i * hist[i];
      var mB = sumB / wB, mF = (sum - sumB) / wF, between = wB * wF * (mB - mF) * (mB - mF);
      if (between > best) { best = between; t = i; }
    }
    return t;
  }

  Tools.register({
    id: 'signature-maker', category: 'image', name: 'Signature Maker',
    description: 'Draw, type or photograph your signature and save it as a transparent PNG, a JPG or an SVG.',
    keywords: ['signature maker', 'online signature', 'draw signature', 'transparent signature png', 'signature generator', 'e-signature', 'sign'],
    render: function (root) {
      root$(root);
      var ink = '#111111', penWidth = 3.5, mode = 'draw';
      var strokes = [], current = null;

      /* Ink colour */
      var inkBtns = [['Black ink', '#111111'], ['Blue ink', '#1d4ed8'], ['Dark blue ink', '#1e2a5a']].map(function (p) {
        return el('button', { class: 'g-sw', type: 'button', title: p[0], 'aria-label': p[0], style: { background: p[1] }, onclick: function () { setInk(p[1]); } });
      });
      var customInk = el('input', { type: 'color', value: '#111111', title: 'Custom ink colour', 'aria-label': 'Custom ink colour', oninput: function () { setInk(customInk.value); } });
      function setInk(c) {
        ink = c;
        inkBtns.forEach(function (b) { b.classList.toggle('on', b.style.background && rgbToHexCss(b.style.background) === c); });
        customInk.value = c;
        redraw(); paintType(); paintPhoto();
      }
      function rgbToHexCss(css) { var m = css.match(/\d+/g); return m ? rgbHex(+m[0], +m[1], +m[2]) : css; }

      /* Draw pane */
      var pad = makeCanvas(10, 10);
      var ph = el('div', { class: 'g-ph', text: 'Sign here with your finger, mouse or stylus' });
      var padWrap = el('div', { class: 'g-sigpad' }, el('div', { class: 'g-line' }), el('div', { class: 'g-xmark', text: '×' }), ph, pad);
      var pen = slider('Pen', { min: 1.5, max: 8, step: 0.5, value: 3.5 });
      pen.input.addEventListener('input', function () { penWidth = pen.get(); });
      var drawPane = el('div', {}, padWrap, el('div', { class: 'row', style: { alignItems: 'end', marginTop: '10px' } }, pen,
        U.button('Undo', function () { strokes.pop(); redraw(); }), U.button('Clear', function () { strokes = []; redraw(); }, 'ghost')),
        U.note('On a phone, turn it sideways for more room.'));
      var dpr = 1;
      function sizePad() {
        var b = padWrap.getBoundingClientRect();
        if (!b.width) return;
        dpr = window.devicePixelRatio || 1;
        pad.width = Math.round(b.width * dpr); pad.height = Math.round(b.height * dpr);
        redraw();
      }
      var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sizePad) : null;
      if (ro) ro.observe(padWrap);
      U.onTeardown(root, function () { if (ro) ro.disconnect(); });
      function strokePath(x, s, scale, ox, oy) {
        var pts = s.pts;
        x.strokeStyle = ink; x.fillStyle = ink; x.lineCap = 'round'; x.lineJoin = 'round';
        if (pts.length === 1) { x.beginPath(); x.arc((pts[0].x - ox) * scale, (pts[0].y - oy) * scale, s.w * scale / 2, 0, Math.PI * 2); x.fill(); return; }
        /* Width follows speed a little, like a real pen. */
        for (var i = 1; i < pts.length; i++) {
          var a = pts[i - 1], b = pts[i], prev = pts[i - 2] || a;
          x.lineWidth = s.w * scale * b.p;
          x.beginPath();
          x.moveTo(((prev.x + a.x) / 2 - ox) * scale, ((prev.y + a.y) / 2 - oy) * scale);
          x.quadraticCurveTo((a.x - ox) * scale, (a.y - oy) * scale, ((a.x + b.x) / 2 - ox) * scale, ((a.y + b.y) / 2 - oy) * scale);
          x.stroke();
        }
        var last = pts[pts.length - 1], before = pts[pts.length - 2];
        x.beginPath(); x.moveTo(((before.x + last.x) / 2 - ox) * scale, ((before.y + last.y) / 2 - oy) * scale); x.lineTo((last.x - ox) * scale, (last.y - oy) * scale); x.stroke();
      }
      function redraw() {
        var x = ctx2d(pad);
        x.clearRect(0, 0, pad.width, pad.height);
        strokes.forEach(function (s) { strokePath(x, s, dpr, 0, 0); });
        ph.style.display = strokes.length ? 'none' : '';
      }
      function pos(e) { var b = pad.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
      pad.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        pad.setPointerCapture(e.pointerId);
        var p = pos(e);
        current = { w: penWidth, pts: [{ x: p.x, y: p.y, p: 1, t: performance.now() }] };
        strokes.push(current);
        redraw();
      });
      pad.addEventListener('pointermove', function (e) {
        if (!current) return;
        var p = pos(e), last = current.pts[current.pts.length - 1], now = performance.now();
        var dist = Math.hypot(p.x - last.x, p.y - last.y);
        if (dist < 0.8) return;
        var speed = dist / Math.max(1, now - last.t);
        var pressure = e.pressure && e.pointerType === 'pen' ? 0.5 + e.pressure : clamp(1.35 - speed * 0.35, 0.55, 1.25);
        current.pts.push({ x: p.x, y: p.y, p: last.p * 0.6 + pressure * 0.4, t: now });
        redraw();
      });
      ['pointerup', 'pointercancel'].forEach(function (t) { pad.addEventListener(t, function () { current = null; }); });

      /* Type pane */
      var nameIn = U.input({ label: 'Your name', value: 'Alex Morgan', placeholder: 'Your name', 'aria-label': 'Your name' });
      var font = SIG_FONTS[0][0];
      var fontBtns = SIG_FONTS.map(function (f) {
        return el('button', { class: 'g-fontbtn' + (f[0] === font ? ' on' : ''), type: 'button', style: { fontFamily: '"' + f[0] + '", cursive' }, 'aria-pressed': f[0] === font ? 'true' : 'false',
          onclick: function () { font = f[0]; fontBtns.forEach(function (b, i) { b.classList.toggle('on', SIG_FONTS[i][0] === font); b.setAttribute('aria-pressed', SIG_FONTS[i][0] === font); }); paintType(); } }, 'Alex Morgan');
      });
      inputOf(nameIn).addEventListener('input', function () {
        var v = inputOf(nameIn).value || 'Your name';
        fontBtns.forEach(function (b) { b.textContent = v; });
        paintType();
      });
      var typeCanvas = makeCanvas(10, 10);
      var typePane = el('div', { class: 'g-hide' }, nameIn, el('div', { class: 'g-fonts', style: { marginTop: '10px' } }, fontBtns),
        el('h4', { text: 'Preview' }), el('div', { class: 'g-prev g-check' }, typeCanvas));
      function renderType(scale) {
        var text = inputOf(nameIn).value.trim();
        if (!text) return null;
        var size = 96 * (scale || 1), c = makeCanvas(10, 10), x = ctx2d(c);
        x.font = size + 'px "' + font + '", cursive';
        var w = x.measureText(text).width;
        c = makeCanvas(w + size * 1.2, size * 2); x = ctx2d(c);
        x.font = size + 'px "' + font + '", cursive';
        x.fillStyle = ink; x.textBaseline = 'middle';
        x.fillText(text, size * 0.6, size);
        return trimCanvas(c, Math.round(size * 0.18));
      }
      function paintType() {
        if (mode !== 'type') return;
        var t = renderType(0.6);
        if (t) { typeCanvas.width = t.width; typeCanvas.height = t.height; ctx2d(typeCanvas).drawImage(t, 0, 0); }
      }
      loadSigFonts().then(paintType);

      /* Photo pane */
      var photoSrc = null, photoCut = null;
      var remove = slider('Remove paper: {}', { min: 10, max: 245, value: 160 });
      var soft = slider('Edge softness: {}', { min: 0, max: 60, value: 18 });
      onChange([remove.input, soft.input], function () { paintPhoto(); });
      var photoPrev = el('div', { class: 'g-prev g-check' });
      var photoLd = loader({ label: 'Choose a photo of your signature', hint: 'Sign on white paper, with even light and no shadows', changeLabel: 'Choose another photo', onLoad: function (r) {
        var s = Math.min(1, 1600 / Math.max(r.width, r.height));
        photoSrc = makeCanvas(r.width * s, r.height * s);
        ctx2d(photoSrc).drawImage(r.canvas, 0, 0, photoSrc.width, photoSrc.height);
        var d = ctx2d(photoSrc).getImageData(0, 0, photoSrc.width, photoSrc.height).data, hist = new Array(256).fill(0);
        for (var i = 0; i < d.length; i += 4) hist[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])]++;
        remove.set(clamp(otsu(hist, d.length / 4) + 20, 10, 245));
        photoCtl.classList.remove('g-hide');
        paintPhoto();
      } });
      var photoCtl = el('div', { class: 'g-hide' }, el('div', { class: 'row' }, remove, soft), photoPrev,
        U.note('Raise Remove paper if grey shadows remain; lower it if thin parts of the signature disappear.'));
      var photoPane = el('div', { class: 'g-hide' }, photoLd.zone, photoLd.status, photoLd.picker, photoCtl, U.btnrow(photoLd.change));
      function paintPhoto() {
        if (!photoSrc) return;
        var t = remove.get(), f = soft.get();
        var c = makeCanvas(photoSrc.width, photoSrc.height), x = ctx2d(c), src = ctx2d(photoSrc).getImageData(0, 0, c.width, c.height), out = x.createImageData(c.width, c.height);
        var col = [parseInt(ink.slice(1, 3), 16), parseInt(ink.slice(3, 5), 16), parseInt(ink.slice(5, 7), 16)];
        for (var i = 0; i < src.data.length; i += 4) {
          var lum = 0.299 * src.data[i] + 0.587 * src.data[i + 1] + 0.114 * src.data[i + 2];
          var a = f > 0 ? clamp((t - lum) / f + 0.5, 0, 1) : (lum < t ? 1 : 0);
          out.data[i] = col[0]; out.data[i + 1] = col[1]; out.data[i + 2] = col[2]; out.data[i + 3] = Math.round(a * 255);
        }
        x.putImageData(out, 0, 0);
        photoCut = c;
        var t2 = trimCanvas(c, 20) || c;
        t2.classList.add('g-out');
        photoPrev.replaceChildren(t2);
      }

      /* Output */
      function finalCanvas() {
        if (mode === 'draw') {
          if (!strokes.length) return null;
          var scale = 3, c = makeCanvas(pad.width / dpr * scale, pad.height / dpr * scale), x = ctx2d(c);
          strokes.forEach(function (s) { strokePath(x, s, scale, 0, 0); });
          return trimCanvas(c, 24);
        }
        if (mode === 'type') return renderType(1.4);
        return photoCut ? trimCanvas(photoCut, 20) : null;
      }
      function svgFromStrokes() {
        var all = []; strokes.forEach(function (s) { all = all.concat(s.pts); });
        var minX = Math.min.apply(null, all.map(function (p) { return p.x; })) - 10, minY = Math.min.apply(null, all.map(function (p) { return p.y; })) - 10;
        var maxX = Math.max.apply(null, all.map(function (p) { return p.x; })) + 10, maxY = Math.max.apply(null, all.map(function (p) { return p.y; })) + 10;
        var f = function (n) { return +n.toFixed(1); };
        var paths = strokes.map(function (s) {
          var p = s.pts, d = 'M' + f(p[0].x - minX) + ' ' + f(p[0].y - minY);
          if (p.length === 1) d += 'l0.01 0';
          for (var i = 1; i < p.length; i++) {
            var mx = (p[i - 1].x + p[i].x) / 2 - minX, my = (p[i - 1].y + p[i].y) / 2 - minY;
            d += 'Q' + f(p[i - 1].x - minX) + ' ' + f(p[i - 1].y - minY) + ' ' + f(mx) + ' ' + f(my);
          }
          d += 'L' + f(p[p.length - 1].x - minX) + ' ' + f(p[p.length - 1].y - minY);
          return '<path d="' + d + '" stroke-width="' + s.w + '"/>';
        }).join('');
        return '<svg xmlns="http://www.w3.org/2000/svg" width="' + f(maxX - minX) + '" height="' + f(maxY - minY) + '" viewBox="0 0 ' + f(maxX - minX) + ' ' + f(maxY - minY) + '">' +
          '<g fill="none" stroke="' + ink + '" stroke-linecap="round" stroke-linejoin="round">' + paths + '</g></svg>';
      }
      async function exportAs(kind) {
        var c = finalCanvas();
        if (!c) return U.toast(mode === 'photo' ? 'Choose a photo first' : mode === 'type' ? 'Type your name first' : 'Sign in the box first', 'err');
        if (kind === 'png') U.saveBlob('signature.png', await toBlob(c, 'image/png'));
        else if (kind === 'jpg') U.saveBlob('signature.jpg', await toBlob(flatten(c, '#ffffff'), 'image/jpeg', 0.95));
        else if (kind === 'svg') U.saveText('signature.svg', svgFromStrokes(), 'image/svg+xml');
        else {
          try {
            var blob = await toBlob(c, 'image/png');
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            U.toast('Signature copied as an image');
          } catch (e) { U.toast('This browser blocked copying images. Download the PNG instead.', 'err'); }
        }
      }
      var svgBtn = U.button('SVG', function () { exportAs('svg'); });
      var tabs = choice([{ value: 'draw', label: 'Draw' }, { value: 'type', label: 'Type' }, { value: 'photo', label: 'From a photo' }], 'draw', function (v) {
        mode = v;
        drawPane.classList.toggle('g-hide', v !== 'draw'); typePane.classList.toggle('g-hide', v !== 'type'); photoPane.classList.toggle('g-hide', v !== 'photo');
        svgBtn.classList.toggle('g-hide', v !== 'draw');
        if (v === 'draw') sizePad();
        paintType();
      });
      tabs.classList.add('g-tabs');
      setInk('#111111');
      root.append(U.panel(null, tabs, drawPane, typePane, photoPane),
        U.panel(null, el('div', { class: 'row', style: { alignItems: 'center' } }, el('b', { text: 'Ink' }), inkBtns, customInk),
          U.btnrow(U.button('PNG, transparent', function () { exportAs('png'); }, 'primary'), U.button('JPG, white', function () { exportAs('jpg'); }), svgBtn,
            U.button('Copy image', function () { exportAs('copy'); }, 'ghost')),
          U.note('Images are trimmed to your signature with a little space around it, ready to place in documents. Nothing is uploaded. A signature image is an electronic signature, not a certified digital signature.')));
      requestAnimationFrame(sizePad);
    }
  });

  /* --- Online Whiteboard --------------------------------------------------- */

  var WB_KEY = 'att-whiteboard-v1';
  var WB_COLORS = ['#111111', '#ef4444', '#1d4ed8', '#16a34a', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280'];
  var WB_TOOLS = [
    ['pen', 'Pen', '✎', 'p'], ['hl', 'Highlighter', '▮', 'h'], ['eraser', 'Eraser', '⌫', 'e'], ['line', 'Line', '╱', 'l'],
    ['arrow', 'Arrow', '➚', 'a'], ['rect', 'Rectangle', '▭', 'r'], ['ellipse', 'Ellipse', '◯', 'o'], ['text', 'Text', 'T', 't'], ['hand', 'Move the board', '✋', '']
  ];

  function b64url(bytes) {
    var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64url(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '=';
    var bin = atob(str), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  async function packJson(obj) {
    var bytes = new TextEncoder().encode(JSON.stringify(obj));
    if (typeof CompressionStream === 'undefined') return 'j' + b64url(bytes);
    var z = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
    return 'z' + b64url(z);
  }
  async function unpackJson(str) {
    var bytes = unb64url(str.slice(1));
    if (str[0] === 'z') bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function segDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
    var t = l ? clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1) : 0;
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  function objPoints(o) {
    if (o.t === 'pen' || o.t === 'hl') return o.pts;
    if (o.t === 'line' || o.t === 'arrow') return [[o.x1, o.y1], [o.x2, o.y2]];
    if (o.t === 'rect') return [[o.x1, o.y1], [o.x2, o.y1], [o.x2, o.y2], [o.x1, o.y2], [o.x1, o.y1]];
    if (o.t === 'ellipse') {
      var cx = (o.x1 + o.x2) / 2, cy = (o.y1 + o.y2) / 2, rx = Math.abs(o.x2 - o.x1) / 2, ry = Math.abs(o.y2 - o.y1) / 2, pts = [];
      for (var i = 0; i <= 48; i++) pts.push([cx + rx * Math.cos(i / 48 * Math.PI * 2), cy + ry * Math.sin(i / 48 * Math.PI * 2)]);
      return pts;
    }
    return [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h], [o.x, o.y]];
  }
  function objBounds(o) {
    var p = objPoints(o), pad = (o.s || 2) * (o.t === 'hl' ? 3 : 1) + (o.t === 'arrow' ? o.s * 4 + 8 : 0);
    var xs = p.map(function (q) { return q[0]; }), ys = p.map(function (q) { return q[1]; });
    return { x1: Math.min.apply(null, xs) - pad, y1: Math.min.apply(null, ys) - pad, x2: Math.max.apply(null, xs) + pad, y2: Math.max.apply(null, ys) + pad };
  }
  function hitObj(o, x, y, r) {
    if (o.t === 'text') return x >= o.x - r && x <= o.x + o.w + r && y >= o.y - r && y <= o.y + o.h + r;
    var p = objPoints(o), tol = r + (o.s || 2) * (o.t === 'hl' ? 2 : 0.5);
    if (p.length === 1) return Math.hypot(x - p[0][0], y - p[0][1]) <= tol;
    for (var i = 1; i < p.length; i++) if (segDist(x, y, p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]) <= tol) return true;
    return false;
  }

  function drawObj(x, o) {
    x.save();
    x.strokeStyle = o.c; x.fillStyle = o.c; x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = o.s;
    if (o.t === 'hl') { x.globalAlpha = 0.35; x.lineWidth = o.s * 4; x.lineCap = 'butt'; }
    if (o.t === 'pen' || o.t === 'hl') {
      var p = o.pts;
      x.beginPath();
      if (p.length === 1) { x.arc(p[0][0], p[0][1], x.lineWidth / 2, 0, Math.PI * 2); x.fill(); x.restore(); return; }
      x.moveTo(p[0][0], p[0][1]);
      for (var i = 1; i < p.length - 1; i++) x.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
      x.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
      x.stroke();
    } else if (o.t === 'line' || o.t === 'arrow') {
      x.beginPath(); x.moveTo(o.x1, o.y1); x.lineTo(o.x2, o.y2); x.stroke();
      if (o.t === 'arrow') {
        var ang = Math.atan2(o.y2 - o.y1, o.x2 - o.x1), head = o.s * 3 + 10;
        x.beginPath();
        x.moveTo(o.x2, o.y2); x.lineTo(o.x2 - head * Math.cos(ang - 0.45), o.y2 - head * Math.sin(ang - 0.45));
        x.moveTo(o.x2, o.y2); x.lineTo(o.x2 - head * Math.cos(ang + 0.45), o.y2 - head * Math.sin(ang + 0.45));
        x.stroke();
      }
    } else if (o.t === 'rect') {
      x.strokeRect(Math.min(o.x1, o.x2), Math.min(o.y1, o.y2), Math.abs(o.x2 - o.x1), Math.abs(o.y2 - o.y1));
    } else if (o.t === 'ellipse') {
      x.beginPath();
      x.ellipse((o.x1 + o.x2) / 2, (o.y1 + o.y2) / 2, Math.abs(o.x2 - o.x1) / 2, Math.abs(o.y2 - o.y1) / 2, 0, 0, Math.PI * 2);
      x.stroke();
    } else if (o.t === 'text') {
      x.font = o.fs + 'px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
      x.textBaseline = 'top';
      o.text.split('\n').forEach(function (line, i) { x.fillText(line, o.x, o.y + i * o.fs * 1.2); });
    }
    x.restore();
  }

  Tools.register({
    id: 'online-whiteboard', category: 'image', name: 'Whiteboard',
    description: 'Sketch on an endless whiteboard with pens, shapes, arrows and text; save as PNG or share as a link.',
    keywords: ['online whiteboard', 'free whiteboard', 'draw online', 'digital whiteboard', 'sketch board', 'drawing', 'canvas'],
    render: function (root) {
      root$(root);
      var objs = [], undo = [], redo = [];
      var view = { x: 0, y: 0, z: 1 }, bg = 'grid';
      var tool = 'pen', color = WB_COLORS[0], size = 4;
      var canvas = el('canvas');
      var board = el('div', { class: 'g-board', tabIndex: 0 }, canvas);
      var zoomLabel = el('span', { class: 'g-info', style: { minWidth: '48px', textAlign: 'center', margin: '0 4px' }, text: '100%' });
      var shareOut = el('input', { type: 'text', readOnly: true, class: 'g-hide', style: { width: '100%', fontFamily: 'var(--mono)' } });
      var status = U.note('');

      function tb(label, text, fn, extra) {
        return el('button', Object.assign({ class: 'g-tb', type: 'button', title: label, 'aria-label': label, onclick: fn }, extra || {}), text);
      }
      var toolBtns = WB_TOOLS.map(function (t) {
        return tb(t[1] + (t[3] ? ' (' + t[3].toUpperCase() + ')' : ' (hold Space)'), t[2], function () { setTool(t[0]); }, { 'aria-label': t[1], 'aria-pressed': 'false', dataset: { tool: t[0] } });
      });
      var colorBtns = WB_COLORS.map(function (c) {
        return el('button', { class: 'g-sw', type: 'button', title: 'Colour ' + c, 'aria-label': 'Colour ' + c, style: { background: c }, onclick: function () { color = c; paintToolbar(); } });
      });
      var sizeBtns = [2, 4, 8].map(function (s) {
        return tb('Size ' + s, el('i', { style: { display: 'inline-block', width: s + 4 + 'px', height: s + 4 + 'px', borderRadius: '50%', background: 'currentColor' } }), function () { size = s; paintToolbar(); }, { 'aria-label': 'Size ' + s, dataset: { size: s } });
      });
      function paintToolbar() {
        toolBtns.forEach(function (b) { b.classList.toggle('on', b.dataset.tool === tool); b.setAttribute('aria-pressed', b.dataset.tool === tool); });
        colorBtns.forEach(function (b, i) { b.classList.toggle('on', WB_COLORS[i] === color); });
        sizeBtns.forEach(function (b) { b.classList.toggle('on', +b.dataset.size === size); });
        board.style.cursor = tool === 'hand' ? 'grab' : tool === 'text' ? 'text' : tool === 'eraser' ? 'cell' : 'crosshair';
      }
      function setTool(t) { commitText(); tool = t; paintToolbar(); }

      var bar = el('div', { class: 'g-toolbar' }, toolBtns, el('span', { class: 'g-sep' }), colorBtns, el('span', { class: 'g-sep' }), sizeBtns, el('span', { class: 'g-sep' }),
        tb('Undo', '↶', doUndo), tb('Redo', '↷', doRedo), el('span', { class: 'g-sep' }),
        tb('Zoom out', '−', function () { zoomAt(1 / 1.2); }), zoomLabel, tb('Zoom in', '+', function () { zoomAt(1.2); }), tb('Fit drawing to screen', '⤢', fit),
        el('span', { class: 'g-sep' }),
        tb('Background: grid, dots or blank', '▦', function () { bg = bg === 'grid' ? 'dots' : bg === 'dots' ? 'blank' : 'grid'; save(); paint(); }, { 'aria-label': 'Change background' }),
        tb('Download PNG', '⤓', downloadPng), tb('Share link', '🔗', share), tb('Clear board', '🗑', clearBoard), tb('Full screen', '⛶', fullScreen));
      var wrap = el('div', { class: 'stack' }, bar, board);

      /* --- geometry --- */
      function toWorld(sx, sy) { return { x: sx / view.z + view.x, y: sy / view.z + view.y }; }
      function screenPos(e) { var b = canvas.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
      function zoomAt(f, sx, sy) {
        var b = canvas.getBoundingClientRect();
        if (sx === undefined) { sx = b.width / 2; sy = b.height / 2; }
        var before = toWorld(sx, sy);
        view.z = clamp(view.z * f, 0.1, 8);
        view.x = before.x - sx / view.z; view.y = before.y - sy / view.z;
        paint(); saveSoon();
      }
      function fit() {
        var b = canvas.getBoundingClientRect();
        if (!objs.length) { view = { x: 0, y: 0, z: 1 }; paint(); return; }
        var bb = objs.map(objBounds).reduce(function (a, c) { return { x1: Math.min(a.x1, c.x1), y1: Math.min(a.y1, c.y1), x2: Math.max(a.x2, c.x2), y2: Math.max(a.y2, c.y2) }; });
        var pad = 40, z = clamp(Math.min((b.width - pad * 2) / (bb.x2 - bb.x1 || 1), (b.height - pad * 2) / (bb.y2 - bb.y1 || 1)), 0.1, 4);
        view.z = z;
        view.x = (bb.x1 + bb.x2) / 2 - b.width / 2 / z; view.y = (bb.y1 + bb.y2) / 2 - b.height / 2 / z;
        paint(); saveSoon();
      }

      /* --- painting --- */
      var dpr = 1;
      function resize() {
        var b = board.getBoundingClientRect();
        dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.round(b.width * dpr)); canvas.height = Math.max(1, Math.round(b.height * dpr));
        paint();
      }
      function paintBg(x, w, h) {
        x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
        if (bg === 'blank') return;
        var step = 32 * view.z; while (step < 12) step *= 2;
        var ox = -((view.x * view.z) % step), oy = -((view.y * view.z) % step);
        x.fillStyle = x.strokeStyle = bg === 'grid' ? '#e5e7eb' : '#cbd5e1';
        x.lineWidth = 1;
        if (bg === 'grid') {
          x.beginPath();
          for (var gx = ox; gx < w; gx += step) { x.moveTo(Math.round(gx) + 0.5, 0); x.lineTo(Math.round(gx) + 0.5, h); }
          for (var gy = oy; gy < h; gy += step) { x.moveTo(0, Math.round(gy) + 0.5); x.lineTo(w, Math.round(gy) + 0.5); }
          x.stroke();
        } else {
          for (var dx = ox; dx < w; dx += step) for (var dy = oy; dy < h; dy += step) x.fillRect(dx - 1, dy - 1, 2, 2);
        }
      }
      function paint() {
        var x = canvas.getContext('2d'), w = canvas.width / dpr, h = canvas.height / dpr;
        x.setTransform(dpr, 0, 0, dpr, 0, 0);
        paintBg(x, w, h);
        x.setTransform(dpr * view.z, 0, 0, dpr * view.z, -view.x * view.z * dpr, -view.y * view.z * dpr);
        objs.forEach(function (o) { drawObj(x, o); });
        if (drawing && drawing.obj) drawObj(x, drawing.obj);
        zoomLabel.textContent = Math.round(view.z * 100) + '%';
      }

      /* --- history & storage --- */
      function snapshot() { undo.push(objs.slice()); if (undo.length > 200) undo.shift(); redo = []; }
      function doUndo() { commitText(); if (!undo.length) return; redo.push(objs.slice()); objs = undo.pop(); paint(); save(); }
      function doRedo() { if (!redo.length) return; undo.push(objs.slice()); objs = redo.pop(); paint(); save(); }
      function save() { try { localStorage.setItem(WB_KEY, JSON.stringify({ objs: objs, bg: bg, view: view })); } catch (e) { /* storage full or blocked */ } }
      var saveSoon = U.debounce(save, 400);
      function load() {
        try {
          var s = JSON.parse(localStorage.getItem(WB_KEY) || 'null');
          if (s && Array.isArray(s.objs)) { objs = s.objs; bg = s.bg || 'grid'; if (s.view) view = s.view; }
        } catch (e) { /* ignore a corrupt save */ }
      }

      /* --- input --- */
      var drawing = null, pointers = {}, spaceDown = false, pinch = null;
      function newObj(w, shift) {
        if (tool === 'pen' || tool === 'hl') return { t: tool, c: color, s: size, pts: [[w.x, w.y]] };
        return { t: tool, c: color, s: size, x1: w.x, y1: w.y, x2: w.x, y2: w.y };
      }
      function constrain(o, shift) {
        if (!shift) return;
        var dx = o.x2 - o.x1, dy = o.y2 - o.y1;
        if (o.t === 'rect' || o.t === 'ellipse') { var m = Math.max(Math.abs(dx), Math.abs(dy)); o.x2 = o.x1 + m * Math.sign(dx || 1); o.y2 = o.y1 + m * Math.sign(dy || 1); }
        else { var ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI / 4, len = Math.hypot(dx, dy); o.x2 = o.x1 + Math.cos(ang) * len; o.y2 = o.y1 + Math.sin(ang) * len; }
      }
      function eraseAt(w) {
        var r = 8 / view.z, before = objs.length;
        objs = objs.filter(function (o) { return !hitObj(o, w.x, w.y, r); });
        if (objs.length !== before) paint();
      }
      canvas.addEventListener('pointerdown', function (e) {
        board.focus({ preventScroll: true });
        canvas.setPointerCapture(e.pointerId);
        var sp = screenPos(e);
        pointers[e.pointerId] = sp;
        var ids = Object.keys(pointers);
        if (ids.length === 2) {
          /* Second finger: switch to pinch-zoom and drop the half-drawn stroke. */
          drawing = null;
          var a = pointers[ids[0]], b = pointers[ids[1]];
          pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, view: Object.assign({}, view) };
          paint();
          return;
        }
        if (tool === 'hand' || spaceDown || e.button === 1) { drawing = { pan: true, start: sp, view: Object.assign({}, view) }; board.style.cursor = 'grabbing'; return; }
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        var w = toWorld(sp.x, sp.y);
        if (tool === 'text') { e.preventDefault(); startText(w); return; }
        commitText();
        snapshot();
        if (tool === 'eraser') { drawing = { erase: true }; eraseAt(w); return; }
        drawing = { obj: newObj(w), start: w };
        paint();
      });
      canvas.addEventListener('pointermove', function (e) {
        if (!(e.pointerId in pointers)) return;
        var sp = screenPos(e);
        pointers[e.pointerId] = sp;
        if (pinch) {
          var ids = Object.keys(pointers); if (ids.length < 2) return;
          var a = pointers[ids[0]], b = pointers[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          var z = clamp(pinch.view.z * d / (pinch.dist || 1), 0.1, 8);
          var anchor = { x: pinch.mid.x / pinch.view.z + pinch.view.x, y: pinch.mid.y / pinch.view.z + pinch.view.y };
          view.z = z; view.x = anchor.x - mid.x / z; view.y = anchor.y - mid.y / z;
          paint(); return;
        }
        if (!drawing) return;
        if (drawing.pan) {
          view.x = drawing.view.x - (sp.x - drawing.start.x) / view.z; view.y = drawing.view.y - (sp.y - drawing.start.y) / view.z;
          paint(); return;
        }
        var w = toWorld(sp.x, sp.y);
        if (drawing.erase) return eraseAt(w);
        var o = drawing.obj;
        if (o.pts) {
          if (e.shiftKey) o.pts = [o.pts[0], [w.x, w.y]];
          else { var last = o.pts[o.pts.length - 1]; if (Math.hypot(w.x - last[0], w.y - last[1]) * view.z > 1) o.pts.push([+w.x.toFixed(1), +w.y.toFixed(1)]); }
        } else { o.x2 = w.x; o.y2 = w.y; constrain(o, e.shiftKey); }
        paint();
      });
      function endPointer(e) {
        delete pointers[e.pointerId];
        if (pinch) { if (Object.keys(pointers).length < 2) { pinch = null; saveSoon(); } return; }
        if (!drawing) return;
        if (drawing.obj) {
          var o = drawing.obj;
          var tiny = !o.pts && Math.hypot(o.x2 - o.x1, o.y2 - o.y1) < 2;
          if (!tiny) objs.push(o); else undo.pop();
        } else if (drawing.erase) {
          if (undo.length && undo[undo.length - 1].length === objs.length) undo.pop();
        }
        if (drawing.pan) paintToolbar();
        drawing = null;
        paint(); save();
      }
      canvas.addEventListener('pointerup', endPointer);
      canvas.addEventListener('pointercancel', endPointer);
      board.addEventListener('wheel', function (e) {
        e.preventDefault();
        var sp = screenPos(e);
        if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-clamp(e.deltaY, -100, 100) * 0.002), sp.x, sp.y);
        else { view.x += e.deltaX / view.z; view.y += e.deltaY / view.z; paint(); saveSoon(); }
      }, { passive: false });

      /* Text: a floating textarea that becomes a text object. */
      var editor = null;
      function startText(w) {
        commitText();
        var fs = 12 + size * 4;
        var ta = el('textarea', { rows: 1, spellcheck: false });
        ta.style.left = (w.x - view.x) * view.z + 'px';
        ta.style.top = (w.y - view.y) * view.z + 'px';
        ta.style.font = fs * view.z + 'px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
        ta.style.color = color;
        var grow = function () { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; ta.style.width = 'auto'; ta.style.width = Math.max(60, ta.scrollWidth + 8) + 'px'; };
        ta.addEventListener('input', grow);
        ta.addEventListener('keydown', function (e) {
          e.stopPropagation();
          if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); commitText(); }
        });
        ta.addEventListener('blur', function () { setTimeout(commitText, 0); });
        board.appendChild(ta);
        editor = { ta: ta, w: w, fs: fs, c: color };
        setTimeout(function () { ta.focus(); grow(); }, 0);
      }
      function commitText() {
        if (!editor) return;
        var ed = editor; editor = null;
        var text = ed.ta.value.replace(/\s+$/, '');
        ed.ta.remove();
        if (!text) return;
        var mx = canvas.getContext('2d');
        mx.font = ed.fs + 'px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
        var lines = text.split('\n'), wmax = Math.max.apply(null, lines.map(function (l) { return mx.measureText(l).width; }));
        snapshot();
        objs.push({ t: 'text', c: ed.c, s: size, x: ed.w.x, y: ed.w.y, fs: ed.fs, text: text, w: wmax, h: lines.length * ed.fs * 1.2 });
        paint(); save();
      }

      /* Keyboard shortcuts while the board is on screen. */
      function onKey(e) {
        var tag = (e.target && e.target.tagName) || '';
        if (/INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable)) return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); doRedo(); return; }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === ' ') { if (!spaceDown) { spaceDown = true; board.style.cursor = 'grab'; } e.preventDefault(); return; }
        var t = WB_TOOLS.filter(function (x) { return x[3] === e.key.toLowerCase(); })[0];
        if (t) { setTool(t[0]); e.preventDefault(); }
        else if (e.key === '+' || e.key === '=') zoomAt(1.2);
        else if (e.key === '-') zoomAt(1 / 1.2);
      }
      function onKeyUp(e) { if (e.key === ' ') { spaceDown = false; paintToolbar(); } }
      document.addEventListener('keydown', onKey);
      document.addEventListener('keyup', onKeyUp);

      /* --- export, share, clear, fullscreen --- */
      function renderPng() {
        if (!objs.length) return null;
        var bb = objs.map(objBounds).reduce(function (a, c) { return { x1: Math.min(a.x1, c.x1), y1: Math.min(a.y1, c.y1), x2: Math.max(a.x2, c.x2), y2: Math.max(a.y2, c.y2) }; });
        var pad = 40, scale = 2, w = bb.x2 - bb.x1 + pad * 2, h = bb.y2 - bb.y1 + pad * 2;
        scale = Math.min(scale, 8000 / Math.max(w, h));
        var c = makeCanvas(w * scale, h * scale), x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
        x.setTransform(scale, 0, 0, scale, (pad - bb.x1) * scale, (pad - bb.y1) * scale);
        objs.forEach(function (o) { drawObj(x, o); });
        return c;
      }
      function downloadPng() {
        commitText();
        var c = renderPng();
        if (!c) return U.toast('The board is empty', 'err');
        toBlob(c, 'image/png').then(function (b) { U.saveBlob('whiteboard.png', b); });
      }
      async function share() {
        commitText();
        if (!objs.length) return U.toast('Draw something first', 'err');
        var packed = await packJson({ v: 1, bg: bg, o: objs });
        var q = new URLSearchParams(location.search); q.set('wb', packed);
        var url = location.origin + location.pathname + '?' + q.toString() + '#/t/online-whiteboard';
        shareOut.value = url;
        shareOut.classList.remove('g-hide');
        status.className = 'note' + (url.length > 60000 ? ' err' : '');
        status.textContent = url.length > 60000 ? 'This board is large (' + Math.round(url.length / 1000) + ' k characters); some apps may cut the link short. Download the PNG instead if it fails.'
          : 'Anyone who opens this link sees a copy of this board. It works wherever this app is available.';
        U.copy(url);
        shareOut.select();
      }
      function clearBoard() {
        commitText();
        if (!objs.length) return;
        snapshot(); objs = []; paint(); save();
        U.toast('Board cleared. Press Undo to bring it back.');
      }
      function fullScreen() {
        var target = wrap;
        if (document.fullscreenElement) { document.exitFullscreen(); return; }
        if (target.requestFullscreen) target.requestFullscreen().then(function () { target.style.background = 'var(--bg)'; board.style.height = 'calc(100vh - 60px)'; setTimeout(resize, 50); }).catch(function () { board.classList.toggle('g-full'); setTimeout(resize, 50); });
        else { board.classList.toggle('g-full'); setTimeout(resize, 50); }
      }
      function onFs() { if (!document.fullscreenElement) { wrap.style.background = ''; board.style.height = ''; setTimeout(resize, 50); } }
      document.addEventListener('fullscreenchange', onFs);

      var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
      if (ro) ro.observe(board);
      U.onTeardown(root, function () {
        commitText();
        save();
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('keyup', onKeyUp);
        document.removeEventListener('fullscreenchange', onFs);
        if (ro) ro.disconnect();
        if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
      });

      load();
      /* A shared board arrives as ?wb=… ; load it, then tidy the address bar. */
      var shared = new URLSearchParams(location.search).get('wb');
      if (shared) {
        unpackJson(shared).then(function (data) {
          if (objs.length) snapshot();
          objs = data.o || []; bg = data.bg || bg;
          status.className = 'note ok';
          status.textContent = 'Loaded a shared board.' + (undo.length ? ' Press Undo to go back to the board you had saved here.' : '');
          var q = new URLSearchParams(location.search); q.delete('wb');
          history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
          fit(); save();
        }).catch(function () { status.className = 'note err'; status.textContent = 'That share link is damaged or incomplete.'; });
      }
      paintToolbar();
      root.append(wrap,
        U.note('Draw anywhere. Scroll or drag with two fingers to move, Ctrl + scroll or pinch to zoom.'),
        U.note('Keys: P pen, H highlighter, E eraser, L line, A arrow, R rectangle, O ellipse, T text, hold Space to move, Shift for straight lines and squares. Your board is saved in this browser.'),
        shareOut, status);
      requestAnimationFrame(resize);
    }
  });

  /* --- Online Photo Booth -------------------------------------------------- */

  var BOOTH_FILTERS = [
    ['Natural', 'none'], ['Black & white', 'grayscale(1)'], ['Noir', 'grayscale(1) contrast(1.45) brightness(0.9)'],
    ['Sepia', 'sepia(0.85)'], ['Vintage', 'sepia(0.4) contrast(0.9) saturate(0.85) brightness(1.05)'],
    ['Warm', 'sepia(0.2) saturate(1.35) hue-rotate(-8deg) brightness(1.03)'], ['Cool', 'saturate(1.05) hue-rotate(12deg) brightness(1.04) contrast(1.02)'],
    ['Pop', 'saturate(1.8) contrast(1.15)'], ['Faded', 'contrast(0.8) saturate(0.7) brightness(1.1)']
  ];
  var BOOTH_FRAMES = [['White', '#ffffff'], ['Black', '#111111'], ['Pink', '#fbcfe8'], ['Mint', '#bbf7d0'], ['Sky', '#bfdbfe'], ['Gold', '#fde68a']];
  var BOOTH_LAYOUTS = { single: { n: 1, label: 'Single photo' }, strip: { n: 4, label: 'Strip of 4' }, grid: { n: 4, label: '2 × 2 grid' } };

  /* Lay shots out on a frame with an optional caption and date. */
  function composeBooth(shots, o) {
    var PW = 600, PH = 450, pad = 36, gap = 18, capH = (o.caption || o.date) ? 120 : pad;
    var cols = o.layout === 'grid' ? 2 : 1, rows = o.layout === 'strip' ? 4 : o.layout === 'grid' ? 2 : 1;
    var W = pad * 2 + cols * PW + (cols - 1) * gap, H = pad + rows * PH + (rows - 1) * gap + capH;
    var c = makeCanvas(W, H), x = ctx2d(c);
    x.fillStyle = o.frame; x.fillRect(0, 0, W, H);
    for (var i = 0; i < rows * cols; i++) {
      var shot = shots[i % shots.length], col = i % cols, row = Math.floor(i / cols);
      var dx = pad + col * (PW + gap), dy = pad + row * (PH + gap);
      x.save();
      x.filter = o.filter || 'none';
      drawCover(x, shot, dx, dy, PW, PH);
      x.restore();
    }
    var dark = o.frame === '#111111';
    x.fillStyle = dark ? '#f5f5f5' : '#1f2937';
    x.textAlign = 'center';
    var cy = pad + rows * PH + (rows - 1) * gap;
    if (o.caption) {
      x.font = '600 38px "Caveat", "Segoe Print", "Comic Sans MS", cursive';
      x.fillText(o.caption, W / 2, cy + (o.date ? 58 : 72), W - pad * 2);
    }
    if (o.date) {
      x.font = '20px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
      x.fillStyle = dark ? '#bdbdbd' : '#6b7280';
      x.fillText(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }), W / 2, cy + (o.caption ? 94 : 72));
    }
    return c;
  }

  Tools.register({
    id: 'photo-booth', category: 'image', name: 'Photo Booth',
    description: 'Take a single shot, a strip of four or a 2 × 2 grid with your camera, with filters, countdown, frame and caption.',
    keywords: ['online photo booth', 'webcam photo booth', 'photo strip maker', 'selfie camera online', 'take a picture online', 'camera', 'webcam'],
    render: function (root) {
      root$(root);
      var stream = null, busy = false, shots = [], result = null;
      var filter = 'none', layout = 'strip', countdown = 3, frame = '#ffffff', shutter = true;
      var video = el('video', { autoplay: true, playsInline: true, muted: true });
      video.muted = true;
      var countEl = el('div', { class: 'g-count' }), flash = el('div', { class: 'g-flash' });
      var camMsg = el('div', { style: { padding: '20px', textAlign: 'center' } }, el('div', { text: 'Photo booth', style: { fontSize: '22px', fontWeight: '700' } }),
        el('div', { class: 'g-muted', style: { color: '#bbb' }, text: 'Take a single photo, a classic strip of four, or a 2 × 2 grid, with filters and a caption. Photos never leave your device.' }));
      var cam = el('div', { class: 'g-cam' }, camMsg, countEl, flash);
      var status = U.note('');
      var startBtn = U.button('Start camera', startCamera, 'primary');
      var takeBtn = U.button('Take 4 photos', function () { takeSequence(); }, 'primary');
      takeBtn.disabled = true;
      var filterChips = choice(BOOTH_FILTERS.map(function (f) { return { value: f[1], label: f[0] }; }), 'none', function (v) { filter = v; video.style.filter = v; if (shots.length) compose(); });
      var layoutChips = choice(Object.keys(BOOTH_LAYOUTS).map(function (k) { return { value: k, label: BOOTH_LAYOUTS[k].label }; }), 'strip', function (v) {
        layout = v; takeBtn.textContent = BOOTH_LAYOUTS[v].n === 1 ? 'Take a photo' : 'Take ' + BOOTH_LAYOUTS[v].n + ' photos';
        if (shots.length) compose();
      });
      var countChips = choice([{ value: '3', label: '3 s' }, { value: '5', label: '5 s' }, { value: '10', label: '10 s' }], '3', function (v) { countdown = +v; });
      var caption = el('input', { type: 'text', value: 'Photo booth', placeholder: "Sara's birthday", maxLength: 60 });
      var frameBtns = BOOTH_FRAMES.map(function (f) {
        return el('button', { class: 'g-sw' + (f[1] === frame ? ' on' : ''), type: 'button', title: f[0] + ' frame', 'aria-label': f[0] + ' frame', style: { background: f[1] },
          onclick: function () { frame = f[1]; frameBtns.forEach(function (b, i) { b.classList.toggle('on', BOOTH_FRAMES[i][1] === frame); }); if (shots.length) compose(); } });
      });
      var dateBox = U.checkbox('Date', { checked: true });
      var shutterBtn = el('button', { class: 'chip on', type: 'button', 'aria-pressed': 'true', text: 'Shutter', title: 'Shutter sound', onclick: function () {
        shutter = !shutter; shutterBtn.classList.toggle('on', shutter); shutterBtn.setAttribute('aria-pressed', shutter);
      } });
      onChange([caption, dateBox.input], function () { if (shots.length) compose(); });

      var outWrap = el('div', { class: 'g-prev' });
      var resPanel = U.panel('Your photos', outWrap, el('div', { class: 'g-info g-res-info' }),
        U.btnrow(U.button('Download PNG', function () { if (result) toBlob(result, 'image/png').then(function (b) { U.saveBlob('photo-booth-' + layout + '.png', b); }); }, 'primary'),
          U.button('Download JPG', function () { if (result) toBlob(result, 'image/jpeg', 0.92).then(function (b) { U.saveBlob('photo-booth-' + layout + '.jpg', b); }); }),
          U.button('Retake', function () { shots = []; resPanel.classList.add('g-hide'); }, 'ghost')));
      resPanel.classList.add('g-hide');

      var filePicker = el('input', { type: 'file', accept: 'image/*', multiple: true, style: { display: 'none' } });
      filePicker.addEventListener('change', async function () {
        var files = Array.prototype.slice.call(filePicker.files); filePicker.value = '';
        var list = [];
        for (var i = 0; i < files.length; i++) { try { list.push((await decodeFile(files[i])).canvas); } catch (e) { U.toast(e.message, 'err'); } }
        if (!list.length) return;
        shots = list;
        compose();
      });

      function compose() {
        result = composeBooth(shots, { layout: layout, filter: filter, frame: frame, caption: caption.value.trim(), date: dateBox.input.checked });
        result.classList.add('g-out');
        result.style.maxHeight = '640px';
        outWrap.replaceChildren(result);
        resPanel.querySelector('.g-res-info').textContent = result.width + ' × ' + result.height + ' px · ' + BOOTH_LAYOUTS[layout].label;
        resPanel.classList.remove('g-hide');
      }

      async function startCamera() {
        status.className = 'note'; status.textContent = '';
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          status.className = 'note err'; status.textContent = 'This browser cannot use a camera here (it needs https:// or localhost). You can still use photos from your device.'; return;
        }
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
          video.srcObject = stream;
          video.style.filter = filter;
          cam.replaceChildren(video, countEl, flash);
          takeBtn.disabled = false;
          startBtn.textContent = 'Stop camera';
          startBtn.onclick = stopCamera;
        } catch (e) {
          status.className = 'note err';
          status.textContent = e.name === 'NotAllowedError' ? 'Camera permission was refused. Allow the camera in your browser’s site settings and try again.'
            : e.name === 'NotFoundError' ? 'No camera was found on this device.' : 'Could not start the camera: ' + (e.message || e.name);
        }
      }
      function stopCamera() {
        if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
        stream = null; takeBtn.disabled = true;
        cam.replaceChildren(camMsg, countEl, flash);
        startBtn.textContent = 'Start camera'; startBtn.onclick = startCamera;
      }
      var audio = null;
      function click() {
        if (!shutter) return;
        try {
          audio = audio || new (window.AudioContext || window.webkitAudioContext)();
          var len = audio.sampleRate * 0.09, buf = audio.createBuffer(1, len, audio.sampleRate), d = buf.getChannelData(0);
          for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
          var src = audio.createBufferSource(), g = audio.createGain(); g.gain.value = 0.5;
          src.buffer = buf; src.connect(g); g.connect(audio.destination); src.start();
        } catch (e) { /* sound is optional */ }
      }
      function grab() {
        var w = video.videoWidth, h = video.videoHeight, c = makeCanvas(w, h), x = ctx2d(c);
        x.translate(w, 0); x.scale(-1, 1);
        x.drawImage(video, 0, 0, w, h);
        return c;
      }
      var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
      async function takeSequence() {
        if (!stream || busy) return;
        busy = true; takeBtn.disabled = true;
        var list = [];
        for (var n = 0; n < BOOTH_LAYOUTS[layout].n; n++) {
          for (var s = countdown; s > 0; s--) { if (!stream) break; countEl.textContent = s; await sleep(1000); }
          countEl.textContent = '';
          if (!stream) break;
          click();
          flash.style.transition = 'none'; flash.style.opacity = '0.9';
          list.push(grab());
          requestAnimationFrame(function () { flash.style.transition = 'opacity .35s'; flash.style.opacity = '0'; });
          await sleep(400);
        }
        busy = false; takeBtn.disabled = !stream;
        if (list.length) { shots = list; compose(); }
      }
      U.onTeardown(root, function () { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); if (audio) audio.close(); });

      root.append(
        U.panel(null, cam, status, U.btnrow(startBtn, takeBtn, U.button('Use photos from this device', function () { filePicker.click(); }, 'ghost'), filePicker)),
        U.panel(null,
          el('div', { class: 'field' }, el('label', { text: 'Filter' }), filterChips),
          el('div', { class: 'field' }, el('label', { text: 'Layout' }), layoutChips),
          el('div', { class: 'field' }, el('label', { text: 'Countdown' }), countChips),
          el('div', { class: 'field' }, el('label', { text: 'Caption' }), caption),
          el('div', { class: 'field' }, el('label', { text: 'Frame' }), el('div', { class: 'row', style: { alignItems: 'center' } }, frameBtns)),
          el('div', { class: 'row', style: { alignItems: 'center' } }, dateBox, shutterBtn)),
        resPanel);
      loadSigFonts();
    }
  });

  /* --- Passport & ID Photo Maker ------------------------------------------- */

  var PASSPORT_DOCS = [
    { id: 'us', label: 'US passport & visa (2 x 2 in)', w: 50.8, h: 50.8, head: [25.4, 34.9], hint: 'Head 1 to 1 3/8 in, plain white or off-white background, no glasses.' },
    { id: 'uk', label: 'UK passport (35 x 45 mm)', w: 35, h: 45, head: [29, 34], hint: 'Head 29 to 34 mm, plain cream or light grey background.' },
    { id: 'schengen', label: 'Schengen visa & EU passports (35 x 45 mm)', w: 35, h: 45, head: [32, 36], hint: 'Head 32 to 36 mm, plain light background, neutral expression.' },
    { id: 'canada', label: 'Canada passport (50 x 70 mm)', w: 50, h: 70, head: [31, 36], hint: 'Head 31 to 36 mm from chin to crown, plain white or light background.' },
    { id: 'india', label: 'India passport & visa (2 x 2 in)', w: 50.8, h: 50.8, head: [25.4, 34.9], hint: 'Plain white background, face fully visible.' },
    { id: 'china', label: 'China visa (33 x 48 mm)', w: 33, h: 48, head: [28, 33], hint: 'Head 28 to 33 mm, white background, no head covering.' },
    { id: 'australia', label: 'Australia passport (35 x 45 mm)', w: 35, h: 45, head: [32, 36], hint: 'Head 32 to 36 mm, plain white or light grey background.' },
    { id: 'japan', label: 'Japan passport (35 x 45 mm)', w: 35, h: 45, head: [32, 36], hint: 'Head 32 to 36 mm, plain background with no shadows.' },
    { id: 'generic-35x45', label: 'Other 35 x 45 mm photo', w: 35, h: 45, head: [32, 36], hint: 'The most common ID photo size in the world.' },
    { id: '40x60', label: '4 x 6 cm photo', w: 40, h: 60, head: [36, 42], hint: 'Used for some visas and national ID cards.' },
    { id: '30x40', label: '3 x 4 cm photo', w: 30, h: 40, head: [24, 28], hint: 'Used for some ID cards, school and work badges.' }
  ];
  var PASSPORT_SHEETS = [
    { id: '4x6', label: '4 x 6 in photo print', name: '4 x 6 in photo print', w: 152.4, h: 101.6 },
    { id: '5x7', label: '5 x 7 in photo print', name: '5 x 7 in photo print', w: 177.8, h: 127 },
    { id: 'a4', label: 'A4 paper', name: 'A4 paper', w: 297, h: 210 },
    { id: 'letter', label: 'US Letter paper', name: 'US Letter paper', w: 279.4, h: 215.9 }
  ];
  var DPI = 300, MM = DPI / 25.4;
  function mmPx(mm) { return Math.round(mm * MM); }

  /* How many photos fit on a sheet, trying both orientations (2 mm gaps, 3 mm margins). */
  function sheetLayout(doc, sheet) {
    var pw = mmPx(doc.w), ph = mmPx(doc.h), gap = 2 * MM, margin = 3 * MM, best = null;
    [[mmPx(sheet.w), mmPx(sheet.h)], [mmPx(sheet.h), mmPx(sheet.w)]].forEach(function (dim) {
      var cols = Math.floor((dim[0] - 2 * margin + gap) / (pw + gap)), rows = Math.floor((dim[1] - 2 * margin + gap) / (ph + gap));
      cols = Math.max(0, cols); rows = Math.max(0, rows);
      if (!best || cols * rows > best.n) best = { n: cols * rows, cols: cols, rows: rows, W: dim[0], H: dim[1], pw: pw, ph: ph, gap: gap };
    });
    return best;
  }

  /* Mark a canvas JPEG as 300 DPI so it prints at the right physical size. */
  async function jpeg300(canvas) {
    var blob = await toBlob(flatten(canvas, '#ffffff'), 'image/jpeg', 0.95);
    var b = new Uint8Array(await blob.arrayBuffer());
    if (b[2] === 0xFF && b[3] === 0xE0 && b[6] === 0x4A && b[7] === 0x46) {
      b[13] = 1; b[14] = DPI >> 8; b[15] = DPI & 255; b[16] = DPI >> 8; b[17] = DPI & 255;
    }
    return new Blob([b], { type: 'image/jpeg' });
  }

  Tools.register({
    id: 'passport-photo-maker', category: 'image', name: 'Passport & ID Photo Maker',
    description: 'Line up a passport, visa or ID photo at your country’s size with head guides, then download it or a print sheet.',
    keywords: ['passport photo maker', 'passport photo online', 'visa photo', '2x2 photo', '35x45 photo', 'id photo', 'print sheet', 'biometric'],
    render: function (root) {
      root$(root);
      var img = null, tf = { zoom: 1, rot: 0, bright: 100, tx: 0, ty: 0 }, camStream = null;
      var docSel = U.select({ label: 'Document', value: 'schengen', options: PASSPORT_DOCS.map(function (d) { return { value: d.id, label: d.label }; }) });
      var sheetSel = U.select({ label: 'Print sheet', value: '4x6', options: PASSPORT_SHEETS.map(function (s) { return { value: s.id, label: s.label }; }) });
      var D = inputOf(docSel), S = inputOf(sheetSel);
      var hint = el('p', { class: 'note' }), fitNote = el('p', { class: 'note' });
      var sheetBtn = U.button('Download print sheet', function () { downloadSheet(); }, 'primary');
      var singleBtn = U.button('Download single photo', function () { downloadSingle(); });
      function doc() { return PASSPORT_DOCS.filter(function (d) { return d.id === D.value; })[0]; }
      function sheet() { return PASSPORT_SHEETS.filter(function (s) { return s.id === S.value; })[0]; }

      /* Editor */
      var view = makeCanvas(10, 10);
      var topGuide = el('div', { class: 'g-guide' }, el('span', { text: 'Top of hair' }));
      var chinGuide = el('div', { class: 'g-guide' }, el('span', { text: 'Chin' }));
      var oval = el('div', { class: 'g-oval' });
      var stage = el('div', { class: 'g-pp' }, view, oval, topGuide, chinGuide);
      var zoom = slider('Zoom', { min: 0.3, max: 6, step: 0.01, value: 1 }, function (v) { return Math.round(v * 100) + '%'; });
      var straighten = slider('Straighten', { min: -20, max: 20, step: 0.5, value: 0 }, function (v) { return v + '°'; });
      var bright = slider('Brightness', { min: 70, max: 140, step: 1, value: 100 }, function (v) { return v + '%'; });
      zoom.input.addEventListener('input', function () { tf.zoom = zoom.get(); paint(); });
      straighten.input.addEventListener('input', function () { tf.rot = straighten.get(); paint(); });
      bright.input.addEventListener('input', function () { tf.bright = bright.get(); paint(); });

      function refSize() { var d = doc(); return { w: mmPx(d.w), h: mmPx(d.h) }; }
      function guides() {
        var d = doc(), head = (d.head[0] + d.head[1]) / 2, top = (d.h - head) * 0.4;
        return { top: top / d.h, chin: (top + head) / d.h, headW: head * 0.72 / d.w };
      }
      /* Draw the photo as it will be printed, at `outW` pixels wide. */
      function renderPhoto(outW, outH) {
        var ref = refSize(), k = outW / ref.w, c = makeCanvas(outW, outH), x = ctx2d(c);
        x.fillStyle = '#ffffff'; x.fillRect(0, 0, outW, outH);
        if (!img) return c;
        var cover = Math.max(ref.w / img.width, ref.h / img.height);
        x.translate(outW / 2 + tf.tx * k, outH / 2 + tf.ty * k);
        x.rotate(tf.rot * Math.PI / 180);
        x.scale(cover * tf.zoom * k, cover * tf.zoom * k);
        x.filter = 'brightness(' + tf.bright + '%)';
        x.imageSmoothingQuality = 'high';
        x.drawImage(img, -img.width / 2, -img.height / 2);
        return c;
      }
      function layoutStage() {
        var ref = refSize(), dispW = Math.min(320, (stage.parentElement && stage.parentElement.clientWidth) || 320), dispH = dispW * ref.h / ref.w;
        stage.style.width = dispW + 'px'; stage.style.height = dispH + 'px';
        var dpr = window.devicePixelRatio || 1;
        view.width = Math.round(dispW * dpr); view.height = Math.round(dispH * dpr);
        var g = guides();
        topGuide.style.top = (g.top * 100) + '%';
        chinGuide.style.top = (g.chin * 100) + '%';
        oval.style.top = (g.top * 100) + '%'; oval.style.height = ((g.chin - g.top) * 100) + '%';
        oval.style.width = (g.headW * 100) + '%'; oval.style.left = ((1 - g.headW) / 2 * 100) + '%';
        paint();
      }
      function paint() {
        var c = renderPhoto(view.width, view.height);
        ctx2d(view).clearRect(0, 0, view.width, view.height);
        ctx2d(view).drawImage(c, 0, 0);
      }
      function updateText() {
        var d = doc(), s = sheet(), L = sheetLayout(d, s), ref = refSize();
        hint.textContent = d.hint + ' Rules change, so check the official website before you print.';
        fitNote.textContent = L.n + ' photo' + (L.n === 1 ? '' : 's') + ' fit on one ' + s.name + '. Print it at 100% (actual size), not "fit to page".';
        sheetBtn.textContent = 'Download print sheet (' + L.n + ' photo' + (L.n === 1 ? '' : 's') + ')';
        singleBtn.textContent = 'Download single photo (' + ref.w + ' x ' + ref.h + ' px)';
      }
      D.addEventListener('change', function () { updateText(); layoutStage(); });
      S.addEventListener('change', updateText);

      /* Drag to move, wheel or pinch to zoom. */
      var drag = null, touches = {};
      stage.addEventListener('pointerdown', function (e) {
        if (!img) return;
        e.preventDefault();
        stage.setPointerCapture(e.pointerId);
        touches[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(touches);
        if (ids.length === 2) {
          var a = touches[ids[0]], b = touches[ids[1]];
          drag = { pinch: Math.hypot(a.x - b.x, a.y - b.y), zoom: tf.zoom };
        } else drag = { x: e.clientX, y: e.clientY, tx: tf.tx, ty: tf.ty };
        stage.style.cursor = 'grabbing';
      });
      stage.addEventListener('pointermove', function (e) {
        if (!drag || !(e.pointerId in touches)) return;
        touches[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(touches);
        if (drag.pinch && ids.length === 2) {
          var a = touches[ids[0]], b = touches[ids[1]];
          tf.zoom = clamp(drag.zoom * Math.hypot(a.x - b.x, a.y - b.y) / drag.pinch, 0.3, 6); zoom.set(tf.zoom);
        } else if (!drag.pinch) {
          var k = refSize().w / stage.clientWidth;
          tf.tx = drag.tx + (e.clientX - drag.x) * k; tf.ty = drag.ty + (e.clientY - drag.y) * k;
        }
        paint();
      });
      function up(e) { delete touches[e.pointerId]; if (!Object.keys(touches).length) { drag = null; stage.style.cursor = ''; } }
      stage.addEventListener('pointerup', up);
      stage.addEventListener('pointercancel', up);
      stage.addEventListener('wheel', function (e) {
        if (!img) return;
        e.preventDefault();
        tf.zoom = clamp(tf.zoom * Math.exp(-e.deltaY * 0.0015), 0.3, 6); zoom.set(tf.zoom); paint();
      }, { passive: false });

      function resetTf() { tf = { zoom: 1, rot: 0, bright: 100, tx: 0, ty: 0 }; zoom.set(1); straighten.set(0); bright.set(100); paint(); }
      function setImage(canvas) {
        img = canvas;
        stopCam();
        intro.classList.add('g-hide'); editor.classList.remove('g-hide');
        resetTf();
        layoutStage();
      }

      async function downloadSingle() {
        if (!img) return U.toast('Add a photo first', 'err');
        var ref = refSize(), d = doc();
        U.saveBlob('passport-photo-' + d.id + '-' + ref.w + 'x' + ref.h + '.jpg', await jpeg300(renderPhoto(ref.w, ref.h)));
      }
      async function downloadSheet() {
        if (!img) return U.toast('Add a photo first', 'err');
        var d = doc(), s = sheet(), L = sheetLayout(d, s);
        if (!L.n) return U.toast('This photo does not fit on that sheet', 'err');
        var photo = renderPhoto(L.pw, L.ph), c = makeCanvas(L.W, L.H), x = ctx2d(c);
        x.fillStyle = '#fff'; x.fillRect(0, 0, L.W, L.H);
        var gridW = L.cols * L.pw + (L.cols - 1) * L.gap, gridH = L.rows * L.ph + (L.rows - 1) * L.gap;
        var ox = (L.W - gridW) / 2, oy = (L.H - gridH) / 2;
        x.strokeStyle = '#c8c8c8'; x.lineWidth = 1;
        for (var r = 0; r < L.rows; r++) for (var col = 0; col < L.cols; col++) {
          var px = Math.round(ox + col * (L.pw + L.gap)), py = Math.round(oy + r * (L.ph + L.gap));
          x.drawImage(photo, px, py);
          x.strokeRect(px - 0.5, py - 0.5, L.pw + 1, L.ph + 1);
        }
        U.saveBlob('passport-print-sheet-' + d.id + '-' + s.id + '.jpg', await jpeg300(c));
      }

      /* Selfie camera */
      var camVideo = el('video', { autoplay: true, playsInline: true, muted: true, style: { width: '100%', maxHeight: '420px', background: '#000', borderRadius: '10px', transform: 'scaleX(-1)' } });
      var camBox = el('div', { class: 'g-hide' }, camVideo, U.btnrow(U.button('Take photo', function () {
        var w = camVideo.videoWidth, h = camVideo.videoHeight;
        if (!w) return;
        var c = makeCanvas(w, h), x = ctx2d(c); x.translate(w, 0); x.scale(-1, 1); x.drawImage(camVideo, 0, 0);
        setImage(c);
      }, 'primary'), U.button('Cancel', stopCam, 'ghost')));
      var camStatus = U.note('');
      async function startCam() {
        camStatus.className = 'note'; camStatus.textContent = '';
        try {
          camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
          camVideo.srcObject = camStream; camBox.classList.remove('g-hide');
        } catch (e) {
          camStatus.className = 'note err';
          camStatus.textContent = e && e.name === 'NotAllowedError' ? 'Camera permission was refused. Choose a photo instead, or allow the camera in your site settings.' : 'Could not start a camera on this device. Choose a photo instead.';
        }
      }
      function stopCam() { if (camStream) camStream.getTracks().forEach(function (t) { t.stop(); }); camStream = null; camBox.classList.add('g-hide'); }
      U.onTeardown(root, stopCam);

      var ld = loader({ label: 'Or drop it here', hint: 'JPG, PNG, HEIC…', onLoad: function (r) { setImage(r.canvas); ld.reset(); } });
      var intro = el('div', {},
        U.btnrow(U.button('Take a selfie', startCam, 'primary'), U.button('Choose a photo', function () { ld.picker.click(); })),
        U.note('On a phone, ask someone to take it from 1 to 2 m away'), camStatus, camBox, ld.zone, ld.status, ld.picker);
      var editor = el('div', { class: 'g-hide' },
        U.note('Drag the photo and zoom until the top of the hair touches the top line and the chin sits on the chin line.'),
        el('div', { class: 'g-prev' }, stage),
        el('div', { class: 'row' }, zoom, straighten, bright),
        U.btnrow(U.button('Reset', resetTf, 'ghost'), U.button('Another photo', function () { img = null; editor.classList.add('g-hide'); intro.classList.remove('g-hide'); })));
      updateText();
      root.append(
        U.panel(null, intro, editor, U.note('Your photo stays on this device. Nothing is uploaded.')),
        U.panel(null, docSel, hint, sheetSel, fitNote, U.btnrow(sheetBtn, singleBtn)),
        U.panel('For a photo that gets accepted', el('ul', { class: 'g-tips' },
          el('li', { text: 'Stand in front of a plain white or light wall, with even light and no shadows' }),
          el('li', { text: 'Look straight at the camera with a neutral face and your mouth closed' }),
          el('li', { text: 'Take off glasses and hats, and keep hair away from your eyes' }),
          el('li', { text: 'Use a photo taken in the last 6 months, with no filters or edits' }))));
    }
  });

  /* --- Image Upscaler ------------------------------------------------------ */

  /* Separable Lanczos-3 resampling. Slower than drawImage but visibly sharper
     when going up; the browser's own bicubic is offered for speed. */
  function lanczosResize(src, W, H, onProgress) {
    var sw = src.width, sh = src.height;
    var sd = ctx2d(src).getImageData(0, 0, sw, sh).data;
    var A = 3;
    function kernel(x) {
      if (x === 0) return 1;
      if (x <= -A || x >= A) return 0;
      var px = Math.PI * x;
      return A * Math.sin(px) * Math.sin(px / A) / (px * px);
    }
    function weights(inLen, outLen) {
      var scale = outLen / inLen, support = scale < 1 ? A / scale : A, list = [];
      for (var o = 0; o < outLen; o++) {
        var centre = (o + 0.5) / scale - 0.5;
        var lo = Math.max(0, Math.floor(centre - support)), hi = Math.min(inLen - 1, Math.ceil(centre + support));
        var ws = [], sum = 0;
        for (var i = lo; i <= hi; i++) { var w = kernel((i - centre) * (scale < 1 ? scale : 1)); ws.push(w); sum += w; }
        for (var k = 0; k < ws.length; k++) ws[k] /= sum || 1;
        list.push({ lo: lo, w: ws });
      }
      return list;
    }
    var wx = weights(sw, W), wy = weights(sh, H);
    /* pass 1: horizontal into a float buffer W x sh */
    var mid = new Float32Array(W * sh * 4);
    for (var y = 0; y < sh; y++) {
      var row = y * sw * 4;
      for (var x = 0; x < W; x++) {
        var wl = wx[x], r = 0, g = 0, b = 0, a = 0;
        for (var i = 0; i < wl.w.length; i++) {
          var p = row + (wl.lo + i) * 4, w = wl.w[i];
          r += sd[p] * w; g += sd[p + 1] * w; b += sd[p + 2] * w; a += sd[p + 3] * w;
        }
        var q = (y * W + x) * 4;
        mid[q] = r; mid[q + 1] = g; mid[q + 2] = b; mid[q + 3] = a;
      }
    }
    if (onProgress) onProgress(0.5);
    var out = makeCanvas(W, H), od = ctx2d(out).createImageData(W, H), dd = od.data;
    for (var oy = 0; oy < H; oy++) {
      var wy1 = wy[oy];
      for (var ox = 0; ox < W; ox++) {
        var r2 = 0, g2 = 0, b2 = 0, a2 = 0;
        for (var j = 0; j < wy1.w.length; j++) {
          var p2 = ((wy1.lo + j) * W + ox) * 4, w2 = wy1.w[j];
          r2 += mid[p2] * w2; g2 += mid[p2 + 1] * w2; b2 += mid[p2 + 2] * w2; a2 += mid[p2 + 3] * w2;
        }
        var q2 = (oy * W + ox) * 4;
        dd[q2] = clamp(Math.round(r2), 0, 255); dd[q2 + 1] = clamp(Math.round(g2), 0, 255);
        dd[q2 + 2] = clamp(Math.round(b2), 0, 255); dd[q2 + 3] = clamp(Math.round(a2), 0, 255);
      }
    }
    ctx2d(out).putImageData(od, 0, 0);
    return out;
  }

  /* Unsharp mask: amount 0..1 against a 3x3 blur. */
  function sharpen(canvas, amount) {
    if (!amount) return canvas;
    var w = canvas.width, h = canvas.height, x = ctx2d(canvas);
    var img = x.getImageData(0, 0, w, h), d = img.data, src = new Uint8ClampedArray(d);
    for (var y = 1; y < h - 1; y++) {
      for (var i = 1; i < w - 1; i++) {
        var p = (y * w + i) * 4;
        for (var c = 0; c < 3; c++) {
          var blur = (src[p - w * 4 - 4 + c] + src[p - w * 4 + c] + src[p - w * 4 + 4 + c] + src[p - 4 + c] + src[p + c] + src[p + 4 + c] +
                      src[p + w * 4 - 4 + c] + src[p + w * 4 + c] + src[p + w * 4 + 4 + c]) / 9;
          d[p + c] = clamp(Math.round(src[p + c] + (src[p + c] - blur) * amount * 1.5), 0, 255);
        }
      }
    }
    x.putImageData(img, 0, 0);
    return canvas;
  }

  Tools.register({
    id: 'image-upscaler', category: 'image', name: 'Image Upscaler',
    description: 'Enlarge an image 2×, 3× or 4× with Lanczos resampling and optional sharpening, all on this device.',
    keywords: ['upscale', 'enlarge', 'bigger', 'increase resolution', 'lanczos', 'resample', 'zoom', 'sharpen', 'pixel art', 'nearest neighbour'],
    render: function (root) {
      root$(root);
      var src = null;
      var factor = choice([{ value: '2', label: '2×' }, { value: '3', label: '3×' }, { value: '4', label: '4×' }], '2', function () { sizeLine(); });
      var method = choice([{ value: 'lanczos', label: 'Lanczos (sharp, photos)' }, { value: 'bicubic', label: 'Bicubic (fast)' }, { value: 'nearest', label: 'Pixel (pixel art)' }], 'lanczos');
      var sharp = slider('Sharpen: {}', { min: 0, max: 100, value: 25 }, function (v) { return v + '%'; });
      var target = el('div', { class: 'g-info' });
      var progress = U.progress();
      var out = resultPanel('Result');
      var before = el('canvas', { class: 'g-out' });
      var compare = el('div', { class: 'g-prev g-check g-hide', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } });

      function sizeLine() {
        if (!src) return;
        var f = +factor.value, W = src.width * f, H = src.height * f;
        target.textContent = 'Original ' + src.width + ' × ' + src.height + ' px → ' + W + ' × ' + H + ' px';
        target.classList.toggle('g-bad', W * H > 36e6);
        if (W * H > 36e6) target.textContent += ' (too large: the result is capped at 36 megapixels)';
      }

      async function run() {
        if (!src) return;
        var f = +factor.value, W = src.width * f, H = src.height * f;
        if (W * H > 36e6) { var s = Math.sqrt(36e6 / (W * H)); W = Math.floor(W * s); H = Math.floor(H * s); }
        progress.set('Resampling…', 0);
        await new Promise(function (r) { setTimeout(r, 30); });
        var c;
        if (method.value === 'lanczos') {
          c = lanczosResize(src.canvas, W, H, function (p) { progress.set('Resampling…', p); });
        } else {
          c = makeCanvas(W, H);
          var x = ctx2d(c);
          x.imageSmoothingEnabled = method.value !== 'nearest';
          x.imageSmoothingQuality = 'high';
          x.drawImage(src.canvas, 0, 0, W, H);
        }
        if (method.value !== 'nearest' && sharp.get() > 0) { progress.set('Sharpening…', 0.9); await new Promise(function (r) { setTimeout(r, 10); }); sharpen(c, sharp.get() / 100); }
        var mime = keepFormat(src.mime);
        var blob = await encode(c, mime, 0.92);
        progress.done('Upscaled to ' + W + ' × ' + H + ' px');
        out.show(c, blob, baseName(src.file.name) + '-' + f + 'x.' + extFor(mime));
        /* a like-for-like crop of the centre so the difference is visible */
        var cw = Math.min(240, src.width), ch = Math.min(160, src.height);
        var sx = Math.floor((src.width - cw) / 2), sy = Math.floor((src.height - ch) / 2);
        before.width = cw * 3; before.height = ch * 3;
        var bx = ctx2d(before); bx.imageSmoothingEnabled = false;
        bx.drawImage(src.canvas, sx, sy, cw, ch, 0, 0, cw * 3, ch * 3);
        var after = makeCanvas(cw * 3, ch * 3), ax = ctx2d(after); ax.imageSmoothingEnabled = true; ax.imageSmoothingQuality = 'high';
        var scaleX = c.width / src.width, scaleY = c.height / src.height;
        ax.drawImage(c, sx * scaleX, sy * scaleY, cw * scaleX, ch * scaleY, 0, 0, cw * 3, ch * 3);
        compare.replaceChildren(el('div', {}, el('h4', { text: 'Before (zoomed)' }), before), el('div', {}, el('h4', { text: 'After (zoomed)' }), after));
        compare.classList.remove('g-hide');
      }

      var ld = loader({ label: 'Drop image here or', hint: 'Choose Image', changeLabel: 'Choose Image', onLoad: function (r) {
        src = r; sizeLine(); settings.classList.remove('g-hide'); out.hide(); compare.classList.add('g-hide'); progress.set('');
      } });
      var settings = U.panel(null, target, U.field('Scale', factor), U.field('Method', method), sharp,
        U.btnrow(U.button('Upscale Image', function () { run().catch(function (e) { progress.fail(e); }); }, 'primary')), progress,
        U.note('Resampling adds pixels, not detail: edges stay clean and smooth, but nothing that was not in the original appears. For a photo that is genuinely blurry, only an AI upscaler can invent plausible detail.'));
      settings.classList.add('g-hide');
      root.append(U.panel(null, ld.zone, ld.status, ld.picker, U.btnrow(ld.change)), settings, out.node, compare);
    }
  });

  /* --- Image Palette Extractor -------------------------------------------- */

  /* Median-cut quantisation over a thumbnail of the picture. */
  function extractPalette(canvas, count) {
    var size = 160, w = canvas.width, h = canvas.height, s = Math.min(1, size / Math.max(w, h));
    var tw = Math.max(1, Math.round(w * s)), th = Math.max(1, Math.round(h * s));
    var t = makeCanvas(tw, th), x = ctx2d(t);
    x.drawImage(canvas, 0, 0, tw, th);
    var d = x.getImageData(0, 0, tw, th).data, px = [];
    for (var i = 0; i < d.length; i += 4) if (d[i + 3] > 127) px.push([d[i], d[i + 1], d[i + 2]]);
    if (!px.length) return [];
    function range(list, ch) { var lo = 255, hi = 0; list.forEach(function (p) { if (p[ch] < lo) lo = p[ch]; if (p[ch] > hi) hi = p[ch]; }); return hi - lo; }
    var boxes = [px];
    while (boxes.length < count) {
      var bi = -1, best = -1;
      boxes.forEach(function (b, k) { if (b.length < 2) return; var r = Math.max(range(b, 0), range(b, 1), range(b, 2)); if (r > best) { best = r; bi = k; } });
      if (bi < 0 || best === 0) break;
      var box = boxes[bi], ch = [0, 1, 2].reduce(function (a, c) { return range(box, c) > range(box, a) ? c : a; }, 0);
      box.sort(function (a, b) { return a[ch] - b[ch]; });
      var mid = Math.floor(box.length / 2);
      boxes.splice(bi, 1, box.slice(0, mid), box.slice(mid));
    }
    return boxes.map(function (b) {
      var r = 0, g = 0, bl = 0;
      b.forEach(function (p) { r += p[0]; g += p[1]; bl += p[2]; });
      return { r: Math.round(r / b.length), g: Math.round(g / b.length), b: Math.round(bl / b.length), share: b.length / px.length };
    }).sort(function (a, b) { return b.share - a.share; });
  }

  Tools.register({
    id: 'image-palette-extractor', category: 'color', name: 'Image Palette Extractor',
    description: 'Pull the dominant colours out of any picture as hex, RGB and HSL, ready to copy as CSS or JSON.',
    keywords: ['palette', 'dominant colour', 'colour scheme', 'extract colours', 'swatches', 'theme', 'median cut', 'brand colours', 'color'],
    render: function (root) {
      root$(root);
      var src = null, palette = [];
      var count = slider('Colours: {}', { min: 2, max: 16, value: 8 }, function (v) { return String(v); });
      var swatches = el('div', { class: 'swatch-grid' });
      var bar = el('div', { style: { display: 'flex', height: '28px', borderRadius: 'var(--radius-s)', overflow: 'hidden', border: '1px solid var(--border)' } });
      var code = el('pre', { class: 'out', style: { maxHeight: '220px' } });
      var fmt = choice([{ value: 'css', label: 'CSS variables' }, { value: 'json', label: 'JSON' }, { value: 'list', label: 'Hex list' }], 'css', function () { render(); });

      function hsl(c) { var h = rgbToHsl(c.r, c.g, c.b); return 'hsl(' + h[0] + ', ' + h[1] + '%, ' + h[2] + '%)'; }
      function text() {
        if (fmt.value === 'json') return JSON.stringify(palette.map(function (c) { return { hex: rgbHex(c.r, c.g, c.b), rgb: [c.r, c.g, c.b], share: Math.round(c.share * 1000) / 10 }; }), null, 2);
        if (fmt.value === 'list') return palette.map(function (c) { return rgbHex(c.r, c.g, c.b); }).join('\n');
        return ':root {\n' + palette.map(function (c, i) { return '  --palette-' + (i + 1) + ': ' + rgbHex(c.r, c.g, c.b) + ';'; }).join('\n') + '\n}';
      }
      function render() {
        if (!src) return;
        palette = extractPalette(src.canvas, count.get());
        swatches.replaceChildren.apply(swatches, palette.map(function (c) {
          var hex = rgbHex(c.r, c.g, c.b);
          return el('button', { type: 'button', class: 'swatch', title: 'Copy ' + hex, style: { textAlign: 'left', font: 'inherit', color: 'var(--fg)', padding: 0 }, onclick: function () { U.copy(hex); } },
            el('div', { style: { height: '56px', background: hex } }),
            el('div', { style: { padding: '6px 8px', fontSize: '12px' } }, el('b', { style: { fontFamily: 'var(--mono)', display: 'block' }, text: hex }),
              el('span', { class: 'g-muted', text: Math.round(c.share * 100) + '% · ' + hsl(c) })));
        }));
        bar.replaceChildren.apply(bar, palette.map(function (c) { return el('i', { style: { flex: String(Math.max(c.share, 0.02)), background: rgbHex(c.r, c.g, c.b) }, title: rgbHex(c.r, c.g, c.b) }); }));
        code.textContent = text();
      }
      count.input && count.input.addEventListener('input', render);
      var ld = loader({ label: 'Drop image here or', hint: 'Choose Image', changeLabel: 'Choose Image', onLoad: function (r) {
        src = r;
        prev.replaceChildren(cloneCanvas(r.canvas));
        results.classList.remove('g-hide');
        render();
      } });
      var prev = el('div', { class: 'g-prev g-check' });
      var results = U.panel('Palette', prev, count, bar, swatches, U.field('Export as', fmt), code,
        U.btnrow(U.copyBtn('Copy', function () { return code.textContent; }), U.downloadBtn('Download', 'palette.txt', function () { return code.textContent; })),
        U.note('Colours are found by median-cut quantisation, weighted by how much of the picture they cover. Click a swatch to copy its hex code.'));
      results.classList.add('g-hide');
      root.append(U.panel(null, ld.zone, ld.status, ld.picker, U.btnrow(ld.change)), results);
    }
  });

  /* Shared with image-b.js and social-b.js (loaded after this file), so they
     decode, encode and lay out pictures the same way instead of copying it. */
  window.ImageKit = {
    decodeFile: decodeFile, sniff: sniff, sniffFile: sniffFile, imageFromBlob: imageFromBlob,
    makeCanvas: makeCanvas, ctx2d: ctx2d, cloneCanvas: cloneCanvas, toBlob: toBlob, flatten: flatten, hasAlpha: hasAlpha,
    encode: encode, keepFormat: keepFormat, canEncode: canEncode,
    kb: kb, baseName: baseName, extFor: extFor, fmtName: fmtName, clamp: clamp, rgbHex: rgbHex, inputOf: inputOf,
    slider: slider, colorField: colorField, choice: choice, root: root$, loader: loader, resultPanel: resultPanel,
    uniqueName: uniqueName, pctChange: pctChange,
    blurCanvas: blurCanvas, rotateCanvas: rotateCanvas, drawCover: drawCover, segDist: segDist,
    parseTiffExif: parseTiffExif, findExif: findExif, exifRows: exifRows
  };
})();
