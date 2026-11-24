/* mw-cover.js
 * Interactive cover for the MoraWorld page. No dependencies.
 *
 * Three pixel-aligned videos are stacked on top of each other:
 *   wireframe on black  ->  white model  ->  RGB
 * Left to right the stack dissolves from one into the next. The pointer is a light: whatever it
 * touches is "rendered" (wireframe turns into white model at the rim and RGB at the core), and the
 * rendered wake fades back after a moment.
 *
 * The three layers live in ONE video file (a 2x2 atlas) so they can never drift out of sync:
 *   [ wireframe | white model ]
 *   [ RGB       | (unused)    ]
 *
 * Markup:
 *   <section class="mw-cover" data-mw-cover
 *            data-atlas-hi="media/cover-atlas-1080.mp4" data-atlas-lo="media/cover-atlas-720.mp4"
 *            data-atlas-still="media/cover-atlas-still.jpg">
 *     <img class="mw-cover__poster" src="media/cover-poster.jpg" alt="">
 *     <canvas class="mw-cover__canvas" aria-hidden="true"></canvas>
 *     ... your hero text ...
 *   </section>
 */
(function () {
  'use strict';

  var CELLS = { grid: [0, 0], white: [1, 0], rgb: [0, 1] };

  var DEFAULTS = {
    split1: 0.40,   // centre of the wireframe -> white model dissolve, 0..1 across the cover
    split2: 0.70,   // centre of the white model -> RGB dissolve
    feather: 0.12,  // half-width of each dissolve
    slant: 0.10,    // lean of the dissolve, as a fraction of the width over the full height
    radius: 0.27,   // light radius, as a fraction of the cover height
    core: 0.66,     // RGB core of the light, as a fraction of the radius
    trail: 0.9,     // seconds the rendered wake takes to fade
    glow: 0.45,     // how much the rendered core is brightened, 0 turns it off
    ghost: true,    // let a light drift on its own until the visitor moves the pointer
    tint: '#b79cff',// colour of the wireframe that glows on the rim of the light
    floor: '#0B0D10'// page background; pure black in the footage is lifted to it
  };

  function smooth(t) { return t * t * (3 - 2 * t); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function make(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  function Cover(root, opts) {
    var o = {}, k;
    for (k in DEFAULTS) o[k] = DEFAULTS[k];
    for (k in DEFAULTS) {
      var d = root.getAttribute('data-' + k);
      if (d !== null && d !== '') o[k] = (typeof DEFAULTS[k] === 'number') ? parseFloat(d) : (typeof DEFAULTS[k] === 'boolean' ? d !== 'false' : d);
    }
    for (k in (opts || {})) o[k] = opts[k];
    this.o = o;
    this.root = root;
    this.canvas = root.querySelector('.mw-cover__canvas') || root.appendChild(Object.assign(document.createElement('canvas'), { className: 'mw-cover__canvas' }));
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.points = [];          // light trail: {x, y, t} in 0..1 cover coordinates
    this.pointer = null;       // latest real pointer position, or null when it is away
    this.lastReal = -1e9;
    this.visible = true;
    this.live = false;
    this.W = 0; this.H = 0;
    this._frame = this._frame.bind(this);
    this._still();
    this._video();
    this._events();
    this._resize();
    this.raf = 0;
    this.lastPaint = -Infinity;
    this._schedule();
  }

  Cover.prototype._schedule = function () {
    if (!this.raf && this.visible && !this.reduced && !document.hidden) {
      this.raf = requestAnimationFrame(this._frame);
    }
  };

  Cover.prototype._video = function () {
    var r = this.root, v = document.createElement('video');
    var hi = r.getAttribute('data-atlas-hi'), lo = r.getAttribute('data-atlas-lo') || hi;
    var conn = navigator.connection || {};
    var small = Math.min(window.innerWidth, window.innerHeight) < 700 || conn.saveData;
    var wide = window.innerWidth * (window.devicePixelRatio || 1) >= 1800;
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    this.video = v;
    if (!lo || conn.saveData || this.reduced) return;
    v.src = (wide && !small && hi) ? hi : lo;
    var self = this;
    v.addEventListener('loadeddata', function () { self._play(); });
    v.load();
  };

  /* One still frame of the atlas. Used until the video can play, and if it never can. */
  Cover.prototype._still = function () {
    var u = this.root.getAttribute('data-atlas-still'), self = this;
    if (!u) return;
    var im = new Image();
    im.onload = function () { self.still = im; };
    im.src = u;
  };

  Cover.prototype._play = function () {
    if (this.reduced || !this.visible || document.hidden || !this.video.getAttribute('src')) return;
    var p = this.video.play();
    if (p && p.catch) p.catch(function () {});
  };

  Cover.prototype._events = function () {
    var self = this, r = this.root;
    function at(e) {
      var b = r.getBoundingClientRect();
      self.pointer = { x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height };
      self.lastReal = performance.now();
      if (!self.touched) { self.touched = true; r.classList.add('is-touched'); }
    }
    r.addEventListener('pointermove', at, { passive: true });
    r.addEventListener('pointerdown', function (e) {
      at(e);
      if (self.video.paused && !self.reduced) self._play();   // a tap or click starts it where autoplay is blocked
    }, { passive: true });
    r.addEventListener('pointerleave', function () { self.pointer = null; }, { passive: true });
    r.addEventListener('pointercancel', function () { self.pointer = null; }, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(function () { self._resize(); }).observe(r);
    else window.addEventListener('resize', function () { self._resize(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        self.visible = en[0].isIntersecting;
        if (self.visible) {
          self._play();
          self._schedule();
        } else self.video.pause();
      }, { threshold: 0.02 }).observe(r);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) self.video.pause();
      else {
        self._play();
        self._schedule();
      }
    });
  };

  Cover.prototype._resize = function () {
    var b = this.root.getBoundingClientRect();
    if (!b.width || !b.height) return;
    // Backing resolution stays bounded on Retina and other high-density screens.
    var maxPixels = 750000;
    var scale = Math.min(1, Math.sqrt(maxPixels / (b.width * b.height)));
    var W = Math.max(1, Math.round(b.width * scale));
    var H = Math.max(1, Math.round(b.height * scale));
    if (W === this.W && H === this.H) return;
    this.W = W; this.H = H;
    this.canvas.width = W; this.canvas.height = H;
    this.cWhite = make(W, H); this.gWhite = this.cWhite.getContext('2d');
    this.cGrid = make(W, H); this.gGrid = this.cGrid.getContext('2d');
    this.cEdge = make(W, H); this.gEdge = this.cEdge.getContext('2d');
    var lw = Math.max(2, Math.round(W / 6)), lh = Math.max(2, Math.round(H / 6));
    this.cWide = make(lw, lh); this.gWide = this.cWide.getContext('2d');
    this.cCore = make(lw, lh); this.gCore = this.cCore.getContext('2d');
    this._masks();
  };

  /* Static left-to-right dissolve masks. Opaque where a layer is shown, clear where the next one takes over. */
  Cover.prototype._masks = function () {
    var o = this.o, w = Math.max(2, Math.round(this.W / 2)), h = Math.max(2, Math.round(this.H / 2));
    function mask(centre) {
      var c = make(w, h), g = c.getContext('2d');
      var grad = g.createLinearGradient((centre - o.feather) * w, 0, (centre + o.feather) * w, 0);
      for (var i = 0; i <= 12; i++) grad.addColorStop(i / 12, 'rgba(0,0,0,' + (1 - smooth(i / 12)).toFixed(4) + ')');
      var k = o.slant * w / h;
      g.setTransform(1, 0, -k, 1, k * h / 2, 0);
      g.fillStyle = grad; g.fillRect(-w, 0, w * 3, h);
      return c;
    }
    this.mGrid = mask(o.split1);
    this.mWhite = mask(o.split2);
  };

  Cover.prototype.set = function (changes) {
    for (var k in changes) this.o[k] = changes[k];
    if (this.W) this._masks();
  };

  /* Where to cut each atlas cell so the footage covers the canvas like object-fit: cover. */
  Cover.prototype._src = function (cell) {
    var cw = this.srcW / 2, ch = this.srcH / 2, pad = 2;
    var aw = cw - pad * 2, ah = ch - pad * 2, A = this.W / this.H, sw, sh;
    if (A > aw / ah) { sw = aw; sh = aw / A; } else { sh = ah; sw = ah * A; }
    return [cell[0] * cw + pad + (aw - sw) / 2, cell[1] * ch + pad + (ah - sh) / 2, sw, sh];
  };

  Cover.prototype._stamp = function (g, x, y, r, a) {
    var grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(255,255,255,' + a.toFixed(3) + ')');
    grd.addColorStop(0.42, 'rgba(255,255,255,' + (a * 0.94).toFixed(3) + ')');
    grd.addColorStop(0.66, 'rgba(255,255,255,' + (a * 0.56).toFixed(3) + ')');
    grd.addColorStop(0.86, 'rgba(255,255,255,' + (a * 0.15).toFixed(3) + ')');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  };

  /* The light is redrawn every frame from the recent pointer path, so the wake always fades to nothing. */
  Cover.prototype._light = function (now) {
    var o = this.o, pts = this.points, p = this.pointer, i;
    if (!p && o.ghost && !this.reduced && now - this.lastReal > 5000) {
      var t = now / 1000;
      p = { x: 0.30 + 0.17 * Math.sin(t * 0.42), y: 0.52 + 0.20 * Math.sin(t * 0.63 + 1.3) };
    }
    if (p) {
      var last = pts[pts.length - 1];
      if (last && Math.abs(last.x - p.x) + Math.abs(last.y - p.y) < 0.012) { last.t = now; last.x = p.x; last.y = p.y; }
      else pts.push({ x: p.x, y: p.y, t: now });
    }
    var life = o.trail * 1000;
    while (pts.length && now - pts[0].t > life) pts.shift();
    if (pts.length > 90) pts.splice(0, pts.length - 90);

    var gw = this.gWide, gc = this.gCore, lw = this.cWide.width, lh = this.cWide.height;
    gw.clearRect(0, 0, lw, lh); gc.clearRect(0, 0, lw, lh);
    var R = o.radius * lh;
    for (i = 0; i < pts.length; i++) {
      var q = pts[i], kf = 1 - (now - q.t) / life, a = kf * kf, grow = 1 + 0.22 * (1 - kf);
      this._stamp(gw, q.x * lw, q.y * lh, R * grow, a);
      this._stamp(gc, q.x * lw, q.y * lh, R * o.core * grow, a);
    }
    return pts.length > 0;
  };

  Cover.prototype._frame = function (now) {
    this.raf = 0;
    if (!this.visible || this.reduced || document.hidden) return;
    this._schedule();
    if (!this.W || now - this.lastPaint < 1000 / 30 - 1 ||
        document.documentElement.classList.contains('mw-cover-leaving')) return;
    var v = this.video;
    if (v.readyState >= 2 && v.videoWidth) { this.srcW = v.videoWidth; this.srcH = v.videoHeight; }
    else if (this.still) { v = this.still; this.srcW = v.naturalWidth || v.width; this.srcH = v.naturalHeight || v.height; }
    else return;
    this.lastPaint = now;
    var o = this.o, W = this.W, H = this.H, ctx = this.ctx;
    var lit = this._light(now);
    var sr = this._src(CELLS.rgb), sw = this._src(CELLS.white), sg = this._src(CELLS.grid), g;

    // RGB is the bottom of the stack.
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.drawImage(v, sr[0], sr[1], sr[2], sr[3], 0, 0, W, H);

    // White model: shown left of the second dissolve, removed by the core of the light.
    g = this.gWhite;
    g.globalCompositeOperation = 'copy'; g.drawImage(v, sw[0], sw[1], sw[2], sw[3], 0, 0, W, H);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(this.mWhite, 0, 0, W, H);
    if (lit) { g.globalCompositeOperation = 'destination-out'; g.drawImage(this.cCore, 0, 0, W, H); }
    ctx.drawImage(this.cWhite, 0, 0);

    // Wireframe: shown left of the first dissolve, removed by the whole light.
    g = this.gGrid;
    g.globalCompositeOperation = 'copy'; g.drawImage(v, sg[0], sg[1], sg[2], sg[3], 0, 0, W, H);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(this.mGrid, 0, 0, W, H);
    if (lit) { g.globalCompositeOperation = 'destination-out'; g.drawImage(this.cWide, 0, 0, W, H); }
    ctx.drawImage(this.cGrid, 0, 0);

    // On the rim of the light the wireframe stays on as glowing lines over the white model.
    if (lit) {
      g = this.gEdge;
      g.globalCompositeOperation = 'copy'; g.drawImage(v, sg[0], sg[1], sg[2], sg[3], 0, 0, W, H);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = o.tint; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(this.cWide, 0, 0, W, H);
      g.globalCompositeOperation = 'destination-out'; g.drawImage(this.cCore, 0, 0, W, H);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(this.mWhite, 0, 0, W, H);
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(this.cEdge, 0, 0);
    }

    // The rendered core is lifted a little, so the pointer reads as a light and not only as a mask.
    if (lit && o.glow > 0) {
      ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = o.glow;
      ctx.drawImage(this.cCore, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // Lift pure black to the page background so the cover has no visible edge.
    ctx.globalCompositeOperation = 'lighten'; ctx.fillStyle = o.floor; ctx.fillRect(0, 0, W, H);

    if (!this.live) { this.live = true; this.root.classList.add('is-live'); }
  };

  /* For tests and tuning: put the light somewhere without a real pointer (0..1 coordinates), or pass null. */
  Cover.prototype.point = function (x, y) {
    this.pointer = (x === null || x === undefined) ? null : { x: x, y: y };
    this.lastReal = performance.now();
  };

  var api = {
    instances: [],
    defaults: DEFAULTS,
    init: function (el, opts) { var c = new Cover(el, opts); api.instances.push(c); return c; }
  };
  window.MWCover = api;

  function boot() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        (location.hash && location.hash !== '#cover')) return;
    var els = document.querySelectorAll('[data-mw-cover]');
    for (var i = 0; i < els.length; i++) if (!els[i].__mwCover) els[i].__mwCover = api.init(els[i]);
  }
  boot();
  window.addEventListener('hashchange', boot);
  window.addEventListener('popstate', boot);
})();
