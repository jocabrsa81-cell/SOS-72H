// Traduções: um ficheiro por língua (lang-pt.js, lang-fr.js, …), carregado quando é preciso.
// O português é a língua de referência: o que faltar noutra língua aparece em português.
import { store } from './store.js';
import { applyContent } from './content.js';

export const LANGS = ['pt', 'fr', 'de', 'en', 'es'];
export const LANG_NAMES = { pt: 'Português', fr: 'Français', de: 'Deutsch', en: 'English', es: 'Español' };
export const UNIT_KEYS = ['bottle', 'jerrycan', 'can', 'jar', 'pack', 'box', 'bag', 'un'];
export const CAT_KEYS = ['water', 'food', 'medical', 'equipment', 'hygiene', 'energy', 'documents', 'other'];

let cur = null;   // dicionário da língua atual
let pt = null;    // dicionário de referência
let loaded = '';

export function lang() { return store.get().settings.lang || 'pt'; }

// Carrega a língua (e o português, como reserva) e aplica os textos aos conteúdos.
export async function loadLang(l = lang()) {
  if (!LANGS.includes(l)) l = 'pt';
  if (loaded === l && cur) return;
  pt = pt || (await import('./lang-pt.js')).default;
  cur = l === 'pt' ? pt : (await import(`./lang-${l}.js`)).default;
  loaded = l;
  applyContent(cur, pt);
}

export function t(key, vars) {
  let s = (cur && cur.ui[key]) ?? (pt && pt.ui[key]) ?? key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}
// Os conteúdos já vêm na língua atual; L() fica por compatibilidade.
export const L = x => (Array.isArray(x) ? x[0] : x);
export const unitName = u => (cur && cur.units[u]) || (pt && pt.units[u]) || u;
export const catName = c => (cur && cur.cats[c]) || (pt && pt.cats[c]) || (pt && pt.cats.other) || c;

const LOCALES = { pt: 'pt-PT', fr: 'fr-LU', de: 'de-LU', en: 'en-GB', es: 'es-ES' };
export const locale = () => LOCALES[lang()] || 'pt-PT';
export function fmtNum(n, max = 1) {
  return new Intl.NumberFormat(locale(), { maximumFractionDigits: max }).format(n);
}
export function fmtDate(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso + 'T00:00:00'));
}
