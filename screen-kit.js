import { store, daysUntil, toLitres } from './store.js';
import { t, L, catName, unitName, UNIT_KEYS, CAT_KEYS, fmtNum, fmtDate } from './i18n.js';
import { h, icon, sheet, toast, confirmBox, field, emptyState, fill, add } from './ui.js';
import { KIT } from './content.js';

export function title() { return null; }

const num = v => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };

export function render(root, params) {
  const tab = params[0] === 'inventory' ? 'inventory' : 'checklist';
  const body = h('div');
  add(root, 
    h('div.segmented', { role: 'tablist' },
      h('a', { href: '#/kit', role: 'tab', 'aria-selected': String(tab === 'checklist') }, t('tabChecklist')),
      h('a', { href: '#/kit/inventory', role: 'tab', 'aria-selected': String(tab === 'inventory') }, t('tabInventory'))),
    body);
  return tab === 'inventory' ? inventory(body) : checklist(body);
}

// ——— Lista do kit ———
function checklist(root) {
  const draw = () => {
    const s = store.get();
    const st = s.settings, days = st.goalHours / 24;
    const done = KIT.filter(k => s.kit[k.id]).length;
    const groups = CAT_KEYS.map(c => [c, KIT.filter(k => k.cat === c)]).filter(([, items]) => items.length);
    fill(root, 
      h('div.progress-head',
        h('b', t('kitProgressSub', { done, total: KIT.length })),
        h('div.meter', h('i', { style: { width: (done / KIT.length * 100) + '%' } }))),
      h('p.muted', t('checklistIntro')),
      groups.map(([c, items]) => h('section.block',
        h('h2.block-title', catName(c)),
        h('ul.checks', items.map(k => {
          const q = k.q ? k.q(st.people, days, st) : null;
          return h('li', h('label.check',
            h('input', { type: 'checkbox', checked: !!s.kit[k.id], onchange: e => store.update(x => { if (e.target.checked) x.kit[k.id] = true; else delete x.kit[k.id]; }) }),
            h('span.check-box', icon('check', 16)),
            h('span.check-text', L(k.l)),
            q ? h('span.check-qty', fmtNum(q.n, 0) + (q.u ? ' ' + q.u : '')) : null));
        })))),
      done ? h('button.btn.ghost', { type: 'button', onclick: async () => { if (await confirmBox(t('confirmResetChecklist'), t('resetChecklist'))) store.update(x => { x.kit = {}; }); } }, t('resetChecklist')) : null);
  };
  draw();
  return store.subscribe(draw);
}

// ——— Inventário ———
let filter = 'all';

function itemLine(it) {
  let s = `${fmtNum(it.qty, 2)} ${unitName(it.unit)}`;
  if (it.content) {
    const tot = it.qty * it.content;
    s += ` × ${fmtNum(it.content, 2)} ${it.contentUnit} = ${fmtNum(tot, 2)} ${it.contentUnit}`;
  }
  return s;
}

function inventory(root) {
  const draw = () => {
    const s = store.get();
    const items = s.inventory.filter(it => filter === 'all' || it.category === filter);
    const totalL = s.inventory.filter(i => i.category === 'water').reduce((a, i) => a + toLitres(i), 0);
    const totalK = s.inventory.reduce((a, i) => a + (i.kcal > 0 ? i.qty * i.kcal : 0), 0);
    const used = new Set(s.inventory.map(i => i.category));
    const sorted = [...items].sort((a, b) => {
      const da = daysUntil(a.expiry), db = daysUntil(b.expiry);
      return (da ?? 1e9) - (db ?? 1e9) || a.name.localeCompare(b.name);
    });

    fill(root, 
      h('div.inv-head',
        h('p.muted', s.inventory.length ? t(s.inventory.length === 1 ? 'invSummary1' : 'invSummary', { n: s.inventory.length, l: fmtNum(totalL, 1), k: fmtNum(totalK, 0) }) : ''),
        h('button.btn.primary', { type: 'button', onclick: () => itemForm() }, icon('plus', 18), t('addItem'))),
      s.inventory.length > 0 ? h('div.chips', { role: 'group' },
        ['all', ...CAT_KEYS.filter(c => used.has(c))].map(c =>
          h('button.chip', { type: 'button', 'aria-pressed': String(filter === c), onclick: () => { filter = c; draw(); } }, c === 'all' ? t('filterAll') : catName(c)))) : null,
      s.inventory.length === 0
        ? emptyState(t('invEmpty'), h('button.btn.primary', { type: 'button', onclick: () => itemForm({ category: 'water', unit: 'bottle', contentUnit: 'L', content: 1.5 }) }, icon('plus', 18), t('addItem')))
        : h('ul.inv', sorted.map(it => {
            const d = daysUntil(it.expiry);
            const badge = d === null ? null
              : d < 0 ? h('span.badge.bad', t('expired'))
              : d === 0 ? h('span.badge.warn', t('expiresToday'))
              : d <= 30 ? h('span.badge.warn', t('expiresIn', { n: d }))
              : h('span.badge.ok', t('validUntil', { d: fmtDate(it.expiry) }));
            return h('li.inv-item' + (d !== null && d < 0 ? '.is-expired' : ''),
              h('div.inv-top', h('b', it.name), badge),
              h('p.inv-meta', h('span', catName(it.category)), h('span', itemLine(it)),
                it.kcal ? h('span', fmtNum(it.qty * it.kcal, 0) + ' kcal') : null,
                it.location ? h('span', it.location) : null),
              h('div.inv-actions',
                h('button.btn.small.ghost', { type: 'button', disabled: it.qty <= 0, onclick: () => useOne(it.id) }, t('useOne')),
                h('button.btn.small.ghost', { type: 'button', onclick: () => itemForm(it) }, icon('edit', 16), t('edit')),
                h('button.btn.small.ghost', { type: 'button', onclick: () => remove(it) }, icon('trash', 16), t('delete'))));
          })));
  };
  draw();
  return store.subscribe(draw);
}

