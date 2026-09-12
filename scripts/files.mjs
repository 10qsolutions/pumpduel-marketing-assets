import {readFile, realpath, stat} from 'node:fs/promises';
import {resolve, relative, extname} from 'node:path';
import {createHash} from 'node:crypto';

export const pageFiles = ['index.html','styles.css','app.js','catalog.json','fonts/BarlowCondensed-Black.ttf','fonts/OFL.txt'];
const assetPath = /^(instagram|facebook|tiktok|youtube|x)\/[a-z0-9\/-]+\.(png|jpg|jpeg|mp4)$/;
const mediaTypes = {'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.mp4':'video/mp4'};
const privateText = /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----|\b(?:ghp|github_pat|sk_live)_[A-Za-z0-9_]{16,}|\bsk-[A-Za-z0-9_-]{24,}|\/Users\/|\/private\/(?:tmp|var)\/|\bAKIA[A-Z0-9]{16}\b/;

export async function validateFiles(root) {
  const canonical = await realpath(root);
  const catalog = JSON.parse(await readFile(resolve(root,'catalog.json'),'utf8'));
  if (!Array.isArray(catalog.assets) || !catalog.assets.length || !Array.isArray(catalog.posts)) throw new Error('Invalid asset catalogue');
  const ids = new Set();
  const paths = new Set();
  for (const asset of catalog.assets) {
    if (!assetPath.test(asset.file) || asset.file.split('/').some(part => !part || part === '.' || part === '..') || paths.has(asset.file) || ids.has(asset.id)) throw new Error('Invalid or duplicate asset path');
    if (mediaTypes[extname(asset.file)] !== asset.type || !Number.isSafeInteger(asset.bytes) || asset.bytes <= 0 || !/^[a-f0-9]{64}$/.test(asset.sha256)) throw new Error('Invalid asset metadata');
    ids.add(asset.id); paths.add(asset.file);
  }
  const referenced = new Set();
  for (const post of catalog.posts) {
    if (!catalog.platforms.some(platform => platform.id === post.platform) || !post.assets.length) throw new Error('Invalid post');
    for (const id of post.assets) { if (!ids.has(id)) throw new Error('Post references a missing asset'); referenced.add(id); }
  }
  if (referenced.size !== ids.size) throw new Error('Unlisted asset in catalogue');
  const publicFiles = [...pageFiles, ...paths];
  for (const file of publicFiles) {
    const expected = resolve(canonical,file);
    const actual = await realpath(resolve(root,file));
    if (actual !== expected || relative(canonical,actual).startsWith('..')) throw new Error(`Symlink or external file refused: ${file}`);
    if (!(await stat(actual)).isFile()) throw new Error(`Not a regular file: ${file}`);
    const buffer = await readFile(actual);
    const asset = catalog.assets.find(item => item.file === file);
    if (asset && (buffer.length !== asset.bytes || createHash('sha256').update(buffer).digest('hex') !== asset.sha256)) throw new Error(`Asset integrity mismatch: ${file}`);
    if (file.endsWith('.png')) validatePNG(buffer, file);
    if (/\.(html|css|js|json)$/.test(file) && privateText.test(buffer.toString('utf8'))) throw new Error(`Private data pattern in public file: ${file}`);
  }
  return {catalog, publicFiles};
}

export function validatePNG(buffer, name) {
  if (!buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error(`Not a PNG: ${name}`);
  const allowed = new Set(['IHDR','IDAT','IEND','iCCP','pHYs','sRGB','gAMA','cHRM','PLTE','tRNS']);
  let offset = 8, ended = false;
  while(offset < buffer.length) {
    if (offset+12 > buffer.length || ended) throw new Error(`Invalid PNG structure: ${name}`);
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii',offset+4,offset+8);
    if (offset+12+length > buffer.length || !allowed.has(type)) throw new Error(`Unreviewed PNG metadata or invalid chunk: ${name}`);
    ended = type === 'IEND';
    offset += 12+length;
  }
  if (!ended) throw new Error(`Incomplete PNG: ${name}`);
}

export function routeFile(url, publicFiles) {
  try {
    const rawPath = url.split('?')[0];
    const path = decodeURIComponent(rawPath);
    if (!path.startsWith('/') || path.includes('\\') || path.includes('\0') || path.split('/').some(part => part === '.' || part === '..')) return null;
    const file = path === '/' ? 'index.html' : path.slice(1);
    return publicFiles.includes(file) ? file : null;
  } catch { return null; }
}

export function contentType(file) {
  return mediaTypes[extname(file)] || {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8'}[extname(file)] || 'application/octet-stream';
}
