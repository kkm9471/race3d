const WS = process.env.WS || 'wss://race3d-rooms.kkm9471.workers.dev/ws';
const R = 'D' + Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'Q');
const sleep = ms => new Promise(r => setTimeout(r, ms));
function mk(name, tok) {
  return new Promise(res => {
    const ws = new WebSocket(`${WS}?room=${R}`); const c = { ws, msgs: [] };
    ws.onmessage = e => { try { const m = JSON.parse(e.data); c.msgs.push(m); if (m.t === 'lobby' || m.t === 'err' || m.t === 'start') console.log(name, '<-', m.t, m.t === 'lobby' ? `phase=${m.lobby.phase} laps=${m.lobby.laps} rec=${JSON.stringify(m.lobby.records)}` : (m.text || '')); } catch { } };
    ws.onopen = () => { ws.send(JSON.stringify({ t: 'hi', v: 3, ver: 'test', name, tok, car: 'baram' })); res(c); };
  });
}
const A = await mk('A', 'ta'); await sleep(500);
const B = await mk('B', 'tb'); await sleep(500);
A.ws.send(JSON.stringify({ t: 'set', laps: 1 })); B.ws.send(JSON.stringify({ t: 'ready', on: true }));
await sleep(500);
A.ws.send(JSON.stringify({ t: 'start' }));
await sleep(21500);
const r = [[0, 9000, 3000], [1, 9500, 3100]];
A.ws.send(JSON.stringify({ t: 'done', r })); B.ws.send(JSON.stringify({ t: 'done', r }));
await sleep(3000);
A.ws.close(); B.ws.close();
