/* Independent motion study. Content and routing belong to this preview only. */
const motionEase = 'cubic-bezier(.23,1,.32,1)';
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let cinemaSource = null;
let cinemaAnimation = null;
let cinemaGeneration = 0;
let cinemaEvents = null;
let navigationBusy = false;

function resolveMarkup(markup) {
  return markup.replace(/\b(src|poster)="([^"]+)"/g, (_, attribute, value) => `${attribute}="${/^(?:[a-z]+:|\/|\.\.)/i.test(value) ? value : value}"`);
}

function resolveAssets(root) {
  root.querySelectorAll('img[src],video[src],video[poster]').forEach(el => {
    ['src','poster'].forEach(attribute => {
      const value = el.getAttribute(attribute);
      if (value && !/^(?:[a-z]+:|\/|\.\.)/i.test(value)) el.setAttribute(attribute,value);
    });
  });
}

function animateElement(el, frames, duration = 600, delay = 0) {
  if (!el || reduceMotion()) return Promise.resolve();
  const animation = el.animate(frames,{duration,delay,easing:motionEase,fill:'none'});
  return animation.finished.catch(()=>{});
}

function expandCinema(source) {
  const dialog=document.querySelector('#project-dialog');
  const content=dialog.querySelector('#dialog-content');
  cinemaGeneration++;
  cinemaAnimation?.cancel();
  cinemaEvents?.abort();
  cinemaEvents=new AbortController();
  const {signal}=cinemaEvents;
  cinemaSource=source;
  content.style.opacity='';
  dialog.scrollTop=0;
  const heading=content.querySelector('h2');
  if(heading){heading.id='cinema-title';dialog.setAttribute('aria-labelledby','cinema-title')}
  const video=content.querySelector('video');
  if(video){
    const stage=document.createElement('div');stage.className='cinema-stage';
    video.replaceWith(stage);stage.append(video);
    video.preload='auto';
    const sizeStage=()=>{
      if(video.videoWidth&&video.videoHeight){stage.classList.toggle('is-landscape',video.videoWidth>video.videoHeight);stage.style.aspectRatio=video.videoWidth+'/'+video.videoHeight;}
    };
    if(video.getAttribute('src')?.includes('landscape'))stage.classList.add('is-landscape');
    video.addEventListener('loadedmetadata',sizeStage,{signal});sizeStage();
    const status=document.createElement('button');
    status.type='button';status.className='cinema-status';status.setAttribute('aria-live','polite');
    stage.append(status);
    const show=(text)=>{status.textContent=text;status.hidden=false};
    const hide=()=>{status.hidden=true};
    const play=()=>{
      show(B('Loading film…','فیلم داره لود می‌شه…'));
      const result=video.play();
      result?.catch(()=>{if(dialog.open&&video.isConnected&&!signal.aborted)show(B('Play film','پخش فیلم'))});
    };
    video.addEventListener('playing',hide,{signal});
    video.addEventListener('loadeddata',hide,{signal});
    video.addEventListener('waiting',()=>show(B('Loading film…','فیلم داره لود می‌شه…')),{signal});
    video.addEventListener('error',()=>show(B('Couldn’t load the film. Tap to retry.','فیلم لود نشد؛ دوباره بزن.')),{signal});
    status.addEventListener('click',()=>{if(video.error)video.load();play()},{signal});
    play();
  }
  if(!reduceMotion()) cinemaAnimation=dialog.animate([{opacity:.65,transform:'translateY(12px) scale(.97)'},{opacity:1,transform:'none'}],{duration:240,easing:motionEase});
}

async function closeCinema(immediate=false) {
  const dialog=document.querySelector('#project-dialog');
  if(!dialog?.open)return;
  const generation=++cinemaGeneration;
  cinemaAnimation?.cancel();
  cinemaEvents?.abort();
  const video=dialog.querySelector('video');
  video?.pause();
  if(!immediate&&!reduceMotion()){
    cinemaAnimation=dialog.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(12px) scale(.97)'}],{duration:160,easing:motionEase});
    await cinemaAnimation.finished.catch(()=>{});
  }
  if(generation!==cinemaGeneration)return;
  dialog.close();
  document.body.classList.remove('modal-open');
  if(video){video.removeAttribute('src');video.load()}
  const trigger=cinemaSource?.matches('button')?cinemaSource:cinemaSource?.querySelector('button');
  if(trigger?.isConnected)trigger.focus({preventScroll:true});
}

