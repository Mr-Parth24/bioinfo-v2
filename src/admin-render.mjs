/**
 * Server-rendered editor/login shell. public/admin.js supplies forms after session validation. No password or session token is embedded in markup.
 * See docs/architecture.md for the full data flow and extension guide.
 */
import {shell} from './render.mjs';
import {escapeHtml as e} from './security.mjs';
export function adminPage({session,configured}) {
 const body=session?`<header class="studio-bar">
  <div class="studio-bar-inner">
    <a class="studio-brand" href="/admin" aria-label="Content Studio home"><span class="studio-mark">KAABiL</span><span class="studio-name">Content Studio</span></a>
    <div class="admin-account">
      <a href="/" target="_blank" rel="noopener" class="studio-link preview-site-btn">View website ↗</a>
      <span class="user-pill" title="Signed in"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg><span class="user-email">${e(session.email)}</span></span>
      <button class="studio-link logout-btn" id="logout">Sign out</button>
    </div>
  </div>
</header>
<div class="wrap admin-layout">
  <aside class="admin-sidebar">
    <div class="sidebar-section-title">Content</div>
    <nav aria-label="Content collections" id="collections"></nav>
    <div class="sidebar-footer">
      <button type="button" class="small-button sidebar-action-btn" id="open-media-library"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg> Media library</button>
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
        <button class="button primary-btn" id="new-record">+ New entry</button>
      </div>
      <div class="list-controls-bar">
        <div class="list-search-wrap">
          <svg class="search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <label class="sr-only" for="record-search">Search entries</label>
          <input type="search" id="record-search" placeholder="Search titles, people, years, authors…">
        </div>
        <div class="status-filter-pills" role="group" aria-label="Filter by status">
          <button type="button" class="status-pill is-active" data-status-filter="">All</button>
          <button type="button" class="status-pill" data-status-filter="published">Published</button>
          <button type="button" class="status-pill" data-status-filter="draft">Drafts</button>
        </div>
        <label class="sr-only" for="category-filter-select">Filter by category</label>
        <select id="category-filter-select" class="styled-select list-cat-select">
          <option value="">All categories</option>
        </select>
        <label class="sr-only" for="sort-select">Sort entries</label>
        <select id="sort-select" class="styled-select list-sort-select">
          <option value="updated">Recently updated</option>
          <option value="date">Date / year (newest)</option>
          <option value="title">Title (A–Z)</option>
        </select>
      </div>
      <div id="entries" aria-live="polite"></div>
    </div>
    <form id="record-editor" novalidate hidden>
      <div class="editor-heading">
        <div class="editor-nav-left">
          <button type="button" class="small-button back-btn" id="back-list">← Back to list</button>
          <span class="editor-breadcrumb" id="editor-breadcrumb">News / Edit</span>
        </div>
        <div class="editor-actions">
          <button type="button" class="small-button" id="duplicate-record">Duplicate ⎘</button>
          <a id="preview-record" class="small-button" target="_blank" rel="noopener">Live Preview ↗</a>
          <button type="button" class="small-button" id="save-close-record">Save & Close</button>
          <button type="submit" class="button primary-btn" id="save-record">Save Changes</button>
          <button type="button" class="small-button delete-button" id="delete-record">Delete</button>
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
    <section id="media-view" class="media-view" hidden aria-labelledby="media-title"></section>
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
`<section class="login-section"><div class="login-intro"><span class="studio-mark">KAABiL</span><p class="eyebrow">Content Studio</p><h1>Keep the lab’s story up to date.</h1><p>Publish news and events, update people and publications, and manage the homepage — changes go live as soon as you publish.</p></div><div class="login-panel"><h2>Editor sign in</h2>${configured?`<p>Use your individual editor account.</p><form id="login-form"><label>Email address<input type="email" name="email" autocomplete="username" maxlength="254" required></label><label>Password<input type="password" name="password" autocomplete="current-password" minlength="14" maxlength="256" required></label><button class="button" type="submit">Sign in →</button><p id="login-error" role="alert"></p></form>`:'<p>An editor account has not been created yet. Ask the website administrator to set up your account.</p>'}<a href="/" class="text-link">← Back to the website</a></div></section>`;
 return shell('Content Studio',body,{path:'/admin',admin:true});
}
