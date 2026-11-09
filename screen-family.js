import { store } from './store.js';
import { omPoint, omSearch, parseCoords, kml, saveFile, launch } from './maps.js';
import { smsHref } from './platform.js';
import { pickOnMap } from './picker.js';
import { t, fmtDate } from './i18n.js';
import { h, icon, sheet, toast, confirmBox, field, emptyState, telHref, fill, add } from './ui.js';

export function title() { return null; }

export function render(root, params) {
  const contactsBox = h('div'), membersBox = h('div');
  const drawContacts = () => {
    const s = store.get();
    fill(contactsBox, s.contacts.length
      ? h('ul.people', s.contacts.map(c => h('li.person',
          h('div.person-main',
            h('b', c.name, c.far ? h('span.badge.info', t('outOfRegion')) : null),
            h('span.muted', [c.relation, c.phone].filter(Boolean).join(' · '))),
          c.phone ? h('a.icon-btn.call', { href: telHref(c.phone), 'aria-label': t('call') + ' ' + c.name }, icon('phone', 20)) : null,
          h('button.icon-btn', { type: 'button', 'aria-label': t('edit'), onclick: () => contactForm(c) }, icon('edit', 18)))))
      : emptyState(t('noContacts')));
  };
  const drawMembers = () => {
    const s = store.get();
    fill(membersBox, s.members.length
      ? h('ul.people', s.members.map(m => h('li.person',
          h('div.person-main', h('b', m.name), h('span.muted', [m.blood, m.allergies].filter(Boolean).join(' · '))),
          h('button.btn.small.primary', { type: 'button', onclick: () => showCard(m) }, icon('card', 16), t('showCard')),
          h('button.icon-btn', { type: 'button', 'aria-label': t('edit'), onclick: () => memberForm(m) }, icon('edit', 18)))))
      : emptyState(t('noMembers')));
  };

  // Pontos de encontro: guardam sozinhos enquanto se escreve.
  const meet = (key, label, ph) => {
    const ta = h('textarea', { rows: 2, maxLength: 300, placeholder: ph, value: store.get().meeting[key] || '' });
    let timer;
    ta.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => store.update(s => { s.meeting[key] = ta.value; }), 400); });
    ta.addEventListener('blur', () => { clearTimeout(timer); store.update(s => { s.meeting[key] = ta.value; }); });
    const locBtn = h('button.btn.small.ghost', { type: 'button', onclick: () => {
      if (!navigator.geolocation) return toast(t('gpsFail'));
      locBtn.disabled = true; locBtn.lastChild.textContent = t('locating');
      navigator.geolocation.getCurrentPosition(p => {
        const c = `${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}`;
        ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + c;
        store.update(s => { s.meeting[key] = ta.value; });
        locBtn.disabled = false; locBtn.lastChild.textContent = t('useMyLocation');
      }, e => { toast(e.code === 1 ? t('gpsDenied') : t('gpsFail')); locBtn.disabled = false; locBtn.lastChild.textContent = t('useMyLocation'); },
      { enableHighAccuracy: true, timeout: 30000 });
    } }, icon('pin', 16), h('span', t('useMyLocation')));
    // Abre no Organic Maps (coordenadas → ponto; texto → pesquisa) ou noutra app de mapas.
    const omBtn = h('button.btn.small.ghost', { type: 'button', onclick: () => {
      const v = ta.value.trim(); if (!v) return;
      const c = parseCoords(v);
      launch(c ? omPoint({ ...c, name: label }) : omSearch(v.split('\n')[0]));
    } }, icon('compass', 16), t('omOpen'));
    // Escolher no mapa: substitui (ou acrescenta) a linha de coordenadas, mantendo o texto.
    const pickBtn = h('button.btn.small.ghost', { type: 'button', onclick: async () => {
      const c = await pickOnMap(parseCoords(ta.value));
      if (!c) return;
      const text = ta.value.split('\n').filter(l => !parseCoords(l)).join('\n').trim();
      ta.value = (text ? text + '\n' : '') + `${c.lat.toFixed(5)}, ${c.lon.toFixed(5)}`;
      store.update(x => { x.meeting[key] = ta.value; });
      toast(t('saved'));
    } }, icon('pin', 16), t('pickOnMap'));
    return h('div.field', h('label', label), ta, h('div.inline-actions', locBtn, pickBtn, omBtn));
  };

  // Pontos de encontro com coordenadas, para o mapa e para o ficheiro KML.
  const meetPoints = () => {
    const m = store.get().meeting;
    return [['home', 'meetHome'], ['area', 'meetArea'], ['region', 'meetRegion']]
      .map(([k, lk]) => { const c = parseCoords(m[k]); return c ? { ...c, name: t(lk), desc: (m[k] || '').replace(/\n/g, ' ') } : null; })
      .filter(Boolean);
  };
  const mapActions = h('div.inline-actions',
    h('button.btn.small.ghost', { type: 'button', onclick: () => {
      const pts = meetPoints(); if (!pts.length) return toast(t('omNoCoords'));
      saveFile(kml('SOS 72H — ' + t('meetingTitle'), pts), 'sos72h-pontos.kml', 'application/vnd.google-earth.kml+xml');
    } }, icon('download', 16), t('omExport')));

  add(root, 
    h('a.print-link', { href: '#/print' }, icon('doc', 22), h('span', h('b', t('printPlan')), h('small', t('printPlanSub'))), icon('chevron', 20)),
    h('section.block',
      h('div.block-head', h('h2.block-title', icon('phone', 20), t('contactsTitle')),
        h('button.btn.small.primary', { type: 'button', onclick: () => contactForm() }, icon('plus', 16), t('add'))),
      h('p.muted', t('contactsIntro')),
      contactsBox),
    h('section.block',
      h('h2.block-title', icon('pin', 20), t('meetingTitle')),
      h('p.muted', t('meetingIntro')),
      h('small.help', t('pickFromOm')),
      meet('home', t('meetHome'), t('meetHomePh')),
      meet('area', t('meetArea'), t('meetAreaPh')),
      meet('region', t('meetRegion'), t('meetRegionPh')),
      mapActions,
      h('small.help', t('omExportHelp'))),
    h('section.block', { id: 'cards' },
      h('div.block-head', h('h2.block-title', icon('card', 20), t('membersTitle')),
        h('button.btn.small.primary', { type: 'button', onclick: () => memberForm() }, icon('plus', 16), t('add'))),
      h('p.muted', t('membersIntro')),
      membersBox),
    h('button.btn.ghost.block', { type: 'button', onclick: sharePlan }, icon('share', 18), t('shareplan')));

  drawContacts(); drawMembers();
  if (params[0] === 'cards') requestAnimationFrame(() => document.getElementById('cards')?.scrollIntoView());
  const off = store.subscribe(() => { drawContacts(); drawMembers(); });
  return off;
}

