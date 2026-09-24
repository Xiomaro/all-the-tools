/* seo-b tools: generators for web app manifests, security.txt, llms.txt,
   hreflang tags and redirect rules, and offline checkers for heading
   outlines and JSON-LD structured data. Nothing here touches the network. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  /* named STYLE, not CSS, so the global CSS.supports stays reachable */
  var STYLE = [
    '.g-seob .sb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px 14px}',
    '.g-seob .sb-rows{display:grid;gap:6px}',
    '.g-seob .sb-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}',
    '.g-seob .sb-row>input,.g-seob .sb-row>select{flex:1 1 140px;width:auto}',
    '.g-seob .sb-row>.narrow{flex:0 1 110px}',
    '.g-seob .sb-row>.btn{flex:none}',
    '.g-seob .sb-issues{margin:0;padding-left:18px;font-size:13px;display:grid;gap:4px}',
    '.g-seob .sb-issues .err{color:var(--err)}',
    '.g-seob .sb-issues .warn{color:var(--warn)}',
    '.g-seob .sb-issues .ok{color:var(--ok)}',
    '.g-seob .sb-issues .info{color:var(--fg-muted)}',
    '.g-seob .sb-issues b{font-weight:600}',
    '.g-seob .sb-pill{display:inline-block;font-size:11px;font-weight:700;padding:1px 7px;border-radius:999px;border:1px solid currentColor;margin-right:6px;font-family:var(--mono);vertical-align:1px}',
    '.g-seob .sb-pill.err{color:var(--err)} .g-seob .sb-pill.warn{color:var(--warn)} .g-seob .sb-pill.ok{color:var(--ok)}',
    '.g-seob .sb-muted{color:var(--fg-muted);font-size:13px}',
    '.g-seob .sb-md{border:1px solid var(--border);border-radius:var(--radius-s);padding:4px 16px;background:var(--bg);max-height:460px;overflow:auto}',
    '.g-seob .sb-md blockquote{margin:8px 0;padding-left:12px;border-left:3px solid var(--border);color:var(--fg-muted)}',
    /* manifest icon previews */
    '.g-seob .sb-icons{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end}',
    '.g-seob .sb-icons figure{margin:0;text-align:center;font-size:12px;color:var(--fg-muted)}',
    '.g-seob .sb-icons .ic{width:96px;height:96px;overflow:hidden;background:repeating-conic-gradient(#d9dce3 0 25%,#fff 0 50%) 0 0/12px 12px;position:relative;margin:0 auto 4px}',
    '.g-seob .sb-icons .ic img{width:100%;height:100%;display:block}',
    '.g-seob .sb-icons .ic svg{position:absolute;inset:0;width:100%;height:100%}',
    /* heading outline */
    '.g-seob .sb-tree{list-style:none;margin:0;padding:0;font-size:14px}',
    '.g-seob .sb-tree li{display:flex;gap:8px;align-items:baseline;padding:3px 0;border-bottom:1px dashed var(--border)}',
    '.g-seob .sb-tree .lv{font-family:var(--mono);font-size:11px;font-weight:700;color:var(--accent);flex:none;min-width:24px}',
    '.g-seob .sb-tree .bad{color:var(--err)}',
    '.g-seob .sb-tree .empty{color:var(--err);font-style:italic}',
    /* JSON-LD graph */
    '.g-seob .sb-graph details{margin:2px 0 2px 14px}',
    '.g-seob .sb-graph>details{margin-left:0}',
    '.g-seob .sb-graph summary{cursor:pointer}',
    '.g-seob .sb-graph .k{font-family:var(--mono);font-size:13px;color:var(--fg-muted)}',
    '.g-seob .sb-graph .t{font-weight:700}',
    '.g-seob .sb-graph .v{font-family:var(--mono);font-size:13px;word-break:break-all;margin-left:14px}',
    '.g-seob .sb-card{border:1px solid var(--border);border-radius:var(--radius-s);padding:10px 12px;margin-top:10px;background:var(--bg)}',
    '.g-seob .sb-card h4{margin:0 0 6px;font-size:14px}',
    '.g-seob .sb-code{font-family:var(--mono);font-size:12px;white-space:pre;overflow:auto;background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--radius-s);padding:8px;margin:6px 0 0}'
  ].join('\n');

  function reg(def) {
    var render = def.render;
    def.category = 'seo';
    def.render = function (root) {
      if (!document.getElementById('g-seob-style')) document.head.appendChild(el('style', { id: 'g-seob-style', text: STYLE }));
      root.classList.add('g-seob');
      render(root);
    };
    Tools.register(def);
  }

  /* --- small shared helpers ------------------------------------------------ */

  function txt(k, value, placeholder, type) {
    return el('input', { type: type || 'text', value: value || '', placeholder: placeholder || '', spellcheck: false, dataset: k ? { k: k } : undefined });
  }
  function area(k, value, rows, placeholder) {
    return el('textarea', { rows: rows || 6, value: value || '', placeholder: placeholder || '', spellcheck: false, dataset: k ? { k: k } : undefined });
  }
  function pick(k, options, value) {
    var s = U.select({ options: options, value: value });
    if (k) s.dataset.k = k;
    return s;
  }
  function codeOut(k) { var o = U.out(''); if (k) o.dataset.k = k; return o; }
  /* [['err'|'warn'|'ok'|'info', text], …] → list; an empty list says so. */
  function issueList(node, items, emptyText) {
    node.replaceChildren.apply(node, (items.length ? items : [['ok', emptyText || 'No problems found.']]).map(function (i) {
      return el('li', { class: i[0], text: i[1] });
    }));
    return node;
  }
  function issuesNode(k) { return el('ul', { class: 'sb-issues', dataset: k ? { k: k } : undefined }); }
  function counts(items) {
    var c = { err: 0, warn: 0, info: 0 };
    items.forEach(function (i) { if (c[i[0]] !== undefined) c[i[0]]++; });
    return c;
  }
  function lines(s) { return String(s || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean); }
  function absUrl(u) { try { return new URL(u).href && /^https?:\/\//i.test(u); } catch (e) { return false; } }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function dmy(d) { return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear(); }
  function hm(d) { return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  /* The local wall-clock value a datetime-local input expects. */
  function localInput(d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
  function lineCol(text, index) {
    var before = text.slice(0, index), nl = before.lastIndexOf('\n');
    return { line: (before.match(/\n/g) || []).length + 1, col: index - nl };
  }
  function tabs(k, options, onChange, initial) {
    var c = U.chips(options, onChange, initial);
    if (k) c.dataset.k = k;
    return c;
  }
  function plural(n, word, many) { return n + ' ' + (n === 1 ? word : (many || word + 's')); }
  function langOk(tag) {
    try { return Intl.getCanonicalLocales(tag).length === 1; } catch (e) { return false; }
  }

  /* ======================================================================
     Web App Manifest Generator
     ====================================================================== */

  /* W3C "Web App Manifest - Application Information" known category names. */
  var MF_CATEGORIES = ['books', 'business', 'education', 'entertainment', 'finance', 'fitness', 'food', 'games', 'government', 'health',
    'kids', 'lifestyle', 'magazines', 'medical', 'music', 'navigation', 'news', 'personalization', 'photo', 'politics', 'productivity',
    'security', 'shopping', 'social', 'sports', 'travel', 'utilities', 'weather'];
  var MF_OVERRIDES = ['window-controls-overlay', 'tabbed', 'fullscreen', 'standalone', 'minimal-ui'];

  /* `img` centred in a size × size square, filling `scale` of it; an empty
     bg leaves the corners transparent. SVGs without a size count as square. */
  function iconCanvas(img, size, scale, bg) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g = c.getContext('2d');
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, size, size); }
    var iw = img.naturalWidth || 512, ih = img.naturalHeight || 512;
    var r = Math.min(size * scale / iw, size * scale / ih), w = iw * r, h = ih * r;
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    return c;
  }
  function pngBlob(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) { if (b) resolve(b); else reject(new Error('Could not encode a PNG')); }, 'image/png');
    });
  }

  reg({
    id: 'web-manifest', name: 'Web App Manifest Generator',
    description: 'Build a manifest.webmanifest with icons, shortcuts and display options, make 192/512 and maskable PNG icons from one image, and check installability.',
    keywords: ['manifest', 'web app manifest', 'webmanifest', 'manifest.json', 'pwa', 'progressive web app', 'install', 'installable',
      'add to home screen', 'icons', 'icon generator', 'maskable', 'maskable icon', 'safe zone', 'apple-touch-icon', 'theme color', 'theme colour',
      'background color', 'shortcuts', 'display_override', 'splash screen', 'standalone'],
    render: function (root) {
      var f = {
        name: txt('name', 'Example App'), short: txt('short', 'Example'),
        desc: area('desc', 'Plan, track and share your projects from any device.', 2),
        id: txt('id', '/'), start: txt('start', '/?source=pwa'), scope: txt('scope', '/'),
        lang: txt('lang', 'en-GB'), dir: pick('dir', [{ value: '', label: '(not set)' }, 'ltr', 'rtl', 'auto'], ''),
        display: pick('display', ['standalone', 'fullscreen', 'minimal-ui', 'browser'], 'standalone'),
        orientation: pick('orientation', [{ value: '', label: '(not set)' }, 'any', 'natural', 'portrait', 'portrait-primary', 'portrait-secondary',
          'landscape', 'landscape-primary', 'landscape-secondary'], ''),
        theme: txt('theme', '#4f46e5'), bg: txt('bg', '#ffffff'),
        iconPath: txt('iconpath', '/icons/'), mpath: txt('mpath', '/manifest.webmanifest')
      };
      f.desc.style.minHeight = '60px';
      var watch = Object.keys(f).map(function (k) { return f[k]; });

      function colourField(label, input) {
        var chooser = el('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(input.value) ? input.value : '#000000', 'aria-label': label });
        chooser.addEventListener('input', function () { input.value = chooser.value; run(); });
        input.addEventListener('input', function () { if (/^#[0-9a-f]{6}$/i.test(input.value.trim())) chooser.value = input.value.trim(); });
        return U.field(label, el('div', { class: 'sb-row' }, chooser, input));
      }

      var overrides = MF_OVERRIDES.map(function (o) {
        var c = U.checkbox(o);
        c.input.dataset.k = 'ov-' + o;
        watch.push(c.input);
        return c;
      });
      var cats = { productivity: true };
      var catBox = el('div', { class: 'chips', dataset: { k: 'cats' } }, MF_CATEGORIES.map(function (c) {
        var b = el('button', { type: 'button', class: 'chip' + (cats[c] ? ' on' : ''), text: c });
        b.addEventListener('click', function () { cats[c] = !cats[c]; b.classList.toggle('on', !!cats[c]); run(); });
        return b;
      }));

      var shortcuts = [{ name: 'New project', url: '/projects/new', desc: 'Start a blank project' }];
      var scBox = el('div', { class: 'sb-rows', dataset: { k: 'shortcuts' } });
      function drawShortcuts() {
        scBox.replaceChildren.apply(scBox, shortcuts.map(function (s, i) {
          var n = txt(null, s.name, 'Name'), u = txt(null, s.url, '/path'), d = txt(null, s.desc, 'Description (optional)');
          n.addEventListener('input', function () { s.name = n.value; run(); });
          u.addEventListener('input', function () { s.url = u.value; run(); });
          d.addEventListener('input', function () { s.desc = d.value; run(); });
          return el('div', { class: 'sb-row' }, n, u, d, U.button('✕', function () { shortcuts.splice(i, 1); drawShortcuts(); run(); }, 'ghost'));
        }));
      }

      /* --- icons ------------------------------------------------------------ */
      var img = null;
      var pad = el('input', { type: 'range', min: '40', max: '100', step: '2', value: '68', dataset: { k: 'pad' } });
      var padLabel = el('label');
      var maskOn = U.checkbox('Maskable icons (192 and 512)', { checked: true });
      var appleOn = U.checkbox('apple-touch-icon (180 × 180)', { checked: true });
      var fitAny = U.checkbox('Standard icons fill the whole square (untick for a small margin)', { checked: true });
      [pad, maskOn.input, appleOn.input, fitAny.input].forEach(function (n) { watch.push(n); });
      var previews = el('div', { class: 'sb-icons', dataset: { k: 'icons' } });
      var iconNote = U.note('No image yet: the manifest still lists the icon files, so make them yourself or add an image here.');
      var prog = U.progress();
      var drop = U.dropzone({
        accept: 'image/*', label: 'Drop a square logo (PNG or SVG, 512 px or larger)', hint: 'or click to choose; it never leaves this device',
        onFiles: function (files) {
          U.loadImage(files[0]).then(function (im) { img = im; run(); }).catch(function (e) { iconNote.className = 'note err'; iconNote.textContent = e.message; });
        }
      });

      function folder() { return f.iconPath.value.trim().replace(/^[a-z]+:\/\/[^/]+/i, '').replace(/^\/+/, ''); }
      function iconSrc(file) { var p = f.iconPath.value.trim() || '/'; return p + (/\/$/.test(p) ? '' : '/') + file; }
      function specs() {
        var list = [{ file: 'icon-192.png', size: 192, purpose: 'any' }, { file: 'icon-512.png', size: 512, purpose: 'any' }];
        if (maskOn.input.checked) list.push({ file: 'maskable-192.png', size: 192, purpose: 'maskable' }, { file: 'maskable-512.png', size: 512, purpose: 'maskable' });
        return list;
      }
      function bgColour() { var c = f.bg.value.trim(); return CSS.supports('color', c) ? c : '#ffffff'; }
      function draw(spec) {
        var scale = spec.purpose === 'maskable' || spec.apple ? +pad.value / 100 : (fitAny.input.checked ? 1 : 0.9);
        return iconCanvas(img, spec.size, scale, spec.purpose === 'maskable' || spec.apple ? bgColour() : '');
      }

      function drawPreviews() {
        padLabel.textContent = 'Logo size inside maskable icons: ' + pad.value + '% (keep it inside the dashed safe-zone circle)';
        if (!img) { previews.replaceChildren(); return; }
        var anyUrl = draw({ size: 192, purpose: 'any' }).toDataURL('image/png');
        var maskUrl = draw({ size: 192, purpose: 'maskable' }).toDataURL('image/png');
        function fig(label, url, radius, safe) {
          var box = el('div', { class: 'ic', style: { borderRadius: radius || '0' } }, el('img', { src: url, alt: '' }));
          /* the maskable safe zone is a centred circle 80% of the icon wide */
          if (safe) box.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40" fill="none" stroke="#e11d48" stroke-width="1.2" stroke-dasharray="3 2"/></svg>');
          return el('figure', {}, box, el('figcaption', { text: label }));
        }
        var figs = [fig('Standard icon', anyUrl)];
        if (maskOn.input.checked) {
          figs.push(fig('Maskable: safe zone', maskUrl, '0', true), fig('Circle', maskUrl, '50%'), fig('Squircle', maskUrl, '30%'), fig('Teardrop', maskUrl, '50% 50% 50% 12%'));
        }
        if (appleOn.input.checked) figs.push(fig('iOS home screen', draw({ size: 180, apple: true }).toDataURL('image/png'), '22%'));
        previews.replaceChildren.apply(previews, figs);
      }

      /* --- manifest ----------------------------------------------------------- */
      var out = codeOut('manifest'), head = codeOut('head'), issues = issuesNode('warnings');

      function manifest() {
        var m = {};
        function put(k, v) { if (v !== '' && v !== undefined && v !== null && !(Array.isArray(v) && !v.length)) m[k] = v; }
        put('id', f.id.value.trim());
        put('name', f.name.value.trim()); put('short_name', f.short.value.trim()); put('description', f.desc.value.trim());
        put('lang', f.lang.value.trim()); put('dir', f.dir.value);
        put('start_url', f.start.value.trim()); put('scope', f.scope.value.trim());
        put('display', f.display.value);
        put('display_override', overrides.filter(function (c) { return c.input.checked; }).map(function (c) { return c.querySelector('span').textContent; }));
        put('orientation', f.orientation.value);
        put('theme_color', f.theme.value.trim()); put('background_color', f.bg.value.trim());
        put('categories', MF_CATEGORIES.filter(function (c) { return cats[c]; }));
        put('icons', specs().map(function (s) { return { src: iconSrc(s.file), sizes: s.size + 'x' + s.size, type: 'image/png', purpose: s.purpose }; }));
        put('shortcuts', shortcuts.filter(function (s) { return s.name.trim() || s.url.trim(); }).map(function (s) {
          var o = { name: s.name.trim(), url: s.url.trim() };
          if (s.desc.trim()) o.description = s.desc.trim();
          return o;
        }));
        return m;
      }
      function manifestText() { return JSON.stringify(manifest(), null, 2); }
      function headTags() {
        var e = U.escapeHtml, L = ['<link rel="manifest" href="' + e(f.mpath.value.trim() || '/manifest.webmanifest') + '">'];
        if (f.theme.value.trim()) L.push('<meta name="theme-color" content="' + e(f.theme.value.trim()) + '">');
        if (appleOn.input.checked) L.push('<link rel="apple-touch-icon" href="' + e(iconSrc('apple-touch-icon.png')) + '">');
        if (f.short.value.trim() || f.name.value.trim()) L.push('<meta name="apple-mobile-web-app-title" content="' + e(f.short.value.trim() || f.name.value.trim()) + '">');
        return L.join('\n');
      }

      /* start_url and scope resolve against the manifest's own URL */
      function resolve(u) { try { return new URL(u, new URL(f.mpath.value.trim() || '/manifest.webmanifest', 'https://example.com/')); } catch (e) { return null; } }
      function inScope(url, scope) {
        var u = resolve(url || '.'), s = resolve(scope || '.');
        return !!(u && s && u.origin === s.origin && u.pathname.indexOf(s.pathname) === 0);
      }

      function check() {
        var L = [], name = f.name.value.trim(), short = f.short.value.trim(), disp = f.display.value;
        if (!name && !short) L.push(['err', 'Give the app a name or short_name: browsers will not offer to install it without one.']);
        if (short && Array.from(short).length > 12) L.push(['warn', 'short_name is ' + Array.from(short).length + ' characters; home screens show about 12 before cutting it off.']);
        if (!short && name && Array.from(name).length > 12) L.push(['warn', 'Add a short_name: "' + name + '" is long for a home-screen label.']);
        if (disp === 'browser' && !overrides.some(function (c) { return c.input.checked; })) {
          L.push(['err', 'display "browser" opens the app in a normal tab, so Chrome and Edge will not offer to install it. Use standalone, fullscreen or minimal-ui.']);
        }
        var start = f.start.value.trim(), scope = f.scope.value.trim();
        if (!start) L.push(['warn', 'Set start_url; without it the app opens on whichever page the user installed it from.']);
        else if (!resolve(start)) L.push(['err', 'start_url is not a valid URL or path.']);
        if (scope && !resolve(scope)) L.push(['err', 'scope is not a valid URL or path.']);
        else if (start && scope && !inScope(start, scope)) L.push(['err', 'start_url (' + start + ') is outside the scope (' + scope + '), so browsers ignore the scope.']);
        if (scope && !/\/$/.test(scope.split(/[?#]/)[0])) L.push(['warn', 'End the scope with a slash: "' + scope + '" also matches paths such as ' + scope + 'x.']);
        if (!f.id.value.trim()) L.push(['info', 'Set an id so the app keeps its identity if you ever change start_url.']);
        ['theme', 'bg'].forEach(function (k) {
          var v = f[k].value.trim(), label = k === 'theme' ? 'theme_color' : 'background_color';
          if (!v) L.push(['warn', 'Add ' + label + (k === 'bg' ? ': it colours the splash screen while the app loads.' : ': it tints the title bar and task switcher.')]);
          else if (!CSS.supports('color', v)) L.push(['err', label + ' "' + v + '" is not a CSS colour.']);
        });
        var lang = f.lang.value.trim();
        if (lang && !langOk(lang)) L.push(['err', 'lang "' + lang + '" is not a valid language tag (try en-GB).']);
        if (!img) L.push(['info', 'The manifest lists ' + specs().length + ' icon files. Add an image above to generate them, or make sure they exist at ' + iconSrc('') + '.']);
        else if (Math.min(img.naturalWidth || 512, img.naturalHeight || 512) < 512) L.push(['warn', 'The image is ' + img.naturalWidth + ' × ' + img.naturalHeight + ' px, so the 512 px icons will be blurry. Use 512 px or larger (or an SVG).']);
        if (img && Math.abs((img.naturalWidth || 1) / (img.naturalHeight || 1) - 1) > 0.05) L.push(['info', 'The image is not square, so it is centred with space around it.']);
        if (!maskOn.input.checked) L.push(['warn', 'Without a maskable icon, Android shows your icon shrunk inside a white circle.']);
        shortcuts.forEach(function (s, i) {
          if (!s.name.trim() && !s.url.trim()) return;
          if (!s.name.trim() || !s.url.trim()) L.push(['err', 'Shortcut ' + (i + 1) + ' needs both a name and a URL.']);
          else if (!inScope(s.url.trim(), scope || start)) L.push(['warn', 'Shortcut "' + s.name.trim() + '" points outside the scope.']);
        });
        if (shortcuts.length > 4) L.push(['info', 'Launchers usually show only the first few shortcuts (often three or four).']);
        if (!f.desc.value.trim()) L.push(['info', 'Add a description: Chrome shows it in the richer install dialog, with screenshots.']);
        L.push(['info', 'Chrome and Edge also need the page served over HTTPS (or localhost) with the manifest linked from it. Add "screenshots" (with form_factor "wide" for desktop) for the richer install dialog.']);
        return L;
      }

      function run() {
        out.textContent = manifestText();
        head.textContent = headTags();
        issueList(issues, check());
        iconNote.style.display = img ? 'none' : '';
        drawPreviews();
      }

      function zipAll() {
        if (!img) { U.toast('Add an image first', 'err'); return; }
        prog.set('Drawing icons…', 0.1);
        var dir = folder();
        U.script('assets/vendor/jszip/jszip.min.js').then(function () {
          var zip = new window.JSZip();
          var list = specs().slice();
          if (appleOn.input.checked) list.push({ file: 'apple-touch-icon.png', size: 180, apple: true });
          return Promise.all(list.map(function (s) {
            return pngBlob(draw(s)).then(function (b) { zip.file(dir + s.file, b); });
          })).then(function () {
            zip.file((f.mpath.value.trim().replace(/^[a-z]+:\/\/[^/]+/i, '').replace(/^\/+/, '') || 'manifest.webmanifest'), manifestText() + '\n');
            zip.file('head-tags.html', headTags() + '\n');
            prog.set('Compressing…', 0.8);
            return zip.generateAsync({ type: 'blob' });
          });
        }).then(function (blob) { U.saveBlob('web-app-manifest.zip', blob); prog.done('Saved web-app-manifest.zip'); })
          .catch(function (e) { prog.fail(e); });
      }

      watch.forEach(function (n) { n.addEventListener('input', run); n.addEventListener('change', run); });
      drawShortcuts();
      run();

      root.appendChild(U.panel('App', el('div', { class: 'sb-grid' },
        U.field('Name', f.name), U.field('Short name', f.short, 'Home-screen label'), U.field('Language', f.lang), U.field('Text direction', f.dir)),
        el('div', { style: { marginTop: '10px' } }, U.field('Description', f.desc))));
      root.appendChild(U.panel('Launch and display', el('div', { class: 'sb-grid' },
        U.field('start_url', f.start), U.field('scope', f.scope), U.field('id', f.id), U.field('Display', f.display), U.field('Orientation', f.orientation),
        colourField('Theme colour', f.theme), colourField('Background colour', f.bg), U.field('Manifest URL', f.mpath)),
        el('div', { class: 'field', style: { marginTop: '10px' } }, el('label', { text: 'display_override (tried in this order, before display)' }),
          el('div', { class: 'row' }, overrides))));
      root.appendChild(U.panel('Icons', drop, iconNote, el('div', { class: 'sb-grid', style: { marginTop: '10px' } }, U.field('Icon folder URL', f.iconPath),
        el('div', { class: 'field' }, padLabel, pad)), el('div', { class: 'stack', style: { margin: '8px 0', gap: '6px' } }, maskOn, appleOn, fitAny), previews,
        U.btnrow(U.button('Download icons + manifest (ZIP)', zipAll, 'primary')), prog));
      root.appendChild(U.panel('Shortcuts', scBox, U.btnrow(U.button('+ Add shortcut', function () { shortcuts.push({ name: '', url: '', desc: '' }); drawShortcuts(); run(); }, 'ghost'))));
      root.appendChild(U.panel('Categories', catBox));
      root.appendChild(U.panel('Installability', issues));
      root.appendChild(U.panel('manifest.webmanifest', out, U.btnrow(U.copyBtn('Copy', function () { return out.textContent; }),
        U.downloadBtn('Download', 'manifest.webmanifest', function () { return manifestText() + '\n'; }, 'application/manifest+json'))));
      root.appendChild(U.panel('Add to every page\'s <head>', head, U.btnrow(U.copyBtn('Copy', function () { return head.textContent; })),
        U.note('Serve the manifest with the content type application/manifest+json.')));
    }
  });

  /* ======================================================================
     security.txt Generator (RFC 9116)
     ====================================================================== */

  /* The RFC 9116 fields plus CSAF, the one extension in the IANA registry. */
  var SEC_FIELDS = ['Contact', 'Expires', 'Encryption', 'Acknowledgments', 'Preferred-Languages', 'Canonical', 'Policy', 'Hiring', 'CSAF'];

  /* Splits a security.txt (optionally an OpenPGP cleartext-signed one) into
     fields, remembering line numbers for the report. */
  function secParse(text) {
    var src = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    var signed = /-----BEGIN PGP SIGNED MESSAGE-----/.test(src), offset = 0, problems = [];
    if (signed) {
      var start = src.indexOf('-----BEGIN PGP SIGNED MESSAGE-----');
      var body = src.indexOf('\n\n', start);
      var end = src.indexOf('-----BEGIN PGP SIGNATURE-----');
      if (body < 0 || end < 0 || end < body) problems.push(['err', 'The OpenPGP signature block is incomplete.']);
      else {
        offset = (src.slice(0, body + 2).match(/\n/g) || []).length;
        /* undo cleartext dash-escaping ("- " before lines starting with a dash) */
        src = src.slice(body + 2, end).replace(/^- /gm, '');
      }
    }
    var fields = [];
    src.split('\n').forEach(function (line, i) {
      var t = line.replace(/\s+$/, '');
      if (!t || t.charAt(0) === '#') return;
      var m = /^([A-Za-z0-9-]+):[ \t]*(.*)$/.exec(t);
      if (!m) { problems.push(['err', 'Line ' + (i + 1 + offset) + ' is not "Field: value": ' + t.slice(0, 60)]); return; }
      var known = SEC_FIELDS.filter(function (f) { return f.toLowerCase() === m[1].toLowerCase(); })[0];
      fields.push({ name: known || m[1], known: !!known, value: m[2].trim(), line: i + 1 + offset });
    });
    return { fields: fields, signed: signed, problems: problems };
  }

  /* RFC 9116 rules, applied to generated and pasted files alike. */
  function secCheck(fields, opts) {
    opts = opts || {};
    var L = [], by = {};
    fields.forEach(function (f) { (by[f.name] = by[f.name] || []).push(f); });
    function at(f) { return f.line ? ' (line ' + f.line + ')' : ''; }
    function uri(f) {
      var m = /^([a-z][a-z0-9+.-]*):(.+)$/i.exec(f.value);
      if (!m) { L.push(['err', f.name + ' must be a URI such as https://…, mailto: or tel:' + at(f) + '.']); return null; }
      var scheme = m[1].toLowerCase();
      if (scheme === 'http') L.push(['err', f.name + ' web addresses must use https://' + at(f) + '.']);
      else if (scheme === 'https' && !absUrl(f.value)) L.push(['err', f.name + ' is not a valid web address' + at(f) + '.']);
      return scheme;
    }
    if (!by.Contact) L.push(['err', 'Contact is required: add at least one email address, web form or phone number.']);
    (by.Contact || []).forEach(function (f) {
      var s = uri(f);
      if (s === 'mailto' && !/^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/i.test(f.value)) L.push(['err', 'Contact ' + f.value + ' is not a valid email address' + at(f) + '.']);
      if (s === 'tel' && !/^tel:\+[0-9][0-9().\- ]{4,}$/.test(f.value)) L.push(['warn', 'Contact ' + f.value + ': write phone numbers in international form, e.g. tel:+44-20-7946-0000' + at(f) + '.']);
      if (s && ['mailto', 'tel', 'https', 'http'].indexOf(s) === -1) L.push(['warn', 'Contact uses an unusual scheme (' + s + ':)' + at(f) + '.']);
    });
    if (!by.Expires) L.push(['err', 'Expires is required: the date after which the file should be treated as stale.']);
    else if (by.Expires.length > 1) L.push(['err', 'Expires must appear only once (found ' + by.Expires.length + ').']);
    if (by.Expires) {
      var e = by.Expires[0];
      var ok = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i.test(e.value), when = new Date(e.value);
      if (!ok || isNaN(when)) L.push(['err', 'Expires must be an RFC 3339 date and time such as 2027-09-21T23:00:00.000Z' + at(e) + '.']);
      else {
        var now = opts.now || new Date(), days = (when - now) / 864e5;
        if (days < 0) L.push(['err', 'The file expired on ' + dmy(when) + ' at ' + hm(when) + '; researchers are told to ignore it.']);
        else if (days > 366) L.push(['warn', 'Expires is ' + Math.round(days) + ' days away; RFC 9116 recommends less than a year so the details stay fresh.']);
        else L.push(['ok', 'Expires on ' + dmy(when) + ' at ' + hm(when) + ' (in ' + plural(Math.round(days), 'day') + ').']);
      }
    }
    (by.Encryption || []).forEach(function (f) {
      if (/BEGIN PGP|^[A-Za-z0-9+/]{60,}={0,2}$/.test(f.value)) { L.push(['err', 'Encryption must point to where the key can be fetched, not contain the key itself' + at(f) + '.']); return; }
      var s = uri(f);
      if (s && ['https', 'dns', 'openpgp4fpr', 'http'].indexOf(s) === -1) L.push(['warn', 'Encryption usually uses https://, dns: or openpgp4fpr: URIs' + at(f) + '.']);
    });
    ['Acknowledgments', 'Canonical', 'Policy', 'Hiring', 'CSAF'].forEach(function (name) { (by[name] || []).forEach(uri); });
    (by.CSAF || []).forEach(function (f) {
      if (!/provider-metadata\.json$/i.test(f.value)) L.push(['warn', 'CSAF should point to your provider-metadata.json' + at(f) + '.']);
    });
    if (by['Preferred-Languages']) {
      if (by['Preferred-Languages'].length > 1) L.push(['err', 'Preferred-Languages must appear only once.']);
      var p = by['Preferred-Languages'][0];
      var bad = p.value.split(',').map(function (s) { return s.trim(); }).filter(function (t) { return !t || !langOk(t); });
      if (bad.length) L.push(['err', 'Preferred-Languages needs comma-separated language tags such as en, fr-CA; not valid: ' + bad.join(', ') + at(p) + '.']);
    }
    if (opts.domain) {
      var want = 'https://' + opts.domain + '/.well-known/security.txt';
      if (!by.Canonical) L.push(['info', 'Add Canonical: ' + want + ', so a signed copy proves where it belongs.']);
      else if (!by.Canonical.some(function (f) { return f.value.toLowerCase() === want.toLowerCase(); })) L.push(['warn', 'None of the Canonical URIs is ' + want + '; readers should distrust a file fetched from an address it does not list.']);
    }
    fields.filter(function (f) { return !f.known; }).forEach(function (f) {
      L.push(['info', f.name + ' is not an RFC 9116 field, so readers will ignore it' + at(f) + '.']);
    });
    return L;
  }

  reg({
    id: 'security-txt', name: 'security.txt Generator',
    description: 'Write and check a /.well-known/security.txt (RFC 9116) with contacts, expiry, encryption key, policy, acknowledgements, languages, canonical URLs, hiring and CSAF.',
    keywords: ['security.txt', 'securitytxt', 'rfc 9116', 'rfc9116', 'well-known', 'vulnerability disclosure', 'responsible disclosure', 'bug bounty',
      'security contact', 'csaf', 'pgp', 'expires', 'canonical', 'acknowledgments', 'acknowledgements', 'vdp'],
    render: function (root) {
      var domain = txt('domain', 'example.com', 'example.com');
      var contacts = [{ type: 'mailto', value: 'security@example.com' }];
      var contactBox = el('div', { class: 'sb-rows', dataset: { k: 'contacts' } });
      var expires = txt('expires', '', '', 'datetime-local');
      var f = {
        encryption: area('encryption', 'https://example.com/pgp-key.txt', 2, 'https://example.com/pgp-key.txt'),
        ack: area('ack', '', 2, 'https://example.com/hall-of-fame'),
        langs: txt('langs', 'en', 'en, fr'),
        canonical: area('canonical', '', 2),
        policy: area('policy', 'https://example.com/security-policy', 2, 'https://example.com/security-policy'),
        hiring: area('hiring', '', 2, 'https://example.com/jobs/security'),
        csaf: area('csaf', '', 2, 'https://example.com/.well-known/csaf/provider-metadata.json'),
        comment: area('comment', '', 2, 'Optional comment lines, e.g. "We aim to reply within two working days"')
      };
      Object.keys(f).forEach(function (k) { if (f[k].tagName === 'TEXTAREA') f[k].style.minHeight = '58px'; });
      var canonTouched = false;
      f.canonical.addEventListener('input', function () { canonTouched = true; });
      function autoCanonical() {
        if (canonTouched) return;
        var d = hostOf(domain.value);
        f.canonical.value = d ? 'https://' + d + '/.well-known/security.txt' : '';
      }
      function hostOf(s) { return String(s || '').trim().replace(/^[a-z]+:\/\//i, '').replace(/[/?#].*$/, '').toLowerCase(); }

      function setExpiry(months) {
        var d = new Date();
        d.setMonth(d.getMonth() + months);
        if (months >= 12) d.setDate(d.getDate() - 1);
        d.setHours(0, 0, 0, 0);
        expires.value = localInput(d);
        run();
      }

      var CONTACT_TYPES = [{ value: 'mailto', label: 'Email' }, { value: 'https', label: 'Web page' }, { value: 'tel', label: 'Phone' }];
      function contactUri(c) {
        var v = c.value.trim();
        if (!v) return '';
        if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return v;
        if (c.type === 'mailto') return 'mailto:' + v;
        if (c.type === 'tel') return 'tel:' + v.replace(/\s+/g, '-');
        return 'https://' + v.replace(/^\/+/, '');
      }
      function drawContacts() {
        contactBox.replaceChildren.apply(contactBox, contacts.map(function (c, i) {
          var type = pick(null, CONTACT_TYPES, c.type), value = txt(null, c.value, c.type === 'mailto' ? 'security@example.com' : c.type === 'tel' ? '+44 20 7946 0000' : 'https://example.com/report');
          type.classList.add('narrow');
          type.addEventListener('change', function () { c.type = type.value; drawContacts(); run(); });
          value.addEventListener('input', function () { c.value = value.value; run(); });
          return el('div', { class: 'sb-row' }, type, value, U.button('✕', function () { contacts.splice(i, 1); drawContacts(); run(); }, 'ghost'));
        }));
      }

      function fields() {
        var list = [];
        contacts.forEach(function (c) { var u = contactUri(c); if (u) list.push({ name: 'Contact', value: u, known: true }); });
        if (expires.value) {
          var d = new Date(expires.value);
          list.push({ name: 'Expires', value: isNaN(d) ? expires.value : d.toISOString(), known: true });
        }
        lines(f.encryption.value).forEach(function (v) { list.push({ name: 'Encryption', value: v, known: true }); });
        lines(f.ack.value).forEach(function (v) { list.push({ name: 'Acknowledgments', value: v, known: true }); });
        if (f.langs.value.trim()) list.push({ name: 'Preferred-Languages', value: f.langs.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean).join(', '), known: true });
        lines(f.canonical.value).forEach(function (v) { list.push({ name: 'Canonical', value: v, known: true }); });
        lines(f.policy.value).forEach(function (v) { list.push({ name: 'Policy', value: v, known: true }); });
        lines(f.hiring.value).forEach(function (v) { list.push({ name: 'Hiring', value: v, known: true }); });
        lines(f.csaf.value).forEach(function (v) { list.push({ name: 'CSAF', value: v, known: true }); });
        return list;
      }
      function text() {
        var comment = f.comment.value.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) { return '# ' + l.replace(/^#\s*/, ''); });
        return comment.concat(comment.length ? [''] : [], fields().map(function (x) { return x.name + ': ' + x.value; })).join('\n') + '\n';
      }

      var out = codeOut('out'), issues = issuesNode('issues');
      function run() {
        out.textContent = text();
        var list = secCheck(fields(), { domain: hostOf(domain.value) });
        list.push(['info', 'Not signed yet. RFC 9116 recommends an OpenPGP cleartext signature; keep Canonical in the file when you sign it.']);
        issueList(issues, list);
      }

      /* --- import and check an existing file --------------------------------- */
      var imp = area('import', '', 7, 'Paste an existing security.txt, signed or not');
      var impIssues = issuesNode('import-issues');
      function importFile() {
        var p = secParse(imp.value);
        if (!p.fields.length) { issueList(impIssues, [['err', 'No fields found.']].concat(p.problems)); return; }
        var list = p.problems.concat(secCheck(p.fields, { domain: hostOf(domain.value) }));
        list.unshift(p.signed ? ['ok', 'The file carries an OpenPGP cleartext signature (check it with a PGP tool).'] : ['info', 'The file is not signed.']);
        issueList(impIssues, list);
        /* load it into the form so it can be edited and regenerated */
        contacts = p.fields.filter(function (x) { return x.name === 'Contact'; }).map(function (x) {
          var s = (x.value.split(':')[0] || '').toLowerCase();
          return { type: s === 'tel' ? 'tel' : s === 'mailto' ? 'mailto' : 'https', value: x.value.replace(/^(mailto|tel):/i, '') };
        });
        if (!contacts.length) contacts = [{ type: 'mailto', value: '' }];
        var exp = p.fields.filter(function (x) { return x.name === 'Expires'; })[0];
        if (exp && !isNaN(new Date(exp.value))) expires.value = localInput(new Date(exp.value));
        function join(name) { return p.fields.filter(function (x) { return x.name === name; }).map(function (x) { return x.value; }).join('\n'); }
        f.encryption.value = join('Encryption'); f.ack.value = join('Acknowledgments'); f.canonical.value = join('Canonical');
        f.policy.value = join('Policy'); f.hiring.value = join('Hiring'); f.csaf.value = join('CSAF');
        f.langs.value = join('Preferred-Languages');
        canonTouched = true;
        drawContacts();
        run();
      }

      domain.addEventListener('input', function () { autoCanonical(); run(); });
      [expires].concat(Object.keys(f).map(function (k) { return f[k]; })).forEach(function (n) { n.addEventListener('input', run); n.addEventListener('change', run); });
      autoCanonical();
      drawContacts();
      setExpiry(12);

      root.appendChild(U.panel('Where it lives', U.field('Domain', domain, 'The file goes at https://<domain>/.well-known/security.txt')));
      root.appendChild(U.panel('Contact (required)', contactBox, U.btnrow(U.button('+ Add contact', function () { contacts.push({ type: 'mailto', value: '' }); drawContacts(); run(); }, 'ghost')),
        U.note('List them in order of preference: the first is the preferred way to reach you.')));
      root.appendChild(U.panel('Expires (required)', U.row(el('div', { class: 'grow' }, U.field('Expires', expires, 'Your local time; written out in UTC')),
        U.button('3 months', function () { setExpiry(3); }, 'ghost'), U.button('6 months', function () { setExpiry(6); }, 'ghost'), U.button('1 year', function () { setExpiry(12); }, 'ghost'))));
      root.appendChild(U.panel('Optional fields', el('div', { class: 'sb-grid' },
        U.field('Encryption (key URLs, one per line)', f.encryption), U.field('Policy', f.policy), U.field('Acknowledgments', f.ack),
        U.field('Preferred-Languages', f.langs, 'Comma-separated, e.g. en, cy'), U.field('Canonical', f.canonical, 'Filled in from the domain'),
        U.field('Hiring', f.hiring), U.field('CSAF', f.csaf), U.field('Comment', f.comment))));
      root.appendChild(U.panel('security.txt', out, U.btnrow(U.copyBtn('Copy', function () { return out.textContent; }),
        U.downloadBtn('Download security.txt', 'security.txt', function () { return text(); }, 'text/plain')),
        el('p', { class: 'note' }, 'Upload it to /.well-known/security.txt, served over HTTPS as text/plain; charset=utf-8 (you can redirect /security.txt to it). ',
          'To sign it, use ', el('a', { href: '#/t/pgp-tool', text: 'PGP Encrypt, Decrypt & Sign' }), ' (cleartext signature) or gpg --clearsign security.txt, and upload the signed version.')));
      root.appendChild(U.panel('Checks', issues));
      root.appendChild(U.panel('Check an existing file', imp, U.btnrow(U.button('Check and load', importFile)), impIssues));
    }
  });

  /* ======================================================================
     llms.txt Generator
     Format from the llms.txt proposal v2 (llmstxt.org, revised August 2026):
     an H1 name (the only required part), an optional blockquote summary,
     optional details with no headings, then H2 sections of "file lists",
     each item "- [name](url)" optionally followed by ": notes". A section
     called "Optional" holds secondary links agents may skip.
     ====================================================================== */

  var LLMS_LINK = /^[-*+]\s+\[([^\]]+)\]\(\s*<?([^)\s>]+)>?\s*\)(?:\s*:\s*(.*))?$/;

  function llmsName(url) {
    var seg = String(url).split(/[?#]/)[0].replace(/\/+$/, '').split('/').pop() || url;
    seg = decodeURIComponentSafe(seg).replace(/\.(html?\.md|md|html?|txt)$/i, '').replace(/[-_]+/g, ' ').trim();
    return seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : url;
  }
  function decodeURIComponentSafe(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }

  /* Reads an llms.txt into { title, summary, details, sections } and lists
     every departure from the proposal's structure. */
  function llmsParse(text) {
    var src = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    var rows = src.split('\n'), L = [], doc = { title: '', summary: [], details: [], sections: [] };
    var fence = false, stage = 'start', sec = null, h1s = 0, seen = Object.create(null), links = 0;
    rows.forEach(function (raw, i) {
      var n = i + 1, line = raw.replace(/\s+$/, ''), t = line.trim();
      if (/^(```|~~~)/.test(t)) fence = !fence;
      var head = !fence && /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(t);
      if (stage === 'start') {
        if (!t) return;
        if (head && head[1].length === 1) { doc.title = head[2]; h1s++; stage = 'afterTitle'; return; }
        L.push(['err', 'Line ' + n + ': the file must open with an H1 naming the project ("# Name"), before anything else.']);
        stage = 'afterTitle';
        if (!head) { doc.details.push(line); return; }
      }
      if (head && head[1].length === 1) {
        h1s++;
        /* a late H1 still names the file when there was none before it */
        if (!doc.title && !doc.sections.length) { doc.title = head[2]; stage = 'afterTitle'; return; }
        L.push(['err', 'Line ' + n + ': only one H1 is allowed; use H2 (##) for sections.']);
        return;
      }
      if (head && head[1].length === 2) {
        sec = { name: head[2], links: [], line: n, other: 0 };
        doc.sections.push(sec);
        stage = 'lists';
        return;
      }
      if (head) {
        L.push(['warn', 'Line ' + n + ': H' + head[1].length + ' headings are not part of the format; only the H1 and H2 sections are.']);
        return;
      }
      if (stage === 'afterTitle' || stage === 'summary') {
        if (!t) { if (stage === 'summary') stage = 'details'; return; }
        if (/^>/.test(t) && (stage === 'afterTitle' || stage === 'summary')) { doc.summary.push(t.replace(/^>\s?/, '')); stage = 'summary'; return; }
        stage = 'details';
      }
      if (stage === 'details') { doc.details.push(line); return; }
      /* inside an H2 file-list section */
      if (!t) return;
      var m = LLMS_LINK.exec(t);
      if (m) {
        links++;
        sec.links.push({ name: m[1].trim(), url: m[2], notes: (m[3] || '').trim() });
        if (seen[m[2]]) L.push(['warn', 'Line ' + n + ': ' + m[2] + ' is already listed (line ' + seen[m[2]] + ').']);
        else seen[m[2]] = n;
        if (!/^[a-z][a-z0-9+.-]*:/i.test(m[2])) L.push(['info', 'Line ' + n + ': ' + m[2] + ' is relative; agents resolve it against the llms.txt address.']);
        else if (!/^https?:\/\//i.test(m[2])) L.push(['warn', 'Line ' + n + ': links should be web addresses (https://…).']);
        return;
      }
      if (/^[-*+]\s+\[[^\]]+\]\([^)]*\)\s*[-–—]\s*\S/.test(t)) L.push(['warn', 'Line ' + n + ': put a colon after the link before the notes: "- [name](url): notes".']);
      else if (/^[-*+]\s+/.test(t)) L.push(['warn', 'Line ' + n + ': list items in a section must start with a markdown link: "- [name](url)".']);
      else { sec.other++; L.push(['warn', 'Line ' + n + ': "' + sec.name + '" should hold only a list of links; move prose into the details above the first section.']); }
    });
    if (!doc.title) L.unshift(['err', 'No H1 found: "# Project name" is the one required part.']);
    if (doc.title && !doc.summary.length) L.push(['info', 'Add a "> summary" blockquote right under the H1: it is the first thing an agent reads.']);
    doc.sections.forEach(function (s) { if (!s.links.length) L.push(['warn', 'Section "' + s.name + '" (line ' + s.line + ') has no links.']); });
    var names = doc.sections.map(function (s) { return s.name.toLowerCase(); });
    names.forEach(function (x, i) { if (names.indexOf(x) !== i) L.push(['warn', 'There are two sections called "' + doc.sections[i].name + '".']); });
    if (src.length > 50000) L.push(['warn', 'The file is ' + Math.round(src.length / 1000) + ' kB (about ' + Math.round(src.length / 4000) + 'k tokens). Keep llms.txt short and put the detail behind the links.']);
    doc.links = links;
    doc.h1s = h1s;
    return { doc: doc, issues: L };
  }

  reg({
    id: 'llms-txt', name: 'llms.txt Generator',
    description: 'Build an /llms.txt for AI agents: title, summary, details and sections of annotated links, with a format check, a preview and the link tags that point to it.',
    keywords: ['llms.txt', 'llms', 'llm', 'ai', 'agents', 'chatgpt', 'claude', 'gemini', 'markdown', 'ai crawler', 'geo', 'generative engine optimization',
      'generative engine optimisation', 'ai seo', 'llmstxt', 'documentation', 'docs'],
    render: function (root) {
      var title = txt('title', 'Example Docs', 'Project or site name');
      var summary = area('summary', 'Example is a hosted API for sending transactional email. These docs cover setup, the REST API and the official SDKs.', 2);
      var details = area('details', 'Important notes:\n\n- All requests need an API key in the Authorization header.\n- Prices are in GBP and exclude VAT.', 4);
      var path = txt('path', '/llms.txt', '/llms.txt');
      summary.style.minHeight = '58px';
      var sections = [
        { name: 'Docs', links: [
          { name: 'Quick start', url: 'https://example.com/docs/quickstart.md', notes: 'Create a key and send your first email' },
          { name: 'API reference', url: 'https://example.com/docs/api.md', notes: 'Every endpoint, parameter and error code' }] },
        { name: 'Optional', links: [{ name: 'Changelog', url: 'https://example.com/changelog.md', notes: '' }] }
      ];
      var secBox = el('div', { dataset: { k: 'sections' } });
      var out = codeOut('out'), preview = el('div', { class: 'sb-md', dataset: { k: 'preview' } }), issues = issuesNode('issues');
      var linkTags = codeOut('links');
      var view = tabs('view', ['Text', 'Preview'], function () { showView(); }, 'Text');
      function showView() { out.style.display = view.value === 'Text' ? '' : 'none'; preview.style.display = view.value === 'Preview' ? '' : 'none'; }

      function drawSections() {
        secBox.replaceChildren.apply(secBox, sections.map(function (s, si) {
          var name = txt(null, s.name, 'Section name');
          name.addEventListener('input', function () { s.name = name.value; run(); refreshTargets(); });
          var rows = s.links.map(function (l, li) {
            var n = txt(null, l.name, 'Link title'), u = txt(null, l.url, 'https://…'), d = txt(null, l.notes, 'Notes (optional)');
            n.addEventListener('input', function () { l.name = n.value; run(); });
            u.addEventListener('input', function () { l.url = u.value; run(); });
            d.addEventListener('input', function () { l.notes = d.value; run(); });
            return el('div', { class: 'sb-row' }, n, u, d, U.button('✕', function () { s.links.splice(li, 1); drawSections(); run(); }, 'ghost'));
          });
          return el('div', { class: 'sb-card' },
            el('div', { class: 'sb-row' }, el('b', { text: '##' }), name, U.button('Remove section', function () { sections.splice(si, 1); drawSections(); run(); refreshTargets(); }, 'ghost')),
            el('div', { class: 'sb-rows', style: { marginTop: '8px' } }, rows),
            U.btnrow(U.button('+ Link', function () { s.links.push({ name: '', url: '', notes: '' }); drawSections(); run(); }, 'ghost')));
        }));
      }

      function text() {
        var L = ['# ' + (title.value.trim() || 'Untitled')];
        var sum = summary.value.trim();
        if (sum) L.push('', sum.split(/\r?\n/).map(function (l) { return '> ' + l.trim(); }).join('\n'));
        var det = details.value.replace(/\s+$/, '');
        if (det.trim()) L.push('', det.replace(/^\s*\n/, ''));
        sections.forEach(function (s) {
          var items = s.links.filter(function (l) { return l.url.trim(); });
          if (!s.name.trim() && !items.length) return;
          L.push('', '## ' + (s.name.trim() || 'Links'), '');
          items.forEach(function (l) {
            L.push('- [' + (l.name.trim() || llmsName(l.url.trim())).replace(/[[\]]/g, '') + '](' + l.url.trim().replace(/[()\s]/g, encodeURIComponent) + ')' + (l.notes.trim() ? ': ' + l.notes.trim().replace(/\s+/g, ' ') : ''));
          });
        });
        return L.join('\n') + '\n';
      }

      function run() {
        var t = text();
        out.textContent = t;
        preview.innerHTML = window.Markdown ? window.Markdown.render(t) : U.escapeHtml(t);
        var r = llmsParse(t);
        if (/^#/m.test(details.value)) r.issues.push(['warn', 'The details must not contain headings; start sections with the section list below instead.']);
        issueList(issues, r.issues, 'Follows the llms.txt format: ' + plural(r.doc.sections.length, 'section') + ', ' + plural(r.doc.links, 'link') + '.');
        var p = path.value.trim() || '/llms.txt';
        linkTags.textContent = '<!-- in the <head> of the pages it covers -->\n<link rel="describedby" href="' + U.escapeHtml(p) + '">\n\n' +
          '# or as an HTTP response header\nLink: <' + p + '>; rel="describedby"';
      }

      /* --- bulk add ------------------------------------------------------------ */
      var bulk = area('bulk', '', 4, 'One per line: a URL, "Title | URL | notes", or a markdown "- [Title](url): notes" line');
      var target = pick('target', [], '');
      function refreshTargets() {
        var keep = target.value;
        target.replaceChildren.apply(target, sections.map(function (s, i) { return el('option', { value: String(i), text: s.name || 'Section ' + (i + 1) }); }).concat(el('option', { value: 'new', text: 'A new section' })));
        target.value = Array.prototype.some.call(target.options, function (o) { return o.value === keep; }) ? keep : (sections.length ? '0' : 'new');
      }
      function addBulk() {
        var items = lines(bulk.value).map(function (l) {
          var m = LLMS_LINK.exec(l);
          if (m) return { name: m[1].trim(), url: m[2], notes: (m[3] || '').trim() };
          var parts = l.split('|').map(function (x) { return x.trim(); });
          if (parts.length > 1) {
            var urlIdx = parts.findIndex(function (x) { return /^(https?:\/\/|\/)/i.test(x); });
            if (urlIdx < 0) return null;
            var nm = urlIdx === 0 ? '' : parts[0];
            return { name: nm || llmsName(parts[urlIdx]), url: parts[urlIdx], notes: parts.slice(urlIdx + 1).join(' | ') };
          }
          return /^(https?:\/\/|\/)\S+$/i.test(l) ? { name: llmsName(l), url: l, notes: '' } : null;
        }).filter(Boolean);
        if (!items.length) { U.toast('No links found in that text', 'err'); return; }
        var s = target.value === 'new' ? null : sections[+target.value];
        if (!s) { s = { name: 'Links', links: [] }; sections.push(s); }
        s.links = s.links.filter(function (l) { return l.url.trim() || l.name.trim(); }).concat(items);
        bulk.value = '';
        drawSections(); refreshTargets(); run();
        U.toast('Added ' + plural(items.length, 'link'));
      }

      /* --- check an existing file --------------------------------------------- */
      var check = area('check', '', 7, 'Paste an existing llms.txt to check it');
      var checkIssues = issuesNode('check-issues');
      function checkFile() {
        var r = llmsParse(check.value);
        issueList(checkIssues, r.issues, 'Follows the format: ' + plural(r.doc.sections.length, 'section') + ', ' + plural(r.doc.links, 'link') + '.');
        return r;
      }
      function loadFile() {
        var r = checkFile();
        if (!r.doc.title && !r.doc.sections.length) return;
        title.value = r.doc.title;
        summary.value = r.doc.summary.join('\n');
        details.value = r.doc.details.join('\n').replace(/^\n+|\n+$/g, '');
        sections = r.doc.sections.map(function (s) { return { name: s.name, links: s.links.slice() }; });
        drawSections(); refreshTargets(); run();
      }

      [title, summary, details, path].forEach(function (n) { n.addEventListener('input', run); });
      drawSections(); refreshTargets(); showView(); run();

      root.appendChild(U.panel('Header', U.field('Name (H1, required)', title), U.field('Summary (blockquote)', summary),
        U.field('Details (any markdown except headings)', details)));
      root.appendChild(U.panel('Sections of links', secBox, U.btnrow(
        U.button('+ Section', function () { sections.push({ name: '', links: [{ name: '', url: '', notes: '' }] }); drawSections(); refreshTargets(); run(); }, 'ghost'),
        U.button('+ Optional section', function () { sections.push({ name: 'Optional', links: [{ name: '', url: '', notes: '' }] }); drawSections(); refreshTargets(); run(); }, 'ghost')),
        U.note('Link to clean markdown where you can (page.html.md or page.md). A section named "Optional" holds secondary links an agent can skip.')));
      root.appendChild(U.panel('Paste a list of links', bulk, U.row(el('div', { class: 'grow' }, U.field('Add to', target)), U.button('Add links', addBulk))));
      root.appendChild(U.panel('llms.txt', view, out, preview, issues, U.btnrow(U.copyBtn('Copy', function () { return out.textContent; }),
        U.downloadBtn('Download llms.txt', 'llms.txt', function () { return text(); }, 'text/plain'))));
      root.appendChild(U.panel('Point pages at it', U.field('Where the file lives', path, 'A file at /docs/llms.txt covers everything under /docs/'), linkTags));
      root.appendChild(U.panel('Check an existing llms.txt', check, U.btnrow(U.button('Check', checkFile), U.button('Load into the editor', loadFile, 'ghost')), checkIssues));
    }
  });

  /* ======================================================================
     hreflang Tag Generator
     ====================================================================== */

  /* ISO 639-1 (183 codes) and ISO 3166-1 alpha-2 (249 codes), taken from the
     iso-639-1 3.1.6 (MIT) and i18n-iso-countries 7.14.0 (MIT) npm packages.
     XK (Kosovo) is left out: it is user-assigned, not part of the standard. */
  var ISO639 = new Set(('aa ab ae af ak am an ar as av ay az ba be bg bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es ' +
    'et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko ' +
    'kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt ' +
    'qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo ' +
    'wa wo xh yi yo za zh zu').split(' '));
  var ISO3166 = new Set(('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA ' +
    'CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI ' +
    'GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC ' +
    'LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA ' +
    'PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH ' +
    'TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW').split(' '));
  /* Country codes and retired codes that people put where the language goes. */
  var LANG_HINT = { jp: 'ja', cn: 'zh', dk: 'da', cz: 'cs', gr: 'el', kr: 'ko', ua: 'uk', vn: 'vi', il: 'he', gb: 'en', us: 'en', at: 'de',
    mx: 'es', cl: 'es', ir: 'fa', rs: 'sr', iw: 'he', ji: 'yi', jw: 'jv', mo: 'ro' };

  function displayName(type, code) {
    try { return new Intl.DisplayNames(['en-GB'], { type: type }).of(code) || code; } catch (e) { return code; }
  }

  /* Checks one hreflang value the way Google reads it: an ISO 639-1
     language, an optional ISO 15924 script and an optional ISO 3166-1
     alpha-2 region, or the reserved x-default. */
  function hrefCode(raw) {
    var r = { raw: raw, norm: '', errs: [], warns: [], xdefault: false };
    var s = String(raw || '').trim();
    if (!s) { r.errs.push('empty hreflang value'); return r; }
    if (s.toLowerCase() === 'x-default') { r.norm = 'x-default'; r.xdefault = true; return r; }
    if (s.indexOf('_') > -1) { r.errs.push('use a hyphen, not an underscore (' + s.replace(/_/g, '-') + ')'); s = s.replace(/_/g, '-'); }
    var p = s.split('-'), lang = p[0].toLowerCase(), rest = p.slice(1), script = '', region = '';
    if (rest.length && /^[a-z]{4}$/i.test(rest[0])) { script = rest.shift(); script = script.charAt(0).toUpperCase() + script.slice(1).toLowerCase(); }
    if (rest.length) region = rest.shift();
    if (rest.length) r.errs.push('too many parts: use language, optional script and optional region only');
    if (!/^[a-z]{2,3}$/.test(lang)) r.errs.push('"' + p[0] + '" is not a language code');
    else if (lang.length === 3) r.errs.push('"' + lang + '" is a three-letter code; Google reads only ISO 639-1 two-letter language codes');
    else if (!ISO639.has(lang)) {
      if (lang === 'in') r.errs.push('"in" is not a language (it is India\'s country code): use hi-IN or en-IN for India, or id for Indonesian');
      else if (ISO3166.has(lang.toUpperCase())) r.errs.push('"' + lang + '" is a country code, not a language code' + (LANG_HINT[lang] ? ': did you mean ' + LANG_HINT[lang] + '?' : '; start with the language, e.g. en-' + lang.toUpperCase()));
      else r.errs.push('"' + lang + '" is not an ISO 639-1 language code' + (LANG_HINT[lang] ? ' (did you mean ' + LANG_HINT[lang] + '?)' : ''));
    }
    if (region) {
      if (/^\d{3}$/.test(region)) r.errs.push('"' + region + '" is a UN M.49 region; Google only understands ISO 3166-1 country codes, so list the countries instead');
      else if (!/^[a-z]{2}$/i.test(region)) r.errs.push('"' + region + '" is not a two-letter country code');
      else {
        region = region.toUpperCase();
        if (region === 'UK') r.errs.push('the United Kingdom\'s code is GB, so write ' + lang + '-GB');
        else if (region === 'EU' || region === 'UN') r.errs.push(region + ' is not a country, and hreflang does not support it');
        else if (region === 'XK') r.warns.push('XK (Kosovo) is user-assigned rather than part of ISO 3166-1, so search engines may ignore it');
        else if (!ISO3166.has(region)) r.errs.push('"' + region + '" is not an ISO 3166-1 country code');
      }
    }
    if (script && displayName('script', script) === script) r.warns.push('"' + script + '" is not a script code this browser knows (ISO 15924, e.g. Hans, Hant, Latn, Cyrl)');
    r.norm = lang + (script ? '-' + script : '') + (region ? '-' + region : '');
    return r;
  }
  function urlKey(u) { try { return new URL(String(u).trim()).href; } catch (e) { return String(u).trim(); } }
  function xmlEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }

  /* Reads pasted hreflang annotations (a sitemap, or page URLs each followed
     by that page's <link> tags) and checks self-references and return links. */
  function hrefAudit(text) {
    var pages = [], L = [];
    if (/<urlset[\s>]/i.test(text)) {
      var xml = new DOMParser().parseFromString(text, 'application/xml');
      if (xml.getElementsByTagName('parsererror').length) return [['err', 'The sitemap is not well-formed XML.']];
      Array.prototype.forEach.call(xml.getElementsByTagNameNS('*', 'url'), function (u) {
        var loc = u.getElementsByTagNameNS('*', 'loc')[0];
        if (!loc) return;
        pages.push({ url: loc.textContent.trim(), links: Array.prototype.filter.call(u.getElementsByTagNameNS('*', 'link'), function (l) {
          return /(^|\s)alternate(\s|$)/i.test(l.getAttribute('rel') || '') && l.hasAttribute('hreflang');
        }).map(function (l) { return { code: l.getAttribute('hreflang'), href: (l.getAttribute('href') || '').trim() }; }) });
      });
    } else {
      var cur = null;
      text.split(/\r?\n/).forEach(function (line) {
        var m = /^\s*(?:page:\s*)?(https?:\/\/\S+)\s*$/i.exec(line);
        if (m) { cur = { url: m[1], html: '' }; pages.push(cur); }
        else if (cur) cur.html += line + '\n';
      });
      pages.forEach(function (p) {
        var doc = new DOMParser().parseFromString(p.html, 'text/html');
        p.links = Array.prototype.map.call(doc.querySelectorAll('link[hreflang]'), function (l) {
          return { code: l.getAttribute('hreflang'), href: (l.getAttribute('href') || '').trim(), rel: l.getAttribute('rel') || '' };
        }).filter(function (l) { return /(^|\s)alternate(\s|$)/i.test(l.rel); });
      });
    }
    if (!pages.length) return [['err', 'Paste an XML sitemap with xhtml:link entries, or each page\'s URL on its own line followed by that page\'s hreflang <link> tags.']];
    var byUrl = {}, unseen = [];
    pages.forEach(function (p) { byUrl[urlKey(p.url)] = p; });
    pages.forEach(function (p) {
      var me = urlKey(p.url);
      if (!p.links.length) { L.push(['err', p.url + ' has no hreflang annotations.']); return; }
      if (!p.links.some(function (l) { return urlKey(l.href) === me; })) L.push(['err', p.url + ' does not list itself; every page must include its own hreflang line.']);
      var codes = {};
      p.links.forEach(function (l) {
        var c = hrefCode(l.code);
        c.errs.forEach(function (e) { L.push(['err', p.url + ': hreflang="' + l.code + '": ' + e + '.']); });
        if (codes[c.norm] && codes[c.norm] !== urlKey(l.href)) L.push(['err', p.url + ' gives "' + l.code + '" to two different URLs.']);
        codes[c.norm] = urlKey(l.href);
        if (!absUrl(l.href)) { L.push(['err', p.url + ': "' + l.href + '" is not an absolute URL.']); return; }
        if (urlKey(l.href) === me) return;
        var other = byUrl[urlKey(l.href)];
        if (!other) { if (unseen.indexOf(l.href) < 0) unseen.push(l.href); return; }
        if (!other.links.some(function (b) { return urlKey(b.href) === me; })) {
          L.push(['err', 'No return link: ' + p.url + ' points to ' + l.href + ' (' + l.code + '), but that page does not point back, so Google ignores the pair.']);
          return;
        }
        if (c.xdefault) return;
        var selfCodes = other.links.filter(function (b) { return urlKey(b.href) === urlKey(other.url); }).map(function (b) { return hrefCode(b.code).norm; });
        if (selfCodes.length && selfCodes.indexOf(c.norm) < 0) L.push(['warn', p.url + ' labels ' + l.href + ' as "' + l.code + '", but that page labels itself "' + selfCodes.join('", "') + '".']);
      });
    });
    if (unseen.length) L.push(['info', plural(unseen.length, 'linked URL') + ' ' + (unseen.length === 1 ? 'was' : 'were') + ' not in what you pasted, so return links to ' + (unseen.length === 1 ? 'it' : 'them') + ' were not checked: ' + unseen.slice(0, 4).join(', ') + (unseen.length > 4 ? '…' : '') + '.']);
    var bad = L.filter(function (i) { return i[0] === 'err'; }).length;
    L.unshift([bad ? 'err' : 'ok', 'Checked ' + plural(pages.length, 'page') + ': ' + (bad ? plural(bad, 'error') + '.' : 'every page lists itself and gets its return links.')]);
    return L;
  }

  reg({
    id: 'hreflang-generator', name: 'hreflang Tag Generator',
    description: 'Map languages and regions to URLs and get hreflang <link> tags, HTTP Link headers and XML sitemap entries, with code, x-default and return-link checks.',
    keywords: ['hreflang', 'hreflang tags', 'international seo', 'multilingual', 'multi-language', 'localisation', 'localization', 'x-default',
      'alternate', 'language', 'region', 'country', 'sitemap', 'link header', 'return links', 'iso 639', 'iso 3166', 'en-gb'],
    render: function (root) {
      var rows = [
        { code: 'en-GB', url: 'https://example.com/uk/' }, { code: 'en-US', url: 'https://example.com/us/' },
        { code: 'de', url: 'https://example.com/de/' }, { code: 'fr-FR', url: 'https://example.com/fr/' }];
      var xdef = txt('xdefault', 'https://example.com/', 'https://example.com/ (shown when no language matches)');
      var rowBox = el('div', { class: 'sb-rows', dataset: { k: 'rows' } });
      var out = codeOut('out'), issues = issuesNode('issues');
      var fmt = tabs('format', ['HTML', 'HTTP header', 'XML sitemap'], function () { run(); }, 'HTML');

      function drawRows() {
        rowBox.replaceChildren.apply(rowBox, rows.map(function (r, i) {
          var code = txt(null, r.code, 'en-GB'), url = txt(null, r.url, 'https://…'), name = el('span', { class: 'sb-muted' });
          code.classList.add('narrow');
          function label() { var c = hrefCode(code.value); name.textContent = c.errs.length ? '' : displayName('language', c.norm); }
          code.addEventListener('input', function () { r.code = code.value; label(); run(); });
          url.addEventListener('input', function () { r.url = url.value; run(); });
          label();
          return el('div', { class: 'sb-row' }, code, url, name, U.button('✕', function () { rows.splice(i, 1); drawRows(); run(); }, 'ghost'));
        }));
      }

      function entries() {
        var list = rows.filter(function (r) { return r.code.trim() || r.url.trim(); }).map(function (r) { return { code: hrefCode(r.code), url: r.url.trim() }; });
        if (xdef.value.trim()) list.push({ code: hrefCode('x-default'), url: xdef.value.trim() });
        return list;
      }

      function check(list) {
        var L = [], seen = {}, urls = {}, langs = {};
        var real = list.filter(function (e) { return !e.code.xdefault; });
        list.forEach(function (e) {
          var label = e.code.raw.trim() || '(blank)';
          e.code.errs.forEach(function (m) { L.push(['err', label + ': ' + m + '.']); });
          e.code.warns.forEach(function (m) { L.push(['warn', label + ': ' + m + '.']); });
          if (!e.url) L.push(['err', label + ' has no URL.']);
          else if (!absUrl(e.url)) L.push(['err', label + ': "' + e.url + '" must be a full URL including https://.']);
          else {
            if (/^http:/i.test(e.url)) L.push(['warn', label + ': ' + e.url + ' uses http://; point hreflang at the https:// version you want indexed.']);
            if (/#/.test(e.url)) L.push(['err', label + ': Google ignores URLs with a #fragment in hreflang.']);
            if (/\s/.test(e.url)) L.push(['err', label + ': the URL contains spaces; percent-encode them.']);
          }
          var key = e.code.norm.toLowerCase();
          if (key && seen[key] && seen[key] !== e.url) L.push(['err', e.code.norm + ' is used twice, for different URLs.']);
          seen[key] = e.url;
          if (!e.code.xdefault && e.url) {
            var lang = e.code.norm.split('-')[0];
            (urls[e.url] = urls[e.url] || []).push(lang);
            langs[lang] = (langs[lang] || []).concat(e.code.norm);
          }
        });
        Object.keys(urls).forEach(function (u) {
          var distinct = urls[u].filter(function (x, i, a) { return a.indexOf(x) === i; });
          if (distinct.length > 1) L.push(['warn', u + ' is given to different languages (' + distinct.join(', ') + '); each language normally has its own page.']);
        });
        Object.keys(langs).forEach(function (lg) {
          var list2 = langs[lg];
          if (list2.length > 1 && list2.indexOf(lg) < 0 && ISO639.has(lg)) L.push(['info', 'You target ' + list2.join(', ') + ' but not plain "' + lg + '": other ' + displayName('language', lg) + ' speakers get the x-default page.']);
        });
        if (!list.some(function (e) { return e.code.xdefault; })) L.push(['warn', 'Add an x-default URL for visitors whose language matches none of these (often the home page or a language picker).']);
        if (real.length < 2) L.push(['warn', 'hreflang needs at least two language versions to mean anything.']);
        if (!L.some(function (i) { return i[0] === 'err' || i[0] === 'warn'; })) L.unshift(['ok', plural(real.length, 'version') + ' checked: codes and URLs are valid.']);
        L.push(['info', 'Put the same complete set, including each page\'s own line, on every page listed. Links that are not returned are ignored.']);
        return L;
      }

      function output(list) {
        var good = list.filter(function (e) { return e.url && e.code.norm; });
        if (fmt.value === 'HTML') {
          return good.map(function (e) { return '<link rel="alternate" hreflang="' + e.code.norm + '" href="' + U.escapeHtml(e.url) + '" />'; }).join('\n');
        }
        if (fmt.value === 'HTTP header') {
          return 'Link: ' + good.map(function (e) { return '<' + e.url + '>; rel="alternate"; hreflang="' + e.code.norm + '"'; }).join(', ');
        }
        var L = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"', '        xmlns:xhtml="http://www.w3.org/1999/xhtml">'];
        var done = {};
        good.forEach(function (page) {
          if (done[page.url]) return;
          done[page.url] = true;
          L.push('  <url>', '    <loc>' + xmlEsc(page.url) + '</loc>');
          good.forEach(function (e) { L.push('    <xhtml:link rel="alternate" hreflang="' + e.code.norm + '" href="' + xmlEsc(e.url) + '"/>'); });
          L.push('  </url>');
        });
        L.push('</urlset>');
        return L.join('\n');
      }

      function run() {
        var list = entries();
        out.textContent = output(list);
        issueList(issues, check(list));
      }

      var bulk = area('bulk', '', 4, 'One per line: code and URL, e.g.\nen-GB https://example.com/uk/\nx-default https://example.com/');
      function replaceRows() {
        var got = lines(bulk.value).map(function (l) {
          var m = /^([A-Za-z0-9_-]+)[\s,;|\t]+(\S+)$/.exec(l) || /^(\S+)[\s,;|\t]+([A-Za-z0-9_-]+)$/.exec(l);
          if (!m) return null;
          return /^https?:/i.test(m[1]) ? { code: m[2], url: m[1] } : { code: m[1], url: m[2] };
        }).filter(Boolean);
        if (!got.length) { U.toast('No "code URL" lines found', 'err'); return; }
        var x = got.filter(function (g) { return g.code.toLowerCase() === 'x-default'; });
        xdef.value = x.length ? x[x.length - 1].url : '';
        rows = got.filter(function (g) { return g.code.toLowerCase() !== 'x-default'; });
        drawRows(); run();
      }

      var auditIn = area('audit-in', '', 8, 'Paste a sitemap with xhtml:link alternates, or for each page its URL on one line followed by its <link rel="alternate" hreflang> tags');
      var audit = issuesNode('audit');
      xdef.addEventListener('input', run);
      drawRows(); run();

      root.appendChild(U.panel('Versions', rowBox, U.btnrow(U.button('+ Add version', function () { rows.push({ code: '', url: '' }); drawRows(); run(); }, 'ghost')),
        U.field('x-default', xdef)));
      root.appendChild(U.panel('Paste a list', bulk, U.btnrow(U.button('Replace versions', replaceRows))));
      function save() {
        var name = { 'HTML': ['hreflang-tags.html', 'text/html'], 'HTTP header': ['hreflang-link-header.txt', 'text/plain'], 'XML sitemap': ['sitemap-hreflang.xml', 'application/xml'] }[fmt.value];
        U.saveText(name[0], out.textContent + '\n', name[1]);
      }
      root.appendChild(U.panel('Output', fmt, el('div', { style: { marginTop: '10px' } }, out), U.btnrow(U.copyBtn('Copy', function () { return out.textContent; }),
        U.button('Download', save))));
      root.appendChild(U.panel('Checks', issues));
      root.appendChild(U.panel('Check existing annotations', auditIn, U.btnrow(U.button('Check return links', function () { issueList(audit, hrefAudit(auditIn.value)); })), audit));
    }
  });

  /* ======================================================================
     Heading Outline Checker
     ====================================================================== */

  var HO_SAMPLE = [
    '<!doctype html>',
    '<html lang="en-GB">',
    '<head>',
    '  <title>Sourdough for beginners | The Bread Blog</title>',
    '  <meta name="description" content="A step-by-step sourdough guide: feeding a starter, mixing, shaping and baking your first loaf at home.">',
    '</head>',
    '<body>',
    '  <h1>Sourdough for beginners</h1>',
    '  <h2>What you need</h2>',
    '  <h3>Flour</h3>',
    '  <h3>A lively starter</h3>',
    '  <h2>Method</h2>',
    '  <h4>Mixing the dough</h4>',
    '  <h2></h2>',
    '  <img src="loaf.jpg" alt="A finished sourdough loaf on a board">',
    '  <img src="crumb.jpg">',
    '</body>',
    '</html>'
  ].join('\n');

  function headingText(n) {
    var c = n.cloneNode(true);
    /* screen readers read an image's alt text as part of the heading */
    c.querySelectorAll('img').forEach(function (img) { img.replaceWith(' ' + (img.getAttribute('alt') || '') + ' '); });
    c.querySelectorAll('script, style, template').forEach(function (x) { x.remove(); });
    return (c.textContent || '').replace(/\s+/g, ' ').trim() || (n.getAttribute('aria-label') || '').trim();
  }

  reg({
    id: 'heading-outline', name: 'Heading Outline Checker',
    description: 'Paste a page\'s HTML to see its h1–h6 outline and catch a missing or repeated h1, skipped levels and empty or overlong headings, plus alt text coverage and title and description lengths.',
    keywords: ['headings', 'heading structure', 'h1', 'h2', 'outline', 'document outline', 'heading hierarchy', 'accessibility', 'a11y', 'seo audit',
      'on-page seo', 'alt text', 'image alt', 'title length', 'meta description length', 'wcag', 'analyze', 'analyse'],
    render: function (root) {
      var input = area('html', HO_SAMPLE, 12, 'Paste the HTML of a page (view source, then copy)');
      var roles = U.checkbox('Include role="heading" elements', { checked: true });
      var stats = el('div', { dataset: { k: 'stats' } });
      var tree = el('ul', { class: 'sb-tree', dataset: { k: 'outline' } });
      var issues = issuesNode('issues');
      var basics = issuesNode('basics');
      var outline = [];

      function run() {
        var doc = new DOMParser().parseFromString(input.value, 'text/html');
        var sel = 'h1, h2, h3, h4, h5, h6' + (roles.input.checked ? ', [role="heading"]' : '');
        outline = Array.prototype.map.call(doc.querySelectorAll(sel), function (n) {
          var isH = /^H[1-6]$/.test(n.tagName), aria = parseInt(n.getAttribute('aria-level'), 10);
          var level = n.getAttribute('role') === 'heading' && aria >= 1 ? Math.min(aria, 6) : isH ? +n.tagName.charAt(1) : 2;
          var hidden = !!n.closest('[hidden], [aria-hidden="true"]') || /display\s*:\s*none|visibility\s*:\s*hidden/i.test(n.getAttribute('style') || '');
          return { level: level, text: headingText(n), tag: isH ? n.tagName.toLowerCase() : 'role="heading"', hidden: hidden };
        });
        var L = [], h1s = outline.filter(function (h) { return h.level === 1; });
        if (!outline.length) L.push(['err', 'No headings at all: give the page an h1, and h2s for its main sections.']);
        else {
          if (!h1s.length) L.push(['err', 'There is no h1. Every page needs one h1 naming its main topic.']);
          else if (h1s.length > 1) L.push(['warn', h1s.length + ' h1 headings (' + h1s.map(function (h) { return '"' + (h.text || 'empty') + '"'; }).join(', ') + '): keep one h1 for the page\'s main topic.']);
          if (outline[0].level !== 1) L.push(['warn', 'The first heading is an h' + outline[0].level + ' ("' + outline[0].text + '"); the outline should start with the h1.']);
        }
        var seen = {};
        outline.forEach(function (h, i) {
          var prev = outline[i - 1];
          h.skip = prev && h.level > prev.level + 1;
          if (h.skip) L.push(['warn', 'h' + h.level + ' "' + (h.text || 'empty') + '" follows h' + prev.level + ' "' + (prev.text || 'empty') + '": ' +
            (h.level - prev.level === 2 ? 'h' + (prev.level + 1) + ' is' : 'h' + (prev.level + 1) + '–h' + (h.level - 1) + ' are') + ' skipped.']);
          if (!h.text) L.push(['err', 'An empty h' + h.level + ' (heading ' + (i + 1) + '): screen readers announce a heading with nothing in it.']);
          else if (h.text.length > 70) L.push(['warn', 'h' + h.level + ' "' + h.text.slice(0, 50) + '…" is ' + h.text.length + ' characters; headings over about 70 are hard to scan.']);
          if (h.hidden) L.push(['info', 'h' + h.level + ' "' + h.text + '" is hidden, so most readers never see it.']);
          var key = h.level + '|' + h.text.toLowerCase();
          if (h.text && seen[key]) L.push(['info', 'Two h' + h.level + ' headings read "' + h.text + '".']);
          seen[key] = true;
        });
        issueList(issues, L, outline.length ? 'The heading outline is well formed.' : '');

        tree.replaceChildren.apply(tree, outline.length ? outline.map(function (h) {
          return el('li', {}, el('span', { class: 'lv', text: 'H' + h.level }),
            el('span', { class: (h.skip ? 'bad' : '') + (h.text ? '' : ' empty'), style: { paddingLeft: (h.level - 1) * 18 + 'px' },
              text: (h.text || '(empty heading)') + (h.hidden ? ' (hidden)' : '') + (h.tag.charAt(0) !== 'h' ? ' [' + h.tag + ']' : '') }));
        }) : [el('li', { class: 'sb-muted', text: 'No headings found.' })]);

        /* page basics: images, title, description */
        var B = [], imgs = Array.prototype.slice.call(doc.querySelectorAll('img'));
        var noAlt = imgs.filter(function (i) { return !i.hasAttribute('alt'); });
        var decorative = imgs.filter(function (i) { return i.hasAttribute('alt') && !i.getAttribute('alt').trim(); });
        var fileLike = imgs.filter(function (i) { return /\.(jpe?g|png|gif|webp|svg|avif)$|^(img|dsc|image|photo|pxl)[-_ ]?\d+/i.test((i.getAttribute('alt') || '').trim()); });
        if (imgs.length) {
          B.push([noAlt.length ? 'warn' : 'ok', (imgs.length - noAlt.length) + ' of ' + plural(imgs.length, 'image') + ' have an alt attribute (' + Math.round((imgs.length - noAlt.length) / imgs.length * 100) + '%)' +
            (decorative.length ? ', ' + decorative.length + ' marked decorative with alt=""' : '') + '.']);
          noAlt.slice(0, 8).forEach(function (i) { B.push(['warn', 'No alt: ' + (i.getAttribute('src') || '(no src)')]); });
          if (noAlt.length > 8) B.push(['warn', '…and ' + (noAlt.length - 8) + ' more without alt.']);
          fileLike.forEach(function (i) { B.push(['warn', 'Alt text that is just a file name: "' + i.getAttribute('alt') + '"']); });
        } else B.push(['info', 'No images.']);
        var title = doc.querySelector('title'), tl = title ? title.textContent.replace(/\s+/g, ' ').trim() : '';
        if (!tl) B.push(['err', 'No <title>: search results and browser tabs need one.']);
        else B.push([tl.length > 60 ? 'warn' : tl.length < 10 ? 'warn' : 'ok', 'Title: ' + tl.length + ' characters ("' + tl + '")' + (tl.length > 60 ? ': Google usually cuts titles after about 60.' : tl.length < 10 ? ': very short.' : '.')]);
        var md = doc.querySelector('meta[name="description" i]'), dl = md ? (md.getAttribute('content') || '').replace(/\s+/g, ' ').trim() : '';
        if (!dl) B.push(['warn', 'No meta description: Google will pick a snippet from the page.']);
        else B.push([dl.length > 160 ? 'warn' : dl.length < 50 ? 'info' : 'ok', 'Meta description: ' + dl.length + ' characters' + (dl.length > 160 ? ': it will be cut at about 155–160.' : dl.length < 50 ? ': short; 120–155 fills the snippet.' : '.')]);
        if (!doc.documentElement.getAttribute('lang') && /<html/i.test(input.value)) B.push(['info', 'The <html> element has no lang attribute.']);
        issueList(basics, B);

        stats.replaceChildren(U.stats([
          { label: 'Headings', value: String(outline.length) }, { label: 'h1', value: String(h1s.length) },
          { label: 'Issues', value: String(L.filter(function (i) { return i[0] === 'err' || i[0] === 'warn'; }).length) },
          { label: 'Images with alt', value: imgs.length ? (imgs.length - noAlt.length) + '/' + imgs.length : '—' }]));
      }

      function outlineText() {
        return outline.map(function (h) { return new Array(h.level).join('  ') + 'H' + h.level + ' ' + (h.text || '(empty)'); }).join('\n');
      }

      U.live([input, roles], run);
      root.appendChild(U.panel('HTML', input, el('div', { class: 'row', style: { marginTop: '8px' } }, roles),
        U.note('The HTML is read in this tab; nothing is fetched. Headings added later by scripts only show if you paste the rendered HTML (Elements panel, Copy outerHTML).')));
      root.appendChild(stats);
      root.appendChild(U.panel('Outline', tree, U.btnrow(U.copyBtn('Copy outline', outlineText))));
      root.appendChild(U.panel('Heading issues', issues));
      root.appendChild(U.panel('Images, title and description', basics));
    }
  });

  /* ======================================================================
     Structured Data (JSON-LD) Validator
     Required and recommended properties follow Google Search Central's rich
     result documentation as of 2026, summarised; the Rich Results Test stays
     the final word. Everything is checked offline.
     ====================================================================== */

  /* A strict JSON parser that says where it failed (JSON.parse messages vary
     between browsers) and names the usual hand-editing slips. */
  function parseJson(text) {
    var i = 0, n = text.length, dupes = [];
    function fail(msg, at) { var e = new Error(msg); e.at = at === undefined ? i : at; throw e; }
    function ws() {
      for (;;) {
        var c = text[i];
        if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '﻿') { i++; continue; }
        if (c === '/' && (text[i + 1] === '/' || text[i + 1] === '*')) fail('Comments are not allowed in JSON.');
        return;
      }
    }
    function value() {
      ws();
      var c = text[i];
      if (c === '{') return object();
      if (c === '[') return array();
      if (c === '"') return string();
      if (c === '\'') fail('Strings need double quotes, not single quotes.');
      if (c === '-' || (c >= '0' && c <= '9')) return number();
      if (text.startsWith('true', i)) { i += 4; return true; }
      if (text.startsWith('false', i)) { i += 5; return false; }
      if (text.startsWith('null', i)) { i += 4; return null; }
      if (i >= n) fail('The JSON ends early: a value is missing.');
      if (/^(NaN|Infinity|undefined)/.test(text.slice(i, i + 9))) fail('NaN, Infinity and undefined are not JSON values.');
      if (c === '“' || c === '”') fail('Curly quotes (“ ”) are not JSON quotes; use straight double quotes.');
      fail('Unexpected ' + JSON.stringify(c) + ' where a value should be.');
    }
    function object() {
      var o = {}, open = i;
      i++; ws();
      if (text[i] === '}') { i++; return o; }
      for (;;) {
        ws();
        if (text[i] !== '"') {
          if (i >= n) fail('The object opened here is never closed: a } is missing.', open);
          if (text[i] === '\'') fail('Property names need double quotes, not single quotes.');
          if (/[A-Za-z_$@]/.test(text[i])) fail('Property names must be in double quotes.');
          fail('Expected a property name in double quotes.');
        }
        var at = i, k = string();
        ws();
        if (text[i] !== ':') fail('Expected ":" after ' + JSON.stringify(k) + '.');
        i++;
        var v = value();
        if (Object.prototype.hasOwnProperty.call(o, k)) dupes.push({ key: k, at: at });
        o[k] = v;
        ws();
        if (text[i] === ',') {
          var comma = i; i++; ws();
          if (text[i] === '}') fail('Trailing comma: remove the comma before }.', comma);
          continue;
        }
        if (text[i] === '}') { i++; return o; }
        if (i >= n) fail('The object opened here is never closed: a } is missing.', open);
        fail('Expected "," or "}" after the value of ' + JSON.stringify(k) + '. Is a comma missing?');
      }
    }
    function array() {
      var a = [], open = i;
      i++; ws();
      if (text[i] === ']') { i++; return a; }
      for (;;) {
        a.push(value());
        ws();
        if (text[i] === ',') {
          var comma = i; i++; ws();
          if (text[i] === ']') fail('Trailing comma: remove the comma before ].', comma);
          continue;
        }
        if (text[i] === ']') { i++; return a; }
        if (i >= n) fail('The list opened here is never closed: a ] is missing.', open);
        fail('Expected "," or "]" in a list. Is a comma missing?');
      }
    }
    function string() {
      var open = i, s = '';
      i++;
      while (i < n) {
        var c = text[i];
        if (c === '"') { i++; return s; }
        if (c === '\\') {
          var e = text[i + 1];
          if (e === 'u') {
            if (!/^[0-9a-fA-F]{4}$/.test(text.substr(i + 2, 4))) fail('Bad \\u escape: it needs four hex digits.');
            s += String.fromCharCode(parseInt(text.substr(i + 2, 4), 16)); i += 6; continue;
          }
          var map = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
          if (!(e in map)) fail('Invalid escape "\\' + (e || '') + '" in a string.');
          s += map[e]; i += 2; continue;
        }
        if (c < ' ') fail(c === '\n' ? 'A string runs onto a new line: close the quote or write \\n.' : 'Control characters must be escaped inside strings.');
        s += c; i++;
      }
      fail('A string is never closed: a " is missing.', open);
    }
    function number() {
      var re = /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/y;
      re.lastIndex = i;
      var m = re.exec(text);
      if (!m) fail('Malformed number.');
      if (m[1] === '0' && /\d/.test(text[i + m[0].length] || '')) fail('Numbers cannot start with a leading zero.');
      i += m[0].length;
      return Number(m[0]);
    }
    var result = value();
    ws();
    if (i < n) fail('Unexpected text after the JSON ends' + (text[i] === '{' || text[i] === '[' ? ': put several items in [ ], use "@graph", or give each its own script block.' : '.'));
    return { value: result, dupes: dupes };
  }

  /* schema.org types this tool checks, with the parent that makes subtypes
     inherit a rule set. */
  var LD_PARENT = {
    NewsArticle: 'Article', BlogPosting: 'Article', TechArticle: 'Article', Report: 'Article', ScholarlyArticle: 'Article',
    Corporation: 'Organization', NGO: 'Organization', EducationalOrganization: 'Organization', GovernmentOrganization: 'Organization',
    NewsMediaOrganization: 'Organization', OnlineStore: 'Organization', SportsTeam: 'Organization', MedicalOrganization: 'Organization',
    PerformingGroup: 'Organization', MusicGroup: 'PerformingGroup', LocalBusiness: 'Organization',
    Restaurant: 'LocalBusiness', CafeOrCoffeeShop: 'LocalBusiness', BarOrPub: 'LocalBusiness', Bakery: 'LocalBusiness', FoodEstablishment: 'LocalBusiness',
    Store: 'LocalBusiness', Hotel: 'LocalBusiness', LodgingBusiness: 'LocalBusiness', Dentist: 'LocalBusiness', MedicalBusiness: 'LocalBusiness',
    LegalService: 'LocalBusiness', AutoRepair: 'LocalBusiness', HairSalon: 'LocalBusiness', HealthAndBeautyBusiness: 'LocalBusiness',
    RealEstateAgent: 'LocalBusiness', ProfessionalService: 'LocalBusiness', HomeAndConstructionBusiness: 'LocalBusiness', Plumber: 'LocalBusiness',
    Electrician: 'LocalBusiness', FinancialService: 'LocalBusiness', EntertainmentBusiness: 'LocalBusiness', SportsActivityLocation: 'LocalBusiness',
    MusicEvent: 'Event', SportsEvent: 'Event', TheaterEvent: 'Event', BusinessEvent: 'Event', ComedyEvent: 'Event', EducationEvent: 'Event',
    Festival: 'Event', ExhibitionEvent: 'Event', FoodEvent: 'Event', SocialEvent: 'Event', ScreeningEvent: 'Event', LiteraryEvent: 'Event',
    ProductModel: 'Product', Vehicle: 'Product', Car: 'Vehicle', IndividualProduct: 'Product',
    CollegeOrUniversity: 'EducationalOrganization', School: 'EducationalOrganization'
  };
  var LD_RULES = {
    Article: { rec: ['headline', 'image', 'datePublished', 'dateModified', 'author'], note: 'Google has no required properties for articles; the recommended ones shape the result.' },
    Product: { req: ['name'], oneOf: ['offers', 'review', 'aggregateRating'], rec: ['image', 'description', 'brand', 'sku', 'gtin|gtin8|gtin12|gtin13|gtin14|mpn', 'offers', 'aggregateRating', 'review'] },
    Offer: { req: ['price|priceSpecification', 'priceCurrency|priceSpecification'], rec: ['availability', 'url', 'priceValidUntil', 'itemCondition'] },
    AggregateOffer: { req: ['lowPrice', 'priceCurrency'], rec: ['highPrice', 'offerCount'] },
    AggregateRating: { req: ['ratingValue', 'ratingCount|reviewCount'], rec: ['bestRating', 'worstRating'], topReq: ['itemReviewed'] },
    Review: { req: ['author', 'reviewRating'], rec: ['datePublished'], topReq: ['itemReviewed'] },
    Rating: { req: ['ratingValue'], rec: ['bestRating', 'worstRating'] },
    Organization: { rec: ['name', 'url', 'logo', 'sameAs', 'description', 'address', 'telephone|email|contactPoint'] },
    LocalBusiness: { req: ['name', 'address'], rec: ['telephone', 'url', 'image', 'geo', 'openingHoursSpecification|openingHours', 'priceRange', 'aggregateRating'] },
    Person: { req: ['name'], rec: ['url', 'image', 'sameAs'] },
    Event: { req: ['name', 'startDate', 'location'], rec: ['description', 'endDate', 'eventStatus', 'eventAttendanceMode', 'image', 'offers', 'organizer', 'performer'] },
    Place: { req: ['address'], rec: ['name'] },
    VirtualLocation: { req: ['url'] },
    PostalAddress: { rec: ['streetAddress', 'addressLocality', 'postalCode', 'addressCountry'] },
    GeoCoordinates: { req: ['latitude', 'longitude'] },
    FAQPage: { req: ['mainEntity'], note: 'Since August 2023 Google shows FAQ rich results only for well-known government and health websites.' },
    Question: { req: ['name', 'acceptedAnswer'] },
    Answer: { req: ['text'] },
    HowTo: { req: ['name', 'step'], rec: ['image', 'totalTime', 'estimatedCost', 'supply', 'tool'], note: 'Google stopped showing HowTo rich results in September 2023; the markup is still valid schema.org.' },
    HowToStep: { req: ['text'], rec: ['name', 'url', 'image'] },
    HowToSection: { req: ['name', 'itemListElement'] },
    Recipe: { req: ['name', 'image'], rec: ['author', 'datePublished', 'description', 'prepTime', 'cookTime', 'totalTime', 'recipeYield', 'recipeIngredient', 'recipeInstructions', 'recipeCategory', 'recipeCuisine', 'keywords', 'nutrition', 'aggregateRating', 'video'] },
    BreadcrumbList: { req: ['itemListElement'] },
    ListItem: { req: ['position'] },
    WebSite: { req: ['name', 'url'], rec: ['alternateName'] },
    VideoObject: { req: ['name', 'thumbnailUrl', 'uploadDate'], rec: ['description', 'contentUrl|embedUrl', 'duration', 'expires', 'interactionStatistic'] },
    JobPosting: { req: ['title', 'description', 'datePosted', 'hiringOrganization', 'jobLocation|applicantLocationRequirements'], rec: ['validThrough', 'employmentType', 'baseSalary', 'identifier', 'directApply', 'jobLocationType'] },
    MonetaryAmount: { req: ['currency', 'value'] },
    ImageObject: { req: ['url|contentUrl'] },
    Brand: { req: ['name'] }
  };
  /* Other common schema.org types: known, so no "unknown type" note. */
  var LD_OTHER = ['Thing', 'WebPage', 'AboutPage', 'ContactPage', 'CollectionPage', 'ItemPage', 'ProfilePage', 'SearchResultsPage', 'CreativeWork',
    'SearchAction', 'EntryPoint', 'ContactPoint', 'OpeningHoursSpecification', 'NutritionInformation', 'PriceSpecification', 'UnitPriceSpecification',
    'QuantitativeValue', 'MonetaryAmountDistribution', 'PropertyValue', 'InteractionCounter', 'Clip', 'BroadcastEvent', 'HowToSupply', 'HowToTool',
    'HowToDirection', 'HowToTip', 'ItemList', 'SiteNavigationElement', 'Country', 'City', 'AdministrativeArea', 'Audience', 'OfferShippingDetails',
    'MerchantReturnPolicy', 'ShippingDeliveryTime', 'DefinedRegion', 'Course', 'SoftwareApplication', 'MobileApplication', 'WebApplication', 'Book',
    'Movie', 'MusicRecording', 'Dataset', 'ClaimReview', 'DiscussionForumPosting', 'SocialMediaPosting', 'QAPage', 'EmployerAggregateRating',
    'Occupation', 'EducationalOccupationalCredential', 'Language', 'Duration', 'MediaObject', 'AudioObject', 'DataDownload', 'SpeakableSpecification'];
  var LD_EXPECT = {
    author: ['Person', 'Organization'], publisher: ['Organization', 'Person'], organizer: ['Person', 'Organization'], creator: ['Person', 'Organization'],
    address: ['PostalAddress'], offers: ['Offer', 'AggregateOffer'], aggregateRating: ['AggregateRating'], review: ['Review'], reviewRating: ['Rating'],
    location: ['Place', 'VirtualLocation', 'PostalAddress'], hiringOrganization: ['Organization'], jobLocation: ['Place'], acceptedAnswer: ['Answer'],
    suggestedAnswer: ['Answer'], step: ['HowToStep', 'HowToSection', 'HowToDirection'], geo: ['GeoCoordinates'], brand: ['Brand', 'Organization'],
    video: ['VideoObject'], baseSalary: ['MonetaryAmount'], nutrition: ['NutritionInformation'], performer: ['Person', 'Organization'],
    image: ['ImageObject'], logo: ['ImageObject'], priceSpecification: ['PriceSpecification', 'UnitPriceSpecification']
  };
  var LD_TEXT_OK = { image: 1, logo: 1, brand: 1, location: 0, performer: 0 };
  var LD_DATES = ['datePublished', 'dateModified', 'dateCreated', 'uploadDate', 'startDate', 'endDate', 'datePosted', 'validThrough', 'priceValidUntil',
    'validFrom', 'expires', 'birthDate', 'foundingDate', 'previousStartDate', 'releaseDate', 'availabilityStarts', 'availabilityEnds'];
  var LD_DURATIONS = ['duration', 'prepTime', 'cookTime', 'totalTime', 'timeRequired'];
  var LD_URLS = ['url', 'sameAs', 'thumbnailUrl', 'contentUrl', 'embedUrl', 'image', 'logo', 'item', 'hasMap', 'menu', 'mainEntityOfPage'];
  var LD_NUMBERS = ['price', 'lowPrice', 'highPrice', 'ratingValue', 'bestRating', 'worstRating', 'ratingCount', 'reviewCount', 'offerCount', 'latitude', 'longitude', 'position'];
  var LD_ENUMS = {
    availability: ['BackOrder', 'Discontinued', 'InStock', 'InStoreOnly', 'LimitedAvailability', 'MadeToOrder', 'OnlineOnly', 'OutOfStock', 'PreOrder', 'PreSale', 'Reserved', 'SoldOut'],
    itemCondition: ['NewCondition', 'UsedCondition', 'RefurbishedCondition', 'DamagedCondition'],
    eventStatus: ['EventScheduled', 'EventCancelled', 'EventMovedOnline', 'EventPostponed', 'EventRescheduled'],
    eventAttendanceMode: ['OfflineEventAttendanceMode', 'OnlineEventAttendanceMode', 'MixedEventAttendanceMode']
  };

  function ldIsA(type, target) {
    for (var t = type, hops = 0; t && hops < 8; t = LD_PARENT[t], hops++) if (t === target) return true;
    return false;
  }
  function ldRules(type) {
    for (var t = type, hops = 0; t && hops < 8; t = LD_PARENT[t], hops++) if (LD_RULES[t]) return { name: t, rules: LD_RULES[t] };
    return null;
  }
  function ldKnown(type) { return !!(LD_RULES[type] || LD_PARENT[type] || LD_OTHER.indexOf(type) > -1); }
  function editDistance(a, b) {
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) d[i] = [i];
    for (j = 0; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function ldSuggest(type) {
    var all = Object.keys(LD_RULES).concat(Object.keys(LD_PARENT), LD_OTHER), best = null, bd = 3;
    all.forEach(function (t) {
      var dist = t.toLowerCase() === type.toLowerCase() ? 0 : editDistance(t.toLowerCase(), type.toLowerCase());
      if (dist < bd) { bd = dist; best = t; }
    });
    return best;
  }
  function isoDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/.exec(String(s).trim());
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3], dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    if (m[4] && (+m[4] > 23 || +m[5] > 59 || (m[6] && +m[6] > 59))) return null;
    return { time: !!m[4], zone: !!m[7], ms: Date.parse(String(s).trim().replace(' ', 'T')) };
  }
  function typesOf(node) { var t = node && node['@type']; return t === undefined ? [] : [].concat(t).map(String); }
  function brief(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return '[' + v.length + ' item' + (v.length === 1 ? '' : 's') + ']';
    if (typeof v === 'object') return typesOf(v).length ? '{' + typesOf(v).join(', ') + '}' : v['@id'] ? '→ ' + v['@id'] : '{…}';
    var s = String(v);
    return s.length > 70 ? JSON.stringify(s.slice(0, 67) + '…') : JSON.stringify(v);
  }

  /* Walks one parsed block: finds every typed node, checks it against the
     rules above and returns cards and issues. */
  function ldCheckBlock(value) {
    var ids = {}, items = [], ctxOk = false, issues = [];
    (function index(v) {
      if (Array.isArray(v)) { v.forEach(index); return; }
      if (!v || typeof v !== 'object') return;
      if (typeof v['@id'] === 'string' && Object.keys(v).length > 1) ids[v['@id']] = v;
      Object.keys(v).forEach(function (k) { index(v[k]); });
    })(value);
    function deref(v) { return v && typeof v === 'object' && !Array.isArray(v) && typeof v['@id'] === 'string' && Object.keys(v).length === 1 && ids[v['@id']] ? ids[v['@id']] : v; }

    var tops = [];
    (function top(v, ctx) {
      if (Array.isArray(v)) { v.forEach(function (x) { top(x, ctx); }); return; }
      if (!v || typeof v !== 'object') return;
      var c = v['@context'] !== undefined ? v['@context'] : ctx;
      if (v['@graph']) { top(v['@graph'], c); if (!typesOf(v).length) return; }
      tops.push({ node: v, ctx: c });
    })(value, undefined);
    if (!tops.length) issues.push(['err', 'No items found: JSON-LD needs an object with "@type".']);
    tops.forEach(function (t) {
      var c = JSON.stringify(t.ctx === undefined ? '' : t.ctx);
      if (t.ctx === undefined) issues.push(['err', (typesOf(t.node)[0] || 'An item') + ' has no "@context": add "@context": "https://schema.org".']);
      else if (!/schema\.org/i.test(c)) issues.push(['warn', 'The @context is not schema.org, so search engines will not read it as schema.org data.']);
      else ctxOk = true;
      if (!typesOf(t.node).length) issues.push(['err', 'A top-level item has no "@type".']);
    });

    var seen = new Set();
    function visit(node, path, nested) {
      node = deref(node);
      if (Array.isArray(node)) { node.forEach(function (x) { visit(x, path, nested); }); return; }
      if (!node || typeof node !== 'object' || seen.has(node)) return;
      seen.add(node);
      var types = typesOf(node);
      if (types.length) items.push(checkNode(node, types, path, nested));
      Object.keys(node).forEach(function (k) {
        if (k.charAt(0) === '@' && k !== '@graph') return;
        visit(node[k], path.concat(k === '@graph' ? [] : [k]), types.length ? true : nested);
      });
    }

    function checkNode(node, types, path, nested) {
      var label = types.join(', '), where = path.length ? ' (' + path.join(' › ') + ')' : '';
      var L = [], rows = [], matched = null;
      function has(p) {
        return p.split('|').some(function (alt) {
          var v = node[alt];
          return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length);
        });
      }
      types.forEach(function (t) {
        if (!ldKnown(t)) {
          var s = ldSuggest(t);
          if (s && s !== t) L.push(['warn', '"' + t + '" is not a schema.org type' + (s.toLowerCase() === t.toLowerCase() ? '; types are case-sensitive, so write "' + s + '".' : '. Did you mean "' + s + '"?')]);
          else L.push(['info', '"' + t + '" is not a type this tool knows, so only its syntax and values were checked.']);
        }
        var r = ldRules(t);
        if (r && !matched) matched = r;
      });
      if (matched) {
        var R = matched.rules;
        (R.req || []).concat(nested ? [] : (R.topReq || [])).forEach(function (p) {
          var ok = has(p);
          rows.push([p.replace(/\|/g, ' or '), 'required', ok]);
          if (!ok) L.push(['err', label + where + ': missing required ' + p.replace(/\|/g, ' or ') + '.']);
        });
        if (R.oneOf) {
          var any = R.oneOf.some(has);
          rows.push([R.oneOf.join(', '), 'one of these', any]);
          if (!any) L.push(['err', label + where + ': needs at least one of ' + R.oneOf.join(', ') + ' for a rich result.']);
        }
        (R.rec || []).forEach(function (p) {
          if (R.oneOf && R.oneOf.indexOf(p) > -1 && rows.some(function (r) { return r[1] === 'one of these' && r[2]; })) return;
          var ok = has(p);
          rows.push([p.replace(/\|/g, ' or '), 'recommended', ok]);
          if (!ok) L.push(['warn', label + where + ': add recommended ' + p.replace(/\|/g, ' or ') + '.']);
        });
        if (R.note) L.push(['info', R.note]);
      }
      /* type-specific rules */
      if (types.some(function (t) { return ldIsA(t, 'BreadcrumbList'); })) {
        var els = [].concat(node.itemListElement || []).map(deref);
        if (els.length === 1) L.push(['warn', 'BreadcrumbList: Google recommends at least two ListItems.']);
        els.forEach(function (li, i) {
          if (!li || typeof li !== 'object') return;
          if (+li.position !== i + 1) L.push(['warn', 'BreadcrumbList item ' + (i + 1) + ': position is ' + JSON.stringify(li.position) + '; number them 1, 2, 3 in order.']);
          var itm = deref(li.item);
          var nm = li.name || (itm && typeof itm === 'object' && itm.name);
          if (!nm) L.push(['err', 'BreadcrumbList item ' + (i + 1) + ': missing name.']);
          if (!li.item && i < els.length - 1) L.push(['err', 'BreadcrumbList item ' + (i + 1) + ': missing item (only the last crumb may leave it out).']);
        });
      }
      if (types.some(function (t) { return ldIsA(t, 'FAQPage'); })) {
        [].concat(node.mainEntity || []).map(deref).forEach(function (q, i) {
          if (q && typeof q === 'object' && typesOf(q).indexOf('Question') < 0) L.push(['err', 'FAQPage mainEntity ' + (i + 1) + ' should be a Question.']);
        });
      }
      if (types.some(function (t) { return ldIsA(t, 'WebSite'); }) && [].concat(node.potentialAction || []).some(function (a) { return a && typesOf(a).indexOf('SearchAction') > -1; })) {
        L.push(['info', 'Google retired the sitelinks search box in November 2024, so the SearchAction is no longer used (it does no harm).']);
      }
      if (types.some(function (t) { return ldIsA(t, 'Event'); })) {
        var sd = node.startDate && isoDate(node.startDate), ed = node.endDate && isoDate(node.endDate);
        if (sd && sd.time && !sd.zone) L.push(['warn', 'Event startDate has a time but no UTC offset; add one, e.g. 2026-10-03T19:30+01:00.']);
        if (sd && ed && ed.ms < sd.ms) L.push(['err', 'Event endDate is before startDate.']);
      }
      if (types.some(function (t) { return ldIsA(t, 'Rating') || ldIsA(t, 'AggregateRating'); }) && node.ratingValue !== undefined) {
        var rv = parseFloat(node.ratingValue), best = node.bestRating !== undefined ? parseFloat(node.bestRating) : 5, worst = node.worstRating !== undefined ? parseFloat(node.worstRating) : 1;
        if (isFinite(rv) && isFinite(best) && isFinite(worst) && (rv > best || rv < worst)) L.push(['err', label + where + ': ratingValue ' + rv + ' is outside ' + worst + '–' + best + (node.bestRating === undefined ? ' (bestRating defaults to 5)' : '') + '.']);
      }
      /* value checks for every property */
      Object.keys(node).forEach(function (k) {
        if (k.charAt(0) === '@') return;
        [].concat(node[k]).forEach(function (raw) {
          var v = deref(raw), at = label + where + ' › ' + k;
          if (v === '' || (typeof v === 'string' && !v.trim())) { L.push(['warn', at + ' is empty.']); return; }
          if (LD_EXPECT[k] && v !== null) {
            if (typeof v !== 'object') {
              if (!LD_TEXT_OK[k] || (k !== 'image' && k !== 'logo')) L.push(['warn', at + ' is plain text; Google expects ' + LD_EXPECT[k].join(' or ') + ' (an object with "@type").']);
            } else {
              var vt = typesOf(v);
              if (!vt.length && !(v['@id'] && Object.keys(v).length === 1)) L.push(['warn', at + ' has no "@type"; use ' + LD_EXPECT[k].join(' or ') + '.']);
              else if (vt.length && !vt.some(function (t) { return LD_EXPECT[k].some(function (x) { return ldIsA(t, x); }); })) L.push(['warn', at + ' is a ' + vt.join(', ') + '; Google expects ' + LD_EXPECT[k].join(' or ') + '.']);
            }
          }
          if (typeof v === 'object') return;
          var s = String(v);
          if (LD_DATES.indexOf(k) > -1) {
            if (!isoDate(s)) L.push(['err', at + ': "' + s + '" is not a valid ISO 8601 date, e.g. 2026-09-22 or 2026-09-22T09:30:00+01:00.']);
          } else if (LD_DURATIONS.indexOf(k) > -1) {
            if (!/^P(?!$)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/.test(s)) L.push(['err', at + ': "' + s + '" is not an ISO 8601 duration, e.g. PT1H30M.']);
          } else if (LD_URLS.indexOf(k) > -1) {
            if (/\s/.test(s.trim())) L.push(['err', at + ': "' + s + '" is not a valid URL (it contains spaces).']);
            else if (!/^https?:\/\//i.test(s)) L.push(['warn', at + ': "' + s + '" is not an absolute URL; write the full https:// address.']);
          } else if (k === 'price' || k === 'lowPrice' || k === 'highPrice') {
            if (typeof v === 'string' && !/^\d+(\.\d+)?$/.test(s.trim())) {
              L.push(['err', at + ': "' + s + '" must be a plain number' + (/[£$€¥]|[A-Za-z]{3}/.test(s) ? ' without a currency symbol or code (put that in priceCurrency)' : /,/.test(s) ? ' with a dot for decimals and no thousands separators' : '') + '.']);
            }
          } else if (LD_NUMBERS.indexOf(k) > -1) {
            if (!isFinite(parseFloat(s)) || !/^-?\d+(\.\d+)?$/.test(s.trim())) L.push(['err', at + ': "' + s + '" should be a number.']);
          } else if (k === 'priceCurrency' || (k === 'currency' && types.indexOf('MonetaryAmount') > -1)) {
            if (/^[a-z]{3}$/.test(s)) L.push(['warn', at + ': write currency codes in capitals ("' + s.toUpperCase() + '").']);
            else if (!/^[A-Z]{3}$/.test(s)) L.push(['err', at + ': "' + s + '" is not an ISO 4217 currency code such as GBP.']);
          } else if (LD_ENUMS[k]) {
            var m = /^(?:https?:\/\/schema\.org\/)?([A-Za-z]+)$/.exec(s.trim());
            if (!m || LD_ENUMS[k].indexOf(m[1]) < 0) L.push(['err', at + ': "' + s + '" is not one of ' + LD_ENUMS[k].map(function (x) { return 'https://schema.org/' + x; }).slice(0, 4).join(', ') + '….']);
            else if (!/^https?:\/\//.test(s.trim())) L.push(['warn', at + ': use the full URL https://schema.org/' + m[1] + '.']);
          }
        });
      });
      return { label: label, id: node['@id'], path: path, rows: rows, issues: L, matched: matched && matched.name };
    }

    tops.forEach(function (t) { visit(t.node, [], false); });
    items.forEach(function (it) { issues = issues.concat(it.issues); });
    return { items: items, issues: issues, ctxOk: ctxOk };
  }

  function ldTree(v, key) {
    if (v && typeof v === 'object') {
      var entries = Array.isArray(v) ? v.map(function (x, i) { return [String(i + 1), x]; }) : Object.keys(v).filter(function (k) { return k !== '@type' && k !== '@context'; }).map(function (k) { return [k, v[k]]; });
      var head = el('summary', {}, key ? el('span', { class: 'k', text: key + ': ' }) : null,
        Array.isArray(v) ? el('span', { class: 'k', text: '[' + v.length + ']' }) : el('span', { class: 't', text: typesOf(v).join(', ') || (v['@id'] ? '→ ' + v['@id'] : '{ }') }));
      return el('details', { open: !key || entries.length < 8 }, head, entries.map(function (e) { return ldTree(e[1], e[0]); }));
    }
    return el('div', { class: 'v' }, el('span', { class: 'k', text: key + ': ' }), brief(v));
  }

  var LD_SAMPLE = [
    '<script type="application/ld+json">',
    '{',
    '  "@context": "https://schema.org",',
    '  "@type": "Product",',
    '  "name": "Walnut desk organiser",',
    '  "image": "https://example.com/img/organiser.jpg",',
    '  "brand": { "@type": "Brand", "name": "Oakden" },',
    '  "offers": {',
    '    "@type": "Offer",',
    '    "price": "£34.99",',
    '    "priceCurrency": "GBP",',
    '    "availability": "InStock"',
    '  },',
    '  "aggregateRating": { "@type": "AggregateRating", "ratingValue": 4.6, "reviewCount": 87 }',
    '}',
    '</script>',
    '<script type="application/ld+json">',
    '{',
    '  "@context": "https://schema.org",',
    '  "@type": "BreadcrumbList",',
    '  "itemListElement": [',
    '    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://example.com/" },',
    '    { "@type": "ListItem", "position": 2, "name": "Desk accessories" }',
    '  ]',
    '}',
    '</script>'
  ].join('\n');

  reg({
    id: 'jsonld-validator', name: 'Structured Data (JSON-LD) Validator',
    description: 'Paste HTML or JSON-LD to extract every structured-data block, pinpoint JSON errors by line and column, see the graph and check common schema.org types against Google\'s rich result requirements.',
    keywords: ['json-ld', 'jsonld', 'structured data', 'schema', 'schema.org', 'rich results', 'rich snippets', 'validator', 'structured data testing tool',
      'google', 'product', 'article', 'faq', 'breadcrumb', 'recipe', 'event', 'review', 'organization', 'organisation', 'local business', 'job posting', 'video'],
    render: function (root) {
      var input = area('in', LD_SAMPLE, 14, 'Paste a page\'s HTML, or a JSON-LD object');
      var stats = el('div', { dataset: { k: 'stats' } });
      var summary = issuesNode('issues');
      var blocksBox = el('div', { dataset: { k: 'blocks' } });
      var graph = el('div', { class: 'sb-graph', dataset: { k: 'graph' } });

      function excerpt(text, at) {
        var lc = lineCol(text, at), rows = text.split('\n'), from = Math.max(0, lc.line - 3), to = Math.min(rows.length, lc.line + 1), out = [];
        for (var i = from; i < to; i++) {
          out.push(String(i + 1).padStart(4) + ' | ' + rows[i]);
          if (i === lc.line - 1) out.push('     | ' + ' '.repeat(Math.max(0, lc.col - 1)) + '^');
        }
        return out.join('\n');
      }

      function run() {
        var src = input.value, t = src.trim();
        var blocks = [];
        if (/^[\[{]/.test(t)) blocks.push({ text: src, start: 0 });
        else {
          var re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi, m;
          while ((m = re.exec(src))) {
            var type = /\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[1]);
            if (!type || (type[1] || type[2] || type[3] || '').trim().toLowerCase() !== 'application/ld+json') continue;
            blocks.push({ text: m[2], start: m.index + m[0].indexOf('>') + 1 });
          }
        }
        var all = [], nItems = 0, cards = [];
        graph.replaceChildren();
        if (!t) { all.push(['info', 'Paste some HTML or JSON-LD.']); }
        else if (!blocks.length) {
          all.push(['err', 'No <script type="application/ld+json"> blocks found.' + (/\bitemscope\b/i.test(src) ? ' The page uses microdata (itemscope), which this tool does not read.' : /\btypeof\s*=/i.test(src) ? ' The page uses RDFa, which this tool does not read.' : '')]);
        }
        blocks.forEach(function (b, bi) {
          var name = 'Block ' + (bi + 1), docLine = lineCol(src, b.start).line;
          var head = el('h4', { text: name + ' (from line ' + docLine + ')' });
          var parsed;
          try { parsed = parseJson(b.text); }
          catch (e) {
            var lc = lineCol(b.text, e.at), dl = lineCol(src, b.start + e.at);
            var msg = name + ': JSON error at line ' + dl.line + ', column ' + dl.col + ' (line ' + lc.line + ' of the block): ' + e.message;
            all.push(['err', msg]);
            cards.push(el('div', { class: 'sb-card' }, head, issueList(issuesNode(), [['err', e.message + ' Line ' + dl.line + ', column ' + dl.col + '.']]),
              el('pre', { class: 'sb-code', text: excerpt(src, b.start + e.at) })));
            return;
          }
          var r = ldCheckBlock(parsed.value);
          parsed.dupes.forEach(function (d) { r.issues.push(['warn', name + ': "' + d.key + '" appears twice in one object (line ' + lineCol(src, b.start + d.at).line + '); only the last one counts.']); });
          nItems += r.items.length;
          all = all.concat(r.issues.map(function (i) { return [i[0], name + ': ' + i[1]]; }));
          cards.push(el('div', { class: 'sb-card' }, head, r.items.map(function (it) {
            var errs = it.issues.filter(function (i) { return i[0] === 'err'; }).length, warns = it.issues.filter(function (i) { return i[0] === 'warn'; }).length;
            return el('div', { style: { margin: '8px 0 12px' } },
              el('div', {}, el('span', { class: 'sb-pill ' + (errs ? 'err' : warns ? 'warn' : 'ok'), text: errs ? plural(errs, 'error') : warns ? plural(warns, 'warning') : 'valid' }),
                el('b', { text: it.label }), it.path.length ? el('span', { class: 'sb-muted', text: '  ' + it.path.join(' › ') }) : null,
                it.id ? el('span', { class: 'sb-muted', text: '  ' + it.id }) : null),
              it.rows.length ? el('div', { class: 'scroll' }, U.table(['Property', 'Needed', 'Status'], it.rows.map(function (row) {
                return [row[0], row[1], el('span', { style: { color: row[2] ? 'var(--ok)' : row[1] === 'recommended' ? 'var(--warn)' : 'var(--err)' }, text: row[2] ? '✓ present' : '✗ missing' })];
              }))) : null,
              it.issues.length ? issueList(issuesNode(), it.issues.filter(function (i) { return i[0] !== 'err' || !/missing required|needs at least one/.test(i[1]); })) : null);
          }), r.issues.filter(function (i) { return !r.items.some(function (it) { return it.issues.indexOf(i) > -1; }); }).length
            ? issueList(issuesNode(), r.issues.filter(function (i) { return !r.items.some(function (it) { return it.issues.indexOf(i) > -1; }); })) : null));
          graph.appendChild(el('div', {}, el('div', { class: 'sb-muted', text: name }), ldTree(parsed.value, '')));
        });
        var c = counts(all);
        stats.replaceChildren(U.stats([{ label: 'Blocks', value: String(blocks.length) }, { label: 'Items', value: String(nItems) },
          { label: 'Errors', value: String(c.err) }, { label: 'Warnings', value: String(c.warn) }]));
        issueList(summary, all.filter(function (i) { return i[0] === 'err' || i[0] === 'warn'; }), blocks.length ? 'No errors or warnings.' : '');
        if (!all.some(function (i) { return i[0] === 'err' || i[0] === 'warn'; }) && !blocks.length) issueList(summary, all);
        blocksBox.replaceChildren.apply(blocksBox, cards);
      }

      U.live([input], run);
      root.appendChild(U.panel('HTML or JSON-LD', input, U.note('Checked in this tab against a summary of Google\'s rich result rules for common types; confirm important pages in Google\'s Rich Results Test.')));
      root.appendChild(stats);
      root.appendChild(U.panel('Errors and warnings', summary));
      root.appendChild(U.panel('Items', blocksBox));
      root.appendChild(U.panel('Graph', graph));
    }
  });

  /* ======================================================================
     Redirect Rules Generator
     A trailing * in an old path is a wildcard; *, :splat or $1 in the new
     URL takes whatever it matched.
     ====================================================================== */

  var RD_FORMATS = [
    { value: 'apache', label: 'Apache .htaccess', file: '.htaccess', mime: 'text/plain' },
    { value: 'nginx', label: 'nginx', file: 'redirects.conf', mime: 'text/plain' },
    { value: 'netlify', label: 'Netlify _redirects', file: '_redirects', mime: 'text/plain' },
    { value: 'vercel', label: 'Vercel vercel.json', file: 'vercel.json', mime: 'application/json' },
    { value: 'cloudflare', label: 'Cloudflare bulk CSV', file: 'bulk-redirects.csv', mime: 'text/csv' },
    { value: 'iis', label: 'IIS web.config', file: 'web.config', mime: 'application/xml' },
    { value: 'caddy', label: 'Caddy', file: 'Caddyfile', mime: 'text/plain' }
  ];
  var RD_SPLAT = /\*|:splat|\$1/;

  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* One row → the parts every output needs, or an error. */
  function rdRule(row, o, host) {
    var r = { from: row.from.trim(), to: row.to.trim(), status: +row.status || 301, errors: [] };
    if (!r.from || !r.to) return null;
    var from = r.from;
    var abs = /^https?:\/\/([^/?#]+)(.*)$/i.exec(from);
    if (abs) {
      if (host && abs[1].toLowerCase().replace(/^www\./, '') !== host.replace(/^www\./, '')) r.errors.push('the old URL is on ' + abs[1] + ', not ' + host);
      from = abs[2] || '/';
    }
    if (from.charAt(0) !== '/') from = '/' + from;
    from = from.replace(/#.*$/, '');
    var q = from.indexOf('?');
    r.query = q > -1 ? from.slice(q + 1) : '';
    r.path = q > -1 ? from.slice(0, q) : from;
    r.wild = o.wild && /\*$/.test(r.path);
    if (r.wild) r.path = r.path.slice(0, -1);
    if (o.wild && r.path.indexOf('*') > -1) r.errors.push('only one * at the end of the old path is supported');
    r.splat = r.wild && RD_SPLAT.test(r.to);
    r.target = r.splat ? r.to.replace(RD_SPLAT, '\u0000') : r.to;
    if (r.wild && !r.splat) r.fixedTarget = true;
    r.base = r.path.length > 1 && o.slash && !r.wild ? r.path.replace(/\/+$/, '') : r.path;
    if (/\s/.test(r.path) || /\s/.test(r.to)) r.errors.push('spaces must be percent-encoded as %20');
    return r;
  }
  function withSplat(t, rep) { return t.replace('\u0000', rep); }

  function rdApache(rules, o) {
    var L = ['# Redirects generated by All The Tools', 'RewriteEngine On', ''];
    rules.forEach(function (r) {
      var p = r.base.replace(/^\//, ''), pat;
      if (r.wild) pat = '^' + reEsc(p) + '(.*)$';
      else if (p === '') pat = '^$';
      else pat = '^' + reEsc(p) + (o.slash ? '/?' : '') + '$';
      if (/\s/.test(pat)) pat = '"' + pat + '"';
      var flags = ['R=' + r.status, 'L'];
      if (o.nocase) flags.push('NC');
      var t = withSplat(r.target, '$1');
      if (r.query) { L.push('RewriteCond %{QUERY_STRING} ^' + reEsc(r.query) + '$' + (o.nocase ? ' [NC]' : '')); flags.push('QSD'); }
      else if (!o.keep) flags.push('QSD');
      else if (t.indexOf('?') > -1) flags.push('QSA');
      L.push('RewriteRule ' + pat + ' ' + t + ' [' + flags.join(',') + ']');
    });
    return L.join('\n');
  }

  function rdNginx(rules, o) {
    var blocks = [], byKey = {};
    rules.forEach(function (r) {
      var line;
      if (!r.wild && !o.nocase && !(o.slash && r.base !== '/')) line = 'location = ' + r.path + ' {';
      else {
        var re = r.wild ? '^' + reEsc(r.base) + '(.*)$' : '^' + reEsc(r.base) + (o.slash && r.base !== '/' ? '/?' : '') + '$';
        line = 'location ' + (o.nocase ? '~*' : '~') + ' "' + re + '" {';
      }
      var b = byKey[line] || (byKey[line] = { line: line, ifs: [], ret: null });
      if (blocks.indexOf(b) < 0) blocks.push(b);
      var t = withSplat(r.target, '$1');
      if (r.query) b.ifs.push('    if ($args = "' + r.query.replace(/"/g, '\\"') + '") { return ' + r.status + ' ' + t + '; }');
      else {
        if (o.keep) t += t.indexOf('?') > -1 ? '&$args' : '$is_args$args';
        b.ret = '    return ' + r.status + ' ' + t + ';';
      }
    });
    var L = ['# Redirects generated by All The Tools: paste inside the server { } block'];
    blocks.forEach(function (b) { L.push(b.line); b.ifs.forEach(function (x) { L.push(x); }); if (b.ret) L.push(b.ret); L.push('}'); });
    return L.join('\n');
  }

  function rdNetlify(rules) {
    var rows = rules.map(function (r) {
      return [r.path + (r.wild ? '*' : ''), r.query ? r.query.split('&').join(' ') : '', withSplat(r.target, ':splat'), String(r.status)];
    });
    var w0 = Math.max.apply(null, rows.map(function (x) { return x[0].length; }).concat([4])) + 2;
    var w1 = Math.max.apply(null, rows.map(function (x) { return x[1].length; }).concat([0]));
    var w2 = Math.max.apply(null, rows.map(function (x) { return x[2].length; }).concat([4])) + 2;
    return ['# Redirects generated by All The Tools'].concat(rows.map(function (x) {
      return x[0].padEnd(w0) + (w1 ? x[1].padEnd(w1 + 2) : '') + x[2].padEnd(w2) + x[3];
    })).join('\n');
  }

  function rdVercel(rules, o) {
    function ptr(s) { return s.replace(/[(){}?+*:]/g, '\\$&'); }
    return JSON.stringify({ redirects: rules.map(function (r) {
      var src = r.wild ? ptr(r.base.replace(/\/$/, '')) + '/:path*' : ptr(r.base) + (o.slash && r.base !== '/' ? '{/}?' : '');
      var x = { source: src, destination: withSplat(r.target, ':path*') };
      if (r.status === 308) x.permanent = true;
      else if (r.status === 307) x.permanent = false;
      else x.statusCode = r.status;
      if (r.query) x.has = r.query.split('&').map(function (kv) { var i = kv.indexOf('='); return { type: 'query', key: i > -1 ? kv.slice(0, i) : kv, value: i > -1 ? kv.slice(i + 1) : undefined }; });
      return x;
    }) }, null, 2);
  }

  function rdCloudflare(rules, o, host) {
    var L = [];
    rules.forEach(function (r) {
      if (r.query) return;
      var t = withSplat(r.target, '');
      if (/^\//.test(t)) t = 'https://' + (host || 'example.com') + t;
      L.push([(host || 'example.com') + r.path, t, r.status, o.keep ? 'TRUE' : 'FALSE', 'FALSE', r.wild ? 'TRUE' : 'FALSE', r.splat ? 'TRUE' : 'FALSE'].join(','));
    });
    return L.join('\n');
  }

  function rdIis(rules, o) {
    var x = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
    var type = { 301: 'Permanent', 302: 'Found', 303: 'SeeOther', 307: 'Temporary', 308: 'Permanent' };
    var L = ['<?xml version="1.0" encoding="UTF-8"?>', '<configuration>', '  <system.webServer>', '    <rewrite>', '      <rules>'];
    rules.forEach(function (r, i) {
      var p = r.base.replace(/^\//, '');
      var pat = r.wild ? '^' + reEsc(p) + '(.*)$' : p === '' ? '^$' : '^' + reEsc(p) + (o.slash ? '/?' : '') + '$';
      L.push('        <rule name="Redirect ' + (i + 1) + '" stopProcessing="true">',
        '          <match url="' + x(pat) + '" ignoreCase="' + (o.nocase ? 'true' : 'false') + '" />');
      if (r.query) L.push('          <conditions>', '            <add input="{QUERY_STRING}" pattern="^' + x(reEsc(r.query)) + '$" />', '          </conditions>');
      L.push('          <action type="Redirect" url="' + x(withSplat(r.target, '{R:1}')) + '" redirectType="' + (type[r.status] || 'Permanent') + '" appendQueryString="' + (o.keep && !r.query ? 'true' : 'false') + '" />',
        '        </rule>');
    });
    L.push('      </rules>', '    </rewrite>', '  </system.webServer>', '</configuration>');
    return L.join('\n');
  }

  function rdCaddy(rules, o, host) {
    var L = [(host || 'example.com') + ' {'];
    rules.forEach(function (r, i) {
      var n = 'r' + (i + 1);
      var re = (o.nocase ? '(?i)' : '') + (r.wild ? '^' + reEsc(r.base) + '(.*)$' : '^' + reEsc(r.base) + (o.slash && r.base !== '/' ? '/?' : '') + '$');
      var t = withSplat(r.target, '{re.' + n + '.1}');
      if (o.keep && !r.query) t += t.indexOf('?') > -1 ? '&{query}' : '{?query}';
      L.push('  @' + n + ' {', '    path_regexp ' + n + ' ' + re);
      if (r.query) L.push('    query ' + r.query.split('&').join(' '));
      L.push('  }', '  redir @' + n + ' ' + t + ' ' + r.status);
    });
    L.push('}');
    return L.join('\n');
  }

  /* Finds redirects that lead to another redirect, or back to themselves. */
  function rdChains(rules, o, host) {
    var L = [];
    function key(p) {
      var m = /^https?:\/\/([^/?#]+)(.*)$/i.exec(p);
      if (m) {
        if (!host || m[1].toLowerCase().replace(/^www\./, '') !== host.replace(/^www\./, '')) return null;
        p = m[2] || '/';
      }
      if (p.charAt(0) !== '/') p = '/' + p;
      p = p.replace(/#.*$/, '');
      if (!o.keep || p.indexOf('?') < 0) p = p.replace(/\?.*$/, '');
      if (o.slash && p.length > 1) p = p.replace(/\/+(\?|$)/, '$1');
      return o.nocase ? p.toLowerCase() : p;
    }
    var exact = {}, wild = [];
    rules.forEach(function (r) {
      var k = key(r.path + (r.query ? '?' + r.query : ''));
      if (r.wild) wild.push({ prefix: o.nocase ? r.path.toLowerCase() : r.path, r: r });
      else if (exact[k]) L.push(['err', 'Two rules redirect ' + r.from + ': only the first one will ever run.']);
      else exact[k] = r;
    });
    Object.keys(exact).forEach(function (k) {
      var r = exact[k], seen = [k], cur = r, hops = 0;
      if (key(r.to) === k) { L.push(['err', 'Loop: ' + r.from + ' redirects to itself.']); return; }
      while (cur && hops < 20) {
        var nk = key(cur.to);
        if (nk === null) break;
        if (seen.indexOf(nk) > -1) { L.push(['err', 'Loop: ' + seen.concat(nk).join(' → ') + '. Browsers give up with "too many redirects".']); return; }
        seen.push(nk);
        cur = exact[nk];
        if (!cur) {
          var w = wild.filter(function (x) { return nk.indexOf(x.prefix) === 0; })[0];
          if (w) { L.push(['warn', 'Chain: ' + r.from + ' → ' + r.to + ' is caught again by ' + w.r.from + '. Point it at the final address.']); return; }
          break;
        }
        hops++;
      }
      if (hops >= 1) L.push(['warn', 'Chain of ' + (hops + 1) + ' redirects: ' + seen.join(' → ') + '. Send ' + r.from + ' straight to ' + seen[seen.length - 1] + '.']);
    });
    wild.forEach(function (w) {
      var t = key(withSplat(w.r.target, 'x'));
      if (t === null) return;
      if (t.indexOf(w.prefix) === 0) L.push(['err', 'Loop: ' + w.r.from + ' → ' + w.r.to + ' sends every match back into the same pattern.']);
      else wild.forEach(function (w2) { if (w2 !== w && t.indexOf(w2.prefix) === 0) L.push(['warn', 'Chain: ' + w.r.from + ' leads into ' + w2.r.from + '.']); });
    });
    return L;
  }

  reg({
    id: 'redirect-generator', name: 'Redirect Rules Generator',
    description: 'Turn a list of old and new URLs into 301/302/307/308 redirects for Apache, nginx, Netlify, Vercel, Cloudflare, IIS and Caddy, with wildcards and chain and loop detection.',
    keywords: ['redirect', 'redirects', '301', '302', '307', '308', 'htaccess', 'rewrite', 'nginx', 'netlify', '_redirects', 'vercel', 'vercel.json',
      'cloudflare', 'bulk redirects', 'iis', 'web.config', 'caddy', 'caddyfile', 'site migration', 'redirect chain', 'redirect loop', 'url mapping'],
    render: function (root) {
      var rows = [{ from: '/old-page', to: '/new-page', status: 301 }, { from: '/blog/*', to: '/news/*', status: 301 }, { from: '/about-us', to: '/about', status: 301 }];
      var host = txt('domain', 'example.com', 'example.com');
      var def = pick('status', [{ value: '301', label: '301 Moved Permanently' }, { value: '302', label: '302 Found (temporary)' }, { value: '307', label: '307 Temporary Redirect' }, { value: '308', label: '308 Permanent Redirect' }], '301');
      var opt = {
        wild: U.checkbox('* at the end of an old path is a wildcard', { checked: true }),
        keep: U.checkbox('Keep the query string', { checked: true }),
        slash: U.checkbox('Match with or without a trailing slash', { checked: true }),
        nocase: U.checkbox('Case-insensitive matching')
      };
      Object.keys(opt).forEach(function (k) { opt[k].input.dataset.k = 'opt-' + k; });
      var rowBox = el('div', { class: 'sb-rows', dataset: { k: 'rows' } });
      var fmt = tabs('format', RD_FORMATS.map(function (f) { return { value: f.value, label: f.label }; }), function () { run(); }, 'apache');
      var out = codeOut('out'), notes = issuesNode('notes'), issues = issuesNode('issues');
      var STATUS = [{ value: '301', label: '301' }, { value: '302', label: '302' }, { value: '307', label: '307' }, { value: '308', label: '308' }];

      function drawRows() {
        rowBox.replaceChildren.apply(rowBox, rows.map(function (r, i) {
          var a = txt(null, r.from, '/old-path'), b = txt(null, r.to, '/new-path or https://…'), s = pick(null, STATUS, String(r.status));
          s.classList.add('narrow');
          a.addEventListener('input', function () { r.from = a.value; run(); });
          b.addEventListener('input', function () { r.to = b.value; run(); });
          s.addEventListener('change', function () { r.status = +s.value; run(); });
          return el('div', { class: 'sb-row' }, a, el('span', { text: '→' }), b, s, U.button('✕', function () { rows.splice(i, 1); drawRows(); run(); }, 'ghost'));
        }));
      }
      function opts() { return { wild: opt.wild.input.checked, keep: opt.keep.input.checked, slash: opt.slash.input.checked, nocase: opt.nocase.input.checked }; }
      function hostName() { return host.value.trim().replace(/^[a-z]+:\/\//i, '').replace(/[/?#].*$/, '').toLowerCase(); }

      function run() {
        var o = opts(), h = hostName(), L = [], N = [];
        var rules = rows.map(function (r, i) {
          var x = rdRule(r, o, h);
          if (x) x.errors.forEach(function (e) { L.push(['err', 'Row ' + (i + 1) + ' (' + r.from + '): ' + e + '.']); });
          return x;
        }).filter(Boolean);
        var f = fmt.value, text = '';
        if (!rules.length) text = '';
        else if (f === 'apache') text = rdApache(rules, o);
        else if (f === 'nginx') text = rdNginx(rules, o);
        else if (f === 'netlify') text = rdNetlify(rules, o);
        else if (f === 'vercel') text = rdVercel(rules, o);
        else if (f === 'cloudflare') text = rdCloudflare(rules, o, h);
        else if (f === 'iis') text = rdIis(rules, o);
        else text = rdCaddy(rules, o, h);
        out.textContent = text;
        L = L.concat(rdChains(rules, o, h));
        rules.forEach(function (r) {
          if (r.to && !/^(https?:\/\/|\/)/i.test(r.to)) L.push(['warn', r.from + ' → "' + r.to + '": start the new address with / or https://.']);
          if (r.fixedTarget) L.push(['info', r.from + '* sends every matching page to ' + r.to + '. Put * in the new URL to keep the rest of the path.']);
        });
        if ((r302(rules)) > 0) L.push(['info', 'Use 301 or 308 for pages that have moved for good; 302 and 307 tell search engines to keep the old URL.']);
        if (!L.length && rules.length) L.push(['ok', plural(rules.length, 'redirect') + ', no chains or loops.']);
        /* notes on how the chosen platform behaves */
        if (f === 'apache') N.push(['info', 'Needs mod_rewrite. In .htaccess the leading slash is dropped from patterns.']);
        if (f === 'nginx') N.push(['info', 'Test with nginx -t, then reload. For thousands of redirects a map block is faster.']);
        if (f === 'netlify') N.push(['info', 'Netlify skips a redirect when a file still exists at the old path; add ! after the status (301!) to force it. Netlify decides query-string handling itself.']);
        if (f === 'vercel') N.push(['info', 'Merge the "redirects" array into your vercel.json (up to 2,048 entries). Vercel matches paths case-sensitively.']);
        if (f === 'cloudflare') {
          N.push(['info', 'Columns: source, target, status, preserve query string, include subdomains, subpath matching, preserve path suffix. Import it into a Bulk Redirect List, then enable it with a Bulk Redirect Rule.']);
          if (!h) N.push(['err', 'Cloudflare needs full source URLs: fill in the site domain.']);
          if (rules.some(function (r) { return r.query; })) N.push(['warn', 'Cloudflare bulk redirects cannot match query strings, so those rows were left out.']);
          if (o.nocase) N.push(['warn', 'Cloudflare bulk redirects are case-sensitive.']);
          rules.forEach(function (r) { if (r.splat && !/\u0000$/.test(r.target)) N.push(['warn', r.from + ': Cloudflare can only add the matched part at the end of the target.']); });
        }
        if (f === 'iis') {
          N.push(['info', 'Needs the IIS URL Rewrite module; merge the <rule> elements into your web.config.']);
          if (rules.some(function (r) { return r.status === 308; })) N.push(['warn', 'IIS URL Rewrite has no 308, so 308 rows are written as Permanent (301).']);
        }
        if (f === 'caddy') N.push(['info', 'Paste the matchers and redir lines into your site block.']);
        issueList(issues, L);
        issueList(notes, N);
      }
      function r302(rules) { return rules.filter(function (r) { return r.status === 302 || r.status === 307; }).length; }

      var bulk = area('bulk', '', 5, 'Paste CSV, tab-separated or space-separated lines:\n/old-page,/new-page,301\n/shop/*\t/store/*');
      function parseBulk() {
        var text = bulk.value.trim(), d = text.indexOf('\t') > -1 ? '\t' : text.indexOf(',') > -1 ? ',' : null;
        var list = (d ? window.CSV.parse(text, d) : text.split(/\r?\n/).map(function (l) { return l.trim().split(/\s+/); }))
          .map(function (c) { return c.map(function (x) { return String(x).trim(); }); })
          .filter(function (c) { return c[0] && c[1]; });
        if (list.length && /^(old|from|source|url)/i.test(list[0][0]) && !/^\//.test(list[0][0])) list.shift();
        return list.map(function (c) { return { from: c[0], to: c[1], status: /^30[1278]$/.test(c[2] || '') ? +c[2] : +def.value }; });
      }
      function addBulk(replace) {
        var got = parseBulk();
        if (!got.length) { U.toast('No old/new pairs found', 'err'); return; }
        rows = (replace ? [] : rows.filter(function (r) { return r.from.trim() || r.to.trim(); })).concat(got);
        drawRows(); run();
        U.toast((replace ? 'Loaded ' : 'Added ') + plural(got.length, 'redirect'));
      }
      function save() {
        var f = RD_FORMATS.filter(function (x) { return x.value === fmt.value; })[0];
        if (!out.textContent) { U.toast('Nothing to download yet', 'err'); return; }
        U.saveText(f.file, out.textContent + '\n', f.mime);
      }

      host.addEventListener('input', run);
      Object.keys(opt).forEach(function (k) { opt[k].input.addEventListener('change', run); });
      drawRows(); run();

      root.appendChild(U.panel('Site', el('div', { class: 'sb-grid' }, U.field('Site domain', host, 'Used for Cloudflare, Caddy and absolute URLs'),
        U.field('Status for pasted rows', def)), el('div', { class: 'stack', style: { marginTop: '10px', gap: '6px' } }, opt.wild, opt.keep, opt.slash, opt.nocase)));
      root.appendChild(U.panel('Redirects', rowBox, U.btnrow(U.button('+ Add redirect', function () { rows.push({ from: '', to: '', status: +def.value }); drawRows(); run(); }, 'ghost'))));
      root.appendChild(U.panel('Paste a list', bulk, U.btnrow(U.button('Add rows', function () { addBulk(false); }), U.button('Replace rows', function () { addBulk(true); }, 'ghost'))));
      root.appendChild(U.panel('Chains, loops and problems', issues));
      root.appendChild(U.panel('Rules', fmt, el('div', { style: { marginTop: '10px' } }, out), notes,
        U.btnrow(U.copyBtn('Copy', function () { return out.textContent; }), U.button('Download', save))));
    }
  });

})();
