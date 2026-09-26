/* Behaviour checks for pdf-b.js (Organise, Images to PDF, Protect, Sign,
   Forms, Extract Images, Compare). Fixtures are built here with pdf-lib and
   by hand (GIF, BMP, EXIF JPEG), or in the page with canvas; results are read
   back from real downloads with pdf-lib in Node and with the app's pdf.js. */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const zlib = require('zlib');
const PDFLib = require('pdf-lib');
const JSZip = require('jszip');

const FILE = '#view input[type=file]';

/* --- helpers ------------------------------------------------------------------ */

async function makePdf(texts, opts = {}) {
  const doc = await PDFLib.PDFDocument.create();
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  texts.forEach((t, i) => {
    const size = (opts.sizes && opts.sizes[i]) || [612, 792];
    const p = doc.addPage(size);
    if (t) p.drawText(t, { x: 40, y: size[1] - 80, size: 24, font });
    if (opts.rotate && opts.rotate[i]) p.setRotation(PDFLib.degrees(opts.rotate[i]));
    if (opts.draw) opts.draw(p, i, doc);
  });
  if (opts.title) doc.setTitle(opts.title);
  return Buffer.from(await doc.save({ useObjectStreams: opts.objectStreams !== false }));
}

const pdfFile = (buffer, name = 'sample.pdf') => ({ name, mimeType: 'application/pdf', buffer });
const load = buf => PDFLib.PDFDocument.load(buf, { updateMetadata: false });
const ok = (cond, detail) => ({ ok: !!cond, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const btn = (page, name, exact = true) => page.getByRole('button', { name, exact }).first();
const near = (a, b, tol = 0.02) => Math.abs(a - b) <= tol;
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');

async function download(page, click) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), click()]);
  return { name: dl.suggestedFilename(), buf: fs.readFileSync(await dl.path()) };
}

/* Text per page, and optionally pixels, read with the app's own pdf.js. */
async function inPdfjs(page, buf, opts = {}) {
  return page.evaluate(async ({ b64, opts }) => {
    const m = await window.PdfKit.libPdfjs();
    const data = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    let pdf;
    try { pdf = await m.getDocument({ data, password: opts.password }).promise; }
    catch (e) { return { error: e.name, code: e.code }; }
    const texts = [], items = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const p = await pdf.getPage(i);
      const tc = await p.getTextContent();
      texts.push(tc.items.map(it => it.str).join(' ').replace(/\s+/g, ' ').trim());
      items.push(tc.items.filter(it => it.str.trim()).map(it => ({ str: it.str, t: it.transform })));
    }
    const pixels = [];
    for (const px of opts.pixels || []) {
      const p = await pdf.getPage(px.page || 1);
      const vp = p.getViewport({ scale: 1 });
      const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
      await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      pixels.push(Array.from(c.getContext('2d').getImageData(Math.round(px.x), Math.round(px.y), 1, 1).data).slice(0, 3));
    }
    /* bounding box of dark pixels (r+g+b < 300) inside an optional region */
    const boxes = [];
    for (const q of opts.darkBoxes || []) {
      const p = await pdf.getPage(q.page || 1);
      const vp = p.getViewport({ scale: 1 });
      const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
      await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const r = q.region || [0, 0, c.width, c.height];
      let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
      for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) {
        const i = (y * c.width + x) * 4;
        if (d[i] + d[i + 1] + d[i + 2] < 300) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      boxes.push(x1 < 0 ? null : [x0, y0, x1, y1]);
    }
    let perms = null;
    try { perms = await pdf.getPermissions(); perms = perms ? Array.from(perms).sort((a, b) => a - b) : null; } catch (e) { perms = 'error'; }
    return { pages: pdf.numPages, texts, items, pixels, perms, boxes };
  }, { b64: buf.toString('base64'), opts });
}

/* Draw on a canvas in the page and return the encoded bytes. */
async function canvasImage(page, w, h, draw, type = 'image/png', quality = 0.95) {
  const b64 = await page.evaluate(({ w, h, draw, type, quality }) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    new Function('x', 'w', 'h', draw)(c.getContext('2d'), w, h);
    return c.toDataURL(type, quality).split(',')[1];
  }, { w, h, draw, type, quality });
  return Buffer.from(b64, 'base64');
}

/* Insert an EXIF APP1 segment carrying `orientation` after the JFIF APP0. */
function withExifOrientation(jpeg, orientation) {
  const tiff = Buffer.from([0x4D, 0x4D, 0x00, 0x2A, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0, 0, 0, 0, 0]);
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const seg = Buffer.concat([Buffer.from([0xFF, 0xE1, (payload.length + 2) >> 8, (payload.length + 2) & 255]), payload]);
  let at = 2;
  if (jpeg[2] === 0xFF && jpeg[3] === 0xE0) at = 4 + ((jpeg[4] << 8) | jpeg[5]);
  return Buffer.concat([jpeg.subarray(0, at), seg, jpeg.subarray(at)]);
}

/* A 4×4 GIF with two frames (red, then blue). Every code is preceded by a
   clear code so the LZW code size stays at 3 bits. */
function twoFrameGif() {
  const bits = [];
  const put = (v, n) => { for (let i = 0; i < n; i++) bits.push((v >> i) & 1); };
  const frame = (index) => {
    bits.length = 0;
    for (let i = 0; i < 16; i++) { put(4, 3); put(index, 3); }
    put(5, 3);
    const bytes = [];
    for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let k = 0; k < 8 && i + k < bits.length; k++) b |= bits[i + k] << k; bytes.push(b); }
    return Buffer.concat([
      Buffer.from([0x21, 0xF9, 4, 0, 10, 0, 0, 0]),             /* graphic control: 0.1 s */
      Buffer.from([0x2C, 0, 0, 0, 0, 4, 0, 4, 0, 0]),           /* image descriptor 4×4 */
      Buffer.from([2, bytes.length]), Buffer.from(bytes), Buffer.from([0])]);
  };
  return Buffer.concat([
    Buffer.from('GIF89a', 'latin1'), Buffer.from([4, 0, 4, 0, 0xF1, 0, 0]),
    Buffer.from([255, 0, 0, 0, 0, 255, 255, 255, 255, 0, 0, 0]),   /* palette: red, blue, white, black */
    frame(0), frame(1), Buffer.from([0x3B])]);
}

