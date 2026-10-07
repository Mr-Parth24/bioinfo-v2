/**
 * Public presentation layer: page templates and the router. Layout comes from these shared templates;
 * factual content comes from records. Tool services stay on their original hosts.
 * See docs/architecture.md for the data flow and docs/redesign-plan.md for the design rules.
 */
import {
  header, footer, homepage, director, opportunities, related,
  image, pageHeader, breadcrumbs, icons, arrow, asset, media, profileLinks, linkButtons, toneFor,
} from './presentation.mjs';
import { setting, dateValue, activeOpportunities, displayDate } from './editorial.mjs';
import { escapeHtml as e, sanitizeHtml, safeUrl, plainText } from './security.mjs';

export const legacyRedirects = {
  '/admin/run-local': '/guides/run-local',
  '/admin/dev-env': '/guides/dev-env',
  '/admin/scm-setup': '/guides/scm-setup',
};
export const baseRoutes = ['/home', '/search', '/opportunities', '/', '/research', '/research/research-areas', '/people', '/people/our-team', '/people/alumni', '/publications', '/publications/conferences', '/publications/editorials', '/tools', '/news', '/events', '/contact', '/about'];

const DEFAULT_DEPARTMENT = 'Department of Plants, Soils & Climate';

/* ---------- Document shell ---------- */
export function shell(title, body, { path = '/', description = 'Kaundal Artificial Intelligence & Advanced Bioinformatics Lab (KAABiL) at Utah State University: machine learning, multi-omics and open bioinformatics tools.', admin = false, records = [] } = {}) {
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${e(description)}"><meta name="theme-color" content="#0f2439"><link rel="canonical" href="${e(path === '/home' ? '/' : path)}"><title>${e(title)} · KAABiL · Utah State University</title><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="preload" href="/assets/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/assets/fonts/source-serif-4-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/assets/site.css">`;
  if (admin) {
    return `<!doctype html><html lang="en"><head>${head}<link rel="stylesheet" href="/assets/admin.css"><script src="/assets/admin.js" defer></script></head><body class="admin-body"><a class="skip-link" href="#main">Skip to content</a><main id="main">${body}</main></body></html>`;
  }
  return `<!doctype html><html lang="en"><head>${head}<script src="/assets/site.js" defer></script></head><body><a class="skip-link" href="#main">Skip to content</a>${header(path, records)}<main id="main">${body}</main>${footer(records)}<div class="image-announcement sr-only" aria-live="polite"></div></body></html>`;
}

