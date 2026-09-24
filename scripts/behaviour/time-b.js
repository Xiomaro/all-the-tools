/* Behaviour checks for the time-b tools (timesheet, date formats, UK bank
   holidays, Easter) and the Time Zone Converter's merged multi-zone check. */
'use strict';

const fs = require('fs');

async function setField(page, label, value, nth) {
  const ok = await page.evaluate(([label, value, nth]) => {
    const fields = [...document.querySelectorAll('#view .field')].filter(f => {
      const l = f.querySelector(':scope > label');
      return l && l.textContent.trim() === label;
    });
    const f = fields[nth || 0];
    if (!f) return false;
    const c = f.querySelector('input, select, textarea');
    c.value = value;
    c.dispatchEvent(new Event('input', { bubbles: true }));
    c.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, [label, String(value), nth || 0]);
  if (!ok) throw new Error('No field labelled ' + label);
  await page.waitForTimeout(220);
}
async function setAria(page, aria, value) {
  const ok = await page.evaluate(([aria, value]) => {
    const c = document.querySelector('#view [aria-label="' + aria + '"]');
    if (!c) return false;
    c.value = value;
    c.dispatchEvent(new Event('input', { bubbles: true }));
    c.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, [aria, String(value)]);
  if (!ok) throw new Error('No control with aria-label ' + aria);
}
async function click(page, text, nth) {
  const ok = await page.evaluate(([text, nth]) => {
    const els = [...document.querySelectorAll('#view button, #view .chip')].filter(b => b.textContent.trim() === text && b.offsetParent !== null);
    const b = els[nth || 0];
    if (!b) return false;
    b.click();
    return true;
  }, [text, nth || 0]);
  if (!ok) throw new Error('No visible button "' + text + '"');
  await page.waitForTimeout(220);
}
const k = (page, key) => page.evaluate(key => { const n = document.querySelector('#view [data-k="' + key + '"]'); return n ? n.textContent.trim() : null; }, key);
const kAll = (page, key) => page.$$eval('#view [data-k="' + key + '"]', ns => ns.map(n => n.textContent.trim()));
const kDate = (page, key) => page.evaluate(key => { const n = document.querySelector('#view [data-k="' + key + '"]'); return n ? n.dataset.date : null; }, key);
async function download(page, text) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), click(page, text)]);
  return { name: dl.suggestedFilename(), text: fs.readFileSync(await dl.path(), 'utf8') };
}
function result(ok, detail) { return { ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) }; }

/* GOV.UK's published bank holidays (mmdd per year): 2015–2018 from
   alphagov/calendars and 2019–2028 from alphagov/frontend
   lib/data/bank-holidays.json, the data behind www.gov.uk/bank-holidays.json
   (fetched 22/09/2026; Open Government Licence v3.0). */
