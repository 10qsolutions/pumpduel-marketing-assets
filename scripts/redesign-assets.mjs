import {mkdtemp, readFile, rm, stat, writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temp = await mkdtemp(resolve(tmpdir(), 'pumpduel-redesign-'));
const fontUrl = resolve(root, 'fonts/BarlowCondensed-Black.ttf');
const masters = {
  community: resolve(root, 'campaign/masters/community-landscape.png'),
  rivalry: resolve(root, 'campaign/masters/rivalry-portrait.png'),
  challenge: resolve(root, 'campaign/masters/challenge-portrait.png'),
};

const themes = {
  start: {master:'rivalry', eyebrow:'PRIVATE CREWS', lines:['START WITH','YOUR PEOPLE.'], sub:'Show up together. Keep each other moving.', stat:'DAILY CREW'},
  crew: {master:'community', eyebrow:'CONSISTENCY, TOGETHER', lines:['BUILD A HABIT.','TOGETHER.'], sub:'The workout is easier to start when your crew is waiting.', stat:'GROUP WORKOUTS'},
  habit: {master:'community', eyebrow:'FITNESS WITH FRIENDS', lines:['BUILD A HABIT.','TOGETHER.'], sub:'Daily workouts. Real accountability. Friendly competition.', stat:'SHOW UP DAILY'},
  duels: {master:'rivalry', eyebrow:'LIVE COMPETITION', lines:['TURN REPS','INTO RIVALRY.'], sub:'Same movement. Same clock. One score to beat.', stat:'LIVE DUELS'},
  duel: {master:'rivalry', eyebrow:'LIVE COMPETITION', lines:['60 SECONDS.','GAME ON.'], sub:'Face a friend live and make every rep count.', stat:'HEAD TO HEAD'},
  challenge: {master:'challenge', eyebrow:'YOUR MOVE', lines:['SET A SCORE.','DARE THEM.'], sub:'Train now. Send the challenge. Let them answer.', stat:'FRIEND CHALLENGE'},
  progress: {master:'challenge', eyebrow:'PROGRESS THAT ADDS UP', lines:['SMALL WINS.','REAL PROGRESS.'], sub:'See your reps, streaks and momentum build over time.', stat:'TRACK EVERY REP'},
  howto: {master:'rivalry', eyebrow:'CAMERA-COUNTED REPS', lines:['PHONE READY.','YOU READY?'], sub:'Set it down, frame the movement and start your set.', stat:'NO WEARABLE NEEDED'},
};

function esc(value) {
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}

function logo(x, y, scale = 1, wordmark = true) {
  const size = 52 * scale;
  return `<g transform="translate(${x} ${y})">
    <rect width="${size}" height="${size}" rx="${10*scale}" fill="#B7FF2A"/>
    <text x="${size/2}" y="${size*.72}" text-anchor="middle" class="brand" font-size="${31*scale}" fill="#0B0E0C">PD</text>
    ${wordmark ? `<text x="${size + 17*scale}" y="${size*.72}" class="brand" font-size="${28*scale}" fill="#F5F3EA" letter-spacing="${.5*scale}">PUMPDUEL</text>` : ''}
  </g>`;
}

function icon(kind, cx, cy, scale = 1) {
  const s = scale;
  const paths = {
    start: `<path d="M ${cx-48*s} ${cy} H ${cx+36*s} M ${cx+5*s} ${cy-31*s} L ${cx+38*s} ${cy} L ${cx+5*s} ${cy+31*s}"/>`,
    crew: `<circle cx="${cx}" cy="${cy-23*s}" r="${20*s}"/><circle cx="${cx-42*s}" cy="${cy-10*s}" r="${15*s}"/><circle cx="${cx+42*s}" cy="${cy-10*s}" r="${15*s}"/><path d="M ${cx-34*s} ${cy+48*s} Q ${cx} ${cy+14*s} ${cx+34*s} ${cy+48*s} M ${cx-71*s} ${cy+42*s} Q ${cx-43*s} ${cy+17*s} ${cx-17*s} ${cy+38*s} M ${cx+17*s} ${cy+38*s} Q ${cx+43*s} ${cy+17*s} ${cx+71*s} ${cy+42*s}"/>`,
    duels: `<path d="M ${cx-52*s} ${cy-48*s} L ${cx+52*s} ${cy+48*s} M ${cx+52*s} ${cy-48*s} L ${cx-52*s} ${cy+48*s}"/><circle cx="${cx-57*s}" cy="${cy-53*s}" r="${12*s}"/><circle cx="${cx+57*s}" cy="${cy-53*s}" r="${12*s}"/>`,
    challenge: `<path d="M ${cx-42*s} ${cy+58*s} V ${cy-58*s} M ${cx-40*s} ${cy-52*s} Q ${cx+5*s} ${cy-70*s} ${cx+50*s} ${cy-42*s} V ${cy+10*s} Q ${cx+5*s} ${cy-18*s} ${cx-40*s} ${cy}"/>`,
    progress: `<path d="M ${cx-58*s} ${cy+50*s} V ${cy+5*s} H ${cx-28*s} V ${cy+50*s} M ${cx-15*s} ${cy+50*s} V ${cy-25*s} H ${cx+15*s} V ${cy+50*s} M ${cx+28*s} ${cy+50*s} V ${cy-58*s} H ${cx+58*s} V ${cy+50*s}"/>`,
    howto: `<circle cx="${cx}" cy="${cy}" r="${70*s}"/><path d="M ${cx-20*s} ${cy-36*s} L ${cx+43*s} ${cy} L ${cx-20*s} ${cy+36*s} Z"/>`,
  };
  return `<g fill="none" stroke="#B7FF2A" stroke-width="${12*s}" stroke-linecap="round" stroke-linejoin="round">${paths[kind]}</g>`;
}

function profileSvg(width, height) {
  const m = Math.min(width,height), cx = width/2, cy = height/2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <radialGradient id="bg" cx="38%" cy="30%"><stop stop-color="#26351B"/><stop offset=".48" stop-color="#121712"/><stop offset="1" stop-color="#070A08"/></radialGradient>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" seed="17"/><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 .09 0"/></filter>
      <style>@font-face{font-family:Barlow;src:url('${fontUrl}')} .brand{font-family:Barlow,'Arial Narrow',sans-serif;font-weight:900;font-style:italic}</style>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <circle cx="${cx}" cy="${cy}" r="${m*.39}" fill="none" stroke="#B7FF2A" stroke-opacity=".14" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="${m*.31}" fill="none" stroke="#F5F3EA" stroke-opacity=".08" stroke-width="2"/>
    <path d="M ${cx-m*.55} ${cy+m*.22} Q ${cx} ${cy-m*.18} ${cx+m*.55} ${cy+m*.22}" fill="none" stroke="#B7FF2A" stroke-opacity=".11" stroke-width="3"/>
    <rect x="${cx-m*.205}" y="${cy-m*.205}" width="${m*.41}" height="${m*.41}" rx="${m*.075}" fill="#B7FF2A"/>
    <text x="${cx}" y="${cy+m*.105}" text-anchor="middle" class="brand" font-size="${m*.25}" fill="#0B0E0C">PD</text>
    <rect width="100%" height="100%" filter="url(#grain)" opacity=".38"/>
  </svg>`;
}

function highlightSvg(kind, width, height) {
  const cx=width/2, cy=height/2;
  const label = {start:'GO',crew:'CREW',duels:'VS',challenge:'DARE',progress:'+','how-to':'HOW'}[kind];
  const size = label.length > 3 ? 122 : label.length > 2 ? 155 : 220;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><radialGradient id="bg"><stop stop-color="#25351A"/><stop offset="1" stop-color="#090C09"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <circle cx="${cx}" cy="${cy}" r="330" fill="#0D110E" stroke="#B7FF2A" stroke-opacity=".26" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="265" fill="#151C13" stroke="#F5F3EA" stroke-opacity=".1" stroke-width="2"/>
    <text x="${cx}" y="${cy+size*.31}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="${size}" fill="#B7FF2A" letter-spacing="3">${label}</text>
    <text x="${cx}" y="${cy+205}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="24" fill="#F5F3EA" fill-opacity=".7" letter-spacing="8">PUMPDUEL</text>
  </svg>`;
}

function campaignSvg(asset, theme, secondary = false) {
  const {width:w,height:h} = asset;
  const landscape = w/h > 1.25;
  const squareish = w/h >= .8 && w/h <= 1.25;
  const safe = Math.round(Math.min(w,h)*.07);
  const titleSize = Math.round((landscape ? h*.16 : squareish ? w*.105 : w*.112));
  const lineGap = Math.round(titleSize*.84);
  const titleX = landscape ? Math.round(w*.07) : safe;
  const titleY = landscape ? Math.round(h*.34) : Math.round(h*.21);
  const logoScale = Math.max(.9, Math.min(2.1, Math.min(w,h)/760));
  const panelY = Math.round(h*.66);
  const panelH = Math.round(h*.22);
  const secondaryPanel = secondary ? `<g>
    <rect x="${safe}" y="${panelY}" width="${w-safe*2}" height="${panelH}" rx="${Math.round(safe*.4)}" fill="#101510" fill-opacity=".94" stroke="#B7FF2A" stroke-opacity=".34" stroke-width="2"/>
    <text x="${safe*1.55}" y="${panelY+panelH*.24}" class="small" font-size="${Math.round(Math.min(w,h)*.028)}" fill="#B7FF2A" letter-spacing="3">HOW IT WORKS</text>
    <text x="${safe*1.55}" y="${panelY+panelH*.49}" class="copy" font-size="${Math.round(Math.min(w,h)*.034)}" fill="#F5F3EA">01  SET DOWN YOUR PHONE</text>
    <text x="${safe*1.55}" y="${panelY+panelH*.68}" class="copy" font-size="${Math.round(Math.min(w,h)*.034)}" fill="#F5F3EA">02  COMPLETE YOUR SET</text>
    <text x="${safe*1.55}" y="${panelY+panelH*.87}" class="copy" font-size="${Math.round(Math.min(w,h)*.034)}" fill="#F5F3EA">03  SEND THE SCORE</text>
  </g>` : '';
  const bannerSafe = asset.id === 'youtube-banner';
  const groupTransform = bannerSafe ? `translate(${Math.round(w*.2)} ${Math.round(h*.31)}) scale(.6)` : '';
  const titleGroup = bannerSafe ? `<g transform="${groupTransform}">
      <text x="${titleX}" y="${titleY}" class="title" font-size="${titleSize}" fill="#F5F3EA">${esc(theme.lines[0])}</text>
      <text x="${titleX}" y="${titleY+lineGap}" class="title" font-size="${titleSize}" fill="#B7FF2A">${esc(theme.lines[1])}</text>
    </g>` : `<text x="${titleX}" y="${titleY}" class="title" font-size="${titleSize}" fill="#F5F3EA">${esc(theme.lines[0])}</text>
      <text x="${titleX}" y="${titleY+lineGap}" class="title" font-size="${titleSize}" fill="#B7FF2A">${esc(theme.lines[1])}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="shade" x1="${landscape?'0':'0'}" y1="0" x2="${landscape?'1':'0'}" y2="${landscape?'0':'1'}"><stop stop-color="#060806" stop-opacity="${landscape?'.96':'.93'}"/><stop offset="${landscape?'.58':'.42'}" stop-color="#090B09" stop-opacity="${landscape?'.46':'.16'}"/><stop offset="1" stop-color="#050705" stop-opacity="${landscape?'.16':'.82'}"/></linearGradient>
      <linearGradient id="bottom" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#060806" stop-opacity="0"/><stop offset="1" stop-color="#060806" stop-opacity=".9"/></linearGradient>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".68" numOctaves="2" seed="11"/><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 .08 0"/></filter>
      <style>@font-face{font-family:Barlow;src:url('${fontUrl}')} .brand,.title{font-family:Barlow,'Arial Narrow',sans-serif;font-weight:900} .small,.copy{font-family:Arial,Helvetica,sans-serif;font-weight:700}</style>
    </defs>
    <rect width="100%" height="100%" fill="url(#shade)"/>
    <rect width="100%" height="100%" fill="url(#bottom)"/>
    <rect x="${Math.max(2,safe*.22)}" y="${Math.max(2,safe*.22)}" width="${w-Math.max(4,safe*.44)}" height="${h-Math.max(4,safe*.44)}" rx="${Math.round(safe*.35)}" fill="none" stroke="#B7FF2A" stroke-opacity=".2" stroke-width="${Math.max(2,Math.round(Math.min(w,h)/700))}"/>
    ${logo(safe,safe,logoScale,!squareish)}
    <text x="${titleX}" y="${titleY-titleSize*.72}" class="small" font-size="${Math.round(titleSize*.24)}" fill="#B7FF2A" letter-spacing="${Math.max(2,Math.round(titleSize*.045))}">${esc(theme.eyebrow)}</text>
    ${titleGroup}
    ${!secondary && !bannerSafe ? `<text x="${titleX}" y="${titleY+lineGap+titleSize*.55}" class="copy" font-size="${Math.round(titleSize*.25)}" fill="#F5F3EA" fill-opacity=".9">${esc(theme.sub)}</text>` : ''}
    ${secondaryPanel}
    <g transform="translate(${titleX} ${h-safe*1.15})">
      <rect width="${Math.round(Math.min(w*.34, titleSize*3.4))}" height="${Math.round(titleSize*.42)}" rx="${Math.round(titleSize*.21)}" fill="#B7FF2A"/>
      <text x="${Math.round(titleSize*.22)}" y="${Math.round(titleSize*.29)}" class="small" font-size="${Math.round(titleSize*.17)}" fill="#0B0E0C" letter-spacing="1.5">${esc(theme.stat)}</text>
    </g>
    <text x="${w-safe}" y="${h-safe*.93}" text-anchor="end" class="small" font-size="${Math.round(titleSize*.18)}" fill="#F5F3EA" letter-spacing="2">PUMPDUEL.COM →</text>
  </svg>`;
}

function themeFor(asset) {
  const id = asset.id;
  if (id.includes('progress')) return themes.progress;
  if (id.includes('how-to')) return themes.howto;
  if (id.includes('challenge')) return themes.challenge;
  if (id.includes('duel') && !id.includes('duels')) return themes.duel;
  if (id.includes('duels')) return themes.duels;
  if (id.includes('start')) return themes.start;
  if (id.includes('crew')) return themes.crew;
  return themes.habit;
}

function run(command, args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command,args,{stdio:['ignore','pipe','pipe']});
    let stderr=''; child.stderr.on('data', chunk => stderr += chunk);
    child.on('error',reject);
    child.on('close',code => code === 0 ? resolveRun() : reject(new Error(`${command} failed (${code}): ${stderr}`)));
  });
}

