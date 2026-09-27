/* Productivity, part three: the Email Signature Generator. It builds the
   signature as email-safe HTML (tables and inline styles only, no classes,
   no external CSS), because that is all Gmail, Outlook and Apple Mail keep
   when a signature is pasted in. The form is remembered in this browser. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-prodc-style')) {
    document.head.appendChild(el('style', { id: 'g-prodc-style', text: [
      '.g-prodc .es-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px 14px}',
      '.g-prodc .es-grid .wide{grid-column:1/-1}',
      '.g-prodc .es-preview{background:#ffffff;color:#333333;border:1px solid var(--border);border-radius:var(--radius);padding:20px 18px;overflow-x:auto;min-height:60px}',
      '.g-prodc .es-preview a{pointer-events:none}',
      '.g-prodc .es-style{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:flex-end;margin-top:10px}',
      '.g-prodc .es-style>.field{flex:1 1 170px;min-width:0}',
      '.g-prodc .es-style input[type=color]{width:64px;height:38px;padding:2px;cursor:pointer}',
      '.g-prodc .es-pic{display:flex;flex-wrap:wrap;gap:14px;align-items:center}',
      '.g-prodc .es-pic img{max-width:96px;max-height:96px;border:1px solid var(--border);border-radius:var(--radius-s);background:#fff}',
      '.g-prodc .es-pic .dropzone{flex:1 1 220px}',
      '.g-prodc details>summary{cursor:pointer;font-weight:600;color:var(--fg-muted)}',
      '.g-prodc details[open]>summary{margin-bottom:10px}',
      '.g-prodc .out{max-height:260px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}',
      '.g-prodc .es-how{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}',
      '.g-prodc .es-how h4{margin:0 0 6px}',
      '.g-prodc .es-how ol{margin:0;padding-left:20px;font-size:14px;line-height:1.5}',
      '.g-prodc .es-size{font-size:13px;color:var(--fg-muted)}',
      '.g-prodc .es-size.err{color:var(--err)}'
    ].join('\n') }));
  }

  var KEY = 'att:email-signature';
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function store(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch (e) { return false; } }

  var FONTS = [
    { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
    { value: 'Helvetica, Arial, sans-serif', label: 'Helvetica' },
    { value: 'Verdana, Geneva, sans-serif', label: 'Verdana' },
    { value: 'Tahoma, Geneva, sans-serif', label: 'Tahoma' },
    { value: '\'Trebuchet MS\', Helvetica, sans-serif', label: 'Trebuchet MS' },
    { value: 'Georgia, \'Times New Roman\', serif', label: 'Georgia' },
    { value: '\'Times New Roman\', Times, serif', label: 'Times New Roman' },
    { value: '\'Courier New\', Courier, monospace', label: 'Courier New' }
  ];
  var TEMPLATES = [
    { value: 'simple', label: 'Simple' },
    { value: 'photo', label: 'Photo left' },
    { value: 'stacked', label: 'Stacked' },
    { value: 'compact', label: 'One line' }
  ];
  var SOCIAL = [
    ['linkedin', 'LinkedIn', 'linkedin.com/in/yourname'], ['x', 'X', 'x.com/yourname'], ['instagram', 'Instagram', 'instagram.com/yourname'],
    ['facebook', 'Facebook', 'facebook.com/yourpage'], ['github', 'GitHub', 'github.com/yourname'], ['youtube', 'YouTube', 'youtube.com/@yourchannel'],
    ['tiktok', 'TikTok', 'tiktok.com/@yourname'], ['bluesky', 'Bluesky', 'bsky.app/profile/you.bsky.social'], ['mastodon', 'Mastodon', 'mastodon.social/@you'],
    ['threads', 'Threads', 'threads.net/@yourname']
  ];
  var FIELDS = ['name', 'title', 'company', 'phone', 'mobile', 'email', 'website', 'address', 'photoUrl', 'disclaimer'];

  /* Fictional details: 020 7946 0xxx and 07700 900xxx are Ofcom's numbers
     for drama, and example.com is reserved. */
  function example() {
    var social = {};
    SOCIAL.forEach(function (s) { social[s[0]] = ''; });
    social.linkedin = 'https://www.linkedin.com/in/example';
    social.github = 'https://github.com/example';
    return {
      name: 'Alex Morgan', title: 'Head of Marketing', company: 'Northwind Studio',
      phone: '+44 20 7946 0123', mobile: '+44 7700 900123', email: 'alex@example.com', website: 'www.example.com',
      address: '1 Example Street, Bristol', photoUrl: '', photo: null, picKind: 'photo', picSize: 80,
      template: 'simple', accent: '#1f6feb', font: FONTS[0].value, disclaimer: '', social: social
    };
  }
  function clean(s) {
    var base = example();
    if (!s || typeof s !== 'object') return base;
    FIELDS.forEach(function (k) { if (typeof s[k] === 'string') base[k] = s[k]; });
    if (s.photo && typeof s.photo.src === 'string' && /^data:image\//.test(s.photo.src)) base.photo = s.photo;
    if (s.picKind === 'logo' || s.picKind === 'photo') base.picKind = s.picKind;
    if (+s.picSize >= 30 && +s.picSize <= 240) base.picSize = +s.picSize;
    if (TEMPLATES.some(function (t) { return t.value === s.template; })) base.template = s.template;
    if (/^#[0-9a-f]{6}$/i.test(s.accent || '')) base.accent = s.accent;
    if (FONTS.some(function (f) { return f.value === s.font; })) base.font = s.font;
    if (s.social && typeof s.social === 'object') SOCIAL.forEach(function (n) { if (typeof s.social[n[0]] === 'string') base.social[n[0]] = s.social[n[0]]; });
    return base;
  }

  /* --- building the HTML -------------------------------------------------- */

  var esc = U.escapeHtml;
  /* Web addresses only: http(s), mailto and tel. Anything else is dropped. */
  function safeUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return '';
    if (/^\/\//.test(u)) return 'https:' + u;
    return 'https://' + u;
  }
  function showUrl(u) { return String(u).trim().replace(/^https?:\/\//i, '').replace(/\/$/, ''); }
  function telUrl(p) { var d = String(p).replace(/[^\d+]/g, ''); return d ? 'tel:' + d : ''; }
  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
  function lines(text) { return esc(String(text).trim()).replace(/\r?\n/g, '<br>'); }
  var TABLE = '<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;';

  function build(s) {
    var accent = /^#[0-9a-f]{6}$/i.test(s.accent) ? s.accent : '#1f6feb';
    var base = 'font-family:' + s.font + ';font-size:14px;line-height:1.45;color:#333333;';
    var link = 'color:#333333;text-decoration:none;';
    var label = 'color:' + accent + ';font-weight:bold;';
    var sep = '<span style="color:#bbbbbb;">&nbsp;|&nbsp;</span>';
    var t = s.template, size = Math.round(s.picSize) || 80;
    var name = s.name.trim(), title = s.title.trim(), company = s.company.trim();

    function a(href, text, style) { return href ? '<a href="' + esc(href) + '" style="' + (style || link) + '">' + text + '</a>' : text; }
    function item(lbl, html) { return lbl && t !== 'compact' ? '<span style="' + label + '">' + lbl + '</span>&nbsp;' + html : html; }
    var contacts = [
      s.phone.trim() ? item('T', a(telUrl(s.phone), esc(s.phone.trim()))) : '',
      s.mobile.trim() ? item('M', a(telUrl(s.mobile), esc(s.mobile.trim()))) : '',
      s.email.trim() ? item('E', a('mailto:' + s.email.trim(), esc(s.email.trim()))) : '',
      s.website.trim() && safeUrl(s.website) ? item('W', a(safeUrl(s.website), esc(showUrl(s.website)))) : ''
    ];
    var address = s.address.trim() ? esc(s.address.trim()) : '';
    var socials = SOCIAL.filter(function (n) { return safeUrl(s.social[n[0]]); }).map(function (n) {
      return a(safeUrl(s.social[n[0]]), n[1], 'color:' + accent + ';text-decoration:none;font-weight:bold;');
    });
    var nameHtml = name ? '<span style="font-size:' + (t === 'compact' ? '14' : '18') + 'px;font-weight:bold;color:' + (t === 'compact' ? accent : '#111111') + ';">' + esc(name) + '</span>' : '';
    var titleHtml = title ? '<span style="color:#555555;">' + esc(title) + '</span>' : '';
    var companyHtml = company ? '<span style="font-weight:bold;color:' + accent + ';">' + esc(company) + '</span>' : '';

    /* The picture: a hosted address wins over an embedded one. */
    var src = s.photoUrl.trim() ? safeUrl(s.photoUrl) : s.photo ? s.photo.src : '';
    var round = s.picKind === 'photo';
    function picture(center) {
      if (src) {
        var h = s.photoUrl.trim() || !s.photo ? (round ? size : 0) : Math.round(size * s.photo.h / s.photo.w);
        return '<img src="' + esc(src) + '" alt="' + esc(name || company || 'Picture') + '" width="' + size + '"' + (h ? ' height="' + h + '"' : '') +
          ' style="display:block;border:0;outline:none;width:' + size + 'px;' + (h ? 'height:' + h + 'px;' : 'height:auto;') +
          (round ? 'border-radius:50%;' : '') + (center ? 'margin:0 auto;' : '') + '">';
      }
      var ini = initials(name || company);
      if (!ini || !center && t !== 'photo') return '';
      return TABLE + (center ? 'margin:0 auto;' : '') + '"><tr><td width="' + size + '" height="' + size + '" align="center" valign="middle" style="width:' + size + 'px;height:' + size +
        'px;background-color:' + accent + ';color:#ffffff;font-family:' + s.font + ';font-size:' + Math.round(size * 0.38) + 'px;font-weight:bold;text-align:center;vertical-align:middle;border-radius:50%;">' + esc(ini) + '</td></tr></table>';
    }

    var who = [nameHtml, [titleHtml, companyHtml].filter(Boolean).join(title && company ? '<span style="color:#999999;">&nbsp;·&nbsp;</span>' : '')].filter(Boolean);
    var contactLines = [contacts.slice(0, 2).filter(Boolean).join(sep), contacts.slice(2).filter(Boolean).join(sep), address].filter(Boolean);
    var socialLine = socials.join(sep);
    var main;

    if (t === 'compact') {
      var bits = [nameHtml, [titleHtml, companyHtml].filter(Boolean).join(title && company ? ', ' : '')].concat(contacts).concat(socials).filter(Boolean);
      main = TABLE + base + '"><tr><td style="' + base + '">' + bits.join(sep) + '</td></tr></table>';
    } else if (t === 'stacked') {
      var pic = picture(true), rows = [];
      if (pic) rows.push('<tr><td align="center" style="text-align:center;padding:0 0 10px 0;">' + pic + '</td></tr>');
      if (name) rows.push('<tr><td align="center" style="' + base + 'text-align:center;">' + nameHtml + '</td></tr>');
      if (title) rows.push('<tr><td align="center" style="' + base + 'text-align:center;">' + titleHtml + '</td></tr>');
      if (company) rows.push('<tr><td align="center" style="' + base + 'text-align:center;">' + companyHtml + '</td></tr>');
      rows.push('<tr><td align="center" style="text-align:center;padding:8px 0;">' + TABLE + 'margin:0 auto;"><tr><td width="48" height="2" style="width:48px;height:2px;background-color:' + accent + ';font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>');
      if (contactLines.length) rows.push('<tr><td align="center" style="' + base + 'text-align:center;">' + contactLines.join('<br>') + '</td></tr>');
      if (socialLine) rows.push('<tr><td align="center" style="' + base + 'text-align:center;padding:6px 0 0 0;">' + socialLine + '</td></tr>');
      main = TABLE + base + '">' + rows.join('') + '</table>';
    } else {
      var details = '<td valign="top" style="' + base + 'vertical-align:top;' + (t === 'photo' ? 'border-left:2px solid ' + accent + ';padding:0 0 0 14px;' : '') + '">' +
        (who.length ? '<div style="margin:0 0 8px 0;">' + who.join('<br>') + '</div>' : '') +
        (t === 'simple' && (who.length && (contactLines.length || socialLine)) ? '<div style="border-top:2px solid ' + accent + ';margin:0 0 8px 0;font-size:0;line-height:0;height:0;">&nbsp;</div>' : '') +
        contactLines.join('<br>') + (socialLine ? '<div style="margin:6px 0 0 0;">' + socialLine + '</div>' : '') + '</td>';
      var left = t === 'photo' ? picture(false) : '';
      main = TABLE + base + '"><tr>' + (left ? '<td valign="top" style="vertical-align:top;padding:0 14px 0 0;">' + left + '</td>' : '') + details + '</tr></table>';
    }

    var disclaimer = s.disclaimer.trim() ? '<tr><td style="padding:12px 0 0 0;font-family:' + s.font + ';font-size:11px;line-height:1.4;color:#888888;max-width:560px;">' + lines(s.disclaimer) + '</td></tr>' : '';
    return TABLE + '"><tr><td style="padding:0;">' + main + '</td></tr>' + disclaimer + '</table>';
  }

  function plain(s) {
    var out = [s.name, [s.title, s.company].map(function (x) { return x.trim(); }).filter(Boolean).join(', ')];
    if (s.phone.trim()) out.push('T: ' + s.phone.trim());
    if (s.mobile.trim()) out.push('M: ' + s.mobile.trim());
    if (s.email.trim()) out.push('E: ' + s.email.trim());
    if (s.website.trim()) out.push('W: ' + showUrl(s.website));
    out.push(s.address);
    SOCIAL.forEach(function (n) { if (safeUrl(s.social[n[0]])) out.push(n[1] + ': ' + showUrl(s.social[n[0]])); });
    if (s.disclaimer.trim()) out.push('', s.disclaimer.trim());
    return out.map(function (x) { return String(x).trim(); }).filter(function (x, i, all) { return x || (i > 0 && all[i - 1]); }).join('\n').trim();
  }
  function page(html) {
    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Email signature</title>\n</head>\n<body>\n' + html + '\n</body>\n</html>\n';
  }

  /* Shrink a picture before embedding it: a square crop for a photo, the
     whole image for a logo, at twice the largest display size for sharp
     screens. JPEG for photos, PNG for logos (they may be transparent). */
  function shrink(img, kind) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    var c = document.createElement('canvas'), ctx = c.getContext('2d');
    if (kind === 'photo') {
      var side = Math.min(w, h), out = Math.min(240, side);
      c.width = c.height = out;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, out, out);
      ctx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, out, out);
      return { src: c.toDataURL('image/jpeg', 0.85), w: out, h: out };
    }
    var k = Math.min(1, 400 / Math.max(w, h));
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return { src: c.toDataURL('image/png'), w: c.width, h: c.height };
  }

  Tools.register({
    id: 'email-signature', category: 'productivity', name: 'Email Signature Generator',
    description: 'Make a professional email signature with your details, photo or logo and social links, then copy it into Gmail, Outlook or Apple Mail.',
    keywords: ['email signature', 'email signature generator', 'signature generator', 'gmail signature', 'outlook signature', 'apple mail signature',
      'html signature', 'html email signature', 'business signature', 'professional signature', 'signature template', 'free email signature',
      'company signature', 'signature with logo', 'signature with photo', 'email footer', 'sign off', 'social links', 'linkedin', 'disclaimer', 'confidentiality notice'],
    render: function (root) {
      root.classList.add('g-prodc');
      var s = clean(load());
      var binds = [], lastFile = null, warnedSize = false;

      var preview = el('div', { class: 'es-preview', dataset: { k: 'preview' } });
      var code = el('pre', { class: 'out', dataset: { k: 'html' } });
      var sizeNote = el('p', { class: 'es-size', dataset: { k: 'size' } });
      var picNote = U.note('');
      var picShow = el('div');

      function save() {
        if (store(s)) return;
        /* Too big to keep with the embedded picture: keep everything else. */
        var slim = Object.assign({}, s, { photo: null });
        store(slim);
        if (!warnedSize) { warnedSize = true; U.toast('The picture is too big to remember in this browser, but it is in this signature', 'err'); }
      }
      function draw() {
        var html = build(s);
        preview.innerHTML = html;
        preview.dataset.template = s.template;
        code.textContent = html;
        var n = html.length;
        sizeNote.className = 'es-size' + (n > 10000 ? ' err' : '');
        sizeNote.textContent = n.toLocaleString('en-GB') + ' characters of HTML.' + (n > 10000 ? ' Gmail only accepts signatures up to 10,000 characters: use a picture from a web address instead of an embedded one.' : '');
        var usesPic = s.template === 'photo' || s.template === 'stacked';
        picNote.textContent = (s.photo || s.photoUrl.trim()) && !usesPic ? 'The ' + (s.template === 'simple' ? 'Simple' : 'One line') + ' layout leaves the picture out. Pick Photo left or Stacked to show it.' : '';
        picShow.replaceChildren(s.photoUrl.trim() && safeUrl(s.photoUrl) ? el('img', { src: safeUrl(s.photoUrl), alt: 'Picture from the web address' }) : s.photo ? el('img', { src: s.photo.src, alt: 'Embedded picture' }) : el('span', { class: 'note', text: 'No picture yet' }));
      }
      function changed() { save(); draw(); }

      function bind(get, key, labelText, opts) {
        opts = opts || {};
        var node = opts.textarea ? U.textarea({ label: labelText, rows: opts.rows || 2, placeholder: opts.placeholder || '' })
          : U.input({ label: labelText, type: opts.type || 'text', placeholder: opts.placeholder || '', inputMode: opts.inputmode || null, autocomplete: opts.autocomplete || 'off', hint: opts.hint });
        var ctl = node.querySelector('input, textarea');
        ctl.value = get()[key] || '';
        ctl.addEventListener('input', function () { get()[key] = ctl.value; changed(); });
        binds.push(function () { ctl.value = get()[key] || ''; });
        if (opts.wide) node.classList.add('wide');
        return node;
      }
      function me() { return s; }
      function soc() { return s.social; }

      /* --- layout and style --- */
      var template = U.chips(TEMPLATES, function (v) { s.template = v; changed(); }, s.template);
      var accent = U.input({ label: 'Accent colour', type: 'color', value: s.accent, dataset: { role: 'accent' } });
      inp(accent).addEventListener('input', function () { s.accent = inp(accent).value; changed(); });
      var font = U.select({ label: 'Font', options: FONTS, value: s.font, dataset: { role: 'font' } });
      inp(font).addEventListener('change', function () { s.font = inp(font).value; changed(); });
      function inp(field) { return field.querySelector('input, select, textarea'); }

      /* --- picture --- */
      var kind = U.chips([{ value: 'photo', label: 'Photo (round)' }, { value: 'logo', label: 'Logo (as is)' }], function (v) {
        s.picKind = v;
        if (lastFile) usePicture(lastFile); else changed();
      }, s.picKind);
      var picSize = U.input({ label: 'Width in pixels', type: 'number', min: 30, max: 240, step: 1, value: String(s.picSize), dataset: { role: 'pic-size' } });
      inp(picSize).addEventListener('input', function () { var v = +inp(picSize).value; if (v >= 30 && v <= 240) { s.picSize = v; changed(); } });
      function usePicture(file) {
        lastFile = file;
        U.loadImage(file).then(function (img) { s.photo = shrink(img, s.picKind); changed(); })
          .catch(function (err) { U.toast(err.message || String(err), 'err'); });
      }
      var drop = U.dropzone({ accept: 'image/*', label: 'Drop a photo or logo', hint: 'or click to choose. It is resized and embedded, and never uploaded.', onFiles: function (files) { usePicture(files[0]); } });
      var photoUrl = bind(me, 'photoUrl', 'Or the picture’s web address', { placeholder: 'https://example.com/me.jpg', inputmode: 'url', wide: true,
        hint: 'Best for Gmail and Outlook: a picture already online (on your website, for example) shows everywhere.' });
      var removePic = U.button('Remove picture', function () { s.photo = null; s.photoUrl = ''; lastFile = null; binds.forEach(function (b) { b(); }); changed(); }, 'ghost');

      function refreshAll() {
        binds.forEach(function (b) { b(); });
        [[template, s.template], [kind, s.picKind]].forEach(function (p) {
          p[0].value = p[1];
          Array.prototype.forEach.call(p[0].children, function (c, i) { c.classList.toggle('on', (p[0] === template ? TEMPLATES[i].value : ['photo', 'logo'][i]) === p[1]); });
        });
        inp(accent).value = s.accent; inp(font).value = s.font; inp(picSize).value = String(s.picSize);
      }

      function copyRich() {
        var html = build(s), text = plain(s);
        function fallback() {
          var sel = window.getSelection(), range = document.createRange(), ok = false;
          range.selectNodeContents(preview);
          sel.removeAllRanges(); sel.addRange(range);
          try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
          sel.removeAllRanges();
          U.toast(ok ? 'Signature copied. Paste it into your email settings.' : 'Select the preview and press Ctrl+C (⌘C on a Mac) to copy it', ok ? '' : 'err');
        }
        if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
          var item;
          try {
            item = new window.ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) });
          } catch (e) { fallback(); return; }
          navigator.clipboard.write([item]).then(function () { U.toast('Signature copied. Paste it into your email settings.'); }, fallback);
        } else fallback();
      }

      root.appendChild(U.panel('Layout', template,
        el('div', { class: 'es-style' }, accent, font)));
      root.appendChild(U.panel('Preview', preview, sizeNote,
        U.btnrow(U.button('Copy signature', copyRich, 'primary'), U.copyBtn('Copy HTML', function () { return build(s); }),
          U.downloadBtn('Download .html', 'email-signature.html', function () { return page(build(s)); }, 'text/html')),
        el('details', null, el('summary', { text: 'Show the HTML' }), code)));
      root.appendChild(U.panel('Your details', el('div', { class: 'es-grid' },
        bind(me, 'name', 'Name', { autocomplete: 'name' }), bind(me, 'title', 'Job title'), bind(me, 'company', 'Company'),
        bind(me, 'phone', 'Phone', { inputmode: 'tel' }), bind(me, 'mobile', 'Mobile', { inputmode: 'tel' }),
        bind(me, 'email', 'Email', { inputmode: 'email' }), bind(me, 'website', 'Website', { inputmode: 'url', placeholder: 'www.example.com' }),
        bind(me, 'address', 'Address', { wide: true, placeholder: 'Street, town, postcode' }))));
      root.appendChild(U.panel('Photo or logo', kind,
        el('div', { class: 'es-pic', style: { marginTop: '10px' } }, picShow, drop),
        el('div', { class: 'es-grid', style: { marginTop: '10px' } }, picSize, photoUrl), U.btnrow(removePic), picNote,
        U.note('Some mail clients block pictures embedded in the signature itself (Gmail won’t save them, and Outlook may show them as attachments). A picture from a web address avoids that.')));
      root.appendChild(U.panel('Social links', el('div', { class: 'es-grid' }, SOCIAL.map(function (n) {
        return bind(soc, n[0], n[1], { inputmode: 'url', placeholder: n[2] });
      })), U.note('Shown as plain text links, which every mail client displays. Leave any you don’t use empty.')));
      root.appendChild(U.panel('Disclaimer (optional)', bind(me, 'disclaimer', 'Small print under the signature', { textarea: true, rows: 3,
        placeholder: 'This email and any attachments are confidential and intended only for the person they are addressed to.' })));
      root.appendChild(U.panel(null, U.btnrow(
        U.button('Start again with the example', function () { s = example(); lastFile = null; refreshAll(); changed(); }, 'ghost'),
        U.button('Clear my details', function () {
          var keep = { template: s.template, accent: s.accent, font: s.font, picKind: s.picKind, picSize: s.picSize };
          s = example();
          FIELDS.forEach(function (k) { s[k] = ''; });
          Object.keys(s.social).forEach(function (k) { s.social[k] = ''; });
          Object.assign(s, keep); lastFile = null; refreshAll(); changed();
        }, 'ghost')), U.note('Your details are kept in this browser only, so they are here next time.')));
      root.appendChild(U.panel('Adding it to your email', el('div', { class: 'es-how' },
        el('div', null, el('h4', { text: 'Gmail' }), el('ol', null,
          el('li', { text: 'Press Copy signature above.' }),
          el('li', { text: 'In Gmail, open Settings (the cog), then See all settings.' }),
          el('li', { text: 'On the General tab, under Signature, press Create new, name it and paste.' }),
          el('li', { text: 'Scroll down and press Save Changes.' }))),
        el('div', null, el('h4', { text: 'Outlook' }), el('ol', null,
          el('li', { text: 'Press Copy signature above.' }),
          el('li', { text: 'New Outlook and Outlook on the web: Settings, Account, Signatures, then New signature.' }),
          el('li', { text: 'Classic Outlook for Windows: File, Options, Mail, Signatures, then New.' }),
          el('li', { text: 'Paste, choose it for new messages and replies, and save.' }))),
        el('div', null, el('h4', { text: 'Apple Mail' }), el('ol', null,
          el('li', { text: 'Press Copy signature above.' }),
          el('li', { text: 'In Mail, open Settings (Preferences on older macOS), then Signatures.' }),
          el('li', { text: 'Pick the account, press + and paste over the sample text.' }),
          el('li', { text: 'Untick “Always match my default message font” to keep your font and colours.' })))),
        U.note('If pasting loses the layout, press Copy HTML instead and use your mail client’s HTML or source option, or open the downloaded .html file in your browser, select all and copy from there.')));

      draw();
    }
  });
})();
