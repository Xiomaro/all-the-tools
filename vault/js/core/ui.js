/* DOM helpers and the app's shared pieces of interface: icons, menus,
   modals, suggestion pickers, notices and settings rows. Class names follow
   Obsidian's so community themes and CSS snippets style them. */

let ICONS = {};
export async function loadIcons() {
  const mod = await import('../../../assets/vendor/lucide/lucide.js');
  ICONS = mod.default;
}
export function hasIcon(name) { return !!ICONS[String(name).replace(/^lucide-/, '')]; }
export function iconNames() { return Object.keys(ICONS); }

const SVG = 'http://www.w3.org/2000/svg';

/* h('div.nav-file.is-active', { attrs }, ...children)
   attrs: text, html, cls, style (object), dataset, on<event>, attr: value */
export function h(tag, attrs, ...kids) {
  const m = /^([a-z0-9-]*)((?:[.#][^.#]+)*)$/i.exec(tag);
  const node = document.createElement(m && m[1] ? m[1] : 'div');
  if (m && m[2]) m[2].replace(/([.#])([^.#]+)/g, (_, t, v) => { if (t === '.') node.classList.add(v); else node.id = v; });
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  for (const k in attrs || {}) {
    const v = attrs[k];
    if (v === null || v === undefined || v === false) continue;
    if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'cls') String(v).split(/\s+/).filter(Boolean).forEach(c => node.classList.add(c));
    else if (k === 'style' && typeof v === 'object') for (const p in v) { if (p.startsWith('--')) node.style.setProperty(p, v[p]); else node.style[p] = v[p]; }
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected' || k === 'spellcheck') node[k] = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  append(node, kids);
  return node;
}

function append(node, kids) {
  for (const k of kids) {
    if (k === null || k === undefined || k === false) continue;
    if (Array.isArray(k)) append(node, k);
    else node.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

export function icon(name, cls) {
  name = String(name || '').replace(/^lucide-/, '');
  const node = ICONS[name] || ICONS['file-question'] || [];
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('xmlns', SVG);
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('class', 'svg-icon lucide-' + name + (cls ? ' ' + cls : ''));
  for (const [tag, attrs] of node) {
    const child = document.createElementNS(SVG, tag);
    for (const a in attrs) child.setAttribute(a, attrs[a]);
    svg.appendChild(child);
  }
  return svg;
}

export function setIcon(el, name) { el.replaceChildren(icon(name)); return el; }

export function clickableIcon(name, title, onClick, cls) {
  return h('div.clickable-icon' + (cls ? '.' + cls.split(' ').join('.') : ''), { 'aria-label': title, title, role: 'button', tabindex: '0',
    onclick: onClick, onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } } }, icon(name));
}

export const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/* --- notices ---------------------------------------------------------------- */

let noticeBox = null;
export class Notice {
  constructor(message, timeout = 4000) {
    if (!noticeBox) { noticeBox = h('div.notice-container'); document.body.appendChild(noticeBox); }
    this.noticeEl = h('div.notice', { onclick: () => this.hide() });
    this.setMessage(message);
    noticeBox.appendChild(this.noticeEl);
    if (timeout) this.timer = setTimeout(() => this.hide(), timeout);
  }
  setMessage(message) {
    if (message instanceof Node) this.noticeEl.replaceChildren(message);
    else this.noticeEl.textContent = message;
    return this;
  }
  hide() { clearTimeout(this.timer); this.noticeEl.remove(); }
}

/* --- menus ------------------------------------------------------------------ */

let openMenu = null;
export class Menu {
  constructor() { this.items = []; this.dom = h('div.menu', { role: 'menu' }); this.onHideFns = []; }

  addItem(fn) {
    const item = new MenuItem(this);
    fn(item);
    this.items.push(item);
    return this;
  }

  addSeparator() { this.items.push('separator'); return this; }
  onHide(fn) { this.onHideFns.push(fn); }

  _build() {
    this.dom.replaceChildren();
    let sections = {};
    const order = [];
    for (const it of this.items) {
      const key = it === 'separator' ? '__sep' + order.length : (it.section || '');
      if (!sections[key]) { sections[key] = []; order.push(key); }
      sections[key].push(it);
    }
    let first = true;
    for (const key of order) {
      const items = sections[key].filter(i => i !== 'separator');
      if (!items.length) continue;
      if (!first) this.dom.appendChild(h('div.menu-separator'));
      first = false;
      const group = h('div.menu-group');
      for (const it of items) group.appendChild(it.dom);
      this.dom.appendChild(group);
    }
  }

  showAtPosition(p) {
    if (openMenu) openMenu.hide();
    openMenu = this;
    this._build();
    document.body.appendChild(this.dom);
    const r = this.dom.getBoundingClientRect();
    const x = Math.min(p.x, window.innerWidth - r.width - 4);
    const y = p.y + r.height > window.innerHeight - 4 ? Math.max(4, (p.bottom ?? p.y) - r.height) : p.y;
    this.dom.style.left = Math.max(4, x) + 'px';
    this.dom.style.top = y + 'px';
    this.selected = -1;
    this._outside = e => { if (!this.dom.contains(e.target)) this.hide(); };
    this._key = e => {
      const live = this.items.filter(i => i !== 'separator' && !i.disabled);
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.hide(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation();
        this.selected = (this.selected + (e.key === 'ArrowDown' ? 1 : -1) + live.length) % live.length;
        live.forEach((i, n) => i.dom.classList.toggle('selected', n === this.selected));
      } else if (e.key === 'Enter' && this.selected > -1) { e.preventDefault(); e.stopPropagation(); live[this.selected].dom.click(); }
    };
    setTimeout(() => {
      document.addEventListener('mousedown', this._outside, true);
      document.addEventListener('keydown', this._key, true);
    });
    window.addEventListener('blur', this._blur = () => this.hide());
    return this;
  }

  showAtMouseEvent(e) { e.preventDefault(); return this.showAtPosition({ x: e.clientX, y: e.clientY }); }

  hide() {
    if (openMenu === this) openMenu = null;
    this.dom.remove();
    document.removeEventListener('mousedown', this._outside, true);
    document.removeEventListener('keydown', this._key, true);
    window.removeEventListener('blur', this._blur);
    this.onHideFns.forEach(fn => fn());
    this.onHideFns = [];
  }
}

class MenuItem {
  constructor(menu) {
    this.menu = menu;
    this.iconEl = h('div.menu-item-icon');
    this.titleEl = h('div.menu-item-title');
    this.dom = h('div.menu-item.tappable', { role: 'menuitem' }, this.iconEl, this.titleEl);
    this.dom.addEventListener('click', e => {
      if (this.disabled) return;
      this.menu.hide();
      if (this.cb) this.cb(e);
    });
  }
  setTitle(t) { if (t instanceof Node) this.titleEl.replaceChildren(t); else this.titleEl.textContent = t; return this; }
  setIcon(name) { this.iconEl.replaceChildren(name ? icon(name) : ''); return this; }
  setChecked(on) { this.dom.classList.toggle('mod-checked', !!on); if (on) this.dom.appendChild(h('div.menu-item-icon.mod-checked', icon('check'))); return this; }
  setDisabled(d) { this.disabled = d; this.dom.classList.toggle('is-disabled', !!d); return this; }
  setWarning(w) { this.dom.classList.toggle('is-warning', !!w); return this; }
  setSection(s) { this.section = s; return this; }
  onClick(cb) { this.cb = cb; return this; }
}

/* --- modals ------------------------------------------------------------------ */

export class Modal {
  constructor(app) {
    this.app = app;
    this.titleEl = h('div.modal-title');
    this.contentEl = h('div.modal-content');
    this.modalEl = h('div.modal', h('div.modal-close-button', { onclick: () => this.close(), 'aria-label': 'Close' }),
      h('div.modal-header', this.titleEl), this.contentEl);
    this.bgEl = h('div.modal-bg', { onclick: () => this.close() });
    this.containerEl = h('div.modal-container.mod-dim', this.bgEl, this.modalEl);
    this.scope = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.close(); } };
  }
  setTitle(t) { this.titleEl.textContent = t; return this; }
  open() {
    this._focus = document.activeElement;
    document.body.appendChild(this.containerEl);
    this.containerEl.addEventListener('keydown', this.scope);
    this.onOpen();
    const f = this.modalEl.querySelector('input, textarea, select, button.mod-cta');
    if (f && !this.noAutoFocus) setTimeout(() => f.focus());
    else this.modalEl.tabIndex = -1, this.modalEl.focus();
    return this;
  }
  close() {
    if (!this.containerEl.isConnected) return;
    this.containerEl.remove();
    this.onClose();
    if (this._focus && this._focus.isConnected && this._focus.focus) this._focus.focus();
  }
  onOpen() {}
  onClose() {}
}

/* Ask for a line of text. Resolves to the text, or null if cancelled. */
export function promptText(app, title, value = '', opts = {}) {
  return new Promise(resolve => {
    const m = new Modal(app);
    m.setTitle(title);
    let done = false;
    const input = h('input', { type: 'text', value, placeholder: opts.placeholder || '', spellcheck: false });
    const ok = () => { done = true; m.close(); resolve(input.value); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); ok(); } });
    m.contentEl.append(opts.description ? h('p.setting-item-description', { text: opts.description }) : '', input,
      h('div.modal-button-container',
        h('button.mod-cta', { text: opts.cta || 'Save', onclick: ok }),
        h('button', { text: 'Cancel', onclick: () => m.close() })));
    m.onClose = () => { if (!done) resolve(null); };
    m.open();
    setTimeout(() => {
      input.focus();
      const dot = opts.selectBase ? value.lastIndexOf('.') : -1;
      input.setSelectionRange(0, dot > 0 ? dot : value.length);
    });
  });
}

/* Ask yes or no. Resolves to true or false. */
export function confirmDialog(app, title, message, cta = 'OK', warning = false) {
  return new Promise(resolve => {
    const m = new Modal(app);
    m.setTitle(title);
    let answer = false;
    m.contentEl.append(message instanceof Node ? message : h('p', { text: message }),
      h('div.modal-button-container',
        h('button' + (warning ? '.mod-warning' : '.mod-cta'), { text: cta, onclick: () => { answer = true; m.close(); } }),
        h('button', { text: 'Cancel', onclick: () => m.close() })));
    m.onClose = () => resolve(answer);
    m.open();
  });
}

/* --- fuzzy matching ------------------------------------------------------------ */

/* Score `text` against `query` (all query characters in order). Returns
   null for no match, else { score, matches: [[start, end], ...] }. Word
   starts and runs of consecutive characters score higher. */
export function fuzzyMatch(query, text) {
  query = query.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!query) return { score: 0, matches: [] };
  const lower = text.toLowerCase();
  /* Words in any order score best when each is a substring. */
  const words = query.split(' ');
  if (words.length > 1 && words.every(w => lower.includes(w))) {
    const matches = words.map(w => { const i = lower.indexOf(w); return [i, i + w.length]; }).sort((a, b) => a[0] - b[0]);
    return { score: 100 - lower.length * 0.1 + (lower.startsWith(words[0]) ? 20 : 0), matches };
  }
  const q = query.replace(/ /g, '');
  const direct = lower.indexOf(q);
  if (direct > -1) {
    const wordStart = direct === 0 || /[\s/_\-.(]/.test(lower[direct - 1]);
    return { score: 120 - direct * 0.5 - lower.length * 0.1 + (wordStart ? 30 : 0), matches: [[direct, direct + q.length]] };
  }
  let ti = 0, score = 0, run = 0;
  const matches = [];
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    let found = -1;
    while (ti < lower.length) { if (lower[ti] === ch) { found = ti; break; } ti++; }
    if (found < 0) return null;
    const start = found === 0 || /[\s/_\-.(]/.test(lower[found - 1]);
    if (matches.length && matches[matches.length - 1][1] === found) { matches[matches.length - 1][1]++; run++; score += 3 + run; }
    else { matches.push([found, found + 1]); run = 0; score += start ? 4 : 1; }
    ti = found + 1;
  }
  return { score: score - lower.length * 0.05 - matches.length * 2, matches };
}

/* Text with the matched ranges wrapped in <span class="suggestion-highlight">. */
export function highlighted(text, matches, offset = 0) {
  const frag = document.createDocumentFragment();
  let at = 0;
  for (const [s0, e0] of matches || []) {
    const s = s0 - offset, e = e0 - offset;
    if (e <= 0 || s >= text.length) continue;
    const a = Math.max(0, s), b = Math.min(text.length, e);
    if (a > at) frag.append(text.slice(at, a));
    frag.append(h('span.suggestion-highlight', { text: text.slice(a, b) }));
    at = b;
  }
  frag.append(text.slice(at));
  return frag;
}

/* A modal with a text box and a list of suggestions, like Obsidian's
   SuggestModal. Subclass or pass { getSuggestions, renderSuggestion,
   onChoose, placeholder, instructions, emptyText }. */
export class SuggestModal extends Modal {
  constructor(app, opts = {}) {
    super(app);
    Object.assign(this, opts);
    this.limit = opts.limit || 200;
    this.inputEl = h('input.prompt-input', { type: 'text', placeholder: opts.placeholder || '', spellcheck: false, enterkeyhint: 'done' });
    this.resultContainerEl = h('div.prompt-results', { role: 'listbox' });
    this.instructionsEl = h('div.prompt-instructions');
    this.modalEl = h('div.prompt', h('div.prompt-input-container', this.inputEl, h('div.prompt-input-cta')), this.resultContainerEl, this.instructionsEl);
    this.containerEl.replaceChildren(this.bgEl, this.modalEl);
    this.selected = 0;
    this.values = [];
    this.inputEl.addEventListener('input', () => this.update());
    this.inputEl.addEventListener('keydown', e => this.onKey(e));
    this.setInstructions(opts.instructions || [
      { command: '↑↓', purpose: 'to navigate' }, { command: '↵', purpose: 'to use' }, { command: 'esc', purpose: 'to dismiss' }]);
  }

  setInstructions(list) {
    this.instructionsEl.replaceChildren(...list.map(i => h('div.prompt-instruction',
      h('span.prompt-instruction-command', { text: i.command }), h('span', { text: i.purpose }))));
  }

  setPlaceholder(p) { this.inputEl.placeholder = p; }

  onOpen() { this.update(); setTimeout(() => this.inputEl.focus()); }

  async update() {
    const query = this.inputEl.value;
    const token = this._token = {};
    let values = await this.getSuggestions(query);
    if (token !== this._token) return;
    values = (values || []).slice(0, this.limit);
    this.values = values;
    this.selected = 0;
    this.resultContainerEl.replaceChildren();
    if (!values.length) {
      const empty = this.emptyText ? (typeof this.emptyText === 'function' ? this.emptyText(query) : this.emptyText) : 'No results found.';
      if (empty) this.resultContainerEl.appendChild(h('div.suggestion-empty', { text: empty }));
      return;
    }
    values.forEach((v, i) => {
      const el = h('div.suggestion-item.mod-complex', { role: 'option' });
      this.renderSuggestion(v, el, query);
      el.addEventListener('mousemove', () => this.select(i, false));
      el.addEventListener('click', e => this.choose(i, e));
      el.addEventListener('auxclick', e => { if (e.button === 1) this.choose(i, e); });
      this.resultContainerEl.appendChild(el);
    });
    this.select(0, false);
  }

  select(i, scroll = true) {
    const items = this.resultContainerEl.children;
    if (!this.values.length) return;
    this.selected = (i + this.values.length) % this.values.length;
    Array.from(items).forEach((el, n) => el.classList.toggle('is-selected', n === this.selected));
    if (scroll && items[this.selected]) items[this.selected].scrollIntoView({ block: 'nearest' });
  }

  onKey(e) {
    if (e.isComposing) return;
    if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n') || (e.ctrlKey && e.key === 'j')) { e.preventDefault(); this.select(this.selected + 1); }
    else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p') || (e.ctrlKey && e.key === 'k')) { e.preventDefault(); this.select(this.selected - 1); }
    else if (e.key === 'PageDown') { e.preventDefault(); this.select(Math.min(this.values.length - 1, this.selected + 10)); }
    else if (e.key === 'PageUp') { e.preventDefault(); this.select(Math.max(0, this.selected - 10)); }
    else if (e.key === 'Enter') { e.preventDefault(); this.choose(this.selected, e); }
    else if (this.onExtraKey) this.onExtraKey(e);
  }

  choose(i, evt) {
    const v = this.values[i];
    if (v === undefined && !this.allowEmptyChoice) return;
    this.close();
    this.onChooseSuggestion(v, evt);
  }

  /* Defaults for the options form. */
  getSuggestions(q) { return this.items ? this.items(q) : []; }
  renderSuggestion(v, el) { el.textContent = String(v); }
  onChooseSuggestion(v, evt) { if (this.onChoose) this.onChoose(v, evt); }
}

/* --- settings rows ---------------------------------------------------------------- */

/* new Setting(container).setName('…').setDesc('…').addToggle(t => …)
   Rows use Obsidian's .setting-item markup. */
export class Setting {
  constructor(containerEl) {
    this.nameEl = h('div.setting-item-name');
    this.descEl = h('div.setting-item-description');
    this.infoEl = h('div.setting-item-info', this.nameEl, this.descEl);
    this.controlEl = h('div.setting-item-control');
    this.settingEl = h('div.setting-item', this.infoEl, this.controlEl);
    containerEl.appendChild(this.settingEl);
  }
  setName(n) { if (n instanceof Node) this.nameEl.replaceChildren(n); else this.nameEl.textContent = n; return this; }
  setDesc(d) { if (d instanceof Node) this.descEl.replaceChildren(d); else this.descEl.textContent = d; return this; }
  setClass(c) { this.settingEl.classList.add(c); return this; }
  setHeading() { this.settingEl.classList.add('setting-item-heading'); return this; }
  setDisabled(d) { this.settingEl.classList.toggle('is-disabled', !!d); this.controlEl.querySelectorAll('input,select,button,textarea').forEach(x => { x.disabled = !!d; }); return this; }
  then(fn) { fn(this); return this; }

  addToggle(fn) {
    const box = h('div.checkbox-container', { role: 'switch', tabindex: '0' }, h('input', { type: 'checkbox', tabindex: '-1' }));
    const api = {
      value: false, toggleEl: box, handlers: [],
      setValue(v) { api.value = !!v; box.classList.toggle('is-enabled', api.value); box.setAttribute('aria-checked', String(api.value)); return api; },
      getValue() { return api.value; },
      onChange(cb) { api.handlers.push(cb); return api; },
      setDisabled(d) { box.classList.toggle('is-disabled', !!d); api.disabled = d; return api; },
      setTooltip(t) { box.title = t; return api; }
    };
    const flip = () => { if (api.disabled) return; api.setValue(!api.value); api.handlers.forEach(cb => cb(api.value)); };
    box.addEventListener('click', flip);
    box.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } });
    this.controlEl.appendChild(box);
    fn(api);
    return this;
  }

  addText(fn) { return this._input('input', { type: 'text', spellcheck: false }, fn); }
  addTextArea(fn) { return this._input('textarea', { spellcheck: false }, fn); }

  _input(tag, attrs, fn) {
    const el = h(tag, attrs);
    const api = {
      inputEl: el,
      setValue(v) { el.value = v == null ? '' : v; return api; },
      getValue() { return el.value; },
      setPlaceholder(p) { el.placeholder = p; return api; },
      onChange(cb) { el.addEventListener('input', () => cb(el.value)); return api; },
      setDisabled(d) { el.disabled = d; return api; }
    };
    this.controlEl.appendChild(el);
    fn(api);
    return this;
  }

  addDropdown(fn) {
    const el = h('select.dropdown');
    const api = {
      selectEl: el,
      addOption(value, label) { el.appendChild(h('option', { value, text: label })); return api; },
      addOptions(o) { Object.keys(o).forEach(k => api.addOption(k, o[k])); return api; },
      setValue(v) { el.value = v; return api; },
      getValue() { return el.value; },
      onChange(cb) { el.addEventListener('change', () => cb(el.value)); return api; },
      setDisabled(d) { el.disabled = d; return api; }
    };
    this.controlEl.appendChild(el);
    fn(api);
    return this;
  }

  addSlider(fn) {
    const el = h('input.slider', { type: 'range' });
    const api = {
      sliderEl: el,
      setLimits(min, max, step) { el.min = min; el.max = max; el.step = step; return api; },
      setValue(v) { el.value = v; el.title = v; return api; },
      getValue() { return +el.value; },
      setDynamicTooltip() { el.addEventListener('input', () => { el.title = el.value; }); return api; },
      onChange(cb) { el.addEventListener('input', () => cb(+el.value)); return api; }
    };
    this.controlEl.appendChild(el);
    fn(api);
    return this;
  }

  addButton(fn) {
    const el = h('button');
    const api = {
      buttonEl: el,
      setButtonText(t) { el.textContent = t; return api; },
      setIcon(n) { el.replaceChildren(icon(n)); return api; },
      setCta() { el.classList.add('mod-cta'); return api; },
      setWarning() { el.classList.add('mod-warning'); return api; },
      setTooltip(t) { el.setAttribute('aria-label', t); el.title = t; return api; },
      setDisabled(d) { el.disabled = d; return api; },
      onClick(cb) { el.addEventListener('click', cb); return api; }
    };
    this.controlEl.appendChild(el);
    fn(api);
    return this;
  }

  addExtraButton(fn) {
    const el = h('div.clickable-icon.extra-setting-button', { role: 'button', tabindex: '0' });
    const api = {
      extraSettingsEl: el,
      setIcon(n) { el.replaceChildren(icon(n)); return api; },
      setTooltip(t) { el.setAttribute('aria-label', t); el.title = t; return api; },
      setDisabled(d) { el.classList.toggle('is-disabled', !!d); return api; },
      onClick(cb) { el.addEventListener('click', cb); return api; }
    };
    this.controlEl.appendChild(el);
    fn(api);
    return this;
  }

  addColorPicker(fn) {
    const el = h('input', { type: 'color' });
    const api = {
      colorPickerEl: el,
      setValue(v) { el.value = v || '#000000'; return api; },
      getValue() { return el.value; },
      onChange(cb) { el.addEventListener('input', () => cb(el.value)); return api; }
    };
    this.controlEl.appendChild(el);
    fn(api);
    return this;
  }
}

/* --- small helpers ---------------------------------------------------------------- */

export function debounce(fn, wait, resetTimer = true) {
  let t = null, last = 0;
  const d = function (...args) {
    if (t && !resetTimer) return;
    clearTimeout(t);
    t = setTimeout(() => { t = null; last = Date.now(); fn.apply(this, args); }, wait);
  };
  d.cancel = () => { clearTimeout(t); t = null; };
  d.run = (...args) => { clearTimeout(t); t = null; fn(...args); };
  return d;
}

export function saveBlob(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function formatBytes(n) {
  const u = ['B', 'KB', 'MB', 'GB']; let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return (i ? n.toFixed(1) : n) + ' ' + u[i];
}
