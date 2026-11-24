// The architecture and the chapter strip use the source video's clock.
(() => {
  const figure = document.querySelector('.cabinet-method');
  const video = figure.querySelector('video');
  const playButton = figure.querySelector('#cm-play');
  const chapters = [...figure.querySelectorAll('.cm-phases button')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const caption = figure.querySelector('#cm-caption');
  const clock = figure.querySelector('#cm-time');
  const writtenFrame = figure.querySelector('.cm-saved-frame');
  const photoStack = figure.querySelector('.cm-bank-photo');
  const recall = figure.querySelector('#cm-history-packet');
  const motion = figure.querySelector('#cm-motion-packet');
  const output = figure.querySelector('#cm-output-packet');
  const historyLine = figure.querySelector('#cm-history-line');
  const recentLine = figure.querySelector('#cm-recent-line');
  const historyLength = historyLine.getTotalLength();
  const recentLength = recentLine.getTotalLength();

  // Times refer to the 15 fps shoe cabinet rollout. The chunk beginning at
  // frame 204 retrieves generated frame 13 as its first memory entry.
  const stages = [
    { key: 'store', start: 0, jump: 0, rate: 0.5,
      text: 'The cabinet view enters memory with its camera pose.' },
    { key: 'reach', start: 20 / 15, jump: 108 / 15, rate: 1.75,
      text: 'Recent frames and actions guide the reach toward the slippers.' },
    { key: 'return', start: 204 / 15, jump: 210 / 15, rate: 1,
      text: 'At 13.6 s, the return pose retrieves the cabinet view from 0.9 s.' }
  ];
  let active = -1;
  let pendingSeek = null;
  let inView = false;
  let wantsPlay = !reducedMotion.matches;
  let tick = 0;

  function movePacket(packet, line, length, fraction, show) {
    packet.setAttribute('opacity', show ? '1' : '0');
    if (!show) return;
    const point = line.getPointAtLength(length * fraction);
    packet.setAttribute('transform', 'translate(' + point.x + ' ' + point.y + ')');
  }

  function draw() {
    const time = pendingSeek ?? video.currentTime;
    const index = time >= stages[2].start ? 2 : time >= stages[1].start ? 1 : 0;
    const stage = stages[index];
    if (index !== active) {
      active = index;
      figure.dataset.phase = stage.key;
      caption.textContent = stage.text;
      chapters.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
      video.playbackRate = stage.rate;
    }
    const end = stages[index + 1]?.start ?? (Number.isFinite(video.duration) ? video.duration : 289 / 15);
    const elapsed = time - stage.start;
    const fraction = Math.max(0, Math.min(1, elapsed / (end - stage.start)));
    chapters[index].style.setProperty('--progress', fraction.toFixed(3));
    const stamp = time.toFixed(1) + ' s';
    if (clock.textContent !== stamp) clock.textContent = stamp;
    const written = Math.min(1, time / (13 / 15));
    writtenFrame.setAttribute('opacity', time >= 13 / 15 ? '1' : '0');
    photoStack.setAttribute('transform', 'translate(' + (1 - written) * 7 + ' ' + (written - 1) * 6 + ')');
    // These moving markers illustrate the two inputs. They share the same
    // pause, seek and visibility behavior as the generated camera view.
    const cycle = (elapsed / 2.4) % 1;
    movePacket(recall, historyLine, historyLength, cycle / 0.74, index === 2 && cycle < 0.74);
    const emitted = index === 2 && cycle >= 0.74;
    output.setAttribute('opacity', emitted ? '1' : '0');
    if (emitted) output.setAttribute('cx', 372 + 23 * (cycle - 0.74) / 0.26);
    movePacket(motion, recentLine, recentLength, (time / 1.6) % 1, index > 0);
  }

  function schedule() {
    if (tick || video.paused || !inView || document.hidden) return;
    tick = requestAnimationFrame(() => {
      tick = 0;
      draw();
      schedule();
    });
  }

  function setControl() {
    const playing = !video.paused;
    playButton.dataset.playing = String(playing);
    const label = playing ? 'Pause method animation' : 'Play method animation';
    playButton.setAttribute('aria-label', label);
    playButton.title = label;
  }

  function loadVideo() {
    if (!video.hasAttribute('src')) video.src = video.dataset.src;
  }

  function synchronize() {
    if (!inView || document.hidden || !wantsPlay) {
      video.pause();
      return;
    }
    loadVideo();
    video.play().catch(error => {
      if (error.name === 'NotAllowedError') wantsPlay = false;
      setControl();
    });
  }

  chapters.forEach((button, index) => button.addEventListener('click', () => {
    const target = stages[index].jump;
    if (video.readyState >= 1) {
      video.currentTime = target;
    } else {
      pendingSeek = target;
      loadVideo();
    }
    draw();
  }));
  playButton.addEventListener('click', () => {
    wantsPlay = video.paused;
    synchronize();
  });
  video.addEventListener('loadedmetadata', () => {
    if (pendingSeek !== null) {
      video.currentTime = pendingSeek;
      pendingSeek = null;
    }
    video.playbackRate = stages[active].rate;
    draw();
  });
  video.addEventListener('play', () => { setControl(); schedule(); });
  video.addEventListener('pause', () => {
    cancelAnimationFrame(tick);
    tick = 0;
    setControl();
    draw();
  });
  for (const event of ['seeked', 'timeupdate']) video.addEventListener(event, draw);
  document.addEventListener('visibilitychange', synchronize);
  reducedMotion.addEventListener('change', () => {
    wantsPlay = !reducedMotion.matches;
    synchronize();
  });
  draw();
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    synchronize();
  }, { threshold: 0.12 }).observe(figure);
})();
