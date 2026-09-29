/* A reading-view page for a whole note, the way Obsidian lays it out:

   .markdown-preview-view.markdown-rendered
     .markdown-preview-sizer.markdown-preview-section
       .mod-header.mod-ui     inline title and properties
       div.el-h1 > h1 ...     the note's sections
       .mod-footer.mod-ui     (empty; for backlinks in document and the like)

   Used by Export to PDF and slides here, and available to the markdown
   view as app.markdown.MarkdownPreview. */

import { h, Notice } from '../core/ui.js';
import { Component } from '../core/events.js';
import { renderMarkdown, scrollToLine, scrollToSubpath, getSectionForLine, applyHeadingFolds } from './markdown.js';

export class MarkdownPreview extends Component {
  /* opts: { sourcePath, onTaskToggle, inlineTitle (default: showInlineTitle), properties (default true) } */
  constructor(app, opts = {}) {
    super();
    this.app = app;
    this.opts = opts;
    this.file = null;
    this.text = '';
    this.containerEl = h('div.markdown-preview-view.markdown-rendered.node-insert-event.allow-fold-headings.allow-fold-lists.show-indentation-guide.show-properties', { tabindex: '-1' });
    this.sizerEl = h('div.markdown-preview-sizer.markdown-preview-section');
    this.containerEl.appendChild(this.sizerEl);
    this.headerEl = h('div.mod-header.mod-ui');
    this.footerEl = h('div.mod-footer.mod-ui');
    this.load();
  }

  applySettings() {
    const c = this.app.config;
    this.containerEl.classList.toggle('is-readable-line-width', c.get('readableLineLength') !== false);
    this.containerEl.classList.toggle('allow-fold-headings', c.get('foldHeading') !== false);
    this.containerEl.classList.toggle('allow-fold-lists', c.get('foldIndent') !== false);
    this.containerEl.classList.toggle('show-indentation-guide', c.get('showIndentGuide') !== false);
    this.containerEl.dir = c.get('rightToLeft') ? 'rtl' : '';
  }

  /* Render `text` (the contents of `file`). */
  async set(text, file) {
    this.text = text;
    this.file = file || null;
    this.applySettings();
    const sourcePath = file ? file.path : (this.opts.sourcePath || '');
    const scroll = this.containerEl.scrollTop;
    await this.renderHeader();
    await renderMarkdown(this.app, text, this.sizerEl, sourcePath, this, {
      onTaskToggle: this.opts.onTaskToggle,
      noFrontmatter: true
    });
    this.sizerEl.prepend(this.headerEl);
    this.sizerEl.append(this.footerEl);
    applyHeadingFolds(this.sizerEl);
    this.containerEl.scrollTop = scroll;
  }

  async renderHeader() {
    const els = [];
    const showTitle = this.opts.inlineTitle ?? this.app.config.get('showInlineTitle') !== false;
    if (showTitle && this.file) els.push(h('div.inline-title', { text: this.file.basename, dir: 'auto' }));
    const mode = this.app.config.get('propertiesInDocument');
    const cache = this.file ? this.app.metadataCache.getFileCache(this.file) : null;
    const hasProps = cache && cache.frontmatter && Object.keys(cache.frontmatter).length;
    if (this.opts.properties !== false && hasProps && mode !== 'hidden' && this.app.properties) {
      const box = h('div');
      try { await this.app.properties.render(box, this.file, { editable: false }); els.push(...box.childNodes); }
      catch (err) { console.error('[vault] properties failed to render', err); }
    }
    this.headerEl.replaceChildren(...els);
  }

  rerender() { return this.set(this.text, this.file); }
  clear() { this.sizerEl.replaceChildren(); this.text = ''; }
  getScroll() { return this.containerEl.scrollTop; }
  applyScroll(y) { this.containerEl.scrollTop = y; }
  scrollToLine(line, highlight) { return scrollToLine(this.sizerEl, line, highlight); }
  scrollToSubpath(subpath, highlight) { return scrollToSubpath(this.app, this.sizerEl, this.file, subpath, highlight); }
  getSectionForLine(line) { return getSectionForLine(this.sizerEl, line); }
}

/* --- Export to PDF -------------------------------------------------------------------
   The browser's print dialog does the work ("Save as PDF" as the printer),
   so Obsidian's own export options (page size, margins, scale) are the
   dialog's instead. The note is rendered into a print-only container and
   printed in the light theme, as Obsidian exports. */

export async function exportToPdf(app, file) {
  const text = await app.vault.cachedRead(file);
  const holder = h('div.print');
  document.body.appendChild(holder);
  const preview = new MarkdownPreview(app, { inlineTitle: true });
  holder.appendChild(preview.containerEl);
  const notice = new Notice('Preparing ' + file.basename + ' for printing…', 0);
  const body = document.body;
  const wasDark = body.classList.contains('theme-dark');
  try {
    if (wasDark) { body.classList.remove('theme-dark'); body.classList.add('theme-light'); app.workspace.trigger('css-change'); }
    await preview.set(text, file);
    await Promise.all(Array.from(holder.querySelectorAll('img')).map(img => img.decode ? img.decode().catch(() => {}) : null));
    await new Promise(r => setTimeout(r, 50));
  } finally { notice.hide(); }
  const title = document.title;
  document.title = file.basename;
  body.classList.add('is-printing');
  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    body.classList.remove('is-printing');
    document.title = title;
    holder.remove();
    preview.unload();
    if (wasDark) { body.classList.remove('theme-light'); body.classList.add('theme-dark'); app.workspace.trigger('css-change'); }
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  try { window.print(); }
  finally { if (!('onafterprint' in window)) setTimeout(cleanup, 1000); }
}
