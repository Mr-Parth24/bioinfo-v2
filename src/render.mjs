/**
 * Public presentation layer: page templates and the router. Layout comes from these shared templates;
 * factual content comes from records. Tool services stay on their original hosts.
 * See docs/architecture.md for the data flow and docs/redesign-plan.md for the design rules.
 */
import {
  header, footer, homepage, director, opportunities, related,
  image, pageHeader, breadcrumbs, icons, arrow, asset, media,
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
    + `<div class="wrap page-body"><ol class="area-rows">${areas.map((r, i) => `<li class="area-row reveal"><a class="area-row-media" href="${e(r.route)}" tabindex="-1" aria-hidden="true">${image(r, '', false)}</a><div class="area-row-text"><span class="area-index">${String(i + 1).padStart(2, '0')}</span><h2><a href="${e(r.route)}">${e(r.title)}</a></h2>${r.summary ? `<p>${e(r.summary)}</p>` : ''}<a class="link-more" href="${e(r.route)}">Explore this area ${arrow}</a></div></li>`).join('')}</ol>`
    + (overview?.body ? `<section class="split-section reveal" id="program"><div class="split-head"><p class="eyebrow">Program</p><h2>Objectives &amp; approach</h2></div><div class="prose">${richBody(overview.body, records)}</div></section>` : '')
    + `</div>`;
}

/* ---------- Tools ---------- */
function toolsPage(records) {
  const tools = records.filter(r => r.collection === 'tools').map(r => ({
    ...r,
    category: r.category || 'Other tools',
    anchor: r.anchor || 'category-' + (r.category || 'other').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  }));
  const groups = [...new Set(tools.map(r => r.category))].map(name => ({ name, anchor: tools.find(r => r.category === name).anchor, items: tools.filter(r => r.category === name) }));
  const card = r => {
    let host = '';
    try { host = new URL(r.link).hostname.replace(/^www\./, ''); } catch { host = ''; }
    return `<li class="tool-card" data-item data-category="${e(r.category)}" data-search="${e(r.title + ' ' + r.category + ' ' + (r.summary || ''))}"><a class="tool-card-link" href="${e(r.link)}" target="_blank" rel="noopener noreferrer"><div class="tool-shot">${r.image ? image({ ...r, imageFit: r.imageFit || 'contain' }, '', false) : `<span class="tool-mark">${e(r.title.slice(0, 2))}</span>`}</div><div class="tool-card-body"><h3>${e(r.title)} ${icons.external}<span class="sr-only">(opens in a new tab)</span></h3>${r.summary ? `<p>${e(r.summary)}</p>` : ''}<p class="tool-host">${e(host)}</p></div></a>${r.resourceLinks?.length ? `<div class="tool-resources">${r.resourceLinks.map(x => `<a href="${e(safeUrl(x.link))}">${e(x.type)}</a>`).join('')}</div>` : ''}</li>`;
  };
  return pageHeader('Tools & databases', 'Web servers, prediction tools and databases developed at KAABiL. Each opens on its original site and is free for academic research.', 'Resources', {
    aside: `<dl class="header-facts"><div><dt>Resources</dt><dd>${tools.length}</dd></div><div><dt>Categories</dt><dd>${groups.length}</dd></div></dl>`,
  })
    + `<div class="wrap page-body tools-layout" data-directory><nav class="side-nav" aria-label="Tool categories"><p class="eyebrow">Categories</p><ul>${groups.map(g => `<li><a href="#${e(g.anchor)}">${e(g.name)}<span>${g.items.length}</span></a></li>`).join('')}</ul></nav>`
    + `<div class="tools-main">${filterBar(tools, 'tools', { categories: false })}${groups.map(g => `<section class="tool-group" data-filter-group id="${e(g.anchor)}" aria-labelledby="tg-${e(g.anchor)}"><div class="group-head"><h2 id="tg-${e(g.anchor)}">${e(g.name)}</h2><span>${count(g.items.length, 'resource')}</span></div><ul class="tool-grid">${g.items.map(card).join('')}</ul></section>`).join('')}</div></div>`;
}

