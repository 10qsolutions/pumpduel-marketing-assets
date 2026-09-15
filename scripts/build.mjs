import {mkdir, copyFile, rm, lstat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {validateFiles} from './files.mjs';

export const root = resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function build() {
  const {catalog,globalPack,publicFiles} = await validateFiles(root);
  const output = resolve(root,'dist');
  try { if ((await lstat(output)).isSymbolicLink()) throw new Error('Refusing symlinked build directory'); }
  catch(error) { if (error.code !== 'ENOENT') throw error; }
  await rm(output,{recursive:true,force:true});
  for (const file of publicFiles) {
    await mkdir(dirname(resolve(output,file)),{recursive:true});
    await copyFile(resolve(root,file),resolve(output,file));
  }
  console.log(`Built ${catalog.assets.length} gallery assets and ${globalPack.assets.length} GLOBAL launch drafts. ${publicFiles.length} public files; source and private files excluded.`);
  return {output,publicFiles};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
