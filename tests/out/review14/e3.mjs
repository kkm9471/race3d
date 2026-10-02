import {Room,Storage,Sock,ctxOf,msg,hi,adv} from './h.mjs';
const lobbyPaints=r=>r.lobbyView().players.map(p=>p.paint);
// (a) 레이스 중 색 바꾸기
{
const st=new Storage(),socks=[];const room=new Room(ctxOf(st,socks),{});
const a=new Sock('a'),b=new Sock('b');socks.push(a,b);await hi(room,a,'A','ta');await hi(room,b,'B','tb');
await msg(room,b,{t:'ready',on:true});await msg(room,a,{t:'start'});clearInterval(room.tickTimer);
console.log('(a) 출발 시 cfg 색',room.race.cfg.players.map(p=>p.paint),'phase',room.phase);
await msg(room,b,{t:'paint',paint:15});await msg(room,b,{t:'car',car:'kkoma'});
console.log('    레이스 중 색·차 바꾸기 허용됨 → 대기실 목록',lobbyPaints(room),room.lobbyView().players.map(p=>p.car),' / 레이스 cfg',room.race.cfg.players.map(p=>p.paint+'/'+p.car));
await msg(room,b,{t:'chat',text:'hi'});console.log('    그 뒤 대화 점 색',b.last('chat').m.paint,'(화면 속 차 색은',room.race.cfg.players[1].paint,')');
// 레이스 중 재접속 → welcome cfg
const b2=new Sock('b2');socks.push(b2);b.closed=1000;await room.webSocketClose(b);await hi(room,b2,'B','tb');
console.log('    재접속 welcome 의 cfg 색',b2.last('welcome').race.cfg.players.map(p=>p.paint),'lobby 색',b2.last('welcome').lobby.players.map(p=>p.paint));
}
// (b) 저장소에 색이 없던 옛 방이 깨어난 경우
{
const st=new Storage(),socks=[];
await st.put('players',[{id:'p1',name:'옛A',car:'baram',ready:false,assist:true,tok:'ta',order:2,ver:'x',leftAt:0},{id:'p2',name:'옛B',car:'baram',ready:false,assist:true,tok:'tb',order:3,ver:'x',leftAt:0}]);
await st.put('settings',{track:'circuit',laps:3,host:'p1',nextId:3,records:{}});
const room=new Room(ctxOf(st,socks),{});
const a=new Sock('a'),b=new Sock('b');socks.push(a,b);
await hi(room,a,'옛A','ta');await hi(room,b,'옛B','tb');
console.log('(b) 색 없는 옛 저장본: 대기실 색',lobbyPaints(room),' 메모리 값',[...room.players.values()].map(p=>p.paint));
const room2=new Room(ctxOf(st,socks),{}); // 잠들었다 깸
await msg(room2,a,{t:'ready',on:true});
console.log('    잠들었다 깬 뒤 색',room2.lobbyView().players.map(p=>p.paint),' (둘 다 0 = 겹침)');
}
// (c) 색 바꾼 뒤 소켓이 정리 없이 사라진(저장 안 된) 경우 : paint 는 저장 안 함
{
const st=new Storage(),socks=[];let room=new Room(ctxOf(st,socks),{});
const a=new Sock('a'),b=new Sock('b');socks.push(a,b);await hi(room,a,'A','ta');await hi(room,b,'B','tb');
await msg(room,a,{t:'paint',paint:17});
const saved=(await st.get('players')).find(p=>p.id==='p1').paint;
console.log('(c) 색을 17로 바꾼 직후 저장소의 색',saved,'(paint 메시지는 save 를 안 부른다)');
// 두 사람 모두 닫고(close 이벤트 없이 evict 가정) 새 방에서 tok 로 재접속
room=new Room(ctxOf(st,[]),{});const a2=new Sock('a2');await hi(room,a2,'A','ta');
console.log('    close 이벤트 없이 방이 내려갔다 올라온 뒤 내 색',room.players.get('p1').paint);
}
// (d) 재접속 시 hi.paint 무시 / 새로 만든 자리
{
const st=new Storage(),socks=[];const room=new Room(ctxOf(st,socks),{});
const a=new Sock('a');socks.push(a);await hi(room,a,'A','ta');
const b=new Sock('b');socks.push(b);await hi(room,b,'B','tb');await msg(room,b,{t:'paint',paint:9});
await room.webSocketClose(b);b.closed=1000;
const b2=new Sock('b2');socks.push(b2);await hi(room,b2,'B','tb',{paint:4});
console.log('(d) 재접속 hi.paint=4 보냈지만 서버 색',room.players.get('p2').paint,'(서버 값이 이김 — 클라이언트 app.paint=4 와 어긋나면 화면은 서버 값 사용)');
}
