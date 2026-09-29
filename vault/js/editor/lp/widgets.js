/* The widgets live preview draws in place of Markdown source: checkboxes,
   rules, images, maths, code-block flair, and block widgets for tables,
   callouts, maths blocks, mermaid, code-block processors, HTML and note
   embeds. Markup follows what Obsidian produces so themes apply. */

import { WidgetType, EditorSelection } from '../../../../assets/vendor/codemirror/codemirror.js';
import { h, icon, Notice } from '../../core/ui.js';
import { Component } from '../../core/events.js';
import { IMAGE_EXT, AUDIO_EXT, VIDEO_EXT } from '../../core/vault.js';
import { parseLinktext } from '../../core/metadata.js';
import {
  renderMath, renderMermaid, sanitizeHtml, wireLinks, buildTable, buildCallout, renderMarkdown, renderInline,
  resolveLink, isExternal, parseSize, linkDisplay
} from './render.js';

/* A per-widget context: the editor's ctx plus a component that owns what
   the rendering registers, and a way to ask the editor to re-measure once
   async content (images, maths, mermaid, embeds) arrives. */
function widgetCtx(ctx, view, dom) {
  const component = new Component();
  component.load();
  dom._lpComponent = component;
  return Object.assign(Object.create(ctx), {
    component,
    remeasure: () => { if (dom.isConnected) view.requestMeasure(); }
  });
}

function unloadDom(dom) {
  if (dom && dom._lpComponent) { dom._lpComponent.unload(); dom._lpComponent = null; }
}

/* --- inline -------------------------------------------------------------- */

export class CheckboxWidget extends WidgetType {
  constructor(ch) { super(); this.ch = ch; }
  eq(o) { return o.ch === this.ch; }
  toDOM(view) {
    const input = h('input.task-list-item-checkbox', { type: 'checkbox', checked: this.ch !== ' ', dataset: { task: this.ch } });
    const label = h('label.task-list-label', { contenteditable: 'false' }, input);
    input.addEventListener('mousedown', e => e.preventDefault());
    input.addEventListener('click', e => {
      e.preventDefault();
      const pos = view.posAtDOM(label);
      const cur = view.state.sliceDoc(pos + 1, pos + 2);
      if (view.state.sliceDoc(pos, pos + 1) !== '[') return;
      view.dispatch({ changes: { from: pos + 1, to: pos + 2, insert: cur === ' ' ? 'x' : ' ' }, userEvent: 'input.task' });
    });
    return label;
  }
  ignoreEvent() { return true; }
}

export class HrWidget extends WidgetType {
  eq() { return true; }
  toDOM() { return h('hr', { cls: 'cm-hr-widget' }); }
  ignoreEvent() { return false; }
}

export class ExternalLinkIcon extends WidgetType {
  constructor(url) { super(); this.url = url; }
  eq(o) { return o.url === this.url; }
  toDOM() { return h('span.external-link', { 'aria-hidden': 'true' }); }
  ignoreEvent() { return false; }
}

/* " > " between a note and its heading in a rendered wikilink. */
export class SubpathSeparator extends WidgetType {
  eq() { return true; }
  toDOM() { return h('span.cm-lp-subpath-sep', { text: ' > ' }); }
  ignoreEvent() { return false; }
}

export class InlineMathWidget extends WidgetType {
  constructor(ctx, tex) { super(); this.ctx = ctx; this.tex = tex; }
  eq(o) { return o.tex === this.tex; }
  toDOM(view) {
    const el = renderMath(this.ctx.app, this.tex, false, () => view.requestMeasure());
    el.classList.add('cm-math-widget');
    return el;
  }
  ignoreEvent() { return false; }
}

/* Inline HTML (<span style>…</span>, <br>, <kbd>…) when not being edited. */
export class HtmlInlineWidget extends WidgetType {
  constructor(html) { super(); this.html = html; }
  eq(o) { return o.html === this.html; }
  toDOM() { return h('span.cm-html-embed', sanitizeHtml(this.html)); }
  ignoreEvent() { return false; }
}

/* The language label on a code block; a click copies the code. */
export class CodeFlairWidget extends WidgetType {
  constructor(lang, code) { super(); this.lang = lang; this.code = code; }
  eq(o) { return o.lang === this.lang && o.code === this.code; }
  toDOM() {
    const el = h('span.code-block-flair', { 'aria-label': 'Copy', text: this.lang || '' });
    if (!this.lang) el.appendChild(icon('copy'));
    el.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
    el.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      navigator.clipboard.writeText(this.code).then(() => new Notice('Copied to clipboard'), () => new Notice('Could not copy'));
    });
    return el;
  }
  ignoreEvent() { return true; }
}

