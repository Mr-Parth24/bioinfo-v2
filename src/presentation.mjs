/**
 * KAABiL identity: shared building blocks (icons, images, page headers), the site chrome
 * (utility bar, header, navigation, footer) and the editorial compositions (home, director, opportunities).
 * Factual content always comes from records; this file only decides how it is arranged.
 * See docs/architecture.md and docs/redesign-plan.md.
 */
import { readFileSync } from 'node:fs';
import { escapeHtml as e, safeUrl, sanitizeHtml } from './security.mjs';
import { setting, selectUpdates, activeOpportunities, dateValue, displayDate } from './editorial.mjs';

const assets = JSON.parse(readFileSync(new URL('../public/asset-map.json', import.meta.url)));
export const dimensions = url => (assets[url]?.width ? assets[url] : null);
export const asset = url => assets[url]?.url || url || '';
export const logo = asset('https://bioinfocore.usu.edu/raikou/image/bioinfo/kbllogo.png');
/** The original lab image server (Raikou). */
const RAIKOU = 'https://bioinfocore.usu.edu/raikou';

/* ---------- Icons (inline SVG, no inline styles: the CSP forbids them) ---------- */
const svg = (body, cls = '') => `<svg class="icon${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
export const icons = {
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 'icon-arrow'),
  external: svg('<path d="M7 17 17 7M8 7h9v9"/>', 'icon-external'),
  back: svg('<path d="M19 12H5M11 18l-6-6 6-6"/>'),
  chevron: svg('<path d="m6 9 6 6 6-6"/>', 'icon-chevron'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>', 'icon-menu'),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>', 'icon-close'),
  mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
  phone: svg('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'),
  pin: svg('<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>'),
  calendar: svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  copy: svg('<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2"/>'),
  doc: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
  globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  home: svg('<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'),
  people: svg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  flask: svg('<path d="M9 2v2h6V2"/><path d="M11 6v6l-4 8h10l-4-8V6"/>'),
  code: svg('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'),
};
export const arrow = icons.arrow;

/* ---------- Shared building blocks ---------- */
const initials = title => String(title || 'K').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('');

/** Responsive, CSP-safe image frame. Focal point is applied by site.js through the CSSOM. */
export function image(record, cls = '', expand = true) {
  const dims = dimensions(record.image);
  const url = safeUrl(asset(record.image), { image: true });
  const original = safeUrl(record.imageOriginal || record.image, { image: true });
  const size = record.imageVariants?.length
    ? ` srcset="${record.imageVariants.map(v => e(v.url) + ' ' + v.width + 'w').join(', ')}" sizes="(max-width:700px) 92vw, 50vw"`
    : dims ? ` width="${dims.width}" height="${dims.height}"`
    : record.imageWidth ? ` width="${record.imageWidth}" height="${record.imageHeight}"` : '';
  const img = url
    ? `<img${expand ? ' data-expand-image' : ''} data-original="${e(original)}" data-caption="${e(record.imageCaption || '')}" src="${e(url)}"${size} alt="${e(record.imageAlt || record.title)}" loading="lazy" decoding="async">`
    : '';
  const linked = img && expand
    ? `<a class="image-expand" href="${e(original)}" target="_blank" rel="noopener noreferrer" aria-label="Expand image: ${e(record.imageAlt || record.title)}">${img}</a>`
    : img;
  return `<div class="media-frame${cls ? ' ' + cls : ''}" data-fit="${e(record.imageFit || 'cover')}" data-focal-x="${Number(record.focalX ?? 50)}" data-focal-y="${Number(record.focalY ?? 50)}"><div class="media-fallback" aria-hidden="true"><span>${e(initials(record.title))}</span></div>${linked}</div>`;
}

export function breadcrumbs(trail) {
  if (!trail?.length) return '';
  const items = [['Home', '/'], ...trail];
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>${items.map(([label, href], i) =>
    i === items.length - 1 || !href
      ? `<li><span aria-current="page">${e(label)}</span></li>`
      : `<li><a href="${e(href)}">${e(label)}</a></li>`).join('')}</ol></nav>`;
}

/** Standard header for every section page: breadcrumb, eyebrow, serif title, intro and optional aside. */
export function pageHeader(title, intro, eyebrow = '', { trail = [], aside = '' } = {}) {
  return `<header class="page-header"><div class="wrap page-header-inner">${breadcrumbs(trail.length ? trail : [[title]])}<div class="page-header-grid"><div class="page-header-text">${eyebrow ? `<p class="eyebrow">${e(eyebrow)}</p>` : ''}<h1>${e(title)}</h1>${intro ? `<p class="lede">${e(intro)}</p>` : ''}</div>${aside ? `<div class="page-header-aside">${aside}</div>` : ''}</div></div></header>`;
}