async function sanitizePng(file) {
  const input = await readFile(file);
  const allowed = new Set(['IHDR','IDAT','IEND','iCCP','pHYs','sRGB','gAMA','cHRM','PLTE','tRNS']);
  const chunks = [input.subarray(0,8)];
  let offset = 8;
  while (offset < input.length) {
    const length = input.readUInt32BE(offset);
    const end = offset + 12 + length;
    const type = input.toString('ascii',offset+4,offset+8);
    if (allowed.has(type)) chunks.push(input.subarray(offset,end));
    offset = end;
  }
  await writeFile(file,Buffer.concat(chunks));
}

async function render(asset, svg, master) {
  const svgFile = resolve(temp,`${asset.id}.svg`);
  const overlay = resolve(temp,`${asset.id}-overlay.png`);
  const background = resolve(temp,`${asset.id}-background.png`);
  const output = resolve(root,asset.file);
  await writeFile(svgFile,svg);
  if (master) {
    await run('magick',[master,'-auto-orient','-resize',`${asset.width}x${asset.height}^`,'-gravity','center','-extent',`${asset.width}x${asset.height}`,'-modulate','64,92,100','-unsharp','0x0.7+0.7+0.006','-colorspace','sRGB',background]);
    await run('magick',['-background','none',svgFile,'-resize',`${asset.width}x${asset.height}!`,'-colorspace','sRGB',`PNG32:${overlay}`]);
    await run('magick',[background,overlay,'-compose','screen','-composite','-strip',`PNG24:${output}`]);
  } else {
    await run('magick',['-background','none',svgFile,'-resize',`${asset.width}x${asset.height}!`,'-colorspace','sRGB','-strip',`PNG24:${output}`]);
  }
  await sanitizePng(output);
  const buffer = await readFile(output);
  asset.bytes = (await stat(output)).size;
  asset.sha256 = createHash('sha256').update(buffer).digest('hex');
}

try {
  const catalogPath = resolve(root,'catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath,'utf8'));
  for (const asset of catalog.assets) {
    const highlight = asset.id.match(/^instagram-highlights-(.+)$/)?.[1];
    const isProfile = asset.id.endsWith('-profile');
    const theme = themeFor(asset);
    const svg = isProfile ? profileSvg(asset.width,asset.height)
      : highlight ? highlightSvg(highlight,asset.width,asset.height)
      : campaignSvg(asset,theme,asset.id.endsWith('-02'));
    await render(asset,svg,isProfile || highlight ? null : masters[theme.master]);
    console.log(`${asset.file}\t${asset.width}x${asset.height}\t${asset.bytes} bytes`);
  }
  await writeFile(catalogPath,`${JSON.stringify(catalog,null,2)}\n`);
} finally {
  await rm(temp,{recursive:true,force:true});
}
