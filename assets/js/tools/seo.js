/* seo tools: meta tags, sitemaps, keyword density, Schema.org JSON-LD, UTM links
   and SERP previews. Open Graph lives in social.js (og-preview); newer SEO
   generators and checkers are in seo-b.js. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  var STYLE = [
    '.g-seo .gs-ta { width: 100%; min-height: 140px; box-sizing: border-box; }',
    '.g-seo .gs-code { width: 100%; min-height: 280px; font-family: var(--mono); box-sizing: border-box; }',
    '.g-seo .gs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px 16px; }',
    '.g-seo .gs-grid .field input, .g-seo .gs-grid .field select, .g-seo .gs-grid .field textarea { width: 100%; box-sizing: border-box; }',
    '.g-seo .gs-count { font-size: 0.82em; color: var(--fg-muted); }',
    '.g-seo .gs-count.over { color: var(--err); font-weight: 600; }',
    '.g-seo .gs-serp { border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; background: var(--bg-elev); max-width: 620px; }',
    '.g-seo .gs-serp .t { color: #1a0dab; font-size: 1.2em; }',
    '.g-seo .gs-serp .u { color: #006621; font-size: 0.9em; }',
    '.g-seo .gs-serp .d { color: var(--fg-muted); font-size: 0.92em; }',
    '.g-seo .gs-urlrow { display: grid; grid-template-columns: 2fr 80px 130px 150px auto; gap: 6px; align-items: center; margin-bottom: 6px; }',
    '.g-seo .gs-faq { display: grid; grid-template-columns: 1fr 2fr auto; gap: 6px; margin-bottom: 6px; }',
    '.g-seo .gs-big { font-size: 1.6em; font-weight: 700; }'
  ].join('\n');
  if (!document.getElementById('g-seo-style')) document.head.appendChild(el('style', { id: 'g-seo-style', text: STYLE }));

  function reg(def) {
    var render = def.render;
    def.category = def.category || 'seo';
    def.render = function (root) { root.classList.add('g-seo'); render(root); };
    Tools.register(def);
  }
  function attr(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function xml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }
  function input(value, k, type, placeholder) {
    return el('input', { type: type || 'text', value: value || '', placeholder: placeholder || '', dataset: k ? { k: k } : undefined });
  }
  function area(value, k, cls, placeholder) {
    return el('textarea', { class: cls || 'gs-ta', value: value || '', placeholder: placeholder || '', spellcheck: false, dataset: k ? { k: k } : undefined });
  }
  function code(k) { var t = area('', k || 'out', 'gs-code'); t.readOnly = true; return t; }
  function sel(options, value, k) { var s = U.select({ options: options, value: value }); if (k) s.dataset.k = k; return s; }
  function field(label, ctl, extra) {
    return el('div', { class: 'field' }, el('label', { style: { display: 'flex', justifyContent: 'space-between' } }, el('span', { text: label }), extra || null), ctl);
  }
  function counter(node, max) {
    var c = el('span', { class: 'gs-count' });
    function upd() { var n = node.value.length; c.textContent = n + '/' + max + ' chars'; c.classList.toggle('over', n > max); }
    node.addEventListener('input', upd); upd();
    return c;
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* ======================================================================
     Meta Tag Generator
     ====================================================================== */
  reg({
    id: 'meta-tag-generator', name: 'Meta Tag Generator',
    description: 'Builds SEO, Open Graph and Twitter meta tags with a search-result preview.',
    keywords: ['meta', 'seo', 'html', 'tags', 'title', 'description', 'open graph', 'robots'],
    render: function (root) {
      var title = input('My Awesome Website', 'title');
      var desc = area('A brief description of my website for search engines and social media.', 'desc');
      desc.style.minHeight = '70px';
      var kw = input('website, tool, example', 'keywords');
      var url = input('https://example.com', 'url', 'url');
      var img = input('https://example.com/og-image.jpg', 'image', 'url');
      var author = input('John Doe', 'author');
      var tw = input('@example', 'twitter');
      var type = sel(['website', 'article', 'product', 'profile', 'video.other'], 'website', 'type');
      var robots = sel(['index, follow', 'noindex, nofollow', 'index, nofollow', 'noindex, follow'], 'index, follow', 'robots');
      var theme = input('#6366f1', 'theme');
      var out = code();
      var serp = el('div', { class: 'gs-serp' });
      function run() {
        var t = title.value.trim(), d = desc.value.trim(), u = url.value.trim(), im = img.value.trim(), h = tw.value.trim();
        var L = ['<!-- Primary Meta Tags -->'];
        if (t) L.push('<title>' + attr(t) + '</title>', '<meta name="title" content="' + attr(t) + '">');
        if (d) L.push('<meta name="description" content="' + attr(d) + '">');
        if (kw.value.trim()) L.push('<meta name="keywords" content="' + attr(kw.value.trim()) + '">');
        if (author.value.trim()) L.push('<meta name="author" content="' + attr(author.value.trim()) + '">');
        L.push('<meta name="robots" content="' + robots.value + '">');
        if (theme.value.trim()) L.push('<meta name="theme-color" content="' + attr(theme.value.trim()) + '">');
        L.push('', '<!-- Open Graph / Facebook -->', '<meta property="og:type" content="' + type.value + '">');
        if (u) L.push('<meta property="og:url" content="' + attr(u) + '">');
        if (t) L.push('<meta property="og:title" content="' + attr(t) + '">');
        if (d) L.push('<meta property="og:description" content="' + attr(d) + '">');
        if (im) L.push('<meta property="og:image" content="' + attr(im) + '">');
        L.push('', '<!-- Twitter -->', '<meta name="twitter:card" content="' + (im ? 'summary_large_image' : 'summary') + '">');
        if (u) L.push('<meta name="twitter:url" content="' + attr(u) + '">');
        if (t) L.push('<meta name="twitter:title" content="' + attr(t) + '">');
        if (d) L.push('<meta name="twitter:description" content="' + attr(d) + '">');
        if (im) L.push('<meta name="twitter:image" content="' + attr(im) + '">');
        if (h) L.push('<meta name="twitter:site" content="' + attr(h.charAt(0) === '@' ? h : '@' + h) + '">');
        if (u) L.push('', '<!-- Canonical -->', '<link rel="canonical" href="' + attr(u) + '">');
        L.push('', '<!-- Viewport -->', '<meta name="viewport" content="width=device-width, initial-scale=1.0">', '<meta charset="UTF-8">');
        out.value = L.join('\n');
        serp.replaceChildren(
          el('div', { class: 't', text: (t || 'Page title').slice(0, 60) + (t.length > 60 ? '…' : '') }),
          el('div', { class: 'u', text: u || 'https://example.com' }),
          el('div', { class: 'd', text: (d || 'Page description').slice(0, 160) + (d.length > 160 ? '…' : '') }));
      }
      U.live([title, desc, kw, url, img, author, tw, type, robots, theme], run);
      root.appendChild(U.panel('Page details', el('div', { class: 'gs-grid' },
        field('Page Title', title, counter(title, 60)), field('Description', desc, counter(desc, 160)),
        field('Keywords (comma-separated)', kw), field('Page URL', url), field('OG Image URL', img), field('Author', author),
        field('Twitter Handle', tw), field('Content Type', type), field('Robots', robots), field('Theme Color', theme))));
      root.appendChild(U.panel('Generated Meta Tags', out, U.btnrow(U.copyBtn('Copy', function () { return out.value; }),
        U.downloadBtn('Download', 'meta-tags.html', function () { return out.value; }, 'text/html'))));
      root.appendChild(U.panel('Search Engine Preview', serp));
    }
  });

  /* ======================================================================
     Sitemap Generator
     ====================================================================== */
  var FREQS = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
  reg({
    id: 'sitemap-generator', name: 'Sitemap Generator',
    description: 'Builds an XML sitemap from a list of pages, with priority and change frequency.',
    keywords: ['sitemap', 'xml', 'seo', 'google', 'crawl', 'urls'],
    render: function (root) {
      var base = input('https://example.com', 'base');
      base.style.width = '100%';
      var rows = el('div', { dataset: { k: 'rows' } });
      var bulk = area('', 'bulk', 'gs-ta', '/page-1\n/page-2\n/blog/post');
      bulk.style.minHeight = '80px';
      var out = code();
      var head = el('h3', { text: 'XML Sitemap' });
      function addRow(path, pr, freq, date) {
        var p = input(path || '', null, 'text', '/path'), pri = input(pr || '0.5', null, 'text', 'Priority');
        var f = sel(FREQS, freq || 'weekly'), d = input(date || today(), null, 'date');
        var row = el('div', { class: 'gs-urlrow' }, p, pri, f, d, U.button('✕', function () { row.remove(); run(); }, 'ghost'));
        row.parts = { p: p, pri: pri, f: f, d: d };
        [p, pri, f, d].forEach(function (n) { n.addEventListener('input', run); n.addEventListener('change', run); });
        rows.appendChild(row);
      }
      function full(path) {
        if (/^https?:\/\//i.test(path)) return path;
        var b = base.value.trim().replace(/\/+$/, '');
        return b + (path.charAt(0) === '/' ? path : '/' + path);
      }
      function run() {
        var list = Array.prototype.map.call(rows.children, function (r) { return r.parts; }).filter(function (p) { return p.p.value.trim(); });
        var L = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
        list.forEach(function (p) {
          var pr = parseFloat(p.pri.value);
          L.push('  <url>', '    <loc>' + xml(full(p.p.value.trim())) + '</loc>');
          if (p.d.value) L.push('    <lastmod>' + p.d.value + '</lastmod>');
          L.push('    <changefreq>' + p.f.value + '</changefreq>');
          if (isFinite(pr)) L.push('    <priority>' + Math.max(0, Math.min(1, pr)).toFixed(1) + '</priority>');
          L.push('  </url>');
        });
        L.push('</urlset>');
        out.value = L.join('\n');
        head.textContent = 'XML Sitemap (' + list.length + ' URL' + (list.length === 1 ? '' : 's') + ')';
      }
      addRow('/', '1.0', 'daily');
      addRow('/about', '0.8', 'monthly');
      addRow('/contact', '0.7', 'monthly');
      base.addEventListener('input', run);
      run();
      root.appendChild(U.panel(null, field('Base URL', base), el('div', { class: 'gs-urlrow gs-count' }, el('span', { text: 'Path' }), el('span', { text: 'Priority' }), el('span', { text: 'Change freq' }), el('span', { text: 'Last modified' }), el('span')),
        rows, U.btnrow(U.button('+ Add URL', function () { addRow(''); run(); }))));
      root.appendChild(U.panel('Bulk Add URLs (one path per line)', bulk, U.btnrow(U.button('Add Bulk', function () {
        bulk.value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean).forEach(function (l) { addRow(l); });
        bulk.value = '';
        run();
      }))));
      root.appendChild(el('section', { class: 'panel' }, head, out, U.btnrow(U.copyBtn('Copy', function () { return out.value; }),
        U.downloadBtn('Download', 'sitemap.xml', function () { return out.value; }, 'application/xml'))));
    }
  });

  /* ======================================================================
     Word analysis helpers (Keyword Density)
     ====================================================================== */
  function wordsOf(t) { return t.toLowerCase().match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu) || []; }
  function tally(list) {
    var m = new Map();
    list.forEach(function (w) { m.set(w, (m.get(w) || 0) + 1); });
    return Array.from(m.entries()).sort(function (a, b) { return b[1] - a[1]; });
  }

  /* ======================================================================
     Keyword Density
     ====================================================================== */
  reg({
    id: 'keyword-density', name: 'Keyword Density',
    description: 'Measures how often a keyword or phrase appears relative to total words.',
    keywords: ['keyword', 'density', 'seo', 'stuffing', 'frequency', 'content'],
    render: function (root) {
      var text = area('Search engine optimization is the process of improving the quality and quantity of website traffic. SEO targets unpaid traffic rather than direct traffic or paid traffic.', 'in');
      text.style.minHeight = '180px';
      var kw = input('traffic', 'kw', 'text', 'e.g. search engine');
      kw.style.width = '100%';
      var stats = el('div', { dataset: { k: 'stats' } });
      var msg = el('p', { class: 'note', dataset: { k: 'msg' } });
      var topBox = el('div', { dataset: { k: 'top' } });
      function run() {
        var w = wordsOf(text.value), total = w.length;
        var phrase = wordsOf(kw.value), occ = 0;
        if (phrase.length) {
          for (var i = 0; i + phrase.length <= w.length; i++) {
            var ok = true;
            for (var j = 0; j < phrase.length; j++) if (w[i + j] !== phrase[j]) { ok = false; break; }
            if (ok) occ++;
          }
        }
        var density = total ? occ * phrase.length / total * 100 : 0;
        stats.replaceChildren(U.stats([{ value: String(total), label: 'Total Words' }, { value: String(occ), label: 'Occurrences' }, { value: density.toFixed(2) + '%', label: 'Density' }]));
        if (!phrase.length) { msg.className = 'note'; msg.textContent = 'Enter a keyword or phrase to check.'; }
        else if (!occ) { msg.className = 'note'; msg.textContent = 'The keyword does not appear in the content.'; }
        else if (density > 5) { msg.className = 'note err'; msg.textContent = '⚠️ Keyword density is too high (over 5%). This may be seen as keyword stuffing by search engines.'; }
        else if (density > 3) { msg.className = 'note'; msg.textContent = 'Keyword density is slightly high (3–5%). Consider using synonyms.'; }
        else if (density >= 1) { msg.className = 'note ok'; msg.textContent = '✅ Keyword density is in the recommended range (1–3%).'; }
        else { msg.className = 'note'; msg.textContent = 'Keyword density is low (under 1%). You may want to use it a little more.'; }
        topBox.replaceChildren(U.table(['Word', 'Count', '%'], tally(w).slice(0, 10).map(function (r) { return [r[0], String(r[1]), (r[1] / total * 100).toFixed(1) + '%']; })));
      }
      U.live([text, kw], run);
      root.appendChild(U.panel('Content', text, field('Keyword or Phrase to Check', kw)));
      root.appendChild(U.panel('Results', stats, msg));
      root.appendChild(U.panel('Top 10 Words', topBox));
    }
  });

  /* ======================================================================
     Schema.org Generator
     ====================================================================== */
  var SCHEMAS = {
    Article: [['name', 'Name', 'My Article Title'], ['description', 'Description', 'A great article about something interesting.'],
      ['url', 'Url', 'https://example.com/article'], ['author', 'Author', 'John Doe'], ['datePublished', 'Date Published', null], ['image', 'Image', 'https://example.com/image.jpg']],
    Organization: [['name', 'Name'], ['url', 'Url'], ['logo', 'Logo'], ['description', 'Description'], ['email', 'Email'], ['telephone', 'Telephone'], ['sameAs', 'Same As (comma-separated profile URLs)']],
    Product: [['name', 'Name'], ['description', 'Description'], ['price', 'Price'], ['currency', 'Currency', 'USD'], ['brand', 'Brand'], ['sku', 'Sku'], ['image', 'Image'], ['availability', 'Availability']],
    Person: [['name', 'Name'], ['jobTitle', 'Job Title'], ['url', 'Url'], ['image', 'Image'], ['email', 'Email'], ['worksFor', 'Works For'], ['sameAs', 'Same As (comma-separated profile URLs)']],
    LocalBusiness: [['name', 'Name'], ['description', 'Description'], ['url', 'Url'], ['telephone', 'Telephone'], ['image', 'Image'], ['priceRange', 'Price Range'],
      ['streetAddress', 'Street Address'], ['addressLocality', 'City'], ['addressRegion', 'Region'], ['postalCode', 'Postal Code'], ['addressCountry', 'Country'], ['openingHours', 'Opening Hours (e.g. Mo-Fr 09:00-17:00)']],
    FAQPage: []
  };
  function buildSchema(type, v, faqs) {
    var o = { '@context': 'https://schema.org', '@type': type };
    var list = function (s) { return String(s || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean); };
    if (type === 'Article') {
      o.headline = v.name; o.description = v.description; o.url = v.url;
      o.author = { '@type': 'Person', name: v.author };
      o.datePublished = v.datePublished; o.image = v.image;
    } else if (type === 'Organization') {
      o.name = v.name; o.url = v.url; o.logo = v.logo; o.description = v.description;
      if (v.email) o.email = v.email;
      if (v.telephone) o.telephone = v.telephone;
      if (list(v.sameAs).length) o.sameAs = list(v.sameAs);
    } else if (type === 'Product') {
      o.name = v.name; o.description = v.description;
      if (v.image) o.image = v.image;
      o.brand = { '@type': 'Brand', name: v.brand };
      o.sku = v.sku;
      o.offers = { '@type': 'Offer', price: v.price, priceCurrency: v.currency };
      if (v.availability) o.offers.availability = 'https://schema.org/' + v.availability.replace(/\s+/g, '');
    } else if (type === 'Person') {
      o.name = v.name; o.jobTitle = v.jobTitle; o.url = v.url;
      if (v.image) o.image = v.image;
      if (v.email) o.email = v.email;
      if (v.worksFor) o.worksFor = { '@type': 'Organization', name: v.worksFor };
      if (list(v.sameAs).length) o.sameAs = list(v.sameAs);
    } else if (type === 'LocalBusiness') {
      o.name = v.name; o.description = v.description; o.url = v.url; o.telephone = v.telephone;
      if (v.image) o.image = v.image;
      if (v.priceRange) o.priceRange = v.priceRange;
      o.address = { '@type': 'PostalAddress', streetAddress: v.streetAddress, addressLocality: v.addressLocality,
        addressRegion: v.addressRegion, postalCode: v.postalCode, addressCountry: v.addressCountry };
      if (v.openingHours) o.openingHours = v.openingHours;
    } else if (type === 'FAQPage') {
      o.mainEntity = faqs.filter(function (f) { return f.q || f.a; }).map(function (f) {
        return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } };
      });
    }
    return o;
  }
  reg({
    id: 'schema-generator', name: 'Schema.org Generator',
    description: 'Generates JSON-LD structured data for articles, products, businesses, people and FAQs.',
    keywords: ['schema', 'json-ld', 'structured data', 'rich results', 'seo', 'faq', 'article', 'product'],
    render: function (root) {
      var type = sel(Object.keys(SCHEMAS), 'Article', 'type');
      var fieldsBox = el('div', { class: 'gs-grid' });
      var faqBox = el('div', { dataset: { k: 'faqs' } });
      var faqPanel = el('div', { style: { display: 'none' } }, faqBox, U.btnrow(U.button('+ Add Question', function () { addFaq('', ''); run(); })));
      var inputs = {};
      var out = code();
      var fmt = U.chips(['JSON-LD', 'Script Tag'], function () { run(); }, 'JSON-LD');
      fmt.dataset.k = 'fmt';
      var json = '';
      function addFaq(q, a) {
        var qi = input(q, null, 'text', 'Question'), ai = input(a, null, 'text', 'Answer');
        var row = el('div', { class: 'gs-faq' }, qi, ai, U.button('✕', function () { row.remove(); run(); }, 'ghost'));
        row.parts = { q: qi, a: ai };
        [qi, ai].forEach(function (n) { n.addEventListener('input', run); });
        faqBox.appendChild(row);
      }
      function build() {
        inputs = {};
        fieldsBox.replaceChildren();
        SCHEMAS[type.value].forEach(function (f) {
          var def = type.value === 'Article' ? (f[2] === null ? today() : f[2]) : (f[2] || '');
          var i = input(def, f[0], f[0] === 'datePublished' ? 'text' : 'text', f[0]);
          i.addEventListener('input', run);
          inputs[f[0]] = i;
          fieldsBox.appendChild(field(f[1], i));
        });
        faqPanel.style.display = type.value === 'FAQPage' ? '' : 'none';
        if (type.value === 'FAQPage' && !faqBox.children.length) {
          addFaq('What is this tool?', 'A free generator for Schema.org structured data.');
          addFaq('Is it free?', 'Yes, it runs entirely in your browser.');
        }
        run();
      }
      function run() {
        var v = {};
        Object.keys(inputs).forEach(function (k) { v[k] = inputs[k].value.trim(); });
        var faqs = Array.prototype.map.call(faqBox.children, function (r) { return { q: r.parts.q.value.trim(), a: r.parts.a.value.trim() }; });
        json = JSON.stringify(buildSchema(type.value, v, faqs), null, 2);
        out.value = fmt.value === 'JSON-LD' ? json : '<script type="application/ld+json">\n' + json + '\n</script>';
      }
      type.addEventListener('change', build);
      root.appendChild(U.panel(null, field('Schema Type', type), fieldsBox, faqPanel));
      root.appendChild(U.panel('Output', fmt, out, U.btnrow(U.copyBtn('Copy JSON-LD', function () { return out.value; }),
        U.downloadBtn('Download', 'schema.json', function () { return json; }, 'application/ld+json'))));
      build();
    }
  });

  /* ======================================================================
     UTM Link Builder
     ====================================================================== */
  reg({
    id: 'utm-builder', name: 'UTM Link Builder',
    description: 'Tag a URL with utm_source, medium, campaign, term and content, with presets, checks and a history of links you have built.',
    keywords: ['utm', 'campaign url', 'link builder', 'tracking link', 'google analytics', 'ga4', 'utm_source', 'utm_medium', 'utm_campaign', 'newsletter', 'marketing', 'tagging'],
    render: function (root) {
      var KEY = 'att-utm-history';
      var url = input('https://example.com/landing-page', 'url', 'url', 'https://…');
      var f = { source: input('newsletter', 'source', 'text', 'e.g. google, newsletter, facebook'), medium: input('email', 'medium', 'text', 'e.g. cpc, email, social, banner'), campaign: input('spring_sale', 'campaign', 'text', 'e.g. spring_sale'), id: input('', 'id', 'text', 'utm_id (optional)'), term: input('', 'term', 'text', 'paid keyword (optional)'), content: input('', 'content', 'text', 'e.g. header_link, blue_button (optional)') };
      var lower = U.checkbox('Force lowercase', { checked: true });
      var out = el('div', { class: 'gs-big', style: { fontSize: '1em', fontFamily: 'var(--mono)', wordBreak: 'break-all', padding: '10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg-sunken)' }, dataset: { k: 'out' } });
      var warns = el('ul', { style: { margin: '6px 0', paddingLeft: '18px', fontSize: '13px' } });
      var history = el('div', { class: 'stack' });
      function build() {
        var base = url.value.trim(), warn = [];
        if (!base) { out.textContent = ''; return ''; }
        if (!/^https?:\/\//i.test(base)) { base = 'https://' + base; }
        var u;
        try { u = new URL(base); } catch (e) { out.textContent = 'That is not a valid URL.'; return ''; }
        var params = new URLSearchParams(u.search);
        ['source', 'medium', 'campaign', 'id', 'term', 'content'].forEach(function (k) {
          var v = f[k].value.trim();
          if (lower.input.checked) v = v.toLowerCase();
          if (/\s/.test(v)) warn.push('utm_' + k + ' contains spaces; they will be encoded as %20. Use underscores or hyphens instead.');
          if (v) params.set('utm_' + k, v); else params.delete('utm_' + k);
        });
        if (!f.source.value.trim()) warn.push('utm_source is required by Google Analytics; without it the other tags are ignored.');
        if (!f.medium.value.trim()) warn.push('utm_medium is missing. GA4 expects one of: email, social, cpc, organic, referral, affiliate, display, video…');
        if (f.medium.value && /^(social|email|cpc|organic|referral|affiliate|display|video|paid|paid_social|paid_search|push|sms)$/i.test(f.medium.value.trim()) === false) warn.push('"' + f.medium.value.trim() + '" is not a standard GA4 medium, so it will land in the Unassigned channel group.');
        if (!lower.input.checked && /[A-Z]/.test(f.source.value + f.medium.value + f.campaign.value)) warn.push('Mixed case makes "Email" and "email" separate rows in reports.');
        u.search = params.toString();
        var link = u.toString();
        out.textContent = link;
        warns.replaceChildren.apply(warns, warn.map(function (w) { return el('li', { style: { color: 'var(--warn)' }, text: w }); }));
        return link;
      }
      function loadHistory() {
        var list = [];
        try { list = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { list = []; }
        history.replaceChildren.apply(history, list.length ? list.map(function (h, i) {
          return el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' } }, el('code', { style: { flex: '1', wordBreak: 'break-all', fontFamily: 'var(--mono)' }, text: h }), U.button('Copy', function () { U.copy(h); }, 'ghost'), U.button('×', function () { list.splice(i, 1); try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* ignore */ } loadHistory(); }, 'ghost'));
        }) : [U.note('Links you copy or save appear here (stored in this browser only).')]);
      }
      function remember(link) {
        if (!link) return;
        var list = []; try { list = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { list = []; }
        list = [link].concat(list.filter(function (x) { return x !== link; })).slice(0, 20);
        try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
        loadHistory();
      }
      var presets = el('div', { class: 'chips' }, [['Email newsletter', 'newsletter', 'email'], ['Google Ads', 'google', 'cpc'], ['Facebook post', 'facebook', 'social'], ['Instagram bio', 'instagram', 'social'], ['LinkedIn', 'linkedin', 'social'], ['YouTube description', 'youtube', 'video'], ['QR code on print', 'print', 'qr'], ['Partner site', 'partner', 'referral']].map(function (p) {
        return el('button', { type: 'button', class: 'chip', onclick: function () { f.source.value = p[1]; f.medium.value = p[2]; build(); } }, p[0]);
      }));
      U.live([url, f.source, f.medium, f.campaign, f.id, f.term, f.content, lower], build);
      loadHistory();
      root.appendChild(U.panel(null, field('Page URL', url), presets, el('div', { class: 'gs-grid' }, field('Campaign source (utm_source) *', f.source), field('Campaign medium (utm_medium) *', f.medium), field('Campaign name (utm_campaign)', f.campaign), field('Campaign ID (utm_id)', f.id), field('Campaign term (utm_term)', f.term), field('Campaign content (utm_content)', f.content)), lower));
      root.appendChild(U.panel('Tagged link', out, warns, U.btnrow(U.button('Copy link', function () { var l = build(); if (l) { U.copy(l); remember(l); } }, 'primary'), U.button('Save to history', function () { remember(build()); }))));
      root.appendChild(U.panel('History', history));
    }
  });

  /* ======================================================================
     SERP Snippet Preview
     ====================================================================== */
  reg({
    id: 'serp-preview', name: 'SERP Snippet Preview',
    description: 'See how a page title and description will look in Google results, with pixel-accurate truncation on desktop and mobile.',
    keywords: ['serp', 'google preview', 'snippet', 'title tag', 'meta description', 'pixel width', 'truncation', 'search result', 'seo', 'preview', 'rich snippet'],
    render: function (root) {
      var title = input('All The Tools: 390+ free browser utilities that never upload your files', 'title');
      var url = input('https://example.com/tools/pdf/merge', 'url', 'url');
      var desc = area('Merge, split, compress and convert PDFs, images, audio and video entirely in your browser. No accounts, no uploads, no limits.', 'desc');
      desc.style.minHeight = '70px';
      var site = input('All The Tools', 'site', 'text', 'Site name (optional)');
      var date = input('', 'date', 'date');
      var device = U.chips([{ value: 'desktop', label: 'Desktop' }, { value: 'mobile', label: 'Mobile' }], function () { draw(); }, 'desktop');
      var card = el('div', { class: 'gs-serp', style: { fontFamily: 'arial, sans-serif' } });
      var checks = el('ul', { style: { margin: '6px 0', paddingLeft: '18px', fontSize: '13px' } });
      var meta = el('div', { class: 'note' });
      var measure = document.createElement('canvas').getContext('2d');
      function widthOf(text, font) { measure.font = font; return measure.measureText(text).width; }
      function clipToWidth(text, font, max) {
        if (widthOf(text, font) <= max) return { text: text, cut: false };
        var lo = 0, hi = text.length;
        while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (widthOf(text.slice(0, mid) + ' …', font) <= max) lo = mid; else hi = mid - 1; }
        var cut = text.slice(0, lo).replace(/\s+\S*$/, '');
        return { text: cut + ' …', cut: true };
      }
      function crumb(u) {
        try { var p = new URL(u); return p.hostname.replace(/^www\./, '') + p.pathname.split('/').filter(Boolean).map(function (s) { return ' › ' + decodeURIComponent(s); }).join(''); } catch (e) { return u; }
      }
      function draw() {
        var mobile = device.value === 'mobile', titleFont = mobile ? '20px arial' : '20px arial', descFont = '14px arial';
        var titleMax = mobile ? 320 : 600, descMax = mobile ? 300 : 920, descLines = mobile ? 3 : 2;
        var t = clipToWidth(title.value.trim(), titleFont, titleMax);
        var d = desc.value.trim().replace(/\s+/g, ' ');
        var datePrefix = date.value ? new Date(date.value + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' — ' : '';
        var full = datePrefix + d, dClip = clipToWidth(full, descFont, descMax * descLines);
        card.style.maxWidth = mobile ? '400px' : '620px';
        card.replaceChildren(
          el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' } },
            el('span', { style: { width: '26px', height: '26px', borderRadius: '50%', background: '#e5e7eb', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#374151' }, text: (site.value.trim() || crumb(url.value).split(' ')[0] || 'S').charAt(0).toUpperCase() }),
            el('span', {}, el('div', { style: { fontSize: '14px', color: '#202124' }, text: site.value.trim() || crumb(url.value).split(' › ')[0] }), el('div', { class: 'u', style: { fontSize: '12px', color: '#4d5156' }, text: crumb(url.value) }))),
          el('div', { class: 't', style: { fontSize: '20px', lineHeight: '1.3', color: '#1a0dab', marginBottom: '3px' }, dataset: { k: 'serp-title' }, text: t.text || 'Page title' }),
          el('div', { class: 'd', style: { fontSize: '14px', lineHeight: '1.58', color: '#4d5156' }, dataset: { k: 'serp-desc' }, text: dClip.text || 'Meta description' }));
        var tw = Math.round(widthOf(title.value.trim(), titleFont)), dw = Math.round(widthOf(full, descFont));
        meta.textContent = 'Title: ' + title.value.trim().length + ' characters, ' + tw + ' px of ' + titleMax + '. Description: ' + d.length + ' characters, ' + dw + ' px of ' + (descMax * descLines) + ' (' + descLines + ' lines).';
        var list = [];
        if (!title.value.trim()) list.push(['err', 'Add a title.']);
        else if (t.cut) list.push(['warn', 'The title is cut off at ' + titleMax + ' px. Move the important words to the front.']);
        else if (tw < 200) list.push(['warn', 'The title is short; there is room for a benefit or a keyword.']);
        else list.push(['ok', 'Title fits.']);
        if (!d) list.push(['err', 'Add a meta description, or Google will pick a sentence from the page.']);
        else if (dClip.cut) list.push(['warn', 'The description is truncated. Keep the call to action before the cut.']);
        else if (d.length < 70) list.push(['warn', 'The description is short. 120–155 characters usually fills both lines.']);
        else list.push(['ok', 'Description fits.']);
        if (title.value && desc.value && title.value.toLowerCase().split(/\W+/).filter(function (w) { return w.length > 3 && desc.value.toLowerCase().indexOf(w) > -1; }).length === 0) list.push(['warn', 'No word from the title appears in the description; the two usually reinforce each other.']);
        if (/[A-Z]{6,}/.test(title.value)) list.push(['warn', 'All-caps words in titles are often rewritten by Google.']);
        if (/\|.*\|/.test(title.value)) list.push(['warn', 'More than one separator: Google tends to keep only the first part.']);
        checks.replaceChildren.apply(checks, list.map(function (c) { return el('li', { style: { color: c[0] === 'ok' ? 'var(--ok)' : c[0] === 'err' ? 'var(--err)' : 'var(--warn)' }, text: c[1] }); }));
      }
      U.live([title, url, desc, site, date], draw);
      root.appendChild(U.panel(null, el('div', { class: 'gs-grid' }, field('Title tag', title, counter(title, 60)), field('URL', url), field('Site name', site), field('Published date (optional)', date)), field('Meta description', desc, counter(desc, 155))));
      root.appendChild(U.panel('Preview', device, card, meta, checks, U.note('Widths are measured in Arial at Google\'s sizes: titles are cut at about 600 px on desktop, descriptions at roughly two lines of 920 px. Google may still rewrite either one.')));
    }
  });
})();
