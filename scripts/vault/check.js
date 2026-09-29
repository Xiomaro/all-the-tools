#!/usr/bin/env node
/* Headless checks for the Vault app. Each file in scripts/vault/tests
   exports async function (t) where t = { h, page, assert, log }; the page
   has the fixture vault open. A failed assertion, a page error or a console
   error fails the run.

   Usage: node scripts/vault/check.js [--only=name,name] [--headed] [--port=8741] */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { start } = require('./harness');

const arg = name => (process.argv.find(a => a.startsWith('--' + name + '=')) || '').split('=')[1];
const ONLY = arg('only') ? arg('only').split(',') : null;

(async () => {
  const h = await start({ port: Number(arg('port')) || 8741, headed: process.argv.includes('--headed') });
  const dir = path.join(__dirname, 'tests');
  const tests = fs.readdirSync(dir).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3))
    .filter(n => !ONLY || ONLY.includes(n)).sort();
  let failed = 0;
  for (const name of tests) {
    h.errors.length = 0;
    const page = await h.openVault({ name: 'check-' + name });
    const started = Date.now();
    try {
      await require(path.join(dir, name + '.js'))({ h, page, assert, log: (...a) => console.log('   ', ...a) });
      const errs = h.errors.filter(e => !/favicon|net::ERR_/.test(e));
      if (errs.length) throw new Error('Errors in the page:\n  ' + errs.join('\n  '));
      console.log('ok   ' + name + ' (' + (Date.now() - started) + ' ms)');
    } catch (err) {
      failed++;
      console.log('FAIL ' + name + '\n  ' + String(err.stack || err).split('\n').slice(0, 8).join('\n  '));
    }
    await page.close();
  }
  await h.close();
  console.log(failed ? failed + ' of ' + tests.length + ' failed' : 'All ' + tests.length + ' vault checks passed');
  process.exit(failed ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
