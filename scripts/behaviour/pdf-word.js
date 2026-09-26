/* Behaviour checks for PDF to Word. Fixtures are built with pdf-lib, fed in
   with setInputFiles, and the downloaded .docx is unzipped with JSZip; every
   XML part is parsed with the browser's DOMParser to prove it is well-formed,
   and the paragraphs are read back from word/document.xml. */
'use strict';

const fs = require('fs');
const PDFLib = require('pdf-lib');
const JSZip = require('jszip');

const FILE = '#view input[type=file]';
const ok = (cond, detail) => ({ ok: !!cond, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const btn = (page, name) => page.getByRole('button', { name, exact: true }).first();
const pdfFile = (buffer, name) => ({ name, mimeType: 'application/pdf', buffer });

async function download(page, click) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), click()]);
  const buf = fs.readFileSync(await dl.path());
  if (process.env.PDFWORD_DUMP) fs.writeFileSync(process.env.PDFWORD_DUMP.replace(/%s/, dl.suggestedFilename()), buf);
  return { name: dl.suggestedFilename(), buf };
}

/* Convert and download, then unzip and parse every part in the page. */
async function convert(page) {
  await btn(page, 'Convert to Word').click();
  const { name, buf } = await download(page, () => btn(page, 'Download Word document').click());
  const zip = await JSZip.loadAsync(buf);
  const parts = {};
  for (const p of Object.keys(zip.files)) if (/\.(xml|rels)$/.test(p)) parts[p] = await zip.file(p).async('string');
  const media = Object.keys(zip.files).filter(p => p.startsWith('word/media/') && !zip.files[p].dir);
  const read = await page.evaluate(parts => {
    const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const bad = [];
    const docs = {};
    for (const [p, xml] of Object.entries(parts)) {
      const d = new DOMParser().parseFromString(xml, 'application/xml');
      if (d.getElementsByTagName('parsererror').length) bad.push(p); else docs[p] = d;
    }
    const doc = docs['word/document.xml'];
    const attr = (n, name) => n ? n.getAttributeNS(W, name) : null;
    const paras = doc ? [...doc.getElementsByTagNameNS(W, 'p')].map(p => {
      const ppr = p.getElementsByTagNameNS(W, 'pPr')[0];
      const runs = [...p.getElementsByTagNameNS(W, 'r')].map(r => ({
        text: [...r.getElementsByTagNameNS(W, 't')].map(t => t.textContent).join(''),
        bold: !!r.getElementsByTagNameNS(W, 'b').length && attr(r.getElementsByTagNameNS(W, 'b')[0], 'val') !== '0'
      }));
      return {
        style: ppr ? attr(ppr.getElementsByTagNameNS(W, 'pStyle')[0], 'val') : null,
        text: runs.map(r => r.text).join(''),
        bold: runs.filter(r => r.bold).map(r => r.text),
        numId: ppr ? attr(ppr.getElementsByTagNameNS(W, 'numId')[0], 'val') : null,
        pageBreak: !!(ppr && ppr.getElementsByTagNameNS(W, 'pageBreakBefore').length) || [...p.getElementsByTagNameNS(W, 'br')].some(b => attr(b, 'type') === 'page'),
        drawings: p.getElementsByTagNameNS(W, 'drawing').length
      };
    }) : [];
    const sizes = doc ? [...doc.getElementsByTagNameNS(W, 'pgSz')].map(s => attr(s, 'w') + 'x' + attr(s, 'h')) : [];
    const styles = docs['word/styles.xml'] ? [...docs['word/styles.xml'].getElementsByTagNameNS(W, 'style')].map(s => attr(s, 'styleId')) : [];
    return { bad, paras, sizes, styles, count: Object.keys(parts).length };
  }, parts);
  const types = parts['[Content_Types].xml'] || '';
  read.structure = ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'word/_rels/document.xml.rels'].every(p => parts[p]) &&
    /word\/document\.xml/.test(types) && /document\.main\+xml/.test(types) && /officeDocument/.test(parts['_rels/.rels'] || '');
  read.rels = parts['word/_rels/document.xml.rels'] || '';
  return { name, buf, media, ...read };
}

