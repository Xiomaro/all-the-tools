/* A promise wrapper over one IndexedDB database with a few object stores.
   Directory handles, the saved layout and file-recovery snapshots live
   here; none of it leaves the browser. */
const DB_NAME = 'att-vault';
const STORES = ['kv', 'handles', 'recovery'];
let dbPromise = null;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { dbPromise = null; reject(req.error); };
    });
  }
  return dbPromise;
}

function run(store, mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const result = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(result && 'result' in result ? result.result : result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export function store(name) {
  return {
    get: key => run(name, 'readonly', s => s.get(key)),
    set: (key, value) => run(name, 'readwrite', s => { s.put(value, key); }),
    del: key => run(name, 'readwrite', s => { s.delete(key); }),
    keys: () => run(name, 'readonly', s => s.getAllKeys()),
    /* Every [key, value] whose key starts with prefix. */
    entries: prefix => run(name, 'readonly', s => {
      const out = [];
      const range = prefix ? IDBKeyRange.bound(prefix, prefix + '\uffff') : undefined;
      const req = s.openCursor(range);
      req.onsuccess = () => { const c = req.result; if (c) { out.push([c.key, c.value]); c.continue(); } };
      return { get result() { return out; } };
    })
  };
}

export const kv = store('kv');
export const handles = store('handles');
export const recovery = store('recovery');
