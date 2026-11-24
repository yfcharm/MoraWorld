(() => {
  const root = document.getElementById('mobile-showcase');
  const get = id => root.querySelector('#mg-' + id);
  const { cases, replays, covers, spatial } = JSON.parse(get('data').textContent);
  const groups = {
    manip: { description: 'Two hands hold, lift and change objects within reach.', study: 'Wrist paths and gripper motion', category: 'interaction' },
    nav: { description: 'A room turn, a robot crossing, and two routes from the same first frame.', study: 'A camera turn inside a 3D scan', category: 'mobile' },
    mobile: { description: 'The robot changes position to reach, carry and place objects.', study: 'Camera and hand tracks in a reconstructed room', category: 'combined' }
  };
  const icons = {
    hand: '<path d="M3 20h8M6.5 20v-4l5-6 4.5.5 2-4M18 6l-2.5-2M18 6l3-.5"/><circle cx="6.5" cy="15" r="2"/><circle cx="12" cy="9.5" r="2"/>',
    path: '<circle cx="4" cy="17" r="2"/><path d="M6 17h4a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h9"/><circle cx="20" cy="5" r="2"/>',
    robot: '<rect x="2.5" y="15" width="12" height="4.5" rx="1.5"/><path d="M6 20v1m5-1v1M8 15v-3l5-5 4 2 2-4m0 0-2-2m2 2 3-.3"/><circle cx="13" cy="7" r="1.8"/>',
    play: '<path d="m7 4 12 8-12 8Z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M7 5v14m9-14v14" stroke-width="4"/>',
    expand: '<path d="M13 5h6v6m0-6-6 6M11 19H5v-6m0 6 6-6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    restart: '<path d="M4 10a8 8 0 1 1 1 7M4 4v6h6"/>'
  };
  const icon = key => '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">' + icons[key] + '</svg>';
  root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  const tabs = [...root.querySelectorAll('.mg-tabs button')];
  const clock = get('clock'), seek = get('time'), play = get('play'), detail = get('detail');
  let clips = [], master, groupTime = 0, longest = 0, playing = false, generation = 0;
  let detailCase, mainFilm, referenceFilm, opener;
  const stamp = seconds => Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');

  function timeAt(video, time) {
    if (video.readyState === 0) {
      video.dataset.targetTime = String(time);
      if (video.preload === 'none') { video.preload = 'auto'; video.load(); }
      return;
    }
    const target = Math.min(time, Math.max(0, video.duration - .03));
    if (Number.isFinite(target) && Math.abs(video.currentTime - target) > .025) video.currentTime = target;
  }
  function setClock(time) {
    groupTime = time;
    seek.value = time;
    clock.textContent = stamp(time) + ' / ' + stamp(longest);
  }
  function playState(on) {
    playing = on;
    play.querySelector('.mg-symbol').innerHTML = icon(on ? 'pause' : 'play');
    play.lastElementChild.textContent = on ? 'Pause all' : 'Play all';
  }
  function pauseGroup() {
    generation++;
    clips.forEach(({video}) => video.pause());
    playState(false);
  }
  function playbackError() {
    pauseGroup();
    get('error').hidden = false;
    get('error').textContent = 'Playback paused. Use Play all to retry.';
  }
  function playClip(video, token) {
    video.play().catch(error => {
      if (token === generation && playing && error.name !== 'AbortError') playbackError();
    });
  }
  function seekGroup(time) {
    setClock(time);
    for (const { video, item } of clips) {
      timeAt(video, time);
      if (time >= item.duration - .03) video.pause();
      else if (playing && video.paused) playClip(video, generation);
    }
  }
  function startGroup() {
    if (groupTime >= longest - .09) seekGroup(0);
    get('error').hidden = true;
    const token = ++generation;
    playState(true);
    for (const {video, item} of clips) {
      if (groupTime < item.duration - .03) playClip(video, token);
    }
  }
  play.onclick = () => playing ? pauseGroup() : startGroup();
  seek.oninput = () => seekGroup(Number(seek.value));
  get('restart').onclick = () => seekGroup(0);

  const views = [...root.querySelectorAll('[data-view]')];
  const preferences = {manip:'space', mobile:'space', nav:'space'};
  let activeGroup, labStage;
  function selectView(mode) {
    preferences[activeGroup] = mode;
    for (const control of views) {
      control.hidden = activeGroup === 'nav' && control.dataset.view === 'map';
      control.setAttribute('aria-pressed',control.dataset.view === mode);
    }
    get('channels').hidden = activeGroup === 'nav' || mode !== 'space';
    clips.forEach(({stage}) => stage.setMode(mode));
  }
  views.forEach(control => control.onclick = () => selectView(control.dataset.view));
  const preview = get('feature-loop');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function previewStudy(){
    if (!document.hidden && !reducedMotion.matches) preview.play().catch(()=>{});
  }
  get('feature').addEventListener('pointerenter',previewStudy);
  get('feature').addEventListener('focus',previewStudy);
  get('feature').addEventListener('pointerleave',()=>preview.pause());
  get('feature').addEventListener('blur',()=>preview.pause());
  function tile(item) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mg-tile';
    button.setAttribute('aria-label', 'Inspect ' + item.title);
    button.innerHTML = '<span class="mg-window"><video muted playsinline preload="none" aria-hidden="true"></video><span class="mg-stamp"></span><span class="mg-expand mg-symbol">' + icon('expand') + '</span></span><span class="mg-tile-caption"><strong></strong><small></small></span>';
    const video = button.querySelector('video');
    video.muted = true;
    video.poster = item.poster;
    video.src = item.video;
    button.querySelector('strong').textContent = item.title;
    button.querySelector('small').textContent = item.dataset;
    button.querySelector('.mg-stamp').textContent = item.duration.toFixed(1) + ' s';
    const stage = document.createElement('mw-motion-stage').bind(item,video,{mode:preferences[activeGroup]});
    button.querySelector('.mg-window').append(stage);
    video.addEventListener('loadedmetadata', () => {
      if ('targetTime' in video.dataset) {
        timeAt(video, Number(video.dataset.targetTime));
        delete video.dataset.targetTime;
      }
    });
    video.addEventListener('error', () => { if (playing && video.isConnected) playbackError(); });
    button.onclick = () => openRollout(item, button);
    return { element: button, video, item, stage };
  }
  function setGroup(group) {
    pauseGroup();
    get('error').hidden = true;
    activeGroup=group;
    const settings = groups[group];
    for (const tab of tabs) {
      const selected = tab.dataset.group === group;
      tab.setAttribute('aria-selected', selected);
      tab.tabIndex = selected ? 0 : -1;
    }
    get('panel').setAttribute('aria-labelledby', 'mg-tab-' + group);
    get('description').textContent = settings.description;
    clips = cases.filter(c => c.group === group).map(tile);
    master = clips.reduce((lead, c) => c.item.duration > lead.item.duration ? c : lead);
    longest = master.item.duration;
    get('grid').replaceChildren(...clips.map(c => c.element));
    selectView(preferences[group]);
    seek.max = longest;
    setClock(0);
    master.video.ontimeupdate = () => {
      if (!playing || master.video.seeking || master.video.readyState < 2) return;
      const time = master.video.currentTime;
      setClock(time);
      for (const {video, item} of clips) {
        if (video === master.video || video.seeking || time >= item.duration || video.readyState < 2) continue;
        if (Math.abs(video.currentTime - time) > .22) timeAt(video, time);
      }
    };
    master.video.onended = () => { pauseGroup(); setClock(longest); };
    const studies = replays.filter(item => item.category === settings.category);
    const featured = studies.find(item => item.name === 'Pack the shopping bag') || studies[0];
    get('feature-art').src = covers[group];
    preview.pause(); preview.poster=covers[group]; preview.src=spatial.loops[group];
    get('feature-title').textContent = {mobile: 'Camera & hand tracks', nav: 'The room in 3D', manip: 'Two hands, one bag'}[group];
    get('feature-meta').textContent = featured.short;
    get('feature').onclick = () => openStudy(featured, get('feature'));
    const extras = studies.filter(item => item !== featured);
    get('more-notes').hidden = !extras.length;
    get('notes-list').replaceChildren(...extras.map(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mg-study';
      const thumb = new Image();
      thumb.alt = '';
      thumb.loading = 'lazy';
      thumb.src = item.poster;
      button.append(thumb, document.createTextNode(item.name));
      button.onclick = () => openStudy(item, button);
      return button;
    }));
  }
  tabs.forEach((tab, index) => {
    tab.onclick = () => { if (tab.getAttribute('aria-selected') !== 'true') setGroup(tab.dataset.group); };
    tab.onkeydown = event => {
      const next = {ArrowRight: (index + 1) % 3, ArrowLeft: (index + 2) % 3, Home: 0, End: 2}[event.key];
      if (next === undefined) return;
      event.preventDefault();
      tabs[next].focus();
      setGroup(tabs[next].dataset.group);
    };
  });

  function film(url, label, controls, poster) {
    const figure = document.createElement('figure');
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.controls = controls;
    video.preload = 'auto';
    video.setAttribute('aria-label', label);
    if (poster) video.poster = poster;
    video.src = url;
    const caption = document.createElement('figcaption');
    caption.textContent = label;
    figure.append(video, caption);
    return { figure, video };
  }
  function openDetail(button, title, label, note) {
    pauseGroup();
    opener = button;
    get('detail-title').textContent = title;
    get('detail-label').textContent = label;
    get('detail-note').textContent = note;
    get('dialog-media').classList.remove('mg-side-by-side');
    get('compare').setAttribute('aria-pressed','false');
    detail.showModal();
    get('close').focus();
  }
  function openRollout(item, button) {
    detailCase = item;
    openDetail(button, item.title, item.dataset + ' · ' + item.model, item.note);
    const generated = film(item.video, 'Generated rollout', true, item.poster);
    mainFilm = generated.video;
    get('dialog-media').replaceChildren(generated.figure);
    get('compare').parentElement.hidden = false;
    const thumbnail = clips.find(c=>c.item.id===item.id);
    const initial = thumbnail?.stage.hasVideoFrame ? thumbnail.video.currentTime : item.posterTime;
    timeAt(mainFilm, Math.min(initial, item.duration));
    labStage = document.createElement('mw-motion-stage').bind(item,mainFilm,{detail:true,mode:preferences[activeGroup]==='map'?'map':'space'});
    get('lab-view').replaceChildren(labStage);
    get('lab').hidden=false;
    get('lab-mode').hidden=item.group==='nav';
    updateLab();
    mainFilm.addEventListener('loadedmetadata', () => {
      if (mainFilm === generated.video && 'targetTime' in mainFilm.dataset) timeAt(mainFilm, Number(mainFilm.dataset.targetTime));
    }, {once:true});
    for (const event of ['play','pause','seeking','seeked','ratechange','timeupdate']) mainFilm.addEventListener(event, syncReference);
  }
  function updateLab(){
    const mapped=labStage.mode==='map';
    get('lab-mode').textContent = mapped ? '3D tracks' : 'Action map';
    get('lab-instruction').textContent = mapped ? 'Recorded action input' : 'Drag to orbit';
  }
  get('lab-mode').onclick = () => { labStage.setMode(labStage.mode==='space'?'map':'space');updateLab(); };
  function syncReference() {
    if (!referenceFilm || !mainFilm || referenceFilm.readyState === 0) return;
    if (Math.abs(referenceFilm.currentTime - mainFilm.currentTime) > .12) timeAt(referenceFilm, mainFilm.currentTime);
    referenceFilm.playbackRate = mainFilm.playbackRate;
    if (mainFilm.paused || mainFilm.ended) referenceFilm.pause();
    else if (referenceFilm.paused && !referenceFilm.ended) referenceFilm.play().catch(() => {});
  }
  get('compare').onclick = () => {
    const area = get('dialog-media');
    if (referenceFilm) {
      referenceFilm.pause();
      referenceFilm.parentElement.remove();
      referenceFilm = null;
    } else {
      const source = film(detailCase.reference, 'Source reference', false);
      referenceFilm = source.video;
      area.append(source.figure);
      referenceFilm.onloadeddata = syncReference;
      syncReference();
    }
    area.classList.toggle('mg-side-by-side', Boolean(referenceFilm));
    get('compare').setAttribute('aria-pressed', Boolean(referenceFilm));
  };
  function openStudy(item, button) {
    openDetail(button, item.name, 'Source replay · ' + item.short, item.description + ' ' + item.watch);
    get('lab').hidden=true;
    preview.pause();
    get('compare').parentElement.hidden = true;
    const study = film(item.video, item.meta, true, item.poster);
    mainFilm = study.video;
    get('dialog-media').replaceChildren(study.figure);
  }
  get('close').onclick = () => detail.close();
  detail.onclick = e => {
    if (e.target !== detail) return;
    const rect = detail.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) detail.close();
  };
  detail.addEventListener('close', () => {
    mainFilm?.pause();
    referenceFilm?.pause();
    get('lab-view').replaceChildren(); get('lab').hidden=true;
    mainFilm = referenceFilm = detailCase = labStage = null;
    get('dialog-media').replaceChildren();
    opener?.focus({preventScroll:true});
  });
  new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting && playing) pauseGroup();
  }).observe(root);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { pauseGroup(); mainFilm?.pause(); }
  });
  setGroup('mobile');
})();
