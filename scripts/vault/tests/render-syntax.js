/* Obsidian's Markdown details: task statuses, callout types and nesting,
   links and tags edge cases, maths edge cases, line breaks, HTML
   sanitising, block ids, code block processors, task toggling. */
module.exports = async ({ page, assert }) => {
  const r = await page.evaluate(async () => {
    const render = async (md, opts, path = 'Welcome.md') => {
      const el = document.createElement('div');
      el.className = 'markdown-rendered';
      document.body.appendChild(el);
      await app.markdown.render(md, el, path, null, opts);
      return el;
    };
    const out = {};

    let el = await render('- [/] half\n- [-] dropped\n- [x] done\n- [ ] open\n- [>] later');
    out.tasks = Array.from(el.querySelectorAll('li')).map(li => li.dataset.task + (li.classList.contains('is-checked') ? '+' : '-'));

    el = await render('> [!faq]+ Questions\n> Body\n> > [!danger] Inner\n> > deep\n\n> [!custom-thing]\n> x\n\n> [!TLDR|wide]\n> short');
    const cs = Array.from(el.querySelectorAll('.callout'));
    out.callouts = cs.map(c => [c.dataset.callout, c.dataset.calloutFold, c.dataset.calloutMetadata, c.querySelector('.callout-icon svg').getAttribute('class').replace('svg-icon ', ''), c.querySelector('.callout-title-inner').textContent]);
    out.nested = !!el.querySelector('.callout[data-callout="faq"] .callout-content .callout[data-callout="danger"]');
    cs[0].querySelector('.callout-title').click();
    out.foldedAfterClick = cs[0].classList.contains('is-collapsed') && cs[0].querySelector('.callout-content').style.display === 'none';

    el = await render('[[#Tasks]] [[Ideas#Big ideas#Sub]] [[Ideas|alias **x**]] [x](<Project Beta.md>) [ext](mailto:a@b.c) C#sharp #123 #tag/sub https://x.com/#frag (#paren)');
    out.links = Array.from(el.querySelectorAll('a')).map(a => a.className + '|' + (a.getAttribute('data-href') || a.getAttribute('href')) + '|' + a.textContent);

    el = await render('Price $5 and $10. Math $x^2$ and $$y$$ and \\$escaped$');
    out.math = [el.querySelectorAll('.math-inline').length + el.querySelectorAll('span.math-block').length, el.textContent.includes('$5 and $10')];

    el = await render('one\ntwo');
    out.br = el.querySelectorAll('br').length;
    app.config.app.strictLineBreaks = true;
    el = await render('one\ntwo');
    out.strictBr = el.querySelectorAll('br').length;
    delete app.config.app.strictLineBreaks;

    el = await render('<script>window.__x = 1</script><img src="x" onerror="window.__x = 2"><a href="javascript:alert(1)">bad</a><iframe src="https://example.com"></iframe><div style="color: red">ok</div><img src="pixel.png">');
    await new Promise(r => setTimeout(r, 200));
    out.html = [!!el.querySelector('script'), el.querySelector('img').hasAttribute('onerror'), el.querySelector('a').hasAttribute('href'), !!el.querySelector('iframe'), window.__x || 0, el.querySelectorAll('img')[1].src.startsWith('blob:')];

    el = await render('A paragraph\n^own-id\n\nText ^inline-id\n\n- item ^list-id\n\n^standalone');
    out.blockIds = [el.textContent.includes('^'), el.querySelectorAll('br').length, el.children.length];

    el = await render('==hi there== and ~~no~~ and **#boldtag** and `#code` and %%x%%y');
    out.inline = [el.querySelector('mark').textContent, el.querySelectorAll('a.tag').length, el.textContent.includes('x')];

    let seen = null;
    app.codeBlockProcessors.set('testlang', (src, div, ctx) => { seen = [src, div.className, ctx.sourcePath, div.parentElement.className]; div.textContent = 'processed'; });
    el = await render('```testlang\nhello\nworld\n```');
    out.processor = seen;
    app.codeBlockProcessors.delete('testlang');

    /* Task toggles go through onTaskToggle, or edit the file. */
    const calls = [];
    el = await render('---\na: 1\n---\n\n- [ ] one\n- [x] two', { onTaskToggle: (line, checked, s) => calls.push([line, checked, s]) });
    el.querySelectorAll('input.task-list-item-checkbox')[0].click();
    el.querySelectorAll('input.task-list-item-checkbox')[1].click();
    out.toggles = calls;

    const file = app.vault.getFileByPath('Welcome.md');
    el = await render(await app.vault.read(file));
    el.querySelector('input.task-list-item-checkbox[data-line="16"]').click();
    await new Promise(r => setTimeout(r, 300));
    out.fileLine = (await app.vault.read(file)).split('\n')[16];

    /* Footnote numbering follows first reference; unknown refs stay text. */
    el = await render('b[^b] a[^a] again[^b] missing[^zz]\n\n[^a]: A\n[^b]: B');
    out.fn = [Array.from(el.querySelectorAll('sup.footnote-ref')).map(s => s.textContent).join(','), Array.from(el.querySelectorAll('.footnotes li')).map(li => li.textContent.replace(/↩︎/g, '').trim()).join(','), el.textContent.includes('[^zz]')];

    /* A theme's --callout-icon picks the icon. */
    const style = document.createElement('style');
    style.textContent = '.callout[data-callout="recipe"] { --callout-icon: lucide-chef-hat; }';
    document.head.appendChild(style);
    el = await render('> [!recipe] Soup\n> Stir');
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 50)));
    out.themedIcon = el.querySelector('.callout-icon svg').getAttribute('class');
    style.remove();

    /* Folding a heading hides its section, up to the next heading of the
       same level. */
    el = await render('# A\n\ntext a\n\n## B\n\ntext b\n\n# C\n\ntext c');
    el.querySelector('.el-h1 .heading-collapse-indicator').click();
    out.fold = Array.from(el.children).map(s => s.style.display === 'none' ? '-' : '+').join('');
    el.querySelector('.el-h1 .heading-collapse-indicator').click();
    out.unfold = Array.from(el.children).map(s => s.style.display === 'none' ? '-' : '+').join('');

    /* Callout rendering for live preview. */
    el = document.createElement('div');
    const callout = await app.markdown.renderCallout(el, '> [!bug]- Broken\n> details', 'Welcome.md');
    out.renderCallout = [callout.dataset.callout, callout.classList.contains('is-collapsed'), app.markdown.callouts.parseHeader('> [!Info|wide]+ Hello').type];

    return out;
  });
  assert.strictEqual(r.themedIcon, 'svg-icon lucide-chef-hat', 'themes set callout icons');
  assert.strictEqual(r.fold, '+---++');
  assert.strictEqual(r.unfold, '++++++');
  assert.deepStrictEqual(r.renderCallout, ['bug', true, 'info']);

  assert.deepStrictEqual(r.tasks, ['/+', '-+', 'x+', ' -', '>+']);
  assert.deepStrictEqual(r.callouts, [
    ['faq', '+', '', 'lucide-help-circle', 'Questions'],
    ['danger', '', '', 'lucide-zap', 'Inner'],
    ['custom-thing', '', '', 'lucide-pencil', 'Custom-thing'],
    ['tldr', '', 'wide', 'lucide-clipboard-list', 'Tldr']
  ]);
  assert.ok(r.nested, 'nested callout');
  assert.ok(r.foldedAfterClick, 'clicking a foldable callout title folds it');
  assert.deepStrictEqual(r.links, [
    'internal-link|#Tasks|Tasks',
    'internal-link|Ideas#Big ideas#Sub|Ideas > Big ideas > Sub',
    'internal-link|Ideas|alias **x**',
    'internal-link|Project Beta.md|x',
    'external-link|mailto:a@b.c|ext',
    'tag|#tag/sub|#tag/sub',
    'external-link|https://x.com/#frag|https://x.com/#frag',
    'tag|#paren|#paren'
  ]);
  assert.deepStrictEqual(r.math, [2, true]);
  assert.strictEqual(r.br, 1, 'single newline is a line break by default');
  assert.strictEqual(r.strictBr, 0, 'strictLineBreaks');
  assert.deepStrictEqual(r.html, [false, false, false, true, 0, true]);
  assert.deepStrictEqual(r.blockIds, [false, 0, 3]);
  assert.deepStrictEqual(r.inline, ['hi there', 1, false]);
  assert.deepStrictEqual(r.processor, ['hello\nworld', 'block-language-testlang', 'Welcome.md', 'el-pre']);
  assert.deepStrictEqual(r.toggles, [[4, true, 'x'], [5, false, ' ']]);
  assert.strictEqual(r.fileLine, '- [x] Write the first note');
  assert.deepStrictEqual(r.fn, ['[1],[2],[1]', 'B,A', true]);
};
