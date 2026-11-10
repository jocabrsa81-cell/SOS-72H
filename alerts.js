// Alertas em tempo real (só com a app aberta).
// 1) lê alerts.json, recolhido no GitHub de 15 em 15 min (MeteoAlarm, IPMA, USGS, GDACS);
// 2) tenta também USGS e IPMA diretamente, para dados mais frescos;
// 3) filtra pelas regiões escolhidas e pela posição; guarda a última verificação para usar offline.
import { store, regions } from './store.js';
import { lang } from './i18n.js';
import { inCapacitor } from './platform.js';

// No APK a app corre dentro do telemóvel, por isso o ficheiro de alertas vem do site publicado.
const ALERTS_URL = inCapacitor ? 'https://jocabrsa81-cell.github.io/SOS-72H/alerts.json' : './alerts.json';

const CACHE = 'sos72h.alerts';
const SEEN = 'sos72h.alertsSeen';
const REFS = {
  lu: [{ lat: 49.61, lon: 6.13 }],                       // Luxemburgo
  pt: [{ lat: 39.5, lon: -8.0 }, { lat: 40.4, lon: -3.7 }], // Portugal, Espanha
};
export const COUNTRIES = { lu: ['LU', 'FR', 'DE', 'BE'], pt: ['PT', 'ES'] };
export const WEATHER_MIN_DEFAULT = { LU: 'yellow', FR: 'yellow', DE: 'yellow', BE: 'yellow', PT: 'yellow', ES: 'orange' };
const RANK = { info: 0, yellow: 1, orange: 2, red: 3 };
const IPMA_AREAS = {
  AVR: 'Aveiro', BJA: 'Beja', BRG: 'Braga', BGC: 'Bragança', CBO: 'Castelo Branco', CBR: 'Coimbra', EVR: 'Évora',
  FAR: 'Faro', GDA: 'Guarda', LRA: 'Leiria', LSB: 'Lisboa', PTG: 'Portalegre', PTO: 'Porto', STM: 'Santarém',
  STB: 'Setúbal', VCT: 'Viana do Castelo', VRL: 'Vila Real', VIS: 'Viseu',
  MCN: 'Madeira — costa norte', MCS: 'Madeira — costa sul', MRM: 'Madeira — regiões montanhosas', MPS: 'Porto Santo',
  AOC: 'Açores — grupo ocidental', ACE: 'Açores — grupo central', AOR: 'Açores — grupo oriental',
};
export const SOURCES = {
  meteoalarm: { name: 'MeteoAlarm', url: 'https://meteoalarm.org/' },
  ipma: { name: 'IPMA', url: 'https://www.ipma.pt/pt/otempo/prev-sam/' },
  usgs: { name: 'USGS', url: 'https://earthquake.usgs.gov/earthquakes/map/' },
  gdacs: { name: 'GDACS', url: 'https://www.gdacs.org/' },
};

const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

// Última verificação, com a lista refiltrada pelas definições atuais (regiões, níveis mínimos).
export const lastResult = () => {
  const r = lsGet(CACHE, null);
  if (r && r.raw) r.items = relevant(r.raw, lastPosition());
  return r;
};

