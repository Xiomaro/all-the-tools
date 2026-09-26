/* PDF to Word: turns a PDF into a .docx, entirely in the tab.
   "Editable text" rebuilds the document from pdf.js text content: text items
   become lines, lines become paragraphs, big or bold lines become Word
   headings, and bullets and numbers become real Word lists. Pictures come
   from the page's operator list and go in reading order. Pages with no text
   layer can be read with tesseract.js, as the OCR tool does.
   "Exact look" renders each page to a picture and places it full-page.
   The .docx is written by hand and zipped with JSZip. */
(function () {
  'use strict';
  var U = window.UI, el = U.el, K = window.PdfKit;

  if (!document.getElementById('g-pdfw-style')) {
    document.head.appendChild(el('style', { id: 'g-pdfw-style', text: [
      '.g-pdfw .g-wopts { display:flex; flex-direction:column; gap:12px; }',
      '.g-pdfw .g-wopts .note { margin:0; }',
      '.g-pdfw .g-wchecks { display:flex; flex-wrap:wrap; gap:6px 18px; }',
      '.g-pdfw .g-wpages { max-width:260px; }'
    ].join('\n') }));
  }

  var DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  var WARN_PAGES = 150, MAX_EDIT_PAGES = 1000, MAX_EXACT_PAGES = 300;
  var EXACT_DPI = 200, OCR_DPI = 200, MAX_IMG_SIDE = 3000;
  var OCR_MIN_CONFIDENCE = 50;     /* below this, tesseract is reading a picture, not text */
  var MAX_PAGE_PT = 1584;          /* Word's largest page side: 22 inches */
  var PARA_GAP = 6;                /* spacing used when the PDF gives no sensible gap */

  /* --- small helpers -------------------------------------------------------- */

  function tw(pt) { return Math.round(pt * 20); }                 /* points → twentieths of a point */
  function emu(pt) { return Math.max(1, Math.round(pt * 12700)); } /* points → English Metric Units */
  function halfPt(pt) { return Math.max(2, Math.min(3276, Math.round(pt * 2))); }
  function half(v) { return Math.round(v * 2) / 2; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function median(list) {
    if (!list.length) return 0;
    var s = list.slice().sort(function (a, b) { return a - b; });
    return s[s.length >> 1];
  }
  function tally(map, key, n) { map[key] = (map[key] || 0) + n; }
  function topKey(map) {
    var best = null, n = -1;
    Object.keys(map).forEach(function (k) { if (map[k] > n) { n = map[k]; best = k; } });
    return best;
  }
  function mul(a, b) {
    return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3],
      a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
  }
  function cancelled() { var e = new Error('Conversion cancelled.'); e.cancelled = true; return e; }

  /* Characters XML 1.0 forbids (controls, lone surrogates, U+FFFE/FFFF). */
  var BAD_XML = /[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])([\uDC00-\uDFFF])/g;
  function esc(s) {
    return String(s).replace(BAD_XML, function (m, low) { return low ? m.slice(0, m.length - 1) : ''; })
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Symbol-font bullets arrive in the private use area; give them real characters. */
  var PUA = { '\uF0B7': '•', '\uF0A7': '▪', '\uF0D8': '➢', '\uF076': '❖', '\uF0FC': '✓', '\uF0A8': '□', '\uF06E': '■', '\uF0E0': '➔', '\uF0D2': '●' };
  function cleanText(s) {
    return String(s).replace(/[\uF0A7\uF0A8\uF0B7\uF0D2\uF0D8\uF0E0\uF06E\uF076\uF0FC]/g, function (c) { return PUA[c]; })
      .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ').replace(/[\u200B-\u200D\u2060\uFEFF]/g, '');
  }

  /* Wait for a pdf.js object (a font or an image) without throwing if it never arrives. */
  function objectOf(store, id, ms) {
    return new Promise(function (resolve) {
      var done = false;
      var timer = setTimeout(function () { done = true; resolve(null); }, ms || 4000);
      try {
        store.get(id, function (data) { if (!done) { done = true; clearTimeout(timer); resolve(data); } });
      } catch (e) { clearTimeout(timer); resolve(null); }
    });
  }

  /* --- fonts ------------------------------------------------------------------
     PDF font names ("ABCDEF+TimesNewRomanPS-BoldMT") become Word family names
     ("Times New Roman") plus bold and italic flags. */

  var FONT_NAMES = {
    helvetica: 'Arial', arial: 'Arial', helveticaneue: 'Helvetica Neue', arialnarrow: 'Arial Narrow',
    times: 'Times New Roman', timesroman: 'Times New Roman', timesnewroman: 'Times New Roman',
    /* pdf.js has already turned Symbol and Dingbats glyphs into Unicode, so
       they need a Unicode font, not Word's own Symbol or Wingdings. */
    courier: 'Courier New', couriernew: 'Courier New', symbol: 'Segoe UI Symbol', zapfdingbats: 'Segoe UI Symbol',
    dejavusans: 'DejaVu Sans', dejavuserif: 'DejaVu Serif', dejavusansmono: 'DejaVu Sans Mono',
    segoeui: 'Segoe UI', trebuchetms: 'Trebuchet MS', comicsansms: 'Comic Sans MS', bookantiqua: 'Book Antiqua',
    centurygothic: 'Century Gothic', palatino: 'Palatino Linotype', palatinolinotype: 'Palatino Linotype',
    calibrilight: 'Calibri Light', cambriamath: 'Cambria Math'
  };
  var STYLE_WORDS = /(?:Bold|Italic|Oblique|Regular|Medium|Light|Semibold|SemiBold|Demi|Black|Heavy|Book|Condensed|Cond|Roman)+$/;
  var BOLD_RE = /bold|black|heavy|semibold|demibold|^cmbx/i;
  var ITALIC_RE = /italic|oblique|^cmti|^cmsl|-it$|-boldit$/i;

  function fontFamily(name, generic) {
    var fallback = /mono/i.test(generic) ? 'Courier New' : /serif/i.test(generic) && !/sans/i.test(generic) ? 'Times New Roman' : 'Arial';
    var base = String(name || '').split(/[-,]/)[0].replace(/(PSMT|PS|MT)$/, '');
    var key = base.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (FONT_NAMES[key]) return FONT_NAMES[key];
    if (/^(cm|lm|sf)[a-z]*\d/i.test(base)) return /tt/i.test(base) ? 'Courier New' : /ss/i.test(base) ? 'Arial' : 'Times New Roman';
    var trimmed = base.replace(STYLE_WORDS, '') || base;
    key = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (FONT_NAMES[key]) return FONT_NAMES[key];
    if (trimmed.length < 3 || /\d/.test(trimmed) || !/^[A-Za-z][A-Za-z ]+$/.test(trimmed) || /^g_d/.test(trimmed)) return fallback;
    return trimmed.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').trim();
  }

  async function fontTable(page, tc) {
    var table = {};
    await Promise.all(Object.keys(tc.styles || {}).map(async function (id) {
      var st = tc.styles[id] || {}, obj = await objectOf(page.commonObjs, id, 3000), raw = '', bold = false, italic = false;
      try { raw = String(obj && obj.name || ''); bold = !!(obj && obj.bold); italic = !!(obj && obj.italic); } catch (e) { /* no details */ }
      raw = raw.replace(/^[A-Z]{6}\+/, '');
      table[id] = { family: fontFamily(raw, st.fontFamily), bold: bold || BOLD_RE.test(raw), italic: italic || ITALIC_RE.test(raw) };
    }));
    return table;
  }

  /* --- reading a page ------------------------------------------------------------ */

  /* "S H I F T I N G": letter-spaced display text that pdf.js returns with a
     space between every letter. Short runs are closed up; longer ones are
     left alone, because the real word breaks can't be told apart. */
  function closeLetterSpacing(str) {
    var t = str.trim();
    if (/^(?:\S ){3,}\S$/.test(t) && t.length <= 23) return str.replace(t, t.replace(/ /g, ''));
    return str;
  }

  function textItems(tc, vp, fonts) {
    var items = [], rotated = [], chars = 0;
    (tc.items || []).forEach(function (it) {
      if (!it || typeof it.str !== 'string' || !it.str) return;
      var str = cleanText(it.str), space = !/\S/.test(str);
      if (!str) return;
      var m = mul(vp.transform, it.transform);
      var size = Math.hypot(m[2], m[3]);
      if (!(size > 0.5)) return;
      if (space) {
        /* A separate space item still separates words, even when the gap is small. */
        if (Math.abs(Math.atan2(m[1], m[0])) <= 0.03) items.push({ str: ' ', space: true, x: m[4], base: m[5], size: Math.min(size, 400), w: 0 });
        return;
      }
      str = closeLetterSpacing(str);
      chars += str.replace(/\s+/g, '').length;
      var rec = {
        str: str, x: m[4], base: m[5], size: Math.min(size, 400),
        w: Math.abs(it.width) > 0 ? Math.abs(it.width) : str.length * size * 0.5,
        font: fonts[it.fontName] || { family: 'Arial', bold: false, italic: false },
        angle: Math.atan2(m[1], m[0])
      };
      (Math.abs(rec.angle) > 0.03 ? rotated : items).push(rec);
    });
    return { items: items, rotated: rotated, chars: chars };
  }

  /* Walk the operator list keeping track of the transformation matrix, and
     note where pictures are drawn and where small shapes are painted (browsers
     and some layout programs draw list bullets as little discs and squares
     rather than as text). */
  function walkOps(ops, vp, OPS) {
    var fn = ops.fnArray, args = ops.argsArray, ctm = [1, 0, 0, 1, 0, 0], stack = [], images = [], dots = [];
    var strokes = [OPS.stroke, OPS.closeStroke];
    for (var i = 0; i < fn.length; i++) {
      var op = fn[i], a = args[i];
      if (op === OPS.save) stack.push(ctm);
      else if (op === OPS.restore) ctm = stack.pop() || ctm;
      else if (op === OPS.transform && a && a.length === 6) ctm = mul(ctm, a);
      else if (op === OPS.paintFormXObjectBegin) { stack.push(ctm); if (a && a[0] && a[0].length === 6) ctm = mul(ctm, a[0]); }
      else if (op === OPS.paintFormXObjectEnd) ctm = stack.pop() || ctm;
      else if (op === OPS.paintImageXObject && a && typeof a[0] === 'string') images.push({ id: a[0], m: mul(vp.transform, ctm) });
      else if (op === OPS.paintInlineImageXObject && a && a[0]) images.push({ data: a[0], m: mul(vp.transform, ctm) });
      else if (op === OPS.constructPath && a && a[2] && a[2].length === 4 && dots.length < 2000) {
        var mm = a[2], m = mul(vp.transform, ctm);
        var p0 = [m[0] * mm[0] + m[2] * mm[1] + m[4], m[1] * mm[0] + m[3] * mm[1] + m[5]];
        var p1 = [m[0] * mm[2] + m[2] * mm[3] + m[4], m[1] * mm[2] + m[3] * mm[3] + m[5]];
        var w = Math.abs(p1[0] - p0[0]), h = Math.abs(p1[1] - p0[1]);
        if (w >= 1.5 && w <= 9 && h >= 1.5 && h <= 9 && w / h > 0.6 && w / h < 1.7) {
          dots.push({ x0: Math.min(p0[0], p1[0]), x1: Math.max(p0[0], p1[0]), y0: Math.min(p0[1], p1[1]), y1: Math.max(p0[1], p1[1]), hollow: strokes.indexOf(a[0]) > -1 });
        }
      }
    }
    return { images: images, dots: dots };
  }

  /* Pictures drawn on the page, with where they are drawn. Each image's pixels
     come from pdf.js's object store and are redrawn upright at their size. */
  async function pageImages(page, found, vp, cache) {
    var out = [];
    for (var j = 0; j < found.length; j++) {
      var f = found[j], m = f.m;
      var xs = [m[4], m[0] + m[4], m[2] + m[4], m[0] + m[2] + m[4]], ys = [m[5], m[1] + m[5], m[3] + m[5], m[1] + m[3] + m[5]];
      var box = { x0: Math.min.apply(null, xs), x1: Math.max.apply(null, xs), y0: Math.min.apply(null, ys), y1: Math.max.apply(null, ys) };
      if (box.x1 - box.x0 < 6 || box.y1 - box.y0 < 6) continue;
      if (box.x1 < 0 || box.y1 < 0 || box.x0 > vp.width || box.y0 > vp.height) continue;
      var data = f.data || await objectOf(f.id.indexOf('g_') === 0 ? page.commonObjs : page.objs, f.id, 8000);
      if (!data || !data.width || !data.height || data.width * data.height < 64) continue;
      var plain = Math.abs(m[1]) < 1e-6 && Math.abs(m[2]) < 1e-6 && m[0] > 0 && m[3] < 0;
      var key = f.id && plain ? f.id : null;
      var enc = key && cache[key];
      if (!enc) {
        enc = await encodeImage(data, m, box);
        if (!enc) continue;
        if (key) cache[key] = enc;
      }
      out.push({ x0: box.x0, x1: box.x1, top: box.y0, bottom: box.y1, media: enc });
    }
    return out;
  }

  /* pdf.js image data (an ImageBitmap, or raw 1-bit, RGB or RGBA pixels) → canvas. */
  function imageCanvas(d) {
    var w = d.width, h = d.height, c = el('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    if (d.bitmap) { g.drawImage(d.bitmap, 0, 0); return c; }
    if (!d.data) return null;
    var img = g.createImageData(w, h), px = img.data, src = d.data, n = w * h, i, j = 0, k = 0;
    if (d.kind === 3) px.set(src.subarray ? src.subarray(0, n * 4) : src.slice(0, n * 4));
    else if (d.kind === 2) {
      for (i = 0; i < n; i++) { px[j++] = src[k++]; px[j++] = src[k++]; px[j++] = src[k++]; px[j++] = 255; }
    } else if (d.kind === 1) {
      var row = (w + 7) >> 3;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var v = (src[y * row + (x >> 3)] >> (7 - (x & 7))) & 1 ? 255 : 0;
          px[j++] = v; px[j++] = v; px[j++] = v; px[j++] = 255;
        }
      }
    } else return null;
    g.putImageData(img, 0, 0);
    return c;
  }

  /* Draw the image as it appears on the page (flips and rotations applied)
     at no more than its own resolution, then pick PNG or JPEG. */
  async function encodeImage(data, m, box) {
    var src;
    try { src = imageCanvas(data); } catch (e) { src = null; }
    if (!src) return null;
    var w = data.width, h = data.height, bw = box.x1 - box.x0, bh = box.y1 - box.y0;
    var area = Math.abs(m[0] * m[3] - m[1] * m[2]) || 1;
    var k = Math.sqrt(w * h / area);
    k = Math.min(k, MAX_IMG_SIDE / Math.max(bw, bh));
    var cw = Math.max(1, Math.round(bw * k)), ch = Math.max(1, Math.round(bh * k));
    var plain = Math.abs(m[1]) < 1e-6 && Math.abs(m[2]) < 1e-6 && m[0] > 0 && m[3] < 0;
    var c = src;
    if (!plain || cw !== w || ch !== h) {
      c = el('canvas'); c.width = cw; c.height = ch;
      var g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.setTransform(k * m[0] / w, k * m[1] / w, -k * m[2] / h, -k * m[3] / h, k * (m[2] + m[4] - box.x0), k * (m[3] + m[5] - box.y0));
      g.drawImage(src, 0, 0);
      src.width = 0;
    }
    var png = !plain || hasAlphaOrFewColours(c);
    var bytes = await K.canvasBytes(c, png ? 'image/png' : 'image/jpeg', 0.9);
    var out = { bytes: bytes, ext: png ? 'png' : 'jpeg', px: c.width };
    c.width = 0;
    return out;
  }

  /* Transparent pictures and flat graphics (charts, logos) stay PNG; photos go JPEG. */
  function hasAlphaOrFewColours(c) {
    var s = el('canvas'), sw = Math.min(96, c.width), sh = Math.min(96, c.height);
    s.width = sw; s.height = sh;
    var g = s.getContext('2d', { willReadFrequently: true });
    g.drawImage(c, 0, 0, sw, sh);
    var d = g.getImageData(0, 0, sw, sh).data, seen = {}, count = 0;
    for (var i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 250) return true;
      var key = (d[i] >> 3) + ',' + (d[i + 1] >> 3) + ',' + (d[i + 2] >> 3);
      if (!seen[key]) { seen[key] = 1; if (++count > 200) return false; }
    }
    return true;
  }

  async function readPage(pdf, n, lib, wantImages, cache) {
    var page = await pdf.getPage(n);
    try {
      var vp = page.getViewport({ scale: 1 });
      var ops = await page.getOperatorList(lib.AnnotationMode ? { annotationMode: lib.AnnotationMode.DISABLE } : undefined);
      var tc = await page.getTextContent();
      var text = textItems(tc, vp, await fontTable(page, tc));
      var drawn = walkOps(ops, vp, lib.OPS);
      var images = wantImages ? await pageImages(page, drawn.images, vp, cache) : [];
      return { n: n, w: vp.width, h: vp.height, items: text.items, rotated: text.rotated, chars: text.chars, images: images, dots: drawn.dots };
    } finally { page.cleanup(); }
  }

  /* Pages whose text layer is empty (scans, photos of paper). */
  async function findScanned(pdf, onPage, job) {
    var list = [];
    for (var i = 1; i <= pdf.numPages; i++) {
      if (job.cancelled) break;
      onPage(i);
      var page = await pdf.getPage(i);
      var tc = await page.getTextContent();
      if (!tc.items.some(function (it) { return it.str && /\S/.test(it.str); })) list.push(i);
      page.cleanup();
    }
    return list;
  }

  /* --- OCR -----------------------------------------------------------------------
     The OCR tool's tesseract.js worker (PdfKit, in pdf.js), in the language
     picked. Progress goes to whichever page is being read. */

  var ocrLog = null;

  async function ocrStart(job) {
    var w = await K.ocrGetWorker(job.lang || 'eng', function (m) { if (ocrLog) ocrLog(m); });
    if (job.cancelled) { K.ocrRelease(); throw cancelled(); }
    return w;
  }
  function ocrRelease() { K.ocrRelease(); }
  /* Rejects when the job is cancelled; stops watching once token.done is set. */
  function untilCancelled(job, token) {
    return new Promise(function (resolve, reject) {
      var t = setInterval(function () {
        if (token.done) clearInterval(t);
        else if (job.cancelled) { clearInterval(t); reject(cancelled()); }
      }, 200);
    });
  }

  var OCR_FONT = { family: null, bold: false, italic: false };

  /* Render the page, read it, and turn tesseract's words into the same kind
     of positioned text items that pdf.js gives, so the layout rules apply.
     Returns the items and tesseract's mean confidence (0-100). */
  async function ocrPage(pdf, n, job, onProgress) {
    var r = await K.renderPage(pdf, n, OCR_DPI / 72);
    var worker = await ocrStart(job);
    ocrLog = function (m) { if (m.status === 'recognizing text') onProgress(m.progress || 0); };
    var token = { done: false }, res;
    try { res = await Promise.race([worker.recognize(r.canvas, {}, { text: true, blocks: true }), untilCancelled(job, token)]); }
    finally { token.done = true; ocrLog = null; }
    var k = r.canvas.width / r.width, items = [], d = res.data || {};
    r.canvas.width = 0;
    (d.blocks || []).forEach(function (b) {
      (b.paragraphs || []).forEach(function (p) {
        (p.lines || []).forEach(function (ln) {
          var words = (ln.words || []).filter(function (w) { return w.text && /\S/.test(w.text) && (w.confidence > 15 || /[A-Za-z0-9]/.test(w.text)); });
          if (!words.length) return;
          var mh = median(words.map(function (w) { return w.bbox.y1 - w.bbox.y0; }));
          var size = clamp(mh / k / 0.8, 4, 200), bl = ln.baseline;
          words.forEach(function (w) {
            var cx = (w.bbox.x0 + w.bbox.x1) / 2;
            var base = bl && bl.x1 > bl.x0 ? bl.y0 + (bl.y1 - bl.y0) * (cx - bl.x0) / (bl.x1 - bl.x0) : w.bbox.y1 - 0.2 * mh;
            items.push({ str: cleanText(w.text), x: w.bbox.x0 / k, w: (w.bbox.x1 - w.bbox.x0) / k, base: base / k, size: size, font: OCR_FONT, angle: 0 });
          });
        });
      });
    });
    if (!items.length && d.text) {
      /* No layout from tesseract: lay the plain text out line by line. */
      var y = 72;
      String(d.text).split('\n').forEach(function (line) {
        y += 14;
        if (!line.trim()) return;
        items.push({ str: cleanText(line.trim()), x: 72, w: line.trim().length * 5.5, base: y, size: 11, font: OCR_FONT, angle: 0 });
      });
    }
    return { items: items, confidence: d.confidence || 0 };
  }

  /* --- lines ------------------------------------------------------------------
     Text items sharing a baseline form a line. A wide horizontal gap splits a
     line into segments (table cells, tab stops, columns). */

  function pushText(seg, str, style) {
    str = str.replace(/\s+/g, ' ');
    if (!seg.text || / $/.test(seg.text)) str = str.replace(/^ /, '');
    if (!str) return;
    var last = seg.runs[seg.runs.length - 1];
    if (last && sameStyle(last, style)) last.text += str;
    else seg.runs.push({ text: str, family: style.family, bold: style.bold, italic: style.italic, size: style.size, vert: style.vert });
    seg.text += str;
  }
  function sameStyle(a, b) {
    return a.family === b.family && !!a.bold === !!b.bold && !!a.italic === !!b.italic && a.size === b.size && (a.vert || '') === (b.vert || '');
  }
  function closeSeg(seg) {
    var last = seg.runs[seg.runs.length - 1];
    if (last && / $/.test(last.text)) { last.text = last.text.replace(/ +$/, ''); seg.text = seg.text.replace(/ +$/, ''); }
  }
  /* Width of some text in a similar font, for sharing out a text item's real width. */
  var measureCtx = null;
  function measure(text, font) {
    if (!measureCtx) measureCtx = el('canvas').getContext('2d');
    measureCtx.font = (font.italic ? 'italic ' : '') + (font.bold ? 'bold ' : '') + '100px "' + (font.family || 'Arial') + '", Arial, sans-serif';
    return measureCtx.measureText(text).width;
  }
  /* The x position of a character in a segment, interpolated within its text item. */
  function xAt(seg, idx) {
    for (var i = 0; i < seg.pieces.length; i++) {
      var p = seg.pieces[i];
      if (idx > p.end) continue;
      if (idx <= p.start) return p.x;
      var str = seg.text.slice(p.start, p.end), whole = measure(str, p.font);
      return p.x + p.w * (whole ? measure(str.slice(0, idx - p.start), p.font) / whole : (idx - p.start) / Math.max(1, p.end - p.start));
    }
    return seg.x1;
  }

  function buildLines(items) {
    items = items.slice().sort(function (a, b) { return a.base - b.base || a.x - b.x; });
    var rows = [];
    items.forEach(function (it) {
      if (it.space && !rows.length) return;
      for (var i = rows.length - 1; i >= Math.max(0, rows.length - 3); i--) {
        var r = rows[i];
        if (Math.abs(it.base - r.base) <= 0.45 * Math.max(r.size, it.size)) {
          r.items.push(it);
          if (!it.space && it.size > r.size + 0.01) { r.size = it.size; r.base = it.base; }
          return;
        }
      }
      if (!it.space) rows.push({ base: it.base, size: it.size, items: [it] });
    });
    return rows.map(finishRow).filter(Boolean).sort(function (a, b) { return a.base - b.base; });
  }

  function finishRow(row) {
    var its = row.items.sort(function (a, b) { return a.x - b.x; }), kept = [];
    /* The same text printed twice at almost the same spot is a faked bold. */
    its.forEach(function (it) {
      if (it.space) { kept.push(it); return; }
      for (var k = kept.length - 1; k >= 0 && k >= kept.length - 3; k--) {
        if (kept[k].str === it.str && Math.abs(kept[k].x - it.x) < 0.25 * it.size && Math.abs(kept[k].base - it.base) < 0.25 * it.size) { kept[k].fakeBold = true; return; }
      }
      kept.push(it);
    });
    var sizes = {};
    kept.forEach(function (it) { if (!it.space) tally(sizes, half(it.size), it.str.length); });
    var size = +topKey(sizes) || row.size;
    var base = median(kept.filter(function (it) { return !it.space && Math.abs(it.size - size) < 0.6; }).map(function (it) { return it.base; })) || row.base;
    /* Letters placed one by one with tracking: only a gap wider than the
       tracking is a word space. */
    var single = [], track = 0;
    for (var t = 1; t < kept.length; t++) {
      var a = kept[t - 1], b = kept[t];
      if (!a.space && !b.space && a.str.length === 1 && b.str.length === 1) single.push(b.x - (a.x + a.w));
    }
    if (single.length >= 3) track = Math.max(0, median(single));
    var segs = [], seg = null, prev = null, spaced = false;
    kept.forEach(function (it) {
      if (it.space) { spaced = true; return; }
      var gap = prev ? it.x - (prev.x + prev.w) : 0;
      var wordGap = track > 0.05 * size ? track * 1.6 + 0.1 * size : 0.2 * Math.min(it.size, prev ? prev.size : it.size);
      if (!seg || gap > Math.max(1.25 * size, 8)) {
        if (seg) closeSeg(seg);
        seg = { x0: it.x, x1: it.x + it.w, runs: [], text: '', pieces: [] };
        segs.push(seg);
      } else if ((spaced || gap > wordGap) && !/ $/.test(seg.text) && !/^\s/.test(it.str) && seg.runs.length) {
        /* The space goes with the plainer of the two words, so "a **bold** word" keeps unbolded spaces. */
        var before = seg.runs[seg.runs.length - 1];
        if (!before.bold || it.font.bold || it.fakeBold) pushText(seg, ' ', before); else it = Object.assign({}, it, { str: ' ' + it.str });
      }
      var vert = null;
      if (it.size < 0.85 * size) {
        if (base - it.base > 0.15 * size) vert = 'sup';
        else if (it.base - base > 0.1 * size) vert = 'sub';
      }
      var start = seg.text.length;
      pushText(seg, it.str, { family: it.font.family, bold: it.font.bold || !!it.fakeBold, italic: it.font.italic, size: vert ? half(size) : half(it.size), vert: vert });
      seg.pieces.push({ x: it.x, w: it.w, start: start, end: seg.text.length, font: it.font });
      seg.x1 = Math.max(seg.x1, it.x + it.w);
      prev = it;
      spaced = false;
    });
    if (seg) closeSeg(seg);
    segs = segs.filter(function (s) { return s.text; });
    /* A bullet or number set well apart from its text is still one line. */
    if (segs.length > 1 && MARKER_ONLY.test(segs[0].text)) segs.splice(0, 2, joinSegs(segs[0], segs[1]));
    return segs.length ? lineFrom(segs, base, size) : null;
  }

  var MARKER_ONLY = /^(?:[•●○◦▪■□▫►▸▹‣⁃∙·✓✔➢➤➔❖*\-–—]|\(?(?:\d{1,3}|[a-zA-Z]|[ivxlc]{1,6}|[IVXLC]{1,6})[.)])$/;
  function joinSegs(a, b) {
    var off = a.text.length + 1, runs = a.runs.map(function (r) { return Object.assign({}, r); });
    runs[runs.length - 1].text += ' ';
    b.runs.forEach(function (r) { runs.push(Object.assign({}, r)); });
    return { x0: a.x0, x1: b.x1, runs: runs, text: a.text + ' ' + b.text,
      pieces: a.pieces.concat(b.pieces.map(function (p) { return { x: p.x, w: p.w, start: p.start + off, end: p.end + off, font: p.font }; })) };
  }

  var STRONG_BULLET = /^([•●○◦▪■□▫►▸▹‣⁃∙·✓✔➢➤➔❖])\s*/;
  var WEAK_BULLET = /^([-–—*])\s+/;
  var NUMBERED = /^(\()?(\d{1,3}|[a-zA-Z]|[ivxlc]{1,6}|[IVXLC]{1,6})([.)])\s+/;
  function romanValue(s) {
    var v = { i: 1, v: 5, x: 10, l: 50, c: 100 }, total = 0, t = s.toLowerCase();
    for (var i = 0; i < t.length; i++) { var a = v[t[i]], b = v[t[i + 1]] || 0; total += a < b ? -a : a; }
    return total;
  }

  /* A bullet or number at the start of a line. Bullet glyphs are "strong":
     they always start a list item. Dashes and numbers are "weak": they only do
     when the line would start a paragraph anyway, or follows a list item. */
  function markerOf(seg) {
    var t = seg.text, m = STRONG_BULLET.exec(t), mk = null;
    if (m && t.length > m[0].length) mk = { kind: 'bullet', glyph: /[○◦]/.test(m[1]) ? '◦' : /[▪■□▫]/.test(m[1]) ? '▪' : /[✓✔]/.test(m[1]) ? '✓' : /[►▸▹➢➤➔]/.test(m[1]) ? '➢' : '•', len: m[0].length, strong: true };
    else if ((m = WEAK_BULLET.exec(t)) && t.length > m[0].length) mk = { kind: 'bullet', glyph: m[1] === '*' ? '•' : '–', len: m[0].length, strong: false };
    else if ((m = NUMBERED.exec(t)) && t.length > m[0].length && (!m[1] || m[3] === ')')) {
      var tok = m[2], fmt, n;
      if (/^\d+$/.test(tok)) { fmt = 'decimal'; n = parseInt(tok, 10); }
      else if (/^[ivxlc]+$/.test(tok) && (tok.length > 1 || tok === 'i')) { fmt = 'lowerRoman'; n = romanValue(tok); }
      else if (/^[IVXLC]+$/.test(tok) && (tok.length > 1 || tok === 'I')) { fmt = 'upperRoman'; n = romanValue(tok); }
      else if (/^[a-z]$/.test(tok)) { fmt = 'lowerLetter'; n = tok.charCodeAt(0) - 96; }
      else if (/^[A-Z]$/.test(tok)) { fmt = 'upperLetter'; n = tok.charCodeAt(0) - 64; }
      else return null;
      mk = { kind: 'num', fmt: fmt, n: n, prefix: m[1] || '', suffix: m[3], label: m[0].trim(), len: m[0].length, strong: false, start: n === 1 };
    }
    if (mk) { mk.x = seg.x0; mk.textX = xAt(seg, mk.len); }
    return mk;
  }

  function lineFrom(segs, base, size) {
    var runs = [], bold = true, italic = true, any = false;
    segs.forEach(function (s, i) {
      if (i) { var p = runs[runs.length - 1]; runs.push({ text: '\t', family: p.family, bold: p.bold, italic: p.italic, size: p.size }); }
      s.runs.forEach(function (r) {
        runs.push({ text: r.text, family: r.family, bold: r.bold, italic: r.italic, size: r.size, vert: r.vert });
        if (/\S/.test(r.text)) { any = true; if (!r.bold) bold = false; if (!r.italic) italic = false; }
      });
    });
    var s0 = segs[0], word = /^\S+/.exec(s0.text);
    return {
      segs: segs, runs: runs, base: base, size: size, x0: s0.x0, x1: segs[segs.length - 1].x1,
      text: segs.map(function (s) { return s.text; }).join('\t'),
      allBold: any && bold, allItalic: any && italic,
      firstWordW: word ? xAt(s0, word[0].length) - s0.x0 : 0,
      marker: markerOf(s0)
    };
  }

  /* Most common distance between the baselines of neighbouring lines of the
     same size: the document's line spacing, against which gaps are judged. */
  function pitchTable(lines) {
    var by = {};
    for (var i = 1; i < lines.length; i++) {
      var a = lines[i - 1], b = lines[i];
      if (Math.abs(a.size - b.size) > 0.1 * a.size) continue;
      var d = b.base - a.base;
      if (d < 0.8 * a.size || d > 2.5 * a.size) continue;
      (by[half(a.size)] = by[half(a.size)] || {})[half(d)] = (by[half(a.size)][half(d)] || 0) + 1;
    }
    return function (size) {
      var key = half(size), map = by[key];
      if (!map) {
        var near = Object.keys(by).filter(function (k) { return Math.abs(k - size) <= 0.1 * size; });
        if (near.length) map = by[near[0]];
      }
      var best = map ? +topKey(map) : 0;
      return best || 1.2 * size;
    };
  }

  var PAGE_NO = /^(?:page\s*)?[-–—]?\s*\d{1,4}\s*[-–—]?(?:\s*(?:of|\/)\s*\d{1,4})?$/i;
  function isPageNumber(line, h) {
    return line.segs.length === 1 && PAGE_NO.test(line.text.trim()) && (line.base < h * 0.1 || line.base > h * 0.9);
  }

  /* --- columns ----------------------------------------------------------------
     Two-column pages (papers, newsletters) are read column by column: a
     vertical gutter that no narrow line crosses splits the page into bands,
     and each band is read left column first, then right. Lines that cross the
     gutter (titles, abstracts) are full-width and end a band. */

  function columnFlows(lines, images, L, R) {
    var single = [{ lines: lines, images: images, l: L, r: R, shift: 0 }];
    var W = R - L;
    if (lines.length < 12 || W < 250) return single;
    var narrow = [];
    lines.forEach(function (ln) { ln.segs.forEach(function (s) { if (s.x1 - s.x0 < 0.6 * W) narrow.push(s); }); });
    if (narrow.length < 16) return single;
    var bins = new Uint16Array(Math.ceil(W) + 2), tol = Math.max(1, Math.floor(narrow.length * 0.02));
    narrow.forEach(function (s) {
      for (var x = Math.max(0, Math.floor(s.x0 - L)); x < Math.min(bins.length, Math.ceil(s.x1 - L)); x++) bins[x]++;
    });
    var lo = Math.floor(W * 0.25), hi = Math.ceil(W * 0.75), best = null, start = -1;
    for (var x = lo; x <= hi + 1; x++) {
      var empty = x <= hi && bins[x] <= tol;
      if (empty && start < 0) start = x;
      if (!empty && start >= 0) { if (!best || x - start > best.b - best.a) best = { a: start, b: x }; start = -1; }
    }
    if (!best || best.b - best.a < 8) return single;
    var g0 = L + best.a, g1 = L + best.b;
    var left = narrow.filter(function (s) { return s.x1 <= g0 + 1; }), right = narrow.filter(function (s) { return s.x0 >= g1 - 1; });
    if (left.length < 8 || right.length < 8) return single;
    var rightL = Math.min.apply(null, right.map(function (s) { return s.x0; }));
    var width = function (s) { return s.x1 - s.x0; };
    if (median(left.map(width)) < 0.55 * (g0 - L) || median(right.map(width)) < 0.55 * (R - rightL)) return single;

    var entries = [];
    lines.forEach(function (ln) {
      /* A column line may poke into the gutter; only one that reaches the other column is full-width. */
      var sides = ln.segs.map(function (s) { return s.x1 <= g1 - 1 ? 'L' : s.x0 >= g0 + 1 ? 'R' : 'F'; });
      if (sides.indexOf('F') > -1) { entries.push({ side: 'F', line: ln, y: ln.base - ln.size, end: ln.base, size: ln.size }); return; }
      ['L', 'R'].forEach(function (side) {
        var segs = ln.segs.filter(function (s, i) { return sides[i] === side; });
        if (!segs.length) return;
        var part = segs.length === ln.segs.length ? ln : lineFrom(segs, ln.base, ln.size);
        if (part !== ln && ln.marker && ln.marker.vector && segs[0] === ln.segs[0]) part.marker = ln.marker;
        entries.push({ side: side, line: part, y: ln.base - ln.size, end: ln.base, size: ln.size });
      });
    });
    images.forEach(function (im) {
      var side = im.x0 < g0 - 4 && im.x1 > g1 + 4 ? 'F' : (im.x0 + im.x1) / 2 < (g0 + g1) / 2 ? 'L' : 'R';
      entries.push({ side: side, image: im, y: im.top, end: im.bottom, size: 12 });
    });
    entries.sort(function (a, b) { return a.y - b.y; });
    var flows = [], band = null, full = null, bands = 0;
    function flow(l, r, side) { return { lines: [], images: [], l: l, r: r, shift: l - L, side: side, band: side ? bands : 0 }; }
    function flush() {
      if (!band) return;
      [band.L, band.R].forEach(function (f) { if (f.lines.length || f.images.length) flows.push(f); });
      band = null;
    }
    entries.forEach(function (e) {
      var target;
      if (e.side === 'F') {
        flush();
        if (!full) { full = flow(L, R); flows.push(full); }
        target = full;
      } else {
        full = null;
        /* Both columns have ended and something starts well below them: a new
           band, so a short line under the columns isn't read before the right column. */
        var other = e.side === 'L' ? 'R' : 'L';
        if (band && band.end.L > -Infinity && band.end.R > -Infinity && e.y - band.end[e.side] > 1.5 * e.size && e.y - band.end[other] > 1.5 * e.size) flush();
        if (!band) { bands++; band = { L: flow(L, g0, 'L'), R: flow(rightL, R, 'R'), end: { L: -Infinity, R: -Infinity } }; }
        target = band[e.side];
        band.end[e.side] = Math.max(band.end[e.side], e.end);
      }
      if (e.line) target.lines.push(e.line); else target.images.push(e.image);
    });
    flush();
    flows.forEach(function (f) { f.lines.sort(function (a, b) { return a.base - b.base; }); });
    return flows;
  }

  /* --- paragraphs -----------------------------------------------------------------
     Lines join into a paragraph when they have the same size and weight, sit
     at the normal line spacing, start at the same indent, and the line before
     ran to the right edge (the first word of the next line would not have
     fitted on it). */

  function isCentred(line, f) {
    var colW = f.r - f.l, lg = line.x0 - f.l, rg = f.r - line.x1;
    return lg > Math.max(12, 0.05 * colW) && Math.abs(lg - rg) <= Math.max(4, 0.025 * colW);
  }

  function joinable(P, B, f) {
    var A = P.lines[P.lines.length - 1];
    if (P.tabbed || B.segs.length > 1) return false;
    if (Math.abs(A.size - B.size) > 0.12 * Math.max(A.size, B.size)) return false;
    var d = B.base - A.base;
    if (d < 0.5 * A.size) return false;
    var pitch = P.pitch || f.typical(A.size);
    if (d > pitch * 1.3 + 0.5) return false;
    if (P.allBold !== B.allBold) return false;
    var tol = Math.max(2.5, 0.25 * A.size);
    var centred = P.lines.length === 1 ? isCentred(A, f) : P.centred;
    if (centred) return isCentred(B, f) && (A.x1 - A.x0) > 0.6 * (f.r - f.l);
    if (P.lines.length > 1) { if (Math.abs(B.x0 - P.contX) > tol) return false; }
    else if (P.marker) { if (Math.abs(B.x0 - P.marker.textX) > tol && Math.abs(B.x0 - A.x0) > tol) return false; }
    else if (B.x0 > A.x0 + tol) return false;
    var right;
    if (P.lines.length > 1) right = Math.max(P.maxX1, B.x1);
    else if (A.x0 > f.l + tol && (A.x1 - A.x0) >= 0.6 * (f.r - A.x0)) right = Math.max(A.x1, B.x1);
    else right = f.r;
    if (B.firstWordW && A.x1 + 0.25 * A.size + B.firstWordW < right - 0.5) return false;
    return true;
  }

  var CJK = /[\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/;
  function append(P, B, f) {
    var A = P.lines[P.lines.length - 1];
    var d = B.base - A.base;
    P.pitch = P.pitch ? (P.pitch * (P.lines.length - 1) + d) / P.lines.length : d;
    P.centred = (P.lines.length === 1 ? isCentred(A, f) : P.centred) && isCentred(B, f);
    if (P.lines.length === 1) P.contX = B.x0;
    P.lines.push(B);
    P.maxX1 = Math.max(P.maxX1, B.x1);
    P.lastBase = B.base;
    joinRuns(P.runs, B.runs);
  }

  /* Add one line's runs to a paragraph's: rejoin a hyphenated word, or put a space between. */
  function joinRuns(runs, more) {
    var last = runs[runs.length - 1], first = more[0];
    if (last && first) {
      if (/\u00AD$/.test(last.text)) last.text = last.text.slice(0, -1);
      else if (/[A-Za-z\u00C0-\u024F][-\u2010]$/.test(last.text)) {
        /* "docu-" + "ment" → "document"; "Anglo-" + "Saxon" keeps its hyphen */
        if (/^[a-z\u00DF-\u00FF\u0101-\u024F]/.test(first.text)) last.text = last.text.slice(0, -1);
      } else if (!/\s$/.test(last.text) && !/^\s/.test(first.text) && !(CJK.test(last.text.slice(-1)) && CJK.test(first.text.charAt(0)))) last.text += ' ';
    }
    more.forEach(function (r) { runs.push(r); });
  }

  function startPara(B, f) {
    return {
      kind: 'text', flow: f, lines: [B], runs: B.runs.slice(), marker: B.marker && B.marker.use ? B.marker : null,
      x0: B.x0, contX: null, maxX1: B.x1, firstBase: B.base, lastBase: B.base, pitch: 0,
      allBold: B.allBold, tabbed: B.segs.length > 1, centred: false
    };
  }

  function finishPara(P) {
    var sizes = {}, chars = 0, bold = true;
    P.runs.forEach(function (r) {
      var n = r.text.replace(/\s+/g, '').length;
      if (!n) return;
      chars += n; tally(sizes, r.size, n);
      if (!r.bold) bold = false;
    });
    P.chars = chars;
    P.size = +topKey(sizes) || P.lines[0].size;
    P.allBold = chars > 0 && bold;
    P.text = P.runs.map(function (r) { return r.text; }).join('');
    P.lh = clamp(P.lines.length > 1 ? P.pitch : P.flow.typical(P.size), P.size, P.size * 3);
    P.top = P.firstBase + 0.22 * P.size - P.lh;
    P.bottom = P.lastBase + 0.22 * P.size;
  }

  function buildParas(lines, f) {
    var paras = [], P = null;
    lines.forEach(function (B) {
      var mk = B.marker;
      if (mk && B.segs.length > 1) mk.use = false;
      else if (mk) mk.use = mk.strong || !P || !!P.marker || !!mk.start || !joinable(P, B, f);
      if (P && !(mk && mk.use) && joinable(P, B, f)) { append(P, B, f); return; }
      if (P) finishPara(P);
      P = startPara(B, f);
      paras.push(P);
    });
    if (P) finishPara(P);
    paras.forEach(function (p) { p.align = alignOf(p); });
    return paras;
  }

  function alignOf(P) {
    var f = P.flow, colW = f.r - f.l, L = P.lines;
    if (P.marker || P.tabbed) return 'left';
    if (L.length === 1) {
      var A = L[0];
      if (isCentred(A, f)) return 'center';
      if (f.r - A.x1 < 3 && A.x0 - f.l > 0.3 * colW) return 'right';
      return 'left';
    }
    if (P.centred) return 'center';
    if (L.every(function (l) { return Math.abs(l.x1 - f.r) < 3; }) && L.some(function (l) { return Math.abs(l.x0 - L[0].x0) > 3; }) &&
      L.some(function (l) { return l.x0 > f.l + 3 * P.size; })) return 'right';
    var body = L.slice(0, -1), R = Math.max.apply(null, body.map(function (l) { return l.x1; }));
    if (R > f.r - 3 && body.every(function (l) { return Math.abs(l.x1 - R) < 1.5; })) return body.length >= 2 ? 'both' : 'both?';
    return 'left';
  }

  /* Pictures that sit side by side share a paragraph. */
  function groupImages(images, f) {
    var groups = [];
    images.slice().sort(function (a, b) { return a.top - b.top; }).forEach(function (im) {
      var g = groups[groups.length - 1];
      if (g) {
        var overlap = Math.min(g.bottom, im.bottom) - Math.max(g.top, im.top);
        if (overlap > 0.5 * Math.min(g.bottom - g.top, im.bottom - im.top)) {
          g.items.push(im); g.top = Math.min(g.top, im.top); g.bottom = Math.max(g.bottom, im.bottom);
          g.x0 = Math.min(g.x0, im.x0); g.x1 = Math.max(g.x1, im.x1);
          return;
        }
      }
      groups.push({ kind: 'img', flow: f, items: [im], top: im.top, bottom: im.bottom, x0: im.x0, x1: im.x1 });
    });
    groups.forEach(function (g) { g.items.sort(function (a, b) { return a.x0 - b.x0; }); });
    return groups;
  }

  /* One page → an ordered list of blocks (paragraphs and picture groups),
     each with the gap above it. */
  function layoutPage(raw) {
    var lines = buildLines(raw.items), dropped = 0;
    var typical = pitchTable(lines);
    lines = lines.filter(function (l) { if (isPageNumber(l, raw.h)) { dropped++; return false; } return true; });
    var hasText = lines.length > 0;
    var images = raw.images.filter(function (im) {
      var area = (Math.min(im.x1, raw.w) - Math.max(im.x0, 0)) * (Math.min(im.bottom, raw.h) - Math.max(im.top, 0));
      /* A full-page picture under a text layer is a scan with OCR'd text:
         the text is what the reader wants. */
      if ((raw.ocr && area > 0.5 * raw.w * raw.h) || (hasText && area > 0.8 * raw.w * raw.h)) { raw.skippedImages = (raw.skippedImages || 0) + 1; return false; }
      return true;
    });
    /* A small disc, square or ring just left of a line, at the height of its
       text, is that line's bullet. */
    (raw.dots || []).forEach(function (d) {
      var cy = (d.y0 + d.y1) / 2;
      for (var i = 0; i < lines.length; i++) {
        var l = lines[i];
        if (l.marker || d.y1 - d.y0 > 0.8 * l.size || cy < l.base - 0.9 * l.size || cy > l.base) continue;
        var gap = l.x0 - d.x1;
        if (gap < 1 || gap > 3 * l.size) continue;
        l.marker = { kind: 'bullet', glyph: d.hollow ? '◦' : '•', len: 0, strong: true, vector: true, x: d.x0, textX: l.x0 };
        break;
      }
    });
    var L = Infinity, R = -Infinity;
    lines.forEach(function (l) { L = Math.min(L, l.marker && l.marker.vector ? l.marker.x : l.x0); R = Math.max(R, l.x1); });
    if (!lines.length) images.forEach(function (im) { L = Math.min(L, im.x0); R = Math.max(R, im.x1); });
    if (!isFinite(L)) { L = 72; R = raw.w - 72; }
    var flows = columnFlows(lines, images, L, R), blocks = [], carry = null;
    flows.forEach(function (f, fi) {
      f.typical = typical;
      var list = buildParas(f.lines, f).concat(groupImages(f.images, f));
      list.sort(function (a, b) { return a.top - b.top; });
      /* A sentence that runs off the foot of the left column carries on at the top of the right one. */
      if (carry && f.side === 'R' && f.band === carry.flow.band && list[0] && continues(carry, list[0])) {
        var B = list.shift();
        joinRuns(carry.runs, B.runs);
        carry.lines = carry.lines.concat(B.lines);
        carry.bottom = B.bottom;
        carry.text = carry.runs.map(function (r) { return r.text; }).join('');
        carry.chars += B.chars;
      }
      list.forEach(function (b, i) { b.newFlow = i === 0 && fi > 0; blocks.push(b); });
      var last = list[list.length - 1];
      carry = f.side === 'L' && last && last.kind === 'text' ? last : null;
    });
    /* Rotated text (margin notes, sideways tables) is read in its own frame
       and goes at the end of the page. */
    var byAngle = {};
    raw.rotated.forEach(function (it) { (byAngle[Math.round(it.angle * 180 / Math.PI)] = byAngle[Math.round(it.angle * 180 / Math.PI)] || []).push(it); });
    Object.keys(byAngle).forEach(function (deg) {
      var a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
      var items = byAngle[deg].map(function (it) {
        return { str: it.str, x: it.x * c + it.base * s, base: -it.x * s + it.base * c, w: it.w, size: it.size, font: it.font };
      });
      var rl = buildLines(items);
      if (!rl.length) return;
      var f = { l: Math.min.apply(null, rl.map(function (l) { return l.x0; })), r: Math.max.apply(null, rl.map(function (l) { return l.x1; })), rot: true, typical: pitchTable(rl) };
      f.shift = f.l - L;
      buildParas(rl, f).forEach(function (p, i) { p.newFlow = i === 0; p.rot = true; blocks.push(p); });
    });
    var prev = null;
    blocks.forEach(function (b) {
      if (prev) {
        var gap = b.top - prev.bottom;
        b.gap = b.rot || (b.newFlow && (gap < 0 || gap > 48)) ? PARA_GAP : clamp(gap, 0, 1500);
      }
      prev = b;
    });
    var bounds = null;
    lines.forEach(function (l) { bounds = grow(bounds, l.marker && l.marker.vector ? l.marker.x : l.x0, l.base - l.size, l.x1, l.base + 0.25 * l.size); });
    images.forEach(function (im) { bounds = grow(bounds, im.x0, im.top, im.x1, im.bottom); });
    return { n: raw.n, w: raw.w, h: raw.h, blocks: blocks, bounds: bounds, colL: L, dropped: dropped, ocr: !!raw.ocr, skippedImages: raw.skippedImages || 0 };
  }
  function continues(A, B) {
    if (A.kind !== 'text' || B.kind !== 'text' || A.tabbed || B.tabbed || B.marker || Math.abs(A.size - B.size) > 0.6) return false;
    var last = A.lines[A.lines.length - 1], f = A.flow;
    if (last.x1 < f.r - 0.2 * (f.r - f.l)) return false;
    return !/[.!?:;"”’)\]]\s*$/.test(A.text) || /^[a-z]/.test(B.text);
  }

  function grow(b, x0, y0, x1, y1) {
    if (!b) return { l: x0, t: y0, r: x1, b: y1 };
    b.l = Math.min(b.l, x0); b.t = Math.min(b.t, y0); b.r = Math.max(b.r, x1); b.b = Math.max(b.b, y1);
    return b;
  }

  /* --- the whole document ------------------------------------------------------------
     Body size, headings, lists, sections (page size and margins). */

  /* Running headers and footers: the same line (numbers aside) near the top
     or bottom edge of many pages. They would otherwise interrupt the text
     wherever the pages meet, so they are left out. */
  function dropRunningLines(pages) {
    if (pages.length < 3) return 0;
    var keyOf = function (P, pg) {
      if (P.kind !== 'text' || P.lines.length > 1 || P.rot) return null;
      if (P.top > pg.h * 0.1 && P.bottom < pg.h * 0.9) return null;
      return (P.top <= pg.h * 0.1 ? 'T' : 'B') + P.text.replace(/\s+/g, '').replace(/\d+/g, '#').toLowerCase();
    };
    var seen = {};
    pages.forEach(function (pg) {
      var keys = {};
      pg.blocks.forEach(function (P) { var k = keyOf(P, pg); if (k) keys[k] = 1; });
      Object.keys(keys).forEach(function (k) { seen[k] = (seen[k] || 0) + 1; });
    });
    var need = Math.max(3, Math.ceil(pages.length * 0.3)), dropped = 0;
    pages.forEach(function (pg) {
      pg.blocks = pg.blocks.filter(function (P) {
        var k = keyOf(P, pg);
        if (k && seen[k] >= need) { dropped++; return false; }
        return true;
      });
    });
    return dropped;
  }

  function finishDocument(pages) {
    var running = dropRunningLines(pages);
    var paras = [], sizes = {}, fams = {}, boldChars = 0, allChars = 0;
    pages.forEach(function (p) { p.blocks.forEach(function (b) { if (b.kind === 'text') paras.push(b); }); });
    paras.forEach(function (P) {
      P.runs.forEach(function (r) {
        var n = r.text.replace(/\s+/g, '').length;
        if (!n) return;
        tally(sizes, r.size, n); allChars += n;
        if (r.family) tally(fams, r.family, n);
        if (r.bold) boldChars += n;
      });
    });
    var body = +topKey(sizes) || 11, family = topKey(fams) || 'Arial';

    /* Justified text: two-line paragraphs only count when the rest of the document is justified. */
    var just = 0, ragged = 0;
    paras.forEach(function (P) { if (P.lines.length >= 3 && !P.marker && !P.tabbed) { if (P.align === 'both') just++; else if (P.align === 'left') ragged++; } });
    paras.forEach(function (P) { if (P.align === 'both?') P.align = just > ragged && just > 0 ? 'both' : 'left'; });

    /* Headings: noticeably bigger than the body text, and short. Sizes are
       grouped and the biggest group is Heading 1. A whole bold line at body
       size, with space above it and not inside a table, comes one level below
       the smallest size group. */
    var cands = [];
    pages.forEach(function (pg) {
      pg.blocks.forEach(function (P, i) {
        if (P.kind !== 'text' || P.tabbed || !P.chars || P.rot || !/\p{L}/u.test(P.text)) return;
        var text = P.text.trim(), sentence = P.chars > 60 && /[.!?]$/.test(text);
        /* SMALL CAPS or ALL CAPS subheadings at body size */
        var caps = P.chars >= 4 && P.chars <= 60 && /\p{Lu}{2}/u.test(text) && !/\p{Ll}/u.test(text);
        var prev = pg.blocks[i - 1], next = pg.blocks[i + 1];
        if (P.size >= body * 1.15 && P.size - body >= 1 && P.chars <= 200 && !sentence && (P.lines.length === 1 || (P.lines.length <= 3 && P.size >= body * 1.3))) {
          P.hkind = 'size'; cands.push(P);
        } else if (((P.allBold && boldChars < 0.3 * allChars && P.size >= body * 0.95) || (caps && P.size >= body * 0.75)) &&
          !P.marker && P.lines.length === 1 && P.chars >= 2 && P.chars <= 80 &&
          !/[.,;]$/.test(text) && allChars > 300 && (i === 0 || P.gap >= 0.4 * body) &&
          !(prev && prev.tabbed) && !(next && next.tabbed)) {
          P.hkind = 'bold'; cands.push(P);
        }
      });
    });
    var groups = [];
    cands.filter(function (P) { return P.hkind === 'size'; }).map(function (P) { return P.size; })
      .sort(function (a, b) { return b - a; })
      .forEach(function (s) {
        var g = groups[groups.length - 1];
        if (!g || g.top - s > Math.max(1, g.top * 0.06)) groups.push({ top: s, min: s });
        else g.min = s;
      });
    function levelOf(P) {
      if (P.hkind === 'bold') return Math.min(3, groups.length + 1);
      for (var i = 0; i < groups.length; i++) if (P.size >= groups[i].min - 0.01) return Math.min(3, i + 1);
      return 3;
    }
    var levels = [null, [], [], []];
    cands.forEach(function (P) { P.level = levelOf(P); P.marker = null; levels[P.level].push(P); });
    var headStyles = [1, 2, 3].map(function (lv) {
      var list = levels[lv], fam = {}, bold = 0;
      if (!list.length) return { family: family, bold: true, italic: false, size: half(body * [0, 1.6, 1.3, 1.15][lv]) };
      list.forEach(function (P) { tally(fam, P.lines[0].runs[0].family || family, P.chars); if (P.allBold) bold++; });
      return { family: topKey(fam) || family, bold: bold * 2 >= list.length, italic: false, size: half(median(list.map(function (P) { return P.size; }))) };
    });

    /* Lists: one Word numbering definition per kind of marker; numbered
       items continue a list while the numbers run on. */
    var abstracts = [], nums = [], absByKey = {}, bulletNum = {}, seqs = {};
    function abstractFor(key, make) {
      if (absByKey[key] === undefined) { absByKey[key] = abstracts.length; abstracts.push(make()); }
      return absByKey[key];
    }
    paras.forEach(function (P) {
      var mk = P.marker;
      if (!mk) return;
      if (mk.kind === 'bullet') {
        if (!bulletNum[mk.glyph]) {
          var a = abstractFor('b' + mk.glyph, function () { return { fmt: 'bullet', text: mk.glyph }; });
          nums.push({ abs: a, start: 0 });
          bulletNum[mk.glyph] = nums.length;
        }
        P.numId = bulletNum[mk.glyph];
      } else {
        var key = mk.fmt + mk.prefix + mk.suffix;
        var ab = abstractFor(key, function () { return { fmt: mk.fmt, text: mk.prefix + '%1' + mk.suffix }; });
        var sk = key + '@' + Math.round(mk.x / 6) + '@' + P.flow.l;
        var seq = seqs[sk];
        if (!seq || mk.n !== seq.last + 1) {
          nums.push({ abs: ab, start: mk.n });
          seq = seqs[sk] = { id: nums.length, last: mk.n };
        } else seq.last = mk.n;
        P.numId = seq.id;
      }
      stripLead(P.runs, mk.len);
    });
    /* Items of one list share one indent, whatever small differences the PDF has. */
    var byNum = {};
    paras.forEach(function (P) { if (P.numId) (byNum[P.numId] = byNum[P.numId] || []).push(P); });
    Object.keys(byNum).forEach(function (id) {
      var list = byNum[id], mx = median(list.map(function (P) { return P.marker.x; })), tx = median(list.map(function (P) { return P.marker.textX; }));
      list.forEach(function (P) { if (Math.abs(P.marker.x - mx) < 4) { P.listX = mx; P.listTextX = tx; } });
    });

    /* Sections: runs of pages of the same size, with margins that fit every page's content. */
    var sections = [];
    pages.forEach(function (p) {
      var s = sections[sections.length - 1];
      if (!s || Math.abs(s.w - p.w) > 1 || Math.abs(s.h - p.h) > 1) { s = { w: p.w, h: p.h, pages: [] }; sections.push(s); }
      s.pages.push(p);
    });
    sections.forEach(function (s) {
      var b = s.pages.filter(function (p) { return p.bounds; }).map(function (p) { return p.bounds; });
      var W = Math.min(s.w, MAX_PAGE_PT), H = Math.min(s.h, MAX_PAGE_PT);
      if (!b.length) { s.left = s.right = s.top = s.bottom = Math.min(72, W / 5, H / 5); return; }
      var l = Math.min.apply(null, b.map(function (x) { return x.l; })), r = Math.min.apply(null, b.map(function (x) { return s.w - x.r; }));
      var t = Math.min.apply(null, b.map(function (x) { return x.t; })), bt = Math.min.apply(null, b.map(function (x) { return s.h - x.b; }));
      s.left = clamp(l, 14, W * 0.4);
      /* Short lines don't make a wide margin: keep the right margin no wider than a normal one. */
      s.right = clamp(Math.min(r - 3, Math.max(s.left, 72)), 10, W * 0.4);
      s.top = clamp(t, 14, H * 0.4);
      s.bottom = clamp(Math.min(bt, 36), 14, H * 0.4);
      if (W - s.left - s.right < 72) s.left = s.right = Math.max(0, (W - 72) / 2);
    });
    return { pages: pages, sections: sections, body: body, family: family, headStyles: headStyles,
      numbering: abstracts.length ? { abstracts: abstracts, nums: nums } : null,
      paras: paras.length, headings: cands.length, running: running, listItems: paras.filter(function (P) { return P.numId; }).length };
  }

  function stripLead(runs, n) {
    while (n > 0 && runs.length) {
      var r = runs[0];
      if (r.text.length <= n) { n -= r.text.length; runs.shift(); } else { r.text = r.text.slice(n); n = 0; }
    }
    if (runs[0]) runs[0].text = runs[0].text.replace(/^\s+/, '');
  }

  /* --- WordprocessingML ------------------------------------------------------------ */

  var NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  var XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

  function fontsXml(f) {
    var n = esc(f);
    return '<w:rFonts w:ascii="' + n + '" w:hAnsi="' + n + '" w:eastAsia="' + n + '" w:cs="' + n + '"/>';
  }

  function runXml(r, base) {
    var p = '';
    if (r.family && r.family !== base.family) p += fontsXml(r.family);
    if (!!r.bold !== !!base.bold) p += r.bold ? '<w:b/><w:bCs/>' : '<w:b w:val="0"/><w:bCs w:val="0"/>';
    if (!!r.italic !== !!base.italic) p += r.italic ? '<w:i/><w:iCs/>' : '<w:i w:val="0"/><w:iCs w:val="0"/>';
    if (halfPt(r.size) !== halfPt(base.size)) p += '<w:sz w:val="' + halfPt(r.size) + '"/><w:szCs w:val="' + halfPt(r.size) + '"/>';
    if (r.vert) p += '<w:vertAlign w:val="' + (r.vert === 'sup' ? 'superscript' : 'subscript') + '"/>';
    var body = r.text.replace(/\u00AD/g, '').split('\t').map(function (t) {
      return t ? '<w:t xml:space="preserve">' + esc(t) + '</w:t>' : '';
    }).join('<w:tab/>');
    return body ? '<w:r>' + (p ? '<w:rPr>' + p + '</w:rPr>' : '') + body + '</w:r>' : '';
  }

  function runsXml(runs, base) {
    var out = '', cur = null;
    runs.forEach(function (r) {
      if (!r.text) return;
      if (cur && sameStyle(cur, r)) cur.text += r.text;
      else { if (cur) out += runXml(cur, base); cur = { text: r.text, family: r.family, bold: r.bold, italic: r.italic, size: r.size, vert: r.vert }; }
    });
    if (cur) out += runXml(cur, base);
    return out;
  }

  function pXml(o) {
    var p = '';
    if (o.style) p += '<w:pStyle w:val="' + o.style + '"/>';
    if (o.pageBreak) p += '<w:pageBreakBefore/>';
    if (o.numId) p += '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="' + o.numId + '"/></w:numPr>';
    /* Tab stops in order, one per position. */
    var stops = (o.tabs || []).filter(function (t) { return t.pos > 0; }).sort(function (a, b) { return a.pos - b.pos; })
      .filter(function (t, i, all) { return !i || tw(t.pos) !== tw(all[i - 1].pos); });
    if (stops.length) {
      p += '<w:tabs>' + stops.map(function (t) { return '<w:tab w:val="' + t.val + '" w:pos="' + tw(t.pos) + '"/>'; }).join('') + '</w:tabs>';
    }
    p += '<w:spacing w:before="' + tw(o.before || 0) + '" w:after="0"' +
      (o.lh ? ' w:line="' + tw(o.lh) + '" w:lineRule="' + (o.lineRule || 'atLeast') + '"' : '') + '/>';
    if (o.ind) {
      p += '<w:ind w:left="' + tw(o.ind.left) + '"' + (o.ind.right > 0 ? ' w:right="' + tw(o.ind.right) + '"' : '') +
        (o.ind.first > 0.5 ? ' w:firstLine="' + tw(o.ind.first) + '"' : o.ind.first < -0.5 ? ' w:hanging="' + tw(-o.ind.first) + '"' : '') + '/>';
    }
    if (o.jc) p += '<w:jc w:val="' + o.jc + '"/>';
    if (o.rPr) p += '<w:rPr>' + o.rPr + '</w:rPr>';
    if (o.sect) p += o.sect;
    return '<w:p><w:pPr>' + p + '</w:pPr>' + (o.body || '') + '</w:p>';
  }

  function sectXml(s) {
    var W = Math.min(s.w, MAX_PAGE_PT), H = Math.min(s.h, MAX_PAGE_PT);
    return '<w:sectPr><w:pgSz w:w="' + tw(W) + '" w:h="' + tw(H) + '"' + (W > H ? ' w:orient="landscape"' : '') + '/>' +
      '<w:pgMar w:top="' + tw(s.top) + '" w:right="' + tw(s.right) + '" w:bottom="' + tw(s.bottom) + '" w:left="' + tw(s.left) + '"' +
      ' w:header="' + tw(Math.min(36, s.top / 2)) + '" w:footer="' + tw(Math.min(36, s.bottom / 2)) + '" w:gutter="0"/><w:cols w:space="720"/></w:sectPr>';
  }

  /* Pictures: every file goes into word/media once, however often it is shown. */
  function Media() { this.list = []; this.byKey = new Map(); this.byHash = {}; this.pic = 0; }
  Media.prototype.add = function (enc) {
    if (this.byKey.has(enc)) return this.byKey.get(enc);
    var b = enc.bytes, h = 0x811c9dc5;
    for (var i = 0; i < b.length; i++) h = Math.imul(h ^ b[i], 16777619);
    var hash = enc.ext + b.length + ':' + (h >>> 0);
    var item = this.byHash[hash];
    if (!item) {
      var n = this.list.length + 1;
      item = this.byHash[hash] = { rid: 'rIdImg' + n, name: 'image' + n + '.' + enc.ext, bytes: b, ext: enc.ext };
      this.list.push(item);
    }
    this.byKey.set(enc, item);
    return item;
  };
  Media.prototype.drawing = function (item, wPt, hPt, anchor) {
    var id = ++this.pic, cx = emu(wPt), cy = emu(hPt);
    var graphic = '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>' +
      '<pic:nvPicPr><pic:cNvPr id="' + id + '" name="' + item.name + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
      '<pic:blipFill><a:blip r:embed="' + item.rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
      '</pic:pic></a:graphicData></a:graphic>';
    var size = '<wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:effectExtent l="0" t="0" r="0" b="0"/>';
    var tail = '<wp:docPr id="' + id + '" name="Picture ' + id + '"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>' + graphic;
    if (anchor) {
      return '<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="' + (251658240 + id) +
        '" behindDoc="1" locked="1" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/>' +
        '<wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH>' +
        '<wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV>' +
        size + '<wp:wrapNone/>' + tail + '</wp:anchor></w:drawing></w:r>';
    }
    return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">' + size + tail + '</wp:inline></w:drawing></w:r>';
  };

  function styleRpr(s, docFamily) {
    return (s.family && s.family !== docFamily ? fontsXml(s.family) : '') + (s.bold ? '<w:b/><w:bCs/>' : '') +
      (s.italic ? '<w:i/><w:iCs/>' : '') + '<w:sz w:val="' + halfPt(s.size) + '"/><w:szCs w:val="' + halfPt(s.size) + '"/>';
  }

  function stylesXml(family, body, heads) {
    var out = XML_HEAD + '<w:styles ' + NS + '>' +
      '<w:docDefaults><w:rPrDefault><w:rPr>' + fontsXml(family) + '<w:sz w:val="' + halfPt(body) + '"/><w:szCs w:val="' + halfPt(body) + '"/></w:rPr></w:rPrDefault>' +
      '<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
      '<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/><w:unhideWhenUsed/></w:style>';
    heads.forEach(function (h, i) {
      out += '<w:style w:type="paragraph" w:styleId="Heading' + (i + 1) + '"><w:name w:val="heading ' + (i + 1) + '"/><w:basedOn w:val="Normal"/>' +
        '<w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="240" w:after="60"/>' +
        '<w:outlineLvl w:val="' + i + '"/></w:pPr><w:rPr>' + styleRpr(h, family) + '</w:rPr></w:style>';
    });
    out += '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="34"/><w:qFormat/></w:style>';
    return out + '</w:styles>';
  }

  function numberingXml(nb) {
    var out = XML_HEAD + '<w:numbering ' + NS + '>';
    nb.abstracts.forEach(function (a, i) {
      out += '<w:abstractNum w:abstractNumId="' + i + '"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/>' +
        '<w:numFmt w:val="' + a.fmt + '"/><w:lvlText w:val="' + esc(a.text) + '"/><w:lvlJc w:val="left"/>' +
        '<w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>';
    });
    nb.nums.forEach(function (n, i) {
      out += '<w:num w:numId="' + (i + 1) + '"><w:abstractNumId w:val="' + n.abs + '"/>' +
        (n.start > 1 ? '<w:lvlOverride w:ilvl="0"><w:startOverride w:val="' + n.start + '"/></w:lvlOverride>' : '') + '</w:num>';
    });
    return out + '</w:numbering>';
  }

  async function zipDocx(o) {
    await U.script('assets/vendor/jszip/jszip.min.js');
    var zip = new window.JSZip();
    var types = XML_HEAD + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' +
      (o.numbering ? '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' : '') +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>';
    zip.file('[Content_Types].xml', types);
    zip.file('_rels/.rels', XML_HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
      '</Relationships>');
    var now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    zip.file('docProps/core.xml', XML_HEAD + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
      'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" ' +
      'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' + (o.title ? '<dc:title>' + esc(o.title) + '</dc:title>' : '') +
      '<dcterms:created xsi:type="dcterms:W3CDTF">' + now + '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + now + '</dcterms:modified>' +
      '</cp:coreProperties>');
    var rels = '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>' +
      (o.numbering ? '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>' : '');
    o.media.list.forEach(function (m) {
      rels += '<Relationship Id="' + m.rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + m.name + '"/>';
      zip.file('word/media/' + m.name, m.bytes, { binary: true, compression: 'STORE' });
    });
    zip.file('word/_rels/document.xml.rels', XML_HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels + '</Relationships>');
    zip.file('word/document.xml', XML_HEAD + '<w:document ' + NS + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
      'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>' + o.body + '</w:body></w:document>');
    zip.file('word/styles.xml', o.styles);
    zip.file('word/settings.xml', XML_HEAD + '<w:settings ' + NS + '><w:defaultTabStop w:val="720"/><w:characterSpacingControl w:val="doNotCompress"/>' +
      '<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>');
    if (o.numbering) zip.file('word/numbering.xml', numberingXml(o.numbering));
    return zip.generateAsync({ type: 'blob', mimeType: DOCX_TYPE, compression: 'DEFLATE', compressionOptions: { level: 6 } });
  }

  /* --- editable document ----------------------------------------------------------- */

  function textParaXml(P, s, doc) {
    var head = P.level ? doc.headStyles[P.level - 1] : null;
    var base = head || { family: doc.family, bold: false, italic: false, size: doc.body };
    var shift = P.flow.shift || 0, o = { before: P.before, lh: P.lh, pageBreak: P.pageBreak, sect: P.sect };
    if (head) o.style = 'Heading' + P.level;
    else if (P.numId) o.style = 'ListParagraph';
    var maxInd = Math.min(s.w, MAX_PAGE_PT) - s.left - s.right - 36;
    var ind = function (x) { return clamp(x - shift - s.left, -s.left, maxInd); };
    if (P.numId) {
      o.numId = P.numId;
      var mk = P.marker || {};
      var markX = P.listX !== undefined ? P.listX : mk.x !== undefined ? mk.x : P.x0;
      var textX = P.listTextX !== undefined ? P.listTextX : mk.textX !== undefined ? mk.textX : markX + 18;
      var need = ((mk.label || mk.glyph || '•').length * 0.55 + 0.35) * P.size;
      var hang = Math.max(textX - markX, need);
      o.ind = { left: ind(markX) + hang, first: -hang };
    } else if (P.tabbed) {
      var segs = P.lines[0].segs, stops = [];
      segs.slice(1).forEach(function (sg, i) {
        var last = i === segs.length - 2;
        if (last && Math.abs(sg.x1 - P.flow.r) < 3 && sg.x1 - sg.x0 < 0.4 * (P.flow.r - P.flow.l)) stops.push({ val: 'right', pos: ind(sg.x1) });
        else stops.push({ val: 'left', pos: ind(sg.x0) });
      });
      o.tabs = stops.filter(function (t) { return t.pos > 0; });
      o.ind = { left: ind(P.x0), first: 0 };
    } else if (P.align === 'left' || P.align === 'both') {
      var cont = P.lines.length > 1 ? P.contX : P.x0;
      o.ind = { left: ind(cont), first: P.lines.length > 1 ? P.x0 - P.contX : 0 };
      if (P.lines.length === 1 && doc.firstIndent && Math.abs(P.x0 - P.flow.l - doc.firstIndent) < 2) o.ind = { left: ind(P.flow.l), first: doc.firstIndent };
      if (P.lines.length >= 3 && P.x0 > P.flow.l + 2 * P.size && P.flow.r - P.maxX1 > 3 * P.size) o.ind.right = P.flow.r - P.maxX1 - P.size;
    }
    if (o.ind && Math.abs(o.ind.left) < 0.5 && Math.abs(o.ind.first) < 0.5 && !o.ind.right) o.ind = null;
    if (P.align === 'center' || P.align === 'right' || P.align === 'both') o.jc = P.align;
    o.body = runsXml(P.runs, base);
    return pXml(o);
  }

  function imageParaXml(g, s, doc, media) {
    var f = g.flow, shift = f.shift || 0;
    var cw = Math.min(s.w, MAX_PAGE_PT) - s.left - s.right, ch = Math.min(s.h, MAX_PAGE_PT) - s.top - s.bottom - 12;
    var k = Math.min(1, cw / Math.max(1, g.x1 - g.x0), ch / Math.max(1, g.bottom - g.top));
    var o = { before: g.before, pageBreak: g.pageBreak, sect: g.sect }, runs = '';
    var colW = f.r - f.l, left = clamp((g.x0 - shift - s.left) * k, 0, Math.max(0, cw - (g.x1 - g.x0) * k));
    if (g.items.length === 1 && Math.abs((g.x0 + g.x1) / 2 - (f.l + f.r) / 2) < Math.max(6, 0.05 * colW) && g.x0 > f.l + 12) o.jc = 'center';
    else if (g.items.length === 1 && Math.abs(g.x1 - f.r) < 4 && g.x0 - f.l > 0.2 * colW) o.jc = 'right';
    else if (left > 0.5) o.ind = { left: left, first: 0 };
    o.tabs = [];
    g.items.forEach(function (im, i) {
      if (i) {
        var pos = left + (im.x0 - g.x0) * k;
        o.tabs.push({ val: 'left', pos: pos });
        runs += '<w:r><w:tab/></w:r>';
      }
      runs += media.drawing(media.add(im.media), (im.x1 - im.x0) * k, (im.bottom - im.top) * k, false);
    });
    o.body = runs;
    return pXml(o);
  }

  function editableBody(doc, media) {
    /* A single-line paragraph indented like the first line of the document's
       wrapped paragraphs keeps a first-line indent rather than a whole-paragraph one. */
    var firsts = {};
    doc.pages.forEach(function (p) {
      p.blocks.forEach(function (b) { if (b.kind === 'text' && b.lines.length > 1 && !b.numId && b.x0 - b.contX > 3) tally(firsts, half(b.x0 - b.contX), 1); });
    });
    doc.firstIndent = +topKey(firsts) || 0;
    var out = '';
    doc.sections.forEach(function (s, si) {
      var last = si === doc.sections.length - 1, xml = [];
      s.pages.forEach(function (p, pi) {
        var blocks = p.blocks.length ? p.blocks : [{ kind: 'empty', top: s.top, gap: 0 }];
        blocks.forEach(function (b, bi) {
          b.before = bi === 0 ? (b.rot ? 0 : clamp(b.top - s.top, 0, 1500)) : b.gap || 0;
          b.pageBreak = bi === 0 && pi > 0;
        });
        blocks.forEach(function (b, bi) {
          if (!last && pi === s.pages.length - 1 && bi === blocks.length - 1) b.sect = sectXml(s);
          if (b.kind === 'text') xml.push(textParaXml(b, s, doc));
          else if (b.kind === 'img') xml.push(imageParaXml(b, s, doc, media));
          else xml.push(pXml({ before: b.before, pageBreak: b.pageBreak, sect: b.sect }));
        });
      });
      out += xml.join('');
      if (last) out += sectXml(s);
    });
    return out;
  }

  async function convertEditable(pdf, list, opts, job, report) {
    var lib = await K.libPdfjs(), pages = [], cache = {}, ocrPages = 0, ocrPictures = 0, ocrError = null, images = 0, skipped = 0, dropped = 0;
    for (var i = 0; i < list.length; i++) {
      if (job.cancelled) throw cancelled();
      var n = list[i] + 1, label = 'Page ' + n + ' (' + (i + 1) + ' of ' + list.length + ')';
      report(label + ': reading…', i / list.length);
      var raw = await readPage(pdf, n, lib, opts.images, cache);
      if (!raw.chars && opts.ocr && !ocrError) {
        try {
          report(label + ': reading the text with OCR…', i / list.length);
          var read = await ocrPage(pdf, n, job, function (p) { report(label + ': reading the text with OCR… ' + Math.round(p * 100) + '%', (i + p) / list.length); });
          /* A cover picture or a photo reads as nonsense with low confidence:
             keep the picture instead of the nonsense. */
          if (read.confidence >= OCR_MIN_CONFIDENCE && read.items.length) { raw.items = read.items; raw.ocr = true; ocrPages++; }
          else ocrPictures++;
        } catch (e) {
          if (e.cancelled || job.cancelled) throw cancelled();
          ocrError = e;
        }
      }
      var laid = layoutPage(raw);
      laid.blocks.forEach(function (b) { if (b.kind === 'img') images += b.items.length; });
      skipped += laid.skippedImages; dropped += laid.dropped;
      pages.push(laid);
      await new Promise(function (r) { setTimeout(r, 0); });
    }
    report('Writing the Word document…', 1);
    var doc = finishDocument(pages), media = new Media();
    var body = editableBody(doc, media);
    var title = opts.title;
    if (!title) {
      var h1 = null;
      doc.pages.some(function (p) { return p.blocks.some(function (b) { if (b.level === 1) { h1 = b; return true; } return false; }); });
      title = h1 ? h1.runs.map(function (r) { return r.text; }).join('').trim() : '';
    }
    var blob = await zipDocx({ body: body, media: media, numbering: doc.numbering, title: title,
      styles: stylesXml(doc.family, doc.body, doc.headStyles) });
    return { blob: blob, pages: list.length, paragraphs: doc.paras, headings: doc.headings, listItems: doc.listItems,
      images: images, running: doc.running, ocrPages: ocrPages, ocrPictures: ocrPictures, ocrError: ocrError, skipped: skipped, dropped: dropped };
  }

  /* --- exact look ------------------------------------------------------------------
     One section per page, the page's size, and the rendered page as a picture
     anchored behind the text at the page's top-left corner. */

  async function convertExact(pdf, list, opts, job, report) {
    var media = new Media(), xml = [];
    for (var i = 0; i < list.length; i++) {
      if (job.cancelled) throw cancelled();
      var n = list[i] + 1;
      report('Page ' + n + ' (' + (i + 1) + ' of ' + list.length + '): rendering…', i / list.length);
      var page = await pdf.getPage(n), vp = page.getViewport({ scale: 1 });
      var scale = Math.min(EXACT_DPI / 72, 5000 / Math.max(vp.width, vp.height));
      var r = await K.renderPage(pdf, n, scale);
      var bytes = await K.canvasBytes(r.canvas, 'image/jpeg', 0.88);
      r.canvas.width = 0;
      var k = Math.min(1, MAX_PAGE_PT / Math.max(r.width, r.height));
      var s = { w: r.width * k, h: r.height * k, left: 0, right: 0, top: 0, bottom: 0 };
      var item = media.add({ bytes: bytes, ext: 'jpeg' });
      xml.push(pXml({ before: 0, lh: 1, lineRule: 'exact', rPr: '<w:sz w:val="2"/><w:szCs w:val="2"/>', sect: i < list.length - 1 ? sectXml(s) : null,
        body: media.drawing(item, s.w, s.h, true) }));
      if (i === list.length - 1) xml.push(sectXml(s));
    }
    report('Writing the Word document…', 1);
    var blob = await zipDocx({ body: xml.join(''), media: media, numbering: null, title: opts.title, styles: stylesXml('Arial', 11, [
      { family: 'Arial', bold: true, size: 16 }, { family: 'Arial', bold: true, size: 13 }, { family: 'Arial', bold: true, size: 12 }]) });
    return { blob: blob, pages: list.length, images: list.length };
  }

  /* --- the tool -------------------------------------------------------------------- */

  Tools.register({
    id: 'pdf-to-word', category: 'pdf', name: 'PDF to Word',
    description: 'Convert a PDF into a Word document (.docx) you can edit, keeping headings, bold and italic, lists, pictures and page size. Scanned pages can be read with OCR, and everything happens in your browser.',
    keywords: ['pdf to word', 'pdf to docx', 'convert pdf to word', 'pdf to doc', 'editable', 'edit pdf in word', 'word document', 'docx',
      'pdf converter', 'microsoft word', 'google docs', 'libreoffice', 'scanned pdf to word', 'ocr', 'pdf to editable text'],
    render: function (root) {
      root.classList.add('g-pdfw');
      var job = { cancelled: false }, current = null;
      U.onTeardown(root, function () {
        job.cancelled = true;
        ocrRelease();
        if (current) K.closePdf(current);
      });

      K.singlePdf(root, {
        label: 'Drop a PDF here or click to upload',
        hint: 'It is converted on this device. Nothing is uploaded.',
        onLoad: async function (ctx) {
          job.cancelled = true;
          job = { cancelled: false };
          if (current) { K.closePdf(current); current = null; }
          var pdf;
          try {
            pdf = await K.openPdfjs(ctx.bytes);
          } catch (e) {
            if (e.code !== 'NEED_PASSWORD') throw e;
            askPassword(ctx);
            return;
          }
          await setup(ctx, pdf);
        }
      });

      function askPassword(ctx) {
        var pw = U.input({ type: 'password', placeholder: 'Password', 'aria-label': 'PDF password' });
        var msg = U.note('This PDF needs a password to open.');
        var open = U.button('Open', null, 'primary');
        open.addEventListener('click', K.runBusy(open, async function () {
          try {
            var pdf = await K.openPdfjs(ctx.bytes, pw.value);
            ctx.body.replaceChildren();
            await setup(ctx, pdf);
          } catch (e) { msg.className = 'note err'; msg.textContent = e.message || String(e); }
        }));
        pw.addEventListener('keydown', function (e) { if (e.key === 'Enter') open.click(); });
        ctx.info.append(ctx.file.name);
        ctx.body.append(U.panel('Password needed', msg, U.row(pw, open)));
      }

      async function setup(ctx, pdf) {
        current = pdf;
        var count = pdf.numPages, myJob = job;
        ctx.info.replaceChildren(el('span', { text: ctx.file.name }), el('span', { class: 'muted', text: K.plural(count, 'page') + ' · ' + K.kb(ctx.file.size) }));
        var scanning = U.progress();
        var scanPanel = U.panel(null, scanning);
        ctx.body.append(scanPanel);
        var scanned = count <= MAX_EDIT_PAGES ? await findScanned(pdf, function (i) { scanning.set('Checking page ' + i + ' of ' + count + '…', i / count); }, myJob) : [];
        scanPanel.remove();
        if (myJob.cancelled) return;
        var title = '';
        try { var meta = await pdf.getMetadata(); title = meta && meta.info && meta.info.Title ? String(meta.info.Title).trim() : ''; } catch (e) { /* no metadata */ }

        var modeNote = U.note('');
        var mode = U.chips([{ value: 'edit', label: 'Editable text' }, { value: 'exact', label: 'Exact look' }], sync, 'edit');
        var ocrBox = U.checkbox(scanned.length === count
          ? 'This PDF has no text layer (it looks scanned). Read the text with OCR'
          : K.plural(scanned.length, 'page') + ' of ' + count + ' ' + (scanned.length === 1 ? 'has' : 'have') + ' no text layer. Read ' + (scanned.length === 1 ? 'it' : 'them') + ' with OCR',
          { checked: scanned.length > 0 });
        ocrBox.dataset.k = 'ocr';
        var ocrLang = U.select({ label: 'Language of the scanned text', value: 'eng',
          options: K.OCR_LANGS.map(function (l) { return { value: l[0], label: l[1] }; }) });
        var imgBox = U.checkbox('Include pictures', { checked: true });
        var pagesIn = U.input({ type: 'text', placeholder: 'All pages', 'aria-label': 'Pages to convert' });
        var go = U.button('Convert to Word', null, 'primary');
        var stop = U.button('Cancel', function () { job.cancelled = true; ocrRelease(); }, 'ghost');
        stop.style.display = 'none';
        var result = K.resultArea();
        var warn = count > WARN_PAGES ? U.note('This is a long PDF (' + K.plural(count, 'page') + '). Converting it may take a few minutes; you can convert a range of pages instead.') : null;

        function sync() {
          var exact = mode.value === 'exact';
          modeNote.textContent = exact
            ? 'Each page becomes a picture of itself, so the document looks exactly like the PDF, but its text cannot be edited, searched or copied in Word.'
            : 'The text is rebuilt as paragraphs, headings and lists you can edit. Fonts are matched by name, and complex layouts such as tables and columns are simplified.';
          ocrBox.style.display = !exact && scanned.length ? '' : 'none';
          ocrLang.style.display = ocrBox.style.display;
          imgBox.style.display = exact ? 'none' : '';
          result.replaceChildren();
        }
        sync();

        go.addEventListener('click', K.runBusy(go, async function () {
          var list;
          try {
            if (pagesIn.value.trim()) list = K.parsePages(pagesIn.value, count);
            else { list = []; for (var i = 0; i < count; i++) list.push(i); }
          } catch (e) { result.fail(e); return; }
          var exact = mode.value === 'exact';
          if (exact && list.length > MAX_EXACT_PAGES) { result.fail(new Error('Exact look handles up to ' + MAX_EXACT_PAGES + ' pages at a time. Enter a range such as 1-' + MAX_EXACT_PAGES + '.')); return; }
          if (!exact && list.length > MAX_EDIT_PAGES) { result.fail(new Error('This converts up to ' + MAX_EDIT_PAGES + ' pages at a time. Enter a range such as 1-' + MAX_EDIT_PAGES + '.')); return; }
          job = { cancelled: false, lang: ocrLang.querySelector('select').value };
          var mine = job;
          var prog = result.busy('Starting…', 0);
          stop.style.display = '';
          var report = function (text, frac) { if (!mine.cancelled) prog.set(text, frac); };
          try {
            var opts = { images: imgBox.input.checked, ocr: ocrBox.input.checked && scanned.length > 0, title: title };
            var out = exact ? await convertExact(pdf, list, opts, mine, report) : await convertEditable(pdf, list, opts, mine, report);
            if (mine.cancelled) throw cancelled();
            result.done('Converted ' + K.plural(out.pages, 'page') + ' to Word (' + K.kb(out.blob.size) + ')', out.blob,
              K.baseName(ctx.file.name) + '.docx', 'Download Word document', summary(out, exact));
          } catch (e) {
            if (e.cancelled || mine.cancelled) result.replaceChildren(U.note('Conversion cancelled.'));
            else result.fail(e);
          } finally {
            stop.style.display = 'none';
            ocrRelease();
          }
        }));

        ctx.body.append(U.panel(null, el('div', { class: 'g-wopts' },
          U.field('Output', mode), modeNote,
          el('div', { class: 'g-wchecks' }, ocrBox, imgBox), ocrLang,
          el('div', { class: 'g-wpages' }, U.field('Pages', pagesIn, 'For example 1-5, 8. Leave empty for all.')),
          warn, U.btnrow(go, stop)), result));
      }

      function summary(out, exact) {
        var items = [{ label: 'pages', value: String(out.pages) }];
        if (exact) items.push({ label: 'page images', value: String(out.images) });
        else {
          items.push({ label: 'paragraphs', value: String(out.paragraphs) }, { label: 'headings', value: String(out.headings) },
            { label: 'images', value: String(out.images) });
          if (out.listItems) items.push({ label: 'list items', value: String(out.listItems) });
        }
        var notes = [];
        if (exact) notes.push(U.note('The pages are pictures: the text in this document cannot be edited. Choose "Editable text" for a document you can change.'));
        else {
          notes.push(U.note(out.ocrPages ? 'OCR used on ' + K.plural(out.ocrPages, 'page') + '. Check the recognised text against the original: OCR is good, not perfect.' : 'OCR not used: the text came from the PDF itself.'));
          if (out.ocrPictures) notes.push(U.note(K.plural(out.ocrPictures, 'page') + ' without text looked like ' + (out.ocrPictures === 1 ? 'a picture' : 'pictures') + ' rather than writing, so ' + (out.ocrPictures === 1 ? 'it is' : 'they are') + ' kept as ' + (out.ocrPictures === 1 ? 'a picture.' : 'pictures.')));
          if (out.ocrError) notes.push(U.note('OCR could not run, so scanned pages are included as pictures: ' + (out.ocrError.message || out.ocrError), 'err'));
          if (out.skipped) notes.push(U.note('Left out ' + K.plural(out.skipped, 'full-page background picture') + ' behind the text.'));
          if (out.dropped) notes.push(U.note('Left out ' + K.plural(out.dropped, 'page number') + '; Word numbers its own pages.'));
          if (out.running) notes.push(U.note('Left out ' + (out.running === 1 ? '1 running header or footer' : out.running + ' running headers and footers') + ' repeated at the top or bottom of the pages.'));
        }
        return el('div', { class: 'stack' }, U.stats(items), notes);
      }
    }
  });
})();
