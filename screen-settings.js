import { store } from './store.js';
import { t, L, LANGS, LANG_NAMES } from './i18n.js';
import { REGIONS } from './content.js';
import { h, icon, toast, confirmBox, field, fill, add } from './ui.js';

export function title() { return null; }

const VERSION = '1.3.0';

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

  const exportData = async () => {
    const text = store.exportJSON();
    const fname = `sos72h-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([text], fname, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'SOS 72H' }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = h('a', { href: URL.createObjectURL(file), download: fname });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const install = window.__installPrompt
    ? h('button.btn.primary.block', { type: 'button', onclick: async () => { const p = window.__installPrompt; window.__installPrompt = null; p.prompt(); await p.userChoice; } }, icon('download', 18), t('install'))
    : null;

  add(root, 
    h('section.block', h('h2.block-title', t('language')), langs),
    h('section.block', h('h2.block-title', t('regions')), h('p.muted', t('regionsHelp')), regionChips),
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
