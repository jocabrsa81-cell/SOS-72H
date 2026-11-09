import { store, autonomy, daysUntil, regions, kitDone } from './store.js';
import { t, L, fmtNum } from './i18n.js';
import { h, icon, sheet, telHref, fill, add, toast } from './ui.js';
import { NUMBERS, KIT } from './content.js';
import { isIOS, isStandalone } from './platform.js';
import { lastResult, topLevel, when, countAlerts } from './alerts.js';
import { needsBackupReminder, daysSinceBackup, exportBackup, snoozeBackup } from './backup.js';

const HINT_KEY = 'sos72h.iosHintClosed';
const hintClosed = () => { try { return localStorage.getItem(HINT_KEY) === '1'; } catch (e) { return true; } };

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

    // Cartão de alertas (resumo da última verificação)
    const ar = lastResult();
    const nAlerts = ar ? countAlerts(ar.items || []) : 0;
    const alertCard = h('a.alert-card.lvl-' + (nAlerts ? topLevel(ar.items) : 'none'), { href: '#/alerts' },
      icon('siren', 22),
      h('div', h('b', !ar ? t('alertsTitle') : nAlerts ? t('alertsSummary', { n: nAlerts }) : t('alertsSummaryNone'), ' ', h('span.badge.info', t('extraBadge'))),
        h('span.muted', ar ? t('alertsLastCheck', { t: when(ar.checked) }) : t('alertsNever'))),
      icon('chevron', 20));

    const done = KIT.filter(k => kitDone(k.id, s)).length;
    const kitRow = h('a.kit-row', { href: '#/kit' },
      h('div', h('b', t('kitProgress')), h('span.muted', t('kitProgressSub', { done, total: KIT.length }))),
      h('div.meter', h('i', { style: { width: (done / KIT.length * 100) + '%' } })),
      icon('chevron', 20));

    fill(root, 
      // iPhone no Safari: lembra que tem de ser adicionada ao ecrã principal para funcionar offline.
      isIOS && !isStandalone() && !hintClosed() ? h('div.notice.install-hint', icon('download', 18), h('span', t('installIOS')),
        h('button.icon-btn', { type: 'button', 'aria-label': t('close'), onclick: e => { try { localStorage.setItem(HINT_KEY, '1'); } catch (er) {} e.currentTarget.parentNode.remove(); } }, '×')) : null,
      isFirstMonday() && regions().includes('lu') ? h('p.notice', icon('siren', 18), t('sirenTestToday')) : null,
      h('a.now-button', { href: '#/now' }, icon('siren', 30), h('span', h('b', t('nowButton')), h('small', t('nowButtonSub'))), icon('chevron', 22)),
      h('section.sos',
        h('a.sos-call', { href: 'tel:112' }, icon('phone', 28), h('span', h('b', t('call112')), h('small', t('call112Sub')))),
        h('button.sos-more', { type: 'button', onclick: numbersSheet }, t('otherNumbers'))),
      needsBackupReminder() ? h('div.notice.warn.backup-hint', icon('download', 18),
        h('div', h('b', daysSinceBackup() === null ? t('backupNever') : t('backupDaysAgo', { n: daysSinceBackup() })), h('p', t('backupReminder')),
          h('div.inline-actions',
            h('button.btn.small.primary', { type: 'button', onclick: async () => { if (await exportBackup()) toast(t('backupDone')); } }, t('exportData')),
            h('button.btn.small.ghost', { type: 'button', onclick: () => snoozeBackup(7) }, t('backupLater'))))) : null,
      gauge,
      alertCard,
      attention,
      kitRow,
      h('nav.quick',
        h('a.quick-item', { href: '#/docs' }, icon('lock'), h('span', t('documents'))),
        h('a.quick-item', { href: '#/family/cards' }, icon('card'), h('span', t('membersTitle'))),
        h('a.quick-item', { href: '#/phone' }, icon('screen'), h('span', t('phoneTitle')))),
      regions().includes('lu') ? h('p.foot', icon('siren', 16), t('sirenTest')) : null);
  };
  draw();
  const off = store.subscribe(draw);
  window.addEventListener('sos72h:alerts', draw);
  return () => { off(); window.removeEventListener('sos72h:alerts', draw); };
}
