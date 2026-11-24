class RolloutFeature extends HTMLElement {
  #cases = [];
  #caseKey;
  #selection = new Map();

  resetSelection(group, page = 'all') {
    const picker = this.querySelector('.mg-featured-picker');
    if (picker) picker.scrollLeft = 0;
    if (group) return this.#selection.delete(`${group}/${page}`);
    this.#selection.clear();
  }

  setCases(cases, onSelect, routeRows = []) {
    if (!this.firstElementChild) {
      this.innerHTML = `<article class="mg-featured-rollout" id="mg-featured-rollout" aria-labelledby="mg-featured-title">
        <div class="mg-featured-video"></div>
        <div class="mg-featured-copy">
          <h4 id="mg-featured-title" aria-live="polite"></h4>
          <div class="mg-featured-description">
            <p class="mg-featured-label">Task description</p>
            <p class="mg-featured-text"></p>
          </div>
        </div>
      </article>
      <div class="mg-featured-picker" role="group" aria-label="Choose an example"></div>`;
    }

    const pairs = new Map();
    for (const row of routeRows) {
      if (!row.anchor || row.ids.length !== 2) continue;
      const [forward, reverse] = row.ids.map(id => cases.find(item => item.id === id));
      if (!forward || !reverse || forward.duration !== reverse.duration) continue;
      pairs.set(forward.id, [{...forward, title: row.title, poster: row.anchor,
        note: row.description ?? forward.note, members: [forward, reverse]}]);
      pairs.set(reverse.id, []);
    }
    const options = cases.flatMap(item => pairs.get(item.id) ?? [item]);
    const first = options[0];
    const key = `${first.group}/${first.page ?? 'all'}`;
    const selectedCase = options.find(item => item.id === this.#selection.get(key)) ?? first;
    if (this.#caseKey !== key || options.length !== this.#cases.length || options.some((item, index) => item.id !== this.#cases[index]?.id)) {
      this.#caseKey = key;
      this.#cases = options;
      const picker = this.querySelector('.mg-featured-picker');
      picker.replaceChildren(...options.map(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-controls', 'mg-featured-rollout');
        const image = document.createElement('img');
        image.src = item.poster;
        image.alt = '';
        image.loading = 'lazy';
        const label = document.createElement('span');
        label.textContent = item.previewLabel ?? item.title;
        button.append(image, label);
        button.onclick = event => {
          if ((this.#selection.get(key) ?? first.id) === item.id) return;
          if (item.id === first.id) this.#selection.delete(key);
          else this.#selection.set(key, item.id);
          onSelect();
          if (event.detail > 0) {
            const video = this.querySelector('.mg-featured-video');
            const frame = video.getBoundingClientRect();
            if (frame.bottom < frame.height / 2) video.scrollIntoView({block: 'start'});
          }
        };
        return button;
      }));
      const selected = picker.children[options.indexOf(selectedCase)];
      picker.scrollLeft = selected.offsetLeft - picker.firstElementChild.offsetLeft;
    }
    return selectedCase;
  }

  show(item, clips) {
    for (const {element, stage} of clips) {
      element.querySelector('.mg-tile-caption').hidden = true;
      element.title = 'Inspect and compare with the source';
      if (stage.aperture) {
        stage.aperture.querySelector('.mg-aperture-label').textContent = 'Gripper opening';
        stage.append(stage.aperture);
      }
    }
    const duration = document.createElement('time');
    duration.className = 'mg-featured-duration';
    duration.dateTime = `PT${item.duration}S`;
    duration.title = 'Clip duration';
    duration.textContent = `${Math.round(item.duration * 10) / 10} s`;
    const content = item.members ? this.#makeRouteWipe(clips) : clips[0].element;
    this.querySelector('.mg-featured-video').replaceChildren(content, duration);
    this.querySelector('#mg-featured-title').textContent = item.title;
    this.querySelector('.mg-featured-text').textContent = item.taskDescription ?? item.note;
    this.querySelectorAll('.mg-featured-picker button').forEach((button, index) => {
      button.setAttribute('aria-pressed', this.#cases[index].id === item.id);
    });
  }

  #makeRouteWipe(clips) {
    const frame = document.createElement('div');
    frame.className = 'mg-route-wipe';
    frame.innerHTML = `<input class="mg-route-wipe-slider" type="range" min="0" max="100" value="50" aria-label="Compare forward and reverse routes">
      <span class="mg-route-wipe-divider" aria-hidden="true"></span>
      <span class="mg-route-wipe-handle" aria-hidden="true">‹ ›</span>`;
    const slider = frame.querySelector('input');
    const update = () => {
      frame.style.setProperty('--route-split', slider.value + '%');
      slider.setAttribute('aria-valuetext', `${slider.value}% forward, ${100 - slider.value}% reverse`);
    };
    slider.addEventListener('input', update);
    update();

    clips.forEach(({element, stage}, index) => {
      const side = index === 0 ? 'left' : 'right';
      element.dataset.wipeSide = stage.dataset.wipeSide = side;
      const label = document.createElement('span');
      label.className = 'mg-route-wipe-direction';
      label.textContent = index === 0 ? 'Forward' : 'Reverse';
      element.querySelector('.mg-window').append(label);
      frame.append(element, stage);
    });

    const [forward, reverse] = clips.map(clip => clip.video);
    const sync = () => {
      if (!forward.isConnected || forward.readyState < 2 || reverse.readyState < 2 || reverse.seeking) return;
      if (Math.abs(reverse.currentTime - forward.currentTime) > .1) {
        reverse.currentTime = Math.min(forward.currentTime, Math.max(0, reverse.duration - .03));
      }
    };
    for (const event of ['playing', 'timeupdate', 'seeked']) forward.addEventListener(event, sync);
    reverse.addEventListener('playing', sync);
    return frame;
  }
}

customElements.define('mw-rollout-feature', RolloutFeature);