const GOVUK = {
  ew: {
    2015: '0101 0403 0406 0504 0525 0831 1225 1228',
    2016: '0101 0325 0328 0502 0530 0829 1226 1227',
    2017: '0102 0414 0417 0501 0529 0828 1225 1226',
    2018: '0101 0330 0402 0507 0528 0827 1225 1226',
    2019: '0101 0419 0422 0506 0527 0826 1225 1226',
    2020: '0101 0410 0413 0508 0525 0831 1225 1228',
    2021: '0101 0402 0405 0503 0531 0830 1227 1228',
    2022: '0103 0415 0418 0502 0602 0603 0829 0919 1226 1227',
    2023: '0102 0407 0410 0501 0508 0529 0828 1225 1226',
    2024: '0101 0329 0401 0506 0527 0826 1225 1226',
    2025: '0101 0418 0421 0505 0526 0825 1225 1226',
    2026: '0101 0403 0406 0504 0525 0831 1225 1228',
    2027: '0101 0326 0329 0503 0531 0830 1227 1228',
    2028: '0103 0414 0417 0501 0529 0828 1225 1226',
  },
  sc: {
    2015: '0101 0102 0403 0504 0525 0803 1130 1225 1228',
    2016: '0101 0104 0325 0502 0530 0801 1130 1226 1227',
    2017: '0102 0103 0414 0501 0529 0807 1130 1225 1226',
    2018: '0101 0102 0330 0507 0528 0806 1130 1225 1226',
    2019: '0101 0102 0419 0506 0527 0805 1202 1225 1226',
    2020: '0101 0102 0410 0508 0525 0803 1130 1225 1228',
    2021: '0101 0104 0402 0503 0531 0802 1130 1227 1228',
    2022: '0103 0104 0415 0502 0602 0603 0801 0919 1130 1226 1227',
    2023: '0102 0103 0407 0501 0508 0529 0807 1130 1225 1226',
    2024: '0101 0102 0329 0506 0527 0805 1202 1225 1226',
    2025: '0101 0102 0418 0505 0526 0804 1201 1225 1226',
    2026: '0101 0102 0403 0504 0525 0615 0803 1130 1225 1228',
    2027: '0101 0104 0326 0503 0531 0802 1130 1227 1228',
    2028: '0103 0104 0414 0501 0529 0807 1130 1225 1226',
  },
  ni: {
    2015: '0101 0317 0403 0406 0504 0525 0713 0831 1225 1228',
    2016: '0101 0317 0325 0328 0502 0530 0712 0829 1226 1227',
    2017: '0102 0317 0414 0417 0501 0529 0712 0828 1225 1226',
    2018: '0101 0319 0330 0402 0507 0528 0712 0827 1225 1226',
    2019: '0101 0318 0419 0422 0506 0527 0712 0826 1225 1226',
    2020: '0101 0317 0410 0413 0508 0525 0713 0831 1225 1228',
    2021: '0101 0317 0402 0405 0503 0531 0712 0830 1227 1228',
    2022: '0103 0317 0415 0418 0502 0602 0603 0712 0829 0919 1226 1227',
    2023: '0102 0317 0407 0410 0501 0508 0529 0712 0828 1225 1226',
    2024: '0101 0318 0329 0401 0506 0527 0712 0826 1225 1226',
    2025: '0101 0317 0418 0421 0505 0526 0714 0825 1225 1226',
    2026: '0101 0317 0403 0406 0504 0525 0713 0831 1225 1228',
    2027: '0101 0317 0326 0329 0503 0531 0712 0830 1227 1228',
    2028: '0103 0317 0414 0417 0501 0529 0712 0828 1225 1226',
  },
};

async function formatWith(page, chip, pattern) {
  await click(page, chip);
  await setField(page, 'Pattern', pattern);
  return k(page, 'df-out');
}