function sectionHead(eyebrow, title, link, linkLabel, intro = '') {
  return `<div class="section-head"><div>${eyebrow ? `<p class="eyebrow">${e(eyebrow)}</p>` : ''}<h2>${e(title)}</h2>${intro ? `<p class="section-intro">${e(intro)}</p>` : ''}</div>${link ? `<a class="link-more" href="${e(link)}">${e(linkLabel)} ${arrow}</a>` : ''}</div>`;
}

/* ---------- Profile links (Google Scholar, ORCID, LinkedIn, …) ---------- */
const LINK_KINDS = [
  [/scholar\.google/i, 'Google Scholar', 'GS'], [/orcid\.org/i, 'ORCID', 'iD'], [/linkedin\.com/i, 'LinkedIn', 'in'],
  [/github\.com/i, 'GitHub', 'GH'], [/researchgate\.net/i, 'ResearchGate', 'RG'], [/(twitter|x)\.com/i, 'X', 'X'],
  [/pubmed|ncbi\.nlm/i, 'PubMed', 'PM'], [/youtube\.com/i, 'YouTube', 'YT'],
];
export function profileLinks(rows = []) {
  return rows.filter(x => safeUrl(x.link)).map(x => {
    const kind = LINK_KINDS.find(([re]) => re.test(x.link));
    const label = x.type || kind?.[1] || 'Website';
    return { href: safeUrl(x.link), label, mono: kind?.[2] || label.replace(/[^A-Za-z]/g, '').slice(0, 2) || '↗' };
  });
}
export const linkButtons = links => links.length ? `<ul class="profile-links">${links.map(l => `<li><a href="${e(l.href)}" target="_blank" rel="noopener noreferrer"><span class="link-mono" aria-hidden="true">${e(l.mono)}</span><span>${e(l.label)}</span>${icons.external}</a></li>`).join('')}</ul>` : '';

