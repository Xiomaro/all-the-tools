/* Behaviour checks for Word to PDF and Excel to PDF. The fixtures are built
   here: a .docx zipped with JSZip (heading, bold text, a nested bulleted
   list, a bordered table with a merged cell, a picture, £ and Greek text, a
   page break and a footer with page numbers), and workbooks written with
   SheetJS. Each is uploaded with setInputFiles, the PDF downloaded, and
   checked with pdf-lib (page count, page size, fonts) and the app's own
   pdf.js (the text on each page). */
'use strict';

const fs = require('fs');
const zlib = require('zlib');
const PDFLib = require('pdf-lib');
const JSZip = require('jszip');
const XLSX = require('xlsx');

const FILE = '#view input[type=file]';
const ok = (cond, detail) => ({ ok: !!cond, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const btn = (page, name) => page.getByRole('button', { name, exact: true }).first();

async function download(page) {
  await btn(page, 'Download PDF').waitFor({ timeout: 60000 });
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), btn(page, 'Download PDF').click()]);
  const buf = fs.readFileSync(await dl.path());
  if (process.env.PDFOFFICE_DUMP) fs.writeFileSync(process.env.PDFOFFICE_DUMP.replace(/%s/, dl.suggestedFilename()), buf);
  return { name: dl.suggestedFilename(), buf };
}

/* Page sizes and the fonts named anywhere in the file. */
async function inspect(buf) {
  const doc = await PDFLib.PDFDocument.load(buf);
  const fonts = new Set();
  const { PDFDict, PDFName } = PDFLib;
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFDict && obj.get(PDFName.of('Type')) === PDFName.of('Font')) {
      const b = obj.get(PDFName.of('BaseFont'));
      if (b) fonts.add(b.toString().replace(/^\//, ''));
    }
  }
  return { sizes: doc.getPages().map(p => p.getSize()).map(s => [Math.round(s.width), Math.round(s.height)]), fonts: [...fonts] };
}

/* Text per page, read with the app's pdf.js. */
async function texts(page, buf) {
  return page.evaluate(async b64 => {
    const m = await window.PdfKit.libPdfjs();
    const data = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const pdf = await m.getDocument({ data }).promise;
    const out = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const tc = await (await pdf.getPage(i)).getTextContent();
      out.push(tc.items.map(it => it.str).join(' ').replace(/\s+/g, ' ').trim());
    }
    return out;
  }, buf.toString('base64'));
}

