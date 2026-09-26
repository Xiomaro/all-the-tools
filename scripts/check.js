#!/usr/bin/env node
/* End-to-end smoke test: serves the folder, opens every tool in a headless
   browser, and fails if any of them throws or renders nothing. It also checks
   that every tool listed in scripts/tools-manifest.json is registered with the
   same name and category.

   Usage:  node scripts/check.js [--headed] [--only=cat1,cat2] [--group=name from scripts/groups.json] [--port=8731] [--no-behaviour] */

'use strict';

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const { createRequire } = require('module');

function loadPlaywright() {
  try { return require('playwright'); } catch (e) { /* fall through */ }
  for (const dir of ['/opt/node22/lib/node_modules', '/usr/lib/node_modules', '/usr/local/lib/node_modules']) {
    try { return createRequire(path.join(dir, 'x.js'))('playwright'); } catch (e) { /* keep looking */ }
  }
  console.error('Playwright is not installed. Run: npm i -D playwright');
  process.exit(2);
}

const ROOT = path.resolve(__dirname, '..');
const arg = name => (process.argv.find(a => a.startsWith('--' + name + '=')) || '').split('=')[1];
const PORT = Number(arg('port')) || 8731;
const GROUP = arg('group') ? require(path.join(ROOT, 'scripts', 'groups.json'))[arg('group')] : null;
if (arg('group') && !GROUP) { console.error('Unknown group ' + arg('group')); process.exit(2); }
const ONLY = arg('only') ? arg('only').split(',') : null;
const QUERY = GROUP ? '?only=' + GROUP.files.join(',') : '';
const inScope = t => (!ONLY || ONLY.includes(t.category)) && (!GROUP || GROUP.ids.includes(t.id));
const MANIFEST = require(path.join(ROOT, 'scripts', 'tools-manifest.json'));
const BASE = `http://127.0.0.1:${PORT}/`;

function waitForServer(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    (function attempt() {
      http.get(BASE, res => { res.resume(); resolve(); })
        .on('error', () => {
          if (Date.now() > deadline) reject(new Error('server did not start'));
          else setTimeout(attempt, 120);
        });
    })();
  });
}

