/* Small builders shared by the settings pages: rows bound to an app.json
   or appearance.json key, headings, and the note that says what the
   browser can't do. */

import { Setting, h, icon } from '../core/ui.js';

/* A description made of strings, nodes and line breaks ("\n"). */
export function desc(...parts) {
  const frag = document.createDocumentFragment();
  for (const p of parts) {
    if (p === null || p === undefined || p === false) continue;
    if (p instanceof Node) { frag.append(p); continue; }
    String(p).split('\n').forEach((line, i) => { if (i) frag.append(h('br')); if (line) frag.append(line); });
  }
  return frag;
}

/* "In the browser: ..." under a setting's description. */
export function browserNote(text, kind = 'info') {
  return h('div.settings-browser-note' + (kind === 'warning' ? '.mod-warning' : ''), icon(kind === 'warning' ? 'alert-triangle' : 'info'), h('span', { text }));
}

export function heading(el, name, descText) {
  const s = new Setting(el).setName(name).setHeading();
  if (descText) s.setDesc(descText);
  return s;
}

/* A row for something Obsidian's desktop app has and the browser can't
   do: shown, greyed out, with the reason. */
export function unavailable(el, name, description, reason) {
  const s = new Setting(el).setName(name).setClass('mod-unavailable');
  s.descEl.append(desc(description || ''), browserNote(reason));
  return s;
}

/* Toggles and dropdowns for app.json keys. `invert` shows the opposite of
   the stored value (Use [[Wikilinks]] is !useMarkdownLinks). */
export function appToggle(app, el, key, name, description, opts = {}) {
  const read = () => { const v = app.config.get(key); return opts.invert ? !v : !!v; };
  return new Setting(el).setName(name).setDesc(description instanceof Node ? description : desc(description || '')).setClass('mod-toggle')
    .addToggle(t => t.setValue(read()).onChange(v => {
      app.config.set(key, opts.invert ? !v : v);
      if (opts.onChange) opts.onChange(v);
    }));
}

export function appDropdown(app, el, key, name, description, options, opts = {}) {
  const toStr = opts.toStr || (v => String(v));
  const fromStr = opts.fromStr || (v => v);
  return new Setting(el).setName(name).setDesc(description instanceof Node ? description : desc(description || ''))
    .addDropdown(d => {
      for (const [value, label] of options) d.addOption(toStr(value), label);
      d.setValue(toStr(app.config.get(key)));
      d.onChange(v => { app.config.set(key, fromStr(v)); if (opts.onChange) opts.onChange(fromStr(v)); });
    });
}

export function appearanceToggle(app, el, key, name, description, opts = {}) {
  return new Setting(el).setName(name).setDesc(description instanceof Node ? description : desc(description || '')).setClass('mod-toggle')
    .addToggle(t => t.setValue(opts.read ? opts.read() : app.config.appearance(key) !== false && !!app.config.appearance(key))
      .onChange(v => { if (opts.write) opts.write(v); else app.config.setAppearance(key, v); }));
}

/* Keys Obsidian has kept in both app.json and appearance.json over the
   years (showViewHeader, showInlineTitle). Either file saying false turns
   the feature off, so a change is written to appearance.json and to
   app.json too when app.json has its own copy of the key. */
export function readShared(app, key) {
  return app.config.get(key) !== false && app.config.appearance(key) !== false;
}
export function writeShared(app, key, value) {
  if (Object.prototype.hasOwnProperty.call(app.config.app, key) || key === 'showInlineTitle') app.config.set(key, value);
  if (Object.prototype.hasOwnProperty.call(app.config.appearanceData, key) || key === 'showViewHeader') app.config.setAppearance(key, value);
  app.appearance.apply(key);
}

/* Obsidian's search box: the input in a .search-input-container with a
   clear button that shows while there's text. */
export function searchBox(input, onChange) {
  const box = h('div.search-input-container', input);
  const sync = () => box.classList.toggle('has-value', !!input.value);
  box.append(h('div.search-input-clear-button', { 'aria-label': 'Clear search', title: 'Clear search', onclick: () => {
    input.value = ''; sync(); onChange(''); input.focus();
  } }));
  input.addEventListener('input', () => { sync(); onChange(input.value); });
  sync();
  box.sync = sync;
  return box;
}

/* Pick files with a hidden <input type=file>. Resolves to an array (empty
   if cancelled). */
export function pickFiles({ accept, multiple, folder } = {}) {
  return new Promise(resolve => {
    const input = h('input', { type: 'file', style: { display: 'none' } });
    if (accept) input.accept = accept;
    if (multiple) input.multiple = true;
    if (folder) { input.webkitdirectory = true; input.multiple = true; }
    input.addEventListener('change', () => { const files = Array.from(input.files || []); input.remove(); resolve(files); });
    input.addEventListener('cancel', () => { input.remove(); resolve([]); });
    document.body.appendChild(input);
    input.click();
  });
}
