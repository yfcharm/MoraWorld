(() => {
  const cover = document.getElementById('cover');
  const article = document.getElementById('moraworld-article');
  if (!cover || !article) return;

  const documentRoot = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const entryHash = '#' + article.id;
  const coverHash = '#' + cover.id;
  const idleTime = 170;
  let page = 'article';
  let version = 0;
  let lastWheel = -Infinity;
  let wheelDistance = 0;
  let wheelTimer;
  let guardDeadline = 0;
  let guardMinimum = 0;
  let swipeStart;

  function targetFor(hash) {
    if (!hash || hash === entryHash) return article;
    try {
      return document.getElementById(decodeURIComponent(hash.slice(1))) || article;
    } catch {
      return article;
    }
  }

  function jumpTo(hash) {
    targetFor(hash).scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  function releaseWheel() {
    clearTimeout(wheelTimer);
    documentRoot.classList.remove('mw-cover-handoff');
    window.removeEventListener('wheel', onWheel, true);
  }

  function guardWheel() {
    clearTimeout(wheelTimer);
    const now = performance.now();
    const quietAt = Math.max(guardMinimum, lastWheel + idleTime);
    const timeLeft = Math.min(guardDeadline, quietAt) - now;
    if (timeLeft <= 0) releaseWheel();
    else wheelTimer = setTimeout(guardWheel, timeLeft);
  }

  function onWheel(event) {
    if (event.ctrlKey) return;
    const now = performance.now();
    if (page === 'article' && (now >= guardDeadline || (now >= guardMinimum && now - lastWheel >= idleTime))) {
      releaseWheel();
      return;
    }
    event.preventDefault();
    if (page === 'cover' && event.deltaY > 0 && event.deltaY >= Math.abs(event.deltaX)) {
      if (now - lastWheel >= idleTime) wheelDistance = 0;
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
      wheelDistance += event.deltaY * scale;
      lastWheel = now;
      if (wheelDistance >= 22) enterArticle(entryHash, true);
    } else {
      lastWheel = now;
      if (page === 'article') guardWheel();
    }
  }

  function showCover() {
    version += 1;
    page = 'cover';
    lastWheel = -Infinity;
    wheelDistance = 0;
    clearTimeout(wheelTimer);
    article.inert = true;
    documentRoot.classList.remove('mw-cover-leaving', 'mw-cover-handoff');
    documentRoot.classList.add('mw-cover-open');
    window.scrollTo({ top: 0, behavior: 'instant' });
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
  }

  function showArticle() {
    page = 'article';
    documentRoot.classList.remove('mw-cover-open', 'mw-cover-leaving');
    article.inert = false;
  }

  function enterArticle(hash, fromWheel) {
    if (page !== 'cover') return;
    page = 'leaving';
    const ticket = ++version;
    let timeout;
    function finish() {
      cover.removeEventListener('transitionend', onEnd);
      clearTimeout(timeout);
      if (ticket !== version || page !== 'leaving') return;
      if (fromWheel) documentRoot.classList.add('mw-cover-handoff');
      showArticle();
      history.pushState(null, '', hash);
      article.focus({ preventScroll: true });
      jumpTo(hash);
      if (fromWheel) {
        const now = performance.now();
        guardMinimum = now + 150;
        guardDeadline = now + 620;
        guardWheel();
      } else {
        releaseWheel();
      }
    }
    function onEnd(event) {
      if (event.target === cover && event.propertyName === 'transform') finish();
    }

    if (motion.matches) {
      finish();
      return;
    }
    documentRoot.classList.add('mw-cover-leaving');
    jumpTo(hash);
    cover.addEventListener('transitionend', onEnd);
    timeout = setTimeout(finish, 620);
  }

  cover.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || link.hash === coverHash || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    enterArticle(link.hash, false);
  });

  cover.addEventListener('touchstart', event => {
    const finger = event.touches.length === 1 ? event.touches[0] : null;
    swipeStart = finger && { x: finger.clientX, y: finger.clientY };
  }, { passive: true });
  cover.addEventListener('touchend', event => {
    if (!swipeStart) return;
    const finger = event.changedTouches[0];
    const upward = swipeStart.y - finger.clientY;
    if (upward >= 45 && upward > Math.abs(finger.clientX - swipeStart.x)) {
      enterArticle(entryHash, false);
    }
    swipeStart = null;
  }, { passive: true });
  cover.addEventListener('touchcancel', () => { swipeStart = null; }, { passive: true });

  document.addEventListener('keydown', event => {
    if (page !== 'cover' || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!['ArrowDown', 'PageDown', ' '].includes(event.key)) return;
    if (event.target.closest?.('a, button, input, textarea, select, [contenteditable]')) return;
    event.preventDefault();
    enterArticle(entryHash, false);
  });

  function syncLocation() {
    const hash = location.hash;
    if (!hash || hash === coverHash) {
      if (page !== 'cover') showCover();
    } else if (page !== 'article') {
      version += 1;
      showArticle();
      releaseWheel();
      jumpTo(hash);
    }
  }

  documentRoot.classList.add('mw-cover-enhanced');
  syncLocation();
  window.addEventListener('hashchange', syncLocation);
  window.addEventListener('popstate', syncLocation);
})();
