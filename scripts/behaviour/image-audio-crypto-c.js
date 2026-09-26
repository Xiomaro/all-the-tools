/* Behaviour checks for the tools in image-c.js (Pixel Art Editor), audio-c.js
   (Piano & Chord Finder) and crypto-c.js (Shamir Secret Sharing). Chord names
   were worked out by hand; the Shamir checks round-trip random secrets through
   random subsets of shares. */
'use strict';

const V = '#view';

module.exports = [
  {
    name: 'Shamir Secret Sharing: any K of N shares rebuild the secret, K-1 do not, and mixed or altered shares are caught',
    tool: 'shamir-secret-sharing',
    async run(page) {
      const r = await page.evaluate(() => {
        const K = window.ShamirKit, bad = [];
        for (let t = 0; t < 40; t++) {
          const n = 2 + (t % 9), k = 2 + (t % (n - 1));
          const secret = crypto.getRandomValues(new Uint8Array(1 + (t * 7) % 50));
          const shares = K.split(secret, n, k, t % 2 ? 'base64' : 'hex').shares.sort(() => Math.random() - 0.5);
          const got = K.recover(shares.slice(0, k).map(s => s.text)).bytes;
          if (got.length !== secret.length || got.some((v, i) => v !== secret[i])) bad.push('round trip ' + n + '/' + k);
          try { K.recover(shares.slice(0, k - 1).map(s => s.text)); bad.push('accepted too few'); } catch (e) { /* expected */ }
        }
        const a = K.split(new TextEncoder().encode('x'), 3, 2, 'hex').shares, b = K.split(new TextEncoder().encode('x'), 3, 2, 'hex').shares;
        try { K.recover([a[0].text, b[1].text]); bad.push('mixed sets accepted'); } catch (e) { /* expected */ }
        const flipped = a[0].text.replace(/-h(.)/, (m, c) => '-h' + (c === '0' ? '1' : '0'));
        try { K.recover([flipped, a[1].text]); bad.push('altered share accepted'); } catch (e) { /* expected */ }
        return bad;
      });
      if (r.length) return { ok: false, detail: r.join(', ') };
      await page.fill(`${V} [data-k="secret"]`, 'correct horse battery staple ✓');
      await page.locator(`${V} button.btn.primary`, { hasText: /^\s*Split\s*$/ }).click();
      const shares = await page.$$eval(`${V} .share code`, n => n.map(x => x.textContent));
      await page.locator(`${V} .chip`, { hasText: 'Combine shares' }).click();
      await page.fill(`${V} [data-k="shares-in"]`, [shares[4], shares[0], shares[2]].join('\n'));
      await page.waitForTimeout(300);
      const out = (await page.textContent(`${V} [data-k="recovered"]`)).trim();
      return { ok: shares.length === 5 && out === 'correct horse battery staple ✓', detail: shares.length + ' shares, recovered "' + out + '"' };
    }
  },
  {
    name: 'Piano & Chord Finder: names triads, sevenths, inversions and slash chords',
    tool: 'piano-chords',
    async run(page) {
      const got = await page.evaluate(() => {
        const I = window.PianoKit.identify, f = ns => (I(ns)[0] || {}).label;
        return [f([60, 64, 67]), f([64, 67, 72]), f([67, 72, 76]), f([57, 60, 64]), f([60, 64, 67, 70]), f([55, 59, 62, 65]),
          f([60, 63, 66, 69]), f([60, 64, 68]), f([60, 65, 67]), f([60, 64, 67, 71, 74]), f([62, 67, 71, 74])];
      });
      const want = ['C', 'C/E', 'C/G', 'Am', 'C7', 'G7', 'Cdim7', 'Caug', 'Csus4', 'Cmaj9', 'G/D'];
      for (const n of [60, 63, 67]) await page.click(`${V} .pk[data-note="${n}"]`);
      const ui = (await page.textContent(`${V} [data-k="chord"]`)).trim();
      return { ok: JSON.stringify(got) === JSON.stringify(want) && ui === 'Cm', detail: JSON.stringify(got) + ' ui=' + ui };
    }
  },
  {
    name: 'Pixel Art Editor: pencil, rectangle and fill draw pixels, and undo reverses the last step',
    tool: 'pixel-art-editor',
    async run(page) {
      await page.evaluate(() => { try { localStorage.removeItem('att-pixel-art'); } catch (e) { /* ignore */ } });
      await page.reload({ waitUntil: 'load' });
      await page.waitForTimeout(150);
      await page.locator(`${V} .px-row input`).first().fill('16');
      await page.locator(`${V} .px-row input`).nth(1).fill('16');
      await page.locator(`${V} button`, { hasText: 'New blank' }).click();
      const count = () => page.evaluate(() => { const s = document.querySelector('#view .g-pix').pixelArt.state(); return Array.from(s.frames[s.cur]).filter(Boolean).length; });
      const c = page.locator(`${V} [data-k="pixel-canvas"]`);
      /* Centre it, so the sticky top bar does not sit over the top rows. */
      await c.evaluate(n => n.scrollIntoView({ block: 'center' }));
      const bb = await c.boundingBox(), cell = bb.width / 16, at = (x, y) => [bb.x + cell * (x + 0.5), bb.y + cell * (y + 0.5)];
      await page.mouse.move(...at(1, 1)); await page.mouse.down(); await page.mouse.move(...at(6, 1), { steps: 4 }); await page.mouse.up();
      const pencil = await count();
      await page.keyboard.press('r'); /* shortcuts, so the page does not scroll */
      await page.mouse.move(...at(3, 4)); await page.mouse.down(); await page.mouse.move(...at(7, 8), { steps: 3 }); await page.mouse.up();
      const rect = await count();
      await page.keyboard.press('g');
      await page.mouse.click(...at(5, 6));
      const fill = await count();
      await page.keyboard.press('Control+z');
      const undone = await count();
      const got = [pencil, rect, fill, undone];
      return { ok: JSON.stringify(got) === JSON.stringify([6, 22, 31, 22]), detail: JSON.stringify(got) };
    }
  }
];
