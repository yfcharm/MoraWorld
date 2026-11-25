(() => {
  const demo = document.querySelector("#control-demo");
  if (!demo) return;

  const assets = new URL(".", document.currentScript.src);
  const videos = [...demo.querySelectorAll("video[data-role]")];
  const master = demo.querySelector('[data-role="generated"]');
  const modes = [...demo.querySelectorAll("[data-mode]")];
  const durations = [...demo.querySelectorAll("[data-duration]")];
  const library = demo.querySelector(".mc-examples");
  const title = demo.querySelector("#mc-case-title");
  const cameraNote = demo.querySelector("#mc-camera-note");
  const playButton = demo.querySelector(".mc-play");
  const playText = demo.querySelector(".mc-play-text");
  const timeline = demo.querySelector(".mc-timeline");
  const timeLabel = demo.querySelector(".mc-time");
  const status = demo.querySelector(".mc-status");
  const errorMessage = "A clip could not load. Choose another example or reload the page.";

  let examples = [];
  let currentExample;
  let mode = "scene";
  let position = 0;
  let duration = 5;
  let ready = false;
  let playing = false;
  let frame;
  let selection;
  let playRequest = 0;

  function showStatus(message) {
    status.textContent = message;
    status.hidden = !message;
  }

  function setPlaying(value) {
    playing = value;
    playButton.dataset.playing = String(value);
    playText.textContent = value ? "Pause" : "Play";
  }

  function pause() {
    playRequest += 1;
    cancelAnimationFrame(frame);
    videos.forEach(video => video.pause());
    setPlaying(false);
  }

  function updatePosition(time) {
    position = Math.max(0, Math.min(time, duration));
    timeline.value = position;
    const elapsed = position.toFixed(2);
    timeLabel.textContent = elapsed + " / " + duration.toFixed(2) + " s";
    timeline.setAttribute("aria-valuetext", elapsed + " of " + duration.toFixed(2) + " seconds");
  }

  function seek(time) {
    updatePosition(time);
    for (const video of videos) {
      const target = Math.min(position, video.duration);
      if (Math.abs(video.currentTime - target) > 0.005) video.currentTime = target;
    }
  }

  function followMaster() {
    if (!playing) return;
    if (master.ended || master.currentTime >= duration) {
      pause();
      seek(duration);
      return;
    }
    if (!videos.some(video => video.seeking)) {
      updatePosition(master.currentTime);
      for (const video of videos) {
        if (video !== master && Math.abs(video.currentTime - position) > 0.12) {
          video.currentTime = Math.min(position, video.duration);
        }
      }
    }
    frame = requestAnimationFrame(followMaster);
  }

  async function play() {
    if (!ready) return;
    if (position >= duration - 0.02) seek(0);
    const request = ++playRequest;
    setPlaying(true);
    try {
      await Promise.all(videos.map(video => video.play()));
      if (request === playRequest) frame = requestAnimationFrame(followMaster);
    } catch {
      if (request !== playRequest) return;
      pause();
      showStatus("Playback could not start. Press Play to try again.");
    }
  }

  function waitForMetadata(video, signal) {
    if (video.error) return Promise.reject(video.error);
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve();
    return new Promise((resolve, reject) => {
      function finish(error) {
        video.removeEventListener("loadedmetadata", loaded);
        video.removeEventListener("error", failed);
        signal.removeEventListener("abort", cancelled);
        if (error) reject(error);
        else resolve();
      }
      const loaded = () => finish();
      const failed = () => finish(video.error || new Error("Video unavailable"));
      const cancelled = () => finish(signal.reason);
      video.addEventListener("loadedmetadata", loaded);
      video.addEventListener("error", failed);
      signal.addEventListener("abort", cancelled, { once: true });
    });
  }

  function setTrack(video, track) {
    const src = new URL(track + ".mp4", assets).href;
    if (video.src !== src || video.error) {
      video.poster = new URL(track + ".webp", assets);
      video.preload = "metadata";
      video.src = src;
      video.load();
    }
  }

  function markPressed(button, value) {
    button.setAttribute("aria-pressed", String(value));
  }

  async function loadExample({ time = 0, resume = false } = {}) {
    selection?.abort();
    selection = new AbortController();
    const { signal } = selection;
    pause();
    ready = false;
    setPlaying(resume);
    showStatus("");
    playButton.disabled = true;
    timeline.disabled = true;
    demo.setAttribute("aria-busy", "true");

    const options = currentExample.tracks[mode];
    const view = mode === "action" ? "main" : "multi";
    const media = options[view];
    title.textContent = currentExample.title;
    modes.forEach(button => markPressed(button, button.dataset.mode === mode));
    demo.dataset.layout = view;
    cameraNote.hidden = mode !== "action" && view !== "multi";
    cameraNote.textContent = mode === "action"
      ? "Action Map is available in the main view."
      : "Main view on the left. Left wrist above right wrist.";
    for (const button of library.children) {
      markPressed(button, button.dataset.example === currentExample.id);
    }

    duration = currentExample.seconds;
    timeline.max = duration;
    updatePosition(time);

    try {
      for (const video of videos) setTrack(video, media[video.dataset.role]);
      await Promise.all(videos.map(video => waitForMetadata(video, signal)));
      if (signal.aborted) return;
      duration = Math.min(duration, ...videos.map(video => video.duration));
      if (!Number.isFinite(duration) || duration <= 0) throw new Error("Invalid duration");
      timeline.max = duration;
      seek(time);
      ready = true;
      playButton.disabled = false;
      timeline.disabled = false;
      if (resume && position < duration - 0.02) void play();
      else setPlaying(false);
    } catch {
      if (signal.aborted) return;
      pause();
      showStatus(errorMessage);
    } finally {
      if (!signal.aborted) demo.removeAttribute("aria-busy");
    }
  }

  function renderLibrary(seconds) {
    const matching = examples.filter(example => example.seconds === seconds);
    const buttons = matching.map(example => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mc-example";
      button.dataset.example = example.id;
      markPressed(button, example === currentExample);
      const image = document.createElement("img");
      image.src = new URL(example.cover, assets);
      image.alt = "";
      image.width = 480;
      image.height = 276;
      image.loading = "lazy";
      const label = document.createElement("span");
      label.textContent = example.title;
      button.append(image, label);
      button.addEventListener("click", () => {
        if (example === currentExample && ready) return;
        const resume = playing;
        currentExample = example;
        void loadExample({ resume });
      });
      return button;
    });
    library.replaceChildren(...buttons);
    library.scrollLeft = 0;
    durations.forEach(button => markPressed(button, Number(button.dataset.duration) === seconds));
  }

  modes.forEach(button => button.addEventListener("click", () => {
    if (!currentExample || (ready && mode === button.dataset.mode)) return;
    mode = button.dataset.mode;
    void loadExample({ time: position, resume: playing });
  }));

  durations.forEach(button => button.addEventListener("click", () => {
    const seconds = Number(button.dataset.duration);
    if (!currentExample || currentExample.seconds === seconds) return;
    const matching = examples.filter(example => example.seconds === seconds);
    const caseNumber = currentExample.id.split("-")[0];
    currentExample = matching.find(example => example.id === caseNumber + "-" + seconds + "s") || matching[0];
    renderLibrary(seconds);
    void loadExample({ resume: playing });
  }));

  playButton.addEventListener("click", () => {
    if (playing) pause();
    else {
      showStatus("");
      void play();
    }
  });
  timeline.addEventListener("input", () => {
    if (ready) seek(timeline.valueAsNumber);
  });
  videos.forEach(video => video.addEventListener("error", () => {
    if (!ready) return;
    pause();
    ready = false;
    playButton.disabled = true;
    timeline.disabled = true;
    showStatus(errorMessage);
  }));

  async function init() {
    try {
      const response = await fetch(new URL("cases.cpfs-20261125.json", assets));
      if (!response.ok) throw new Error("Examples unavailable");
      examples = (await response.json()).filter(example => example.seconds === 5);
      currentExample = examples.find(example => example.id === "d02-5s") || examples[0];
      for (const button of durations) {
        button.disabled = !examples.some(example => example.seconds === Number(button.dataset.duration));
      }
      renderLibrary(currentExample.seconds);
      await loadExample();
    } catch {
      showStatus("The example library could not load. Reload the page to try again.");
    }
  }

  void init();
})();
