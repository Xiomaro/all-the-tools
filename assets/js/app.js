/* Application shell: sidebar, routing, home page, theme and density.
   Loaded last, after every tool module has registered itself. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  var view = document.getElementById('view');
  var relatedBox = document.getElementById('related');
  var sidebar = document.getElementById('sidebar');
  var searchTrigger = document.getElementById('search-trigger');
  var themeButton = document.getElementById('theme-toggle');
  var densityButton = document.getElementById('density-toggle');
  var menuButton = document.getElementById('menu-toggle');
  var regionLink = document.getElementById('region-link');

  /* --- category colour --------------------------------------------------- */

  /* Every coloured surface reads --cat-h / --cat-l / --cat-ld, so tinting a
     node is a matter of handing it the category's three numbers. */
  function tint(category) {
    if (!category) return null;
    return { '--cat-h': category.hue, '--cat-l': category.l + '%', '--cat-ld': category.ld + '%' };
  }

  /* --- theme ------------------------------------------------------------ */

  function readTheme() {
    try { return localStorage.getItem('att-theme'); } catch (e) { return null; }
  }

  function applyTheme(theme) {
    if (theme) document.documentElement.setAttribute('data-theme', theme);
    else document.documentElement.removeAttribute('data-theme');

    var dark = theme === 'dark' ||
      (!theme && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    themeButton.replaceChildren(Icons.svg(dark ? 'sun' : 'moon'));
    themeButton.title = dark ? 'Switch to the light theme' : 'Switch to the dark theme';
  }

  themeButton.addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-theme');
    var systemDark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
    var next = current ? (current === 'dark' ? 'light' : 'dark') : (systemDark ? 'light' : 'dark');
    try { localStorage.setItem('att-theme', next); } catch (e) { /* private browsing */ }
    applyTheme(next);
  });

  applyTheme(readTheme());

  /* --- density ---------------------------------------------------------- */

  function applyDensity() {
    var compact = Prefs.density() === 'compact';
    densityButton.replaceChildren(Icons.svg(compact ? 'layout' : 'list'));
    densityButton.title = compact ? 'Switch to comfortable cards' : 'Switch to a compact list';
    densityButton.setAttribute('aria-pressed', String(compact));
  }

  densityButton.addEventListener('click', function () {
    Prefs.setDensity(Prefs.density() === 'compact' ? 'comfortable' : 'compact');
    applyDensity();
  });

  applyDensity();

  menuButton.addEventListener('click', function () {
    var open = sidebar.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });

  searchTrigger.addEventListener('click', function () { Palette.open(''); });

  regionLink.replaceChildren(Icons.svg('globe'));

  /* --- sidebar ---------------------------------------------------------- */

  function sidebarLink(route, label, icon, count, category) {
    return el('a', { href: route, dataset: { route: route }, style: tint(category) },
      el('span', { class: 'nav-icon' }, icon),
      el('span', { class: 'nav-label', text: label }),
      count === null ? null : el('span', { class: 'count', text: String(count) }));
  }

  /* Sections fold away; which ones are folded is remembered per browser.
     The section holding the current page is always opened. */
  var NAV_KEY = 'att-nav-folded';
  function foldedSections() {
    try { var v = JSON.parse(localStorage.getItem(NAV_KEY) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function setFolded(id, folded) {
    var list = foldedSections().filter(function (x) { return x !== id; });
    if (folded) list.push(id);
    try { localStorage.setItem(NAV_KEY, JSON.stringify(list)); } catch (e) { /* private browsing */ }
  }

  function buildSidebar() {
    var nodes = [
      el('div', { class: 'nav-group' },
        sidebarLink('#/', 'Home', Icons.svg('home'), Tools.count()),
        sidebarLink('#/pinned', 'Pinned', Icons.svg('star'), Prefs.pins().length),
        sidebarLink('#/changelog', 'What’s new', Icons.svg('clock'), null))
    ];

    var folded = foldedSections();
    Tools.sections.forEach(function (section) {
      var links = [];
      Tools.inSection(section.id).forEach(function (category) {
        var n = Tools.byCategory(category.id).length;
        if (!n) return;
        links.push(sidebarLink('#/c/' + category.id, category.name,
          Icons.forCategory(category.id), n, category));
      });
      if (!links.length) return;
      var group = el('div', { class: 'nav-group', id: 'nav-' + section.id }, links);
      var toggle = el('button', {
        type: 'button', class: 'nav-section', 'aria-controls': 'nav-' + section.id,
        onclick: function () {
          var open = toggle.getAttribute('aria-expanded') !== 'true';
          toggle.setAttribute('aria-expanded', String(open));
          group.hidden = !open;
          setFolded(section.id, !open);
        }
      }, el('span', { text: section.name }), Icons.svg('chevron'));
      var isFolded = folded.indexOf(section.id) > -1;
      toggle.setAttribute('aria-expanded', String(!isFolded));
      group.hidden = isFolded;
      nodes.push(el('div', { class: 'nav-block', dataset: { section: section.id } }, toggle, group));
    });

    sidebar.replaceChildren.apply(sidebar, nodes);
    markCurrent(currentRoute);
    document.getElementById('tool-count').textContent = Tools.count() + ' tools';
  }

  var currentRoute = '#/';

  function markCurrent(route) {
    currentRoute = route;
    sidebar.querySelectorAll('a').forEach(function (a) {
      var here = a.dataset.route === route;
      a.classList.toggle('current', here);
      if (here) {
        /* Unfold the section that holds the current page. */
        var block = a.closest('.nav-block');
        var group = block && block.querySelector('.nav-group');
        if (group && group.hidden) {
          group.hidden = false;
          block.querySelector('.nav-section').setAttribute('aria-expanded', 'true');
        }
      }
    });
  }

  /* --- tool cards ------------------------------------------------------- */

  function pinButton(tool, onToggle) {
    var button = el('button', {
      type: 'button', class: 'pin-btn',
      onclick: function (e) {
        e.preventDefault();
        e.stopPropagation();
        var nowPinned = Prefs.togglePin(tool.id);
        U.toast(nowPinned ? 'Pinned ' + tool.name : 'Unpinned ' + tool.name);
        if (onToggle) onToggle(nowPinned);
      }
    });

    function paint() {
      var pinned = Prefs.isPinned(tool.id);
      button.classList.toggle('on', pinned);
      button.title = pinned ? 'Unpin ' + tool.name : 'Pin ' + tool.name;
      button.setAttribute('aria-label', button.title);
      button.setAttribute('aria-pressed', String(pinned));
      button.replaceChildren(Icons.svg('star'));
    }

    paint();
    button.addEventListener('repaint', paint);
    return button;
  }

  function card(tool) {
    var category = Tools.category(tool.category);
    var button = pinButton(tool, function () { button.dispatchEvent(new CustomEvent('repaint')); });

    return el('div', { class: 'tool-card-wrap', style: tint(category) },
      el('a', { class: 'tool-card', href: '#/t/' + tool.id },
        el('span', { class: 'tool-icon' }, Icons.forTool(tool)),
        el('span', { class: 'tool-text' },
          el('strong', { class: 'tool-name', text: tool.name }),
          el('span', { class: 'tool-desc', text: tool.description || '' })),
        el('span', { class: 'tool-cat', text: category ? category.short : '' })),
      button);
  }

  function grid(tools) {
    return el('div', { class: 'card-grid' }, tools.map(card));
  }

  /* --- home ------------------------------------------------------------- */

  function toolsFrom(ids) {
    return ids.map(function (id) { return Tools.get(id); })
              .filter(function (tool) { return !!tool; });
  }

  function shelf(title, icon, tools, extra) {
    return [
      el('div', { class: 'section-title' },
        el('h2', {}, el('span', { class: 'section-icon' }, icon), title),
        extra || null),
      grid(tools)
    ];
  }

  function categoryTile(category) {
    var tools = Tools.byCategory(category.id);

    /* Spread the sample across the alphabet rather than taking the first
       four, so the chips hint at the range instead of showing four tools
       that all start with A. */
    var step = Math.max(1, Math.floor(tools.length / 4));
    var sample = [];
    for (var i = 0; i < tools.length && sample.length < 4; i += step) {
      sample.push(el('span', { class: 'chip', text: tools[i].name }));
    }

    return el('a', { class: 'cat-tile', href: '#/c/' + category.id, style: tint(category) },
      el('span', { class: 'cat-tile-top' },
        el('span', { class: 'cat-tile-icon' }, Icons.forCategory(category.id)),
        el('span', { class: 'cat-tile-count', text: tools.length + ' tools' })),
      el('strong', { class: 'cat-tile-name', text: category.name }),
      el('span', { class: 'cat-tile-blurb', text: category.blurb }),
      el('span', { class: 'cat-tile-chips' }, sample));
  }

  function renderHome() {
    markCurrent('#/');

    var nodes = [
      el('div', { class: 'hero' },
        el('h1', { text: 'All The Tools' }),
        el('p', { text: Tools.count() + ' small utilities for documents, media, text, code, numbers and everyday life, ' +
          'in ' + Tools.categories.length + ' categories. Everything runs in this tab: nothing you paste or drop in is uploaded.' }),
        el('button', { type: 'button', class: 'hero-search', onclick: function () { Palette.open(''); } },
          Icons.svg('search'),
          el('span', { text: 'Search every tool' }),
          el('kbd', { text: shortcutLabel() })))
    ];

    var pinned = toolsFrom(Prefs.pins());
    if (pinned.length) {
      nodes = nodes.concat(shelf('Pinned', Icons.svg('star'), pinned,
        el('a', { href: '#/pinned', text: 'Manage →' })));
    }

    var recent = toolsFrom(Prefs.recent()).filter(function (tool) {
      return !pinned.some(function (p) { return p.id === tool.id; });
    }).slice(0, 6);

    if (recent.length) {
      nodes = nodes.concat(shelf('Recently used', Icons.svg('clock'), recent,
        el('button', {
          type: 'button', class: 'link-btn', text: 'Clear',
          onclick: function () { Prefs.clearRecent(); route(); }
        })));
    }

    if (!pinned.length && !recent.length) {
      nodes.push(el('p', { class: 'note' },
        'Tip: press ', el('kbd', { text: shortcutLabel() }), ' anywhere to jump straight to a tool, ' +
        'and use the star on any card to pin the ones you keep coming back to.'));
    }

    nodes.push(el('div', { class: 'section-title' },
      el('h2', {}, el('span', { class: 'section-icon' }, Icons.svg('grid')), 'Browse by category')));

    Tools.sections.forEach(function (section) {
      var cats = Tools.inSection(section.id).filter(function (c) { return Tools.byCategory(c.id).length; });
      if (!cats.length) return;
      var count = cats.reduce(function (n, c) { return n + Tools.byCategory(c.id).length; }, 0);
      nodes.push(el('h3', { class: 'home-section' }, section.name, el('span', { text: count + ' tools' })));
      nodes.push(el('div', { class: 'cat-grid' }, cats.map(categoryTile)));
    });

    view.replaceChildren.apply(view, nodes);
  }

  function renderPinned() {
    markCurrent('#/pinned');
    var pinned = toolsFrom(Prefs.pins());

    view.replaceChildren(
      crumbs('Pinned'),
      el('div', { class: 'page-head' },
        el('h1', {}, el('span', { class: 'head-icon' }, Icons.svg('star')), 'Pinned tools'),
        el('p', { text: pinned.length
          ? 'The ' + pinned.length + ' tool' + (pinned.length === 1 ? '' : 's') + ' you have starred. They are kept in this browser.'
          : 'Nothing pinned yet. Press the star on any tool card and it will appear here and on the home page.' })),
      pinned.length ? grid(pinned) : el('p', {}, el('a', { href: '#/', text: '← Browse the categories' })));
  }

  /* --- category --------------------------------------------------------- */

  function crumbs() {
    var trail = [el('a', { href: '#/', text: 'All tools' })];
    for (var i = 0; i < arguments.length; i++) {
      trail.push(' / ');
      trail.push(arguments[i]);
    }
    return el('p', { class: 'crumbs' }, trail);
  }

  function renderCategory(id) {
    var category = Tools.category(id);
    if (!category) return renderMissing('That category does not exist.');
    markCurrent('#/c/' + id);

    var tools = Tools.byCategory(id);
    var shelves = Shelves.forCategory(id);
    var host = el('div', { class: 'cat-tools' });

    function matches(tool, q) {
      return (tool.name + ' ' + tool.id + ' ' + (tool.description || '') + ' ' +
              tool.keywords.join(' ')).toLowerCase().indexOf(q) > -1;
    }

    /* Jump links to each shelf. Buttons, not #anchors, because the hash is
       the router's. */
    var jump = shelves ? el('nav', { class: 'shelf-jump', 'aria-label': 'Groups in ' + category.name },
      shelves.map(function (shelf, i) {
        return el('button', {
          type: 'button', class: 'chip',
          onclick: function () {
            var target = document.getElementById('shelf-' + i);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, shelf.name, el('span', { text: String(shelf.tools.length) }));
      })) : null;

    function paint(query) {
      var q = query.trim().toLowerCase();
      if (!shelves) {
        var shown = q ? tools.filter(function (t) { return matches(t, q); }) : tools;
        host.replaceChildren(shown.length ? grid(shown)
          : el('p', { class: 'note', text: 'No tool in ' + category.name + ' matches “' + query + '”.' }));
        return;
      }
      var nodes = [];
      shelves.forEach(function (shelf, i) {
        var list = q ? shelf.tools.filter(function (t) { return matches(t, q); }) : shelf.tools;
        if (!list.length) return;
        nodes.push(el('h2', { class: 'shelf-title', id: 'shelf-' + i }, shelf.name, el('span', { text: String(list.length) })));
        nodes.push(grid(list));
      });
      if (jump) jump.hidden = !!q;
      host.replaceChildren.apply(host, nodes.length ? nodes
        : [el('p', { class: 'note', text: 'No tool in ' + category.name + ' matches “' + query + '”.' })]);
    }

    var filter = el('input', {
      type: 'search', class: 'filter-box', spellcheck: false, autocomplete: 'off',
      placeholder: 'Filter these ' + tools.length + ' tools…',
      'aria-label': 'Filter ' + category.name,
      oninput: U.debounce(function () { paint(filter.value); }, 120)
    });

    paint('');

    view.replaceChildren(
      crumbs(category.name),
      el('div', { class: 'page-head cat-head', style: tint(category) },
        el('h1', {}, el('span', { class: 'head-icon' }, Icons.forCategory(id)), category.name),
        el('p', { text: category.blurb }),
        el('div', { class: 'cat-head-tools' },
          filter,
          el('span', { class: 'pill', text: tools.length + ' tools' }))),
      jump,
      host);
  }

  function renderSearch(query) {
    markCurrent('');
    var results = Tools.search(query);
    view.replaceChildren(
      crumbs('Search'),
      el('div', { class: 'page-head' },
        el('h1', {}, el('span', { class: 'head-icon' }, Icons.svg('search')), 'Search'),
        el('p', { text: results.length
          ? results.length + ' tool' + (results.length === 1 ? '' : 's') + ' matching “' + query + '”'
          : 'Nothing matches “' + query + '”. Try a shorter word, or browse the categories.' })),
      grid(results));
  }

  /* --- tool ------------------------------------------------------------- */

  var currentTool = null;

  function renderTool(id) {
    var tool = Tools.get(id);
    if (!tool) {
      /* An old link to a tool that was merged into another one. */
      var to = Tools.resolve(id);
      if (to) { location.replace('#/t/' + to); return; }
      return renderMissing('There is no tool with the id “' + id + '”.');
    }

    var category = Tools.category(tool.category);
    markCurrent('#/c/' + tool.category);
    Prefs.remember(tool.id);

    var host = el('div', { class: 'stack' });
    var button = pinButton(tool, function () { button.dispatchEvent(new CustomEvent('repaint')); });

    view.replaceChildren(
      crumbs(el('a', { href: '#/c/' + tool.category, text: category ? category.name : '' }), tool.name),
      el('div', { class: 'page-head tool-head', style: tint(category) },
        el('span', { class: 'head-icon big' }, Icons.forTool(tool)),
        el('div', { class: 'tool-head-text' },
          el('h1', { text: tool.name }),
          el('p', { text: tool.description || '' })),
        button),
      tool.online ? el('div', { class: 'banner info', text: 'Network use: ' + tool.online }) : '',
      host);

    currentTool = host;
    try {
      tool.render(host);
    } catch (err) {
      host.appendChild(el('div', { class: 'banner', text: 'This tool failed to start: ' + (err.message || err) }));
      if (window.console) console.error(err);
    }

    /* Suggestions live outside #view, so nothing a tool reads or renders
       (or a test inspects) ever sees them. */
    var near = Shelves.related(tool, 8);
    if (near.length) {
      relatedBox.replaceChildren(
        el('h2', { text: 'Related tools' }),
        el('div', { class: 'related-list' }, near.map(function (t) {
          return el('a', { href: '#/t/' + t.id, style: tint(Tools.category(t.category)) },
            el('span', { class: 'related-icon' }, Icons.forTool(t)),
            el('span', { text: t.name }));
        })));
      relatedBox.hidden = false;
    }
  }

  /* --- regional settings ------------------------------------------------ */

  var REGION_LABELS = {
    units: { metric: 'Metric (kg, cm, km)', imperial: 'Imperial (lb, ft, miles)' },
    temperature: { C: 'Celsius (°C)', F: 'Fahrenheit (°F)' },
    paper: { a4: 'A4', letter: 'US Letter' },
    weekStart: { 1: 'Monday', 0: 'Sunday' }
  };

  function currencyLabel(code) {
    var name = code;
    try { name = new Intl.DisplayNames(['en-GB'], { type: 'currency' }).of(code); } catch (e) { /* older browsers */ }
    return code + ' ' + Region.symbol(code) + ' · ' + name;
  }

  function renderSettings() {
    markCurrent('');
    var body = el('div', { class: 'stack' });

    function paint() {
      var r = Region.get(), base = Region.country(r.country);
      var country = U.select({
        label: 'Country', value: r.country,
        options: Region.COUNTRIES.map(function (c) { return { value: c.code, label: c.name }; }),
        hint: 'Sets every option below to what is usual there. You can then change any of them.'
      });
      country.querySelector('select').addEventListener('change', function (e) {
        Region.setCountry(e.target.value);
        paint();
        U.toast('Defaults set for ' + Region.get().countryName);
      });

      function option(key, label, format) {
        var w = U.select({
          label: label, value: String(r[key]),
          options: Region.CHOICES[key].map(function (v) {
            return { value: String(v), label: format(v) + (v === base[key] ? ' (default)' : '') };
          })
        });
        w.querySelector('select').addEventListener('change', function (e) {
          var v = e.target.value;
          Region.setOverride(key, key === 'weekStart' ? Number(v) : v);
        });
        return w;
      }

      body.replaceChildren(
        U.panel('Where you are', country),
        U.panel('Defaults',
          el('div', { class: 'split' },
            option('currency', 'Currency', currencyLabel),
            option('units', 'Measurements', function (v) { return REGION_LABELS.units[v]; }),
            option('temperature', 'Temperature', function (v) { return REGION_LABELS.temperature[v]; }),
            option('paper', 'Paper size', function (v) { return REGION_LABELS.paper[v]; }),
            option('weekStart', 'Weeks start on', function (v) { return REGION_LABELS.weekStart[v]; })),
          U.note('Tools start from these choices, and you can still change them inside any tool. Tools about one country’s rules, such as UK Take-Home Pay or Stamp Duty, keep that country’s currency.'),
          U.btnrow(U.button('Reset to United Kingdom', function () { Region.reset(); paint(); U.toast('Regional settings reset'); }, 'ghost'))));
    }
    paint();

    view.replaceChildren(
      crumbs('Regional settings'),
      el('div', { class: 'page-head' },
        el('h1', {}, el('span', { class: 'head-icon' }, Icons.svg('globe')), 'Regional settings'),
        el('p', { text: 'Choose your country so tools open with your currency, measurements, paper size and calendar. The choice is kept in this browser only.' })),
      body);
  }

  /* --- changelog -------------------------------------------------------- */

  var CHANGE_LABELS = { added: 'Added', improved: 'Improved', fixed: 'Fixed' };

  function changeDate(iso) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-GB',
      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  /* Long lists fold away so a big release doesn't bury the rest of the page. */
  function changeTools(ids) {
    var links = [];
    ids.forEach(function (id) {
      var tool = Tools.get(Tools.resolve(id));
      if (!tool) return;
      links.push(el('a', { class: 'pill', href: '#/t/' + tool.id, style: tint(Tools.category(tool.category)), text: tool.name }));
    });
    if (!links.length) return null;
    var list = el('div', { class: 'change-tools' }, links);
    if (links.length <= 24) return list;
    return el('details', { class: 'change-more' }, el('summary', { text: 'Show all ' + links.length + ' tools' }), list);
  }

  function renderChangelog() {
    markCurrent('#/changelog');
    var days = (window.Changelog || []).map(function (day) {
      return el('section', { class: 'panel change-day' },
        el('h3', {}, el('time', { datetime: day.date, text: changeDate(day.date) })),
        el('ul', { class: 'change-list' }, day.changes.map(function (c) {
          return el('li', { class: 'change change-' + c.type },
            el('span', { class: 'change-type', text: CHANGE_LABELS[c.type] || c.type }),
            el('div', { class: 'change-body' }, el('p', { text: c.text }), c.tools ? changeTools(c.tools) : null));
        })));
    });

    view.replaceChildren(
      crumbs('What’s new'),
      el('div', { class: 'page-head' },
        el('h1', {}, el('span', { class: 'head-icon' }, Icons.svg('clock')), 'What’s new'),
        el('p', { text: 'Every tool added and every notable fix, newest first.' })),
      el('div', {}, days));
  }

  function renderMissing(message) {
    markCurrent('');
    view.replaceChildren(
      el('div', { class: 'page-head' }, el('h1', { text: 'Not found' }), el('p', { text: message })),
      el('p', {}, el('a', { href: '#/', text: '← Back to all tools' })));
  }

  /* --- routing ---------------------------------------------------------- */

  function route() {
    /* Give the outgoing tool a chance to stop timers and release resources. */
    if (currentTool) {
      currentTool.dispatchEvent(new CustomEvent('tool-teardown'));
      currentTool = null;
    }

    var hash = location.hash || '#/';
    relatedBox.hidden = true;
    relatedBox.replaceChildren();
    sidebar.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');

    if (hash.indexOf('#/t/') === 0) renderTool(decodeURIComponent(hash.slice(4)));
    else if (hash.indexOf('#/c/') === 0) renderCategory(decodeURIComponent(hash.slice(4)));
    else if (hash.indexOf('#/search/') === 0) renderSearch(decodeURIComponent(hash.slice(9)));
    else if (hash === '#/pinned') renderPinned();
    else if (hash === '#/settings') renderSettings();
    else if (hash === '#/changelog') renderChangelog();
    else renderHome();

    window.scrollTo(0, 0);
    document.title = (hash === '#/' ? 'All The Tools' : (view.querySelector('h1') || {}).textContent + ' — All The Tools');
  }

  window.addEventListener('hashchange', route);

  /* --- keyboard --------------------------------------------------------- */

  function shortcutLabel() {
    return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘K' : 'Ctrl K';
  }

  /* --- start ------------------------------------------------------------ */

  Prefs.prune(Tools.resolve);
  Prefs.onChange(function () {
    var pinnedLink = sidebar.querySelector('a[data-route="#/pinned"] .count');
    if (pinnedLink) pinnedLink.textContent = String(Prefs.pins().length);
    if (window.Palette) Palette.refresh();
  });

  searchTrigger.querySelector('kbd').textContent = shortcutLabel();

  buildSidebar();
  route();
})();