function openCinemaMedia(source, {src,poster,title,description='',photo=false}) {
  const dialog=document.querySelector('#project-dialog');
  dialog.querySelector('#dialog-content').innerHTML=photo
    ? `<img class="cinema-photo" src="${safe(src)}" alt="${safe(title)}"><div class="dialog-copy"><h2>${safe(title)}</h2></div>`
    : `<video controls playsinline preload="metadata" poster="${safe(poster)}" src="${safe(src)}"></video><div class="dialog-copy"><small>${B('BEHIND THE SCENES','پشت‌صحنه')}</small><h2>${safe(title)}</h2><p>${safe(description)}</p></div>`;
  resolveAssets(dialog);
  dialog.showModal();
  document.body.classList.add('modal-open');
  expandCinema(source);
}

async function changePage(nextRoute, url, push=true) {
  if(navigationBusy) return;
  if(!['home','works','about','thoughts','backstage'].includes(nextRoute)) return;
  navigationBusy=true;
  if(push) history.replaceState({view:route,scroll:scrollY},'',location.href);
  await animateElement(document.querySelector('main'),[{opacity:1,transform:'none'},{opacity:0,transform:'translateY(-22px)'}],220);
  route=nextRoute;
  if(push) history.pushState({view:route,scroll:0},'',url);
  render();
  window.scrollTo({top:push?0:(history.state?.scroll||0),behavior:'instant'});
  animateElement(document.querySelector('main'),[{opacity:0,transform:'translateY(26px)'},{opacity:1,transform:'none'}],650);
  document.querySelector('main').setAttribute('tabindex','-1');
  document.querySelector('main').focus({preventScroll:true});
  navigationBusy=false;
}

history.scrollRestoration='manual';
addEventListener('popstate',()=>changePage(new URLSearchParams(location.search).get('view')||'home',location.href,false));

