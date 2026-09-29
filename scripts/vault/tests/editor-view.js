/* The markdown view: Obsidian's DOM, modes, the inline title, saving,
   external changes, ephemeral state and the pane menu. */
module.exports = async ({ page, assert, log, h }) => {
  const shot = async name => { if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/' + name + '.png' }); };
  await page.evaluate(async () => { await app.workspace.openLinkText('Welcome', '', false); });
  await page.waitForSelector('.workspace-leaf.mod-active .markdown-source-view .cm-content');
  const dom = await page.evaluate(() => {
    const leaf = document.querySelector('.workspace-leaf.mod-active .workspace-leaf-content[data-type="markdown"]');
    const src = leaf.querySelector('.view-content > .markdown-source-view.cm-s-obsidian.mod-cm6');
    const sizer = src && src.querySelector('.cm-editor > .cm-scroller > .cm-sizer');
    return {
      mode: leaf.dataset.mode,
      classes: src && src.className,
      order: sizer && Array.from(sizer.children).map(c => c.className),
      title: sizer && sizer.querySelector('.inline-title').textContent,
      reading: !!leaf.querySelector('.markdown-reading-view > .markdown-preview-view.markdown-rendered > .markdown-preview-sizer.markdown-preview-section'),
      viewMode: app.workspace.activeLeaf.view.getMode(),
      editor: typeof app.workspace.activeEditor.editor.getValue
    };
  });
  log(JSON.stringify(dom));
  assert.strictEqual(dom.mode, 'source');
  assert.ok(/is-live-preview/.test(dom.classes) && /is-readable-line-width/.test(dom.classes) && /is-folding/.test(dom.classes), dom.classes);
  assert.deepStrictEqual(dom.order.map(c => c.split(' ')[0]), ['inline-title', 'metadata-host', 'cm-contentContainer']);
  assert.strictEqual(dom.title, 'Welcome');
  assert.ok(dom.reading);
  await shot('view-lp');

  /* The cursor starts at the body, below the frontmatter. */
  const cur = await page.evaluate(() => app.workspace.activeEditor.editor.getCursor());
  assert.strictEqual(cur.line, 8, 'cursor after frontmatter: ' + JSON.stringify(cur));

  /* Typing marks the note dirty and saves within ~2s; Ctrl+S saves at once. */
  await page.keyboard.type('Hello ');
  await page.keyboard.press('Control+s');
  await page.waitForTimeout(300);
  let disk = await h.readFile(page, 'Welcome.md');
  assert.ok(disk.includes('Hello # Welcome'), 'saved: ' + disk.slice(150, 220));

  /* Toggle reading view with Ctrl+E and back. */
  await page.keyboard.press('Control+e');
  await page.waitForFunction(() => document.querySelector('.workspace-leaf.mod-active .workspace-leaf-content').dataset.mode === 'preview');
  await page.waitForFunction(() => app.workspace.activeLeaf.view.previewSizerEl.textContent.includes('Welcome'), null, { timeout: 10000 });
  await shot('view-reading');
  const reading = await page.evaluate(() => {
    const v = app.workspace.activeLeaf.view;
    return { mode: v.getMode(), text: v.previewSizerEl.textContent.slice(0, 200), state: JSON.stringify(app.workspace.activeLeaf.getViewState().state) };
  });
  assert.strictEqual(reading.mode, 'preview');
  assert.ok(reading.text.includes('Welcome'), reading.text);
  assert.ok(reading.state.includes('"mode":"preview"'), reading.state);
  await page.keyboard.press('Control+e');
  await page.waitForFunction(() => app.workspace.activeLeaf.view.getMode() === 'source');

  /* An external change merges without moving the cursor. */
  await page.evaluate(() => app.workspace.activeEditor.editor.setCursor({ line: 12, ch: 3 }));
  await page.waitForTimeout(2300);
  await page.evaluate(async () => {
    const f = app.vault.getFileByPath('Welcome.md');
    const t = await app.vault.adapter.read('Welcome.md');
    await app.vault.adapter.write('Welcome.md', t.replace('Last line with', 'Final line with'));
    await app.syncNow();
  });
  await page.waitForTimeout(300);
  const merged = await page.evaluate(() => ({ text: app.workspace.activeEditor.editor.getValue(), cur: app.workspace.activeEditor.editor.getCursor() }));
  assert.ok(merged.text.includes('Final line with'), 'external change merged');
  assert.deepStrictEqual(merged.cur, { line: 12, ch: 3 });

  /* Unsaved edits and an external change elsewhere in the note both survive. */
  await page.keyboard.type('XYZ');
  await page.evaluate(async () => {
    const t = await app.vault.adapter.read('Welcome.md');
    await app.vault.adapter.write('Welcome.md', t.replace('Final line with', 'Very last line with'));
    await app.syncNow();
  });
  await page.waitForTimeout(200);
  const both = await page.evaluate(() => app.workspace.activeEditor.editor.getValue());
  assert.ok(both.includes('Very last line with') && both.includes('XYZ'), 'three-way merge');

  /* Ephemeral state: subpath scrolls to a heading; back/forward restores. */
  const eState = await page.evaluate(async () => {
    const v = app.workspace.activeLeaf.view;
    v.setEphemeralState({ subpath: '#Code and maths' });
    await new Promise(r => setTimeout(r, 300));
    return v.getEphemeralState();
  });
  assert.ok(eState.scroll > 30, 'scrolled to heading: ' + JSON.stringify(eState));

  /* The inline title renames the note. */
  await page.click('.workspace-leaf.mod-active .inline-title');
  await page.keyboard.press('End');
  await page.keyboard.type(' page');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  const renamed = await page.evaluate(() => ({ file: app.workspace.getActiveFile().path, focus: document.activeElement.className, header: document.querySelector('.workspace-leaf.mod-active .view-header-title').textContent }));
  assert.strictEqual(renamed.file, 'Welcome page.md');
  assert.ok(/cm-content/.test(renamed.focus), 'focus moved into the editor: ' + renamed.focus);
  assert.strictEqual(renamed.header, 'Welcome page');

  /* Windows line endings survive editing. */
  await page.evaluate(async () => {
    await app.vault.create('Crlf.md', 'one\r\ntwo\r\n');
    await app.workspace.openLinkText('Crlf', '', false);
  });
  await page.waitForFunction(() => app.workspace.getActiveFile().path === 'Crlf.md');
  await page.evaluate(async () => {
    const ed = app.workspace.activeEditor.editor;
    ed.setCursor({ line: 1, ch: 3 });
    ed.replaceSelection('\nthree');
    await app.workspace.activeLeaf.view.save();
  });
  assert.strictEqual(await h.readFile(page, 'Crlf.md'), 'one\r\ntwo\r\nthree\r\n');
  await page.evaluate(() => app.workspace.activeLeaf.goBack());
  await page.waitForFunction(() => app.workspace.getActiveFile().path === 'Welcome page.md');

  /* Pane menu: mode items, and file items without duplicates. */
  await page.click('.workspace-leaf.mod-active .view-action[aria-label="More options"]');
  const items = await page.$$eval('.menu .menu-item-title', els => els.map(e => e.textContent));
  log(items.join(' | '));
  assert.ok(items.includes('Reading view') && items.includes('Source mode') && items.includes('Find...'));
  assert.ok(items.filter(t => /^Rename/.test(t)).length === 1);
  await page.keyboard.press('Escape');
};
