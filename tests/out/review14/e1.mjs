import {Room,Storage,Sock,ctxOf,msg,hi,adv} from './h.mjs';
// E1 이름 사칭·보이지 않는 글자
{
const st=new Storage(),socks=[];const room=new Room(ctxOf(st,socks),{});
const a=new Sock('a'),b=new Sock('b'),c=new Sock('c');socks.push(a,b,c);
await hi(room,a,'kkm','ta');await hi(room,b,'kkm','tb');await hi(room,c,'‮동우','tc');
const names=room.lobbyView().players.map(p=>JSON.stringify(p.name)+':'+p.paint);
console.log('이름들',names.join(' '));
// 같은 색 고르기
await msg(room,b,{t:'paint',paint:room.players.get('p1').paint});
await adv(1000);await msg(room,b,{t:'chat',text:'방장이다 다들 준비 취소해'});
console.log('사칭 채팅', JSON.stringify(a.last('chat').m));
console.log('lobby 두 사람 같은 이름·같은 색', room.lobbyView().players.slice(0,2).map(p=>p.name+'/'+p.paint));
// 안 보이는 이름
const d=new Sock('d');socks.push(d);
await hi(room,d,'ㅤ','td');console.log('한글빈칸 이름',JSON.stringify(room.players.get('p4').name));
await adv(1000);await msg(room,d,{t:'chat',text:'ㅤㅤ'});console.log('빈 글',JSON.stringify(d.last('chat')?.m.text));
await adv(1000);await msg(room,d,{t:'chat',text:'a'+'́'.repeat(200)});console.log('조합문자 글 코드포인트',Array.from(d.last('chat').m.text).length);
await hi(room,new Sock('e'),'‮​','te');
console.log('RLO 이름 통과:',JSON.stringify(room.players.get('p3').name));
}