/* ---------- Category colours ("tones") shared by tool cards, chips and homepage tiles ---------- */
const TONES = ['rose', 'blue', 'teal', 'amber', 'green', 'violet', 'orange', 'indigo', 'pink', 'cyan'];
const TONE_BY_CATEGORY = {
  'Host-Pathogen Interactions': 'rose', 'Subcellular Localization Prediction': 'blue', 'Databases': 'teal',
  'Bioenergy': 'amber', 'Metagenomics': 'green', 'Descriptors': 'violet', 'Disease Forecasting': 'orange',
  'NGS Packages': 'indigo', 'Functional Annotation': 'pink',
};
export function toneFor(category = '') {
  if (TONE_BY_CATEGORY[category]) return TONE_BY_CATEGORY[category];
  let h = 0; for (const c of category) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

/* ---------- Navigation ---------- */
const published = records => records.filter(r => r.status === 'published');
const toolGroups = records => {
  const groups = new Map();
  for (const t of published(records).filter(r => r.collection === 'tools')) {
    const name = t.category || 'Other tools';
    const anchor = t.anchor || 'category-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!groups.has(name)) groups.set(name, { name, anchor, count: 0 });
    groups.get(name).count++;
  }
  return [...groups.values()];
};

export function navigation(records) {
  const research = published(records).filter(r => r.collection === 'research');
  return [
    { label: 'Research', href: '/research', match: ['/research'],
      intro: 'Machine learning and multi-omics data applied to biological questions.',
      links: [['Research program', '/research', 'Overview, objectives and approach'], ...research.map(r => [r.title, r.route, r.summary])] },
    { label: 'People', href: '/people', match: ['/people'],
      intro: 'Biologists, computer scientists and engineers working together.',
      links: [['Dr. Rakesh Kaundal', '/people/rakesh', 'Principal investigator'], ['Current team', '/people', 'Students, staff and researchers'], ['Alumni', '/people/alumni', 'Where our graduates went next']] },
    { label: 'Publications', href: '/publications', match: ['/publications'],
      intro: 'Peer-reviewed papers, conference work and editorial service.',
      links: [['Journal papers', '/publications', 'Peer-reviewed articles'], ['Conferences', '/publications/conferences', 'Talks and posters'], ['Editorials', '/publications/editorials', 'Proceedings and special issues']] },
    { label: 'Tools', href: '/tools', match: ['/tools'],
      intro: 'Free web servers and databases built by the lab.',
      links: [['All tools & databases', '/tools', 'Browse every resource'], ...toolGroups(records).map(g => [g.name, '/tools#' + g.anchor, g.count + (g.count === 1 ? ' resource' : ' resources')])] },
    { label: 'News & Events', href: '/news', match: ['/news', '/events'],
      intro: 'Stories, milestones and moments from the lab.',
      links: [['News', '/news', 'General, science and media stories'], ['Events', '/events', 'Conferences, symposia and lab life']] },
    { label: 'About', href: '/about', match: ['/about', '/contact', '/opportunities'],
      intro: 'Who we are, how to join us and how to reach us.',
      links: [['About the lab', '/about', 'Who we are and what we work on'], ['Lab overview', '/about/overview', 'Facility, tools, collaboration and training'], ['Opportunities', '/opportunities', 'Open positions and how to apply'], ['Contact', '/contact', 'Message, address and appointments']] },
  ];
}

const isActive = (path, item) => item.match.some(m => path === m || path.startsWith(m + '/'));

export function header(path, records = []) {
  const site = setting(records, 'settings:site');
  const home = setting(records, 'settings:home');
  const resources = (site.resourceLinks || []).slice(0, 2);
  const announcement = home?.announcement
    ? `<div class="announcement" role="region" aria-label="Announcement"><div class="wrap announcement-inner"><p>${e(home.announcement)}</p>${safeUrl(home.announcementLink) ? `<a href="${e(safeUrl(home.announcementLink))}">Learn more ${arrow}</a>` : ''}</div></div>`
    : '';
  const items = navigation(records).map((item, i) => {
    const active = isActive(path, item);
    return `<li class="nav-item">`
      + `<a class="nav-link" href="${item.href}"${active ? ' aria-current="page"' : ''}>${e(item.label)}</a>`
      + `<button type="button" class="nav-expand" aria-expanded="false" aria-controls="nav-panel-${i}"><span class="sr-only">${e(item.label)} menu</span>${icons.chevron}</button>`
      + `<div class="nav-panel" id="nav-panel-${i}"><div class="nav-panel-intro"><p class="nav-panel-title">${e(item.label)}</p><p>${e(item.intro)}</p></div>`
      + `<ul class="nav-panel-links">${item.links.map(([label, href, note]) => `<li><a href="${e(href)}"><span class="nav-panel-label">${e(label)}</span>${note ? `<span class="nav-panel-note">${e(note)}</span>` : ''}</a></li>`).join('')}</ul></div>`
      + `</li>`;
  }).join('');
  return `<div class="utility-bar"><div class="wrap utility-inner"><a class="utility-usu" href="https://www.usu.edu/">Utah State University</a><nav class="utility-links" aria-label="Lab resources">${resources.map(r => `<a href="${e(safeUrl(r.link))}">${e(r.type)}</a>`).join('')}<a href="https://biocluster.usu.edu/rstudio" target="_blank" rel="noopener noreferrer">USU RStudio</a><a href="/contact">Contact</a></nav></div></div>`
    + announcement
    + `<header class="site-header" data-site-header><div class="wrap header-inner">`
    + `<a class="brand" href="/" aria-label="KAABiL home"><img src="${e(logo)}" width="283" height="85" alt="KAABiL — Kaundal Artificial Intelligence & Advanced Bioinformatics Lab"></a>`
    + `<nav id="site-nav" class="primary-nav" aria-label="Main navigation"><ul class="nav-list">${items}</ul>`
    + `<div class="nav-mobile-footer">${resources.map(r => `<a href="${e(safeUrl(r.link))}">${e(r.type)}</a>`).join('')}<a href="https://biocluster.usu.edu/rstudio" target="_blank" rel="noopener noreferrer">USU RStudio</a><a href="/contact">Contact</a></div></nav>`
    + `<div class="header-actions"><a class="icon-button" href="/search" aria-label="Search the website">${icons.search}</a><a class="button button-small header-cta" href="/opportunities">Join the lab</a><button type="button" class="menu-button" aria-controls="site-nav" aria-expanded="false"><span class="menu-button-label">Menu</span>${icons.menu}${icons.close}</button></div>`
    + `</div></header>`
    + `<nav class="mobile-dock" aria-label="Quick navigation"><a href="/"${path === '/' ? ' aria-current="page"' : ''}>${icons.home}<span>Home</span></a><a href="/research"${path.startsWith('/research') ? ' aria-current="page"' : ''}>${icons.flask}<span>Research</span></a><a href="/tools"${path.startsWith('/tools') ? ' aria-current="page"' : ''}>${icons.code}<span>Tools</span></a><a href="/people"${path.startsWith('/people') ? ' aria-current="page"' : ''}>${icons.people}<span>People</span></a><button type="button" class="dock-menu-button menu-button" aria-controls="site-nav" aria-expanded="false">${icons.menu}<span>Menu</span></button></nav>`;
}

export function footer(records = []) {
  const c = setting(records, 'settings:site');
  const links = rows => (rows || []).map(r => `<li><a href="${e(safeUrl(r.link))}">${e(r.type)}</a></li>`).join('');
  const research = published(records).filter(r => r.collection === 'research');
  const phone = String(c.phone || '').replace(/[^+0-9]/g, '');
  return `<footer class="site-footer"><div class="wrap footer-top">`
    + `<div class="footer-identity"><a class="footer-wordmark" href="/"><span class="footer-mark">KAABiL</span><span class="footer-name">Kaundal Artificial Intelligence &amp; Advanced Bioinformatics Lab</span></a><p class="footer-text">${e(c.footerText)}</p>`
    + `<address class="footer-contact"><span>${icons.pin}<span>${e(c.address).replaceAll('\n', '<br>')}</span></span><a href="mailto:${e(c.email)}">${icons.mail}<span>${e(c.email)}</span></a>${c.phone ? `<a href="tel:${e(phone)}">${icons.phone}<span>${e(c.phone)}</span></a>` : ''}</address></div>`
    + `<nav class="footer-nav" aria-label="Footer"><div><h2>Research</h2><ul><li><a href="/research">Research program</a></li>${research.map(r => `<li><a href="${e(r.route)}">${e(r.title)}</a></li>`).join('')}</ul></div>`
    + `<div><h2>Explore</h2><ul><li><a href="/people">People</a></li><li><a href="/publications">Publications</a></li><li><a href="/tools">Tools &amp; databases</a></li><li><a href="/news">News</a></li><li><a href="/events">Events</a></li></ul></div>`
    + `<div><h2>About</h2><ul><li><a href="/about">About the lab</a></li><li><a href="/about/overview">Lab overview</a></li><li><a href="/opportunities">Opportunities</a></li><li><a href="/contact">Contact</a></li><li><button type="button" class="link-btn report-issue-btn" data-report-issue>Report a website issue</button></li></ul></div>`
    + `<div><h2>Affiliations</h2><ul>${links(c.affiliationLinks)}${links(c.resourceLinks)}</ul></div></nav></div>`
    + `<div class="wrap footer-bottom"><p>© ${new Date().getFullYear()} ${e(c.title)}</p><ul class="footer-social">${links(c.social)}</ul><a class="footer-admin" href="/admin">Editor sign-in</a></div>`
    + `<dialog id="report-issue-dialog" class="form-dialog">`
    + `<form action="https://api.web3forms.com/submit" method="POST" class="web3form web3form-report">`
    + `<input type="hidden" name="access_key" value="00849017-c746-4914-9c81-2d8c4ee2d17a">`
    + `<h3>Report an Issue</h3>`
    + `<p class="dialog-desc">Found a bug or broken link? Let us know so we can fix it!</p>`
    + `<input type="hidden" name="subject" value="Website Issue Report">`
    + `<input type="hidden" name="page_url" class="report-url-input">`
    + `<div class="form-group"><label for="report-type">Issue Type</label><select id="report-type" name="issue_type"><option value="Broken Link">Broken link</option><option value="Missing Content">Missing image/content</option><option value="Design Issue">Layout or design issue</option><option value="Typo">Typo or incorrect info</option><option value="Other">Other</option></select></div>`
    + `<div class="form-group"><label for="report-desc">Description</label><textarea id="report-desc" name="message" required placeholder="What is wrong?"></textarea></div>`
    + `<div class="dialog-actions"><button type="submit" class="button">Send Report</button><button type="button" class="button button-ghost" data-close-report>Cancel</button></div>`
    + `</form></dialog>`
    + `</footer>`;
}

/* ---------- Home ---------- */
const today = () => new Date().setUTCHours(0, 0, 0, 0);
const routeOf = r => r.route || (r.collection === 'publications' ? (safeUrl(r.link) || '/publications') : '/' + r.collection);

function updateItem(r, lead = false) {
  const type = { news: 'News', events: 'Event', publications: 'Publication' }[r.collection] || r.collection;
  const href = routeOf(r);
  const external = /^https?:/i.test(href);
  const title = r.collection === 'publications' ? sanitizeHtml(r.body || r.title) : e(r.title);
  if (lead) {
    return `<article class="update-lead">${r.image ? `<a class="update-lead-media" href="${e(href)}" tabindex="-1" aria-hidden="true">${image(r, '', false)}</a>` : ''}<div class="update-lead-body"><p class="meta"><span class="tag">${e(type)}</span><time>${e(displayDate(r))}</time></p><h3><a href="${e(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${title}</a></h3>${r.summary ? `<p>${e(r.summary)}</p>` : ''}</div></article>`;
  }
  return `<li class="update-item"><p class="meta"><span class="tag">${e(type)}</span><time>${e(displayDate(r))}</time></p><h3><a href="${e(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${title}</a></h3></li>`;
}

function pickEvent(records, c) {
  const all = published(records).filter(r => r.collection === 'events');
  if (c.eventMode === 'hidden') return null;
  if (c.eventMode === 'selected') {
    const chosen = (c.eventIds || []).map(id => all.find(r => r.id === id)).find(Boolean);
    return chosen ? { record: chosen, label: dateValue(chosen) >= today() ? 'Upcoming event' : 'Featured event' } : null;
  }
  const upcoming = all.filter(r => dateValue(r) >= today()).sort((a, b) => dateValue(a) - dateValue(b))[0];
  if (upcoming) return { record: upcoming, label: 'Upcoming event' };
  const recent = all.sort((a, b) => dateValue(b) - dateValue(a))[0];
  return recent ? { record: recent, label: 'Most recent event' } : null;
}

function pickOpportunity(records, c) {
  if (c.opportunityMode === 'hidden') return null;
  const open = activeOpportunities(records);
  if (c.opportunityMode === 'selected') return (c.opportunityIds || []).map(id => open.find(r => r.id === id)).find(Boolean) || null;
  return open[0] || null;
}

const SLIDE_LABEL = { news: 'News', events: 'Event', research: 'Research', pages: 'About' };
/** Hero slides: the homepage photo, any extra lab photos, then chosen, latest or random records with images. */
function heroSlides(records, inC) {
  const c = { heroMode: 'random', heroSlideCount: 8, ...inC };
  const slides = c.image ? [{ record: c, caption: c.imageCaption || '' }] : [];
  if (c.heroMode === 'single') return slides;
  for (const url of c.gallery || []) slides.push({ record: { image: url, imageAlt: 'Life in the KAABiL lab', title: 'KAABiL lab' }, caption: '' });
  const pool = published(records).filter(r => SLIDE_LABEL[r.collection] && r.image && r.route);
  let picked;
  if (c.heroMode === 'selected') picked = (c.heroSlideIds || []).map(id => pool.find(r => r.id === id)).filter(Boolean);
  else {
    const ordered = [...pool].sort((a, b) => dateValue(b) - dateValue(a));
    if (c.heroMode === 'random') for (let i = ordered.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ordered[i], ordered[j]] = [ordered[j], ordered[i]]; }
    picked = ordered.slice(0, Number(c.heroSlideCount) || 4);
  }
  return slides.concat(picked.map(r => ({ record: r, label: SLIDE_LABEL[r.collection], href: r.route })));
}
function heroFigure(records, c) {
  const slides = heroSlides(records, c);
  if (slides.length < 2) return `<figure class="home-hero-figure">${image(c, 'home-hero-image', false)}${c.imageCaption ? `<figcaption>${e(c.imageCaption)}</figcaption>` : ''}</figure>`;
  const caption = s => s.href
    ? `<figcaption class="slide-caption"><span class="slide-tag">${e(s.label)}</span><a href="${e(s.href)}">${e(s.record.title)}</a></figcaption>`
    : s.caption ? `<figcaption class="slide-caption"><span>${e(s.caption)}</span></figcaption>` : '';
  return `<figure class="home-hero-figure hero-slideshow" data-slideshow aria-roledescription="carousel" aria-label="Highlights from the lab">`
    + `<div class="slides">${slides.map((s, i) => `<div class="hero-slide${i ? '' : ' is-active'}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${slides.length}"${i ? ' aria-hidden="true"' : ''}>${image(s.record, 'home-hero-image', false)}${caption(s)}</div>`).join('')}</div>`
    + `<div class="slide-controls"><button type="button" class="slide-arrow" data-slide-prev aria-label="Previous slide"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>`
    + `<div class="slide-dots">${slides.map((_, i) => `<button type="button" data-slide-to="${i}" aria-label="Show slide ${i + 1}"${i ? '' : ' aria-current="true"'}></button>`).join('')}</div>`
    + `<button type="button" class="slide-arrow" data-slide-next aria-label="Next slide"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>`
    + `<button type="button" class="slide-pause" data-slide-pause aria-label="Pause slideshow"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="i-pause" d="M9 6v12M15 6v12"/><path class="i-play" d="M8 5l11 7-11 7z"/></svg></button></div></figure>`;
}