/* A 4×2 24-bit BMP filled with one colour (b, g, r). */
function solidBmp(bgr) {
  const w = 4, h = 2, row = w * 3, size = 54 + row * h;
  const b = Buffer.alloc(size);
  b.write('BM', 0, 'latin1'); b.writeUInt32LE(size, 2); b.writeUInt32LE(54, 10);
  b.writeUInt32LE(40, 14); b.writeInt32LE(w, 18); b.writeInt32LE(h, 22); b.writeUInt16LE(1, 26); b.writeUInt16LE(24, 28);
  b.writeUInt32LE(row * h, 34);
  for (let i = 54; i < size; i += 3) { b[i] = bgr[0]; b[i + 1] = bgr[1]; b[i + 2] = bgr[2]; }
  return b;
}

/* Content stream operators of page n (inflated). */
function pageContent(doc, n) {
  const c = doc.getPage(n).node.Contents();
  const streams = c instanceof PDFLib.PDFArray ? c.asArray().map(r => doc.context.lookup(r)) : [c];
  return streams.map(s => {
    const f = s.dict.lookup(PDFLib.PDFName.of('Filter'));
    return f ? zlib.inflateSync(Buffer.from(s.contents)).toString('latin1') : Buffer.from(s.contents).toString('latin1');
  }).join('\n');
}

/* The image XObjects drawn on page n, with their raw stream bytes. */
function pageImages(doc, n) {
  const res = doc.getPage(n).node.Resources();
  const xo = res && res.lookup(PDFLib.PDFName.of('XObject'));
  if (!xo) return [];
  return xo.entries().map(([name, ref]) => {
    const s = doc.context.lookup(ref);
    const d = s.dict;
    const get = k => d.lookup(PDFLib.PDFName.of(k));
    return {
      name: name.asString(), subtype: String(get('Subtype')), filter: String(get('Filter')),
      width: get('Width') && get('Width').asNumber(), height: get('Height') && get('Height').asNumber(),
      smask: !!get('SMask'), bytes: Buffer.from(s.contents)
    };
  });
}

/* --- independent Standard-security-handler maths (Node crypto) ------------------ */

const PAD = Buffer.from('28BF4E5E4E758A4164004E56FFFA01082E2E00B6D0683E802F0CA9FE6453697A', 'hex');
const md5 = b => crypto.createHash('md5').update(b).digest();
function rc4(key, data) {
  const s = [...Array(256).keys()]; let j = 0;
  for (let i = 0; i < 256; i++) { j = (j + s[i] + key[i % key.length]) & 255; [s[i], s[j]] = [s[j], s[i]]; }
  const out = Buffer.alloc(data.length); let i = 0; j = 0;
  for (let k = 0; k < data.length; k++) { i = (i + 1) & 255; j = (j + s[i]) & 255; [s[i], s[j]] = [s[j], s[i]]; out[k] = data[k] ^ s[(s[i] + s[j]) & 255]; }
  return out;
}
function aesRaw(mode, key, iv, data, decrypt) {
  const c = decrypt ? crypto.createDecipheriv(mode, key, iv) : crypto.createCipheriv(mode, key, iv);
  c.setAutoPadding(false);
  return Buffer.concat([c.update(data), c.final()]);
}
function hash2B(pw, salt, udata) {
  let k = crypto.createHash('sha256').update(Buffer.concat([pw, salt, udata])).digest();
  let round = 0, e;
  for (;;) {
    const k1 = Buffer.concat(Array(64).fill(Buffer.concat([pw, k, udata])));
    e = aesRaw('aes-128-cbc', k.subarray(0, 16), k.subarray(16, 32), k1);
    let sum = 0; for (let i = 0; i < 16; i++) sum += e[i];
    k = crypto.createHash(['sha256', 'sha384', 'sha512'][sum % 3]).update(e).digest();
    round++;
    if (round >= 64 && e[e.length - 1] <= round - 32) break;
  }
  return k.subarray(0, 32);
}
async function encryptInfo(buf) {
  const d = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true, updateMetadata: false });
  const enc = d.context.lookup(d.context.trailerInfo.Encrypt);
  const get = k => enc.lookup(PDFLib.PDFName.of(k));
  const bytes = k => Buffer.from(get(k).asBytes());
  const cf = get('CF'), std = cf && cf.lookup(PDFLib.PDFName.of('StdCF'));
  const id = d.context.lookup(d.context.trailerInfo.ID);
  return {
    V: get('V').asNumber(), R: get('R').asNumber(), P: get('P').asNumber(),
    cfm: std ? String(std.lookup(PDFLib.PDFName.of('CFM'))) : '', U: bytes('U'), O: bytes('O'),
    UE: get('UE') ? bytes('UE') : null, Perms: get('Perms') ? bytes('Perms') : null,
    id0: Buffer.from(id.lookup(0).asBytes())
  };
}
/* PdfUnlock (the Unlock PDF tool's engine) run in the page. */
async function unlockInPage(page, buf, password) {
  const r = await page.evaluate(async ({ b64, password }) => {
    await window.UI.script('assets/vendor/pdf-lib/pdf-lib.min.js');
    await window.UI.script('assets/js/lib/pdf-file-unlock.js');
    const data = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    try {
      const res = await window.PdfUnlock.decrypt(data, password);
      let s = ''; for (let i = 0; i < res.bytes.length; i += 32768) s += String.fromCharCode.apply(null, res.bytes.subarray(i, i + 32768));
      return { b64: btoa(s), method: res.method, usedOwner: res.usedOwner };
    } catch (e) { return { error: e.code || e.message }; }
  }, { b64: buf.toString('base64'), password });
  if (r.b64) r.buf = Buffer.from(r.b64, 'base64');
  return r;
}

/* Click at a fraction of an element's box, scrolling that point into view first. */
async function clickAt(page, locator, fx, fy) {
  let r = await locator.boundingBox();
  await page.evaluate(y => window.scrollBy(0, y - window.innerHeight / 2), r.y + r.height * fy);
  r = await locator.boundingBox();
  await page.mouse.click(r.x + r.width * fx, r.y + r.height * fy);
}

