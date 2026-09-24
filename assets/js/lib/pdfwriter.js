/* A small PDF 1.4 writer: enough to lay out text in the standard Helvetica and
   Courier faces and to place images on pages. Images are embedded either as
   JPEG (DCTDecode, passed through untouched) or as Flate-compressed RGB when
   the browser provides CompressionStream. No external dependencies. */
(function (global) {
  'use strict';

  var PAGE_SIZES = {
    A3: [841.89, 1190.55], A4: [595.28, 841.89], A5: [419.53, 595.28],
    Letter: [612, 792], Legal: [612, 1008], Tabloid: [792, 1224]
  };

  /* Adobe standard widths (1/1000 em) for codes 32-126. */
  var WIDTHS = {
    Helvetica: [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,
      556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,
      667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,
      278,278,278,469,556,333,
      556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,
      334,260,334,584],
    'Helvetica-Bold': [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,
      556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,
      722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,
      333,278,333,584,556,333,
      556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,
      389,280,389,584]
  };

  function textWidth(text, font, size) {
    var table = WIDTHS[font];
    var total = 0;
    for (var i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i);
      if (!table) { total += 600; continue; }                 /* Courier is monospaced */
      total += (code >= 32 && code <= 126) ? table[code - 32] : 556;
    }
    return total * size / 1000;
  }

  /* --- byte plumbing ------------------------------------------------------ */

  function latin1(str) {
    var out = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
    return out;
  }

  /* The standard fonts here use WinAnsiEncoding; anything outside it is
     replaced rather than silently producing the wrong glyph. */
  function toWinAnsi(text) {
    return String(text).replace(/[^\x20-\x7E\n\t]/g, function (ch) {
      var map = { '‘': "'", '’': "'", '“': '"', '”': '"',
                  '–': '-', '—': '-', '…': '...', ' ': ' ' };
      if (map[ch]) return map[ch];
      var code = ch.charCodeAt(0);
      return (code >= 0xA0 && code <= 0xFF) ? ch : '?';
    });
  }

  function escapeString(text) {
    return text.replace(/([\\()])/g, '\\$1').replace(/\r/g, '');
  }

  function Doc() {
    this.objects = [];   /* each entry is an array of string | Uint8Array */
  }

  Doc.prototype.reserve = function () {
    this.objects.push(null);
    return this.objects.length;
  };

  Doc.prototype.put = function (number, parts) {
    this.objects[number - 1] = Array.isArray(parts) ? parts : [parts];
    return number;
  };

  Doc.prototype.add = function (parts) {
    return this.put(this.reserve(), parts);
  };

  Doc.prototype.serialise = function (trailerExtra) {
    var chunks = [];
    var offset = 0;
    var offsets = [];

    function write(part) {
      var bytes = typeof part === 'string' ? latin1(part) : part;
      chunks.push(bytes);
      offset += bytes.length;
    }

    write('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

    for (var i = 0; i < this.objects.length; i++) {
      offsets.push(offset);
      write((i + 1) + ' 0 obj\n');
      (this.objects[i] || ['null']).forEach(write);
      write('\nendobj\n');
    }

    var xrefStart = offset;
    var xref = 'xref\n0 ' + (this.objects.length + 1) + '\n0000000000 65535 f \n';
    offsets.forEach(function (o) {
      xref += ('0000000000' + o).slice(-10) + ' 00000 n \n';
    });
    write(xref);
    write('trailer\n<< /Size ' + (this.objects.length + 1) + ' /Root 1 0 R' +
          (trailerExtra || '') + ' >>\nstartxref\n' + xrefStart + '\n%%EOF\n');

    return new Blob(chunks, { type: 'application/pdf' });
  };

  function stream(dict, bytes) {
    return [dict.replace('@LEN@', bytes.length) + '\nstream\n', bytes, '\nendstream'];
  }

  /* --- compression --------------------------------------------------------- */

  function deflate(bytes) {
    if (typeof CompressionStream === 'undefined') return Promise.resolve(null);
    try {
      var cs = new CompressionStream('deflate');
      var writer = cs.writable.getWriter();
      writer.write(bytes);
      writer.close();
      return new Response(cs.readable).arrayBuffer().then(function (buf) { return new Uint8Array(buf); });
    } catch (e) {
      return Promise.resolve(null);
    }
  }

  /* --- document builders ---------------------------------------------------- */

  function baseDoc(meta) {
    var doc = new Doc();
    doc.reserve();                       /* 1: catalog */
    doc.reserve();                       /* 2: page tree */
    doc.info = doc.add(['<< /Producer (All The Tools) /Creator (All The Tools)' +
      (meta && meta.title ? ' /Title (' + escapeString(toWinAnsi(meta.title)) + ')' : '') +
      ' /CreationDate (D:' + pdfDate(new Date()) + ') >>']);
    return doc;
  }

  function pdfDate(d) {
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    var offsetMin = -d.getTimezoneOffset();
    var sign = offsetMin >= 0 ? '+' : '-';
    var abs = Math.abs(offsetMin);
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) +
           p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) +
           sign + p(Math.floor(abs / 60)) + "'" + p(abs % 60) + "'";
  }

  function finish(doc, pageRefs) {
    doc.put(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
    doc.put(2, ['<< /Type /Pages /Count ' + pageRefs.length + ' /Kids [' +
                pageRefs.map(function (r) { return r + ' 0 R'; }).join(' ') + '] >>']);
    return doc.serialise(' /Info ' + doc.info + ' 0 R');
  }

  /* Lay text out over as many pages as it needs. */
  function fromText(text, options) {
    options = options || {};
    var size = options.pageSize && PAGE_SIZES[options.pageSize] ? PAGE_SIZES[options.pageSize] : PAGE_SIZES.A4;
    var landscape = !!options.landscape;
    var pageW = landscape ? size[1] : size[0];
    var pageH = landscape ? size[0] : size[1];
    var margin = options.margin === undefined ? 56 : options.margin;
    var fontSize = options.fontSize || 11;
    var leading = options.lineHeight || fontSize * 1.45;
    var font = options.font === 'Courier' ? 'Courier' : options.font === 'Helvetica-Bold' ? 'Helvetica-Bold' : 'Helvetica';

    var usableWidth = pageW - margin * 2;
    var lines = [];

    toWinAnsi(text).replace(/\r\n?/g, '\n').split('\n').forEach(function (paragraph) {
      if (!paragraph) { lines.push(''); return; }
      var words = paragraph.split(/(\s+)/);
      var current = '';
      words.forEach(function (word) {
        var candidate = current + word;
        if (textWidth(candidate, font, fontSize) <= usableWidth || !current.trim()) {
          current = candidate;
        } else {
          lines.push(current.replace(/\s+$/, ''));
          current = word.replace(/^\s+/, '');
        }
        /* A single word longer than the line still has to break somewhere. */
        while (textWidth(current, font, fontSize) > usableWidth && current.length > 1) {
          var cut = current.length;
          while (cut > 1 && textWidth(current.slice(0, cut), font, fontSize) > usableWidth) cut--;
          lines.push(current.slice(0, cut));
          current = current.slice(cut);
        }
      });
      lines.push(current.replace(/\s+$/, ''));
    });

    var perPage = Math.max(1, Math.floor((pageH - margin * 2) / leading));
    var doc = baseDoc(options);
    var fontRef = doc.add(['<< /Type /Font /Subtype /Type1 /BaseFont /' + font + ' /Encoding /WinAnsiEncoding >>']);
    var pageRefs = [];

    for (var start = 0; start < lines.length || start === 0; start += perPage) {
      var slice = lines.slice(start, start + perPage);
      var body = 'BT\n/F1 ' + fontSize + ' Tf\n' + leading + ' TL\n' +
                 margin + ' ' + (pageH - margin - fontSize) + ' Td\n' +
                 slice.map(function (l) { return '(' + escapeString(l) + ') Tj T*'; }).join('\n') + '\nET\n';

      var contentRef = doc.add(stream('<< /Length @LEN@ >>', latin1(body)));
      pageRefs.push(doc.add(['<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + round(pageW) + ' ' + round(pageH) + ']' +
        ' /Resources << /Font << /F1 ' + fontRef + ' 0 R >> >> /Contents ' + contentRef + ' 0 R >>']));
    }

    return Promise.resolve(finish(doc, pageRefs));
  }

  /* `images` is a list of { bytes, width, height, filter } where filter is
     'DCTDecode' for JPEG data or 'FlateDecode'/'' for raw RGB samples. */
  function fromImages(images, options) {
    options = options || {};
    var doc = baseDoc(options);
    var pageRefs = [];

    images.forEach(function (image) {
      var natural = [image.width, image.height];
      var pageW, pageH, drawW, drawH, offsetX, offsetY;
      var margin = options.margin === undefined ? 0 : options.margin;

      if (options.pageSize === 'fit' || !PAGE_SIZES[options.pageSize]) {
        var dpi = options.dpi || 96;
        drawW = natural[0] * 72 / dpi;
        drawH = natural[1] * 72 / dpi;
        pageW = drawW + margin * 2;
        pageH = drawH + margin * 2;
        offsetX = margin; offsetY = margin;
      } else {
        var size = PAGE_SIZES[options.pageSize];
        var portrait = options.orientation === 'landscape' ? false
          : options.orientation === 'portrait' ? true
          : natural[1] >= natural[0];
        pageW = portrait ? size[0] : size[1];
        pageH = portrait ? size[1] : size[0];

        var boxW = pageW - margin * 2, boxH = pageH - margin * 2;
        var scale = Math.min(boxW / natural[0], boxH / natural[1]);
        drawW = natural[0] * scale;
        drawH = natural[1] * scale;
        offsetX = (pageW - drawW) / 2;
        offsetY = (pageH - drawH) / 2;
      }

      var dict = '<< /Type /XObject /Subtype /Image /Width ' + image.width + ' /Height ' + image.height +
                 ' /ColorSpace /DeviceRGB /BitsPerComponent 8' +
                 (image.filter ? ' /Filter /' + image.filter : '') + ' /Length @LEN@ >>';
      var imageRef = doc.add(stream(dict, image.bytes));

      var body = 'q\n' + round(drawW) + ' 0 0 ' + round(drawH) + ' ' +
                 round(offsetX) + ' ' + round(offsetY) + ' cm\n/Im1 Do\nQ\n';
      var contentRef = doc.add(stream('<< /Length @LEN@ >>', latin1(body)));

      pageRefs.push(doc.add(['<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + round(pageW) + ' ' + round(pageH) + ']' +
        ' /Resources << /XObject << /Im1 ' + imageRef + ' 0 R >> >> /Contents ' + contentRef + ' 0 R >>']));
    });

    return Promise.resolve(finish(doc, pageRefs));
  }

  function round(n) { return Math.round(n * 100) / 100; }

  global.PDFWriter = {
    pageSizes: PAGE_SIZES,
    fromText: fromText,
    fromImages: fromImages,
    deflate: deflate,
    textWidth: textWidth
  };
})(window);
