/* Behaviour checks for the css-b tools. References: the browser's own
   easing, transform and CSS parsing (independent of the tools' maths),
   Robert Penner's easeOutBounce worked by hand, Utopia's fluid-type formula
   worked by hand, hand-worked Catmull-Rom control points, and Tailwind v4's
   default theme (tailwindcss 4.3 theme.css) for the converter. */
'use strict';

const V = '#view';

async function clickExact(page, text) {
  await page.evaluate(t => {
    const b = [...document.querySelectorAll('#view button')].find(x => x.textContent.trim() === t);
    if (!b) throw new Error('no button ' + t);
    b.click();
  }, text);
  await page.waitForTimeout(150);
}
async function setK(page, k, value) {
  await page.evaluate(([k, v]) => {
    const n = document.querySelector('#view [data-k="' + k + '"]');
    if (!n) throw new Error('no input ' + k);
    n.value = v;
    n.dispatchEvent(new Event('input', { bubbles: true }));
  }, [k, String(value)]);
  await page.waitForTimeout(150);
}
async function textK(page, k) {
  return page.evaluate(k => { const n = document.querySelector('#view [data-k="' + k + '"]'); return n ? n.textContent : null; }, k);
}
function eq(got, want) { return { ok: JSON.stringify(got) === JSON.stringify(want), detail: JSON.stringify(got).slice(0, 260) }; }
function near(got, want, tol) {
  const ok = got.length === want.length && got.every((g, i) => Math.abs(g - want[i]) <= tol);
  return { ok, detail: JSON.stringify(got) + ' vs ' + JSON.stringify(want) };
}
function all(list) {
  const bad = list.filter(x => !x.ok);
  return bad.length ? { ok: false, detail: bad.map(b => b.detail).join(' | ').slice(0, 400) } : { ok: true, detail: '' };
}
/* The browser's own progress for an easing at time fraction x (Web Animations). */
async function browserEase(page, easing, xs) {
  return page.evaluate(([easing, xs]) => xs.map(x => {
    const d = document.createElement('div');
    document.body.appendChild(d);
    /* margin-left, not opacity: opacity is clamped to 0..1, which would hide overshoot. */
    const a = d.animate([{ marginLeft: '0px' }, { marginLeft: '10000px' }], { duration: 1000, easing, fill: 'both' });
    a.pause(); a.currentTime = x * 1000;
    const v = parseFloat(getComputedStyle(d).marginLeft) / 10000;
    a.cancel(); d.remove();
    return v;
  }), [easing, xs]);
}

