/* The editor's Markdown language: Obsidian's syntax is parsed (wikilinks,
   embeds, tags, highlights, comments, maths, footnotes, block ids, tasks,
   frontmatter) and shown with Obsidian's CodeMirror class names in source
   mode. Mounts an editor straight from editor/presentation.js. */
module.exports = async ({ page, assert }) => {
  /* CodeMirror draws only what is on screen: make the whole note fit. */
  const viewport = page.viewportSize();
  await page.setViewportSize({ width: 1200, height: 4000 });
  const res = await page.evaluate(async () => {
    const cm = await import('/assets/vendor/codemirror/codemirror.js');
    const pres = await import('/vault/js/editor/presentation.js');
    const file = app.vault.getFileByPath('Welcome.md');
    const text = await app.vault.read(file);
    const host = document.body.appendChild(document.createElement('div'));
    host.style.cssText = 'position:fixed;inset:0;z-index:1000;overflow:auto;background:var(--background-primary)';
    host.innerHTML = '<div style="height:100%" class="markdown-source-view cm-s-obsidian mod-cm6"></div>';
    const view = new cm.EditorView({ parent: host.firstChild, state: cm.EditorState.create({ doc: text,
      extensions: [cm.EditorView.lineWrapping, pres.markdownSyntax(app), pres.sourceMode(app, { file, app })] }) });
    const names = src => {
      const s = cm.EditorState.create({ doc: src, extensions: pres.markdownSyntax(app) });
      const tree = cm.ensureSyntaxTree(s, s.doc.length, 5000);
      const out = [];
      tree.iterate({ enter: n => { out.push(n.name + ':' + s.sliceDoc(n.from, n.to)); } });
      return out;
    };
    await new Promise(r => setTimeout(r, 300));
    const q = sel => view.contentDOM.querySelectorAll(sel).length;
    const out = {
      text: view.contentDOM.textContent.includes('**fixture vault**') && view.contentDOM.textContent.includes('tags: [start, guide]'),
      h1Line: q('.cm-line.HyperMD-header.HyperMD-header-1'),
      h1Mark: q('.cm-formatting.cm-formatting-header.cm-formatting-header-1'),
      strong: q('.cm-strong'), em: q('.cm-em'), strike: q('.cm-strikethrough'), highlight: q('.cm-highlight'),
      inlineCode: q('.cm-inline-code'), internal: q('.cm-hmd-internal-link'), alias: q('.cm-link-alias'),
      hashBegin: q('.cm-hashtag.cm-hashtag-begin'), hashEnd: q('.cm-hashtag.cm-hashtag-end.cm-tag-start'),
      taskX: q('.HyperMD-task-line[data-task="x"]'), taskOpen: q('.HyperMD-task-line[data-task=" "]'),
      list1: q('.HyperMD-list-line.HyperMD-list-line-1'), list2: q('.HyperMD-list-line.HyperMD-list-line-2'),
      ul: q('.cm-formatting-list-ul'), ol: q('.cm-formatting-list-ol'),
      quote: q('.HyperMD-quote.HyperMD-quote-1'), callout: q('.HyperMD-callout'),
      table: q('.HyperMD-table-row'), codeBegin: q('.HyperMD-codeblock-begin'), codeEnd: q('.HyperMD-codeblock-end'),
      math: q('.cm-math'), comment: q('.cm-comment'), blockid: q('.cm-blockid'), footnote: q('.HyperMD-footnote'),
      footref: q('.cm-footref'), frontmatter: q('.HyperMD-frontmatter'), fmKey: q('.HyperMD-frontmatter .cm-atom'),
      hr: q('.cm-hr'), url: q('.cm-url'),
      /* Parser edge cases. */
      tags: names('#tag #123 #a/b-c x#no http://x.com/#frag (#paren) #émoji').filter(n => n.startsWith('Hashtag:')),
      money: names('costs $5 and $10 today').filter(n => n.startsWith('InlineMath')),
      mathOk: names('so $x^2$ and $$y$$').filter(n => n.startsWith('InlineMath')),
      wiki: names('[[Note#Head|Alias]] ![[img.png|100x50]] [[a\\|b]]').filter(n => /^(Wikilink|Embed|WikilinkTarget|WikilinkAlias):/.test(n)),
      tasks: names('- [ ] a\n- [x] b\n- [-] c\n- [?] d').filter(n => n.startsWith('TaskMarker')),
      comment2: names('a %%hidden [[x]]%% b\n\n%%\nblock\n%%\n').filter(n => /^PercentComment(Block)?:/.test(n) || n.startsWith('Wikilink')),
      fm: names('---\na: 1\n---\n# h').filter(n => /^(Frontmatter|YAMLKey|YAMLNumber|ATXHeading1):/.test(n)),
      noFm: names('text\n---\nmore').some(n => n.startsWith('Frontmatter')),
      foot: names('x[^1] y^[inline]\n\n[^1]: def').filter(n => /^(FootnoteRef|InlineFootnote|FootnoteDefinition):/.test(n)),
      blockId: names('para ^abc-1\n\nnot^id here').filter(n => n.startsWith('BlockId')),
      highlightNode: names('a ==hi== b').filter(n => n.startsWith('Highlight:')),
      blockMath: names('$$\nx\n$$').filter(n => n.startsWith('BlockMath'))
    };
    view.destroy(); host.remove();
    return out;
  });
  for (const k of ['h1Line', 'h1Mark', 'strong', 'em', 'strike', 'highlight', 'inlineCode', 'internal', 'alias', 'hashBegin', 'hashEnd',
    'taskX', 'taskOpen', 'list1', 'list2', 'ul', 'ol', 'quote', 'callout', 'table', 'codeBegin', 'codeEnd', 'math', 'comment', 'blockid',
    'footnote', 'footref', 'frontmatter', 'fmKey', 'hr', 'url']) assert.ok(res[k] > 0, 'source mode has ' + k + ': ' + res[k]);
  assert.ok(res.text, 'source mode keeps every character');
  assert.deepStrictEqual(res.tags, ['Hashtag:#tag', 'Hashtag:#a/b-c', 'Hashtag:#paren', 'Hashtag:#émoji']);
  assert.deepStrictEqual(res.money, []);
  assert.deepStrictEqual(res.mathOk, ['InlineMath:$x^2$', 'InlineMath:$$y$$']);
  assert.deepStrictEqual(res.wiki, ['Wikilink:[[Note#Head|Alias]]', 'WikilinkTarget:Note#Head', 'WikilinkAlias:Alias', 'Embed:![[img.png|100x50]]',
    'WikilinkTarget:img.png', 'WikilinkAlias:100x50', 'Wikilink:[[a\\|b]]', 'WikilinkTarget:a', 'WikilinkAlias:b']);
  assert.deepStrictEqual(res.tasks, ['TaskMarker:[ ]', 'TaskMarker:[x]', 'TaskMarker:[-]', 'TaskMarker:[?]']);
  assert.deepStrictEqual(res.comment2, ['PercentComment:%%hidden [[x]]%%', 'PercentCommentBlock:%%\nblock\n%%']);
  assert.deepStrictEqual(res.fm, ['Frontmatter:---\na: 1\n---', 'YAMLKey:a', 'YAMLNumber:1', 'ATXHeading1:# h']);
  assert.ok(!res.noFm, 'a rule later in the note is not frontmatter');
  assert.deepStrictEqual(res.foot, ['FootnoteRef:[^1]', 'InlineFootnote:^[inline]', 'FootnoteDefinition:[^1]: def']);
  assert.deepStrictEqual(res.blockId, ['BlockId:^abc-1']);
  assert.deepStrictEqual(res.highlightNode, ['Highlight:==hi==']);
  assert.deepStrictEqual(res.blockMath, ['BlockMath:$$\nx\n$$']);
  await page.setViewportSize(viewport);
};
