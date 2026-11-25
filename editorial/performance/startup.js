(() => {
  const article = document.getElementById('moraworld-article');

  function loadScript(source) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.async = false;
      script.src = source;
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        reject(new Error('Could not load ' + source));
      };
      document.head.append(script);
    });
  }

  function near(element, load) {
    if (!element) return;
    if (!('IntersectionObserver' in window)) {
      load();
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting) || element.closest('[inert]')) return;
      observer.disconnect();
      state?.disconnect();
      load();
    }, {rootMargin: '250px 0px'});
    const state = article ? new MutationObserver(observe) : null;
    function observe() {
      observer.disconnect();
      if (!element.closest('[inert]')) observer.observe(element);
    }
    state?.observe(article, {attributeFilter: ['inert']});
    observe();
  }

  for (const section of ['control-demo', 'mobile-showcase']) {
    const scripts = Array.from(document.querySelectorAll('script[data-mw-near="' + section + '"]'));
    if (!scripts.length) continue;
    const target = document.getElementById(section);
    near(target, () => {
      Promise.all(scripts.map(node => loadScript(node.dataset.mwSrc))).catch(error => {
        console.error(error);
      });
    });
  }

  const frames = Array.from(document.querySelectorAll('image[data-mw-href]'));
  if (frames.length) near(document.getElementById('technical-approach'), () => {
    for (const frame of frames) frame.setAttribute('href', frame.getAttribute('data-mw-href'));
  });

  const cover = document.querySelector('[data-mw-cover-src]');
  const button = cover?.querySelector('[data-mw-cover-start]');
  if (!cover || !button || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  button.hidden = false;
  if (!matchMedia('(hover: hover)').matches) button.textContent = 'Play interactive cover';

  let playing = false;
  let point;
  async function start() {
    if (playing || cover.closest('[inert]') || getComputedStyle(cover).display === 'none') return;
    playing = true;
    try {
      await loadScript(cover.dataset.mwCoverSrc);
      cover.removeEventListener('pointermove', move);
      button.hidden = true;
    } catch (error) {
      playing = false;
      console.error(error);
    }
  }
  function move(event) {
    if (event.pointerType !== 'mouse') return;
    if (!point) {
      point = [event.clientX, event.clientY];
      return;
    }
    if (Math.hypot(event.clientX - point[0], event.clientY - point[1]) >= 5) start();
  }
  cover.addEventListener('pointermove', move, {passive: true});
  button.addEventListener('click', start);
})();
