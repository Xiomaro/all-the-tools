/* Embeds: ![[file]], ![[Note#Heading]], ![[Note#^block]], ![](file).

   Images, audio, video and PDFs show the file; notes show the note (or
   the heading's section, or the block) rendered, and follow the note as
   it changes. Other file types can draw their own embed by registering in
   app.embedRegistry (see builtin/reading.js); otherwise they get a card
   that opens the file. */

import { h, icon } from '../core/ui.js';
import { Workspace } from '../core/workspace.js';
import { IMAGE_EXT, AUDIO_EXT, VIDEO_EXT } from '../core/vault.js';
import { parseLinktext, parseMarkdown, resolveSubpath } from '../core/metadata.js';
import { renderMarkdown, parseSize, linkDisplayText, MAX_EMBED_DEPTH } from './markdown.js';

function decode(s) { try { return decodeURI(s); } catch (e) { return s; } }

const nl = s => (s.match(/\n/g) || []).length;

function dedent(text) {
  const lines = text.split('\n');
  const indents = lines.filter(l => l.trim()).map(l => /^[ \t]*/.exec(l)[0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return min ? lines.map(l => l.slice(Math.min(min, /^[ \t]*/.exec(l)[0].length))).join('\n') : text;
}

/* The part of `text` a subpath points at, with the line it starts on, or
   null when the heading or block isn't there. */
export function sliceSubpath(text, subpath) {
  if (!subpath) return { text, lineOffset: 0, whole: true };
  const r = resolveSubpath(parseMarkdown(text), subpath, text);
  if (!r) return null;
  let start = r.start;
  /* Blocks start at the beginning of their line. */
  if (r.type === 'block') start = text.lastIndexOf('\n', start - 1) + 1;
  const slice = text.slice(start, r.end).replace(/\s+$/, '');
  return { text: r.type === 'block' ? dedent(slice) : slice, lineOffset: nl(text.slice(0, start)), whole: false, type: r.type };
}

/* Render a note, or part of it, into `el` as Obsidian's embeds and hover
   previews do: .markdown-preview-view > .markdown-preview-sizer. */
export async function renderNoteInto(app, file, subpath, el, ctx) {
  const text = await app.vault.cachedRead(file);
  const part = sliceSubpath(text, subpath);
  /* Re-rendering into the same sizer releases the previous render. */
  let sizer = el.querySelector(':scope > .markdown-preview-view > .markdown-preview-sizer');
  if (!sizer) {
    sizer = h('div.markdown-preview-sizer.markdown-preview-section');
    el.replaceChildren(h('div.markdown-preview-view.markdown-rendered.show-indentation-guide', sizer));
  }
  if (!part) {
    if (sizer._vaultRender) { sizer._vaultRender.unload(); sizer._vaultRender = null; }
    sizer.replaceChildren(h('div.markdown-embed-missing', { text: 'Unable to find section ' + subpath + ' in ' + file.basename }));
    return false;
  }
  await renderMarkdown(app, part.text, sizer, file.path, ctx.component, {
    embedDepth: (ctx.depth || 0) + 1,
    ancestors: (ctx.ancestors || []).concat(file.path + (subpath || '')),
    noFrontmatter: true,
    fragment: !part.whole,
    lineOffset: part.lineOffset,
    hoverSource: ctx.hoverSource,
    hoverParent: ctx.hoverParent
  });
  return true;
}

/* A file that isn't there: say so, create it on click, and fill in the
   embed once it exists. */
function missing(app, span, linktext, ctx) {
  span.classList.add('file-embed', 'mod-empty', 'is-unresolved');
  const { path } = parseLinktext(decode(linktext));
  span.replaceChildren(h('div.file-embed-title',
    h('span.file-embed-icon', icon('file')),
    '"' + (path || linktext) + '" could not be found.'));
  const onClick = e => { e.preventDefault(); app.workspace.openLinkText(linktext, ctx.sourcePath, Workspace.leafFromEvent(e)); };
  span.addEventListener('click', onClick);
  const ref = app.metadataCache.on('resolved', () => {
    if (!span.isConnected || !app.metadataCache.getFirstLinkpathDest(path, ctx.sourcePath)) return;
    app.metadataCache.offref(ref);
    span.removeEventListener('click', onClick);
    span.className = 'internal-embed';
    span.replaceChildren();
    fillEmbed(app, span, ctx).catch(err => console.error(err));
  });
  ctx.component.registerEvent(ref);
}

function fileCard(app, span, file, linktext, sourcePath, iconName) {
  span.classList.add('file-embed', 'mod-generic');
  span.replaceChildren(h('div.file-embed-title',
    h('span.file-embed-icon', icon(iconName || 'file')),
    file.name));
  span.addEventListener('click', e => { e.preventDefault(); app.workspace.openLinkText(linktext, sourcePath, Workspace.leafFromEvent(e)); });
}

/* Fill a span.internal-embed[src][alt] made by the renderer. */
export async function fillEmbed(app, span, ctx) {
  const linktext = span.getAttribute('src') || '';
  const altRaw = span.getAttribute('alt');
  const { path, subpath } = parseLinktext(decode(linktext));
  const file = path ? app.metadataCache.getFirstLinkpathDest(path, ctx.sourcePath) : app.vault.getFileByPath(ctx.sourcePath);
  span.classList.add('is-loaded');
  if (!file) return missing(app, span, linktext, ctx);

  const ext = (file.extension || '').toLowerCase();
  const registry = app.embedRegistry;
  if (registry && registry.has(ext)) {
    span.classList.add(ext + '-embed');
    const fn = registry.get(ext);
    const info = { app, sourcePath: ctx.sourcePath, component: ctx.component, alt: altRaw, linktext, depth: ctx.depth || 0 };
    try {
      /* fn(file, el, subpath, sourcePath, component, info); a function of
         four parameters is fn(file, el, subpath, component). */
      if (fn.length === 4) await fn(file, span, subpath, ctx.component);
      else await fn(file, span, subpath, ctx.sourcePath, ctx.component, info);
    } catch (err) {
      console.error('[vault] embed for .' + ext + ' failed', err);
      fileCard(app, span, file, linktext, ctx.sourcePath);
    }
    return;
  }

  const { alt, width, height } = parseSize(altRaw || '');
  if (IMAGE_EXT.has(ext)) {
    span.classList.add('media-embed', 'image-embed');
    const img = h('img', { alt: alt || file.name, src: await app.vault.getResourceUrl(file) });
    if (width) img.setAttribute('width', width);
    if (height) img.setAttribute('height', height);
    span.replaceChildren(img);
    if (!span.hasAttribute('alt')) span.setAttribute('alt', file.name);
    if (width) span.setAttribute('width', width);
    return;
  }
  if (AUDIO_EXT.has(ext) && ext !== 'webm') {
    span.classList.add('media-embed', 'audio-embed');
    span.replaceChildren(h('audio', { controls: true, controlsList: 'nodownload', src: await app.vault.getResourceUrl(file) }));
    return;
  }
  if (VIDEO_EXT.has(ext)) {
    span.classList.add('media-embed', 'video-embed');
    const v = h('video', { controls: true, src: await app.vault.getResourceUrl(file) });
    if (width) v.setAttribute('width', width);
    span.replaceChildren(v);
    return;
  }
  if (ext === 'pdf') {
    span.classList.add('pdf-embed');
    const params = new URLSearchParams((subpath || '').replace(/^#/, ''));
    const page = params.get('page');
    const heightPx = params.get('height') || height;
    const frame = h('iframe', { src: (await app.vault.getResourceUrl(file)) + (page ? '#page=' + page : ''), title: file.name });
    if (heightPx) frame.style.height = heightPx + 'px';
    span.replaceChildren(frame);
    return;
  }
  if (ext === 'md') return markdownEmbed(app, span, file, subpath, linktext, ctx);
  if (ext === 'canvas') return fileCard(app, span, file, linktext, ctx.sourcePath, 'layout-dashboard');
  if (ext === 'base') return fileCard(app, span, file, linktext, ctx.sourcePath, 'table');
  return fileCard(app, span, file, linktext, ctx.sourcePath);
}

async function markdownEmbed(app, span, file, subpath, linktext, ctx) {
  span.classList.add('markdown-embed', 'inline-embed');
  if (!span.hasAttribute('alt')) span.setAttribute('alt', linkDisplayText(linktext));
  const title = h('div.embed-title.markdown-embed-title');
  if (!subpath && app.config.get('showInlineTitle') !== false) title.textContent = file.basename;
  const content = h('div.markdown-embed-content');
  const link = h('div.markdown-embed-link', { 'aria-label': 'Open link' }, icon('link'));
  link.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); app.workspace.openLinkText(linktext, ctx.sourcePath, Workspace.leafFromEvent(e)); });
  span.replaceChildren(title, content, link);

  const key = file.path + (subpath || '');
  const depth = ctx.depth || 0;
  if (depth >= MAX_EMBED_DEPTH || (ctx.ancestors || []).includes(key) || (!subpath && (ctx.ancestors || []).includes(file.path))) {
    content.appendChild(h('div.markdown-embed-missing', { text: 'This embed is nested too deeply to show.' }));
    return;
  }

  await renderNoteInto(app, file, subpath, content, ctx);

  /* Follow the note as it changes. */
  let timer = null;
  ctx.component.registerEvent(app.metadataCache.on('changed', f => {
    if (f !== file || !span.isConnected) return;
    clearTimeout(timer);
    timer = setTimeout(() => renderNoteInto(app, file, subpath, content, ctx), 100);
  }));
}
