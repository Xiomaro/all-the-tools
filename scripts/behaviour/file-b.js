/* Behaviour checks for file-b.js (Unzip & Extract Archives, Bulk File
   Renamer, File Splitter & Joiner, Duplicate File Finder, Binary File
   Compare). Archives are built here by hand (TAR, gzip with a stored name,
   a stored 7z, a stored RAR 4, a ZipCrypto ZIP) or with JSZip; the small
   bzip2/xz files below were made once with the bzip2 and xz tools from the
   plain texts written next to them. */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const zlib = require('zlib');
const JSZip = require('jszip');

const FILE = '#view input[type=file]';
const ok = (cond, detail) => ({ ok: !!cond, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const btn = (page, name, exact = true) => page.getByRole('button', { name, exact }).first();
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
async function download(page, click) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), click()]);
  return { name: dl.suggestedFilename(), buf: fs.readFileSync(await dl.path()) };
}

/* bzip2 -c of "Hello from bzip2!\n" */
const HELLO_BZ2 = Buffer.from('QlpoOTFBWSZTWaBrjIYAAALdgAAQYAAQAABAEybQECAAMUwAAU0xBh6pqJen3xCL6gB8XckU4UJCga4yGA==', 'base64');
/* xz -c of "Notes compressed with xz.\nSecond line.\n" */
const NOTES_XZ = Buffer.from('/Td6WFoAAATm1rRGAgAhARYAAAB0L+WjAQAmTm90ZXMgY29tcHJlc3NlZCB3aXRoIHh6LgpTZWNvbmQgbGluZS4KAACLidF24Eph8AABPyd8KlLdH7bzfQEAAAAABFla', 'base64');
/* tar (ustar) of proj/README.md "# Project\n" and proj/src/main.py 'print("hi")\n', both dated 05/03/2024 14:30 UTC,
   compressed with xz and with bzip2 */
const PROJ_TAR_XZ = Buffer.from('/Td6WFoAAATm1rRGAgAhARYAAAB0L+Wj4Cf/AMJdADgciiIyk3FnzI8kBlv4GZenC0kgMQhAeC96xiyeDSjqNxx4mXuQCvKdxP+GujEgnVeUFmZ4UwpxGk3cFkxqBuewMm3LpY46Bts3/kamqgY3DzCRed6qIfXfWOwPQzf6NLijpZ98lt8W38AsfYYQ5ej37HJGsUK5OLSvMN7+meCbkVPg4nlOlQsD3bgjuIqqhCsGHatcFtIK9btueljrE5qUVWK+IqcJ/118NV/L+erkQildmb0ZecmKrUaMoRDdMnYgAAAA2D4K4BzPFYUAAd4BgFAAALkY5FexxGf7AgAAAAAEWVo=', 'base64');
const PROJ_TAR_BZ2 = Buffer.from('QlpoOTFBWSZTWXOhx3gAAPL/hMqQQEBYYf+AJgJQiG5z3iAAAKAIMADYUJUoxomCYgwEZGAyTEMZDIaDQaNAGgAaGBVJMUyT1DTIZpDRoZPSGQ058j93Z2hqVMi+RESuiIIowlgkvHIymFcyZcRCRGnpnB38NX9XD048PtKTybXczBG/fjjoIafe1G2TxTnVNJeovUWGtKxbYo6lbKyUMqdqq2yxRVc3Ti1colo3458cnXL2kjjrNopiala06oHV/BlAhkC1XHMS4G5ug+2BsEBwD4+McpzOjAg/xdyRThQkHOhx3gA=', 'base64');

/* --- hand-made archives --------------------------------------------------------- */

/* ustar: [{ name, data, mtime (seconds), dir }] */
function makeTar(entries) {
  const blocks = [];
  for (const e of entries) {
    const h = Buffer.alloc(512);
    h.write(e.name, 0, 'utf8');
    h.write((e.dir ? '0000755' : '0000644') + '\0', 100);
    h.write('0000000\0', 108); h.write('0000000\0', 116);
    const size = e.dir ? 0 : e.data.length;
    h.write(size.toString(8).padStart(11, '0') + '\0', 124);
    h.write(e.mtime.toString(8).padStart(11, '0') + '\0', 136);
    h.write('        ', 148);
    h[156] = e.dir ? 0x35 : 0x30;
    h.write('ustar\0', 257); h.write('00', 263);
    let sum = 0; for (const b of h) sum += b;
    h.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
    blocks.push(h);
    if (!e.dir) { blocks.push(e.data); if (size % 512) blocks.push(Buffer.alloc(512 - size % 512)); }
  }
  blocks.push(Buffer.alloc(1024));
  return Buffer.concat(blocks);
}

