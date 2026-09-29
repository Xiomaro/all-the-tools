/* Test harness for the Vault app (vault/). Serves the repository, starts
   Chromium and opens a browser vault (OPFS) seeded from the fixture vault
   in scripts/vault/fixture, or from files you pass.

   const { start } = require('./harness');
   const h = await start({ port: 8741 });
   const page = await h.openVault({ name: 'test', files: h.fixture() });
   ... page.evaluate(() => app.workspace.getActiveFile()) ...
   await h.close();

   In the page, `app` is the App, and any module can be imported with
   `await import('/vault/js/...')`. */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const ROOT = path.resolve(__dirname, '..', '..');
const FIXTURE = path.join(__dirname, 'fixture');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.txt': 'text/plain' };

function loadPlaywright() {
  try { return require('playwright'); } catch (e) { /* fall through */ }
  for (const dir of ['/opt/node22/lib/node_modules', '/usr/lib/node_modules', '/usr/local/lib/node_modules']) {
    try { return createRequire(path.join(dir, 'x.js'))('playwright'); } catch (e) { /* keep looking */ }
  }
  throw new Error('Playwright is not installed. Run: npm i -D playwright');
}

function serve(port) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}

/* { 'path/in/vault.md': 'text' | { base64 } } from a folder on disk. */
function readTree(dir) {
  const out = {};
  const walk = (d, prefix) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const rel = prefix ? prefix + '/' + e.name : e.name;
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full, rel);
      else if (/\.(md|json|canvas|base|css|txt|js|svg)$/i.test(e.name)) out[rel] = fs.readFileSync(full, 'utf8');
      else out[rel] = { base64: fs.readFileSync(full).toString('base64') };
    }
  };
  walk(dir, '');
  return out;
}

async function launch(headed) {
  const { chromium } = loadPlaywright();
  const opts = { headless: !headed };
  try { return await chromium.launch(opts); }
  catch (e) {
    for (const channel of ['chrome', 'msedge']) {
      try { return await chromium.launch({ ...opts, channel }); } catch (e2) { /* try the next */ }
    }
    const exe = [process.env.CHROMIUM_PATH, '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => p && fs.existsSync(p));
    if (exe) return chromium.launch({ ...opts, executablePath: exe });
    throw e;
  }
}

async function start(opts = {}) {
  const port = opts.port || 8741;
  const server = await serve(port);
  const browser = await launch(opts.headed);
  const base = 'http://127.0.0.1:' + port + '/';
  const errors = [];

  async function openVault({ name = 'test', files = readTree(FIXTURE), viewport = { width: 1400, height: 900 }, page = null } = {}) {
    page = page || await browser.newPage({ viewport });
    page.on('pageerror', e => errors.push('pageerror: ' + (e.stack || e.message)));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto(base + 'vault/index.html', { waitUntil: 'load' });
    await page.evaluate(async ({ name, files }) => {
      const root = await (await navigator.storage.getDirectory()).getDirectoryHandle('vaults', { create: true });
      try { await root.removeEntry(name, { recursive: true }); } catch (e) { /* a new vault */ }
      const vault = await root.getDirectoryHandle(name, { create: true });
      for (const [p, content] of Object.entries(files)) {
        const parts = p.split('/');
        let d = vault;
        for (const seg of parts.slice(0, -1)) d = await d.getDirectoryHandle(seg, { create: true });
        const fh = await d.getFileHandle(parts[parts.length - 1], { create: true });
        const w = await fh.createWritable();
        if (typeof content === 'string') await w.write(content);
        else await w.write(Uint8Array.from(atob(content.base64), c => c.charCodeAt(0)));
        await w.close();
      }
      localStorage.clear();
    }, { name, files });
    await page.goto(base + 'vault/index.html?vault=' + encodeURIComponent(name), { waitUntil: 'load' });
    await page.waitForFunction(() => window.app && window.app.workspace && window.app.workspace.layoutReady, null, { timeout: 30000 });
    return page;
  }

  /* Read a file back out of the browser vault. */
  function readFile(page, p) {
    return page.evaluate(p => window.app.vault.adapter.read(p), p);
  }

  return {
    base, browser, errors, openVault, readFile,
    fixture: () => readTree(FIXTURE),
    async close() { await browser.close(); server.close(); }
  };
}

module.exports = { start, readTree, FIXTURE, ROOT };
