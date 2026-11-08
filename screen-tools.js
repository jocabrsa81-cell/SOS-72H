import { t, L, lang, fmtNum } from './i18n.js';
import { h, icon, toast, fill, add } from './ui.js';
import { omPoint, omSearch, omOpenApp, omStore, geoHref } from './maps.js';
import { NEARBY } from './content.js';

let lastFix = null; // última posição GPS, para centrar as pesquisas

export function title() { return null; }

// ——— Lanterna (flash da câmara traseira) ———
// Telemóveis com várias câmaras traseiras (S24: grande angular, ultra, tele) só têm flash
// associado a uma delas. Testamos uma a uma e guardamos a que funciona.
const TORCH_KEY = 'sos72h.torchCam';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

const torch = {
  stream: null, track: null, video: null,
  async open(constraints) {
    const s = await navigator.mediaDevices.getUserMedia({ video: constraints, audio: false });
    const tr = s.getVideoTracks()[0];
    // Alguns Android só anunciam o flash depois de a câmara começar a enviar imagem.
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.srcObject = s;
    try { await v.play(); } catch (e) {}
    let caps = {};
    for (let i = 0; i < 8; i++) {
      caps = tr.getCapabilities ? tr.getCapabilities() : {};
      if (caps.torch) break;
      await sleep(150);
    }
    return { s, tr, v, torch: !!caps.torch, id: tr.getSettings ? tr.getSettings().deviceId : '' };
  },
  close(o) { o.s.getTracks().forEach(x => x.stop()); o.v.srcObject = null; },
  async on() {
    if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('unsupported'), { diag: 'getUserMedia: não' });
    const tried = [];
    const attempt = async (constraints, label) => {
      const o = await this.open(constraints);
      tried.push(label + (o.torch ? ' ✓' : ' ✗'));
      if (!o.torch) { this.close(o); return false; }
      await o.tr.applyConstraints({ advanced: [{ torch: true }] });
      this.stream = o.s; this.track = o.tr; this.video = o.v;
      if (o.id) lsSet(TORCH_KEY, o.id);
      return true;
    };
    const saved = lsGet(TORCH_KEY);
    if (saved) { try { if (await attempt({ deviceId: { exact: saved } }, 'guardada')) return; } catch (e) { if (e.name === 'NotAllowedError') throw e; } }
    if (await attempt({ facingMode: { ideal: 'environment' } }, 'traseira')) return; // aqui pode surgir NotAllowedError
    const cams = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
    const isBack = d => /back|rear|environment|traseira|arri|rück/i.test(d.label);
    for (const d of [...cams.filter(isBack), ...cams.filter(d => !isBack(d))]) {
      try { if (await attempt({ deviceId: { exact: d.deviceId } }, (d.label || 'câmara').replace(/camera2?\s*/i, 'cam '))) return; }
      catch (e) { tried.push((d.label || 'câmara') + ' ! ' + e.name); }
    }
    throw Object.assign(new Error('unsupported'), { diag: `${cams.length} câmaras · ${tried.join(' · ')}` });
  },
  async set(v) { if (this.track) try { await this.track.applyConstraints({ advanced: [{ torch: v }] }); } catch (e) {} },
  off() {
    if (this.stream) this.stream.getTracks().forEach(tr => tr.stop());
    if (this.video) this.video.srcObject = null;
    this.stream = this.track = this.video = null;
  },
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

// Pesquisa no Organic Maps centrada na posição atual (se for rápida a obter) ou sem centro.
function nearby(n) {
  const go = pos => { location.href = omSearch(L(n.q), pos); };
  if (lastFix) return go(lastFix);
  if (!navigator.geolocation) return go(null);
  let done = false;
  const timer = setTimeout(() => { if (!done) { done = true; go(null); } }, 6000);
  navigator.geolocation.getCurrentPosition(p => {
    if (done) return; done = true; clearTimeout(timer);
    lastFix = { lat: p.coords.latitude, lon: p.coords.longitude }; go(lastFix);
  }, () => { if (!done) { done = true; clearTimeout(timer); go(null); } }, { maximumAge: 600000, timeout: 6000 });
}

