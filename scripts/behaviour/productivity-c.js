/* Behaviour checks for the Email Signature Generator: the HTML it builds
   must carry every field (escaped), use only tables and inline styles with
   no class attributes, switch layouts, embed or link a picture, download as
   a page, and remember the form. */
'use strict';

const fs = require('fs');
const V = '#view ';
function res(ok, detail) { return { ok: !!ok, detail: String(detail).slice(0, 400) }; }
async function fresh(page) {
  await page.evaluate(() => localStorage.removeItem('att:email-signature'));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
}
async function setField(page, label, value) {
  const ok = await page.evaluate(([label, value]) => {
    const f = [...document.querySelectorAll('#view .field')].find(x => { const l = x.querySelector(':scope > label'); return l && l.textContent.trim() === label; });
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
async function chip(page, text) { await page.locator(V + '.chip', { hasText: text }).first().click(); await page.waitForTimeout(150); }
async function html(page) { return page.textContent(V + '[data-k="html"]'); }
/* No class attributes anywhere, and every table is a layout table. */
function emailSafe(h) {
  const tables = (h.match(/<table\b[^>]*>/g) || []);
  return !/\sclass\s*=/.test(h) && !/<style/i.test(h) && tables.length > 0 &&
    tables.every(t => /cellpadding="0"/.test(t) && /role="presentation"/.test(t) && /style="/.test(t));
}
/* A 1 × 1 PNG. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

module.exports = [
  {
    name: 'email-signature: the example renders as email-safe HTML with links', tool: 'email-signature',
    run: async page => {
      await fresh(page);
      const h = await html(page);
      const checks = {
        safe: emailSafe(h),
        name: h.includes('Alex Morgan'), title: h.includes('Head of Marketing'), company: h.includes('Northwind Studio'),
        tel: h.includes('href="tel:+442079460123"'), mob: h.includes('href="tel:+447700900123"'),
        mail: h.includes('href="mailto:alex@example.com"'), web: h.includes('href="https://www.example.com"'),
        social: h.includes('href="https://www.linkedin.com/in/example"') && h.includes('>LinkedIn</a>'),
        preview: (await page.textContent(V + '[data-k="preview"]')).includes('Alex Morgan')
      };
      const bad = Object.keys(checks).filter(c => !checks[c]);
      return res(!bad.length, bad.length ? 'failed: ' + bad.join(', ') + ' | ' + h.slice(0, 200) : 'ok');
    }
  },
  {
    name: 'email-signature: entered fields appear, escaped, with a disclaimer and safe links only', tool: 'email-signature',
    run: async page => {
      await fresh(page);
      await setField(page, 'Name', 'Sam O’Neil & Co <test>');
      await setField(page, 'Job title', 'Director of "Things"');
      await setField(page, 'Company', 'Acme Widgets Ltd');
      await setField(page, 'Phone', '(01632) 960 001');
      await setField(page, 'Email', 'sam@example.org');
      await setField(page, 'Website', 'example.org/team/');
      await setField(page, 'Address', '2 Sample Road, Leeds');
      await setField(page, 'X', 'x.com/sam');
      await setField(page, 'GitHub', 'javascript:alert(1)');
      await setField(page, 'Small print under the signature', 'Confidential.\nSecond line.');
      await page.waitForTimeout(250);
      const h = await html(page);
      const checks = {
        safe: emailSafe(h),
        name: h.includes('Sam O’Neil &amp; Co &lt;test&gt;'), title: h.includes('Director of &quot;Things&quot;'),
        company: h.includes('Acme Widgets Ltd'), tel: h.includes('href="tel:01632960001"'), mail: h.includes('href="mailto:sam@example.org"'),
        web: h.includes('href="https://example.org/team/"') && h.includes('>example.org/team</a>'), address: h.includes('2 Sample Road, Leeds'),
        x: h.includes('href="https://x.com/sam"'), noScript: !/javascript:/i.test(h) && !h.includes('>GitHub</a>'),
        disclaimer: h.includes('Confidential.<br>Second line.') && h.includes('font-size:11px')
      };
      const bad = Object.keys(checks).filter(c => !checks[c]);
      return res(!bad.length, bad.length ? 'failed: ' + bad.join(', ') : 'ok');
    }
  },
  {
    name: 'email-signature: layouts, accent colour and font change the HTML', tool: 'email-signature',
    run: async page => {
      await fresh(page);
      const simple = await html(page);
      await chip(page, 'Photo left');
      const photo = await html(page);
      const tpl1 = await page.getAttribute(V + '[data-k="preview"]', 'data-template');
      await chip(page, 'Stacked');
      const stacked = await html(page);
      await chip(page, 'One line');
      const compact = await html(page);
      await page.fill(V + 'input[data-role="accent"]', '#aa3300');
      await page.selectOption(V + 'select[data-role="font"]', { label: 'Georgia' });
      await page.waitForTimeout(250);
      const styled = await html(page);
      const checks = {
        simple: emailSafe(simple) && !simple.includes('border-left:2px'),
        /* Photo left: a divider column, and initials standing in for the missing picture. */
        photo: tpl1 === 'photo' && photo.includes('border-left:2px solid #1f6feb') && />AM<\/td>/.test(photo) && emailSafe(photo),
        stacked: stacked.includes('text-align:center') && emailSafe(stacked),
        compact: !compact.includes('<br') && compact.includes('Head of Marketing</span>, <span') && emailSafe(compact),
        accent: styled.includes('#aa3300') && !styled.includes('#1f6feb'), font: styled.includes('font-family:Georgia')
      };
      const bad = Object.keys(checks).filter(c => !checks[c]);
      return res(!bad.length, bad.length ? 'failed: ' + bad.join(', ') : 'ok');
    }
  },
  {
    name: 'email-signature: a dropped picture is embedded, a web address replaces it, and it downloads', tool: 'email-signature',
    run: async page => {
      await fresh(page);
      await chip(page, 'Photo left');
      await page.setInputFiles(V + '.dropzone input[type=file]', { name: 'me.png', mimeType: 'image/png', buffer: PNG });
      await page.waitForTimeout(600);
      const embedded = await html(page);
      await setField(page, 'Or the picture’s web address', 'https://example.com/me.jpg');
      await page.waitForTimeout(200);
      const hosted = await html(page);
      const [dl] = await Promise.all([page.waitForEvent('download'), page.locator(V + 'button', { hasText: 'Download .html' }).click()]);
      const text = fs.readFileSync(await dl.path(), 'utf8');
      const checks = {
        embedded: /<img src="data:image\/jpeg;base64,[^"]+" alt="Alex Morgan" width="80" height="80"/.test(embedded) && embedded.includes('border-radius:50%'),
        hosted: hosted.includes('<img src="https://example.com/me.jpg"') && !hosted.includes('data:image'),
        file: dl.suggestedFilename() === 'email-signature.html',
        page: text.startsWith('<!DOCTYPE html>') && text.includes('<meta charset="utf-8">') && text.includes('Alex Morgan') && text.includes('https://example.com/me.jpg') && !/\sclass=/.test(text)
      };
      const bad = Object.keys(checks).filter(c => !checks[c]);
      return res(!bad.length, bad.length ? 'failed: ' + bad.join(', ') + ' | ' + embedded.slice(0, 160) : 'ok');
    }
  },
  {
    name: 'email-signature: the form is remembered after a reload, and resets to the example', tool: 'email-signature',
    run: async page => {
      await fresh(page);
      await setField(page, 'Name', 'Remember Me');
      await chip(page, 'Stacked');
      await page.waitForTimeout(200);
      await page.reload({ waitUntil: 'load' });
      await page.waitForTimeout(400);
      const kept = await page.inputValue(V + '.field:has(> label:text-is("Name")) input');
      const tpl = await page.getAttribute(V + '[data-k="preview"]', 'data-template');
      await page.locator(V + 'button', { hasText: 'Start again with the example' }).click();
      await page.waitForTimeout(200);
      const back = await page.inputValue(V + '.field:has(> label:text-is("Name")) input');
      const h = await html(page);
      await fresh(page);
      return res(kept === 'Remember Me' && tpl === 'stacked' && back === 'Alex Morgan' && h.includes('Alex Morgan'), `${kept} / ${tpl} / ${back}`);
    }
  }
];
