/* Behaviour checks for the pdf-file group (PDF tools + File tools).
   Fixtures are built here with pdf-lib / SheetJS / a small PDF encryptor, fed
   in with setInputFiles, and results are read back from real downloads. */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const PDFLib = require('pdf-lib');
const JSZip = require('jszip');

const FILE = '#view input[type=file]';

/* --- fixtures ---------------------------------------------------------------- */

async function makePdf(pages, opts = {}) {
  const doc = await PDFLib.PDFDocument.create();
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const words = ['one', 'two', 'three', 'four', 'five', 'six'];
  for (let i = 0; i < pages; i++) {
    const size = opts.size || [612, 792];
    const p = doc.addPage(size);
    p.drawText(opts.text ? opts.text(i) : 'Hello page ' + words[i], { x: 72, y: size[1] - 100, size: 24, font });
    if (opts.red) p.drawRectangle({ x: 100, y: 100, width: 200, height: 200, color: PDFLib.rgb(1, 0, 0) });
  }
  if (opts.title) doc.setTitle(opts.title);
  if (opts.author) doc.setAuthor(opts.author);
  if (opts.image) {
    const img = await doc.embedPng(opts.image);
    doc.getPage(0).drawImage(img, { x: 50, y: 50, width: 500, height: 500 });
  }
  return Buffer.from(await doc.save({ useObjectStreams: opts.objectStreams !== false }));
}

const pdfFile = (buffer, name = 'sample.pdf') => ({ name, mimeType: 'application/pdf', buffer });

async function load(buf) { return PDFLib.PDFDocument.load(buf, { updateMetadata: false }); }

/* --- a tiny Standard-security-handler encryptor (RC4-128, AES-128, AES-256) --- */

const PAD = Buffer.from('28BF4E5E4E758A4164004E56FFFA01082E2E00B6D0683E802F0CA9FE6453697A', 'hex');
const md5 = b => crypto.createHash('md5').update(b).digest();
function rc4(key, data) {
  const s = [...Array(256).keys()]; let j = 0;
  for (let i = 0; i < 256; i++) { j = (j + s[i] + key[i % key.length]) & 255; [s[i], s[j]] = [s[j], s[i]]; }
  const out = Buffer.alloc(data.length); let i = 0; j = 0;
  for (let k = 0; k < data.length; k++) { i = (i + 1) & 255; j = (j + s[i]) & 255; [s[i], s[j]] = [s[j], s[i]]; out[k] = data[k] ^ s[(s[i] + s[j]) & 255]; }
  return out;
}
const padPw = pw => Buffer.concat([Buffer.from(pw, 'latin1'), PAD]).subarray(0, 32);
function aesCbc(bits, key, iv, data, pad) {
  const c = crypto.createCipheriv('aes-' + bits + '-cbc', key, iv); c.setAutoPadding(pad);
  return Buffer.concat([c.update(data), c.final()]);
}
function hash2B(pw, salt, udata) {
  let k = crypto.createHash('sha256').update(Buffer.concat([pw, salt, udata])).digest();
  let round = 0, e;
  for (;;) {
    const unit = Buffer.concat([pw, k, udata]);
    const k1 = Buffer.concat(Array(64).fill(unit));
    e = aesCbc(128, k.subarray(0, 16), k.subarray(16, 32), k1, false);
    let sum = 0; for (let i = 0; i < 16; i++) sum += e[i];
    k = crypto.createHash(['sha256', 'sha384', 'sha512'][sum % 3]).update(e).digest();
    round++;
    if (round >= 64 && e[e.length - 1] <= round - 32) break;
  }
  return k.subarray(0, 32);
}

