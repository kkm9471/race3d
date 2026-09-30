// 조작: 키보드(방향키/WASD) + 게임패드 → 입력 한 프레임
//
// 키보드는 켜짐/꺼짐뿐이라 조향을 부드럽게 올리는 건 시뮬레이션이 한다(kb 플래그).
// 게임패드는 아날로그 값을 그대로(양자화만) 보낸다.
//   가속 ↑/W, 브레이크·후진 ↓/S, 조향 ←→/AD, 사이드브레이크 Space, 차 되돌리기 R, 시점 C, 뒤보기 B

export class Controls {
  constructor() {
    this.keys = new Set();
    this.padIndex = -1;
    this.lastPad = null;
    this.onAction = null;      // (이름) → 시점 바꾸기 등 즉시 동작
    this._down = e => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const k = e.code;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(k)) e.preventDefault();
      if (!this.keys.has(k)) {
        if (k === 'KeyC' && this.onAction) this.onAction('camera');
        if (k === 'KeyM' && this.onAction) this.onAction('mute');
        if (k === 'Escape' && this.onAction) this.onAction('menu');
        if (k === 'Tab' && this.onAction) { e.preventDefault(); this.onAction('board'); }
      }
      this.keys.add(k);
    };
    this._up = e => { this.keys.delete(e.code); };
    this._blur = () => this.keys.clear();       // 창을 벗어나면 누른 키가 계속 눌린 채로 남지 않게
    window.addEventListener('keydown', this._down);
    window.addEventListener('keyup', this._up);
    window.addEventListener('blur', this._blur);
    this._pc = e => { this.padIndex = e.gamepad.index; };
    this._pd = e => { if (e.gamepad.index === this.padIndex) this.padIndex = -1; };
    window.addEventListener('gamepadconnected', this._pc);
    window.addEventListener('gamepaddisconnected', this._pd);
  }

  dispose() {
    window.removeEventListener('keydown', this._down);
    window.removeEventListener('keyup', this._up);
    window.removeEventListener('blur', this._blur);
    window.removeEventListener('gamepadconnected', this._pc);
    window.removeEventListener('gamepaddisconnected', this._pd);
  }

  pad() {
    if (!navigator.getGamepads) return null;
    const list = navigator.getGamepads();
    if (this.padIndex >= 0 && list[this.padIndex]) return list[this.padIndex];
    for (const g of list) if (g && g.connected) { this.padIndex = g.index; return g; }
    return null;
  }

  /** 지금 입력 → { steer, thr, brk, hb, rst, kb, look } */
  read() {
    const K = this.keys;
    const left = K.has('ArrowLeft') || K.has('KeyA'), right = K.has('ArrowRight') || K.has('KeyD');
    const up = K.has('ArrowUp') || K.has('KeyW'), down = K.has('ArrowDown') || K.has('KeyS');
    let steer = (right ? 1 : 0) - (left ? 1 : 0);
    let thr = up ? 1 : 0, brk = down ? 1 : 0;
    let hb = K.has('Space') ? 1 : 0, rst = K.has('KeyR') ? 1 : 0, look = K.has('KeyB') ? 1 : 0;
    let kb = 1;
    const g = this.pad();
    if (g) {
      const dz = v => (Math.abs(v) < 0.12 ? 0 : (v - Math.sign(v) * 0.12) / 0.88);
      const sx = dz(g.axes[0] || 0);
      // 표준 매핑: 6 = 왼쪽 트리거(브레이크), 7 = 오른쪽 트리거(가속), 0 = A(사이드), 3 = Y(리셋), 2 = X(뒤보기)
      const rt = g.buttons[7] ? g.buttons[7].value : 0, lt = g.buttons[6] ? g.buttons[6].value : 0;
      const a = g.buttons[0] && g.buttons[0].pressed, y = g.buttons[3] && g.buttons[3].pressed;
      const x = g.buttons[2] && g.buttons[2].pressed;
      const used = Math.abs(sx) > 0 || rt > 0.02 || lt > 0.02 || a || y;
      if (used) {
        // 패드를 만지고 있으면 패드 우선 (감도 곡선: 가운데는 둔하게)
        steer = Math.sign(sx) * Math.pow(Math.abs(sx), 1.5);
        thr = Math.max(thr, rt); brk = Math.max(brk, lt);
        kb = (left || right) && !sx ? 1 : 0;
        if (kb) steer = (right ? 1 : 0) - (left ? 1 : 0);
      }
      if (a) hb = 1;
      if (y) rst = 1;
      if (x) look = 1;
      // 시점 전환: 오른쪽 스틱 누르기 또는 Back
      const cam = (g.buttons[8] && g.buttons[8].pressed) || (g.buttons[11] && g.buttons[11].pressed);
      if (cam && !this._camHeld && this.onAction) this.onAction('camera');
      this._camHeld = cam;
    }
    return { steer, thr, brk, hb, rst, kb, look };
  }
}
