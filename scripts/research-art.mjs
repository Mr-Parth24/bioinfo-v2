/**
 * Original illustrations for the six research areas, drawn as SVG and rasterised to WebP with Sharp.
 * Everything here is generated (no stock or third-party artwork), so the images carry no outside copyright.
 * A fixed seed per area keeps the output reproducible: `node scripts/research-art.mjs` rewrites
 * public/media/research-*.webp. Record changes are applied through content/content-updates.json.
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const W = 1600, H = 1200;
export const SIZES = [640, 1200, 1600];

function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const f = n => Math.round(n * 10) / 10;
const BASES = { A: '#22c55e', C: '#3b82f6', G: '#f59e0b', T: '#ef4444' };

/** Shared frame: deep navy field, coloured glows, fine dot grid and vignette. */
function frame(body, { glows = [], bg = ['#0b1b2d', '#10283f'], defs = '' } = {}) {
  const glowDefs = glows.map(([, , , c], i) => `<radialGradient id="g${i}"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient>
<pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.3" fill="#fff" fill-opacity=".07"/></pattern>
<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>
<filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>
${glowDefs}${defs}</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
${glows.map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#g${i})"/>`).join('')}
<rect width="${W}" height="${H}" fill="url(#dots)"/>
${body}
<rect width="${W}" height="${H}" fill="url(#vig)"/></svg>`;
}

/* ---------- Artificial intelligence: sequence in, neural network, prediction out ---------- */
function ai() {
  const r = rng(11), layers = [6, 9, 11, 9, 5], x0 = 400, x1 = 1230;
  const nodes = layers.map((n, li) => Array.from({ length: n }, (_, i) => ({
    x: x0 + (x1 - x0) * li / (layers.length - 1),
    y: 600 + (i - (n - 1) / 2) * 86 + Math.sin(li * 1.3) * 14,
  })));
  let edges = '', hot = '';
  for (let li = 0; li < layers.length - 1; li++) for (const a of nodes[li]) for (const b of nodes[li + 1]) {
    const w = r(), c = `M${f(a.x)} ${f(a.y)}C${f(a.x + 90)} ${f(a.y)} ${f(b.x - 90)} ${f(b.y)} ${f(b.x)} ${f(b.y)}`;
    edges += `<path d="${c}" stroke="${w > .5 ? '#818cf8' : '#38bdf8'}" stroke-opacity="${f(.04 + w * w * .3)}" stroke-width="${f(.6 + w * 1.6)}" fill="none"/>`;
  }
  // Two highlighted inference paths through the network.
  for (const [colour, picks] of [['#22d3ee', [1, 3, 5, 4, 1]], ['#c084fc', [4, 6, 7, 2, 3]]]) {
    const pts = picks.map((p, li) => nodes[li][p]);
    const d = pts.map((p, i) => i ? `C${f(pts[i - 1].x + 90)} ${f(pts[i - 1].y)} ${f(p.x - 90)} ${f(p.y)} ${f(p.x)} ${f(p.y)}` : `M${f(p.x)} ${f(p.y)}`).join('');
    hot += `<path d="${d}" stroke="${colour}" stroke-width="10" fill="none" opacity=".5" filter="url(#blur)"/><path d="${d}" stroke="${colour}" stroke-width="3" fill="none"/>`;
  }
  const lit = new Set(['0:1', '1:3', '2:5', '3:4', '4:1', '0:4', '1:6', '2:7', '3:2', '4:3']);
  const circles = nodes.flatMap((layer, li) => layer.map((n, i) => {
    const on = lit.has(`${li}:${i}`);
    return `${on ? `<circle cx="${f(n.x)}" cy="${f(n.y)}" r="26" fill="#a5b4fc" opacity=".35" filter="url(#blur)"/>` : ''}<circle cx="${f(n.x)}" cy="${f(n.y)}" r="${on ? 15 : 12}" fill="${on ? '#e0e7ff' : '#14304d'}" stroke="${on ? '#fff' : '#6d7fd8'}" stroke-width="2.5"/>`;
  })).join('');
  // Input: a column of sequence letters as coloured tiles; output: class probabilities.
  const seq = 'ATGCGTACGTTAGC';
  const tiles = [...seq].map((b, i) => `<rect x="${150 + (i % 2) * 52}" y="${f(258 + Math.floor(i / 2) * 98)}" width="40" height="40" rx="9" fill="${BASES[b]}" opacity="${f(.55 + r() * .4)}"/>`).join('')
    + nodes[0].map(n => `<path d="M262 ${f(n.y)}H${f(n.x - 22)}" stroke="#94a3b8" stroke-opacity=".35" stroke-width="2" stroke-dasharray="3 7"/>`).join('');
  const probs = [.08, .71, .12, .04, .05];
  const bars = nodes[4].map((n, i) => `<path d="M${f(n.x + 22)} ${f(n.y)}H1300" stroke="#94a3b8" stroke-opacity=".3" stroke-width="2"/><rect x="1310" y="${f(n.y - 13)}" width="190" height="26" rx="13" fill="#fff" fill-opacity=".08"/><rect x="1310" y="${f(n.y - 13)}" width="${f(26 + probs[i] * 164)}" height="26" rx="13" fill="${i === 1 ? '#22d3ee' : '#6366f1'}" opacity="${i === 1 ? 1 : .55}"/>`).join('');
  // Faint circuit traces behind everything.
  let traces = '';
  for (let i = 0; i < 26; i++) {
    const x = r() * W, y = r() * H, l = 60 + r() * 160, up = r() > .5 ? -1 : 1;
    traces += `<path d="M${f(x)} ${f(y)}h${f(l)}l40 ${40 * up}h${f(l * .6)}" stroke="#818cf8" stroke-opacity=".12" stroke-width="2" fill="none"/><circle cx="${f(x + l * 1.6 + 40)}" cy="${f(y + 40 * up)}" r="5" fill="none" stroke="#818cf8" stroke-opacity=".2" stroke-width="2"/>`;
  }
  return frame(traces + edges + hot + circles + tiles + bars, { glows: [[800, 600, 620, '#4f46e5'], [1350, 300, 420, '#0891b2'], [200, 1000, 380, '#7c3aed']] });
}

/* ---------- Host–pathogen interactions: virions docking on a host cell membrane ---------- */
function hpi() {
  const r = rng(23);
  const cx = 380, cy = 1180, R = 760;
  let membrane = '';
  for (let a = -95; a <= 5; a += 1.15) {
    const t = a * Math.PI / 180;
    for (const [rr, op] of [[R, .9], [R - 26, .7]]) membrane += `<circle cx="${f(cx + rr * Math.cos(t))}" cy="${f(cy + rr * Math.sin(t))}" r="8" fill="#2dd4bf" fill-opacity="${op}"/>`;
  }
  // Receptors (Y shapes) along the membrane, pointing outward.
  let receptors = '';
  const receptorAngles = [-82, -68, -55, -41, -28, -14];
  for (const a of receptorAngles) {
    const t = a * Math.PI / 180, bx = cx + (R + 6) * Math.cos(t), by = cy + (R + 6) * Math.sin(t);
    const deg = a + 90;
    receptors += `<g transform="translate(${f(bx)} ${f(by)}) rotate(${f(deg)})"><path d="M0 0v-46M0 -46l-20 -30M0 -46l20 -30" stroke="#5eead4" stroke-width="9" stroke-linecap="round" fill="none"/><circle cx="-20" cy="-76" r="7" fill="#ccfbf1"/><circle cx="20" cy="-76" r="7" fill="#ccfbf1"/></g>`;
  }
  const virion = (x, y, s, rot, opacity = 1) => {
    let spikes = '';
    for (let i = 0; i < 14; i++) {
      const t = i / 14 * Math.PI * 2;
      spikes += `<path d="M${f(Math.cos(t) * 52)} ${f(Math.sin(t) * 52)}L${f(Math.cos(t) * 78)} ${f(Math.sin(t) * 78)}" stroke="#fb7185" stroke-width="6" stroke-linecap="round"/><circle cx="${f(Math.cos(t) * 82)}" cy="${f(Math.sin(t) * 82)}" r="9" fill="#fecdd3"/>`;
    }
    const hex = Array.from({ length: 6 }, (_, i) => { const t = i / 6 * Math.PI * 2; return `${f(Math.cos(t) * 56)},${f(Math.sin(t) * 56)}`; }).join(' ');
    const inner = Array.from({ length: 6 }, (_, i) => { const t = (i / 6 + 1 / 12) * Math.PI * 2; return `${f(Math.cos(t) * 30)},${f(Math.sin(t) * 30)}`; }).join(' ');
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot}) scale(${s})" opacity="${opacity}"><circle r="70" fill="#e11d48" opacity=".35" filter="url(#blur)"/>${spikes}<polygon points="${hex}" fill="#9f1239" stroke="#fda4af" stroke-width="5"/><polygon points="${inner}" fill="none" stroke="#fda4af" stroke-opacity=".6" stroke-width="3"/><circle r="10" fill="#fecdd3"/></g>`;
  };
  // Interaction network: host proteins (teal) linked to pathogen proteins (rose).
  const hostN = Array.from({ length: 16 }, () => ({ x: 120 + r() * 700, y: 260 + r() * 420, c: '#2dd4bf' }));
  const pathN = Array.from({ length: 12 }, () => ({ x: 860 + r() * 640, y: 120 + r() * 520, c: '#fb7185' }));
  let net = '';
  for (const p of pathN) for (let k = 0; k < 2; k++) { const h = hostN[Math.floor(r() * hostN.length)]; net += `<path d="M${f(p.x)} ${f(p.y)}Q${f((p.x + h.x) / 2)} ${f(Math.min(p.y, h.y) - 120)} ${f(h.x)} ${f(h.y)}" stroke="#f9a8d4" stroke-opacity=".18" stroke-width="2" fill="none"/>`; }
  net += [...hostN, ...pathN].map(n => `<circle cx="${f(n.x)}" cy="${f(n.y)}" r="${f(5 + r() * 6)}" fill="${n.c}" fill-opacity=".55"/>`).join('');
  const docking = (() => { const t = -41 * Math.PI / 180; return [cx + (R + 175) * Math.cos(t), cy + (R + 175) * Math.sin(t)]; })();
  const body = net
    + `<circle cx="${cx}" cy="${cy}" r="${R - 40}" fill="#0d9488" fill-opacity=".12"/>`
    + membrane + receptors
    + `<circle cx="${cx - 40}" cy="${cy - 260}" r="150" fill="#14b8a6" fill-opacity=".14" stroke="#5eead4" stroke-opacity=".3" stroke-width="3"/>`
    + virion(docking[0], docking[1], 1.15, 8)
    + virion(1230, 330, 1.35, 20) + virion(1420, 720, .85, 40, .9) + virion(980, 170, .6, 5, .7) + virion(1500, 160, .45, 30, .55);
  return frame(body, { glows: [[300, 900, 600, '#0d9488'], [1250, 380, 520, '#e11d48']] });
}

