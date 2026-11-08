// Cofre de documentos: AES-GCM 256, chave derivada do PIN com PBKDF2-SHA256.
// A chave só existe em memória enquanto o cofre está aberto.
import { t, L, fmtDate } from './i18n.js';
import { h, icon, sheet, toast, confirmBox, field, emptyState, fill, add } from './ui.js';
import { DOC_CHECKLIST } from './content.js';

export function title() { return null; }

const META = 'sos72h.vault';
const ITER = 310000;
const MAX_BYTES = 15 * 1024 * 1024;
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

let key = null;          // CryptoKey em memória
let lockTimer = null;
let failCount = 0, blockedUntil = 0;

// ——— IndexedDB ———
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('sos72h-vault', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('docs', { keyPath: 'id' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const x = d.transaction('docs', mode); const st = x.objectStore('docs');
    const out = fn(st);
    x.oncomplete = () => { d.close(); res(out && out.result !== undefined ? out.result : out); };
    x.onerror = () => { d.close(); rej(x.error); };
  });
}
const allDocs = () => tx('readonly', st => st.getAll());
const putDoc = doc => tx('readwrite', st => { st.put(doc); });
const putMany = docs => tx('readwrite', st => { docs.forEach(d => st.put(d)); });
const delDoc = id => tx('readwrite', st => { st.delete(id); });
const clearDocs = () => tx('readwrite', st => { st.clear(); });

// ——— Cripto ———
async function deriveKey(pin, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function encrypt(k, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, data);
  return { iv: b64(iv), ct };
}
const decrypt = (k, iv, ct) => crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, k, ct);

function meta() { try { return JSON.parse(localStorage.getItem(META) || 'null'); } catch (e) { return null; } }

async function buildVault(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const k = await deriveKey(pin, salt);
  const check = await encrypt(k, enc.encode('sos72h-ok'));
  return { key: k, meta: JSON.stringify({ v: 1, iter: ITER, salt: b64(salt), checkIv: check.iv, check: b64(check.ct) }) };
}
async function createVault(pin) {
  const v = await buildVault(pin);
  localStorage.setItem(META, v.meta);
  return v.key;
}
async function openVault(pin) {
  const m = meta();
  const k = await deriveKey(pin, unb64(m.salt));
  try { await decrypt(k, m.checkIv, unb64(m.check).buffer); return k; } catch (e) { return null; }
}

function lock() { key = null; clearTimeout(lockTimer); }
function touch(redraw) {
  clearTimeout(lockTimer);
  lockTimer = setTimeout(() => { lock(); redraw(); }, 5 * 60 * 1000);
}

// Reduz fotos grandes para poupar espaço (máx. 2000 px, JPEG).
async function prepareFile(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return { type: file.type || 'application/octet-stream', data: await file.arrayBuffer() };
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
    return { type: 'image/jpeg', data: await blob.arrayBuffer() };
  } catch (e) {
    return { type: file.type, data: await file.arrayBuffer() };
  }
}

// ——— Ecrã ———
export function render(root) {
  const supported = !!(window.crypto && crypto.subtle && window.indexedDB);
  const box = h('div');
  const checklist = h('section.block',
    h('h2.block-title', icon('doc', 20), t('vaultChecklist')),
    h('ul.bullets', DOC_CHECKLIST.map(d => h('li', L(d)))));
  add(root, h('p.lede', t('vaultIntro')), box, checklist);

  const redraw = () => {
    if (!supported) return fill(box, h('p.notice.warn', t('vaultUnsupported')));
    if (!meta()) return fill(box, createForm(redraw));
    if (!key) return fill(box, unlockForm(redraw));
    fill(box, h('p.muted', '…'));
    docsView(redraw).then(v => fill(box, v)).catch(e => fill(box, h('p.form-error', String(e))));
  };
  redraw();
  const activity = () => key && touch(redraw);
  document.addEventListener('pointerdown', activity);
  return () => { document.removeEventListener('pointerdown', activity); lock(); };
}

function pinInput(ac) { return h('input', { type: 'password', autocomplete: ac, minLength: 6, maxLength: 128, required: true }); }

