import { store } from './store.js';
import { VERSION } from './version.js';
import { exportBackup, isProtected, protectStorage, daysSinceBackup } from './backup.js';
import { t, L, LANGS, LANG_NAMES } from './i18n.js';
import { REGIONS } from './content.js';
import { isIOS, isStandalone } from './platform.js';
import { COUNTRIES, WEATHER_MIN_DEFAULT } from './alerts.js';
import { h, icon, toast, confirmBox, field, fill, add } from './ui.js';

export function title() { return null; }


// Nível mínimo dos avisos de tempo, por país das regiões escolhidas.
function weatherMin() {
  const box = h('div.levels');
  const draw = () => {
    const st = store.get().settings;
    const regs = st.regions && st.regions.length ? st.regions : ['lu', 'pt'];
    const cur = { ...WEATHER_MIN_DEFAULT, ...(st.weatherMin || {}) };
    fill(box, regs.flatMap(r => COUNTRIES[r] || []).map(c => {
      const sel = h('select', { 'aria-label': t('ctry' + c) }, ['yellow', 'orange', 'red'].map(l =>
        h('option', { value: l, selected: cur[c] === l }, t('lvl' + l[0].toUpperCase() + l.slice(1)))));
      sel.addEventListener('change', () => { store.update(x => { x.settings.weatherMin = { ...cur, ...(x.settings.weatherMin || {}), [c]: sel.value }; }); toast(t('saved')); });
      return h('label.level-row', h('span.flag', c), h('span.level-name', t('ctry' + c)), sel);
    }));
  };
  draw();
  // Se as regiões mudarem, a lista de países muda também.
  let last = JSON.stringify(store.get().settings.regions);
  store.subscribe(s => { const now = JSON.stringify(s.settings.regions); if (now !== last) { last = now; draw(); } });
  return h('section.block', { id: 'weather-levels' }, h('h2.block-title', t('weatherMinTitle')), h('p.muted', t('weatherMinHelp')), box);
}

export function render(root) {
  const s = store.get().settings;

  const langs = h('div.chips.lang-chips', LANGS.map(l =>
    h('button.chip', { type: 'button', lang: l, 'aria-pressed': String(s.lang === l), onclick: () => store.update(x => { x.settings.lang = l; }) }, LANG_NAMES[l])));

  const regionChips = h('div.chips.region-chips', Object.keys(REGIONS).map(r =>
    h('button.chip', { type: 'button', 'aria-pressed': String((s.regions || ['lu', 'pt']).includes(r)), onclick: e => {
      const cur = store.get().settings.regions || ['lu', 'pt'];
      const next = cur.includes(r) ? cur.filter(x => x !== r) : [...cur, r];
      if (!next.length) return toast(t('regionsMin'));
      store.update(x => { x.settings.regions = next; });
      e.currentTarget.setAttribute('aria-pressed', String(next.includes(r)));
    } }, L(REGIONS[r]))));

  const themes = h('div.chips', ['auto', 'light', 'dark'].map(th =>
    h('button.chip', { type: 'button', 'aria-pressed': String(s.theme === th), onclick: e => {
      store.update(x => { x.settings.theme = th; });
      e.target.parentNode.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.target)));
    } }, t('theme' + th[0].toUpperCase() + th.slice(1)))));

  const numField = (key, label, min, max, step, help) => {
    const inp = h('input', { type: 'number', min, max, step, value: s[key], inputMode: 'decimal' });
    inp.addEventListener('change', () => {
      const v = parseFloat(String(inp.value).replace(',', '.'));
      if (!Number.isFinite(v) || v < min || v > max) { inp.value = store.get().settings[key]; return; }
      store.update(x => { x.settings[key] = v; });
      toast(t('saved'));
    });
    return field(label, inp, help);
  };

  const fileIn = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files[0]; fileIn.value = '';
    if (!f) return;
    try {
      const text = await f.text();
      JSON.parse(text);
      if (!(await confirmBox(t('importConfirm'), t('importData'), false))) return;
      store.importJSON(text);
      toast(t('importOk'));
      location.hash = '#/home';
    } catch (e) { toast(t('importFail')); }
  });

  const exportData = async () => { if (await exportBackup()) { toast(t('backupDone')); drawProt(); } };

  // Estado: armazenamento protegido e data da última cópia
  const prot = h('div.prot');
  const drawProt = async () => {
    const p = await isProtected();
    const d = daysSinceBackup();
    fill(prot,
      h('p', icon(p ? 'check' : 'alert', 16), h('span', p ? t('storageProtected') : p === false ? t('storageNotProtected') : t('storageUnknown')),
        p === false ? h('button.btn.small.ghost', { type: 'button', onclick: async () => { await protectStorage(); drawProt(); } }, t('storageProtect')) : null),
      h('p', icon(d !== null && d < 30 ? 'check' : 'alert', 16), h('span', d === null ? t('backupNever') : t('backupDaysAgo', { n: d }))));
  };
  drawProt();

  const install = window.__installPrompt
    ? h('button.btn.primary.block', { type: 'button', onclick: async () => { const p = window.__installPrompt; window.__installPrompt = null; p.prompt(); await p.userChoice; } }, icon('download', 18), t('install'))
    : !isStandalone() ? h('section.block', h('h2.block-title', icon('download', 20), t('install')), h('p.muted', isIOS ? t('installIOS') : t('installAndroid')))
    : null;

  add(root, 
    h('section.block', h('h2.block-title', t('language')), langs),
    h('section.block', h('h2.block-title', t('regions')), h('p.muted', t('regionsHelp')), regionChips),
    weatherMin(),
    h('section.block', h('h2.block-title', t('theme')), themes),
    h('section.block',
      h('h2.block-title', t('needsTitle')),
      h('div.grid2',
        numField('people', t('people'), 1, 30, 1),
        numField('pets', t('pets'), 0, 20, 1)),
      numField('waterPerPerson', t('waterPerPerson'), 1, 10, 0.5, t('waterPerPersonHelp')),
      h('div.grid2',
        numField('waterPerPet', t('waterPerPet'), 0, 10, 0.5),
        numField('kcalPerPerson', t('kcalPerPerson'), 1000, 4000, 100)),
      numField('goalHours', t('goalHours'), 24, 336, 24)),
    h('section.block',
      h('h2.block-title', t('backupTitle')),
      h('p.muted', t('backupIntro')),
      prot,
      h('a.btn.ghost', { href: '#/print' }, icon('doc', 18), t('printPlan')),
      h('div.inline-actions',
        h('button.btn.ghost', { type: 'button', onclick: exportData }, icon('download', 18), t('exportData')),
        h('button.btn.ghost', { type: 'button', onclick: () => fileIn.click() }, icon('upload', 18), t('importData'))),
      fileIn),
    install,
    h('section.block',
      h('h2.block-title', t('aboutTitle')),
      h('p.muted', `SOS 72H ${VERSION}. ${t('aboutText')}`),
      h('button.btn.danger.ghost', { type: 'button', onclick: async () => {
        if (await confirmBox(t('resetAllConfirm'), t('resetAll'))) { store.reset(); toast(t('deleted')); location.hash = '#/home'; }
      } }, icon('trash', 18), t('resetAll'))));
}
