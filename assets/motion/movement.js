(() => {
  const root = document.getElementById('mobile-showcase');
  const get = id => root.querySelector('#mg-' + id);
  const { cases, replays, covers, spatial, navigationRows } = JSON.parse(get('data').textContent);
  const groups = {
    manip: { description: 'Follow the grippers as they load a microwave, cover a steamer and handle objects on the table.', study: 'Wrist paths and gripper motion', category: 'interaction' },
    nav: { description: 'Follow turns through a metro station and a museum. The two window-corridor clips share a starting frame.', study: 'A camera turn inside a 3D scan', category: 'mobile' },
    mobile: { description: 'Follow a cushion along the sofa, a backpack to the rack and a loaf of bread into a shopping cart.', study: 'Camera and hand tracks in a reconstructed room', category: 'combined' }
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
  const panel = get('panel'), grid = get('grid'), transport = seek.closest('.mg-transport');
  const mobilePages = get('mobile-pages');
  const mobilePlayback = get('mobile-playback');
  const playbackTools = mobilePlayback && play.closest('.mg-playback-tools');
  const playbackCaption = playbackTools?.parentElement;
  const navCredit = get('nav-credit'), rolloutCaption = get('rollout-caption');
  const routeRows = navigationRows ?? [{
    title: 'Window corridor',
    anchor: root.dataset.corridorStart,
    ids: ['sekai2-035-forward', 'sekai2-035-reverse']
  }];
  const routePairs = new Map();
  for (const {ids} of routeRows) {
    if (ids.length !== 2) continue;
    routePairs.set(ids[0], {routeDirection: 'forward', routePeer: ids[1]});
    routePairs.set(ids[1], {routeDirection: 'reverse', routePeer: ids[0]});
  }
  const pageButtons = [...(mobilePages?.querySelectorAll('[data-mobile-page]') ?? [])];
  let mobilePage = pageButtons[0]?.dataset.mobilePage;
  const enhancedPreviews = root.hasAttribute('data-loop-previews');
  const translucentTracks = root.hasAttribute('data-translucent-tracks');
  const rotateRoutePairs = root.hasAttribute('data-route-carousel');
  const rateControl = get('rate'), rates = {manip:1, nav:2, mobile:1};
  for (const button of pageButtons) {
    rates['mobile/' + button.dataset.mobilePage] = Number(button.dataset.defaultRate);
  }
  let clips = [], master, groupTime = 0, longest = 0, playing = false, generation = 0;
  let routeCarousel;
  let detailCase, mainFilm, referenceFilm, opener;
  let activeGroup, labStage, gridVisible = false, autoplayRequested = false;
  const loopPreviews = () => enhancedPreviews;
  const rateKey = () => activeGroup === 'mobile' && mobilePage ? 'mobile/' + mobilePage : activeGroup;
  const stamp = seconds => Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
  function applyRate(video, rate) {
    video.defaultPlaybackRate = rate;
    video.playbackRate = rate;
  }
  if (rateControl) rateControl.onchange = () => {
    if (!loopPreviews()) return;
    const rate = Number(rateControl.value);
    rates[rateKey()] = rate;
    clips.forEach(({video}) => applyRate(video,rate));
  };

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
    if (!loopPreviews() || clips.every(({video}) => video.paused)) pauseGroup();
    get('error').hidden = false;
    get('error').textContent = loopPreviews() ? 'Use Play all to retry any unavailable previews.' : 'Playback paused. Use Play all to retry.';
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
    if (!loopPreviews() && groupTime >= longest - .09) seekGroup(0);
    get('error').hidden = true;
    const token = ++generation;
    playState(true);
    for (const {video, item, carouselMember} of clips) {
      if (carouselMember) continue;
      if (loopPreviews() || groupTime < item.duration - .03) playClip(video, token);
    }
    routeCarousel?.resume();
  }
  function resumePreviews() {
    if (loopPreviews() && autoplayRequested && gridVisible && !document.hidden && !detail.open && !playing) startGroup();
  }
  play.onclick = () => {
    if (loopPreviews()) autoplayRequested = !playing;
    if (playing) pauseGroup();
    else startGroup();
  };
  seek.oninput = () => seekGroup(Number(seek.value));
  get('restart').onclick = () => seekGroup(0);

  const views = [...root.querySelectorAll('[data-view]')];
  const labModeButton = get('lab-mode');
  const preferences = {manip:'space', mobile:'space', nav:'space'};
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
  const feature = get('feature');
  const preview = get('feature-loop');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function previewStudy(){
    if (!document.hidden && !reducedMotion.matches) preview.play().catch(()=>{});
  }
  if (feature) {
    feature.addEventListener('pointerenter',previewStudy);
    feature.addEventListener('focus',previewStudy);
    feature.addEventListener('pointerleave',()=>preview.pause());
    feature.addEventListener('blur',()=>preview.pause());
  }
  function tile(item) {
    const pair = routePairs.get(item.id);
    if (pair) item = {...item, ...pair};
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mg-tile';
    button.setAttribute('aria-label', 'Inspect ' + item.title);
    const badge = loopPreviews() ? '' : '<span class="mg-stamp"></span>';
    const labels = '<strong></strong><small></small>';
    const caption = loopPreviews() ? '<span class="mg-tile-title">' + labels + '</span>' : labels;
    button.innerHTML = '<span class="mg-window"><video muted playsinline preload="none" aria-hidden="true"></video>' + badge + '<span class="mg-expand mg-symbol">' + icon('expand') + '</span></span><span class="mg-tile-caption">' + caption + '</span>';
    const video = button.querySelector('video');
    video.muted = true;
    video.loop = loopPreviews();
    if (video.loop) applyRate(video,rates[rateKey()]);
    video.poster = item.poster;
    video.src = item.video;
    button.querySelector('strong').textContent = item.previewLabel ?? item.title;
    const dataset = button.querySelector('small');
    dataset.textContent = item.dataset;
    dataset.hidden = Boolean(item.previewLabel || (navigationRows && item.group === 'nav'));
    if (badge) button.querySelector('.mg-stamp').textContent = item.duration.toFixed(1) + ' s';
    const gripperCaption = loopPreviews() && item.group === 'manip' ? button.querySelector('.mg-tile-caption') : null;
    const stage = document.createElement('mw-motion-stage').bind(item,video,{
      mode:preferences[activeGroup], apertureTarget:gripperCaption,
      routePreview:video.loop && item.group==='nav', translucentBackdrop:translucentTracks
    });
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
  function renderRouteRow({title, anchor, description}, members, index) {
    const section = document.createElement('section');
    const paired = members.length === 2;
    section.className = 'mg-pair';
    if (!paired) section.classList.add('mg-nav-single');
    const headingId = 'mg-route-title-' + index;
    section.setAttribute('aria-labelledby', headingId);
    section.innerHTML = '<header class="mg-pair-head"><figure class="mg-pair-start"><img></figure><div class="mg-pair-copy"><h4></h4><p></p></div></header><div class="mg-pair-grid"></div>';
    const heading = section.querySelector('h4'), image = section.querySelector('img');
    heading.id = headingId;
    heading.textContent = title;
    image.alt = 'Recorded first frame of ' + title;
    image.src = anchor;
    section.querySelector('p').textContent = description ?? 'Both camera paths begin from the recorded frame shown here.';
    if (navigationRows) {
      const frameLabel = document.createElement('figcaption');
      frameLabel.className = 'mg-frame-label';
      frameLabel.textContent = paired ? 'Shared input frame' : 'Input frame';
      image.parentElement.append(frameLabel);
    }
    if (paired) {
      const restart = document.createElement('button');
      restart.type = 'button';
      restart.className = 'mg-pair-reset';
      restart.innerHTML = '<span class="mg-symbol">' + icon('restart') + '</span>' + (navigationRows ? 'Replay both' : 'Restart pair');
      restart.setAttribute('aria-label', 'Restart ' + title + ' routes');
      restart.onclick = () => members.forEach(({video}) => timeAt(video,0));
      section.querySelector('header').append(restart);
      for (const {element,item} of members) {
        element.dataset.direction = item.routeDirection;
        element.querySelector('.mg-tile-title strong').textContent = item.routeDirection === 'forward' ? 'Forward' : 'Reverse';
      }
    }
    section.querySelector('.mg-pair-grid').append(...members.map(clip => clip.element));
    return section;
  }
  function buildRouteCarousel(slides) {
    const carousel = document.createElement('div');
    carousel.className = 'mg-route-carousel';
    const picker = document.createElement('div');
    picker.className = 'mg-route-picker';
    picker.setAttribute('role','group');
    picker.setAttribute('aria-label','Shared-start scenes');
    carousel.append(picker);
    let current = 0, rounds = 0, visible = false;
    const currentMembers = () => slides[current].members;

    function resume() {
      if (!carousel.isConnected) return;
      for (const {video} of currentMembers()) {
        if (visible && playing && !video.ended) {
          if (video.paused) playClip(video,generation);
        } else {
          video.pause();
        }
      }
    }
    function rewind() {
      for (const {video} of currentMembers()) {
        video.pause();
        if (video.readyState > 0 || video.currentTime > 0) timeAt(video,0);
      }
      resume();
    }
    function select(index) {
      if (index === current) return;
      const leaving = slides[current].section;
      const restoreFocus = leaving.contains(document.activeElement);
      currentMembers().forEach(({video}) => video.pause());
      current = index;
      rounds = 0;
      slides.forEach(({section}, n) => {
        section.hidden = n !== current;
        buttons[n].setAttribute('aria-pressed',n === current);
      });
      if (restoreFocus) buttons[current].focus({preventScroll:true});
      rewind();
    }

    const buttons = slides.map(({row, section, members}, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = section.id + '-choice';
      const frame = document.createElement('span');
      frame.className = 'mg-pair-start';
      const image = section.querySelector('.mg-pair-start img');
      image.alt = '';
      const frameLabel = document.createElement('span');
      frameLabel.className = 'mg-frame-label';
      frameLabel.textContent = 'Shared frame';
      frame.append(image, frameLabel);
      const name = document.createElement('span');
      name.className = 'mg-route-name';
      name.textContent = row.title;
      button.append(frame, name);
      button.setAttribute('aria-label', row.title);
      button.setAttribute('aria-pressed',index === current);
      button.setAttribute('aria-controls',section.id);
      button.onclick = () => select(index);
      picker.append(button);
      section.classList.add('mg-route-slide');
      section.hidden = index !== current;
      section.setAttribute('aria-labelledby', button.id);
      const restart = section.querySelector('.mg-pair-reset');
      section.querySelector('.mg-pair-head').replaceChildren(section.querySelector('.mg-pair-copy p'), restart);
      restart.onclick = () => {
        rounds = 0;
        rewind();
      };
      for (const clip of members) {
        clip.carouselMember = true;
        clip.video.loop = false;
        clip.video.onended = () => {
          if (!carousel.isConnected || index !== current || !members.every(({video}) => video.ended)) return;
          if (++rounds === 2) select((current + 1) % slides.length);
          else rewind();
        };
      }
      carousel.append(section);
      return button;
    });
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.intersectionRatio >= .15;
      resume();
    }, {threshold:.15});
    observer.observe(carousel);
    return {element:carousel, resume, disconnect:() => observer.disconnect()};
  }
  function renderClips() {
    if (!loopPreviews() || activeGroup !== 'nav') {
      grid.replaceChildren(...clips.map(clip => clip.element));
      return;
    }
    const cards = new Map(clips.map(clip => [clip.item.id, clip]));
    const sections = [], comparisons = [];
    for (const [index, row] of routeRows.entries()) {
      const members = row.ids.map(id => cards.get(id));
      if (!row.anchor || !members.every(Boolean)) continue;
      const section = renderRouteRow(row, members, index);
      section.id = 'mg-route-panel-' + index;
      if (rotateRoutePairs && members.length === 2) comparisons.push({row, section, members});
      else sections.push(section);
      row.ids.forEach(id => cards.delete(id));
    }
    if (comparisons.length > 1) {
      routeCarousel = buildRouteCarousel(comparisons);
      sections.unshift(routeCarousel.element);
    } else if (comparisons.length) {
      sections.unshift(comparisons[0].section);
    }
    grid.replaceChildren(...sections, ...Array.from(cards.values(),clip => clip.element));
  }
  function setGroup(group) {
    const keepPlayback = activeGroup === group && autoplayRequested;
    const enteringGroup = activeGroup !== group;
    pauseGroup();
    routeCarousel?.disconnect();
    routeCarousel = null;
    get('error').hidden = true;
    activeGroup=group;
    autoplayRequested = loopPreviews() && (enteringGroup ? !reducedMotion.matches : keepPlayback);
    panel.classList.toggle('mg-preview-panel',loopPreviews());
    panel.dataset.group = group;
    if (mobilePlayback) {
      const showMobileToolbar = group === 'mobile';
      const playbackHost = showMobileToolbar ? mobilePlayback : playbackCaption;
      if (playbackTools.parentElement !== playbackHost) playbackHost.append(playbackTools);
      mobilePlayback.hidden = !showMobileToolbar;
    }
    if (navCredit) {
      navCredit.hidden = group !== 'nav';
      rolloutCaption.hidden = group === 'nav';
    }
    transport.hidden = loopPreviews();
    if (rateControl) {
      rateControl.closest('label').hidden = !loopPreviews();
      if (loopPreviews()) rateControl.value = String(rates[rateKey()]);
    }
    const settings = groups[group];
    for (const tab of tabs) {
      const selected = tab.dataset.group === group;
      tab.setAttribute('aria-selected', selected);
      tab.tabIndex = selected ? 0 : -1;
    }
    panel.setAttribute('aria-labelledby', 'mg-tab-' + group);
    if (mobilePages) {
      mobilePages.hidden = group !== 'mobile';
      pageButtons.forEach(button => button.setAttribute('aria-pressed',button.dataset.mobilePage === mobilePage));
    }
    const selectedPage = group === 'mobile'
      ? pageButtons.find(button => button.dataset.mobilePage === mobilePage)
      : undefined;
    const description = get('description');
    if (description) {
      description.hidden = loopPreviews() && group === 'nav';
      description.textContent = loopPreviews() && group === 'mobile'
        ? 'The robot repositions as it arranges cushions, carries a backpack, draws a curtain and pushes a chair.'
        : settings.description;
    }
    clips = cases.filter(c => c.group === group && (!selectedPage || c.page === mobilePage)).map(tile);
    master = clips.reduce((lead, c) => c.item.duration > lead.item.duration ? c : lead);
    longest = master.item.duration;
    renderClips();
    selectView(preferences[group]);
    seek.max = longest;
    setClock(0);
    if (!loopPreviews()) {
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
    }
    const studies = replays.filter(item => item.category === settings.category);
    const featured = studies.find(item => item.name === 'Pack the shopping bag') || studies[0];
    if (feature) {
      get('feature-art').src = covers[group];
      preview.pause(); preview.poster=covers[group]; preview.src=spatial.loops[group];
      get('feature-title').textContent = {mobile: 'Camera & hand tracks', nav: 'The room in 3D', manip: 'Two hands, one bag'}[group];
      get('feature-meta').textContent = loopPreviews() ? featured.short.split(' · ')[0] : featured.short;
      feature.onclick = () => openStudy(featured, feature);
    }
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
    resumePreviews();
  }
  pageButtons.forEach(button => {
    button.onclick = () => {
      if (button.dataset.mobilePage === mobilePage) return;
      mobilePage = button.dataset.mobilePage;
      setGroup('mobile');
    };
  });
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
    const showDataset = !mobilePlayback || item.group !== 'mobile';
    const label = [showDataset ? item.dataset : '', item.model, item.observedHistory ? 'Recorded history' : ''];
    openDetail(button, item.title, label.filter(Boolean).join(' · '), item.note);
    const generated = film(item.video, 'Generated rollout', true, item.poster);
    mainFilm = generated.video;
    get('dialog-media').replaceChildren(generated.figure);
    get('compare').parentElement.hidden = false;
    const thumbnail = clips.find(c=>c.item.id===item.id);
    if (loopPreviews()) applyRate(mainFilm,rates[rateKey()]);
    const initial = thumbnail?.video.currentTime || 0;
    timeAt(mainFilm, Math.min(initial, item.duration));
    labStage = document.createElement('mw-motion-stage').bind(item,mainFilm,{
      detail:true, mode:preferences[activeGroup]==='map'?'map':'space',
      routePreview:loopPreviews() && item.group==='nav',
      smoothWristTrails:loopPreviews() && item.group==='manip'
    });
    get('lab-view').replaceChildren(labStage);
    get('lab').hidden=false;
    if (labModeButton) {
      labModeButton.hidden = item.group === 'nav';
      updateLab();
    }
    mainFilm.addEventListener('loadedmetadata', () => {
      if (mainFilm === generated.video && 'targetTime' in mainFilm.dataset) timeAt(mainFilm, Number(mainFilm.dataset.targetTime));
    }, {once:true});
    for (const event of ['play','pause','seeking','seeked','ratechange','timeupdate']) mainFilm.addEventListener(event, syncReference);
  }
  function updateLab(){
    const mapped=labStage.mode==='map';
    labModeButton.textContent = mapped ? '3D tracks' : 'Action map';
    get('lab-instruction').textContent = mapped ? 'Recorded action input' : 'Drag to orbit';
  }
  if (labModeButton) {
    labModeButton.onclick = () => {
      labStage.setMode(labStage.mode === 'space' ? 'map' : 'space');
      updateLab();
    };
  }
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
    preview?.pause();
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
    resumePreviews();
  });
  new IntersectionObserver(entries => {
    if (!loopPreviews() && !entries[0].isIntersecting && playing) pauseGroup();
  }).observe(root);
  if (enhancedPreviews) new IntersectionObserver(entries => {
    gridVisible = entries[0].isIntersecting;
    if (!loopPreviews()) return;
    if (!gridVisible && playing) pauseGroup();
    else resumePreviews();
  }).observe(grid);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { pauseGroup(); mainFilm?.pause(); }
    else resumePreviews();
  });
  setGroup('mobile');
})();