(async () => {
  const { chromium } = loadPlaywright();

  const server = spawn(process.platform === 'win32' ? 'python' : 'python3', [path.join(ROOT, 'serve.py'), String(PORT), '--no-browser'],
    { cwd: ROOT, stdio: 'ignore' });
  const stop = () => { try { server.kill(); } catch (e) {} };
  process.on('exit', stop);

  await waitForServer(10000);

  /* Playwright's own browser build may be missing (a newer Playwright than
     the browsers installed on the machine). Fall back to a system Chromium:
     CHROMIUM_PATH if set, otherwise the usual preinstalled locations. */
  const launchOpts = { headless: !process.argv.includes('--headed') };
  let browser;
  try {
    browser = await chromium.launch(launchOpts);
  } catch (err) {
    const fs = require('fs');
    const fallback = [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser']
      .find(p => p && fs.existsSync(p));
    if (!fallback) throw err;
    browser = await chromium.launch({ ...launchOpts, executablePath: fallback });
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  let problems = [];
  let scope = 'startup';
  /* Tools marked `online` talk to the network by design. When the network
     is unavailable (offline machine, sandboxed CI) their failed requests are
     not bugs, and they can land while the next tool is already open, so
     they are ignored for a moment after leaving an online tool too. */
  let onlineIds = new Set();
  let lastOnlineAt = 0;
  const netFailure = text => /Failed to load resource: net::ERR_/.test(text);
  const excusable = text => netFailure(text) && (onlineIds.has(scope) || Date.now() - lastOnlineAt < 5000);
  page.on('pageerror', err => problems.push({ scope, kind: 'pageerror', message: String(err.message || err) }));
  /* Once a behaviour check calls page.clock.install() (the chess clock
     does), Playwright injects its fake clock into every frame for the rest of
     the run. A preview frame sandboxed without scripts then blocks that
     injected script, which is the sandbox working, not a bug in the tool. */
  const injectedIntoSandbox = msg => /^Blocked script execution in 'about:srcdoc'/.test(msg.text()) &&
    msg.location().url === 'about:srcdoc' && !msg.location().lineNumber;
  page.on('console', msg => {
    if (msg.type() === 'error' && !excusable(msg.text()) && !injectedIntoSandbox(msg)) problems.push({ scope, kind: 'console', message: msg.text() });
  });

  await page.goto(BASE + QUERY, { waitUntil: 'load' });

  const allTools = await page.evaluate(() => window.Tools.all().map(t => ({ id: t.id, name: t.name, category: t.category, online: !!t.online,
    partIds: t.partIds || null, absorbs: !!t.absorbs })));
  onlineIds = new Set(allTools.filter(t => t.online).map(t => t.id));
  const tools = allTools.filter(inScope);
  console.log(`Registered tools: ${allTools.length}` + (ONLY || GROUP ? ` (checking ${tools.length})` : ''));

  /* Coverage against the manifest. */
  const byId = Object.fromEntries(allTools.map(t => [t.id, t]));
  const expected = MANIFEST.filter(inScope);
  const missing = [];
  for (const m of expected) {
    const t = byId[m.id];
    if (!t) missing.push(m.id + ' (not registered)');
    else if (t.name !== m.name) missing.push(m.id + ` (name "${t.name}", expected "${m.name}")`);
    else if (t.category !== m.category) missing.push(m.id + ` (category ${t.category}, expected ${m.category})`);
  }
  const extra = allTools.filter(t => !MANIFEST.some(m => m.id === t.id) && (!ONLY || ONLY.includes(t.category)));
  for (const t of extra) missing.push(t.id + ' (registered but not in the manifest)');

  /* The home page's popular lists, modes, recipes, file and paste routing
     name tools by id. Only checkable when every module is loaded. */
  /* Tools folded into a merged tool keep their id as a shortcut to its tab.
     Their behaviour checks run against the merged tool, opened on that tab. */
  const shortcuts = await page.evaluate(() => Object.fromEntries(window.Tools.shortcuts().map(s => [s.id, s.target])));

  const deadLinks = ONLY || GROUP ? [] : await page.evaluate(() => window.Discover ? Discover.unknownIds() : ['(discover.js not loaded)']);
  for (const id of deadLinks) missing.push(id + ' (named in discover.js but not registered)');

  let rendered = 0;
  for (const tool of tools) {
    if (onlineIds.has(scope)) lastOnlineAt = Date.now();
    scope = tool.id;
    await page.goto(BASE + QUERY + '#/t/' + tool.id, { waitUntil: 'load' });
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => setTimeout(r, 40))));

    const state = await page.evaluate(() => {
      const view = document.getElementById('view');
      const host = view.querySelector('.stack');
      return {
        heading: (view.querySelector('h1') || {}).textContent || '',
        children: host ? host.children.length : 0,
        banner: !!view.querySelector('.banner:not(.info)'),
        /* Scoped to the tool's own host, so the shell's pin button and
           filters cannot stand in for a tool that renders no controls. */
        controls: host ? host.querySelectorAll('input, textarea, select, button').length : 0
      };
    });

    if (state.banner) problems.push({ scope: tool.id, kind: 'render', message: 'tool reported a start-up failure' });
    else if (state.children === 0) problems.push({ scope: tool.id, kind: 'render', message: 'rendered no panels' });
    else if (state.controls === 0) problems.push({ scope: tool.id, kind: 'render', message: 'rendered no controls' });
    else if (state.heading !== tool.name) problems.push({ scope: tool.id, kind: 'render', message: `heading was "${state.heading}"` });
    else rendered++;
  }

  /* A few end-to-end behaviours worth pinning down. */
  if (onlineIds.has(scope)) lastOnlineAt = Date.now();
  scope = 'behaviour';
  const checks = [];
  const runBehaviour = !process.argv.includes('--no-behaviour');

  async function behaviour(name, toolId, fn) {
    if (!runBehaviour) return;
    if (onlineIds.has(scope)) lastOnlineAt = Date.now();
    scope = toolId;
    await page.goto('about:blank');
    await page.goto(BASE + QUERY + '#/t/' + toolId, { waitUntil: 'load' });
    await page.evaluate(() => new Promise(r => setTimeout(r, 60)));
    try {
      const got = await fn();
      checks.push({ name, ...got });
    } catch (err) {
      checks.push({ name, ok: false, detail: String(err.message || err) });
    }
  }

  /* Behaviour checks live in scripts/behaviour/*.js. Each file exports an
     array of { name, tool, run(page, helpers) -> { ok, detail } }. A check
     runs when its tool's category is being checked. */
  const helpers = {
    typeAndRead: async (text, expected) => {
      await page.fill('#view textarea', text);
      await page.waitForTimeout(260);
      const out = await page.textContent('#view .out');
      return { ok: out.trim() === expected, detail: out.trim().slice(0, 90) };
    },
    sleep: ms => page.waitForTimeout(ms)
  };
  const fs = require('fs');
  const behaviourDir = path.join(ROOT, 'scripts', 'behaviour');
  /* Only reach for the behaviour files when they are going to run: they pull
     in dev dependencies, so loading them would fail a --no-behaviour sweep on
     a checkout with no node_modules. */
  const files = runBehaviour && fs.existsSync(behaviourDir)
    ? fs.readdirSync(behaviourDir).filter(f => f.endsWith('.js')).sort() : [];
  for (const file of files) {
    for (const c of require(path.join(behaviourDir, file))) {
      const tool = byId[c.tool] || byId[shortcuts[c.tool]];
      /* A merged tool that kept this id but was built without that part,
         because its module isn't loaded in this --group run. */
      if (tool && tool.absorbs && tool.id === c.tool && !tool.partIds.includes(c.tool)) continue;
      if (!tool || !inScope(tool)) continue;
      await behaviour(c.name, c.tool, () => c.run(page, helpers));
    }
  }

  await browser.close();
  stop();

  console.log('');
  for (const c of checks) {
    console.log(`  ${c.ok ? 'pass' : 'FAIL'}  ${c.name}${c.ok ? '' : '  —  got: ' + c.detail}`);
  }

  const failedChecks = checks.filter(c => !c.ok).length;
  console.log('');
  console.log(`Manifest coverage:      ${expected.length - missing.filter(x => !x.includes('not in the manifest') && !x.includes('discover.js')).length}/${expected.length}`);
  for (const m of missing.slice(0, 60)) console.log(`   ${m}`);
  console.log(`Tools rendered cleanly: ${rendered}/${tools.length}`);
  console.log(`Behaviour checks passed: ${checks.length - failedChecks}/${checks.length}`);
  console.log(`Console / page errors:  ${problems.length}`);
  for (const p of problems.slice(0, 25)) console.log(`   [${p.scope}] ${p.kind}: ${p.message}`);

  process.exit(problems.length || failedChecks || missing.length || rendered !== tools.length ? 1 : 0);
})();
