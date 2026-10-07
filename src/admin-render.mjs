/**
 * Server-rendered editor/login shell. public/admin.js supplies forms after session validation. No password or session token is embedded in markup.
 * See docs/architecture.md for the full data flow and extension guide.
 */
import {shell} from './render.mjs';
import {escapeHtml as e} from './security.mjs';
export function adminPage({session,configured}) {
 const body=session?`<section class="wrap admin-heading">
  <div class="admin-brand-block">
    <div class="brand-row">
      <span class="studio-badge">CONTENT STUDIO</span>
      <span class="version-tag">2026</span>
    </div>
    <h1>Lab Content & Knowledge Studio</h1>
    <p>Manage research, personnel, publications, tools, and site information with structured validation.</p>
  </div>
  <div class="admin-account">
    <div class="user-pill">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
      <span class="user-email">${e(session.email)}</span>
    </div>
    <a href="/" target="_blank" rel="noopener" class="small-button preview-site-btn">View Website ↗</a>
    <button class="small-button logout-btn" id="logout">Sign out</button>
  </div>
</section>
<div class="wrap admin-layout">
  <aside class="admin-sidebar">
    <div class="sidebar-section-title">Collections</div>
    <nav aria-label="Content collections" id="collections"></nav>
    <div class="sidebar-footer">
      <button type="button" class="small-button sidebar-action-btn" id="open-media-library"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg> Media Assets</button>
      <button type="button" class="small-button sidebar-action-btn" id="export-content"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> Export Backup</button>
    </div>
  </aside>
  <section class="admin-workspace">
    <div id="studio-notice" role="status" class="studio-notice" hidden></div>
    <div id="record-list">
      <div class="admin-list-heading">
        <div class="list-heading-left">
          <h2 id="collection-title">News</h2>
          <span class="list-total-count" id="collection-count-badge">0 items</span>
        </div>
        <button class="button primary-btn" id="new-record">+ Add New Entry</button>
      </div>
      <div class="list-controls-bar">
        <div class="list-search-wrap">
          <svg class="search-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="search" id="record-search" placeholder="Search by title, role, year, authors, or details…">
        </div>
        <div class="list-filter-group">
          <div class="status-filter-pills" role="tablist">
            <button type="button" class="status-pill is-active" data-status-filter="">All</button>
            <button type="button" class="status-pill" data-status-filter="published">Published</button>
            <button type="button" class="status-pill" data-status-filter="draft">Drafts</button>
          </div>
          <select id="category-filter-select" class="styled-select list-cat-select">
            <option value="">All Categories</option>
          </select>
          <select id="sort-select" class="styled-select list-sort-select">
            <option value="updated">Recently Updated</option>
            <option value="date">Date / Year (Newest)</option>
            <option value="title">Title (A–Z)</option>
          </select>
        </div>
      </div>
      <div id="entries" aria-live="polite"></div>
    </div>
    <form id="record-editor" hidden>
      <div class="editor-heading">
        <div class="editor-nav-left">
          <button type="button" class="small-button back-btn" id="back-list">← Back to list</button>
          <span class="editor-breadcrumb" id="editor-breadcrumb">News / Edit</span>
        </div>
        <div class="editor-actions">
          <button type="button" class="small-button delete-button" id="delete-record">Delete</button>
          <button type="button" class="small-button" id="duplicate-record">Duplicate ⎘</button>
          <a id="preview-record" class="small-button" target="_blank" rel="noopener">Live Preview ↗</a>
          <button type="button" class="small-button" id="save-close-record">Save & Close</button>
          <button type="submit" class="button primary-btn" id="save-record">Save Changes</button>
        </div>
      </div>
      <div class="editor-meta-strip">
        <div>
          <h2 id="editor-title">Edit Entry</h2>
          <p class="editor-help">Drafts are saved privately in the studio. Select Published when ready to go live.</p>
        </div>
        <div class="editor-status-quicktoggle" id="editor-status-quicktoggle"></div>
      </div>
      <div id="editor-fields"></div>
      <details class="revision-panel">
        <summary>Revision History & Audit Log</summary>
        <div id="revisions"></div>
      </details>
    </form>
  </section>
</div>
<dialog id="delete-dialog" class="confirm-dialog">
  <div class="dialog-content">
    <div class="dialog-icon">⚠️</div>
    <div class="dialog-text">
      <h3>Delete Entry Permanently?</h3>
      <p id="delete-dialog-msg">Are you sure you want to delete this record? This action cannot be undone.</p>
    </div>
  </div>
  <div class="dialog-actions">
    <button type="button" class="small-button" id="cancel-delete">Cancel</button>
    <button type="button" class="small-button delete-button" id="confirm-delete">Delete Permanently</button>
  </div>
</dialog>`:
`<section class="login-section"><div class="login-intro"><p class="eyebrow">KAABiL / CONTENT STUDIO</p><h1>Your work.<br>A wider audience.</h1><p>Publish news, share discoveries, and keep the lab’s story up to date.</p></div><div class="login-panel"><h2>Editor sign in</h2>${configured?`<p>Use your individual editor account.</p><form id="login-form"><label>Email address<input type="email" name="email" autocomplete="username" maxlength="254" required></label><label>Password<input type="password" name="password" autocomplete="current-password" minlength="14" maxlength="256" required></label><button class="button" type="submit">Sign in →</button><p id="login-error" role="alert"></p></form>`:'<p>An editor account has not been created yet. Ask the website administrator to set up your account.</p>'}<a href="/" class="text-link">← Back to the website</a></div></section>`;
 return shell('Content Studio',body,{path:'/admin',admin:true});
}
