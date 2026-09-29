/* Suggestions under a text box, like Obsidian's AbstractInputSuggest: the
   folder and file pickers on plugin settings pages. */

import { h, fuzzyMatch, highlighted } from '../../core/ui.js';

/* attachInputSuggest(inputEl, query => [string], onPick?)
   Choosing a suggestion sets the box and fires its input event, so a
   Setting's onChange sees it. */
export function attachInputSuggest(inputEl, getItems, onPick) {
  let box = null, items = [], selected = 0;

  const close = () => { if (box) { box.remove(); box = null; } };
  const pick = i => {
    const v = items[i];
    if (v === undefined) return;
    inputEl.value = v.value;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    close();
    if (onPick) onPick(v.value);
  };
  const select = i => {
    if (!box || !items.length) return;
    selected = (i + items.length) % items.length;
    Array.from(box.firstChild.children).forEach((el, n) => el.classList.toggle('is-selected', n === selected));
    const el = box.firstChild.children[selected];
    if (el) el.scrollIntoView({ block: 'nearest' });
  };
  const open = () => {
    const q = inputEl.value;
    const all = getItems(q) || [];
    items = [];
    for (const value of all) {
      const m = q ? fuzzyMatch(q, value) : { score: 0, matches: [] };
      if (m) items.push({ value, m });
    }
    if (q) items.sort((a, b) => b.m.score - a.m.score);
    items = items.slice(0, 100);
    if (!items.length) { close(); return; }
    if (!box) {
      box = h('div.suggestion-container.mod-search-suggestion', h('div.suggestion'));
      box.addEventListener('mousedown', e => e.preventDefault());
      document.body.appendChild(box);
    }
    const list = box.firstChild;
    list.replaceChildren(...items.map((it, i) => {
      const el = h('div.suggestion-item', highlighted(it.value, it.m.matches));
      el.addEventListener('mousemove', () => { if (selected !== i) select(i); });
      el.addEventListener('click', () => pick(i));
      return el;
    }));
    const r = inputEl.getBoundingClientRect();
    box.style.left = r.left + 'px';
    box.style.top = (r.bottom + 4) + 'px';
    box.style.minWidth = r.width + 'px';
    selected = 0;
    select(0);
  };

  inputEl.addEventListener('focus', open);
  inputEl.addEventListener('input', e => { if (e.isTrusted) open(); });
  inputEl.addEventListener('blur', close);
  inputEl.addEventListener('keydown', e => {
    if (!box) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); select(selected + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); select(selected - 1); }
    else if (e.key === 'Enter' || e.key === 'Tab') { if (items.length) { e.preventDefault(); pick(selected); } }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
  });
  return { close };
}

export function folderSuggest(app, inputEl) {
  return attachInputSuggest(inputEl, () => app.vault.getAllFolders(false).map(f => f.path).sort((a, b) => a.localeCompare(b)));
}

/* Notes, shown and stored without ".md" as Obsidian's settings do. */
export function noteSuggest(app, inputEl, filter) {
  return attachInputSuggest(inputEl, () => app.vault.getMarkdownFiles()
    .filter(f => !filter || filter(f))
    .map(f => f.path.replace(/\.md$/, '')).sort((a, b) => a.localeCompare(b)));
}
