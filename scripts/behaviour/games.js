/* Behaviour checks for the games tools (deck of cards, sudoku, word search,
   crossword, charades, initiative tracker, fantasy names). Expected values
   are worked out by hand or checked with independent solvers written here. */
'use strict';

const fs = require('fs');

function result(ok, detail) { return { ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) }; }
async function fresh(page, keys) {
  await page.evaluate(ks => ks.forEach(k => localStorage.removeItem('att:' + k)), keys);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
}
async function setField(page, label, value) {
  const ok = await page.evaluate(([label, value]) => {
    const f = [...document.querySelectorAll('#view .field')].find(x => { const l = x.querySelector(':scope > label'); return l && l.textContent.trim() === label && x.offsetParent !== null; });
    if (!f) return false;
    const c = f.querySelector('input, select, textarea');
    c.value = value;
    c.dispatchEvent(new Event('input', { bubbles: true }));
    c.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, [label, String(value)]);
  if (!ok) throw new Error('No field labelled ' + label);
  await page.waitForTimeout(150);
}
async function setAria(page, aria, value) {
  const ok = await page.evaluate(([aria, value]) => {
    const c = document.querySelector('#view [aria-label="' + aria + '"]');
    if (!c) return false;
    c.value = value;
    c.dispatchEvent(new Event('input', { bubbles: true }));
    c.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, [aria, String(value)]);
  if (!ok) throw new Error('No control labelled ' + aria);
  await page.waitForTimeout(120);
}
async function click(page, text, nth) {
  const ok = await page.evaluate(([text, nth]) => {
    const els = [...document.querySelectorAll('#view button, #view .chip')].filter(b => b.textContent.trim() === text && b.offsetParent !== null);
    const b = els[nth || 0];
    if (!b) return false;
    b.click();
    return true;
  }, [text, nth || 0]);
  if (!ok) throw new Error('No visible button "' + text + '"');
  await page.waitForTimeout(120);
}
async function check(page, label, on) {
  await page.evaluate(([label, on]) => {
    const box = [...document.querySelectorAll('#view label.check')].find(l => l.textContent.trim() === label);
    const i = box.querySelector('input');
    if (i.checked !== on) i.click();
  }, [label, on]);
  await page.waitForTimeout(120);
}
async function download(page, fn) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), fn()]);
  return { name: dl.suggestedFilename(), buf: fs.readFileSync(await dl.path()) };
}
const k = (page, key) => page.$eval('#view [data-k="' + key + '"]', n => n.textContent.trim());

/* An independent sudoku solution counter (plain backtracking). */
function countSolutions(s, limit) {
  const g = s.split('').map(Number);
  let n = 0;
  const ok = (i, d) => {
    const r = Math.floor(i / 9), c = i % 9, br = r - r % 3, bc = c - c % 3;
    for (let k = 0; k < 9; k++) {
      if (g[r * 9 + k] === d || g[k * 9 + c] === d || g[(br + Math.floor(k / 3)) * 9 + bc + k % 3] === d) return false;
    }
    return true;
  };
  (function rec() {
    const i = g.indexOf(0);
    if (i < 0) { n++; return; }
    for (let d = 1; d <= 9 && n < limit; d++) if (ok(i, d)) { g[i] = d; rec(); g[i] = 0; }
  })();
  return n;
}
/* From Wikipedia's "Sudoku" article: the example puzzle and its solution. */
const WIKI = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const WIKI_SOLUTION = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

