/* Commands that belong to the app and workspace rather than to a plugin:
   navigation, tabs and splits, sidebars, and file actions on the current
   note. Ids are Obsidian's. */

import { Workspace } from '../core/workspace.js';
import { Notice } from '../core/ui.js';

export function registerAppCommands(app) {
  const ws = app.workspace;
  const c = cmd => app.commands.add(cmd);
  const leaf = () => ws.getMostRecentLeaf();
  const fileCheck = fn => checking => {
    const f = ws.getActiveFile();
    if (!f) return false;
    if (!checking) fn(f);
    return true;
  };

  c({ id: 'app:go-back', name: 'Navigate back', icon: 'arrow-left', checkCallback: checking => {
    const l = leaf(); if (!l || !l.history.back.length) return false; if (!checking) l.goBack(); return true; } });
  c({ id: 'app:go-forward', name: 'Navigate forward', icon: 'arrow-right', checkCallback: checking => {
    const l = leaf(); if (!l || !l.history.forward.length) return false; if (!checking) l.goForward(); return true; } });

  c({ id: 'workspace:new-tab', name: 'New tab', icon: 'plus', callback: () => ws.newTab() });
  c({ id: 'workspace:close', name: 'Close current tab', icon: 'x', checkCallback: checking => {
    const l = ws.activeLeaf || leaf(); if (!l) return false; if (!checking) l.detach(); return true; } });
  c({ id: 'workspace:close-others', name: 'Close all other tabs', icon: 'x-circle', checkCallback: checking => {
    const l = leaf(); if (!l) return false;
    if (!checking) ws.mainLeaves().forEach(x => { if (x !== l && !x.pinned) x.detach(); });
    return true; } });
  c({ id: 'workspace:close-tab-group', name: 'Close this tab group', icon: 'x-square', checkCallback: checking => {
    const l = leaf(); if (!l) return false; if (!checking) l.parent.children.slice().forEach(x => x.detach()); return true; } });
  c({ id: 'workspace:undo-close-pane', name: 'Undo close tab', icon: 'rotate-ccw', checkCallback: checking => {
    if (!ws.closedTabs.length) return false;
    if (!checking) {
      const last = ws.closedTabs.pop();
      const group = last.group && last.group.parent ? last.group : ws.ensureRootGroup();
      const nl = ws.createLeafInGroup(group);
      nl.setViewState(Object.assign({}, last.state, { active: true }));
    }
    return true; } });

  const cycle = d => checking => {
    const l = leaf(); if (!l || l.parent.children.length < 2) return false;
    if (!checking) {
      const kids = l.parent.children;
      const next = kids[(kids.indexOf(l) + d + kids.length) % kids.length];
      ws.setActiveLeaf(next, { focus: true });
    }
    return true;
  };
  c({ id: 'workspace:next-tab', name: 'Go to next tab', checkCallback: cycle(1) });
  c({ id: 'workspace:previous-tab', name: 'Go to previous tab', checkCallback: cycle(-1) });
  for (let n = 1; n <= 8; n++) {
    c({ id: 'workspace:goto-tab-' + n, name: 'Go to tab #' + n, checkCallback: checking => {
      const l = leaf(); const t = l && l.parent.children[n - 1]; if (!t) return false;
      if (!checking) ws.setActiveLeaf(t, { focus: true }); return true; } });
  }
  c({ id: 'workspace:goto-last-tab', name: 'Go to last tab', checkCallback: checking => {
    const l = leaf(); if (!l) return false; if (!checking) ws.setActiveLeaf(l.parent.children[l.parent.children.length - 1], { focus: true }); return true; } });

  c({ id: 'workspace:split-vertical', name: 'Split right', icon: 'separator-vertical', checkCallback: checking => {
    const l = leaf(); if (!l) return false; if (!checking) ws.duplicateLeaf(l, 'vertical'); return true; } });
  c({ id: 'workspace:split-horizontal', name: 'Split down', icon: 'separator-horizontal', checkCallback: checking => {
    const l = leaf(); if (!l) return false; if (!checking) ws.duplicateLeaf(l, 'horizontal'); return true; } });
  c({ id: 'workspace:toggle-pin', name: 'Toggle pin', icon: 'pin', checkCallback: checking => {
    const l = leaf(); if (!l) return false; if (!checking) l.togglePinned(); return true; } });
  c({ id: 'workspace:move-to-new-window', name: 'Move current tab to new window', icon: 'picture-in-picture-2', checkCallback: checking => {
    const f = ws.getActiveFile(); if (!f) return false;
    if (!checking) new Notice('Pop-out windows aren’t available in the browser; the note stays in this tab.');
    return true; } });

  c({ id: 'app:toggle-left-sidebar', name: 'Toggle left sidebar', icon: 'panel-left', callback: () => ws.leftSplit.toggle() });
  c({ id: 'app:toggle-right-sidebar', name: 'Toggle right sidebar', icon: 'panel-right', callback: () => ws.rightSplit.toggle() });
  c({ id: 'app:toggle-ribbon', name: 'Toggle ribbon', callback: () => app.config.setAppearance('showRibbon', app.config.appearance('showRibbon') === false) });

  c({ id: 'workspace:edit-file-title', name: 'Rename file', icon: 'pencil', checkCallback: fileCheck(f => {
    const v = ws.getMostRecentLeaf().view;
    if (v && v.inlineTitleEl && v.inlineTitleEl.isConnected && v.getMode && v.getMode() === 'source') v.inlineTitleEl.focus();
    else app.promptRename(f);
  }) });
  c({ id: 'app:delete-file', name: 'Delete current file', icon: 'trash-2', checkCallback: fileCheck(f => app.fileManager.trashFile(f)) });
  c({ id: 'workspace:copy-path', name: 'Copy file path', icon: 'clipboard-copy', checkCallback: fileCheck(f => {
    navigator.clipboard.writeText(f.path).then(() => new Notice('Copied'), () => new Notice('The browser blocked the clipboard.'));
  }) });
  c({ id: 'workspace:copy-url', name: 'Copy Obsidian URL', icon: 'link', checkCallback: fileCheck(f => {
    const url = 'obsidian://open?vault=' + encodeURIComponent(app.vault.getName()) + '&file=' + encodeURIComponent(f.path.replace(/\.md$/, ''));
    navigator.clipboard.writeText(url).then(() => new Notice('Copied'), () => new Notice('The browser blocked the clipboard.'));
  }) });
  c({ id: 'file-explorer:reveal-active-file', name: 'Reveal current file in navigation', icon: 'locate', checkCallback: fileCheck(f => ws.trigger('reveal-file', f)) });
  c({ id: 'app:open-vault', name: 'Open another vault', icon: 'vault', callback: () => { location.href = location.pathname; } });
  c({ id: 'app:reload', name: 'Reload app without saving', icon: 'refresh-cw', callback: () => location.reload() });
  c({ id: 'app:open-help', name: 'Open help', icon: 'help-circle', callback: () => window.open('https://help.obsidian.md', '_blank', 'noopener') });
  c({ id: 'app:check-for-changes', name: 'Reload files changed on disk', icon: 'refresh-ccw', callback: () => app.syncNow && app.syncNow() });

  ws.addRibbonSetting('vault', 'Open another vault', () => app.commands.execute('app:open-vault'));
  ws.addRibbonSetting('help-circle', 'Help', () => app.commands.execute('app:open-help'));

  /* Middle-click and Ctrl-click on anything with data-href open links. */
  app.openLinkFromEvent = (linktext, sourcePath, e) => ws.openLinkText(linktext, sourcePath, Workspace.leafFromEvent(e));
}
