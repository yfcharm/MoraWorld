(() => {
  const cover = document.getElementById('cover');
  const scene = cover?.querySelector('.mw-cover');
  const front = scene?.querySelector('.mw-cover__front');
  const overview = document.querySelector('#take video');
  const watch = document.querySelector('.mw-cover__continue');
  if (!front || !overview || !watch) return;

  let nearCover = true;
  let armed = true;
  let hasScrolled = false;

  function restart(muted) {
    armed = false;
    if (muted) overview.muted = true;
    overview.currentTime = 0;
    overview.play().catch(() => {});
  }

  watch.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    restart(false);
  });

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let previousProgress;

  function update() {
    frame = 0;
    const distance = Math.max(0, -cover.getBoundingClientRect().top);
    const hold = cover.clientHeight - scene.clientHeight;
    const progress = hold > 0 && !motion.matches ? Math.min(1, distance / hold) : 0;
    if (progress !== previousProgress) {
      previousProgress = progress;
      front.style.setProperty('--mw-cover-progress', progress);
      front.classList.toggle('is-past-labels', progress >= .81);
    }

    const returned = distance <= scene.clientHeight * .04;
    if (returned && !nearCover) {
      armed = true;
      overview.pause();
    }
    nearCover = returned;
  }

  function schedule() {
    if (window.scrollY > 0) hasScrolled = true;
    if (!frame) frame = requestAnimationFrame(update);
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  motion.addEventListener('change', schedule);
  update();

  if (!('IntersectionObserver' in window)) return;
  const playbackThreshold = .55;
  new IntersectionObserver(([entry]) => {
    if (hasScrolled && armed && entry.intersectionRatio >= playbackThreshold) restart(true);
  }, { threshold: playbackThreshold }).observe(overview);
})();
