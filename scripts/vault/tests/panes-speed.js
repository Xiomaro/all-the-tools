/* The panes stay quick on a big vault: 5,000 generated notes, 3,000 of
   them in one folder. */
module.exports = async ({ h, assert, log }) => {
  const words = ['alpha', 'beta', 'gamma', 'delta', 'river', 'mountain', 'garden', 'engine', 'paper', 'window', 'orange', 'signal'];
  const files = { '.obsidian/app.json': '{}' };
  const names = [];
  for (let i = 0; i < 5000; i++) {
    const folder = i < 3000 ? 'Flat' : 'Topic ' + (i % 20);
    names.push(folder + '/Note ' + i);
  }
  names.forEach((n, i) => {
    const body = [];
    for (let p = 0; p < 6; p++) body.push(Array.from({ length: 30 }, (_, k) => words[(i * 7 + p * 3 + k) % words.length]).join(' '));
    const link = names[(i * 31) % names.length].split('/').pop();
    files[n + '.md'] = '# Note ' + i + '\n\n' + body.join('\n\n') + '\n\nSee [[' + link + ']] and [[Hub]]. #tag' + (i % 50) + ' #area/sub' + (i % 5) + '\n\n## Tasks\n- [ ] task ' + i + '\n';
  });
  files['Hub.md'] = '# Hub\n\nEverything links here.';

  const page = await h.openVault({ name: 'speed', files });
  try {
    const t = await page.evaluate(async () => {
      const out = {};
      const frame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
      const v = app.workspace.getLeavesOfType('file-explorer')[0].view;
      let t0 = performance.now();
      v.setExpanded(app.vault.getFolder('Flat'), true);
      await frame();
      out.expand = performance.now() - t0;
      out.rendered = document.querySelectorAll('.nav-folder-title[data-path="Flat"] + .nav-folder-children > .tree-item').length;
      t0 = performance.now();
      v.revealFile(app.vault.getFileByPath('Flat/Note 2999.md'));
      await frame();
      out.reveal = performance.now() - t0;
      out.revealed = !!document.querySelector('.nav-file-title[data-path="Flat/Note 2999.md"]');

      t0 = performance.now();
      const n = app.search.matches('garden signal').length;
      out.matchesSync = performance.now() - t0;
      out.matchCount = n;
      t0 = performance.now();
      const view = await app.search.open('line:(river mountain) tag:#tag7');
      await new Promise(r => { const c = () => view.token && !view.contentEl.classList.contains('is-searching') && view.results.length ? r() : setTimeout(c, 10); c(); });
      out.pane = performance.now() - t0;
      out.paneResults = view.results.length;

      t0 = performance.now();
      await app.workspace.openFile(app.vault.getFileByPath('Hub.md'));
      const bl = app.workspace.getLeavesOfType('backlink')[0].view;
      bl.pane.setFile(app.vault.getFileByPath('Hub.md'));
      out.backlinks = performance.now() - t0;
      out.backlinkFiles = bl.pane.linked.results.length;

      t0 = performance.now();
      app.workspace.getLeavesOfType('tag')[0].view.render();
      out.tags = performance.now() - t0;

      t0 = performance.now();
      v.setSortOrder('byModifiedTime');
      await frame();
      out.resort = performance.now() - t0;

      t0 = performance.now();
      await app.vault.create('Flat/Zzz new.md', 'x');
      await frame(); await frame();
      out.createUpdate = performance.now() - t0;
      return out;
    });
    log(JSON.stringify(Object.fromEntries(Object.entries(t).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v) : v]))));
    assert.ok(t.rendered <= 300, 'a big folder draws in chunks: ' + t.rendered);
    assert.ok(t.revealed, 'reveal draws far down a big folder');
    assert.strictEqual(t.matchCount, 5000);
    assert.strictEqual(t.backlinkFiles, 5000);
    assert.ok(t.paneResults === 100, 'pane results: ' + t.paneResults);
    assert.ok(t.expand < 400, 'expand: ' + t.expand);
    assert.ok(t.reveal < 400, 'reveal: ' + t.reveal);
    assert.ok(t.matchesSync < 1500, 'search: ' + t.matchesSync);
    assert.ok(t.pane < 3000, 'search pane: ' + t.pane);
    assert.ok(t.backlinks < 1500, 'backlinks: ' + t.backlinks);
    assert.ok(t.tags < 500, 'tags: ' + t.tags);
    assert.ok(t.createUpdate < 500, 'a new file shows quickly: ' + t.createUpdate);
  } finally {
    await page.close();
  }
};
