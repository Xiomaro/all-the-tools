/* How notes look in the editor: the markdown language with Obsidian's
   syntax, and the live preview. See ARCHITECTURE.md ("Editor presentation").

   markdownSyntax(app)     always on: the Markdown language with Obsidian's
                           syntax, Obsidian's token and line classes, and
                           code-block colouring.
   livePreview(app, view)  live preview: hides formatting away from the
                           selection and draws widgets (links, tags,
                           checkboxes, bullets, rules, images, embeds,
                           callouts, tables, maths, mermaid, HTML).
   sourceMode(app, view)   source mode: every character visible; Ctrl/Cmd+
                           click still follows links and tags.

   `view` is the MarkdownView (it may be null in tests); its `.file` gives the
   path links resolve from.

   hideFrontmatter: a facet the markdown view can set to decide whether live
   preview hides the YAML frontmatter lines (because the Properties block is
   shown above the text instead):
       hideFrontmatter.of(true | false)
   Without it, live preview follows app.json's propertiesInDocument: the YAML
   is hidden unless it is "source". While hidden, the lines can't be entered
   or edited from the keyboard; the properties editor changes them. */

import { markdown, markdownLanguage, languages } from '../../../assets/vendor/codemirror/codemirror.js';
import { obsidianMarkdown } from './lp/syntax.js';
import { obsidianClasses, codeHighlighter } from './lp/classes.js';
import { livePreviewExtension, sourceModeExtension, hideFrontmatter } from './lp/livepreview.js';

export { hideFrontmatter };

export function markdownSyntax(app) {
  const support = markdown({ base: markdownLanguage, codeLanguages: languages, extensions: obsidianMarkdown });
  return [support, obsidianClasses, codeHighlighter(support.language)];
}

export function livePreview(app, view) { return livePreviewExtension(app, view); }

export function sourceMode(app, view) { return sourceModeExtension(app, view); }
