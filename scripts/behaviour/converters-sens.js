/* Behaviour checks for the Game Sensitivity Converter in converters-b.js.
   Overwatch 2 turns 0.0066° per count, Valorant 0.07° and CS2 0.022°, so
   5 in Overwatch 2 is 0.4714 in Valorant and 1.5 in CS2; at 800 DPI that is
   360 / (0.033 × 800) = 13.636 in = 34.636 cm per 360°. */
'use strict';

const V = '#view ';
function res(ok, detail) { return { ok: !!ok, detail: String(detail).slice(0, 240) }; }

module.exports = [
  {
    name: 'sensitivity-converter: Overwatch 2 5.0 at 800 DPI = Valorant 0.4714 = CS2 1.5, 34.64 cm/360',
    tool: 'sensitivity-converter',
    run: async (page) => {
      await page.selectOption(V + 'select[data-role="from"]', 'ow2');
      await page.selectOption(V + 'select[data-role="to"]', 'valorant');
      await page.fill(V + 'input[data-role="sens"]', '5');
      await page.fill(V + 'input[data-role="dpi"]', '800');
      await page.fill(V + 'input[data-role="new-dpi"]', '');
      await page.waitForTimeout(300);
      const val = (await page.textContent(V + '[data-k="converted"]')).trim();
      const cs = (await page.textContent(V + 'tr[data-game="cs2"] td.v')).trim();
      const text = await page.innerText(V + '[data-k="result"]');
      return res(val === '0.4714' && cs === '1.5' && /34\.636 cm|34\.64 cm|13\.636 in/.test(text), [val, cs, text.replace(/\s+/g, ' ')].join(' | '));
    }
  },
  {
    name: 'sensitivity-converter: doubling the DPI halves the sensitivity (CS2 2 at 400 → 1 at 800)',
    tool: 'sensitivity-converter',
    run: async (page) => {
      await page.selectOption(V + 'select[data-role="from"]', 'cs2');
      await page.selectOption(V + 'select[data-role="to"]', 'cs2');
      await page.fill(V + 'input[data-role="sens"]', '2');
      await page.fill(V + 'input[data-role="dpi"]', '400');
      await page.fill(V + 'input[data-role="new-dpi"]', '800');
      await page.waitForTimeout(300);
      const val = (await page.textContent(V + '[data-k="converted"]')).trim();
      return res(val === '1', val);
    }
  }
];