/* ---------- Publications ---------- */
function publicationPage(records, params) {
  const pubs = records.filter(r => r.collection === 'publications');
  const modes = [['Papers', 'pub', 'Journal papers', '/publications'], ['Conferences', 'conf', 'Conferences', '/publications/conferences'], ['Editorials', 'edit', 'Editorials', '/publications/editorials']];
  const mode = { pub: 'Papers', conf: 'Conferences', edit: 'Editorials' }[params.get('content')] || 'Papers';
  const selected = sortDate(pubs.filter(r => r.category === mode));
  const yearOf = r => r.year || r.startDate?.slice(0, 4) || r.publishDate?.slice(0, 4) || '';
  const years = [...new Set(selected.map(yearOf))];
  const row = r => {
    const venue = mode === 'Conferences'
      ? [r.location ?? r.original?.location ?? '', r.date, r.presentationType ?? r.original?.type ?? ''].filter(Boolean).map(e).join(' · ')
      : '';
    const link = safeUrl(r.link);
    return `<li class="publication" data-item data-year="${e(yearOf(r))}" data-search="${e(plainText(r.title + ' ' + r.authors + ' ' + r.year + ' ' + (r.location || '')))}"><div class="publication-text"><h3>${link ? `<a href="${e(r.link)}" target="_blank" rel="noopener noreferrer">${sanitizeHtml(r.body || r.title)}</a>` : sanitizeHtml(r.body || r.title)}</h3>${r.authors ? `<p class="authors">${sanitizeHtml(r.authors)}</p>` : ''}${venue || mode === 'Conferences' ? `<p class="venue">${venue}</p>` : ''}</div><div class="publication-actions">${link ? `<a class="small-link" href="${e(r.link)}" target="_blank" rel="noopener noreferrer" aria-label="Open publication: ${e(plainText(r.title))}">${/doi\.org/.test(link) ? 'DOI' : 'Open'} ${icons.external}</a>` : ''}${copyButton(citation(r))}</div></li>`;
  };
  const tabs = `<nav class="tabs" aria-label="Publication types">${modes.map(([key, , label, href]) => `<a href="${href}"${mode === key ? ' aria-current="page"' : ''}>${label}<span>${pubs.filter(r => r.category === key).length}</span></a>`).join('')}<a class="tabs-external" href="https://scholar.google.com/citations?user=Vu1-tr8AAAAJ&amp;hl=en&amp;oi=ao" target="_blank" rel="noopener noreferrer">Google Scholar ${icons.external}</a></nav>`;
  return pageHeader('Publications', 'Journal articles, conference presentations and editorial work from the lab, newest first.', 'Scholarship', { trail: mode === 'Papers' ? [['Publications']] : [['Publications', '/publications'], [modes.find(m => m[0] === mode)[2]]] })
    + `<div class="wrap page-body">${tabs}<div data-directory>${filterBar(selected, 'publications', { categories: false, years: true })}`
    + `<div class="publication-list">${years.map(y => `<section class="pub-year" data-filter-group aria-labelledby="py-${e(y || 'undated')}"><h2 class="pub-year-label" id="py-${e(y || 'undated')}">${e(y || 'Undated')}</h2><ol class="publication-entries">${selected.filter(r => yearOf(r) === y).map(row).join('')}</ol></section>`).join('')}</div></div>`
    + `<p class="footnote">Author emphasis and symbols follow the original publication list. Bold names are lab members.</p></div>`;
}

