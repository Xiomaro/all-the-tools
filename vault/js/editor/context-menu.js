/* The editor's right-click menu, laid out like Obsidian's: link actions
   when the click is on a link, Format / Paragraph / Insert submenus, then
   cut, copy, paste. Plugins add to it through the workspace's
   "editor-menu" event. Shift+right-click shows the browser's own menu,
   which has the spelling suggestions (a web page can't reach the
   system dictionary itself). */

import { EditorSelection } from '../../../assets/vendor/codemirror/codemirror.js';
import { Menu, h, icon, Notice } from '../core/ui.js';
import { linkUnderCursor } from './editing.js';
import { pasteFromClipboard } from './clipboard.js';

/* An item that opens a submenu on hover or click. `build(add, sep)` fills
   it: add(title, icon, callback). */
export function addSubmenu(menu, title, iconName, section, build) {
  menu.addItem(item => {
    item.setTitle(title).setIcon(iconName).setSection(section);
    item.dom.classList.add('has-submenu');
    item.dom.appendChild(h('div.menu-item-icon.mod-submenu', icon('chevron-right')));
    const open = () => {
      if (item.subEl && item.subEl.isConnected) return;
      menu.dom.querySelectorAll('.menu.mod-submenu').forEach(el => el.remove());
      const sub = h('div.menu.mod-submenu');
      const add = (t, ic, cb) => {
        const el = h('div.menu-item.tappable', { role: 'menuitem' }, h('div.menu-item-icon', ic ? icon(ic) : ''), h('div.menu-item-title', { text: t }));
        el.addEventListener('click', e => { e.stopPropagation(); menu.hide(); cb(); });
        sub.appendChild(el);
      };
      const sep = () => sub.appendChild(h('div.menu-separator'));
      build(add, sep);
      menu.dom.appendChild(sub);
      item.subEl = sub;
      const r = item.dom.getBoundingClientRect();
      const s = sub.getBoundingClientRect();
      let left = r.right + 2;
      if (left + s.width > window.innerWidth - 4) left = Math.max(4, r.left - s.width - 2);
      let top = r.top - 4;
      if (top + s.height > window.innerHeight - 4) top = Math.max(4, window.innerHeight - s.height - 4);
      sub.style.left = left + 'px';
      sub.style.top = top + 'px';
    };
    item.dom.addEventListener('mouseenter', open);
    item.dom.addEventListener('click', e => { e.stopImmediatePropagation(); open(); }, true);
  });
  if (!menu._submenuWatch) {
    menu._submenuWatch = true;
    menu.dom.addEventListener('mouseover', e => {
      const it = e.target.closest('.menu-item');
      if (!it || it.closest('.mod-submenu') || it.classList.contains('has-submenu')) return;
      menu.dom.querySelectorAll('.menu.mod-submenu').forEach(el => el.remove());
    });
  }
}

