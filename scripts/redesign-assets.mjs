import {readFileSync} from 'node:fs';
import {readFile, writeFile, mkdir, mkdtemp, copyFile, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import opentype from 'opentype.js';
import {Resvg} from '@resvg/resvg-js';
import {validatePNG} from './files.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fonts = Object.fromEntries(Object.entries({
  display:'BarlowCondensed-Black.ttf', body:'Barlow-SemiBold.ttf',
}).map(([key, file]) => {
  const data = readFileSync(resolve(root,'fonts',file));
  return [key,opentype.parse(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength))];
}));
const colors = {ink:'#0c100d', lime:'#b7ff2a', paper:'#f5f3ea', muted:'#c4cbbc'};
const masterFiles = {
  community:'community-landscape.png', rivalry:'rivalry-portrait.png', challenge:'challenge-portrait.png',
};
const masterImages = new Map();

export function svgPath(path) {
  // Explicit separators also handle tiny negative coordinates rounded to zero.
  // opentype's packed serializer can join that zero onto the preceding number.
  const coordinates={M:['x','y'],L:['x','y'],Q:['x1','y1','x','y'],C:['x1','y1','x2','y2','x','y'],Z:[]};
  return path.commands.map(command=>`${command.type} ${coordinates[command.type].map(key=>Number(command[key].toFixed(3))).join(' ')}`).join(' ');
}
const themes = {
  start:{photo:'community',label:'FITNESS WITH FRIENDS',lines:['START WITH','YOUR PEOPLE.'],copy:'Daily workouts. Friendly competition.',badge:'Find your crew',steps:['Find a friend on PumpDuel.','Invite them to a duel or challenge.','Give each other a reason to train.']},
  habit:{photo:'community',label:'DAILY GROUP WORKOUTS',lines:['BUILD A HABIT.','TOGETHER.'],copy:'Your crew. Your daily reason to show up.',badge:'Train with friends',steps:['Create or join a private group.','Show up for the daily workout.','Keep each other coming back.']},
  duels:{photo:'rivalry',label:'LIVE DUELS',lines:['TURN REPS','INTO RIVALRY.'],copy:'One friend. One minute. Every rep counts.',badge:'Challenge a friend',steps:['Invite a friend to a live duel.','Train together against the clock.','See who gets the higher score.']},
  duel:{photo:'rivalry',label:'LIVE DUELS',lines:['60 SECONDS.','GAME ON.'],copy:'One friend. One minute. Every rep counts.',badge:'Challenge a friend',steps:['Invite a friend to a live duel.','Train together against the clock.','See who gets the higher score.']},
  challenge:{photo:'challenge',label:'FRIEND CHALLENGES',lines:['SET A SCORE.','DARE THEM.'],copy:'Take your turn. Let a friend take theirs.',badge:'Set the challenge',steps:['Choose a movement and a friend.','Complete your set and send the score.','They take their turn when ready.']},
  progress:{photo:'challenge',label:'YOUR REP HISTORY',lines:['SMALL WINS.','REAL PROGRESS.'],copy:'See your rep totals and recent activity.',badge:'Keep showing up',steps:['Complete a camera-counted set.','Check your rep totals and activity.','Come back and build on it.']},
  howto:{photo:'rivalry',label:'CAMERA-COUNTED REPS',lines:['PHONE READY.','YOU READY?'],copy:'Push-ups. Pull-ups. Squats. On iPhone.',badge:'Start your next set',steps:['Choose your movement.','Place your phone with your body in view.','Start your set. The camera counts.']},
};

function themeFor(id) {
  if (id.includes('progress')) return themes.progress;
  if (id.includes('how-to')) return themes.howto;
  if (id.includes('challenge')) return themes.challenge;
  if (id.includes('duels')) return themes.duels;
  if (id.includes('duel')) return themes.duel;
  if (id.includes('start')) return themes.start;
  return themes.habit;
}

// Text becomes exact glyph outlines before rasterisation: no CSS fonts, fallback
// fonts, browser-dependent tracking or ImageMagick font resolution.
function outline(value, size, face='body', spacing=0) {
  const font = fonts[face];
  for (const character of value) {
    if (!font.charToGlyphIndex(character)) throw new Error(`Missing ${face} glyph: ${character}`);
  }
  const path = font.getPath(value,0,0,size,{kerning:true,tracking:spacing/size*1000});
  const b = path.getBoundingBox();
  return {path,b,width:b.x2-b.x1,height:b.y2-b.y1};
}

