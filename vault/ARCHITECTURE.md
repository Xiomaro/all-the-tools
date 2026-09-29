# Vault: how it's put together

Vault is an Obsidian-compatible notes app that runs entirely in the browser.
It opens a folder on disk (File System Access API, Chromium browsers) or a
vault kept in the browser's private file system (OPFS, every modern browser),
and reads and writes the same files Obsidian does, including the `.obsidian`
config folder. Nothing is sent to a server.

Plain ES modules, no build step. Third-party code is vendored under
`assets/vendor/` (CodeMirror 6 as one esbuild bundle, Lucide icons, KaTeX,
moment, js-yaml, mermaid, JSZip).

## Design rules

- **Obsidian's names everywhere.** Command ids (`editor:toggle-bold`), core
  plugin ids (`backlink`), view types (`markdown`, `file-explorer`), config
  files and keys, CSS class names (`.workspace-leaf`, `.nav-file-title`,
  `.markdown-preview-view`, `.cm-line.HyperMD-header-1`, `.callout`) and CSS
  variables (`--background-primary`, `--text-normal`). That is what makes a
  vault's `hotkeys.json`, `core-plugins.json`, themes and CSS snippets work
  unchanged. When in doubt, match what Obsidian does and what its DOM looks
  like.
- **The API mirrors Obsidian's plugin API** (App, Vault, MetadataCache,
  Workspace, WorkspaceLeaf, View/FileView/TextFileView, Menu, Modal,
  SuggestModal, Notice, Setting), simplified. Features are written like
  Obsidian plugins.
- **Never lose a note.** Writes go through `app.vault.modify/create/...`.
  Unknown keys in config JSON are preserved. Frontmatter is rewritten only
  when the user edits properties.
- **Flag what can't work.** Where the browser can't do something Obsidian
  does, say so in the interface (a Notice, a settings description) rather
  than silently doing nothing.

## Files

```
vault/index.html            loads CSS and js/main.js
vault/css/base.css          Obsidian's CSS variables, workspace, menus, modals, prompts, settings rows
vault/css/<area>.css        one per feature area (editor, markdown, panes, plugins, graph, canvas, settings)
vault/js/main.js            the vault picker, then new App(adapter).start(plugins)
vault/js/core/              the framework (below)
vault/js/builtin/           always-on parts: file views, app commands, the markdown view,
                            reading-view renderer, properties editor, settings
vault/js/plugins/           core plugins, one module each, listed in plugins/index.js
vault/js/plugins/lib/       helpers shared by the smaller plugins (templates, suggestions, text)
vault/js/editor/            the markdown view: view.js, editor.js (Editor API), commands, lists,
                            folding, suggestions, search, clipboard; presentation.js and lp/ are
                            the syntax and live preview
vault/js/render/            the Markdown renderer (reading view, embeds, callouts, code, maths)
vault/js/panes/             sidebar panes' shared parts, the search query language
vault/js/properties/        the Properties block and property types
vault/js/bases/             Bases: the formula language, queries, table/cards/list layouts
vault/js/graph/             graph view: data, force simulation, canvas renderer, controls
vault/js/canvas/            Canvas: JSON Canvas data, the board, cards, embeds
vault/js/settings/          the settings window's pages
scripts/vault/              headless checks: harness.js, check.js, tests/, fixture/ (a sample vault)
```

## Core modules (`vault/js/core/`)

