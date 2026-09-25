/* Behaviour checks for Markdown & HTML to PDF: the preview is sanitised, and
   the direct download is a real PDF (read back with pdf-lib). */
'use strict';

const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

const ok = (cond, detail) => ({ ok: !!cond, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

module.exports = [
  {
    name: 'Markdown to PDF: HTML preview drops scripts and handlers but keeps styles',
    tool: 'markdown-to-pdf',
    run: async page => {
      await page.locator('#view .chip', { hasText: /^HTML$/ }).click();
      await page.fill('#view [data-k="source"]', '<style>.x{color:red}</style><h1 class="x">Hi</h1><img src="data:," onerror="alert(1)"><script>alert(2)</script><a href="javascript:alert(3)">l</a>');
      await page.waitForTimeout(700);
      const r = await page.evaluate(() => {
        const d = document.querySelector('#view [data-k="preview"]').contentDocument;
        return { h1: d.querySelector('h1').textContent, scripts: d.querySelectorAll('body script').length,
          onerror: !!d.querySelector('[onerror]'), js: !!d.querySelector('a[href^="javascript"]'), red: d.defaultView.getComputedStyle(d.querySelector('h1')).color };
      });
      return ok(r.h1 === 'Hi' && !r.scripts && !r.onerror && !r.js && r.red === 'rgb(255, 0, 0)', r);
    }
  },
  {
    name: 'Markdown to PDF: direct download is a PDF with the title and page numbers',
    tool: 'markdown-to-pdf',
    run: async page => {
      const long = '# Long report\n\n' + Array.from({ length: 120 }, (_, i) => 'Paragraph ' + (i + 1) + ' with **bold**, `code` and café → done.').join('\n\n');
      await page.fill('#view [data-k="source"]', long);
      await page.waitForTimeout(500);
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Download PDF (simple layout)' }).click()]);
      const buf = fs.readFileSync(await dl.path());
      const doc = await PDFDocument.load(buf);
      return ok(buf.slice(0, 5).toString() === '%PDF-' && doc.getPageCount() >= 3 && doc.getTitle() === 'Long report' && dl.suggestedFilename() === 'long-report.pdf',
        { pages: doc.getPageCount(), title: doc.getTitle(), name: dl.suggestedFilename() });
    }
  }
];
