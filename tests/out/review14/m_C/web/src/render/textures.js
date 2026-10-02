// 이미지 파일 없이 캔버스로 만드는 텍스처 (아스팔트·잔디·자갈·연석·콘크리트·관중)
import * as THREE from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

// 결정적일 필요는 없지만 매번 같은 모양이 나오도록 간단한 난수
function rnd(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function tex(c, repeat = true, srgb = true, aniso = 8) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** 아스팔트: 골재 알갱이 + 얼룩. 가로 = 도로 폭 방향 */
export function asphalt(aniso) {
  const W = 512, H = 512;
  const [c, g] = canvas(W, H);
  const r = rnd(7);
  g.fillStyle = '#3b3d40'; g.fillRect(0, 0, W, H);
  // 큰 얼룩
  for (let i = 0; i < 60; i++) {
    const x = r() * W, y = r() * H, rad = 20 + r() * 80;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const v = r() < 0.5 ? 0 : 255;
    gr.addColorStop(0, `rgba(${v},${v},${v},0.045)`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // 골재
  const img = g.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 38 + (r() < 0.03 ? 40 : 0) - (r() < 0.04 ? 25 : 0);
    d[i] += n; d[i + 1] += n; d[i + 2] += n * 1.05;
  }
  g.putImageData(img, 0, 0);
  // 가운데(주행선) 살짝 어둡게 — 타이어 자국
  for (let x = 0; x < W; x++) {
    const u = x / W;
    const k = Math.exp(-((u - 0.35) ** 2) / 0.006) + Math.exp(-((u - 0.65) ** 2) / 0.006);
    g.fillStyle = `rgba(10,10,12,${0.10 * k})`;
    g.fillRect(x, 0, 1, H);
  }
  return tex(c, true, true, aniso);
}

/** 아스팔트 거칠기(roughness) — 밝을수록 거칠다 */
export function asphaltRough(aniso) {
  const W = 256, H = 256;
  const [c, g] = canvas(W, H);
  const r = rnd(11);
  const img = g.createImageData(W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = 200 + (r() - 0.5) * 70; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  for (let x = 0; x < W; x++) {
    const u = x / W;
    const k = Math.exp(-((u - 0.35) ** 2) / 0.006) + Math.exp(-((u - 0.65) ** 2) / 0.006);
    g.fillStyle = `rgba(90,90,90,${0.5 * k})`;   // 닳은 곳은 매끈하다
    g.fillRect(x, 0, 1, H);
  }
  return tex(c, true, false, aniso);
}

export function grass(aniso) {
  const W = 512, H = 512;
  const [c, g] = canvas(W, H);
  const r = rnd(3);
  g.fillStyle = '#4c6b2c'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) {
    const x = r() * W, y = r() * H, rad = 30 + r() * 90;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const t = r();
    gr.addColorStop(0, t < 0.5 ? 'rgba(110,140,50,0.25)' : 'rgba(40,70,25,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 26000; i++) {
    const x = r() * W, y = r() * H, l = 2 + r() * 5;
    const v = r();
    g.strokeStyle = v < 0.5 ? `rgba(${90 + v * 80},${130 + v * 60},${40},0.55)` : `rgba(${30 + v * 20},${60 + v * 30},20,0.5)`;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 2, y - l); g.stroke();
  }
  return tex(c, true, true, aniso);
}

export function gravel(aniso) {
  const W = 256, H = 256;
  const [c, g] = canvas(W, H);
  const r = rnd(5);
  g.fillStyle = '#8c8272'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 7000; i++) {
    const x = r() * W, y = r() * H, s = 0.8 + r() * 2.2;
    const v = 105 + r() * 70;
    g.fillStyle = `rgb(${v},${v * 0.95},${v * 0.86})`;
    g.beginPath(); g.ellipse(x, y, s, s * (0.6 + r() * 0.4), r() * 3, 0, Math.PI * 2); g.fill();
  }
  return tex(c, true, true, aniso);
}

/** 연석: 빨강/흰 줄 (가로 = 폭, 세로 = 길이 방향 반복) */
export function curb(aniso) {
  const [c, g] = canvas(64, 256);
  g.fillStyle = '#d42a24'; g.fillRect(0, 0, 64, 128);
  g.fillStyle = '#f2f0ea'; g.fillRect(0, 128, 64, 128);
  const r = rnd(9);
  const img = g.getImageData(0, 0, 64, 256), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 18; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
  return tex(c, true, true, aniso);
}

export function concrete(aniso) {
  const W = 256, H = 256;
  const [c, g] = canvas(W, H);
  const r = rnd(13);
  g.fillStyle = '#b8b6ae'; g.fillRect(0, 0, W, H);
  const img = g.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 22; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 25; i++) {
    const x = r() * W, y = r() * H, rad = 10 + r() * 50;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(60,55,50,0.10)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  return tex(c, true, true, aniso);
}

/** 바위 절벽 — 층리(가로 줄) + 큰 얼룩, 잔 노이즈는 약하게 */
export function rock(aniso) {
  const W = 512, H = 512;
  const [c, g] = canvas(W, H);
  const r = rnd(17);
  g.fillStyle = '#5f5a52'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = r() * H, rad = 30 + r() * 110;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const v = r() < 0.5 ? '40,38,34' : '130,124,112';
    gr.addColorStop(0, `rgba(${v},0.35)`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 60; i++) {
    const y = r() * H, h = 1 + r() * 3;
    g.fillStyle = `rgba(${r() < 0.5 ? '30,28,26' : '150,145,135'},0.25)`;
    g.fillRect(0, y, W, h);
  }
  for (let i = 0; i < 160; i++) {
    const x = r() * W, y = r() * H;
    g.strokeStyle = 'rgba(25,22,20,0.35)'; g.lineWidth = 1 + r() * 1.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 40, y + r() * 50); g.stroke();
  }
  const img = g.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 10; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
  return tex(c, true, true, aniso);
}

