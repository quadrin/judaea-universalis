import { flattenCourtStandards } from './flat_court_palette.js';
// Flat vector court standards. Ancient banners are original game designs,
// inspired by coins, seals and regional motifs, not reconstructed flags.
// No raster images, gradients, filters, cloth, lighting or remote resources.
import { DEFINES } from '../data/defines.js';
import { REVIVALS } from '../data/revivals.js';
import { enrichCourtStandards } from './court_standards.js';
import { enrichJudaeanStandards } from './judaean_standards.js';
import { SAMARITAN_CALLIGRAPHY } from './samaritan_standard.js';
import { reviseCourtStandards } from './court_revisions.js';

export const REVIVAL_FLAGS = Object.fromEntries(REVIVALS.map(r => [r.tag, r]));
export const LEGACY_BORROWED_FLAGS = { HPA: 'HER', HPH: 'HER', BAL: 'SEL', DMT: 'SEL', LKH: 'GHA' };
const G = '#f2c75b', P = '#f4e6be', S = '#d5e2e7';
const path = (d, fill = G, stroke = 'none', width = 1.2) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;
const line = (d, color = G, width = 2) => path(d, 'none', color, width);
const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
const circle = (x, y, r, fill = G) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
function star(x, y, n = 8, r = 10, inner = 4, fill = G) {
  const points = Array.from({ length: n * 2 }, (_, i) => {
    const a = -Math.PI / 2 + Math.PI * i / n, d = i % 2 ? inner : r;
    return `${(x + Math.cos(a) * d).toFixed(2)},${(y + Math.sin(a) * d).toFixed(2)}`;
  });
  return `<polygon points="${points.join(' ')}" fill="${fill}"/>`;
}
const anchor = (color = G) => ring(48, 29, 5, color, 3)
  + line('M48 35V73M33 44H63', color, 5)
  + path('M48 76C33 75 26 66 25 57L35 62 31 65Q37 71 48 72Q59 71 65 65L61 62 71 57C70 66 63 75 48 76Z', color);
const diadem = (y = 23, color = G) => path(`M30 ${y}Q48 ${y - 8} 66 ${y}L64 ${y + 5}Q48 ${y - 1} 32 ${y + 5}Z`, color)
  + line(`M31 ${y + 3}L25 ${y + 16}M65 ${y + 3}L71 ${y + 16}`, color, 3);
const flame = (x = 48, y = 25) => path(`M${x} ${y - 12}q-3 8-7 12q-3 9 7 13q10-4 7-13q-1 7-5 6q3-10-2-18Z`, G, 'none');
function temple(color = P) {
  return path('M25 41 48 25 71 41Z', color) + rect(25, 42, 46, 5, color)
    + [29, 40, 51, 62].map(x => rect(x, 48, 5, 23, color) + rect(x - 1, 48, 7, 3, color)).join('')
    + rect(24, 72, 48, 4, color) + rect(21, 77, 54, 4, color);
}
// Tapered horns with an angled lip and a small spray at the opening.
// Open space between the horns and fruit keeps the coin motif readable.
const leftCornucopia = path('M43 78C25 71 17 56 23 39L26 32 34 35 31 43C25 58 31 70 43 78Z')
  + path('M23 29 36 34 34 39 21 34Z')
  + path('M26 29C22 26 23 21 26 18C30 21 31 26 29 30ZM31 31C30 26 34 22 38 23C38 28 35 31 32 32Z');
const cornucopias = leftCornucopia + `<g transform="translate(96 0) scale(-1 1)">${leftCornucopia}</g>`;
const pomegranate = path('M43 37 42 30 46 32 48 27 50 32 54 30 53 37C60 44 56 55 48 58C40 55 36 44 43 37Z');
function menorah() {
  // The Titus silhouette: wide curved arms, seven separate oil cups,
  // collars at the branch joins and a compact, polygonal stepped plinth.
  return [30, 20, 10].map(r => line(`M${48 - r} 28V33A${r} ${r} 0 0 0 ${48 + r} 33V28`, G, 3.4)).join('')
    + line('M48 27V71', G, 4.2)
    + [43, 53, 63].map(y => rect(44.5, y - 1, 7, 2, G)).join('')
    + [-30, -20, -10, 0, 10, 20, 30].map(dx => path(`M${48 + dx - 3.6} 23H${48 + dx + 3.6}L${48 + dx + 2.4} 28H${48 + dx - 2.4}Z`)).join('')
    + path('M39 70H57L63 73.5 57 77H39L33 73.5Z')
    + path('M34 78H62L69 81.5 62 85H34L27 81.5Z');
}
const chiRho = path('M41 17H54V20H50V76H54V79H40V76H44V20H41Z')
  + path('M48 17H54C75 17 75 44 54 44H48V39H54C68 39 68 22 54 22H48Z')
  + path('M26 27 70 73 66 77 22 31ZM22 73 66 27 70 31 26 77Z');
const phoenicianAleph = `<path d="M68 25 24 48 68 71M48 24V72" fill="none" stroke="${G}" stroke-width="6.2" stroke-linejoin="miter"/>`;

const lion = path('M63 34 69 26 67 20 56 21 50 29 51 39 41 45 28 39 22 42 33 51 47 54 44 63 35 63 28 73 20 77 21 81 34 79 44 70 55 70 61 76 59 82 70 82 72 77 66 65 69 55 64 45 69 40Z')
  + line('M68 56C87 65 83 39 78 34Q72 26 80 22', G, 4)
  + path('M78 21 81 15 85 21 82 25Z', G, 'none') + path('M53 27 46 30 50 34 55 32Z', G, 'none');
