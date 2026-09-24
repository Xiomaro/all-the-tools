/* Behaviour checks for the security tools in crypto-b.js, plus the merged
   Hash Generator & Checksum Checker (which absorbed checksum-calc and
   file-hash). Expected values come from published test vectors (NIST and
   RFC digests, Wikipedia cipher examples, pyca/bcrypt's bcrypt_pbkdf
   vectors, historic Enigma messages via cryptii's test suite), from
   independent tools (Node's crypto, OpenSSL, Python's cryptography,
   OpenPGP.js in Node, sharp) or were worked out by hand. */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { execFileSync } = require('child_process');

const V = '#view';
const K = k => `${V} [data-k="${k}"]`;

function eq(got, want) { return { ok: JSON.stringify(got) === JSON.stringify(want), detail: JSON.stringify(got).slice(0, 400) }; }
function all(list) {
  const bad = list.filter(x => !x.ok);
  return bad.length ? { ok: false, detail: bad.map(b => b.detail).join(' | ').slice(0, 600) } : { ok: true, detail: '' };
}
function check(name, got, want) { const r = eq(got, want); return { ok: r.ok, detail: name + ': ' + r.detail }; }

async function btn(page, text) {
  const re = text instanceof RegExp ? text : new RegExp('^\\s*' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$');
  await page.locator(`${V} button:visible`, { hasText: re }).first().click();
}
async function chip(page, text) { await btn(page, text); await page.waitForTimeout(80); }
/* The action button, when a tab chip carries the same word. */
async function act(page, text) {
  await page.locator(`${V} button.btn.primary:visible`, { hasText: new RegExp('^\\s*' + text + '\\s*$') }).first().click();
}
async function val(page, k) { return page.$eval(K(k), n => (n.value !== undefined && n.tagName !== 'DIV' && n.tagName !== 'PRE' && n.tagName !== 'SPAN' ? n.value : n.textContent)); }
async function waitK(page, k, fn, ms) {
  await page.waitForFunction(([k, src]) => { const n = document.querySelector('#view [data-k="' + k + '"]'); if (!n) return false; const v = n.value !== undefined && n.tagName !== 'DIV' && n.tagName !== 'PRE' && n.tagName !== 'SPAN' ? n.value : n.textContent; return new Function('v', 'return ' + src)(v); }, [k, fn], { timeout: ms || 20000 });
}
async function download(page, action) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), action()]);
  return { name: dl.suggestedFilename(), data: fs.readFileSync(await dl.path()) };
}
function tmpFile(name, data) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attb-'));
  const p = path.join(dir, name);
  fs.writeFileSync(p, data);
  return p;
}
let PY = undefined;
function python() {
  if (PY !== undefined) return PY;
  PY = null;
  for (const exe of ['python3.12', 'python3', 'python3.13', 'python3.11']) {
    try { execFileSync(exe, ['-c', 'from cryptography.hazmat.primitives.serialization import load_ssh_private_key'], { stdio: 'ignore' }); PY = exe; break; } catch (e) { /* next */ }
  }
  return PY;
}
function nodeHash(alg, data) { return crypto.createHash(alg).update(data).digest('hex'); }

/* A real ssh-keygen key protected with the passphrase "password", from
   pyca/cryptography's test vectors (vectors/.../asymmetric/OpenSSH/ed25519-psw.key). */
