/* Behaviour checks for Chart Maker. Expected counts come from the sample data
   (6 months x 3 channels), worked out by hand. */
'use strict';

const fs = require('fs');

const ok = (cond, detail) => ({ ok: !!cond, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const chip = (page, label) => page.locator('#view .chip', { hasText: new RegExp('^' + label + '$') }).first().click();
const count = (page, sel) => page.$$eval('#view [data-k="chart"] svg ' + sel, n => n.length);

module.exports = [
  {
    name: 'Chart Maker: sample draws one bar per cell, and a six-slice pie',
    tool: 'chart-maker',
    run: async page => {
      await page.waitForTimeout(300);
      const bars = await count(page, 'rect[fill]:not([width="100%"])');
      const legend = await page.$$eval('#view [data-k="chart"] svg text', t => t.map(x => x.textContent));
      await chip(page, 'Pie');
      await page.waitForTimeout(300);
      const slices = await count(page, 'path');
      /* 18 data bars plus 3 legend swatches. */
      return ok(bars === 21 && slices === 6 && legend.includes('In store'), { bars, slices });
    }
  },
  {
    name: 'Chart Maker: CSV edits redraw, text columns are refused, SVG downloads',
    tool: 'chart-maker',
    run: async page => {
      await page.fill('#view [data-k="csv"]', 'Name;Score;Note\nA;1,5;x\nB;(2);y\nC;3;z');
      await page.waitForTimeout(400);
      const disabled = await page.$$eval('#view .cm-ser input[type=checkbox]', b => b.map(x => x.disabled));
      const bars = await count(page, 'rect[fill]:not([width="100%"])');
      const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download SVG', exact: true }).click()]);
      const svg = fs.readFileSync(await dl.path(), 'utf8');
      /* "1,5" with ; as the delimiter reads as 15, "(2)" as -2. */
      const neg = svg.includes('B: -2') && svg.includes('A: 15');
      return ok(disabled.join() === 'false,true' && bars === 3 && neg && svg.startsWith('<?xml'), { disabled, bars, neg });
    }
  }
];
