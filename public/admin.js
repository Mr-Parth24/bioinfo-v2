/**
 * Professional Content Studio Controller (2026 Edition)
 * Schema-driven forms, structured fieldsets, drag-and-drop URL & file ingest,
 * inline validation, real-time filtering, focal-point crop studio, and audit revisions.
 */
(async () => {
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const titleCase = value => String(value || '').split(/[-_\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // 1. Handle Login Form
  const login = $('#login-form');
  if (login) {
    login.addEventListener('submit', async event => {
      event.preventDefault();
      const button = login.querySelector('button');
      button.disabled = true;
      $('#login-error').textContent = '';
      try {
        const formData = Object.fromEntries(new FormData(login));
        formData.email = String(formData.email || '').trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) throw new Error('Enter a valid email address.');
        if (!formData.password || formData.password.length < 14) throw new Error('Password must be at least 14 characters.');
        const r = await fetch('/admin/api/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        location.reload();
      } catch (error) {
        $('#login-error').textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
    return;
  }

  if (!$('#collections')) return;

  let session, records = [], collection = 'news', current = null, dirty = false;
  let statusFilter = '', categoryFilter = '', sortOrder = 'updated';
  let pendingDeleteRecord = null;

  const notice = (message, error = false) => {
    const n = $('#studio-notice');
    if (!n) return;
    n.textContent = message;
    n.hidden = false;
    n.className = 'studio-notice' + (error ? ' error' : ' success');
    n.onclick = () => { n.hidden = true; };
    if (!error) setTimeout(() => { n.hidden = true; }, 5000);
  };

  async function api(path, options = {}) {
    const headers = {
      ...(options.body instanceof File ? {} : { 'content-type': 'application/json' }),
      ...(session ? { 'x-csrf-token': session.csrf } : {}),
      ...options.headers
    };
    const result = await fetch('/admin/api/' + path, { ...options, headers });
    let data;
    try { data = await result.json(); } catch { throw new Error('The server could not complete the request. Try again.'); }
    if (!result.ok) {
      if (result.status === 401) notice('Your session expired. Sign in again to continue.', true);
      throw new Error(data.error || 'Request failed.');
    }
    return data;
  }

  try {
    session = await api('session');
    records = await api('records');
  } catch (error) {
    notice(error.message, true);
    return;
  }

  const labels = {
    news: 'News',
    events: 'Events',
    publications: 'Publications',
    people: 'People Directory',
    research: 'Research Areas',
    tools: 'Tools & Databases',
    pages: 'Site Pages',
    opportunities: 'Opportunities',
    settings: 'Homepage & Director'
  };

  const ICONS = {
    news: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8m8-4h-8m2-4h-2"/></svg>`,
    events: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><circle cx="8" cy="14" r="1"/><circle cx="12" cy="14" r="1"/><circle cx="16" cy="14" r="1"/></svg>`,
    publications: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10M6 14h6"/></svg>`,
    people: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    research: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24m5.66 5.66 4.24 4.24m-9.9 0 4.24-4.24m5.66-5.66 4.24-4.24"/></svg>`,
    tools: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="m14.7 10.7 5.3 5.3a2 2 0 0 1-2.8 2.8l-5.3-5.3"/><path d="M12.9 6.1a4 4 0 0 0-5.8 5.8l-4 4a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l4-4a4 4 0 0 0 5.8-5.8l-3-3Z"/></svg>`,
    opportunities: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    pages: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`
  };

  const GROUPS = [
    { title: 'Editorial Content', collections: ['news', 'events', 'publications', 'research', 'tools', 'opportunities'] },
    { title: 'Personnel & Team', collections: ['people'] },
    { title: 'Site & Infrastructure', collections: ['pages', 'settings'] }
  ];

  function nav() {
    let html = '';
    for (const group of GROUPS) {
      const groupCols = session.collections.filter(c => group.collections.includes(c));
      if (!groupCols.length) continue;
      html += `<div class="nav-group-label">${group.title}</div><div class="nav-group-items">`;
      for (const c of groupCols) {
        const count = records.filter(r => r.collection === c).length;
        html += `
          <button type="button" class="sidebar-nav-item${collection === c ? ' aria-current' : ''}" data-collection="${c}">
            <span class="nav-item-left">
              <span class="nav-icon">${ICONS[c] || ''}</span>
              <span class="nav-label">${labels[c] || titleCase(c)}</span>
            </span>
            <span class="count-badge">${count}</span>
          </button>
        `;
      }
      html += `</div>`;
    }
    $('#collections').innerHTML = html;
  }

  const fields = () => current?.collection === 'settings' ? session.settingsFields[current.id] : session.collectionFields[collection];

  function updateCategoryFilterDropdown() {
    const catSelect = $('#category-filter-select');
    if (!catSelect) return;
    const existingCats = [...new Set(records.filter(r => r.collection === collection).map(r => r.category).filter(Boolean))];
    const suggestionCats = session.fields.category?.suggestions?.[collection] || [];
    const allCats = [...new Set([...suggestionCats, ...existingCats])].filter(Boolean);

    catSelect.innerHTML = `<option value="">All Categories (${allCats.length ? allCats.length : 'All'})</option>` +
      allCats.map(c => `<option value="${escape(c)}"${categoryFilter === c ? ' selected' : ''}>${escape(c)}</option>`).join('');
  }

  function list() {
    $('#record-list').hidden = false;
    $('#record-editor').hidden = true;
    $('#collection-title').textContent = labels[collection] || titleCase(collection);
    $('#new-record').hidden = collection === 'settings';
    current = null;
    dirty = false;
    nav();
    updateCategoryFilterDropdown();

    const query = ($('#record-search').value || '').toLowerCase().trim();
    const colRecords = records.filter(r => r.collection === collection);

    const filtered = colRecords
      .filter(r => {
        const matchesQuery = !query || `${r.title} ${r.category} ${r.date} ${r.year} ${r.role} ${r.summary} ${r.authors || ''}`.toLowerCase().includes(query);
        const matchesStatus = !statusFilter || r.status === statusFilter;
        const matchesCategory = !categoryFilter || r.category === categoryFilter;
        return matchesQuery && matchesStatus && matchesCategory;
      })
      .sort((a, b) => {
        if (sortOrder === 'title') return (a.title || '').localeCompare(b.title || '');
        if (sortOrder === 'date') return (b.date || b.year || '').localeCompare(a.date || a.year || '');
        return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      });

    // Update status pills counts
    const allCount = colRecords.length;
    const pubCount = colRecords.filter(r => r.status === 'published').length;
    const draftCount = colRecords.filter(r => r.status === 'draft').length;

    const pillAll = $(`[data-status-filter=""]`);
    const pillPub = $(`[data-status-filter="published"]`);
    const pillDraft = $(`[data-status-filter="draft"]`);
    if (pillAll) pillAll.textContent = `All (${allCount})`;
    if (pillPub) pillPub.textContent = `Published (${pubCount})`;
    if (pillDraft) pillDraft.textContent = `Drafts (${draftCount})`;

    const countBadge = $('#collection-count-badge');
    if (countBadge) countBadge.textContent = `${filtered.length} of ${allCount} items`;

    $('#entries').innerHTML = filtered.length ? filtered.map(r => `
      <div class="entry-card" data-record-id="${escape(r.id)}">
        <div class="entry-main-click" data-edit="${escape(r.id)}">
          <div class="entry-title-row">
            <strong class="entry-title">${escape(r.title || 'Untitled')}</strong>
            <span class="entry-state ${r.status === 'published' ? 'published' : 'draft'}">
              <span class="state-dot"></span>${titleCase(r.status || 'draft')}
            </span>
          </div>
          <div class="entry-meta-row">
            ${r.category ? `<span class="entry-category-tag">${escape(r.category)}</span>` : ''}
            ${r.role ? `<span class="entry-role-tag">${escape(r.role)}</span>` : ''}
            <span class="entry-date-text">${escape(r.date || r.year || (r.startDate ? r.startDate : ''))}</span>
            ${r.updatedAt ? `<span class="entry-updated-text">Updated ${new Date(r.updatedAt).toLocaleDateString()}</span>` : ''}
          </div>
        </div>
        <div class="entry-card-actions">
          <button type="button" class="small-button list-edit-btn" data-edit="${escape(r.id)}" title="Edit entry">Edit ✎</button>
          ${r.collection !== 'settings' ? `
            <button type="button" class="small-button list-dup-btn" data-quick-dup="${escape(r.id)}" title="Duplicate this entry in ${labels[collection]}">Duplicate ⎘</button>
            <button type="button" class="small-button delete-button list-del-btn" data-quick-del="${escape(r.id)}" title="Delete this entry">Delete ✕</button>
          ` : ''}
        </div>
      </div>
    `).join('') : `<div class="empty-state-card"><p>No entries found matching your search or filters.</p><button type="button" class="button" id="reset-filters-btn">Clear all filters</button></div>`;
  }

  // Duplicate helper (creates a draft copy in same collection)
  async function duplicateRecord(sourceRecord) {
    if (!sourceRecord) return;
    const newId = crypto.randomUUID();
    const newSlug = (sourceRecord.slug || newId) + '-copy';
    const defaultRoute = ['news', 'events', 'research', 'people', 'opportunities'].includes(sourceRecord.collection)
      ? '/' + sourceRecord.collection + '/' + newSlug
      : sourceRecord.collection === 'pages' ? '/about/' + newSlug : '';

    const newRecord = {
      ...structuredClone(sourceRecord),
      id: sourceRecord.collection + ':' + newId,
      slug: newSlug,
      route: defaultRoute,
      status: 'draft',
      version: 0,
      title: (sourceRecord.title || 'Untitled') + ' (Copy)'
    };

    newRecord.collection = sourceRecord.collection;
    newRecord.category = sourceRecord.category;

    await edit(newRecord);
    notice(`Duplicated into a draft in ${labels[sourceRecord.collection] || sourceRecord.collection}! Modify details and click "Save changes".`);
  }

  // Delete Dialog Modal Trigger
  function requestDelete(recordToDelete) {
    if (!recordToDelete) return;
    pendingDeleteRecord = recordToDelete;
    const dialog = $('#delete-dialog');
    const msg = $('#delete-dialog-msg');
    if (msg) msg.textContent = `Are you sure you want to delete "${recordToDelete.title || 'this record'}"? This action cannot be undone.`;
    if (dialog) dialog.showModal();
  }

  $('#cancel-delete')?.addEventListener('click', () => {
    $('#delete-dialog')?.close();
    pendingDeleteRecord = null;
  });

  $('#confirm-delete')?.addEventListener('click', async () => {
    if (!pendingDeleteRecord) return;
    const btn = $('#confirm-delete');
    btn.disabled = true;
    try {
      await api('records', { method: 'DELETE', body: JSON.stringify({ id: pendingDeleteRecord.id }) });
      records = records.filter(r => r.id !== pendingDeleteRecord.id);
      notice(`"${pendingDeleteRecord.title || 'Entry'}" was deleted successfully.`);
      $('#delete-dialog')?.close();
      pendingDeleteRecord = null;
      list();
    } catch (error) {
      notice(error.message, true);
    } finally {
      btn.disabled = false;
    }
  });

  function updateImagePreview() {
    const img = $('.image-placement-preview img');
    if (!img) return;
    const url = $('#field-image')?.value || '';
    img.hidden = !url;
    img.src = url || '/assets/favicon.svg';
    const fX = Number($('#field-focalX')?.value ?? 50);
    const fY = Number($('#field-focalY')?.value ?? 50);
    const fit = $('#field-imageFit')?.value || 'cover';
    img.style.objectFit = fit;
    img.style.objectPosition = `${fX}% ${fY}%`;

    let dot = $('.image-placement-preview .focal-dot');
    if (!dot) {
      dot = document.createElement('div');
      dot.className = 'focal-dot';
      $('.image-placement-preview').append(dot);
    }
    dot.style.left = `${fX}%`;
    dot.style.top = `${fY}%`;
    dot.hidden = !url;

    const coords = $('.focal-coords-badge');
    if (coords) coords.textContent = `Focus: ${fX}% X, ${fY}% Y`;
  }

  // Media Library Dialog
  async function chooseImage(key = 'image') {
    try {
      const media = await api('media');
      const dialog = document.createElement('dialog');
      dialog.className = 'media-library-dialog';
      dialog.innerHTML = `
        <div class="dialog-top">
          <div>
            <h2>Media Assets Library</h2>
            <p class="dialog-desc">Select an uploaded image or remove unused files to save storage.</p>
          </div>
          <button type="button" class="small-button" data-close-library>Close ✕</button>
        </div>
        <div class="dialog-search-bar">
          <input type="search" data-media-search placeholder="Search images by filename, title, or record…" autofocus class="styled-input">
        </div>
        <div class="media-library-grid">
          ${media.map((m, i) => `
            <div class="media-library-item" data-search="${escape((m.source || m.url) + ' ' + (m.usage || []).map(x => records.find(r => r.id === x.id)?.title || x.id).join(' '))}">
              <button type="button" data-media-index="${i}" class="media-thumb-btn">
                <img src="${escape(m.url)}" loading="lazy" alt="">
                <span class="media-dim">${m.width ? m.width + ' × ' + m.height : 'Original'}</span>
              </button>
              ${m.usage?.length ? `<details class="media-usage"><summary>Used in ${m.usage.length} place(s)</summary><small>${[...new Set(m.usage.map(u => records.find(r => r.id === u.id)?.title || u.id))].map(escape).join('<br>')}</small></details>` : ''}
              ${!m.builtIn && !m.usage?.length ? `<button type="button" class="small-button delete-media-btn" data-delete-media="${i}">Delete unused</button>` : ''}
            </div>
          `).join('')}
        </div>
      `;
      document.body.append(dialog);

      dialog.querySelector('[data-media-search]').oninput = event => {
        const q = event.target.value.toLowerCase();
        dialog.querySelectorAll('.media-library-item').forEach(item => {
          item.hidden = !item.dataset.search.toLowerCase().includes(q);
        });
      };
      dialog.querySelector('[data-close-library]').onclick = () => dialog.close();
      dialog.addEventListener('close', () => dialog.remove());

      dialog.onclick = async event => {
        const selected = event.target.closest('[data-media-index]');
        if (selected) {
          const picked = media[Number(selected.dataset.mediaIndex)];
          if (key === 'gallery') {
            addGalleryImage(picked.url);
            dirty = true;
            dialog.close();
            return;
          }
          if ($('#field-image')) {
            $('#field-image').value = picked.url;
            if (current) {
              current.imageOriginal = picked.source || picked.url;
              current.imageWidth = picked.width;
              current.imageHeight = picked.height;
              current.imageVariants = picked.variants || [];
            }
            dirty = true;
            updateImagePreview();
          }
          dialog.close();
          return;
        }
        const del = event.target.closest('[data-delete-media]');
        if (del && confirm('Permanently delete this unused uploaded image?')) {
          try {
            await api('media', { method: 'DELETE', body: JSON.stringify({ url: media[Number(del.dataset.deleteMedia)].url }) });
            del.closest('.media-library-item').remove();
            notice('Image deleted.');
          } catch (err) {
            notice(err.message, true);
          }
        }
      };
      dialog.showModal();
    } catch (error) {
      notice(error.message, true);
    }
  }

  function discard() {
    return !dirty || confirm('You have unsaved changes. Discard them?');
  }

  // Sidebar Collection Switching
  $('#collections').addEventListener('click', event => {
    const button = event.target.closest('[data-collection]');
    if (button && discard()) {
      collection = button.dataset.collection;
      statusFilter = '';
      categoryFilter = '';
      $('#record-search').value = '';
      document.querySelectorAll('.status-pill').forEach(p => p.classList.toggle('is-active', p.dataset.statusFilter === ''));
      list();
    }
  });

  // Open Media Library directly from sidebar
  $('#open-media-library')?.addEventListener('click', () => chooseImage());

  // Status Filter Pills
  document.addEventListener('click', event => {
    const pill = event.target.closest('.status-pill');
    if (pill) {
      document.querySelectorAll('.status-pill').forEach(p => p.classList.remove('is-active'));
      pill.classList.add('is-active');
      statusFilter = pill.dataset.statusFilter;
      list();
    }
  });

  // Category Filter Select
  $('#category-filter-select')?.addEventListener('change', event => {
    categoryFilter = event.target.value;
    list();
  });

  // Sort Order Select
  $('#sort-select')?.addEventListener('change', event => {
    sortOrder = event.target.value;
    list();
  });

  // Reset Filters
  document.addEventListener('click', event => {
    if (event.target.id === 'reset-filters-btn') {
      statusFilter = '';
      categoryFilter = '';
      $('#record-search').value = '';
      document.querySelectorAll('.status-pill').forEach(p => p.classList.toggle('is-active', p.dataset.statusFilter === ''));
      list();
    }
  });

  // Entry Row Click Handlers
  $('#entries').addEventListener('click', event => {
    const editTarget = event.target.closest('[data-edit]');
    if (editTarget) {
      const rec = records.find(r => r.id === editTarget.dataset.edit);
      if (rec) edit(rec);
      return;
    }

    const dupTarget = event.target.closest('[data-quick-dup]');
    if (dupTarget) {
      event.stopPropagation();
      const rec = records.find(r => r.id === dupTarget.dataset.quickDup);
      if (rec) duplicateRecord(rec);
      return;
    }

    const delTarget = event.target.closest('[data-quick-del]');
    if (delTarget) {
      event.stopPropagation();
      const rec = records.find(r => r.id === delTarget.dataset.quickDel);
      if (rec) requestDelete(rec);
      return;
    }
  });

  $('#record-search').addEventListener('input', list);
  $('#back-list').addEventListener('click', () => { if (discard()) list(); });

  $('#new-record').addEventListener('click', () => {
    const id = crypto.randomUUID();
    const isPeople = collection === 'people';
    const isPub = collection === 'publications';
    const defaultRoute = ['news', 'events', 'research', 'people', 'opportunities'].includes(collection)
      ? '/' + collection + '/' + id
      : collection === 'pages' ? '/about/' + id : '';

    edit({
      id: collection + ':' + id,
      collection,
      slug: id,
      title: '',
      summary: '',
      body: '',
      status: 'draft',
      version: 0,
      route: defaultRoute,
      link: '',
      category: isPub ? 'Papers' : (session.fields.category?.suggestions?.[collection]?.[0] || ''),
      memberStatus: isPeople ? 'current' : undefined,
      focalX: 50,
      focalY: 50,
      imageFit: 'cover'
    });
  });

  function addGalleryImage(url) {
    $('#field-gallery .gallery-edit-rows').insertAdjacentHTML('beforeend', galleryRow(url));
  }

  function galleryRow(url) {
    return `
      <div class="gallery-edit-row">
        <img src="${escape(url)}" alt="Gallery image">
        <input type="hidden" data-gallery-url value="${escape(url)}">
        <button type="button" class="small-button" data-remove-gallery>Remove</button>
      </div>
    `;
  }

  function linkRow(value = { type: '', link: '' }) {
    return `
      <div class="link-row">
        <label class="link-label-field">
          <span>Label / Resource Name</span>
          <input type="text" data-link-label maxlength="300" placeholder="e.g. GitHub / Documentation" value="${escape(value.type)}" required class="styled-input">
        </label>
        <label class="link-url-field">
          <span>URL Destination (Drop or paste URL)</span>
          <input type="url" data-link-url placeholder="https://…" value="${escape(value.link)}" required class="styled-input">
        </label>
        <button type="button" class="small-button delete-button" data-remove-link title="Remove link">✕</button>
      </div>
    `;
  }

  function rowHTML(value = { title: '', date: '', description: '', link: '' }) {
    return `
      <div class="profile-edit-row">
        <div class="profile-row-header">
          <label><span>Degree / Position / Award Title *</span><input data-row-title placeholder="e.g. Ph.D. in Bioinformatics" value="${escape(value.title)}" required class="styled-input"></label>
          <label><span>Year / Period</span><input data-row-date placeholder="e.g. 2022–Present" value="${escape(value.date)}" class="styled-input"></label>
        </div>
        <label><span>Institution / Description</span><textarea data-row-description rows="2" placeholder="e.g. Utah State University" class="styled-input">${escape(value.description)}</textarea></label>
        <label><span>Related URL (Drop or paste URL)</span><input type="url" data-row-link placeholder="https://…" value="${escape(value.link)}" class="styled-input"></label>
        <div class="profile-row-actions">
          <button type="button" class="small-button" data-move-row="up">↑ Move Up</button>
          <button type="button" class="small-button" data-move-row="down">↓ Move Down</button>
          <button type="button" class="small-button delete-button" data-remove-row>Remove Entry</button>
        </div>
      </div>
    `;
  }

  function renderRelationPicker(key, field, value) {
    const name = 'field-' + key;
    const isOrdered = !!field.ordered;
    const targetCols = Array.isArray(field.collection) ? field.collection : [field.collection];
    const available = records.filter(r => targetCols.includes(r.collection));
    const selectedIds = Array.isArray(value) ? value : [];
    
    const orderedList = isOrdered
      ? [...selectedIds.map(id => available.find(r => r.id === id)).filter(Boolean), ...available.filter(r => !selectedIds.includes(r.id))]
      : [...available].sort((a, b) => (selectedIds.includes(b.id) ? 1 : 0) - (selectedIds.includes(a.id) ? 1 : 0));

    const selectedRecords = selectedIds.map(id => records.find(r => r.id === id)).filter(Boolean);

    return `
      <div id="${name}" class="relation-picker-card" data-ordered="${isOrdered}">
        <div class="relation-picker-top">
          <input type="search" data-relation-search placeholder="Filter ${escape(field.label.toLowerCase())}…" class="relation-search-input styled-input">
          <span class="relation-count-badge" data-selected-count>${selectedIds.length} selected</span>
        </div>
        
        <div class="relation-selected-chips" data-chips>
          ${selectedRecords.map(r => `
            <span class="relation-chip" data-chip-id="${escape(r.id)}">
              <span class="chip-text">${escape(r.title)}</span>
              <button type="button" class="chip-remove" data-uncheck="${escape(r.id)}" title="Remove">✕</button>
            </span>
          `).join('')}
        </div>

        <div class="relation-options-scroll">
          ${orderedList.map(r => {
            const isChecked = selectedIds.includes(r.id);
            return `
              <label class="relation-option-card ${isChecked ? 'is-selected' : ''}" data-rel-id="${escape(r.id)}">
                <input type="checkbox" value="${escape(r.id)}"${isChecked ? ' checked' : ''}>
                <div class="rel-info">
                  <span class="rel-title">${escape(r.title)}</span>
                  <small class="rel-meta">${[r.collection, r.category, r.year || r.date].filter(Boolean).map(escape).join(' · ')}${r.status === 'draft' ? ' (Draft)' : ''}</small>
                </div>
                ${isOrdered ? `
                  <div class="rel-order-btns">
                    <button type="button" data-order="up" title="Move up" class="small-button">↑</button>
                    <button type="button" data-order="down" title="Move down" class="small-button">↓</button>
                  </div>
                ` : ''}
              </label>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function fieldHTML(key) {
    const field = session.fields[key];
    if (!field) return '';
    const name = 'field-' + key;
    let value = current[key];

    if (value === undefined || value === null) {
      if (['range'].includes(field.type)) value = 50;
      else if (field.type === 'number') value = key === 'feedCount' ? 3 : 0;
      else if (key === 'memberStatus') value = current.category?.split(/\s*\/\s*/).includes('Alumni') ? 'alumni' : 'current';
      else if (key === 'imageFit') value = 'cover';
      else value = '';
    }

    let control = '';

    if (field.type === 'richtext') {
      control = `
        <div class="rich-editor-wrapper">
          <div class="format-toolbar" role="toolbar" aria-label="Formatting for ${escape(field.label)}">
            <button type="button" data-format="bold" title="Bold"><strong>B</strong></button>
            <button type="button" data-format="italic" title="Italic"><em>I</em></button>
            <button type="button" data-format="insertUnorderedList" title="Bullet list">• List</button>
            <button type="button" data-format="insertOrderedList" title="Numbered list">1. List</button>
            <button type="button" data-format="createLink" title="Insert link">Link ↗</button>
            <button type="button" data-format="removeFormat" title="Clear formatting">Clear format</button>
          </div>
          <div id="${name}" class="rich-content" contenteditable="true" role="textbox" aria-multiline="true" data-rich="${key}">${value}</div>
        </div>
      `;
    } else if (field.type === 'select') {
      control = `
        <select id="${name}" name="${key}" class="styled-select">
          ${field.options.map(o => {
            let optLabel = titleCase(o);
            if (key === 'memberStatus') optLabel = o === 'current' ? 'Current Lab Member' : 'Alumnus / Former Member';
              if (key === 'peopleGroup') optLabel = o === '' ? 'Automatic (from role)' : o;
            if (key === 'status') optLabel = o === 'published' ? 'Published (Live on website)' : 'Draft (Editor only)';
            if (key === 'openingStatus') optLabel = o === 'open' ? 'Open (Accepting applications)' : 'Closed';
            if (key === 'homeVisibility') optLabel = o === 'include' ? 'Eligible for homepage feed' : 'Exclude from homepage feed';
            return `<option value="${o}"${o === value ? ' selected' : ''}>${optLabel}</option>`;
          }).join('')}
        </select>
      `;
    } else if (field.type === 'rows') {
      control = `
        <div id="${name}" class="profile-row-picker">
          <div class="profile-rows">${(Array.isArray(value) ? value : []).map(rowHTML).join('')}</div>
          <button type="button" class="small-button add-row-btn" data-add-row>+ Add Row</button>
        </div>
      `;
    } else if (field.type === 'relations') {
      control = renderRelationPicker(key, field, value);
    } else if (field.type === 'links') {
      control = `
        <div id="${name}" class="link-picker" data-drop-link-container>
          <div class="link-rows">${(Array.isArray(value) ? value : []).map(linkRow).join('')}</div>
          <div class="link-picker-footer">
            <button type="button" class="small-button add-link-btn" data-add-link>+ Add Link</button>
            <span class="drag-hint">Tip: Drag and drop web URLs directly here</span>
          </div>
        </div>
      `;
    } else if (field.type === 'images') {
      control = `
        <div id="${name}" class="gallery-picker">
          <div class="gallery-edit-rows">${(Array.isArray(value) ? value : []).map(galleryRow).join('')}</div>
          <button type="button" class="small-button" data-choose-gallery>Choose Existing Image</button>
        </div>
      `;
    } else if (field.type === 'textarea') {
      control = `<textarea id="${name}" name="${key}" rows="${key === 'summary' ? 3 : 5}" maxlength="${field.max || 12000}" placeholder="Enter ${escape(field.label.toLowerCase())}…" class="styled-input">${escape(value)}</textarea>`;
    } else {
      const inputType = field.type === 'url' ? 'url' : field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : field.type === 'range' ? 'range' : field.type === 'email' ? 'email' : 'text';
      const listId = key === 'category' ? 'categories' : key === 'year' ? 'years' : key === 'department' ? 'departments' : key === 'role' ? 'roles' : '';

      let placeholder = `Enter ${escape(field.label.toLowerCase())}…`;
      if (key === 'department') placeholder = 'e.g. Department of Plants, Soils & Climate';
      else if (key === 'role') placeholder = 'e.g. Graduate Research Assistant';
      else if (key === 'year' || key === 'startYear' || key === 'endYear') placeholder = 'e.g. 2024';
      else if (key === 'email') placeholder = 'e.g. user@usu.edu';
      else if (field.type === 'url') placeholder = 'https://… (or drag & drop URL here)';

      control = `
        <input id="${name}" name="${key}" type="${inputType}"
          ${['range', 'number'].includes(field.type) ? ` min="${field.min ?? 0}" max="${field.maxValue ?? 100}"` : ''}
          value="${escape(value)}"
          ${field.max ? ` maxlength="${field.max}"` : ''}
          ${field.required ? ' required' : ''}
          ${listId ? ` list="${listId}"` : ''}
          placeholder="${placeholder}"
          class="styled-input">
      `;
    }

    if (key === 'category') {
      const suggestions = session.fields.category.suggestions?.[current.collection] || [];
      const existing = [...new Set(records.filter(r => r.collection === current.collection).map(r => r.category).filter(Boolean))];
      const all = [...new Set([...suggestions, ...existing])];
      control += `<datalist id="categories">${all.map(c => `<option value="${escape(c)}">`).join('')}</datalist>`;
    }

    if (key === 'role') {
      const suggestions = [
        'Graduate Research Assistant',
        'PhD Candidate',
        'Postdoctoral Fellow',
        'Bioinformatics Analyst',
        'Software Engineer',
        'Laboratory Technician',
        'Lab Manager',
        'Undergraduate Researcher',
        'Visiting Scholar',
        'Research Scientist'
      ];
      control += `<datalist id="roles">${suggestions.map(r => `<option value="${escape(r)}">`).join('')}</datalist>`;
    }

    if (key === 'department') {
      const suggestions = session.fields.department?.suggestions || [
        'Department of Plants, Soils & Climate',
        'Department of Computer Science',
        'Department of Biology',
        'Department of Animal, Dairy & Veterinary Sciences',
        'Center for Integrated BioSystems',
        'Bioinformatics Facility'
      ];
      control += `<datalist id="departments">${suggestions.map(d => `<option value="${escape(d)}">`).join('')}</datalist>`;
    }

    if (key === 'year') {
      const suggestions = session.fields.year.suggestions || [];
      control += `<datalist id="years">${suggestions.map(y => `<option value="${escape(y)}">`).join('')}</datalist>`;
    }

    if (key === 'image') {
      const defaultRatio = current.id === 'settings:home' ? 'home' : collection === 'people' ? 'portrait' : collection === 'tools' ? 'tool' : 'card';
      control += `
        <div class="image-studio-panel">
          <div class="image-studio-header">
            <span class="image-studio-title">Placement & Focal Point Crop Studio</span>
            <span class="focal-coords-badge">Focus: ${current.focalX ?? 50}% X, ${current.focalY ?? 50}% Y</span>
          </div>
          <div class="image-placement-preview" data-ratio="${defaultRatio}">
            <img alt="Image placement preview">
            <div class="focal-dot" style="left: ${current.focalX ?? 50}%; top: ${current.focalY ?? 50}%;"></div>
          </div>
          <div class="image-studio-controls">
            <div class="preview-ratio-group">
              <span class="ctrl-group-label">Preview Aspect:</span>
              <button type="button" class="small-button" data-preview-ratio="card">Card (16:9)</button>
              <button type="button" class="small-button" data-preview-ratio="portrait">Portrait (1:1)</button>
              <button type="button" class="small-button" data-preview-ratio="banner">Wide Banner</button>
            </div>
            <div class="preview-device-group">
              <span class="ctrl-group-label">Device:</span>
              <button type="button" class="small-button" data-preview-device="desktop">Desktop</button>
              <button type="button" class="small-button" data-preview-device="mobile">Mobile</button>
            </div>
            <div class="preview-action-group">
              <button type="button" class="small-button primary-accent-btn" data-choose-image>Choose from Library</button>
              <button type="button" class="small-button delete-button" data-remove-image>Remove Image</button>
            </div>
          </div>
          <p class="image-studio-help">Click anywhere on the preview above to set the focal center when cropped on responsive devices.</p>
        </div>
      `;
    }

    if (key === 'image' || key === 'gallery') {
      control += `
        <label class="upload-dropzone" data-upload-dropzone>
          <span class="upload-icon"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg></span>
          <span class="upload-text"><strong>Click to browse</strong> or drag & drop image files here</span>
          <span class="upload-subtext">PNG, JPG, WebP up to 10MB</span>
          <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" data-upload="${key}"${key === 'gallery' ? ' multiple' : ''}>
        </label>
      `;
    }

    const fullWidthKeys = [
      'education', 'appointments', 'awards', 'image', 'featuredIds', 'eventIds', 'opportunityIds',
      'body', 'summary', 'gallery', 'social', 'authors', 'publicationIds', 'toolIds', 'workLinks',
      'researchInterests', 'resourceLinks', 'affiliationLinks', 'researchIds', 'peopleIds', 'address', 'footerText'
    ];

    return `
      <div class="editor-field ${fullWidthKeys.includes(key) ? 'full-width' : ''}">
        <label id="label-${key}" for="${name}" class="field-label">
          <span>${escape(field.label)}</span>
          ${field.required ? '<span class="required-mark">*</span>' : ''}
        </label>
        ${control}
      </div>
    `;
  }

  function getFormSections(col, recId) {
    if (recId === 'settings:director') {
      return [
        { title: 'Director Profile & Biography', keys: ['title', 'summary', 'body', 'email', 'phone', 'social'] },
        { title: 'Profile Photo & Focal Studio', keys: ['image', 'imageAlt', 'imageFit', 'focalX', 'focalY'] },
        { title: 'Academic Career & Recognition', keys: ['education', 'appointments', 'awards'] },
        { title: 'Connected Scholarship', keys: ['publicationIds'] },
        { title: 'Publishing', keys: ['status'] }
      ];
    }
    if (recId === 'settings:home') {
      return [
        { title: 'Homepage Hero & Announcement', keys: ['title', 'summary', 'announcement', 'announcementLink', 'primaryLabel', 'primaryLink', 'secondaryLabel', 'secondaryLink'] },
        { title: 'Hero Artwork & Media', keys: ['image', 'imageAlt', 'imageCaption', 'imageFit', 'focalX', 'focalY'] },
        { title: 'Homepage Feed Selection', keys: ['feedMode', 'feedCount', 'featuredIds', 'eventMode', 'eventIds', 'opportunityMode', 'opportunityIds'] },
        { title: 'Publishing', keys: ['status'] }
      ];
    }
    if (recId === 'settings:site') {
      return [
        { title: 'General Lab & Contact Information', keys: ['title', 'footerText', 'address', 'email', 'phone', 'social'] },
        { title: 'Footer Links & Affiliations', keys: ['resourceLinks', 'affiliationLinks'] },
        { title: 'Publishing', keys: ['status'] }
      ];
    }

    if (col === 'people') {
      return [
        { title: 'Essential Identity & Position', keys: ['title', 'category', 'role', 'department', 'memberStatus', 'peopleGroup', 'email', 'phone', 'startYear', 'endYear'] },
        { title: 'Profile Photo & Focal Studio', keys: ['image', 'imageAlt', 'imageCaption', 'imageFit', 'focalX', 'focalY'] },
        { title: 'Biography & Research Focus', keys: ['researchInterests', 'summary', 'body'] },
        { title: 'Connected Lab Publications & Tools', keys: ['publicationIds', 'toolIds'] },
        { title: 'Academic Qualifications & Career (Optional)', keys: ['education', 'appointments', 'awards', 'dissertationTitle', 'dissertationUrl'] },
        { title: 'Links & Online Profiles', keys: ['social', 'workLinks'] },
        { title: 'Publishing & Website Path', keys: ['route', 'status'] }
      ];
    }
    if (col === 'events') {
      return [
        { title: 'Event Details & Schedule', keys: ['title', 'category', 'startDate', 'endDate', 'date', 'location', 'summary', 'body'] },
        { title: 'Event Artwork & Photo Gallery', keys: ['image', 'imageAlt', 'imageCaption', 'imageFit', 'focalX', 'focalY', 'gallery'] },
        { title: 'Links & Connected Content', keys: ['link', 'researchIds', 'peopleIds', 'publicationIds', 'toolIds'] },
        { title: 'Publishing & Homepage Visibility', keys: ['homeVisibility', 'publishDate', 'route', 'status'] }
      ];
    }
    if (col === 'news') {
      return [
        { title: 'News Article Information', keys: ['title', 'category', 'date', 'summary', 'body'] },
        { title: 'Featured Image & Media', keys: ['image', 'imageAlt', 'imageCaption', 'imageFit', 'focalX', 'focalY'] },
        { title: 'Connected Content & Press Link', keys: ['link', 'researchIds', 'peopleIds', 'publicationIds', 'toolIds'] },
        { title: 'Publishing & Homepage Visibility', keys: ['homeVisibility', 'publishDate', 'route', 'status'] }
      ];
    }
    if (col === 'publications') {
      return [
        { title: 'Publication Citation Details', keys: ['title', 'authors', 'category', 'year', 'date', 'location', 'presentationType', 'link', 'body'] },
        { title: 'Publishing & Homepage Visibility', keys: ['homeVisibility', 'publishDate', 'status'] }
      ];
    }
    if (col === 'tools') {
      return [
        { title: 'Tool Information & Access', keys: ['title', 'category', 'link', 'summary', 'resourceLinks'] },
        { title: 'Tool Logo & Artwork', keys: ['image', 'imageAlt', 'imageCaption', 'imageFit', 'focalX', 'focalY'] },
        { title: 'Connected Research & Team', keys: ['researchIds', 'peopleIds', 'publicationIds'] },
        { title: 'Publishing', keys: ['status'] }
      ];
    }
    if (col === 'research') {
      return [
        { title: 'Research Area Details', keys: ['title', 'summary', 'body'] },
        { title: 'Cover Media', keys: ['image', 'imageAlt', 'imageCaption', 'imageFit', 'focalX', 'focalY'] },
        { title: 'Connected Team, Tools & Papers', keys: ['peopleIds', 'toolIds', 'publicationIds'] },
        { title: 'Publishing & Path', keys: ['route', 'status'] }
      ];
    }
    if (col === 'opportunities') {
      return [
        { title: 'Opportunity & Vacancy Details', keys: ['title', 'category', 'location', 'deadline', 'openingStatus', 'summary', 'body', 'email', 'link'] },
        { title: 'Publishing & Path', keys: ['route', 'status'] }
      ];
    }

    return [
      { title: 'Basic Information', keys: ['title', 'summary', 'body'] },
      { title: 'Media', keys: ['image', 'imageAlt', 'imageCaption', 'gallery'] },
      { title: 'Details & Publishing', keys: ['date', 'year', 'category', 'route', 'status'] }
    ];
  }

  function updateStatusQuickToggle() {
    const wrap = $('#editor-status-quicktoggle');
    if (!wrap) return;
    const isPub = current.status === 'published';
    wrap.innerHTML = `
      <div class="status-quicktoggle-wrap">
        <span class="status-quicktoggle-label">Status:</span>
        <button type="button" class="status-pill-toggle ${isPub ? 'published' : 'draft'}" id="quick-toggle-btn" title="Click to toggle Draft / Published">
          <span class="state-dot"></span>
          <span>${isPub ? 'Published' : 'Draft'}</span>
        </button>
      </div>
    `;
    wrap.querySelector('#quick-toggle-btn').onclick = () => {
      const nextStatus = current.status === 'published' ? 'draft' : 'published';
      current.status = nextStatus;
      const statusSelect = $('#field-status');
      if (statusSelect) statusSelect.value = nextStatus;
      updateStatusQuickToggle();
      dirty = true;
      notice(`Status toggled to ${titleCase(nextStatus)}. Remember to save.`);
    };
  }

  async function edit(record) {
    if (record.id === 'pages:rakesh') {
      collection = 'settings';
      record = records.find(r => r.id === 'settings:director') || record;
    }
    current = structuredClone(record);
    dirty = false;
    $('#record-list').hidden = true;
    $('#record-editor').hidden = false;
    $('#studio-notice').hidden = true;

    $('#editor-title').textContent = current.version ? 'Edit ' + (labels[collection] || collection) : 'New ' + (labels[collection] || collection);
    const breadcrumb = $('#editor-breadcrumb');
    if (breadcrumb) {
      breadcrumb.textContent = `${labels[collection] || titleCase(collection)} / ${current.title || 'Untitled Entry'}`;
    }
    updateStatusQuickToggle();

    const f = fields();
    const sections = getFormSections(collection, current.id);
    const assignedKeys = new Set(sections.flatMap(s => s.keys));
    let html = '';

    for (const section of sections) {
      const sectionFields = f.filter(k => section.keys.includes(k));
      if (sectionFields.length) {
        html += `
          <fieldset class="editor-fieldset">
            <legend class="editor-legend">${section.title}</legend>
            <div class="fieldset-grid">${sectionFields.map(fieldHTML).join('')}</div>
          </fieldset>
        `;
      }
    }

    const remaining = f.filter(k => !assignedKeys.has(k));
    if (remaining.length) {
      html += `
        <fieldset class="editor-fieldset">
          <legend class="editor-legend">Additional Information</legend>
          <div class="fieldset-grid">${remaining.map(fieldHTML).join('')}</div>
        </fieldset>
      `;
    }

    $('#editor-fields').innerHTML = html;
    updateImagePreview();

    const hiddenSelections = ['featuredIds', 'eventIds', 'opportunityIds']
      .flatMap(key => current[key] || [])
      .map(id => records.find(r => r.id === id))
      .filter(r => r && r.status !== 'published');
    if (hiddenSelections.length) {
      $('#editor-fields').insertAdjacentHTML('beforeend', `<p class="selection-warning">⚠️ Note: Selected draft items will stay hidden publicly until published: ${hiddenSelections.map(r => escape(r.title)).join(', ')}.</p>`);
    }

    const preview = $('#preview-record');
    preview.hidden = !current.version;
    preview.href = '/admin/preview/' + encodeURIComponent(current.id);

    $('#revisions').textContent = current.version ? 'Loading revisions…' : 'Revisions appear after saving.';
    if (current.version) {
      try {
        const revisions = await api('revisions?id=' + encodeURIComponent(current.id));
        $('#revisions').innerHTML = revisions.map(r => `
          <div class="revision">
            <span>Version ${r.version} · ${escape(r.actor)}<small>${escape(new Date(r.createdAt).toLocaleString())}</small></span>
            <button type="button" class="small-button" data-restore="${r.version}">Restore this version</button>
          </div>
        `).join('');
        $('#revisions').onclick = event => {
          const btn = event.target.closest('[data-restore]');
          if (!btn || !discard()) return;
          const rev = revisions.find(r => r.version === Number(btn.dataset.restore));
          edit({ ...rev.data, version: current.version });
          dirty = true;
          notice('Previous version loaded into editor. Click "Save changes" to restore.');
        };
      } catch (error) {
        $('#revisions').textContent = error.message;
      }
    }

    $('#editor-title').scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  // Handle Duplication & Deletion inside the editor
  $('#record-editor').addEventListener('click', async event => {
    const dup = event.target.closest('#duplicate-record');
    if (dup) {
      duplicateRecord(current);
      return;
    }

    const del = event.target.closest('#delete-record');
    if (del) {
      requestDelete(current);
      return;
    }
  });

  // URL Normalization & Auto-Correction
  function normalizeUrl(val) {
    if (!val) return '';
    val = String(val).trim().replace(/^["'<]+|["'>]+$/g, '');
    try {
      if (/^https?:\/\//i.test(val)) {
        const u = new URL(val);
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'].forEach(p => u.searchParams.delete(p));
        return u.toString();
      }
    } catch {}
    if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(val)) {
      return 'https://' + val;
    }
    return val;
  }

  function deduceLabelFromUrl(url) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      if (host.includes('github.com')) return 'GitHub';
      if (host.includes('scholar.google.com')) return 'Google Scholar';
      if (host.includes('orcid.org')) return 'ORCID';
      if (host.includes('researchgate.net')) return 'ResearchGate';
      if (host.includes('linkedin.com')) return 'LinkedIn';
      if (host.includes('twitter.com') || host.includes('x.com')) return 'X / Twitter';
      if (host.includes('youtube.com') || host.includes('youtu.be')) return 'YouTube';
      if (host.includes('usu.edu')) return 'USU Resource';
      return host.replace(/^www\./, '');
    } catch {
      return 'External Resource';
    }
  }

  function pulseSuccess(element) {
    element.classList.add('pulse-success');
    setTimeout(() => element.classList.remove('pulse-success'), 1200);
  }

  // Client-Side Input Validation
  function validateField(input) {
    if (!input) return true;
    const name = input.name || input.dataset.rich || input.id?.replace('field-', '');
    const val = input.value !== undefined ? String(input.value).trim() : input.innerText?.trim() || '';
    let errorMsg = '';

    // Title / Name required
    if (name === 'title' && !val) {
      errorMsg = 'A title or name is required.';
    }
    // URL fields
    else if ((input.type === 'url' || name === 'link' || name === 'dissertationUrl' || name === 'primaryLink' || name === 'secondaryLink' || input.dataset.linkUrl !== undefined || input.dataset.rowLink !== undefined) && val) {
      if (!/^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(val)) {
        errorMsg = 'Please enter a valid URL starting with https:// or /path.';
      }
    }
    // Tool destination
    else if (current?.collection === 'tools' && name === 'link') {
      if (!val) errorMsg = 'Tools require an absolute HTTP or HTTPS destination.';
      else if (!/^https?:\/\//i.test(val)) errorMsg = 'Tools must use an absolute https:// or http:// URL.';
    }
    // Year fields
    else if (['year', 'startYear', 'endYear'].includes(name) && val) {
      if (name === 'year' && current?.collection === 'publications') {
        if (!/^[12][0-9]{3}(?:\s*[-–—]\s*[12][0-9]{3})?(?:\s*\([A-Za-z0-9\s]+\))?$/.test(val)) {
          errorMsg = 'Enter a valid publication year (e.g. 2024 or 2020–2024).';
        }
      } else if (!/^[12][0-9]{3}$/.test(val)) {
        errorMsg = 'Enter a 4-digit year between 1900 and 2099.';
      }
    }
    // Year range check
    else if (name === 'endYear' && val) {
      const start = $('#field-startYear')?.value?.trim();
      if (start && /^[12][0-9]{3}$/.test(start) && Number(val) < Number(start)) {
        errorMsg = 'End year cannot precede start year.';
      }
    }
    // Email
    else if ((input.type === 'email' || name === 'email') && val) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        errorMsg = 'Enter a valid email address (e.g. user@usu.edu).';
      }
    }
    // Route
    else if (name === 'route' && val) {
      if (!val.startsWith('/') || val.includes('//') || !/^\/[a-zA-Z0-9\/-]+$/.test(val)) {
        errorMsg = 'Website path must start with / and use alphanumeric characters and hyphens.';
      }
    }

    const container = input.closest('.editor-field') || input.parentElement;
    let errSpan = container?.querySelector('.field-error-msg');
    if (errorMsg) {
      input.classList.add('has-error');
      if (!errSpan && container) {
        errSpan = document.createElement('span');
        errSpan.className = 'field-error-msg';
        container.append(errSpan);
      }
      if (errSpan) errSpan.textContent = errorMsg;
      return false;
    } else {
      input.classList.remove('has-error');
      if (errSpan) errSpan.remove();
      return true;
    }
  }

  // Real-Time Blur Validation & Normalization
  $('#record-editor').addEventListener('blur', event => {
    const target = event.target;
    if (target.type === 'url' || target.name === 'link' || target.name === 'dissertationUrl' || target.name === 'primaryLink' || target.name === 'secondaryLink' || target.name === 'announcementLink' || target.dataset.linkUrl !== undefined || target.dataset.rowLink !== undefined) {
      const normalized = normalizeUrl(target.value);
      if (normalized !== target.value) {
        target.value = normalized;
        pulseSuccess(target);
        dirty = true;
      }
    }
    validateField(target);
  }, true);

  // Drag and Drop URL & File Handlers across Studio
  document.addEventListener('dragover', event => {
    const dropTarget = event.target.closest('input[type="url"], input[data-link-url], input[data-row-link], .link-picker, .upload-dropzone, .image-placement-preview');
    if (dropTarget) {
      event.preventDefault();
      dropTarget.classList.add('is-dragover');
    }
  });

  document.addEventListener('dragleave', event => {
    const dropTarget = event.target.closest('.is-dragover');
    if (dropTarget && !dropTarget.contains(event.relatedTarget)) {
      dropTarget.classList.remove('is-dragover');
    }
  });

  async function handleDroppedFiles(files, dropzone) {
    if (!files || !files.length) return;
    const isGallery = dropzone.closest('.gallery-picker') !== null;
    const key = isGallery ? 'gallery' : 'image';
    notice('Uploading dropped image…');
    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) throw new Error('Only image files (PNG, JPG, WebP) are accepted.');
        if (file.size > 10 * 1024 * 1024) throw new Error('Image size must be 10 MB or smaller.');
        const data = await api('uploads', {
          method: 'POST',
          headers: { 'content-type': file.type },
          body: file
        });
        if (key === 'image') {
          if (current) {
            current.imageOriginal = data.url;
            current.imageWidth = data.width;
            current.imageHeight = data.height;
            current.imageVariants = data.variants || [];
          }
          if ($('#field-image')) $('#field-image').value = data.url;
          updateImagePreview();
        } else if (key === 'gallery') {
          addGalleryImage(data.url);
        }
      }
      dirty = true;
      notice('Image successfully uploaded and placed!');
    } catch (err) {
      notice(err.message, true);
    }
  }

  document.addEventListener('drop', async event => {
    const target = event.target;
    const dropzone = target.closest('.upload-dropzone, .image-placement-preview');
    const urlInput = target.closest('input[type="url"], input[data-link-url], input[data-row-link]');
    const linkPicker = target.closest('.link-picker');

    if (dropzone) {
      dropzone.classList.remove('is-dragover');
      if (event.dataTransfer.files?.length) {
        event.preventDefault();
        await handleDroppedFiles(event.dataTransfer.files, dropzone);
        return;
      }
    }

    if (urlInput) {
      urlInput.classList.remove('is-dragover');
      let text = event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain') || '';
      text = normalizeUrl(text);
      if (text) {
        event.preventDefault();
        urlInput.value = text;
        pulseSuccess(urlInput);
        validateField(urlInput);
        dirty = true;
        notice('URL dropped and normalized!');
        return;
      }
    }

    if (linkPicker) {
      linkPicker.classList.remove('is-dragover');
      let text = event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain') || '';
      text = normalizeUrl(text);
      if (text) {
        event.preventDefault();
        const deducedLabel = deduceLabelFromUrl(text);
        linkPicker.querySelector('.link-rows').insertAdjacentHTML('beforeend', linkRow({ type: deducedLabel, link: text }));
        dirty = true;
        notice(`Added link: ${deducedLabel}`);
        return;
      }
    }
  });

  // Handle Input Changes & Auto-Format Dates/Routes
  $('#record-editor').addEventListener('input', event => {
    const target = event.target;
    if (target.matches('[data-relation-search]')) {
      const query = target.value.toLowerCase().trim();
      target.closest('.relation-picker-card').querySelectorAll('.relation-option-card').forEach(row => {
        row.hidden = !row.textContent.toLowerCase().includes(query);
      });
      return;
    }

    if (target.name === 'image') {
      current.imageVariants = [];
      current.imageOriginal = '';
      current.imageWidth = 0;
      current.imageHeight = 0;
    }

    dirty = true;
    updateImagePreview();

    // Auto-generate route slug on new entries
    if (!current?.version && target.name === 'title') {
      const route = $('#field-route');
      const slug = target.value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
      if (route && !route.dataset.manuallyEdited && slug) {
        route.value = (collection === 'pages' ? '/about/' : '/' + collection + '/') + slug;
      }
      const breadcrumb = $('#editor-breadcrumb');
      if (breadcrumb) {
        breadcrumb.textContent = `${labels[collection] || titleCase(collection)} / ${target.value.trim() || 'New Entry'}`;
      }
    }
    if (target.name === 'route') target.dataset.manuallyEdited = 'true';

    // Auto-populate Display Date if start/end dates are picked
    if (target.name === 'startDate' || target.name === 'endDate' || target.name === 'publishDate') {
      const dateField = $('#field-date');
      if (dateField && !dateField.dataset.manuallyEdited) {
        const start = $('#field-startDate')?.value;
        const end = $('#field-endDate')?.value;
        const pub = $('#field-publishDate')?.value;
        const formatD = val => new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(val + 'T12:00:00Z'));
        
        if (start && end && start !== end) {
          try { dateField.value = formatD(start) + ' – ' + formatD(end); } catch {}
        } else if (start) {
          try { dateField.value = formatD(start); } catch {}
        } else if (pub) {
          try { dateField.value = formatD(pub); } catch {}
        }
      }
    }
    if (target.name === 'date') target.dataset.manuallyEdited = 'true';
  });

  // Relation Chip Unchecking
  $('#record-editor').addEventListener('click', event => {
    const uncheckBtn = event.target.closest('[data-uncheck]');
    if (uncheckBtn) {
      const id = uncheckBtn.dataset.uncheck;
      const card = uncheckBtn.closest('.relation-picker-card');
      const checkbox = card?.querySelector(`input[type="checkbox"][value="${id}"]`);
      if (checkbox) {
        checkbox.checked = false;
        checkbox.closest('.relation-option-card')?.classList.remove('is-selected');
      }
      uncheckBtn.closest('.relation-chip')?.remove();
      const countBadge = card?.querySelector('[data-selected-count]');
      if (countBadge) {
        const count = card.querySelectorAll('input[type="checkbox"]:checked').length;
        countBadge.textContent = `${count} selected`;
      }
      dirty = true;
    }
  });

  // Handle Relation Checkbox Toggles
  $('#record-editor').addEventListener('change', event => {
    if (event.target.matches('.relation-option-card input[type="checkbox"]')) {
      const checkbox = event.target;
      const card = checkbox.closest('.relation-picker-card');
      const optionCard = checkbox.closest('.relation-option-card');
      optionCard.classList.toggle('is-selected', checkbox.checked);

      const chipsContainer = card.querySelector('[data-chips]');
      const countBadge = card.querySelector('[data-selected-count]');
      const checkedBoxes = [...card.querySelectorAll('input[type="checkbox"]:checked')];

      if (countBadge) countBadge.textContent = `${checkedBoxes.length} selected`;

      if (chipsContainer) {
        chipsContainer.innerHTML = checkedBoxes.map(cb => {
          const rec = records.find(r => r.id === cb.value);
          const title = rec?.title || cb.value;
          return `
            <span class="relation-chip" data-chip-id="${escape(cb.value)}">
              <span class="chip-text">${escape(title)}</span>
              <button type="button" class="chip-remove" data-uncheck="${escape(cb.value)}" title="Remove">✕</button>
            </span>
          `;
        }).join('');
      }
      dirty = true;
    }
  });

  $('#editor-fields').addEventListener('mousedown', event => {
    if (event.target.closest('[data-format]')) event.preventDefault();
  });

  $('#editor-fields').addEventListener('click', event => {
    if (event.target.closest('[data-choose-gallery]')) { chooseImage('gallery'); return; }
    if (event.target.closest('[data-remove-gallery]')) { event.target.closest('.gallery-edit-row').remove(); dirty = true; return; }
    if (event.target.closest('[data-preview-device]')) { event.target.closest('.image-studio-panel').querySelector('.image-placement-preview').dataset.device = event.target.dataset.previewDevice; return; }
    if (event.target.closest('[data-preview-ratio]')) { event.target.closest('.image-studio-panel').querySelector('.image-placement-preview').dataset.ratio = event.target.dataset.previewRatio; return; }
    if (event.target.closest('[data-choose-image]')) { chooseImage(); return; }
    if (event.target.closest('[data-remove-image]')) {
      $('#field-image').value = '';
      current.imageVariants = [];
      current.imageOriginal = '';
      current.imageWidth = 0;
      current.imageHeight = 0;
      dirty = true;
      updateImagePreview();
      return;
    }
    if (event.target.closest('.image-placement-preview')) {
      const box = event.target.closest('.image-placement-preview');
      const rect = box.getBoundingClientRect();
      if ($('#field-focalX')) $('#field-focalX').value = Math.round((event.clientX - rect.left) / rect.width * 100);
      if ($('#field-focalY')) $('#field-focalY').value = Math.round((event.clientY - rect.top) / rect.height * 100);
      dirty = true;
      updateImagePreview();
      return;
    }
    if (event.target.closest('[data-add-row]')) {
      event.target.closest('.profile-row-picker').querySelector('.profile-rows').insertAdjacentHTML('beforeend', rowHTML());
      dirty = true;
      return;
    }
    if (event.target.closest('[data-remove-row]')) {
      event.target.closest('.profile-edit-row').remove();
      dirty = true;
      return;
    }
    const move = event.target.closest('[data-move-row],[data-order]');
    if (move) {
      const row = move.closest('.profile-edit-row,.relation-option-card');
      const up = (move.dataset.moveRow || move.dataset.order) === 'up';
      if (up && row.previousElementSibling) row.parentElement.insertBefore(row, row.previousElementSibling);
      if (!up && row.nextElementSibling) row.parentElement.insertBefore(row, row.nextElementSibling);
      dirty = true;
      return;
    }
    if (event.target.closest('[data-add-link]')) {
      event.target.closest('.link-picker').querySelector('.link-rows').insertAdjacentHTML('beforeend', linkRow());
      dirty = true;
      return;
    }
    if (event.target.closest('[data-remove-link]')) {
      event.target.closest('.link-row').remove();
      dirty = true;
      return;
    }
    const button = event.target.closest('[data-format]');
    if (!button) return;
    const command = button.dataset.format;
    if (command === 'createLink') {
      const url = prompt('Link URL (https://… or /path):');
      if (!url) return;
      const normalized = normalizeUrl(url);
      if (!/^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(normalized)) {
        notice('Please use a valid https:// URL or internal path.', true);
        return;
      }
      document.execCommand(command, false, normalized);
    } else {
      document.execCommand(command, false, null);
    }
    dirty = true;
  });

  $('#editor-fields').addEventListener('paste', event => {
    if (!event.target.closest('[contenteditable]')) return;
    event.preventDefault();
    document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
    dirty = true;
  });

  $('#editor-fields').addEventListener('change', async event => {
    const target = event.target;
    if (!target.dataset.upload) {
      updateImagePreview();
      return;
    }
    const key = target.dataset.upload;
    target.disabled = true;
    try {
      for (const file of target.files) {
        if (file.size > 10 * 1024 * 1024) throw new Error('Each image must be 10 MB or smaller.');
        notice('Uploading ' + file.name + '…');
        const data = await api('uploads', {
          method: 'POST',
          headers: { 'content-type': file.type },
          body: file
        });
        const field = $('#field-' + key);
        if (key === 'image') {
          current.imageOriginal = data.url;
          current.imageWidth = data.width;
          current.imageHeight = data.height;
          current.imageVariants = data.variants || [];
          if (field) field.value = data.url;
        }
        if (key === 'gallery') addGalleryImage(data.url);
      }
      dirty = true;
      updateImagePreview();
      notice('Image uploaded successfully! Click "Save changes" to apply.');
    } catch (error) {
      notice(error.message, true);
    } finally {
      target.disabled = false;
      target.value = '';
    }
  });

  // Core Record Saving Logic with Pre-Save Form Validation
  async function performSave(returnToList = false) {
    const saveBtn = $('#save-record');
    const closeBtn = $('#save-close-record');

    // Run client-side validation on all active fields
    let hasValidationError = false;
    let firstErrorField = null;

    const allInputs = $('#editor-fields').querySelectorAll('input, select, textarea');
    for (const input of allInputs) {
      if (!validateField(input)) {
        hasValidationError = true;
        if (!firstErrorField) firstErrorField = input;
      }
    }

    if (hasValidationError) {
      notice('Please fix the highlighted errors before saving.', true);
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorField.focus();
      }
      return;
    }

    if (saveBtn) saveBtn.disabled = true;
    if (closeBtn) closeBtn.disabled = true;

    try {
      const record = { ...current };
      for (const key of fields()) {
        const type = session.fields[key].type;
        const field = $('#field-' + key);
        if (!field) continue;
        record[key] = type === 'richtext' ? field.innerHTML : field.value;
        if (['number', 'range'].includes(type)) record[key] = Number(field.value);
        if (type === 'rows') {
          record[key] = [...field.querySelectorAll('.profile-edit-row')].map(row => ({
            title: row.querySelector('[data-row-title]').value.trim(),
            date: row.querySelector('[data-row-date]').value.trim(),
            description: row.querySelector('[data-row-description]').value.trim(),
            link: normalizeUrl(row.querySelector('[data-row-link]').value)
          }));
        }
        if (type === 'images') {
          record[key] = [...field.querySelectorAll('[data-gallery-url]')].map(input => input.value);
        }
        if (type === 'links') {
          record[key] = [...field.querySelectorAll('.link-row')].map(row => ({
            type: row.querySelector('[data-link-label]').value.trim(),
            link: normalizeUrl(row.querySelector('[data-link-url]').value)
          }));
        }
        if (type === 'relations') {
          record[key] = [...field.querySelectorAll('input[type="checkbox"]:checked')].map(input => input.value);
        }
      }

      const saved = await api('records', {
        method: 'POST',
        body: JSON.stringify({ record, version: current.version || 0 })
      });
      const index = records.findIndex(r => r.id === saved.id);
      if (index < 0) records.push(saved);
      else records[index] = saved;

      dirty = false;
      nav();

      const successMsg = saved.status === 'published'
        ? `"${saved.title || 'Entry'}" is now published live on the website!`
        : `"${saved.title || 'Entry'}" draft saved successfully.`;

      if (returnToList) {
        list();
        notice(successMsg + ' Returned to list view.');
      } else {
        await edit(saved);
        notice(successMsg);
      }
    } catch (error) {
      notice(error.message, true);
    } finally {
      if (saveBtn) saveBtn.disabled = false;
      if (closeBtn) closeBtn.disabled = false;
    }
  }

  $('#record-editor').addEventListener('submit', async event => {
    event.preventDefault();
    await performSave(false);
  });

  $('#save-close-record')?.addEventListener('click', async () => {
    await performSave(true);
  });

  $('#logout').addEventListener('click', async () => {
    if (!discard()) return;
    try {
      await api('logout', { method: 'POST', body: '{}' });
      dirty = false;
      location.reload();
    } catch (error) {
      notice(error.message, true);
    }
  });

  $('#export-content').addEventListener('click', () => { location.href = '/admin/api/export'; });
  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });

  list();
})();