/* A two-page AcroForm with one field of every kind, built with pdf-lib. */
async function formPdf() {
  const doc = await PDFLib.PDFDocument.create();
  const p1 = doc.addPage([612, 792]), p2 = doc.addPage([612, 792]);
  const form = doc.getForm();
  form.createTextField('full_name').addToPage(p1, { x: 50, y: 700, width: 300, height: 24 });
  const notes = form.createTextField('notes'); notes.enableMultiline(); notes.addToPage(p1, { x: 50, y: 600, width: 300, height: 80 });
  form.createCheckBox('agree').addToPage(p1, { x: 50, y: 560, width: 16, height: 16 });
  const colour = form.createRadioGroup('colour');
  ['red', 'green', 'blue'].forEach((o, i) => colour.addOptionToPage(o, p1, { x: 50 + i * 40, y: 520, width: 16, height: 16 }));
  const country = form.createDropdown('country'); country.addOptions(['UK', 'France', 'Spain']); country.addToPage(p2, { x: 50, y: 700, width: 200, height: 24 });
  const tops = form.createOptionList('toppings'); tops.addOptions(['cheese', 'ham', 'olives']); tops.enableMultiselect(); tops.addToPage(p2, { x: 50, y: 600, width: 200, height: 60 });
  const ref = form.createTextField('ref'); ref.setText('ABC-1'); ref.enableReadOnly(); ref.addToPage(p2, { x: 50, y: 500, width: 200, height: 24 });
  return Buffer.from(await doc.save());
}
async function fillForm(page, name) {
  await page.setInputFiles(FILE, pdfFile(await formPdf(), name));
  await page.locator('[data-field="full_name"] input').waitFor({ timeout: 30000 });
  await page.fill('[data-field="full_name"] input', 'Ada Lovelace');
  await page.fill('[data-field="notes"] textarea', 'Line one\nLine two');
  await page.check('[data-field="agree"] input[type=checkbox]');
  await page.check('[data-field="colour"] input[value="green"]');
  await page.selectOption('[data-field="country"] select', 'France');
  await page.selectOption('[data-field="toppings"] select', ['cheese', 'olives']);
}

/* PNG filter types 1 (Sub), 2 (Up), 4 (Paeth) applied to RGB rows, for a predictor-15 stream. */
function pngPredict(rows, bpp) {
  const out = [];
  rows.forEach((row, y) => {
    const prior = y ? rows[y - 1] : new Array(row.length).fill(0), type = [1, 2, 4][y % 3];
    out.push(type);
    row.forEach((v, i) => {
      const a = i >= bpp ? row[i - bpp] : 0, b = prior[i], c = i >= bpp ? prior[i - bpp] : 0;
      let pred = 0;
      if (type === 1) pred = a; else if (type === 2) pred = b;
      else { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out.push((v - pred) & 255);
    });
  });
  return Buffer.from(out);
}
async function imagesPdf(jpg, png) {
  const doc = await PDFLib.PDFDocument.create(), ctx = doc.context;
  const p1 = doc.addPage([400, 400]), p2 = doc.addPage([400, 400]), p3 = doc.addPage([400, 400]);
  p1.drawImage(await doc.embedJpg(new Uint8Array(jpg)), { x: 20, y: 20, width: 200, height: 150 });
  p2.drawImage(await doc.embedPng(new Uint8Array(png)), { x: 20, y: 20, width: 80, height: 60 });
  const px = [[10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120], [15, 25, 35, 45, 55, 65, 75, 85, 95, 105, 115, 125], [200, 0, 0, 0, 200, 0, 0, 0, 200, 255, 255, 255]];
  const images = [
    ctx.stream(zlib.deflateSync(pngPredict(px, 3)), { Type: 'XObject', Subtype: 'Image', Width: 4, Height: 3, BitsPerComponent: 8, ColorSpace: 'DeviceRGB', Filter: 'FlateDecode', DecodeParms: { Predictor: 15, Colors: 3, Columns: 4, BitsPerComponent: 8 } }),
    ctx.stream(Buffer.from([0x01, 0x20]), { Type: 'XObject', Subtype: 'Image', Width: 2, Height: 2, BitsPerComponent: 4, ColorSpace: ['Indexed', 'DeviceRGB', 2, PDFLib.PDFHexString.of('ff000000ff000000ff')] }),
    ctx.stream(Buffer.from([255, 0, 0, 0, 0, 0, 0, 128]), { Type: 'XObject', Subtype: 'Image', Width: 2, Height: 1, BitsPerComponent: 8, ColorSpace: 'DeviceCMYK' }),
    ctx.stream(Buffer.alloc(64, 100), { Type: 'XObject', Subtype: 'Image', Width: 8, Height: 8, BitsPerComponent: 8, ColorSpace: 'DeviceGray' }),
    /* a spot colour: left for pdf.js to draw */
    ctx.stream(Buffer.from([0, 255]), { Type: 'XObject', Subtype: 'Image', Width: 2, Height: 1, BitsPerComponent: 8,
      ColorSpace: ['Separation', 'Spot', 'DeviceRGB', { FunctionType: 2, Domain: [0, 1], C0: [1, 1, 1], C1: [1, 0, 0], N: 1 }] })
  ];
  images.forEach((st, i) => {
    const name = p3.node.newXObject('Im', ctx.register(st));
    p3.pushOperators(PDFLib.pushGraphicsState(), PDFLib.concatTransformationMatrix(50, 0, 0, 50, 20 + i * 60, 20), PDFLib.drawObject(name), PDFLib.popGraphicsState());
  });
  return Buffer.from(await doc.save());
}
/* Decode a PNG in the page: { w, h, data: [r,g,b,a,...] }. */
async function pngPixels(page, buf) {
  return page.evaluate(async b64 => {
    const bmp = await createImageBitmap(new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], { type: 'image/png' }), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    const x = c.getContext('2d'); x.drawImage(bmp, 0, 0);
    return { w: bmp.width, h: bmp.height, data: Array.from(x.getImageData(0, 0, bmp.width, bmp.height).data) };
  }, buf.toString('base64'));
}

const cmOf = content => (content.match(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) cm/) || []).slice(1).map(Number);

/* --- checks -------------------------------------------------------------------- */

