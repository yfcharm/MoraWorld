// Both decoders receive the unmodified prediction files. Match decoded frames by
// presentation timestamp before drawing a side-by-side or wipe comparison.
class MemoryPair {
  constructor(memory, baseline, repaint) {
    this.videos = [memory, baseline];
    this.repaint = repaint;
    this.tracks = this.videos.map(() => ({ frames: new Map(), free: [], callback: null }));
    this.hasFrameCallbacks = this.videos.every(video => typeof video.requestVideoFrameCallback === 'function');
    this.clock = memory;
    this.fps = 0;
    this.serial = 0;
    this.playRequest = 0;
    this.target = 0;
    this.lastSync = 0;
    this.latest = null;
    this.videos.forEach(video => {
      video.addEventListener('loadedmetadata', () => {
        if (this.target && video.readyState >= 1) video.currentTime = this.target;
      });
      for (const event of ['loadeddata', 'seeked', 'timeupdate']) video.addEventListener(event, repaint);
    });
  }

  clearFrames() {
    this.latest = null;
    for (const track of this.tracks) {
      track.free.push(...track.frames.values());
      track.frames.clear();
    }
  }

  load(on, off, fps) {
    this.pause();
    this.serial++;
    this.target = 0;
    this.fps = fps;
    this.clearFrames();
    this.videos.forEach((video, i) => {
      const track = this.tracks[i];
      if (track.callback !== null) video.cancelVideoFrameCallback(track.callback);
      track.callback = null;
      video.src = i === 0 ? on : off;
      video.load();
      if (this.hasFrameCallbacks) this.watch(i, this.serial);
    });
  }

  watch(i, serial) {
    const video = this.videos[i];
    const track = this.tracks[i];
    track.callback = video.requestVideoFrameCallback((_, frame) => {
      if (serial !== this.serial) return;
      const n = Math.round(frame.mediaTime * this.fps);
      if (!track.frames.has(n) && video.videoWidth && !video.seeking) {
        const surface = track.free.pop() || document.createElement('canvas');
        if (surface.width !== video.videoWidth || surface.height !== video.videoHeight) {
          surface.width = video.videoWidth;
          surface.height = video.videoHeight;
        }
        surface.getContext('2d').drawImage(video, 0, 0);
        track.frames.set(n, surface);
        const other = this.tracks[1-i].frames;
        if (other.has(n)) this.latest = this.tracks.map(t => t.frames.get(n));
        while (track.frames.size > 8) {
          const [key, old] = track.frames.entries().next().value;
          track.frames.delete(key);
          // Never recycle a still-visible frame while its counterpart is stalled.
          if (!this.latest?.includes(old)) track.free.push(old);
        }
        this.repaint();
      }
      this.watch(i, serial);
    });
  }

  frames() {
    const [on, off] = this.videos;
    if (this.videos.some(v => v.readyState < 2 || v.seeking)) return null;
    const delta = on.currentTime - off.currentTime;
    if (!on.paused && Math.abs(delta) > Math.max(2 / this.fps, .075 * on.playbackRate)
        && performance.now() - this.lastSync > 250) {
      this.lastSync = performance.now();
      off.currentTime = on.currentTime;
    }
    if (this.hasFrameCallbacks && this.latest) return this.latest;
    // Also covers paused first frames on browsers that defer frame callbacks.
    return Math.floor(on.currentTime*this.fps + .0001) === Math.floor(off.currentTime*this.fps + .0001) ? this.videos : null;
  }

  seek(t) {
    this.target = t;
    this.clearFrames();
    for (const video of this.videos) if (video.readyState >= 1) video.currentTime = t;
  }

  rate(n) {
    for (const video of this.videos) video.defaultPlaybackRate = video.playbackRate = n;
  }

  pause() {
    this.playRequest++;
    this.videos.forEach(video => video.pause());
  }

  async play() {
    const request = ++this.playRequest;
    if (this.clock.ended) this.seek(0);
    else if (Math.abs(this.videos[1].currentTime-this.clock.currentTime) > .5/this.fps) this.seek(this.clock.currentTime);
    try {
      await Promise.all(this.videos.map(video => video.play()));
    } catch (error) {
      if (request !== this.playRequest) return;
      this.pause();
      throw error;
    }
  }
}
