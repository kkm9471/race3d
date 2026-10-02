// 대기실 트랙 미리보기 (2026-10-02 14회차 — 카트라이더처럼 맵을 미리 본다)
// 위에서 내려다본 코스: 높이 색(낮음 파랑 → 높음 주황), 출발선·진행 방향, 지름길(노란 분리대)·점프대(주황 삼각형)·
// 가속 발판(하늘색 화살표)·빙판(옅은 하늘색)·터널(점선), 그리고 코스를 따라 도는 점.
// 그림은 미리 한 장으로 그려 두고(bg), 매 화면엔 점만 다시 그린다. 대기실이 보일 때만 돈다.

export class TrackPreview {
  constructor(canvas) {
    this.c = canvas; this.g = canvas.getContext('2d');
    this.T = null; this.def = null; this.bg = null; this.running = false; this.t0 = performance.now();
  }

  set(def, T) {
    if (this.def === def && this.T === T) return;
    this.def = def; this.T = T; this.bg = null; this.t0 = performance.now();
    this.frame();
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => { if (!this.running) return; requestAnimationFrame(loop); this.frame(); };
    requestAnimationFrame(loop);
  }

  stop() { this.running = false; }

  /** 크기·회전 정하고 바탕 그림 만들기 */
  layout(W, H) {
    const T = this.T, b = T.bounds, pad = 14 * this.dpr;
    const w = b.x1 - b.x0, h = b.z1 - b.z0;
    // 긴 쪽을 가로로 (더 크게 보이도록 90° 돌릴 수 있다)
    const s0 = Math.min((W - pad * 2) / w, (H - pad * 2) / h), s1 = Math.min((W - pad * 2) / h, (H - pad * 2) / w);
    const rot = s1 > s0 * 1.08;
    const sc = rot ? s1 : s0;
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    this.P = rot ? (x, z) => [W / 2 - (z - cz) * sc, H / 2 + (x - cx) * sc] : (x, z) => [W / 2 + (x - cx) * sc, H / 2 + (z - cz) * sc];
    this.sc = sc;
    const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
    const g = bg.getContext('2d');
    // 바탕
    const gr = g.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.7);
    gr.addColorStop(0, '#26303f'); gr.addColorStop(1, '#121720');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.04)'; g.lineWidth = 1;
    for (let x = 0; x < W; x += 24 * this.dpr) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y < H; y += 24 * this.dpr) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    const n = T.n, P = this.P;
    const wOf = i => Math.max(3 * this.dpr, T.hw[i] * 2 * sc);
    const seg = (i, col, w, dash) => {
      const j = (i + 1) % n, [x0, y0] = P(T.x[i], T.z[i]), [x1, y1] = P(T.x[j], T.z[j]);
      g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    };
    g.lineCap = 'round'; g.lineJoin = 'round';
    // 테두리 → 노면(높이 색)
    for (let i = 0; i < n; i++) seg(i, '#05070a', wOf(i) + 4 * this.dpr);
    const y0 = b.y0, y1 = b.y1, flat = y1 - y0 < 3;
    for (let i = 0; i < n; i++) {
      const u = flat ? 0.35 : (T.y[i] - y0) / (y1 - y0);
      seg(i, `hsl(${215 - u * 185},62%,${52 + u * 6}%)`, wOf(i));
    }
    g.lineCap = 'butt';
    // 빙판·터널
    for (let i = 0; i < n; i++) {
      if (T.roadSurf && T.roadSurf[i] === 5) seg(i, 'rgba(225,245,255,0.95)', wOf(i) * 0.8);
      if (T.tunnel && T.tunnel[i]) seg(i, 'rgba(10,12,18,0.55)', wOf(i) + 2 * this.dpr);
    }
    // 터널 테두리 점선
    for (let i = 0; i < n; i++) if (T.tunnel && T.tunnel[i] && i % 2 === 0) seg(i, 'rgba(255,255,255,0.75)', 1.2 * this.dpr, [3 * this.dpr, 3 * this.dpr]);
    // 지름길 분리대 (노랑)
    g.setLineDash([]);
    for (let i = 0; i < n; i++) {
      if (!(T.divW && T.divW[i] > 0)) continue;
      const j = (i + 1) % n;
      const [ax, ay] = P(T.x[i] + T.lx[i] * T.div[i], T.z[i] + T.lz[i] * T.div[i]), [bx, by] = P(T.x[j] + T.lx[j] * T.div[j], T.z[j] + T.lz[j] * T.div[j]);
      g.strokeStyle = '#ffd23a'; g.lineWidth = 2.2 * this.dpr; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
    }
    // 진행 방향 단위벡터(화면)
    const dirAt = i => { const [ax, ay] = P(T.x[i], T.z[i]), [bx, by] = P(T.x[i] + T.tx[i], T.z[i] + T.tz[i]); const l = Math.hypot(bx - ax, by - ay) || 1; return [(bx - ax) / l, (by - ay) / l]; };
    const tri = (i, col, size, d = 0) => {
      const [x, y] = P(T.x[i] + T.lx[i] * d, T.z[i] + T.lz[i] * d), [dx, dy] = dirAt(i), s = size * this.dpr;
      g.fillStyle = col; g.strokeStyle = '#000'; g.lineWidth = 1 * this.dpr;
      g.beginPath(); g.moveTo(x + dx * s, y + dy * s); g.lineTo(x - dx * s * 0.7 - dy * s * 0.8, y - dy * s * 0.7 + dx * s * 0.8); g.lineTo(x - dx * s * 0.7 + dy * s * 0.8, y - dy * s * 0.7 - dx * s * 0.8); g.closePath(); g.fill(); g.stroke();
    };
    // 점프대: 가장 높은 곳에 주황 삼각형
    if (T.ramp) for (let i = 0; i < n; i++) if (T.ramp[i] > 0 && T.ramp[i] >= T.ramp[(i + n - 1) % n] && T.ramp[i] > T.ramp[(i + 1) % n]) tri(i, '#ff8a1e', 6);
    // 가속 발판: 가운데에 하늘색 화살표
    if (T.padW) for (let i = 0; i < n; i++) if (T.padW[i] > 0 && !(T.padW[(i + n - 1) % n] > 0)) {
      let k = i; while (T.padW[(k + 1) % n] > 0 && k - i < 50) k++;
      tri((i + Math.floor((k - i) / 2)) % n, '#38e1ff', 5.5, T.padC[i]);
    }
    // 출발선 (체크무늬 막대) + 방향 화살표
    {
      const i = 0, w = T.hw[0];
      const [ax, ay] = P(T.x[i] + T.lx[i] * w, T.z[i] + T.lz[i] * w), [bx, by] = P(T.x[i] - T.lx[i] * w, T.z[i] - T.lz[i] * w);
      g.strokeStyle = '#000'; g.lineWidth = 6 * this.dpr; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = 6 * this.dpr; g.setLineDash([3 * this.dpr, 3 * this.dpr]); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.setLineDash([]);
      tri(Math.round(30 / T.ds) % n, '#ffffff', 7);
    }
    this.bg = bg; this.bgW = W; this.bgH = H;
  }

  frame() {
    const c = this.c, T = this.T;
    if (!T) return;
    const w = c.clientWidth | 0, h = c.clientHeight | 0;
    if (!w || !h) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.round(w * this.dpr), H = Math.round(h * this.dpr);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; this.bg = null; }
    if (!this.bg || this.bgW !== W || this.bgH !== H) this.layout(W, H);
    const g = this.g;
    g.drawImage(this.bg, 0, 0);
    // 코스를 따라 도는 점 (한 바퀴 6~14초)
    const lapS = Math.max(6, Math.min(14, T.L / 380));
    const u = ((performance.now() - this.t0) / 1000 / lapS) % 1;
    const f = u * T.n, i = Math.floor(f) % T.n, j = (i + 1) % T.n, t = f - Math.floor(f);
    const [x, y] = this.P(T.x[i] + (T.x[j] - T.x[i]) * t, T.z[i] + (T.z[j] - T.z[i]) * t);
    const r = 4.5 * this.dpr;
    g.fillStyle = 'rgba(255,90,60,0.35)'; g.beginPath(); g.arc(x, y, r * 2.2, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ff4a2e'; g.strokeStyle = '#fff'; g.lineWidth = 1.5 * this.dpr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke();
  }
}

/** 설계도 요소 개수 → "지름길 2 · 점프 1 · …" */
export function featureSummary(def) {
  const c = {};
  for (const f of def.features || []) c[f.t] = (c[f.t] || 0) + 1;
  const out = [];
  if (c.split) out.push(`지름길 ${c.split}`);
  if (c.ramp) out.push(`점프대 ${c.ramp}`);
  if (c.pad) out.push(`가속 발판 ${c.pad}`);
  if (c.ice) out.push('빙판');
  if (c.tunnel) out.push(`터널 ${c.tunnel}`);
  return out.join(' · ') || '특수 요소 없음';
}
