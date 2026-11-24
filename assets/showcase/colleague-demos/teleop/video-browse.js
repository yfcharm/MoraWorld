function bindVideoBrowse(frame, controls, move, suppressTap = () => {}) {
  const buttons = Array.from(controls.querySelectorAll('.browse-button'));
  buttons.forEach(button => {
    button.addEventListener('click', () => move(Number(button.dataset.direction)));
  });
  let wheelDelta = 0;
  let wheelLocked = false;
  let lastWheelAt = -Infinity;
  let lastWheelDelta = 0;
  let wheelPeak = 0;
  let touchStart;

  frame.addEventListener('wheel', event => {
    const { deltaX, deltaY, deltaMode } = event;
    const direction = Math.sign(deltaY);
    if (!event.cancelable || !direction || event.ctrlKey || Math.abs(deltaX) > Math.abs(deltaY)) return;
    event.preventDefault();
    const unit = deltaMode === 1 ? 16 : deltaMode === 2 ? frame.clientHeight : 1;
    const delta = deltaY * unit;
    const strength = Math.abs(delta);
    const lastStrength = Math.abs(lastWheelDelta);
    // A fresh flick can start while residual wheel events are still arriving.
    const freshFlick = wheelLocked && lastStrength <= wheelPeak / 2 &&
      strength >= 12 && strength >= 2 * lastStrength && strength - lastStrength >= 8;
    if (event.timeStamp - lastWheelAt >= 120 || delta * lastWheelDelta < 0 || freshFlick) {
      wheelDelta = 0;
      wheelLocked = false;
      wheelPeak = 0;
    }
    lastWheelAt = event.timeStamp;
    lastWheelDelta = delta;
    wheelPeak = Math.max(wheelPeak, strength);
    if (wheelLocked) return;
    wheelDelta += delta;
    if (Math.abs(wheelDelta) < 26) return;
    wheelLocked = true;
    move(direction);
  }, { passive: false });

  frame.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' && event.isPrimary) {
      touchStart = { x: event.clientX, y: event.clientY };
    }
  });
  frame.addEventListener('pointercancel', () => { touchStart = undefined; });
  frame.addEventListener('pointerup', event => {
    if (!touchStart || event.pointerType !== 'touch' || !event.isPrimary) return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    touchStart = undefined;
    if (event.defaultPrevented || Math.abs(dy) < 48 || Math.abs(dy) < Math.abs(dx) * 1.35) return;
    suppressTap();
    move(dy < 0 ? 1 : -1);
  });
  frame.addEventListener('keydown', event => {
    const direction = { ArrowUp: -1, PageUp: -1, ArrowDown: 1, PageDown: 1 }[event.key];
    if (!direction) return;
    event.preventDefault();
    move(direction);
  });
}

function animateVideoBrowse(frame, direction) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const video = frame.querySelector('video');
  video.getAnimations().forEach(animation => animation.cancel());
  video.animate([
    { transform: 'translateY(' + (direction * 15) + 'px)', opacity: .58 },
    { transform: 'translateY(0)', opacity: 1 },
  ], { duration: 210, easing: 'ease-out' });
}
