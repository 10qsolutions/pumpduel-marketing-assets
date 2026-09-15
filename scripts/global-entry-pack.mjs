import {readFileSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import opentype from 'opentype.js';
import {Resvg} from '@resvg/resvg-js';
import {svgPath,validateTextLayout} from './redesign-assets.mjs';
import {validatePNG} from './files.mjs';

// Public marketing content only. No app source, deployment notes or participant data.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const hub='https://pumpduel.com/global';
export const platforms=['instagram','tiktok','facebook'];
export const series=[
  ['push-ups','Push-ups','daily','PUSHDAY'],['push-ups','Push-ups','weekly','PUSHWK'],['push-ups','Push-ups','monthly','PUSHMO'],
  ['pull-ups','Pull-ups','daily','PULLDAY'],['pull-ups','Pull-ups','weekly','PULLWK'],['pull-ups','Pull-ups','monthly','PULLMO'],
  ['squats','Squats','daily','SQUATDAY'],['squats','Squats','weekly','SQUATWK'],['squats','Squats','monthly','SQUATMO'],
].map(([workout,label,cadence,code],index)=>({workout,label,cadence,code,index,key:`${workout}-${cadence}`,url:`https://pumpduel.com/c/${code}`,seriesUrl:`${hub}/${workout}/${cadence}`}));
export const chapters=[
  {key:'01-worldwide',title:'Your reps. Worldwide.',lines:['YOUR REPS.','WORLDWIDE.'],kind:'globe'},
  {key:'02-movements',title:'Three ways to show up.',lines:['THREE WAYS','TO SHOW UP.'],kind:'movements'},
  {key:'03-timeframes',title:'Pick your timeframe.',lines:['PICK YOUR','TIMEFRAME.'],kind:'cadences'},
  {key:'04-entry',title:'One code. Your round.',lines:['ONE CODE.','YOUR ROUND.'],kind:'entry'},
];
const fonts=Object.fromEntries(Object.entries({display:'BarlowCondensed-Black.ttf',body:'Barlow-SemiBold.ttf'}).map(([key,file])=>{
  const bytes=readFileSync(resolve(root,'fonts',file));
  return [key,opentype.parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength))];
}));
const ink='#0c100d',lime='#b7ff2a',paper='#f5f3ea';

