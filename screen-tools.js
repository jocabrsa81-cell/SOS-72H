import { t, lang, fmtNum } from './i18n.js';
import { h, icon, toast, fill, add } from './ui.js';

export function title() { return null; }

// ——— Lanterna (flash da câmara traseira) ———
const torch = {
  stream: null, track: null,
  async on() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
    this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
    this.track = this.stream.getVideoTracks()[0];
    const caps = this.track.getCapabilities ? this.track.getCapabilities() : {};
    if (!caps.torch) { this.off(); throw new Error('unsupported'); }
    await this.track.applyConstraints({ advanced: [{ torch: true }] });
  },
  async set(v) { if (this.track) try { await this.track.applyConstraints({ advanced: [{ torch: v }] }); } catch (e) {} },
  off() { if (this.stream) this.stream.getTracks().forEach(tr => tr.stop()); this.stream = this.track = null; },
  get active() { return !!this.track; },
};

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    else if (wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { /* sem wake lock: não é crítico */ }
}

// Camada em ecrã inteiro. Toca para sair.
function overlay(cls, content, onExit) {
  const el = h('div.overlay.' + cls, { role: 'dialog', 'aria-label': t('tapToExit') }, content, h('p.overlay-hint', t('tapToExit')));
  const exit = () => {
    el.remove(); keepAwake(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    onExit && onExit();
    document.removeEventListener('keydown', esc);
  };
  const esc = e => { if (e.key === 'Escape') exit(); };
  el.addEventListener('click', exit);
  document.addEventListener('keydown', esc);
  document.body.append(el);
  el.requestFullscreen?.().catch(() => {});
  keepAwake(true);
  return exit;
}

function tone(ctx, freq, type = 'sine') {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq; g.gain.value = 0;
  o.connect(g).connect(ctx.destination); o.start();
  return { on: () => g.gain.setTargetAtTime(0.9, ctx.currentTime, 0.005), off: () => g.gain.setTargetAtTime(0, ctx.currentTime, 0.005), stop: () => o.stop() };
}

// ··· ––– ··· — unidade de 220 ms
const SOS = [1, 1, 1, 1, 1, 3, 3, 1, 3, 1, 3, 3, 1, 1, 1, 1, 1, 7]; // on/off alternados
function sosSignal(useTorch) {
  let ctx = null, beep = null, i = 0, timer;
  try { ctx = new AudioContext(); beep = tone(ctx, 1000); } catch (e) {}
  const panel = h('div.sos-panel', h('span.sos-glyph', '··· ––– ···'));
  const step = () => {
    const on = i % 2 === 0;
    const dur = SOS[i % SOS.length] * 220;
    el.classList.toggle('lit', on);
    on ? beep?.on() : beep?.off();
    if (useTorch) torch.set(on);
    i = (i + 1) % SOS.length;
    timer = setTimeout(step, dur);
  };
  const exitFn = overlay('sos', panel, () => { clearTimeout(timer); beep?.stop(); ctx?.close(); if (useTorch) torch.off(); });
  const el = document.querySelector('.overlay.sos');
  const start = async () => { if (useTorch) { try { await torch.on(); } catch (e) { useTorch = false; } } step(); };
  start();
  return exitFn;
}

// Apito: 3 sons longos, pausa, repete — o sinal internacional de pedido de ajuda.
function whistle() {
  let ctx, w, timer, i = 0;
  try { ctx = new AudioContext(); w = tone(ctx, 3150, 'square'); } catch (e) { return toast('Audio ?'); }
  const pattern = [700, 300, 700, 300, 700, 2000];
  const panel = h('div.whistle-panel', icon('whistle', 96));
  const step = () => {
    const on = i % 2 === 0;
    on ? w.on() : w.off();
    panel.classList.toggle('lit', on);
    timer = setTimeout(step, pattern[i]);
    i = (i + 1) % pattern.length;
  };
  overlay('whistle', panel, () => { clearTimeout(timer); w.stop(); ctx.close(); });
  step();
}

const CARD = {
  pt: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'], fr: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'],
  de: ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'], en: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
  es: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'],
};
const cardinal = deg => CARD[lang()][Math.round(deg / 45) % 8];

function dms(v, pos, neg) {
  const a = Math.abs(v), d = Math.floor(a), mf = (a - d) * 60, m = Math.floor(mf), s = (mf - m) * 60;
  return `${d}° ${m}′ ${s.toFixed(1)}″ ${v >= 0 ? pos : neg}`;
}

