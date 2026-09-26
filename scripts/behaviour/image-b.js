/* Behaviour checks for Convert Image (with the eight format pages merged into
   it) and the image-b tools. Fixtures are drawn on a canvas in the page or
   built byte by byte here, fed through the real file inputs, and the
   downloads are parsed in Node. */
'use strict';

const fs = require('fs');
const JSZip = require('jszip');
const { PDFDocument } = require('pdf-lib');

/* 64 x 48 solid red AVIF, encoded once with libavif (sharp). */
const AVIF_64x48 = 'AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAANZtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAACJpbG9jAAAAAERAAAEAAQAAAAAA+gABAAAAAAAAACYAAAAjaWluZgAAAAAAAQAAABVpbmZlAgAAAAABAABhdjAxAAAAAA5waXRtAAAAAAABAAAAVmlwcnAAAAA4aXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAAEAAAAAwAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAAAAubWRhdBIACgk4FX+9pAQ0GkAyFxlCYwTAADQAAJfK4KraAR8kl3u+8OVh';

const ok = (cond, detail) => ({ ok: !!cond, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

/* Draw a fixture in the page and return it as a Buffer.
   kind: 'halves' (red | blue), 'solid', 'gradient', 'alpha' (left half green, right transparent), 'quads' */
async function fixture(page, { w = 480, h = 320, kind = 'halves', mime = 'image/png', fill = '#ff0000', quality = 0.92 } = {}) {
  const b64 = await page.evaluate(async ({ w, h, kind, mime, fill, quality }) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    if (kind === 'halves') { x.fillStyle = '#ff0000'; x.fillRect(0, 0, w / 2, h); x.fillStyle = '#0000ff'; x.fillRect(w / 2, 0, w / 2, h); }
    else if (kind === 'solid') { x.fillStyle = fill; x.fillRect(0, 0, w, h); }
    else if (kind === 'alpha') { x.fillStyle = '#00ff00'; x.fillRect(0, 0, w / 2, h); }
    else if (kind === 'quads') {
      x.fillStyle = '#ff0000'; x.fillRect(0, 0, w / 2, h / 2); x.fillStyle = '#00ff00'; x.fillRect(w / 2, 0, w / 2, h / 2);
      x.fillStyle = '#0000ff'; x.fillRect(0, h / 2, w / 2, h / 2); x.fillStyle = '#ffff00'; x.fillRect(w / 2, h / 2, w / 2, h / 2);
    } else { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#e33'); g.addColorStop(1, '#33e'); x.fillStyle = g; x.fillRect(0, 0, w, h); }
    const blob = await new Promise(r => c.toBlob(r, mime, quality));
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return btoa(s);
  }, { w, h, kind, mime, fill, quality });
  return Buffer.from(b64, 'base64');
}

async function upload(page, files, index = 0) {
  await page.locator('#view input[type=file]').nth(index).setInputFiles(files);
}
const file = (buffer, name, mimeType) => ({ name, mimeType, buffer });

function btn(page, text) {
  return page.locator('#view button:visible', { hasText: text instanceof RegExp ? text : new RegExp('^\\s*' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$') }).first();
}

async function resultInfo(page, timeout = 30000) {
  await page.waitForFunction(() => { const n = [...document.querySelectorAll('#view .g-res-info')].find(e => e.offsetParent); return n && n.textContent.trim().length > 0; }, null, { timeout });
  return page.evaluate(() => [...document.querySelectorAll('#view .g-res-info')].find(e => e.offsetParent).textContent.trim());
}

/* RGBA of the visible output canvas at (fx, fy) as fractions of its size. */
function pixel(page, fx, fy, selector = '#view canvas.g-out') {
  return page.evaluate(({ fx, fy, selector }) => {
    const c = [...document.querySelectorAll(selector)].filter(e => e.offsetParent).pop() || document.querySelector(selector);
    const x = Math.min(c.width - 1, Math.floor(c.width * fx)), y = Math.min(c.height - 1, Math.floor(c.height * fy));
    return Array.from(c.getContext('2d').getImageData(x, y, 1, 1).data);
  }, { fx, fy, selector });
}

async function setRange(page, index, value) {
  await page.evaluate(({ index, value }) => {
    const r = [...document.querySelectorAll('#view input[type=range]')].filter(e => e.offsetParent)[index];
    r.value = value;
    r.dispatchEvent(new Event('input', { bubbles: true }));
    r.dispatchEvent(new Event('change', { bubbles: true }));
  }, { index, value });
}

/* Set a value on an input found by its data-k attribute and fire input/change. */
async function setK(page, k, value) {
  await page.evaluate(({ k, value }) => {
    const n = document.querySelector('#view [data-k="' + k + '"]');
    if (n.type === 'checkbox') n.checked = !!value; else n.value = value;
    n.dispatchEvent(new Event('input', { bubbles: true }));
    n.dispatchEvent(new Event('change', { bubbles: true }));
  }, { k, value });
}
const textK = (page, k) => page.evaluate(k => { const n = document.querySelector('#view [data-k="' + k + '"]'); return n ? n.textContent.trim() : null; }, k);

async function download(page, click) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), click()]);
  const p = await dl.path();
  return { name: dl.suggestedFilename(), bytes: p ? fs.readFileSync(p) : Buffer.alloc(0) };
}

function jpegSize(buf) {
  let o = 2;
  while (o < buf.length) {
    const m = buf[o + 1], len = buf.readUInt16BE(o + 2);
    if (m >= 0xC0 && m <= 0xC3) return { h: buf.readUInt16BE(o + 5), w: buf.readUInt16BE(o + 7) };
    o += 2 + len;
  }
  return null;
}
function pngSize(buf) { return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }; }

/* Decode an image buffer in the page: size plus the RGBA at a few fractional points. */
async function decode(page, buffer, points = []) {
  return page.evaluate(async ([b64, points]) => {
    const bin = atob(b64), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const bmp = await createImageBitmap(new Blob([u]));
    const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    const g = c.getContext('2d'); g.drawImage(bmp, 0, 0);
    const px = points.map(p => Array.from(g.getImageData(Math.min(bmp.width - 1, Math.floor(p[0] * bmp.width)), Math.min(bmp.height - 1, Math.floor(p[1] * bmp.height)), 1, 1).data));
    return { w: bmp.width, h: bmp.height, px };
  }, [buffer.toString('base64'), points]);
}
const near = (a, b, tol = 6) => a.every((v, i) => Math.abs(v - b[i]) <= tol);


/* --- byte-level fixture builders (Node) ----------------------------------- */

const CRC_TABLE = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t.push(c >>> 0); } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (const b of buf) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function jpegSeg(marker, payload) { const h = Buffer.alloc(4); h[0] = 0xFF; h[1] = marker; h.writeUInt16BE(payload.length + 2, 2); return Buffer.concat([h, payload]); }

