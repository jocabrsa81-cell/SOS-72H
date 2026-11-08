import { store } from './store.js';
import { t } from './i18n.js';
import { h, icon, toast, fill, add } from './ui.js';
import { checkAlerts, lastResult, lastPosition, SOURCES, when, groupWeather } from './alerts.js';

export function title() { return null; }

// Zonas: mostra as primeiras 4; o resto abre com um toque.
function zoneList(zones) {
  if (zones.length <= 5) return h('p.alert-zones', zones.join(', '));
  return h('details.alert-zones', h('summary', zones.slice(0, 4).join(', ') + ' ' + t('alertsMoreZones', { n: zones.length - 4 })), h('p', zones.join(', ')));
}

function item(it) {
  const meta = [];
  if (it.kind === 'quake') {
    if (it.km != null) meta.push(t('alertsKm', { n: it.km }));
    if (it.depth != null) meta.push(t('alertsDepth', { n: Math.round(it.depth) }));
    meta.push(when(it.start));
  } else {
    if (it.zones && it.zones.length > 1) meta.push(t('alertsZones', { n: it.zones.length }) + (it.country ? ` (${it.country})` : ''));
    else if (it.area) meta.push(it.area + (it.country && it.source === 'meteoalarm' ? ` (${it.country})` : ''));
    if (it.start) meta.push(when(it.start) + (it.end ? ' – ' + when(it.end) : ''));
    else if (it.end) meta.push(t('alertsUntil', { t: when(it.end) }));
  }
  return h('li.alert.lvl-' + it.level,
    h('div.alert-top', h('b', it.title), h('span.alert-src', SOURCES[it.source]?.name || it.source)),
    it.kind === 'quake' ? h('p.alert-area', it.area) : null,
    h('p.alert-meta', meta.join(' · ')),
    it.tsunami ? h('p.alert-tsunami', icon('water', 16), t('alertsTsunami')) : null,
    it.zones && it.zones.length > 1 ? zoneList(it.zones) : null,
    it.text ? h('p.alert-text', it.text) : null,
    it.url ? h('a.alert-link', { href: it.url, target: '_blank', rel: 'noopener' }, t('alertsSource')) : null);
}

export function render(root) {
  const box = h('div.alert-box');
  const btn = h('button.btn.primary', { type: 'button' }, icon('siren', 18), h('span', t('alertsCheckNow')));
  const s = store.get().settings;

  const draw = r => {
    if (!r) return fill(box, h('p.muted', t('alertsNever')));
    const items = r.items || [];
    const sec = (label, list, none) => h('section.block',
      h('h2.block-title', label),
      list.length ? h('ul.alerts', list.map(item)) : h('p.muted', none));
    const status = Object.entries(SOURCES).map(([k, src]) => {
      const st = (r.sources || {})[k];
      return h('a.src-chip' + (st && st.ok ? '.ok' : '.bad'), { href: src.url, target: '_blank', rel: 'noopener' },
        st && st.ok ? icon('check', 14) : '✕', ' ', src.name, st && !st.ok ? h('small', ' ' + t('alertsSourceFail')) : st && st.stale ? h('small', ' ' + when(st.checked)) : null);
    });
    fill(box,
      h('div.alert-status',
        h('p', h('b', t('alertsLastCheck', { t: when(r.checked) }))),
        r.server ? h('p.muted', t('alertsServer', { t: when(r.server) })) : null,
        r.failedAt ? h('p.notice.warn', icon('alert', 18), r.offline ? t('alertsOffline') : t('alertsFailed', { t: when(r.failedAt) })) : null,
        h('div.src-chips', h('span.muted', t('alertsSources') + ':'), status)),
      sec(t('alertsWeather'), groupWeather(items), t('alertsNoneWeather')),
      sec(t('alertsQuakes'), items.filter(i => i.kind === 'quake'), t('alertsNoneQuakes')),
      sec(t('alertsDisasters'), items.filter(i => i.kind === 'disaster'), t('alertsNoneDisasters')),
      h('p.foot', t('alertsNotTranslated')));
  };

  const run = async () => {
    btn.disabled = true; btn.lastChild.textContent = t('alertsChecking');
    const r = await checkAlerts(lastPosition());
    btn.disabled = false; btn.lastChild.textContent = t('alertsCheckNow');
    draw(r);
  };
  btn.addEventListener('click', run);

  // Interruptores
  const sw = (key, label, onOn) => {
    const inp = h('input', { type: 'checkbox', checked: key === 'alertsAuto' ? s[key] !== false : !!s[key] });
    inp.addEventListener('change', async () => {
      if (inp.checked && onOn && !(await onOn())) { inp.checked = false; return; }
      store.update(x => { x.settings[key] = inp.checked; });
    });
    return h('label.check.plain', inp, h('span.check-box', icon('check', 16)), h('span.check-text', label));
  };
  const askNotify = async () => {
    if (!('Notification' in window)) { toast(t('alertsNotifyDenied')); return false; }
    const p = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (p !== 'granted') { toast(t('alertsNotifyDenied')); return false; }
    return true;
  };

  add(root,
    h('p.notice.warn', icon('alert', 18), h('span', t('alertsDisclaimer'))),
    h('div.inline-actions', btn),
    box,
    h('section.block',
      sw('alertsAuto', t('alertsAuto')),
      sw('alertsNotify', t('alertsNotify'), askNotify),
      h('a.alert-link', { href: '#/settings' }, t('alertsLevelsLink')),
      h('p.muted', t('alertsBackground'))));

  draw(lastResult());
  const prev = lastResult();
  if (navigator.onLine && (!prev || Date.now() - Date.parse(prev.checked) > 2 * 60e3)) run();
}
