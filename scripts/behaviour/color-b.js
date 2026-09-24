/* Behaviour checks for the merged colour tools in color.js (converter,
   picker, palette) and the color-b tools (Tailwind palette, data-viz
   palettes, colour-blind palette checker).

   Reference values: CSS Color Module Level 4 examples (sRGB blue and yellow
   in lab()/oklch(), the oklch(40.101% 0.12332 21.555) sample and its oklab()
   and rgb() equivalents), EasyRGB/Lindbloom CIELAB (D65) for sRGB red,
   Sharma, Wu & Dalal (2005) CIEDE2000 test data, the official Tailwind CSS
   palettes (tailwindcss@3.4.19 colors.js, tailwindcss@4.3.3 theme.css),
   Machado, Oliveira & Fernandes (2009) severity-1 matrices worked through
   by hand, and the old HEX to RGB / RGB to HEX / Colour Harmonies / Colour
   Picker & History checks from before the merge. */
'use strict';

const V = '#view';

async function fill(page, sel, value) {
  await page.fill(V + ' ' + sel, value);
  await page.waitForTimeout(150);
}
async function clickExact(page, text) {
  await page.evaluate(t => {
    const b = [...document.querySelectorAll('#view button')].find(x => x.textContent.trim() === t);
    if (!b) throw new Error('no button ' + t);
    b.click();
  }, text);
  await page.waitForTimeout(150);
}
async function tile(page, key) {
  return page.evaluate(k => {
    const n = document.querySelector('#view [data-key="' + k + '"] code');
    return n ? n.textContent : null;
  }, key);
}
async function text(page, sel) {
  return page.evaluate(s => { const n = document.querySelector('#view ' + s); return n ? n.textContent : null; }, sel);
}
async function swatches(page, scope) {
  return page.evaluate(s => [...document.querySelectorAll('#view ' + (s ? s + ' ' : '') + '.sw')].map(b => b.dataset.hex), scope || '');
}
async function waitFor(page, fn, arg, ms) {
  await page.waitForFunction(fn, arg, { timeout: ms || 15000 });
}
function eq(got, want) { return { ok: JSON.stringify(got) === JSON.stringify(want), detail: JSON.stringify(got).slice(0, 220) }; }
/* Numbers pulled out of a CSS colour string, e.g. "oklch(45.2% 0.313 264.05)" -> [45.2, 0.313, 264.05]. */
function nums(s) { return String(s || '').match(/-?\d+(\.\d+)?(e-?\d+)?/g).map(Number); }
function near(got, want, tol) {
  const ok = got.length === want.length && got.every((g, i) => Math.abs(g - want[i]) <= (Array.isArray(tol) ? tol[i] : tol));
  return { ok, detail: JSON.stringify(got) + ' vs ' + JSON.stringify(want) };
}
function all(list) {
  const bad = list.filter(x => !x.ok);
  return bad.length ? { ok: false, detail: bad.map(b => b.detail).join(' | ').slice(0, 400) } : { ok: true, detail: '' };
}


/* Independent Node-side check of CVD distances: Machado 2009 matrices on
   linear sRGB, then Ottosson's original sRGB-linear -> OKLab coefficients. */
