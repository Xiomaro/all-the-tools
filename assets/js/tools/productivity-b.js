/* productivity-b tools: a CV builder with printable templates and a meeting
   cost timer. Like the rest of Productivity, what you type stays in this
   browser's localStorage, with JSON export and import for backups. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-prodb-style')) {
    document.head.appendChild(el('style', { id: 'g-prodb-style', text: [
      '.g-prodb .muted { color: var(--fg-muted); font-size: 13px; }',
      '.g-prodb .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; }',
      '.g-prodb .toolbar > .field { flex: 0 1 170px; }',
      '.g-prodb details.sec { border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 12px; background: var(--bg-elev); }',
      '.g-prodb details.sec + details.sec { margin-top: 10px; }',
      '.g-prodb details.sec > summary { cursor: pointer; font-weight: 700; }',
      '.g-prodb details.sec[open] > summary { margin-bottom: 10px; }',
      '.g-prodb .grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }',
      '.g-prodb .entry { border: 1px solid var(--border); border-radius: var(--radius-s); padding: 10px; margin-bottom: 10px; background: var(--bg); }',
      '.g-prodb .entry-head { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }',
      '.g-prodb .entry-head b { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
      '.g-prodb .entry-head .btn { padding: 2px 9px; }',
      '.g-prodb .entry textarea, .g-prodb details.sec textarea { min-height: 84px; }',
      '.g-prodb .cv-split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); gap: 16px; align-items: start; }',
      '@media (max-width: 980px) { .g-prodb .cv-split { grid-template-columns: minmax(0, 1fr); } }',
      '.g-prodb .cv-split > .panel { margin-top: 0; min-width: 0; }',
      '.g-prodb .cv-stage { overflow: hidden; background: var(--bg-sunken); border-radius: var(--radius-s); padding: 12px; }',
      '.g-prodb .cv-scale { transform-origin: top left; }',
      '.g-prodb .cv-scale .cv-page { box-shadow: 0 2px 14px rgb(0 0 0 / 18%); }',
      '.g-prodb .cv-sticky { position: sticky; top: 12px; }',
      /* meeting cost */
      '.g-prodb .mc-face { text-align: center; padding: 20px 8px 14px; border-radius: var(--radius); background: var(--bg-sunken); border: 1px solid var(--border); }',
      '.g-prodb .mc-cost { font-family: var(--mono); font-variant-numeric: tabular-nums; font-weight: 700; font-size: clamp(40px, 10vw, 92px); line-height: 1.05; }',
      '.g-prodb .mc-face.running .mc-cost { color: var(--accent); }',
      '.g-prodb .mc-time { font-family: var(--mono); font-variant-numeric: tabular-nums; color: var(--fg-muted); font-size: clamp(16px, 3vw, 22px); margin-top: 4px; }',
      '.g-prodb .mc-fun { margin-top: 10px; font-size: 17px; min-height: 1.5em; }',
      '.g-prodb .mc-face:fullscreen { display: flex; flex-direction: column; justify-content: center; background: var(--bg); border: 0; border-radius: 0; }',
      '.g-prodb .mc-face:fullscreen .mc-cost { font-size: 15vw; }',
      '.g-prodb .mc-face:fullscreen .mc-time, .g-prodb .mc-face:fullscreen .mc-fun { font-size: 3.4vw; }',
      '.g-prodb .mc-controls { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 14px; }',
      '.g-prodb .mc-controls .btn { min-width: 100px; }',
      '.g-prodb .btn.danger { background: var(--err); border-color: var(--err); color: #fff; }',
      '.g-prodb .mc-line { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, .8fr) minmax(0, 1.3fr) minmax(0, 1.2fr) auto; gap: 8px; align-items: end; padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid var(--border); }',
      '@media (max-width: 640px) { .g-prodb .mc-line { grid-template-columns: 1fr 1fr; } .g-prodb .mc-line > .field:first-child { grid-column: 1 / -1; } }',
      '.g-prodb .mc-line .btn { padding: 8px 10px; }',
      '.g-prodb .mc-quick { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 10px; }',
      '.g-prodb .mc-quick .btn { padding: 3px 10px; font-size: 13px; }',

      /* ---- CV sheets: always ink on paper, whatever the site theme ---- */
      '.cv-page { background: #fff; color: #1d1d1f; box-sizing: border-box; font-size: 10pt; line-height: 1.42; position: relative; overflow-wrap: anywhere; }',
      '.cv-page * { box-sizing: border-box; }',
      '.cv-page a { color: inherit; text-decoration: none; }',
      '.cv-page h1 { margin: 0; font-size: 22pt; line-height: 1.1; font-weight: 700; color: #111; }',
      '.cv-page .cv-headline { font-size: 11.5pt; color: var(--cv-accent); margin-top: 3pt; font-weight: 600; }',
      '.cv-page .cv-contact { display: flex; flex-wrap: wrap; gap: 2pt 12pt; margin-top: 6pt; color: #444; font-size: 9pt; }',
      '.cv-page h2 { font-size: 10.5pt; text-transform: uppercase; letter-spacing: .09em; color: var(--cv-accent); margin: 14pt 0 6pt; font-weight: 700; }',
      '.cv-page .cv-item { margin-bottom: 8pt; break-inside: avoid; page-break-inside: avoid; }',
      '.cv-page .cv-row { display: flex; justify-content: space-between; gap: 10pt; align-items: baseline; }',
      '.cv-page .cv-role { font-weight: 700; color: #111; }',
      '.cv-page .cv-org { color: #333; }',
      '.cv-page .cv-when { color: #555; font-size: 9pt; white-space: nowrap; flex-shrink: 0; }',
      '.cv-page ul { margin: 3pt 0 0; padding-left: 14pt; }',
      '.cv-page li { margin: 1pt 0; }',
      '.cv-page p { margin: 0 0 4pt; }',
      '.cv-page .cv-skill-group { margin-bottom: 3pt; }',
      '.cv-page .cv-skill-group b { color: #111; }',
      '.cv-page .cv-guide { position: absolute; left: 0; right: 0; border-top: 1px dashed #c33; pointer-events: none; }',
      '.cv-page .cv-guide span { position: absolute; right: 4px; top: 2px; font: 8pt system-ui, sans-serif; color: #c33; background: #fff; padding: 0 3px; }',
      /* classic */
      '.cv-page.t-classic { font-family: Georgia, "Times New Roman", serif; }',
      '.cv-page.t-classic .cv-head { text-align: center; border-bottom: 1.5pt solid var(--cv-accent); padding-bottom: 8pt; }',
      '.cv-page.t-classic .cv-contact { justify-content: center; }',
      '.cv-page.t-classic h2 { border-bottom: .75pt solid #bbb; padding-bottom: 2pt; letter-spacing: .06em; }',
      /* modern */
      '.cv-page.t-modern { font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; display: grid; grid-template-columns: 34% 66%; }',
      '.cv-page.t-modern .cv-side { background: var(--cv-tint); padding: 16mm 7mm 12mm 12mm; }',
      '.cv-page.t-modern .cv-main { padding: 16mm 12mm 12mm 9mm; }',
      '.cv-page.t-modern .cv-head { margin-bottom: 4pt; }',
      '.cv-page.t-modern .cv-side .cv-contact { flex-direction: column; gap: 3pt; margin-top: 0; }',
      '.cv-page.t-modern .cv-side h2:first-child, .cv-page.t-modern .cv-main > h2:first-child { margin-top: 0; }',
      '.cv-page.t-modern .cv-side .cv-row { flex-direction: column; gap: 0; }',
      '.cv-page.t-modern h1 { font-size: 24pt; }',
      /* compact */
      '.cv-page.t-compact { font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 9.3pt; line-height: 1.35; }',
      '.cv-page.t-compact .cv-head { display: flex; justify-content: space-between; gap: 12pt; align-items: flex-end; border-bottom: 2pt solid var(--cv-accent); padding-bottom: 6pt; }',
      '.cv-page.t-compact .cv-contact { flex-direction: column; align-items: flex-end; gap: 1pt; margin-top: 0; text-align: right; }',
      '.cv-page.t-compact h1 { font-size: 19pt; }',
      '.cv-page.t-compact h2 { margin: 10pt 0 4pt; font-size: 9.5pt; }',
      '.cv-page.t-compact .cv-item { margin-bottom: 6pt; }',
      '@media print { .cv-page .cv-guide { display: none !important; } }'
    ].join('\n') }));
  }

  /* ---- storage (same "att:" namespace as the other Productivity tools) ---- */
  function load(key, fallback) {
    try { var s = localStorage.getItem('att:' + key); return s ? JSON.parse(s) : fallback; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem('att:' + key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function importJson(onData) {
    var picker = el('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
    picker.addEventListener('change', function () {
      var f = picker.files[0];
      picker.remove();
      if (!f) return;
      U.readAs(f, 'text').then(function (text) {
        var data;
        try { data = JSON.parse(text); } catch (e) { throw new Error('That file is not valid JSON'); }
        onData(data);
      }).catch(function (err) { U.toast(err.message || String(err), 'err'); });
    });
    document.body.appendChild(picker);
    picker.click();
  }

  /* =======================================================================
     CV Builder
     ======================================================================= */

  var PAPER = { a4: { w: 210, h: 297, label: 'A4' }, letter: { w: 215.9, h: 279.4, label: 'US Letter' } };
  var TEMPLATES = [{ value: 'classic', label: 'Classic' }, { value: 'modern', label: 'Modern' }, { value: 'compact', label: 'Compact' }];

  function blankCv() {
    return {
      template: 'classic', paper: (window.Region && Region.get().paper) || 'a4', accent: '#1f4e79',
      contact: { name: '', headline: '', email: '', phone: '', location: '', website: '', linkedin: '' },
      profile: '',
      experience: [], education: [], skills: [], extras: []
    };
  }

  function exampleCv() {
    return {
      template: 'classic', paper: (window.Region && Region.get().paper) || 'a4', accent: '#1f4e79',
      contact: { name: 'Sam Taylor', headline: 'Operations Manager', email: 'sam.taylor@example.com', phone: '07700 900123',
        location: 'Leeds', website: '', linkedin: 'linkedin.com/in/samtaylor' },
      profile: 'Operations manager with eight years in logistics and retail, leading teams of up to 30 people. I like untangling messy processes, and I have cut costs and delivery times at two businesses by doing exactly that.',
      experience: [
        { title: 'Operations Manager', org: 'Northway Distribution', location: 'Leeds', start: 'Mar 2021', end: 'Present',
          bullets: 'Run day-to-day operations for a 120,000 sq ft warehouse and a team of 30\nCut average order turnaround from 3 days to 1.5 by redesigning pick routes\nIntroduced a weekly safety walk; reportable incidents fell by 40%' },
        { title: 'Shift Supervisor', org: 'Harbour Retail Group', location: 'Bradford', start: 'Jun 2017', end: 'Feb 2021',
          bullets: 'Supervised shifts of up to 15 staff across goods-in and dispatch\nTrained 20 new starters and wrote the induction handbook still in use' }
      ],
      education: [
        { qualification: 'BA (Hons) Business Management, 2:1', institution: 'University of Leeds', start: '2014', end: '2017', detail: 'Dissertation on last-mile delivery costs' },
        { qualification: 'A levels: Maths (A), Economics (B), Geography (B)', institution: 'Leeds City College', start: '2012', end: '2014', detail: '' }
      ],
      skills: [
        { group: 'Operations', items: 'Lean, process mapping, WMS (SAP EWM), health and safety, budgeting' },
        { group: 'Software', items: 'Excel (pivot tables, Power Query), Power BI, Google Workspace' },
        { group: 'Languages', items: 'English (native), Spanish (conversational)' }
      ],
      extras: [
        { heading: 'Certifications', body: 'IOSH Managing Safely (2022)\nFull UK driving licence' },
        { heading: 'Interests', body: 'Fell running, volunteer coach at a junior football club' },
        { heading: 'References', body: 'Available on request' }
      ]
    };
  }

  /* Repair whatever comes back from storage or an imported file. */
  function normaliseCv(d) {
    var cv = blankCv();
    if (!d || typeof d !== 'object') return cv;
    ['template', 'paper', 'accent', 'profile'].forEach(function (k) { if (typeof d[k] === 'string') cv[k] = d[k]; });
    if (!TEMPLATES.some(function (t) { return t.value === cv.template; })) cv.template = 'classic';
    if (!PAPER[cv.paper]) cv.paper = 'a4';
    if (!/^#[0-9a-f]{6}$/i.test(cv.accent)) cv.accent = '#1f4e79';
    if (d.contact && typeof d.contact === 'object') Object.keys(cv.contact).forEach(function (k) { if (typeof d.contact[k] === 'string') cv.contact[k] = d.contact[k]; });
    var str = function (o, keys) { var r = {}; keys.forEach(function (k) { r[k] = o && typeof o[k] === 'string' ? o[k] : ''; }); return r; };
    var list = function (v, keys) { return Array.isArray(v) ? v.filter(function (x) { return x && typeof x === 'object'; }).map(function (x) { return str(x, keys); }) : []; };
    cv.experience = list(d.experience, ['title', 'org', 'location', 'start', 'end', 'bullets']);
    cv.education = list(d.education, ['qualification', 'institution', 'start', 'end', 'detail']);
    cv.skills = list(d.skills, ['group', 'items']);
    cv.extras = list(d.extras, ['heading', 'body']);
    return cv;
  }

  function lines(text) {
    return String(text || '').split(/\r?\n/).map(function (l) { return l.replace(/^\s*(?:[-*•–]\s+)?/, '').trim(); }).filter(Boolean);
  }
  function when(a, b) {
    a = (a || '').trim(); b = (b || '').trim();
    return a && b ? a + ' – ' + b : a || b;
  }
  function href(v, kind) {
    v = (v || '').trim();
    if (!v) return null;
    if (kind === 'email') return 'mailto:' + v;
    if (kind === 'phone') return 'tel:' + v.replace(/[^\d+]/g, '');
    return /^https?:\/\//i.test(v) ? v : 'https://' + v;
  }
  function tint(hex, t) {
    var m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return '#eef2f7';
    var mix = function (i) { return Math.round(parseInt(m[i], 16) * t + 255 * (1 - t)).toString(16).padStart(2, '0'); };
    return '#' + mix(1) + mix(2) + mix(3);
  }

  /* The CV as a DOM tree, laid out at real paper size in millimetres. */
  function buildCv(cv, opts) {
    opts = opts || {};
    var p = PAPER[cv.paper] || PAPER.a4;
    var c = cv.contact;
    var contactBits = [
      c.email && el('a', { href: href(c.email, 'email'), text: c.email }),
      c.phone && el('a', { href: href(c.phone, 'phone'), text: c.phone }),
      c.location && el('span', { text: c.location }),
      c.website && el('a', { href: href(c.website), text: c.website.replace(/^https?:\/\//i, '') }),
      c.linkedin && el('a', { href: href(c.linkedin), text: c.linkedin.replace(/^https?:\/\/(www\.)?/i, '') })
    ].filter(Boolean);
    var contact = contactBits.length ? el('div', { class: 'cv-contact' }, contactBits) : null;
    var head = el('div', { class: 'cv-head' },
      el('div', null,
        el('h1', { text: c.name || 'Your Name' }),
        c.headline ? el('div', { class: 'cv-headline', text: c.headline }) : null),
      cv.template === 'modern' ? null : contact);

    function section(title, kids) {
      kids = (kids || []).filter(Boolean);
      return kids.length ? [el('h2', { text: title })].concat(kids) : [];
    }
    var profile = lines(cv.profile).length ? section('Profile', cv.profile.split(/\n\s*\n/).map(function (para) {
      return para.trim() ? el('p', { text: para.trim() }) : null;
    })) : [];
    var experience = section('Experience', cv.experience.map(function (e) {
      if (!e.title && !e.org && !e.bullets) return null;
      var orgLine = [e.org, e.location].filter(Boolean).join(', ');
      var b = lines(e.bullets);
      return el('div', { class: 'cv-item' },
        el('div', { class: 'cv-row' }, el('span', { class: 'cv-role', text: e.title || e.org }), el('span', { class: 'cv-when', text: when(e.start, e.end) })),
        e.title && orgLine ? el('div', { class: 'cv-org', text: orgLine }) : null,
        b.length ? el('ul', null, b.map(function (l) { return el('li', { text: l }); })) : null);
    }));
    var education = section('Education', cv.education.map(function (e) {
      if (!e.qualification && !e.institution) return null;
      return el('div', { class: 'cv-item' },
        el('div', { class: 'cv-row' }, el('span', { class: 'cv-role', text: e.qualification || e.institution }), el('span', { class: 'cv-when', text: when(e.start, e.end) })),
        e.qualification && e.institution ? el('div', { class: 'cv-org', text: e.institution }) : null,
        e.detail ? el('div', { text: e.detail }) : null);
    }));
    var skills = section('Skills', cv.skills.map(function (s) {
      if (!s.items && !s.group) return null;
      return el('div', { class: 'cv-skill-group' }, s.group ? el('b', { text: s.group + (s.items ? ': ' : '') }) : null, s.items || '');
    }));
    var extras = [];
    cv.extras.forEach(function (x) {
      var l = lines(x.body);
      if (!x.heading && !l.length) return;
      extras = extras.concat(section(x.heading || 'Additional information', [
        l.length > 1 ? el('ul', null, l.map(function (t) { return el('li', { text: t }); })) : l.length ? el('p', { text: l[0] }) : null
      ]));
    });

    var page = el('div', { class: 'cv-page t-' + cv.template, style: {
      width: p.w + 'mm', minHeight: p.h + 'mm', '--cv-accent': cv.accent, '--cv-tint': tint(cv.accent, 0.1)
    } });
    if (cv.template === 'modern') {
      var side = el('div', { class: 'cv-side' }, contact ? [el('h2', { text: 'Contact' }), contact] : null, skills, extras);
      var main = el('div', { class: 'cv-main' }, head, profile, experience, education);
      page.append(side, main);
    } else {
      page.style.padding = cv.template === 'compact' ? '12mm 13mm' : '15mm 16mm';
      page.append(head, el('div', null, profile, experience, education, skills, extras));
    }
    if (opts.guides) page.dataset.guides = '1';
    return page;
  }

  /* Dashed lines where each printed page will end. */
  function addGuides(page, cv) {
    var p = PAPER[cv.paper] || PAPER.a4;
    page.querySelectorAll('.cv-guide').forEach(function (g) { g.remove(); });
    var pxPerMm = page.offsetWidth / p.w;
    if (!pxPerMm) return 1;
    var pages = Math.max(1, Math.ceil(page.scrollHeight / (p.h * pxPerMm) - 0.01));
    for (var i = 1; i < pages; i++) {
      page.appendChild(el('div', { class: 'cv-guide', style: { top: (i * p.h) + 'mm' } }, el('span', { text: 'Page ' + (i + 1) })));
    }
    return pages;
  }

  function printCv(cv) {
    var p = PAPER[cv.paper] || PAPER.a4;
    var old = document.getElementById('g-prodb-print');
    if (old) old.remove();
    var style = document.getElementById('g-prodb-print-style');
    if (!style) { style = el('style', { id: 'g-prodb-print-style' }); document.head.appendChild(style); }
    /* The modern template's side column is painted by its background, so it
       prints edge to edge with no page margin and fills the first sheet. The
       others take their top and bottom space from the page margin instead of
       their own padding, so every page after the first gets it too. */
    var modern = cv.template === 'modern';
    style.textContent = '@media screen { #g-prodb-print { display: none !important; } }\n' +
      '@media print { body.g-prodb-printing > *:not(#g-prodb-print) { display: none !important; } ' +
      'body.g-prodb-printing { margin: 0 !important; background: #fff !important; } ' +
      'html, body.g-prodb-printing { -webkit-print-color-adjust: exact; print-color-adjust: exact; } ' +
      (modern ? '#g-prodb-print .cv-page { min-height: ' + (p.h - 0.5) + 'mm !important; } }\n'
              : '#g-prodb-print .cv-page { min-height: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important; } }\n') +
      '@page { size: ' + p.w + 'mm ' + p.h + 'mm; margin: ' + (modern ? '0' : '13mm 0') + '; }';
    var host = el('div', { id: 'g-prodb-print' }, buildCv(cv));
    document.body.appendChild(host);
    document.body.classList.add('g-prodb-printing');
    function done() {
      window.removeEventListener('afterprint', done);
      document.body.classList.remove('g-prodb-printing');
      host.remove();
      style.textContent = '';
    }
    window.addEventListener('afterprint', done);
    try { window.print(); } catch (e) { done(); U.toast('Printing is not available in this browser', 'err'); }
  }

  function cvText(cv) {
    var c = cv.contact, out = [];
    out.push(c.name || 'Your Name');
    if (c.headline) out.push(c.headline);
    var cl = [c.email, c.phone, c.location, c.website, c.linkedin].filter(Boolean);
    if (cl.length) out.push(cl.join(' | '));
    function head(t) { out.push('', t.toUpperCase()); }
    if (cv.profile.trim()) { head('Profile'); out.push(cv.profile.trim()); }
    var ex = cv.experience.filter(function (e) { return e.title || e.org; });
    if (ex.length) {
      head('Experience');
      ex.forEach(function (e) {
        out.push([e.title, [e.org, e.location].filter(Boolean).join(', ')].filter(Boolean).join(', ') + (when(e.start, e.end) ? ' (' + when(e.start, e.end) + ')' : ''));
        lines(e.bullets).forEach(function (l) { out.push('- ' + l); });
      });
    }
    var ed = cv.education.filter(function (e) { return e.qualification || e.institution; });
    if (ed.length) {
      head('Education');
      ed.forEach(function (e) {
        out.push([e.qualification, e.institution].filter(Boolean).join(', ') + (when(e.start, e.end) ? ' (' + when(e.start, e.end) + ')' : ''));
        if (e.detail) out.push(e.detail);
      });
    }
    var sk = cv.skills.filter(function (s) { return s.items || s.group; });
    if (sk.length) { head('Skills'); sk.forEach(function (s) { out.push((s.group ? s.group + ': ' : '') + s.items); }); }
    cv.extras.forEach(function (x) { if (x.heading || x.body) { head(x.heading || 'Additional information'); lines(x.body).forEach(function (l) { out.push(l); }); } });
    return out.join('\n');
  }

  var CV_LISTS = {
    experience: {
      title: 'Experience', add: '+ Add a job', blank: { title: '', org: '', location: '', start: '', end: '', bullets: '' },
      label: function (e) { return e.title || e.org || 'New role'; },
      fields: [['title', 'Job title'], ['org', 'Employer'], ['location', 'Location'], ['start', 'From', 'e.g. Mar 2021'], ['end', 'To', 'e.g. Present'],
        ['bullets', 'What you did and achieved', 'One point per line. Lead with results and numbers.', true]]
    },
    education: {
      title: 'Education', add: '+ Add a qualification', blank: { qualification: '', institution: '', start: '', end: '', detail: '' },
      label: function (e) { return e.qualification || e.institution || 'New qualification'; },
      fields: [['qualification', 'Qualification', 'e.g. BSc (Hons) Computing, 2:1'], ['institution', 'School, college or university'], ['start', 'From'], ['end', 'To'],
        ['detail', 'Details (optional)', 'Modules, dissertation or grades']]
    },
    skills: {
      title: 'Skills', add: '+ Add a skills group', blank: { group: '', items: '' },
      label: function (e) { return e.group || 'Skills'; },
      fields: [['group', 'Group (optional)', 'e.g. Software, Languages'], ['items', 'Skills', 'Comma-separated']]
    },
    extras: {
      title: 'Extra sections', add: '+ Add a section', blank: { heading: '', body: '' },
      label: function (e) { return e.heading || 'New section'; },
      fields: [['heading', 'Heading', 'e.g. Certifications, Volunteering, Interests, References'], ['body', 'Content', 'One item per line', true]]
    }
  };

  Tools.register({
    id: 'cv-builder', category: 'productivity', name: 'CV Builder',
    description: 'Write a CV in a form and see it laid out live on A4 or US Letter, with three clean templates. Save as PDF, copy as plain text, or back it up as JSON.',
    keywords: ['cv', 'resume', 'résumé', 'curriculum vitae', 'cv maker', 'cv template', 'job application', 'cv to pdf', 'resume builder', 'career'],
    render: function (root) {
      root.classList.add('g-prodb');
      var cv = normaliseCv(load('cv-builder', null) || exampleCv());
      var saveSoon = U.debounce(function () { save('cv-builder', cv); }, 300);

      /* --- preview ------------------------------------------------------ */
      var stage = el('div', { class: 'cv-stage' });
      var scaler = el('div', { class: 'cv-scale' });
      stage.appendChild(scaler);
      var pageInfo = el('span', { class: 'muted' });
      var page = null;
      function fit() {
        if (!page) return;
        var avail = stage.clientWidth - 24;
        var natural = page.offsetWidth;
        if (!avail || !natural) return;
        var s = Math.min(1, avail / natural);
        scaler.style.transform = 'scale(' + s + ')';
        scaler.style.width = natural + 'px';
        stage.style.height = (page.offsetHeight * s + 24) + 'px';
      }
      function preview() {
        page = buildCv(cv, { guides: true });
        scaler.replaceChildren(page);
        var n = addGuides(page, cv);
        pageInfo.textContent = (PAPER[cv.paper] || PAPER.a4).label + ' · ' + n + (n === 1 ? ' page' : ' pages') + (n > 2 ? ' (most UK employers expect two at most)' : '');
        fit();
      }
      var refresh = U.debounce(preview, 120);
      function changed() { saveSoon(); refresh(); }
      var ro = window.ResizeObserver ? new ResizeObserver(function () { fit(); }) : null;
      if (ro) ro.observe(stage);
      U.onTeardown(root, function () { if (ro) ro.disconnect(); save('cv-builder', cv); });

      /* --- form --------------------------------------------------------- */
      function bound(obj, key, label, hint, multi) {
        var node = (multi ? U.textarea : U.input)({ label: label, value: obj[key] || '', placeholder: hint || '', spellcheck: multi ? true : null });
        var ctl = node.querySelector('input, textarea');
        ctl.addEventListener('input', function () { obj[key] = ctl.value; changed(); });
        return node;
      }

      var form = el('div');
      function drawForm() {
        var c = cv.contact;
        var secs = [];
        secs.push(el('details', { class: 'sec', open: true }, el('summary', { text: 'Contact details' }),
          el('div', { class: 'grid2' },
            bound(c, 'name', 'Full name'), bound(c, 'headline', 'Headline', 'e.g. Senior Accountant'),
            bound(c, 'email', 'Email'), bound(c, 'phone', 'Phone'),
            bound(c, 'location', 'Town or city', 'A town is enough; no need for a full address'),
            bound(c, 'linkedin', 'LinkedIn (optional)'), bound(c, 'website', 'Website or portfolio (optional)'))));
        secs.push(el('details', { class: 'sec', open: true }, el('summary', { text: 'Profile' }),
          bound(cv, 'profile', 'Personal statement', 'Three or four lines on who you are, what you are good at and what you want next.', true)));

        Object.keys(CV_LISTS).forEach(function (key) {
          var spec = CV_LISTS[key], items = cv[key];
          var body = el('div');
          items.forEach(function (item, i) {
            var title = el('b', { text: spec.label(item) });
            var move = function (d) { return function () { var j = i + d; if (j < 0 || j >= items.length) return; items.splice(j, 0, items.splice(i, 1)[0]); changed(); drawForm(); }; };
            var head = el('div', { class: 'entry-head' }, title,
              U.button('↑', move(-1), 'ghost'), U.button('↓', move(1), 'ghost'),
              U.button('✕', function () { items.splice(i, 1); changed(); drawForm(); }, 'ghost'));
            head.children[1].title = 'Move up'; head.children[2].title = 'Move down'; head.children[3].title = 'Remove';
            head.children[1].disabled = i === 0; head.children[2].disabled = i === items.length - 1;
            var short = spec.fields.filter(function (f) { return !f[3]; }), long = spec.fields.filter(function (f) { return f[3]; });
            var grid = el('div', { class: 'grid2' }, short.map(function (f) { return bound(item, f[0], f[1], f[2]); }));
            var entry = el('div', { class: 'entry' }, head, grid, long.map(function (f) { return bound(item, f[0], f[1], f[2], true); }));
            entry.addEventListener('input', function () { title.textContent = spec.label(item); });
            body.appendChild(entry);
          });
          secs.push(el('details', { class: 'sec', open: items.length > 0 || key === 'experience' }, el('summary', { text: spec.title + (items.length ? ' (' + items.length + ')' : '') }),
            body, U.btnrow(U.button(spec.add, function () { items.push(clone(spec.blank)); changed(); drawForm(); }))));
        });
        form.replaceChildren.apply(form, secs);
      }

      /* --- toolbar ------------------------------------------------------ */
      var tpl = U.select({ label: 'Template', options: TEMPLATES, value: cv.template });
      var paper = U.select({ label: 'Paper', options: [{ value: 'a4', label: 'A4' }, { value: 'letter', label: 'US Letter' }], value: cv.paper });
      var accent = U.input({ label: 'Accent colour', type: 'color', value: cv.accent });
      [[tpl, 'template'], [paper, 'paper'], [accent, 'accent']].forEach(function (pair) {
        var ctl = pair[0].querySelector('select, input');
        ctl.addEventListener('input', function () { cv[pair[1]] = ctl.value; changed(); });
        ctl.addEventListener('change', function () { cv[pair[1]] = ctl.value; changed(); });
      });
      function replaceAll(next) {
        cv = normaliseCv(next);
        tpl.querySelector('select').value = cv.template;
        paper.querySelector('select').value = cv.paper;
        accent.querySelector('input').value = cv.accent;
        save('cv-builder', cv);
        drawForm(); preview();
      }
      var fileBase = function () { return ((cv.contact.name || 'cv').trim().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'cv') + '-cv'; };

      root.appendChild(U.panel(null,
        el('div', { class: 'toolbar' }, tpl, paper, accent,
          U.btnrow(
            U.button('Save as PDF', function () { save('cv-builder', cv); printCv(cv); }, 'primary'),
            U.copyBtn('Copy as text', function () { return cvText(cv); }),
            U.button('Export JSON', function () { U.saveText(fileBase() + '.json', JSON.stringify(cv, null, 2), 'application/json'); }),
            U.button('Import JSON', function () { importJson(function (d) { replaceAll(d); U.toast('CV imported'); }); }),
            U.button('Load example', function () { replaceAll(exampleCv()); }, 'ghost'),
            U.button('Start blank', function () { replaceAll(blankCv()); }, 'ghost'))),
        U.note('"Save as PDF" opens the print dialog: pick "Save as PDF" as the printer and turn off headers and footers. UK CVs usually leave out a photo, date of birth and marital status.')));

      var previewPanel = U.panel(null, el('div', { class: 'toolbar', style: { justifyContent: 'space-between', marginBottom: '8px' } }, el('b', { text: 'Preview' }), pageInfo), stage);
      previewPanel.classList.add('cv-sticky');
      root.appendChild(el('div', { class: 'cv-split' }, U.panel(null, form), previewPanel));
      root.appendChild(U.note('Everything is saved in this browser as you type. Use Export JSON to keep a backup or move it to another device.'));

      drawForm();
      preview();
      requestAnimationFrame(fit);
    }
  });

  /* =======================================================================
     Meeting Cost Timer
     ======================================================================= */

  /* Rough prices for the "that's a ..." milestones, in pounds, and very rough
     multipliers to put them into other currencies. They are for fun, not for
     accounting, so they are not kept up to date like the finance rates. */
  var TREATS = [
    [3.5, 'a coffee', '☕'], [4, 'a meal deal', '🥪'], [12, 'a takeaway pizza', '🍕'], [25, 'a cinema trip for two', '🎬'],
    [80, 'a pair of trainers', '👟'], [120, 'a weekly food shop', '🛒'], [450, 'a games console', '🎮'],
    [1000, 'a new laptop', '💻'], [2000, 'a week in the sun', '🏖️'], [8000, 'a second-hand car', '🚗']
  ];
  var FX = { GBP: 1, USD: 1.3, EUR: 1.15, CAD: 1.8, AUD: 2, NZD: 2.2, INR: 110, ZAR: 24, NGN: 2000, PHP: 75, PKR: 370, SGD: 1.7, BRL: 7, MXN: 24, JPY: 190 };

  function currency() { return window.Region ? Region.get().currency : 'GBP'; }
  function money(n, d) { return window.Region ? Region.money(n, d) : '£' + n.toFixed(d === undefined ? 2 : d); }
  function sym() { return window.Region ? Region.symbol() : '£'; }

  function treatFor(cost) {
    var fx = FX[currency()] || 1, best = null;
    TREATS.forEach(function (t) { if (cost >= t[0] * fx) best = t; });
    if (!best) return null;
    var n = Math.floor(cost / (best[0] * fx));
    return best[2] + ' That’s ' + (n > 1 ? n + ' × ' + best[1].replace(/^an? /, '') : best[1]) + ' so far';
  }

  function fmtClock(ms) {
    var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return (h ? h + ':' + p(m) : p(m)) + ':' + p(s % 60);
  }

  var BASIS = [{ value: 'year', label: 'per year' }, { value: 'day', label: 'per day' }, { value: 'hour', label: 'per hour' }];

  function defaultMeeting() {
    return {
      hoursPerWeek: 37.5, oncost: 0, basis: 'year',
      people: [
        { role: 'Manager', count: 1, pay: 60000, basis: 'year' },
        { role: 'Team member', count: 4, pay: 40000, basis: 'year' },
        { role: 'Contractor', count: 1, pay: 450, basis: 'day' }
      ],
      planMinutes: 30, planFreq: 'weekly', planWeeks: 46
    };
  }

  /* Cost per hour of one person. A salary covers paid holiday, so it is
     spread over all 52 weeks of the contracted hours. */
  function hourly(p, hoursPerWeek) {
    var pay = Number(p.pay) || 0, hpw = hoursPerWeek > 0 ? hoursPerWeek : 37.5;
    if (p.basis === 'hour') return pay;
    if (p.basis === 'day') return pay / (hpw / 5);
    return pay / (hpw * 52);
  }

  var FREQ = [
    { value: 'daily', label: 'Every working day', perWeek: 5 },
    { value: 'twice', label: 'Twice a week', perWeek: 2 },
    { value: 'weekly', label: 'Weekly', perWeek: 1 },
    { value: 'fortnightly', label: 'Fortnightly', perWeek: 0.5 },
    { value: 'monthly', label: 'Monthly', perWeek: 12 / 52 },
    { value: 'once', label: 'Just once', perWeek: 0 }
  ];

  Tools.register({
    id: 'meeting-cost-timer', category: 'productivity', name: 'Meeting Cost Timer',
    description: 'Watch what a meeting costs tick up live from the attendees’ salaries or day rates, and work out what a recurring meeting costs over a year.',
    keywords: ['meeting', 'meeting cost', 'cost of meeting', 'meeting timer', 'salary', 'hourly rate', 'day rate', 'productivity', 'standup', 'recurring meeting', 'calculator'],
    render: function (root) {
      root.classList.add('g-prodb');
      var st = load('meeting-cost', null);
      if (!st || !Array.isArray(st.people)) st = defaultMeeting();
      var def = defaultMeeting();
      Object.keys(def).forEach(function (k) { if (st[k] === undefined) st[k] = def[k]; });
      var persist = U.debounce(function () { save('meeting-cost', st); }, 300);

      function perHour() {
        var h = st.people.reduce(function (sum, p) { return sum + hourly(p, Number(st.hoursPerWeek)) * Math.max(0, Number(p.count) || 0); }, 0);
        return h * (1 + (Number(st.oncost) || 0) / 100);
      }
      function heads() { return st.people.reduce(function (s, p) { return s + Math.max(0, Number(p.count) || 0); }, 0); }

      /* --- attendees ---------------------------------------------------- */
      var rateStats = el('div');
      var list = el('div');
      function drawRates() {
        var h = perHour();
        rateStats.replaceChildren(U.stats([
          { label: 'People', value: String(heads()) },
          { label: 'Per hour', value: money(h) },
          { label: 'Per minute', value: money(h / 60) },
          { label: 'Per second', value: money(h / 3600, 3) }
        ]));
        drawPlan();
      }
      function drawPeople() {
        list.replaceChildren.apply(list, st.people.map(function (p, i) {
          var role = U.input({ label: 'Role', value: p.role, placeholder: 'e.g. Engineer' });
          var count = U.input({ label: 'People', type: 'number', min: 0, step: 1, value: p.count });
          var pay = U.input({ label: 'Pay (' + sym() + ')', type: 'number', min: 0, step: 'any', value: p.pay });
          var basis = U.select({ label: 'Basis', options: BASIS, value: p.basis });
          var rm = U.button('✕', function () { st.people.splice(i, 1); persist(); drawPeople(); drawRates(); }, 'ghost');
          rm.title = 'Remove';
          [[role, 'role'], [count, 'count'], [pay, 'pay'], [basis, 'basis']].forEach(function (pair) {
            var ctl = pair[0].querySelector('input, select');
            var h = function () { p[pair[1]] = pair[1] === 'role' || pair[1] === 'basis' ? ctl.value : Number(ctl.value); persist(); drawRates(); };
            ctl.addEventListener('input', h); ctl.addEventListener('change', h);
          });
          return el('div', { class: 'mc-line' }, role, count, pay, basis, rm);
        }));
      }
      var hpw = U.input({ label: 'Contracted hours a week', type: 'number', min: 1, step: 0.5, value: st.hoursPerWeek, hint: 'Turns salaries and day rates into an hourly cost' });
      var oncost = U.input({ label: 'Employer on-costs (%)', type: 'number', min: 0, step: 1, value: st.oncost, hint: 'NI, pension and so on. Often 15–25% in the UK' });
      [[hpw, 'hoursPerWeek'], [oncost, 'oncost']].forEach(function (pair) {
        var ctl = pair[0].querySelector('input');
        ctl.addEventListener('input', function () { st[pair[1]] = Number(ctl.value); persist(); drawRates(); });
      });

      /* --- live timer --------------------------------------------------- */
      /* Cost is integrated tick by tick, so people joining or leaving part
         way through (change the counts while it runs) are charged only for
         the time they were there. */
      var run = { on: false, cost: 0, ms: 0, last: 0 };
      var costNode = el('div', { class: 'mc-cost', text: money(0) });
      var timeNode = el('div', { class: 'mc-time', text: '00:00' });
      var funNode = el('div', { class: 'mc-fun' });
      var face = el('div', { class: 'mc-face' }, costNode, timeNode, funNode);
      var startBtn = U.button('Start meeting', toggle, 'primary');
      var resetBtn = U.button('Reset', function () { run = { on: false, cost: 0, ms: 0, last: 0 }; buttons(); paint(); }, 'ghost');
      var fsBtn = U.button('Full screen', function () {
        if (face.requestFullscreen) face.requestFullscreen().catch(function () { U.toast('Full screen is not available here', 'err'); });
      }, 'ghost');
      function toggle() {
        run.on = !run.on;
        run.last = performance.now();
        buttons(); paint();
      }
      function buttons() {
        startBtn.textContent = run.on ? 'Pause' : run.ms > 0 ? 'Resume' : 'Start meeting';
        startBtn.className = 'btn ' + (run.on ? 'danger' : 'primary');
        face.classList.toggle('running', run.on);
      }
      function step() {
        if (!run.on) return;
        var now = performance.now(), dt = now - run.last;
        run.last = now;
        run.ms += dt;
        run.cost += perHour() * dt / 3600000;
      }
      function paint() {
        costNode.textContent = money(run.cost);
        timeNode.textContent = fmtClock(run.ms) + (heads() ? ' · ' + heads() + (heads() === 1 ? ' person' : ' people') : '');
        funNode.textContent = treatFor(run.cost) || (run.ms ? '' : 'Press start when the meeting begins.');
      }
      /* A skip-ahead for meetings that started before the page was open. */
      var quick = el('div', { class: 'mc-quick' }, el('span', { class: 'muted', text: 'Started late? Add ' }), [5, 15, 30].map(function (m) {
        return U.button('+' + m + ' min', function () { run.ms += m * 60000; run.cost += perHour() * m / 60; paint(); }, 'ghost');
      }));
      var timer = setInterval(function () { step(); if (run.on) paint(); }, 100);
      function onVisible() { step(); paint(); }
      document.addEventListener('visibilitychange', onVisible);
      U.onTeardown(root, function () {
        clearInterval(timer);
        document.removeEventListener('visibilitychange', onVisible);
        if (document.fullscreenElement === face && document.exitFullscreen) document.exitFullscreen().catch(function () {});
        save('meeting-cost', st);
      });

      /* --- planner ------------------------------------------------------ */
      var planBox = el('div');
      var planMin = U.input({ label: 'Length (minutes)', type: 'number', min: 1, step: 5, value: st.planMinutes });
      var planFreq = U.select({ label: 'How often', options: FREQ.map(function (f) { return { value: f.value, label: f.label }; }), value: st.planFreq });
      var planWeeks = U.input({ label: 'Working weeks a year', type: 'number', min: 1, max: 52, step: 1, value: st.planWeeks, hint: '52 minus holidays; about 46 in the UK' });
      [[planMin, 'planMinutes'], [planFreq, 'planFreq'], [planWeeks, 'planWeeks']].forEach(function (pair) {
        var ctl = pair[0].querySelector('input, select');
        var h = function () { st[pair[1]] = pair[1] === 'planFreq' ? ctl.value : Number(ctl.value); persist(); drawPlan(); };
        ctl.addEventListener('input', h); ctl.addEventListener('change', h);
      });
      function drawPlan() {
        var mins = Math.max(0, Number(st.planMinutes) || 0);
        var f = FREQ.filter(function (x) { return x.value === st.planFreq; })[0] || FREQ[2];
        var weeks = Math.max(0, Math.min(52, Number(st.planWeeks) || 0));
        var perYear = f.value === 'once' ? 1 : f.value === 'monthly' ? 12 : f.perWeek * weeks;
        var each = perHour() * mins / 60;
        var kids = [U.stats([
          { label: 'Each meeting', value: money(each) },
          { label: f.value === 'once' ? 'Total' : 'A year (' + Math.round(perYear) + ' meetings)', value: money(each * perYear, 0) },
          { label: 'People-hours a year', value: String(Math.round(heads() * mins / 60 * perYear * 10) / 10) }
        ])];
        if (f.value !== 'once') {
          var rows = [15, 25, 30, 45, 50, 60].map(function (m) {
            var y = perHour() * m / 60 * perYear;
            return [m + ' min', money(perHour() * m / 60), money(y, 0), m === mins ? 'current' : (m < mins ? 'saves ' + money(each * perYear - y, 0) : '')];
          });
          kids.push(el('div', { style: { overflowX: 'auto', marginTop: '10px' } }, U.table(['Length', 'Each', 'A year', ''], rows)));
          kids.push(U.note('Ending at 25 or 50 minutes instead of 30 or 60 gives people time to get to the next thing, and the saving above.'));
        }
        planBox.replaceChildren.apply(planBox, kids);
      }

      /* --- layout ------------------------------------------------------- */
      var livePane = el('div', null,
        face,
        el('div', { class: 'mc-controls' }, startBtn, resetBtn, fsBtn),
        quick);
      var planPane = el('div', { style: { display: 'none' } }, U.row(planMin, planFreq, planWeeks), planBox);
      var mode = U.chips([{ value: 'live', label: 'Live timer' }, { value: 'plan', label: 'Recurring meeting planner' }], function (v) {
        livePane.style.display = v === 'live' ? '' : 'none';
        planPane.style.display = v === 'plan' ? '' : 'none';
      }, 'live');

      root.appendChild(U.panel(null, mode, el('div', { style: { height: '12px' } }), livePane, planPane));
      root.appendChild(U.panel('Who is in the meeting', list,
        U.btnrow(
          U.button('+ Add a role', function () { st.people.push({ role: '', count: 1, pay: 35000, basis: 'year' }); persist(); drawPeople(); drawRates(); }),
          U.button('Reset to example', function () { var d = defaultMeeting(); st.people = d.people; st.hoursPerWeek = d.hoursPerWeek; st.oncost = d.oncost; hpw.querySelector('input').value = d.hoursPerWeek; oncost.querySelector('input').value = d.oncost; persist(); drawPeople(); drawRates(); }, 'ghost')),
        el('div', { style: { height: '8px' } }),
        U.row(hpw, oncost), rateStats));
      root.appendChild(U.note('Salaries are spread over 52 weeks of contracted hours and day rates over a five-day week. Rates are saved in this browser only. The "that’s a pizza" comparisons use rough prices and are just for fun.'));

      if (window.Region && Region.onChange) Region.onChange(function () { if (root.isConnected) { drawPeople(); drawRates(); paint(); } });

      drawPeople(); drawRates(); buttons(); paint();
    }
  });
})();