function mountMotion() {
  const cleanup=[];
  const on=(el,type,fn,options)=>{el.addEventListener(type,fn,options);cleanup.push(()=>el.removeEventListener(type,fn,options))};
  const header=document.querySelector('.topbar');
  const sun='<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>';
  const moon='<path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z"/>';
  header.querySelector('.theme-toggle span').innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${theme==='dark'?sun:moon}</svg>`;
  header.querySelectorAll('nav a').forEach((a,i)=>{
    const glyphs=['<path d="m3 10 9-7 9 7v10H3Z M9 20v-7h6v7"/>','<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="11" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="18" width="7" height="3" rx="1"/>','<rect x="3" y="7" width="13" height="13" rx="3"/><path d="m16 11 6-4v13l-6-4"/><path d="M6 3h7"/>','<circle cx="12" cy="8" r="4"/><path d="M4 21c0-9 16-9 16 0"/>'];
    a.insertAdjacentHTML('afterbegin',`<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyphs[i]}</svg>`);
  });
  document.querySelectorAll('a[href]').forEach(a=>{
    const url=new URL(a.getAttribute('href'),location.href);
    const current=new URL(location.href);
    const samePreview=url.origin===current.origin&&url.pathname.replace(/index.html$/,'')===current.pathname.replace(/index.html$/,'');
    if(samePreview&&!url.hash&&!a.target){
      on(a,'click',e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button!==0)return;e.preventDefault();changePage(url.searchParams.get('view')||'home',url.href)});
    }
  });
  const backstageTitles=[['ONE FRAME FROM EACH SET','از هر ست، یه قاب','KITCHEN / STUDIO / BEAUTY','آشپزخونه / استودیو / بیوتی'],['BEHIND THE DRUMS','پشت درام','DRUMS / LIGHT / MONITOR','درام / نور / مانیتور'],['FIRST HALF OF 2025','نیمه‌ی اول ۲۰۲۵','EVENTS / SETS / PEOPLE','ایونت / ست / آدم‌ها'],['ON A BEAUTY SET','پشت یه ست بیوتی','SOFT LIGHT / TABLE / TALENT','نور نرم / میز / مدل']];
  document.querySelectorAll('.backstage-frame').forEach((frame,i)=>{
    const video=frame.querySelector('video');
    const src=video.getAttribute('src'),poster=cinemaCoverFrames['bts-'+String(i+1).padStart(2,'0')];
    const words=backstageTitles[i],title=B(words[0],words[1]);
    frame.classList.add('bts-poster','bts-poster-'+(i+1));
    frame.innerHTML=`<div class="bts-photo"><img src="${poster}" alt="${title}" loading="lazy"></div><div class="bts-topline"><span>${B('BEHIND THE SCENES','پشت صحنه')}</span><span class="bts-rec"><i></i> 0${i+1}</span></div><div class="bts-editorial"><span class="bts-subtitle">${B(words[2],words[3])}</span><strong>${title}</strong><span class="bts-number" aria-hidden="true">0${i+1}</span></div><button class="frame-open bts-full-open" aria-label="${B('Watch backstage film: ','دیدن پشت‌صحنه: ')+title}"><span class="bts-play-circle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m9 5 10 7-10 7Z"/></svg></span></button>`;
    frame.closest('.backstage-card').querySelector('h2').innerHTML=`<span>${B('ON SET','سر صحنه')} / 0${i+1}</span><span>${B('PLAY FILM ↗','پخش فیلم ↗')}</span>`;
    on(frame.querySelector('button'),'click',()=>openCinemaMedia(frame,{src,poster,title,description:B('A few moments from behind the camera.','چند تا لحظه از سر صحنه؛ همون چیزایی که تو فیلم نهایی دیده نمی‌شن.')}));
  });
  document.querySelectorAll('.personal-cat,.travel-moment').forEach(frame=>{
    const img=frame.querySelector('img');
    const title=(frame.querySelector('figcaption h2')||frame.querySelector('figcaption')).textContent.trim();
    frame.insertAdjacentHTML('beforeend',`<button class="frame-open photo-open" aria-label="${B('Open photo: ','باز کردن عکس: ')+title}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg></button>`);
    on(frame.querySelector('button'),'click',()=>openCinemaMedia(frame,{src:img.src,title,photo:true}));
  });
  if(!reduceMotion()){
    document.querySelector('.hero')?.classList.add('hero-cinema');
    const icons=document.querySelectorAll('.skill-card svg,.connect-icon svg');
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      animateElement(entry.target,[{opacity:0,transform:'translateY(15px) rotate(-12deg) scale(.6)'},{opacity:1,transform:'none'}],750);
      observer.unobserve(entry.target);
    }),{threshold:.6});
    icons.forEach(el=>observer.observe(el));cleanup.push(()=>observer.disconnect());
    if(matchMedia('(hover:hover) and (pointer:fine)').matches){
      document.querySelectorAll('.connect-icon,.theme-toggle,.black-button,.outline-button,.frame-open').forEach(el=>{
        on(el,'pointermove',e=>{const r=el.getBoundingClientRect();el.style.setProperty('--mx',(e.clientX-r.left-r.width/2)*.12+'px');el.style.setProperty('--my',(e.clientY-r.top-r.height/2)*.16+'px')});
        on(el,'pointerleave',()=>{el.style.setProperty('--mx','0px');el.style.setProperty('--my','0px')});
      });
      document.querySelectorAll('.skill-card,.project-image').forEach(el=>{
        on(el,'pointermove',e=>{const r=el.getBoundingClientRect();el.style.setProperty('--shine-x',((e.clientX-r.left)/r.width)*100+'%');el.style.setProperty('--shine-y',((e.clientY-r.top)/r.height)*100+'%')});
      });
    }
  }
  let raf=0;
  const update=()=>{
    raf=0;header.classList.toggle('is-scrolled',scrollY>50);
    if(reduceMotion())return;
    const hero=document.querySelector('.hero');
    if(hero){const p=Math.min(1,scrollY/(innerHeight*.85));hero.style.setProperty('--hero-progress',p);}
    document.querySelectorAll('.job').forEach(el=>{
      const box=el.getBoundingClientRect();el.classList.toggle('job-current',box.top<innerHeight*.65&&box.bottom>innerHeight*.3);
    });
    document.querySelectorAll('.section-statement,.footer-name').forEach(el=>{
      const box=el.getBoundingClientRect();if(box.bottom>0&&box.top<innerHeight)el.style.setProperty('--drift',((innerHeight/2-box.top-box.height/2)*.025)+'px');
    });
  };
  on(window,'scroll',()=>{if(!raf)raf=requestAnimationFrame(update)},{passive:true});update();cleanup.push(()=>cancelAnimationFrame(raf));
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  on(preference,'change',()=>render());
  return()=>cleanup.forEach(fn=>fn());
}
