globalThis.WebSocketRequestResponsePair = class {};
export const { Room } = await import('../../../server/src/room.js');
export let now = 1_000_000;
Date.now = () => now;
export const adv = ms => { now += ms; };
export class Storage { constructor(){this.m=new Map();this.puts=0;} async get(k){return this.m.has(k)?structuredClone(this.m.get(k)):undefined;} async put(k,v){this.puts++;this.m.set(k,structuredClone(v));} }
export class Sock { constructor(n){this.name=n;this.out=[];this.att={id:null,c:crypto.randomUUID()};this.closed=null;} send(s){this.out.push(JSON.parse(s));} close(c){this.closed=c;} serializeAttachment(a){this.att=structuredClone(a);} deserializeAttachment(){return this.att;} last(t){for(let i=this.out.length-1;i>=0;i--)if(this.out[i].t===t)return this.out[i];return null;} }
export const ctxOf=(st,socks)=>({storage:st,getWebSockets:()=>socks.filter(s=>s.closed===null),setWebSocketAutoResponse(){},acceptWebSocket(){}});
export const msg=(r,s,o)=>r.webSocketMessage(s,JSON.stringify(o));
export const hi=(r,s,name,tok,x={})=>msg(r,s,{t:'hi',v:5,ver:'x',name,tok,car:'baram',assist:true,...x});