module.exports = [
  {
    name: 'pdf-organise: turn, blank page, duplicate, drag, delete + undo, append, save', tool: 'pdf-organise',
    run: async (page) => {
      const main = await makePdf(['Page A', 'Page B', 'Page C', 'Page D'], { sizes: [[612, 792], [612, 792], [300, 400], [612, 792]] });
      const extra = await makePdf(['Extra X'], { sizes: [[500, 500]] });
      await page.setInputFiles(FILE, pdfFile(main, 'main.pdf'));
      await page.locator('.g-card').nth(3).waitFor({ timeout: 30000 });
      const cards = page.locator('.g-card');
      /* turn page 2 right with its own button */
      await page.getByRole('button', { name: 'Turn page 2 right' }).click();
      /* select page 3 and insert a blank page after it */
      await cards.nth(2).locator('.g-tbox').click();
      await btn(page, 'Insert blank page').click();
      await btn(page, 'Select none').click();
      /* duplicate page 1 from the keyboard */
      await cards.nth(0).focus();
      await page.keyboard.press('d');
      await page.waitForFunction(() => document.querySelectorAll('.g-card').length === 6);
      /* drag page D (now 6th) in front of page 1 with the mouse, with both
         in the window (the mouse can't reach what's scrolled out of it) */
      await page.evaluate(() => document.querySelectorAll('.g-card')[5].scrollIntoView({ block: 'center' }));
      const from = await cards.nth(5).locator('.g-tbox').boundingBox();
      const to = await cards.nth(0).locator('.g-tbox').boundingBox();
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(to.x + to.width * 0.3, to.y + to.height / 2, { steps: 8 });
      await page.mouse.move(to.x + to.width * 0.2, to.y + to.height / 2, { steps: 2 });
      await page.mouse.up();
      await page.waitForFunction(() => /^p\. 4$/.test(document.querySelector('.g-card .src').textContent));
      /* delete page C with the Delete key, undo it, then delete it with its ✕ button */
      await cards.nth(4).focus();
      await page.keyboard.press('Delete');
      await page.waitForFunction(() => document.querySelectorAll('.g-card').length === 5);
      await page.keyboard.press('Control+z');
      await page.waitForFunction(() => document.querySelectorAll('.g-card').length === 6);
      await page.getByRole('button', { name: 'Delete page 5' }).click();
      await page.waitForFunction(() => document.querySelectorAll('.g-card').length === 5);
      /* append another PDF */
      await page.setInputFiles('#view input[type=file][multiple]', pdfFile(extra, 'extra.pdf'));
      await page.waitForFunction(() => document.querySelectorAll('.g-card').length === 6);
      const count = await page.textContent('[data-k="count"]');
      await btn(page, 'Save PDF').click();
      const { buf, name } = await download(page, () => btn(page, 'Download PDF').click());
      const d = await load(buf);
      const sizes = d.getPages().map(p => [Math.round(p.getWidth()), Math.round(p.getHeight())].join('x'));
      const rots = d.getPages().map(p => p.getRotation().angle);
      const t = await inPdfjs(page, buf);
      const want = ['Page D', 'Page A', 'Page A', 'Page B', '', 'Extra X'];
      return ok(name === 'main-organised.pdf' && /6 pages/.test(count) && t.texts.join('|') === want.join('|') &&
        rots.join() === '0,0,0,90,0,0' && sizes.join() === '612x792,612x792,612x792,612x792,300x400,500x500',
        { name, count, texts: t.texts, rots, sizes });
    }
  },
  {
    name: 'pdf-organise: Ctrl+arrow moves the selected pages, bulk turn left', tool: 'pdf-organise',
    run: async (page) => {
      await page.setInputFiles(FILE, pdfFile(await makePdf(['One', 'Two', 'Three', 'Four'])));
      await page.locator('.g-card').nth(3).waitFor({ timeout: 30000 });
      const cards = page.locator('.g-card');
      /* select 3 and 4 with click + shift-click, move them one place earlier twice */
      await cards.nth(2).locator('.g-tbox').click();
      await cards.nth(3).locator('.g-tbox').click({ modifiers: ['Shift'] });
      await cards.nth(3).focus();
      await page.keyboard.press('Control+ArrowLeft');
      await page.keyboard.press('Control+ArrowLeft');
      await btn(page, '↺ Turn left').click();
      await btn(page, 'Save PDF').click();
      const { buf } = await download(page, () => btn(page, 'Download PDF').click());
      const d = await load(buf);
      const t = await inPdfjs(page, buf);
      const rots = d.getPages().map(p => p.getRotation().angle);
      return ok(t.texts.join() === 'Three,Four,One,Two' && rots.join() === '270,270,0,0', { texts: t.texts, rots });
    }
  },
  {
    name: 'images-to-pdf: A4 auto orientation, contain with a 10 mm margin, JPEG kept byte for byte', tool: 'images-to-pdf',
    run: async (page) => {
      const jpg = await canvasImage(page, 400, 300, "x.fillStyle='#f00';x.fillRect(0,0,200,300);x.fillStyle='#00f';x.fillRect(200,0,200,300);", 'image/jpeg', 0.95);
      const png = await canvasImage(page, 200, 400, "x.clearRect(0,0,w,h);x.fillStyle='#0a0';x.fillRect(0,200,200,200);");
      const webp = await canvasImage(page, 300, 300, "x.fillStyle='#ff0';x.fillRect(0,0,w,h);", 'image/webp', 0.9);
      await page.setInputFiles(FILE, [
        { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: jpg },
        { name: 'shape.png', mimeType: 'image/png', buffer: png },
        { name: 'sun.webp', mimeType: 'image/webp', buffer: webp }]);
      await page.getByRole('button', { name: 'Create PDF (3 pages)' }).waitFor({ timeout: 30000 });
      const listText = (await page.innerText('.g-ilist')).replace(/\s+/g, ' ');
      await page.getByRole('button', { name: 'Create PDF (3 pages)' }).click();
      const { buf, name } = await download(page, () => btn(page, 'Download PDF').click());
      const d = await load(buf);
      const sizes = d.getPages().map(p => [p.getWidth(), p.getHeight()].map(v => v.toFixed(2)).join('x'));
      const img1 = pageImages(d, 0)[0];
      const cm = cmOf(pageContent(d, 0));
      /* 10 mm = 28.3465 pt; box 785.197 × 538.583; scale 538.583/300 → 718.110 × 538.583, centred */
      const cmOk = near(cm[0], 718.11, 0.02) && cm[1] === 0 && cm[2] === 0 && near(cm[3], 538.583, 0.02) && near(cm[4], 61.890, 0.02) && near(cm[5], 28.346, 0.02);
      const t = await inPdfjs(page, buf, { pixels: [{ page: 2, x: 297, y: 200 }, { page: 2, x: 297, y: 640 }, { page: 3, x: 297, y: 421 }] });
      const [top, bottom, yellow] = t.pixels;
      return ok(name === 'images.pdf' && sizes.join() === '841.89x595.28,595.28x841.89,595.28x841.89' &&
        img1 && img1.filter === '/DCTDecode' && img1.bytes.equals(jpg) && cmOk &&
        top.every(v => v > 245) && bottom[1] > 120 && bottom[0] < 40 && yellow[0] > 230 && yellow[1] > 230 && yellow[2] < 60 &&
        /JPEG \(kept as is\)/.test(listText) && /WebP → JPEG/.test(listText),
        { name, sizes, cm, filter: img1 && img1.filter, same: img1 && img1.bytes.equals(jpg), pixels: t.pixels, listText });
    }
  },
  {
    name: 'images-to-pdf: EXIF-rotated JPEG, page sized to the image at 96 dpi', tool: 'images-to-pdf',
    run: async (page) => {
      const plain = await canvasImage(page, 400, 300, "x.fillStyle='#f00';x.fillRect(0,0,200,300);x.fillStyle='#00f';x.fillRect(200,0,200,300);", 'image/jpeg', 0.95);
      const jpg = withExifOrientation(plain, 6);
      await page.setInputFiles(FILE, { name: 'sideways.jpg', mimeType: 'image/jpeg', buffer: jpg });
      await page.getByRole('button', { name: 'Create PDF (1 page)' }).waitFor({ timeout: 30000 });
      await page.selectOption('#view select', 'fit');
      await page.fill('#view input[aria-label="Margin in millimetres"]', '0');
      await page.dispatchEvent('#view input[aria-label="Margin in millimetres"]', 'change');
      await page.getByRole('button', { name: 'Create PDF (1 page)' }).click();
      const { buf, name } = await download(page, () => btn(page, 'Download PDF').click());
      const d = await load(buf);
      const p = d.getPage(0);
      const img = pageImages(d, 0)[0];
      /* displayed 300 × 400 px at 96 dpi = 225 × 300 pt; the stored left half (red) ends up on top */
      const t = await inPdfjs(page, buf, { pixels: [{ x: 112, y: 60 }, { x: 112, y: 240 }] });
      const [top, bottom] = t.pixels;
      return ok(name === 'sideways.pdf' && near(p.getWidth(), 225) && near(p.getHeight(), 300) && img.bytes.equals(jpg) &&
        top[0] > 200 && top[2] < 60 && bottom[2] > 200 && bottom[0] < 60 && /turned upright/.test(await page.innerText('.g-ilist')),
        { size: [p.getWidth(), p.getHeight()], same: img.bytes.equals(jpg), pixels: t.pixels });
    }
  },
  {
    name: 'images-to-pdf: animated GIF (first frame) and BMP, Letter landscape, stretched; bad file reported', tool: 'images-to-pdf',
    run: async (page) => {
      await page.setInputFiles(FILE, [
        { name: 'anim.gif', mimeType: 'image/gif', buffer: twoFrameGif() },
        { name: 'green.bmp', mimeType: 'image/bmp', buffer: solidBmp([0, 160, 0]) },
        { name: 'broken.heic', mimeType: 'image/heic', buffer: Buffer.from('not really an image') }]);
      await page.getByRole('button', { name: 'Create PDF (2 pages)' }).waitFor({ timeout: 30000 });
      await page.waitForFunction(() => /broken\.heic/.test(document.querySelector('#view .note.err') && document.querySelector('#view .note.err').textContent));
      const listText = (await page.innerText('.g-ilist')).replace(/\s+/g, ' ');
      await page.selectOption('#view select', 'Letter');
      await page.getByRole('button', { name: 'Landscape', exact: true }).click();
      await page.getByRole('button', { name: 'Stretch', exact: true }).click();
      await page.getByRole('button', { name: 'Create PDF (2 pages)' }).click();
      const { buf } = await download(page, () => btn(page, 'Download PDF').click());
      const d = await load(buf);
      const sizes = d.getPages().map(p => Math.round(p.getWidth()) + 'x' + Math.round(p.getHeight()));
      const cm = cmOf(pageContent(d, 1));
      const t = await inPdfjs(page, buf, { pixels: [{ page: 1, x: 396, y: 306 }, { page: 2, x: 396, y: 306 }] });
      return ok(sizes.join() === '792x612,792x612' && t.pixels[0][0] > 240 && t.pixels[0][2] < 20 &&
        t.pixels[1][1] > 140 && t.pixels[1][0] < 20 && near(cm[0], 735.307) && near(cm[3], 555.307) && near(cm[4], 28.346) && near(cm[5], 28.346) &&
        /GIF \(first frame\) → PNG/.test(listText) && /BMP → PNG/.test(listText),
        { sizes, cm, pixels: t.pixels, listText });
    }
  },
  {
    name: 'pdf-protect: AES-256 (R6), print only; pdf.js needs the password, owner password works, PdfUnlock restores it', tool: 'pdf-protect',
    run: async (page) => {
      const src = await makePdf(['Hello secret one', 'Hello secret two'], { title: 'Secret plans' });
      await page.setInputFiles(FILE, pdfFile(src, 'plans.pdf'));
      await page.locator('#view input[aria-label="Password to open"]').waitFor({ timeout: 30000 });
      await page.fill('#view input[aria-label="Password to open"]', 'open sesame');
      await page.fill('#view input[aria-label="Repeat the password"]', 'open sesame');
      await page.fill('#view input[aria-label="Owner password"]', 'boss-2026');
      for (const label of ['Copy text and images', 'Change the content', 'Add comments and fill in forms', 'Fill in form fields', 'Insert, delete and turn pages', 'Print at full quality']) {
        await page.getByLabel(label, { exact: true }).uncheck();
      }
      await btn(page, 'Protect PDF').click();
      const { buf, name } = await download(page, () => btn(page, 'Download Protected PDF').click());
      const none = await inPdfjs(page, buf);
      const wrong = await inPdfjs(page, buf, { password: 'nope' });
      const user = await inPdfjs(page, buf, { password: 'open sesame' });
      const owner = await inPdfjs(page, buf, { password: 'boss-2026' });
      const un = await unlockInPage(page, buf, 'open sesame');
      const back = un.buf ? await inPdfjs(page, un.buf) : {};
      const title = un.buf ? (await load(un.buf)).getTitle() : null;
      /* independent check of revision 6 key derivation with Node's crypto */
      const e = await encryptInfo(buf);
      const pw = Buffer.from('open sesame', 'utf8');
      const valid = hash2B(pw, e.U.subarray(32, 40), Buffer.alloc(0)).equals(e.U.subarray(0, 32));
      const fileKey = aesRaw('aes-256-cbc', hash2B(pw, e.U.subarray(40, 48), Buffer.alloc(0)), Buffer.alloc(16), e.UE, true);
      const perms = aesRaw('aes-256-ecb', fileKey, null, e.Perms, true);
      /* print only: 0xFFFFF0C0 | bit 10 | bit 3 = 0xFFFFF2C4 = -3388 */
      const good = name === 'plans-protected.pdf' && none.error === 'PasswordException' && none.code === 1 && wrong.code === 2 &&
        user.texts.join('|') === 'Hello secret one|Hello secret two' && owner.texts.join('|') === user.texts.join('|') &&
        JSON.stringify(user.perms) === '[4,512]' && e.V === 5 && e.R === 6 && e.P === -3388 && e.cfm === '/AESV3' && valid &&
        perms.readInt32LE(0) === -3388 && perms.subarray(8, 12).toString('latin1') === 'Tadb' &&
        un.method === 'AES-256' && back.texts.join('|') === user.texts.join('|') && title === 'Secret plans' && !buf.includes('Secret plans');
      return ok(good, { name, none, wrong: wrong.code, texts: user.texts, perms: user.perms, P: e.P, V: e.V, R: e.R, valid, tag: perms.subarray(8, 12).toString('latin1'), un: un.method || un.error, title });
    }
  },
  {
    name: 'pdf-protect: AES-128 (R4), all permissions, random owner password; mismatched passwords refused', tool: 'pdf-protect',
    run: async (page) => {
      await page.setInputFiles(FILE, pdfFile(await makePdf(['Quarterly figures']), 'q3.pdf'));
      await page.locator('#view input[aria-label="Password to open"]').waitFor({ timeout: 30000 });
      await page.fill('#view input[aria-label="Password to open"]', 'Pässwort 42');
      await page.fill('#view input[aria-label="Repeat the password"]', 'Passwort 42');
      await btn(page, 'Protect PDF').click();
      await page.getByText('The two passwords do not match.').waitFor();
      await page.fill('#view input[aria-label="Repeat the password"]', 'Pässwort 42');
      await page.selectOption('#view select', 'aes128');
      await btn(page, 'Protect PDF').click();
      const { buf } = await download(page, () => btn(page, 'Download Protected PDF').click());
      const shown = (await page.innerText('#view')).replace(/\s+/g, ' ');
      const user = await inPdfjs(page, buf, { password: 'Pässwort 42' });
      const none = await inPdfjs(page, buf);
      const un = await unlockInPage(page, buf, 'Pässwort 42');
      const back = un.buf ? await inPdfjs(page, un.buf) : {};
      /* algorithms 2 and 5 (revision 4) with Node's md5, from the Latin-1 password */
      const e = await encryptInfo(buf);
      const pwb = Buffer.from('Pässwort 42', 'latin1');
      const padded = Buffer.concat([pwb, PAD]).subarray(0, 32);
      const Pb = Buffer.alloc(4); Pb.writeInt32LE(e.P);
      let key = md5(Buffer.concat([padded, e.O.subarray(0, 32), Pb, e.id0]));
      for (let i = 0; i < 50; i++) key = md5(key);
      let u = rc4(key, md5(Buffer.concat([PAD, e.id0])));
      for (let i = 1; i <= 19; i++) u = rc4(Buffer.from(key.map(b => b ^ i)), u);
      const good = e.V === 4 && e.R === 4 && e.P === -4 && e.cfm === '/AESV2' && u.equals(e.U.subarray(0, 16)) &&
        none.code === 1 && user.texts[0] === 'Quarterly figures' && un.method === 'AES-128' && back.texts[0] === 'Quarterly figures' &&
        /random one was set/.test(shown) && /can do everything/.test(shown);
      return ok(good, { V: e.V, R: e.R, P: e.P, cfm: e.cfm, uMatch: u.equals(e.U.subarray(0, 16)), texts: user.texts, perms: user.perms, un: un.method || un.error });
    }
  },
  {
    name: 'pdf-sign: drawn signature lands where clicked; dragged date stamp keeps its position; flattened', tool: 'pdf-sign',
    run: async (page) => {
      await page.setInputFiles(FILE, pdfFile(await makePdf(['Contract page one', '']), 'contract.pdf'));
      const pad = page.locator('[data-k="pad"]');
      await pad.waitFor({ timeout: 30000 });
      await page.locator('.g-spage canvas').first().waitFor({ timeout: 30000 });
      const b = await pad.boundingBox();
      await page.mouse.move(b.x + 40, b.y + 120);
      await page.mouse.down();
      for (let i = 1; i <= 12; i++) await page.mouse.move(b.x + 40 + i * 25, b.y + (i % 2 ? 60 : 130));
      await page.mouse.up();
      await btn(page, 'Place signature').click();
      await page.getByText('Click on a page to place the signature.').waitFor();
      await clickAt(page, page.locator('.g-spage').nth(1), 0.5, 0.7);
      const today = new Date();
      const want = String(today.getDate()).padStart(2, '0') + '/' + String(today.getMonth() + 1).padStart(2, '0') + '/' + today.getFullYear();
      const dateValue = await page.inputValue('#view input[aria-label="Date stamp"]');
      await btn(page, 'Place date').click();
      await clickAt(page, page.locator('.g-spage').first(), 0.2, 0.2);
      const stamp = page.locator('.g-place.txt').first();
      const sb = await stamp.boundingBox();
      await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
      await page.mouse.down();
      await page.mouse.move(sb.x + sb.width / 2 + 120, sb.y + sb.height / 2 + 60, { steps: 6 });
      await page.mouse.up();
      const pos = await stamp.evaluate(n => [parseFloat(n.style.left), parseFloat(n.style.top)]);
      const placed = await page.textContent('[data-k="placed"]');
      await btn(page, 'Save signed PDF').click();
      const { buf, name } = await download(page, () => btn(page, 'Download Signed PDF').click());
      const t = await inPdfjs(page, buf, { darkBoxes: [{ page: 2 }] });
      const item = t.items[0].find(it => it.str === want);
      const d = await load(buf);
      const img = pageImages(d, 1)[0];
      const bx = t.boxes[0];
      /* 30% of 612 pt wide = 183.6, centred on x = 306 and y = 0.7 × 792 = 554.4 */
      const good = name === 'contract-signed.pdf' && dateValue === want && /2 items on 2 pages/.test(placed) && item &&
        near(item.t[4], pos[0] / 100 * 612, 0.6) && near(item.t[5], 792 - pos[1] / 100 * 792 - 11.4, 0.6) && pos[0] > 25 &&
        img && img.smask && bx && near(bx[0], 216, 6) && near(bx[2], 396, 6) && near((bx[1] + bx[3]) / 2, 554.4, 4);
      return ok(good, { name, dateValue, want, placed, item, pos, box: bx, img: img && { smask: img.smask, w: img.width, h: img.height } });
    }
  },
  {
    name: 'pdf-sign: typed signature and name stamp on a page turned 90°, drawn upright', tool: 'pdf-sign',
    run: async (page) => {
      await page.setInputFiles(FILE, pdfFile(await makePdf([''], { rotate: [90] }), 'turned.pdf'));
      await page.locator('.g-spage canvas').first().waitFor({ timeout: 30000 });
      await btn(page, 'Type').click();
      await page.fill('#view input[aria-label="Name to type as a signature"]', 'Ada Lovelace');
      await page.getByRole('button', { name: 'Font Dancing Script' }).click();
      await btn(page, 'Place signature').click();
      const sp = page.locator('.g-spage').first();
      await clickAt(page, sp, 0.5, 0.4);
      const stampName = await page.inputValue('#view input[aria-label="Name stamp"]');
      await btn(page, 'Place name').click();
      await clickAt(page, sp, 0.5, 0.9);
      await btn(page, 'Save signed PDF').click();
      const { buf } = await download(page, () => btn(page, 'Download Signed PDF').click());
      /* displayed page is 792 × 612; the signature sits around (396, 245) */
      const t = await inPdfjs(page, buf, { darkBoxes: [{ page: 1, region: [0, 0, 792, 480] }] });
      const it = t.items[0].find(x => x.str === 'Ada Lovelace');
      const bx = t.boxes[0];
      const good = stampName === 'Ada Lovelace' && it && Math.abs(it.t[0]) < 0.01 && it.t[1] > 11 && bx &&
        near((bx[0] + bx[2]) / 2, 396, 25) && near((bx[1] + bx[3]) / 2, 245, 25) && bx[2] - bx[0] <= 240;
      return ok(good, { stampName, item: it, box: bx });
    }
  },
  {
    name: 'pdf-sign: uploaded JPEG signature with its white background made transparent', tool: 'pdf-sign',
    run: async (page) => {
      const grey = (p) => p.drawRectangle({ x: 0, y: 0, width: 612, height: 792, color: PDFLib.rgb(0.8, 0.8, 0.8) });
      await page.setInputFiles(FILE, pdfFile(await makePdf([''], { draw: grey }), 'grey.pdf'));
      await page.locator('.g-spage canvas').first().waitFor({ timeout: 30000 });
      await btn(page, 'Upload').click();
      const jpg = await canvasImage(page, 300, 100, "x.fillStyle='#fff';x.fillRect(0,0,w,h);x.fillStyle='#000';x.fillRect(20,30,40,40);x.fillRect(240,30,40,40);", 'image/jpeg', 0.95);
      await page.setInputFiles('#view input[type=file][accept="image/*"]', { name: 'sig.jpg', mimeType: 'image/jpeg', buffer: jpg });
      await page.locator('.g-sigprev canvas').waitFor();
      await btn(page, 'Place signature').click();
      await clickAt(page, page.locator('.g-spage').first(), 0.5, 0.5);
      await btn(page, 'Save signed PDF').click();
      const { buf } = await download(page, () => btn(page, 'Download Signed PDF').click());
      /* image 268 × 48 px (bars plus 4 px padding) drawn 183.6 pt wide from x = 214.2; gap in the middle, bar near x = 231 */
      const t = await inPdfjs(page, buf, { pixels: [{ x: 306, y: 396 }, { x: 231, y: 396 }] });
      const [gap, bar] = t.pixels;
      return ok(gap.every(v => v > 190 && v < 220) && bar.every(v => v < 60), t.pixels);
    }
  },
  {
    name: 'pdf-forms: fills every field type, report JSON lists name/type/value/page, values read back with pdf-lib', tool: 'pdf-forms',
    run: async (page) => {
      await fillForm(page, 'application.pdf');
      const rep = JSON.parse((await download(page, () => btn(page, 'Download field report (JSON)').click())).buf.toString());
      const byName = Object.fromEntries(rep.fields.map(f => [f.name, f]));
      await btn(page, 'Save filled PDF').click();
      const { buf, name } = await download(page, () => btn(page, 'Download Filled PDF').click());
      const f = (await load(buf)).getForm();
      const good = name === 'application-filled.pdf' && rep.fields.length === 7 &&
        byName.full_name.type === 'text' && byName.full_name.value === 'Ada Lovelace' && byName.full_name.page === 1 &&
        byName.notes.type === 'multiline' && byName.agree.value === true && byName.colour.value === 'green' &&
        JSON.stringify(byName.colour.options) === '["red","green","blue"]' && byName.country.type === 'dropdown' &&
        JSON.stringify(byName.country.value) === '["France"]' && byName.country.page === 2 &&
        JSON.stringify(byName.toppings.value) === '["cheese","olives"]' && byName.ref.readOnly === true && byName.ref.value === 'ABC-1' &&
        f.getTextField('full_name').getText() === 'Ada Lovelace' && f.getTextField('notes').getText() === 'Line one\nLine two' &&
        f.getCheckBox('agree').isChecked() && f.getRadioGroup('colour').getSelected() === 'green' &&
        JSON.stringify(f.getDropdown('country').getSelected()) === '["France"]' &&
        JSON.stringify(f.getOptionList('toppings').getSelected()) === '["cheese","olives"]' && f.getTextField('ref').getText() === 'ABC-1';
      return ok(good, { name, rep: rep.fields });
    }
  },
  {
    name: 'pdf-forms: flattening removes the fields and keeps the text; non-Latin text falls back to NeedAppearances', tool: 'pdf-forms',
    run: async (page) => {
      await fillForm(page, 'app.pdf');
      await page.getByLabel('Flatten: make the answers part of the page (no longer editable)').check();
      await btn(page, 'Save filled PDF').click();
      const flat = await download(page, () => btn(page, 'Download Filled PDF').click());
      const fd = await load(flat.buf);
      const t = await inPdfjs(page, flat.buf);
      await page.getByLabel('Flatten: make the answers part of the page (no longer editable)').uncheck();
      await page.fill('[data-field="full_name"] input', 'Łukasz Żółw');
      await btn(page, 'Save filled PDF').click();
      const uni = await download(page, () => btn(page, 'Download Filled PDF').click());
      const ud = await load(uni.buf);
      const need = ud.catalog.lookup(PDFLib.PDFName.of('AcroForm')).lookup(PDFLib.PDFName.of('NeedAppearances'));
      const good = flat.name === 'app-flattened.pdf' && fd.getForm().getFields().length === 0 && /Ada Lovelace/.test(t.texts[0]) && /France/.test(t.texts[1]) &&
        ud.getForm().getTextField('full_name').getText() === 'Łukasz Żółw' && String(need) === 'true' && /draw them/.test(await page.innerText('#view .g-result'));
      return ok(good, { texts: t.texts, fields: fd.getForm().getFields().length, uni: ud.getForm().getTextField('full_name').getText(), need: String(need) });
    }
  },
  {
    name: 'pdf-forms: a PDF without fields gets a friendly message', tool: 'pdf-forms',
    run: async (page) => {
      await page.setInputFiles(FILE, pdfFile(await makePdf(['Just text'])));
      await page.getByText('This PDF has no fillable form fields').waitFor({ timeout: 30000 });
      return ok(/0 form fields/.test(await page.innerText('#view')), 'message shown');
    }
  },
  {
    name: 'pdf-extract-images: JPEG byte for byte, PNG+alpha, predictor, indexed and CMYK decoded exactly; size filter; ZIP', tool: 'pdf-extract-images',
    run: async (page) => {
      const jpg = await canvasImage(page, 120, 90, "x.fillStyle='#c00';x.fillRect(0,0,w,h);x.fillStyle='#fc0';x.fillRect(30,20,60,50);", 'image/jpeg', 0.9);
      const png = await canvasImage(page, 40, 30, "for(let y=0;y<h;y++)for(let i=0;i<w;i++){x.fillStyle='rgb('+(i*6)+','+(y*8)+',90)';x.fillRect(i,y,1,1);}x.clearRect(0,0,10,10);");
      await page.setInputFiles(FILE, pdfFile(await imagesPdf(jpg, png), 'pics.pdf'));
      await page.locator('[data-k="count"]').waitFor({ timeout: 30000 });
      const count = await page.textContent('[data-k="count"]');
      await page.fill('#view input[aria-label="Minimum size in pixels"]', '8');
      const at8 = await page.textContent('[data-k="count"]');
      await page.fill('#view input[aria-label="Minimum size in pixels"]', '0');
      const all = await page.textContent('[data-k="count"]');
      const zip = await JSZip.loadAsync((await download(page, () => btn(page, 'Download all (ZIP)').click())).buf);
      const names = Object.keys(zip.files).sort();
      const get = async n => zip.file(n) ? zip.file(n).async('nodebuffer') : null;
      const pj = await get('pics-page1-01.jpg');
      const src = await pngPixels(page, png), outPng = await pngPixels(page, await get('pics-page2-01.png'));
      let same = outPng.w === 40 && outPng.h === 30;
      for (let i = 0; same && i < src.data.length; i += 4) {
        if (src.data[i + 3] !== outPng.data[i + 3]) same = false;
        else if (src.data[i + 3] === 255 && (src.data[i] !== outPng.data[i] || src.data[i + 1] !== outPng.data[i + 1] || src.data[i + 2] !== outPng.data[i + 2])) same = false;
      }
      const pred = await pngPixels(page, await get('pics-page3-01.png'));
      const idx = await pngPixels(page, await get('pics-page3-02.png'));
      const cmyk = await pngPixels(page, await get('pics-page3-03.png'));
      const spot = await pngPixels(page, await get('pics-page3-05.png'));
      const listing = (await page.innerText('#view')).replace(/\s+/g, ' ');
      const rgbOf = (im) => { const o = []; for (let i = 0; i < im.data.length; i += 4) o.push(im.data.slice(i, i + 3).join(',')); return o.join(' '); };
      const good = /^1 image shown · 6 smaller than the minimum hidden$/.test(count.trim()) && /^3 images shown · 4 smaller/.test(at8.trim()) && /^7 images$/.test(all.trim()) &&
        names.join() === 'pics-page1-01.jpg,pics-page2-01.png,pics-page3-01.png,pics-page3-02.png,pics-page3-03.png,pics-page3-04.png,pics-page3-05.png' &&
        pj && pj.equals(jpg) && same &&
        rgbOf(pred) === '10,20,30 40,50,60 70,80,90 100,110,120 15,25,35 45,55,65 75,85,95 105,115,125 200,0,0 0,200,0 0,0,200 255,255,255' &&
        rgbOf(idx) === '255,0,0 0,255,0 0,0,255 255,0,0' && rgbOf(cmyk) === '0,255,255 127,127,127' &&
        rgbOf(spot) === '255,255,255 255,0,0' && /PNG \(drawn by pdf\.js\)/.test(listing);
      return ok(good, { count, at8, all, names, jpgSame: pj && pj.equals(jpg), pngSame: same, pred: rgbOf(pred), idx: rgbOf(idx), cmyk: rgbOf(cmyk), spot: rgbOf(spot) });
    }
  },
  {
    name: 'pdf-compare: text diff by page (changed page 2, added page 4); visual overlay marks page 2 in red', tool: 'pdf-compare',
    run: async (page) => {
      const a = await makePdf(['Hello page one', 'Hello page two', 'Hello page three']);
      const b = await makePdf(['Hello page one', 'Hello page TWO changed', 'Hello page three', 'Hello page four']);
      await page.setInputFiles('#view input[type=file] >> nth=0', pdfFile(a, 'v1.pdf'));
      await page.setInputFiles('#view input[type=file] >> nth=1', pdfFile(b, 'v2.pdf'));
      await page.locator('[data-k="summary"]').waitFor({ timeout: 30000 });
      const changed = await page.textContent('[data-k="changed-pages"]');
      const summary = await page.textContent('[data-k="summary"]');
      const p2 = (await page.innerText('.g-diffpage[data-page="2"]')).replace(/\s+/g, ' ');
      const p4 = (await page.innerText('.g-diffpage[data-page="4"]')).replace(/\s+/g, ' ');
      await btn(page, 'Visual').click();
      await page.locator('[data-k="diff-pixels"]').waitFor({ state: 'attached', timeout: 30000 });
      const same = await page.textContent('[data-k="diff-pixels"]');
      await page.fill('#view input[aria-label="Page to compare"]', '2');
      await page.dispatchEvent('#view input[aria-label="Page to compare"]', 'change');
      await page.waitForFunction(() => /Page 2:/.test((document.querySelector('[data-k="visual"]') || {}).textContent || ''), null, { timeout: 30000 });
      const diff = Number(await page.textContent('[data-k="diff-pixels"]'));
      const box = (await page.textContent('[data-k="diff-box"]')).split(',').map(Number);
      const red = await page.evaluate(() => {
        const c = document.querySelector('.g-cmpstage canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] === 230 && d[i + 1] === 0 && d[i + 2] === 0) n++;
        return n;
      });
      await btn(page, 'Find pages that look different').click();
      await page.locator('[data-k="visual-changed"]').waitFor({ timeout: 30000 });
      const scan = await page.textContent('[data-k="visual-changed"]');
      /* the changed words sit on the text line: x from ~100 pt, baseline 712 pt → 56-86 pt from the top */
      const good = changed === '2' && /Pages only in the new PDF: 4/.test(summary) &&
        /− Hello page two/.test(p2) && /\+ Hello page TWO changed/.test(p2) && /\+ Hello page four/.test(p4) &&
        same === '0' && diff > 50 && red === diff && box[0] > 60 && box[2] < 420 && box[1] > 45 && box[3] < 100 &&
        scan === 'Pages that look different: 2, 4.';
      return ok(good, { changed, summary, p2, p4, same, diff, red, box, scan });
    }
  }
];

module.exports.helpers = { imagesPdf, pngPixels, clickAt, encryptInfo, unlockInPage, hash2B, makePdf, pdfFile, load, ok, btn, near, sha256, download, inPdfjs, canvasImage, pageContent, pageImages };
