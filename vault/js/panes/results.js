/* Search-style results grouped by file, as the search, backlinks and
   outgoing links panes show them: a collapsible file title with a count,
   then snippets of the lines that matched with the matches highlighted.

   Only the first files are drawn; more are added as the list scrolls, so
   thousands of results stay quick. */

import { h } from '../core/ui.js';
import { Workspace, FILE_MIME } from '../core/workspace.js';
import { lineOffsets } from '../core/metadata.js';
import { collapseIcon, setCollapsed, highlightText, displayName, openFileAt, hoverLink } from './util.js';

const FILE_CHUNK = 60;
const MATCH_LIMIT = 30;
const SNIPPET_MAX = 260;

/* Group matches into snippets: the line each is on (or a few lines round
   it with extra context), cut down round the match when a line is long. */
export function buildSnippets(text, matches, extraContext) {
  if (!matches || !matches.length || !text) return [];
  const ls = lineOffsets(text);
  const lineOf = off => { let lo = 0, hi = ls.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (ls[mid] <= off) lo = mid; else hi = mid - 1; } return lo; };
  const lineEnd = l => (l + 1 < ls.length ? ls[l + 1] - 1 : text.length);
  const out = [];
  for (const [s, e] of matches) {
    const l0 = lineOf(s), l1 = lineOf(Math.max(s, e - 1));
    let from = ls[Math.max(0, l0 - (extraContext ? 1 : 0))];
    let to = lineEnd(Math.min(ls.length - 1, l1 + (extraContext ? 1 : 0)));
    const last = out[out.length - 1];
    if (last && from <= last.end) {
      last.end = Math.max(last.end, to);
      last.matches.push([s, e]);
      continue;
    }
    out.push({ start: from, end: to, line: l0, matches: [[s, e]] });
  }
  /* Trim long snippets round their first match. */
  for (const sn of out) {
    const limit = extraContext ? SNIPPET_MAX * 2 : SNIPPET_MAX;
    if (sn.end - sn.start <= limit) continue;
    const first = sn.matches[0][0];
    if (first - sn.start > 80) { sn.start = first - 60; sn.cutStart = true; }
    if (sn.end - sn.start > limit) { sn.end = Math.max(sn.start + limit, Math.min(sn.end, sn.matches[0][1] + 40)); sn.cutEnd = true; }
  }
  return out;
}

export function renderSnippet(el, text, sn) {
  let body = text.slice(sn.start, sn.end);
  const lead = body.length - body.replace(/^\s+/, '').length;
  el.append(sn.cutStart ? '…' : '', highlightText(body.slice(lead), sn.matches, 'search-result-file-matched-text', sn.start + lead), sn.cutEnd ? '…' : '');
}

/* results: [{ file, matches, nameMatches, content, title?, extra? }] */
export class ResultList {
  constructor(app, opts = {}) {
    this.app = app;
    this.opts = opts;
    this.collapseAll = !!opts.collapseAll;
    this.extraContext = !!opts.extraContext;
    this.childrenEl = h('div.search-results-children');
    this.containerEl = h('div.search-result-container' + (opts.cls ? '.' + opts.cls : ''), this.childrenEl);
    this.results = [];
    this.shown = 0;
    this.toggled = new Set();   /* paths whose collapse state differs from the default */
    this.sentinel = h('div.search-results-more');
    this.observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(es => {
      if (es.some(e => e.isIntersecting)) this.renderMore();
    }) : null;
  }

  destroy() { if (this.observer) this.observer.disconnect(); }

  setResults(results) {
    this.results = results;
    this.shown = 0;
    this.childrenEl.replaceChildren();
    this.renderMore();
  }

  setOptions({ collapseAll, extraContext }) {
    if (collapseAll !== undefined && collapseAll !== this.collapseAll) { this.collapseAll = collapseAll; this.toggled.clear(); }
    if (extraContext !== undefined) this.extraContext = extraContext;
    this.setResults(this.results);
  }

