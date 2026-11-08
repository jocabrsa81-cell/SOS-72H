// Ligação ao Organic Maps (app gratuita, offline, código aberto).
// No Chrome Android usamos um link "intent": abre a app se estiver instalada, senão abre a Play Store.
const PKG = 'app.organicmaps';
const STORE = 'https://play.google.com/store/apps/details?id=' + PKG;
const SITE = 'https://organicmaps.app/';

const isAndroid = /Android/i.test(navigator.userAgent);
const inCapacitor = !!window.Capacitor;

// path sem o esquema, ex.: "map?v=1&ll=49.5,6.1&n=Casa"
export function omHref(path) {
  if (inCapacitor) return 'om://' + path;
  if (isAndroid) return `intent://${path}#Intent;scheme=om;package=${PKG};S.browser_fallback_url=${encodeURIComponent(STORE)};end`;
  return 'om://' + path; // iPhone: abre se estiver instalada
}
export const omStore = () => (isAndroid ? STORE : SITE);
const enc = s => encodeURIComponent(String(s || '').slice(0, 60));
const ll = p => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;

// Um ou vários pontos com nome
export function omPoints(points) {
  return omHref('map?v=1&' + points.map(p => `ll=${ll(p)}` + (p.name ? `&n=${enc(p.name)}` : '')).join('&'));
}
// Pesquisa (ex.: "hospital"), centrada numa posição se a houver
export function omSearch(query, near, locale) {
  return omHref('search?' + (near ? `cll=${ll(near)}&` : '') + (locale ? `locale=${locale}&` : '') + `query=${enc(query)}`);
}
// Abrir só a app, sem nenhum pedido (um "om://map" vazio é lido pelo Organic Maps como ficheiro de favoritos).
export function omOpenApp() {
  if (isAndroid && !inCapacitor) return `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${PKG};S.browser_fallback_url=${encodeURIComponent(STORE)};end`;
  return 'om://';
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
