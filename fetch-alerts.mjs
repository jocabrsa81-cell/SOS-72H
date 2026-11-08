// Coletor de alertas — corre no GitHub Actions (Node 20, sem dependências).
// Junta MeteoAlarm, IPMA, USGS e GDACS num só alerts.json, servido pelo mesmo site da app (sem problemas de CORS).
// Uso: node fetch-alerts.mjs <ficheiro de saída>
import { writeFileSync } from 'node:fs';

const OUT = process.argv[2] || 'alerts.json';
const NOW = Date.now();
const UA = { 'User-Agent': 'SOS72H-alerts/1.0 (+https://github.com)' };

async function get(url, type = 'text') {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(url, { headers: UA, signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return type === 'json' ? await r.json() : await r.text();
  } finally { clearTimeout(timer); }
}

// XML simples, sem bibliotecas: suficiente para Atom/RSS conhecidos.
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()) : '';
};
const attr = (xml, name, a) => { const m = xml.match(new RegExp(`<${name}[^>]*\\s${a}="([^"]*)"`, 'i')); return m ? decode(m[1]) : ''; };
const blocks = (xml, name) => xml.match(new RegExp(`<${name}[\\s>][\\s\\S]*?</${name}>`, 'gi')) || [];
const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
const stripHtml = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// ——— MeteoAlarm (avisos meteorológicos europeus) ———
// Nos países vizinhos só interessam as zonas perto da fronteira; ES só vermelho.
const MA = [
  { c: 'LU', feed: 'luxembourg' },
  { c: 'FR', feed: 'france', area: /moselle|meurthe/i },
  { c: 'DE', feed: 'germany', area: /saar|trier|merzig|bitburg|eifel|perl|mosel/i },
  { c: 'BE', feed: 'belgium', area: /luxemb|arlon/i },
  { c: 'PT', feed: 'portugal' },
  { c: 'ES', feed: 'spain', minLevel: 'red' },
];
const SEV = { minor: 'yellow', moderate: 'yellow', severe: 'orange', extreme: 'red' };
const RANK = { yellow: 1, orange: 2, red: 3 };

async function meteoalarm() {
  const items = [];
  const errors = [];
  for (const m of MA) {
    try {
      const xml = await get(`https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-${m.feed}`);
      for (const e of blocks(xml, 'entry')) {
        const area = tag(e, 'cap:areaDesc');
        const level = SEV[(tag(e, 'cap:severity') || '').toLowerCase()];
        const expires = Date.parse(tag(e, 'cap:expires'));
        if (!level || (expires && expires < NOW)) continue;
        if (m.area && !m.area.test(area)) continue;
        if (m.minLevel && RANK[level] < RANK[m.minLevel]) continue;
        if ((tag(e, 'cap:message_type') || '').toLowerCase() === 'cancel') continue;
        items.push({
          id: 'ma-' + (tag(e, 'id') || area + tag(e, 'cap:onset')).slice(-80),
          source: 'meteoalarm', kind: 'weather', country: m.c, level,
          title: tag(e, 'cap:event') || tag(e, 'title'),
          area, start: tag(e, 'cap:onset') || tag(e, 'cap:effective'), end: tag(e, 'cap:expires'),
          url: 'https://meteoalarm.org/',
        });
      }
    } catch (err) { errors.push(m.c + ': ' + err.message); }
  }
  // Os feeds repetem o mesmo aviso em várias línguas: fica um por zona/evento/hora.
  const seen = new Set();
  const uniq = items.filter(i => { const k = [i.country, i.area, i.level, i.start].join('|'); if (seen.has(k)) return false; seen.add(k); return true; });
  if (!uniq.length && errors.length === MA.length) throw new Error(errors.join('; '));
  return { items: uniq, warnings: errors };
}

