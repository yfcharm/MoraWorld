(() => {
  const root = document.getElementById('embodiment-showcase');
  const grid = root.querySelector('.ev-grid');
  const cards = [...grid.children];
  const picker = root.querySelector('.ev-models');
  const models = [...picker.querySelectorAll('button')];
  const all = root.querySelector('.ev-all');
  const motion = root.querySelector('.ev-motion');
  const pager = root.querySelector('.ev-pager');
  const count = pager.querySelector('.ev-count');
  const progress = pager.querySelector('.ev-time i');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pageSize = 4;
  const positions = ['top left', 'top right', 'bottom left', 'bottom right'];
  const visibleClips = new Set();
  let selection = null, paused = false;
  let pages = [], page = 0, videos = [];
  let clock = null, transition = null;

  function canPlay() {
    return !paused && !document.hidden && videos.some(video => visibleClips.has(video));
  }

  function syncClock() {
    if (!clock) return;
    // Give the new page a chance to load. Keep navigation usable even if every file fails.
    const ready = videos.some(video => !video.paused && video.readyState >= 3) ||
      videos.every(video => video.error);
    if (canPlay() && ready) {
      if (clock.playState === 'paused') clock.play();
    } else if (clock.playState === 'running') {
      clock.pause();
    }
  }

  function syncPlayback() {
    for (const video of videos) {
      if (!visibleClips.has(video) || !canPlay()) {
        video.pause();
        continue;
      }
      if (!video.hasAttribute('src')) video.src = video.dataset.src;
      if (!video.paused || video.error) continue;
      video.muted = true;
      video.play().catch(error => {
        if (error.name === 'NotAllowedError' && canPlay() && videos.includes(video)) setPaused(true);
      });
    }
    syncClock();
  }

  function setPaused(value) {
    paused = value;
    motion.dataset.paused = String(value);
    motion.querySelector('span').textContent = value ? 'Play previews' : 'Pause previews';
    syncPlayback();
  }

  function highlightModels(group) {
    for (const model of models) {
      const locations = [];
      model.querySelectorAll('.ev-slots i').forEach((slot, i) => {
        const shown = group[i]?.dataset.platform === model.dataset.model;
        slot.classList.toggle('filled', shown);
        if (shown) locations.push(positions[i]);
      });
      model.classList.toggle('is-showing', locations.length > 0);
      const description = [];
      if (model.querySelector('.ev-ood-label')) description.push('Outside the audited BI robotics training mix.');
      if (locations.length) description.push('On view: ' + locations.join(', ') + '.');
      model.setAttribute('aria-description', description.join(' '));
    }
  }

  function showPage(index, automatic = false) {
    if (clock) {
      clock.onfinish = null;
      clock.cancel();
      clock = null;
    }
    if (transition) transition.cancel();
    page = index;
    const group = pages[page];
    const previousVideos = videos;
    videos = group.map(card => card.querySelector('video'));
    for (const video of previousVideos) {
      if (!videos.includes(video)) video.pause();
    }
    for (const card of cards) card.hidden = !group.includes(card);
    highlightModels(group);
    for (const video of videos) {
      if (!previousVideos.includes(video) && video.readyState >= 1) video.currentTime = 0;
    }

    pager.hidden = pages.length === 1;
    count.textContent = (page + 1) + ' / ' + pages.length;
    if (!automatic) {
      root.querySelector('.ev-status').textContent = (selection || 'All clips') + ', page ' + (page + 1) + ' of ' + pages.length;
    }
    if (pages.length > 1) {
      const longest = Math.max(...group.map(card => Number(card.dataset.seconds)));
      const duration = Math.max(5000, longest * 1000 + 500);
      clock = progress.animate([{transform:'scaleX(0)'}, {transform:'scaleX(1)'}], {duration, fill:'forwards'});
      clock.pause();
      clock.onfinish = () => turn(1, true);
    }
    if (previousVideos.length && !reducedMotion.matches) {
      transition = grid.animate([{opacity:.62}, {opacity:1}], {duration:240, easing:'ease-out'});
    }
    syncPlayback();
  }

  function turn(direction, automatic = false) {
    if (pages.length > 1) showPage((page + direction + pages.length) % pages.length, automatic);
  }

  function select(name) {
    selection = name;
    root.querySelector('.ev-view span').textContent = name || 'On view';
    all.setAttribute('aria-pressed', String(!name));
    models.forEach(model => model.setAttribute('aria-pressed', String(model.dataset.model === name)));
    const subset = cards.filter(card => !name || card.dataset.platform === name);
    pages = [];
    for (let i = 0; i < subset.length; i += pageSize) {
      // Anchor the last window at the end so an incomplete quartet stays filled.
      const start = Math.max(0, Math.min(i, subset.length - pageSize));
      pages.push(subset.slice(start, start + pageSize));
    }
    showPage(0);
  }

  for (const card of cards) {
    const video = card.querySelector('video');
    for (const event of ['playing', 'waiting', 'error']) video.addEventListener(event, syncClock);
  }
  picker.addEventListener('click', event => {
    const model = event.target.closest('button[data-model]');
    if (model) select(selection === model.dataset.model ? null : model.dataset.model);
  });
  all.addEventListener('click', () => select(null));
  pager.querySelector('.ev-prev').addEventListener('click', () => turn(-1));
  pager.querySelector('.ev-next').addEventListener('click', () => turn(1));
  function handleArrow(event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    turn(event.key === 'ArrowRight' ? 1 : -1);
  }
  grid.addEventListener('keydown', handleArrow);
  pager.addEventListener('keydown', handleArrow);
  let touch;
  grid.addEventListener('touchstart', event => {
    touch = event.touches.length === 1 ? event.touches[0] : null;
  }, {passive:true});
  grid.addEventListener('touchcancel', () => { touch = null; });
  grid.addEventListener('touchend', event => {
    if (!touch) return;
    const dx = event.changedTouches[0].clientX - touch.clientX;
    const dy = event.changedTouches[0].clientY - touch.clientY;
    touch = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy)) turn(dx < 0 ? 1 : -1);
  }, {passive:true});
  motion.addEventListener('click', () => setPaused(!paused));
  document.addEventListener('visibilitychange', syncPlayback);
  select(null);
  const observer = new IntersectionObserver(entries => {
    for (const {target, isIntersecting} of entries) {
      if (isIntersecting) visibleClips.add(target);
      else visibleClips.delete(target);
    }
    syncPlayback();
  });
  cards.forEach(card => observer.observe(card.querySelector('video')));
})();
