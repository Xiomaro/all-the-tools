/* Backlinks and outgoing links: linked and unlinked mentions, the Link
   button, backlinks in document and the status bar count. */
module.exports = async ({ page, assert }) => {
  await page.evaluate(async () => {
    await app.workspace.openFile(app.vault.getFileByPath('Welcome.md'));
    app.workspace.rightSplit.setCollapsed(false);
    const l = app.workspace.getLeavesOfType('backlink')[0];
    l.parent.selectTab(l);
  });
  await page.waitForFunction(() => document.querySelectorAll('.backlink-pane .search-result-file-title').length >= 4, null, { timeout: 5000 });
  await page.waitForFunction(() => document.querySelector('.status-bar-item.plugin-backlink').textContent !== '', null, { timeout: 5000 });
  const linked = await page.evaluate(() => ({
    titles: [...document.querySelectorAll('.backlink-pane > .search-result-container')[0].querySelectorAll('.search-result-file-title .tree-item-inner')].map(e => e.textContent),
    count: document.querySelector('.backlink-pane > .tree-item-self .tree-item-flair').textContent,
    hi: [...document.querySelectorAll('.backlink-pane .search-result-file-matched-text')].map(e => e.textContent),
    status: document.querySelector('.status-bar-item.plugin-backlink').textContent,
    display: app.workspace.getLeavesOfType('backlink')[0].getDisplayText()
  }));
  assert.deepStrictEqual(linked.titles, ['Deep note', 'Ideas', 'Project Alpha', 'Unicode é note'], 'linked: ' + linked.titles);
  assert.strictEqual(linked.count, '4');
  assert.ok(linked.hi.includes('[[Welcome]]') && linked.hi.includes('[[Welcome#Tasks]]'), 'links highlighted: ' + linked.hi);
  assert.strictEqual(linked.status, '4 backlinks');
  assert.strictEqual(linked.display, 'Backlinks for Welcome');

  /* Unlinked mentions open on demand; Link turns one into a link. */
  await page.evaluate(() => document.querySelectorAll('.backlink-pane > .tree-item-self')[1].click());
  await page.waitForFunction(() => [...document.querySelectorAll('.backlink-pane > .search-result-container')[1].querySelectorAll('.search-result-file-title')].length === 1, null, { timeout: 5000 });
  const un = await page.evaluate(() => ({
    title: document.querySelectorAll('.backlink-pane > .search-result-container')[1].querySelector('.search-result-file-title').textContent,
    state: app.workspace.getLeavesOfType('backlink')[0].getViewState().state
  }));
  assert.ok(un.title.startsWith('Project Beta'), 'unlinked: ' + un.title);
  assert.strictEqual(un.state.unlinkedCollapsed, false, 'section state kept like Obsidian');
  await page.evaluate(() => document.querySelectorAll('.backlink-pane > .search-result-container')[1].querySelector('.search-result-file-match-replace-button').click());
  await page.waitForFunction(async () => (await app.vault.adapter.read('Projects/Project Beta.md')).includes('Mentions [[Welcome]] without'));
  await page.waitForFunction(() => document.querySelector('.status-bar-item.plugin-backlink').textContent === '5 backlinks', null, { timeout: 5000 });

  /* The filter narrows linked mentions. */
  await page.evaluate(() => { const v = app.workspace.getLeavesOfType('backlink')[0].view; v.pane.setState({ showSearch: true, searchQuery: 'file:Deep' }); });
  const filtered = await page.evaluate(() => [...document.querySelectorAll('.backlink-pane > .search-result-container')[0].querySelectorAll('.search-result-file-title .tree-item-inner')].map(e => e.textContent));
  assert.deepStrictEqual(filtered, ['Deep note']);
  await page.evaluate(() => { const v = app.workspace.getLeavesOfType('backlink')[0].view; v.pane.setState({ showSearch: false, searchQuery: '' }); });

  /* Outgoing links: resolved and unresolved, then unlinked mentions. */
  await page.evaluate(() => { const l = app.workspace.getLeavesOfType('outgoing-link')[0]; l.parent.selectTab(l); });
  await page.waitForFunction(() => document.querySelectorAll('.outgoing-link-pane .search-result-file-title').length >= 3);
  const out = await page.evaluate(() => [...document.querySelectorAll('.outgoing-link-pane > .search-result-container .search-result-file-title')]
    .map(e => e.querySelector('.tree-item-inner').textContent + (e.classList.contains('is-unresolved') ? ' (unresolved)' : '')));
  assert.ok(out.includes('Project Alpha') && out.includes('Ideas') && out.includes('Unwritten note (unresolved)') && out.includes('pixel.png'), 'outgoing: ' + out);

  await page.evaluate(async () => {
    await app.vault.create('Mentions.md', 'Working on Project Alpha and some Ideas today. [[Welcome]]');
    await app.workspace.openFile(app.vault.getFileByPath('Mentions.md'));
    const v = app.workspace.getLeavesOfType('outgoing-link')[0].view;
    v.state.unlinkedCollapsed = false;
    v.update();
  });
  await page.waitForFunction(() => document.querySelectorAll('.outgoing-link-pane .search-result-container')[1].querySelectorAll('.search-result-file-title').length === 2, null, { timeout: 5000 });
  const om = await page.evaluate(() => [...document.querySelectorAll('.outgoing-link-pane .search-result-container')[1].querySelectorAll('.search-result-file-title .tree-item-inner')].map(e => e.textContent));
  assert.deepStrictEqual(om, ['Ideas', 'Project Alpha'], 'outgoing unlinked mentions: ' + om);
  await page.evaluate(() => document.querySelectorAll('.outgoing-link-pane .search-result-container')[1].querySelector('.search-result-file-match-replace-button').click());
  await page.waitForFunction(async () => /\[\[(Ideas|Project Alpha)\]\]/.test(await app.vault.adapter.read('Mentions.md')));

  /* Backlinks in document: a setting in backlink.json, and a panel at the
     foot of a note's editor (a stand-in editor here). */
  await page.evaluate(() => app.commands.execute('backlink:toggle-backlinks-in-document'));
  await page.waitForTimeout(400);
  const saved = await page.evaluate(() => app.vault.adapter.read('.obsidian/backlink.json').then(JSON.parse));
  assert.strictEqual(saved.backlinkInDocument, true);
  await page.evaluate(async () => {
    const { View } = await import('/vault/js/core/workspace.js');
    const { h } = await import('/vault/js/core/ui.js');
    await app.workspace.openFile(app.vault.getFileByPath('Welcome.md'));
    await new Promise(r => setTimeout(r, 300));
    if (!document.querySelector('.cm-sizer')) {
      class FakeMarkdown extends View {
        constructor(leaf) { super(leaf); this.file = null; this.contentEl.append(h('div.cm-scroller', h('div.cm-sizer', h('div.cm-contentContainer')))); }
        getViewType() { return 'markdown'; }
        getMode() { return 'source'; }
        async setState(s) { this.file = app.vault.getFileByPath(s.file); }
      }
      app.workspace.registerView('markdown-test', leaf => new FakeMarkdown(leaf));
      const leaf = app.workspace.getLeaf('tab');
      await leaf.setViewState({ type: 'markdown-test', state: { file: 'Welcome.md' }, active: true });
    }
  });
  await page.waitForFunction(() => !!document.querySelector('.cm-sizer .embedded-backlinks .search-result-file-title'), null, { timeout: 5000 });
  await page.evaluate(() => app.commands.execute('backlink:toggle-backlinks-in-document'));
  await page.waitForFunction(() => !document.querySelector('.embedded-backlinks'), null, { timeout: 5000 });
};
