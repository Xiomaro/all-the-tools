/* Behaviour checks for the tabletop RPG pack in games-c.js. Expected encounter
   values come from the XP tables in SRD 5.1 (2014 thresholds and monster
   multipliers) and SRD 5.2 (2024 XP budgets). */
'use strict';

function res(ok, detail) { return { ok: !!ok, detail: String(detail).slice(0, 240) }; }

module.exports = [
  {
    name: 'encounter-calculator: 4 × level 3 v 4 goblins + 1 hobgoblin is Medium under 2014 (300 XP × 2 = 600) and Below Low under 2024 (budget 600)',
    tool: 'encounter-calculator',
    run: async (page) => {
      const got = await page.evaluate(() => {
        const K = window.GamesCKit;
        const party = [{ count: 4, level: 3 }];
        const mons = [{ cr: '1/4', count: 4 }, { cr: '1/2', count: 1 }];
        const a = K.evaluateEncounter('2014', party, mons), b = K.evaluateEncounter('2024', party, mons);
        const solo = K.evaluateEncounter('2014', [{ count: 2, level: 5 }], [{ cr: '5', count: 1 }]);
        const big = K.evaluateEncounter('2014', [{ count: 6, level: 1 }], [{ cr: '1/4', count: 3 }]);
        return [a.base, a.multiplier, a.value, a.label, b.value, b.label, solo.multiplier, solo.label, big.multiplier].join(',');
      });
      /* solo: 2 PCs (<3) with 1 monster moves ×1 to ×1.5: 2700 v deadly 2200. big: 6 PCs, 3 monsters ×2 → ×1.5. */
      return res(got === '300,2,600,Medium,300,Below Low,1.5,Deadly,1.5', got);
    }
  },
  {
    name: 'encounter-calculator: 4 goblins + 2 bugbears is Low under 2024 and Hard under 2014 (600 × 2)',
    tool: 'encounter-calculator',
    run: async (page) => {
      await page.evaluate(() => localStorage.removeItem('att:encounter'));
      await page.reload({ waitUntil: 'load' });
      await page.waitForTimeout(300);
      const first = (await page.innerText('#view [data-k="difficulty"]')).split('\n')[0].trim();
      await page.click('#view .chips .chip:nth-child(2)');
      await page.waitForTimeout(300);
      const second = (await page.innerText('#view [data-k="difficulty"]')).split('\n')[0].trim();
      return res(first === 'Low' && second === 'Hard', first + ' → ' + second);
    }
  },
  {
    name: 'loot-generator: a hoard roll shows loot and Markdown with a total',
    tool: 'loot-generator',
    run: async (page) => {
      await page.selectOption('#view select[data-role="band"]', '2');
      await page.click('#view .chips .chip:nth-child(2)');
      await page.click('#view button.primary');
      await page.waitForTimeout(200);
      const md = await page.textContent('#view [data-k="markdown"]');
      return res(/Treasure hoard \(CR 11–16\)/.test(md) && /\*\*Total value:\*\* ≈ [\d,]+ gp/.test(md) && /Magic items/.test(md), md.slice(0, 200));
    }
  },
  {
    name: 'npc-generator: a locked name survives Generate while other fields change',
    tool: 'npc-generator',
    run: async (page) => {
      const name = async () => (await page.innerText('#view [data-field="name"] .v')).trim();
      const before = await name();
      await page.click('#view [data-field="name"] button[aria-pressed]');
      const others = new Set();
      for (let i = 0; i < 4; i++) {
        await page.click('#view button.primary');
        others.add((await page.innerText('#view [data-field="appearance"] .v')).trim());
      }
      const after = await name();
      const md = await page.textContent('#view [data-k="markdown"]');
      return res(before === after && others.size > 1 && md.includes('# ' + before) && md.includes('tags: [npc]'), before + ' / ' + after + ' / ' + others.size);
    }
  }
];
