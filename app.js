// Arranque e navegação entre ecrãs (hash: #/kit, #/guides/cpr, ...).
import { store } from './store.js';
import { t, lang } from './i18n.js';
import { h, icon, toast, fill, add } from './ui.js';
import * as home from './screen-home.js';
import * as kit from './screen-kit.js';
import * as family from './screen-family.js';
import * as guides from './screen-guides.js';
import * as tools from './screen-tools.js';
import * as vault from './screen-vault.js';
import * as settings from './screen-settings.js';

const ROUTES = {
  home: { mod: home, tab: 'home' },
  kit: { mod: kit, tab: 'kit', title: 'kitTitle' },
  family: { mod: family, tab: 'family', title: 'familyTitle' },
  guides: { mod: guides, tab: 'guides', title: 'guidesTitle' },
  tools: { mod: tools, tab: 'tools', title: 'toolsTitle' },
  docs: { mod: vault, tab: null, title: 'vaultTitle', back: true },
  settings: { mod: settings, tab: null, title: 'settings', back: true },
};
const TABS = [
  ['home', 'home', 'navHome'], ['kit', 'kit', 'navKit'], ['family', 'family', 'navFamily'],
  ['guides', 'guides', 'navGuides'], ['tools', 'tools', 'navTools'],
];

const view = document.getElementById('view');
let cleanup = null;
let current = '';

function parse() {
  const parts = (location.hash.replace(/^#\/?/, '') || 'home').split('/');
  return { name: ROUTES[parts[0]] ? parts[0] : 'home', params: parts.slice(1) };
}

function chrome(route, name, params) {
  const sub = route.mod.title ? route.mod.title(params) : null;
  const titleKey = sub || route.title;
  const isSub = route.back || (params.length > 0 && sub);
  document.getElementById('title').textContent = typeof titleKey === 'object' ? titleKey.text : titleKey ? t(titleKey) : '';
  document.getElementById('appbar').classList.toggle('is-home', name === 'home');
  const back = document.getElementById('back');
  back.hidden = !isSub;
  fill(back, icon('back'), h('span.sr', t('back')));
  back.onclick = () => { if (history.length > 1) history.back(); else location.hash = '#/home'; };
  const s = document.getElementById('settings-link');
  fill(s, icon('settings'));
  s.setAttribute('aria-label', t('settings'));
  s.hidden = name === 'settings';

  const bar = document.getElementById('tabbar');
  fill(bar, ...TABS.map(([id, ic, label]) =>
    h('a', { href: '#/' + id, 'aria-current': route.tab === id ? 'page' : null }, icon(ic, 24), h('span', t(label)))));
}

function render(force) {
  const { name, params } = parse();
  const key = name + '/' + params.join('/');
  if (key === current && !force) return;
  const scrollTop = force ? window.scrollY : 0;
  current = key;
  if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
  // Ao mudar de ecrã (incluindo o botão "voltar" do Android), fecha folhas abertas.
  if (!force) document.querySelectorAll('dialog[open]').forEach(d => d.close());
  const route = ROUTES[name];
  chrome(route, name, params);
  fill(view, );
  cleanup = route.mod.render(view, params) || null;
  window.scrollTo(0, scrollTop);
  if (!force) view.focus({ preventScroll: true });
}

function applyLang() {
  document.documentElement.lang = { pt: 'pt-PT', fr: 'fr', de: 'de', en: 'en', es: 'es' }[lang()];
}
function applyTheme() {
  const th = store.get().settings.theme;
  if (th === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = th;
}

function netState() {
  const el = document.getElementById('netstate');
  el.hidden = navigator.onLine;
  el.textContent = t('offline');
}

// Idioma e tema mudam tudo — redesenha o ecrã atual mantendo a posição.
let lastLang = lang(), lastTheme = store.get().settings.theme;
store.subscribe(s => {
  if (s.settings.lang !== lastLang) { lastLang = s.settings.lang; applyLang(); netState(); render(true); }
  if (s.settings.theme !== lastTheme) { lastTheme = s.settings.theme; applyTheme(); }
});

window.addEventListener('hashchange', () => render());
window.addEventListener('online', netState);
window.addEventListener('offline', netState);
applyLang(); applyTheme(); netState(); render();

// Funcionamento offline
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !window.Capacitor) {
  navigator.serviceWorker.register('./sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw && nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          toast(t('updateReady'), { label: t('reload'), fn: () => nw.postMessage('skipWaiting') });
        }
      });
    });
  }).catch(() => {});
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; location.reload(); } });
}

// Instalação como app (Android/Chrome)
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__installPrompt = e; });