module.exports = [
  /* ---------------- Cubic Bézier Easing Editor ---------------- */
  { name: 'cubic-bezier: curve values match the browser for ease, back and a pasted curve', tool: 'cubic-bezier', run: async page => {
    const at = async x => { await setK(page, 'at-input', x); return +(await textK(page, 'at')); };
    const ours = [await at(50), await at(20), await at(80)];
    const ref = await browserEase(page, 'cubic-bezier(0.25, 0.1, 0.25, 1)', [0.5, 0.2, 0.8]);
    await clickExact(page, 'In-Out Back');
    const css = await textK(page, 'css');
    const back = [await at(30), await at(90)];
    const refBack = await browserEase(page, 'cubic-bezier(0.68, -0.6, 0.32, 1.6)', [0.3, 0.9]);
    await page.fill(V + ' [data-k=paste]', 'cubic-bezier(0.1, 0.7, 1, 0.1)');
    await page.waitForTimeout(150);
    const pasted = [await at(40)], refP = await browserEase(page, 'cubic-bezier(0.1, 0.7, 1, 0.1)', [0.4]);
    const x2 = await page.inputValue(V + ' [data-k=x2]');
    return all([near(ours.concat(back, pasted), ref.concat(refBack, refP), 0.0015),
      eq([css.split('\n')[0], x2], ['transition-timing-function: cubic-bezier(0.68, -0.6, 0.32, 1.6);', '1'])]);
  } },
  { name: 'cubic-bezier: steps() jump positions and a bounce linear() the browser accepts', tool: 'cubic-bezier', run: async page => {
    const at = async x => { await setK(page, 'at-input', x); return +(await textK(page, 'at')); };
    await clickExact(page, 'steps()');
    await setK(page, 'steps', 4);
    const got = [];
    for (const pos of ['jump-end', 'jump-start', 'jump-none', 'jump-both']) {
      await page.selectOption(V + ' select', pos);
      await page.waitForTimeout(100);
      got.push(await at(30));
    }
    const stepCss = await textK(page, 'css');
    const refSteps = await browserEase(page, 'steps(4, jump-both)', [0.3]);
    await clickExact(page, 'linear() curve');
    const css = (await textK(page, 'css')).split('\n')[0].replace(/^transition-timing-function: /, '').replace(/;$/, '');
    const supported = await page.evaluate(v => CSS.supports('transition-timing-function', v), css);
    /* easeOutBounce(0.5) = 7.5625 * (0.5 - 1.5/2.75)^2 + 0.75 = 0.765625; (0.9) = 7.5625 * (0.9 - 2.25/2.75)^2 + 0.9375 = 0.988120 */
    const b = await browserEase(page, css, [0.5, 0.9, 0.2]);
    return all([eq([got, stepCss.split('\n')[0], supported], [[0.25, 0.5, 0.3333, 0.4], 'transition-timing-function: steps(4, jump-both);', true]),
      near([refSteps[0]], [0.4], 1e-6), near(b, [0.765625, 0.98812, 7.5625 * 0.04], 0.004)]);
  } },

  /* ---------------- Fluid Type Scale & clamp() Generator ---------------- */
  { name: 'fluid-type-scale: Utopia defaults give the hand-worked clamp() values; preview and single calculator', tool: 'fluid-type-scale', run: async page => {
    const c = async s => textK(page, 'clamp' + s);
    const got = [await c(0), await c(1), await c(-1)];
    const size0 = await page.evaluate(() => document.querySelector('#view [data-k=size0]').dataset.px);
    const css = await textK(page, 'css');
    const single = await textK(page, 'single');
    await setK(page, 'min-ratio', 1.25);
    const renamed = await page.evaluate(() => document.querySelector('#view [data-k="min-ratio-name"]').value);
    /* 18px@320 to 20px@1240: slope 2/920 -> 0.2174vw, intercept 18 - 0.6957 = 17.3043px = 1.0815rem. */
    return eq([got, size0, css.split('\n')[3], single, renamed], [
      ['clamp(1.125rem, 1.0815rem + 0.2174vw, 1.25rem)', 'clamp(1.35rem, 1.2761rem + 0.3696vw, 1.5625rem)', 'clamp(0.9375rem, 0.9158rem + 0.1087vw, 1rem)'],
      '19', '  --step-0: clamp(1.125rem, 1.0815rem + 0.2174vw, 1.25rem);', 'clamp(1rem, 0.8333rem + 0.8333vw, 1.5rem)', '1.25']);
  } },

  /* ---------------- CSS Transform Generator ---------------- */
  { name: 'css-transform: rotate(30deg) is matrix(0.866025, 0.5, -0.5, 0.866025, 0, 0); 2D and 3D combos match the browser', tool: 'css-transform', run: async page => {
    await setK(page, 'rz', 30);
    const m1 = await textK(page, 'matrix');
    const nums = s => s.match(/-?\d+(\.\d+)?(e-?\d+)?/g).map(Number);
    const combo = async () => {
      const ours = nums((await textK(page, 'matrix')).replace(/^transform: matrix(3d)?/, ''));
      const theirs = await page.evaluate(() => getComputedStyle(document.querySelector('#view .tf-box')).transform);
      return [ours, nums(theirs.replace(/^matrix(3d)?/, ''))];
    };
    await setK(page, 'tx', 40); await setK(page, 'ty', -20); await setK(page, 'kx', 15); await setK(page, 'sx', 1.5);
    const two = await combo();
    await setK(page, 'rx', 45); await setK(page, 'ry', -30); await setK(page, 'tz', 60); await setK(page, 'pe', 800);
    const three = await combo();
    const css = await textK(page, 'css');
    return all([eq(m1, 'transform: matrix(0.866025, 0.5, -0.5, 0.866025, 0, 0);'), near(two[0], two[1], 1e-4), near(three[0], three[1], 1e-4),
      eq([three[0].length, css.split('\n')[0]], [16, 'transform: perspective(800px) translate3d(40px, -20px, 60px) rotateX(45deg) rotateY(-30deg) rotate(30deg) skew(15deg, 0deg) scale(1.5);'])]);
  } },

  /* ---------------- Glassmorphism Generator ---------------- */
  { name: 'glassmorphism: CSS has backdrop-filter, the -webkit- prefix and a fallback; preview matches', tool: 'glassmorphism', run: async page => {
    await setK(page, 'blur', 16); await setK(page, 'saturation', 150); await setK(page, 'opacity', 35);
    const css = await textK(page, 'css');
    const card = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('#view [data-k=card]')); return [s.backdropFilter || s.webkitBackdropFilter, s.backgroundColor]; });
    return eq([css.includes('  backdrop-filter: blur(16px) saturate(150%);'), css.includes('  -webkit-backdrop-filter: blur(16px) saturate(150%);'),
      css.includes('  background: rgba(255, 255, 255, 0.35);'), /@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\) \{\n  \.glass \{ background: rgba\(255, 255, 255, 0\.85\); \}/.test(css),
      /blur\(16px\)/.test(card[0]), card[1]], [true, true, true, true, true, 'rgba(255, 255, 255, 0.35)']);
  } },

  /* ---------------- SVG Blob & Wave Generator ---------------- */
  { name: 'svg-blob-wave: a zero-randomness blob follows the hand-worked spline; seeds repeat; wave path; downloads and data URI', tool: 'svg-blob-wave', run: async page => {
    const pathOf = () => page.evaluate(() => document.querySelector('#view .svgprev path').getAttribute('d'));
    await setK(page, 'points', 4); await setK(page, 'random', 0);
    /* Points (350,200), (200,350), (50,200), (200,50); control 1 = P0 + (P1 - P3)/6 = (350,250), control 2 = P1 - (P2 - P0)/6 = (250,350). */
    const circle = await pathOf();
    await setK(page, 'random', 60); await setK(page, 'seed', 42);
    const a = await pathOf();
    await setK(page, 'seed', 43);
    const b = await pathOf();
    await setK(page, 'seed', 42);
    const a2 = await pathOf();
    const svg = await textK(page, 'svg'), uri = await textK(page, 'uri');
    const decoded = decodeURIComponent(uri.replace(/^background-image: url\("data:image\/svg\+xml,/, '').replace(/"\);$/, '')).replace(/'/g, '"');
    const [dl] = await Promise.all([page.waitForEvent('download'), clickExact(page, 'Download SVG')]);
    const file = require('fs').readFileSync(await dl.path(), 'utf8');
    const parsesOk = await page.evaluate(s => !new DOMParser().parseFromString(s, 'image/svg+xml').querySelector('parsererror'), file);
    await clickExact(page, 'Waves');
    await setK(page, 'layers', 1); await setK(page, 'random', 0); await setK(page, 'freq', 2); await setK(page, 'amp', 20); await setK(page, 'height', 50);
    const wave = await pathOf();
    return eq([circle.slice(0, 33), (circle.match(/C/g) || []).length, circle.slice(-1), a === a2, a !== b, decoded === svg, file === svg, parsesOk, dl.suggestedFilename(), wave.slice(0, 55)],
      ['M350,200C350,250 250,350 200,350C', 4, 'Z', true, true, true, true, true, 'shape.svg', 'M0,128C180,128 180,192 360,192C540,192 540,128 720,128C']);
  } },

  /* ---------------- CSS to Tailwind Converter ---------------- */
  { name: 'css-to-tailwind: sample rules convert to v4 utilities with hover, focus and md: variants', tool: 'css-to-tailwind', run: async page => {
    await page.waitForFunction(() => /bg-blue-500/.test(document.querySelector('#view .tw-out').textContent), null, { timeout: 15000 });
    const cls = await page.evaluate(() => [...document.querySelectorAll('#view .tw-out [data-selector]')].map(d => [d.dataset.selector, d.querySelector('[data-k=classes]').textContent]));
    const failed = await page.evaluate(() => [...document.querySelectorAll('#view [data-k=failed] li')].map(l => l.textContent));
    /* 8px 16px -> py-2 px-4 (4px spacing unit); #3b82f6 and #2563eb are v3 blue-500/600; #e5e7eb is gray-200; 6px is rounded-md;
       14px is text-sm; the shadow is v4 shadow-sm exactly; mask-image has no utility, so it becomes an arbitrary property. */
    return eq([cls, failed.length, /^@keyframes spin/.test(failed[0] || '')], [[['.btn',
      'inline-flex items-center gap-2 px-4 py-2 mx-auto my-0 bg-blue-500 text-white text-sm font-semibold border border-gray-200 rounded-md shadow-sm duration-150 [mask-image:none] hover:bg-blue-600 focus-visible:outline-blue-500/50 md:px-6 md:py-3']], 1, true]);
  } },
  { name: 'css-to-tailwind: bare declarations, arbitrary values, max-width media, invalid CSS and colour modes', tool: 'css-to-tailwind', run: async page => {
    await page.waitForFunction(() => /bg-blue-500/.test(document.querySelector('#view .tw-out').textContent), null, { timeout: 15000 });
    await clickExact(page, 'Exact palette matches only');
    const conv = css => page.evaluate(c => document.querySelector('#view .g-cssb').convert(c).map(r => r.classes), css);
    const a = await conv('padding: 1.3rem; color: rgb(12 34 56); width: 50%; z-index: 10; margin-top: -12px; line-height: 1.5; letter-spacing: 0.05em; colr: red');
    const failA = await page.evaluate(() => [...document.querySelectorAll('#view [data-k=failed] li')].map(l => l.textContent));
    const b = await conv('.card{border-radius:9999px;grid-template-columns:repeat(3,minmax(0,1fr));display:grid} @media (max-width: 767px){.card{display:none}} .card::before{content:""} .card:nth-child(3){opacity:.5}');
    await clickExact(page, 'Always arbitrary');
    const c = await conv('.x { background: #3b82f6; }');
    return eq([a, failA.some(t => /colr: red — not valid CSS/.test(t)), b, c], [
      ['p-[1.3rem] text-[#0c2238] w-1/2 z-10 -mt-3 leading-normal tracking-wider'], true,
      ['rounded-full grid-cols-3 grid max-md:hidden before:content-[\'\'] [&:nth-child(3)]:opacity-50'], ['bg-[#3b82f6]']]);
  } }
];