function planText() {
  const s = store.get();
  const lines = [t('planText'), ''];
  if (s.contacts.length) { lines.push(t('contactsTitle') + ':'); s.contacts.forEach(c => lines.push(`- ${c.name}${c.relation ? ' (' + c.relation + ')' : ''}: ${c.phone}`)); lines.push(''); }
  const m = s.meeting;
  if (m.home || m.area || m.region) {
    lines.push(t('meetingTitle') + ':');
    if (m.home) lines.push(`1. ${t('meetHome')}: ${m.home.replace(/\n/g, ' ')}`);
    if (m.area) lines.push(`2. ${t('meetArea')}: ${m.area.replace(/\n/g, ' ')}`);
    if (m.region) lines.push(`3. ${t('meetRegion')}: ${m.region.replace(/\n/g, ' ')}`);
  }
  lines.push('', 'Emergência / Emergencia / Urgence / Notruf: 112');
  return lines.join('\n');
}

async function sharePlan() {
  const text = planText();
  if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  location.href = smsHref(text);
}

function contactForm(existing) {
  const c = { far: false, ...existing };
  const name = h('input', { type: 'text', maxLength: 60, required: true, value: c.name || '', autocomplete: 'name' });
  const rel = h('input', { type: 'text', maxLength: 40, value: c.relation || '', placeholder: t('relationPh') });
  const phone = h('input', { type: 'tel', maxLength: 30, value: c.phone || '', placeholder: '+352 …', autocomplete: 'tel' });
  const far = h('input', { type: 'checkbox', checked: !!c.far });
  const err = h('p.form-error', { role: 'alert' });
  const form = h('form.form', { novalidate: true, onsubmit: e => {
    e.preventDefault();
    if (!name.value.trim()) { err.textContent = t('name') + ' ?'; return name.focus(); }
    if (!phone.value.replace(/\D/g, '')) { err.textContent = t('phone') + ' ?'; return phone.focus(); }
    const data = { name: name.value.trim(), relation: rel.value.trim(), phone: phone.value.trim(), far: far.checked };
    store.update(s => {
      if (c.id) { const i = s.contacts.findIndex(x => x.id === c.id); if (i >= 0) s.contacts[i] = { ...s.contacts[i], ...data }; }
      else s.contacts.push({ id: store.uid(), ...data });
    });
    sh.close(); toast(t('saved'));
  } },
    field(t('name'), name), field(t('relation') + ' (' + t('optional') + ')', rel), field(t('phone'), phone),
    h('label.check.plain', far, h('span.check-box', icon('check', 16)), h('span.check-text', t('outOfRegion'))),
    err,
    h('div.row-actions',
      c.id ? h('button.btn.danger.ghost', { type: 'button', onclick: async () => { if (await confirmBox(t('confirmDelete', { name: c.name }))) { store.update(s => { s.contacts = s.contacts.filter(x => x.id !== c.id); }); sh.close(); } } }, icon('trash', 16)) : null,
      h('button.btn.ghost', { type: 'button', onclick: () => sh.close() }, t('cancel')),
      h('button.btn.primary', { type: 'submit' }, t('save'))));
  const sh = sheet(c.id ? t('edit') : t('addContact'), form);
}