/* ---------- Helpers ---------- */
function linkFor(record, records) {
  const href = record.link || record.route || '';
  if (!href) return record.route || '#';
  if (href.startsWith('/') && !baseRoutes.includes(href.split(/[?#]/)[0].replace(/\/$/, '')) && !records.some(r => r.route === href.replace(/\/$/, ''))) return 'https://bioinfo.usu.edu' + href;
  return safeUrl(href) || '#';
}
const sortDate = records => [...records].sort((a, b) => dateValue(b) - dateValue(a));
const count = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const external = href => /^https?:/i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '';

/** Search + optional category/year filters. site.js drives it through the data-* hooks. */
function filterBar(records, label, { categories = true, years = false, categoryMode = 'select' } = {}) {
  const cats = [...new Set(records.map(r => r.category).filter(Boolean))];
  const ys = [...new Set(records.map(r => r.year || (r.startDate || r.publishDate || r.date)?.match(/\d{4}/)?.[0]).filter(Boolean))].sort().reverse();
  const catControl = !categories ? '' : categoryMode === 'tabs'
    ? `<div class="filter-chips" role="group" aria-label="Filter by category"><label class="chip"><input type="radio" name="category" value="" data-category-filter checked><span>All</span></label>${cats.map(c => `<label class="chip"><input type="radio" name="category" value="${e(c)}" data-category-filter><span>${e(c)}</span></label>`).join('')}</div>`
    : `<label class="select"><span class="sr-only">Filter by category</span><select data-category-filter><option value="">All categories</option>${cats.map(c => `<option>${e(c)}</option>`).join('')}</select></label>`;
  const yearControl = years ? `<label class="select"><span class="sr-only">Filter by year</span><select data-year-filter><option value="">All years</option>${ys.map(y => `<option>${e(y)}</option>`).join('')}</select></label>` : '';
  return `<form class="filter-bar" role="search"><label class="search-field"><span class="sr-only">Search ${e(label)}</span>${icons.search}<input name="q" type="search" placeholder="Search ${e(label)}…" data-search-input autocomplete="off"></label>${categoryMode === 'tabs' ? '' : catControl}${yearControl}<p class="result-count" aria-live="polite"><span data-count>${records.length}</span> ${records.length === 1 ? 'result' : 'results'}</p>${categoryMode === 'tabs' ? catControl : ''}</form><p class="empty-state" data-empty hidden>Nothing matches that search. Try a different word or clear the filters.</p>`;
}

/** Imported article HTML: keep old relative links working and map remote images to local copies. */
function richBody(body, records) {
  let out = sanitizeHtml(body);
  out = out.replace(/href="([^"]+)"/g, (whole, value) => {
    let url = value.replaceAll('&amp;', '&');
    if (!safeUrl(url, { relative: true })) return whole;
    if (url.startsWith('#') || /^[a-z][\w+.-]*:/i.test(url)) return whole;
    if (!url.startsWith('/')) url = '/' + url;
    const path = url.split(/[?#]/)[0].replace(/\/$/, '') || '/';
    if (path.startsWith('/admin/')) url = url.replace('/admin/', '/guides/');
    else if (!baseRoutes.includes(path) && !records.some(r => r.route === path)) url = 'https://bioinfo.usu.edu' + url;
    return `href="${e(url)}"`;
  });
  return out.replace(/src="([^"]+)"/g, (_, url) => `src="${e(asset(url.replaceAll('&amp;', '&')))}"`);
}

const citation = r => plainText((r.authors || 'KAABiL') + '. (' + (r.year || 'n.d.') + '). ' + (r.title || '') + '.' + (r.link ? ' ' + r.link : ''));
const copyButton = (text, label = 'Cite') => `<button type="button" class="copy-button" data-copy="${e(text)}" aria-label="Copy ${label === 'Cite' ? 'citation' : label.toLowerCase()}">${icons.copy}<span class="copy-text">${e(label)}</span></button>`;

/* ---------- Research ---------- */
function researchPage(records) {
  const areas = records.filter(r => r.collection === 'research');
  const overview = records.find(r => r.id === 'pages:research');
  const tools = records.filter(r => r.collection === 'tools').length;
  return pageHeader('Research', 'We combine biology, computer science and engineering to turn complex biological data into new understanding — and share the results as open tools.', 'Research program', {
    aside: `<dl class="header-facts"><div><dt>Research areas</dt><dd>${areas.length}</dd></div><div><dt>Open tools</dt><dd>${tools}</dd></div></dl>`,
  })
    + `<div class="wrap page-body"><ol class="area-rows">${areas.map((r, i) => { const t = relatedOf(r, 'toolIds', 'tools', records).length, p = relatedOf(r, 'publicationIds', 'publications', records).length; return `<li class="area-row reveal"><a class="area-row-media" href="${e(r.route)}" tabindex="-1" aria-hidden="true">${image(r, '', false)}</a><div class="area-row-text"><span class="area-index">${String(i + 1).padStart(2, '0')}</span><h2><a href="${e(r.route)}">${e(r.title)}</a></h2>${r.summary ? `<p>${e(r.summary)}</p>` : ''}${t || p ? `<p class="area-counts">${t ? `<span>${t} ${t === 1 ? 'tool' : 'tools'}</span>` : ''}${p ? `<span>${p} ${p === 1 ? 'paper' : 'papers'}</span>` : ''}</p>` : ''}<a class="link-more" href="${e(r.route)}">Explore this area ${arrow}</a></div></li>`; }).join('')}</ol>`
    + (overview?.body ? `<section class="split-section reveal" id="program"><div class="split-head"><p class="eyebrow">Program</p><h2>Objectives &amp; approach</h2></div><div class="prose">${richBody(overview.body, records)}</div></section>` : '')
    + `</div>`;
}

const relatedOf = (record, key, collection, records) => (record[key] || []).map(id => records.find(r => r.id === id && r.collection === collection && r.status === 'published')).filter(Boolean);

/** A research area: what it is, the numbers, the tools and the papers behind it. */
function researchArea(record, records) {
  const areas = records.filter(r => r.collection === 'research');
  const index = areas.findIndex(r => r.id === record.id);
  const tools = relatedOf(record, 'toolIds', 'tools', records);
  const pubs = relatedOf(record, 'publicationIds', 'publications', records).sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0));
  const years = pubs.map(p => parseInt(p.year)).filter(Boolean);
  const stats = [[tools.length, tools.length === 1 ? 'Tool or database' : 'Tools & databases'], [pubs.length, pubs.length === 1 ? 'Publication' : 'Publications'], [years.length ? (Math.min(...years) === Math.max(...years) ? String(years[0]) : `${Math.min(...years)}–${Math.max(...years)}`) : '', 'Years of published work']].filter(([n]) => n);
  const host = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
  return `<article class="article research-area"><header class="article-header"><div class="wrap">${breadcrumbs([['Research', '/research'], [record.title]])}<div class="area-hero"><div class="article-heading"><p class="eyebrow">Research area ${index >= 0 ? String(index + 1).padStart(2, '0') : ''}</p><h1>${e(record.title)}</h1>${record.summary ? `<p class="lede">${e(record.summary)}</p>` : ''}${stats.length ? `<dl class="profile-stats">${stats.map(([n, l]) => `<div><dd>${e(String(n))}</dd><dt>${l}</dt></div>`).join('')}</dl>` : ''}</div>${record.image ? `<figure class="area-hero-figure">${image(record, 'area-hero-image')}${record.imageCaption ? `<figcaption>${e(record.imageCaption)}</figcaption>` : ''}</figure>` : ''}</div></div></header>`
    + `<div class="wrap area-layout"><div class="area-main">`
    + (record.body ? `<div class="prose">${richBody(record.body, records)}</div>` : `<p class="lede">This research area is part of the lab’s wider program. Explore the related tools and publications below.</p>`)
    + (tools.length ? `<section class="area-section" id="tools"><h2>Tools &amp; databases</h2><div class="table-wrap"><table class="data-table"><thead><tr><th scope="col">Resource</th><th scope="col">What it does</th><th scope="col">Category</th><th scope="col"><span class="sr-only">Open</span></th></tr></thead><tbody>${tools.map(t => `<tr><th scope="row"><a href="${e(t.link)}" target="_blank" rel="noopener noreferrer">${e(t.title)}</a></th><td>${e(t.summary || '')}</td><td><span class="tag">${e(t.category || 'Tool')}</span></td><td><a class="small-link" href="${e(t.link)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${e(t.title)} at ${e(host(t.link))}">Open ${icons.external}</a></td></tr>`).join('')}</tbody></table></div></section>` : '')
    + (pubs.length ? `<section class="area-section" id="publications"><div class="profile-section-head"><h2>Publications</h2><span class="count-badge">${pubs.length}</span></div><ol class="publication-entries compact">${pubs.map(p => publicationRow(p, { compact: true })).join('')}</ol><p><a class="link-more" href="/publications">All publications ${arrow}</a></p></section>` : '')
    + `</div><aside class="area-aside"><div class="aside-panel"><p class="eyebrow">On this page</p><ul class="aside-links"><li><a href="#main">Overview</a></li>${tools.length ? '<li><a href="#tools">Tools &amp; databases</a></li>' : ''}${pubs.length ? '<li><a href="#publications">Publications</a></li>' : ''}</ul></div><div class="aside-panel aside-opportunity"><p class="eyebrow">Work with us</p><p>Students and researchers interested in this area are welcome to get in touch.</p><a class="link-more" href="/opportunities">Opportunities ${arrow}</a></div></aside></div>`
    + `<div class="wrap">${areas.length > 1 ? `<section class="related"><h2>Other research areas</h2><ul class="related-grid">${areas.filter(r => r.id !== record.id).map(r => `<li><a class="glow" href="${e(r.route)}"><span class="tag">Research</span><span class="related-title">${e(r.title)}</span>${arrow}</a></li>`).join('')}</ul></section>` : ''}<p class="back-link"><a href="/research">${icons.back} Back to research</a></p></div></article>`;
}

/* ---------- Tools ---------- */
function toolsPage(records) {
  const tools = records.filter(r => r.collection === 'tools').map(r => ({
    ...r,
    category: r.category || 'Other tools',
    anchor: r.anchor || 'category-' + (r.category || 'other').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  }));
  const groups = [...new Set(tools.map(r => r.category))].map(name => ({ name, tone: toneFor(name), anchor: tools.find(r => r.category === name).anchor, items: tools.filter(r => r.category === name) }));
  const hostOf = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
  const card = r => `<li class="tool-card glow" data-tone="${toneFor(r.category)}" data-item data-category="${e(r.category)}" data-search="${e(r.title + ' ' + r.category + ' ' + (r.summary || ''))}"><a class="tool-card-link" href="${e(r.link)}" target="_blank" rel="noopener noreferrer">`
    + `<div class="tool-window"><div class="tool-window-bar" aria-hidden="true"><i></i><i></i><i></i><span>${e(hostOf(r.link))}</span></div><div class="tool-shot">${r.image ? image({ ...r, imageFit: r.imageFit || 'contain' }, '', false) : `<span class="tool-mark">${e(r.title.slice(0, 2))}</span>`}</div></div>`
    + `<div class="tool-card-body"><span class="tool-cat">${e(r.category)}</span><h3>${e(r.title)}</h3>${r.summary ? `<p>${e(r.summary)}</p>` : ''}<span class="tool-open">Open tool ${icons.external}<span class="sr-only">(opens ${e(hostOf(r.link))} in a new tab)</span></span></div></a>`
    + `${r.resourceLinks?.length ? `<div class="tool-resources">${r.resourceLinks.map(x => `<a href="${e(safeUrl(x.link))}">${e(x.type)}</a>`).join('')}</div>` : ''}</li>`;
  const chips = `<div class="filter-chips tone-chips" role="group" aria-label="Filter by category"><label class="chip"><input type="radio" name="category" value="" data-category-filter checked><span>All<small>${tools.length}</small></span></label>${groups.map(g => `<label class="chip" data-tone="${g.tone}"><input type="radio" name="category" value="${e(g.name)}" data-category-filter><span><i class="tone-dot" aria-hidden="true"></i>${e(g.name)}<small>${g.items.length}</small></span></label>`).join('')}</div>`;
  return pageHeader('Tools & databases', 'Web servers, prediction tools and databases developed at KAABiL. Each opens on its original site and is free for academic research.', 'Resources', {
    aside: `<dl class="header-facts"><div><dt>Resources</dt><dd>${tools.length}</dd></div><div><dt>Categories</dt><dd>${groups.length}</dd></div></dl>`,
  })
    + `<div class="wrap page-body tools-layout" data-directory>`
    + `<div class="tools-main"><form class="filter-bar" role="search"><label class="search-field"><span class="sr-only">Search tools</span>${icons.search}<input name="q" type="search" placeholder="Search tools, e.g. localization, wheat, deep learning…" data-search-input autocomplete="off"></label><p class="result-count" aria-live="polite"><span data-count>${tools.length}</span> tools</p>${chips}</form><p class="empty-state" data-empty hidden>No tool matches that search.</p>`
    + groups.map(g => `<section class="tool-group" data-tone="${g.tone}" data-filter-group id="${e(g.anchor)}" aria-labelledby="tg-${e(g.anchor)}"><div class="group-head"><h2 id="tg-${e(g.anchor)}"><i class="tone-dot" aria-hidden="true"></i>${e(g.name)}</h2><span>${count(g.items.length, 'resource')}</span></div><ul class="tool-grid">${g.items.map(card).join('')}</ul></section>`).join('') + `</div></div>`;
}

