/* The editor's commands, with Obsidian's ids and names so hotkeys.json
   applies. Default hotkeys come from DEFAULT_HOTKEYS in core/commands.js,
   or from here for ids that table doesn't list. The command system handles
   the keys before CodeMirror does, so a vault's own hotkeys win. */

import {
  moveLineUp, moveLineDown, deleteLine, copyLineDown, addCursorAbove, addCursorBelow
} from '../../../assets/vendor/codemirror/codemirror.js';
import { MarkdownView } from './view.js';
import * as ed from './editing.js';
import { indentListItems } from './lists.js';
import { toggleFoldAtCursor, foldAllRanges, unfoldAllRanges, foldMore, foldLess } from './folding.js';
import { showMenuAtCursor } from './context-menu.js';
import { pickAttachments } from './clipboard.js';

export function registerEditorCommands(plugin) {
  const app = plugin.app;
  const foldOpts = () => ({ heading: !!app.config.get('foldHeading'), indent: !!app.config.get('foldIndent') });

  /* The note in the active tab, in either mode. */
  const current = () => {
    const leaf = app.workspace.activeLeaf && app.workspace.activeLeaf.isMain() ? app.workspace.activeLeaf : app.workspace.getMostRecentLeaf();
    const v = leaf && leaf.view;
    return v instanceof MarkdownView && v.file ? v : null;
  };
  const viewCmd = (id, name, icon, fn, hotkeys) => plugin.addCommand({
    id, name, icon, hotkeys,
    checkCallback: checking => { const v = current(); if (!v) return false; if (!checking) fn(v); return true; }
  });
  const edit = (id, name, icon, fn, hotkeys) => plugin.addCommand({
    id, name, icon, hotkeys,
    editorCallback: (editor, view) => fn(view.cm, view, editor)
  });
  const editCheck = (id, name, icon, fn, hotkeys) => plugin.addCommand({
    id, name, icon, hotkeys,
    editorCheckCallback: (checking, editor, view) => fn(checking, view.cm, view)
  });
  const hk = (mods, key) => [{ modifiers: mods, key }];

  /* Views and modes. */
  viewCmd('markdown:toggle-preview', 'Toggle reading view', 'book-open', v => v.toggleMode());
  viewCmd('editor:toggle-source', 'Toggle Live Preview/Source mode', 'code-2', v => { if (v.getMode() === 'preview') v.setMode('source'); v.toggleSource(); });
  viewCmd('editor:save-file', 'Save current file', 'save', v => { v.requestSave.cancel(); v.save(); });
  viewCmd('editor:open-search', 'Search current file', 'search', v => v.search.open(false));
  edit('editor:open-search-replace', 'Search & replace in current file', 'replace', (cm, v) => v.search.open(true));
  viewCmd('editor:focus', 'Focus on editor', 'text-cursor', v => { if (v.getMode() === 'preview') v.setMode('source'); v.cm.focus(); });
  viewCmd('editor:toggle-spellcheck', 'Toggle spellcheck', 'spell-check', () => app.config.set('spellcheck', !app.config.get('spellcheck')));
  viewCmd('editor:toggle-readable-line-length', 'Toggle readable line length', 'wrap-text', () => app.config.set('readableLineLength', !app.config.get('readableLineLength')));
  viewCmd('editor:toggle-line-numbers', 'Toggle line numbers', 'list-ordered', () => app.config.set('showLineNumber', !app.config.get('showLineNumber')));
  viewCmd('editor:toggle-inline-title', 'Toggle inline title', 'heading', () => app.config.set('showInlineTitle', app.config.get('showInlineTitle') === false));
  viewCmd('editor:toggle-vim', 'Toggle Vim key bindings', 'keyboard', () => app.config.set('vimMode', !app.config.get('vimMode')));

  /* Inline formatting. */
  edit('editor:toggle-bold', 'Toggle bold', 'bold', cm => ed.toggleMarker(cm, '**'));
  edit('editor:toggle-italics', 'Toggle italics', 'italic', cm => ed.toggleMarker(cm, '*'));
  edit('editor:toggle-strikethrough', 'Toggle strikethrough', 'strikethrough', cm => ed.toggleMarker(cm, '~~'));
  edit('editor:toggle-highlight', 'Toggle highlight', 'highlighter', cm => ed.toggleMarker(cm, '=='));
  edit('editor:toggle-code', 'Toggle code', 'code', cm => ed.toggleMarker(cm, '`'));
  edit('editor:toggle-inline-math', 'Toggle math', 'sigma', cm => ed.toggleMarker(cm, '$'));
  edit('editor:toggle-comments', 'Toggle comment', 'percent', cm => ed.toggleCommentCmd(cm));
  edit('editor:clear-formatting', 'Clear formatting', 'eraser', cm => ed.clearFormatting(cm));

  /* Paragraphs. */
  edit('editor:toggle-blockquote', 'Toggle blockquote', 'quote', cm => ed.toggleBlockquote(cm));
  edit('editor:toggle-bullet-list', 'Toggle bullet list', 'list', cm => ed.toggleBulletList(cm));
  edit('editor:toggle-numbered-list', 'Toggle numbered list', 'list-ordered', cm => ed.toggleNumberedList(cm));
  edit('editor:toggle-checklist-status', 'Toggle checkbox status', 'check-square', cm => ed.toggleChecklist(cm));
  edit('editor:cycle-list-checklist', 'Cycle bullet/checkbox', 'list-checks', cm => ed.cycleListChecklist(cm));
  edit('editor:set-heading-0', 'Remove heading', 'pilcrow', cm => ed.setHeading(cm, 0));
  for (let n = 1; n <= 6; n++) edit('editor:set-heading-' + n, 'Set as heading ' + n, 'heading-' + n, cm => ed.setHeading(cm, n));
  edit('editor:indent-list', 'Indent list', 'indent', cm => indentListItems(cm, 1, true), hk(['Mod'], ']'));
  edit('editor:unindent-list', 'Unindent list', 'outdent', cm => indentListItems(cm, -1, true), hk(['Mod'], '['));

  /* Inserting. */
  edit('editor:insert-link', 'Insert Markdown link', 'link-2', cm => ed.insertMarkdownLink(cm));
  edit('editor:insert-wikilink', 'Add internal link', 'link', (cm, v) => { ed.insertWikilink(cm, false); v.suggest.trigger(); });
  edit('editor:insert-embed', 'Add embed', 'file-input', (cm, v) => { ed.insertWikilink(cm, true); v.suggest.trigger(); });
  edit('editor:insert-tag', 'Add tag', 'tag', (cm, v) => {
    cm.dispatch(cm.state.replaceSelection('#'), { userEvent: 'input.type' });
    v.suggest.trigger();
  });
  edit('editor:insert-callout', 'Insert callout', 'quote', cm => ed.insertCallout(cm));
  edit('editor:insert-codeblock', 'Insert code block', 'code-2', cm => ed.insertCodeBlock(cm));
  edit('editor:insert-mathblock', 'Insert math block', 'sigma-square', cm => ed.insertMathBlock(cm));
  edit('editor:insert-table', 'Insert table', 'table', cm => ed.insertTable(cm));
  edit('editor:insert-horizontal-rule', 'Insert horizontal rule', 'minus', cm => ed.insertHorizontalRule(cm));
  edit('editor:insert-footnote', 'Insert footnote', 'footprints', cm => ed.insertFootnote(cm));
  edit('editor:attach-file', 'Insert attachment', 'paperclip', (cm, v) => pickAttachments(v));

  /* Lines and cursors. */
  edit('editor:swap-line-up', 'Move line up', 'arrow-up', cm => moveLineUp(cm));
  edit('editor:swap-line-down', 'Move line down', 'arrow-down', cm => moveLineDown(cm));
  edit('editor:delete-paragraph', 'Delete paragraph', 'trash', cm => deleteLine(cm));
  edit('editor:duplicate-line', 'Duplicate line', 'copy', cm => copyLineDown(cm));
  edit('editor:add-cursor-above', 'Add cursor above', 'text-cursor', cm => addCursorAbove(cm));
  edit('editor:add-cursor-below', 'Add cursor below', 'text-cursor', cm => addCursorBelow(cm));
  edit('editor:context-menu', 'Show context menu', 'menu', (cm, v) => showMenuAtCursor(v));

  /* Folding. */
  edit('editor:toggle-fold', 'Toggle fold on the current line', 'chevrons-down-up', cm => toggleFoldAtCursor(cm, foldOpts()));
  edit('editor:fold-all', 'Fold all headings and lists', 'chevrons-down-up', cm => foldAllRanges(cm, foldOpts()));
  edit('editor:unfold-all', 'Unfold all headings and lists', 'chevrons-up-down', cm => unfoldAllRanges(cm));
  edit('editor:fold-more', 'Fold more', 'chevrons-down-up', cm => foldMore(cm, foldOpts()));
  edit('editor:fold-less', 'Fold less', 'chevrons-up-down', cm => foldLess(cm, foldOpts()));

  /* Links. Mod+Enter on a task with no link ticks it, as in Obsidian. */
  const follow = where => (checking, cm, view) => {
    const info = ed.linkUnderCursor(cm.state);
    if (info) { if (!checking) view.openLink(info, where); return true; }
    if (where === 'tab') return ed.toggleTaskAtCursor(cm, checking);
    return false;
  };
  editCheck('editor:follow-link', 'Follow link under cursor', 'link', follow(false));
  editCheck('editor:open-link-in-new-leaf', 'Open link under cursor in new tab', 'file-plus', follow('tab'));
  editCheck('editor:open-link-in-new-split', 'Open link under cursor to the right', 'separator-vertical', follow('split'), hk(['Mod', 'Alt'], 'Enter'));
  editCheck('editor:open-link-in-new-window', 'Open link under cursor in new window', 'picture-in-picture-2', follow('window'), hk(['Mod', 'Alt', 'Shift'], 'Enter'));
}