/** 관중석 사람들 (알록달록 점) */
export function crowd() {
  const W = 256, H = 64;
  const [c, g] = canvas(W, H);
  const r = rnd(21);
  g.fillStyle = '#3a3f48'; g.fillRect(0, 0, W, H);
  const cols = ['#e04a3a', '#f0c030', '#3a78d8', '#ffffff', '#2a2a2a', '#40a060', '#d060a0', '#f08030'];
  for (let row = 0; row < 8; row++) {
    for (let x = 0; x < W; x += 4) {
      if (r() < 0.25) continue;
      g.fillStyle = cols[Math.floor(r() * cols.length)];
      g.fillRect(x + r() * 2, row * 8 + 2, 3, 4);
      g.fillStyle = '#e8c09a';
      g.fillRect(x + r() * 2 + 0.5, row * 8, 2, 2);
    }
  }
  return tex(c, true, true, 4);
}

/** 체커(출발선) */
export function checker() {
  const [c, g] = canvas(128, 32);
  for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) {
    g.fillStyle = (x + y) % 2 ? '#111' : '#f4f4f4';
    g.fillRect(x * 8, y * 8, 8, 8);
  }
  const t = tex(c, true, true, 8);
  t.magFilter = THREE.NearestFilter;
  return t;
}

/** 글자 판 (광고판·표지) — 실제 상표 없음 */
export function sign(text, bg = '#1a4fb0', fg = '#ffffff', w = 512, h = 128) {
  const [c, g] = canvas(w, h);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.font = `bold ${Math.floor(h * 0.55)}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2);
  return tex(c, false, true, 4);
}

/** 나뭇잎 덩어리용 부드러운 노이즈 */
export function foliage() {
  const W = 128, H = 128;
  const [c, g] = canvas(W, H);
  const r = rnd(33);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 700; i++) {
    const v = 150 + r() * 105;
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.beginPath(); g.arc(r() * W, r() * H, 2 + r() * 5, 0, Math.PI * 2); g.fill();
  }
  return tex(c, true, true, 4);
}