/* ![[image.png|200]] and ![alt|200](url). */
export class ImageWidget extends WidgetType {
  constructor(ctx, src, alt, size, file) { super(); this.ctx = ctx; this.src = src; this.alt = alt; this.size = size; this.path = file ? file.path : null; this.file = file; }
  eq(o) { return o.src === this.src && o.alt === this.alt && o.path === this.path && JSON.stringify(o.size) === JSON.stringify(this.size); }
  toDOM(view) {
    const img = h('img', { alt: this.alt || '' });
    if (this.size) { img.setAttribute('width', this.size.width); if (this.size.height) img.setAttribute('height', this.size.height); }
    const el = h('span.internal-embed.media-embed.image-embed', { src: this.src, alt: this.alt || '', contenteditable: 'false' }, img);
    img.addEventListener('load', () => view.requestMeasure());
    if (isExternal(this.src)) { img.src = this.src; el.classList.add('is-loaded'); }
    else if (this.file) {
      this.ctx.app.vault.getResourceUrl(this.file).then(u => { img.src = u; el.classList.add('is-loaded'); }, () => {});
    } else {
      el.classList.add('mod-empty');
      el.replaceChildren(h('span.cm-lp-missing', { text: '“' + this.src + '” could not be found.' }));
    }
    return el;
  }
  get estimatedHeight() { return this.size && this.size.height ? this.size.height : -1; }
  ignoreEvent() { return false; }
}

/* --- blocks ---------------------------------------------------------------- */

/* A block rendered in place of its source. A click inside (outside links,
   checkboxes and buttons) puts the cursor in the source, which shows it. */
class BlockWidget extends WidgetType {
  constructor(ctx, source) { super(); this.ctx = ctx; this.source = source; }
  eq(o) { return o.constructor === this.constructor && o.source === this.source && o.key === this.key; }
  get key() { return ''; }
  toDOM(view) {
    const dom = this.container();
    dom.setAttribute('contenteditable', 'false');
    const ctx = widgetCtx(this.ctx, view, dom);
    try { this.render(dom, ctx, view); }
    catch (e) { console.error(e); dom.replaceChildren(h('div.cm-lp-error', { text: String(e && e.message || e) })); }
    wireLinks(dom, ctx);
    if (this.editButton) {
      const btn = h('div.edit-block-button', { 'aria-label': 'Edit this block' }, icon('code-2'));
      btn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
      btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); this.select(view, view.posAtDOM(dom), null); });
      dom.appendChild(btn);
    }
    dom.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      const t = e.target;
      if (t.closest('audio, video, iframe, textarea, select, input:not([type="checkbox"])')) return;
      /* Keep the browser from moving the selection into the widget (the
         editor would then show the source); clicks still reach links,
         checkboxes, fold arrows and buttons. */
      e.preventDefault();
      if (t.closest('a, input, button, .callout-fold, .is-collapsible > .callout-title, .edit-block-button, .markdown-embed-link, .copy-code-button')) return;
      this.select(view, view.posAtDOM(dom), e);
    });
    return dom;
  }
  container() { return h('div.cm-embed-block'); }
  get editButton() { return true; }
  /* Where a click puts the cursor: by default the end of the first line. */
  select(view, from, e) {
    const line = view.state.doc.lineAt(from);
    view.dispatch({ selection: EditorSelection.cursor(line.to), scrollIntoView: false, userEvent: 'select.pointer' });
    view.focus();
  }
  destroy(dom) { unloadDom(dom); }
  ignoreEvent() { return true; }
  get estimatedHeight() { return Math.max(1, this.source.split('\n').length) * 26; }
}

export class TableWidget extends BlockWidget {
  container() { return h('div.cm-embed-block.cm-table-widget.markdown-rendered'); }
  render(dom, ctx) {
    const lines = this.source.split('\n');
    const { table } = buildTable(lines, ctx);
    table.classList.add('table-editor');
    dom.appendChild(h('div.table-wrapper', table));
  }
  /* A click on a cell puts the cursor at the end of that cell's text. */
  select(view, from, e) {
    const td = e && e.target.closest && e.target.closest('td, th');
    if (td && td.dataset.end) {
      const pos = Math.min(from + Number(td.dataset.end), view.state.doc.length);
      view.dispatch({ selection: EditorSelection.cursor(pos), userEvent: 'select.pointer' });
      view.focus();
      return;
    }
    super.select(view, from, e);
  }
  get estimatedHeight() { return (this.source.split('\n').length - 1) * 37 + 8; }
}

