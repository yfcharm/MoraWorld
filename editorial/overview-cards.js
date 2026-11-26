(() => {
  const width = 360;
  const height = 202;
  const ink = '#eae4f7';
  const muted = '#aab0c5';
  const lavender = '#bea6ff';
  const font = 'Inter, system-ui, sans-serif';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function line(ctx, points, color, thickness = 1) {
    ctx.beginPath();
    points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.stroke();
  }

  function shape(ctx, points, fill, stroke) {
    ctx.beginPath();
    points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function panel(ctx, x, y, w, h, radius, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function dot(ctx, x, y, radius, fill, stroke = fill) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function label(ctx, value, x, y, { color = muted, align = 'left', size = 12, weight = 500 } = {}) {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(value, x, y);
  }

  function gradient(ctx, y0, y1, top, bottom) {
    const fill = ctx.createLinearGradient(0, y0, 0, y1);
    fill.addColorStop(0, top);
    fill.addColorStop(1, bottom);
    return fill;
  }

  const clamp = (value) => Math.max(0, Math.min(1, value));
  const ease = (value) => 1 - (1 - clamp(value)) ** 3;
  const mix = (from, to, t) => from + (to - from) * t;

  function oval(ctx, x, y, rx, ry, fill, stroke = fill) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawRoom(ctx) {
    shape(ctx, [[34, 147], [177, 111], [325, 146], [175, 186]], '#1e2031', '#535670');
    shape(ctx, [[34, 147], [34, 82], [177, 43], [177, 111]], '#232538', '#545571');
    shape(ctx, [[177, 43], [325, 76], [325, 146], [177, 111]], '#1b1e2d', '#545571');
    line(ctx, [[95, 132], [229, 172]], '#393b51');
    line(ctx, [[245, 128], [101, 165]], '#393b51');
    shape(ctx, [[56, 137], [56, 96], [89, 87], [89, 128]], '#303247', '#515571');
    line(ctx, [[56, 112], [89, 103]], '#62627f');
    line(ctx, [[270, 132], [270, 79], [300, 86], [300, 139]], '#4a4f67');
  }

  function drawWorkbench(ctx, x = 0, y = 0) {
    ctx.save();
    ctx.translate(x, y);
    for (const [legX, legY] of [[205, 133], [243, 148], [293, 134]]) {
      line(ctx, [[legX, legY], [legX, legY + 24]], '#666783', 3);
    }
    shape(ctx, [[199, 131], [258, 113], [297, 128], [240, 147]], '#43465e', '#777895');
    shape(ctx, [[199, 131], [240, 147], [240, 152], [199, 136]], '#292b41', '#64657f');
    shape(ctx, [[240, 147], [297, 128], [297, 133], [240, 152]], '#34364e', '#64657f');
    panel(ctx, 245, 106, 17, 21, 4, gradient(ctx, 106, 127, '#f0d5ab', '#a47d5b'), '#efcfa8');
    oval(ctx, 253.5, 107, 7.4, 2.5, '#e1bb91', '#f7dfbe');
    ctx.restore();
  }

  function drawMobileRobot(ctx, x, y, scale, reach, { ghost = false, beam = true } = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    if (ghost) ctx.globalAlpha *= .38;
    oval(ctx, 0, 9, 37, 9, '#10131e66');
    panel(ctx, -29, -8, 60, 19, 8, '#25293c', '#787c9b');
    for (const wheel of [-20, 21]) {
      dot(ctx, wheel, 8, 7, '#171b29', '#707492');
      dot(ctx, wheel, 8, 2.3, '#979bb5');
    }
    oval(ctx, 1, -8, 30, 10, '#494e68', '#8a8daa');
    panel(ctx, -9, -60, 23, 51, 7, gradient(ctx, -60, -9, '#969ab1', '#4f546e'), '#acaac4');
    panel(ctx, -22, -64, 46, 15, 6, '#626682', '#a6a5bc');

    const wrist = [mix(53, 67, reach), mix(-30, -48, reach)];
    const arms = [
      [[-17, -57], [-39, -41], [-32, -24]],
      [[18, -56], [38, mix(-34, -46, reach)], wrist],
    ];
    for (const arm of arms) {
      line(ctx, arm, '#24273a', 12);
      line(ctx, arm, gradient(ctx, -60, -22, '#c2bfd5', '#747695'), 8);
      for (const [jx, jy] of arm) dot(ctx, jx, jy, 3.5, '#666584', '#d4cced');
    }
    line(ctx, [[wrist[0] + 2, wrist[1]], [wrist[0] + 7, wrist[1] - 2], [wrist[0] + 10, wrist[1] + 1]], ink, 1.7);
    line(ctx, [[wrist[0] + 2, wrist[1] + 2], [wrist[0] + 6, wrist[1] + 5], [wrist[0] + 10, wrist[1] + 4]], ink, 1.7);

    panel(ctx, -5, -82, 15, 19, 5, '#555875', '#9394b0');
    panel(ctx, -14, -100, 36, 24, 8, gradient(ctx, -100, -76, '#42405d', '#25273c'), '#a792df');
    dot(ctx, 11, -88, 5.7, '#8c66cc', '#ddc7ff');
    dot(ctx, 12, -89, 2.2, '#f1e5ff');
    if (beam) {
      const aim = mix(-65, -58, reach);
      shape(ctx, [[17, -87], [78, aim - 17], [83, aim + 14]], '#ad86ec20', '#ad86ec64');
    }
    ctx.restore();
  }

  function drawControl(ctx, mode, progress) {
    const titles = ['Action map', 'Robot geometry', 'Arms + objects', 'Full grey-box scene'];
    label(ctx, titles[mode], 17, 20, { color: ink, weight: 650 });

    if (mode === 3) {
      ctx.save();
      ctx.globalAlpha = .5 + .5 * ease(progress);
      drawRoom(ctx);
      ctx.restore();
    } else {
      shape(ctx, [[42, 148], [174, 113], [323, 147], [175, 185]], '#1f2031', '#3d4059');
    }

    if (mode >= 2) {
      ctx.save();
      ctx.globalAlpha = mode === 2 ? .5 + .5 * ease(progress) : 1;
      drawWorkbench(ctx);
      ctx.restore();
    }

    ctx.setLineDash([3, 5]);
    line(ctx, [[71, 154], [100, 163], [128, 155], [159, 147]], mode === 0 ? lavender : '#756493', 1.5);
    const route = [[191, 113], [209, 109], [225, 101], [244, 113]];
    line(ctx, route, mode === 0 ? lavender : '#967bb1', 1.6);
    ctx.setLineDash([]);

    const reach = ease(progress);
    const x = mix(141, 168, reach);
    drawMobileRobot(ctx, x, 147, 1, reach, { ghost: mode === 0 });
    if (mode === 0) {
      dot(ctx, mix(191, 244, reach), 111 - Math.sin(reach * Math.PI) * 12, 4, lavender, '#f3e6ff');
      label(ctx, 'Gripper path', 268, 101, { size: 11, color: lavender });
    } else {
      label(ctx, 'Head camera', 263, 58, { size: 11, color: lavender });
      line(ctx, [[242, 69], [253, 58], [257, 58]], '#8d76ad');
    }
    label(ctx, 'Mobile base', 37, 120, { size: 11, color: muted });
    line(ctx, [[87, 120], [111, 140], [125, 140]], '#7a668f');
  }

  const roomRoute = [[105, 116], [152, 116], [165, 116], [183, 116], [183, 89], [206, 89], [255, 89]];
  const routeDistances = [0];
  roomRoute.slice(1).forEach(([x, y], index) => {
    const [previousX, previousY] = roomRoute[index];
    routeDistances.push(routeDistances[index] + Math.hypot(x - previousX, y - previousY));
  });

  function cameraPosition(progress) {
    const distance = routeDistances.at(-1) * progress;
    const edgeIndex = routeDistances.findIndex((point, index) => index > 0 && point >= distance);
    const fraction = (distance - routeDistances[edgeIndex - 1]) / (routeDistances[edgeIndex] - routeDistances[edgeIndex - 1]);
    const [x, y] = roomRoute[edgeIndex - 1];
    const [nextX, nextY] = roomRoute[edgeIndex];
    return [x + (nextX - x) * fraction, y + (nextY - y) * fraction, Math.atan2(nextY - y, nextX - x)];
  }

  function drawMemory(ctx, time) {
    const returning = time >= 0.54;
    const onLandmark = time <= 0.13 || time >= 0.88;
    const outward = Math.min(1, Math.max(0, (time - 0.13) / 0.30));
    const back = Math.min(1, Math.max(0, (time - 0.54) / 0.34));
    const [x, y, heading] = cameraPosition(returning ? 1 - back : outward);
    const angle = onLandmark ? -2.28 : heading + (returning ? Math.PI : 0);
    const view = time <= .13 ? 'First look' : time < .54 ? 'Turn away' : 'Return to the landmark';
    label(ctx, view, 17, 20, { color: ink, weight: 650 });
    line(ctx, [[20, 35], [340, 35]], '#353449');
    const progressX = 20 + 320 * time;
    line(ctx, [[20, 35], [progressX, 35]], '#9b79d8');
    dot(ctx, progressX, 35, 2.5, '#9ee1d6');

    shape(ctx, [[35, 75], [160, 75], [160, 107], [176, 107], [176, 50], [325, 50],
      [325, 132], [206, 132], [206, 102], [195, 102], [195, 127], [160, 127],
      [160, 150], [35, 150]], gradient(ctx, 50, 150, '#28253b', '#1a1c2a'), '#625879');
    line(ctx, [[50, 127], [50, 90], [82, 90]], '#655d80', 2);
    panel(ctx, 64, 92, 21, 17, 3, onLandmark ? '#8b70bf' : '#4d4266', onLandmark ? '#e1cfff' : '#807196');
    panel(ctx, 267, 109, 42, 12, 3, '#343146', '#5e5471');
    panel(ctx, 283, 63, 24, 20, 3, '#302b43', '#58526f');

    ctx.setLineDash([3, 4]);
    line(ctx, roomRoute, '#8b75b1', 1.4);
    ctx.setLineDash([]);
    shape(ctx, [[x, y], [x + Math.cos(angle - 0.35) * 30, y + Math.sin(angle - 0.35) * 30],
      [x + Math.cos(angle + 0.35) * 30, y + Math.sin(angle + 0.35) * 30]], '#a987ef26', '#a987ef65');
    dot(ctx, x, y, 8, '#9c77e134', '#ba9cfa71');
    dot(ctx, x, y, 3.8, '#9ee1d6', '#dcfff8');
    label(ctx, 'Room A', 44, 165);
    label(ctx, 'Room B', 318, 143, { align: 'right' });
    label(ctx, time >= .88 ? 'Same landmark on return' : time <= .13 ? 'Mark a landmark' : 'Follow the camera', 180, 184,
      { align: 'center', color: '#a8e0d8', weight: 600 });
  }

  const storyboardTitles = ['Coding agent', 'Grey-box scene', 'First-person render', 'Applications'];

  function codePreview(ctx, progress) {
    panel(ctx, 16, 40, 159, 123, 8, '#1b1b2a', '#6b577a');
    label(ctx, 'scene.yaml', 28, 54, { color: '#d0badc', size: 11 });
    line(ctx, [[17, 65], [174, 65]], '#3b3349');
    const code = ['room: workcell', 'robot: mobile_dual', 'camera: head'];
    const characters = Math.floor(ease(progress) * (code.join('').length + 3));
    let written = 0;
    ctx.font = '11px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    code.forEach((lineText, index) => {
      const text = lineText.slice(0, Math.max(0, characters - written));
      const y = 82 + 21 * index;
      const separator = text.indexOf(':') + 1;
      const name = text.slice(0, separator || text.length);
      ctx.fillStyle = lavender;
      ctx.fillText(name, 28, y);
      ctx.fillStyle = ink;
      ctx.fillText(text.slice(name.length), 28 + ctx.measureText(name).width, y);
      if (characters >= written && characters < written + lineText.length) {
        const cursor = 30 + ctx.measureText(text).width;
        line(ctx, [[cursor, y - 6], [cursor, y + 5]], '#c8afff', 1.6);
      }
      written += lineText.length;
    });

    ctx.save();
    ctx.translate(185, 60);
    ctx.scale(.48, .48);
    ctx.globalAlpha = .35 + .65 * progress;
    drawRoom(ctx);
    if (characters > 12) drawWorkbench(ctx);
    if (characters > 28) drawMobileRobot(ctx, 163, 149, 1, .75);
    ctx.restore();
    label(ctx, 'Scene preview', 268, 164, { align: 'center', size: 11, color: muted });
  }

  function firstPerson(ctx, x, y, scale, progress = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    panel(ctx, 0, 0, 156, 95, 8, '#25263a', '#81758d');
    ctx.beginPath();
    ctx.roundRect(1, 1, 154, 93, 7);
    ctx.clip();
    ctx.fillStyle = gradient(ctx, 0, 70, '#62637a', '#c4af97');
    ctx.fillRect(0, 0, 156, 69);
    panel(ctx, 103, 7, 39, 46, 2, '#807866', '#a59a82');
    line(ctx, [[103, 28], [141, 28]], '#c8b093');
    line(ctx, [[102, 43], [140, 43]], '#655e54');
    shape(ctx, [[27, 58], [121, 58], [154, 94], [3, 94]], '#82604e', '#c68f65');
    panel(ctx, 71, 40, 16, 22, 4, gradient(ctx, 40, 60, '#ffe0b7', '#ce9564'), '#ffe6bd');
    oval(ctx, 79, 41, 7, 3, '#c18960', '#f6d0a3');
    const p = ease(progress);
    line(ctx, [[39, 94], [54, 77], [mix(56, 70, p), mix(71, 64, p)]], '#343748', 11);
    line(ctx, [[117, 94], [99, 76], [mix(98, 87, p), mix(70, 63, p)]], '#403e50', 11);
    dot(ctx, mix(56, 70, p), mix(71, 64, p), 3, '#c2a5ee');
    dot(ctx, mix(98, 87, p), mix(70, 63, p), 3, '#c2a5ee');
    ctx.restore();
  }

  function renderPreview(ctx, progress) {
    ctx.save();
    ctx.translate(12, 52);
    ctx.scale(.47, .47);
    drawRoom(ctx);
    drawWorkbench(ctx);
    drawMobileRobot(ctx, 166, 149, 1, .9);
    ctx.restore();
    line(ctx, [[164, 104], [187, 104]], '#b295d6', 1.4);
    line(ctx, [[182, 100], [187, 104], [182, 108]], '#b295d6', 1.4);
    firstPerson(ctx, 195, 55, .94, progress);
    label(ctx, 'Simulator', 91, 163, { align: 'center', size: 11 });
    label(ctx, 'Rendered camera view', 268, 163, { align: 'center', size: 11, color: '#edd4bd' });
  }

  function useCases(ctx, progress) {
    const columnLabels = ['Data variants', 'Policy evaluation', 'Real-robot trials'];
    const accents = ['#bd9df1', '#9ad5cf', '#edbea2'];
    firstPerson(ctx, 145, 34, .45);
    line(ctx, [[180, 78], [180, 93], [70, 93], [70, 112]], '#8b729e', 1.4);
    line(ctx, [[180, 93], [290, 93], [290, 112]], '#8b729e', 1.4);
    line(ctx, [[180, 93], [180, 112]], '#8b729e', 1.4);
    for (const [index, title] of columnLabels.entries()) {
      const x = 19 + 110 * index;
      const center = x + 51;
      const accent = accents[index];
      const revealed = clamp(progress * 2 - index * .33);
      ctx.save();
      ctx.globalAlpha = .44 + .56 * revealed;
      panel(ctx, x, 110, 102, 62, 9, gradient(ctx, 110, 172, '#2d273a', '#1d1c29'), accent);
      if (index === 0) {
        for (const [dx, dy] of [[-10, -7], [2, -7], [-10, 3], [2, 3]]) {
          panel(ctx, center + dx, 130 + dy, 8, 7, 2, '#4a3a61', accent);
        }
      } else if (index === 1) {
        for (const y of [124, 131, 138]) line(ctx, [[center - 11, y], [center - 2, y]], accent);
        line(ctx, [[center + 1, 131], [center + 5, 135], [center + 12, 125]], accent, 1.6);
      } else {
        panel(ctx, center - 10, 122, 20, 13, 4, '#574537', accent);
        dot(ctx, center + 3, 128, 2, accent);
        line(ctx, [[center, 135], [center, 141], [center - 9, 141], [center + 9, 141]], accent, 1.4);
      }
      label(ctx, title, center, 157, { align: 'center', color: ink, size: 10.5, weight: 650 });
      ctx.restore();
    }
  }

  function drawRobots(ctx, stage, progress) {
    label(ctx, storyboardTitles[stage], 17, 20, { color: ink, weight: 650 });
    if (stage === 0) codePreview(ctx, progress);
    if (stage === 1) {
      ctx.save();
      ctx.translate(2, 9);
      ctx.globalAlpha = .45 + .55 * ease(progress);
      drawRoom(ctx);
      drawWorkbench(ctx);
      drawMobileRobot(ctx, 160, 149, 1, ease(progress));
      ctx.restore();
      label(ctx, 'Robot + geometry + camera', 161, 193, { align: 'center', size: 11, color: lavender });
    }
    if (stage === 2) renderPreview(ctx, progress);
    if (stage === 3) useCases(ctx, progress);
  }

  const diagrams = {
    control: {
      times: [1450, 1250, 1250, 1700],
      draw: drawControl,
    },
    memory: {
      times: [1150, 1500, 1650],
      draw(ctx, stage, progress, settled) {
        const time = settled ? [.09, .47, 1][stage] : (stage + progress) / 3;
        drawMemory(ctx, time);
      },
    },
    robots: {
      times: [2250, 1450, 1550, 1900],
      draw: drawRobots,
    },
  };

  const finalStageHold = 1000;

  document.querySelectorAll('[data-overview-diagram]').forEach((root) => {
    const { times, draw } = diagrams[root.dataset.overviewDiagram];
    const canvas = root.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const toolbar = root.parentElement.querySelector('.mw-overview-story-tools');
    const actions = toolbar.querySelectorAll('[data-story-stage]');
    const replay = toolbar.querySelector('[data-story-replay]');
    let visible = false;
    let play = !reducedMotion.matches;
    const lastStage = times.length - 1;
    let stage = lastStage;
    let elapsed = 0;
    let frame = 0;
    let previousTime;

    function paint(progress = 1, settled = true) {
      ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      draw(ctx, stage, progress, settled);
    }

    function select(index) {
      stage = index;
      for (const [buttonIndex, button] of actions.entries()) {
        button.setAttribute('aria-pressed', String(buttonIndex === stage));
      }
    }

    function cancel() {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = undefined;
    }

    function tick(timestamp) {
      const previousStage = stage;
      const previousElapsed = elapsed;
      if (previousTime !== undefined) elapsed += timestamp - previousTime;
      previousTime = timestamp;
      const duration = times[stage] + (stage === lastStage ? finalStageHold : 0);
      if (elapsed >= duration) {
        elapsed -= duration;
        if (stage === lastStage && reducedMotion.matches) {
          play = false;
          cancel();
          paint();
          return;
        }
        select((stage + 1) % times.length);
      }
      if (stage !== previousStage || previousElapsed < times[stage]) {
        paint(clamp(elapsed / times[stage]), false);
      }
      frame = requestAnimationFrame(tick);
    }

    function start() {
      if (play && visible && !document.hidden && !frame) frame = requestAnimationFrame(tick);
    }

    function reset() {
      cancel();
      elapsed = 0;
      select(0);
      paint(0, false);
      play = true;
      start();
    }

    function resize() {
      const { width: w, height: h } = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      if (play && elapsed > 0) paint(clamp(elapsed / times[stage]), false);
      else paint();
    }

    let hasEntered = false;
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= .34;
      if (!visible) {
        cancel();
        return;
      }
      if (!hasEntered) {
        hasEntered = true;
        if (play) reset();
      }
      start();
    }, { threshold: .34 }).observe(root);

    for (const [index, button] of actions.entries()) {
      button.addEventListener('click', () => {
        play = false;
        cancel();
        select(index);
        paint();
      });
    }
    replay.addEventListener('click', reset);
    reducedMotion.addEventListener('change', ({ matches }) => {
      if (!matches || !play) return;
      play = false;
      cancel();
      paint();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancel();
      else start();
    });

    select(stage);
    resize();
    new ResizeObserver(resize).observe(canvas);
    toolbar.hidden = false;
  });
})();
