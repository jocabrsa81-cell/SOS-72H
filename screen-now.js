// "Estou em emergência": em vez de procurar nos guias, escolhe-se a situação e vai-se direto ao que fazer.
import { t } from './i18n.js';
import { h, icon, toast, add } from './ui.js';
import { GUIDES } from './content.js';
import { regions } from './store.js';
import { smsHref } from './platform.js';
import { savePosition } from './alerts.js';

export function title() { return null; }

// Situações por grupo, pela ordem de urgência. r = só mostra com essa região ativa.
const GROUPS = [
  { key: 'nowPeople', tone: 'red', items: ['cpr', 'recovery', 'bleeding', 'choking', 'stroke', 'poison', 'burn', 'heatstroke', 'hypothermia', 'fracture'] },
  { key: 'nowHome', tone: 'orange', items: ['fire', 'gas', 'blackout', 'nowater', 'flood'] },
  { key: 'nowOutside', tone: 'yellow', items: ['sirens', 'alertspt', 'nuclear', 'chemical', 'wildfire', 'earthquake', 'tsunami', 'storm', 'heatwave', 'evacuate'] },
];

function sendPosition(btn) {
  if (!navigator.geolocation) return toast(t('gpsFail'));
  btn.disabled = true; btn.lastChild.textContent = t('locating');
  navigator.geolocation.getCurrentPosition(p => {
    btn.disabled = false; btn.lastChild.textContent = t('nowSendPosition');
    const { latitude: la, longitude: lo, accuracy } = p.coords;
    savePosition({ lat: la, lon: lo });
    const c = `${la.toFixed(5)}, ${lo.toFixed(5)}`;
    const url = `https://www.openstreetmap.org/?mlat=${la.toFixed(5)}&mlon=${lo.toFixed(5)}#map=17/${la.toFixed(5)}/${lo.toFixed(5)}`;
    location.href = smsHref(t('smsLocation', { c, a: Math.round(accuracy), url }));
  }, e => {
    btn.disabled = false; btn.lastChild.textContent = t('nowSendPosition');
    toast(e.code === 1 ? t('gpsDenied') : t('gpsFail'));
  }, { enableHighAccuracy: true, timeout: 45000, maximumAge: 60000 });
}

export function render(root) {
  const regs = regions();
  const byId = Object.fromEntries(GUIDES.map(g => [g.id, g]));
  const posBtn = h('button.now-action', { type: 'button', onclick: () => sendPosition(posBtn) }, icon('pin', 22), h('span', t('nowSendPosition')));
  add(root,
    h('a.sos-call', { href: 'tel:112' }, icon('phone', 28), h('span', h('b', t('call112')), h('small', t('nowCallFirst')))),
    h('div.now-actions',
      posBtn,
      h('a.now-action', { href: '#/family/cards' }, icon('card', 22), h('span', t('membersTitle'))),
      h('a.now-action', { href: '#/tools' }, icon('torch', 22), h('span', t('nowTorchSos')))),
    h('p.lede', t('nowSub')),
    GROUPS.map(gr => {
      const list = gr.items.map(id => byId[id]).filter(g => g && (!g.r || regs.includes(g.r)));
      return h('section.block',
        h('h2.block-title', t(gr.key)),
        h('div.now-grid', list.map(g => h('a.now-tile.tone-' + gr.tone, { href: '#/guides/' + g.id }, h('span', g.t)))));
    }));
}