/* ---------- Publications ---------- */
/* ---------- Author roles (the original list's $ * ^ marks, underline and italic) ---------- */
/** id, label, short description. The order is the order of the legend and of stacked highlight lines. */
const AUTHOR_ROLES = [
  ['corresponding', 'Corresponding author', 'Marked * in the original list'],
  ['equal', 'Equal contribution', 'Authors who contributed equally ($)'],
  ['grad', 'Graduate student', 'Underlined in the original list'],
  ['undergrad', 'Undergraduate student', 'In italics in the original list'],
  ['mentored', 'Mentored student', 'A collaborator’s student mentored by Dr. Kaundal (^)'],
];
const MARK = { $: 'equal', '*': 'corresponding', '^': 'mentored' };
const roleLabel = id => AUTHOR_ROLES.find(r => r[0] === id)[1];
const decode = text => text.replace(/&(amp|lt|gt|quot|#39);/g, (_, x) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[x]);
/** Splits an author list into names with their roles. Underline, italics and superscript marks are
    read as roles; a comma followed only by initials ("Duhan, N.") stays inside the name. */
function parseAuthors(authors) {
  const chars = [], marks = [];
  let u = 0, it = 0, bold = 0, sup = false;
  for (const m of sanitizeHtml(authors).matchAll(/<(\/?)(\w+)[^>]*>|([^<]+)/g)) {
    if (m[3] !== undefined) {
      const text = decode(m[3]);
      if (sup) { for (const c of text) if (MARK[c]) marks.push({ at: chars.length, role: MARK[c] }); }
      else for (const ch of text) chars.push({ ch, u: u > 0, it: it > 0, bold: bold > 0 });
      continue;
    }
    const d = m[1] ? -1 : 1, tag = m[2].toLowerCase();
    if (tag === 'u') u += d; else if (tag === 'em' || tag === 'i') it += d; else if (tag === 'b' || tag === 'strong') bold += d; else if (tag === 'sup') sup = d > 0;
  }
  const text = chars.map(c => c.ch).join('');
  const parts = [];
  let from = 0;
  for (const m of text.matchAll(/\s*[,;&]\s*(?:and\s+)?|\s+and\s+/g)) {
    if (m[0].trim().startsWith(',') && /^(?:[A-Z]\.?\s?-?){1,4}(?=\s*(?:[,;.&]|and\b|$))/.test(text.slice(m.index + m[0].length))) continue;
    parts.push({ start: from, end: m.index }, { sep: text.slice(m.index, m.index + m[0].length) });
    from = m.index + m[0].length;
  }
  parts.push({ start: from, end: text.length });
  const names = parts.filter(p => !p.sep);
  for (const mark of marks) {
    const owner = names.filter(n => n.start < mark.at || n === names[0]).pop();
    (owner.marks ||= new Set()).add(mark.role);
  }
  return parts.map(p => {
    if (p.sep !== undefined) return p;
    const span = chars.slice(p.start, p.end);
    const roles = AUTHOR_ROLES.map(r => r[0]).filter(id => id === 'grad' ? span.some(c => c.u) : id === 'undergrad' ? span.some(c => c.it) : p.marks?.has(id));
    let html = '';
    for (const c of span) html += c.bold ? `<strong>${e(c.ch)}</strong>` : e(c.ch);
    return { html: html.replaceAll('</strong><strong>', ''), roles };
  });
}
/** Author list with a span per role-bearing name; coloured dots name its roles. site.js draws the highlight lines. */
function authorsHtml(authors) {
  return parseAuthors(authors).map(p => p.sep !== undefined ? e(p.sep)
    : !p.roles.length ? p.html
    : `<span class="author" data-roles="${p.roles.join(' ')}" title="${e(p.roles.map(roleLabel).join(', '))}">${p.html}<span class="role-dots" aria-hidden="true">${p.roles.map(id => `<span class="role-dot role-${id}"></span>`).join('')}</span><span class="sr-only"> (${e(p.roles.map(roleLabel).join(', ').toLowerCase())})</span></span>`).join('');
}
function authorRoles(authors) {
  const roles = new Set(parseAuthors(authors).flatMap(p => p.roles || []));
  return AUTHOR_ROLES.map(r => r[0]).filter(id => roles.has(id));
}
function yearRanges(years) {
  const nums = years.map(Number).filter(Boolean);
  if (!nums.length) return [];
  const ranges = [];
  for (let end = Math.max(...nums); end >= Math.min(...nums); end -= 3) {
    const start = end - 2;
    const n = nums.filter(y => y >= start && y <= end).length;
    if (n) ranges.push({ start, end, n });
  }
  return ranges;
}
function publicationRow(r, { venue = '', compact = false } = {}) {
  const link = safeUrl(r.link);
  const year = r.year || r.startDate?.slice(0, 4) || r.publishDate?.slice(0, 4) || '';
  return `<li class="publication${compact ? ' member-pub' : ''}" data-item data-year="${e(year)}" data-roles="${authorRoles(r.authors).join(' ')}" data-search="${e(plainText(r.title + ' ' + r.authors + ' ' + r.year + ' ' + (r.location || '')))}"><div class="publication-text"><h3>${link ? `<a href="${e(r.link)}" target="_blank" rel="noopener noreferrer">${sanitizeHtml(r.body || r.title)}</a>` : sanitizeHtml(r.body || r.title)}</h3>${r.authors ? `<p class="authors">${authorsHtml(r.authors)}</p>` : ''}${venue ? `<p class="venue">${venue}</p>` : compact && year ? `<p class="venue">${e(year)}</p>` : ''}</div><div class="publication-actions">${link ? `<a class="small-link" href="${e(r.link)}" target="_blank" rel="noopener noreferrer" aria-label="Open publication: ${e(plainText(r.title))}">${/doi\.org/.test(link) ? 'DOI' : 'Open'} ${icons.external}</a>` : ''}${copyButton(citation(r))}</div></li>`;
}
function publicationPage(records, params) {
  const pubs = records.filter(r => r.collection === 'publications');
  const modes = [['Papers', 'pub', 'Journal papers', '/publications'], ['Conferences', 'conf', 'Conferences', '/publications/conferences'], ['Editorials', 'edit', 'Editorials', '/publications/editorials']];
  const mode = { pub: 'Papers', conf: 'Conferences', edit: 'Editorials' }[params.get('content')] || 'Papers';
  const selected = sortDate(pubs.filter(r => r.category === mode));
  const yearOf = r => r.year || r.startDate?.slice(0, 4) || r.publishDate?.slice(0, 4) || '';
  const years = [...new Set(selected.map(yearOf))];
  const venueOf = r => mode === 'Conferences' ? [r.location ?? r.original?.location ?? '', r.date, r.presentationType ?? r.original?.type ?? ''].filter(Boolean).map(e).join(' · ') : '';
  const tabs = `<nav class="tabs" aria-label="Publication types">${modes.map(([key, , label, href]) => `<a href="${href}"${mode === key ? ' aria-current="page"' : ''}>${label}<span>${pubs.filter(r => r.category === key).length}</span></a>`).join('')}<a class="tabs-external" href="https://scholar.google.com/citations?user=Vu1-tr8AAAAJ&amp;hl=en&amp;oi=ao" target="_blank" rel="noopener noreferrer">Google Scholar ${icons.external}</a></nav>`;
  const ranges = yearRanges(selected.map(yearOf));
  const rangeChips = ranges.length > 1
    ? `<div class="control-row"><p class="control-label" id="years-label">Years</p><div class="filter-chips range-chips" role="group" aria-labelledby="years-label"><label class="chip"><input type="radio" name="years" value="" data-year-range checked><span>All<small>${selected.length}</small></span></label>${ranges.map(r => `<label class="chip"><input type="radio" name="years" value="${r.start}-${r.end}" data-year-range><span>${r.start}–${r.end}<small>${r.n}</small></span></label>`).join('')}</div></div>`
    : '';
  const roleCounts = AUTHOR_ROLES.map(([id, label, help]) => ({ id, label, help, n: selected.filter(r => authorRoles(r.authors).includes(id)).length })).filter(x => x.n);
  const roleControl = roleCounts.length
    ? `<div class="control-row"><p class="control-label" id="roles-label">Author roles</p><div class="role-filter"><div class="filter-chips" role="group" aria-labelledby="roles-label">${roleCounts.map(x => `<button type="button" class="role-chip role-${x.id}" data-author-key="${x.id}" aria-pressed="false" title="${e(x.help)}"><span class="role-dot" aria-hidden="true"></span><span>${e(x.label)}</span><small>${x.n}</small></button>`).join('')}</div><div class="role-actions" hidden><label class="only-toggle"><input type="checkbox" data-role-only><span>Only show these publications</span></label><button type="button" class="role-clear" data-role-clear>Clear selection</button></div></div></div>`
    : '';
  return pageHeader('Publications', 'Journal articles, conference presentations and editorial work from the lab, newest first.', 'Scholarship', { trail: mode === 'Papers' ? [['Publications']] : [['Publications', '/publications'], [modes.find(m => m[0] === mode)[2]]] })
    + `<div class="wrap page-body">${tabs}<div data-directory><div class="pub-controls">${filterBar(selected, 'publications', { categories: false })}${rangeChips}${roleControl}</div>`
    + `<div class="publication-list">${years.map(y => `<section class="pub-year" data-filter-group aria-labelledby="py-${e(y || 'undated')}"><h2 class="pub-year-label" id="py-${e(y || 'undated')}">${e(y || 'Undated')}</h2><ol class="publication-entries">${selected.filter(r => yearOf(r) === y).map(r => publicationRow(r, { venue: venueOf(r) })).join('')}</ol></section>`).join('')}</div></div>`
    + `<p class="footnote">Coloured dots after a name show that author’s roles. Select one or more roles above to underline those names, one colour per role. The roles follow the lab’s original publication list: * corresponding author, $ equal contribution, ^ a collaborator’s student mentored by Dr. Kaundal, underlined graduate students and italic undergraduate students.</p></div>`;
}

/* ---------- People ---------- */
const PEOPLE_GROUPS = ['Staff', 'Postdoctoral researchers', 'PhD students', "Master's students", 'Undergraduates', 'Visiting scholars', 'Student researchers'];
const DEPARTMENTS = { PSC: 'Plants, Soils & Climate', CS: 'Computer Science', MIS: 'Management Information Systems', CEE: 'Civil & Environmental Engineering', ADVS: 'Animal, Dairy & Veterinary Sciences', BIO: 'Biology' };
function isAlumnus(record) {
  return record.memberStatus ? record.memberStatus === 'alumni' : record.category?.split(/\s*\/\s*/).includes('Alumni');
}
/** Group on the people page: the editor's choice, otherwise inferred from the role text. */
function peopleGroup(r) {
  if (r.peopleGroup) return r.peopleGroup;
  const t = `${r.role || ''} ${r.summary || ''} ${r.category || ''}`;
  if (/post-?doc/i.test(t)) return 'Postdoctoral researchers';
  if (/\bstaff\b|administrator|scientist|technician|manager|developer/i.test(t)) return 'Staff';
  if (/\bph\.?\s?d\b|doctoral/i.test(t)) return 'PhD students';
  if (/\bm\.?s\.?\b|master/i.test(t)) return "Master's students";
  if (/\bb\.?sc?\b|undergrad|ungraduate/i.test(t)) return 'Undergraduates';
  if (/visiting/i.test(t)) return 'Visiting scholars';
  return 'Student researchers';
}
/** "PhD Student | PSC" → position "PhD Student", department "Plants, Soils & Climate". */
function personFacts(r) {
  const [position = '', detail = ''] = String(r.summary || '').split('|').map(s => s.trim());
  const known = DEPARTMENTS[detail.toUpperCase()];
  const department = r.department || (known ? 'Department of ' + known : 'Department of ' + DEPARTMENTS.PSC);
  return { position: r.role || [position, known ? '' : detail].filter(Boolean).join(' · '), department };
}
function personCard(r, records) {
  const { position, department } = personFacts(r);
  const group = peopleGroup(r);
  const pubs = (r.publicationIds || []).filter(id => records.some(x => x.id === id && x.status === 'published')).length;
  const tools = (r.toolIds || []).filter(id => records.some(x => x.id === id && x.status === 'published')).length;
  const years = r.startYear || r.endYear ? `${r.startYear || ''}–${r.endYear || (isAlumnus(r) ? '' : 'now')}` : '';
  const chips = [pubs && `${pubs} ${pubs === 1 ? 'paper' : 'papers'}`, tools && `${tools} ${tools === 1 ? 'tool' : 'tools'}`, years].filter(Boolean);
  return `<li class="person-card" data-item data-category="${e(group)}" data-search="${e(plainText(r.title + ' ' + position + ' ' + department + ' ' + group + ' ' + (r.researchInterests || '')))}"><a href="${e(r.route)}"><div class="person-photo-wrap">${image(r, 'person-photo', false)}</div><div class="person-card-body"><h3>${e(r.title)}</h3>${position ? `<p class="person-role">${e(position)}</p>` : ''}<p class="person-dept">${e(department.replace(/^Department of /, ''))}</p>${chips.length ? `<p class="person-chips">${chips.map(c => `<span>${e(c)}</span>`).join('')}</p>` : ''}</div></a></li>`;
}
function peoplePage(records, path) {
  const people = records.filter(r => r.collection === 'people');
  const current = people.filter(r => !isAlumnus(r));
  const alumni = people.filter(isAlumnus);
  const showingAlumni = path === '/people/alumni';
  const list = showingAlumni ? alumni : current;
  const d = setting(records, 'settings:director');
  const directorVisible = d && d.status === 'published';
  const tabs = `<nav class="tabs" aria-label="People"><a href="/people"${!showingAlumni ? ' aria-current="page"' : ''}>Current team<span>${current.length + (directorVisible ? 1 : 0)}</span></a><a href="/people/alumni"${showingAlumni ? ' aria-current="page"' : ''}>Alumni<span>${alumni.length}</span></a></nav>`;
  const lead = !showingAlumni && directorVisible
    ? `<a class="lead-card reveal glow" href="/people/rakesh">${image(d.image ? d : { title: d.title, image: media + '/image/raw/bioinfo/profile/RK_2.jpg' }, 'lead-photo', false)}<div><p class="eyebrow">Principal investigator</p><h2>${e(d.title)}</h2><p>${e(d.summary)}</p><ul class="lead-facts">${(d.education || []).length ? `<li><strong>${d.education.length}</strong> degrees &amp; fellowships</li>` : ''}${(d.appointments || []).length ? `<li><strong>${d.appointments.length}</strong> appointments</li>` : ''}${(d.awards || []).length ? `<li><strong>${d.awards.length}</strong> awards</li>` : ''}</ul><span class="link-more">Education, experience &amp; awards ${arrow}</span></div></a>`
    : '';
  const groups = PEOPLE_GROUPS.map(name => ({ name, rows: list.filter(r => peopleGroup(r) === name) })).filter(g => g.rows.length);
  const chips = groups.length > 1
    ? `<div class="filter-chips" role="group" aria-label="Filter by group"><label class="chip"><input type="radio" name="group" value="" data-category-filter checked><span>Everyone<small>${list.length}</small></span></label>${groups.map(g => `<label class="chip"><input type="radio" name="group" value="${e(g.name)}" data-category-filter><span>${e(g.name)}<small>${g.rows.length}</small></span></label>`).join('')}</div>`
    : '';
  return pageHeader(showingAlumni ? 'Alumni' : 'People', showingAlumni ? 'Former students, researchers and staff who trained or worked at KAABiL.' : 'Different disciplines, shared curiosity. Meet the researchers, students and staff behind KAABiL.', 'The KAABiL community', { trail: showingAlumni ? [['People', '/people'], ['Alumni']] : [['People']] })
    + `<div class="wrap page-body">${tabs}${lead}<div data-directory><form class="filter-bar" role="search"><label class="search-field"><span class="sr-only">Search ${showingAlumni ? 'alumni' : 'people'}</span>${icons.search}<input name="q" type="search" placeholder="Search by name, role or department…" data-search-input autocomplete="off"></label><p class="result-count" aria-live="polite"><span data-count>${list.length}</span> ${list.length === 1 ? 'person' : 'people'}</p>${chips}</form><p class="empty-state" data-empty hidden>Nobody matches that search.</p>`
    + groups.map(g => `<section class="people-group" data-filter-group aria-labelledby="pg-${e(g.name.replace(/\W+/g, '-'))}"><div class="group-head"><h2 id="pg-${e(g.name.replace(/\W+/g, '-'))}">${e(g.name)}</h2><span>${g.rows.length}</span></div><ul class="people-grid${showingAlumni ? ' people-grid-compact' : ''}">${g.rows.map(r => personCard(r, records)).join('')}</ul></section>`).join('')
    + `</div></div>`;
}

function timeline(rows, linkLabel = 'Related link') {
  return `<ol class="timeline">${rows.map(item => `<li><span class="timeline-date">${e(item.date)}</span><div><h3>${e(item.title)}</h3>${item.description ? `<p>${e(item.description)}</p>` : ''}${item.link ? `<a class="link-more" href="${e(safeUrl(item.link))}" target="_blank" rel="noopener noreferrer">${linkLabel} ${icons.external}</a>` : ''}</div></li>`).join('')}</ol>`;
}
function toolTiles(tools) {
  return `<ul class="profile-tools">${tools.map(t => `<li><a class="glow" data-tone="${toneFor(t.category)}" href="${e(safeUrl(t.link || t.route))}" target="_blank" rel="noopener noreferrer"><div class="tool-shot">${t.image ? image({ ...t, imageFit: t.imageFit || 'contain' }, '', false) : `<span class="tool-mark">${e(t.title.slice(0, 2))}</span>`}</div><div><h3>${e(t.title)} ${icons.external}</h3>${t.category ? `<p>${e(t.category)}</p>` : ''}</div></a></li>`).join('')}</ul>`;
}
function personProfile(record, records) {
  const alum = isAlumnus(record);
  const { position, department } = personFacts(record);
  const group = peopleGroup(record);
  const pubs = records.filter(r => r.status === 'published' && r.collection === 'publications' && (record.publicationIds || []).includes(r.id)).sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0));
  const tools = records.filter(r => r.status === 'published' && r.collection === 'tools' && (record.toolIds || []).includes(r.id));
  const years = [...new Set(pubs.map(p => p.year).filter(Boolean))].sort().reverse();
  const interests = (record.researchInterests || '').split(/[\n,;]+/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 80);
  const links = profileLinks([...(record.social || []), ...(record.workLinks || [])]);
  const phone = String(record.phone || '').replace(/[^+0-9]/g, '');
  const when = (month, year) => year ? [month ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1] : '', year].filter(Boolean).join(' ') : '';
  const span = record.startYear || record.endYear ? `${when(record.startMonth, record.startYear) || '…'} – ${when(record.endMonth, record.endYear) || (alum ? '…' : 'present')}` : '';
  const background = [['education', 'Education'], ['appointments', 'Experience'], ['awards', 'Honours & awards']].filter(([k]) => record[k]?.length);
  const sections = [
    ['about', 'About', record.body || record.researchInterests],
    ['background', 'Education & experience', background.length || record.dissertationTitle],
    ['publications', 'Publications', pubs.length],
    ['tools', 'Software & tools', tools.length],
  ].filter(x => x[2]);
  const stats = [[pubs.length, pubs.length === 1 ? 'Publication' : 'Publications'], [tools.length, tools.length === 1 ? 'Tool' : 'Tools'], [record.startYear && !alum ? new Date().getFullYear() - Number(record.startYear) : 0, 'Years at KAABiL']].filter(([n]) => n > 0);
  return `<header class="profile-header person-header"><div class="wrap">${breadcrumbs([[alum ? 'Alumni' : 'People', alum ? '/people/alumni' : '/people'], [record.title]])}<div class="profile-header-grid"><div class="profile-portrait">${image(record, 'portrait')}</div><div class="profile-intro">`
    + `<p class="profile-badges"><span class="status-pill ${alum ? 'is-alumni' : 'is-current'}">${alum ? 'Alumni' : 'Current member'}</span><span class="group-pill">${e(group)}</span></p>`
    + `<h1>${e(record.title)}</h1>${position ? `<p class="lede">${e(position)}</p>` : ''}<p class="profile-affiliation">${e(department)} · Utah State University${span ? ` · <span class="profile-years">${e(span)}</span>` : ''}</p>`
    + `<ul class="contact-list">${record.email ? `<li><a href="mailto:${e(record.email)}">${icons.mail}<span>${e(record.email)}</span></a>${copyButton(record.email, 'Copy')}</li>` : ''}${record.phone ? `<li><a href="tel:${e(phone)}">${icons.phone}<span>${e(record.phone)}</span></a></li>` : ''}</ul>${linkButtons(links)}`
    + (stats.length ? `<dl class="profile-stats">${stats.map(([n, l]) => `<div><dd>${n}</dd><dt>${l}</dt></div>`).join('')}</dl>` : '')
    + `</div></div></div></header>`
    + `<div class="wrap profile-layout">${sections.length > 1 ? `<nav class="profile-toc" aria-label="On this page"><p class="eyebrow">On this page</p>${sections.map(([id, label]) => `<a href="#${id}">${label}</a>`).join('')}</nav>` : '<div></div>'}<div class="profile-main">`
    + (record.body || record.researchInterests ? `<section class="profile-section" id="about"><h2>About</h2>${interests.length >= 2 && interests.length <= 16 ? `<ul class="tag-list">${interests.map(t => `<li>${e(t)}</li>`).join('')}</ul>` : record.researchInterests ? `<p class="interests"><strong>Research interests:</strong> ${e(record.researchInterests)}</p>` : ''}${record.body ? `<div class="prose">${richBody(record.body, records)}</div>` : ''}</section>` : '')
    + (background.length || record.dissertationTitle ? `<section class="profile-section" id="background"><h2>Education &amp; experience</h2>${background.map(([k, label]) => `<div class="background-block"><h3 class="block-title">${label}</h3>${timeline(record[k])}</div>`).join('')}${record.dissertationTitle || record.dissertationUrl ? `<div class="background-block"><h3 class="block-title">Thesis / dissertation</h3><div class="thesis-card">${icons.doc}<div><p>${e(record.dissertationTitle || 'Dissertation')}</p>${record.dissertationUrl ? `<a class="link-more" href="${e(safeUrl(record.dissertationUrl))}" target="_blank" rel="noopener noreferrer">Read the thesis ${icons.external}</a>` : ''}</div></div></div>` : ''}</section>` : '')
    + (pubs.length ? `<section class="profile-section member-pubs" id="publications" data-pub-filter><div class="profile-section-head"><h2>Publications</h2><span class="count-badge">${pubs.length}</span></div>${years.length > 1 ? `<div class="filter-chips" role="toolbar" aria-label="Filter publications by year"><button type="button" class="chip is-active" data-pub-year="all">All</button>${years.map(y => `<button type="button" class="chip" data-pub-year="${e(y)}">${e(y)}</button>`).join('')}</div>` : ''}<ol class="publication-entries compact">${pubs.map(p => publicationRow(p, { compact: true })).join('')}</ol></section>` : '')
    + (tools.length ? `<section class="profile-section" id="tools"><h2>Software &amp; tools</h2>${toolTiles(tools)}</section>` : '')
    + `<p class="back-link"><a href="${alum ? '/people/alumni' : '/people'}">${icons.back} Back to ${alum ? 'alumni' : 'people'}</a></p></div></div>`;
}

