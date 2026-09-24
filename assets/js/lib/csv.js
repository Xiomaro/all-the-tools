/* Delimited-text parsing and writing, following RFC 4180 conventions:
   double-quoted fields, "" as an escaped quote, CR/LF/CRLF line endings. */
(function (global) {
  'use strict';

  function parse(text, delimiter) {
    var d = delimiter || ',';
    var rows = [], row = [], field = '', quoted = false, i = 0;

    text = String(text).replace(/^﻿/, '');

    while (i < text.length) {
      var ch = text[i];

      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          quoted = false; i++; continue;
        }
        field += ch; i++; continue;
      }

      if (ch === '"' && field === '') { quoted = true; i++; continue; }
      if (ch === d) { row.push(field); field = ''; i++; continue; }
      if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row);
        row = []; field = ''; i++;
        continue;
      }
      field += ch; i++;
    }

    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function needsQuoting(value, d) {
    return value.indexOf(d) > -1 || value.indexOf('"') > -1 ||
           value.indexOf('\n') > -1 || value.indexOf('\r') > -1 ||
           value !== value.trim();
  }

  function cell(value, d) {
    var s = value === null || value === undefined ? '' : String(value);
    return needsQuoting(s, d) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function stringify(rows, delimiter, eol) {
    var d = delimiter || ',';
    return rows.map(function (r) {
      return r.map(function (c) { return cell(c, d); }).join(d);
    }).join(eol || '\r\n');
  }

  /* Rows of arrays -> array of objects, using the first row as the header. */
  function toObjects(rows) {
    if (!rows.length) return [];
    var head = rows[0];
    return rows.slice(1).map(function (r) {
      var o = {};
      head.forEach(function (key, i) { o[key] = r[i] === undefined ? '' : r[i]; });
      return o;
    });
  }

  /* Array of objects -> rows of arrays, with the union of keys as the header. */
  function fromObjects(objects) {
    var keys = [];
    objects.forEach(function (o) {
      Object.keys(o).forEach(function (k) { if (keys.indexOf(k) === -1) keys.push(k); });
    });
    var rows = [keys];
    objects.forEach(function (o) {
      rows.push(keys.map(function (k) {
        var v = o[k];
        if (v === null || v === undefined) return '';
        return typeof v === 'object' ? JSON.stringify(v) : String(v);
      }));
    });
    return rows;
  }

  /* Best guess at the delimiter: whichever candidate gives the most
     consistent column count across the first few lines. */
  function sniff(text) {
    var sample = text.split(/\r?\n/).slice(0, 12).join('\n');
    var best = ',', bestScore = -1;
    [',', ';', '\t', '|'].forEach(function (d) {
      var rows = parse(sample, d).filter(function (r) { return r.length > 1; });
      if (!rows.length) return;
      var widths = rows.map(function (r) { return r.length; });
      var mode = widths[0];
      var consistent = widths.filter(function (w) { return w === mode; }).length / widths.length;
      var score = consistent * mode;
      if (score > bestScore) { bestScore = score; best = d; }
    });
    return best;
  }

  global.CSV = { parse: parse, stringify: stringify, toObjects: toObjects, fromObjects: fromObjects, sniff: sniff };
})(window);