function eagle(color = G) {
  return path('M43 48C47 35 58 24 72 19C76 33 73 50 64 60L52 68 42 62Z', color)
    + line('M68 27C64 40 57 48 47 56M70 35C66 46 59 53 51 59M70 43C67 51 61 58 56 61', '#00649d', 2.5)
    + path('M45 69C34 66 28 58 30 49C31 43 36 41 37 36C34 34 34 30 37 27C41 24 47 26 49 30L48 34C44 35 43 39 44 44C48 49 52 57 51 65L57 73 48 72 43 77Z', color)
    + path('M37 29 29 31 27 35 34 34 38 35Z', color)
    + line('M38 67 36 77 31 78M48 69 51 77 57 78', color, 3)
    + path('M23 81H43L38 86 61 79H73L62 84H46L51 79H31Z', color, 'none');
}
const fireAltar = rect(36, 49, 24, 5, G) + rect(43, 54, 10, 18, G) + rect(34, 73, 28, 4, G) + rect(29, 78, 38, 5, G) + flame(48, 32);
const ring = (x, y, r, ink = G, width = 3) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${ink}" stroke-width="${width}"/>`;
const magenDavid = line('M48 18 74 63H22ZM48 78 22 33H74Z', G, 4.5);
// Restore ancient Israel's earlier four-horned altar silhouette. Keep the
// flat gold treatment; the Star of David belongs to the later Kingdom.
const hornedAltar = `<g transform="translate(12 10) scale(3)">`
  + path('M2.4 20.6H21.6V23H2.4ZM4 18.2H20V20.6H4ZM6 9.8H18L18.6 18.2H5.4ZM4 7.4H20V9.8H4Z')
  + path('M2.9 7.4C2.7 5 3.4 3.4 4.9 2.5C5.9 3.6 6.4 5.2 6.4 7.4ZM21.1 7.4C21.3 5 20.6 3.4 19.1 2.5C18.1 3.6 17.6 5.2 17.6 7.4Z')
  + path('M7.4 7.4C7.2 5.6 7.7 4.4 8.9 3.7C9.7 4.6 10.1 5.9 10.1 7.4ZM16.6 7.4C16.8 5.6 16.3 4.4 15.1 3.7C14.3 4.6 13.9 5.9 13.9 7.4Z') + '</g>';

const GALILEE_BLUE = '#98ceec', ZODIAC_BEIGE = '#f4e1b8';
function zodiacWheel() {
  // Twelve calm, even divisions around a sun medallion. The thin circular
  // groove leaves one continuous outer rim, like the synagogue roundels.
  return circle(48, 48, 32, ZODIAC_BEIGE)
    + ring(48, 48, 29.2, GALILEE_BLUE, 1.3)
    + Array.from({ length: 12 }, (_, i) => `<g transform="rotate(${i * 30} 48 48)">${line('M48 18.8V33.5', GALILEE_BLUE, 1.8)}</g>`).join('')
    + circle(48, 48, 13, GALILEE_BLUE) + star(48, 48, 12, 9, 6, ZODIAC_BEIGE);
}

function wingedFigure(field, archer = false) {
  const wing = path('M39 43H9C12 54 22 62 40 63L43 54Z')
    + [0, 1, 2, 3, 4].map(i => line(`M${13 + i * 5} 46L${20 + i * 4} 58`, field, 1.5)).join('');
  const figure = path('M45 34 43 27 46 23H52L55 27 52 33 54 39 58 43V46H43V39L36 36 34 30 39 32Z')
    + path('M44 22V18L47 20 49 17 51 20 54 18V22Z')
    + (archer ? line('M36 29Q22 39 36 48M36 29V48M27 38H43', G, 2) : ring(34, 36, 5, G, 2.5));
  return wing + `<g transform="translate(96 0) scale(-1 1)">${wing}</g>`
    + path('M42 61 35 77H61L54 61Z') + line('M43 64 40 75M48 64V75M53 64 56 75', field, 1.8)
    + circle(48, 52, 12, field) + ring(48, 52, 10, G, 4)
    + line('M38 59Q27 69 24 60M58 59Q69 69 72 60', G, 2.5) + figure;
}
function standard(color, motif, { emblem = 'insignia', note = '', scale = 1.18, dx = 0, dy = 0 } = {}) {
  return { viewBox: '0 0 96 96', flatBanner: true, fieldColor: color, emblem, note,
    body: rect(0, 0, 96, 96, color) + `<g data-emblem="${emblem}" transform="translate(48 48) scale(${scale}) translate(${-48 + dx} ${-48 + dy})">${motif}</g>` };
}

