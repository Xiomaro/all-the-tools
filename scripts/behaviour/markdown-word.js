/* Behaviour checks for assets/js/tools/markdown-word.js: Obsidian syntax is
   tidied before rendering, and the .docx carries real Word heading styles,
   numbered and bulleted lists, tables, quotes, code and live links. */
'use strict';

const q = (page, fn, arg) => page.evaluate(fn, arg);
const res = (ok, detail) => ({ ok: !!ok, detail: String(detail).slice(0, 400) });
async function setSource(page, value) {
  await q(page, v => {
    const n = document.querySelector('#view textarea[data-k=source]');
    n.value = v;
    n.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  await page.waitForTimeout(500);
}

const NOTE = [
  '---', 'tags: [a]', '---',
  '# Title', '', 'See [[Plan|the plan]] and [[Budget#Q4]]. ==Key== point.', '',
  '## Steps', '', '1. One', '2. Two', '   - Nested', '', '- [ ] Todo', '',
  '> [!note] Heads up', '> Body text', '', '%%hidden%%', '',
  '| A | B |', '| - | - |', '| 1 | [link](https://example.com) |', '',
  '```', 'x  =  1', '```'
].join('\n');

module.exports = [
  {
    name: 'markdown-to-word: Obsidian syntax tidied in the preview',
    tool: 'markdown-to-word',
    run: async page => {
      await setSource(page, NOTE);
      const frame = page.frameLocator('#view iframe[data-k=preview]');
      const body = await frame.locator('body').innerText();
      const r = [
        await frame.locator('h1').textContent(), await frame.locator('h2').textContent(), await frame.locator('mark').textContent(),
        body.includes('the plan'), body.includes('Budget › Q4'), body.includes('Heads up'),
        !body.includes('[[') && !body.includes('hidden') && !body.includes('tags:') && !body.includes('[!note]')
      ].join(',');
      return res(r === 'Title,Steps,Key,true,true,true,true', r);
    }
  },
  {
    name: 'markdown-to-word: .docx has heading styles, lists, table, quote, code and a hyperlink',
    tool: 'markdown-to-word',
    run: async page => {
      await setSource(page, NOTE);
      await q(page, () => {
        window.__mdw = null;
        window.__mdwOff = UI.onSave((name, blob) => { window.__mdw = { name, blob }; });
        Array.from(document.querySelectorAll('#view button')).find(b => b.textContent.trim() === 'Download .docx').click();
      });
      await page.waitForFunction(() => window.__mdw, null, { timeout: 8000 });
      const got = await q(page, async () => {
        window.__mdwOff();
        const zip = await JSZip.loadAsync(window.__mdw.blob);
        const doc = await zip.file('word/document.xml').async('string');
        const rels = await zip.file('word/_rels/document.xml.rels').async('string');
        const styles = await zip.file('word/styles.xml').async('string');
        const numbering = await zip.file('word/numbering.xml').async('string');
        return {
          name: window.__mdw.name,
          checks: [
            /w:pStyle w:val="Heading1"\/><\/w:pPr><w:r><w:t xml:space="preserve">Title</.test(doc),
            /w:pStyle w:val="Heading2"/.test(doc),
            /<w:outlineLvl w:val="0"\/>/.test(styles),
            (doc.match(/<w:numPr>/g) || []).length === 3,
            /<w:ilvl w:val="1"\/>/.test(doc),
            doc.includes('☐ ') && doc.includes('Todo'),
            /w:pStyle w:val="Quote"/.test(doc) && doc.includes('Heads up'),
            doc.includes('<w:tbl>') && doc.includes('<w:tblHeader/>'),
            /w:pStyle w:val="Code"\/><\/w:pPr><w:r><w:t xml:space="preserve">x  =  1</.test(doc),
            /<w:hyperlink r:id="rIdL1"/.test(doc) && rels.includes('Target="https://example.com" TargetMode="External"'),
            doc.includes('<w:highlight w:val="yellow"/>'),
            !doc.includes('hidden') && !doc.includes('[['),
            numbering.includes('w:startOverride')
          ]
        };
      });
      return res(got.name === 'Title.docx' && got.checks.every(Boolean), got.name + ' ' + got.checks.join(','));
    }
  }
];
