/* video-b tools: Subtitle Converter & Shifter, Video & Audio File Info, GIF to
   MP4, Side-by-Side & Picture-in-Picture Video, Burn Subtitles into Video.
   Everything media-heavy goes through window.MediaKit from video.js: the one
   shared ffmpeg instance, its job queue and the common file-tool UI. */
(function () {
  'use strict';
  var U = window.UI, el = U.el, MK = window.MediaKit;
  if (!MK) return;
  var ffRun = MK.ffRun, choice = MK.choice, label = MK.label, desc = MK.desc, size = MK.size,
    baseName = MK.baseName, extOf = MK.extOf, fmtTime = MK.fmtTime, fmtSecs = MK.fmtSecs;

  /* --- styling (scoped to .g-vb; the .g-video rules come from video.js) ---- */

  if (!document.getElementById('g-video-b-style')) {
    document.head.appendChild(el('style', { id: 'g-video-b-style', text: [
      '.g-vb .gvb-scroll{overflow-x:auto;max-width:100%}',
      '.g-vb table.gvb-kv td{vertical-align:top}',
      '.g-vb table.gvb-kv td.gvb-key{color:var(--fg-muted);font-size:13px;white-space:nowrap;width:1%}',
      '.g-vb table.gvb-kv td.mono{word-break:break-word}',
      '.g-vb .gvb-issues{margin:0;padding-left:1.2em;display:flex;flex-direction:column;gap:3px;font-size:.92em;max-height:320px;overflow:auto}',
      '.g-vb .gvb-issues .err{color:var(--err)}',
      '.g-vb .gvb-issues .warn{color:var(--warn)}',
      '.g-vb .gvb-issues .info{color:var(--fg-muted)}',
      '.g-vb .gvb-sync{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,11em);gap:8px 10px;align-items:end}',
      '.g-vb .gvb-sync select,.g-vb .gvb-sync input{min-width:0;width:100%}',
      '.g-vb details > summary{cursor:pointer;font-weight:600;margin:2px 0 8px}',
      '.g-vb pre.out{max-height:420px;overflow:auto;white-space:pre;font-size:12px}',
      '.g-vb .gvb-colours{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
      '.g-vb .gvb-still{align-self:center;max-width:100%;max-height:360px;border-radius:var(--radius);background:#000;display:block}',
      '.g-vb .gvb-row2{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;align-items:end}',
      '.g-vb .gvb-row2 select,.g-vb .gvb-row2 input[type=number],.g-vb .gvb-row2 input[type=text]{width:100%;min-width:0}'
    ].join('\n') }));
  }

  function pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }
  function enc(text) { return new TextEncoder().encode(text); }

  /* Text files arrive in all sorts of encodings: honour a BOM, try strict
     UTF-8, and fall back to Windows-1252, which most old SRT files use. */
  function decodeText(buf) {
    var b = new Uint8Array(buf);
    if (b[0] === 0xFF && b[1] === 0xFE) return { text: new TextDecoder('utf-16le').decode(b.subarray(2)), encoding: 'UTF-16' };
    if (b[0] === 0xFE && b[1] === 0xFF) return { text: new TextDecoder('utf-16be').decode(b.subarray(2)), encoding: 'UTF-16 BE' };
    if (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) return { text: new TextDecoder('utf-8').decode(b.subarray(3)), encoding: 'UTF-8' };
    try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(b), encoding: 'UTF-8' }; }
    catch (e) { return { text: new TextDecoder('windows-1252').decode(b), encoding: 'Windows-1252' }; }
  }

  /* ======================================================================
     Subtitle formats. A cue is { start, end, text } with times in whole
     milliseconds and lines joined by "\n"; <i>/<b>/<u> tags are kept the
     SRT way. ASS/SSA cues also carry their original fields (cue.ass) so an
     ASS file written back out as ASS keeps its styles.
     ====================================================================== */

  var FORMATS = {
    srt: { label: 'SRT', ext: 'srt', mime: 'application/x-subrip', desc: 'SubRip: the most widely supported format (VLC, YouTube, Premiere, TVs).' },
    vtt: { label: 'WebVTT', ext: 'vtt', mime: 'text/vtt', desc: 'WebVTT: the format HTML5 video uses on the web.' },
    ass: { label: 'ASS', ext: 'ass', mime: 'text/plain', desc: 'Advanced SubStation Alpha: styled subtitles for Aegisub, mpv and VLC. An ASS input keeps its styles.' },
    ssa: { label: 'SSA', ext: 'ssa', mime: 'text/plain', desc: 'SubStation Alpha v4, the older version of ASS.' },
    sbv: { label: 'SBV', ext: 'sbv', mime: 'text/plain', desc: 'YouTube\'s simple caption format.' },
    ttml: { label: 'TTML', ext: 'ttml', mime: 'application/ttml+xml', desc: 'Timed Text Markup Language (DFXP), used by broadcasters and streaming services.' },
    txt: { label: 'Plain text', ext: 'txt', mime: 'text/plain', desc: 'Just the words, one cue per line: a transcript.' }
  };

  var ARROW_RE = /^\s*((?:\d+:)?\d{1,2}:\d{1,2}(?:[.,]\d+)?)\s*-->\s*((?:\d+:)?\d{1,2}:\d{1,2}(?:[.,]\d+)?)(.*)$/;
  var SBV_RE = /^\s*(\d+:\d{1,2}:\d{1,2}(?:\.\d+)?)\s*,\s*(\d+:\d{1,2}:\d{1,2}(?:\.\d+)?)\s*$/;
  var TXT_RE = /^\s*[[(]?((?:\d+:)?\d{1,2}:\d{2}(?:[.,]\d+)?)[\])]?\s*(?:[-–—:|]\s*)?(.*)$/;

  /* "01:02:03,450", "2:03.45", "0:00:01.5" -> ms; the fraction is decimal. */
  function clockMs(s) {
    var m = /^\s*(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d+))?\s*$/.exec(String(s));
    if (!m) return NaN;
    return Math.round(((+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]) + (m[4] ? parseFloat('0.' + m[4]) : 0)) * 1000);
  }
  /* What a person types for a time: "1:02:03,5", "1:02.5" or plain seconds. */
  function parseWhen(s) {
    s = String(s || '').trim();
    if (/^-?\d+(?:[.,]\d+)?$/.test(s)) return Math.round(parseFloat(s.replace(',', '.')) * 1000);
    return clockMs(s);
  }
  /* ms -> "hh:mm:ss,mmm" (sep), SBV "h:mm:ss.mmm" or ASS "h:mm:ss.cc". */
  function stamp(ms, sep, style) {
    ms = Math.max(0, Math.round(ms));
    if (style === 'ass') {
      var cs = Math.round(ms / 10);
      return Math.floor(cs / 360000) + ':' + pad(Math.floor(cs / 6000) % 60, 2) + ':' + pad(Math.floor(cs / 100) % 60, 2) + '.' + pad(cs % 100, 2);
    }
    var h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, f = ms % 1000;
    if (style === 'sbv') return h + ':' + pad(m, 2) + ':' + pad(s, 2) + '.' + pad(f, 3);
    return pad(h, 2) + ':' + pad(m, 2) + ':' + pad(s, 2) + (sep || ',') + pad(f, 3);
  }
  function shortStamp(ms) {
    var t = Math.floor(Math.max(0, ms) / 1000), h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60;
    return (h ? h + ':' + pad(m, 2) : m) + ':' + pad(s, 2);
  }

  function stripTags(s) { return String(s).replace(/<\/?[a-z][^>]*>/gi, '').replace(/\{\\[^}]*\}/g, ''); }

  function detect(text) {
    var t = String(text).replace(/^\uFEFF/, '').replace(/^\s+/, '');
    if (/^WEBVTT(?=$|\s)/.test(t)) return 'vtt';
    if (/^\[Script Info\]/im.test(t) || /^\s*Dialogue\s*:/m.test(t)) {
      if (/\[V4\+ Styles\]|ScriptType:\s*v4\.00\+/i.test(t)) return 'ass';
      return /\[V4 Styles\]|ScriptType:\s*v4\.00\s*$/im.test(t) ? 'ssa' : 'ass';
    }
    if (/^(<\?xml[\s\S]*?)?<tt[\s>]/i.test(t)) return 'ttml';
    var lines = t.split(/\r?\n/, 500);
    for (var i = 0; i < lines.length; i++) {
      if (ARROW_RE.test(lines[i])) return 'srt';
      if (SBV_RE.test(lines[i])) return 'sbv';
    }
    return 'txt';
  }

  /* -> { cues, errors, format, header? } */
  function parse(text, fmt) {
    text = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    fmt = fmt || detect(text);
    var r = fmt === 'ass' || fmt === 'ssa' ? parseASS(text) : fmt === 'ttml' ? parseTTML(text) : fmt === 'txt' ? parseTXT(text) : parseTimed(text, fmt);
    r.format = fmt;
    return r;
  }

  /* SRT, WebVTT and SBV: a timing line, then text lines until a blank line.
     Tolerates a missing blank line before the next cue number. */
  function parseTimed(text, fmt) {
    var lines = text.split('\n'), cues = [], errors = [], cur = null, skip = false;
    var re = fmt === 'sbv' ? SBV_RE : ARROW_RE;
    function timing(line) {
      var m = re.exec(line || '');
      if (!m) return null;
      var a = clockMs(m[1]), b = clockMs(m[2]);
      return isNaN(a) || isNaN(b) ? null : { start: a, end: b, settings: fmt === 'vtt' ? (m[3] || '').trim() : '' };
    }
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i], trimmed = line.trim();
      if (!trimmed) { cur = null; skip = false; continue; }
      if (skip) continue;
      var t = timing(line);
      if (t) {
        cur = { start: t.start, end: t.end, text: '', line: i + 1 };
        if (t.settings) cur.settings = t.settings;
        cues.push(cur);
        continue;
      }
      if (cur) {
        if (/^\d+$/.test(trimmed) && timing(lines[i + 1])) { cur = null; continue; }
        cur.text += (cur.text ? '\n' : '') + line.replace(/\s+$/, '');
        continue;
      }
      if (fmt === 'vtt' && (/^WEBVTT/.test(trimmed) || /^(NOTE|STYLE|REGION)(\s|$)/.test(trimmed))) { skip = true; continue; }
      if (timing(lines[i + 1]) || /^\d+$/.test(trimmed)) continue;   /* the SRT number or a WebVTT cue id */
      if (/-->|\d:\d\d\S*\s*-+>/.test(line)) errors.push('Line ' + (i + 1) + ': the timing "' + trimmed.slice(0, 60) + '" could not be read.');
      else errors.push('Line ' + (i + 1) + ': text outside any cue was ignored ("' + trimmed.slice(0, 40) + '").');
    }
    return { cues: cues, errors: errors };
  }

  function splitFields(line, n) {
    var out = [], rest = line;
    for (var i = 0; i < n - 1; i++) {
      var k = rest.indexOf(',');
      if (k < 0) break;
      out.push(rest.slice(0, k)); rest = rest.slice(k + 1);
    }
    out.push(rest);
    return out;
  }
  /* ASS override blocks become SRT-style tags where there is one (italic,
     bold, underline); \N and \n are line breaks, \h a space. */
  function assToText(s) {
    return String(s).replace(/\\[Nn]/g, '\n').replace(/\\h/g, ' ').replace(/\{([^}]*)\}/g, function (all, tags) {
      var out = '';
      tags.replace(/\\([ibu])(\d+)/g, function (x, k, v) { out += v === '0' ? '</' + k + '>' : '<' + k + '>'; return x; });
      return out;
    }).replace(/[ \t]+\n/g, '\n');
  }
  function textToAss(s) {
    return String(s).replace(/<(\/?)([ibu])>/gi, function (x, close, k) { return '{\\' + k.toLowerCase() + (close ? '0' : '1') + '}'; })
      .replace(/<\/?[a-z][^>]*>/gi, '').replace(/\n/g, '\\N');
  }
  function parseASS(text) {
    var lines = text.split('\n'), cues = [], errors = [], section = '', names = null, header = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i], t = line.trim();
      var sec = /^\[(.+)\]$/.exec(t);
      if (sec) { section = sec[1].toLowerCase(); if (section !== 'events') header.push(line); continue; }
      if (section !== 'events') { header.push(line); continue; }
      var m = /^(Format|Dialogue|Comment)\s*:\s*(.*)$/i.exec(t);
      if (!m) continue;
      var kind = m[1].toLowerCase();
      if (kind === 'format') { names = m[2].split(',').map(function (x) { return x.trim().toLowerCase(); }); continue; }
      if (kind === 'comment') continue;
      var cols = names || ['layer', 'start', 'end', 'style', 'name', 'marginl', 'marginr', 'marginv', 'effect', 'text'];
      var f = splitFields(m[2], cols.length), rec = {};
      cols.forEach(function (nm, k) { rec[nm] = f[k] !== undefined ? f[k].trim() : ''; });
      rec.text = f[cols.length - 1] || '';
      var a = clockMs(rec.start), b = clockMs(rec.end);
      if (isNaN(a) || isNaN(b)) { errors.push('Line ' + (i + 1) + ': the Dialogue times could not be read.'); continue; }
      cues.push({ start: a, end: b, text: assToText(rec.text), line: i + 1, ass: rec });
    }
    return { cues: cues, errors: errors, header: header.join('\n').replace(/\s+$/, '') };
  }

  function xattr(node, name) {
    for (var i = 0; i < node.attributes.length; i++) if (node.attributes[i].localName === name) return node.attributes[i].value;
    return '';
  }
  function parseTTML(text) {
    var doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) return { cues: [], errors: ['This TTML file is not valid XML.'] };
    var tt = doc.documentElement, fr = parseFloat(xattr(tt, 'frameRate')) || 30, mult = xattr(tt, 'frameRateMultiplier');
    if (mult) { var mm = mult.trim().split(/\s+/).map(Number); if (mm[0] && mm[1]) fr = fr * mm[0] / mm[1]; }
    var tr = parseFloat(xattr(tt, 'tickRate')) || fr * (parseFloat(xattr(tt, 'subFrameRate')) || 1);
    function time(v) {
      v = String(v || '').trim();
      if (!v) return NaN;
      var m = /^(\d+):(\d{2}):(\d{2})(?:\.(\d+))?$/.exec(v);
      if (m) return Math.round((+m[1] * 3600 + +m[2] * 60 + +m[3] + (m[4] ? parseFloat('0.' + m[4]) : 0)) * 1000);
      m = /^(\d+):(\d{2}):(\d{2}):(\d+(?:\.\d+)?)$/.exec(v);
      if (m) return Math.round((+m[1] * 3600 + +m[2] * 60 + +m[3] + parseFloat(m[4]) / fr) * 1000);
      m = /^(\d+(?:\.\d+)?)(h|ms|m|s|f|t)$/.exec(v);
      if (m) { var n = parseFloat(m[1]); return Math.round({ h: n * 3600000, m: n * 60000, s: n * 1000, ms: n, f: n / fr * 1000, t: n / tr * 1000 }[m[2]]); }
      return NaN;
    }
    function textOf(node) {
      var s = '';
      Array.prototype.forEach.call(node.childNodes, function (c) {
        if (c.nodeType === 3) s += c.nodeValue.replace(/\s+/g, ' ');
        else if (c.nodeType === 1) {
          if (c.localName === 'br') s += '\n';
          else { var inner = textOf(c); s += xattr(c, 'fontStyle') === 'italic' ? '<i>' + inner + '</i>' : inner; }
        }
      });
      return s;
    }
    var cues = [], errors = [], ps = doc.getElementsByTagNameNS('*', 'p');
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i], off = 0;
      for (var a = p.parentNode; a && a.nodeType === 1; a = a.parentNode) { var b0 = time(xattr(a, 'begin')); if (!isNaN(b0)) off += b0; }
      var begin = time(xattr(p, 'begin')), end = time(xattr(p, 'end')), dur = time(xattr(p, 'dur'));
      if (isNaN(begin)) { errors.push('Paragraph ' + (i + 1) + ' has no begin time and was skipped.'); continue; }
      if (isNaN(end)) end = isNaN(dur) ? NaN : begin + dur;
      if (isNaN(end)) { errors.push('Paragraph ' + (i + 1) + ' has no end time and was skipped.'); continue; }
      var txt = textOf(p).split('\n').map(function (l) { return l.trim(); }).join('\n').trim();
      cues.push({ start: begin + off, end: end + off, text: txt });
    }
    return { cues: cues, errors: errors };
  }

  /* Plain text only has timings if each line starts with one ("[0:05] Hi"),
     as the transcriber writes them. A cue lasts until the next one. */
  function parseTXT(text) {
    var cues = [];
    text.split('\n').forEach(function (line, i) {
      var m = TXT_RE.exec(line), at = m ? clockMs(m[1]) : NaN;
      if (m && !isNaN(at) && m[2].trim()) cues.push({ start: at, end: NaN, text: m[2].trim(), line: i + 1 });
      else if (line.trim() && cues.length) cues[cues.length - 1].text += '\n' + line.trim();
    });
    if (!cues.length) return { cues: [], errors: ['No timings were found. Plain text needs a time at the start of each line, like "[0:05] Hello", or load an SRT, VTT, ASS, SBV or TTML file.'] };
    cues.forEach(function (c, i) {
      var next = cues[i + 1];
      c.end = next ? Math.max(c.start, next.start) : c.start + Math.min(6000, Math.max(1500, c.text.length * 70));
    });
    return { cues: cues, errors: [] };
  }

  var ASS_STYLE_FMT = 'Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding';
  var SSA_STYLE_FMT = 'Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, TertiaryColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, AlphaLevel, Encoding';
  var ASS_EVENT_FMT = 'Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text';

  function writeASS(cues, fmt, o) {
    var ssa = fmt === 'ssa', keep = !!o.header;
    var head = keep ? o.header : ['[Script Info]', '; Converted by All The Tools', 'ScriptType: ' + (ssa ? 'v4.00' : 'v4.00+'),
      'PlayResX: 384', 'PlayResY: 288', 'WrapStyle: 0', 'ScaledBorderAndShadow: yes', '',
      ssa ? '[V4 Styles]' : '[V4+ Styles]', 'Format: ' + (ssa ? SSA_STYLE_FMT : ASS_STYLE_FMT),
      ssa ? 'Style: Default,Arial,18,16777215,65535,65535,0,0,0,1,1,0,2,10,10,10,0,1'
        : 'Style: Default,Arial,18,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,10,10,10,1'].join('\n');
    var lines = cues.map(function (c) {
      var a = keep && c.ass ? c.ass : null;
      var first = ssa ? (a && a.marked ? a.marked : 'Marked=0') : (a && a.layer ? a.layer : '0');
      return 'Dialogue: ' + [first, stamp(c.start, '.', 'ass'), stamp(c.end, '.', 'ass'), a ? a.style || 'Default' : 'Default', a ? a.name || '' : '',
        a ? a.marginl || '0' : '0', a ? a.marginr || '0' : '0', a ? a.marginv || '0' : '0', a ? a.effect || '' : '', a ? a.text : textToAss(c.text)].join(',');
    });
    return head + '\n\n[Events]\nFormat: ' + (ssa ? 'Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text' : ASS_EVENT_FMT) + '\n' + lines.join('\n') + '\n';
  }
  function xmlEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function writeTTML(cues) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling" xml:lang="en">\n  <body>\n    <div>\n' +
      cues.map(function (c) {
        /* Only balanced italics survive as spans; other tags are dropped so the XML stays well formed. */
        var inner = xmlEsc(c.text).replace(/&lt;i&gt;([\s\S]*?)&lt;\/i&gt;/g, '<span tts:fontStyle="italic">$1</span>')
          .replace(/&lt;\/?[a-z][^&]*?&gt;/gi, '').replace(/\{\\[^}]*\}/g, '').replace(/\n/g, '<br/>');
        return '      <p begin="' + stamp(c.start, '.') + '" end="' + stamp(c.end, '.') + '">' + inner + '</p>';
      }).join('\n') + '\n    </div>\n  </body>\n</tt>\n';
  }
  /* Cue text without blank lines, which would end the cue early. */
  function block(t) { return String(t).split('\n').filter(function (l) { return l.trim(); }).join('\n'); }

  function write(cues, fmt, o) {
    o = o || {};
    switch (fmt) {
      case 'srt':
        return cues.map(function (c, i) { return (i + 1) + '\n' + stamp(c.start, ',') + ' --> ' + stamp(c.end, ',') + '\n' + block(c.text) + '\n'; }).join('\n');
      case 'vtt':
        return 'WEBVTT\n\n' + cues.map(function (c) {
          return stamp(c.start, '.') + ' --> ' + stamp(c.end, '.') + (c.settings ? ' ' + c.settings : '') + '\n' + block(c.text).replace(/-->/g, '→') + '\n';
        }).join('\n');
      case 'sbv':
        return cues.map(function (c) { return stamp(c.start, '.', 'sbv') + ',' + stamp(c.end, '.', 'sbv') + '\n' + block(stripTags(c.text)) + '\n'; }).join('\n');
      case 'ass': case 'ssa':
        return writeASS(cues, fmt, o);
      case 'ttml':
        return writeTTML(cues);
      default:
        return cues.map(function (c) {
          return (o.times ? '[' + shortStamp(c.start) + '] ' : '') + stripTags(c.text).replace(/\s*\n\s*/g, ' ').trim();
        }).join('\n') + '\n';
    }
  }

  /* Timing and clean-up, in this order: frame rate, two-point sync, shift,
     then the clean-up options. o = { rate, sync: {t1, to1, t2, to2}, shift,
     stripTags, removeEmpty, sort, fixOverlaps }. */
  function processCues(cues, o) {
    var out = cues.map(function (c) { return Object.assign({}, c); }), notes = [];
    if (o.rate && Math.abs(o.rate - 1) > 1e-9) out.forEach(function (c) { c.start = Math.round(c.start * o.rate); c.end = Math.round(c.end * o.rate); });
    if (o.sync) {
      var s = o.sync, k = (s.to2 - s.to1) / (s.t2 - s.t1), b = s.to1 - k * s.t1;
      out.forEach(function (c) { c.start = Math.round(k * c.start + b); c.end = Math.round(k * c.end + b); });
      notes.push('Stretched by ' + (k * 100).toFixed(3) + '% and moved ' + (b >= 0 ? '+' : '−') + (Math.abs(b) / 1000).toFixed(3) + ' s.');
    }
    if (o.shift) out.forEach(function (c) { c.start += o.shift; c.end += o.shift; });
    var dropped = 0, clipped = 0;
    out = out.filter(function (c) {
      if (c.end <= 0 && c.start < 0) { dropped++; return false; }
      if (c.start < 0) { c.start = 0; clipped++; }
      return true;
    });
    if (dropped) notes.push(dropped + ' cue' + (dropped === 1 ? ' was' : 's were') + ' moved before 0:00 and removed.');
    if (clipped) notes.push(clipped + ' cue' + (clipped === 1 ? '' : 's') + ' now start' + (clipped === 1 ? 's' : '') + ' at 0:00.');
    if (o.stripTags) out.forEach(function (c) {
      var t = stripTags(c.text);
      if (t !== c.text) { c.text = t; if (c.ass) c.ass = Object.assign({}, c.ass, { text: textToAss(t) }); }
    });
    if (o.removeEmpty) {
      var before = out.length;
      out = out.filter(function (c) { return stripTags(c.text).trim(); });
      if (out.length < before) notes.push((before - out.length) + ' empty cue' + (before - out.length === 1 ? '' : 's') + ' removed.');
    }
    if (o.sort) out.sort(function (a, b) { return a.start - b.start || a.end - b.end; });
    if (o.fixOverlaps) {
      var fixed = 0;
      for (var i = 0; i < out.length - 1; i++) {
        var c = out[i], n = out[i + 1];
        if (c.end > n.start && n.start > c.start) { c.end = n.start; fixed++; }
      }
      if (fixed) notes.push(fixed + ' overlap' + (fixed === 1 ? '' : 's') + ' fixed.');
    }
    return { cues: out, notes: notes };
  }

  /* Problems worth knowing about, worst first. */
  function validate(cues) {
    var list = [];
    function add(level, text) { list.push({ level: level, text: text }); }
    cues.forEach(function (c, i) {
      var n = i + 1, dur = c.end - c.start, plain = stripTags(c.text), flat = plain.replace(/\s+/g, ' ').trim();
      if (dur < 0) add('err', 'Cue ' + n + ' ends before it starts (' + stamp(c.start) + ' → ' + stamp(c.end) + ').');
      else if (dur === 0) add('err', 'Cue ' + n + ' has no duration (' + stamp(c.start) + ').');
      else if (dur < 300) add('warn', 'Cue ' + n + ' is on screen for only ' + dur + ' ms.');
      else if (dur > 10000) add('info', 'Cue ' + n + ' stays on screen for ' + (dur / 1000).toFixed(1) + ' s.');
      if (!flat) add('warn', 'Cue ' + n + ' is empty.');
      else if (dur > 0 && flat.length / (dur / 1000) > 25) add('warn', 'Cue ' + n + ' needs ' + Math.round(flat.length / (dur / 1000)) + ' characters a second: hard to read in time.');
      var lines = plain.split('\n');
      if (lines.some(function (l) { return l.length > 42; })) add('info', 'Cue ' + n + ' has a line longer than 42 characters.');
      if (lines.length > 2) add('info', 'Cue ' + n + ' has ' + lines.length + ' lines.');
      var next = cues[i + 1];
      if (next) {
        if (next.start < c.start) add('warn', 'Cue ' + (n + 1) + ' starts before cue ' + n + ' (out of order).');
        else if (next.start < c.end) add('warn', 'Cues ' + n + ' and ' + (n + 1) + ' overlap by ' + ((c.end - next.start) / 1000).toFixed(3) + ' s.');
      }
    });
    var rank = { err: 0, warn: 1, info: 2 };
    return list.sort(function (a, b) { return rank[a.level] - rank[b.level]; });
  }

  /* Shared with the tests and the other media modules. */
  MK.subs = { detect: detect, parse: parse, write: write, process: processCues, validate: validate, clockMs: clockMs, stamp: stamp, decodeText: decodeText };

  /* ======================================================================
     Subtitle Converter & Shifter
     ====================================================================== */

  var RATES = [['', '—'], ['24000/1001', '23.976'], ['24', '24'], ['25', '25'], ['30000/1001', '29.97'], ['30', '30'], ['48', '48'], ['50', '50'], ['60000/1001', '59.94'], ['60', '60']];
  function rateVal(s) { var p = String(s).split('/'); return p.length === 2 ? +p[0] / +p[1] : +s; }

  MK.register({
    id: 'subtitle-converter', category: 'video', name: 'Subtitle Converter & Shifter',
    description: 'Convert subtitles between SRT, WebVTT, ASS/SSA, SBV, TTML and plain text, shift or re-sync their timings, fix overlaps and check them for problems.',
    keywords: ['subtitles', 'captions', 'srt', 'vtt', 'webvtt', 'ass', 'ssa', 'sbv', 'ttml', 'dfxp', 'subtitle converter', 'srt to vtt', 'vtt to srt',
      'ass to srt', 'shift subtitles', 'subtitle delay', 'offset', 'sync subtitles', 'resync', 'out of sync', 'frame rate', '23.976', '25 fps',
      'fix overlaps', 'renumber', 'validate', 'subtitle checker', 'subtitle editor', 'timing'],
    render: function (root) {
      root.classList.add('g-video', 'g-vb');
      var st = { name: 'subtitles', encoding: '', parsed: null, result: null };

      var input = U.textarea({ rows: 8, spellcheck: false, placeholder: '…or paste SRT, WebVTT, ASS, SBV or TTML text here', dataset: { k: 'input' } });
      var detected = el('div', { class: 'gv-fileinfo', dataset: { k: 'detected' } });
      var parseErrs = el('ul', { class: 'gvb-issues' });
      var zone = U.dropzone({ accept: '.srt,.vtt,.ass,.ssa,.sbv,.ttml,.dfxp,.xml,.txt,text/*', label: 'Drop a subtitle file here or click to choose',
        hint: 'SRT, WebVTT, ASS/SSA, SBV, TTML or timed text. Nothing is uploaded.', onFiles: function (f) { loadFile(f[0]); } });

      /* timing */
      var shift = el('input', { type: 'number', step: '100', value: '0', dataset: { k: 'shift' } });
      var nudges = U.btnrow.apply(null, [[-1000, '−1 s'], [-100, '−0.1 s'], [100, '+0.1 s'], [1000, '+1 s']].map(function (p) {
        return U.button(p[1], function () { shift.value = String((+shift.value || 0) + p[0]); update(); }, 'ghost');
      }));
      var rateOpts = RATES.map(function (r) { return { value: r[0], label: r[1] }; });
      var fromFps = U.select({ options: rateOpts, value: '', dataset: { k: 'from-fps' } });
      var toFps = U.select({ options: rateOpts, value: '', dataset: { k: 'to-fps' } });
      var syncOn = U.checkbox('Sync to two reference points (stretches and moves every cue)');
      syncOn.input.dataset.k = 'sync';
      var sel1 = el('select', { dataset: { k: 'sync-cue1' } }), sel2 = el('select', { dataset: { k: 'sync-cue2' } });
      var at1 = el('input', { type: 'text', placeholder: '00:00:05,000', dataset: { k: 'sync-at1' } });
      var at2 = el('input', { type: 'text', placeholder: '01:30:00,000', dataset: { k: 'sync-at2' } });
      var syncBox = el('div', { class: 'gvb-sync' },
        U.field('First reference cue', sel1), U.field('…should start at', at1),
        U.field('Second reference cue', sel2), U.field('…should start at', at2));
      var syncWrap = el('div', { class: 'stack' }, syncBox,
        desc('Pick a line near the start and one near the end, and type when each is actually spoken in your video. Every cue in between is stretched to match, which also fixes 23.976 ↔ 25 fps drift.'));
      syncWrap.style.display = 'none';

      /* clean-up */
      var sortCb = U.checkbox('Sort by start time and renumber', { checked: true });
      var overlapCb = U.checkbox('Fix overlaps (a cue ends when the next one starts)');
      var tagsCb = U.checkbox('Remove formatting (<i>, <b>, {\\an8}, colours)');
      var emptyCb = U.checkbox('Remove empty cues', { checked: true });

      /* output */
      var fmt = choice('Convert to', Object.keys(FORMATS).map(function (k) { return { value: k, label: FORMATS[k].label, desc: FORMATS[k].desc }; }), 'srt', function () { update(); });
      var timesCb = U.checkbox('Start each line with its time, like [1:05]', { checked: true });
      var output = U.textarea({ rows: 12, spellcheck: false, readOnly: true, dataset: { k: 'output' } });
      var outInfo = el('div', { class: 'gv-fileinfo', dataset: { k: 'out-info' } });
      var dl = U.button('Download', function () {
        if (!st.result || !st.result.cues.length) { U.toast('Nothing to download yet', 'err'); return; }
        U.saveText(st.name + '.' + FORMATS[fmt.value].ext, output.value, FORMATS[fmt.value].mime);
      });
      var useBtn = U.button('Use as input', function () { input.value = output.value; st.encoding = ''; update(); U.toast('The result is now the input'); }, 'ghost');
      var issueSummary = el('p', { class: 'note', dataset: { k: 'issue-summary' } });
      var issueList = el('ul', { class: 'gvb-issues', dataset: { k: 'issues' } });

      root.appendChild(U.panel(null, zone, input, detected, parseErrs));
      root.appendChild(U.panel('Timing',
        U.field('Shift every cue by (milliseconds)', shift, 'Positive delays the subtitles, negative brings them earlier.'), nudges,
        el('div', { class: 'gvb-row2' }, U.field('Subtitles were timed for (fps)', fromFps), U.field('Video plays at (fps)', toFps)),
        desc('Change the frame rate when subtitles made for a 25 fps (PAL) release drift against a 23.976 fps film, or the other way round.'),
        syncOn, syncWrap,
        desc('Applied in this order: frame rate, two-point sync, then the shift.')));
      root.appendChild(U.panel('Clean up', sortCb, overlapCb, tagsCb, emptyCb));
      root.appendChild(U.panel('Result', fmt, timesCb, output, outInfo, U.btnrow(dl, U.copyBtn('Copy', function () { return output.value; }), useBtn)));
      root.appendChild(U.panel('Check', issueSummary, issueList));

      async function loadFile(file) {
        if (!file) return;
        try {
          var d = decodeText(await file.arrayBuffer());
          st.name = baseName(file.name); st.encoding = d.encoding;
          input.value = d.text;
          zone.querySelector('strong').textContent = file.name + ' (' + size(file.size) + ')';
          zone.querySelector('span').textContent = 'Click or drop to choose a different file';
          update(true);
        } catch (e) { U.toast(e.message || String(e), 'err'); }
      }

      /* The reference-cue pickers list every cue with its (rate-adjusted) time. */
      var syncFor = { cues: null, rate: 0 };
      function fillSync(cues, rate) {
        if (syncFor.cues === cues && syncFor.rate === rate) return;
        syncFor = { cues: cues, rate: rate };
        var keep1 = sel1.value, keep2 = sel2.value, n = cues.length;
        function opts(sel) {
          sel.replaceChildren.apply(sel, cues.map(function (c, i) {
            var t = stripTags(c.text).replace(/\s+/g, ' ').trim();
            return el('option', { value: String(i), text: (i + 1) + ' · ' + stamp(c.start * rate) + ' · ' + (t.length > 34 ? t.slice(0, 33) + '…' : t) });
          }));
        }
        opts(sel1); opts(sel2);
        sel1.value = keep1 && +keep1 < n ? keep1 : '0';
        sel2.value = keep2 && +keep2 < n ? keep2 : String(Math.max(0, n - 1));
        if (!at1.value && n) at1.value = stamp(cues[+sel1.value].start * rate);
        if (!at2.value && n) at2.value = stamp(cues[+sel2.value].start * rate);
      }

      var lastInput = null;
      function update(fresh) {
        var text = input.value;
        if (fresh || text !== lastInput) {
          lastInput = text;
          st.parsed = text.trim() ? parse(text) : null;
          if (fresh) { at1.value = ''; at2.value = ''; }
        }
        var p = st.parsed;
        parseErrs.replaceChildren();
        if (!p) {
          detected.textContent = 'Load or paste subtitles to begin.';
          output.value = ''; outInfo.textContent = ''; issueSummary.textContent = ''; issueSummary.className = 'note'; issueList.replaceChildren();
          st.result = null;
          return;
        }
        var cues = p.cues;
        detected.textContent = 'Read as ' + FORMATS[p.format].label + ' · ' + cues.length + ' cue' + (cues.length === 1 ? '' : 's') +
          (cues.length ? ' · ' + stamp(cues[0].start) + ' → ' + stamp(cues[cues.length - 1].end) : '') + (st.encoding ? ' · ' + st.encoding : '');
        detected.dataset.format = p.format;
        p.errors.slice(0, 50).forEach(function (e) { parseErrs.appendChild(el('li', { class: 'err', text: e })); });

        var from = rateVal(fromFps.value), to = rateVal(toFps.value);
        var rate = from > 0 && to > 0 ? from / to : 1;
        syncWrap.style.display = syncOn.input.checked ? '' : 'none';
        var sync = null, syncErr = '';
        if (syncOn.input.checked && cues.length) {
          fillSync(cues, rate);
          var c1 = cues[+sel1.value], c2 = cues[+sel2.value], w1 = parseWhen(at1.value), w2 = parseWhen(at2.value);
          if (!c1 || !c2 || c1 === c2 || c1.start === c2.start) syncErr = 'Pick two reference cues that start at different times.';
          else if (isNaN(w1) || isNaN(w2)) syncErr = 'Type each reference time like 00:01:02,500 or in seconds.';
          else if ((w2 - w1) * (c2.start - c1.start) <= 0) syncErr = 'The two new times are in the opposite order to the cues.';
          else sync = { t1: Math.round(c1.start * rate), to1: w1, t2: Math.round(c2.start * rate), to2: w2 };
        }
        var r = processCues(cues, {
          rate: rate, sync: sync, shift: Math.round(+shift.value || 0), stripTags: tagsCb.input.checked,
          removeEmpty: emptyCb.input.checked, sort: sortCb.input.checked, fixOverlaps: overlapCb.input.checked
        });
        st.result = r;
        var f = fmt.value;
        timesCb.style.display = f === 'txt' ? '' : 'none';
        output.value = r.cues.length ? write(r.cues, f, { times: timesCb.input.checked, header: f === p.format && p.header ? p.header : null }) : '';
        var rc = r.cues;
        outInfo.textContent = rc.length ? rc.length + ' cue' + (rc.length === 1 ? '' : 's') + ' · ' + stamp(rc[0].start) + ' → ' + stamp(rc[rc.length - 1].end) +
          (r.notes.length ? ' · ' + r.notes.join(' ') : '') + (syncErr ? ' · ' + syncErr : '') : (syncErr || 'No cues.');
        dl.textContent = 'Download .' + FORMATS[f].ext;
        var issues = validate(rc), counts = { err: 0, warn: 0, info: 0 };
        issues.forEach(function (i) { counts[i.level]++; });
        if (!rc.length) { issueSummary.className = 'note err'; issueSummary.textContent = p.errors.length ? 'No cues could be read.' : 'There are no cues.'; }
        else if (!issues.length) { issueSummary.className = 'note ok'; issueSummary.textContent = '✓ No problems found in the result.'; }
        else {
          issueSummary.className = 'note' + (counts.err ? ' err' : '');
          issueSummary.textContent = [counts.err ? counts.err + ' error' + (counts.err === 1 ? '' : 's') : '', counts.warn ? counts.warn + ' warning' + (counts.warn === 1 ? '' : 's') : '',
            counts.info ? counts.info + ' note' + (counts.info === 1 ? '' : 's') : ''].filter(Boolean).join(', ') + ' in the result' +
            (counts.warn && !overlapCb.input.checked && issues.some(function (x) { return /overlap/.test(x.text); }) ? '. Tick "Fix overlaps" to tidy the overlaps.' : '.');
        }
        issueSummary.dataset.errors = String(counts.err); issueSummary.dataset.warnings = String(counts.warn);
        issueList.replaceChildren.apply(issueList, issues.slice(0, 300).map(function (i) { return el('li', { class: i.level, text: i.text }); }));
      }

      var later = U.debounce(function () { update(); }, 150);
      input.addEventListener('input', later);
      [shift, at1, at2].forEach(function (n) { n.addEventListener('input', later); });
      [fromFps, toFps, syncOn.input, sortCb.input, overlapCb.input, tagsCb.input, emptyCb.input, timesCb.input].forEach(function (n) {
        n.addEventListener('change', function () { update(); });
      });
      /* Picking another reference cue starts its target time at the cue's own time. */
      [[sel1, at1], [sel2, at2]].forEach(function (p) {
        p[0].addEventListener('change', function () {
          var c = st.parsed && st.parsed.cues[+p[0].value];
          if (c) p[1].value = stamp(c.start * (syncFor.rate || 1));
          update();
        });
      });
      update();
    }
  });

  /* ======================================================================
     Video & Audio File Info
     ====================================================================== */

  function ratioOf(s) { var m = /^(-?\d+)\/(\d+)$/.exec(s || ''); return m && +m[2] ? +m[1] / +m[2] : NaN; }
  function fpsText(s) {
    var v = ratioOf(s);
    if (!isFinite(v) || v <= 0) return '';
    var r = Math.round(v * 1000) / 1000;
    return String(r) + ' fps' + (/\/1$/.test(s) ? '' : ' (' + s + ')');
  }
  function bitrateText(b) {
    b = +b;
    if (!b) return '';
    return b >= 1e6 ? (b / 1e6).toFixed(2) + ' Mb/s' : Math.round(b / 1000) + ' kb/s';
  }
  function durText(sec) {
    sec = +sec;
    if (!isFinite(sec) || sec < 0) return '';
    var ms = Math.round(sec * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
    return h + ':' + pad(m, 2) + ':' + pad(s, 2) + '.' + pad(ms % 1000, 3) + ' (' + (Math.round(sec * 1000) / 1000) + ' s)';
  }
  function durTag(v) { var m = /^(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(v || ''); return m ? +m[1] * 3600 + +m[2] * 60 + parseFloat(m[3]) : NaN; }
  function when(v) {
    var d = new Date(v);
    if (!v || isNaN(d)) return v || '';
    return pad(d.getUTCDate(), 2) + '/' + pad(d.getUTCMonth() + 1, 2) + '/' + d.getUTCFullYear() + ' ' + pad(d.getUTCHours(), 2) + ':' + pad(d.getUTCMinutes(), 2) + ':' + pad(d.getUTCSeconds(), 2) + ' UTC';
  }
  var COLOURS = {
    bt709: 'BT.709', bt470bg: 'BT.601 (PAL)', smpte170m: 'BT.601 (NTSC)', bt470m: 'BT.470 M', smpte240m: 'SMPTE 240M', bt2020nc: 'BT.2020 (non-constant)',
    bt2020c: 'BT.2020 (constant)', bt2020: 'BT.2020', smpte2084: 'PQ, SMPTE ST 2084 (HDR10)', 'arib-std-b67': 'HLG (hybrid log-gamma)',
    'iec61966-2-1': 'sRGB', linear: 'Linear', gbr: 'RGB', ycgco: 'YCgCo', 'bt2020-10': 'BT.2020 10-bit', 'bt2020-12': 'BT.2020 12-bit', smpte432: 'Display P3', film: 'Film'
  };
  function colourName(v) { return !v || v === 'unknown' || v === 'reserved' ? '' : COLOURS[v] || v; }
  var RANGES = { tv: 'Limited (TV, 16–235)', pc: 'Full (PC, 0–255)' };
  var SCANS = { progressive: 'Progressive', tt: 'Interlaced, top field first', bb: 'Interlaced, bottom field first', tb: 'Interlaced (top coded first, bottom shown first)', bt: 'Interlaced (bottom coded first, top shown first)' };
  var TYPES = { video: 'Video', audio: 'Audio', subtitle: 'Subtitles', data: 'Data', attachment: 'Attachment' };
  function levelText(s) {
    var l = +s.level;
    if (!(l > 0)) return '';
    if (s.codec_name === 'h264') return String(l / 10);
    if (s.codec_name === 'hevc') return String(Math.round(l / 3) / 10);
    return String(l);
  }
  function bitDepth(s) {
    var m = /p(\d{2})(le|be)?$/.exec(s.pix_fmt || '');
    var b = m ? +m[1] : +s.bits_per_raw_sample;
    return b ? b + '-bit' : '';
  }
  /* The display matrix turns the picture counter-clockwise; the old rotate
     tag (and people) count clockwise. */
  function rotationOf(s) {
    var sd = (s.side_data_list || []).filter(function (d) { return d.rotation !== undefined; })[0];
    var r = sd ? -Math.round(+sd.rotation) : s.tags && s.tags.rotate ? Math.round(+s.tags.rotate) : 0;
    return ((r % 360) + 360) % 360;
  }
  function flagsText(d) {
    var names = { default: 'default', forced: 'forced', attached_pic: 'cover art', hearing_impaired: 'hearing impaired', visual_impaired: 'audio description',
      comment: 'commentary', dub: 'dub', original: 'original', lyrics: 'lyrics', karaoke: 'karaoke', captions: 'captions', descriptions: 'descriptions' };
    return Object.keys(names).filter(function (k) { return d && d[k]; }).map(function (k) { return names[k]; }).join(', ');
  }
  function hdrText(s) {
    var sd = (s.side_data_list || []).map(function (d) { return d.side_data_type || ''; }).join(' ');
    if (s.color_transfer === 'smpte2084') return /Dolby/i.test(sd) ? 'Dolby Vision / HDR10 (PQ)' : 'HDR10 (PQ)' + (/Mastering/i.test(sd) ? ', with mastering display data' : '');
    if (s.color_transfer === 'arib-std-b67') return 'HLG';
    return /Dolby/i.test(sd) ? 'Dolby Vision' : '';
  }

  function streamRows(s) {
    var t = s.tags || {}, rows = [], type = s.codec_type;
    rows.push(['codec', 'Codec', (s.codec_long_name || s.codec_name || '') + (s.codec_long_name && s.codec_name ? ' (' + s.codec_name + ')' : '')]);
    rows.push(['profile', 'Profile', s.profile && s.profile !== 'unknown' ? s.profile : '']);
    if (type === 'video') {
      var rot = rotationOf(s);
      rows.push(['level', 'Level', levelText(s)]);
      rows.push(['resolution', 'Resolution', s.width && s.height ? s.width + '×' + s.height + (s.display_aspect_ratio && s.display_aspect_ratio !== '0:1' ? ' (' + s.display_aspect_ratio + ')' : '') : '']);
      rows.push(['rotation', 'Rotation', rot ? rot + '° clockwise, shown as ' + (rot % 180 ? s.height + '×' + s.width : s.width + '×' + s.height) : '']);
      rows.push(['sar', 'Pixel aspect ratio', s.sample_aspect_ratio && !/^(1:1|0:1)$/.test(s.sample_aspect_ratio) ? s.sample_aspect_ratio : '']);
      rows.push(['fps', 'Frame rate', fpsText(s.r_frame_rate)]);
      if (s.avg_frame_rate && s.avg_frame_rate !== s.r_frame_rate) rows.push(['avg-fps', 'Average frame rate', fpsText(s.avg_frame_rate)]);
      rows.push(['pix-fmt', 'Pixel format', s.pix_fmt || '']);
      rows.push(['bit-depth', 'Bit depth', bitDepth(s)]);
      rows.push(['range', 'Colour range', RANGES[s.color_range] || (s.color_range && s.color_range !== 'unknown' ? s.color_range : '')]);
      rows.push(['matrix', 'Colour space', colourName(s.color_space)]);
      rows.push(['primaries', 'Colour primaries', colourName(s.color_primaries)]);
      rows.push(['transfer', 'Transfer', colourName(s.color_transfer)]);
      rows.push(['chroma', 'Chroma location', s.chroma_location && s.chroma_location !== 'unspecified' ? s.chroma_location : '']);
      rows.push(['scan', 'Scan', SCANS[s.field_order] || '']);
      rows.push(['hdr', 'HDR', hdrText(s)]);
    } else if (type === 'audio') {
      rows.push(['sample-rate', 'Sample rate', s.sample_rate ? (+s.sample_rate).toLocaleString('en-GB') + ' Hz' : '']);
      rows.push(['channels', 'Channels', s.channels ? s.channels + (s.channel_layout ? ' (' + s.channel_layout + ')' : '') : '']);
      rows.push(['sample-fmt', 'Sample format', s.sample_fmt || '']);
      rows.push(['bits', 'Bits per sample', +s.bits_per_raw_sample || +s.bits_per_sample || '']);
    }
    rows.push(['bitrate', 'Bitrate', bitrateText(s.bit_rate || t.BPS || t['BPS-eng'])]);
    rows.push(['duration', 'Duration', durText(s.duration !== undefined ? s.duration : durTag(t.DURATION || t['DURATION-eng']))]);
    rows.push(['frames', 'Frames', s.nb_frames || t.NUMBER_OF_FRAMES || t['NUMBER_OF_FRAMES-eng'] || '']);
    rows.push(['language', 'Language', t.language && t.language !== 'und' ? t.language : '']);
    rows.push(['title', 'Title', t.title || '']);
    rows.push(['flags', 'Flags', flagsText(s.disposition)]);
    rows.push(['codec-tag', 'Codec tag', s.codec_tag_string && !/\[0\]/.test(s.codec_tag_string) ? s.codec_tag_string : '']);
    rows.push(['time-base', 'Time base', s.time_base || '']);
    rows.push(['start', 'Start time', +s.start_time ? (+s.start_time).toFixed(3) + ' s' : '']);
    Object.keys(t).forEach(function (k) {
      if (!/^(language|title|rotate|DURATION|BPS|NUMBER_OF_FRAMES|NUMBER_OF_BYTES|_STATISTICS_\w+)(-eng)?$/i.test(k)) rows.push(['tag-' + k.toLowerCase(), k, t[k]]);
    });
    return rows;
  }

  function kvTable(rows, prefix) {
    return el('div', { class: 'gvb-scroll' }, el('table', { class: 'data gvb-kv', dataset: { k: prefix } }, el('tbody', rows.filter(function (r) {
      return r && r[2] !== '' && r[2] !== undefined && r[2] !== null;
    }).map(function (r) {
      return el('tr', { dataset: { k: prefix + '-' + r[0] } }, el('td', { class: 'gvb-key', text: r[1] }), el('td', { class: 'mono', text: String(r[2]) }));
    }))));
  }

  function infoReport(file, info, raw, json) {
    var f = info.format || {}, streams = info.streams || [], chapters = info.chapters || [], ft = f.tags || {};
    var counts = {};
    streams.forEach(function (s) { counts[s.codec_type] = (counts[s.codec_type] || 0) + 1; });
    var video = streams.filter(function (s) { return s.codec_type === 'video' && !(s.disposition && s.disposition.attached_pic); })[0];
    var audio = streams.filter(function (s) { return s.codec_type === 'audio'; })[0];
    var ext = extOf(file.name).toUpperCase();
    var shortFmt = ext && ext.length <= 4 ? ext : String(f.format_name || '').split(',')[0].toUpperCase();
    var summary = [
      { label: 'Container', value: shortFmt || '—' },
      { label: 'Duration', value: +f.duration ? fmtTime(+f.duration) : '—' },
      { label: 'Size', value: size(+f.size || file.size) },
      { label: 'Bitrate', value: bitrateText(f.bit_rate) || '—' },
      { label: 'Streams', value: Object.keys(counts).map(function (k) { return counts[k] + ' ' + (TYPES[k] || k).toLowerCase(); }).join(' · ') || '—' }
    ];
    if (video) {
      var rot = rotationOf(video), w = rot % 180 ? video.height : video.width, h = rot % 180 ? video.width : video.height;
      summary.push({ label: 'Picture', value: w + '×' + h + (fpsText(video.avg_frame_rate || video.r_frame_rate) ? ' · ' + fpsText(video.avg_frame_rate || video.r_frame_rate).replace(/ \(.*\)$/, '') : '') });
    } else if (audio) summary.push({ label: 'Sound', value: (audio.sample_rate ? (+audio.sample_rate / 1000) + ' kHz · ' : '') + (audio.channel_layout || audio.channels + ' ch') });
    var nodes = [U.stats(summary)];

    nodes.push(U.panel('Container', kvTable([
      ['format', 'Format', (f.format_long_name || '') + (f.format_name ? ' (' + f.format_name + ')' : '')],
      ['brand', 'Brand', ft.major_brand ? ft.major_brand.trim() + (ft.compatible_brands ? ' (compatible: ' + ft.compatible_brands + ')' : '') : ''],
      ['duration', 'Duration', durText(f.duration)],
      ['size', 'Size', (+f.size ? size(+f.size) + ' (' + (+f.size).toLocaleString('en-GB') + ' bytes)' : size(file.size))],
      ['bitrate', 'Overall bitrate', bitrateText(f.bit_rate)],
      ['streams', 'Streams', f.nb_streams],
      ['programs', 'Programs', +f.nb_programs ? f.nb_programs : ''],
      ['chapters', 'Chapters', chapters.length || ''],
      ['start', 'Start time', +f.start_time ? (+f.start_time).toFixed(3) + ' s' : ''],
      ['score', 'Detection confidence', f.probe_score !== undefined ? f.probe_score + '/100' : '']
    ], 'container')));

    streams.forEach(function (s) {
      var title = 'Stream #' + s.index + ' · ' + (TYPES[s.codec_type] || s.codec_type || 'Unknown') + (s.codec_name ? ' · ' + s.codec_name.toUpperCase() : '') +
        (s.disposition && s.disposition.attached_pic ? ' (cover art)' : '');
      nodes.push(U.panel(title, kvTable(streamRows(s), 'stream' + s.index)));
    });

    if (chapters.length) {
      nodes.push(U.panel('Chapters (' + chapters.length + ')', el('div', { class: 'gvb-scroll' }, U.table(['#', 'Start', 'End', 'Length', 'Title'],
        chapters.map(function (c, i) {
          var a = +c.start_time, b = +c.end_time;
          return [String(i + 1), fmtTime(a, true), fmtTime(b, true), fmtSecs(Math.max(0, b - a)), (c.tags && c.tags.title) || ''];
        })))));
      nodes[nodes.length - 1].querySelector('table').dataset.k = 'chapters';
    }

    var tagKeys = Object.keys(ft).filter(function (k) { return !/^(major_brand|minor_version|compatible_brands)$/.test(k); });
    if (tagKeys.length) {
      nodes.push(U.panel('Metadata tags', kvTable(tagKeys.map(function (k) {
        return ['tag-' + k.toLowerCase(), k, /creation_time|date/i.test(k) && /T\d\d:/.test(ft[k]) ? when(ft[k]) + ' (' + ft[k] + ')' : ft[k]];
      }), 'tags')));
    }

    var rawPre = el('pre', { class: 'out', text: raw, dataset: { k: 'raw' } });
    var jsonPre = el('pre', { class: 'out', text: json, dataset: { k: 'json' } });
    var base = baseName(file.name);
    nodes.push(U.panel('Full report',
      el('details', null, el('summary', { text: 'ffmpeg\'s own report' }), rawPre),
      el('details', null, el('summary', { text: 'ffprobe JSON' }), jsonPre),
      U.btnrow(U.copyBtn('Copy report', function () { return raw; }),
        U.button('Download JSON', function () { U.saveText(base + '-info.json', json, 'application/json'); }),
        U.button('Download report', function () { U.saveText(base + '-info.txt', raw); }, 'ghost'))));
    return nodes;
  }

  MK.register({
    id: 'video-info', category: 'video', name: 'Video & Audio File Info',
    description: 'See everything ffmpeg can read from a video or audio file: container, streams, codecs, resolution, frame rate, colour, chapters and tags, with the raw report and a JSON export.',
    keywords: ['media info', 'mediainfo', 'ffprobe', 'video info', 'audio info', 'file info', 'metadata', 'codec', 'bitrate', 'frame rate', 'fps',
      'resolution', 'duration', 'streams', 'chapters', 'tags', 'hdr', 'color space', 'colour space', 'pixel format', 'sample rate', 'channels', 'rotation', 'inspect'],
    render: function (root) {
      root.classList.add('g-video', 'g-vb');
      var current = null;
      var zone = U.dropzone({ accept: 'video/*,audio/*,image/gif,.mkv,.mov,.avi,.ts,.mts,.m2ts,.flv,.wmv,.opus,.flac,.ac3,.aac,.m4a,.wv',
        label: 'Drop a video or audio file here or click to choose', hint: 'Any format ffmpeg can open. Nothing is uploaded.', onFiles: function (f) { inspect(f[0]); } });
      var prog = U.progress();
      var res = el('div', { class: 'stack' });
      root.appendChild(U.panel(null, zone, prog));
      root.appendChild(res);

      async function inspect(file) {
        if (!file) return;
        current = file;
        zone.querySelector('strong').textContent = file.name + ' (' + size(file.size) + ')';
        zone.querySelector('span').textContent = 'Click or drop to inspect a different file';
        res.replaceChildren();
        prog.set('Reading the file…');
        try {
          var out = await ffRun({ inputs: [file], ffprobe: true, allowFail: true,
            args: function (p, d) { return ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', '-show_chapters', '-show_error', '-o', d + '/probe.json', p[0]]; },
            outputs: function (names) { return names.indexOf('probe.json') >= 0 ? ['probe.json'] : []; } });
          if (current !== file) return;
          if (!out.length) throw new Error('ffmpeg could not read this file.');
          var json = new TextDecoder().decode(out[0].data), info = JSON.parse(json);
          if (info.error || !info.format) throw new Error('ffmpeg could not read this file' + (info.error && info.error.string ? ' (' + info.error.string + ').' : '.'));
          var lines = [];
          await ffRun({ inputs: [file], allowFail: true, onLog: function (l) { lines.push(l); }, args: function (p) { return ['-i', p[0]]; }, outputs: [] });
          if (current !== file) return;
          var safeName = file.name.replace(/\$/g, '$$$$');
          var raw = lines.filter(function (l) { return !/^Aborted\(\)$|At least one output file must be specified/.test(l); }).join('\n')
            .replace(/\/job\d+\/in\/i0(\.\w+)?/g, safeName);
          res.replaceChildren.apply(res, infoReport(file, info, raw, json));
          prog.set('');
        } catch (e) {
          if (current === file) prog.fail(/unexpected|JSON/i.test(e.message) ? new Error('ffmpeg could not read this file.') : e);
        }
      }
      U.onTeardown(root, function () { current = null; });
    }
  });

  /* ======================================================================
     GIF to MP4
     ====================================================================== */

  /* Animated WebP: ffmpeg 5.1 cannot decode it, but Chrome's ImageDecoder
     can, so frames are decoded here and handed over as PNGs with their own
     durations (the concat demuxer keeps variable timing). */
  async function webpFrames(file, onProgress) {
    if (!window.ImageDecoder) throw new Error('This browser cannot read animated WebP. Try Chrome or Edge, or convert it to a GIF first.');
    var dec = new ImageDecoder({ data: await file.arrayBuffer(), type: 'image/webp' });
    try {
      await dec.tracks.ready;
      var n = dec.tracks.selectedTrack.frameCount, frames = [], canvas = null, g = null;
      for (var i = 0; i < n; i++) {
        var img = (await dec.decode({ frameIndex: i })).image;
        if (!canvas) { canvas = document.createElement('canvas'); canvas.width = img.displayWidth; canvas.height = img.displayHeight; g = canvas.getContext('2d'); }
        g.clearRect(0, 0, canvas.width, canvas.height);
        g.drawImage(img, 0, 0);
        var dur = img.duration ? img.duration / 1e6 : 0.1;
        img.close();
        var blob = await new Promise(function (r) { canvas.toBlob(r, 'image/png'); });
        frames.push({ data: new Uint8Array(await blob.arrayBuffer()), dur: Math.max(0.01, dur) });
        if (onProgress) onProgress((i + 1) / n);
      }
      return { frames: frames, width: canvas ? canvas.width : 0, height: canvas ? canvas.height : 0 };
    } finally { dec.close(); }
  }
  async function webpMeta(file) {
    if (!window.ImageDecoder) return null;
    var dec = new ImageDecoder({ data: await file.arrayBuffer(), type: 'image/webp' });
    try {
      await dec.tracks.ready;
      var img = (await dec.decode({ frameIndex: 0 })).image, r = { frames: dec.tracks.selectedTrack.frameCount, width: img.displayWidth, height: img.displayHeight };
      img.close();
      return r;
    } finally { dec.close(); }
  }

  /* Filter chain from [0:v] to [v]: speed, flatten transparency onto a solid
     colour (or keep alpha for WebM), and pad to even dimensions for H.264. */
  function gifChain(o) {
    var pre = '[0:v]' + (o.speed !== 1 ? 'setpts=PTS/' + o.speed + ',' : '');
    if (o.alpha) return pre + 'format=yuva420p,pad=ceil(iw/2)*2:ceil(ih/2)*2:0:0:color=black@0[v]';
    var hex = o.bg.replace('#', ''), r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    return pre + 'format=rgba,split[fg][bgsrc];[bgsrc]lutrgb=r=' + r + ':g=' + g + ':b=' + b + ':a=255[bg];[bg][fg]overlay=format=auto,' +
      'pad=ceil(iw/2)*2:ceil(ih/2)*2:0:0:color=0x' + hex + ',format=yuv420p[v]';
  }

  MK.register({
    id: 'gif-to-mp4', category: 'video', name: 'GIF to MP4',
    description: 'Turn an animated GIF or WebP into a far smaller MP4 or WebM video, with looping, speed and a background colour for transparent areas.',
    keywords: ['gif to mp4', 'gif to video', 'gif to webm', 'webp to mp4', 'animated webp', 'convert gif', 'gif converter', 'shrink gif',
      'compress gif', 'loop', 'transparent', 'transparency', 'background color', 'background colour', 'h264', 'mp4'],
    render: function (root) {
      var outFmt, loops, speed, bgChoice, custom, keepAlpha, alphaWrap, info2, bgWrap, meta = null, metaErr = '';
      function isWebp(file) { return /webp/i.test(file.type) || extOf(file.name) === 'webp'; }
      function bgValue() { return bgChoice.value === 'custom' ? custom.value : bgChoice.value; }
      MK.fileTool(root, {
        accept: 'image/gif,image/webp,.gif,.webp', drop: 'Drop an animated GIF or WebP here or click to choose',
        hint: 'GIF or animated WebP… nothing is uploaded', working: 'Converting', needVideo: true,
        action: function () { return 'Convert to ' + (outFmt ? outFmt.value.toUpperCase() : 'MP4'); },
        ready: function () { return !metaErr; },
        options: function (ctx) {
          var file = ctx.st.file, info = ctx.st.info;
          meta = null; metaErr = '';
          root.classList.add('g-vb');
          info2 = el('div', { class: 'gv-fileinfo', dataset: { k: 'gif-info' } });
          outFmt = choice('Save as', [
            { value: 'mp4', label: 'MP4', desc: 'H.264: plays everywhere, including WhatsApp, X and PowerPoint.' },
            { value: 'webm', label: 'WEBM', desc: 'VP8 WebM for web pages. It can keep transparent areas.' }
          ], 'mp4', function (v) { alphaWrap.style.display = v === 'webm' ? '' : 'none'; syncBg(); ctx.refresh(); });
          loops = choice('Play the animation', ['1', '2', '3', '5', '10'].map(function (v) { return { value: v, label: v + '×' }; }), '1', upd);
          speed = choice('Speed', ['0.5', '0.75', '1', '1.5', '2'].map(function (v) { return { value: v, label: v + '×' }; }), '1', upd);
          bgChoice = choice('Background for transparent areas', [
            { value: '#ffffff', label: 'White' }, { value: '#000000', label: 'Black' }, { value: 'custom', label: 'Other colour' }
          ], '#ffffff', function () { custom.style.display = bgChoice.value === 'custom' ? '' : 'none'; });
          custom = el('input', { type: 'color', value: '#00ff00', title: 'Background colour', 'aria-label': 'Background colour' });
          custom.style.display = 'none';
          bgWrap = el('div', { class: 'gvb-colours' }, bgChoice, custom);
          keepAlpha = U.checkbox('Keep the transparency instead (WebM only)');
          keepAlpha.input.addEventListener('change', syncBg);
          alphaWrap = el('div', null, keepAlpha);
          alphaWrap.style.display = 'none';
          function syncBg() { bgWrap.style.display = outFmt.value === 'webm' && keepAlpha.input.checked ? 'none' : ''; }
          function upd() {
            var w = meta ? meta.width : info.width, h = meta ? meta.height : info.height;
            var bits = [];
            if (w && h) bits.push(w + '×' + h + (w % 2 || h % 2 ? ' (padded to ' + (w + w % 2) + '×' + (h + h % 2) + ' for H.264)' : ''));
            if (meta) bits.push(meta.frames + ' frame' + (meta.frames === 1 ? '' : 's'));
            else if (isFinite(info.duration)) bits.push(fmtSecs(info.duration) + ' → ' + fmtSecs(info.duration * +loops.value / +speed.value) + ' of video');
            if (info.fps && !meta) bits.push(Math.round(info.fps * 100) / 100 + ' fps');
            info2.textContent = metaErr || bits.join(' · ');
            info2.className = metaErr ? 'note err' : 'gv-fileinfo';
          }
          if (isWebp(file)) {
            info2.textContent = 'Reading the WebP…';
            webpMeta(file).then(function (m) {
              if (!m) metaErr = 'This browser cannot read animated WebP. Try Chrome or Edge, or convert it to a GIF first.';
              meta = m; upd(); ctx.refresh();
            }).catch(function (e) { metaErr = 'This WebP could not be read (' + (e.message || e) + ').'; upd(); ctx.refresh(); });
          } else upd();
          return [info2, outFmt, loops, speed, bgWrap, alphaWrap];
        },
        run: async function (ctx) {
          var file = ctx.st.file, info = ctx.st.info, f = outFmt.value, n = +loops.value, s = +speed.value;
          var alpha = f === 'webm' && keepAlpha.input.checked;
          var venc = f === 'webm'
            ? ['-c:v', 'libvpx', '-deadline', 'realtime', '-cpu-used', '6', '-crf', '10', '-b:v', '2M', '-pix_fmt', alpha ? 'yuva420p' : 'yuv420p'].concat(alpha ? ['-auto-alt-ref', '0'] : [])
            : MK.vEnc(20).concat(MK.MP4_TAIL);
          var job;
          if (isWebp(file)) {
            ctx.prog.set('Decoding the WebP frames…', 0);
            var wf = await webpFrames(file, function (x) { ctx.prog.set('Decoding the WebP frames… ' + Math.round(x * 100) + '%', x * 0.5); });
            if (!wf.frames.length) throw new Error('This WebP has no frames.');
            var files = wf.frames.map(function (fr, i) { return { name: 'f' + pad(i + 1, 5) + '.png', data: fr.data }; });
            var list = ['ffconcat version 1.0'], total = 0;
            for (var k = 0; k < n; k++) {
              wf.frames.forEach(function (fr, i) { list.push("file 'f" + pad(i + 1, 5) + ".png'", 'duration ' + (fr.dur / s).toFixed(4)); total += fr.dur / s; });
            }
            list.push("file 'f" + pad(wf.frames.length, 5) + ".png'");
            files.push({ name: 'list.txt', data: enc(list.join('\n') + '\n') });
            job = { inputs: [], files: files, duration: total,
              onProgress: function (x) { ctx.prog.set('Encoding… ' + Math.round(x * 100) + '%', 0.5 + x * 0.5); },
              args: function (p, d) { return ['-f', 'concat', '-safe', '0', '-i', d + '/list.txt', '-filter_complex', gifChain({ speed: 1, alpha: alpha, bg: bgValue() }), '-map', '[v]', '-an', '-fps_mode', 'vfr'].concat(venc, [d + '/out.' + f]); } };
          } else {
            job = { inputs: [file], duration: (info.duration || 0) * n / s, onProgress: ctx.progress,
              args: function (p, d) { return ['-stream_loop', String(n - 1), '-i', p[0], '-filter_complex', gifChain({ speed: s, alpha: alpha, bg: bgValue() }), '-map', '[v]', '-an'].concat(venc, [d + '/out.' + f]); } };
          }
          job.outputs = ['out.' + f];
          var out = await ffRun(job);
          var before = file.size, after = out[0].data.length;
          var card = MK.outCard(ctx, out[0], baseName(file.name) + '.' + f);
          var pct = Math.round((1 - after / before) * 100);
          var nodes = [U.stats([
            { label: 'Before', value: size(before) },
            { label: 'After', value: size(after) },
            pct >= 0 ? { label: 'Smaller', value: pct + '%' + (after && before / after >= 2 ? ' (' + (before / after).toFixed(1) + '× smaller)' : '') } : { label: 'Bigger', value: Math.abs(pct) + '%' }
          ]), card];
          nodes[0].dataset.k = 'saving';
          if (after >= before) nodes.unshift(U.note('This animation is so small or simple that the video is not smaller. The original GIF may be the better file to keep.', 'err'));
          return nodes;
        },
        onReset: function () { meta = null; metaErr = ''; }
      });
    }
  });

  /* ======================================================================
     Side-by-Side & Picture-in-Picture Video
     ====================================================================== */

  function even(n) { return Math.max(2, Math.round(n / 2) * 2); }
  /* Where each video goes. The same numbers drive the preview and ffmpeg. */
  function sbsLayout(ai, bi, o) {
    if (o.layout === 'hstack') {
      var h = even(o.size === 'auto' ? Math.min(ai.height, bi.height) : +o.size);
      var aw = even(ai.width * h / ai.height), bw = even(bi.width * h / bi.height);
      return { W: aw + bw, H: h, a: { x: 0, y: 0, w: aw, h: h }, b: { x: aw, y: 0, w: bw, h: h }, border: 0 };
    }
    if (o.layout === 'vstack') {
      var w = even(o.size === 'auto' ? Math.min(ai.width, bi.width) : +o.size);
      var ah = even(ai.height * w / ai.width), bh = even(bi.height * w / bi.width);
      return { W: w, H: ah + bh, a: { x: 0, y: 0, w: w, h: ah }, b: { x: 0, y: ah, w: w, h: bh }, border: 0 };
    }
    var W = even(ai.width), H = even(ai.height);
    var pw = even(W * o.pct / 100), ph = even(bi.height * pw / bi.width);
    var bd = o.border === 'none' ? 0 : Math.max(2, even(W * 0.008));
    var m = Math.round(W * o.margin / 200) * 2;   /* even, so the 4:2:0 overlay lands exactly */
    var bx = o.corner[1] === 'l' ? m : W - pw - 2 * bd - m, by = o.corner[0] === 't' ? m : H - ph - 2 * bd - m;
    return { W: W, H: H, a: { x: 0, y: 0, w: W, h: H }, b: { x: bx + bd, y: by + bd, w: pw, h: ph }, box: { x: bx, y: by, w: pw + 2 * bd, h: ph + 2 * bd }, border: bd };
  }

  MK.register({
    id: 'video-side-by-side', category: 'video', name: 'Side-by-Side & Picture-in-Picture Video',
    description: 'Put two videos next to each other, one above the other, or one inside the other as picture-in-picture, and choose whose sound you hear.',
    keywords: ['side by side', 'split screen', 'picture in picture', 'pip', 'hstack', 'vstack', 'stack videos', 'combine videos', 'reaction video',
      'comparison', 'before and after', 'dual video', 'two videos', 'overlay video', 'collage'],
    render: function (root) {
      var layout, sizeBox, sizeC, pipBox, corner, pct, margin, border, borderColour, audio, length, canvas, frames = {}, ctxRef, geo;
      function opts() {
        return { layout: layout.value, size: sizeC ? sizeC.value : 'auto', corner: corner.value, pct: +pct.value, margin: +margin.value, border: border.value };
      }
      function draw() {
        if (!ctxRef || !canvas) return;
        var ai = ctxRef.st.ai, bi = ctxRef.st.bi, L = sbsLayout(ai, bi, opts());
        var s = Math.min(1, 480 / L.W, 320 / L.H);
        canvas.width = Math.max(2, Math.round(L.W * s)); canvas.height = Math.max(2, Math.round(L.H * s));
        var g = canvas.getContext('2d');
        g.fillStyle = '#000'; g.fillRect(0, 0, canvas.width, canvas.height);
        function put(img, r, fill, name) {
          if (img) g.drawImage(img, r.x * s, r.y * s, r.w * s, r.h * s);
          else { g.fillStyle = fill; g.fillRect(r.x * s, r.y * s, r.w * s, r.h * s); g.fillStyle = '#fff'; g.font = '16px sans-serif'; g.fillText(name, r.x * s + 8, r.y * s + 22); }
        }
        put(frames.a, L.a, '#35507a', 'A');
        if (L.box) { g.fillStyle = border.value === 'black' ? '#000' : '#fff'; g.fillRect(L.box.x * s, L.box.y * s, L.box.w * s, L.box.h * s); }
        put(frames.b, L.b, '#7a3550', 'B');
        geo.textContent = 'Result ' + L.W + '×' + L.H + ' · A ' + L.a.w + '×' + L.a.h + ' · B ' + L.b.w + '×' + L.b.h + (layout.value === 'pip' ? ' at ' + L.b.x + ',' + L.b.y : '');
      }
      function buildSize() {
        var hs = layout.value === 'hstack';
        sizeC = choice(hs ? 'Common height' : 'Common width', hs
          ? [{ value: 'auto', label: 'Match the smaller' }, { value: '480', label: '480' }, { value: '720', label: '720' }, { value: '1080', label: '1080' }]
          : [{ value: 'auto', label: 'Match the narrower' }, { value: '640', label: '640' }, { value: '1280', label: '1280' }, { value: '1920', label: '1920' }],
        'auto', draw);
        sizeC.appendChild(desc('Both videos are scaled to this ' + (hs ? 'height' : 'width') + ', keeping their shape.'));
        sizeBox.replaceChildren(sizeC);
      }
      MK.twoFileTool(root, {
        working: 'Combining the videos',
        slots: [
          { title: '1. Video A (left, top, or the main picture)', accept: 'video/*', hint: 'MP4, MOV, MKV, WebM…' },
          { title: '2. Video B (right, bottom, or the small picture)', accept: 'video/*', hint: 'MP4, MOV, MKV, WebM…' }
        ],
        status: function (ctx) {
          var s = [];
          if (ctx.st.ai) s.push('A: ' + ctx.st.ai.width + '×' + ctx.st.ai.height + ' · ' + fmtSecs(ctx.st.ai.duration || 0) + (ctx.st.ai.hasAudio ? '' : ' · no sound'));
          if (ctx.st.bi) s.push('B: ' + ctx.st.bi.width + '×' + ctx.st.bi.height + ' · ' + fmtSecs(ctx.st.bi.duration || 0) + (ctx.st.bi.hasAudio ? '' : ' · no sound'));
          return s.join('  ·  ');
        },
        action: function () { return layout && layout.value === 'pip' ? 'Make picture-in-picture' : 'Combine the videos'; },
        options: function (ctx) {
          ctxRef = ctx;
          root.classList.add('g-vb');
          if (!ctx.st.ai.hasVideo || !ctx.st.bi.hasVideo) return U.note('Both files need a video track.', 'err');
          frames = {};
          canvas = el('canvas', { class: 'gv-preview' });
          geo = el('div', { class: 'gv-fileinfo', dataset: { k: 'layout' } });
          sizeBox = el('div');
          pipBox = el('div', { class: 'gv-opts' });
          layout = choice('Layout', [
            { value: 'hstack', label: 'Side by side', desc: 'A on the left, B on the right, at the same height.' },
            { value: 'vstack', label: 'Top and bottom', desc: 'A above B, at the same width. Good for vertical phone video.' },
            { value: 'pip', label: 'Picture-in-picture', desc: 'B plays small in a corner of A, like a reaction video.' }
          ], 'hstack', function (v) { sizeBox.style.display = v === 'pip' ? 'none' : ''; pipBox.style.display = v === 'pip' ? '' : 'none'; if (v !== 'pip') buildSize(); draw(); ctx.refresh(); });
          corner = choice('Corner', [{ value: 'tl', label: 'Top left' }, { value: 'tr', label: 'Top right' }, { value: 'bl', label: 'Bottom left' }, { value: 'br', label: 'Bottom right' }], 'br', draw);
          pct = choice('Size of B', ['20', '25', '33', '40', '50'].map(function (v) { return { value: v, label: v + '%', desc: 'Share of A\'s width.' }; }), '25', draw);
          margin = choice('Margin', [{ value: '0', label: 'None' }, { value: '2', label: 'Small' }, { value: '4', label: 'Medium' }, { value: '7', label: 'Large' }], '4', draw);
          border = choice('Border', [{ value: 'none', label: 'None' }, { value: 'white', label: 'White' }, { value: 'black', label: 'Black' }], 'white', draw);
          pipBox.append(corner, pct, margin, border);
          pipBox.style.display = 'none';
          var ai = ctx.st.ai, bi = ctx.st.bi;
          audio = choice('Sound', [
            { value: 'a', label: 'From A', desc: ai.hasAudio ? '' : 'A has no sound, so the result will be silent.' },
            { value: 'b', label: 'From B', desc: bi.hasAudio ? '' : 'B has no sound, so the result will be silent.' },
            { value: 'mix', label: 'Mix both', desc: 'Both soundtracks at once, each at a comfortable level.' },
            { value: 'none', label: 'No sound' }
          ], ai.hasAudio || !bi.hasAudio ? 'a' : 'b');
          var dA = ai.duration || 0, dB = bi.duration || 0;
          length = choice('Length', [
            { value: 'shortest', label: 'Stop with the shorter (' + fmtSecs(Math.min(dA, dB)) + ')' },
            { value: 'longest', label: 'Play to the end of the longer (' + fmtSecs(Math.max(dA, dB)) + ')', desc: 'The shorter video holds its last frame until the end.' }
          ], 'shortest');
          buildSize();
          MK.grabFrame(ctx.st.a, ai).then(function (img) { frames.a = img; draw(); });
          MK.grabFrame(ctx.st.b, bi).then(function (img) { frames.b = img; draw(); });
          setTimeout(draw);
          return [canvas, geo, layout, sizeBox, pipBox, audio, length];
        },
        run: async function (ctx) {
          var ai = ctx.st.ai, bi = ctx.st.bi, o = opts(), L = sbsLayout(ai, bi, o);
          var dA = ai.duration || 0, dB = bi.duration || 0, D = length.value === 'shortest' ? Math.min(dA, dB) : Math.max(dA, dB);
          if (!(D > 0)) throw new Error('Could not work out how long the videos are.');
          var fps = Math.min(60, Math.round((ai.fps || bi.fps || 30) * 1000) / 1000) || 30;
          function vin(i, info, w, h) {
            var hold = D - (info.duration || 0);
            return '[' + i + ':v:0]fps=' + fps + ',scale=' + w + ':' + h + ',setsar=1,format=yuv420p' +
              (hold > 0.01 ? ',tpad=stop_mode=clone:stop_duration=' + (hold + 0.5).toFixed(3) : '');
          }
          var fc = [vin(0, ai, L.a.w, L.a.h) + '[va]'];
          if (o.layout === 'pip') {
            var bchain = vin(1, bi, L.b.w, L.b.h) + (L.border ? ',pad=' + L.box.w + ':' + L.box.h + ':' + L.border + ':' + L.border + ':color=' + o.border : '');
            fc.push(bchain + '[vb]');
            fc.push('[va][vb]overlay=' + L.box.x + ':' + L.box.y + ':eof_action=repeat,format=yuv420p[v]');
          } else {
            fc.push(vin(1, bi, L.b.w, L.b.h) + '[vb]');
            fc.push('[va][vb]' + o.layout + '=inputs=2[v]');
          }
          var a = audio.value, notes = [];
          if (a === 'a' && !ai.hasAudio) { a = 'none'; notes.push('A has no sound, so the result is silent.'); }
          if (a === 'b' && !bi.hasAudio) { a = 'none'; notes.push('B has no sound, so the result is silent.'); }
          if (a === 'mix' && !(ai.hasAudio && bi.hasAudio)) a = ai.hasAudio ? 'a' : bi.hasAudio ? 'b' : 'none';
          var norm = 'aresample=48000,aformat=channel_layouts=stereo';
          if (a === 'a' || a === 'b') fc.push('[' + (a === 'a' ? 0 : 1) + ':a:0]' + norm + ',apad[a]');
          else if (a === 'mix') fc.push('[0:a:0]' + norm + ',apad[a0];[1:a:0]' + norm + ',apad[a1];[a0][a1]amix=inputs=2:duration=longest:dropout_transition=0[a]');
          var out = await ffRun({ inputs: [ctx.st.a, ctx.st.b], duration: D, onProgress: ctx.progress,
            args: function (p, d) {
              return ['-i', p[0], '-i', p[1], '-filter_complex', fc.join(';'), '-map', '[v]'].concat(a === 'none' ? ['-an'] : ['-map', '[a]'],
                MK.vEnc(21), a === 'none' ? [] : MK.AAC, ['-t', D.toFixed(3)], MK.MP4_TAIL, [d + '/out.mp4']);
            }, outputs: ['out.mp4'] });
          var name = baseName(ctx.st.a.name) + (o.layout === 'pip' ? '-pip' : '-side-by-side') + '.mp4';
          var nodes = [MK.resultCard(MK.toBlob(out[0].data, name), name, L.W + '×' + L.H + ' · ' + fmtTime(D))];
          if (notes.length) nodes.push(U.note(notes.join(' ')));
          return nodes;
        }
      });
    }
  });

  /* ======================================================================
     Burn Subtitles into Video
     ====================================================================== */

  var fontCache = {};
  function fontBytes(name) {
    if (!fontCache[name]) {
      fontCache[name] = fetch('assets/vendor/fonts/' + name).then(function (r) {
        if (!r.ok) throw new Error('The subtitle font is missing (assets/vendor/fonts/' + name + ').');
        return r.arrayBuffer();
      });
      fontCache[name].catch(function () { delete fontCache[name]; });
    }
    return fontCache[name];
  }
  /* Fresh copies every time: ffmpeg's writeFile hands the buffer to the worker. */
  async function fontFiles() {
    var reg = await fontBytes('DejaVuSans.ttf'), bold = await fontBytes('DejaVuSans-Bold.ttf');
    return [{ name: 'fonts/DejaVuSans.ttf', data: new Uint8Array(reg.slice(0)) }, { name: 'fonts/DejaVuSans-Bold.ttf', data: new Uint8Array(bold.slice(0)) }];
  }
  var libassP = null;
  function hasLibass() {
    if (!libassP) {
      libassP = (async function () {
        var found = false;
        await ffRun({ inputs: [], allowFail: true, outputs: [], args: function () { return ['-filters']; },
          onLog: function (l) { if (/^\s*\S+\s+subtitles\s+V->V/.test(l)) found = true; } });
        return found;
      })();
      libassP.catch(function () { libassP = null; });
    }
    return libassP;
  }

  function assColour(hex, alpha) {
    var h = String(hex).replace('#', '').toUpperCase();
    return '&H' + pad((alpha || 0).toString(16).toUpperCase(), 2) + h.slice(4, 6) + h.slice(2, 4) + h.slice(0, 2);
  }
  /* Our own ASS for SRT/VTT/… input (or to restyle an ASS file): the play
     resolution is the video's, so sizes are simply pixels. */
  function burnAss(cues, W, H, o) {
    var fs = Math.max(8, Math.round(H * o.size / 100));
    var box = o.outline === 'box';
    var ow = box ? Math.max(2, Math.round(fs * 0.22)) : o.outline === 'thick' ? Math.max(2, Math.round(fs * 0.11)) : o.outline === 'thin' ? Math.max(1, Math.round(fs * 0.055)) : 0;
    var shadow = o.outline === 'none' ? Math.max(1, Math.round(fs * 0.05)) : 0;
    var back = box ? '&H60000000' : '&H80000000';
    var style = ['Default', 'DejaVu Sans', fs, assColour(o.colour), assColour(o.colour), box ? back : '&H00000000', back, 0, 0, 0, 0, 100, 100, 0, 0,
      box ? 3 : 1, ow, shadow, o.pos === 'top' ? 8 : 2, Math.round(W * 0.04), Math.round(W * 0.04), Math.round(H * o.margin / 100), 1].join(',');
    return ['[Script Info]', 'ScriptType: v4.00+', 'PlayResX: ' + W, 'PlayResY: ' + H, 'WrapStyle: 0', 'ScaledBorderAndShadow: yes', '',
      '[V4+ Styles]', 'Format: ' + ASS_STYLE_FMT, 'Style: ' + style, '', '[Events]', 'Format: ' + ASS_EVENT_FMT].concat(cues.map(function (c) {
      return 'Dialogue: 0,' + stamp(c.start, '.', 'ass') + ',' + stamp(c.end, '.', 'ass') + ',Default,,0,0,0,,' + textToAss(c.text);
    })).join('\n') + '\n';
  }
  /* Offline there is only DejaVu Sans, and libass draws nothing for a font it
     cannot find, so every style and \fn override is pointed at it. */
  function assWithDejaVu(text) {
    return String(text).replace(/^(\s*Style\s*:\s*[^,]*,)[^,]*/gmi, '$1DejaVu Sans').replace(/\\fn[^\\}]*/g, '\\fnDejaVu Sans');
  }
  async function probeSubs(file) {
    var d = decodeText(await file.arrayBuffer()), p = parse(d.text);
    if (!p.cues.length) throw new Error('No subtitles could be read from ' + file.name + (p.errors[0] ? ': ' + p.errors[0] : '.'));
    p.text = d.text;
    return p;
  }

  MK.register({
    id: 'burn-subtitles', category: 'video', name: 'Burn Subtitles into Video',
    description: 'Draw SRT, WebVTT or ASS subtitles permanently onto a video, with the size, colour, outline and position you choose.',
    keywords: ['burn subtitles', 'hardcode subtitles', 'hard subs', 'hardsub', 'open captions', 'embed subtitles', 'add subtitles to video',
      'captions', 'srt', 'vtt', 'ass', 'libass', 'subtitle video', 'text on video'],
    render: function (root) {
      var styling, sizeC, colourC, customColour, outline, pos, margin, still, stillNote, cueSel, ctxRef, stillTimer, stillSeq = 0;
      var hook = root._burn = { forceDrawtext: false, lastMode: '' };
      function colourValue() { return colourC.value === 'custom' ? customColour.value : colourC.value; }
      function styleOpts() { return { size: +sizeC.value, colour: colourValue(), outline: outline.value, pos: pos.value, margin: +margin.value }; }
      function ownStyles() { return styling && styling.value === 'file'; }
      /* Files for one run: the ASS (or per-cue text files) plus the fonts. */
      async function jobFor(ctx, drawtext) {
        var sub = ctx.st.bi, vi = ctx.st.ai, W = vi.width, H = vi.height, fonts = await fontFiles();
        if (drawtext) {
          var o = styleOpts(), fs = Math.max(8, Math.round(H * o.size / 100)), m = Math.round(H * o.margin / 100);
          var bw = o.outline === 'box' || o.outline === 'none' ? 0 : o.outline === 'thick' ? Math.max(2, Math.round(fs * 0.11)) : Math.max(1, Math.round(fs * 0.055));
          var files = fonts.concat(sub.cues.map(function (c, i) { return { name: 'cue' + i + '.txt', data: enc(stripTags(c.text).trim() || ' ') }; }));
          return { files: files, vf: function (d) {
            return sub.cues.map(function (c, i) {
              return 'drawtext=fontfile=' + d + '/fonts/DejaVuSans.ttf:textfile=' + d + '/cue' + i + '.txt:expansion=none:fontsize=' + fs +
                ':fontcolor=0x' + o.colour.replace('#', '') + (bw ? ':borderw=' + bw + ':bordercolor=black' : '') +
                (o.outline === 'box' ? ':box=1:boxcolor=black@0.6:boxborderw=' + Math.round(fs * 0.25) : o.outline === 'none' ? ':shadowx=2:shadowy=2:shadowcolor=black@0.7' : '') +
                ':line_spacing=' + Math.round(fs * 0.2) + ':x=(w-text_w)/2:y=' + (o.pos === 'top' ? m : 'h-text_h-' + m) +
                ":enable='between(t," + (c.start / 1000).toFixed(3) + ',' + (c.end / 1000).toFixed(3) + ")'";
            }).join(',');
          } };
        }
        var ass = (sub.format === 'ass' || sub.format === 'ssa') && ownStyles() ? assWithDejaVu(sub.text) : burnAss(sub.cues, W, H, styleOpts());
        return { files: fonts.concat([{ name: 'subs.ass', data: enc(ass) }]), vf: function (d) { return 'subtitles=' + d + '/subs.ass:fontsdir=' + d + '/fonts'; } };
      }
      async function useDrawtext() { return hook.forceDrawtext || !(await hasLibass()); }

      /* A still at the chosen cue, drawn with exactly the filter the full run uses. */
      async function refreshStill() {
        if (!ctxRef || !still) return;
        var seq = ++stillSeq, sub = ctxRef.st.bi, c = sub.cues[+cueSel.value] || sub.cues[0];
        var t = Math.min(Math.max(0, (c.start + c.end) / 2000), Math.max(0, (ctxRef.st.ai.duration || 0) - 0.05));
        stillNote.textContent = 'Drawing a preview…';
        try {
          var dt = await useDrawtext(), j = await jobFor(ctxRef, dt);
          var out = await ffRun({ inputs: [ctxRef.st.a], files: j.files,
            args: function (p, d) { return ['-ss', t.toFixed(3), '-i', p[0], '-vf', 'setpts=PTS+' + t.toFixed(3) + '/TB,' + j.vf(d) + ',scale=\'min(640,iw)\':-2', '-frames:v', '1', '-update', '1', d + '/still.png']; },
            outputs: ['still.png'] });
          if (seq !== stillSeq) return;
          if (still.src) URL.revokeObjectURL(still.src);
          still.src = URL.createObjectURL(new Blob([out[0].data], { type: 'image/png' }));
          still.style.display = '';
          stillNote.textContent = 'Preview at ' + fmtTime(t, true) + (dt ? ' (simple text drawing: this ffmpeg has no libass)' : '');
        } catch (e) { if (seq === stillSeq) stillNote.textContent = 'The preview could not be drawn: ' + (e.message || e); }
      }
      function stillSoon() { clearTimeout(stillTimer); stillTimer = setTimeout(refreshStill, 350); }
      U.onTeardown(root, function () { clearTimeout(stillTimer); stillSeq++; if (still && still.src) URL.revokeObjectURL(still.src); });

      MK.twoFileTool(root, {
        working: 'Burning in the subtitles', action: 'Burn in the subtitles',
        slots: [
          { title: '1. Your video', accept: 'video/*', hint: 'MP4, MOV, MKV, WebM…' },
          { title: '2. The subtitles', accept: '.srt,.vtt,.ass,.ssa,.sbv,.ttml,.dfxp,.xml,.txt,text/*', hint: 'SRT, WebVTT, ASS/SSA, SBV or TTML', probe: probeSubs }
        ],
        status: function (ctx) {
          var s = [];
          if (ctx.st.ai) s.push('Video ' + ctx.st.ai.width + '×' + ctx.st.ai.height + ' · ' + fmtTime(ctx.st.ai.duration));
          if (ctx.st.bi) {
            var b = ctx.st.bi;
            s.push(FORMATS[b.format].label + ' subtitles · ' + b.cues.length + ' cue' + (b.cues.length === 1 ? '' : 's') + ' · ' + stamp(b.cues[0].start) + ' → ' + stamp(b.cues[b.cues.length - 1].end));
          }
          return s.join('  ·  ');
        },
        options: function (ctx) {
          ctxRef = ctx;
          root.classList.add('g-vb');
          if (!ctx.st.ai.hasVideo) return U.note('The first file needs a video track.', 'err');
          var sub = ctx.st.bi, isAss = sub.format === 'ass' || sub.format === 'ssa', nodes = [];
          still = el('img', { class: 'gvb-still', alt: 'Preview frame with subtitles' });
          still.style.display = 'none';
          stillNote = el('div', { class: 'gv-fileinfo', dataset: { k: 'still' } });
          cueSel = el('select', { 'aria-label': 'Preview at cue' }, sub.cues.slice(0, 500).map(function (c, i) {
            var t = stripTags(c.text).replace(/\s+/g, ' ').trim();
            return el('option', { value: String(i), text: (i + 1) + ' · ' + shortStamp(c.start) + ' · ' + (t.length > 40 ? t.slice(0, 39) + '…' : t) });
          }));
          cueSel.addEventListener('change', stillSoon);
          var styleBox = el('div', { class: 'gv-opts' });
          if (isAss) {
            styling = choice('Styling', [
              { value: 'file', label: 'Use the file\'s own styles', desc: 'Positions, colours and effects come from the ASS file. Fonts are drawn in DejaVu Sans.' },
              { value: 'mine', label: 'Use my settings', desc: 'Ignore the file\'s styles and use the settings below.' }
            ], 'file', function (v) { styleBox.style.display = v === 'file' ? 'none' : ''; stillSoon(); });
            nodes.push(styling);
          } else styling = null;
          sizeC = choice('Text size', [{ value: '4.5', label: 'Small' }, { value: '6', label: 'Medium' }, { value: '7.5', label: 'Large' }, { value: '9.5', label: 'Extra large' }], '6', stillSoon);
          colourC = choice('Colour', [{ value: '#ffffff', label: 'White' }, { value: '#ffff00', label: 'Yellow' }, { value: '#00ffff', label: 'Cyan' }, { value: '#00ff00', label: 'Green' },
            { value: 'custom', label: 'Other' }], '#ffffff', function () { customColour.style.display = colourC.value === 'custom' ? '' : 'none'; stillSoon(); });
          customColour = el('input', { type: 'color', value: '#ff8800', title: 'Text colour', 'aria-label': 'Text colour', oninput: stillSoon });
          customColour.style.display = 'none';
          outline = choice('Outline', [
            { value: 'thin', label: 'Thin' }, { value: 'thick', label: 'Thick' }, { value: 'box', label: 'Dark box', desc: 'A semi-transparent box behind the words: the most readable on busy footage.' },
            { value: 'none', label: 'Shadow only' }], 'thin', stillSoon);
          pos = choice('Position', [{ value: 'bottom', label: 'Bottom' }, { value: 'top', label: 'Top' }], 'bottom', stillSoon);
          margin = choice('Distance from the edge', [{ value: '3', label: 'Small' }, { value: '6', label: 'Medium' }, { value: '10', label: 'Large' }], '6', stillSoon);
          styleBox.append(sizeC, el('div', { class: 'gvb-colours' }, colourC, customColour), outline, pos, margin);
          if (isAss) styleBox.style.display = 'none';
          nodes.push(styleBox, U.field('Preview at cue', cueSel), still, stillNote);
          if (sub.errors.length) nodes.push(U.note(sub.errors.length + ' part' + (sub.errors.length === 1 ? '' : 's') + ' of the subtitle file could not be read and will be skipped. First: ' + sub.errors[0]));
          var last = sub.cues[sub.cues.length - 1];
          if (ctx.st.ai.duration && last.start / 1000 > ctx.st.ai.duration) nodes.push(U.note('Some subtitles start after the video ends (' + fmtTime(ctx.st.ai.duration) + '), so they will not appear. Do they belong to this video?', 'err'));
          setTimeout(refreshStill);
          return nodes;
        },
        run: async function (ctx) {
          var vi = ctx.st.ai, dt = await useDrawtext(), j = await jobFor(ctx, dt);
          hook.lastMode = dt ? 'drawtext' : 'libass';
          var copyA = /^(aac|mp3)$/.test(vi.acodec);
          var out = await ffRun({ inputs: [ctx.st.a], files: j.files, duration: vi.duration, onProgress: ctx.progress,
            args: function (p, d) {
              return ['-i', p[0], '-map', '0:v:0', '-map', '0:a:0?', '-vf', j.vf(d) + ',scale=trunc(iw/2)*2:trunc(ih/2)*2'].concat(MK.vEnc(20),
                vi.hasAudio ? (copyA ? ['-c:a', 'copy'] : MK.AAC) : [], MK.MP4_TAIL, [d + '/out.mp4']);
            }, outputs: ['out.mp4'] });
          var nodes = [MK.outCard(ctx, out[0], baseName(ctx.st.a.name) + '-subtitled.mp4', ctx.st.bi.cues.length + ' subtitles burnt in')];
          if (dt) nodes.push(U.note('This copy of ffmpeg has no libass, so the subtitles were drawn as plain centred text. ASS styling and italics are not shown.'));
          return nodes;
        }
      });
    }
  });
})();
