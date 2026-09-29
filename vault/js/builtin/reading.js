/* The Markdown renderer behind reading view, embeds, hover previews,
   slides and export. Sets app.markdown:

   await app.markdown.render(markdown, containerEl, sourcePath, component, opts?)
     Fills containerEl with the rendered note, one div.el-<tag> section per
     top-level block, as Obsidian's MarkdownRenderer does. component owns
     what the render registers (a new render into the same element
     releases the previous one). opts:
       onTaskToggle(line, checked, status)  instead of editing the file
       noFrontmatter   don't show the Properties block for frontmatter
       lineOffset      line of the file the markdown starts on (tasks)
       fragment        markdown is a piece of a note: no frontmatter check
       embedDepth      nesting level (embeds stop at 5)
       hoverSource     'preview' (default): the page-preview source for links
   app.markdown.renderEmbed(linktext, containerEl, sourcePath, component)
     -> span.internal-embed for ![[linktext]] of any file type
   app.markdown.renderMath(tex, displayMode) -> HTMLElement (KaTeX)
   app.markdown.loadMath() -> Promise (KaTeX loaded; renderMath is then synchronous)
   app.markdown.highlightCode(code, lang, codeEl) -> Promise
   app.markdown.renderMermaid(source, el) -> Promise
   app.markdown.renderCallout(el, source, sourcePath, component, opts)
     Renders callout source ("> [!tip] Title\n> body") into el and returns
     the div.callout; for live preview's callout widget.
   app.markdown.callouts: { TYPES, parseHeader(line) -> { type, metadata, fold, title },
     baseType(type), iconName(type), defaultTitle(type), activate(calloutEl), toggle(calloutEl, collapse?) }
   app.markdown.MarkdownPreview: a whole reading-view page (inline title,
     properties, sections), see render/preview.js
   app.markdown.getSectionForLine(containerEl, line), scrollToLine(containerEl, line),
     scrollToSubpath(containerEl, file, subpath), getSectionInfo(sectionEl)
   app.markdown.setTaskStatus(text, line, status) -> new text or null
   app.markdown.linkDisplayText('Note#Heading') -> 'Note > Heading'

   app.embedRegistry: Map extension -> fn(file, el, subpath, sourcePath,
   component, info), for file types that draw their own ![[embed]]
   (canvas, base). el is the span.internal-embed; info = { app, alt,
   linktext, depth }. A function declared with four parameters is called
   as fn(file, el, subpath, component).

   Command: workspace:export-pdf (Export to PDF), through the browser's
   print dialog. */

import { renderMarkdown, getSectionForLine, getSectionInfo, scrollToLine, scrollToSubpath, setTaskStatus, linkDisplayText } from '../render/markdown.js';
import { fillEmbed } from '../render/embeds.js';
import { highlightCode, renderMath, loadMath, renderMermaid } from '../render/code.js';
import { CALLOUT_TYPES, parseCalloutHeader, calloutBaseType, calloutIconName, defaultCalloutTitle, activateCallout, toggleCallout } from '../render/callouts.js';
import { MarkdownPreview, exportToPdf } from '../render/preview.js';
import { h, Notice } from '../core/ui.js';

export default {
  id: 'markdown-renderer',
  name: 'Reading view',
  description: 'Renders Markdown for reading view, embeds and previews.',
  builtin: true,
  async onload(plugin) {
    const app = plugin.app;
    if (!app.embedRegistry) app.embedRegistry = new Map();

    app.markdown = {
      render: (markdown, el, sourcePath, component, opts) => renderMarkdown(app, markdown, el, sourcePath, component, opts),
      async renderEmbed(linktext, el, sourcePath = '', component = null) {
        const bar = linktext.indexOf('|');
        const span = h('span.internal-embed', { src: bar < 0 ? linktext : linktext.slice(0, bar), tabindex: '-1', contenteditable: 'false' });
        if (bar > -1) span.setAttribute('alt', linktext.slice(bar + 1));
        el.appendChild(span);
        await fillEmbed(app, span, { app, sourcePath, component: component || plugin, depth: 0, ancestors: sourcePath ? [sourcePath] : [], hoverSource: 'preview' });
        return span;
      },
      renderMath,
      loadMath,
      highlightCode,
      renderMermaid,
      async renderCallout(el, source, sourcePath = '', component = null, opts = {}) {
        await renderMarkdown(app, source, el, sourcePath, component, Object.assign({ fragment: true }, opts));
        return el.querySelector('.callout');
      },
      callouts: {
        TYPES: CALLOUT_TYPES,
        parseHeader: parseCalloutHeader,
        baseType: calloutBaseType,
        iconName: calloutIconName,
        defaultTitle: defaultCalloutTitle,
        activate: activateCallout,
        toggle: toggleCallout
      },
      MarkdownPreview: class extends MarkdownPreview { constructor(opts) { super(app, opts); } },
      getSectionForLine,
      getSectionInfo,
      scrollToLine,
      scrollToSubpath: (el, file, subpath, highlight) => scrollToSubpath(app, el, file, subpath, highlight),
      setTaskStatus,
      linkDisplayText
    };

    plugin.addCommand({
      id: 'workspace:export-pdf',
      name: 'Export to PDF',
      icon: 'file-output',
      checkCallback(checking) {
        const file = app.workspace.getActiveFile();
        if (!file || file.extension !== 'md') return false;
        if (!checking) exportToPdf(app, file).catch(err => new Notice('Couldn’t export: ' + (err.message || err)));
        return true;
      }
    });

    /* "Export to PDF…" in a note tab's More options menu, as in Obsidian. */
    plugin.registerEvent(app.workspace.on('file-menu', (menu, file, source) => {
      if (!file || file.extension !== 'md' || (source !== 'more-options' && source !== 'tab-header')) return;
      menu.addItem(i => i.setSection('action').setTitle('Export to PDF…').setIcon('file-output').onClick(() => {
        exportToPdf(app, file).catch(err => new Notice('Couldn’t export: ' + (err.message || err)));
      }));
    }));
  }
};
