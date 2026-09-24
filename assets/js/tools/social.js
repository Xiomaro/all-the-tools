/* social tools. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  /* append children, flattening arrays and skipping null (append() would
     print them as text) */
  function put(node) {
    (function walk(list) {
      list.forEach(function (k) {
        if (k === null || k === undefined || k === false) return;
        if (Array.isArray(k)) return walk(k);
        node.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
      });
    })(Array.prototype.slice.call(arguments, 1));
    return node;
  }
  function fill(node) { node.replaceChildren(); return put.apply(null, arguments); }

  /* --- shared ------------------------------------------------------------ */

  var CSS = [
    '.g-soc .seg{display:inline-flex;flex-wrap:wrap;gap:4px}',
    '.g-soc .seg .chip.on{background:var(--accent);color:#fff;border-color:var(--accent)}',
    '.g-soc .swatches{display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
    '.g-soc .sw{width:28px;height:28px;border-radius:50%;border:2px solid var(--border);cursor:pointer;padding:0}',
    '.g-soc .sw.on{outline:3px solid var(--accent);outline-offset:1px}',
    '.g-soc .cardlist{display:flex;flex-direction:column;gap:6px}',
    '.g-soc .hcard{display:flex;gap:6px;align-items:center;border:1px solid var(--border);border-radius:var(--radius);padding:6px 8px;background:var(--bg-elev)}',
    '.g-soc .hcard .main{flex:1;text-align:left;background:none;border:0;color:var(--fg);cursor:pointer;font:inherit}',
    '.g-soc .hcard .dot{width:12px;height:12px;border-radius:50%;display:inline-block;margin-right:6px}',
    '.g-soc .hcard .mini{padding:2px 8px;min-width:0}',
    '.g-soc .edit{border:1px dashed var(--border);border-radius:var(--radius);padding:8px;margin:4px 0 8px}',
    '.g-soc .chart-wrap{overflow:auto;background:#fff;border:1px solid var(--border);border-radius:var(--radius)}',
    '.g-soc .chart-wrap svg{display:block;width:100%;height:auto;min-width:520px}',
    '.g-soc .fancy-list{display:flex;flex-direction:column;gap:6px}',
    '.g-soc .fancy-row{display:flex;gap:8px;align-items:center;border:1px solid var(--border);border-radius:var(--radius);padding:6px 10px;background:var(--bg-elev)}',
    '.g-soc .fancy-row .lbl{width:150px;flex:none}',
    '.g-soc .fancy-row .lbl small{display:block;color:var(--fg-muted);font-size:11px}',
    '.g-soc .fancy-row .val{flex:1;text-align:left;background:none;border:0;color:var(--fg);font-size:18px;cursor:pointer;word-break:break-all;font-family:inherit}',
    '.g-soc canvas.pv{max-width:100%;background:repeating-conic-gradient(#ccc 0 25%,#fff 0 50%) 0 0/16px 16px;border-radius:var(--radius);touch-action:none;cursor:grab}',
    '.g-soc .thumbgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}',
    '.g-soc .thumbgrid button{border:2px solid var(--border);border-radius:var(--radius);padding:3px;background:var(--bg-elev);cursor:pointer;color:var(--fg);font:inherit;font-size:12px}',
    '.g-soc .thumbgrid button.on{border-color:var(--accent)}',
    '.g-soc .thumbgrid canvas{width:100%;display:block;border-radius:4px}',
    '.g-soc .tp-overlay{position:fixed;inset:0;background:#000;color:#fff;z-index:9999;overflow:hidden}',
    '.g-soc .tp-scroll{position:absolute;left:0;right:0;top:0;will-change:transform}',
    '.g-soc .tp-text{margin:0 auto;white-space:pre-wrap;line-height:1.35;font-family:system-ui,sans-serif}',
    '.g-soc .tp-line{position:absolute;left:0;right:0;top:40%;height:0;border-top:2px solid rgba(255,80,80,.8);pointer-events:none}',
    '.g-soc .tp-fade{position:absolute;left:0;right:0;height:18%;pointer-events:none}',
    '.g-soc .tp-bar{position:absolute;left:0;right:0;bottom:0;display:flex;gap:6px;justify-content:center;padding:8px;background:rgba(0,0,0,.6);flex-wrap:wrap}',
    '.g-soc .tp-bar .btn{background:#222;color:#fff;border-color:#444}',
    '.g-soc .tp-count{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:30vh;font-weight:700}',
    '.g-soc .tp-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.45}',
    '.g-soc .social-card{border:1px solid var(--border);border-radius:14px;overflow:hidden;max-width:520px;background:var(--bg-elev)}',
    '.g-soc .social-card .img{aspect-ratio:1.91/1;background:var(--bg-sunken);display:flex;align-items:center;justify-content:center;color:var(--fg-muted);overflow:hidden}',
    '.g-soc .social-card .img img{width:100%;height:100%;object-fit:cover}',
    '.g-soc .social-card .body{padding:10px 12px}',
    '.g-soc .social-card .dom{color:var(--fg-muted);font-size:12px;text-transform:uppercase}',
    '.g-soc .social-card .t{font-weight:600;margin:2px 0}',
    '.g-soc .social-card .d{color:var(--fg-muted);font-size:13px}',
    '.g-soc .tweet{border:1px solid var(--border);border-radius:14px;padding:12px;max-width:560px;background:var(--bg-elev)}',
    '.g-soc .tweet .av{width:44px;height:44px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;flex:none}',
    '.g-soc .tweet .txt{white-space:pre-wrap;word-break:break-word;margin-top:8px}',
    '.g-soc .over{color:var(--err);font-weight:600}',
    '.g-soc .tags{display:flex;flex-wrap:wrap;gap:6px}',
    '.g-soc .tags button.on{background:var(--accent);color:#fff;border-color:var(--accent)}',
    '.g-soc .yt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}',
    '.g-soc .yt-grid figure{margin:0;border:1px solid var(--border);border-radius:var(--radius);padding:8px;background:var(--bg-elev)}',
    '.g-soc .yt-grid img{width:100%;display:block;border-radius:4px;background:var(--bg-sunken)}',
    '.g-soc .pp-previews{display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap}',
    '.g-soc .pp-previews figure{margin:0;text-align:center;font-size:12px;color:var(--fg-muted)}'
  ].join('\n');
  document.head.appendChild(el('style', { text: CSS }));

  function seg(options, initial, onChange) {
    var wrap = U.chips(options, onChange, initial);
    wrap.classList.add('seg');
    wrap.set = function (v) {
      wrap.value = v;
      Array.prototype.forEach.call(wrap.children, function (c, i) {
        var o = options[i];
        c.classList.toggle('on', (typeof o === 'string' ? o : o.value) === v);
      });
    };
    return wrap;
  }

  function toggle(label, on, onChange, title) {
    var b = el('button', { type: 'button', class: 'chip' + (on ? ' on' : ''), title: title || null, 'aria-pressed': String(!!on) }, label);
    b.on = !!on;
    b.addEventListener('click', function () {
      b.on = !b.on;
      b.classList.toggle('on', b.on);
      b.setAttribute('aria-pressed', String(b.on));
      if (onChange) onChange(b.on);
    });
    b.set = function (v) { b.on = !!v; b.classList.toggle('on', b.on); b.setAttribute('aria-pressed', String(b.on)); };
    return b;
  }

  function rangeField(label, opts, fmt, onInput) {
    var input = el('input', { type: 'range', min: opts.min, max: opts.max, step: opts.step || 1, value: opts.value });
    var lab = el('label', { text: label + ': ' + fmt(Number(opts.value)) });
    input.addEventListener('input', function () { lab.textContent = label + ': ' + fmt(Number(input.value)); if (onInput) onInput(Number(input.value)); });
    var wrap = el('div', { class: 'field' }, lab, input);
    wrap.input = input;
    wrap.set = function (v) { input.value = v; lab.textContent = label + ': ' + fmt(Number(v)); };
    return wrap;
  }

  function canvasBlob(canvas, type, q) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) { b ? resolve(b) : reject(new Error('Could not encode the image')); }, type || 'image/png', q);
    });
  }

  function graphemes(s) {
    if (window.Intl && Intl.Segmenter) return Array.from(new Intl.Segmenter().segment(s)).length;
    return Array.from(s).length;
  }

  function b64encode(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64decode(str) { return decodeURIComponent(escape(atob(str))); }

  /* Build a link to a tool that carries data in the query string, keeping
     any existing query parameters (the router only reads the hash). */
  function toolLink(id, key, value) {
    /* keep the existing query text exactly as it is: other parameters are
       read raw elsewhere, so re-encoding them could break them */
    var kept = location.search.replace(/^\?/, '').split('&').filter(function (p) { return p && p.split('=')[0] !== key; });
    kept.push(key + '=' + encodeURIComponent(value));
    return location.origin + location.pathname + '?' + kept.join('&') + '#/t/' + id;
  }
  function readParam(key) {
    try { return new URLSearchParams(location.search).get(key); } catch (e) { return null; }
  }

  /* ======================================================================
     Height Comparison Chart
     ====================================================================== */

  var HC_COLOURS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#0ea5e9', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#64748b'];
  var HC_OBJECTS = [
    { key: 'door', name: 'Door', desc: 'Standard interior door, 203 × 81 cm (80 × 32 in)', cm: 203, w: 81, color: '#a16207' },
    { key: 'fridge', name: 'Fridge', desc: 'Typical fridge-freezer, 178 × 76 cm (70 × 30 in)', cm: 178, w: 76, color: '#94a3b8' },
    { key: 'counter', name: 'Kitchen counter', desc: 'Standard counter height, 91 cm (36 in)', cm: 91, w: 120, color: '#78716c' },
    { key: 'hoop', name: 'Basketball hoop', desc: 'Regulation rim height, 10 ft (305 cm)', cm: 305, w: 120, color: '#ea580c' },
    { key: 'car', name: 'Car', desc: 'Mid-size sedan, 145 cm tall and 4.8 m long', cm: 145, w: 480, color: '#2563eb' },
    { key: 'bike', name: 'Bicycle', desc: 'Adult bicycle with 700c wheels, 105 cm to the handlebars', cm: 105, w: 175, color: '#16a34a' }
  ];

  /* Accepts 175, 175 cm, 1.75 m, 5'9", 5′ 9″, 5 ft 9 in, 69 in, 5.75 ft. */
  function parseHeight(text) {
    var s = String(text || '').trim().toLowerCase().replace(/[′’´]/g, "'").replace(/[″”“]/g, '"').replace(/,/g, '.');
    if (!s) return null;
    var m;
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(?:'|ft|feet|foot)\s*(?:(\d+(?:\.\d+)?)\s*(?:"|''|in|inch|inches)?)?$/))) {
      return (Number(m[1]) * 12 + Number(m[2] || 0)) * 2.54;
    }
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(?:"|''|in|inch|inches)$/))) return Number(m[1]) * 2.54;
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(?:cm|centimet(?:er|re)s?)$/))) return Number(m[1]);
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(?:mm)$/))) return Number(m[1]) / 10;
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(?:m|met(?:er|re)s?)$/))) return Number(m[1]) * 100;
    if ((m = s.match(/^(\d+(?:\.\d+)?)$/))) {
      var n = Number(m[1]);
      if (n < 3) return n * 100;
      if (n < 9) return n * 30.48;
      return n;
    }
    return null;
  }

  function ftIn(cm) {
    var inches = Math.round(cm / 2.54);
    return Math.floor(inches / 12) + '′ ' + (inches % 12) + '″';
  }
  function cmText(cm) { return (Math.round(cm * 10) / 10) + ' cm'; }

  Tools.register({
    id: 'height-comparison',
    category: 'converters',
    name: 'Height Comparison Chart',
    description: 'Compare heights of people, objects and photos side by side on one true scale.',
    keywords: ['height', 'comparison', 'compare', 'tall', 'chart', 'size', 'feet', 'cm'],
    render: function (root) {
      root.classList.add('g-soc');
      var state = {
        unit: 'ft',
        items: [
          { id: 1, kind: 'person', name: 'Alex', cm: 180, figure: 'man', build: 'average', color: '#6366f1' },
          { id: 2, kind: 'person', name: 'Maya', cm: 165, figure: 'woman', build: 'average', color: '#ec4899' }
        ]
      };
      var nextId = 3, editing = null, sortDesc = true;
      var photos = {}; /* id -> HTMLImageElement */

      var shared = readParam('hc');
      if (shared) {
        try {
          var parsed = JSON.parse(b64decode(shared));
          if (parsed && Array.isArray(parsed.items)) {
            state.unit = parsed.unit === 'cm' ? 'cm' : 'ft';
            state.items = parsed.items.filter(function (i) { return i.kind !== 'photo'; }).slice(0, 12).map(function (i, n) {
              return { id: n + 1, kind: i.kind || 'person', name: String(i.name || ''), cm: Number(i.cm) || 170, figure: i.figure || 'man', build: i.build || 'average', color: i.color || HC_COLOURS[n % 10], w: i.w, obj: i.obj };
            });
            nextId = state.items.length + 1;
          }
        } catch (e) { U.toast('That share link could not be read', 'err'); }
      }

      function fmt(cm) { return state.unit === 'cm' ? cmText(cm) : ftIn(cm); }
      function fmtBoth(cm) { return ftIn(cm) + ' (' + cmText(cm) + ')'; }

      /* --- chart ---- */
      var chartWrap = el('div', { class: 'chart-wrap' });
      var compareOut = el('div');

      function niceStep(maxCm) {
        var steps = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
        for (var i = 0; i < steps.length; i++) if (maxCm / steps[i] <= 11) return steps[i];
        return 2000;
      }

      function itemWidthCm(it) {
        if (it.kind === 'person') {
          var bw = { slim: 0.85, average: 1, broad: 1.2 }[it.build] || 1;
          var base = it.figure === 'child' ? 0.3 : it.figure === 'woman' ? 0.25 : 0.27;
          return it.cm * base * bw;
        }
        if (it.kind === 'photo') { var img = photos[it.id]; return img ? it.cm * img.naturalWidth / img.naturalHeight : it.cm * 0.5; }
        return it.w || it.cm * 0.5;
      }

      function personSVG(it, x, ground, pxcm) {
        var H = it.cm * pxcm, W = itemWidthCm(it) * pxcm, cx = x + W / 2, top = ground - H;
        var child = it.figure === 'child', woman = it.figure === 'woman';
        var headR = H * (child ? 0.095 : 0.065);
        var neck = top + headR * 2 + H * 0.01;
        var shoulderW = W * (woman ? 0.82 : 0.95), hipW = W * (woman ? 0.8 : 0.66);
        var torsoBottom = top + H * (child ? 0.56 : 0.53);
        var legW = W * 0.2, c = it.color, parts = [];
        parts.push('<circle cx="' + cx + '" cy="' + (top + headR) + '" r="' + headR + '" fill="' + c + '"/>');
        parts.push('<path d="M' + (cx - shoulderW / 2) + ' ' + (neck + H * 0.03) +
          ' Q' + (cx - shoulderW / 2) + ' ' + neck + ' ' + (cx - shoulderW / 4) + ' ' + neck +
          ' L' + (cx + shoulderW / 4) + ' ' + neck +
          ' Q' + (cx + shoulderW / 2) + ' ' + neck + ' ' + (cx + shoulderW / 2) + ' ' + (neck + H * 0.03) +
          ' L' + (cx + hipW / 2) + ' ' + torsoBottom + ' L' + (cx - hipW / 2) + ' ' + torsoBottom + ' Z" fill="' + c + '"/>');
        /* arms */
        var armW = W * 0.11, armTop = neck + H * 0.02, armBottom = top + H * (child ? 0.6 : 0.52);
        parts.push('<rect x="' + (cx - shoulderW / 2 - armW * 0.6) + '" y="' + armTop + '" width="' + armW + '" height="' + (armBottom - armTop) + '" rx="' + armW / 2 + '" fill="' + c + '"/>');
        parts.push('<rect x="' + (cx + shoulderW / 2 - armW * 0.4) + '" y="' + armTop + '" width="' + armW + '" height="' + (armBottom - armTop) + '" rx="' + armW / 2 + '" fill="' + c + '"/>');
        /* legs */
        parts.push('<rect x="' + (cx - hipW / 2) + '" y="' + (torsoBottom - 2) + '" width="' + legW * 1.2 + '" height="' + (ground - torsoBottom + 2) + '" rx="' + legW * 0.4 + '" fill="' + c + '"/>');
        parts.push('<rect x="' + (cx + hipW / 2 - legW * 1.2) + '" y="' + (torsoBottom - 2) + '" width="' + legW * 1.2 + '" height="' + (ground - torsoBottom + 2) + '" rx="' + legW * 0.4 + '" fill="' + c + '"/>');
        return parts.join('');
      }

      function objectSVG(it, x, ground, pxcm) {
        var H = it.cm * pxcm, W = itemWidthCm(it) * pxcm, top = ground - H, c = it.color, s = [];
        switch (it.obj) {
          case 'door':
            s.push('<rect x="' + x + '" y="' + top + '" width="' + W + '" height="' + H + '" fill="' + c + '" rx="2"/>');
            s.push('<rect x="' + (x + W * 0.12) + '" y="' + (top + H * 0.06) + '" width="' + W * 0.76 + '" height="' + H * 0.38 + '" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="2"/>');
            s.push('<rect x="' + (x + W * 0.12) + '" y="' + (top + H * 0.5) + '" width="' + W * 0.76 + '" height="' + H * 0.44 + '" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="2"/>');
            s.push('<circle cx="' + (x + W * 0.85) + '" cy="' + (top + H * 0.5) + '" r="' + Math.max(2, W * 0.05) + '" fill="#fde047"/>');
            break;
          case 'fridge':
            s.push('<rect x="' + x + '" y="' + top + '" width="' + W + '" height="' + H + '" fill="' + c + '" rx="4"/>');
            s.push('<line x1="' + x + '" x2="' + (x + W) + '" y1="' + (top + H * 0.38) + '" y2="' + (top + H * 0.38) + '" stroke="rgba(0,0,0,.3)" stroke-width="2"/>');
            s.push('<rect x="' + (x + W * 0.82) + '" y="' + (top + H * 0.12) + '" width="' + Math.max(2, W * 0.05) + '" height="' + H * 0.18 + '" fill="#334155"/>');
            s.push('<rect x="' + (x + W * 0.82) + '" y="' + (top + H * 0.45) + '" width="' + Math.max(2, W * 0.05) + '" height="' + H * 0.25 + '" fill="#334155"/>');
            break;
          case 'counter':
            s.push('<rect x="' + x + '" y="' + (top + H * 0.08) + '" width="' + W + '" height="' + H * 0.92 + '" fill="' + c + '"/>');
            s.push('<rect x="' + (x - 3) + '" y="' + top + '" width="' + (W + 6) + '" height="' + H * 0.08 + '" fill="#44403c"/>');
            s.push('<line x1="' + (x + W / 2) + '" x2="' + (x + W / 2) + '" y1="' + (top + H * 0.1) + '" y2="' + ground + '" stroke="rgba(0,0,0,.3)" stroke-width="2"/>');
            break;
          case 'hoop':
            var poleX = x + W * 0.15;
            s.push('<rect x="' + poleX + '" y="' + (top - 30 * pxcm) + '" width="' + Math.max(3, 10 * pxcm) + '" height="' + (H + 30 * pxcm) + '" fill="#475569"/>');
            s.push('<rect x="' + (x + W * 0.3) + '" y="' + (top - 60 * pxcm) + '" width="' + Math.max(2, 4 * pxcm) + '" height="' + 105 * pxcm + '" fill="#e2e8f0" stroke="#475569"/>');
            s.push('<line x1="' + poleX + '" x2="' + (x + W * 0.3) + '" y1="' + (top - 20 * pxcm) + '" y2="' + (top - 20 * pxcm) + '" stroke="#475569" stroke-width="3"/>');
            s.push('<ellipse cx="' + (x + W * 0.3 + 23 * pxcm) + '" cy="' + top + '" rx="' + 23 * pxcm + '" ry="' + Math.max(2, 4 * pxcm) + '" fill="none" stroke="' + c + '" stroke-width="3"/>');
            s.push('<path d="M' + (x + W * 0.3 + 4 * pxcm) + ' ' + top + ' L' + (x + W * 0.3 + 12 * pxcm) + ' ' + (top + 40 * pxcm) + ' L' + (x + W * 0.3 + 34 * pxcm) + ' ' + (top + 40 * pxcm) + ' L' + (x + W * 0.3 + 42 * pxcm) + ' ' + top + '" fill="none" stroke="#cbd5e1" stroke-width="1.5"/>');
            break;
          case 'car':
            var bodyTop = top + H * 0.42;
            s.push('<path d="M' + (x + W * 0.05) + ' ' + (ground - H * 0.18) + ' L' + x + ' ' + bodyTop + ' L' + (x + W * 0.22) + ' ' + (bodyTop - H * 0.04) + ' L' + (x + W * 0.33) + ' ' + top + ' L' + (x + W * 0.68) + ' ' + top + ' L' + (x + W * 0.8) + ' ' + (bodyTop - H * 0.02) + ' L' + (x + W) + ' ' + (bodyTop + H * 0.06) + ' L' + (x + W * 0.98) + ' ' + (ground - H * 0.18) + ' Z" fill="' + c + '"/>');
            s.push('<path d="M' + (x + W * 0.36) + ' ' + (top + H * 0.07) + ' L' + (x + W * 0.65) + ' ' + (top + H * 0.07) + ' L' + (x + W * 0.75) + ' ' + (bodyTop - H * 0.04) + ' L' + (x + W * 0.28) + ' ' + (bodyTop - H * 0.04) + ' Z" fill="#bfdbfe"/>');
            [0.2, 0.8].forEach(function (f) { s.push('<circle cx="' + (x + W * f) + '" cy="' + (ground - H * 0.22) + '" r="' + H * 0.22 + '" fill="#111827"/><circle cx="' + (x + W * f) + '" cy="' + (ground - H * 0.22) + '" r="' + H * 0.1 + '" fill="#9ca3af"/>'); });
            break;
          case 'bike':
            var r = 34 * pxcm, wy = ground - r;
            s.push('<circle cx="' + (x + r) + '" cy="' + wy + '" r="' + r + '" fill="none" stroke="#111827" stroke-width="3"/>');
            s.push('<circle cx="' + (x + W - r) + '" cy="' + wy + '" r="' + r + '" fill="none" stroke="#111827" stroke-width="3"/>');
            s.push('<path d="M' + (x + r) + ' ' + wy + ' L' + (x + W * 0.45) + ' ' + wy + ' L' + (x + W * 0.36) + ' ' + (top + H * 0.2) + ' Z M' + (x + W * 0.45) + ' ' + wy + ' L' + (x + W * 0.72) + ' ' + (top + H * 0.25) + ' L' + (x + W * 0.36) + ' ' + (top + H * 0.25) + ' M' + (x + W * 0.72) + ' ' + (top + H * 0.25) + ' L' + (x + W - r) + ' ' + wy + ' M' + (x + W * 0.72) + ' ' + (top + H * 0.25) + ' L' + (x + W * 0.7) + ' ' + top + ' L' + (x + W * 0.78) + ' ' + top + '" fill="none" stroke="' + c + '" stroke-width="4" stroke-linejoin="round"/>');
            s.push('<rect x="' + (x + W * 0.3) + '" y="' + (top + H * 0.12) + '" width="' + W * 0.12 + '" height="' + H * 0.05 + '" rx="3" fill="#111827"/>');
            break;
          default:
            s.push('<rect x="' + x + '" y="' + top + '" width="' + W + '" height="' + H + '" fill="' + c + '" fill-opacity=".85" rx="3"/>');
        }
        return s.join('');
      }

      var lastSVG = '';
      function drawChart() {
        var items = state.items;
        var VW = 900, VH = 480, padL = 70, padR = 60, padT = 40, padB = 40;
        var ground = VH - padB;
        var maxCm = Math.max.apply(null, [100].concat(items.map(function (i) { return i.cm * (i.obj === 'hoop' ? 1.2 : 1); })));
        var step = niceStep(maxCm);
        var topCm = Math.ceil(maxCm * 1.05 / step) * step;
        var pxcm = (ground - padT) / topCm;
        var gap = 24;
        var totalW = items.reduce(function (a, i) { return a + itemWidthCm(i) * pxcm; }, 0) + gap * (items.length + 1);
        var avail = VW - padL - padR;
        var squeeze = totalW > avail ? avail / totalW : 1;
        var s = [];
        s.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + VW + ' ' + VH + '" font-family="system-ui,sans-serif">');
        s.push('<rect width="' + VW + '" height="' + VH + '" fill="#ffffff"/>');
        for (var c = 0; c <= topCm + 0.001; c += step) {
          var y = ground - c * pxcm;
          s.push('<line x1="' + padL + '" x2="' + (VW - padR) + '" y1="' + y + '" y2="' + y + '" stroke="#e5e7eb"/>');
          s.push('<text x="' + (padL - 8) + '" y="' + (y + 4) + '" text-anchor="end" font-size="12" fill="#6b7280">' + c + ' cm</text>');
        }
        var ftStep = topCm / 30.48 > 12 ? 5 : 1;
        for (var f = 0; f * 30.48 <= topCm + 0.001; f += ftStep) {
          var fy = ground - f * 30.48 * pxcm;
          s.push('<line x1="' + (VW - padR) + '" x2="' + (VW - padR + 6) + '" y1="' + fy + '" y2="' + fy + '" stroke="#9ca3af"/>');
          s.push('<text x="' + (VW - padR + 10) + '" y="' + (fy + 4) + '" font-size="12" fill="#6b7280">' + (f === 0 ? '0″' : f + '′') + '</text>');
        }
        s.push('<line x1="' + padL + '" x2="' + (VW - padR) + '" y1="' + ground + '" y2="' + ground + '" stroke="#374151" stroke-width="2"/>');
        s.push('<text x="' + (VW - padR) + '" y="' + (VH - 10) + '" text-anchor="end" font-size="11" fill="#9ca3af">All The Tools</text>');
        var x = padL + gap * squeeze;
        var defs = [];
        items.forEach(function (it) {
          var wpx = itemWidthCm(it) * pxcm * squeeze;
          var scale = pxcm; /* vertical scale is always true */
          var gx = x;
          if (squeeze < 1) {
            s.push('<g transform="translate(' + gx + ' 0) scale(' + squeeze + ' 1) translate(' + (-gx) + ' 0)">');
          }
          if (it.kind === 'person') s.push(personSVG(it, gx, ground, scale));
          else if (it.kind === 'photo' && photos[it.id]) {
            var ph = it.cm * pxcm, pw = itemWidthCm(it) * pxcm;
            s.push('<image href="' + photos[it.id].src + '" x="' + gx + '" y="' + (ground - ph) + '" width="' + pw + '" height="' + ph + '" preserveAspectRatio="none"/>');
          } else if (it.kind === 'object') s.push(objectSVG(it, gx, ground, scale));
          else s.push('<rect x="' + gx + '" y="' + (ground - it.cm * pxcm) + '" width="' + itemWidthCm(it) * pxcm + '" height="' + it.cm * pxcm + '" fill="' + it.color + '" fill-opacity=".85" rx="3"/>');
          if (squeeze < 1) s.push('</g>');
          var topY = ground - it.cm * pxcm;
          s.push('<line x1="' + (gx - 4) + '" x2="' + (gx + wpx + 4) + '" y1="' + topY + '" y2="' + topY + '" stroke="' + it.color + '" stroke-dasharray="4 3"/>');
          s.push('<text x="' + (gx + wpx / 2) + '" y="' + (topY - 20) + '" text-anchor="middle" font-size="14" font-weight="700" fill="#111827">' + U.escapeHtml(it.name || '') + '</text>');
          s.push('<text x="' + (gx + wpx / 2) + '" y="' + (topY - 6) + '" text-anchor="middle" font-size="12" fill="#374151">' + fmt(it.cm) + '</text>');
          x += wpx + gap * squeeze;
        });
        s.push('</svg>');
        lastSVG = s.join('');
        chartWrap.innerHTML = lastSVG;
        drawCompare();
      }

      function diffText(a, b) {
        var d = a.cm - b.cm;
        if (Math.abs(d) < 0.05) return a.name + ' and ' + b.name + ' are the same height.';
        var amount = state.unit === 'cm' ? (Math.round(d * 10) / 10) + ' cm' : (Math.round(d / 2.54 * 10) / 10) + ' in';
        return a.name + ' is ' + amount + ' taller than ' + b.name + ' (' + (Math.round(d / b.cm * 1000) / 10) + '% taller).';
      }

      function drawCompare() {
        var items = state.items.slice().sort(function (a, b) { return b.cm - a.cm; });
        var lines = [];
        if (items.length >= 2) {
          for (var i = 1; i < items.length; i++) lines.push(diffText(items[0], items[i]));
          if (items.length > 2) lines.push(diffText(items[items.length - 2], items[items.length - 1]).replace(/^/, ''));
        }
        fill(compareOut, el('h3', { text: 'How they compare' }),
          lines.length ? el('div', { class: 'hc-compare' }, lines.filter(function (l, i, a) { return a.indexOf(l) === i; }).map(function (l) { return el('p', { text: l, style: { margin: '4px 0' } }); }))
            : U.note('Add at least two things to compare them.'));
      }

      /* --- toolbar ---- */
      var unitSeg = seg([{ value: 'cm', label: 'cm' }, { value: 'ft', label: 'ft / in' }], state.unit, function (v) { state.unit = v; refresh(); });
      var toolbar = U.btnrow(unitSeg,
        U.button('Sort', function () {
          state.items.sort(function (a, b) { return sortDesc ? b.cm - a.cm : a.cm - b.cm; });
          sortDesc = !sortDesc;
          refresh();
        }, 'ghost'),
        U.button('Share link', function () {
          var data = { unit: state.unit, items: state.items.filter(function (i) { return i.kind !== 'photo'; }).map(function (i) {
            return { kind: i.kind, name: i.name, cm: Math.round(i.cm * 10) / 10, figure: i.figure, build: i.build, color: i.color, w: i.w, obj: i.obj };
          }) };
          var link = toolLink('height-comparison', 'hc', b64encode(JSON.stringify(data)));
          shareOut.value = link;
          shareOut.style.display = '';
          U.copy(link);
          if (state.items.some(function (i) { return i.kind === 'photo'; })) U.toast('Photos stay on your device and are not in the link');
        }, 'ghost'),
        U.button('Download PNG', function () {
          var svg = lastSVG;
          var img = new Image();
          img.onload = function () {
            var c = el('canvas', { width: 1800, height: 960 });
            var ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0, 1800, 960);
            canvasBlob(c).then(function (b) { U.saveBlob('height-comparison.png', b); });
          };
          img.onerror = function () { U.toast('Could not render the chart', 'err'); };
          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        }));
      var shareOut = el('input', { type: 'text', readOnly: true, style: { display: 'none', width: '100%', marginTop: '6px' }, class: 'mono' });

      /* --- add panel ---- */
      var addBody = el('div');
      var addTab = seg(['Person', 'Object', 'Photo', 'Custom'], 'Person', function () { buildAdd(); });

      function colourPicker(current, onPick) {
        var wrap = el('div', { class: 'swatches' });
        var picker = el('input', { type: 'color', value: current, title: 'Pick any colour', 'aria-label': 'Pick any colour' });
        function mark(v) {
          Array.prototype.forEach.call(wrap.querySelectorAll('.sw'), function (b) { b.classList.toggle('on', b.dataset.c === v); });
        }
        HC_COLOURS.forEach(function (c) {
          wrap.appendChild(el('button', { type: 'button', class: 'sw', dataset: { c: c }, style: { background: c }, 'aria-label': 'Colour ' + c,
            onclick: function () { picker.value = c; mark(c); onPick(c); } }));
        });
        picker.addEventListener('input', function () { mark(picker.value); onPick(picker.value); });
        wrap.appendChild(picker);
        mark(current);
        wrap.picker = picker;
        return wrap;
      }

      function nextColour() {
        var used = state.items.map(function (i) { return i.color; });
        for (var i = 0; i < HC_COLOURS.length; i++) if (used.indexOf(HC_COLOURS[i]) === -1) return HC_COLOURS[i];
        return HC_COLOURS[state.items.length % HC_COLOURS.length];
      }

      function canAdd() {
        if (state.items.length >= 12) { U.toast('The chart holds 12 at most. Remove one first.', 'err'); return false; }
        return true;
      }

      function buildAdd() {
        var tab = addTab.value;
        var colour = nextColour();
        if (tab === 'Person') {
          var name = U.input({ label: 'Name', placeholder: 'Name', 'aria-label': 'Name' });
          var h = U.input({ label: 'Height', placeholder: 'Height, e.g. 5\'9"', 'aria-label': 'Height, e.g. 5\'9"' });
          var fig = seg([{ value: 'man', label: 'Man' }, { value: 'woman', label: 'Woman' }, { value: 'child', label: 'Child' }], 'man');
          var build = seg([{ value: 'slim', label: 'Slim' }, { value: 'average', label: 'Average' }, { value: 'broad', label: 'Broad' }], 'average');
          var cp = colourPicker(colour, function (c) { colour = c; });
          var err = U.note('');
          var form = el('form', { onsubmit: function (e) {
            e.preventDefault();
            if (!canAdd()) return;
            var cm = parseHeight(h.querySelector('input').value);
            if (!cm || cm <= 0 || cm > 100000) { err.className = 'note err'; err.textContent = 'Type a height like 175, 1.75 m, 5\'9" or 69 in.'; return; }
            err.textContent = '';
            state.items.push({ id: nextId++, kind: 'person', name: name.querySelector('input').value.trim() || 'Person ' + (state.items.length + 1), cm: cm, figure: fig.value, build: build.value, color: colour });
            refresh(); buildAdd();
          } }, U.row(name, h), U.row(fig, build), cp, err, el('button', { type: 'submit', class: 'btn primary' }, 'Add person'));
          fill(addBody, form);
        } else if (tab === 'Object') {
          fill(addBody, el('div', { class: 'cardlist' }, HC_OBJECTS.map(function (o) {
            return el('button', { type: 'button', class: 'btn ghost', style: { textAlign: 'left', display: 'block' }, onclick: function () {
              if (!canAdd()) return;
              state.items.push({ id: nextId++, kind: 'object', obj: o.key, name: o.name, cm: o.cm, w: o.w, color: o.color });
              refresh();
            } }, el('b', { text: o.name }), el('br'), el('small', { text: o.desc }));
          })));
        } else if (tab === 'Photo') {
          var img = null;
          var pname = U.input({ label: 'Name', placeholder: 'Photo name', 'aria-label': 'Photo name' });
          var ph = U.input({ label: 'Height', placeholder: 'How tall is it?', 'aria-label': 'How tall is it?' });
          var status = U.note('');
          var dz = U.dropzone({ accept: 'image/*', label: 'Choose a photo or character image', hint: 'It stays on your device. Nothing is uploaded.', onFiles: function (files) {
            U.readAs(files[0], 'dataURL').then(function (url) {
              var im = new Image();
              im.onload = function () { img = im; status.className = 'note ok'; status.textContent = 'Loaded ' + files[0].name + ' (' + im.naturalWidth + ' × ' + im.naturalHeight + ')'; if (!pname.querySelector('input').value) pname.querySelector('input').value = files[0].name.replace(/\.[^.]+$/, ''); };
              im.onerror = function () { status.className = 'note err'; status.textContent = 'That file is not an image this browser can read.'; };
              im.src = url;
            });
          } });
          fill(addBody, dz, status,
            U.note('For an accurate comparison, crop the picture so the top of the head touches the top edge and the feet touch the bottom.'),
            U.row(pname, ph),
            U.button('Add photo', function () {
              if (!img) { status.className = 'note err'; status.textContent = 'Choose a photo first.'; return; }
              var cm = parseHeight(ph.querySelector('input').value);
              if (!cm) { status.className = 'note err'; status.textContent = 'Type how tall it is, e.g. 170 or 5\'7".'; return; }
              if (!canAdd()) return;
              var id = nextId++;
              photos[id] = img;
              state.items.push({ id: id, kind: 'photo', name: pname.querySelector('input').value.trim() || 'Photo', cm: cm, color: nextColour() });
              refresh(); buildAdd();
            }, 'primary'));
        } else {
          var bname = U.input({ label: 'Name', placeholder: 'Box name', 'aria-label': 'Box name' });
          var bh = U.input({ label: 'Height', placeholder: 'Height, e.g. 5\'9"', 'aria-label': 'Height' });
          var bw = U.input({ label: 'Width', placeholder: 'Height, e.g. 5\'9"', 'aria-label': 'Width' });
          var bcol = colourPicker(colour, function (c) { colour = c; });
          var berr = U.note('');
          fill(addBody, el('form', { onsubmit: function (e) {
            e.preventDefault();
            if (!canAdd()) return;
            var cm = parseHeight(bh.querySelector('input').value), w = parseHeight(bw.querySelector('input').value);
            if (!cm) { berr.className = 'note err'; berr.textContent = 'Type a height like 120 or 4\'.'; return; }
            state.items.push({ id: nextId++, kind: 'box', name: bname.querySelector('input').value.trim() || 'Box', cm: cm, w: w || cm * 0.5, color: colour });
            refresh(); buildAdd();
          } }, U.row(bname, bh, bw), bcol, berr, el('button', { type: 'submit', class: 'btn primary' }, 'Add box')));
        }
      }

      /* --- list ---- */
      var listHead = el('h3');
      var list = el('div', { class: 'cardlist' });

      function editor(it) {
        var box = el('div', { class: 'edit' });
        var name = U.input({ label: 'Name', value: it.name, 'aria-label': 'Name' });
        var h = U.input({ label: 'Height', value: state.unit === 'cm' ? String(Math.round(it.cm * 10) / 10) : ftIn(it.cm).replace('′', "'").replace('″', '"'), 'aria-label': 'Height, e.g. 5\'9"' });
        var hNote = el('span', { class: 'hint', text: fmtBoth(it.cm) });
        name.querySelector('input').addEventListener('input', function (e) { it.name = e.target.value; drawChart(); updateCardLabels(); });
        h.querySelector('input').addEventListener('input', function (e) {
          var cm = parseHeight(e.target.value);
          if (cm && cm > 0) { it.cm = cm; hNote.textContent = fmtBoth(cm); drawChart(); updateCardLabels(); }
          else hNote.textContent = 'Not a height yet';
        });
        put(box, U.row(name, el('div', { class: 'field' }, h, hNote)));
        if (it.kind === 'person') {
          put(box, U.row(
            seg([{ value: 'man', label: 'Man' }, { value: 'woman', label: 'Woman' }, { value: 'child', label: 'Child' }], it.figure, function (v) { it.figure = v; drawChart(); }),
            seg([{ value: 'slim', label: 'Slim' }, { value: 'average', label: 'Average' }, { value: 'broad', label: 'Broad' }], it.build, function (v) { it.build = v; drawChart(); })));
        }
        if (it.kind === 'box') {
          var w = U.input({ label: 'Width', value: String(Math.round(it.w)), 'aria-label': 'Width' });
          w.querySelector('input').addEventListener('input', function (e) { var v = parseHeight(e.target.value); if (v) { it.w = v; drawChart(); } });
          put(box, w);
        }
        if (it.kind !== 'photo') put(box, colourPicker(it.color, function (c) { it.color = c; drawChart(); updateCardLabels(); }));
        return box;
      }

      function updateCardLabels() {
        Array.prototype.forEach.call(list.querySelectorAll('.hcard'), function (card) {
          var it = state.items.filter(function (i) { return String(i.id) === card.dataset.id; })[0];
          if (!it) return;
          card.querySelector('.nm').textContent = it.name;
          card.querySelector('.ht').textContent = fmtBoth(it.cm);
          card.querySelector('.dot').style.background = it.color;
        });
      }

      function buildList() {
        listHead.textContent = 'On the chart (' + state.items.length + '/12)';
        fill(list);
        state.items.forEach(function (it, idx) {
          var card = el('div', { class: 'hcard', dataset: { id: String(it.id) } },
            el('button', { type: 'button', class: 'main', onclick: function () { editing = editing === it.id ? null : it.id; buildList(); } },
              el('span', { class: 'dot', style: { background: it.color } }), el('b', { class: 'nm', text: it.name }), el('br'),
              el('small', { class: 'ht', text: fmtBoth(it.cm) })),
            el('button', { type: 'button', class: 'btn ghost mini', 'aria-label': 'Move left', title: 'Move left', disabled: idx === 0, onclick: function () { move(idx, -1); } }, '←'),
            el('button', { type: 'button', class: 'btn ghost mini', 'aria-label': 'Move right', title: 'Move right', disabled: idx === state.items.length - 1, onclick: function () { move(idx, 1); } }, '→'),
            el('button', { type: 'button', class: 'btn ghost mini', 'aria-label': 'Remove ' + it.name, title: 'Remove', onclick: function () {
              state.items.splice(idx, 1); delete photos[it.id]; if (editing === it.id) editing = null; refresh();
            } }, '✕'));
          list.appendChild(card);
          if (editing === it.id) list.appendChild(editor(it));
        });
        if (!state.items.length) list.appendChild(U.note('The chart is empty. Add a person, object, photo or box above.'));
      }

      function move(idx, d) {
        var j = idx + d;
        if (j < 0 || j >= state.items.length) return;
        var t = state.items[idx]; state.items[idx] = state.items[j]; state.items[j] = t;
        refresh();
      }

      function refresh() { unitSeg.set(state.unit); drawChart(); buildList(); }

      put(root, 
        U.panel(null, toolbar, shareOut, el('div', { style: { marginTop: '10px' } }, chartWrap), compareOut),
        U.panel('Add to the chart', addTab, el('div', { style: { marginTop: '10px' } }, addBody)),
        U.panel(null, U.btnrow(listHead, U.button('Clear all', function () { state.items = []; photos = {}; editing = null; refresh(); }, 'ghost')), list));
      buildAdd();
      refresh();
    }
  });

  /* ======================================================================
     Online Teleprompter
     ====================================================================== */

  var TP_DEFAULT = 'Welcome to your teleprompter.\n\nPress Start, and this text scrolls up at a steady reading pace. Keep your eyes on the line in the middle and read what crosses it.\n\n' +
    'Press the space bar, or tap the screen, to pause and carry on. The up and down arrows change the speed. Left and right jump back and forward. Plus and minus change the text size, and M mirrors the text for teleprompter glass. Press Escape to close.\n\n' +
    'Replace this text with your own script, set a comfortable speed in words per minute, and press Start teleprompter when you are ready. Good luck with your recording today!';

  function countWords(s) { var m = String(s).trim().match(/\S+/g); return m ? m.length : 0; }
  function mmss(sec) { sec = Math.round(sec); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }

  Tools.register({
    id: 'teleprompter',
    category: 'video',
    name: 'Teleprompter',
    description: 'Scroll a script at a set speaking pace, full screen, with mirroring, keyboard control and camera recording.',
    keywords: ['teleprompter', 'prompter', 'script', 'autocue', 'mirror', 'reading', 'record'],
    render: function (root) {
      root.classList.add('g-soc');
      var fromLink = readParam('tp');
      var initial = TP_DEFAULT;
      if (fromLink) { try { initial = b64decode(fromLink); } catch (e) { /* keep default */ } }
      var ta = U.textarea({ label: 'Your script', 'aria-label': 'Your script', value: initial, rows: 10 });
      var script = ta.querySelector('textarea');
      var stats = U.note('');
      var opt = { wpm: 140, size: 56, width: 80, mirror: false, flip: false, left: false, line: true, countdown: true, camera: false };

      var speed = rangeField('Speed', { min: 60, max: 260, step: 10, value: 140 }, function (v) { return v + ' words per minute'; }, function (v) { opt.wpm = v; updateStats(); });
      var size = rangeField('Text size', { min: 24, max: 120, step: 4, value: 56 }, function (v) { return v + 'px'; }, function (v) { opt.size = v; });
      var width = rangeField('Text width', { min: 40, max: 100, step: 5, value: 80 }, function (v) { return v + '%'; }, function (v) { opt.width = v; });
      var tMirror = toggle('Mirror', false, function (v) { opt.mirror = v; }, 'Mirror left to right');
      var tFlip = toggle('Flip vertical', false, function (v) { opt.flip = v; }, 'Flip upside down');
      var tLeft = toggle('Left aligned', false, function (v) { opt.left = v; }, 'Centre the text');
      var tLine = toggle('Reading line', true, function (v) { opt.line = v; }, 'Reading line');
      var tCount = toggle('Countdown', true, function (v) { opt.countdown = v; }, '3 second countdown');
      var tCam = toggle('Camera and recording', false, function (v) { opt.camera = v; }, 'Show my camera behind the text and record');
      [tMirror, tFlip, tLeft, tLine, tCount, tCam].forEach(function (b, i) { b.setAttribute('aria-label', ['Mirror left to right', 'Flip upside down', 'Centre the text', 'Reading line', '3 second countdown', 'Show my camera behind the text and record'][i]); });

      function updateStats() {
        var n = countWords(script.value);
        stats.textContent = n + ' word' + (n === 1 ? '' : 's') + ' · about ' + mmss(n / opt.wpm * 60) + ' at ' + opt.wpm + ' words per minute';
      }
      script.addEventListener('input', updateStats);
      updateStats();

      var linkBox = el('div');
      function share() {
        var link = toolLink('teleprompter', 'tp', b64encode(script.value));
        fill(linkBox);
        var inp = el('input', { type: 'text', readOnly: true, value: link, class: 'mono', style: { width: '100%' } });
        put(linkBox, inp);
        try {
          var qr = QR.encode(link, { ecl: 'L' });
          put(linkBox, el('div', { style: { marginTop: '8px' } }, QR.toCanvas(qr, { scale: 4 })), U.note('Scan the code, or send the link. The script is inside the link itself.'));
        } catch (e) { put(linkBox, U.note('The script is too long for a QR code, but the link works.')); }
        U.copy(link);
      }

      /* --- prompter ---- */
      var session = null;
      function start() {
        if (!script.value.trim()) { U.toast('Type or paste a script first', 'err'); return; }
        if (session) session.close();
        session = prompter(script.value, opt, function (o) {
          speed.set(o.wpm); size.set(o.size); tMirror.set(o.mirror); updateStats();
          session = null;
        });
      }
      U.onTeardown(root, function () { if (session) session.close(); });

      put(root, 
        U.panel(null, ta, stats, U.btnrow(U.button('Start teleprompter', start, 'primary'), U.button('Open on another device', share, 'ghost'),
          U.button('Clear', function () { script.value = ''; updateStats(); script.focus(); }, 'ghost')), linkBox),
        U.panel('Settings', speed, size, width, U.btnrow(tMirror, tFlip, tLeft, tLine, tCount, tCam),
          U.note('Keys: Space or a clicker\'s Page Down to play and pause · ↑ ↓ speed · ← → jump · + − text size · M mirror · Esc close')));
    }
  });

  function prompter(text, opt0, onClose) {
    var opt = Object.assign({}, opt0);
    var overlay = el('div', { class: 'tp-overlay', tabIndex: 0 });
    var host = el('div', { class: 'g-soc' }, overlay);
    var video = null, stream = null, recorder = null, chunks = [];
    var scroller = el('div', { class: 'tp-scroll' });
    var body = el('div', { class: 'tp-text' });
    body.textContent = text;
    put(scroller, el('div', { style: { height: '40vh' } }), body, el('div', { style: { height: '70vh' } }));
    var line = el('div', { class: 'tp-line' });
    var fadeTop = el('div', { class: 'tp-fade', style: { top: 0, background: 'linear-gradient(#000,transparent)' } });
    var fadeBot = el('div', { class: 'tp-fade', style: { bottom: 0, background: 'linear-gradient(transparent,#000)' } });
    var info = el('span', { style: { color: '#ccc', alignSelf: 'center', fontSize: '13px' } });
    var playBtn = U.button('Pause', function (e) { e.stopPropagation(); togglePlay(); });
    var recBtn = U.button('Record', function (e) { e.stopPropagation(); toggleRecord(); });
    recBtn.style.display = 'none';
    var bar = el('div', { class: 'tp-bar', onclick: function (e) { e.stopPropagation(); } },
      playBtn, U.button('Slower', function () { setWpm(opt.wpm - 10); }), U.button('Faster', function () { setWpm(opt.wpm + 10); }),
      U.button('A−', function () { setSize(opt.size - 4); }), U.button('A+', function () { setSize(opt.size + 4); }),
      U.button('Mirror', function () { opt.mirror = !opt.mirror; applyStyle(); }), recBtn, info,
      U.button('Close', function () { close(); }));
    var countEl = el('div', { class: 'tp-count' });
    put(overlay, scroller, fadeTop, fadeBot, line, countEl, bar);
    document.body.appendChild(host);
    overlay.focus();
    if (overlay.requestFullscreen) overlay.requestFullscreen().catch(function () {});

    var pos = 0, playing = false, last = 0, raf = 0, countTimer = null;

    function applyStyle() {
      body.style.fontSize = opt.size + 'px';
      body.style.width = opt.width + '%';
      body.style.textAlign = opt.left ? 'left' : 'center';
      var sx = opt.mirror ? -1 : 1, sy = opt.flip ? -1 : 1;
      scroller.style.transform = 'translateY(' + (-pos) + 'px)';
      overlay.style.transform = '';
      body.style.transform = 'scale(' + sx + ',' + sy + ')';
      line.style.display = opt.line ? '' : 'none';
      info.textContent = opt.wpm + ' wpm · ' + opt.size + 'px';
    }
    function pxPerSecond() {
      var words = Math.max(1, countWords(text));
      return body.offsetHeight / words * opt.wpm / 60;
    }
    function frame(t) {
      if (!playing) return;
      if (last) pos += pxPerSecond() * (t - last) / 1000;
      last = t;
      var maxPos = body.offsetHeight + overlay.clientHeight * 0.1;
      if (pos >= maxPos) { pos = maxPos; playing = false; playBtn.textContent = 'Play'; }
      scroller.style.transform = 'translateY(' + (-pos) + 'px)';
      raf = requestAnimationFrame(frame);
    }
    function play() { playing = true; last = 0; playBtn.textContent = 'Pause'; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
    function pause() { playing = false; playBtn.textContent = 'Play'; cancelAnimationFrame(raf); }
    function togglePlay() { if (countTimer) return; playing ? pause() : play(); }
    function setWpm(v) { opt.wpm = Math.max(60, Math.min(260, v)); applyStyle(); }
    function setSize(v) {
      var ratio = pos / Math.max(1, body.offsetHeight);
      opt.size = Math.max(24, Math.min(120, v)); applyStyle();
      pos = ratio * body.offsetHeight;
      scroller.style.transform = 'translateY(' + (-pos) + 'px)';
    }
    function jump(d) { pos = Math.max(0, pos + d * opt.size * 1.35 * 3); scroller.style.transform = 'translateY(' + (-pos) + 'px)'; }

    function onKey(e) {
      var k = e.key;
      if (k === ' ' || k === 'PageDown' || k === 'Enter') { e.preventDefault(); togglePlay(); }
      else if (k === 'PageUp') { e.preventDefault(); jump(-1); }
      else if (k === 'ArrowUp') { e.preventDefault(); setWpm(opt.wpm + 10); }
      else if (k === 'ArrowDown') { e.preventDefault(); setWpm(opt.wpm - 10); }
      else if (k === 'ArrowLeft') { e.preventDefault(); jump(-1); }
      else if (k === 'ArrowRight') { e.preventDefault(); jump(1); }
      else if (k === '+' || k === '=') { e.preventDefault(); setSize(opt.size + 4); }
      else if (k === '-' || k === '_') { e.preventDefault(); setSize(opt.size - 4); }
      else if (k === 'm' || k === 'M') { opt.mirror = !opt.mirror; applyStyle(); }
      else if (k === 'Escape') { close(); }
    }
    document.addEventListener('keydown', onKey, true);
    overlay.addEventListener('click', togglePlay);
    function onFsChange() { if (!document.fullscreenElement && overlay.isConnected && overlay._wasFs) close(); if (document.fullscreenElement === overlay) overlay._wasFs = true; }
    document.addEventListener('fullscreenchange', onFsChange);

    function toggleRecord() {
      if (!stream) return;
      if (recorder && recorder.state === 'recording') { recorder.stop(); return; }
      chunks = [];
      try { recorder = new MediaRecorder(stream); } catch (e) { U.toast('Recording is not supported here', 'err'); return; }
      recorder.ondataavailable = function (ev) { if (ev.data.size) chunks.push(ev.data); };
      recorder.onstop = function () {
        recBtn.textContent = 'Record';
        var type = recorder.mimeType || 'video/webm';
        U.saveBlob('teleprompter-recording.' + (type.indexOf('mp4') > -1 ? 'mp4' : 'webm'), new Blob(chunks, { type: type }));
      };
      recorder.start(500);
      recBtn.textContent = 'Stop recording';
    }

    if (opt.camera && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(function (s) {
        if (!overlay.isConnected) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
        stream = s;
        video = el('video', { class: 'tp-video', autoplay: true, muted: true, playsInline: true });
        video.muted = true;
        video.srcObject = s;
        overlay.insertBefore(video, scroller);
        recBtn.style.display = '';
      }).catch(function (err) { U.toast('Camera unavailable: ' + (err.message || err.name), 'err'); });
    }

    function close() {
      if (!overlay.isConnected) return;
      pause();
      clearInterval(countTimer);
      if (recorder && recorder.state === 'recording') recorder.stop();
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('fullscreenchange', onFsChange);
      if (document.fullscreenElement === overlay && document.exitFullscreen) document.exitFullscreen().catch(function () {});
      host.remove();
      onClose(opt);
    }

    applyStyle();
    if (opt.countdown) {
      var n = 3;
      countEl.textContent = n;
      countTimer = setInterval(function () {
        n--;
        if (n <= 0) { clearInterval(countTimer); countTimer = null; countEl.textContent = ''; play(); }
        else countEl.textContent = n;
      }, 1000);
    } else play();

    return { close: close };
  }

  /* ======================================================================
     Fancy Text Generator
     ====================================================================== */

  var FANCY = (function () {
    var UP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', LO = 'abcdefghijklmnopqrstuvwxyz', DG = '0123456789';
    function cp(n) { return String.fromCodePoint(n); }
    function alpha(upBase, loBase, digitBase, exceptions) {
      var map = {};
      for (var i = 0; i < 26; i++) {
        if (upBase !== null) map[UP[i]] = cp(upBase + i);
        if (loBase !== null) map[LO[i]] = cp(loBase + i);
      }
      if (digitBase !== null && digitBase !== undefined) for (var d = 0; d < 10; d++) map[DG[d]] = cp(digitBase + d);
      Object.keys(exceptions || {}).forEach(function (k) { map[k] = exceptions[k]; });
      return map;
    }
    function both(base, digits) {
      var m = {};
      for (var i = 0; i < 26; i++) { m[UP[i]] = cp(base + i); m[LO[i]] = cp(base + i); }
      if (digits) for (var d = 0; d < 10; d++) m[DG[d]] = digits[d];
      return m;
    }
    function fromStrings(from, to) {
      var m = {}, t = Array.from(to);
      Array.from(from).forEach(function (c, i) { m[c] = t[i]; });
      return m;
    }
    var circled = alpha(0x24B6, 0x24D0, null, {});
    circled['0'] = '⓪'; for (var d = 1; d < 10; d++) circled[String(d)] = cp(0x2460 + d - 1);
    var paren = {}; for (var i = 0; i < 26; i++) { paren[UP[i]] = cp(0x249C + i); paren[LO[i]] = cp(0x249C + i); }
    for (var p = 1; p < 10; p++) paren[String(p)] = cp(0x2474 + p - 1);
    var wide = alpha(0xFF21, 0xFF41, 0xFF10, { ' ': '　' });
    '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'.split('').forEach(function (c) { wide[c] = cp(c.charCodeAt(0) + 0xFEE0); });
    var small = fromStrings('abcdefghijklmnopqrstuvwxyz', 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ');
    Object.keys(small).forEach(function (k) { small[k.toUpperCase()] = small[k]; });
    var flip = fromStrings('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?\'"()[]{}<>&_;',
      'ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz∀ꓭƆꓷƎℲ⅁HIſꓘ⅂WNOԀΌꓤS⊥∩ΛMX⅄Z0ƖᄅƐㄣϛ9ㄥ86˙\'¡¿,„)(][}{><⅋‾؛');

    function mapper(map) { return function (s) { return Array.from(s).map(function (c) { return map[c] || c; }).join(''); }; }
    function combining(mark) { return function (s) { return Array.from(s).map(function (c) { return c === '\n' ? c : c + mark; }).join(''); }; }

    var styles = [
      { name: 'Bold', group: 'bold', fn: mapper(alpha(0x1D400, 0x1D41A, 0x1D7CE)) },
      { name: 'Italic', group: 'bold', fn: mapper(alpha(0x1D434, 0x1D44E, null, { h: 'ℎ' })) },
      { name: 'Bold italic', group: 'bold', fn: mapper(alpha(0x1D468, 0x1D482, null)) },
      { name: 'Sans bold', group: 'bold', fn: mapper(alpha(0x1D5D4, 0x1D5EE, 0x1D7EC)) },
      { name: 'Sans italic', group: 'bold', fn: mapper(alpha(0x1D608, 0x1D622, null)) },
      { name: 'Sans bold italic', group: 'bold', fn: mapper(alpha(0x1D63C, 0x1D656, null)) },
      { name: 'Sans', group: 'bold', fn: mapper(alpha(0x1D5A0, 0x1D5BA, 0x1D7E2)) },
      { name: 'Typewriter', group: 'bold', fn: mapper(alpha(0x1D670, 0x1D68A, 0x1D7F6)) },
      { name: 'Cursive', group: 'cursive', fn: mapper(alpha(0x1D49C, 0x1D4B6, null, { B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ', e: 'ℯ', g: 'ℊ', o: 'ℴ' })) },
      { name: 'Bold cursive', group: 'cursive', fn: mapper(alpha(0x1D4D0, 0x1D4EA, null)) },
      { name: 'Gothic', group: 'cursive', fn: mapper(alpha(0x1D504, 0x1D51E, null, { C: 'ℭ', H: 'ℌ', I: 'ℑ', R: 'ℜ', Z: 'ℨ' })) },
      { name: 'Bold gothic', group: 'cursive', fn: mapper(alpha(0x1D56C, 0x1D586, null)) },
      { name: 'Outline', group: 'cursive', fn: mapper(alpha(0x1D538, 0x1D552, 0x1D7D8, { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ' })) },
      { name: 'Bubbles', group: 'bubbles', fn: mapper(circled) },
      { name: 'Dark bubbles', group: 'bubbles', fn: mapper(both(0x1F150, ['⓿', '❶', '❷', '❸', '❹', '❺', '❻', '❼', '❽', '❾'])) },
      { name: 'Boxes', group: 'bubbles', fn: mapper(both(0x1F130)) },
      { name: 'Dark boxes', group: 'bubbles', fn: mapper(both(0x1F170)) },
      { name: 'Brackets', group: 'bubbles', fn: mapper(paren) },
      { name: 'Wide', group: 'wide', fn: mapper(wide) },
      { name: 'Aesthetic', group: 'wide', fn: function (s) { return Array.from(mapper(wide)(s)).join(' '); } },
      { name: 'Small caps', group: 'wide', fn: mapper(small) },
      { name: 'Strikethrough', group: 'lines', fn: combining('̶') },
      { name: 'Underline', group: 'lines', fn: combining('̲') },
      { name: 'Double underline', group: 'lines', fn: combining('̳') },
      { name: 'Slashed', group: 'lines', fn: combining('̸') },
      { name: 'Wavy underline', group: 'lines', fn: combining('̰') },
      { name: 'Upside down', group: 'playful', fn: function (s) { return Array.from(s).reverse().map(function (c) { return flip[c] || c; }).join(''); } }
    ];

    /* Reverse table: every styled letter back to plain ASCII. */
    var back = {};
    styles.forEach(function (st) {
      if (st.name === 'Upside down' || st.name === 'Aesthetic' || st.group === 'lines') return;
      (UP + LO + DG).split('').forEach(function (c) {
        var out = st.fn(c);
        if (out !== c && !back[out]) back[out] = st.name === 'Small caps' || /boxes|Dark bubbles|Brackets/.test(st.name) ? c.toLowerCase() : c;
      });
    });
    ['🅐', '🄰', '🅰'].forEach(function (b) { for (var i = 0; i < 26; i++) back[cp(b.codePointAt(0) + i)] = UP[i]; });
    back['　'] = ' ';

    function toNormal(s) {
      s = String(s).replace(/[̶̸̰̲̳]/g, '');
      return Array.from(s).map(function (c) { return back[c] !== undefined ? back[c] : c; }).join('');
    }

    return { styles: styles, toNormal: toNormal };
  })();

  var DECORATIONS = [
    ['', ''], ['★彡 ', ' 彡★'], ['✧･ﾟ: ', ' :ﾟ･✧'], ['♡ ', ' ♡'], ['✿ ', ' ✿'], ['꧁ ', ' ꧂'], ['【 ', ' 】'], ['『 ', ' 』'], ['•°•° ', ' °•°•'], ['»» ', ' ««']
  ];
  var FANCY_GROUPS = [
    { value: 'all', label: 'All' }, { value: 'bold', label: 'Bold & italic' }, { value: 'cursive', label: 'Cursive & gothic' },
    { value: 'bubbles', label: 'Bubbles & boxes' }, { value: 'wide', label: 'Wide & small' }, { value: 'lines', label: 'Lines' }, { value: 'playful', label: 'Playful' }
  ];

  Tools.register({
    id: 'fancy-text-generator',
    category: 'social',
    name: 'Fancy Text Generator',
    description: 'Turn text into bold, cursive, bubble, gothic and upside-down Unicode letters, and back again.',
    keywords: ['fancy', 'text', 'font', 'bold', 'italic', 'cursive', 'gothic', 'unicode', 'bio', 'upside down', 'small caps'],
    render: function (root) {
      root.classList.add('g-soc');
      var deco = 0, group = 'all';
      var fancyBox = U.textarea({ label: 'Your text', 'aria-label': 'Your text', value: 'Stay creative', rows: 2 });
      var fancyTa = fancyBox.querySelector('textarea');
      var decoSeg = seg(DECORATIONS.map(function (d, i) { return { value: String(i), label: i ? (d[0] + d[1]).replace(/\s+/g, ' ').trim() : 'None' }; }), '0', function (v) { deco = Number(v); draw(); });
      var groupSeg = seg(FANCY_GROUPS, 'all', function (v) { group = v; draw(); });
      var listBox = el('div', { class: 'fancy-list' });

      function draw() {
        var text = fancyTa.value;
        fill(listBox);
        FANCY.styles.forEach(function (st) {
          if (group !== 'all' && st.group !== group) return;
          var out = text ? DECORATIONS[deco][0] + st.fn(text) + DECORATIONS[deco][1] : '';
          var chars = graphemes(out), units = out.length;
          var meta = chars + ' chars' + (units !== chars ? ' · ' + units + ' units' : '');
          listBox.appendChild(el('div', { class: 'fancy-row' },
            el('div', { class: 'lbl' }, el('b', { text: st.name }), el('small', { text: meta })),
            el('button', { type: 'button', class: 'val', 'aria-label': 'Copy ' + st.name + ' text', title: 'Copy', onclick: function () { U.copy(out); } }, out || '—'),
            U.button('Copy', function () { U.copy(out); }, 'ghost')));
        });
      }
      fancyTa.addEventListener('input', draw);

      var backBox = U.textarea({ label: 'Fancy text to convert back', 'aria-label': 'Fancy text to convert back', rows: 3, placeholder: 'Paste fancy text here' });
      var backTa = backBox.querySelector('textarea');
      var backOut = U.out('');
      backOut.setAttribute('data-placeholder', 'Normal text appears here');
      function drawBack() { backOut.textContent = backTa.value ? FANCY.toNormal(backTa.value) : ''; }
      backTa.addEventListener('input', drawBack);

      var fancyPane = el('div', {}, fancyBox, el('div', { class: 'field' }, el('label', { text: 'Decoration' }), decoSeg),
        el('div', { style: { margin: '10px 0' } }, groupSeg), listBox,
        U.note('These are real Unicode characters, not a font, so they stay styled wherever you paste them. Screen readers may spell them out letter by letter or skip them, so keep important details like your name also in normal text. A few rare styles can show as boxes on older phones.'));
      var backPane = el('div', { style: { display: 'none' } }, backBox, backOut,
        U.btnrow(U.copyBtn('Copy', function () { return backOut.textContent; })),
        U.note('Useful when a form, search box or screen reader cannot read fancy letters. Upside down text cannot be turned back automatically.'));
      var modeSeg = seg([{ value: 'fancy', label: 'Make it fancy' }, { value: 'back', label: 'Back to normal text' }], 'fancy', function (v) {
        fancyPane.style.display = v === 'fancy' ? '' : 'none';
        backPane.style.display = v === 'back' ? '' : 'none';
      });
      put(root, U.panel(null, modeSeg, el('div', { style: { marginTop: '12px' } }, fancyPane, backPane)));
      draw();
    }
  });

  /* ======================================================================
     Instagram Grid Splitter
     ====================================================================== */

  Tools.register({
    id: 'instagram-grid-splitter',
    category: 'social',
    name: 'Instagram Grid Splitter',
    description: 'Split one photo into profile grid posts or seamless carousel slides, numbered in posting order.',
    keywords: ['instagram', 'grid', 'split', 'splitter', 'carousel', 'panorama', 'puzzle', 'feed', 'tiles'],
    render: function (root) {
      root.classList.add('g-soc');
      var img = null, fileName = 'photo';
      var st = { mode: 'grid', shape: '3:4', rows: 3, slides: 3, cshape: '4:5', zoom: 1, gap: 0, fmt: 'jpg', ox: 0, oy: 0 };
      var dz = U.dropzone({ accept: 'image/*', label: 'Choose a photo', hint: 'or drop it here. Split it into 3, 6, 9 or more posts that line up on your profile, or into carousel slides that swipe as one picture.', onFiles: load });
      var editor = el('div', { style: { display: 'none' } });
      put(root, U.panel(null, dz, editor));

      function load(files) {
        U.loadImage(files[0]).then(function (im) {
          img = im; fileName = files[0].name.replace(/\.[^.]+$/, '') || 'photo';
          st.zoom = 1; st.ox = 0; st.oy = 0; zoom.set(1);
          dz.style.display = 'none'; editor.style.display = '';
          redraw();
        }).catch(function (e) { U.toast(e.message, 'err'); });
      }

      function layout() {
        if (st.mode === 'grid') {
          var r = st.shape === '3:4' ? 4 / 3 : 1;
          return { cols: 3, rows: st.rows, tw: 1080, th: Math.round(1080 * r) };
        }
        var cr = { '4:5': 5 / 4, '1:1': 1, '3:4': 4 / 3 }[st.cshape];
        return { cols: st.slides, rows: 1, tw: 1080, th: Math.round(1080 * cr) };
      }

      /* Virtual layout: tiles plus the gaps between them (in output pixels). */
      function geometry() {
        var L = layout();
        var gapPx = st.mode === 'grid' ? L.tw * st.gap / 100 : 0;
        var W = L.cols * L.tw + (L.cols - 1) * gapPx, H = L.rows * L.th + (L.rows - 1) * gapPx;
        var cover = Math.max(W / img.naturalWidth, H / img.naturalHeight) * st.zoom;
        var dw = img.naturalWidth * cover, dh = img.naturalHeight * cover;
        var maxX = Math.max(0, (dw - W) / 2), maxY = Math.max(0, (dh - H) / 2);
        st.ox = Math.max(-maxX, Math.min(maxX, st.ox));
        st.oy = Math.max(-maxY, Math.min(maxY, st.oy));
        var ix = (W - dw) / 2 + st.ox, iy = (H - dh) / 2 + st.oy;
        return { L: L, gapPx: gapPx, W: W, H: H, scale: cover, ix: ix, iy: iy, dw: dw, dh: dh };
      }

      function tileRect(g, r, c) {
        return { x: c * (g.L.tw + g.gapPx), y: r * (g.L.th + g.gapPx), w: g.L.tw, h: g.L.th };
      }
      function postNumber(g, r, c) {
        var n = g.L.cols * g.L.rows;
        return st.mode === 'grid' ? n - (r * g.L.cols + c) : c + 1;
      }

      function renderTile(g, r, c) {
        var t = tileRect(g, r, c);
        var cv = el('canvas', { width: t.w, height: t.h });
        var ctx = cv.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, t.w, t.h);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, g.ix - t.x, g.iy - t.y, g.dw, g.dh);
        return cv;
      }

      var preview = el('canvas', { class: 'pv' });
      var warn = U.note('');
      var postsRow = el('div', { class: 'btnrow' });
      var orderNote = U.note('');
      var dlAll = U.button('Download all', downloadAll, 'primary');
      var progress = U.progress();

      function redraw() {
        if (!img) return;
        var g = geometry();
        var maxW = Math.min(720, root.clientWidth - 40 || 720);
        var s = Math.min(maxW / g.W, 520 / g.H);
        preview.width = Math.round(g.W * s); preview.height = Math.round(g.H * s);
        var ctx = preview.getContext('2d');
        ctx.clearRect(0, 0, preview.width, preview.height);
        ctx.save(); ctx.scale(s, s);
        ctx.drawImage(img, g.ix, g.iy, g.dw, g.dh);
        /* gaps shown as white strips, tile borders and numbers */
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        for (var c = 1; c < g.L.cols; c++) ctx.fillRect(c * g.L.tw + (c - 1) * g.gapPx, 0, Math.max(g.gapPx, 6 / s), g.H);
        for (var r = 1; r < g.L.rows; r++) ctx.fillRect(0, r * g.L.th + (r - 1) * g.gapPx, g.W, Math.max(g.gapPx, 6 / s));
        ctx.font = 'bold ' + (90) + 'px system-ui,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (r = 0; r < g.L.rows; r++) for (c = 0; c < g.L.cols; c++) {
          var t = tileRect(g, r, c);
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.beginPath(); ctx.arc(t.x + 90, t.y + 90, 62, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.fillText(String(postNumber(g, r, c)), t.x + 90, t.y + 94);
        }
        ctx.restore();
        var enlarge = 1 / Math.min(img.naturalWidth / g.dw, img.naturalHeight / g.dh);
        enlarge = g.scale;
        warn.textContent = enlarge > 1.05 ? 'This photo is being enlarged ' + (Math.round(enlarge * 10) / 10) + '×, so posts may look soft. A larger photo, or fewer ' + (st.mode === 'grid' ? 'rows' : 'slides') + ', will be sharper.' : '';
        var n = g.L.cols * g.L.rows;
        dlAll.textContent = 'Download all ' + n + ' (ZIP)';
        orderNote.textContent = st.mode === 'grid'
          ? 'Post them in order: 1 first, ' + n + ' last. Each new post appears at the top left, so posting 1 first puts it at the bottom right where it belongs.'
          : 'Add the slides to one carousel post in order, 1 to ' + n + '. Swiping then moves across the picture.';
        fill(postsRow);
        var order = [];
        for (r = 0; r < g.L.rows; r++) for (c = 0; c < g.L.cols; c++) order.push({ r: r, c: c, n: postNumber(g, r, c) });
        order.sort(function (a, b) { return a.n - b.n; }).forEach(function (o) {
          postsRow.appendChild(U.button((st.mode === 'grid' ? 'Post ' : 'Slide ') + o.n + ' ', function () {
            var cv = renderTile(geometry(), o.r, o.c);
            canvasBlob(cv, st.fmt === 'png' ? 'image/png' : 'image/jpeg', 0.92).then(function (b) { U.saveBlob(fileName + '-' + String(o.n).padStart(2, '0') + '.' + st.fmt, b); });
          }, 'ghost'));
        });
        sizeNote.textContent = 'Your photo never leaves your device. Every ' + (st.mode === 'grid' ? 'post' : 'slide') + ' is ' + g.L.tw + ' × ' + g.L.th + ' px.';
      }

      function downloadAll() {
        var g = geometry(), n = g.L.cols * g.L.rows;
        progress.set('Preparing ' + n + ' images…', 0);
        U.script('assets/vendor/jszip/jszip.min.js').then(async function () {
          var zip = new JSZip(), done = 0;
          for (var r = 0; r < g.L.rows; r++) for (var c = 0; c < g.L.cols; c++) {
            var num = postNumber(g, r, c);
            var b = await canvasBlob(renderTile(g, r, c), st.fmt === 'png' ? 'image/png' : 'image/jpeg', 0.92);
            zip.file(fileName + '-' + String(num).padStart(2, '0') + '.' + st.fmt, b);
            progress.set('Preparing images…', ++done / n);
          }
          var blob = await zip.generateAsync({ type: 'blob' });
          U.saveBlob(fileName + '-' + (st.mode === 'grid' ? 'grid' : 'carousel') + '.zip', blob);
          progress.done('Saved ' + n + ' images in a ZIP.');
        }).catch(function (e) { progress.fail(e); });
      }

      /* dragging and wheel zoom */
      var drag = null;
      preview.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, ox: st.ox, oy: st.oy }; preview.setPointerCapture(e.pointerId); preview.style.cursor = 'grabbing'; });
      preview.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var g = geometry(), s = preview.width / g.W;
        st.ox = drag.ox + (e.clientX - drag.x) / s; st.oy = drag.oy + (e.clientY - drag.y) / s;
        redraw();
      });
      preview.addEventListener('pointerup', function () { drag = null; preview.style.cursor = ''; });
      preview.addEventListener('wheel', function (e) {
        e.preventDefault();
        st.zoom = Math.max(1, Math.min(4, st.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08)));
        zoom.set(st.zoom.toFixed(2)); redraw();
      }, { passive: false });

      var modeSeg = seg([{ value: 'grid', label: 'Profile grid' }, { value: 'carousel', label: 'Carousel panorama' }], 'grid', function (v) { st.mode = v; syncMode(); redraw(); });
      var shapeSeg = seg([{ value: '3:4', label: '3:4 portrait' }, { value: '1:1', label: '1:1 square' }], '3:4', function (v) { st.shape = v; redraw(); });
      var rowsSeg = seg([1, 2, 3, 4, 5].map(function (n) { return { value: String(n), label: n + ' × 3' }; }), '3', function (v) { st.rows = Number(v); redraw(); });
      var slidesSeg = seg([2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return { value: String(n), label: String(n) }; }), '3', function (v) { st.slides = Number(v); redraw(); });
      var cshapeSeg = seg([{ value: '4:5', label: '4:5 portrait' }, { value: '1:1', label: '1:1 square' }, { value: '3:4', label: '3:4 portrait' }], '4:5', function (v) { st.cshape = v; redraw(); });
      var zoom = rangeField('Zoom', { min: 1, max: 4, step: 0.01, value: 1 }, function (v) { return v.toFixed(2) + '×'; }, function (v) { st.zoom = v; redraw(); });
      zoom.input.setAttribute('aria-label', 'Zoom');
      var gap = rangeField('Leave out the gaps between posts', { min: 0, max: 4, step: 0.1, value: 0 }, function (v) { return v ? v.toFixed(1) + '%' : 'off'; }, function (v) { st.gap = v; redraw(); });
      gap.input.setAttribute('aria-label', 'Gap between posts');
      var fmtSeg = seg([{ value: 'jpg', label: 'JPG' }, { value: 'png', label: 'PNG' }], 'jpg', function (v) { st.fmt = v; });
      var sizeNote = U.note('');
      var gridOpts = el('div', {}, el('div', { class: 'field' }, el('label', { text: 'Post shape' }), shapeSeg), el('div', { class: 'field' }, el('label', { text: 'Rows (3 posts each)' }), rowsSeg));
      var carOpts = el('div', { style: { display: 'none' } }, el('div', { class: 'field' }, el('label', { text: 'Slides' }), slidesSeg), el('div', { class: 'field' }, el('label', { text: 'Slide shape' }), cshapeSeg));
      var gapWrap = el('div', {}, gap, U.note('The profile shows thin lines between posts. Cutting out the same strip keeps straight lines, text and faces aligned across them. Around 1% suits most phones.'));
      function syncMode() { gridOpts.style.display = st.mode === 'grid' ? '' : 'none'; carOpts.style.display = st.mode === 'grid' ? 'none' : ''; gapWrap.style.display = st.mode === 'grid' ? '' : 'none'; }

      var another = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onchange: function () { if (another.files.length) load(another.files); another.value = ''; } });
      put(editor, 
        el('div', { class: 'field' }, el('label', { text: 'Make' }), modeSeg), gridOpts, carOpts, zoom, gapWrap,
        U.note('Drag the picture to move it, scroll or use the slider to zoom. Numbers show the order to post in.'),
        U.btnrow(U.button('Reset position', function () { st.ox = 0; st.oy = 0; st.zoom = 1; zoom.set(1); redraw(); }, 'ghost')),
        preview, warn,
        U.btnrow(fmtSeg, dlAll, U.button('Choose another photo', function () { another.click(); }, 'ghost'), another),
        progress, orderNote, postsRow, sizeNote);
    }
  });

  /* ======================================================================
     Profile Picture Maker
     ====================================================================== */

  var PP_BG = [
    { name: 'Violet', stops: ['#8b5cf6', '#6366f1'] }, { name: 'Peach', stops: ['#fdba74', '#fb7185'] },
    { name: 'Sky', stops: ['#7dd3fc', '#3b82f6'] }, { name: 'Lime', stops: ['#bef264', '#22c55e'] },
    { name: 'Night', stops: ['#1e293b', '#0f172a'] }, { name: 'Rose', stops: ['#fda4af', '#e11d48'] },
    { name: 'White', stops: ['#ffffff', '#f1f5f9'] }, { name: 'Grey', stops: ['#d1d5db', '#6b7280'] }
  ];
  var PP_RINGS = [
    { name: 'Story ring', stops: ['#feda75', '#fa7e1e', '#d62976', '#962fbf', '#4f5bd5'] },
    { name: 'Sunset ring', stops: ['#f59e0b', '#ef4444', '#db2777'] },
    { name: 'Ocean ring', stops: ['#06b6d4', '#3b82f6', '#1e3a8a'] },
    { name: 'Mint ring', stops: ['#6ee7b7', '#10b981', '#0d9488'] },
    { name: 'Gold ring', stops: ['#fde68a', '#d97706', '#fbbf24'] },
    { name: 'Rainbow ring', stops: ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ef4444'] },
    { name: 'White ring', stops: ['#ffffff', '#ffffff'] },
    { name: 'Black ring', stops: ['#000000', '#000000'] }
  ];
  var PP_LABELS = [
    { text: '#OPENTOWORK', color: '#057642' }, { text: '#HIRING', color: '#7c3aed' }, { text: 'AVAILABLE', color: '#0284c7' },
    { text: 'BIRTHDAY', color: '#db2777' }, { text: 'ON VACATION', color: '#ea580c' }
  ];

  function luminance(hex) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    var f = function (c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }

  Tools.register({
    id: 'profile-picture-maker',
    category: 'social',
    name: 'Profile Picture Maker',
    description: 'Make a round profile picture from a photo or initials, with rings, backgrounds and curved labels.',
    keywords: ['profile', 'picture', 'pfp', 'avatar', 'circle', 'open to work', 'hiring', 'ring', 'initials'],
    render: function (root) {
      root.classList.add('g-soc');
      var st = { mode: 'initials', name: 'Your Name', shape: 'circle', bg: 0, transparent: true, ring: 0, ringWidth: 4, gapWidth: 1.5, label: -1, labelText: '', zoom: 1, rot: 0, bright: 1, contrast: 1, sat: 1, ox: 0, oy: 0, out: 1080 };
      var img = null;
      var main = el('canvas', { class: 'pv', width: 400, height: 400, style: { width: '320px', height: '320px' } });
      var pv = [32, 48, 160].map(function (s) { return el('canvas', { width: s * 2, height: s * 2, style: { width: s + 'px', height: s + 'px' } }); });
      var previews = el('div', { class: 'pp-previews' },
        el('figure', {}, pv[0], el('figcaption', { text: 'Comment' })), el('figure', {}, pv[1], el('figcaption', { text: 'Chat' })), el('figure', {}, pv[2], el('figcaption', { text: 'Profile' })));

      function drawTo(canvas, size) {
        var ctx = canvas.getContext('2d');
        canvas.width = size; canvas.height = size;
        ctx.clearRect(0, 0, size, size);
        var ringW = st.ring >= 0 ? size * st.ringWidth / 100 : 0;
        var gapW = st.ring >= 0 ? size * st.gapWidth / 100 : 0;
        var inset = ringW + gapW;
        function shapePath(pad) {
          var x = pad, w = size - pad * 2;
          ctx.beginPath();
          if (st.shape === 'circle') ctx.arc(size / 2, size / 2, w / 2, 0, Math.PI * 2);
          else if (st.shape === 'rounded') { var r = w * 0.22; if (ctx.roundRect) ctx.roundRect(x, x, w, w, r); else ctx.rect(x, x, w, w); }
          else ctx.rect(x, x, w, w);
        }
        var bg = PP_BG[st.bg];
        var grad = ctx.createLinearGradient(0, 0, size, size);
        grad.addColorStop(0, bg.stops[0]); grad.addColorStop(1, bg.stops[1]);
        if (!st.transparent) { ctx.fillStyle = grad; ctx.fillRect(0, 0, size, size); }
        /* ring */
        if (st.ring >= 0) {
          var rg = PP_RINGS[st.ring];
          var cg = ctx.createConicGradient ? ctx.createConicGradient(-Math.PI / 2, size / 2, size / 2) : ctx.createLinearGradient(0, size, size, 0);
          rg.stops.forEach(function (c, i) { cg.addColorStop(i / (rg.stops.length - 1), c); });
          ctx.save(); shapePath(0); ctx.fillStyle = cg; ctx.fill();
          shapePath(ringW); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore();
        }
        ctx.save();
        shapePath(inset); ctx.clip();
        ctx.fillStyle = grad; ctx.fillRect(0, 0, size, size);
        var inner = size - inset * 2;
        if (st.mode === 'photo' && img) {
          var base = Math.max(inner / img.naturalWidth, inner / img.naturalHeight) * st.zoom;
          ctx.translate(size / 2 + st.ox * inner, size / 2 + st.oy * inner);
          ctx.rotate(st.rot * Math.PI / 180);
          ctx.filter = 'brightness(' + st.bright + ') contrast(' + st.contrast + ') saturate(' + st.sat + ')';
          ctx.drawImage(img, -img.naturalWidth * base / 2, -img.naturalHeight * base / 2, img.naturalWidth * base, img.naturalHeight * base);
          ctx.filter = 'none';
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        } else {
          var initials = st.name.trim().split(/\s+/).filter(Boolean).map(function (w) { return Array.from(w)[0]; }).slice(0, 2).join('').toUpperCase() || '?';
          var dark = (luminance(bg.stops[0]) + luminance(bg.stops[1])) / 2 > 0.45;
          ctx.fillStyle = dark ? '#111827' : '#ffffff';
          ctx.font = '600 ' + Math.round(inner * 0.38) + 'px system-ui,sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(initials, size / 2, size / 2 + inner * 0.02);
        }
        /* curved label */
        var labelText = st.labelText.trim() || (st.label >= 0 ? PP_LABELS[st.label].text : '');
        if (labelText) {
          var col = st.label >= 0 ? PP_LABELS[st.label].color : '#057642';
          var R = inner / 2, cx = size / 2, cy = size / 2;
          var band = R * 0.24;
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, R, Math.PI * 0.12, Math.PI * 0.88);
          ctx.arc(cx, cy, R - band, Math.PI * 0.88, Math.PI * 0.12, true);
          ctx.closePath();
          ctx.fillStyle = col; ctx.fill();
          ctx.fillStyle = '#ffffff';
          var fs = band * 0.62;
          ctx.font = '700 ' + fs + 'px system-ui,sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          var chars = Array.from(labelText), rr = R - band / 2;
          var widths = chars.map(function (c) { return ctx.measureText(c).width; });
          var total = widths.reduce(function (a, b) { return a + b; }, 0) * 1.06;
          var maxArc = rr * Math.PI * 0.72;
          if (total > maxArc) { fs *= maxArc / total; ctx.font = '700 ' + fs + 'px system-ui,sans-serif'; widths = chars.map(function (c) { return ctx.measureText(c).width; }); total = maxArc; }
          var angle = Math.PI / 2 + (total / rr) / 2;
          chars.forEach(function (c, i) {
            var a = widths[i] * 1.06 / rr;
            angle -= a / 2;
            ctx.save();
            ctx.translate(cx + rr * Math.cos(angle), cy + rr * Math.sin(angle));
            ctx.rotate(angle - Math.PI / 2);
            ctx.fillText(c, 0, 0);
            ctx.restore();
            angle -= a / 2;
          });
          ctx.restore();
        }
        ctx.restore();
        if (!st.transparent) {
          /* corners filled with the background colour */
          ctx.save(); ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = grad; ctx.fillRect(0, 0, size, size); ctx.restore();
        }
      }

      function redraw() {
        drawTo(main, 640);
        pv.forEach(function (c, i) { drawTo(c, [32, 48, 160][i] * 2); });
      }

      /* controls */
      var sizeSeg = seg([{ value: '1080', label: '1080 px' }, { value: '512', label: '512 px' }, { value: '400', label: '400 px' }], '1080', function (v) { st.out = Number(v); });
      var dl = U.button('Download PNG', function () {
        var c = el('canvas'); drawTo(c, st.out);
        canvasBlob(c).then(function (b) { U.saveBlob('profile-picture-' + st.out + '.png', b); });
      }, 'primary');
      var file = el('input', { type: 'file', accept: 'image/*', 'aria-label': 'Choose a photo', onchange: function () { if (file.files.length) loadPhoto(file.files[0]); } });
      var nameIn = U.input({ label: 'Your name', value: st.name, 'aria-label': 'Your name', oninput: function (e) { st.name = e.target.value; redraw(); } });
      var photoCtl = el('div', { style: { display: 'none' } });
      var zoomR = rangeField('Zoom', { min: 0.3, max: 4, step: 0.01, value: 1 }, function (v) { return v.toFixed(2) + '×'; }, function (v) { st.zoom = v; redraw(); });
      var rotR = rangeField('Rotate', { min: -180, max: 180, step: 1, value: 0 }, function (v) { return v + '°'; }, function (v) { st.rot = v; redraw(); });
      var brR = rangeField('Brightness', { min: 0.5, max: 1.5, step: 0.01, value: 1 }, function (v) { return Math.round(v * 100) + '%'; }, function (v) { st.bright = v; redraw(); });
      var coR = rangeField('Contrast', { min: 0.5, max: 1.5, step: 0.01, value: 1 }, function (v) { return Math.round(v * 100) + '%'; }, function (v) { st.contrast = v; redraw(); });
      var saR = rangeField('Colour', { min: 0, max: 2, step: 0.01, value: 1 }, function (v) { return Math.round(v * 100) + '%'; }, function (v) { st.sat = v; redraw(); });
      function resetPhoto() { st.zoom = 1; st.rot = 0; st.bright = 1; st.contrast = 1; st.sat = 1; st.ox = 0; st.oy = 0; [zoomR, rotR, brR, coR, saR].forEach(function (r, i) { r.set([1, 0, 1, 1, 1][i]); }); redraw(); }
      put(photoCtl, zoomR, rotR, brR, coR, saR, U.btnrow(U.button('Reset photo', resetPhoto, 'ghost'), U.button('Choose another photo', function () { file.click(); }, 'ghost')),
        U.note('Drag the picture to move your face into place. Zoom below 1× to show background around the photo.'));
      var photoPick = el('div', {}, file);
      var initialsCtl = el('div', { style: { display: 'none' } }, nameIn);
      var modeSeg = seg([{ value: 'photo', label: 'Photo' }, { value: 'initials', label: 'Initials' }], 'photo', function (v) { st.mode = v; syncMode(); redraw(); });
      function syncMode() {
        photoPick.style.display = st.mode === 'photo' && !img ? '' : 'none';
        photoCtl.style.display = st.mode === 'photo' && img ? '' : 'none';
        initialsCtl.style.display = st.mode === 'initials' || !img ? '' : 'none';
        if (st.mode === 'photo' && !img) initialsCtl.style.display = '';
      }
      function loadPhoto(f) {
        U.loadImage(f).then(function (im) { img = im; st.mode = 'photo'; modeSeg.set('photo'); resetPhoto(); syncMode(); })
          .catch(function (e) { U.toast(e.message, 'err'); });
        file.value = '';
      }

      var drag = null;
      main.addEventListener('pointerdown', function (e) { if (st.mode !== 'photo' || !img) return; drag = { x: e.clientX, y: e.clientY, ox: st.ox, oy: st.oy }; main.setPointerCapture(e.pointerId); });
      main.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var w = main.getBoundingClientRect().width;
        st.ox = drag.ox + (e.clientX - drag.x) / w; st.oy = drag.oy + (e.clientY - drag.y) / w; redraw();
      });
      main.addEventListener('pointerup', function () { drag = null; });

      var shapeSeg = seg([{ value: 'circle', label: 'Circle' }, { value: 'rounded', label: 'Rounded' }, { value: 'square', label: 'Square' }], 'circle', function (v) { st.shape = v; redraw(); });
      var bgRow = el('div', { class: 'swatches' });
      PP_BG.forEach(function (b, i) {
        bgRow.appendChild(el('button', { type: 'button', class: 'sw' + (i === 0 ? ' on' : ''), 'aria-label': b.name, title: b.name, 'aria-pressed': String(i === 0),
          style: { background: 'linear-gradient(135deg,' + b.stops[0] + ',' + b.stops[1] + ')' },
          onclick: function () { st.bg = i; Array.prototype.forEach.call(bgRow.children, function (c, j) { c.classList.toggle('on', j === i); c.setAttribute('aria-pressed', String(j === i)); }); redraw(); } }));
      });
      var transp = U.checkbox('Transparent corners', { checked: true, onchange: function (e) { st.transparent = e.target.checked; redraw(); } });
      var ringRow = el('div', { class: 'swatches' });
      var noneRing = el('button', { type: 'button', class: 'chip', onclick: function () { pickRing(-1); } }, 'None');
      ringRow.appendChild(noneRing);
      PP_RINGS.forEach(function (r, i) {
        ringRow.appendChild(el('button', { type: 'button', class: 'sw' + (i === 0 ? ' on' : ''), 'aria-label': r.name, title: r.name, 'aria-pressed': String(i === 0),
          style: { background: 'conic-gradient(' + r.stops.join(',') + ')' }, onclick: function () { pickRing(i); } }));
      });
      function pickRing(i) {
        st.ring = i;
        Array.prototype.forEach.call(ringRow.querySelectorAll('.sw'), function (c, j) { c.classList.toggle('on', j === i); c.setAttribute('aria-pressed', String(j === i)); });
        noneRing.classList.toggle('on', i === -1);
        redraw();
      }
      var ringW = rangeField('Ring width', { min: 1, max: 10, step: 0.5, value: 4 }, function (v) { return v + '%'; }, function (v) { st.ringWidth = v; redraw(); });
      var gapW = rangeField('White gap', { min: 0, max: 5, step: 0.5, value: 1.5 }, function (v) { return v + '%'; }, function (v) { st.gapWidth = v; redraw(); });
      var labelSeg = seg([{ value: '-1', label: 'None' }].concat(PP_LABELS.map(function (l, i) { return { value: String(i), label: l.text }; })), '-1', function (v) { st.label = Number(v); st.labelText = ''; labelIn.querySelector('input').value = ''; redraw(); });
      var labelIn = U.input({ label: 'Own label', placeholder: 'Label text', 'aria-label': 'Label text', oninput: function (e) { st.labelText = e.target.value.slice(0, 30); redraw(); } });

      put(root, 
        U.split(
          U.panel(null, main, previews, U.btnrow(sizeSeg, dl)),
          U.panel(null, modeSeg, photoPick, photoCtl, initialsCtl,
            el('div', { class: 'field' }, el('label', { text: 'Shape' }), shapeSeg),
            el('div', { class: 'field' }, el('label', { text: 'Background' }), bgRow, transp),
            el('div', { class: 'field' }, el('label', { text: 'Ring' }), ringRow), ringW, gapW,
            el('div', { class: 'field' }, el('label', { text: 'Curved label' }), labelSeg), labelIn,
            U.note('Your photo stays on your device. Nothing is uploaded.'))));
      syncMode();
      redraw();
    }
  });

  /* ======================================================================
     Open Graph & Social Preview
     Absorbed the Open Graph Generator and the Twitter Card Generator: it
     writes the full set of Open Graph and X card tags and shows how the link
     unfurls on X, Facebook, LinkedIn, Slack, Discord and WhatsApp. Nothing is
     fetched until "Load preview image" is pressed, and a local preview image
     never leaves the device.
     ====================================================================== */

  var OG_CSS = [
    '.g-soc .ogp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px 14px}',
    '.g-soc .ogp-cnt{font-weight:400;font-size:12px;color:var(--fg-muted);margin-left:6px}',
    '.g-soc .ogp-cnt.over{color:var(--err);font-weight:600}',
    '.g-soc .ogp-warn{margin:10px 0 0;padding-left:18px;font-size:13px;display:grid;gap:3px}',
    '.g-soc .ogp-warn .err{color:var(--err)}',
    '.g-soc .ogp-warn .warn{color:var(--warn)}',
    '.g-soc .ogp-warn .ok{color:var(--ok)}',
    '.g-soc details.ogp-more>summary{cursor:pointer;font-weight:600;color:var(--fg-muted);font-size:13px}',
    '.g-soc details.ogp-more[open]>summary{margin-bottom:10px}',
    /* Previews use each platform's own colours on purpose, so they are not themed. */
    '.g-soc .ogp-stage{background:#fff;color:#0f1419;border:1px solid var(--border);border-radius:var(--radius);padding:14px;overflow:hidden}',
    '.g-soc .ogp-stage.dark{background:#313338;color:#dbdee1}',
    '.g-soc .ogp-stage.wa{background:#efeae2}',
    '.g-soc .ogp-pv{font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;max-width:510px;font-size:15px;line-height:1.35}',
    '.g-soc .ogp-img{position:relative;aspect-ratio:1.91/1;background:#e8ebef;color:#536471;display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center;overflow:hidden;font-size:13px;text-align:center;padding:6px}',
    '.g-soc .ogp-img img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}',
    '.g-soc .ogp-img.sq{aspect-ratio:1/1;flex:none}',
    '.g-soc .ogp-img .btn{font-size:12px;padding:4px 10px}',
    '.g-soc .ogp-clip2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
    '.g-soc .ogp-clip1{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.g-soc .ogp-x .card{border:1px solid #cfd9de;border-radius:16px;overflow:hidden}',
    '.g-soc .ogp-x .pill{position:absolute;left:12px;bottom:12px;max-width:calc(100% - 24px);background:rgba(0,0,0,.77);color:#fff;border:0;border-radius:4px;padding:1px 6px;font-size:13px;z-index:1}',
    '.g-soc .ogp-x .from{color:#536471;font-size:13px;margin-top:4px}',
    '.g-soc .ogp-x .row{display:flex;align-items:stretch}',
    '.g-soc .ogp-x .row .ogp-img{width:130px;border-right:1px solid #cfd9de}',
    '.g-soc .ogp-x .txt{padding:10px 12px;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:2px;font-size:14px}',
    '.g-soc .ogp-x .dom,.g-soc .ogp-x .dsc{color:#536471}',
    '.g-soc .ogp-x .play{position:absolute;z-index:1;width:54px;height:54px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px}',
    '.g-soc .ogp-fb{border:1px solid #dadde1}',
    '.g-soc .ogp-fb .txt{background:#f0f2f5;padding:10px 12px;border-top:1px solid #dadde1}',
    '.g-soc .ogp-fb .dom{color:#65676b;font-size:12px;text-transform:uppercase}',
    '.g-soc .ogp-fb .ttl{font-weight:600;color:#050505;font-size:16px;margin:3px 0 2px}',
    '.g-soc .ogp-fb .dsc{color:#65676b;font-size:14px}',
    '.g-soc .ogp-li{border-radius:8px;overflow:hidden;box-shadow:0 0 0 1px rgba(0,0,0,.12)}',
    '.g-soc .ogp-li .txt{padding:10px 12px;background:#fff}',
    '.g-soc .ogp-li .ttl{font-weight:600;color:rgba(0,0,0,.9);font-size:14px}',
    '.g-soc .ogp-li .dom{color:rgba(0,0,0,.6);font-size:12px;margin-top:4px}',
    '.g-soc .ogp-sl{border-left:4px solid #dddddd;padding:2px 0 2px 12px;font-size:15px;color:#1d1c1d}',
    '.g-soc .ogp-sl .site{font-weight:700;font-size:14px}',
    '.g-soc .ogp-sl .ttl{font-weight:700;color:#1264a3}',
    '.g-soc .ogp-sl .ogp-img{max-width:360px;border-radius:8px;margin-top:8px}',
    '.g-soc .ogp-dc{background:#2b2d31;border-left:4px solid var(--ogp-accent,#1e1f22);border-radius:4px;padding:10px 14px 14px;max-width:432px;font-size:14px}',
    '.g-soc .ogp-dc .site{color:#b5bac1;font-size:12px}',
    '.g-soc .ogp-dc .ttl{color:#00a8fc;font-weight:600;margin:6px 0}',
    '.g-soc .ogp-dc .dsc{color:#dbdee1}',
    '.g-soc .ogp-dc .ogp-img{border-radius:4px;margin-top:12px;background:#1e1f22;color:#b5bac1}',
    '.g-soc .ogp-wa{background:#d9fdd3;border-radius:8px;padding:4px;max-width:380px;margin-left:auto;font-size:14px;color:#111b21}',
    '.g-soc .ogp-wa .box{background:rgba(11,20,26,.05);border-radius:6px;overflow:hidden}',
    '.g-soc .ogp-wa .row{display:flex}',
    '.g-soc .ogp-wa .row .ogp-img{width:88px}',
    '.g-soc .ogp-wa .txt{padding:6px 10px}',
    '.g-soc .ogp-wa .ttl{font-weight:600}',
    '.g-soc .ogp-wa .dsc,.g-soc .ogp-wa .dom{color:#667781;font-size:13px}',
    '.g-soc .ogp-wa .msg{padding:6px 6px 2px;color:#027eb5;word-break:break-all}'
  ].join('\n');

  var OG_TYPES = ['website', 'article', 'product', 'profile', 'book', 'video.movie', 'video.episode', 'video.tv_show', 'video.other', 'music.song', 'music.album'];
  var OG_IMG_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif' };

  /* "2026-09-22T09:30" from a datetime-local input, written out with this
     browser's UTC offset for that date, as Open Graph dates should be. */
  function ogDate(local) {
    if (!local) return '';
    var d = new Date(local);
    if (isNaN(d)) return local;
    var off = -d.getTimezoneOffset(), a = Math.abs(off);
    return local.slice(0, 16) + ':00' + (off >= 0 ? '+' : '-') + String(Math.floor(a / 60)).padStart(2, '0') + ':' + String(a % 60).padStart(2, '0');
  }
  function handleOf(s) {
    s = String(s || '').trim().replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, '');
    return s && s.charAt(0) !== '@' ? '@' + s : s;
  }

  Tools.register({
    id: 'og-preview',
    category: 'seo',
    name: 'Open Graph & Social Preview',
    description: 'Write complete Open Graph and X (Twitter) card tags, including article, product, video, app and player fields, and preview the link on X, Facebook, LinkedIn, Slack, Discord and WhatsApp.',
    keywords: ['og', 'open graph', 'open graph generator', 'og tag generator', 'og tags', 'preview', 'link preview', 'meta', 'meta tags',
      'twitter card', 'twitter card generator', 'x card', 'summary_large_image', 'player card', 'app card', 'facebook', 'linkedin',
      'slack', 'discord', 'whatsapp', 'unfurl', 'share', 'social', 'og:image', 'og:type', 'article', 'product'],
    render: function (root) {
      root.classList.add('g-soc');
      if (!document.getElementById('g-soc-og-style')) document.head.appendChild(el('style', { id: 'g-soc-og-style', text: OG_CSS }));

      var F = {};
      var watch = [];
      function inp(k, label, value, opts) {
        opts = opts || {};
        var node = opts.options
          ? U.select({ options: opts.options, value: value })
          : el(opts.area ? 'textarea' : 'input', Object.assign({ value: value || '', spellcheck: false, placeholder: opts.placeholder || '' }, opts.area ? { rows: 3, style: { minHeight: '76px' } } : { type: opts.type || 'text' }));
        node.dataset.k = k;
        F[k] = node;
        watch.push(node);
        var head = el('label', { text: label });
        if (opts.max) {
          var c = el('span', { class: 'ogp-cnt' });
          var upd = function () { var n = graphemes(node.value.trim()); c.textContent = n + '/' + opts.max; c.classList.toggle('over', n > opts.max); };
          node.addEventListener('input', upd); upd();
          head.appendChild(c);
        }
        return el('div', { class: 'field' }, head, node, opts.hint ? el('span', { class: 'hint', text: opts.hint }) : null);
      }
      function v(k) { return F[k] ? String(F[k].value).trim() : ''; }
      function list(k) { return v(k).split(',').map(function (s) { return s.trim(); }).filter(Boolean); }

      var basics = U.panel('Page', el('div', { class: 'stack' },
        inp('title', 'Title', 'My Amazing Article Title', { max: 60 }),
        inp('desc', 'Description', 'A compelling description that makes people want to click on this link when they see it shared on social media.', { area: true, max: 155 }),
        el('div', { class: 'ogp-grid' },
          inp('url', 'Page URL (og:url)', 'https://example.com/article', { placeholder: 'https://…' }),
          inp('site', 'Site name', 'Example', {}),
          inp('type', 'Type (og:type)', 'article', { options: OG_TYPES }),
          inp('locale', 'Locale', 'en_GB', { placeholder: 'en_GB', hint: 'language_TERRITORY, with an underscore' }),
          inp('locales', 'Other locales', '', { placeholder: 'fr_FR, de_DE' }))));

      var drop = U.dropzone({ accept: 'image/*', label: 'Preview with a local image', hint: 'Stays on this device; the tags still use the Image URL', onFiles: function (files) { useLocal(files[0]); } });
      var image = U.panel('Image', el('div', { class: 'stack' },
        inp('image', 'Image URL (og:image)', 'https://example.com/og-image.jpg', { placeholder: 'https://…/image.jpg', hint: '1200 × 630 px suits every platform' }),
        inp('alt', 'Image alt text', '', { placeholder: 'Describe the image' }),
        el('div', { class: 'ogp-grid' }, inp('w', 'Width (px)', '1200', { type: 'number' }), inp('h', 'Height (px)', '630', { type: 'number' })),
        drop));

      var typeBoxes = {
        article: el('div', { class: 'ogp-grid' },
          inp('published', 'Published', '', { type: 'datetime-local' }), inp('modified', 'Modified', '', { type: 'datetime-local' }),
          inp('author', 'Author (profile URL or name)', '', {}), inp('section', 'Section', '', { placeholder: 'Technology' }),
          inp('atags', 'Tags', '', { placeholder: 'comma, separated' })),
        product: el('div', { class: 'ogp-grid' },
          inp('price', 'Price', '', { placeholder: '19.99' }), inp('currency', 'Currency', Region.get().currency, { placeholder: 'GBP' }),
          inp('availability', 'Availability', 'in stock', { options: ['in stock', 'out of stock', 'preorder', 'backorder', 'discontinued'] }),
          inp('condition', 'Condition', 'new', { options: ['new', 'refurbished', 'used'] }),
          inp('brand', 'Brand', '', {}), inp('sku', 'Retailer item ID (SKU)', '', {})),
        profile: el('div', { class: 'ogp-grid' },
          inp('first', 'First name', '', {}), inp('last', 'Last name', '', {}), inp('username', 'Username', '', {}),
          inp('gender', 'Gender', '', { options: [{ value: '', label: '(not set)' }, 'female', 'male'] })),
        book: el('div', { class: 'ogp-grid' },
          inp('bauthor', 'Author (profile URL)', '', {}), inp('isbn', 'ISBN', '', {}), inp('brelease', 'Release date', '', { type: 'date' }),
          inp('btags', 'Tags', '', { placeholder: 'comma, separated' })),
        video: el('div', { class: 'ogp-grid' },
          inp('video', 'Video URL (og:video)', '', { placeholder: 'https://…/video.mp4' }), inp('vtype', 'Video type', 'video/mp4', {}),
          inp('vw', 'Video width', '1280', { type: 'number' }), inp('vh', 'Video height', '720', { type: 'number' }),
          inp('duration', 'Duration (seconds)', '', { type: 'number' }), inp('release', 'Release date', '', { type: 'date' }),
          inp('vtags', 'Tags', '', { placeholder: 'comma, separated' }))
      };
      var typeHead = el('h3');
      var typePanel = el('section', { class: 'panel' }, typeHead, Object.keys(typeBoxes).map(function (k) { return typeBoxes[k]; }));

      var appBox = el('div', { class: 'ogp-grid' },
        inp('app-name', 'App name', '', {}), inp('app-iphone', 'iPhone App Store ID', '', { placeholder: '307234931' }),
        inp('app-ipad', 'iPad App Store ID', '', {}), inp('app-gplay', 'Google Play ID', '', { placeholder: 'com.example.app' }),
        inp('app-url-iphone', 'iPhone app URL (deep link)', '', { placeholder: 'example://page' }),
        inp('app-url-gplay', 'Android app URL (deep link)', '', {}), inp('app-country', 'App Store country', '', { placeholder: 'GB (only if not in the US store)' }));
      var playerBox = el('div', { class: 'ogp-grid' },
        inp('player', 'Player URL (HTTPS iframe)', '', { placeholder: 'https://example.com/embed/1' }),
        inp('pw', 'Player width', '480', { type: 'number' }), inp('ph', 'Player height', '480', { type: 'number' }),
        inp('stream', 'Raw stream URL (optional)', '', {}));
      var dup = U.checkbox('Repeat title, description and image as twitter:* tags', { checked: true });
      dup.input.dataset.k = 'dup';
      watch.push(dup.input);
      var xPanel = U.panel('X (Twitter) card', el('div', { class: 'stack' },
        el('div', { class: 'ogp-grid' },
          inp('card', 'Card type', 'summary_large_image', { options: [{ value: 'summary_large_image', label: 'Summary, large image' }, { value: 'summary', label: 'Summary' }, { value: 'app', label: 'App' }, { value: 'player', label: 'Player (video/audio)' }] }),
          inp('handle', 'Site account (twitter:site)', '@example', { placeholder: '@yoursite' }),
          inp('creator', 'Author account (twitter:creator)', '', { placeholder: '@author' })),
        appBox, playerBox, dup,
        U.note('X falls back to og:title, og:description and og:image when the twitter:* versions are missing, but twitter:card is always needed.')));

      var importArea = el('textarea', { rows: 5, spellcheck: false, placeholder: '<head> … <meta property="og:title" content="…"> …</head>', dataset: { k: 'import' } });
      var importNote = U.note('');
      var importPanel = el('section', { class: 'panel' }, el('details', { class: 'ogp-more' }, el('summary', { text: 'Import tags from existing HTML' }),
        el('div', { class: 'stack' }, importArea, U.btnrow(U.button('Read tags', importTags)), importNote)));

      /* --- preview image: placeholder until asked, local file, or loaded URL --- */
      var local = null, remoteOk = false;
      function useLocal(file) {
        if (!file) return;
        U.loadImage(file).then(function (img) {
          if (local) URL.revokeObjectURL(local);
          local = URL.createObjectURL(file);
          F.w.value = img.naturalWidth; F.h.value = img.naturalHeight;
          draw();
        }).catch(function (e) { U.toast(e.message, 'err'); });
      }
      U.onTeardown(root, function () { if (local) URL.revokeObjectURL(local); });
      function imgBox(square) {
        var box = el('div', { class: 'ogp-img' + (square ? ' sq' : '') });
        var src = local || (remoteOk ? v('image') : '');
        if (src) {
          var im = el('img', { alt: v('alt'), src: src, referrerPolicy: 'no-referrer' });
          im.onerror = function () { fill(box, el('span', { text: 'The image could not be loaded' })); };
          box.appendChild(im);
        } else if (!v('image')) {
          box.appendChild(el('span', { text: 'No image' }));
        } else if (!/^https?:\/\//i.test(v('image'))) {
          box.appendChild(el('span', { text: 'The image URL must be a full https:// link' }));
        } else {
          put(box, el('span', { text: (v('w') || '?') + ' × ' + (v('h') || '?') }),
            U.button('Load preview image', function () { remoteOk = true; draw(); }, 'ghost'));
        }
        return box;
      }

      function domain() {
        try { return new URL(v('url')).hostname.replace(/^www\./, ''); } catch (e) { return v('url').replace(/^https?:\/\//, '').split('/')[0]; }
      }
      function typeGroup() { var t = v('type'); return t.indexOf('video.') === 0 ? 'video' : t; }

      /* --- tags ------------------------------------------------------------ */
      function tags() {
        var e = U.escapeHtml, L = [];
        function meta(attr, key, val) { if (val !== '' && val !== undefined && val !== null) L.push('<meta ' + attr + '="' + key + '" content="' + e(String(val)) + '">'); }
        function og(k, val) { meta('property', k, val); }
        function tw(k, val) { meta('name', 'twitter:' + k, val); }
        var t = v('title'), d = v('desc'), img = v('image'), type = v('type'), g = typeGroup();
        L.push('<!-- Primary -->');
        if (t) L.push('<title>' + e(t) + '</title>');
        meta('name', 'description', d);
        if (v('url')) L.push('<link rel="canonical" href="' + e(v('url')) + '">');
        L.push('', '<!-- Open Graph -->');
        og('og:type', type); og('og:title', t); og('og:description', d); og('og:url', v('url')); og('og:site_name', v('site'));
        og('og:locale', v('locale'));
        list('locales').forEach(function (l) { og('og:locale:alternate', l); });
        if (img) {
          og('og:image', img);
          var ext = (img.split(/[?#]/)[0].match(/\.([a-z0-9]+)$/i) || [])[1];
          og('og:image:type', ext ? OG_IMG_TYPES[ext.toLowerCase()] : '');
          og('og:image:width', v('w')); og('og:image:height', v('h')); og('og:image:alt', v('alt'));
        }
        if (g === 'article') {
          L.push('', '<!-- Article -->');
          og('article:published_time', ogDate(v('published'))); og('article:modified_time', ogDate(v('modified')));
          og('article:author', v('author')); og('article:section', v('section'));
          list('atags').forEach(function (x) { og('article:tag', x); });
        } else if (g === 'product') {
          L.push('', '<!-- Product -->');
          og('product:price:amount', v('price')); og('product:price:currency', v('currency').toUpperCase());
          og('product:availability', v('availability')); og('product:condition', v('condition'));
          og('product:brand', v('brand')); og('product:retailer_item_id', v('sku'));
        } else if (g === 'profile') {
          L.push('', '<!-- Profile -->');
          og('profile:first_name', v('first')); og('profile:last_name', v('last')); og('profile:username', v('username')); og('profile:gender', v('gender'));
        } else if (g === 'book') {
          L.push('', '<!-- Book -->');
          og('book:author', v('bauthor')); og('book:isbn', v('isbn')); og('book:release_date', v('brelease'));
          list('btags').forEach(function (x) { og('book:tag', x); });
        } else if (g === 'video') {
          L.push('', '<!-- Video -->');
          og('og:video', v('video'));
          if (v('video')) { og('og:video:type', v('vtype')); og('og:video:width', v('vw')); og('og:video:height', v('vh')); }
          og('video:duration', v('duration')); og('video:release_date', v('release'));
          list('vtags').forEach(function (x) { og('video:tag', x); });
        }
        var card = v('card');
        L.push('', '<!-- X (Twitter) -->');
        tw('card', card); tw('site', handleOf(v('handle'))); tw('creator', handleOf(v('creator')));
        if (dup.input.checked) { tw('title', t); tw('description', d); if (img) tw('image', img); }
        if (img) tw('image:alt', v('alt'));
        if (card === 'app') {
          ['iphone', 'ipad', 'googleplay'].forEach(function (p) { tw('app:name:' + p, v('app-name')); });
          tw('app:id:iphone', v('app-iphone')); tw('app:id:ipad', v('app-ipad')); tw('app:id:googleplay', v('app-gplay'));
          tw('app:url:iphone', v('app-url-iphone')); tw('app:url:googleplay', v('app-url-gplay'));
          tw('app:country', v('app-country').toUpperCase());
        } else if (card === 'player') {
          tw('player', v('player')); tw('player:width', v('pw')); tw('player:height', v('ph')); tw('player:stream', v('stream'));
        }
        return L.join('\n');
      }

      /* --- checks ---------------------------------------------------------- */
      function checks() {
        var out = [], t = v('title'), d = v('desc'), img = v('image'), card = v('card'), g = typeGroup();
        function add(kind, text) { out.push([kind, text]); }
        var w = +v('w'), h = +v('h');
        if (!t) add('err', 'Add a title: every platform leads with it.');
        else if (graphemes(t) > 60) add('warn', 'The title is ' + graphemes(t) + ' characters; around 60 shows in full on most platforms.');
        if (!d) add('warn', 'Add a description: Facebook, Slack, Discord and WhatsApp show it.');
        else if (graphemes(d) > 155) add('warn', 'The description is ' + graphemes(d) + ' characters; keep it under about 155.');
        if (!v('url')) add('warn', 'Add og:url so shares of this page are counted against one canonical address.');
        else if (!/^https?:\/\/[^/\s]+/i.test(v('url'))) add('err', 'og:url must be an absolute URL starting with https://.');
        if (!img) add('warn', 'No image: links will show as small text-only cards.');
        else {
          if (!/^https?:\/\//i.test(img)) add('err', 'og:image must be an absolute URL; crawlers do not resolve relative paths.');
          else if (/^http:/i.test(img)) add('warn', 'Serve the image over https://; some platforms skip insecure images.');
          if (w && h) {
            if (card === 'summary_large_image' && (w < 300 || h < 157)) add('err', 'Large image cards need at least 300 × 157 px.');
            else if (w < 1200 || h < 630) add('warn', w + ' × ' + h + ' px is small: 1200 × 630 px looks sharp everywhere.');
            var ratio = w / h;
            if (card === 'summary_large_image' && (ratio < 1.6 || ratio > 2.2)) add('warn', 'The image is ' + ratio.toFixed(2) + ':1; large cards crop to about 1.91:1, so the edges will be cut.');
          } else add('warn', 'Give og:image:width and og:image:height so the first share shows the image straight away.');
          if (!v('alt')) add('warn', 'Add alt text for people using screen readers (og:image:alt and twitter:image:alt).');
        }
        if (v('locale') && !/^[a-z]{2,3}_[A-Z]{2}$/.test(v('locale'))) add('warn', 'og:locale should look like en_GB: language, an underscore, then the territory in capitals.');
        list('locales').forEach(function (l) { if (!/^[a-z]{2,3}_[A-Z]{2}$/.test(l)) add('warn', 'Alternate locale "' + l + '" should look like fr_FR.'); });
        [['handle', 'twitter:site'], ['creator', 'twitter:creator']].forEach(function (p) {
          var hnd = handleOf(v(p[0]));
          if (hnd && !/^@[A-Za-z0-9_]{1,15}$/.test(hnd)) add('warn', p[1] + ' "' + hnd + '" is not a valid X username (up to 15 letters, digits or underscores).');
        });
        if (card === 'player') {
          if (!/^https:\/\//i.test(v('player'))) add('err', 'Player cards need an HTTPS player URL (an iframe-able page).');
          if (!(+v('pw') > 0 && +v('ph') > 0)) add('err', 'Player cards need twitter:player:width and twitter:player:height.');
          if (!img) add('err', 'Player cards need an image, shown before the player loads.');
        }
        if (card === 'app' && !v('app-iphone') && !v('app-ipad') && !v('app-gplay')) add('err', 'App cards need at least one App Store or Google Play ID.');
        if (g === 'article') {
          ['published', 'modified'].forEach(function (k) { if (v(k) && isNaN(new Date(v(k)))) add('err', 'The ' + k + ' date is not a valid date.'); });
          if (v('published') && v('modified') && new Date(v('modified')) < new Date(v('published'))) add('warn', 'The modified date is before the published date.');
        }
        if (g === 'product') {
          if (v('price') && !/^\d+(\.\d{1,2})?$/.test(v('price'))) add('err', 'product:price:amount should be a plain number such as 19.99, with no currency symbol.');
          if (v('currency') && !/^[A-Za-z]{3}$/.test(v('currency'))) add('err', 'product:price:currency should be a three-letter code such as GBP.');
        }
        if (g === 'video' && v('video') && !/^https:\/\//i.test(v('video'))) add('warn', 'og:video should be an https:// URL.');
        if (!out.length) add('ok', 'No problems found.');
        return out;
      }

      /* --- previews -------------------------------------------------------- */
      var tab = 'x';
      var tabs = seg([{ value: 'x', label: 'X' }, { value: 'facebook', label: 'Facebook' }, { value: 'linkedin', label: 'LinkedIn' },
        { value: 'slack', label: 'Slack' }, { value: 'discord', label: 'Discord' }, { value: 'whatsapp', label: 'WhatsApp' }], 'x', function (t) { tab = t; draw(); });
      var stage = el('div', { class: 'ogp-stage', dataset: { k: 'preview' } });
      var warnList = el('ul', { class: 'ogp-warn', dataset: { k: 'warnings' } });
      var tagOut = U.out('');
      tagOut.dataset.k = 'tags';

      function preview() {
        var t = v('title') || 'Title', d = v('desc'), dom = domain(), site = v('site') || dom, card = v('card');
        if (tab === 'x') {
          if (card === 'summary' || card === 'app') {
            return el('div', { class: 'ogp-pv ogp-x' }, el('div', { class: 'card row' }, imgBox(true),
              el('div', { class: 'txt' }, el('div', { class: 'dom ogp-clip1', text: dom }), el('div', { class: 'ogp-clip1', text: t }),
                el('div', { class: 'dsc ogp-clip2', text: card === 'app' ? (v('app-name') || 'App') + ' · Get the app' : d }))));
          }
          var big = imgBox(false);
          if (card === 'player') big.appendChild(el('span', { class: 'play', text: '▶' }));
          else big.appendChild(el('span', { class: 'pill ogp-clip1', text: t }));
          return el('div', { class: 'ogp-pv ogp-x' }, el('div', { class: 'card' }, big), el('div', { class: 'from', text: 'From ' + dom }));
        }
        if (tab === 'facebook') {
          return el('div', { class: 'ogp-pv ogp-fb' }, imgBox(false), el('div', { class: 'txt' },
            el('div', { class: 'dom', text: dom }), el('div', { class: 'ttl ogp-clip2', text: t }), el('div', { class: 'dsc ogp-clip1', text: d })));
        }
        if (tab === 'linkedin') {
          return el('div', { class: 'ogp-pv ogp-li' }, imgBox(false), el('div', { class: 'txt' },
            el('div', { class: 'ttl ogp-clip2', text: t }), el('div', { class: 'dom', text: dom })));
        }
        if (tab === 'slack') {
          return el('div', { class: 'ogp-pv ogp-sl' }, el('div', { class: 'site', text: site }), el('div', { class: 'ttl', text: t }),
            el('div', { text: d }), imgBox(false));
        }
        if (tab === 'discord') {
          return el('div', { class: 'ogp-pv ogp-dc' }, el('div', { class: 'site', text: site }), el('div', { class: 'ttl', text: t }),
            el('div', { class: 'dsc', text: d }), imgBox(false));
        }
        var small = (+v('w') || 0) < 300;
        return el('div', { class: 'ogp-pv ogp-wa' }, el('div', { class: 'box' }, small
          ? el('div', { class: 'row' }, imgBox(true), el('div', { class: 'txt' }, el('div', { class: 'ttl ogp-clip2', text: t }), el('div', { class: 'dsc ogp-clip2', text: d }), el('div', { class: 'dom', text: dom })))
          : el('div', {}, imgBox(false), el('div', { class: 'txt' }, el('div', { class: 'ttl ogp-clip2', text: t }), el('div', { class: 'dsc ogp-clip2', text: d }), el('div', { class: 'dom', text: dom })))),
          el('div', { class: 'msg', text: v('url') }));
      }

      function draw() {
        var g = typeGroup();
        Object.keys(typeBoxes).forEach(function (k) { typeBoxes[k].style.display = k === g ? '' : 'none'; });
        typePanel.style.display = typeBoxes[g] ? '' : 'none';
        typeHead.textContent = g === 'video' ? 'Video' : g.charAt(0).toUpperCase() + g.slice(1);
        appBox.style.display = v('card') === 'app' ? '' : 'none';
        playerBox.style.display = v('card') === 'player' ? '' : 'none';
        stage.className = 'ogp-stage' + (tab === 'discord' ? ' dark' : tab === 'whatsapp' ? ' wa' : '');
        fill(stage, preview());
        tagOut.textContent = tags();
        fill(warnList, checks().map(function (c) { return el('li', { class: c[0], text: c[1] }); }));
      }

      function importTags() {
        var doc = new DOMParser().parseFromString(importArea.value, 'text/html');
        var got = {}, found = 0;
        doc.querySelectorAll('meta[property], meta[name]').forEach(function (m) {
          var key = (m.getAttribute('property') || m.getAttribute('name') || '').trim().toLowerCase();
          var val = m.getAttribute('content');
          if (!key || val === null) return;
          (got[key] = got[key] || []).push(val.trim());
        });
        function one(key) { return got[key] ? got[key][0] : null; }
        function set(k, val) { if (val !== null && val !== undefined && F[k]) { F[k].value = val; found++; } }
        var title = doc.querySelector('title');
        set('title', one('og:title') || one('twitter:title') || (title ? title.textContent.trim() : null));
        set('desc', one('og:description') || one('twitter:description') || one('description'));
        var canon = doc.querySelector('link[rel~="canonical"]');
        set('url', one('og:url') || (canon ? canon.getAttribute('href') : null));
        set('site', one('og:site_name'));
        if (one('og:type') && OG_TYPES.indexOf(one('og:type')) > -1) set('type', one('og:type'));
        set('locale', one('og:locale'));
        if (got['og:locale:alternate']) set('locales', got['og:locale:alternate'].join(', '));
        set('image', one('og:image') || one('og:image:url') || one('twitter:image'));
        set('alt', one('og:image:alt') || one('twitter:image:alt'));
        set('w', one('og:image:width')); set('h', one('og:image:height'));
        if (['summary', 'summary_large_image', 'app', 'player'].indexOf(one('twitter:card')) > -1) set('card', one('twitter:card'));
        set('handle', one('twitter:site')); set('creator', one('twitter:creator'));
        set('author', one('article:author')); set('section', one('article:section'));
        if (got['article:tag']) set('atags', got['article:tag'].join(', '));
        ['published', 'modified'].forEach(function (k) {
          var raw = one('article:' + k + '_time');
          /* datetime-local wants the local wall time without an offset */
          if (raw && !isNaN(new Date(raw))) { var dt = new Date(raw); set(k, new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16)); }
        });
        set('price', one('product:price:amount')); set('currency', one('product:price:currency'));
        set('player', one('twitter:player')); set('pw', one('twitter:player:width')); set('ph', one('twitter:player:height'));
        set('app-iphone', one('twitter:app:id:iphone')); set('app-gplay', one('twitter:app:id:googleplay'));
        var dups = Object.keys(got).filter(function (k) { return got[k].length > 1 && !/(:tag|:alternate|^og:image$)/.test(k); });
        remoteOk = false;
        importNote.className = found ? 'note ok' : 'note err';
        importNote.textContent = found ? 'Read ' + found + ' value' + (found === 1 ? '' : 's') + '.' + (dups.length ? ' Repeated tags (the first one wins): ' + dups.join(', ') + '.' : '')
          : 'No Open Graph, X or description tags were found.';
        draw();
      }

      watch.forEach(function (n) {
        var again = function () { if (n === F.image) remoteOk = false; draw(); };
        n.addEventListener('input', again);
        n.addEventListener('change', again);
      });

      /* plain columns: .panel + .panel already spaces the panels */
      put(root, U.split(
        el('div', {}, basics, image, typePanel, xPanel, importPanel),
        el('div', {},
          U.panel('Preview', tabs, el('div', { style: { marginTop: '12px' } }, stage), warnList,
            U.note('Approximations of each platform\'s current link card. Platforms cache what they scrape, so use their debuggers to refresh a changed page.')),
          U.panel('Meta tags', tagOut, U.btnrow(U.copyBtn('Copy tags', function () { return tagOut.textContent; }),
            U.downloadBtn('Download', 'social-meta-tags.html', function () { return tagOut.textContent; }, 'text/html'))))));
      draw();
    }
  });

  /* ======================================================================
     Tweet Image Generator
     ====================================================================== */

  var TWEET_TEMPLATES = ['🚀 Excited to share that...', '💡 Pro tip: ...', '🔥 Just launched...', '📢 Announcement: ...', '✅ Tip of the day: ...', '🎯 Did you know that...'];

  Tools.register({
    id: 'tweet-generator',
    category: 'social',
    name: 'Tweet Image Generator',
    description: 'Compose a tweet with a live preview, character counter, templates and an image export.',
    keywords: ['tweet', 'twitter', 'x', 'post', 'character counter', 'template', 'hashtags'],
    render: function (root) {
      root.classList.add('g-soc');
      var text = U.textarea({ label: 'Tweet Text', rows: 4, value: 'Just discovered an amazing tool! Check it out 👇' });
      var tags = U.input({ label: 'Hashtags', placeholder: '#hashtag', value: '#tech #tools' });
      var url = U.input({ label: 'URL', value: 'https://example.com' });
      var handle = U.input({ label: 'Handle', value: '@username' });
      var name = U.input({ label: 'Display name', value: 'Your Name' });
      function val(n) { return n.querySelector('input,textarea').value; }
      var preview = el('div', { class: 'tweet' });
      var counter = el('div', { class: 'row', style: { alignItems: 'center', marginTop: '8px' } });

      function full() { return [val(text).trim(), val(tags).trim(), val(url).trim(), val(handle).trim()].filter(Boolean).join(' '); }
      function draw() {
        var t = full(), n = t.length, left = 280 - n;
        var h = val(handle).trim() || '@username';
        fill(preview, 
          el('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } },
            el('div', { class: 'av', text: (val(name).trim()[0] || 'T').toUpperCase() }),
            el('div', {}, el('b', { text: val(name) || 'Your Name' }), el('div', { class: 'note', style: { margin: 0 }, text: h.charAt(0) === '@' ? h : '@' + h }))),
          el('div', { class: 'txt', text: t }));
        var ring = el('span', { class: left < 0 ? 'over' : '', text: String(left), style: { fontWeight: 600 } });
        fill(counter, ring, el('span', { class: left < 0 ? 'over' : 'note', text: n + ' / 280' }));
      }
      [text, tags, url, handle, name].forEach(function (n) { n.querySelector('input,textarea').addEventListener('input', draw); });

      function toImage() {
        var t = full(), W = 1200, pad = 64;
        var c = el('canvas', { width: W, height: 10 });
        var ctx = c.getContext('2d');
        ctx.font = '40px system-ui,sans-serif';
        var lines = [];
        t.split('\n').forEach(function (para) {
          var words = para.split(' '), line = '';
          words.forEach(function (w) {
            var test = line ? line + ' ' + w : w;
            if (ctx.measureText(test).width > W - pad * 2 && line) { lines.push(line); line = w; } else line = test;
          });
          lines.push(line);
        });
        var H = pad * 2 + 110 + lines.length * 56 + 40;
        c.height = H;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#1d9bf0'; ctx.beginPath(); ctx.arc(pad + 40, pad + 40, 40, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '700 40px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText((val(name).trim()[0] || 'T').toUpperCase(), pad + 40, pad + 42);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#0f1419'; ctx.font = '700 36px system-ui,sans-serif'; ctx.fillText(val(name) || 'Your Name', pad + 100, pad + 30);
        ctx.fillStyle = '#536471'; ctx.font = '32px system-ui,sans-serif'; ctx.fillText(val(handle) || '@username', pad + 100, pad + 72);
        ctx.fillStyle = '#0f1419'; ctx.font = '40px system-ui,sans-serif';
        lines.forEach(function (l, i) { ctx.fillText(l, pad, pad + 150 + i * 56); });
        return canvasBlob(c);
      }

      put(root, U.split(
        U.panel(null, preview, counter,
          U.btnrow(
            U.button('Share on Twitter / X', function () { window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(full()), '_blank', 'noopener'); }, 'primary'),
            U.copyBtn('Copy', full),
            U.button('Download image', function () { toImage().then(function (b) { U.saveBlob('tweet.png', b); }); }, 'ghost'))),
        U.panel(null, text, tags, url, handle, name,
          el('div', { class: 'field' }, el('label', { text: 'Templates' }),
            el('div', { class: 'btnrow' }, TWEET_TEMPLATES.map(function (t) {
              return U.button(t, function () { text.querySelector('textarea').value = t; draw(); }, 'ghost');
            }))))));
      draw();
    }
  });

  /* ======================================================================
     Instagram Filters
     ====================================================================== */

  /* Each filter: a CSS filter chain plus an optional colour overlay drawn
     with a blend mode, the same approach CSS filter libraries use. */
  var IG_FILTERS = [
    { name: 'Normal', f: 'none' },
    { name: 'Clarendon', f: 'contrast(1.2) saturate(1.35)', o: ['rgba(127,187,227,0.2)', 'overlay'] },
    { name: 'Gingham', f: 'brightness(1.05) hue-rotate(-10deg)', o: ['rgba(230,230,250,1)', 'soft-light'] },
    { name: 'Moon', f: 'grayscale(1) contrast(1.1) brightness(1.1)', o: ['rgba(160,160,160,1)', 'soft-light'] },
    { name: 'Lark', f: 'contrast(0.9)', o: ['rgba(242,242,242,0.8)', 'darken'] },
    { name: 'Reyes', f: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)', o: ['rgba(173,205,239,0.5)', 'soft-light'] },
    { name: 'Juno', f: 'sepia(0.35) contrast(1.15) brightness(1.15) saturate(1.8)', o: ['rgba(127,187,227,0.2)', 'overlay'] },
    { name: 'Slumber', f: 'saturate(0.66) brightness(1.05)', o: ['rgba(69,41,12,0.4)', 'lighten'] },
    { name: 'Crema', f: 'sepia(0.5) contrast(1.25) brightness(1.15) saturate(0.9) hue-rotate(-2deg)', o: ['rgba(125,105,24,0.2)', 'multiply'] },
    { name: 'Ludwig', f: 'sepia(0.25) contrast(1.05) brightness(1.05) saturate(2)', o: ['rgba(125,105,24,0.1)', 'overlay'] },
    { name: 'Aden', f: 'hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)', o: ['rgba(66,10,14,0.2)', 'darken'] },
    { name: 'Perpetua', f: 'contrast(1.1) brightness(1.25) saturate(1.1)', o: ['rgba(0,91,154,0.25)', 'soft-light'] },
    { name: 'Valencia', f: 'contrast(1.08) brightness(1.08) sepia(0.08)', o: ['rgba(58,3,57,0.5)', 'exclusion'] },
    { name: 'X-Pro II', f: 'sepia(0.3) contrast(1.2) brightness(0.95) saturate(1.3)', o: ['rgba(0,0,0,0.35)', 'multiply'], vignette: true },
    { name: 'Walden', f: 'brightness(1.1) hue-rotate(-10deg) sepia(0.3) saturate(1.6)', o: ['rgba(0,68,204,0.3)', 'screen'] },
    { name: 'Nashville', f: 'sepia(0.2) contrast(1.2) brightness(1.05) saturate(1.2)', o: ['rgba(247,176,153,0.56)', 'darken'] },
    { name: '1977', f: 'contrast(1.1) brightness(1.1) saturate(1.3)', o: ['rgba(243,106,188,0.3)', 'screen'] },
    { name: 'Inkwell', f: 'sepia(0.3) contrast(1.1) brightness(1.1) grayscale(1)' },
    { name: 'Lo-Fi', f: 'saturate(1.1) contrast(1.5)', vignette: true },
    { name: 'Sierra', f: 'contrast(0.8) saturate(1.2) sepia(0.15)', o: ['rgba(128,78,15,0.3)', 'screen'] }
  ];

  function applyIgFilter(src, filter, w, h) {
    var c = el('canvas', { width: w, height: h });
    var ctx = c.getContext('2d');
    ctx.filter = filter.f;
    ctx.drawImage(src, 0, 0, w, h);
    ctx.filter = 'none';
    if (filter.o) {
      ctx.globalCompositeOperation = filter.o[1];
      ctx.fillStyle = filter.o[0];
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (filter.vignette) {
      var g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    return c;
  }

  Tools.register({
    id: 'instagram-filters',
    category: 'social',
    name: 'Instagram Filters',
    description: 'Apply 20 Instagram-style filters to a photo and download the result.',
    keywords: ['instagram', 'filter', 'photo', 'clarendon', 'juno', 'valencia', 'effects', 'vintage'],
    render: function (root) {
      root.classList.add('g-soc');
      var img = null, current = 0, fileName = 'photo';
      var label = el('h3', { text: 'Filter: Normal' });
      var big = el('canvas', { style: { maxWidth: '100%', borderRadius: '8px' } });
      var grid = el('div', { class: 'thumbgrid' });
      var dl = U.button('Download with Normal filter', function () {
        var out = applyIgFilter(img, IG_FILTERS[current], img.naturalWidth, img.naturalHeight);
        canvasBlob(out, 'image/jpeg', 0.92).then(function (b) { U.saveBlob(fileName + '-' + IG_FILTERS[current].name.toLowerCase().replace(/[^a-z0-9]+/g, '') + '.jpg', b); });
      }, 'primary');
      var work = el('div', { style: { display: 'none' } }, label, big, U.btnrow(dl, U.button('Choose another photo', function () { dz.querySelector('input').click(); }, 'ghost')), grid);
      var dz = U.dropzone({ accept: 'image/*', label: 'Drop a photo here or click to upload', onFiles: function (files) {
        U.loadImage(files[0]).then(function (im) { img = im; fileName = files[0].name.replace(/\.[^.]+$/, '') || 'photo'; build(); }).catch(function (e) { U.toast(e.message, 'err'); });
      } });
      function show() {
        var s = Math.min(1, 900 / img.naturalWidth, 700 / img.naturalHeight);
        var c = applyIgFilter(img, IG_FILTERS[current], Math.round(img.naturalWidth * s), Math.round(img.naturalHeight * s));
        big.width = c.width; big.height = c.height; big.getContext('2d').drawImage(c, 0, 0);
        label.textContent = 'Filter: ' + IG_FILTERS[current].name;
        dl.textContent = 'Download with ' + IG_FILTERS[current].name + ' filter';
        Array.prototype.forEach.call(grid.children, function (b, i) { b.classList.toggle('on', i === current); });
      }
      function build() {
        work.style.display = '';
        var ts = 160 / Math.max(img.naturalWidth, img.naturalHeight);
        var tw = Math.max(1, Math.round(img.naturalWidth * ts)), th = Math.max(1, Math.round(img.naturalHeight * ts));
        fill(grid);
        IG_FILTERS.forEach(function (f, i) {
          grid.appendChild(el('button', { type: 'button', onclick: function () { current = i; show(); } }, applyIgFilter(img, f, tw, th), el('div', { text: f.name })));
        });
        show();
      }
      put(root, U.panel(null, dz, work));
    }
  });

  /* ======================================================================
     YouTube Thumbnail
     ====================================================================== */

  function youtubeId(input) {
    var s = String(input || '').trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    var m = s.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/|live\/|e\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  var YT_SIZES = [
    ['maxresdefault', 'Max Resolution', '1280×720'], ['sddefault', 'SD Default', '640×480'], ['hqdefault', 'High Quality', '480×360'],
    ['mqdefault', 'Medium Quality', '320×180'], ['default', 'Low Quality (1)', '120×90'], ['1', 'Thumbnail 1', '120×90'],
    ['2', 'Thumbnail 2', '120×90'], ['3', 'Thumbnail 3', '120×90']
  ];

  Tools.register({
    id: 'youtube-thumbnail',
    category: 'social',
    name: 'YouTube Thumbnail',
    description: 'Get every thumbnail size for a YouTube video from its link or ID.',
    keywords: ['youtube', 'thumbnail', 'download', 'video', 'image', 'maxresdefault'],
    online: 'loads thumbnails from img.youtube.com',
    render: function (root) {
      root.classList.add('g-soc');
      var inp = U.input({ label: 'YouTube URL or Video ID', placeholder: 'https://youtube.com/watch?v=... or video ID', value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
      var out = el('div');
      function draw() {
        var id = youtubeId(inp.querySelector('input').value);
        if (!inp.querySelector('input').value.trim()) { fill(out); return; }
        if (!id) { fill(out, U.note('Could not extract video ID from this URL.', 'err')); return; }
        fill(out, el('p', { class: 'mono', text: 'Video ID: ' + id }), el('div', { class: 'yt-grid' }, YT_SIZES.map(function (s) {
          var url = 'https://img.youtube.com/vi/' + id + '/' + s[0] + '.jpg';
          var im = el('img', { src: url, alt: s[1], loading: 'lazy', referrerPolicy: 'no-referrer' });
          return el('figure', {}, im, el('figcaption', {}, el('b', { text: s[1] }), ' ', el('span', { class: 'note', text: s[2] })),
            U.btnrow(U.copyBtn('URL', url), U.button('DL', function () {
              fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
                .then(function (b) { U.saveBlob(id + '-' + s[0] + '.jpg', b); })
                .catch(function () { window.open(url, '_blank', 'noopener'); U.toast('Opened the image in a new tab; save it from there'); });
            }, 'ghost')));
        })));
      }
      inp.querySelector('input').addEventListener('input', U.debounce(draw, 200));
      put(root, U.panel(null, inp, out));
      draw();
    }
  });

  /* ======================================================================
     Bio Generator
     ====================================================================== */

  var BIO_PLATFORMS = {
    twitter: { label: 'Twitter', limit: 160 },
    instagram: { label: 'Instagram', limit: 150 },
    linkedin: { label: 'Linkedin', limit: 2600 },
    github: { label: 'Github', limit: 160 },
    tiktok: { label: 'Tiktok', limit: 80 }
  };

  function buildBio(p, d) {
    var skills = d.skills.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var roleAt = d.role + (d.company ? ' @' + d.company : '');
    var lines = [];
    switch (p) {
      case 'twitter':
        lines.push([roleAt, d.location ? '🌍 ' + d.location : ''].filter(Boolean).join(' '));
        if (skills.length) lines.push(skills.join(' | '));
        if (d.passion) lines.push('Passionate about ' + d.passion);
        if (d.url) lines.push('🔗 ' + d.url);
        break;
      case 'instagram':
        if (d.role) lines.push('💼 ' + roleAt);
        if (d.location) lines.push('📍 ' + d.location);
        if (skills.length) lines.push('⚡ ' + skills.join(' • '));
        if (d.passion) lines.push('✨ ' + d.passion.charAt(0).toUpperCase() + d.passion.slice(1));
        if (d.url) lines.push('👇 ' + d.url);
        break;
      case 'linkedin':
        lines.push(d.role + (d.company ? ' at ' + d.company : '') + (skills.length ? ' | ' + skills.join(', ') : ''));
        lines.push('');
        lines.push('Hi, I\'m ' + (d.name || 'a professional') + (d.location ? ', based in ' + d.location : '') + '. I work as a ' + (d.role || 'professional') + (d.company ? ' at ' + d.company : '') + ', and I\'m passionate about ' + (d.passion || 'what I do') + '.');
        if (skills.length) { lines.push(''); lines.push('Core skills: ' + skills.join(' · ')); }
        lines.push('');
        lines.push('Always happy to connect and talk shop.' + (d.url ? ' More at ' + d.url : ''));
        break;
      case 'github':
        lines.push(roleAt + (skills.length ? ' · ' + skills.join(' · ') : ''));
        if (d.passion) lines.push('Building: ' + d.passion);
        if (d.location) lines.push('📍 ' + d.location);
        break;
      case 'tiktok':
        lines.push((d.role ? d.role : d.name) + (skills.length ? ' | ' + skills.slice(0, 2).join(' + ') : ''));
        if (d.passion) lines.push('✨ ' + d.passion);
        if (d.url) lines.push('👇 ' + d.url);
        break;
    }
    return lines.join('\n');
  }

  Tools.register({
    id: 'bio-generator',
    category: 'social',
    name: 'Bio Generator',
    description: 'Write a profile bio for Twitter, Instagram, LinkedIn, GitHub or TikTok from a few details.',
    keywords: ['bio', 'profile', 'twitter', 'instagram', 'linkedin', 'tiktok', 'github', 'about'],
    render: function (root) {
      root.classList.add('g-soc');
      var plat = U.select({ label: 'Platform', options: Object.keys(BIO_PLATFORMS).map(function (k) { return { value: k, label: BIO_PLATFORMS[k].label }; }), value: 'twitter' });
      var fields = {
        name: U.input({ label: 'Full Name', value: 'Jane Doe' }),
        role: U.input({ label: 'Role / Title', value: 'Full-Stack Developer' }),
        company: U.input({ label: 'Company', value: 'Acme Corp' }),
        location: U.input({ label: 'Location', value: 'San Francisco, CA' }),
        skills: U.input({ label: 'Top Skills (comma separated)', value: 'React, Node.js, TypeScript' }),
        passion: U.input({ label: 'Passion / Interest', value: 'building great user experiences' }),
        url: U.input({ label: 'Website / CTA URL', value: 'https://janedoe.dev' })
      };
      var title = el('h3');
      var count = el('span');
      var out = el('textarea', { rows: 6, 'aria-label': 'Bio' });
      function data() { var d = {}; Object.keys(fields).forEach(function (k) { d[k] = fields[k].querySelector('input').value.trim(); }); return d; }
      function upd() {
        var p = BIO_PLATFORMS[out.dataset.p];
        var n = out.value.length;
        count.className = n > p.limit ? 'over' : 'note';
        count.textContent = n + '/' + p.limit;
      }
      function gen() {
        var p = plat.querySelector('select').value;
        out.dataset.p = p;
        title.textContent = BIO_PLATFORMS[p].label.replace('Linkedin', 'LinkedIn').replace('Github', 'GitHub').replace('Tiktok', 'TikTok') + ' Bio';
        out.value = buildBio(p, data());
        upd();
      }
      out.addEventListener('input', upd);
      plat.querySelector('select').addEventListener('change', gen);
      Object.keys(fields).forEach(function (k) { fields[k].querySelector('input').addEventListener('input', gen); });
      put(root, U.split(
        U.panel(null, plat, fields.name, fields.role, fields.company, fields.location, fields.skills, fields.passion, fields.url),
        U.panel(null, U.btnrow(title, count), out, U.btnrow(U.copyBtn('Copy Bio', function () { return out.value; }), U.button('Regenerate', gen, 'ghost')))));
      gen();
    }
  });

  /* ======================================================================
     Hashtag Generator
     ====================================================================== */

  var HASHTAGS = {
    tech: ['#tech', '#technology', '#programming', '#coding', '#developer', '#software', '#javascript', '#python', '#webdev', '#AI', '#machinelearning', '#startup', '#innovation', '#digital', '#data'],
    business: ['#business', '#entrepreneur', '#startup', '#success', '#marketing', '#growthhacking', '#leadership', '#CEO', '#hustle', '#motivation', '#branding', '#smallbusiness', '#b2b', '#sales'],
    lifestyle: ['#lifestyle', '#wellness', '#health', '#fitness', '#mindset', '#selfimprovement', '#positivity', '#motivation', '#happiness', '#goals', '#growth', '#mindfulness', '#yoga', '#meditation'],
    food: ['#food', '#foodie', '#recipe', '#cooking', '#healthyfood', '#delicious', '#instafood', '#homemade', '#vegan', '#breakfast', '#lunch', '#dinner', '#snack', '#tasty', '#yummy'],
    travel: ['#travel', '#wanderlust', '#adventure', '#explore', '#vacation', '#travelgram', '#backpacking', '#nomad', '#worldtravel', '#photography', '#nature', '#landscape', '#trip', '#holiday'],
    fashion: ['#fashion', '#style', '#ootd', '#outfit', '#streetstyle', '#fashionblogger', '#trending', '#luxury', '#vintage', '#sustainable', '#clothing', '#accessories', '#beauty', '#makeup']
  };

  function topicTags(topic) {
    var t = String(topic || '').trim();
    if (!t) return [];
    var joined = '#' + t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, '');
    return joined.length > 1 ? [joined] : [];
  }

  Tools.register({
    id: 'hashtag-generator',
    category: 'social',
    name: 'Hashtag Generator',
    description: 'Pick relevant hashtags for a post from a topic and category, then copy them in one go.',
    keywords: ['hashtag', 'tags', 'instagram', 'twitter', 'tiktok', 'social', 'post'],
    render: function (root) {
      root.classList.add('g-soc');
      var topic = U.input({ label: 'Your Topic', placeholder: 'e.g. web development' });
      var cat = U.select({ label: 'Category', options: Object.keys(HASHTAGS), value: 'tech' });
      var custom = U.input({ label: 'Custom Hashtags (space or comma separated)', placeholder: '#custom #tags' });
      var selected = [];
      var tagsBox = el('div', { class: 'tags' });
      var countEl = el('span', { class: 'note' });
      var result = el('div');

      function suggestions() {
        var tt = topicTags(topic.querySelector('input').value);
        var base = HASHTAGS[cat.querySelector('select').value];
        if (tt.length) base = base.slice(0, 10);
        return tt.concat(base.filter(function (b) { return tt.indexOf(b.toLowerCase()) === -1; }));
      }
      function customTags() {
        return custom.querySelector('input').value.split(/[\s,]+/).map(function (t) { return t.trim(); }).filter(Boolean)
          .map(function (t) { return t.charAt(0) === '#' ? t : '#' + t; }).filter(function (t) { return t.length > 1; });
      }
      function draw() {
        var list = suggestions();
        fill(tagsBox);
        list.forEach(function (t) {
          var on = selected.indexOf(t) > -1;
          tagsBox.appendChild(el('button', { type: 'button', class: 'chip' + (on ? ' on' : ''), onclick: function () {
            var i = selected.indexOf(t);
            if (i > -1) selected.splice(i, 1); else selected.push(t);
            draw();
          } }, t));
        });
        var all = selected.concat(customTags().filter(function (c) { return selected.indexOf(c) === -1; }));
        countEl.textContent = selected.length + ' selected';
        if (all.length) {
          var ta = el('textarea', { rows: 3, readOnly: true, value: all.join(' '), 'aria-label': 'Result' });
          fill(result, el('h3', { text: 'Result (' + all.length + ' hashtags)' }), ta, U.btnrow(U.copyBtn('Copy Hashtags', function () { return ta.value; })),
            all.length > 30 ? U.note('Instagram allows at most 30 hashtags per post.', 'err') : null);
        } else fill(result);
      }
      topic.querySelector('input').addEventListener('input', draw);
      cat.querySelector('select').addEventListener('change', draw);
      custom.querySelector('input').addEventListener('input', draw);
      put(root, U.panel(null, U.row(topic, cat),
        U.btnrow(U.button('Select All', function () { suggestions().forEach(function (t) { if (selected.indexOf(t) === -1) selected.push(t); }); draw(); }, 'ghost'),
          U.button('Clear', function () { selected = []; draw(); }, 'ghost'), countEl),
        tagsBox, el('div', { style: { marginTop: '12px' } }, custom), result));
      draw();
    }
  });

  /* ======================================================================
     Meme Generator
     ====================================================================== */

  Tools.register({
    id: 'meme-generator',
    category: 'social',
    name: 'Meme Generator',
    description: 'Caption any picture with classic Impact-style top and bottom text, or a modern caption bar, and download it.',
    keywords: ['meme', 'caption', 'impact', 'top text', 'bottom text', 'image macro', 'funny', 'template', 'text on image', 'social'],
    render: function (root) {
      root.classList.add('g-soc');
      var img = null, blank = { w: 800, h: 600, color: '#ffffff' };
      var top = U.textarea({ label: 'Top text', rows: 2, value: 'WHEN THE CODE WORKS' });
      var bottom = U.textarea({ label: 'Bottom text', rows: 2, value: 'BUT YOU DON\'T KNOW WHY' });
      var style = seg([{ value: 'classic', label: 'Classic (Impact)' }, { value: 'modern', label: 'Modern (caption bar)' }, { value: 'clean', label: 'Clean (no outline)' }], 'classic', draw);
      var size = el('input', { type: 'range', min: 4, max: 16, step: 0.5, value: 9, 'aria-label': 'Text size' });
      var caps = U.checkbox('ALL CAPS', { checked: true });
      var textColor = el('input', { type: 'color', value: '#ffffff' });
      var outline = el('input', { type: 'color', value: '#000000' });
      var canvas = el('canvas', { class: 'pv', width: 800, height: 600 });
      var status = U.note('');
      var format = seg([{ value: 'image/png', label: 'PNG' }, { value: 'image/jpeg', label: 'JPEG' }], 'image/png');
      var zone = U.dropzone({ accept: 'image/*', label: 'Drop a picture here', hint: 'or click to choose. Or start from a blank canvas below.', onFiles: function (files) { load(files[0]); } });

      function txt(node) { var v = node.querySelector('textarea').value; return caps.input.checked ? v.toUpperCase() : v; }
      function wrapLines(ctx, text, maxW) {
        var lines = [];
        text.split('\n').forEach(function (para) {
          var words = para.split(/\s+/).filter(Boolean), line = '';
          if (!words.length) { lines.push(''); return; }
          words.forEach(function (w) {
            var t = line ? line + ' ' + w : w;
            if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
          });
          lines.push(line);
        });
        return lines;
      }
      function drawBlock(ctx, text, W, y, align, fontPx, mode) {
        if (!text.trim()) return 0;
        var family = mode === 'classic' ? 'Impact, "Arial Black", "Helvetica Neue", Arial, sans-serif' : '"Helvetica Neue", Arial, sans-serif';
        ctx.font = (mode === 'classic' ? '' : 'bold ') + fontPx + 'px ' + family;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        var lines = wrapLines(ctx, text, W * 0.92), lh = fontPx * 1.15;
        var startY = align === 'bottom' ? y - lines.length * lh : y;
        lines.forEach(function (line, i) {
          var ly = startY + i * lh;
          if (mode !== 'clean' && mode !== 'modern') {
            ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2, fontPx / 9); ctx.strokeStyle = outline.value;
            ctx.strokeText(line, W / 2, ly);
          }
          ctx.fillStyle = mode === 'modern' ? '#000' : textColor.value;
          ctx.fillText(line, W / 2, ly);
        });
        return lines.length * lh;
      }
      function draw() {
        var W = img ? img.width : blank.w, H = img ? img.height : blank.h, mode = style.value;
        var fontPx = Math.round(Math.min(W, H) * (+size.value) / 100);
        var ctx = canvas.getContext('2d');
        var t = txt(top), b = txt(bottom);
        if (mode === 'modern') {
          ctx.font = 'bold ' + fontPx + 'px "Helvetica Neue", Arial, sans-serif';
          var lines = t.trim() ? wrapLines(ctx, t, W * 0.92).length : 0, bar = lines ? lines * fontPx * 1.15 + fontPx : 0;
          canvas.width = W; canvas.height = H + bar;
          ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, bar);
          drawBlock(ctx, t, W, fontPx / 2, 'top', fontPx, 'modern');
          if (img) ctx.drawImage(img, 0, bar); else { ctx.fillStyle = blank.color; ctx.fillRect(0, bar, W, H); }
          ctx.fillStyle = '#fff';
          if (b.trim()) { ctx.font = 'bold ' + Math.round(fontPx * 0.8) + 'px Arial, sans-serif'; drawBlock(ctx, b, W, H + bar - fontPx * 0.4, 'bottom', Math.round(fontPx * 0.8), 'classic'); }
        } else {
          canvas.width = W; canvas.height = H;
          ctx = canvas.getContext('2d');
          if (img) ctx.drawImage(img, 0, 0); else { ctx.fillStyle = blank.color; ctx.fillRect(0, 0, W, H); }
          drawBlock(ctx, t, W, fontPx * 0.35, 'top', fontPx, mode);
          drawBlock(ctx, b, W, H - fontPx * 0.35, 'bottom', fontPx, mode);
        }
        status.textContent = canvas.width + ' × ' + canvas.height + ' px';
      }
      function load(file) {
        U.loadImage(file).then(function (im) {
          var max = 1600, s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
          var c = el('canvas', { width: Math.round(im.naturalWidth * s), height: Math.round(im.naturalHeight * s) });
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          img = c; draw();
          zone.querySelector('strong').textContent = file.name;
        }).catch(function (e) { U.toast(e.message, 'err'); });
      }
      function blankCanvas(w, h, color) { img = null; blank = { w: w, h: h, color: color }; draw(); }
      var blanks = el('div', { class: 'chips' }, [['White 800×600', 800, 600, '#ffffff'], ['Black 800×600', 800, 600, '#111111'], ['Square 1080', 1080, 1080, '#f3f4f6'], ['Story 1080×1920', 1080, 1920, '#1e293b']].map(function (p) {
        return el('button', { type: 'button', class: 'chip', onclick: function () { blankCanvas(p[1], p[2], p[3]); } }, p[0]);
      }));
      async function download() {
        var mime = format.value, blob = await canvasBlob(canvas, mime, 0.92);
        U.saveBlob('meme.' + (mime === 'image/jpeg' ? 'jpg' : 'png'), blob);
      }
      U.live([top, bottom, size, caps, textColor, outline], draw);
      put(root, 
        U.panel(null, zone, blanks),
        U.panel('Caption', top, bottom, el('div', { class: 'row' }, U.field('Style', style), U.field('Text size', size), caps, U.field('Text colour', textColor), U.field('Outline', outline))),
        U.panel('Preview', el('div', { style: { textAlign: 'center' } }, canvas), status,
          U.btnrow(U.field('Format', format), U.button('Download', function () { download().catch(function (e) { U.toast(e.message, 'err'); }); }, 'primary'),
            U.button('Copy image', async function () {
              try { var blob = await canvasBlob(canvas, 'image/png'); await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); U.toast('Copied'); }
              catch (e) { U.toast('This browser cannot copy images. Download instead.', 'err'); }
            }))));
      draw();
    }
  });
})();