export class CalloutWidget extends BlockWidget {
  constructor(ctx, source, m) { super(ctx, source); this.m = m; }
  container() { return h('div.cm-embed-block.markdown-rendered.cm-callout'); }
  render(dom, ctx, view) {
    const md = ctx.app && ctx.app.markdown;
    const fallback = () => {
      const lines = this.source.split('\n');
      const body = lines.slice(1).map(l => l.replace(/^[ \t]*> ?/, '')).join('\n');
      dom.insertBefore(buildCallout(ctx, this.m[1], this.m[2], this.m[3], body).el, dom.firstChild);
    };
    if (!md || typeof md.renderCallout !== 'function') return fallback();
    /* The reading-view renderer draws it, so both views match; it renders
       into a scratch element and the callout moves into the widget. */
    const scratch = document.createElement('div');
    Promise.resolve(md.renderCallout(scratch, this.source, ctx.sourcePath(), ctx.component)).then(el => {
      if (!el) return fallback();
      dom.insertBefore(el, dom.firstChild);
      if (md.callouts && md.callouts.activate) md.callouts.activate(el);
      view.requestMeasure();
    }).catch(e => { console.error(e); fallback(); });
  }
  /* The title puts the cursor on the first line; the body on the second. */
  select(view, from, e) {
    const doc = view.state.doc, first = doc.lineAt(from);
    if (e && !(e.target.closest && e.target.closest('.callout-title')) && first.number < doc.lines) {
      const second = doc.line(first.number + 1);
      if (/^\s*>/.test(second.text)) {
        view.dispatch({ selection: EditorSelection.cursor(second.to), userEvent: 'select.pointer' });
        view.focus();
        return;
      }
    }
    super.select(view, from, e);
  }
  get estimatedHeight() { return this.m[2] === '-' ? 44 : 44 + (this.source.split('\n').length - 1) * 26; }
}

export class MathBlockWidget extends BlockWidget {
  constructor(ctx, source, tex, preview) { super(ctx, source); this.tex = tex; this.preview = preview; }
  get key() { return this.preview ? 'p' : ''; }
  container() { return h('div.math.math-block.cm-embed-block' + (this.preview ? '.cm-math-preview' : '')); }
  get editButton() { return !this.preview; }
  render(dom, ctx, view) {
    const el = renderMath(ctx.app, this.tex, true, () => view.requestMeasure());
    dom.appendChild(el);
  }
  select(view, from, e) {
    if (this.preview) return;
    super.select(view, from, e);
  }
  get estimatedHeight() { return 60; }
}

export class MermaidWidget extends BlockWidget {
  constructor(ctx, source, code) { super(ctx, source); this.code = code; }
  container() { return h('div.cm-embed-block.cm-lang-mermaid'); }
  render(dom, ctx, view) {
    const el = h('div.mermaid');
    dom.appendChild(el);
    const md = ctx.app && ctx.app.markdown;
    const run = md && typeof md.renderMermaid === 'function' ? md.renderMermaid(this.code, el) : renderMermaid(this.code, el);
    Promise.resolve(run).then(() => view.requestMeasure(), e => { el.textContent = String(e && e.message || e); });
  }
  get estimatedHeight() { return 200; }
}

/* A fenced block handled by a plugin's code-block processor. */
export class ProcessorWidget extends BlockWidget {
  constructor(ctx, source, lang, code) { super(ctx, source); this.lang = lang; this.code = code; }
  container() { return h('div.cm-embed-block.cm-lang-' + this.lang.replace(/[^\w-]/g, '')); }
  render(dom, ctx, view) {
    const el = h('div.block-language-' + this.lang.replace(/[^\w-]/g, ''));
    dom.appendChild(el);
    const fn = ctx.app.codeBlockProcessors.get(this.lang);
    const cache = ctx.app.metadataCache && ctx.view && ctx.view.file ? ctx.app.metadataCache.getFileCache(ctx.view.file) : null;
    const pctx = {
      docId: 'lp', sourcePath: ctx.sourcePath(), frontmatter: cache && cache.frontmatter,
      addChild: c => ctx.component.addChild(c), getSectionInfo: () => null
    };
    Promise.resolve().then(() => fn(this.code, el, pctx)).then(() => view.requestMeasure(), e => {
      console.error(e);
      el.replaceChildren(h('div.cm-lp-error', { text: String(e && e.message || e) }));
    });
  }
}