function useOne(id) {
  store.update(s => {
    const it = s.inventory.find(i => i.id === id);
    if (it) it.qty = Math.max(0, Math.round((it.qty - 1) * 100) / 100);
  });
}

function remove(it) {
  const idx = store.get().inventory.findIndex(i => i.id === it.id);
  store.update(s => { s.inventory = s.inventory.filter(i => i.id !== it.id); });
  toast(t('deleted') + ': ' + it.name, { label: t('cancel'), fn: () => store.update(s => { s.inventory.splice(Math.max(0, idx), 0, it); }) });
}

function itemForm(existing) {
  const it = { category: 'water', unit: 'bottle', qty: 1, contentUnit: 'L', ...existing };
  const isEdit = !!existing && !!existing.id;
  const opt = (v, label, sel) => h('option', { value: v, selected: v === sel }, label);

  const name = h('input', { type: 'text', maxLength: 80, required: true, value: it.name || '', placeholder: t('itemNamePh'), autocomplete: 'off' });
  const cat = h('select', CAT_KEYS.map(c => opt(c, catName(c), it.category)));
  const qty = h('input', { type: 'text', inputMode: 'decimal', required: true, value: it.qty != null ? String(it.qty) : '1' });
  const unit = h('select', UNIT_KEYS.map(u => opt(u, unitName(u), it.unit)));
  const content = h('input', { type: 'text', inputMode: 'decimal', value: it.content ? String(it.content) : '', placeholder: '1,5' });
  const cunit = h('select', ['L', 'ml', 'kg', 'g'].map(u => opt(u, u, it.contentUnit || 'L')));
  const kcal = h('input', { type: 'text', inputMode: 'numeric', value: it.kcal ? String(it.kcal) : '' });
  const per100 = h('input', { type: 'text', inputMode: 'numeric', placeholder: '350' });
  const expiry = h('input', { type: 'date', value: it.expiry || '' });
  const loc = h('input', { type: 'text', maxLength: 60, value: it.location || '', placeholder: t('locationPh') });
  const total = h('p.form-total');
  const err = h('p.form-error', { role: 'alert' });

  // Calcula kcal por unidade a partir do rótulo (kcal/100 g × peso).
  const calcKcal = () => {
    const p = num(per100.value), c = num(content.value);
    if (p && c) {
      const grams = cunit.value === 'kg' || cunit.value === 'L' ? c * 1000 : c;
      kcal.value = String(Math.round(p * grams / 100));
    }
    refresh();
  };
  const refresh = () => {
    const q = num(qty.value), c = num(content.value);
    const parts = [];
    if (q && c) parts.push(`${t('total')}: ${fmtNum(q * c, 2)} ${cunit.value}`);
    const k = num(kcal.value);
    if (q && k) parts.push(`${fmtNum(q * k, 0)} kcal`);
    total.textContent = parts.join(' · ');
    kcalBox.hidden = cat.value === 'water';
  };
  per100.addEventListener('input', calcKcal);
  [qty, content, kcal].forEach(i => i.addEventListener('input', refresh));
  [cunit, cat].forEach(i => i.addEventListener('change', () => { if (per100.value) calcKcal(); else refresh(); }));

  const kcalBox = h('div.kcal-box',
    h('div.grid2', field(t('per100'), per100), field(t('kcalPer') + ' (' + t('optional') + ')', kcal)),
    h('small.help', t('kcalHelp')));

  const form = h('form.form', { novalidate: true, onsubmit: e => {
    e.preventDefault();
    const q = num(qty.value), c = content.value.trim() ? num(content.value) : null, k = kcal.value.trim() ? num(kcal.value) : null;
    if (!name.value.trim()) { err.textContent = t('itemName') + ' ?'; name.focus(); return; }
    if (q === null || q < 0) { err.textContent = t('quantity') + ' ?'; qty.focus(); return; }
    const data = {
      name: name.value.trim(), category: cat.value, qty: q, unit: unit.value,
      content: c && c > 0 ? c : null, contentUnit: c && c > 0 ? cunit.value : '',
      kcal: k && k > 0 && cat.value !== 'water' ? Math.round(k) : null,
      expiry: expiry.value || '', location: loc.value.trim(),
    };
    store.update(s => {
      if (isEdit) { const i = s.inventory.findIndex(x => x.id === existing.id); if (i >= 0) s.inventory[i] = { ...s.inventory[i], ...data }; }
      else s.inventory.push({ id: store.uid(), ...data });
    });
    sh.close();
    toast(isEdit ? t('saved') : t('itemAdded'));
  } },
    field(t('itemName'), name),
    h('div.grid2', field(t('category'), cat), field(t('quantity'), qty)),
    h('div.grid2', field(t('countUnit'), unit), h('div.field.split',
      h('label', { htmlFor: 'cnt' }, t('contentPer') + ' (' + t('optional') + ')'),
      h('div.join', Object.assign(content, { id: 'cnt' }), cunit))),
    kcalBox,
    h('div.grid2', field(t('expiry') + ' (' + t('optional') + ')', expiry), field(t('location') + ' (' + t('optional') + ')', loc)),
    total, err,
    h('div.row-actions',
      h('button.btn.ghost', { type: 'button', onclick: () => sh.close() }, t('cancel')),
      h('button.btn.primary', { type: 'submit' }, isEdit ? t('save') : t('add'))));

  refresh();
  const sh = sheet(isEdit ? t('editItem') : t('addItem'), form);
  if (!isEdit) setTimeout(() => name.focus(), 50);
}
