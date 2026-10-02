import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const css=fs.readFileSync('web/style.css','utf8');
const html=`<style>${css}</style><body><div id="lobby" class="screen"><div class="chat"><div id="l-chat-log" class="chat-log"></div></div></div></body>`;
const b=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new'});
const p=await b.newPage();await p.setContent(html);
const r=await p.evaluate(async()=>{
 const CHAT_SHOW=60;
 function chatAdd(el){const log=document.getElementById('l-chat-log');const atEnd=log.scrollTop+log.clientHeight>=log.scrollHeight-8;log.querySelector('.empty')?.remove();log.appendChild(el);while(log.children.length>CHAT_SHOW)log.firstChild.remove();if(atEnd||el.dataset.mine)log.scrollTop=log.scrollHeight;}
 const add=t=>{const d=document.createElement('div');d.className='ln';d.textContent=t;chatAdd(d);};
 for(let i=0;i<10;i++)add('전 '+i);
 const log=document.getElementById('l-chat-log');const before=[log.scrollTop,log.scrollHeight-log.clientHeight];
 document.getElementById('lobby').classList.add('hidden');
 for(let i=0;i<10;i++)add('레이스중 '+i);
 document.getElementById('lobby').classList.remove('hidden');
 const after=[log.scrollTop,log.scrollHeight-log.clientHeight];
 const vis=[...log.children].filter(c=>{const r=c.getBoundingClientRect(),q=log.getBoundingClientRect();return r.top>=q.top&&r.bottom<=q.bottom;}).map(c=>c.textContent);
 // bidi: 이름에 RLO
 const d=document.createElement('div');d.className='ln';const w=document.createElement('span');w.className='who';w.append('\u202e동우');const t=document.createElement('span');t.textContent='abc 123 안녕';d.append(w,t);log.appendChild(d);
 return {before,after,vis,bidiText:d.innerText};
});
console.log('레이스 전 맨 아래 위치(scrollTop, 최대):',r.before,'/ 대기실 복귀 직후:',r.after,'/ 보이는 줄:',r.vis.join(','));
console.log('RLO 이름 줄 innerText:',JSON.stringify(r.bidiText));
await p.screenshot({path:'tests/out/review14/chat.png'});
await b.close();