export function buildEditorMenu(view, menu) {
  const app = view.app;
  const cm = view.cm;
  const exec = id => () => app.commands.execute(id);
  const link = linkUnderCursor(cm.state);
  const sel = cm.state.selection.main;
  const selected = cm.state.sliceDoc(sel.from, sel.to);

  if (link && (link.type === 'internal' || link.type === 'external')) {
    const open = where => () => view.openLink(link, where);
    if (link.type === 'internal') {
      menu.addItem(i => i.setSection('link').setTitle('Open link').setIcon('file-symlink').onClick(open(false)));
      menu.addItem(i => i.setSection('link').setTitle('Open in new tab').setIcon('file-plus').onClick(open('tab')));
      menu.addItem(i => i.setSection('link').setTitle('Open to the right').setIcon('separator-vertical').onClick(open('split')));
    } else {
      menu.addItem(i => i.setSection('link').setTitle('Open link').setIcon('external-link').onClick(open(false)));
      menu.addItem(i => i.setSection('link').setTitle('Copy URL').setIcon('copy').onClick(() => copyText(link.link)));
    }
  }

  menu.addItem(i => i.setSection('insert-link').setTitle('Add link').setIcon('link').onClick(exec('editor:insert-wikilink')));
  menu.addItem(i => i.setSection('insert-link').setTitle('Add external link').setIcon('link-2').onClick(exec('editor:insert-link')));

  addSubmenu(menu, 'Format', 'type', 'format', (add, sep) => {
    add('Bold', 'bold', exec('editor:toggle-bold'));
    add('Italic', 'italic', exec('editor:toggle-italics'));
    add('Strikethrough', 'strikethrough', exec('editor:toggle-strikethrough'));
    add('Highlight', 'highlighter', exec('editor:toggle-highlight'));
    add('Code', 'code', exec('editor:toggle-code'));
    add('Math', 'sigma', exec('editor:toggle-inline-math'));
    add('Comment', 'percent', exec('editor:toggle-comments'));
    sep();
    add('Clear formatting', 'eraser', exec('editor:clear-formatting'));
  });
  addSubmenu(menu, 'Paragraph', 'pilcrow', 'format', (add, sep) => {
    add('Bullet list', 'list', exec('editor:toggle-bullet-list'));
    add('Numbered list', 'list-ordered', exec('editor:toggle-numbered-list'));
    add('Task list', 'list-checks', exec('editor:toggle-checklist-status'));
    sep();
    for (let n = 1; n <= 6; n++) add('Heading ' + n, 'heading-' + n, exec('editor:set-heading-' + n));
    add('Body', 'pilcrow', exec('editor:set-heading-0'));
    sep();
    add('Quote', 'quote', exec('editor:toggle-blockquote'));
  });
  addSubmenu(menu, 'Insert', 'plus', 'format', (add, sep) => {
    add('Footnote', 'footprints', exec('editor:insert-footnote'));
    add('Table', 'table', exec('editor:insert-table'));
    add('Callout', 'quote', exec('editor:insert-callout'));
    add('Horizontal rule', 'minus', exec('editor:insert-horizontal-rule'));
    sep();
    add('Code block', 'code-2', exec('editor:insert-codeblock'));
    add('Math block', 'sigma-square', exec('editor:insert-mathblock'));
  });

  menu.addItem(i => i.setSection('selection').setTitle('Cut').setIcon('scissors').setDisabled(!selected).onClick(() => {
    copyText(selected).then(ok => { if (ok) cm.dispatch(cm.state.replaceSelection(''), { userEvent: 'delete.cut' }); });
  }));
  menu.addItem(i => i.setSection('selection').setTitle('Copy').setIcon('copy').setDisabled(!selected).onClick(() => copyText(selected)));
  menu.addItem(i => i.setSection('selection').setTitle('Paste').setIcon('clipboard-paste').onClick(() => { cm.focus(); pasteFromClipboard(view, false); }));
  menu.addItem(i => i.setSection('selection').setTitle('Paste as plain text').setIcon('clipboard-type').onClick(() => { cm.focus(); pasteFromClipboard(view, true); }));
  menu.addItem(i => i.setSection('selection').setTitle('Select all').setIcon('text-select').onClick(() => {
    cm.focus();
    cm.dispatch({ selection: EditorSelection.range(0, cm.state.doc.length), userEvent: 'select' });
  }));

  app.workspace.trigger('editor-menu', menu, view.editor, view);
  return menu;
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) { new Notice('The browser blocked the clipboard.'); return false; }
}

/* Right-click in the editor. */
export function onContextMenu(view, e) {
  if (e.shiftKey) return false;
  const cm = view.cm;
  const pos = cm.posAtCoords({ x: e.clientX, y: e.clientY });
  if (pos != null && !cm.state.selection.ranges.some(r => pos >= r.from && pos <= r.to)) {
    cm.dispatch({ selection: EditorSelection.cursor(pos), userEvent: 'select.pointer' });
  }
  e.preventDefault();
  const menu = buildEditorMenu(view, new Menu());
  menu.onHide(() => { if (view.cm) view.cm.focus(); });
  menu.showAtMouseEvent(e);
  return true;
}

/* The "Show context menu" command: the menu at the cursor. */
export function showMenuAtCursor(view) {
  const cm = view.cm;
  const c = cm.coordsAtPos(cm.state.selection.main.head);
  const menu = buildEditorMenu(view, new Menu());
  menu.onHide(() => { if (view.cm) view.cm.focus(); });
  menu.showAtPosition({ x: c ? c.left : 100, y: c ? c.bottom + 4 : 100 });
}