/* A little-endian TIFF/EXIF block. ifd0/exif/gps: [tag, type, value]; type 2 ASCII, 3 SHORT, 5 RATIONAL list [[n, d], ...]. */
function tiff({ ifd0 = [], exif = [], gps = [] }) {
  const buf = Buffer.alloc(4096); let data = 0x400;
  buf.write('II', 0, 'latin1'); buf.writeUInt16LE(42, 2); buf.writeUInt32LE(8, 4);
  const full0 = ifd0.slice();
  if (exif.length) full0.push([0x8769, 4, 0]);
  if (gps.length) full0.push([0x8825, 4, 0]);
  const size = list => 2 + list.length * 12 + 4;
  const offExif = 8 + size(full0), offGps = offExif + (exif.length ? size(exif) : 0);
  function write(at, list) {
    buf.writeUInt16LE(list.length, at);
    list.forEach(([tag, type, v], i) => {
      const o = at + 2 + i * 12;
      buf.writeUInt16LE(tag, o); buf.writeUInt16LE(type, o + 2);
      if (type === 2) {
        const s = Buffer.from(v + '\0', 'latin1'); buf.writeUInt32LE(s.length, o + 4);
        if (s.length <= 4) s.copy(buf, o + 8); else { buf.writeUInt32LE(data, o + 8); s.copy(buf, data); data += s.length + (s.length & 1); }
      } else if (type === 3) { buf.writeUInt32LE(1, o + 4); buf.writeUInt16LE(v, o + 8); }
      else if (type === 4) { buf.writeUInt32LE(1, o + 4); buf.writeUInt32LE(tag === 0x8769 ? offExif : tag === 0x8825 ? offGps : v, o + 8); }
      else if (type === 5) { buf.writeUInt32LE(v.length, o + 4); buf.writeUInt32LE(data, o + 8); v.forEach(([n, d]) => { buf.writeUInt32LE(n, data); buf.writeUInt32LE(d, data + 4); data += 8; }); }
    });
    buf.writeUInt32LE(0, at + 2 + list.length * 12);
  }
  write(8, full0);
  if (exif.length) write(offExif, exif);
  if (gps.length) write(offGps, gps);
  return buf.slice(0, data);
}
const CAMERA_TIFF = orientation => tiff({
  ifd0: [[0x010F, 2, 'Canon'], [0x0110, 2, 'Canon EOS R6'], [0x0112, 3, orientation], [0x0132, 2, '2024:03:09 14:05:33'], [0x0131, 2, 'Firmware 1.8']],
  exif: [[0x9003, 2, '2024:03:09 14:05:33'], [0x8827, 3, 400]],
  gps: [[1, 2, 'N'], [2, 5, [[51, 1], [30, 1], [0, 1]]], [3, 2, 'W'], [4, 5, [[0, 1], [7, 1], [30, 1]]]]
});

/* Split a canvas JPEG into SOI, its JFIF APP0 and everything after. */
function jpegPieces(jpg) {
  const app0Len = jpg[2] === 0xFF && jpg[3] === 0xE0 ? 2 + jpg.readUInt16BE(4) : 0;
  return { soi: jpg.slice(0, 2), app0: jpg.slice(2, 2 + app0Len), rest: jpg.slice(2 + app0Len) };
}

/* Walk a GIF: logical screen, NETSCAPE loop count, frame delays and the
   colour of each frame's centre pixel (LZW-decoded here, independently). */
function parseGif(b) {
  const out = { sig: b.slice(0, 6).toString('latin1'), w: b.readUInt16LE(6), h: b.readUInt16LE(8), loop: null, delays: [], frames: [] };
  let o = 13, gct = null;
  if (b[10] & 0x80) { const n = 3 * (1 << ((b[10] & 7) + 1)); gct = b.slice(13, 13 + n); o += n; }
  const subBlocks = () => { const parts = []; while (b[o]) { parts.push(b.slice(o + 1, o + 1 + b[o])); o += 1 + b[o]; } o++; return Buffer.concat(parts); };
  while (o < b.length) {
    const id = b[o];
    if (id === 0x3B) break;
    if (id === 0x21) {
      const label = b[o + 1]; o += 2;
      if (label === 0xF9) { out.delays.push(b.readUInt16LE(o + 2)); o += 1 + b[o]; o++; }
      else if (label === 0xFF) { const app = b.slice(o + 1, o + 12).toString('latin1'); o += 1 + b[o]; const d = subBlocks(); if (app === 'NETSCAPE2.0') out.loop = d.readUInt16LE(1); }
      else subBlocks();
    } else if (id === 0x2C) {
      const fw = b.readUInt16LE(o + 5), fh = b.readUInt16LE(o + 7), packed = b[o + 9]; o += 10;
      let ct = gct;
      if (packed & 0x80) { const n = 3 * (1 << ((packed & 7) + 1)); ct = b.slice(o, o + n); o += n; }
      const minCode = b[o++], data = subBlocks();
      const px = lzw(data, minCode, fw * fh), i = px[Math.floor(fh / 2) * fw + Math.floor(fw / 2)];
      out.frames.push({ w: fw, h: fh, centre: [ct[i * 3], ct[i * 3 + 1], ct[i * 3 + 2]] });
    } else break;
  }
  return out;
}
function lzw(data, minCode, count) {
  const clear = 1 << minCode, eoi = clear + 1, out = new Uint8Array(count);
  let size = minCode + 1, dict = [], prev = null, pos = 0, bit = 0;
  const reset = () => { dict = []; for (let i = 0; i < clear; i++) dict[i] = [i]; dict[clear] = []; dict[eoi] = []; size = minCode + 1; prev = null; };
  reset();
  while (pos < count && bit + size <= data.length * 8) {
    let code = 0;
    for (let k = 0; k < size; k++, bit++) code |= ((data[bit >> 3] >> (bit & 7)) & 1) << k;
    if (code === clear) { reset(); continue; }
    if (code === eoi) break;
    let entry = dict[code];
    if (!entry) entry = prev.concat([prev[0]]);
    for (const v of entry) if (pos < count) out[pos++] = v;
    if (prev) dict.push(prev.concat([entry[0]]));
    prev = entry;
    if (dict.length === 1 << size && size < 12) size++;
  }
  return out;
}

function riffIds(b) { const out = []; let o = 12; while (o + 8 <= b.length) { const n = b.readUInt32LE(o + 4); out.push(b.slice(o, o + 4).toString('latin1') + n); o += 8 + n + (n & 1); } return out.join(' '); }