export const FLAT_FLAGS = {
  // A single connected insignia on a solid field. Related courts may share
  // a device, with their field and ink colours distinguishing the identity.
  HPA: standard('#a51d54', line('M48 77V24', G, 3.5) + path('M48 22Q36 39 44 57L48 65ZM48 39Q64 38 57 55L48 65Z'), { emblem: 'reed', scale: 1.25, dy: -1, note: 'Antipas: a single reed on burgundy.' }),
  HPH: standard('#007b85', temple(S), { emblem: 'temple', scale: 1.25, dy: -5, note: 'Philip: a temple façade on teal.' }),
  HER: standard('#b7481e', diadem(47), { emblem: 'diadem', scale: 1.5, dy: -3 }),
  BAL: standard('#9b2180', anchor(G), { emblem: 'anchor' }),
  DMT: standard('#3431a5', anchor(S), { emblem: 'anchor' }),
  LKH: standard('#bd3c24', path('M54 24A25 25 0 1 0 68 67A28 28 0 0 1 54 24Z') + star(53, 46, 8, 11, 4), { emblem: 'crescent-star' }),
  HAS: standard('#1644a3', cornucopias + pomegranate, { emblem: 'cornucopias', scale: 1.18, note: 'Tapered double cornucopias and a crowned pomegranate, entirely in gold.' }),
  JUD: standard('#173f94', menorah(), { emblem: 'menorah', scale: 1.18, dy: -6, note: 'Broad curved branches and a polygonal stepped base, following the Arch of Titus silhouette.' }),
  ISR: standard('#ffffff', rect(0, 14, 96, 10, '#0038b8') + rect(0, 72, 96, 10, '#0038b8')
    + line('M48 30 64 57H32ZM48 66 32 39H64Z', '#0038b8', 2.6), { emblem: 'israeli-flag', scale: 1, note: 'Modern Israel: blue stripes and blue Magen David on white.' }),
  MLI: standard('#1640a5', magenDavid, { emblem: 'magen-david', note: 'Kingdom of Israel: gold Magen David on blue.' }),
  ISL: standard('#225393', hornedAltar, { emblem: 'horned-altar', note: 'Ancient Israel: the restored four-horned altar emblem in gold on blue.' }),
  AIS: standard('#173a73', magenDavid, { emblem: 'magen-david' }),
  JDH: standard('#183da0', lion, { emblem: 'lion', dx: -4.5 }),
  GAL: standard(GALILEE_BLUE, zodiacWheel(), { emblem: 'zodiac-wheel', note: 'Beige zodiac roundel on baby blue, with twelve divisions and a central sun.' }),
  GLT: standard('#238244', line('M37 72A27 27 0 1 1 59 72', G, 7) + circle(36, 72, 5) + circle(60, 72, 5), { emblem: 'torc' }),
  SEL: standard('#e4b33c', anchor('#6c217b'), { emblem: 'anchor' }),
  PTO: standard('#00649d', eagle(), { emblem: 'eagle-thunderbolt', scale: 1.1, dy: -5 }),
  BYZ: standard('#61227a', chiRho, { emblem: 'chi-rho', dx: 2, note: 'A custom Chi-Rho with a shaped loop and restrained terminals on imperial purple.' }),
  ROM: standard('#8e2430', path('M10.56 55.13H11.81L12.46 58.2Q13.06 58.9 14.27 59.37Q15.48 59.84 16.78 59.84Q20.88 59.84 20.88 56.47Q20.88 55.42 20.1 54.69Q19.32 53.96 17.65 53.39Q15.2 52.57 14.12 52.07Q13.04 51.56 12.3 50.88Q11.56 50.19 11.11 49.21Q10.67 48.23 10.67 46.81Q10.67 44.28 12.39 42.96Q14.11 41.64 17.43 41.64Q19.82 41.64 22.74 42.25V46.81H21.47L20.82 44.18Q19.37 43.12 17.43 43.12Q15.67 43.12 14.73 43.77Q13.78 44.42 13.78 45.76Q13.78 46.72 14.57 47.4Q15.35 48.08 17.03 48.6Q20.3 49.68 21.52 50.47Q22.74 51.26 23.38 52.43Q24.02 53.6 24.02 55.19Q24.02 61.29 16.84 61.29Q15.2 61.29 13.49 61.01Q11.78 60.73 10.56 60.27ZM37.7 47.52Q37.7 45.23 36.85 44.33Q36 43.42 33.86 43.42H32.73V51.92H33.92Q35.9 51.92 36.8 50.92Q37.7 49.92 37.7 47.52ZM32.73 53.49V59.57L35.92 59.96V61H25.95V59.96L28.22 59.57V43.26L25.77 42.89V41.85H34.21Q38.27 41.85 40.29 43.21Q42.3 44.58 42.3 47.49Q42.3 53.49 35.3 53.49ZM44.56 51.4Q44.56 41.64 54.51 41.64Q59.42 41.64 61.94 44.11Q64.45 46.59 64.45 51.4Q64.45 58.5 59.11 60.54L59.82 61.41Q61.92 64.04 63.42 64.04Q64.17 64.04 64.59 63.93V65.16Q64.29 65.3 63.2 65.52Q62.11 65.74 61.22 65.74Q60.18 65.74 59.37 65.55Q58.57 65.36 57.87 64.95Q57.18 64.54 56.52 63.88Q55.85 63.21 54.34 61.29Q49.59 61.26 47.07 58.74Q44.56 56.22 44.56 51.4ZM49.3 51.4Q49.3 55.96 50.55 57.91Q51.8 59.86 54.51 59.86Q57.21 59.86 58.46 57.9Q59.71 55.94 59.71 51.4Q59.71 46.88 58.46 44.98Q57.21 43.08 54.51 43.08Q51.8 43.08 50.55 44.98Q49.3 46.88 49.3 51.4ZM73.35 52.89V59.57L75.8 59.96V61H66.56V59.96L68.84 59.57V43.26L66.38 42.89V41.85H75.53Q79.76 41.85 81.84 43.15Q83.93 44.45 83.93 47.21Q83.93 51.32 80.07 52.49L85.19 59.57L87.26 59.96V61H81.06L75.72 52.89ZM79.47 47.23Q79.47 45.09 78.59 44.26Q77.7 43.42 75.35 43.42H73.35V51.32H75.42Q77.62 51.32 78.55 50.4Q79.47 49.49 79.47 47.23Z'), { emblem: 'spqr', scale: 1, dx: -.9, dy: -5.7, note: 'SPQR in outlined Roman serif lettering.' }),
  ASR: standard('#a81e38', wingedFigure('#a81e38', true), { emblem: 'winged-ashur', scale: 1, note: 'A winged figure and disc, following the supplied visual reference.' }),
  ASY: standard('#bd382f', wingedFigure('#bd382f', true), { emblem: 'winged-ashur', scale: 1 }),
  PAS: standard('#812c9e', wingedFigure('#812c9e'), { emblem: 'winged-figure', scale: 1, note: 'A Faravahar-inspired insignia for the game.' }),
  BBL: standard('#283cba', star(48, 48, 8, 29, 10), { emblem: 'eight-pointed-star' }),
  BAB: standard('#095caf', star(48, 48, 8, 29, 10), { emblem: 'eight-pointed-star' }),
  SAS: standard('#ad1639', fireAltar, { emblem: 'fire-altar' }),

  // Revival courts keep one regional device rather than an ornamental frame.
  PHO: standard('#800080', phoenicianAleph, { emblem: 'phoenician-aleph', scale: 1.5, dx: 2, note: 'Gold Phoenician letter on purple, with consistent strokes and crisp angular joins.' }),
  PHL: standard('#b44b24', [30, 39, 48, 57, 66].map((x, i) => path(`M${x - 3} 49L${x - 5} ${31 + Math.abs(i - 2) * 4}L${x} ${23 + Math.abs(i - 2) * 3}L${x + 4} 33L${x + 2} 49Z`, P)).join('')
    + path('M29 50H67V62L57 76H39L29 62Z'), { emblem: 'feathered-helmet' }),
  IDU: standard('#bd3c26', path('M22 77 35 31 47 23 53 49 64 35 76 77Z', P) + path('M40 77 48 43 53 77Z', '#bd3c26'), { emblem: 'rock' }),
  MOA: standard('#9c245a', path('M30 78V38A18 18 0 0 1 66 38V78Z', P) + [42, 50, 58, 66].map(y => line(`M37 ${y}H59`, '#9c245a', 2)).join(''), { emblem: 'stele' }),
  AMM: standard('#6531a6', path('M27 76V42H35V29H43V42H53V29H61V42H69V76Z', P)
    + path('M43 76V61A5 5 0 0 1 53 61V76Z', '#6531a6'), { emblem: 'citadel', dy: -4.5 }),
  ARD: standard('#096c9d', path('M44 23H59L50 41H63L35 76 42 51H31Z'), { emblem: 'lightning' }),
  PLM: standard('#c3451e', star(48, 48, 12, 29, 20) + circle(48, 48, 13, '#c3451e'), { emblem: 'sun' }),
  EME: standard('#b8274e', path('M31 73 35 43 45 24 56 31 65 73Z', P) + circle(49, 48, 5, '#b8274e'), { emblem: 'sacred-stone' }),
  DEC: standard('#087b53', temple(P), { emblem: 'temple', dy: -5 }),
  ELM: standard('#a74121', line('M37 77C65 77 64 59 45 59S27 42 49 42S65 27 52 23', P, 7)
    + path('M49 21 60 22 59 29 51 29Z', P), { emblem: 'serpent' }),
  MED: standard('#7134b8', path('M43 72 43 35 38 27 42 21 48 25 54 21 58 27 53 35 53 72 48 81Z', P)
    + line('M34 38H62', P, 4), { emblem: 'akinakes' }),
  PRS: standard('#bd204c', fireAltar, { emblem: 'fire-altar' }),
  CIL: standard('#007f73', path('M29 75V40L48 23 67 40V75Z', P) + path('M42 75V49H54V75Z', '#007f73'), { emblem: 'gate' }),
  CAP: standard('#ae4524', path('M27 74 38 55 39 40 47 24 56 40 57 55 70 74Z', P)
    + rect(43, 46, 9, 28, '#ae4524'), { emblem: 'rock-sanctuary' }),
  ION: standard('#007ca6', rect(36, 44, 24, 33, P) + rect(30, 77, 36, 4, P)
    + line('M43 48V72M53 48V72', '#007ca6', 2)
    + line('M31 38C19 38 22 23 32 25C41 28 34 40 32 34M65 38C77 38 74 23 64 25C55 28 62 40 64 34M31 27H65M28 42H68', P, 4), { emblem: 'ionic-column', dy: -4.5 }),
  HEL: standard('#264cb6', rect(43, 45, 10, 32, P) + path('M37 42H59L55 51H41Z', P) + flame(48, 29), { emblem: 'torch' }),
  CYP: standard('#c05221', path('M29 27Q48 35 67 27Q61 48 67 69Q48 61 29 69Q35 48 29 27Z', P), { emblem: 'copper-ingot', scale: 1.6 }),
  KMT: standard('#00688c', line('M48 78V42M30 49H66', G, 7) + ring(48, 31, 12, G, 6), { emblem: 'ankh' }),
  // Modern territorial flags retain their established multicolour layouts.
  HEJ: standard('#292c31', rect(0, 32, 96, 32, '#27804d') + rect(0, 64, 96, 32, '#f3eee1') + path('M0 0 48 48 0 96Z', '#a92e35'), { scale: 1, emblem: 'sharifian-colours' }),
  KUR: standard('#c1323c', rect(0, 32, 96, 32, '#f4f1e5') + rect(0, 64, 96, 32, '#287b43') + star(48, 48, 21, 15, 10, '#edbf31'), { scale: 1, emblem: 'kurdish-colours' }),
  ALW: standard('#f3eee0', path('M0 0 25 0 25 25H0ZM71 0H96V25H71ZM0 71H25V96H0ZM71 71H96V96H71Z', '#a3303b') + star(48, 48, 12, 21, 16, '#d7ac3e'), { scale: 1, emblem: 'coastal-state', note: 'An original game banner for the coastal state.' }),
  DRZ: standard('#f1eee0', rect(0, 0, 30, 96, '#28784a') + rect(30, 0, 66, 24, '#ad343d') + rect(30, 24, 66, 24, '#e0b843') + rect(30, 48, 66, 24, '#285c96') + rect(30, 72, 66, 24, '#f1eee0'), { scale: 1, emblem: 'druze-colours' }),
};