/* gzip with a stored file name (FNAME) and time */
function gzipNamed(data, name, mtime) {
  const head = Buffer.from([0x1f, 0x8b, 8, 8, mtime & 255, (mtime >> 8) & 255, (mtime >> 16) & 255, (mtime >>> 24) & 255, 0, 3]);
  const tail = Buffer.alloc(8); tail.writeUInt32LE(zlib.crc32(data), 0); tail.writeUInt32LE(data.length, 4);
  return Buffer.concat([head, Buffer.from(name + '\0', 'latin1'), zlib.deflateRawSync(data), tail]);
}

/* 7z with one folder using the Copy coder (stored), files back to back. */
function make7z(files) {
  const num = v => {
    for (let i = 0; i < 8; i++) {
      if (v < 2 ** (7 * (i + 1))) {
        const high = Math.floor(v / 2 ** (8 * i)), out = [((0xFF << (8 - i)) & 0xFF) | high];
        for (let k = 0; k < i; k++) out.push(Math.floor(v / 2 ** (8 * k)) & 0xFF);
        return out;
      }
    }
  };
  const packed = Buffer.concat(files.map(f => f.data));
  const u32 = v => { const b = Buffer.alloc(4); b.writeUInt32LE(v >>> 0); return [...b]; };
  const names = Buffer.concat(files.map(f => Buffer.from(f.name + '\0', 'utf16le')));
  const h = [0x01, 0x04,
    0x06, ...num(0), ...num(1), 0x09, ...num(packed.length), 0x00,
    0x07, 0x0B, ...num(1), 0x00, 0x01, 0x01, 0x00, 0x0C, ...num(packed.length), 0x00,
    0x08, 0x0D, ...num(files.length), 0x09, ...files.slice(0, -1).flatMap(f => num(f.data.length)),
    0x0A, 0x01, ...files.flatMap(f => u32(zlib.crc32(f.data))), 0x00,
    0x00,
    0x05, ...num(files.length), 0x11, ...num(names.length + 1), 0x00, ...names, 0x00,
    0x00];
  const header = Buffer.from(h);
  const start = Buffer.alloc(20);
  start.writeBigUInt64LE(BigInt(packed.length), 0); start.writeBigUInt64LE(BigInt(header.length), 8); start.writeUInt32LE(zlib.crc32(header), 16);
  const sig = Buffer.concat([Buffer.from([0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C, 0, 4]), Buffer.alloc(4), start]);
  sig.writeUInt32LE(zlib.crc32(start), 8);
  return Buffer.concat([sig, packed, header]);
}

/* RAR 4 with stored (method 0x30) files. */
function makeRar(files) {
  const block = (type, flags, body, extra = Buffer.alloc(0)) => {
    const head = Buffer.alloc(5 + body.length);
    head[0] = type; head.writeUInt16LE(flags, 1); head.writeUInt16LE(7 + body.length, 3); body.copy(head, 5);
    const crc = Buffer.alloc(2); crc.writeUInt16LE(zlib.crc32(head) & 0xFFFF);
    return Buffer.concat([crc, head, extra]);
  };
  const parts = [Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00]), block(0x73, 0, Buffer.alloc(6))];
  for (const f of files) {
    const name = Buffer.from(f.name, 'latin1'), b = Buffer.alloc(25 + name.length);
    b.writeUInt32LE(f.data.length, 0); b.writeUInt32LE(f.data.length, 4); b[8] = 2;
    b.writeUInt32LE(zlib.crc32(f.data), 9); b.writeUInt32LE(0x58654E80, 13); b[17] = 20; b[18] = 0x30;
    b.writeUInt16LE(name.length, 19); b.writeUInt32LE(0x20, 21); name.copy(b, 25);
    parts.push(block(0x74, 0x8000, b, f.data));
  }
  parts.push(block(0x7B, 0x4000, Buffer.alloc(0)));
  return Buffer.concat(parts);
}