module.exports = [

  /* ================= Deck of cards ================= */

  { name: 'deck of cards: 52 unique cards, draw and discard, deal 4 × 13 uses the whole deck, jokers and several decks', tool: 'deck-of-cards', run: async page => {
    await fresh(page, ['deck']);
    const r0 = await k(page, 'dc-remaining');
    await setField(page, 'Cards to draw', '5');
    await click(page, 'Draw cards');
    const r1 = await k(page, 'dc-remaining');
    const drawn = await page.$$eval('#view [data-k="dc-drawn"] .dc-card', c => c.map(x => x.dataset.card));
    await page.click('#view [data-k="dc-drawn"] .dc-card');
    await page.waitForTimeout(100);
    const disc = await k(page, 'dc-discard');
    await click(page, 'Reset all');
    await setField(page, 'Hands', '4');
    await setField(page, 'Cards each', '13');
    await click(page, 'Deal hands');
    const r2 = await k(page, 'dc-remaining');
    const hands = await page.$$eval('#view .dc-hand', h => h.map(x => [...x.querySelectorAll('.dc-card')].map(c => c.dataset.card)));
    const all = hands.flat();
    const full = [];
    for (const s of 'SHDC') for (const r of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']) full.push(r + s);
    await check(page, 'Include jokers', true);
    const r3 = await k(page, 'dc-remaining');
    await setField(page, 'Decks', '2');
    const r4 = await k(page, 'dc-remaining');
    await check(page, 'Include jokers', false);
    const r5 = await k(page, 'dc-remaining');
    const valid = /^(A|[2-9]|10|J|Q|K)[SHDC]$/;
    return result(r0 === '52' && r1 === '47' && drawn.length === 5 && new Set(drawn).size === 5 && drawn.every(c => valid.test(c)) && disc === '1' &&
      r2 === '0' && hands.length === 4 && hands.every(h => h.length === 13) && all.slice().sort().join() === full.slice().sort().join() &&
      r3 === '54' && r4 === '108' && r5 === '104', { r0, r1, drawn, disc, r2, sizes: hands.map(h => h.length), r3, r4, r5 });
  } },

  /* ================= Sudoku ================= */

  { name: 'sudoku: solves the Wikipedia example to its published solution, then plays it with conflicts, hints and checks', tool: 'sudoku', run: async page => {
    await fresh(page, ['sudoku']);
    await page.waitForFunction(() => document.querySelector('#view .sd-grid').dataset.puzzle, null, { timeout: 20000 });
    await click(page, 'Enter your own puzzle');
    await page.fill('#view input[aria-label="Puzzle as 81 digits"]', WIKI.replace(/0/g, '.'));
    await page.waitForTimeout(150);
    await click(page, 'Solve it');
    const solved = await page.$eval('#view .sd-grid', g => g.dataset.values);
    const msg1 = await k(page, 'sd-enter-msg');
    await click(page, 'Play this puzzle');
    const info = await k(page, 'sd-info');
    await page.click('#view .sd-cell[data-i="2"]');
    await page.keyboard.press('5');   /* row 1 already has a 5 in column 1 */
    await page.waitForTimeout(100);
    const conflict = await page.$$eval('#view .sd-cell.conflict', c => c.map(x => x.dataset.i).sort());
    await page.keyboard.press('Backspace');
    await click(page, 'Hint');
    const hint = await k(page, 'sd-msg');
    const hinted = await page.$eval('#view .sd-cell.hinted', c => [+c.dataset.i, +c.dataset.v]);
    await click(page, 'Check');
    const checked = await k(page, 'sd-msg');
    return result(solved === WIKI_SOLUTION && /exactly one solution/.test(msg1) && /^Your puzzle/.test(info) && conflict.join() === '0,2' &&
      /fits|can only go/.test(hint) && +WIKI_SOLUTION[hinted[0]] === hinted[1] && /So far so good/.test(checked), { solved, msg1, info, conflict, hint, hinted, checked });
  } },
  { name: 'sudoku: a puzzle with a swappable rectangle has two solutions and is refused for play', tool: 'sudoku', run: async page => {
    /* Blank four cells a/b/b/a in two rows of one band: swapping a and b
       gives a second valid grid, so exactly two solutions. */
    const s = WIKI_SOLUTION.split('').map(Number);
    let blanks = null;
    for (let r1 = 0; r1 < 9 && !blanks; r1++) for (let r2 = r1 + 1; r2 < 9 && !blanks; r2++) {
      if (Math.floor(r1 / 3) !== Math.floor(r2 / 3)) continue;
      for (let c1 = 0; c1 < 9 && !blanks; c1++) for (let c2 = c1 + 1; c2 < 9 && !blanks; c2++) {
        if (s[r1 * 9 + c1] === s[r2 * 9 + c2] && s[r1 * 9 + c2] === s[r2 * 9 + c1]) blanks = [r1 * 9 + c1, r1 * 9 + c2, r2 * 9 + c1, r2 * 9 + c2];
      }
    }
    const puzzle = s.map((v, i) => blanks.includes(i) ? 0 : v).join('');
    const independent = countSolutions(puzzle, 5);
    await page.waitForFunction(() => document.querySelector('#view .sd-grid').dataset.puzzle, null, { timeout: 20000 });
    await click(page, 'Enter your own puzzle');
    await page.fill('#view input[aria-label="Puzzle as 81 digits"]', puzzle);
    await page.waitForTimeout(150);
    await click(page, 'Solve it');
    const m1 = await k(page, 'sd-enter-msg');
    await click(page, 'Play this puzzle');
    const m2 = await k(page, 'sd-enter-msg');
    await page.fill('#view input[aria-label="Puzzle as 81 digits"]', '5'.repeat(2) + '0'.repeat(79));
    await page.waitForTimeout(150);
    await click(page, 'Solve it');
    const m3 = await k(page, 'sd-enter-msg');
    return result(independent === 2 && /more than one solution/.test(m1) && /more than one solution/.test(m2) && /clash/.test(m3), { blanks, independent, m1, m2, m3 });
  } },
  { name: 'sudoku: generated medium and expert puzzles have exactly one solution (independent solver) and grade as asked', tool: 'sudoku', run: async page => {
    const out = {};
    for (const diff of ['Medium', 'Expert']) {
      await click(page, diff);
      const before = await page.$eval('#view .sd-grid', g => g.dataset.puzzle || '');
      await click(page, 'New puzzle');
      await page.waitForFunction(([b, d]) => { const g = document.querySelector('#view .sd-grid'); return g.dataset.puzzle && g.dataset.puzzle !== b && /New/.test(document.querySelector('#view [data-k="sd-msg"]').textContent) && document.querySelector('#view [data-k="sd-msg"]').textContent.includes(d); }, [before, diff.toLowerCase()], { timeout: 30000 });
      const p = await page.$eval('#view .sd-grid', g => ({ puzzle: g.dataset.puzzle, level: g.dataset.level }));
      out[diff] = { clues: p.puzzle.replace(/0/g, '').length, level: p.level, solutions: countSolutions(p.puzzle, 2) };
    }
    return result(out.Medium.solutions === 1 && out.Medium.level === '2' && out.Medium.clues >= 26 && out.Expert.solutions === 1 && out.Expert.level === '4' && out.Expert.clues >= 17, out);
  } },

  /* ================= Word search ================= */

  { name: 'word search: horizontal-only placement readable in the grid, too-long words reported, drag to find, printable pages', tool: 'word-search-maker', run: async page => {
    await fresh(page, ['wordsearch']);
    await setField(page, 'Words, one per line or separated by commas', 'Apple\nBanana\nCherry\nDamson\nElderberry\nSupercalifragilistic');
    await setField(page, 'Rows', '10');
    await setField(page, 'Columns', '10');
    await check(page, 'Horizontal', true); await check(page, 'Vertical', false); await check(page, 'Diagonal', false); await check(page, 'Backwards', false);
    await click(page, 'Make word search');
    const data = await page.$eval('#view [data-k="ws-grid"]', g => ({ placed: JSON.parse(g.dataset.placed), missing: JSON.parse(g.dataset.missing), letters: [...g.children].map(s => s.textContent) }));
    const grid = []; for (let r = 0; r < 10; r++) grid.push(data.letters.slice(r * 10, r * 10 + 10).join(''));
    /* each word must be readable left to right somewhere in its row */
    const readable = data.placed.every(p => p.dr === 0 && p.dc === 1 && grid[p.r].slice(p.c, p.c + p.word.length) === p.word);
    const everyFound = ['APPLE', 'BANANA', 'CHERRY', 'DAMSON', 'ELDERBERRY'].every(w => grid.some(row => row.includes(w)));
    const p0 = data.placed[0];
    await page.locator('#view [data-k="ws-grid"]').scrollIntoViewIfNeeded();
    const a = await page.locator(`#view [data-k="ws-grid"] span[data-r="${p0.r}"][data-c="${p0.c}"]`).boundingBox();
    const b = await page.locator(`#view [data-k="ws-grid"] span[data-r="${p0.r}"][data-c="${p0.c + p0.word.length - 1}"]`).boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    const found = await k(page, 'ws-found');
    await page.evaluate(() => { window.print = () => { const h = document.getElementById('g-games-print'); window.__printed = { pages: h.querySelectorAll('.pg').length, cells: h.querySelectorAll('.pg:first-child td').length, key: h.querySelectorAll('td.on').length }; }; });
    await click(page, 'Print with answer key');
    const printed = await page.evaluate(() => window.__printed);
    const keyCells = new Set(data.placed.flatMap(p => [...Array(p.word.length).keys()].map(i => p.r + ',' + (p.c + i)))).size;
    return result(data.missing.join() === 'Supercalifragilistic' && data.placed.length === 5 && readable && everyFound && found === '1 of 5 found' &&
      printed.pages === 2 && printed.cells === 100 && printed.key === keyCells, { missing: data.missing, placed: data.placed.length, readable, everyFound, found, printed, keyCells });
  } },

  /* ================= Crossword ================= */

  { name: 'crossword: CROSS and WORD make a 5×4 grid with one crossing, 1 Down and 2 Across', tool: 'crossword-maker', run: async page => {
    await fresh(page, ['crossword']);
    await setField(page, 'Words and clues, one per line: word: clue', 'CROSS: Angry\nWORD: Promise');
    await click(page, 'Make crossword');
    const lay = await page.$eval('#view .cw-scroll', w => JSON.parse(w.dataset.layout));
    const byNum = lay.words.map(w => w.num + ' ' + w.dir + ' ' + w.answer).sort();
    return result(lay.crossings === 1 && lay.rows * lay.cols === 20 && byNum.join() === '1 down WORD,2 across CROSS', lay);
  } },
  { name: 'crossword: default list links every word, numbering follows reading order, letters agree; typing and reveal solve it', tool: 'crossword-maker', run: async page => {
    await fresh(page, ['crossword']);
    const lay = await page.$eval('#view .cw-scroll', w => JSON.parse(w.dataset.layout));
    const grid = {}, owners = {};
    let clash = false;
    lay.words.forEach((w, i) => { for (let j = 0; j < w.answer.length; j++) {
      const key = (w.row + (w.dir === 'down' ? j : 0)) + ',' + (w.col + (w.dir === 'down' ? 0 : j));
      if (grid[key] && grid[key] !== w.answer[j]) clash = true;
      grid[key] = w.answer[j]; (owners[key] = owners[key] || []).push(i);
    } });
    const crossesAll = lay.words.every((w, i) => Object.values(owners).some(o => o.length > 1 && o.includes(i)));
    const starts = [...new Set(lay.words.map(w => w.row * 1000 + w.col))].sort((a, b) => a - b);
    const numbering = lay.words.every(w => w.num === starts.indexOf(w.row * 1000 + w.col) + 1);
    const enumeration = await page.$eval('#view .cw-clues', c => c.textContent.includes('The UK\'s highest peak (3,5)'));
    const down1 = lay.words.find(w => w.num === 1 && w.dir === 'down') || lay.words.find(w => w.dir === 'down');
    await page.click(`#view .cw-clues li[data-num="${down1.num}"][data-dir="down"]`);
    await page.keyboard.type(down1.answer.toLowerCase(), { delay: 20 });
    const typed = await page.evaluate(w => [...Array(w.answer.length).keys()].map(j => document.querySelector(`#view .cw-cell input[data-r="${w.row + j}"][data-c="${w.col}"]`).value).join(''), down1);
    await click(page, 'Reveal all');
    const msg = await k(page, 'cw-msg');
    return result(lay.skipped.length === 0 && lay.words.length === 10 && !clash && crossesAll && numbering && enumeration && typed === down1.answer && /Solved/.test(msg),
      { skipped: lay.skipped, n: lay.words.length, clash, crossesAll, numbering, enumeration, typed, want: down1.answer, msg });
  } },

  /* ================= Charades ================= */

  { name: 'charades: category and difficulty filters, family-friendly filter, scoring and a 30-second turn timer', tool: 'charades-words', run: async page => {
    await fresh(page, ['charades']);
    for (const c of ['Films', 'Books', 'TV shows', 'Songs', 'Actions', 'Objects', 'Famous people', 'Phrases']) await check(page, c, false);
    await click(page, 'Easy');
    let good = true;
    for (let i = 0; i < 15; i++) {
      await click(page, 'New word');
      const w = await page.$eval('#view [data-k="ch-word"]', n => [n.dataset.category, n.dataset.diff]);
      if (w[0] !== 'animals' || w[1] !== 'e') good = false;
    }
    await check(page, 'Animals', false); await check(page, 'Films', true); await click(page, 'Any');
    const famOn = +(await page.$eval('#view [data-k="ch-pool"]', n => n.dataset.n));
    const drawnFilms = [];
    for (let i = 0; i < famOn; i++) { await page.click('#view button:text-is("New word")'); drawnFilms.push(await k(page, 'ch-word')); }
    const adult = ['Trainspotting', 'Pulp Fiction', 'Shaun of the Dead', 'Hot Fuzz', 'The Wolf of Wall Street', 'A Clockwork Orange'];
    const leaked = drawnFilms.filter(w => adult.includes(w));
    await check(page, 'Family-friendly only', false);
    const famOff = +(await page.$eval('#view [data-k="ch-pool"]', n => n.dataset.n));
    await page.clock.install();
    await click(page, '30 s');
    await click(page, 'Start turn');
    for (let i = 0; i < 3; i++) await click(page, '✓ Correct');
    await click(page, 'Skip');
    const score = await k(page, 'ch-score-1');
    await page.clock.runFor(31000);
    await page.waitForTimeout(100);
    const turn = await k(page, 'ch-turn');
    const team = await k(page, 'ch-team');
    return result(good && famOn > 20 && !leaked.length && new Set(drawnFilms).size === famOn && famOff > famOn && score === '3' &&
      /Time’s up! Team 1 got 3 points, skipped 1/.test(turn) && /^Team 2/.test(team), { good, famOn, famOff, leaked, score, turn, team });
  } },

  /* ================= Initiative tracker ================= */

  { name: 'initiative: tie-breaks, rounds, timed conditions, temp HP, concentration DC, death saves, previous turn, bulk add', tool: 'initiative-tracker', run: async page => {
    await fresh(page, ['initiative']);
    const add = async (name, side, bonus, init, hp) => {
      await setField(page, 'Name', name); await setField(page, 'Side', side); await setField(page, 'Initiative bonus', bonus);
      await setField(page, 'Initiative (blank to roll)', init); await setField(page, 'HP', hp);
      await click(page, 'Add');
    };
    await add('Cave troll', 'monster', 0, 18, 30);
    await add('Archer', 'monster', 2, 15, 12);
    await add('Bree', 'player', 3, 15, 20);
    const order = await page.$eval('#view .it-list', l => JSON.parse(l.dataset.order));
    const inRow = (name, fn) => page.evaluate(([name, fn]) => new Function('row', fn)([...document.querySelectorAll('#view .it-row')].find(r => r.dataset.name === name)), [name, fn]);
    const pills = name => inRow(name, 'return [...row.querySelectorAll(".it-pill")].map(p => p.textContent.replace("×", "")).join("|")');
    await click(page, 'Start combat');
    await setAria(page, 'Condition for Cave troll', 'Poisoned');
    await setAria(page, 'Condition rounds for Cave troll', '2');
    await inRow('Cave troll', 'return [...row.querySelectorAll("button")].find(b => b.textContent === "Add condition").click()');
    await page.waitForTimeout(100);
    for (let i = 0; i < 3; i++) await click(page, 'Next turn');
    const r2 = [await k(page, 'it-round'), await pills('Cave troll')];
    for (let i = 0; i < 3; i++) await click(page, 'Next turn');
    const r3 = [await k(page, 'it-round'), await pills('Cave troll'), await k(page, 'it-alerts')];
    await click(page, 'Previous');
    const back = [await k(page, 'it-round'), await k(page, 'it-turn')];
    /* temp HP soaks damage first: 20 HP + 5 temp, 8 damage → 17 HP, no temp */
    await setAria(page, 'Amount for Bree', '5'); await page.click('#view button[aria-label="Set temp HP for Bree"]');
    await setAria(page, 'Amount for Bree', '8'); await page.click('#view button[aria-label="Damage Bree"]');
    await page.waitForTimeout(100);
    const bree = await pills('Bree');
    /* concentration: DC is the higher of 10 and half the damage: 25 → 12 */
    await inRow('Archer', 'return [...row.querySelectorAll("button")].find(b => b.textContent === "Concentrating").click()');
    await page.waitForTimeout(100);
    await setAria(page, 'Amount for Archer', '25'); await page.click('#view button[aria-label="Damage Archer"]');
    await page.waitForTimeout(100);
    const alerts = await k(page, 'it-alerts');
    const archer = await pills('Archer');
    await setAria(page, 'Amount for Bree', '17'); await page.click('#view button[aria-label="Damage Bree"]');
    await setAria(page, 'Amount for Bree', '1'); await page.click('#view button[aria-label="Damage Bree"]');
    await page.waitForTimeout(100);
    const dying = [await pills('Bree'), await page.$eval('#view input[aria-label="Failures 1 for Bree"]', b => b.checked)];
    await setAria(page, 'Amount for Bree', '5'); await page.click('#view button[aria-label="Heal Bree"]');
    await page.waitForTimeout(100);
    const healed = [await pills('Bree'), await page.$$eval('#view input[aria-label^="Failures"]', b => b.length)];
    await setField(page, 'Name', 'Goblin ×4'); await setField(page, 'Side', 'monster'); await setField(page, 'Initiative bonus', '1');
    await setField(page, 'Initiative (blank to roll)', ''); await setField(page, 'HP', '7');
    await click(page, 'Add');
    const goblins = await page.$$eval('#view .it-row', r => r.filter(x => /^Goblin/.test(x.dataset.name)).map(x => [x.dataset.name, +x.querySelector('.it-init input').value]));
    let rollsOk = true;
    for (let i = 0; i < 12; i++) {
      await click(page, 'Roll everyone');
      const v = +(await page.$eval('#view input[aria-label="Initiative for Archer"]', x => x.value));
      if (!(v >= 3 && v <= 22)) rollsOk = false;
    }
    return result(order.join() === 'Cave troll,Bree,Archer' && r2[0] === 'Round 2' && /Poisoned \(1\)/.test(r2[1]) && r3[0] === 'Round 3' && !/Poisoned/.test(r3[1]) && /Poisoned ended on Cave troll/.test(r3[2]) &&
      back[0] === 'Round 2' && /^Archer’s turn/.test(back[1]) && /HP 17\/20(?! \+)/.test(bree) && /DC 12/.test(alerts) && /Defeated/.test(archer) &&
      /HP 0\/20/.test(dying[0]) && /Dying/.test(dying[0]) && dying[1] && /HP 5\/20/.test(healed[0]) && healed[1] === 0 &&
      goblins.map(g => g[0]).sort().join() === 'Goblin 1,Goblin 2,Goblin 3,Goblin 4' && goblins.every(g => g[1] >= 2 && g[1] <= 21) && rollsOk,
    { order, r2, r3, back, bree, alerts, archer, dying, healed, goblins, rollsOk });
  } },
  { name: 'initiative: encounter autosaves and exports to JSON', tool: 'initiative-tracker', run: async page => {
    await fresh(page, ['initiative']);
    await setField(page, 'Name', 'Owlbear'); await setField(page, 'HP', '59'); await click(page, 'Add');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(300);
    const names = await page.$$eval('#view .it-row', r => r.map(x => x.dataset.name));
    const exp = await download(page, () => click(page, 'Export JSON'));
    const doc = JSON.parse(exp.buf.toString());
    return result(names.join() === 'Owlbear' && doc.current.list.length === 1 && doc.current.list[0].maxHp === 59, { names, list: doc.current.list.length });
  } },

  /* ================= Fantasy names ================= */

  { name: 'fantasy names: counts, clan names, Norse patronymics by gender, seeds repeat, taverns, favourites persist', tool: 'fantasy-name-generator', run: async page => {
    await fresh(page, ['fantasy-names', 'fantasy-favs']);
    const list = () => page.$$eval('#view [data-k="fn-list"] .v', v => v.map(x => x.textContent));
    await setField(page, 'What to name', 'dwarf');
    await setField(page, 'How many', '25');
    const dwarves = await list();
    await setField(page, 'What to name', 'norse');
    await click(page, 'Feminine');
    const women = await list();
    await click(page, 'Masculine');
    const men = await list();
    await setField(page, 'Seed (optional)', 'dragon');
    const s1 = await list();
    await click(page, 'Generate');
    const s2 = await list();
    await setField(page, 'Seed (optional)', 'wyvern');
    const s3 = await list();
    await setField(page, 'Seed (optional)', '');
    await setField(page, 'What to name', 'tavern');
    const taverns = await list();
    await page.click('#view [data-k="fn-list"] .fn-star');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(300);
    const favs = await page.$$eval('#view [data-k="fn-favs"] .v', v => v.map(x => x.textContent));
    return result(dwarves.length === 25 && new Set(dwarves).size === 25 && dwarves.every(n => /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(n)) &&
      women.every(n => / [A-Z][a-z]+sdottir$/.test(n)) && men.every(n => / [A-Z][a-z]+sson$/.test(n)) &&
      s1.join() === s2.join() && s1.join() !== s3.join() && taverns.every(n => /^The /.test(n)) && favs.join() === taverns[0],
    { dwarves: dwarves.slice(0, 3), women: women.slice(0, 2), men: men.slice(0, 2), s1: s1.slice(0, 2), s3: s3.slice(0, 2), taverns: taverns.slice(0, 3), favs });
  } }
];
