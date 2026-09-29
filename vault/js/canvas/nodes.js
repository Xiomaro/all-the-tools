/* What goes inside each kind of canvas node: text cards and notes
   rendered as Markdown (by app.markdown when it's there, plain text
   otherwise), images, PDFs, audio, video, other canvases, web pages in a
   frame, and group backgrounds. */

import { Component } from '../core/events.js';
import { h, icon } from '../core/ui.js';
import { resolveSubpath, splitFrontmatter } from '../core/metadata.js';
import { fileKind } from './data.js';

/* Renders Markdown with the app's renderer, or as plain text until there
   is one. */
export async function renderMarkdown(app, text, el, sourcePath, component, opts = {}) {
  el.replaceChildren();
  if (app.markdown && typeof app.markdown.render === 'function') {
    try { await app.markdown.render(text, el, sourcePath, component, opts); return; }
    catch (e) { console.warn('[canvas] rendering failed', e); el.replaceChildren(); }
  }
  el.appendChild(h('div.canvas-plain-text', { text }));
}

/* A key that changes whenever a node's content has to be drawn again. */
export function contentKey(app, node) {
  const parts = [node.type, node.text, node.file, node.subpath, node.url, node.background, node.backgroundStyle];
  if (node.type === 'file') {
    const f = node.file && app.vault.getFileByPath(node.file);
    parts.push(f ? 'y' + (f.stat && f.stat.mtime) + ':' + (f.stat && f.stat.size) : 'n');
  }
  if (node.type === 'group' && node.background) {
    const f = app.vault.getFileByPath(node.background);
    parts.push(f ? 'y' + (f.stat && f.stat.mtime) : 'n');
  }
  return JSON.stringify(parts);
}

/* The name shown above file and link nodes. */
export function nodeLabel(app, node) {
  if (node.type === 'file') {
    const f = node.file && app.vault.getFileByPath(node.file);
    const name = f ? (f.extension === 'md' ? f.basename : f.name) : String(node.file || '').split('/').pop().replace(/\.md$/, '');
    return name + (node.subpath || '');
  }
  if (node.type === 'link') return node.url || '';
  return '';
}

/* YouTube and Vimeo pages refuse to be framed; their embed players don't. */
export function embeddableUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtube.com' && u.pathname === '/watch' && u.searchParams.get('v')) return 'https://www.youtube.com/embed/' + u.searchParams.get('v');
    if (host === 'youtu.be' && u.pathname.length > 1) return 'https://www.youtube.com/embed/' + u.pathname.slice(1);
    if (host === 'vimeo.com' && /^\/\d+/.test(u.pathname)) return 'https://player.vimeo.com/video/' + u.pathname.slice(1);
    return u.protocol === 'http:' || u.protocol === 'https:' ? url : null;
  } catch (e) { return null; }
}

/* Fill nv.contentEl for nv.node. `board` supplies app, sourcePath, depth
   and the hooks for task checkboxes. */
