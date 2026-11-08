import { store, autonomy, daysUntil, regions } from './store.js';
import { t, L, fmtNum } from './i18n.js';
import { h, icon, sheet, telHref, fill, add } from './ui.js';
import { NUMBERS, KIT } from './content.js';

export function numbersSheet() {
  const body = h('div.numbers',
    h('p.muted', t('numbersNote')),
    NUMBERS.filter(c => regions().includes(c.r)).map(c => h('section.num-group',
      h('h3', h('span.flag', c.flag), L(c.country)),
      h('ul', c.items.map(it => h('li',
        h('a.num-row', { href: it.sms ? 'sms:' + it.n : telHref(it.n) },
          h('span.num-n', it.d || it.n), h('span.num-l', L(it.l)), icon(it.sms ? 'share' : 'phone', 20))))))),
    h('a.btn.ghost.block', { href: '#/settings', onclick: () => s.close() }, icon('settings', 18), t('numbersMore')));
  const s = sheet(t('numbersTitle'), body);
}

function isFirstMonday(d = new Date()) { return d.getDay() === 1 && d.getDate() <= 7; }

// Régua de 72 traços: cada traço é uma hora do objetivo.
function ruler(hours, goal, label, ic) {
  const ticks = 72;
  const per = goal / ticks;
  const filled = Math.min(ticks, Math.floor(hours / per));
  const row = h('div.ruler-ticks', { role: 'img', 'aria-label': `${label}: ${fmtNum(hours, 0)} / ${goal} h` });
  for (let i = 0; i < ticks; i++) {
    const hourAt = (i + 1) * per;
    row.append(h('i', { class: (i < filled ? 'on' : '') + (hourAt % 24 === 0 ? ' day' : '') }));
  }
  return h('div.ruler',
    h('div.ruler-head', icon(ic, 18), h('span', label), h('b', fmtNum(Math.min(hours, 999), 0) + ' ' + t('hoursShort'))),
    row);
}

function stepper(label, key, min, max) {
  const s = store.get().settings;
  const out = h('output', String(s[key]));
  const set = v => store.update(st => { st.settings[key] = Math.max(min, Math.min(max, v)); });
  return h('div.stepper',
    h('span', label),
    h('button.icon-btn', { type: 'button', 'aria-label': '−', onclick: () => set(store.get().settings[key] - 1) }, icon('minus', 18)),
    out,
    h('button.icon-btn', { type: 'button', 'aria-label': '+', onclick: () => set(store.get().settings[key] + 1) }, icon('plus', 18)));
}

export function render(root) {
  const draw = () => {
    const s = store.get();
    const a = autonomy(s);
    const goal = a.goal;
    const has = s.inventory.length > 0;
    const pct = Math.min(1, a.hours / goal);
    const status = a.hours >= goal ? 'ok' : a.hours >= goal / 3 ? 'mid' : 'low';

    const notes = [];
    if (a.waterNoVol) notes.push(t('waterNoVolume', { n: a.waterNoVol }));
    if (a.foodNoKcal) notes.push(t('foodNoKcal', { n: a.foodNoKcal }));
    if (a.expired) notes.push(t('expiredExcluded', { n: a.expired }));

    const missing = [];
    if (a.missingL > 0) missing.push(t('missingWater', { n: fmtNum(Math.ceil(a.missingL), 0) }));
    if (a.missingKcal > 0) missing.push(t('missingFood', { n: fmtNum(Math.ceil(a.missingKcal / 100) * 100, 0) }));

    const gauge = h('section.gauge.' + status,
      h('div.gauge-top',
        h('div',
          h('h2', t('autonomyTitle')),
          h('p.muted', t('autonomyGoal').replace('72', String(goal)))),
        h('div.gauge-read', { style: { '--p': pct } },
          h('strong', fmtNum(Math.min(a.hours, 999), 0)),
          h('span', '/ ' + goal + ' ' + t('hoursShort')))),
      ruler(a.waterH, goal, t('water'), 'water'),
      ruler(a.foodH, goal, t('food'), 'food'),
      h('div.ruler-days', Array.from({ length: Math.max(1, Math.round(goal / 24)) }, (_, i) => h('span', t('dayN', { n: i + 1 })))),
      has
        ? h('div.gauge-status',
            h('p.gauge-verdict', a.hours >= goal ? t('goalReached') : t('limitedBy', { what: t(a.limit).toLowerCase() })),
            missing.length ? h('p', missing.join(' · ')) : null,
            notes.length ? h('ul.gauge-notes', notes.map(n => h('li', n))) : null)
        : h('p.gauge-empty', t('emptyAutonomy')),
      h('div.gauge-house', stepper(t('people'), 'people', 1, 30), stepper(t('pets'), 'pets', 0, 20)),
      h('a.btn.ghost.block', { href: '#/kit/inventory' }, icon('kit', 18), t('openInventory')));

    // Artigos fora de validade ou perto disso
    const soon = s.inventory
      .map(it => ({ it, d: daysUntil(it.expiry) }))
      .filter(x => x.d !== null && x.d <= 30)
      .sort((x, y) => x.d - y.d);
    const attention = soon.length ? h('section.block',
      h('h2.block-title', icon('alert', 20), t('attention')),
      h('ul.list', soon.slice(0, 5).map(({ it, d }) => h('li',
        h('a.list-row', { href: '#/kit/inventory' },
          h('span', it.name),
          h('span.badge.' + (d < 0 ? 'bad' : 'warn'), d < 0 ? t('expired') : d === 0 ? t('expiresToday') : t('expiresIn', { n: d }))))))) : null;

    const done = KIT.filter(k => s.kit[k.id]).length;
    const kitRow = h('a.kit-row', { href: '#/kit' },
      h('div', h('b', t('kitProgress')), h('span.muted', t('kitProgressSub', { done, total: KIT.length }))),
      h('div.meter', h('i', { style: { width: (done / KIT.length * 100) + '%' } })),
      icon('chevron', 20));

    fill(root, 
      isFirstMonday() && regions().includes('lu') ? h('p.notice', icon('siren', 18), t('sirenTestToday')) : null,
      h('section.sos',
        h('a.sos-call', { href: 'tel:112' }, icon('phone', 28), h('span', h('b', t('call112')), h('small', t('call112Sub')))),
        h('button.sos-more', { type: 'button', onclick: numbersSheet }, t('otherNumbers'))),
      gauge,
      attention,
      kitRow,
      h('nav.quick',
        h('a.quick-item', { href: '#/docs' }, icon('lock'), h('span', t('documents'))),
        h('a.quick-item', { href: '#/family/cards' }, icon('card'), h('span', t('membersTitle'))),
        h('a.quick-item', { href: '#/tools' }, icon('torch'), h('span', t('torch')))),
      regions().includes('lu') ? h('p.foot', icon('siren', 16), t('sirenTest')) : null);
  };
  draw();
  return store.subscribe(draw);
}