export class HtmlBlockWidget extends BlockWidget {
  container() { return h('div.cm-embed-block.cm-html-embed'); }
  render(dom) { dom.appendChild(sanitizeHtml(this.source)); }
}

/* ![[Note]], ![[Note#Heading]], ![[file.pdf]] on a line of its own. */
export class EmbedWidget extends BlockWidget {
  constructor(ctx, source, target, alias, version) { super(ctx, source); this.target = target; this.alias = alias; this.version = version; }
  get key() { return String(this.version); }
  container() { return h('div.cm-embed-block.cm-lp-embed'); }
  get editButton() { return false; }
  render(dom, ctx, view) {
    const app = ctx.app, sourcePath = ctx.sourcePath();
    const file = resolveLink(app, this.target, sourcePath);
    if (app.markdown && typeof app.markdown.renderEmbed === 'function') {
      const linktext = this.target + (this.alias ? '|' + this.alias : '');
      Promise.resolve(app.markdown.renderEmbed(linktext, dom, sourcePath, ctx.component)).then(() => view.requestMeasure(), e => console.error(e));
      return;
    }
    /* No renderer yet: draw the embed ourselves. */
    const ext = file ? file.extension.toLowerCase() : '';
    const el = h('div.internal-embed', { src: this.target, alt: this.alias || '', tabindex: '-1' });
    dom.appendChild(el);
    if (!file) {
      el.classList.add('file-embed', 'mod-empty');
      el.appendChild(h('div.file-embed-title', icon('file-question'), h('span', { text: '“' + parseLinktext(this.target).path + '” is not created yet. Click to create it.' })));
      el.addEventListener('click', e => { e.preventDefault(); ctx.open(this.target, e); });
      return;
    }
    if (AUDIO_EXT.has(ext) || VIDEO_EXT.has(ext)) {
      el.classList.add('media-embed', 'is-loaded');
      const media = h(AUDIO_EXT.has(ext) ? 'audio' : 'video', { controls: true });
      app.vault.getResourceUrl(file).then(u => { media.src = u; });
      el.appendChild(media);
      return;
    }
    if (ext === 'pdf') {
      el.classList.add('pdf-embed', 'is-loaded');
      const frame = h('iframe', { style: { width: '100%', height: '600px', border: '0' } });
      app.vault.getResourceUrl(file).then(u => { frame.src = u; });
      el.appendChild(frame);
      return;
    }
    if (ext !== 'md') {
      el.classList.add('file-embed', 'is-loaded');
      el.appendChild(h('div.file-embed-title', icon('file'), h('span', { text: file.name })));
      el.addEventListener('click', e => { e.preventDefault(); ctx.open(this.target, e); });
      return;
    }
    el.classList.add('markdown-embed', 'inline-embed', 'is-loaded');
    const link = h('div.markdown-embed-link', { 'aria-label': 'Open link' }, icon('link'));
    link.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
    link.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); ctx.open(this.target, e); });
    const content = h('div.markdown-embed-content');
    const inner = h('div.markdown-preview-view.markdown-rendered');
    content.appendChild(inner);
    el.append(h('div.embed-title.markdown-embed-title'), content, link);
    import('../../core/metadata.js').then(async ({ parseMarkdown, resolveSubpath, splitFrontmatter }) => {
      let text = await app.vault.cachedRead(file);
      const { subpath } = parseLinktext(this.target);
      if (subpath) {
        const cache = app.metadataCache.getFileCache(file) || parseMarkdown(text);
        const r = resolveSubpath(cache, subpath, text);
        text = r ? text.slice(r.start, r.end) : '';
        if (r && r.type === 'block') text = text.replace(/\s\^[A-Za-z0-9-]+\s*$/, '');
      } else {
        const fm = splitFrontmatter(text);
        if (fm) text = text.slice(fm.bodyStart);
      }
      renderMarkdown(ctx, text, inner);
      view.requestMeasure();
    }).catch(e => console.error(e));
  }
  get estimatedHeight() { return 120; }
}

export { IMAGE_EXT, parseSize, linkDisplay, renderInline };