// Explicit assignments keep small court devices intentional. These are game
// insignia, not a catalogue of attested ancient flags. No faces or pictorial
// scenes: broad silhouettes, open negative space and one ink per device.
const DEVICES = {
  bow: c => line('M32 21Q67 48 32 75', c, 6) + line('M32 21 46 48 32 75M24 48H72', c, 3) + path('M65 40 76 48 65 56Z', c),
  horns: c => path('M21 22C19 46 27 65 48 70C69 65 77 46 75 22C70 40 64 50 54 53V43H42V53C32 50 26 40 21 22Z', c) + circle(48, 28, 7, c),
  crescent: c => path('M57 20A29 29 0 1 0 72 68A32 32 0 0 1 57 20Z', c),
  'crescent-star': c => path('M51 21A28 28 0 1 0 71 69A31 31 0 0 1 51 21Z', c) + star(58, 40, 6, 12, 5, c),
  spear: c => path('M48 18 57 37 51 43V78H45V43L39 37Z', c),
  spears: c => `<g transform="rotate(-28 48 48)">${path('M48 18 55 33 51 39V78H45V39L41 33Z', c)}</g><g transform="rotate(28 48 48)">${path('M48 18 55 33 51 39V78H45V39L41 33Z', c)}</g>`,
  lightning: c => path('M47 18H66L53 41H69L29 80 41 52H26Z', c),
  axe: c => line('M48 23V78', c, 6) + path('M44 27Q28 26 23 38Q31 52 44 47ZM52 27Q68 26 73 38Q65 52 52 47Z', c),
  branch: c => line('M48 76V23', c, 4) + [0, 1, 2].map(i => path(`M46 ${42 + i * 12}Q24 ${40 + i * 12} 25 ${24 + i * 12}Q43 ${25 + i * 12} 46 ${42 + i * 12}ZM50 ${42 + i * 12}Q72 ${40 + i * 12} 71 ${24 + i * 12}Q53 ${25 + i * 12} 50 ${42 + i * 12}Z`, c)).join(''),
  palm: c => line('M48 77V39', c, 5) + path('M48 40Q23 40 20 58Q35 46 48 47Q61 46 76 58Q73 40 48 40ZM48 37Q28 22 22 39Q35 30 48 43Q61 30 74 39Q68 22 48 37ZM48 39Q38 25 48 18Q58 25 48 39Z', c),
  sun: c => star(48, 48, 16, 31, 18, c) + circle(48, 48, 12, c),
  rosette: c => star(48, 48, 8, 29, 14, c),
  wheel: c => ring(48, 48, 27, c, 5) + line('M48 21V75M21 48H75M29 29 67 67M29 67 67 29', c, 4),
  torc: c => line('M36 72A27 27 0 1 1 60 72', c, 7) + circle(35, 72, 5, c) + circle(61, 72, 5, c),
  trident: c => line('M48 20V77M28 28V43Q28 52 48 52Q68 52 68 43V28', c, 5) + path('M48 17 41 29H55ZM28 22 21 34H35ZM68 22 61 34H75Z', c),
  tamga: c => line('M48 22V76M27 27V48H69V27M36 76H60', c, 6),
  'iyi-tamga': c => line('M26 23V75M70 23V75M38 25 48 44 58 25M48 44V73', c, 6),
  wing: c => path('M23 70V25L75 39 66 47 37 35V42L61 51 53 59 37 51V58L47 63 39 72Z', c),
  sail: c => path('M46 20V65H23ZM52 25 75 65H52Z', c) + path('M19 70H77L67 79H31Z', c),
  prow: c => path('M21 57H64V42L78 32V63L65 77H31Z', c) + line('M26 46H58M31 35H56', c, 4),
  tower: c => path('M30 77V24H39V32H44V24H53V32H58V24H67V77H54V57H43V77Z', c),
  gate: c => path('M24 76V31H34V40H42V25H54V40H62V31H72V76H57V57A9 9 0 0 0 39 57V76Z', c),
  mountain: c => path('M19 74 48 22 77 74ZM40 52H56L48 37Z', c),
  pyramid: c => path('M21 76 46 20 53 76ZM52 30 76 76H59Z', c),
  stele: c => path('M34 78V36A14 14 0 0 1 62 36V78Z M41 42H55V47H41ZM41 54H55V59H41ZM41 66H55V71H41Z', c).replace('stroke-width=', 'fill-rule="evenodd" stroke-width='),
  serpent: c => line('M31 73H53C78 73 71 51 49 51S22 28 44 28H63', c, 7) + path('M59 20 74 28 59 36Z', c),
  dagger: c => path('M43 23H53V38H63V44H53V67L48 80 43 67V44H33V38H43Z', c),
  sabre: c => path('M34 21H42V37H49V43H42Q38 64 65 76Q28 76 33 43H26V37H34Z', c),
  cross: c => path('M42 20H54V42H76V54H54V76H42V54H20V42H42Z', c),
  lambda: c => path('M44 20H52L77 77H65L48 36 31 77H19Z', c),
  koppa: c => ring(48, 38, 20, c, 7) + line('M48 57V80', c, 7),
  cup: c => path('M26 25H70C70 43 63 54 52 57V69H65V76H31V69H44V57C33 54 26 43 26 25Z', c),
  cap: c => path('M25 70Q33 54 35 41Q35 24 53 20Q43 32 55 39Q68 51 70 70ZM23 73H73V79H23Z', c),
  crown: c => path('M22 29 36 42 48 22 60 42 74 29 66 70H30ZM31 74H65V79H31Z', c),
  diadem: c => diadem(47, c),
  temple: c => temple(c),
  anchor: c => anchor(c),
  torch: c => path('M39 49H57L52 79H44ZM35 41H61L57 50H39ZM48 16C54 29 63 30 56 39H40C32 30 44 27 48 16Z', c),
  seal: c => path('M26 26H70V61H26ZM35 62 32 80 44 75 48 62 52 75 64 80 61 62Z', c),
  book: c => path('M21 27Q36 21 45 30V76Q35 67 21 73ZM51 30Q60 21 75 27V73Q61 67 51 76Z', c),
  'v-rod': c => line('M21 27 48 67 75 27', c, 6) + path('M25 44Q48 68 71 44Q65 79 48 79Q31 79 25 44Z', c),
  knot: c => line('M32 27H63V62H32V27M48 17V77M20 44H76', c, 6),
  tree: c => path('M44 78V65H22L35 49H26L40 32H33L48 16 63 32H56L70 49H61L74 65H52V78Z', c),
  ingot: c => path('M23 23Q48 35 73 23Q61 48 73 73Q48 61 23 73Q35 48 23 23Z', c),
  helmet: c => path('M28 65V44A22 22 0 0 1 72 44V54H61V42H53V77H43V54H35V65ZM22 76V36Q24 18 49 17V24Q29 25 29 39V76Z', c),
  altar: c => path('M24 40H72V48H56V68H68V76H28V68H40V48H24ZM48 17 59 30 53 37H41L37 30Z', c),
  'tanit': c => ring(48, 27, 8, c, 5) + line('M24 42H72', c, 5) + path('M48 44 71 77H25ZM48 56 38 71H58Z', c).replace('stroke-width=', 'fill-rule="evenodd" stroke-width='),
  labyrinth: c => line('M24 74V22H74V74H38V36H60V60H48V48', c, 5),
  triskele: c => [0,120,240].map(a => `<g transform="rotate(${a} 48 48)">${line('M48 48C37 38 40 22 53 22C67 22 70 37 61 43', c, 5)}</g>`).join(''),
  rose: c => [0,72,144,216,288].map(a => `<g transform="rotate(${a} 48 48)">${path('M43 45Q28 27 42 20Q57 15 57 32L53 45Z', c)}</g>`).join('') + circle(48,48,8,c),
};
const COURT_DEVICES = {
  DMS:'lightning', TYR:'triskele', PLS:'helmet', MOB:'stele', AMO:'gate', EDM:'mountain', HMT:'wing', QDR:'bow', URA:'tree', PHR:'cap', LYD:'axe', ELA:'serpent', MDA:'dagger', TAB:'branch', CRC:'rose',
  PAR:'bow', AGR:'diadem', HYR:'palm', ARI:'dagger', OSR:'crescent-star', ADI:'crown', CMG:'mountain', CYZ:'anchor', ITU:'bow', ATG:'temple', PNT:'crescent-star', GHA:'cross', RSH:'spear', GRC:'branch',
  ETR:'lightning', TRT:'prow', SRD:'tower', MAC:'sun', SPT:'lambda', COR:'koppa', CRT:'labyrinth', SYC:'wheel', TAR:'trident', CYR:'branch', MIL:'rosette', PRG:'cup', BIT:'prow',
  EPJ:'seal', KGJ:'diadem', LUK:'axe',
  CAR:'tanit', MAU:'crescent', GRM:'wheel', LUS:'dagger', SEQ:'trident', AQT:'branch', NOR:'dagger', BOI:'horns', BRT:'triskele', CAL:'v-rod', HIB:'triskele',
  SUE:'knot', CHE:'lightning', CHA:'sabre', FRS:'tower', CIM:'horns', AES:'rosette', DLM:'gate', SCO:'sabre', DRD:'tower', THR:'crescent', DAC:'tamga', BOS:'trident', SCY:'bow', SRM:'tamga', VEN:'tree',
  OST:'wing', VAN:'sail', VIS:'crown', FRK:'axe', BGD:'book', GEP:'wing', LMB:'diadem', SAX:'dagger', AVA:'trident', SLV:'axe', TRK:'tamga', BGR:'iyi-tamga',
  KSH:'pyramid', NOB:'bow', BLM:'spears', AXM:'stele', SAB:'horns', HMY:'wing', HDR:'altar', SAK:'cap', GBA:'rosette', CHO:'gate', HEP:'tamga',
  REB:'torch', USR:'crown', USV:'diadem', LST:'sabre', PIR:'prow',
};
// Keep the map's regional hue families, but use saturated flag colours
// rather than darkening every RGB channel into the same dusty palette.
const RICH_FIELDS = {
  MIZ: '#1468bb', QDR: '#bc2948', SAB: '#007d65', NAB: '#bc3b24',
  NUM: '#006c67', MAU: '#8a2376', GRM: '#b43c24', RHO: '#bd2445',
  PRG: '#146eae', TRT: '#7e278a', SCY: '#ac2c39', SRM: '#0b7c69',
  AXM: '#6331ac', HMY: '#a6223a', KSH: '#0c709c', HDR: '#813098',
};
function richField(rgb) {
  const [r,g,b] = rgb.map(v => v / 255), hi = Math.max(r,g,b), lo = Math.min(r,g,b), d = hi-lo, l = (hi+lo)/2;
  let h = 0;
  if (d) h = (hi === r ? ((g-b)/d + 6) % 6 : hi === g ? (b-r)/d + 2 : (r-g)/d + 4) * 60;
  const saturation = d ? d / (1 - Math.abs(2*l-1)) : 0;
  return `hsl(${h.toFixed(2)} ${(62 + saturation * 26).toFixed(2)}% ${(27 + l * 22).toFixed(2)}%)`;
}
for (const [tag, emblem] of Object.entries(COURT_DEVICES)) {
  const field = RICH_FIELDS[tag] || richField(DEFINES.TAGS[tag].color);
  FLAT_FLAGS[tag] = standard(field, DEVICES[emblem](G), { emblem, dx: emblem === 'prow' ? -1.5 : 0,
    dy: ({ diadem: -6, temple: -5, prow: -6.5, seal: -5, 'v-rod': -3 })[emblem] || 0 });
}