const MEMBER_FIELDS = [
  ['name', 'name', 'text'], ['birth', 'birth', 'date'], ['blood', 'blood', 'select'],
  ['allergies', 'allergies', 'area'], ['meds', 'meds', 'area'], ['conditions', 'conditions', 'area'],
  ['doctor', 'doctor', 'text'], ['notes', 'notes', 'area'],
];
const BLOOD = ['', 'O+', 'O−', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−'];

function memberForm(existing) {
  const m = { ...existing };
  const inputs = {};
  const fields = MEMBER_FIELDS.map(([k, label, type]) => {
    let el;
    if (type === 'select') el = h('select', BLOOD.map(b => h('option', { value: b, selected: (m[k] || '') === b }, b || '—')));
    else if (type === 'area') el = h('textarea', { rows: 2, maxLength: 400, value: m[k] || '' });
    else el = h('input', { type, maxLength: 80, value: m[k] || '' });
    inputs[k] = el;
    return field(t(label) + (k === 'name' ? '' : ' (' + t('optional') + ')'), el);
  });
  const err = h('p.form-error', { role: 'alert' });
  const form = h('form.form', { novalidate: true, onsubmit: e => {
    e.preventDefault();
    if (!inputs.name.value.trim()) { err.textContent = t('name') + ' ?'; return inputs.name.focus(); }
    const data = {}; for (const k in inputs) data[k] = inputs[k].value.trim();
    store.update(s => {
      if (m.id) { const i = s.members.findIndex(x => x.id === m.id); if (i >= 0) s.members[i] = { ...s.members[i], ...data }; }
      else s.members.push({ id: store.uid(), ...data });
    });
    sh.close(); toast(t('saved'));
  } },
    fields, err,
    h('div.row-actions',
      m.id ? h('button.btn.danger.ghost', { type: 'button', onclick: async () => { if (await confirmBox(t('confirmDelete', { name: m.name }))) { store.update(s => { s.members = s.members.filter(x => x.id !== m.id); }); sh.close(); } } }, icon('trash', 16)) : null,
      h('button.btn.ghost', { type: 'button', onclick: () => sh.close() }, t('cancel')),
      h('button.btn.primary', { type: 'submit' }, t('save'))));
  const sh = sheet(m.id ? m.name : t('addMember'), form);
}

// Ficha em ecrã inteiro, legível por quem chega para ajudar.
function showCard(m) {
  const s = store.get();
  const row = (label, v) => v ? h('div.ice-row', h('dt', label), h('dd', v)) : null;
  const dlg = h('dialog.ice',
    h('div.ice-inner',
      h('header.ice-head', h('span', icon('card', 22), t('iceHeading')), h('button.icon-btn', { type: 'button', 'aria-label': t('close'), onclick: () => dlg.close() }, '×')),
      h('h2.ice-name', m.name),
      h('dl',
        row(t('birth'), m.birth ? fmtDate(m.birth) : ''),
        row(t('blood'), m.blood),
        row(t('allergies'), m.allergies),
        row(t('meds'), m.meds),
        row(t('conditions'), m.conditions),
        row(t('doctor'), m.doctor),
        row(t('notes'), m.notes)),
      s.contacts.length ? h('section.ice-contacts', h('h3', t('iceContacts')),
        s.contacts.slice(0, 4).map(c => h('a.ice-call', { href: telHref(c.phone) }, icon('phone', 18), h('span', c.name + (c.relation ? ' — ' + c.relation : '')), h('b', c.phone)))) : null));
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
}