/* ---------- Protein function prediction: a folded chain with annotated domains ---------- */
function pfp() {
  const r = rng(37);
  // Alpha helix as a coiled ribbon: a projected 3D spiral, back segments drawn first and darker.
  const helix = (x0, y0, len, turns, amp, colA, colB) => {
    const steps = turns * 36, seg = [];
    for (let i = 0; i < steps; i++) {
      const p = i / steps, q = (i + 1) / steps, a = p * turns * Math.PI * 2, b = q * turns * Math.PI * 2;
      seg.push({ d: `M${f(x0 + p * len + Math.cos(a) * amp * .45)} ${f(y0 + Math.sin(a) * amp)}L${f(x0 + q * len + Math.cos(b) * amp * .45)} ${f(y0 + Math.sin(b) * amp)}`, z: Math.cos((a + b) / 2) });
    }
    const draw = s => `<path d="${s.d}" stroke="${s.z > 0 ? colA : colB}" stroke-width="${f(22 + s.z * 8)}" stroke-linecap="round"/>`;
    return seg.filter(s => s.z <= 0).map(draw).join('') + seg.filter(s => s.z > 0).map(draw).join('');
  };
  const strand = (x, y, len, angle, col) => `<g transform="translate(${x} ${y}) rotate(${angle})"><path d="M0 -22H${len - 60}V-46L${len} 0L${len - 60} 46V22H0Z" fill="${col}" stroke="#fff" stroke-opacity=".25" stroke-width="3"/></g>`;
  const loop = d => `<path d="${d}" stroke="#e2e8f0" stroke-opacity=".75" stroke-width="10" fill="none" stroke-linecap="round"/>`;
  const body = loop('M120 980C260 900 200 760 330 700') + loop('M760 640C900 600 940 520 1040 560') + loop('M1250 660C1360 740 1300 860 1180 900') + loop('M740 930C620 1000 560 1080 440 1060') + loop('M1060 900C960 930 900 900 820 920')
    + `<g opacity=".95">${helix(330, 650, 430, 5, 62, '#f59e0b', '#b45309')}</g>`
    + `<g opacity=".95">${helix(1040, 600, 240, 3, 52, '#fb923c', '#c2410c')}</g>`
    + strand(1180, 900, 300, 180, '#3b82f6') + strand(840, 960, 280, 0, '#60a5fa') + strand(1120, 1030, 320, 180, '#2563eb');
  // Annotation call-outs: leader lines to tags with "text" bars.
  const tags = [[520, 560, 300, 250, '#fbbf24'], [1130, 500, 1180, 230, '#fb923c'], [980, 960, 1300, 1080, '#60a5fa'], [300, 760, 120, 440, '#a78bfa']];
  let notes = '';
  for (const [px, py, tx, ty, c] of tags) {
    notes += `<path d="M${px} ${py}L${tx + 100} ${ty + 40}" stroke="${c}" stroke-opacity=".6" stroke-width="2.5" stroke-dasharray="6 6"/><circle cx="${px}" cy="${py}" r="9" fill="${c}"/>`
      + `<rect x="${tx}" y="${ty}" width="230" height="84" rx="14" fill="#0f2439" fill-opacity=".85" stroke="${c}" stroke-width="2.5"/><circle cx="${tx + 30}" cy="${ty + 42}" r="12" fill="${c}"/><rect x="${tx + 56}" y="${ty + 26}" width="${f(120 + r() * 40)}" height="11" rx="5.5" fill="#e2e8f0" fill-opacity=".8"/><rect x="${tx + 56}" y="${ty + 48}" width="${f(70 + r() * 60)}" height="10" rx="5" fill="#e2e8f0" fill-opacity=".4"/>`;
  }
  // Domain map along the top: a protein sequence bar with coloured domains.
  const domains = `<rect x="560" y="92" width="900" height="22" rx="11" fill="#fff" fill-opacity=".12"/><rect x="620" y="82" width="230" height="42" rx="12" fill="#f59e0b"/><rect x="900" y="82" width="140" height="42" rx="12" fill="#fb923c"/><rect x="1110" y="82" width="250" height="42" rx="12" fill="#3b82f6"/>`
    + Array.from({ length: 34 }, (_, i) => `<rect x="${570 + i * 26}" y="138" width="16" height="${f(6 + r() * 26)}" rx="3" fill="#94a3b8" fill-opacity=".35"/>`).join('');
  return frame(domains + body + notes, { glows: [[600, 650, 520, '#d97706'], [1150, 900, 460, '#2563eb'], [1300, 300, 320, '#ea580c']] });
}