// Individual silhouettes for prominent courts and the shared device families.
// These remain original game standards inspired by regional objects and motifs.
const doubleCrown = path('M31 58V44C31 36 38 34 38 26C38 13 52 13 54 24C57 35 53 43 59 51L62 58Z')
  + path('M27 51H59L64 35H70V72Q48 81 27 72Z')
  + line('M28 55C16 55 17 40 25 40C32 40 32 47 27 47', G, 3);
// One owl in profile, with a folded wing cut into the silhouette. No frontal
// face, pupils or small feather marks that turn into a cartoon at game sizes.
const athenianOwl = path('M35 25 41 29C48 23 59 25 63 32L71 36 64 41C65 47 69 53 66 62L58 74H34L36 68C26 61 25 49 30 40L32 34Z M36 44C31 57 37 67 50 70C40 60 40 52 44 44Z', P).replace('stroke-width=', 'fill-rule="evenodd" stroke-width=')
  + line('M41 72V79H33M55 72V79H63', P, 3.2);
const petraFacade = path('M43 20H53L51 26H45Z', P) + rect(46, 26, 4, 5, P)
  + path('M22 45 36 31H42L29 45ZM54 31H60L74 45H67Z', P)
  + path('M40 45V38A8 8 0 0 1 56 38V45Z', P)
  + rect(23, 47, 50, 5, P)
  + [27, 38, 53, 64].map(x => rect(x, 53, 5, 22, P)).join('')
  + rect(23, 76, 50, 4, P) + rect(20, 81, 56, 3, P);
