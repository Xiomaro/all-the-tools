/* Footnotes view: the footnotes of the active note in the right sidebar,
   numbered as the reading view numbers them (order of first reference),
   rendered, and clickable to jump to the definition. Inline footnotes
   (^[...]) are listed too; definitions nothing refers to come last. */

import { View } from '../core/workspace.js';
import { h, debounce } from '../core/ui.js';
import { splitFrontmatter } from '../core/metadata.js';
import { followActiveFile, openFileAt } from '../panes/util.js';

export const VIEW_TYPE_FOOTNOTES = 'footnotes';

/* Blank out code, maths and comments so markers inside them don't count;
   lengths are kept so offsets still match. */
function mask(text) {
  const blank = s => s.replace(/[^\n]/g, ' ');
  return text
    .replace(/^( {0,3})(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n {0,3}\2[^\n]*|$)/gm, blank)
    .replace(/%%[\s\S]*?%%/g, blank)
    .replace(/\$\$[\s\S]*?\$\$/g, blank)
    .replace(/(`+)[^`\n][\s\S]*?\1/g, blank);
}

/* The footnotes of `text`: [{ label, id?, inline?, content, line, used }]. */
export function collectFootnotes(text) {
  const fm = splitFrontmatter(text);
  const start = fm ? fm.bodyStart : 0;
  const masked = text.slice(0, start).replace(/[^\n]/g, ' ') + mask(text.slice(start));
  const lines = text.split('\n');
  const lineAt = off => text.slice(0, off).split('\n').length - 1;

  /* Definitions, with their continuation lines. */
  const defs = new Map();
  const mlines = masked.split('\n');
  for (let i = 0; i < mlines.length; i++) {
    const m = /^\[\^([^\]\s]+)\]:[ \t]?/.exec(mlines[i]);
    if (!m || defs.has(m[1])) continue;
    const body = [lines[i].slice(m[0].length)];
    let j = i + 1;
    while (j < lines.length) {
      const l = lines[j];
      if (!l.trim()) {
        let k = j; while (k < lines.length && !lines[k].trim()) k++;
        if (k < lines.length && /^( {4}|\t)/.test(lines[k])) { for (; j < k; j++) body.push(''); continue; }
        break;
      }
      if (/^\[\^[^\]\s]+\]:/.test(l)) break;
      if (/^( {2,}|\t)/.test(l)) body.push(l.replace(/^( {1,4}|\t)/, ''));
      else if (/^ {0,3}(?:[#>]|[-*+][ \t]|\d{1,9}[.)][ \t]|```)/.test(l)) break;
      else body.push(l);
      j++;
    }
    defs.set(m[1], { id: m[1], content: body.join('\n').trim(), line: i, used: false });
  }

  /* References and inline footnotes, in order. */
  const out = [];
  const re = /\[\^([^\]\s]+)\](?!:)|\^\[/g;
  let m;
  while ((m = re.exec(masked))) {
    if (m[1] !== undefined) {
      const d = defs.get(m[1]);
      if (d && !d.used) { d.used = true; out.push(d); }
      continue;
    }
    /* ^[inline], brackets balanced. */
    let depth = 0, end = -1;
    for (let i = m.index + 1; i < text.length; i++) {
      const c = text[i];
      if (c === '\\') { i++; continue; }
      if (c === '[') depth++;
      else if (c === ']' && --depth === 0) { end = i; break; }
      else if (c === '\n' && text[i + 1] === '\n') break;
    }
    if (end < 0) continue;
    out.push({ inline: true, content: text.slice(m.index + 2, end), line: lineAt(m.index), used: true });
    re.lastIndex = end + 1;
  }
  out.forEach((f, i) => { f.label = String(i + 1); });
  for (const d of defs.values()) if (!d.used) { d.label = d.id; out.push(d); }
  return out;
}

class FootnotesView extends View {
  constructor(leaf) {
    super(leaf);
    this.icon = 'footprints';
    this.file = null;
    this.listEl = h('div.footnotes-view');
    this.contentEl.append(this.listEl);
    this.requestRender = debounce(() => this.render(), 250);
    this.follow = followActiveFile(this, f => { this.file = f && f.extension === 'md' ? f : null; this.render(); });
    this.registerEvent(this.app.metadataCache.on('changed', f => { if (f === this.file) this.requestRender(); }));
  }

  getViewType() { return VIEW_TYPE_FOOTNOTES; }
  getDisplayText() { return 'Footnotes'; }

  async onOpen() { this.follow.reset(); }

  async render() {
    const file = this.file;
    this.listEl.replaceChildren();
    if (!file) { this.listEl.appendChild(h('div.pane-empty', { text: 'No file is open.' })); return; }
    const text = this.app.vault.texts.get(file.path) ?? await this.app.vault.cachedRead(file);
    if (file !== this.file) return;
    const notes = collectFootnotes(text);
    if (!notes.length) { this.listEl.appendChild(h('div.pane-empty', { text: 'No footnotes in this note.' })); return; }
    for (const f of notes) {
      const content = h('div.footnote-view-item-content');
      const item = h('div.footnote-view-item' + (f.used ? '' : '.is-unused'), { title: f.inline ? 'Inline footnote' : '[^' + f.id + ']' },
        h('div.footnote-view-item-id', { text: f.label }), content);
      item.addEventListener('click', e => {
        if (e.target.closest('a')) return;
        openFileAt(this.app, file, { line: f.line }, false);
      });
      this.listEl.appendChild(item);
      if (this.app.markdown) {
        const body = h('div.markdown-rendered');
        content.appendChild(body);
        this.app.markdown.render(f.content, body, file.path, this, { fragment: true, noFrontmatter: true, lineOffset: f.line }).catch(err => console.error(err));
      } else content.textContent = f.content;
    }
  }
}

export default {
  id: 'footnotes',
  name: 'Footnotes view',
  description: 'Show the footnotes of the current note in the sidebar.',
  async onload(plugin) {
    const app = plugin.app;
    plugin.registerView(VIEW_TYPE_FOOTNOTES, leaf => new FootnotesView(leaf), { display: 'Footnotes', icon: 'footprints' });
    plugin.addCommand({
      id: 'footnotes:open',
      name: 'Show footnotes',
      icon: 'footprints',
      callback: () => app.workspace.ensureSideLeaf(VIEW_TYPE_FOOTNOTES, 'right', { active: true, reveal: true })
    });
  }
};
