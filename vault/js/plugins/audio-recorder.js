/* Audio recorder: record from the microphone and save
   "Recording YYYYMMDDHHmmss.webm" in the attachment folder, embedded in
   the note that was being edited. The browser asks for the microphone the
   first time. */

import { h, Notice } from '../core/ui.js';

function pickType() {
  const types = [['audio/webm;codecs=opus', 'webm'], ['audio/webm', 'webm'], ['audio/ogg;codecs=opus', 'ogg'], ['audio/mp4', 'm4a']];
  for (const [mime, ext] of types) if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mime)) return { mime, ext };
  return { mime: '', ext: 'webm' };
}

export default {
  id: 'audio-recorder',
  name: 'Audio recorder',
  description: 'Record audio and embed it in the current note.',
  async onload(plugin) {
    const app = plugin.app;
    let rec = null;
    let stream = null;
    let startedAt = 0;
    let target = null;       /* the note being edited when recording started */
    let ticker = null;
    const status = plugin.addStatusBarItem();
    status.classList.add('plugin-audio-recorder', 'mod-clickable');
    status.style.display = 'none';
    status.addEventListener('click', () => stop());

    const setRecording = on => {
      ribbon.classList.toggle('is-recording', on);
      ribbon.setAttribute('aria-label', on ? 'Stop recording' : 'Start recording');
      ribbon.title = on ? 'Stop recording' : 'Start recording';
      status.style.display = on ? '' : 'none';
      clearInterval(ticker);
      if (on) {
        const tick = () => {
          const s = Math.floor((Date.now() - startedAt) / 1000);
          status.replaceChildren(h('span.audio-recorder-dot'), 'Recording ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'));
        };
        tick();
        ticker = setInterval(tick, 1000);
      }
    };

    const start = async () => {
      if (rec) return;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
        new Notice('This browser can’t record audio.');
        return;
      }
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch (e) { new Notice('Couldn’t use the microphone: ' + (e.message || e.name || e)); return; }
      const type = pickType();
      const chunks = [];
      const view = app.workspace.activeEditor;
      target = { file: view ? view.file : app.workspace.getActiveFile(), view };
      rec = type.mime ? new MediaRecorder(stream, { mimeType: type.mime }) : new MediaRecorder(stream);
      rec.addEventListener('dataavailable', e => { if (e.data && e.data.size) chunks.push(e.data); });
      rec.addEventListener('stop', () => save(new Blob(chunks, { type: rec && rec.mimeType || type.mime || 'audio/webm' }), type.ext));
      rec.start(1000);
      startedAt = Date.now();
      setRecording(true);
    };

    const stop = () => {
      if (!rec) return;
      try { rec.stop(); } catch (e) { /* already stopped */ }
      if (stream) stream.getTracks().forEach(t => t.stop());
      stream = null;
      setRecording(false);
    };

    const save = async (blob, ext) => {
      rec = null;
      const t = target;
      target = null;
      try {
        const source = t && t.file ? t.file.path : '';
        const name = 'Recording ' + window.moment().format('YYYYMMDDHHmmss') + '.' + ext;
        const path = await app.fileManager.getAvailablePathForAttachment(name, source);
        const file = await app.vault.createBinary(path, await blob.arrayBuffer());
        const embed = '!' + app.fileManager.generateMarkdownLink(file, source);
        const view = app.workspace.activeEditor;
        if (view && view.editor && (!t || !t.file || view.file === t.file)) {
          view.editor.replaceSelection(embed);
          /* Write it now rather than on the editor's next autosave, so the
             note and its new recording reach the disk together. */
          if (view.save) await view.save();
        } else if (t && t.file && t.file.extension === 'md' && app.vault.getFileByPath(t.file.path)) {
          await app.vault.process(t.file, text => text + (text && !text.endsWith('\n') ? '\n' : '') + embed + '\n');
        } else {
          new Notice('Saved the recording as ' + file.path + '.');
          return;
        }
        new Notice('Saved the recording as ' + file.name + '.');
      } catch (e) { new Notice('Couldn’t save the recording: ' + (e.message || e)); }
    };

    const ribbon = plugin.addRibbonIcon('mic', 'Start recording', () => (rec ? stop() : start()));
    plugin.addCommand({ id: 'audio-recorder:start', name: 'Audio recorder: Start recording audio', icon: 'mic',
      checkCallback: checking => { if (rec) return false; if (!checking) start(); return true; } });
    plugin.addCommand({ id: 'audio-recorder:stop', name: 'Audio recorder: Stop recording audio', icon: 'square',
      checkCallback: checking => { if (!rec) return false; if (!checking) stop(); return true; } });
    plugin.register(() => { clearInterval(ticker); if (rec) stop(); });
  }
};
