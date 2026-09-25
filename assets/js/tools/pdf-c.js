/* pdf-c tools: Markdown & HTML to PDF. The document is laid out by the browser
   in a sandboxed frame and saved through the print dialog, which keeps every
   style, image and table. A direct download is also offered: a simpler
   text layout drawn with pdf-lib's built-in fonts. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;
  var V = 'assets/vendor/';

  if (!document.getElementById('g-pdf-c-style')) {
    document.head.appendChild(el('style', { id: 'g-pdf-c-style', text: [
      '.g-pdfc textarea.mp-src { min-height: 360px; font-family: var(--mono); font-size: 13px; tab-size: 2; }',
      '.g-pdfc .mp-frame { width: 100%; height: 560px; border: 1px solid var(--border); border-radius: var(--radius-s); background: #e9ebf0; display: block; }',
      '.g-pdfc .mp-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; margin-bottom: 10px; }',
      '.g-pdfc .mp-opts { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px 12px; align-items: end; }',
      '.g-pdfc .mp-checks { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-top: 10px; }',
      '.g-pdfc .mp-hint { font-size: 13px; color: var(--fg-muted); margin: 8px 0 0; }',
      '.g-pdfc .mp-hint b { color: var(--fg); }'
    ].join('\n') }));
  }

  var MM = 72 / 25.4;
  var PAGES = { A4: [210, 297], Letter: [215.9, 279.4], A5: [148, 210], Legal: [215.9, 355.6] };
  var MARGINS = { narrow: 12.7, normal: 20, wide: 30 };
  var FONTS = {
    sans: { label: 'Sans serif', css: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', pdf: ['Helvetica', 'HelveticaBold', 'HelveticaOblique', 'HelveticaBoldOblique'] },
    serif: { label: 'Serif', css: 'Georgia, Cambria, "Times New Roman", Times, serif', pdf: ['TimesRoman', 'TimesRomanBold', 'TimesRomanItalic', 'TimesRomanBoldItalic'] },
    mono: { label: 'Monospace', css: 'ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace', pdf: ['Courier', 'CourierBold', 'CourierOblique', 'CourierBoldOblique'] }
  };

  var SAMPLE_MD = [
    '# Project update',
    '',
    'A short report written in **Markdown** and saved as a PDF. Edit this text and the preview on the right follows along.',
    '',
    '## This week',
    '',
    '- Finished the new *onboarding* flow',
    '- Fixed the export bug in `report.js`',
    '- Started on the [design review](https://example.com)',
    '  1. Collect feedback',
    '  2. Agree the changes',
    '',
    '## Numbers',
    '',
    '| Metric | Last week | This week |',
    '|---|---:|---:|',
    '| Sign-ups | 1,204 | 1,388 |',
    '| Churn | 2.1% | 1.8% |',
    '',
    '> Quotes, code blocks, tables and images all carry over.',
    '',
    '```js',
    'function greet(name) {',
    '  return "Hello, " + name;',
    '}',
    '```',
    '',
    '---',
    '',
    'Next update in two weeks.'
  ].join('\n');

  var SAMPLE_HTML = [
    '<h1>Invoice summary</h1>',
    '<p>This is <strong>HTML</strong>. Paste a whole page or a fragment; scripts are removed, but <code>&lt;style&gt;</code> blocks are kept.</p>',
    '<style>',
    '  .total { font-size: 1.3em; color: #1a5fb4; }',
    '</style>',
    '<table>',
    '  <thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead>',
    '  <tbody>',
    '    <tr><td>Design work</td><td>3</td><td>£450.00</td></tr>',
    '    <tr><td>Hosting</td><td>1</td><td>£25.00</td></tr>',
    '  </tbody>',
    '</table>',
    '<p class="total">Total: <b>£475.00</b></p>'
  ].join('\n');

  /* --- sanitising ---------------------------------------------------------- */

  /* Keep the markup and any <style> blocks; drop anything that could run code
     or navigate the frame. The frame is sandboxed without scripts as well. */
  function clean(html) {
    var doc = new DOMParser().parseFromString(String(html), 'text/html');
    var styles = Array.prototype.map.call(doc.querySelectorAll('style'), function (s) { return s.textContent; }).join('\n');
    doc.querySelectorAll('script, style, iframe, frame, frameset, object, embed, link, meta, base, form, noscript, template').forEach(function (n) { n.remove(); });
    doc.querySelectorAll('*').forEach(function (n) {
      Array.prototype.slice.call(n.attributes).forEach(function (a) {
        if (/^on/i.test(a.name) || /^(formaction|srcdoc|ping)$/i.test(a.name)) n.removeAttribute(a.name);
        else if (/^(href|src|xlink:href|action|poster|background)$/i.test(a.name) && /^\s*(javascript|vbscript|data:text\/html)/i.test(a.value)) n.removeAttribute(a.name);
      });
    });
    var title = (doc.querySelector('title') || {}).textContent || '';
    return { body: doc.body ? doc.body.innerHTML : '', styles: styles.replace(/<\/style/gi, ''), title: title.trim() };
  }

  function cssString(s) { return '"' + String(s).replace(/[\\"]/g, '\\$&').replace(/[\r\n]+/g, ' ') + '"'; }

  /* The printable document: page rules for print, a paper look on screen. */
  function buildDoc(body, userCss, o) {
    var size = PAGES[o.page], m = o.margin;
    var w = o.landscape ? size[1] : size[0], h = o.landscape ? size[0] : size[1];
    var font = FONTS[o.font].css;
    var marginBoxes = '';
    if (o.numbers) marginBoxes += '@bottom-center { content: counter(page) " of " counter(pages); font: 9pt ' + FONTS.sans.css + '; color: #666; }';
    if (o.header && o.title) marginBoxes += '@top-center { content: ' + cssString(o.title) + '; font: 9pt ' + FONTS.sans.css + '; color: #666; }';
    return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data: blob: https: http:; style-src \'unsafe-inline\'; font-src data:">' +
      '<title>' + U.escapeHtml(o.title || 'Document') + '</title><style>' +
      '@page { size: ' + w + 'mm ' + h + 'mm; margin: ' + m + 'mm; ' + marginBoxes + ' }' +
      'html { background: #fff; color: #16181d; -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
      'body { margin: 0; font-family: ' + font + '; font-size: ' + o.size + 'pt; line-height: 1.5; overflow-wrap: break-word; }' +
      'h1, h2, h3, h4, h5, h6 { line-height: 1.25; margin: 1.2em 0 .5em; break-after: avoid; page-break-after: avoid; }' +
      'h1 { font-size: 2em; } h2 { font-size: 1.55em; border-bottom: 1px solid #ddd; padding-bottom: .2em; } h3 { font-size: 1.25em; } h4 { font-size: 1.05em; }' +
      'body > :first-child { margin-top: 0; }' +
      'p, ul, ol, blockquote, pre, table { margin: 0 0 .9em; }' +
      'a { color: #1a5fb4; }' +
      'code, kbd, pre { font-family: ' + FONTS.mono.css + '; font-size: .9em; }' +
      'code { background: #f2f3f5; padding: .1em .3em; border-radius: 3px; }' +
      'pre { background: #f5f6f8; border: 1px solid #e3e5ea; border-radius: 4px; padding: .8em 1em; white-space: pre-wrap; break-inside: avoid; }' +
      'pre code { background: none; padding: 0; font-size: 1em; }' +
      'blockquote { border-left: 4px solid #cfd3db; margin-left: 0; padding: .1em 0 .1em 1em; color: #454a55; }' +
      'table { border-collapse: collapse; width: 100%; break-inside: auto; }' +
      'th, td { border: 1px solid #d5d8de; padding: .35em .6em; text-align: left; vertical-align: top; }' +
      'th { background: #f2f3f5; } tr { break-inside: avoid; }' +
      'img, svg { max-width: 100%; height: auto; break-inside: avoid; }' +
      'hr { border: 0; border-top: 1px solid #ccc; margin: 1.5em 0; }' +
      '.page-break { break-after: page; page-break-after: always; }' +
      '@media screen {' +
      '  html { background: #e9ebf0; }' +
      '  body { box-sizing: content-box; width: ' + (w - 2 * m) + 'mm; min-height: ' + (h - 2 * m) + 'mm; padding: ' + m + 'mm; margin: 16px auto; background: #fff; box-shadow: 0 1px 3px rgb(0 0 0 / 18%), 0 6px 20px rgb(0 0 0 / 8%); }' +
      '}' +
      '</style>' + (userCss ? '<style>' + userCss + '</style>' : '') +
      '</head><body>' + body + '</body></html>';
  }

  /* --- direct PDF (pdf-lib, standard fonts) ------------------------------- */

  var SWAPS = { '\u2192': '->', '\u2190': '<-', '\u2713': 'v', '\u2714': 'v', '\u2717': 'x', '\u2264': '<=', '\u2265': '>=', '\u2260': '!=', '\u00a0': ' ', '\u2212': '-', '\u2011': '-', '\u202f': ' ', '\u2009': ' ', '\t': '    ' };

  function pdfSafe(font, cache, text) {
    var out = '';
    for (var ch of String(text)) {
      if (SWAPS[ch] !== undefined) { out += SWAPS[ch]; continue; }
      var ok = cache[ch];
      if (ok === undefined) {
        try { font.encodeText(ch); ok = true; } catch (e) { ok = false; }
        cache[ch] = ok;
      }
      out += ok ? ch : '?';
    }
    return out;
  }

  /* Walk the rendered HTML into blocks of styled runs. */
  function toBlocks(root) {
    var blocks = [];
    function runs(node, style, list) {
      list = list || [];
      node.childNodes.forEach(function (n) {
        if (n.nodeType === 3) { list.push({ text: n.textContent.replace(/\s+/g, ' '), s: style }); return; }
        if (n.nodeType !== 1) return;
        var t = n.tagName;
        if (t === 'BR') { list.push({ text: '\n', s: style }); return; }
        if (/^(UL|OL|TABLE|PRE|BLOCKQUOTE|IMG|SVG)$/.test(t)) return;
        var s = Object.assign({}, style);
        if (/^(B|STRONG|TH)$/.test(t)) s.b = true;
        if (/^(I|EM|CITE|DFN)$/.test(t)) s.i = true;
        if (/^(CODE|KBD|SAMP|TT)$/.test(t)) s.mono = true;
        if (t === 'A') s.link = true;
        if (/^(DEL|S|STRIKE)$/.test(t)) s.strike = true;
        if (t === 'INPUT' && n.type === 'checkbox') { list.push({ text: n.checked ? '[x] ' : '[ ] ', s: style }); return; }
        runs(n, s, list);
      });
      return list;
    }
    function walk(node, depth, quote) {
      node.childNodes.forEach(function (n) {
        if (n.nodeType === 3) {
          if (n.textContent.trim()) blocks.push({ kind: 'p', runs: [{ text: n.textContent.replace(/\s+/g, ' '), s: {} }], indent: depth, quote: quote });
          return;
        }
        if (n.nodeType !== 1) return;
        var t = n.tagName, m = /^H([1-6])$/.exec(t);
        if (m) blocks.push({ kind: 'h', level: +m[1], runs: runs(n, { b: true }), quote: quote, indent: depth });
        else if (t === 'P' || t === 'DT' || t === 'FIGCAPTION' || t === 'CAPTION') blocks.push({ kind: 'p', runs: runs(n, {}), indent: depth, quote: quote });
        else if (t === 'DD') blocks.push({ kind: 'p', runs: runs(n, {}), indent: depth + 1, quote: quote });
        else if (t === 'UL' || t === 'OL') {
          var i = +(n.getAttribute('start') || 1);
          Array.prototype.forEach.call(n.children, function (li) {
            if (li.tagName !== 'LI') return;
            blocks.push({ kind: 'li', marker: t === 'OL' ? (i++) + '.' : '\u2022', runs: runs(li, {}), indent: depth + 1, quote: quote });
            Array.prototype.forEach.call(li.children, function (c) {
              if (/^(UL|OL|PRE|TABLE|BLOCKQUOTE)$/.test(c.tagName)) { var wrap = document.createElement('div'); wrap.appendChild(c.cloneNode(true)); walk(wrap, depth + 1, quote); }
            });
          });
        }
        else if (t === 'PRE') blocks.push({ kind: 'pre', text: n.textContent.replace(/\n$/, ''), indent: depth, quote: quote });
        else if (t === 'BLOCKQUOTE') walk(n, depth, true);
        else if (t === 'HR') blocks.push({ kind: 'hr' });
        else if (t === 'TABLE') {
          var rows = Array.prototype.map.call(n.querySelectorAll('tr'), function (tr) {
            return Array.prototype.map.call(tr.children, function (c) { return { runs: runs(c, c.tagName === 'TH' ? { b: true } : {}), head: c.tagName === 'TH' }; });
          }).filter(function (r) { return r.length; });
          if (rows.length) blocks.push({ kind: 'table', rows: rows, indent: depth, quote: quote });
        }
        else if (t === 'IMG' || t === 'SVG' || t === 'PICTURE' || t === 'VIDEO' || t === 'CANVAS') blocks.push({ kind: 'img' });
        else if (/^(DIV|SECTION|ARTICLE|MAIN|HEADER|FOOTER|ASIDE|NAV|FIGURE|DL|DETAILS|SUMMARY|CENTER|BODY)$/.test(t)) walk(n, depth, quote);
        else { var r = runs({ childNodes: [n] }, {}); if (r.some(function (x) { return x.text.trim(); })) blocks.push({ kind: 'p', runs: r, indent: depth, quote: quote }); }
      });
    }
    walk(root, 0, false);
    return blocks;
  }

  async function directPdf(bodyHtml, o) {
    await U.script(V + 'pdf-lib/pdf-lib.min.js');
    var L = window.PDFLib;
    var doc = await L.PDFDocument.create();
    doc.setTitle(o.title || 'Document');
    doc.setProducer('All The Tools');
    var fam = FONTS[o.font].pdf, monoFam = FONTS.mono.pdf;
    var F = {};
    var names = fam.concat(monoFam);
    for (var i = 0; i < names.length; i++) if (!F[names[i]]) F[names[i]] = await doc.embedFont(L.StandardFonts[names[i]]);
    var cache = {};
    function fontFor(s) { var f = s.mono ? monoFam : fam; return F[f[(s.b ? 1 : 0) + (s.i ? 2 : 0)]]; }

    var size = PAGES[o.page];
    var pw = (o.landscape ? size[1] : size[0]) * MM, ph = (o.landscape ? size[0] : size[1]) * MM;
    var m = o.margin * MM, base = o.size;
    var ink = L.rgb(0.09, 0.1, 0.12), soft = L.rgb(0.4, 0.42, 0.46), link = L.rgb(0.1, 0.37, 0.71), rule = L.rgb(0.8, 0.81, 0.84), shade = L.rgb(0.96, 0.965, 0.973);
    var page, y, skippedImages = 0;

    function newPage() { page = doc.addPage([pw, ph]); y = ph - m; }
    function ensure(h) { if (y - h < m) newPage(); }
    newPage();

    /* Break styled runs into lines that fit `width`. Each line is a list of
       { text, s, w } pieces. */
    function layout(rs, fontSize, width) {
      var lines = [[]], lineW = 0;
      rs.forEach(function (r) {
        var f = fontFor(r.s);
        var parts = r.text === '\n' ? ['\n'] : pdfSafe(f, cache, r.text).split(/( )/);
        parts.forEach(function (word) {
          if (word === '') return;
          if (word === '\n') { lines.push([]); lineW = 0; return; }
          var sz = r.s.mono ? fontSize * 0.92 : fontSize;
          var w = f.widthOfTextAtSize(word, sz);
          var cur = lines[lines.length - 1];
          if (word === ' ' && !cur.length) return;
          if (lineW + w > width && cur.length && word !== ' ') {
            while (cur.length && cur[cur.length - 1].text === ' ') lineW -= cur.pop().w;
            lines.push(cur = []); lineW = 0;
          }
          /* A single word wider than the line is split by characters. */
          while (w > width && word.length > 1) {
            var cut = word.length;
            while (cut > 1 && f.widthOfTextAtSize(word.slice(0, cut), sz) > width - lineW) cut--;
            cur.push({ text: word.slice(0, cut), s: r.s, w: f.widthOfTextAtSize(word.slice(0, cut), sz), sz: sz, f: f });
            lines.push(cur = []); lineW = 0;
            word = word.slice(cut); w = f.widthOfTextAtSize(word, sz);
          }
          cur.push({ text: word, s: r.s, w: w, sz: sz, f: f });
          lineW += w;
        });
      });
      return lines.filter(function (l, i) { return l.length || i < lines.length - 1; });
    }

    function drawLine(line, x, baseY, colour) {
      line.forEach(function (p) {
        if (p.text !== ' ') {
          var c = p.s.link ? link : colour;
          page.drawText(p.text, { x: x, y: baseY, size: p.sz, font: p.f, color: c });
          if (p.s.link) page.drawLine({ start: { x: x, y: baseY - 1.5 }, end: { x: x + p.w, y: baseY - 1.5 }, thickness: 0.5, color: link });
          if (p.s.strike) page.drawLine({ start: { x: x, y: baseY + p.sz * 0.3 }, end: { x: x + p.w, y: baseY + p.sz * 0.3 }, thickness: 0.6, color: c });
        }
        x += p.w;
      });
    }

    function paragraph(rs, fontSize, x, width, after, colour, marker) {
      var lead = fontSize * 1.45;
      var lines = layout(rs, fontSize, width);
      lines.forEach(function (line, i) {
        ensure(lead);
        y -= lead;
        if (i === 0 && marker) {
          var mf = F[fam[0]];
          var mt = pdfSafe(mf, cache, marker);
          page.drawText(mt, { x: x - mf.widthOfTextAtSize(mt, fontSize) - 5, y: y + fontSize * 0.3, size: fontSize, font: mf, color: colour });
        }
        drawLine(line, x, y + fontSize * 0.3, colour);
      });
      y -= after;
    }

    var blocks = toBlocks(new DOMParser().parseFromString('<body>' + bodyHtml + '</body>', 'text/html').body);
    var HEAD = [2, 1.55, 1.25, 1.05, 1, 0.9];
    var first = true;

    blocks.forEach(function (b) {
      var indent = (b.indent || 0) * 16 + (b.quote ? 14 : 0);
      var x = m + indent, width = pw - 2 * m - indent;
      var colour = b.quote ? soft : ink;
      var startY = y, startPage = page;
      if (b.kind === 'h') {
        var fs = base * HEAD[b.level - 1];
        if (!first) y -= fs * 0.7;
        ensure(fs * 3);
        paragraph(b.runs, fs, x, width, fs * 0.35, colour);
        if (b.level <= 2) { page.drawLine({ start: { x: x, y: y + fs * 0.1 }, end: { x: pw - m, y: y + fs * 0.1 }, thickness: 0.6, color: rule }); y -= fs * 0.3; }
      } else if (b.kind === 'p') {
        if (b.runs.some(function (r) { return r.text.trim(); })) paragraph(b.runs, base, x, width, base * 0.75, colour);
      } else if (b.kind === 'li') {
        paragraph(b.runs, base, x + 6, width - 6, base * 0.25, colour, b.marker);
      } else if (b.kind === 'pre') {
        var fsz = base * 0.88, lead = fsz * 1.4, mono = F[monoFam[0]];
        var lines = [];
        pdfSafe(mono, cache, b.text).split('\n').forEach(function (l) {
          var max = Math.max(8, Math.floor((width - 16) / mono.widthOfTextAtSize('M', fsz)));
          if (!l.length) lines.push('');
          for (var k = 0; k < l.length; k += max) lines.push(l.slice(k, k + max));
        });
        y -= 4;
        var j = 0;
        while (j < lines.length) {
          ensure(lead + 8);
          var room = Math.max(1, Math.floor((y - m - 8) / lead));
          var chunk = lines.slice(j, j + room);
          var boxH = chunk.length * lead + 8;
          page.drawRectangle({ x: x, y: y - boxH, width: width, height: boxH, color: shade, borderColor: rule, borderWidth: 0.5 });
          chunk.forEach(function (l, k) { page.drawText(l, { x: x + 8, y: y - 4 - (k + 1) * lead + fsz * 0.3, size: fsz, font: mono, color: ink }); });
          y -= boxH;
          j += chunk.length;
        }
        y -= base * 0.8;
      } else if (b.kind === 'hr') {
        ensure(base * 2);
        y -= base;
        page.drawLine({ start: { x: m, y: y }, end: { x: pw - m, y: y }, thickness: 0.8, color: rule });
        y -= base;
      } else if (b.kind === 'table') {
        var cols = b.rows.reduce(function (n, r) { return Math.max(n, r.length); }, 0);
        var cw = width / cols, pad = 4, tsz = base * 0.92, tlead = tsz * 1.4;
        b.rows.forEach(function (r) {
          var cells = r.map(function (c) { return { lines: layout(c.runs, tsz, cw - pad * 2), head: c.head }; });
          var h = Math.max.apply(null, cells.map(function (c) { return c.lines.length; }).concat([1])) * tlead + pad * 2;
          ensure(Math.min(h, ph - 2 * m));
          cells.forEach(function (c, ci) {
            var cx = x + ci * cw;
            page.drawRectangle({ x: cx, y: y - h, width: cw, height: h, color: c.head ? shade : undefined, borderColor: rule, borderWidth: 0.6 });
            c.lines.forEach(function (line, li) { drawLine(line, cx + pad, y - pad - (li + 1) * tlead + tsz * 0.3, ink); });
          });
          y -= h;
        });
        y -= base * 0.8;
      } else if (b.kind === 'img') {
        skippedImages++;
      }
      /* A bar down the left of quoted blocks. */
      if (b.quote && page === startPage && startY > y) page.drawRectangle({ x: m + (b.indent || 0) * 16, y: y + base * 0.6, width: 3, height: startY - y - base * 0.6, color: rule });
      first = false;
    });

    var pages = doc.getPages(), total = pages.length, small = F[FONTS.sans.pdf[0]];
    pages.forEach(function (p, i) {
      if (o.numbers) {
        var label = (i + 1) + ' of ' + total;
        p.drawText(label, { x: (pw - small.widthOfTextAtSize(label, 9)) / 2, y: m / 2 - 3, size: 9, font: small, color: soft });
      }
      if (o.header && o.title) {
        var t = pdfSafe(small, cache, o.title);
        p.drawText(t, { x: Math.max(m, (pw - small.widthOfTextAtSize(t, 9)) / 2), y: ph - m / 2, size: 9, font: small, color: soft });
      }
    });
    return { blob: new Blob([await doc.save()], { type: 'application/pdf' }), pages: total, skippedImages: skippedImages };
  }

  function slug(s) { return (String(s || 'document').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'document').slice(0, 60); }

  /* ======================================================================= */
  /* Markdown & HTML to PDF                                                  */
  /* ======================================================================= */
  Tools.register({
    id: 'markdown-to-pdf', category: 'pdf', name: 'Markdown & HTML to PDF',
    description: 'Write or paste Markdown or HTML, preview it on the page, and save it as a PDF with your choice of paper size, margins, font and page numbers.',
    keywords: ['markdown to pdf', 'html to pdf', 'md to pdf', 'convert', 'print', 'save as pdf', 'document', 'readme to pdf', 'web page to pdf', 'export pdf', 'markdown', 'html'],
    render: function (root) {
      root.classList.add('g-pdfc');
      var paper = (window.Region && Region.get().paper === 'letter') ? 'Letter' : 'A4';
      var texts = { md: SAMPLE_MD, html: SAMPLE_HTML };

      var src = U.textarea({ class: 'mp-src', value: texts.md, spellcheck: false });
      src.dataset.k = 'source';
      var mode = U.chips([{ value: 'md', label: 'Markdown' }, { value: 'html', label: 'HTML' }], function (v) {
        texts[v === 'md' ? 'html' : 'md'] = src.value;
        src.value = texts[v];
        refresh();
      }, 'md');

      var page = U.select({ label: 'Paper', value: paper, options: Object.keys(PAGES).map(function (k) { return { value: k, label: k === 'A4' ? 'A4 (210 × 297 mm)' : k === 'A5' ? 'A5 (148 × 210 mm)' : k === 'Letter' ? 'US Letter' : 'US Legal' }; }) });
      var orient = U.select({ label: 'Orientation', value: 'portrait', options: [{ value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }] });
      var margin = U.select({ label: 'Margins', value: 'normal', options: [{ value: 'narrow', label: 'Narrow (12.7 mm)' }, { value: 'normal', label: 'Normal (20 mm)' }, { value: 'wide', label: 'Wide (30 mm)' }] });
      var font = U.select({ label: 'Font', value: 'sans', options: Object.keys(FONTS).map(function (k) { return { value: k, label: FONTS[k].label }; }) });
      var size = U.select({ label: 'Text size', value: '11', options: ['9', '10', '11', '12', '13', '14'].map(function (s) { return { value: s, label: s + ' pt' }; }) });
      var title = U.input({ label: 'Document title', placeholder: 'From the first heading' });
      var numbers = U.checkbox('Page numbers', { checked: true });
      var header = U.checkbox('Title at the top of each page');
      var breaks = U.checkbox('Single line breaks become new lines (Markdown)');

      var frame = el('iframe', { class: 'mp-frame', title: 'PDF preview', sandbox: 'allow-same-origin allow-modals' });
      frame.dataset.k = 'preview';
      var st = U.note('');
      var current = { body: '', css: '', title: '' };
      var ready = Promise.resolve();

      function opts() {
        var t = title.querySelector('input').value.trim() || current.title || 'Document';
        return {
          page: page.querySelector('select').value, landscape: orient.querySelector('select').value === 'landscape',
          margin: MARGINS[margin.querySelector('select').value], font: font.querySelector('select').value,
          size: +size.querySelector('select').value, numbers: numbers.input.checked, header: header.input.checked, title: t
        };
      }

      function render() {
        var text = src.value;
        var produce = mode.value === 'md'
          ? U.script(V + 'marked/marked.umd.js').then(function () {
              return window.marked.parse(text, { gfm: true, breaks: breaks.input.checked, async: false });
            }, function () { return window.Markdown.render(text); })
          : Promise.resolve(text);
        return produce.then(function (html) {
          var c = clean(html);
          var tmp = new DOMParser().parseFromString('<body>' + c.body + '</body>', 'text/html');
          var h = tmp.querySelector('h1, h2, h3');
          current = { body: c.body, css: c.styles, title: c.title || (h ? h.textContent.trim() : '') };
          title.querySelector('input').placeholder = current.title || 'Document';
          ready = new Promise(function (resolve) { frame.onload = function () { fit(); resolve(); }; });
          frame.srcdoc = buildDoc(current.body, current.css, opts());
          var words = (tmp.body.textContent.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
          st.className = 'note';
          st.textContent = words.toLocaleString('en-GB') + ' words · ' + opts().page + (opts().landscape ? ' landscape' : '');
        }).catch(function (e) { st.className = 'note err'; st.textContent = e.message || String(e); });
      }
      /* Shrink the paper to fit the preview on screen only; print is untouched. */
      function fit() {
        var d = frame.contentDocument;
        if (!d || !d.body) return;
        var o = opts(), size = PAGES[o.page];
        var paperPx = (o.landscape ? size[1] : size[0]) * 96 / 25.4 + 32;
        var zoom = Math.min(1, Math.max(0.3, (frame.clientWidth - 4) / paperPx));
        var tag = d.getElementById('mp-fit') || d.head.appendChild(d.createElement('style'));
        tag.id = 'mp-fit';
        tag.media = 'screen';
        tag.textContent = 'html { zoom: ' + zoom.toFixed(3) + '; }';
      }
      var watcher = window.ResizeObserver ? new ResizeObserver(U.debounce(fit, 100)) : null;
      if (watcher) watcher.observe(frame);
      var refresh = U.debounce(render, 250);
      src.addEventListener('input', refresh);
      [page, orient, margin, font, size, title, numbers, header, breaks].forEach(function (c) {
        var t = c.input || c.querySelector('input, select');
        t.addEventListener('change', refresh);
        t.addEventListener('input', refresh);
      });

      var fileIn = el('input', { type: 'file', accept: '.md,.markdown,.txt,.html,.htm,text/markdown,text/html,text/plain', style: { display: 'none' }, onchange: function () {
        var f = fileIn.files[0]; if (!f) return;
        fileIn.value = '';
        U.readAs(f, 'text').then(function (t) {
          var isHtml = /\.html?$/i.test(f.name) || /^\s*</.test(t);
          if ((mode.value === 'html') !== isHtml) mode.querySelectorAll('.chip')[isHtml ? 1 : 0].click();
          src.value = t;
          if (!title.querySelector('input').value) title.querySelector('input').value = f.name.replace(/\.[^.]+$/, '');
          render();
        });
      } });

      var printBtn = U.button('Print / Save as PDF…', function () {
        render().then(function () { return ready; }).then(function () {
          try { frame.contentWindow.focus(); frame.contentWindow.print(); }
          catch (e) { U.toast('The browser blocked printing from the preview', 'err'); }
        });
      }, 'primary');
      var prog = U.progress();
      var dlBtn = U.button('Download PDF (simple layout)', function () {
        dlBtn.disabled = true;
        prog.set('Laying out pages…');
        render().then(function () { return directPdf(current.body, opts()); }).then(function (r) {
          U.saveBlob(slug(opts().title) + '.pdf', r.blob);
          prog.done(r.pages + (r.pages === 1 ? ' page' : ' pages') + ' saved' + (r.skippedImages ? '. ' + r.skippedImages + (r.skippedImages === 1 ? ' image was' : ' images were') + ' left out: use Print / Save as PDF to keep images.' : ''));
        }).catch(function (e) { prog.fail(e); }).then(function () { dlBtn.disabled = false; });
      });

      root.appendChild(U.split(
        U.panel(null,
          el('div', { class: 'mp-bar' }, mode, U.btnrow(
            U.button('Open file…', function () { fileIn.click(); }, 'ghost'),
            U.button('Clear', function () { src.value = ''; render(); }, 'ghost'))),
          src, fileIn),
        U.panel(null, frame, st)));

      root.appendChild(U.panel('Page setup',
        el('div', { class: 'mp-opts' }, page, orient, margin, font, size, title),
        el('div', { class: 'mp-checks' }, numbers, header, breaks),
        el('div', { style: { height: '12px' } }),
        U.btnrow(printBtn, dlBtn),
        el('p', { class: 'mp-hint' }, el('b', { text: 'Print / Save as PDF' }), ' opens the print dialog. Choose ', el('b', { text: 'Save as PDF' }),
          ' (or Microsoft Print to PDF) as the printer. It keeps images, tables, colours and your own CSS, and the text stays selectable. Page numbers and the running title need a recent Chrome, Edge or Firefox.'),
        el('p', { class: 'mp-hint' }, el('b', { text: 'Download PDF' }), ' builds the file directly with the standard PDF fonts: headings, paragraphs, lists, quotes, code and tables, but no images, and characters outside Western European alphabets become “?”.'),
        prog));

      U.onTeardown(root, function () { if (watcher) watcher.disconnect(); frame.onload = null; frame.srcdoc = ''; });
      render();
    }
  });
})();
