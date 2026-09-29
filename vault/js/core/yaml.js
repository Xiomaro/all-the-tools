/* YAML for frontmatter, .base files and the like. The core schema keeps
   dates as strings (as Obsidian does) rather than turning them into Date
   objects. */
import { load as yamlLoad, dump as yamlDump, CORE_SCHEMA } from '../../../assets/vendor/js-yaml/js-yaml.mjs';

const load = text => yamlLoad(text, { schema: CORE_SCHEMA });
const dump = (value, opts) => yamlDump(value, Object.assign({ schema: CORE_SCHEMA, lineWidth: -1, noRefs: true }, opts));

/* Frontmatter as Obsidian writes it: lists as "- item" blocks two spaces
   in, empty values as "key:", strings quoted (in double quotes) only when
   they must be. Keys whose value is unchanged from `raw` (the old YAML)
   keep their exact text, comments included, so editing one property
   doesn't reformat the others. */
export function dumpFrontmatter(data, raw) {
  const old = raw ? splitTopLevel(raw) : null;
  let out = '';
  for (const key of Object.keys(data)) {
    const b = old && old.get(key);
    out += b && sameValue(b.value, data[key]) ? b.text : dumpKey(key, data[key]);
  }
  return out;
}

/* Map key -> { text, value } for each top-level key of a YAML mapping, or
   null if it can't be split safely (then everything is rewritten). */
function splitTopLevel(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  const blocks = [];
  let pending = [], cur = null;
  for (const line of lines) {
    if (/^\s*(#.*)?$/.test(line) && !(cur && /^\s+\S/.test(line))) {
      /* Blank lines and comments belong to the key that follows. */
      if (cur) { blocks.push(cur); cur = null; }
      pending.push(line);
    } else if (/^\s/.test(line) || /^- /.test(line) || line === '-') {
      if (!cur) return null;
      cur.lines.push(line);
    } else {
      if (cur) blocks.push(cur);
      cur = { lines: pending.concat([line]) };
      pending = [];
    }
  }
  if (cur) blocks.push(cur);
  const map = new Map();
  for (const b of blocks) {
    const text = b.lines.join('\n') + '\n';
    let parsed;
    try { parsed = load(text); } catch (e) { return null; }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const keys = Object.keys(parsed);
    if (keys.length !== 1 || map.has(keys[0])) return null;
    map.set(keys[0], { text, value: parsed[keys[0]] });
  }
  return map;
}

function sameValue(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

function dumpKey(key, v) {
  const k = plainSafe(key) ? key : JSON.stringify(key);
  if (v === null || v === undefined) return k + ':\n';
  if (Array.isArray(v)) {
    if (!v.length) return k + ': []\n';
    return k + ':\n' + v.map(item => isScalar(item) && !multiline(item)
      ? '  - ' + scalar(item) + '\n'
      : indent(dump([item]), 2)).join('');
  }
  if (typeof v === 'object') {
    if (!Object.keys(v).length) return k + ': {}\n';
    return k + ':\n' + indent(dump(v), 2);
  }
  if (multiline(v)) return dump({ [key]: v });
  return k + ': ' + scalar(v) + '\n';
}

function isScalar(v) { return v === null || typeof v !== 'object'; }
function multiline(v) { return typeof v === 'string' && /[\n\r]/.test(v); }
function indent(text, n) { return text.replace(/^(?=.)/gm, ' '.repeat(n)); }

function scalar(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return plainSafe(v) ? v : JSON.stringify(v);
  if (typeof v === 'number' && !isFinite(v)) return dump(v).trim();
  return String(v);
}

/* A string can go unquoted if it reads back as the same string. */
function plainSafe(s) {
  if (typeof s !== 'string' || !s || s !== s.trim()) return false;
  if (/^[\[\]{}#&*!|>'"%@`,?:]|^- |^-$|[\t\n\r]|: |:$| #/.test(s)) return false;
  try {
    const back = load('k: ' + s);
    return !!back && back.k === s;
  } catch (e) { return false; }
}

export default { load, dump, dumpFrontmatter };
