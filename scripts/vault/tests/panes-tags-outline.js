/* Tags view and Outline. */
module.exports = async ({ page, assert }) => {
  await page.evaluate(async () => {
    await app.workspace.openFile(app.vault.getFileByPath('Welcome.md'));
    app.workspace.rightSplit.setCollapsed(false);
    const l = app.workspace.getLeavesOfType('tag')[0];
    l.parent.selectTab(l);
  });
  await page.waitForSelector('.tag-container .tag-pane-tag');
  const tags = await page.evaluate(() => [...document.querySelectorAll('.tag-container > .tree-item > .tag-pane-tag')].map(e =>
    e.querySelector('.tag-pane-tag-text').textContent + ':' + e.querySelector('.tag-pane-tag-count').textContent));
  assert.strictEqual(tags[0], 'project:3', 'by frequency, uses counted: ' + tags);
  assert.ok(tags.includes('nested:1') && tags.includes('journal:1') && tags.includes('start:2'), 'tags: ' + tags);

  /* Nested tags open to show their children; flat mode lists full names. */
  await page.click('.tag-pane-tag[data-tag="#nested"] .collapse-icon');
  const child = await page.evaluate(() => document.querySelector('.tag-pane-tag[data-tag="#nested/tag"] .tag-pane-tag-text').textContent);
  assert.strictEqual(child, 'tag');
  await page.evaluate(() => app.workspace.getLeavesOfType('tag')[0].setViewState({ type: 'tag', state: { sortOrder: 'alphabetical', useHierarchy: false } }));
  const flat = await page.evaluate(() => [...document.querySelectorAll('.tag-container .tag-pane-tag-text')].map(e => e.textContent));
  assert.deepStrictEqual(flat, ['guide', 'idea', 'journal', 'nested/tag', 'project', 'start', 'work']);
  assert.deepStrictEqual(await page.evaluate(() => app.workspace.getLeavesOfType('tag')[0].getViewState().state), { sortOrder: 'alphabetical', useHierarchy: false });

  /* Clicking a tag searches for it. */
  await page.click('.tag-pane-tag[data-tag="#journal"]');
  await page.waitForFunction(() => app.search.getView() && app.search.getView().getQuery() === 'tag:#journal');
  await page.waitForFunction(() => document.querySelectorAll('.mod-global-search .search-result-file-title').length === 1);

  /* Outline of the active note. */
  await page.evaluate(() => { const l = app.workspace.getLeavesOfType('outline')[0]; l.parent.selectTab(l); });
  await page.waitForSelector('.outline-tree .tree-item-self');
  const outline = await page.evaluate(() => ({
    top: [...document.querySelectorAll('.outline-tree > .tree-item > .tree-item-self')].map(e => e.textContent),
    kids: [...document.querySelectorAll('.outline-tree > .tree-item > .tree-item-children > .tree-item > .tree-item-self')].map(e => e.textContent),
    title: app.workspace.getLeavesOfType('outline')[0].getDisplayText()
  }));
  assert.deepStrictEqual(outline.top, ['Welcome']);
  assert.deepStrictEqual(outline.kids, ['Tasks', 'Callouts', 'Table', 'Code and maths', 'Embeds']);
  assert.strictEqual(outline.title, 'Outline of Welcome');

  /* Filter. */
  await page.evaluate(() => { const v = app.workspace.getLeavesOfType('outline')[0].view; v.setState({ showSearch: true, searchQuery: 'cod' }); });
  const filtered = await page.evaluate(() => [...document.querySelectorAll('.outline-tree .tree-item-self')].map(e => e.textContent));
  assert.deepStrictEqual(filtered, ['Welcome', 'Code and maths'], 'filter keeps parents: ' + filtered);
  await page.evaluate(() => { const v = app.workspace.getLeavesOfType('outline')[0].view; v.setState({ showSearch: false, searchQuery: '' }); });

  /* Clicking a heading jumps to its line. */
  await page.evaluate(() => {
    const leaf = app.workspace.getMostRecentLeaf();
    window.__es = null;
    const orig = leaf.view.setEphemeralState.bind(leaf.view);
    leaf.view.setEphemeralState = s => { window.__es = s; return orig(s); };
  });
  await page.evaluate(() => [...document.querySelectorAll('.outline-tree .tree-item-self')].find(e => e.textContent === 'Table').click());
  const es = await page.evaluate(() => window.__es);
  assert.strictEqual(es.subpath, '#Table');
  assert.strictEqual(es.line, (await page.evaluate(() => app.metadataCache.getFileCache(app.vault.getFileByPath('Welcome.md')).headings.find(h => h.heading === 'Table').position.start.line)));
  assert.ok(await page.evaluate(() => [...document.querySelectorAll('.outline-tree .tree-item-self.is-active')].map(e => e.textContent).join() === 'Table'), 'jumped-to heading is highlighted');

  /* Collapse all. */
  await page.evaluate(() => app.workspace.getLeavesOfType('outline')[0].view.toggleAll());
  assert.ok(await page.evaluate(() => document.querySelector('.outline-tree > .tree-item').classList.contains('is-collapsed')));
  await page.evaluate(() => app.workspace.getLeavesOfType('outline')[0].view.toggleAll());

  /* Moving a section by dragging its heading rewrites the note. */
  const moved = await page.evaluate(async () => {
    const { moveSection } = await import('/vault/js/plugins/outline.js');
    const { parseMarkdown } = await import('/vault/js/core/metadata.js');
    const t = '# A\na\n## A1\nx\n# B\nb\n# C\nc';
    const hs = parseMarkdown(t).headings;
    return [moveSection(t, hs, 0, 3, true), moveSection(t, hs, 3, 0, false), moveSection(t, hs, 1, 3, true), moveSection(t, hs, 0, 1, true)];
  });
  assert.strictEqual(moved[0], '# B\nb\n# C\nc\n# A\na\n## A1\nx', 'section with its subheadings moves');
  assert.strictEqual(moved[1], '# C\nc\n# A\na\n## A1\nx\n# B\nb');
  assert.strictEqual(moved[2], '# A\na\n# B\nb\n# C\nc\n## A1\nx');
  assert.strictEqual(moved[3], null, 'can\'t move a section into itself');

  await page.evaluate(async () => { await app.workspace.openFile(app.vault.getFileByPath('Ideas.md')); });
  await page.waitForFunction(() => app.workspace.getLeavesOfType('outline')[0].getDisplayText() === 'Outline of Ideas');
  await page.evaluate(() => {
    const tree = document.querySelector('.outline-tree');
    const items = [...tree.querySelectorAll('.tree-item-self')];
    const src = items.find(e => e.textContent === 'Small ideas'), dst = items.find(e => e.textContent === 'Big ideas');
    const dt = new DataTransfer();
    src.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    const r = dst.getBoundingClientRect();
    dst.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + 5, clientY: r.top + 2 }));
    dst.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + 5, clientY: r.top + 2 }));
    src.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }));
  });
  await page.waitForFunction(async () => {
    const leaf = app.workspace.getMostRecentLeaf();
    const text = leaf.view.editor ? leaf.view.editor.getValue() : await app.vault.adapter.read('Ideas.md');
    return text.indexOf('## Small ideas') > -1 && text.indexOf('## Small ideas') < text.indexOf('## Big ideas');
  }, null, { timeout: 5000 });
};
