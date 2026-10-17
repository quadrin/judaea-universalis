// Flat vector court standards. Ancient banners are original game designs,
// inspired by coins, seals and regional motifs, not reconstructed flags.
// No raster images, gradients, filters, cloth, lighting or remote resources.
import { REVIVALS } from '../data/revivals.js';

export const REVIVAL_FLAGS = Object.fromEntries(REVIVALS.map(r => [r.tag, r]));
export const LEGACY_BORROWED_FLAGS = { HPA: 'HER', HPH: 'HER', BAL: 'SEL', DMT: 'SEL', LKH: 'GHA' };
const G = '#e2bd60', P = '#f4e6be', S = '#d5e2e7', K = '#32261f';
const path = (d, fill = G, stroke = K, width = 1.2) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;
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
function wreath(color = G, offset = 0) {
  const side = line('M47 82C23 76 17 52 27 30', color, 2)
    + [0, 1, 2, 3, 4, 5].map(i => {
      const y = 35 + i * 7, x = 23 + Math.max(0, i - 2) * 2;
      return path(`M${x} ${y}q-9-3-8-10q8 1 8 10m0 0q8-2 9-9q-8-1-9 9`, color, 'none');
    }).join('');
  return `<g transform="translate(0 ${offset})">${side}<g transform="translate(96 0) scale(-1 1)">${side}</g></g>`;
}
const anchor = (color = G) => circle(48, 29, 6, color) + circle(48, 29, 3, '#273241')
  + line('M48 35V73M33 44H63', color, 5)
  + path('M48 76C33 75 26 66 25 57L35 62 31 65Q37 71 48 72Q59 71 65 65L61 62 71 57C70 66 63 75 48 76Z', color);
const diadem = (y = 23, color = G) => path(`M30 ${y}Q48 ${y - 8} 66 ${y}L64 ${y + 5}Q48 ${y - 1} 32 ${y + 5}Z`, color)
  + [35, 42, 48, 54, 61].map(x => circle(x, y + (x === 48 ? -2 : 0), 1.3, '#9d423f')).join('')
  + line(`M31 ${y + 3}L25 ${y + 16}M65 ${y + 3}L71 ${y + 16}`, color, 2);
const flame = (x = 48, y = 25) => path(`M${x} ${y - 12}q-3 8-7 12q-3 9 7 13q10-4 7-13q-1 7-5 6q3-10-2-18Z`, G, 'none');
function temple(color = P) {
  return path('M25 41 48 25 71 41Z', color) + rect(25, 42, 46, 5, color)
    + [29, 40, 51, 62].map(x => rect(x, 48, 5, 23, color) + rect(x - 1, 48, 7, 3, G)).join('')
    + rect(24, 72, 48, 4, color) + rect(21, 77, 54, 4, color)
    + path('M44 71V53H52V71Z', '#202c37', 'none');
}
const cornucopias = `<g>${path('M44 77C23 69 20 50 28 35L37 41C28 52 33 66 44 73Z')}${circle(29, 35, 5)}${circle(34, 32, 4)}${circle(25, 30, 3)}<g transform="translate(96 0) scale(-1 1)">${path('M44 77C23 69 20 50 28 35L37 41C28 52 33 66 44 73Z')}${circle(29, 35, 5)}${circle(34, 32, 4)}${circle(25, 30, 3)}</g></g>`;
const pomegranate = circle(48, 47, 9, '#bd4344') + path('M43 39 43 33 48 36 53 33 53 39Z', '#bd4344') + line('M45 45Q42 51 47 53', '#edbc80', 1.4);
function menorah() {
  return [22, 15, 8].map(r => line(`M${48 - r} 31V40A${r} ${r} 0 0 0 ${48 + r} 40V31`, G, 4)).join('')
    + line('M48 31V76', G, 4)
    + [-22, -15, -8, 0, 8, 15, 22].map(dx => rect(48 + dx - 3, 26, 6, 4, G) + path(`M${48 + dx} 20l-2 5h4Z`, G, 'none')).join('')
    + rect(40, 75, 16, 4, G) + rect(34, 80, 28, 4, G);
}
const lion = path('M63 34 69 26 67 20 56 21 50 29 51 39 41 45 28 39 22 42 33 51 47 54 44 63 35 63 28 73 20 77 21 81 34 79 44 70 55 70 61 76 59 82 70 82 72 77 66 65 69 55 64 45 69 40Z')
  + line('M68 56C87 65 83 39 78 34Q72 26 80 22', G, 4)
  + path('M78 21 81 15 85 21 82 25Z', G, 'none') + path('M53 27 46 30 50 34 55 32Z', G, 'none')
  + line('M55 38 61 34M56 46 61 42', '#9c7432', 1.5);
