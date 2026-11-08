// Diferenças entre Android e iPhone/iPad, num só sítio.
const ua = navigator.userAgent;
export const isAndroid = /Android/i.test(ua);
// iPadOS apresenta-se como "Macintosh", mas tem ecrã tátil.
export const isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
export const inCapacitor = !!window.Capacitor;
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// SMS com texto: o iPhone usa "&body=", o Android "?body=".
export const smsHref = (body, to = '') => `sms:${to}${isIOS ? '&' : '?'}body=${encodeURIComponent(body)}`;

// O iPhone só toca som com a página "desbloqueada" por um toque; garante que o áudio arranca.
export function audioContext() {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
