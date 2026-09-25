/* file-c tools: Font Viewer & Converter. Reads TrueType, OpenType and WOFF
   files directly (the sfnt table directory, name, head, OS/2, cmap, fvar and
   the GSUB/GPOS feature lists), previews them through the FontFace API, and
   converts between TTF/OTF and WOFF. WOFF's zlib compression comes from the
   vendored pako. WOFF2 needs Brotli, which browsers don't expose to pages,
   so WOFF2 files can be viewed but not converted. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  var STYLE = [
    '.g-filec .fc-kv { width: 100%; border-collapse: collapse; font-size: 14px; }',
    '.g-filec .fc-kv th, .g-filec .fc-kv td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--border); vertical-align: top; }',
    '.g-filec .fc-kv th { width: 34%; color: var(--fg-muted); font-weight: 500; white-space: nowrap; }',
    '.g-filec .fc-kv td { overflow-wrap: anywhere; }',
    '.g-filec .fc-sample { width: 100%; box-sizing: border-box; }',
    '.g-filec .fc-big { font-size: 64px; line-height: 1.25; overflow-wrap: anywhere; padding: 8px 0; min-height: 1.3em; }',
    '.g-filec .fc-fall { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }',
    '.g-filec .fc-fall div { display: flex; align-items: baseline; gap: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-top: 1px solid var(--border); padding-top: 4px; }',
    '.g-filec .fc-fall small { flex: 0 0 38px; color: var(--fg-muted); font: 12px var(--mono); }',
    '.g-filec .fc-fall span { overflow: hidden; text-overflow: ellipsis; }',
    '.g-filec .fc-inline { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; margin: 8px 0; }',
    '.g-filec .fc-inline input[type=range] { width: 170px; }',
    '.g-filec .fc-axis { display: flex; align-items: center; gap: 8px; font-size: 13px; }',
    '.g-filec .fc-axis b { font: 600 12px var(--mono); }',
    '.g-filec .fc-axis output { font: 12px var(--mono); min-width: 44px; color: var(--fg-muted); }',
    '.g-filec .fc-feat { display: flex; flex-wrap: wrap; gap: 4px 14px; }',
    '.g-filec .fc-feat .check span { font-size: 13px; }',
    '.g-filec .fc-feat code { font-size: 11.5px; color: var(--fg-muted); }',
    '.g-filec .fc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 4px; }',
    '.g-filec .fc-cell { border: 1px solid var(--border); border-radius: var(--radius-s); background: var(--bg-elev); padding: 4px 2px 3px; text-align: center; cursor: pointer; min-width: 0; color: inherit; }',
    '.g-filec .fc-cell:hover, .g-filec .fc-cell.on { border-color: var(--accent); }',
    '.g-filec .fc-cell span { display: block; font-size: 28px; line-height: 1.3; height: 38px; overflow: hidden; }',
    '.g-filec .fc-cell small { display: block; font: 10px var(--mono); color: var(--fg-muted); }',
    '.g-filec .fc-detail { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; margin-bottom: 12px; padding: 10px; border: 1px solid var(--border); border-radius: var(--radius-s); background: var(--bg-sunken); }',
    '.g-filec .fc-detail .g { font-size: 110px; line-height: 1; min-width: 130px; text-align: center; }',
    '.g-filec .fc-blocks { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 4px 16px; font-size: 13px; }',
    '.g-filec .fc-blocks div { display: flex; justify-content: space-between; gap: 8px; border-bottom: 1px dotted var(--border); padding: 2px 0; }',
    '.g-filec .fc-blocks b { font-variant-numeric: tabular-nums; font-weight: 500; color: var(--fg-muted); }',
    '.g-filec pre.fc-css { white-space: pre-wrap; word-break: break-all; }',
    '.g-filec .fc-hidden { display: none !important; }'
  ].join('\n');
  if (!document.getElementById('g-file-c-style')) document.head.appendChild(el('style', { id: 'g-file-c-style', text: STYLE }));

  function libPako() { return U.script('assets/vendor/pako/pako.min.js').then(function () { return window.pako; }); }

  /* ---------- sfnt reading ---------- */

  function tagAt(dv, o) { return String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3)); }
  function pad4(n) { return (n + 3) & ~3; }

  function kindOf(bytes) {
    if (bytes.length < 12) return null;
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), sig = dv.getUint32(0), tag = tagAt(dv, 0);
    if (sig === 0x00010000 || tag === 'true' || tag === 'typ1') return 'ttf';
    if (tag === 'OTTO') return 'otf';
    if (tag === 'wOFF') return 'woff';
    if (tag === 'wOF2') return 'woff2';
    if (tag === 'ttcf') return 'ttc';
    return null;
  }

  /* The sfnt table directory: { flavor, tables: { tag: { offset, length, checksum } } }. */
  function readSfnt(bytes) {
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var n = dv.getUint16(4), tables = {};
    if (12 + n * 16 > bytes.length) throw new Error('The table directory runs past the end of the file.');
    for (var i = 0; i < n; i++) {
      var o = 12 + i * 16, t = { offset: dv.getUint32(o + 8), length: dv.getUint32(o + 12), checksum: dv.getUint32(o + 4) };
      if (t.offset + t.length > bytes.length) throw new Error('Table ' + tagAt(dv, o) + ' runs past the end of the file.');
      tables[tagAt(dv, o)] = t;
    }
    return { flavor: dv.getUint32(0), tables: tables, bytes: bytes, dv: dv };
  }
  function tableBytes(font, tag) {
    var t = font.tables[tag];
    return t ? font.bytes.subarray(t.offset, t.offset + t.length) : null;
  }

  function checksum(data) {
    var sum = 0, n = data.length, i = 0;
    for (; i + 4 <= n; i += 4) sum = (sum + ((data[i] << 24) | (data[i + 1] << 16) | (data[i + 2] << 8) | data[i + 3])) >>> 0;
    if (i < n) {
      var last = 0;
      for (var k = 0; k < 4; k++) last = (last << 8) | (i + k < n ? data[i + k] : 0);
      sum = (sum + (last >>> 0)) >>> 0;
    }
    return sum;
  }

  /* Assemble an sfnt from { tag: Uint8Array } with a fresh directory,
     table checksums and head.checkSumAdjustment. */
  function buildSfnt(flavor, tables) {
    var tags = Object.keys(tables).sort(), n = tags.length;
    var p = 1, e = 0;
    while (p * 2 <= n) { p *= 2; e++; }
    var size = 12 + 16 * n;
    tags.forEach(function (t) { size += pad4(tables[t].length); });
    var out = new Uint8Array(size), dv = new DataView(out.buffer);
    dv.setUint32(0, flavor);
    dv.setUint16(4, n); dv.setUint16(6, p * 16); dv.setUint16(8, e); dv.setUint16(10, n * 16 - p * 16);
    var at = 12 + 16 * n, headAt = -1;
    tags.forEach(function (t, i) {
      var data = tables[t], d = 12 + i * 16;
      out.set(data, at);
      if (t === 'head' && data.length >= 12) { headAt = at; dv.setUint32(at + 8, 0); }
      for (var k = 0; k < 4; k++) out[d + k] = t.charCodeAt(k);
      dv.setUint32(d + 4, checksum(out.subarray(at, at + data.length)));
      dv.setUint32(d + 8, at);
      dv.setUint32(d + 12, data.length);
      at += pad4(data.length);
    });
    if (headAt > -1) dv.setUint32(headAt + 8, (0xB1B0AFBA - checksum(out)) >>> 0);
    return out;
  }

  /* WOFF 1.0 (W3C): zlib-compressed tables behind a 44-byte header. */
  function sfntToWoff(bytes, pako) {
    var font = readSfnt(bytes), tags = Object.keys(font.tables).sort(), n = tags.length;
    var blocks = [], total = 12 + 16 * n;
    tags.forEach(function (t) {
      var raw = tableBytes(font, t), data = raw;
      /* A table is stored as-is when compressing it wouldn't save anything. */
      var z = pako.deflate(raw, { level: 9 });
      if (z.length < raw.length) data = z;
      total += pad4(raw.length);
      blocks.push({ tag: t, data: data, orig: raw.length, sum: font.tables[t].checksum });
    });
    var size = 44 + 20 * n;
    blocks.forEach(function (b) { b.offset = size; size += pad4(b.data.length); });
    var out = new Uint8Array(size), dv = new DataView(out.buffer);
    out.set([0x77, 0x4F, 0x46, 0x46], 0);
    dv.setUint32(4, font.flavor);
    dv.setUint32(8, size);
    dv.setUint16(12, n);
    dv.setUint32(16, total);
    dv.setUint16(20, 1); dv.setUint16(22, 0);
    blocks.forEach(function (b, i) {
      var d = 44 + i * 20;
      for (var k = 0; k < 4; k++) out[d + k] = b.tag.charCodeAt(k);
      dv.setUint32(d + 4, b.offset);
      dv.setUint32(d + 8, b.data.length);
      dv.setUint32(d + 12, b.orig);
      dv.setUint32(d + 16, b.sum);
      out.set(b.data, b.offset);
    });
    return out;
  }

  function woffToSfnt(bytes, pako) {
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var flavor = dv.getUint32(4), n = dv.getUint16(12), tables = {};
    for (var i = 0; i < n; i++) {
      var d = 44 + i * 20, tag = tagAt(dv, d), off = dv.getUint32(d + 4), comp = dv.getUint32(d + 8), orig = dv.getUint32(d + 12);
      if (off + comp > bytes.length) throw new Error('WOFF table ' + tag + ' runs past the end of the file.');
      var data = bytes.subarray(off, off + comp);
      if (comp < orig) data = pako.inflate(data);
      if (data.length !== orig) throw new Error('WOFF table ' + tag + ' did not decompress to its stated size.');
      tables[tag] = data;
    }
    return buildSfnt(flavor, tables);
  }

  /* ---------- table parsers ---------- */

  var NAME_IDS = { 0: 'copyright', 1: 'family', 2: 'subfamily', 3: 'uniqueId', 4: 'fullName', 5: 'version', 6: 'postscript',
    7: 'trademark', 8: 'manufacturer', 9: 'designer', 10: 'description', 11: 'vendorUrl', 12: 'designerUrl', 13: 'licence',
    14: 'licenceUrl', 16: 'typoFamily', 17: 'typoSubfamily', 19: 'sampleText' };

  function readNames(font) {
    var t = font.tables.name, out = {}, rank = {}, byId = {};
    if (!t) return { names: out, byId: byId };
    var dv = font.dv, o = t.offset, count = dv.getUint16(o + 2), strings = o + dv.getUint16(o + 4);
    for (var i = 0; i < count; i++) {
      var r = o + 6 + i * 12, pid = dv.getUint16(r), eid = dv.getUint16(r + 2), lang = dv.getUint16(r + 4), id = dv.getUint16(r + 6);
      var len = dv.getUint16(r + 8), at = strings + dv.getUint16(r + 10);
      if (at + len > font.bytes.length) continue;
      var score = pid === 3 && lang === 0x409 ? 4 : pid === 3 ? 3 : pid === 0 ? 2 : pid === 1 && eid === 0 ? 1 : 0;
      if (!score || (rank[id] || 0) >= score) continue;
      var s = '';
      if (pid === 1) { for (var k = 0; k < len; k++) s += String.fromCharCode(font.bytes[at + k]); }
      else { for (var j = 0; j + 1 < len; j += 2) s += String.fromCharCode(dv.getUint16(at + j)); }
      rank[id] = score;
      byId[id] = s;
      if (NAME_IDS[id]) out[NAME_IDS[id]] = s;
    }
    return { names: out, byId: byId };
  }

  function readCmap(font) {
    var t = font.tables.cmap;
    if (!t) return new Map();
    var dv = font.dv, o = t.offset, n = dv.getUint16(o + 2), best = null, bestScore = 0;
    for (var i = 0; i < n; i++) {
      var r = o + 4 + i * 8, pid = dv.getUint16(r), eid = dv.getUint16(r + 2), sub = o + dv.getUint32(r + 4);
      if (sub + 2 > font.bytes.length) continue;
      var fmt = dv.getUint16(sub), score = 0;
      if (fmt === 12 && (pid === 3 && eid === 10 || pid === 0)) score = 5;
      else if (fmt === 4 && pid === 3 && eid === 1) score = 4;
      else if (fmt === 4 && pid === 0) score = 3;
      else if (fmt === 4 && pid === 3 && eid === 0) score = 2;
      else if (fmt === 12 || fmt === 4) score = 1;
      if (score > bestScore) { best = sub; bestScore = score; }
    }
    var map = new Map();
    if (best === null) return map;
    var f = dv.getUint16(best), limit = 200000;
    if (f === 4) {
      var segX2 = dv.getUint16(best + 6), ends = best + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
      for (var s = 0; s < segX2; s += 2) {
        var end = dv.getUint16(ends + s), start = dv.getUint16(starts + s), delta = dv.getInt16(deltas + s), ro = dv.getUint16(ranges + s);
        for (var c = start; c <= end && c !== 0xFFFF; c++) {
          var g;
          if (!ro) g = (c + delta) & 0xFFFF;
          else {
            var addr = ranges + s + ro + (c - start) * 2;
            if (addr + 2 > font.bytes.length) break;
            g = dv.getUint16(addr);
            if (g) g = (g + delta) & 0xFFFF;
          }
          if (g) map.set(c, g);
          if (map.size > limit) return map;
        }
      }
    } else if (f === 12) {
      var groups = dv.getUint32(best + 12);
      for (var q = 0; q < groups; q++) {
        var gp = best + 16 + q * 12, a = dv.getUint32(gp), b = dv.getUint32(gp + 4), sg = dv.getUint32(gp + 8);
        for (var cp = a; cp <= b && cp <= 0x10FFFF; cp++) {
          if (sg + cp - a) map.set(cp, sg + cp - a);
          if (map.size > limit) return map;
        }
      }
    }
    return map;
  }

  function readLayoutTags(font, tag) {
    var t = font.tables[tag], out = { scripts: [], features: [] };
    if (!t || t.length < 10) return out;
    var dv = font.dv, o = t.offset;
    try {
      var sl = o + dv.getUint16(o + 4), fl = o + dv.getUint16(o + 6), k;
      var sc = dv.getUint16(sl);
      for (k = 0; k < sc; k++) out.scripts.push(tagAt(dv, sl + 2 + k * 6));
      var fc = dv.getUint16(fl);
      for (k = 0; k < fc; k++) out.features.push(tagAt(dv, fl + 2 + k * 6));
    } catch (e) { /* truncated table: keep what we have */ }
    return out;
  }

  function readFvar(font, names) {
    var t = font.tables.fvar;
    if (!t) return null;
    var dv = font.dv, o = t.offset, axesAt = o + dv.getUint16(o + 4), axisCount = dv.getUint16(o + 8), axisSize = dv.getUint16(o + 10);
    var instCount = dv.getUint16(o + 12), instSize = dv.getUint16(o + 14), axes = [], instances = [];
    for (var i = 0; i < axisCount; i++) {
      var a = axesAt + i * axisSize;
      axes.push({ tag: tagAt(dv, a), min: dv.getInt32(a + 4) / 65536, def: dv.getInt32(a + 8) / 65536, max: dv.getInt32(a + 12) / 65536,
        hidden: !!(dv.getUint16(a + 16) & 1), name: names[dv.getUint16(a + 18)] || '' });
    }
    var instAt = axesAt + axisCount * axisSize;
    for (var j = 0; j < instCount && instAt + (j + 1) * instSize <= o + t.length; j++) {
      var p = instAt + j * instSize, coords = {};
      axes.forEach(function (ax, k) { coords[ax.tag] = dv.getInt32(p + 4 + k * 4) / 65536; });
      instances.push({ name: names[dv.getUint16(p)] || 'Instance ' + (j + 1), coords: coords });
    }
    return { axes: axes, instances: instances };
  }

  function longDate(dv, o) {
    var secs = dv.getUint32(o) * 4294967296 + dv.getUint32(o + 4);
    if (!secs) return '';
    var d = new Date((secs - 2082844800) * 1000);
    return isNaN(d) || d.getFullYear() < 1985 || d.getFullYear() > 2100 ? '' : d.toISOString().slice(0, 10);
  }

  function describe(font) {
    var dv = font.dv, T = font.tables, nm = readNames(font), info = { names: nm.names };
    if (T.head) {
      var h = T.head.offset;
      info.revision = (dv.getInt32(h + 4) / 65536).toFixed(3);
      info.upm = dv.getUint16(h + 18);
      info.created = longDate(dv, h + 20);
      info.modified = longDate(dv, h + 28);
      info.macStyle = dv.getUint16(h + 44);
    }
    if (T.maxp) info.glyphs = dv.getUint16(T.maxp.offset + 4);
    if (T['OS/2'] && T['OS/2'].length >= 64) {
      var s = T['OS/2'].offset;
      info.weight = dv.getUint16(s + 4);
      info.width = dv.getUint16(s + 6);
      info.fsType = dv.getUint16(s + 8);
      info.vendor = tagAt(dv, s + 58).trim();
      info.fsSelection = dv.getUint16(s + 62);
    }
    if (T.post && T.post.length >= 16) {
      info.italicAngle = dv.getInt32(T.post.offset + 4) / 65536;
      info.mono = dv.getUint32(T.post.offset + 12) !== 0;
    }
    info.outlines = T.glyf ? 'TrueType (quadratic)' : T['CFF2'] ? 'CFF2 (cubic)' : T['CFF '] ? 'PostScript CFF (cubic)' : T.sbix || T.CBDT ? 'Bitmap' : 'Unknown';
    info.colour = ['COLR', 'SVG ', 'sbix', 'CBDT'].filter(function (t) { return T[t]; }).map(function (t) { return t.trim(); });
    info.gsub = readLayoutTags(font, 'GSUB');
    info.gpos = readLayoutTags(font, 'GPOS');
    info.fvar = readFvar(font, nm.byId);
    info.cmap = readCmap(font);
    info.tables = Object.keys(T).sort();
    info.italic = !!(info.fsSelection & 1) || !!(info.macStyle & 2) || (info.italicAngle || 0) < 0;
    return info;
  }

  /* ---------- labels ---------- */

  var SCRIPTS = { DFLT: 'Default', latn: 'Latin', cyrl: 'Cyrillic', grek: 'Greek', arab: 'Arabic', hebr: 'Hebrew', deva: 'Devanagari',
    dev2: 'Devanagari', beng: 'Bengali', bng2: 'Bengali', taml: 'Tamil', tml2: 'Tamil', thai: 'Thai', hani: 'CJK ideographs', kana: 'Kana',
    hang: 'Hangul', armn: 'Armenian', geor: 'Georgian', ethi: 'Ethiopic', khmr: 'Khmer', lao: 'Lao', mymr: 'Myanmar', sinh: 'Sinhala',
    gujr: 'Gujarati', gjr2: 'Gujarati', guru: 'Gurmukhi', gur2: 'Gurmukhi', knda: 'Kannada', knd2: 'Kannada', mlym: 'Malayalam', mlm2: 'Malayalam',
    telu: 'Telugu', tel2: 'Telugu', tibt: 'Tibetan', math: 'Maths', brai: 'Braille', copt: 'Coptic', runr: 'Runic', ogam: 'Ogham', nko: 'N’Ko' };
  var FEATURES = { liga: 'Standard ligatures', dlig: 'Discretionary ligatures', hlig: 'Historical ligatures', calt: 'Contextual alternates',
    kern: 'Kerning', smcp: 'Small caps', c2sc: 'Capitals to small caps', pcap: 'Petite caps', onum: 'Old-style figures', lnum: 'Lining figures',
    tnum: 'Tabular figures', pnum: 'Proportional figures', zero: 'Slashed zero', frac: 'Fractions', afrc: 'Alternative fractions',
    sups: 'Superscript', subs: 'Subscript', sinf: 'Scientific inferiors', ordn: 'Ordinals', swsh: 'Swashes', salt: 'Stylistic alternates',
    case: 'Case-sensitive forms', cpsp: 'Capital spacing', titl: 'Titling', ss01: 'Stylistic set 1', ss02: 'Stylistic set 2', ss03: 'Stylistic set 3',
    ss04: 'Stylistic set 4', ss05: 'Stylistic set 5', ss06: 'Stylistic set 6', ss07: 'Stylistic set 7', ss08: 'Stylistic set 8',
    ss09: 'Stylistic set 9', ss10: 'Stylistic set 10', cv01: 'Character variant 1', cv02: 'Character variant 2', aalt: 'Access all alternates',
    locl: 'Localised forms', ccmp: 'Glyph composition', mark: 'Mark positioning', mkmk: 'Mark-to-mark', rlig: 'Required ligatures',
    init: 'Initial forms', medi: 'Medial forms', fina: 'Final forms', isol: 'Isolated forms', cpct: 'Centred CJK punctuation',
    vert: 'Vertical forms', ornm: 'Ornaments', hist: 'Historical forms', nalt: 'Alternate annotation forms', dnom: 'Denominators', numr: 'Numerators' };
  /* Features the shaper applies anyway, so a toggle would only confuse. */
  var ALWAYS_ON = new Set(['ccmp', 'locl', 'mark', 'mkmk', 'rlig', 'init', 'medi', 'fina', 'isol', 'rvrn', 'abvm', 'blwm', 'abvs', 'blws',
    'akhn', 'blwf', 'half', 'pres', 'psts', 'nukt', 'rphf', 'pref', 'vatu', 'cjct', 'dist', 'curs', 'aalt', 'numr', 'dnom', 'vert', 'vrt2', 'rtlm', 'ljmo', 'vjmo', 'tjmo']);
  var DEFAULT_ON = new Set(['liga', 'calt', 'kern', 'clig']);
  var AXES = { wght: 'Weight', wdth: 'Width', slnt: 'Slant', ital: 'Italic', opsz: 'Optical size', GRAD: 'Grade' };
  var WEIGHTS = { 100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semi Bold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black' };

  var BLOCKS = [
    [0x20, 0x7E, 'Basic Latin'], [0xA0, 0xFF, 'Latin-1 Supplement'], [0x100, 0x17F, 'Latin Extended-A'], [0x180, 0x24F, 'Latin Extended-B'],
    [0x250, 0x2AF, 'IPA Extensions'], [0x2B0, 0x2FF, 'Spacing Modifiers'], [0x300, 0x36F, 'Combining Diacritics'], [0x370, 0x3FF, 'Greek and Coptic'],
    [0x400, 0x4FF, 'Cyrillic'], [0x500, 0x52F, 'Cyrillic Supplement'], [0x530, 0x58F, 'Armenian'], [0x590, 0x5FF, 'Hebrew'], [0x600, 0x6FF, 'Arabic'],
    [0x900, 0x97F, 'Devanagari'], [0x980, 0x9FF, 'Bengali'], [0xB80, 0xBFF, 'Tamil'], [0xE00, 0xE7F, 'Thai'], [0x10A0, 0x10FF, 'Georgian'],
    [0x1E00, 0x1EFF, 'Latin Extended Additional'], [0x1F00, 0x1FFF, 'Greek Extended'], [0x2000, 0x206F, 'General Punctuation'],
    [0x2070, 0x209F, 'Super- and Subscripts'], [0x20A0, 0x20CF, 'Currency Symbols'], [0x2100, 0x214F, 'Letterlike Symbols'],
    [0x2150, 0x218F, 'Number Forms'], [0x2190, 0x21FF, 'Arrows'], [0x2200, 0x22FF, 'Mathematical Operators'], [0x2300, 0x23FF, 'Miscellaneous Technical'],
    [0x2460, 0x24FF, 'Enclosed Alphanumerics'], [0x2500, 0x257F, 'Box Drawing'], [0x2580, 0x259F, 'Block Elements'], [0x25A0, 0x25FF, 'Geometric Shapes'],
    [0x2600, 0x26FF, 'Miscellaneous Symbols'], [0x2700, 0x27BF, 'Dingbats'], [0x2800, 0x28FF, 'Braille Patterns'], [0x2C60, 0x2C7F, 'Latin Extended-C'],
    [0x3040, 0x309F, 'Hiragana'], [0x30A0, 0x30FF, 'Katakana'], [0x4E00, 0x9FFF, 'CJK Unified Ideographs'], [0xAC00, 0xD7A3, 'Hangul Syllables'],
    [0xA720, 0xA7FF, 'Latin Extended-D'], [0xE000, 0xF8FF, 'Private Use Area'], [0xFB00, 0xFB4F, 'Alphabetic Presentation Forms'],
    [0x1F300, 0x1F5FF, 'Misc Symbols and Pictographs'], [0x1F600, 0x1F64F, 'Emoticons'], [0x1F900, 0x1F9FF, 'Supplemental Symbols and Pictographs']
  ];
  /* What a WOFF2 file (whose tables we can't decompress) gets probed for. */
  var PROBE = [[0x20, 0x24F], [0x370, 0x3FF], [0x400, 0x4FF], [0x1E00, 0x1EFF], [0x2000, 0x2052], [0x2070, 0x209F], [0x20A0, 0x20C0],
    [0x2100, 0x218F], [0x2190, 0x21FF], [0x2200, 0x22FF], [0x2300, 0x23FF], [0x2500, 0x25FF], [0x2600, 0x27BF], [0xFB00, 0xFB06]];

  function blockOf(cp) {
    for (var i = 0; i < BLOCKS.length; i++) if (cp >= BLOCKS[i][0] && cp <= BLOCKS[i][1]) return i;
    return -1;
  }
  function hex(cp) { var h = cp.toString(16).toUpperCase(); return 'U+' + ('0000' + h).slice(-Math.max(4, h.length)); }
  function isCombining(cp) { return (cp >= 0x300 && cp <= 0x36F) || (cp >= 0x1AB0 && cp <= 0x1AFF) || (cp >= 0x20D0 && cp <= 0x20FF) || (cp >= 0xFE20 && cp <= 0xFE2F); }
  function show(cp) { return (isCombining(cp) ? '◌' : '') + String.fromCodePoint(cp); }
  function baseName(name) { return name.replace(/\.[^.]+$/, ''); }
  function cssString(s) { return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; }

  /* A glyph is in the font when its width no longer depends on which
     fallback family sits behind it. */
  function probeCoverage(family) {
    var ctx = document.createElement('canvas').getContext('2d'), codes = [];
    function w(font, ch) { ctx.font = font; return ctx.measureText(ch).width; }
    PROBE.forEach(function (r) {
      for (var cp = r[0]; cp <= r[1]; cp++) {
        var ch = String.fromCodePoint(cp);
        var a = w('40px "' + family + '", monospace', ch), b = w('40px "' + family + '", serif', ch);
        if (a !== b) continue;
        if (a === w('40px monospace', ch) && b === w('40px serif', ch)) continue;
        codes.push(cp);
      }
    });
    return codes;
  }

  var SAMPLES = [
    { value: 'pangram', label: 'Pangram', text: 'The quick brown fox jumps over the lazy dog' },
    { value: 'alpha', label: 'Alphabet', text: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz' },
    { value: 'nums', label: 'Numbers & symbols', text: '0123456789 £$€¥ &@#%*+=?! (1/2) “quotes” ‘single’ — –' },
    { value: 'para', label: 'Paragraph', text: 'Typography is the craft of endowing human language with a durable visual form. Sphinx of black quartz, judge my vow; fluffy waffles offer 1,234 ffi ligatures.' }
  ];

  var faceCounter = 0;

  Tools.register({
    id: 'font-viewer', category: 'file', name: 'Font Viewer & Converter',
    description: 'Preview TTF, OTF, WOFF and WOFF2 fonts, see their details, glyphs, OpenType features and variable axes, and convert between TTF/OTF and WOFF.',
    keywords: ['font', 'fonts', 'typeface', 'ttf', 'otf', 'woff', 'woff2', 'font viewer', 'font preview', 'glyphs', 'character map',
      'opentype', 'truetype', 'variable font', 'font converter', 'ttf to woff', 'woff to ttf', 'otf to woff', '@font-face', 'font metadata', 'webfont'],
    render: function (root) {
      root.classList.add('g-filec');
      var faces = [];
      U.onTeardown(root, function () { faces.forEach(function (f) { try { document.fonts.delete(f); } catch (e) { /* already gone */ } }); });

      var cur = null; /* { file, kind, bytes, sfnt, info, family, codes } */
      var status = U.progress();
      var zone = U.dropzone({ accept: '.ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2', label: 'Drop a font file here',
        hint: 'TTF, OTF, WOFF or WOFF2 · or click to choose', onFiles: function (f) { open(f[0]); } });

      var details = el('div', { dataset: { k: 'details' } });
      var previewBox = el('div');
      var glyphBox = el('div');
      var convertBox = el('div', { dataset: { k: 'convert' } });
      var cssBox = el('div');
      var sections = [
        U.panel('Details', details), U.panel('Preview', previewBox), U.panel('Glyphs', glyphBox),
        U.panel('Convert', convertBox), U.panel('CSS', cssBox)
      ];
      sections.forEach(function (s) { s.classList.add('fc-hidden'); });

      root.appendChild(U.panel('Font file', zone, status,
        U.note('The font is read and converted in this tab; nothing is uploaded.')));
      sections.forEach(function (s) { root.appendChild(s); });

      function registerFace(bytes, family) {
        var face = new FontFace(family, bytes.slice().buffer);
        return face.load().then(function (f) { document.fonts.add(f); faces.push(f); return f; });
      }

      function open(file) {
        status.set('Reading ' + file.name + '…');
        U.readAs(file).then(function (buf) {
          var bytes = new Uint8Array(buf), kind = kindOf(bytes);
          if (!kind) throw new Error('That doesn’t look like a font file (TTF, OTF, WOFF or WOFF2).');
          if (kind === 'ttc') throw new Error('This is a font collection (.ttc), which holds several fonts in one file. Open the individual TTF or OTF files instead.');
          var ready = kind === 'woff' ? libPako().then(function (pako) { return woffToSfnt(bytes, pako); }) : Promise.resolve(kind === 'woff2' ? null : bytes);
          return ready.then(function (sfnt) {
            var family = 'att-font-view-' + (++faceCounter);
            return registerFace(bytes, family).catch(function () {
              throw new Error('The browser refused to load this font, so it is probably damaged or not a real font file.');
            }).then(function () {
              var info = sfnt ? describe(readSfnt(sfnt)) : null;
              var codes = info ? Array.from(info.cmap.keys()).sort(function (a, b) { return a - b; }) : probeCoverage(family);
              cur = { file: file, kind: kind, bytes: bytes, sfnt: sfnt, info: info, family: family, codes: codes };
              paint();
              status.done('Loaded ' + file.name + ' (' + U.bytes(file.size) + ')');
            });
          });
        }).catch(function (err) { status.fail(err); });
      }

      function kv(rows) {
        return el('table', { class: 'fc-kv' }, el('tbody', null, rows.filter(function (r) { return r && r[1] !== undefined && r[1] !== ''; }).map(function (r) {
          return el('tr', null, el('th', { text: r[0] }), el('td', null, r[1]));
        })));
      }
      function link(url) { return /^https?:\/\//i.test(url) ? el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', text: url }) : url; }

      function embedding(fs) {
        if (fs === undefined) return '';
        if (fs & 0x0002) return 'Restricted: the maker says it must not be embedded or converted without permission';
        if (fs & 0x0008) return 'Editable embedding allowed';
        if (fs & 0x0004) return 'Preview & print embedding only';
        return 'Installable: no embedding restrictions';
      }

      function paint() {
        var i = cur.info, n = i ? i.names : {};
        var familyName = n.typoFamily || n.family || baseName(cur.file.name);
        var style = n.typoSubfamily || n.subfamily || '';
        cur.familyName = familyName;
        sections.forEach(function (s) { s.classList.remove('fc-hidden'); });

        /* Details */
        if (i) {
          var fvar = i.fvar;
          details.replaceChildren(kv([
            ['Family', familyName], ['Style', style], ['Full name', n.fullName], ['PostScript name', n.postscript],
            ['Version', n.version || i.revision], ['Designer', n.designer], ['Maker', n.manufacturer || (i.vendor && i.vendor !== 'NONE' ? i.vendor : '')],
            ['Designer website', n.designerUrl ? link(n.designerUrl) : ''], ['Maker website', n.vendorUrl ? link(n.vendorUrl) : ''],
            ['Licence', n.licence], ['Licence URL', n.licenceUrl ? link(n.licenceUrl) : ''], ['Copyright', n.copyright], ['Trademark', n.trademark],
            ['Description', n.description],
            ['Format', { ttf: 'TrueType / OpenType (sfnt)', otf: 'OpenType with PostScript outlines', woff: 'WOFF 1.0' }[cur.kind] + ' · ' + U.bytes(cur.bytes.length)],
            ['Outlines', i.outlines + (i.colour.length ? ' · colour (' + i.colour.join(', ') + ')' : '')],
            ['Glyphs', i.glyphs !== undefined ? i.glyphs.toLocaleString() : ''],
            ['Characters mapped', i.cmap.size.toLocaleString()],
            ['Units per em', i.upm],
            ['Weight', i.weight !== undefined ? i.weight + (WEIGHTS[i.weight] ? ' (' + WEIGHTS[i.weight] + ')' : '') : ''],
            ['Italic', i.italic ? 'Yes' + (i.italicAngle ? ' (' + i.italicAngle + '°)' : '') : 'No'],
            ['Monospaced', i.mono ? 'Yes' : 'No'],
            ['Variable axes', fvar ? fvar.axes.map(function (a) { return a.tag + ' ' + a.min + '–' + a.max; }).join(', ') + (fvar.instances.length ? ' · ' + fvar.instances.length + ' named instances' : '') : ''],
            ['Scripts', uniq(i.gsub.scripts.concat(i.gpos.scripts)).map(function (s) { return SCRIPTS[s] || s; }).filter(uniqFilter()).join(', ')],
            ['OpenType features', uniq(i.gsub.features.concat(i.gpos.features)).join(' ')],
            ['Embedding', embedding(i.fsType)],
            ['Created', i.created], ['Modified', i.modified],
            ['Tables', i.tables.join(' ')]
          ]));
          if (i.fsType & 0x0002) details.appendChild(U.note('This font’s embedding flag is set to “restricted”. Check its licence before converting it or using it on a website.', 'err'));
        } else {
          details.replaceChildren(kv([
            ['File', cur.file.name], ['Format', 'WOFF2 · ' + U.bytes(cur.bytes.length)],
            ['Characters found', cur.codes.length.toLocaleString() + ' in the common ranges checked']
          ]), U.note('WOFF2 compresses its tables with Brotli, which browsers don’t let web pages decompress, so the name, licence and feature tables can’t be read here. The preview works because the browser loads WOFF2 natively; the glyph list comes from testing which characters the font draws.'));
        }

        paintPreview();
        paintGlyphs();
        paintConvert();
        paintCss();
      }

      function uniq(a) { return a.filter(function (x, k) { return a.indexOf(x) === k; }); }
      function uniqFilter() { var seen = {}; return function (x) { return seen[x] ? false : (seen[x] = true); }; }

      /* ---------- preview ---------- */
      function paintPreview() {
        var i = cur.info, fam = '"' + cur.family + '"';
        var sampleText = (i && i.names.sampleText) || SAMPLES[0].text;
        var text = el('input', { type: 'text', class: 'fc-sample', value: sampleText, dataset: { k: 'sample' }, 'aria-label': 'Sample text' });
        var size = el('input', { type: 'range', min: 8, max: 200, value: 64, 'aria-label': 'Size' });
        var sizeOut = el('output', { text: '64px' });
        var big = el('div', { class: 'fc-big', dataset: { k: 'preview' } });
        var fall = el('div', { class: 'fc-fall' });
        var presets = U.chips(SAMPLES.map(function (s) { return { value: s.value, label: s.label }; }).concat(i && i.names.sampleText ? [{ value: 'own', label: 'Font’s own' }] : []),
          function (v) { text.value = v === 'own' ? i.names.sampleText : SAMPLES.filter(function (s) { return s.value === v; })[0].text; apply(); }, '__none__');

        var axisBox = el('div', { class: 'fc-inline' }), axisInputs = {};
        if (i && i.fvar) {
          i.fvar.axes.filter(function (a) { return !a.hidden; }).forEach(function (a) {
            var step = a.max - a.min > 20 ? 1 : 0.1;
            var r = el('input', { type: 'range', min: a.min, max: a.max, step: step, value: a.def, 'aria-label': a.name || a.tag });
            var o = el('output', { text: String(a.def) });
            r.addEventListener('input', function () { o.textContent = r.value; apply(); });
            axisInputs[a.tag] = { input: r, out: o };
            axisBox.appendChild(el('label', { class: 'fc-axis' }, el('span', { text: a.name || AXES[a.tag] || a.tag }), el('b', { text: a.tag }), r, o));
          });
          if (i.fvar.instances.length) {
            var inst = U.select({ options: [{ value: '', label: 'Named instance…' }].concat(i.fvar.instances.map(function (x, k) { return { value: String(k), label: x.name }; })) });
            inst.addEventListener('change', function () {
              var x = i.fvar.instances[+inst.value];
              if (!x) return;
              Object.keys(x.coords).forEach(function (t) { if (axisInputs[t]) { axisInputs[t].input.value = x.coords[t]; axisInputs[t].out.textContent = String(x.coords[t]); } });
              apply();
            });
            axisBox.appendChild(inst);
          }
        }

        var featBox = el('div', { class: 'fc-feat' }), featInputs = {};
        if (i) {
          uniq(i.gsub.features.concat(i.gpos.features)).filter(function (f) { return !ALWAYS_ON.has(f); }).sort().forEach(function (f) {
            var c = U.checkbox('', { checked: DEFAULT_ON.has(f) });
            c.querySelector('span').replaceChildren(FEATURES[f] || f, ' ', el('code', { text: f }));
            c.input.addEventListener('change', apply);
            featInputs[f] = c.input;
            featBox.appendChild(c);
          });
        }

        function apply() {
          var t = text.value || ' ';
          var vs = Object.keys(axisInputs).map(function (tag) { return '"' + tag + '" ' + axisInputs[tag].input.value; }).join(', ');
          var fs = Object.keys(featInputs).map(function (f) { return '"' + f + '" ' + (featInputs[f].checked ? 1 : 0); }).join(', ');
          [big, fall].forEach(function (n) {
            n.style.fontFamily = fam + ', var(--sans)';
            n.style.fontVariationSettings = vs || 'normal';
            n.style.fontFeatureSettings = fs || 'normal';
          });
          big.style.fontSize = size.value + 'px';
          sizeOut.textContent = size.value + 'px';
          big.textContent = t;
          fall.replaceChildren.apply(fall, [12, 16, 20, 24, 32, 48, 72].map(function (px) {
            return el('div', null, el('small', { text: px + 'px' }), el('span', { style: { fontSize: px + 'px' }, text: t }));
          }));
        }
        text.addEventListener('input', apply);
        size.addEventListener('input', apply);
        apply();

        previewBox.replaceChildren(text, presets, el('div', { class: 'fc-inline' }, el('span', { text: 'Size' }), size, sizeOut),
          Object.keys(axisInputs).length ? el('div', null, el('h4', { text: 'Variable axes', style: { margin: '10px 0 0' } }), axisBox) : null,
          Object.keys(featInputs).length ? el('div', null, el('h4', { text: 'OpenType features', style: { margin: '10px 0 6px' } }), featBox) : null,
          big, fall);
      }

      /* ---------- glyphs ---------- */
      function paintGlyphs() {
        var codes = cur.codes, fam = '"' + cur.family + '"', shown = 0, list = codes, PAGE = 480;
        var detail = el('div', { class: 'fc-detail fc-hidden' });
        var grid = el('div', { class: 'fc-grid', dataset: { k: 'glyphs' } });
        var more = U.button('Show more', function () { page(); }, 'ghost');
        var find = el('input', { type: 'search', placeholder: 'Find a character, or U+20AC', 'aria-label': 'Find a glyph', style: { maxWidth: '260px' } });
        var blockSel = U.select({ options: [{ value: '', label: 'All characters' }], 'aria-label': 'Unicode block', style: { maxWidth: '300px' } });
        var counts = {};
        codes.forEach(function (cp) { var b = blockOf(cp); counts[b] = (counts[b] || 0) + 1; });
        Object.keys(counts).map(Number).sort(function (a, b) { return a - b; }).forEach(function (b) {
          blockSel.appendChild(el('option', { value: String(b), text: (b < 0 ? 'Other' : BLOCKS[b][2]) + ' (' + counts[b] + ')' }));
        });

        function page() {
          var frag = document.createDocumentFragment();
          list.slice(shown, shown + PAGE).forEach(function (cp) {
            frag.appendChild(el('button', { type: 'button', class: 'fc-cell', title: hex(cp), onclick: function (e) { pick(cp, e.currentTarget); } },
              el('span', { style: { fontFamily: fam + ', var(--sans)' }, text: show(cp) }), el('small', { text: hex(cp).slice(2) })));
          });
          grid.appendChild(frag);
          shown = Math.min(list.length, shown + PAGE);
          more.classList.toggle('fc-hidden', shown >= list.length);
          more.textContent = 'Show more (' + (list.length - shown).toLocaleString() + ' left)';
        }
        function filter() {
          var q = find.value.trim(), b = blockSel.value;
          list = codes;
          if (b !== '') list = list.filter(function (cp) { return blockOf(cp) === +b; });
          if (q) {
            var m = /^(?:u\+|0x)?([0-9a-f]{2,6})$/i.exec(q);
            var wanted = m && q.length > 1 ? [parseInt(m[1], 16)] : Array.from(q).map(function (c) { return c.codePointAt(0); });
            list = list.filter(function (cp) { return wanted.indexOf(cp) > -1; });
          }
          grid.replaceChildren();
          shown = 0;
          page();
          if (!list.length) grid.appendChild(U.note(q ? 'Not in this font.' : 'Nothing here.'));
        }
        function pick(cp, node) {
          Array.prototype.forEach.call(grid.querySelectorAll('.on'), function (n) { n.classList.remove('on'); });
          node.classList.add('on');
          var gid = cur.info ? cur.info.cmap.get(cp) : null, b = blockOf(cp);
          detail.classList.remove('fc-hidden');
          detail.replaceChildren(el('div', { class: 'g', style: { fontFamily: fam + ', var(--sans)' }, text: show(cp) }),
            el('div', null, kv([['Code point', hex(cp)], ['Character', String.fromCodePoint(cp)], ['Glyph index', gid === null || gid === undefined ? '' : String(gid)],
              ['Block', b < 0 ? 'Other' : BLOCKS[b][2]], ['HTML', '&#x' + cp.toString(16).toUpperCase() + ';'], ['CSS', '\\' + cp.toString(16).toUpperCase()]]),
            U.btnrow(U.copyBtn('Copy character', String.fromCodePoint(cp)), U.copyBtn('Copy code', hex(cp)))));
        }
        find.addEventListener('input', U.debounce(filter, 150));
        blockSel.addEventListener('change', filter);
        filter();

        var coverage = el('div', { class: 'fc-blocks' });
        Object.keys(counts).map(Number).filter(function (b) { return b >= 0; }).sort(function (a, b) { return a - b; }).forEach(function (b) {
          coverage.appendChild(el('div', null, el('span', { text: BLOCKS[b][2] }), el('b', { text: counts[b].toLocaleString() })));
        });

        glyphBox.replaceChildren(
          el('div', { class: 'fc-inline' }, find, blockSel, el('span', { class: 'hint', text: codes.length.toLocaleString() + ' characters' })),
          detail, grid, U.btnrow(more),
          el('h4', { text: 'Characters per Unicode block', style: { margin: '14px 0 6px' } }), coverage);
      }

      /* ---------- convert ---------- */
      function paintConvert() {
        var result = el('div', { dataset: { k: 'convert-status' } });
        var base = baseName(cur.file.name), kind = cur.kind;

        function finish(out, name, mime) {
          var check = 'att-font-check-' + (++faceCounter);
          return registerFace(out, check).then(function () {
            U.saveBlob(name, new Blob([out], { type: mime }));
            var change = out.length / cur.bytes.length - 1;
            result.replaceChildren(U.note('Saved ' + name + ' · ' + U.bytes(out.length) + ' (' + (change <= 0 ? Math.round(-change * 100) + '% smaller' : Math.round(change * 100) + '% larger') +
              '). Checked: the converted font loads in this browser.', 'ok'));
          }, function () {
            throw new Error('The converted font failed to load back into the browser, so it was not saved.');
          });
        }
        function run(fn) {
          return function () {
            result.replaceChildren(U.note('Converting…'));
            libPako().then(fn).catch(function (err) { result.replaceChildren(U.note(err.message || String(err), 'err')); });
          };
        }

        var buttons = [], notes = [];
        if (kind === 'ttf' || kind === 'otf') {
          buttons.push(U.button('Convert to WOFF', run(function (pako) { return finish(sfntToWoff(cur.bytes, pako), base + '.woff', 'font/woff'); }), 'primary'));
          notes.push('WOFF wraps the same font in zlib compression, usually 30–50% smaller, and works in every browser in use today.');
        }
        if (kind === 'woff') {
          var ext = new DataView(cur.bytes.buffer).getUint32(4) === 0x4F54544F ? 'otf' : 'ttf';
          buttons.push(U.button('Convert to ' + ext.toUpperCase(), function () {
            result.replaceChildren(U.note('Converting…'));
            finish(cur.sfnt, base + '.' + ext, 'font/' + ext).catch(function (err) { result.replaceChildren(U.note(err.message, 'err')); });
          }, 'primary'));
          buttons.push(U.button('Recompress WOFF', run(function (pako) { return finish(sfntToWoff(cur.sfnt, pako), base + '.woff', 'font/woff'); }), 'ghost'));
          notes.push('Converting WOFF back to ' + ext.toUpperCase() + ' gives you a file you can install on your computer.');
        }
        notes.push(kind === 'woff2'
          ? 'WOFF2 files can be previewed but not converted here: unpacking and making WOFF2 needs the Brotli compressor, which browsers don’t make available to web pages.'
          : 'WOFF2 (about 30% smaller again than WOFF) needs the Brotli compressor, which browsers don’t make available to web pages, so it isn’t offered here.');
        notes.push('To make WOFF2 on your computer: pip install fonttools brotli, then fonttools ttLib.woff2 compress yourfont.ttf');
        if (cur.info && cur.info.fsType & 0x0002) notes.unshift('This font is marked “restricted”: make sure its licence lets you convert it.');

        convertBox.replaceChildren(buttons.length ? U.btnrow.apply(null, buttons) : null, result,
          notes.map(function (t) { return U.note(t); }));
      }

      /* ---------- CSS ---------- */
      function paintCss() {
        var i = cur.info, base = baseName(cur.file.name), fam = cur.familyName;
        var weight = i && i.weight ? String(i.weight) : '400', stretch = null, style = i && i.italic ? 'italic' : 'normal';
        if (i && i.fvar) i.fvar.axes.forEach(function (a) {
          if (a.tag === 'wght') weight = a.min + ' ' + a.max;
          if (a.tag === 'wdth') stretch = a.min + '% ' + a.max + '%';
          if (a.tag === 'slnt' && style === 'normal') style = 'oblique ' + Math.min(-a.max, -a.min) + 'deg ' + Math.max(-a.max, -a.min) + 'deg';
        });
        var src = cur.kind === 'woff2' ? "url('" + base + ".woff2') format('woff2')"
          : "url('" + base + ".woff2') format('woff2'),\n       url('" + base + ".woff') format('woff')";
        var css = '@font-face {\n  font-family: ' + cssString(fam) + ';\n  src: ' + src + ';\n  font-weight: ' + weight + ';\n  font-style: ' + style + ';\n' +
          (stretch ? '  font-stretch: ' + stretch + ';\n' : '') + '  font-display: swap;\n}\n\nbody {\n  font-family: ' + cssString(fam) + ', ' + (i && i.mono ? 'monospace' : 'sans-serif') + ';\n}';
        var mimes = { ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2' };
        var formats = { ttf: 'truetype', otf: 'opentype', woff: 'woff', woff2: 'woff2' };
        cssBox.replaceChildren(el('pre', { class: 'out fc-css', text: css, dataset: { k: 'css' } }),
          U.btnrow(U.copyBtn('Copy CSS', css),
            U.button('Copy as embedded (base64) CSS', function () {
              U.readAs(new Blob([cur.bytes], { type: mimes[cur.kind] }), 'dataURL').then(function (url) {
                U.copy(css.replace(/src: [^;]+;/, "src: url('" + url + "') format('" + formats[cur.kind] + "');"));
              });
            }, 'ghost')),
          U.note(cur.bytes.length > 150 * 1024 ? 'This font is ' + U.bytes(cur.bytes.length) + '; embedding it as base64 makes it a third larger again, so a separate file is usually better.' : 'Upload the font files next to your stylesheet, or embed a small font as base64.'));
      }
    }
  });

  window.FontKit = { kindOf: kindOf, readSfnt: readSfnt, describe: describe, sfntToWoff: sfntToWoff, woffToSfnt: woffToSfnt, buildSfnt: buildSfnt };
})();
