/* Files: the tree, sorting, new notes and folders, rename, move, copy,
   delete, multi-select, drag and drop, import, keyboard and menus. */
module.exports = async ({ page, assert }) => {
  const tree = () => page.evaluate(() => [...document.querySelectorAll('.nav-files-container .tree-item-self[data-path]')]
    .filter(e => e.offsetParent !== null).map(e => e.dataset.path));
  const wait = ms => page.waitForTimeout(ms || 150);

  await page.waitForSelector('.nav-files-container .nav-file-title');
  const first = await page.evaluate(() => ({
    rows: [...document.querySelectorAll('.nav-files-container > div > .nav-folder.mod-root > .nav-folder-children > .tree-item > .tree-item-self')].map(e => e.textContent),
    tag: document.querySelector('.nav-file-title[data-path="pixel.png"] .nav-file-tag').textContent,
    mdTagHidden: !document.querySelector('.nav-file-title[data-path="Welcome.md"] .nav-file-tag'),
    state: app.workspace.getLeavesOfType('file-explorer')[0].getViewState().state
  }));
  assert.deepStrictEqual(first.rows.slice(0, 5), ['Archive', 'Attachments', 'Daily', 'Projects', 'Templates'], 'folders first: ' + first.rows);
  assert.ok(first.rows.includes('Welcome') && first.rows.includes('Ideas'), '.md is hidden from names');
  assert.strictEqual(first.tag, 'png');
  assert.ok(first.mdTagHidden);
  assert.strictEqual(first.state.sortOrder, 'alphabetical');

  /* Unsupported files appear only with "Detect all file extensions". */
  await page.evaluate(() => app.vault.create('notes.xyz', 'data'));
  await wait();
  assert.ok(!(await tree()).includes('notes.xyz'), 'unsupported file hidden');
  await page.evaluate(() => app.config.set('showUnsupportedFiles', true));
  await wait();
  assert.ok((await tree()).includes('notes.xyz'), 'shown when showUnsupportedFiles is on');
  await page.evaluate(() => app.config.set('showUnsupportedFiles', false));

  /* Excluded files are greyed. */
  await page.evaluate(() => app.config.set('userIgnoreFilters', ['Templates/']));
  await wait();
  assert.ok(await page.evaluate(() => document.querySelector('.nav-folder-title[data-path="Templates"]').classList.contains('is-excluded')));
  await page.evaluate(() => app.config.set('userIgnoreFilters', []));

  /* Sort order lives in the view state. */
  await page.evaluate(() => app.workspace.getLeavesOfType('file-explorer')[0].setViewState({ type: 'file-explorer', state: { sortOrder: 'alphabeticalReverse' } }));
  await wait();
  const rev = await tree();
  assert.strictEqual(rev[0], 'Templates', 'Z to A: ' + rev);
  assert.strictEqual(rev[5], 'Welcome.md');
  await page.evaluate(() => app.workspace.getLeavesOfType('file-explorer')[0].view.setSortOrder('alphabetical'));

  /* Opening a note highlights it; clicking a folder expands it. */
  await page.click('.nav-folder-title[data-path="Projects"]');
  await wait();
  await page.click('.nav-file-title[data-path="Projects/Project Alpha.md"]');
  await page.waitForFunction(() => (app.workspace.getActiveFile() || {}).path === 'Projects/Project Alpha.md');
  assert.ok(await page.evaluate(() => document.querySelector('.nav-file-title[data-path="Projects/Project Alpha.md"]').classList.contains('is-active')));

  /* New note: Untitled.md at the root (newFileLocation: root), opened. */
  await page.evaluate(() => app.commands.execute('file-explorer:new-file'));
  await page.waitForFunction(() => app.vault.getFileByPath('Untitled.md') && (app.workspace.getActiveFile() || {}).path === 'Untitled.md');
  await wait();
  assert.ok(await page.evaluate(() => !!document.querySelector('.nav-file-title[data-path="Untitled.md"].is-active')));
  await page.evaluate(() => app.commands.execute('file-explorer:new-file'));
  await page.waitForFunction(() => !!app.vault.getFileByPath('Untitled 1.md'));

  /* Inline rename: F2, type, Enter. */
  await wait(200);
  await page.evaluate(() => { const v = app.workspace.getLeavesOfType('file-explorer')[0].view; v.setFocus(app.vault.getFileByPath('Untitled.md')); v.filesEl.focus(); });
  await page.keyboard.press('F2');
  await page.waitForFunction(() => document.activeElement && document.activeElement.matches('.nav-file-title-content[contenteditable]'));
  await page.keyboard.type('Renamed note');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !!app.vault.getFileByPath('Renamed note.md'));
  await wait();
  assert.ok((await tree()).includes('Renamed note.md'));

  /* Escape cancels a rename. */
  await page.evaluate(() => app.workspace.getLeavesOfType('file-explorer')[0].view.startRename(app.vault.getFileByPath('Untitled 1.md')));
  await page.waitForFunction(() => document.activeElement && document.activeElement.matches('.nav-file-title-content[contenteditable]'));
  await page.keyboard.type('Nope');
  await wait(50);
  await page.keyboard.press('Escape');
  await wait();
  assert.ok(await page.evaluate(() => !!app.vault.getFileByPath('Untitled 1.md') && !app.vault.getFileByPath('Nope.md')));

  /* New folder, then move a note into it by dragging. */
  const folderPath = await page.evaluate(async () => {
    const f = await app.plugins.get('file-explorer').newFolder(app.vault.getRoot());
    return f.path;
  });
  assert.strictEqual(folderPath, 'Untitled');
  await page.waitForFunction(() => document.activeElement && document.activeElement.matches('.nav-folder-title-content[contenteditable]'));
  await page.keyboard.type('Box');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !!app.vault.getFolder('Box'));
  await page.evaluate(() => {
    const dt = new DataTransfer();
    const src = document.querySelector('.nav-file-title[data-path="Renamed note.md"]');
    src.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    window.__dragTypes = [...dt.types];
    window.__dragText = dt.getData('text/plain');
    const target = document.querySelector('.nav-folder-title[data-path="Box"]');
    target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    window.__hover = target.parentElement.classList.contains('is-being-dragged-over');
    target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    src.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }));
  });
  await page.waitForFunction(() => !!app.vault.getFileByPath('Box/Renamed note.md'));
  const drag = await page.evaluate(() => ({ types: window.__dragTypes, text: window.__dragText, hover: window.__hover }));
  assert.ok(drag.types.includes('application/x-vault-file'), 'drag carries the file for tabs and the editor');
  assert.strictEqual(drag.text, '[[Renamed note]]', 'and a link as text');
  assert.ok(drag.hover, 'target folder highlighted while dragging');
  assert.deepStrictEqual(await page.evaluate(() => app.workspace.leftSplit.children.map(g => g.activeLeaf.view.getViewType())), ['file-explorer'], 'the drop stays in the explorer');

  /* Moving keeps links working (the fixture updates links automatically). */
  await page.evaluate(async () => {
    await app.plugins.get('file-explorer').moveInto([app.vault.getFileByPath('Ideas.md')], app.vault.getFolder('Box'));
    await new Promise(r => setTimeout(r, 200));
  });
  const welcome = await page.evaluate(() => app.vault.adapter.read('Welcome.md'));
  assert.ok(await page.evaluate(() => !!app.vault.getFileByPath('Box/Ideas.md')));
  assert.ok(welcome.includes('[[Ideas#Big ideas]]'), 'links still resolve (shortest form)');

  /* Make a copy. */
  await page.evaluate(() => app.plugins.get('file-explorer').duplicate(app.vault.getFileByPath('Box/Ideas.md')));
  await page.waitForFunction(() => !!app.vault.getFileByPath('Box/Ideas 1.md'));

  /* Multi-select with Ctrl-click and Shift-click, then delete together. */
  await page.evaluate(() => app.workspace.getLeavesOfType('file-explorer')[0].view.revealFile(app.vault.getFileByPath('Box/Ideas.md')));
  await wait();
  await page.click('.nav-file-title[data-path="Box/Ideas.md"]');
  await page.click('.nav-file-title[data-path="Box/Renamed note.md"]', { modifiers: ['Shift'] });
  const sel = await page.evaluate(() => [...document.querySelectorAll('.nav-file-title.is-selected')].map(e => e.dataset.path));
  assert.deepStrictEqual(sel.sort(), ['Box/Ideas 1.md', 'Box/Ideas.md', 'Box/Renamed note.md'], 'shift-click selects a range: ' + sel);
  await page.click('.nav-file-title[data-path="Box/Ideas.md"]', { modifiers: ['Control'] });
  const sel2 = await page.evaluate(() => [...document.querySelectorAll('.nav-file-title.is-selected')].map(e => e.dataset.path).sort());
  assert.deepStrictEqual(sel2, ['Box/Ideas 1.md', 'Box/Renamed note.md'], 'ctrl-click toggles');

  /* The context menu of a selection. */
  await page.click('.nav-file-title[data-path="Box/Ideas 1.md"]', { button: 'right' });
  const multiMenu = await page.evaluate(() => [...document.querySelectorAll('.menu .menu-item-title')].map(e => e.textContent));
  assert.ok(multiMenu.includes('Move 2 files to...') && multiMenu.includes('Delete'), 'multi menu: ' + multiMenu);
  await wait(50);
  await page.keyboard.press('Escape');
  await page.evaluate(async () => {
    const v = app.workspace.getLeavesOfType('file-explorer')[0].view;
    await app.plugins.get('file-explorer').deleteFiles(v.targets(app.vault.getFileByPath('Box/Ideas 1.md')));
  });
  await page.waitForFunction(() => !app.vault.getFileByPath('Box/Ideas 1.md') && !app.vault.getFileByPath('Box/Renamed note.md'));
  assert.ok(await page.evaluate(() => !!app.vault.getFileByPath('Box/Ideas.md')));

  /* A single file's menu is Obsidian's, and other plugins add to it. */
  await page.click('.nav-file-title[data-path="Welcome.md"]', { button: 'right' });
  const menu = await page.evaluate(() => [...document.querySelectorAll('.menu .menu-item-title')].map(e => e.textContent));
  for (const t of ['Open in new tab', 'Open to the right', 'Make a copy', 'Move file to...', 'Copy path', 'Rename...', 'Delete']) assert.ok(menu.includes(t), 'file menu has ' + t + ': ' + menu);
  assert.ok(menu.includes('Bookmark...') || menu.includes('Remove bookmark'), 'bookmarks plugin adds to the file menu');
  assert.strictEqual(menu[menu.length - 1], 'Delete');
  await wait(50);
  await page.keyboard.press('Escape');
  await page.click('.nav-folder-title[data-path="Daily"]', { button: 'right' });
  const fmenu = await page.evaluate(() => [...document.querySelectorAll('.menu .menu-item-title')].map(e => e.textContent));
  for (const t of ['New note', 'New folder', 'Search in folder', 'Rename...', 'Delete']) assert.ok(fmenu.includes(t), 'folder menu has ' + t + ': ' + fmenu);
  await wait(50);
  await page.keyboard.press('Escape');

  /* "New note" in a folder. */
  await page.evaluate(() => app.plugins.get('file-explorer').newNote(app.vault.getFolder('Daily')));
  await page.waitForFunction(() => !!app.vault.getFileByPath('Daily/Untitled.md'));
  await wait(500);

  /* Keyboard: arrows move, Right opens a folder, Enter opens a note. */
  await page.evaluate(() => {
    const v = app.workspace.getLeavesOfType('file-explorer')[0].view;
    v.setExpanded(app.vault.getFolder('Archive'), false);
    v.clearSelection();
    v.setFocus(app.vault.getFolder('Archive'));
    v.filesEl.focus();
  });
  await page.keyboard.press('ArrowRight');
  await wait();
  assert.ok((await tree()).includes('Archive/Old'), 'ArrowRight expands');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  const focused = await page.evaluate(() => document.querySelector('.tree-item-self.has-focus').dataset.path);
  assert.strictEqual(focused, 'Archive/Old/Deep note.md');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (app.workspace.getActiveFile() || {}).path === 'Archive/Old/Deep note.md');

  /* Reveal: collapse everything, then reveal the active file. */
  await page.evaluate(() => { const v = app.workspace.getLeavesOfType('file-explorer')[0].view; v.expanded.clear(); v.rebuild(); });
  await page.evaluate(() => app.commands.execute('file-explorer:reveal-active-file'));
  await wait(300);
  assert.ok((await tree()).includes('Archive/Old/Deep note.md'), 'reveal expands the folders above');

  /* Collapse all. */
  await page.evaluate(() => app.workspace.getLeavesOfType('file-explorer')[0].view.toggleCollapseAll());
  await wait();
  assert.ok(!(await tree()).some(p => p.includes('/')), 'collapse all');

  /* Files dropped from the computer are imported into the folder. */
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(['# Dropped\n\nHello #dropped'], 'Dropped note.md', { type: 'text/markdown' }));
    dt.items.add(new File([new Uint8Array([1, 2, 3])], 'blob.bin'));
    const target = document.querySelector('.nav-folder-title[data-path="Box"]');
    target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
  });
  await page.waitForFunction(() => !!app.vault.getFileByPath('Box/Dropped note.md') && !!app.vault.getFileByPath('Box/blob.bin'));
  assert.ok(await page.evaluate(() => (app.metadataCache.getFileCache(app.vault.getFileByPath('Box/Dropped note.md')).tags || []).length === 1), 'imported note is indexed');

  /* Move to a folder with the folder picker. */
  await page.evaluate(() => app.plugins.get('file-explorer').promptMove([app.vault.getFileByPath('Box/Dropped note.md')]));
  await page.waitForSelector('.prompt-input');
  await page.keyboard.type('Daily');
  await wait();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !!app.vault.getFileByPath('Daily/Dropped note.md'));

  /* The view state is saved like Obsidian's. */
  const saved = await page.evaluate(() => app.workspace.getLeavesOfType('file-explorer')[0].getViewState().state);
  assert.deepStrictEqual(Object.keys(saved).sort(), ['autoReveal', 'sortOrder']);
};