const armenianTiara = path('M31 39 34 27 41 34 48 19 55 34 62 27 65 39 62 69H34Z')
  + path('M30 44H34V68L26 79 24 70ZM62 44H66L72 70 70 79 62 68Z') + rect(31, 68, 34, 6, G)
  + star(48, 52, 8, 10, 4.5, '#a51f3e');
const achaeanMonogram = line('M23 76 41 22 59 76M30.3 54H51.7M49 24 74 76M74 24 49 76', G, 4.8);
const rhodianRose = path('M48 19C58 19 63 26 62 36L68 31C73 41 66 52 51 56H45C30 52 23 41 28 31L34 36C33 26 38 19 48 19Z M48 27C40 29 40 39 48 45C56 39 56 29 48 27Z', P).replace('stroke-width=', 'fill-rule="evenodd" stroke-width=')
  + line('M48 54V78', P, 3.5)
  + path('M46 72C34 72 29 65 29 60C39 59 46 64 46 72ZM50 68C50 59 57 55 65 56C64 64 58 68 50 68Z', P);
const arvernianTorc = path('M33 68C9 50 23 19 48 19S87 50 63 68L59 61C76 47 66 27 48 27S20 47 37 61Z')
  + path('M26 66 35 60 44 69 34 78ZM52 69 61 60 70 66 62 78Z');
