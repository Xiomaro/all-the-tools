/* image-b tools: Remove Photo Metadata (EXIF), Blur or Pixelate Part of an
   Image, Screenshot Annotator, Before & After Image Compare, Images to GIF,
   Image Splitter & Poster Tiles. Builds on window.ImageKit from image.js. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  /* --- styles (all scoped to .g-imgb; .g-image comes from image.js) -------- */

  if (!document.getElementById('g-image-b-style')) {
    document.head.appendChild(el('style', { id: 'g-image-b-style', text: [
      '.g-imgb .g-files { display: flex; flex-direction: column; gap: 10px; }',
      '.g-imgb .g-file { border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 12px; background: var(--bg-elev); }',
      '.g-imgb .g-file h4 { margin: 0 0 6px; font-size: 14px; word-break: break-all; }',
      '.g-imgb .g-file ul { margin: 4px 0; padding-left: 18px; font-size: 13.5px; }',
      '.g-imgb .g-file li { margin: 2px 0; }',
      '.g-imgb .g-warn { border: 1px solid var(--err); background: var(--err-weak); color: var(--err); border-radius: var(--radius-s); padding: 8px 10px; font-size: 13.5px; margin: 6px 0; }',
      '.g-imgb .g-okline { color: var(--ok); font-size: 13.5px; }',
      '.g-imgb .g-stage { position: relative; display: inline-block; max-width: 100%; touch-action: none; user-select: none; -webkit-user-select: none; line-height: 0; }',
      '.g-imgb .g-stage canvas { display: block; max-width: 100%; height: auto; }',
      '.g-imgb .g-stagewrap { display: grid; place-items: center; padding: 10px; background: var(--bg-sunken); border: 1px solid var(--border); border-radius: var(--radius); overflow: auto; }',
      '.g-imgb .g-stage textarea { position: absolute; border: 1px dashed #888; background: rgba(255,255,255,.9); outline: none; resize: none; padding: 0 2px; margin: 0; overflow: hidden; line-height: 1.2; white-space: pre; min-width: 40px; z-index: 2; }',
      '.g-imgb .g-mini { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 8px; }',
      '.g-imgb .g-mini input { width: 100%; }',
      '.g-imgb .g-cmp { position: relative; display: inline-block; max-width: 100%; line-height: 0; touch-action: none; user-select: none; }',
      '.g-imgb .g-cmp canvas { display: block; max-width: 100%; height: auto; }',
      '.g-imgb .g-cmp .g-top { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }',
      '.g-imgb .g-cmp .g-bar { position: absolute; top: 0; bottom: 0; width: 3px; margin-left: -1.5px; background: #fff; box-shadow: 0 0 0 1px rgba(0,0,0,.45); cursor: ew-resize; }',
      '.g-imgb .g-cmp .g-bar::after { content: "\\2194"; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 30px; height: 30px; border-radius: 50%; background: #fff; color: #111; font: 16px/30px var(--sans); text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.4); }',
      '.g-imgb .g-cmp .g-tag { position: absolute; top: 8px; padding: 2px 8px; border-radius: 999px; background: rgba(0,0,0,.6); color: #fff; font: 12px/1.6 var(--sans); pointer-events: none; }',
      '.g-imgb .g-side { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }',
      '.g-imgb .g-side figure { margin: 0; } .g-imgb .g-side figcaption { font-size: 12.5px; color: var(--fg-muted); margin-top: 4px; }',
      '.g-imgb .g-side canvas { max-width: 100%; height: auto; display: block; }',
      '.g-imgb .g-frames { display: flex; flex-direction: column; gap: 6px; }',
      '.g-imgb .g-frame { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; border: 1px solid var(--border); border-radius: var(--radius-s); padding: 6px; background: var(--bg-elev); }',
      '.g-imgb .g-frame.g-drag { opacity: .5; } .g-imgb .g-frame.g-over { border-color: var(--accent); }',
      '.g-imgb .g-frame canvas { width: 64px; height: 48px; object-fit: contain; background: var(--bg-sunken); border-radius: 4px; flex: none; cursor: grab; }',
      '.g-imgb .g-frame .g-fname { flex: 1; min-width: 100px; font-size: 13px; word-break: break-all; }',
      '.g-imgb .g-frame input[type=number] { width: 90px; }',
      '.g-imgb .g-frame .btn { padding: 4px 9px; min-width: 0; }',
      '.g-imgb .g-gifout img { max-width: 100%; height: auto; image-rendering: auto; }',
      '.g-imgb .g-prevbox canvas { max-width: 100%; height: auto; display: block; margin: 0 auto; }'
    ].join('\n') }));
  }

  function K() { return window.ImageKit; }
  function start(root) { K().root(root); root.classList.add('g-imgb'); return root; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function canvasOf(w, h) { return K().makeCanvas(w, h); }
  function cx(c) { return K().ctx2d(c); }
  function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }
  function numIn(opts) {
    var i = el('input', Object.assign({ type: 'number', step: 1 }, opts));
    return i;
  }
  function labelled(label, control, hint) { return U.field(label, control, hint); }
  function datePart(n) { return (n < 10 ? '0' : '') + n; }

  /* "2024:03:09 14:05:33" (EXIF) → "09/03/2024 14:05". */
  function exifDate(s) {
    var m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})/.exec(String(s || ''));
    return m ? m[3] + '/' + m[2] + '/' + m[1] + ' ' + m[4] + ':' + m[5] : String(s || '');
  }

  function saveZip(name, entries) {
    return U.script('assets/vendor/jszip/jszip.min.js').then(function () {
      var zip = new window.JSZip();
      entries.forEach(function (e) { zip.file(e.name, e.blob, { compression: 'STORE' }); });
      return zip.generateAsync({ type: 'blob' });
    }).then(function (blob) { U.saveBlob(name, blob); return blob; });
  }

  /* A drop zone plus a hidden picker for "add more" buttons. */
  function filePicker(opts) {
    var picker = el('input', { type: 'file', accept: opts.accept, multiple: !!opts.multiple, style: { display: 'none' } });
    picker.addEventListener('change', function () { var f = Array.prototype.slice.call(picker.files); picker.value = ''; if (f.length) opts.onFiles(f); });
    var zone = U.dropzone({ accept: opts.accept, multiple: !!opts.multiple, label: opts.label, hint: opts.hint, onFiles: opts.onFiles });
    return { zone: zone, picker: picker, open: function () { picker.click(); } };
  }

  /* ======================================================================
     Remove Photo Metadata (EXIF)
     ====================================================================== */

  var ORIENT = { 1: 'Normal', 2: 'Mirrored', 3: 'Upside down', 4: 'Mirrored vertically', 5: 'Mirrored and turned', 6: 'Turned 90° clockwise', 7: 'Mirrored and turned', 8: 'Turned 90° anticlockwise' };

  function ascii(b, o, n) { var s = ''; for (var i = 0; i < n && o + i < b.length; i++) s += String.fromCharCode(b[o + i]); return s; }
  function u16be(b, o) { return (b[o] << 8) | b[o + 1]; }
  function u32be(b, o) { return ((b[o] << 24) >>> 0) + ((b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]); }
  function u32le(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16)) + ((b[o + 3] << 24) >>> 0); }

  /* Count the entries of a TIFF-structured EXIF block (IFD0, Exif, GPS and
     the thumbnail IFD), so the summary can say how much there was. */
  function tiffStats(b, start) {
    var le = b[start] === 0x49, out = { entries: 0, thumbnail: false };
    var r16 = function (o) { o += start; return le ? b[o] | (b[o + 1] << 8) : u16be(b, o); };
    var r32 = function (o) { o += start; return le ? u32le(b, o) : u32be(b, o); };
    var seen = {};
    function ifd(off, depth) {
      if (!off || seen[off] || depth > 4 || start + off + 2 > b.length) return 0;
      seen[off] = true;
      var n = r16(off);
      if (n > 1000) return 0;
      for (var i = 0; i < n; i++) {
        var e = off + 2 + i * 12;
        if (start + e + 12 > b.length) break;
        var tag = r16(e);
        out.entries++;
        if (tag === 0x8769 || tag === 0x8825 || tag === 0xA005) ifd(r32(e + 8), depth + 1);
      }
      return start + off + 2 + n * 12 + 4 <= b.length ? r32(off + 2 + n * 12) : 0;
    }
    try {
      var next = ifd(r32(4), 0);
      if (next) { out.thumbnail = true; ifd(next, 1); }
    } catch (e) { /* a damaged block still counts what was read */ }
    return out;
  }

  function readExif(b, start) {
    var info = null;
    try { info = K().parseTiffExif(new DataView(b.buffer, b.byteOffset, b.byteLength), start); } catch (e) { info = {}; }
    var st = tiffStats(b, start);
    info._entries = st.entries;
    info._thumbnail = st.thumbnail;
    return info;
  }

  /* JPEG: every segment up to the end of the image, with the entropy-coded
     scan data kept as opaque spans so it can be copied byte for byte. */
  function jpegParts(b) {
    var parts = [], o = 2;
    if (b[0] !== 0xFF || b[1] !== 0xD8) throw new Error('Not a JPEG file.');
    parts.push({ kind: 'soi', start: 0, end: 2 });
    while (o < b.length) {
      if (b[o] !== 0xFF) throw new Error('This JPEG looks damaged (no marker at byte ' + o + ').');
      var m = b[o + 1];
      if (m === 0xFF) { o++; continue; }
      if (m === 0xD9) { parts.push({ kind: 'eoi', start: o, end: o + 2 }); o += 2; break; }
      if ((m >= 0xD0 && m <= 0xD7) || m === 0x01) { parts.push({ kind: 'mark', m: m, start: o, end: o + 2 }); o += 2; continue; }
      if (o + 4 > b.length) throw new Error('This JPEG is cut short.');
      var len = u16be(b, o + 2);
      var seg = { kind: 'seg', m: m, start: o, end: o + 2 + len, data: o + 4, len: len - 2 };
      if (len < 2 || seg.end > b.length) throw new Error('This JPEG is cut short.');
      parts.push(seg);
      o = seg.end;
      if (m === 0xDA) {
        /* entropy-coded data runs until a marker that is not a stuffed FF 00
           or a restart (FF D0-D7); it is kept as one opaque span */
        var s = o;
        while (o < b.length && !(b[o] === 0xFF && b[o + 1] !== 0x00 && b[o + 1] !== 0xFF && !(b[o + 1] >= 0xD0 && b[o + 1] <= 0xD7))) o++;
        parts.push({ kind: 'scan', start: s, end: o });
      }
    }
    return { parts: parts, end: o, trailing: b.length - o };
  }

  function segId(b, seg, n) { return ascii(b, seg.data, n); }

  /* What a JPEG segment is, for the summary and for deciding its fate. */
  function jpegSegKind(b, seg) {
    var m = seg.m;
    if (m === 0xE0) return segId(b, seg, 5) === 'JFIF\0' ? 'jfif' : 'app0';
    if (m === 0xE1) {
      if (segId(b, seg, 6) === 'Exif\0\0') return 'exif';
      if (segId(b, seg, 28) === 'http://ns.adobe.com/xap/1.0/') return 'xmp';
      if (segId(b, seg, 34) === 'http://ns.adobe.com/xmp/extension/') return 'xmp';
      return 'app1';
    }
    if (m === 0xE2) return segId(b, seg, 12) === 'ICC_PROFILE\0' ? 'icc' : segId(b, seg, 4) === 'MPF\0' ? 'mpf' : 'app2';
    if (m === 0xED) return 'iptc';
    if (m === 0xEE) return 'adobe';
    if (m === 0xEB) return 'jumbf';
    if (m === 0xFE) return 'com';
    if (m >= 0xE0 && m <= 0xEF) return 'app';
    return 'image';
  }

  /* A 34-byte APP1 holding one tag, Orientation, so a sideways photo still
     shows upright without keeping anything personal. */
  function orientationApp1(value) {
    var bytes = [0xFF, 0xE1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // APP1, length 34, "Exif\0\0"
      0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,                      // "II*\0", IFD0 at 8
      0x01, 0x00,                                                          // one entry
      0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, value & 0xFF, 0x00, 0x00, 0x00, // 0x0112 SHORT ×1 = value
      0x00, 0x00, 0x00, 0x00];                                             // no next IFD
    return new Uint8Array(bytes);
  }

  function concat(chunks) {
    var total = 0; chunks.forEach(function (c) { total += c.length; });
    var out = new Uint8Array(total), p = 0;
    chunks.forEach(function (c) { out.set(c, p); p += c.length; });
    return out;
  }

  function scanJpeg(b) {
    var j = jpegParts(b), found = { format: 'JPEG', exif: null, xmp: 0, iptc: false, comments: [], icc: false, other: [], trailing: j.trailing, orientation: 1 };
    j.parts.forEach(function (p) {
      if (p.kind !== 'seg') return;
      var k = jpegSegKind(b, p);
      if (k === 'exif' && !found.exif) { found.exif = readExif(b, p.data + 6); found.orientation = found.exif.Orientation || 1; }
      else if (k === 'xmp') found.xmp++;
      else if (k === 'iptc') found.iptc = true;
      else if (k === 'com') found.comments.push(new TextDecoder('latin1').decode(b.subarray(p.data, p.end)).replace(/\0+$/, ''));
      else if (k === 'icc') found.icc = true;
      else if (k === 'mpf') found.other.push('extra embedded images (MPF)');
      else if (k === 'jumbf') found.other.push('content credentials / JUMBF data (APP11)');
      else if (k === 'app' || k === 'app0' || k === 'app1' || k === 'app2') found.other.push('APP' + (p.m - 0xE0) + ' block' + (ascii(b, p.data, 4).replace(/[^\x20-\x7e]/g, '') ? ' (' + ascii(b, p.data, 8).replace(/[^\x20-\x7e]/g, '').trim() + ')' : ''));
    });
    return found;
  }

  function stripJpeg(b, o) {
    var j = jpegParts(b), keep = [], orient = null;
    j.parts.forEach(function (p) {
      if (p.kind !== 'seg') { keep.push(b.subarray(p.start, p.end)); return; }
      var k = jpegSegKind(b, p);
      if (k === 'exif' && orient === null) { try { orient = readExif(b, p.data + 6).Orientation || 1; } catch (e) { orient = 1; } }
      var drop = k === 'exif' || k === 'xmp' || k === 'app1' || k === 'iptc' || k === 'com' || k === 'mpf' || k === 'jumbf' ||
        k === 'app' || k === 'app0' || k === 'app2' || (k === 'icc' && !o.keepIcc);
      if (!drop) keep.push(b.subarray(p.start, p.end));
    });
    if (orient && orient !== 1 && o.orientation === 'keep') {
      /* after SOI, and after a JFIF header if there is one */
      var at = keep.length > 1 && keep[1][1] === 0xE0 ? 2 : 1;
      keep.splice(at, 0, orientationApp1(orient));
    }
    if (!o.dropTrailing && j.trailing) keep.push(b.subarray(j.end));
    return concat(keep);
  }

  /* PNG: chunks by type. Text, EXIF, timestamps and C2PA go; pixels stay. */
  var PNG_DROP = { tEXt: 1, zTXt: 1, iTXt: 1, eXIf: 1, exIf: 1, tIME: 1, caBX: 1 };
  function pngChunks(b) {
    var sig = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    for (var i = 0; i < 8; i++) if (b[i] !== sig[i]) throw new Error('Not a PNG file.');
    var chunks = [], o = 8;
    while (o + 12 <= b.length) {
      var len = u32be(b, o), type = ascii(b, o + 4, 4);
      if (o + 12 + len > b.length) throw new Error('This PNG is cut short.');
      chunks.push({ type: type, start: o, end: o + 12 + len, data: o + 8, len: len });
      o += 12 + len;
      if (type === 'IEND') break;
    }
    return { chunks: chunks, end: o };
  }

  function pngText(b, c) {
    var d = b.subarray(c.data, c.data + c.len), z = d.indexOf(0);
    var key = new TextDecoder('latin1').decode(d.subarray(0, z < 0 ? d.length : z));
    var value = '';
    if (c.type === 'tEXt') value = new TextDecoder('latin1').decode(d.subarray(z + 1));
    else if (c.type === 'iTXt' && d[z + 1] === 0) {
      var p = z + 3, q = d.indexOf(0, p); q = d.indexOf(0, q + 1);
      value = new TextDecoder().decode(d.subarray(q + 1));
    } else value = '(compressed)';
    return { key: key, value: value };
  }

  function scanPng(b) {
    var found = { format: 'PNG', exif: null, xmp: 0, iptc: false, comments: [], icc: false, other: [], texts: [], time: false, orientation: 1, trailing: 0 };
    var p = pngChunks(b);
    found.trailing = b.length - p.end;
    p.chunks.forEach(function (c) {
      if (c.type === 'eXIf' || c.type === 'exIf') { found.exif = readExif(b, c.data); found.orientation = found.exif.Orientation || 1; }
      else if (c.type === 'tEXt' || c.type === 'zTXt' || c.type === 'iTXt') {
        var t = pngText(b, c);
        if (/xmp/i.test(t.key)) found.xmp++; else found.texts.push(t);
      } else if (c.type === 'tIME') found.time = true;
      else if (c.type === 'iCCP') found.icc = true;
      else if (c.type === 'caBX') found.other.push('content credentials (C2PA)');
    });
    return found;
  }

  function stripPng(b, o) {
    var p = pngChunks(b), keep = [b.subarray(0, 8)];
    p.chunks.forEach(function (c) {
      if (PNG_DROP[c.type] || (c.type === 'iCCP' && !o.keepIcc)) return;
      keep.push(b.subarray(c.start, c.end));
    });
    if (!o.dropTrailing && p.end < b.length) keep.push(b.subarray(p.end));
    return concat(keep);
  }

  /* WebP: RIFF chunks. EXIF and XMP go, and the VP8X flags are updated to match. */
  function webpChunks(b) {
    if (ascii(b, 0, 4) !== 'RIFF' || ascii(b, 8, 4) !== 'WEBP') throw new Error('Not a WebP file.');
    var chunks = [], o = 12, end = Math.min(b.length, 8 + u32le(b, 4));
    while (o + 8 <= end) {
      var id = ascii(b, o, 4), size = u32le(b, o + 4), stop = o + 8 + size + (size & 1);
      if (o + 8 + size > b.length) throw new Error('This WebP is cut short.');
      chunks.push({ id: id, start: o, end: Math.min(stop, b.length), data: o + 8, size: size });
      o = stop;
    }
    return chunks;
  }

  function scanWebp(b) {
    var found = { format: 'WebP', exif: null, xmp: 0, iptc: false, comments: [], icc: false, other: [], orientation: 1, trailing: 0 };
    webpChunks(b).forEach(function (c) {
      if (c.id === 'EXIF') {
        var s = c.data + (ascii(b, c.data, 6) === 'Exif\0\0' ? 6 : 0);
        found.exif = readExif(b, s);
        found.orientation = found.exif.Orientation || 1;
      } else if (c.id === 'XMP ') found.xmp++;
      else if (c.id === 'ICCP') found.icc = true;
    });
    return found;
  }

  function stripWebp(b, o) {
    var keep = [];
    webpChunks(b).forEach(function (c) {
      if (c.id === 'EXIF' || c.id === 'XMP ' || (c.id === 'ICCP' && !o.keepIcc)) return;
      var bytes = b.slice(c.start, c.end);
      if (c.id === 'VP8X') bytes[8] &= ~(0x08 | 0x04 | (o.keepIcc ? 0 : 0x20)); // clear EXIF, XMP (and ICC) flags
      keep.push(bytes);
    });
    var body = concat(keep), head = new Uint8Array(12);
    head.set([0x52, 0x49, 0x46, 0x46]);
    var size = body.length + 4;
    head[4] = size & 255; head[5] = (size >> 8) & 255; head[6] = (size >> 16) & 255; head[7] = (size >>> 24) & 255;
    head.set([0x57, 0x45, 0x42, 0x50], 8);
    return concat([head, body]);
  }

  /* HEIC/AVIF keep EXIF in an item inside the container; finding the
     "Exif\0\0" header is enough to read what's there before converting. */
  function scanHeif(b, format) {
    var found = { format: format, exif: null, xmp: 0, iptc: false, comments: [], icc: false, other: [], orientation: 1, trailing: 0 };
    for (var i = 0; i + 10 < b.length; i++) {
      if (b[i] === 0x45 && b[i + 1] === 0x78 && b[i + 2] === 0x69 && b[i + 3] === 0x66 && b[i + 4] === 0 && b[i + 5] === 0 &&
          ((b[i + 6] === 0x49 && b[i + 7] === 0x49) || (b[i + 6] === 0x4D && b[i + 7] === 0x4D))) { found.exif = readExif(b, i + 6); break; }
    }
    if (ascii(b, 0, Math.min(b.length, 65536)).indexOf('<x:xmpmeta') > -1) found.xmp++;
    return found;
  }

  function gpsOf(ex) {
    if (!ex || !ex.GPSLatitude || !ex.GPSLongitude) return null;
    var dms = function (a) { return Array.isArray(a) ? a[0] + (a[1] || 0) / 60 + (a[2] || 0) / 3600 : a; };
    var lat = dms(ex.GPSLatitude) * (ex.GPSLatitudeRef === 'S' ? -1 : 1), lon = dms(ex.GPSLongitude) * (ex.GPSLongitudeRef === 'W' ? -1 : 1);
    if (!isFinite(lat) || !isFinite(lon) || (lat === 0 && lon === 0)) return null;
    return { lat: lat, lon: lon, alt: typeof ex.GPSAltitude === 'number' ? ex.GPSAltitude : null };
  }

  /* Plain-English list of what a scan found. */
  function describe(found) {
    var items = [], ex = found.exif;
    if (ex) {
      var cam = [ex.Make, ex.Model].filter(Boolean).join(' ').replace(/^(\w+) \1 /i, '$1 ');
      if (cam) items.push('Camera: ' + cam);
      if (ex.LensModel || ex.LensMake) items.push('Lens: ' + [ex.LensMake, ex.LensModel].filter(Boolean).join(' '));
      if (ex.BodySerialNumber) items.push('Camera serial number: ' + ex.BodySerialNumber);
      if (ex.DateTimeOriginal) items.push('Taken: ' + exifDate(ex.DateTimeOriginal));
      else if (ex.DateTime) items.push('Date: ' + exifDate(ex.DateTime));
      if (ex.Software) items.push('Software: ' + ex.Software);
      if (ex.Artist) items.push('Artist: ' + ex.Artist);
      if (ex.Copyright) items.push('Copyright: ' + ex.Copyright);
      if (ex.ImageDescription) items.push('Description: ' + ex.ImageDescription);
      if (found.orientation && found.orientation !== 1) items.push('Orientation: ' + (ORIENT[found.orientation] || found.orientation));
      items.push('EXIF block: ' + ex._entries + ' fields' + (ex._thumbnail ? ', including a small preview image' : ''));
    }
    if (found.xmp) items.push('XMP metadata (edit history, can include location)');
    if (found.iptc) items.push('IPTC block (captions, keywords, creator)');
    found.comments.forEach(function (c) { items.push('Comment: “' + c.slice(0, 80) + (c.length > 80 ? '…' : '') + '”'); });
    (found.texts || []).forEach(function (t) { items.push('Text “' + t.key + '”: ' + (t.value.length > 60 ? t.value.slice(0, 60) + '…' : t.value)); });
    if (found.time) items.push('Last-modified time (tIME)');
    found.other.forEach(function (o) { items.push(o.charAt(0).toUpperCase() + o.slice(1)); });
    if (found.trailing > 16) items.push(K().kb(found.trailing) + ' of extra data after the image (for example a motion-photo video)');
    return items;
  }

  function scanBytes(b, mime) {
    if (mime === 'image/jpeg') return scanJpeg(b);
    if (mime === 'image/png') return scanPng(b);
    if (mime === 'image/webp') return scanWebp(b);
    if (mime === 'image/heic' || mime === 'image/heif') return scanHeif(b, 'HEIC');
    if (mime === 'image/avif') return scanHeif(b, 'AVIF');
    return null;
  }

  function isEmpty(found) {
    return !found.exif && !found.xmp && !found.iptc && !found.comments.length && !(found.texts || []).length && !found.time && !found.other.length && !(found.trailing > 16);
  }

  Tools.register({
    id: 'exif-remover', category: 'image', name: 'Remove Photo Metadata (EXIF)',
    description: 'See what a photo gives away (camera, dates, GPS location) and strip it without re-compressing: JPEG, PNG and WebP losslessly, HEIC by converting to JPEG.',
    keywords: ['exif', 'remove exif', 'strip metadata', 'metadata remover', 'gps', 'location', 'privacy', 'geotag', 'xmp', 'iptc',
      'clean photo', 'scrub', 'anonymise', 'anonymize', 'camera data', 'batch', 'zip', 'lossless'],
    render: function (root) {
      start(root);
      var items = [], busy = false;
      var keepIcc = U.checkbox('Keep the colour profile (ICC), so colours look the same', { checked: true, dataset: { k: 'keep-icc' } });
      var dropTrailing = U.checkbox('Also remove data stored after the image (motion-photo videos, extra embedded pictures)', { checked: true, dataset: { k: 'drop-trailing' } });
      var orientation = K().choice([
        { value: 'keep', label: 'Keep only the orientation tag (lossless)' },
        { value: 'rotate', label: 'Turn the pixels upright (re-compresses)' },
        { value: 'remove', label: 'Remove it anyway' }], 'keep');
      var orientBox = el('div', { class: 'g-hide' }, U.field('Some photos are stored sideways and rely on a tag to show upright', orientation));
      var prog = U.progress();
      var list = el('div', { class: 'g-files' });
      var fp = filePicker({ accept: 'image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,.heic,.heif,.avif,.jpg,.jpeg,.png,.webp', multiple: true,
        label: 'Drop photos to check and clean', hint: 'JPEG, PNG, WebP or HEIC · several at once is fine · nothing is uploaded', onFiles: add });
      var goBtn = U.button('Remove metadata', function () { cleanAll().catch(function (e) { prog.fail(e); busy = false; goBtn.disabled = false; }); }, 'primary');
      var zipBtn = U.button('Download all (ZIP)', function () {
        var ok = items.filter(function (it) { return it.out; });
        saveZip('cleaned-photos.zip', ok.map(function (it) { return { name: it.out.name, blob: it.out.blob }; }));
      });
      zipBtn.classList.add('g-hide');
      var settings = U.panel(null, keepIcc, dropTrailing, orientBox,
        U.btnrow(goBtn, U.button('Add photos', fp.open, 'ghost'), U.button('Clear', reset, 'ghost'), zipBtn), prog);
      settings.classList.add('g-hide');

      async function add(files) {
        if (busy) return;
        for (var i = 0; i < files.length; i++) {
          var f = files[i], it = { file: f, found: null, error: null, out: null };
          items.push(it);
          try {
            it.mime = await K().sniffFile(f);
            it.bytes = new Uint8Array(await U.readAs(f, 'buffer'));
            it.found = scanBytes(it.bytes, it.mime);
            if (!it.found) it.error = (K().fmtName(it.mime) || 'This file type') + ' is not supported here. Use JPEG, PNG, WebP or HEIC.';
          } catch (e) { it.error = e.message || String(e); }
        }
        fp.zone.classList.add('g-hide');
        settings.classList.remove('g-hide');
        zipBtn.classList.add('g-hide');
        items.forEach(function (it) { it.out = null; });
        prog.set('');
        paint();
      }

      function reset() {
        if (busy) return;
        items = [];
        list.replaceChildren();
        fp.zone.classList.remove('g-hide');
        settings.classList.add('g-hide');
        prog.set('');
      }

      function paint() {
        orientBox.classList.toggle('g-hide', !items.some(function (it) { return it.found && it.found.orientation > 1 && it.mime === 'image/jpeg'; }));
        list.replaceChildren.apply(list, items.map(card));
      }

      function card(it) {
        var box = el('div', { class: 'g-file', dataset: { k: 'file' } });
        box.appendChild(el('h4', { text: it.file.name + ' · ' + K().kb(it.file.size) + (it.found ? ' · ' + it.found.format : '') }));
        if (it.error) { box.appendChild(U.note(it.error, 'err')); return box; }
        var gps = gpsOf(it.found.exif);
        if (gps) {
          box.appendChild(el('div', { class: 'g-warn', dataset: { k: 'gps' } },
            el('b', { text: 'This photo records where it was taken: ' }),
            el('span', { class: 'mono', text: gps.lat.toFixed(6) + ', ' + gps.lon.toFixed(6) }),
            gps.alt !== null ? ' (' + Math.round(gps.alt) + ' m above sea level)' : '',
            '. Anyone you send it to can see this location.'));
        }
        var facts = describe(it.found);
        if (facts.length) box.appendChild(el('ul', { dataset: { k: 'found' } }, facts.map(function (t) { return el('li', { text: t }); })));
        else box.appendChild(el('p', { class: 'g-okline', dataset: { k: 'found' }, text: 'No metadata found in this file.' }));
        if (it.found.icc) box.appendChild(el('p', { class: 'g-muted', text: 'Has a colour profile (ICC)' + (keepIcc.input.checked ? ', which will be kept.' : ', which will be removed.') }));
        if (it.mime === 'image/heic' || it.mime === 'image/heif' || it.mime === 'image/avif') {
          box.appendChild(el('p', { class: 'g-muted', text: it.found.format + ' files are converted to JPEG, which leaves every tag behind (the picture is re-compressed at high quality).' }));
        }
        if (it.out) {
          box.appendChild(el('div', { class: 'row', style: { alignItems: 'center' } },
            el('span', { class: 'g-okline', dataset: { k: 'result' }, text: it.out.verdict }),
            el('span', { class: 'mono', dataset: { k: 'sizes' }, text: K().kb(it.file.size) + ' → ' + K().kb(it.out.blob.size) }),
            K().pctChange(it.file.size, it.out.blob.size),
            U.button('Download', function () { U.saveBlob(it.out.name, it.out.blob); })));
        }
        return box;
      }

      async function cleanOne(it, o) {
        var mime = it.mime, bytes, name = it.file.name, type = mime;
        if (mime === 'image/jpeg' && it.found.orientation > 1 && o.orientation === 'rotate') {
          /* the browser turns the picture upright as it decodes; re-encode that */
          var d = await K().decodeFile(it.file);
          var blob = await K().toBlob(K().flatten(d.canvas, '#ffffff'), 'image/jpeg', 0.92);
          bytes = new Uint8Array(await blob.arrayBuffer());
        } else if (mime === 'image/jpeg') bytes = stripJpeg(it.bytes, o);
        else if (mime === 'image/png') bytes = stripPng(it.bytes, o);
        else if (mime === 'image/webp') bytes = stripWebp(it.bytes, o);
        else {
          var dh = await K().decodeFile(it.file);
          var alpha = mime === 'image/avif' && K().hasAlpha(dh.canvas);
          type = alpha ? 'image/png' : 'image/jpeg';
          var b2 = await K().toBlob(alpha ? dh.canvas : K().flatten(dh.canvas, '#ffffff'), type, 0.92);
          bytes = new Uint8Array(await b2.arrayBuffer());
          name = K().baseName(name) + (alpha ? '.png' : '.jpg');
        }
        /* read the result back: the verdict comes from the bytes we will save */
        var after = scanBytes(bytes, type);
        var left = describe(after).filter(function (t) { return !/^Orientation:/.test(t) && !/^EXIF block: 1 fields/.test(t); });
        var verdict = left.length ? 'Some metadata remains: ' + left.join('; ') : (after.exif ? 'Clean: only the orientation tag is left' : 'Clean: no metadata left');
        return { blob: new Blob([bytes], { type: type }), name: name, verdict: verdict };
      }

      async function cleanAll() {
        if (busy) return;
        var o = { keepIcc: keepIcc.input.checked, dropTrailing: dropTrailing.input.checked, orientation: orientation.value };
        busy = true; goBtn.disabled = true;
        var todo = items.filter(function (it) { return it.found; });
        for (var i = 0; i < todo.length; i++) {
          prog.set('Cleaning ' + todo[i].file.name + '…', todo.length > 1 ? i / todo.length : null);
          await tick();
          try { todo[i].out = await cleanOne(todo[i], o); } catch (e) { todo[i].error = e.message || String(e); todo[i].out = null; }
        }
        busy = false; goBtn.disabled = false;
        var done = items.filter(function (it) { return it.out; }).length;
        prog.done('Cleaned ' + done + (done === 1 ? ' photo' : ' photos') + '. Download ' + (done === 1 ? 'it' : 'them') + ' below.');
        zipBtn.classList.toggle('g-hide', done < 2);
        paint();
      }

      keepIcc.input.addEventListener('change', function () { if (items.length) paint(); });
      root.append(U.panel(null, fp.zone, fp.picker), settings, list,
        U.note('JPEG, PNG and WebP are cleaned by removing the metadata blocks from the file: the picture data is copied byte for byte, so there is no loss of quality.'));
    }
  });

  /* ======================================================================
     Blur or Pixelate Part of an Image
     ====================================================================== */

  /* Each block x block square (aligned to the region's own corner) becomes
     the average of its pixels, weighted by alpha so transparent pixels don't
     darken the result. */
  function pixelatePatch(src, R, block) {
    var patch = canvasOf(R.w, R.h), px = cx(patch);
    px.drawImage(src, R.x, R.y, R.w, R.h, 0, 0, R.w, R.h);
    var img = px.getImageData(0, 0, R.w, R.h), d = img.data, w = R.w, h = R.h;
    for (var by = 0; by < h; by += block) {
      for (var bx = 0; bx < w; bx += block) {
        var bw = Math.min(block, w - bx), bh = Math.min(block, h - by), r = 0, g = 0, b = 0, a = 0, xx, yy, i;
        for (yy = by; yy < by + bh; yy++) for (xx = bx; xx < bx + bw; xx++) {
          i = (yy * w + xx) * 4;
          r += d[i] * d[i + 3]; g += d[i + 1] * d[i + 3]; b += d[i + 2] * d[i + 3]; a += d[i + 3];
        }
        var n = bw * bh;
        r = a ? Math.round(r / a) : 0; g = a ? Math.round(g / a) : 0; b = a ? Math.round(b / a) : 0; a = Math.round(a / n);
        for (yy = by; yy < by + bh; yy++) for (xx = bx; xx < bx + bw; xx++) {
          i = (yy * w + xx) * 4;
          d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
        }
      }
    }
    px.putImageData(img, 0, 0);
    return patch;
  }

  /* Blur a padded copy of the area, so the edge of the region blends with
     what is outside it instead of with transparency, then keep the middle. */
  function blurPatch(src, R, radius) {
    var pad = Math.ceil(radius * 1.5) + 2;
    var x0 = Math.max(0, R.x - pad), y0 = Math.max(0, R.y - pad);
    var x1 = Math.min(src.width, R.x + R.w + pad), y1 = Math.min(src.height, R.y + R.h + pad);
    var big = canvasOf(x1 - x0, y1 - y0);
    cx(big).drawImage(src, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
    var blurred = K().blurCanvas(big, 'gaussian', radius);
    var patch = canvasOf(R.w, R.h);
    cx(patch).drawImage(blurred, R.x - x0, R.y - y0, R.w, R.h, 0, 0, R.w, R.h);
    return patch;
  }

  /* Whole-pixel rectangle inside the picture, whatever way it was dragged. */
  function normRect(r, W, H) {
    var x = Math.round(Math.min(r.x, r.x + r.w)), y = Math.round(Math.min(r.y, r.y + r.h));
    var x2 = Math.round(Math.max(r.x, r.x + r.w)), y2 = Math.round(Math.max(r.y, r.y + r.h));
    x = clamp(x, 0, W); y = clamp(y, 0, H); x2 = clamp(x2, 0, W); y2 = clamp(y2, 0, H);
    return { x: x, y: y, w: x2 - x, h: y2 - y };
  }

  function regionPath(x, shape, R) {
    x.beginPath();
    if (shape === 'ellipse') x.ellipse(R.x + R.w / 2, R.y + R.h / 2, R.w / 2, R.h / 2, 0, 0, Math.PI * 2);
    else x.rect(R.x, R.y, R.w, R.h);
  }

  /* Paint one region onto a context holding the picture. `cache` keeps the
     expensive patches between frames while a region is being dragged. */
  function paintRegion(x, src, r, cache) {
    var R = normRect(r, src.width, src.height);
    if (R.w < 1 || R.h < 1) return;
    x.save();
    regionPath(x, r.shape, R);
    x.clip();
    if (r.effect === 'box') {
      x.fillStyle = r.color;
      x.fillRect(R.x, R.y, R.w, R.h);
    } else {
      var key = [r.effect, R.x, R.y, R.w, R.h, r.effect === 'blur' ? r.radius : r.block].join(',');
      var patch = cache && cache.get(key);
      if (!patch) {
        patch = r.effect === 'blur' ? blurPatch(src, R, r.radius) : pixelatePatch(src, R, Math.max(2, Math.round(r.block)));
        if (cache) { cache.set(key, patch); if (cache.size > 40) cache.delete(cache.keys().next().value); }
      }
      x.drawImage(patch, R.x, R.y);
    }
    x.restore();
  }

  Tools.register({
    id: 'image-pixelate', category: 'image', name: 'Blur or Pixelate Part of an Image',
    description: 'Hide faces, number plates or text: drag boxes or ovals over parts of a picture, then pixelate, blur or cover them and save at full size.',
    keywords: ['pixelate', 'blur', 'censor', 'redact', 'hide', 'mosaic', 'obscure', 'anonymise', 'anonymize', 'blur face', 'blur faces',
      'number plate', 'license plate', 'licence plate', 'black box', 'cover', 'privacy', 'blur part of image', 'pixelate part of image'],
    render: function (root) {
      start(root);
      var src = null, regions = [], sel = -1, cache = new Map(), drag = null, raf = 0;
      var defaults = { shape: 'rect', effect: 'pixelate', block: 16, radius: 12, color: '#000000' };

      var shape = K().choice([{ value: 'rect', label: 'Rectangle' }, { value: 'ellipse', label: 'Oval' }], 'rect', function (v) { setProp('shape', v); });
      var effect = K().choice([{ value: 'pixelate', label: 'Pixelate' }, { value: 'blur', label: 'Blur' }, { value: 'box', label: 'Solid box' }], 'pixelate', function (v) { setProp('effect', v); paintControls(); });
      var block = K().slider('Block size: {}', { min: 4, max: 96, value: 16 }, function (v) { return v + ' px'; });
      var radius = K().slider('Blur strength: {}', { min: 2, max: 60, value: 12 }, function (v) { return v + ' px'; });
      var color = K().colorField('Box colour', '#000000');
      block.input.dataset.k = 'block';
      radius.input.dataset.k = 'radius';
      color.text.dataset.k = 'box-colour';
      block.input.addEventListener('input', function () { setProp('block', block.get()); });
      radius.input.addEventListener('input', function () { setProp('radius', radius.get()); });
      color.addEventListener('change', function () { setProp('color', color.get()); });

      var fx = numIn({ min: 0, dataset: { k: 'rx' } }), fy = numIn({ min: 0, dataset: { k: 'ry' } });
      var fw = numIn({ min: 1, dataset: { k: 'rw' } }), fh = numIn({ min: 1, dataset: { k: 'rh' } });
      [fx, fy, fw, fh].forEach(function (n) {
        n.addEventListener('input', function () {
          var r = regions[sel];
          if (!r || !isFinite(parseFloat(n.value))) return;
          r.x = parseFloat(fx.value) || 0; r.y = parseFloat(fy.value) || 0;
          r.w = Math.max(1, parseFloat(fw.value) || 1); r.h = Math.max(1, parseFloat(fh.value) || 1);
          request();
        });
      });
      var count = el('span', { class: 'g-muted', dataset: { k: 'region-count' }, text: '0 areas' });
      var selHead = el('h4', { text: 'New areas' });
      var delBtn = U.button('Delete area', function () { removeSel(); }, 'ghost');
      var geom = el('div', { class: 'g-mini' }, labelled('X (px)', fx), labelled('Y (px)', fy), labelled('Width', fw), labelled('Height', fh));

      var view = el('canvas');
      var stage = el('div', { class: 'g-stage', tabIndex: 0 }, view);
      var format = K().choice([{ value: 'image/png', label: 'PNG' }, { value: 'image/jpeg', label: 'JPEG' }], 'image/png');
      var dl = U.button('Download', function () { exportIt().catch(function (e) { U.toast(e.message, 'err'); }); }, 'primary');

      var ld = K().loader({ label: 'Drop a picture here', hint: 'or click to choose · JPG, PNG, WebP, HEIC… nothing is uploaded', onLoad: function (r) {
        src = r; regions = []; sel = -1; cache.clear();
        view.width = r.width; view.height = r.height;
        format.set(r.mime === 'image/jpeg' ? 'image/jpeg' : 'image/png');
        editor.classList.remove('g-hide');
        paintControls();
        request();
      } });

      function current() { return sel >= 0 ? regions[sel] : defaults; }
      function setProp(k, v) { current()[k] = v; if (sel >= 0) request(); }
      function paintControls() {
        var r = current();
        shape.set(r.shape); effect.set(r.effect);
        block.set(r.block); radius.set(r.radius); color.set(r.color);
        block.classList.toggle('g-hide', r.effect !== 'pixelate');
        radius.classList.toggle('g-hide', r.effect !== 'blur');
        color.classList.toggle('g-hide', r.effect !== 'box');
        geom.classList.toggle('g-hide', sel < 0);
        delBtn.classList.toggle('g-hide', sel < 0);
        selHead.textContent = sel >= 0 ? 'Selected area' : 'New areas';
        if (sel >= 0 && src) {
          var R = normRect(r, src.width, src.height);
          if (document.activeElement !== fx) fx.value = R.x;
          if (document.activeElement !== fy) fy.value = R.y;
          if (document.activeElement !== fw) fw.value = R.w;
          if (document.activeElement !== fh) fh.value = R.h;
        }
        count.textContent = regions.length + (regions.length === 1 ? ' area' : ' areas');
        dl.textContent = 'Download ' + (format.value === 'image/jpeg' ? 'JPEG' : 'PNG');
      }
      format.addEventListener('click', paintControls);

      function request() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; paint(); }); }

      /* How many picture pixels one screen pixel covers, for outlines and handles. */
      function scale() { var b = view.getBoundingClientRect(); return b.width ? view.width / b.width : 1; }

      function paint() {
        if (!src) return;
        var x = view.getContext('2d');
        x.clearRect(0, 0, view.width, view.height);
        x.drawImage(src.canvas, 0, 0);
        regions.forEach(function (r) { paintRegion(x, src.canvas, r, cache); });
        var s = scale();
        regions.forEach(function (r, i) {
          var R = normRect(r, src.width, src.height);
          x.save();
          x.lineWidth = (i === sel ? 2 : 1) * s;
          x.setLineDash([6 * s, 4 * s]);
          x.strokeStyle = i === sel ? '#2563eb' : 'rgba(255,255,255,.9)';
          regionPath(x, r.shape, R);
          x.stroke();
          if (i === sel) {
            x.setLineDash([]);
            corners(R).forEach(function (c) {
              x.fillStyle = '#fff'; x.strokeStyle = '#2563eb';
              x.fillRect(c.x - 5 * s, c.y - 5 * s, 10 * s, 10 * s);
              x.strokeRect(c.x - 5 * s, c.y - 5 * s, 10 * s, 10 * s);
            });
          }
          x.restore();
        });
        paintControls();
      }

      function corners(R) {
        return [{ k: 'nw', x: R.x, y: R.y }, { k: 'ne', x: R.x + R.w, y: R.y }, { k: 'sw', x: R.x, y: R.y + R.h }, { k: 'se', x: R.x + R.w, y: R.y + R.h }];
      }

      function pt(e) {
        var b = view.getBoundingClientRect();
        return { x: clamp((e.clientX - b.left) * view.width / b.width, 0, view.width), y: clamp((e.clientY - b.top) * view.height / b.height, 0, view.height) };
      }

      function hit(p) {
        for (var i = regions.length - 1; i >= 0; i--) {
          var R = normRect(regions[i], src.width, src.height);
          if (p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y && p.y <= R.y + R.h) return i;
        }
        return -1;
      }

      stage.addEventListener('pointerdown', function (e) {
        if (!src || (e.button !== 0 && e.pointerType === 'mouse')) return;
        e.preventDefault();
        stage.focus({ preventScroll: true });
        stage.setPointerCapture(e.pointerId);
        var p = pt(e), s = scale();
        if (sel >= 0) {
          var R = normRect(regions[sel], src.width, src.height);
          var c = corners(R).filter(function (q) { return Math.abs(q.x - p.x) <= 9 * s && Math.abs(q.y - p.y) <= 9 * s; })[0];
          if (c) { drag = { mode: 'size', corner: c.k, r0: R }; return; }
        }
        var h = hit(p);
        if (h >= 0) {
          sel = h;
          var R0 = normRect(regions[h], src.width, src.height);
          drag = { mode: 'move', start: p, r0: R0 };
          request();
          return;
        }
        var r = { shape: defaults.shape, effect: defaults.effect, block: defaults.block, radius: defaults.radius, color: defaults.color, x: p.x, y: p.y, w: 0, h: 0 };
        regions.push(r);
        sel = regions.length - 1;
        drag = { mode: 'new', start: p };
        request();
      });
      stage.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var p = pt(e), r = regions[sel];
        if (drag.mode === 'new') { r.w = p.x - drag.start.x; r.h = p.y - drag.start.y; }
        else if (drag.mode === 'move') {
          r.x = clamp(drag.r0.x + p.x - drag.start.x, 0, src.width - drag.r0.w);
          r.y = clamp(drag.r0.y + p.y - drag.start.y, 0, src.height - drag.r0.h);
          r.w = drag.r0.w; r.h = drag.r0.h;
        } else {
          var R = drag.r0, x1 = R.x, y1 = R.y, x2 = R.x + R.w, y2 = R.y + R.h;
          if (drag.corner.indexOf('w') > -1) x1 = p.x; else x2 = p.x;
          if (drag.corner.indexOf('n') > -1) y1 = p.y; else y2 = p.y;
          r.x = x1; r.y = y1; r.w = x2 - x1; r.h = y2 - y1;
        }
        request();
      });
      function endDrag() {
        if (!drag) return;
        var r = regions[sel];
        if (r) {
          var R = normRect(r, src.width, src.height);
          if (R.w < 3 || R.h < 3) { regions.splice(sel, 1); sel = -1; }
          else { r.x = R.x; r.y = R.y; r.w = R.w; r.h = R.h; }
        }
        drag = null;
        request();
      }
      stage.addEventListener('pointerup', endDrag);
      stage.addEventListener('pointercancel', endDrag);

      function removeSel() { if (sel < 0) return; regions.splice(sel, 1); sel = -1; paintControls(); request(); }

      function onKey(e) {
        if (!src || editor.classList.contains('g-hide')) return;
        var tag = (e.target && e.target.tagName) || '';
        if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
        if ((e.key === 'Delete' || e.key === 'Backspace') && sel >= 0) { e.preventDefault(); removeSel(); return; }
        if (e.key === 'Escape') { sel = -1; request(); return; }
        var step = e.shiftKey ? 10 : 1, d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        if (d && sel >= 0 && document.activeElement === stage) {
          e.preventDefault();
          var r = regions[sel];
          r.x = clamp(r.x + d[0], 0, src.width - Math.abs(r.w)); r.y = clamp(r.y + d[1], 0, src.height - Math.abs(r.h));
          request();
        }
      }
      document.addEventListener('keydown', onKey);
      U.onTeardown(root, function () { document.removeEventListener('keydown', onKey); if (raf) cancelAnimationFrame(raf); });

      async function exportIt() {
        if (!src) return;
        var out = canvasOf(src.width, src.height), x = cx(out);
        x.drawImage(src.canvas, 0, 0);
        regions.forEach(function (r) { paintRegion(x, src.canvas, r, cache); });
        var mime = format.value;
        var blob = await K().toBlob(mime === 'image/jpeg' ? K().flatten(out, '#ffffff') : out, mime, 0.92);
        U.saveBlob(K().baseName(src.file.name) + '-hidden.' + K().extFor(mime), blob);
      }

      var editor = el('div', { class: 'g-hide stack' },
        U.panel(null,
          el('div', { class: 'row', style: { alignItems: 'center', justifyContent: 'space-between' } }, selHead, count),
          U.field('Shape', shape), U.field('Effect', effect), block, radius, color, geom,
          U.btnrow(delBtn, U.button('Remove all areas', function () { regions = []; sel = -1; request(); }, 'ghost'), ld.change),
          U.note('Drag on the picture to add an area; drag an area to move it, or its corners to resize it. Delete removes the selected one.')),
        U.panel(null, el('div', { class: 'g-stagewrap' }, stage),
          U.btnrow(U.field('Save as', format), dl),
          el('p', { class: 'note', dataset: { k: 'blur-warning' } }, el('b', { text: 'Hiding text? ' }),
            'Blur and pixelation can sometimes be reversed, especially on text. For passwords, names, numbers or anything that must stay private, use a solid box.')));
      root.append(U.panel(null, ld.zone, ld.status, ld.picker), editor);
    }
  });

  /* ======================================================================
     Screenshot Annotator
     ====================================================================== */

  var AN_TOOLS = [
    ['select', 'Select and move', '⬚', 'v'], ['arrow', 'Arrow', '➚', 'a'], ['line', 'Line', '╱', 'l'],
    ['rect', 'Rectangle', '▭', 'r'], ['ellipse', 'Ellipse', '◯', 'o'], ['pen', 'Pen', '✎', 'p'],
    ['hl', 'Highlighter', '▮', 'h'], ['text', 'Text', 'T', 't'], ['step', 'Numbered step', '①', 'n'],
    ['blur', 'Blur box', '▒', 'b'], ['crop', 'Crop', '⌗', 'c']
  ];
  var AN_COLORS = ['#e11d48', '#f97316', '#facc15', '#16a34a', '#2563eb', '#7c3aed', '#111111', '#ffffff'];
  var AN_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  function anBox(o) {
    return { x: Math.min(o.x1, o.x2), y: Math.min(o.y1, o.y2), w: Math.abs(o.x2 - o.x1), h: Math.abs(o.y2 - o.y1) };
  }

  function anDraw(x, o, base, blurCache) {
    x.save();
    x.strokeStyle = o.c; x.fillStyle = o.c; x.lineWidth = o.w; x.lineCap = 'round'; x.lineJoin = 'round';
    var b;
    if (o.t === 'pen' || o.t === 'hl') {
      if (o.t === 'hl') { x.globalAlpha = 0.4; x.lineWidth = o.w * 4; x.lineCap = 'butt'; x.globalCompositeOperation = 'multiply'; }
      var p = o.pts;
      x.beginPath();
      if (p.length === 1) { x.arc(p[0][0], p[0][1], x.lineWidth / 2, 0, Math.PI * 2); x.fill(); x.restore(); return; }
      x.moveTo(p[0][0], p[0][1]);
      for (var i = 1; i < p.length - 1; i++) x.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
      x.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
      x.stroke();
    } else if (o.t === 'line' || o.t === 'arrow') {
      var ang = Math.atan2(o.y2 - o.y1, o.x2 - o.x1), head = Math.max(10, o.w * 4), len = Math.hypot(o.x2 - o.x1, o.y2 - o.y1);
      var endX = o.x2, endY = o.y2;
      if (o.t === 'arrow' && len > head) { endX = o.x2 - Math.cos(ang) * head * 0.8; endY = o.y2 - Math.sin(ang) * head * 0.8; }
      x.beginPath(); x.moveTo(o.x1, o.y1); x.lineTo(endX, endY); x.stroke();
      if (o.t === 'arrow') {
        x.beginPath();
        x.moveTo(o.x2, o.y2);
        x.lineTo(o.x2 - head * Math.cos(ang - 0.42), o.y2 - head * Math.sin(ang - 0.42));
        x.lineTo(o.x2 - head * Math.cos(ang + 0.42), o.y2 - head * Math.sin(ang + 0.42));
        x.closePath(); x.fill();
      }
    } else if (o.t === 'rect') {
      b = anBox(o); x.strokeRect(b.x, b.y, b.w, b.h);
    } else if (o.t === 'ellipse') {
      b = anBox(o);
      x.beginPath(); x.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2, 0, 0, Math.PI * 2); x.stroke();
    } else if (o.t === 'text') {
      x.font = '600 ' + o.fs + 'px ' + AN_FONT;
      x.textBaseline = 'top';
      /* a thin outline in the opposite tone keeps text readable on any background */
      x.lineWidth = Math.max(2, o.fs / 8);
      x.strokeStyle = anLight(o.c) ? 'rgba(0,0,0,.75)' : 'rgba(255,255,255,.9)';
      o.text.split('\n').forEach(function (line, k) { x.strokeText(line, o.x, o.y + k * o.fs * 1.2); x.fillText(line, o.x, o.y + k * o.fs * 1.2); });
    } else if (o.t === 'step') {
      x.beginPath(); x.arc(o.x, o.y, o.r, 0, Math.PI * 2); x.fill();
      x.lineWidth = Math.max(2, o.r / 7); x.strokeStyle = '#fff'; x.stroke();
      x.fillStyle = anLight(o.c) ? '#111' : '#fff';
      x.font = '700 ' + Math.round(o.r * (o.n > 9 ? 1.0 : 1.25)) + 'px ' + AN_FONT;
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(String(o.n), o.x, o.y + o.r * 0.06);
    } else if (o.t === 'blur') {
      b = anBox(o);
      var R = normRect({ x: b.x, y: b.y, w: b.w, h: b.h }, base.width, base.height);
      if (R.w >= 1 && R.h >= 1) {
        var key = [R.x, R.y, R.w, R.h, o.rad].join(',');
        var patch = blurCache.get(key);
        if (!patch) {
          patch = blurPatch(base, R, o.rad);
          blurCache.set(key, patch);
          if (blurCache.size > 60) blurCache.delete(blurCache.keys().next().value);
        }
        x.drawImage(patch, R.x, R.y);
      }
    }
    x.restore();
  }

  function anLight(hex) {
    var n = parseInt(String(hex).replace('#', ''), 16);
    return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 170;
  }

  function anBounds(o, measure) {
    if (o.t === 'pen' || o.t === 'hl') {
      var xs = o.pts.map(function (p) { return p[0]; }), ys = o.pts.map(function (p) { return p[1]; }), pad = o.t === 'hl' ? o.w * 2 : o.w;
      return { x: Math.min.apply(null, xs) - pad, y: Math.min.apply(null, ys) - pad, w: Math.max.apply(null, xs) - Math.min.apply(null, xs) + pad * 2, h: Math.max.apply(null, ys) - Math.min.apply(null, ys) + pad * 2 };
    }
    if (o.t === 'text') {
      var lines = o.text.split('\n');
      measure.font = '600 ' + o.fs + 'px ' + AN_FONT;
      return { x: o.x, y: o.y, w: Math.max.apply(null, lines.map(function (l) { return measure.measureText(l).width; })), h: lines.length * o.fs * 1.2 };
    }
    if (o.t === 'step') return { x: o.x - o.r, y: o.y - o.r, w: o.r * 2, h: o.r * 2 };
    var b = anBox(o), pad2 = o.w || 0;
    return { x: b.x - pad2, y: b.y - pad2, w: b.w + pad2 * 2, h: b.h + pad2 * 2 };
  }

  function anHit(o, p, tol, measure) {
    var seg = K().segDist;
    if (o.t === 'pen' || o.t === 'hl') {
      var t = tol + (o.t === 'hl' ? o.w * 2 : o.w / 2);
      if (o.pts.length === 1) return Math.hypot(p.x - o.pts[0][0], p.y - o.pts[0][1]) <= t;
      for (var i = 1; i < o.pts.length; i++) if (seg(p.x, p.y, o.pts[i - 1][0], o.pts[i - 1][1], o.pts[i][0], o.pts[i][1]) <= t) return true;
      return false;
    }
    if (o.t === 'line' || o.t === 'arrow') return seg(p.x, p.y, o.x1, o.y1, o.x2, o.y2) <= tol + o.w / 2;
    if (o.t === 'rect') {
      var b = anBox(o), e = tol + o.w / 2;
      var inOuter = p.x >= b.x - e && p.x <= b.x + b.w + e && p.y >= b.y - e && p.y <= b.y + b.h + e;
      var inInner = p.x > b.x + e && p.x < b.x + b.w - e && p.y > b.y + e && p.y < b.y + b.h - e;
      return inOuter && !inInner;
    }
    if (o.t === 'ellipse') {
      var q = anBox(o), rx = q.w / 2, ry = q.h / 2;
      if (rx < 1 || ry < 1) return false;
      var d = Math.hypot((p.x - q.x - rx) / rx, (p.y - q.y - ry) / ry);
      return Math.abs(d - 1) * Math.min(rx, ry) <= tol + o.w / 2;
    }
    var bb = anBounds(o, measure);
    return p.x >= bb.x - tol && p.x <= bb.x + bb.w + tol && p.y >= bb.y - tol && p.y <= bb.y + bb.h + tol;
  }

  function anMove(o, dx, dy) {
    if (o.pts) o.pts = o.pts.map(function (p) { return [p[0] + dx, p[1] + dy]; });
    if ('x1' in o) { o.x1 += dx; o.y1 += dy; o.x2 += dx; o.y2 += dy; }
    if ('x' in o) { o.x += dx; o.y += dy; }
  }

  Tools.register({
    id: 'image-annotate', category: 'image', name: 'Screenshot Annotator',
    description: 'Paste a screenshot and mark it up with arrows, boxes, highlights, text, numbered steps and blur, then crop it and copy or save a PNG.',
    keywords: ['annotate', 'annotation', 'markup', 'mark up', 'screenshot', 'arrow', 'highlight', 'highlighter', 'callout', 'numbered steps',
      'draw on image', 'label', 'blur', 'crop', 'paste', 'clipboard', 'snip', 'greenshot', 'skitch', 'snagit', 'tutorial', 'bug report'],
    render: function (root) {
      start(root);
      var base = null, name = 'screenshot', objs = [], crop = null, undo = [], redo = [], selIdx = -1;
      var tool = 'arrow', color = AN_COLORS[0], sizeIx = 1, unit = 1, drag = null, editor = null, raf = 0;
      var blurCache = new Map();
      var measure = canvasOf(1, 1).getContext('2d');

      var view = el('canvas');
      var stage = el('div', { class: 'g-stage', tabIndex: 0 }, view);
      var sizeLabel = el('span', { class: 'g-muted mono', dataset: { k: 'size' } });
      var countLabel = el('span', { class: 'g-muted', dataset: { k: 'objects' } });

      function tb(label, text, fn, extra) {
        return el('button', Object.assign({ class: 'g-tb', type: 'button', title: label, 'aria-label': label, onclick: fn }, extra || {}), text);
      }
      var toolBtns = AN_TOOLS.map(function (t) {
        return tb(t[1] + ' (' + t[3].toUpperCase() + ')', t[2], function () { setTool(t[0]); }, { 'aria-label': t[1], 'aria-pressed': 'false', dataset: { tool: t[0] } });
      });
      var swatches = AN_COLORS.map(function (c) {
        return el('button', { class: 'g-sw', type: 'button', title: 'Colour ' + c, 'aria-label': 'Colour ' + c, style: { background: c }, onclick: function () { setColor(c); } });
      });
      var custom = el('input', { type: 'color', value: color, title: 'Custom colour', 'aria-label': 'Custom colour', style: { width: '34px', height: '30px', padding: 0, border: 0, background: 'none' },
        oninput: function () { setColor(custom.value); } });
      var sizeBtns = [0, 1, 2].map(function (i) {
        var d = [5, 9, 14][i];
        return tb(['Thin', 'Medium', 'Thick'][i], el('i', { style: { display: 'inline-block', width: d + 'px', height: d + 'px', borderRadius: '50%', background: 'currentColor' } }),
          function () { sizeIx = i; if (selIdx >= 0) restyle(); paintBar(); }, { 'aria-label': ['Thin', 'Medium', 'Thick'][i], dataset: { size: String(i) } });
      });
      var undoBtn = tb('Undo (Ctrl+Z)', '↶', doUndo), redoBtn = tb('Redo (Ctrl+Y)', '↷', doRedo);
      var delBtn = tb('Delete selected (Del)', '🗑', deleteSel);
      var uncropBtn = U.button('Undo crop', function () { if (!crop) return; snapshot(); crop = null; fit(); }, 'ghost');
      var bar = el('div', { class: 'g-toolbar' }, toolBtns, el('span', { class: 'g-sep' }), swatches, custom, el('span', { class: 'g-sep' }), sizeBtns,
        el('span', { class: 'g-sep' }), undoBtn, redoBtn, delBtn);

      var copyBtn = U.button('Copy image', function () { copyImage(); });
      var saveBtn = U.button('Download PNG', function () { exportPng().then(function (b) { U.saveBlob(name + '-annotated.png', b); }); }, 'primary');
      var fp = filePicker({ accept: 'image/*,.heic,.heif', label: 'Paste a screenshot (Ctrl+V), drop one here, or click to choose',
        hint: 'PNG, JPG, WebP, HEIC… everything stays on this device', onFiles: function (f) { loadFile(f[0]); } });
      var status = U.note('');
      var work = el('div', { class: 'g-hide stack' },
        U.panel(null, bar, el('div', { class: 'g-stagewrap', style: { marginTop: '10px' } }, stage),
          el('div', { class: 'row', style: { alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' } }, sizeLabel, countLabel),
          U.btnrow(saveBtn, copyBtn, uncropBtn, U.button('Open another', fp.open, 'ghost'))),
        U.note('Keys: V select, A arrow, L line, R rectangle, O ellipse, P pen, H highlighter, T text, N numbered step, B blur, C crop; Delete removes the selection; Ctrl+Z / Ctrl+Y undo and redo. Hold Shift for straight lines and squares.'));

      function sizes() { var s = [2, 4, 8][sizeIx] * unit; return { w: s, fs: [18, 28, 44][sizeIx] * unit, r: [12, 16, 24][sizeIx] * unit, rad: [8, 14, 22][sizeIx] * unit }; }

      function paintBar() {
        toolBtns.forEach(function (b) { b.classList.toggle('on', b.dataset.tool === tool); b.setAttribute('aria-pressed', String(b.dataset.tool === tool)); });
        swatches.forEach(function (b, i) { b.classList.toggle('on', AN_COLORS[i] === color); });
        sizeBtns.forEach(function (b) { b.classList.toggle('on', +b.dataset.size === sizeIx); });
        stage.style.cursor = tool === 'select' ? 'default' : tool === 'text' ? 'text' : 'crosshair';
        undoBtn.disabled = !undo.length; redoBtn.disabled = !redo.length; delBtn.disabled = selIdx < 0;
        uncropBtn.classList.toggle('g-hide', !crop);
        countLabel.textContent = objs.length + (objs.length === 1 ? ' mark' : ' marks');
      }
      function setTool(t) { commitText(); tool = t; if (t !== 'select') selIdx = -1; paintBar(); request(); }
      function setColor(c) { color = c; if (selIdx >= 0) restyle(); paintBar(); }
      /* Recolour or resize the selected mark from the toolbar. */
      function restyle() {
        var o = objs[selIdx]; if (!o) return;
        snapshot();
        var s = sizes();
        if (o.t !== 'blur') o.c = color;
        if ('w' in o && o.t !== 'blur' && o.t !== 'text' && o.t !== 'step') o.w = s.w;
        if (o.t === 'text') o.fs = s.fs;
        if (o.t === 'step') o.r = s.r;
        request();
      }

      /* --- loading ------------------------------------------------------- */
      async function loadFile(f) {
        try {
          status.className = 'note'; status.textContent = 'Opening ' + (f.name || 'image') + '…';
          var r = await K().decodeFile(f);
          setBase(r.canvas, K().baseName(f.name || 'screenshot'));
          status.textContent = '';
        } catch (e) { status.className = 'note err'; status.textContent = e.message || String(e); }
      }
      function setBase(canvas, n) {
        commitText();
        base = canvas; name = n || 'screenshot';
        objs = []; crop = null; undo = []; redo = []; selIdx = -1; blurCache.clear();
        unit = Math.max(1, Math.round(Math.max(base.width, base.height) / 1200));
        fp.zone.classList.add('g-hide');
        work.classList.remove('g-hide');
        fit();
      }
      function fit() {
        var a = area();
        view.width = a.w; view.height = a.h;
        sizeLabel.textContent = a.w + ' × ' + a.h + ' px' + (crop ? ' (cropped)' : '');
        paintBar();
        request();
      }
      function area() { return crop ? { x: crop.x, y: crop.y, w: crop.w, h: crop.h } : { x: 0, y: 0, w: base.width, h: base.height }; }

      function onPaste(e) {
        var dt = e.clipboardData; if (!dt) return;
        var files = Array.prototype.slice.call(dt.files || []).filter(function (f) { return /^image\//.test(f.type); });
        if (!files.length && dt.items) {
          Array.prototype.forEach.call(dt.items, function (it) { if (it.kind === 'file' && /^image\//.test(it.type)) { var f = it.getAsFile(); if (f) files.push(f); } });
        }
        if (!files.length) return;
        e.preventDefault();
        loadFile(files[0]).then(function () { if (base) U.toast('Pasted screenshot opened'); });
      }
      document.addEventListener('paste', onPaste);

      /* --- drawing ----------------------------------------------------------- */
      function request() { paintBar(); if (!raf) raf = requestAnimationFrame(function () { raf = 0; paint(); }); }
      function scale() { var b = view.getBoundingClientRect(); return b.width ? view.width / b.width : 1; }
      function render(x, withUi) {
        var a = area();
        x.save();
        x.translate(-a.x, -a.y);
        x.drawImage(base, 0, 0);
        objs.forEach(function (o) { if (o.t === 'blur') anDraw(x, o, base, blurCache); });
        objs.forEach(function (o) { if (o.t !== 'blur') anDraw(x, o, base, blurCache); });
        if (withUi) {
          if (drag && drag.obj) anDraw(x, drag.obj, base, blurCache);
          var s = scale();
          if (selIdx >= 0 && objs[selIdx]) {
            var bb = anBounds(objs[selIdx], measure);
            x.lineWidth = 1.5 * s; x.setLineDash([5 * s, 4 * s]); x.strokeStyle = '#2563eb';
            x.strokeRect(bb.x - 3 * s, bb.y - 3 * s, bb.w + 6 * s, bb.h + 6 * s);
          }
          if (drag && drag.crop) {
            var c = drag.crop, cb = anBox(c);
            x.fillStyle = 'rgba(0,0,0,.45)';
            x.fillRect(a.x, a.y, a.w, cb.y - a.y);
            x.fillRect(a.x, cb.y + cb.h, a.w, a.y + a.h - cb.y - cb.h);
            x.fillRect(a.x, cb.y, cb.x - a.x, cb.h);
            x.fillRect(cb.x + cb.w, cb.y, a.x + a.w - cb.x - cb.w, cb.h);
            x.setLineDash([6 * s, 4 * s]); x.lineWidth = 1.5 * s; x.strokeStyle = '#fff';
            x.strokeRect(cb.x, cb.y, cb.w, cb.h);
          }
        }
        x.restore();
      }
      function paint() { if (!base) return; var x = view.getContext('2d'); x.clearRect(0, 0, view.width, view.height); render(x, true); paintBar(); }

      function pt(e) {
        var b = view.getBoundingClientRect(), a = area();
        return { x: a.x + (e.clientX - b.left) * view.width / b.width, y: a.y + (e.clientY - b.top) * view.height / b.height };
      }
      function snapshot() { undo.push(JSON.stringify({ o: objs, c: crop })); if (undo.length > 100) undo.shift(); redo = []; }
      function restore(state) { var s = JSON.parse(state); objs = s.o; crop = s.c; selIdx = -1; fit(); }
      function doUndo() { commitText(); if (!undo.length) return; redo.push(JSON.stringify({ o: objs, c: crop })); restore(undo.pop()); }
      function doRedo() { if (!redo.length) return; undo.push(JSON.stringify({ o: objs, c: crop })); restore(redo.pop()); }
      function deleteSel() { if (selIdx < 0) return; snapshot(); objs.splice(selIdx, 1); selIdx = -1; request(); }

      function hitAt(p) {
        var tol = 6 * scale();
        for (var i = objs.length - 1; i >= 0; i--) if (anHit(objs[i], p, tol, measure)) return i;
        return -1;
      }

      stage.addEventListener('pointerdown', function (e) {
        if (!base || editor || (e.button !== 0 && e.pointerType === 'mouse')) return;
        var p = pt(e), s = sizes();
        if (tool === 'text') { e.preventDefault(); startText(p); return; }
        e.preventDefault();
        stage.focus({ preventScroll: true });
        stage.setPointerCapture(e.pointerId);
        if (tool === 'select') {
          selIdx = hitAt(p);
          if (selIdx >= 0) drag = { move: true, last: p, moved: false };
          request();
          return;
        }
        if (tool === 'step') {
          snapshot();
          var n = objs.reduce(function (m, o) { return o.t === 'step' ? Math.max(m, o.n) : m; }, 0) + 1;
          objs.push({ t: 'step', x: p.x, y: p.y, r: s.r, n: n, c: color });
          request();
          return;
        }
        if (tool === 'crop') { drag = { crop: { x1: p.x, y1: p.y, x2: p.x, y2: p.y } }; return; }
        var o = tool === 'pen' || tool === 'hl' ? { t: tool, c: color, w: s.w, pts: [[p.x, p.y]] }
          : { t: tool, c: color, w: tool === 'blur' ? 0 : s.w, rad: s.rad, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
        drag = { obj: o };
        request();
      });
      stage.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var p = pt(e);
        if (drag.move) {
          if (!drag.moved) { snapshot(); drag.moved = true; }
          anMove(objs[selIdx], p.x - drag.last.x, p.y - drag.last.y);
          drag.last = p;
        } else if (drag.crop) {
          var a = area();
          drag.crop.x2 = clamp(p.x, a.x, a.x + a.w); drag.crop.y2 = clamp(p.y, a.y, a.y + a.h);
        } else {
          var o = drag.obj;
          if (o.pts) {
            if (e.shiftKey) o.pts = [o.pts[0], [p.x, p.y]];
            else { var last = o.pts[o.pts.length - 1]; if (Math.hypot(p.x - last[0], p.y - last[1]) > scale()) o.pts.push([p.x, p.y]); }
          } else {
            o.x2 = p.x; o.y2 = p.y;
            if (e.shiftKey) {
              var dx = o.x2 - o.x1, dy = o.y2 - o.y1;
              if (o.t === 'rect' || o.t === 'ellipse' || o.t === 'blur') { var m = Math.max(Math.abs(dx), Math.abs(dy)); o.x2 = o.x1 + m * (dx < 0 ? -1 : 1); o.y2 = o.y1 + m * (dy < 0 ? -1 : 1); }
              else { var an = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI / 4, l = Math.hypot(dx, dy); o.x2 = o.x1 + Math.cos(an) * l; o.y2 = o.y1 + Math.sin(an) * l; }
            }
          }
        }
        request();
      });
      function endDrag() {
        if (!drag) return;
        var d = drag; drag = null;
        if (d.crop) {
          var b = anBox(d.crop);
          if (b.w >= 8 && b.h >= 8) {
            snapshot();
            crop = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) };
            tool = 'select';
            fit();
            return;
          }
        } else if (d.obj) {
          var o = d.obj, tiny = !o.pts && Math.hypot(o.x2 - o.x1, o.y2 - o.y1) < 3;
          if (!tiny) { snapshot(); objs.push(o); }
        }
        request();
      }
      stage.addEventListener('pointerup', endDrag);
      stage.addEventListener('pointercancel', endDrag);

      /* Text: a floating box over the picture that becomes a text mark. */
      function startText(p) {
        commitText();
        var s = sizes(), k = 1 / scale(), a = area();
        var ta = el('textarea', { rows: 1, spellcheck: false, 'aria-label': 'Text to add', dataset: { k: 'text-input' } });
        ta.style.left = (p.x - a.x) * k + 'px';
        ta.style.top = (p.y - a.y) * k + 'px';
        ta.style.font = '600 ' + s.fs * k + 'px ' + AN_FONT;
        ta.style.color = color;
        var grow = function () { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; ta.style.width = 'auto'; ta.style.width = Math.max(60, ta.scrollWidth + 8) + 'px'; };
        ta.addEventListener('input', grow);
        ta.addEventListener('keydown', function (e) {
          e.stopPropagation();
          if (e.key === 'Escape') { e.preventDefault(); ta.value = ''; commitText(); }
          else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText(); }
        });
        ta.addEventListener('blur', function () { setTimeout(commitText, 0); });
        stage.appendChild(ta);
        editor = { ta: ta, p: p, fs: s.fs, c: color };
        setTimeout(function () { ta.focus(); grow(); }, 0);
      }
      function commitText() {
        if (!editor) return;
        var ed = editor; editor = null;
        var text = ed.ta.value.replace(/\s+$/, '');
        ed.ta.remove();
        if (!text) return;
        snapshot();
        objs.push({ t: 'text', x: ed.p.x, y: ed.p.y, fs: ed.fs, c: ed.c, text: text });
        request();
      }

      function onKey(e) {
        if (!base || work.classList.contains('g-hide')) return;
        var tag = (e.target && e.target.tagName) || '';
        if (/INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable)) return;
        var k = e.key.toLowerCase();
        if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); return; }
        if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); doRedo(); return; }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if ((e.key === 'Delete' || e.key === 'Backspace') && selIdx >= 0) { e.preventDefault(); deleteSel(); return; }
        if (e.key === 'Escape') { selIdx = -1; request(); return; }
        var t = AN_TOOLS.filter(function (x) { return x[3] === k; })[0];
        if (t) { e.preventDefault(); setTool(t[0]); }
      }
      document.addEventListener('keydown', onKey);
      U.onTeardown(root, function () {
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('paste', onPaste);
        if (raf) cancelAnimationFrame(raf);
      });

      /* --- export --------------------------------------------------------------- */
      function exportPng() {
        commitText();
        var a = area(), c = canvasOf(a.w, a.h);
        render(c.getContext('2d'), false);
        return K().toBlob(c, 'image/png');
      }
      function copyImage() {
        if (!base) return;
        if (!window.ClipboardItem || !navigator.clipboard || !navigator.clipboard.write) {
          U.toast('This browser cannot copy images; use Download PNG instead', 'err');
          return;
        }
        /* The blob is handed over as a promise so the copy still counts as
           part of the click, which browsers require for clipboard writes. */
        navigator.clipboard.write([new window.ClipboardItem({ 'image/png': exportPng() })])
          .then(function () { U.toast('Copied: paste it into a chat, email or document'); })
          .catch(function (err) { U.toast('The browser refused to copy the image' + (err && err.message ? ': ' + err.message : ''), 'err'); });
      }

      paintBar();
      root.append(U.panel(null, fp.zone, fp.picker, status), work);
    }
  });

  /* ======================================================================
     Before & After Image Compare
     ====================================================================== */

  /* Both pictures on white at the size being compared, so transparency and
     different dimensions don't skew the numbers. */
  function alignPair(A, B, how) {
    var W, H, a, b;
    if (how === 'crop') { W = Math.min(A.width, B.width); H = Math.min(A.height, B.height); }
    else { W = A.width; H = A.height; }
    a = canvasOf(W, H); b = canvasOf(W, H);
    var ax = cx(a), bx = cx(b);
    ax.fillStyle = bx.fillStyle = '#ffffff';
    ax.fillRect(0, 0, W, H); bx.fillRect(0, 0, W, H);
    ax.drawImage(A, 0, 0, W, H, 0, 0, W, H);
    if (how === 'crop') bx.drawImage(B, 0, 0, W, H, 0, 0, W, H);
    else { bx.imageSmoothingQuality = 'high'; bx.drawImage(B, 0, 0, W, H); }
    return { a: a, b: b, W: W, H: H };
  }

  /* One pass over both: a histogram of the largest channel difference per
     pixel (so any threshold can be read off instantly), plus the error sums
     behind MAE and PSNR, which are measured over the R, G and B channels. */
  function diffStats(a, b) {
    var da = cx(a).getImageData(0, 0, a.width, a.height).data, db = cx(b).getImageData(0, 0, b.width, b.height).data;
    var hist = new Float64Array(256), sum = 0, sq = 0, max = 0, n = da.length / 4;
    for (var i = 0; i < da.length; i += 4) {
      var r = Math.abs(da[i] - db[i]), g = Math.abs(da[i + 1] - db[i + 1]), bl = Math.abs(da[i + 2] - db[i + 2]);
      var m = r > g ? (r > bl ? r : bl) : (g > bl ? g : bl);
      hist[m]++;
      sum += r + g + bl; sq += r * r + g * g + bl * bl;
      if (m > max) max = m;
    }
    var mse = sq / (3 * n);
    return { hist: hist, n: n, mae: sum / (3 * n), mse: mse, psnr: mse ? 10 * Math.log10(255 * 255 / mse) : Infinity, max: max, da: da, db: db };
  }

  function diffImage(st, W, H, gain) {
    var c = canvasOf(W, H), x = cx(c), img = x.createImageData(W, H), o = img.data, da = st.da, db = st.db;
    for (var i = 0; i < o.length; i += 4) {
      o[i] = Math.min(255, Math.abs(da[i] - db[i]) * gain);
      o[i + 1] = Math.min(255, Math.abs(da[i + 1] - db[i + 1]) * gain);
      o[i + 2] = Math.min(255, Math.abs(da[i + 2] - db[i + 2]) * gain);
      o[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  Tools.register({
    id: 'image-compare', category: 'image', name: 'Before & After Image Compare',
    description: 'Compare two versions of a picture with a slider, side by side, as an overlay, a difference map or blinking, and measure how much changed.',
    keywords: ['compare images', 'image diff', 'difference', 'before and after', 'before after slider', 'side by side', 'overlay', 'blink',
      'psnr', 'mae', 'visual regression', 'spot the difference', 'compare photos', 'image comparison', 'changes'],
    render: function (root) {
      start(root);
      var A = null, B = null, pair = null, stats = null, mode = 'slider', pos = 50, blinkTimer = 0, blinkShowB = false;
      var names = { a: 'Before', b: 'After' };

      function side(which) {
        var info = el('div', { class: 'g-muted', dataset: { k: 'info-' + which } });
        var thumb = el('div', { class: 'g-prev g-check g-hide', style: { minHeight: '0' } });
        var fp = filePicker({ accept: 'image/*,.heic,.heif,.avif,.tif,.tiff', label: which === 'a' ? 'Before (A)' : 'After (B)', hint: 'Drop a picture or click to choose', onFiles: function (f) { load(which, f[0]); } });
        var box = el('div', {}, el('h4', { text: which === 'a' ? 'Before (A)' : 'After (B)' }), fp.zone, fp.picker, thumb, info,
          U.btnrow(U.button('Change', fp.open, 'ghost')));
        return { box: box, info: info, thumb: thumb, zone: fp.zone };
      }
      var sa = side('a'), sb = side('b');
      var status = U.note('');

      async function load(which, f) {
        try {
          status.className = 'note'; status.textContent = 'Reading ' + f.name + '…';
          var r = await K().decodeFile(f);
          var s = which === 'a' ? sa : sb;
          if (which === 'a') { A = r; names.a = f.name; } else { B = r; names.b = f.name; }
          s.zone.classList.add('g-hide');
          var t = K().cloneCanvas(r.canvas); t.style.maxHeight = '140px';
          s.thumb.replaceChildren(t); s.thumb.classList.remove('g-hide');
          s.info.textContent = f.name + ' · ' + r.width + ' × ' + r.height + ' px · ' + K().kb(f.size);
          status.textContent = '';
          rebuild();
        } catch (e) { status.className = 'note err'; status.textContent = e.message || String(e); }
      }

      var modeChips = K().choice([{ value: 'slider', label: 'Slider' }, { value: 'side', label: 'Side by side' }, { value: 'overlay', label: 'Overlay' },
        { value: 'diff', label: 'Difference' }, { value: 'blink', label: 'Blink' }], 'slider', function (v) { mode = v; show(); });
      var fitChips = K().choice([{ value: 'scale', label: 'Stretch B to A’s size' }, { value: 'crop', label: 'Compare the overlapping top-left area' }], 'scale', function () { rebuild(); });
      var fitBox = el('div', { class: 'g-hide' }, U.field('The two pictures are different sizes', fitChips));
      var opacity = K().slider('Opacity of B: {}', { min: 0, max: 100, value: 50 }, function (v) { return v + '%'; });
      var gain = K().slider('Amplify differences: {}', { min: 1, max: 50, value: 5 }, function (v) { return '×' + v; });
      var speed = K().choice([{ value: '250', label: 'Fast' }, { value: '600', label: 'Medium' }, { value: '1200', label: 'Slow' }], '600', function () { show(); });
      var speedBox = U.field('Blink speed', speed);
      var threshold = K().slider('Count a pixel as changed above: {}', { min: 0, max: 128, value: 8 }, function (v) { return String(v); });
      threshold.input.dataset.k = 'threshold';
      var posInput = el('input', { type: 'range', min: 0, max: 100, value: 50, 'aria-label': 'Slider position', style: { width: '100%' } });
      opacity.input.addEventListener('input', function () { if (mode === 'overlay') show(); });
      gain.input.addEventListener('input', U.debounce(function () { if (mode === 'diff') show(); }, 60));
      threshold.input.addEventListener('input', paintStats);
      posInput.addEventListener('input', function () { pos = +posInput.value; placeBar(); });

      var stageBox = el('div', { class: 'g-stagewrap' });
      var statBox = el('div', { class: 'stats' });
      var work = el('div', { class: 'g-hide stack' },
        U.panel(null, U.field('View', modeChips), fitBox, opacity, gain, speedBox, stageBox),
        U.panel('What changed', statBox, threshold,
          U.note('MAE is the average difference per colour channel on a 0–255 scale. PSNR is the usual quality score in decibels: above about 40 dB the two look the same to most people; identical pictures score ∞.')));

      function rebuild() {
        if (!A || !B) return;
        var differ = A.width !== B.width || A.height !== B.height;
        fitBox.classList.toggle('g-hide', !differ);
        pair = alignPair(A.canvas, B.canvas, differ ? fitChips.value : 'scale');
        stats = diffStats(pair.a, pair.b);
        work.classList.remove('g-hide');
        paintStats();
        show();
      }

      function stat(label, value, k) { return el('div', { class: 'stat' }, el('b', { dataset: { k: k }, text: value }), el('span', { text: label })); }
      function paintStats() {
        if (!stats) return;
        var t = threshold.get(), over = 0;
        for (var v = t + 1; v < 256; v++) over += stats.hist[v];
        var pct = over / stats.n * 100;
        statBox.replaceChildren(
          stat('Compared at', pair.W + ' × ' + pair.H + ' px', 'dims'),
          stat('Pixels changed (above ' + t + ')', (Math.abs(pct - Math.round(pct)) < 1e-9 ? pct.toFixed(0) : pct < 0.01 ? '<0.01' : pct.toFixed(2)) + '%', 'pct'),
          stat('Mean absolute error', stats.mae.toFixed(stats.mae < 10 ? 3 : 2), 'mae'),
          stat('PSNR', isFinite(stats.psnr) ? stats.psnr.toFixed(2) + ' dB' : '∞ (identical)', 'psnr'),
          stat('Largest difference', stats.max + ' / 255', 'max'));
      }

      function tag(text, right) { return el('span', { class: 'g-tag', style: right ? { right: '8px' } : { left: '8px' }, text: text }); }
      var bar = null, topWrap = null;
      function placeBar() {
        if (!bar) return;
        bar.style.left = pos + '%';
        topWrap.style.clipPath = 'inset(0 ' + (100 - pos) + '% 0 0)';
      }

      function show() {
        clearInterval(blinkTimer); blinkTimer = 0;
        if (!pair) return;
        opacity.classList.toggle('g-hide', mode !== 'overlay');
        gain.classList.toggle('g-hide', mode !== 'diff');
        speedBox.classList.toggle('g-hide', mode !== 'blink');
        bar = null;
        var a = K().cloneCanvas(pair.a), b = K().cloneCanvas(pair.b);
        if (mode === 'slider') {
          topWrap = el('div', { class: 'g-top' }, a);
          a.style.width = '100%';
          bar = el('div', { class: 'g-bar' });
          var box = el('div', { class: 'g-cmp', dataset: { k: 'stage' } }, b, topWrap, bar, tag('Before (A)'), tag('After (B)', true));
          var dragging = false;
          var setFrom = function (e) { var r = box.getBoundingClientRect(); pos = clamp((e.clientX - r.left) / r.width * 100, 0, 100); posInput.value = pos; placeBar(); };
          box.addEventListener('pointerdown', function (e) { dragging = true; box.setPointerCapture(e.pointerId); setFrom(e); });
          box.addEventListener('pointermove', function (e) { if (dragging) setFrom(e); });
          box.addEventListener('pointerup', function () { dragging = false; });
          stageBox.replaceChildren(el('div', { style: { width: '100%', display: 'grid', placeItems: 'center', gap: '8px' } }, box, posInput));
          placeBar();
        } else if (mode === 'side') {
          stageBox.replaceChildren(el('div', { class: 'g-side', style: { width: '100%' } },
            el('figure', {}, a, el('figcaption', { text: 'Before (A): ' + names.a })), el('figure', {}, b, el('figcaption', { text: 'After (B): ' + names.b }))));
        } else if (mode === 'overlay') {
          b.classList.add('g-top'); b.style.opacity = String(opacity.get() / 100);
          stageBox.replaceChildren(el('div', { class: 'g-cmp' }, a, b));
        } else if (mode === 'diff') {
          var d = diffImage(stats, pair.W, pair.H, gain.get());
          d.dataset.k = 'diff';
          stageBox.replaceChildren(el('div', { class: 'g-cmp' }, d, tag('|A − B| × ' + gain.get())));
        } else {
          var label = tag('Before (A)');
          var box2 = el('div', { class: 'g-cmp' }, a, b, label);
          b.classList.add('g-top');
          blinkShowB = false; b.style.visibility = 'hidden';
          blinkTimer = setInterval(function () {
            blinkShowB = !blinkShowB;
            b.style.visibility = blinkShowB ? 'visible' : 'hidden';
            label.textContent = blinkShowB ? 'After (B)' : 'Before (A)';
          }, +speed.value);
          stageBox.replaceChildren(box2);
        }
      }

      U.onTeardown(root, function () { clearInterval(blinkTimer); });
      root.append(U.panel(null, el('div', { class: 'g-grid2' }, sa.box, sb.box), status,
        U.btnrow(U.button('Swap A and B', function () {
          var t = A; A = B; B = t; var n = names.a; names.a = names.b; names.b = n;
          [[sa, A, names.a], [sb, B, names.b]].forEach(function (s) {
            if (!s[1]) { s[0].zone.classList.remove('g-hide'); s[0].thumb.classList.add('g-hide'); s[0].info.textContent = ''; return; }
            s[0].zone.classList.add('g-hide');
            var t2 = K().cloneCanvas(s[1].canvas); t2.style.maxHeight = '140px';
            s[0].thumb.replaceChildren(t2); s[0].thumb.classList.remove('g-hide');
            s[0].info.textContent = s[2] + ' · ' + s[1].width + ' × ' + s[1].height + ' px';
          });
          rebuild();
        }, 'ghost'))), work);
    }
  });

  /* ======================================================================
     Images to GIF
     ====================================================================== */

  /* Draw one frame into the output box. fit: letterbox inside it; crop:
     fill it and trim the overflow; pad: like fit but never enlarge. */
  function drawFrame(x, img, W, H, fit, bg) {
    x.fillStyle = bg;
    x.fillRect(0, 0, W, H);
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    var sw = img.width, sh = img.height;
    if (fit === 'crop') { K().drawCover(x, img, 0, 0, W, H); return; }
    var s = Math.min(W / sw, H / sh);
    if (fit === 'pad') s = Math.min(1, s);
    var dw = sw * s, dh = sh * s;
    x.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }

  Tools.register({
    id: 'images-to-gif', category: 'image', name: 'Images to GIF',
    description: 'Turn a set of pictures into an animated GIF, with a delay for each frame, looping, sizing and a live preview.',
    keywords: ['gif maker', 'animated gif', 'make gif', 'images to gif', 'photos to gif', 'slideshow', 'animation', 'frames', 'png to gif', 'jpg to gif', 'loop', 'flipbook'],
    render: function (root) {
      start(root);
      var frames = [], playing = 0, heightTouched = false, result = null, dragFrom = -1;
      var list = el('div', { class: 'g-frames' });
      var fp = filePicker({ accept: 'image/*,.heic,.heif', multiple: true, label: 'Drop the pictures for your GIF', hint: 'or click to choose · they play in the order shown, and you can reorder them', onFiles: add });
      var delay = numIn({ min: 20, max: 60000, step: 10, value: 500, dataset: { k: 'delay' } });
      var loopChips = K().choice([{ value: 'forever', label: 'Forever' }, { value: 'once', label: 'Play once' }, { value: 'times', label: 'A set number of times' }], 'forever', paintLoop);
      var times = numIn({ min: 2, max: 1000, value: 3, dataset: { k: 'loop-times' } });
      var timesBox = el('div', { class: 'g-hide' }, labelled('Plays in total', times));
      var width = numIn({ min: 16, max: 2000, value: 480, dataset: { k: 'width' } });
      var height = numIn({ min: 16, max: 2000, value: 360, dataset: { k: 'height' } });
      var fitChips = K().choice([{ value: 'fit', label: 'Fit (add borders)' }, { value: 'crop', label: 'Crop to fill' }, { value: 'pad', label: 'Pad, never enlarge' }], 'fit', function () { preview(); });
      var bg = K().colorField('Border colour', '#ffffff');
      var colours = el('select', { dataset: { k: 'colours' } }, [256, 128, 64, 32].map(function (n) { return el('option', { value: n, text: n + ' colours' }); }));
      var prevCanvas = canvasOf(480, 360);
      var prevBox = el('div', { class: 'g-prev g-check g-prevbox' }, prevCanvas);
      var playBtn = U.button('Play preview', togglePlay);
      var prog = U.progress();
      var out = el('div', { class: 'g-hide g-gifout stack' });

      function paintLoop() { timesBox.classList.toggle('g-hide', loopChips.value !== 'times'); }
      /* gifenc's repeat: 0 loops forever, -1 plays once (no loop block), N repeats N more times. */
      function repeatValue() { return loopChips.value === 'forever' ? 0 : loopChips.value === 'once' ? -1 : Math.max(1, Math.round(+times.value || 2) - 1); }
      function outSize() { return { W: clamp(Math.round(+width.value || 480), 16, 2000), H: clamp(Math.round(+height.value || 360), 16, 2000) }; }
      function frameDelay(f) { var d = parseFloat(f.delay.value); return clamp(Math.round(isFinite(d) && d > 0 ? d : (+delay.value || 500)), 20, 60000); }

      width.addEventListener('input', function () {
        if (!heightTouched && frames.length) height.value = Math.max(16, Math.round(+width.value * frames[0].img.height / frames[0].img.width));
        preview();
      });
      height.addEventListener('input', function () { heightTouched = true; preview(); });
      bg.addEventListener('change', preview);

      async function add(files) {
        prog.set('Reading ' + files.length + (files.length === 1 ? ' picture' : ' pictures') + '…');
        for (var i = 0; i < files.length; i++) {
          try {
            var r = await K().decodeFile(files[i]);
            var thumb = canvasOf(128, 96);
            drawFrame(cx(thumb), r.canvas, 128, 96, 'fit', '#00000000');
            frames.push({ img: r.canvas, name: files[i].name, thumb: thumb, delay: numIn({ min: 20, max: 60000, step: 10, placeholder: 'default', 'aria-label': 'Delay for ' + files[i].name + ' in ms' }) });
          } catch (e) { U.toast(e.message || String(e), 'err'); }
        }
        prog.set('');
        if (frames.length && !heightTouched) {
          var f0 = frames[0].img, w0 = Math.min(480, f0.width);
          width.value = w0;
          height.value = Math.max(16, Math.round(w0 * f0.height / f0.width));
        }
        fp.zone.classList.toggle('g-hide', frames.length > 0);
        settings.classList.toggle('g-hide', !frames.length);
        paintList();
        preview();
      }

      function move(i, j) {
        if (j < 0 || j >= frames.length) return;
        var f = frames.splice(i, 1)[0];
        frames.splice(j, 0, f);
        paintList(); preview();
      }

      function paintList() {
        list.replaceChildren.apply(list, frames.map(function (f, i) {
          var row = el('div', { class: 'g-frame', draggable: 'true', dataset: { k: 'frame' } },
            f.thumb, el('span', { class: 'g-fname', text: (i + 1) + '. ' + f.name }),
            el('label', { class: 'g-muted', style: { fontSize: '12px' } }, 'Delay (ms) ', f.delay),
            U.button('↑', function () { move(i, i - 1); }), U.button('↓', function () { move(i, i + 1); }),
            U.button('✕', function () { frames.splice(i, 1); if (!frames.length) { fp.zone.classList.remove('g-hide'); settings.classList.add('g-hide'); } paintList(); preview(); }, 'ghost'));
          row.children[3].setAttribute('aria-label', 'Move frame ' + (i + 1) + ' up');
          row.children[4].setAttribute('aria-label', 'Move frame ' + (i + 1) + ' down');
          row.children[5].setAttribute('aria-label', 'Remove frame ' + (i + 1));
          row.addEventListener('dragstart', function (e) { dragFrom = i; row.classList.add('g-drag'); try { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; } catch (err) { /* old browsers */ } });
          row.addEventListener('dragend', function () { row.classList.remove('g-drag'); });
          row.addEventListener('dragover', function (e) { if (dragFrom < 0) return; e.preventDefault(); row.classList.add('g-over'); });
          row.addEventListener('dragleave', function () { row.classList.remove('g-over'); });
          row.addEventListener('drop', function (e) { e.preventDefault(); row.classList.remove('g-over'); var from = dragFrom; dragFrom = -1; if (from >= 0 && from !== i) move(from, i); });
          f.delay.oninput = function () { if (playing) { togglePlay(); togglePlay(); } };
          return row;
        }));
      }

      function preview(index) {
        if (!frames.length) return;
        var s = outSize(), f = frames[index || 0] || frames[0];
        prevCanvas.width = s.W; prevCanvas.height = s.H;
        drawFrame(prevCanvas.getContext('2d'), f.img, s.W, s.H, fitChips.value, bg.get());
      }

      function togglePlay() {
        if (playing) { clearTimeout(playing); playing = 0; playBtn.textContent = 'Play preview'; preview(); return; }
        if (!frames.length) return;
        var i = 0;
        playBtn.textContent = 'Stop preview';
        (function step() {
          preview(i);
          var d = frameDelay(frames[i]);
          i = (i + 1) % frames.length;
          playing = setTimeout(step, d);
        })();
      }

      async function make() {
        if (!frames.length) return;
        if (playing) togglePlay();
        var s = outSize(), G = await U.module('assets/vendor/gifenc/gifenc.esm.js');
        var enc = G.GIFEncoder(), c = canvasOf(s.W, s.H), x = cx(c), n = +colours.value || 256;
        for (var i = 0; i < frames.length; i++) {
          prog.set('Encoding frame ' + (i + 1) + ' of ' + frames.length + '…', i / frames.length);
          await tick();
          drawFrame(x, frames[i].img, s.W, s.H, fitChips.value, bg.get());
          var data = x.getImageData(0, 0, s.W, s.H).data;
          var palette = G.quantize(data, n);
          var index = G.applyPalette(data, palette);
          enc.writeFrame(index, s.W, s.H, { palette: palette, delay: frameDelay(frames[i]), repeat: repeatValue() });
        }
        enc.finish();
        var blob = new Blob([enc.bytes()], { type: 'image/gif' });
        if (result) URL.revokeObjectURL(result.url);
        result = { blob: blob, url: URL.createObjectURL(blob) };
        var total = frames.reduce(function (t, f) { return t + frameDelay(f); }, 0);
        var loops = loopChips.value === 'forever' ? 'loops forever' : loopChips.value === 'once' ? 'plays once' : 'plays ' + (repeatValue() + 1) + ' times';
        prog.done('GIF ready.');
        out.replaceChildren(
          el('img', { src: result.url, alt: 'Your animated GIF' }),
          el('div', { class: 'g-bigstat g-res-info' }, el('b', { dataset: { k: 'gif-size' }, text: K().kb(blob.size) }),
            el('span', { text: s.W + ' × ' + s.H + ' px · ' + frames.length + ' frames · ' + (total / 1000).toFixed(total % 1000 ? 2 : 0) + ' s per play · ' + loops })),
          blob.size > 8 * 1048576 ? U.note('That is a large GIF: a smaller width or fewer colours will shrink it a lot.', 'err') : null,
          U.btnrow(U.button('Download GIF', function () { U.saveBlob('animation.gif', result.blob); }, 'primary')));
        out.classList.remove('g-hide');
      }

      U.onTeardown(root, function () { clearTimeout(playing); if (result) URL.revokeObjectURL(result.url); });

      var settings = el('div', { class: 'g-hide stack' },
        U.panel('Frames', list, U.btnrow(U.button('Add pictures', fp.open, 'ghost'), U.button('Reverse order', function () { frames.reverse(); paintList(); preview(); }, 'ghost'))),
        U.panel('Settings',
          el('div', { class: 'g-mini' }, labelled('Delay per frame (ms)', delay, 'A frame’s own delay overrides this'), labelled('Width (px)', width), labelled('Height (px)', height), labelled('Colours', colours)),
          U.field('Loop', loopChips), timesBox, U.field('Sizing', fitChips), bg,
          U.btnrow(playBtn, U.button('Make GIF', function () { make().catch(function (e) { prog.fail(e); }); }, 'primary')), prog),
        U.panel('Preview', prevBox, out));
      paintLoop();
      root.append(U.panel(null, fp.zone, fp.picker), settings);
    }
  });

  /* ======================================================================
     Image Splitter & Poster Tiles
     ====================================================================== */

  var PAPER = { a4: { label: 'A4', w: 210, h: 297 }, a3: { label: 'A3', w: 297, h: 420 }, letter: { label: 'US Letter', w: 215.9, h: 279.4 } };
  var PT_PER_MM = 72 / 25.4;

  /* Tile edges along one side: `cuts` are the nominal boundaries; each tile
     then reaches into its neighbours so adjacent tiles share `overlap` px. */
  function spans(cuts, overlap, size) {
    var out = [];
    for (var i = 0; i < cuts.length - 1; i++) {
      var a = cuts[i] - (i > 0 ? Math.floor(overlap / 2) : 0), b = cuts[i + 1] + (i < cuts.length - 2 ? Math.ceil(overlap / 2) : 0);
      out.push({ start: clamp(a, 0, size), end: clamp(b, 0, size) });
    }
    return out;
  }
  function evenCuts(size, n) { var c = []; for (var i = 0; i <= n; i++) c.push(Math.round(i * size / n)); return c; }
  function stepCuts(size, step) { var c = []; for (var v = 0; v < size; v += step) c.push(v); c.push(size); return c; }

  /* Where each printed page sits on the finished poster, in millimetres. */
  function posterPlan(imgW, imgH, o) {
    var paper = PAPER[o.paper] || PAPER.a4;
    var pw = o.landscape ? paper.h : paper.w, ph = o.landscape ? paper.w : paper.h;
    var printW = pw - 2 * o.margin, printH = ph - 2 * o.margin, ov = o.overlap;
    if (printW <= ov + 5 || printH <= ov + 5) throw new Error('The margins and overlap leave no room to print on. Make them smaller.');
    var posterW = o.across * printW - (o.across - 1) * ov;
    var mmPerPx = posterW / imgW, posterH = imgH * mmPerPx;
    var down = posterH <= printH ? 1 : Math.ceil((posterH - ov) / (printH - ov) - 1e-9);
    var pages = [];
    for (var r = 0; r < down; r++) for (var c = 0; c < o.across; c++) {
      var x0 = c * (printW - ov), y0 = r * (printH - ov);
      pages.push({ r: r, c: c, x0: x0, y0: y0, w: Math.min(printW, posterW - x0), h: Math.min(printH, posterH - y0) });
    }
    return { pw: pw, ph: ph, printW: printW, printH: printH, posterW: posterW, posterH: posterH, across: o.across, down: down, mmPerPx: mmPerPx,
      dpi: 25.4 / mmPerPx, pages: pages, paper: paper };
  }

  Tools.register({
    id: 'image-splitter', category: 'image', name: 'Image Splitter & Poster Tiles',
    description: 'Cut a picture into a grid of tiles at full resolution, or print it big across several A4, A3 or Letter pages as a PDF poster.',
    keywords: ['split image', 'image splitter', 'tiles', 'grid', 'slice', 'cut image', 'crop into pieces', 'poster', 'print large', 'rasterbator',
      'block poster', 'tile print', 'a4', 'a3', 'letter', 'pdf', 'overlap', 'cut marks', 'zip'],
    render: function (root) {
      start(root);
      var src = null;
      var mode = K().choice([{ value: 'grid', label: 'Rows × columns' }, { value: 'size', label: 'Tile size' }, { value: 'poster', label: 'Poster (PDF)' }], 'grid', function () { paintMode(); update(); });
      var rows = numIn({ min: 1, max: 50, value: 2, dataset: { k: 'rows' } }), cols = numIn({ min: 1, max: 50, value: 3, dataset: { k: 'cols' } });
      var tw = numIn({ min: 8, value: 512, dataset: { k: 'tile-w' } }), th = numIn({ min: 8, value: 512, dataset: { k: 'tile-h' } });
      var overlap = numIn({ min: 0, value: 0, dataset: { k: 'overlap' } });
      var fmt = K().choice([{ value: 'image/png', label: 'PNG' }, { value: 'image/jpeg', label: 'JPEG' }], 'image/png');
      var paper = el('select', { dataset: { k: 'paper' } }, Object.keys(PAPER).map(function (k) { return el('option', { value: k, text: PAPER[k].label }); }));
      paper.value = Region.get().paper;
      var orient = K().choice([{ value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }], 'portrait', function () { update(); });
      var across = numIn({ min: 1, max: 20, value: 2, dataset: { k: 'across' } });
      var margin = numIn({ min: 0, max: 40, step: 0.5, value: 10, dataset: { k: 'margin' } });
      var pOverlap = numIn({ min: 0, max: 50, step: 0.5, value: 10, dataset: { k: 'poster-overlap' } });
      var marks = U.checkbox('Cut marks and overlap guides', { checked: true, dataset: { k: 'marks' } });
      var labels = U.checkbox('Label each page (row and column)', { checked: true });
      var info = el('div', { class: 'g-info', dataset: { k: 'plan' } });
      var prevCanvas = canvasOf(10, 10);
      var prog = U.progress();
      var goBtn = U.button('Download tiles (ZIP)', function () { go().catch(function (e) { prog.fail(e); }); }, 'primary');

      var gridBox = el('div', { class: 'g-mini' }, labelled('Rows', rows), labelled('Columns', cols));
      var sizeBox = el('div', { class: 'g-mini' }, labelled('Tile width (px)', tw), labelled('Tile height (px)', th));
      var tileBox = el('div', {}, labelled('Overlap between tiles (px)', overlap, 'Neighbouring tiles repeat this many pixels'), U.field('Save tiles as', fmt));
      var posterBox = el('div', { class: 'g-hide' },
        el('div', { class: 'g-mini' }, labelled('Paper', paper), labelled('Pages across', across), labelled('Margin (mm)', margin, 'Unprinted border'), labelled('Overlap (mm)', pOverlap, 'For gluing')),
        U.field('Orientation', orient), marks, labels,
        U.note('Print at 100% (actual size, not "fit to page"). Trim the margin off the right and bottom edges, then lay each page over the overlap of its neighbour, lining up the guides.'));
      [rows, cols, tw, th, overlap, across, margin, pOverlap, paper].forEach(function (n) { n.addEventListener('input', update); n.addEventListener('change', update); });

      function paintMode() {
        var m = mode.value;
        gridBox.classList.toggle('g-hide', m !== 'grid');
        sizeBox.classList.toggle('g-hide', m !== 'size');
        tileBox.classList.toggle('g-hide', m === 'poster');
        posterBox.classList.toggle('g-hide', m !== 'poster');
        goBtn.textContent = m === 'poster' ? 'Download poster (PDF)' : 'Download tiles (ZIP)';
      }

      function int(n, lo, hi, dflt) { var v = Math.round(+n.value); return isFinite(v) && v >= lo ? Math.min(v, hi) : dflt; }
      function tilePlan() {
        var W = src.width, H = src.height, xc, yc;
        if (mode.value === 'size') { xc = stepCuts(W, int(tw, 8, W, W)); yc = stepCuts(H, int(th, 8, H, H)); }
        else { xc = evenCuts(W, int(cols, 1, Math.min(50, W), 1)); yc = evenCuts(H, int(rows, 1, Math.min(50, H), 1)); }
        var ov = int(overlap, 0, 4096, 0);
        return { xs: spans(xc, ov, W), ys: spans(yc, ov, H), cutsX: xc, cutsY: yc, overlap: ov };
      }
      function posterOpts() {
        return { paper: paper.value, landscape: orient.value === 'landscape', across: int(across, 1, 20, 1),
          margin: clamp(parseFloat(margin.value) || 0, 0, 40), overlap: clamp(parseFloat(pOverlap.value) || 0, 0, 50) };
      }

      function update() {
        if (!src) return;
        var W = src.width, H = src.height, s = Math.min(1, 900 / Math.max(W, H));
        prevCanvas.width = Math.round(W * s); prevCanvas.height = Math.round(H * s);
        var x = prevCanvas.getContext('2d');
        x.drawImage(src.canvas, 0, 0, prevCanvas.width, prevCanvas.height);
        x.save();
        x.scale(s, s);
        x.lineWidth = 2 / s;
        try {
          if (mode.value === 'poster') {
            var p = posterPlan(W, H, posterOpts());
            x.strokeStyle = '#e11d48'; x.fillStyle = 'rgba(225,29,72,.18)';
            p.pages.forEach(function (pg) {
              var px = pg.x0 / p.mmPerPx, py = pg.y0 / p.mmPerPx, pw = pg.w / p.mmPerPx, ph = pg.h / p.mmPerPx;
              x.strokeRect(px, py, pw, ph);
            });
            var ovPx = posterOpts().overlap / p.mmPerPx;
            for (var c = 1; c < p.across; c++) x.fillRect(c * (p.printW - posterOpts().overlap) / p.mmPerPx, 0, ovPx, H);
            for (var r = 1; r < p.down; r++) x.fillRect(0, r * (p.printH - posterOpts().overlap) / p.mmPerPx, W, ovPx);
            info.textContent = p.across + ' × ' + p.down + ' pages of ' + p.paper.label + ' (' + (p.pages.length) + ' in all) · finished poster about ' +
              Math.round(p.posterW) + ' × ' + Math.round(p.posterH) + ' mm · ' + Math.round(p.dpi) + ' dpi' + (p.dpi < 100 ? ' (likely to look soft: use a larger picture or fewer pages)' : '');
            info.classList.toggle('g-bad', p.dpi < 100);
          } else {
            var t = tilePlan();
            x.strokeStyle = '#e11d48'; x.fillStyle = 'rgba(225,29,72,.22)';
            t.cutsX.slice(1, -1).forEach(function (cx0) { x.beginPath(); x.moveTo(cx0, 0); x.lineTo(cx0, H); x.stroke(); if (t.overlap) x.fillRect(cx0 - Math.floor(t.overlap / 2), 0, t.overlap, H); });
            t.cutsY.slice(1, -1).forEach(function (cy0) { x.beginPath(); x.moveTo(0, cy0); x.lineTo(W, cy0); x.stroke(); if (t.overlap) x.fillRect(0, cy0 - Math.floor(t.overlap / 2), W, t.overlap); });
            var ws = t.xs.map(function (a) { return a.end - a.start; }), hs = t.ys.map(function (a) { return a.end - a.start; });
            var same = Math.min.apply(null, ws) === Math.max.apply(null, ws) && Math.min.apply(null, hs) === Math.max.apply(null, hs);
            info.textContent = (t.xs.length * t.ys.length) + ' tiles (' + t.ys.length + ' rows × ' + t.xs.length + ' columns), ' +
              (same ? ws[0] + ' × ' + hs[0] + ' px each' : 'from ' + Math.min.apply(null, ws) + ' × ' + Math.min.apply(null, hs) + ' to ' + Math.max.apply(null, ws) + ' × ' + Math.max.apply(null, hs) + ' px');
            info.classList.remove('g-bad');
          }
        } catch (e) { info.textContent = e.message; info.classList.add('g-bad'); }
        x.restore();
      }

      async function go() {
        if (!src) return;
        if (mode.value === 'poster') return poster();
        var t = tilePlan(), mime = fmt.value, list = [], base = K().baseName(src.file.name);
        var pad = function (n, max) { var s = String(n); while (s.length < String(max).length) s = '0' + s; return s; };
        var total = t.xs.length * t.ys.length, k = 0;
        for (var r = 0; r < t.ys.length; r++) for (var c = 0; c < t.xs.length; c++) {
          prog.set('Cutting tile ' + (++k) + ' of ' + total + '…', k / total);
          if (k % 8 === 0) await tick();
          var a = t.xs[c], b = t.ys[r], w = a.end - a.start, h = b.end - b.start;
          var tile = canvasOf(w, h);
          cx(tile).drawImage(src.canvas, a.start, b.start, w, h, 0, 0, w, h);
          var blob = await K().toBlob(mime === 'image/jpeg' ? K().flatten(tile, '#ffffff') : tile, mime, 0.92);
          list.push({ name: base + '_r' + pad(r + 1, t.ys.length) + '_c' + pad(c + 1, t.xs.length) + '.' + K().extFor(mime), blob: blob });
        }
        prog.set('Zipping ' + total + ' tiles…');
        await saveZip(base + '-tiles.zip', list);
        prog.done('Saved ' + total + ' tiles in a ZIP.');
      }

      async function poster() {
        var o = posterOpts(), p = posterPlan(src.width, src.height, o);
        await U.script('assets/vendor/pdf-lib/pdf-lib.min.js');
        var L = window.PDFLib, pdf = await L.PDFDocument.create(), font = await pdf.embedFont(L.StandardFonts.Helvetica);
        var alpha = K().hasAlpha(src.canvas), maxPxPerMm = 300 / 25.4, grey = L.rgb(0.35, 0.35, 0.35);
        pdf.setTitle(K().baseName(src.file.name) + ' poster');
        pdf.setCreator('All The Tools');
        for (var i = 0; i < p.pages.length; i++) {
          var pg = p.pages[i];
          prog.set('Laying out page ' + (i + 1) + ' of ' + p.pages.length + '…', i / p.pages.length);
          await tick();
          var sx = pg.x0 / p.mmPerPx, sy = pg.y0 / p.mmPerPx, sw = pg.w / p.mmPerPx, sh = pg.h / p.mmPerPx;
          /* no point embedding more than 300 dpi: paper can't show it */
          var k = Math.min(1, maxPxPerMm * p.mmPerPx);
          var tile = canvasOf(Math.max(1, Math.round(sw * k)), Math.max(1, Math.round(sh * k))), tx = cx(tile);
          tx.imageSmoothingQuality = 'high';
          tx.drawImage(src.canvas, sx, sy, sw, sh, 0, 0, tile.width, tile.height);
          var bytes = new Uint8Array(await (await K().toBlob(alpha ? tile : K().flatten(tile, '#ffffff'), alpha ? 'image/png' : 'image/jpeg', 0.92)).arrayBuffer());
          var img = alpha ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
          var page = pdf.addPage([p.pw * PT_PER_MM, p.ph * PT_PER_MM]);
          var m = o.margin * PT_PER_MM, W = pg.w * PT_PER_MM, H = pg.h * PT_PER_MM, top = p.ph * PT_PER_MM - m;
          page.drawImage(img, { x: m, y: top - H, width: W, height: H });
          if (marks.input.checked && o.margin >= 3) {
            var len = Math.min(6, o.margin - 1.5) * PT_PER_MM, gap = 1 * PT_PER_MM, t = 0.5;
            [[m, top], [m + W, top], [m, top - H], [m + W, top - H]].forEach(function (q, qi) {
              var right = qi % 2 === 1, low = qi > 1;
              page.drawLine({ start: { x: right ? q[0] + gap : q[0] - gap - len, y: q[1] }, end: { x: right ? q[0] + gap + len : q[0] - gap, y: q[1] }, thickness: t, color: L.rgb(0, 0, 0) });
              page.drawLine({ start: { x: q[0], y: low ? q[1] - gap - len : q[1] + gap }, end: { x: q[0], y: low ? q[1] - gap : q[1] + gap + len }, thickness: t, color: L.rgb(0, 0, 0) });
            });
            /* where the next page's picture starts, so the pieces line up */
            var ovPt = o.overlap * PT_PER_MM;
            if (pg.c < p.across - 1 && ovPt > 0) [top + gap, top - H - gap - len].forEach(function (y0) {
              page.drawLine({ start: { x: m + W - ovPt, y: y0 }, end: { x: m + W - ovPt, y: y0 + len }, thickness: t, color: grey, dashArray: [2, 2] });
            });
            if (pg.r < p.down - 1 && ovPt > 0) [m - gap - len, m + W + gap].forEach(function (x0) {
              page.drawLine({ start: { x: x0, y: top - H + ovPt }, end: { x: x0 + len, y: top - H + ovPt }, thickness: t, color: grey, dashArray: [2, 2] });
            });
          }
          if (labels.input.checked && o.margin >= 5) {
            page.drawText('Row ' + (pg.r + 1) + ', column ' + (pg.c + 1) + ' (page ' + (i + 1) + ' of ' + p.pages.length + ')', { x: m, y: Math.max(4, m / 2 - 3), size: 7, font: font, color: grey });
          }
        }
        prog.set('Saving the PDF…');
        var out = await pdf.save();
        U.saveBlob(K().baseName(src.file.name) + '-poster.pdf', new Blob([out], { type: 'application/pdf' }));
        prog.done('Poster PDF saved: ' + p.pages.length + ' pages.');
      }

      var ld = K().loader({ label: 'Drop a picture to split', hint: 'or click to choose · cut into tiles or print as a poster', onLoad: function (r) {
        src = r;
        work.classList.remove('g-hide');
        update();
      } });
      var work = el('div', { class: 'g-hide stack' },
        U.panel(null, U.field('Split by', mode), gridBox, sizeBox, tileBox, posterBox, U.btnrow(goBtn, ld.change), prog),
        U.panel('Preview', el('div', { class: 'g-prev' }, prevCanvas), info));
      paintMode();
      root.append(U.panel(null, ld.zone, ld.status, ld.picker), work);
    }
  });

})();
