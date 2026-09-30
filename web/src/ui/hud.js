// 레이스 중 화면 표시 (HTML 위에 겹쳐 그린다 — 3D 와 따로라 가볍고 선명하다)
// 이름 등 남이 정한 글자는 textContent 로만 넣는다(화면에 코드가 끼어들지 못하게).
import { FPS, GO_FRAME } from '../sim/race.js';
import { PAINT } from '../render/carmesh.js';

export function fmtTime(frames) {
  if (!(frames > 0)) return '--:--.---';
  const s = frames / FPS;
  const m = Math.floor(s / 60), r = s - m * 60;
  return `${m}:${r.toFixed(3).padStart(6, '0')}`;
}

const setText = (e, t) => { if (e._t !== t) { e.textContent = t; e._t = t; } };
const el = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; };

export class Hud {
  constructor(root) {
    this.root = root;
    root.innerHTML = '';
    root.classList.add('hud');
    const tl = el('div', 'hud-tl', root);
    this.pos = el('div', 'hud-pos', tl);
    this.lap = el('div', 'hud-lap', tl);
    this.times = el('div', 'hud-times', tl);
    this.board = el('div', 'hud-board', root);
    const br = el('div', 'hud-br', root);
    this.rpmBar = el('div', 'hud-rpm', br);
    this.rpmFill = el('div', 'hud-rpm-fill', this.rpmBar);
    this.rpmRed = el('div', 'hud-rpm-red', this.rpmBar);
    const spd = el('div', 'hud-speed', br);
    this.speed = el('span', 'hud-speed-num', spd);
    el('span', 'hud-speed-unit', spd).textContent = 'km/h';
    this.gear = el('div', 'hud-gear', br);
    this.assist = el('div', 'hud-assist', br);
    this.center = el('div', 'hud-center', root);
    this.sub = el('div', 'hud-sub', root);
    this.help = el('div', 'hud-help', root);
    this.help.textContent = '↑↓←→/WASD 운전 · Space 사이드 · R 되돌리기 · C 시점 · B 뒤보기 · M 소리 · Esc 메뉴';
    this.mapC = el('canvas', 'hud-map', root);
    this.mapC.width = 220; this.mapC.height = 220;
    this.labels = el('div', 'hud-labels', root);
    this.net = el('div', 'hud-net', root);
    this.fps = el('div', 'hud-fps', root);
    this.nameEls = [];
    this.msgUntil = 0;
    this.lastLap = 0;
    this.sp = { x: 0, y: 0 };
  }