export function compose(item,platform){
  if(!platforms.includes(platform))throw Error('Unsupported platform');
  const height=platform==='facebook'?1350:1920;
  const top=platform==='facebook'?70:220,footer=platform==='facebook'?1160:1330;
  const safe={x:76,y:platform==='facebook'?54:200,width:platform==='tiktok'?824:928,height:platform==='facebook'?1230:1280};
  const light=item.kind==='movements'||item.index%3===1;
  const bg=light?lime:ink,fg=light?ink:paper,accent=light?ink:lime,muted=light?'#304320':'#c4cbbc';
  const parts=[`<rect width="1080" height="${height}" fill="${bg}"/>`],texts=[];
  const x=76,width=safe.width;
  function rect(x,y,w,h,fill,rx=0){parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`);}
  function text(value,y,size,{face='body',fill=fg,left=x,max=width}={}){
    const font=fonts[face];
    for(const char of value)if(!font.charToGlyphIndex(char))throw Error(`Missing glyph: ${char}`);
    let path=font.getPath(value,0,0,size,{kerning:true}),bounds=path.getBoundingBox();
    if(bounds.x2-bounds.x1>max){size*=max/(bounds.x2-bounds.x1);path=font.getPath(value,0,0,size,{kerning:true});bounds=path.getBoundingBox();}
    if(size<27)throw Error(`Unreadable text: ${value}`);
    parts.push(`<path fill="${fill}" transform="translate(${left-bounds.x1} ${y-bounds.y1})" d="${svgPath(path)}"/>`);
    texts.push({value,x:left,y,width:bounds.x2-bounds.x1,height:bounds.y2-bounds.y1,size,face});
  }
  function globe(cx,cy,r){parts.push(`<g fill="none" stroke="${accent}" stroke-width="4" opacity=".7"><circle cx="${cx}" cy="${cy}" r="${r}"/><ellipse cx="${cx}" cy="${cy}" rx="${r*.4}" ry="${r}"/><ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r*.34}"/><path d="M${cx-r} ${cy}H${cx+r}M${cx} ${cy-r}V${cy+r}"/></g>`);}
  function rule(y){rect(x,y,width,2,light?'#6e9c2a':'#37452f');}
  text('PD  PUMPDUEL',top,42,{face:'display',fill:accent});
  text('GLOBAL CHALLENGES',top+84,28,{fill:accent});
  if(item.code){
    const variants=[['NEW DAY.','NEW ROUND.'],['MAKE THIS','YOUR WEEK.'],['OWN YOUR','BEST SET.']];
    const headline=variants[item.index%3];
    text(headline[0],top+145,120,{face:'display'});
    text(headline[1],top+255,120,{face:'display',fill:accent});
    text(`${item.label.toUpperCase()} · ${item.cadence.toUpperCase()}`,top+390,42,{fill:accent});
    // Workout-specific geometry; timeframe-specific palette and rhythm.
    const motifY=top+474;
    if(item.workout==='push-ups')for(let i=0;i<7;i++)rect(x+i*119,motifY+45-i*6,80,14,accent);
    else if(item.workout==='pull-ups')for(let i=0;i<6;i++)parts.push(`<path d="M${x+i*139} ${motifY+55}V${motifY}h94v55" fill="none" stroke="${accent}" stroke-width="9"/>`);
    else for(let i=0;i<5;i++)parts.push(`<path d="M${x+i*171} ${motifY}l65 55 65-55" fill="none" stroke="${accent}" stroke-width="9"/>`);
    rule(top+570);
    text('YOUR CHALLENGE CODE',top+609,27,{fill:muted});
    text(item.code,top+664,142,{face:'display',fill:accent});
    rule(top+809);
    text('Open the link. Check the current round.',top+854,34,{fill:muted});
    text('Your best accepted attempt counts.',top+905,34,{fill:muted});
  }else{
    text(item.lines[0],top+145,124,{face:'display'});
    text(item.lines[1],top+260,124,{face:'display',fill:accent});
    if(item.kind==='globe'){
      text('Push-ups. Pull-ups. Squats.',top+405,36,{fill:muted});
      globe(platform==='tiktok'?484:540,top+735,platform==='facebook'?205:228);
    }else if(item.kind==='movements'){
      ['PUSH-UPS','PULL-UPS','SQUATS'].forEach((value,i)=>{
        rule(top+427+i*157);text(`0${i+1}`,top+464+i*157,35,{fill:muted,max:75});
        text(value,top+455+i*157,85,{face:'display',left:180,max:width-104});
      });
      text('Pick your strong suit.',top+940,35,{fill:muted});
    }else if(item.kind==='cadences'){
      ['DAILY','WEEKLY','MONTHLY'].forEach((value,i)=>{
        rect(x,top+444+i*148,width,110,'#182114',12);
        text(value,top+460+i*148,79,{face:'display',fill:accent,left:x+25,max:width-50});
      });
      text('Separate entries. Separate leaderboards.',top+932,33,{fill:muted});
    }else{
      [['CHOOSE YOUR CHALLENGE','Pick a movement and a timeframe.'],['OPEN ITS LINK','Check the current round and rules.'],['TAKE YOUR TURN','Enter in PumpDuel on iPhone.']].forEach(([title,body],i)=>{
        rule(top+421+i*171);text(`0${i+1}  ${title}`,top+455+i*171,40,{face:'display',fill:accent});
        text(body,top+515+i*171,32,{fill:muted});
      });
    }
  }
  const link=item.url||hub;
  text(platform==='tiktok'?'TYPE IN YOUR BROWSER':item.code?'YOUR CURRENT CHALLENGE':'EXPLORE WORLDWIDE',footer,27,{fill:muted});
  text(link.replace('https://',''),footer+53,38,{fill:accent});
  validateTextLayout(`${platform}/${item.key}`,texts,safe);
  const stickerArea=platform==='instagram'?{x:180,y:1550,width:660,height:110}:null;
  if(stickerArea&&texts.some(t=>t.y+t.height>=stickerArea.y))throw Error('Link sticker overlaps text');
  return {svg:`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${height}" viewBox="0 0 1080 ${height}">${parts.join('')}</svg>`,texts,safe,stickerArea,width:1080,height};
}

export function caption(item,platform){
  const copy=item.code?`${item.label} · ${item.cadence[0].toUpperCase()+item.cadence.slice(1)}. Your best accepted attempt counts. Open the current round for its rules, entry availability and attempt terms. Challenge code: ${item.code}.`
    :'Your reps. Worldwide. Push-ups, pull-ups and squats across Daily, Weekly and Monthly challenges. Each competition has its own entry and leaderboard. Choose your challenge and check the current rules.';
  const url=item.url||hub;
  return `${copy}\n\n${platform==='tiktok'?'Type in your browser: '+url.replace('https://',''):platform==='instagram'?'Open the Story link: '+url:url}\n\n#PumpDuel #GlobalChallenge`;
}
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');

