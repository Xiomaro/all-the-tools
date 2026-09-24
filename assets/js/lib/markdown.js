/* A compact CommonMark-flavoured renderer: headings, emphasis, code, links,
   images, lists, quotes, tables, rules and paragraphs. Raw HTML in the source
   is escaped rather than passed through, so output is always safe to inject. */
(function (global) {
  'use strict';

  var SAFE_URL = /^(?:https?:\/\/|mailto:|tel:|#|\/|\.{1,2}\/|[^:\s]+$)/i;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function safeUrl(url) {
    var u = String(url).trim();
    return SAFE_URL.test(u) ? escapeHtml(u) : '#';
  }

  /* --- inline ----------------------------------------------------------- */

  function inline(text) {
    var spans = [];
    var src = String(text).replace(/(`+)([\s\S]*?)\1/g, function (_, ticks, code) {
      spans.push('<code>' + escapeHtml(code.replace(/^ | $/g, '')) + '</code>');
      return '\u0000' + (spans.length - 1) + '\u0000';
    });

    src = escapeHtml(src);

    src = src.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, function (_, alt, url, title) {
      return '<img src="' + safeUrl(unescapeAttr(url)) + '" alt="' + alt + '"' +
             (title ? ' title="' + title + '"' : '') + '>';
    });

    src = src.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, function (_, label, url, title) {
      return '<a href="' + safeUrl(unescapeAttr(url)) + '"' + (title ? ' title="' + title + '"' : '') + '>' + label + '</a>';
    });

    src = src.replace(/&lt;((?:https?:\/\/|mailto:)[^\s&]+)&gt;/g, function (_, url) {
      return '<a href="' + safeUrl(url) + '">' + url + '</a>';
    });

    src = src.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
             .replace(/__([\s\S]+?)__/g, '<strong>$1</strong>')
             .replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
             .replace(/(^|[^_\w])_([^_\n]+?)_(?!_)/g, '$1<em>$2</em>')
             .replace(/~~([\s\S]+?)~~/g, '<del>$1</del>')
             .replace(/ {2,}\n/g, '<br>\n');

    return src.replace(/\u0000(\d+)\u0000/g, function (_, i) { return spans[+i]; });
  }

  function unescapeAttr(s) {
    return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
            .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }

  /* --- blocks ----------------------------------------------------------- */

  var BULLET = /^(\s*)([-*+])\s+(.*)$/;
  var ORDERED = /^(\s*)(\d+)[.)]\s+(.*)$/;

  function render(source) {
    var lines = String(source).replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
    return blocks(lines).trim();
  }

  function blocks(lines) {
    var html = '', i = 0;

    while (i < lines.length) {
      var line = lines[i];

      if (!line.trim()) { i++; continue; }

      var fence = line.match(/^\s*(`{3,}|~{3,})\s*([\w+-]*)\s*$/);
      if (fence) {
        var body = [];
        i++;
        while (i < lines.length && !new RegExp('^\\s*' + fence[1][0] + '{' + fence[1].length + ',}\\s*$').test(lines[i])) {
          body.push(lines[i]); i++;
        }
        i++;
        html += '<pre><code' + (fence[2] ? ' class="language-' + escapeHtml(fence[2]) + '"' : '') + '>' +
                escapeHtml(body.join('\n')) + '</code></pre>\n';
        continue;
      }

      var heading = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
      if (heading) {
        html += '<h' + heading[1].length + '>' + inline(heading[2]) + '</h' + heading[1].length + '>\n';
        i++; continue;
      }

      if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) { html += '<hr>\n'; i++; continue; }

      if (/^\s*>/.test(line)) {
        var quoted = [];
        while (i < lines.length && (/^\s*>/.test(lines[i]) || (quoted.length && lines[i].trim()))) {
          quoted.push(lines[i].replace(/^\s*>\s?/, '')); i++;
        }
        html += '<blockquote>\n' + blocks(quoted) + '</blockquote>\n';
        continue;
      }

      if (line.indexOf('|') > -1 && i + 1 < lines.length && /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[i + 1])
          && lines[i + 1].indexOf('-') > -1) {
        var head = splitRow(lines[i]);
        var aligns = splitRow(lines[i + 1]).map(function (c) {
          var l = c.indexOf(':') === 0, r = c.slice(-1) === ':';
          return l && r ? 'center' : r ? 'right' : l ? 'left' : '';
        });
        i += 2;
        var rows = [];
        while (i < lines.length && lines[i].trim() && lines[i].indexOf('|') > -1) { rows.push(splitRow(lines[i])); i++; }

        html += '<table>\n<thead><tr>' + head.map(function (c, n) {
          return '<th' + (aligns[n] ? ' style="text-align:' + aligns[n] + '"' : '') + '>' + inline(c) + '</th>';
        }).join('') + '</tr></thead>\n<tbody>\n' + rows.map(function (r) {
          return '<tr>' + head.map(function (_, n) {
            return '<td' + (aligns[n] ? ' style="text-align:' + aligns[n] + '"' : '') + '>' + inline(r[n] || '') + '</td>';
          }).join('') + '</tr>';
        }).join('\n') + '\n</tbody></table>\n';
        continue;
      }

      if (BULLET.test(line) || ORDERED.test(line)) {
        var listResult = takeList(lines, i);
        html += listResult.html;
        i = listResult.next;
        continue;
      }

      var para = [];
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) { para.push(lines[i]); i++; }
      if (para.length) html += '<p>' + inline(para.join('\n')) + '</p>\n';
      else i++;
    }
    return html;
  }

  function isBlockStart(line) {
    return /^\s*(#{1,6}\s|>|`{3,}|~{3,})/.test(line) ||
           /^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line) ||
           BULLET.test(line) || ORDERED.test(line);
  }

  function splitRow(line) {
    return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (c) { return c.trim(); });
  }

  /* Collects one list, recursing into items indented further than the first. */
  function takeList(lines, start) {
    var first = lines[start].match(BULLET) || lines[start].match(ORDERED);
    var ordered = !BULLET.test(lines[start]);
    var baseIndent = first[1].length;
    var items = [], i = start;

    while (i < lines.length) {
      var m = lines[i].match(BULLET) || lines[i].match(ORDERED);
      if (m && m[1].length <= baseIndent + 1) {
        if ((!BULLET.test(lines[i])) !== ordered) break;
        items.push([m[3]]);
        i++;
        continue;
      }
      if (!items.length) break;
      if (!lines[i].trim()) {
        if (i + 1 < lines.length && lines[i + 1].trim() && lines[i + 1].search(/\S/) > baseIndent) { items[items.length - 1].push(''); i++; continue; }
        break;
      }
      if (lines[i].search(/\S/) > baseIndent) { items[items.length - 1].push(lines[i].slice(baseIndent + 2)); i++; continue; }
      break;
    }

    var tag = ordered ? 'ol' : 'ul';
    var startAttr = ordered && first[2] !== '1' ? ' start="' + parseInt(first[2], 10) + '"' : '';
    var html = '<' + tag + startAttr + '>\n' + items.map(function (item) {
      var inner = item.length === 1 ? inline(item[0]) : blocks([item[0]].concat(item.slice(1)));
      return '<li>' + inner.replace(/^<p>([\s\S]*)<\/p>\n?$/, '$1').trim() + '</li>';
    }).join('\n') + '\n</' + tag + '>\n';

    return { html: html, next: i };
  }

  global.Markdown = { render: render, inline: inline, escapeHtml: escapeHtml };
})(window);