async function encryptPdf(bytes, { user = '', owner = 'owner-pw', mode = 'rc4' }) {
  const L = PDFLib;
  const doc = await L.PDFDocument.load(bytes, { updateMetadata: false });
  const ctx = doc.context;
  const id0 = crypto.randomBytes(16);
  ctx.trailerInfo.ID = ctx.obj([L.PDFHexString.of(id0.toString('hex')), L.PDFHexString.of(id0.toString('hex'))]);
  const P = -1044;
  const Pb = Buffer.alloc(4); Pb.writeInt32LE(P);
  let fileKey, encDict, objKey;

  if (mode === 'aes256') {
    fileKey = crypto.randomBytes(32);
    const uvs = crypto.randomBytes(8), uks = crypto.randomBytes(8), ovs = crypto.randomBytes(8), oks = crypto.randomBytes(8);
    const up = Buffer.from(user, 'utf8'), op = Buffer.from(owner, 'utf8');
    const U = Buffer.concat([hash2B(up, uvs, Buffer.alloc(0)), uvs, uks]);
    const UE = aesCbc(256, hash2B(up, uks, Buffer.alloc(0)), Buffer.alloc(16), fileKey, false);
    const O = Buffer.concat([hash2B(op, ovs, U), ovs, oks]);
    const OE = aesCbc(256, hash2B(op, oks, U), Buffer.alloc(16), fileKey, false);
    const permsPlain = Buffer.concat([Pb, Buffer.from([255, 255, 255, 255]), Buffer.from('Tadb'), crypto.randomBytes(4)]);
    const ecb = crypto.createCipheriv('aes-256-ecb', fileKey, null); ecb.setAutoPadding(false);
    const Perms = Buffer.concat([ecb.update(permsPlain), ecb.final()]);
    encDict = ctx.obj({
      Filter: 'Standard', V: 5, R: 6, Length: 256, P,
      CF: { StdCF: { AuthEvent: 'DocOpen', CFM: 'AESV3', Length: 32 } }, StmF: 'StdCF', StrF: 'StdCF',
      O: L.PDFHexString.of(O.toString('hex')), U: L.PDFHexString.of(U.toString('hex')),
      OE: L.PDFHexString.of(OE.toString('hex')), UE: L.PDFHexString.of(UE.toString('hex')),
      Perms: L.PDFHexString.of(Perms.toString('hex'))
    });
    objKey = () => fileKey;
  } else {
    const aes = mode === 'aes128';
    let ok = md5(padPw(owner));
    for (let i = 0; i < 50; i++) ok = md5(ok);
    let O = rc4(ok, padPw(user));
    for (let i = 1; i <= 19; i++) O = rc4(Buffer.from(ok.map(b => b ^ i)), O);
    let key = md5(Buffer.concat([padPw(user), O, Pb, id0]));
    for (let i = 0; i < 50; i++) key = md5(key.subarray(0, 16));
    fileKey = key.subarray(0, 16);
    let Uv = rc4(fileKey, md5(Buffer.concat([PAD, id0])));
    for (let i = 1; i <= 19; i++) Uv = rc4(Buffer.from(fileKey.map(b => b ^ i)), Uv);
    const U = Buffer.concat([Uv, crypto.randomBytes(16)]);
    encDict = ctx.obj(aes
      ? { Filter: 'Standard', V: 4, R: 4, Length: 128, P, CF: { StdCF: { AuthEvent: 'DocOpen', CFM: 'AESV2', Length: 16 } }, StmF: 'StdCF', StrF: 'StdCF',
          O: L.PDFHexString.of(O.toString('hex')), U: L.PDFHexString.of(U.toString('hex')) }
      : { Filter: 'Standard', V: 2, R: 3, Length: 128, P, O: L.PDFHexString.of(O.toString('hex')), U: L.PDFHexString.of(U.toString('hex')) });
    objKey = ref => {
      const extra = Buffer.from([ref.objectNumber & 255, (ref.objectNumber >> 8) & 255, (ref.objectNumber >> 16) & 255, ref.generationNumber & 255, 0]);
      return md5(Buffer.concat([fileKey, extra, aes ? Buffer.from('sAlT') : Buffer.alloc(0)])).subarray(0, 16);
    };
  }
  const aesMode = mode !== 'rc4';
  const enc = (ref, data) => aesMode
    ? (() => { const iv = crypto.randomBytes(16); return Buffer.concat([iv, aesCbc(mode === 'aes256' ? 256 : 128, objKey(ref), iv, data, true)]); })()
    : rc4(objKey(ref), data);
  const walk = (o, ref) => {
    if (o instanceof L.PDFString || o instanceof L.PDFHexString) return L.PDFHexString.of(enc(ref, Buffer.from(o.asBytes())).toString('hex'));
    if (o instanceof L.PDFArray) { for (let i = 0; i < o.size(); i++) o.set(i, walk(o.get(i), ref)); return o; }
    if (o instanceof L.PDFDict) { for (const [k, v] of o.entries()) o.set(k, walk(v, ref)); return o; }
    return o;
  };
  for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
    if (obj instanceof L.PDFRawStream) {
      walk(obj.dict, ref);
      ctx.assign(ref, L.PDFRawStream.of(obj.dict, enc(ref, Buffer.from(obj.contents))));
    } else if (obj instanceof L.PDFStream) {
      throw new Error('unexpected unparsed stream');
    } else ctx.assign(ref, walk(obj, ref));
  }
  ctx.trailerInfo.Encrypt = ctx.register(encDict);
  return Buffer.from(await doc.save({ useObjectStreams: false, updateFieldAppearances: false }));
}

/* A hand-assembled RC4-128 file whose catalog, pages and font live in an
   encrypted object stream, indexed by a cross-reference stream. */
