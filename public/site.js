/**
 * Progressive enhancement for the public site. Every page works without this file:
 * text, links and navigation are server-rendered. This adds menus, filters, the image viewer,
 * copy buttons and quiet motion. Motion is skipped when the visitor prefers reduced motion.
 * See docs/architecture.md.
 */
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = () => matchMedia('(min-width: 1080px)').matches;

  /* ---------- Header: elevation on scroll, mobile menu, navigation panels ---------- */
  const header = document.querySelector('[data-site-header]');
  const menuButtons = document.querySelectorAll('.menu-button');
  const nav = document.getElementById('site-nav');

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      header?.classList.toggle('is-scrolled', scrollY > 8);
      toTop?.classList.toggle('is-visible', scrollY > 450);
      ticking = false;
    });
  };

  const closePanels = except => document.querySelectorAll('.nav-item.is-open').forEach(item => {
    if (item === except) return;
    item.classList.remove('is-open');
    item.querySelector('.nav-expand')?.setAttribute('aria-expanded', 'false');
  });
  const setMenu = open => {
    if (!header || !menuButtons.length) return;
    if (open) document.documentElement.style.setProperty('--menu-top', Math.max(0, header.getBoundingClientRect().bottom) + 'px');
    header.classList.toggle('menu-open', open);
    document.documentElement.classList.toggle('menu-locked', open);
    menuButtons.forEach(btn => {
      btn.setAttribute('aria-expanded', String(open));
      const label = btn.querySelector('.menu-button-label');
      if (label) label.textContent = open ? 'Close' : 'Menu';
    });
    if (!open) closePanels();
  };
  menuButtons.forEach(btn => {
    btn.addEventListener('click', () => setMenu(btn.getAttribute('aria-expanded') !== 'true'));
  });

  document.querySelectorAll('.nav-expand').forEach(button => {
    button.addEventListener('click', () => {
      const item = button.closest('.nav-item');
      const open = !item.classList.contains('is-open');
      closePanels(item);
      item.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const openItem = document.querySelector('.nav-item.is-open');
    if (openItem) { closePanels(); openItem.querySelector('.nav-expand')?.focus(); }
    if (header?.classList.contains('menu-open')) { setMenu(false); menuButtons[0]?.focus(); }
  });
  document.addEventListener('click', event => {
    if (desktop() && !event.target.closest('.nav-item')) closePanels();
  });
  addEventListener('resize', () => { if (desktop() && header?.classList.contains('menu-open')) setMenu(false); });
  nav?.addEventListener('click', event => { if (event.target.closest('a') && !desktop()) setMenu(false); });

  /* ---------- Back to top ---------- */
  const toTop = document.createElement('button');
  toTop.type = 'button';
  toTop.className = 'to-top';
  toTop.setAttribute('aria-label', 'Back to top');
  toTop.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>';
  toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
  document.body.append(toTop);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Directory filters: search, category and year ---------- */
  document.querySelectorAll('[data-directory]').forEach(directory => {
    const search = directory.querySelector('[data-search-input]');
    const category = directory.querySelector('select[data-category-filter]');
    const radios = directory.querySelectorAll('input[type="radio"][data-category-filter]');
    const year = directory.querySelector('[data-year-filter]');
    const ranges = directory.querySelectorAll('input[data-year-range]');
    const items = [...directory.querySelectorAll('[data-item]')];
    const counter = directory.querySelector('[data-count]');
    const empty = directory.querySelector('[data-empty]');
    const initial = new URLSearchParams(location.search).get('q');
    if (initial && search) search.value = initial;
    const update = () => {
      const query = (search?.value || '').toLocaleLowerCase().trim();
      const cat = directory.querySelector('input[type="radio"][data-category-filter]:checked')?.value ?? category?.value ?? '';
      const [from, to] = (directory.querySelector('input[data-year-range]:checked')?.value || '').split('-').map(Number);
      const onlyRoles = directory.querySelector('[data-role-only]')?.checked ? [...directory.querySelectorAll('[data-author-key][aria-pressed="true"]')].map(b => b.dataset.authorKey) : [];
      const waiting = directory.hasAttribute('data-require-query') && !query;
      const hint = directory.querySelector('[data-search-hint]');
      if (hint) hint.hidden = !waiting;
      let shown = 0;
      for (const item of items) {
        const match = !waiting && (!query || (item.dataset.search || item.textContent).toLocaleLowerCase().includes(query))
          && (!cat || item.dataset.category === cat)
          && (!year?.value || item.dataset.year === year.value)
          && (!from || (Number(item.dataset.year) >= from && Number(item.dataset.year) <= to))
          && (!onlyRoles.length || (item.dataset.roles || '').split(' ').some(r => onlyRoles.includes(r)));
        item.hidden = !match;
        if (match) shown++;
      }
      directory.querySelectorAll('[data-filter-group]').forEach(group => {
        group.hidden = ![...group.querySelectorAll('[data-item]')].some(item => !item.hidden);
      });
      if (counter) counter.textContent = shown;
      if (empty) empty.hidden = shown !== 0 || waiting;
      directory.classList.toggle('is-filtering', Boolean(query || cat || year?.value || from || onlyRoles.length));
      if (search) {
        try {
          const u = new URL(location.href);
          if (query) u.searchParams.set('q', search.value.trim()); else u.searchParams.delete('q');
          history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
        } catch {}
      }
      directory.dispatchEvent(new CustomEvent('directory:update'));
    };
    let searchTimer;
    search?.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(update, 120);
    });
    category?.addEventListener('change', update);
    year?.addEventListener('change', update);
    radios.forEach(r => r.addEventListener('change', update));
    ranges.forEach(r => r.addEventListener('change', update));
    directory.querySelector('[data-role-only]')?.addEventListener('change', update);
    directory.addEventListener('roles:change', update);
    directory.querySelector('form')?.addEventListener('submit', event => { event.preventDefault(); update(); });
    update();
  });

  /* ---------- News board: section tabs and "show more" ---------- */
  const board = document.querySelector('.news-board');
  if (board) {
    const directory = board.closest('[data-directory]');
    const tabs = [...document.querySelectorAll('.news-tab')];
    const cols = [...board.querySelectorAll('.news-col')];
    const small = () => matchMedia('(max-width: 720px)').matches;
    const step = view => view === 'all' ? (small() ? 4 : 6) : (small() ? 6 : 12);
    const limits = new Map();
    let view = 'all';
    const apply = () => {
      const filtering = directory?.classList.contains('is-filtering');
      for (const col of cols) {
        const limit = limits.get(col) || step(view);
        let shown = 0, more = 0;
        for (const card of col.querySelectorAll('.news-card')) {
          if (card.hidden) { card.classList.remove('is-extra'); continue; }
          if (filtering || shown < limit) { card.classList.remove('is-extra'); shown++; }
          else { card.classList.add('is-extra'); more++; }
        }
        const button = col.querySelector('.news-more');
        button.hidden = more === 0;
        if (more) button.textContent = `Show ${Math.min(more, step(view))} more (${more} remaining)`;
      }
    };
    const setView = (next, updateUrl = true) => {
      view = next;
      board.dataset.view = next;
      limits.clear();
      tabs.forEach(tab => {
        const on = tab.dataset.view === next;
        tab.classList.toggle('is-active', on);
        tab.setAttribute('aria-selected', String(on));
      });
      if (updateUrl) { try { history.replaceState(null, '', next === 'all' ? location.pathname + location.search : '#' + next.toLowerCase()); } catch {} }
      apply();
    };
    tabs.forEach(tab => tab.addEventListener('click', () => setView(tab.dataset.view)));
    cols.forEach(col => col.querySelector('.news-more').addEventListener('click', () => {
      limits.set(col, (limits.get(col) || step(view)) + step(view));
      apply();
    }));
    directory?.addEventListener('directory:update', apply);
    const wanted = location.hash.slice(1).toLowerCase();
    const match = tabs.find(tab => tab.dataset.view.toLowerCase() === wanted);
    setView(match ? match.dataset.view : 'all', false);
    addEventListener('resize', () => { limits.clear(); apply(); });
  }

  /* ---------- Publications: author roles. Several can be selected; each draws its own coloured line
     under matching names, stacked in legend order, and publications without any of them step back. ---------- */
  const keyButtons = [...document.querySelectorAll('[data-author-key]')];
  const pubList = document.querySelector('.publication-list');
  const roleActions = document.querySelector('.role-actions');
  const roleOrder = keyButtons.map(b => b.dataset.authorKey);
  const highlightRoles = () => {
    const selected = keyButtons.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.authorKey);
    pubList?.classList.toggle('is-highlighting', selected.length > 0);
    pubList?.querySelectorAll('.publication').forEach(item => item.classList.toggle('is-match', (item.dataset.roles || '').split(' ').some(r => selected.includes(r))));
    pubList?.querySelectorAll('.author').forEach(name => {
      const roles = name.dataset.roles.split(' ');
      const active = roleOrder.filter(r => selected.includes(r) && roles.includes(r));
      if (active.length) name.dataset.lines = active.length; else delete name.dataset.lines;
      [0, 1, 2, 3, 4].forEach(i => active[i] ? name.style.setProperty(`--line-${i + 1}`, `var(--role-${active[i]})`) : name.style.removeProperty(`--line-${i + 1}`));
    });
    if (roleActions) {
      roleActions.hidden = !selected.length;
      if (!selected.length) roleActions.querySelector('[data-role-only]').checked = false;
    }
    keyButtons[0]?.closest('[data-directory]')?.dispatchEvent(new CustomEvent('roles:change'));
  };
  keyButtons.forEach(button => button.addEventListener('click', () => {
    button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
    highlightRoles();
  }));
  document.querySelector('[data-role-clear]')?.addEventListener('click', () => {
    keyButtons.forEach(b => b.setAttribute('aria-pressed', 'false'));
    highlightRoles();
    keyButtons[0]?.focus();
  });

  /* ---------- Homepage hero slideshow: fades every 6 s, pauses on hover, focus or request ---------- */
  document.querySelectorAll('[data-slideshow]').forEach(show => {
    const slides = [...show.querySelectorAll('.hero-slide')];
    const dots = [...show.querySelectorAll('[data-slide-to]')];
    const pause = show.querySelector('[data-slide-pause]');
    let index = 0, timer = null, held = false, stopped = reduceMotion;
    const go = next => {
      index = (next + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === index);
        slide.toggleAttribute('aria-hidden', i !== index);
        slide.querySelectorAll('a').forEach(a => { a.tabIndex = i === index ? 0 : -1; });
      });
      dots.forEach((dot, i) => dot.toggleAttribute('aria-current', i === index));
    };
    const schedule = () => {
      clearInterval(timer);
      if (!stopped && !held) timer = setInterval(() => go(index + 1), 2000);
      show.classList.toggle('is-paused', stopped);
      pause.setAttribute('aria-label', stopped ? 'Play slideshow' : 'Pause slideshow');
    };
    show.querySelector('[data-slide-prev]').addEventListener('click', () => { go(index - 1); schedule(); });
    show.querySelector('[data-slide-next]').addEventListener('click', () => { go(index + 1); schedule(); });
    dots.forEach((dot, i) => dot.addEventListener('click', () => { go(i); schedule(); }));
    pause.addEventListener('click', () => { stopped = !stopped; schedule(); });
    show.addEventListener('pointerenter', () => { held = true; schedule(); });
    show.addEventListener('pointerleave', () => { held = false; schedule(); });
    show.addEventListener('focusin', () => { held = true; schedule(); });
    show.addEventListener('focusout', () => { held = false; schedule(); });
    let startX = null;
    show.addEventListener('touchstart', event => { startX = event.touches[0].clientX; }, { passive: true });
    show.addEventListener('touchend', event => {
      const dx = event.changedTouches[0].clientX - (startX ?? event.changedTouches[0].clientX);
      if (Math.abs(dx) > 40) { go(index + (dx < 0 ? 1 : -1)); schedule(); }
      startX = null;
    });
    show.classList.add('is-ready');
    go(0);
    schedule();
  });

  /* ---------- Profile pages: publication year filter and table of contents ---------- */
  document.querySelectorAll('[data-pub-filter]').forEach(section => {
    section.addEventListener('click', event => {
      const button = event.target.closest('[data-pub-year]');
      if (!button) return;
      section.querySelectorAll('[data-pub-year]').forEach(b => b.classList.toggle('is-active', b === button));
      section.querySelectorAll('.member-pub').forEach(item => {
        item.hidden = button.dataset.pubYear !== 'all' && item.dataset.year !== button.dataset.pubYear;
      });
    });
  });
  const tocLinks = [...document.querySelectorAll('.profile-toc a')];
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) tocLinks.forEach(a => a.classList.toggle('is-active', a.hash === '#' + entry.target.id));
      }
    }, { rootMargin: '-25% 0px -60% 0px' });
    document.querySelectorAll('.profile-section[id]').forEach(s => observer.observe(s));
  }

  /* ---------- Glow cards: the gradient border follows the pointer ---------- */
  if (matchMedia('(hover: hover)').matches) {
    let pending = null;
    document.addEventListener('pointermove', event => {
      const card = event.target.closest?.('.glow');
      if (!card) return;
      pending = { card, x: event.clientX, y: event.clientY };
      requestAnimationFrame(() => {
        if (!pending) return;
        const r = pending.card.getBoundingClientRect();
        pending.card.style.setProperty('--mx', `${pending.x - r.left}px`);
        pending.card.style.setProperty('--my', `${pending.y - r.top}px`);
        pending = null;
      });
    }, { passive: true });
  }

  /* ---------- Copy buttons (citations, email addresses) ---------- */
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-copy]');
    if (!button?.dataset.copy) return;
    navigator.clipboard?.writeText(button.dataset.copy).then(() => {
      const label = button.querySelector('.copy-text');
      if (!label) return;
      const original = label.textContent;
      label.textContent = 'Copied';
      button.classList.add('is-copied');
      setTimeout(() => { label.textContent = original; button.classList.remove('is-copied'); }, 1800);
    }).catch(() => {});
  });

  /* ---------- Reveal on scroll and count-up figures ---------- */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('motion');
    const reveal = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        reveal.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    document.querySelectorAll('.reveal').forEach(el => reveal.observe(el));

    const counters = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        counters.unobserve(entry.target);
        const el = entry.target, end = Number(el.dataset.countup), start = performance.now();
        const tick = now => {
          const k = Math.min(1, (now - start) / 900);
          el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.6 });
    document.querySelectorAll('[data-countup]').forEach(el => counters.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
  }
})();