export function distanceKm(a, b) {
  const R = 6371, toR = x => x * Math.PI / 180;
  const dLat = toR(b.lat - a.lat), dLon = toR(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function getJSON(url, ms = 15000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { cache: 'no-store', signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(timer); }
}

// Leituras diretas (quando o servidor da fonte permite — CORS)
async function directUSGS() {
  const d = await getJSON('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson');
  return (d.features || []).map(f => ({
    id: 'usgs-' + f.id, source: 'usgs', kind: 'quake',
    level: f.properties.mag >= 6 ? 'red' : f.properties.mag >= 5 ? 'orange' : f.properties.mag >= 4 ? 'yellow' : 'info',
    title: `M ${Number(f.properties.mag).toFixed(1)}`, area: f.properties.place || '',
    mag: f.properties.mag, tsunami: !!f.properties.tsunami,
    lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], depth: f.geometry.coordinates[2],
    start: new Date(f.properties.time).toISOString(), url: f.properties.url,
  }));
}
async function directIPMA() {
  const d = await getJSON('https://api.ipma.pt/open-data/forecast/warnings/warnings_www.json');
  const now = Date.now();
  return (Array.isArray(d) ? d : [])
    .filter(w => w.awarenessLevelID && w.awarenessLevelID !== 'green' && (!w.endTime || Date.parse(w.endTime) > now))
    .map(w => ({
      id: `ipma-${w.idAreaAviso}-${w.awarenessTypeName}-${w.startTime}`, source: 'ipma', kind: 'weather', country: 'PT',
      level: w.awarenessLevelID, title: w.awarenessTypeName, area: IPMA_AREAS[w.idAreaAviso] || w.idAreaAviso,
      text: w.text || '', start: w.startTime, end: w.endTime, url: SOURCES.ipma.url,
    }));
}

// Filtra pelo que interessa a quem usa a app.
function relevant(items, here, regs = regions(), ignoreMin = false) {
  const hasIPMA = items.some(i => i.source === 'ipma');
  const refs = regs.flatMap(r => REFS[r] || []).concat(here ? [here] : []);
  const countries = new Set(regs.flatMap(r => COUNTRIES[r] || []));
  const near = it => (it.lat == null || it.lon == null) ? Infinity : Math.min(...refs.map(r => distanceKm(r, it)));
  const now = Date.now();
  return items.map(it => ({ ...it, km: it.lat != null ? Math.round(near(it)) : null })).filter(it => {
    if (it.kind === 'weather') {
      if (!countries.has(it.country) || RANK[it.level] < 1 || (it.end && Date.parse(it.end) <= now)) return false;
      const min = (store.get().settings.weatherMin || {})[it.country] || WEATHER_MIN_DEFAULT[it.country] || 'yellow';
      if (!ignoreMin && RANK[it.level] < RANK[min]) return false;                          // nível mínimo escolhido nas Definições
      if (it.country === 'PT' && it.source === 'meteoalarm' && hasIPMA) return false; // Portugal: IPMA é a fonte oficial
      return true;
    }
    if (it.kind === 'quake') {
      if (now - Date.parse(it.start) > 72 * 3600e3) return false;
      return (it.km < 300 && it.mag >= 2.5) || (it.km < 1500 && it.mag >= 4.5) || (it.tsunami && it.km < 3000);
    }
    if (it.kind === 'disaster') return it.level === 'red' || (it.km != null && it.km < 3000);
    return false;
  }).sort(byDate);
}

let running = null;
// Faz uma verificação. Devolve { checked, server, sources, items, fresh: [novos alertas fortes] }.
export function checkAlerts(here) {
  if (running) return running;
  running = (async () => {
    const res = { checked: new Date().toISOString(), server: null, sources: {}, items: [], offline: !navigator.onLine };
    let all = [];
    // 1) Ficheiro recolhido no GitHub (mesmo site; no APK, o endereço completo)
    try {
      const d = await getJSON(ALERTS_URL + '?t=' + Date.now());
      if (d && d.app === 'sos72h-alerts') {
        res.server = d.generated;
        for (const [k, s] of Object.entries(d.sources || {})) {
          res.sources[k] = { ok: !!s.ok, checked: s.checked, via: 'server', error: s.error };
          all.push(...(s.items || []));
        }
      }
    } catch (e) { /* sem ficheiro (ainda não publicado ou sem rede) */ }
    // 2) Diretas: substituem os dados do servidor dessa fonte se funcionarem
    for (const [k, fn] of [['usgs', directUSGS], ['ipma', directIPMA]]) {
      try {
        const items = await fn();
        all = all.filter(i => i.source !== k).concat(items);
        res.sources[k] = { ok: true, checked: res.checked, via: 'direct' };
      } catch (e) {
        if (!res.sources[k]) res.sources[k] = { ok: false, checked: res.checked, via: 'direct', error: e.name === 'AbortError' ? 'timeout' : (e.message || 'erro') };
      }
    }
    const anyOk = Object.values(res.sources).some(s => s.ok);
    if (!anyOk) {
      // Nada respondeu: mantém a última verificação válida e marca a falha.
      const prev = lastResult();
      return prev ? { ...prev, failedAt: res.checked, offline: !navigator.onLine } : { ...res, failedAt: res.checked };
    }
    // Fontes que falharam agora: reaproveita o que deram na verificação anterior (até 6 h), marcado como antigo.
    const prev = lastResult();
    if (prev && prev.raw) {
      for (const k of Object.keys(SOURCES)) {
        const st = res.sources[k];
        const old = prev.sources && prev.sources[k];
        if ((!st || !st.ok) && old && old.ok && Date.now() - Date.parse(old.checked) < 6 * 3600e3) {
          all = all.concat(prev.raw.filter(i => i.source === k));
          res.sources[k] = { ...old, stale: true };
        }
      }
    }
    // Guarda só o que pode interessar (todas as regiões), para não encher o armazenamento.
    res.raw = relevant(all, here, ['lu', 'pt'], true).map(({ km, ...i }) => i);
    res.items = relevant(all, here);
    // Alertas fortes que ainda não tinham sido vistos
    const seen = new Set(lsGet(SEEN, []));
    res.fresh = res.items.filter(i => !seen.has(i.id) && (RANK[i.level] >= 2 && (i.kind !== 'quake' || i.km < 500)));
    lsSet(SEEN, [...new Set([...seen, ...res.items.map(i => i.id)])].slice(-500));
    lsSet(CACHE, res);
    return res;
  })().finally(() => { running = null; });
  return running;
}

// Junta avisos iguais (mesma fonte, país, tipo e nível) numa só linha com a lista de zonas.
// Ordem por data: avisos de tempo pela hora de início (os em vigor primeiro, depois os próximos);
// sismos e catástrofes, os mais recentes primeiro. Em empate, o mais grave primeiro.
const ts = iso => { const n = Date.parse(iso); return Number.isFinite(n) ? n : 0; };
export function byDate(a, b) {
  if (a.kind === 'weather' && b.kind === 'weather') return ts(a.start) - ts(b.start) || ts(a.end) - ts(b.end) || RANK[b.level] - RANK[a.level];
  return ts(b.start) - ts(a.start) || RANK[b.level] - RANK[a.level];
}

export function groupWeather(items) {
  const groups = new Map();
  for (const it of items) {
    if (it.kind !== 'weather') continue;
    const k = [it.source, it.country, it.title, it.level].join('|');
    const g = groups.get(k);
    if (!g) groups.set(k, { ...it, zones: it.area ? [it.area] : [], ids: [it.id] });
    else {
      if (it.area && !g.zones.includes(it.area)) g.zones.push(it.area);
      g.ids.push(it.id);
      if (it.start && (!g.start || Date.parse(it.start) < Date.parse(g.start))) g.start = it.start;
      if (it.end && (!g.end || Date.parse(it.end) > Date.parse(g.end))) g.end = it.end;
    }
  }
  return [...groups.values()].sort(byDate);
}
// Número de alertas para mostrar (avisos de tempo agrupados).
export const countAlerts = items => groupWeather(items).length + items.filter(i => i.kind !== 'weather').length;

export const topLevel = items => items.reduce((m, i) => (RANK[i.level] > RANK[m] ? i.level : m), 'info');

// Verificação automática enquanto a app está aberta: de 10 em 10 min e ao voltar à app.
let timer = null;
export function startPolling(onResult) {
  const s = () => store.get().settings;
  const tick = async () => {
    if (s().alertsAuto === false || document.hidden || !navigator.onLine) return;
    const prev = lastResult();
    if (prev && Date.now() - Date.parse(prev.checked) < 5 * 60e3) return;
    const r = await checkAlerts(lastPosition());
    onResult && onResult(r);
  };
  clearInterval(timer);
  timer = setInterval(tick, 10 * 60e3);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  window.addEventListener('online', tick);
  setTimeout(tick, 3000);
}

// Última posição conhecida (do GPS das ferramentas), se houver.
export function lastPosition() { return lsGet('sos72h.lastFix', null); }
export function savePosition(p) { lsSet('sos72h.lastFix', { lat: p.lat, lon: p.lon, at: Date.now() }); }

// Notificação do sistema (Android: através do service worker).
export async function notify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  try {
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: './icon-192.png', badge: './icon-192.png', tag: 'sos72h-alert', renotify: true });
    else new Notification(title, { body });
    return true;
  } catch (e) { return false; }
}

const LOCALES = { pt: 'pt-PT', fr: 'fr-LU', de: 'de-LU', en: 'en-GB', es: 'es-ES' };
// Hora (e data, se não for hoje)
export function when(iso) {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d)) return iso;
  const today = new Date().toDateString() === d.toDateString();
  return new Intl.DateTimeFormat(LOCALES[lang()], today ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
}

