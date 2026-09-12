import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {build} from './build.mjs';
import {routeFile,contentType} from './files.mjs';

const {output,publicFiles} = await build();
const server = createServer(async (request,response) => {
  response.setHeader('X-Content-Type-Options','nosniff');
  response.setHeader('Referrer-Policy','no-referrer');
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405,{'Allow':'GET, HEAD'}); response.end(); return; }
  const file = routeFile(request.url,publicFiles);
  if (!file) { response.writeHead(404); response.end('Not found'); return; }
  try {
    const buffer = await readFile(resolve(output,file));
    response.writeHead(200,{'Content-Type':contentType(file),'Content-Length':buffer.length,'Cache-Control':'no-cache'});
    response.end(request.method === 'HEAD' ? undefined : buffer);
  } catch { response.writeHead(404); response.end('Not found'); }
});
server.listen(8879,'127.0.0.1',() => console.log('PumpDuel asset preview: http://127.0.0.1:8879'));
