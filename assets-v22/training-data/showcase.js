import { initializeFilms } from './studies.js';

const presentation = document.querySelector('#data .mw-training');
const featured = presentation.querySelector('.mw-training-wall');
const shots = Array.from(featured.querySelectorAll('video'));
const scale = presentation.querySelector('.mw-scale');
const canvas = presentation.querySelector('.mw-wall');
const context = canvas.getContext('2d');
const legend = presentation.querySelector('.mw-legend');
const legendButtons = Array.from(legend.querySelectorAll('button'));
const counter = presentation.querySelector('[data-count]');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const playToggle = presentation.querySelector('.mw-play');
let wantsPlayback = !motionPreference.matches;
let wallVisible = false;
let atlasVisible = false;
let frameRequest = 0;
let lastFrame = 0;
let clock = 0;
let boxWidth = 0;
let boxHeight = 0;
let resolution = 1;

// The atlas video packs 183 clips into a 16-column grid of 120x80 tiles.
// One letter per tile: human, robot, clay, memory, failure.
const KINDS = 'fcmfffhfrrffhmhrmfhcfrrmmrhhfrhcmfrrrmmhhmrhfmfhrhcfhhfrrffrrrrrcmhhmhcmhmmcmmfhhchcmhrrccfcchhrfhhrhrhrrrhmfmmcmfrrhmfrfchmcmmmcmrcrcmhrmrmchmhrrmcfrcfmmccmfrmmhhcfrmcfrrrfmmmcrffrfh';
const SOURCE_NAMES = ["AgiBot", "AgiBotWorld2025", "AgiBotWorld2026", "BEHAVIOR-1K", "EgoDex", "EgoVerse", "Galaxea", "InternData-A1", "ManipArena", "Matterport3D", "RoboChallenge", "RoboChallenge v2", "RoboTwin", "Sekai2", "luna-v0.1"];
const SOURCES = 'mbgmmmemckmmenekgmfbmkhddkeemkebdmkgkdieeigemnmegelmeemggmmkgchhbneenebneiibdjmeebfbiegkbbmobefkmeekekegkhenmgignmkcenmhmbenongnajgokgjegncgbfjehgnbmkimnibbnmgdgeebmgnbmgkgmidjbkmmcme';
const KIND_NAMES = { h: 'Human', r: 'Robot', c: 'White clay', m: 'Memory', f: 'Failure' };
const COLORS = { h: '#cfabff', r: '#96c8fb', c: '#e7d0a4', m: '#8bdbcd', f: '#f7a692' };
const tileCount = KINDS.length;
const atlasColumns = 16;
const atlasRows = Math.ceil(tileCount / atlasColumns);
const glow = new Float32Array(tileCount).fill(1);
let rows = [];
let tileW = 0, tileH = 0, gap = 0;
let hoverKind = null;
let lockedKind = null;
let hits = [];

const fallback = new Image();
const texture = document.createElement('video');
texture.muted = true;
texture.playsInline = true;
texture.loop = true;
texture.preload = 'none';

function layout() {
  const rect = canvas.getBoundingClientRect();
  boxWidth = canvas.offsetWidth; boxHeight = canvas.offsetHeight;
  if (!boxWidth || !boxHeight || !rect.width) return;
  resolution = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(boxWidth * resolution);
  canvas.height = Math.round(boxHeight * resolution);
  tileW = boxWidth < 700 ? 66 : boxWidth < 1200 ? 86 : 98;
  tileH = Math.round(tileW * 2 / 3);
  gap = boxWidth < 700 ? 3 : 4;
  const rowCount = Math.max(5, Math.ceil(boxHeight / (tileH + gap)));
  // Deal tiles across rows so each row mixes every kind and none repeats on screen.
  rows = Array.from({ length: rowCount }, (_, r) => ({
    slots: [], speed: (r % 2 ? -1 : 1) * (9 + (r * 7) % 6), phase: r * 211
  }));
  for (let i = 0; i < tileCount; i++) rows[i % rowCount].slots.push(i);
  draw();
}

function activeKind() { return lockedKind ?? hoverKind; }