/* A small solid PNG, written by hand. */
function png(w, h, rgb) {
  const crc = (buf) => { let c, crcv = 0xFFFFFFFF; for (const b of buf) { c = (crcv ^ b) & 0xFF; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crcv = (crcv >>> 8) ^ c; } return (crcv ^ 0xFFFFFFFF) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set(rgb, y * (w * 3 + 1) + 1 + x * 3);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
const run = (text, rpr = '') => `<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}<w:t xml:space="preserve">${text}</w:t></w:r>`;
const para = (inner, ppr = '') => `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ''}${inner}</w:p>`;
const bullet = (text, lvl) => para(run(text), `<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="${lvl}"/><w:numId w:val="1"/></w:numPr>`);
const cell = (text, extra = '') => `<w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/>${extra}</w:tcPr>${para(run(text))}</w:tc>`;

async function makeDocx() {
  const border = v => `<w:${v} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`;
  const table = `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(border).join('')}</w:tblBorders></w:tblPr>` +
    `<w:tblGrid><w:gridCol w:w="4500"/><w:gridCol w:w="4500"/></w:tblGrid>` +
    `<w:tr><w:trPr><w:tblHeader/></w:trPr>${cell('Item')}${cell('Price')}</w:tr>` +
    `<w:tr>${cell('Tea')}${cell('£1.50')}</w:tr>` +
    `<w:tr><w:tc><w:tcPr><w:tcW w:w="9000" w:type="dxa"/><w:gridSpan w:val="2"/><w:shd w:val="clear" w:fill="EEEEEE"/></w:tcPr>${para(run('Merged total row'))}</w:tc></w:tr></w:tbl>`;
  const picture = `<w:r><w:drawing><wp:inline><wp:extent cx="1270000" cy="635000"/><wp:docPr id="1" name="Picture 1"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="red.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1270000" cy="635000"/></a:xfrm><a:prstGeom prst="rect"/></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  const body = [
    para(run('Quarterly Report'), '<w:pStyle w:val="Heading1"/>'),
    para(run('This paragraph has ') + run('bold words', '<w:b/>') + run(' and costs £12.50 – “quoted” in a café.')),
    bullet('First bullet', 0), bullet('Second bullet', 0), bullet('Nested bullet', 1),
    table,
    para(run('Greek letters: αβγ Ω')),
    para(picture),
    para('<w:r><w:br w:type="page"/></w:r>'),
    para(run('Second page text')),
    '<w:sectPr><w:footerReference w:type="default" r:id="rIdFtr"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>'
  ].join('');
  const footer = `<w:ftr ${NS}>${para(run('Page ') + '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>' + run('1') +
    '<w:r><w:fldChar w:fldCharType="end"/></w:r>' + run(' of ') + '<w:fldSimple w:instr=" NUMPAGES ">' + run('1') + '</w:fldSimple>', '<w:jc w:val="center"/>')}</w:ftr>`;
  const styles = `<w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault>` +
    `<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>` +
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>` +
    `<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="2F5496"/><w:sz w:val="32"/></w:rPr></w:style>` +
    `<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="720"/><w:contextualSpacing/></w:pPr></w:style></w:styles>`;
  const lvl = (i, ch, font) => `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="${ch}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 * (i + 1)}" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:hint="default"/></w:rPr></w:lvl>`;
  const numbering = `<w:numbering ${NS}><w:abstractNum w:abstractNumId="0">${lvl(0, '', 'Symbol')}${lvl(1, 'o', 'Courier New')}</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`;
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body}</w:body></w:document>`);
  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8"?>${styles}`);
  zip.file('word/numbering.xml', `<?xml version="1.0" encoding="UTF-8"?>${numbering}`);
  zip.file('word/footer1.xml', `<?xml version="1.0" encoding="UTF-8"?>${footer}`);
  zip.file('word/media/image1.png', png(40, 20, [220, 30, 30]));
  zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '<Relationship Id="rIdNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>' +
    '<Relationship Id="rIdFtr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' +
    '<Relationship Id="rIdImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/></Relationships>');
  return zip.generateAsync({ type: 'nodebuffer' });
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function makeXlsx() {
  const sales = [['Product', 'Region', 'Price']];
  for (let i = 1; i <= 140; i++) sales.push(['Item ' + i, i % 2 ? 'North' : 'South', i * 1.25]);
  const ws = XLSX.utils.aoa_to_sheet(sales);
  for (let r = 2; r <= 141; r++) ws['C' + r].z = '"£"#,##0.00';
  ws['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 12 }];
  const notes = XLSX.utils.aoa_to_sheet([['Secret notes sheet'], ['Should not appear']]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sales');
  XLSX.utils.book_append_sheet(wb, notes, 'Notes');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = [
  {
    name: 'word-to-pdf: heading, bold, nested list, table, picture, £ and Greek on the document\'s Letter pages, with footer page numbers', tool: 'word-to-pdf',
    run: async (page) => {
      await page.setInputFiles(FILE, { name: 'report.docx', mimeType: DOCX_MIME, buffer: await makeDocx() });
      const { name, buf } = await download(page);
      const info = await inspect(buf);
      const t = await texts(page, buf);
      const all = t.join(' | ');
      await page.locator('#view .po-page canvas').first().waitFor({ timeout: 30000 });
      const want = ['Quarterly Report', 'bold words', '£12.50', '“quoted”', 'café', 'First bullet', 'Nested bullet', 'Item', 'Price', 'Tea', '£1.50', 'Merged total row', 'αβγ', 'Ω'];
      const missing = want.filter(w => !t[0] || !t[0].includes(w));
      return ok(name === 'report.pdf' && info.sizes.length === 2 && info.sizes.every(s => s[0] === 612 && s[1] === 792) && !missing.length &&
        /•/.test(t[0]) && t[1].includes('Second page text') && t[0].includes('Page 1 of 2') && t[1].includes('Page 2 of 2') &&
        info.fonts.includes('Helvetica-Bold') && info.fonts.some(f => /DejaVuSans/.test(f)),
        { name, sizes: info.sizes, fonts: info.fonts, missing, text: all.slice(0, 400) });
    }
  },
  {
    name: 'word-to-pdf: choosing A4 re-lays the document on A4 pages', tool: 'word-to-pdf',
    run: async (page) => {
      await page.setInputFiles(FILE, { name: 'report.docx', mimeType: DOCX_MIME, buffer: await makeDocx() });
      await btn(page, 'Download PDF').waitFor({ timeout: 60000 });
      await page.selectOption('#view select[data-k=paper]', 'A4');
      const { buf } = await download(page);
      const info = await inspect(buf);
      const t = await texts(page, buf);
      return ok(info.sizes.length >= 1 && info.sizes.every(s => s[0] === 595 && s[1] === 842) && t.join(' ').includes('Second page text'), { sizes: info.sizes });
    }
  },
  {
    name: 'word-to-pdf: an old binary .doc file gets a clear message', tool: 'word-to-pdf',
    run: async (page) => {
      const ole = Buffer.concat([Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]), Buffer.alloc(504)]);
      await page.setInputFiles(FILE, { name: 'old.doc', mimeType: 'application/msword', buffer: ole });
      const msg = page.locator('#view .note.err').first();
      await msg.waitFor({ timeout: 15000 });
      const text = await msg.textContent();
      return ok(/97–2003/.test(text) && /save it as \.docx/.test(text) && !(await btn(page, 'Download PDF').isVisible()), text);
    }
  },
  {
    name: 'excel-to-pdf: one chosen sheet, landscape, header row repeated, £ values', tool: 'excel-to-pdf',
    run: async (page) => {
      await page.setInputFiles(FILE, { name: 'sales.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: makeXlsx() });
      await btn(page, 'Download PDF').waitFor({ timeout: 60000 });
      await page.getByLabel('Notes', { exact: true }).uncheck();
      await page.selectOption('#view select[data-k=orient]', 'landscape');
      const { name, buf } = await download(page);
      const info = await inspect(buf);
      const t = await texts(page, buf);
      const last = t[t.length - 1] || '';
      return ok(name === 'sales.pdf' && info.sizes.length >= 3 && info.sizes.every(s => s[0] > s[1]) &&
        t.every(p => /Product Region Price/.test(p)) && t[0].includes('£1.25') && last.includes('Item 140') && last.includes('£175.00') &&
        !t.join(' ').includes('Secret notes') && t[0].includes('Page 1 of ' + t.length),
        { name, sizes: info.sizes, pages: t.length, first: t[0].slice(0, 160), last: last.slice(-160) });
    }
  },
  {
    name: 'excel-to-pdf: a UTF-8 CSV keeps accents, symbols and every row', tool: 'excel-to-pdf',
    run: async (page) => {
      const csv = 'Name,City,Amount\nZoë,Köln,£5\nRenée,São Paulo,€7\nŁukasz,Kraków,10\n';
      await page.setInputFiles(FILE, { name: 'people.csv', mimeType: 'text/csv', buffer: Buffer.from(csv, 'utf8') });
      const { buf } = await download(page);
      const info = await inspect(buf);
      const all = (await texts(page, buf)).join(' ');
      const want = ['Name', 'Zoë', 'Köln', '£5', 'Renée', 'São Paulo', '€7', 'Łukasz', 'Kraków'];
      return ok(info.sizes.length === 1 && want.every(w => all.includes(w)), { missing: want.filter(w => !all.includes(w)), all: all.slice(0, 200) });
    }
  }
];