/* ---------- News ---------- */
const NEWS_SECTIONS = [
  { id: 'General', label: 'General', desc: 'Awards, people and lab announcements' },
  { id: 'Science', label: 'Science & Research', desc: 'Publications, tools and discovery milestones' },
  { id: 'Media', label: 'Media & Features', desc: 'Press coverage, interviews and features' },
];
const newsSection = r => (NEWS_SECTIONS.some(c => c.id === r.category) ? r.category : 'General');

function newsCard(input, records) {
  const r = { ...input, date: displayDate(input) };
  const href = r.route || linkFor(r, records);
  const ext = /^https?:/i.test(href);
  const sec = newsSection(r);
  return `<li class="news-card${r.image ? ' has-thumb' : ''}" data-item data-category="${e(sec)}" data-search="${e(plainText(r.title + ' ' + (r.summary || '') + ' ' + r.date))}"><a href="${e(href)}"${external(href)}>${r.image ? `<div class="news-thumb">${image(r, '', false)}</div>` : ''}<div class="news-card-text"><p class="meta"><time>${e(r.date)}</time>${r.category && r.category !== sec ? `<span class="tag">${e(r.category)}</span>` : ''}</p><h3>${e(r.title)}${ext ? ` ${icons.external}` : ''}</h3>${r.summary ? `<p class="news-summary">${e(r.summary)}</p>` : ''}</div></a></li>`;
}

