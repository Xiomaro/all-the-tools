/* Behaviour checks for the Password Manager in crypto-d.js. The .vault files
   it downloads are opened here with Node's own crypto (PBKDF2-SHA-256 and
   AES-256-GCM, following the format described at the top of crypto-d.js),
   and files made here with Node are opened in the page. Pwned Passwords is
   replaced by a local route that also records what was asked. */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const V = '#view';
const STORE = 'att:vault';

function eq(got, want) { return { ok: JSON.stringify(got) === JSON.stringify(want), detail: JSON.stringify(got).slice(0, 500) }; }

function aad(env) {
  return Buffer.from(JSON.stringify([env.format, env.version, env.id, env.revision, env.saved,
    env.kdf.name, env.kdf.iterations, env.kdf.salt, env.cipher.name, env.cipher.iv]), 'utf8');
}
function nodeKey(password, salt, iterations) { return crypto.pbkdf2Sync(Buffer.from(password.normalize('NFC'), 'utf8'), salt, iterations, 32, 'sha256'); }
function nodeOpen(text, password) {
  const env = JSON.parse(text);
  const data = Buffer.from(env.data, 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', nodeKey(password, Buffer.from(env.kdf.salt, 'base64'), env.kdf.iterations), Buffer.from(env.cipher.iv, 'base64'));
  d.setAAD(aad(env));
  d.setAuthTag(data.subarray(data.length - 16));
  return { env, body: JSON.parse(Buffer.concat([d.update(data.subarray(0, data.length - 16)), d.final()]).toString('utf8')) };
}
function nodeSeal({ id, revision, password, entries, deleted }) {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12), saved = new Date().toISOString();
  const env = { format: 'all-the-tools-vault', version: 1, id, revision, saved,
    kdf: { name: 'PBKDF2-SHA-256', iterations: 600000, salt: salt.toString('base64') }, cipher: { name: 'AES-256-GCM', iv: iv.toString('base64') } };
  const c = crypto.createCipheriv('aes-256-gcm', nodeKey(password, salt, 600000), iv);
  c.setAAD(aad(env));
  env.data = Buffer.concat([c.update(JSON.stringify({ entries, deleted: deleted || {}, saved }), 'utf8'), c.final(), c.getAuthTag()]).toString('base64');
  return JSON.stringify(env);
}
function tmpFile(name, data) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attpm-'));
  const p = path.join(dir, name);
  fs.writeFileSync(p, data);
  return p;
}
function entry(id, title, username, password, url, t) {
  return { id, title, username, password, url, notes: '', folder: '', created: t, updated: t };
}

async function clickExact(page, text) {
  await page.evaluate(t => {
    const b = [...document.querySelectorAll('#view button')].find(x => x.textContent.trim() === t && x.offsetParent);
    if (!b) throw new Error('no button ' + t);
    b.click();
  }, text);
  await page.waitForTimeout(100);
}
async function waitText(page, sel, re, ms) {
  await page.waitForFunction(([s, src]) => { const n = document.querySelector('#view ' + s); return n && new RegExp(src).test(n.textContent); },
    [sel, re.source], { timeout: ms || 15000 });
  return page.textContent(V + ' ' + sel);
}
async function status(page, re) { return waitText(page, '[data-out=pm-status]', re); }
async function stored(page) { return page.evaluate(k => localStorage.getItem(k), STORE); }
/* The browser's copy once it has caught up with `want` (saving is async). */
async function storedBody(page, password, want, ms) {
  const until = Date.now() + (ms || 15000);
  let last = null;
  while (Date.now() < until) {
    const t = await stored(page);
    if (t) { last = nodeOpen(t, password); if (want(last)) return last; }
    await page.waitForTimeout(150);
  }
  return last;
}
async function reset(page) {
  await page.evaluate(() => { localStorage.removeItem('att:vault'); localStorage.removeItem('att:vault-prefs'); });
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector(V + ' .g-pm');
}
async function create(page, password) {
  await page.fill(V + ' input[aria-label="Master password"]', password);
  await page.fill(V + ' input[aria-label="Type it again"]', password);
  await clickExact(page, 'Create vault');
  await status(page, /^0 logins · saved in this browser$/);
}
async function addLogin(page, f) {
  await clickExact(page, 'Add login');
  await page.fill(V + ' input[aria-label="Name"]', f.title);
  await page.fill(V + ' input[aria-label="Username"]', f.username);
  await page.fill(V + ' input[aria-label="Password"]', f.password);
  await page.fill(V + ' input[aria-label="Website"]', f.url || '');
  await clickExact(page, 'Save');
}
async function download(page, action) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), action()]);
  return { name: dl.suggestedFilename(), text: fs.readFileSync(await dl.path(), 'utf8') };
}

