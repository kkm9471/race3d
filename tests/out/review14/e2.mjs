import {Room,Storage,Sock,ctxOf,msg,hi,adv} from './h.mjs';
const st=new Storage(),socks=[];const room=new Room(ctxOf(st,socks),{});
const v=new Sock('victim');socks.push(v);await hi(room,v,'피해자','tv');
// 정상 한 명: 10초에 6줄
let n=0;const a=new Sock('a');socks.push(a);await hi(room,a,'정상','ta');
for(let i=0;i<40;i++){adv(250);await msg(room,a,{t:'chat',text:'x'+i});}
console.log('정상 사용자 10초(40번 시도)에 통과한 줄:',v.out.filter(m=>m.t==='chat'&&m.m.name==='정상').length);
// 공격자: 새 연결+새 tok, 6줄, bye 반복
v.out.length=0;const p0=st.puts;let inMsgs=0;
for(let k=0;k<20;k++){
  const s=new Sock('atk'+k);socks.push(s);
  await hi(room,s,'스팸','atk'+k);inMsgs++;
  for(let i=0;i<6;i++){adv(710);await msg(room,s,{t:'chat',text:'광고'+k+'_'+i});inMsgs++;}
  await msg(room,s,{t:'bye'});inMsgs++;s.closed=1000;
}
const got=v.out.filter(m=>m.t==='chat').length;
console.log(`공격자 20회 순환(가상 시간 ${Math.round(20*6*0.71)}초): 피해자가 받은 대화 ${got}줄 = ${(got/(20*6*0.71)).toFixed(2)}줄/초 (정상 한도 0.6줄/초), 이 줄 중 1사람 한도(6줄/10초)로 걸러진 것 0`);
console.log('서버 저장소 쓰기 횟수(순환 20회):',st.puts-p0,' 들어온 메시지:',inMsgs);
console.log('피해자 대화창에 남은 마지막 20줄 중 스팸 비율:',room.chat.filter(m=>m.name==='스팸').length+'/'+room.chat.length);
// 쓰기량: 방 안 내 인원
console.log('방 인원(떠난 사람 정리 후):',room.players.size);
