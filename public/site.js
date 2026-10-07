/**
 * Progressive enhancement only: navigation, client-side filters and optional motion. Public text and links remain server-rendered.
 * See docs/architecture.md for the full data flow and extension guide.
 */
(() => {
  const menus=document.querySelectorAll('.menu-toggle'),nav=document.querySelector('#site-nav');
  function closeMenu(){nav?.classList.remove('open');menus.forEach(m=>m.setAttribute('aria-expanded','false'));}
  menus.forEach(menu => {
    menu.addEventListener('click',()=>{
      const open=menu.getAttribute('aria-expanded')!=='true';
      menus.forEach(m=>m.setAttribute('aria-expanded',String(open)));
      nav.classList.toggle('open',open);
    });
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&nav?.classList.contains('open')){closeMenu();menus[0]?.focus();}});
  nav?.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
  document.addEventListener('click',event=>{if(!event.target.closest('.site-header') && !event.target.closest('.mobile-tab-bar'))closeMenu();});
  document.querySelectorAll('img').forEach(img=>{
    const fail=()=>{img.classList.add('failed');if(img.closest('.media-frame')){img.closest('.media-frame').setAttribute('role','img');img.closest('.media-frame').setAttribute('aria-label',img.alt||'Image unavailable');}};
    img.addEventListener('error',fail);if(img.complete&&img.naturalWidth===0)fail();
  });
  document.querySelectorAll('[data-directory]').forEach(directory=>{
    const search=directory.querySelector('[data-search-input]'),category=directory.querySelector('select[data-category-filter]'),year=directory.querySelector('[data-year-filter]');
    const categoryRadios=directory.querySelectorAll('input[type="radio"][data-category-filter]');
    const items=[...directory.querySelectorAll('[data-item]')];
    const q=new URLSearchParams(location.search).get('q');if(q&&search)search.value=q;
    const update=()=>{
      let count=0;const query=(search?.value||'').toLocaleLowerCase().trim();
      const catVal = directory.querySelector('input[type="radio"][data-category-filter]:checked')?.value ?? category?.value;
      for(const item of items){const show=(!query||(item.dataset.search||item.textContent).toLocaleLowerCase().includes(query))&&(!catVal||item.dataset.category===catVal)&&(!year?.value||item.dataset.year===year.value);item.hidden=!show;if(show)count++;}
      directory.querySelectorAll('[data-filter-group]').forEach(group=>{group.hidden=![...group.querySelectorAll('[data-item]')].some(item=>!item.hidden);});
      directory.querySelector('[data-count]').textContent=count;directory.querySelector('[data-empty]').hidden=count!==0;
    };
    search?.addEventListener('input',update);category?.addEventListener('change',update);year?.addEventListener('change',update);
    categoryRadios.forEach(r=>r.addEventListener('change',update));
    directory.querySelector('form')?.addEventListener('submit',event=>{event.preventDefault();update();});
    update();
  });
  document.querySelectorAll('.slideshow-container').forEach(container => {
    const slides = container.querySelectorAll('.slide');
    if (slides.length <= 1) return;
    let current = 0;
    setInterval(() => {
      slides[current].classList.remove('active');
      current = (current + 1) % slides.length;
      slides[current].classList.add('active');
    }, 5000);
  });
  if('IntersectionObserver'in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('in-view');observer.unobserve(entry.target);}},{threshold:.05});
    document.querySelectorAll('.section-top,.research-card,.career-timeline article,.award-grid article,.story-card,.person-card,.tool-card,.task-paths > a,.publication-row,.event-row,.home-intro').forEach(element=>{element.classList.add('fade-ready');observer.observe(element);});
  }
})();

