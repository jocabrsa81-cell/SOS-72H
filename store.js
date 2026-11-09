// Armazenamento local único. Tudo numa só chave, com versão para migrações futuras.
const KEY = 'sos72h.data';
const VERSION = 1;

const DEFAULTS = () => ({
  v: VERSION,
  settings: {
    lang: guessLang(),
    theme: 'auto',
    people: 2,
    pets: 0,
    waterPerPerson: 3,
    waterPerPet: 1,
    kcalPerPerson: 2000,
    goalHours: 72,
    regions: ['lu', 'pt'],
    alertsAuto: true,      // verificar alertas com a app aberta
    alertsNotify: false,   // notificação do sistema para alertas fortes
    weatherMin: { LU: 'yellow', FR: 'yellow', DE: 'yellow', BE: 'yellow', PT: 'yellow', ES: 'orange' }, // nível mínimo dos avisos de tempo por país   // lu = Luxemburgo e arredores, pt = Portugal e Espanha
  },
  kit: {},            // { itemId: true }
  inventory: [],      // { id, name, category, qty, unit, content, contentUnit, kcal, expiry, location }
  contacts: [],       // { id, name, relation, phone, far }
  meeting: { home: '', area: '', region: '' },
  members: [],        // { id, name, birth, blood, allergies, meds, conditions, doctor, notes }
  phone: {},          // passos de "Prepara o teu telemóvel" já feitos { id: true }
});

function guessLang() {
  const n = (navigator.language || 'pt').slice(0, 2).toLowerCase();
  return ['pt', 'fr', 'de', 'en', 'es'].includes(n) ? n : 'pt';
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function merge(base, data) {
  const out = { ...base, ...data };
  out.settings = { ...base.settings, ...(data.settings || {}) };
  out.meeting = { ...base.meeting, ...(data.meeting || {}) };
  for (const k of ['inventory', 'contacts', 'members']) if (!Array.isArray(out[k])) out[k] = [];
  if (typeof out.kit !== 'object' || out.kit === null) out.kit = {};
  if (typeof out.phone !== 'object' || out.phone === null) out.phone = {};
  return out;
}

// Traz os dados da versão anterior (ChatGPT) se existirem.
function migrateLegacy(data) {
  try {
    const old = JSON.parse(localStorage.getItem('sos72h.inventory.v1') || 'null');
    if (Array.isArray(old) && old.length && !data.inventory.length) {
      data.inventory = old.map(o => ({
        id: o.id || uid(),
        name: String(o.name || '').slice(0, 80),
        category: o.category || 'other',
        qty: Number(o.quantity) || 1,
        unit: o.unit === 'packet' ? 'pack' : (o.unit || 'un'),
        content: o.content ? Number(o.content) : null,
        contentUnit: o.contentUnit || '',
        kcal: null,
        expiry: o.expiry || '',
        location: '',
      }));
    }
    const fam = JSON.parse(localStorage.getItem('sos72h.family') || 'null');
    if (fam && !data.contacts.length && fam.contact) data.contacts.push({ id: uid(), name: fam.contact, relation: '', phone: '', far: false });
    if (fam && fam.meeting && !data.meeting.home) data.meeting.home = fam.meeting;
    const lang = localStorage.getItem('sos72h.lang');
    if (lang && ['pt', 'fr', 'de', 'en', 'es'].includes(lang)) data.settings.lang = lang;
  } catch (e) { /* dados antigos ilegíveis: ignora */ }
  return data;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return merge(DEFAULTS(), JSON.parse(raw));
  } catch (e) { /* armazenamento indisponível ou corrompido */ }
  return migrateLegacy(DEFAULTS());
}

let state = load();
let persistAsked = false;
const listeners = new Set();