export function buildAssetSvg(asset) {
  const portrait = asset.height > asset.width;
  const w = portrait || asset.width===asset.height ? 1080 : asset.width / asset.height * 720;
  const h = portrait ? 1080*asset.height/asset.width : asset.width===asset.height ? 1080 : 720;
  const parts=[], texts=[];
  let safe={x:0,y:0,width:w,height:h};
  function text(value,x,y,size,{face='body',fill=colors.paper,maxWidth=w-x-40,align='left',spacing=0}={}) {
    let shape=outline(value,size,face,spacing);
    if (shape.width > maxWidth) throw new Error(`${asset.id}: text too wide: ${value} (${shape.width} > ${maxWidth})`);
    const left=align==='center' ? x-shape.width/2 : align==='right' ? x-shape.width : x;
    parts.push(`<path fill="${fill}" transform="translate(${left-shape.b.x1} ${y-shape.b.y1})" d="${svgPath(shape.path)}"/>`);
    texts.push({value,x:left,y,width:shape.width,height:shape.height,size,face});
    return shape;
  }
  function rect(x,y,width,height,fill,rx=0) { parts.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="${fill}"/>`); }
  function brand(x,y,size=48) {
    rect(x,y,size,size,colors.lime,size*.18);
    const mark=outline('PD',size*.66,'display');
    text('PD',x+size/2,y+(size-mark.height)/2,size*.66,{face:'display',fill:colors.ink,align:'center',maxWidth:size*.8});
    const name=outline('PUMPDUEL',size*.64,'display');
    text('PUMPDUEL',x+size+14,y+(size-name.height)/2,size*.64,{face:'display'});
  }
  function heading(lines,x,y,width,size,gap=14) {
    // Fit all lines as a group, retaining a consistent cap height and line gap.
    const widest=Math.max(...lines.map(line=>outline(line,size,'display').width));
    const fitted=Math.min(size,size*width/widest);
    for (let i=0;i<lines.length;i++) {
      const shape=text(lines[i],x,y,fitted,{face:'display',fill:i===1?colors.lime:colors.paper,maxWidth:width+.01});
      y+=shape.height+gap;
    }
    return y-gap;
  }
  function paragraph(value,x,y,width,size=34) {
    let line='';
    for (const word of value.split(' ')) {
      const next=line ? `${line} ${word}` : word;
      if (outline(next,size).width>width && line) {
        text(line,x,y,size,{maxWidth:width,fill:colors.muted}); y+=size*1.35; line=word;
      } else line=next;
    }
    if(line) { const shape=text(line,x,y,size,{maxWidth:width,fill:colors.muted}); y+=shape.height; }
    return y;
  }
  function pill(value,x,y,size=27) {
    const shape=outline(value,size);
    const height=56, width=shape.width+46;
    rect(x,y,width,height,colors.lime,28);
    text(value,x+23,y+(height-shape.height)/2,size,{fill:colors.ink,maxWidth:shape.width+.01});
    return width;
  }
  function photo(key,x,y,width,height,position='xMidYMid') {
    if(!masterImages.has(key)) masterImages.set(key,readFileSync(resolve(root,'campaign/masters',masterFiles[key])).toString('base64'));
    if(typeof position==='number') {
      const sourceWidth=941, sourceHeight=1672, cropHeight=sourceWidth*height/width;
      const cropTop=(sourceHeight-cropHeight)*position;
      parts.push(`<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 ${cropTop} ${sourceWidth} ${cropHeight}" overflow="hidden"><image href="data:image/png;base64,${masterImages.get(key)}" width="${sourceWidth}" height="${sourceHeight}"/></svg>`);
      return;
    }
    parts.push(`<image href="data:image/png;base64,${masterImages.get(key)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="${position} slice"/>`);
  }
  function fade(x,y,width,height,id) { rect(x,y,width,height,`url(#${id})`); }

  rect(0,0,w,h,colors.ink);
  const highlight=asset.id.match(/^instagram-highlights-(.+)$/)?.[1];
  if(asset.id.endsWith('-profile')) {
    safe={x:220,y:220,width:640,height:640};
    rect(0,0,w,h,'url(#radial)');
    rect(250,250,580,580,colors.lime,112);
    const mark=outline('PD',425,'display');
    text('PD',540,540-mark.height/2,425,{face:'display',fill:colors.ink,align:'center',maxWidth:440});
  } else if(highlight) {
    rect(0,0,w,h,'url(#radial)');
    parts.push('<circle cx="540" cy="540" r="330" fill="#182114" stroke="#b7ff2a" stroke-opacity=".35" stroke-width="3"/>');
    const value={start:'START',crew:'CREW',duels:'DUELS',challenge:'DARE',progress:'REPS','how-to':'HOW TO'}[highlight];
    const shape=outline(value,180,'display');
    safe={x:230,y:330,width:620,height:420};
    text(value,540,515-shape.height/2,180,{face:'display',fill:colors.lime,align:'center',maxWidth:580});
    text('PUMPDUEL',540,660,29,{face:'body',align:'center',maxWidth:420,spacing:1.5});
  } else if(asset.id==='youtube-banner') {
    // Normalized from 2560 x 1440: all lettering stays inside central 1546 x 423.
    safe={x:253.5,y:254.25,width:773,height:211.5};
    photo('community',0,0,w,h);
    fade(0,0,w,h,'left');
    rect(0,0,w,h,'#080d08aa');
    brand(285,273,27);
    const bottom=heading(['BUILD A HABIT.','TOGETHER.'],285,312,680,66,8);
    paragraph('Daily workouts. Friendly competition.',285,bottom+18,600,19);
  } else if(asset.id==='facebook-cover' || asset.id==='x-header') {
    const x=asset.id==='facebook-cover' ? w*.22 : w*.26;
    safe={x:x-5,y:80,width:w*.54,height:520};
    photo('community',0,0,w,h);
    fade(0,0,w,h,'left');
    brand(x,102,46);
    const bottom=heading(themes.habit.lines,x,211,w*.4,139,16);
    paragraph('Daily workouts. Friendly competition.',x,bottom+37,w*.42,33);
    text('pumpduel.com',x,555,27,{maxWidth:400});
  } else if(portrait) {
    const theme=themeFor(asset.id);
    const tall=h>1500;
    const secondary=asset.id.includes('-stories-') && asset.id.endsWith('-02');
    const x=76, top=tall?200:62, photoY=tall?650:480;
    safe={x:64,y:tall?180:48,width:880,height:(tall?h-270:h-58)-(tall?180:48)};
    const photoPosition=theme.photo==='community' ? 'xMaxYMid' : theme.photo==='challenge' && !tall ? .18 : theme.photo==='rivalry' && secondary ? .82 : 'xMidYMid';
    photo(theme.photo,0,photoY,w,h-photoY,photoPosition);
    fade(0,photoY,w,180,'photoTop');
    const bottomFade=tall?440:300;
    fade(0,h-bottomFade,w,bottomFade,'bottom');
    brand(x,top,44);
    text(theme.label,x,top+85,25,{fill:colors.lime,maxWidth:830,spacing:1});
    const bottom=heading(theme.lines,x,top+134,850,tall?132:119,14);
    paragraph(theme.copy,x,bottom+27,800,tall?34:30);
    if(secondary) {
      const panelTop=h-610;
      rect(58,panelTop,890,326,'#0b100bf2',22);
      text('YOUR NEXT MOVE',x+15,panelTop+30,23,{fill:colors.lime,spacing:1,maxWidth:800});
      theme.steps.forEach((line,i)=>{
        text(String(i+1).padStart(2,'0'),x+15,panelTop+88+i*68,33,{face:'display',fill:colors.lime,maxWidth:60});
        paragraph(line,x+74,panelTop+89+i*68,735,28);
      });
    } else {
      const y=tall?h-405:h-170;
      pill(theme.badge,x,y,28);
      text('pumpduel.com',x,y+84,28,{maxWidth:450});
    }
  } else {
    const theme=themeFor(asset.id);
    const thumbnail=asset.id.includes('thumbnails');
    safe={x:52,y:50,width:w-112,height:h-100};
    photo(theme.photo,w*.43,0,w*.57,h,theme.photo==='community'?'xMaxYMid':theme.photo==='challenge'?.18:'xMidYMid');
    fade(w*.4,0,w*.25,h,'photoLeft');
    brand(64,64,46);
    text(theme.label,64,185,24,{fill:colors.lime,spacing:1,maxWidth:w*.48});
    const bottom=heading(theme.lines,64,245,w*.48,145,17);
    if(!thumbnail) paragraph(theme.copy,64,bottom+30,w*.43,31);
    pill(theme.badge,64,592,26);
  }

  validateTextLayout(asset.id,texts,safe);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${asset.width}" height="${asset.height}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="left"><stop stop-color="#0a0e0a"/><stop offset=".42" stop-color="#0a0e0a" stop-opacity=".92"/><stop offset=".78" stop-color="#0a0e0a" stop-opacity=".3"/><stop offset="1" stop-color="#0a0e0a" stop-opacity=".06"/></linearGradient>
      <linearGradient id="photoLeft"><stop stop-color="#0c100d"/><stop offset="1" stop-color="#0c100d" stop-opacity="0"/></linearGradient>
      <linearGradient id="photoTop" x2="0" y2="1"><stop stop-color="#0c100d"/><stop offset="1" stop-color="#0c100d" stop-opacity="0"/></linearGradient>
      <linearGradient id="bottom" x2="0" y2="1"><stop stop-color="#0c100d" stop-opacity="0"/><stop offset=".45" stop-color="#0c100d" stop-opacity=".85"/><stop offset="1" stop-color="#0c100d"/></linearGradient>
      <radialGradient id="radial" cx=".35" cy=".3"><stop stop-color="#22351b"/><stop offset="1" stop-color="#0c100d"/></radialGradient>
    </defs>${parts.join('')}</svg>`;
  return {svg,texts,safe};
}

export function validateTextLayout(id,texts,safe) {
  for(const t of texts) {
    if(t.x<safe.x-.05 || t.y<safe.y-.05 || t.x+t.width>safe.x+safe.width+.05 || t.y+t.height>safe.y+safe.height+.05) {
      throw new Error(`${id}: text outside safe crop: ${t.value}`);
    }
  }
  for(let i=0;i<texts.length;i++) for(let j=i+1;j<texts.length;j++) {
    const a=texts[i], b=texts[j];
    if(a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y) {
      throw new Error(`${id}: overlapping text: ${a.value} / ${b.value}`);
    }
  }
}

export async function renderAsset(asset) {
  const layout=buildAssetSvg(asset);
  const renderer=new Resvg(layout.svg,{font:{loadSystemFonts:false},imageRendering:0});
  if(renderer.imagesToResolve().length) throw new Error(`${asset.id}: unresolved photograph`);
  const buffer=renderer.render().asPng();
  validatePNG(buffer,asset.file);
  return {...layout,buffer};
}

async function main() {
  const catalog=JSON.parse(await readFile(resolve(root,'catalog.json'),'utf8'));
  const preview=process.argv.includes('--preview');
  const ids=process.argv.slice(2).filter(arg=>!arg.startsWith('--'));
  const assets=catalog.assets.filter(asset=>!ids.length || ids.includes(asset.id));
  if(!preview && ids.length) throw new Error('Partial renders require --preview');
  await mkdir(resolve(root,'.local'),{recursive:true});
  const stage=await mkdtemp(resolve(root,'.local/typography-'));
  const report=[];
  try {
    for(const asset of assets) {
      const result=await renderAsset(asset);
      await writeFile(resolve(stage,`${asset.id}.png`),result.buffer);
      await writeFile(resolve(stage,`${asset.id}.svg`),result.svg);
      report.push({id:asset.id,safe:result.safe,texts:result.texts});
      asset.bytes=result.buffer.length;
      asset.sha256=createHash('sha256').update(result.buffer).digest('hex');
      console.log(`${asset.id}: ${asset.width} x ${asset.height}, ${result.texts.length} checked text blocks`);
    }
    await writeFile(resolve(stage,'layout-report.json'),JSON.stringify(report,null,2));
    if(!preview) {
      // Validate the entire pack before replacing any public asset or catalogue.
      for(const asset of assets) await copyFile(resolve(stage,`${asset.id}.png`),resolve(root,asset.file));
      await writeFile(resolve(root,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
      await copyFile(resolve(stage,'layout-report.json'),resolve(root,'.local/typography-layout.json'));
    }
    console.log(preview?`Preview: ${stage}`:`Updated ${assets.length} assets; all text bounds and safe crops checked.`);
  } finally { if(!preview) await rm(stage,{recursive:true,force:true}); }
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) await main();