function objStmEncryptedPdf(user, owner = 'owner-pw') {
  const id0 = crypto.randomBytes(16);
  const P = -1044, Pb = Buffer.alloc(4); Pb.writeInt32LE(P);
  let ok = md5(padPw(owner));
  for (let i = 0; i < 50; i++) ok = md5(ok);
  let O = rc4(ok, padPw(user));
  for (let i = 1; i <= 19; i++) O = rc4(Buffer.from(ok.map(b => b ^ i)), O);
  let key = md5(Buffer.concat([padPw(user), O, Pb, id0]));
  for (let i = 0; i < 50; i++) key = md5(key.subarray(0, 16));
  key = key.subarray(0, 16);
  let Uv = rc4(key, md5(Buffer.concat([PAD, id0])));
  for (let i = 1; i <= 19; i++) Uv = rc4(Buffer.from(key.map(b => b ^ i)), Uv);
  const U = Buffer.concat([Uv, Buffer.alloc(16)]);
  const objKey = n => md5(Buffer.concat([key, Buffer.from([n & 255, (n >> 8) & 255, (n >> 16) & 255, 0, 0])])).subarray(0, 16);

  const content = Buffer.from('BT /F1 24 Tf 72 700 Td (Hello objstm) Tj ET', 'latin1');
  const inner = {
    1: '<< /Type /Catalog /Pages 2 0 R >>',
    2: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    3: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    5: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  };
  let head = '', body = '';
  const order = [1, 2, 3, 5];
  order.forEach(n => { head += n + ' ' + body.length + ' '; body += inner[n] + '\n'; });
  const stm = rc4(objKey(6), Buffer.from(head + body, 'latin1'));
  const c4 = rc4(objKey(4), content);

  const parts = [], offsets = {};
  let len = 0;
  const put = b => { b = Buffer.isBuffer(b) ? b : Buffer.from(b, 'latin1'); parts.push(b); len += b.length; };
  put('%PDF-1.5\n%\xE2\xE3\xCF\xD3\n');
  offsets[4] = len; put('4 0 obj\n<< /Length ' + c4.length + ' >>\nstream\n'); put(c4); put('\nendstream\nendobj\n');
  offsets[6] = len; put('6 0 obj\n<< /Type /ObjStm /N 4 /First ' + head.length + ' /Length ' + stm.length + ' >>\nstream\n'); put(stm); put('\nendstream\nendobj\n');
  offsets[8] = len; put('8 0 obj\n<< /Filter /Standard /V 2 /R 3 /Length 128 /P ' + P + ' /O <' + O.toString('hex') + '> /U <' + U.toString('hex') + '> >>\nendobj\n');
  offsets[7] = len;
  const rows = [];
  for (let n = 0; n < 9; n++) {
    const r = Buffer.alloc(7);
    if (n === 0) { r[0] = 0; r.writeUInt16BE(65535, 5); }
    else if (offsets[n] !== undefined) { r[0] = 1; r.writeUInt32BE(offsets[n], 1); }
    else if (order.includes(n)) { r[0] = 2; r.writeUInt32BE(6, 1); r.writeUInt16BE(order.indexOf(n), 5); }
    else { r[0] = 0; }
    rows.push(r);
  }
  const xref = Buffer.concat(rows);
  put('7 0 obj\n<< /Type /XRef /Size 9 /W [1 4 2] /Root 1 0 R /Encrypt 8 0 R /ID [<' + id0.toString('hex') + '> <' + id0.toString('hex') + '>] /Length ' + xref.length + ' >>\nstream\n');
  put(xref); put('\nendstream\nendobj\nstartxref\n' + offsets[7] + '\n%%EOF\n');
  return Buffer.concat(parts);
}

/* --- page helpers --------------------------------------------------------------- */

async function download(page, click) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), click()]);
  return { name: dl.suggestedFilename(), buf: fs.readFileSync(await dl.path()) };
}

const btn = (page, name, exact = true) => page.getByRole('button', { name, exact }).first();

/* Extract text (and optionally a pixel) from a PDF using the app's pdf.js. */
async function inPdfjs(page, buf, opts = {}) {
  return page.evaluate(async ({ b64, opts }) => {
    /* PdfKit's loader starts the worker with the polyfills pdf.js 6 needs. */
    const m = await window.PdfKit.libPdfjs();
    const data = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const pdf = await m.getDocument({ data, password: opts.password }).promise;
    const texts = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const p = await pdf.getPage(i);
      texts.push((await p.getTextContent()).items.map(it => it.str).join(' ').trim());
    }
    let pixel = null;
    if (opts.pixel) {
      const p = await pdf.getPage(opts.pixel.page || 1);
      const vp = p.getViewport({ scale: 1 });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      pixel = Array.from(c.getContext('2d').getImageData(opts.pixel.x, opts.pixel.y, 1, 1).data);
    }
    return { pages: pdf.numPages, texts, pixel };
  }, { b64: buf.toString('base64'), opts });
}

async function pngFromPage(page, w, h, draw) {
  const b64 = await page.evaluate(({ w, h, draw }) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    new Function('x', 'w', 'h', draw)(x, w, h);
    return c.toDataURL('image/png').split(',')[1];
  }, { w, h, draw });
  return Buffer.from(b64, 'base64');
}

