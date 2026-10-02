import {Room,Storage,Sock,ctxOf,msg,hi,adv} from './h.mjs';
const st=new Storage(),socks=[];const room=new Room(ctxOf(st,socks),{});
const v=new Sock('victim');socks.push(v);await hi(room,v,'피해자','tv');
const p0=st.puts;
for(let k=0;k<100;k++){const s=new Sock('a'+k);socks.push(s);await hi(room,s,'스팸','a'+k);await msg(room,s,{t:'chat',text:'광고'+k});await msg(room,s,{t:'bye'});s.closed=1000;}
console.log('가상 시간 0초, 100회: 피해자가 받은 줄',v.out.filter(m=>m.t==='chat').length,'/ 저장소 쓰기',st.puts-p0, '/ 메시지 300개');