/* ---------- Image placement and accessible full-size viewer ---------- */
(() => {
  const images = [...document.querySelectorAll('[data-expand-image], .prose img')];
  document.querySelectorAll('[data-focal-x] img').forEach(img => {
    const frame = img.closest('[data-focal-x]');
    img.style.objectPosition = `${Number(frame.dataset.focalX ?? 50)}% ${Number(frame.dataset.focalY ?? 50)}%`;
  });
  document.querySelectorAll('.media-frame img').forEach(img => {
    const fail = () => img.classList.add('is-broken');
    img.addEventListener('error', fail);
    if (img.complete && img.naturalWidth === 0) fail();
    const done = () => img.closest('.media-frame')?.classList.add('is-loaded');
    if (img.complete && img.naturalWidth) done(); else img.addEventListener('load', done);
  });
  document.querySelectorAll('.prose img').forEach(img => {
    img.addEventListener('error', () => img.classList.add('is-broken'));
    if (img.complete && img.naturalWidth === 0) img.classList.add('is-broken');
  });
  if (!images.length) return;

  for (const img of images) {
    const trigger = img.closest('.image-expand') || img;
    trigger.tabIndex = 0;
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('aria-label', 'Expand image: ' + (img.alt || 'figure'));
  }
  const dialog = document.createElement('dialog');
  dialog.className = 'image-dialog';
  dialog.setAttribute('aria-label', 'Image viewer');
  dialog.innerHTML = '<div class="dialog-bar"><p class="dialog-counter"></p><button type="button" data-close-image>Close</button></div><figure><img alt=""><figcaption></figcaption></figure><div class="dialog-controls"><button type="button" data-prev-image>Previous</button><a target="_blank" rel="noopener noreferrer">Open original</a><button type="button" data-next-image>Next</button></div>';
  document.body.append(dialog);
  let source, index = 0, group = [];
  const show = () => {
    const img = group[index];
    const view = dialog.querySelector('img');
    view.src = img.dataset.original || img.src;
    view.alt = img.alt;
    dialog.querySelector('figcaption').textContent = img.dataset.caption || img.alt || '';
    dialog.querySelector('a').href = img.dataset.original || img.src;
    dialog.querySelector('.dialog-counter').textContent = group.length > 1 ? `${index + 1} of ${group.length}` : '';
    dialog.querySelector('[data-prev-image]').hidden = dialog.querySelector('[data-next-image]').hidden = group.length < 2;
  };
  const open = img => {
    source = img.closest('.image-expand') || img;
    group = img.closest('.gallery') ? [...img.closest('.gallery').querySelectorAll('img')] : [img];
    index = group.indexOf(img);
    show();
    dialog.showModal();
  };
  const step = d => { index = (index + d + group.length) % group.length; show(); };
  images.forEach(img => {
    img.addEventListener('click', event => { event.preventDefault(); open(img); });
    (img.closest('.image-expand') || img).addEventListener('keydown', event => {
      if (['Enter', ' '].includes(event.key)) { event.preventDefault(); open(img); }
    });
  });
  dialog.querySelector('[data-close-image]').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-prev-image]').addEventListener('click', () => step(-1));
  dialog.querySelector('[data-next-image]').addEventListener('click', () => step(1));
  dialog.addEventListener('close', () => source?.focus());
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') step(1);
    if (event.key === 'ArrowLeft') step(-1);
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });

  /* ---------- Report Issue Dialog ---------- */
  const reportBtn = document.querySelector('[data-report-issue]');
  const reportDialog = document.getElementById('report-issue-dialog');
  if (reportBtn && reportDialog) {
    reportBtn.addEventListener('click', () => {
      // Auto-fill the current URL so we know what page they are reporting
      const urlInput = reportDialog.querySelector('.report-url-input');
      if (urlInput) urlInput.value = window.location.href;
      reportDialog.showModal();
    });
    const closeBtn = reportDialog.querySelector('[data-close-report]');
    if (closeBtn) closeBtn.addEventListener('click', () => reportDialog.close());
    
    // Close on clicking outside
    reportDialog.addEventListener('click', event => {
      if (event.target === reportDialog) reportDialog.close();
    });
  }

  /* ---------- Contact Form AJAX Submission ---------- */
  const web3forms = document.querySelectorAll('.web3form');
  web3forms.forEach(form => {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = 'Sending...';
      btn.disabled = true;
      
      const formData = new FormData(form);
      formData.delete('redirect');
      
      const object = Object.fromEntries(formData);
      const json = JSON.stringify(object);
      
      try {
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: json
        });
        if (response.ok) {
          const successDialog = document.createElement('dialog');
          successDialog.className = 'form-success-dialog';
          successDialog.innerHTML = '<div class="dialog-content"><h3>Report Sent!</h3><p>Thank you for letting us know. We will look into it.</p><button type="button" class="button">Close</button></div>';
          
          if (form.classList.contains('web3form-report')) {
            reportDialog.close();
          } else {
            successDialog.innerHTML = '<div class="dialog-content"><h3>Message Sent!</h3><p>Thank you for reaching out. We have received your message and will get back to you shortly.</p><button type="button" class="button">Close</button></div>';
          }
          
          document.body.append(successDialog);
          successDialog.showModal();
          successDialog.querySelector('button').addEventListener('click', () => {
            successDialog.close();
            successDialog.remove();
          });
          form.reset();
        } else {
          alert('Something went wrong. Please try again.');
        }
      } catch (error) {
        alert('Error sending message. Please check your connection and try again.');
      }
      btn.textContent = originalText;
      btn.disabled = false;
    });
  });
})();