const aeduanTorc = line('M35 69C16 52 25 23 48 23S80 52 61 69', G, 4.5)
  + path('M29 67 39 65 43 74 34 80ZM53 74 57 65 67 67 62 80Z');
const massaliotProw = path('M20 56H61V36L74 27 77 33 68 43V61L57 74H31L24 66H18Z')
  + line('M27 46H57M32 37H57', G, 4)
  + path('M66 54 80 50V56L65 61Z');
const armoricanSail = path('M29 23Q48 17 67 23L72 64Q48 58 24 64Z')
  + line('M48 20V79M27 73H69', G, 3.5);
const suionianHull = path('M17 31 22 27 30 48Q48 58 66 48L74 27 79 31 71 61Q48 76 25 61Z')
  + [30, 42, 54, 66].map((x, i) => line(`M${x} 55L${x - 7} ${74 - Math.abs(i - 1.5) * 2}`, G, 3)).join('');
const characeneShip = path('M28 27Q46 32 65 27V57Q46 51 28 57Z')
  + line('M48 19V67', G, 3.5) + path('M20 64H76L66 76H32Z');
const omaniDhow = path('M46 21 74 58H49ZM41 33 24 60H41Z')
  + line('M46 21V66', G, 3.5) + path('M18 65Q46 72 78 62L68 75Q43 84 27 75Z');
const iberianFalcata = path('M42 65C33 53 34 42 42 34C53 24 58 20 55 15C72 25 68 38 57 47C47 55 44 60 48 65Z')
  + line('M35 67H55M45 69V79', G, 4.5) + circle(45, 82, 3);
const numidianJavelin = path('M48 17 53 38 50 44V78H46V44L43 38Z')
  + line('M44 47H52M44 52H52', G, 2.6);
const gothonicSpear = path('M48 19 59 35 48 49 37 35Z') + line('M48 46V79', G, 4)
  + ring(48, 54, 6.5, G, 3);
const samniteSpears = `<g transform="rotate(-29 48 48)">${path('M48 17C40 25 41 34 45 40V78H51V40C55 34 56 25 48 17Z')}</g>`
  + `<g transform="rotate(29 48 48)">${path('M48 17C40 25 41 34 45 40V78H51V40C55 34 56 25 48 17Z')}</g>`;
const celtiberianArms = `<g transform="rotate(-26 48 48)">${path('M45 21H51V64H57V69H51V79H45V69H39V64H45Z')}</g>`
  + `<g transform="rotate(26 48 48)">${path('M48 17 55 33 50 39V79H46V39L41 33Z')}</g>`;
const belgicJavelins = `<g transform="rotate(-14 48 77)">${path('M48 19 54 34 50 41V77H46V41L42 34Z')}</g>`
  + `<g transform="rotate(14 48 77)">${path('M48 19 54 34 50 41V77H46V41L42 34Z')}</g>`;
