// Ligação ao Organic Maps (app gratuita, offline, código aberto).
// No Chrome Android usamos um link "intent": abre a app se estiver instalada, senão abre a Play Store.
const PKG = 'app.organicmaps';
const STORE = 'https://play.google.com/store/apps/details?id=' + PKG;
const SITE = 'https://organicmaps.app/';

const isAndroid = /Android/i.test(navigator.userAgent);
const inCapacitor = !!window.Capacitor;

// Os links usam o esquema padrão "geo:" (Android), dirigido ao Organic Maps.
// Num link "intent:" o Chrome abre a app se estiver instalada; senão, a Play Store.
function geoIntent(rest) {
  if (isAndroid && !inCapacitor) return `intent:${rest}#Intent;scheme=geo;package=${PKG};S.browser_fallback_url=${encodeURIComponent(STORE)};end`;
  return 'geo:' + rest;
}
export const omStore = () => (isAndroid ? STORE : SITE);
const enc = s => encodeURIComponent(String(s || '').slice(0, 60));
const ll = p => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;

// Um ponto com nome. O "geo:" só leva um ponto — vários pontos vão pelo ficheiro KML.
export function omPoint(p) {
  return geoIntent(`${ll(p)}?q=${ll(p)}` + (p.name ? `(${enc(p.name)})` : '') + '&z=17');
}
// Pesquisa (ex.: "hospital"), centrada numa posição se a houver
export function omSearch(query, near) {
  return geoIntent(`${near ? ll(near) : '0,0'}?q=${enc(query)}`);
}
// Abrir só a app, sem nenhum pedido.
export function omOpenApp() {
  if (isAndroid && !inCapacitor) return `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${PKG};S.browser_fallback_url=${encodeURIComponent(STORE)};end`;
  return SITE;
}

// Encontra coordenadas num texto ("49.48060, 6.08750")
export function parseCoords(text) {
  const m = String(text || '').match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  return m ? { lat: parseFloat(m[1]), lon: parseFloat(m[2]) } : null;
}

export function geoHref(p, label) {
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