/* Page-side helpers for the editors: click/drag in picture coordinates. */
async function canvasPoint(page, selector, x, y) {
  return page.evaluate(({ selector, x, y }) => {
    const c = [...document.querySelectorAll(selector)].find(e => e.offsetParent);
    /* The mouse can't reach what's scrolled out of the window. */
    const seen = c.getBoundingClientRect();
    if (seen.top < 0 || seen.bottom > innerHeight) c.scrollIntoView({ block: 'center' });
    const r = c.getBoundingClientRect();
    return { x: r.left + x * r.width / c.width, y: r.top + y * r.height / c.height };
  }, { selector, x, y });
}
async function dragOn(page, selector, from, to) {
  const a = await canvasPoint(page, selector, from[0], from[1]), b = await canvasPoint(page, selector, to[0], to[1]);
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 3 });
  await page.mouse.move(b.x, b.y, { steps: 3 }); await page.mouse.up();
}
async function clickOn(page, selector, x, y) { const p = await canvasPoint(page, selector, x, y); await page.mouse.click(p.x, p.y); }

/* A 100 x 100 PNG of 1-px vertical stripes: even columns black, odd white. */
async function stripes(page, w = 100, h = 100) {
  const b64 = await page.evaluate(async ({ w, h }) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#000';
    for (let i = 0; i < w; i += 2) x.fillRect(i, 0, 1, h);
    const u = new Uint8Array(await (await new Promise(r => c.toBlob(r, 'image/png'))).arrayBuffer());
    let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  }, { w, h });
  return Buffer.from(b64, 'base64');
}

