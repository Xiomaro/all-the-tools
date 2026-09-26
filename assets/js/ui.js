/* Tiny DOM helper layer. Every tool builds its interface through these so the
   whole app stays consistent without a framework. */
(function (global) {
  'use strict';

  function el(tag, attrs) {
    var node = document.createElement(tag);
    var kids = Array.prototype.slice.call(arguments, 2);

    if (attrs && (typeof attrs === 'string' || typeof attrs === 'number' ||
                  attrs instanceof Node || Array.isArray(attrs))) {
      kids.unshift(attrs);
      attrs = null;
    }

    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (value === null || value === undefined || value === false) return;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'html') node.innerHTML = value;
      else if (key === 'style' && typeof value === 'object') {
        /* setProperty so that custom properties (--cat-h and friends) work;
           a plain assignment silently drops them. */
        Object.keys(value).forEach(function (prop) {
          if (prop.slice(0, 2) === '--') node.style.setProperty(prop, value[prop]);
          else node.style[prop] = value[prop];
        });
      }
      else if (key === 'dataset') Object.assign(node.dataset, value);
      else if (key.slice(0, 2) === 'on') node.addEventListener(key.slice(2).toLowerCase(), value);
      else if (key in node && key !== 'list' && key !== 'type' && key !== 'size') node[key] = value;
      else node.setAttribute(key, value === true ? '' : value);
    });

    add(node, kids);
    return node;
  }

  function add(parent, kids) {
    kids.forEach(function (kid) {
      if (kid === null || kid === undefined || kid === false) return;
      if (Array.isArray(kid)) return add(parent, kid);
      parent.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    });
  }

  /* --- form controls ---------------------------------------------------- */

  function field(label, control, hint) {
    return el('div', { class: 'field' },
      label ? el('label', { text: label, htmlFor: control.id || null }) : null,
      control,
      hint ? el('span', { class: 'hint', text: hint }) : null);
  }

  function input(opts) {
    opts = opts || {};
    var node = el('input', Object.assign({ type: opts.type || 'text' }, strip(opts, ['label', 'hint', 'type'])));
    if (opts.type) node.type = opts.type;
    return opts.label ? field(opts.label, node, opts.hint) : node;
  }

  function textarea(opts) {
    opts = opts || {};
    var node = el('textarea', strip(opts, ['label', 'hint']));
    return opts.label ? field(opts.label, node, opts.hint) : node;
  }

  function select(opts) {
    opts = opts || {};
    var node = el('select', strip(opts, ['label', 'hint', 'options']));
    (opts.options || []).forEach(function (o) {
      var value = typeof o === 'string' ? o : o.value;
      var text = typeof o === 'string' ? o : (o.label !== undefined ? o.label : o.value);
      node.appendChild(el('option', { value: value, text: text }));
    });
    if (opts.value !== undefined) node.value = opts.value;
    return opts.label ? field(opts.label, node, opts.hint) : node;
  }

  function checkbox(label, opts) {
    opts = opts || {};
    var box = el('input', Object.assign({ type: 'checkbox' }, opts));
    var wrap = el('label', { class: 'check' }, box, el('span', { text: label }));
    wrap.input = box;
    return wrap;
  }

  function button(label, onClick, variant) {
    return el('button', { class: 'btn' + (variant ? ' ' + variant : ''), type: 'button', onclick: onClick }, label);
  }

  /* A row of mutually exclusive chips. Returns the wrapper; read .value. */
  function chips(options, onChange, initial) {
    var wrap = el('div', { class: 'chips' });
    wrap.value = initial !== undefined ? initial
      : (typeof options[0] === 'string' ? options[0] : options[0].value);

    options.forEach(function (o) {
      var value = typeof o === 'string' ? o : o.value;
      var text = typeof o === 'string' ? o : o.label;
      var chip = el('button', {
        class: 'chip' + (value === wrap.value ? ' on' : ''),
        type: 'button',
        onclick: function () {
          wrap.value = value;
          Array.prototype.forEach.call(wrap.children, function (c) { c.classList.remove('on'); });
          chip.classList.add('on');
          if (onChange) onChange(value);
        }
      }, text);
      wrap.appendChild(chip);
    });
    return wrap;
  }

  function strip(obj, keys) {
    var out = {};
    Object.keys(obj).forEach(function (k) { if (keys.indexOf(k) === -1) out[k] = obj[k]; });
    return out;
  }

  /* --- containers ------------------------------------------------------- */

  function panel(title) {
    var kids = Array.prototype.slice.call(arguments, 1);
    return el('section', { class: 'panel' }, title ? el('h3', { text: title }) : null, kids);
  }

  function row() { return el('div', { class: 'row' }, Array.prototype.slice.call(arguments)); }
  function stack() { return el('div', { class: 'stack' }, Array.prototype.slice.call(arguments)); }
  function split() { return el('div', { class: 'split' }, Array.prototype.slice.call(arguments)); }
  function btnrow() { return el('div', { class: 'btnrow' }, Array.prototype.slice.call(arguments)); }
  function out(text) { return el('pre', { class: 'out', text: text || '' }); }
  function note(text, kind) { return el('p', { class: 'note' + (kind ? ' ' + kind : ''), text: text || '' }); }

  function stats(items) {
    return el('div', { class: 'stats' }, items.map(function (i) {
      return el('div', { class: 'stat' }, el('b', { text: i.value }), el('span', { text: i.label }));
    }));
  }

  function table(headers, rows) {
    return el('table', { class: 'data' },
      el('thead', el('tr', headers.map(function (h) { return el('th', { text: h }); }))),
      el('tbody', rows.map(function (r) {
        return el('tr', r.map(function (c) {
          return c instanceof Node ? el('td', c) : el('td', { class: 'mono', text: String(c) });
        }));
      })));
  }

  /* --- files ------------------------------------------------------------ */

  function dropzone(opts) {
    opts = opts || {};
    var picker = el('input', {
      type: 'file',
      accept: opts.accept || '',
      multiple: !!opts.multiple,
      style: { display: 'none' },
      onchange: function () { if (picker.files.length) deliver(picker.files); picker.value = ''; }
    });

    var zone = el('div', {
        class: 'dropzone', tabIndex: 0, role: 'button',
        onclick: function () { picker.click(); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); picker.click(); } },
        ondragover: function (e) { e.preventDefault(); zone.classList.add('over'); },
        ondragleave: function () { zone.classList.remove('over'); },
        ondrop: function (e) {
          e.preventDefault();
          zone.classList.remove('over');
          if (e.dataTransfer.files.length) deliver(e.dataTransfer.files);
        }
      },
      el('strong', { text: opts.label || 'Drop a file here' }),
      el('span', { text: opts.hint || 'or click to choose' }),
      picker);

    function deliver(fileList) {
      var files = Array.prototype.slice.call(fileList);
      if (!opts.multiple) files = files.slice(0, 1);
      if (opts.onFiles) opts.onFiles(files);
      zone.dispatchEvent(new CustomEvent('files-chosen', { bubbles: true, detail: { files: files } }));
    }

    /* Files dropped on the home page go to the first drop zone that takes
       them, once the tool has finished building itself. */
    if (pending && pending.files && !pending.taken) {
      var wanted = pending.files.filter(function (f) { return accepts(opts.accept, f); });
      if (wanted.length) {
        pending.taken = true;
        setTimeout(function () { deliver(wanted); }, 0);
      }
    }
    return zone;
  }

  /* --- hand-off -----------------------------------------------------------
     A file dropped or text pasted on the home page waits here for the tool
     the visitor picks. The shell sets it before opening the tool and clears
     it on the next page; drop zones take the files, the shell fills in the
     text. */
  var pending = null;

  function handoff(item) {
    pending = item ? Object.assign({ taken: false }, item) : null;
  }

  function pendingHandoff() { return pending; }

  /* For tools with a plain file input rather than a drop zone: give the
     hand-off's files to the first input in `host` that accepts them. */
  function giveFiles(host, hand) {
    var inputs = host.querySelectorAll('input[type="file"]');
    for (var i = 0; i < inputs.length && !hand.taken; i++) {
      var input = inputs[i];
      var wanted = hand.files.filter(function (f) { return accepts(input.accept, f); });
      if (!input.multiple) wanted = wanted.slice(0, 1);
      if (!wanted.length) continue;
      try {
        var dt = new DataTransfer();
        wanted.forEach(function (f) { dt.items.add(f); });
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        hand.taken = true;
      } catch (e) { /* browsers without a DataTransfer constructor */ }
    }
  }

  /* Some browsers leave File.type empty for newer formats (HEIC, AVIF, MKV),
     so fall back to the extension. */
  var EXT_TYPES = { heic: 'image/heic', heif: 'image/heif', avif: 'image/avif', webp: 'image/webp',
    mkv: 'video/x-matroska', mov: 'video/quicktime', m4a: 'audio/mp4', flac: 'audio/flac', opus: 'audio/ogg' };

  function accepts(accept, file) {
    if (!accept) return true;
    var name = (file.name || '').toLowerCase();
    var type = (file.type || EXT_TYPES[name.split('.').pop()] || '').toLowerCase();
    return accept.split(',').some(function (a) {
      a = a.trim().toLowerCase();
      if (!a) return false;
      if (a === '*' || a === '*/*') return true;
      if (a[0] === '.') return name.slice(-a.length) === a;
      if (a.slice(-2) === '/*') return type.indexOf(a.slice(0, -1)) === 0;
      return type === a;
    });
  }

  function readAs(file, how) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error || new Error('Could not read ' + file.name)); };
      if (how === 'text') reader.readAsText(file);
      else if (how === 'dataURL') reader.readAsDataURL(file);
      else reader.readAsArrayBuffer(file);
    });
  }

  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Not a readable image: ' + file.name)); };
      img.src = url;
    });
  }

  /* Anything that wants to know when a tool saves a file (a workspace
     carrying the result on to its next tool). The download still happens. */
  var saveWatchers = [];
  function onSave(fn) {
    saveWatchers.push(fn);
    return function () { saveWatchers = saveWatchers.filter(function (w) { return w !== fn; }); };
  }

  function saveBlob(filename, blob) {
    saveWatchers.slice().forEach(function (fn) { try { fn(filename, blob); } catch (e) { /* never block a download */ } });
    var url = URL.createObjectURL(blob);
    var link = el('a', { href: url, download: filename });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function saveText(filename, text, mime) {
    saveBlob(filename, new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' }));
  }

  function downloadBtn(label, filename, producer, mime) {
    return button(label, function () {
      var data = typeof producer === 'function' ? producer() : producer;
      if (data === null || data === undefined || data === '') return toast('Nothing to download yet', 'err');
      if (data instanceof Blob) saveBlob(filename, data);
      else saveText(filename, String(data), mime);
    });
  }

  /* --- clipboard -------------------------------------------------------- */

  function copy(text) {
    text = String(text === null || text === undefined ? '' : text);
    if (!text) { toast('Nothing to copy', 'err'); return Promise.resolve(false); }

    var fallback = function () {
      var scratch = el('textarea', { value: text, style: { position: 'fixed', opacity: '0' } });
      document.body.appendChild(scratch);
      scratch.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      scratch.remove();
      toast(ok ? 'Copied' : 'Copy blocked by the browser', ok ? '' : 'err');
      return ok;
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text)
        .then(function () { toast('Copied'); return true; })
        .catch(function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  }

  function copyBtn(label, producer) {
    return button(label || 'Copy', function () { copy(typeof producer === 'function' ? producer() : producer); });
  }

  /* --- misc ------------------------------------------------------------- */

  var toaster = null;
  function toast(message, kind) {
    toaster = toaster || document.getElementById('toaster');
    if (!toaster) return;
    var node = el('div', { class: 'toast' + (kind ? ' ' + kind : ''), text: message });
    toaster.appendChild(node);
    setTimeout(function () { node.remove(); }, 2600);
  }

  function debounce(fn, wait) {
    var timer;
    return function () {
      var args = arguments, self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, wait || 160);
    };
  }

  /* Re-run `fn` whenever any of `nodes` changes, and once immediately. */
  function live(nodes, fn) {
    var run = debounce(function () {
      try { fn(); } catch (err) { toast(err.message || String(err), 'err'); }
    }, 120);
    nodes.forEach(function (n) {
      if (!n) return;
      var target = n.input || (n.querySelector ? n.querySelector('input, select, textarea') : null) || n;
      target.addEventListener('input', run);
      target.addEventListener('change', run);
    });
    try { fn(); } catch (e) { /* first paint may legitimately have no input yet */ }
    return run;
  }

  function bytes(n) {
    if (!isFinite(n)) return '—';
    var units = ['B', 'kB', 'MB', 'GB', 'TB'], i = 0;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return (i === 0 ? n : n.toFixed(n < 10 ? 2 : 1)) + ' ' + units[i];
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* The shape most text tools take: an input pane, optional controls, and a
     result pane that recomputes as you type. Returns the wrapper, with the
     input element and a manual `run()` attached. */
  function pair(opts) {
    var input = textarea({ placeholder: opts.placeholder || 'Paste or type your text here…', spellcheck: false });
    var output = out('');
    var status = note('');
    var controls = opts.controls || [];

    function go() {
      try {
        var result = opts.run(input.value, output);
        status.className = 'note';
        if (result instanceof Node) { output.replaceChildren(result); status.textContent = ''; }
        else if (result && typeof result === 'object') {
          output.textContent = result.text === undefined ? '' : result.text;
          status.textContent = result.status || '';
        } else {
          output.textContent = result === null || result === undefined ? '' : String(result);
          status.textContent = '';
        }
      } catch (err) {
        output.textContent = '';
        status.className = 'note err';
        status.textContent = err.message || String(err);
      }
    }

    live([input].concat(controls), go);

    var buttons = [copyBtn('Copy result', function () { return output.textContent; })];
    if (opts.download) buttons.push(downloadBtn('Download', opts.download, function () { return output.textContent; }, opts.mime));
    buttons.push(button('Clear', function () { input.value = ''; go(); }, 'ghost'));

    var inputPanel = panel(opts.inputLabel || 'Input', input);
    if (controls.length) inputPanel.appendChild(el('div', { class: 'row', style: { marginTop: '12px' } }, controls));

    var node = split(
      inputPanel,
      panel(opts.outputLabel || 'Result', output, status, btnrow.apply(null, buttons))
    );

    node.input = input;
    node.output = output;
    node.run = go;
    return node;
  }

  /* --- lazy loading ------------------------------------------------------ */

  /* Heavy libraries live in assets/vendor and load only when a tool needs
     them. `script` loads a classic script once; `module` dynamic-imports an ES
     module once (needs http://, see serve.py). Both resolve relative to the
     page, e.g. UI.script('assets/vendor/jszip/jszip.min.js'). */
  var loaded = Object.create(null);

  function script(src) {
    if (!loaded[src]) {
      loaded[src] = new Promise(function (resolve, reject) {
        var tag = el('script', { src: src });
        tag.onload = function () { resolve(); };
        tag.onerror = function () { delete loaded[src]; reject(new Error('Could not load ' + src)); };
        document.head.appendChild(tag);
      });
    }
    return loaded[src];
  }

  function module(src) {
    var key = 'module:' + src;
    if (!loaded[key]) {
      if (location.protocol === 'file:') {
        return Promise.reject(new Error('This tool needs the local server. Run "python serve.py" and open http://localhost:8000'));
      }
      loaded[key] = import(new URL(src, document.baseURI).href).catch(function (err) { delete loaded[key]; throw err; });
    }
    return loaded[key];
  }

  /* A progress/status line for long jobs. set(text, fraction?) */
  function progress() {
    var bar = el('progress', { max: 1, value: 0, style: { width: '100%', display: 'none' } });
    var label = note('');
    var wrap = el('div', { class: 'progress' }, bar, label);
    wrap.set = function (text, fraction) {
      label.className = 'note';
      label.textContent = text || '';
      if (fraction === undefined || fraction === null) bar.style.display = 'none';
      else { bar.style.display = ''; bar.value = Math.max(0, Math.min(1, fraction)); }
    };
    wrap.fail = function (err) {
      bar.style.display = 'none';
      label.className = 'note err';
      label.textContent = (err && err.message) || String(err);
    };
    wrap.done = function (text) { bar.style.display = 'none'; label.className = 'note ok'; label.textContent = text || 'Done'; };
    return wrap;
  }

  /* Run fn when the tool page is left (timers, streams, audio contexts). */
  function onTeardown(root, fn) {
    root.addEventListener('tool-teardown', fn, { once: true });
  }

  /* --- merged tools -------------------------------------------------------
     A tool made with Tools.combine: a row of tabs (or a menu, when there
     are many) over the chosen part, which renders exactly as it did on its
     own. Each part gets a fresh pane, so its styles, timers and teardown
     handlers can't leak into the next. The tab is kept in the address as
     ?tab=, so a link or a bookmark reopens the same tab. */
  function tabbed(root, def, parts, params) {
    var pane = null, current = null;
    var wanted = params && params.tab;
    var start = parts.filter(function (p) { return p.tab === wanted; })[0] || parts[0];
    var about = el('p', { class: 'note tool-tab-about' });
    var options = parts.map(function (p) { return { value: p.tab, label: p.label }; });

    var picker;
    if (def.picker === 'select') {
      picker = select({ label: def.pickerLabel || 'Show', options: options, value: start.tab });
      picker.querySelector('select').addEventListener('change', function (e) { show(e.target.value); });
    } else {
      picker = chips(options, show, start.tab);
    }
    root.appendChild(el('div', { class: 'tool-tabs', dataset: { role: 'tabs' } }, picker, about));

    function show(tab) {
      var part = parts.filter(function (p) { return p.tab === tab; })[0] || parts[0];
      if (pane) pane.dispatchEvent(new CustomEvent('tool-teardown'));
      var fresh = el('div', { class: 'stack tool-pane', dataset: { tab: part.tab } });
      if (pane) pane.replaceWith(fresh); else root.appendChild(fresh);
      pane = fresh;
      current = part;
      about.textContent = part.tool.description || '';
      try {
        part.tool.render(pane, params);
      } catch (err) {
        pane.appendChild(el('div', { class: 'banner', text: 'This tool failed to start: ' + (err.message || err) }));
        if (global.console) console.error(err);
      }
      var hash = '#/t/' + def.id + (part === parts[0] ? '' : '?tab=' + encodeURIComponent(part.tab));
      if (location.hash !== hash && history.replaceState) history.replaceState(null, '', hash);
    }

    root.addEventListener('tool-teardown', function () {
      if (pane) pane.dispatchEvent(new CustomEvent('tool-teardown'));
    }, { once: true });
    show(start.tab);
    root.currentPart = function () { return current; };
  }

  /* --- workspaces ---------------------------------------------------------
     A merged tool built around one file, such as the PDF Editor or the
     Image Editor. Its parts are ordinary tools, listed down the side in
     groups. What makes it a workspace:

     - the file you open (in any of its tools) stays open as you move
       between them: each tool opens with it already loaded;
     - each new file of the same kind a tool makes (a rotated PDF, a
       cropped picture) becomes the working copy, so the next tool carries
       on from there, and Undo steps back;
     - the working copy survives navigation (recipe steps, back and
       forward) until you close it or reload the page.

     The tools themselves are untouched and still download their results
     as they always did; the workspace watches rather than intercepts, so
     nothing a tool does behaves differently here. The bar's actions are
     links rather than buttons so they can't be mistaken for a tool's own. */
  var sessions = Object.create(null);

  function workspace(root, def, parts, params) {
    var spec = def.workspace;
    var session = sessions[def.id] || (sessions[def.id] = { doc: null, history: [] });
    var pane = null, current = null, links = {};
    var isDoc = function (file) { return !!file && accepts(spec.accept, file); };

    /* A single file dropped on the home page for this tool starts afresh.
       Several files (to merge, say) go straight to the tool instead. */
    var hand = pending;
    if (hand && hand.files && !hand.taken) {
      var docs = hand.files.filter(isDoc);
      if (docs.length === 1 && hand.files.length === 1) {
        session.doc = docs[0];
        session.history = [];
        hand.taken = true;
      }
    }

    var bar = el('div', { class: 'ws-bar', dataset: { role: 'workspace-bar' } });
    var about = el('p', { class: 'note tool-tab-about' });
    var main = el('div', { class: 'ws-main' }, about);
    var nav = el('nav', { class: 'ws-nav', 'aria-label': def.name + ' tools' });

    var groups = [];
    parts.forEach(function (p) {
      var g = groups.filter(function (x) { return x.name === p.group; })[0];
      if (!g) groups.push(g = { name: p.group, parts: [] });
      g.parts.push(p);
    });
    groups.forEach(function (g) {
      nav.appendChild(el('div', { class: 'ws-group' },
        g.name ? el('span', { class: 'ws-group-name', text: g.name }) : null,
        g.parts.map(function (p) {
          var link = el('a', {
            class: 'ws-item', href: '#/t/' + def.id + '?tab=' + encodeURIComponent(p.tab),
            onclick: function (e) { e.preventDefault(); show(p.tab); }
          }, el('span', { class: 'ws-item-icon' }, global.Icons ? Icons.forTool(p.tool) : null), el('span', { text: p.label }));
          links[p.tab] = link;
          return link;
        })));
    });

    root.appendChild(bar);
    root.appendChild(el('div', { class: 'ws-body' }, nav, main));

    function describe(file) {
      var out = el('span', { class: 'ws-doc-meta', text: bytes(file.size) });
      if (spec.describe) {
        Promise.resolve().then(function () { return spec.describe(file); }).then(function (extra) {
          if (extra) out.textContent = bytes(file.size) + ' · ' + extra;
        }, function () { /* the tool will say what's wrong with it */ });
      }
      return out;
    }

    function action(label, fn, cls) {
      return el('a', { class: 'btn ' + (cls || 'ghost'), href: '#', role: 'button', onclick: function (e) { e.preventDefault(); fn(); } }, label);
    }

    function paintBar(changed) {
      var doc = session.doc;
      if (!doc) {
        bar.className = 'ws-bar empty';
        bar.replaceChildren(el('span', { class: 'ws-hint', text: spec.hint }));
        return;
      }
      var url = URL.createObjectURL(doc);
      var thumb = spec.thumbnail === 'image'
        ? el('img', { class: 'ws-thumb', src: url, alt: '' })
        : el('span', { class: 'ws-thumb icon' }, global.Icons ? Icons.forCategory(def.category) : null);
      bar.className = 'ws-bar' + (changed ? ' changed' : '');
      bar.replaceChildren(
        thumb,
        el('div', { class: 'ws-doc' },
          el('strong', { class: 'ws-doc-name', text: doc.name }),
          el('span', { class: 'ws-doc-line' },
            describe(doc),
            session.history.length ? ' · ' + session.history.length + ' change' + (session.history.length === 1 ? '' : 's') : '')),
        el('div', { class: 'ws-actions' },
          el('a', { class: 'btn primary', href: url, download: doc.name }, 'Download'),
          session.history.length ? action('Undo', undo) : null,
          action('Close', close)));
    }

    /* The working copy changed: remember the old one for Undo. */
    function adopt(file, fromResult) {
      if (!isDoc(file) || file === session.doc) return;
      if (session.doc && fromResult) session.history.push(session.doc);
      if (!fromResult) session.history = [];
      session.doc = file;
      paintBar(fromResult);
    }

    function undo() {
      if (!session.history.length) return;
      session.doc = session.history.pop();
      show(current.tab);
      toast('Undone: back to ' + session.doc.name);
    }

    function close() {
      session.doc = null;
      session.history = [];
      show(current.tab);
    }

    function show(tab) {
      var part = parts.filter(function (p) { return p.tab === tab; })[0] || parts[0];
      if (pane) pane.dispatchEvent(new CustomEvent('tool-teardown'));
      var fresh = el('div', { class: 'stack tool-pane', dataset: { tab: part.tab } });
      if (pane) pane.replaceWith(fresh); else main.appendChild(fresh);
      pane = fresh;
      current = part;
      about.textContent = part.tool.description || '';
      Object.keys(links).forEach(function (t) {
        links[t].classList.toggle('on', t === part.tab);
        if (t === part.tab) links[t].setAttribute('aria-current', 'page'); else links[t].removeAttribute('aria-current');
      });

      /* A file opened in the tool's main drop zone or file picker becomes
         the working copy. Only the first one counts: a later picker is for
         something else, such as a watermark's logo or a signature. */
      pane.addEventListener('files-chosen', function (e) {
        if (e.target !== pane.querySelector('.dropzone')) return;
        var docs = e.detail.files.filter(isDoc);
        if (docs.length === 1) adopt(docs[0], false);
      });
      pane.addEventListener('change', function (e) {
        var input = e.target;
        if (input.type !== 'file' || input.closest('.dropzone') || !input.files || input.files.length !== 1) return;
        if (pane.querySelector('.dropzone') || input !== pane.querySelector('input[type="file"]')) return;
        adopt(input.files[0], false);
      });

      /* Hand the working copy to the tool as it builds. */
      var mine = null;
      if (session.doc && !pending) handoff(mine = { files: [session.doc], tool: def.id });
      try {
        part.tool.render(pane, params);
      } catch (err) {
        pane.appendChild(el('div', { class: 'banner', text: 'This tool failed to start: ' + (err.message || err) }));
        if (global.console) console.error(err);
      }
      if (mine) {
        if (!pending || !pending.taken) giveFiles(pane, mine);
        if (pending === mine) handoff(null);
      }

      paintBar(false);
      var hash = '#/t/' + def.id + (part === parts[0] ? '' : '?tab=' + encodeURIComponent(part.tab));
      if (location.hash !== hash && history.replaceState) history.replaceState(null, '', hash);
    }

    /* A tool saved a new file of this kind: carry on from it. */
    var stop = onSave(function (filename, blob) {
      if (!pane || !pane.isConnected) return;
      var file = new File([blob], filename, { type: blob.type });
      if (isDoc(file)) adopt(file, true);
    });

    root.addEventListener('tool-teardown', function () {
      stop();
      if (pane) pane.dispatchEvent(new CustomEvent('tool-teardown'));
    }, { once: true });

    var wanted = params && params.tab;
    show((parts.filter(function (p) { return p.tab === wanted; })[0] || parts[0]).tab);
  }

  global.UI = {
    el: el, field: field, input: input, textarea: textarea, select: select, checkbox: checkbox,
    button: button, chips: chips, panel: panel, row: row, stack: stack, split: split, btnrow: btnrow,
    out: out, note: note, stats: stats, table: table,
    dropzone: dropzone, readAs: readAs, loadImage: loadImage,
    handoff: handoff, pendingHandoff: pendingHandoff, accepts: accepts, giveFiles: giveFiles, onSave: onSave,
    saveBlob: saveBlob, saveText: saveText, downloadBtn: downloadBtn,
    copy: copy, copyBtn: copyBtn, toast: toast, pair: pair,
    debounce: debounce, live: live, bytes: bytes, escapeHtml: escapeHtml,
    script: script, module: module, progress: progress, onTeardown: onTeardown, tabbed: tabbed, workspace: workspace
  };
})(window);
