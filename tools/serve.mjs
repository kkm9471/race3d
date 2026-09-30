// 로컬 확인용 정적 서버 (web/ 폴더). 사용법: node tools/serve.mjs [포트]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve('web');
const PORT = +(process.argv[2] || 8790);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  });
}).listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/`));