function newsListing(list, records) {
  const [lead, ...side] = list.slice(0, 3);
  const leadHref = lead && (lead.route || linkFor(lead, records));
  const featured = lead ? `<section class="news-featured" aria-label="Latest stories"><article class="news-lead${lead.image ? ' has-image' : ''}">${lead.image ? `<a class="news-lead-media" href="${e(leadHref)}" tabindex="-1" aria-hidden="true">${image(lead, '', false)}</a>` : ''}<div class="news-lead-text"><p class="meta"><span class="tag tag-accent">Latest</span><span class="tag">${e(NEWS_SECTIONS.find(s => s.id === newsSection(lead)).label)}</span><time>${e(displayDate(lead))}</time></p><h2><a href="${e(leadHref)}"${external(leadHref)}>${e(lead.title)}</a></h2>${lead.summary ? `<p>${e(lead.summary)}</p>` : ''}</div></article><ul class="news-side">${side.map(r => { const h = r.route || linkFor(r, records); return `<li><p class="meta"><span class="tag">${e(NEWS_SECTIONS.find(s => s.id === newsSection(r)).label)}</span><time>${e(displayDate(r))}</time></p><h3><a href="${e(h)}"${external(h)}>${e(r.title)}</a></h3></li>`; }).join('')}</ul></section>` : '';
  const groups = NEWS_SECTIONS.map(c => ({ ...c, items: list.filter(r => newsSection(r) === c.id) })).filter(c => c.items.length);
  const tabs = `<div class="news-tabs" role="tablist" aria-label="News sections"><button type="button" role="tab" class="news-tab is-active" aria-selected="true" data-view="all">All sections<span>${list.length}</span></button>${groups.map(c => `<button type="button" role="tab" class="news-tab" aria-selected="false" data-view="${e(c.id)}">${e(c.label)}<span>${c.items.length}</span></button>`).join('')}</div>`;
  const cols = groups.map(c => `<section class="news-col" data-col="${e(c.id)}" data-filter-group aria-labelledby="nc-${e(c.id)}"><header class="news-col-head"><h2 id="nc-${e(c.id)}">${e(c.label)}</h2><p>${e(c.desc)}</p><span class="count-badge">${c.items.length}</span></header><ul class="news-list">${c.items.map(r => newsCard(r, records)).join('')}</ul><button type="button" class="news-more" hidden>Show more</button></section>`).join('');
  return `${featured}<div class="news-controls">${filterBar(list, 'news', { categories: false })}${tabs}</div><div class="news-board" data-view="all">${cols}</div>`;
}