export async function renderNodeContent(board, nv) {
  const app = board.app;
  const node = nv.node;
  if (nv.component) { nv.component.unload(); }
  nv.component = new Component();
  nv.component.load();
  const component = nv.component;
  const token = nv.renderToken = {};
  const stale = () => token !== nv.renderToken;
  const el = nv.contentEl;
  el.className = 'canvas-node-content';
  el.replaceChildren();

  if (node.type === 'text') {
    el.classList.add('markdown-embed');
    const view = h('div.markdown-preview-view.markdown-rendered.node-insert-event.show-indentation-guide');
    el.appendChild(h('div.markdown-embed-content.node-insert-event', view));
    const text = typeof node.text === 'string' ? node.text : '';
    await renderMarkdown(app, text, view, board.sourcePath, component, {
      embedDepth: board.depth + 1,
      onTaskToggle: (line, checked) => board.toggleTask(node, line, checked)
    });
    return;
  }

  if (node.type === 'link') {
    el.classList.add('canvas-link');
    const src = embeddableUrl(node.url || '');
    if (!src) { el.appendChild(placeholder('link', 'This link can’t be shown: ' + (node.url || '(no URL)'))); return; }
    /* Many sites send headers that stop them loading in a frame; the
       label above the node opens the page in a new browser tab. */
    el.appendChild(h('iframe.canvas-link-frame', {
      src, loading: 'lazy', referrerpolicy: 'no-referrer', title: node.url,
      sandbox: 'allow-scripts allow-same-origin allow-popups allow-forms allow-presentation',
      allow: 'fullscreen; picture-in-picture'
    }));
    return;
  }

  if (node.type === 'group') {
    el.classList.add('canvas-group-content');
    if (node.background) {
      const f = app.vault.getFileByPath(node.background);
      if (f) {
        const url = await app.vault.getResourceUrl(f);
        if (stale()) return;
        const style = node.backgroundStyle || 'cover';
        el.appendChild(h('div.canvas-group-background', { style: {
          backgroundImage: 'url("' + url + '")',
          backgroundSize: style === 'cover' ? 'cover' : style === 'ratio' ? 'contain' : 'auto',
          backgroundRepeat: style === 'repeat' ? 'repeat' : 'no-repeat',
          backgroundPosition: 'center'
        }, dataset: { style } }));
      }
    }
    return;
  }

  if (node.type !== 'file') {
    el.appendChild(placeholder('help-circle', 'Unknown card type “' + node.type + '”'));
    return;
  }

  const file = node.file && app.vault.getFileByPath(node.file);
  if (!file) {
    el.classList.add('is-unresolved');
    el.appendChild(placeholder('file-x', '“' + (node.file || '') + '” couldn’t be found.'));
    return;
  }
  const kind = fileKind(file.extension);
  el.dataset.kind = kind;

  if (kind === 'note') {
    el.classList.add('markdown-embed');
    const view = h('div.markdown-preview-view.markdown-rendered.node-insert-event.show-indentation-guide');
    el.appendChild(h('div.markdown-embed-content.node-insert-event', view));
    const full = await app.vault.cachedRead(file);
    if (stale()) return;
    let text = full, lineOffset = 0, sliced = false;
    if (node.subpath) {
      const range = resolveSubpath(app.metadataCache.getFileCache(file), node.subpath, full);
      if (range) {
        text = full.slice(range.start, range.end);
        lineOffset = full.slice(0, range.start).split('\n').length - 1;
        sliced = true;
      }
    }
    if (!sliced) {
      /* Properties aren't shown in a card, as in Obsidian. */
      const fm = splitFrontmatter(full);
      if (fm && fm.bodyStart) { lineOffset = full.slice(0, fm.bodyStart).split('\n').length - 1; text = full.slice(fm.bodyStart); }
    }
    await renderMarkdown(app, text, view, file.path, component, {
      embedDepth: board.depth + 1,
      noFrontmatter: true,
      onTaskToggle: (line, checked) => board.toggleTaskInFile(file, line + lineOffset, checked)
    });
    return;
  }

  if (kind === 'canvas') {
    el.classList.add('canvas-embed-content');
    if (board.depth >= 1 || file.path === board.sourcePath) {
      el.appendChild(placeholder('layout-dashboard', file.basename));
      return;
    }
    const { renderCanvasEmbed } = await import('./embed.js');
    if (stale()) return;
    await renderCanvasEmbed(app, file, el, { depth: board.depth + 1, component, interactive: false });
    return;
  }

  const url = await app.vault.getResourceUrl(file);
  if (stale()) return;
  if (kind === 'image') {
    el.classList.add('media-embed', 'image-embed');
    el.appendChild(h('img', { src: url, alt: file.name, draggable: 'false' }));
  } else if (kind === 'video') {
    el.classList.add('media-embed', 'video-embed');
    el.appendChild(h('video', { src: url, controls: true, preload: 'metadata' }));
  } else if (kind === 'audio') {
    el.classList.add('media-embed', 'audio-embed');
    el.appendChild(h('audio', { src: url, controls: true, preload: 'metadata' }));
  } else if (kind === 'pdf') {
    el.classList.add('pdf-embed');
    const page = /page=(\d+)/.exec(node.subpath || '');
    el.appendChild(h('iframe.canvas-pdf-frame', { src: url + (page ? '#page=' + page[1] : ''), title: file.name }));
  } else {
    el.appendChild(placeholder('file', file.name));
  }
}

function placeholder(iconName, text) {
  return h('div.canvas-node-placeholder', h('div.canvas-node-placeholder-icon', icon(iconName)), h('div.canvas-node-placeholder-text', { text }));
}