function draw() {
  if (!boxWidth || !rows.length) return;
  context.setTransform(resolution, 0, 0, resolution, 0, 0);
  context.clearRect(0, 0, boxWidth, boxHeight);
  const moving = texture.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  const source = moving ? texture : fallback;
  const sw = (moving ? texture.videoWidth : fallback.naturalWidth) / atlasColumns;
  const sh = (moving ? texture.videoHeight : fallback.naturalHeight) / atlasRows;
  if (!sw || !sh) return;
  const kind = activeKind();
  hits = [];
  const pitch = tileW + gap;
  const top = (boxHeight - rows.length * (tileH + gap) + gap) / 2;
  rows.forEach((row, r) => {
    const span = row.slots.length * pitch;
    const shift = ((row.phase + clock * row.speed) % span + span) % span;
    const y = top + r * (tileH + gap);
    for (let x = -shift, k = 0; x < boxWidth; x += pitch, k++) {
      if (x + tileW < 0) continue;
      const slot = row.slots[k % row.slots.length];
      context.drawImage(source, slot % atlasColumns * sw, Math.floor(slot / atlasColumns) * sh, sw, sh, x, y, tileW, tileH);
      const lit = glow[slot];
      if (lit < .995) {
        context.fillStyle = 'rgba(9,11,14,' + (1 - lit) * .86 + ')';
        context.fillRect(x, y, tileW, tileH);
      }
      const tint = KINDS[slot];
      context.globalAlpha = kind ? (kind === tint ? 1 : 0) : .55;
      context.fillStyle = COLORS[tint];
      if (kind === tint) {
        context.lineWidth = 2;
        context.strokeStyle = COLORS[tint];
        context.strokeRect(x + 1, y + 1, tileW - 2, tileH - 2);
      } else {
        context.fillRect(x, y + tileH - 2, tileW, 2);
      }
      context.globalAlpha = 1;
      hits.push({ x, y, slot });
    }
  });
}

function easeGlow(dt) {
  const kind = activeKind();
  let settling = false;
  for (let i = 0; i < tileCount; i++) {
    const target = !kind || KINDS[i] === kind ? 1 : .1;
    const next = glow[i] + (target - glow[i]) * Math.min(1, dt / 110);
    if (Math.abs(next - target) > .003) settling = true;
    glow[i] = Math.abs(next - target) > .003 ? next : target;
  }
  return settling;
}

function tick(now) {
  frameRequest = 0;
  if (!atlasVisible || document.hidden) return;
  const dt = lastFrame ? Math.min(now - lastFrame, 100) : 16;
  lastFrame = now;
  if (wantsPlayback) clock += dt / 1000;
  const settling = easeGlow(dt);
  draw();
  if (wantsPlayback || settling) frameRequest = requestAnimationFrame(tick);
}
function wake() {
  if (!frameRequest && atlasVisible && !document.hidden) { lastFrame = 0; frameRequest = requestAnimationFrame(tick); }
}

function setFocus() {
  const kind = activeKind();
  if (kind) { scale.dataset.focus = kind; legend.dataset.focus = kind; }
  else { delete scale.dataset.focus; delete legend.dataset.focus; }
  for (const button of legendButtons) {
    button.classList.toggle('mw-on', button.dataset.kind === kind);
    button.setAttribute('aria-pressed', String(button.dataset.kind === lockedKind));
  }
  wake();
}

for (const button of legendButtons) {
  button.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hoverKind = button.dataset.kind; setFocus(); } });
  button.addEventListener('pointerleave', () => { hoverKind = null; setFocus(); });
  button.addEventListener('click', () => {
    lockedKind = lockedKind === button.dataset.kind ? null : button.dataset.kind;
    setFocus();
  });
}

