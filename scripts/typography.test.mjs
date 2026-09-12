import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Resvg} from '@resvg/resvg-js';
import {buildAssetSvg, svgPath, validateTextLayout} from './redesign-assets.mjs';

const catalog=JSON.parse(readFileSync(new URL('../catalog.json',import.meta.url)));
const options={font:{loadSystemFonts:false}};

test('every asset has complete outlined text inside its safe area, without overlaps',()=>{
  for(const asset of catalog.assets) {
    const {svg,texts}=buildAssetSvg(asset);
    assert.doesNotMatch(svg,/<text[\s>]/,asset.id);
    const paths=svg.match(/<path\b[^>]+\/>/g);
    assert.equal(paths.length,texts.length,asset.id);
    paths.forEach((path,i)=>{
      const t=texts[i];
      const renderer=new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="4000">${path}</svg>`,options);
      const actual=renderer.getBBox();
      assert.ok(actual,`${asset.id}: missing text ${t.value}`);
      for(const key of ['x','y','width','height']) {
        assert.ok(Math.abs(actual[key]-t[key])<2,`${asset.id}: incomplete glyph path ${t.value}, ${key}: ${actual[key]} vs ${t[key]}`);
      }
    });
  }
});

test('rounded negative zero cannot merge SVG coordinates or truncate lettering',()=>{
  assert.equal(svgPath({commands:[{type:'M',x:25,y:-0.00000001},{type:'L',x:30,y:5},{type:'Z'}]}),'M 25 0 L 30 5 Z ');
});

test('bounds validator rejects cropped and colliding text',()=>{
  const safe={x:10,y:10,width:100,height:100};
  const text={value:'headline',x:20,y:20,width:80,height:20};
  assert.throws(()=>validateTextLayout('fixture',[{...text,width:100}],safe),/outside safe crop/);
  assert.throws(()=>validateTextLayout('fixture',[text,{...text,value:'caption',y:30}],safe),/overlapping text/);
});

test('photographs are embedded and visible in each photographic layout',()=>{
  for(const id of ['facebook-cover','instagram-stories-challenge-01','instagram-feed-02-duels','youtube-thumbnails-02-duel','youtube-banner']) {
    const asset=catalog.assets.find(a=>a.id===id);
    const {svg}=buildAssetSvg(asset);
    assert.match(svg,/<image href="data:image\/png;base64,/,id);
    const renderer=new Resvg(svg,{...options,fitTo:{mode:'width',value:320}});
    assert.deepEqual(renderer.imagesToResolve(),[],id);
    const rendered=renderer.render(), pixels=rendered.pixels;
    const colors=new Set();
    // Sample the photograph, away from the left-hand text and blank header.
    for(let y=Math.floor(rendered.height*.4);y<rendered.height*.8;y++) {
      for(let x=Math.floor(rendered.width*.6);x<rendered.width*.95;x++) {
        const p=(y*rendered.width+x)*4;
        colors.add(`${pixels[p]},${pixels[p+1]},${pixels[p+2]}`);
      }
    }
    assert.ok(colors.size>500,`${id}: photograph missing or flattened (${colors.size} colors)`);
  }
});

test('gallery uses content-versioned artwork and revalidates the catalogue',()=>{
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  assert.match(app,/asset\.sha256\.slice\(0,12\)/);
  assert.match(app,/fetch\(assetUrl\(asset\)/);
  assert.match(app,/src:assetUrl\(asset\)/);
  assert.match(app,/href:assetUrl\(asset\)/);
  assert.match(app,/fetch\('catalog\.json', \{credentials:'omit', cache:'no-cache'\}/);
});
