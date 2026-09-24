/* Lossless removal of PDF "Standard security handler" encryption, used by the
   PDF tools. Supports RC4 40/128-bit (R2-R4), AES-128 (AESV2) and AES-256
   (R5/R6). pdf-lib parses the file; this module derives the file key from the
   password, decrypts every string and stream (including compressed object
   streams, which are parsed only after they are decrypted), and saves a copy
   without the /Encrypt dictionary.

   PdfUnlock.decrypt(bytes, password) -> Promise<{ bytes, wasEncrypted, method, usedOwner }>
   Errors carry .code: 'NEED_PASSWORD' | 'BAD_PASSWORD' | 'UNSUPPORTED'. */
(function (global) {
  'use strict';

  var PAD = new Uint8Array([0x28, 0xBF, 0x4E, 0x5E, 0x4E, 0x75, 0x8A, 0x41, 0x64, 0x00, 0x4E, 0x56,
    0xFF, 0xFA, 0x01, 0x08, 0x2E, 0x2E, 0x00, 0xB6, 0xD0, 0x68, 0x3E, 0x80, 0x2F, 0x0C, 0xA9, 0xFE,
    0x64, 0x53, 0x69, 0x7A]);

  function fail(code, message) { var e = new Error(message); e.code = code; return e; }

  function concat() {
    var parts = Array.prototype.slice.call(arguments), len = 0, off = 0;
    parts.forEach(function (p) { len += p.length; });
    var out = new Uint8Array(len);
    parts.forEach(function (p) { out.set(p, off); off += p.length; });
    return out;
  }

  function hexBytes(hex) {
    var out = new Uint8Array(hex.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    return out;
  }

  function md5(bytes) { return hexBytes(global.Hash.md5(bytes)); }

  function equal(a, b, n) {
    if (a.length < n || b.length < n) return false;
    for (var i = 0; i < n; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function rc4(key, data) {
    var s = new Uint8Array(256), i, j = 0, t;
    for (i = 0; i < 256; i++) s[i] = i;
    for (i = 0; i < 256; i++) {
      j = (j + s[i] + key[i % key.length]) & 255;
      t = s[i]; s[i] = s[j]; s[j] = t;
    }
    var out = new Uint8Array(data.length);
    i = 0; j = 0;
    for (var k = 0; k < data.length; k++) {
      i = (i + 1) & 255;
      j = (j + s[i]) & 255;
      t = s[i]; s[i] = s[j]; s[j] = t;
      out[k] = data[k] ^ s[(s[i] + s[j]) & 255];
    }
    return out;
  }

  /* --- AES via WebCrypto ------------------------------------------------- */

  function subtle() {
    if (!global.crypto || !global.crypto.subtle) throw fail('UNSUPPORTED', 'AES decryption needs WebCrypto (serve the app over http://localhost).');
    return global.crypto.subtle;
  }

  function aesKey(raw, usage) {
    return subtle().importKey('raw', raw, { name: 'AES-CBC' }, false, [usage]);
  }

  /* Encrypt data whose length is a multiple of 16, without padding. */
  async function aesEncryptRaw(raw, iv, data) {
    var key = await aesKey(raw, 'encrypt');
    var out = new Uint8Array(await subtle().encrypt({ name: 'AES-CBC', iv: iv }, key, data));
    return out.subarray(0, data.length);
  }

  /* Decrypt without relying on PKCS#7 padding being present: append one
     crafted block that decrypts to a full padding block. */
  async function aesDecryptNoPad(raw, iv, data) {
    if (!data.length) return new Uint8Array(0);
    var last = data.subarray(data.length - 16);
    var pad = new Uint8Array(16).fill(16);
    var extra = await aesEncryptRaw(raw, last, pad);
    var key = await aesKey(raw, 'decrypt');
    var out = await subtle().decrypt({ name: 'AES-CBC', iv: iv }, key, concat(data, extra));
    return new Uint8Array(out);
  }

  async function aesDecryptObject(raw, data) {
    if (data.length < 32) {
      if (data.length <= 16) return new Uint8Array(0);
    }
    var iv = data.subarray(0, 16), body = data.subarray(16);
    var usable = body.length - (body.length % 16);
    body = body.subarray(0, usable);
    if (!body.length) return new Uint8Array(0);
    try {
      var key = await aesKey(raw, 'decrypt');
      return new Uint8Array(await subtle().decrypt({ name: 'AES-CBC', iv: iv }, key, body));
    } catch (e) {
      return aesDecryptNoPad(raw, iv, body);
    }
  }

  async function sha(bits, data) {
    return new Uint8Array(await subtle().digest('SHA-' + bits, data));
  }

  /* ISO 32000-2 algorithm 2.B (R6); R5 is a single SHA-256. */
  async function hash2B(pw, salt, udata, revision) {
    var k = await sha(256, concat(pw, salt, udata));
    if (revision === 5) return k;
    var round = 0, e;
    for (;;) {
      var unit = concat(pw, k, udata);
      var k1 = new Uint8Array(unit.length * 64);
      for (var i = 0; i < 64; i++) k1.set(unit, i * unit.length);
      e = await aesEncryptRaw(k.subarray(0, 16), k.subarray(16, 32), k1);
      var sum = 0;
      for (var j = 0; j < 16; j++) sum += e[j];
      var mod = sum % 3;
      k = await sha(mod === 0 ? 256 : mod === 1 ? 384 : 512, e);
      round++;
      if (round >= 64 && e[e.length - 1] <= round - 32) break;
    }
    return k.subarray(0, 32);
  }

  /* --- key derivation ---------------------------------------------------- */

  function latin1Password(pw) {
    var out = [];
    for (var i = 0; i < pw.length && out.length < 32; i++) {
      var c = pw.charCodeAt(i);
      out.push(c < 256 ? c : 63);
    }
    return new Uint8Array(out);
  }

  function padPassword(bytes) {
    var out = new Uint8Array(32);
    out.set(bytes.subarray(0, 32));
    if (bytes.length < 32) out.set(PAD.subarray(0, 32 - bytes.length), bytes.length);
    return out;
  }

  function computeKeyLegacy(pwBytes, enc) {
    var p = enc.P >>> 0;
    var input = concat(padPassword(pwBytes), enc.O.subarray(0, 32),
      new Uint8Array([p & 255, (p >>> 8) & 255, (p >>> 16) & 255, (p >>> 24) & 255]), enc.id0,
      enc.R >= 4 && !enc.encryptMetadata ? new Uint8Array([255, 255, 255, 255]) : new Uint8Array(0));
    var key = md5(input);
    var n = enc.R === 2 ? 5 : enc.keyLength;
    if (enc.R >= 3) for (var i = 0; i < 50; i++) key = md5(key.subarray(0, n));
    return key.subarray(0, n);
  }

  function checkUserLegacy(key, enc) {
    if (enc.R === 2) return equal(rc4(key, PAD), enc.U, 32);
    var x = rc4(key, md5(concat(PAD, enc.id0)));
    for (var i = 1; i <= 19; i++) {
      var k = new Uint8Array(key.length);
      for (var j = 0; j < key.length; j++) k[j] = key[j] ^ i;
      x = rc4(k, x);
    }
    return equal(x, enc.U, 16);
  }

  function userFromOwnerLegacy(pwBytes, enc) {
    var key = md5(padPassword(pwBytes));
    var n = enc.R === 2 ? 5 : enc.keyLength;
    if (enc.R >= 3) for (var i = 0; i < 50; i++) key = md5(key.subarray(0, n));
    key = key.subarray(0, n);
    var o = enc.O.subarray(0, 32);
    if (enc.R === 2) return rc4(key, o);
    for (var r = 19; r >= 0; r--) {
      var k = new Uint8Array(n);
      for (var j = 0; j < n; j++) k[j] = key[j] ^ r;
      o = rc4(k, o);
    }
    return o;
  }

  async function fileKey(password, enc) {
    if (enc.R <= 4) {
      var pw = latin1Password(password);
      var key = computeKeyLegacy(pw, enc);
      if (checkUserLegacy(key, enc)) return { key: key, owner: false };
      var user = userFromOwnerLegacy(pw, enc);
      /* the recovered user password is the padded form; trim the pad tail */
      key = computeKeyLegacy(user, enc);
      if (checkUserLegacy(key, enc)) return { key: key, owner: true };
      return null;
    }
    var pwU = new TextEncoder().encode(password.normalize ? password.normalize('NFKC') : password).subarray(0, 127);
    var U = enc.U, O = enc.O;
    if (equal(await hash2B(pwU, U.subarray(32, 40), new Uint8Array(0), enc.R), U, 32)) {
      var ik = await hash2B(pwU, U.subarray(40, 48), new Uint8Array(0), enc.R);
      return { key: await aesDecryptNoPad(ik, new Uint8Array(16), enc.UE.subarray(0, 32)), owner: false };
    }
    var u48 = U.subarray(0, 48);
    if (equal(await hash2B(pwU, O.subarray(32, 40), u48, enc.R), O, 32)) {
      var ok = await hash2B(pwU, O.subarray(40, 48), u48, enc.R);
      return { key: await aesDecryptNoPad(ok, new Uint8Array(16), enc.OE.subarray(0, 32)), owner: true };
    }
    return null;
  }

  /* --- object walking ---------------------------------------------------- */

  function bytesOf(obj, L) {
    if (!obj) return new Uint8Array(0);
    if (obj instanceof L.PDFString || obj instanceof L.PDFHexString) return obj.asBytes();
    return new Uint8Array(0);
  }

  function num(obj, L, dflt) {
    return obj instanceof L.PDFNumber ? obj.asNumber() : dflt;
  }

  function readEncrypt(context, L) {
    var dict = context.lookup(context.trailerInfo.Encrypt);
    if (!(dict instanceof L.PDFDict)) return null;
    var N = function (n) { return L.PDFName.of(n); };
    var filter = dict.lookup(N('Filter'));
    if (filter && filter.asString && filter.asString() !== '/Standard') {
      throw fail('UNSUPPORTED', 'This PDF uses ' + filter.asString().slice(1) + ' security (certificates), which can\'t be removed with a password.');
    }
    var V = num(dict.lookup(N('V')), L, 0);
    var R = num(dict.lookup(N('R')), L, 2);
    var length = num(dict.lookup(N('Length')), L, 40);
    var em = dict.lookup(N('EncryptMetadata'));
    var enc = {
      dict: dict, V: V, R: R,
      keyLength: Math.max(5, Math.min(16, Math.round(length / 8))),
      O: bytesOf(dict.lookup(N('O')), L), U: bytesOf(dict.lookup(N('U')), L),
      OE: bytesOf(dict.lookup(N('OE')), L), UE: bytesOf(dict.lookup(N('UE')), L),
      P: num(dict.lookup(N('P')), L, -1),
      encryptMetadata: !(em instanceof L.PDFBool) || em.asBoolean(),
      stm: 'RC4', str: 'RC4'
    };
    var idArr = context.lookup(context.trailerInfo.ID);
    enc.id0 = idArr instanceof L.PDFArray && idArr.size() ? bytesOf(idArr.lookup(0), L) : new Uint8Array(0);

    if (V >= 4) {
      var cf = dict.lookup(N('CF'));
      var method = function (name) {
        if (!name || name.asString() === '/Identity') return 'none';
        var f = cf instanceof L.PDFDict ? cf.lookup(name) : null;
        var cfm = f instanceof L.PDFDict ? f.lookup(N('CFM')) : null;
        var m = cfm ? cfm.asString() : '/None';
        if (m === '/AESV2') return 'AES128';
        if (m === '/AESV3') return 'AES256';
        if (m === '/V2') return 'RC4';
        return 'none';
      };
      enc.stm = method(dict.lookup(N('StmF')));
      enc.str = method(dict.lookup(N('StrF')));
      if (V === 4) {
        var cfl = cf instanceof L.PDFDict ? cf.lookup(N('StdCF')) : null;
        var clen = cfl instanceof L.PDFDict ? num(cfl.lookup(N('Length')), L, 0) : 0;
        if (clen) enc.keyLength = clen > 16 ? Math.round(clen / 8) : clen;
        if (enc.stm === 'AES128' || enc.str === 'AES128') enc.keyLength = 16;
      }
    } else if (V === 1) {
      enc.keyLength = 5;
    }
    if (R > 6 || V > 5) throw fail('UNSUPPORTED', 'Unsupported encryption revision ' + R + '.');
    return enc;
  }

  function objectKey(enc, ref, aes) {
    if (enc.R >= 5) return enc.key;
    var n = enc.key.length;
    var extra = new Uint8Array([ref.objectNumber & 255, (ref.objectNumber >> 8) & 255, (ref.objectNumber >> 16) & 255,
      ref.generationNumber & 255, (ref.generationNumber >> 8) & 255]);
    var h = md5(concat(enc.key, extra, aes ? new Uint8Array([0x73, 0x41, 0x6C, 0x54]) : new Uint8Array(0)));
    return h.subarray(0, Math.min(n + 5, 16));
  }

  async function decryptBytes(enc, ref, data, kind) {
    var method = kind === 'stream' ? enc.stm : enc.str;
    if (method === 'none') return data;
    if (method === 'RC4') return rc4(objectKey(enc, ref, false), data);
    return aesDecryptObject(objectKey(enc, ref, true), data);
  }

  async function decryptValue(obj, enc, ref, L) {
    if (obj instanceof L.PDFString || obj instanceof L.PDFHexString) {
      var plain = await decryptBytes(enc, ref, obj.asBytes(), 'string');
      var hex = '';
      for (var i = 0; i < plain.length; i++) hex += (plain[i] < 16 ? '0' : '') + plain[i].toString(16);
      return L.PDFHexString.of(hex);
    }
    if (obj instanceof L.PDFArray) {
      for (var a = 0; a < obj.size(); a++) {
        var v = obj.get(a), nv = await decryptValue(v, enc, ref, L);
        if (nv !== v) obj.set(a, nv);
      }
      return obj;
    }
    if (obj instanceof L.PDFDict) {
      var entries = obj.entries();
      for (var e = 0; e < entries.length; e++) {
        var val = entries[e][1], nval = await decryptValue(val, enc, ref, L);
        if (nval !== val) obj.set(entries[e][0], nval);
      }
      return obj;
    }
    return obj;
  }

  /* Parse the document, deferring object streams until they can be decrypted. */
  async function parse(bytes, L) {
    var deferred = [];
    var lastRef = null;
    var ParserProto = L.PDFParser.prototype;
    var origHeader = ParserProto.parseIndirectObjectHeader;
    var origFor = L.PDFObjectStreamParser.forStream;
    ParserProto.parseIndirectObjectHeader = function () {
      var r = origHeader.apply(this, arguments);
      lastRef = r;
      return r;
    };
    L.PDFObjectStreamParser.forStream = function (raw, tick) {
      deferred.push({ ref: lastRef, raw: raw, tick: tick });
      return { parseIntoContext: function () { return Promise.resolve(); } };
    };
    var context;
    try {
      context = await L.PDFParser.forBytesWithOptions(bytes, 100, false, false).parseDocument();
    } finally {
      ParserProto.parseIndirectObjectHeader = origHeader;
      L.PDFObjectStreamParser.forStream = origFor;
    }
    return { context: context, deferred: deferred, parseObjStm: origFor };
  }

  async function decrypt(bytes, password) {
    var L = global.PDFLib;
    if (!L) throw new Error('pdf-lib is not loaded');
    var parsed = await parse(bytes, L);
    var context = parsed.context;
    var enc = readEncrypt(context, L);

    if (!enc) {
      for (var d = 0; d < parsed.deferred.length; d++) {
        await parsed.parseObjStm(parsed.deferred[d].raw).parseIntoContext();
      }
      var plainDoc = new L.PDFDocument(context, false, false);
      return { doc: plainDoc, bytes: await plainDoc.save({ useObjectStreams: false }), wasEncrypted: false };
    }

    var found = await fileKey(password || '', enc);
    if (!found) {
      throw password ? fail('BAD_PASSWORD', 'That password is not correct for this PDF.')
                     : fail('NEED_PASSWORD', 'This PDF needs a password to open. Enter it and try again.');
    }
    enc.key = found.key;

    var encRef = context.trailerInfo.Encrypt;
    var metadataName = L.PDFName.of('Metadata');
    var typeName = L.PDFName.of('Type');
    var objects = context.enumerateIndirectObjects();

    for (var i = 0; i < objects.length; i++) {
      var ref = objects[i][0], obj = objects[i][1];
      if (encRef instanceof L.PDFRef && ref === encRef) continue;
      if (obj === enc.dict) continue;
      if (obj instanceof L.PDFRawStream) {
        await decryptValue(obj.dict, enc, ref, L);
        var isMeta = obj.dict.lookup(typeName) === metadataName;
        if (isMeta && !enc.encryptMetadata) continue;
        var plain = await decryptBytes(enc, ref, obj.contents, 'stream');
        context.assign(ref, L.PDFRawStream.of(obj.dict, plain));
      } else {
        var nv = await decryptValue(obj, enc, ref, L);
        if (nv !== obj) context.assign(ref, nv);
      }
    }

    for (var s = 0; s < parsed.deferred.length; s++) {
      var item = parsed.deferred[s];
      var contents = await decryptBytes(enc, item.ref, item.raw.contents, 'stream');
      await parsed.parseObjStm(L.PDFRawStream.of(item.raw.dict, contents)).parseIntoContext();
    }

    if (encRef instanceof L.PDFRef) context.delete(encRef);
    delete context.trailerInfo.Encrypt;
    context.trailerInfo.Encrypt = undefined;

    var doc = new L.PDFDocument(context, false, false);
    var out = await doc.save({ useObjectStreams: false });
    return {
      doc: doc, bytes: out, wasEncrypted: true, usedOwner: found.owner,
      method: enc.R >= 5 ? 'AES-256' : (enc.stm === 'AES128' ? 'AES-128' : 'RC4 ' + enc.key.length * 8 + '-bit'),
      permissions: enc.P
    };
  }

  global.PdfUnlock = { decrypt: decrypt, rc4: rc4 };
})(window);