export function render(root) {
  const cleanups = [];

  // Lanterna
  const torchBtn = h('button.tool-big', { type: 'button', 'aria-pressed': 'false' }, icon('torch', 40), h('span', t('torchOn')));
  torchBtn.addEventListener('click', async () => {
    if (torch.active) { torch.off(); torchBtn.setAttribute('aria-pressed', 'false'); torchBtn.lastChild.textContent = t('torchOn'); return; }
    torchBtn.disabled = true; torchBtn.lastChild.textContent = t('torchSearching'); torchDiag.textContent = '';
    try {
      await torch.on();
      torchBtn.setAttribute('aria-pressed', 'true'); torchBtn.lastChild.textContent = t('torchOff');
    } catch (e) {
      toast(e.name === 'NotAllowedError' ? t('torchDenied') : t('torchUnsupported'));
      torchDiag.textContent = e.diag || `${e.name}: ${e.message}`;
      torchBtn.lastChild.textContent = t('torchOn');
    }
    torchBtn.disabled = false;
  });
  const torchDiag = h('small.diag');
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
      lastFix = { lat: la, lon: lo };
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
          h('a.btn.small.ghost', { href: omPoint({ lat: la, lon: lo, name: t('omHere') }) }, icon('compass', 16), t('omOpen')),
          h('a.btn.small.ghost', { href: geoHref({ lat: la, lon: lo }, t('omHere')) }, t('omOther'))));
    }, e => {
      gpsBtn.disabled = false; gpsBtn.lastChild.textContent = t('getLocation');
      fill(gpsOut, h('p.form-error', e.code === 1 ? t('gpsDenied') : t('gpsFail')));
    }, { enableHighAccuracy: true, timeout: 60000, maximumAge: 0 });
  });

  // Bússola — 1.º tenta o sensor de orientação absoluta (Chrome Android), 2.º os eventos clássicos.
  const needle = h('div.rose-dial', ['N', 'E', 'S', 'W'].map((_, i) => h('span.rose-mark', { style: { transform: `rotate(${i * 90}deg)` } }, h('b', CARD[lang()][i * 2]))));
  const deg = h('output.compass-deg', '—');
  const compassMsg = h('p.muted', t('compassCalibrate'));
  const compassDiag = h('small.diag');
  let compassOn = false, sensor = null, fromSensor = false, rot = 0, events = 0;
  const diag = [];
  const setHeading = hd => {
    hd = ((hd % 360) + 360) % 360;
    // Roda pelo caminho mais curto (evita a volta completa ao passar de 359° para 0°).
    let d = -hd - rot; d = ((d + 540) % 360) - 180; rot += d;
    needle.style.transform = `rotate(${rot}deg)`;
    deg.textContent = `${Math.round(hd)}° ${cardinal(hd)}`;
  };
  const onOrient = e => {
    events++;
    if (fromSensor) return;
    if (typeof e.webkitCompassHeading === 'number') setHeading(e.webkitCompassHeading);
    else if (e.absolute && e.alpha !== null) setHeading(360 - e.alpha);
  };
  const startSensor = () => {
    if (!('AbsoluteOrientationSensor' in window)) { diag.push('sensor: não existe'); return; }
    try {
      if (sensor) try { sensor.stop(); } catch (e) {}
      sensor = new AbsoluteOrientationSensor({ frequency: 30 });
      sensor.addEventListener('reading', () => {
        const [x, y, z, w] = sensor.quaternion;
        const yaw = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)) * 180 / Math.PI;
        fromSensor = true; setHeading(360 - yaw);
      });
      sensor.addEventListener('error', e => diag.push('sensor: ' + (e.error ? e.error.name : 'erro')));
      sensor.start();
    } catch (e) { diag.push('sensor: ' + e.name); }
  };
  const report = () => {
    if (deg.textContent !== '—') return;
    compassBtn.hidden = false;
    compassMsg.textContent = t('compassUnsupported') + ' ' + t('compassSensorsHelp');
    compassDiag.textContent = diag.concat('eventos: ' + events).join(' · ');
  };
  // Arranca sozinha. Se em 3 s não houver leitura, mostra o botão (pede permissão) e o diagnóstico.
  const startCompass = () => {
    if (compassOn) return;
    compassOn = true;
    startSensor();
    window.addEventListener('deviceorientationabsolute', onOrient);
    window.addEventListener('deviceorientation', onOrient);
    setTimeout(report, 3000);
  };
  const compassBtn = h('button.btn.ghost.block', { type: 'button', hidden: true, onclick: async () => {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) diag.push('permissão: ' + await DeviceOrientationEvent.requestPermission());
    } catch (e) { diag.push('permissão: ' + e.name); }
    compassBtn.hidden = true; compassMsg.textContent = t('compassCalibrate');
    startSensor();
    setTimeout(report, 3000);
  } }, icon('compass', 18), t('compassStart'));
  setTimeout(startCompass, 0);
  cleanups.push(() => {
    window.removeEventListener('deviceorientationabsolute', onOrient);
    window.removeEventListener('deviceorientation', onOrient);
    if (sensor) try { sensor.stop(); } catch (e) {}
  });

  // Bateria
  const batt = h('p.batt');
  if (navigator.getBattery) navigator.getBattery().then(b => {
    const draw = () => fill(batt, icon('battery', 18), h('b', Math.round(b.level * 100) + '%'), b.charging ? h('span.muted', ' · ' + t('charging')) : null);
    draw(); b.addEventListener('levelchange', draw); b.addEventListener('chargingchange', draw);
    cleanups.push(() => { b.removeEventListener('levelchange', draw); b.removeEventListener('chargingchange', draw); });
  });

  add(root, 
    h('section.tool-grid',
      h('div.tool-card.torch-card', torchBtn, h('small.muted', t('torchSub')), torchDiag),
      h('button.tool-card', { type: 'button', onclick: () => overlay('white', h('div')) }, icon('screen', 28), h('b', t('screenLight')), h('small.muted', t('screenLightSub'))),
      h('button.tool-card', { type: 'button', onclick: () => sosSignal(useTorch.checked) }, icon('sos', 28), h('b', t('sosSignal')), h('small.muted', t('sosSignalSub'))),
      h('button.tool-card', { type: 'button', onclick: whistle }, icon('whistle', 28), h('b', t('whistle')), h('small.muted', t('whistleSub')))),
    h('label.check.plain.sos-torch', useTorch, h('span.check-box', icon('check', 16)), h('span.check-text', t('withTorch'))),
    h('section.block',
      h('h2.block-title', icon('pin', 20), t('gpsTitle')),
      h('p.muted', t('gpsSub')),
      gpsBtn, gpsOut),
    h('section.block',
      h('h2.block-title', icon('pin', 20), t('omTitle')),
      h('p.muted', t('omIntro')),
      h('div.inline-actions',
        h('a.btn.primary', { href: omOpenApp() }, icon('compass', 18), t('omOpenApp')),
        h('a.btn.ghost', { href: omStore(), target: '_blank', rel: 'noopener' }, icon('download', 18), t('omInstall'))),
      h('small.help', t('omInstallHint')),
      h('h3.sub-title', t('omNearby')),
      h('div.nearby', NEARBY.map(n => h('button.btn.small.ghost', { type: 'button', onclick: () => nearby(n) }, icon(n.icon, 16), L(n.l)))),
      h('small.help', t('omNearbyHelp'))),
    h('section.block',
      h('h2.block-title', icon('compass', 20), t('compass')),
      h('div.compass', h('div.rose', needle, h('i.rose-pointer')), deg),
      compassBtn, compassMsg, compassDiag),
    h('section.block',
      h('h2.block-title', icon('battery', 20), t('battery')),
      batt, h('p.muted', t('batteryTips'))));

  return () => cleanups.forEach(f => f());
}
