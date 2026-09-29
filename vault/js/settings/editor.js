/* Settings → Editor: every app.json editor option, with Obsidian's names,
   descriptions and order. Each change goes through app.config.set, which
   writes app.json and tells the open editors. */

import { Setting } from '../core/ui.js';
import { heading, desc, browserNote, appToggle, appDropdown, readShared, writeShared } from './helpers.js';
import { isMac } from '../core/ui.js';

export function renderEditor(app, el) {
  const mod = isMac ? 'Cmd' : 'Ctrl';

  heading(el, 'General');
  appToggle(app, el, 'focusNewTab', 'Always focus new tabs',
    'When you open a link in a new tab, switch to it immediately.');
  appDropdown(app, el, 'defaultViewMode', 'Default view for new tabs',
    'The default view that a new Markdown tab gets opened in.',
    [['source', 'Editing view'], ['preview', 'Reading view']]);
  appDropdown(app, el, 'livePreview', 'Default editing mode',
    'The default editing mode a new tab will be in.',
    [[true, 'Live Preview'], [false, 'Source mode']], { fromStr: v => v === 'true' });

  heading(el, 'Display');
  new Setting(el).setName('Show inline title').setClass('mod-toggle')
    .setDesc('Displays the filename as an editable title inline with the file contents.')
    .addToggle(t => t.setValue(app.config.get('showInlineTitle') !== false).onChange(v => writeShared(app, 'showInlineTitle', v)));
  new Setting(el).setName('Show tab title bar').setClass('mod-toggle')
    .setDesc('Displays the header at the top of every tab.')
    .addToggle(t => t.setValue(readShared(app, 'showViewHeader')).onChange(v => writeShared(app, 'showViewHeader', v)));
  appToggle(app, el, 'readableLineLength', 'Readable line length',
    'Limit maximum line length. Less content fits onscreen, but long paragraphs are more readable.');
  appToggle(app, el, 'strictLineBreaks', 'Strict line breaks',
    'Markdown specs ignore single line breaks in reading view. Turn this off to make single line breaks visible.');
  appDropdown(app, el, 'propertiesInDocument', 'Properties in document',
    'Choose how properties are displayed at the top of notes. Select “source” to show properties as raw YAML.',
    [['visible', 'Visible'], ['hidden', 'Hidden'], ['source', 'Source']]);
  appToggle(app, el, 'foldHeading', 'Fold heading', 'Lets you fold all content under a heading.');
  appToggle(app, el, 'foldIndent', 'Fold indent', 'Lets you fold part of an indentation, such as lists.');
  appToggle(app, el, 'showLineNumber', 'Line numbers', 'Show line number in the gutter.');
  appToggle(app, el, 'showIndentGuide', 'Indentation guides', 'Show vertical relationship lines between list items.');
  appToggle(app, el, 'rightToLeft', 'Right-to-left (RTL)',
    'Sets the default text direction of notes to right-to-left.');

  heading(el, 'Behavior');
  appToggle(app, el, 'spellcheck', 'Spellcheck', 'Turn on spellcheck.')
    .then(s => s.descEl.append(browserNote('Uses the browser’s own spellchecker, in the languages set in the browser’s settings. Spellcheck languages can’t be chosen here.')));
  appToggle(app, el, 'autoPairBrackets', 'Auto pair brackets', 'Pair brackets and quotes automatically.');
  appToggle(app, el, 'autoPairMarkdown', 'Auto pair Markdown syntax',
    'Pair symbols automatically for bold, italic, code, and more.');
  appToggle(app, el, 'smartIndentList', 'Smart lists', 'Automatically indent and format lists.');
  appToggle(app, el, 'useTab', 'Indent using tabs',
    'Use tabs to indent by pressing the “Tab” key. Turn this off to indent using 4 spaces.');
  new Setting(el).setName('Tab indent size')
    .setDesc('The number of spaces a tab character will render as.')
    .addSlider(s => s.setLimits(1, 8, 1).setValue(+app.config.get('tabSize') || 4).setDynamicTooltip()
      .onChange(v => app.config.set('tabSize', v)))
    .then(s => s.controlEl.prepend(sliderValue(s, v => v)));
  appToggle(app, el, 'autoConvertHtml', 'Convert pasted HTML to Markdown',
    desc('Automatically convert HTML to Markdown when pasting and drag-and-drop from webpages. Use ' + mod + '+Shift+V to paste without converting.'));
  appToggle(app, el, 'vimMode', 'Vim key bindings', 'Use Vim key bindings when editing.');
}

/* The number shown beside a slider, kept in step with it. */
export function sliderValue(setting, format) {
  const input = setting.controlEl.querySelector('input.slider');
  const out = document.createElement('span');
  out.className = 'settings-slider-value';
  const show = () => { out.textContent = format(input.value); };
  input.addEventListener('input', show);
  show();
  return out;
}