| Module | What it gives you |
|---|---|
| `events.js` | `Events` (`on/off/trigger`, refs with `.off()`), `Component` (`register`, `registerEvent`, `registerDomEvent`, `registerInterval`, `addChild`, `load/unload`) |
| `fs.js` | `HandleAdapter` over a FileSystemDirectoryHandle: `list, read, readBinary, getFile, write, mkdir, remove, rename, copy, exists, stat`; path helpers `parentPath, baseName, joinPath, normalizePath`; zip import/export |
| `vault.js` | `Vault` (`getFileByPath, getAbstractFileByPath, getMarkdownFiles, getFiles, getAllFolders, read, cachedRead, modify, process, append, create, createBinary, createFolder, rename, delete, trash, copy, getAvailablePath, getResourceUrl`; events `create/modify/delete/rename`; `vault.texts` is a Map path→text of every note), `TFile` (`path, name, basename, extension, stat, parent`), `TFolder` (`children`), `MetadataCache` (`getFileCache, getFirstLinkpathDest, fileToLinktext, resolvedLinks, unresolvedLinks, getBacklinksForFile, getTags, getAliases`; events `changed`, `deleted`, `resolved`) |
| `metadata.js` | `parseMarkdown(text)` → CachedMetadata (`frontmatter, frontmatterPosition, headings, links, embeds, tags, blocks, listItems, sections, footnotes, frontmatterLinks, frontmatterTags`); `splitFrontmatter`, `parseLinktext`, `resolveSubpath(cache, '#Heading' or '#^block', text)` → `{ start, end }` offsets, `getAllTags`, `getAliases`, `stripHeading`; regexes `WIKILINK_RE`, `MDLINK_RE`, `TAG_RE` |
| `yaml.js` | `yaml.load`, `yaml.dump` (core schema: dates stay strings) |
| `config.js` | `app.config.get(key)/set(key, v)` for app.json with Obsidian's defaults (`APP_DEFAULTS`); `appearance(key)/setAppearance`; `hotkeys(id)/setHotkeys`; `isPluginEnabled/setPluginEnabled`; `readJson(name, fallback)/writeJson(name, value)` for any `.obsidian/<name>.json`; events `changed(key)`, `appearance-changed`, `hotkeys-changed`, `plugins-changed` |
| `file-manager.js` | `app.fileManager`: `getNewFileParent(sourcePath)`, `createNewMarkdownFile(folder, name, content)`, `getAvailablePathForAttachment(filename, sourcePath)`, `generateMarkdownLink(file, sourcePath, subpath, alias)`, `renameFile(file, newPath)` (updates links), `trashFile(file)`, `processFrontMatter(file, fn)`, `checkName(name)` |
| `commands.js` | `app.commands.add({ id, name, icon, hotkeys, callback / checkCallback / editorCallback / editorCheckCallback })`, `execute(id)`, `list()`, `listAvailable()`, `hotkeysFor(id)`, `conflicts(hk)`; helpers `hotkeyLabel`, `hotkeyString`, `eventToHotkey`, `isReserved`; `DEFAULT_HOTKEYS` (Obsidian's defaults by id) |
| `workspace.js` | `View`, `FileView`, `TextFileView` (subclass these), `WorkspaceLeaf` (`openFile, setViewState, getViewState, detach, setPinned, goBack/goForward, view`), `Workspace` (`registerView(type, leaf => view)`, `registerExtensions`, `getLeaf(false/'tab'/'split')`, `openFile`, `openLinkText(linktext, sourcePath, newLeaf, state)`, `getActiveFile()`, `activeLeaf`, `activeEditor`, `getLeavesOfType`, `iterateAllLeaves`, `ensureSideLeaf(type, 'left'/'right', opts)`, `revealLeaf`, `addRibbonIcon`, `addStatusBarItem`, `leftSplit/rightSplit.toggle()`, `getLastOpenFiles()`, events `file-open`, `active-leaf-change`, `layout-change`, `layout-ready`, `resize`, `file-menu(menu, file, source, leaf)`, `editor-menu(menu, editor, view)`, `css-change`, `reveal-file(file)`, `plugins-changed`); `Workspace.leafFromEvent(e)`; `FILE_MIME` for dragging a file (dataTransfer type, value = vault path) |
| `plugins.js` | `CorePlugin` handed to each plugin's `onload(plugin)`: `app, loadData, saveData, addCommand, registerView, registerExtensions, addRibbonIcon, addStatusBarItem, addSettingTab(render, name), registerMarkdownCodeBlockProcessor(lang, fn), registerEditorExtension(ext), registerEditorSuggest(suggest)` plus Component's `register*`. `app.plugins.isEnabled(id)`, `get(id)`, `enable/disable`, `list()` |
| `appearance.js` | applies appearance.json: theme mode, accent, fonts, `.obsidian/themes/<name>/theme.css`, `.obsidian/snippets/<name>.css`; `listThemes()`, `listSnippets()` |
| `ui.js` | `h(tag, attrs, ...kids)` DOM builder (`h('div.nav-file-title', { text, cls, dataset, onclick, style })`), `icon(name)`, `setIcon`, `clickableIcon(name, title, cb)`, `Menu` (`addItem(i => i.setTitle().setIcon().setSection().onClick())`, `showAtMouseEvent`), `Modal`, `SuggestModal` (pass `{ getSuggestions, renderSuggestion, onChoose, placeholder, instructions }` or subclass), `fuzzyMatch(query, text)` → `{ score, matches }`, `highlighted(text, matches)`, `Notice`, `promptText`, `confirmDialog`, `Setting` (Obsidian's settings rows), `debounce`, `saveBlob`, `isMac` |
| `app.js` | `App`: `vault, metadataCache, config, fileManager, commands, workspace, plugins, appearance, markdown` (the renderer), `codeBlockProcessors` (Map lang → fn), `editorExtensions`, `editorSuggests`, `renameFileByName(file, name)`, `promptRename(file)`, `syncNow()`; `window.app` is the App |

## Contracts between feature areas

These are the interfaces one area provides and others use.

**Markdown renderer** (`builtin/reading.js`, sets `app.markdown`):

```js
await app.markdown.render(markdown, containerEl, sourcePath, component, opts?)
// Replaces containerEl's content with the rendered note, one section per
// top-level block (div.el-p > p, div.el-h2 > h2, div.el-div > div.callout,
// ...), as Obsidian's reading view: wikilinks, embeds, callouts, tasks, tags,
// highlights, comments, maths (KaTeX), mermaid, footnotes, block ids, code
// highlighting, code block processors from app.codeBlockProcessors, HTML
// (sanitised). Frontmatter shows as the Properties block (or as YAML when
// propertiesInDocument is "source"). A new render into the same element
// releases what the last one registered.
// component: a Component that owns anything registered while rendering.
// opts: { onTaskToggle(line, checked, status), noFrontmatter, lineOffset,
//         fragment (a piece of a note: no frontmatter check), embedDepth,
//         hoverSource ('preview') }
// Sections carry data-line (their first source line); li, task inputs
// and code carry data-line too. Lines are the file's, frontmatter included.
app.markdown.renderEmbed(linktext, containerEl, sourcePath, component) -> span.internal-embed
app.markdown.renderMath(tex, displayMode) -> HTMLElement   // synchronous once loadMath() has resolved
app.markdown.loadMath() -> Promise
app.markdown.highlightCode(code, lang, codeEl) -> Promise  // Prism classes "token keyword" + CodeMirror "tok-keyword"
app.markdown.renderMermaid(source, el) -> Promise
app.markdown.renderCallout(el, source, sourcePath, component, opts) -> div.callout
// source is the callout's lines with their ">" ("> [!tip]- Title\n> body")
app.markdown.callouts  // { TYPES, parseHeader(line) -> { type, metadata, fold, title },
                       //   baseType, iconName, defaultTitle, activate(calloutEl), toggle(calloutEl, collapse?) }
app.markdown.MarkdownPreview  // new (opts) -> a whole reading-view page: containerEl, sizerEl,
                              // set(text, file), rerender(), scrollToLine(line), scrollToSubpath(subpath)
app.markdown.getSectionForLine(containerEl, line), scrollToLine(containerEl, line),
  scrollToSubpath(containerEl, file, subpath), getSectionInfo(sectionEl)
app.markdown.setTaskStatus(text, line, status) -> new text | null
app.markdown.linkDisplayText('Note#Heading') -> 'Note > Heading'
```

Internal links render as `a.internal-link[data-href]` (`.is-unresolved`
when missing); clicking opens with
`app.workspace.openLinkText(href, sourcePath, Workspace.leafFromEvent(e))`;
hovering triggers `app.workspace.trigger('hover-link', { event, source, hoverParent, targetEl, linktext, sourcePath })`
(the page-preview plugin shows the popover; its settings decide per
`source` whether Ctrl/Cmd must be held: `editor`, `preview`, `graph`,
`file-explorer`, `search`, `backlink`, `outgoing-link`, `bookmarks`,
`properties`, `canvas`, `tab-header`, `tag`). Tags are `a.tag[href="#tag"]`
and open `app.search.open('tag:#tag')`.

Embeds of other file types: `app.embedRegistry` is a Map extension ->
`fn(file, el, subpath, sourcePath, component, info)` (el is the
`span.internal-embed`; info = `{ app, alt, linktext, depth }`); a function
declared with four parameters is called as `fn(file, el, subpath, component)`.
Without an entry, canvas and base files get a card that opens them.

Commands: `workspace:export-pdf` (Export to PDF, through the browser's
print dialog), `slides:start`, `footnotes:open`.

**Markdown view** (`builtin/markdown-view.js`, view type `markdown`, extension `md`):
a `TextFileView` with `getMode()` → `'source'` (live preview or source
mode) or `'preview'` (reading); `editor` (Obsidian-like Editor API:
`getValue, setValue, getSelection, replaceSelection, getCursor, setCursor,
setSelection, getLine, setLine, lineCount, lastLine, replaceRange,
getRange, posToOffset, offsetToPos, focus, somethingSelected, scrollIntoView,
transaction, cm` (the EditorView)); `setEphemeralState({ subpath, line })`
scrolls to a heading, block or line in either mode; `previewMode.rerender()`.
`app.editorSuggests` are shown by the editor: each is
`{ onTrigger(cursor, editor, file) → { start, end, query } | null, getSuggestions(ctx) → items | Promise, renderSuggestion(item, el), selectSuggestion(item, evt) }`
with `ctx = { start, end, query, editor, file }`.

The markdown view triggers workspace events `editor-change(editor, view)`
on every edit and `editor-selection-change(editor, view)` when the
selection moves (word count and the status bar listen to these), and
`editor-menu(menu, editor, view)` when the editor's context menu opens.

**Editor presentation** (`editor/presentation.js`, the live-preview area):

```js
markdownSyntax(app)     // CM extension: the markdown language with Obsidian's syntax
                        // (wikilinks, embeds, tags, ==highlights==, %%comments%%, $maths$,
                        // callouts, footnotes, block ids) and Obsidian's token and line classes
                        // (.cm-header-1, .HyperMD-header-1, .cm-hmd-internal-link, ...)
livePreview(app, view)  // CM extension for live preview: hides formatting away from the
                        // cursor, and widgets for images, embeds, checkboxes, tables,
                        // callouts, maths, mermaid, rules, bullets and links
sourceMode(app, view)   // CM extension for source mode (line classes only)
```

**Properties** (`builtin/properties.js`, sets `app.properties`):
`app.properties.render(containerEl, file, { editable, sidebar })` draws the
Properties block for a note (types from `.obsidian/types.json`);
`app.properties.getType(name)`, `setType(name, type)`, `allNames()`.

**Settings** (`builtin/settings.js`, pages in `settings/`): command
`app:open-settings` (Ctrl/Cmd+,) and the ribbon cog;
`app.setting.open(tabId?)`, `openTabById(id)`, `close()`, `isOpen`,
`activeTab`. Tab ids are Obsidian's: `about` (General), `editor`, `file`,
`appearance`, `hotkeys`, `plugins`, `community-plugins`, and a core plugin's
id for its options page. Plugins add a page with
`plugin.addSettingTab(render, name?)`; it's listed under "Core plugins" in
the sidebar while the plugin is on, and called as
`render(containerEl, ctx)` each time it's shown (`ctx.refresh()` redraws it,
`ctx.register(fn)` runs fn when it's left). Build rows with `Setting`.
Note that `Setting` has `then(cb)` as in Obsidian, so it is a thenable:
never return one from an `async` function or a `.then()` callback (the
promise would call it forever and hang the tab); use a block body.
The settings search renders every page off-screen and shows the rows whose
name or description match, so rows must work wherever they're attached.

**Graph** (`plugins/graph.js`, `graph/`): view types `graph` (global) and
`localgraph` (follows the active file in a sidebar, or stays on one note in
its own tab; its options live in the leaf's view state). Settings are
`.obsidian/graph.json` in Obsidian's format. Colours come from the
`--graph-*` variables, re-read on `css-change`. Filters and colour groups
use `app.search.matches` when the search plugin is on.

**Canvas** (`plugins/canvas.js`, `canvas/`): view type `canvas` for
`.canvas` (JSON Canvas 1.0; unknown fields kept, tab-indented on save).
Registers `app.embedRegistry.set('canvas', ...)` for `![[x.canvas]]`.

**File views follow their own file.** Views subscribe to the vault's
`modify`, `rename` and `delete` events for their file themselves (see
`followFile` in builtin/file-views.js); the workspace closes tabs whose
notes were inside a deleted folder.

**Focus.** Dialogs take focus synchronously when they open, and views never
take focus while a dialog is open, so keys typed straight after Ctrl+P or
Ctrl+O land in the dialog.

**Search**: the `global-search` plugin exposes
`app.search.open(query)` (open the search pane with a query) and
`app.search.matches(query)` → matching files with positions, for bookmarks,
graph groups and bases to reuse. Tags link to `app.search.open('tag:#x')`.

## Writing a feature

1. Put the code in your module (and more files beside it if it's big).
2. Default-export `{ id, name, description, async onload(plugin) { ... } }`;
   register views, commands, ribbon icons and settings through `plugin`.
3. Styles go in your area's CSS file, using Obsidian's class names and
   variables.
4. Add a check in `scripts/vault/tests/` and run
   `node scripts/vault/check.js --only=<your-tests> --port=<free port>`.
   The fixture vault in `scripts/vault/fixture/` has a bit of everything;
   add to it if you need to.

## What the browser can't do

Kept in one place so the app and the README can say so:

- Editing a folder on disk needs the File System Access API: Chrome, Edge,
  Opera, Brave, Vivaldi, Arc. Firefox and Safari use browser vaults
  (import a folder or zip, export a zip).
- The browser asks again for permission to edit the folder each visit.
- Ctrl+N, Ctrl+T, Ctrl+W, Ctrl+Tab and Ctrl+Shift+T/N/W are kept by the
  browser; commands bound to them also answer to the same keys plus Alt.
- No system trash: deleted files go to the vault's `.trash` folder (or are
  deleted outright, per the setting).
- File creation times aren't available; the modified time is used.
- No pop-out windows; "open in new window" opens a tab.
- Community plugins, Obsidian Sync and Publish aren't available.
- Web viewer pages load in an iframe, which many sites refuse.
- Changes made outside the app are picked up when the tab regains focus
  and every few seconds (instantly where FileSystemObserver exists).
- Export to PDF goes through the browser's print dialog, so Obsidian's own
  page size, margin and scale options aren't there.
- Maths uses KaTeX rather than Obsidian's MathJax; a few MathJax-only
  commands show as errors.
- No spelling suggestions or "Add to dictionary" in the editor's menu (the
  browser's own menu, on Shift+right-click, has them).
- "Copy path from system root": the browser doesn't know the folder's real
  path.
- File recovery snapshots are kept in this browser, not in the vault.