module.exports = [
  /* --- Convert Image: the old one-step format pages, now all one tool ---- */
  {
    name: 'image-convert: old format pages open the Image Editor on Convert, and their search terms find it',
    tool: 'image-convert',
    run: async page => {
      const got = await page.evaluate(() => ({
        aliases: ['heic-to-jpg', 'heic-to-png', 'webp-to-png', 'png-to-webp', 'webp-to-jpg', 'jpg-to-webp', 'avif-to-jpg', 'avif-to-png'].map(id => Tools.href(id)),
        search: ['heic to jpg', 'webp to png', 'avif to png', 'jpg to webp'].map(q => (Tools.search(q)[0] || {}).id)
      }));
      return ok(got.aliases.every(a => a === '#/t/image-editor?tab=convert') && got.search.every(s => s === 'image-convert'), got);
    }
  },
  {
    name: 'image-convert: heic2any loads, and a mislabelled .heic that is really a JPEG still converts (was heic-to-jpg)',
    tool: 'image-convert',
    run: async page => {
      const lib = await page.evaluate(async () => { await window.UI.script('assets/vendor/heic2any/heic2any.min.js'); return typeof window.heic2any; });
      await upload(page, file(await fixture(page, { mime: 'image/jpeg' }), 'photo.heic', 'image/heic'));
      await page.getByText('Original (JPEG)').waitFor();
      await btn(page, 'JPEG').click();
      await btn(page, 'Convert').click();
      const t = await resultInfo(page);
      const dl = await download(page, () => btn(page, 'Download JPEG').click());
      const s = jpegSize(dl.bytes);
      return ok(lib === 'function' && /480 × 320 px/.test(t) && s && s.w === 480 && dl.name === 'photo.jpg', { lib, t, s, name: dl.name });
    }
  },
  {
    name: 'image-convert: a .heic that is not an image fails with a clear message (was heic-to-png)',
    tool: 'image-convert',
    run: async page => {
      await upload(page, file(Buffer.from('this is not an image at all'), 'broken.heic', 'image/heic'));
      await page.waitForSelector('#view .note.err', { timeout: 60000 });
      const t = await page.textContent('#view .note.err');
      return ok(/HEIC/.test(t) && t.length > 20, t);
    }
  },
  {
    name: 'image-convert: WebP in, PNG out at the same size (was webp-to-png)',
    tool: 'image-convert',
    run: async page => {
      await upload(page, file(await fixture(page, { mime: 'image/webp' }), 'sample.webp', 'image/webp'));
      await page.getByText('Original (WebP)').waitFor();
      await btn(page, 'PNG').click();
      const qualityHidden = await page.evaluate(() => ![...document.querySelectorAll('#view input[type=range]')].some(e => e.offsetParent));
      await btn(page, 'Convert').click();
      await page.getByText('Converted (PNG)').waitFor();
      const dl = await download(page, () => btn(page, 'Download PNG').click());
      const s = pngSize(dl.bytes);
      return ok(qualityHidden && s.w === 480 && s.h === 320 && dl.name === 'sample.png', { qualityHidden, s, name: dl.name });
    }
  },
  {
    name: 'image-convert: PNG in, WebP out and smaller (was png-to-webp)',
    tool: 'image-convert',
    run: async page => {
      const png = await fixture(page, { kind: 'gradient' });
      await upload(page, file(png, 'sample.png', 'image/png'));
      await page.getByText('Original (PNG)').waitFor();
      await btn(page, 'WebP').click();
      await btn(page, 'Convert').click();
      const t = await resultInfo(page);
      const dl = await download(page, () => btn(page, 'Download WebP').click());
      return ok(/^[\d.]+ KB\s*-\d/.test(t) && dl.bytes.slice(8, 12).toString() === 'WEBP' && dl.bytes.length < png.length && dl.name === 'sample.webp', { t, len: dl.bytes.length, png: png.length });
    }
  },
  {
    name: 'image-convert: WebP in, JPEG out (was webp-to-jpg)',
    tool: 'image-convert',
    run: async page => {
      await upload(page, file(await fixture(page, { mime: 'image/webp' }), 'sample.webp', 'image/webp'));
      await page.getByText('Original (WebP)').waitFor();
      await btn(page, 'Convert').click();
      await resultInfo(page);
      const dl = await download(page, () => btn(page, 'Download JPEG').click());
      const s = jpegSize(dl.bytes);
      return ok(s && s.w === 480 && s.h === 320 && dl.bytes[0] === 0xFF && dl.bytes[1] === 0xD8, s);
    }
  },
  {
    name: 'image-convert: JPEG in, WebP out named photo.webp (was jpg-to-webp)',
    tool: 'image-convert',
    run: async page => {
      await upload(page, file(await fixture(page, { mime: 'image/jpeg' }), 'photo.jpg', 'image/jpeg'));
      await page.getByText('Original (JPEG)').waitFor();
      await btn(page, 'WebP').click();
      await btn(page, 'Convert').click();
      const t = await resultInfo(page);
      const dl = await download(page, () => btn(page, 'Download WebP').click());
      return ok(/480 × 320/.test(t) && dl.bytes.slice(0, 4).toString() === 'RIFF' && dl.name === 'photo.webp', { t, name: dl.name });
    }
  },
  {
    name: 'image-convert: decodes a real AVIF (64 × 48 red) to JPEG and to PNG (was avif-to-jpg, avif-to-png)',
    tool: 'image-convert',
    run: async page => {
      await upload(page, file(Buffer.from(AVIF_64x48, 'base64'), 'red.avif', 'image/avif'));
      await page.getByText('Original (AVIF)').waitFor();
      await btn(page, 'Convert').click();
      const t = await resultInfo(page);
      const px = await pixel(page, 0.5, 0.5);
      await btn(page, 'PNG').click();
      await btn(page, 'Convert').click();
      await page.getByText('Converted (PNG)').waitFor();
      const dl = await download(page, () => btn(page, 'Download PNG').click());
      const s = pngSize(dl.bytes);
      return ok(/64 × 48 px/.test(t) && px[0] > 230 && px[1] < 30 && s.w === 64 && s.h === 48, { t, px, s });
    }
  },
  {
    name: 'image-convert: JPEG output fills transparency with the chosen colour; lower quality gives a smaller file',
    tool: 'image-convert',
    run: async page => {
      await upload(page, file(await fixture(page, { w: 200, h: 100, kind: 'alpha' }), 'alpha.png', 'image/png'));
      await page.getByText('Original (PNG)').waitFor();
      await page.fill('#view .g-color input[type=text]', '#ff00ff');
      await btn(page, 'Convert').click();
      await page.getByText('Converted (JPEG)').waitFor();
      const px = await pixel(page, 0.9, 0.5);
      const hi = await download(page, () => btn(page, 'Download JPEG').click());
      const out = await decode(page, hi.bytes, [[0.9, 0.5], [0.1, 0.5]]);
      await upload(page, file(await fixture(page, { w: 640, h: 480, kind: 'gradient' }), 'grad.png', 'image/png'));
      await page.getByRole('button', { name: 'Remove' }).first().click();
      await page.getByText('Original (PNG)').waitFor();
      await setRange(page, 0, 95);
      await btn(page, 'Convert').click();
      await page.getByText('Converted (JPEG)').waitFor();
      const big = (await download(page, () => btn(page, 'Download JPEG').click())).bytes.length;
      const before = await resultInfo(page);
      await setRange(page, 0, 20);
      await btn(page, 'Convert').click();
      await page.waitForFunction(b => { const n = [...document.querySelectorAll('#view .g-res-info')].find(e => e.offsetParent); return n && n.textContent.trim() !== b; }, before, { timeout: 20000 });
      const small = (await download(page, () => btn(page, 'Download JPEG').click())).bytes.length;
      return ok(near(px.slice(0, 3), [255, 0, 255], 8) && near(out.px[0].slice(0, 3), [255, 0, 255], 12) && near(out.px[1].slice(0, 3), [0, 255, 0], 12) && small < big * 0.7,
        { px, out: out.px, big, small });
    }
  },
  {
    name: 'image-convert: a batch of three (with a duplicate name) converts into a ZIP of three PNGs',
    tool: 'image-convert',
    run: async page => {
      const a = await fixture(page, { w: 120, h: 80, mime: 'image/jpeg' });
      const b = await fixture(page, { w: 90, h: 60, mime: 'image/webp' });
      const c = await fixture(page, { w: 64, h: 64, kind: 'quads' });
      await upload(page, [file(a, 'holiday.jpg', 'image/jpeg'), file(b, 'holiday.webp', 'image/webp'), file(c, 'icon.png', 'image/png')]);
      await btn(page, 'Convert 3 images').waitFor();
      const types = await page.$$eval('#view tbody tr td:nth-child(2)', tds => tds.map(t => t.textContent));
      await btn(page, 'PNG').click();
      await btn(page, 'Convert 3 images').click();
      await page.getByText('Converted 3 of 3 images to PNG.').waitFor({ timeout: 30000 });
      const dl = await download(page, () => btn(page, 'Download all (ZIP)').click());
      const zip = await JSZip.loadAsync(dl.bytes);
      const names = Object.keys(zip.files).sort();
      const sizes = {};
      for (const n of names) sizes[n] = pngSize(await zip.file(n).async('nodebuffer'));
      return ok(types.join() === 'JPEG,WebP,PNG' && dl.name === 'converted-png.zip' && names.join() === 'holiday (2).png,holiday.png,icon.png' &&
        sizes['holiday.png'].w === 120 && sizes['holiday (2).png'].w === 90 && sizes['icon.png'].h === 64, { types, name: dl.name, names, sizes });
    }
  },
  {
    name: 'image-convert: AVIF is offered exactly when this browser can encode it',
    tool: 'image-convert',
    run: async page => {
      const can = await page.evaluate(() => new Promise(r => { const c = document.createElement('canvas'); c.width = c.height = 2; c.toBlob(b => r(!!b && b.type === 'image/avif'), 'image/avif', 0.8); }));
      await upload(page, file(await fixture(page, { w: 40, h: 40 }), 'x.png', 'image/png'));
      await page.getByText('Original (PNG)').waitFor();
      await page.waitForTimeout(200);
      const shown = await page.locator('#view .chip:visible', { hasText: /^AVIF$/ }).count();
      return ok(shown === (can ? 1 : 0), { can, shown });
    }
  },
  /* --- Remove Photo Metadata (EXIF) --------------------------------------- */
  {
    name: 'exif-remover: shows camera, date and GPS (51.5, −0.125) from a JPEG, then strips EXIF, XMP, IPTC, comment and trailer, keeping ICC and the image bytes',
    tool: 'exif-remover',
    run: async page => {
      const p = jpegPieces(await fixture(page, { w: 64, h: 48, kind: 'gradient', mime: 'image/jpeg' }));
      const icc = jpegSeg(0xE2, Buffer.concat([Buffer.from('ICC_PROFILE\0', 'latin1'), Buffer.from([1, 1]), Buffer.alloc(128, 7)]));
      const input = Buffer.concat([p.soi, p.app0,
        jpegSeg(0xE1, Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), CAMERA_TIFF(1)])),
        jpegSeg(0xE1, Buffer.from('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF/></x:xmpmeta>', 'latin1')),
        jpegSeg(0xED, Buffer.concat([Buffer.from('Photoshop 3.0\0' + '8BIM', 'latin1'), Buffer.from([4, 4, 0, 0, 0, 0, 0, 4, 0x1C, 2, 0x78, 0])])),
        jpegSeg(0xFE, Buffer.from('Shot by Jane at 12 Acacia Avenue', 'latin1')),
        icc, p.rest, Buffer.from('MOTIONVIDEO'.repeat(40), 'latin1')]);
      const expected = Buffer.concat([p.soi, p.app0, icc, p.rest]);
      await upload(page, file(input, 'holiday.jpg', 'image/jpeg'));
      await page.waitForSelector('#view [data-k="found"]');
      const gps = await textK(page, 'gps'), found = await textK(page, 'found');
      await btn(page, 'Remove metadata').click();
      await page.waitForSelector('#view [data-k="result"]', { timeout: 20000 });
      const verdict = await textK(page, 'result'), sizes = await textK(page, 'sizes');
      const dl = await download(page, () => page.locator('#view [data-k="file"] button', { hasText: 'Download' }).first().click());
      const facts = ['Camera: Canon EOS R6', 'Taken: 09/03/2024 14:05', 'Software: Firmware 1.8', 'EXIF block: 13 fields', 'XMP metadata', 'IPTC block',
        'Comment: “Shot by Jane at 12 Acacia Avenue”', 'of extra data after the image'];
      const missing = facts.filter(f => !found.includes(f));
      return ok(/51\.500000, -0\.125000/.test(gps) && !missing.length && dl.bytes.equals(expected) && dl.name === 'holiday.jpg' &&
        verdict === 'Clean: no metadata left' && /→/.test(sizes),
        { gps, missing, found: found.slice(0, 200), same: dl.bytes.equals(expected), got: dl.bytes.length, want: expected.length, verdict, sizes });
    }
  },
  {
    name: 'exif-remover: a sideways JPEG keeps a minimal orientation-only EXIF (lossless), or can be turned upright instead',
    tool: 'exif-remover',
    run: async page => {
      const p = jpegPieces(await fixture(page, { w: 64, h: 48, kind: 'halves', mime: 'image/jpeg' }));
      const input = Buffer.concat([p.soi, p.app0, jpegSeg(0xE1, Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), CAMERA_TIFF(6)])), p.rest]);
      /* by hand from the EXIF spec: APP1, length 34, "Exif\0\0", II*\0, IFD0 at 8, one entry 0x0112 SHORT x1 = 6, no next IFD */
      const minimal = Buffer.from([0xFF, 0xE1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66, 0, 0, 0x49, 0x49, 0x2A, 0, 8, 0, 0, 0, 1, 0, 0x12, 0x01, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0]);
      await upload(page, file(input, 'side.jpg', 'image/jpeg'));
      await page.waitForSelector('#view [data-k="found"]');
      const found = await textK(page, 'found');
      await btn(page, 'Remove metadata').click();
      await page.waitForSelector('#view [data-k="result"]', { timeout: 20000 });
      const verdict = await textK(page, 'result');
      const kept = await download(page, () => page.locator('#view [data-k="file"] button', { hasText: 'Download' }).first().click());
      await page.getByRole('button', { name: 'Turn the pixels upright (re-compresses)' }).click();
      await btn(page, 'Remove metadata').click();
      await page.waitForFunction(() => /no metadata left/.test((document.querySelector('#view [data-k="result"]') || {}).textContent || ''), null, { timeout: 20000 });
      const turned = await download(page, () => page.locator('#view [data-k="file"] button', { hasText: 'Download' }).first().click());
      const s = jpegSize(turned.bytes);
      return ok(/Orientation: Turned 90° clockwise/.test(found) && kept.bytes.equals(Buffer.concat([p.soi, p.app0, minimal, p.rest])) &&
        verdict === 'Clean: only the orientation tag is left' && s && s.w === 48 && s.h === 64,
        { found: found.slice(0, 120), keptOk: kept.bytes.equals(Buffer.concat([p.soi, p.app0, minimal, p.rest])), verdict, turned: s });
    }
  },
  {
    name: 'exif-remover: PNG text/XMP/tIME/eXIf/iCCP chunks and WebP EXIF/XMP chunks go in a batch; pixels byte-identical; ZIP of both',
    tool: 'exif-remover',
    run: async page => {
      const png = await fixture(page, { w: 40, h: 30, kind: 'quads' });
      const ihdrEnd = 8 + 12 + png.readUInt32BE(8);
      const zlib = require('zlib');
      const extra = Buffer.concat([
        pngChunk('iCCP', Buffer.concat([Buffer.from('Display P3\0\0', 'latin1'), zlib.deflateSync(Buffer.alloc(64, 1))])),
        pngChunk('tEXt', Buffer.from('Software\0Paint 5', 'latin1')),
        pngChunk('iTXt', Buffer.from('XML:com.adobe.xmp\0\0\0\0\0<x:xmpmeta/>', 'latin1')),
        pngChunk('zTXt', Buffer.concat([Buffer.from('Comment\0\0', 'latin1'), zlib.deflateSync(Buffer.from('secret'))])),
        pngChunk('tIME', Buffer.from([0x07, 0xE8, 3, 9, 14, 5, 33])),
        pngChunk('eXIf', tiff({ ifd0: [[0x010F, 2, 'Nikon'], [0x0110, 2, 'Z 6']] }))]);
      const pngIn = Buffer.concat([png.slice(0, ihdrEnd), extra, png.slice(ihdrEnd)]);

      const webp = await fixture(page, { w: 40, h: 30, kind: 'halves', mime: 'image/webp' });
      /* the canvas encoder's own chunks (Chrome writes VP8X, ICCP and VP8), minus its VP8X header */
      const own = []; for (let o = 12; o + 8 <= webp.length;) { const n = webp.readUInt32LE(o + 4), end = o + 8 + n + (n & 1); own.push({ id: webp.slice(o, o + 4).toString('latin1'), b: webp.slice(o, end) }); o = end; }
      const body = Buffer.concat(own.filter(c => c.id !== 'VP8X').map(c => c.b));
      const bodyNoIcc = Buffer.concat(own.filter(c => c.id !== 'VP8X' && c.id !== 'ICCP').map(c => c.b));
      const vp8x = Buffer.alloc(18); vp8x.write('VP8X', 0, 'latin1'); vp8x.writeUInt32LE(10, 4); vp8x[8] = (own.some(c => c.id === 'ICCP') ? 0x20 : 0) | 0x08 | 0x04;
      vp8x.writeUIntLE(40 - 1, 12, 3); vp8x.writeUIntLE(30 - 1, 15, 3);
      const chunk = (id, data) => { const h = Buffer.alloc(8); h.write(id, 0, 'latin1'); h.writeUInt32LE(data.length, 4); return Buffer.concat([h, data, data.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0)]); };
      const riff = parts => { const b = Buffer.concat(parts), h = Buffer.alloc(12); h.write('RIFF', 0, 'latin1'); h.writeUInt32LE(b.length + 4, 4); h.write('WEBP', 8, 'latin1'); return Buffer.concat([h, b]); };
      const webpIn = riff([vp8x, body, chunk('EXIF', tiff({ ifd0: [[0x010F, 2, 'Sony'], [0x0110, 2, 'A7']] })), chunk('XMP ', Buffer.from('<x:xmpmeta/>', 'latin1'))]);
      const vp8xClean = Buffer.from(vp8x); vp8xClean[8] = 0;
      const webpWant = riff([vp8xClean, bodyNoIcc]);

      await upload(page, [file(pngIn, 'shot.png', 'image/png'), file(webpIn, 'pic.webp', 'image/webp')]);
      await page.waitForFunction(() => document.querySelectorAll('#view [data-k="found"]').length === 2);
      const found = await page.$$eval('#view [data-k="found"]', n => n.map(e => e.textContent));
      await page.locator('#view [data-k="keep-icc"]').uncheck();
      await btn(page, 'Remove metadata').click();
      await page.waitForFunction(() => document.querySelectorAll('#view [data-k="result"]').length === 2, null, { timeout: 20000 });
      const dl = await download(page, () => btn(page, 'Download all (ZIP)').click());
      const zip = await JSZip.loadAsync(dl.bytes);
      const pngOut = await zip.file('shot.png').async('nodebuffer'), webpOut = await zip.file('pic.webp').async('nodebuffer');
      return ok(/Camera: Nikon Z 6/.test(found[0]) && /Text “Software”: Paint 5/.test(found[0]) && /XMP/.test(found[0]) && /tIME/.test(found[0]) &&
        /Camera: Sony A7/.test(found[1]) && pngOut.equals(png) && webpOut.equals(webpWant),
        { found, png: pngOut.equals(png), pngLen: [pngOut.length, png.length], webp: webpOut.equals(webpWant), webpLen: [webpOut.length, webpWant.length], ids: [riffIds(webpIn), riffIds(webpOut)] });
    }
  },

  /* --- Blur or Pixelate Part of an Image ---------------------------------- */
  {
    name: 'image-pixelate: 10 px blocks over 1-px stripes average to 128 grey; outside untouched; oval solid box is exact #123456',
    tool: 'image-pixelate',
    run: async page => {
      await upload(page, file(await stripes(page), 'stripes.png', 'image/png'));
      await page.waitForSelector('#view .g-stage canvas');
      await dragOn(page, '#view .g-stage canvas', [22, 22], [58, 58]);
      await setK(page, 'rx', 20); await setK(page, 'ry', 20); await setK(page, 'rw', 40); await setK(page, 'rh', 40);
      await setK(page, 'block', 10);
      const count = await textK(page, 'region-count');
      const a = await download(page, () => btn(page, 'Download PNG').click());
      const pa = await decode(page, a.bytes, [[0.25, 0.25], [0.55, 0.55], [0.10, 0.10], [0.61, 0.25]]);
      await page.getByRole('button', { name: 'Solid box' }).click();
      await page.getByRole('button', { name: 'Oval' }).click();
      await page.fill('#view [data-k="box-colour"]', '#123456');
      const b = await download(page, () => btn(page, 'Download PNG').click());
      const pb = await decode(page, b.bytes, [[0.40, 0.40], [0.21, 0.21], [0.10, 0.10]]);
      await page.getByRole('button', { name: 'Blur', exact: true }).click();
      const c = await download(page, () => btn(page, 'Download PNG').click());
      const pc = await decode(page, c.bytes, [[0.40, 0.40], [0.10, 0.10]]);
      await page.locator('#view .g-stage').focus();
      await page.keyboard.press('Delete');
      const after = await textK(page, 'region-count');
      return ok(count === '1 area' && near(pa.px[0], [128, 128, 128, 255], 0) && near(pa.px[1], [128, 128, 128, 255], 0) &&
        near(pa.px[2], [0, 0, 0, 255], 0) && near(pa.px[3], [255, 255, 255, 255], 0) &&
        near(pb.px[0], [0x12, 0x34, 0x56, 255], 0) && near(pb.px[1], [255, 255, 255, 255], 0) && near(pb.px[2], [0, 0, 0, 255], 0) &&
        pc.px[0][0] > 60 && pc.px[0][0] < 195 && near(pc.px[1], [0, 0, 0, 255], 0) && after === '0 areas' && pa.w === 100,
        { count, pa: pa.px, pb: pb.px, pc: pc.px, after });
    }
  },
  {
    name: 'image-pixelate: warns that blur can be reversed on text and recommends a solid box',
    tool: 'image-pixelate',
    run: async page => {
      await upload(page, file(await stripes(page, 40, 40), 's.png', 'image/png'));
      await page.waitForSelector('#view .g-stage canvas');
      const t = await textK(page, 'blur-warning');
      return ok(/reversed/.test(t) && /solid box/.test(t), t);
    }
  },

  /* --- Screenshot Annotator ---------------------------------------------- */
  {
    name: 'image-annotate: pasted screenshot, blue rectangle, undo/redo, crop and copy to clipboard as PNG',
    tool: 'image-annotate',
    run: async page => {
      await page.evaluate(async () => {
        const c = document.createElement('canvas'); c.width = 300; c.height = 200;
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 300, 200);
        const blob = await new Promise(r => c.toBlob(r, 'image/png'));
        const dt = new DataTransfer(); dt.items.add(new File([blob], 'shot.png', { type: 'image/png' }));
        document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
        /* capture what "Copy image" hands to the clipboard */
        window.__clip = null;
        navigator.clipboard.write = async items => { window.__clip = items; };
      });
      await page.waitForFunction(() => /300 × 200 px/.test((document.querySelector('#view [data-k="size"]') || {}).textContent || ''));
      const grab = async () => {
        await page.evaluate(() => { window.__clip = null; });
        await btn(page, 'Copy image').click();
        await page.waitForFunction(() => window.__clip);
        return page.evaluate(async () => {
          const item = window.__clip[0], blob = await item.getType('image/png');
          const bmp = await createImageBitmap(blob), c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
          const g = c.getContext('2d'); g.drawImage(bmp, 0, 0);
          const at = (x, y) => Array.from(g.getImageData(x, y, 1, 1).data);
          return { types: item.types, w: bmp.width, h: bmp.height, edge: at(50, 85), inside: at(100, 85) };
        });
      };
      await page.getByRole('button', { name: 'Rectangle', exact: true }).click();
      await page.getByRole('button', { name: 'Colour #2563eb' }).click();
      await dragOn(page, '#view .g-stage canvas', [50, 50], [150, 120]);
      const drawn = await grab();
      await page.locator('#view .g-stage').focus();
      await page.keyboard.press('Control+z');
      const undone = await grab();
      await page.keyboard.press('Control+y');
      const redone = await grab();
      await page.getByRole('button', { name: 'Numbered step', exact: true }).click();
      await clickOn(page, '#view .g-stage canvas', 250, 40);
      await clickOn(page, '#view .g-stage canvas', 250, 160);
      const marks = await textK(page, 'objects');
      await page.getByRole('button', { name: 'Crop', exact: true }).click();
      await dragOn(page, '#view .g-stage canvas', [40, 30], [200, 130]);
      const size = await textK(page, 'size');
      const png = await download(page, () => btn(page, 'Download PNG').click());
      const s = pngSize(png.bytes);
      const blue = [37, 99, 235];
      return ok(drawn.types.includes('image/png') && drawn.w === 300 && near(drawn.edge.slice(0, 3), blue, 30) && near(drawn.inside.slice(0, 3), [255, 255, 255], 2) &&
        near(undone.edge.slice(0, 3), [255, 255, 255], 2) && near(redone.edge.slice(0, 3), blue, 30) && marks === '3 marks' &&
        /^160 × 100 px \(cropped\)$/.test(size) && s.w === 160 && s.h === 100,
        { drawn, undone: undone.edge, redone: redone.edge, marks, size, s });
    }
  },
  {
    name: 'image-annotate: text typed on the picture becomes a mark; Delete removes the selected mark',
    tool: 'image-annotate',
    run: async page => {
      await upload(page, file(await fixture(page, { w: 200, h: 120, kind: 'solid', fill: '#ffffff' }), 'white.png', 'image/png'));
      await page.waitForFunction(() => /200 × 120 px/.test((document.querySelector('#view [data-k="size"]') || {}).textContent || ''));
      await page.getByRole('button', { name: 'Text', exact: true }).click();
      await clickOn(page, '#view .g-stage canvas', 20, 20);
      await page.waitForSelector('#view [data-k="text-input"]');
      await page.keyboard.type('Hi');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('#view [data-k="objects"]').textContent === '1 mark').catch(() => {});
      const one = await textK(page, 'objects');
      await page.getByRole('button', { name: 'Select and move', exact: true }).click();
      await clickOn(page, '#view .g-stage canvas', 26, 30);
      await page.keyboard.press('Delete');
      await page.waitForFunction(() => document.querySelector('#view [data-k="objects"]').textContent === '0 marks').catch(() => {});
      const none = await textK(page, 'objects');
      return ok(one === '1 mark' && none === '0 marks', { one, none });
    }
  },

  /* --- Before & After Image Compare -------------------------------------- */
  {
    name: 'image-compare: a quarter of pixels +10 in red gives 25% changed, MAE 0.833, PSNR 38.92 dB; the diff map shows 10 × 5 = 50',
    tool: 'image-compare',
    run: async page => {
      const [a, b] = await page.evaluate(async () => {
        const make = async edit => {
          const c = document.createElement('canvas'); c.width = 100; c.height = 100;
          const x = c.getContext('2d'); x.fillStyle = 'rgb(100,100,100)'; x.fillRect(0, 0, 100, 100);
          if (edit) { x.fillStyle = 'rgb(110,100,100)'; x.fillRect(0, 0, 25, 100); }
          const u = new Uint8Array(await (await new Promise(r => c.toBlob(r, 'image/png'))).arrayBuffer());
          let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
          return btoa(s);
        };
        return [await make(false), await make(true)];
      });
      await upload(page, file(Buffer.from(a, 'base64'), 'before.png', 'image/png'), 0);
      await upload(page, file(Buffer.from(b, 'base64'), 'after.png', 'image/png'), 2);
      await page.waitForSelector('#view [data-k="pct"]');
      await setK(page, 'threshold', 0);
      const at0 = { pct: await textK(page, 'pct'), mae: await textK(page, 'mae'), psnr: await textK(page, 'psnr'), max: await textK(page, 'max'), dims: await textK(page, 'dims') };
      await setK(page, 'threshold', 10);
      const at10 = await textK(page, 'pct');
      await page.getByRole('button', { name: 'Difference', exact: true }).click();
      const d = await page.evaluate(() => { const c = document.querySelector('#view canvas[data-k="diff"]'); return [Array.from(c.getContext('2d').getImageData(10, 50, 1, 1).data), Array.from(c.getContext('2d').getImageData(60, 50, 1, 1).data)]; });
      return ok(at0.pct === '25%' && at0.mae === '0.833' && at0.psnr === '38.92 dB' && at0.max === '10 / 255' && at0.dims === '100 × 100 px' &&
        at10 === '0%' && near(d[0], [50, 0, 0, 255], 0) && near(d[1], [0, 0, 0, 255], 0), { at0, at10, d });
    }
  },
  {
    name: 'image-compare: different sizes are stretched to A or compared over the overlap; identical pictures score ∞',
    tool: 'image-compare',
    run: async page => {
      const big = await fixture(page, { w: 120, h: 80 });
      await upload(page, file(big, 'big.png', 'image/png'), 0);
      await upload(page, file(await fixture(page, { w: 60, h: 40 }), 'small.png', 'image/png'), 2);
      await page.waitForSelector('#view [data-k="dims"]');
      const scaled = await textK(page, 'dims');
      await page.getByRole('button', { name: 'Compare the overlapping top-left area' }).click();
      const cropped = await textK(page, 'dims');
      await upload(page, file(big, 'same.png', 'image/png'), 3);
      await page.waitForFunction(() => /^∞/.test(document.querySelector('#view [data-k="psnr"]').textContent));
      const psnr = await textK(page, 'psnr');
      const modes = [];
      for (const m of ['Slider', 'Side by side', 'Overlay', 'Blink']) {
        await page.getByRole('button', { name: m, exact: true }).click();
        modes.push(await page.locator('#view .g-stagewrap canvas').count());
      }
      return ok(scaled === '120 × 80 px' && /^∞/.test(psnr) && cropped === '60 × 40 px' && modes.every(n => n >= 1), { scaled, psnr, cropped, modes });
    }
  },

  /* --- Images to GIF ------------------------------------------------------- */
  {
    name: 'images-to-gif: 3 frames at 80 × 60, delays 20/50/20 cs, plays 3 times (NETSCAPE loop 2), reordered to red, blue, green',
    tool: 'images-to-gif',
    run: async page => {
      const red = await fixture(page, { w: 40, h: 30, kind: 'solid', fill: '#ff0000' });
      const green = await fixture(page, { w: 40, h: 30, kind: 'solid', fill: '#00ff00' });
      const blue = await fixture(page, { w: 40, h: 30, kind: 'solid', fill: '#0000ff' });
      await upload(page, [file(red, 'r.png', 'image/png'), file(green, 'g.png', 'image/png'), file(blue, 'b.png', 'image/png')]);
      await page.waitForFunction(() => document.querySelectorAll('#view [data-k="frame"]').length === 3);
      await setK(page, 'width', 80);
      const h = await page.inputValue('#view [data-k="height"]');
      await setK(page, 'delay', 200);
      await page.getByRole('button', { name: 'Move frame 3 up' }).click();
      await page.locator('#view [data-k="frame"] input[type=number]').nth(1).fill('500');
      await page.getByRole('button', { name: 'A set number of times' }).click();
      await setK(page, 'loop-times', 3);
      await btn(page, 'Make GIF').click();
      await page.waitForSelector('#view [data-k="gif-size"]', { timeout: 30000 });
      const info = await resultInfo(page);
      const dl = await download(page, () => btn(page, 'Download GIF').click());
      const g = parseGif(dl.bytes);
      const cols = g.frames.map(f => f.centre);
      return ok(h === '60' && g.sig === 'GIF89a' && g.w === 80 && g.h === 60 && g.loop === 2 && g.delays.join() === '20,50,20' && g.frames.length === 3 &&
        near(cols[0], [255, 0, 0], 8) && near(cols[1], [0, 0, 255], 8) && near(cols[2], [0, 255, 0], 8) && /3 frames/.test(info) && /plays 3 times/.test(info) && dl.name === 'animation.gif',
        { h, g: { sig: g.sig, w: g.w, h: g.h, loop: g.loop, delays: g.delays, n: g.frames.length }, cols, info });
    }
  },
  {
    name: 'images-to-gif: crop fills the frame; fit pads with the border colour; "play once" writes no loop block',
    tool: 'images-to-gif',
    run: async page => {
      await upload(page, file(await fixture(page, { w: 100, h: 50, kind: 'solid', fill: '#ff0000' }), 'wide.png', 'image/png'));
      await page.waitForFunction(() => document.querySelectorAll('#view [data-k="frame"]').length === 1);
      await setK(page, 'width', 60); await setK(page, 'height', 60);
      await page.fill('#view .g-color input[type=text]', '#0000ff');
      await page.getByRole('button', { name: 'Play once' }).click();
      await btn(page, 'Make GIF').click();
      await page.waitForSelector('#view [data-k="gif-size"]', { timeout: 30000 });
      const fit = parseGif((await download(page, () => btn(page, 'Download GIF').click())).bytes);
      const fitPx = await decode(page, (await download(page, () => btn(page, 'Download GIF').click())).bytes, [[0.5, 0.05], [0.5, 0.5]]);
      await page.getByRole('button', { name: 'Crop to fill' }).click();
      await btn(page, 'Make GIF').click();
      await page.waitForTimeout(100);
      await page.waitForSelector('#view [data-k="gif-size"]', { timeout: 30000 });
      const cropPx = await decode(page, (await download(page, () => btn(page, 'Download GIF').click())).bytes, [[0.5, 0.05], [0.5, 0.5]]);
      return ok(fit.loop === null && near(fitPx.px[0].slice(0, 3), [0, 0, 255], 8) && near(fitPx.px[1].slice(0, 3), [255, 0, 0], 8) &&
        near(cropPx.px[0].slice(0, 3), [255, 0, 0], 8), { loop: fit.loop, fit: fitPx.px, crop: cropPx.px });
    }
  },

  /* --- Image Splitter & Poster Tiles --------------------------------------- */
  {
    name: 'image-splitter: 300 × 200 into 2 × 3 gives six 100 × 100 tiles; 10 px overlap makes the middle-top tile 110 × 105',
    tool: 'image-splitter',
    run: async page => {
      await upload(page, file(await fixture(page, { w: 300, h: 200, kind: 'quads' }), 'photo.png', 'image/png'));
      await page.waitForSelector('#view [data-k="plan"]');
      const plan = await textK(page, 'plan');
      const dl = await download(page, () => btn(page, 'Download tiles (ZIP)').click());
      const zip = await JSZip.loadAsync(dl.bytes);
      const names = Object.keys(zip.files).sort();
      const sizes = await Promise.all(names.map(async n => pngSize(await zip.file(n).async('nodebuffer'))));
      const r2c1 = await decode(page, await zip.file('photo_r2_c1.png').async('nodebuffer'), [[0.5, 0.5]]);
      await setK(page, 'overlap', 10);
      const plan2 = await textK(page, 'plan');
      const dl2 = await download(page, () => btn(page, 'Download tiles (ZIP)').click());
      const zip2 = await JSZip.loadAsync(dl2.bytes);
      const mid = pngSize(await zip2.file('photo_r1_c2.png').async('nodebuffer'));
      const corner = pngSize(await zip2.file('photo_r2_c3.png').async('nodebuffer'));
      return ok(plan === '6 tiles (2 rows × 3 columns), 100 × 100 px each' && names.join() === 'photo_r1_c1.png,photo_r1_c2.png,photo_r1_c3.png,photo_r2_c1.png,photo_r2_c2.png,photo_r2_c3.png' &&
        sizes.every(s => s.w === 100 && s.h === 100) && near(r2c1.px[0].slice(0, 3), [0, 0, 255], 2) &&
        plan2 === '6 tiles (2 rows × 3 columns), from 105 × 105 to 110 × 105 px' && mid.w === 110 && mid.h === 105 && corner.w === 105 && corner.h === 105,
        { plan, names, sizes, plan2, mid, corner });
    }
  },
  {
    name: 'image-splitter: poster of a 1000 × 1414 picture, 2 A4 pages across (10 mm margin and overlap) is 2 × 2 pages, 370 × 523 mm',
    tool: 'image-splitter',
    run: async page => {
      await upload(page, file(await fixture(page, { w: 1000, h: 1414, kind: 'gradient' }), 'big.png', 'image/png'));
      await page.waitForSelector('#view [data-k="plan"]');
      await page.getByRole('button', { name: 'Poster (PDF)' }).click();
      const plan = await textK(page, 'plan');
      const dl = await download(page, () => btn(page, 'Download poster (PDF)').click());
      const pdf = await PDFDocument.load(dl.bytes);
      const pages = pdf.getPages().map(p => p.getSize()).map(s => [+s.width.toFixed(2), +s.height.toFixed(2)]);
      await page.getByRole('button', { name: 'Landscape' }).click();
      await setK(page, 'across', 3);
      const plan3 = await textK(page, 'plan');
      return ok(/^2 × 2 pages of A4 \(4 in all\) · finished poster about 370 × 523 mm · 69 dpi/.test(plan) && pages.length === 4 &&
        pages.every(s => s[0] === 595.28 && s[1] === 841.89) && /^3 × 7 pages of A4 \(21 in all\)/.test(plan3) && dl.name === 'big-poster.pdf',
        { plan, pages, plan3 });
    }
  }
];