  setupMap(T) {
    const b = T.bounds, W = 220, pad = 14;
    const sc = Math.min((W - pad * 2) / (b.x1 - b.x0), (W - pad * 2) / (b.z1 - b.z0));
    // 위에서 본 그림: 화면 오른쪽 = +X? → 트랙마다 보기 좋게 그냥 x→오른쪽, z→아래
    this.map = { b, sc, ox: (W - (b.x1 - b.x0) * sc) / 2, oz: (W - (b.z1 - b.z0) * sc) / 2 };
    const c = document.createElement('canvas'); c.width = W; c.height = W;
    const g = c.getContext('2d');
    g.lineJoin = 'round'; g.lineCap = 'round';
    const path = () => {
      g.beginPath();
      for (let i = 0; i <= T.n; i += 2) {
        const k = i % T.n;
        const [x, y] = this.mp(T.x[k], T.z[k]);
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.closePath();
    };
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 9; path(); g.stroke();
    g.strokeStyle = 'rgba(235,240,245,0.95)'; g.lineWidth = 4; path(); g.stroke();
    const [sx, sy] = this.mp(T.x[0], T.z[0]);
    g.fillStyle = '#fff'; g.fillRect(sx - 4, sy - 4, 8, 8);
    g.strokeStyle = '#000'; g.lineWidth = 1; g.strokeRect(sx - 4, sy - 4, 8, 8);
    this.mapBg = c;
  }

  mp(x, z) {
    const m = this.map;
    return [m.ox + (x - m.b.x0) * m.sc, m.oz + (z - m.b.z0) * m.sc];
  }

  message(txt, secs = 1.6, big = true) {
    this.center.textContent = txt;
    this.center.classList.toggle('small', !big);
    this.msgUntil = performance.now() + secs * 1000;
  }

  update(session, localSlot, view, names, netInfo) {
    const sim = session.sim, f = sim.gs.frame;
    const me = sim.cars[localSlot] || sim.cars[0];
    const st = me.st;
    const order = sim.standings();
    const myPos = order.indexOf(me.slot) + 1;
    setText(this.pos, `${myPos}/${sim.cars.length}`);
    const lapNow = Math.min(sim.laps, st.lap + 1);
    setText(this.lap, st.fin ? '완주' : `랩 ${lapNow}/${sim.laps}`);
    const cur = f >= GO_FRAME && !st.fin ? f - st.lapStart : 0;
    // 글자 칸은 한 번만 만들고, 바뀐 글자만 고친다 (매 프레임 새로 만들면 느린 PC에서 끊긴다)
    if (!this.timeEls) {
      this.timeEls = [['현재', ''], ['지난', ''], ['최고', 'best']].map(([label, cls]) => {
        const d = el('div', cls, this.times); el('span', 'k', d).textContent = label; return el('span', 'v', d);
      });
    }
    setText(this.timeEls[0], fmtTime(cur));
    setText(this.timeEls[1], fmtTime(st.last));
    setText(this.timeEls[2], fmtTime(st.best));
    // 속도·기어·회전
    const kmh = Math.round(Math.abs(me.out.fwd) * 3.6);
    setText(this.speed, String(kmh));
    setText(this.gear, st.gear < 0 ? 'R' : st.shiftT > 0 ? '·' : String(st.gear));
    const e = me.spec.engine;
    const r = Math.max(0, Math.min(1, st.rpm / (e.redline * 1.05)));
    this.rpmFill.style.width = (r * 100).toFixed(1) + '%';
    this.rpmFill.classList.toggle('hot', st.rpm > e.redline * 0.92);
    this.rpmRed.style.left = (e.redline / (e.redline * 1.05) * 100).toFixed(1) + '%';
    const as = [];
    if (me.absOn) as.push('ABS');
    if (me.tcsOn) as.push('TCS');
    setText(this.assist, as.join(' ') || '보조 끔');
    this.assist.classList.toggle('esc', !!me.out.esc);
    // 순위표 (줄은 한 번만 만든다)
    if (!this.rows || this.rows.length !== order.length) {
      this.board.innerHTML = '';
      this.rows = order.map(() => {
        const d = el('div', 'row', this.board);
        return { d, dot: el('span', 'dot', d), n: el('span', 'n', d), g: el('span', 'g', d), cls: '' };
      });
    }
    const leader = sim.cars[order[0]].st;
    order.forEach((k, i) => {
      const c = sim.cars[k], r = this.rows[i];
      const cls = 'row' + (k === me.slot ? ' me' : '') + (c.st.dc ? ' dc' : '');
      if (r.cls !== cls) { r.d.className = cls; r.cls = cls; }
      const col = '#' + PAINT[k % PAINT.length].toString(16).padStart(6, '0');
      if (r.col !== col) { r.dot.style.background = col; r.col = col; }
      setText(r.n, `${i + 1}. ${names[k] || c.name || '?'}`);
      let gap = '';
      if (c.st.fin) gap = fmtTime(c.st.fin - GO_FRAME);
      else if (i > 0) {
        const dd = leader.prog - c.st.prog;
        gap = dd > sim.T.L ? `+${Math.floor(dd / sim.T.L)}랩` : `+${Math.max(0, dd).toFixed(0)}m`;
      }
      setText(r.g, gap);
    });
    // 가운데 메시지
    const now = performance.now();
    if (f < GO_FRAME) {
      const left = Math.ceil((GO_FRAME - f) / FPS);
      this.center.textContent = f < FPS ? '준비' : String(left);
      this.center.classList.remove('small');
      this.msgUntil = 0;
    } else if (f < GO_FRAME + FPS) {
      this.center.textContent = '출발!';
    } else if (now > this.msgUntil) this.center.textContent = '';
    if (st.lap !== this.lastLap) {
      if (st.fin) this.message(`완주! ${myPos}위`, 5);
      else if (st.lap === sim.laps - 1) this.message('마지막 랩!', 2);
      else if (st.lap > 0) this.message(`랩 ${st.lap + 1}`, 1.5);
      this.lastLap = st.lap;
    }
    // 아래 안내
    let sub = '';
    if (st.wrongT > 1) sub = '역주행! 방향을 돌리세요 (R: 되돌리기)';
    else if (st.ghostT > 0) sub = '되돌림 — 잠시 통과 모드';
    else if (sim.gs.first >= 0 && !st.fin && !sim.gs.over) {
      const left = Math.max(0, Math.ceil((sim.gs.first + 90 * FPS - f) / FPS));
      sub = `1위가 들어왔습니다 · ${left}초 안에 완주하세요`;
    }
    setText(this.sub, sub);
    // 미니맵
    const g = this.mapC.getContext('2d');
    g.clearRect(0, 0, 220, 220);
    if (this.mapBg) g.drawImage(this.mapBg, 0, 0);
    for (let k = sim.cars.length - 1; k >= 0; k--) {
      const c = sim.cars[k];
      const [x, y] = this.mp(c.st.px, c.st.pz);
      g.beginPath(); g.arc(x, y, k === me.slot ? 6 : 5, 0, Math.PI * 2);
      g.fillStyle = '#' + PAINT[k % PAINT.length].toString(16).padStart(6, '0');
      g.fill(); g.lineWidth = 2; g.strokeStyle = k === me.slot ? '#fff' : '#000'; g.stroke();
    }
    // 이름표 (다른 차 위)
    while (this.nameEls.length < sim.cars.length) this.nameEls.push(el('div', 'name', this.labels));
    for (let k = 0; k < sim.cars.length; k++) {
      const ne = this.nameEls[k];
      if (k === me.slot || !view) { ne.style.display = 'none'; continue; }
      const p = view.screenPos(k, this.sp);
      if (!p.vis || p.dist > 250) { ne.style.display = 'none'; continue; }
      ne.style.display = 'block';
      setText(ne, names[k] || sim.cars[k].name || '');
      ne.style.transform = `translate(${p.x.toFixed(0)}px, ${p.y.toFixed(0)}px) translate(-50%, -100%)`;
      ne.style.opacity = String(Math.max(0.35, 1 - p.dist / 250));
    }
    setText(this.net, netInfo || '');
  }
}