/* ---------- Metagenomics: a microbial community seen through a lens, with a tree of life ---------- */
function metagenomics() {
  const r = rng(53);
  const lx = 640, ly = 620, LR = 470;
  const palette = ['#4ade80', '#a3e635', '#2dd4bf', '#facc15', '#38bdf8', '#f472b6'];
  let microbes = '';
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (LR - 50), x = lx + Math.cos(a) * d, y = ly + Math.sin(a) * d;
    const c = palette[Math.floor(r() * palette.length)], rot = f(r() * 180), kind = r();
    if (kind < .4) { const l = 50 + r() * 50; microbes += `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot})"><rect x="${f(-l / 2)}" y="-15" width="${f(l)}" height="30" rx="15" fill="${c}" fill-opacity=".35" stroke="${c}" stroke-width="3"/><path d="M${f(-l / 4)} 0H${f(l / 4)}" stroke="${c}" stroke-opacity=".7" stroke-width="3" stroke-linecap="round"/></g>`; }
    else if (kind < .7) { microbes += `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot})">${[0, 1, 2].slice(0, 1 + Math.floor(r() * 3)).map(k => `<circle cx="${k * 30}" cy="0" r="14" fill="${c}" fill-opacity=".4" stroke="${c}" stroke-width="3"/>`).join('')}</g>`; }
    else if (kind < .85) { microbes += `<path transform="translate(${f(x)} ${f(y)}) rotate(${rot})" d="M-45 0q11 -18 22 0t22 0t22 0t22 0" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>`; }
    else { microbes += `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot})"><ellipse rx="24" ry="17" fill="${c}" fill-opacity=".35" stroke="${c}" stroke-width="3"/><path d="M24 0q30 -10 50 8" stroke="${c}" stroke-width="2.5" fill="none"/></g>`; }
  }
  // Soil particles and plant roots outside the lens.
  let soil = '';
  for (let i = 0; i < 90; i++) { const x = r() * W, y = 300 + r() * 900; if (Math.hypot(x - lx, y - ly) > LR + 30) soil += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(6 + r() * 22)}" ry="${f(5 + r() * 14)}" transform="rotate(${f(r() * 180)} ${f(x)} ${f(y)})" fill="#a16207" fill-opacity="${f(.12 + r() * .2)}"/>`; }
  const root = (x, sway) => { let d = `M${x} 0`, cx = x; for (let y = 0; y < 1200; y += 120) { const nx = cx + (r() - .5) * sway; d += `Q${f(cx + (r() - .5) * sway)} ${y + 60} ${f(nx)} ${y + 120}`; cx = nx; } return `<path d="${d}" stroke="#d9f99d" stroke-opacity=".22" stroke-width="${f(5 + r() * 8)}" fill="none" stroke-linecap="round"/>`; };
  const roots = [80, 210, 1180, 1520].map(x => root(x, 120)).join('');
  // A radial-ish phylogenetic tree on the right.
  let tree = '';
  const tx = 1280, leaves = 14;
  for (let i = 0; i < leaves; i++) {
    const y = 220 + i * 54, depth = 1240 + (i % 2 ? 60 : 0) + (i % 4 > 1 ? 50 : 0);
    tree += `<path d="M${depth} ${y}H1520" stroke="#86efac" stroke-opacity=".55" stroke-width="3"/><circle cx="1530" cy="${y}" r="9" fill="${palette[i % palette.length]}"/>`;
  }
  for (let i = 0; i < leaves; i += 2) tree += `<path d="M${1240 + (i % 4 > 1 ? 50 : 0)} ${220 + i * 54}V${274 + i * 54}" stroke="#86efac" stroke-opacity=".55" stroke-width="3"/>`;
  for (let i = 0; i < leaves; i += 4) tree += `<path d="M1190 ${247 + i * 54}V${355 + i * 54}M1190 ${247 + i * 54}H1240M1190 ${355 + i * 54}H1290" stroke="#86efac" stroke-opacity=".55" stroke-width="3"/>`;
  tree += `<path d="M1140 301V${301 + 216 * 2}M1140 301H1190M1140 517H1190M1140 733H1190" stroke="#86efac" stroke-opacity=".55" stroke-width="3"/><path d="M${tx - 190} 517H1140" stroke="#86efac" stroke-opacity=".55" stroke-width="3"/>`;
  const lens = `<circle cx="${lx}" cy="${ly}" r="${LR + 40}" fill="#22c55e" opacity=".18" filter="url(#blur)"/><circle cx="${lx}" cy="${ly}" r="${LR}" fill="#052e1a" fill-opacity=".75"/><clipPath id="lens"><circle cx="${lx}" cy="${ly}" r="${LR}"/></clipPath><g clip-path="url(#lens)">${microbes}</g><circle cx="${lx}" cy="${ly}" r="${LR}" fill="none" stroke="#bbf7d0" stroke-opacity=".7" stroke-width="6"/><circle cx="${lx}" cy="${ly}" r="${LR + 16}" fill="none" stroke="#bbf7d0" stroke-opacity=".25" stroke-width="3"/><path d="M${lx - 300} ${ly - 330}A${LR - 30} ${LR - 30} 0 0 1 ${lx + 120} ${ly - 430}" stroke="#fff" stroke-opacity=".18" stroke-width="16" fill="none" stroke-linecap="round"/>`;
  return frame(soil + roots + tree + lens, { bg: ['#0a1f17', '#13291f'], glows: [[640, 620, 640, '#16a34a'], [1350, 600, 420, '#0d9488']] });
}