export function render(root) {
  const cleanups = [];

  // Lanterna
  const torchBtn = h('button.tool-big', { type: 'button', 'aria-pressed': 'false' }, icon('torch', 40), h('span', t('torchOn')));
  torchBtn.addEventListener('click', async () => {
    if (torch.active) { torch.off(); torchBtn.setAttribute('aria-pressed', 'false'); torchBtn.lastChild.textContent = t('torchOn'); return; }
    try {
      await torch.on();
      torchBtn.setAttribute('aria-pressed', 'true'); torchBtn.lastChild.textContent = t('torchOff');
    } catch (e) {
      toast(e.name === 'NotAllowedError' ? t('torchDenied') : t('torchUnsupported'));
    }
  });
  cleanups.push(() => torch.off());

  const useTorch = h('input', { type: 'checkbox' });

  // GPS
  const gpsOut = h('div.gps-out');
  const gpsBtn = h('button.btn.primary.block', { type: 'button' }, icon('pin', 18), h('span', t('getLocation')));
  gpsBtn.addEventListener('click', () => {
    if (!navigator.geolocation) return fill(gpsOut, h('p.form-error', t('gpsFail')));
    gpsBtn.disabled = true; gpsBtn.lastChild.textContent = t('locating');
    navigator.geolocation.getCurrentPosition(p => {
      gpsBtn.disabled = false; gpsBtn.lastChild.textContent = t('getLocation');
      const { latitude: la, longitude: lo, accuracy, altitude } = p.coords;
      const dec = `${la.toFixed(5)}, ${lo.toFixed(5)}`;
      const url = `https://www.openstreetmap.org/?mlat=${la.toFixed(5)}&mlon=${lo.toFixed(5)}#map=17/${la.toFixed(5)}/${lo.toFixed(5)}`;
      const sms = t('smsLocation', { c: dec, a: Math.round(accuracy), url });
      fill(gpsOut, 
        h('p.gps-dec', dec),
        h('p.gps-dms', dms(la, 'N', 'S') + ' · ' + dms(lo, 'E', 'W')),
        h('p.muted', t('accuracy', { n: Math.round(accuracy) }) + (altitude != null ? ' · ' + t('altitude', { n: Math.round(altitude) }) : '')),
        h('div.inline-actions',
          h('button.btn.small.ghost', { type: 'button', onclick: () => navigator.clipboard?.writeText(dec).then(() => toast(t('copied'))) }, icon('copy', 16), t('copy')),
          h('a.btn.small.ghost', { href: 'sms:?body=' + encodeURIComponent(sms) }, icon('share', 16), t('sendBySms')),
          h('a.btn.small.ghost', { href: `geo:${la},${lo}?q=${la},${lo}` }, icon('compass', 16), t('openMap'))));
    }, e => {
      gpsBtn.disabled = false; gpsBtn.lastChild.textContent = t('getLocation');
      fill(gpsOut, h('p.form-error', e.code === 1 ? t('gpsDenied') : t('gpsFail')));
    }, { enableHighAccuracy: true, timeout: 60000, maximumAge: 0 });
  });

  // Bússola
  const needle = h('div.rose-dial', ['N', 'E', 'S', 'W'].map((_, i) => h('span.rose-mark', { style: { transform: `rotate(${i * 90}deg)` } }, h('b', CARD[lang()][i * 2]))));
  const deg = h('output.compass-deg', '—');
  const compassMsg = h('p.muted', t('compassCalibrate'));
  let compassOn = false;
  const onOrient = e => {
    let heading = null;
    if (typeof e.webkitCompassHeading === 'number') heading = e.webkitCompassHeading;
    else if (e.absolute && e.alpha !== null) heading = 360 - e.alpha;
    if (heading === null) return;
    heading = (heading + 360) % 360;
    needle.style.transform = `rotate(${-heading}deg)`;
    deg.textContent = `${Math.round(heading)}° ${cardinal(heading)}`;
  };
  const compassBtn = h('button.btn.ghost.block', { type: 'button' }, icon('compass', 18), t('compassStart'));
  compassBtn.addEventListener('click', async () => {
    if (compassOn) return;
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) await DeviceOrientationEvent.requestPermission();
    } catch (e) {}
    if (!('ondeviceorientationabsolute' in window) && !('ondeviceorientation' in window)) { compassMsg.textContent = t('compassUnsupported'); return; }
    compassOn = true; compassBtn.hidden = true;
    window.addEventListener('deviceorientationabsolute', onOrient);
    window.addEventListener('deviceorientation', onOrient);
    setTimeout(() => { if (deg.textContent === '—') compassMsg.textContent = t('compassUnsupported'); }, 3000);
  });
  cleanups.push(() => { window.removeEventListener('deviceorientationabsolute', onOrient); window.removeEventListener('deviceorientation', onOrient); });

  // Bateria
  const batt = h('p.batt');
  if (navigator.getBattery) navigator.getBattery().then(b => {
    const draw = () => fill(batt, icon('battery', 18), h('b', Math.round(b.level * 100) + '%'), b.charging ? h('span.muted', ' · ' + t('charging')) : null);
    draw(); b.addEventListener('levelchange', draw); b.addEventListener('chargingchange', draw);
    cleanups.push(() => { b.removeEventListener('levelchange', draw); b.removeEventListener('chargingchange', draw); });
  });

  add(root, 
    h('section.tool-grid',
      h('div.tool-card.torch-card', torchBtn, h('small.muted', t('torchSub'))),
      h('button.tool-card', { type: 'button', onclick: () => overlay('white', h('div')) }, icon('screen', 28), h('b', t('screenLight')), h('small.muted', t('screenLightSub'))),
      h('button.tool-card', { type: 'button', onclick: () => sosSignal(useTorch.checked) }, icon('sos', 28), h('b', t('sosSignal')), h('small.muted', t('sosSignalSub'))),
      h('button.tool-card', { type: 'button', onclick: whistle }, icon('whistle', 28), h('b', t('whistle')), h('small.muted', t('whistleSub')))),
    h('label.check.plain.sos-torch', useTorch, h('span.check-box', icon('check', 16)), h('span.check-text', t('withTorch'))),
    h('section.block',
      h('h2.block-title', icon('pin', 20), t('gpsTitle')),
      h('p.muted', t('gpsSub')),
      gpsBtn, gpsOut),
    h('section.block',
      h('h2.block-title', icon('compass', 20), t('compass')),
      h('div.compass', h('div.rose', needle, h('i.rose-pointer')), deg),
      compassBtn, compassMsg),
    h('section.block',
      h('h2.block-title', icon('battery', 20), t('battery')),
      batt, h('p.muted', t('batteryTips'))));

  return () => cleanups.forEach(f => f());
}
