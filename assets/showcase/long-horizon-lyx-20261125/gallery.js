(()=>{
  const root=document.getElementById('long-horizon');
  if(!root||root.dataset.lhReady)return;
  root.dataset.lhReady='true';
  const data=JSON.parse(root.querySelector('.lh-data').textContent);
  const video=root.querySelector('video'), picker=root.querySelector('.lh-picker');
  const rate=root.querySelector('select'), error=root.querySelector('.lh-error');
  let active=0;
  const clock=n=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
  function select(i){
    const playing=!video.paused, item=data[i];active=i;
    video.pause();video.poster=item.poster;video.src=item.video;
    video.setAttribute('aria-label',item.title+' — generated rollout');
    root.querySelector('.lh-title').textContent=item.title;
    root.querySelector('.lh-meta').textContent=item.dataset+' · '+item.frames.toLocaleString('en-US')+' frames';
    root.querySelector('.lh-description').textContent=item.description;
    root.querySelector('.lh-duration').textContent=clock(item.duration)+' · full rollout';
    error.hidden=true;
    [...picker.children].forEach((b,j)=>b.setAttribute('aria-pressed',String(j===i)));
    video.load();video.playbackRate=Number(rate.value);
    if(playing)video.play().catch(()=>{});
  }
  data.forEach((item,i)=>{
    const button=document.createElement('button');button.type='button';button.className='lh-pick';
    button.setAttribute('aria-label',`${item.title}, ${clock(item.duration)}`);
    button.setAttribute('aria-controls','lh-video');button.setAttribute('aria-pressed',String(i===0));
    const img=document.createElement('img');img.src=item.poster;img.alt='';img.loading='lazy';img.width=260;img.height=150;
    const label=document.createElement('span');label.className='lh-pick-label';label.textContent=item.shortTitle;
    const time=document.createElement('span');time.className='lh-pick-time';time.textContent=clock(item.duration);
    button.append(img,time,label);button.addEventListener('click',()=>select(i));picker.append(button);
    button.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();let j=e.key==='Home'?0:e.key==='End'?data.length-1:(active+(e.key==='ArrowRight'?1:-1)+data.length)%data.length;select(j);picker.children[j].focus();}});
  });
  rate.addEventListener('change',()=>video.playbackRate=Number(rate.value));
  video.addEventListener('loadedmetadata',()=>video.playbackRate=Number(rate.value));
  video.addEventListener('error',()=>{error.textContent='This video could not be loaded. Please try another clip or reload the page.';error.hidden=false;});
  // Keep the first video's source in HTML; only the selected clip loads media.
})();