/* ---------- Precision agriculture: a drone scanning crop rows and flagging weeds ---------- */
function precisionAg() {
  const r = rng(71);
  const horizon = 470, vx = 800;
  const sky = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f2439"/><stop offset=".55" stop-color="#3b3f6b"/><stop offset=".85" stop-color="#d97757"/><stop offset="1" stop-color="#fbbf6a"/></linearGradient>
<linearGradient id="field" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f3d1f"/><stop offset="1" stop-color="#0f2410"/></linearGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dd3fc" stop-opacity=".55"/><stop offset="1" stop-color="#7dd3fc" stop-opacity=".08"/></linearGradient>
<radialGradient id="sun"><stop offset="0" stop-color="#fff7d6"/><stop offset=".3" stop-color="#fcd34d" stop-opacity=".9"/><stop offset="1" stop-color="#f59e0b" stop-opacity="0"/></radialGradient>`;
  let scene = `<rect width="${W}" height="${horizon + 2}" fill="url(#sky)"/><circle cx="1180" cy="${horizon - 10}" r="230" fill="url(#sun)"/>`
    + `<path d="M0 ${horizon}L180 ${horizon - 50}L420 ${horizon - 20}L640 ${horizon - 70}L900 ${horizon - 30}L1150 ${horizon - 60}L1400 ${horizon - 25}L1600 ${horizon - 55}V${horizon}Z" fill="#1c2a3d"/>`
    + `<rect y="${horizon}" width="${W}" height="${H - horizon}" fill="url(#field)"/>`;
  // Rows converge on a vanishing point; plants shrink with distance.
  const rows = 15, depthOf = t => horizon + (H - horizon) * t * t;
  const plants = [];
  for (let i = 0; i <= rows; i++) {
    const xb = -900 + i * (3400 / rows);
    scene += `<path d="M${f(vx + (xb - vx) * .02)} ${horizon}L${f(xb)} ${H}" stroke="#4d7c0f" stroke-opacity=".55" stroke-width="${f(2 + Math.abs(i - rows / 2) * .2)}"/>`;
    if (i === rows) break;
    for (let k = 3; k < 22; k++) {
      const t = k / 22, y = depthOf(t), xL = vx + (xb - vx) * (y - horizon) / (H - horizon), xR = vx + (xb + 3400 / rows - vx) * (y - horizon) / (H - horizon);
      const x = (xL + xR) / 2 + (r() - .5) * 6, s = .25 + t * 1.5, weed = r() < .06 && t > .45;
      plants.push({ x, y, s, weed });
    }
  }
  for (const p of plants) {
    const c = p.weed ? '#facc15' : '#84cc16';
    scene += p.weed
      ? `<g transform="translate(${f(p.x)} ${f(p.y)}) scale(${f(p.s)})">${[0, 72, 144, 216, 288].map(a => `<ellipse rx="7" ry="16" transform="rotate(${a}) translate(0 -14)" fill="${c}"/>`).join('')}</g>`
      : `<g transform="translate(${f(p.x)} ${f(p.y)}) scale(${f(p.s)})"><path d="M0 0C-24 -6 -30 -26 -26 -36C-12 -32 -2 -18 0 0ZM0 0C24 -6 30 -26 26 -36C12 -32 2 -18 0 0Z" fill="${c}"/><path d="M0 0V-28" stroke="#65a30d" stroke-width="4"/></g>`;
  }
  // Drone and scanning cone with detection boxes.
  const dx = 740, dy = 230, cone = [[440, 1080], [1180, 1080]];
  scene += `<path d="M${dx} ${dy + 30}L${cone[0][0]} ${cone[0][1]}H${cone[1][0]}Z" fill="url(#beam)"/>`;
  for (let i = 1; i < 6; i++) { const y = dy + 30 + (cone[0][1] - dy - 30) * i / 6; const half = (cone[1][0] - cone[0][0]) / 2 * i / 6; scene += `<path d="M${f(dx - half)} ${f(y)}H${f(dx + half)}" stroke="#bae6fd" stroke-opacity=".25" stroke-width="2"/>`; }
  for (const p of plants) {
    const inCone = p.y > 620 && p.y < 1070 && Math.abs(p.x - dx) < (p.y - dy - 30) / (cone[0][1] - dy - 30) * 370 - 30;
    if (!inCone || (!p.weed && r() > .35)) continue;
    const s = 46 * p.s, c = p.weed ? '#fb7185' : '#bef264';
    scene += `<rect x="${f(p.x - s / 2)}" y="${f(p.y - s * .95)}" width="${f(s)}" height="${f(s)}" rx="4" fill="none" stroke="${c}" stroke-width="${p.weed ? 4 : 2.5}"/>${p.weed ? `<circle cx="${f(p.x + s / 2)}" cy="${f(p.y - s * .95)}" r="7" fill="${c}"/>` : ''}`;
  }
  const rotor = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="62" ry="9" fill="#e2e8f0" fill-opacity=".35"/><circle cx="${x}" cy="${y}" r="7" fill="#cbd5e1"/>`;
  scene += `<g><path d="M${dx - 110} ${dy - 22}L${dx - 30} ${dy}M${dx + 110} ${dy - 22}L${dx + 30} ${dy}" stroke="#94a3b8" stroke-width="10" stroke-linecap="round"/>${rotor(dx - 110, dy - 30)}${rotor(dx + 110, dy - 30)}<rect x="${dx - 50}" y="${dy - 16}" width="100" height="40" rx="16" fill="#e2e8f0"/><rect x="${dx - 50}" y="${dy + 8}" width="100" height="16" rx="8" fill="#94a3b8"/><circle cx="${dx}" cy="${dy + 32}" r="14" fill="#0f172a" stroke="#7dd3fc" stroke-width="4"/><circle cx="${dx}" cy="${dy + 32}" r="5" fill="#7dd3fc"/><circle cx="${dx + 34}" cy="${dy - 2}" r="5" fill="#22c55e"/></g>`;
  return frame(scene, { bg: ['#0f2410', '#0f2410'], defs: sky });
}