// ——— IPMA (avisos meteorológicos em Portugal) ———
const IPMA_AREAS = {
  AVR: 'Aveiro', BJA: 'Beja', BRG: 'Braga', BGC: 'Bragança', CBO: 'Castelo Branco', CBR: 'Coimbra', EVR: 'Évora',
  FAR: 'Faro', GDA: 'Guarda', LRA: 'Leiria', LSB: 'Lisboa', PTG: 'Portalegre', PTO: 'Porto', STM: 'Santarém',
  STB: 'Setúbal', VCT: 'Viana do Castelo', VRL: 'Vila Real', VIS: 'Viseu',
  MCN: 'Madeira — costa norte', MCS: 'Madeira — costa sul', MRM: 'Madeira — regiões montanhosas', MPS: 'Porto Santo',
  AOC: 'Açores — grupo ocidental', ACE: 'Açores — grupo central', AOR: 'Açores — grupo oriental',
};
async function ipma() {
  const data = await get('https://api.ipma.pt/open-data/forecast/warnings/warnings_www.json', 'json');
  const items = (Array.isArray(data) ? data : [])
    .filter(w => w.awarenessLevelID && w.awarenessLevelID !== 'green' && (!w.endTime || Date.parse(w.endTime) > NOW))
    .map(w => ({
      id: `ipma-${w.idAreaAviso}-${w.awarenessTypeName}-${w.startTime}`,
      source: 'ipma', kind: 'weather', country: 'PT', level: w.awarenessLevelID,
      title: w.awarenessTypeName, area: IPMA_AREAS[w.idAreaAviso] || w.idAreaAviso,
      text: w.text || '', start: w.startTime, end: w.endTime, url: 'https://www.ipma.pt/pt/otempo/prev-sam/',
    }));
  return { items };
}

// ——— USGS (sismos) ———
async function usgs() {
  const data = await get('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson', 'json');
  const items = (data.features || []).map(f => ({
    id: 'usgs-' + f.id, source: 'usgs', kind: 'quake',
    level: f.properties.mag >= 6 ? 'red' : f.properties.mag >= 5 ? 'orange' : f.properties.mag >= 4 ? 'yellow' : 'info',
    title: `M ${f.properties.mag?.toFixed(1)}`, area: f.properties.place || '',
    mag: f.properties.mag, tsunami: !!f.properties.tsunami,
    lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], depth: f.geometry.coordinates[2],
    start: new Date(f.properties.time).toISOString(), url: f.properties.url,
  }));
  return { items };
}

// ——— GDACS (catástrofes: sismos fortes, tsunamis, ciclones, cheias, vulcões, incêndios) ———
const GDACS_TYPES = { EQ: 'earthquake', TS: 'tsunami', TC: 'cyclone', FL: 'flood', VO: 'volcano', DR: 'drought', WF: 'wildfire' };
async function gdacs() {
  const xml = await get('https://www.gdacs.org/xml/rss.xml');
  const items = [];
  for (const it of blocks(xml, 'item')) {
    const lvl = (tag(it, 'gdacs:alertlevel') || '').toLowerCase();
    const current = (tag(it, 'gdacs:iscurrent') || 'true').toLowerCase() !== 'false';
    const type = (tag(it, 'gdacs:eventtype') || '').toUpperCase();
    if (!current || !(lvl === 'orange' || lvl === 'red' || type === 'TS')) continue;
    const lat = parseFloat(tag(it, 'geo:lat')), lon = parseFloat(tag(it, 'geo:long'));
    items.push({
      id: 'gdacs-' + (tag(it, 'guid') || tag(it, 'link')).slice(-60), source: 'gdacs', kind: 'disaster',
      level: lvl === 'red' ? 'red' : 'orange', type: GDACS_TYPES[type] || type.toLowerCase(),
      title: tag(it, 'title'), area: tag(it, 'gdacs:country'),
      text: stripHtml(tag(it, 'description')).slice(0, 300),
      lat: Number.isFinite(lat) ? lat : null, lon: Number.isFinite(lon) ? lon : null,
      start: tag(it, 'gdacs:fromdate') || tag(it, 'pubDate'), end: tag(it, 'gdacs:todate'),
      url: tag(it, 'link') || 'https://www.gdacs.org/',
    });
  }
  return { items };
}

const out = { app: 'sos72h-alerts', v: 1, generated: new Date().toISOString(), sources: {} };
for (const [name, fn] of Object.entries({ meteoalarm, ipma, usgs, gdacs })) {
  try {
    const r = await fn();
    out.sources[name] = { ok: true, checked: new Date().toISOString(), items: r.items, warnings: r.warnings || [] };
    console.log(`${name}: ${r.items.length} alertas`);
  } catch (err) {
    out.sources[name] = { ok: false, checked: new Date().toISOString(), error: String(err.message || err), items: [] };
    console.log(`${name}: ERRO ${err.message}`);
  }
}
writeFileSync(OUT, JSON.stringify(out));
console.log('Escrito', OUT);