/* ---------- People ---------- */
function isAlumnus(record) {
  return record.memberStatus ? record.memberStatus === 'alumni' : record.category?.split(/\s*\/\s*/).includes('Alumni');
}
function personCard(r) {
  return `<li class="person-card" data-item data-category="${e(r.category)}" data-search="${e(plainText(r.title + ' ' + (r.role || '') + ' ' + (r.department || '') + ' ' + (r.category || '') + ' ' + (r.summary || '')))}"><a href="${e(r.route)}">${image(r, 'person-photo', false)}<div class="person-card-body"><p class="person-category">${e(r.category)}</p><h3>${e(r.title)}</h3>${r.role || r.summary ? `<p class="person-role">${e(r.role || r.summary)}</p>` : ''}<p class="person-dept">${e(r.department || DEFAULT_DEPARTMENT)}</p></div></a></li>`;
}
function peoplePage(records, path) {
  const people = records.filter(r => r.collection === 'people');
  const current = people.filter(r => !isAlumnus(r));
  const alumni = people.filter(isAlumnus);
  const showingAlumni = path === '/people/alumni';
  const list = showingAlumni ? alumni : current;
  const d = setting(records, 'settings:director');
  const directorVisible = d && d.status === 'published';
  const tabs = `<nav class="tabs" aria-label="People"><a href="/people"${!showingAlumni ? ' aria-current="page"' : ''}>Current team<span>${current.length}</span></a><a href="/people/alumni"${showingAlumni ? ' aria-current="page"' : ''}>Alumni<span>${alumni.length}</span></a></nav>`;
  const lead = !showingAlumni && directorVisible
    ? `<a class="lead-card reveal" href="/people/rakesh">${image(d.image ? d : { title: d.title, image: media + '/image/raw/bioinfo/profile/RK_2.jpg' }, 'lead-photo', false)}<div><p class="eyebrow">Principal investigator</p><h2>${e(d.title)}</h2><p>${e(d.summary)}</p><p class="person-dept">${DEFAULT_DEPARTMENT} · Utah State University</p><span class="link-more">Read profile ${arrow}</span></div></a>`
    : '';
  return pageHeader(showingAlumni ? 'Alumni' : 'People', showingAlumni ? 'Former students, researchers and staff who trained or worked at KAABiL.' : 'Different disciplines, shared curiosity. Meet the researchers, students and staff behind KAABiL.', 'The KAABiL community', { trail: showingAlumni ? [['People', '/people'], ['Alumni']] : [['People']] })
    + `<div class="wrap page-body">${tabs}${lead}<div data-directory>${filterBar(list, showingAlumni ? 'alumni' : 'people', { categories: !showingAlumni })}<ul class="people-grid${showingAlumni ? ' people-grid-compact' : ''}">${list.map(personCard).join('')}</ul></div></div>`;
}

