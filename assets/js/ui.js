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
    }
    return zone;
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

  function saveBlob(filename, blob) {
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

  global.UI = {
    el: el, field: field, input: input, textarea: textarea, select: select, checkbox: checkbox,
    button: button, chips: chips, panel: panel, row: row, stack: stack, split: split, btnrow: btnrow,
    out: out, note: note, stats: stats, table: table,
    dropzone: dropzone, readAs: readAs, loadImage: loadImage,
    saveBlob: saveBlob, saveText: saveText, downloadBtn: downloadBtn,
    copy: copy, copyBtn: copyBtn, toast: toast, pair: pair,
    debounce: debounce, live: live, bytes: bytes, escapeHtml: escapeHtml,
    script: script, module: module, progress: progress, onTeardown: onTeardown
  };
})(window);
