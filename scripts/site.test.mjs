import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, cp, rm, writeFile, symlink, unlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {validateFiles, routeFile, validatePNG} from './files.mjs';
import {root} from './build.mjs';

test('public allowlist contains all reviewed assets and no source or private files',async () => {
  const {catalog,publicFiles} = await validateFiles(root);
  assert.equal(catalog.assets.length,44);
  assert.equal(publicFiles.length,50);
  assert.ok(catalog.posts.find(p=>p.id==='instagram-highlights').assets.includes('instagram-highlights-global'));
  assert.equal(routeFile('/instagram/highlights/global.png',publicFiles),'instagram/highlights/global.png');
  for (const file of ['.git/config','.env','IMPORT-AUDIT.json','README.md','scripts/serve.mjs','sources/provenance.json','PumpDuel-Social-Brand-Kit.zip']) assert.equal(routeFile('/'+file,publicFiles),null);
  assert.equal(routeFile('/',publicFiles),'index.html');
  assert.equal(routeFile('/instagram/profile.png?x=1',publicFiles),'instagram/profile.png');
  for (const path of ['/../index.html','/%2e%2e/index.html','/instagram/../index.html','//index.html','/%00index.html','/%ZZ','/instagram%5cprofile.png']) assert.equal(routeFile(path,publicFiles),null,path);
  for (const post of catalog.posts.filter(p => p.kind.startsWith('Story'))) assert.deepEqual(post.assets.map(id => catalog.assets.find(a => a.id === id).file.split('-').pop()),['01.png','02.png']);
});

test('modified files, symlinks and unreviewed image metadata fail closed',async () => {
  const temporary = await mkdtemp(resolve(tmpdir(),'pumpduel-site-check-'));
  try {
    const {publicFiles} = await validateFiles(root);
    for (const file of publicFiles) await cp(resolve(root,file),resolve(temporary,file),{recursive:true});
    const image = resolve(temporary,'instagram/profile.png');
    await writeFile(image,'not the reviewed photo');
    await assert.rejects(validateFiles(temporary),/integrity mismatch/);
    await unlink(image);
    await symlink(resolve(root,'instagram/profile.png'),image);
    await assert.rejects(validateFiles(temporary),/Symlink/);
    const png = await readFile(resolve(root,'instagram/profile.png'));
    const tampered = Buffer.from(png);
    tampered.write('eXIf',12,'ascii');
    assert.throws(() => validatePNG(tampered,'metadata.png'),/Unreviewed/);
  } finally { await rm(temporary,{recursive:true,force:true}); }
});
