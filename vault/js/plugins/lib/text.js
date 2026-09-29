/* Counting words and diffing text: word count and file recovery. */

import { splitFrontmatter } from '../../core/metadata.js';

/* Chinese, Japanese and Korean ideographs and kana are written without
   spaces, so each character counts as a word, as in Obsidian. */
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}　-〿ｦ-ﾟ]/gu;
const WORD = /[\p{L}\p{N}\p{M}_]+(?:['’.\-][\p{L}\p{N}\p{M}_]+)*/gu;

export function countWords(text) {
  let cjk = 0;
  const rest = String(text).replace(CJK, ch => { if (/[\p{L}\p{N}]/u.test(ch)) cjk++; return ' '; });
  const words = rest.match(WORD);
  return cjk + (words ? words.length : 0);
}

/* Characters as the user sees them (a surrogate pair is one). */
export function countCharacters(text) {
  let n = 0;
  for (const _ of String(text)) n++;
  return n;
}

/* The part of a note that counts: everything after the properties. */
export function countableText(text) {
  const fm = splitFrontmatter(text || '');
  return fm ? text.slice(fm.bodyStart) : (text || '');
}

/* A line diff: [{ type: 'same' | 'add' | 'del', text }]. Common lines at
   either end are trimmed first; the middle uses an LCS table, and if that
   would be too big the middle is shown as removed then added. */
export function diffLines(a, b) {
  const x = String(a).split('\n'), y = String(b).split('\n');
  let s = 0;
  while (s < x.length && s < y.length && x[s] === y[s]) s++;
  let ex = x.length, ey = y.length;
  while (ex > s && ey > s && x[ex - 1] === y[ey - 1]) { ex--; ey--; }
  const out = [];
  for (let i = 0; i < s; i++) out.push({ type: 'same', text: x[i] });
  const mx = x.slice(s, ex), my = y.slice(s, ey);
  const n = mx.length, m = my.length;
  if (n * m > 4e6) {
    mx.forEach(t => out.push({ type: 'del', text: t }));
    my.forEach(t => out.push({ type: 'add', text: t }));
  } else if (n || m) {
    const w = m + 1;
    const dp = new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i * w + j] = mx[i] === my[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
      }
    }
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (mx[i] === my[j]) { out.push({ type: 'same', text: mx[i] }); i++; j++; }
      else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) out.push({ type: 'del', text: mx[i++] });
      else out.push({ type: 'add', text: my[j++] });
    }
    while (i < n) out.push({ type: 'del', text: mx[i++] });
    while (j < m) out.push({ type: 'add', text: my[j++] });
  }
  for (let i = ex; i < x.length; i++) out.push({ type: 'same', text: x[i] });
  return out;
}
