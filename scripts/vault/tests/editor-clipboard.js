/* Pasting and dropping: images become attachments, explorer drags become
   links, URLs over a selection become links, HTML becomes Markdown. Also
   settings applied live, source mode, vim, and a note open in two panes. */
module.exports = async ({ page, assert, log, h }) => {
  await page.evaluate(async () => {
    await app.vault.create('Paste.md', '');
    await app.workspace.openLinkText('Paste', '', false);
  });
  await page.waitForSelector('.workspace-leaf.mod-active .cm-content');
  await page.click('.workspace-leaf.mod-active .cm-content');
  const set = (text, a, b) => page.evaluate(({ text, a, b }) => {
    const ed = app.workspace.activeEditor.editor;
    ed.setValue(text);
    const from = ed.offsetToPos(a === undefined ? text.length : a), to = ed.offsetToPos(b === undefined ? (a === undefined ? text.length : a) : b);
    ed.setSelection(from, to);
    ed.focus();
  }, { text, a, b });
  const get = () => page.evaluate(() => app.workspace.activeEditor.editor.getValue());
  const paste = data => page.evaluate(async data => {
    const dt = new DataTransfer();
    for (const [type, value] of Object.entries(data)) {
      if (type === 'file') dt.items.add(new File([Uint8Array.from(atob(value), c => c.charCodeAt(0))], 'image.png', { type: 'image/png' }));
      else dt.setData(type, value);
    }
    app.workspace.activeEditor.cm.contentDOM.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 400));
  }, data);

  /* A URL pasted over selected text makes a Markdown link. */
  await set('see the docs', 8, 12);
  await paste({ 'text/plain': 'https://obsidian.md' });
  assert.strictEqual(await get(), 'see the [docs](https://obsidian.md)');

  /* HTML becomes Markdown (autoConvertHtml is on by default). */
  await page.waitForFunction(() => !!window.TurndownService, null, { timeout: 10000 }).catch(() => {});
  await set('');
  await paste({ 'text/html': '<h2>Title</h2><p>Some <b>bold</b> and <a href="https://x.org">a link</a>.</p><ul><li>one</li><li>two</li></ul>', 'text/plain': 'Title Some bold and a link. one two' });
  const md = await get();
  log(JSON.stringify(md));
  assert.ok(md.includes('## Title') && md.includes('**bold**') && md.includes('[a link](https://x.org)') && /-\s+one/.test(md), md);

  /* A pasted image is saved in the attachment folder and embedded. */
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  await set('');
  await paste({ file: png });
  const withImage = await get();
  assert.ok(/^!\[\[Pasted image \d{14}\.png\]\]$/.test(withImage), withImage);
  const name = /\[\[(.*)\]\]/.exec(withImage)[1];
  assert.ok(await page.evaluate(n => !!app.vault.getFileByPath('Attachments/' + n), name), 'saved to Attachments/');

  /* A note dragged from the file explorer drops in as a link. */
  await set('Drop: ');
  await page.evaluate(() => {
    const cm = app.workspace.activeEditor.cm;
    const r = cm.contentDOM.querySelector('.cm-line').getBoundingClientRect();
    const dt = new DataTransfer();
    dt.setData('application/x-vault-file', 'Ideas.md');
    dt.setData('text/plain', '[[Ideas]]');
    const at = { clientX: r.right - 1, clientY: r.top + r.height / 2, dataTransfer: dt, bubbles: true, cancelable: true };
    cm.contentDOM.dispatchEvent(new DragEvent('dragover', at));
    cm.contentDOM.dispatchEvent(new DragEvent('drop', at));
  });
  await page.waitForTimeout(100);
  assert.strictEqual(await get(), 'Drop: [[Ideas]]');
  assert.strictEqual(await page.evaluate(() => app.workspace.getActiveFile().path), 'Paste.md', 'the drop didn’t open the note');

  /* Settings apply at once: line numbers, readable line length, source mode. */
  await page.evaluate(() => { app.config.set('showLineNumber', true); app.config.set('readableLineLength', false); });
  await page.waitForTimeout(100);
  const s1 = await page.evaluate(() => ({
    numbers: document.querySelectorAll('.workspace-leaf.mod-active .cm-lineNumbers .cm-gutterElement').length,
    gutterInSizer: !!document.querySelector('.workspace-leaf.mod-active .cm-sizer .cm-contentContainer > .cm-gutters'),
    readable: document.querySelector('.workspace-leaf.mod-active .markdown-source-view').classList.contains('is-readable-line-width')
  }));
  assert.ok(s1.numbers > 0 && s1.gutterInSizer && !s1.readable, JSON.stringify(s1));
  await page.evaluate(() => { app.config.set('showLineNumber', false); app.config.set('readableLineLength', true); });

  await page.evaluate(() => app.commands.execute('editor:toggle-source'));
  const src = await page.evaluate(() => ({
    lp: document.querySelector('.workspace-leaf.mod-active .markdown-source-view').classList.contains('is-live-preview'),
    state: app.workspace.activeLeaf.getViewState().state.source
  }));
  assert.deepStrictEqual(src, { lp: false, state: true });
  await page.evaluate(() => app.commands.execute('editor:toggle-source'));

  /* Vim mode, with :w saving. */
  await page.evaluate(() => app.config.set('vimMode', true));
  await set('abc', 0);
  await page.keyboard.press('Escape');
  await page.keyboard.type('x');
  assert.strictEqual(await get(), 'bc', 'vim normal mode x deletes');
  await page.keyboard.type('ix');
  assert.strictEqual(await get(), 'xbc');
  await page.keyboard.press('Escape');
  await page.keyboard.type(':w');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => app.vault.adapter.read('Paste.md').then(t => t === 'xbc'));
  assert.strictEqual(await h.readFile(page, 'Paste.md'), 'xbc');
  await page.evaluate(() => app.config.set('vimMode', false));

  /* One note in two panes: edits in one reach the other once saved. */
  await page.evaluate(() => app.commands.execute('workspace:split-vertical'));
  await page.waitForFunction(() => document.querySelectorAll('.workspace-leaf-content[data-type="markdown"]').length === 2);
  /* The new pane takes focus a moment after it opens. */
  await page.waitForFunction(() => document.activeElement && document.activeElement.closest('.cm-editor'));
  await page.keyboard.type('Z');
  await page.evaluate(() => app.commands.execute('editor:save-file'));
  await page.waitForTimeout(300);
  const texts = await page.evaluate(() => app.workspace.getLeavesOfType('markdown').map(l => l.view.editor.getValue()));
  assert.ok(texts.every(t => t === texts[0]) && texts[0].includes('Z'), JSON.stringify(texts));
};
