/* Workspaces, file recovery, word count, web viewer, settings pages, the
   template insertion into an editor, and Publish/Sync explaining they
   aren't available. */
module.exports = async ({ page, assert }) => {
  const r = await page.evaluate(async () => {
    const a = window.app;
    const out = {};
    const wait = ms => new Promise(res => setTimeout(res, ms));

    /* Word count follows the open note (reading the saved text when no
       editor is showing it). */
    await a.workspace.openFile(a.vault.getFileByPath('Ideas.md'));
    await wait(150);
    const wc = document.querySelector('.status-bar-item.plugin-word-count');
    out.wordCount = wc && wc.textContent;
    out.wordSegments = wc ? wc.querySelectorAll('.status-bar-item-segment').length : 0;

    /* Workspaces: save a layout, change it, load it back. */
    const ws = await import('/vault/js/plugins/workspaces.js');
    await a.workspace.openFile(a.vault.getFileByPath('Welcome.md'), 'split');
    await wait(100);
    await ws.saveWorkspace(a, 'Writing');
    out.savedJson = JSON.parse(await a.vault.adapter.read('.obsidian/workspaces.json'));
    a.workspace.mainLeaves().slice(1).forEach(l => l.detach());
    await a.workspace.getLeaf(false).openFile(a.vault.getFileByPath('Projects/Project Alpha.md'));
    await wait(100);
    await ws.loadWorkspace(a, 'Writing');
    await wait(200);
    out.loadedFiles = a.workspace.mainLeaves().map(l => l.view && l.view.file && l.view.file.path).sort();
    out.leafCount = a.workspace.leaves.size;
    let n = 0; a.workspace.iterateAllLeaves(() => n++);
    out.iterCount = n;

    /* File recovery: snapshots on open and on edits, then restore. */
    const fr = a.plugins.get('file-recovery');
    const store = fr.store;
    const f = a.vault.getFileByPath('Ideas.md');
    const original = await a.vault.read(f);
    await store.snapshot(f.path, original, 5, true);
    await a.vault.modify(f, original + '\nAn edit.\n');
    await wait(100);
    const list1 = await store.list(f.path);
    out.snapCountAfterEdit = list1.length;          /* within the interval: no new one */
    await store.snapshot(f.path, original + '\nAn edit.\n', 0);
    const list2 = await store.list(f.path);
    out.snapCount = list2.length;
    out.files = (await store.files()).map(x => x.path);
    await a.commands.execute('file-recovery:open');
    await wait(300);
    out.recoveryModal = !!document.querySelector('.modal.mod-file-recovery');
    document.querySelector('.file-recovery-file[data-path="Ideas.md"]').click();
    await wait(200);
    out.snapshotRows = document.querySelectorAll('.file-recovery-snapshot').length;
    const rows = document.querySelectorAll('.file-recovery-snapshot');
    rows[rows.length - 1].click();
    await wait(100);
    document.querySelector('.file-recovery-diff-toggle input').click();
    await wait(100);
    out.diffAdds = document.querySelectorAll('.file-recovery-diff-line.mod-del').length;
    [...document.querySelectorAll('.file-recovery-toolbar button')].find(b => b.textContent === 'Restore').click();
    await wait(300);
    out.restored = (await a.vault.read(f)) === original;
    out.modalClosed = !document.querySelector('.modal.mod-file-recovery');
    await store.rename('Ideas.md', 'Ideas moved.md');
    out.renamed = (await store.list('Ideas moved.md')).length > 0 && (await store.list('Ideas.md')).length === 0;

    /* Templates into an editor: body at the cursor, properties merged. */
    const tp = await import('/vault/js/plugins/templates.js');
    let text = '---\ntags: [x]\n---\nLine one\n';
    let cursor = text.length;
    const editor = {
      getValue: () => text,
      replaceSelection: s => { text = text.slice(0, cursor) + s + text.slice(cursor); cursor += s.length; },
      offsetToPos: o => o,
      replaceRange: (s, from, to) => { text = text.slice(0, from) + s + text.slice(to); if (cursor >= to) cursor += s.length - (to - from); }
    };
    tp.insertTemplate(editor, '---\ntype: meeting\ntags: [y]\n---\n## Attendees\n');
    out.inserted = text;

    /* Settings pages render. */
    out.settings = {};
    for (const id of ['switcher', 'command-palette', 'daily-notes', 'templates', 'note-composer', 'zk-prefixer', 'file-recovery']) {
      const p = a.plugins.get(id);
      const el = document.createElement('div');
      document.body.appendChild(el);
      await (p && p.settingTab ? p.settingTab.render(el) : null);
      out.settings[id] = el.querySelectorAll('.setting-item').length;
      el.remove();
    }

    /* Publish and Sync are off by default; turned on, they explain. */
    out.publishOff = !a.plugins.isEnabled('publish') && !a.plugins.isEnabled('sync');
    await a.plugins.enable('sync');
    a.commands.execute('sync:setup');
    await wait(50);
    out.syncModal = (document.querySelector('.mod-service-unavailable') || {}).textContent || '';
    document.querySelector('.mod-service-unavailable button.mod-cta').click();
    await a.plugins.disable('sync');

    /* Web viewer. */
    await a.plugins.enable('webviewer');
    const leaf = await a.webviewer.open('https://example.com/');
    await wait(150);
    out.webType = leaf.view.getViewType();
    out.webFrame = (leaf.view.contentEl.querySelector('iframe.webviewer-frame') || {}).src;
    out.webWarning = !!leaf.view.contentEl.querySelector('.webviewer-frame-warning button');
    out.webState = leaf.getViewState().state;
    const wv = await import('/vault/js/plugins/webviewer.js');
    out.urls = [wv.toUrl('example.org/x', {}), wv.toUrl('two words', { searchEngine: 'bing' }), wv.toUrl('q', { searchEngine: 'custom', customSearchUrl: 'https://s.test/?q=%s' })];
    leaf.detach();
    await a.plugins.disable('webviewer');
    return out;
  });

  assert.ok(/^\d+ words\d+ characters$/.test(r.wordCount), 'word count: ' + r.wordCount);
  assert.strictEqual(r.wordSegments, 2);

  assert.ok(r.savedJson.workspaces.Writing && r.savedJson.active === 'Writing' && !r.savedJson.workspaces.Writing.lastOpenFiles, 'workspaces.json');
  assert.deepStrictEqual(r.loadedFiles, ['Ideas.md', 'Welcome.md'], 'layout restored: ' + r.loadedFiles);
  assert.strictEqual(r.leafCount, r.iterCount, 'old leaves released');

  assert.strictEqual(r.snapCountAfterEdit, 1);
  assert.strictEqual(r.snapCount, 2);
  assert.ok(r.files.includes('Ideas.md'));
  assert.ok(r.recoveryModal && r.snapshotRows === 2, 'snapshot rows: ' + r.snapshotRows);
  assert.ok(r.diffAdds >= 1, 'diff shows the edit being removed');
  assert.ok(r.restored && r.modalClosed, 'restored the old version');
  assert.ok(r.renamed, 'snapshots follow renames');

  assert.strictEqual(r.inserted, '---\ntags:\n  - x\n  - y\ntype: meeting\n---\nLine one\n## Attendees\n');

  for (const [id, n] of Object.entries(r.settings)) assert.ok(n >= 1, 'settings page for ' + id + ': ' + n);
  assert.strictEqual(r.settings.switcher, 3);
  assert.strictEqual(r.settings['daily-notes'], 4);

  assert.ok(r.publishOff);
  assert.ok(/isn’t available/.test(r.syncModal) && /Syncthing/.test(r.syncModal));

  assert.strictEqual(r.webType, 'webviewer');
  assert.strictEqual(r.webFrame, 'https://example.com/');
  assert.ok(r.webWarning, 'framing warning shown');
  assert.strictEqual(r.webState.url, 'https://example.com/');
  assert.deepStrictEqual(r.urls, ['https://example.org/x', 'https://www.bing.com/search?q=two%20words', 'https://s.test/?q=q']);
};
