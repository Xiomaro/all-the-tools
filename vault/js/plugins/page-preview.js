/* Page preview: hovering a link shows the note (or heading, block or
   image) it points to in a popover, as Obsidian's core plugin does.

   Anything that shows links triggers the workspace event
     'hover-link' { event, source, hoverParent, targetEl, linktext, sourcePath }
   and this plugin decides whether to show a popover. Each source can
   require Ctrl (Cmd on macOS) to be held; the choices are kept in
   page-preview.json as { "<source>": true when Ctrl/Cmd is required },
   with Obsidian's defaults: the editor needs it, reading view doesn't.

   Popovers stay while the pointer is over them or their link, nest (a
   link inside a popover opens another above it), and close when the
   pointer leaves, on Escape, or on a click elsewhere. */

import { h, Setting, isMac } from '../core/ui.js';
import { Component } from '../core/events.js';
import { parseLinktext } from '../core/metadata.js';
import { IMAGE_EXT } from '../core/vault.js';
import { renderNoteInto } from '../render/embeds.js';

/* Obsidian's hover sources, in the order its settings list them. */
const SOURCES = {
  'backlink': { display: 'Backlinks', defaultMod: true },
  'bookmarks': { display: 'Bookmarks', defaultMod: true },
  'canvas': { display: 'Canvas', defaultMod: false },
  'editor': { display: 'Editor', defaultMod: true },
  'file-explorer': { display: 'Files', defaultMod: true },
  'graph': { display: 'Graph view', defaultMod: true },
  'outgoing-link': { display: 'Outgoing links', defaultMod: true },
  'properties': { display: 'Properties', defaultMod: true },
  'preview': { display: 'Reading view', defaultMod: false },
  'search': { display: 'Search', defaultMod: true },
  'tab-header': { display: 'Tab header', defaultMod: true },
  'tag': { display: 'Tags', defaultMod: true }
};

const SHOW_DELAY = 300;
const HIDE_DELAY = 300;

class HoverPopover extends Component {
  constructor(manager, info, parent) {
    super();
    this.manager = manager;
    this.info = info;
    this.targetEl = info.targetEl;
    this.linktext = info.linktext;
    this.parent = parent;
    this.children = [];
    this.overTarget = true;
    this.overPopover = false;
    this.hoverEl = h('div.popover.hover-popover');
    this.anchor = anchorFor(info);
    this.load();
  }

  isActive() { return this.overTarget || this.overPopover || this.children.some(c => c.isActive()); }
}

/* Where the popover hangs from: the link, or the pointer for a big target
   such as the graph's canvas. */
function anchorFor(info) {
  const r = info.targetEl.getBoundingClientRect();
  const ev = info.event;
  if (ev && typeof ev.clientX === 'number' && (r.width > 400 || r.height > 120)) {
    return { left: ev.clientX, right: ev.clientX, top: ev.clientY - 10, bottom: ev.clientY + 10, point: true, x: ev.clientX, y: ev.clientY };
  }
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
}

class PopoverManager {
  constructor(app, plugin, settings) {
    this.app = app;
    this.plugin = plugin;
    this.settings = settings;
    this.popovers = [];
    this.pending = null;

    plugin.registerDomEvent(document, 'keydown', e => {
      if (e.key === 'Escape' && this.popovers.length) { this.closeAll(); return; }
      /* Pressing Ctrl/Cmd while over a link that needs it. */
      if ((e.key === 'Control' || e.key === 'Meta') && this.waiting) {
        const w = this.waiting;
        this.waiting = null;
        if (w.targetEl.matches(':hover')) this.schedule(w, 0);
      }
    }, true);
    plugin.registerDomEvent(document, 'mousedown', e => {
      if (this.popovers.length && !e.target.closest('.hover-popover')) this.closeAll();
    }, true);
  }

  requiresMod(source) {
    if (Object.prototype.hasOwnProperty.call(this.settings, source)) return !!this.settings[source];
    return SOURCES[source] ? SOURCES[source].defaultMod : true;
  }