/* ---------- Events ---------- */
const eventYear = r => (displayDate(r).match(/\d{4}/) || [''])[0];
function eventCard(input) {
  const r = { ...input, date: displayDate(input) };
  const date = r.date || '';
  const day = date.match(/\b\d{1,2}(?:\s?[-–]\s?\d{1,2})?\b/)?.[0] || '';
  const month = date.match(/[A-Za-z]{3,}/)?.[0]?.slice(0, 3) || '';
  const place = r.location || r.original?.location || '';
  return `<li class="event-card" data-item data-year="${e(eventYear(r))}" data-search="${e(r.title + ' ' + date + ' ' + place)}"><a href="${e(r.route)}"><div class="event-media">${image(r, '', false)}${day ? `<span class="date-badge"><strong>${e(day)}</strong><span>${e(month)}</span></span>` : ''}</div><div class="event-body"><p class="meta"><time>${e(date)}</time></p><h3>${e(r.title)}</h3>${place ? `<p class="meta-line">${icons.pin}<span>${e(place)}</span></p>` : ''}</div></a></li>`;
}
function eventsListing(list) {
  const start = new Date().setUTCHours(0, 0, 0, 0);
  const upcoming = list.filter(r => dateValue({ ...r, publishDate: undefined }) >= start).sort((a, b) => dateValue(a) - dateValue(b));
  const past = list.filter(r => !upcoming.includes(r));
  const years = [...new Set(past.map(eventYear).filter(Boolean))];
  const cards = rows => rows.map(eventCard).join('');
  const upcomingBlock = upcoming.length
    ? `<section class="event-upcoming" data-filter-group aria-labelledby="up-h"><h2 id="up-h" class="group-title">Upcoming</h2><ul class="event-grid event-grid-wide">${cards(upcoming)}</ul></section>`
    : `<div class="notice-panel"><div><p class="eyebrow">Coming up</p><h2>No events are scheduled right now</h2><p>New events appear here as soon as they are announced.</p></div><a class="button button-ghost" href="/contact">Contact the lab ${arrow}</a></div>`;
  const yearNav = years.length ? `<nav class="year-nav" aria-label="Jump to year">${years.map(y => `<a href="#year-${e(y)}">${e(y)}</a>`).join('')}</nav>` : '';
  const undated = past.filter(r => !eventYear(r));
  return `${upcomingBlock}${yearNav}${years.map(y => { const rows = past.filter(r => eventYear(r) === y); return `<section class="event-year" id="year-${e(y)}" data-filter-group aria-labelledby="y-${e(y)}"><div class="group-head"><h2 id="y-${e(y)}">${e(y)}</h2><span>${count(rows.length, 'event')}</span></div><ul class="event-grid">${cards(rows)}</ul></section>`; }).join('')}${undated.length ? `<section class="event-year" data-filter-group><ul class="event-grid">${cards(undated)}</ul></section>` : ''}`;
}