function personProfile(record, records) {
  const alum = isAlumnus(record);
  const pubs = records.filter(r => r.status === 'published' && r.collection === 'publications' && (record.publicationIds || []).includes(r.id)).sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0));
  const tools = records.filter(r => r.status === 'published' && r.collection === 'tools' && (record.toolIds || []).includes(r.id));
  const years = [...new Set(pubs.map(p => p.year).filter(Boolean))].sort().reverse();
  const credentials = [['education', 'Education'], ['appointments', 'Appointments'], ['awards', 'Honours &amp; awards']].filter(([k]) => record[k]?.length);
  const interests = (record.researchInterests || '').split(/[\n,;]+/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 80);
  const phone = String(record.phone || '').replace(/[^+0-9]/g, '');
  const facts = [
    ['Status', alum ? 'Alumni' : 'Current member'],
    record.role && ['Role', record.role],
    record.category && record.category !== 'Alumni' && ['Group', record.category],
    ['Department', record.department || DEFAULT_DEPARTMENT],
    (record.startYear || record.endYear) && ['At KAABiL', `${record.startYear || ''} – ${record.endYear || 'present'}`],
  ].filter(Boolean);
  const timeline = rows => `<ol class="timeline">${rows.map(item => `<li><span class="timeline-date">${e(item.date)}</span><div><h3>${e(item.title)}</h3>${item.description ? `<p>${e(item.description)}</p>` : ''}${item.link ? `<a class="link-more" href="${e(safeUrl(item.link))}" target="_blank" rel="noopener noreferrer">Related link ${icons.external}</a>` : ''}</div></li>`).join('')}</ol>`;
  return `<header class="profile-header"><div class="wrap">${breadcrumbs([[alum ? 'Alumni' : 'People', alum ? '/people/alumni' : '/people'], [record.title]])}<div class="profile-header-grid"><div class="profile-portrait">${image(record, 'portrait')}</div><div class="profile-intro"><p class="eyebrow">${alum ? 'KAABiL alumni' : 'Lab member'}</p><h1>${e(record.title)}</h1>${record.role || record.summary ? `<p class="lede">${e(record.role || record.summary)}</p>` : ''}`
    + `<ul class="contact-list">${record.email ? `<li><a href="mailto:${e(record.email)}">${icons.mail}<span>${e(record.email)}</span></a>${copyButton(record.email, 'Copy')}</li>` : ''}${record.phone ? `<li><a href="tel:${e(phone)}">${icons.phone}<span>${e(record.phone)}</span></a></li>` : ''}</ul>`
    + `${(record.social || []).length ? `<ul class="chip-links">${record.social.map(s => `<li><a href="${e(safeUrl(s.link))}" target="_blank" rel="noopener noreferrer">${e(s.type)} ${icons.external}</a></li>`).join('')}</ul>` : ''}</div></div></div></header>`
    + `<div class="wrap profile-layout"><aside class="profile-facts"><dl>${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${e(v)}</dd></div>`).join('')}</dl>${record.dissertationTitle || record.dissertationUrl ? `<div class="facts-block"><p class="eyebrow">Dissertation / thesis</p>${record.dissertationUrl ? `<a href="${e(safeUrl(record.dissertationUrl))}" target="_blank" rel="noopener noreferrer">${e(record.dissertationTitle || 'Read dissertation / thesis')} ${icons.external}</a>` : `<p>${e(record.dissertationTitle)}</p>`}</div>` : ''}</aside><div class="profile-main">`
    + (record.researchInterests ? `<section class="profile-section"><h2>Research interests</h2>${interests.length >= 2 && interests.length <= 16 ? `<ul class="tag-list">${interests.map(t => `<li>${e(t)}</li>`).join('')}</ul>` : ''}<p>${e(record.researchInterests)}</p></section>` : '')
    + (record.body || record.summary ? `<section class="profile-section"><h2>Biography</h2><div class="prose">${record.body ? richBody(record.body, records) : `<p>${e(record.summary)}</p>`}</div></section>` : '')
    + credentials.map(([k, label]) => `<section class="profile-section"><h2>${label}</h2>${timeline(record[k])}</section>`).join('')
    + (pubs.length ? `<section class="profile-section member-pubs" data-pub-filter><div class="profile-section-head"><h2>Selected publications</h2><span class="count-badge">${pubs.length}</span></div>${years.length > 1 ? `<div class="filter-chips" role="toolbar" aria-label="Filter publications by year"><button type="button" class="chip is-active" data-pub-year="all">All</button>${years.map(y => `<button type="button" class="chip" data-pub-year="${e(y)}">${e(y)}</button>`).join('')}</div>` : ''}<ol class="publication-entries compact">${pubs.map(p => `<li class="publication member-pub" data-year="${e(p.year || '')}"><div class="publication-text"><h3>${p.link ? `<a href="${e(safeUrl(p.link))}" target="_blank" rel="noopener noreferrer">${sanitizeHtml(p.title)}</a>` : sanitizeHtml(p.title)}</h3>${p.authors ? `<p class="authors">${sanitizeHtml(p.authors)}</p>` : ''}<p class="venue">${e(p.year || '')}</p></div><div class="publication-actions">${copyButton(citation(p))}</div></li>`).join('')}</ol></section>` : '')
    + (tools.length ? `<section class="profile-section"><h2>Software &amp; tools</h2><ul class="link-tiles">${tools.map(t => `<li><a href="${e(safeUrl(t.link || t.route))}" target="_blank" rel="noopener noreferrer">${e(t.title)} ${icons.external}</a></li>`).join('')}</ul></section>` : '')
    + ((record.workLinks || []).length ? `<section class="profile-section"><h2>Projects &amp; links</h2><ul class="link-tiles">${record.workLinks.map(w => `<li><a href="${e(safeUrl(w.link))}" target="_blank" rel="noopener noreferrer">${e(w.type)} ${icons.external}</a></li>`).join('')}</ul></section>` : '')
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
    + (siblings.length ? `<section class="related"><h2>Other research areas</h2><ul class="related-grid">${siblings.map(r => `<li><a href="${e(r.route)}"><span class="tag">Research</span><span class="related-title">${e(r.title)}</span>${arrow}</a></li>`).join('')}</ul></section>` : '')
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
