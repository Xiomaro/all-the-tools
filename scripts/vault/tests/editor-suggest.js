/* Suggestions while typing (links, headings, blocks, tags, plugin
   suggesters), find and replace, and the context menu. */
module.exports = async ({ page, assert, log }) => {
  const shot = async name => { if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/' + name + '.png' }); };
  await page.evaluate(async () => {
    await app.vault.create('Links.md', 'Start\n\nA paragraph to link to.\n\n- item one\n- item two\n');
    await app.workspace.openLinkText('Links', '', false);
  });
  await page.waitForSelector('.workspace-leaf.mod-active .cm-content');
  await page.click('.workspace-leaf.mod-active .cm-content');
  const set = (text, cursor) => page.evaluate(({ text, cursor }) => {
    const ed = app.workspace.activeEditor.editor;
    ed.setValue(text);
    ed.setCursor(ed.offsetToPos(cursor === undefined ? text.length : cursor));
    ed.focus();
  }, { text, cursor });
  const get = () => page.evaluate(() => app.workspace.activeEditor.editor.getValue());
  const items = () => page.$$eval('.suggestion-container .suggestion-item', els => els.map(e => e.querySelector('.suggestion-title') ? e.querySelector('.suggestion-title').textContent : e.textContent));
  const open = () => page.evaluate(() => { const c = document.querySelector('.suggestion-container'); return !!c && c.style.display !== 'none'; });

  /* [[ suggests notes; Enter inserts the link. */
  await set('See ');
  await page.keyboard.type('[[Ide');
  await page.waitForSelector('.suggestion-container .suggestion-item');
  let list = await items();
  log('files: ' + list.slice(0, 5).join(', '));
  assert.strictEqual(list[0], 'Ideas');
  await shot('suggest-link');
  await page.keyboard.press('Enter');
  assert.strictEqual(await get(), 'See [[Ideas]]');
  assert.strictEqual(await open(), false);

  /* Aliases, and ArrowDown moves the selection. */
  await set('');
  await page.keyboard.type('[[Start here');
  await page.waitForSelector('.suggestion-container .suggestion-item');
  list = await items();
  assert.ok(list.includes('Start here'), 'alias suggested: ' + list);
  const aliasIndex = list.indexOf('Start here');
  for (let i = 0; i < aliasIndex; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  assert.strictEqual(await get(), '[[Welcome|Start here]]');

  /* Headings of another note. */
  await set('');
  await page.keyboard.type('[[Ideas#big');
  await page.waitForSelector('.suggestion-container .suggestion-item');
  list = await items();
  assert.strictEqual(list[0], 'Big ideas');
  await page.keyboard.press('Enter');
  assert.strictEqual(await get(), '[[Ideas#Big ideas]]');

  /* Blocks of this note: picking one without an id gives it one. */
  await set('Start\n\nA paragraph to link to.\n\n- item one\n- item two\n\n', undefined);
  await page.keyboard.type('[[^paragraph');
  await page.waitForSelector('.suggestion-container .suggestion-item');
  list = await items();
  assert.ok(/paragraph to link/.test(list[0]), 'block suggested: ' + list);
  await page.keyboard.press('Enter');
  const withId = await get();
  const id = (/\[\[#\^([a-z0-9]{6})\]\]/.exec(withId) || [])[1];
  assert.ok(id, 'link to a new block id: ' + withId);
  assert.ok(withId.includes('A paragraph to link to. ^' + id), 'id added to the block');

  /* With "Use [[Wikilinks]]" off, the choice becomes a Markdown link. */
  await page.evaluate(() => app.config.set('useMarkdownLinks', true));
  await set('');
  await page.keyboard.type('[[Project Al');
  await page.waitForSelector('.suggestion-container .suggestion-item');
  await page.keyboard.press('Enter');
  assert.strictEqual(await get(), '[Project Alpha](Project%20Alpha.md)');
  await page.evaluate(() => app.config.set('useMarkdownLinks', false));

  /* Escape closes; | closes (display text). */
  await set('');
  await page.keyboard.type('[[Proj');
  await page.waitForSelector('.suggestion-container .suggestion-item');
  await page.keyboard.press('Escape');
  assert.strictEqual(await open(), false);
  await page.keyboard.type('e');
  assert.strictEqual(await open(), true, 'typing reopens');
  await page.keyboard.type('|');
  assert.strictEqual(await open(), false, '| starts display text');

  /* Tags. */
  await set('Text ');
  await page.keyboard.type('#sta');
  await page.waitForSelector('.suggestion-container .suggestion-item');
  list = await items();
  assert.strictEqual(list[0], 'start');
  await page.keyboard.press('Enter');
  assert.strictEqual(await get(), 'Text #start ');

  /* A plugin's suggester (app.editorSuggests) is used before the built-in ones. */
  await page.evaluate(() => {
    app.editorSuggests.push({
      onTrigger(cursor, editor) {
        const line = editor.getLine(cursor.line).slice(0, cursor.ch);
        const m = /:(\w*)$/.exec(line);
        return m ? { start: { line: cursor.line, ch: cursor.ch - m[0].length }, end: cursor, query: m[1] } : null;
      },
      getSuggestions(ctx) { return ['smile', 'smirk'].filter(s => s.startsWith(ctx.query)); },
      renderSuggestion(item, el) { el.setText ? el.setText(item) : (el.textContent = item); },
      selectSuggestion(item) { this.context.editor.replaceRange(item.toUpperCase(), this.context.start, this.context.end); }
    });
  });
  await set('');
  await page.keyboard.type(':smi');
  await page.waitForSelector('.suggestion-container .suggestion-item');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  assert.strictEqual(await get(), 'SMIRK');
  await page.evaluate(() => app.editorSuggests.pop());

  /* Find: Ctrl+F opens the bar, counts matches, Enter steps, Escape closes. */
  await set('apple banana apple cherry apple', 0);
  await page.keyboard.press('Control+f');
  await page.waitForSelector('.workspace-leaf.mod-active .document-search-container:not([style*="none"])');
  await page.keyboard.type('apple');
  await page.waitForTimeout(100);
  let count = await page.$eval('.workspace-leaf.mod-active .document-search-count', e => e.textContent);
  assert.strictEqual(count, '1 / 3');
  await page.keyboard.press('Enter');
  count = await page.$eval('.workspace-leaf.mod-active .document-search-count', e => e.textContent);
  assert.strictEqual(count, '2 / 3');
  const marks = await page.$$eval('.workspace-leaf.mod-active .cm-searchMatch', els => els.length);
  assert.strictEqual(marks, 3, 'matches highlighted');
  await shot('search');
  /* Replace. */
  await page.keyboard.press('Control+h');
  await page.keyboard.type('pear');
  await page.keyboard.press('Enter');
  assert.strictEqual(await get(), 'apple banana pear cherry apple');
  await page.click('.workspace-leaf.mod-active .document-replace-button:nth-child(2)');
  assert.strictEqual(await get(), 'pear banana pear cherry pear');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(50);
  assert.strictEqual(await page.$eval('.workspace-leaf.mod-active .document-search-container', e => e.style.display), 'none');
  assert.ok(await page.evaluate(() => app.workspace.activeEditor.cm.hasFocus), 'focus back in the editor');

  /* Find works in reading view too. */
  await set('# Title\n\nsome words and more words\n');
  await page.keyboard.press('Control+e');
  await page.waitForFunction(() => app.workspace.activeLeaf.view.getMode() === 'preview' && !app.workspace.activeLeaf.view.rendering);
  await page.waitForTimeout(200);
  await page.keyboard.press('Control+f');
  await page.keyboard.type('words');
  await page.waitForTimeout(100);
  const previewMarks = await page.$$eval('.workspace-leaf.mod-active .markdown-preview-view mark.obsidian-search-match-highlight', els => els.length);
  assert.strictEqual(previewMarks, 2);
  await page.keyboard.press('Escape');
  assert.strictEqual(await page.$$eval('.workspace-leaf.mod-active mark.obsidian-search-match-highlight', els => els.length), 0);
  await page.keyboard.press('Control+e');
  await page.waitForFunction(() => app.workspace.activeLeaf.view.getMode() === 'source');

  /* The context menu, with Obsidian's submenus and the editor-menu event. */
  await set('Some text here');
  let fired = false;
  await page.evaluate(() => { window.__menuRef = app.workspace.on('editor-menu', (menu, editor, view) => { window.__menuFired = !!(menu && editor && view); menu.addItem(i => i.setTitle('Plugin item')); }); });
  const box = await page.$eval('.workspace-leaf.mod-active .cm-line', e => { const r = e.getBoundingClientRect(); return { x: r.left + 20, y: r.top + r.height / 2 }; });
  await page.mouse.click(box.x, box.y, { button: 'right' });
  await page.waitForSelector('.menu');
  const titles = await page.$$eval('.menu > .menu-group .menu-item-title', els => els.map(e => e.textContent));
  log(titles.join(' | '));
  fired = await page.evaluate(() => window.__menuFired);
  assert.ok(fired && titles.includes('Format') && titles.includes('Paragraph') && titles.includes('Insert') && titles.includes('Paste') && titles.includes('Plugin item'));
  await page.hover('.menu-item.has-submenu');
  await page.waitForSelector('.menu.mod-submenu');
  await shot('context-menu');
  const sub = await page.$$eval('.menu.mod-submenu .menu-item-title', els => els.map(e => e.textContent));
  assert.ok(sub.includes('Bold') && sub.includes('Highlight'));
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.__menuRef.off());
};
