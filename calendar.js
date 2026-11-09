// Exporta as validades do inventário para um ficheiro de calendário (.ics).
// Um lembrete por data, 30 dias antes de expirar (ou amanhã, se já faltar menos), com alarme às 9h.
import { store, daysUntil } from './store.js';
import { t, fmtDate } from './i18n.js';
import { saveFile } from './maps.js';

const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const esc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
// Linhas de mais de 75 bytes têm de ser "dobradas" (norma iCalendar).
function fold(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out = []; let cur = '';
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > (out.length ? 74 : 75)) { out.push(cur); cur = ''; }
    cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}

export function buildICS(items) {
  // Agrupa por data do lembrete
  const byDate = new Map();
  const tomorrow = new Date(); tomorrow.setHours(0, 0, 0, 0); tomorrow.setDate(tomorrow.getDate() + 1);
  for (const it of items) {
    const left = daysUntil(it.expiry);
    if (left === null || left < 0) continue;
    const exp = new Date(it.expiry + 'T00:00:00');
    let rem = new Date(exp); rem.setDate(rem.getDate() - 30);
    if (rem < tomorrow) rem = new Date(tomorrow);
    const k = ymd(rem);
    if (!byDate.has(k)) byDate.set(k, { date: rem, lines: [] });
    byDate.get(k).lines.push(t('icsLine', { name: it.name, d: fmtDate(it.expiry) }));
  }
  if (!byDate.size) return null;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SOS 72H//Validades//PT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const [k, { date, lines }] of [...byDate.entries()].sort()) {
    const end = new Date(date); end.setDate(end.getDate() + 1);
    const desc = lines.join('\n');
    L.push('BEGIN:VEVENT',
      `UID:sos72h-${k}-${lines.length}@sos72h.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${k}`,
      `DTEND;VALUE=DATE:${ymd(end)}`,
      `SUMMARY:${esc(t('icsSummary') + (lines.length === 1 ? ': ' + lines[0] : ` (${lines.length})`))}`,
      `DESCRIPTION:${esc(desc)}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT9H', `DESCRIPTION:${esc(t('icsSummary'))}`, 'END:VALARM',
      'END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n') + '\r\n';
}

export async function exportExpiries() {
  const ics = buildICS(store.get().inventory);
  if (!ics) return false;
  await saveFile(ics, `sos72h-validades-${new Date().toISOString().slice(0, 10)}.ics`, 'text/calendar');
  return true;
}