const MACH = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]]
};
function linOf(hex) { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); }
function oklabLin([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
function simLin(hex, type) {
  const l = linOf(hex);
  if (type === 'normal') return l;
  if (type === 'achromatopsia') { const y = 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; return [y, y, y]; }
  return MACH[type].map(row => Math.min(1, Math.max(0, row[0] * l[0] + row[1] * l[1] + row[2] * l[2])));
}
function dSim(h1, h2, type) { const a = oklabLin(simLin(h1, type)), b = oklabLin(simLin(h2, type)); return 100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }

module.exports = [
  /* ---------------- Colour Converter (absorbed HEX to RGB, RGB to HEX) ---------------- */
  { name: 'color-converter: HEX to RGB (#3b82f6), RGB to HEX (rgb(255, 165, 0)) and names', tool: 'color-converter', run: async page => {
    await fill(page, 'input[type=text]', '#3b82f6');
    const a = [await tile(page, 'rgb'), await tile(page, 'hsl')];
    await fill(page, 'input[type=text]', 'rgb(255, 165, 0)');
    const b = await tile(page, 'hex');
    await fill(page, 'input[type=text]', 'rebeccapurple');
    return eq([a, b, await tile(page, 'hex')], [['rgb(59, 130, 246)', 'hsl(217, 91%, 60%)'], '#FFA500', '#663399']);
  } },
  { name: 'color-converter: sRGB blue and yellow match the CSS Color 4 lab() and oklch() examples', tool: 'color-converter', run: async page => {
    await fill(page, 'input[type=text]', '#0000ff');
    const blue = [nums(await tile(page, 'oklch')), nums(await tile(page, 'lab'))];
    await fill(page, 'input[type=text]', '#ffff00');
    const yellow = [nums(await tile(page, 'oklch')), nums(await tile(page, 'lab'))];
    return all([
      near(blue[0], [45.2, 0.313, 264.1], [0.06, 0.0006, 0.06]), near(blue[1], [29.567, 68.298, -112.0294], [0.01, 0.02, 0.02]),
      near(yellow[0], [96.8, 0.211, 109.8], [0.06, 0.0006, 0.06]), near(yellow[1], [97.607, -15.753, 93.388], [0.01, 0.01, 0.01])
    ]);
  } },
  { name: 'color-converter: reads oklch(40.101% 0.12332 21.555) as the spec\'s oklab()/lab()/rgb() sample', tool: 'color-converter', run: async page => {
    await fill(page, 'input[type=text]', 'oklch(40.101% 0.12332 21.555)');
    const ok = nums(await tile(page, 'oklab')), lab = nums(await tile(page, 'lab')), lch = nums(await tile(page, 'lch'));
    const hex = await tile(page, 'hex'), gamut = await text(page, '[data-k=gamut]');
    return all([near(ok, [40.101, 0.1147, 0.0453], [0.001, 0.0001, 0.0001]), near(lab, [29.2345, 39.3825, 20.0664], [0.01, 0.05, 0.05]),
      near(lch, [29.2345, 44.2, 27], [0.01, 0.05, 0.1]), eq([hex, gamut], ['#7D2329', ''])]);
  } },
  { name: 'color-converter: hwb() and lab()/oklab() input; CIELAB D65 of red; out-of-gamut OKLCH is flagged', tool: 'color-converter', run: async page => {
    await fill(page, 'input[type=text]', 'hwb(120 20% 40%)');
    const h1 = [await tile(page, 'hex'), await tile(page, 'hwb')];
    await fill(page, 'input[type=text]', 'lab(29.2345% 39.3825 20.0664)');
    const h2 = await tile(page, 'hex');
    await fill(page, 'input[type=text]', 'oklab(59.686% 0.1009 0.1192)');
    const h3 = await tile(page, 'hex');
    await fill(page, 'input[type=text]', '#ff0000');
    const d65 = nums(await tile(page, 'lab65'));
    await fill(page, 'input[type=text]', 'oklch(70% 0.4 30)');
    const out = [await text(page, '[data-k=gamut]'), await tile(page, 'oklch'), /^#[0-9A-F]{6}$/.test(await tile(page, 'hex'))];
    /* The spec lists oklab(59.686% 0.1009 0.1192) as about rgb(77.61% 36.34% 2.45%); worked through its
       matrices it is rgb(77.60% 36.34% 2.60%), i.e. 198, 93, 7. */
    return all([eq([h1, h2, h3], [['#339933', 'hwb(120 20% 40%)'], '#7D2329', '#C65D07']),
      near(d65, [53.24, 80.09, 67.2], 0.01), eq([/outside the sRGB gamut/.test(out[0]), out[1], out[2]], [true, 'oklch(70% 0.4 30)', true])]);
  } },
  { name: 'color-converter: CIELAB (D65) channels write back to #FF0000', tool: 'color-converter', run: async page => {
    await clickExact(page, 'CIELAB (D65)');
    await page.evaluate(() => {
      const vals = ['53.2371', '80.0901', '67.2033'];
      [0, 1, 2].forEach(i => { const n = document.querySelector('#view [data-k=chan' + i + ']'); n.value = vals[i]; n.dispatchEvent(new Event('input', { bubbles: true })); });
    });
    await page.waitForTimeout(150);
    const a = [await tile(page, 'hex'), await page.inputValue(V + ' input[type=text]')];
    await clickExact(page, 'OKLCH');
    const ch = await page.evaluate(() => [0, 1, 2].map(i => document.querySelector('#view [data-k=chan' + i + ']').value));
    return all([eq(a, ['#FF0000', '#ff0000']), near(ch.map(Number), [62.8, 0.2577, 29.23], [0.01, 0.0001, 0.01])]);
  } },

  /* ---------------- Colour Picker (absorbed Colour Picker & History) ---------------- */
  { name: 'color-picker: RGB channel edit updates HEX; preset sets colour (old hex-color-picker check)', tool: 'color-picker', run: async page => {
    await page.fill(V + ' input[type=number]', '255');
    await page.waitForTimeout(150);
    const a = await tile(page, 'hex');
    await page.click(V + ' .sw[title^="Teal"]');
    await page.waitForTimeout(150);
    return eq([a, await tile(page, 'hex'), await tile(page, 'rgb')], ['#FF82F6', '#14B8A6', 'rgb(20, 184, 166)']);
  } },
  { name: 'color-picker: history survives a reload (localStorage) and clears; variable name; hue slider', tool: 'color-picker', run: async page => {
    await fill(page, 'input[type=text]', '#123456');
    await page.waitForTimeout(700);
    await page.reload({ waitUntil: 'load' });
    await waitFor(page, () => document.querySelector('#view [data-key=hex]'));
    const kept = await page.evaluate(() => [...document.querySelectorAll('#view .sw')].some(b => b.dataset.hex === '#123456'));
    await page.fill(V + ' input[aria-label="CSS variable name"]', 'brand');
    await page.waitForTimeout(150);
    const css = await tile(page, 'css');
    /* Hue 120 at full saturation and brightness is pure green. */
    await page.evaluate(() => {
      const sv = document.querySelector('#view .sv'), box = sv.getBoundingClientRect();
      const at = (x, y) => ({ clientX: box.left + x * box.width, clientY: box.top + y * box.height, bubbles: true, pointerId: 1, buttons: 1 });
      sv.dispatchEvent(new PointerEvent('pointerdown', at(1, 0)));
      const hue = document.querySelector('#view input.hue');
      hue.value = '120'; hue.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(150);
    const green = await tile(page, 'hex');
    await clickExact(page, 'Clear history');
    const cleared = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('att-color-picker-history') || '[]').length; } catch (e) { return -1; } });
    return eq([kept, css, green, cleared], [true, '--brand: #3b82f6;', '#00FF00', 0]);
  } },

  /* ---------------- Colour Palette & Harmonies (absorbed Colour Harmonies) ---------------- */
  { name: 'color-palette: split-complementary, rectangle, compound and outputs for #3b82f6', tool: 'color-palette', run: async page => {
    await fill(page, 'input[type=text]', '#3b82f6');
    await clickExact(page, 'Split-complementary');
    const split = await swatches(page);
    const list = await text(page, '[data-out=list]');
    await clickExact(page, 'Rectangle');
    const rect = await swatches(page);
    await clickExact(page, 'Compound');
    const comp = await swatches(page);
    const css = await text(page, '[data-out=css]');
    /* hsl(217, 91%, 60%) turned by 150° and 210° is #F6523C and #E0F63C (old Colour Harmonies values);
       60°, 180° and 240° give hsl(277/37/97, 91%, 60%), and 30° gives hsl(247, 91%, 60%). */
    return eq([split, list, rect, comp, css.split('\n').length], [
      ['#3B82F6', '#F6523C', '#E0F63C'], '#3B82F6, #F6523C, #E0F63C',
      ['#3B82F6', '#AF3CF6', '#F6AF3C', '#83F63C'],
      ['#3B82F6', '#523CF6', '#F6523C', '#F6AF3C'], 6]);
  } },


  /* ---------------- Tailwind Colour Palette ---------------- */
  { name: 'tailwind-colors: official v4 OKLCH and v3 HEX spot checks, counts, copy as class', tool: 'tailwind-colors', run: async page => {
    await waitFor(page, () => document.querySelector('#view [data-name="blue-500"]'));
    const get = n => page.evaluate(k => { const b = document.querySelector('#view .tw-sw[data-name="' + k + '"]'); return b ? [b.dataset.hex, b.dataset.oklch] : null; }, n);
    const v4 = [(await get('blue-500'))[1], (await get('red-500'))[1], (await get('slate-50'))[1], (await get('mauve-500'))[1]];
    const c4 = await text(page, '[data-k=count]');
    await page.click(V + ' .tw-sw[data-name="blue-500"]');
    await page.waitForTimeout(150);
    const copied = await text(page, '[data-k=copied]');
    await clickExact(page, 'v3 (HEX)');
    const v3 = [(await get('blue-500'))[0], (await get('red-500'))[0], (await get('emerald-600'))[0], (await get('zinc-950'))[0], (await get('black'))[0], await get('mauve-500')];
    const c3 = await text(page, '[data-k=count]');
    await clickExact(page, 'HEX');
    await page.click(V + ' .tw-sw[data-name="red-500"]');
    await page.waitForTimeout(150);
    return eq([v4, c4, copied, v3, c3, await text(page, '[data-k=copied]'), await tile(page, 'var')], [
      ['oklch(62.3% 0.214 259.815)', 'oklch(63.7% 0.237 25.331)', 'oklch(98.4% 0.003 247.858)', 'oklch(54.2% 0.034 322.5)'],
      '288 colours in the v4 palette', 'Copied bg-blue-500',
      ['#3b82f6', '#ef4444', '#059669', '#09090b', '#000000', null], '244 colours in the v3 palette', 'Copied #ef4444', '--color-red-500: #ef4444;']);
  } },
  { name: 'tailwind-colors: nearest colour (ΔE OK) and search', tool: 'tailwind-colors', run: async page => {
    await waitFor(page, () => document.querySelector('#view .near [data-name]'));
    await clickExact(page, 'v3 (HEX)');
    await fill(page, 'input[aria-label="Colour to match"]', '#3b82f6');
    await page.waitForTimeout(200);
    const near = () => page.evaluate(() => [...document.querySelectorAll('#view .near [data-name]')].slice(0, 2).map(b => b.dataset.name + ' ' + b.dataset.de));
    const a = await near();
    await fill(page, 'input[aria-label="Colour to match"]', 'rgb(240, 70, 70)');
    await page.waitForTimeout(200);
    const b = (await near())[0].split(' ')[0];
    await fill(page, 'input[type=search]', 'sky-3');
    const hits = await page.evaluate(() => [...document.querySelectorAll('#view .tw-sw:not(.dim)')].filter(x => x.offsetParent).map(x => x.dataset.name));
    return eq([a[0], b, hits, await text(page, '[data-k=count]')], ['blue-500 0', 'red-500', ['sky-300'], '1 match']);
  } },

  /* ---------------- Data Visualisation Palette Generator ---------------- */
  { name: 'data-viz-palette: sequential has even OKLCH lightness steps; diverging has a neutral light centre', tool: 'data-viz-palette', run: async page => {
    const sw = () => page.evaluate(() => [...document.querySelectorAll('#view .dv-sw')].map(b => ({ l: +b.dataset.l, c: +b.dataset.c, h: b.dataset.h === '' ? NaN : +b.dataset.h })));
    const seq = await sw();
    /* 7 colours from L 96% to 28%: steps of 68/6 = 11.33%. */
    const want = [0.96, 0.84667, 0.73333, 0.62, 0.50667, 0.39333, 0.28];
    await clickExact(page, 'Diverging');
    await fill(page, '[data-k=n]', '5');
    const div = await sw();
    return all([near(seq.map(x => x.l), want, 0.006), near(div.map(x => x.l), [0.28, 0.62, 0.96, 0.62, 0.28], 0.006),
      eq([div[2].c < 0.01, div[0].h > 240 && div[0].h < 290, div[4].h < 40 || div[4].h > 340], [true, true, true])]);
  } },
  { name: 'data-viz-palette: categorical hues are 60° apart at one lightness; exports parse', tool: 'data-viz-palette', run: async page => {
    await clickExact(page, 'Categorical');
    await fill(page, '[data-k=n]', '6');
    await clickExact(page, 'Round the wheel');
    const cat = await page.evaluate(() => [...document.querySelectorAll('#view .dv-sw')].map(b => [+b.dataset.l, +b.dataset.h]));
    const steps = cat.slice(1).map((c, i) => ((c[1] - cat[i][1]) + 360) % 360);
    const json = JSON.parse(await text(page, '[data-k=json]'));
    const css = await text(page, '[data-k=css]');
    const [dl] = await Promise.all([page.waitForEvent('download'), clickExact(page, 'Download SVG')]);
    const fs = require('fs'), svg = fs.readFileSync(await dl.path(), 'utf8');
    return all([near(cat.map(c => c[0]), [0.65, 0.65, 0.65, 0.65, 0.65, 0.65], 0.006), near(steps, [60, 60, 60, 60, 60], 2),
      eq([json.type, json.colors.length, json.oklch.length, (css.match(/--viz-\d+:/g) || []).length, (svg.match(/<rect /g) || []).length, dl.suggestedFilename()],
        ['categorical', 6, 6, 6, 6, 'palette.svg'])]);
  } },

  /* ---------------- Colour-Blind Safe Palette Checker ---------------- */
  { name: 'colorblind-palette-checker: d3 red/green pair merges for deuteranopia (Machado 2009 by hand)', tool: 'colorblind-palette-checker', run: async page => {
    await fill(page, 'textarea', '#d62728\n#2ca02c');
    await page.waitForTimeout(300);
    const strips = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#view .simrow')].map(r => [r.dataset.vision, [...r.querySelectorAll('i')].map(i => i.dataset.hex)])));
    const cells = {};
    for (const v of ['normal', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia']) {
      await clickExact(page, { normal: 'Normal vision', protanopia: 'Protanopia', deuteranopia: 'Deuteranopia', tritanopia: 'Tritanopia', achromatopsia: 'Achromatopsia' }[v]);
      cells[v] = +(await page.evaluate(() => document.querySelector('#view td[data-i="0"][data-j="1"]').dataset.de));
    }
    const flags = await page.evaluate(() => { const s = document.querySelector('#view [data-k=summary]'); return [s.dataset.flags, s.dataset.deuteranopia, s.dataset.protanopia]; });
    /* Worked through the published matrices: red -> #8b7c1f / green -> #968838 for deuteranopia, etc. */
    return all([eq([strips.deuteranopia, strips.protanopia, strips.achromatopsia, flags], [['#8b7c1f', '#968838'], ['#615725', '#a39119'], ['#6f6f6f', '#8b8b8b'], ['1', '1', '0']]),
      near([cells.normal, cells.protanopia, cells.deuteranopia, cells.tritanopia, cells.achromatopsia], [33.767, 20.679, 3.887, 34.67, 9.534], 0.05)]);
  } },
  { name: 'colorblind-palette-checker: suggested fixes clear every clash (verified independently); black/white never clash', tool: 'colorblind-palette-checker', run: async page => {
    await clickExact(page, 'd3 Category10');
    /* Ten hues cannot all differ in lightness alone, so leave the (very rare) achromatopsia out of this one. */
    await page.click(V + ' .checks label:last-child input');
    await page.waitForTimeout(300);
    const before = +(await page.evaluate(() => document.querySelector('#view [data-k=summary]').dataset.flags));
    for (let i = 0; i < 40; i++) {
      const n = await page.evaluate(() => { const b = [...document.querySelectorAll('#view .problems button')].find(x => x.textContent === 'Use it'); if (b) b.click(); return !!b; });
      if (!n) break;
      await page.waitForTimeout(250);
    }
    const after = await page.evaluate(() => [document.querySelector('#view [data-k=summary]').dataset.flags, document.querySelector('#view textarea').value.split('\n'),
      document.querySelectorAll('#view .problems li').length]);
    let worst = Infinity;
    const list = after[1];
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++)
      for (const t of ['normal', 'protanopia', 'deuteranopia', 'tritanopia']) worst = Math.min(worst, dSim(list[i], list[j], t));
    await fill(page, 'textarea', 'black, white');
    await page.waitForTimeout(300);
    const bw = await page.evaluate(() => [document.querySelector('#view [data-k=summary]').dataset.flags, document.querySelector('#view td[data-i="0"][data-j="1"]').dataset.de]);
    await clickExact(page, 'ΔE 2000 (CIELAB D65)');
    const bw2000 = await page.evaluate(() => document.querySelector('#view td[data-i="0"][data-j="1"]').dataset.de);
    return eq([before > 5, after[0], after[2], worst >= 7.9, list.length, bw, bw2000], [true, '0', 0, true, 10, ['0', '100'], '100']);
  } },

  /* ---------------- ColourKit maths ---------------- */
  { name: 'ColourKit: CIEDE2000 matches Sharma, Wu & Dalal (2005) test pairs', tool: 'color-converter', run: async page => {
    const got = await page.evaluate(() => {
      const K = window.ColourKit;
      const pairs = [
        [[50, 2.6772, -79.7751], [50, 0, -82.7485]], [[50, 0, 0], [50, -1, 2]], [[50, 2.49, -0.001], [50, -2.49, 0.0009]],
        [[50, 2.5, 0], [73, 25, -18]], [[50, 2.5, 0], [61, -5, 29]], [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387]],
        [[22.7233, 20.0904, -46.694], [23.0331, 14.973, -42.5619]], [[2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514]]
      ];
      return pairs.map(p => Math.round(K.deltaE2000(p[0], p[1]) * 10000) / 10000);
    });
    return near(got, [2.0425, 2.3669, 7.1792, 27.1492, 22.8977, 1.2644, 2.0373, 0.9082], 0.0001);
  } }
];