function listing(records, collection) {
  const list = sortDate(records.filter(r => r.collection === collection));
  if (collection === 'news') {
    return pageHeader('News', 'Research milestones, awards, media coverage and stories from the KAABiL community.', 'News & events', { trail: [['News']] })
      + `<div class="wrap page-body" data-directory>${newsListing(list, records)}</div>`;
  }
  return pageHeader('Events', 'Conferences, symposia, presentations and the moments that bring our research community together.', 'News & events', { trail: [['Events']] })
    + `<div class="wrap page-body" data-directory>${filterBar(list, 'events', { categories: false, years: true })}${eventsListing(list)}</div>`;
}

/* ---------- Detail pages (news, events, research areas, pages, opportunities) ---------- */
function detail(input, records) {
  const record = { ...input, date: displayDate(input) };
  if (record.collection === 'people') return personProfile(record, records);
  if (record.collection === 'research') return researchArea(record, records);
  const collection = record.collection;
  const section = { pages: ['About', '/about'], news: ['News', '/news'], events: ['Events', '/events'], research: ['Research', '/research'], opportunities: ['Opportunities', '/opportunities'], tools: ['Tools', '/tools'], publications: ['Publications', '/publications'] }[collection] || [collection, '/' + collection];
  const isExternal = record.link && record.link.replace(/\/$/, '') !== record.route;
  const place = record.location || record.original?.location || '';
  const meta = [
    record.date && `<span class="meta-line">${icons.calendar}<span>${e(record.date)}</span></span>`,
    place && `<span class="meta-line">${icons.pin}<span>${e(place)}</span></span>`,
  ].filter(Boolean).join('');
  const research = collection === 'research' && !record.body
    ? `<p>This research area is part of the lab’s wider program. Explore the related tools and publications below.</p><ul class="link-tiles"><li><a href="/research#program">Research program ${arrow}</a></li><li><a href="/tools">Tools &amp; databases ${arrow}</a></li><li><a href="/publications">Publications ${arrow}</a></li></ul>`
    : '';
  const opportunity = collection === 'opportunities'
    ? `<div class="notice-panel"><div><p class="eyebrow">${e(record.openingStatus === 'closed' ? 'Closed' : 'Open')} · ${e(record.category || 'Research opportunity')}</p>${record.deadline ? `<p>Apply by <strong>${e(record.deadline)}</strong></p>` : ''}</div>${record.link ? `<a class="button" href="${e(safeUrl(record.link))}">Application details ${arrow}</a>` : record.email ? `<a class="button" href="mailto:${e(record.email)}">Email to apply ${arrow}</a>` : ''}</div>`
    : '';
  const siblings = ['research'].includes(collection) ? records.filter(r => r.collection === collection && r.id !== record.id) : [];
  return `<article class="article"><header class="article-header"><div class="wrap">${breadcrumbs([section, [record.title]])}<div class="article-heading"><p class="eyebrow">${e(record.category && !['Research', 'Events'].includes(record.category) ? record.category : section[0])}</p><h1>${e(record.title)}</h1>${record.summary ? `<p class="lede">${e(record.summary)}</p>` : ''}${meta ? `<p class="article-meta">${meta}</p>` : ''}</div></div></header>`
    + `<div class="wrap article-layout">${record.image ? `<figure class="article-figure">${image(record, 'article-image')}${record.imageCaption ? `<figcaption>${e(record.imageCaption)}</figcaption>` : ''}</figure>` : ''}`
    + `<div class="article-body prose">${opportunity}${richBody(record.body, records)}${research}${record.email && collection !== 'opportunities' ? `<p><a href="mailto:${e(record.email)}">${e(record.email)}</a></p>` : ''}${record.social?.length ? `<ul class="chip-links">${record.social.map(s => `<li><a href="${e(safeUrl(s.link))}" target="_blank" rel="noopener noreferrer">${e(s.type)} ${icons.external}</a></li>`).join('')}</ul>` : ''}${isExternal ? sourceLink(linkFor(record, records), !record.body) : ''}</div>`
    + (record.id === 'pages:home' ? '<p class="article-aside-link"><a class="link-more" href="https://www.youtube.com/watch?v=r-Ay28WKFLY" target="_blank" rel="noopener noreferrer">Watch Dr. Kaundal’s journey ' + icons.external + '</a></p>' : '')
    + (record.gallery?.length ? `<section class="gallery-section"><h2>Gallery <span class="count-badge">${record.gallery.length}</span></h2><div class="gallery" aria-label="Photo gallery">${record.gallery.map((url, i) => `<div>${image({ title: record.title, image: url, imageAlt: record.title + ' — photo ' + (i + 1) })}</div>`).join('')}</div></section>` : '')
    + related(record, records)
    + (siblings.length ? `<section class="related"><h2>Other research areas</h2><ul class="related-grid">${siblings.map(r => `<li><a class="glow" href="${e(r.route)}"><span class="tag">Research</span><span class="related-title">${e(r.title)}</span>${arrow}</a></li>`).join('')}</ul></section>` : '')
    + `<p class="back-link"><a href="${section[1]}">${icons.back} Back to ${e(section[0].toLowerCase())}</a></p></div></article>`;
}

