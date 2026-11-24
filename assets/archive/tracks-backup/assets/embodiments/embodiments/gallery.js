(() => {
  const gallery = document.getElementById('embodiment-showcase');
  const wall = gallery.querySelector('.em-wall');
  const cards = [...wall.querySelectorAll('.em-card')];
  const desktopPageSize = Number(wall.dataset.pageSize);
  const motion = gallery.querySelector('.em-motion');
  const pager = gallery.querySelector('.em-pager');
  const previous = pager.querySelector('.em-prev');
  const next = pager.querySelector('.em-next');
  const counter = pager.querySelector('.em-page-number');
  const narrow = matchMedia('(max-width:760px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion:reduce)');
  const visible = new Set();
  let active = 0;
  let paused = false;

  const overlay = gallery.querySelector('.em-overlay-switch');
  const supportsOverlay = CSS.supports('width', 'max(100cqw, 173.3333cqh)');
  if (supportsOverlay) {
    for (const card of cards) {
      const video = card.querySelector('video');
      const cleanPoster = video.poster;
      card.classList.add('em-paired');
      video.poster = video.dataset.overlayPoster;
      video.addEventListener('error', () => {
        card.classList.remove('em-paired');
        video.poster = cleanPoster;
        video.src = video.dataset.src;
        syncPlayback(video);
      }, {once:true});
    }
    overlay.hidden = false;
    overlay.addEventListener('click', () => {
      const enabled = gallery.classList.toggle('em-overlay-on');
      overlay.setAttribute('aria-checked', String(enabled));
    });
  }

  function setPaused(value) {
    paused = value;
    motion.dataset.paused = String(value);
    const label = paused ? 'Play previews' : 'Pause previews';
    motion.querySelector('.em-motion-label').textContent = label;
    visible.forEach(syncPlayback);
  }

  function syncPlayback(video) {
    if (!visible.has(video) || !wall.children[active]?.contains(video) || paused || document.hidden) {
      video.pause();
      return;
    }
    video.muted = true;
    if (!video.hasAttribute('src')) {
      video.src = supportsOverlay ? video.dataset.overlaySrc : video.dataset.src;
    }
    video.play().catch(error => {
      if (error.name === 'NotAllowedError' && !paused && visible.has(video)) setPaused(true);
    });
  }

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
      syncPlayback(entry.target);
    }
  });

  function selectPage(index) {
    active = index;
    const count = wall.children.length;
    [...wall.children].forEach((panel, i) => { panel.inert = i !== active; });
    counter.textContent = (index + 1) + ' / ' + count;
    previous.disabled = index === 0;
    next.disabled = index === count - 1;
    pager.hidden = count === 1;
    visible.forEach(syncPlayback);
  }

  function buildPages() {
    const ordered = [...cards];
    if (narrow.matches) {
      // Keep the second-page feature after the curated mobile opening.
      const mobileOrder = card => {
        if (card.classList.contains('em-mobile-lead')) return 0;
        if (card === cards[desktopPageSize]) return 1;
        return card.classList.contains('em-mobile-second') ? 2 : 3;
      };
      ordered.sort((a, b) => mobileOrder(a) - mobileOrder(b));
    }
    const pageSize = narrow.matches ? 7 : desktopPageSize;
    const panels = document.createDocumentFragment();
    observer.disconnect();
    visible.clear();
    cards.forEach(card => card.querySelector('video').pause());
    for (let i = 0; i < ordered.length; i += pageSize) {
      const panel = document.createElement('div');
      panel.className = 'em-page';
      panel.append(...ordered.slice(i, i + pageSize));
      panels.append(panel);
    }
    wall.replaceChildren(panels);
    wall.scrollLeft = 0;
    selectPage(0);
    cards.forEach(card => observer.observe(card.querySelector('video')));
  }

  function turn(direction) {
    const target = Math.min(wall.children.length - 1, Math.max(0, active + direction));
    wall.scrollTo({left: target * wall.clientWidth, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
  }

  wall.addEventListener('scroll', () => {
    const index = Math.max(0, Math.min(wall.children.length - 1, Math.round(wall.scrollLeft / wall.clientWidth)));
    if (index !== active) selectPage(index);
  }, {passive:true});
  function onArrow(event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    turn(event.key === 'ArrowLeft' ? -1 : 1);
  }
  wall.addEventListener('keydown', onArrow);
  pager.addEventListener('keydown', onArrow);
  previous.addEventListener('click', () => turn(-1));
  next.addEventListener('click', () => turn(1));
  narrow.addEventListener('change', buildPages);
  motion.addEventListener('click', () => setPaused(!paused));
  document.addEventListener('visibilitychange', () => visible.forEach(syncPlayback));
  buildPages();
})();
