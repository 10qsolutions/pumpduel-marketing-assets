import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {series,chapters,platforms,compose,caption,renderInstagramGuide,worldwideCaption} from './global-entry-pack.mjs';
import {validateFiles} from './files.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(resolve(root,'global-pack.json'),'utf8'));
test('all nine approved codes map to the correct exercise and timeframe',()=>{
  assert.deepEqual(series.map(s=>s.code),['PUSHDAY','PUSHWK','PUSHMO','PULLDAY','PULLWK','PULLMO','SQUATDAY','SQUATWK','SQUATMO']);
  assert.equal(new Set(series.map(s=>s.url)).size,9);
  for(const s of series){assert.match(s.code,/^[A-Z]{6,8}$/);assert.equal(s.url,`https://pumpduel.com/c/${s.code}`);assert.equal(s.seriesUrl,`https://pumpduel.com/global/${s.workout}/${s.cadence}`);}
  assert.deepEqual(manifest.series,series);
});
test('posting stays on hold and no private drafts or invented results enter the public pack',async()=>{
  assert.equal(manifest.status,'HOLD_FOR_WORKING_LINKS');assert.equal(manifest.postingApproved,false);assert.equal(manifest.namesApproved,true);
  assert.equal(manifest.assets.length,39);assert.equal(manifest.posts.length,30);
  assert.equal(manifest.tiktok.websiteLinkAvailable,false);
  assert.ok(manifest.posts.every(p=>p.status==='HOLD_FOR_WORKING_LINKS'));
  const {publicFiles}=await validateFiles(root);
  for(const file of ['global.html','global-guide.md','global-pack.json','scripts/global-entry-pack.mjs']){
    const text=readFileSync(resolve(root,file),'utf8');
    assert.doesNotMatch(text,/codex:\/\/|10qsolutions\/PumpDuel|\/Users\/|\/private\/|launch-status|PR #\d+|(?:password|access_token)\s*[:=]/i);
  }
  assert.ok(!publicFiles.some(f=>f.startsWith('campaign/')));
  assert.doesNotMatch(readFileSync(resolve(root,'catalog.json'),'utf8'),/global-(?:instagram|facebook|tiktok)/);
});
test('all platform exports are full-size outlined, non-overlapping and intact',()=>{
  for(const platform of platforms)for(const item of [...chapters,...series]){
    const layout=compose(item,platform),asset=manifest.assets.find(a=>a.id===`global-${platform}-${item.key}`);
    assert.deepEqual(asset.texts,layout.texts);assert.ok(!layout.svg.includes('<text'));assert.ok(layout.svg.includes('<path'));
    const png=readFileSync(resolve(root,asset.file));
    assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),platform==='facebook'?1350:1920);
    assert.equal(png.length,asset.bytes);assert.equal(createHash('sha256').update(png).digest('hex'),asset.sha256);
    if(platform==='instagram')assert.ok(layout.texts.every(t=>t.y+t.height<layout.stickerArea.y));
    if(item.code){assert.ok(layout.texts.some(t=>t.value===item.code));assert.ok(layout.texts.some(t=>t.value===`${item.label.toUpperCase()} · ${item.cadence.toUpperCase()}`));}
    assert.doesNotMatch(caption(item,platform),/link in bio|winner|prize|free|unlimited/i);
    assert.ok(caption(item,platform).includes((item.url||manifest.hub).replace('https://','')));
  }
  for(const p of platforms)assert.equal(new Set(manifest.assets.filter(a=>a.platform===p).map(a=>a.sha256)).size,13);
});
test('pack links are relative for project Pages and every downloadable file exists',()=>{
  const html=readFileSync(resolve(root,'global.html'),'utf8');
  assert.match(html,/HOLD POSTING/);assert.match(html,/Names approved/);
  for(const [,href]of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    if(href.startsWith('#')||href.startsWith('https://'))continue;
    assert.ok(!href.startsWith('/'));assert.ok(existsSync(resolve(root,href.split(/[?#]/)[0])),href);
  }
  assert.match(readFileSync(resolve(root,'index.html'),'utf8'),/href="global.html"/);
});

test('WORLDWIDE Instagram guide uses only the three hub-introduction frames in order',()=>{
  const guide=renderInstagramGuide(manifest);
  const index=readFileSync(resolve(root,'index.html'),'utf8');
  assert.ok(index.includes(guide),'regenerate the guide after changing its content or assets');
  const downloads=[...guide.matchAll(/href="([^"]+)" download/g)].map(match=>match[1]);
  assert.deepEqual(downloads,chapters.slice(0,3).map(chapter=>{
    const asset=manifest.assets.find(a=>a.id===`global-instagram-${chapter.key}`);
    return `${asset.file}?v=${asset.sha256.slice(0,12)}`;
  }));
  assert.match(guide,/skip frame 04/);
  assert.match(guide,/nine code-card invitations/);
  assert.match(guide,/Coming soon in the app/);
  assert.match(guide,/exact completed-round link/);
  assert.match(guide,/Highlight name: GLOBAL/);
  assert.doesNotMatch(worldwideCaption,/enter now|join now|link in bio/i);
});

test('WORLDWIDE guide has copyable fields, a cover save action and a direct link from the pack',()=>{
  const guide=renderInstagramGuide(manifest);
  for(const [,id]of guide.matchAll(/data-copy-guide="([^"]+)"/g))assert.ok(guide.includes(`id="${id}"`));
  assert.match(guide,/id="worldwide-hub-link" readonly value="https:\/\/pumpduel.com\/global"/);
  assert.match(guide,/id="worldwide-sticker-label" readonly value="Explore challenges"/);
  assert.match(guide,/data-save-global-cover/);
  const app=readFileSync(resolve(root,'app.js'),'utf8');
  assert.match(app,/location.hash === '#instagram-worldwide' \? 'instagram'/);
  assert.match(app,/\$\('#setup-guide'\)\.open = true/);
  assert.match(app,/control.dataset.copyGuide/);
  assert.match(readFileSync(resolve(root,'global.html'),'utf8'),/href="index.html#instagram-worldwide"/);
});