Object.assign(FLAT_FLAGS, {
  MIZ: standard('#154a91', doubleCrown, { emblem: 'pschent', dx: 3.6, dy: 1.8, note: 'An Egyptian double-crown silhouette, in gold on deep blue.' }),
  ATH: standard('#234f93', athenianOwl, { emblem: 'athenian-owl', dx: -1, dy: -4, note: 'An ivory owl in profile, with an open folded wing.' }),
  NAB: standard('#a63a26', petraFacade, { emblem: 'petra-facade', dy: -4, note: 'An ivory Petra-inspired façade with a central urn and broken pediment.' }),
  SAM: { ...standard('#087c5c', SAMARITAN_CALLIGRAPHY, { emblem: 'samaritan-calligraphy', scale: 1, note: 'A calligraphic device adapted from the supplied Samaritan reference, in ivory on emerald. Its outlined forms are preserved without asserting a transcription or a historical flag.' }), detailed: true },
  ARM: standard('#a51f3e', armenianTiara, { emblem: 'artaxiad-tiara', dy: -1, note: 'A tall Artaxiad-inspired tiara, with side lappets and an inset star.' }),
  ACH: standard('#126b63', achaeanMonogram, { emblem: 'achaean-monogram', dx: -.5, dy: -1, note: 'An interlocking Alpha–Chi monogram inspired by Achaean coin devices.' }),
  RHO: standard('#ad2946', rhodianRose, { emblem: 'rhodian-rose', dy: -.5, note: 'An upright ivory rose with a cut petal and paired leaves.' }),
  AVN: standard('#326d39', arvernianTorc, { emblem: 'faceted-torc', dy: -.5, note: 'A broad collar with angular terminals, distinct from the other torcs.' }),
  AED: standard('#176e59', aeduanTorc, { emblem: 'slender-torc', dy: -3.5 }),
  MAS: standard('#166c94', massaliotProw, { emblem: 'rammed-prow', dx: -1, dy: -2.5 }),
  ARO: standard('#206878', armoricanSail, { emblem: 'leather-sail', dy: -1 }),
  SCN: standard('#285e82', suionianHull, { emblem: 'double-ended-hull', dy: -3 }),
  CHX: standard('#117e88', characeneShip, { emblem: 'square-rigged-ship', dy: .5 }),
  OMA: standard('#b83e29', omaniDhow, { emblem: 'lateen-dhow', dy: -2 }),
  IBE: standard('#7e3888', iberianFalcata, { emblem: 'falcata', dx: -2, dy: -2 }),
  NUM: standard('#006c67', numidianJavelin, { emblem: 'light-javelin', dy: .5 }),
  GOT: standard('#365aa3', gothonicSpear, { emblem: 'ringed-spear', dy: -1 }),
  SMN: standard('#8b3743', samniteSpears, { emblem: 'leaf-spears', dy: .5 }),
  CTB: standard('#a24c25', celtiberianArms, { emblem: 'crossed-sword-javelin', dy: .5 }),
  BLG: standard('#1f6a58', belgicJavelins, { emblem: 'paired-javelins', dy: -1 }),
});

// Keep the complete relief/coin-inspired drawing at every size. Enlarged
// Compendium views use these same paths; there is no reduced-detail variant.
enrichCourtStandards(FLAT_FLAGS);
enrichJudaeanStandards(FLAT_FLAGS);
reviseCourtStandards(FLAT_FLAGS);
flattenCourtStandards(FLAT_FLAGS);
// Modern Oman is resolved independently of its ancient maritime standard.
FLAT_FLAGS.OMA_MOD = standard('#b32632', '', {emblem:'omani-royal-flag',scale:1,
  note:'The plain red national flag used by the Omani sultanate in the 1948 chapter.'});

// Preserve the designs of actual modern flags; their geometry is the design.
const MODERN = new Set(('ISR EGY JOR SYR LEB IRQ TUR SAU IRN UK ITA UAR SAR HEZ EGY_REP SYR_BAATH SYR_FAR IRN_IR IRQ_BAATH GRC_MOD IRQ_REP FRA SPA POR NLD BEL LUX DEN SWE POL CZE SOV GER AUT HUN YUG ALB BUL ROU IRL SUI USA ETH YEM AFG PAK LBR HEJ KUR ALW DRZ').split(' '));
function hash(value) {
  let h = 2166136261;
  for (const c of String(value)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const validColor = color => `rgb(${color.slice(0, 3).map(v => Number(v) | 0).join(',')})`;

export function presentFlag(key, art, color) {
  if (art?.flatBanner) return art;
  const viewBox = typeof art === 'object' ? art.viewBox : '0 0 24 24';
  const raw = typeof art === 'string' ? art : art.body;
  const box = String(viewBox).split(/\s+/).map(Number), [x, y, w, h] = box;
  if (box.length !== 4 || !box.every(Number.isFinite) || w <= 0 || h <= 0) return { viewBox: '0 0 24 24', body: raw };
  const normalized = `<g transform="scale(${24 / w} ${24 / h}) translate(${-x} ${-y})">${raw}</g>`;
  // Existing modern designs have a .6-unit inset; extend them to the edge.
  const body = MODERN.has(key) ? `<g transform="translate(-0.63 -0.63) scale(1.0526)">${normalized}</g>`
    : `<g>${rect(0, 0, 24, 24, validColor(color))}<g data-insignia transform="translate(-.72 -.72) scale(1.06)">${normalized}</g></g>`;
  return { viewBox, body: `<g transform="translate(${x} ${y}) scale(${w / 24} ${h / 24})">${body}</g>` };
}

// Old saves may contain retired synthetic F-tags. They keep their real name
// and get a deterministic vector banner instead of a missing-art text chip.
export function legacyCourtFlag(tag, identity, color) {
  const h = hash(identity || tag), petals = 5 + h % 5, width = 8 + (h >>> 8) % 8;
  const device = star(48, 48, petals, 29, width, P);
  return standard(validColor(color), device, { emblem: 'saved-court' });
}


