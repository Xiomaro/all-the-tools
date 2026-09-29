/* Template variables and properties, shared by Templates, Daily notes,
   Unique note creator and Note composer. The variables are Obsidian's:
   {{title}}, {{date}}, {{time}}, {{date:FORMAT}}, {{time:FORMAT}} (moment
   formats), plus the {{date+1d}} offsets and {{yesterday}}/{{tomorrow}}
   that Daily notes templates commonly use. */

import { splitFrontmatter } from '../../core/metadata.js';
import yaml from '../../core/yaml.js';

const VAR_RE = /{{\s*(date|time|yesterday|tomorrow)\s*(?:([+-]\d+)\s*([yQMwdhms]))?\s*(?::([^}]*?))?\s*}}/gi;
const TITLE_RE = /{{\s*title\s*}}/gi;

/* Fill in a template's variables.
   opts: { title, date (moment or Date; the note's date, default now),
           dateFormat, timeFormat, vars: { name: value } for extra ones } */
export function fillTemplate(text, opts = {}) {
  const moment = window.moment;
  const base = opts.date ? moment(opts.date) : moment();
  const dateFormat = opts.dateFormat || 'YYYY-MM-DD';
  const timeFormat = opts.timeFormat || 'HH:mm';
  let out = String(text).replace(VAR_RE, (all, name, delta, unit, format) => {
    const key = name.toLowerCase();
    const d = base.clone();
    if (key === 'yesterday') d.subtract(1, 'day');
    if (key === 'tomorrow') d.add(1, 'day');
    if (delta) d.add(parseInt(delta, 10), unit);
    const fmt = format ? format : key === 'time' ? timeFormat : dateFormat;
    return d.format(fmt);
  });
  if (opts.title !== undefined) out = out.replace(TITLE_RE, () => opts.title);
  for (const k of Object.keys(opts.vars || {})) {
    out = out.replace(new RegExp('{{\\s*' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*}}', 'gi'), () => opts.vars[k]);
  }
  return out;
}

/* A template split into its properties and its body. */
export function splitTemplate(text) {
  const fm = splitFrontmatter(text);
  if (!fm || fm.error || !fm.data) return { data: null, body: text };
  return { data: fm.data, body: text.slice(fm.bodyStart) };
}

const LIST_KEYS = new Set(['tags', 'tag', 'aliases', 'alias', 'cssclasses', 'cssclass']);

/* Merge template properties into a note's, as Obsidian does when a
   template is inserted: new keys are added, lists are combined, and
   values the note already has are kept. Returns the note's new
   frontmatter block and the range it replaces, or null if nothing
   changes (so the note's own YAML is left exactly as written). */
export function mergeProperties(noteText, data) {
  if (!data || !Object.keys(data).length) return null;
  const fm = splitFrontmatter(noteText);
  if (fm && (fm.error || !fm.data)) return null;
  const current = fm ? fm.data : {};
  const merged = JSON.parse(JSON.stringify(current));
  for (const [k, v] of Object.entries(data)) {
    const has = Object.prototype.hasOwnProperty.call(merged, k) && merged[k] !== null && merged[k] !== '';
    if (!has) { merged[k] = v; continue; }
    const listy = Array.isArray(merged[k]) || Array.isArray(v) || LIST_KEYS.has(k.toLowerCase());
    if (listy) {
      const a = [].concat(merged[k] ?? []), b = [].concat(v ?? []);
      const union = a.slice();
      for (const x of b) if (!union.some(y => JSON.stringify(y) === JSON.stringify(x))) union.push(x);
      merged[k] = union;
    }
  }
  if (JSON.stringify(merged) === JSON.stringify(current)) return null;
  const block = '---\n' + yaml.dump(merged) + '---\n';
  return { text: block, from: 0, to: fm ? fm.bodyStart : 0 };
}

/* Merge a whole piece of text (template or another note) into a note's
   text at `offset`: properties merged, body inserted. For files that
   aren't open in an editor. */
export function insertIntoText(noteText, insertText, offset) {
  const { data, body } = splitTemplate(insertText);
  let text = noteText.slice(0, offset) + body + noteText.slice(offset);
  const props = mergeProperties(text, data);
  if (props) text = props.text + text.slice(props.to);
  return text;
}

/* The template a setting names ("Templates/Daily", with or without .md). */
export function findTemplateFile(app, path) {
  path = String(path || '').trim().replace(/^\/+/, '');
  if (!path) return null;
  return app.vault.getFileByPath(path) || app.vault.getFileByPath(path + '.md') ||
    app.metadataCache.getFirstLinkpathDest(path.replace(/\.md$/, ''), '');
}

/* Settings from .obsidian/<id>.json with defaults, read fresh each time so
   an edit made in Obsidian (or on disk) is picked up. */
export async function loadSettings(plugin, defaults) {
  const data = await plugin.loadData();
  return Object.assign({}, defaults, data && typeof data === 'object' ? data : {});
}
