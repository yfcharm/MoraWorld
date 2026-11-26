// Every lane holds the same source frame: RGB, then each white-clay level in order.
export function initializeFilms(wall, sync) {
  const clay = wall.querySelector('.mw-clay');
  const video = clay.querySelector('video');
  const cameraButtons = [...clay.querySelectorAll('.mw-segmented button')];
  const proxy = clay.querySelector('canvas');
  const context = proxy.getContext('2d');
  const control = clay.querySelector('.mw-slider');
  const slider = control.querySelector('input');
  const labels = ['Robot only', 'Robot and bowls', 'Robot, bowls and table'];
  const stops = [...control.querySelector('.mw-stops').children];
  const MAX = stops.length - 1;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let level = Number(slider.value);
  let cue = 0;
  let frameCallback = null;
  let animation = 0;
  let pointer = null;

  function paint() {
    if (video.readyState < 2 || video.seeking) return;
    const width = video.videoWidth / (MAX + 2);
    const base = Math.floor(level);
    function lane(index, opacity) {
      context.globalAlpha = opacity;
      context.drawImage(video, (index + 1) * width, 0, width, video.videoHeight,
        0, 0, proxy.width, proxy.height);
    }
    lane(base, 1);
    if (level > base) lane(base + 1, level - base);
    context.globalAlpha = 1;
    clay.setAttribute('data-painted', '');
  }

  function setLevel(value) {
    level = Math.max(0, Math.min(MAX, value));
    const nearest = Math.round(level);
    slider.value = nearest;
    slider.setAttribute('aria-valuetext', labels[nearest]);
    control.style.setProperty('--position', level);
    clay.style.setProperty('--layer-position', ((nearest + 1) / (MAX + 1) * 100) + '%');
    stops.forEach((stop, i) => stop.classList.toggle('mw-selected', i === nearest));
    paint();
  }

  function settle(target) {
    cancelAnimationFrame(animation);
    const start = performance.now(), from = level;
    if (reduceMotion.matches || Math.abs(target - from) < .01) return setLevel(target);
    function step(now) {
      const t = Math.min(1, (now - start) / 195);
      setLevel(from + (target - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) animation = requestAnimationFrame(step);
    }
    animation = requestAnimationFrame(step);
  }

  function position(clientX) {
    const rect = control.getBoundingClientRect();
    return Math.max(0, Math.min(MAX, (MAX + 1) * (clientX - rect.left) / rect.width - .5));
  }
  slider.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    cancelAnimationFrame(animation);
    slider.focus({ preventScroll: true });
    slider.setPointerCapture(event.pointerId);
    pointer = { id: event.pointerId, x: event.clientX };
  });
  slider.addEventListener('pointermove', event => {
    if (pointer?.id === event.pointerId && Math.abs(event.clientX - pointer.x) > 2) {
      setLevel(position(event.clientX));
    }
  });
  slider.addEventListener('pointerup', event => {
    if (pointer?.id !== event.pointerId) return;
    pointer = null;
    settle(Math.round(position(event.clientX)));
  });
  slider.addEventListener('lostpointercapture', () => {
    if (pointer) { pointer = null; settle(Math.round(level)); }
  });
  slider.addEventListener('input', () => { cancelAnimationFrame(animation); setLevel(Number(slider.value)); });
  slider.addEventListener('change', () => settle(Math.round(Number(slider.value))));
  slider.addEventListener('keydown', event => {
    const current = Math.round(level);
    const keys = { ArrowLeft: current - 1, ArrowDown: current - 1, ArrowRight: current + 1,
      ArrowUp: current + 1, Home: 0, End: MAX, PageDown: 0, PageUp: MAX };
    if (!(event.key in keys)) return;
    event.preventDefault();
    cancelAnimationFrame(animation);
    setLevel(keys[event.key]);
  });

  function schedule() {
    if (frameCallback !== null || video.paused || document.hidden) return;
    const step = () => { frameCallback = null; paint(); schedule(); };
    frameCallback = video.requestVideoFrameCallback ? video.requestVideoFrameCallback(step) : requestAnimationFrame(step);
  }
  function stop() {
    if (frameCallback === null) return;
    if (video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(frameCallback);
    else cancelAnimationFrame(frameCallback);
    frameCallback = null;
  }
  cameraButtons.forEach(button => button.addEventListener('click', () => {
    const view = button.dataset.camera;
    if (clay.dataset.camera === view) return;
    if (video.readyState >= 1) cue = video.currentTime;
    stop();
    clay.removeAttribute('data-painted');
    clay.dataset.camera = view;
    cameraButtons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    const basename = 'bowls-' + view;
    video.poster = new URL(basename + '.webp', import.meta.url).href;
    video.src = new URL(basename + '.mp4', import.meta.url).href;
    sync();
  }));
  video.addEventListener('loadedmetadata', () => { if (cue > 0) video.currentTime = Math.min(cue, video.duration - .05); });
  for (const event of ['loadeddata', 'seeked']) video.addEventListener(event, paint);
  video.addEventListener('playing', schedule);
  video.addEventListener('pause', stop);
  setLevel(level);



  // Memory: mark the first look, the turn away and the return on one track.
  const revisit = wall.querySelector('.mw-revisit-film');
  const track = wall.querySelector('.mw-revisit-track');
  const marks = [...track.querySelectorAll('button')];
  const back = wall.querySelector('.mw-revisit-back');
  let matched = false;
  function follow() {
    if (!revisit.duration) return;
    const t = revisit.currentTime;
    track.style.setProperty('--p', t / revisit.duration);
    const reached = marks.filter(mark => t >= Number(mark.dataset.t) - .05).length - 1;
    marks.forEach((mark, i) => mark.classList.toggle('mw-reached', i <= reached));
    matched = t >= 4.9 || (matched && t < 1);
    back.classList.toggle('mw-match', matched);
  }
  let followFrame = 0;
  function loop() { follow(); followFrame = revisit.paused ? 0 : requestAnimationFrame(loop); }
  revisit.addEventListener('playing', () => { if (!followFrame) followFrame = requestAnimationFrame(loop); });
  revisit.addEventListener('seeked', follow);
  marks.forEach(mark => mark.addEventListener('click', () => {
    if (revisit.readyState >= 1) revisit.currentTime = Number(mark.dataset.t);
  }));

  // Failure: light each step of the attempt as the film reaches it.
  const attempt = wall.querySelector('.mw-failure-film');
  const steps = [...wall.querySelectorAll('.mw-steps li')];
  const reachedAt = [2.6, 4, 5.8];
  let stepFrame = 0;
  function markStep() {
    const t = attempt.currentTime;
    const now = reachedAt.filter(at => t >= at).length - 1;
    steps.forEach((step, i) => step.classList.toggle('mw-now', i === now));
    stepFrame = attempt.paused ? 0 : requestAnimationFrame(markStep);
  }
  attempt.addEventListener('playing', () => { if (!stepFrame) stepFrame = requestAnimationFrame(markStep); });
  attempt.addEventListener('seeked', () => { if (!stepFrame) markStep(); });
  steps.forEach(step => step.querySelector('button').addEventListener('click', () => {
    if (attempt.readyState >= 1) attempt.currentTime = Number(step.querySelector('button').dataset.t);
  }));
}