export function homepage(records) {
  const c = setting(records, 'settings:home');
  const live = published(records);
  const research = live.filter(r => r.collection === 'research');
  const papers = live.filter(r => r.collection === 'publications' && r.category === 'Papers').sort((a, b) => dateValue(b) - dateValue(a));
  const director = setting(records, 'settings:director');
  const showDirector = director && director.status === 'published';
  const event = pickEvent(records, c);
  const feedCount = Number(c.feedCount) || 3;
  const updates = selectUpdates(records, { ...c, feedCount: feedCount + 1 }).filter(r => r.id !== event?.record.id).slice(0, feedCount);
  const opening = pickOpportunity(records, c);

  const facts = [
    [live.filter(r => r.collection === 'tools').length, 'Open tools & databases', '/tools'],
    [papers.length, 'Peer-reviewed papers', '/publications'],
    [live.filter(r => r.collection === 'publications' && r.category === 'Conferences').length, 'Conference presentations', '/publications/conferences'],
    [live.filter(r => r.collection === 'people').length, 'Lab members, past & present', '/people'],
  ].filter(([n]) => n);

  const hero = `<section class="home-hero"><div class="wrap home-hero-grid">`
    + `<div class="home-hero-text"><p class="eyebrow">Kaundal Artificial Intelligence &amp; Advanced Bioinformatics Lab</p><h1>${e(c.title)}</h1><p class="lede">${e(c.summary)}</p>`
    + `<div class="hero-actions"><a class="button" href="${e(safeUrl(c.primaryLink) || '/research')}">${e(c.primaryLabel || 'Explore our research')} ${arrow}</a><a class="button button-ghost" href="${e(safeUrl(c.secondaryLink) || '/people')}">${e(c.secondaryLabel || 'Meet the team')}</a></div></div>`
    + heroFigure(records, c)
    + `</div>`
    + (facts.length ? `<div class="wrap"><dl class="facts" aria-label="The lab at a glance">${facts.map(([n, label, href]) => `<div class="fact"><dt><a href="${href}">${e(label)}</a></dt><dd data-countup="${n}">${n}</dd></div>`).join('')}</dl></div>` : '')
    + `</section>`;

  const areas = research.length ? `<section class="home-section"><div class="wrap">${sectionHead('Research', 'What we study', '/research', 'The research program', 'Research areas that combine machine learning, multi-omics data and open software.')}`
    + `<ol class="area-grid">${research.map((r, i) => `<li class="area-card reveal"><a href="${e(r.route)}">${image(r, 'area-image', false)}<span class="area-index">${String(i + 1).padStart(2, '0')}</span><h3>${e(r.title)}</h3>${r.summary ? `<p>${e(r.summary)}</p>` : ''}</a></li>`).join('')}</ol></div></section>` : '';

  const [lead, ...rest] = updates;
  const latest = (updates.length || event || opening) ? `<section class="home-section home-latest"><div class="wrap">${sectionHead('From the lab', 'Latest news & activity', '/news', 'All news')}`
    + `<div class="latest-grid">${updates.length ? `<div class="latest-main">${updateItem(lead, true)}${rest.length ? `<ul class="update-list">${rest.map(r => updateItem(r)).join('')}</ul>` : ''}</div>` : ''}`
    + ((event || opening) ? `<aside class="latest-aside">${event ? eventPanel(event) : ''}${opening ? `<div class="aside-panel aside-opportunity"><p class="eyebrow">Open opportunity</p><h3><a href="${e(opening.route)}">${e(opening.title)}</a></h3>${opening.summary ? `<p>${e(opening.summary)}</p>` : ''}${opening.deadline ? `<p class="meta">Apply by ${e(displayDate({ date: opening.deadline }))}</p>` : ''}<a class="link-more" href="${e(opening.route)}">Details ${arrow}</a></div>` : ''}</aside>` : '')
    + `</div></div></section>` : '';

  const groups = toolGroups(records);
  const tools = groups.length ? `<section class="home-section home-tools"><div class="wrap">${sectionHead('Resources', 'Open tools for the research community', '/tools', 'Browse all tools', 'Web servers and databases developed by the lab, free to use for academic research.')}`
    + `<ul class="tool-categories">${groups.map(g => `<li class="reveal glow" data-tone="${toneFor(g.name)}"><a href="/tools#${e(g.anchor)}"><span class="tone-dot" aria-hidden="true"></span><span class="tool-category-name">${e(g.name)}</span><span class="tool-category-count">${g.count} ${g.count === 1 ? 'resource' : 'resources'}</span>${arrow}</a></li>`).join('')}</ul></div></section>` : '';

  const pubs = papers.length ? `<section class="home-section"><div class="wrap">${sectionHead('Scholarship', 'Recent publications', '/publications', 'All publications')}`
    + `<ol class="pub-teaser">${papers.slice(0, 4).map(r => `<li class="reveal"><span class="pub-teaser-year">${e(r.year)}</span><div><h3>${r.link ? `<a href="${e(safeUrl(r.link))}" target="_blank" rel="noopener noreferrer">${sanitizeHtml(r.body || r.title)}</a>` : sanitizeHtml(r.body || r.title)}</h3><p class="authors">${sanitizeHtml(r.authors)}</p></div></li>`).join('')}</ol></div></section>` : '';

  const lab = showDirector ? `<section class="home-section home-director"><div class="wrap director-band">${image(director, 'director-band-image', false)}<div class="director-band-text"><p class="eyebrow">Principal investigator</p><h2>${e(director.title)}</h2><p class="director-band-role">${e(director.summary)}</p><p>Dr. Kaundal leads KAABiL and directs the Bioinformatics Facility at Utah State University.</p><div class="hero-actions"><a class="button" href="/people/rakesh">Read profile ${arrow}</a><a class="button button-ghost" href="/publications">Publications</a></div></div></div></section>` : '';

  const sponsors = `<section class="home-section home-sponsors"><div class="wrap"><div class="section-head"><div><p class="eyebrow">Institutional support & research sponsors</p><h2>Partners &amp; Affiliations</h2></div></div><ul class="chip-links"><li><a href="https://www.usu.edu/" target="_blank" rel="noopener noreferrer">Utah State University ${icons.external}</a></li><li><a href="https://caas.usu.edu/" target="_blank" rel="noopener noreferrer">College of Agriculture &amp; Applied Sciences ${icons.external}</a></li><li><a href="https://psc.usu.edu/" target="_blank" rel="noopener noreferrer">Plants, Soils &amp; Climate ${icons.external}</a></li><li><a href="https://nifa.usda.gov/" target="_blank" rel="noopener noreferrer">USDA-NIFA ${icons.external}</a></li><li><a href="https://www.nsf.gov/" target="_blank" rel="noopener noreferrer">National Science Foundation ${icons.external}</a></li><li><a href="https://www.nih.gov/" target="_blank" rel="noopener noreferrer">National Institutes of Health ${icons.external}</a></li></ul></div></section>`;

  const join = `<section class="home-join"><div class="wrap join-band"><div><p class="eyebrow">Join us</p><h2>Students, postdocs and visiting researchers are welcome.</h2><p>We look for curious people from biology, computer science, statistics and engineering. Tell us about your interests.</p></div><div class="join-actions"><a class="button button-light" href="/opportunities">See opportunities ${arrow}</a><a class="button button-outline-light" href="/contact">Contact the lab</a></div></div></section>`;

  return hero + areas + latest + tools + pubs + lab + sponsors + join;
}