// Hovering a tile lights up every clip of the same kind.
function tileAt(event) {
  const rect = canvas.getBoundingClientRect();
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  const angle = 4 * Math.PI / 180;
  const dx = event.clientX - cx, dy = event.clientY - cy;
  const x = dx * Math.cos(angle) - dy * Math.sin(angle) + boxWidth / 2;
  const y = dx * Math.sin(angle) + dy * Math.cos(angle) + boxHeight / 2;
  return hits.find(h => x >= h.x && x < h.x + tileW && y >= h.y && y < h.y + tileH);
}
const tip = document.createElement('div');
tip.className = 'mw-tip';
tip.setAttribute('aria-hidden', 'true');
scale.append(tip);
let tipSlot = -1;
canvas.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse') return;
  const hit = tileAt(event);
  const kind = hit ? KINDS[hit.slot] : null;
  if (kind !== hoverKind) { hoverKind = kind; setFocus(); }
  if (!hit) { tip.classList.remove('mw-show'); tipSlot = -1; return; }
  if (hit.slot !== tipSlot) {
    tipSlot = hit.slot;
    const source = SOURCE_NAMES[SOURCES.charCodeAt(hit.slot) - 97];
    tip.style.setProperty('--c', COLORS[kind]);
    tip.innerHTML = '<i></i>' + KIND_NAMES[kind] + ' <span>· ' + source + '</span>';
  }
  const box = scale.getBoundingClientRect();
  const x = Math.min(event.clientX - box.left + 14, box.width - tip.offsetWidth - 8);
  tip.style.transform = 'translate(' + x + 'px,' + (event.clientY - box.top + 16) + 'px)';
  tip.classList.add('mw-show');
});
canvas.addEventListener('pointerleave', () => { hoverKind = null; setFocus(); tip.classList.remove('mw-show'); tipSlot = -1; });
canvas.addEventListener('click', event => {
  const hit = tileAt(event);
  const kind = hit ? KINDS[hit.slot] : null;
  lockedKind = lockedKind === kind ? null : kind;
  setFocus();
});
canvas.addEventListener('keydown', event => {
  if (event.code === 'Space') { event.preventDefault(); wantsPlayback = !wantsPlayback; sync(); }
  if (event.key === 'Escape') { lockedKind = null; setFocus(); }
});

function playIfPaused(video) {
  if (video.paused) video.play().catch(error => {
    if (error.name === 'NotAllowedError' && wantsPlayback) { wantsPlayback = false; sync(); }
  });
}

function sync() {
  const active = wantsPlayback && !document.hidden;
  for (const video of shots) {
    if (wallVisible && active && video.readyState >= 2) playIfPaused(video);
    else video.pause();
  }
  if (atlasVisible && active) loadTexture();
  if (atlasVisible && active && texture.readyState >= 2) playIfPaused(texture);
  else texture.pause();
  wake();
  const label = wantsPlayback ? 'Pause all motion' : 'Play all motion';
  playToggle.dataset.paused = String(!wantsPlayback);
  playToggle.setAttribute('aria-label', label);
  playToggle.title = label;
}

// Count up the headline figure once, the first time the wall comes into view.
let counted = false;
function countUp() {
  if (counted) return;
  counted = true;
  const target = Number(counter.dataset.count);
  if (motionPreference.matches) return;
  const start = performance.now();
  const step = now => {
    const t = Math.min(1, (now - start) / 1400);
    counter.textContent = Math.round(target * (1 - Math.pow(1 - t, 4))).toLocaleString('en-US');
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

initializeFilms(featured, sync);
playToggle.onclick = () => { wantsPlayback = !wantsPlayback; sync(); };
for (const video of shots) video.addEventListener('loadeddata', sync);
texture.addEventListener('loadeddata', () => { draw(); sync(); });
fallback.onload = draw;
document.addEventListener('visibilitychange', sync);
motionPreference.addEventListener('change', event => { if (event.matches) { wantsPlayback = false; sync(); } });
new ResizeObserver(layout).observe(scale);

// Defer the films while visitors are reading earlier chapters.
const preload = new IntersectionObserver(([entry]) => {
  if (!entry.isIntersecting) return;
  preload.disconnect();
  for (const video of shots) {
    video.preload = 'auto';
    video.src = new URL(video.dataset.file, import.meta.url).href;
  }
  if (!motionPreference.matches) loadTexture();
  fallback.src = new URL('atlas-sheet.webp', import.meta.url).href;
}, { rootMargin: '400px 0px' });
preload.observe(presentation);
function loadTexture() {
  if (texture.hasAttribute('src')) return;
  texture.preload = 'auto';
  texture.src = new URL('motion-mixture.mp4', import.meta.url).href;
}
const visibility = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.target === featured) wallVisible = entry.isIntersecting;
    else { atlasVisible = entry.isIntersecting; if (entry.isIntersecting) countUp(); }
  }
  sync();
});
visibility.observe(featured);
visibility.observe(scale);
layout();
sync();
