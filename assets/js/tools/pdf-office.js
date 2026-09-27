/* pdf-office tools: Word to PDF and Excel to PDF, entirely in the tab.

   Word: the .docx is unzipped with JSZip and word/document.xml, with its
   styles, numbering, relationships, theme, headers, footers, notes and
   pictures, is read into a small block model: paragraphs of styled runs,
   list markers, tables and pictures. Blocks are broken into lines, the
   lines paginated onto pages of the size each section asks for, and the
   pages drawn with pdf-lib in the standard PDF typefaces (Helvetica, Times,
   Courier), picked to match each font. Characters those typefaces lack are
   drawn in DejaVu Sans, embedded as a subset by a small TrueType writer
   below (pdf-lib needs fontkit for custom fonts, which isn't vendored).

   Excel: SheetJS reads the workbook (or CSV); each chosen sheet is drawn as
   a table of its displayed values over as many pages as it needs, with the
   same text layout code. Both tools preview the finished PDF with pdf.js. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;
  /* PdfKit comes from pdf.js; looked up when used, not when this file loads. */
  function PK() { return window.PdfKit; }
  var V = 'assets/vendor/';

  if (!document.getElementById('g-pdf-office-style')) {
    document.head.appendChild(el('style', { id: 'g-pdf-office-style', text: [
      '.g-pdfo .po-file { display:flex; flex-wrap:wrap; gap:8px 14px; align-items:center; font-weight:600; }',
      '.g-pdfo .po-file .muted { font-weight:400; color:var(--fg-muted); }',
      '.g-pdfo .po-opts { display:grid; grid-template-columns:repeat(auto-fill, minmax(230px, 1fr)); gap:10px 12px; align-items:end; }',
      '.g-pdfo .po-checks { display:flex; flex-wrap:wrap; gap:6px 18px; margin-top:12px; }',
      '.g-pdfo .po-sheets { display:flex; flex-wrap:wrap; gap:6px 18px; }',
      '.g-pdfo .po-ok { color:var(--ok); font-weight:600; }',
      '.g-pdfo .po-pages { display:grid; grid-template-columns:repeat(auto-fill, minmax(170px, 1fr)); gap:18px 16px; align-items:start; }',
      '.g-pdfo .po-page { margin:0; display:flex; flex-direction:column; gap:6px; }',
      '.g-pdfo .po-page canvas { width:100%; height:auto; display:block; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,.25); }',
      '.g-pdfo .po-page figcaption { font-size:12px; color:var(--fg-muted); text-align:center; }',
      '.g-pdfo .po-notes { margin:0; padding-left:20px; font-size:14px; color:var(--fg-muted); }',
      '.g-pdfo .po-notes li { margin:2px 0; }',
      '.g-pdfo .po-about p { font-size:14px; color:var(--fg-muted); margin:0 0 8px; }',
      '.g-pdfo .po-about p:last-child { margin-bottom:0; }',
      '.g-pdfo .po-about b { color:var(--fg); }'
    ].join('\n') }));
  }

  /* --- small helpers ------------------------------------------------------- */

  var PAPER = { A4: [595.28, 841.89], Letter: [612, 792] };
  var PREVIEW_MAX = 12;
  var BLACK = [0, 0, 0];

  function regionPaper() { return (window.Region && Region.get && Region.get().paper === 'letter') ? 'Letter' : 'A4'; }
  function plural(n, w, many) { return n + ' ' + (n === 1 ? w : many || w + 's'); }
  function kb(n) { return n >= 1048576 ? (n / 1048576).toFixed(2) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  function baseName(name) { return String(name || 'document').replace(/\.[^.\/\\]+$/, '') || 'document'; }
  function ext(name) { var m = /\.([^.]+)$/.exec(String(name || '').toLowerCase()); return m ? m[1] : ''; }
  function hexColour(v) {
    if (!v || !/^[0-9a-f]{6}$/i.test(v)) return null;
    return [parseInt(v.slice(0, 2), 16) / 255, parseInt(v.slice(2, 4), 16) / 255, parseInt(v.slice(4, 6), 16) / 255];
  }
  function sum(list, fn) { var t = 0; for (var i = 0; i < list.length; i++) t += fn ? fn(list[i]) : list[i]; return t; }
  function append(a, b) { for (var i = 0; i < b.length; i++) a.push(b[i]); return a; }

  function libPdf() { return PK() ? PK().libPdf() : U.script(V + 'pdf-lib/pdf-lib.min.js').then(function () { return window.PDFLib; }); }
  function libZip() { return U.script(V + 'jszip/jszip.min.js').then(function () { return window.JSZip; }); }
  function libXlsx() { return U.script(V + 'xlsx/xlsx.full.min.js').then(function () { return window.XLSX; }); }

  /* ========================================================================
     Fonts
     ======================================================================== */

  /* The standard fonts use WinAnsiEncoding: ASCII, Latin-1 and these. */
  var WIN_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
  var NON_WIN = /[^\x20-\x7E\xA0-\xFF€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ\t\n\r]/;
  function isWinAnsi(cp) {
    return (cp >= 32 && cp < 127) || (cp >= 160 && cp <= 255) || (cp > 255 && cp < 0x2200 && WIN_EXTRA.indexOf(String.fromCharCode(cp)) >= 0);
  }

  var STD = {
    sans: ['Helvetica', 'HelveticaBold', 'HelveticaOblique', 'HelveticaBoldOblique'],
    serif: ['TimesRoman', 'TimesRomanBold', 'TimesRomanItalic', 'TimesRomanBoldItalic'],
    mono: ['Courier', 'CourierBold', 'CourierOblique', 'CourierBoldOblique']
  };

  /* --- a minimal TrueType reader and subsetter ------------------------------ */

  function parseTTF(bytes) {
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var n = dv.getUint16(4), tab = {}, i;
    for (i = 0; i < n; i++) {
      var p = 12 + 16 * i;
      tab[String.fromCharCode(bytes[p], bytes[p + 1], bytes[p + 2], bytes[p + 3])] = { off: dv.getUint32(p + 8), len: dv.getUint32(p + 12) };
    }
    ['head', 'hhea', 'hmtx', 'maxp', 'loca', 'glyf', 'cmap'].forEach(function (t) { if (!tab[t]) throw new Error('Font is missing its ' + t + ' table'); });
    var head = tab.head.off, hhea = tab.hhea.off, hmtx = tab.hmtx.off, loca = tab.loca.off;
    var longLoca = dv.getInt16(head + 50) === 1, nHM = dv.getUint16(hhea + 34);
    var t = {
      bytes: bytes, dv: dv, tables: tab, upm: dv.getUint16(head + 18),
      bbox: [dv.getInt16(head + 36), dv.getInt16(head + 38), dv.getInt16(head + 40), dv.getInt16(head + 42)],
      ascent: dv.getInt16(hhea + 4), descent: dv.getInt16(hhea + 6),
      numGlyphs: dv.getUint16(tab.maxp.off + 4), glyf: tab.glyf.off
    };
    t.loca = longLoca ? function (g) { return dv.getUint32(loca + 4 * g); } : function (g) { return dv.getUint16(loca + 2 * g) * 2; };
    t.advance = function (g) { return dv.getUint16(hmtx + 4 * Math.min(g, nHM - 1)); };

    var cm = tab.cmap.off, nsub = dv.getUint16(cm + 2), f4 = 0, f12 = 0;
    for (i = 0; i < nsub; i++) {
      var pid = dv.getUint16(cm + 4 + 8 * i), eid = dv.getUint16(cm + 6 + 8 * i), so = cm + dv.getUint32(cm + 8 + 8 * i), fmt = dv.getUint16(so);
      if (fmt === 12 && (pid === 3 && eid === 10 || pid === 0)) f12 = so;
      else if (fmt === 4 && (pid === 3 && eid === 1 || pid === 0) && !f4) f4 = so;
    }
    function lookup(cp) {
      var lo, hi, mid;
      if (f12) {
        lo = 0; hi = dv.getUint32(f12 + 12) - 1;
        while (lo <= hi) {
          mid = (lo + hi) >> 1;
          var g0 = f12 + 16 + 12 * mid, s = dv.getUint32(g0), e = dv.getUint32(g0 + 4);
          if (cp < s) hi = mid - 1; else if (cp > e) lo = mid + 1; else return dv.getUint32(g0 + 8) + cp - s;
        }
        return 0;
      }
      if (!f4 || cp > 0xFFFF) return 0;
      var segX2 = dv.getUint16(f4 + 6), ends = f4 + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ros = deltas + segX2;
      lo = 0; hi = segX2 / 2 - 1;
      while (lo < hi) { mid = (lo + hi) >> 1; if (dv.getUint16(ends + 2 * mid) < cp) lo = mid + 1; else hi = mid; }
      if (dv.getUint16(ends + 2 * lo) < cp) return 0;
      var start = dv.getUint16(starts + 2 * lo);
      if (start > cp) return 0;
      var d = dv.getUint16(deltas + 2 * lo), ro = dv.getUint16(ros + 2 * lo);
      if (!ro) return (cp + d) & 0xFFFF;
      var gi = dv.getUint16(ros + 2 * lo + ro + 2 * (cp - start));
      return gi ? (gi + d) & 0xFFFF : 0;
    }
    var cache = new Map();
    t.glyph = function (cp) { var g = cache.get(cp); if (g === undefined) { g = lookup(cp); if (g >= t.numGlyphs) g = 0; cache.set(cp, g); } return g; };
    return t;
  }

  /* Keep only the glyphs used (and the parts of composite glyphs), leaving
     every other glyph empty so glyph ids stay the same. */
  function subsetTTF(t, gids) {
    var b = t.bytes, dv = t.dv, keep = new Set(), queue = [0].concat(gids), g;
    while (queue.length) {
      g = queue.pop();
      if (keep.has(g) || g >= t.numGlyphs) continue;
      keep.add(g);
      var s0 = t.loca(g), s1 = t.loca(g + 1);
      if (s1 > s0 && dv.getInt16(t.glyf + s0) < 0) {
        var p = t.glyf + s0 + 10, flags;
        do {
          flags = dv.getUint16(p);
          queue.push(dv.getUint16(p + 2));
          p += 4 + ((flags & 1) ? 4 : 2) + ((flags & 8) ? 2 : (flags & 0x40) ? 4 : (flags & 0x80) ? 8 : 0);
        } while (flags & 0x20);
      }
    }
    var n = t.numGlyphs, parts = [], pos = 0;
    var loca = new Uint8Array((n + 1) * 4), ldv = new DataView(loca.buffer);
    for (g = 0; g < n; g++) {
      ldv.setUint32(g * 4, pos);
      if (!keep.has(g)) continue;
      var a = t.loca(g), z = t.loca(g + 1);
      if (z > a) {
        var chunk = new Uint8Array((z - a + 3) & ~3);
        chunk.set(b.subarray(t.glyf + a, t.glyf + z));
        parts.push(chunk);
        pos += chunk.length;
      }
    }
    ldv.setUint32(n * 4, pos);
    var glyf = new Uint8Array(pos), o = 0;
    parts.forEach(function (c) { glyf.set(c, o); o += c.length; });

    function copy(tag) { var e = t.tables[tag]; return e ? b.slice(e.off, e.off + e.len) : null; }
    var head = copy('head'), hdv = new DataView(head.buffer);
    hdv.setUint32(8, 0);
    hdv.setInt16(50, 1);
    var tables = { head: head, hhea: copy('hhea'), maxp: copy('maxp'), hmtx: copy('hmtx'), loca: loca, glyf: glyf, cmap: copy('cmap') };
    ['cvt ', 'fpgm', 'prep', 'OS/2'].forEach(function (tag) { var c = copy(tag); if (c) tables[tag] = c; });
    var post = copy('post');
    if (post && post.length >= 32) { post = post.slice(0, 32); new DataView(post.buffer).setUint32(0, 0x00030000); tables.post = post; }

    var tags = Object.keys(tables).sort(), nt = tags.length;
    var total = 12 + 16 * nt + sum(tags, function (k) { return (tables[k].length + 3) & ~3; });
    var out = new Uint8Array(total), odv = new DataView(out.buffer);
    var es = Math.floor(Math.log2(nt)), sr = Math.pow(2, es) * 16;
    odv.setUint32(0, 0x00010000); odv.setUint16(4, nt); odv.setUint16(6, sr); odv.setUint16(8, es); odv.setUint16(10, nt * 16 - sr);
    var off = 12 + 16 * nt;
    tags.forEach(function (tag, i) {
      var data = tables[tag], rec = 12 + 16 * i, padded = (data.length + 3) & ~3, cs = 0;
      out.set(data, off);
      for (var k = 0; k < padded; k += 4) cs = (cs + odv.getUint32(off + k)) >>> 0;
      for (var j = 0; j < 4; j++) out[rec + j] = tag.charCodeAt(j);
      odv.setUint32(rec + 4, cs); odv.setUint32(rec + 8, off); odv.setUint32(rec + 12, data.length);
      off += padded;
    });
    return out;
  }

  function hex4(n) { return ('000' + n.toString(16)).slice(-4).toUpperCase(); }

  function toUnicodeCMap(used) {
    var ids = Object.keys(used).map(Number).sort(function (a, b) { return a - b; }), body = '';
    for (var i = 0; i < ids.length; i += 100) {
      var chunk = ids.slice(i, i + 100);
      body += chunk.length + ' beginbfchar\n' + chunk.map(function (g) {
        var s = used[g], h = '';
        for (var k = 0; k < s.length; k++) h += hex4(s.charCodeAt(k));
        return '<' + hex4(g) + '> <' + h + '>';
      }).join('\n') + '\nendbfchar\n';
    }
    return '/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n' +
      '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n' +
      '/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n' +
      body + 'endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend';
  }

  var ttfCache = {};
  function loadTTF(name) {
    if (!ttfCache[name]) {
      ttfCache[name] = fetch(V + 'fonts/' + name).then(function (r) {
        if (!r.ok) throw new Error('Could not load ' + name);
        return r.arrayBuffer();
      }).then(function (buf) { return parseTTF(new Uint8Array(buf)); })
        .catch(function (e) { delete ttfCache[name]; throw e; });
    }
    return ttfCache[name];
  }

  /* A TrueType font drawn as a Type0/CIDFontType2 font with Identity-H
     encoding: text is written as 2-byte glyph ids. */
  function UniFont(book, ttf, name) {
    this.book = book; this.ttf = ttf; this.name = name;
    this.used = {}; this.ref = null; this.keys = new Map();
    this.qgid = ttf.glyph(63);
  }
  UniFont.prototype.has = function (cp) { return this.ttf.glyph(cp) !== 0; };
  UniFont.prototype.width = function (text, size) {
    var t = this.ttf, w = 0;
    for (var ch of text) w += t.advance(t.glyph(ch.codePointAt(0)) || this.qgid);
    return w * size / t.upm;
  };
  UniFont.prototype.draw = function (page, text, x, y, size, colour, skew) {
    var L = this.book.L, hex = '';
    for (var ch of text) {
      var g = this.ttf.glyph(ch.codePointAt(0)) || this.qgid;
      if (!this.used[g]) this.used[g] = g === this.qgid && ch !== '?' ? '?' : ch;
      hex += hex4(g);
    }
    if (!this.ref) this.ref = this.book.doc.context.nextRef();
    var key = this.keys.get(page);
    if (!key) { key = page.node.newFontDictionary(this.name.replace(/[^A-Za-z]/g, ''), this.ref); this.keys.set(page, key); }
    page.pushOperators(L.pushGraphicsState(), L.setFillingRgbColor(colour[0], colour[1], colour[2]), L.beginText(),
      L.setFontAndSize(key, size), L.setTextMatrix(1, 0, skew || 0, 1, x, y),
      L.showText(L.PDFHexString.of(hex)), L.endText(), L.popGraphicsState());
  };
  UniFont.prototype.finish = function () {
    if (!this.ref) return;
    var L = this.book.L, ctx = this.book.doc.context, t = this.ttf, s = 1000 / t.upm;
    var used = Object.keys(this.used).map(Number).sort(function (a, b) { return a - b; });
    var sub = subsetTTF(t, used);
    var base = 'ATTSUB+' + this.name;
    var file = ctx.register(ctx.flateStream(sub, { Length1: sub.length }));
    var desc = ctx.register(ctx.obj({
      Type: 'FontDescriptor', FontName: base, Flags: 4,
      FontBBox: t.bbox.map(function (v) { return Math.round(v * s); }), ItalicAngle: 0,
      Ascent: Math.round(t.ascent * s), Descent: Math.round(t.descent * s), CapHeight: Math.round(t.ascent * s * 0.7),
      StemV: 80, FontFile2: file
    }));
    var W = [];
    used.forEach(function (g) { W.push(g, [Math.round(t.advance(g) * s)]); });
    var cid = ctx.register(ctx.obj({
      Type: 'Font', Subtype: 'CIDFontType2', BaseFont: base,
      CIDSystemInfo: { Registry: L.PDFString.of('Adobe'), Ordering: L.PDFString.of('Identity'), Supplement: 0 },
      FontDescriptor: desc, W: W, DW: 1000, CIDToGIDMap: 'Identity'
    }));
    var cmap = toUnicodeCMap(this.used), bytes = new Uint8Array(cmap.length);
    for (var i = 0; i < cmap.length; i++) bytes[i] = cmap.charCodeAt(i);
    var tu = ctx.register(ctx.flateStream(bytes, {}));
    ctx.assign(this.ref, ctx.obj({ Type: 'Font', Subtype: 'Type0', BaseFont: base, Encoding: 'Identity-H', DescendantFonts: [cid], ToUnicode: tu }));
  };

  /* Standard fonts on demand, DejaVu Sans for everything else. */
  function FontBook(L, doc) {
    this.L = L; this.doc = doc; this.std = {}; this.uni = [null, null]; this.missing = new Set();
  }
  FontBook.prototype.stdFont = function (fam, b, i) {
    var k = (STD[fam] ? fam : 'sans') + (b ? 1 : 0) + (i ? 2 : 0);
    return this.std[k] || (this.std[k] = this.doc.embedStandardFont(this.L.StandardFonts[STD[STD[fam] ? fam : 'sans'][(b ? 1 : 0) + (i ? 2 : 0)]]));
  };
  FontBook.prototype.loadUnicode = async function () {
    try {
      this.uni[0] = new UniFont(this, await loadTTF('DejaVuSans.ttf'), 'DejaVuSans');
      this.uni[1] = new UniFont(this, await loadTTF('DejaVuSans-Bold.ttf'), 'DejaVuSansBold');
    } catch (e) { this.uniError = e; }
  };
  /* Split text into pieces that one font can draw. */
  FontBook.prototype.shape = function (text, s) {
    var out = [], cur = null, std = this.stdFont(s.fam, s.b, s.i), uni = this.uni[s.b ? 1 : 0] || this.uni[0];
    /* A word that needs the fallback font is drawn wholly in it, so it
       doesn't switch typeface halfway through. */
    if (uni && NON_WIN.test(text) && Array.from(text).every(function (ch) { var cp = ch.codePointAt(0); return cp === 0xA0 || uni.has(cp); })) {
      return [{ text: text.replace(/ /g, ' '), f: uni, uni: true }];
    }
    for (var ch of text) {
      var cp = ch.codePointAt(0), f = std, u = false, c = ch;
      if (cp === 0xA0) c = ' ';
      else if (!isWinAnsi(cp)) {
        if (uni && uni.has(cp)) { f = uni; u = true; }
        else { c = '?'; this.missing.add(ch); }
      }
      if (cur && cur.f === f) cur.text += c; else out.push(cur = { text: c, f: f, uni: u });
    }
    return out;
  };
  FontBook.prototype.width = function (q) {
    return (q.uni ? q.f.width(q.text, q.size) : q.f.widthOfTextAtSize(q.text, q.size)) * (q.sq || 1);
  };
  FontBook.prototype.finish = function () { this.uni.forEach(function (u) { if (u) u.finish(); }); };

  /* ========================================================================
     Text layout, shared by both tools
     ======================================================================== */

  /* Paragraph items are { t: 'text'|'field'|'tab'|'br'|'page'|'img' }.
     They become atoms: words (glued pieces), spaces, tabs and breaks. */
  function atomsOf(env, items, maxW) {
    var book = env.book, atoms = [], word = null;
    function glue(q) {
      if (!word) { word = { k: 'word', pieces: [], w: 0 }; atoms.push(word); }
      word.pieces.push(q); word.w += q.w;
    }
    items.forEach(function (it) {
      if (it.t === 'text' || it.t === 'field') {
        var s = it.s, text = it.t === 'field' ? String(env.fields && env.fields[it.f] != null ? env.fields[it.f] : (it.alt || '')) : it.text;
        if (!text) return;
        if (s.caps) text = text.toUpperCase();
        var size = s.va ? s.size * 0.65 : s.size, rise = s.va === 'sup' ? s.size * 0.35 : s.va === 'sub' ? -s.size * 0.14 : 0;
        text.split(/( +)/).forEach(function (part) {
          if (!part) return;
          var pieces = book.shape(part, s).map(function (sh) {
            var q = { k: 't', text: sh.text, f: sh.f, uni: sh.uni, s: s, size: size, rise: rise, sq: sh.uni ? 1 : (s.sq || 1) };
            q.w = book.width(q);
            return q;
          });
          if (part.charCodeAt(0) === 32) {
            word = null;
            pieces.forEach(function (q) { q.space = true; });
            atoms.push({ k: 'space', pieces: pieces, w: sum(pieces, function (q) { return q.w; }) });
          } else pieces.forEach(glue);
        });
      } else if (it.t === 'img') {
        word = null;
        var img = env.images ? env.images[it.path] : null, w = it.w, h = it.h;
        if (!(w > 0 && h > 0)) return;
        if (w > maxW) { h *= maxW / w; w = maxW; }
        if (env.maxH && h > env.maxH) { w *= env.maxH / h; h = env.maxH; }
        if (!img && env.missingPics) env.missingPics.add(it.path);
        atoms.push({ k: 'word', pieces: [{ k: 'img', img: img, w: w, h: h, s: it.s }], w: w, img: true });
      } else {
        word = null;
        atoms.push({ k: it.t, s: it.s });
      }
    });
    return atoms;
  }

  /* Greedy line breaking with tab stops. Positions are measured from the
     left edge of the text column. o: { first, rest, right, tabs, step, book } */
  function breakLines(atoms, o) {
    var lines = [], ln;
    function open(x) { ln = { x0: x, x: x, pieces: [], tab: null, hasTab: false }; }
    function close(end) {
      while (ln.pieces.length && ln.pieces[ln.pieces.length - 1].space) ln.x -= ln.pieces.pop().w;
      ln.end = end;
      lines.push(ln);
    }
    function push(q) {
      ln.pieces.push(q);
      ln.x += q.w;
      var t = ln.tab;
      if (t) {
        var seg = ln.x - t.from - t.p.w;
        var w = Math.max(0, t.center ? t.stop - t.from - seg / 2 : t.stop - t.from - seg);
        ln.x += w - t.p.w;
        t.p.w = w;
      }
    }
    function room() { return o.right - ln.x + (ln.tab ? ln.tab.p.w : 0); }
    function part(q, text) { var c = Object.assign({}, q, { text: text }); c.w = o.book.width(c); return c; }
    function tab(a) {
      ln.tab = null;
      var x = ln.x, stop = null, i;
      for (i = 0; i < o.tabs.length; i++) if (o.tabs[i].pos > x + 0.5) { stop = o.tabs[i]; break; }
      if (!stop) { var step = o.step || 36; stop = { pos: (Math.floor((x + 0.5) / step) + 1) * step, val: 'left' }; }
      if (stop.pos > o.right + 0.5 && stop.val !== 'right' && stop.val !== 'end') {
        if (ln.pieces.length) { close('wrap'); open(o.rest); }
        return;
      }
      ln.hasTab = true;
      var q = { k: 'tab', w: 0, leader: stop.leader, s: a.s };
      ln.pieces.push(q);
      if (stop.val === 'right' || stop.val === 'end' || stop.val === 'center' || stop.val === 'decimal') {
        ln.tab = { p: q, stop: Math.min(stop.pos, o.right), center: stop.val === 'center', from: x };
      } else { q.w = stop.pos - x; ln.x = stop.pos; }
    }
    function split(a) {
      a.pieces.forEach(function (q) {
        if (q.k !== 't') { if (ln.pieces.length && q.w > room()) { close('wrap'); open(o.rest); } push(q); return; }
        var buf = '';
        Array.from(q.text).forEach(function (ch) {
          if (part(q, buf + ch).w > room() + 0.01 && (buf || ln.pieces.length)) {
            if (buf) push(part(q, buf));
            close('wrap'); open(o.rest);
            buf = ch;
          } else buf += ch;
        });
        if (buf) push(part(q, buf));
      });
    }
    open(o.first);
    atoms.forEach(function (a) {
      if (a.k === 'br' || a.k === 'page') { close(a.k); open(o.rest); return; }
      if (a.k === 'tab') { tab(a); return; }
      if (a.k === 'space') {
        if (!ln.pieces.length && lines.length && lines[lines.length - 1].end === 'wrap') return;
        a.pieces.forEach(push);
        return;
      }
      if (ln.pieces.length && a.w > room() + 0.01) { close('wrap'); open(o.rest); }
      if (a.w > room() + 0.01 && !a.img) { split(a); return; }
      a.pieces.forEach(push);
    });
    close('end');
    return lines;
  }

  function rgbOf(L, c) { c = c || BLACK; return L.rgb(c[0], c[1], c[2]); }
  function sameColour(a, b) { a = a || BLACK; b = b || BLACK; return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]; }
  function mergeable(a, b) {
    return b.k === 't' && a.f === b.f && a.size === b.size && a.rise === b.rise && a.sq === b.sq && !!a.s.i === !!b.s.i && sameColour(a.s.color, b.s.color);
  }

  function drawText(env, page, q, text, x, y) {
    var L = env.L, c = q.s.color || BLACK;
    if (q.uni) { q.f.draw(page, text, x, y, q.size, c, q.s.i ? 0.2 : 0); return; }
    if (q.sq !== 1) page.pushOperators(L.setCharacterSqueeze(Math.round(q.sq * 100)));
    page.drawText(text, { x: x, y: y, size: q.size, font: q.f, color: rgbOf(L, c) });
    if (q.sq !== 1) page.pushOperators(L.setCharacterSqueeze(100));
  }

  /* Draw one laid-out line. `left` is the x of the text column, `top` the
     line's top edge, `right` the usable width measured from `left`. */
  function drawLine(env, page, ln, left, top, align, right) {
    var L = env.L, used = ln.x - ln.x0, avail = right - ln.x0, off = 0, extra = 0, i;
    if (align === 'center') off = Math.max(0, (avail - used) / 2);
    else if (align === 'right') off = Math.max(0, avail - used);
    else if (align === 'justify' && ln.end === 'wrap' && !ln.hasTab) {
      var gaps = 0;
      ln.pieces.forEach(function (q) { if (q.space) gaps++; });
      if (gaps) extra = Math.max(0, (avail - used) / gaps);
    }
    var base = top - ln.base, x = left + ln.x0 + off, pos = [];
    ln.pieces.forEach(function (q) { pos.push(x); x += q.w + (q.space ? extra : 0); });
    function wid(q) { return q.w + (q.space ? extra : 0); }

    ln.pieces.forEach(function (q, k) {
      var bg = q.s && (q.s.hl || q.s.shd);
      if (bg && q.k === 't') page.drawRectangle({ x: pos[k], y: base - q.s.size * 0.24, width: wid(q), height: q.s.size * 1.18, color: rgbOf(L, bg) });
    });
    i = 0;
    while (i < ln.pieces.length) {
      var q = ln.pieces[i];
      if (q.k === 't') {
        var text = q.text, j = i + 1;
        if (!extra) while (j < ln.pieces.length && mergeable(q, ln.pieces[j])) { text += ln.pieces[j].text; j++; }
        if (text.trim()) drawText(env, page, q, text, pos[i], base + q.rise);
        i = j;
        continue;
      }
      if (q.k === 'img') {
        if (q.img) page.drawImage(q.img, { x: pos[i], y: base, width: q.w, height: q.h });
        else page.drawRectangle({ x: pos[i], y: base, width: q.w, height: q.h, color: L.rgb(0.94, 0.94, 0.95), borderColor: L.rgb(0.75, 0.76, 0.78), borderWidth: 0.6 });
      } else if (q.k === 'tab' && q.leader && q.leader !== 'none' && q.w > 6) {
        var ch = q.leader === 'hyphen' ? '-' : q.leader === 'underscore' || q.leader === 'heavy' ? '_' : '.';
        var f = env.book.stdFont('sans', false, false), sz = q.s ? q.s.size : 10, dw = f.widthOfTextAtSize(ch, sz);
        var n = Math.floor((q.w - 6) / dw);
        if (n > 0) page.drawText(Array(n + 1).join(ch), { x: pos[i] + q.w - n * dw - 3, y: base, size: sz, font: f, color: L.rgb(0, 0, 0) });
      }
      i++;
    }
    var link = null;
    ln.pieces.forEach(function (q, k) {
      if (q.k !== 't') { link = null; return; }
      var c = rgbOf(L, q.s.color), w = wid(q), th = Math.max(0.5, q.size * 0.06);
      if (q.s.u) page.drawLine({ start: { x: pos[k], y: base + q.rise - q.size * 0.13 }, end: { x: pos[k] + w, y: base + q.rise - q.size * 0.13 }, thickness: th, color: c });
      if (q.s.strike) page.drawLine({ start: { x: pos[k], y: base + q.rise + q.size * 0.3 }, end: { x: pos[k] + w, y: base + q.rise + q.size * 0.3 }, thickness: th, color: c });
      if (q.s.link && env.links && /^(https?:|mailto:)/i.test(q.s.link)) {
        if (link && link.url === q.s.link) link.rect[2] = pos[k] + w;
        else { link = { url: q.s.link, rect: [pos[k], base - q.size * 0.25, pos[k] + w, base + q.size * 0.9] }; env.links.push(link); }
      } else link = null;
    });
  }

  function addLinks(env, page) {
    var L = env.L, ctx = env.doc.context;
    (env.links || []).forEach(function (a) {
      var annot = ctx.obj({ Type: 'Annot', Subtype: 'Link', Rect: a.rect.map(function (v) { return Math.round(v * 100) / 100; }), Border: [0, 0, 0],
        A: { Type: 'Action', S: 'URI', URI: L.PDFString.of(a.url) } });
      page.node.addAnnot(ctx.register(annot));
    });
    env.links = [];
  }

  /* ========================================================================
     Word: reading the .docx
     ======================================================================== */

  function kid(node, name) {
    if (!node) return null;
    for (var c = node.firstElementChild; c; c = c.nextElementSibling) if (c.localName === name) return c;
    return null;
  }
  function kids(node, name) {
    var out = [];
    if (!node) return out;
    for (var c = node.firstElementChild; c; c = c.nextElementSibling) if (!name || c.localName === name) out.push(c);
    return out;
  }
  function descendants(node, name) { return node ? Array.prototype.slice.call(node.getElementsByTagNameNS('*', name)) : []; }
  function attrP(node, prefix, name) {
    if (!node) return null;
    var v = node.getAttribute(prefix + ':' + name);
    if (v !== null) return v;
    for (var i = 0; i < node.attributes.length; i++) if (node.attributes[i].localName === name) return node.attributes[i].value;
    return null;
  }
  function attr(node, name) { return attrP(node, 'w', name); }
  function onOff(node) {
    if (!node) return undefined;
    var v = attr(node, 'val');
    return !(v === '0' || v === 'false' || v === 'off');
  }
  function flag(v) { return v === '1' || v === 'true' || v === 'on'; }
  /* Twentieths of a point (or a universal measure such as "2.5cm") to points. */
  function measure(v) {
    if (v === null || v === undefined || v === '') return undefined;
    var m = /^(-?[\d.]+)(mm|cm|in|pt|pc|pi)?$/.exec(String(v).trim());
    if (!m) return undefined;
    var n = parseFloat(m[1]);
    switch (m[2]) {
      case 'mm': return n * 72 / 25.4;
      case 'cm': return n * 72 / 2.54;
      case 'in': return n * 72;
      case 'pt': return n;
      case 'pc': case 'pi': return n * 12;
      default: return n / 20;
    }
  }
  function cssLength(v) {
    var m = /^\s*(-?[\d.]+)\s*(pt|px|in|cm|mm|pc)?\s*$/.exec(v || '');
    if (!m) return 0;
    var n = parseFloat(m[1]);
    return { pt: n, px: n * 0.75, in: n * 72, cm: n * 72 / 2.54, mm: n * 72 / 25.4, pc: n * 12 }[m[2] || 'px'];
  }

  var HIGHLIGHT = { yellow: 'FFFF00', green: '00FF00', cyan: '00FFFF', magenta: 'FF00FF', blue: '0000FF', red: 'FF0000', darkBlue: '000080',
    darkCyan: '008080', darkGreen: '008000', darkMagenta: '800080', darkRed: '800000', darkYellow: '808000', darkGray: '808080',
    lightGray: 'C0C0C0', black: '000000', white: 'FFFFFF' };

  /* Symbol and Wingdings characters, by their code in the font. */
  var SYMBOL = { 0xB7: '•', 0x2D: '-', 0xB0: '°', 0xB1: '±', 0xB4: '×', 0xB8: '÷', 0xA3: '≤', 0xB3: '≥', 0xB9: '≠', 0xAE: '→', 0xAC: '←',
    0xAD: '↑', 0xAF: '↓', 0xE3: '©', 0xE2: '®', 0xD4: '™', 0x61: 'α', 0x62: 'β', 0x67: 'γ', 0x64: 'δ', 0x65: 'ε', 0x71: 'θ', 0x6C: 'λ',
    0x6D: 'μ', 0x70: 'π', 0x73: 'σ', 0x77: 'ω', 0x53: 'Σ', 0x57: 'Ω', 0x44: 'Δ', 0xA5: '∞', 0xD6: '√', 0xA8: '♦', 0xA7: '♣', 0xA9: '♥', 0xAA: '♠' };
  var WINGDINGS = { 0xA7: '▪', 0xD8: '➢', 0xFC: '✓', 0xFB: '✗', 0xFD: '☒', 0xFE: '☑', 0x76: '❖', 0x6E: '■', 0x6C: '●', 0xA8: '◻', 0x71: '❑', 0x77: '◆',
    0x75: '◆', 0xE0: '➔', 0xE8: '➔', 0xF0: '⇨', 0x9F: '•', 0x4A: '☺', 0x6F: '□', 0xA1: '○', 0x9E: '·', 0x3F: '✎', 0x2A: '✉', 0x28: '☎', 0xF1: '⇧', 0xF2: '⇩' };
  function symbolChar(font, code) {
    var low = code & 0xFF, f = String(font || '').toLowerCase();
    if (/wingdings|webdings/.test(f)) return WINGDINGS[low] || null;
    if (/symbol/.test(f)) return SYMBOL[low] || null;
    return null;
  }
  function symbolText(font, text) {
    var f = String(font || '').toLowerCase();
    if (!/symbol|wingdings|webdings/.test(f)) {
      return text.replace(/[-]/g, function (c) { return symbolChar('symbol', c.charCodeAt(0)) || symbolChar('wingdings', c.charCodeAt(0)) || '•'; });
    }
    var out = '';
    for (var ch of text) out += symbolChar(font, ch.codePointAt(0)) || '•';
    return out;
  }
  function clean(s) {
    return String(s).replace(/[­​-‍⁠﻿]/g, '').replace(/[ -   　\t\r\n]/g, ' ')
      .replace(/[‐‑−]/g, '-').replace(/[\x00-\x08\x0B-\x1F]/g, '');
  }

  function familyOf(name) {
    var n = String(name || '').toLowerCase();
    if (/mono|courier|consolas|menlo|monaco|lucida console|source code|cascadia|fira code|inconsolata|lucida sans typewriter|ocr/.test(n)) return 'mono';
    if (/sans/.test(n)) return 'sans';
    if (/times|georgia|cambria|garamond|palatino|book antiqua|bookman|baskerville|century|constantia|minion|serif|caslon|didot|bodoni|rockwell|charter|merriweather|sabon|perpetua|goudy|centaur|high tower|californian|bell mt|calisto|mincho|simsun|songti|batang|sylfaen|liberation serif|noto serif|pt serif|lora|playfair|crimson|libre baskerville|gentium|charis|tinos/.test(n)) return 'serif';
    return 'sans';
  }
  /* Helvetica is wider than Calibri; squeezing it keeps line breaks and page
     counts close to Word's. */
  function squeezeOf(name) {
    var n = String(name || '').toLowerCase();
    if (/arial narrow|condensed|narrow/.test(n)) return 0.82;
    if (/calibri|carlito|candara|corbel/.test(n)) return 0.9;
    return 1;
  }
  function lineFactor(name, fam) {
    var n = String(name || '').toLowerCase();
    if (/calibri|carlito/.test(n)) return 1.22;
    if (/cambria|aptos/.test(n)) return 1.2;
    return fam === 'mono' ? 1.13 : 1.15;
  }

  function border(n) {
    if (!n) return undefined;
    var v = attr(n, 'val');
    if (!v || v === 'nil' || v === 'none') return null;
    var sz = parseFloat(attr(n, 'sz'));
    return { w: Math.max(0.25, (sz > 0 ? sz : 4) / 8), color: hexColour(attr(n, 'color')) || BLACK, space: parseFloat(attr(n, 'space')) || 0 };
  }
  function borders(n) {
    var out = {};
    kids(n).forEach(function (b) {
      var k = b.localName;
      if (k === 'start') k = 'left';
      if (k === 'end') k = 'right';
      var v = border(b);
      if (v !== undefined) out[k] = v;
    });
    return out;
  }
  function shading(n) {
    if (!n) return undefined;
    var val = attr(n, 'val'), fill = attr(n, 'fill'), col = attr(n, 'color');
    if (val === 'solid' && col && col !== 'auto') return hexColour(col);
    if (val === 'nil') return null;
    return fill && fill !== 'auto' ? hexColour(fill) : null;
  }
  function margins(n) {
    var out = {};
    kids(n).forEach(function (m) {
      var k = { top: 't', bottom: 'b', left: 'l', start: 'l', right: 'r', end: 'r' }[m.localName];
      var w = measure(attr(m, 'w'));
      if (k && w !== undefined && (attr(m, 'type') || 'dxa') === 'dxa') out[k] = w;
    });
    return out;
  }

  /* The parser: a closure over the document's shared parts. */
  function DocxReader(zip, parts) {
    this.zip = zip;
    this.parts = parts;          /* path -> root element, all loaded up front */
    this.relsCache = parts.rels; /* part path -> { rId: rel } */
  }

  function dirOf(p) { var i = p.lastIndexOf('/'); return i < 0 ? '' : p.slice(0, i + 1); }
  function joinPath(baseDir, target) {
    if (target[0] === '/') return target.slice(1);
    var out = [];
    (baseDir + target).split('/').forEach(function (s) { if (s === '..') out.pop(); else if (s && s !== '.') out.push(s); });
    return out.join('/');
  }

  async function loadDocx(bytes) {
    var sig = bytes.subarray(0, 8);
    if (sig[0] === 0xD0 && sig[1] === 0xCF && sig[2] === 0x11 && sig[3] === 0xE0) {
      throw new Error('This is an older Word 97–2003 document (.doc), which this tool can\'t read. Open it in Word, LibreOffice or Google Docs, save it as .docx, and drop that here. (A password-protected .docx looks the same: remove the password first.)');
    }
    if (sig[0] === 0x7B && sig[1] === 0x5C && sig[2] === 0x72 && sig[3] === 0x74) {
      throw new Error('This is a Rich Text (.rtf) file, not a .docx. Open it in Word or LibreOffice, save it as .docx, and drop that here.');
    }
    if (sig[0] !== 0x50 || sig[1] !== 0x4B) throw new Error('This doesn\'t look like a Word document. Choose a .docx file.');
    var JSZip = await libZip(), zip;
    try { zip = await JSZip.loadAsync(bytes); }
    catch (e) { throw new Error('This file could not be opened as a Word document. It may be damaged.'); }
    var lower = {};
    Object.keys(zip.files).forEach(function (k) { lower[k.toLowerCase()] = k; });
    function file(path) { return zip.file(path) || (lower[path.toLowerCase()] ? zip.file(lower[path.toLowerCase()]) : null); }
    async function xml(path) {
      var f = file(path);
      if (!f) return null;
      var d = new DOMParser().parseFromString(await f.async('string'), 'application/xml');
      if (d.getElementsByTagName('parsererror').length) throw new Error('Part of this document (' + path + ') is damaged and could not be read.');
      return d.documentElement;
    }
    var relsCache = {};
    async function rels(path) {
      if (relsCache[path]) return relsCache[path];
      var root = await xml(dirOf(path) + '_rels/' + path.slice(dirOf(path).length) + '.rels'), out = {};
      kids(root, 'Relationship').forEach(function (r) {
        var ext = r.getAttribute('TargetMode') === 'External', target = r.getAttribute('Target') || '';
        out[r.getAttribute('Id')] = { type: r.getAttribute('Type') || '', external: ext, target: ext ? target : joinPath(dirOf(path), target) };
      });
      return (relsCache[path] = out);
    }

    if (file('content.xml') && file('mimetype')) throw new Error('This is an OpenDocument file (.odt), not a .docx. Open it in LibreOffice or Word, save it as .docx, and drop that here.');
    var top = await rels('');
    var mainPath = 'word/document.xml';
    Object.keys(top).forEach(function (id) { if (/\/officeDocument$/.test(top[id].type)) mainPath = top[id].target; });
    if (!file(mainPath)) {
      if (file('xl/workbook.xml')) throw new Error('This is an Excel workbook. Use the Excel to PDF tab for spreadsheets.');
      if (file('ppt/presentation.xml')) throw new Error('This is a PowerPoint presentation, which this tool doesn\'t convert.');
      throw new Error('This file is a zip archive but not a Word document.');
    }
    var parts = { rels: relsCache };
    parts.main = await xml(mainPath);
    parts.mainPath = mainPath;
    var docRels = await rels(mainPath);
    var byType = function (t) { return Object.keys(docRels).filter(function (id) { return new RegExp('/' + t + '$').test(docRels[id].type); }).map(function (id) { return docRels[id].target; }); };
    parts.styles = await xml(byType('styles')[0] || 'word/styles.xml');
    parts.numbering = await xml(byType('numbering')[0] || 'word/numbering.xml');
    parts.theme = await xml(byType('theme')[0] || 'word/theme/theme1.xml');
    parts.settings = await xml(byType('settings')[0] || 'word/settings.xml');
    parts.core = await xml('docProps/core.xml');
    parts.xml = {};
    var extra = byType('header').concat(byType('footer'), byType('footnotes'), byType('endnotes'));
    for (var i = 0; i < extra.length; i++) {
      parts.xml[extra[i]] = await xml(extra[i]);
      await rels(extra[i]);
    }
    parts.footnotesPath = byType('footnotes')[0];
    parts.endnotesPath = byType('endnotes')[0];
    parts.file = file;
    return parseDocx(parts);
  }

  function parseDocx(P) {
    var D = {
      styles: {}, resolved: {}, abs: {}, num: {}, counts: {}, theme: { major: null, minor: null },
      defaults: { p: {}, r: {} }, defaultPStyle: null, defaultTStyle: null,
      images: new Set(), uni: false, fld: [],
      stats: { paragraphs: 0, tables: 0, pictures: 0, textboxes: 0, charts: 0, smartart: 0, shapes: 0, math: 0, columns: false, notes: 0 },
      notes: { foot: {}, end: {} }, noteOrder: [], noteLabel: null
    };

    /* --- theme, styles, numbering --- */
    if (P.theme) {
      var maj = descendants(P.theme, 'majorFont')[0], min = descendants(P.theme, 'minorFont')[0];
      D.theme.major = maj && kid(maj, 'latin') ? kid(maj, 'latin').getAttribute('typeface') : null;
      D.theme.minor = min && kid(min, 'latin') ? kid(min, 'latin').getAttribute('typeface') : null;
    }

    function parseRPr(node, into) {
      if (!node) return into;
      ['b', 'i', 'strike', 'dstrike', 'caps', 'smallCaps', 'vanish'].forEach(function (k) { var n = kid(node, k); if (n) into[k] = onOff(n); });
      var n = kid(node, 'u'), v;
      if (n) into.u = (attr(n, 'val') || 'single') !== 'none';
      if ((n = kid(node, 'sz')) && (v = parseFloat(attr(n, 'val'))) > 0) into.size = v / 2;
      if ((n = kid(node, 'color'))) { v = attr(n, 'val'); into.color = !v || v === 'auto' ? null : hexColour(v); }
      if ((n = kid(node, 'highlight'))) into.hl = hexColour(HIGHLIGHT[attr(n, 'val')]);
      if ((n = kid(node, 'shd'))) into.shd = shading(n);
      if ((n = kid(node, 'vertAlign'))) { v = attr(n, 'val'); into.va = v === 'superscript' ? 'sup' : v === 'subscript' ? 'sub' : null; }
      if ((n = kid(node, 'rFonts'))) {
        var th = attr(n, 'asciiTheme') || attr(n, 'hAnsiTheme'), f = attr(n, 'ascii') || attr(n, 'hAnsi');
        if (th && D.theme[/^major/.test(th) ? 'major' : 'minor']) into.font = D.theme[/^major/.test(th) ? 'major' : 'minor'];
        else if (f) into.font = f;
      }
      return into;
    }

    function parsePPr(node, into) {
      if (!node) return into;
      var n, v;
      if ((n = kid(node, 'jc'))) {
        v = attr(n, 'val');
        into.jc = v === 'center' ? 'center' : (v === 'right' || v === 'end') ? 'right' : (v === 'both' || v === 'distribute' || /Kashida/.test(v || '')) ? 'justify' : 'left';
      }
      if ((n = kid(node, 'spacing'))) {
        if ((v = measure(attr(n, 'before'))) !== undefined) into.before = v;
        if ((v = measure(attr(n, 'after'))) !== undefined) into.after = v;
        if (flag(attr(n, 'beforeAutospacing'))) into.before = 14;
        if (flag(attr(n, 'afterAutospacing'))) into.after = 14;
        v = attr(n, 'line');
        if (v !== null && parseFloat(v) > 0) {
          var rule = attr(n, 'lineRule') || 'auto';
          into.lineRule = rule;
          into.line = rule === 'auto' ? parseFloat(v) / 240 : measure(v);
        }
      }
      if ((n = kid(node, 'ind'))) {
        if ((v = measure(attr(n, 'left') !== null ? attr(n, 'left') : attr(n, 'start'))) !== undefined) into.indL = v;
        if ((v = measure(attr(n, 'right') !== null ? attr(n, 'right') : attr(n, 'end'))) !== undefined) into.indR = v;
        if ((v = measure(attr(n, 'firstLine'))) !== undefined) into.first = v;
        if ((v = measure(attr(n, 'hanging'))) !== undefined) into.first = -v;
      }
      if ((n = kid(node, 'numPr'))) {
        var id = attr(kid(n, 'numId'), 'val'), lv = attr(kid(n, 'ilvl'), 'val');
        if (id !== null) into.numId = id;
        if (lv !== null) into.ilvl = parseInt(lv, 10) || 0;
      }
      if ((n = kid(node, 'outlineLvl'))) into.outline = parseInt(attr(n, 'val'), 10);
      ['pageBreakBefore', 'keepNext', 'contextualSpacing'].forEach(function (k) { var m = kid(node, k); if (m) into[k === 'contextualSpacing' ? 'contextual' : k] = onOff(m); });
      if ((n = kid(node, 'pBdr'))) into.bdr = Object.assign({}, into.bdr, borders(n));
      if ((n = kid(node, 'shd'))) into.shd = shading(n);
      if ((n = kid(node, 'tabs'))) {
        var tabs = (into.tabs || []).slice();
        kids(n, 'tab').forEach(function (t) {
          var pos = measure(attr(t, 'pos')), val = attr(t, 'val');
          if (pos === undefined) return;
          tabs = tabs.filter(function (x) { return Math.abs(x.pos - pos) > 0.5; });
          if (val !== 'clear') tabs.push({ pos: pos, val: val, leader: attr(t, 'leader') });
        });
        into.tabs = tabs.sort(function (a, b) { return a.pos - b.pos; });
      }
      return into;
    }

    if (P.styles) {
      var dd = kid(P.styles, 'docDefaults');
      if (dd) {
        D.defaults.r = parseRPr(kid(kid(dd, 'rPrDefault'), 'rPr'), {});
        D.defaults.p = parsePPr(kid(kid(dd, 'pPrDefault'), 'pPr'), {});
      }
      kids(P.styles, 'style').forEach(function (s) {
        var id = attr(s, 'styleId');
        if (!id) return;
        var type = attr(s, 'type'), isDefault = flag(attr(s, 'default'));
        D.styles[id] = { id: id, type: type, node: s, name: (attr(kid(s, 'name'), 'val') || '').toLowerCase(), basedOn: attr(kid(s, 'basedOn'), 'val') };
        if (isDefault && type === 'paragraph') D.defaultPStyle = id;
        if (isDefault && type === 'table') D.defaultTStyle = id;
      });
    }
    if (!D.defaults.r.font) D.defaults.r.font = D.theme.minor || 'Times New Roman';

    function tcProps(node, into) {
      if (!node) return into;
      var n;
      if ((n = kid(node, 'shd'))) into.shd = shading(n);
      if ((n = kid(node, 'tcBorders'))) into.borders = Object.assign({}, into.borders, borders(n));
      return into;
    }

    /* Merge a style with the styles it is based on. */
    function resolveStyle(id, depth) {
      if (D.resolved[id]) return D.resolved[id];
      var st = D.styles[id];
      if (!st || (depth || 0) > 20) return { p: {}, r: {}, tbl: { borders: {}, mar: {} }, cond: {}, tc: {} };
      var base = st.basedOn && st.basedOn !== id ? resolveStyle(st.basedOn, (depth || 0) + 1) : { p: {}, r: {}, tbl: { borders: {}, mar: {} }, cond: {}, tc: {} };
      var node = st.node;
      var out = {
        p: parsePPr(kid(node, 'pPr'), Object.assign({}, base.p)),
        r: parseRPr(kid(node, 'rPr'), Object.assign({}, base.r)),
        tbl: { borders: Object.assign({}, base.tbl.borders), mar: Object.assign({}, base.tbl.mar) },
        tc: tcProps(kid(node, 'tcPr'), Object.assign({}, base.tc)),
        cond: Object.assign({}, base.cond)
      };
      var tp = kid(node, 'tblPr');
      if (tp) {
        Object.assign(out.tbl.borders, borders(kid(tp, 'tblBorders')));
        Object.assign(out.tbl.mar, margins(kid(tp, 'tblCellMar')));
        if (kid(tp, 'shd')) out.tc.shd = shading(kid(tp, 'shd'));
      }
      kids(node, 'tblStylePr').forEach(function (c) {
        var type = attr(c, 'type'), prev = out.cond[type] || { p: {}, r: {}, tc: {} };
        out.cond[type] = {
          p: parsePPr(kid(c, 'pPr'), Object.assign({}, prev.p)),
          r: parseRPr(kid(c, 'rPr'), Object.assign({}, prev.r)),
          tc: tcProps(kid(c, 'tcPr'), Object.assign({}, prev.tc))
        };
      });
      out.hasSize = out.r.size !== undefined;
      return (D.resolved[id] = out);
    }

    if (P.numbering) {
      kids(P.numbering, 'abstractNum').forEach(function (a) {
        var levels = {};
        kids(a, 'lvl').forEach(function (l) { levels[parseInt(attr(l, 'ilvl'), 10) || 0] = parseLevel(l); });
        D.abs[attr(a, 'abstractNumId')] = { levels: levels, styleLink: attr(kid(a, 'numStyleLink'), 'val') };
      });
      kids(P.numbering, 'num').forEach(function (n) {
        var over = {};
        kids(n, 'lvlOverride').forEach(function (o) {
          var k = parseInt(attr(o, 'ilvl'), 10) || 0, so = kid(o, 'startOverride'), lv = kid(o, 'lvl');
          over[k] = { start: so ? parseInt(attr(so, 'val'), 10) : null, lvl: lv ? parseLevel(lv) : null };
        });
        D.num[attr(n, 'numId')] = { abs: attr(kid(n, 'abstractNumId'), 'val'), over: over };
      });
    }
    function parseLevel(l) {
      var st = kid(l, 'start');
      return {
        start: st ? parseInt(attr(st, 'val'), 10) : 1,
        fmt: attr(kid(l, 'numFmt'), 'val') || 'decimal',
        text: attr(kid(l, 'lvlText'), 'val'),
        suff: attr(kid(l, 'suff'), 'val') || 'tab',
        p: parsePPr(kid(l, 'pPr'), {}),
        r: parseRPr(kid(l, 'rPr'), {}),
        font: (function () { var f = kid(kid(l, 'rPr'), 'rFonts'); return f ? (attr(f, 'ascii') || attr(f, 'hAnsi')) : null; })()
      };
    }
    function levelOf(numId, ilvl) {
      var num = D.num[numId];
      if (!num) return null;
      var absId = num.abs, abs = D.abs[absId];
      if (abs && abs.styleLink && !Object.keys(abs.levels).length && D.styles[abs.styleLink]) {
        var nid = resolveStyle(abs.styleLink).p.numId;
        if (nid && D.num[nid] && D.num[nid].abs !== absId) { absId = D.num[nid].abs; abs = D.abs[absId]; }
      }
      var lv = (num.over[ilvl] && num.over[ilvl].lvl) || (abs && abs.levels[ilvl]);
      if (!lv) return null;
      return { lv: lv, key: absId, num: num, abs: abs };
    }
    function formatNumber(n, fmt) {
      switch (fmt) {
        case 'bullet': case 'none': return '';
        case 'decimalZero': return (n < 10 ? '0' : '') + n;
        case 'upperRoman': return roman(n);
        case 'lowerRoman': return roman(n).toLowerCase();
        case 'upperLetter': return letters(n);
        case 'lowerLetter': return letters(n).toLowerCase();
        case 'ordinal': return n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
        default: return String(n);
      }
    }
    function markerFor(numId, ilvl) {
      var info = levelOf(numId, ilvl);
      if (!info) return null;
      var st = D.counts[info.key] || (D.counts[info.key] = { n: {}, seen: {} });
      if (!st.seen[numId]) {
        st.seen[numId] = true;
        Object.keys(info.num.over).forEach(function (k) { var o = info.num.over[k]; if (o.start !== null && !isNaN(o.start)) { st.n[k] = o.start - 1; st.fresh = true; } });
      }
      st.n[ilvl] = st.n[ilvl] === undefined ? info.lv.start : st.n[ilvl] + 1;
      for (var j = ilvl + 1; j < 10; j++) delete st.n[j];
      var lv = info.lv, text;
      if (lv.fmt === 'bullet') text = symbolText(lv.font, lv.text || '•');
      else {
        text = (lv.text === null ? '%' + (ilvl + 1) + '.' : lv.text).replace(/%([1-9])/g, function (m, d) {
          var k = d - 1, other = k === ilvl ? info : levelOf(numId, k);
          var v = st.n[k] !== undefined ? st.n[k] : (other ? other.lv.start : 1);
          return formatNumber(v, other ? other.lv.fmt : 'decimal');
        });
      }
      return { text: text, lv: lv };
    }

    function headingLevel(styleId, p) {
      var id = styleId, guard = 0;
      while (id && D.styles[id] && guard++ < 20) {
        var m = /^heading\s*([1-9])$/.exec(D.styles[id].name);
        if (m) return +m[1];
        if (D.styles[id].name === 'title') return 0;
        id = D.styles[id].basedOn;
      }
      var s = /^heading([1-9])$/i.exec(styleId || '');
      if (s && !D.styles[styleId]) return +s[1];
      if (/^title$/i.test(styleId || '') && !D.styles[styleId]) return 0;
      if (p.outline >= 0 && p.outline < 9) return p.outline + 1;
      return null;
    }
    var HEAD_SIZE = [26, 16, 13, 12, 11, 11, 11, 11, 11, 11];

    function runStyle(r, link) {
      var name = r.font || D.defaults.r.font, fam = familyOf(name);
      return {
        fam: fam, b: !!r.b, i: !!r.i, u: !!r.u, strike: !!(r.strike || r.dstrike), size: r.size || 10,
        color: r.color || null, hl: r.hl || null, shd: r.shd || null, va: r.va || null, caps: !!(r.caps || r.smallCaps),
        link: link || null, sq: squeezeOf(name), lh: lineFactor(name, fam)
      };
    }
    function noteUnicode(s) { if (!D.uni && NON_WIN.test(s)) D.uni = true; }

    /* --- blocks --- */
    function relsOf(part) { return P.rels[part] || {}; }

    function parseBlocks(node, part, layer, out) {
      out = out || [];
      kids(node).forEach(function (n) { parseBlock(n, part, layer, out); });
      return out;
    }
    function parseBlock(n, part, layer, out) {
      var name = n.localName;
      if (name === 'p') return parsePara(n, part, layer, out);
      if (name === 'tbl') { out.push(parseTable(n, part)); return null; }
      if (name === 'sdt') { var c = kid(n, 'sdtContent'); if (c) parseBlocks(c, part, layer, out); return null; }
      if (name === 'customXml' || name === 'ins' || name === 'moveTo' || name === 'smartTag') { parseBlocks(n, part, layer, out); return null; }
      if (name === 'AlternateContent') { var ch = kid(n, 'Choice') || kid(n, 'Fallback'); if (ch) parseBlocks(ch, part, layer, out); }
      return null;
    }

    function parsePara(n, part, layer, out) {
      D.stats.paragraphs++;
      var pPr = kid(n, 'pPr');
      var styleId = attr(kid(pPr, 'pStyle'), 'val') || D.defaultPStyle;
      var st = styleId && D.styles[styleId] ? resolveStyle(styleId) : { p: {}, r: {}, hasSize: false };
      var direct = parsePPr(pPr, {});
      var numId = direct.numId !== undefined ? direct.numId : st.p.numId;
      var ilvl = direct.ilvl !== undefined ? direct.ilvl : (st.p.ilvl || 0);
      var info = numId && numId !== '0' ? levelOf(numId, ilvl) : null;
      var p = Object.assign({}, D.defaults.p, layer ? layer.p : null, st.p, info ? info.lv.p : null, direct);
      var baseR = Object.assign({}, D.defaults.r, layer ? layer.r : null, st.r);
      var heading = headingLevel(styleId, p);
      if (heading !== null) {
        if (!st.hasSize && !(layer && layer.r.size)) { baseR.size = HEAD_SIZE[heading]; if (st.r.b === undefined) baseR.b = true; }
        if (st.p.before === undefined && direct.before === undefined && heading > 0) p.before = Math.max(p.before || 0, 12);
        p.keepNext = true;
      }
      var markR = parseRPr(kid(pPr, 'rPr'), Object.assign({}, baseR));
      var block = { type: 'p', p: p, items: [], styleId: styleId, heading: heading, mark: runStyle(markR), after: [] };
      if (info) {
        var m = markerFor(numId, ilvl);
        if (m && m.text) {
          noteUnicode(m.text);
          block.marker = { text: m.text, s: runStyle(Object.assign({}, markR, m.lv.r, { u: false, font: m.lv.fmt === 'bullet' && /symbol|wingdings|webdings/i.test(m.lv.font || '') ? markR.font : (m.lv.r.font || markR.font) })), suff: m.lv.suff };
        }
      }
      parseInline(n, part, baseR, block, null);
      out.push(block);
      append(out, block.after);
      delete block.after;
      return kid(pPr, 'sectPr');
    }

    function fieldKind(instr) {
      var m = /^\s*(PAGE|NUMPAGES|SECTIONPAGES)\b/i.exec(instr || '');
      return m ? (m[1].toUpperCase() === 'PAGE' ? 'PAGE' : 'NUMPAGES') : null;
    }
    function fieldLink(instr) {
      var m = /^\s*HYPERLINK\s+"([^"]+)"/i.exec(instr || '');
      return m ? m[1] : null;
    }

    function parseInline(node, part, baseR, block, link) {
      kids(node).forEach(function (n) {
        switch (n.localName) {
          case 'r': parseRun(n, part, baseR, block, link); break;
          case 'hyperlink': {
            var id = attrP(n, 'r', 'id'), rel = id ? relsOf(part)[id] : null;
            parseInline(n, part, baseR, block, rel && rel.external ? rel.target : link || (attr(n, 'anchor') ? '#' : null));
            break;
          }
          case 'fldSimple': {
            var instr = attr(n, 'instr') || '', kind = fieldKind(instr);
            if (kind && /header|footer/.test(part)) {
              var first = kid(n, 'r'), s = runStyle(parseRPr(kid(first, 'rPr'), Object.assign({}, baseR)), link);
              block.items.push({ t: 'field', f: kind, s: s, alt: n.textContent });
            } else parseInline(n, part, baseR, block, fieldLink(instr) || link);
            break;
          }
          case 'ins': case 'moveTo': case 'smartTag': case 'customXml': case 'dir': case 'bdo':
            parseInline(n, part, baseR, block, link); break;
          case 'sdt': { var c = kid(n, 'sdtContent'); if (c) parseInline(c, part, baseR, block, link); break; }
          case 'AlternateContent': { var ch = kid(n, 'Choice') || kid(n, 'Fallback'); if (ch) parseInline(ch, part, baseR, block, link); break; }
          case 'oMath': case 'oMathPara': {
            D.stats.math++;
            var text = descendants(n, 't').map(function (t) { return t.textContent; }).join('');
            if (text) { noteUnicode(text); block.items.push({ t: 'text', text: clean(text), s: runStyle(Object.assign({}, baseR, { i: true }), link) }); }
            break;
          }
          default: break;
        }
      });
    }

    function parseRun(r, part, baseR, block, link) {
      var rPr = kid(r, 'rPr');
      var rs = attr(kid(rPr, 'rStyle'), 'val');
      var props = parseRPr(rPr, Object.assign({}, baseR, rs && D.styles[rs] ? resolveStyle(rs).r : null));
      var inHeader = /header|footer/.test(part);
      var fieldHere = function () {
        for (var i = D.fld.length - 1; i >= 0; i--) if (D.fld[i].phase === 'code') return 'code';
        var top = D.fld[D.fld.length - 1];
        return top && top.phase === 'result' && top.kind && inHeader ? 'skip' : null;
      };
      var fieldUrl = function () { for (var i = D.fld.length - 1; i >= 0; i--) if (D.fld[i].phase === 'result' && D.fld[i].link) return D.fld[i].link; return null; };
      var s = null;
      var style = function () { return s || (s = runStyle(props, link || fieldUrl())); };
      function text(t) {
        if (props.vanish || fieldHere()) return;
        if (props.font && /symbol|wingdings|webdings/i.test(props.font)) t = symbolText(props.font, t);
        else if (/[-]/.test(t)) t = symbolText(null, t);
        t = clean(t);
        if (!t) return;
        noteUnicode(t);
        block.items.push({ t: 'text', text: t, s: style() });
      }
      function child(c) {
        switch (c.localName) {
          case 't': text(c.textContent); break;
          case 'tab': case 'ptab': if (!props.vanish && !fieldHere()) block.items.push({ t: 'tab', s: style() }); break;
          case 'br': case 'cr':
            if (props.vanish || fieldHere()) break;
            if (attr(c, 'type') === 'page') block.items.push({ t: 'page' });
            else block.items.push({ t: 'br', s: style() });
            break;
          case 'noBreakHyphen': text('-'); break;
          case 'sym': {
            var ch = symbolChar(attr(c, 'font'), parseInt(attr(c, 'char') || '0', 16));
            if (ch) text(ch);
            break;
          }
          case 'drawing': if (!props.vanish) parseDrawing(c, part, style(), block); break;
          case 'pict': case 'object': if (!props.vanish) parseVml(c, part, style(), block); break;
          case 'AlternateContent': { var ch2 = kid(c, 'Choice') || kid(c, 'Fallback'); if (ch2) kids(ch2).forEach(child); break; }
          case 'fldChar': {
            var type = attr(c, 'fldCharType');
            if (type === 'begin') D.fld.push({ instr: '', phase: 'code' });
            else if (type === 'separate' && D.fld.length) {
              var f = D.fld[D.fld.length - 1];
              f.phase = 'result';
              f.kind = fieldKind(f.instr);
              f.link = fieldLink(f.instr);
              if (f.kind && inHeader) block.items.push({ t: 'field', f: f.kind, s: style() });
            } else if (type === 'end' && D.fld.length) {
              var g = D.fld.pop();
              if (g.phase === 'code' && fieldKind(g.instr) && inHeader && !fieldHere()) block.items.push({ t: 'field', f: fieldKind(g.instr), s: style() });
            }
            break;
          }
          case 'instrText': if (D.fld.length) D.fld[D.fld.length - 1].instr += c.textContent; break;
          case 'footnoteReference': case 'endnoteReference': {
            if (props.vanish) break;
            var kind = c.localName === 'footnoteReference' ? 'foot' : 'end', id = attr(c, 'id');
            var label = noteLabel(kind, id);
            if (label) block.items.push({ t: 'text', text: label, s: Object.assign({}, style(), { va: 'sup' }) });
            break;
          }
          case 'footnoteRef': case 'endnoteRef':
            if (D.noteLabel) block.items.push({ t: 'text', text: D.noteLabel, s: Object.assign({}, style(), { va: 'sup' }) });
            break;
          default: break;
        }
      }
      kids(r).forEach(child);
    }

    function noteLabel(kind, id) {
      var store = D.notes[kind];
      if (store[id]) return store[id];
      var path = kind === 'foot' ? P.footnotesPath : P.endnotesPath, root = path && P.xml[path];
      if (!root) return null;
      var count = D.noteOrder.filter(function (n) { return n.kind === kind; }).length + 1;
      var label = kind === 'foot' ? String(count) : roman(count).toLowerCase();
      store[id] = label;
      D.noteOrder.push({ kind: kind, id: id, label: label, path: path });
      return label;
    }

    function imageItem(rid, part, w, h, s) {
      var rel = rid ? relsOf(part)[rid] : null;
      if (!rel || rel.external || !P.file(rel.target)) return null;
      D.images.add(rel.target);
      D.stats.pictures++;
      return { t: 'img', path: rel.target, w: w, h: h, s: s };
    }

    function parseDrawing(d, part, s, block) {
      var holder = kid(d, 'inline') || kid(d, 'anchor');
      if (!holder) return;
      var anchored = holder.localName === 'anchor';
      var ext = kid(holder, 'extent');
      var W = ext ? parseFloat(ext.getAttribute('cx')) / 12700 : 0, H = ext ? parseFloat(ext.getAttribute('cy')) / 12700 : 0;
      var boxes = descendants(holder, 'txbxContent'), pics = descendants(holder, 'pic').filter(function (p) { return p.namespaceURI && /picture/.test(p.namespaceURI); });
      var found = false;
      boxes.forEach(function (t) { D.stats.textboxes++; parseBlocks(t, part, null, block.after); found = true; });
      pics.forEach(function (pic) {
        var blip = descendants(pic, 'blip')[0];
        var rid = blip ? attrP(blip, 'r', 'embed') : null;
        var w = W, h = H, xe = descendants(pic, 'ext').filter(function (e) { return e.parentNode && e.parentNode.localName === 'xfrm'; })[0];
        if (pics.length > 1 && xe) { w = parseFloat(xe.getAttribute('cx')) / 12700; h = parseFloat(xe.getAttribute('cy')) / 12700; }
        var item = imageItem(rid, part, w, h, s);
        if (!item) return;
        found = true;
        if (anchored || pics.length > 1) {
          var pos = descendants(holder, 'align')[0], jc = pos && /center/.test(pos.textContent) ? 'center' : pos && /right/.test(pos.textContent) ? 'right' : 'left';
          block.after.push({ type: 'p', p: { jc: jc, after: 6, before: 6 }, items: [item], styleId: null, mark: block.mark });
        } else block.items.push(item);
      });
      if (found) return;
      if (descendants(holder, 'chart').length) D.stats.charts++;
      else if (descendants(holder, 'relIds').length) D.stats.smartart++;
      else D.stats.shapes++;
    }

    function parseVml(node, part, s, block) {
      descendants(node, 'txbxContent').forEach(function (t) { D.stats.textboxes++; parseBlocks(t, part, null, block.after); });
      var data = descendants(node, 'imagedata')[0];
      if (!data) return;
      var shape = data.parentNode, style = shape && shape.getAttribute ? shape.getAttribute('style') || '' : '';
      var w = cssLength((/(?:^|;)\s*width\s*:\s*([^;]+)/.exec(style) || [])[1]), h = cssLength((/(?:^|;)\s*height\s*:\s*([^;]+)/.exec(style) || [])[1]);
      var item = imageItem(attrP(data, 'r', 'id'), part, w || 100, h || 75, s);
      if (item) block.items.push(item);
    }

    /* --- tables --- */
    function rowsOf(node) {
      var out = [];
      kids(node).forEach(function (n) {
        if (n.localName === 'tr') out.push(n);
        else if (n.localName === 'sdt') append(out, rowsOf(kid(n, 'sdtContent')));
        else if (n.localName === 'customXml') append(out, rowsOf(n));
      });
      return out;
    }
    function cellsOf(node) {
      var out = [];
      kids(node).forEach(function (n) {
        if (n.localName === 'tc') out.push(n);
        else if (n.localName === 'sdt') append(out, cellsOf(kid(n, 'sdtContent')));
        else if (n.localName === 'customXml') append(out, cellsOf(n));
      });
      return out;
    }
    function look(tblPr) {
      var n = kid(tblPr, 'tblLook'), v = n ? parseInt(attr(n, 'val') || '', 16) : 0x04A0;
      if (isNaN(v)) v = 0x04A0;
      var bit = function (name, mask) { var a = n ? attr(n, name) : null; return a !== null ? flag(a) : !!(v & mask); };
      return { firstRow: bit('firstRow', 0x20), lastRow: bit('lastRow', 0x40), firstCol: bit('firstColumn', 0x80), lastCol: bit('lastColumn', 0x100), noHBand: bit('noHBand', 0x200) };
    }

    function parseTable(tbl, part) {
      D.stats.tables++;
      var tblPr = kid(tbl, 'tblPr');
      var styleId = attr(kid(tblPr, 'tblStyle'), 'val') || D.defaultTStyle;
      var st = styleId && D.styles[styleId] ? resolveStyle(styleId) : { p: {}, r: {}, tbl: { borders: {}, mar: {} }, tc: {}, cond: {} };
      var tb = Object.assign({}, st.tbl.borders, borders(kid(tblPr, 'tblBorders')));
      var mar = Object.assign({ l: 5.4, r: 5.4, t: 0, b: 0 }, st.tbl.mar, margins(kid(tblPr, 'tblCellMar')));
      var lk = look(tblPr);
      var grid = kids(kid(tbl, 'tblGrid'), 'gridCol').map(function (g) { return measure(attr(g, 'w')) || 0; });
      var tw = kid(tblPr, 'tblW'), width = null;
      if (tw) {
        var wt = attr(tw, 'type'), wv = attr(tw, 'w') || '';
        if (wt === 'pct') width = { pct: /%$/.test(wv) ? parseFloat(wv) / 100 : parseFloat(wv) / 5000 };
        else if (wt === 'dxa' && measure(wv)) width = { pt: measure(wv) };
      }
      var jc = attr(kid(tblPr, 'jc'), 'val');
      var t = {
        type: 'table', grid: grid, width: width, jc: jc === 'center' ? 'center' : (jc === 'right' || jc === 'end') ? 'right' : 'left',
        ind: measure(attr(kid(tblPr, 'tblInd'), 'w')) || 0, rows: [], ncols: grid.length
      };
      var trs = rowsOf(tbl), tableShd = shading(kid(tblPr, 'shd'));
      trs.forEach(function (tr, ri) {
        var trPr = kid(tr, 'trPr'), hEl = kid(trPr, 'trHeight');
        var row = { header: !!onOff(kid(trPr, 'tblHeader')), height: hEl ? measure(attr(hEl, 'val')) || 0 : 0, hRule: hEl ? attr(hEl, 'hRule') || 'atLeast' : null, cells: [] };
        var col = parseInt(attr(kid(trPr, 'gridBefore'), 'val'), 10) || 0;
        var last = ri === trs.length - 1;
        var band = ri - (lk.firstRow ? 1 : 0);
        var tcs = cellsOf(tr);
        tcs.forEach(function (tc, ci) {
          var tcPr = kid(tc, 'tcPr');
          var span = parseInt(attr(kid(tcPr, 'gridSpan'), 'val'), 10) || 1;
          var vm = kid(tcPr, 'vMerge'), vmerge = vm ? (attr(vm, 'val') === 'restart' ? 'restart' : 'continue') : null;
          var hm = kid(tcPr, 'hMerge');
          if (hm && attr(hm, 'val') !== 'restart' && row.cells.length) { row.cells[row.cells.length - 1].span += span; col += span; return; }
          var types = ['wholeTable'];
          if (!lk.noHBand && band >= 0 && !(lk.firstRow && ri === 0) && !(lk.lastRow && last)) types.push(band % 2 === 0 ? 'band1Horz' : 'band2Horz');
          if (lk.firstCol && col === 0) types.push('firstCol');
          if (lk.lastCol && ci === tcs.length - 1) types.push('lastCol');
          if (lk.firstRow && (ri === 0 || row.header)) types.push('firstRow');
          if (lk.lastRow && last && ri > 0) types.push('lastRow');
          var layer = { p: Object.assign({}, st.p), r: Object.assign({}, st.r) }, condTc = { borders: {} };
          types.forEach(function (ty) {
            var c = st.cond[ty];
            if (!c) return;
            Object.assign(layer.p, c.p); Object.assign(layer.r, c.r);
            if (c.tc.shd !== undefined) condTc.shd = c.tc.shd;
            Object.assign(condTc.borders, c.tc.borders);
          });
          var direct = tcProps(tcPr, { borders: {} });
          var fill = direct.shd !== undefined ? direct.shd : condTc.shd !== undefined ? condTc.shd : st.tc.shd !== undefined ? st.tc.shd : tableShd;
          var va = attr(kid(tcPr, 'vAlign'), 'val');
          row.cells.push({
            col: col, span: span, vmerge: vmerge, fill: fill || null, valign: va === 'center' ? 'center' : va === 'bottom' ? 'bottom' : 'top',
            own: Object.assign({}, condTc.borders, direct.borders), mar: Object.assign({}, mar, margins(kid(tcPr, 'tcMar'))),
            blocks: vmerge === 'continue' ? [] : parseBlocks(tc, part, layer), spanRows: 1
          });
          col += span;
        });
        t.ncols = Math.max(t.ncols, col);
        t.rows.push(row);
      });
      /* Vertical merges: link each continuation to the cell above. */
      t.rows.forEach(function (row, ri) {
        row.cells.forEach(function (c) {
          if (c.vmerge !== 'continue') return;
          var above = ri ? t.rows[ri - 1].cells.filter(function (x) { return x.col === c.col; })[0] : null;
          if (!above || !(above.vmerge === 'restart' || above.origin)) { c.vmerge = null; return; }
          var origin = above.origin || above;
          origin.spanRows++;
          above.mergedBelow = true;
          c.origin = origin;
        });
      });
      /* Resolve each cell's four edges from its own borders and the table's. */
      var nrows = t.rows.length;
      t.rows.forEach(function (row, ri) {
        row.cells.forEach(function (c) {
          var o = c.own, pick = function (k, outer, inner) { return o[k] !== undefined ? o[k] : outer ? (tb[k] !== undefined ? tb[k] : null) : (tb[inner] !== undefined ? tb[inner] : null); };
          var lastRow = ri + (c.spanRows || 1) - 1 >= nrows - 1;
          c.edges = { top: pick('top', ri === 0, 'insideH'), bottom: pick('bottom', lastRow || ri === nrows - 1, 'insideH'),
            left: pick('left', c.col === 0, 'insideV'), right: pick('right', c.col + c.span >= t.ncols, 'insideV') };
        });
      });
      return t;
    }

    /* --- sections --- */
    function parseSect(sp) {
      var s = { type: 'nextPage', hdr: {}, ftr: {}, titlePg: false };
      if (!sp) return s;
      var n;
      if ((n = kid(sp, 'type'))) s.type = attr(n, 'val') || 'nextPage';
      if ((n = kid(sp, 'pgSz'))) { s.w = measure(attr(n, 'w')); s.h = measure(attr(n, 'h')); }
      if ((n = kid(sp, 'pgMar'))) s.mar = { t: measure(attr(n, 'top')), r: measure(attr(n, 'right')), b: measure(attr(n, 'bottom')), l: measure(attr(n, 'left')),
        header: measure(attr(n, 'header')), footer: measure(attr(n, 'footer')), gutter: measure(attr(n, 'gutter')) || 0 };
      s.titlePg = !!onOff(kid(sp, 'titlePg'));
      kids(sp, 'headerReference').forEach(function (h) { s.hdr[attr(h, 'type') || 'default'] = attrP(h, 'r', 'id'); });
      kids(sp, 'footerReference').forEach(function (h) { s.ftr[attr(h, 'type') || 'default'] = attrP(h, 'r', 'id'); });
      if ((n = kid(sp, 'cols')) && parseInt(attr(n, 'num'), 10) > 1) { s.cols = parseInt(attr(n, 'num'), 10); D.stats.columns = true; }
      if ((n = kid(sp, 'pgNumType')) && attr(n, 'start') !== null) s.pgStart = parseInt(attr(n, 'start'), 10);
      return s;
    }
    var hfCache = {};
    function hfBlocks(rid) {
      var rel = rid ? relsOf(P.mainPath)[rid] : null;
      if (!rel || !P.xml[rel.target]) return null;
      if (!hfCache[rel.target]) { D.fld = []; hfCache[rel.target] = parseBlocks(P.xml[rel.target], rel.target, null); D.fld = []; }
      return hfCache[rel.target];
    }

    /* --- the body --- */
    var body = kid(P.main, 'body');
    if (!body) throw new Error('This Word document has no body text.');
    var sections = [], blocks = [];
    kids(body).forEach(function (n) {
      if (n.localName === 'sectPr') return;
      var sp = parseBlock(n, P.mainPath, null, blocks);
      if (sp) { var s = parseSect(sp); s.blocks = blocks; sections.push(s); blocks = []; }
    });
    var lastSect = parseSect(kid(body, 'sectPr'));
    lastSect.blocks = blocks;
    sections.push(lastSect);
    /* Headers and footers carry on from the previous section unless replaced. */
    var carry = { hdr: {}, ftr: {} };
    sections.forEach(function (s) {
      ['hdr', 'ftr'].forEach(function (k) {
        Object.assign(carry[k], s[k]);
        s[k + 'Blocks'] = {};
        ['default', 'first', 'even'].forEach(function (t) { s[k + 'Blocks'][t] = hfBlocks(carry[k][t]); });
      });
    });
    /* Footnotes and endnotes go at the end, after a short rule. */
    if (D.noteOrder.length) {
      var end = sections[sections.length - 1].blocks;
      var rule = { type: 'p', p: { before: 12, after: 4, bdr: { top: { w: 0.5, color: [0.5, 0.5, 0.5], space: 0 } }, ruleW: 144 }, items: [], mark: runStyle(Object.assign({}, D.defaults.r, { size: 4 })) };
      end.push(rule);
      for (var i = 0; i < D.noteOrder.length; i++) {
        var nt = D.noteOrder[i], root = P.xml[nt.path];
        var el2 = kids(root).filter(function (e) { return attr(e, 'id') === nt.id; })[0];
        if (!el2) continue;
        D.stats.notes++;
        D.noteLabel = nt.label;
        var nb = parseBlocks(el2, nt.path, null);
        D.noteLabel = null;
        nb.forEach(function (b) { if (b.type === 'p' && !b.items.some(function (it) { return it.t === 'text' && it.text === nt.label && it.s.va === 'sup'; }) && b === nb[0]) b.items.unshift({ t: 'text', text: nt.label, s: Object.assign({}, b.mark, { va: 'sup' }) }); });
        append(end, nb);
      }
    }

    var settings = P.settings;
    var tabStop = settings ? measure(attr(kid(settings, 'defaultTabStop'), 'val')) : undefined;
    var title = P.core ? (descendants(P.core, 'title')[0] || {}).textContent : '';
    return {
      sections: sections, images: Array.from(D.images), uni: D.uni, stats: D.stats,
      tabStop: tabStop > 0 ? tabStop : 36, evenOdd: settings ? !!onOff(kid(settings, 'evenAndOddHeaders')) : false,
      title: (title || '').trim(), file: P.file
    };
  }

  function roman(n) {
    if (!(n > 0) || n > 3999) return String(n);
    var out = '', map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    map.forEach(function (m) { while (n >= m[0]) { out += m[1]; n -= m[0]; } });
    return out;
  }
  function letters(n) {
    if (!(n > 0)) return String(n);
    var ch = String.fromCharCode(65 + (n - 1) % 26);
    return Array(Math.floor((n - 1) / 26) + 2).join(ch);
  }

  /* ========================================================================
     Word: layout and drawing
     ======================================================================== */

  function metrics(ln, p, mark) {
    var size = 0, lh = 1.17, img = 0;
    ln.pieces.forEach(function (q) {
      if (q.k === 'img') img = Math.max(img, q.h);
      else if (q.s && q.s.size > size) { size = q.s.size; lh = q.s.lh || 1.17; }
    });
    if (!size) { size = mark.size; lh = mark.lh || 1.17; }
    var nat = size * lh, asc = nat * 0.78, desc = nat - asc, rule = p.lineRule || 'auto', h, base;
    var a = Math.max(asc, img);
    if (rule === 'exact' && p.line) { h = p.line; base = Math.max(asc, h - desc); }
    else if (rule === 'atLeast' && p.line) { h = Math.max(a + desc, p.line); base = h - desc; }
    else { var mult = p.line || 1; h = a + desc + nat * (mult - 1); base = a; }
    ln.h = Math.max(h, size * 0.5, 1);
    ln.base = base;
  }

  function layoutParagraph(env, b, width, skipBefore, skipAfter) {
    var p = b.p, items = [];
    var indL = p.indL || 0, indR = p.indR || 0, first = p.first || 0;
    var right = p.ruleW ? Math.min(width, indL + p.ruleW) : Math.max(indL + 24, width - indR);
    var src = b.items;
    if (b.marker && b.marker.text) {
      var suff = b.marker.suff;
      src = [{ t: 'text', text: b.marker.text, s: b.marker.s }].concat(
        suff === 'nothing' ? [] : suff === 'space' ? [{ t: 'text', text: ' ', s: b.marker.s }] : [{ t: 'tab', s: b.marker.s }], src);
    }
    var tabs = (p.tabs || []).slice();
    if (first < 0) tabs.push({ pos: indL, val: 'left' });
    tabs.sort(function (a, c) { return a.pos - c.pos; });
    var lines = breakLines(atomsOf(env, src, right - indL), { first: indL + first, rest: indL, right: right, tabs: tabs, step: env.tabStop, book: env.book });
    if (lines.length > 1 && !lines[lines.length - 1].pieces.length && lines[lines.length - 2].end === 'page') lines.pop();
    lines.forEach(function (ln) { metrics(ln, p, b.mark); });
    var bd = p.bdr || {};
    var para = { p: p, left: indL, right: right, keepNext: !!p.keepNext, deco: !!(p.shd || bd.top || bd.bottom || bd.left || bd.right) };
    if (p.pageBreakBefore) items.push({ kind: 'pagebefore' });
    var before = skipBefore ? 0 : (p.before || 0), after = skipAfter ? 0 : (p.after || 0);
    if (before) items.push({ kind: 'space', h: before, para: para });
    if (bd.top) items.push({ kind: 'pad', h: bd.top.space + bd.top.w + 1, para: para, first: true });
    lines.forEach(function (ln, i) {
      items.push({ kind: 'line', h: ln.h, line: ln, para: para, first: i === 0 && !bd.top, last: i === lines.length - 1 && !bd.bottom, pageAfter: ln.end === 'page', lead: i === 0 });
    });
    if (bd.bottom) items.push({ kind: 'pad', h: bd.bottom.space + bd.bottom.w + 1, para: para, last: true });
    if (after) items.push({ kind: 'space', h: after, para: para });
    return items;
  }

  function layoutBlocks(env, blocks, width) {
    var items = [];
    blocks.forEach(function (b, i) {
      if (b.type === 'p') {
        var prev = blocks[i - 1], next = blocks[i + 1];
        var skipB = b.p.contextual && prev && prev.type === 'p' && prev.styleId === b.styleId;
        var skipA = b.p.contextual && next && next.type === 'p' && next.styleId === b.styleId;
        append(items, layoutParagraph(env, b, width, skipB, skipA));
      } else if (b.type === 'table') append(items, layoutTable(env, b, width));
      else if (b.type === 'break') items.push({ kind: 'break' });
    });
    /* Keep headings with what follows, and at least two lines of a paragraph together. */
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.kind !== 'line' || !it.lead) continue;
      var need = it.h;
      if (items[i + 1] && items[i + 1].kind === 'line' && items[i + 1].para === it.para) need += items[i + 1].h;
      if (it.para.keepNext) {
        var j = i, h = 0;
        while (j < items.length && items[j].para === it.para) { h += items[j].h || 0; j++; }
        while (j < items.length && items[j].kind === 'space') { h += items[j].h; j++; }
        if (items[j] && (items[j].kind === 'line' || items[j].kind === 'row')) h += items[j].h;
        need = Math.max(need, h);
      }
      it.keepH = need;
    }
    return items;
  }

  function layoutTable(env, t, width) {
    var n = Math.max(1, t.ncols), cols = [], i;
    for (i = 0; i < n; i++) cols.push(t.grid[i] > 0 ? t.grid[i] : 0);
    var known = cols.filter(function (v) { return v > 0; });
    var avail = Math.max(36, width - Math.max(0, t.ind || 0));
    if (!known.length) {
      var total0 = t.width && t.width.pct ? avail * Math.min(1, t.width.pct) : t.width && t.width.pt ? Math.min(t.width.pt, avail) : avail;
      cols = cols.map(function () { return total0 / n; });
    } else if (known.length < n) {
      var avg = sum(known) / known.length;
      cols = cols.map(function (v) { return v || avg; });
    }
    var total = sum(cols);
    if (total > avail + 0.5) { var k = avail / total; cols = cols.map(function (v) { return v * k; }); total = avail; }
    var xoff = t.jc === 'center' ? (width - total) / 2 : t.jc === 'right' ? width - total : Math.max(0, Math.min(t.ind || 0, width - total));
    var cx = [xoff];
    cols.forEach(function (v, c) { cx.push(cx[c] + v); });
    var T = { headerRows: [] };
    var rows = t.rows.map(function (r, ri) {
      var cells = [];
      r.cells.forEach(function (c) {
        if (c.col >= n) return;
        var a = c.col, z = Math.min(c.col + c.span, n), x = cx[a], w = cx[z] - x, m = c.mar;
        var items = c.vmerge === 'continue' ? [] : layoutBlocks(env, c.blocks, Math.max(6, w - m.l - m.r));
        cells.push({ c: c, x: x, w: w, m: m, items: items, ch: sum(items, function (it) { return it.h || 0; }) + m.t + m.b, b: c.edges || {} });
      });
      var h = 0;
      cells.forEach(function (cl) { if (cl.c.vmerge !== 'continue' && !(cl.c.spanRows > 1)) h = Math.max(h, cl.ch); });
      if (r.height) h = r.hRule === 'exact' ? r.height : Math.max(h, r.height);
      var item = { kind: 'row', h: Math.max(h, 2), cells: cells, T: T, header: r.header && ri === T.headerRows.length };
      if (item.header) T.headerRows.push(item);
      return item;
    });
    rows.forEach(function (row, ri) {
      row.cells.forEach(function (cl) {
        var span = cl.c.spanRows || 1;
        if (span < 2) return;
        var end = Math.min(rows.length, ri + span), have = 0, k2;
        for (k2 = ri; k2 < end; k2++) have += rows[k2].h;
        if (cl.ch > have) rows[end - 1].h += cl.ch - have;
      });
    });
    rows.forEach(function (row, ri) {
      var group = 1;
      row.cells.forEach(function (cl) {
        var span = cl.c.spanRows || 1, end = Math.min(rows.length, ri + span);
        group = Math.max(group, span);
        cl.fullH = 0;
        for (var k3 = ri; k3 < end; k3++) cl.fullH += rows[k3].h;
      });
      if (group > 1) { var g = 0; for (var k4 = ri; k4 < Math.min(rows.length, ri + group); k4++) g += rows[k4].h; row.keepH = g; }
      else if (row.header && rows[ri + 1]) row.keepH = row.h + rows[ri + 1].h;
    });
    return rows;
  }

  /* Split a row taller than the space left, at line boundaries in each cell. */
  function splitRow(row, avail) {
    if (!row.cells.some(function (cl) { return cl.items.length; })) return null;
    var ks = row.cells.map(function (cl) {
      var room = avail - cl.m.t - cl.m.b, used = 0, k = 0;
      while (k < cl.items.length && used + (cl.items[k].h || 0) <= room + 0.01) { used += cl.items[k].h || 0; k++; }
      return k;
    });
    if (ks.every(function (k, i) { return k === 0 || !row.cells[i].items.length; }) || ks.every(function (k) { return k === 0; })) {
      ks = row.cells.map(function (cl) { return cl.items.length ? 1 : 0; });
    }
    var a = { kind: 'row', T: row.T, cells: [], split: true }, b = { kind: 'row', T: row.T, cells: [], split: true };
    row.cells.forEach(function (cl, i) {
      var head = cl.items.slice(0, ks[i]), rest = cl.items.slice(ks[i]);
      while (rest.length && rest[0].kind === 'space') rest.shift();
      a.cells.push(Object.assign({}, cl, { items: head, ch: sum(head, function (it) { return it.h || 0; }) + cl.m.t + cl.m.b }));
      b.cells.push(Object.assign({}, cl, { items: rest, ch: sum(rest, function (it) { return it.h || 0; }) + cl.m.t + cl.m.b }));
    });
    a.h = Math.max(avail, Math.max.apply(null, a.cells.map(function (c) { return c.ch; })));
    b.h = Math.max(2, Math.max.apply(null, b.cells.map(function (c) { return c.ch; })));
    a.cells.forEach(function (c) { c.fullH = a.h; });
    b.cells.forEach(function (c) { c.fullH = b.h; });
    return [a, b];
  }

  function drawRow(env, page, row, x0, top) {
    var L = env.L;
    row.cells.forEach(function (cl) {
      if (cl.c.fill) page.drawRectangle({ x: x0 + cl.x, y: top - row.h, width: cl.w, height: row.h, color: rgbOf(L, cl.c.fill) });
    });
    row.cells.forEach(function (cl) {
      if (!cl.items.length) return;
      var full = row.split ? row.h : (cl.fullH || row.h), y = top - cl.m.t;
      if (cl.c.valign === 'center') y -= Math.max(0, (full - cl.ch) / 2);
      else if (cl.c.valign === 'bottom') y -= Math.max(0, full - cl.ch);
      drawItems(env, page, cl.items, x0 + cl.x + cl.m.l, y);
    });
    function line(x1, y1, x2, y2, b) { page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: b.w, color: rgbOf(L, b.color) }); }
    row.cells.forEach(function (cl) {
      var b = cl.b, x1 = x0 + cl.x, x2 = x1 + cl.w, y1 = top, y2 = top - row.h;
      if (b.top && (cl.c.vmerge !== 'continue' || row.split)) line(x1, y1, x2, y1, b.top);
      if (b.bottom && (!cl.c.mergedBelow || row.split)) line(x1, y2, x2, y2, b.bottom);
      if (b.left) line(x1, y1, x1, y2, b.left);
      if (b.right) line(x2, y1, x2, y2, b.right);
    });
  }

  function decorate(env, page, para, group) {
    var L = env.L, p = para.p, bd = p.bdr || {};
    var first = group[0], last = group[group.length - 1];
    var top = first.y, bottom = last.y - (last.it.h || 0);
    var x1 = first.x + para.left - (bd.left ? bd.left.space + bd.left.w : 0);
    var x2 = first.x + para.right + (bd.right ? bd.right.space + bd.right.w : 0);
    if (p.shd) page.drawRectangle({ x: x1, y: bottom, width: x2 - x1, height: top - bottom, color: rgbOf(L, p.shd) });
    function line(ax, ay, bx, by, b) { page.drawLine({ start: { x: ax, y: ay }, end: { x: bx, y: by }, thickness: b.w, color: rgbOf(L, b.color) }); }
    if (bd.top && group.some(function (e) { return e.it.first; })) line(x1, top - bd.top.w / 2, x2, top - bd.top.w / 2, bd.top);
    if (bd.bottom && group.some(function (e) { return e.it.last; })) line(x1, bottom + bd.bottom.w / 2, x2, bottom + bd.bottom.w / 2, bd.bottom);
    if (bd.left) line(x1, top, x1, bottom, bd.left);
    if (bd.right) line(x2, top, x2, bottom, bd.right);
  }

  function drawPlaced(env, page, placed) {
    for (var i = 0; i < placed.length;) {
      var para = placed[i].it.para;
      if (!para || !para.deco) { i++; continue; }
      var j = i;
      while (j + 1 < placed.length && placed[j + 1].it.para === para) j++;
      decorate(env, page, para, placed.slice(i, j + 1));
      i = j + 1;
    }
    placed.forEach(function (e) {
      if (e.it.kind === 'line') drawLine(env, page, e.it.line, e.x, e.y, e.it.para.p.jc, e.it.para.right);
      else if (e.it.kind === 'row') drawRow(env, page, e.it, e.x, e.y);
    });
  }

  function drawItems(env, page, items, x, top) {
    var placed = [], y = top;
    items.forEach(function (it) {
      if (it.kind === 'line' || it.kind === 'row' || it.kind === 'pad') placed.push({ it: it, x: x, y: y });
      if (it.kind !== 'break') y -= it.h || 0;
    });
    drawPlaced(env, page, placed);
    return top - y;
  }

  function geometry(s, paper) {
    var w = s.w, h = s.h, size;
    if (paper === 'doc' && w > 36 && h > 36) size = [w, h];
    else {
      var base = PAPER[paper === 'doc' ? regionPaper() : paper];
      size = w && h && w > h ? [base[1], base[0]] : base.slice();
    }
    var m = s.mar || {};
    var g = {
      pw: size[0], ph: size[1],
      mt: m.t !== undefined ? Math.abs(m.t) : 72, mb: m.b !== undefined ? Math.abs(m.b) : 72,
      ml: (m.l !== undefined ? m.l : 72) + (m.gutter || 0), mr: m.r !== undefined ? m.r : 72,
      hd: m.header !== undefined ? m.header : 36, fd: m.footer !== undefined ? m.footer : 36
    };
    if (g.pw - g.ml - g.mr < 72) g.ml = g.mr = Math.max(18, (g.pw - 72) / 2);
    if (g.ph - g.mt - g.mb < 72) g.mt = g.mb = Math.max(18, (g.ph - 72) / 2);
    g.cw = g.pw - g.ml - g.mr;
    return g;
  }

  function paginate(env, sections) {
    var pages = [], pg = null, y = 0, bottom = 0, g = null, sect = null, real = 0;
    function newPage() {
      pg = { sect: sect, g: g, placed: [] };
      pages.push(pg);
      y = g.ph - g.bodyTop;
      bottom = g.bodyBottom;
      real = 0;
    }
    function put(it, x) { pg.placed.push({ it: it, x: x, y: y }); y -= it.h || 0; if (it.kind !== 'pad') real++; }
    function fits(h) { return y - h >= bottom - 0.01; }
    function header(row, x) { if (!row.header && row.T.headerRows.length) row.T.headerRows.forEach(function (h) { if (fits(h.h)) put(h, x); }); }
    function placeRow(row, x, depth) {
      var full = g.ph - g.bodyTop - g.bodyBottom;
      if (real && !fits(Math.min(row.keepH || row.h, full))) { newPage(); header(row, x); }
      if (!fits(row.h) && depth < 200) {
        var parts = splitRow(row, y - bottom);
        if (parts) { put(parts[0], x); newPage(); header(row, x); placeRow(parts[1], x, depth + 1); return; }
      }
      put(row, x);
    }
    sections.forEach(function (s) {
      sect = s; g = s.g;
      if (!pg || s.type !== 'continuous' || Math.abs(pg.g.pw - g.pw) > 1 || Math.abs(pg.g.ph - g.ph) > 1) { newPage(); pg.sectStart = true; }
      var items = layoutBlocks(env, s.blocks, g.cw), x = g.ml;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.kind === 'break') { newPage(); continue; }
        if (it.kind === 'space') { if (real) y = Math.max(bottom, y - it.h); continue; }
        if (it.kind === 'pagebefore') { if (real) newPage(); continue; }
        if (it.kind === 'row') { placeRow(it, x, 0); continue; }
        var need = Math.min(it.keepH || it.h, g.ph - g.bodyTop - g.bodyBottom);
        if (real && !fits(need)) newPage();
        put(it, x);
        if (it.pageAfter) newPage();
      }
    });
    return pages;
  }

  function sniffImage(b) {
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E) return 'png';
    if (b[0] === 0xFF && b[1] === 0xD8) return 'jpg';
    if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'gif';
    if (b[0] === 0x42 && b[1] === 0x4D) return 'bmp';
    if (b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45) return 'webp';
    if ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2A) || (b[0] === 0x4D && b[1] === 0x4D && b[3] === 0x2A)) return 'tif';
    if (b[0] === 0x01 && b[1] === 0 && b[2] === 0 && b[3] === 0) return 'emf';
    if ((b[0] === 0xD7 && b[1] === 0xCD) || (b[0] === 1 && b[1] === 0 && b[2] === 9)) return 'wmf';
    var head = '';
    for (var i = 0; i < Math.min(300, b.length); i++) head += String.fromCharCode(b[i]);
    return /<svg|<\?xml/i.test(head) ? 'svg' : null;
  }
  function rasterise(bytes, kind) {
    var type = { gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml', tif: 'image/tiff' }[kind];
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(new Blob([bytes], { type: type })), img = new Image();
      img.onload = function () {
        try {
          var k = kind === 'svg' ? 2 : 1, w = (img.naturalWidth || 300) * k, h = (img.naturalHeight || 150) * k;
          var f = Math.min(1, 4000 / Math.max(w, h)), c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(w * f)); c.height = Math.max(1, Math.round(h * f));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          c.toBlob(function (bl) { if (!bl) resolve(null); else bl.arrayBuffer().then(function (a) { resolve(new Uint8Array(a)); }, function () { resolve(null); }); }, 'image/png');
        } catch (e) { resolve(null); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }
  async function embedImage(doc, bytes) {
    var kind = sniffImage(bytes);
    try {
      if (kind === 'png') return await doc.embedPng(bytes);
      if (kind === 'jpg') return await doc.embedJpg(bytes);
    } catch (e) { /* fall back to the browser's decoder */ }
    if (!kind || kind === 'emf' || kind === 'wmf') return null;
    try { var png = await rasterise(bytes, kind); return png ? await doc.embedPng(png) : null; } catch (e) { return null; }
  }

  async function wordToPdf(model, o, report, alive) {
    var L = await libPdf();
    var doc = await L.PDFDocument.create();
    doc.setTitle(model.title || o.name);
    doc.setProducer('All The Tools');
    doc.setCreator('All The Tools');
    var book = new FontBook(L, doc);
    if (model.uni) await book.loadUnicode();
    var env = { L: L, doc: doc, book: book, images: {}, tabStop: model.tabStop, missingPics: new Set(), links: [] };
    for (var i = 0; i < model.images.length; i++) {
      if (!alive()) return null;
      report('Adding pictures (' + (i + 1) + ' of ' + model.images.length + ')…', 0.1 + 0.3 * i / model.images.length);
      var f = model.file(model.images[i]);
      env.images[model.images[i]] = f ? await embedImage(doc, await f.async('uint8array')) : null;
    }
    report('Laying out pages…', 0.45);
    await new Promise(function (r) { setTimeout(r, 0); });
    if (!alive()) return null;
    /* Page geometry, making room for headers and footers taller than the margin. */
    model.sections.forEach(function (s) {
      var g = s.g = geometry(s, o.paper);
      env.maxH = g.ph - g.mt - g.mb;
      env.fields = { PAGE: 99, NUMPAGES: 99 };
      var hh = 0, fh = 0;
      ['default', 'first', 'even'].forEach(function (t) {
        if (s.hdrBlocks[t]) hh = Math.max(hh, sum(layoutBlocks(env, s.hdrBlocks[t], g.cw), function (it) { return it.h || 0; }));
        if (s.ftrBlocks[t]) fh = Math.max(fh, sum(layoutBlocks(env, s.ftrBlocks[t], g.cw), function (it) { return it.h || 0; }));
      });
      env.fields = null;
      g.bodyTop = Math.max(g.mt, hh ? g.hd + hh + 4 : 0);
      g.bodyBottom = Math.max(g.mb, fh ? g.fd + fh + 4 : 0);
      if (g.ph - g.bodyTop - g.bodyBottom < 72) { g.bodyTop = g.mt; g.bodyBottom = g.mb; }
    });
    env.maxH = Math.min.apply(null, model.sections.map(function (s) { return s.g.ph - s.g.bodyTop - s.g.bodyBottom; }));
    var pages = paginate(env, model.sections);
    var num = 0;
    for (i = 0; i < pages.length; i++) {
      if (!alive()) return null;
      if (i % 5 === 0) { report('Drawing page ' + (i + 1) + ' of ' + pages.length + '…', 0.5 + 0.45 * i / pages.length); await new Promise(function (r) { setTimeout(r, 0); }); }
      var pg = pages[i], s = pg.sect, g = pg.g;
      num = pg.sectStart && s.pgStart >= 0 ? s.pgStart : num + 1;
      var page = doc.addPage([g.pw, g.ph]);
      env.fields = { PAGE: num, NUMPAGES: pages.length };
      var kind = pg.sectStart && s.titlePg ? 'first' : model.evenOdd && num % 2 === 0 ? 'even' : 'default';
      var hb = s.hdrBlocks[kind], fb = s.ftrBlocks[kind];
      if (hb) drawItems(env, page, layoutBlocks(env, hb, g.cw), g.ml, g.ph - g.hd);
      if (fb) { var its = layoutBlocks(env, fb, g.cw); drawItems(env, page, its, g.ml, g.fd + sum(its, function (it) { return it.h || 0; })); }
      env.fields = null;
      drawPlaced(env, page, pg.placed);
      addLinks(env, page);
    }
    book.finish();
    report('Saving the PDF…', 0.97);
    var bytes = await doc.save();
    return { blob: new Blob([bytes], { type: 'application/pdf' }), bytes: bytes, pages: pages.length, missingPics: env.missingPics.size, missingChars: Array.from(book.missing), uniError: book.uniError };
  }

  /* ========================================================================
     Shared UI pieces
     ======================================================================== */

  async function showPreview(host, bytes, alive) {
    host.replaceChildren(U.note('Drawing the preview…'));
    var pdf = null;
    try {
      pdf = await PK().openPdfjs(bytes);
      var n = Math.min(pdf.numPages, PREVIEW_MAX), grid = el('div', { class: 'po-pages' });
      for (var i = 1; i <= n; i++) {
        if (!alive()) return;
        var pg = await pdf.getPage(i), base = pg.getViewport({ scale: 1 });
        var vp = pg.getViewport({ scale: Math.min(2, 420 / base.width) });
        var c = el('canvas', { width: Math.ceil(vp.width), height: Math.ceil(vp.height) });
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        await pg.render({ canvasContext: ctx, viewport: vp }).promise;
        pg.cleanup();
        grid.appendChild(el('figure', { class: 'po-page' }, c, el('figcaption', { text: 'Page ' + i })));
        if (i === 1) host.replaceChildren(grid);
      }
      if (pdf.numPages > n) host.appendChild(U.note('Showing the first ' + n + ' of ' + pdf.numPages + ' pages.'));
    } catch (e) {
      if (alive()) host.replaceChildren(U.note('The preview could not be drawn (' + (e.message || e) + '). The PDF itself is fine to download.', 'err'));
    } finally { if (pdf) PK().closePdf(pdf); }
  }

  function resultPanel(o) {
    var dl = U.button('Download PDF', function () { U.saveBlob(o.filename, o.blob); }, 'primary');
    var prev = el('div');
    var panel = U.panel('Your PDF',
      el('div', { class: 'stack' },
        el('div', { class: 'po-ok', text: '✓ ' + plural(o.pages, 'page') + ' · ' + kb(o.blob.size) }),
        o.stats ? U.stats(o.stats) : null,
        U.btnrow(dl),
        o.notes && o.notes.length ? el('ul', { class: 'po-notes' }, o.notes.map(function (t) { return el('li', { text: t }); })) : null,
        prev));
    panel.dataset.pages = String(o.pages);
    return { node: panel, preview: prev };
  }

  function about(paras) {
    return U.panel('What carries over', el('div', { class: 'po-about' }, paras.map(function (p) {
      return el('p', null, el('b', { text: p[0] + ' ' }), p[1]);
    })));
  }

  function fileLine(info, file, extra) {
    info.replaceChildren(el('span', { text: file.name }), el('span', { class: 'muted', text: kb(file.size) + (extra ? ' · ' + extra : '') }));
  }

  /* ========================================================================
     Word to PDF
     ======================================================================== */

  var WORD_ACCEPT = '.docx,.docm,.dotx,.dotm,.doc,.odt,.rtf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-word.document.macroEnabled.12,application/msword';

  Tools.register({
    id: 'word-to-pdf', category: 'pdf', name: 'Word to PDF',
    description: 'Turn a Word document (.docx) into a PDF, keeping its headings, formatting, lists, tables, pictures, headers and footers. Nothing is uploaded.',
    keywords: ['word to pdf', 'docx to pdf', 'doc to pdf', 'convert word', 'microsoft word', 'save as pdf', 'document to pdf', 'office', 'print'],
    render: function (root) {
      root.classList.add('g-pdfo');
      var state = { file: null, model: null, job: 0, dead: false };
      U.onTeardown(root, function () { state.dead = true; state.job++; });

      var info = el('div', { class: 'po-file' });
      var status = U.note('');
      var zone = U.dropzone({ accept: WORD_ACCEPT, label: 'Drop a Word document here or click to choose',
        hint: '.docx files. It is converted on this device; nothing is uploaded.', onFiles: function (f) { open(f[0]); } });
      var again = U.button('Choose another document', function () { zone.querySelector('input').click(); }, 'ghost');
      again.style.display = 'none';
      var paper = U.select({ label: 'Paper size', value: 'doc', options: [
        { value: 'doc', label: 'As in the document' }, { value: 'A4', label: 'A4 (210 × 297 mm)' }, { value: 'Letter', label: 'US Letter (8.5 × 11 in)' }] });
      paper.querySelector('select').dataset.k = 'paper';
      paper.querySelector('select').addEventListener('change', function () { if (state.model) convert(); });
      var result = el('div', { class: 'stack' });

      root.appendChild(U.panel(null, zone, el('div', { class: 'row', style: { alignItems: 'center' } }, info, again), status));
      root.appendChild(U.panel('Page setup', el('div', { class: 'po-opts' }, paper),
        U.note('"As in the document" uses each section\'s own page size and margins. Choosing A4 or Letter keeps the margins and the page orientation.')));
      root.appendChild(result);
      root.appendChild(about([
        ['Kept:', 'headings, paragraph and character formatting (bold, italic, underline, strikethrough, colours, highlighting, sizes), alignment, indents and spacing, bulleted and numbered lists, tables with borders, shading and merged cells, pictures, page breaks and sections, headers and footers with page numbers, footnotes, and links.'],
        ['Close, not exact:', 'text is set in the standard PDF typefaces (Helvetica, Times or Courier, whichever is nearest each font), so lines can break in slightly different places than in Word. Characters those typefaces lack are drawn in DejaVu Sans.'],
        ['Not supported:', 'text boxes and shapes (their text is kept but placed after the paragraph they belong to), charts, SmartArt, the layout of equations (their text is kept), comments, tracked-change markings (the final text is shown), multiple columns, right-to-left text, and pictures in EMF or WMF format. Footnotes and endnotes are gathered at the end. Fields such as a table of contents show the text Word last saved.'],
        ['Older files:', 'Word 97–2003 .doc files can\'t be read. Save them as .docx first.']
      ]));

      async function open(file) {
        if (!file) return;
        var job = ++state.job;
        state.model = null;
        result.replaceChildren();
        status.className = 'note';
        status.textContent = 'Reading ' + file.name + '…';
        try {
          var bytes = new Uint8Array(await U.readAs(file));
          var model = await loadDocx(bytes);
          if (job !== state.job) return;
          state.file = file;
          state.model = model;
          var s0 = model.sections[0];
          var sizeName = s0.w && s0.h ? describeSize(s0.w, s0.h) : null;
          paper.querySelector('option[value=doc]').textContent = 'As in the document' + (sizeName ? ' (' + sizeName + ')' : '');
          fileLine(info, file);
          status.textContent = '';
          zone.style.display = 'none';
          again.style.display = '';
          convert();
        } catch (e) {
          if (job !== state.job) return;
          status.className = 'note err';
          status.textContent = e.message || String(e);
          zone.style.display = '';
          again.style.display = 'none';
          info.replaceChildren();
        }
      }

      async function convert() {
        var job = ++state.job, model = state.model, file = state.file;
        var alive = function () { return job === state.job && !state.dead; };
        var prog = U.progress();
        result.replaceChildren(U.panel(null, prog));
        prog.set('Starting…', 0.05);
        try {
          var out = await wordToPdf(model, { paper: paper.querySelector('select').value, name: baseName(file.name) }, function (t, f) { if (alive()) prog.set(t, f); }, alive);
          if (!out || !alive()) return;
          prog.done('');
          var st = model.stats, notes = [];
          if (out.missingPics) notes.push(plural(out.missingPics, 'picture') + ' in a format a browser can\'t draw (such as EMF or WMF) ' + (out.missingPics === 1 ? 'is' : 'are') + ' shown as a grey box.');
          if (st.textboxes) notes.push('Text from ' + plural(st.textboxes, 'text box', 'text boxes') + ' is placed after the paragraph ' + (st.textboxes === 1 ? 'it belongs' : 'they belong') + ' to.');
          if (st.charts) notes.push(plural(st.charts, 'chart') + ' left out.');
          if (st.smartart) notes.push(plural(st.smartart, 'SmartArt graphic') + ' left out.');
          if (st.shapes) notes.push(plural(st.shapes, 'drawn shape') + ' left out.');
          if (st.math) notes.push(plural(st.math, 'equation') + ' shown as plain text.');
          if (st.notes) notes.push((st.notes === 1 ? 'The footnote is' : 'Footnotes and endnotes are') + ' gathered at the end of the document.');
          if (st.columns) notes.push('Text set in columns is shown in a single column.');
          if (out.missingChars.length) notes.push('Some characters couldn\'t be drawn and show as "?": ' + out.missingChars.slice(0, 12).join(' ') + (out.uniError ? ' (the extra font didn\'t load: ' + out.uniError.message + ')' : ''));
          var view = resultPanel({ blob: out.blob, pages: out.pages, filename: baseName(file.name) + '.pdf', notes: notes, stats: [
            { label: 'pages', value: String(out.pages) }, { label: 'paragraphs', value: String(st.paragraphs) },
            { label: 'tables', value: String(st.tables) }, { label: 'pictures', value: String(st.pictures) }] });
          result.replaceChildren(view.node);
          showPreview(view.preview, out.bytes, alive);
        } catch (e) {
          if (!alive()) return;
          console.warn(e);
          result.replaceChildren(U.panel(null, U.note('Could not make the PDF: ' + (e.message || e), 'err')));
        }
      }
    }
  });

  function describeSize(w, h) {
    var a = Math.min(w, h), b = Math.max(w, h), land = w > h ? ' landscape' : '';
    if (Math.abs(a - 595.3) < 3 && Math.abs(b - 841.9) < 3) return 'A4' + land;
    if (Math.abs(a - 612) < 3 && Math.abs(b - 792) < 3) return 'US Letter' + land;
    if (Math.abs(a - 612) < 3 && Math.abs(b - 1008) < 3) return 'US Legal' + land;
    if (Math.abs(a - 419.5) < 3 && Math.abs(b - 595.3) < 3) return 'A5' + land;
    if (Math.abs(a - 841.9) < 3 && Math.abs(b - 1190.6) < 3) return 'A3' + land;
    return Math.round(w / 72 * 25.4) + ' × ' + Math.round(h / 72 * 25.4) + ' mm';
  }

  /* ========================================================================
     Excel to PDF
     ======================================================================== */

  var SHEET_ACCEPT = '.xlsx,.xlsm,.xlsb,.xls,.ods,.csv,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.oasis.opendocument.spreadsheet,text/csv,text/tab-separated-values';
  var XL = { ml: 50, mr: 50, mt: 54, mb: 54, pad: 3, font: 9.5, maxCells: 600000 };
  var NUMERIC = /^[-+(]?[£$€¥]?\s?[\d.,]*\d[\d.,]*\s?%?\)?$/;

  function cellText(cell) {
    if (!cell) return '';
    if (cell.w !== undefined && cell.w !== null) return String(cell.w);
    if (cell.v === undefined || cell.v === null) return '';
    if (cell.t === 'b') return cell.v ? 'TRUE' : 'FALSE';
    if (cell.v instanceof Date) return cell.v.toLocaleDateString('en-GB');
    return String(cell.v);
  }
  function cellFill(cell) {
    var s = cell && cell.s;
    if (!s || s.patternType !== 'solid' || !s.fgColor || !s.fgColor.rgb) return null;
    var rgb = String(s.fgColor.rgb).slice(-6);
    return /^f{6}$/i.test(rgb) ? null : hexColour(rgb);
  }

  function sheetData(X, wb, name, csv) {
    var ws = wb.Sheets[name];
    if (!ws || !ws['!ref']) return null;
    var minR = Infinity, maxR = -1, minC = Infinity, maxC = -1;
    Object.keys(ws).forEach(function (k) {
      if (k[0] === '!') return;
      var cell = ws[k];
      if (!cell || (cellText(cell) === '' && !cellFill(cell))) return;
      var a = X.utils.decode_cell(k);
      if (a.r < minR) minR = a.r;
      if (a.r > maxR) maxR = a.r;
      if (a.c < minC) minC = a.c;
      if (a.c > maxC) maxC = a.c;
    });
    if (maxR < 0) return null;
    var cinfo = ws['!cols'] || [], rinfo = ws['!rows'] || [], cols = [], rows = [], r, c;
    for (c = minC; c <= maxC; c++) if (!(cinfo[c] && cinfo[c].hidden)) cols.push(c);
    for (r = minR; r <= maxR; r++) if (!(rinfo[r] && rinfo[r].hidden)) rows.push(r);
    if ((rows.length * cols.length) > XL.maxCells) throw new Error('The sheet "' + name + '" is too large to lay out here (' + rows.length.toLocaleString('en-GB') + ' rows × ' + cols.length + ' columns).');
    var colPos = {}, rowPos = {};
    cols.forEach(function (cc, i) { colPos[cc] = i; });
    rows.forEach(function (rr, i) { rowPos[rr] = i; });
    var origin = {}, covered = {};
    (ws['!merges'] || []).forEach(function (m) {
      var vr = [], vc = [];
      for (r = m.s.r; r <= m.e.r; r++) if (rowPos[r] !== undefined) vr.push(rowPos[r]);
      for (c = m.s.c; c <= m.e.c; c++) if (colPos[c] !== undefined) vc.push(colPos[c]);
      if (!vr.length || !vc.length) return;
      origin[vr[0] + ',' + vc[0]] = { rs: vr.length, cs: vc.length };
      vr.forEach(function (a) { vc.forEach(function (b) { if (a !== vr[0] || b !== vc[0]) covered[a + ',' + b] = vr[0] + ',' + vc[0]; }); });
    });
    var grid = rows.map(function (rr, ri) {
      return cols.map(function (cc, ci) {
        var cell = ws[X.utils.encode_cell({ r: rr, c: cc })], text = cellText(cell).replace(/\r\n?/g, '\n');
        var num = cell && cell.t === 'n' || (csv && NUMERIC.test(text.trim()) && /\d/.test(text));
        return { text: text, align: num ? 'right' : cell && (cell.t === 'b' || cell.t === 'e') ? 'center' : 'left', num: !!num,
          fill: cellFill(cell), merge: origin[ri + ',' + ci] || null, covered: covered[ri + ',' + ci] || null };
      });
    });
    var explicit = cols.map(function (cc) {
      var ci = cinfo[cc];
      if (csv || !ci) return 0;
      if (ci.wpx) return ci.wpx * 0.75;
      if (ci.wch) return (ci.wch * 7 + 5) * 0.75;
      return 0;
    });
    var heights = rows.map(function (rr) { var ri = rinfo[rr]; return ri ? (ri.hpt || (ri.hpx ? ri.hpx * 0.75 : 0)) : 0; });
    return { name: name, rows: grid, explicit: explicit, heights: heights, ncols: cols.length };
  }

  function sheetStyle(size, bold) { return { fam: 'sans', b: !!bold, i: false, size: size, color: null, sq: 1, lh: 1.2 }; }

  function textWidth(env, text, s) {
    var w = 0;
    env.book.shape(text, s).forEach(function (sh) { w += env.book.width({ text: sh.text, f: sh.f, uni: sh.uni, size: s.size, sq: 1 }); });
    return w;
  }
  function wrapCell(env, text, s, width) {
    var lines = [];
    text.split('\n').forEach(function (para) {
      var ls = breakLines(atomsOf(env, [{ t: 'text', text: para, s: s }], width), { first: 0, rest: 0, right: width, tabs: [], step: 36, book: env.book });
      append(lines, ls);
    });
    return lines;
  }

  async function workbookToPdf(X, wb, o, report, alive) {
    var L = await libPdf();
    var doc = await L.PDFDocument.create();
    doc.setTitle(o.name);
    doc.setProducer('All The Tools');
    doc.setCreator('All The Tools');
    var book = new FontBook(L, doc), env = { L: L, doc: doc, book: book, links: null };
    var sheets = [], empty = [];
    o.sheets.forEach(function (n) { var d = sheetData(X, wb, n, o.csv); if (d) sheets.push(d); else empty.push(n); });
    if (!sheets.length) throw new Error(o.sheets.length ? 'The chosen ' + (o.sheets.length === 1 ? 'sheet is' : 'sheets are') + ' empty.' : 'Choose at least one sheet.');
    if (sheets.some(function (sh) { return sh.rows.some(function (r) { return r.some(function (c) { return NON_WIN.test(c.text); }); }); })) await book.loadUnicode();
    var grey = L.rgb(0.75, 0.76, 0.78), soft = L.rgb(0.42, 0.44, 0.48), headFill = [0.93, 0.94, 0.95];
    var pageInfo = [], scales = [];

    for (var si = 0; si < sheets.length; si++) {
      if (!alive()) return null;
      var sh = sheets[si];
      report('Laying out "' + sh.name + '"…', 0.05 + 0.85 * si / sheets.length);
      await new Promise(function (r) { setTimeout(r, 0); });
      var hasHeader = o.header && sh.rows.length > 1;
      var plain = sheetStyle(XL.font), bold = sheetStyle(XL.font, true);
      /* Natural column widths: the spreadsheet's own, or the widest text. */
      var natural = sh.explicit.map(function (w, ci) {
        if (w) return Math.max(w, 12);
        var best = 0, lim = Math.min(sh.rows.length, 3000);
        for (var ri = 0; ri < lim; ri++) {
          var cell = sh.rows[ri][ci];
          if (!cell.text || cell.covered || (cell.merge && cell.merge.cs > 1)) continue;
          var st = hasHeader && ri === 0 ? bold : plain;
          cell.text.split('\n').forEach(function (line) { best = Math.max(best, textWidth(env, line, st)); });
        }
        return Math.min(320, Math.max(24, best + XL.pad * 2 + 2));
      });
      var totalW = sum(natural), size = PAPER[o.paper];
      var land = o.orient === 'landscape' || (o.orient === 'auto' && totalW > size[0] - XL.ml - XL.mr + 1);
      var pw = land ? size[1] : size[0], ph = land ? size[0] : size[1];
      var availW = pw - XL.ml - XL.mr, top = ph - XL.mt, bottom = XL.mb;
      var scale = o.fit ? Math.min(1, availW / totalW) : 1;
      scales.push({ name: sh.name, scale: scale });
      var fs = XL.font * scale, pad = XL.pad * scale, lineH = fs * 1.22;
      var sPlain = sheetStyle(fs), sBold = sheetStyle(fs, true);
      var widths = natural.map(function (w) { return Math.min(w * scale, availW); });
      var bands = [];
      if (o.fit) bands.push(widths.map(function (w, i) { return i; }));
      else {
        var cur = [], used = 0;
        widths.forEach(function (w, i) { if (cur.length && used + w > availW + 0.01) { bands.push(cur); cur = []; used = 0; } cur.push(i); used += w; });
        if (cur.length) bands.push(cur);
      }
      var bw = Math.max(0.3, 0.5 * Math.min(1, scale * 1.4));

      for (var bi = 0; bi < bands.length; bi++) {
        var band = bands[bi], inBand = {}, xs = {}, x = XL.ml;
        band.forEach(function (ci) { inBand[ci] = true; xs[ci] = x; x += widths[ci]; });
        var bandEnd = x;
        /* Lay out each row's cells in this band. */
        var laid = sh.rows.map(function (row, ri) {
          var st = hasHeader && ri === 0 ? sBold : sPlain, h = 0, cells = [];
          band.forEach(function (ci) {
            var cell = row[ci];
            if (cell.covered) {
              var oc = +cell.covered.split(',')[1], orow = +cell.covered.split(',')[0];
              if (orow === ri && inBand[oc]) return;
              cells.push({ ci: ci, cell: cell, w: widths[ci], lines: [], blank: true, orow: orow, ocol: oc });
              return;
            }
            var w = widths[ci];
            if (cell.merge && cell.merge.cs > 1) for (var k = 1; k < cell.merge.cs; k++) if (inBand[ci + k]) w += widths[ci + k];
            var inner = Math.max(2, w - pad * 2), lines = [];
            if (cell.text) {
              if (cell.num && cell.text.indexOf('\n') < 0 && textWidth(env, cell.text, st) > inner) {
                var hw = textWidth(env, '#', st);
                lines = wrapCell(env, Array(Math.max(1, Math.floor(inner / hw)) + 1).join('#'), st, 1e6);
              } else lines = wrapCell(env, cell.text, st, inner);
            }
            cells.push({ ci: ci, cell: cell, w: w, lines: lines, st: st });
            if (!(cell.merge && cell.merge.rs > 1)) h = Math.max(h, lines.length * lineH + pad * 2);
          });
          h = Math.max(h, lineH + pad * 2, (sh.heights[ri] || 0) * scale);
          return { ri: ri, h: h, cells: cells, header: hasHeader && ri === 0 };
        });
        /* Paginate down the rows, repeating the first row if asked. */
        var pagesRows = [], cur2 = null, y;
        var startPage = function () { cur2 = []; pagesRows.push(cur2); y = top; if (hasHeader) { cur2.push({ row: laid[0], y: y }); y -= laid[0].h; } };
        startPage();
        for (var ri2 = hasHeader ? 1 : 0; ri2 < laid.length; ri2++) {
          var lr = laid[ri2];
          if (y - lr.h < bottom - 0.01 && cur2.length > (hasHeader ? 1 : 0)) startPage();
          cur2.push({ row: lr, y: y });
          y -= lr.h;
        }
        if (!hasHeader || laid.length > 1) {
          for (var pi = 0; pi < pagesRows.length; pi++) {
            if (!alive()) return null;
            var page = doc.addPage([pw, ph]);
            pageInfo.push({ page: page, sheet: sh.name, pw: pw, ph: ph, band: bands.length > 1 ? bi + 1 : 0, bands: bands.length });
            drawSheetPage(env, page, pagesRows[pi], xs, laid, { grid: o.grid, bw: bw, grey: grey, headFill: headFill, pad: pad, lineH: lineH, fs: fs, bandEnd: bandEnd });
          }
        }
      }
    }
    /* Running header and page numbers. */
    var total = pageInfo.length, f = book.stdFont('sans', false, false);
    pageInfo.forEach(function (pi2, i) {
      if (!o.titles) return;
      var label = 'Page ' + (i + 1) + ' of ' + total;
      pi2.page.drawText(label, { x: (pi2.pw - f.widthOfTextAtSize(label, 8)) / 2, y: 26, size: 8, font: f, color: soft });
      var name = (o.csv ? o.name : pi2.sheet) + (pi2.bands > 1 ? ' (columns, part ' + pi2.band + ' of ' + pi2.bands + ')' : '');
      var pieces = book.shape(name, sheetStyle(9));
      var x = XL.ml;
      pieces.forEach(function (q) {
        var qq = { k: 't', text: q.text, f: q.f, uni: q.uni, size: 9, sq: 1, s: { color: [0.42, 0.44, 0.48] }, rise: 0 };
        drawText(env, pi2.page, qq, q.text, x, pi2.ph - 32);
        x += book.width(qq);
      });
    });
    book.finish();
    report('Saving the PDF…', 0.96);
    var bytes = await doc.save();
    return { blob: new Blob([bytes], { type: 'application/pdf' }), bytes: bytes, pages: total, empty: empty, scales: scales, sheets: sheets.length, missingChars: Array.from(book.missing) };
  }

  function drawSheetPage(env, page, entries, xs, laid, o) {
    var L = env.L;
    var yOf = {};
    entries.forEach(function (e) { yOf[e.row.ri] = e.y; });
    function spanHeight(ri, rs) {
      var h = 0;
      for (var k = ri; k < ri + rs; k++) { if (yOf[k] === undefined || !laid[k]) break; h += laid[k].h; }
      return h || laid[ri].h;
    }
    /* fills, then text, then grid lines */
    entries.forEach(function (e) {
      var row = e.row;
      row.cells.forEach(function (c) {
        if (c.blank && yOf[c.orow] !== undefined) return;
        var h = c.cell.merge && c.cell.merge.rs > 1 ? spanHeight(row.ri, c.cell.merge.rs) : row.h;
        var fill = c.cell.fill || (row.header ? o.headFill : null);
        if (fill && !c.blank) page.drawRectangle({ x: xs[c.ci], y: e.y - h, width: c.w, height: h, color: rgbOf(L, fill) });
      });
    });
    entries.forEach(function (e) {
      var row = e.row;
      row.cells.forEach(function (c) {
        if (c.blank || !c.lines.length) return;
        c.lines.forEach(function (ln, li) {
          ln.base = o.fs * 0.98;
          drawLine(env, page, ln, xs[c.ci] + o.pad, e.y - o.pad - li * o.lineH, c.cell.align, Math.max(2, c.w - o.pad * 2));
        });
      });
    });
    if (!o.grid) return;
    entries.forEach(function (e) {
      var row = e.row;
      row.cells.forEach(function (c) {
        if (c.blank && yOf[c.orow] !== undefined) return;
        var h = c.cell.merge && c.cell.merge.rs > 1 ? spanHeight(row.ri, c.cell.merge.rs) : row.h;
        page.drawRectangle({ x: xs[c.ci], y: e.y - h, width: c.w, height: h, borderColor: o.grey, borderWidth: o.bw });
      });
    });
  }

  Tools.register({
    id: 'excel-to-pdf', category: 'pdf', name: 'Excel to PDF',
    description: 'Turn an Excel spreadsheet (.xlsx, .xls, .ods or .csv) into a PDF of its tables, with the sheets, paper size and orientation you choose. Nothing is uploaded.',
    keywords: ['excel to pdf', 'xlsx to pdf', 'xls to pdf', 'spreadsheet to pdf', 'csv to pdf', 'ods to pdf', 'print spreadsheet', 'table to pdf', 'sheets'],
    render: function (root) {
      root.classList.add('g-pdfo');
      var state = { file: null, wb: null, X: null, csv: false, job: 0, dead: false };
      U.onTeardown(root, function () { state.dead = true; state.job++; });

      var info = el('div', { class: 'po-file' });
      var status = U.note('');
      var zone = U.dropzone({ accept: SHEET_ACCEPT, label: 'Drop a spreadsheet here or click to choose',
        hint: '.xlsx, .xls, .ods or .csv. It is converted on this device; nothing is uploaded.', onFiles: function (f) { open(f[0]); } });
      var again = U.button('Choose another spreadsheet', function () { zone.querySelector('input').click(); }, 'ghost');
      again.style.display = 'none';

      var sheetBox = el('div', { class: 'po-sheets' });
      var sheetPanel = U.panel('Sheets', sheetBox);
      sheetPanel.style.display = 'none';
      function sel(k, label, value, options) {
        var s = U.select({ label: label, value: value, options: options });
        s.querySelector('select').dataset.k = k;
        s.querySelector('select').addEventListener('change', changed);
        return s;
      }
      var paper = sel('paper', 'Paper size', regionPaper(), [{ value: 'A4', label: 'A4 (210 × 297 mm)' }, { value: 'Letter', label: 'US Letter (8.5 × 11 in)' }]);
      var orient = sel('orient', 'Orientation', 'auto', [{ value: 'auto', label: 'Automatic' }, { value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }]);
      function check(k, label, on) {
        var c = U.checkbox(label, { checked: on });
        c.input.dataset.k = k;
        c.input.addEventListener('change', changed);
        return c;
      }
      var fit = check('fit', 'Fit all columns on the page width', true);
      var grid = check('grid', 'Gridlines', true);
      var header = check('header', 'Repeat the first row on every page', true);
      var titles = check('titles', 'Sheet name and page numbers', true);
      var result = el('div', { class: 'stack' });
      var timer = null;

      root.appendChild(U.panel(null, zone, el('div', { class: 'row', style: { alignItems: 'center' } }, info, again), status));
      root.appendChild(sheetPanel);
      root.appendChild(U.panel('Page setup', el('div', { class: 'po-opts' }, paper, orient),
        el('div', { class: 'po-checks' }, fit, grid, header, titles),
        U.note('Automatic turns a sheet sideways when its columns are wider than a portrait page. Without "Fit all columns", wide sheets carry on over extra pages.')));
      root.appendChild(result);
      root.appendChild(about([
        ['Kept:', 'the values as the spreadsheet displays them (with number, date and currency formats applied), cell fill colours, merged cells, hidden rows and columns (left out), and column widths set in the file.'],
        ['Not carried over:', 'fonts, borders, text colours and alignment set in Excel (numbers are aligned right and text left), charts, pictures, comments, and print areas or page breaks set in the workbook. Formulas show their last calculated value.'],
        ['CSV files:', 'are read as UTF-8 text, and every value is shown exactly as written.']
      ]));

      function changed() {
        if (!state.wb) return;
        result.replaceChildren();
        clearTimeout(timer);
        timer = setTimeout(convert, 200);
      }

      async function open(file) {
        if (!file) return;
        var job = ++state.job;
        state.wb = null;
        result.replaceChildren();
        sheetPanel.style.display = 'none';
        status.className = 'note';
        status.textContent = 'Reading ' + file.name + '…';
        try {
          var X = await libXlsx(), e = ext(file.name), csv = e === 'csv' || e === 'tsv' || /csv|tab-separated/.test(file.type || ''), wb;
          if (csv) {
            var text = String(await U.readAs(file, 'text')).replace(/^﻿/, '');
            wb = X.read(text, { type: 'string', raw: true, FS: e === 'tsv' ? '\t' : undefined });
          } else {
            var bytes = new Uint8Array(await U.readAs(file));
            if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
              var JSZip = await libZip(), z = await JSZip.loadAsync(bytes).catch(function () { return null; });
              if (z && z.file('word/document.xml')) throw new Error('This is a Word document. Use the Word to PDF tab for .docx files.');
            }
            try { wb = X.read(bytes, { type: 'array', cellStyles: true, cellDates: false }); }
            catch (err) { throw new Error(/password|encrypt/i.test(err.message || '') ? 'This spreadsheet is password-protected. Remove the password in Excel first.' : 'This file could not be read as a spreadsheet: ' + (err.message || err)); }
          }
          if (job !== state.job) return;
          if (!wb || !wb.SheetNames || !wb.SheetNames.length) throw new Error('No sheets were found in this file.');
          state.file = file; state.wb = wb; state.X = X; state.csv = csv;
          buildSheets(X, wb, csv);
          fileLine(info, file, plural(wb.SheetNames.length, 'sheet'));
          status.textContent = '';
          zone.style.display = 'none';
          again.style.display = '';
          convert();
        } catch (err) {
          if (job !== state.job) return;
          status.className = 'note err';
          status.textContent = err.message || String(err);
          zone.style.display = '';
          again.style.display = 'none';
          info.replaceChildren();
        }
      }

      function buildSheets(X, wb, csv) {
        sheetBox.replaceChildren();
        var meta = (wb.Workbook && wb.Workbook.Sheets) || [];
        wb.SheetNames.forEach(function (name, i) {
          var ws = wb.Sheets[name], hidden = meta[i] && meta[i].Hidden;
          var empty = !ws || !ws['!ref'] || !Object.keys(ws).some(function (k) { return k[0] !== '!' && cellText(ws[k]) !== ''; });
          var c = U.checkbox(name + (hidden ? ' (hidden)' : '') + (empty ? ' (empty)' : ''), { checked: !hidden && !empty });
          c.input.value = name;
          c.input.dataset.k = 'sheet';
          c.input.addEventListener('change', changed);
          sheetBox.appendChild(c);
        });
        sheetPanel.style.display = csv || wb.SheetNames.length < 2 ? 'none' : '';
      }

      async function convert() {
        clearTimeout(timer);
        var job = ++state.job, file = state.file;
        var alive = function () { return job === state.job && !state.dead; };
        var names = Array.prototype.filter.call(sheetBox.querySelectorAll('input'), function (i) { return i.checked; }).map(function (i) { return i.value; });
        if (state.csv || state.wb.SheetNames.length < 2) names = state.wb.SheetNames.slice(0, 1);
        var prog = U.progress();
        result.replaceChildren(U.panel(null, prog));
        prog.set('Starting…', 0.02);
        try {
          var out = await workbookToPdf(state.X, state.wb, {
            sheets: names, paper: paper.querySelector('select').value, orient: orient.querySelector('select').value,
            fit: fit.input.checked, grid: grid.input.checked, header: header.input.checked, titles: titles.input.checked,
            csv: state.csv, name: baseName(file.name)
          }, function (t, f) { if (alive()) prog.set(t, f); }, alive);
          if (!out || !alive()) return;
          prog.done('');
          var notes = [];
          if (out.empty.length) notes.push('Left out ' + (out.empty.length === 1 ? 'an empty sheet' : out.empty.length + ' empty sheets') + ': ' + out.empty.join(', ') + '.');
          out.scales.forEach(function (s) { if (s.scale < 0.999) notes.push('"' + s.name + '" is shrunk to ' + Math.round(s.scale * 100) + '% to fit the page width' + (s.scale < 0.45 ? '; the text is small, so try Landscape or turn off "Fit all columns".' : '.')); });
          if (out.missingChars.length) notes.push('Some characters couldn\'t be drawn and show as "?": ' + out.missingChars.slice(0, 12).join(' '));
          var view = resultPanel({ blob: out.blob, pages: out.pages, filename: baseName(file.name) + '.pdf', notes: notes,
            stats: [{ label: 'pages', value: String(out.pages) }, { label: out.sheets === 1 ? 'sheet' : 'sheets', value: String(out.sheets) }] });
          result.replaceChildren(view.node);
          showPreview(view.preview, out.bytes, alive);
        } catch (e) {
          if (!alive()) return;
          console.warn(e);
          result.replaceChildren(U.panel(null, U.note('Could not make the PDF: ' + (e.message || e), 'err')));
        }
      }
    }
  });
})();