export const worldwideCaption='Your reps. Worldwide. 🌍\nPush-ups, pull-ups or squats. Daily, weekly or monthly.\nMeet PumpDuel’s worldwide challenges.\nWhich movement are you backing?\n\nExplore the challenges using the Story link.\n\n#PumpDuel #GlobalChallenge';

export function renderInstagramGuide(manifest){
  const frames=chapters.slice(0,3).map(chapter=>manifest.assets.find(a=>a.id===`global-instagram-${chapter.key}`));
  if(frames.some(frame=>!frame))throw Error('WORLDWIDE guide is missing an introduction frame');
  return `<section class="worldwide-guide" id="instagram-worldwide" aria-labelledby="worldwide-guide-title">
      <p class="eyebrow">WORLDWIDE · INSTAGRAM CHECKLIST</p>
      <h3 id="worldwide-guide-title">Post WORLDWIDE today</h3>
      <p>One short introduction. One <strong>GLOBAL</strong> Highlight. Use the hub to explain Daily, Weekly and Monthly challenges across push-ups, pull-ups and squats—not nine separate announcements.</p>
      <aside class="guide-note"><strong>Hub introduction only—not an “enter now” launch.</strong> Check the hub before posting. Until entry works in the released iPhone app, skip frame 04 (“One code. Your round.”) and the nine code-card invitations. If the challenge page says “Coming soon in the app”, keep that hold in place.</aside>

      <h4>1. Save these three Stories, in this order</h4>
      <p>These are the original 1080 × 1920 PNGs. On iPhone, open an image, then touch and hold it and choose the available Save to Photos option. Do not screenshot the preview.</p>
      <ol class="worldwide-frames">${frames.map((frame,i)=>`<li><a href="${frame.file}?v=${frame.sha256.slice(0,12)}" target="_blank" rel="noopener"><img src="${frame.file}?v=${frame.sha256.slice(0,12)}" width="1080" height="1920" loading="lazy" alt="Story ${i+1}: ${esc(frame.title)}"></a><strong>${i+1}. ${esc(frame.title)}</strong><a class="secondary" href="${frame.file}?v=${frame.sha256.slice(0,12)}" download>Download Story ${i+1}</a></li>`).join('')}</ol>

      <h4>2. Add the actual Link sticker in Instagram</h4>
      <p>Create a public Story with frame 1, then 2, then 3. On each, choose <strong>Stickers → Link</strong>, paste the URL below and set the label to <strong>Explore challenges</strong>. Put the sticker in the blank area below the printed URL; the URL printed on the image is not tappable.</p>
      <label for="worldwide-hub-link">Story Link sticker URL</label>
      <input id="worldwide-hub-link" readonly value="${hub}">
      <div class="guide-actions"><button class="secondary" type="button" data-copy-guide="worldwide-hub-link">Copy WORLDWIDE link</button><a class="secondary" href="${hub}" target="_blank" rel="noopener">Check the live hub ↗</a></div>
      <label for="worldwide-sticker-label">Sticker label</label>
      <input id="worldwide-sticker-label" readonly value="Explore challenges">
      <div class="guide-actions"><button class="secondary" type="button" data-copy-guide="worldwide-sticker-label">Copy sticker label</button></div>
      <p class="guide-note">If Link stickers are unavailable on your account, put this hub URL in your profile’s link field and adjust the wording to point there. Check the posted link from another account.</p>

      <h4>3. Use this wording if you add accompanying copy</h4>
      <p>The images already carry the introduction. This copy is optional—do not paste the whole caption over every Story. For a short text prompt, use <strong>“Which movement are you backing?”</strong></p>
      <label for="worldwide-awareness-caption">WORLDWIDE introduction copy</label>
      <textarea id="worldwide-awareness-caption" readonly>${esc(worldwideCaption)}</textarea>
      <div class="guide-actions"><button class="secondary" type="button" data-copy-guide="worldwide-awareness-caption">Copy WORLDWIDE caption</button></div>

      <h4>4. Save all three into the same GLOBAL Highlight</h4>
      <p>Keep Story Archive enabled. After posting, add all three Stories to <strong>GLOBAL</strong>. If it already exists, use it; do not create Daily, Weekly and Monthly Highlights. Use <strong>Edit Highlight → Edit cover</strong> to set the cover below.</p>
      <div class="worldwide-cover"><img src="instagram/highlights/global.png" width="72" height="72" alt="GLOBAL Highlight cover"><div><strong>Highlight name: GLOBAL</strong><div class="guide-actions"><button class="secondary" type="button" data-save-global-cover>Save GLOBAL cover</button></div></div></div>

      <h4>5. Keep GLOBAL useful after the introduction</h4>
      <p>After app entry is verified, follow with one relevant code card. Feature a daily challenge on 3–4 days a week, rotating movements; add weekly opening/closing reminders and monthly introduction/midpoint/final-call updates as relevant. Check the actual deadline before posting.</p>
      <p>Mix in real attempts and results you have permission to share. Keep selected results in GLOBAL with their <strong>exact completed-round link</strong>; rolling entry codes are only for current invitations. Retire expired invitations and keep the Highlight concise.</p>
      <p><a href="global.html#instagram">Browse the full Instagram pack →</a> · <a href="global-guide.md">Full posting guide</a></p>
    </section>`;
}

