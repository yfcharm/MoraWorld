/* Recorded poses are expressed in the first optical camera frame (x right, y down, z forward). */
(() => {
  const config = JSON.parse(document.getElementById('mg-data').textContent).spatial;
  let source;
  function tracks() {
    if (!source) {
      source = Promise.all([config.poses, config.landmarks].map(async url => {
        const res = await fetch(url);
        if (!res.ok) throw Error('Could not load motion data.');
        return res.json();
      })).catch(error => { source = null; throw error; });
    }
    return source;
  }
  const width = 320, height = 197;
  const teal = '#68edd5', coral = '#ffac80', iris = '#c1b0ff';
  const add = (a,b,k=1) => a.map((x,i)=>x+k*b[i]);
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const dot = (a,b) => a.reduce((sum,x,i)=>sum+x*b[i],0);
  const range = (n,step) => Array.from({length:Math.floor((n-1)/step)+1},(_,i)=>i*step);
  const pos = (row,o=0)=>row.slice(o,o+3);
  const label = (cls,copy) => Object.assign(document.createElement('span'),{className:cls,textContent:copy});

  class MotionStage extends HTMLElement {
    bind(item, video, {detail=false, mode='space'}={}) {
      this.item=item;
      this.video=video;
      this.detail=detail;
      this.mode=mode;
      this.frame=null;
      this.az=.50; this.el=.37;
      this.setAttribute('aria-label',item.group==='nav'?'Camera motion in 3D':'Left and right grippers and camera motion in 3D');
      this.className=detail?'mg-space mg-space-large':'mg-space';
      if (!detail) this.setAttribute('aria-hidden','true');
      this.heading=label('mg-space-heading',item.group==='nav'?'Camera / 3D':'Action / 3D');
      this.canvas=document.createElement('canvas');
      this.canvas.width=width*(detail?2:1); this.canvas.height=height*(detail?2:1);
      this.ctx=this.canvas.getContext('2d');
      this.ctx.scale(detail?2:1,detail?2:1);
      this.back=document.createElement('canvas');
      this.back.width=this.canvas.width; this.back.height=this.canvas.height;
      this.legend=label('mg-space-key','');
      const keys=item.group==='nav'?[[iris,'Camera']]:[[teal,'L'],[coral,'R'],[iris,'Cam']];
      for(const [col,text] of keys) {
        const key=label('',text);
        key.style.setProperty('--key',col);
        this.legend.append(key);
      }
      this.map=document.createElement('img'); this.map.alt=''; this.map.className='mg-map-poster'; this.map.hidden=true;
      this.append(this.heading,this.canvas,this.map,this.legend);
      if (detail && item.group !== 'nav') {
        this.aperture=label('mg-aperture','');
        this.aperture.append(label('mg-aperture-label','Gripper opening'));
        this.meters=[['L',teal],['R',coral]].map(([side,color])=>{
          const channel=label('mg-aperture-channel','');
          const bar=document.createElement('progress');
          bar.max=1;
          bar.setAttribute('aria-label',side==='L'?'Left gripper opening':'Right gripper opening');
          bar.style.setProperty('--tone',color);
          const number=label('mg-aperture-value','');
          channel.append(label('',side),bar,number);
          this.aperture.append(channel);
          return {bar,number};
        });
        this.append(this.aperture);
      }
      this.t=item.posterTime;
      this.hasVideoFrame=false;
      this.videoEvents=new AbortController();
      const sync=()=>{
        if(video.readyState>=2) {this.hasVideoFrame=true; this.update(video.currentTime);}
      };
      for (const e of ['loadeddata','timeupdate','seeked','pause','ended','playing']) video.addEventListener(e,sync,{signal:this.videoEvents.signal});
      this.tick=()=>{
        this.frame=null;
        if(!this.isConnected || video.paused || video.ended || this.mode==='off') return;
        sync();
        this.frame=requestAnimationFrame(this.tick);
      };
      video.addEventListener('playing',()=>{if(this.frame===null)this.frame=requestAnimationFrame(this.tick);},{signal:this.videoEvents.signal});
      if(detail)this.enableOrbit();
      this.setMode(mode);
      return this;
    }
    connectedCallback() {
      if (!this.item) return;
      tracks().then(([all,clouds])=>{
        if(!this.isConnected)return;
        this.track=all[this.item.id]; this.rows=this.track.samples;
        this.cloud=clouds[this.item.id]; this.hands=this.rows[0].length===29;
        const pair=this.item.id.startsWith('sekai2-035');
        this.peer=pair?all[this.item.id.endsWith('forward')?'sekai2-035-reverse':'sekai2-035-forward'].samples:null;
        this.paths=[0,...(this.hands?[9,19]:[])].map(offset=>range(this.rows.length,Math.max(1,Math.floor(this.rows.length/100))).map(i=>pos(this.rows[i],offset)));
        const points=this.paths.flat();
        if(this.peer)points.push(...this.peer.map(row=>pos(row)));
        const lo=[0,1,2].map(j=>Math.min(...points.map(p=>p[j])));
        const hi=[0,1,2].map(j=>Math.max(...points.map(p=>p[j])));
        this.center=lo.map((v,i)=>(v+hi[i])/2);
        this.span=Math.max(this.hands?.72:1,...hi.map((v,i)=>v-lo[i]));
        this.base=hi[1]+this.span*.15;
        this.background();
        this.setMode(this.mode);
      }).catch(()=>{if(this.isConnected)this.heading.textContent='Motion data unavailable';});
    }
    disconnectedCallback() {
      this.videoEvents?.abort();
      if(this.frame!==null) cancelAnimationFrame(this.frame);
      if(this.mapVideo){this.mapVideo.pause();this.mapVideo.removeAttribute('src');this.mapVideo.load();}
    }
    setMode(mode) {
      this.mode=mode;
      this.hidden=mode==='off';
      const isMap=mode==='map';
      this.classList.toggle('mg-is-map',isMap);
      this.canvas.hidden=isMap;
      this.legend.hidden=isMap;
      this.map.hidden=!isMap;
      this.heading.textContent=isMap?'Input action map':(this.item.group==='nav'?'Camera / 3D':'Action / 3D');
      if(this.detail && this.cloud && !isMap) {
        if(this.cloud.kind==='rays')this.heading.textContent+=' · panoramic rays';
        else if(this.cloud.points.length)this.heading.textContent+=' · RGB landmarks';
      }
      if(this.track?.actionMap && isMap) {
        this.map.src=this.track.actionPoster;
        if(!this.mapVideo){
          const v=document.createElement('video');
          v.muted=true; v.playsInline=true; v.preload='auto'; v.className='mg-map-film';
          v.setAttribute('aria-label','Recorded input action map');
          v.poster=this.track.actionPoster;
          v.src=this.track.actionMap;
          v.onloadeddata=()=>this.update(this.t,true);
          this.insertBefore(v,this.legend); this.mapVideo=v;
        }
      }
      if(this.mapVideo) {
        this.mapVideo.hidden=!isMap||!this.hasVideoFrame;
        if(!isMap)this.mapVideo.pause();
      }
      if(this.rows)this.update(this.t,true);
      if(!this.video.paused && mode!=='off' && this.frame===null)this.frame=requestAnimationFrame(this.tick);
    }
    enableOrbit() {
      const c=this.canvas; c.tabIndex=0; c.setAttribute('role','group');
      c.setAttribute('aria-label','Orbit recorded motion. Drag or use arrow keys. Home resets the view.');
      let last=null;
      const turn=(dx,dy)=>{
        this.az+=dx; this.el=Math.max(-.9,Math.min(1.25,this.el+dy));
        if(this.rows){this.background();this.update(this.t,true);}
      };
      c.onpointerdown=e=>{last=[e.clientX,e.clientY];c.setPointerCapture(e.pointerId);};
      c.onpointermove=e=>{if(!last)return;turn((e.clientX-last[0])*.012,(e.clientY-last[1])*.008);last=[e.clientX,e.clientY];};
      c.onlostpointercapture=()=>{last=null;};
      c.onkeydown=e=>{
        const keys={'ArrowLeft':[-.15,0],'ArrowRight':[.15,0],'ArrowUp':[0,.12],'ArrowDown':[0,-.12],Home:[.5-this.az,.37-this.el]};
        if(keys[e.key]){e.preventDefault();turn(...keys[e.key]);}
      };
    }
    project(p) {
      const d=p.map((v,i)=>v-this.center[i]);
      const u=d[0]*Math.cos(this.az)-d[2]*Math.sin(this.az);
      const z=d[0]*Math.sin(this.az)+d[2]*Math.cos(this.az);
      const v=d[1]*Math.cos(this.el)-z*Math.sin(this.el);
      return [width*.5+u*this.scale,height*.49+v*this.scale];
    }
    stroke(ctx,pts,color,weight=1,close=false,fill=null) {
      if(pts.length<2)return;
      ctx.beginPath();
      pts.forEach((p,i)=>{const [x,y]=this.project(p); if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);});
      if(close)ctx.closePath();
      if(fill){ctx.fillStyle=fill;ctx.fill();}
      ctx.lineWidth=weight;ctx.strokeStyle=color;ctx.stroke();
    }
    camera(ctx,row,size,col,active) {
      const at=pos(row), ax=pos(row,3), ay=pos(row,6), az=cross(ax,ay);
      const face=add(at,az,size);
      const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>add(add(face,ax,x*size*.75),ay,y*size*.45));
      this.stroke(ctx,corners,col,active?1.9:1,true,active?'#b8a6ff33':null);
      for(const p of corners)this.stroke(ctx,[at,p],col,active?1.4:.65);
      if(active)this.marker(ctx,at,col,2.4);
    }
    marker(ctx,p,col,r) {
      const [x,y]=this.project(p);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
    }
    background() {
      const ctx=this.back.getContext('2d'), factor=this.detail?2:1;
      ctx.setTransform(factor,0,0,factor,0,0);
      ctx.clearRect(0,0,width,height);
      const g=ctx.createLinearGradient(0,0,0,height);g.addColorStop(0,'#111d2b');g.addColorStop(1,'#0a111b');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
      const points=this.paths.flat();
      if(this.peer)points.push(...this.peer.map(r=>pos(r)));
      this.scale=1;
      const proj=points.map(p=>this.project(p));
      const dx=Math.max(this.span*.39,...proj.map(p=>Math.abs(p[0]-width*.5)));
      const dy=Math.max(this.span*.26,...proj.map(p=>Math.abs(p[1]-height*.49)));
      this.scale=Math.min(width*.39/dx,height*.37/dy);
      const ctr=this.center, step=this.span*.16, span=step*9;
      for(let i=-9;i<=9;i++){
        const col=i===0?'#49677988':'#4866804a';
        this.stroke(ctx,[[ctr[0]+i*step,this.base,ctr[2]-span],[ctr[0]+i*step,this.base,ctr[2]+span]],col,.7);
        this.stroke(ctx,[[ctr[0]-span,this.base,ctr[2]+i*step],[ctr[0]+span,this.base,ctr[2]+i*step]],col,.7);
      }
      const rays=this.cloud.kind==='rays';
      for(const p of this.cloud.points){
        const xyz=rays?p.slice(0,3).map(v=>v*.62):p.slice(0,3);
        const [x,y]=this.project(xyz);
        if(x<0||x>width||y<0||y>height)continue;
        ctx.fillStyle='rgba('+p.slice(3).join(',')+','+(rays?.57:.70)+')';ctx.fillRect(x,y,1.55,1.55);
      }
      if(this.peer)this.stroke(ctx,this.peer.filter((_,i)=>i%4===0).map(r=>pos(r)),'#fff4',1.4);
      this.paths.forEach((path,i)=>this.stroke(ctx,path,[iris+'86',teal+'79',coral+'79'][i],1.2));
      if(!this.hands)for(const i of range(this.rows.length,Math.max(1,Math.floor(this.rows.length/6))))this.camera(ctx,this.rows[i],this.span*.14,'#ae9bd476',false);
    }
    gripper(ctx,row,o,color) {
      // These recordings store local +X toward the fingertips and Y across the jaws.
      // Both hands use their own recorded right-handed frame.
      const p=pos(row,o), forward=pos(row,o+3), opening=pos(row,o+6);
      const normal=cross(forward,opening);
      const s=Math.max(.085,this.span*.104);
      const gap=.16+Math.max(0,Math.min(1,row[o+9]))*.29;
      const point=(across,thickness,reach)=>
        add(add(add(p,opening,across*s),normal,thickness*s),forward,reach*s);
      const faces=[];
      function box(cx,cy,cz,w,h,d) {
        const verts=[];
        for(const dz of [-1,1])for(const dy of [-1,1])for(const dx of [-1,1])verts.push(point(cx+dx*w/2,cy+dy*h/2,cz+dz*d/2));
        const sides=[[0,1,3,2],[4,5,7,6],[0,2,6,4],[1,3,7,5],[0,1,5,4],[2,3,7,6]];
        const shades=color===teal?['#387e80','#a9f3e8','#326c74','#56aea6','#74dfcd','#458d91']:['#9b6258','#ffddaf','#966258','#d4886e','#ffb88c','#bb7666'];
        sides.forEach((ids,i)=>faces.push({pts:ids.map(j=>verts[j]),fill:shades[i]}));
      }
      box(0,0,-.25,gap*2+.35,.38,.55);
      for(const side of [-1,1])box(side*(gap+.025),0,.48,.16,.24,.90);
      const eye=[-Math.sin(this.az)*Math.cos(this.el),-Math.sin(this.el),-Math.cos(this.az)*Math.cos(this.el)];
      const depth=f=>f.pts.reduce((v,p)=>v+dot(p,eye),0);
      faces.sort((a,b)=>depth(a)-depth(b));
      for(const f of faces)this.stroke(ctx,f.pts,color,.62,true,f.fill);
      this.marker(ctx,p,'#f3fbff',1.45);
    }
    update(t,force=false) {
      this.t=t;
      if(!this.rows||this.mode==='off')return;
      const i=Math.min(this.rows.length-1,Math.max(0,Math.floor(t*this.track.fps+1e-5)));
      if(this.meters && (i!==this.meterFrame || force)){
        this.meterFrame=i;
        this.meters.forEach(({bar,number},j)=>{
          const value=Math.max(0,Math.min(1,this.rows[i][j===0?18:28]));
          bar.value=value; number.textContent=Math.round(value*100)+'%';
        });
      }
      if(this.mode==='map'){
        const v=this.mapVideo;
        if(!v)return;
        v.hidden=!this.hasVideoFrame;
        this.map.hidden=this.hasVideoFrame;
        if(v.readyState>=1 && this.hasVideoFrame){
          const target=Math.min(t,Math.max(0,v.duration-.025));
          if(Math.abs(v.currentTime-target)>(this.video.paused?.025:.10))v.currentTime=target;
          v.playbackRate=this.video.playbackRate;
          if(!this.video.paused && !this.video.ended && v.paused && !v.ended)v.play().catch(()=>{});
          if(this.video.paused&&!v.paused)v.pause();
        }
        return;
      }
      if(!force && this.last===i)return;
      this.last=i;this.dataset.frame=i;
      const ctx=this.ctx,row=this.rows[i];
      ctx.drawImage(this.back,0,0,width,height);
      const colors=[iris,teal,coral];
      for(const [j,o] of (this.hands?[0,9,19]:[0]).entries()){
        const start=Math.max(0,i-this.track.fps*4);
        const path=[];
        for(let n=start;n<i;n+=Math.max(1,Math.floor(this.track.fps/14)))path.push(pos(this.rows[n],o));
        path.push(pos(row,o));
        this.stroke(ctx,path,colors[j]+'42',5);
        this.stroke(ctx,path,colors[j],1.9);
      }
      this.camera(ctx,row,this.span*(this.hands?.15:.23),iris,true);
      if(this.hands){this.gripper(ctx,row,9,teal);this.gripper(ctx,row,19,coral);}
    }
  }
  customElements.define('mw-motion-stage',MotionStage);
})();