/* Lay out words greedily in lines no wider than `max`, like a word processor. */
function wrap(font, size, text, max) {
  const lines = [];
  let cur = '';
  for (const w of text.split(' ')) {
    const next = cur ? cur + ' ' + w : w;
    if (cur && font.widthOfTextAtSize(next, size) > max) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

const PARA1 = 'This report explains how the new converter turns a PDF back into a document that can be edited. ' +
  'It reads the text of every page, groups the words into lines and the lines into paragraphs, and keeps the headings, ' +
  'the bold and italic words, the lists and the pictures, so that the result opens cleanly in Word, LibreOffice and Google Docs.';

async function reportPdf(pngBytes) {
  const doc = await PDFLib.PDFDocument.create();
  const reg = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const bold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
  const L = 72, MAX = 468, S = 11, LEAD = 14;

  const p1 = doc.addPage([612, 792]);
  p1.drawText('Annual Report 2026', { x: L, y: 700, size: 24, font: bold });
  let y = 660;
  const lines1 = wrap(reg, S, PARA1, MAX);
  for (const t of lines1) { p1.drawText(t, { x: L, y, size: S, font: reg }); y -= LEAD; }

  /* A picture between the two paragraphs. */
  const img = await doc.embedPng(pngBytes);
  y -= 110;
  p1.drawImage(img, { x: 206, y, width: 200, height: 100 });
  y -= 30;

  /* Paragraph two: a bold phrase mid-line, and a word hyphenated across lines. */
  const head = 'The second paragraph has ', boldText = 'bold words', tail = ' in the middle of its first line, and';
  const filler = 'then carries on with more ordinary words until the line is nearly full'.split(' ');
  let line1 = tail;
  const width = s => reg.widthOfTextAtSize(head, S) + bold.widthOfTextAtSize(boldText, S) + reg.widthOfTextAtSize(s, S);
  for (let i = 0; width(line1 + ' ' + filler[i % filler.length] + ' recon-') <= MAX; i++) line1 += ' ' + filler[i % filler.length];
  line1 += ' recon-';
  let x = L;
  p1.drawText(head, { x, y, size: S, font: reg }); x += reg.widthOfTextAtSize(head, S);
  p1.drawText(boldText, { x, y, size: S, font: bold }); x += bold.widthOfTextAtSize(boldText, S);
  p1.drawText(line1, { x, y, size: S, font: reg });
  y -= LEAD;
  const rest = wrap(reg, S, 'struction of the text follows on the next line, which then wraps once more so that this paragraph runs over three lines in the PDF.', MAX);
  for (const t of rest) { p1.drawText(t, { x: L, y, size: S, font: reg }); y -= LEAD; }

  const p2 = doc.addPage([612, 792]);
  p2.drawText('Next steps', { x: L, y: 700, size: 16, font: bold });
  y = 670;
  for (const t of ['First item on the list', 'Second item on the list']) {
    p2.drawText('•', { x: L + 6, y, size: S, font: reg });
    p2.drawText(t, { x: L + 20, y, size: S, font: reg });
    y -= LEAD;
  }
  y -= 10;
  ['1. Alpha step', '2. Beta step', '3. Gamma step'].forEach(t => { p2.drawText(t, { x: L + 6, y, size: S, font: reg }); y -= LEAD; });
  y -= 10;
  p2.drawText('A closing paragraph on the second page.', { x: L, y, size: S, font: reg });
  return { bytes: Buffer.from(await doc.save()), para1: lines1.join(' '), para1Lines: lines1.length, para2Lines: 1 + rest.length };
}

async function pngFromPage(page, w, h, draw) {
  const b64 = await page.evaluate(({ w, h, draw }) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    new Function('x', 'w', 'h', draw)(c.getContext('2d'), w, h);
    return c.toDataURL('image/png').split(',')[1];
  }, { w, h, draw });
  return Buffer.from(b64, 'base64');
}

const norm = s => s.replace(/\s+/g, ' ').trim();

module.exports = [
  {
    name: 'pdf-to-word: headings, whole paragraphs, bold, hyphens, lists, a picture and a page break', tool: 'pdf-to-word',
    run: async (page) => {
      const png = await pngFromPage(page, 400, 200, "x.fillStyle='#2a6';x.fillRect(0,0,w,h);x.fillStyle='#fff';x.fillRect(40,40,120,120);");
      const src = await reportPdf(png);
      await page.setInputFiles(FILE, pdfFile(src.bytes, 'report.pdf'));
      await btn(page, 'Convert to Word').waitFor({ timeout: 30000 });
      const r = await convert(page);
      const P = r.paras.filter(p => p.text || p.drawings);
      const find = re => P.findIndex(p => re.test(p.text));
      const iTitle = find(/^Annual Report 2026$/), iP1 = find(/^This report explains/), iImg = P.findIndex(p => p.drawings === 1);
      const iP2 = find(/^The second paragraph/), iNext = find(/^Next steps$/), iEnd = find(/closing paragraph/);
      const p1 = P[iP1] || {}, p2 = P[iP2] || {};
      const bullets = P.filter(p => /item on the list$/.test(p.text));
      const numbered = P.filter(p => /^(Alpha|Beta|Gamma) step$/.test(p.text));
      const summary = (await page.innerText('#view')).replace(/\s+/g, ' ');
      const checks = {
        wellFormed: !r.bad.length && r.structure,
        styles: ['Normal', 'Heading1', 'Heading2', 'Heading3'].every(s => r.styles.includes(s)),
        order: iTitle === 0 && iTitle < iP1 && iP1 < iImg && iImg < iP2 && iP2 < iNext && iNext < iEnd,
        heading: (P[iTitle] || {}).style === 'Heading1' && (P[iNext] || {}).style === 'Heading2',
        wholePara: norm(p1.text || '') === norm(src.para1) && src.para1Lines >= 3,
        bold: (p2.bold || []).includes('bold words') && !(p2.bold || []).some(t => /second paragraph/.test(t)),
        hyphen: /\breconstruction of the text\b/.test(p2.text || '') && /three lines in the PDF\.$/.test(p2.text || ''),
        pageBreak: !!(P[iNext] || {}).pageBreak && P.filter(p => p.pageBreak).length === 1,
        lists: bullets.length === 2 && bullets.every(p => p.numId && !/•/.test(p.text)) && numbered.length === 3 &&
          numbered.every(p => p.numId === numbered[0].numId) && bullets[0].numId !== numbered[0].numId,
        media: r.media.length === 1 && /image\/png|\.png/.test(r.rels) && /\.png$/.test(r.media[0]),
        pageSize: r.sizes.length === 1 && r.sizes[0] === '12240x15840',
        name: r.name === 'report.docx',
        summary: /paragraphs/.test(summary) && /headings/.test(summary) && /OCR not used/.test(summary)
      };
      const failed = Object.keys(checks).filter(k => !checks[k]);
      return ok(!failed.length, { failed, paras: P.map(p => (p.style ? '[' + p.style + '] ' : '') + (p.numId ? '#' + p.numId + ' ' : '') + (p.pageBreak ? '(break) ' : '') + (p.drawings ? '<img> ' : '') + p.text.slice(0, 50)), bad: r.bad, sizes: r.sizes });
    }
  },
  {
    name: 'pdf-to-word: exact look gives one full-page picture per page', tool: 'pdf-to-word',
    run: async (page) => {
      const doc = await PDFLib.PDFDocument.create();
      const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
      doc.addPage([612, 792]).drawText('Page one', { x: 72, y: 700, size: 20, font });
      doc.addPage([842, 595]).drawText('Page two, landscape', { x: 72, y: 500, size: 20, font });
      await page.setInputFiles(FILE, pdfFile(Buffer.from(await doc.save()), 'two.pdf'));
      await btn(page, 'Convert to Word').waitFor({ timeout: 30000 });
      await page.locator('#view .chip', { hasText: /^Exact look$/ }).click();
      const note = (await page.innerText('#view')).replace(/\s+/g, ' ');
      const r = await convert(page);
      const drawings = r.paras.reduce((n, p) => n + p.drawings, 0);
      const good = !r.bad.length && r.structure && r.media.length === 2 && r.media.every(m => /\.jpeg$/.test(m)) && drawings === 2 &&
        r.sizes.join() === '12240x15840,16840x11900' && !r.paras.some(p => p.text) && /cannot be edited/.test(note) && r.name === 'two.docx';
      return ok(good, { media: r.media, drawings, sizes: r.sizes, bad: r.bad });
    }
  },
  {
    name: 'pdf-to-word: two columns read in order, and bullets drawn as shapes become a list', tool: 'pdf-to-word',
    run: async (page) => {
      const doc = await PDFLib.PDFDocument.create();
      const reg = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
      const bold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
      const p = doc.addPage([612, 792]);
      p.drawText('Newsletter', { x: 72, y: 720, size: 20, font: bold });
      /* One sentence-free stream of words, so the break between the columns falls mid-sentence. */
      const words = 'river stone meadow lantern harbour willow orchard beacon valley thistle copper meadowlark'.split(' ');
      const stream = Array.from({ length: 150 }, (_, i) => words[(i * 7) % words.length]).join(' ') + ' and that is the end.';
      const lines = wrap(reg, 10, stream, 220);
      const half = Math.ceil(lines.length / 2);
      lines.forEach((t, i) => p.drawText(t, { x: i < half ? 72 : 320, y: 680 - (i % half) * 13, size: 10, font: reg }));
      let y = 680 - (half - 1) * 13 - 32;
      for (const t of ['Water bottle', 'Walking boots', 'A warm coat']) {
        p.drawCircle({ x: 80, y: y + 3.5, size: 2, color: PDFLib.rgb(0, 0, 0) });
        p.drawText(t, { x: 90, y, size: 10, font: reg });
        y -= 13;
      }
      await page.setInputFiles(FILE, pdfFile(Buffer.from(await doc.save()), 'columns.pdf'));
      await btn(page, 'Convert to Word').waitFor({ timeout: 30000 });
      const r = await convert(page);
      const P = r.paras.filter(p => p.text);
      const items = P.slice(2);
      const good = !r.bad.length && P.length === 5 && P[0].text === 'Newsletter' && P[0].style === 'Heading1' &&
        norm(P[1].text) === norm(stream) && lines.length >= 20 &&
        items.map(p => p.text).join('|') === 'Water bottle|Walking boots|A warm coat' && items.every(p => p.numId && p.numId === items[0].numId);
      return ok(good, { count: P.length, paras: P.map(p => (p.numId ? '#' + p.numId + ' ' : '') + p.text.slice(0, 40) + '…' + p.text.slice(-20)), lines: lines.length });
    }
  },
  {
    name: 'pdf-to-word: a page with no text layer offers OCR and reads it', tool: 'pdf-to-word',
    run: async (page) => {
      const png = await pngFromPage(page, 1275, 1650, "x.fillStyle='#fff';x.fillRect(0,0,w,h);x.fillStyle='#000';x.font='bold 90px Arial';x.fillText('HELLO SCANNED',120,300);x.fillText('WORLD 2026',120,450);");
      const doc = await PDFLib.PDFDocument.create();
      const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
      doc.addPage([612, 792]).drawText('Typed first page', { x: 72, y: 700, size: 14, font });
      const img = await doc.embedPng(png);
      doc.addPage([612, 792]).drawImage(img, { x: 0, y: 0, width: 612, height: 792 });
      await page.setInputFiles(FILE, pdfFile(Buffer.from(await doc.save()), 'scan.pdf'));
      await btn(page, 'Convert to Word').waitFor({ timeout: 30000 });
      const box = page.locator('#view [data-k="ocr"]');
      const offered = await box.isVisible() && await box.locator('input').isChecked() && /1 page of 2 has no text layer/.test(await box.innerText());
      const r = await convert(page);
      const text = r.paras.map(p => p.text).join('\n');
      const summary = (await page.innerText('#view')).replace(/\s+/g, ' ');
      const good = offered && !r.bad.length && /Typed first page/.test(text) && /HELLO/.test(text) && /WORLD/.test(text) &&
        /OCR used on 1 page/.test(summary) && r.media.length === 0 && r.paras.some(p => p.pageBreak && /HELLO/.test(p.text));
      return ok(good, { offered, text: text.slice(0, 120), media: r.media, summary: (summary.match(/OCR (used|not used|could not)[^.]*\./) || [])[0] });
    }
  }
];
