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

  /* The six sections work as an accordion: one open at a time, so the
     sidebar is ten lines rather than thirty-odd. Opening the page of a
     category opens its section. */
  var SECTION_ICONS = { media: 'docs', writing: 'type', code: 'code', numbers: 'calculator', life: 'home', play: 'gamepad' };

  function openSection(block) {
    sidebar.querySelectorAll('.nav-block').forEach(function (other) {
      var open = other === block;
      other.querySelector('.nav-section').setAttribute('aria-expanded', String(open));
      other.querySelector('.nav-group').hidden = !open;
    });
  }

  function buildSidebar() {
    var nodes = [
      el('div', { class: 'nav-group' },
        sidebarLink('#/', 'Home', Icons.svg('home'), Tools.count()),
        sidebarLink('#/pinned', 'Pinned', Icons.svg('star'), Prefs.pins().length),
        sidebarLink('#/recipes', 'Guided recipes', Icons.svg('checklist'), Discover.recipes.length),
        sidebarLink('#/changelog', 'What’s new', Icons.svg('clock'), null)),
      el('h2', { class: 'nav-heading', text: 'Browse' })
    ];

    Tools.sections.forEach(function (section) {
      var links = [], total = 0;
      Tools.inSection(section.id).forEach(function (category) {
        var n = Tools.byCategory(category.id).length;
        if (!n) return;
        total += n;
        links.push(sidebarLink('#/c/' + category.id, category.name,
          Icons.forCategory(category.id), n, category));
      });
      if (!links.length) return;
      var group = el('div', { class: 'nav-group nav-sub', id: 'nav-' + section.id, hidden: true }, links);
      var block = el('div', { class: 'nav-block', dataset: { section: section.id } });
      var toggle = el('button', {
        type: 'button', class: 'nav-section', 'aria-controls': 'nav-' + section.id, 'aria-expanded': 'false',
        onclick: function () { openSection(toggle.getAttribute('aria-expanded') === 'true' ? null : block); }
      },
        el('span', { class: 'nav-icon' }, Icons.svg(SECTION_ICONS[section.id] || 'grid')),
        el('span', { class: 'nav-label', text: section.name }),
        el('span', { class: 'count', text: String(total) }),
        Icons.svg('chevron'));
      block.append(toggle, group);
      nodes.push(block);
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
        /* Open the section that holds the current page. */
        var block = a.closest('.nav-block');
        if (block) openSection(block);
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
      el('a', { class: 'tool-card', href: Tools.href(tool.id) },
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

  /* A bigger card for a many-in-one tool, listing what's inside. The name is
     the card's main link (it stretches over the card); each part is its own
     link to that tab. */
  function featureCard(tool) {
    var category = Tools.category(tool.category);
    var parts = tool.parts || [];
    var SHOW = 8;
    var button = pinButton(tool, function () { button.dispatchEvent(new CustomEvent('repaint')); });
    var tab = function (p) { return '#/t/' + tool.id + '?tab=' + encodeURIComponent(p.tab); };

    return el('div', { class: 'feature-card', style: tint(category) },
      el('span', { class: 'tool-icon' }, Icons.forTool(tool)),
      el('div', { class: 'feature-text' },
        parts.length ? el('span', { class: 'feature-kicker', text: parts.length + ' tools in one' }) : null,
        el('a', { class: 'feature-name', href: Tools.href(tool.id), text: tool.name }),
        el('span', { class: 'tool-desc', text: tool.description || '' }),
        parts.length ? el('div', { class: 'feature-parts' },
          parts.slice(0, SHOW).map(function (p) { return el('a', { href: tab(p), text: p.label }); }),
          parts.length > SHOW ? el('a', { class: 'more', href: Tools.href(tool.id), text: '+' + (parts.length - SHOW) + ' more' }) : null) : null),
      button);
  }

  function featureGrid(tools) {
    return el('div', { class: 'feature-grid' }, tools.map(featureCard));
  }

  /* --- home ------------------------------------------------------------- */

  function toolsFrom(ids) {
    return ids.map(function (id) { return Tools.entry(id); })
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

  function joinNames(names) {
    return names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  }

  /* A small tool link. `hand` is what to pass on to the tool when it opens:
     the files dropped or the text pasted on the home page. */
  function pick(tool, hand) {
    return el('a', {
      class: 'pick', href: Tools.href(tool.id), style: tint(Tools.category(tool.category)),
      onclick: function () { U.handoff(hand || null); }
    },
      el('span', { class: 'pick-icon' }, Icons.forTool(tool)),
      el('span', { text: tool.name }));
  }

  /* A row of picks showing the first few, with a button for the rest. */
  function pickRow(tools, handFor, quiet) {
    var SHOW = 8;
    var row = el('div', { class: 'picks' + (quiet ? ' quiet' : '') }, tools.slice(0, SHOW).map(function (t) { return pick(t, handFor(t)); }));
    if (tools.length > SHOW) {
      var more = el('button', {
        type: 'button', class: 'pick pick-more', text: '+ ' + (tools.length - SHOW) + ' more',
        onclick: function () {
          more.replaceWith.apply(more, tools.slice(SHOW).map(function (t) { return pick(t, handFor(t)); }));
        }
      });
      row.appendChild(more);
    }
    return row;
  }

  /* The box at the top of the home page. Type to search; paste something
     (a JWT, a colour, a timestamp, a paragraph…) to be told which tools fit
     it; drop or paste a file to see what can be done with it. Whatever was
     pasted or dropped goes straight into the tool picked. */
  var homeIntake = null;

  function intake() {
    var files = null;
    var results = el('div', { class: 'intake-results', 'aria-live': 'polite', hidden: true });
    var picker = el('input', {
      type: 'file', multiple: true, hidden: true,
      onchange: function () { if (picker.files.length) showFiles(Array.prototype.slice.call(picker.files)); picker.value = ''; }
    });
    var box = el('textarea', {
      class: 'intake-input', rows: 1, spellcheck: false, autocomplete: 'off',
      placeholder: 'Search, paste anything, or drop a file…',
      'aria-label': 'Search the tools, or paste text or a file to find a tool for it',
      oninput: function () { files = null; fit(); paintSoon(); },
      onkeydown: function (e) {
        if (e.key === 'Enter' && !e.shiftKey && !/\n/.test(box.value)) {
          var first = results.querySelector('a[href^="#/t/"]');
          if (first) { e.preventDefault(); first.click(); }
        } else if (e.key === 'Escape' && (box.value || files)) {
          e.preventDefault(); clear();
        }
      },
      onpaste: function (e) {
        var list = e.clipboardData && e.clipboardData.files;
        if (list && list.length) { e.preventDefault(); showFiles(Array.prototype.slice.call(list)); }
      }
    });

    var paintSoon = U.debounce(paint, 90);

    function fit() {
      box.style.height = 'auto';
      box.style.height = Math.min(box.scrollHeight, 140) + 'px';
    }

    function clear() {
      files = null;
      box.value = '';
      fit();
      paint();
      box.focus();
    }

    function showFiles(list) {
      files = list;
      box.value = '';
      fit();
      paint();
      results.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function paintFiles() {
      var found = Discover.forFiles(files);
      var what = files.length === 1 ? files[0].name
        : files.length + ' ' + (found.same && found.kind ? found.kind.label + ' files' : 'files');
      var hand = { files: files };
      var main = toolsFrom(found.tools);
      var nodes = [
        el('div', { class: 'intake-file' },
          el('span', { class: 'intake-file-icon' }, Icons.svg('folder')),
          el('span', { class: 'intake-file-text' }, 'What would you like to do with ', el('strong', { text: what }), '?'),
          el('button', { type: 'button', class: 'link-btn', text: 'Clear', onclick: clear }))
      ];
      function handFor(t) { return Object.assign({ tool: t.id }, hand); }
      if (main.length) {
        nodes.push(pickRow(main, handFor));
      } else {
        nodes.push(el('p', { class: 'note', text: 'None of the tools is made for this kind of file, but these work with any file:' }));
      }
      var extra = toolsFrom(found.extra);
      if (extra.length) {
        if (main.length) nodes.push(el('p', { class: 'intake-label', text: 'Works with any file' }));
        nodes.push(pickRow(extra, handFor, true));
      }
      return nodes;
    }

    function paintText(text) {
      var q = text.trim();
      var nodes = [];
      var found = Discover.detect(text);

      found.slice(0, 3).forEach(function (d) {
        var tools = toolsFrom(d.tools);
        if (!tools.length) return;
        nodes.push(el('p', { class: 'intake-label' }, 'Looks like ', el('strong', { text: d.label }),
          d.hand ? ' · open it in' : ' · try'));
        nodes.push(el('div', { class: 'picks' }, tools.map(function (t) {
          return pick(t, d.hand ? { text: text, tool: t.id } : null);
        })));
      });

      /* A short line is a search as well; a pasted block isn't. */
      if (q.length <= 60 && !/\n/.test(q) && (!found.length || /[a-z]{3,}/i.test(q))) {
        var hits = Tools.search(q);
        if (hits.length) {
          nodes.push(el('p', { class: 'intake-label', text: found.length ? 'Tools matching “' + q + '”' : '' }));
          if (!found.length) nodes[nodes.length - 1].hidden = true;
          nodes.push(grid(hits.slice(0, 6)));
          if (hits.length > 6) {
            nodes.push(el('a', { class: 'intake-more', href: '#/search/' + encodeURIComponent(q),
              text: 'See all ' + hits.length + ' matches →' }));
          }
        }
      }
      if (!nodes.length) {
        nodes.push(el('p', { class: 'note', text: 'Nothing matches that. Try a shorter word, such as “pdf”, “timer” or “colour”.' }));
      }
      return nodes;
    }

    function paint() {
      var nodes = files ? paintFiles() : box.value.trim() ? paintText(box.value) : null;
      results.hidden = !nodes;
      results.replaceChildren.apply(results, nodes || []);
    }

    var wrap = el('div', { class: 'intake' },
      el('div', {
        class: 'intake-box',
        onclick: function (e) { if (!e.target.closest('button, textarea')) box.focus(); }
      },
        Icons.svg('search'),
        box,
        el('button', {
          type: 'button', class: 'btn intake-choose', onclick: function (e) { e.preventDefault(); picker.click(); }
        }, Icons.svg('folder'), el('span', { text: 'Choose a file' })),
        picker),
      results);

    wrap.showFiles = showFiles;
    wrap.focusBox = function () { box.focus(); };
    return wrap;
  }

  /* Dropping a file anywhere on the home page hands it to the intake box. */
  function dragHasFiles(e) {
    return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') > -1;
  }
  document.addEventListener('dragover', function (e) {
    if (!homeIntake || !dragHasFiles(e)) return;
    e.preventDefault();
    homeIntake.classList.add('over');
  });
  document.addEventListener('dragleave', function (e) {
    if (homeIntake && !e.relatedTarget) homeIntake.classList.remove('over');
  });
  document.addEventListener('drop', function (e) {
    if (!homeIntake || !e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault();
    homeIntake.classList.remove('over');
    homeIntake.showFiles(Array.prototype.slice.call(e.dataTransfer.files));
  });

  /* "Show me tools for…": ticking modes reorders the page around them. */
  function modePicker(onChange) {
    var row = el('div', { class: 'modes', role: 'group', 'aria-label': 'Show me tools for' });
    function paint() {
      var picked = Prefs.modes();
      row.replaceChildren.apply(row, [el('span', { class: 'modes-label', text: 'Show me tools for' })]
        .concat(Discover.modes.map(function (m) {
          var on = picked.indexOf(m.id) > -1;
          return el('button', {
            type: 'button', class: 'mode-chip' + (on ? ' on' : ''), 'aria-pressed': String(on), title: m.name,
            onclick: function () {
              var list = Prefs.modes();
              var at = list.indexOf(m.id);
              if (at > -1) list.splice(at, 1); else list.push(m.id);
              Prefs.setModes(list);
              paint();
              onChange();
            }
          }, Icons.svg(m.icon), el('span', { text: m.short || m.name }));
        }))
        .concat(picked.length ? [el('button', {
          type: 'button', class: 'link-btn modes-reset', text: 'Show everything',
          onclick: function () { Prefs.setModes([]); paint(); onChange(); }
        })] : []));
    }
    paint();
    return row;
  }

  function recipeCard(recipe) {
    return el('a', { class: 'recipe-card', href: '#/r/' + recipe.id },
      el('span', { class: 'recipe-card-icon' }, Icons.svg(recipe.icon || 'checklist')),
      el('span', { class: 'recipe-card-text' },
        el('strong', { text: recipe.name }),
        el('span', { text: recipe.blurb })),
      el('span', { class: 'recipe-card-steps', text: recipe.steps.length + ' steps' }));
  }

  /* Recipes for the picked modes first, then the rest in their own order. */
  function recipesFor(modes) {
    var list = Discover.recipes.slice();
    if (!modes.length) return list;
    function hits(r) { return (r.modes || []).filter(function (m) { return modes.indexOf(m) > -1; }).length; }
    return list.map(function (r, i) { return { r: r, i: i, h: hits(r) }; })
      .sort(function (a, b) { return b.h - a.h || a.i - b.i; })
      .map(function (x) { return x.r; });
  }

  function dailyCard() {
    var tool = Discover.toolOfTheDay();
    if (!tool) return null;
    var category = Tools.category(tool.category);
    return el('a', { class: 'daily', href: Tools.href(tool.id), style: tint(category) },
      el('span', { class: 'daily-eyebrow' }, Icons.svg('sparkle'), 'Tool of the day'),
      el('span', { class: 'daily-icon' }, Icons.forTool(tool)),
      el('strong', { class: 'daily-name', text: tool.name }),
      el('span', { class: 'daily-desc', text: tool.description || '' }),
      el('span', { class: 'daily-go', text: 'Try it →' }));
  }

  /* One card per section listing its categories: six cards instead of 29
     tiles. */
  function catRow(c) {
    return el('a', { class: 'sec-cat', href: '#/c/' + c.id, style: tint(c) },
      el('span', { class: 'section-icon', style: tint(c) }, Icons.forCategory(c.id)),
      el('span', { class: 'sec-cat-name', text: c.name }),
      el('span', { class: 'sec-cat-count', text: String(Tools.byCategory(c.id).length) }));
  }

  function sectionCard(title, cats, wide) {
    var count = cats.reduce(function (n, c) { return n + Tools.byCategory(c.id).length; }, 0);
    return el('div', { class: 'sec-card' + (wide ? ' wide' : '') },
      el('div', { class: 'sec-card-head' },
        el('strong', { text: title }),
        el('span', { text: count + ' tools' })),
      el('div', { class: 'sec-card-cats' }, cats.map(catRow)));
  }

  function sectionCards(keep) {
    var cards = [];
    Tools.sections.forEach(function (section) {
      var cats = Tools.inSection(section.id).filter(function (c) { return Tools.byCategory(c.id).length && keep(c); });
      if (cats.length) cards.push(sectionCard(section.name, cats));
    });
    return cards.length ? el('div', { class: 'sec-grid' }, cards) : null;
  }

  function browse(modes) {
    var title = el('div', { class: 'section-title' },
      el('h2', {}, el('span', { class: 'section-icon' }, Icons.svg('grid')), 'Browse by category'));
    if (!modes.length) return [title, sectionCards(function () { return true; })];

    var mine = Discover.categoriesFor(modes);
    var rest = Tools.categories.filter(function (c) { return mine.indexOf(c.id) === -1 && Tools.byCategory(c.id).length; });
    var nodes = [title, sectionCard('For ' + joinNames(modes.map(function (id) { return Discover.mode(id).name; })),
      mine.map(Tools.category).filter(function (c) { return c && Tools.byCategory(c.id).length; }), true)];
    if (rest.length) {
      nodes.push(el('details', { class: 'more-cats' },
        el('summary', {}, 'Everything else', el('span', { text: rest.length + ' more categories' })),
        sectionCards(function (c) { return mine.indexOf(c.id) === -1; })));
    }
    return nodes;
  }

  function homeBody() {
    var modes = Prefs.modes();
    var nodes = [];

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

    /* The editors and other all-in-one tools, narrowed to the ticked modes. */
    var cats = modes.length ? Discover.categoriesFor(modes) : null;
    var big = Shelves.flagships().filter(function (t) { return !cats || cats.indexOf(t.category) > -1; });
    if (big.length) {
      nodes.push(el('div', { class: 'section-title' },
        el('h2', {}, el('span', { class: 'section-icon' }, Icons.svg('sparkle')), 'All-in-one tools')));
      nodes.push(featureGrid(big));
    }

    var names = modes.map(function (id) { var m = Discover.mode(id); return m ? m.name : null; }).filter(Boolean);
    var top = toolsFrom(names.length ? Discover.forModes(modes, 12) : Discover.popular(12));
    nodes = nodes.concat(shelf(names.length ? 'Most used for ' + joinNames(names) : 'Most popular',
      Icons.svg('trending'), top));
    nodes[nodes.length - 1].classList.add('top-grid');

    var recipes = recipesFor(modes);
    nodes.push(el('div', { class: 'home-band' },
      dailyCard(),
      el('section', { class: 'home-recipes' },
        el('div', { class: 'section-title' },
          el('h2', {}, el('span', { class: 'section-icon' }, Icons.svg('checklist')), 'Guided recipes'),
          el('a', { href: '#/recipes', text: 'All ' + recipes.length + ' →' })),
        el('p', { class: 'note', text: 'Step-by-step help for jobs that take more than one tool.' }),
        el('div', { class: 'recipe-grid' }, recipes.slice(0, 4).map(recipeCard)))));

    return nodes.concat(browse(modes));
  }

  function renderHome() {
    markCurrent('#/');
    var box = intake();
    var body = el('div', { class: 'home-body' }, homeBody());

    view.replaceChildren(
      el('div', { class: 'hero' },
        el('h1', { text: 'What do you need to do?' }),
        el('p', { text: 'Search ' + Tools.count() + ' free tools, drop in a file or paste some text, and the right tools come up. ' +
          'Everything runs in this tab: nothing you paste or drop in is uploaded.' }),
        box,
        modePicker(function () { body.replaceChildren.apply(body, homeBody()); })),
      body);

    homeIntake = box;
  }

  /* --- recipes ---------------------------------------------------------- */

  function renderRecipes() {
    markCurrent('#/recipes');
    view.replaceChildren(
      crumbs('Recipes'),
      el('div', { class: 'page-head' },
        el('h1', {}, el('span', { class: 'head-icon' }, Icons.svg('checklist')), 'Guided recipes'),
        el('p', { text: 'Some jobs take more than one tool. Each recipe walks you through them in order, with a bar at the top of each tool to take you to the next step.' })),
      el('div', { class: 'recipe-grid wide' }, Discover.recipes.map(recipeCard)));
  }

  function renderRecipe(id) {
    var recipe = Discover.recipe(id);
    if (!recipe) return renderMissing('There is no recipe called “' + id + '”.');
    markCurrent('#/recipes');

    function begin(i) { return function () { Discover.setRecipe(recipe.id, i); }; }

    view.replaceChildren(
      crumbs(el('a', { href: '#/recipes', text: 'Recipes' }), recipe.name),
      el('div', { class: 'page-head' },
        el('h1', {}, el('span', { class: 'head-icon' }, Icons.svg(recipe.icon || 'checklist')), recipe.name),
        el('p', { text: recipe.blurb })),
      el('ol', { class: 'recipe-steps' }, recipe.steps.map(function (step, i) {
        var tool = Tools.entry(step.tool);
        return el('li', { class: 'recipe-step', style: tint(Tools.category(tool.category)) },
          el('span', { class: 'recipe-num', text: String(i + 1) }),
          el('div', { class: 'recipe-body' },
            el('strong', { text: step.title }),
            el('p', { text: step.text }),
            el('a', { class: 'pick', href: Tools.href(step.tool), style: tint(Tools.category(tool.category)), onclick: begin(i) },
              el('span', { class: 'pick-icon' }, Icons.forTool(tool)),
              el('span', { text: tool.name }))));
      })),
      el('div', { class: 'btnrow' },
        el('a', { class: 'btn primary', href: Tools.href(recipe.steps[0].tool), onclick: begin(0), text: 'Start with step 1 →' })));
  }

  /* Shown above a tool that is a step in the recipe being followed. */
  function recipeBar(tool, params) {
    var active = Discover.activeRecipe();
    if (!active) return null;
    var recipe = Discover.recipe(active.id);

    /* Which step this page is. Two steps can be tabs of the same merged tool
       (Merge and Compress are both in the PDF Editor), so the tab decides
       between them; failing that, the step being followed, then the first. */
    var tab = params && params.tab;
    var steps = recipe.steps.map(function (s, i) {
      var e = Tools.entry(s.tool);
      return { i: i, id: Tools.resolve(s.tool), tab: e && e.shortcut ? e.tab : null };
    }).filter(function (s) { return s.id === tool.id; });
    if (!steps.length) return null;
    var onTab = steps.filter(function (s) { return s.tab && s.tab === tab; })[0];
    var following = steps.filter(function (s) { return s.i === active.step; })[0];
    var at = (onTab || following || steps[0]).i;
    Discover.setRecipe(recipe.id, at);

    var step = recipe.steps[at], prev = recipe.steps[at - 1], next = recipe.steps[at + 1];
    function go(i) { return function () { Discover.setRecipe(recipe.id, i); }; }
    var bar = el('div', { class: 'recipe-bar', role: 'region', 'aria-label': 'Recipe progress' },
      el('div', { class: 'recipe-bar-text' },
        el('a', { class: 'recipe-bar-name', href: '#/r/' + recipe.id }, Icons.svg('checklist'), el('span', { text: recipe.name })),
        el('strong', { text: 'Step ' + (at + 1) + ' of ' + recipe.steps.length + ': ' + step.title }),
        el('span', { class: 'recipe-bar-hint', text: step.text })),
      el('div', { class: 'recipe-bar-nav' },
        prev ? el('a', { class: 'btn ghost', href: Tools.href(prev.tool), onclick: go(at - 1), text: '← Back' }) : null,
        next ? el('a', { class: 'btn primary', href: Tools.href(next.tool), onclick: go(at + 1), text: 'Next: ' + next.title + ' →' })
          : el('button', { type: 'button', class: 'btn primary', text: 'Finish', onclick: function () {
              Discover.setRecipe(null); bar.remove(); U.toast('Recipe finished. Nice work.');
            } }),
        el('button', {
          type: 'button', class: 'icon-btn', title: 'Leave this recipe', 'aria-label': 'Leave this recipe',
          onclick: function () { Discover.setRecipe(null); bar.remove(); }
        }, '×')));
    return bar;
  }

  /* Put what was pasted on the home page into the tool's first text box. A
     file is taken by the tool's drop zone as it builds; if nothing took the
     hand-off, say so rather than leave the visitor wondering. */
  var TEXT_FILE = /\.(csv|tsv|json|geojson|ndjson|jsonl|ya?ml|toml|xml|txt|md|markdown|html?|log|sql|srt|vtt|ini|env)$/i;

  function setField(node, value) {
    node.value = value;
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* Choose the menu option for a unit ("kg"), currency ("GBP") or time zone
     ("PST"), matching the option's value or the abbreviation in brackets
     in its label. */
  function pickOption(select, token) {
    if (!select || !token) return false;
    var t = token.toLowerCase();
    var match = Array.prototype.filter.call(select.options, function (o) {
      var v = o.value.toLowerCase(), label = o.text.toLowerCase();
      return v === t || v.indexOf(t + '-') === 0 || label.indexOf('(' + t + ')') > -1;
    })[0];
    if (!match) return false;
    setField(select, match.value);
    return true;
  }

  /* Converters and calculators: put a pasted "5 kg", "£20", "3pm PST" or
     date into their number boxes, unit menu and date pickers. */
  function fillFields(host, text) {
    var v = Discover.values(text), did = false;
    var stamp = host.querySelector('input[type="datetime-local"]');
    if (v.time && stamp) {
      var now = new Date();
      setField(stamp, now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2) + 'T' + v.time);
      did = true;
    }
    if (v.date) {
      var day = host.querySelector('input[type="date"]');
      if (day) { setField(day, v.date); did = true; }
      else if (stamp) { setField(stamp, v.date + 'T09:00'); did = true; }
    }
    if (v.zone || v.unit || v.currency) did = pickOption(host.querySelector('select:not(.tool-tabs *)'), v.zone || v.unit || v.currency) || did;
    if (!v.date && !v.time) {
      var boxes = host.querySelectorAll('input[type="number"]');
      v.numbers.slice(0, boxes.length).forEach(function (n, i) { setField(boxes[i], String(n)); did = true; });
    }
    return did;
  }

  function deliverHandoff(hand, host) {
    /* A big text box first; then a one-line box; then number and date fields. */
    function fill(text) {
      var box = host.querySelector('textarea') ||
        host.querySelector('input[type="text"]:not(.tool-tabs *), input[type="search"]:not(.tool-tabs *), input[type="url"], input:not([type])');
      if (box) { setField(box, text); hand.taken = true; }
      else if (fillFields(host, text)) hand.taken = true;
    }

    if (hand.text && !hand.taken) fill(hand.text.trim());

    /* A tool with a plain file input rather than a drop zone: give the
       files to the first input that accepts them. */
    if (hand.files && !hand.taken) U.giveFiles(host, hand);

    /* A tool that works on pasted text still gets a text file's contents. */
    var file = hand.files && hand.files[0];
    var reading = file && !hand.taken && TEXT_FILE.test(file.name) && file.size < 5e6
      ? file.text().then(function (text) { if (!hand.taken && host.isConnected) fill(text); }, function () {})
      : Promise.resolve();

    reading.then(function () {
      setTimeout(function () {
        if (U.pendingHandoff() !== hand) return;
        U.handoff(null);
        if (hand.taken || !host.isConnected) return;
        var what = hand.files ? (hand.files.length === 1 ? '“' + hand.files[0].name + '”' : 'your files') : 'your text';
        host.parentNode.insertBefore(el('div', { class: 'banner info handoff-note',
          text: 'This tool couldn’t pick up ' + what + ' by itself. ' + (hand.files ? 'Drop it into the tool below.' : 'Paste it in below.') }), host);
      }, 700);
    });
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
    var featured = Shelves.featured(id);
    var others = tools.filter(function (t) { return featured.indexOf(t) === -1; });
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
      var nodes = [];
      var big = q ? featured.filter(function (t) { return matches(t, q); }) : featured;
      if (big.length) nodes.push(featureGrid(big));
      if (!shelves) {
        var shown = q ? others.filter(function (t) { return matches(t, q); }) : others;
        if (shown.length && big.length) nodes.push(el('h2', { class: 'shelf-title' }, 'Everything else', el('span', { text: String(shown.length) })));
        if (shown.length) nodes.push(grid(shown));
        host.replaceChildren.apply(host, nodes.length ? nodes
          : [el('p', { class: 'note', text: 'No tool in ' + category.name + ' matches “' + query + '”.' })]);
        return;
      }
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
      jump || '',
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

  function renderTool(id, params) {
    var tool = Tools.get(id);
    if (!tool) {
      /* An old link, or a tool that was merged into another one. */
      if (Tools.resolve(id)) { location.replace(Tools.href(id)); return; }
      return renderMissing('There is no tool with the id “' + id + '”.');
    }

    var category = Tools.category(tool.category);
    markCurrent('#/c/' + tool.category);

    /* Opened on a merged tool's tab: remember it under the tab's own name. */
    var via = params.tab && Tools.shortcuts().filter(function (s) { return s.target === tool.id && s.tab === params.tab; })[0];
    Prefs.remember(via ? via.id : tool.id);

    /* Something dropped or pasted on the home page for this tool. */
    var hand = U.pendingHandoff();
    if (hand && Tools.resolve(hand.tool) !== tool.id) { U.handoff(null); hand = null; }

    var host = el('div', { class: 'stack' });
    var button = pinButton(tool, function () { button.dispatchEvent(new CustomEvent('repaint')); });

    view.replaceChildren(
      recipeBar(tool, params) || '',
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
      tool.render(host, params);
    } catch (err) {
      host.appendChild(el('div', { class: 'banner', text: 'This tool failed to start: ' + (err.message || err) }));
      if (window.console) console.error(err);
    }
    if (hand) deliverHandoff(hand, host);

    /* Suggestions live outside #view, so nothing a tool reads or renders
       (or a test inspects) ever sees them. */
    var near = Shelves.related(tool, 8);
    if (near.length) {
      relatedBox.replaceChildren(
        el('h2', { text: 'Related tools' }),
        el('div', { class: 'related-list' }, near.map(function (t) {
          return el('a', { href: Tools.href(t.id), style: tint(Tools.category(t.category)) },
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
      var tool = Tools.entry(id);
      if (!tool) return;
      links.push(el('a', { class: 'pill', href: Tools.href(id), style: tint(Tools.category(tool.category)), text: tool.name }));
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
    homeIntake = null;
    if (hash.indexOf('#/t/') !== 0) U.handoff(null);
    relatedBox.hidden = true;
    relatedBox.replaceChildren();
    sidebar.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');

    if (hash.indexOf('#/t/') === 0) {
      var rest = hash.slice(4).split('?');
      var params = {};
      (rest[1] || '').split('&').forEach(function (pair) {
        var kv = pair.split('=');
        if (kv[0]) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      });
      renderTool(decodeURIComponent(rest[0]), params);
    }
    else if (hash.indexOf('#/c/') === 0) renderCategory(decodeURIComponent(hash.slice(4)));
    else if (hash.indexOf('#/search/') === 0) renderSearch(decodeURIComponent(hash.slice(9)));
    else if (hash.indexOf('#/r/') === 0) renderRecipe(decodeURIComponent(hash.slice(4)));
    else if (hash === '#/recipes') renderRecipes();
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

  /* Pins and recents may name a shortcut; it's kept so it reopens its tab. */
  Prefs.prune(function (id) { var e = Tools.entry(id); return e ? e.id : null; });
  Prefs.onChange(function () {
    var pinnedLink = sidebar.querySelector('a[data-route="#/pinned"] .count');
    if (pinnedLink) pinnedLink.textContent = String(Prefs.pins().length);
    if (window.Palette) Palette.refresh();
  });

  searchTrigger.querySelector('kbd').textContent = shortcutLabel();

  buildSidebar();
  route();
})();
