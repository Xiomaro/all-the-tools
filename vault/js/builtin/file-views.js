/* Views for the new-tab page and for files that aren't notes: images,
   audio, video, PDFs, and anything else. */

import { View, FileView } from '../core/workspace.js';
import { h, icon, saveBlob } from '../core/ui.js';
import { IMAGE_EXT, AUDIO_EXT, VIDEO_EXT } from '../core/vault.js';
import { hotkeyLabel } from '../core/commands.js';

export class EmptyView extends View {
  constructor(leaf) {
    super(leaf);
    this.icon = 'file';
    this.contentEl.classList.add('empty-state');
  }
  getViewType() { return 'empty'; }
  getDisplayText() { return 'New tab'; }

  async onOpen() {
    const app = this.app;
    const hk = id => { const k = app.commands.hotkeysFor(id)[0]; return k ? ' (' + hotkeyLabel(k) + ')' : ''; };
    const action = (text, fn) => h('div.empty-state-action.tappable', { role: 'button', tabindex: '0', text, onclick: fn,
      onkeydown: e => { if (e.key === 'Enter') fn(); } });
    const list = h('div.empty-state-action-list',
      action('Create new note' + hk('file-explorer:new-file'), () => app.commands.execute('file-explorer:new-file')),
      action('Go to file' + hk('switcher:open'), () => app.commands.execute('switcher:open')),
      action('See recent files' + hk('switcher:open'), () => app.commands.execute('switcher:open')),
      action('Close', () => this.leaf.detachOrEmpty()));
    this.contentEl.replaceChildren(h('div.empty-state-container',
      h('div.empty-state-title', { text: 'No file is open' }), list));
  }
}

/* Views here follow their own file: reload when it changes, retitle when
   it's renamed, close when it's deleted. (The markdown, canvas and base
   views do the same for themselves.) */
function followFile(view) {
  const vault = view.app.vault;
  view.registerEvent(vault.on('modify', f => { if (f === view.file) view.onModify(f); }));
  view.registerEvent(vault.on('rename', f => { if (f === view.file) view.onRename(f); }));
  view.registerEvent(vault.on('delete', f => { if (f === view.file) view.onDelete(f); }));
}

/* Images, audio, video and PDFs load from a blob URL of the file. */
class MediaView extends FileView {
  onload() { followFile(this); }
  async onLoadFile(file) {
    this.contentEl.replaceChildren();
    const url = await this.app.vault.getResourceUrl(file);
    if (this.file !== file) return;
    this.render(file, url);
  }
  async onUnloadFile() { this.contentEl.replaceChildren(); }
  onModify(file) { if (file === this.file) this.onLoadFile(file); }
}

export class ImageView extends MediaView {
  constructor(leaf) { super(leaf); this.icon = 'image'; this.contentEl.classList.add('image-container'); }
  getViewType() { return 'image'; }
  render(file, url) {
    const img = h('img', { src: url, alt: file.name, draggable: 'false' });
    img.addEventListener('click', () => this.contentEl.classList.toggle('is-zoomed'));
    this.contentEl.append(img);
  }
}

export class AudioView extends MediaView {
  constructor(leaf) { super(leaf); this.icon = 'file-audio'; this.contentEl.classList.add('audio-container'); }
  getViewType() { return 'audio'; }
  render(file, url) { this.contentEl.append(h('audio', { controls: true, src: url })); }
}

export class VideoView extends MediaView {
  constructor(leaf) { super(leaf); this.icon = 'file-video'; this.contentEl.classList.add('video-container'); }
  getViewType() { return 'video'; }
  render(file, url) { this.contentEl.append(h('video', { controls: true, src: url })); }
}

/* PDFs use the browser's own viewer. */
export class PdfView extends MediaView {
  constructor(leaf) { super(leaf); this.icon = 'file-text'; this.contentEl.classList.add('pdf-container'); }
  getViewType() { return 'pdf'; }
  setEphemeralState(e) { this.page = e && e.subpath && /page=(\d+)/.exec(e.subpath) ? +/page=(\d+)/.exec(e.subpath)[1] : null; }
  render(file, url) {
    this.contentEl.append(h('iframe.pdf-embed', { src: url + (this.page ? '#page=' + this.page : ''), title: file.name }));
  }
}

export class UnknownFileView extends FileView {
  constructor(leaf) { super(leaf); this.icon = 'file-question'; }
  getViewType() { return 'unknown-file'; }
  onload() { followFile(this); }
  async onLoadFile(file) {
    this.contentEl.replaceChildren(h('div.empty-state', h('div.empty-state-container',
      h('div.empty-state-title', { text: 'This file type can’t be shown here.' }),
      h('div.empty-state-action-list',
        h('div.empty-state-action.tappable', { text: 'Download ' + file.name, onclick: async () => {
          saveBlob(file.name, await this.app.vault.adapter.getFile(file.path));
        } })))));
  }
}

export function registerFileViews(app) {
  const ws = app.workspace;
  ws.registerView('empty', leaf => new EmptyView(leaf));
  ws.registerView('image', leaf => new ImageView(leaf));
  ws.registerView('audio', leaf => new AudioView(leaf));
  ws.registerView('video', leaf => new VideoView(leaf));
  ws.registerView('pdf', leaf => new PdfView(leaf));
  ws.registerView('unknown-file', leaf => new UnknownFileView(leaf));
  ws.registerExtensions([...IMAGE_EXT], 'image');
  ws.registerExtensions([...AUDIO_EXT].filter(x => x !== 'webm'), 'audio');
  ws.registerExtensions([...VIDEO_EXT], 'video');
  ws.registerExtensions(['pdf'], 'pdf');
}