const SSH_VECTOR_KEY = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHIAAAAGYmNyeXB0AAAAGAAAABCX39wD02
J9++SP9d3vlnxuAAAAEAAAAAEAAAAzAAAAC3NzaC1lZDI1NTE5AAAAIFpz5PWWlJVx/imA
hJjv57fg4eTGFVHf4WcFfbXPNo+/AAAAoM+Bu9OvuVW6elNfhl4AxM/p7Oy02ptuWR+LNV
Y9Sjp/ADM+aTHb77DbZFD8WqzXhioUcOcej1EdAr4NFP7YRC1TIDHuzKgePDjewMMK7lCw
9qZgZbBUYN8q0/V42L9Tc9w8rjkewtd6r5u+5UOLv7Ct7WxSESAAC1KC5TnnU0CCZ1ZFXN
NOsxE0VLn
-----END OPENSSH PRIVATE KEY-----`;
const SSH_VECTOR_PUB = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFpz5PWWlJVx/imAhJjv57fg4eTGFVHf4WcFfbXPNo+/ ed25519-psw.key';

/* Minimal openssh-key-v1 reader used to check the tool's output independently. */
function readOpenssh(pemText) {
  const b64 = pemText.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const buf = Buffer.from(b64, 'base64');
  const magic = 'openssh-key-v1\0';
  if (buf.subarray(0, magic.length).toString('latin1') !== magic) throw new Error('bad magic');
  let o = magic.length;
  const str = () => { const n = buf.readUInt32BE(o); o += 4; const s = buf.subarray(o, o + n); o += n; return s; };
  const cipher = str().toString(), kdf = str().toString(), kdfOpts = str();
  const n = buf.readUInt32BE(o); o += 4;
  const pub = str(), priv = str();
  let salt = null, rounds = 0;
  if (kdfOpts.length) { const sl = kdfOpts.readUInt32BE(0); salt = kdfOpts.subarray(4, 4 + sl); rounds = kdfOpts.readUInt32BE(4 + sl); }
  return { cipher, kdf, n, pub, priv, salt, rounds };
}
function decryptSection(k, kiv) {
  const d = crypto.createDecipheriv('aes-256-ctr', Buffer.from(kiv.slice(0, 32)), Buffer.from(kiv.slice(32, 48)));
  return Buffer.concat([d.update(k.priv), d.final()]);
}

module.exports = [
  /* ---------------- hash-generator (merged checksum-calc + file-hash) ---------------- */
  { name: 'hash-generator: fox sentence digests, uppercase, checksum verify by length', tool: 'hash-generator', run: async page => {
    const fox = 'The quick brown fox jumps over the lazy dog';
    await page.fill(`${V} textarea`, fox);
    await btn(page, 'Generate Hashes');
    await page.waitForFunction(() => document.querySelectorAll('#view .hashrow').length === 8);
    const h = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#view .hashrow[data-algo]')].map(r => [r.dataset.algo, r.querySelector('code').textContent])));
    const want = { MD5: '9e107d9d372bb6826bd81d3542a419d6', 'SHA-1': '2fd4e1c67a2d28fced849ee1bb76e7391b93eb12',
      'SHA-224': '730e109bd7a8a32b1cb9d9a09aa2325d2430587ddbc0c38bad911525', 'SHA-256': 'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592',
      'SHA-384': nodeHash('sha384', fox), 'SHA-512': nodeHash('sha512', fox), 'RIPEMD-160': '37f332f68db77bd9d7edd4969571ad671cf9dd3b' };
    const r = [check('digests', Object.keys(want).map(a => h[a]), Object.values(want))];
    await page.fill(`${V} input[placeholder^="Paste the checksum"]`, '9E107D9D372BB6826BD81D3542A419D6');
    r.push(check('md5 match', await val(page, 'verify'), '✓ Matches the MD5 hash'));
    r.push(check('match row', await page.$eval(`${V} .hashrow.match`, n => n.dataset.algo), 'MD5'));
    await page.fill(`${V} input[placeholder^="Paste the checksum"]`, 'deadbeef');
    r.push(check('bad length', /not the length/.test(await val(page, 'verify')), true));
    await page.fill(`${V} input[placeholder^="Paste the checksum"]`, 'b'.repeat(64));
    r.push(check('no match', (await val(page, 'verify')).startsWith('✗ Does not match the SHA-256 hash'), true));
    await page.fill(`${V} input[placeholder^="Paste the checksum"]`, 'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592  fox.txt');
    r.push(check('sha256sum line', await val(page, 'verify'), '✓ Matches the SHA-256 hash'));
    await page.fill(`${V} input[placeholder^="Paste the checksum"]`, 'sha256-' + crypto.createHash('sha256').update(fox).digest('base64'));
    r.push(check('SRI base64', await val(page, 'verify'), '✓ Matches the SHA-256 hash'));
    await page.fill(`${V} input[placeholder^="Paste the checksum"]`, 'SHA1 (fox.txt) = 2FD4E1C67A2D28FCED849EE1BB76E7391B93EB12');
    r.push(check('BSD line', await val(page, 'verify'), '✓ Matches the SHA-1 hash'));
    await page.locator(`${V} label.check`, { hasText: 'Uppercase' }).click();
    r.push(check('uppercase', await page.$eval(`${V} .hashrow[data-algo="MD5"] code`, n => n.textContent), '9E107D9D372BB6826BD81D3542A419D6'));
    return all(r);
  } },
  { name: 'hash-generator: File tab hashes abc.txt (old file-hash vectors) and verifies SHA-256', tool: 'hash-generator', run: async page => {
    await chip(page, 'File');
    await page.setInputFiles(`${V} .dropzone input[type=file]`, { name: 'abc.txt', mimeType: 'text/plain', buffer: Buffer.from('abc') });
    await page.waitForFunction(() => { const r = document.querySelector('#view .hashrow[data-algo="SHA-3"] code'); return r && r.textContent.length === 128; }, null, { timeout: 30000 });
    const h = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#view .hashrow[data-algo]')].map(r => [r.dataset.algo, r.querySelector('code').textContent])));
    const want = ['900150983cd24fb0d6963f7d28e17f72', 'a9993e364706816aba3e25717850c26c9cd0d89d',
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
      '18587dc2ea106b9a1563e32b3312421ca164c7f1f07bc922a9c83d77cea3a1e5d0c69910739025372dc14ac9642629379540c17e2a65b19d77aa511a9d00bb96',
      'cb00753f45a35e8b', '8eb208f7e05d987a9b044a8e98c6b087f15a0bfc'];
    await page.fill(`${V} input[placeholder^="Paste the checksum"]`, want[2].toUpperCase());
    return all([check('digests', [h.MD5, h['SHA-1'], h['SHA-256'], h['SHA-512'], h['SHA-3'], h['SHA-384'].slice(0, 16), h['RIPEMD-160']], want),
      check('verdict', await val(page, 'verify'), '✓ Matches the SHA-256 hash of abc.txt'),
      check('file info', /^abc\.txt · 3 B/.test(await val(page, 'file')), true)]);
  } },
  { name: 'hash-generator: 10 MB file in chunks matches Node crypto, with progress and algorithm choice', tool: 'hash-generator', run: async page => {
    const data = crypto.randomBytes(10 * 1024 * 1024 + 123);
    await chip(page, 'File');
    await page.locator(`${V} label.check`, { hasText: 'SHA-3 (Keccak-512)' }).click();
    await page.setInputFiles(`${V} .dropzone input[type=file]`, { name: 'big.bin', mimeType: 'application/octet-stream', buffer: data });
    await page.waitForFunction(() => /Hashed/.test(document.querySelector('#view .progress .note').textContent), null, { timeout: 120000 });
    const h = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#view .hashrow[data-algo]')].map(r => [r.dataset.algo, r.querySelector('code').textContent])));
    const map = { MD5: 'md5', 'SHA-1': 'sha1', 'SHA-224': 'sha224', 'SHA-256': 'sha256', 'SHA-384': 'sha384', 'SHA-512': 'sha512', 'RIPEMD-160': 'ripemd160' };
    return all([check('digests', Object.keys(map).map(a => h[a] === nodeHash(map[a], data)), Object.keys(map).map(() => true)),
      check('SHA-3 skipped', 'SHA-3' in h, false)]);
  } },
  { name: 'hash-generator: streaming hashers agree with Node for odd chunk splits', tool: 'hash-generator', run: async page => {
    const data = crypto.randomBytes(5003);
    const got = await page.evaluate(b64 => {
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)), out = {};
      ['MD5', 'SHA-1', 'SHA-224', 'SHA-256', 'SHA-384', 'SHA-512', 'RIPEMD-160', 'SHA-3'].forEach(n => {
        const h = window.CryptoKit.hasher(n);
        let o = 0, step = 1;
        while (o < bytes.length) { h.update(bytes.subarray(o, o + step)); o += step; step = (step * 7 + 3) % 211 + 1; }
        out[n] = window.CryptoKit.toHex(h.digest());
        const once = window.CryptoKit.hasher(n);
        once.update(bytes);
        out[n + ' once'] = window.CryptoKit.toHex(once.digest());
      });
      return out;
    }, data.toString('base64'));
    const map = { MD5: 'md5', 'SHA-1': 'sha1', 'SHA-224': 'sha224', 'SHA-256': 'sha256', 'SHA-384': 'sha384', 'SHA-512': 'sha512', 'RIPEMD-160': 'ripemd160' };
    return all([check('split digests', Object.keys(map).map(a => got[a] === nodeHash(map[a], data)), Object.keys(map).map(() => true)),
      check('keccak split = once', got['SHA-3'] === got['SHA-3 once'], true)]);
  } },

  /* ---------------- classical-ciphers ---------------- */
  { name: 'classical-ciphers: Playfair, Affine, Rail Fence, Columnar, Beaufort, Autokey, keyword, Bacon, Polybius, Atbash vectors', tool: 'classical-ciphers', run: async page => {
    async function run(cipher, fields, input, decrypt) {
      await page.selectOption(K('cipher'), cipher);
      for (const [k, v] of Object.entries(fields)) { const tag = await page.$eval(K(k), n => n.tagName); if (tag === 'SELECT') await page.selectOption(K(k), v); else await page.fill(K(k), v); }
      await chip(page, decrypt ? 'Decrypt' : 'Encrypt');
      await page.fill(K('input'), input);
      await page.waitForTimeout(60);
      return val(page, 'output');
    }
    return all([
      check('playfair (Wikipedia)', await run('playfair', { key: 'playfair example' }, 'Hide the gold in the tree stump'), 'BMODZBXDNABEKUDMUIXMMOUVIF'),
      check('playfair decrypt', await run('playfair', { key: 'playfair example' }, 'BMODZBXDNABEKUDMUIXMMOUVIF', true), 'HIDETHEGOLDINTHETREXESTUMP'),
      check('affine a=5 b=8 (Wikipedia)', await run('affine', { a: '5', b: '8' }, 'AFFINE CIPHER'), 'IHHWVC SWFRCP'),
      check('affine decrypt', await run('affine', { a: '5', b: '8' }, 'IHHWVC SWFRCP', true), 'AFFINE CIPHER'),
      check('rail fence 3 (Wikipedia)', await run('railfence', { rails: '3' }, 'WEAREDISCOVEREDRUNATONCE'), 'WECRUOERDSOEERNTNEAIVDAC'),
      check('rail fence decrypt', await run('railfence', { rails: '3' }, 'WECRUOERDSOEERNTNEAIVDAC', true), 'WEAREDISCOVEREDRUNATONCE'),
      check('columnar ZEBRAS (Wikipedia)', await run('columnar', { key: 'ZEBRAS', pad: '' }, 'WE ARE DISCOVERED. FLEE AT ONCE QKJEU'), 'EVLNEACDTKESEAQROFOJDEECUWIREE'),
      check('columnar irregular decrypt', await run('columnar', { key: 'ZEBRAS', pad: '' }, 'EVLNACDTESEAROFODEECWIREE', true), 'WEAREDISCOVEREDFLEEATONCE'),
      check('beaufort (Wikipedia)', await run('beaufort', { key: 'FORTIFICATION' }, 'DEFENDTHEEASTWALLOFTHECASTLE'), 'CKMPVCPVWPIWUJOGIUAPVWRIWUUK'),
      check('autokey QUEENLY (Wikipedia)', await run('autokey', { key: 'QUEENLY' }, 'ATTACK AT DAWN'), 'QNXEPV YT WTWP'),
      check('autokey decrypt', await run('autokey', { key: 'QUEENLY' }, 'QNXEPV YT WTWP', true), 'ATTACK AT DAWN'),
      check('keyword ZEBRAS (Wikipedia)', await run('keyword', { key: 'ZEBRAS' }, 'FLEE AT ONCE. WE ARE DISCOVERED!'), 'SIAA ZQ LKBA. VA ZOA RFPBLUAOAR!'),
      check('bacon 24 (by hand)', await run('bacon', { variant: '24' }, 'KEY'), 'ABAAB AABAA BABBA'),
      check('bacon 26 (by hand)', await run('bacon', { variant: '26' }, 'KEY'), 'ABABA AABAA BBAAA'),
      check('bacon decode', await run('bacon', { variant: '26' }, 'ABABA AABAA BBAAA', true), 'KEY'),
      check('polybius (by hand)', await run('polybius', { key: '' }, 'HELLO'), '23 15 31 31 34'),
      check('atbash (by hand)', await run('atbash', {}, 'abc XYZ'), 'zyx CBA'),
      check('links', await page.$$eval(`${V} a[href^="#/t/"]`, a => a.map(x => x.getAttribute('href')).slice(0, 3)), ['#/t/caesar-cipher', '#/t/rot13', '#/t/vigenere-cipher'])
    ]);
  } },

  /* ---------------- enigma-machine ---------------- */
  { name: 'enigma-machine: AAAAA→BDZGO, real-machine MEU vector, double step on the keyboard, M4 = M3 compatibility', tool: 'enigma-machine', run: async page => {
    const r = [];
    await page.fill(K('bulk-in'), 'AAAAA');
    r.push(check('I-II-III AAA', await val(page, 'bulk-out'), 'BDZGO'));
    /* Mike Koss on a real Enigma (cryptii test suite): M3, I II III, start M E U → gdxtz. */
    await chip(page, 'Enigma M3');
    await page.selectOption(K('pos0'), '12'); await page.selectOption(K('pos1'), '4'); await page.selectOption(K('pos2'), '20');
    r.push(check('MEU', await val(page, 'bulk-out'), 'GDXTZ'));
    /* Double stepping on the keyboard from A D U: ADV, AEW, BFX, BFY (Wikipedia's example). */
    await page.selectOption(K('pos0'), '0'); await page.selectOption(K('pos1'), '3');
    const seq = [];
    for (let i = 0; i < 4; i++) {
      await page.click(`${V} .kbd[data-letter="A"]`);
      seq.push(await page.evaluate(() => [0, 1, 2].map(i => document.querySelector('#view [data-k="win' + i + '"]').textContent).join('')));
    }
    r.push(check('double step', seq, ['ADV', 'AEW', 'BFX', 'BFY']));
    r.push(check('lamp lit = tape', await page.evaluate(() => { const on = document.querySelector('#view .lamp.on'); return on && document.querySelector('#view [data-k="tape-out"]').textContent.slice(-1) === on.textContent; }), true));
    /* Typing on the focused machine face works too, and the reflector means no letter maps to itself. */
    await page.focus(`${V} .enigma`);
    await page.keyboard.type('QWERTZ');
    const typed = await val(page, 'tape-in'), lit = await val(page, 'tape-out');
    r.push(check('keyboard typing', typed.replace(/\s/g, ''), 'AAAAQWERTZ'));
    r.push(check('never itself', [...typed.replace(/\s/g, '')].every((c, i) => c !== lit.replace(/\s/g, '')[i]), true));
    /* M4 with Beta at ring A, position A and UKW B thin behaves as M3 with UKW B. */
    await chip(page, 'Enigma M4');
    await page.fill(K('bulk-in'), 'AAAAA');
    r.push(check('M4 compat', (await val(page, 'bulk-out')).replace(/\s/g, ''), 'BDZGO'));
    return all(r);
  } },
  { name: 'enigma-machine: authentic M4 messages decrypt (de.wikipedia Funkspruch; U-534 P1030700) with plugboard and rings', tool: 'enigma-machine', run: async page => {
    await chip(page, 'Enigma M4');
    await page.uncheck(`${V} input[type=checkbox]`);
    async function setup(rotors, rings, pos, refl, plugs) {
      for (let i = 0; i < 4; i++) { await page.selectOption(K('rotor' + i), rotors[i]); await page.selectOption(K('ring' + i), String(rings[i])); await page.selectOption(K('pos' + i), String(pos[i])); }
      await page.selectOption(K('refl'), refl);
      await page.fill(K('plugs'), plugs);
      await page.waitForTimeout(400);
    }
    await setup(['Beta', 'II', 'IV', 'I'], [0, 0, 0, 21], [21, 9, 13, 0], 'B thin', 'AT BL DF GJ HM NW OP QY RZ VX');
    await page.fill(K('bulk-in'), 'NCZW VUSX PNYM IMHZ XMQX SFWX WLKJ AHSH NMCO OBAK UQPM KCSM HKSE INJU SBLK IOSX CKUB HMLL XCSJ USRR DVKO HULX WCCB GVLI YXEO AHXR HKKF VDRE WEZL XOBA FGYU JQUK GRTV UKAM EURB VEKS UHHV XYHA BCJW MAKL FKLM YFVN RIZR VVRT KOFD ANJM OLBG FLLE OPRG TFLV RHOW OPBE KVWM UQFM PWPA RMFH AGKX IIBG');
    const a = await val(page, 'bulk-out');
    await setup(['Gamma', 'IV', 'III', 'VIII'], [0, 0, 2, 20], [21, 12, 6, 2], 'B thin', 'CH EJ NV OU TY LG SZ PK DI QB');
    await page.fill(K('bulk-in'), 'QBHE WTDF EQIT KUWF QUHL IQQG VYGR SDOH DCOB FMDH XSKO FPAO DRSV BERE');
    const b = await val(page, 'bulk-out');
    return all([check('Funkspruch ' + a.slice(0, 50), a.startsWith('VONVONJLOOKSJFFFTTTEINSEINSDREIZWOYYEINSNEUNINHALTXXBEIANGRIFFUNTERWASSERGEDRUECKTYWABOSXLETZTERGEGNERSTANDNULACHTDREINULUHRMARQUANTONJOTANEUNACHTSECHSDREIYZWOZWONULGRADYACHTSMYSTOSSENACHXEINSVIERMBFAELLTYNNNNNNOOOVIERYSICHTEINSNULL'), true),
      check('U-534', b, 'KOMXBDMXUUUBOOTEYFXDXUUUAUSBILVUNYYZWOSECHSXUUUFLOTTXVVV')]);
  } },

  /* ---------------- file-encryption ---------------- */
  { name: 'file-encryption: two files round-trip, container opens independently in Node, tampering and wrong passphrase fail', tool: 'file-encryption', run: async page => {
    const big = crypto.randomBytes(2.5 * 1024 * 1024 | 0), small = Buffer.from('Meet at the Clyde Auditorium at 19:30 — bring £5.\n');
    const pass = 'correct horse battery staple';
    await page.setInputFiles(`${V} [data-tab="enc"] input[type=file]`, [{ name: 'photo.raw', mimeType: 'application/octet-stream', buffer: big }, { name: 'note.txt', mimeType: 'text/plain', buffer: small }]);
    await page.fill(K('pass'), pass); await page.fill(K('pass2'), pass);
    await btn(page, 'Encrypt files');
    await page.waitForFunction(() => document.querySelectorAll('#view [data-k="enc-results"] .fileitem button').length === 2, null, { timeout: 90000 });
    const e1 = await download(page, () => page.locator(`${V} [data-k="enc-results"] .fileitem button`).nth(0).click());
    const e2 = await download(page, () => page.locator(`${V} [data-k="enc-results"] .fileitem button`).nth(1).click());
    /* Independent decryption of the documented format with Node's crypto. */
    function nodeOpen(buf, pw) {
      const h = buf.subarray(0, 43), iter = h.readUInt32BE(8), salt = h.subarray(12, 28), prefix = h.subarray(28, 35), chunk = h.readUInt32BE(35), metaLen = h.readUInt32BE(39);
      const key = crypto.pbkdf2Sync(pw, salt, iter, 32, 'sha256');
      const open = (ct, i, last) => { const iv = Buffer.concat([prefix, Buffer.from([i >>> 24, (i >>> 16) & 255, (i >>> 8) & 255, i & 255]), Buffer.from([last ? 1 : 0])]);
        const d = crypto.createDecipheriv('aes-256-gcm', key, iv); d.setAAD(h); d.setAuthTag(ct.subarray(ct.length - 16)); return Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]); };
      const meta = JSON.parse(open(buf.subarray(43, 43 + metaLen), 0, false).toString());
      const parts = [], start = 43 + metaLen, span = chunk + 16, n = Math.max(1, Math.ceil((buf.length - start) / span));
      for (let i = 0; i < n; i++) parts.push(open(buf.subarray(start + i * span, start + (i + 1) * span), i + 1, i === n - 1));
      return { magic: buf.subarray(0, 6).toString(), iter, chunk, meta, data: Buffer.concat(parts), chunks: n };
    }
    const n1 = nodeOpen(e1.data, pass), n2 = nodeOpen(e2.data, pass);
    const r = [check('names', [e1.name, e2.name], ['photo.raw.enc', 'note.txt.enc']),
      check('node open', [n1.magic, n1.iter >= 600000, n1.chunk, n1.chunks, n1.meta.name, n1.data.equals(big), n2.meta.name, n2.data.equals(small)], ['ATTENC', true, 1048576, 3, 'photo.raw', true, 'note.txt', true])];
    /* Decrypt in the tool: the original names come back. */
    const tampered = Buffer.from(e1.data); tampered[tampered.length - 100] ^= 1;
    await chip(page, 'Decrypt');
    await page.setInputFiles(`${V} [data-tab="dec"] input[type=file]`, [{ name: 'renamed.bin', mimeType: 'application/octet-stream', buffer: e2.data }, { name: 'broken.enc', mimeType: 'application/octet-stream', buffer: tampered }]);
    await page.fill(K('dpass'), pass);
    await btn(page, 'Decrypt files');
    await page.waitForFunction(() => document.querySelectorAll('#view [data-k="dec-results"] .progress .note.ok, #view [data-k="dec-results"] .progress .note.err').length === 2, null, { timeout: 90000 });
    const d1 = await download(page, () => page.locator(`${V} [data-k="dec-results"] .fileitem button`).first().click());
    const errs = await page.$$eval(`${V} [data-k="dec-results"] .note.err`, n => n.map(x => x.textContent));
    r.push(check('restored', [d1.name, d1.data.equals(small)], ['note.txt', true]));
    r.push(check('tamper detected', errs.length === 1 && /integrity check/.test(errs[0]), true));
    await page.setInputFiles(`${V} [data-tab="dec"] input[type=file]`, [{ name: 'note.txt.enc', mimeType: 'application/octet-stream', buffer: e2.data }]);
    await page.fill(K('dpass'), 'wrong passphrase');
    await btn(page, 'Decrypt files');
    await page.waitForFunction(() => document.querySelector('#view [data-k="dec-results"] .note.err'), null, { timeout: 60000 });
    r.push(check('wrong pass', await page.$eval(`${V} [data-k="dec-results"] .note.err`, n => n.textContent), 'Wrong passphrase, or the file has been altered.'));
    return all(r);
  } },

  /* ---------------- steganography ---------------- */
  { name: 'steganography: hide in a PNG, independent LSB read in Node, reveal plain and encrypted', tool: 'steganography', run: async page => {
    const sharp = require('sharp');
    const W = 80, H = 60, raw = crypto.randomBytes(W * H * 4);
    for (let i = 3; i < raw.length; i += 4) raw[i] = 255;
    const png = await sharp(raw, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
    const message = 'Hello from London 🌍 — £5 at 18:45';
    await page.setInputFiles(`${V} [data-tab="hide"] input[type=file]`, { name: 'noise.png', mimeType: 'image/png', buffer: png });
    await page.waitForSelector(K('capacity'));
    const cap = await page.$eval(K('capacity'), n => n.dataset.bytes);
    await page.fill(K('message'), message);
    const out = await download(page, () => btn(page, 'Hide message and save PNG'));
    /* Read the bits back with sharp, following the documented layout. */
    const px = await sharp(out.data).ensureAlpha().raw().toBuffer();
    const slots = []; for (let i = 0; i < px.length; i += 4) if (px[i + 3] === 255) slots.push(i, i + 1, i + 2);
    const bytesAt = (from, n) => { const b = Buffer.alloc(n); for (let i = 0; i < n * 8; i++) b[i >> 3] |= (px[slots[from * 8 + i]] & 1) << (7 - (i & 7)); return b; };
    const head = bytesAt(0, 8), len = head.readUInt32BE(4), payload = bytesAt(8, len), crc = bytesAt(8 + len, 4).readUInt32BE(0);
    let changed = 0; const orig = raw; for (let i = 0; i < px.length; i++) if (Math.abs(px[i] - orig[i]) > 1) changed++;
    const r = [check('capacity', cap, String(Math.floor(W * H * 3 / 8) - 12)), check('name', out.name, 'noise-hidden.png'),
      check('node read', [head.subarray(0, 3).toString(), head[3], payload.toString('utf8'), crc === zlib.crc32(payload)], ['STG', 0x10, message, true]),
      check('only LSBs changed', changed, 0)];
    await chip(page, 'Reveal');
    await page.setInputFiles(`${V} [data-tab="reveal"] input[type=file]`, { name: 'x.png', mimeType: 'image/png', buffer: out.data });
    await waitK(page, 'revealed', 'v.length > 0');
    r.push(check('reveal', await val(page, 'revealed'), message));
    /* Encrypted variant. */
    await chip(page, 'Hide');
    await page.fill(K('hide-pass'), 'tartan');
    const enc = await download(page, () => btn(page, 'Hide message and save PNG'));
    await chip(page, 'Reveal');
    await page.fill(K('reveal-pass'), 'wrong');
    await page.setInputFiles(`${V} [data-tab="reveal"] input[type=file]`, { name: 'y.png', mimeType: 'image/png', buffer: enc.data });
    await page.waitForFunction(() => /Wrong passphrase/.test(document.querySelector('#view [data-tab="reveal"] .note').textContent), null, { timeout: 30000 });
    await page.fill(K('reveal-pass'), 'tartan');
    await act(page, 'Reveal');
    await waitK(page, 'revealed', 'v.length > 0', 30000);
    r.push(check('encrypted reveal', await val(page, 'revealed'), message));
    /* A picture with nothing hidden. */
    await page.setInputFiles(`${V} [data-tab="reveal"] input[type=file]`, { name: 'plain.png', mimeType: 'image/png', buffer: png });
    await page.waitForFunction(() => /No hidden message/.test(document.querySelector('#view [data-tab="reveal"] .note').textContent), null, { timeout: 30000 });
    return all(r);
  } },

  /* ---------------- csr-generator ---------------- */
  { name: 'csr-generator: RSA and P-256 CSRs pass openssl req -verify with subject, SANs and matching key; decoder handoff', tool: 'csr-generator', run: async page => {
    const r = [];
    for (const kt of ['rsa2048', 'p256']) {
      await page.selectOption(K('keytype'), kt);
      await page.fill(K('CN'), 'www.example.co.uk'); await page.fill(K('O'), 'Example Ltd'); await page.fill(K('OU'), 'Web');
      await page.fill(K('L'), 'London'); await page.fill(K('ST'), 'England'); await page.fill(K('C'), 'gb'); await page.fill(K('emailAddress'), 'admin@example.co.uk');
      await page.fill(K('sans'), 'example.co.uk\n*.example.co.uk\n192.0.2.10\nIP:2001:db8::1\nemail:security@example.co.uk');
      await btn(page, 'Generate CSR and key');
      await page.waitForSelector(K('csr'), { timeout: 60000 });
      const csr = await val(page, 'csr'), key = await val(page, 'key');
      const cf = tmpFile('req.csr', csr), kf = tmpFile('req.key', key);
      let text = '', verified = false;
      try {
        const res = require('child_process').spawnSync('openssl', ['req', '-in', cf, '-verify', '-noout', '-text'], { encoding: 'utf8' });
        text = res.stdout + res.stderr;
        verified = res.status === 0 && /verify OK/i.test(text);
      } catch (e) { text = String(e); }
      const pub1 = execFileSync('openssl', ['req', '-in', cf, '-noout', '-pubkey'], { encoding: 'utf8' });
      const pub2 = execFileSync('openssl', ['pkey', '-in', kf, '-pubout'], { encoding: 'utf8' });
      r.push(check(kt + ' verify', verified, true));
      r.push(check(kt + ' subject', /Subject: C\s?=\s?GB, ST\s?=\s?England, L\s?=\s?London, O\s?=\s?Example Ltd, OU\s?=\s?Web, CN\s?=\s?www\.example\.co\.uk, emailAddress\s?=\s?admin@example\.co\.uk/.test(text), true));
      r.push(check(kt + ' SANs', /DNS:www\.example\.co\.uk, DNS:example\.co\.uk, DNS:\*\.example\.co\.uk, IP Address:192\.0\.2\.10, IP Address:2001:DB8:0:0:0:0:0:1, email:security@example\.co\.uk/.test(text), true));
      r.push(check(kt + ' algo', kt === 'p256' ? /ecdsa-with-SHA256/.test(text) && /prime256v1|P-256/.test(text) : /sha256WithRSAEncryption/.test(text) && /2048 bit/.test(text), true));
      r.push(check(kt + ' key matches', pub1.trim() === pub2.trim(), true));
    }
    await btn(page, 'Open in the certificate decoder');
    await page.waitForFunction(() => /Certificate Signing Request/.test(document.querySelector('#view').textContent), null, { timeout: 10000 });
    r.push(check('decoder handoff', await page.evaluate(() => /CN=www\.example\.co\.uk/.test(document.querySelector('#view').textContent)), true));
    return all(r);
  } },
  { name: 'csr-generator: rejects bad country, IP and empty subject', tool: 'csr-generator', run: async page => {
    const msg = async () => page.evaluate(() => [...document.querySelectorAll('#view .note.err')].map(n => n.textContent).join(''));
    await btn(page, 'Generate CSR and key');
    const a = await msg();
    await page.fill(K('CN'), 'example.org'); await page.fill(K('C'), 'G1');
    await btn(page, 'Generate CSR and key');
    const b = await msg();
    await page.fill(K('C'), 'GB'); await page.fill(K('sans'), 'IP:300.1.2.3');
    await btn(page, 'Generate CSR and key');
    const c = await msg();
    return all([check('empty', /common name or at least one/.test(a), true), check('country', /two-letter/.test(b), true), check('ip', /not a valid IPv4 or IPv6/.test(c), true)]);
  } },

  /* ---------------- ssh-keygen ---------------- */
  { name: 'ssh-keygen: bcrypt_pbkdf matches pyca/bcrypt vectors and decrypts a real ssh-keygen key', tool: 'ssh-keygen', run: async page => {
    const got = await page.evaluate(() => {
      const hex = b => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
      const te = s => new TextEncoder().encode(s), f = window.CryptoKitB.bcryptPbkdf;
      return [hex(f(te('password'), te('salt'), 4, 32)), hex(f(te('password'), te('salt'), 8, 64)), hex(f(te('password'), te('salt'), 42, 16)),
        hex(f(te('Ὀδυσσεύς'), te('Τηλέμαχος'), 8, 16))];
    });
    const want = ['5bbf0cc293587f1c3635555c27796598d47e579071bf427e9d8fbe842aba34d9',
      'e1367ec5151a33faac4cc1c144cd23fa15d5548493ecc99b9b5d9c0d3b27bec76227ea66088b849b20ab7aa478010246e74bba51723fefa9f9474d6508845e8d',
      '833cf0dcf56db65608e8f0dc0ce882bd', '43666c9b09ef33ed8c27e8e8f3e2d8e6'];
    const v = readOpenssh(SSH_VECTOR_KEY);
    const kiv = await page.evaluate(([salt, rounds]) => Array.from(window.CryptoKitB.bcryptPbkdf(new TextEncoder().encode('password'), Uint8Array.from(salt), rounds, 48)), [Array.from(v.salt), v.rounds]);
    const plain = decryptSection(v, kiv);
    const pubB64 = SSH_VECTOR_PUB.split(' ')[1];
    return all([check('vectors', got, want), check('real key', [v.cipher, v.kdf, plain.readUInt32BE(0) === plain.readUInt32BE(4), v.pub.toString('base64') === pubB64,
      plain.subarray(8, 8 + 4 + 11).subarray(4).toString()], ['aes256-ctr', 'bcrypt', true, true, 'ssh-ed25519'])]);
  } },
  { name: 'ssh-keygen: Ed25519, ECDSA and RSA keys load in Python cryptography; fingerprint and randomart', tool: 'ssh-keygen', run: async page => {
    const py = python();
    if (!py) return { ok: false, detail: 'needs Python with the cryptography package' };
    const r = [];
    await page.fill(K('comment'), 'jane@laptop');
    for (const [type, cls, bits] of [['ed25519', 'Ed25519PrivateKey', 256], ['p256', 'EllipticCurvePrivateKey', 256], ['p384', 'EllipticCurvePrivateKey', 384], ['rsa3072', 'RSAPrivateKey', 3072]]) {
      await page.selectOption(K('type'), type);
      await page.evaluate(() => { const n = document.querySelector('#view [data-k="openssh"]'); if (n) n.value = ''; });
      await btn(page, 'Generate key pair');
      await waitK(page, 'openssh', 'v.includes("END OPENSSH PRIVATE KEY")', 60000);
      const priv = await val(page, 'openssh'), pub = await val(page, 'pub'), fp = await val(page, 'fp'), art = await val(page, 'art');
      const script = `
