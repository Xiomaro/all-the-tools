/* The graph's settings panel, with Obsidian's markup: .graph-controls in
   the top right corner holding collapsible sections (Filters, Groups,
   Display, Forces) of .setting-item rows, and the close, reset and open
   buttons. It edits an options object in Obsidian's format and reports
   each change through onChange(key, value). */

import { h, icon, clickableIcon, Setting, debounce, addIcon, hasIcon } from '../core/ui.js';
import { rgbToHex, hexToRgb, nextGroupColor } from './settings.js';

/* Obsidian's collapse arrow (the panes register the same one). */
if (!hasIcon('right-triangle')) addIcon('right-triangle', [['path', { d: 'M3 8L12 17L21 8' }]]);

export class GraphControls {
  /* opts: { local, options: () => object, onChange(key, value), onReset(), onAnimate() } */
  constructor(parentEl, opts) {
    this.opts = opts;
    this.containerEl = h('div.graph-controls');
    parentEl.appendChild(this.containerEl);
    this.render();
  }

  get o() { return this.opts.options(); }

  set(key, value) { this.opts.onChange(key, value); }

  render() {
    const o = this.o, el = this.containerEl;
    el.replaceChildren();
    el.classList.toggle('is-close', !!o.close);
    el.append(
      clickableIcon('x', 'Close', () => { this.set('close', true); this.render(); }, 'graph-controls-button mod-close'),
      clickableIcon('rotate-ccw', 'Restore default settings', () => { this.opts.onReset(); this.render(); }, 'graph-controls-button mod-reset'),
      clickableIcon('settings', 'Open graph settings', () => { this.set('close', false); this.render(); }, 'graph-controls-button mod-open'));
    if (o.close) return;
    this.section('filter', 'Filters', 'collapse-filter', body => this.filters(body));
    this.section('color-groups', 'Groups', 'collapse-color-groups', body => this.groups(body));
    this.section('display', 'Display', 'collapse-display', body => this.display(body));
    this.section('forces', 'Forces', 'collapse-forces', body => this.forces(body));
  }

  section(cls, title, key, fill) {
    const collapsed = !!this.o[key];
    const iconEl = h('div.tree-item-icon.collapse-icon', icon('right-triangle'));
    iconEl.classList.toggle('is-collapsed', collapsed);
    const self = h('div.tree-item-self.mod-collapsible', iconEl,
      h('div.tree-item-inner', h('header.graph-control-section-header', { text: title })));
    const sec = h('div.tree-item.graph-control-section.mod-' + cls, self);
    sec.classList.toggle('is-collapsed', collapsed);
    self.addEventListener('click', () => { this.set(key, !this.o[key]); this.render(); });
    if (!collapsed) {
      const body = h('div.tree-item-children');
      fill(body);
      sec.appendChild(body);
    }
    this.containerEl.appendChild(sec);
  }

  toggle(parent, name, key, invert) {
    new Setting(parent).setName(name).setClass('mod-toggle').addToggle(t => t
      .setValue(invert ? !this.o[key] : !!this.o[key])
      .onChange(v => this.set(key, invert ? !v : v)));
  }

  slider(parent, name, key, min, max, step) {
    new Setting(parent).setName(name).setClass('mod-slider').addSlider(s => s
      .setLimits(min, max, step).setValue(this.o[key]).setDynamicTooltip()
      .onChange(v => this.set(key, v)));
  }

  searchBox(value, placeholder, onInput) {
    const input = h('input', { type: 'search', placeholder, spellcheck: false, value: value || '', enterkeyhint: 'search' });
    const clear = h('div.search-input-clear-button', { 'aria-label': 'Clear search' });
    const el = h('div.search-input-container', input, clear);
    const sync = () => el.classList.toggle('has-value', !!input.value);
    input.addEventListener('input', () => { sync(); onInput(input.value); });
    clear.addEventListener('click', () => { input.value = ''; sync(); onInput(''); input.focus(); });
    sync();
    return { el, input };
  }

  filters(body) {
    const setSearch = debounce(v => this.set('search', v), 300);
    const box = this.searchBox(this.o.search, 'Search files...', setSearch);
    const row = h('div.setting-item.mod-search-setting', h('div.setting-item-control', box.el));
    body.appendChild(row);
    if (this.opts.local) {
      this.slider(body, 'Depth', 'localJumps', 1, 5, 1);
      this.toggle(body, 'Incoming links', 'localBacklinks');
      this.toggle(body, 'Outgoing links', 'localForelinks');
      this.toggle(body, 'Neighbor links', 'localInterlinks');
    }
    this.toggle(body, 'Tags', 'showTags');
    this.toggle(body, 'Attachments', 'showAttachments');
    this.toggle(body, 'Existing files only', 'hideUnresolved');
    if (!this.opts.local) this.toggle(body, 'Orphans', 'showOrphans');
  }

  groups(body) {
    const list = h('div.graph-color-groups-container');
    const groups = () => this.o.colorGroups;
    const save = () => this.set('colorGroups', groups());
    groups().forEach((g, i) => {
      const box = this.searchBox(g.query, 'Enter query...', debounce(v => { g.query = v; save(); }, 300));
      const color = h('input', { type: 'color', value: rgbToHex(g.color && g.color.rgb || 0), 'aria-label': 'Change color' });
      color.addEventListener('input', debounce(() => { g.color = Object.assign({ a: 1 }, g.color, { rgb: hexToRgb(color.value) }); save(); }, 100));
      const remove = clickableIcon('x', 'Delete group', () => { groups().splice(i, 1); save(); this.render(); }, 'graph-color-group-remove');
      list.appendChild(h('div.graph-color-group', box.el, color, remove));
    });
    body.appendChild(list);
    body.appendChild(h('div.graph-color-button-container',
      h('button.mod-cta', { text: 'New group', onclick: () => {
        groups().push({ query: '', color: nextGroupColor(groups()) });
        save();
        this.render();
        const inputs = this.containerEl.querySelectorAll('.graph-color-group input[type=search]');
        if (inputs.length) inputs[inputs.length - 1].focus();
      } })));
  }

  display(body) {
    this.toggle(body, 'Arrows', 'showArrow');
    this.slider(body, 'Text fade threshold', 'textFadeMultiplier', -3, 3, 0.1);
    this.slider(body, 'Node size', 'nodeSizeMultiplier', 0.1, 5, 0.01);
    this.slider(body, 'Link thickness', 'lineSizeMultiplier', 0.1, 5, 0.01);
    new Setting(body).setClass('mod-button').addButton(b => b.setButtonText('Animate').setCta().onClick(() => this.opts.onAnimate()));
  }

  forces(body) {
    this.slider(body, 'Center force', 'centerStrength', 0, 1, 0.01);
    this.slider(body, 'Repel force', 'repelStrength', 0, 20, 0.01);
    this.slider(body, 'Link force', 'linkStrength', 0, 1, 0.01);
    this.slider(body, 'Link distance', 'linkDistance', 30, 500, 1);
  }
}