/* ZIP with traditional PKWARE (ZipCrypto) encryption, stored entries. */
function makeZipCrypto(files, password) {
  const T = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
  const crcByte = (k, b) => (T[(k ^ b) & 255] ^ (k >>> 8)) >>> 0;
  const locals = [], central = [];
  let offset = 0;
  for (const f of files) {
    const keys = [0x12345678, 0x23456789, 0x34567890];
    const upd = b => { keys[0] = crcByte(keys[0], b); keys[1] = (Math.imul((keys[1] + (keys[0] & 255)) >>> 0, 134775813) + 1) >>> 0; keys[2] = crcByte(keys[2], keys[1] >>> 24); };
    const stream = () => { const t = (keys[2] | 2) >>> 0; return (Math.imul(t, t ^ 1) >>> 8) & 255; };
    for (const c of Buffer.from(password, 'latin1')) upd(c);
    const crc = zlib.crc32(f.data);
    const plain = Buffer.concat([crypto.randomBytes(11), Buffer.from([crc >>> 24]), f.data]);
    const enc = Buffer.alloc(plain.length);
    for (let i = 0; i < plain.length; i++) { enc[i] = plain[i] ^ stream(); upd(plain[i]); }
    const name = Buffer.from(f.name);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(1, 6); lh.writeUInt16LE(0, 8);
    lh.writeUInt16LE(0x7000, 10); lh.writeUInt16LE(0x5865, 12); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(enc.length, 18); lh.writeUInt32LE(f.data.length, 22); lh.writeUInt16LE(name.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(1, 8);
    ch.writeUInt16LE(0x7000, 12); ch.writeUInt16LE(0x5865, 14); ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(enc.length, 20); ch.writeUInt32LE(f.data.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(offset, 42);
    locals.push(lh, name, enc); central.push(ch, name);
    offset += 30 + name.length + enc.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

/* the page's own dd/mm/yyyy HH:mm for a UTC time (the tool shows local time) */
const localStamp = (page, ms) => page.evaluate(ms => { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }, ms);
const rowText = (page, path) => page.locator(`.g-row[data-path="${path}"]`).innerText().then(t => t.replace(/\s+/g, ' '));
async function openArchive(page, name, buf) {
  await page.setInputFiles(FILE, { name, mimeType: 'application/octet-stream', buffer: buf });
  await page.locator('[data-k="summary"]').waitFor({ timeout: 30000 });
  return page.textContent('[data-k="summary"]');
}
async function previewOf(page, path) {
  await page.locator(`.g-row[data-path="${path}"]`).getByRole('button', { name: 'View' }).click();
  await page.locator('[data-k="preview"]').waitFor({ timeout: 30000 });
  return page.textContent('[data-k="preview"]');
}

/* Put File objects (with chosen lastModified times) into a file input. */
async function giveFiles(page, selector, files) {
  await page.evaluate(({ selector, files }) => {
    const dt = new DataTransfer();
    for (const f of files) dt.items.add(new File([Uint8Array.from(atob(f.b64), c => c.charCodeAt(0))], f.name, { lastModified: f.lm || Date.now() }));
    const input = document.querySelector(selector);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, { selector, files: files.map(f => ({ name: f.name, b64: Buffer.from(f.data).toString('base64'), lm: f.lm })) });
}
const newNames = page => page.locator('[data-k="new-name"]').allTextContents();

module.exports = [
  {
    name: 'archive-extractor: ZIP tree with sizes and dates, text preview, single save, folder selection re-zipped', tool: 'archive-extractor',
    run: async (page) => {
      const when = Date.UTC(2024, 2, 5, 14, 30);
      const zip = new JSZip();
      zip.file('docs/readme.txt', 'Read me first\nLine two\n', { date: new Date(when) });
      zip.file('docs/sub/data.json', '{"a":1}', { date: new Date(when) });
      zip.file('img/dot.bin', Buffer.from([1, 2, 3, 4, 5]), { date: new Date(when) });
      const summary = await openArchive(page, 'bundle.zip', await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
      const row = await rowText(page, 'docs/readme.txt');
      const stamp = await localStamp(page, when);
      const text = await previewOf(page, 'docs/readme.txt');
      const one = await download(page, () => page.locator('.g-row[data-path="img/dot.bin"]').getByRole('button', { name: 'Save' }).click());
      await page.check('details[data-dir="docs"] > summary input[type=checkbox]');
      const sel = await page.textContent('[data-k="selected"]');
      const out = await download(page, () => btn(page, 'Save selected as ZIP').click());
      const z = await JSZip.loadAsync(out.buf);
      const names = Object.keys(z.files).filter(n => !z.files[n].dir).sort();
      const good = /^ZIP · 3 files · /.test(summary) && row.includes('readme.txt') && row.includes('23 B') && row.includes(stamp) &&
        text === 'Read me first\nLine two\n' && one.name === 'dot.bin' && one.buf.equals(Buffer.from([1, 2, 3, 4, 5])) &&
        sel === '2 files selected' && out.name === 'bundle-selection.zip' && names.join() === 'docs/readme.txt,docs/sub/data.json' &&
        (await z.file('docs/sub/data.json').async('string')) === '{"a":1}';
      return ok(good, { summary, row, stamp, text, one: one.name, sel, out: out.name, names });
    }
  },
  {
    name: 'archive-extractor: TAR, TAR.GZ and a named .gz (dates from the headers)', tool: 'archive-extractor',
    run: async (page) => {
      const mtime = Math.floor(Date.UTC(2023, 10, 20, 8, 5) / 1000);
      const tar = makeTar([{ name: 'site/', dir: true, mtime }, { name: 'site/index.html', data: Buffer.from('<h1>Hi</h1>\n'), mtime }, { name: 'site/css/app.css', data: Buffer.from('body{}'), mtime }]);
      const s1 = await openArchive(page, 'site.tar', tar);
      const r1 = await rowText(page, 'site/index.html');
      const stamp = await localStamp(page, mtime * 1000);
      const s2 = await openArchive(page, 'site.tgz', zlib.gzipSync(tar));
      const t2 = await previewOf(page, 'site/css/app.css');
      const s3 = await openArchive(page, 'download.gz', gzipNamed(Buffer.from('gzip body text\n'), 'notes.txt', mtime));
      const r3 = await rowText(page, 'notes.txt');
      const t3 = await previewOf(page, 'notes.txt');
      const good = /^TAR · 2 files · 18 B unpacked/.test(s1) && r1.includes('12 B') && r1.includes(stamp) &&
        /^gzip \+ TAR · 2 files/.test(s2) && t2 === 'body{}' && /^gzip · 1 file · 15 B/.test(s3) && r3.includes(stamp) && t3 === 'gzip body text\n';
      return ok(good, { s1, r1, stamp, s2, t2, s3, r3, t3 });
    }
  },
  {
    name: 'archive-extractor: bare .bz2 and .xz, and TAR.XZ / TAR.BZ2 made by the real tools', tool: 'archive-extractor',
    run: async (page) => {
      const s1 = await openArchive(page, 'hello.txt.bz2', HELLO_BZ2);
      const t1 = await previewOf(page, 'hello.txt');
      const s2 = await openArchive(page, 'notes.txt.xz', NOTES_XZ);
      const t2 = await previewOf(page, 'notes.txt');
      const s3 = await openArchive(page, 'proj.tar.xz', PROJ_TAR_XZ);
      const r3 = await rowText(page, 'proj/README.md');
      const t3 = await previewOf(page, 'proj/src/main.py');
      const stamp = await localStamp(page, Date.UTC(2024, 2, 5, 14, 30));
      const s4 = await openArchive(page, 'proj.tar.bz2', PROJ_TAR_BZ2);
      const t4 = await previewOf(page, 'proj/README.md');
      const good = /^bzip2 · 1 file · 18 B/.test(s1) && t1 === 'Hello from bzip2!\n' && /^xz · 1 file/.test(s2) && t2 === 'Notes compressed with xz.\nSecond line.\n' &&
        /^xz \+ TAR · 2 files/.test(s3) && r3.includes(stamp) && t3 === 'print("hi")\n' && /^bzip2 \+ TAR · 2 files/.test(s4) && t4 === '# Project\n';
      return ok(good, { s1, t1, s2, t2, s3, r3, stamp, t3, s4, t4 });
    }
  },
  {
    name: 'archive-extractor: 7z and RAR (libarchive), including a re-zip of the whole 7z', tool: 'archive-extractor',
    run: async (page) => {
      const s1 = await openArchive(page, 'pack.7z', make7z([{ name: 'alpha.txt', data: Buffer.from('seven zip alpha\n') }, { name: 'dir/beta.txt', data: Buffer.from('beta!') }]));
      const t1 = await previewOf(page, 'dir/beta.txt');
      const all = await download(page, () => btn(page, 'Save everything as ZIP').click());
      const z = await JSZip.loadAsync(all.buf);
      const s2 = await openArchive(page, 'old.rar', makeRar([{ name: 'readme.txt', data: Buffer.from('RAR stored text\n') }, { name: 'data.bin', data: Buffer.from([9, 8, 7]) }]));
      const t2 = await previewOf(page, 'readme.txt');
      const good = /^7-Zip · 2 files · 21 B/.test(s1) && t1 === 'beta!' && all.name === 'pack.zip' && (await z.file('alpha.txt').async('string')) === 'seven zip alpha\n' &&
        /^RAR · 2 files · 19 B/.test(s2) && t2 === 'RAR stored text\n';
      return ok(good, { s1, t1, zip: all.name, s2, t2 });
    }
  },
  {
    name: 'archive-extractor: password-protected ZIP asks for the password, rejects a wrong one, opens with the right one', tool: 'archive-extractor',
    run: async (page) => {
      const s = await openArchive(page, 'secret.zip', makeZipCrypto([{ name: 'plan.txt', data: Buffer.from('Top secret plan\n') }, { name: 'b.txt', data: Buffer.from('bee') }], 'hunter2'));
      await page.getByText('Password needed').waitFor();
      await page.fill('#view input[aria-label="Archive password"]', 'wrong');
      await btn(page, 'Unlock').click();
      await page.getByText('That password is not right for this archive.').waitFor({ timeout: 30000 });
      await page.fill('#view input[aria-label="Archive password"]', 'hunter2');
      await btn(page, 'Unlock').click();
      await page.getByText('Password needed').waitFor({ state: 'detached', timeout: 30000 });
      const t = await previewOf(page, 'plan.txt');
      return ok(/^ZIP · 2 files/.test(s) && t === 'Top secret plan\n', { s, t });
    }
  },
  {
    name: 'bulk-renamer: find/replace, case, numbering, extension and date rules; clashes blocked then fixed; ZIP of renamed copies', tool: 'bulk-renamer',
    run: async (page) => {
      const lm = await page.evaluate(() => new Date(2024, 5, 1, 10, 0).getTime());
      await giveFiles(page, '#view input[type=file]', [
        { name: 'notes.txt', data: Buffer.from('n'), lm }, { name: 'IMG_0002.JPG', data: Buffer.from('two'), lm }, { name: 'IMG_0001.JPG', data: Buffer.from('one'), lm }]);
      await page.fill('#view input[aria-label="Find"]', 'IMG_');
      await page.fill('#view input[aria-label="Replace with"]', 'Holiday ');
      await page.getByLabel('Change case', { exact: true }).check();
      await page.getByLabel('Numbering', { exact: true }).check();
      await page.fill('#view input[aria-label="Start at"]', '10');
      await page.fill('#view input[aria-label="Step"]', '5');
      await page.getByLabel('Change the extension', { exact: true }).check();
      await page.selectOption('#view select[aria-label="Order for numbering"]', 'name');
      await page.waitForTimeout(400);
      const a = await newNames(page);
      /* date modified in front, as yyyymmdd */
      await page.getByLabel('Insert the date modified', { exact: true }).check();
      await page.selectOption('#view select[aria-label="Date format"]', 'compact');
      await page.waitForTimeout(400);
      const b = await newNames(page);
      const zip = await JSZip.loadAsync((await download(page, () => btn(page, 'Download renamed files (ZIP)').click())).buf);
      const zipNames = Object.keys(zip.files).sort();
      const content = await zip.file('20240601_holiday 0002-015.jpg').async('string');
      /* make two names the same */
      await page.getByLabel('Insert the date modified', { exact: true }).uncheck();
      await page.getByLabel('Numbering', { exact: true }).uncheck();
      await page.getByLabel('Regular expression').check();
      await page.fill('#view input[aria-label="Find"]', '^IMG_\\d+');
      await page.fill('#view input[aria-label="Replace with"]', 'Trip');
      await page.waitForTimeout(400);
      const clash = await page.textContent('[data-k="rename-summary"]');
      const disabled = await btn(page, 'Download renamed files (ZIP)').isDisabled();
      await page.getByLabel('Fix clashes by adding (2), (3)…').check();
      await page.waitForTimeout(400);
      const fixed = await newNames(page);
      const good = a.join('|') === 'holiday 0001-010.jpg|holiday 0002-015.jpg|notes-020.txt' &&
        b.join('|') === '20240601_holiday 0001-010.jpg|20240601_holiday 0002-015.jpg|20240601_notes-020.txt' &&
        zipNames.join('|') === '20240601_holiday 0001-010.jpg|20240601_holiday 0002-015.jpg|20240601_notes-020.txt' && content === 'two' &&
        /2 problems/.test(clash) && disabled && fixed.join('|') === 'trip.jpg|trip (2).jpg|notes.txt';
      return ok(good, { a, b, zipNames, content, clash, disabled, fixed });
    }
  },
  {
    name: 'file-splitter: 2,500 bytes into 1,000-byte parts with a SHA-256 manifest; joined back in any order and verified; damage detected', tool: 'file-splitter',
    run: async (page) => {
      const data = Buffer.from(Array.from({ length: 2500 }, (_, i) => (i * 37 + 11) & 255));
      await page.setInputFiles(FILE, { name: 'data.bin', mimeType: 'application/octet-stream', buffer: data });
      await page.fill('#view input[aria-label="Part size"]', '1000');
      await page.selectOption('#view select[aria-label="Unit"]', 'B');
      await btn(page, 'Split').click();
      await page.locator('[data-k="manifest"]').waitFor({ timeout: 30000 });
      const partsNote = await page.textContent('[data-k="parts"]');
      const manifest = await page.textContent('[data-k="manifest"]');
      const want = [0, 1, 2].map(i => sha256(data.subarray(i * 1000, (i + 1) * 1000)) + '  data.bin.00' + (i + 1)).join('\n') + '\n' + sha256(data) + '  data.bin\n';
      const parts = [];
      for (let i = 0; i < 3; i++) parts.push(await download(page, () => page.locator('#view table.data tbody tr').nth(i).getByRole('button', { name: 'Download' }).click()));
      await btn(page, 'Join parts').click();
      const joinInput = '#view input[type=file][multiple]';
      await page.setInputFiles(joinInput, [parts[2], parts[0], parts[1]].map(p => ({ name: p.name, mimeType: 'application/octet-stream', buffer: p.buf }))
        .concat([{ name: 'data.bin.sha256', mimeType: 'text/plain', buffer: Buffer.from(manifest) }]));
      const joined = await download(page, () => btn(page, 'Join and download').click());
      const verify = await page.textContent('[data-k="verify"]');
      await btn(page, 'Clear').click();
      const bad = Buffer.from(parts[1].buf); bad[10] ^= 0xFF;
      await page.setInputFiles(joinInput, [parts[0].buf, bad, parts[2].buf].map((b, i) => ({ name: 'data.bin.00' + (i + 1), mimeType: 'application/octet-stream', buffer: b }))
        .concat([{ name: 'data.bin.sha256', mimeType: 'text/plain', buffer: Buffer.from(manifest) }]));
      await download(page, () => btn(page, 'Join and download').click());
      const verify2 = await page.textContent('[data-k="verify"]');
      const damaged = /data\.bin\.002\s+✗ different/.test(await page.innerText('#view'));
      const good = partsNote === '3 parts of up to 1000 B' && manifest === want && parts.map(p => p.name).join() === 'data.bin.001,data.bin.002,data.bin.003' &&
        parts[2].buf.length === 500 && joined.name === 'data.bin' && joined.buf.equals(data) && verify === 'Every part and the joined file match the manifest.' &&
        /^Problem/.test(verify2) && damaged;
      return ok(good, { partsNote, manifestOk: manifest === want, names: parts.map(p => p.name), joined: joined.name, same: joined.buf.equals(data), verify, verify2, damaged });
    }
  },
  {
    name: 'duplicate-finder: groups identical files by size then SHA-256 (9 MB pair hashed in chunks), ignores near-misses, CSV export', tool: 'duplicate-finder',
    run: async (page) => {
      const big = crypto.randomBytes(9000000), nearly = Buffer.from(big); nearly[nearly.length - 1] ^= 1;
      const txt = Buffer.from('same content here'), other = Buffer.from('same content HERE');
      await page.setInputFiles('#view input[type=file][multiple]:not([webkitdirectory])', [
        { name: 'a.txt', mimeType: 'text/plain', buffer: txt }, { name: 'b.txt', mimeType: 'text/plain', buffer: txt },
        { name: 'c.txt', mimeType: 'text/plain', buffer: other }, { name: 'movie.bin', mimeType: 'application/octet-stream', buffer: big },
        { name: 'movie copy.bin', mimeType: 'application/octet-stream', buffer: big }, { name: 'movie-edit.bin', mimeType: 'application/octet-stream', buffer: nearly },
        { name: 'empty1', mimeType: 'text/plain', buffer: Buffer.alloc(0) }, { name: 'empty2', mimeType: 'text/plain', buffer: Buffer.alloc(0) }]);
      await btn(page, 'Find duplicates').click();
      await page.locator('[data-k="dup-summary"]').waitFor({ timeout: 60000 });
      const summary = await page.textContent('[data-k="dup-summary"]');
      const groups = await page.locator('[data-k="group"] .paths').allInnerTexts();
      const csv = (await download(page, () => btn(page, 'Export as CSV').click())).buf.toString();
      const wantCsv = 'group,sha256,size_bytes,path\r\n' +
        `1,${sha256(big)},9000000,movie copy.bin\r\n1,${sha256(big)},9000000,movie.bin\r\n` +
        `2,${sha256(txt)},17,a.txt\r\n2,${sha256(txt)},17,b.txt\r\n`;
      const good = summary === '2 groups · 2 extra copies · 9,000,017 bytes wasted' && groups.length === 2 &&
        groups[0].replace(/\s+/g, '|') === 'movie|copy.bin|movie.bin' && groups[1].replace(/\s+/g, '|') === 'a.txt|b.txt' && csv === wantCsv;
      return ok(good, { summary, groups, csv: csv.slice(0, 300) });
    }
  },
  {
    name: 'binary-compare: first difference, byte count, ranges, size difference, SHA-256 and highlighted hex; identical files', tool: 'binary-compare',
    run: async (page) => {
      const A = Buffer.from(Array.from({ length: 1000 }, (_, i) => (i * 7) & 255));
      const B = Buffer.concat([Buffer.from(A), Buffer.alloc(10, 0x41)]);
      for (let i = 100; i <= 103; i++) B[i] ^= 0xFF;
      B[500] = (B[500] + 1) & 255;
      await page.setInputFiles('#view input[type=file] >> nth=0', { name: 'a.bin', mimeType: 'application/octet-stream', buffer: A });
      await page.setInputFiles('#view input[type=file] >> nth=1', { name: 'b.bin', mimeType: 'application/octet-stream', buffer: B });
      await btn(page, 'Compare').click();
      await page.locator('[data-k="hex-marked"]').waitFor({ timeout: 30000 });
      const t = k => page.textContent(`[data-k="${k}"]`);
      const r = { verdict: await t('verdict'), first: await t('first'), count: await t('count'), ranges: await t('ranges'), shaA: await t('sha-a'), shaB: await t('sha-b'), marked: await t('hex-marked') };
      const rows = await page.locator('#view table.data tbody tr').allInnerTexts();
      await page.setInputFiles('#view input[type=file] >> nth=1', { name: 'a2.bin', mimeType: 'application/octet-stream', buffer: A });
      await btn(page, 'Compare').click();
      await page.getByText('✓ The files are identical').waitFor({ timeout: 30000 });
      const same = await t('first');
      const good = r.verdict === '✗ The files are different' && r.first === '0x64 (byte 100)' &&
        r.count === '5 in the first 1,000 bytes, plus 10 more in B' && r.ranges === '2' && r.shaA === sha256(A) && r.shaB === sha256(B) &&
        r.marked === '4 differing bytes shown' && /^1\s+0x64 \(100\)\s+0x67\s+4 bytes/.test(rows[0]) && /^2\s+0x1F4 \(500\)\s+0x1F4\s+1 byte/.test(rows[1]) && same === 'none';
      return ok(good, { r, rows, same });
    }
  }
];

module.exports.helpers = { makeTar, make7z, makeRar, makeZipCrypto, download, btn, ok, sha256 };
