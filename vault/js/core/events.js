/* A small event emitter, shaped like Obsidian's Events class: on() returns
   a reference that offref() (or ref.off()) removes. */
export class Events {
  constructor() { this._handlers = new Map(); }

  on(name, fn, ctx) {
    if (!this._handlers.has(name)) this._handlers.set(name, []);
    const ref = { name, fn, ctx, emitter: this, off: () => this.offref(ref) };
    this._handlers.get(name).push(ref);
    return ref;
  }

  once(name, fn, ctx) {
    const ref = this.on(name, (...args) => { this.offref(ref); fn.apply(ctx, args); });
    return ref;
  }

  off(name, fn) {
    const list = this._handlers.get(name);
    if (list) this._handlers.set(name, list.filter(r => r.fn !== fn));
  }

  offref(ref) {
    const list = this._handlers.get(ref.name);
    if (list) this._handlers.set(ref.name, list.filter(r => r !== ref));
  }

  trigger(name, ...args) {
    const list = this._handlers.get(name);
    if (!list) return;
    for (const ref of list.slice()) {
      try { ref.fn.apply(ref.ctx, args); } catch (err) { console.error('[vault] handler for "' + name + '" failed', err); }
    }
  }
}

/* Collects cleanups (event refs, DOM listeners, intervals, child
   components) so a view or plugin can release everything it registered in
   one call. Mirrors Obsidian's Component. */
export class Component {
  constructor() { this._cleanups = []; this._children = []; this._loaded = false; }
  load() { if (this._loaded) return; this._loaded = true; this.onload(); this._children.forEach(c => c.load()); }
  onload() {}
  unload() {
    if (!this._loaded) return;
    this._loaded = false;
    this._children.splice(0).forEach(c => c.unload());
    this._cleanups.splice(0).reverse().forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
    this.onunload();
  }
  onunload() {}
  addChild(c) { this._children.push(c); if (this._loaded) c.load(); return c; }
  removeChild(c) { const i = this._children.indexOf(c); if (i > -1) { this._children.splice(i, 1); c.unload(); } return c; }
  register(fn) { this._cleanups.push(fn); }
  registerEvent(ref) { this._cleanups.push(() => ref.emitter.offref(ref)); }
  registerDomEvent(el, type, fn, opts) { el.addEventListener(type, fn, opts); this._cleanups.push(() => el.removeEventListener(type, fn, opts)); }
  registerInterval(id) { this._cleanups.push(() => clearInterval(id)); return id; }
}
