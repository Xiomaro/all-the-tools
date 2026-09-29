/* Format converter: rewrite syntax from other apps into Obsidian's across
   the whole vault — Roam and Bear highlights, Roam TODO/DONE, Bear
   multi-word tags, Zettelkasten-style [[ID]] links and HTML entities.
   Code blocks and inline code are left alone. */

import { Modal, Setting, Notice, h, confirmDialog } from '../core/ui.js';

export const CONVERSIONS = [
  { id: 'roamHighlights', name: 'Roam highlights', desc: '^^highlight^^ becomes ==highlight==.',
    run: t => t.replace(/\^\^(?=\S)([^\n]*?\S)\^\^/g, '==$1==') },
  { id: 'roamTodos', name: 'Roam TODO and DONE', desc: '{{[[TODO]]}} and {{[[DONE]]}} become task list checkboxes.',
    run: t => t.replace(/^([ \t]*)(?:([-*+]|\d+[.)])[ \t]+)?\{\{\[\[(TODO|DONE)\]\]\}\}[ \t]*/gm,
      (m, indent, bullet, state) => indent + (bullet || '-') + ' [' + (state === 'DONE' ? 'x' : ' ') + '] ')
      .replace(/\{\{\[\[(TODO|DONE)\]\]\}\}/g, (m, state) => state === 'DONE' ? '[x]' : '[ ]') },
  /* "::text::" only, not "a::b" Dataview fields or "C::D". */
  { id: 'bearHighlights', name: 'Bear highlights', desc: '::highlight:: becomes ==highlight==.',
    run: t => t.replace(/(^|[^:\w])::(?=\S)([^\n:]*?\S)::(?![:\w])/g, '$1==$2==') },
  { id: 'bearTags', name: 'Bear multi-word tags', desc: '#multi word tag# becomes #multi-word-tag.',
    run: t => t.replace(/(^|\s)#([^\s#][^#\n]*?[^\s#\\])#(?=\s|$|[.,;:!?)])/g, (m, pre, tag) =>
      /\s/.test(tag) ? pre + '#' + tag.trim().replace(/\s+/g, '-') : m) },
  { id: 'zettelkastenLinks', name: 'Zettelkasten links', desc: '[[123]] links to "123 Some title" when the ID alone isn’t a note.',
    vault: true },
  { id: 'htmlEntities', name: 'HTML entities', desc: '&amp;, &nbsp;, &quot; and the like become the characters they stand for (&lt; and &gt; are kept).',
    run: t => t.replace(/&(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]{1,30});/gi, decodeEntity) }
];

const KEEP = new Set(['lt', 'gt', '#60', '#62', '#x3c', '#x3e']);
function decodeEntity(m, body) {
  if (KEEP.has(body.toLowerCase())) return m;
  const el = document.createElement('textarea');
  el.innerHTML = m;
  const v = el.value;
  return v === m ? m : v;
}

/* Apply fn to the prose parts of a note: not frontmatter, fenced code or
   inline code. */
export function mapProse(text, fn) {
  const lines = text.split('\n');
  const out = [];
  let chunk = [];
  let fence = null;
  let i = 0;
  const flush = () => { if (chunk.length) { out.push(mapInline(chunk.join('\n'), fn)); chunk = []; } };
  if (/^---\s*$/.test(lines[0] || '')) {
    const end = lines.findIndex((l, n) => n > 0 && /^(---|\.\.\.)\s*$/.test(l));
    if (end > 0) { out.push(lines.slice(0, end + 1).join('\n')); i = end + 1; }
  }
  for (; i < lines.length; i++) {
    const l = lines[i];
    const m = /^\s{0,3}(`{3,}|~{3,})/.exec(l);
    if (fence) {
      chunk.push(l);
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length && !l.trim().slice(m[1].length).trim()) { out.push(chunk.join('\n')); chunk = []; fence = null; }
      continue;
    }
    if (m) { flush(); fence = m[1]; chunk.push(l); continue; }
    chunk.push(l);
  }
  if (fence) { out.push(chunk.join('\n')); chunk = []; }
  flush();
  return out.join('\n');
}

function mapInline(text, fn) {
  return text.split(/(`+[^`\n]*?`+)/).map((part, i) => i % 2 ? part : fn(part)).join('');
}

/* [[123]] → [[123 Title]] where "123" isn't a note but exactly one note
   starts with "123 ". */
function zettelkasten(app, text) {
  return text.replace(/\[\[([0-9][0-9A-Za-z._-]*)(\|[^\]\n]*)?\]\]/g, (m, id, alias) => {
    if (app.metadataCache.getFirstLinkpathDest(id, '')) return m;
    const hits = app.vault.getMarkdownFiles().filter(f => f.basename.startsWith(id + ' '));
    return hits.length === 1 ? '[[' + hits[0].basename + (alias || '') + ']]' : m;
  });
}

export function convertText(app, text, enabled) {
  return mapProse(text, part => {
    for (const c of CONVERSIONS) {
      if (!enabled[c.id]) continue;
      part = c.vault ? zettelkasten(app, part) : c.run(part);
    }
    return part;
  });
}

class ConverterModal extends Modal {
  constructor(app) {
    super(app);
    this.setTitle('Format converter');
    this.modalEl.classList.add('mod-format-converter');
    this.enabled = Object.fromEntries(CONVERSIONS.map(c => [c.id, true]));
  }
  onOpen() {
    this.contentEl.append(h('p.setting-item-description', { text: 'Convert syntax from other apps in every note of this vault into Obsidian’s. Code blocks and inline code are left as they are.' }));
    for (const c of CONVERSIONS) {
      new Setting(this.contentEl).setName(c.name).setDesc(c.desc)
        .addToggle(t => t.setValue(this.enabled[c.id]).onChange(v => { this.enabled[c.id] = v; }));
    }
    this.contentEl.append(h('div.modal-button-container',
      h('button.mod-cta', { text: 'Start conversion', onclick: () => this.run() }),
      h('button', { text: 'Cancel', onclick: () => this.close() })));
  }
  async run() {
    const app = this.app;
    const ok = await confirmDialog(app, 'Convert the vault',
      'This rewrites every note that uses these formats. It can’t be undone here (File recovery keeps snapshots of notes you have opened), so make a backup first if you’re unsure.', 'Convert', true);
    if (!ok) return;
    let changed = 0;
    for (const file of app.vault.getMarkdownFiles()) {
      const text = await app.vault.read(file);
      const next = convertText(app, text, this.enabled);
      if (next !== text) { await app.vault.modify(file, next); changed++; }
    }
    this.close();
    new Notice(changed ? 'Converted ' + changed + ' note' + (changed === 1 ? '' : 's') + '.' : 'Nothing needed converting.');
  }
}

export default {
  id: 'markdown-importer',
  name: 'Format converter',
  description: 'Convert Markdown from other apps into Obsidian’s format.',
  async onload(plugin) {
    plugin.addCommand({ id: 'markdown-importer:open', name: 'Format converter: Open format converter', icon: 'wand-2',
      callback: () => new ConverterModal(plugin.app).open() });
  }
};
