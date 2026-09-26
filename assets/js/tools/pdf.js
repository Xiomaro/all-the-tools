/* PDF tools: merge, split, compress, extract text, rotate, watermark, page
   numbers, metadata, unlock, grayscale, crop, redact and the document scanner.
   pdf-lib does structural edits; pdf.js renders pages and reads text. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  /* replaceChildren, skipping null/false placeholders */
  function setKids(node) {
    node.replaceChildren.apply(node, Array.prototype.slice.call(arguments, 1).filter(function (k) { return k !== null && k !== undefined && k !== false; }));
  }

  document.head.appendChild(el('style', { text: [
    '.g-pdf .g-file-line { display:flex; flex-wrap:wrap; gap:8px 14px; align-items:center; font-weight:600; }',
    '.g-pdf .g-file-line .muted { font-weight:400; color:var(--fg-muted); }',
    '.g-pdf .g-list { display:flex; flex-direction:column; gap:6px; }',
    '.g-pdf .g-item { display:flex; align-items:center; gap:8px; padding:6px 8px; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg-elev); }',
    '.g-pdf .g-item.drag { opacity:.4; }',
    '.g-pdf .g-item.over { border-color:var(--accent); }',
    '.g-pdf .g-item .idx { width:24px; text-align:center; color:var(--fg-muted); font-variant-numeric:tabular-nums; }',
    '.g-pdf .g-item .name { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }',
    '.g-pdf .g-item .size { color:var(--fg-muted); font-size:13px; white-space:nowrap; }',
    '.g-pdf .g-item .btn { padding:4px 10px; }',
    '.g-pdf .g-ok { color:var(--ok); font-weight:600; }',
    '.g-pdf .g-info { border-left:3px solid var(--accent); padding:8px 12px; background:var(--bg-sunken); border-radius:var(--radius); font-size:14px; }',
    '.g-pdf input[type=range] { width:100%; }',
    '.g-pdf .g-meta { display:grid; grid-template-columns:max-content 1fr; gap:6px 16px; }',
    '.g-pdf .g-meta dt { font-weight:600; color:var(--fg-muted); }',
    '.g-pdf .g-meta dd { margin:0; word-break:break-word; }',
    '.g-pdf .g-meta dd.unset { color:var(--fg-muted); font-style:italic; }',
    '.g-pdf .g-preview { position:relative; display:inline-block; max-width:100%; border:1px solid var(--border); background:#fff; }',
    '.g-pdf .g-preview canvas { display:block; max-width:100%; height:auto; }',
    '.g-pdf .g-shade { position:absolute; background:rgba(0,0,0,.45); pointer-events:none; }',
    '.g-pdf .g-pages { display:flex; flex-direction:column; gap:18px; align-items:center; }',
    '.g-pdf .g-rpage { position:relative; box-shadow:0 1px 6px rgba(0,0,0,.25); background:#fff; touch-action:none; user-select:none; cursor:crosshair; }',
    '.g-pdf .g-rpage canvas { display:block; width:100%; height:100%; }',
    '.g-pdf .g-rpage .lbl { position:absolute; top:-18px; left:0; font-size:12px; color:var(--fg-muted); }',
    '.g-pdf .g-box { position:absolute; background:#000; outline:1px solid rgba(255,0,0,.7); }',
    '.g-pdf .g-box.draft { background:rgba(0,0,0,.55); }',
    '.g-pdf .g-box button { position:absolute; top:-10px; right:-10px; width:20px; height:20px; border-radius:50%; border:0; background:var(--err); color:#fff; font-size:12px; line-height:20px; padding:0; cursor:pointer; display:none; }',
    '.g-pdf .g-box:hover button { display:block; }',
    '.g-pdf .g-stage { position:relative; display:inline-block; max-width:100%; touch-action:none; user-select:none; }',
    '.g-pdf .g-stage canvas { display:block; max-width:100%; max-height:70vh; }',
    '.g-pdf .g-stage svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; }',
    '.g-pdf .g-stage .h { fill:var(--accent); fill-opacity:.35; stroke:var(--accent); stroke-width:2; cursor:grab; }',
    '.g-pdf .g-thumbs { display:flex; flex-wrap:wrap; gap:12px; }',
    '.g-pdf .g-thumb { display:flex; flex-direction:column; gap:6px; align-items:center; padding:8px; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg-elev); }',
    '.g-pdf .g-thumb img { max-width:120px; max-height:160px; box-shadow:0 1px 4px rgba(0,0,0,.25); background:#fff; }',
    '.g-pdf .g-thumb .btnrow .btn { padding:3px 8px; font-size:13px; }',
    '.g-pdf .g-kw { display:flex; flex-wrap:wrap; gap:6px; }',
    '.g-pdf .g-kw span { font-size:12px; padding:2px 8px; border-radius:999px; background:var(--bg-sunken); color:var(--fg-muted); }',
    '.g-pdf .g-result-preview { max-width:220px; max-height:260px; border:1px solid var(--border); background:#fff; }'
  ].join('\n') }));

  /* --- libraries ------------------------------------------------------------ */

  function libPdf() {
    return U.script('assets/vendor/pdf-lib/pdf-lib.min.js').then(function () { return window.PDFLib; });
  }

  /* pdf.js 6 calls Math.sumPrecise (in the AES-256 password hash, among
     others) and Map.prototype.getOrInsert(Computed), which 2025 browsers
     lack. core.js fills them in on the page, but the worker is a separate
     realm, so it starts from a small module that installs them and then
     imports the real worker. */
  var WORKER_POLYFILLS = 'if(!Math.sumPrecise)Math.sumPrecise=function(v){var s=0;for(var x of v)s+=x;return s;};' +
    '[Map,WeakMap].forEach(function(C){var p=C.prototype;' +
    'if(!p.getOrInsert)p.getOrInsert=function(k,v){if(this.has(k))return this.get(k);this.set(k,v);return v;};' +
    'if(!p.getOrInsertComputed)p.getOrInsertComputed=function(k,f){if(this.has(k))return this.get(k);var v=f(k);this.set(k,v);return v;};});';
  function pdfjsWorkerPort() {
    var real = new URL('assets/vendor/pdfjs/pdf.worker.min.mjs', document.baseURI).href;
    var blobUrl = function (code) { return URL.createObjectURL(new Blob([code], { type: 'text/javascript' })); };
    var boot = 'import ' + JSON.stringify(blobUrl(WORKER_POLYFILLS)) + ';\nimport ' + JSON.stringify(real) + ';\n';
    return new Worker(blobUrl(boot), { type: 'module' });
  }

  var pdfjsPromise = null;
  function libPdfjs() {
    if (!pdfjsPromise) {
      pdfjsPromise = U.module('assets/vendor/pdfjs/pdf.min.mjs').then(function (m) {
        m.GlobalWorkerOptions.workerSrc = new URL('assets/vendor/pdfjs/pdf.worker.min.mjs', document.baseURI).href;
        /* One shared worker; if it cannot be made, pdf.js falls back to workerSrc. */
        try { if (!m.GlobalWorkerOptions.workerPort) m.GlobalWorkerOptions.workerPort = pdfjsWorkerPort(); } catch (e) { /* use workerSrc */ }
        return m;
      }).catch(function (e) { pdfjsPromise = null; throw e; });
    }
    return pdfjsPromise;
  }

  function libUnlock() {
    return libPdf().then(function () { return U.script('assets/js/lib/pdf-file-unlock.js'); })
      .then(function () { return window.PdfUnlock; });
  }

  async function openPdfjs(bytes, password) {
    var m = await libPdfjs();
    var task = m.getDocument({ data: bytes.slice(), password: password || undefined, isEvalSupported: false });
    try {
      return await task.promise;
    } catch (e) {
      if (e && e.name === 'PasswordException') {
        var err = new Error(e.code === 2 ? 'That password is not correct for this PDF.' : 'This PDF needs a password to open.');
        err.code = e.code === 2 ? 'BAD_PASSWORD' : 'NEED_PASSWORD';
        throw err;
      }
      throw new Error('Could not read this PDF: ' + (e && e.message || e));
    }
  }

  /* Open for editing with pdf-lib. Owner-restricted (no open password) files
     are decrypted transparently so edits come out clean. */
  async function openPdfLib(bytes) {
    var L = await libPdf();
    try {
      return await L.PDFDocument.load(bytes, { updateMetadata: false });
    } catch (e) {
      if (!/encrypt/i.test(e && e.message || '')) throw new Error('Could not read this PDF: ' + (e && e.message || e));
      var unlock = await libUnlock();
      try {
        var res = await unlock.decrypt(bytes, '');
        return await L.PDFDocument.load(res.bytes, { updateMetadata: false });
      } catch (err) {
        if (err.code === 'NEED_PASSWORD') throw new Error('This PDF is password-protected. Remove the password with Unlock PDF first.');
        throw err;
      }
    }
  }

  function closePdf(pdf) {
    try { if (pdf) (typeof pdf.destroy === 'function' ? pdf.destroy() : pdf.loadingTask.destroy()); } catch (e) { /* already closed */ }
  }

  /* --- small helpers ---------------------------------------------------------- */

  function baseName(name) { return String(name || 'document').replace(/\.pdf$/i, '') || 'document'; }
  function kb(n) { return n >= 1048576 ? (n / 1048576).toFixed(2) + ' MB' : (n / 1024).toFixed(1) + ' KB'; }
  function kbRound(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  function isPdf(file) { return file && (/pdf/i.test(file.type) || /\.pdf$/i.test(file.name)); }
  function pdfBlob(bytes) { return new Blob([bytes], { type: 'application/pdf' }); }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : /(s|x|ch|sh)$/.test(word) ? 'es' : 's'); }
  function field(label, control, hint) { return U.field(label, control, hint); }
  function sel(options, value) { return U.select({ options: options, value: value }); }
  function num(input, dflt) { var v = parseFloat(input.value); return isFinite(v) ? v : dflt; }

  /* Lenient page list: "1-3,5,7-" -> 0-based indexes, in the order given.
     Pages outside 1..count are reported, not fatal, unless nothing is left. */
  function parsePages(spec, count) {
    var out = [], ignored = [], seen = {};
    String(spec || '').split(/[,;\s]+/).forEach(function (part) {
      if (!part) return;
      var m = /^(\d*)\s*-\s*(\d*)$/.exec(part), a, b;
      if (m) {
        a = m[1] ? parseInt(m[1], 10) : 1;
        b = m[2] ? parseInt(m[2], 10) : count;
      } else if (/^\d+$/.test(part)) {
        a = b = parseInt(part, 10);
      } else {
        throw new Error('"' + part + '" is not a page number or range.');
      }
      var step = a <= b ? 1 : -1;
      for (var p = a; step > 0 ? p <= b : p >= b; p += step) {
        if (p < 1 || p > count) { ignored.push(p); continue; }
        if (!seen[p]) { seen[p] = 1; out.push(p - 1); }
        if (out.length + ignored.length > 100000) break;
      }
    });
    if (!out.length) throw new Error('No valid pages in "' + spec + '". This PDF has ' + plural(count, 'page') + '.');
    out.ignored = ignored.length ? (ignored.length > 3 ? ignored.slice(0, 3).join(', ') + '…' : ignored.join(', ')) : '';
    return out;
  }

  function runBusy(button, fn) {
    return async function () {
      if (button.disabled) return;
      var label = button.textContent;
      button.disabled = true;
      button.textContent = 'Working…';
      try { await fn(); } finally { button.disabled = false; button.textContent = label; }
    };
  }

  /* A single-PDF tool frame: drop zone, a file line, then the tool's body. */
  function singlePdf(root, opts) {
    root.classList.add('g-pdf');
    var info = el('div', { class: 'g-file-line' });
    var body = el('div', { class: 'stack' });
    var status = U.note('');
    var zone = U.dropzone({
      accept: 'application/pdf,.pdf',
      label: opts.label || 'Drop PDF here or click to upload',
      hint: opts.hint || 'Your file stays on this device',
      onFiles: function (files) { load(files[0]); }
    });
    var change = U.button('Choose another PDF', function () { zone.querySelector('input').click(); }, 'ghost');
    change.style.display = 'none';
    var top = U.panel(null, opts.intro || null, zone, el('div', { class: 'row', style: { alignItems: 'center' } }, info, change), status);
    root.appendChild(top);
    root.appendChild(body);
    if (opts.footer) root.appendChild(opts.footer);

    async function load(file) {
      if (!file) return;
      if (!isPdf(file)) { status.className = 'note err'; status.textContent = file.name + ' is not a PDF.'; return; }
      status.className = 'note'; status.textContent = 'Reading ' + file.name + '…';
      body.replaceChildren();
      info.replaceChildren();
      try {
        var bytes = new Uint8Array(await U.readAs(file));
        await opts.onLoad({ file: file, bytes: bytes, body: body, info: info });
        status.textContent = '';
        zone.style.display = 'none';
        change.style.display = '';
      } catch (err) {
        status.className = 'note err';
        status.textContent = err.message || String(err);
      }
    }
    return { load: load };
  }

  /* Result area: a success line, optional stats and a download button. */
  function resultArea() {
    var wrap = el('div', { class: 'stack g-result' });
    wrap.busy = function (text, fraction) {
      var p = U.progress();
      p.set(text, fraction);
      wrap.replaceChildren(p);
      return p;
    };
    wrap.fail = function (err) {
      wrap.replaceChildren(U.note(err && err.message || String(err), 'err'));
    };
    wrap.done = function (message, bytes, filename, label, extra) {
      var blob = bytes instanceof Blob ? bytes : pdfBlob(bytes);
      wrap.bytes = bytes;
      setKids(wrap, 
        el('div', { class: 'g-ok', text: '✓ ' + message }),
        extra || null,
        U.btnrow(U.button(label || 'Download PDF', function () { U.saveBlob(filename, blob); }, 'primary')));
    };
    return wrap;
  }

  /* Map a point in the page as displayed (rotation applied, origin bottom-left)
     to pdf-lib page space, so text lands upright on rotated pages. */
  function visualBox(page) {
    var box = page.getMediaBox();
    var rot = ((page.getRotation().angle % 360) + 360) % 360;
    var W = rot % 180 ? box.height : box.width, H = rot % 180 ? box.width : box.height;
    return {
      width: W, height: H, rotation: rot,
      map: function (vx, vy) {
        var w = box.width, h = box.height, px, py;
        if (rot === 90) { px = w - vy; py = vx; }
        else if (rot === 180) { px = w - vx; py = h - vy; }
        else if (rot === 270) { px = vy; py = h - vx; }
        else { px = vx; py = vy; }
        return { x: px + box.x, y: py + box.y };
      }
    };
  }

  /* Draw text so that its baseline starts at visual (vx, vy) with a visual angle. */
  function drawVisualText(L, page, text, opts) {
    var vb = visualBox(page);
    var ang = (opts.angle || 0) * Math.PI / 180;
    var p = vb.map(opts.x, opts.y);
    page.drawText(text, {
      x: p.x, y: p.y, size: opts.size, font: opts.font, color: opts.color,
      opacity: opts.opacity === undefined ? 1 : opts.opacity,
      rotate: L.degrees((opts.angle || 0) + vb.rotation)
    });
    return ang;
  }

  /* Standard fonts only cover WinAnsi; swap anything else for '?'. */
  function winAnsiSafe(font, text) {
    var out = '', replaced = false;
    for (var ch of String(text)) {
      try { font.encodeText(ch); out += ch; } catch (e) { out += '?'; replaced = true; }
    }
    return { text: out, replaced: replaced };
  }

  /* Render one pdf.js page to a canvas at `scale` (1 = 72 dpi). */
  async function renderPage(pdf, pageNumber, scale) {
    var page = await pdf.getPage(pageNumber);
    var viewport = page.getViewport({ scale: scale });
    var canvas = el('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    var base = page.getViewport({ scale: 1 });
    page.cleanup();
    return { canvas: canvas, width: base.width, height: base.height };
  }

  function canvasBytes(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) return reject(new Error('Could not encode the page image.'));
        blob.arrayBuffer().then(function (b) { resolve(new Uint8Array(b)); }, reject);
      }, type, quality);
    });
  }

  /* Build a PDF of full-page images, one per rendered page. */
  async function imagesToPdf(L, pages) {
    var doc = await L.PDFDocument.create();
    for (var i = 0; i < pages.length; i++) {
      var p = pages[i];
      var img = p.type === 'png' ? await doc.embedPng(p.bytes) : await doc.embedJpg(p.bytes);
      var page = doc.addPage([p.width, p.height]);
      page.drawImage(img, { x: 0, y: 0, width: p.width, height: p.height });
    }
    return doc;
  }

  function sizeSummary(before, after) {
    var pct = before ? Math.round((1 - after / before) * 100) : 0;
    return 'Original: ' + kb(before) + ' · Result: ' + kb(after) +
      (pct > 0 ? ' (' + pct + '% smaller)' : pct < 0 ? ' (' + (-pct) + '% larger)' : '');
  }

  /* ========================================================================
     Merge PDF
     ======================================================================== */

  Tools.register({
    id: 'pdf-merge', category: 'pdf', name: 'Merge PDF',
    description: 'Join several PDF files into one document in the order you choose.',
    keywords: ['combine', 'join', 'append', 'pdf', 'concatenate', 'merge'],
    render: function (root) {
      root.classList.add('g-pdf');
      var files = [];            /* { file, pages } */
      var list = el('div', { class: 'g-list' });
      var heading = el('h3');
      var mergeBtn = U.button('Merge PDFs', null, 'primary');
      var clearBtn = U.button('Clear All', function () { files = []; result.replaceChildren(); draw(); }, 'ghost');
      var result = resultArea();
      var listPanel = U.panel(null, heading, list, U.btnrow(mergeBtn, clearBtn), result);
      var status = U.note('');

      var zone = U.dropzone({
        accept: 'application/pdf,.pdf', multiple: true,
        label: 'Drop PDF files here or click to add', hint: 'You can add multiple files at once',
        onFiles: add
      });
      root.appendChild(U.panel(null, zone, status));
      root.appendChild(listPanel);

      function add(added) {
        var bad = added.filter(function (f) { return !isPdf(f); });
        added.filter(isPdf).forEach(function (f) {
          var entry = { file: f, pages: null };
          files.push(entry);
          f.arrayBuffer().then(function (buf) { return openPdfLib(new Uint8Array(buf)); })
            .then(function (doc) { entry.pages = doc.getPageCount(); draw(); })
            .catch(function (e) { entry.error = e.message; draw(); });
        });
        status.className = bad.length ? 'note err' : 'note';
        status.textContent = bad.length ? 'Skipped (not PDF): ' + bad.map(function (f) { return f.name; }).join(', ') : '';
        result.replaceChildren();
        draw();
      }

      var dragFrom = -1;
      function draw() {
        listPanel.style.display = files.length ? '' : 'none';
        heading.textContent = 'Files to merge (' + files.length + ') — drag to reorder';
        mergeBtn.textContent = 'Merge ' + files.length + ' PDF' + (files.length === 1 ? '' : 's');
        mergeBtn.disabled = files.length < 2;
        list.replaceChildren.apply(list, files.map(function (entry, i) {
          var row = el('div', { class: 'g-item', draggable: 'true' },
            el('span', { class: 'idx', text: String(i + 1) }),
            el('span', { class: 'name', text: entry.file.name, title: entry.file.name }),
            el('span', { class: 'size', text: kb(entry.file.size) + (entry.pages ? ' · ' + plural(entry.pages, 'page') : '') +
              (entry.error ? ' · ⚠ ' + entry.error : '') }),
            U.button('↑', function () { move(i, i - 1); }, 'ghost'),
            U.button('↓', function () { move(i, i + 1); }, 'ghost'),
            U.button('×', function () { files.splice(i, 1); result.replaceChildren(); draw(); }, 'ghost'));
          row.addEventListener('dragstart', function (e) { dragFrom = i; row.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(i)); } catch (x) { /* ignore */ } });
          row.addEventListener('dragend', function () { row.classList.remove('drag'); });
          row.addEventListener('dragover', function (e) { if (dragFrom < 0) return; e.preventDefault(); row.classList.add('over'); });
          row.addEventListener('dragleave', function () { row.classList.remove('over'); });
          row.addEventListener('drop', function (e) {
            if (dragFrom < 0) return;
            e.preventDefault(); e.stopPropagation();
            var from = dragFrom; dragFrom = -1;
            move(from, i);
          });
          return row;
        }));
      }

      function move(from, to) {
        if (to < 0 || to >= files.length || from === to) return;
        var item = files.splice(from, 1)[0];
        files.splice(to, 0, item);
        result.replaceChildren();
        draw();
      }

      mergeBtn.addEventListener('click', runBusy(mergeBtn, async function () {
        if (files.length < 2) return U.toast('Add at least two PDFs', 'err');
        try {
          var L = await libPdf();
          var out = await L.PDFDocument.create();
          for (var i = 0; i < files.length; i++) {
            result.busy('Adding ' + files[i].file.name + '…', i / files.length);
            var src = await openPdfLib(new Uint8Array(await files[i].file.arrayBuffer()));
            var copied = await out.copyPages(src, src.getPageIndices());
            copied.forEach(function (p) { out.addPage(p); });
          }
          var bytes = await out.save();
          result.done('Merged ' + files.length + ' PDFs · ' + plural(out.getPageCount(), 'page') + ' · ' + kb(bytes.length),
            bytes, 'merged.pdf', 'Download Merged PDF');
        } catch (err) { result.fail(err); }
      }));

      draw();
    }
  });

  /* ========================================================================
     Split PDF
     ======================================================================== */

  Tools.register({
    id: 'pdf-split', category: 'pdf', name: 'Split PDF',
    description: 'Break a PDF into single pages, a chosen page range, or equal-sized parts.',
    keywords: ['extract pages', 'separate', 'divide', 'burst', 'page range', 'split'],
    render: function (root) {
      singlePdf(root, {
        onLoad: async function (ctx) {
          var src = await openPdfLib(ctx.bytes);
          var count = src.getPageCount();
          var base = baseName(ctx.file.name);
          ctx.info.append(ctx.file.name + ' (' + plural(count, 'page') + ')');

          var mode = sel([
            { value: 'all', label: 'Extract all pages individually' },
            { value: 'range', label: 'Extract specific page range' },
            { value: 'every', label: 'Split every N pages' }
          ], 'all');
          var range = U.input({ value: count >= 3 ? '1-3' : '1', placeholder: '1-3,5,7-9' });
          var rangeField = field('Page Range (e.g. 1-3,5,7-9)', range, 'Separate pages with commas, use hyphens for ranges. Total pages: ' + count);
          var every = U.input({ type: 'number', value: '1', min: '1', max: String(count) });
          var everyField = field('Pages per part', every);
          var go = U.button('Split PDF', null, 'primary');
          var out = el('div', { class: 'stack' });

          function sync() {
            rangeField.style.display = mode.value === 'range' ? '' : 'none';
            everyField.style.display = mode.value === 'every' ? '' : 'none';
          }
          mode.addEventListener('change', function () { sync(); out.replaceChildren(); });
          sync();

          go.addEventListener('click', runBusy(go, async function () {
            out.replaceChildren();
            try {
              var L = await libPdf();
              var groups = [], note = '';
              if (mode.value === 'all') {
                for (var i = 0; i < count; i++) groups.push({ pages: [i], name: base + '-page-' + (i + 1) + '.pdf' });
              } else if (mode.value === 'range') {
                var pages = parsePages(range.value, count);
                if (pages.ignored) note = 'Ignored pages outside 1–' + count + ': ' + pages.ignored;
                groups.push({ pages: pages, name: base + '-pages-' + range.value.replace(/[^\d,-]+/g, '').replace(/,/g, '_') + '.pdf' });
              } else {
                var n = Math.floor(num(every, 1));
                if (!(n >= 1)) throw new Error('Pages per part must be at least 1.');
                for (var s = 0, part = 1; s < count; s += n, part++) {
                  var g = [];
                  for (var k = s; k < Math.min(count, s + n); k++) g.push(k);
                  groups.push({ pages: g, name: base + '-part-' + part + '.pdf' });
                }
              }
              var bar = U.progress();
              out.replaceChildren(bar);
              var results = [];
              for (var gi = 0; gi < groups.length; gi++) {
                bar.set('Creating ' + groups[gi].name + '…', gi / groups.length);
                var doc = await L.PDFDocument.create();
                (await doc.copyPages(src, groups[gi].pages)).forEach(function (p) { doc.addPage(p); });
                results.push({ name: groups[gi].name, bytes: await doc.save(), pages: groups[gi].pages.length });
              }
              var zipBtn = U.button('Download All', async function () {
                if (results.length === 1) return U.saveBlob(results[0].name, pdfBlob(results[0].bytes));
                await U.script('assets/vendor/jszip/jszip.min.js');
                var zip = new window.JSZip();
                results.forEach(function (r) { zip.file(r.name, r.bytes); });
                U.saveBlob(base + '-split.zip', await zip.generateAsync({ type: 'blob' }));
              }, 'primary');
              setKids(out, 
                el('div', { class: 'row', style: { alignItems: 'center' } },
                  el('h3', { text: 'Results (' + plural(results.length, 'file') + ')', style: { margin: 0 } }), zipBtn),
                note ? U.note(note) : null,
                el('div', { class: 'g-list' }, results.map(function (r) {
                  return el('div', { class: 'g-item' },
                    el('span', { class: 'name', text: r.name }),
                    el('span', { class: 'size', text: plural(r.pages, 'page') + ' · ' + kbRound(r.bytes.length) }),
                    U.button('↓', function () { U.saveBlob(r.name, pdfBlob(r.bytes)); }, 'ghost'));
                })));
            } catch (err) { out.replaceChildren(U.note(err.message || String(err), 'err')); }
          }));

          ctx.body.append(U.panel(null, U.row(field('Split Mode', mode)), rangeField, everyField, U.btnrow(go), out));
        }
      });
    }
  });

  /* ========================================================================
     Compress PDF
     ======================================================================== */

  var LEVELS = {
    low:    { maxDim: 3000, quality: 0.85, strip: false },
    medium: { maxDim: 2000, quality: 0.7,  strip: false },
    high:   { maxDim: 1300, quality: 0.5,  strip: true }
  };

  async function inflate(bytes) {
    var ds = new DecompressionStream('deflate');
    var stream = new Blob([bytes]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function componentsOf(L, cs) {
    if (!cs) return 0;
    if (cs instanceof L.PDFName) {
      var n = cs.asString();
      return n === '/DeviceRGB' ? 3 : n === '/DeviceGray' ? 1 : 0;
    }
    if (cs instanceof L.PDFArray && cs.size() === 2) {
      var kind = cs.lookup(0);
      if (kind instanceof L.PDFName && kind.asString() === '/ICCBased') {
        var icc = cs.lookup(1);
        var nn = icc && icc.dict ? icc.dict.lookup(L.PDFName.of('N')) : null;
        var c = nn instanceof L.PDFNumber ? nn.asNumber() : 0;
        return c === 1 || c === 3 ? c : 0;
      }
    }
    return 0;
  }

  /* Re-encode large or loosely compressed images as JPEG. */
  async function recompressImages(L, doc, level, onProgress) {
    var N = function (s) { return L.PDFName.of(s); };
    var objects = doc.context.enumerateIndirectObjects();
    var done = 0, changed = 0, saved = 0;
    for (var i = 0; i < objects.length; i++) {
      var ref = objects[i][0], obj = objects[i][1];
      if (!(obj instanceof L.PDFRawStream)) continue;
      var d = obj.dict;
      if (d.lookup(N('Subtype')) !== N('Image') || d.lookup(N('ImageMask')) || d.lookup(N('Decode'))) continue;
      var w = d.lookup(N('Width')), h = d.lookup(N('Height')), bpc = d.lookup(N('BitsPerComponent'));
      w = w instanceof L.PDFNumber ? w.asNumber() : 0;
      h = h instanceof L.PDFNumber ? h.asNumber() : 0;
      bpc = bpc instanceof L.PDFNumber ? bpc.asNumber() : 8;
      if (!w || !h || w * h < 4096) continue;
      var filter = d.lookup(N('Filter'));
      if (filter instanceof L.PDFArray) filter = filter.size() === 1 ? filter.lookup(0) : null;
      var fname = filter instanceof L.PDFName ? filter.asString() : '';
      var comps = componentsOf(L, d.lookup(N('ColorSpace')));
      if (!comps) continue;
      done++;
      if (onProgress) onProgress(done);
      try {
        var bitmap = null;
        if (fname === '/DCTDecode') {
          bitmap = await createImageBitmap(new Blob([obj.contents], { type: 'image/jpeg' }));
        } else if (fname === '/FlateDecode' && bpc === 8) {
          var parms = d.lookup(N('DecodeParms'));
          var pred = parms instanceof L.PDFDict ? parms.lookup(N('Predictor')) : null;
          if (pred instanceof L.PDFNumber && pred.asNumber() > 1) continue;
          var raw = await inflate(obj.contents);
          if (raw.length < w * h * comps) continue;
          var id = new ImageData(w, h);
          for (var p = 0, q = 0; p < w * h; p++, q += comps) {
            id.data[p * 4] = raw[q];
            id.data[p * 4 + 1] = comps === 3 ? raw[q + 1] : raw[q];
            id.data[p * 4 + 2] = comps === 3 ? raw[q + 2] : raw[q];
            id.data[p * 4 + 3] = 255;
          }
          bitmap = await createImageBitmap(id);
        } else continue;
        var k = Math.min(1, level.maxDim / Math.max(w, h));
        var nw = Math.max(1, Math.round(w * k)), nh = Math.max(1, Math.round(h * k));
        var c = el('canvas'); c.width = nw; c.height = nh;
        var cx = c.getContext('2d');
        cx.fillStyle = '#fff'; cx.fillRect(0, 0, nw, nh);
        cx.drawImage(bitmap, 0, 0, nw, nh);
        if (bitmap.close) bitmap.close();
        var jpg = await canvasBytes(c, 'image/jpeg', level.quality);
        if (jpg.length >= obj.contents.length * 0.92) continue;
        var nd = L.PDFDict.withContext(doc.context);
        d.entries().forEach(function (e) { nd.set(e[0], e[1]); });
        nd.set(N('Width'), L.PDFNumber.of(nw));
        nd.set(N('Height'), L.PDFNumber.of(nh));
        nd.set(N('BitsPerComponent'), L.PDFNumber.of(8));
        nd.set(N('ColorSpace'), N('DeviceRGB'));
        nd.set(N('Filter'), N('DCTDecode'));
        nd.delete(N('DecodeParms'));
        nd.delete(N('Length'));
        saved += obj.contents.length - jpg.length;
        doc.context.assign(ref, L.PDFRawStream.of(nd, jpg));
        changed++;
      } catch (e) { /* leave this image as it was */ }
    }
    return { images: done, changed: changed, saved: saved };
  }

  /* Drop objects nothing refers to (old revisions, orphaned resources). */
  function collectGarbage(L, doc) {
    var ctx = doc.context, seen = new Set(), queue = [];
    function visit(o) {
      if (!o) return;
      if (o instanceof L.PDFRef) {
        if (seen.has(o.tag)) return;
        seen.add(o.tag);
        queue.push(ctx.lookup(o));
      } else if (o instanceof L.PDFArray) {
        for (var i = 0; i < o.size(); i++) visit(o.get(i));
      } else if (o instanceof L.PDFDict) {
        o.entries().forEach(function (e) { visit(e[1]); });
      } else if (o.dict) {
        visit(o.dict);
      }
    }
    var t = ctx.trailerInfo;
    [t.Root, t.Info, t.ID, t.Encrypt].forEach(visit);
    while (queue.length) visit(queue.pop());
    var removed = 0;
    ctx.enumerateIndirectObjects().forEach(function (pair) {
      if (!seen.has(pair[0].tag)) { ctx.delete(pair[0]); removed++; }
    });
    return removed;
  }

  function stripExtras(L, doc) {
    var N = function (s) { return L.PDFName.of(s); };
    doc.catalog.delete(N('Metadata'));
    doc.catalog.delete(N('PieceInfo'));
    doc.getPages().forEach(function (p) {
      p.node.delete(N('Thumb'));
      p.node.delete(N('PieceInfo'));
      p.node.delete(N('Metadata'));
    });
  }

  Tools.register({
    id: 'pdf-compress', category: 'pdf', name: 'Compress PDF',
    description: 'Shrink a PDF by re-encoding its images and removing redundant objects.',
    keywords: ['reduce size', 'smaller', 'optimize', 'shrink', 'compress'],
    render: function (root) {
      singlePdf(root, {
        intro: el('div', { class: 'g-info', text: 'ℹ Browser-based compression removes redundant objects and re-encodes large images at a lower resolution and quality. For maximum compression of image-heavy PDFs, a server-side tool like Ghostscript is more effective.' }),
        onLoad: async function (ctx) {
          await openPdfLib(ctx.bytes);
          ctx.info.append(ctx.file.name, el('span', { class: 'muted', text: kb(ctx.file.size) }));
          var level = sel([
            { value: 'low', label: 'Low — minimal quality loss, small savings' },
            { value: 'medium', label: 'Medium — balanced quality and size' },
            { value: 'high', label: 'High — maximum compression, reduced quality' }
          ], 'medium');
          var go = U.button('Compress PDF', null, 'primary');
          var result = resultArea();
          level.addEventListener('change', function () { result.replaceChildren(); });
          go.addEventListener('click', runBusy(go, async function () {
            try {
              var L = await libPdf();
              var cfg = LEVELS[level.value];
              result.busy('Analysing…');
              var doc = await openPdfLib(ctx.bytes);
              var stats = await recompressImages(L, doc, cfg, function (n) { result.busy('Re-encoding image ' + n + '…'); });
              if (cfg.strip) stripExtras(L, doc);
              var removed = collectGarbage(L, doc);
              var bytes = await doc.save({ useObjectStreams: true });
              var smaller = bytes.length < ctx.bytes.length;
              var extra = el('div', { class: 'stack' },
                U.note(sizeSummary(ctx.bytes.length, bytes.length)),
                U.note(stats.images ? plural(stats.changed, 'image') + ' of ' + stats.images + ' re-encoded' + (removed ? ', ' + plural(removed, 'unused object') + ' removed' : '') + '.'
                  : 'No compressible images found' + (removed ? '; ' + plural(removed, 'unused object') + ' removed' : '') + '.'),
                smaller ? null : U.note('This PDF is already well optimised, so the result is not smaller. The original is usually the better file to keep.'));
              result.done('PDF processed', bytes, baseName(ctx.file.name) + '-compressed.pdf', 'Download Compressed PDF', extra);
            } catch (err) { result.fail(err); }
          }));
          ctx.body.append(U.panel(null, U.row(field('Compression Level', level)), U.btnrow(go), result));
        }
      });
    }
  });

  /* ========================================================================
     PDF to Text
     ======================================================================== */

  async function pageText(page) {
    var content = await page.getTextContent();
    var out = '', lastY = null;
    content.items.forEach(function (item) {
      if (!('str' in item)) return;
      var y = item.transform ? item.transform[5] : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > Math.max(2, Math.abs(item.height || 0) * 0.5) && !/\n$/.test(out)) out += '\n';
      out += item.str;
      if (item.hasEOL) out += '\n';
      if (y !== null) lastY = y;
    });
    return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  Tools.register({
    id: 'pdf-to-text', category: 'pdf', name: 'PDF to Text',
    description: 'Pull the text out of a PDF, page by page, to copy or save as .txt.',
    keywords: ['extract text', 'pdf to txt', 'copy text', 'convert', 'read'],
    render: function (root) {
      root.classList.add('g-pdf');
      var out = U.textarea({ rows: 16, spellcheck: false, placeholder: 'Extracted text appears here' });
      var info = el('div', { class: 'g-file-line' });
      var statsBox = el('div');
      var markers = U.checkbox('Page separators', { checked: true });
      var pass = U.input({ type: 'password', placeholder: 'Password (only if the PDF is protected)' });
      var progress = U.progress();
      var name = 'document';
      var current = null;
      var dl = U.button('Download .txt', function () {
        if (!out.value) return U.toast('Nothing to download yet', 'err');
        U.saveText(name + '.txt', out.value);
      });
      var resultPanel = U.panel(null, info, statsBox, U.row(markers), out,
        U.btnrow(U.copyBtn('Copy Text', function () { return out.value; }), dl));
      resultPanel.style.display = 'none';

      var zone = U.dropzone({ accept: 'application/pdf,.pdf', label: 'Drop PDF here or click to upload', hint: 'Text is read on this device', onFiles: function (f) { load(f[0]); } });
      root.appendChild(U.panel(null, zone, progress));
      root.appendChild(resultPanel);
      root.appendChild(U.panel('Limitations', U.note('Text extraction works best with text-based PDFs. Scanned documents (images) require OCR. Complex layouts (tables, columns) may produce jumbled text ordering.'),
        field('Password', pass, 'Needed only for PDFs that ask for a password to open.')));

      function compose() {
        if (!current) return;
        var text = current.pages.map(function (t, i) {
          return markers.input.checked ? '--- Page ' + (i + 1) + ' ---\n' + t : t;
        }).join('\n\n');
        out.value = text;
        var words = (text.match(/\S+/g) || []).length;
        statsBox.replaceChildren(U.stats([
          { label: 'pages', value: String(current.pages.length) },
          { label: 'words', value: words.toLocaleString('en-US') },
          { label: 'chars', value: text.length.toLocaleString('en-US') }
        ]));
        if (!text.replace(/--- Page \d+ ---/g, '').trim()) {
          statsBox.appendChild(U.note('No text layer found. This looks like a scanned PDF; it needs OCR.', 'err'));
        }
      }
      markers.input.addEventListener('change', compose);

      async function load(file) {
        if (!isPdf(file)) return progress.fail(new Error(file.name + ' is not a PDF.'));
        name = baseName(file.name);
        try {
          progress.set('Opening ' + file.name + '…', 0);
          var bytes = new Uint8Array(await U.readAs(file));
          var pdf = await openPdfjs(bytes, pass.value);
          var pages = [];
          for (var i = 1; i <= pdf.numPages; i++) {
            progress.set('Reading page ' + i + ' of ' + pdf.numPages + '…', i / pdf.numPages);
            var page = await pdf.getPage(i);
            pages.push(await pageText(page));
            page.cleanup();
          }
          closePdf(pdf);
          current = { pages: pages };
          info.replaceChildren(file.name);
          resultPanel.style.display = '';
          compose();
          progress.set('');
        } catch (err) { progress.fail(err); }
      }
    }
  });

  /* ========================================================================
     Rotate PDF
     ======================================================================== */

  Tools.register({
    id: 'pdf-rotate', category: 'pdf', name: 'Rotate PDF',
    description: 'Turn every page, or just the pages you list, by 90, 180 or 270 degrees.',
    keywords: ['turn', 'orientation', 'landscape', 'portrait', 'rotate pages'],
    render: function (root) {
      singlePdf(root, {
        onLoad: async function (ctx) {
          var src = await openPdfLib(ctx.bytes);
          var count = src.getPageCount();
          ctx.info.append(ctx.file.name, el('span', { class: 'muted', text: plural(count, 'page') }));
          var angle = sel([
            { value: '90', label: '90° clockwise' },
            { value: '180', label: '180° (upside down)' },
            { value: '270', label: '270° (90° counter-clockwise)' }
          ], '90');
          var scope = sel([{ value: 'all', label: 'All pages' }, { value: 'some', label: 'Specific pages' }], 'all');
          var pages = U.input({ value: '1,3,5', placeholder: '1,3,5-8' });
          var pagesField = field('Page Numbers (e.g. 1,3,5-8)', pages);
          var go = U.button('Rotate PDF', null, 'primary');
          var result = resultArea();
          function sync() { pagesField.style.display = scope.value === 'some' ? '' : 'none'; }
          scope.addEventListener('change', sync); sync();
          go.addEventListener('click', runBusy(go, async function () {
            try {
              var L = await libPdf();
              var doc = await openPdfLib(ctx.bytes);
              var list = scope.value === 'all' ? doc.getPageIndices() : parsePages(pages.value, count);
              var by = parseInt(angle.value, 10);
              list.forEach(function (i) {
                var p = doc.getPage(i);
                p.setRotation(L.degrees((((p.getRotation().angle + by) % 360) + 360) % 360));
              });
              var bytes = await doc.save();
              result.done('Rotation applied to ' + plural(list.length, 'page'), bytes, baseName(ctx.file.name) + '-rotated.pdf', 'Download Rotated PDF',
                list.ignored ? U.note('Ignored pages outside 1–' + count + ': ' + list.ignored) : null);
            } catch (err) { result.fail(err); }
          }));
          ctx.body.append(U.panel(null, U.row(field('Rotation Angle', angle), field('Apply To', scope)), pagesField, U.btnrow(go), result));
        }
      });
    }
  });

  /* ========================================================================
     Add Watermark
     ======================================================================== */

  function hexColor(L, hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    var n = m ? parseInt(m[1], 16) : 0x808080;
    return L.rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
  }

  Tools.register({
    id: 'pdf-watermark', category: 'pdf', name: 'Watermark PDF',
    description: 'Stamp a text watermark on every page, with position, size and opacity controls.',
    keywords: ['stamp', 'confidential', 'draft', 'overlay text', 'watermark'],
    render: function (root) {
      singlePdf(root, {
        onLoad: async function (ctx) {
          await openPdfLib(ctx.bytes);
          ctx.info.append(ctx.file.name);
          var text = U.input({ value: 'CONFIDENTIAL', placeholder: 'CONFIDENTIAL' });
          var pos = sel([
            { value: 'diagonal', label: 'Diagonal (center)' }, { value: 'center', label: 'Center' },
            { value: 'tl', label: 'Top Left' }, { value: 'tr', label: 'Top Right' },
            { value: 'bl', label: 'Bottom Left' }, { value: 'br', label: 'Bottom Right' }
          ], 'diagonal');
          var size = U.input({ type: 'range', min: '12', max: '120', value: '48' });
          var opacity = U.input({ type: 'range', min: '5', max: '80', value: '30' });
          var color = U.input({ type: 'color', value: '#808080' });
          var sizeLabel = el('label'), opLabel = el('label');
          function labels() { sizeLabel.textContent = 'Font Size: ' + size.value + 'pt'; opLabel.textContent = 'Opacity: ' + opacity.value + '%'; }
          size.addEventListener('input', labels); opacity.addEventListener('input', labels); labels();
          var go = U.button('Apply Watermark', null, 'primary');
          var result = resultArea();
          go.addEventListener('click', runBusy(go, async function () {
            try {
              if (!text.value.trim()) throw new Error('Enter the watermark text.');
              var L = await libPdf();
              var doc = await openPdfLib(ctx.bytes);
              var font = await doc.embedFont(L.StandardFonts.HelveticaBold);
              var safe = winAnsiSafe(font, text.value);
              var fs = num(size, 48), op = num(opacity, 30) / 100, col = hexColor(L, color.value);
              var tw = font.widthOfTextAtSize(safe.text, fs), th = font.heightAtSize(fs, { descender: false });
              var margin = 36;
              doc.getPages().forEach(function (page) {
                var vb = visualBox(page), x, y, ang = 0;
                switch (pos.value) {
                  case 'diagonal':
                    ang = Math.atan2(vb.height, vb.width) * 180 / Math.PI;
                    var r = ang * Math.PI / 180;
                    x = vb.width / 2 - (tw / 2) * Math.cos(r) + (th / 2) * Math.sin(r);
                    y = vb.height / 2 - (tw / 2) * Math.sin(r) - (th / 2) * Math.cos(r);
                    break;
                  case 'center': x = (vb.width - tw) / 2; y = (vb.height - th) / 2; break;
                  case 'tl': x = margin; y = vb.height - margin - th; break;
                  case 'tr': x = vb.width - margin - tw; y = vb.height - margin - th; break;
                  case 'bl': x = margin; y = margin; break;
                  default: x = vb.width - margin - tw; y = margin;
                }
                drawVisualText(L, page, safe.text, { x: x, y: y, size: fs, font: font, color: col, opacity: op, angle: ang });
              });
              var bytes = await doc.save();
              result.done('Watermark applied to all pages', bytes, baseName(ctx.file.name) + '-watermarked.pdf', 'Download Watermarked PDF',
                safe.replaced ? U.note('Some characters are not available in the built-in PDF font and were replaced with "?".') : null);
            } catch (err) { result.fail(err); }
          }));
          ctx.body.append(U.panel(null,
            field('Watermark Text', text),
            U.row(field('Position', pos), field('Colour', color)),
            el('div', { class: 'field' }, sizeLabel, size),
            el('div', { class: 'field' }, opLabel, opacity),
            U.btnrow(go), result));
        }
      });
    }
  });

  /* ========================================================================
     Add Page Numbers
     ======================================================================== */

  Tools.register({
    id: 'pdf-page-numbers', category: 'pdf', name: 'Add Page Numbers',
    description: 'Number the pages of a PDF in the corner or edge you pick, in your chosen format.',
    keywords: ['paginate', 'numbering', 'footer', 'page x of y', 'bates'],
    render: function (root) {
      singlePdf(root, {
        onLoad: async function (ctx) {
          var src = await openPdfLib(ctx.bytes);
          var count = src.getPageCount();
          ctx.info.append(ctx.file.name + ' (' + plural(count, 'page') + ')');
          var pos = sel(['bottom-center', 'bottom-right', 'bottom-left', 'top-center', 'top-right', 'top-left'], 'bottom-center');
          var fmt = sel([
            { value: 'n', label: '1, 2, 3…' }, { value: 'page-n', label: 'Page 1, Page 2…' },
            { value: 'n-of', label: '1 / N' }, { value: 'page-n-of', label: 'Page 1 of N' }
          ], 'page-n-of');
          var start = U.input({ type: 'number', value: '1', min: '1' });
          var size = U.input({ type: 'number', value: '12', min: '8', max: '24' });
          var preview = U.note('');
          function label(n, total) {
            switch (fmt.value) {
              case 'n': return String(n);
              case 'page-n': return 'Page ' + n;
              case 'n-of': return n + ' / ' + total;
              default: return 'Page ' + n + ' of ' + total;
            }
          }
          function first() { return Math.max(1, Math.floor(num(start, 1))); }
          function showPreview() { var s = first(); preview.textContent = 'Preview: "' + label(s, s + count - 1) + '" … "' + label(s + count - 1, s + count - 1) + '"'; }
          [fmt, start].forEach(function (c) { c.addEventListener('input', showPreview); c.addEventListener('change', showPreview); });
          showPreview();
          var go = U.button('Add Page Numbers', null, 'primary');
          var result = resultArea();
          go.addEventListener('click', runBusy(go, async function () {
            try {
              var L = await libPdf();
              var doc = await openPdfLib(ctx.bytes);
              var font = await doc.embedFont(L.StandardFonts.Helvetica);
              var fs = Math.min(24, Math.max(8, num(size, 12)));
              var s = first(), total = s + count - 1, margin = 30;
              doc.getPages().forEach(function (page, i) {
                var t = label(s + i, total);
                var tw = font.widthOfTextAtSize(t, fs);
                var vb = visualBox(page);
                var parts = pos.value.split('-');
                var y = parts[0] === 'top' ? vb.height - margin - fs * 0.75 : margin;
                var x = parts[1] === 'left' ? margin : parts[1] === 'right' ? vb.width - margin - tw : (vb.width - tw) / 2;
                drawVisualText(L, page, t, { x: x, y: y, size: fs, font: font, color: L.rgb(0, 0, 0) });
              });
              var bytes = await doc.save();
              result.done('Page numbers added', bytes, baseName(ctx.file.name) + '-numbered.pdf', 'Download PDF');
            } catch (err) { result.fail(err); }
          }));
          ctx.body.append(U.panel(null,
            U.row(field('Position', pos), field('Format', fmt), field('Start Number', start), field('Font Size (pt)', size)),
            preview, U.btnrow(go), result));
        }
      });
    }
  });

  /* ========================================================================
     PDF Metadata
     ======================================================================== */

  var META_FIELDS = [
    { key: 'Title', label: 'Title', ph: 'PDF title' },
    { key: 'Author', label: 'Author', ph: 'PDF author' },
    { key: 'Subject', label: 'Subject', ph: 'PDF subject' },
    { key: 'Keywords', label: 'Keywords', ph: 'PDF keywords' },
    { key: 'Creator', label: 'Creator', ph: 'PDF creator' },
    { key: 'Producer', label: 'Producer', ph: 'PDF producer' }
  ];

  function readInfo(L, doc) {
    var info = {};
    var dict = doc.context.lookup(doc.context.trailerInfo.Info);
    META_FIELDS.forEach(function (f) {
      var v = dict instanceof L.PDFDict ? dict.lookup(L.PDFName.of(f.key)) : null;
      info[f.key] = v && v.decodeText ? v.decodeText() : '';
    });
    info.created = doc.getCreationDate ? safeDate(function () { return doc.getCreationDate(); }) : null;
    info.modified = doc.getModificationDate ? safeDate(function () { return doc.getModificationDate(); }) : null;
    return info;
  }
  function safeDate(fn) { try { var d = fn(); return d && !isNaN(d) ? d : null; } catch (e) { return null; } }

  Tools.register({
    id: 'pdf-metadata', category: 'pdf', name: 'PDF Metadata',
    description: 'See and change a PDF\'s title, author, subject, keywords, creator and producer.',
    keywords: ['properties', 'document info', 'title', 'author', 'edit metadata', 'exif'],
    render: function (root) {
      singlePdf(root, {
        onLoad: async function (ctx) {
          var L = await libPdf();
          var doc = await openPdfLib(ctx.bytes);
          var info = readInfo(L, doc);
          ctx.info.append(ctx.file.name + ' (' + plural(doc.getPageCount(), 'page') + ' · ' + kbRound(ctx.file.size) + ')');
          var tabs = U.chips([{ value: 'view', label: 'View' }, { value: 'edit', label: 'Edit' }], show, 'view');
          var view = el('dl', { class: 'g-meta' });
          var inputs = {};
          var editBox = el('div', { class: 'stack' });
          META_FIELDS.forEach(function (f) {
            inputs[f.key] = U.input({ value: info[f.key], placeholder: f.ph });
            editBox.appendChild(field(f.label, inputs[f.key]));
          });
          var save = U.button('Save Metadata', null, 'primary');
          var result = resultArea();
          editBox.append(U.note('Leave a field empty to remove it. The modification date is set to now.'), U.btnrow(save), result);

          function drawView() {
            view.replaceChildren();
            META_FIELDS.forEach(function (f) {
              view.append(el('dt', { text: f.label }), el('dd', { class: info[f.key] ? '' : 'unset', text: info[f.key] || 'Not set' }));
            });
            view.append(el('dt', { text: 'Created' }), el('dd', { class: info.created ? '' : 'unset', text: info.created ? info.created.toLocaleString() : 'Not set' }));
            view.append(el('dt', { text: 'Modified' }), el('dd', { class: info.modified ? '' : 'unset', text: info.modified ? info.modified.toLocaleString() : 'Not set' }));
            view.append(el('dt', { text: 'PDF version' }), el('dd', { text: pdfVersion(ctx.bytes) }));
          }
          function show(which) {
            view.style.display = which === 'view' ? '' : 'none';
            editBox.style.display = which === 'edit' ? '' : 'none';
          }
          drawView(); show('view');

          save.addEventListener('click', runBusy(save, async function () {
            try {
              var d = await openPdfLib(ctx.bytes);
              var dict = d.getInfoDict();
              META_FIELDS.forEach(function (f) {
                var v = inputs[f.key].value.trim();
                if (v) dict.set(L.PDFName.of(f.key), L.PDFHexString.fromText(v));
                else dict.delete(L.PDFName.of(f.key));
              });
              d.setModificationDate(new Date());
              var bytes = await d.save({ updateFieldAppearances: false });
              META_FIELDS.forEach(function (f) { info[f.key] = inputs[f.key].value.trim(); });
              info.modified = new Date();
              drawView();
              result.done('Metadata saved', bytes, baseName(ctx.file.name) + '-metadata.pdf', 'Download PDF');
            } catch (err) { result.fail(err); }
          }));
          ctx.body.append(U.panel(null, tabs, view, editBox));
        }
      });
    }
  });

  function pdfVersion(bytes) {
    var head = '';
    for (var i = 0; i < Math.min(1024, bytes.length); i++) head += String.fromCharCode(bytes[i]);
    var m = /%PDF-(\d\.\d)/.exec(head);
    return m ? m[1] : 'unknown';
  }

  /* ========================================================================
     Unlock PDF
     ======================================================================== */

  Tools.register({
    id: 'pdf-unlock', category: 'pdf', name: 'Unlock PDF',
    description: 'Remove the open password and permission restrictions from a PDF you own.',
    keywords: ['remove password', 'decrypt', 'unprotect', 'restrictions', 'unlock'],
    render: function (root) {
      singlePdf(root, {
        intro: el('div', { class: 'g-info', text: 'ℹ Only use this tool on PDFs you own or have permission to modify. This tool re-creates the PDF without restrictions.' }),
        onLoad: async function (ctx) {
          var unlock = await libUnlock();
          ctx.info.append(ctx.file.name);
          var state = el('div', { class: 'note' });
          try {
            var probe = await unlock.decrypt(ctx.bytes, '');
            state.textContent = probe.wasEncrypted
              ? '🔓 No password needed to open; restrictions (' + probe.method + ') can be removed right away.'
              : 'This PDF is not encrypted. Unlocking makes a clean copy.';
          } catch (e) {
            state.textContent = e.code === 'NEED_PASSWORD' ? '🔒 This PDF needs its password to open. Enter it below.' : (e.message || String(e));
          }
          var pass = U.input({ type: 'password', placeholder: 'Leave blank for owner-restricted PDFs', autocomplete: 'off' });
          var go = U.button('Unlock PDF', null, 'primary');
          var result = resultArea();
          pass.addEventListener('keydown', function (e) { if (e.key === 'Enter') go.click(); });
          go.addEventListener('click', runBusy(go, async function () {
            var out = baseName(ctx.file.name) + '-unlocked.pdf';
            result.busy('Decrypting…');
            try {
              var res = await unlock.decrypt(ctx.bytes, pass.value);
              /* sanity check: the output must open without a password */
              var check = await openPdfjs(res.bytes);
              var pages = check.numPages;
              closePdf(check);
              result.done(res.wasEncrypted ? 'PDF unlocked' : 'PDF was not encrypted — clean copy created', res.bytes, out, 'Download Unlocked PDF',
                U.note(res.wasEncrypted
                  ? 'Removed ' + res.method + ' encryption' + (res.usedOwner ? ' (using the owner password)' : '') + '. ' + plural(pages, 'page') + ', text and quality unchanged.'
                  : plural(pages, 'page') + '.'));
            } catch (err) {
              if (err.code === 'NEED_PASSWORD' || err.code === 'BAD_PASSWORD') return result.fail(err);
              /* Fall back to re-drawing every page with pdf.js. */
              try {
                var L = await libPdf();
                var pdf = await openPdfjs(ctx.bytes, pass.value);
                var imgs = [];
                for (var i = 1; i <= pdf.numPages; i++) {
                  result.busy('Rebuilding page ' + i + ' of ' + pdf.numPages + '…', i / pdf.numPages);
                  var r = await renderPage(pdf, i, 2);
                  imgs.push({ bytes: await canvasBytes(r.canvas, 'image/jpeg', 0.9), width: r.width, height: r.height });
                }
                closePdf(pdf);
                var doc = await imagesToPdf(L, imgs);
                result.done('PDF unlocked (rasterised)', await doc.save(), out, 'Download Unlocked PDF',
                  U.note('This file\'s encryption could not be removed losslessly (' + (err.message || err) + '), so each page was re-drawn as an image. Text in the result is not selectable.'));
              } catch (e2) { result.fail(e2); }
            }
          }));
          ctx.body.append(U.panel(null, state, field('Password (if required)', pass), U.btnrow(go), result));
        }
      });
    }
  });

  /* ========================================================================
     PDF to Grayscale
     ======================================================================== */

  Tools.register({
    id: 'pdf-grayscale', category: 'pdf', name: 'PDF to Greyscale',
    description: 'Turn a colour PDF into black-and-white greys for printing or archiving.',
    keywords: ['black and white', 'monochrome', 'greyscale', 'remove color', 'print'],
    render: function (root) {
      singlePdf(root, {
        onLoad: async function (ctx) {
          var pdf = await openPdfjs(ctx.bytes);
          var count = pdf.numPages;
          closePdf(pdf);
          ctx.info.append(ctx.file.name, el('span', { class: 'muted', text: plural(count, 'page') }), el('span', { class: 'muted', text: kbRound(ctx.file.size) }));
          var dpi = sel([
            { value: '100', label: 'Draft — 100 dpi (smallest)' }, { value: '150', label: 'Standard — 150 dpi' },
            { value: '200', label: 'High — 200 dpi' }, { value: '300', label: 'Print — 300 dpi (largest)' }
          ], '150');
          var go = U.button('Convert to Grayscale', null, 'primary');
          var result = resultArea();
          go.addEventListener('click', runBusy(go, async function () {
            try {
              var L = await libPdf();
              var doc = await openPdfjs(ctx.bytes);
              var scale = parseInt(dpi.value, 10) / 72, imgs = [], thumb = null;
              for (var i = 1; i <= doc.numPages; i++) {
                result.busy('Converting page ' + i + ' of ' + doc.numPages + '…', (i - 1) / doc.numPages);
                var r = await renderPage(doc, i, scale);
                var c = r.canvas.getContext('2d', { willReadFrequently: true });
                var img = c.getImageData(0, 0, r.canvas.width, r.canvas.height), d = img.data;
                for (var p = 0; p < d.length; p += 4) {
                  var g = Math.round(0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]);
                  d[p] = d[p + 1] = d[p + 2] = g;
                }
                c.putImageData(img, 0, 0);
                if (i === 1) thumb = r.canvas.toDataURL('image/jpeg', 0.6);
                imgs.push({ bytes: await canvasBytes(r.canvas, 'image/jpeg', 0.85), width: r.width, height: r.height });
              }
              closePdf(doc);
              var out = await (await imagesToPdf(L, imgs)).save();
              result.done('Converted ' + plural(imgs.length, 'page') + ' to grayscale', out, baseName(ctx.file.name) + '-grayscale.pdf', 'Download Grayscale PDF',
                el('div', { class: 'stack' }, U.note(sizeSummary(ctx.bytes.length, out.length) + '. Pages are re-drawn as grey images, so text is no longer selectable.'),
                  thumb ? el('img', { class: 'g-result-preview', src: thumb, alt: 'Page 1 preview' }) : null));
            } catch (err) { result.fail(err); }
          }));
          ctx.body.append(U.panel(null, U.row(field('Output quality', dpi)), U.btnrow(go), result));
        }
      });
    }
  });

  /* ========================================================================
     Crop PDF
     ======================================================================== */

  Tools.register({
    id: 'pdf-crop', category: 'pdf', name: 'Crop PDF',
    description: 'Trim margins off every page by setting how many points to cut from each edge.',
    keywords: ['trim', 'margins', 'cut', 'resize pages', 'crop box'],
    render: function (root) {
      singlePdf(root, {
        onLoad: async function (ctx) {
          var src = await openPdfLib(ctx.bytes);
          var count = src.getPageCount();
          var vb0 = visualBox(src.getPage(0));
          var W = Math.round(vb0.width), H = Math.round(vb0.height);
          ctx.info.append(ctx.file.name + ' (' + plural(count, 'page') + ' · ' + W + '×' + H + 'pt)');
          function box(label, max) { return U.input({ type: 'number', value: '0', min: '0', max: String(max), step: '1', 'aria-label': label }); }
          var top = box('Top', Math.floor(H / 2)), bottom = box('Bottom', Math.floor(H / 2));
          var left = box('Left', Math.floor(W / 2)), right = box('Right', Math.floor(W / 2));
          var sizeNote = el('p', { class: 'note' });
          var stage = el('div', { class: 'g-preview' });
          var shades = [0, 1, 2, 3].map(function () { return el('div', { class: 'g-shade' }); });
          var go = U.button('Crop PDF', null, 'primary');
          var result = resultArea();

          function m() {
            return {
              t: Math.max(0, num(top, 0)), b: Math.max(0, num(bottom, 0)),
              l: Math.max(0, num(left, 0)), r: Math.max(0, num(right, 0))
            };
          }
          function update() {
            var v = m();
            var rw = W - v.l - v.r, rh = H - v.t - v.b;
            sizeNote.textContent = 'Result size: ' + Math.round(rw) + '×' + Math.round(rh) + 'pt per page' +
              ' (' + (rw * 0.3528).toFixed(0) + '×' + (rh * 0.3528).toFixed(0) + ' mm)';
            sizeNote.className = rw < 1 || rh < 1 ? 'note err' : 'note';
            var pct = function (x, of) { return Math.max(0, Math.min(100, x / of * 100)) + '%'; };
            Object.assign(shades[0].style, { left: 0, top: 0, width: '100%', height: pct(v.t, H) });
            Object.assign(shades[1].style, { left: 0, bottom: 0, width: '100%', height: pct(v.b, H) });
            Object.assign(shades[2].style, { left: 0, top: pct(v.t, H), bottom: pct(v.b, H), width: pct(v.l, W) });
            Object.assign(shades[3].style, { right: 0, top: pct(v.t, H), bottom: pct(v.b, H), width: pct(v.r, W) });
            result.replaceChildren();
          }
          [top, bottom, left, right].forEach(function (i) { i.addEventListener('input', update); });
          update();

          openPdfjs(ctx.bytes).then(async function (pdf) {
            var r = await renderPage(pdf, 1, Math.min(1.2, 520 / Math.max(W, H)));
            closePdf(pdf);
            stage.replaceChildren.apply(stage, [r.canvas].concat(shades));
          }).catch(function () { stage.style.display = 'none'; });

          go.addEventListener('click', runBusy(go, async function () {
            try {
              var v = m();
              var doc = await openPdfLib(ctx.bytes);
              doc.getPages().forEach(function (page) {
                var b = page.getCropBox ? page.getCropBox() : page.getMediaBox();
                var rot = visualBox(page).rotation;
                /* visual margins -> unrotated page edges */
                var e = { 0: [v.l, v.r, v.t, v.b], 90: [v.b, v.t, v.l, v.r], 180: [v.r, v.l, v.b, v.t], 270: [v.t, v.b, v.r, v.l] }[rot] || [v.l, v.r, v.t, v.b];
                var nx = b.x + e[0], ny = b.y + e[3], nw = b.width - e[0] - e[1], nh = b.height - e[2] - e[3];
                if (nw < 1 || nh < 1) throw new Error('The margins are larger than the page.');
                page.setMediaBox(nx, ny, nw, nh);
                page.setCropBox(nx, ny, nw, nh);
              });
              var bytes = await doc.save();
              result.done('Cropped ' + plural(count, 'page'), bytes, baseName(ctx.file.name) + '-cropped.pdf', 'Download Cropped PDF');
            } catch (err) { result.fail(err); }
          }));

          ctx.body.append(U.panel(null,
            U.note('Enter crop margin in points (1 pt ≈ 0.353 mm). Applies to all pages.'),
            U.row(field('Top margin (pt)', top), field('Bottom margin (pt)', bottom), field('Left margin (pt)', left), field('Right margin (pt)', right)),
            sizeNote, stage, U.btnrow(go), result));
        }
      });
    }
  });

  /* ========================================================================
     Redact PDF
     ======================================================================== */

  Tools.register({
    id: 'redact-pdf', category: 'pdf', name: 'Redact PDF',
    description: 'Black out text or areas in a PDF for good: pages are flattened so the hidden content is gone.',
    keywords: ['black out', 'censor', 'hide text', 'privacy', 'sensitive', 'redaction'],
    render: function (root) {
      root.classList.add('g-pdf');
      var progress = U.progress();
      var zone = U.dropzone({
        accept: 'application/pdf,.pdf', label: 'Drop a PDF here, or click to choose',
        hint: 'Your file never leaves your device — redaction happens in your browser',
        onFiles: function (f) { load(f[0]); }
      });
      var work = el('div', { class: 'stack' });
      root.appendChild(U.panel(null, zone, progress));
      root.appendChild(work);

      var state = null;   /* { pdf, file, pages: [{ w, h, boxes:[{x,y,w,h}], layer, items }] } */
      var history = [];

      async function load(file) {
        if (!file) return;
        if (!isPdf(file)) return progress.fail(new Error(file.name + ' is not a PDF.'));
        work.replaceChildren();
        history = [];
        try {
          progress.set('Loading PDF… 0%', 0);
          var bytes = new Uint8Array(await U.readAs(file));
          var pdf = await openPdfjs(bytes, state && state.password);
          state = { pdf: pdf, file: file, bytes: bytes, pages: [] };
          var holder = el('div', { class: 'g-pages' });
          var width = Math.min(820, Math.max(280, (root.clientWidth || 820) - 40));
          for (var i = 1; i <= pdf.numPages; i++) {
            progress.set('Loading PDF… ' + Math.round((i - 1) / pdf.numPages * 100) + '%', (i - 1) / pdf.numPages);
            var page = await pdf.getPage(i);
            var vp1 = page.getViewport({ scale: 1 });
            var scale = width / vp1.width;
            var vp = page.getViewport({ scale: scale * (window.devicePixelRatio || 1) });
            var canvas = el('canvas', { width: Math.floor(vp.width), height: Math.floor(vp.height) });
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
            var info = { w: vp1.width, h: vp1.height, boxes: [], page: page, vp1: vp1 };
            var layer = el('div', { class: 'g-rpage', style: { width: width + 'px', height: Math.round(vp1.height * scale) + 'px' } },
              el('span', { class: 'lbl', text: 'Page ' + i }), canvas);
            info.layer = layer;
            attachDrawing(info);
            state.pages.push(info);
            holder.appendChild(layer);
          }
          progress.set('');
          buildControls(holder);
        } catch (err) { progress.fail(err); }
      }

      function buildControls(holder) {
        var count = el('span', { class: 'note' });
        var search = U.input({ placeholder: 'Find text to black out, e.g. a name or number' });
        var matchCase = U.checkbox('Match case');
        var dpi = sel([{ value: '100', label: 'Smaller file (100 dpi)' }, { value: '150', label: 'Balanced (150 dpi)' }, { value: '220', label: 'Sharper (220 dpi)' }, { value: '300', label: 'Print (300 dpi)' }], '150');
        var undo = U.button('Undo', function () {
          var last = history.pop();
          if (!last) return;
          var idx = last.page.boxes.indexOf(last.box);
          if (idx > -1) last.page.boxes.splice(idx, 1);
          redrawBoxes(last.page); refresh();
        }, 'ghost');
        var clear = U.button('Clear all boxes', function () {
          state.pages.forEach(function (p) { p.boxes = []; redrawBoxes(p); });
          history = []; refresh();
        }, 'ghost');
        var find = U.button('Black out matches', async function () {
          var q = search.value;
          if (!q.trim()) return U.toast('Type the text to find', 'err');
          var n = await redactMatches(q, matchCase.input.checked);
          U.toast(n ? 'Added ' + plural(n, 'box') + '' : 'No matches found', n ? '' : 'err');
        });
        var apply = U.button('Apply & Download', null, 'primary');
        var result = resultArea();
        apply.addEventListener('click', runBusy(apply, async function () {
          try {
            var total = state.pages.reduce(function (a, p) { return a + p.boxes.length; }, 0);
            if (!total) throw new Error('Draw at least one box first (drag on the page).');
            var L = await libPdf();
            var scale = parseInt(dpi.value, 10) / 72, imgs = [];
            for (var i = 0; i < state.pages.length; i++) {
              result.busy('Flattening page ' + (i + 1) + ' of ' + state.pages.length + '…', i / state.pages.length);
              var p = state.pages[i];
              var r = await renderPage(state.pdf, i + 1, scale);
              var c = r.canvas.getContext('2d');
              c.fillStyle = '#000';
              p.boxes.forEach(function (b) {
                c.fillRect(Math.floor(b.x * r.canvas.width), Math.floor(b.y * r.canvas.height),
                  Math.ceil(b.w * r.canvas.width) + 1, Math.ceil(b.h * r.canvas.height) + 1);
              });
              imgs.push({ bytes: await canvasBytes(r.canvas, 'image/jpeg', 0.9), width: r.width, height: r.height });
            }
            var doc = await imagesToPdf(L, imgs);
            doc.setTitle(baseName(state.file.name) + ' (redacted)');
            var bytes = await doc.save();
            var name = baseName(state.file.name) + '-redacted.pdf';
            result.done('Redacted ' + plural(total, 'area') + ' — ' + plural(imgs.length, 'page') + ' flattened', bytes, name, 'Download Redacted PDF',
              U.note('Every page is now an image, so the text under the boxes (and elsewhere) cannot be copied, searched or recovered.'));
            U.saveBlob(name, pdfBlob(bytes));
          } catch (err) { result.fail(err); }
        }));
        function refresh() {
          var n = state.pages.reduce(function (a, p) { return a + p.boxes.length; }, 0);
          count.textContent = plural(n, 'box') + ' on ' + plural(state.pages.filter(function (p) { return p.boxes.length; }).length, 'page');
        }
        state.refresh = refresh;
        refresh();
        setKids(work, 
          U.panel(null, el('div', { class: 'g-file-line' }, state.file.name, el('span', { class: 'muted', text: plural(state.pages.length, 'page') })),
            U.note('Drag on a page to draw a black box. Hover a box and press × to remove it.'),
            U.row(el('div', { class: 'grow' }, field('Find text', search)), matchCase, find),
            U.row(field('Output quality', dpi), undo, clear, count),
            U.btnrow(apply), result),
          U.panel(null, holder));
      }

      function redrawBoxes(p) {
        Array.prototype.slice.call(p.layer.querySelectorAll('.g-box')).forEach(function (n) { n.remove(); });
        p.boxes.forEach(function (b) {
          var node = el('div', { class: 'g-box', style: { left: b.x * 100 + '%', top: b.y * 100 + '%', width: b.w * 100 + '%', height: b.h * 100 + '%' } },
            el('button', { type: 'button', text: '×', title: 'Remove', onpointerdown: function (e) { e.stopPropagation(); },
              onclick: function (e) {
                e.stopPropagation();
                p.boxes.splice(p.boxes.indexOf(b), 1);
                redrawBoxes(p); state.refresh();
              } }));
          p.layer.appendChild(node);
        });
      }

      function attachDrawing(p) {
        var start = null, draft = null;
        function pt(e) {
          var r = p.layer.getBoundingClientRect();
          return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
        }
        p.layer.addEventListener('pointerdown', function (e) {
          if (e.button !== 0) return;
          start = pt(e);
          draft = el('div', { class: 'g-box draft' });
          p.layer.appendChild(draft);
          p.layer.setPointerCapture(e.pointerId);
          e.preventDefault();
        });
        p.layer.addEventListener('pointermove', function (e) {
          if (!start) return;
          var q = pt(e);
          Object.assign(draft.style, {
            left: Math.min(start.x, q.x) * 100 + '%', top: Math.min(start.y, q.y) * 100 + '%',
            width: Math.abs(q.x - start.x) * 100 + '%', height: Math.abs(q.y - start.y) * 100 + '%'
          });
        });
        function end(e) {
          if (!start) return;
          var q = pt(e), s = start;
          start = null;
          draft.remove();
          var b = { x: Math.min(s.x, q.x), y: Math.min(s.y, q.y), w: Math.abs(q.x - s.x), h: Math.abs(q.y - s.y) };
          if (b.w * p.w < 3 || b.h * p.h < 3) return;
          p.boxes.push(b);
          history.push({ page: p, box: b });
          redrawBoxes(p);
          if (state.refresh) state.refresh();
        }
        p.layer.addEventListener('pointerup', end);
        p.layer.addEventListener('pointercancel', function () { start = null; if (draft) draft.remove(); });
      }

      /* Search each page's text items and box the matching character runs. */
      async function redactMatches(query, matchCase) {
        var m = await libPdfjs();
        var added = 0;
        var needle = matchCase ? query : query.toLowerCase();
        for (var i = 0; i < state.pages.length; i++) {
          var p = state.pages[i];
          if (!p.items) p.items = (await p.page.getTextContent()).items.filter(function (it) { return 'str' in it && it.str; });
          p.items.forEach(function (it) {
            var hay = matchCase ? it.str : it.str.toLowerCase();
            var from = 0, at;
            while ((at = hay.indexOf(needle, from)) > -1) {
              from = at + Math.max(1, needle.length);
              var tx = m.Util.transform(p.vp1.transform, it.transform);
              var fontH = Math.hypot(tx[2], tx[3]);
              var len = it.str.length || 1;
              var x0 = tx[4] + (it.width * p.vp1.scale) * (at / len);
              var wpx = (it.width * p.vp1.scale) * (needle.length / len);
              var b = { x: (x0 - 1) / p.vp1.width, y: (tx[5] - fontH * 0.95) / p.vp1.height, w: (wpx + 2) / p.vp1.width, h: (fontH * 1.2) / p.vp1.height };
              b.x = Math.max(0, b.x); b.y = Math.max(0, b.y);
              p.boxes.push(b);
              history.push({ page: p, box: b });
              added++;
            }
          });
          redrawBoxes(p);
        }
        state.refresh();
        return added;
      }

      U.onTeardown(root, function () { if (state && state.pdf) closePdf(state.pdf); });
    }
  });

  /* ========================================================================
     Document Scanner to PDF
     ======================================================================== */

  function libScan() { return U.script('assets/js/lib/pdf-file-scan.js').then(function () { return window.ScanLib; }); }

  function todayName() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return 'Scan ' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  async function decodeImage(file) {
    var img;
    try {
      img = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch (e) {
      img = await U.loadImage(file);
    }
    var w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
    var k = Math.min(1, 2600 / Math.max(w, h));
    var c = el('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    if (img.close) img.close();
    return c;
  }

  Tools.register({
    id: 'document-scanner', category: 'pdf', name: 'Document Scanner to PDF',
    description: 'Photograph paper pages, straighten them, clean up shadows and save them all as one PDF.',
    keywords: ['document scanner online', 'scan to pdf', 'photo to pdf scanner', 'scan documents with phone', 'camscanner alternative', 'perspective'],
    render: function (root) {
      root.classList.add('g-pdf');
      var pages = [];          /* { source, corners, filter, turns, out (canvas), thumb } */
      var editing = null;      /* { entry, isNew, corners, filter, turns } */
      var status = U.note('');

      var camera = el('input', { type: 'file', accept: 'image/*', capture: 'environment', style: { display: 'none' } });
      var picker = el('input', { type: 'file', accept: 'image/*', multiple: true, style: { display: 'none' } });
      camera.addEventListener('change', function () { addFiles(camera.files); camera.value = ''; });
      picker.addEventListener('change', function () { addFiles(picker.files); picker.value = ''; });
      var drop = el('div', { class: 'dropzone', tabIndex: 0,
          onclick: function () { picker.click(); },
          ondragover: function (e) { e.preventDefault(); drop.classList.add('over'); },
          ondragleave: function () { drop.classList.remove('over'); },
          ondrop: function (e) { e.preventDefault(); drop.classList.remove('over'); addFiles(e.dataTransfer.files); } },
        el('strong', { text: 'Choose photos' }), el('span', { text: 'Or drop them here. Several at once become several pages.' }));
      var intro = U.panel(null,
        el('div', { class: 'g-kw' }, ['document scanner online', 'scan to pdf', 'photo to pdf scanner', 'scan documents with phone', 'camscanner alternative'].map(function (k) { return el('span', { text: k }); })),
        U.btnrow(U.button('📷 Take a photo (on a phone)', function () { camera.click(); }, 'primary')),
        U.note('Opens your camera on a phone or tablet'),
        drop, camera, picker,
        U.note('Photos are straightened and turned into a PDF on this device. Nothing is uploaded.'),
        U.note('Tip: put the page on a dark, plain surface in good light, and hold the phone straight above it.'),
        status);

      var editorPanel = el('section', { class: 'panel' });
      var listPanel = el('section', { class: 'panel' });
      root.appendChild(intro);
      root.appendChild(editorPanel);
      root.appendChild(listPanel);
      editorPanel.style.display = 'none';

      var paper = U.chips([{ value: 'A4', label: 'A4' }, { value: 'Letter', label: 'US Letter' }, { value: 'fit', label: 'Same as page' }], null, Region.get().paper === 'letter' ? 'Letter' : 'A4');
      var margin = U.checkbox('White margin around each page', { checked: true });
      var hq = U.checkbox('High quality (bigger file)');
      var fname = U.input({ value: todayName() });
      var dlBtn = U.button('Download PDF', null, 'primary');
      hq.input.addEventListener('change', function () { pages.forEach(function (p) { p.out = null; }); });

      async function addFiles(fileList) {
        var files = Array.prototype.filter.call(fileList || [], function (f) { return /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp|heic)$/i.test(f.name); });
        if (!files.length) { status.className = 'note err'; status.textContent = 'Choose image files (JPG, PNG…).'; return; }
        status.className = 'note'; status.textContent = 'Reading ' + plural(files.length, 'photo') + '…';
        try {
          var S = await libScan();
          if (files.length === 1 && !editing) {
            var src = await decodeImage(files[0]);
            var found = S.findPage(src);
            openEditor({ source: src, corners: found || S.wholePhoto(src), filter: 'color', turns: 0 }, true, !found);
          } else {
            for (var i = 0; i < files.length; i++) {
              status.textContent = 'Straightening photo ' + (i + 1) + ' of ' + files.length + '…';
              var s = await decodeImage(files[i]);
              var c = S.findPage(s);
              var entry = { source: s, corners: c || S.wholePhoto(s), filter: 'color', turns: 0 };
              await finish(entry);
              pages.push(entry);
            }
            drawList();
          }
          status.textContent = '';
        } catch (err) { status.className = 'note err'; status.textContent = err.message || String(err); }
      }

      function maxDim() { return hq.input.checked ? 2600 : 1700; }

      async function finish(entry) {
        var S = await libScan();
        entry.out = S.process(entry.source, entry.corners, entry.filter, entry.turns, maxDim());
        entry.thumb = thumbOf(entry.out);
      }

      function thumbOf(c) {
        var k = Math.min(1, 240 / Math.max(c.width, c.height));
        var t = el('canvas'); t.width = Math.max(1, Math.round(c.width * k)); t.height = Math.max(1, Math.round(c.height * k));
        t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
        return t.toDataURL('image/jpeg', 0.7);
      }

      /* --- corner editor --- */
      function openEditor(entry, isNew, notFound) {
        editing = {
          entry: entry, isNew: isNew,
          corners: entry.corners.map(function (p) { return { x: p.x, y: p.y }; }),
          filter: entry.filter, turns: entry.turns
        };
        var src = entry.source;
        var view = el('canvas', { width: src.width, height: src.height });
        view.getContext('2d').drawImage(src, 0, 0);
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 ' + src.width + ' ' + src.height);
        svg.setAttribute('preserveAspectRatio', 'none');
        var poly = document.createElementNS(svg.namespaceURI, 'polygon');
        poly.setAttribute('fill', 'rgba(37,99,235,.12)');
        poly.setAttribute('stroke', 'var(--accent)');
        poly.setAttribute('stroke-width', String(Math.max(2, src.width / 300)));
        svg.appendChild(poly);
        var r = Math.max(10, Math.max(src.width, src.height) / 45);
        var handles = editing.corners.map(function (c, i) {
          var h = document.createElementNS(svg.namespaceURI, 'circle');
          h.setAttribute('r', String(r));
          h.setAttribute('class', 'h');
          h.dataset.i = String(i);
          svg.appendChild(h);
          return h;
        });
        var stage = el('div', { class: 'g-stage' }, view, svg);
        var preview = el('img', { class: 'g-result-preview', alt: 'Result preview' });

        function drawQuad() {
          poly.setAttribute('points', editing.corners.map(function (p) { return p.x + ',' + p.y; }).join(' '));
          handles.forEach(function (h, i) { h.setAttribute('cx', editing.corners[i].x); h.setAttribute('cy', editing.corners[i].y); });
        }
        var refreshPreview = U.debounce(async function () {
          try {
            var S = await libScan();
            var out = S.process(src, editing.corners, editing.filter, editing.turns, 700);
            preview.src = out.toDataURL('image/jpeg', 0.75);
          } catch (e) { /* keep the old preview while the quad is invalid */ }
        }, 150);
        drawQuad(); refreshPreview();

        var dragging = -1;
        svg.addEventListener('pointerdown', function (e) {
          var t = e.target;
          var pt = toImage(e);
          if (t.dataset && t.dataset.i !== undefined) dragging = parseInt(t.dataset.i, 10);
          else {
            /* grab the nearest corner */
            var best = -1, bd = Infinity;
            editing.corners.forEach(function (c, i) { var d = Math.hypot(c.x - pt.x, c.y - pt.y); if (d < bd) { bd = d; best = i; } });
            dragging = bd < r * 4 ? best : -1;
          }
          if (dragging > -1) { svg.setPointerCapture(e.pointerId); e.preventDefault(); }
        });
        svg.addEventListener('pointermove', function (e) {
          if (dragging < 0) return;
          var pt = toImage(e);
          editing.corners[dragging] = { x: Math.max(0, Math.min(src.width, pt.x)), y: Math.max(0, Math.min(src.height, pt.y)) };
          drawQuad();
          refreshPreview();
        });
        svg.addEventListener('pointerup', function () { dragging = -1; });
        svg.addEventListener('pointercancel', function () { dragging = -1; });
        function toImage(e) {
          var b = svg.getBoundingClientRect();
          return { x: (e.clientX - b.left) / b.width * src.width, y: (e.clientY - b.top) / b.height * src.height };
        }

        var filters = U.chips([
          { value: 'color', label: 'Clean colour' }, { value: 'gray', label: 'Clean grey' },
          { value: 'bw', label: 'Black & white' }, { value: 'original', label: 'Original' }
        ], function (v) { editing.filter = v; refreshPreview(); }, editing.filter);
        var findMsg = U.note(notFound ? 'Could not find the page edges automatically — drag the corners by hand.' : '');

        setKids(editorPanel, 
          el('h3', { text: isNew ? 'Adjust the new page' : 'Adjust page ' + (pages.indexOf(entry) + 1) }),
          U.note('Drag the 4 corners onto the corners of the paper.'),
          U.btnrow(
            U.button('Find page', async function () {
              var S = await libScan();
              var f = S.findPage(src);
              if (f) { editing.corners = f; findMsg.textContent = ''; }
              else findMsg.textContent = 'Could not find the page edges — drag the corners by hand.';
              drawQuad(); refreshPreview();
            }, 'ghost'),
            U.button('Whole photo', async function () {
              var S = await libScan();
              editing.corners = S.wholePhoto(src);
              drawQuad(); refreshPreview();
            }, 'ghost')),
          findMsg,
          el('div', { class: 'row', style: { alignItems: 'flex-start' } }, el('div', { class: 'grow' }, stage),
            el('div', { class: 'stack' }, el('strong', { text: 'Result' }), preview)),
          filters,
          U.btnrow(
            U.button('⟲ Left', function () { editing.turns = (editing.turns + 3) % 4; refreshPreview(); }, 'ghost'),
            U.button('⟳ Right', function () { editing.turns = (editing.turns + 1) % 4; refreshPreview(); }, 'ghost')),
          U.btnrow(
            U.button(isNew ? 'Add page' : 'Save page', async function () {
              var e = editing.entry;
              e.corners = editing.corners; e.filter = editing.filter; e.turns = editing.turns;
              try {
                await finish(e);
              } catch (err) { findMsg.textContent = err.message; findMsg.className = 'note err'; return; }
              if (editing.isNew) pages.push(e);
              closeEditor();
            }, 'primary'),
            U.button('Cancel', closeEditor, 'ghost')));
        editorPanel.style.display = '';
        intro.style.display = 'none';
        listPanel.style.display = 'none';
      }

      function closeEditor() {
        editing = null;
        editorPanel.replaceChildren();
        editorPanel.style.display = 'none';
        intro.style.display = '';
        drawList();
      }

      function move(i, d) {
        var j = i + d;
        if (j < 0 || j >= pages.length) return;
        var t = pages[i]; pages[i] = pages[j]; pages[j] = t;
        drawList();
      }

      function drawList() {
        listPanel.style.display = pages.length ? '' : 'none';
        dlBtn.textContent = 'Download PDF (' + plural(pages.length, 'page') + ')';
        setKids(listPanel, 
          el('h3', { text: plural(pages.length, 'page') }),
          el('div', { class: 'g-thumbs' }, pages.map(function (p, i) {
            return el('div', { class: 'g-thumb' },
              el('strong', { text: String(i + 1) }),
              el('img', { src: p.thumb, alt: 'Page ' + (i + 1) }),
              el('div', { class: 'btnrow' },
                el('button', { class: 'btn ghost', type: 'button', title: 'Move earlier', 'aria-label': 'Move earlier', text: '←', onclick: function () { move(i, -1); } }),
                el('button', { class: 'btn ghost', type: 'button', title: 'Rotate', 'aria-label': 'Rotate', text: '⟳', onclick: async function () {
                  p.turns = (p.turns + 1) % 4; await finish(p); drawList(); } }),
                el('button', { class: 'btn ghost', type: 'button', title: 'Edit corners and filter', 'aria-label': 'Edit corners and filter', text: '✎', onclick: function () { openEditor(p, false); } }),
                el('button', { class: 'btn ghost', type: 'button', title: 'Delete page', 'aria-label': 'Delete page', text: '✕', onclick: function () { pages.splice(i, 1); drawList(); } }),
                el('button', { class: 'btn ghost', type: 'button', title: 'Move later', 'aria-label': 'Move later', text: '→', onclick: function () { move(i, 1); } })));
          })),
          field('Paper size', paper),
          U.row(margin, hq),
          field('File name', fname),
          U.btnrow(dlBtn),
          dlStatus);
      }
      var dlStatus = U.note('');

      dlBtn.addEventListener('click', runBusy(dlBtn, async function () {
        if (!pages.length) return;
        try {
          dlStatus.className = 'note'; dlStatus.textContent = 'Building PDF…';
          var images = [];
          for (var i = 0; i < pages.length; i++) {
            if (!pages[i].out) await finish(pages[i]);
            var c = pages[i].out;
            images.push({ bytes: await canvasBytes(c, 'image/jpeg', hq.input.checked ? 0.92 : 0.78), width: c.width, height: c.height, filter: 'DCTDecode' });
          }
          var blob = await PDFWriter.fromImages(images, {
            pageSize: paper.value, orientation: 'auto',
            margin: margin.input.checked ? 24 : 0, dpi: 200, title: fname.value || 'Scan'
          });
          var name = (fname.value.trim() || todayName()).replace(/[\\/:*?"<>|]+/g, '-');
          U.saveBlob(/\.pdf$/i.test(name) ? name : name + '.pdf', blob);
          dlStatus.className = 'note ok';
          dlStatus.textContent = 'Saved ' + plural(pages.length, 'page') + ' · ' + kb(blob.size);
        } catch (err) { dlStatus.className = 'note err'; dlStatus.textContent = err.message || String(err); }
      }));

      drawList();
    }
  });

  /* =========================================================================
     OCR (Image & PDF to Text)
     tesseract.js runs in a worker; the core and English data are vendored by
     `npm run vendor -- --models` (see scripts/vendor.js).
     ========================================================================= */

  var OCR_PATHS = {
    lib: 'assets/vendor/tesseract/tesseract.min.js',
    worker: 'assets/vendor/tesseract/worker.min.js',
    core: 'assets/vendor/tesseract',
    lang: 'assets/models/tessdata'
  };
  var OCR_LANGS = [
    ['eng', 'English'], ['fra', 'French'], ['deu', 'German'], ['spa', 'Spanish'], ['ita', 'Italian'], ['por', 'Portuguese'],
    ['nld', 'Dutch'], ['pol', 'Polish'], ['swe', 'Swedish'], ['dan', 'Danish'], ['nor', 'Norwegian'], ['fin', 'Finnish'],
    ['tur', 'Turkish'], ['rus', 'Russian'], ['ukr', 'Ukrainian'], ['ell', 'Greek'], ['ces', 'Czech'], ['hun', 'Hungarian'],
    ['ron', 'Romanian'], ['jpn', 'Japanese'], ['chi_sim', 'Chinese (simplified)'], ['chi_tra', 'Chinese (traditional)'],
    ['kor', 'Korean'], ['ara', 'Arabic'], ['hin', 'Hindi'], ['vie', 'Vietnamese']
  ];
  function absUrl(p) { return new URL(p, document.baseURI).href; }

  var ocrWorker = null, ocrWorkerLang = '';
  async function ocrGetWorker(lang, onLog) {
    if (ocrWorker && ocrWorkerLang === lang) return ocrWorker;
    if (ocrWorker) { try { await ocrWorker.terminate(); } catch (e) { /* gone */ } ocrWorker = null; }
    if (location.protocol === 'file:') throw new Error('OCR needs the local server. Run "python serve.py" and open http://localhost:8000');
    /* Friendlier errors than the worker's own when the binaries are missing. */
    var probe = await fetch(absUrl(OCR_PATHS.lang + '/' + lang + '.traineddata.gz'), { method: 'HEAD', cache: 'no-store' }).catch(function () { return null; });
    if (!probe || !probe.ok) {
      throw new Error(lang === 'eng'
        ? 'The OCR language data is not installed. Run "npm run vendor -- --models" once, then reload.'
        : 'No "' + lang + '.traineddata.gz" in assets/models/tessdata. Add the code to TESSDATA_LANGS in scripts/vendor.js and run "npm run vendor -- --models", or drop the gzipped file from github.com/tesseract-ocr/tessdata_fast in that folder.');
    }
    var core = await fetch(absUrl(OCR_PATHS.core + '/tesseract-core-lstm.wasm.js'), { method: 'HEAD', cache: 'no-store' }).catch(function () { return null; });
    if (!core || !core.ok) throw new Error('The OCR engine (tesseract.js-core) is not vendored. Run "npm install && npm run vendor" once, then reload.');
    await U.script(OCR_PATHS.lib);
    var w = await window.Tesseract.createWorker(lang, 1, {
      workerPath: absUrl(OCR_PATHS.worker), corePath: absUrl(OCR_PATHS.core), langPath: absUrl(OCR_PATHS.lang),
      logger: function (m) { if (onLog) onLog(m); }
    });
    ocrWorker = w; ocrWorkerLang = lang;
    return w;
  }
  function ocrRelease() {
    if (ocrWorker) { var w = ocrWorker; ocrWorker = null; ocrWorkerLang = ''; try { w.terminate(); } catch (e) { /* ignore */ } }
  }

  Tools.register({
    id: 'ocr', category: 'pdf', name: 'OCR (Image & PDF to Text)',
    description: 'Read the text out of a photo, screenshot or scanned PDF with Tesseract, entirely in your browser.',
    keywords: ['ocr', 'optical character recognition', 'scan', 'scanned pdf', 'image to text', 'photo to text', 'screenshot to text', 'tesseract', 'extract text', 'searchable'],
    render: function (root) {
      root.classList.add('g-pdf');
      var file = null, running = false, cancelled = false;
      var lang = U.select({ label: 'Language', options: OCR_LANGS.map(function (l) { return { value: l[0], label: l[1] + ' (' + l[0] + ')' }; }), value: 'eng',
        hint: 'English is installed by npm run vendor -- --models. Other languages need their tessdata_fast file in assets/models/tessdata.' });
      var pages = U.input({ label: 'PDF pages', value: '1-', placeholder: '1-', hint: 'e.g. 1-3, 5. Scanned PDFs are rendered at 200 dpi before reading.' });
      var keepLines = U.checkbox('Keep line breaks', { checked: true });
      var progress = U.progress();
      var out = el('textarea', { readOnly: true, spellcheck: false, placeholder: 'The recognised text appears here.', style: { minHeight: '260px', fontFamily: 'var(--mono)', fontSize: '13px' } });
      var stats = el('div', { class: 'g-facts', style: { display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: '13px', color: 'var(--fg-muted)' } });
      var preview = el('div', { class: 'g-thumbs' });
      var info = el('div', { class: 'g-file-line' });
      var run = U.button('Extract text', function () { go().catch(function (e) { progress.fail(e); running = false; run.disabled = false; }); }, 'primary');
      var cancel = U.button('Cancel', function () { cancelled = true; ocrRelease(); progress.set('Cancelled'); running = false; run.disabled = false; }, 'ghost');
      var zone = U.dropzone({
        accept: 'image/*,application/pdf,.pdf', label: 'Drop an image or PDF here', hint: 'JPG, PNG, WebP, BMP, GIF or a scanned PDF. Nothing leaves this device.',
        onFiles: function (files) { pick(files[0]); }
      });

      function pick(f) {
        file = f; out.value = ''; stats.replaceChildren(); preview.replaceChildren();
        info.replaceChildren(el('span', { text: f.name }), el('span', { class: 'muted', text: kb(f.size) + (isPdf(f) ? ' · PDF' : ' · image') }));
        pages.style.display = isPdf(f) ? '' : 'none';
        progress.set('');
        if (!isPdf(f)) {
          var img = el('img', { alt: '', style: { maxWidth: '220px', maxHeight: '220px', border: '1px solid var(--border)', background: '#fff' } });
          img.src = URL.createObjectURL(f);
          img.onload = function () { URL.revokeObjectURL(img.src); };
          preview.appendChild(el('div', { class: 'g-thumb' }, img));
        }
      }

      function cleanText(t) {
        t = String(t || '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        if (!keepLines.input.checked) t = t.replace(/([^\n])\n(?!\n)/g, '$1 ');
        return t;
      }

      async function go() {
        if (!file) return U.toast('Drop an image or PDF first', 'err');
        if (running) return;
        running = true; cancelled = false; run.disabled = true;
        out.value = ''; stats.replaceChildren();
        var t0 = performance.now();
        var phase = '';
        var worker = await ocrGetWorker(lang.querySelector('select').value, function (m) {
          if (cancelled) return;
          if (m.status === 'recognizing text') progress.set(phase + 'Reading text… ' + Math.round(m.progress * 100) + '%', m.progress);
          else if (m.status && !/^recogniz/.test(m.status)) progress.set(phase + m.status.charAt(0).toUpperCase() + m.status.slice(1) + '…', m.progress);
        });
        var texts = [], confs = [], words = 0;
        async function read(image, label) {
          if (cancelled) throw new Error('Cancelled');
          var res = await worker.recognize(image);
          if (cancelled) throw new Error('Cancelled');
          var d = res.data;
          texts.push(label ? '--- ' + label + ' ---\n' + cleanText(d.text) : cleanText(d.text));
          confs.push(d.confidence || 0);
          words += (d.words ? d.words.length : (d.text.match(/\S+/g) || []).length);
          out.value = texts.join('\n\n');
        }
        if (isPdf(file)) {
          var bytes = new Uint8Array(await U.readAs(file));
          var pdf = await openPdfjs(bytes);
          try {
            var list = parsePages(pages.querySelector('input').value || '1-', pdf.numPages);
            for (var i = 0; i < list.length; i++) {
              phase = 'Page ' + (list[i] + 1) + ' of ' + pdf.numPages + ': ';
              progress.set(phase + 'Rendering…');
              var r = await renderPage(pdf, list[i] + 1, 200 / 72);
              await read(r.canvas, 'Page ' + (list[i] + 1));
            }
          } finally { closePdf(pdf); }
        } else {
          phase = '';
          await read(file, '');
        }
        var avg = confs.length ? confs.reduce(function (a, b) { return a + b; }, 0) / confs.length : 0;
        var secs = ((performance.now() - t0) / 1000).toFixed(1);
        stats.replaceChildren(
          el('span', {}, el('b', { text: String(words) }), ' words'),
          el('span', {}, el('b', { text: String(out.value.length) }), ' characters'),
          el('span', {}, el('b', { text: avg.toFixed(0) + '%' }), ' confidence'),
          el('span', {}, el('b', { text: secs + 's' })));
        progress.done(texts.length > 1 ? 'Read ' + plural(texts.length, 'page') + '.' : 'Done. Check the result against the picture: OCR is good, not perfect.');
        running = false; run.disabled = false;
      }

      root.appendChild(U.panel(null, zone, el('div', { class: 'row', style: { alignItems: 'center' } }, info), preview,
        el('div', { class: 'row' }, lang, pages, keepLines), U.btnrow(run, cancel), progress));
      root.appendChild(U.panel('Recognised text', out, stats,
        U.btnrow(U.copyBtn('Copy text', function () { return out.value; }),
          U.downloadBtn('Download .txt', 'ocr.txt', function () { return out.value; }))));
      root.appendChild(U.panel('Tips for better results', U.note('Straight, evenly lit, high-contrast pictures read best. Crop to the text you want, and give scans at least 200 dpi. The first run downloads nothing: the engine and language data are local, so it only takes a few seconds to warm up.')));
      pages.style.display = 'none';
      U.onTeardown(root, function () { cancelled = true; ocrRelease(); });
    }
  });

  /* =========================================================================
     PDF to Images
     ========================================================================= */

  Tools.register({
    id: 'pdf-to-images', category: 'pdf', name: 'PDF to Images',
    description: 'Turn every page of a PDF into a PNG, JPEG or WebP picture, singly or as one ZIP.',
    keywords: ['pdf to jpg', 'pdf to png', 'pdf to image', 'pdf to webp', 'rasterise', 'render pages', 'export pages', 'thumbnails', 'convert'],
    render: function (root) {
      var loaded = null;
      var format = sel([{ value: 'image/png', label: 'PNG (lossless)' }, { value: 'image/jpeg', label: 'JPEG (smaller)' }, { value: 'image/webp', label: 'WebP' }], 'image/png');
      var dpi = sel([{ value: '72', label: '72 dpi (screen)' }, { value: '150', label: '150 dpi' }, { value: '200', label: '200 dpi' }, { value: '300', label: '300 dpi (print)' }], '150');
      var quality = el('input', { type: 'range', min: 40, max: 100, value: 90 });
      var qualityLabel = el('span', { class: 'muted', text: '90%' });
      quality.addEventListener('input', function () { qualityLabel.textContent = quality.value + '%'; });
      var pagesIn = el('input', { type: 'text', value: '1-', placeholder: '1-' });
      var thumbs = el('div', { class: 'g-thumbs' });
      var result = resultArea();
      var rendered = [];

      function extFor(mime) { return mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png'; }

      singlePdf(root, {
        label: 'Drop a PDF here or click to upload',
        onLoad: async function (r) {
          var pdf = await openPdfjs(r.bytes);
          loaded = { file: r.file, bytes: r.bytes, count: pdf.numPages };
          closePdf(pdf);
          r.info.replaceChildren(el('span', { text: r.file.name }), el('span', { class: 'muted', text: kb(r.file.size) + ' · ' + plural(loaded.count, 'page') }));
          var convert = U.button('Convert pages', null, 'primary');
          convert.addEventListener('click', runBusy(convert, go));
          r.body.appendChild(U.panel('Options',
            el('div', { class: 'row' }, field('Format', format), field('Resolution', dpi), field('Pages', pagesIn),
              field('JPEG / WebP quality', el('div', { class: 'row', style: { alignItems: 'center' } }, quality, qualityLabel))),
            U.btnrow(convert), result));
          r.body.appendChild(U.panel('Pages', thumbs));
          thumbs.replaceChildren();
        }
      });

      async function go() {
        if (!loaded) return;
        var mime = format.value, q = quality.value / 100, scale = parseInt(dpi.value, 10) / 72;
        var list;
        try { list = parsePages(pagesIn.value, loaded.count); } catch (e) { result.fail(e); return; }
        var prog = result.busy('Rendering…', 0);
        thumbs.replaceChildren();
        rendered = [];
        var pdf = await openPdfjs(loaded.bytes);
        try {
          for (var i = 0; i < list.length; i++) {
            prog.set('Rendering page ' + (list[i] + 1) + ' (' + (i + 1) + ' of ' + list.length + ')…', i / list.length);
            var page = await renderPage(pdf, list[i] + 1, scale);
            if (mime !== 'image/png' && mime !== 'image/jpeg' && mime !== 'image/webp') mime = 'image/png';
            var bytes = await canvasBytes(page.canvas, mime, q);
            var blob = new Blob([bytes], { type: mime });
            if (mime === 'image/webp' && blob.type !== 'image/webp') throw new Error('This browser cannot encode WebP. Choose PNG or JPEG.');
            var name = baseName(loaded.file.name) + '-page-' + String(list[i] + 1).padStart(String(loaded.count).length, '0') + '.' + extFor(mime);
            rendered.push({ name: name, blob: blob, w: page.canvas.width, h: page.canvas.height });
            (function (item, canvas) {
              var img = el('img', { alt: 'Page ' + (list[i] + 1) });
              img.src = URL.createObjectURL(item.blob);
              thumbs.appendChild(el('div', { class: 'g-thumb' }, img,
                el('span', { class: 'muted', text: item.w + ' × ' + item.h + ' · ' + kbRound(item.blob.size) }),
                U.btnrow(U.button('Download', function () { U.saveBlob(item.name, item.blob); }))));
            })(rendered[rendered.length - 1], page.canvas);
          }
        } finally { closePdf(pdf); }
        var total = rendered.reduce(function (a, r) { return a + r.blob.size; }, 0);
        var note = list.ignored ? U.note('Ignored pages outside the document: ' + list.ignored) : null;
        if (rendered.length === 1) {
          result.done('Converted 1 page (' + kbRound(total) + ')', rendered[0].blob, rendered[0].name, 'Download ' + extFor(mime).toUpperCase(), note);
        } else {
          prog.set('Zipping…');
          await U.script('assets/vendor/jszip/jszip.min.js');
          var zip = new window.JSZip();
          rendered.forEach(function (r) { zip.file(r.name, r.blob); });
          var zipBlob = await zip.generateAsync({ type: 'blob' });
          result.done('Converted ' + plural(rendered.length, 'page') + ' (' + kbRound(total) + ')', zipBlob, baseName(loaded.file.name) + '-pages.zip', 'Download ZIP', note);
        }
      }
    }
  });

  /* Shared with the other PDF modules (pdf-b.js), so they load the same
     libraries and reuse the same helpers instead of copying them. */
  window.PdfKit = {
    libPdf: libPdf, libPdfjs: libPdfjs, libUnlock: libUnlock,
    openPdfjs: openPdfjs, openPdfLib: openPdfLib, closePdf: closePdf,
    baseName: baseName, kb: kb, kbRound: kbRound, isPdf: isPdf, pdfBlob: pdfBlob, plural: plural,
    parsePages: parsePages, runBusy: runBusy, singlePdf: singlePdf, resultArea: resultArea,
    renderPage: renderPage, canvasBytes: canvasBytes, imagesToPdf: imagesToPdf, sizeSummary: sizeSummary,
    pageText: pageText, decodeImage: decodeImage, winAnsiSafe: winAnsiSafe, hexColor: hexColor,
    ocrGetWorker: ocrGetWorker, ocrRelease: ocrRelease, OCR_LANGS: OCR_LANGS
  };
})();
