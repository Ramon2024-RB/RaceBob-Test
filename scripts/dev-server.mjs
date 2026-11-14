// Zero-dependency VS-Code preview server for the bundled app.
// Usage: npm run dev   (then visit http://localhost:4173)
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const base = resolve(fileURLToPath(new URL('../www/', import.meta.url)));
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.png':'image/png', '.webmanifest':'application/manifest+json', '.json':'application/json'};
const port = Number(process.env.PORT || 4173);
http.createServer(async (request, response) => {
  try {
    const path = new URL(request.url || '/', 'http://localhost').pathname;
    const resolved = resolve(base, '.' + decodeURIComponent(path === '/' ? '/index.html' : path));
    if (resolved !== base && !resolved.startsWith(base + sep)) {
      response.writeHead(403); response.end('Forbidden'); return;
    }
    const bytes = await readFile(resolved);
    response.writeHead(200, {'Content-Type':(types[extname(resolved)] || 'application/octet-stream') + (['.html','.css','.js','.json','.webmanifest'].includes(extname(resolved))?'; charset=utf-8':''), 'Cache-Control':'no-cache'});
    response.end(bytes);
  } catch {
    response.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});
    response.end('Datei nicht gefunden');
  }
}).listen(port,'127.0.0.1',()=>{
  console.log(`RaceBob Vorschau: http://localhost:${port}`);
  console.log('Beenden mit Strg+C');
});
