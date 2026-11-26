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

  function shape(ctx, points, fill, stroke, thickness = 1) {
    ctx.beginPath();
    points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = thickness;
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

  function drawEgoFloorGrid(ctx) {
    for (const edge of [-240, -40, 100, 210, 320, 430, 540, 680, 880]) {
      line(ctx, [[320 + (edge - 320) * .16, 135], [edge, 360]], '#8d81bb27');
    }
    for (const y of [151, 174, 205, 247, 301, 359]) line(ctx, [[0, y], [640, y]], '#8d81bb26');
  }

  function drawEgoBackdrop(ctx, mode) {
    const accent = ['#252039', '#292b41', '#282833', '#262934'][mode];
    const light = ctx.createRadialGradient(320, 180, 40, 320, 175, 440);
    light.addColorStop(0, accent);
    light.addColorStop(1, '#11131d');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, 640, 360);
  }

  function drawEgoTrajectory(ctx, points, color, t) {
    ctx.setLineDash([5, 8]);
    line(ctx, points, color, 2);
    ctx.setLineDash([]);
    const [x, y] = points.at(-1);
    const [px, py] = points.at(-2);
    const heading = Math.atan2(y - py, x - px);
    line(ctx, [[x - 9 * Math.cos(heading - .52), y - 9 * Math.sin(heading - .52)], [x, y],
      [x - 9 * Math.cos(heading + .52), y - 9 * Math.sin(heading + .52)]], color, 2);
    oval(ctx, ...points[0], 3.5, 3.5, '#201c30', color);
    const position = t * (points.length - 1);
    const step = Math.min(points.length - 2, Math.floor(position));
    const fraction = position - step;
    const from = points[step];
    const to = points[step + 1];
    const cx = mix(from[0], to[0], fraction);
    const cy = mix(from[1], to[1], fraction);
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    oval(ctx, cx, cy, 4.4, 4.4, color, '#f4eaff');
    ctx.restore();
  }

  function drawEgoActionMap(ctx, t) {
    drawEgoFloorGrid(ctx);
    drawEgoTrajectory(ctx, [[223, 273], [239, 241], [255, 218], [276, 201], [291, 196]], '#93d9d3', t);
    drawEgoTrajectory(ctx, [[499, 271], [472, 242], [439, 204], [407, 183], [378, 191]], '#c8a6ff', t);
    drawEgoTrajectory(ctx, [[328, 337], [327, 303], [324, 278], [312, 254]], '#8e90b6', t);
    line(ctx, [[89, 226], [163, 226], [216, 248]], '#93d9d373');
    line(ctx, [[517, 169], [477, 169], [430, 194]], '#c8a6ff73');
    line(ctx, [[340, 309], [363, 315], [385, 315]], '#8e90b673');
    label(ctx, 'Left gripper', 87, 214, { color: '#a0ded9', size: 16, weight: 550 });
    label(ctx, 'Right gripper', 550, 157, { color: '#d3baff', size: 16, weight: 550, align: 'right' });
    label(ctx, 'Base motion', 391, 315, { color: '#b1b2d0', size: 16, weight: 550 });
  }

  function drawEgoLink(ctx, from, to, nearWidth, farWidth) {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const length = Math.hypot(dx, dy);
    const normal = [-dy / length, dx / length];
    const edge = (point, width) => [point[0] + normal[0] * width, point[1] + normal[1] * width];
    const top = edge(from, nearWidth);
    const bottom = edge(from, -nearWidth);
    const shading = ctx.createLinearGradient(...top, ...bottom);
    shading.addColorStop(0, '#6b708b');
    shading.addColorStop(1, '#252838');
    shape(ctx, [top, edge(to, farWidth), edge(to, -farWidth), bottom], shading, '#797f9a', 1.2);
    line(ctx, [edge(from, nearWidth * .70), edge(to, farWidth * .70)], '#a8abc35c', 1.2);
  }

  function drawEgoArm(ctx, origin, elbow, wrist, tip, reach, accent) {
    const joint = [wrist[0] + reach[0], wrist[1] + reach[1]];
    const target = [tip[0] + reach[0], tip[1] + reach[1]];
    drawEgoLink(ctx, origin, elbow, 38, 22);
    drawEgoLink(ctx, elbow, joint, 20, 12);
    oval(ctx, ...elbow, 21, 17, '#464b62', '#969ab2');
    oval(ctx, ...elbow, 12, 10, '#292e42', '#666e8b');
    drawEgoLink(ctx, joint, target, 12, 7);
    oval(ctx, ...joint, 10, 8, '#33394e', '#989db6');
    oval(ctx, joint[0] - 2, joint[1] - 2, 2.4, 2.4, accent);
    const direction = Math.atan2(target[1] - joint[1], target[0] - joint[0]);
    ctx.save();
    ctx.translate(...target);
    ctx.rotate(direction);
    for (const side of [-1, 1]) {
      const finger = [[-3, side * 4], [7, side * 10], [14, side * 8], [20, side * 5]];
      line(ctx, finger, '#222637', 8);
      line(ctx, finger, '#9fa5bd', 4.5);
      line(ctx, [[14, side * 8], [20, side * 5]], accent, 1.8);
    }
    ctx.restore();
  }

  function drawEgoForearms(ctx, t) {
    const reach = Math.sin(t * Math.PI / 2);
    drawEgoArm(ctx, [56, 382], [150, 312], [221, 249], [248, 224], [7 * reach, -9 * reach], '#98d7d2');
    drawEgoArm(ctx, [590, 378], [500, 309], [439, 245], [420, 222], [-11 * reach, -13 * reach], '#c6a8ff');
  }

  function drawEgoObjects(ctx, withTable) {
    const shadow = withTable ? '#23242d80' : '#0d101a88';
    oval(ctx, 260, 239, 78, 8, shadow);
    shape(ctx, [[193, 232], [212, 204], [300, 204], [322, 232], [318, 239], [196, 239]], gradient(ctx, 205, 242, '#737789', '#3c4053'), '#9da1b1');
    shape(ctx, [[201, 228], [217, 208], [296, 208], [314, 228]], '#4d5165', '#a7abbd');

    oval(ctx, 395, 224, 29, 6, shadow);
    ctx.beginPath();
    ctx.moveTo(377, 180);
    ctx.lineTo(377, 218);
    ctx.ellipse(395, 218, 18, 5, 0, Math.PI, 0, true);
    ctx.lineTo(413, 180);
    const shading = ctx.createLinearGradient(377, 0, 413, 0);
    shading.addColorStop(0, '#d8a37e');
    shading.addColorStop(1, '#815749');
    ctx.fillStyle = shading;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#e1af90';
    ctx.stroke();
    oval(ctx, 395, 180, 18, 5.5, '#dfb395', '#f5cdad');
  }

  function drawEgoRoom(ctx) {
    shape(ctx, [[0, 229], [155, 148], [476, 148], [640, 231], [640, 360], [0, 360]], gradient(ctx, 145, 349, '#4b4d5c', '#31333f'), '#646778');
    shape(ctx, [[0, 33], [155, 66], [155, 148], [0, 229]], '#343746', '#6d7184');
    shape(ctx, [[155, 66], [476, 66], [476, 148], [155, 148]], gradient(ctx, 65, 148, '#696b79', '#505363'), '#6d7184');
    shape(ctx, [[476, 66], [640, 34], [640, 231], [476, 148]], '#3f4251', '#6d7184');
    shape(ctx, [[26, 84], [122, 96], [122, 137], [26, 174]], '#202634', '#73768c', 1.2);
    line(ctx, [[26, 124], [122, 115]], '#636b83');
    shape(ctx, [[509, 101], [583, 85], [583, 196], [509, 152]], '#333746', '#6f7287');
    shape(ctx, [[236, 88], [369, 88], [369, 135], [236, 135]], '#777a88', '#a0a4b5');
    line(ctx, [[253, 109], [349, 109]], '#a0a4b5');
    line(ctx, [[222, 148], [125, 360]], '#646779');
    line(ctx, [[409, 148], [530, 360]], '#646779');
    shape(ctx, [[106, 291], [534, 291], [534, 306], [106, 306]], '#3f4354', '#7d8295');
    shape(ctx, [[190, 158], [450, 158], [534, 291], [106, 291]], gradient(ctx, 159, 291, '#777885', '#5b5f71'), '#8b8e9f');
  }

  function drawControl(ctx, mode, progress) {
    ctx.save();
    ctx.scale(width / 640, height / 360);
    drawEgoBackdrop(ctx, mode);
    if (mode === 0) {
      drawEgoActionMap(ctx, progress);
    } else {
      if (mode === 3) drawEgoRoom(ctx);
      if (mode >= 2) drawEgoObjects(ctx, mode === 3);
      drawEgoForearms(ctx, progress);
      if (mode === 1) {
        line(ctx, [[144, 220], [154, 254], [165, 277]], '#98d7d27a');
        line(ctx, [[516, 219], [501, 254], [483, 275]], '#c6a8ff7a');
        label(ctx, 'Left forearm', 103, 205, { color: '#a0ded9', size: 16, weight: 550 });
        label(ctx, 'Right forearm', 553, 205, { color: '#d3baff', size: 16, weight: 550, align: 'right' });
      }
      if (mode === 2) {
        line(ctx, [[178, 164], [209, 164], [238, 204]], '#adb2c880');
        line(ctx, [[455, 144], [428, 144], [403, 175]], '#e8ab8b80');
        label(ctx, 'Tray', 146, 164, { color: '#c3c7da', size: 16, weight: 550 });
        label(ctx, 'Target object', 459, 144, { color: '#ebbb9b', size: 16, weight: 550 });
      }
    }
    ctx.restore();

    const titles = ['Action map', 'Robot geometry', 'Arms + objects', 'Full grey-box scene'];
    label(ctx, titles[mode], 17, 20, { color: ink, weight: 650 });
    panel(ctx, 274, 13, 70, 14, 3, '#1b1928cc', '#c6affd40');
    label(ctx, 'HEAD CAMERA', 309, 20, { align: 'center', color: '#dccef9', size: 7.5, weight: 650 });
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

  const storyboardTitles = ['Coding agent', 'Grey-box scene', 'First-person render', 'World model loop'];

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

  function applicationSignal(ctx, destination, accent, travel) {
    const branchLength = Math.abs(destination - 180);
    const direction = Math.sign(destination - 180);

    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 8;
    for (let trail = 4; trail >= 0; trail--) {
      const distance = (travel - trail * .025) * (19 + branchLength);
      if (distance < 0) continue;
      const x = 180 + direction * Math.min(branchLength, Math.max(0, distance - 10));
      const y = 109 + Math.min(distance, 10) + Math.max(0, distance - 10 - branchLength);
      ctx.globalAlpha = (1 - trail * .19) * Math.min(1, travel * 12, (1 - travel) * 20);
      dot(ctx, x, y, 2.1 - trail * .28, accent);
    }
    ctx.restore();
  }

  function policyLoop(ctx, progress) {
    const applications = [
      ['Data synthesis', '#bd9df1'],
      ['Policy evaluation', '#9ad5cf'],
      ['Real-robot trials', '#edbea2'],
    ];

    ctx.save();
    ctx.globalAlpha = .48 + .52 * ease((progress - .3) / .7);
    ctx.setLineDash([3, 4]);
    line(ctx, [[344, 77], [351, 77], [351, 183], [9, 183], [9, 77], [16, 77]], '#a294bd', 1.2);
    ctx.setLineDash([]);
    line(ctx, [[12, 74], [16, 77], [12, 80]], '#a294bd', 1.2);
    label(ctx, 'Policy actions', 180, 173, { align: 'center', color: '#c7bbda', size: 10 });
    ctx.restore();

    line(ctx, [[96, 77], [116, 77]], '#bb9de9', 1.4);
    line(ctx, [[111, 73], [116, 77], [111, 81]], '#bb9de9', 1.4);
    line(ctx, [[244, 77], [264, 77]], '#bb9de9', 1.4);
    line(ctx, [[259, 73], [264, 77], [259, 81]], '#bb9de9', 1.4);
    line(ctx, [[180, 109], [180, 119], [68, 119], [68, 128]], '#78638e', 1.2);
    line(ctx, [[180, 119], [292, 119], [292, 128]], '#78638e', 1.2);
    line(ctx, [[180, 119], [180, 128]], '#78638e', 1.2);

    panel(ctx, 16, 53, 80, 48, 8, '#202132', '#625879');
    label(ctx, 'Grey box', 56, 70, { align: 'center', color: ink, size: 10.5, weight: 650 });
    label(ctx, '+ actions', 56, 85, { align: 'center', size: 9 });
    panel(ctx, 116, 45, 128, 64, 10, gradient(ctx, 45, 109, '#3b2c55', '#292238'), '#bca1ee');
    label(ctx, 'MoraWorld', 180, 69, { align: 'center', color: '#f2e8ff', size: 17, weight: 700 });
    label(ctx, 'Photorealistic rollouts', 180, 89, { align: 'center', color: '#dbc8f3', size: 9.5 });
    panel(ctx, 264, 53, 80, 48, 8, '#202132', '#625879');
    label(ctx, 'Robot policy', 304, 70, { align: 'center', color: ink, size: 10.5, weight: 650 });
    label(ctx, 'Next action', 304, 85, { align: 'center', size: 9 });

    for (const [index, [title, accent]] of applications.entries()) {
      const x = 15 + 112 * index;
      const phase = progress - index * .28;
      const travel = phase / .20;
      const pulse = Math.sin(Math.PI * clamp((phase - .17) / .25));
      if (travel > 0 && travel < 1) applicationSignal(ctx, x + 53, accent, travel);

      panel(ctx, x, 128, 106, 25, 8, '#252237', accent);
      if (pulse > .001) {
        ctx.save();
        ctx.globalAlpha = pulse * .65;
        ctx.shadowColor = accent;
        ctx.shadowBlur = 12;
        panel(ctx, x, 128, 106, 25, 8, accent + '55', '#f5edff');
        ctx.restore();
      }
      label(ctx, title, x + 53, 140.5, { align: 'center', color: ink, size: 10.5, weight: 650 });
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
    if (stage === 3) policyLoop(ctx, progress);
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
      times: [2250, 1450, 1550, 2200],
      finalStageHold: 0,
      playFromFinalSelection: true,
      draw: drawRobots,
    },
  };

  document.querySelectorAll('[data-overview-diagram]').forEach((root) => {
    const { times, draw, finalStageHold = 1000, playFromFinalSelection } = diagrams[root.dataset.overviewDiagram];
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
        cancel();
        elapsed = 0;
        play = playFromFinalSelection && index === lastStage && !reducedMotion.matches;
        select(index);
        paint(play ? 0 : 1, !play);
        start();
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