export async function buildPack(){
  const manifest={version:1,status:'HOLD_FOR_WORKING_LINKS',namesApproved:true,postingApproved:false,
    title:'GLOBAL · initial launch pack',hub,series,tiktok:{username:'@pumpduel',websiteLinkAvailable:false},
    guidance:{highlight:'One GLOBAL Highlight; start with four introduction frames. Add selected real results later.',results:'Permanent entry codes are for current challenges, never historical results. Keep exact round links for results.',release:'Verify every code resolves to its matching live competition and supported iPhone entry before posting.'},assets:[],posts:[]};
  for(const platform of platforms){
    for(const item of [...chapters,...series]){
      const layout=compose(item,platform),file=`${platform}/global/${item.key}.png`;
      const png=new Resvg(layout.svg,{font:{loadSystemFonts:false}}).render().asPng();validatePNG(png,file);
      await mkdir(resolve(root,dirname(file)),{recursive:true});await writeFile(resolve(root,file),png);
      manifest.assets.push({id:`global-${platform}-${item.key}`,file,title:item.title||`${item.label} · ${item.cadence} · ${item.code}`,
        platform,group:item.code?'series':'intro',workout:item.workout||null,cadence:item.cadence||null,code:item.code||null,
        link:item.url||hub,stickerLabel:item.code?'View challenge':'Explore challenges',type:'image/png',width:layout.width,height:layout.height,
        bytes:png.length,sha256:createHash('sha256').update(png).digest('hex'),safe:layout.safe,stickerArea:layout.stickerArea,texts:layout.texts});
    }
    manifest.posts.push({id:`global-${platform}-intro`,platform,title:'GLOBAL introduction · four frames',assets:chapters.map(c=>`global-${platform}-${c.key}`),caption:caption({},platform),status:manifest.status});
    for(const item of series)manifest.posts.push({id:`global-${platform}-${item.key}`,platform,title:`${item.label} · ${item.cadence}`,assets:[`global-${platform}-${item.key}`],caption:caption(item,platform),status:manifest.status});
  }
  await writeFile(resolve(root,'global-pack.json'),JSON.stringify(manifest,null,2)+'\n');
  const index=readFileSync(resolve(root,'index.html'),'utf8');
  const guideRegion=/<!-- WORLDWIDE_GUIDE_START -->[\s\S]*?<!-- WORLDWIDE_GUIDE_END -->/;
  if(!guideRegion.test(index))throw Error('Missing Instagram guide markers');
  await writeFile(resolve(root,'index.html'),index.replace(guideRegion,`<!-- WORLDWIDE_GUIDE_START -->\n    ${renderInstagramGuide(manifest)}\n    <!-- WORLDWIDE_GUIDE_END -->`));
  const card=asset=>`<figure><a href="${asset.file}?v=${asset.sha256.slice(0,12)}" target="_blank" rel="noopener"><img loading="lazy" src="${asset.file}?v=${asset.sha256.slice(0,12)}" width="${asset.width}" height="${asset.height}" alt="${esc(asset.title)}"></a><figcaption><h4>${esc(asset.title)}</h4><p>${asset.width} × ${asset.height} · original PNG</p><a class="download" download href="${asset.file}?v=${asset.sha256.slice(0,12)}">Download PNG</a><div class="copy-row"><input readonly id="${asset.id}-link" aria-label="Link for ${esc(asset.title)}" value="${asset.link}"><button data-copy="${asset.id}-link">Copy link</button></div>${asset.platform==='instagram'?`<p>Story Link sticker: <strong>${asset.stickerLabel}</strong>. Add it below the printed URL.</p>`:''}</figcaption></figure>`;
  const copy=post=>`<details class="caption"><summary>Caption · ${esc(post.title)}</summary><textarea readonly id="${post.id}-caption" aria-label="Caption for ${esc(post.title)}">${esc(post.caption)}</textarea><button data-copy="${post.id}-caption">Copy caption</button></details>`;
  const sections=platforms.map(platform=>{
    const title=platform==='tiktok'?'TikTok':platform[0].toUpperCase()+platform.slice(1);
    const instruction=platform==='instagram'?'For a hub-only introduction today, use the three-frame checklist below. The full four-frame entry launch and code-card invitations remain on hold until app entry works.':platform==='tiktok'?'Use the introduction as a photo post. Code cards can accompany relevant workout footage; these PNGs are not finished videos. No clickable profile link is assumed.':'Choose the four-photo introduction or a relevant individual challenge card. Include the actual clickable destination in your post.';
    const checklist=platform==='instagram'?'<p><a class="download" href="index.html#instagram-worldwide">Open WORLDWIDE Instagram checklist →</a></p>':'';
    const introduction=manifest.assets.filter(a=>a.platform===platform&&a.group==='intro').map(card).join('');
    const movements=['push-ups','pull-ups','squats'].map(workout=>`<details class="movement"${workout==='push-ups'?' open':''}><summary>${series.find(s=>s.workout===workout).label} · Daily / Weekly / Monthly</summary><div class="grid">${manifest.assets.filter(a=>a.platform===platform&&a.workout===workout).map(card).join('')}</div>${manifest.posts.filter(p=>p.platform===platform&&p.id.startsWith(`global-${platform}-${workout}`)).map(copy).join('')}</details>`).join('');
    return `<section id="${platform}"><h2>${title}</h2><p>${instruction}</p>${checklist}<h3>01 / The short introduction</h3><div class="grid intro-grid">${introduction}</div>${copy(manifest.posts.find(p=>p.id===`global-${platform}-intro`))}<h3>02 / Choose a challenge</h3>${movements}</section>`;
  }).join('');
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>PumpDuel · GLOBAL launch pack</title><link rel="stylesheet" href="global-pack.css"><script src="global-pack.js" defer></script></head><body><header><a href="index.html">PD / PUMPDUEL</a><span>SOCIAL ASSET BANK</span></header><main><div class="status">LAUNCH DRAFTS · HOLD POSTING</div><h1>One GLOBAL Highlight.<br>Nine familiar codes.</h1><p class="lead">A short introduction, then the right invitation. Original-size assets, matching captions and copyable links.</p><aside><strong>Names approved. Links still need verification.</strong><p>The full entry-launch sequence and code invitations remain on hold until their links and supported iPhone entry work. For a hub-only introduction, use the <a href="index.html#instagram-worldwide">WORLDWIDE Instagram checklist</a>: three Stories, the hub link and one GLOBAL Highlight.</p></aside><nav><a href="#instagram">Instagram</a><a href="#tiktok">TikTok</a><a href="#facebook">Facebook</a><a href="global-guide.md">Posting guide</a><a href="instagram/highlights/global.png" download>GLOBAL cover</a></nav><details class="codes"><summary>All nine codes and links</summary><div class="table-wrap"><table><thead><tr><th>Exercise</th><th>Daily</th><th>Weekly</th><th>Monthly</th></tr></thead><tbody>${['push-ups','pull-ups','squats'].map(workout=>`<tr><th>${series.find(s=>s.workout===workout).label}</th>${series.filter(s=>s.workout===workout).map(s=>`<td><a href="${s.url}" target="_blank" rel="noopener">${s.code}</a></td>`).join('')}</tr>`).join('')}</tbody></table></div><p>These are rolling entry destinations. Dated results must keep their own exact round links.</p></details>${sections}<footer>Download original PNGs, not screenshots. Add native links in the social app. No social posts are sent from this bank.</footer></main><p id="copy-status" role="status" aria-live="polite"></p></body></html>`;
  await writeFile(resolve(root,'global.html'),html);
  console.log(`Prepared ${manifest.assets.length} public-safe launch drafts and ${manifest.posts.length} caption sets. Posting remains on hold.`);
  return manifest;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildPack();