function createForm(redraw) {
  const p1 = pinInput('new-password'), p2 = pinInput('new-password');
  const err = h('p.form-error', { role: 'alert' });
  const btn = h('button.btn.primary.block', { type: 'submit' }, icon('lock', 18), t('vaultCreate'));
  return h('form.form.card', { onsubmit: async e => {
    e.preventDefault(); err.textContent = '';
    if (p1.value.length < 6) return (err.textContent = t('vaultPinShort'));
    if (p1.value !== p2.value) return (err.textContent = t('vaultPinMismatch'));
    btn.disabled = true;
    key = await createVault(p1.value);
    touch(redraw); redraw();
  } },
    field(t('vaultPin'), p1, t('vaultPinHelp')),
    field(t('vaultPinRepeat'), p2),
    h('p.notice.warn', icon('alert', 18), t('vaultWarn')),
    err, btn);
}

function unlockForm(redraw) {
  const p = pinInput('current-password');
  const err = h('p.form-error', { role: 'alert' });
  const btn = h('button.btn.primary.block', { type: 'submit' }, icon('unlock', 18), t('vaultUnlock'));
  const form = h('form.form.card', { onsubmit: async e => {
    e.preventDefault(); err.textContent = '';
    const wait = Math.ceil((blockedUntil - Date.now()) / 1000);
    if (wait > 0) return (err.textContent = t('vaultWait', { n: wait }));
    btn.disabled = true;
    const k = await openVault(p.value);
    btn.disabled = false;
    if (!k) {
      failCount++;
      if (failCount >= 3) blockedUntil = Date.now() + Math.min(300, 5 * 2 ** (failCount - 3)) * 1000;
      err.textContent = t('vaultWrongPin'); p.select(); return;
    }
    failCount = 0; key = k; touch(redraw); redraw();
  } },
    h('div.vault-lock', icon('lock', 40)),
    field(t('vaultPin'), p), err, btn,
    h('button.btn.ghost.danger.block', { type: 'button', onclick: async () => {
      if (await confirmBox(t('vaultDestroyConfirm'), t('vaultDestroy'))) { await clearDocs(); localStorage.removeItem(META); lock(); redraw(); }
    } }, t('vaultDestroy')));
  setTimeout(() => p.focus(), 50);
  return form;
}

async function docsView(redraw) {
  const docs = (await allDocs()).sort((a, b) => b.created - a.created);
  const names = await Promise.all(docs.map(async d => {
    try { return dec.decode(await decrypt(key, d.nameIv, d.nameCt)); } catch (e) { return '?'; }
  }));
  return h('div',
    h('div.block-head',
      h('p.muted', icon('lock', 14), ' ', t('vaultAutoLock')),
      h('button.btn.small.ghost', { type: 'button', onclick: () => { lock(); redraw(); } }, icon('lock', 16), t('vaultLock'))),
    h('button.btn.primary.block', { type: 'button', onclick: () => addDoc(redraw) }, icon('plus', 18), t('vaultAdd')),
    docs.length
      ? h('ul.docs', docs.map((d, i) => h('li.doc',
          h('button.doc-open', { type: 'button', onclick: () => viewDoc(d, names[i], redraw) },
            icon(d.type.startsWith('image/') ? 'card' : 'doc', 22),
            h('span', h('b', names[i]), h('small.muted', fmtDate(new Date(d.created).toISOString().slice(0, 10)))))
        )))
      : emptyState(t('vaultEmpty')),
    h('div.inline-actions.vault-admin',
      h('button.btn.small.ghost', { type: 'button', onclick: () => changePin(redraw) }, t('vaultChangePin'))));
}

