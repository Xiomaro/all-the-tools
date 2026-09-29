/* Suggestions under a text box or editable div, like Obsidian's
   AbstractInputSuggest: a .suggestion-container popover that follows the
   input, with arrow keys, Enter/Tab to pick and Escape to close.

   new InputSuggest(app, inputEl, {
     getSuggestions(query) -> items,   // query is the input's text
     renderSuggestion(item, el),
     onSelect(item, evt),
     limit
   })

   Create it before adding the input's own keydown handlers: while the
   list is open it takes the keys it uses. */

import { h } from '../core/ui.js';

export class InputSuggest {
  constructor(app, inputEl, opts) {
    this.app = app;
    this.inputEl = inputEl;
    this.opts = opts;
    this.items = [];
    this.selected = 0;
    this.suggestEl = h('div.suggestion');
    this.containerEl = h('div.suggestion-container.mod-property-suggest', this.suggestEl);
    this.containerEl.addEventListener('mousedown', e => e.preventDefault());
    this.onInput = () => this.update();
    this.onFocus = () => { if (!opts.noOpenOnFocus) this.update(); };
    this.onBlur = () => setTimeout(() => { if (document.activeElement !== inputEl) this.close(); }, 0);
    this.onKey = e => this.key(e);
    inputEl.addEventListener('input', this.onInput);
    inputEl.addEventListener('focus', this.onFocus);
    inputEl.addEventListener('blur', this.onBlur);
    inputEl.addEventListener('keydown', this.onKey);
  }

  get isOpen() { return this.containerEl.isConnected; }

  getValue() {
    return this.inputEl.tagName === 'INPUT' || this.inputEl.tagName === 'TEXTAREA' ? this.inputEl.value : this.inputEl.textContent;
  }

  async update() {
    const token = this._token = {};
    let items = await this.opts.getSuggestions(this.getValue());
    if (token !== this._token) return;
    items = (items || []).slice(0, this.opts.limit || 50);
    if (!items.length || document.activeElement !== this.inputEl) { this.close(); return; }
    this.items = items;
    this.selected = 0;
    this.suggestEl.replaceChildren(...items.map((item, i) => {
      const el = h('div.suggestion-item', {
        onmousemove: () => this.select(i),
        onclick: e => this.choose(i, e)
      });
      this.opts.renderSuggestion(item, el);
      return el;
    }));
    this.open();
    this.select(0);
  }

  open() {
    if (!this.isOpen) document.body.appendChild(this.containerEl);
    this.position();
  }

  position() {
    const r = this.inputEl.getBoundingClientRect();
    const c = this.containerEl;
    c.style.left = Math.max(4, Math.min(r.left, window.innerWidth - c.offsetWidth - 4)) + 'px';
    const below = r.bottom + 4;
    if (below + c.offsetHeight > window.innerHeight - 4 && r.top - c.offsetHeight - 4 > 0) c.style.top = (r.top - c.offsetHeight - 4) + 'px';
    else c.style.top = below + 'px';
    c.style.minWidth = Math.max(200, r.width) + 'px';
  }

  close() { this.containerEl.remove(); this.items = []; }

  select(i) {
    if (!this.items.length) return;
    this.selected = (i + this.items.length) % this.items.length;
    Array.from(this.suggestEl.children).forEach((el, n) => el.classList.toggle('is-selected', n === this.selected));
    const el = this.suggestEl.children[this.selected];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }

  choose(i, evt) {
    const item = this.items[i];
    this.close();
    if (item !== undefined) this.opts.onSelect(item, evt);
  }

  key(e) {
    if (!this.isOpen || e.isComposing) return;
    let used = true;
    if (e.key === 'ArrowDown') this.select(this.selected + 1);
    else if (e.key === 'ArrowUp') this.select(this.selected - 1);
    else if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey && this.opts.tabSelects !== false)) this.choose(this.selected, e);
    else if (e.key === 'Escape') this.close();
    else used = false;
    if (used) { e.preventDefault(); e.stopImmediatePropagation(); }
  }

  destroy() {
    this.close();
    this.inputEl.removeEventListener('input', this.onInput);
    this.inputEl.removeEventListener('focus', this.onFocus);
    this.inputEl.removeEventListener('blur', this.onBlur);
    this.inputEl.removeEventListener('keydown', this.onKey);
  }
}
