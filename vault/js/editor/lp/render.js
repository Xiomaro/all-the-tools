/* Rendering helpers for live-preview widgets: maths (KaTeX), mermaid,
   HTML sanitising, callouts, and a small Markdown renderer used when the
   app's renderer (app.markdown) isn't available. Links inside rendered
   widgets are wired to open, hover-preview and search like Obsidian's. */

import { h, icon } from '../../core/ui.js';
import { Workspace } from '../../core/workspace.js';
import { IMAGE_EXT, AUDIO_EXT, VIDEO_EXT } from '../../core/vault.js';
import { parseLinktext } from '../../core/metadata.js';

const VENDOR = new URL('../../../../assets/vendor/', import.meta.url).href;

/* --- scripts ------------------------------------------------------------ */

const loading = new Map();
export function loadScript(src, globalName) {
  if (globalName && window[globalName]) return Promise.resolve(window[globalName]);
  if (loading.has(src)) return loading.get(src);
  const p = new Promise((resolve, reject) => {
    let s = Array.from(document.scripts).find(x => x.src === src);
    if (!s) { s = document.createElement('script'); s.src = src; s.async = true; document.head.appendChild(s); }
    s.addEventListener('load', () => resolve(globalName ? window[globalName] : true));
    s.addEventListener('error', () => { loading.delete(src); reject(new Error('Could not load ' + src)); });
    /* It may have finished loading before we listened. */
    if (globalName && window[globalName]) resolve(window[globalName]);
  });
  loading.set(src, p);
  return p;
}

/* --- maths --------------------------------------------------------------- */

/* A rendered formula. Uses the app renderer's renderMath when there is one,
   otherwise KaTeX (loaded on first use; the element fills in when ready and
   `onReady` is called so the editor can re-measure). */
export function renderMath(app, tex, display, onReady) {
  const md = app && app.markdown;
  if (md && typeof md.renderMath === 'function') {
    try {
      const el = md.renderMath(tex, display);
      if (el) {
        /* It fills in once KaTeX has loaded; re-measure after that. */
        if (!window.katex && onReady) Promise.resolve(md.loadMath ? md.loadMath() : null).then(() => setTimeout(onReady, 0), () => {});
        return el;
      }
    } catch (e) { /* fall back to KaTeX */ }
  }
  const el = h(display ? 'div' : 'span', { cls: 'math ' + (display ? 'math-block' : 'math-inline') });
  const draw = katex => {
    try { katex.render(tex, el, { displayMode: display, throwOnError: false, output: 'htmlAndMathml', trust: false, strict: 'ignore' }); el.classList.add('is-loaded'); }
    catch (e) { el.textContent = tex; el.classList.add('is-error'); }
  };
  if (window.katex) draw(window.katex);
  else {
    el.textContent = tex;
    loadScript(VENDOR + 'katex/katex.min.js', 'katex').then(k => { draw(k); onReady && onReady(); }, () => el.classList.add('is-error'));
  }
  return el;
}

/* --- mermaid ------------------------------------------------------------- */

let mermaidTheme = null, mermaidId = 0;
export async function renderMermaid(code, el) {
  const mermaid = await loadScript(VENDOR + 'mermaid/mermaid.min.js', 'mermaid');
  const theme = document.body.classList.contains('theme-dark') ? 'dark' : 'default';
  if (theme !== mermaidTheme) {
    mermaid.initialize({ startOnLoad: false, theme, securityLevel: 'strict', fontFamily: 'var(--font-text)' });
    mermaidTheme = theme;
  }
  try {
    const { svg } = await mermaid.render('lp-mermaid-' + (++mermaidId), code);
    el.innerHTML = svg;
  } catch (e) {
    el.replaceChildren(h('div.mermaid-error', { text: String(e && e.message || e).split('\n')[0] }));
    document.querySelectorAll('#dlp-mermaid-' + mermaidId + ', #lp-mermaid-' + mermaidId).forEach(n => n.remove());
  }
}

/* --- HTML ---------------------------------------------------------------- */

const DROP = new Set(['SCRIPT', 'STYLE', 'OBJECT', 'EMBED', 'APPLET', 'BASE', 'LINK', 'META', 'FORM', 'NOSCRIPT', 'TEMPLATE', 'FRAMESET', 'FRAME']);
const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'poster', 'background', 'data', 'cite']);