function eventPanel({ record: r, label }) {
  const place = r.location || r.original?.location || '';
  return `<div class="aside-panel aside-event"><p class="eyebrow">${e(label)}</p>${r.image ? `<a class="aside-media" href="${e(r.route)}" tabindex="-1" aria-hidden="true">${image(r, '', false)}</a>` : ''}<h3><a href="${e(r.route)}">${e(r.title)}</a></h3><p class="meta-line">${icons.calendar}<span>${e(displayDate(r))}</span></p>${place ? `<p class="meta-line">${icons.pin}<span>${e(place)}</span></p>` : ''}<a class="link-more" href="/events">All events ${arrow}</a></div>`;
}

/* ---------- Director profile ---------- */
export function director(records) {
  const r = setting(records, 'settings:director');
  const rows = (key, title) => (r[key] || []).length
    ? `<section id="${key}" class="profile-section reveal"><h2>${title}</h2><ol class="timeline">${r[key].map(item => `<li><span class="timeline-date">${e(item.date)}</span><div><h3>${e(item.title)}</h3>${item.description ? `<p>${e(item.description)}</p>` : ''}${item.link ? `<a class="link-more" href="${e(safeUrl(item.link))}" target="_blank" rel="noopener noreferrer">Institution ${icons.external}</a>` : ''}</div></li>`).join('')}</ol></section>`
    : '';
  const sections = [['overview', 'Overview'], ['education', 'Education'], ['appointments', 'Appointments'], ['awards', 'Awards'], ['scholarship', 'Scholarship']]
    .filter(([id]) => ['overview', 'scholarship'].includes(id) || (r[id] || []).length);
  const phone = String(r.phone || '').replace(/[^+0-9]/g, '');
  return `<header class="profile-header"><div class="wrap">${breadcrumbs([['People', '/people'], [r.title]])}<div class="profile-header-grid">`
    + `<div class="profile-portrait">${image(r, 'portrait')}</div>`
    + `<div class="profile-intro"><p class="profile-badges"><span class="status-pill is-current">Principal investigator</span><span class="group-pill">Director, Bioinformatics Facility</span></p><h1>${e(r.title)}</h1><p class="lede">${e(r.summary)}</p><p class="profile-affiliation">Department of Plants, Soils &amp; Climate · Utah State University, Logan, Utah</p>`
    + `<ul class="contact-list">${r.email ? `<li><a href="mailto:${e(r.email)}">${icons.mail}<span>${e(r.email)}</span></a><button type="button" class="copy-button" data-copy="${e(r.email)}" aria-label="Copy email address">${icons.copy}<span class="copy-text">Copy</span></button></li>` : ''}${r.phone ? `<li><a href="tel:${e(phone)}">${icons.phone}<span>${e(r.phone)}</span></a></li>` : ''}</ul>`
    + linkButtons(profileLinks(r.social || []))
    + `<dl class="profile-stats">${[[(r.education || []).length, 'Degrees & fellowships'], [(r.appointments || []).length, 'Appointments'], [(r.awards || []).length, 'Awards'], [records.filter(x => x.status === 'published' && x.collection === 'tools').length, 'Lab tools']].filter(([n]) => n).map(([n, l]) => `<div><dd>${n}</dd><dt>${l}</dt></div>`).join('')}</dl></div></div></div></header>`
    + `<div class="wrap profile-layout"><nav class="profile-toc" aria-label="On this page"><p class="eyebrow">On this page</p>${sections.map(([id, label]) => `<a href="#${id}">${label}</a>`).join('')}</nav><div class="profile-main">`
    + `<section id="overview" class="profile-section"><h2>Overview &amp; research interests</h2><div class="prose">${sanitizeHtml(r.body).replace(/<h2>Dr\. Rakesh Kaundal<\/h2>/, '')}</div></section>`
    + rows('education', 'Education') + rows('appointments', 'Professional appointments') + rows('awards', 'Awards &amp; honours')
    + `<section id="scholarship" class="profile-section reveal"><h2>Scholarship &amp; community</h2><p>Explore the lab’s publications and meet the people behind the work.</p><ul class="link-tiles"><li><a href="/publications">Publications ${arrow}</a></li><li><a href="/people">The team ${arrow}</a></li><li><a href="/research">Research ${arrow}</a></li><li><a href="https://www.youtube.com/watch?v=r-Ay28WKFLY" target="_blank" rel="noopener noreferrer">Dr. Kaundal’s journey (video) ${icons.external}</a></li></ul>${related({ ...r, toolIds: [] }, records)}</section>`
    + `</div></div>`;
}

