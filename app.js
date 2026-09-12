const $ = (selector) => document.querySelector(selector);
const selected = new Set();
const files = new Map();
const pending = new Map();
const failures = new Set();
let catalog, platform, assetMap, activeShare = false, dialogVersion = 0, toastTimer;
const dialog = $('#save-dialog');
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    const asset = assetMap.get(entry.target.dataset.asset);
    if (asset.type.startsWith('image/')) prepare(asset.id).catch(() => {});
    observer.unobserve(entry.target);
  }
}, {rootMargin: '150px'});

function el(tag, properties = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(properties)) {
    if (key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  }
  node.append(...children.filter(Boolean));
  return node;
}
function button(text, className, action, label) {
  const node = el('button', {type:'button', className, text});
  if (label) node.setAttribute('aria-label', label);
  node.addEventListener('click', action);
  return node;
}
function toast(message) {
  clearTimeout(toastTimer);
  $('#status').textContent = message;
  toastTimer = setTimeout(() => { $('#status').textContent = ''; }, 6000);
}
function photoWord(ids) { return ids.every(id => assetMap.get(id).type.startsWith('image/')) ? 'photos' : 'items'; }
// Use the same content-versioned URL for previews, direct opens and downloads.
function assetUrl(asset) { return `${asset.file}?v=${asset.sha256.slice(0,12)}`; }
function shareSupported(payload) {
  try { return window.isSecureContext && typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare(payload); }
  catch { return false; }
}
async function prepare(id) {
  if (files.has(id)) return files.get(id);
  if (pending.has(id)) return pending.get(id);
  failures.delete(id);
  const task = (async () => {
    const asset = assetMap.get(id);
    const response = await fetch(assetUrl(asset), {credentials:'omit', signal:AbortSignal.timeout(30000)});
    if (!response.ok) throw new Error('Could not load file');
    const blob = await response.blob();
    if (blob.size !== asset.bytes || blob.type.split(';')[0] !== asset.type) throw new Error('Unexpected file');
    const name = 'pumpduel-' + asset.id + '.' + asset.file.split('.').pop();
    const file = new File([blob], name, {type:asset.type});
    files.set(id, file);
    return file;
  })();
  pending.set(id, task);
  updateSelection();
  try { return await task; }
  catch(error) { failures.add(id); throw error; }
  finally { pending.delete(id); updateSelection(); }
}
function orderedSelection() { return catalog.assets.filter(asset => selected.has(asset.id)).map(asset => asset.id); }
function platformAssets() { return catalog.posts.filter(post => post.platform === platform).flatMap(post => post.assets); }
function updateSelection() {
  if (!catalog) return;
  const ids = orderedSelection();
  const ready = ids.filter(id => files.has(id)).length;
  $('#selection-bar').hidden = ids.length === 0;
  $('#selection-count').textContent = `${ids.length} selected`;
  $('#selection-status').textContent = failures.size && ids.some(id => failures.has(id)) ? 'Tap Save selected to retry' : ready === ids.length ? 'Ready to save' : `Preparing ${ready} of ${ids.length}…`;
  $('#save-selection').disabled = activeShare;
  const all = platformAssets();
  $('#select-platform').textContent = all.length && all.every(id => selected.has(id)) ? 'Deselect all' : 'Select all';
  document.querySelectorAll('input[data-id]').forEach(input => { input.checked = selected.has(input.dataset.id); });
}
function preview(asset, className = '') {
  const media = asset.type.startsWith('video/')
    ? el('video', {src:assetUrl(asset), controls:'', playsinline:'', preload:'metadata', 'aria-label':asset.title})
    : el('img', {src:assetUrl(asset), alt:asset.title, loading:'lazy', width:asset.width, height:asset.height});
  if (asset.type.startsWith('video/')) return el('div', {className}, media);
  return el('a', {href:assetUrl(asset), className, 'aria-label':`Open ${asset.title}`}, media);
}
function renderAsset(id, index, total) {
  const asset = assetMap.get(id);
  const input = el('input', {type:'checkbox', 'data-id':id, 'aria-label':`Select ${asset.title}`});
  input.checked = selected.has(id);
  input.addEventListener('change', () => {
    if (input.checked) { selected.add(id); prepare(id).catch(() => {}); }
    else selected.delete(id);
    updateSelection();
  });
  const figure = el('figure', {className:'asset', 'data-asset':id},
    el('div', {className:'asset-view'}, preview(asset, 'media-link'), el('label', {className:'select-label'}, input)),
    el('figcaption', {}, el('span', {className:'muted', text:`${total > 1 ? `${index + 1} / ${total} · ` : ''}${asset.width} × ${asset.height}`}),
      total > 1 ? button(asset.type.startsWith('video/') ? 'Save video' : 'Save photo', 'text-button', () => requestSave([id]), `Save ${asset.title}`) : null));
  observer.observe(figure);
  return figure;
}
function copyText(text) {
  if (!navigator.clipboard?.writeText) { toast('Select and copy the caption text below.'); return; }
  navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard.'), () => toast('Couldn’t copy. Select and copy the text below.'));
}
function renderSetupGuide() {
  const template = document.querySelector(`#guide-${platform}`);
  const guide = $('#setup-guide');
  guide.hidden = !template;
  guide.open = false;
  if (!template) return;
  const info = catalog.platforms.find(item => item.id === platform);
  $('#setup-guide-title').textContent = `${info.title} brand setup guide`;
  const content = $('#setup-guide-content');
  content.replaceChildren(template.content.cloneNode(true));
  const profile = content.querySelector('[data-brand-profile]');
  if (profile) {
    profile.append(el('div', {className:'guide-profile-heading'}, el('img', {src:assetUrl(assetMap.get(`${platform}-profile`)), alt:'PumpDuel profile picture', width:56, height:56}),
      el('div', {}, el('strong', {text:info.displayName}), el('p', {className:'muted',text:'Use the same PD mark across your accounts.'}))),
      el('p', {className:'guide-bio',text:info.bio}),
      el('div', {className:'guide-actions'},
        button('Save profile photo','secondary',() => requestSave([`${platform}-profile`]),`Save ${info.title} profile photo`),
        button('Copy name','secondary',() => copyText(info.displayName),`Copy ${info.title} display name`),
        button('Copy bio','secondary',() => copyText(info.bio),`Copy ${info.title} bio`)));
  }
  const highlights = content.querySelector('[data-highlight-map]');
  if (highlights) {
    for (const [key,name,purpose] of [
      ['start','Start','Meet PumpDuel and find your people.'],
      ['crew','Crew','Explain groups and daily workouts.'],
      ['duels','Duels','Show how live competition works.'],
      ['challenge','Challenge','Explain taking turns with a friend.'],
      ['progress','Progress','Show rep totals and recent activity.'],
      ['how-to','How to','Help someone begin their first set.']
    ]) {
      highlights.append(el('div',{className:'highlight-row'},
        el('img',{src:assetUrl(assetMap.get(`instagram-highlights-${key}`)),alt:`${name} Highlight cover`,width:48,height:48,loading:'lazy'}),
        el('div',{className:'highlight-description'},el('strong',{text:name}),el('p',{text:purpose})),
        el('div',{className:'guide-actions'},
          button('Save Stories','secondary',() => requestSave(catalog.posts.find(post => post.id === `instagram-story-${key}`).assets),`Save ${name} Highlight Stories`),
          button('Save cover','secondary',() => requestSave([`instagram-highlights-${key}`]),`Save ${name} Highlight cover`))));
    }
  }
  content.querySelectorAll('[data-save-post]').forEach(control => {
    const post = catalog.posts.find(item => item.id === control.dataset.savePost);
    control.addEventListener('click',() => requestSave(post.assets));
  });
  content.querySelectorAll('[data-copy-post]').forEach(control => {
    const post = catalog.posts.find(item => item.id === control.dataset.copyPost);
    control.addEventListener('click',() => copyText(post.caption));
  });
  content.querySelectorAll('[data-copy-website]').forEach(control => control.addEventListener('click',() => copyText('https://pumpduel.com')));
}