import sys, json, base64, hashlib
from cryptography.hazmat.primitives import serialization as s, hashes
from cryptography.hazmat.primitives.asymmetric import ec, padding
priv = s.load_ssh_private_key(open(sys.argv[1],'rb').read(), None)
pub = s.load_ssh_public_key(open(sys.argv[2],'rb').read())
same = priv.public_key().public_bytes(s.Encoding.OpenSSH, s.PublicFormat.OpenSSH) == pub.public_bytes(s.Encoding.OpenSSH, s.PublicFormat.OpenSSH)
msg = b'hello'
name = type(priv).__name__
if 'Ed25519' in name: pub.verify(priv.sign(msg), msg)
elif 'EllipticCurve' in name: pub.verify(priv.sign(msg, ec.ECDSA(hashes.SHA256())), msg, ec.ECDSA(hashes.SHA256()))
else: pub.verify(priv.sign(msg, padding.PKCS1v15(), hashes.SHA256()), msg, padding.PKCS1v15(), hashes.SHA256())
bits = getattr(priv, 'key_size', 256) if 'Ed25519' not in name else 256
print(json.dumps([same, name, bits]))`;
      const out = JSON.parse(execFileSync(py, ['-c', script, tmpFile('id', priv), tmpFile('id.pub', pub)], { encoding: 'utf8' }));
      const blob = Buffer.from(pub.split(' ')[1], 'base64');
      const wantFp = bits + ' SHA256:' + crypto.createHash('sha256').update(blob).digest('base64').replace(/=+$/, '') + ' jane@laptop (' + (type === 'ed25519' ? 'ED25519' : type[0] === 'p' ? 'ECDSA' : 'RSA') + ')';
      r.push(check(type + ' python', [out[0], out[1].includes(cls.replace('PrivateKey', '')), out[2]], [true, true, bits]));
      r.push(check(type + ' comment', pub.endsWith(' jane@laptop'), true));
      r.push(check(type + ' fingerprint', fp, wantFp));
      const lines = art.split('\n');
      r.push(check(type + ' randomart frame', [lines.length, lines[0], lines[10], lines.slice(1, 10).every(l => /^\|.{17}\|$/.test(l)), (art.match(/S/g) || []).length >= 1],
        [11, { ed25519: '+--[ED25519 256]--+', p256: '+---[ECDSA 256]---+', p384: '+---[ECDSA 384]---+', rsa3072: '+---[RSA 3072]----+' }[type], '+----[SHA256]-----+', true, true]));
    }
    /* The drunken bishop walk, worked by hand for an all-zero digest: every
       move is up-left, so it slides from the centre to the top-left corner. */
    const zero = await page.evaluate(() => window.CryptoKitB.randomart(new Uint8Array(32), 'ED25519 256', 'SHA256'));
    r.push(check('randomart by hand', zero, ['+--[ED25519 256]--+', '|E....            |', '|     .           |', '|      .          |', '|       .         |', '|        S        |',
      '|                 |', '|                 |', '|                 |', '|                 |', '+----[SHA256]-----+'].join('\n')));
    return all(r);
  } },
  { name: 'ssh-keygen: passphrase re-encrypts the same key with bcrypt_pbkdf + aes256-ctr; PKCS#8 imports; TweetNaCl fallback', tool: 'ssh-keygen', run: async page => {
    const py = python();
    if (!py) return { ok: false, detail: 'needs Python with the cryptography package' };
    await page.selectOption(K('type'), 'ed25519');
    await btn(page, 'Generate key pair');
    await waitK(page, 'openssh', 'v.includes("END OPENSSH PRIVATE KEY")', 60000);
    const plainPem = await val(page, 'openssh'), pkcs8 = await val(page, 'pkcs8'), pub = await val(page, 'pub');
    await page.fill(K('pass'), 'hunter2 is weak'); await page.fill(K('pass2'), 'hunter2 is weak');
    await page.waitForFunction(() => document.querySelector('#view [data-k="openssh"]').dataset.encrypted === '1', null, { timeout: 30000 });
    const encPem = await val(page, 'openssh');
    const a = readOpenssh(plainPem), b = readOpenssh(encPem);
    const kiv = await page.evaluate(([salt, rounds]) => Array.from(window.CryptoKitB.bcryptPbkdf(new TextEncoder().encode('hunter2 is weak'), Uint8Array.from(salt), rounds, 48)), [Array.from(b.salt), b.rounds]);
    const dec = decryptSection(b, kiv);
    /* Same private section apart from the random check-ints and the padding. */
    const bodyA = a.priv.subarray(8), bodyB = dec.subarray(8);
    const strip = x => { let n = x.length; const last = x[n - 1]; if (last > 0 && last < 16 && x.subarray(n - last).every((v, i) => v === i + 1)) n -= last; return x.subarray(0, n); };
    const pkObj = crypto.createPrivateKey(pkcs8);
    const pubFromPkcs8 = pkObj.export({ format: 'jwk' }).x;
    const pubBlob = Buffer.from(pub.split(' ')[1], 'base64');
    const r = [check('encrypted header', [b.cipher, b.kdf, b.rounds, b.salt.length, b.priv.length % 16], ['aes256-ctr', 'bcrypt', 16, 16, 0]),
      check('check-ints', dec.readUInt32BE(0) === dec.readUInt32BE(4), true),
      check('same key', strip(bodyA).equals(strip(bodyB)), true),
      check('pkcs8', [pkObj.asymmetricKeyType, Buffer.from(pubFromPkcs8, 'base64url').equals(pubBlob.subarray(pubBlob.length - 32))], ['ed25519', true])];
    /* Browsers without WebCrypto Ed25519 fall back to TweetNaCl. */
    await page.fill(K('pass'), ''); await page.fill(K('pass2'), '');
    await page.evaluate(() => {
      const orig = crypto.subtle.generateKey.bind(crypto.subtle);
      crypto.subtle.generateKey = (alg, ...rest) => (alg && alg.name === 'Ed25519') ? Promise.reject(new Error('NotSupportedError')) : orig(alg, ...rest);
    });
    await btn(page, 'Generate key pair');
    await page.waitForFunction(() => /TweetNaCl/.test(document.querySelector('#view .note.ok') ? document.querySelector('#view .note.ok').textContent : ''), null, { timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('#view [data-k="openssh"]').dataset.encrypted === '0', null, { timeout: 30000 });
    const naclPriv = await val(page, 'openssh'), naclPub = await val(page, 'pub');
    const out = execFileSync(py, ['-c', `