function sourceLink(href, primary) {
  let host = '';
  try { host = new URL(href).hostname.replace(/^www\./, ''); } catch { host = ''; }
  return primary
    ? `<div class="notice-panel"><div><p class="eyebrow">Full story</p><p>This story was published${host ? ` at <strong>${e(host)}</strong>` : ' elsewhere'}.</p></div><a class="button" href="${e(href)}"${external(href)}>Read the full story ${icons.external}</a></div>`
    : `<p class="source-link"><a class="button button-ghost" href="${e(href)}"${external(href)}>Read the original story ${icons.external}</a></p>`;
}

/* ---------- Contact ---------- */
function contact(records) {
  const c = setting(records, 'settings:site');
  const page = records.find(r => r.id === 'pages:contact');
  const phone = String(c.phone || '').replace(/[^+0-9]/g, '');
  const body = richBody(page?.body, records)
    .replaceAll('id="enroll"', '')
    .replace(/<a[^>]+>Go to Contact Form<\/a>/, '')
    .replace('form</a> below', 'email link</a>')
    .replace(/<h4[^>]*>\s*Set an Appointment!\s*<\/h4>/, '')
    .replaceAll('rkaundal@usu.edu', e(c.email));
  const active = activeOpportunities(records);
  return pageHeader('Contact', 'Questions, collaborations or your next research chapter — we would like to hear from you.', 'Get in touch', { trail: [['About', '/about'], ['Contact']] })
    + `<div class="wrap page-body contact-layout"><aside class="contact-card"><h2>KAABiL at Utah State University</h2><ul class="contact-list stacked"><li><a href="mailto:${e(c.email)}">${icons.mail}<span>${e(c.email)}</span></a></li>${c.phone ? `<li><a href="tel:${e(phone)}">${icons.phone}<span>${e(c.phone)}</span></a></li>` : ''}<li><span class="contact-address">${icons.pin}<span>${e(c.address).replaceAll('\n', '<br>')}</span></span></li></ul>`
    + `<div class="contact-actions"><a class="button" href="mailto:${e(c.email)}?subject=KAABiL%20research%20opportunity">Email about joining ${arrow}</a><a class="button button-ghost" href="mailto:${e(c.email)}?subject=Appointment%20request">Request an appointment</a><a class="link-more" href="https://maps.google.com/maps?q=41.742693,-111.810340" target="_blank" rel="noopener noreferrer">Directions on Google Maps ${icons.external}</a></div>`
    + (active.length ? `<div class="facts-block"><p class="eyebrow">Open opportunities</p><ul>${active.map(r => `<li><a href="${e(r.route)}">${e(r.title)}</a></li>`).join('')}</ul></div>` : '')
    + `</aside><div class="prose contact-prose">${body}</div></div>`;
}

/* ---------- Search ---------- */
function searchPage(records) {
  const label = { news: 'News', events: 'Event', publications: 'Publication', people: 'Person', research: 'Research', tools: 'Tool', pages: 'Page', opportunities: 'Opportunity' };
  const items = records.filter(r => r.collection !== 'settings');
  return pageHeader('Search', 'Find people, research areas, publications, tools and stories across the site.', 'Explore KAABiL', { trail: [['Search']] })
    + `<div class="wrap page-body" data-directory data-require-query>${filterBar(items, 'the website', { categories: false })}<div class="search-hint" data-search-hint><p>Type a name, topic, tool or year. For example <em>RSLpred</em>, <em>metagenomics</em> or <em>2024</em>.</p><ul class="link-tiles"><li><a href="/people">People ${arrow}</a></li><li><a href="/research">Research ${arrow}</a></li><li><a href="/publications">Publications ${arrow}</a></li><li><a href="/tools">Tools ${arrow}</a></li><li><a href="/news">News ${arrow}</a></li></ul></div><ul class="search-results">${items.map(r => { const href = r.route || safeUrl(r.link) || '/publications'; return `<li data-item data-search="${e(plainText(r.title + ' ' + (r.summary || '') + ' ' + (r.category || '') + ' ' + (r.authors || '')))}"><span class="tag">${e(label[r.collection] || r.collection)}</span><h2><a href="${e(href)}"${external(href)}>${e(plainText(r.title))}</a></h2>${r.summary ? `<p>${e(r.summary)}</p>` : ''}</li>`; }).join('')}</ul></div>`;
}

function notFound(title, intro, actionHref = '/', actionLabel = 'Back to the homepage') {
  return pageHeader(title, intro, 'Page not found', { trail: [['Not found']] })
    + `<div class="wrap page-body"><div class="notice-panel"><div><h2>Try one of these instead</h2><ul class="link-tiles"><li><a href="/research">Research ${arrow}</a></li><li><a href="/people">People ${arrow}</a></li><li><a href="/publications">Publications ${arrow}</a></li><li><a href="/tools">Tools ${arrow}</a></li><li><a href="/search">Search ${arrow}</a></li></ul></div><a class="button" href="${actionHref}">${e(actionLabel)}</a></div></div>`;
}

/* ---------- Router ---------- */
export function renderPage(path, params, records, { previewRecord = null } = {}) {
  const directorHidden = records.some(r => r.id === 'settings:director' && r.status !== 'published');
  path = path.replace(/\/$/, '') || '/';
  path = legacyRedirects[path] || path;
  records = records.filter(r => r.status === 'published' || r.id === previewRecord?.id);
  let body, title, status = 200;
  if (previewRecord?.collection === 'settings') {
    records = records.filter(r => r.id !== previewRecord.id).concat(previewRecord);
    body = previewRecord.id === 'settings:director' ? director(records) : homepage(records);
    title = 'Settings preview';
  } else if (previewRecord) {
    body = `<div class="preview-banner">Draft preview · only visible to signed-in editors</div>` + detail(previewRecord, records);
    title = previewRecord.title;
  } else if (path === '/' || path === '/home') {
    body = homepage(records); title = 'From information to inference';
  } else if (['/research', '/research/research-areas'].includes(path)) {
    body = researchPage(records); title = 'Research';
  } else if (path === '/people/rakesh' && directorHidden) {
    status = 404; title = 'Profile unavailable';
    body = notFound('Profile unavailable', 'This profile is not published right now.', '/people', 'Meet the team');
  } else if (path === '/people/rakesh') {
    body = director(records); title = 'Dr. Rakesh Kaundal';
  } else if (path === '/opportunities') {
    body = opportunities(records); title = 'Opportunities';
  } else if (path === '/search') {
    body = searchPage(records); title = 'Search';
  } else if (path === '/tools') {
    body = toolsPage(records); title = 'Tools & databases';
  } else if (['/people', '/people/our-team', '/people/alumni'].includes(path)) {
    body = peoplePage(records, path); title = path.endsWith('alumni') ? 'Alumni' : 'People';
  } else if (['/publications', '/publications/conferences', '/publications/editorials'].includes(path)) {
    if (path.endsWith('conferences')) params.set('content', 'conf');
    if (path.endsWith('editorials')) params.set('content', 'edit');
    body = publicationPage(records, params); title = 'Publications';
  } else if (['/news', '/events'].includes(path)) {
    body = listing(records, path.slice(1)); title = path === '/news' ? 'News' : 'Events';
  } else if (path === '/contact') {
    body = contact(records); title = 'Contact';
  } else {
    const record = records.find(r => r.route === path);
    if (record) { body = detail(record, records); title = record.title; }
    else { status = 404; title = 'Page not found'; body = notFound('This page isn’t here', 'The page may have moved. Try the links below or search the site.'); }
  }
  return { status, html: shell(title, body, { path, records }) };
}
