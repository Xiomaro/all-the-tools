/* Behaviour checks for the text-c tools (Readability Score). Expected values
   follow the Flesch formulas worked by hand for the text used. */
'use strict';

const Q = k => `#view [data-k="${k}"]`;
async function set(page, k, v) {
  await page.$eval(Q(k), (n, v) => { n.value = v; n.dispatchEvent(new Event('input', { bubbles: true })); }, v);
  await page.waitForTimeout(300);
}
const res = (ok, detail) => ({ ok: !!ok, detail: String(detail).slice(0, 220) });

module.exports = [
  { name: 'readability-score: Flesch reading ease of a plain sentence', tool: 'readability-score', run: async page => {
    /* "The cat sat on the mat." 6 words, 1 sentence, 6 syllables:
       206.835 - 1.015 × 6 - 84.6 × 1 = 116.1, clamped to 100. */
    await set(page, 'input', 'The cat sat on the mat.');
    const fre = (await page.textContent(Q('fre'))).trim();
    return res(fre === '100.0', fre);
  } },
  { name: 'readability-score: marks passive voice, adverbs and wordy phrases', tool: 'readability-score', run: async page => {
    await set(page, 'input', 'The report was quickly written in order to impress. We utilise it daily.');
    const got = await page.$$eval('#view [data-k="marked"] [class^="w-"]', ns => ns.map(n => n.className + ':' + n.textContent.trim()).join('|'));
    const ok = /w-pass:was quickly written/.test(got) && /w-simp:in order to/.test(got) && /w-simp:utilise/.test(got) && !/daily/.test(got);
    return res(ok, got);
  } }
];