  renderMore() {
    if (this.observer) this.observer.unobserve(this.sentinel);
    this.sentinel.remove();
    const end = Math.min(this.results.length, this.shown + FILE_CHUNK);
    const frag = document.createDocumentFragment();
    for (let i = this.shown; i < end; i++) frag.appendChild(this.renderResult(this.results[i]));
    this.shown = end;
    this.childrenEl.appendChild(frag);
    if (this.shown < this.results.length) {
      this.childrenEl.appendChild(this.sentinel);
      if (this.observer) this.observer.observe(this.sentinel);
      else this.sentinel.replaceChildren(h('div.search-result-hover-button', { text: 'Show more', onclick: () => this.renderMore() }));
    }
  }

  isCollapsed(r) { return this.collapseAll !== this.toggled.has(r.file.path); }

  renderResult(r) {
    const file = r.file;
    const title = r.title !== undefined ? r.title : displayName(file);
    const count = r.count !== undefined ? r.count : (r.matches || []).length;
    const hasMatches = !!(r.matches && r.matches.length) || !!r.extra;
    const collapsed = this.isCollapsed(r) && hasMatches;
    const titleEl = h('div.tree-item-inner', highlightText(title, r.nameMatches || []));
    const selfEl = h('div.tree-item-self.search-result-file-title.is-clickable', { draggable: 'true' },
      hasMatches ? collapseIcon(collapsed) : '', titleEl,
      count ? h('div.tree-item-flair-outer', h('span.tree-item-flair', { text: String(count) })) : '');
    if (r.cls) selfEl.classList.add(...r.cls.split(' '));
    const matchesEl = h('div.search-result-file-matches');
    const item = h('div.tree-item.search-result' + (collapsed ? '.is-collapsed' : ''), selfEl, matchesEl);
    const toggle = () => {
      const now = !item.classList.contains('is-collapsed');
      setCollapsed(item, now);
      if (this.toggled.has(file.path)) this.toggled.delete(file.path); else this.toggled.add(file.path);
      if (!now && !matchesEl.childElementCount) this.renderMatches(r, matchesEl);
      matchesEl.style.display = now ? 'none' : '';
    };
    selfEl.addEventListener('click', e => {
      if (e.target.closest('.collapse-icon')) { toggle(); return; }
      if (this.opts.onTitleClick) this.opts.onTitleClick(r, e);
      else openFileAt(this.app, file, null, Workspace.leafFromEvent(e));
    });
    selfEl.addEventListener('auxclick', e => { if (e.button === 1) { e.preventDefault(); openFileAt(this.app, file, null, 'tab'); } });
    selfEl.addEventListener('mouseover', e => hoverLink(this.app, e, this.opts.hoverSource || 'search', this, selfEl, file.path));
    selfEl.addEventListener('dragstart', e => {
      e.dataTransfer.setData(FILE_MIME, file.path);
      e.dataTransfer.setData('text/plain', this.app.fileManager.generateMarkdownLink(file, ''));
      e.dataTransfer.effectAllowed = 'copyMove';
    });
    if (this.opts.onTitleMenu) selfEl.addEventListener('contextmenu', e => this.opts.onTitleMenu(r, e));
    if (collapsed) matchesEl.style.display = 'none';
    else this.renderMatches(r, matchesEl);
    return item;
  }

  renderMatches(r, matchesEl, limit = MATCH_LIMIT) {
    matchesEl.replaceChildren();
    if (r.extra) matchesEl.appendChild(r.extra());
    const text = r.content || '';
    const snippets = buildSnippets(text, r.matches || [], this.extraContext);
    snippets.slice(0, limit).forEach(sn => {
      const el = h('div.search-result-file-match.tappable');
      renderSnippet(el, text, sn);
      el.addEventListener('click', e => {
        if (e.target.closest('button, .search-result-hover-button')) return;
        const m = sn.matches[0];
        const eState = { line: sn.line, match: { content: text, matches: sn.matches }, cursor: { from: m[0], to: m[1] } };
        if (this.opts.onMatchClick) this.opts.onMatchClick(r, sn, e, eState);
        else openFileAt(this.app, r.file, eState, Workspace.leafFromEvent(e));
      });
      if (this.opts.matchButton) { const b = this.opts.matchButton(r, sn); if (b) el.appendChild(b); }
      matchesEl.appendChild(el);
    });
    if (snippets.length > limit) {
      matchesEl.appendChild(h('div.search-result-file-match.search-result-show-more.tappable', { text: 'Show more (' + (snippets.length - limit) + ')',
        onclick: () => this.renderMatches(r, matchesEl, limit + 100) }));
    }
  }
}