module.exports = [
  { name: 'password-manager: create a vault, add a login, lock, refuse a wrong password, unlock; the stored copy opens with Node', tool: 'password-manager', run: async page => {
    await reset(page);
    const P = 'tiger-Maple-orbit-7-lantern';
    await create(page, P);
    await addLogin(page, { title: 'Example', username: 'ann@example.com', password: 'correct horse battery staple', url: 'example.com' });
    const s1 = await status(page, /^1 login /);
    const row = await page.textContent(V + ' [data-out=pm-list] .pm-row');
    const saved = await storedBody(page, P, o => o.body.entries.length === 1);
    await clickExact(page, 'Lock');
    await page.fill(V + ' input[aria-label="Master password"]', 'not the password');
    await clickExact(page, 'Unlock');
    const wrong = await waitText(page, 'form .note.err', /./);
    await page.fill(V + ' input[aria-label="Master password"]', P);
    await clickExact(page, 'Unlock');
    const s2 = await status(page, /^1 login /);
    const e = saved.body.entries[0];
    return eq([s1, /Example/.test(row) && /ann@example\.com · example\.com/.test(row), wrong, s2,
      saved.env.kdf.iterations, saved.env.cipher.name, [e.title, e.username, e.password, e.url]],
    ['1 login · saved in this browser', true, 'That password doesn’t open this vault.', '1 login · saved in this browser',
      600000, 'AES-256-GCM', ['Example', 'ann@example.com', 'correct horse battery staple', 'example.com']]);
  } },

  { name: 'password-manager: a downloaded .vault opens with Node, and a Node-made copy with other changes merges in', tool: 'password-manager', run: async page => {
    await reset(page);
    const P = 'first-Vault-password-42', Q = 'another password for the file';
    await create(page, P);
    await addLogin(page, { title: 'Alpha', username: 'a', password: 'alpha-Pass-1234', url: 'https://alpha.example' });
    await status(page, /^1 login /);
    await addLogin(page, { title: 'Charlie', username: 'c', password: 'charlie-Pass-1234', url: 'https://charlie.example' });
    await status(page, /^2 logins /);
    await storedBody(page, P, o => o.body.entries.length === 2);
    const dl = await download(page, () => clickExact(page, 'Download .vault'));
    const got = nodeOpen(dl.text, P);
    const nudgeGone = await page.evaluate(() => !document.querySelector('#view [data-out=pm-nudge]'));

    /* The same vault elsewhere: Alpha edited later, Charlie deleted, Bravo added. */
    const later = Date.now() + 5000;
    const alpha = got.body.entries.find(x => x.title === 'Alpha'), charlie = got.body.entries.find(x => x.title === 'Charlie');
    const other = nodeSeal({ id: got.env.id, revision: got.env.revision + 3, password: Q,
      entries: [Object.assign({}, alpha, { password: 'alpha-Changed-5678', updated: later }), entry('00112233aabbccdd', 'Bravo', 'b', 'bravo-Pass-1234', 'https://bravo.example', later)],
      deleted: { [charlie.id]: later } });
    await clickExact(page, 'Import & export');
    await page.setInputFiles(V + ' input[type=file][accept^=".vault"]', tmpFile('other.vault', other));
    await page.fill(V + ' input[aria-label="Master password for this file"]', Q);
    await clickExact(page, 'Merge');
    const msg = await waitText(page, '.note.ok', /Merged/);
    const s = await status(page, /^2 logins /);
    const after = await storedBody(page, P, o => o.body.entries.some(x => x.title === 'Bravo'));
    const titles = after.body.entries.map(x => x.title + ':' + x.password).sort();
    return eq([dl.name.endsWith('.vault'), got.body.entries.map(x => x.title).sort(), nudgeGone, msg, s, titles, after.env.id === got.env.id],
      [true, ['Alpha', 'Charlie'], true, 'Merged other.vault: 1 added, 1 updated, 1 removed.', '2 logins · saved in this browser',
        ['Alpha:alpha-Changed-5678', 'Bravo:bravo-Pass-1234'], true]);
  } },

  { name: 'password-manager: a .vault file opened in an empty browser can be kept here or just opened', tool: 'password-manager', run: async page => {
    await reset(page);
    const P = 'restore-me-Please-2026';
    const file = tmpFile('backup.vault', nodeSeal({ id: 'a1b2c3d4e5f60718', revision: 9, password: P,
      entries: [entry('1111111111111111', 'Mail', 'me', 'mail-Pass-9876', 'https://mail.example', 1700000000000)] }));
    const open = async keep => {
      await page.setInputFiles(V + ' input[type=file][accept^=".vault"]', file);
      await page.waitForSelector(V + ' input[aria-label="Master password for this file"]');
      if (!keep) await page.locator(V + ' label.check', { hasText: 'Keep it in this browser' }).click();
      await page.fill(V + ' input[aria-label="Master password for this file"]', P);
      await clickExact(page, 'Open');
    };
    await open(false);
    const loose = await status(page, /^1 login /);
    const nothingStored = await stored(page);
    await clickExact(page, 'Lock');
    const lockTitle = await waitText(page, '.panel h3', /Unlock/);
    await clickExact(page, 'Close it');
    await page.waitForSelector(V + ' input[aria-label="Type it again"]');
    await open(true);
    const kept = await status(page, /^1 login /);
    const s = JSON.parse(await stored(page));
    return eq([loose, nothingStored, lockTitle, kept, s.id, s.revision],
      ['1 login · opened from backup.vault, not saved in this browser', null, 'Unlock backup.vault', '1 login · saved in this browser', 'a1b2c3d4e5f60718', 9]);
  } },

  { name: 'password-manager: imports Bitwarden and Chrome CSVs, skips duplicates, finds weak, reused and breached passwords', tool: 'password-manager', run: async page => {
    await reset(page);
    const P = 'import-Test-password-11';
    await create(page, P);
    await clickExact(page, 'Import & export');
    const bitwarden = 'folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp\n' +
      'Work,,login,GitHub,,,0,https://github.com,ann,Password1!,JBSWY3DPEHPK3PXP\n' +
      ',,login,Bank,"Account 1234",,0,https://bank.example,ann,Xk9mQ2vLp7Rt!zQ8#,\n' +
      ',,login,Shop,,,0,https://shop.example,ann@example.com,Xk9mQ2vLp7Rt!zQ8#,\n';
    await page.setInputFiles(V + ' input[type=file][accept^=".csv"]', tmpFile('bitwarden_export.csv', bitwarden));
    const src1 = await waitText(page, '[data-out=pm-import-source]', /looks like an export from/);
    const sum1 = await waitText(page, '[data-out=pm-import-summary]', /rows/);
    await clickExact(page, 'Import 3 logins');
    await status(page, /^3 logins /);
    const chrome = 'name,url,username,password,note\r\ngithub.com,https://github.com/login,ann,Password1!,\r\nnews.example,https://news.example/,bob,hunter2,\r\n';
    await page.setInputFiles(V + ' input[type=file][accept^=".csv"]', tmpFile('Chrome Passwords.csv', chrome));
    const sum2 = await waitText(page, '[data-out=pm-import-summary]', /rows/);
    await clickExact(page, 'Import 1 login');
    await status(page, /^4 logins /);
    const body = (await storedBody(page, P, o => o.body.entries.length === 4)).body;
    const gh = body.entries.find(x => x.title === 'GitHub');

    const counts = { 'Password1!': 123456, hunter2: 17043 };
    const byHash = {};
    for (const [pw, n] of Object.entries(counts)) byHash[crypto.createHash('sha1').update(pw).digest('hex').toUpperCase()] = n;
    const asked = [];
    await page.route('https://api.pwnedpasswords.com/range/*', route => {
      const prefix = route.request().url().split('/').pop();
      asked.push(prefix);
      const lines = Object.entries(byHash).filter(([h]) => h.startsWith(prefix)).map(([h, n]) => h.slice(5) + ':' + n);
      lines.push('0000000000000000000000000000000000A:0');
      route.fulfill({ status: 200, contentType: 'text/plain', headers: { 'Access-Control-Allow-Origin': '*' }, body: lines.join('\r\n') });
    });
    try {
      await clickExact(page, 'Health check');
      const tiles = () => page.evaluate(() => [...document.querySelectorAll('#view .stat b')].map(b => b.textContent));
      const before = await tiles();
      await clickExact(page, 'Check for breaches');
      await page.waitForFunction(() => { const b = document.querySelectorAll('#view .stat b'); return b.length === 4 && b[3].textContent !== '—'; }, null, { timeout: 15000 });
      const afterTiles = await tiles();
      const panels = await page.evaluate(() => [...document.querySelectorAll('#view .panel h3')].map(h => h.textContent));
      const breachRows = await page.evaluate(() => [...document.querySelectorAll('#view .panel')].find(p => /Found in data breaches/.test(p.textContent))
        .querySelectorAll('.pm-row').length);
      const distinct = new Set(Object.values({ a: 'Password1!', b: 'Xk9mQ2vLp7Rt!zQ8#', c: 'hunter2' }).map(pw => crypto.createHash('sha1').update(pw).digest('hex').toUpperCase().slice(0, 5))).size;
      return eq([src1, sum1, sum2, [gh.folder, gh.notes, gh.url, gh.username], before, afterTiles, panels.slice(1), breachRows,
        asked.length === distinct && asked.every(p => /^[0-9A-F]{5}$/.test(p))],
      ['This looks like an export from Bitwarden. Check the columns, then import.', '3 rows: 3 to import.', '2 rows: 1 to import, 1 already in the vault.',
        ['Work', '2FA secret: JBSWY3DPEHPK3PXP', 'https://github.com', 'ann'],
        ['4', '2', '2', '—'], ['4', '2', '2', '2'],
        ['Password health', 'Found in data breaches', 'Reused passwords', 'Weak passwords'], 2, true]);
    } finally { await page.unroute('https://api.pwnedpasswords.com/range/*'); }
  } }
];
