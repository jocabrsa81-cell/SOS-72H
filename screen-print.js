// Plano em papel: uma página A4 com o essencial, para o kit e a carteira.
// Se o telemóvel ficar sem bateria, o plano familiar continua disponível.
import { store, regions } from './store.js';
import { t, fmtDate } from './i18n.js';
import { h, icon, add } from './ui.js';
import { NUMBERS } from './content.js';

export function title() { return null; }

const row = (label, v) => (v ? h('tr', h('th', label), h('td', v)) : null);

export function render(root) {
  const s = store.get();
  const today = new Date().toISOString().slice(0, 10);
  const m = s.meeting;
  const far = s.contacts.filter(c => c.far);
  const empty = !s.contacts.length && !s.members.length && !m.home && !m.area && !m.region;
  const nums = NUMBERS.filter(c => regions().includes(c.r));

  const page = h('article.paper',
    h('header.paper-head',
      h('h1', t('printTitle')),
      h('p', t('printDate', { d: fmtDate(today) }))),

    h('section.paper-first',
      h('h2', t('printFirst')),
      h('ol', ['printStep1', 'printStep2', 'printStep3', 'printStep4'].map(k => h('li', t(k))))),

    s.contacts.length ? h('section',
      h('h2', t('contactsTitle')),
      h('table', s.contacts.map(c => h('tr', h('th', c.name + (c.relation ? ` (${c.relation})` : '')), h('td', c.phone + (c.far ? ` — ${t('outOfRegion')}` : '')))))) : null,

    (m.home || m.area || m.region) ? h('section',
      h('h2', t('meetingTitle')),
      h('table',
        row('1. ' + t('meetHome'), m.home),
        row('2. ' + t('meetArea'), m.area),
        row('3. ' + t('meetRegion'), m.region))) : null,

    s.members.length ? h('section',
      h('h2', t('membersTitle')),
      h('div.paper-cards', s.members.map(p => h('div.paper-card',
        h('h3', p.name),
        h('table',
          row(t('birth'), p.birth ? fmtDate(p.birth) : ''),
          row(t('blood'), p.blood),
          row(t('allergies'), p.allergies),
          row(t('meds'), p.meds),
          row(t('conditions'), p.conditions),
          row(t('doctor'), p.doctor),
          row(t('notes'), p.notes)))))) : null,

    h('section',
      h('h2', t('numbersTitle')),
      h('div.paper-nums', nums.map(c => h('div',
        h('h3', `${c.flag} — ${c.country}`),
        h('table', c.items.map(i => h('tr', h('th', i.d || i.n), h('td', i.l))))))),
      h('p.paper-small', t('numbersNote'))),

    // Cartão de carteira: o mínimo, para recortar
    h('section.wallet',
      h('h2', '✂ ' + t('printWallet')),
      h('div.wallet-card',
        h('p.wallet-title', 'SOS 72H — ' + t('iceHeading')),
        h('p', h('b', '112')),
        s.contacts.slice(0, 3).map(c => h('p', `${c.name}: ${c.phone}`)),
        m.home ? h('p', `1. ${m.home.split('\n')[0]}`) : null,
        m.area ? h('p', `2. ${m.area.split('\n')[0]}`) : null,
        s.members.filter(p => p.blood || p.allergies).slice(0, 3).map(p => h('p', `${p.name}: ${[p.blood, p.allergies].filter(Boolean).join(' · ')}`)))));

  add(root,
    h('div.print-bar.no-print',
      h('p.muted', t('printHint')),
      empty ? h('p.notice.warn', icon('alert', 18), h('span', t('printEmpty'))) : null,
      h('button.btn.primary.block', { type: 'button', onclick: () => window.print() }, icon('download', 18), t('printBtn'))),
    page);
}
