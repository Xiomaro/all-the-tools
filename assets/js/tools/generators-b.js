/* generators-b tools: Identicon & Avatar Generator, Random Date & Time
   Generator, SVG Pattern & Background Generator, Username Generator. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  /* --- shared styling ----------------------------------------------------- */

  if (!document.getElementById('g-generators-b-style')) {
    document.head.appendChild(el('style', { id: 'g-generators-b-style', text: [
      '.g-genb .gb-muted { color: var(--fg-muted); font-size: 13px; }',
      '.g-genb .gb-stage { display: grid; place-items: center; padding: 16px; background: var(--bg-sunken); border: 1px solid var(--border); border-radius: var(--radius-s); }',
      '.g-genb .gb-avatar { width: 200px; height: 200px; max-width: 100%; display: block; }',
      '.g-genb .gb-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; }',
      '.g-genb .gb-tile { display: grid; justify-items: center; gap: 4px; padding: 8px 6px; border: 1px solid var(--border); border-radius: var(--radius-s); background: var(--bg-elev); color: var(--fg); font: inherit; font-size: 12px; cursor: pointer; }',
      '.g-genb .gb-tile:hover { border-color: var(--accent); }',
      '.g-genb .gb-tile.on { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent) inset; font-weight: 600; }',
      '.g-genb .gb-tile img { width: 64px; height: 64px; }',
      '.g-genb .gb-facts { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; align-items: baseline; font-size: 13px; }',
      '.g-genb .gb-facts code { font-family: var(--mono); word-break: break-all; }',
      '.g-genb .gb-grid { font-family: var(--mono); line-height: 1.1; letter-spacing: 2px; margin: 0; font-size: 16px; }',
      '.g-genb .gb-sw { display: inline-block; width: 14px; height: 14px; border-radius: 3px; border: 1px solid var(--border); vertical-align: -2px; margin-right: 6px; }',
      '.g-genb details pre { max-height: 220px; }',
      '.g-genb .gb-val { font-weight: 400; color: var(--fg); font-variant-numeric: tabular-nums; }',
      '.g-genb .gb-sliders { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px 16px; }',
      '.g-genb .gb-patterns { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 8px; }',
      '.g-genb .gb-patterns .gb-tile i { display: block; width: 100%; height: 54px; border-radius: 4px; border: 1px solid var(--border); }',
      '.g-genb .gb-preview { height: 320px; border: 1px solid var(--border); border-radius: var(--radius-s); background-color: var(--bg-sunken); }',
      '.g-genb .gb-names { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 6px; }',
      '.g-genb .gb-item { display: flex; align-items: center; gap: 8px; border: 1px solid var(--border); border-radius: var(--radius-s); padding: 6px 8px; background: var(--bg-elev); min-width: 0; }',
      '.g-genb .gb-item .gb-name { flex: 1; font-family: var(--mono); font-size: 14px; word-break: break-all; }',
      '.g-genb .gb-item .btn { padding: 4px 10px; }',
      '.g-genb .gb-dates { max-height: 420px; }'
    ].join('\n') }));
  }

  /* --- helpers ------------------------------------------------------------ */

  function ctl(node) {
    if (!node) return node;
    if (node.input) return node.input;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(node.tagName)) return node;
    return node.querySelector('input, select, textarea') || node;
  }
  function val(node) { return ctl(node).value; }
  function say(node, text, kind) { node.className = 'note' + (kind ? ' ' + kind : ''); node.textContent = text || ''; }
  function plural(n, word, many) { return n.toLocaleString('en-GB') + ' ' + (n === 1 ? word : (many || word + 's')); }
  function pad(n, w) { return String(n).padStart(w || 2, '0'); }
  function num(x) { return String(Math.round(x * 1000) / 1000); }
  function xmlEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* Uniform integers in [0, n) from crypto.getRandomValues, rejecting the
     top slice of the range so no value is favoured. Works up to 2^53. */
  function randBelow(n) {
    n = Math.floor(n);
    if (!(n > 1)) return 0;
    var buf = new Uint32Array(2), x, lim;
    if (n <= 4294967296) {
      lim = Math.floor(4294967296 / n) * n;
      do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= lim);
      return x % n;
    }
    lim = Math.floor(9007199254740992 / n) * n;
    do { crypto.getRandomValues(buf); x = (buf[0] & 0x1fffff) * 4294967296 + buf[1]; } while (x >= lim);
    return x % n;
  }
  function pick(a) { return a[randBelow(a.length)]; }

  function colourField(label, value, key) {
    var input = el('input', { type: 'color', value: value, 'aria-label': label, dataset: { k: key } });
    var wrap = el('div', { class: 'field' }, el('label', { text: label }), input);
    wrap.input = input;
    return wrap;
  }

  function rangeField(label, o, key) {
    var input = el('input', { type: 'range', min: o.min, max: o.max, step: o.step || 1, value: o.value, 'aria-label': label, dataset: { k: key } });
    var shown = el('span', { class: 'gb-val' });
    function upd() { shown.textContent = input.value + (o.unit || ''); }
    input.addEventListener('input', upd);
    upd();
    var wrap = el('div', { class: 'field' }, el('label', {}, label + ': ', shown), input);
    wrap.input = input;
    return wrap;
  }

  function svgUri(svg) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }

  function svgToPng(svg, size) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var c = el('canvas', { width: size, height: size });
        c.getContext('2d').drawImage(img, 0, 0, size, size);
        c.toBlob(function (b) { if (b) resolve(b); else reject(new Error('The browser could not make a PNG.')); }, 'image/png');
      };
      img.onerror = function () { reject(new Error('The browser could not draw the SVG.')); };
      img.src = svgUri(svg);
    });
  }

  /* ======================================================================= */
  /* Identicon & Avatar Generator                                             */
  /* ======================================================================= */

  function hexBytes(hex) {
    var out = [];
    for (var i = 0; i < hex.length; i += 2) out.push(parseInt(hex.substr(i, 2), 16));
    return out;
  }

  /* HSL -> RGB as CSS Color 3 defines it (and as the identicon reference
     implementation does it), rounded to whole channel values. */
  function hslRgb(h, s, l) {
    h = (((h % 360) + 360) % 360) / 360; s /= 100; l /= 100;
    var b = l <= 0.5 ? l * (s + 1) : l + s - l * s, a = l * 2 - b;
    function f(t) {
      if (t < 0) t += 1; else if (t > 1) t -= 1;
      if (t < 1 / 6) return a + (b - a) * 6 * t;
      if (t < 1 / 2) return b;
      if (t < 2 / 3) return a + (b - a) * (2 / 3 - t) * 6;
      return a;
    }
    return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(function (x) { return Math.round(x * 255); });
  }
  function rgbHex(rgb) { return '#' + rgb.map(function (n) { return pad(n.toString(16)); }).join(''); }
  function hslHex(h, s, l) { return rgbHex(hslRgb(h, s, l)); }
  function luminance(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [n >> 16, (n >> 8) & 255, n & 255].map(function (c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); })
      .reduce(function (sum, c, i) { return sum + c * [0.2126, 0.7152, 0.0722][i]; }, 0);
  }
  function contrast(a, b) { var x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

  /* GitHub's identicon, as ported in github.com/dgraham/identicon (MIT):
     take the MD5 of the text and walk its nibbles, high then low. Each even
     nibble paints a cell: the first five fill the middle column top to
     bottom, the next five the column beside it (mirrored on the far side),
     then the outer pair. The colour is an HSL made from the last 28 bits. */
  function githubCells(bytes) {
    var nibbles = [], cells = [], k = 0;
    bytes.forEach(function (b) { nibbles.push(b >> 4, b & 15); });
    for (var i = 0; i < 25; i++) cells.push(false);
    for (var col = 2; col >= 0; col--) {
      for (var row = 0; row < 5; row++) {
        var paint = nibbles[k++] % 2 === 0;
        cells[row * 5 + col] = paint;
        cells[row * 5 + 4 - col] = paint;
      }
    }
    return cells;
  }
  function githubColour(bytes) {
    var h = ((bytes[12] & 0x0f) << 8) | bytes[13];
    return hslHex(h * 360 / 4095, 65 - bytes[14] * 20 / 255, 75 - bytes[15] * 20 / 255);
  }

  function initialsOf(text, override) {
    var own = String(override || '').trim();
    if (own) return Array.from(own).slice(0, 3).join('').toLocaleUpperCase('en-GB');
    var t = String(text).trim();
    if (t.indexOf('@') > 0) t = t.slice(0, t.indexOf('@'));
    var words = t.split(/[\s._+\-]+/).map(function (w) { return w.replace(/^[^\p{L}\p{N}]+/u, ''); }).filter(function (w) { return w; });
    if (!words.length) return '?';
    var first = Array.from(words[0])[0], last = words.length > 1 ? Array.from(words[words.length - 1])[0] : '';
    return (first + last).toLocaleUpperCase('en-GB');
  }

  /* Wraps a style's drawing in an SVG with the chosen outline. The size sets
     the file's width and height; the viewBox keeps the drawing sharp. */
  function avatarSvg(view, body, o, crisp) {
    var clip = o.shape === 'circle' ? '<circle cx="' + num(view / 2) + '" cy="' + num(view / 2) + '" r="' + num(view / 2) + '"/>'
      : o.shape === 'rounded' ? '<rect width="' + view + '" height="' + view + '" rx="' + num(view * 0.16) + '"/>' : '';
    var inner = (o.bg ? '<rect width="' + view + '" height="' + view + '" fill="' + o.bg + '"/>' : '') + body;
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + o.size + '" height="' + o.size + '" viewBox="0 0 ' + view + ' ' + view + '"' +
      (crisp ? ' shape-rendering="crispEdges"' : '') + '>' +
      (clip ? '<defs><clipPath id="shape">' + clip + '</clipPath></defs><g clip-path="url(#shape)">' + inner + '</g>' : inner) + '</svg>';
  }

  /* Reads bits from a byte array, most significant first. */
  function bitReader(bytes, start) {
    var pos = start || 0;
    return function (n) {
      var v = 0;
      for (var i = 0; i < n; i++, pos++) v = (v << 1) | ((bytes[(pos >> 3) % bytes.length] >> (7 - (pos & 7))) & 1);
      return v;
    };
  }

  var AVATAR_STYLES = [
    { value: 'github', label: 'GitHub-style' },
    { value: 'initials', label: 'Initials' },
    { value: 'rings', label: 'Rings' },
    { value: 'creature', label: 'Pixel creature' }
  ];

  /* Every style returns { svg, hash, colour, extra }. o carries the text,
     size, shape, custom colours (or null for "from the hash") and whether
     the background is transparent. */
  function drawAvatar(style, o) {
    var md5 = Hash.md5(o.text), md5b = hexBytes(md5);
    var sha = Hash.sha256(o.text), shab = hexBytes(sha);
    var bgOf = function (auto) { return o.transparent ? '' : (o.custom ? o.bg : auto); };
    if (style === 'github') {
      var cells = githubCells(md5b), colour = o.custom ? o.fg : githubColour(md5b), rects = '';
      cells.forEach(function (on, i) {
        if (on) rects += '<rect x="' + (35 + (i % 5) * 70) + '" y="' + (35 + Math.floor(i / 5) * 70) + '" width="70" height="70"/>';
      });
      return {
        hash: md5, hashName: 'MD5', colour: colour, cells: cells,
        svg: avatarSvg(420, '<g fill="' + colour + '">' + rects + '</g>', { size: o.size, shape: o.shape, bg: bgOf('#f0f0f0') }, true)
      };
    }
    if (style === 'initials') {
      var hue = ((md5b[0] << 8) | md5b[1]) % 360;
      var back = o.custom ? o.bg : hslHex(hue, 50 + md5b[2] % 20, 38 + md5b[3] % 14);
      var ink = o.custom ? o.fg : (contrast(back, '#ffffff') >= contrast(back, '#1a1a1a') ? '#ffffff' : '#1a1a1a');
      var letters = initialsOf(o.text, o.initials), n = Array.from(letters).length;
      var size = n === 1 ? 52 : n === 2 ? 42 : 32;
      return {
        hash: md5, hashName: 'MD5', colour: back, letters: letters,
        svg: avatarSvg(100, '<text x="50" y="50" dy="0.35em" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" font-size="' +
          size + '" font-weight="600" fill="' + ink + '">' + xmlEsc(letters) + '</text>', { size: o.size, shape: o.shape, bg: o.transparent ? '' : back }, false)
      };
    }
    if (style === 'rings') {
      var h = ((shab[0] << 8) | shab[1]) % 360, bits = bitReader(shab, 16), body = '';
      var rings = [{ r0: 11, r1: 20, n: 6 }, { r0: 22, r1: 30, n: 8 }, { r0: 32, r1: 40, n: 12 }, { r0: 42, r1: 49, n: 16 }];
      var main = o.custom ? o.fg : hslHex(h, 62, 42);
      body += '<circle cx="50" cy="50" r="8" fill="' + main + '"/>';
      rings.forEach(function (ring, i) {
        var fill = o.custom ? o.fg : hslHex(h + i * 26, 62, 40 + i * 8), step = 360 / ring.n, turn = bits(4) / 16 * step, d = '';
        for (var s = 0; s < ring.n; s++) {
          if (!bits(1)) continue;
          d += sector(50, 50, ring.r0, ring.r1, turn + s * step + 1.2, turn + (s + 1) * step - 1.2);
        }
        if (d) body += '<path d="' + d + '" fill="' + fill + '"' + (o.custom ? ' fill-opacity="' + num(1 - i * 0.18) + '"' : '') + '/>';
      });
      return { hash: sha, hashName: 'SHA-256', colour: main, svg: avatarSvg(100, body, { size: o.size, shape: o.shape, bg: bgOf(hslHex(h, 30, 95)) }, false) };
    }
    /* Pixel creature: an 8 x 8 sprite mirrored down the middle, with eyes
       placed on a filled face so every text gets a readable little beast. */
    var hc = ((shab[0] << 8) | shab[1]) % 360, rd = bitReader(shab, 16), grid = [], r, c;
    var skin = o.custom ? o.fg : hslHex(hc, 58, 52), shade = o.custom ? o.fg : hslHex(hc, 58, 34);
    for (r = 0; r < 8; r++) {
      grid.push([]);
      for (c = 0; c < 4; c++) grid[r].push(rd(3) < (r === 0 || r === 7 ? 3 : c === 3 ? 6 : 5) ? (rd(3) === 0 ? 2 : 1) : 0);
    }
    var eyeRow = 2 + rd(1), eyeCol = 1 + rd(1);
    for (c = 0; c < 4; c++) { if (!grid[eyeRow][c]) grid[eyeRow][c] = 1; if (!grid[eyeRow + 1][c] && c > 0) grid[eyeRow + 1][c] = 1; }
    grid[eyeRow][eyeCol] = 3;
    var cellsSvg = '';
    for (r = 0; r < 8; r++) {
      for (c = 0; c < 8; c++) {
        var v = grid[r][c < 4 ? c : 7 - c];
        if (!v) continue;
        var x = 1 + c, y = 1 + r;
        if (v === 3) {
          cellsSvg += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="#ffffff"/>' +
            '<rect x="' + (c < 4 ? x + 0.5 : x) + '" y="' + (y + 0.4) + '" width="0.5" height="0.6" fill="#1b1b1b"/>';
        } else cellsSvg += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + (v === 2 ? shade : skin) + '"' + (o.custom && v === 2 ? ' fill-opacity="0.7"' : '') + '/>';
      }
    }
    return { hash: sha, hashName: 'SHA-256', colour: skin, svg: avatarSvg(10, cellsSvg, { size: o.size, shape: o.shape, bg: bgOf(hslHex(hc + 180, 40, 92)) }, true) };
  }

  function sector(cx, cy, r0, r1, a0, a1) {
    var large = a1 - a0 > 180 ? 1 : 0;
    function pt(r, a) { var t = a * Math.PI / 180; return num(cx + r * Math.sin(t)) + ' ' + num(cy - r * Math.cos(t)); }
    return 'M' + pt(r1, a0) + 'A' + r1 + ' ' + r1 + ' 0 ' + large + ' 1 ' + pt(r1, a1) + 'L' + pt(r0, a1) +
      'A' + r0 + ' ' + r0 + ' 0 ' + large + ' 0 ' + pt(r0, a0) + 'Z';
  }

  Tools.register({
    id: 'identicon-generator', category: 'generators', name: 'Identicon & Avatar Generator',
    description: 'Make the same avatar from the same text every time: a GitHub-style identicon, initials, rings or a pixel creature, as SVG or PNG.',
    keywords: ['identicon', 'avatar', 'profile picture', 'default avatar', 'gravatar', 'github identicon', 'initials avatar', 'placeholder avatar',
      'hash avatar', 'pixel art', 'generator', 'svg', 'png', 'deterministic', 'color', 'colour'],
    render: function (root) {
      root.classList.add('g-genb');
      var text = U.input({ label: 'Text (a name, email or username)', value: 'ada.lovelace@example.com', dataset: { k: 'text' } });
      var style = 'github';
      var size = U.input({ label: 'Size (px)', type: 'number', value: '256', min: '16', max: '2048', dataset: { k: 'size' } });
      var shape = U.chips([{ value: 'square', label: 'Square' }, { value: 'rounded', label: 'Rounded' }, { value: 'circle', label: 'Circle' }], function () { draw(); }, 'square');
      var auto = U.checkbox('Colours from the hash', { checked: true });
      var fg = colourField('Foreground', '#4f46e5', 'fg');
      var bg = colourField('Background', '#f0f0f0', 'bg');
      var transparent = U.checkbox('Transparent background');
      var initials = U.input({ label: 'Initials (optional)', maxLength: 3, placeholder: 'from the text', dataset: { k: 'initials' } });
      var colours = U.row(fg, bg);
      var preview = el('img', { class: 'gb-avatar', alt: 'Avatar preview', dataset: { k: 'avatar' } });
      var gallery = el('div', { class: 'gb-gallery' });
      var facts = el('div', { class: 'gb-facts' });
      var code = el('pre', { class: 'out', dataset: { k: 'svg' } });
      var status = U.note('');
      var current = null;

      function opts() {
        var px = Math.round(Number(val(size)));
        return {
          text: val(text), size: px >= 16 && px <= 2048 ? px : 256, shape: shape.value, custom: !auto.input.checked,
          fg: fg.input.value, bg: bg.input.value, transparent: transparent.input.checked, initials: val(initials)
        };
      }

      function draw() {
        var o = opts();
        colours.style.display = o.custom ? '' : 'none';
        initials.style.display = style === 'initials' ? '' : 'none';
        current = drawAvatar(style, o);
        preview.src = svgUri(current.svg);
        code.textContent = current.svg;
        var small = Object.assign({}, o, { size: 64 });
        gallery.replaceChildren.apply(gallery, AVATAR_STYLES.map(function (s) {
          return el('button', { type: 'button', class: 'gb-tile' + (s.value === style ? ' on' : ''), dataset: { style: s.value }, 'aria-pressed': String(s.value === style),
            onclick: function () { style = s.value; draw(); } },
          el('img', { src: svgUri(drawAvatar(s.value, small).svg), alt: '' }), s.label);
        }));
        var rows = [
          el('span', { class: 'gb-muted', text: current.hashName }), el('code', { dataset: { k: 'hash' }, text: current.hash }),
          el('span', { class: 'gb-muted', text: style === 'initials' ? 'Background' : 'Colour' }),
          el('span', {}, el('i', { class: 'gb-sw', style: { background: current.colour } }), el('code', { dataset: { k: 'colour' }, text: current.colour }))
        ];
        if (current.cells) {
          var lines = [], bits = [];
          for (var r = 0; r < 5; r++) {
            var row = current.cells.slice(r * 5, r * 5 + 5);
            lines.push(row.map(function (x) { return x ? '■' : '□'; }).join(' '));
            bits.push(row.map(function (x) { return x ? '1' : '0'; }).join(''));
          }
          rows.push(el('span', { class: 'gb-muted', text: 'Pattern' }), el('pre', { class: 'gb-grid', dataset: { k: 'grid', pattern: bits.join('/') }, text: lines.join('\n') }));
        }
        if (current.letters) rows.push(el('span', { class: 'gb-muted', text: 'Initials' }), el('code', { dataset: { k: 'letters' }, text: current.letters }));
        facts.replaceChildren.apply(facts, rows);
        say(status, '');
      }
      U.live([text, size, auto, fg, bg, transparent, initials], draw);

      function fileBase() { return (val(text).trim().replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'avatar') + '-' + style; }

      root.appendChild(U.panel(null, text, el('div', { style: { marginTop: '12px' } }, gallery)));
      root.appendChild(U.split(
        U.panel('Avatar', el('div', { class: 'gb-stage' }, preview), el('div', { style: { marginTop: '12px' } }, facts), status,
          U.btnrow(
            U.button('Download SVG', function () { if (current) U.saveText(fileBase() + '.svg', current.svg, 'image/svg+xml'); }, 'primary'),
            U.button('Download PNG', function () {
              if (!current) return;
              var px = opts().size;
              svgToPng(current.svg, px).then(function (blob) { U.saveBlob(fileBase() + '-' + px + '.png', blob); })
                .catch(function (err) { say(status, err.message, 'err'); });
            }),
            U.copyBtn('Copy SVG', function () { return current ? current.svg : ''; }))),
        U.panel('Options', size, el('div', { class: 'field', style: { marginTop: '10px' } }, el('label', { text: 'Shape' }), shape),
          el('div', { class: 'stack', style: { marginTop: '10px' } }, auto, colours, transparent, initials),
          el('p', { class: 'gb-muted', text: 'The same text always gives the same picture. GitHub-style and initials use the MD5 of the text (as GitHub and Gravatar do); rings and the creature use SHA-256. Nothing leaves the browser.' }))));
      root.appendChild(U.panel(null, el('details', {}, el('summary', { text: 'SVG code' }), code)));
    }
  });

  /* ======================================================================= */
  /* Random Date & Time Generator                                             */
  /* ======================================================================= */

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DAY_MS = 86400000;

  function ordinal(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

  function partsOf(ms, utc) {
    var d = new Date(ms);
    return utc
      ? { Y: d.getUTCFullYear(), M: d.getUTCMonth() + 1, D: d.getUTCDate(), h: d.getUTCHours(), m: d.getUTCMinutes(), s: d.getUTCSeconds(), dow: d.getUTCDay(), off: 0 }
      : { Y: d.getFullYear(), M: d.getMonth() + 1, D: d.getDate(), h: d.getHours(), m: d.getMinutes(), s: d.getSeconds(), dow: d.getDay(), off: -d.getTimezoneOffset() };
  }
  function offsetText(min) { var a = Math.abs(min); return (min < 0 ? '-' : '+') + pad(Math.floor(a / 60)) + ':' + pad(a % 60); }

  var TOKENS = /\[([^\]]*)\]|YYYY|YY|MMMM|MMM|MM|M|Do|DD|D|dddd|ddd|HH|H|hh|h|mm|m|ss|s|A|a|Z|X|x/g;

  function customFormat(p, ms, pattern, utc) {
    return pattern.replace(TOKENS, function (t, lit) {
      if (lit !== undefined) return lit;
      var h12 = p.h % 12 || 12;
      switch (t) {
        case 'YYYY': return pad(p.Y, 4);
        case 'YY': return pad(p.Y % 100);
        case 'MMMM': return MONTHS[p.M - 1];
        case 'MMM': return MONTHS[p.M - 1].slice(0, 3);
        case 'MM': return pad(p.M);
        case 'M': return String(p.M);
        case 'Do': return ordinal(p.D);
        case 'DD': return pad(p.D);
        case 'D': return String(p.D);
        case 'dddd': return DAYS[p.dow];
        case 'ddd': return DAYS[p.dow].slice(0, 3);
        case 'HH': return pad(p.h);
        case 'H': return String(p.h);
        case 'hh': return pad(h12);
        case 'h': return String(h12);
        case 'mm': return pad(p.m);
        case 'm': return String(p.m);
        case 'ss': return pad(p.s);
        case 's': return String(p.s);
        case 'A': return p.h < 12 ? 'AM' : 'PM';
        case 'a': return p.h < 12 ? 'am' : 'pm';
        case 'Z': return utc ? '+00:00' : offsetText(p.off);
        case 'X': return String(Math.floor(ms / 1000));
        case 'x': return String(ms);
      }
      return t;
    });
  }

  function formatDate(ms, fmt, o) {
    var p = partsOf(ms, o.utc);
    var date = pad(p.Y, 4) + '-' + pad(p.M) + '-' + pad(p.D);
    var hm = pad(p.h) + ':' + pad(p.m) + (o.secs ? ':' + pad(p.s) : '');
    switch (fmt) {
      case 'iso': return o.time ? date + 'T' + pad(p.h) + ':' + pad(p.m) + ':' + pad(p.s) + (o.utc ? 'Z' : offsetText(p.off)) : date;
      case 'uk': return pad(p.D) + '/' + pad(p.M) + '/' + pad(p.Y, 4) + (o.time ? ' ' + hm : '');
      case 'long': return DAYS[p.dow] + ' ' + p.D + ' ' + MONTHS[p.M - 1] + ' ' + p.Y + (o.time ? ', ' + hm : '');
      case 'unix': return String(Math.floor(ms / 1000));
      case 'unixms': return String(ms);
      default: return customFormat(p, ms, o.pattern || 'YYYY-MM-DD', o.utc);
    }
  }

  /* "2024-03-05T14:07:09" or "2024-03-05" -> calendar day number (days since
     1970-01-01) plus seconds after midnight. */
  function readStamp(s) {
    var m = /^(\d{4,6})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(String(s || ''));
    if (!m) return null;
    var t = Date.UTC(2000, +m[2] - 1, +m[3]);
    var d = new Date(t);
    d.setUTCFullYear(+m[1]);
    return { day: Math.round(d.getTime() / DAY_MS), sec: +(m[4] || 0) * 3600 + +(m[5] || 0) * 60 + +(m[6] || 0) };
  }
  function readTime(s) {
    var m = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(s || ''));
    return m ? +m[1] * 3600 + +m[2] * 60 + +(m[3] || 0) : null;
  }

  /* The instant for a calendar day and seconds after midnight, read as wall
     clock time in UTC or in this device's zone. */
  function instant(day, sec, utc) {
    var d = new Date(day * DAY_MS);
    if (utc) return day * DAY_MS + sec * 1000;
    var local = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, sec);
    if (d.getUTCFullYear() < 100) local.setFullYear(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return local.getTime();
  }

  /* Allowed seconds-of-day segments for one day, snapped to the precision. */
  function segments(day, rule) {
    var dow = ((day % 7) + 11) % 7;
    if (rule.weekdays && (dow === 0 || dow === 6)) return [];
    if (!rule.time) return [[0, 0]];
    var win = rule.window ? (rule.w0 <= rule.w1 ? [[rule.w0, rule.w1]] : [[rule.w0, 86399], [0, rule.w1]]) : [[0, 86399]];
    var out = [];
    win.forEach(function (w) {
      var a = w[0], b = w[1];
      if (day === rule.from.day) a = Math.max(a, rule.from.sec);
      if (day === rule.to.day) b = Math.min(b, rule.to.sec);
      a = Math.ceil(a / rule.unit) * rule.unit;
      b = Math.floor(b / rule.unit) * rule.unit;
      if (b >= a) out.push([a, b]);
    });
    return out;
  }
  function segCount(segs, unit) { return segs.reduce(function (n, s) { return n + (s[1] - s[0]) / unit + 1; }, 0); }

  /* Draw `count` instants uniformly from every allowed slot in the range. */
  function randomDates(rule, count, unique) {
    var days = rule.to.day - rule.from.day + 1;
    if (days < 1) throw new Error('The end is before the start.');
    if (days > 400000) throw new Error('Keep the range under about 1,000 years.');
    var prefix = new Float64Array(days), total = 0;
    for (var i = 0; i < days; i++) { total += segCount(segments(rule.from.day + i, rule), rule.unit); prefix[i] = total; }
    if (!total) throw new Error(rule.weekdays ? 'No weekday falls in that range (with that time window).' : 'Nothing falls in that range (with that time window).');
    if (unique && count > total) throw new Error('Only ' + total.toLocaleString('en-GB') + ' different ' + (rule.time ? 'times' : 'dates') + ' fit these settings. Ask for fewer, widen the range, or allow duplicates.');
    var picks = [];
    if (unique && total <= 2000000 && count > total / 3) {
      var all = new Float64Array(total);
      for (var k = 0; k < total; k++) all[k] = k;
      for (var j = 0; j < count; j++) { var r = j + randBelow(total - j), t = all[j]; all[j] = all[r]; all[r] = t; picks.push(all[j]); }
    } else if (unique) {
      var seen = new Set();
      while (picks.length < count) { var x = randBelow(total); if (!seen.has(x)) { seen.add(x); picks.push(x); } }
    } else {
      for (var q = 0; q < count; q++) picks.push(randBelow(total));
    }
    return picks.map(function (idx) {
      var lo = 0, hi = days - 1;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (prefix[mid] > idx) hi = mid; else lo = mid + 1; }
      var within = idx - (lo ? prefix[lo - 1] : 0), day = rule.from.day + lo, segs = segments(day, rule), sec = 0;
      for (var s = 0; s < segs.length; s++) {
        var n = (segs[s][1] - segs[s][0]) / rule.unit + 1;
        if (within < n) { sec = segs[s][0] + within * rule.unit; break; }
        within -= n;
      }
      return instant(day, sec, rule.utc);
    });
  }

  Tools.register({
    id: 'random-date', category: 'generators', name: 'Random Date & Time Generator',
    description: 'Pick random dates or times between two moments, with weekdays only, a time-of-day window, no repeats and the format you need.',
    keywords: ['random date', 'random time', 'random datetime', 'date generator', 'test data', 'timestamp', 'unix time', 'iso 8601',
      'weekday', 'business hours', 'fake dates', 'sample dates', 'dd/mm/yyyy', 'csv', 'json'],
    render: function (root) {
      root.classList.add('g-genb');
      var from = U.input({ label: 'From', type: 'datetime-local', step: '1', value: '2024-01-01T00:00:00', dataset: { k: 'from' } });
      var to = U.input({ label: 'To', type: 'datetime-local', step: '1', value: '2024-12-31T23:59:59', dataset: { k: 'to' } });
      var zone = U.chips([{ value: 'local', label: 'Local time' }, { value: 'utc', label: 'UTC' }], function () { gen(); }, 'local');
      var count = U.input({ label: 'How many', type: 'number', value: '10', min: '1', max: '50000', dataset: { k: 'count' } });
      var withTime = U.checkbox('Include a time', { checked: true });
      var withSecs = U.checkbox('Include seconds');
      var unique = U.checkbox('No duplicates', { checked: true });
      var weekdays = U.checkbox('Weekdays only (Monday to Friday)');
      var windowOn = U.checkbox('Only between these times of day');
      var w0 = U.input({ label: 'From time', type: 'time', value: '09:00', dataset: { k: 'w0' } });
      var w1 = U.input({ label: 'To time', type: 'time', value: '17:00', dataset: { k: 'w1' } });
      var order = U.select({ label: 'Order', options: [{ value: 'asc', label: 'Earliest first' }, { value: 'desc', label: 'Latest first' }, { value: 'none', label: 'As drawn (random)' }], value: 'asc' });
      var format = U.select({ label: 'Format', options: [
        { value: 'iso', label: 'ISO 8601 (2024-03-05T14:07:00Z)' }, { value: 'uk', label: 'dd/mm/yyyy (05/03/2024 14:07)' },
        { value: 'long', label: 'Long (Tuesday 5 March 2024, 14:07)' }, { value: 'unix', label: 'Unix time (seconds)' },
        { value: 'unixms', label: 'Unix time (milliseconds)' }, { value: 'custom', label: 'Custom pattern' }], value: 'iso' });
      var pattern = U.input({ label: 'Pattern', value: 'dddd Do MMMM YYYY [at] HH:mm',
        hint: 'YYYY YY · MMMM MMM MM M · DD D Do · dddd ddd · HH H (24-hour) · hh h A (12-hour) · mm ss · Z offset · X Unix · [text] stays as written' });
      var windowRow = U.row(w0, w1);
      var out = el('pre', { class: 'out gb-dates', dataset: { k: 'dates' } });
      var status = U.note('');
      var statsBox = el('div');
      var results = [], lastOpts = null;

      function toggle() {
        var t = withTime.input.checked;
        [from, to].forEach(function (f, i) {
          var input = ctl(f), v = input.value;
          if (t && input.type !== 'datetime-local') { input.type = 'datetime-local'; input.value = v ? v.slice(0, 10) + (i ? 'T23:59:59' : 'T00:00:00') : ''; }
          else if (!t && input.type !== 'date') { input.type = 'date'; input.value = v ? v.slice(0, 10) : ''; }
        });
        withSecs.style.display = windowOn.style.display = t ? '' : 'none';
        windowRow.style.display = t && windowOn.input.checked ? '' : 'none';
        pattern.style.display = val(format) === 'custom' ? '' : 'none';
      }

      function gen() {
        toggle();
        results = [];
        var utc = zone.value === 'utc', time = withTime.input.checked, secs = time && withSecs.input.checked;
        var a = readStamp(val(from)), b = readStamp(val(to));
        var n = Math.floor(Number(val(count)));
        try {
          if (!a || !b) throw new Error('Enter a start and an end.');
          if (!(n >= 1 && n <= 50000)) throw new Error('Ask for between 1 and 50,000.');
          if (b.day < a.day || (b.day === a.day && time && b.sec < a.sec)) { var sw = a; a = b; b = sw; }
          var rule = {
            from: a, to: b, utc: utc, time: time, unit: time ? (secs ? 1 : 60) : 86400, weekdays: weekdays.input.checked,
            window: time && windowOn.input.checked, w0: readTime(val(w0)) || 0, w1: readTime(val(w1)) === null ? 86399 : readTime(val(w1))
          };
          var ms = randomDates(rule, n, unique.input.checked);
          if (val(order) === 'asc') ms.sort(function (x, y) { return x - y; });
          else if (val(order) === 'desc') ms.sort(function (x, y) { return y - x; });
          lastOpts = { utc: utc, time: time, secs: secs, pattern: val(pattern) };
          results = ms;
          out.textContent = ms.map(function (x) { return formatDate(x, val(format), lastOpts); }).join('\n');
          var sorted = ms.slice().sort(function (x, y) { return x - y; }), iso = function (x) { return formatDate(x, 'iso', lastOpts); };
          statsBox.replaceChildren(U.stats([
            { label: 'Dates', value: ms.length.toLocaleString('en-GB') },
            { label: 'Earliest', value: iso(sorted[0]) },
            { label: 'Latest', value: iso(sorted[sorted.length - 1]) }
          ]));
          say(status, (utc ? 'Times are in UTC.' : 'Times are in this device\'s time zone (' + (Intl.DateTimeFormat().resolvedOptions().timeZone || 'local') + ').') +
            ' Drawn with crypto.getRandomValues, evenly across every allowed ' + (time ? (secs ? 'second' : 'minute') : 'day') + '.', 'ok');
        } catch (err) {
          out.textContent = '';
          statsBox.replaceChildren();
          say(status, err.message, 'err');
        }
      }

      function rows() {
        return results.map(function (x) {
          return { iso: formatDate(x, 'iso', lastOpts), formatted: formatDate(x, val(format), lastOpts), unix: Math.floor(x / 1000), weekday: DAYS[partsOf(x, lastOpts.utc).dow] };
        });
      }

      U.live([from, to, count, withTime, withSecs, unique, weekdays, windowOn, w0, w1, order, format, pattern], gen);

      root.appendChild(U.panel('Range', U.row(from, to), el('div', { class: 'field', style: { marginTop: '10px' } }, el('label', { text: 'Time zone' }), zone),
        el('div', { class: 'row', style: { marginTop: '10px' } }, withTime, withSecs, weekdays, windowOn), windowRow));
      root.appendChild(U.panel('Output', U.row(count, order, format), pattern,
        el('div', { class: 'row', style: { margin: '10px 0' } }, unique, U.button('Generate again', gen, 'primary')),
        status, statsBox, el('div', { style: { marginTop: '10px' } }, out),
        U.btnrow(
          U.copyBtn('Copy', function () { return out.textContent; }),
          U.downloadBtn('Download CSV', 'random-dates.csv', function () {
            if (!results.length) return '';
            return CSV.stringify([['iso', 'formatted', 'unix', 'weekday']].concat(rows().map(function (r) { return [r.iso, r.formatted, r.unix, r.weekday]; })), ',', '\r\n') + '\r\n';
          }, 'text/csv'),
          U.downloadBtn('Download JSON', 'random-dates.json', function () { return results.length ? JSON.stringify(rows(), null, 2) : ''; }, 'application/json'))));
    }
  });

  /* ======================================================================= */
  /* SVG Pattern & Background Generator                                       */
  /* ======================================================================= */

  var PATTERNS = [
    { id: 'dots', name: 'Dots' }, { id: 'grid', name: 'Grid' }, { id: 'stripes', name: 'Stripes' },
    { id: 'diagonal', name: 'Diagonal stripes' }, { id: 'checkerboard', name: 'Checkerboard' }, { id: 'zigzag', name: 'Zigzag' },
    { id: 'waves', name: 'Waves' }, { id: 'triangles', name: 'Triangles' }, { id: 'hexagons', name: 'Hexagons' },
    { id: 'crosses', name: 'Crosses' }, { id: 'circles', name: 'Circles' }
  ];

  /* One tile of each pattern at scale s (px) and line width / dot size t.
     Lines that cross the tile edge are drawn a period beyond it on both
     sides, so joins at the seams are real joins, not two cut ends. */
  function patternTile(id, s, t, fg) {
    var line = ' fill="none" stroke="' + fg + '" stroke-width="' + num(t) + '"';
    var h;
    switch (id) {
      case 'dots': return { w: s, h: s, body: '<circle cx="' + num(s / 2) + '" cy="' + num(s / 2) + '" r="' + num(t) + '" fill="' + fg + '"/>' };
      case 'grid': return { w: s, h: s, body: '<path d="M0 ' + num(s / 2) + 'H' + num(s) + 'M' + num(s / 2) + ' 0V' + num(s) + '"' + line + '/>' };
      case 'stripes':
      case 'diagonal': return { w: s, h: s, body: '<rect width="' + num(s) + '" height="' + num(t) + '" fill="' + fg + '"/>' };
      case 'checkerboard': return { w: 2 * s, h: 2 * s, body: '<path d="M0 0H' + num(s) + 'V' + num(s) + 'H0ZM' + num(s) + ' ' + num(s) + 'H' + num(2 * s) + 'V' + num(2 * s) + 'H' + num(s) + 'Z" fill="' + fg + '"/>' };
      case 'zigzag':
        h = s / 2;
        return { w: s, h: h, body: '<polyline points="' + [[-s / 2, h / 4], [0, h * 3 / 4], [s / 2, h / 4], [s, h * 3 / 4], [s * 3 / 2, h / 4]].map(function (p) { return num(p[0]) + ',' + num(p[1]); }).join(' ') + '"' + line + '/>' };
      case 'waves':
        h = s / 2;
        return { w: s, h: h, body: '<path d="M' + num(-s) + ' ' + num(h / 2) + 'Q' + num(-s * 3 / 4) + ' 0 ' + num(-s / 2) + ' ' + num(h / 2) +
          [0, 0.5, 1, 1.5, 2].map(function (k) { return 'T' + num(k * s) + ' ' + num(h / 2); }).join('') + '"' + line + '/>' };
      case 'triangles':
        h = s * Math.sqrt(3) / 2;
        return { w: s, h: h, body: '<path d="M0 ' + num(h) + 'L' + num(s / 2) + ' 0L' + num(s) + ' ' + num(h) + 'Z" fill="' + fg + '"/>' };
      case 'hexagons':
        /* Pointy-topped honeycomb: tile width s is the hexagon's width, the
           side is s / sqrt(3), and the tile is three sides tall. */
        var r = s / Math.sqrt(3);
        return { w: s, h: 3 * r, body: '<path d="M' + num(s / 2) + ' 0L' + num(s) + ' ' + num(r / 2) + 'V' + num(r * 3 / 2) + 'L' + num(s / 2) + ' ' + num(2 * r) +
          'L0 ' + num(r * 3 / 2) + 'V' + num(r / 2) + 'ZM' + num(s / 2) + ' ' + num(2 * r) + 'V' + num(3 * r) + '"' + line + '/>' };
      case 'crosses':
        var a = s / 4;
        return { w: s, h: s, body: '<path d="M' + num(s / 2 - a) + ' ' + num(s / 2) + 'H' + num(s / 2 + a) + 'M' + num(s / 2) + ' ' + num(s / 2 - a) + 'V' + num(s / 2 + a) + '"' + line + '/>' };
      default:
        return { w: s, h: s, body: '<circle cx="' + num(s / 2) + '" cy="' + num(s / 2) + '" r="' + num(Math.max(0.5, s * 0.35)) + '"' + line + '/>' };
    }
  }

  /* size null -> width/height 100% with no viewBox: as a CSS background an
     SVG without its own size fills the element, so the pattern repeats
     seamlessly at any rotation. */
  function patternSvg(o, size) {
    var t = patternTile(o.id, o.scale, o.stroke, o.fg);
    var rot = ((o.rotation + (o.id === 'diagonal' ? 45 : 0)) % 360 + 360) % 360;
    var dims = size ? ' width="' + size.w + '" height="' + size.h + '" viewBox="0 0 ' + size.w + ' ' + size.h + '"' : ' width="100%" height="100%"';
    return '<svg xmlns="http://www.w3.org/2000/svg"' + dims + '><defs><pattern id="p" patternUnits="userSpaceOnUse" width="' + num(t.w) + '" height="' + num(t.h) + '"' +
      (rot ? ' patternTransform="rotate(' + num(rot) + ')"' : '') + '>' + t.body + '</pattern></defs>' +
      (o.transparent ? '' : '<rect width="100%" height="100%" fill="' + o.bg + '"/>') +
      '<rect width="100%" height="100%" fill="url(#p)"' + (o.opacity < 1 ? ' opacity="' + num(o.opacity) + '"' : '') + '/></svg>';
  }

  /* The short, readable data URI form: single quotes, and only the
     characters that need it percent-encoded. */
  function cssDataUri(svg) {
    return 'data:image/svg+xml,' + svg.replace(/"/g, "'").replace(/[\r\n%#()<>?\[\\\]^`{|}]/g, encodeURIComponent);
  }

  Tools.register({
    id: 'svg-pattern', category: 'generators', name: 'SVG Pattern & Background Generator',
    description: 'Design repeating SVG backgrounds (dots, grids, stripes, waves, hexagons and more) and copy them as CSS or download the SVG.',
    keywords: ['svg pattern', 'background pattern', 'css background', 'seamless pattern', 'tile', 'repeating background', 'data uri',
      'dots', 'stripes', 'checkerboard', 'hexagon', 'honeycomb', 'waves', 'zigzag', 'hero patterns', 'wallpaper', 'color', 'colour'],
    render: function (root) {
      root.classList.add('g-genb');
      var current = 'dots';
      var fg = colourField('Pattern colour', '#4f46e5', 'fg');
      var bg = colourField('Background', '#eef0f7', 'bg');
      var transparent = U.checkbox('Transparent background');
      var scale = rangeField('Scale', { min: 4, max: 160, value: 24, unit: ' px' }, 'scale');
      var stroke = rangeField('Line width / dot size', { min: 0.5, max: 40, step: 0.5, value: 2, unit: ' px' }, 'stroke');
      var rotation = rangeField('Rotation', { min: 0, max: 359, value: 0, unit: '°' }, 'rotation');
      var opacity = rangeField('Opacity', { min: 5, max: 100, value: 100, unit: '%' }, 'opacity');
      var width = U.input({ label: 'Download width (px)', type: 'number', value: '1200', min: '1', max: '10000', dataset: { k: 'width' } });
      var height = U.input({ label: 'Download height (px)', type: 'number', value: '800', min: '1', max: '10000', dataset: { k: 'height' } });
      var gallery = el('div', { class: 'gb-patterns' });
      var preview = el('div', { class: 'gb-preview', dataset: { k: 'preview' }, role: 'img', 'aria-label': 'Pattern preview' });
      var svgOut = el('pre', { class: 'out', dataset: { k: 'svg' } });
      var cssOut = el('pre', { class: 'out', dataset: { k: 'css' } });

      function opts(id) {
        return {
          id: id || current, fg: fg.input.value, bg: bg.input.value, transparent: transparent.input.checked,
          scale: Number(scale.input.value), stroke: Number(stroke.input.value), rotation: Number(rotation.input.value), opacity: Number(opacity.input.value) / 100
        };
      }
      function size() {
        var w = Math.round(Number(val(width))), h = Math.round(Number(val(height)));
        return { w: w >= 1 && w <= 10000 ? w : 1200, h: h >= 1 && h <= 10000 ? h : 800 };
      }
      function css() { return 'background-image: url("' + cssDataUri(patternSvg(opts(), null)) + '");'; }

      function draw() {
        var o = opts();
        preview.style.backgroundImage = 'url("' + cssDataUri(patternSvg(o, null)) + '")';
        svgOut.textContent = patternSvg(o, size());
        cssOut.textContent = css();
        gallery.replaceChildren.apply(gallery, PATTERNS.map(function (p) {
          var swatch = el('i');
          swatch.style.backgroundImage = 'url("' + cssDataUri(patternSvg(opts(p.id), null)) + '")';
          return el('button', { type: 'button', class: 'gb-tile' + (p.id === current ? ' on' : ''), dataset: { pattern: p.id }, 'aria-pressed': String(p.id === current),
            onclick: function () { current = p.id; draw(); } }, swatch, p.name);
        }));
      }
      U.live([fg, bg, transparent, scale, stroke, rotation, opacity, width, height], draw);

      root.appendChild(U.panel('Pattern', gallery));
      root.appendChild(U.split(
        U.panel('Preview', preview),
        U.panel('Settings', U.row(fg, bg), el('div', { style: { margin: '8px 0 12px' } }, transparent),
          el('div', { class: 'gb-sliders' }, scale, stroke, rotation, opacity))));
      root.appendChild(U.panel('CSS', cssOut, U.btnrow(
        U.copyBtn('Copy CSS', css),
        U.copyBtn('Copy data URI', function () { return cssDataUri(patternSvg(opts(), null)); })),
        el('p', { class: 'gb-muted', text: 'The SVG has no fixed size, so as a background it fills the element and the pattern repeats seamlessly at any angle.' })));
      root.appendChild(U.panel('SVG file', U.row(width, height), el('div', { style: { marginTop: '10px' } }, svgOut), U.btnrow(
        U.button('Download SVG', function () { U.saveText('pattern-' + current + '.svg', patternSvg(opts(), size()), 'image/svg+xml'); }, 'primary'),
        U.copyBtn('Copy SVG', function () { return patternSvg(opts(), size()); }))));
    }
  });

  /* ======================================================================= */
  /* Username Generator                                                       */
  /* ======================================================================= */

  var ADJECTIVES = ('amber ancient arctic azure bold brave breezy bright brisk calm candid clever cobalt copper cosmic crimson crisp curious ' +
    'daring dapper dazzling eager electric emerald epic fearless fiery frosty gallant gentle gleaming golden graceful happy hardy hidden ' +
    'humble icy jade jolly jovial keen kind lively lofty loyal lucky lunar magic majestic mellow merry mighty misty mossy nifty nimble ' +
    'noble plucky polar proud quick quiet radiant rapid rosy royal ruby rustic sandy scarlet serene shiny silent silver sleek snowy solar ' +
    'sonic speedy spry stellar stormy sturdy sunny swift tidy turbo velvet vivid wild wise witty zesty').split(' ');
  var NOUNS = ('badger beacon bear beetle bison bramble breeze buzzard canyon comet compass cormorant crane cricket dolphin dragon eagle ' +
    'ember falcon ferret finch fox gannet glacier griffin harbour hare hawk hedgehog heron island jackdaw kestrel kingfisher koala lantern ' +
    'lark lynx magpie maple marten meadow meteor mole moon moth nebula newt nomad oak ocean orca osprey otter owl panda panther pebble ' +
    'pelican penguin phoenix pilot pine planet puffin quasar raven river robin rocket rover sailor salmon scout seal shark sparrow sprite ' +
    'squirrel stag starling stoat storm swallow swan thistle thunder tiger voyager walrus weasel whale willow wizard wolf wren yeti zephyr').split(' ');
  var GAMER_PRE = ('alpha apex astral blaze chaos crimson cyber dark ember frost ghost hyper iron lunar mega neon night nova omega onyx ' +
    'phantom pixel rapid rogue shadow silent solar steel storm thunder toxic turbo ultra venom void zero').split(' ');
  var GAMER_CORE = ('archer bandit blade bolt byte claw comet dragon falcon fang fury glitch havoc hawk hunter knight legend lynx mage ' +
    'maverick ninja nomad panther phoenix pilot raider ranger raptor reaper rider ronin sabre samurai sentinel sniper spectre striker titan ' +
    'tracker viper warden warrior wolf wraith').split(' ');
  var GAMER_SUF = 'pro gg plays games hq x'.split(' ');
  var FANTASY_START = 'ael ar bel bra cal cyr dor el eld fae gal hal il kor lor mor nym or pyr quel ryn syl thal tor ul val wyn xan yr zar'.split(' ');
  var FANTASY_MID = ['a', 'ae', 'an', 'ar', 'e', 'el', 'en', 'i', 'ia', 'ith', 'o', 'or', 'u', 'y', '', ''];
  var FANTASY_END = 'dor dris gard grim ion las lyn mar mir nor rin riel ros thar thas vain ven wen wyn dil'.split(' ');
  var FANTASY_TITLE = ('stormborn nightwhisper ironheart silverleaf ashwalker moonsong starweaver frostbane dawnbringer emberfall ' +
    'ravenwing thornfield brightblade shadowmere wildrunner stonehelm mistvale goldmane oakenshade windrider').split(' ');
  var CUTE_ADJ = ('bouncy bubbly cheeky comfy cosy cuddly dainty dreamy fluffy fuzzy giggly honey jelly lovely minty peachy puffy rosy ' +
    'snuggly sparkly sugary sunny sweet teeny tiny twinkly velvety wiggly zippy').split(' ');
  var CUTE_NOUN = ('bean berry blossom bubble bunny button cherry cloud clover cookie crumpet cupcake daisy dumpling duckling fawn hamster ' +
    'kitten koala lamb marshmallow mochi muffin noodle pancake panda peach pebble penguin piglet pudding puppy scone sprinkle sprout star ' +
    'teacup toffee waffle').split(' ');

  /* Words that make a name unusable. Stored in ROT13 so the source reads
     cleanly; decoded once. The first list blocks a name containing the word
     anywhere; the second only when a part of the name is exactly that word
     (so "class", "grape" and "Essex" survive). */
  function rot13(s) { return s.replace(/[a-z]/g, function (c) { return String.fromCharCode((c.charCodeAt(0) - 84) % 26 + 97); }); }
  var BAD_ANYWHERE = ('shpx fuvg phag ovgpu onfgneq jnax gjng obyybpx avttre avttn fyhg juber anmv uvgyre cbea qvyqb cravf intvan obbo ' +
    'encvfg cnrqb ergneq fcnfgvp wvmm pbpxfhpx nffubyr nefrubyr qvpxurnq oryyraq gbffre').split(' ').map(rot13);
  var BAD_WHOLE = ('nff nefr pbpx qvpx snt encr gvg gvgf phz frk nany cvff penc ubr xxx ohz cevpx xabo fynt chffl cbbc gheq abo gjvg ' +
    'fcnm crqb funt xvyy zheqre fhvpvqr').split(' ').map(rot13);

  function unleet(s) {
    return String(s).toLowerCase().replace(/[4@]/g, 'a').replace(/3/g, 'e').replace(/[1!]/g, 'i').replace(/0/g, 'o').replace(/[5$]/g, 's').replace(/7/g, 't');
  }
  function lettersOnly(s) { return unleet(s).replace(/[^a-z]/g, ''); }

  function isRude(name, parts) {
    var flat = lettersOnly(name);
    if (BAD_ANYWHERE.some(function (w) { return flat.indexOf(w) > -1; })) return true;
    return parts.some(function (p) { return BAD_WHOLE.indexOf(lettersOnly(p)) > -1; });
  }

  var TRANSLIT = { 'ß': 'ss', 'æ': 'ae', 'ø': 'o', 'œ': 'oe', 'đ': 'd', 'ł': 'l', 'þ': 'th', 'ð': 'd', 'ı': 'i' };
  function slugWord(s) {
    return String(s || '').toLowerCase().replace(/[ßæøœđłþðı]/g, function (c) { return TRANSLIT[c]; })
      .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  }

  function nameShapes(f, l, k) {
    if (!f) return [];
    var out = [];
    if (l) {
      out.push([f, l], [f[0] + l], [f[0], l], [f + l], [l, f], [f, l[0]], [l + f[0]], [f + l[0]]);
      if (k) out.push([f, l, k], [f[0] + l, k], [k, f + l], [f + l, k], [f, k]);
    } else {
      out.push([f]);
      if (k) out.push([f, k], [k, f], [f + k], ['its', f, k]);
      else out.push(['hello', f], [f, 'hq'], ['real', f], ['its', f]);
    }
    return out;
  }

  function nameParts(style, o) {
    var r = randBelow(10), a, b;
    switch (style) {
      case 'gamer': return r < 6 ? [pick(GAMER_PRE), pick(GAMER_CORE)] : r < 8 ? [pick(GAMER_CORE), pick(GAMER_SUF)] : [pick(GAMER_PRE), pick(GAMER_CORE), pick(GAMER_SUF)];
      case 'name': return o.shapes.length ? pick(o.shapes) : null;
      case 'fantasy':
        var core = pick(FANTASY_START) + pick(FANTASY_MID) + pick(FANTASY_END);
        return r < 6 ? [core] : [core, pick(FANTASY_TITLE)];
      case 'cute':
        if (r < 6) return [pick(CUTE_ADJ), pick(CUTE_NOUN)];
        if (r < 8) return ['lil', pick(CUTE_NOUN)];
        a = pick(CUTE_NOUN);
        do { b = pick(CUTE_NOUN); } while (b === a);
        return [a, b];
      default: return [pick(ADJECTIVES), pick(NOUNS)];
    }
  }

  function applyCase(parts, mode) {
    return parts.map(function (w, i) {
      w = w.toLowerCase();
      if (mode === 'lower' || (mode === 'camel' && i === 0)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    });
  }

  var LEET = { a: '4', e: '3', i: '1', o: '0', s: '5', t: '7' };
  function leetify(s) { return s.replace(/[aeiost]/gi, function (c) { return LEET[c.toLowerCase()]; }); }

  function randomDigits(n) {
    var s = String(1 + randBelow(9));
    for (var i = 1; i < n; i++) s += randBelow(10);
    return s.slice(0, n);
  }

  Tools.register({
    id: 'username-generator', category: 'generators', name: 'Username Generator',
    description: 'Ideas for usernames and gamer tags: adjective and noun, gamer, name-based, fantasy or cute, with length limits and a rude-word filter.',
    keywords: ['username', 'user name', 'gamertag', 'gamer tag', 'handle', 'nickname', 'screen name', 'display name', 'account name',
      'name ideas', 'leetspeak', 'fantasy name', 'cute username', 'generator', 'random', 'social media handle'],
    render: function (root) {
      root.classList.add('g-genb');
      var style = U.chips([{ value: 'adjnoun', label: 'Adjective + noun' }, { value: 'gamer', label: 'Gamer tag' }, { value: 'name', label: 'From your name' },
        { value: 'fantasy', label: 'Fantasy' }, { value: 'cute', label: 'Cute' }], function () { gen(); }, 'adjnoun');
      var first = U.input({ label: 'First name', placeholder: 'e.g. Siân', dataset: { k: 'first' } });
      var last = U.input({ label: 'Surname (optional)', placeholder: "e.g. O'Neill", dataset: { k: 'last' } });
      var keyword = U.input({ label: 'Keyword (optional)', placeholder: 'e.g. design, dev, photo', dataset: { k: 'keyword' } });
      var nameRow = U.row(first, last, keyword);
      var letters = U.select({ label: 'Letters', options: [{ value: 'pascal', label: 'Capitalised (BraveOtter)' }, { value: 'lower', label: 'lowercase (braveotter)' }, { value: 'camel', label: 'camelCase (braveOtter)' }], value: 'pascal' });
      var sep = U.select({ label: 'Separator', options: [{ value: '', label: 'None' }, { value: '_', label: 'Underscore _' }, { value: '.', label: 'Dot .' }, { value: '-', label: 'Hyphen -' }], value: '' });
      var numbers = U.checkbox('Add numbers');
      var digits = U.select({ label: 'Digits', options: ['1', '2', '3', '4'], value: '2' });
      var leet = U.checkbox('Leetspeak (a→4, e→3, i→1, o→0, s→5, t→7)');
      var min = U.input({ label: 'Shortest', type: 'number', value: '4', min: '1', max: '64' });
      var max = U.input({ label: 'Longest', type: 'number', value: '20', min: '1', max: '64' });
      var count = U.input({ label: 'How many', type: 'number', value: '24', min: '1', max: '200' });
      var filter = U.checkbox('Hide rude words', { checked: true });
      var extra = U.input({ label: 'Also hide names containing', placeholder: 'words, separated by commas', dataset: { k: 'extra' } });
      var list = el('div', { class: 'gb-names', dataset: { k: 'names' } });
      var status = U.note('');
      var names = [];

      function gen() {
        nameRow.style.display = style.value === 'name' ? '' : 'none';
        digits.style.display = numbers.input.checked ? '' : 'none';
        var lo = Math.max(1, Math.floor(Number(val(min))) || 1), hi = Math.max(lo, Math.floor(Number(val(max))) || 20);
        var want = Math.max(1, Math.min(200, Math.floor(Number(val(count))) || 24));
        var o = { shapes: nameShapes(slugWord(val(first)), slugWord(val(last)), slugWord(val(keyword))) };
        var blocked = val(extra).split(/[,\s]+/).map(lettersOnly).filter(function (w) { return w; });
        names = [];
        if (style.value === 'name' && !o.shapes.length) {
          list.replaceChildren();
          say(status, 'Type a first name (a surname and a keyword give more ideas).');
          return;
        }
        var seen = new Set(), hidden = 0, tries = 0, limit = want * 80 + 400;
        while (names.length < want && tries++ < limit) {
          var parts = nameParts(style.value, o);
          var name = applyCase(parts, val(letters)).join(val(sep)) + (numbers.input.checked ? randomDigits(Number(val(digits))) : '');
          if (leet.input.checked) name = leetify(name);
          var len = Array.from(name).length;
          if (len < lo || len > hi || seen.has(name.toLowerCase())) continue;
          seen.add(name.toLowerCase());
          var flat = lettersOnly(name);
          if (blocked.some(function (w) { return flat.indexOf(w) > -1; }) || (filter.input.checked && isRude(name, parts))) { hidden++; continue; }
          names.push(name);
        }
        list.replaceChildren.apply(list, names.map(function (n) {
          return el('div', { class: 'gb-item' }, el('span', { class: 'gb-name', text: n }), U.copyBtn('Copy', n));
        }));
        var msg = plural(names.length, 'name') + (hidden ? ' · ' + plural(hidden, 'idea') + ' hidden by the word filter' : '');
        if (names.length < want) msg += ' · only found ' + names.length + ' that fit ' + lo + '–' + hi + ' characters' + (style.value === 'name' && !numbers.input.checked ? '; adding numbers gives more' : '');
        say(status, msg, names.length ? 'ok' : 'err');
        status.dataset.hidden = String(hidden);
      }
      U.live([first, last, keyword, letters, sep, numbers, digits, leet, min, max, count, filter, extra], gen);

      root.appendChild(U.panel('Style', style, el('div', { style: { marginTop: '10px' } }, nameRow)));
      root.appendChild(U.panel('Options',
        U.row(letters, sep, min, max, count),
        el('div', { class: 'row', style: { marginTop: '10px' } }, numbers, digits, leet),
        el('div', { class: 'row', style: { marginTop: '10px' } }, filter, el('div', { class: 'grow' }, extra)),
        el('p', { class: 'gb-muted', text: 'Many sites allow only letters, numbers, dots and underscores. The word filter checks through leetspeak too; it is a safety net, not a guarantee.' })));
      root.appendChild(U.panel('Ideas', status, list, U.btnrow(
        U.button('Generate more', gen, 'primary'),
        U.copyBtn('Copy all', function () { return names.join('\n'); }))));
    }
  });
})();