// Per-placement composition and accessible, user-controlled full-size image viewing.
(()=>{
 const images=[...document.querySelectorAll('[data-expand-image], .prose img')];
 for(const img of images){
  const frame=img.closest('[data-focal-x]');
  if(frame){img.style.objectPosition=`${Number(frame.dataset.focalX??50)}% ${Number(frame.dataset.focalY??50)}%`;}
  const trigger=img.closest('.image-expand')||img;trigger.tabIndex=0;trigger.setAttribute('role','button');trigger.setAttribute('aria-label','Expand image: '+(img.alt||'figure'));
 }
 if(!images.length)return;
 const dialog=document.createElement('dialog');dialog.className='image-dialog';dialog.setAttribute('aria-label','Expanded image');
 dialog.innerHTML='<div class="dialog-top"><p>Image viewer</p><button type="button" data-close-image>Close ×</button></div><figure><img alt=""><figcaption></figcaption></figure><div class="gallery-controls"><button type="button" data-prev-image>Previous</button><button type="button" data-next-image>Next</button><a target="_blank" rel="noopener noreferrer">Open original image</a></div>';
 document.body.append(dialog);let source,index=0,group=[];
 const update=()=>{const img=group[index];dialog.querySelector('img').src=img.dataset.original||img.src;dialog.querySelector('img').alt=img.alt;dialog.querySelector('figcaption').textContent=img.dataset.caption||img.alt||'';dialog.querySelector('a').href=img.dataset.original||img.src;dialog.querySelector('[data-prev-image]').hidden=dialog.querySelector('[data-next-image]').hidden=group.length<2;};
 const open=img=>{source=img.closest('.image-expand')||img;group=img.closest('.gallery')?[...img.closest('.gallery').querySelectorAll('img')]:[img];index=group.indexOf(img);update();dialog.showModal();};
 images.forEach(img=>{img.addEventListener('click',event=>{event.preventDefault();open(img)});(img.closest('.image-expand')||img).addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();open(img)}})});
 dialog.querySelector('[data-close-image]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>source?.focus());
 dialog.querySelector('[data-prev-image]').onclick=()=>{index=(index-1+group.length)%group.length;update()};dialog.querySelector('[data-next-image]').onclick=()=>{index=(index+1)%group.length;update()};
 dialog.addEventListener('keydown',event=>{if(event.key==='ArrowRight'){index=(index+1)%group.length;update()}if(event.key==='ArrowLeft'){index=(index-1+group.length)%group.length;update()}});
 dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close()}});
 document.querySelectorAll('.nav-dropdown').forEach(menu=>menu.addEventListener('toggle',()=>{if(menu.open)document.querySelectorAll('.nav-dropdown').forEach(other=>{if(other!==menu)other.open=false})}));
 document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.nav-dropdown').forEach(menu=>menu.open=false)});
 document.addEventListener('click',event=>{if(!event.target.closest('.nav-dropdown'))document.querySelectorAll('.nav-dropdown').forEach(menu=>menu.open=false)});
 const sections=[...document.querySelectorAll('.profile-section')];if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){document.querySelectorAll('.profile-nav a').forEach(a=>a.classList.toggle('is-active',a.hash==='#'+entry.target.id))}},{rootMargin:'-20% 0px -50% 0px'});sections.forEach(s=>observer.observe(s));}
 document.addEventListener('click',event=>{
  const copyBtn=event.target.closest('[data-copy]');
  if(copyBtn&&copyBtn.dataset.copy){
   navigator.clipboard?.writeText(copyBtn.dataset.copy).then(()=>{
    const textSpan=copyBtn.querySelector('.copy-text');
    if(textSpan){
     const orig=textSpan.textContent;
     textSpan.textContent='Copied!';
     copyBtn.classList.add('is-copied');
     setTimeout(()=>{textSpan.textContent=orig;copyBtn.classList.remove('is-copied');},2000);
    }
   }).catch(()=>{});
  }
  const filterBtn=event.target.closest('[data-pub-year]');
  if(filterBtn){
   const container=filterBtn.closest('.scholarship-card');
   if(!container)return;
   const targetYear=filterBtn.dataset.pubYear;
   container.querySelectorAll('.pub-filter-btn').forEach(b=>b.classList.toggle('is-active',b===filterBtn));
   const items=container.querySelectorAll('.member-pub-item');
   let visibleCount=0;
   items.forEach(item=>{
     const match=targetYear==='all'||item.dataset.year===targetYear;
     item.hidden=!match;
     if(match)visibleCount++;
   });
   const counter=container.querySelector('[data-pub-visible-count]');
   if(counter)counter.textContent=visibleCount;
   const emptyState=container.querySelector('.pub-filter-empty');
   if(emptyState)emptyState.hidden=visibleCount>0;
  }
 });
})();