import sys
from cryptography.hazmat.primitives import serialization as s
k = s.load_ssh_private_key(open(sys.argv[1],'rb').read(), None)
p = s.load_ssh_public_key(open(sys.argv[2],'rb').read())
print(k.public_key().public_bytes(s.Encoding.OpenSSH, s.PublicFormat.OpenSSH) == p.public_bytes(s.Encoding.OpenSSH, s.PublicFormat.OpenSSH))`, tmpFile('n', naclPriv), tmpFile('n.pub', naclPub)], { encoding: 'utf8' }).trim();
    r.push(check('tweetnacl key loads', out, 'True'));
    return all(r);
  } },

  /* ---------------- pgp-tool ---------------- */
  { name: 'pgp-tool: generated key works with OpenPGP.js in Node both ways (encrypt, decrypt, cleartext and detached signatures, revocation)', tool: 'pgp-tool', run: async page => {
    const openpgp = require('openpgp');
    const pass = 'a long pgp passphrase';
    await page.fill(K('gen-name'), 'Jane Smith'); await page.fill(K('gen-email'), 'jane@example.co.uk');
    await page.fill(K('gen-pass'), pass); await page.fill(K('gen-pass2'), pass);
    await btn(page, 'Generate key pair');
    await page.waitForSelector(K('gen-priv'), { timeout: 60000 });
    const pubA = await val(page, 'gen-pub'), privA = await val(page, 'gen-priv'), rev = await val(page, 'gen-rev'), fpShown = await val(page, 'gen-fp');
    const pub = await openpgp.readKey({ armoredKey: pubA });
    const priv = await openpgp.decryptKey({ privateKey: await openpgp.readPrivateKey({ armoredKey: privA }), passphrase: pass });
    const exp = await pub.getExpirationTime();
    const revoked = await openpgp.revokeKey({ key: pub, revocationCertificate: rev, format: 'object' });
    const r = [check('key', [pub.getUserIDs()[0], fpShown.replace(/\s/g, '').toLowerCase() === pub.getFingerprint(), pub.getAlgorithmInfo().algorithm, (await pub.getEncryptionKey()).getAlgorithmInfo().algorithm,
      Math.round((exp - pub.getCreationTime()) / 86400000), await revoked.publicKey.isRevoked()],
      ['Jane Smith <jane@example.co.uk>', true, 'eddsaLegacy', 'ecdh', 730, true])];
    /* The tool encrypts; Node decrypts with the private key. */
    await chip(page, 'Encrypt');
    await page.fill(K('enc-text'), 'Tea at 16:00? £3.50 each 🍰');
    await page.locator(`${V} label.check`, { hasText: 'Sign it too' }).click();
    await page.fill(K('enc-sign-pass'), pass);
    await act(page, 'Encrypt');
    await page.waitForSelector(K('enc-out'), { timeout: 30000 });
    const ct = await val(page, 'enc-out');
    const d = await openpgp.decrypt({ message: await openpgp.readMessage({ armoredMessage: ct }), decryptionKeys: priv, verificationKeys: pub, expectSigned: true });
    r.push(check('node decrypts tool output', d.data, 'Tea at 16:00? £3.50 each 🍰'));
    /* Node encrypts and signs with another key; the tool decrypts and checks the signature. */
    const other = await openpgp.generateKey({ userIDs: [{ name: 'Bob', email: 'bob@example.org' }], format: 'object' });
    const ct2 = await openpgp.encrypt({ message: await openpgp.createMessage({ text: 'From Node with love' }), encryptionKeys: pub, signingKeys: other.privateKey });
    await chip(page, 'Decrypt');
    await page.fill(K('dec-pass'), pass);
    await page.fill(K('dec-in'), ct2);
    await page.fill(K('dec-verify'), other.publicKey.armor());
    await act(page, 'Decrypt');
    await page.waitForSelector(K('dec-out'), { timeout: 30000 });
    r.push(check('tool decrypts node output', [await val(page, 'dec-out'), (await val(page, 'dec-sig')).startsWith('✓ Good signature from Bob <bob@example.org>')], ['From Node with love', true]));
    /* Cleartext and detached signatures made by the tool verify in Node. */
    await chip(page, 'Sign');
    await page.fill(K('sign-pass'), pass);
    await page.fill(K('sign-text'), 'I, Jane, agree.\nSigned in Bristol.');
    await act(page, 'Sign');
    await page.waitForSelector(K('sign-out'), { timeout: 30000 });
    const clear = await val(page, 'sign-out');
    const v1 = await openpgp.verify({ message: await openpgp.readCleartextMessage({ cleartextMessage: clear }), verificationKeys: pub });
    await chip(page, 'Detached signature');
    await act(page, 'Sign');
    await page.waitForFunction(() => /BEGIN PGP SIGNATURE/.test(document.querySelector('#view [data-k="sign-out"]').value) && !/SIGNED MESSAGE/.test(document.querySelector('#view [data-k="sign-out"]').value), null, { timeout: 30000 });
    const det = await val(page, 'sign-out');
    const v2 = await openpgp.verify({ message: await openpgp.createMessage({ text: 'I, Jane, agree.\nSigned in Bristol.' }), signature: await openpgp.readSignature({ armoredSignature: det }), verificationKeys: pub });
    r.push(check('node verifies signatures', [await v1.signatures[0].verified, v1.data, await v2.signatures[0].verified], [true, 'I, Jane, agree.\nSigned in Bristol.', true]));
    /* Node signs; the tool verifies, and spots tampering. */
    const signed = await openpgp.sign({ message: await openpgp.createCleartextMessage({ text: 'Bob says hello' }), signingKeys: other.privateKey });
    await chip(page, 'Verify');
    await page.fill(K('verify-keys'), other.publicKey.armor());
    await page.fill(K('verify-in'), signed);
    await act(page, 'Verify');
    await waitK(page, 'verify-out', 'v.length > 0', 30000);
    const good = await val(page, 'verify-out');
    await page.fill(K('verify-in'), signed.replace('Bob says hello', 'Bob says goodbye'));
    await act(page, 'Verify');
    await waitK(page, 'verify-out', 'v.startsWith("✗")', 30000);
    r.push(check('tool verifies node signature', good.startsWith('✓ Good signature from Bob <bob@example.org>'), true));
    return all(r);
  } },
  { name: 'pgp-tool: files encrypt and decrypt with names restored; inspector reads an RSA key; wrong passphrase is reported', tool: 'pgp-tool', run: async page => {
    const openpgp = require('openpgp');
    const { privateKey, publicKey } = await openpgp.generateKey({ type: 'rsa', rsaBits: 3072, userIDs: [{ name: 'Ada', email: 'ada@example.org' }], passphrase: 'pw-ada', keyExpirationTime: 0, format: 'armored' });
    const key = await openpgp.readKey({ armoredKey: publicKey });
    await chip(page, 'Inspect key');
    await page.fill(K('insp-key'), publicKey);
    await waitK(page, 'insp-fp', 'v.length > 0', 30000);
    const r = [check('inspect', [(await val(page, 'insp-fp')).replace(/\s/g, '').toLowerCase(), await val(page, 'insp-uids'), await val(page, 'insp-algo'), await val(page, 'insp-exp'), await val(page, 'insp-type')],
      [key.getFingerprint(), 'Ada <ada@example.org>', 'RSA 3072-bit', 'never', 'Public key'])];
    r.push(check('subkeys listed', await page.$$eval(`${V} [data-tab="inspect"] table.data tbody tr`, t => t.length), 1));
    /* Encrypt a file in the tool, decrypt it in Node. */
    const file = crypto.randomBytes(70000);
    await chip(page, 'Encrypt');
    await page.fill(K('enc-keys'), publicKey);
    await chip(page, 'Files');
    await page.setInputFiles(`${V} [data-tab="enc"] input[type=file]`, { name: 'report.pdf', mimeType: 'application/pdf', buffer: file });
    await act(page, 'Encrypt');
    await page.waitForSelector(`${V} [data-tab="enc"] .fileitem button`, { timeout: 30000 });
    const g = await download(page, () => page.click(`${V} [data-tab="enc"] .fileitem button`));
    const priv = await openpgp.decryptKey({ privateKey: await openpgp.readPrivateKey({ armoredKey: privateKey }), passphrase: 'pw-ada' });
    const dn = await openpgp.decrypt({ message: await openpgp.readMessage({ binaryMessage: g.data }), decryptionKeys: priv, format: 'binary' });
    r.push(check('node decrypts file', [g.name, dn.filename, Buffer.from(dn.data).equals(file)], ['report.pdf.gpg', 'report.pdf', true]));
    /* Node encrypts a file; the tool decrypts it and restores the name. */
    const bin = await openpgp.encrypt({ message: await openpgp.createMessage({ binary: file, filename: 'accounts.xlsx' }), encryptionKeys: key, format: 'binary' });
    await chip(page, 'Decrypt');
    await page.fill(K('dec-key'), privateKey);
    await page.fill(K('dec-pass'), 'wrong');
    await chip(page, 'File');
    await page.setInputFiles(`${V} [data-tab="dec"] input[type=file]`, { name: 'whatever.gpg', mimeType: 'application/octet-stream', buffer: Buffer.from(bin) });
    await act(page, 'Decrypt');
    await page.waitForFunction(() => /Wrong passphrase/.test([...document.querySelectorAll('#view [data-tab="dec"] .note.err')].map(n => n.textContent).join('')), null, { timeout: 30000 });
    await page.fill(K('dec-pass'), 'pw-ada');
    await act(page, 'Decrypt');
    await page.waitForSelector(`${V} [data-tab="dec"] .fileitem button`, { timeout: 30000 });
    const back = await download(page, () => page.click(`${V} [data-tab="dec"] .fileitem button`));
    r.push(check('tool decrypts file', [back.name, back.data.equals(file)], ['accounts.xlsx', true]));
    return all(r);
  } }
];