  onHover(info) {
    if (!info || !info.targetEl || !info.linktext) return;
    const existing = this.popovers.find(p => p.targetEl === info.targetEl && p.linktext === info.linktext);
    if (existing) { existing.overTarget = true; clearTimeout(existing.hideTimer); return; }
    if (this.pending && this.pending.targetEl === info.targetEl && this.pending.linktext === info.linktext) return;

    const ev = info.event;
    const mod = ev && (isMac ? ev.metaKey : ev.ctrlKey || ev.metaKey);
    if (this.requiresMod(info.source) && !mod) {
      this.waiting = info;
      const leave = () => { if (this.waiting === info) this.waiting = null; };
      info.targetEl.addEventListener('mouseleave', leave, { once: true });
      return;
    }
    this.schedule(info, SHOW_DELAY);
  }

  schedule(info, delay) {
    this.cancelPending();
    const timer = setTimeout(() => {
      if (this.pending !== entry) return;
      this.pending = null;
      this.show(info);
    }, delay);
    const entry = { targetEl: info.targetEl, linktext: info.linktext, timer };
    this.pending = entry;
    const cancel = () => { if (this.pending === entry) this.cancelPending(); };
    info.targetEl.addEventListener('mouseleave', cancel, { once: true });
    /* A big target (the graph) keeps the pointer inside while it moves
       off the node, so moving away counts as leaving. */
    const a = anchorFor(info);
    if (a.point) {
      const move = e => { if (Math.hypot(e.clientX - a.x, e.clientY - a.y) > 30) { cancel(); info.targetEl.removeEventListener('mousemove', move); } };
      info.targetEl.addEventListener('mousemove', move);
    }
  }

  cancelPending() {
    if (!this.pending) return;
    clearTimeout(this.pending.timer);
    this.pending = null;
  }

  async show(info) {
    const app = this.app;
    const { path, subpath } = parseLinktext(info.linktext.trim());
    const file = path ? app.metadataCache.getFirstLinkpathDest(path, info.sourcePath || '') : app.vault.getFileByPath(info.sourcePath || '');
    if (!file) return;
    const ext = (file.extension || '').toLowerCase();
    if (ext !== 'md' && !IMAGE_EXT.has(ext) && ext !== 'pdf') return;

    const parentEl = info.targetEl.closest('.hover-popover');
    const parent = parentEl ? this.popovers.find(p => p.hoverEl === parentEl) : null;
    /* Only one popover per level: a new one replaces its siblings. */
    this.popovers.filter(p => p.parent === parent).forEach(p => this.close(p));

    const pop = new HoverPopover(this, info, parent);
    if (parent) parent.children.push(pop);
    this.popovers.push(pop);
    const el = pop.hoverEl;
    const embed = h('div.markdown-embed.is-loaded');
    const content = h('div.markdown-embed-content');
    embed.appendChild(content);
    el.appendChild(embed);
    el.style.visibility = 'hidden';
    document.body.appendChild(el);

    el.addEventListener('mouseenter', () => { pop.overPopover = true; this.keep(pop); });
    el.addEventListener('mouseleave', () => { pop.overPopover = false; this.scheduleClose(pop); });
    const onTargetLeave = () => { pop.overTarget = false; this.scheduleClose(pop); };
    info.targetEl.addEventListener('mouseleave', onTargetLeave);
    pop.register(() => info.targetEl.removeEventListener('mouseleave', onTargetLeave));
    if (pop.anchor.point) {
      const move = e => { if (Math.hypot(e.clientX - pop.anchor.x, e.clientY - pop.anchor.y) > 30) onTargetLeave(); };
      info.targetEl.addEventListener('mousemove', move);
      pop.register(() => info.targetEl.removeEventListener('mousemove', move));
    }
    /* Following a link from inside closes the previews. */
    el.addEventListener('click', e => { if (e.target.closest('a.internal-link, .markdown-embed-link')) setTimeout(() => this.closeAll()); });

    try {
      if (IMAGE_EXT.has(ext)) {
        el.classList.add('mod-image');
        content.appendChild(h('img', { src: await app.vault.getResourceUrl(file), alt: file.name }));
      } else if (ext === 'pdf') {
        el.classList.add('mod-pdf');
        const page = /page=(\d+)/.exec(subpath || '');
        content.appendChild(h('iframe', { src: (await app.vault.getResourceUrl(file)) + (page ? '#page=' + page[1] : ''), title: file.name }));
      } else {
        await renderNoteInto(app, file, subpath, content, { component: pop, depth: 0, ancestors: [], hoverSource: 'preview', hoverParent: pop });
      }
    } catch (err) {
      console.error('[vault] page preview failed', err);
    }
    if (!this.popovers.includes(pop)) return;
    this.position(pop);
    el.style.visibility = '';
    const img = el.querySelector('img');
    if (img && !img.complete) img.addEventListener('load', () => this.position(pop), { once: true });
  }