/* HTML written in a note, made safe to show: no scripts, event handlers,
   javascript: URLs or style sheets. Iframes keep working, sandboxed. */
export function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
  const walk = node => {
    for (const el of Array.from(node.children)) {
      if (DROP.has(el.tagName)) { el.remove(); continue; }
      for (const a of Array.from(el.attributes)) {
        const n = a.name.toLowerCase();
        if (n.startsWith('on') || n === 'srcdoc' || n === 'formaction') el.removeAttribute(a.name);
        else if (URL_ATTRS.has(n) && /^\s*(javascript|vbscript|data:text\/html)/i.test(a.value.replace(/[\u0000-\u0020]/g, ''))) el.removeAttribute(a.name);
      }
      if (el.tagName === 'IFRAME') {
        if (!/^https?:/i.test(el.getAttribute('src') || '')) { el.remove(); continue; }
        el.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-presentation');
      }
      if (el.tagName === 'A' && /^https?:/i.test(el.getAttribute('href') || '')) { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener nofollow'); el.classList.add('external-link'); }
      walk(el);
    }
  };
  walk(doc.body);
  const frag = document.createDocumentFragment();
  while (doc.body.firstChild) frag.appendChild(document.adoptNode(doc.body.firstChild));
  return frag;
}

/* --- links in rendered widgets ------------------------------------------- */

export function resolveLink(app, linkpath, sourcePath) {
  if (!app || !app.metadataCache) return null;
  const { path } = parseLinktext(linkpath);
  if (!path) return app.vault.getFileByPath(sourcePath) || null;
  return app.metadataCache.getFirstLinkpathDest(path, sourcePath);
}

export function isExternal(url) { return /^[a-z][a-z0-9+.-]*:/i.test(url); }

/* Link text as Obsidian shows it: "Note > Heading", "Note > ^block". */
export function linkDisplay(target) {
  const { path, subpath } = parseLinktext(target);
  const parts = subpath.split('#').filter(Boolean);
  return [path.replace(/\.md$/, '')].concat(parts).filter(Boolean).join(' > ');
}

/* Opening, hovering and tag clicks for links drawn inside a widget. */
export function wireLinks(root, ctx) {
  root.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a || !root.contains(a)) return;
    if (a.classList.contains('internal-link')) {
      e.preventDefault(); e.stopPropagation();
      ctx.open(a.dataset.href || a.getAttribute('href') || '', e);
    } else if (a.classList.contains('tag')) {
      e.preventDefault(); e.stopPropagation();
      ctx.searchTag(a.textContent);
    } else if (a.getAttribute('href')) {
      e.preventDefault(); e.stopPropagation();
      ctx.openExternal(a.getAttribute('href'));
    }
  });
  root.addEventListener('auxclick', e => {
    const a = e.target.closest('a.internal-link');
    if (a && e.button === 1) { e.preventDefault(); ctx.open(a.dataset.href || '', e); }
  });
  root.addEventListener('mouseover', e => {
    const a = e.target.closest('a.internal-link');
    if (a && root.contains(a) && !a.contains(e.relatedTarget)) ctx.hover(e, a, a.dataset.href || '');
  });
}

/* --- a small Markdown renderer (fallback) --------------------------------- */

const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* Inline Markdown to a fragment. Handles what notes use most: code, maths,
   wikilinks and embeds, links, images, emphasis, highlights, strikethrough,
   tags, footnote references and hard breaks. */
/* Placeholder for nodes built before the HTML pass (a private-use
   character, which the HTML parser leaves alone). */
const PH = '\uE000', PH_RE = /\uE000(\d+)\uE000/;

