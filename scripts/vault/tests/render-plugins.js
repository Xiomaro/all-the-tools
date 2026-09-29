/* Page preview popovers, slides, the footnotes view and Export to PDF. */
module.exports = async ({ page, assert }) => {
  await page.evaluate(async () => {
    const box = document.createElement('div');
    box.id = 'render-test';
    box.className = 'markdown-preview-view markdown-rendered';
    box.style.cssText = 'position:fixed;left:0;top:0;width:700px;height:400px;z-index:20;background:var(--background-primary)';
    document.body.appendChild(box);
    await app.markdown.render('See [[Ideas#Big ideas]] and [[Welcome]] and [[pixel.png]] and [[Missing]].', box, 'Welcome.md', null);
  });

  /* Reading view links preview without Ctrl. */
  await page.mouse.move(600, 600);
  await page.hover('#render-test a.internal-link[data-href="Ideas#Big ideas"]');
  await page.waitForSelector('.popover.hover-popover .markdown-embed h2', { timeout: 3000 });
  const pop = await page.evaluate(() => {
    const p = document.querySelector('.popover.hover-popover');
    return { count: document.querySelectorAll('.hover-popover').length, h2: p.querySelector('h2').textContent.trim(), items: p.querySelectorAll('li').length };
  });
  assert.deepStrictEqual(pop, { count: 1, h2: 'Big ideas', items: 2 });

  /* Nested: a link inside the popover opens a second one. */
  await page.hover('.hover-popover a.tag, .hover-popover a.internal-link').catch(() => {});
  await page.evaluate(async () => {
    const p = document.querySelector('.popover.hover-popover .markdown-preview-sizer');
    const extra = document.createElement('div');
    p.appendChild(extra);
    await app.markdown.render('Inner [[Projects/Project Alpha]]', extra, 'Ideas.md', null, { hoverParent: null });
  });
  await page.hover('.hover-popover a.internal-link[data-href="Projects/Project Alpha"]');
  await page.waitForFunction(() => document.querySelectorAll('.hover-popover').length === 2, null, { timeout: 3000 });
  /* Leaving everything closes them all. */
  await page.mouse.move(1300, 850);
  await page.waitForFunction(() => document.querySelectorAll('.hover-popover').length === 0, null, { timeout: 3000 });

  /* Images preview as images; missing notes don't preview. */
  await page.hover('#render-test a.internal-link[data-href="pixel.png"]');
  await page.waitForSelector('.popover.hover-popover.mod-image img', { timeout: 3000 });
  await page.keyboard.press('Escape');
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll('.hover-popover').length), 0, 'Escape closes');
  await page.hover('#render-test a.internal-link[data-href="Missing"]');
  await page.waitForTimeout(600);
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll('.hover-popover').length), 0, 'no preview of a missing note');

  /* The editor needs Ctrl/Cmd by default. */
  const editorPreview = await page.evaluate(async () => {
    const a = document.querySelector('#render-test a.internal-link[data-href="Welcome"]');
    app.workspace.trigger('hover-link', { event: new MouseEvent('mouseover'), source: 'editor', hoverParent: null, targetEl: a, linktext: 'Welcome', sourcePath: 'Welcome.md' });
    await new Promise(r => setTimeout(r, 500));
    const without = document.querySelectorAll('.hover-popover').length;
    app.workspace.trigger('hover-link', { event: new MouseEvent('mouseover', { ctrlKey: true, metaKey: true }), source: 'editor', hoverParent: null, targetEl: a, linktext: 'Welcome', sourcePath: 'Welcome.md' });
    await new Promise(r => setTimeout(r, 600));
    const withMod = document.querySelectorAll('.hover-popover').length;
    app.pagePreview.closeAll();
    return [without, withMod];
  });
  assert.deepStrictEqual(editorPreview, [0, 1]);

  /* Settings page lists the sources. */
  const settings = await page.evaluate(() => {
    const tab = app.plugins.get('page-preview').settingTab;
    const el = document.createElement('div');
    tab.render(el);
    return Array.from(el.querySelectorAll('.setting-item-name')).map(n => n.textContent);
  });
  assert.ok(settings.includes('Editor') && settings.includes('Reading view'), 'page preview settings: ' + settings);

  /* Slides: split on ---, arrows move, Escape leaves. */
  await page.evaluate(async () => {
    await app.vault.create('Deck.md', '---\ntitle: x\n---\n# One\n\n---\n\n## Two\n\n```\n---\n```\n\n---\n\nThree');
    await app.workspace.getLeaf(false).openFile(app.vault.getFileByPath('Deck.md'));
    document.getElementById('render-test').remove();
  });
  assert.ok(await page.evaluate(() => app.commands.execute('slides:start') !== false), 'Start presentation runs');
  await page.waitForSelector('.slides-container .slide:not([hidden]) h1', { timeout: 3000 });
  const s1 = await page.evaluate(() => document.querySelector('.slides-counter').textContent);
  await page.keyboard.press('ArrowRight');
  await page.waitForSelector('.slides-container .slide:not([hidden]) h2', { timeout: 3000 });
  const s2 = await page.evaluate(() => [document.querySelector('.slides-counter').textContent, !!document.querySelector('.slide:not([hidden]) pre')]);
  await page.keyboard.press('Escape');
  const closed = await page.evaluate(() => !document.querySelector('.slides-container'));
  assert.deepStrictEqual([s1, s2, closed], ['1 / 3', ['2 / 3', true], true]);

  /* Footnotes view lists the note's footnotes in reference order. */
  const fns = await page.evaluate(async () => {
    await app.workspace.getLeaf(false).openFile(app.vault.getFileByPath('Welcome.md'));
    await app.commands.execute('footnotes:open');
    await new Promise(r => setTimeout(r, 500));
    const items = Array.from(document.querySelectorAll('.footnotes-view .footnote-view-item'));
    return items.map(i => i.querySelector('.footnote-view-item-id').textContent + ':' + i.querySelector('.footnote-view-item-content').textContent.trim());
  });
  assert.deepStrictEqual(fns, ['1:The footnote definition.', '2:Inline footnote text.']);

  /* Export to PDF renders into a print container and calls print(). */
  const printed = await page.evaluate(async () => {
    let seen = null;
    const orig = window.print;
    window.print = () => {
      const p = document.querySelector('body > .print');
      seen = { printing: document.body.classList.contains('is-printing'), title: p && p.querySelector('.inline-title').textContent, h1: !!(p && p.querySelector('.el-h1 h1')), light: document.body.classList.contains('theme-light'), docTitle: document.title };
      window.dispatchEvent(new Event('afterprint'));
    };
    app.commands.execute('workspace:export-pdf');
    for (let i = 0; i < 50 && !seen; i++) await new Promise(r => setTimeout(r, 100));
    window.print = orig;
    return Object.assign(seen || {}, { after: !!document.querySelector('body > .print'), dark: document.body.classList.contains('theme-dark') });
  });
  assert.deepStrictEqual(printed, { printing: true, title: 'Welcome', h1: true, light: true, docTitle: 'Welcome', after: false, dark: true });
};
