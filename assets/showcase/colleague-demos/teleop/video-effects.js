function bindVideoEffects(frame, videos) {
  const reactions = document.createElement('div');
  reactions.className = 'video-reactions';
  reactions.setAttribute('role', 'group');
  reactions.setAttribute('aria-label', 'Video reaction animations');
  for (const [name, outline, fill] of [['Heart', '♡', '♥'], ['Star', '☆', '★']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'video-reaction';
    button.setAttribute('aria-label', name + ' animation');
    button.innerHTML = '<span aria-hidden="true">' + outline + '</span>' +
      '<span class="reaction-pop" aria-hidden="true">' + fill + '</span>';
    const pop = button.querySelector('.reaction-pop');
    const sparks = [[-34, -15], [-23, -35], [1, -37], [20, -22], [19, 10], [-6, 23], [-32, 13]]
      .map(([x, y]) => {
        const dot = document.createElement('span');
        dot.className = 'reaction-spark';
        dot.setAttribute('aria-hidden', 'true');
        button.append(dot);
        return { dot, x, y };
      });
    button.addEventListener('click', () => {
      button.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) {
        pop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250 });
        return;
      }
      pop.animate([
        { opacity: 1, transform: 'scale(.55)' },
        { opacity: 1, transform: 'translate(-14px, -10px) scale(1.75)', offset: .44 },
        { opacity: .94, transform: 'translate(-14px, -10px) scale(1.38)', offset: .61 },
        { opacity: 0, transform: 'translate(-15px, -12px) scale(.72)' },
      ], { duration: 410, easing: 'ease-out' });
      sparks.forEach(({ dot, x, y }, index) => {
        dot.animate([
          { opacity: 1, transform: 'scale(.4)' },
          { opacity: 1, transform: 'translate(' + x * .6 + 'px, ' + y * .6 + 'px) scale(1)', offset: .32 },
          { opacity: 0, transform: 'translate(' + x + 'px, ' + y + 'px) scale(.25)' },
        ], { delay: 145 + index % 3 * 18, duration: 450, easing: 'ease-out' });
      });
    });
    reactions.append(button);
  }
  const badge = document.createElement('span');
  badge.className = 'hold-speed';
  badge.hidden = true;
  frame.append(reactions, badge);

  let normalRate = 1;
  let press;
  let boosting = false;
  let suppressClick = false;

  function applyRate() {
    const rate = boosting ? Math.min(16, normalRate * 3) : normalRate;
    videos.forEach(video => { if (video.playbackRate !== rate) video.playbackRate = rate; });
    if (boosting) badge.textContent = rate + '×';
    badge.hidden = !boosting;
  }

  function endPress() {
    clearTimeout(press?.timer);
    press = undefined;
    if (!boosting) return;
    boosting = false;
    applyRate();
  }

  frame.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick = false;
    if (press || videos[0].paused || event.target.closest('.video-reactions')) return;
    const bounds = frame.getBoundingClientRect();
    if (Math.abs(event.clientX - (bounds.left + bounds.width / 2)) > bounds.width * .3 ||
        Math.abs(event.clientY - (bounds.top + bounds.height / 2)) > bounds.height * .37) return;
    const { pointerId, clientX, clientY, target } = event;
    press = { pointerId, clientX, clientY, timer: setTimeout(() => {
      if (videos[0].paused) { endPress(); return; }
      boosting = true;
      suppressClick = true;
      target.setPointerCapture(pointerId);
      applyRate();
    }, 330) };
  });
  frame.addEventListener('pointermove', event => {
    if (!press || event.pointerId !== press.pointerId || boosting) return;
    if (Math.hypot(event.clientX - press.clientX, event.clientY - press.clientY) > 12) endPress();
  });
  frame.addEventListener('pointerup', event => {
    if (event.pointerId !== press?.pointerId) return;
    if (boosting) event.preventDefault();
    endPress();
  });
  for (const type of ['pointercancel', 'lostpointercapture', 'pointerleave']) {
    frame.addEventListener(type, event => {
      if (event.pointerId === press?.pointerId) endPress();
    });
  }
  frame.addEventListener('click', event => {
    if (!suppressClick || !event.detail) return;
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);
  frame.addEventListener('contextmenu', event => {
    if (press || suppressClick) event.preventDefault();
  });
  window.addEventListener('blur', endPress);
  videos.forEach(video => video.addEventListener('loadedmetadata', applyRate));

  return rate => {
    normalRate = rate;
    applyRate();
  };
}
