/* Behaviour checks for brain-b: Dual N-Back, Schulte Table and Mental Maths
   Drill. The N-back is played by a small bot inside the page that watches
   each trial, remembers the stream like a player would and presses keys or
   buttons; every expected count, score and d′ is worked out here from what
   the bot saw, never read back from the tool's own maths. */
'use strict';

const V = '#view';
const text = page => page.locator(V).innerText();
async function btn(page, name, exact = true) {
  await page.locator(V).getByRole('button', { name, exact }).first().click();
}

/* Standard normal CDF by Simpson integration of the density, inverted by
   bisection: slow but independent of the tool's rational approximation. */
function cdf(x) {
  const n = 4000, lo = -12, h = (x - lo) / n;
  let s = 0;
  for (let i = 0; i <= n; i++) {
    const t = lo + i * h, f = Math.exp(-t * t / 2) / Math.sqrt(2 * Math.PI);
    s += f * (i === 0 || i === n ? 1 : i % 2 ? 4 : 2);
  }
  return s * h / 3;
}
function z(p) {
  let lo = -12, hi = 12;
  for (let i = 0; i < 90; i++) { const m = (lo + hi) / 2; if (cdf(m) < p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
/* d′ with the log-linear correction (Hautus 1995): add 0.5 to hits and false
   alarms and 1 to each trial count. */
const dprime = c => z((c.hit + 0.5) / (c.hit + c.miss + 1)) - z((c.fa + 0.5) / (c.fa + c.cr + 1));

/* Install the bot. strategy: 'keys-fa' presses A on every position match,
   never L on a sound match, and L on the first two sound non-matches (false
   alarms); 'buttons-perfect' clicks both buttons exactly on the matches. */
async function nbBot(page, strategy) {
  await page.evaluate(strategy => {
    const stage = document.querySelector('#view .nb-stage');
    const bot = window.__nb = { seen: [], tally: { pos: { hit: 0, miss: 0, fa: 0, cr: 0 }, snd: { hit: 0, miss: 0, fa: 0, cr: 0 } }, faLeft: 2 };
    const press = m => {
      if (strategy === 'keys-fa') document.dispatchEvent(new KeyboardEvent('keydown', { key: m === 'pos' ? 'a' : 'L', bubbles: true, cancelable: true }));
      else [...document.querySelectorAll('#view .nb-key')].find(b => b.textContent.includes(m === 'pos' ? 'Position' : 'Sound')).click();
    };
    new MutationObserver(() => {
      const i = Number(stage.dataset.trial);
      if (stage.dataset.state !== 'running' || bot.seen[i]) return;
      const n = Number(stage.dataset.n), cur = { p: stage.dataset.pos, s: stage.dataset.sound };
      bot.seen[i] = cur;
      if (i < n) return;
      const prev = bot.seen[i - n];
      const target = { pos: prev.p === cur.p, snd: prev.s === cur.s };
      const pressed = { pos: target.pos, snd: strategy === 'keys-fa' ? (!target.snd && bot.faLeft > 0) : target.snd };
      if (strategy === 'keys-fa' && pressed.snd) bot.faLeft--;
      ['pos', 'snd'].forEach(m => {
        if (pressed[m]) press(m);
        const c = bot.tally[m];
        if (target[m] && pressed[m]) c.hit++; else if (target[m]) c.miss++; else if (pressed[m]) c.fa++; else c.cr++;
      });
    }).observe(stage, { attributes: true, attributeFilter: ['data-trial'] });
  }, strategy);
}
async function nbCells(page) {
  return page.evaluate(() => {
    const o = {};
    document.querySelectorAll('#view [data-k]').forEach(n => { o[n.dataset.k] = n.textContent; });
    o.next = (document.querySelector('#view [data-k="verdict"]') || { dataset: {} }).dataset.next;
    return o;
  });
}
function expectRow(cells, key, c) {
  const pct = Math.round(c.hit / (c.hit + c.miss + c.fa) * 100) + '%';
  const want = { hit: String(c.hit), miss: String(c.miss), fa: String(c.fa), cr: String(c.cr), pct, d: dprime(c).toFixed(2) };
  const bad = Object.keys(want).filter(k => cells[key + '-' + k] !== want[k]);
  return { ok: !bad.length, detail: bad.map(k => `${key}-${k}=${cells[key + '-' + k]} want ${want[k]}`).join(' ') };
}

module.exports = [
  /* ------------------------------------------------------------ dual n-back */
  {
    name: 'dual-n-back: 2-back played with keys, all position matches, two sound false alarms, drops to 1-back',
    tool: 'dual-n-back',
    run: async page => {
      await page.evaluate(() => { localStorage.removeItem('att-brain-nback-history'); localStorage.removeItem('att-brain-nback-level'); });
      await btn(page, '2-back');
      await page.evaluate(() => document.querySelector('#view .g-brainb')._nback.trialMs(260));
      await btn(page, 'Start');
      await nbBot(page, 'keys-fa');
      await page.waitForFunction(() => document.querySelector('#view .nb-stage').dataset.state === 'done', null, { timeout: 30000 });
      const bot = await page.evaluate(() => window.__nb);
      const cells = await nbCells(page);
      const all = {}; ['hit', 'miss', 'fa', 'cr'].forEach(k => { all[k] = bot.tally.pos[k] + bot.tally.snd[k]; });
      const rows = [expectRow(cells, 'pos', bot.tally.pos), expectRow(cells, 'snd', bot.tally.snd), expectRow(cells, 'all', all)];
      /* 22 trials, the first two cannot match; six matches per stream */
      const shape = bot.seen.length === 22 && bot.tally.pos.hit === 6 && bot.tally.snd.miss === 6 && bot.tally.snd.fa === 2;
      const pct = all.hit / (all.hit + all.miss + all.fa);
      const wantNext = pct >= 0.8 ? 3 : pct < 0.5 ? 1 : 2;
      const hist = await page.evaluate(() => JSON.parse(localStorage.getItem('att-brain-nback-history')));
      const t = await text(page);
      const ok = rows.every(r => r.ok) && shape && wantNext === 1 && cells.next === '1' && t.includes('Down to 1-back') &&
        cells.score === '2-back: ' + Math.round(pct * 100) + '%' && hist.length === 1 && hist[0].n === 2 && /your training on this device/i.test(t);
      return { ok, detail: rows.map(r => r.detail).join(' ') + ` shape=${shape} seen=${bot.seen.length} tally=${JSON.stringify(bot.tally)} next=${cells.next} score=${cells.score}` };
    }
  },
  {
    name: 'dual-n-back: perfect 1-back with the buttons scores 100%, d′ 3.30 and goes up to 2-back',
    tool: 'dual-n-back',
    run: async page => {
      await page.evaluate(() => { localStorage.removeItem('att-brain-nback-history'); });
      const probit = await page.evaluate(() => { const k = document.querySelector('#view .g-brainb')._nback; return [k.probit(0.975), k.probit(0.5), k.probit(0.01)]; });
      await btn(page, '1-back');
      await page.evaluate(() => document.querySelector('#view .g-brainb')._nback.trialMs(260));
      await btn(page, 'Start');
      await nbBot(page, 'buttons-perfect');
      await page.waitForFunction(() => document.querySelector('#view .nb-stage').dataset.state === 'done', null, { timeout: 30000 });
      const bot = await page.evaluate(() => window.__nb);
      const cells = await nbCells(page);
      const all = {}; ['hit', 'miss', 'fa', 'cr'].forEach(k => { all[k] = bot.tally.pos[k] + bot.tally.snd[k]; });
      const rows = [expectRow(cells, 'pos', bot.tally.pos), expectRow(cells, 'snd', bot.tally.snd), expectRow(cells, 'all', all)];
      /* six hits, fourteen correct rejections: z(6.5/7) - z(0.5/15) = 1.4652 + 1.8339 */
      const d = dprime({ hit: 6, miss: 0, fa: 0, cr: 14 });
      const t = await text(page);
      /* z(0.975) = 1.959964, z(0.01) = -2.326348 (standard normal tables) */
      const probitOk = Math.abs(probit[0] - 1.959964) < 1e-5 && Math.abs(probit[1]) < 1e-9 && Math.abs(probit[2] + 2.326348) < 1e-5;
      const ok = rows.every(r => r.ok) && d.toFixed(2) === '3.30' && cells['pos-d'] === '3.30' && cells['snd-d'] === '3.30' &&
        cells.score === '1-back: 100%' && cells.next === '2' && t.includes('Level up! Next block: 2-back.') && bot.seen.length === 21 && probitOk;
      return { ok, detail: rows.map(r => r.detail).join(' ') + ` d=${d.toFixed(3)} cells=${JSON.stringify(cells)} probit=${probit}` };
    }
  },
  {
    name: 'dual-n-back: first N trials cannot be answered, Esc stops the block',
    tool: 'dual-n-back',
    run: async page => {
      await btn(page, '3-back');
      await page.evaluate(() => document.querySelector('#view .g-brainb')._nback.trialMs(400));
      await btn(page, 'Start');
      await page.waitForFunction(() => document.querySelector('#view .nb-stage').dataset.trial === '0', null, { timeout: 5000 });
      const waiting = await page.locator(`${V} .nb-key.wait`).count();
      await page.keyboard.press('a');
      const marked = await page.locator(`${V} .nb-key.ok, ${V} .nb-key.bad`).count();
      const hud = await text(page);
      await page.keyboard.press('Escape');
      const back = await text(page);
      const ok = waiting === 2 && marked === 0 && hud.includes('3-back') && hud.includes('Trial 1 of 23') && back.includes('Time per trial') && back.includes('Start');
      return { ok, detail: `waiting=${waiting} marked=${marked} hud=${(hud.match(/Trial \d+ of \d+/) || [])[0]}` };
    }
  },

  /* ---------------------------------------------------------- schulte table */
  {
    name: 'schulte-table: 3×3 in order with one wrong click; time, mistakes and best time kept',
    tool: 'schulte-table',
    run: async page => {
      await page.evaluate(() => { for (let n = 3; n <= 7; n++) { localStorage.removeItem('att-brain-schulte-' + n + '-n'); localStorage.removeItem('att-brain-schulte-' + n + '-l'); } });
      await btn(page, '3×3');
      const before = Date.now();
      await btn(page, 'Start');
      const vals = await page.$$eval(`${V} .sch-cell`, cs => cs.map(c => c.dataset.v));
      const perm = vals.length === 9 && vals.slice().sort((a, b) => a - b).join(',') === '1,2,3,4,5,6,7,8,9';
      await page.click(`${V} .sch-cell[data-v="2"]`); /* looking for 1: a mistake */
      const find1 = await page.locator(`${V} .sch-find`).innerText();
      for (let k = 1; k <= 9; k++) await page.click(`${V} .sch-cell[data-v="${k}"]`);
      const wall = (Date.now() - before) / 1000;
      const secs = parseFloat(await page.locator(`${V} [data-k="time"]`).innerText());
      const mistakes = await page.locator(`${V} [data-k="mistakes"]`).textContent();
      const t = await text(page);
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('att-brain-schulte-3-n')));
      const best = await page.locator(`${V} [data-k="best-3-n"]`).innerText();
      const ok = perm && find1 === '1' && mistakes === '1' && secs > 0 && secs <= wall + 0.2 && t.includes('New personal best') &&
        stored.length === 1 && Math.abs(stored[0] - secs) < 0.001 && best === secs.toFixed(2) + ' s' && t.includes('Per cell');
      return { ok, detail: `perm=${perm} vals=${vals} secs=${secs} wall=${wall} mistakes=${mistakes} stored=${stored} best=${best}` };
    }
  },
  {
    name: 'schulte-table: letters mode stops at 5×5, 4×4 letters run A to P, 7×7 holds 1 to 49 with a fixation dot',
    tool: 'schulte-table',
    run: async page => {
      await btn(page, '7×7');
      await btn(page, 'Letters');
      const disabled = await page.$$eval(`${V} .chips .chip`, cs => cs.filter(c => c.disabled).map(c => c.textContent));
      const on5 = await page.locator(`${V} .chip.on`).first().innerText();
      await btn(page, '4×4');
      await btn(page, 'Start');
      const letters = await page.$$eval(`${V} .sch-cell`, cs => cs.map(c => c.dataset.v).sort().join(''));
      for (const ch of 'ABCDEFGHIJKLMNOP') await page.click(`${V} .sch-cell[data-v="${ch}"]`);
      const done = await page.$eval(`${V} .sch-grid`, g => g.dataset.state);
      const mistakes = await page.locator(`${V} [data-k="mistakes"]`).textContent();
      await btn(page, 'Settings');
      await btn(page, 'Numbers');
      await btn(page, '7×7');
      await page.locator(`${V} label.check`, { hasText: 'Fixation dot' }).locator('input').check();
      await btn(page, 'Start');
      const nums = await page.$$eval(`${V} .sch-cell`, cs => cs.map(c => Number(c.dataset.v)).sort((a, b) => a - b));
      const dot = await page.locator(`${V} .sch-fix`).count();
      const cols = await page.$eval(`${V} .sch-grid`, g => getComputedStyle(g).gridTemplateColumns.split(' ').length);
      await btn(page, 'Stop');
      const ok = disabled.join(',') === '6×6,7×7' && on5 === '5×5' && letters === 'ABCDEFGHIJKLMNOP' && done === 'done' && mistakes === '0' &&
        nums.length === 49 && nums.every((v, i) => v === i + 1) && dot === 1 && cols === 7;
      return { ok, detail: `disabled=${disabled} on=${on5} letters=${letters} done=${done} n=${nums.length} dot=${dot} cols=${cols}` };
    }
  },

  /* ----------------------------------------------------------- mental maths */
  {
    name: 'mental-maths: 10 additions, 8 right by keyboard and 2 wrong on the number pad, with a review of mistakes',
    tool: 'mental-maths',
    run: async page => {
      await btn(page, '+ Add');
      await page.selectOption(`${V} select >> nth=0`, '1');
      await page.selectOption(`${V} select >> nth=1`, '1');
      await btn(page, '10 questions');
      await page.locator(`${V} label.check`, { hasText: 'Accept the right answer' }).locator('input').uncheck();
      await btn(page, 'Start');
      const asked = [];
      for (let i = 0; i < 10; i++) {
        const q = await page.$eval(`${V} .mm-q`, n => ({ a: Number(n.dataset.a), b: Number(n.dataset.b), op: n.dataset.op, text: n.textContent }));
        const ans = q.a + q.b;
        asked.push({ ...q, ans });
        if (i < 8) { await page.keyboard.type(String(ans)); await page.keyboard.press('Enter'); }
        else {
          for (const ch of String(ans + 1)) await page.locator(`${V} .mm-pad`).getByRole('button', { name: ch, exact: true }).click();
          await page.locator(`${V} .mm-pad`).getByRole('button', { name: 'Enter', exact: true }).click();
        }
      }
      const sum = await page.$eval(`${V} [data-k="summary"]`, n => ({ ...n.dataset }));
      const mistakes = await page.$$eval(`${V} tr[data-k="mistake"]`, rs => rs.map(r => [...r.children].map(c => c.textContent)));
      const t = await text(page);
      const wantMistakes = asked.slice(8).map(q => [`${q.a} + ${q.b}`, String(q.ans + 1), String(q.ans)]);
      const inRange = asked.every(q => q.op === 'add' && q.a >= 1 && q.a <= 9 && q.b >= 1 && q.b <= 9 && q.text === `${q.a} + ${q.b} =`);
      const ok = inRange && sum.right === '8' && sum.wrong === '2' && sum.acc === '80' && sum.streak === '8' &&
        JSON.stringify(mistakes) === JSON.stringify(wantMistakes) && t.includes('8 correct') && t.includes('10 questions in');
      return { ok, detail: `sum=${JSON.stringify(sum)} mistakes=${JSON.stringify(mistakes)} want=${JSON.stringify(wantMistakes)} inRange=${inRange}` };
    }
  },
  {
    name: 'mental-maths: 7 times table and exact division, typed answers accepted without Enter, countdown and End round',
    tool: 'mental-maths',
    run: async page => {
      await btn(page, '× Multiply');
      await page.locator(`${V} label.check`, { hasText: 'Use times tables' }).locator('input').check();
      for (const tb of ['2×', '3×', '4×', '5×', '6×', '8×', '9×', '10×', '11×', '12×']) await btn(page, tb);
      await btn(page, 'Start');
      const left0 = await page.$eval(`${V} [data-left]`, n => n.dataset.left);
      const mul = [];
      for (let i = 0; i < 12; i++) {
        const q = await page.$eval(`${V} .mm-q`, n => ({ a: Number(n.dataset.a), b: Number(n.dataset.b), op: n.dataset.op }));
        mul.push(q);
        await page.keyboard.type(String(q.a * q.b));
      }
      const score = await page.locator(`${V} .hud b >> nth=1`).innerText();
      await btn(page, 'End round');
      const r1 = await page.$eval(`${V} [data-k="summary"]`, n => ({ ...n.dataset }));
      await btn(page, 'Settings');
      await btn(page, '÷ Divide');
      await page.locator(`${V} label.check`, { hasText: 'Use times tables' }).locator('input').uncheck();
      await page.selectOption(`${V} select >> nth=0`, '2');
      await page.selectOption(`${V} select >> nth=1`, '1');
      await btn(page, 'Start');
      const div = [];
      for (let i = 0; i < 12; i++) {
        const q = await page.$eval(`${V} .mm-q`, n => ({ a: Number(n.dataset.a), b: Number(n.dataset.b), op: n.dataset.op }));
        div.push(q);
        await page.keyboard.type(String(q.a / q.b));
      }
      await page.waitForTimeout(1100);
      const left1 = Number(await page.$eval(`${V} [data-left]`, n => n.dataset.left));
      await page.keyboard.press('Escape');
      const r2 = await page.$eval(`${V} [data-k="summary"]`, n => ({ ...n.dataset }));
      const mulOk = mul.every(q => q.op === 'mul' && ((q.a === 7 && q.b >= 1 && q.b <= 12) || (q.b === 7 && q.a >= 1 && q.a <= 12)));
      /* 2-digit answers, 1-digit divisors from 2 to 9, always exact */
      const divOk = div.every(q => q.op === 'div' && q.b >= 2 && q.b <= 9 && q.a % q.b === 0 && q.a / q.b >= 10 && q.a / q.b <= 99);
      const ok = left0 === '60' && mulOk && score === '12' && r1.right === '12' && r1.wrong === '0' && divOk && r2.right === '12' && left1 < 60 && left1 > 40;
      return { ok, detail: `left0=${left0} left1=${left1} mulOk=${mulOk} divOk=${divOk} score=${score} r1=${JSON.stringify(r1)} r2=${JSON.stringify(r2)} sample=${JSON.stringify(mul.slice(0, 3))} ${JSON.stringify(div.slice(0, 3))}` };
    }
  }
];
