/* Slides: present the active note full screen, one slide per part between
   "---" lines, as Obsidian's core plugin does. Arrow keys, Space and Page
   Up/Down move between slides, Home/End jump to the ends, Escape leaves.
   Obsidian draws slides with reveal.js; here they are laid out on the
   same 960x700 stage, scaled to fit the screen. */

import { h, clickableIcon, Notice } from '../core/ui.js';
import { Component } from '../core/events.js';
import { splitFrontmatter } from '../core/metadata.js';

/* The note's slides: [{ text, lineOffset }]. "---" inside code fences
   doesn't split. */
export function splitSlides(text) {
  const fm = splitFrontmatter(text);
  const startLine = fm ? text.slice(0, fm.bodyStart).split('\n').length - 1 : 0;
  const lines = text.split('\n');
  const slides = [];
  let cur = [], curStart = startLine, fence = null;
  for (let i = startLine; i < lines.length; i++) {
    const l = lines[i];
    const f = /^ {0,3}(`{3,}|~{3,})/.exec(l);
    if (f) {
      if (!fence) fence = f[1];
      else if (f[1][0] === fence[0] && f[1].length >= fence.length && !l.trim().slice(f[1].length).trim()) fence = null;
    }
    if (!fence && /^---\s*$/.test(l)) {
      slides.push({ text: cur.join('\n'), lineOffset: curStart });
      cur = []; curStart = i + 1;
      continue;
    }
    cur.push(l);
  }
  slides.push({ text: cur.join('\n'), lineOffset: curStart });
  return slides.filter(s => s.text.trim());
}

class Presentation extends Component {
  constructor(app, file, slides) {
    super();
    this.app = app;
    this.file = file;
    this.slides = slides;
    this.index = 0;
    this.rendered = new Map();
    this.stageEl = h('div.slides-stage');
    this.counterEl = h('span.slides-counter');
    this.progressEl = h('div.slides-progress');
    this.containerEl = h('div.slides-container', { tabindex: '-1' },
      this.stageEl,
      h('div.slides-close-btn', clickableIcon('x', 'Close presentation', () => this.close())),
      h('div.slides-controls',
        clickableIcon('chevron-left', 'Previous slide', () => this.go(this.index - 1)),
        this.counterEl,
        clickableIcon('chevron-right', 'Next slide', () => this.go(this.index + 1))),
      this.progressEl);
  }

  async open() {
    this.load();
    document.body.appendChild(this.containerEl);
    this.registerDomEvent(window, 'keydown', e => this.onKey(e), true);
    this.registerDomEvent(window, 'resize', () => this.fit());
    this.registerDomEvent(document, 'fullscreenchange', () => { if (!document.fullscreenElement && this.wasFullscreen) this.close(); });
    this.registerDomEvent(this.containerEl, 'click', e => {
      if (e.target.closest('a, button, .clickable-icon, input, .callout-title, iframe, video, audio')) return;
      this.go(this.index + (e.clientX < window.innerWidth / 3 ? -1 : 1));
    });
    this.containerEl.focus();
    try {
      if (this.containerEl.requestFullscreen) { await this.containerEl.requestFullscreen(); this.wasFullscreen = true; }
    } catch (e) { /* the page fills the window instead */ }
    this.fit();
    await this.go(0);
  }

  fit() {
    const s = Math.min(window.innerWidth / 960, window.innerHeight / 700);
    this.stageEl.style.transform = 'translate(-50%, -50%) scale(' + s + ')';
  }

  async go(i) {
    if (i < 0 || i >= this.slides.length) return;
    this.index = i;
    this.counterEl.textContent = (i + 1) + ' / ' + this.slides.length;
    this.progressEl.style.width = ((i + 1) / this.slides.length * 100) + '%';
    let el = this.rendered.get(i);
    if (!el) {
      const s = this.slides[i];
      const sizer = h('div.markdown-preview-sizer.markdown-preview-section');
      el = h('section.slide.markdown-rendered.markdown-preview-view', sizer);
      this.rendered.set(i, el);
      this.stageEl.appendChild(el);
      el.hidden = true;
      await this.app.markdown.render(s.text, sizer, this.file.path, this, { fragment: true, noFrontmatter: true, lineOffset: s.lineOffset });
    }
    if (this.index !== i) return;
    for (const [k, e] of this.rendered) e.hidden = k !== i;
    el.classList.add('present');
  }

  onKey(e) {
    if (e.target && e.target.closest && e.target.closest('input, textarea, [contenteditable="true"]')) return;
    const next = ['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'n', 'l', 'j'];
    const prev = ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace', 'p', 'h', 'k'];
    let handled = true;
    if (e.key === 'Escape') this.close();
    else if (next.includes(e.key) && !e.shiftKey) this.go(this.index + 1);
    else if (prev.includes(e.key) || (e.key === ' ' && e.shiftKey)) this.go(this.index - 1);
    else if (e.key === 'Home') this.go(0);
    else if (e.key === 'End') this.go(this.slides.length - 1);
    else handled = false;
    if (handled) { e.preventDefault(); e.stopPropagation(); }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    if (document.fullscreenElement === this.containerEl && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    this.containerEl.remove();
    this.unload();
    if (this.onClose) this.onClose();
  }
}

export default {
  id: 'slides',
  name: 'Slides',
  description: 'Create presentations from Markdown files.',
  async onload(plugin) {
    const app = plugin.app;
    let current = null;
    const start = async file => {
      if (current) current.close();
      const text = await app.vault.cachedRead(file);
      const slides = splitSlides(text);
      if (!slides.length) { new Notice('This note is empty.'); return; }
      current = new Presentation(app, file, slides);
      current.onClose = () => { current = null; };
      await current.open();
    };
    app.slides = { start, get current() { return current; } };
    plugin.register(() => { if (current) current.close(); if (app.slides && app.slides.start === start) app.slides = null; });
    plugin.addCommand({
      id: 'slides:start',
      name: 'Start presentation',
      icon: 'presentation',
      checkCallback(checking) {
        const file = app.workspace.getActiveFile();
        if (!file || file.extension !== 'md') return false;
        if (!checking) start(file).catch(err => new Notice('Couldn’t start the presentation: ' + (err.message || err)));
        return true;
      }
    });
  }
};