export const store = {
  get: () => state,
  uid,
  // Recebe uma função que altera o estado; guarda e avisa os ecrãs.
  update(fn) {
    fn(state);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('Não foi possível guardar', e); }
    listeners.forEach(l => l(state));
    // Primeira vez que há dados: pede armazenamento persistente (o browser não os apaga por falta de espaço).
    if (!persistAsked && (state.inventory.length || state.contacts.length || state.members.length)) {
      persistAsked = true;
      try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
    }
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  exportJSON() {
    return JSON.stringify({ app: 'sos72h', exported: new Date().toISOString(), data: state }, null, 2);
  },
  importJSON(text) {
    const obj = JSON.parse(text);
    if (!obj || obj.app !== 'sos72h' || typeof obj.data !== 'object') throw new Error('invalid');
    store.update(s => { Object.assign(s, merge(DEFAULTS(), obj.data)); });
  },
  reset() {
    const lang = state.settings.lang;
    store.update(s => { Object.assign(s, DEFAULTS()); s.settings.lang = lang; });
  },
};

// Cálculos de autonomia — partilhados pelo início e pelo inventário.
export function regions() {
  const r = state.settings.regions;
  return Array.isArray(r) && r.length ? r : ['lu', 'pt'];
}

export function daysUntil(iso) {
  if (!iso) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(iso + 'T00:00:00') - today) / 86400000);
}

export function toLitres(item) {
  if (!item.content) return 0;
  if (item.contentUnit === 'L') return item.qty * item.content;
  if (item.contentUnit === 'ml') return item.qty * item.content / 1000;
  return 0;
}

// Itens da lista ligados ao inventário: ficam feitos sozinhos quando o inventário os cobre.
const KIT_LINKS = { firstaid: ['firstaid'], toilet: ['tp'] };
// Devolve { id: { done, auto, have, need, unit, count } } para os itens com ligação; os restantes vêm de state.kit.
export function kitAuto(s = state) {
  const a = autonomy(s);
  const st = s.settings;
  const days = st.goalHours / 24;
  const needL = Math.ceil(days * (st.people * st.waterPerPerson + st.pets * st.waterPerPet));
  const needK = Math.ceil(days * st.people * st.kcalPerPerson);
  const out = {
    water: { auto: true, done: a.litres >= needL, have: a.litres, need: needL, unit: 'L' },
    food: { auto: true, done: a.kcal >= needK, have: a.kcal, need: needK, unit: 'kcal' },
  };
  for (const [id, presets] of Object.entries(KIT_LINKS)) {
    const count = s.inventory.filter(i => presets.includes(i.presetId) && i.qty > 0 && !(daysUntil(i.expiry) < 0)).reduce((n, i) => n + i.qty, 0);
    if (count > 0) out[id] = { auto: true, done: true, count };
  }
  return out;
}
export function kitDone(id, s = state) {
  const a = kitAuto(s)[id];
  return a ? a.done : !!s.kit[id];
}

export function autonomy(s = state) {
  const st = s.settings;
  let litres = 0, kcal = 0, waterNoVol = 0, foodNoKcal = 0, expired = 0;
  for (const it of s.inventory) {
    const d = daysUntil(it.expiry);
    if (d !== null && d < 0) { if (it.category === 'water' || it.category === 'food') expired++; continue; }
    if (it.category === 'water') {
      const l = toLitres(it);
      if (l > 0) litres += l; else waterNoVol++;
    }
    if (it.kcal > 0) kcal += it.qty * it.kcal;
    else if (it.category === 'food') foodNoKcal++;
  }
  const waterPerDay = st.people * st.waterPerPerson + st.pets * st.waterPerPet;
  const kcalPerDay = st.people * st.kcalPerPerson;
  const waterH = waterPerDay > 0 ? litres / waterPerDay * 24 : 0;
  const foodH = kcalPerDay > 0 ? kcal / kcalPerDay * 24 : 0;
  const goal = st.goalHours;
  return {
    litres, kcal, waterH, foodH, goal,
    hours: Math.min(waterH, foodH),
    limit: waterH <= foodH ? 'water' : 'food',
    missingL: Math.max(0, goal / 24 * waterPerDay - litres),
    missingKcal: Math.max(0, goal / 24 * kcalPerDay - kcal),
    waterNoVol, foodNoKcal, expired,
  };
}