// v2 polish: header state, count-up numbers, back-to-top and reading progress. All optional enhancements.
(()=>{
  const header=document.querySelector('.site-header');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const top=document.createElement('button');top.type='button';top.className='to-top';top.setAttribute('aria-label','Back to top');
  top.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>';
  top.addEventListener('click',()=>scrollTo({top:0,behavior:reduce?'auto':'smooth'}));document.body.append(top);
  const bar=document.createElement('div');bar.className='read-progress';bar.setAttribute('aria-hidden','true');document.body.append(bar);
  let ticking=false;
  const onScroll=()=>{
    if(ticking)return;ticking=true;
    requestAnimationFrame(()=>{
      const y=scrollY,max=document.documentElement.scrollHeight-innerHeight;
      header?.classList.toggle('is-scrolled',y>24);top.classList.toggle('show',y>700);
      bar.style.transform='scaleX('+(max>0?Math.min(1,y/max):0)+')';ticking=false;
    });
  };
  addEventListener('scroll',onScroll,{passive:true});onScroll();
  const counters=document.querySelectorAll('[data-countup]');
  if(counters.length&&'IntersectionObserver'in window&&!reduce){
    const io=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;io.unobserve(entry.target);
      const el=entry.target,end=Number(el.dataset.countup),t0=performance.now(),dur=1100;
      const tick=now=>{const k=Math.min(1,(now-t0)/dur),eased=1-Math.pow(1-k,3);el.textContent=Math.round(end*eased);if(k<1)requestAnimationFrame(tick);};
      el.textContent='0';requestAnimationFrame(tick);}},{threshold:.4});
    counters.forEach(c=>io.observe(c));
  }
})();

// News board: section tabs (all / General / Science / Media) and "show more" per column.
(()=>{
  const board=document.querySelector('.news-board');if(!board)return;
  const directory=board.closest('[data-directory]'),tabs=[...document.querySelectorAll('.news-tab')];
  const cols=[...board.querySelectorAll('.news-col')];
  const small=()=>matchMedia('(max-width:700px)').matches;
  const step=view=>view==='all'?(small()?4:6):(small()?6:12);
  let view='all';const limits=new Map();
  const apply=()=>{
    const searching=directory?.classList.contains('is-searching');
    for(const col of cols){
      const limit=limits.get(col)||step(view);
      let shown=0,more=0;
      for(const card of col.querySelectorAll('.news-card')){
        if(card.hidden){card.classList.remove('is-extra');continue;}
        if(searching||shown<limit){card.classList.remove('is-extra');shown++;}else{card.classList.add('is-extra');more++;}
      }
      const btn=col.querySelector('.news-more');btn.hidden=more===0;
      if(more)btn.textContent='Show '+Math.min(more,step(view))+' more · '+more+' remaining';
    }
  };
  const setView=(next,push=true)=>{
    view=next;board.dataset.view=next;limits.clear();
    tabs.forEach(t=>{const on=t.dataset.view===next;t.classList.toggle('is-active',on);t.setAttribute('aria-selected',String(on));});
    if(push){try{history.replaceState(null,'',next==='all'?location.pathname+location.search:'#'+next.toLowerCase());}catch{}}
    apply();
  };
  tabs.forEach(t=>t.addEventListener('click',()=>setView(t.dataset.view)));
  cols.forEach(col=>col.querySelector('.news-more').addEventListener('click',()=>{limits.set(col,(limits.get(col)||step(view))+step(view));apply();}));
  const search=directory?.querySelector('[data-search-input]');
  search?.addEventListener('input',()=>{directory.classList.toggle('is-searching',search.value.trim()!=='');requestAnimationFrame(apply);});
  const wanted=location.hash.slice(1).toLowerCase(),match=tabs.find(t=>t.dataset.view.toLowerCase()===wanted);
  setView(match?match.dataset.view:'all',false);
  addEventListener('resize',()=>{limits.clear();apply();});
})();
