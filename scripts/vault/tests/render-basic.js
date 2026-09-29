/* The reading-view renderer turns the fixture's Welcome.md into Obsidian's
   HTML: sections, links, tags, tasks with source lines, callouts, tables,
   highlighted code, maths, mermaid, embeds, footnotes, properties. */
module.exports = async ({ page, assert }) => {
  const r = await page.evaluate(async () => {
    const box = document.createElement('div');
    box.className = 'markdown-preview-view markdown-rendered';
    document.body.appendChild(box);
    const text = await app.vault.read(app.vault.getFileByPath('Welcome.md'));
    await app.markdown.render(text, box, 'Welcome.md', null);
    const q = s => box.querySelector(s);
    const qa = s => Array.from(box.querySelectorAll(s));
    const own = s => qa(s).filter(el => !el.closest('.internal-embed, .mod-header'));
    return {
      firstSection: box.children[0] && box.children[0].className,
      h1: q('.el-h1 > h1') && q('.el-h1 > h1').getAttribute('data-heading'),
      sections: Array.from(box.children).map(c => c.className.split(' ')[0]),
      links: own('a.internal-link').map(a => [a.getAttribute('data-href'), a.textContent, a.classList.contains('is-unresolved')]),
      external: q('a.external-link') && [q('a.external-link').getAttribute('href'), q('a.external-link').target, q('a.external-link').rel],
      tags: own('a.tag').map(a => a.getAttribute('href')),
      mark: q('mark') && q('mark').textContent,
      del: !!q('del'),
      tasks: qa('li.task-list-item').filter(li => !li.closest('.internal-embed')).map(li => [li.dataset.line, li.dataset.task, li.classList.contains('is-checked'), li.querySelector('input').dataset.line]),
      callouts: qa('.callout').map(c => [c.dataset.callout, c.dataset.calloutFold, c.classList.contains('is-collapsed'), (c.querySelector('.callout-icon svg') || {}).getAttribute && c.querySelector('.callout-icon svg').getAttribute('class'), c.querySelector('.callout-title-inner').textContent, c.querySelector('.callout-content') ? getComputedStyle(c.querySelector('.callout-content')).display : null]),
      th: qa('th').map(t => t.getAttribute('align')),
      code: q('pre.language-js > code.language-js') && [q('pre.language-js .token.keyword') && q('pre.language-js .token.keyword').textContent, !!q('pre.language-js > .copy-code-button')],
      mathInline: !!q('.math.math-inline .katex'),
      mathBlock: !!q('.el-div > .math.math-block .katex-display'),
      mermaid: !!q('.el-pre > .mermaid svg'),
      embed: q('.internal-embed.markdown-embed') && [q('.internal-embed.markdown-embed').getAttribute('src'), q('.markdown-embed .markdown-embed-content h2') && q('.markdown-embed .markdown-embed-content h2').textContent.trim()],
      image: q('.internal-embed.image-embed img') && [q('.internal-embed.image-embed img').getAttribute('width'), q('.internal-embed.image-embed img').src.startsWith('blob:')],
      fnRefs: qa('sup.footnote-ref').map(s => s.textContent),
      fnItems: qa('section.footnotes li').map(li => li.textContent.replace('↩︎', '').trim()),
      text: box.textContent,
      props: !!q('.mod-header .metadata-container'),
      headingIds: qa('h2').map(x => x.id)
    };
  });

  assert.strictEqual(r.h1, 'Welcome');
  assert.ok(r.sections.includes('el-p') && r.sections.includes('el-ul') && r.sections.includes('el-table') && r.sections.includes('el-pre'), 'sections: ' + r.sections);
  const link = href => r.links.find(l => l[0] === href);
  assert.deepStrictEqual(link('Projects/Project Alpha'), ['Projects/Project Alpha', 'project link', false]);
  assert.deepStrictEqual(link('Ideas#Big ideas'), ['Ideas#Big ideas', 'Ideas > Big ideas', false]);
  assert.deepStrictEqual(link('Unwritten note'), ['Unwritten note', 'Unwritten note', true]);
  assert.deepStrictEqual(link('Ideas.md'), ['Ideas.md', 'Markdown link', false], 'markdown link to a note is internal');
  assert.deepStrictEqual(r.external, ['https://obsidian.md', '_blank', 'noopener nofollow']);
  assert.deepStrictEqual(r.tags, ['#start', '#nested/tag']);
  assert.strictEqual(r.mark, 'highlighted');
  assert.ok(r.del);
  assert.deepStrictEqual(r.tasks, [['16', ' ', false, '16'], ['17', 'x', true, '17'], ['18', ' ', false, '18'], ['19', ' ', false, '19']]);
  assert.strictEqual(r.callouts.length, 3);
  assert.deepStrictEqual(r.callouts[0].slice(0, 5), ['note', '', false, 'svg-icon lucide-pencil', 'A note callout']);
  assert.deepStrictEqual(r.callouts[1].slice(0, 5), ['warning', '-', true, 'svg-icon lucide-alert-triangle', 'Folded warning']);
  assert.strictEqual(r.callouts[1][5], 'none', 'folded callout hides its content');
  assert.strictEqual(r.callouts[2][3], 'svg-icon lucide-flame');
  assert.deepStrictEqual(r.th, [null, 'right', 'center']);
  assert.deepStrictEqual(r.code, ['function', true]);
  assert.ok(r.mathInline && r.mathBlock, 'maths');
  assert.ok(r.mermaid, 'mermaid diagram');
  assert.deepStrictEqual(r.embed, ['Ideas#Big ideas', 'Big ideas']);
  assert.deepStrictEqual(r.image, ['64', true]);
  assert.deepStrictEqual(r.fnRefs, ['[1]', '[2]']);
  assert.deepStrictEqual(r.fnItems, ['The footnote definition.', 'Inline footnote text.']);
  assert.ok(!r.text.includes('hidden comment') && !r.text.includes('Not a link'), 'comments are removed');
  assert.ok(!r.text.includes('^last-block') && !r.text.includes('^task-child'), 'block ids are hidden');
  assert.ok(!r.text.includes('aliases:'), 'frontmatter is not shown as text');
  assert.ok(r.props, 'properties block for the frontmatter');
  assert.ok(r.headingIds.includes('tasks') && r.headingIds.includes('code-and-maths'), 'heading ids: ' + r.headingIds);
};
