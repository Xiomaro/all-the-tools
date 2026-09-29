/* Properties editor: sets app.properties (see ARCHITECTURE.md) and adds
   the property commands. The block itself is in ../properties/block.js,
   the value editors in ../properties/widgets.js and the types in
   ../properties/types.js.

   app.properties.render(containerEl, file, { editable, sidebar, text })
     draws (or redraws) the Properties block in containerEl and returns it;
     `text`, if given, is the note's current text (an editor's unsaved
     text), else the saved text is used.
   app.properties.getType(name), setType(name, type), allNames()
   app.properties.renameProperty(from, to)   every note in the vault */

import { PropertyTypes, TYPES, PICKABLE, inferType, convertValue } from '../properties/types.js';
import { PropertiesBlock, saveOpenEditors, OPS } from '../properties/block.js';
import { createValueEditor, renderValue, renderLinkish, internalLink } from '../properties/widgets.js';
import { Notice } from '../core/ui.js';

function blockIn(el) {
  const root = el && el.querySelector('.metadata-container');
  return root && root._propertiesBlock && root.isConnected ? root._propertiesBlock : null;
}

export default {
  id: 'properties-widget',
  name: 'Properties editor',
  description: 'Shows and edits a note’s properties.',
  builtin: true,
  async onload(plugin) {
    const app = plugin.app;
    const types = new PropertyTypes(app);
    await types.load();
    plugin.registerEvent(app.config.on('changed', key => { if (!key) types.reload(); }));

    const api = app.properties = {
      types, TYPES, PICKABLE, inferType, convertValue,
      createValueEditor, renderValue, renderLinkish, internalLink,

      render(containerEl, file, opts = {}) {
        const existing = containerEl.querySelector(':scope > .metadata-container');
        if (existing && existing._propertiesBlock) {
          existing._propertiesBlock.update(file, opts);
          return existing._propertiesBlock;
        }
        return new PropertiesBlock(app, containerEl, file, opts);
      },
      getType(name) { return types.getType(name); },
      setType(name, type) { types.setType(name, type); },
      allNames() { return types.allNames(); },

      /* Rename a property in every note that has it, keeping its place in
         each note, and move its saved type. */
      async renameProperty(from, to) {
        to = String(to || '').trim();
        if (!to || to === from) return 0;
        const lower = from.toLowerCase();
        const files = app.vault.getMarkdownFiles().filter(f => {
          const fm = (app.metadataCache.getFileCache(f) || {}).frontmatter;
          return fm && Object.keys(fm).some(k => k.toLowerCase() === lower);
        });
        const notice = new Notice('Renaming “' + from + '” in ' + files.length + ' note' + (files.length === 1 ? '' : 's') + '…', 0);
        let done = 0;
        for (const f of files) {
          try {
            await saveOpenEditors(app, f);
            await app.fileManager.processFrontMatter(f, data => {
              const key = Object.keys(data).find(k => k.toLowerCase() === lower);
              if (key === undefined) return;
              if (Object.prototype.hasOwnProperty.call(data, to) && to.toLowerCase() !== lower) return;
              OPS.rename(key, to)(data);
            });
            done++;
          } catch (e) { console.error('[vault] could not rename a property in ' + f.path, e); }
        }
        types.renameType(from, to);
        notice.setMessage('Renamed “' + from + '” to “' + to + '” in ' + done + ' note' + (done === 1 ? '' : 's') + '.');
        setTimeout(() => notice.hide(), 3000);
        return done;
      },

      /* The Properties block showing `file` in the active view, if any. */
      activeBlock() {
        const leaf = app.workspace.getMostRecentLeaf();
        return leaf && leaf.view ? blockIn(leaf.view.containerEl) : null;
      }
    };
    plugin.register(() => { if (app.properties === api) app.properties = null; });

    const activeNote = () => {
      const f = app.workspace.getActiveFile();
      return f && f.extension === 'md' ? f : null;
    };

    /* Ctrl+; as in Obsidian. Uses the note's Properties block when it's
       shown; in source mode it adds a line to the YAML instead. */
    plugin.addCommand({
      id: 'markdown:add-metadata-property',
      name: 'Add file property',
      icon: 'plus',
      hotkeys: [{ modifiers: ['Mod'], key: ';' }],
      checkCallback: checking => {
        const file = activeNote();
        if (!file) return false;
        if (checking) return true;
        const block = api.activeBlock();
        /* The block hides itself while a note has no properties; its host
           shows whether the view wants properties drawn. */
        if (block && block.file === file && block.editable && block.hostEl.offsetParent !== null) { block.addProperty(); return true; }
        const side = app.workspace.getLeavesOfType('file-properties')[0];
        const view = app.workspace.activeEditor;
        if (view && view.editor && view.file === file) { addInSource(view.editor); return true; }
        if (side && side.view && side.view.block) {
          /* Revealing focuses the pane on a timer; add after that. */
          app.workspace.revealLeaf(side);
          setTimeout(() => side.view.block && side.view.block.addProperty(), 0);
          return true;
        }
        new Notice('Turn on “Properties in document” or open File properties to add a property.');
        return true;
      }
    });

    plugin.addCommand({
      id: 'markdown:clear-metadata-properties',
      name: 'Clear file properties',
      icon: 'eraser',
      checkCallback: checking => {
        const file = activeNote();
        const fm = file && (app.metadataCache.getFileCache(file) || {}).frontmatterPosition;
        if (!file || !fm) return false;
        if (checking) return true;
        saveOpenEditors(app, file).then(() => app.fileManager.processFrontMatter(file, OPS.clear()))
          .catch(e => new Notice('Couldn’t clear the properties: ' + (e.message || e)));
        return true;
      }
    });

    plugin.addCommand({
      id: 'editor:toggle-fold-properties',
      name: 'Toggle fold properties',
      icon: 'chevrons-up-down',
      checkCallback: checking => {
        const block = api.activeBlock();
        if (!block || block.opts.sidebar || block.rootEl.hidden) return false;
        if (!checking) block.toggleFold();
        return true;
      }
    });
  }
};

/* Source mode: put the cursor on a new line at the end of the YAML,
   making the YAML block if there isn't one. */
function addInSource(editor) {
  const text = editor.getValue();
  const open = /^---[ \t]*\r?\n/.exec(text);
  if (!open) {
    editor.replaceRange('---\n\n---\n', { line: 0, ch: 0 });
    editor.setCursor({ line: 1, ch: 0 });
    editor.focus();
    return;
  }
  for (let i = 1; i < editor.lineCount(); i++) {
    if (/^(---|\.\.\.)[ \t]*$/.test(editor.getLine(i))) {
      editor.replaceRange('\n', { line: i - 1, ch: editor.getLine(i - 1).length });
      editor.setCursor({ line: i, ch: 0 });
      editor.focus();
      return;
    }
  }
}