function addDoc(redraw) {
  const name = h('input', { type: 'text', maxLength: 80, required: true, placeholder: t('vaultDocNamePh') });
  const file = h('input.file', { type: 'file', accept: 'image/*,application/pdf' });
  const err = h('p.form-error', { role: 'alert' });
  const btn = h('button.btn.primary', { type: 'submit' }, t('save'));
  const form = h('form.form', { onsubmit: async e => {
    e.preventDefault(); err.textContent = '';
    const f = file.files[0];
    if (!name.value.trim()) { err.textContent = t('vaultDocName') + ' ?'; return name.focus(); }
    if (!f) { err.textContent = t('vaultChoose'); return; }
    if (f.size > MAX_BYTES) { err.textContent = t('vaultTooBig'); return; }
    if (!key) { s.close(); return redraw(); }
    btn.disabled = true; btn.textContent = t('vaultEncrypting');
    const { type, data } = await prepareFile(f);
    const n = await encrypt(key, enc.encode(name.value.trim()));
    const c = await encrypt(key, data);
    await putDoc({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), created: Date.now(), type, nameIv: n.iv, nameCt: n.ct, iv: c.iv, ct: c.ct });
    s.close(); toast(t('saved')); redraw();
  } },
    field(t('vaultDocName'), name),
    field(t('vaultChoose'), file),
    err,
    h('div.row-actions', h('button.btn.ghost', { type: 'button', onclick: () => s.close() }, t('cancel')), btn));
  const s = sheet(t('vaultAdd'), form);
}

async function viewDoc(d, name, redraw) {
  if (!key) return redraw();
  const data = await decrypt(key, d.iv, d.ct);
  const url = URL.createObjectURL(new Blob([data], { type: d.type }));
  const body = h('div.doc-view',
    d.type.startsWith('image/') ? h('img', { src: url, alt: name }) : h('a.btn.primary.block', { href: url, target: '_blank', download: name + '.pdf' }, icon('doc', 18), t('vaultOpen')),
    h('div.row-actions',
      h('button.btn.danger.ghost', { type: 'button', onclick: async () => {
        if (await confirmBox(t('confirmDelete', { name }))) { await delDoc(d.id); s.close(); redraw(); }
      } }, icon('trash', 16), t('delete'))));
  const s = sheet(name, body, { wide: true, onClose: () => URL.revokeObjectURL(url) });
}

function changePin(redraw) {
  const cur = pinInput('current-password'), p1 = pinInput('new-password'), p2 = pinInput('new-password');
  const err = h('p.form-error', { role: 'alert' });
  const btn = h('button.btn.primary', { type: 'submit' }, t('save'));
  const form = h('form.form', { onsubmit: async e => {
    e.preventDefault(); err.textContent = '';
    if (p1.value.length < 6) return (err.textContent = t('vaultPinShort'));
    if (p1.value !== p2.value) return (err.textContent = t('vaultPinMismatch'));
    btn.disabled = true;
    const old = await openVault(cur.value);
    if (!old) { btn.disabled = false; return (err.textContent = t('vaultWrongPin')); }
    btn.textContent = t('vaultEncrypting');
    // Decifra tudo com a chave antiga, cifra com a nova, e só então troca os metadados.
    const docs = await allDocs();
    const plain = await Promise.all(docs.map(async d => ({ d, name: await decrypt(old, d.nameIv, d.nameCt), data: await decrypt(old, d.iv, d.ct) })));
    try {
      // Tudo é cifrado em memória e gravado numa só transação: ou muda tudo, ou nada.
      const nv = await buildVault(p1.value);
      const out = [];
      for (const { d, name, data } of plain) {
        const n = await encrypt(nv.key, name), c = await encrypt(nv.key, data);
        out.push({ ...d, nameIv: n.iv, nameCt: n.ct, iv: c.iv, ct: c.ct });
      }
      await putMany(out);
      localStorage.setItem(META, nv.meta);
      key = nv.key; s.close(); toast(t('vaultPinChanged')); redraw();
    } catch (ex) {
      err.textContent = String(ex); btn.disabled = false; btn.textContent = t('save');
    }
  } },
    field(t('vaultCurrentPin'), cur), field(t('vaultNewPin'), p1, t('vaultPinHelp')), field(t('vaultPinRepeat'), p2),
    err, h('div.row-actions', h('button.btn.ghost', { type: 'button', onclick: () => s.close() }, t('cancel')), btn));
  const s = sheet(t('vaultChangePin'), form);
}
