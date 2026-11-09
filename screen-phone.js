// "Prepara o teu telemóvel": as funções de emergência do próprio telemóvel (qualquer marca).
// Funcionam com o ecrã bloqueado e a app fechada — coisa que uma app web não consegue.
import { store } from './store.js';
import { t, section } from './i18n.js';
import { h, icon, add, fill } from './ui.js';
import { isIOS } from './platform.js';

export const PHONE_IDS = ['medical', 'contacts', 'sos', 'alerts', 'location', 'battery', 'maps'];

export function title() { return null; }

export function phoneProgress(s = store.get()) {
  return { done: PHONE_IDS.filter(id => s.phone && s.phone[id]).length, total: PHONE_IDS.length };
}

export function render(root) {
  const tx = section('phone');
  let platform = isIOS ? 'ios' : 'android';
  const list = h('div.phone-list');
  const head = h('div.progress-head');
  const otherBtn = h('button.btn.small.ghost', { type: 'button' });

  const draw = () => {
    const s = store.get();
    const { done, total } = phoneProgress(s);
    fill(head, h('b', t('phoneProgress', { done, total })), h('div.meter', h('i', { style: { width: (done / total * 100) + '%' } })));
    fill(otherBtn, platform === 'ios' ? t('phoneShowAndroid') : t('phoneShowIOS'));
    fill(list, PHONE_IDS.map(id => {
      const g = tx[id]; if (!g) return null;
      const isDone = !!s.phone[id];
      const box = h('input', { type: 'checkbox', checked: isDone, onchange: e => store.update(x => { if (e.target.checked) x.phone[id] = true; else delete x.phone[id]; }) });
      return h('section.phone-item' + (isDone ? '.is-done' : ''),
        h('h2', g.t),
        h('p.muted', g.why),
        h('ol.phone-steps', (g[platform] || []).map(st => h('li', st))),
        h('label.check.plain', box, h('span.check-box', icon('check', 16)), h('span.check-text', t('phoneDone'))));
    }));
  };
  otherBtn.addEventListener('click', () => { platform = platform === 'ios' ? 'android' : 'ios'; draw(); });

  add(root,
    h('p.lede', t('phoneSub')),
    head,
    h('p.notice.warn', icon('search', 18), h('span', t('phoneSearchTip'))),
    list,
    h('div.phone-other', otherBtn, h('small.muted', t('phoneOtherHint'))));
  draw();
  return store.subscribe(draw);
}