const ok = (cond, detail) => ({ ok: !!cond, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const text = async (page) => (await page.innerText('#view')).replace(/\s+/g, ' ');

/* --- checks ------------------------------------------------------------------------ */

module.exports = [
  /* ---------------- PDF ---------------- */
  {
    name: 'pdf-merge: merges 2+3 pages in the chosen order', tool: 'pdf-merge',
    run: async (page) => {
      const a = await makePdf(2, { size: [300, 300] });
      const b = await makePdf(3, { size: [400, 500] });
      await page.setInputFiles(FILE, [pdfFile(a, 'a.pdf'), pdfFile(b, 'b.pdf')]);
      await page.getByText('Files to merge (2)').waitFor();
      await page.getByText('3 pages').waitFor();
      /* move b.pdf above a.pdf */
      await page.locator('.g-item').nth(1).getByRole('button', { name: '↑' }).click();
      await btn(page, 'Merge 2 PDFs').click();
      const { buf, name } = await download(page, () => btn(page, 'Download Merged PDF').click());
      const doc = await load(buf);
      const sizes = doc.getPages().map(p => Math.round(p.getWidth()));
      return ok(doc.getPageCount() === 5 && sizes.join() === '400,400,400,300,300' && name === 'merged.pdf', { pages: doc.getPageCount(), sizes, name });
    }
  },
  {
    name: 'pdf-split: all pages, every N and a range', tool: 'pdf-split',
    run: async (page) => {
      await page.setInputFiles(FILE, pdfFile(await makePdf(3)));
      await page.getByText('sample.pdf (3 pages)').waitFor();
      await btn(page, 'Split PDF').click();
      await page.getByText('Results (3 files)').waitFor();
      const zip = await download(page, () => btn(page, 'Download All').click());
      const z = await JSZip.loadAsync(zip.buf);
      const names = Object.keys(z.files).sort();
      const p2 = await load(await z.file('sample-page-2.pdf').async('nodebuffer'));
      await page.selectOption('#view select', 'every');
      await page.fill('#view input[type=number]', '2');
      await btn(page, 'Split PDF').click();
      await page.getByText('Results (2 files)').waitFor();
      const part1 = await download(page, () => page.locator('.g-item').first().getByRole('button', { name: '↓' }).click());
      await page.selectOption('#view select', 'range');
      await page.fill('#view input[type=text]', '3,1');
      await btn(page, 'Split PDF').click();
      await page.getByText('Results (1 file)').waitFor();
      const r = await download(page, () => page.locator('.g-item').first().getByRole('button', { name: '↓' }).click());
      const rt = await inPdfjs(page, r.buf);
      const good = names.join() === 'sample-page-1.pdf,sample-page-2.pdf,sample-page-3.pdf' && p2.getPageCount() === 1 &&
        (await load(part1.buf)).getPageCount() === 2 && part1.name === 'sample-part-1.pdf' &&
        rt.pages === 2 && /three/.test(rt.texts[0]) && /one/.test(rt.texts[1]);
      return ok(good, { names, part1: part1.name, range: rt.texts });
    }
  },
  {
    name: 'pdf-compress: re-encodes a large lossless image smaller', tool: 'pdf-compress',
    run: async (page) => {
      const png = await pngFromPage(page, 1600, 1600, `const g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,'#c33');g.addColorStop(1,'#33c');x.fillStyle=g;x.fillRect(0,0,w,h);
        for(let i=0;i<4000;i++){x.fillStyle='hsl('+(i*37%360)+',70%,50%)';x.fillRect((i*97)%w,(i*57)%h,9,9);}`);
      const src = await makePdf(1, { image: png });
      await page.setInputFiles(FILE, pdfFile(src, 'big.pdf'));
      await btn(page, 'Compress PDF').waitFor();
      await page.selectOption('#view select', 'high');
      await btn(page, 'Compress PDF').click();
      const { buf } = await download(page, () => btn(page, 'Download Compressed PDF').click());
      const doc = await load(buf);
      const t = await inPdfjs(page, buf);
      return ok(buf.length < src.length * 0.6 && doc.getPageCount() === 1 && /Hello page one/.test(t.texts[0]),
        { before: src.length, after: buf.length });
    }
  },
  {
    name: 'pdf-to-text: text, separators and counts', tool: 'pdf-to-text',
    run: async (page) => {
      await page.setInputFiles(FILE, pdfFile(await makePdf(2)));
      await page.waitForFunction(() => { const t = document.querySelector('#view textarea'); return t && t.value.length > 0; }, null, { timeout: 30000 });
      const value = await page.inputValue('#view textarea');
      const t = await text(page);
      const want = '--- Page 1 ---\nHello page one\n\n--- Page 2 ---\nHello page two';
      return ok(value === want && /14\s*words/.test(t) && /60\s*chars/.test(t), { value, stats: t.match(/\d+ ?pages.{0,40}/) && t.match(/\d+ ?pages.{0,40}/)[0] });
    }
  },
  {
    name: 'pdf-rotate: specific pages 1,3 by 90 degrees', tool: 'pdf-rotate',
    run: async (page) => {
      await page.setInputFiles(FILE, pdfFile(await makePdf(3)));
      await btn(page, 'Rotate PDF').waitFor();
      await page.locator('#view select').nth(1).selectOption('some');
      await page.fill('#view input[type=text]', '1,3');
      await btn(page, 'Rotate PDF').click();
      const { buf } = await download(page, () => btn(page, 'Download Rotated PDF').click());
      const rots = (await load(buf)).getPages().map(p => p.getRotation().angle);
      await page.locator('#view select').nth(0).selectOption('180');
      await page.locator('#view select').nth(1).selectOption('all');
      await btn(page, 'Rotate PDF').click();
      const all = (await load((await download(page, () => btn(page, 'Download Rotated PDF').click())).buf)).getPages().map(p => p.getRotation().angle);
      return ok(rots.join() === '90,0,90' && all.join() === '180,180,180', { rots, all });
    }
  },
  {
    name: 'pdf-watermark: text lands on every page', tool: 'pdf-watermark',
    run: async (page) => {
      await page.setInputFiles(FILE, pdfFile(await makePdf(2)));
      await btn(page, 'Apply Watermark').waitFor();
      await page.fill('#view input[placeholder=CONFIDENTIAL]', 'DRAFT COPY');
      await page.selectOption('#view select', 'br');
      await btn(page, 'Apply Watermark').click();
      const { buf, name } = await download(page, () => btn(page, 'Download Watermarked PDF').click());
      const t = await inPdfjs(page, buf);
      return ok(t.pages === 2 && t.texts.every(s => /DRAFT COPY/.test(s)) && name === 'sample-watermarked.pdf', t.texts);
    }
  },
  {
    name: 'pdf-page-numbers: "Page n of N" from a start number', tool: 'pdf-page-numbers',
    run: async (page) => {
      await page.setInputFiles(FILE, pdfFile(await makePdf(3)));
      await btn(page, 'Add Page Numbers').waitFor();
      await page.locator('#view input[type=number]').first().fill('5');
      await btn(page, 'Add Page Numbers').click();
      const { buf } = await download(page, () => btn(page, 'Download PDF').click());
      const t = await inPdfjs(page, buf);
      await page.locator('#view select').nth(1).selectOption('n-of');
      await page.locator('#view input[type=number]').first().fill('1');
      await btn(page, 'Add Page Numbers').click();
      const t2 = await inPdfjs(page, (await download(page, () => btn(page, 'Download PDF').click())).buf);
      return ok(/Page 5 of 7/.test(t.texts[0]) && /Page 7 of 7/.test(t.texts[2]) && /2 \/ 3/.test(t2.texts[1]), [t.texts, t2.texts]);
    }
  },
  {
    name: 'pdf-metadata: view and edit properties', tool: 'pdf-metadata',
    run: async (page) => {
      await page.setInputFiles(FILE, pdfFile(await makePdf(2, { title: 'Sample', author: 'Test' })));
      await page.getByText('Not set').first().waitFor();
      const view = await text(page);
      await btn(page, 'Edit').click();
      await page.fill('#view input[placeholder="PDF title"]', 'New Title');
      await page.fill('#view input[placeholder="PDF author"]', '');
      await page.fill('#view input[placeholder="PDF keywords"]', 'alpha, beta');
      await btn(page, 'Save Metadata').click();
      const { buf } = await download(page, () => btn(page, 'Download PDF').click());
      const d = await load(buf);
      return ok(/Title\s*Sample/.test(view) && /Author\s*Test/.test(view) && /Subject\s*Not set/.test(view) &&
        d.getTitle() === 'New Title' && d.getAuthor() === undefined && d.getKeywords() === 'alpha, beta',
        { title: d.getTitle(), author: d.getAuthor(), kw: d.getKeywords() });
    }
  },
  {
    name: 'pdf-unlock: RC4-128 with a user password', tool: 'pdf-unlock',
    run: async (page) => {
      const locked = await encryptPdf(await makePdf(2, { objectStreams: false, title: 'Secret doc' }), { user: 'secret', mode: 'rc4' });
      const sanity = await inPdfjs(page, locked, { password: 'secret' });
      await page.setInputFiles(FILE, pdfFile(locked, 'locked.pdf'));
      await page.getByText('needs its password').waitFor();
      await page.fill('#view input[type=password]', 'wrong');
      await btn(page, 'Unlock PDF').click();
      await page.getByText('not correct').waitFor();
      await page.fill('#view input[type=password]', 'secret');
      await btn(page, 'Unlock PDF').click();
      const { buf } = await download(page, () => btn(page, 'Download Unlocked PDF').click());
      const d = await load(buf);   /* pdf-lib throws on encrypted input */
      const t = await inPdfjs(page, buf);
      return ok(/Hello page one/.test(sanity.texts[0]) && d.getTitle() === 'Secret doc' && /Hello page two/.test(t.texts[1]) && !(await text(page)).includes('rasterised'),
        { title: d.getTitle(), texts: t.texts });
    }
  },
  {
    name: 'pdf-unlock: AES-256 (R6) owner-restricted, no password', tool: 'pdf-unlock',
    run: async (page) => {
      const locked = await encryptPdf(await makePdf(1, { objectStreams: false }), { user: '', owner: 'boss', mode: 'aes256' });
      const sanity = await inPdfjs(page, locked);
      await page.setInputFiles(FILE, pdfFile(locked, 'r6.pdf'));
      await page.getByText('No password needed').waitFor({ timeout: 30000 });
      await btn(page, 'Unlock PDF').click();
      const { buf } = await download(page, () => btn(page, 'Download Unlocked PDF').click());
      const d = await load(buf);
      const t = await inPdfjs(page, buf);
      return ok(/Hello page one/.test(sanity.texts[0]) && d.getPageCount() === 1 && /Hello page one/.test(t.texts[0]) && /AES-256/.test(await text(page)), t.texts);
    }
  },
  {
    name: 'pdf-unlock: AES-128 opened with the owner password', tool: 'pdf-unlock',
    run: async (page) => {
      const locked = await encryptPdf(await makePdf(1, { objectStreams: false }), { user: 'userpw', owner: 'ownerpw', mode: 'aes128' });
      await page.setInputFiles(FILE, pdfFile(locked, 'r4.pdf'));
      await btn(page, 'Unlock PDF').waitFor();
      await page.fill('#view input[type=password]', 'ownerpw');
      await btn(page, 'Unlock PDF').click();
      const { buf } = await download(page, () => btn(page, 'Download Unlocked PDF').click());
      const t = await inPdfjs(page, buf);
      return ok(/Hello page one/.test(t.texts[0]) && /owner password/.test(await text(page)), t.texts);
    }
  },
  {
    name: 'pdf-unlock: encrypted object stream + xref stream', tool: 'pdf-unlock',
    run: async (page) => {
      const locked = objStmEncryptedPdf('pw');
      const sanity = await inPdfjs(page, locked, { password: 'pw' });
      await page.setInputFiles(FILE, pdfFile(locked, 'objstm.pdf'));
      await btn(page, 'Unlock PDF').waitFor();
      await page.fill('#view input[type=password]', 'pw');
      await btn(page, 'Unlock PDF').click();
      const { buf } = await download(page, () => btn(page, 'Download Unlocked PDF').click());
      const d = await load(buf);
      const t = await inPdfjs(page, buf);
      return ok(/Hello objstm/.test(sanity.texts[0]) && d.getPageCount() === 1 && /Hello objstm/.test(t.texts[0]) && !(await text(page)).includes('rasterised'), t.texts);
    }
  },
  {
    name: 'pdf-rotate: owner-restricted input is edited transparently', tool: 'pdf-rotate',
    run: async (page) => {
      const locked = await encryptPdf(await makePdf(2, { objectStreams: false }), { user: '', mode: 'aes128' });
      await page.setInputFiles(FILE, pdfFile(locked));
      await btn(page, 'Rotate PDF').click();
      const { buf } = await download(page, () => btn(page, 'Download Rotated PDF').click());
      const d = await load(buf);
      const t = await inPdfjs(page, buf);
      return ok(d.getPages().every(p => p.getRotation().angle === 90) && /Hello page two/.test(t.texts[1]), t.texts);
    }
  },
  {
    name: 'pdf-grayscale: red becomes grey', tool: 'pdf-grayscale',
    run: async (page) => {
      await page.setInputFiles(FILE, pdfFile(await makePdf(2, { red: true })));
      await btn(page, 'Convert to Grayscale').waitFor();
      await btn(page, 'Convert to Grayscale').click();
      const { buf } = await download(page, () => btn(page, 'Download Grayscale PDF').click());
      const t = await inPdfjs(page, buf, { pixel: { x: 200, y: 792 - 200 } });
      const [r, g, b] = t.pixel;
      return ok(t.pages === 2 && Math.abs(r - g) <= 3 && Math.abs(g - b) <= 3 && r < 140, t.pixel);
    }
  },
  {
    name: 'pdf-crop: margins shrink the page box', tool: 'pdf-crop',
    run: async (page) => {
      await page.setInputFiles(FILE, pdfFile(await makePdf(2)));
      await btn(page, 'Crop PDF').waitFor();
      const inputs = page.locator('#view input[type=number]');
      await inputs.nth(0).fill('100');
      await inputs.nth(2).fill('50');
      await page.getByText('Result size: 562×692pt').waitFor();
      await btn(page, 'Crop PDF').click();
      const { buf } = await download(page, () => btn(page, 'Download Cropped PDF').click());
      const d = await load(buf);
      const b = d.getPage(1).getMediaBox();
      return ok(d.getPageCount() === 2 && b.x === 50 && b.y === 0 && b.width === 562 && b.height === 692, b);
    }
  },
  {
    name: 'redact-pdf: drawn box + text search, flattened output', tool: 'redact-pdf',
    run: async (page) => {
      await page.setInputFiles(FILE, pdfFile(await makePdf(2, { text: i => 'Account 555-1234 page ' + (i + 1) })));
      const pg = page.locator('.g-rpage').first();
      await btn(page, 'Apply & Download').waitFor({ timeout: 30000 });
      await pg.evaluate(e => e.scrollIntoView());
      const box = await pg.boundingBox();
      await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.7, { steps: 5 });
      await page.mouse.up();
      await page.fill('#view input[placeholder^="Find text"]', '555-1234');
      await btn(page, 'Black out matches').click();
      await page.getByText('3 boxes on 2 pages').waitFor();
      const { buf, name } = await download(page, () => btn(page, 'Apply & Download').click());
      /* x=0.75*612, y=0.6*792 is inside the drawn box */
      const t = await inPdfjs(page, buf, { pixel: { x: 459, y: 475 } });
      return ok(t.pages === 2 && t.texts.every(s => s === '') && t.pixel[0] < 30 && name === 'sample-redacted.pdf', { texts: t.texts, pixel: t.pixel });
    }
  },
  {
    name: 'document-scanner: finds the paper and builds an A4 PDF', tool: 'document-scanner',
    run: async (page) => {
      const png = await pngFromPage(page, 1200, 900, `x.fillStyle='#2b2b2b';x.fillRect(0,0,w,h);
        x.fillStyle='#f4f1ea';x.beginPath();x.moveTo(320,120);x.lineTo(860,90);x.lineTo(900,820);x.lineTo(300,800);x.closePath();x.fill();
        x.fillStyle='#111';x.font='40px sans-serif';x.fillText('Scanned text',420,400);`);
      await page.setInputFiles('#view input[type=file][multiple]', { name: 'photo.png', mimeType: 'image/png', buffer: png });
      await page.getByText('Adjust the new page').waitFor({ timeout: 20000 });
      const pts = await page.getAttribute('#view polygon', 'points');
      const nums = pts.split(/[ ,]+/).map(Number);
      const near = (x, y, X, Y) => Math.hypot(x - X, y - Y) < 30;
      const found = near(nums[0], nums[1], 320, 120) && near(nums[2], nums[3], 860, 90) && near(nums[4], nums[5], 900, 820) && near(nums[6], nums[7], 300, 800);
      await btn(page, 'Black & white').click();
      await btn(page, 'Add page').click();
      await page.getByRole('button', { name: /Download PDF \(1 page\)/ }).waitFor();
      const { buf, name } = await download(page, () => page.getByRole('button', { name: /Download PDF/ }).click());
      const d = await load(buf);
      const p = d.getPage(0);
      return ok(found && d.getPageCount() === 1 && Math.round(p.getWidth()) === 595 && Math.round(p.getHeight()) === 842 && /^Scan \d{4}-\d\d-\d\d\.pdf$/.test(name),
        { pts, size: [p.getWidth(), p.getHeight()], name });
    }
  },

  /* ---------------- File ---------------- */
  {
    name: 'zip-creator: archive holds the added files', tool: 'zip-creator',
    run: async (page) => {
      await page.setInputFiles(FILE, [
        { name: 'sample.txt', mimeType: 'text/plain', buffer: Buffer.from('Hello world\nSecond line\n') },
        { name: 'data.json', mimeType: 'application/json', buffer: Buffer.from('{"a":1}') }]);
      await page.getByText('2 files · 31B total').waitFor();
      await page.fill('#view input[aria-label="archive name"]', 'bundle');
      const { buf, name } = await download(page, () => btn(page, 'Create & Download ZIP').click());
      const z = await JSZip.loadAsync(buf);
      const s = await z.file('sample.txt').async('string');
      return ok(name === 'bundle.zip' && s === 'Hello world\nSecond line\n' && (await z.file('data.json').async('string')) === '{"a":1}', { name, files: Object.keys(z.files) });
    }
  },
  {
    name: 'csv-formatter: delimiter change and quote all', tool: 'csv-formatter',
    run: async (page) => {
      await page.waitForTimeout(300);
      const out = () => page.locator('#view textarea').nth(1).inputValue();
      const first = await out();
      await page.locator('#view select').nth(1).selectOption(';');
      await page.waitForTimeout(300);
      const semi = await out();
      await page.check('#view input[type=checkbox]');
      await page.waitForTimeout(300);
      const quoted = await out();
      const t = await text(page);
      return ok(first === 'Name,Age,City\nAlice,30,New York\nBob,25,"London, UK"\nCarol,35,Tokyo' &&
        semi === 'Name;Age;City\nAlice;30;New York\nBob;25;London, UK\nCarol;35;Tokyo' &&
        quoted.split('\n')[2] ==='"Bob";"25";"London, UK"' && /4 rows · 3 columns/.test(t), { semi, quoted });
    }
  },
  {
    name: 'json-to-table: cells, counts, CSV and errors', tool: 'json-to-table',
    run: async (page) => {
      await page.waitForTimeout(300);
      const cells = await page.locator('#view td').allTextContents();
      const t = await text(page);
      await page.fill('#view textarea', '[{"a":1,"b":{"c":2}},{"a":null,"d":[1,2]}]');
      await page.waitForTimeout(300);
      const cells2 = await page.locator('#view td').allTextContents();
      await page.fill('#view textarea', 'bad');
      await page.waitForTimeout(300);
      const err = await text(page);
      return ok(cells.slice(0, 3).join('|') === '"Alice"|30|"New York"' && /3 rows · 3 columns/.test(t) &&
        cells2.join('|') === '1|{"c":2}||null||[1,2]' && /SyntaxError/.test(err), { cells, cells2 });
    }
  },
  {
    name: 'excel-to-json: xlsx with two sheets, and CSV', tool: 'excel-to-json',
    run: async (page) => {
      const XLSX = require('xlsx');
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['name', 'age'], ['Ann', 31], ['Bob', 42]]), 'People');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['sku', 'qty'], ['X1', 5]]), 'Stock');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      await page.setInputFiles(FILE, { name: 'book.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: buf });
      await page.getByText('JSON Output').waitFor();
      await page.waitForFunction(() => document.querySelector('#view textarea').value.length > 0);
      const a = JSON.parse(await page.inputValue('#view textarea'));
      await page.selectOption('#view select', 'Stock');
      const b = JSON.parse(await page.inputValue('#view textarea'));
      await page.setInputFiles(FILE, { name: 'sample.csv', mimeType: 'text/csv', buffer: Buffer.from('name,age\nAnn,31\nBob,42\n') });
      await page.waitForFunction(() => document.querySelector('#view textarea').value.indexOf('"age": 31') > -1);
      const c = await page.inputValue('#view textarea');
      return ok(JSON.stringify(a) === '[{"name":"Ann","age":31},{"name":"Bob","age":42}]' && JSON.stringify(b) === '[{"sku":"X1","qty":5}]' &&
        c.startsWith('[\n  {\n    "name": "Ann",\n    "age": 31\n  },\n  {\n    "name": "Bob",\n    "age": 42'), { a, b });
    }
  },
  {
    name: 'sql-to-csv: sample, NULLs, escapes, several statements', tool: 'sql-to-csv',
    run: async (page) => {
      await page.waitForTimeout(300);
      const out = () => page.locator('#view textarea').nth(1).inputValue();
      const a = await out();
      await page.fill('#view textarea', "INSERT INTO `t` (`id`,`name`,`note`) VALUES (1,'O''Brien, J',NULL);\nINSERT INTO t (id, name, note) VALUES (2, 'say \\'hi\\'', 'x\"y');");
      await page.waitForTimeout(300);
      const b = await out();
      return ok(a === 'id,name,email,age\n1,Alice,alice@example.com,30\n2,Bob,bob@example.com,25\n3,Carol,carol@example.com,35' &&
        b === 'id,name,note\n1,"O\'Brien, J",\n2,say \'hi\',"x""y"', b);
    }
  },
  /* --------------------------------------------------------------- additions */
  {
    name: 'ocr: reads big text out of a PNG', tool: 'ocr',
    run: async (page) => {
      const png = await pngFromPage(page, 900, 200, "x.fillStyle='#fff';x.fillRect(0,0,w,h);x.fillStyle='#000';x.font='bold 64px Arial';x.fillText('HELLO WORLD 12345',30,120);");
      await page.setInputFiles(FILE, { name: 'shot.png', mimeType: 'image/png', buffer: png });
      await btn(page, 'Extract text').click();
      await page.waitForFunction(() => /HELLO/.test(document.querySelector('#view textarea').value) || /err/.test(document.querySelector('#view .progress .note').className), null, { timeout: 90000 });
      const value = await page.inputValue('#view textarea');
      const t = await text(page);
      return ok(value.trim() === 'HELLO WORLD 12345' && /\b3\s*words/.test(t) && /confidence/.test(t), { value, stats: (t.match(/\d+ words.{0,60}/) || [])[0] });
    }
  },
  {
    name: 'ocr: renders a PDF page and reads it, with page separators', tool: 'ocr',
    run: async (page) => {
      await page.setInputFiles(FILE, pdfFile(await makePdf(2, { text: i => i ? 'SECOND PAGE TEXT' : 'FIRST PAGE TEXT' })));
      await page.fill('#view input[placeholder="1-"]', '2');
      await btn(page, 'Extract text').click();
      await page.waitForFunction(() => /PAGE/.test(document.querySelector('#view textarea').value) || /err/.test(document.querySelector('#view .progress .note').className), null, { timeout: 90000 });
      const value = await page.inputValue('#view textarea');
      return ok(value.startsWith('--- Page 2 ---') && /SECOND PAGE TEXT/.test(value) && !/FIRST/.test(value), value.slice(0, 80));
    }
  },
  {
    name: 'pdf-to-images: 3 pages at 150 dpi become a ZIP of 3 PNGs', tool: 'pdf-to-images',
    run: async (page) => {
      await page.setInputFiles(FILE, pdfFile(await makePdf(3, { red: true })));
      await btn(page, 'Convert pages').waitFor();
      await btn(page, 'Convert pages').click();
      const { name, buf } = await download(page, () => btn(page, 'Download ZIP').click());
      const zip = await JSZip.loadAsync(buf);
      const names = Object.keys(zip.files).sort();
      const first = await zip.file(names[0]).async('nodebuffer');
      const dims = await page.evaluate(async b64 => {
        const bmp = await createImageBitmap(new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], { type: 'image/png' }));
        const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
        const g = c.getContext('2d'); g.drawImage(bmp, 0, 0);
        /* the red box sits at PDF (100..300, 100..300) from the bottom-left → sample its centre */
        const s = bmp.width / 612, px = g.getImageData(Math.round(200 * s), Math.round(bmp.height - 200 * s), 1, 1).data;
        return { w: bmp.width, h: bmp.height, px: Array.from(px) };
      }, first.toString('base64'));
      const thumbs = await page.locator('#view .g-thumb').count();
      return ok(name === 'sample-pages.zip' && names.join() === 'sample-page-1.png,sample-page-2.png,sample-page-3.png' && dims.w === 1275 && dims.h === 1650 && dims.px[0] > 240 && dims.px[1] < 20 && thumbs === 3, { name, names, dims, thumbs });
    }
  },
  {
    name: 'pdf-to-images: a single JPEG page downloads directly', tool: 'pdf-to-images',
    run: async (page) => {
      await page.setInputFiles(FILE, pdfFile(await makePdf(2)));
      await btn(page, 'Convert pages').waitFor();
      await page.locator('#view select').nth(0).selectOption('image/jpeg');
      await page.locator('#view select').nth(1).selectOption('72');
      await page.fill('#view input[type=text]', '2');
      await btn(page, 'Convert pages').click();
      const { name, buf } = await download(page, () => btn(page, 'Download JPG').click());
      return ok(name === 'sample-page-2.jpg' && buf[0] === 0xff && buf[1] === 0xd8, { name, head: buf.slice(0, 3).toString('hex') });
    }
  },
  {
    name: 'file-type-identifier: PNG called .jpg is caught, CSV and ZIP-based docx recognised', tool: 'file-type-identifier',
    run: async (page) => {
      const png = await pngFromPage(page, 64, 48, "x.fillStyle='#0f0';x.fillRect(0,0,w,h);");
      await page.setInputFiles(FILE, { name: 'holiday.jpg', mimeType: 'image/jpeg', buffer: png });
      await page.waitForSelector('#view [data-k="type"]');
      const t1 = await page.$eval('#view [data-k="type"]', n => n.textContent), v1 = await page.$eval('#view [data-k="verdict"]', n => n.textContent);
      await page.setInputFiles(FILE, { name: 'data.csv', mimeType: 'text/csv', buffer: Buffer.from('name,age,city\nAda,36,London\nBob,41,Leeds\n') });
      await page.waitForFunction(() => document.querySelectorAll('#view [data-k="type"]').length === 2);
      const t2 = await page.$eval('#view [data-k="type"]', n => n.textContent);
      const zip = new JSZip(); zip.file('[Content_Types].xml', '<Types/>'); zip.file('word/document.xml', '<w:document/>');
      await page.setInputFiles(FILE, { name: 'letter.docx', mimeType: '', buffer: await zip.generateAsync({ type: 'nodebuffer' }) });
      await page.waitForFunction(() => document.querySelectorAll('#view [data-k="type"]').length === 3);
      const t3 = await page.$eval('#view [data-k="type"]', n => n.textContent);
      return ok(t1 === 'PNG image' && /Extension says \.jpg but the content is PNG image/.test(v1) && t2 === 'CSV table' && /^Word document/.test(t3), { t1, v1, t2, t3 });
    }
  },
  {
    name: 'hex-viewer: pasted text dumps as hex + ASCII and search jumps to an offset', tool: 'hex-viewer',
    run: async (page) => {
      await page.fill('#view textarea', 'Hello, hex!');
      await page.waitForTimeout(200);
      const dump = await page.$eval('#view pre.out', n => n.textContent);
      await page.fill('#view input[placeholder^="search"]', '68 65 78');
      await page.press('#view input[placeholder^="search"]', 'Enter');
      await page.waitForTimeout(200);
      const info = await page.$eval('#view [data-k="info"]', n => n.textContent);
      const pos = await page.evaluate(() => document.querySelector('#view .g-kv').innerText.replace(/\s+/g, ' '));
      return ok(/^00000000 {3}48 {2}65 {2}6c {2}6c {2}6f {2}2c {2}20 {2}68 {3}65 {2}78 {2}21/.test(dump) && dump.includes('|Hello, hex!|') && /found at 0x7/.test(info) && /Offset\s*7 \(0x7\)/.test(pos) && /Byte\s*0x68 = 104/.test(pos), { dump: dump.slice(0, 70), info, pos: pos.slice(0, 120) });
    }
  }
];