export function renderInline(text, ctx) {
  const holders = [];
  const hold = node => { holders.push(node); return PH + (holders.length - 1) + PH; };
  let s = text;
  s = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, t, code) => hold(h('code', { text: code.trim() })));
  s = s.replace(/%%[\s\S]*?%%/g, '');
  s = s.replace(/\$\$([^$]+)\$\$|\$([^\s$](?:[^$]*[^\s$])?)\$(?!\d)/g, (m, d, i) => hold(renderMath(ctx.app, d || i, false, ctx.remeasure)));
  s = s.replace(/!\[\[([^\[\]\n]+?)\]\]/g, (_, inner) => hold(embedNode(inner, ctx)));
  s = s.replace(/\[\[([^\[\]\n]+?)\]\]/g, (_, inner) => {
    const bar = inner.indexOf('|');
    const target = (bar < 0 ? inner : inner.slice(0, bar)).replace(/\\$/, '').trim();
    const label = bar < 0 ? linkDisplay(target) : inner.slice(bar + 1);
    return hold(internalLink(target, label, ctx));
  });
  s = s.replace(/!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g, (_, alt, url) => hold(imageNode(url, alt, ctx)));
  s = s.replace(/\[([^\]]+)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g, (_, label, url) => {
    if (isExternal(url)) return hold(h('a.external-link', { href: url, target: '_blank', rel: 'noopener nofollow' }, renderInline(label, ctx)));
    let path = url; try { path = decodeURI(url); } catch (e) { /* as written */ }
    return hold(internalLink(path, null, ctx, renderInline(label, ctx)));
  });
  s = s.replace(/\[\^([^\]\s]+)\]/g, (_, id) => hold(h('sup.footnote-ref', { text: id })));
  s = s.replace(/\^\[([^\]]+)\]/g, (_, t) => hold(h('sup.footnote-ref.footnote-inline', { title: t, text: '[*]' })));
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, pre, url) => pre + hold(h('a.external-link', { href: url, target: '_blank', rel: 'noopener nofollow', text: url })));
  s = s.replace(/(^|[\s(\[{,;:!?"'])#([\p{L}\p{N}\p{M}_\-/]*[\p{L}\p{M}_\-/][\p{L}\p{N}\p{M}_\-/]*)/gu, (_, pre, tag) => pre + hold(h('a.tag', { href: '#' + tag, text: '#' + tag })));
  let html = esc(s);
  html = html
    .replace(/\*\*\*(\S(?:[\s\S]*?\S)?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/(\*\*|__)(\S(?:[\s\S]*?\S)?)\1/g, '<strong>$2</strong>')
    .replace(/(^|[^*\w])\*(\S(?:[\s\S]*?\S)?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_\w])_(\S(?:[\s\S]*?\S)?)_(?![_\w])/g, '$1<em>$2</em>')
    .replace(/~~(\S(?:[\s\S]*?\S)?)~~/g, '<del>$1</del>')
    .replace(/==(\S(?:[\s\S]*?\S)?)==/g, '<mark>$1</mark>')
    .replace(/\\([\\`*_{}\[\]()#+\-.!|~=$%^&])/g, '$1')
    .replace(/\n/g, '<br>');
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const frag = tpl.content;
  /* Put the held nodes back. */
  const walker = document.createTreeWalker(frag, NodeFilter.SHOW_TEXT);
  const texts = [];
  while (walker.nextNode()) if (walker.currentNode.nodeValue.includes(PH)) texts.push(walker.currentNode);
  for (const tn of texts) {
    const parts = tn.nodeValue.split(PH_RE);
    const out = parts.map((p, i) => i % 2 ? holders[Number(p)] : document.createTextNode(p));
    tn.replaceWith(...out);
  }
  return frag;
}

function internalLink(target, label, ctx, content) {
  const file = resolveLink(ctx.app, target, ctx.sourcePath());
  return h('a.internal-link' + (file ? '' : '.is-unresolved'), { href: target, dataset: { href: target }, target: '_blank', rel: 'noopener' },
    content || label || linkDisplay(target));
}

/* Width and height from "|200" or "|200x100". */
export function parseSize(s) {
  const m = /^\s*(\d+)(?:\s*x\s*(\d+))?\s*$/.exec(s || '');
  return m ? { width: Number(m[1]), height: m[2] ? Number(m[2]) : null } : null;
}

export function imageNode(url, alt, ctx) {
  let caption = alt || '', size = null;
  const bar = caption.lastIndexOf('|');
  if (bar > -1 && parseSize(caption.slice(bar + 1))) { size = parseSize(caption.slice(bar + 1)); caption = caption.slice(0, bar); }
  else if (parseSize(caption)) { size = parseSize(caption); caption = ''; }
  const img = h('img', { alt: caption });
  if (size) { img.setAttribute('width', size.width); if (size.height) img.setAttribute('height', size.height); }
  if (isExternal(url)) img.src = url;
  else {
    let path = url; try { path = decodeURI(url); } catch (e) { /* as written */ }
    const file = resolveLink(ctx.app, path, ctx.sourcePath());
    if (file) ctx.app.vault.getResourceUrl(file).then(u => { img.src = u; ctx.remeasure && ctx.remeasure(); });
  }
  return h('span.internal-embed.media-embed.image-embed.is-loaded', { src: url, alt: caption }, img);
}

/* ![[x]] inside rendered widgets: images, audio and video directly, notes
   through the app renderer (or a link when it isn't there). */
export function embedNode(inner, ctx) {
  const bar = inner.indexOf('|');
  const target = (bar < 0 ? inner : inner.slice(0, bar)).trim();
  const alias = bar < 0 ? '' : inner.slice(bar + 1);
  const file = resolveLink(ctx.app, target, ctx.sourcePath());
  const ext = (file ? file.extension : (parseLinktext(target).path.split('.').pop() || '')).toLowerCase();
  if (IMAGE_EXT.has(ext)) {
    const size = parseSize(alias);
    const img = h('img', { alt: size ? '' : alias });
    if (size) { img.setAttribute('width', size.width); if (size.height) img.setAttribute('height', size.height); }
    if (file) ctx.app.vault.getResourceUrl(file).then(u => { img.src = u; ctx.remeasure && ctx.remeasure(); });
    return h('span.internal-embed.media-embed.image-embed' + (file ? '.is-loaded' : ''), { src: target, alt: alias }, img);
  }
  if (file && (AUDIO_EXT.has(ext) || VIDEO_EXT.has(ext))) {
    const media = h(AUDIO_EXT.has(ext) ? 'audio' : 'video', { controls: true });
    ctx.app.vault.getResourceUrl(file).then(u => { media.src = u; });
    return h('span.internal-embed.media-embed.is-loaded', { src: target }, media);
  }
  const el = h('span.internal-embed' + (file ? '.is-loaded' : '.file-embed.mod-empty'), { src: target, alt: alias });
  if (ctx.app && ctx.app.markdown && ctx.app.markdown.renderEmbed && file) {
    Promise.resolve(ctx.app.markdown.renderEmbed(target, el, ctx.sourcePath(), ctx.component)).then(() => ctx.remeasure && ctx.remeasure(), () => {});
  } else el.appendChild(internalLink(target, alias || null, ctx));
  return el;
}

/* Markdown into el with the app's renderer when there is one, otherwise
   the fallback below. */
export function renderMarkdown(ctx, md, el) {
  const r = ctx.app && ctx.app.markdown;
  if (r && typeof r.render === 'function') {
    return Promise.resolve(r.render(md, el, ctx.sourcePath(), ctx.component))
      .then(() => ctx.remeasure && ctx.remeasure(), e => { console.error(e); el.replaceChildren(); renderBlocks(md, el, ctx); });
  }
  renderBlocks(md, el, ctx);
  return Promise.resolve();
}

/* Block-level Markdown for callout bodies and embeds when app.markdown
   isn't there: headings, paragraphs, lists and tasks, quotes and callouts,
   code, maths blocks, tables and rules. */
export function renderBlocks(md, el, ctx) {
  const lines = md.replace(/\r/g, '').split('\n');
  let i = 0;
  const para = [];
  const flush = () => { if (para.length) { el.appendChild(h('p', renderInline(para.join('\n'), ctx))); para.length = 0; } };
  while (i < lines.length) {
    const line = lines[i];
    let m;
    if (!line.trim()) { flush(); i++; continue; }
    if ((m = /^\s*(`{3,}|~{3,})\s*([^\s`]*)/.exec(line))) {
      flush();
      const fence = m[1], lang = m[2];
      const code = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence)) code.push(lines[i++]);
      i++;
      el.appendChild(h('pre', { cls: lang ? 'language-' + lang : null }, h('code', { cls: lang ? 'language-' + lang : null, text: code.join('\n') })));
      continue;
    }
    if (/^\s*\$\$/.test(line)) {
      flush();
      const tex = [line.replace(/^\s*\$\$/, '')];
      let closed = /\$\$\s*$/.test(tex[0]) && tex[0].trim() !== '';
      if (closed) tex[0] = tex[0].replace(/\$\$\s*$/, '');
      i++;
      while (!closed && i < lines.length) {
        const l = lines[i++];
        if (/\$\$\s*$/.test(l)) { tex.push(l.replace(/\$\$\s*$/, '')); closed = true; } else tex.push(l);
      }
      el.appendChild(renderMath(ctx.app, tex.join('\n').trim(), true, ctx.remeasure));
      continue;
    }
    if ((m = /^(#{1,6})\s+(.*?)(\s+#+)?\s*$/.exec(line))) {
      flush();
      el.appendChild(h('h' + m[1].length, renderInline(m[2], ctx)));
      i++; continue;
    }
    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) { flush(); el.appendChild(h('hr')); i++; continue; }
    if (/^\s*>/.test(line)) {
      flush();
      const block = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) block.push(lines[i++]);
      const co = /^\s*>\s*\[!([^\]\s]*)\]([+-]?)\s*(.*)$/.exec(block[0]);
      if (co) el.appendChild(buildCallout(ctx, co[1], co[2], co[3], block.slice(1).map(l => l.replace(/^\s*> ?/, '')).join('\n')).el);
      else { const q = h('blockquote'); renderBlocks(block.map(l => l.replace(/^\s*> ?/, '')).join('\n'), q, ctx); el.appendChild(q); }
      continue;
    }
    if (/^\s*([-*+]|\d{1,9}[.)])\s/.test(line)) {
      flush();
      const block = [];
      while (i < lines.length && (/^\s*([-*+]|\d{1,9}[.)])\s/.test(lines[i]) || (/^\s+\S/.test(lines[i]) && block.length))) block.push(lines[i++]);
      el.appendChild(renderList(block, ctx));
      continue;
    }
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(lines[i + 1])) {
      flush();
      const block = [];
      while (i < lines.length && lines[i].includes('|')) block.push(lines[i++]);
      el.appendChild(h('div.table-wrapper', buildTable(block, ctx).table));
      continue;
    }
    para.push(line);
    i++;
  }
  flush();
}

function renderList(lines, ctx) {
  const root = { children: [], indent: -1 };
  const stack = [root];
  let last = null;
  for (const line of lines) {
    const m = /^(\s*)([-*+]|\d{1,9}[.)])\s+(\[(.)\]\s+)?(.*)$/.exec(line);
    if (!m) { if (last) last.text += '\n' + line.trim(); continue; }
    const indent = m[1].replace(/\t/g, '    ').length;
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1];
    const item = { ordered: /\d/.test(m[2]), start: parseInt(m[2], 10), task: m[4], text: m[5], children: [], indent };
    parent.children.push(item);
    stack.push(item);
    last = item;
  }
  const build = items => {
    const ordered = items[0] && items[0].ordered;
    const list = h(ordered ? 'ol' : 'ul', ordered && items[0].start !== 1 ? { start: items[0].start } : null);
    for (const it of items) {
      const li = h('li', it.task !== undefined ? { cls: 'task-list-item' + (it.task !== ' ' ? ' is-checked' : ''), dataset: { task: it.task } } : null);
      if (it.task !== undefined) li.appendChild(h('input.task-list-item-checkbox', { type: 'checkbox', checked: it.task !== ' ', disabled: true }));
      li.appendChild(renderInline(it.text, ctx));
      if (it.children.length) li.appendChild(build(it.children));
      list.appendChild(li);
    }
    return list;
  };
  return build(root.children);
}

/* --- tables --------------------------------------------------------------- */

/* Split a table row into cells with their offsets in the line. Pipes inside
   code spans and wikilinks, and escaped pipes, don't split. */
export function splitRow(line) {
  const cells = [];
  let i = 0, start = 0, code = 0, link = 0;
  const trimmed = line.replace(/\s+$/, '');
  let end = trimmed.length;
  while (i < end && /\s/.test(line[i])) i++;
  if (line[i] === '|') { i++; }
  start = i;
  if (trimmed.endsWith('|') && !trimmed.endsWith('\\|')) end--;
  for (; i < end; i++) {
    const c = line[i];
    if (c === '\\') { i++; continue; }
    if (c === '`') code = code ? 0 : 1;
    else if (!code && c === '[' && line[i + 1] === '[') { link++; i++; }
    else if (!code && c === ']' && line[i + 1] === ']' && link) { link--; i++; }
    else if (c === '|' && !code && !link) { cells.push(cell(line, start, i)); start = i + 1; }
  }
  cells.push(cell(line, start, end));
  return cells;
}
function cell(line, a, b) {
  const raw = line.slice(a, b);
  const lead = raw.length - raw.trimStart().length;
  return { text: raw.trim().replace(/\\\|/g, '|'), from: a + lead, to: a + lead + raw.trim().length };
}

/* A table from its source lines. Each cell records the offset of its text
   in the source (data-offset), so a click can put the cursor there. */
export function buildTable(lines, ctx) {
  const offsets = [];
  let off = 0;
  for (const l of lines) { offsets.push(off); off += l.length + 1; }
  const align = splitRow(lines[1] || '').map(c => /^:-+:$/.test(c.text) ? 'center' : /-:$/.test(c.text) ? 'right' : /^:-/.test(c.text) ? 'left' : null);
  const table = h('table');
  const row = (li, tag) => {
    const tr = h('tr');
    const cells = splitRow(lines[li]);
    const n = Math.max(align.length, 1);
    for (let c = 0; c < n; c++) {
      const cl = cells[c] || { text: '', from: lines[li].length, to: lines[li].length };
      const td = h(tag, { dataset: { offset: offsets[li] + cl.from, end: offsets[li] + cl.to } }, h('div.table-cell-wrapper', renderInline(cl.text, ctx)));
      if (align[c]) td.style.textAlign = align[c];
      tr.appendChild(td);
    }
    return tr;
  };
  table.appendChild(h('thead', row(0, 'th')));
  const body = h('tbody');
  for (let li = 2; li < lines.length; li++) body.appendChild(row(li, 'td'));
  table.appendChild(body);
  return { table };
}

/* --- callouts ------------------------------------------------------------- */

const CALLOUT_ICONS = {
  note: 'pencil', abstract: 'clipboard-list', summary: 'clipboard-list', tldr: 'clipboard-list',
  info: 'info', todo: 'check-circle-2', tip: 'flame', hint: 'flame', important: 'flame',
  success: 'check', check: 'check', done: 'check', question: 'help-circle', help: 'help-circle', faq: 'help-circle',
  warning: 'alert-triangle', caution: 'alert-triangle', attention: 'alert-triangle',
  failure: 'x', fail: 'x', missing: 'x', danger: 'zap', error: 'zap', bug: 'bug', example: 'list', quote: 'quote', cite: 'quote'
};

/* Obsidian's callout markup:
   .callout[data-callout][data-callout-fold] > .callout-title (.callout-icon,
   .callout-title-inner, .callout-fold) + .callout-content. */
export function buildCallout(ctx, type, fold, title, body) {
  const kind = (type || 'note').toLowerCase();
  const collapsible = fold === '+' || fold === '-';
  const el = h('div.callout', { dataset: { callout: kind, calloutMetadata: '', calloutFold: fold || '' } });
  if (collapsible) el.classList.add('is-collapsible');
  if (fold === '-') el.classList.add('is-collapsed');
  const iconEl = h('div.callout-icon', icon(CALLOUT_ICONS[kind] || 'pencil'));
  const titleEl = h('div.callout-title', iconEl,
    h('div.callout-title-inner', title ? renderInline(title, ctx) : kind.charAt(0).toUpperCase() + kind.slice(1)));
  el.appendChild(titleEl);
  if (collapsible) {
    const foldEl = h('div.callout-fold' + (fold === '-' ? '.is-collapsed' : ''), icon('chevron-down'));
    titleEl.appendChild(foldEl);
    titleEl.addEventListener('click', e => {
      if (e.target.closest('a')) return;
      e.preventDefault(); e.stopPropagation();
      const collapsed = el.classList.toggle('is-collapsed');
      foldEl.classList.toggle('is-collapsed', collapsed);
      ctx.remeasure && ctx.remeasure();
    });
    titleEl.addEventListener('mousedown', e => { if (!e.target.closest('a')) { e.preventDefault(); e.stopPropagation(); } });
  }
  const content = h('div.callout-content');
  if (body.trim()) { el.appendChild(content); renderMarkdown(ctx, body, content); }
  /* A snippet can give a custom callout type its icon with --callout-icon. */
  requestAnimationFrame(() => {
    if (!el.isConnected) return;
    const v = getComputedStyle(el).getPropertyValue('--callout-icon').trim().replace(/^["']|["']$/g, '');
    const name = v.replace(/^lucide-/, '');
    if (name && name !== (CALLOUT_ICONS[kind] || 'pencil')) iconEl.replaceChildren(icon(name));
  });
  return { el, content, body };
}
