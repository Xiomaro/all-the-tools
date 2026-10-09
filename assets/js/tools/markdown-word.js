/* Markdown to Word: turns Markdown (including Obsidian notes) into a .docx
   or into rich text on the clipboard, with headings that arrive in Word as
   real Heading 1–6 styles rather than big bold paragraphs.
   Obsidian syntax is tidied first (properties, [[wikilinks]], ![[embeds]],
   ==highlights==, %%comments%%, callouts, ^block-ids), then marked renders
   the Markdown to HTML, and that HTML is walked into WordprocessingML by
   hand and zipped with JSZip. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;
  var V = 'assets/vendor/';

  if (!document.getElementById('g-mdw-style')) {
    document.head.appendChild(el('style', { id: 'g-mdw-style', text: [
      '.g-mdw textarea.mdw-src { min-height: 420px; font-family: var(--mono); font-size: 13px; }',
      '.g-mdw iframe.mdw-frame { width: 100%; height: 460px; border: 1px solid var(--border); border-radius: var(--radius); background: #fff; display: block; }',
      '.g-mdw .mdw-opts { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; }',
      '.g-mdw .mdw-checks { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 10px; }',
      '.g-mdw .mdw-hint { font-size: 13px; color: var(--fg-muted); margin: 10px 0 0; }'
    ].join('\n') }));
  }

  var DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  var XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  var NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  var FONTS = ['Aptos', 'Calibri', 'Arial', 'Georgia', 'Times New Roman', 'Verdana'];
  var MONO = 'Consolas';
  var HEAD_PT = [20, 16, 14, 12, 11, 11];
  var HEAD_COLOUR = '0F4761';
  var PAGES = { A4: [11906, 16838], Letter: [12240, 15840] };   /* twips */

  var SAMPLE = [
    '---',
    'tags: [meeting, project]',
    'created: 2026-10-09',
    '---',
    '# Project kick-off',
    '',
    'Notes from the first meeting. See [[Project Plan|the plan]] and [[Budget#Q4]] for detail.',
    '',
    '## Decisions',
    '',
    '- Launch is **moving to March**',
    '- ==Design sign-off== is due by the end of the month',
    '  - Mock-ups first',
    '  - Then the style guide',
    '',
    '## Actions',
    '',
    '- [x] Book the room',
    '- [ ] Send the agenda ^a1b2c3',
    '',
    '> [!warning] Budget',
    '> Spending is frozen until the *new quarter*.',
    '',
    '### Timeline',
    '',
    '| Phase | Owner | Due |',
    '| --- | --- | --- |',
    '| Research | Sam | Nov |',
    '| Build | Alex | Feb |',
    '',
    '1. Agree scope',
    '2. Hire contractor',
    '3. Start build',
    '',
    '%%Private note: this line is left out.%%',
    '',
    '```js',
    'console.log("code keeps its spacing");',
    '```'
  ].join('\n');

  /* --- small helpers -------------------------------------------------------- */

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; })
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '');
  }
  function escHtml(s) { return U.escapeHtml(String(s)); }
  function slug(s) { return (String(s || 'document').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim() || 'document').slice(0, 80); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* --- Obsidian syntax ------------------------------------------------------ */

  /* Rewrites Obsidian-only syntax into plain Markdown (or the odd inline tag
     marked passes through). Fenced code and inline code are left alone. */
  function fromObsidian(md, o) {
    var counts = { links: 0, embeds: 0, callouts: 0 };
    md = md.replace(/\r\n?/g, '\n');
    if (o.properties) md = md.replace(/^﻿?---\n[\s\S]*?\n(?:---|\.\.\.)[ \t]*(?:\n|$)/, '');
    md = md.replace(/%%[\s\S]*?%%/g, '');

    var parts = md.split(/(^ {0,3}(?:```|~~~)[^\n]*\n[\s\S]*?(?:\n {0,3}(?:```|~~~)[ \t]*(?=\n|$)|$))/m);
    md = parts.map(function (seg, i) {
      if (i % 2) return seg;
      var spans = [];
      seg = seg.replace(/(`+)[\s\S]*?\1/g, function (m) { spans.push(m); return '\u0000' + (spans.length - 1) + '\u0000'; });

      seg = seg.replace(/!\[\[([^\]\n]+)\]\]/g, function (_, t) {
        counts.embeds++;
        return '*[Embedded: ' + t.split('|')[0].trim() + ']*';
      });
      seg = seg.replace(/\[\[([^\]\n]+)\]\]/g, function (_, t) {
        counts.links++;
        var bar = t.indexOf('|');
        if (bar > -1) return t.slice(bar + 1).trim();
        var bits = t.split('#'), note = bits[0].replace(/\^[\w-]+$/, '').trim();
        var sub = bits.slice(1).join(' › ').replace(/^\^[\w-]+$/, '').trim();
        return note && sub ? note + ' › ' + sub : note || sub;
      });
      seg = seg.replace(/==(?=\S)([^\n=]+?)==/g, '<mark>$1</mark>');
      seg = seg.replace(/[ \t]+\^[A-Za-z0-9-]+[ \t]*$/gm, '');
      seg = seg.replace(/^((?:[ \t]*>)+)[ \t]*\[!([\w-]+)\]([+-]?)[ \t]*(.*)$/gm, function (_, q, type, fold, title) {
        counts.callouts++;
        return q + ' **' + (title.trim() || cap(type.toLowerCase())) + '**\n' + q;
      });
      return seg.replace(/\u0000(\d+)\u0000/g, function (_, n) { return spans[+n]; });
    }).join('');
    return { md: md, counts: counts };
  }

  /* --- WordprocessingML --------------------------------------------------- */

  function Doc(o) {
    this.o = o;
    this.links = [];
    this.nums = [];          /* one entry per numbered list, so each restarts at its own start */
    this.images = 0;
  }

  Doc.prototype.link = function (href) {
    var id = 'rIdL' + (this.links.length + 1);
    this.links.push({ id: id, href: href });
    return id;
  };

  Doc.prototype.olNum = function (start) {
    this.nums.push(start || 1);
    return this.nums.length + 1;        /* numId 1 is the shared bullet list */
  };

  function runXml(text, f) {
    var rpr = '';
    if (f.style) rpr += '<w:rStyle w:val="' + f.style + '"/>';
    if (f.b) rpr += '<w:b/><w:bCs/>';
    if (f.i) rpr += '<w:i/><w:iCs/>';
    if (f.strike) rpr += '<w:strike/>';
    if (f.mark) rpr += '<w:highlight w:val="yellow"/>';    /* the schema wants highlight before u */
    if (f.u) rpr += '<w:u w:val="single"/>';
    if (f.vert) rpr += '<w:vertAlign w:val="' + f.vert + '"/>';
    var body = String(text).split('\n').map(function (line, i) {
      return (i ? '<w:br/>' : '') + line.split('\t').map(function (t, j) {
        return (j ? '<w:tab/>' : '') + (t ? '<w:t xml:space="preserve">' + esc(t) + '</w:t>' : '');
      }).join('');
    }).join('');
    return '<w:r>' + (rpr ? '<w:rPr>' + rpr + '</w:rPr>' : '') + body + '</w:r>';
  }

  /* Inline content of a block element, as runs. Whitespace collapses the
     way a browser collapses it, except inside <code>. */
  Doc.prototype.runs = function (node, f, ctx) {
    var self = this, out = '';
    ctx = ctx || { lead: true };
    Array.prototype.forEach.call(node.childNodes, function (n) {
      if (n.nodeType === 3) {
        var t = f.code ? n.nodeValue : n.nodeValue.replace(/[ \t\r\n]+/g, ' ');
        if (!f.code && ctx.lead) t = t.replace(/^ /, '');
        if (!t) return;
        ctx.lead = / $/.test(t);
        out += runXml(t, f);
        return;
      }
      if (n.nodeType !== 1) return;
      var tag = n.nodeName.toLowerCase(), g = Object.assign({}, f);
      if (tag === 'br') { out += '<w:r><w:br/></w:r>'; ctx.lead = true; return; }
      if (tag === 'img') {
        self.images++;
        out += runXml('[Image' + (n.getAttribute('alt') ? ': ' + n.getAttribute('alt') : '') + ']', Object.assign({}, f, { i: true }));
        return;
      }
      if (tag === 'input' && n.type === 'checkbox') { out += runXml(n.checked ? '☒ ' : '☐ ', f); ctx.lead = true; return; }
      if (/^(ul|ol|table|pre|blockquote|h[1-6]|p|div|hr)$/.test(tag)) return;   /* blocks are handled by the caller */
      if (tag === 'strong' || tag === 'b') g.b = true;
      else if (tag === 'em' || tag === 'i') g.i = true;
      else if (tag === 'del' || tag === 's' || tag === 'strike') g.strike = true;
      else if (tag === 'u' || tag === 'ins') g.u = true;
      else if (tag === 'mark') g.mark = true;
      else if (tag === 'sup') g.vert = 'superscript';
      else if (tag === 'sub') g.vert = 'subscript';
      else if (tag === 'code') { g.style = 'CodeChar'; g.code = true; }
      if (tag === 'a' && n.getAttribute('href') && /^(https?:|mailto:)/i.test(n.getAttribute('href'))) {
        g.style = g.style || 'Hyperlink';
        out += '<w:hyperlink r:id="' + self.link(n.getAttribute('href')) + '" w:history="1">' + self.runs(n, g, ctx) + '</w:hyperlink>';
        return;
      }
      out += self.runs(n, g, ctx);
    });
    return out;
  };

  function pXml(style, runs, extra) {
    var ppr = (style ? '<w:pStyle w:val="' + style + '"/>' : '') + (extra || '');
    return '<w:p>' + (ppr ? '<w:pPr>' + ppr + '</w:pPr>' : '') + runs + '</w:p>';
  }

  /* ctx: { quote: depth, list: [{ num, ilvl }] } */
  Doc.prototype.blocks = function (parent, ctx) {
    var self = this, out = '', loose = [];
    function flush() {
      if (!loose.length) return;
      var holder = parent.ownerDocument.createElement('span');
      loose.forEach(function (n) { holder.appendChild(n.cloneNode(true)); });
      loose = [];
      if (holder.textContent.trim() || holder.querySelector('img,input')) out += self.para(holder, ctx);
    }
    Array.prototype.slice.call(parent.childNodes).forEach(function (n) {
      var tag = n.nodeType === 1 ? n.nodeName.toLowerCase() : '';
      if (!/^(p|div|h[1-6]|ul|ol|pre|blockquote|table|hr|section|figure|details)$/.test(tag)) {
        loose.push(n);
        return;
      }
      flush();
      out += self.block(n, tag, ctx);
    });
    flush();
    return out;
  };

  Doc.prototype.para = function (node, ctx, style) {
    var extra = '';
    if (ctx.quote > 1) extra += '<w:ind w:left="' + (ctx.quote * 360) + '"/>';
    return pXml(style || (ctx.quote ? 'Quote' : ''), this.runs(node, {}), extra);
  };

  Doc.prototype.block = function (n, tag, ctx) {
    var self = this;
    var m = /^h([1-6])$/.exec(tag);
    if (m) return pXml('Heading' + m[1], this.runs(n, {}));
    if (tag === 'p') return this.para(n, ctx);
    if (tag === 'div' || tag === 'section' || tag === 'figure' || tag === 'details') return this.blocks(n, ctx);
    if (tag === 'hr') return pXml('', '', '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="A0A0A0"/></w:pBdr>');
    if (tag === 'blockquote') return this.blocks(n, Object.assign({}, ctx, { quote: (ctx.quote || 0) + 1 }));
    if (tag === 'pre') {
      var code = n.textContent.replace(/\n$/, '');
      var lines = code.split('\n');
      return lines.map(function (l, i) {
        var keep = i < lines.length - 1 ? '<w:keepNext/>' : '';
        return pXml('Code', runXml(l, { code: true }), keep);
      }).join('');
    }
    if (tag === 'ul' || tag === 'ol') return this.list(n, ctx, 0);
    if (tag === 'table') return this.table(n);
    return this.para(n, ctx);
  };

  Doc.prototype.list = function (listNode, ctx, ilvl) {
    var self = this, out = '';
    var ordered = listNode.nodeName === 'OL';
    var numId = ordered ? this.olNum(+listNode.getAttribute('start') || 1) : 1;
    var lvl = Math.min(ilvl, 8);
    Array.prototype.forEach.call(listNode.children, function (li) {
      if (li.nodeName !== 'LI') return;
      var task = li.querySelector(':scope > input[type=checkbox], :scope > p > input[type=checkbox]');
      var numPr = task && !ordered
        ? '<w:ind w:left="' + (720 + lvl * 360) + '" w:hanging="360"/>'
        : '<w:numPr><w:ilvl w:val="' + lvl + '"/><w:numId w:val="' + numId + '"/></w:numPr>';
      var first = true;
      var inline = [];
      function emit(nodes) {
        var holder = li.ownerDocument.createElement('span');
        nodes.forEach(function (c) { holder.appendChild(c.cloneNode(true)); });
        if (!first && !holder.textContent.trim()) return;
        var ppr = first ? numPr : '<w:ind w:left="' + (720 + lvl * 360) + '"/>';
        out += pXml('ListParagraph', self.runs(holder, {}), ppr);
        first = false;
      }
      Array.prototype.slice.call(li.childNodes).forEach(function (c) {
        var t = c.nodeType === 1 ? c.nodeName : '';
        if (t === 'UL' || t === 'OL') {
          if (inline.length || first) emit(inline);
          inline = [];
          out += self.list(c, ctx, ilvl + 1);
        } else if (t === 'P' || t === 'PRE' || t === 'BLOCKQUOTE' || t === 'TABLE') {
          if (inline.length) { emit(inline); inline = []; }
          if (t === 'P') emit(Array.prototype.slice.call(c.childNodes));
          else { if (first) emit([]); out += self.block(c, t.toLowerCase(), ctx); }
        } else inline.push(c);
      });
      if (inline.length || first) emit(inline);
    });
    return out;
  };

  Doc.prototype.table = function (t) {
    var self = this;
    var rows = Array.prototype.slice.call(t.querySelectorAll('tr'));
    if (!rows.length) return '';
    var cols = rows.reduce(function (n, r) { return Math.max(n, r.children.length); }, 0);
    var width = Math.floor((PAGES[this.o.paper][0] - 2 * 1440) / cols);
    var grid = '<w:tblGrid>' + new Array(cols + 1).join('<w:gridCol w:w="' + width + '"/>') + '</w:tblGrid>';
    var body = rows.map(function (r) {
      var head = r.parentNode.nodeName === 'THEAD' || Array.prototype.every.call(r.children, function (c) { return c.nodeName === 'TH'; });
      var cells = Array.prototype.slice.call(r.children);
      while (cells.length < cols) cells.push(null);
      return '<w:tr>' + (head ? '<w:trPr><w:tblHeader/></w:trPr>' : '') + cells.map(function (c) {
        var align = c && (c.getAttribute('align') || c.style.textAlign);
        var jc = align === 'center' || align === 'right' ? '<w:jc w:val="' + align + '"/>' : '';
        var runs = c ? self.runs(c, head ? { b: true } : {}) : '';
        return '<w:tc><w:tcPr><w:tcW w:w="' + width + '" w:type="dxa"/>' + (head ? '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>' : '') +
          '</w:tcPr>' + pXml('TableText', runs, jc) + '</w:tc>';
      }).join('') + '</w:tr>';
    }).join('');
    return '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>' +
      grid + body + '</w:tbl>' + pXml('', '', '<w:spacing w:after="0"/>');
  };

  function fontsXml(f) { return '<w:rFonts w:ascii="' + esc(f) + '" w:hAnsi="' + esc(f) + '" w:eastAsia="' + esc(f) + '" w:cs="' + esc(f) + '"/>'; }

  function stylesXml(o) {
    var half = Math.round(o.size * 2);
    var out = XML_HEAD + '<w:styles ' + NS + '>' +
      '<w:docDefaults><w:rPrDefault><w:rPr>' + fontsXml(o.font) + '<w:sz w:val="' + half + '"/><w:szCs w:val="' + half + '"/><w:lang w:val="en-GB"/></w:rPr></w:rPrDefault>' +
      '<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
      '<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/><w:unhideWhenUsed/></w:style>' +
      '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/>' +
      '<w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>';
    HEAD_PT.forEach(function (pt, i) {
      out += '<w:style w:type="paragraph" w:styleId="Heading' + (i + 1) + '"><w:name w:val="heading ' + (i + 1) + '"/><w:basedOn w:val="Normal"/>' +
        '<w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="' + (i < 2 ? 360 : 240) + '" w:after="80"/>' +
        '<w:outlineLvl w:val="' + i + '"/></w:pPr><w:rPr>' + (i < 4 ? '<w:b/><w:bCs/>' : '') + (i === 4 ? '<w:i/><w:iCs/>' : '') +
        '<w:color w:val="' + HEAD_COLOUR + '"/><w:sz w:val="' + Math.round(pt * Math.max(1, o.size / 11) * 2) + '"/><w:szCs w:val="' + Math.round(pt * Math.max(1, o.size / 11) * 2) + '"/></w:rPr></w:style>';
    });
    out += '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="34"/><w:qFormat/>' +
      '<w:pPr><w:spacing w:after="40"/><w:ind w:left="720"/><w:contextualSpacing/></w:pPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="29"/><w:qFormat/>' +
      '<w:pPr><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="BFBFBF"/></w:pBdr><w:ind w:left="360" w:right="360"/></w:pPr>' +
      '<w:rPr><w:color w:val="404040"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:customStyle="1" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:qFormat/>' +
      '<w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F3F3F3"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="144" w:right="144"/></w:pPr>' +
      '<w:rPr>' + fontsXml(MONO) + '<w:sz w:val="' + (half - 2) + '"/><w:szCs w:val="' + (half - 2) + '"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:customStyle="1" w:styleId="TableText"><w:name w:val="Table Text"/><w:basedOn w:val="Normal"/>' +
      '<w:pPr><w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/></w:pPr></w:style>' +
      '<w:style w:type="character" w:customStyle="1" w:styleId="CodeChar"><w:name w:val="Inline Code"/><w:basedOn w:val="DefaultParagraphFont"/>' +
      '<w:rPr>' + fontsXml(MONO) + '<w:shd w:val="clear" w:color="auto" w:fill="F3F3F3"/></w:rPr></w:style>' +
      '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:basedOn w:val="DefaultParagraphFont"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/>' +
      '<w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>' +
      '<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/><w:uiPriority w:val="39"/>' +
      '<w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:tblPr><w:tblBorders>' +
      ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (s) { return '<w:' + s + ' w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>'; }).join('') +
      '</w:tblBorders></w:tblPr></w:style>';
    return out + '</w:styles>';
  }

  function numberingXml(nums) {
    var BUL = ['•', '◦', '▪'], ORD = ['decimal', 'lowerLetter', 'lowerRoman'];
    function levels(ordered) {
      var s = '';
      for (var l = 0; l < 9; l++) {
        var fmt = ordered ? ORD[l % 3] : 'bullet', text = ordered ? '%' + (l + 1) + '.' : BUL[l % 3];
        s += '<w:lvl w:ilvl="' + l + '"><w:start w:val="1"/><w:numFmt w:val="' + fmt + '"/><w:lvlText w:val="' + text + '"/><w:lvlJc w:val="left"/>' +
          '<w:pPr><w:ind w:left="' + (720 + l * 360) + '" w:hanging="360"/></w:pPr>' +
          (ordered ? '' : '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/></w:rPr>') + '</w:lvl>';
      }
      return s;
    }
    var out = XML_HEAD + '<w:numbering ' + NS + '>' +
      '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>' + levels(false) + '</w:abstractNum>' +
      '<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>' + levels(true) + '</w:abstractNum>' +
      '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>';
    nums.forEach(function (start, i) {
      out += '<w:num w:numId="' + (i + 2) + '"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="' + start + '"/></w:lvlOverride></w:num>';
    });
    return out + '</w:numbering>';
  }

  async function buildDocx(html, o) {
    await U.script(V + 'jszip/jszip.min.js');
    var body = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html').body;
    var doc = new Doc(o);
    var xml = doc.blocks(body, { quote: 0 });
    var page = PAGES[o.paper];
    xml += '<w:sectPr><w:pgSz w:w="' + page[0] + '" w:h="' + page[1] + '"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>';

    var zip = new window.JSZip();
    zip.file('[Content_Types].xml', XML_HEAD + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' +
      '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>');
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
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>';
    doc.links.forEach(function (l) {
      rels += '<Relationship Id="' + l.id + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="' + esc(l.href) + '" TargetMode="External"/>';
    });
    zip.file('word/_rels/document.xml.rels', XML_HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels + '</Relationships>');
    zip.file('word/document.xml', XML_HEAD + '<w:document ' + NS + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>' + xml + '</w:body></w:document>');
    zip.file('word/styles.xml', stylesXml(o));
    zip.file('word/numbering.xml', numberingXml(doc.nums));
    zip.file('word/settings.xml', XML_HEAD + '<w:settings ' + NS + '><w:defaultTabStop w:val="720"/><w:characterSpacingControl w:val="doNotCompress"/>' +
      '<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>');
    var blob = await zip.generateAsync({ type: 'blob', mimeType: DOCX_TYPE, compression: 'DEFLATE', compressionOptions: { level: 6 } });
    return { blob: blob, images: doc.images };
  }

  /* --- rich text for the clipboard ------------------------------------------- */

  /* HTML that Word, Google Docs and Outlook read well: <h1>–<h6> paste as
     their Heading 1–6 styles, and everything Word would otherwise drop
     (checkboxes, <mark>, quote bars, table borders) is spelled out inline. */
  function richHtml(html, o) {
    var d = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
    var b = d.body;
    var base = 'font-family:\'' + o.font + '\',sans-serif;font-size:' + o.size + 'pt';
    Array.prototype.forEach.call(b.querySelectorAll('input[type=checkbox]'), function (i) {
      var next = i.nextSibling, gap = next && next.nodeType === 3 && /^\s/.test(next.nodeValue) ? '' : ' ';
      i.replaceWith(d.createTextNode((i.checked ? '☒' : '☐') + gap));
    });
    Array.prototype.forEach.call(b.querySelectorAll('li'), function (li) {
      if (/^[☐☒] /.test(li.textContent)) li.style.listStyleType = 'none';
    });
    Array.prototype.forEach.call(b.querySelectorAll('mark'), function (m) {
      var s = d.createElement('span');
      s.setAttribute('style', 'background:yellow;mso-highlight:yellow');
      while (m.firstChild) s.appendChild(m.firstChild);
      m.replaceWith(s);
    });
    Array.prototype.forEach.call(b.querySelectorAll('h1,h2,h3,h4,h5,h6'), function (h) {
      h.setAttribute('style', 'font-family:\'' + o.font + '\',sans-serif;color:#' + HEAD_COLOUR);
    });
    Array.prototype.forEach.call(b.querySelectorAll('p,li,td,th'), function (n) { n.setAttribute('style', base + (n.getAttribute('style') ? ';' + n.getAttribute('style') : '')); });
    Array.prototype.forEach.call(b.querySelectorAll('blockquote'), function (q) {
      q.setAttribute('style', 'margin:0 0 0 12pt;padding-left:9pt;border:none;border-left:solid #BFBFBF 2.25pt;color:#404040');
    });
    Array.prototype.forEach.call(b.querySelectorAll('pre'), function (p) {
      p.setAttribute('style', 'background:#F3F3F3;padding:6pt;font-family:Consolas,monospace;font-size:' + (o.size - 1) + 'pt;white-space:pre-wrap');
    });
    Array.prototype.forEach.call(b.querySelectorAll('code'), function (c) {
      if (c.parentNode.nodeName !== 'PRE') c.setAttribute('style', 'font-family:Consolas,monospace;background:#F3F3F3');
    });
    Array.prototype.forEach.call(b.querySelectorAll('table'), function (t) {
      t.setAttribute('border', '1');
      t.setAttribute('cellpadding', '5');
      t.setAttribute('style', 'border-collapse:collapse;border:solid #BFBFBF 1pt');
      Array.prototype.forEach.call(t.querySelectorAll('td,th'), function (c) {
        c.setAttribute('style', c.getAttribute('style') + ';border:solid #BFBFBF 1pt;padding:4pt 6pt' + (c.nodeName === 'TH' ? ';background:#F2F2F2;font-weight:bold' : ''));
      });
    });
    Array.prototype.forEach.call(b.querySelectorAll('img'), function (img) {
      img.replaceWith(d.createTextNode('[Image' + (img.alt ? ': ' + img.alt : '') + ']'));
    });
    return '<html><head><meta charset="utf-8"></head><body><!--StartFragment--><div style="' + base + '">' + b.innerHTML + '</div><!--EndFragment--></body></html>';
  }

  function copyRich(html, text) {
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      return navigator.clipboard.write([new window.ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' })
      })]).then(function () { return true; }, function () { return copyByEvent(html, text); });
    }
    return Promise.resolve(copyByEvent(html, text));
  }
  function copyByEvent(html, text) {
    var ok = false;
    function on(e) { e.clipboardData.setData('text/html', html); e.clipboardData.setData('text/plain', text); e.preventDefault(); ok = true; }
    document.addEventListener('copy', on);
    try { document.execCommand('copy'); } catch (e) { ok = false; }
    document.removeEventListener('copy', on);
    return ok;
  }

  /* --- tool ----------------------------------------------------------------- */

  Tools.register({
    id: 'markdown-to-word', category: 'developer', name: 'Markdown to Word & Rich Text',
    description: 'Turn Markdown or an Obsidian note into a Word document, or copy it as rich text that pastes into Word with real Heading 1–6 styles, lists, tables and links.',
    keywords: ['markdown to word', 'markdown to docx', 'md to docx', 'docx', 'word', 'obsidian', 'obsidian to word', 'rich text', 'copy to word',
      'paste into word', 'headings', 'google docs', 'outlook', 'markdown'],
    remember: true,
    render: function (root) {
      root.classList.add('g-mdw');
      var paper = (window.Region && Region.get().paper === 'letter') ? 'Letter' : 'A4';

      var src = U.textarea({ class: 'mdw-src', value: SAMPLE, spellcheck: false, placeholder: 'Paste Markdown or an Obsidian note…' });
      src.dataset.k = 'source';
      src.dataset.remember = 'off';
      var frame = el('iframe', { class: 'mdw-frame', title: 'Preview' });
      frame.setAttribute('sandbox', 'allow-popups');
      frame.dataset.k = 'preview';

      var font = U.select({ label: 'Font', value: 'Aptos', options: FONTS });
      var size = U.select({ label: 'Text size', value: '11', options: ['10', '10.5', '11', '12', '13', '14'].map(function (s) { return { value: s, label: s + ' pt' }; }) });
      var page = U.select({ label: 'Paper', value: paper, options: [{ value: 'A4', label: 'A4' }, { value: 'Letter', label: 'US Letter' }] });
      var name = U.input({ label: 'File name', placeholder: 'From the first heading' });
      var obsidian = U.checkbox('Obsidian syntax (wikilinks, callouts, ==highlights==, %%comments%%)', { checked: true });
      var props = U.checkbox('Leave out note properties (front matter)', { checked: true });
      var breaks = U.checkbox('Single line breaks become new lines (as in Obsidian)', { checked: true });
      var st = U.note('');
      var current = { html: '', title: '', text: '' };

      function val(n) { return n.querySelector('select, input').value; }
      function opts() {
        return { font: val(font), size: +val(size), paper: val(page), title: current.title };
      }
      function fileName(ext) { return slug(val(name).trim() || current.title || 'document') + ext; }

      function render() {
        return U.script(V + 'marked/marked.umd.js').then(function () {
          var r = obsidian.input.checked ? fromObsidian(src.value, { properties: props.input.checked }) : { md: src.value, counts: null };
          var html = window.marked.parse(r.md, { gfm: true, breaks: breaks.input.checked, async: false });
          var tmp = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html').body;
          var h = tmp.querySelector('h1, h2, h3');
          current = { html: html, title: h ? h.textContent.trim() : '', text: tmp.innerText || tmp.textContent };
          name.querySelector('input').placeholder = current.title || 'document';
          var o = opts();
          frame.srcdoc = '<!doctype html><meta charset="utf-8"><base target="_blank"><style>body{font:' + o.size + 'pt/1.45 \'' + o.font + '\',Calibri,system-ui,sans-serif;margin:18px 22px;color:#1f2328}' +
            'h1,h2,h3,h4,h5,h6{color:#' + HEAD_COLOUR + ';margin:1em 0 .3em}h5{font-style:italic}pre{background:#f3f3f3;padding:10px;overflow:auto}' +
            'code{font-family:Consolas,monospace;background:#f3f3f3}table{border-collapse:collapse}td,th{border:1px solid #bfbfbf;padding:4px 8px}th{background:#f2f2f2}' +
            'blockquote{margin:0 0 0 12px;padding-left:12px;border-left:3px solid #bfbfbf;color:#404040}mark{background:yellow}img{max-width:100%}' +
            'li:has(> input[type=checkbox]){list-style:none}</style>' + html;
          var words = (current.text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
          var heads = tmp.querySelectorAll('h1,h2,h3,h4,h5,h6').length;
          var bits = [words.toLocaleString('en-GB') + ' words', heads + (heads === 1 ? ' heading' : ' headings')];
          if (r.counts) {
            if (r.counts.links) bits.push(r.counts.links + ' wikilink' + (r.counts.links === 1 ? '' : 's') + ' turned into text');
            if (r.counts.callouts) bits.push(r.counts.callouts + ' callout' + (r.counts.callouts === 1 ? '' : 's'));
            if (r.counts.embeds) bits.push(r.counts.embeds + ' embed' + (r.counts.embeds === 1 ? '' : 's') + ' shown as a placeholder');
          }
          st.className = 'note';
          st.textContent = bits.join(' · ');
        }).catch(function (e) { st.className = 'note err'; st.textContent = e.message || String(e); });
      }
      var refresh = U.debounce(render, 200);
      src.addEventListener('input', refresh);
      [font, size, page, obsidian, props, breaks].forEach(function (c) {
        (c.input || c.querySelector('input, select')).addEventListener('change', refresh);
      });

      var copyBtn = U.button('Copy for Word', function () {
        render().then(function () {
          if (!current.html.trim()) return U.toast('Nothing to copy', 'err');
          return copyRich(richHtml(current.html, opts()), current.text).then(function (ok) {
            U.toast(ok ? 'Copied: paste into Word with Ctrl+V' : 'Copy blocked by the browser', ok ? '' : 'err');
          });
        });
      }, 'primary');
      var prog = U.progress();
      var docxBtn = U.button('Download .docx', function () {
        docxBtn.disabled = true;
        prog.set('Building the document…');
        render().then(function () {
          if (!current.html.trim()) throw new Error('Nothing to convert yet');
          return buildDocx(current.html, opts());
        }).then(function (r) {
          U.saveBlob(fileName('.docx'), r.blob);
          prog.done('Saved ' + fileName('.docx') + (r.images ? '. ' + r.images + (r.images === 1 ? ' image is' : ' images are') + ' shown as a placeholder: add pictures in Word.' : ''));
        }).catch(function (e) { prog.fail(e); }).then(function () { docxBtn.disabled = false; });
      });
      var htmlBtn = U.button('Download .html', function () {
        render().then(function () {
          if (!current.html.trim()) return U.toast('Nothing to download yet', 'err');
          U.saveText(fileName('.html'), richHtml(current.html, opts()).replace('<head>', '<head><title>' + escHtml(current.title || 'Document') + '</title>'), 'text/html');
        });
      }, 'ghost');

      var fileIn = el('input', { type: 'file', accept: '.md,.markdown,.txt,text/markdown,text/plain', style: { display: 'none' }, onchange: function () {
        var f = fileIn.files[0];
        if (!f) return;
        fileIn.value = '';
        U.readAs(f, 'text').then(function (t) {
          src.value = t;
          name.querySelector('input').value = f.name.replace(/\.[^.]+$/, '');
          render();
        }, function (e) { U.toast(e.message, 'err'); });
      } });

      root.appendChild(U.split(
        U.panel('Markdown', src, fileIn, U.btnrow(
          U.button('Open .md file…', function () { fileIn.click(); }, 'ghost'),
          U.button('Clear', function () { src.value = ''; render(); }, 'ghost'))),
        U.panel('Preview', frame, st)));

      root.appendChild(U.panel('Export',
        el('div', { class: 'mdw-opts' }, font, size, page, name),
        el('div', { class: 'mdw-checks' }, obsidian, props, breaks),
        el('div', { style: { height: '12px' } }),
        U.btnrow(copyBtn, docxBtn, htmlBtn),
        prog,
        el('p', { class: 'mdw-hint' }, el('b', { text: 'Copy for Word' }), ' puts formatted text on the clipboard. Pasted into Word, headings become Word’s own Heading 1–6 styles, so they show in the Navigation pane and a table of contents. It works in Google Docs and Outlook too.'),
        el('p', { class: 'mdw-hint' }, el('b', { text: 'Download .docx' }), ' builds a Word document with real heading, list, quote and code styles, tables and live links. Images and ![[embeds]] become placeholders, since the files live in your vault.')));

      U.onTeardown(root, function () { frame.srcdoc = ''; });
      render();
    }
  });
})();