/* ---------- NGS: a DNA helix above aligned sequencing reads, coverage and a called variant ---------- */
function ngs() {
  const r = rng(97);
  // Double helix across the top.
  let helix = '', rungs = '';
  const hy = 230, amp = 85, period = 330;
  const strand = phase => { let d = ''; for (let x = 0; x <= W; x += 8) { const y = hy + Math.sin(x / period * Math.PI * 2 + phase) * amp; d += (x ? 'L' : 'M') + f(x) + ' ' + f(y); } return d; };
  for (let x = 12; x < W; x += 30) {
    const y1 = hy + Math.sin(x / period * Math.PI * 2) * amp, y2 = hy + Math.sin(x / period * Math.PI * 2 + Math.PI) * amp;
    const pair = 'ACGT'[Math.floor(r() * 4)], mate = { A: 'T', T: 'A', C: 'G', G: 'C' }[pair];
    rungs += `<path d="M${x} ${f(y1)}V${f((y1 + y2) / 2)}" stroke="${BASES[pair]}" stroke-width="7" stroke-linecap="round" opacity=".85"/><path d="M${x} ${f((y1 + y2) / 2)}V${f(y2)}" stroke="${BASES[mate]}" stroke-width="7" stroke-linecap="round" opacity=".85"/>`;
  }
  helix = rungs + `<path d="${strand(0)}" stroke="#7dd3fc" stroke-width="12" fill="none" stroke-linecap="round"/><path d="${strand(Math.PI)}" stroke="#c4b5fd" stroke-width="12" fill="none" stroke-linecap="round"/>`;
  // Read pile-up below; a variant column appears in roughly half the reads.
  const top = 520, rowH = 22, rows = 24, variantX = 980;
  const coverage = new Array(Math.ceil(W / 20)).fill(0);
  let reads = '';
  for (let row = 0; row < rows; row++) {
    let x = -r() * 200;
    while (x < W) {
      const len = 200 + r() * 260, y = top + row * (rowH + 8);
      reads += `<rect x="${f(x)}" y="${y}" width="${f(len)}" height="${rowH}" rx="5" fill="${row % 2 ? '#1e4a74' : '#25588a'}" fill-opacity=".9"/>`;
      for (let m = 0; m < 2; m++) if (r() < .35) { const mx = x + r() * len; reads += `<rect x="${f(mx)}" y="${y}" width="9" height="${rowH}" fill="${Object.values(BASES)[Math.floor(r() * 4)]}"/>`; }
      if (x < variantX && x + len > variantX + 10 && r() < .55) reads += `<rect x="${variantX}" y="${y}" width="11" height="${rowH}" fill="${BASES.T}"/>`;
      for (let c = Math.max(0, Math.floor(x / 20)); c < Math.min(coverage.length, Math.floor((x + len) / 20)); c++) coverage[c]++;
      x += len + 14 + r() * 40;
    }
  }
  const max = Math.max(...coverage), cy = 500;
  const area = 'M0 ' + cy + coverage.map((c, i) => `L${i * 20} ${f(cy - c / max * 120)}`).join('') + `L${W} ${cy}Z`;
  const covg = `<path d="${area}" fill="#38bdf8" fill-opacity=".22"/><path d="${area.replace(/Z$/, '')}" stroke="#7dd3fc" stroke-width="2.5" fill="none"/>`;
  const marker = `<rect x="${variantX - 14}" y="${top - 16}" width="39" height="${rows * (rowH + 8) + 24}" rx="10" fill="none" stroke="#fda4af" stroke-width="3" stroke-dasharray="8 6"/><path d="M${variantX + 5} ${cy - 150}V${top - 18}" stroke="#fda4af" stroke-width="3"/><circle cx="${variantX + 5}" cy="${cy - 160}" r="14" fill="#f43f5e"/>`;
  return frame(helix + covg + reads + marker, { glows: [[800, 230, 700, '#2563eb'], [1000, 900, 520, '#0891b2']] });
}

