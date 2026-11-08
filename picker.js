// Escolher um ponto num mapa (OpenStreetMap + Leaflet). Precisa de Internet:
// usa-se ao preparar o plano, não durante a emergência.
import { t } from './i18n.js';
import { h, icon, sheet, toast } from './ui.js';

const LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist/';
let loading = null;

function loadLeaflet() {
  if (window.L && window.L.map) return Promise.resolve(window.L);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = LEAFLET + 'leaflet.css';
    document.head.append(css);
    const js = document.createElement('script');
    js.src = LEAFLET + 'leaflet.js';
    js.onload = () => resolve(window.L);
    js.onerror = () => { loading = null; reject(new Error('leaflet')); };
    document.head.append(js);
  });
  return loading;
}

// Pesquisa de moradas (Nominatim / OpenStreetMap), só quando se carrega em "procurar".
async function geocode(q) {
  const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' + encodeURIComponent(q);
  const r = await fetch(url, { headers: { 'Accept-Language': document.documentElement.lang || 'pt' } });
  const j = await r.json();
  return j[0] ? { lat: parseFloat(j[0].lat), lon: parseFloat(j[0].lon) } : null;
}

// start: {lat, lon} ou null. Devolve uma Promise com {lat, lon} ou null se cancelar.
export function pickOnMap(start) {
  return new Promise(async resolve => {
    if (!navigator.onLine) { toast(t('pickOffline')); return resolve(null); }
    let Lf;
    try { Lf = await loadLeaflet(); } catch (e) { toast(t('pickLoadFail')); return resolve(null); }

    let done = false;
    const mapEl = h('div.picker-map');
    const cross = h('div.picker-cross', { 'aria-hidden': 'true' });
    const coords = h('output.picker-coords');
    const q = h('input', { type: 'search', placeholder: t('pickSearch'), 'aria-label': t('pickSearch'), enterKeyHint: 'search' });
    const form = h('form.picker-search', { onsubmit: async e => {
      e.preventDefault();
      if (!q.value.trim()) return;
      try {
        const r = await geocode(q.value.trim());
        if (r) map.setView([r.lat, r.lon], 17); else toast(t('pickNoResult'));
      } catch (err) { toast(t('pickLoadFail')); }
    } }, icon('search', 18), q);

    const body = h('div.picker',
      form,
      h('div.picker-wrap', mapEl, cross),
      h('p.muted', t('pickHelp')),
      coords,
      h('div.row-actions',
        h('button.btn.ghost', { type: 'button', onclick: () => s.close() }, t('cancel')),
        h('button.btn.primary', { type: 'button', onclick: () => {
          const c = map.getCenter(); done = true; s.close();
          resolve({ lat: +c.lat.toFixed(5), lon: +c.lng.toFixed(5) });
        } }, icon('check', 18), t('pickUse'))));

    const s = sheet(t('pickTitle'), body, { wide: true, onClose: () => { map && map.remove(); if (!done) resolve(null); } });

    const center = start || { lat: 49.4806, lon: 6.0875 };
    const map = Lf.map(mapEl, { zoomControl: true, attributionControl: true }).setView([center.lat, center.lon], start ? 17 : 14);
    Lf.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    const show = () => { const c = map.getCenter(); coords.textContent = `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`; };
    map.on('move', show); show();
    setTimeout(() => map.invalidateSize(), 60);

    // Sem ponto inicial, tenta centrar na posição atual.
    if (!start && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(p => map.setView([p.coords.latitude, p.coords.longitude], 17), () => {}, { maximumAge: 600000, timeout: 8000 });
    }
  });
}