function renderPlatform() {
  observer.disconnect();
  const info = catalog.platforms.find(item => item.id === platform);
  const posts = catalog.posts.filter(post => post.platform === platform);
  $('#platform-title').textContent = info.title;
  $('#asset-count').textContent = `${platformAssets().length} photos · ${posts.length} sets`;
  $('#platforms').replaceChildren(...catalog.platforms.map(item => {
    const link = el('a', {href:`#${item.id}`, text:item.title});
    if (item.id === platform) link.setAttribute('aria-current','page');
    return link;
  }));
  $('#gallery').replaceChildren(...posts.map(post => {
    const actions = el('div', {className:'post-actions'});
    if (post.caption) actions.append(button('Copy caption', 'secondary', () => copyText(post.caption), `Copy caption for ${post.title}`));
    const caption = post.caption ? el('details', {className:'caption'}, el('summary', {text:'Caption'}), el('p', {text:post.caption})) : null;
    return el('article', {className:'post'}, el('div', {className:'post-heading'}, el('p', {className:'muted', text:post.kind}), el('div', {className:'post-title-row'}, el('h3', {text:post.title}), button(post.assets.length > 1 ? 'Save post' : 'Save photo', 'primary', () => requestSave(post.assets), `Save ${post.platform} ${post.title} post`))),
      el('div', {className:'assets', 'aria-label':`${post.title} photos in post order`}, ...post.assets.map((id,index) => renderAsset(id,index,post.assets.length))),
      actions.children.length ? actions : null, caption);
  }));
  $('#gallery').setAttribute('aria-busy','false');
  $('#select-platform').disabled = false;
  $('#profile-content').replaceChildren(el('h3', {text:'Display name'}), el('p', {text:info.displayName}), button('Copy name','secondary',() => copyText(info.displayName)),
    el('h3', {text:'Bio'}), el('p', {text:info.bio}), button('Copy bio','secondary',() => copyText(info.bio)));
  $('#profile-copy').hidden = false;
  $('#profile-copy').open = false;
  renderSetupGuide();
  updateSelection();
}
function showDialog(title, message, ids = []) {
  $('#save-title').textContent = title;
  $('#save-message').textContent = message;
  $('#save-items').replaceChildren(...ids.map(id => preview(assetMap.get(id))));
  $('#confirm-save').hidden = true;
  $('#confirm-save').disabled = true;
  $('#confirm-save').onclick = null;
  if (!dialog.open) dialog.showModal();
}
function unsupported(ids) {
  showDialog('Save your photos', ids.length > 1
    ? 'This browser can’t save these items together. Try a smaller selection in iPhone Safari, or open a photo below and touch and hold it to save it.'
    : 'Open the photo below, then touch and hold it to save to Photos. On a computer, open the photo and use Save Image.', ids);
}
async function shareNow(ids) {
  const payload = {files:ids.map(id => files.get(id))};
  if (!shareSupported(payload)) { unsupported(ids); return; }
  if (activeShare) return;
  activeShare = true;
  $('#confirm-save').disabled = true;
  updateSelection();
  try {
    // Call before any await: iOS requires a fresh user gesture.
    const result = navigator.share(payload);
    if (dialog.open) dialog.close();
    toast(`Choose Save Image${ids.length > 1 ? 's' : ''} or Save Video in the share menu.`);
    await result;
    // A resolved share does not prove that Photos saved the files.
  } catch(error) {
    if (error.name === 'AbortError') toast('Sharing cancelled. Your selection is still here.');
    else { showDialog('Try saving again', 'The share menu couldn’t open. Tap below to try again, or open a photo individually.', ids); enableConfirm(ids); }
  } finally { activeShare = false; updateSelection(); }
}
function enableConfirm(ids) {
  $('#confirm-save').hidden = false;
  $('#confirm-save').disabled = false;
  $('#confirm-save').textContent = 'Save to Photos';
  $('#confirm-save').onclick = () => shareNow(ids);
}
async function requestSave(ids) {
  if (activeShare || !ids.length) return;
  const version = ++dialogVersion;
  if (ids.every(id => files.has(id))) { shareNow(ids); return; }
  showDialog('Save to Photos', `Preparing ${ids.length} ${ids.length === 1 ? 'item' : photoWord(ids)}…`, ids);
  try {
    await Promise.all(ids.map(prepare));
    if (version !== dialogVersion || !dialog.open) return;
    if (!shareSupported({files:ids.map(id => files.get(id))})) { unsupported(ids); return; }
    $('#save-message').textContent = 'Ready. Tap below, then choose Save Image, Save Images or Save Video in the iPhone share menu.';
    enableConfirm(ids);
  } catch {
    if (version !== dialogVersion || !dialog.open) return;
    $('#save-message').textContent = 'Some photos couldn’t load. Check your connection and try again. Nothing has been saved by this page.';
    $('#confirm-save').hidden = false;
    $('#confirm-save').disabled = false;
    $('#confirm-save').textContent = 'Try again';
    $('#confirm-save').onclick = () => requestSave(ids);
  }
}
$('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => { dialogVersion++; });
$('#help').addEventListener('click', () => showDialog('Save to your iPhone', 'Open this page in Safari. Tap Save photo or Save post, then choose Save Image or Save Images in the share menu. For a custom set, tick the photos and tap Save selected. If a large selection can’t be shared together, try a smaller one.'));
$('#save-selection').addEventListener('click', () => requestSave(orderedSelection()));
$('#clear-selection').addEventListener('click', () => { selected.clear(); updateSelection(); });
$('#select-platform').addEventListener('click', () => {
  const ids = platformAssets();
  if (ids.every(id => selected.has(id))) ids.forEach(id => selected.delete(id));
  else ids.forEach(id => { selected.add(id); prepare(id).catch(() => {}); });
  updateSelection();
});
window.addEventListener('hashchange', () => {
  if (!catalog) return;
  const next = location.hash.slice(1);
  if (catalog.platforms.some(item => item.id === next) && next !== platform) { platform = next; renderPlatform(); }
});
try {
  const response = await fetch('catalog.json', {credentials:'omit', cache:'no-cache'});
  if (!response.ok) throw new Error('Catalog failed');
  catalog = await response.json();
  assetMap = new Map(catalog.assets.map(asset => [asset.id,asset]));
  $('.brand img').src = assetUrl(assetMap.get('instagram-profile'));
  $('link[rel="icon"]').href = assetUrl(assetMap.get('instagram-profile'));
  platform = catalog.platforms.some(item => item.id === location.hash.slice(1)) ? location.hash.slice(1) : catalog.platforms[0].id;
  renderPlatform();
} catch {
  $('#asset-count').textContent = 'The photos couldn’t load.';
  $('#gallery').replaceChildren(el('p', {className:'error-message', text:'Check your connection, then refresh this page.'}));
  $('#gallery').setAttribute('aria-busy','false');
}
