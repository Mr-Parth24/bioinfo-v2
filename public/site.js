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
      slides[current].style.opacity = '0';
      slides[current].classList.remove('active');
      current = (current + 1) % slides.length;
      slides[current].style.opacity = '1';
      slides[current].classList.add('active');
    }, 5000);
  });
  // Modern responsive news pagination: 5 per page on desktop, 3 per page on phone
  function initNewsPagination() {
    const cols = document.querySelectorAll('.news-category-col');
    if (!cols.length) return;

    function getPageSize() {
      // 3 items per page on mobile viewports (<=768px), 5 items per page on desktop
      return window.innerWidth <= 768 ? 3 : 5;
    }

    cols.forEach(col => {
      const items = Array.from(col.querySelectorAll('.news-item-page'));
      const paginationBar = col.querySelector('.news-pagination-bar');
      if (!items.length || !paginationBar) return;

      let currentPage = 1;

      function render() {
        const pageSize = getPageSize();
        const totalPages = Math.ceil(items.length / pageSize) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const start = (currentPage - 1) * pageSize;
        const end = Math.min(start + pageSize, items.length);

        // Update items visibility with smooth subtle fade
        items.forEach((item, idx) => {
          const isVisible = idx >= start && idx < end;
          item.style.display = isVisible ? '' : 'none';
          if (isVisible) {
            item.classList.remove('news-fade-in');
            void item.offsetWidth;
            item.classList.add('news-fade-in');
          }
        });

        // Update range label
        const rangeLabel = paginationBar.querySelector('.page-range-label');
        if (rangeLabel) {
          rangeLabel.textContent = `Showing ${start + 1}–${end} of ${items.length} stories`;
        }

        // Update Prev / Next buttons
        const prevBtn = paginationBar.querySelector('.prev-btn');
        const nextBtn = paginationBar.querySelector('.next-btn');
        if (prevBtn) prevBtn.disabled = currentPage <= 1;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

        // Update page numbers list
        const listWrap = paginationBar.querySelector('.page-numbers-list');
        if (listWrap) {
          listWrap.innerHTML = '';
          for (let p = 1; p <= totalPages; p++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `page-num-btn ${p === currentPage ? 'is-active' : ''}`;
            btn.textContent = String(p);
            btn.setAttribute('data-page', String(p));
            btn.setAttribute('aria-label', `Go to page ${p}`);
            if (p === currentPage) {
              btn.setAttribute('aria-current', 'page');
            }
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              if (currentPage !== p) {
                currentPage = p;
                render();
                scrollToColTop();
              }
            });
            listWrap.appendChild(btn);
          }
        }
      }

      function scrollToColTop() {
        const rect = col.getBoundingClientRect();
        if (rect.top < 80 || rect.top > window.innerHeight) {
          col.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }

      const prevBtn = paginationBar.querySelector('.prev-btn');
      const nextBtn = paginationBar.querySelector('.next-btn');

      prevBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) {
          currentPage--;
          render();
          scrollToColTop();
        }
      });

      nextBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        const pageSize = getPageSize();
        const totalPages = Math.ceil(items.length / pageSize);
        if (currentPage < totalPages) {
          currentPage++;
          render();
          scrollToColTop();
        }
      });

      render();
    });

    // Mobile category selector tabs
    const mobileTabs = document.querySelectorAll('.mobile-cat-pill');
    mobileTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.catTarget;
        mobileTabs.forEach(t => {
          t.classList.remove('is-active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('is-active');
        tab.setAttribute('aria-selected', 'true');

        cols.forEach(col => {
          if (target === 'all' || col.dataset.col === target) {
            col.style.display = '';
          } else {
            col.style.display = 'none';
          }
        });
      });
    });

    // Handle responsive resize between mobile (3 items) and desktop (5 items)
    let lastWidth = window.innerWidth;
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const newWidth = window.innerWidth;
        const crossedThreshold = (lastWidth <= 768 && newWidth > 768) || (lastWidth > 768 && newWidth <= 768);
        if (crossedThreshold) {
          lastWidth = newWidth;
          initNewsPagination();
        }
      }, 150);
    });
  }
  initNewsPagination();
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
