(() => {
  'use strict';
  const root = document.querySelector('[data-h3-method]');
  if (!root) return;
  const one = selector => root.querySelector(selector);
  const all = selector => [...root.querySelectorAll(selector)];
  const data = JSON.parse(one('#h3-episode-data').textContent);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const range = one('[data-scrub]');
  const levels = all('[data-level]'), keys = all('[data-key]');
  const clayChunks = data.retrieval.length - 1;
  const frameSheets = ['reference','prediction','anchor'].map(name => all('[data-views="'+name+'"] canvas'));
  const flowViews = all('.mw-flow-views canvas'), reads = all('.mw-read-picks button');
  const video = one('[data-media]');
  const poster = one('[data-poster]');
  const lastFrame = data.count + 17 * data.retrieval.length - 1;
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const text = (sel, str) => {const el=one(sel); if(el.textContent!==str) el.textContent=str;};
  const pressed = (el,yes) => el.setAttribute('aria-pressed',String(yes));
  const svgNS='http://www.w3.org/2000/svg';
  function svg(tag,attrs={}) {
    const el=document.createElementNS(svgNS,tag);
    for(const [k,v] of Object.entries(attrs)) el.setAttribute(k,v);
    return el;
  }
  let pinned=null, lastN=-1, lastF=-1, lastLevel=-1, lastChunk=-1;
  let visible=false,wantsPlay=!reduce.matches,raf=0,ticket=0,pending=null,packets=[];
  function resizeCanvases() {
    for(const el of [...frameSheets.flat(), ...flowViews]) {
      const rect=el.getBoundingClientRect();
      if(rect.width<1||rect.height<1) continue;
      const density=Math.min(2,window.devicePixelRatio||1);
      const w=Math.round(rect.width*density),h=Math.round(rect.height*density);
      if(el.width!==w||el.height!==h){el.width=w;el.height=h;}
    }
  }
  // Rectangles in the verified, time-aligned camera sheets, in head / left / right order.
  function rectangle(kind,level,v=0) {
    const row=kind==='reference'?(level?level-1:4):3;
    if(row===4)return [0,row*288,512,288];
    if(v===0)return [0,row*288,320,288];
    return [320,row*288+(v-1)*144,192,144];
  }
  const ctx = canvas => canvas.getContext('2d');
  function picture(canvas,source,rect) {
    const g=ctx(canvas),w=canvas.width,h=canvas.height;
    const [sx,sy,sw,sh]=rect,scale=Math.min(w/sw,h/sh),dw=sw*scale,dh=sh*scale;
    g.fillStyle='#101115';g.fillRect(0,0,w,h);
    g.drawImage(source,sx,sy,sw,sh,(w-dw)/2,(h-dh)/2,dw,dh);
  }
  // Independent, seeded Gaussian fields for each camera. A field is held during each refinement.
  const grainCache=new Map();
  function grain(seed) {
    if(grainCache.has(seed))return grainCache.get(seed);
    const c=document.createElement('canvas');c.width=420;c.height=236;
    const g=ctx(c),im=g.createImageData(c.width,c.height),a=im.data;
    let s=17381+seed*9173;
    const uniform=()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)+1)/4294967297;
    for(let p=0;p<a.length;p+=8) {
      const rad=Math.sqrt(-2*Math.log(uniform()))*52,ang=2*Math.PI*uniform();
      a[p]=a[p+1]=a[p+2]=128+rad*Math.cos(ang);a[p+3]=255;
      a[p+4]=a[p+5]=a[p+6]=128+rad*Math.sin(ang);a[p+7]=255;
    }
    g.putImageData(im,0,0);if(grainCache.size>7)grainCache.clear();grainCache.set(seed,c);return c;
  }
  function overlay(canvas,seed,opacity) {
    if(opacity<=0)return;
    const g=ctx(canvas);g.save();g.globalAlpha=opacity;g.imageSmoothingEnabled=false;
    g.drawImage(grain(seed),0,0,canvas.width,canvas.height);g.restore();
  }
  const act=one('[data-action-chart]'),cam=one('[data-cam-chart]');
  function path(parent,color,width,attrs={}) {
    const p=svg('path',{stroke:color,'stroke-width':width,fill:'none','stroke-linejoin':'round','stroke-linecap':'round',...attrs});parent.append(p);return p;
  }
  function lineD(points) {return 'M'+points.map(pt=>pt.map(v=>v.toFixed(1)).join(',')).join(' L');}
  function dot(parent,color,r) {const el=svg('circle',{r,fill:color});parent.append(el);return el;}
  function locate(el,[x,y]){el.setAttribute('cx',x);el.setAttribute('cy',y);}
  const colors=['#ffa25d','#ffce88','#dc8382'],rigColors=['#c7d9e9','#7cdee0','#8daff7'];
  for(const y of [9,28,47,66])path(act,'#45414a',.7,{d:'M3 '+y+'H297','stroke-dasharray':'2 5'});
  const traces=colors.map(c=>path(act,c,2.2)),markers=colors.map(c=>dot(act,c,2.8));
  const grip=path(act,'#c4b4d8',1.8),gripDot=dot(act,'#c4b4d8',2.4);
  const cursor=path(act,'#ede0d1',.85,{'stroke-opacity':.75});
  const cellWidth=300/data.rig.length;
  const rigLines=data.rig.map((_,j)=>{
    const color=rigColors[j];
    if(j)path(cam,'#37353f',.8,{d:'M'+cellWidth*j+' 5v72'});
    return {trail:path(cam,color,2.2),origin:dot(cam,color,1.8),
      cone:path(cam,color,1.5,{'fill':color,'fill-opacity':.22}),tip:dot(cam,color,2.6)};
  });
  let signalChunk;
  function prepareSignalChunk(start){
    const samples=data.signals.slice(start,start+17);
    const deltas=samples.map(p=>p.slice(0,3).map((value,j)=>value-samples[0][j]));
    const low=Math.min(...deltas.flat()),high=Math.max(...deltas.flat());
    const span=Math.max(.1,high-low),mid=(low+high)/2;
    const x=i=>6+288*i/Math.max(1,samples.length-1);
    const axes=colors.map((_,axis)=>deltas.map((p,i)=>[x(i),28-46*(p[axis]-mid)/span]));
    const gripper=samples.map((p,i)=>[x(i),68-12*p[3]]);
    const digits=span<1?2:span<10?1:0;
    const tick=v=>String(Number(v.toFixed(digits)));
    text('[data-action-scale]',tick(mid-span/2)+'…'+tick(mid+span/2)+' mm');

    // A common magnification preserves relative motion across the three camera insets.
    const poses=data.rig.map(series=>series.slice(start,start+samples.length));
    const bounds=poses.map(series=>[0,1].map(axis=>{
      const coords=series.map(p=>p[axis]);
      return [Math.min(...coords),Math.max(...coords)];
    }));
    const extent=axis=>Math.max(1,...bounds.map(b=>b[axis][1]-b[axis][0]));
    const zoom=Math.min((cellWidth-26)/extent(0),56/extent(1));
    const cameras=poses.map((series,j)=>{
      const [bx,by]=bounds[j],cx=(bx[0]+bx[1])/2,cy=(by[0]+by[1])/2;
      const points=series.map(([x,y])=>[cellWidth*(j+.5)+(x-cx)*zoom,41+(y-cy)*zoom]);
      locate(rigLines[j].origin,points[0]);
      return {series,points};
    });
    signalChunk={start,axes,gripper,cameras};
  }
  function updateSignals(frame){
    const {start,axes,gripper,cameras}=signalChunk;
    const i=frame-start;
    axes.forEach((points,j)=>{
      traces[j].setAttribute('d',lineD(points.slice(0,i+1)));
      locate(markers[j],points[i]);
    });
    grip.setAttribute('d',lineD(gripper.slice(0,i+1)));
    locate(gripDot,gripper[i]);
    cursor.setAttribute('d','M'+gripper[i][0]+' 2V71');
    cameras.forEach(({series,points},j)=>{
      const set=rigLines[j],pos=points[i],[x,y,lx,ly,rx,ry]=series[i];
      set.trail.setAttribute('d',lineD(points.slice(0,i+1)));
      const length=Math.max(.01,Math.hypot(lx-x,ly-y),Math.hypot(rx-x,ry-y));
      const tip=(tx,ty)=>[pos[0]+11*(tx-x)/length,pos[1]+11*(ty-y)/length];
      set.cone.setAttribute('d',lineD([pos,tip(lx,ly),tip(rx,ry),pos])+'Z');
      locate(set.tip,pos);
    });
  }
  function clock(n) {
    const chunk=Math.floor(n/34),tick=Math.floor(n)%34;
    const length=Math.min(17,data.count-17*chunk);
    const f=17*chunk+clamp(tick-13,0,length-1);
    const phase=tick<1?0:tick<13?1:tick>=13+length?3:2;
    const t=clamp((n%34-1)/12,0,1);
    return {chunk,f,phase,amount:t*t*(3-2*t)};
  }
  function setLevel(level) {
    lastLevel=level;root.dataset.level=level;
    levels.forEach((el,i)=>pressed(el,i===level));
    for(const panel of all('[data-views="reference"], [data-views="prediction"], .mw-flow-views, .mw-triplet-reads')){
      panel.dataset.single=String(level===0);
    }
    text('[data-ref-views]',level?'Head + both wrists':'Head only');
    text('[data-output-label]',level?'Three-view ground truth':'Head-view ground truth');
    text('[data-ref-tokens]',level?'Sparse visual reference tokens':'End-effector map');
    if (one('[data-encoding]')) text('[data-encoding]',level?'White-clay reference frames are encoded on a sparse time grid.':'The spatial end-effector map encodes the grippers’ position and orientation.');
    resizeCanvases();
  }
  function selectRead(rank) {
    const hit=data.retrieval[lastChunk][rank];
    const tile=data.tiles.indexOf(hit.f);
    root.dataset.readFrame=hit.f;
    reads.forEach((button,i)=>pressed(button,i===rank));
    all('.mw-bank-scale i').forEach((mark,i)=>mark.classList.toggle('selected',i===rank));
    const columns=8,rows=3*Math.ceil(data.tiles.length/columns);
    all('.mw-triplet-reads i').forEach((el,j)=>{
      el.style.backgroundSize=(columns*100)+'% '+(rows*100)+'%';
      el.style.backgroundPosition=((tile%columns)*100/(columns-1))+'% '+((Math.floor(tile/columns)*3+j)*100/(rows-1))+'%';
    });
    text('[data-read-label]','Clip frame '+hit.f+' · '+(hit.f/data.fps).toFixed(2)+' s');
    text('[data-mem-note]',hit.o.toFixed(1)+'% mean head-camera frustum overlap.');
  }
  function setChunk(chunk) {
    lastChunk=chunk;root.dataset.chunk=chunk;
    prepareSignalChunk(chunk*17);
    const selected=data.retrieval[chunk],hasReads=selected.length>0;
    root.dataset.reads=String(hasReads);
    text('[data-context]',hasReads?'History + reads':'History');
    const start=chunk*17,end=Math.min(start+17,data.count);
    text('[data-bounds]',(start/data.fps).toFixed(2)+' – '+(end/data.fps).toFixed(2)+' s');
    const span=Math.max(1,start);
    one('[data-bank-recent]').style.width=(100*Math.min(1,68/span))+'%';
    all('.mw-bank-scale i').forEach((marker,i)=>{
      const hit=selected[i];marker.hidden=!hit;
      if(hit)marker.style.left=(100*clamp(hit.f/span,0,1))+'%';
    });
    one('.mw-triplet-reads').hidden=!hasReads;
    one('.mw-read-picks').hidden=!hasReads;
    one('.mw-memport').classList.toggle('has-reads',hasReads);
    reads.forEach((el,i)=>{
      const hit=selected[i];el.hidden=!hit;
      if(!hit)return;
      const time=(hit.f/data.fps).toFixed(2)+' s';
      el.textContent=time;el.setAttribute('aria-label','Memory read '+(i+1)+', clip frame '+hit.f+', '+time);
    });
    if(hasReads)selectRead(0);
    else{
      delete root.dataset.readFrame;
      text('[data-read-label]','Recent context');
      text('[data-mem-note]','Earlier chunks become eligible after they leave the 68-frame recent context. The initial anchor stays separate.');
    }
    [...one('.mw-track').children].forEach((el,i)=>{
      el.classList.toggle('on',i===chunk);el.classList.toggle('past',i<chunk);
      el.classList.toggle('read',selected.some(hit=>Math.floor(hit.f/17)===i));
    });
  }
  reads.forEach((el,i)=>el.addEventListener('click',()=>{
    wantsPlay=false;sync();selectRead(i);
  }));
  function flow(n) {
    packets.forEach((p,i)=>p.setAttribute('stroke-dashoffset',String(-(n*5+13*i)%100)));
    one('.mw-arc').style.strokeDashoffset=String(-n%56);
  }
  function render(playhead,source,force=false) {
    const n=Math.floor(playhead);
    const {chunk,f,phase,amount}=clock(playhead);
    // Share the opening chunks across the clay levels and end with one Action Map chunk.
    const autoLevel = chunk === clayChunks ? 0 : 1 + Math.floor(chunk * (levels.length - 1) / clayChunks);
    const level = pinned ?? autoLevel;
    const viewCount=level===0?1:3;
    if(chunk!==lastChunk)setChunk(chunk);
    if(level!==lastLevel)setLevel(level);
    if(source&&(n!==lastN||force||phase===1)){
      flowViews.slice(0,viewCount).forEach((canvas,i)=>{
        picture(canvas,source,rectangle('prediction',level,i));
        overlay(canvas,chunk*3+i,1-amount);
      });
    }
    if(n===lastN&&!force)return;
    lastN=n;root.dataset.frame=n;
    // During the sampling hold the atlas repeats one source frame in all three cameras.
    const rate = phase < 2 ? 0.25 : 1.45;
    if(source===video&&video.playbackRate!==rate)video.playbackRate=rate;
    if(f!==lastF||force){
      lastF=f;root.dataset.sourceFrame=f;updateSignals(f);
      let nearest=0;data.keyframes.forEach((k,i)=>{if(Math.abs(k-f)<Math.abs(data.keyframes[nearest]-f))nearest=i;});
      keys.forEach((el,i)=>el.classList.toggle('active',i===nearest));
      text('[data-time]',(f/data.fps).toFixed(2)+' s');
    }
    text('[data-number]',String(chunk+1).padStart(2,'0')+' / '+data.retrieval.length+' · '+['Noise','Refine','RGB','Append'][phase]);
    root.dataset.phase=phase;
    range.value=n;range.setAttribute('aria-valuetext',(f/data.fps).toFixed(2)+' seconds, chunk '+(chunk+1)+', '+['Gaussian noise','refining','decoded','appended'][phase]);
    flow(n);
    if(!source)return;
    frameSheets[0].slice(0,viewCount).forEach((c,i)=>picture(c,source,rectangle('reference',level,i)));
    frameSheets[1].slice(0,viewCount).forEach((c,i)=>picture(c,source,rectangle('prediction',level,i)));
    if(poster.complete&&poster.naturalWidth)frameSheets[2].forEach((c,i)=>picture(c,poster,rectangle('anchor',level,i)));
    levels.forEach((el,i)=>picture(el.querySelector('canvas'),source,rectangle('reference',i)));
  }

  function button(on) {
    root.dataset.running=String(on);const b=one('[data-toggle]');
    b.querySelector('b').textContent=on?'Ⅱ':'▶';b.querySelector('span').textContent=on?'Pause':'Play';
    b.setAttribute('aria-label',on?'Pause animation':'Play animation');
  }
  function actualFrame(){return clamp(video.currentTime*data.fps+.0001,0,lastFrame);}
  function paint() {
    if(video.readyState>=2&&!video.seeking&&pending===null)render(actualFrame(),video,true);
    else if(poster.complete&&poster.naturalWidth&&lastN<0)render(0,poster,true);
  }
  function animate(){
    raf=0;if(video.paused||!visible||document.hidden)return;
    if(!video.seeking&&pending===null&&video.readyState>=2)render(actualFrame(),video);
    raf=requestAnimationFrame(animate);
  }
  function load() {
    if(!video.hasAttribute('src')||video.error){video.src=video.dataset.src;video.load();}
  }
  function sync() {
    const id=++ticket;cancelAnimationFrame(raf);raf=0;
    if(!visible||document.hidden||!wantsPlay){video.pause();button(false);return;}
    load();
    video.play().then(()=>{if(id===ticket&&!video.paused){button(true);if(!raf)animate();}}).catch(()=>{if(id===ticket){wantsPlay=false;button(false);}});
  }
  function seek(n,pause=true) {
    n=clamp(n,0,lastFrame);if(pause){wantsPlay=false;sync();}
    load();
    if(video.readyState>=1){pending=null;video.currentTime=(n+.1)/data.fps;}else pending=n;
  }
  function initializeEpisode() {
    keys.forEach((el,i)=>{
      const label=(data.keyframes[i]/data.fps).toFixed(1)+' s';
      el.querySelector('small').textContent=label+' · '+data.displacementCm[i]+' cm';
      el.setAttribute('aria-label','Jump to '+label);
      el.style.setProperty('--kx',i*25+'%');
    });
    const track=one('.mw-track');
    for(let i=0;i<data.retrieval.length;i++)track.append(document.createElement('i'));
    range.max=lastFrame;
    render(0,poster.complete&&poster.naturalWidth?poster:null,true);
    sync();wire();
  }
  video.addEventListener('loadedmetadata',()=>{
    if(pending!==null){const n=pending;pending=null;video.currentTime=(n+.1)/data.fps;}
  });
  for(const event of ['loadeddata','seeked'])video.addEventListener(event,paint);
  video.addEventListener('error',()=>{
    wantsPlay=false;sync();text('[data-output-label]','Video unavailable');
  });
  poster.addEventListener('load',()=>{
    if(video.readyState>=2)paint();else render(0,poster,true);
  });
  levels.forEach((el,i)=>el.addEventListener('click',()=>{pinned=i;pressed(one('[data-auto]'),false);paintSelection();}));
  function paintSelection(){
    if(video.readyState>=2&&!video.seeking)render(actualFrame(),video,true);
    else if(poster.complete&&poster.naturalWidth)render(0,poster,true);
  }
  one('[data-auto]').addEventListener('click',()=>{pinned=pinned===null?lastLevel:null;pressed(one('[data-auto]'),pinned===null);paintSelection();});
  keys.forEach((el,i)=>el.addEventListener('click',()=>{const f=data.keyframes[i];seek(Math.floor(f/17)*34+13+f%17,false);sync();}));
  range.addEventListener('input',()=>seek(+range.value));
  one('[data-toggle]').addEventListener('click',()=>{wantsPlay=video.paused;sync();});
  const linkSvg=one('.h3-links'),main=one('.h3-main'),core=one('.h3-core');
  function wire(){
    if(!linkSvg.clientWidth)return;
    const base=main.getBoundingClientRect(),box=el=>el.getBoundingClientRect();
    const side=(el,sideName)=>{const r=box(el);return [r[sideName]-base.left,(r.top+r.bottom)/2-base.top];};
    linkSvg.setAttribute('viewBox','0 0 '+base.width+' '+base.height);linkSvg.replaceChildren();packets=[];
    function add(d,color,memory=false){
      const attrs={d,stroke:color,fill:'none',class:memory?'mw-memory-wire':''};
      linkSvg.append(svg('path',{...attrs,'stroke-width':1.1,opacity:.53}));
      const packet=svg('path',{...attrs,'stroke-width':2.4,'pathLength':100,'stroke-dasharray':'9 91',class:memory?'mw-packet mw-memory-wire':'mw-packet'});linkSvg.append(packet);packets.push(packet);
    }
    if(matchMedia('(max-width:720px)').matches){
      const rect=box(core),y=rect.top-base.top,mid=rect.left-base.left+rect.width/2,from=box(one('.h3-input')).bottom-base.top,to=box(one('.h3-output')).top-base.top,cEnd=box(one('.mw-backbone-column')).bottom-base.top+1;
      add('M'+mid+' '+from+'V'+y,'#9fd8be');add('M'+mid+' '+cEnd+'V'+to,'#c9a9e7');
    } else {
      const routes=[['ref','#9ed8bd'],['anchor','#c4aadc'],['act','#e3a478'],['cam','#86bde1']].map(([r,c])=>[side(one('[data-port="'+r+'"]'),'right'),[box(core).left-base.left,side(one('[data-in="'+r+'"]'),'left')[1]],c]);
      const actionRoute=routes[2];
      if(Math.abs(actionRoute[0][0]-box(one('.h3-input')).right+base.left)>3)actionRoute[0][0]=box(one('.h3-input')).right-base.left;
      routes.push([[box(core).right-base.left+7,side(one('[data-port="denoise"]'),'right')[1]],side(one('[data-port="out"]'),'left'),'#c9a9e7']);
      for(const [[x,y],[ex,ey],c] of routes){
        add('M'+x+' '+y+' C'+(x+.52*(ex-x))+' '+y+' '+(ex-.52*(ex-x))+' '+ey+' '+ex+' '+ey,c);
        linkSvg.append(svg('circle',{cx:ex,cy:ey,r:2,fill:c}));
      }
      {
        const [x,y]=side(one('[data-port="memory"]'),'left'),ex=box(core).right-base.left+7,ey=side(one('.mw-memport'),'right')[1];
        add('M'+x+' '+y+' C'+(x-(x-ex)*.55)+' '+y+' '+(ex+(x-ex)*.55)+' '+ey+' '+ex+' '+ey,'#e1ba79',true);
        linkSvg.append(svg('circle',{cx:ex,cy:ey,r:2,fill:'#e1ba79',class:'mw-memory-wire'}));
      }
    }
    flow(Math.max(0,lastN));
  }
  const observer=new ResizeObserver(()=>{resizeCanvases();paint();wire();});
  [main,core,...all('.mw-panel')].forEach(el=>observer.observe(el));
  initializeEpisode();button(false);
  new IntersectionObserver(([entry])=>{
    visible=entry.isIntersecting;
    if(visible){load();if(video.readyState>=1&&pending!==null)seek(pending,false);}
    sync();
  },{threshold:.01}).observe(root);
  document.addEventListener('visibilitychange',sync);
  reduce.addEventListener('change',e=>{if(e.matches){wantsPlay=false;sync();}});
  document.fonts?.ready.then(()=>{resizeCanvases();paint();wire();});
})();
