// Monta a app para publicar (corre no GitHub Actions, ou localmente: node build.mjs).
// 1) verifica se todas as línguas têm os mesmos textos que o português;
// 2) copia os ficheiros da app para _site/;
// 3) escreve a versão (package.json + commit + data) e a lista de ficheiros do service worker.
// Se faltar uma tradução, a publicação falha e diz qual — assim nunca sai uma versão incompleta.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = '_site';
const LANGS = ['pt', 'fr', 'de', 'en', 'es'];
const errors = [];

// ——— 1. Traduções ———
const load = async l => (await import(pathToFileURL(`./lang-${l}.js`).href + '?' + Date.now())).default;
const ref = await load('pt');
const shape = (a, b, path, l) => {
  if (typeof a === 'string') { if (typeof b !== 'string' || !b.trim()) errors.push(`${l}: falta ${path}`); return; }
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || b.length !== a.length) { errors.push(`${l}: ${path} devia ter ${a.length} elementos (tem ${Array.isArray(b) ? b.length : 0})`); return; }
    a.forEach((x, i) => shape(x, b[i], `${path}[${i}]`, l)); return;
  }
  for (const k of Object.keys(a)) {
    if (b == null || !(k in b)) { errors.push(`${l}: falta ${path}.${k}`); continue; }
    shape(a[k], b[k], `${path}.${k}`, l);
  }
};
for (const l of LANGS.slice(1)) shape(ref, await load(l), 'lang', l);
// Placeholders {x} têm de existir em todas as línguas
for (const l of LANGS.slice(1)) {
  const d = await load(l);
  for (const [k, v] of Object.entries(ref.ui)) {
    const need = (v.match(/\{\w+\}/g) || []).sort().join();
    const have = ((d.ui[k] || '').match(/\{\w+\}/g) || []).sort().join();
    if (need !== have) errors.push(`${l}: ui.${k} tem marcadores diferentes (${have || 'nenhum'} ≠ ${need})`);
  }
}
if (errors.length) {
  console.error('Traduções incompletas:\n  ' + errors.slice(0, 50).join('\n  ') + (errors.length > 50 ? `\n  … e mais ${errors.length - 50}` : ''));
  process.exit(1);
}
console.log('Traduções: OK (' + Object.keys(ref.ui).length + ' textos da interface, ' + Object.keys(ref.guides).length + ' guias, 5 línguas)');

// ——— 2. Copiar ———
const SKIP = new Set(['build.mjs', 'fetch-alerts.mjs', 'icon-only.png', 'icon-foreground.png', 'icon-background.png', 'icon-maskable.svg', 'package.json', 'package-lock.json', 'capacitor.config.json', 'README.md']);
const ok = f => !SKIP.has(f) && /\.(html|css|js|webmanifest|png|svg)$/.test(f);
if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(OUT);
const files = readdirSync('.').filter(ok).sort();
for (const f of files) copyFileSync(f, `${OUT}/${f}`);

// ——— 3. Versão e service worker ———
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const sha = (process.env.GITHUB_SHA || 'local').slice(0, 7);
const date = new Date().toISOString().slice(0, 10);
const version = `${pkg.version} · ${sha} · ${date}`;
writeFileSync(`${OUT}/version.js`, `export const VERSION = ${JSON.stringify(version)};\n`);
const list = ['./', ...files.filter(f => f !== 'sw.js').map(f => './' + f)];
if (!list.includes('./version.js')) list.push('./version.js');
let sw = readFileSync('sw.js', 'utf8');
sw = sw.replace(/const VERSION = '[^']*';/, `const VERSION = 'sos72h-${pkg.version}-${sha}-${Date.now().toString(36)}';`)
       .replace(/const FILES = \[[\s\S]*?\];/, `const FILES = ${JSON.stringify(list, null, 1)};`);
writeFileSync(`${OUT}/sw.js`, sw);
console.log(`Versão: ${version} — ${list.length} ficheiros para funcionar offline`);