export function related(record, records) {
  const ids = new Set(['researchIds', 'peopleIds', 'publicationIds', 'toolIds'].flatMap(k => record[k] || []));
  const items = records.filter(r => r.status === 'published' && ids.has(r.id) && r.id !== record.id);
  const label = { research: 'Research', people: 'Person', publications: 'Publication', tools: 'Tool' };
  return items.length
    ? `<section class="related"><h2>Related work</h2><ul class="related-grid">${items.map(r => `<li><a class="glow" href="${e(safeUrl(r.route || r.link) || '/publications')}"><span class="tag">${e(label[r.collection] || r.collection)}</span><span class="related-title">${e(r.title)}</span>${arrow}</a></li>`).join('')}</ul></section>`
    : '';
}

/* ---------- Opportunities ---------- */
export function opportunities(records) {
  const all = records.filter(r => r.collection === 'opportunities');
  const active = activeOpportunities(records);
  const closed = all.filter(r => !active.includes(r));
  // The "Joining the lab" page record (pages:contact) holds the eligibility text editors maintain.
  const joining = records.find(r => r.id === 'pages:contact' && r.status === 'published');
  const cards = rows => `<ul class="opportunity-list">${rows.map(r => `<li class="opportunity-card glow"><div><p class="eyebrow">${e(r.category || 'Research opportunity')}</p><h2><a href="${e(r.route)}">${e(r.title)}</a></h2>${r.summary ? `<p>${e(r.summary)}</p>` : ''}<p class="meta">${[r.location, r.deadline ? 'Apply by ' + displayDate({ date: r.deadline }) : ''].filter(Boolean).map(e).join(' · ')}</p></div><a class="button button-ghost" href="${e(r.route)}">Details ${arrow}</a></li>`).join('')}</ul>`;
  const empty = `<div class="notice-panel"><div><h2>No open positions are listed right now</h2><p>We still welcome enquiries from prospective graduate students, postdoctoral researchers and visiting scholars. Send Dr. Kaundal a short note about your interests and background.</p></div><div class="join-actions"><a class="button" href="#joining">Who can join ${arrow}</a></div></div>`;
  return pageHeader('Opportunities', 'Open positions in the lab, and who can join.', 'Join the lab', { trail: [['About', '/about'], ['Opportunities']] })
    + `<div class="wrap page-body">${active.length ? cards(active) : empty}${closed.length ? `<details class="archive-panel"><summary>Past opportunities (${closed.length})</summary>${cards(closed)}</details>` : ''}`
    + (joining?.body ? `<section class="split-section" id="joining"><div class="split-head"><p class="eyebrow">How to join</p><h2>${e(joining.title)}</h2><a class="button button-ghost" href="/contact">Contact the lab ${arrow}</a></div><div class="prose">${sanitizeHtml(joining.body)}</div></section>` : '')
    + `</div>`;
}

export { RAIKOU };
