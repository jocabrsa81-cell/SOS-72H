// Utilitários de interface: criação de elementos, ícones, avisos e diálogos.
import { t } from './i18n.js';

// h('div.card', {onclick}, filhos...) — cria elementos sem innerHTML (sem risco de injeção).
export function h(tag, attrs, ...kids) {
  const [name, ...cls] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (cls.length) el.className = cls.join(' ');
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className += (el.className ? ' ' : '') + v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k in el && k !== 'list' && k !== 'form') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, kids);
  return el;
}
export function add(el, ...kids) { append(el, kids); return el; }
export function fill(el, ...kids) { el.replaceChildren(); append(el, kids); return el; }
function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k === null || k === undefined || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

const P = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  kit: 'M4 8h16v12H4zM9 8V5h6v3M4 13h16M11 13v2h2v-2',
  family: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.6-3.5 3.3-6 6.5-6s5.9 2.5 6.5 6M16 4.5a3.2 3.2 0 0 1 0 6.3M18 14.3c1.9.8 3.2 2.9 3.5 5.7',
  guides: 'M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5zM12 6v14',
  tools: 'M14.5 6.5a4 4 0 0 0-5.3 5L3.5 17.2a1.8 1.8 0 0 0 2.5 2.5l5.7-5.7a4 4 0 0 0 5-5.3l-2.5 2.5-2.2-.3-.3-2.2z',
  phone: 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z',
  back: 'M15 5l-7 7 7 7',
  chevron: 'M9 5l7 7-7 7',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7 7 0 0 1-2.1 1.2L14.7 21h-4l-.3-2.1a7 7 0 0 1-2.1-1.2l-1.9.7-2-3.4 1.6-1.2a7 7 0 0 1 0-2.6L4.4 10l2-3.4 1.9.7a7 7 0 0 1 2.1-1.2L10.7 3h4l.3 2.1a7 7 0 0 1 2.1 1.2l1.9-.7 2 3.4-1.6 1.2a7 7 0 0 1 0 2.6z',
  lock: 'M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11M12 15v2',
  unlock: 'M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 0 1 6.8-1.2',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  torch: 'M8 3h8v4l-2 3v11h-4V10L8 7zM8 7h8M12 13v2',
  screen: 'M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 19h2',
  sos: 'M12 3l9.5 17h-19zM12 10v4M12 17v.5',
  whistle: 'M3 13a5 5 0 1 0 10 0V9h8V6H8a5 5 0 0 0-5 5zM8 13h.01',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5z',
  battery: 'M3 8h15v8H3zM21 11v2M6 11v2',
  share: 'M12 15V3M7 8l5-5 5 5M5 13v7h14v-7',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  alert: 'M12 3l9.5 17h-19zM12 10v4M12 17v.5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  card: 'M3 6h18v12H3zM7 10h4M7 14h7M15.5 11a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0',
  doc: 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6',
  download: 'M12 3v12M7 10l5 5 5-5M5 20h14',
  upload: 'M12 15V3M7 8l5-5 5 5M5 20h14',
  minus: 'M5 12h14',
  water: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z',
  food: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 3-3 7h3v11',
  siren: 'M7 18v-6a5 5 0 0 1 10 0v6M5 18h14v3H5zM12 3v2M4.2 6.2l1.4 1.4M19.8 6.2l-1.4 1.4',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  play: 'M7 4l13 8-13 8z',
};
export function icon(name, size = 22) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size); svg.setAttribute('height', size);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'ico');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', P[name] || P.alert);
  svg.append(p);
  return svg;
}

let toastTimer;
export function toast(msg, action) {
  let el = document.getElementById('toast');
  el.replaceChildren(h('span', msg));
  if (action) el.append(h('button', { type: 'button', onclick: () => { action.fn(); el.classList.remove('show'); } }, action.label));
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), action ? 8000 : 2600);
}

// Folha que sobe do fundo do ecrã. Devolve { close }.
export function sheet(title, body, { onClose, wide } = {}) {
  const dlg = h('dialog.sheet' + (wide ? '.wide' : ''));
  const close = () => { dlg.close(); };
  dlg.addEventListener('close', () => { dlg.remove(); onClose && onClose(); });
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  dlg.append(h('div.sheet-inner',
    h('header.sheet-head', h('h2', title), h('button.icon-btn', { type: 'button', 'aria-label': t('close'), onclick: close }, '×')),
    body));
  document.body.append(dlg);
  dlg.showModal();
  return { close, el: dlg };
}

// Confirmação sem window.confirm (que bloqueia a WebView).
export function confirmBox(message, okLabel = t('delete'), danger = true) {
  return new Promise(resolve => {
    let answered = false;
    const s = sheet(message, h('div.row-actions',
      h('button.btn.ghost', { type: 'button', onclick: () => { answered = true; resolve(false); s.close(); } }, t('cancel')),
      h('button.btn' + (danger ? '.danger' : '.primary'), { type: 'button', onclick: () => { answered = true; resolve(true); s.close(); } }, okLabel)
    ), { onClose: () => { if (!answered) resolve(false); } });
  });
}

// Campo de formulário com rótulo.
export function field(label, input, help) {
  const id = input.id || ('f' + Math.random().toString(36).slice(2, 8));
  input.id = id;
  return h('div.field', h('label', { htmlFor: id }, label), input, help ? h('small.help', help) : null);
}

export function emptyState(text, action) {
  return h('div.empty', h('p', text), action || null);
}

export function telHref(phone) { return 'tel:' + String(phone).replace(/[^\d+]/g, ''); }
