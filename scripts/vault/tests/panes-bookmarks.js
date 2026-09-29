/* Bookmarks: reading and writing bookmarks.json in Obsidian's format,
   groups, reordering, renames, commands and menus. */
module.exports = async ({ page, assert, h }) => {
  await page.evaluate(() => { const l = app.workspace.getLeavesOfType('bookmarks')[0]; l.parent.selectTab(l); });
  await page.waitForSelector('.bookmarks-list .tree-item-self.bookmark');
  const shown = () => page.evaluate(() => [...document.querySelectorAll('.bookmarks-list .tree-item-self.bookmark')].map(e => e.textContent));
  assert.deepStrictEqual(await shown(), ['Welcome', 'Work', 'Project Alpha', 'tag:#project', 'Projects']);
  const readJson = () => page.evaluate(async () => { await new Promise(r => setTimeout(r, 450)); return JSON.parse(await app.vault.adapter.read('.obsidian/bookmarks.json')); });

  /* A search bookmark opens the search. */
  await page.evaluate(() => [...document.querySelectorAll('.tree-item-self.bookmark')].find(e => e.textContent === 'tag:#project').click());
  await page.waitForFunction(() => app.search.getView() && app.search.getView().getQuery() === 'tag:#project');

  /* A file bookmark opens the note and is highlighted. */
  await page.evaluate(() => { const l = app.workspace.getLeavesOfType('bookmarks')[0]; l.parent.selectTab(l); });
  await page.evaluate(() => [...document.querySelectorAll('.tree-item-self.bookmark')].find(e => e.textContent === 'Project Alpha').click());
  await page.waitForFunction(() => (app.workspace.getActiveFile() || {}).path === 'Projects/Project Alpha.md');
  await page.waitForFunction(() => [...document.querySelectorAll('.tree-item-self.bookmark.is-active')].map(e => e.textContent).join() === 'Project Alpha');

  /* "Bookmark..." for a heading, into the Work group. */
  await page.evaluate(() => app.bookmarks.add({ type: 'file', path: 'Welcome.md', subpath: '#Tasks' }, app.bookmarks.items[1].items));
  assert.ok((await shown()).includes('Welcome > Tasks'));
  let json = await readJson();
  assert.deepStrictEqual(json.items[1].items[2].path, 'Welcome.md');
  assert.deepStrictEqual(json.items[1].items[2].subpath, '#Tasks');
  assert.strictEqual(typeof json.items[1].items[2].ctime, 'number');

  /* The Bookmark dialog. */
  await page.evaluate(() => app.workspace.openFile(app.vault.getFileByPath('Ideas.md')));
  await page.waitForFunction(() => (app.workspace.getActiveFile() || {}).path === 'Ideas.md');
  await page.evaluate(() => app.commands.execute('bookmarks:bookmark-current-view'));
  await page.waitForSelector('.modal.mod-bookmark');
  await page.fill('.modal.mod-bookmark input[type="text"]', 'My ideas');
  await page.selectOption('.modal.mod-bookmark select', { label: 'Work' });
  await page.click('.modal.mod-bookmark button.mod-cta');
  json = await readJson();
  const work = json.items.find(i => i.type === 'group');
  assert.ok(work.items.some(i => i.path === 'Ideas.md' && i.title === 'My ideas'), 'saved into the group with a title');

  /* Renaming a bookmarked note updates the bookmark. */
  await page.evaluate(() => app.fileManager.renameFile(app.vault.getFileByPath('Projects/Project Alpha.md'), 'Projects/Alpha.md'));
  json = await readJson();
  assert.ok(JSON.stringify(json).includes('"Projects/Alpha.md"') && !JSON.stringify(json).includes('Project Alpha.md'), 'path follows the rename');
  await page.evaluate(() => app.fileManager.renameFile(app.vault.getFolder('Projects'), 'Work stuff'));
  json = await readJson();
  assert.ok(json.items.some(i => i.type === 'folder' && i.path === 'Work stuff'), 'folder bookmark follows');
  assert.ok(JSON.stringify(json).includes('"Work stuff/Alpha.md"'), 'files inside follow too');

  /* Reordering by dragging: Welcome after Projects. */
  await page.evaluate(() => {
    const els = [...document.querySelectorAll('.tree-item-self.bookmark')];
    const src = els.find(e => e.textContent === 'Welcome'), dst = els.find(e => e.textContent === 'Work stuff');
    const dt = new DataTransfer();
    src.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    const r = dst.getBoundingClientRect();
    dst.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + 5, clientY: r.bottom - 2 }));
    dst.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + 5, clientY: r.bottom - 2 }));
    src.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }));
  });
  json = await readJson();
  assert.deepStrictEqual(json.items.map(i => i.type + ':' + (i.path || i.title)), ['group:Work', 'folder:Work stuff', 'file:Welcome.md']);
  assert.deepStrictEqual(await page.evaluate(() => app.workspace.leftSplit.children.map(g => g.activeLeaf.view.getViewType())), ['bookmarks'], 'the drop stays in the pane');

  /* Dropping a group into itself does nothing; into another group moves it. */
  await page.evaluate(() => app.bookmarks.add({ type: 'group', title: 'Later', items: [] }));
  await page.evaluate(() => {
    const els = [...document.querySelectorAll('.tree-item-self.bookmark')];
    const src = els.find(e => e.textContent === 'Later'), dst = els.find(e => e.textContent === 'Work');
    const dt = new DataTransfer();
    src.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    const r = dst.getBoundingClientRect();
    dst.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + 5, clientY: r.top + r.height / 2 }));
    dst.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + 5, clientY: r.top + r.height / 2 }));
  });
  json = await readJson();
  assert.ok(json.items[0].items.some(i => i.type === 'group' && i.title === 'Later'), 'dropped into the group');

  /* Dragging a note from the file explorer bookmarks it. */
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData('application/x-vault-paths', JSON.stringify(['Daily/2026-09-28.md']));
    const list = document.querySelector('.bookmarks-list');
    list.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    list.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
  });
  json = await readJson();
  assert.ok(json.items.some(i => i.path === 'Daily/2026-09-28.md'));

  /* File menus offer Bookmark / Remove bookmark; the command removes. */
  const menu = await page.evaluate(async () => {
    const { Menu } = await import('/vault/js/core/ui.js');
    const titles = f => { const m = new Menu(); app.workspace.trigger('file-menu', m, app.vault.getFileByPath(f), 'more-options'); return m.items.map(i => i.titleEl && i.titleEl.textContent); };
    return { yes: titles('Welcome.md'), no: titles('Unicode é note.md') };
  });
  assert.ok(menu.yes.includes('Remove bookmark') && menu.no.includes('Bookmark...'), JSON.stringify(menu));
  await page.evaluate(async () => { await app.workspace.openFile(app.vault.getFileByPath('Welcome.md')); app.commands.execute('bookmarks:unbookmark-current-view'); });
  json = await readJson();
  assert.ok(!json.items.some(i => i.path === 'Welcome.md' && !i.subpath), 'unbookmarked');

  /* Bookmark all tabs makes a group. */
  await page.evaluate(() => app.commands.execute('bookmarks:bookmark-all-tabs'));
  await page.waitForSelector('.modal.mod-bookmark');
  await page.fill('.modal.mod-bookmark input[type="text"]', 'Session');
  await page.click('.modal.mod-bookmark button.mod-cta');
  json = await readJson();
  const session = json.items.find(i => i.title === 'Session');
  assert.ok(session && session.type === 'group' && session.items.length >= 1 && session.items.every(i => i.type === 'file'));

  /* Unknown keys survive a write. */
  assert.ok(await page.evaluate(async () => {
    app.bookmarks.items[0].customKey = 'kept';
    app.bookmarks.save();
    await new Promise(r => setTimeout(r, 450));
    return (await app.vault.adapter.read('.obsidian/bookmarks.json')).includes('"customKey": "kept"');
  }));
};
