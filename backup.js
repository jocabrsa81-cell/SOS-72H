// Proteção dos dados: cópia de segurança e armazenamento persistente.
import { store } from './store.js';

// Pede ao browser para não apagar os dados da app quando falta espaço (uma vez, quando já há dados).
export async function protectStorage() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch (e) { return null; }
}
export async function isProtected() {
  try { return navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null; } catch (e) { return null; }
}

export const hasData = s => s.inventory.length > 0 || s.contacts.length > 0 || s.members.length > 0 || Object.keys(s.kit).length > 0;

// Dias desde a última cópia (null = nunca).
export function daysSinceBackup() {
  const b = store.get().settings.lastBackup;
  return b ? Math.floor((Date.now() - Date.parse(b)) / 86400000) : null;
}
// Mostrar lembrete: há dados e a última cópia tem mais de 30 dias (ou nunca), e não foi adiado.
export function needsBackupReminder() {
  const s = store.get();
  if (!hasData(s)) return false;
  const snooze = s.settings.backupSnooze;
  if (snooze && Date.parse(snooze) > Date.now()) return false;
  const d = daysSinceBackup();
  return d === null || d >= 30;
}
export function snoozeBackup(days = 7) {
  store.update(s => { s.settings.backupSnooze = new Date(Date.now() + days * 86400000).toISOString(); });
}

// Exporta a cópia (partilhar ou descarregar). Devolve true se foi feita.
export async function exportBackup() {
  const text = store.exportJSON();
  const fname = `sos72h-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([text], fname, { type: 'application/json' });
  let done = false;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'SOS 72H' }); done = true; }
    catch (e) { if (e.name === 'AbortError') return false; }
  }
  if (!done) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file); a.download = fname;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }
  store.update(s => { s.settings.lastBackup = new Date().toISOString(); s.settings.backupSnooze = null; });
  return true;
}