function eagle(color = G) {
  return path('M43 48C47 35 58 24 72 19C76 33 73 50 64 60L52 68 42 62Z', color)
    + line('M68 27C64 40 57 48 47 56M70 35C66 46 59 53 51 59M70 43C67 51 61 58 56 61', '#946c2a', 2)
    + path('M45 69C34 66 28 58 30 49C31 43 36 41 37 36C34 34 34 30 37 27C41 24 47 26 49 30L48 34C44 35 43 39 44 44C48 49 52 57 51 65L57 73 48 72 43 77Z', color)
    + path('M37 29 29 31 27 35 34 34 38 35Z', color) + circle(40, 30, 1.1, K)
    + line('M38 67 36 77 31 78M48 69 51 77 57 78', color, 3)
    + path('M23 81H43L38 86 61 79H73L62 84H46L51 79H31Z', color, 'none');
}
const mountain = path('M21 77 38 46 48 61 59 36 77 77Z', S) + path('M34 54 38 46 43 55 38 52 36 57ZM53 46 59 36 65 48 59 44 57 49Z', P, 'none');
const fireAltar = rect(36, 49, 24, 5, P) + rect(43, 54, 10, 18, S) + rect(34, 73, 28, 4, P) + rect(29, 78, 38, 5, S) + flame(48, 32);
const disk = circle(48, 42, 9) + line('M48 31V53M37 42H59', P, 2);
const wingedDisk = disk + path('M36 40 15 30 20 46 37 48ZM60 40 81 30 76 46 59 48Z', G) + line('M23 37 36 43M25 42 36 46M73 37 60 43M71 42 60 46', K, 1.5);
function border(kind, ink = G) {
  const edge = `<rect x="5" y="5" width="86" height="86" fill="none" stroke="${ink}" stroke-width="2"/>`;
  if (kind === 'plain') return edge;
  if (kind === 'diamonds') return edge + [18, 38, 58, 78].map(x => path(`M${x} 8l5 4-5 4-5-4ZM${x} 80l5 4-5 4-5-4Z`, ink, 'none')).join('');
  if (kind === 'corners') return edge + [0, 1, 2, 3].map(i => `<g transform="rotate(${i * 90} 48 48)">${line('M9 26V9H26M13 22V13H22V18H18', ink, 2)}</g>`).join('');
  return edge + [0, 1, 2, 3].map(i => `<g transform="rotate(${i * 90} 48 48)">${line('M12 6V13H20V6M28 6V13H36V6M44 6V13H52V6M60 6V13H68V6M76 6V13H84V6', ink, 2)}</g>`).join('');
}
function standard(color, motif, { trim = 'corners', ink = G, field = '', note = '' } = {}) {
  return { viewBox: '0 0 96 96', flatBanner: true, note,
    body: rect(0, 0, 96, 96, color) + field + border(trim, ink) + `<g>${motif}</g>` };
}

