/* Behaviour checks for Minesweeper, 2048 and Daily Word Guess. */
'use strict';

function result(ok, detail) { return { ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) }; }
async function fresh(page, keys) {
  await page.evaluate(ks => ks.forEach(k => localStorage.removeItem('att:' + k)), keys);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
}

module.exports = [
  {
    name: 'Minesweeper: the first click is safe and opens an area',
    tool: 'minesweeper',
    run: async page => {
      await fresh(page, ['minesweeper-level', 'minesweeper-best']);
      /* expert has the densest board, so try its corner and middle a few times */
      const outcomes = [];
      for (let n = 0; n < 6; n++) {
        await page.click('#view .chip:has-text("Expert")');
        await page.click('#view .btn:has-text("New game")');
        await page.click('#view .ms-cell[data-i="' + (n % 2 ? 0 : 239) + '"]');
        outcomes.push(await page.evaluate(() => ({
          boom: !!document.querySelector('#view .ms-cell.boom'),
          open: document.querySelectorAll('#view .ms-cell.open').length
        })));
      }
      const ok = outcomes.every(o => !o.boom && o.open >= 1) && outcomes.some(o => o.open > 1);
      return result(ok, outcomes);
    }
  },
  {
    name: '2048: a row of 2 2 2 2 slides to 4 4, and 4 4 8 0 to 8 8',
    tool: 'game-2048',
    run: async page => {
      const got = await page.evaluate(() => {
        const s = window.GamesBKit.tzSlide;
        return [s([2, 2, 2, 2]), s([4, 4, 8, 0]), s([0, 2, 0, 2])].map(r => r.line.join(' ') + ' +' + r.score);
      });
      return result(got.join(' | ') === '4 4 0 0 +8 | 8 8 0 0 +8 | 4 0 0 0 +4', got);
    }
  },
  {
    name: '2048: an arrow key on the focused board moves the tiles and scores merges',
    tool: 'game-2048',
    run: async page => {
      await page.evaluate(() => localStorage.setItem('att:2048-game', JSON.stringify({
        n: 4, score: 0, won: false, keepGoing: false, over: false,
        grid: [[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]] })));
      await page.reload({ waitUntil: 'load' });
      await page.waitForTimeout(200);
      await page.focus('#view .tz-board');
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(250);
      const st = await page.evaluate(() => JSON.parse(localStorage.getItem('att:2048-game')));
      const tiles = st.grid.flat().filter(Boolean).sort((a, b) => a - b);
      return result(st.score === 4 && st.grid[0][3] === 4 && tiles.length === 2, st);
    }
  },
  {
    name: 'Word Guess: repeated letters are only marked as often as the answer has them',
    tool: 'word-guess',
    run: async page => {
      const got = await page.evaluate(() => {
        const s = window.GamesBKit.wgScore;
        return [s('speed', 'abide'), s('eerie', 'there'), s('allee', 'eagle')].map(r => r.map(x => x[0]).join(''));
      });
      /* speed/abide: the first e and the d are present, the second e is not.
         eerie/there: first e present, r present, final e correct, middle e absent.
         allee/eagle: a and the first l present, second l absent, e present, final e correct. */
      return result(got.join(' ') === 'aapap papac ppapc', got);
    }
  },
  {
    name: 'Word Guess: typing a guess on the keyboard colours the row and rejects non-words',
    tool: 'word-guess',
    run: async page => {
      await fresh(page, ['wordguess-daily', 'wordguess-practice', 'wordguess-opts', 'wordguess-stats-daily']);
      await page.waitForTimeout(600);
      await page.keyboard.type('qqqqq');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);
      const rejected = (await page.textContent('#view .gb-msg[role=status]')).includes('Not in the word list');
      for (let i = 0; i < 5; i++) await page.keyboard.press('Backspace');
      await page.keyboard.type('crane');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(900);
      const row = await page.evaluate(() => [...document.querySelectorAll('#view .wg-row')[0].children].map(t => t.className.replace(/wg-tile|flip/g, '').trim()));
      const scored = row.every(c => ['correct', 'present', 'absent'].includes(c));
      return result(rejected && scored, { rejected, row });
    }
  }
];
