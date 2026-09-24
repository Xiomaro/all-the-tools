/* Ctrl+K command palette. Works from anywhere, including from inside a tool,
   and never steals a key while you are typing into one. */
(function (global) {
  'use strict';

  var U = global.UI, el = U.el;
  var MAX = 40;

  var root, input, results, empty, hint;
  var items = [];
  var active = 0;
  var lastFocus = null;

  function build() {
    input = el('input', {
      type: 'search', id: 'palette-input', autocomplete: 'off', spellcheck: false,
      placeholder: "Search " + Tools.count() + " tools — try \"compress pdf\", \"hex\", \"qr\"",
      'aria-label': 'Search tools', 'aria-controls': 'palette-results', 'aria-autocomplete': 'list'
    });

    results = el('div', { class: 'palette-results', id: 'palette-results', role: 'listbox' });
    empty = el('p', { class: 'palette-empty', hidden: true });
    hint = el('div', { class: 'palette-hint' },
      el('span', {}, el('kbd', { text: '↑' }), el('kbd', { text: '↓' }), ' move'),
      el('span', {}, el('kbd', { text: '↵' }), ' open'),
      el('span', {}, el('kbd', { text: 'Esc' }), ' close'));

    root = el('div', { class: 'palette', hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Search tools' },
      el('div', { class: 'palette-backdrop', onclick: close }),
      el('div', { class: 'palette-box' },
        el('div', { class: 'palette-search' }, Icons.svg('search', { class: 'palette-icon' }), input),
        results, empty, hint));

    document.body.appendChild(root);

    input.addEventListener('input', function () { fill(input.value); });
    input.addEventListener('keydown', onKey);
  }

  function row(tool, i) {
    var category = Tools.category(tool.category);
    var node = el('a', {
      class: 'palette-row', href: '#/t/' + tool.id, role: 'option', id: 'palette-row-' + i,
      style: category ? { '--cat-h': category.hue, '--cat-l': category.l + '%', '--cat-ld': category.ld + '%' } : null,
      onclick: function () { close(); }
    },
      el('span', { class: 'palette-row-icon' }, Icons.forTool(tool)),
      el('span', { class: 'palette-row-text' },
        el('strong', { text: tool.name }),
        el('span', { text: tool.description || '' })),
      Prefs.isPinned(tool.id) ? el('span', { class: 'palette-row-pin', title: 'Pinned' }, Icons.svg('star')) : null,
      el('span', { class: 'palette-row-cat', text: category ? category.short : '' }));

    node.addEventListener('mousemove', function () { highlight(i); });
    return node;
  }

  /* With an empty box the palette is a shortcut list rather than a dead end:
     pinned tools first, then whatever was opened most recently. */
  function suggestions() {
    var seen = Object.create(null);
    var out = [];
    Prefs.pins().concat(Prefs.recent()).forEach(function (id) {
      if (seen[id]) return;
      seen[id] = true;
      var tool = Tools.get(id);
      if (tool) out.push(tool);
    });
    return out.slice(0, 8);
  }

  function fill(query) {
    var q = String(query || '').trim();
    items = q ? Tools.search(q, MAX) : suggestions();

    results.replaceChildren.apply(results, items.map(row));
    active = 0;
    highlight(0);

    var nothing = !items.length;
    empty.hidden = !nothing;
    empty.textContent = q
      ? 'Nothing matches “' + q + '”. Try a shorter word.'
      : 'Start typing, or pin a tool to see it here.';
    if (!q && !items.length) empty.hidden = false;
    hint.hidden = nothing;
  }

  function highlight(i) {
    if (!items.length) return;
    active = Math.max(0, Math.min(i, items.length - 1));
    var rows = results.children;
    for (var n = 0; n < rows.length; n++) rows[n].classList.toggle('active', n === active);
    input.setAttribute('aria-activedescendant', 'palette-row-' + active);
    var row = rows[active];
    if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
  }

  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); highlight(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(active - 1); }
    else if (e.key === 'Home' && items.length) { e.preventDefault(); highlight(0); }
    else if (e.key === 'End' && items.length) { e.preventDefault(); highlight(items.length - 1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      var tool = items[active];
      if (tool) { location.hash = '#/t/' + tool.id; close(); }
    } else if (e.key === 'Escape') { e.preventDefault(); close(); }
  }

  function open(seed) {
    if (!root) build();
    lastFocus = document.activeElement;
    root.hidden = false;
    document.body.classList.add('palette-open');
    input.value = seed || '';
    fill(input.value);
    input.focus();
    input.select();
  }

  function close() {
    if (!root || root.hidden) return;
    root.hidden = true;
    document.body.classList.remove('palette-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  function isTyping() {
    var node = document.activeElement;
    if (!node) return false;
    if (node.isContentEditable) return true;
    return ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(node.tagName) > -1;
  }

  document.addEventListener('keydown', function (e) {
    var open_ = root && !root.hidden;

    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      open_ ? close() : open('');
      return;
    }
    if (open_) {
      /* Keep focus inside the dialog: it only ever holds the one input. */
      if (e.key === 'Tab') { e.preventDefault(); input.focus(); }
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      return;
    }
    if (e.key === '/' && !isTyping()) { e.preventDefault(); open(''); }
  });

  global.Palette = { open: open, close: close, refresh: function () { if (root && !root.hidden) fill(input.value); } };
})(window);
