import puppeteer from 'puppeteer-core';import fs from 'node:fs';
const css=fs.readFileSync('web/style.css','utf8');
const b=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new'});
const p=await b.newPage();await p.setContent(`<style>${css}</style><div id="l-chat-log" class="chat-log"></div>`);
const r=await p.evaluate(()=>{const log=document.getElementById('l-chat-log');const mk=n=>{const d=document.createElement('div');d.className='ln';const w=document.createElement('span');w.className='who';w.append(n);const t=document.createElement('span');t.textContent='ABC 안녕';d.append(w,t);log.appendChild(d);const rg=document.createRange();rg.selectNodeContents(t);const a=t.getBoundingClientRect();
 const tn=t.firstChild;const x=(i)=>{const q=document.createRange();q.setStart(tn,i);q.setEnd(tn,i+1);return Math.round(q.getBoundingClientRect().left);};return {A:x(0),C:x(2)};};
 return {정상:mk('동우'),RLO:mk('\u202e동우')};});
console.log(JSON.stringify(r),'(정상: A 가 C 보다 왼쪽 / RLO: A 가 C 보다 오른쪽이면 글이 뒤집혀 보임)');await b.close();