export const FLAT_FLAGS = {
  // The Herodian sons get separate coin-inspired devices and field colours.
  HPA: standard('#762a3d', wreath(P) + line('M48 80V25', G, 3) + path('M48 24Q37 40 44 58L48 65ZM48 39Q64 40 57 56L48 65Z', G, 'none'), { trim: 'key', note: 'Antipas: a reed and wreath; original game banner.' }),
  HPH: standard('#1c5864', temple(S), { trim: 'corners', ink: S, field: rect(8, 83, 80, 5, G), note: 'Philip: a temple façade inspired by his coin imagery.' }),
  HER: standard('#793e30', anchor() + diadem(18), { field: rect(48, 0, 48, 96, '#a8772e'), trim: 'plain' }),
  BAL: standard('#753660', wreath(P) + anchor() + star(48, 17, 8, 8, 3), { trim: 'diamonds' }),
  DMT: standard('#273b69', anchor(S) + diadem(18) + line('M25 72 24 39M71 72 72 39', G, 2)
    + [0, 1, 2, 3].map(i => line(`M24 ${44 + i * 7}l-7-6m7 6 7-6M72 ${44 + i * 7}l-7-6m7 6 7-6`, G, 2)).join(''), { trim: 'corners', ink: S }),
  LKH: standard('#a15e31', path('M52 29A22 22 0 1 0 66 65A25 25 0 0 1 52 29Z') + star(52, 49, 8, 10, 4, S)
    + line('M22 30V78M74 30V78', P, 2) + path('M18 30 22 22 26 30ZM70 30 74 22 78 30Z', P), { field: rect(0, 48, 96, 48, '#272830'), trim: 'diamonds' }),
  HAS: standard('#234e87', cornucopias + pomegranate, { trim: 'corners' }),
  JUD: standard('#20457c', menorah(), { trim: 'diamonds', ink: P }),
  MLI: standard('#26417e', line('M48 29 27 65H69ZM48 77 27 41H69Z', S, 4) + diadem(17), { trim: 'corners', ink: S }),
  ISL: standard('#205840', rect(33, 49, 30, 27, P) + path('M28 49V39L35 44H61L68 39V49Z', P)
    + line('M34 58H62M34 67H62M43 50V58M53 59V67M43 68V75', '#9c8b6b', 1.6) + rect(29, 77, 38, 5, P) + flame(48, 31), { trim: 'diamonds' }),
  JDH: standard('#263f70', lion, { trim: 'key', ink: G }),
  SAM: standard('#286e8b', mountain + flame(48, 26), { trim: 'diamonds', ink: P }),
  SEL: standard('#bb913c', anchor(P), { field: rect(0, 0, 15, 96, '#694773') + rect(81, 0, 15, 96, '#694773'), trim: 'key', ink: '#f7df9b' }),
  PTO: standard('#285c87', eagle(), { trim: 'key', field: rect(0, 0, 96, 9, '#91332e') + rect(0, 87, 96, 9, '#91332e') }),
  BYZ: standard('#632e68', wreath(P) + line('M36 67 60 35M36 35 60 67M48 76V22', G, 5)
    + path('M48 22H57A10 10 0 0 1 57 42H48V36H56A4 4 0 0 0 56 28H48Z'), { trim: 'corners' }),
  SAS: standard('#753334', fireAltar + path('M35 64 16 51 20 67 35 70ZM61 64 80 51 76 67 61 70Z', G)
    + line('M22 59 33 65M74 59 63 65', K, 1.5), { field: rect(48, 0, 48, 48, '#292b31') + rect(0, 48, 48, 48, '#292b31'), trim: 'key', ink: P }),

  // Courts raised by release/revival, deliberately outside DEFINES.TAGS.
  PHO: standard('#813d79', path('M28 57H72L62 71H38Z', P) + line('M49 31V57M35 76H66', G, 3)
    + path('M49 32 69 51H49Z') + circle(26, 29, 6) + line('M17 81Q25 75 33 81T49 81T65 81T81 81', P, 2), { trim: 'key' }),
  PHL: standard('#9e6635', [30, 39, 48, 57, 66].map((x, i) => path(`M${x - 3} 49L${x - 5} ${31 + Math.abs(i - 2) * 4}L${x} ${23 + Math.abs(i - 2) * 3}L${x + 4} 33L${x + 2} 49Z`, P)).join('')
    + path('M29 50H67V62L57 76H39L29 62Z') + line('M33 57H63M38 67H58', K, 2), { trim: 'corners' }),
  IDU: standard('#8c4c37', path('M22 77 35 31 47 23 53 49 64 35 76 77Z', P) + path('M40 77 48 43 53 77Z', '#8c4c37', 'none')
    + star(68, 25, 8, 7, 3), { trim: 'diamonds' }),
  MOA: standard('#753c50', path('M30 78V38A18 18 0 0 1 66 38V78Z', '#282b30') + [41, 49, 57, 65].map(y => line(`M36 ${y}H60`, P, 2)).join('')
    + rect(27, 79, 42, 4, G), { trim: 'corners' }),
  AMM: standard('#625580', path('M27 76V42H35V29H43V42H53V29H61V42H69V76Z', P)
    + path('M43 76V61A5 5 0 0 1 53 61V76Z', '#625580', 'none') + star(48, 22, 6, 8, 4), { trim: 'diamonds' }),
  ARD: standard('#3c647e', path('M44 23H59L50 41H63L35 76 42 51H31Z')
    + line('M23 31 30 37M68 27 61 36M21 65H31M65 59H75', P, 3), { trim: 'key', ink: P }),
  PLM: standard('#b68a37', circle(48, 42, 14, P) + star(48, 42, 12, 23, 17, G) + circle(48, 42, 10, '#8b3c3b')
    + line('M29 78V60M39 78V60M57 78V60M67 78V60M25 58H71M25 80H71', P, 4), { trim: 'corners', ink: P }),
  EME: standard('#9a4950', path('M31 73 35 43 45 24 56 31 65 73Z', '#282a31')
    + circle(49, 48, 5, G) + rect(28, 75, 40, 5, P) + star(71, 26, 8, 7, 3), { trim: 'diamonds', ink: P }),
  DEC: standard('#4c6c58', temple(P) + Array.from({ length: 10 }, (_, i) => {
    const a = Math.PI * 2 * i / 10; return circle((48 + Math.cos(a) * 34).toFixed(2), (49 + Math.sin(a) * 34).toFixed(2), 2.1, G);
  }).join(''), { trim: 'plain' }),
  ASY: standard('#854039', wingedDisk + line('M48 53V79', P, 3) + rect(37, 78, 22, 4, G), { trim: 'diamonds', ink: P }),
  BAB: standard('#335c8a', star(48, 43, 8, 21, 9, P) + circle(48, 43, 6, G)
    + [65, 73, 81].map(y => line(`M24 ${y}Q30 ${y - 5} 36 ${y}T48 ${y}T60 ${y}T72 ${y}`, G, 2)).join(''), { trim: 'corners' }),
  ELM: standard('#866842', line('M37 77C65 77 64 59 45 59S27 42 49 42S65 27 52 23', P, 7)
    + path('M49 21 60 22 59 29 51 29Z', P) + line('M25 80H71', G, 3), { trim: 'diamonds' }),
  MED: standard('#614d8a', path('M43 72 43 35 38 27 42 21 48 25 54 21 58 27 53 35 53 72 48 81Z', P)
    + line('M34 38H62M48 44V72', G, 4), { trim: 'corners' }),
  PRS: standard('#9b4055', fireAltar + star(24, 34, 8, 6, 3, P) + star(72, 34, 8, 6, 3, P), { trim: 'diamonds' }),
  CIL: standard('#386961', path('M32 36 48 22 64 36V61H32Z', P) + path('M22 77 38 48 49 63 60 45 76 77Z')
    + circle(48, 33, 4, '#386961'), { trim: 'corners', ink: P }),
  CAP: standard('#80644d', path('M27 74 38 55 39 40 47 24 56 40 57 55 70 74Z', P)
    + rect(43, 46, 9, 28, '#80644d') + line('M26 80H71M35 40H60', G, 3), { trim: 'key' }),
  ION: standard('#2a6b82', path('M35 76V44H61V76Z', P) + rect(29, 77, 38, 5, P)
    + line('M36 47V72M48 47V72M60 47V72', '#2a6b82', 2)
    + line('M31 38C19 38 22 23 32 25C41 28 34 40 32 34M65 38C77 38 74 23 64 25C55 28 62 40 64 34M31 27H65M28 42H68', G, 4), { trim: 'key' }),
  HEL: standard('#2c4e8c', wreath(P) + rect(38, 42, 20, 30, G) + line('M40 38H56M41 49H55M41 55H55M41 61H55', K, 2)
    + star(48, 25, 8, 8, 3), { trim: 'corners', ink: P }),
  CYP: standard('#a16d3c', path('M48 77V43C33 46 25 38 29 26Q39 22 48 33Q57 22 67 26C71 38 63 46 48 43Z', P)
    + line('M48 35V76M34 80H62', G, 3), { trim: 'diamonds' }),
  KMT: standard('#b58f31', line('M48 78V42', '#254c63', 7) + circle(48, 32, 12, P) + circle(48, 32, 7, '#b58f31')
    + line('M30 49H66', '#254c63', 6), { trim: 'key', ink: '#254c63' }),
  HEJ: standard('#292c31', rect(0, 32, 96, 32, '#27804d') + rect(0, 64, 96, 32, '#f3eee1')
    + path('M0 0 48 48 0 96Z', '#a92e35', 'none'), { trim: 'plain', ink: '#bba66e', note: 'Sharifian colours, drawn as a flat square flag.' }),
  KUR: standard('#c1323c', rect(0, 32, 96, 32, '#f4f1e5') + rect(0, 64, 96, 32, '#287b43')
    + star(48, 48, 21, 15, 10, '#edbf31'), { trim: 'plain', ink: '#bdad79' }),
  ALW: standard('#f3eee0', path('M0 0 25 0 25 25H0ZM71 0H96V25H71ZM0 71H25V96H0ZM71 71H96V96H71Z', '#a3303b', 'none')
    + star(48, 48, 12, 21, 16, '#d7ac3e'), { trim: 'plain', ink: '#456c86', note: 'Original game emblem for the coastal state; not a reconstruction of its mandate flag.' }),
  DRZ: standard('#f1eee0', rect(0, 0, 30, 96, '#28784a') + rect(30, 0, 66, 24, '#ad343d')
    + rect(30, 24, 66, 24, '#e0b843') + rect(30, 48, 66, 24, '#285c96') + rect(30, 72, 66, 24, '#f1eee0'), { trim: 'plain', ink: '#b6a576', note: 'Five-colour Druze identity in a flat game banner.' }),
};

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
    : `<g>${rect(0, 0, 24, 24, validColor(color))}${rect(0, 0, 2.3, 24, '#3b3340')}${rect(21.7, 0, 2.3, 24, '#3b3340')}
      <path d="M1.1 1.1H22.9V22.9H1.1Z" fill="none" stroke="${G}" stroke-width="0.55"/>
      <path d="M3 1.5V3H4.5M19.5 3H21V1.5M3 22.5V21H4.5M19.5 21H21V22.5" fill="none" stroke="${P}" stroke-width="0.65"/>
      <g transform="translate(2.3 2.3) scale(.8083)">${normalized}</g></g>`;
  return { viewBox, body: `<g transform="translate(${x} ${y}) scale(${w / 24} ${h / 24})">${body}</g>` };
}

// Old saves may contain retired synthetic F-tags. They keep their real name
// and get a deterministic vector banner instead of a missing-art text chip.
export function legacyCourtFlag(tag, identity, color) {
  const h = hash(identity || tag), petals = 5 + h % 5, width = 8 + (h >>> 8) % 8;
  const device = star(48, 46, petals, 23, width, P) + circle(48, 46, 6, G)
    + line(`M${26 + h % 5} 77H${68 - h % 5}`, P, 3);
  return standard(validColor(color), device, { trim: h % 2 ? 'diamonds' : 'corners', field: rect(0, 65, 96, 31, '#373341') });
}