export const ART = {
  'research:ai': { slug: 'ai', draw: ai, alt: 'Illustration: a DNA sequence feeding a neural network whose highlighted paths lead to a confident prediction' },
  'research:hpi': { slug: 'hpi', draw: hpi, alt: 'Illustration: spiked virus particles docking on receptors of a host cell membrane, linked by a protein interaction network' },
  'research:pfp': { slug: 'pfp', draw: pfp, alt: 'Illustration: a folded protein chain of helices and strands with annotated functional domains' },
  'research:metagenomics': { slug: 'metagenomics', draw: metagenomics, alt: 'Illustration: a diverse microbial community seen through a lens among soil and plant roots, beside a tree of life' },
  'research:pa': { slug: 'pa', draw: precisionAg, alt: 'Illustration: a drone scanning crop rows at sunrise and flagging weeds among the crop plants' },
  'research:ngs': { slug: 'ngs', draw: ngs, alt: 'Illustration: a DNA double helix above aligned sequencing reads, a coverage curve and a highlighted variant' },
};
export const artPath = (slug, width) => `/assets/media/research-${slug}-${width}.webp`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = new URL('../public/media/', import.meta.url);
  for (const { slug, draw } of Object.values(ART)) {
    const svg = Buffer.from(draw());
    for (const width of SIZES) {
      const file = fileURLToPath(new URL(`research-${slug}-${width}.webp`, out));
      const info = await sharp(svg).resize(width).webp({ quality: 84, effort: 6 }).toFile(file);
      console.log(file.split('/').pop(), `${info.width}x${info.height}`, `${Math.round(info.size / 1024)} KB`);
    }
  }
}
