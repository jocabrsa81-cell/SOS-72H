// Ligação ao Organic Maps (app gratuita, offline, código aberto).
// Android: links "intent:" com o esquema padrão "geo:" — abrem a app ou, se não estiver instalada, a Play Store.
// iPhone: esquema próprio do Organic Maps ("om://"); se a app não abrir, segue para a App Store.
import { isAndroid, isIOS, inCapacitor } from './platform.js';

const PKG = 'app.organicmaps';
const PLAY = 'https://play.google.com/store/apps/details?id=' + PKG;
const APPSTORE = 'https://apps.apple.com/app/id1567437057';
const SITE = 'https://organicmaps.app/';

export const omStore = () => (isAndroid ? PLAY : isIOS ? APPSTORE : SITE);
const enc = s => encodeURIComponent(String(s || '').slice(0, 60));
const ll = p => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;

function geoIntent(rest) {
  if (isAndroid && !inCapacitor) return `intent:${rest}#Intent;scheme=geo;package=${PKG};S.browser_fallback_url=${encodeURIComponent(PLAY)};end`;
  return 'geo:' + rest;
}

// Um ponto com nome. Vários pontos de uma vez vão pelo ficheiro KML.
export function omPoint(p) {
  if (isIOS) return `om://map?v=1&ll=${ll(p)}` + (p.name ? `&n=${enc(p.name)}` : '');
  return geoIntent(`${ll(p)}?q=${ll(p)}` + (p.name ? `(${enc(p.name)})` : '') + '&z=17');
}
// Pesquisa (ex.: "hospital"), centrada numa posição se a houver
export function omSearch(query, near) {
  if (isIOS) return 'om://search?' + (near ? `cll=${ll(near)}&` : '') + `query=${enc(query)}`;
  return geoIntent(`${near ? ll(near) : '0,0'}?q=${enc(query)}`);
}
// Abrir só a app. No iPhone, a página da App Store mostra "Abrir" se já estiver instalada.
export function omOpenApp() {
  if (isAndroid && !inCapacitor) return `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${PKG};S.browser_fallback_url=${encodeURIComponent(PLAY)};end`;
  if (isIOS) return APPSTORE;
  return SITE;
}

// Abre um link do Organic Maps. No iPhone, se a app não abrir (não instalada), vai para a App Store.
export function launch(href) {
  location.href = href;
  if (isIOS && href.startsWith('om://')) {
    setTimeout(() => { if (!document.hidden) location.href = APPSTORE; }, 1600);
  }
}

// Encontra coordenadas num texto ("49.48060, 6.08750")
export function parseCoords(text) {
  const m = String(text || '').match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  return m ? { lat: parseFloat(m[1]), lon: parseFloat(m[2]) } : null;
}

// "Outra app de mapas": Apple Maps no iPhone, escolha do sistema no Android.
export function geoHref(p, label) {
  if (isIOS) return `https://maps.apple.com/?ll=${p.lat},${p.lon}&q=${enc(label || `${p.lat},${p.lon}`)}`;
  return `geo:${p.lat},${p.lon}?q=${p.lat},${p.lon}` + (label ? `(${enc(label)})` : '');
}

// Ficheiro KML com os pontos — o Organic Maps importa-o como lista de favoritos, disponível offline.
const esc = s => String(s || '').replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
export function kml(name, points) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
<name>${esc(name)}</name>
${points.map(p => `<Placemark><name>${esc(p.name)}</name>${p.desc ? `<description>${esc(p.desc)}</description>` : ''}<Point><coordinates>${p.lon},${p.lat}</coordinates></Point></Placemark>`).join('\n')}
</Document>
</kml>`;
}

export async function saveFile(text, filename, type) {
  const file = new File([text], filename, { type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
