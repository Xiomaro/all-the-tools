/* Entry point for the CodeMirror 6 bundle the Vault app uses. vendor.js
   bundles this with esbuild into assets/vendor/codemirror/, one ES module
   plus a chunk per code-block language, loaded when a note first uses it. */
export * from '@codemirror/state';
export * from '@codemirror/view';
export * from '@codemirror/commands';
export * from '@codemirror/language';
export * from '@codemirror/search';
export * from '@codemirror/autocomplete';
export { markdown, markdownLanguage, markdownKeymap, insertNewlineContinueMarkup, deleteMarkupBackward } from '@codemirror/lang-markdown';
export { languages } from '@codemirror/language-data';
export { tags, Tag, styleTags, highlightTree, highlightCode, tagHighlighter, classHighlighter } from '@lezer/highlight';
export { parser as markdownParser, GFM, Strikethrough, Table, TaskList, Autolink, Subscript, Superscript, Emoji } from '@lezer/markdown';
export { vim, Vim, getCM } from '@replit/codemirror-vim';
