import { t, L } from './i18n.js';
import { h, icon, fill, add } from './ui.js';
import { GUIDES, stepText, stepRegion } from './content.js';
import { regions } from './store.js';
import { audioContext } from './platform.js';

// Guias e passos de outras regiões ficam escondidos.
const visible = g => !g.r || regions().includes(g.r);
const steps = g => g.s.filter(st => { const r = stepRegion(st); return !r || regions().includes(r); }).map(stepText);

let query = '';

export function title(params) {
  const g = params[0] && GUIDES.find(x => x.id === params[0]);
  return g ? { text: L(g.t) } : null;
}

const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function render(root, params) {
  if (params[0]) {
    const g = GUIDES.find(x => x.id === params[0]);
    if (g) return detail(root, g);
  }
  return list(root);
}

function list(root) {
  const results = h('div');
  const input = h('input.search', { type: 'search', value: query, placeholder: t('guidesSearch'), 'aria-label': t('guidesSearch') });
  const draw = () => {
    const q = norm(query.trim());
    // Procura no início das palavras: "gas" encontra "gás" mas não "engasgamento".
    const match = g => !q || norm(L(g.t) + ' ' + L(g.k) + ' ' + (g.i ? L(g.i) + ' ' : '') + steps(g).map(L).join(' ')).split(/[^a-z0-9]+/).some(w => w.startsWith(q));
    const section = (kind, label) => {
      const items = GUIDES.filter(g => g.kind === kind && visible(g) && match(g));
      if (!items.length) return null;
      return h('section.block',
        h('h2.block-title', label),
        h('ul.guide-list', items.map(g => h('li',
          h('a.guide-row', { href: '#/guides/' + g.id },
            h('span.guide-ico.' + g.kind, icon(g.icon, 20)),
            h('span', L(g.t)),
            g.call ? h('span.badge.bad', '112') : null,
            icon('chevron', 18))))));
    };
    const a = section('aid', t('firstAid')), p = section('proc', t('procedures')), k = section('skill', t('practical'));
    fill(results, a || p || k ? [a, p, k] : h('p.empty', t('noResults', { q: query })));
  };
  input.addEventListener('input', () => { query = input.value; draw(); });
  add(root, h('div.search-wrap', icon('search', 18), input), results, h('p.disclaimer', t('guideDisclaimer')));
  draw();
}

function detail(root, g) {
  let stopMetro = null;
  add(root, 
    h('article.guide',
      g.call ? h('a.sos-call.compact', { href: 'tel:112' }, icon('phone', 22), h('b', t('call112'))) : null,
      g.i ? h('p.lede', L(g.i)) : null,
      h('ol.steps', steps(g).map(st => h('li', L(st)))),
      g.extra === 'metronome' ? metronome(fn => { stopMetro = fn; }) : null,
      g.d.length ? h('section.dont', h('h2', t('doNot')), h('ul', g.d.map(x => h('li', L(x))))) : null,
      h('p.disclaimer', t('guideDisclaimer')),
      g.src && g.src.length ? h('section.sources',
        h('h2', t('sourcesTitle')),
        h('ul', g.src.map(s => h('li', s.u ? h('a', { href: s.u, target: '_blank', rel: 'noopener' }, s.n) : s.n))),
        h('p.muted', g.kind === 'aid' ? t('reviewAid') : t('reviewOther'))) : null));
  return () => { stopMetro && stopMetro(); };
}

// Metrónomo a 110/min para manter o ritmo das compressões.
function metronome(register) {
  let ctx, timer, count = 0;
  const dot = h('span.metro-dot');
  const counter = h('output.metro-count', '0');
  const btn = h('button.btn.primary', { type: 'button' }, icon('play', 16), h('span', t('start')));
  const stop = () => {
    clearInterval(timer); timer = null; count = 0; counter.textContent = '0';
    btn.lastChild.textContent = t('start');
    if (ctx) { ctx.close(); ctx = null; }
  };
  const beat = () => {
    count = count % 30 + 1; counter.textContent = String(count);
    dot.classList.remove('beat'); void dot.offsetWidth; dot.classList.add('beat');
    if (ctx) {
      const o = ctx.createOscillator(), gn = ctx.createGain();
      o.frequency.value = count === 30 ? 1320 : 880;
      gn.gain.setValueAtTime(0.4, ctx.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      o.connect(gn).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.09);
    }
    if (navigator.vibrate) navigator.vibrate(30);
  };
  btn.addEventListener('click', () => {
    if (timer) return stop();
    try { ctx = audioContext(); } catch (e) { ctx = null; }
    btn.lastChild.textContent = t('stop');
    beat(); timer = setInterval(beat, 60000 / 110);
  });
  register(stop);
  return h('section.metro', h('h2', t('cprMetronome')), h('div.metro-row', dot, counter, h('span.muted', '/ 30'), btn));
}