module.exports = [

  /* ---- Timesheet ---- */
  { name: 'timesheet: day, overnight and odd-minute shifts; weekly and daily overtime; CSV', tool: 'timesheet-calculator', run: async page => {
    await click(page, 'Clear times');
    await setAria(page, 'Start, row 1', '09:00'); await setAria(page, 'End, row 1', '1730'); await setAria(page, 'Unpaid break in minutes, row 1', '30');
    await setAria(page, 'Start, row 2', '22:00'); await setAria(page, 'End, row 2', '6.00'); await setAria(page, 'Unpaid break in minutes, row 2', '30');
    await setAria(page, 'Start, row 3', '8:15'); await setAria(page, 'End, row 3', '16:45'); await setAria(page, 'Unpaid break in minutes, row 3', '45');
    await setField(page, 'Hourly rate (£)', '12');
    await setField(page, 'Overtime after (hours)', '20');
    await setField(page, 'Overtime counted', 'week');
    await setField(page, 'Overtime rate (× hourly rate)', '1.5');
    const rows = await kAll(page, 'row-hm');
    const week = { total: await k(page, 'total-hm'), dec: await k(page, 'total-dec'), ot: await k(page, 'overtime-dec'), reg: await k(page, 'pay-regular'), otp: await k(page, 'pay-overtime'), pay: await k(page, 'pay-total') };
    const { text } = await download(page, 'Download CSV');
    await setField(page, 'Overtime after (hours)', '7.5');
    await setField(page, 'Overtime counted', 'day');
    const day = { ot: await k(page, 'overtime-dec'), pay: await k(page, 'pay-total') };
    /* 8:00 + 7:30 (22:00 to 06:00 less 30) + 7:45 = 23:15. Weekly: 20 h at £12 = £240 plus 3.25 h at £18 = £58.50.
       Daily over 7.5 h: 0.5 + 0 + 0.25 = 0.75 h, so 22.5 h × £12 + 0.75 h × £18 = £283.50. */
    const csvOk = /Mon,09:00,17:30,30,8:00,8\.00/.test(text) && /Tue,22:00,06:00,30,7:30,7\.50/.test(text) && /Total,,,,23:15,23\.25/.test(text) && /Total pay \(£\),298\.50/.test(text);
    return result(rows.join() === '8:00,7:30,7:45' && week.total === '23:15' && week.dec === '23.25' && week.ot === '3.25' && week.reg === '£240.00' &&
      week.otp === '£58.50' && week.pay === '£298.50' && day.ot === '0.75' && day.pay === '£283.50' && csvOk, { rows, week, day, csvOk, csv: text.slice(0, 160) });
  } },
  { name: 'timesheet: bad times and a break longer than the shift are flagged', tool: 'timesheet-calculator', run: async page => {
    await click(page, 'Clear times');
    await setAria(page, 'Start, row 1', '25:00'); await setAria(page, 'End, row 1', '17:00');
    await setAria(page, 'Start, row 2', '09:00'); await setAria(page, 'End, row 2', '10:00'); await setAria(page, 'Unpaid break in minutes, row 2', '90');
    await page.waitForTimeout(300);
    const t = await page.evaluate(() => document.querySelector('#view .note.err') ? document.querySelector('#view .note.err').textContent : '');
    const bad = await page.evaluate(() => document.querySelector('#view [aria-label="Start, row 1"]').classList.contains('bad'));
    return result(/Row 1/.test(t) && /Row 2: the break is longer/.test(t) && bad && (await k(page, 'total-hm')) === '0:00', t);
  } },

  /* ---- Date Format Converter ---- */
  { name: 'date format: Java SimpleDateFormat documentation examples (Unicode LDML)', tool: 'date-format', run: async page => {
    await setField(page, 'Time zone', 'America/Los_Angeles');
    await setField(page, 'Date and time', '2001-07-04T12:08:56.235');
    const cases = [
      ["yyyy.MM.dd G 'at' HH:mm:ss z", '2001.07.04 AD at 12:08:56 PDT'], ["EEE, MMM d, ''yy", "Wed, Jul 4, '01"], ['h:mm a', '12:08 PM'],
      ["hh 'o''clock' a, zzzz", "12 o'clock PM, Pacific Daylight Time"], ['K:mm a, z', '0:08 PM, PDT'], ['EEE, d MMM yyyy HH:mm:ss Z', 'Wed, 4 Jul 2001 12:08:56 -0700'],
      ['yyMMddHHmmssZ', '010704120856-0700'], ["yyyy-MM-dd'T'HH:mm:ss.SSSZ", '2001-07-04T12:08:56.235-0700'], ["yyyy-MM-dd'T'HH:mm:ss.SSSXXX", '2001-07-04T12:08:56.235-07:00']];
    const bad = [];
    for (const [p, want] of cases) { const got = await formatWith(page, 'Unicode LDML', p); if (got !== want) bad.push([p, got, want]); }
    return result(!bad.length, bad);
  } },
  { name: 'date format: Moment, Python strftime, .NET and Go documentation examples', tool: 'date-format', run: async page => {
    const bad = [];
    async function each(zone, when, chip, cases) {
      await setField(page, 'Time zone', zone);
      await setField(page, 'Date and time', when);
      for (const [p, want] of cases) { const got = await formatWith(page, chip, p); if (got !== want) bad.push([chip, p, got, want]); }
    }
    await each('UTC', '2010-02-14T15:25:50.000', 'Moment / Day.js', [['dddd, MMMM Do YYYY, h:mm:ss a', 'Sunday, February 14th 2010, 3:25:50 pm'], ['ddd, hA', 'Sun, 3PM'], ['[Today is] dddd', 'Today is Sunday']]);
    await each('UTC', '2006-11-21T16:30:00.000', 'strftime', [['%A, %d. %B %Y %I:%M%p', 'Tuesday, 21. November 2006 04:30PM'], ['%F %T', '2006-11-21 16:30:00'], ['%-d/%-m/%y %j', '21/11/06 325']]);
    await each('UTC', '2008-08-29T19:27:15.018', '.NET', [['hh:mm:ss.f', '07:27:15.0'], ['hh:mm:ss.F', '07:27:15'], ['hh:mm:ss.ff', '07:27:15.01'], ['hh:mm:ss.FF', '07:27:15.01'],
      ['hh:mm:ss.fff', '07:27:15.018'], ['hh:mm:ss.FFF', '07:27:15.018'], ['dddd, MMMM dd yyyy', 'Friday, August 29 2008'], ['%h', '7'], ['u', '2008-08-29 19:27:15Z']]);
    await each('Europe/London', '2008-08-29T19:27:15.018', '.NET', [['R', 'Fri, 29 Aug 2008 18:27:15 GMT'], ['zzz', '+01:00']]);
    await each('UTC', '2009-11-10T23:00:00.000', 'Go', [['2006-01-02T15:04:05Z07:00', '2009-11-10T23:00:00Z'], ['3:04PM', '11:00PM'], ['Mon, 02 Jan 2006 15:04:05 MST', 'Tue, 10 Nov 2009 23:00:00 UTC']]);
    await each('UTC', '2009-11-05T23:00:00.000', 'Go', [['Mon Jan _2 15:04:05 2006', 'Thu Nov  5 23:00:00 2009']]);
    return result(!bad.length, bad);
  } },
  { name: 'date format: translating a strftime pattern into the other syntaxes', tool: 'date-format', run: async page => {
    await setField(page, 'Time zone', 'Europe/London');
    await setField(page, 'Date and time', '2026-07-01T09:05:07.000');
    const out = await formatWith(page, 'strftime', '%Y-%m-%dT%H:%M:%S%z');
    const rows = await page.$$eval('#view tr[data-syntax]', rs => Object.fromEntries(rs.map(r => [r.dataset.syntax, [r.querySelector('[data-k="tr-pattern"]').textContent, r.querySelector('[data-k="tr-output"]').textContent, r.querySelector('[data-k="tr-notes"]').textContent]])));
    await click(page, 'Go');
    const switched = await page.evaluate(() => [...document.querySelectorAll('#view .field')].find(f => f.querySelector('label').textContent === 'Pattern').querySelector('input').value);
    const ok = out === '2026-07-01T09:05:07+0100' && rows.ldml[0] === "yyyy-MM-dd'T'HH:mm:ssxx" && rows.ldml[1] === out &&
      rows.moment[0] === 'YYYY-MM-DD[T]HH:mm:ssZZ' && rows.moment[1] === out && rows.go[0] === '2006-01-02T15:04:05-0700' && rows.go[1] === out &&
      rows.dotnet[0] === "yyyy-MM-dd'T'HH:mm:sszzz" && rows.dotnet[1] === '2026-07-01T09:05:07+01:00' && /cannot write the offset as \+0100/.test(rows.dotnet[2]) &&
      switched === '2006-01-02T15:04:05-0700' && (await k(page, 'df-out')) === out;
    return result(ok, { out, rows, switched });
  } },
  { name: 'date format: common formats and parsing strings with a pattern', tool: 'date-format', run: async page => {
    await setField(page, 'Time zone', 'Europe/London');
    await setField(page, 'Date and time', '2026-09-22T18:30:05.000');
    const cf = { iso: await k(page, 'cf-iso'), utc: await k(page, 'cf-iso-utc'), rfc: await k(page, 'cf-rfc2822'), http: await k(page, 'cf-http'), uk: await k(page, 'cf-uk'), us: await k(page, 'cf-us'), unix: await k(page, 'cf-unix'), week: await k(page, 'cf-iso-week') };
    const parse = async (chip, pattern, zone, text) => {
      await setField(page, 'Time zone', zone);
      await formatWith(page, chip, pattern);
      await setField(page, 'Text to read', text);
      await page.waitForTimeout(250);
      return (await k(page, 'df-parsed')) || await page.evaluate(() => (document.querySelector('#view .note.err') || {}).textContent || '');
    };
    const p1 = await parse('Moment / Day.js', 'dddd, MMMM Do YYYY, h:mm:ss a', 'UTC', 'Sunday, February 14th 2010, 3:25:50 pm');
    const p2 = await parse('Go', '2006-01-02T15:04:05Z07:00', 'UTC', '2009-11-10T23:00:00+05:30');
    const p3 = await parse('strftime', '%d/%m/%Y %H:%M', 'Europe/London', '22/09/2026 18:30');
    const p4 = await parse('strftime', '%d/%m/%Y %H:%M', 'Europe/London', '31/02/2026 10:00');
    const p5 = await parse('Unicode LDML', 'EEE, d MMM yy', 'UTC', 'Mon, 4 Jul 01');
    const note5 = await k(page, 'df-parse-note');
    /* 18:30 BST is 17:30 UTC; Unix time for 2026-09-22T17:30:05Z worked out from Date.UTC in Node. */
    const unix = String(Date.UTC(2026, 8, 22, 17, 30, 5) / 1000);
    const ok = cf.iso === '2026-09-22T18:30:05+01:00' && cf.utc === '2026-09-22T17:30:05.000Z' && cf.rfc === 'Tue, 22 Sep 2026 18:30:05 +0100' &&
      cf.http === 'Tue, 22 Sep 2026 17:30:05 GMT' && cf.uk === '22/09/2026 18:30' && cf.us === '09/22/2026 6:30 PM' && cf.unix === unix && cf.week === '2026-W39-2' &&
      p1 === '2010-02-14T15:25:50.000Z' && p2 === '2009-11-10T17:30:00.000Z' && p3 === '2026-09-22T17:30:00.000Z' && /February 2026 has 28 days/.test(p4) &&
      p5 === '2001-07-04T00:00:00.000Z' && /says Monday/.test(note5 || '');
    return result(ok, { cf, p1, p2, p3, p4, p5, note5 });
  } },

  /* ---- UK Bank Holidays ---- */
  { name: 'bank holidays: every nation matches GOV.UK for 2015–2028', tool: 'uk-bank-holidays', run: async page => {
    const diffs = [];
    for (const [nation, chip] of [['ew', 'England & Wales'], ['sc', 'Scotland'], ['ni', 'Northern Ireland']]) {
      await click(page, chip);
      for (const year of Object.keys(GOVUK[nation])) {
        await setField(page, 'Year', year);
        await page.waitForFunction(key => document.querySelector('#view table[data-bh="' + key + '"]'), nation + '-' + year, { timeout: 5000 });
        const got = await page.$$eval('#view table[data-bh] tr[data-date]', rs => rs.map(r => r.dataset.date.slice(5).replace('-', '')).join(' '));
        if (got !== GOVUK[nation][year]) diffs.push([nation, year, got, GOVUK[nation][year]]);
      }
    }
    return result(!diffs.length, diffs.slice(0, 4));
  } },
  { name: 'bank holidays: one-offs, labels, next holiday and the .ics download', tool: 'uk-bank-holidays', run: async page => {
    const rowsFor = async year => { await setField(page, 'Year', year); return page.$$eval('#view table[data-bh] tr[data-date]', rs => rs.map(r => r.dataset.date + ' ' + r.dataset.title)); };
    await click(page, 'England & Wales');
    const y2012 = await rowsFor(2012), y1995 = await rowsFor(1995), y1999 = await rowsFor(1999), y1981 = await rowsFor(1981), y2022 = await rowsFor(2022);
    await click(page, 'Scotland');
    const s2023 = await rowsFor(2023), s2006 = await rowsFor(2006);
    const has = (list, s) => list.some(r => r.startsWith(s));
    const oneOffs = has(y2012, '2012-06-04 Spring') && has(y2012, '2012-06-05 Queen’s Diamond Jubilee') && !has(y2012, '2012-05-28') &&
      has(y1995, '1995-05-08 Early May') && !has(y1995, '1995-05-01') && has(y1999, '1999-12-31 Millennium') &&
      has(y1999, '1999-12-27 Christmas Day (substitute day)') && has(y1999, '1999-12-28 Boxing Day (substitute day)') && has(y1981, '1981-07-29 Royal wedding') &&
      has(y2022, '2022-09-19 Bank Holiday for the State Funeral of Queen Elizabeth II') && has(y2022, '2022-06-03 Platinum Jubilee');
    const labels = has(s2023, '2023-01-02 New Year’s Day (substitute day)') && has(s2023, '2023-01-03 2nd January (substitute day)') && !s2006.some(r => /St Andrew/.test(r));
    /* The next holiday, worked out from the GOV.UK list for today's date. */
    await click(page, 'England & Wales');
    const today = await page.evaluate(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
    const y = +today.slice(0, 4);
    let nextOk = true, expectNext = null;
    if (GOVUK.ew[y] && GOVUK.ew[y + 1]) {
      expectNext = [y, y + 1].flatMap(yy => GOVUK.ew[yy].split(' ').map(md => yy + '-' + md.slice(0, 2) + '-' + md.slice(2))).find(d => d >= today);
      nextOk = (await kDate(page, 'bh-next')) === expectNext;
    }
    await click(page, 'Scotland');
    await setField(page, 'Year', 2026);
    const ics = await download(page, 'Download .ics for this year');
    const events = (ics.text.match(/BEGIN:VEVENT/g) || []).length;
    const icsOk = ics.name === 'uk-bank-holidays-sc-2026.ics' && events === 10 && /DTSTART;VALUE=DATE:20260615\r\nDTEND;VALUE=DATE:20260616\r\nSUMMARY:World Cup bank holiday/.test(ics.text) &&
      /SUMMARY:St Andrew’s Day/.test(ics.text) && /^BEGIN:VCALENDAR\r\nVERSION:2.0/.test(ics.text) && /END:VCALENDAR\r\n$/.test(ics.text);
    return result(oneOffs && labels && nextOk && icsOk, { oneOffs, labels, nextOk, expectNext, icsOk, events, s2023 });
  } },

  /* ---- Easter ---- */
  { name: 'easter: known Western and Orthodox dates, extremes and 2026 movable days', tool: 'easter-date', run: async page => {
    const at = async y => { await setField(page, 'Year', y); return [await kDate(page, 'easter-western'), await kDate(page, 'easter-orthodox')]; };
    const e24 = await at(2024), e25 = await at(2025), e1818 = await at(1818), e1943 = await at(1943), e2038 = await at(2038), e1583 = await at(1583), e26 = await at(2026);
    const feasts = await page.$$eval('#view table[data-feasts="western"] tr[data-feast]', rs => Object.fromEntries(rs.map(r => [r.dataset.feast, r.dataset.date])));
    const orth = await page.$$eval('#view table[data-feasts="orthodox"] tr[data-feast]', rs => Object.fromEntries(rs.map(r => [r.dataset.feast, r.dataset.date])));
    /* Shrove Tuesday 17 Feb 2026, Mothering Sunday 15 Mar 2026, Ascension 14 May, Pentecost 24 May, Corpus Christi 4 June. */
    const ok = e24[0] === '2024-03-31' && e24[1] === '2024-05-05' && e25[0] === '2025-04-20' && e25[1] === '2025-04-20' && e26[0] === '2026-04-05' && e26[1] === '2026-04-12' &&
      e1818[0] === '1818-03-22' && e1943[0] === '1943-04-25' && e2038[0] === '2038-04-25' && e1583[0] === '1583-04-10' &&
      feasts.shrove === '2026-02-17' && feasts.ash === '2026-02-18' && feasts.mothering === '2026-03-15' && feasts.palm === '2026-03-29' && feasts['good-friday'] === '2026-04-03' &&
      feasts.ascension === '2026-05-14' && feasts.pentecost === '2026-05-24' && feasts.trinity === '2026-05-31' && feasts['corpus-christi'] === '2026-06-04' &&
      orth['great-friday'] === '2026-04-10' && orth.pentecost === '2026-05-31';
    return result(ok, { e24, e25, e26, e1818, e1943, e2038, e1583, feasts, orth });
  } },
  { name: 'easter: a range of years and its CSV', tool: 'easter-date', run: async page => {
    await setField(page, 'From', 2024); await setField(page, 'To', 2026);
    const rows = await page.$$eval('#view tr[data-year]', rs => rs.map(r => r.dataset.year + ' ' + r.dataset.western + ' ' + r.dataset.orthodox));
    const { text } = await download(page, 'Download CSV');
    return result(rows.join('|') === '2024 2024-03-31 2024-05-05|2025 2025-04-20 2025-04-20|2026 2026-04-05 2026-04-12' && /2025,2025-04-20,2025-04-20/.test(text), { rows, text });
  } },

  /* ---- Time Zone Converter (ported from the merged Multi-Timezone Converter) ---- */
  { name: 'timezone converter: London summer time to Los Angeles, and toggling zones (was multi-timezone)', tool: 'timezone-converter', run: async page => {
    await setField(page, 'Date & Time', '2024-07-01T12:00');
    await setField(page, 'From Timezone', 'Europe/London');
    const la = await page.$eval('#view .card[data-zone="America/Los_Angeles"]', c => c.innerText);
    await page.click('#view .chip[data-zone="Asia/Dubai"]');
    await page.waitForTimeout(200);
    const dubai = await page.$eval('#view .card[data-zone="Asia/Dubai"]', c => c.innerText);
    return result(/\b04:00\b/.test(la) && !/AM|PM/.test(la) && /UTC-7/.test(la) && /\b15:00\b/.test(dubai) && /UTC\+4/.test(dubai) && /Mon 1 Jul/.test(la), [la, dubai]);
  } },
  { name: 'time.js UK formats: Monday-first calendar, written-out dates, dd/mm/yyyy and 24-hour times', tool: 'day-of-year', run: async page => {
    await setField(page, 'Date', '2026-09-22');
    const cal = await page.evaluate(() => { const g = document.querySelector('#view .cal'); return { head: [...g.querySelectorAll('.hd')].map(n => n.textContent).join(','), blanks: [...g.children].filter(n => !n.textContent).length, title: g.previousElementSibling.textContent }; });
    await page.goto(page.url().replace(/#.*/, '#/t/week-number'));
    await page.waitForSelector('#view table.data');
    await setField(page, 'Week (YYYY-Www)', '2026-W01');
    const row = await page.$eval('#view table.data tbody tr', r => r.innerText.split(/\t/).join('|'));
    await page.goto(page.url().replace(/#.*/, '#/t/timestamp-converter'));
    await page.waitForSelector('#view [data-fmt="Date Only"]');
    await setField(page, 'Date & Time', '2024-02-29T18:05');
    const d = await page.$eval('#view [data-fmt="Date Only"]', n => n.textContent), t = await page.$eval('#view [data-fmt="Time Only"]', n => n.textContent);
    /* 1 September 2026 is a Tuesday, so a Monday-first grid starts with one blank. */
    const ok = cal.head === 'Mo,Tu,We,Th,Fr,Sa,Su' && cal.blanks === 1 && cal.title === 'All days in September 2026' && row === 'Mon|29 December 2025|2025-12-29' && d === '29/02/2024' && t === '18:05:00';
    return result(ok, { cal, row, d, t });
  } }
];