  position(pop) {
    const el = pop.hoverEl;
    const a = pop.anchor;
    const gap = 8;
    const w = el.offsetWidth, hgt = el.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    let top = a.bottom + gap;
    if (top + hgt > vh - gap && a.top - gap - hgt >= gap) top = a.top - gap - hgt;
    top = Math.max(gap, Math.min(top, vh - hgt - gap));
    let left = a.point ? a.x - w / 2 : a.left;
    left = Math.max(gap, Math.min(left, vw - w - gap));
    el.style.top = top + 'px';
    el.style.left = left + 'px';
  }

  keep(pop) {
    for (let p = pop; p; p = p.parent) clearTimeout(p.hideTimer);
  }

  scheduleClose(pop) {
    clearTimeout(pop.hideTimer);
    pop.hideTimer = setTimeout(() => {
      if (!this.popovers.includes(pop) || pop.isActive()) return;
      const parent = pop.parent;
      this.close(pop);
      if (parent && !parent.isActive()) this.scheduleClose(parent);
    }, HIDE_DELAY);
  }

  close(pop) {
    pop.children.slice().forEach(c => this.close(c));
    clearTimeout(pop.hideTimer);
    const i = this.popovers.indexOf(pop);
    if (i > -1) this.popovers.splice(i, 1);
    if (pop.parent) pop.parent.children = pop.parent.children.filter(c => c !== pop);
    pop.hoverEl.remove();
    pop.unload();
  }

  closeAll() {
    this.cancelPending();
    this.waiting = null;
    this.popovers.filter(p => !p.parent).forEach(p => this.close(p));
    this.popovers.slice().forEach(p => this.close(p));
  }
}

export default {
  id: 'page-preview',
  name: 'Page preview',
  description: 'Preview a linked note by hovering over the link.',
  async onload(plugin) {
    const app = plugin.app;
    const saved = await plugin.loadData();
    const settings = saved && typeof saved === 'object' ? saved : {};
    const manager = new PopoverManager(app, plugin, settings);
    app.pagePreview = manager;
    plugin.register(() => { manager.closeAll(); if (app.pagePreview === manager) app.pagePreview = null; });
    plugin.registerEvent(app.workspace.on('hover-link', info => manager.onHover(info)));
    /* Opening something else (a new tab, a command) closes previews. */
    plugin.registerEvent(app.workspace.on('active-leaf-change', () => manager.closeAll()));

    plugin.addSettingTab(containerEl => {
      containerEl.replaceChildren();
      const key = isMac ? 'Cmd' : 'Ctrl';
      new Setting(containerEl).setHeading().setName('Require ' + key + ' to trigger page preview')
        .setDesc('For each place links appear, choose whether ' + key + ' must be held down while hovering a link to show its preview.');
      const ids = Object.keys(SOURCES).concat(Object.keys(settings).filter(k => !SOURCES[k]));
      for (const id of ids) {
        const info = SOURCES[id] || { display: id };
        new Setting(containerEl).setName(info.display).addToggle(t => t
          .setValue(manager.requiresMod(id))
          .onChange(v => { settings[id] = v; plugin.saveData(settings); }));
      }
    }, 'Page preview');
  }
};
