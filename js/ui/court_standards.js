// Engraved court devices. All detail stays in the SVG at every display size.
// The compositions and colours are game inventions; an object-derived motif
// does not establish that its owners used this banner. See EMBLEM_BRIEF.md.
import { FIGURE_REFINEMENTS } from './standard_figures.js';
const gold = '#f2c75b', ivory = '#f4e6be', bronze = '#cf9350', red = '#be4547';
const p = (d, fill = gold) => `<path d="${d}" fill="${fill}"/>`;
const l = (d, ink = gold, width = 1.5) => `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const c = (x, y, r, fill = gold) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const r = (x, y, w, h, fill = gold) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
const ring = (x, y, rad, ink = gold, width = 1.5) => `<circle cx="${x}" cy="${y}" r="${rad}" fill="none" stroke="${ink}" stroke-width="${width}"/>`;
const g = (body, transform) => `<g transform="${transform}">${body}</g>`;
const mirror = body => body + g(body, 'translate(96 0) scale(-1 1)');
const repeat = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');
const rays = (n, inner, outer, ink = gold) => repeat(n, i => g(l(`M48 ${48-inner}V${48-outer}`, ink, 1.7), `rotate(${i*360/n} 48 48)`));
const wave = (y, ink = ivory) => l(`M15 ${y}q5-5 11 0t11 0t11 0t11 0t11 0t11 0`, ink, 1.4);
const jewel = (x, y, fill = red) => p(`M${x} ${y-3}l3 3-3 3-3-3Z`, fill);
const star = (x, y, n = 8, rad = 10, inner = 4, ink = gold) => p(repeat(n*2, i => {
  const a = -Math.PI/2+i*Math.PI/n, len = i%2 ? inner : rad;
  return `${i ? 'L' : 'M'}${(x+Math.cos(a)*len).toFixed(2)} ${(y+Math.sin(a)*len).toFixed(2)}`;
})+'Z', ink);

function shell(f) {
  return p('M47 16 52 24 59 22 59 31 69 32 65 40 76 46 68 51 73 61 62 61 58 72 53 70 48 83 43 76 43 67C30 65 24 54 27 44C29 35 36 31 42 30L39 22Z', ivory)
    + p('M48 35C65 34 68 51 57 61C49 69 37 62 36 54C35 44 47 40 53 46C57 50 53 57 48 55C44 53 46 49 49 50', bronze)
    + l('M48 35C65 34 68 51 57 61C49 69 37 62 36 54C35 44 47 40 53 46C57 50 53 57 48 55', f, 1.5)
    + l('M43 33 44 23M35 38 29 36M31 49 25 48M33 59 29 64M53 66 48 77M61 39 67 35M64 49 72 47M60 58 68 61', f, 1.2)
    + l('M46 27 48 31M51 28 52 32M35 41 31 39M33 45 29 44M33 55 29 57M37 60 34 63M41 64 39 69M45 66 44 73M56 63 55 68M62 57 66 58M65 53 69 54M64 44 69 41M60 36 61 30M56 34 55 27M52 37C43 32 34 39 32 45M36 49C39 42 47 38 54 42M40 56Q43 62 51 61', f, .55);
}
function pomegranate(f) {
  return p('M39 34 35 22 44 27 48 17 52 27 61 22 57 34C76 44 76 68 58 78Q48 84 38 78C20 68 20 44 39 34Z')
    + l('M38 34Q48 38 58 34M32 47C28 61 36 72 43 75M47 42V74', f, 1.5)
    + repeat(4, i => repeat(4, j => c(45+i*4.4, 47+j*6, 1.3, bronze)))
    + l('M36 42C29 53 32 66 40 72M59 40Q69 53 61 69M45 33H52',ivory,.65);
}
function bull(f, longHorns = false) {
  const horn = longHorns ? 'M35 38C13 36 14 19 20 14C18 29 25 29 37 29Z' : 'M35 36C22 37 15 27 19 19C23 30 29 28 38 28Z';
  return mirror(p(horn, ivory))
    + p('M29 35 35 30Q48 25 61 30L67 35 61 53 57 69Q48 80 39 69L35 53Z')
    + mirror(p('M33 37 22 33 25 43 36 47Z', bronze))
    + p('M39 61Q48 55 57 61L56 69Q48 75 40 69Z', ivory)
    + l('M39 39 43 49 41 58M57 39 53 49 55 58M44 32 48 41 52 32M43 66H45M51 66H53', f, 1.7)
    + mirror(p('M35 42 42 44 41 47 36 46Z', f)) + c(48, 34, 2.2, ivory)
    + mirror(l('M35 32 31 26 25 23M36 34 30 30M32 39 29 38M37 49 39 52 40 58M39 53 41 55M36 47 39 48M40 40 44 42M39 37 45 39M43 60 43 63M39 67 42 71M44 70 46 72',f,.55))
    + l('M46 43 48 50 50 43M46 53 48 57 50 53M44 75H52',ivory,.7);
}
function boar(f) {
  return p('M20 54C21 39 30 33 49 34L52 25 57 34 62 31 65 41 78 44 79 54 69 58 66 67 58 67 56 62 37 64 34 71 26 71 27 61Z')
    + p('M29 34 32 26 37 32 41 24 44 32 48 26 49 34Z', ivory)
    + l('M23 51C11 49 13 36 20 39M33 63V72M62 62V72', gold, 3)
    + l('M29 43Q40 39 51 44M35 46 39 55M44 42 47 53M64 45 68 48', f, 1)
    + p('M70 54Q78 62 79 49Q74 55 70 54Z', ivory) + c(69, 45, 1.4, f)
    + r(44, 68, 4, 15, bronze) + r(25, 82, 42, 2, gold)
    + repeat(9,i=>l(`M${28+i*3} ${40+Math.sin(i*.5)*2}l-1 3m2 2 1 3`,bronze,.55))
    + l('M29 48Q25 56 31 58M50 48Q55 52 55 59M59 41 62 36M66 51 70 52M30 66H33M60 65H64M43 74H49M43 78H49',f,.55);
}
function caetra(f, pattern = 0) {
  return c(48, 48, 24, ivory) + ring(48, 48, 21, bronze, 3) + ring(48, 48, 17, f)
    + (pattern ? repeat(4, i => g(l('M48 29Q64 31 62 44Q60 48 53 45', bronze, 2.5), `rotate(${i*90} 48 48)`)) : l('M48 27V69M27 48H69', bronze, 2))
    + c(48, 48, 6, gold) + ring(48, 48, 4, f)
    + repeat(12, i => g(c(48, 25.5, .9, f), `rotate(${i*30} 48 48)`));
}
function spear(tilt = 0, x = 48, ink = ivory) {
  return g(l(`M${x} 32V82`, bronze, 3) + p(`M${x} 13l6 14-6 9-6-9Z`, ink) + l(`M${x} 17V30`, bronze, .9), `rotate(${tilt} 48 48)`);
}
function sword(f, curve = false) {
  return (curve ? p('M40 61C28 44 43 26 58 14C70 27 57 42 50 48L46 61Z', ivory)
    + l('M43 55C39 41 54 29 58 21', bronze) : p('M44 20 48 13 52 20V59L48 64 44 59Z', ivory) + l('M48 20V56', bronze))
    + p('M35 60Q48 55 59 60L58 65H38Z') + r(45, 64, 6, 13, bronze) + c(48, 80, 4)
    + l('M46 67H50M46 71H50M46 75H50', f, 1);
}
function torc(f, spiral = false) {
  return l('M31 70C10 54 20 16 48 16S86 54 65 70', gold, 9)
    + l('M30 66C15 49 26 22 48 22S81 49 66 66', ivory, 1.3)
    + repeat(18, i => g(l('M45 13 51 20', f, .9), `rotate(${-132+i*15.5} 48 48)`))
    + (spiral ? mirror(ring(32, 72, 6, ivory, 3) + l('M29 71Q30 66 34 69Q38 73 33 75', f, 1.1))
      : mirror(p('M24 68 34 61 43 73 34 82 25 77Z', ivory) + jewel(33, 72, red)));
}
function ship(f, type = 'galley') {
  const hull = p('M15 62Q48 70 79 58L76 68Q55 80 28 73Z', bronze)
    + l('M21 65Q49 73 74 63M30 72 28 66M41 75 40 68M53 75 53 68M65 72 66 65', gold, 1.2);
  const rig = l('M48 17V67M25 25H71M48 19 23 62M49 20 76 60', gold, 1.7);
  const sail = type === 'leather' ? p('M23 29Q48 23 73 29L68 58Q48 51 28 58Z',bronze)
    +l('M24 31 68 56M72 31 29 56M37 28 37 54M59 28V54M26 41H70',ivory,.8)
    +repeat(8,i=>l(`M${28+i*5} ${32+i*2.6}l-1 3`,gold,.8))
    : type === 'lateen' ? p('M49 21 75 57 51 61Z', ivory) + l('M54 34 69 55M53 44 61 56', bronze, 1)
    : p('M27 28Q48 33 69 28L67 56Q48 51 29 56Z', ivory)
      + l('M37 31 37 53M48 32V52M59 31 59 53M29 39Q48 42 68 39M29 48Q48 50 67 48', bronze, 1);
  return (type === 'oared' ? l('M18 61 14 33Q15 26 21 31M76 61 82 33Q81 26 75 31', gold, 3)
    + repeat(6, i => l(`M${28+i*8} 61l-8 17`, ivory, 2)) : rig+sail)
    + hull + (type === 'galley' ? p('M76 62 85 58 85 63 75 66Z') + c(75, 58, 1.4, ivory) : '') + wave(84);
}
function masonry(f, type = 'citadel') {
  if (type === 'watchtower') return p('M31 78V28H27V18H35V23H43V18H53V23H61V18H69V28H65V78Z',ivory)
    +repeat(6,i=>l(`M32 ${34+i*7}H64M${37+i%2*9} ${28+i*7}v6M${55-i%2*9} ${28+i*7}v6`,bronze,.75))
    +r(44,38,8,12,f)+p('M42 78V62Q48 53 54 62V78Z',f)+l('M39 78V61Q48 48 57 61V78',gold,1.5)+r(24,79,48,4,gold);
  if (type === 'oasis') return p('M16 78V31H23V25H29V31H35V43H61V31H67V25H73V31H80V78Z',ivory)
    +p('M15 32H36V37H15ZM60 32H81V37H60Z')
    +repeat(5,i=>l(`M17 ${43+i*6}H79M${22+i%2*4} ${38+i*6}v5M${70+i%2*4} ${38+i*6}v5`,bronze,.7))
    +p('M40 79V62L48 53 56 62V79Z',f)+l('M37 77V60L48 48 59 60V77M22 80H74',gold,1.5);
  if (type === 'palace') return p('M19 78V33H25V26H31V33H38V26H44V33H52V26H58V33H65V26H71V33H77V78Z',ivory)
    +r(21,38,54,4,gold)+[29,48,67].map(x=>p(`M${x-6} 78V58Q${x} 43 ${x+6} 58V78Z`,f)
      +l(`M${x-8} 78V57Q${x} 38 ${x+8} 57V78`,bronze,1)).join('')
    +l('M21 46H75M23 80H73M35 45V74M61 45V74',gold,1.3);
  const roof = type === 'nuraghe' ? p('M25 74 31 30 39 25H57L65 30 71 74Z', ivory)
    + p('M29 26 28 20H68L67 26Z', gold)
    : p('M22 73V40H30V27H38V40H43V25H53V40H58V27H66V40H74V73Z', ivory);
  return roof + repeat(5, i => l(`M${29-i} ${37+i*7}H${67+i}M${37+i%2*7} ${30+i*7}v7M${54+i%2*7} ${30+i*7}v7`, bronze, 1))
    + p('M41 75V58Q48 48 55 58V75Z', f) + l('M38 75V57Q48 43 58 57V75', gold, 2) + r(20, 75, 56, 5, gold);
}
function flame(x = 48, y = 30) {
  return p(`M${x} ${y-13}c-4 10-12 13-8 23q8 8 16 0c5-8-5-10-4-18q-5 9-6 12q-2-5 2-17Z`) + l(`M${x} ${y+7}v-5`, ivory, 1.7);
}
function altar(f, incense = false) {
  return (incense ? l('M40 32C26 24 47 22 39 13M55 32C67 24 49 22 57 14', ivory, 1.4) : flame())
    + p('M27 39H69L65 49H31Z', ivory) + r(31, 48, 34, 5, gold) + r(42, 53, 12, 19, ivory)
    + r(30, 72, 36, 5, gold) + r(25, 78, 46, 5, ivory)
    + l('M35 42H61M45 56V69M51 56V69M34 75H62', bronze, 1.2)
    + (incense ? repeat(5, i => c(34+i*7, 37, 1.8, gold)) : '');
}
function tiara(f, high = true) {
  return p(high ? 'M30 42 33 22 40 30 48 14 56 30 63 22 66 42 63 70H33Z' : 'M26 38 29 24 38 33 48 21 58 33 67 24 70 38 64 65H32Z')
    + mirror(p('M30 44H35V66L26 80 22 73Z', ivory)) + r(31, 65, 34, 8, ivory)
    + star(48, 46, 8, 10, 4, f) + repeat(5, i => c(35+i*6.5, 68.8, 1.2, f))
    + l('M37 35 36 58M59 35 60 58M38 60H58', bronze, 1.2);
}
function bow(f, type) {
  const shape = type === 'recurve' ? 'M29 15C18 24 44 30 39 43Q35 48 39 53C44 66 18 72 29 81' : 'M27 15Q68 48 27 81';
  return l(shape, ivory, 4) + l('M29 15 48 48 29 81M19 48H77', gold, 1.5)
    + p('M72 43 82 48 72 53Z') + p('M20 44 30 48 20 52Z', bronze)
    + l('M39 43 42 46M39 53 42 50', f, 1.2);
}
function silphium(f) {
  return l('M48 82V26', ivory, 3) + mirror(repeat(3, i => g(p('M46 43C37 27 21 36 19 43C31 38 33 52 46 47Z', gold)
    + l('M23 42Q35 39 45 46', f, .9), `translate(0 ${i*13})`)))
    + l('M48 27 35 19M48 27V13M48 27 61 19', ivory, 1.5)
    + [35,41,48,55,61].map((x,i)=>c(x, 17-Math.sin(i*Math.PI/4)*4, 3.8, gold)).join('')
    + l('M48 79 39 85M48 79 56 85', ivory, 1.3);
}
function owl(f) {
  return p('M29 27 35 17 43 23Q52 20 60 24L67 18 66 35Q73 51 63 68L60 77H33L31 67Q22 49 29 27Z', ivory)
    + mirror(ring(37, 35, 8, gold, 1.2)+ring(37,35,5,bronze,.65)+c(37,35,2,f)) + p('M45 39 51 39 48 48Z', bronze)
    + l('M31 47Q36 55 33 68M65 47Q60 55 63 68M39 49 44 54 48 50 52 54 57 49M39 58 44 63 48 59 52 63 57 58M39 67 44 71 48 68 52 71 57 67', bronze, 1.1)
    + l('M39 77V83M35 83H43M57 77V83M53 83H61', gold, 2)
    + g(p('M17 29C9 27 9 20 15 16C17 20 20 23 17 29ZM19 38C13 36 14 29 19 26C22 31 23 34 19 38Z', gold)+l('M15 17 21 44', gold), 'translate(0 1)')
    + mirror(l('M29 47Q25 58 34 71M30 50 33 54M30 55 34 59M31 61 35 65M32 66 36 69M33 23 34 26M36 22 37 25M40 26 41 29',bronze,.55))
    +repeat(3,i=>repeat(4,j=>l(`M${38+j*5} ${49+i*8}q2 5 4 0`,bronze,.5)));
}

// source names here point to directly checked catalogue records. A regional
// analogy or invented device is labelled in its note instead of implying a
// tribal attribution that the evidence cannot support.
export const STANDARD_SOURCES = {
  murex: ['Mariners’ Museum · Tyrian murex on coinage', 'https://catalogs.marinersmuseum.org/object/CL3826'],
  gorgon: ['Met · Etruscan terracotta Medusa antefix', 'https://www.metmuseum.org/art/collection/search/252929'],
  pegasus: ['Cleveland Museum of Art · Corinthian Pegasus stater', 'https://www.clevelandart.org/art/1916.984'],
  silphium: ['British Museum · Cyrene silphium coin', 'https://www.britishmuseum.org/collection/object/C_EH-p697-3-Cyr'],
  dolphin: ['British Museum · Tarentine dolphin rider', 'https://www.britishmuseum.org/collection/object/C_EH-p87-24-Tar'],
  lydia: ['British Museum · Lydian lion and bull coin', 'https://www.britishmuseum.org/collection/object/C_1877-0201-1'],
  carnyx: ['National Museums Scotland · Deskford carnyx reconstruction', 'https://www.nms.ac.uk/explore-our-collections/collection-search-results/?item_id=384359'],
  elam: ['Encyclopaedia Iranica · Kurangun snake throne', 'https://www.iranicaonline.org/articles/kurangun/'],
  bactria: ['British Museum · Bactrian elephant head coin', 'https://www.britishmuseum.org/collection/object/C_IOLC-515'],
  meroe: ['UNESCO · Archaeological Sites of Meroe', 'https://whc.unesco.org/en/list/1336/'],
  aksum: ['UNESCO · Aksum stelae', 'https://whc.unesco.org/en/list/15/'],
  sardinia: ['Met · Nuragic sculpture and tower models', 'https://www.metmuseum.org/ja/essays/sardinian-giants'],
  draco: ['National History Museum of Romania · Dacian draco', 'https://www.mnir.ro/sectiunea-terra-dacorum/eu-basileul/'],
  ivriz: ['UNESCO · Ivriz wheat and grapes relief', 'https://whc.unesco.org/fr/listesindicatives/6244/'],
  arabia: ['Met · South Arabian bull sculpture', 'https://www.metmuseum.org/art/collection/search/328941'],
  pergamon: ['Berlin Münzkabinett · Pergamene cista and serpent', 'https://ikmk.smb.museum/object?id=18204058&lang=en'],
  syracuse: ['British Museum · Arethusa with four dolphins', 'https://www.britishmuseum.org/collection/object/C_1946-0101-1403'],
  ostrogothicBuckle: ['Met · Ostrogothic eagle buckle, 95.15.100a', 'https://www.metmuseum.org/art/collection/search/468991'],
  fibulaComparison: ['Walters Art Museum · Migration-period eagle fibula comparison', 'https://art.thewalters.org/object/54.423/'],
  sasanianCoin: ['British Museum · Fire altar and staff-bearing attendants', 'https://www.britishmuseum.org/collection/object/C_1930-0708-4'],
  himyarRelief: ['Paul Yule · Late Himyarite bird-of-prey reliefs from Zafar', 'https://archiv.ub.uni-heidelberg.de/propylaeumdok/111/1/Yule_Eagle2005.pdf'],
};

// [device identifier, drawing, interpretation, optional object reference]
const DESIGNS = {
  TYR: ['murex-shell', shell, 'A spined murex shell with its spiral, ribs and long siphonal canal; a reference to Phoenician purple production.', 'murex'],
  CRC: ['kubaba-pomegranate', pomegranate, 'A pomegranate with a lobed crown and visible seeds. An original device referring to Kubaba’s fruit attribute.'],
  ETR: ["etruscan-gorgoneion", FIGURE_REFINEMENTS.ETR, "A terracotta gorgoneion with curled hair, tusks and protruding tongue, after Etruscan architectural antefixes.", "gorgon"],
  ATH: ['athenian-owl', owl, 'A frontal owl with facial discs, patterned breast, talons and an olive sprig; a coin-inspired game composition.'],
  COR: ["corinthian-pegasus", FIGURE_REFINEMENTS.COR, "Pegasus in flight to the left, with extended forelegs, folded hind legs and layered wing feathers, following the Corinthian stater in Cleveland.", "pegasus"],
  CYR: ['cyrene-silphium', silphium, 'The branching silphium plant, including its flower umbels and paired leaves, after Cyrene’s coin types.', 'silphium'],
  TAR: ["taras-dolphin", FIGURE_REFINEMENTS.TAR, "A dolphin rider holding a trident, with the animal’s curved back and flukes retained; based on Tarentine coin types.", "dolphin"],
  LYD: ["lydian-lion-bull", FIGURE_REFINEMENTS.LYD, "Facing lion and bull foreparts, with the lion’s incised mane and the bull’s horn; an adaptation of Lydian coin imagery.", "lydia"],
  SRD: ['nuragic-tower', f => masonry(f,'nuraghe'), 'A battered Nuragic stone tower with projecting parapet, corbelled entrance and masonry courses. The tower model is an archaeological reference.', 'sardinia'],
  NUM: ["numidian-horse", FIGURE_REFINEMENTS.NUM, "A free horse with mane, raised foreleg and flowing tail. An original composition referring to Numidian equestrian culture."],
  AVN: ['gaulish-boar-standard', boar, 'A bristled boar on a standard, with curled tail and tusk. A regional La Tène analogy; its use by this particular court is invented.'],
  BOI: ['boian-bull', f => bull(f, false), 'A bull with short horns, muzzle and engraved forehead. An invented pastoral device, without a claim of a documented Boii banner.'],
  CIM: ['cimbrian-bull', f => bull(f, true) + r(45,75,6,9,bronze), 'A long-horned bull head mounted on a pole; an original interpretation of the bull associated with Cimbrian traditions.'],
  SEQ: ["boar-headed-carnyx", FIGURE_REFINEMENTS.SEQ, "A boar-headed carnyx with open jaws and tube joints. The Deskford reconstruction supplies a regional comparison, not evidence for a Sequani standard.", "carnyx"],
  DAC: ["dacian-draco", FIGURE_REFINEMENTS.DAC, "A wolf-headed draco with open jaws, ribbed windsock and standard pole. An original drawing of the regional military motif.", "draco"],
  GBA: ["bactrian-elephant", FIGURE_REFINEMENTS.GBA, "An elephant with an Asian elephant’s small folded ear, separated legs, tusk and pendant bell. The head motif occurs on Bactrian coinage; this complete animal composition is invented.", "bactria"],
  ELA: ['elamite-serpent', f => l('M24 72C78 91 84 55 51 55C16 55 16 32 43 30L59 29',gold,9)
    + p('M54 22 68 20 76 27 67 35 54 34Z',ivory)+c(66,25,1.4,f)
    + l('M27 73 28 79M37 76 37 82M48 76 49 82M60 72 64 78M67 63 74 65M63 58 66 53M49 54V59M35 50 31 56M29 42 23 42M33 33 30 28M43 30V25M63 31H71',f,1.3),
    'A coiled serpent with a shaped head and segmented body. Elamite snake-throne imagery supplies the association; this banner is an invention.', 'elam'],
  AXM: ['aksum-palace-stele', f => p('M34 82V25Q34 11 48 11Q62 11 62 25V82Z',ivory)
    + repeat(6,i=>r(38,28+i*7,7,4,f)+r(51,28+i*7,7,4,f)+l(`M35 ${26+i*7}H61`,bronze,1))
    + p('M42 82V71Q48 66 54 71V82Z',f)+l('M48 72V81M44 76H46',gold,1)+r(28,82,40,3,gold),
    'A palace-front stele with recessed window tiers and a false door, based on Aksum’s monumental stelae. Later surviving monuments serve as a retrospective court motif.', 'aksum'],
  KSH: ['meroitic-pyramids', f => p('M13 77 33 23 52 77Z',ivory)+p('M34 77 56 30 78 77Z')
    + p('M57 77 72 43 86 77Z',bronze)+l('M33 24V76M56 31V76M72 44V76',f,1)
    + r(27,65,13,12,bronze)+p('M25 65 33 58 42 65Z')+r(31,67,4,10,f)
    + c(60,18,7)+ring(60,18,4,f,1)+l('M13 81H85',ivory),
    'Steep Meroitic pyramids with a small entrance chapel and solar disc. The later royal cemetery is a retrospective regional motif for the court.', 'meroe'],
  AED: ['aeduan-torc', f => torc(f, true), 'A twisted torc with spiral terminals and engraved collar. Regional metalwork supplies the visual vocabulary; the Aeduan assignment is a game invention.'],
  GLT: ['galatian-torc', f => torc(f, false), 'A heavy torc with faceted terminals, inset stones and twisted wire; an invented Galatian court device.'],
  IBE: ['iberian-falcata', f => sword(f,true)+l('M19 76Q12 48 22 29M77 76Q84 48 74 29',gold,1), 'An inward-curving falcata with a ribbed grip and engraved blade. A regional weapon adapted as an original standard.'],
  CTB: ['celtiberian-caetra', f => spear(-27)+g(sword(f,true),'rotate(27 48 48)')+caetra(f,1), 'A caetra with boss and curvilinear decoration over a falcata and spear; an invented composition of regional arms.'],
  LUS: ['lusitanian-caetra', f => spear(-32)+spear(32)+caetra(f), 'A round caetra over crossed javelins, with rim rivets and a raised boss; a regional arms composition for the game.'],
  NOR: ['noric-ironwork', f => g(sword(f),'translate(0 -5)')+p('M17 61H79L69 70H56V77H66V83H30V77H40V70H24Z',gold)
    + l('M28 66H66M44 73H52M35 80H61',f,1.4), 'A forged blade above an anvil, retaining its fuller, guard and grip. An invented device referring to Noricum’s ironworking.'],
  THR: ['thracian-pelta', f => spear(-28)+spear(28)+p('M21 39C28 24 68 24 75 39L68 69C61 55 53 58 48 68C43 58 35 55 28 69Z',ivory)
    + l('M25 41Q48 26 71 41L66 58Q55 49 48 60Q41 49 30 58Z',bronze,2)+c(48,45,5,gold)+ring(48,45,3,f), 'A crescent-edged pelta over two javelins, with a rim and central boss. This is a military object, rather than a lunar badge.'],
  SCO: ['scordiscian-thureos', f => spear(-25)+p('M35 16H61Q72 48 61 80H35Q24 48 35 16Z',ivory)
    + l('M37 20H59Q68 48 59 76H37Q28 48 37 20ZM48 22V74',bronze,2)+p('M44 38H52L58 48 52 58H44L38 48Z')+ring(48,48,5,f), 'An elongated thureos with spine, boss and rolled rim, accompanied by a spear. A regional military analogy adapted for this court.'],
  CHA: ['chatti-shield-spade', f => p('M19 21Q35 15 49 21V68Q35 82 19 68Z',ivory)+l('M24 25Q35 20 44 25V65Q35 75 24 65ZM34 25V67',bronze,1.5)
    + c(34,44,7)+ring(34,44,4,f)+l('M67 17V58',gold,3)+p('M58 57H76L73 78Q67 84 61 78Z',bronze)+l('M62 61H72M67 62V76',ivory,1.2), 'An oval-topped shield with boss beside an iron spade. An invented Chatti device drawing on descriptions of military fieldworks.'],
  DLM: ['delmatae-hillfort', f => p('M14 80 48 18 82 80Z',bronze)+p('M21 76 29 56H67L75 76Z',ivory)
    + l('M25 67H71M31 59 33 65M41 58V65M55 58V65M65 59 63 65M29 69 28 75M40 69V75M57 69V75M68 69 69 75',f,1.1)
    + p('M42 78V68Q48 59 54 68V78Z',f)+l('M34 48 48 29 59 48',gold,1.5), 'Terraced dry-stone walls on a rocky hill, with an inset gateway. An original evocation of a Delmatae hillfort.'],
  DRD: ['dardanian-watchtower', f => masonry(f,'watchtower')+l('M17 84 27 80M69 80 79 84',ivory,1.5), 'A stone watchtower with an arched entrance, jointed masonry and flanking earthworks; an invented territorial device.'],
  AMO: ['rabbah-citadel', f => masonry(f)+c(48,18,4), 'Rabbah’s citadel interpreted as a jointed stone gateway with a solar finial. The arrangement and colours are invented.'],
  CHO: ['chorasmian-oasis', f => masonry(f,'oasis')+l('M40 26V20H56V26M48 20V34',gold,2), 'A broad mud-brick oasis citadel with bastions, a pointed entrance and an invented royal finial; a regional architectural device.'],
  FRS: ['frisian-terp', f => p('M14 70Q48 45 82 70Z',bronze)+p('M30 58V40L48 24 66 40V58Z',ivory)
    + p('M24 42 48 18 72 42 67 46 48 29 29 46Z')+r(44,44,8,14,f)
    + l('M35 43V55M39 39V55M57 39V55M61 43V55M26 64Q48 54 70 64',f,1)+wave(76)+wave(83,gold), 'A timber house on an artificial dwelling mound, above two tide lines. An invented device referring to Frisian terp settlements.'],
  ARO: ['venetic-leather-sail', f => ship(f,'leather'), 'A square leather sail with stitched panels, rigging and a deep merchant hull. An original reference to Venetic Atlantic shipping.'],
  MAS: ['massaliot-galley', f => ship(f), 'A fully rigged galley with an eye at the prow, bronze ram and planked hull. An original maritime court device.'],
  SCN: ['suionian-oared-ship', f => ship(f,'oared'), 'A double-ended oared hull with raised stems, thole positions and visible planking. A game interpretation of northern ship traditions.'],
  CHX: ['characene-merchantman', f => ship(f,'merchant'), 'A broad square-rigged merchantman with rigging and a planked hull. A game device referring to Characene’s Gulf trade.'],
  OMA: ['omani-lateen-ship', f => ship(f,'lateen'), 'A lateen-rigged trading ship, with seams, stays and a curved hull. A retrospective maritime motif, rather than evidence for this rig in every chapter.'],
  VAN: ['vandal-mediterranean-ship', f => ship(f,'merchant')+p('M45 36H51V41H56V47H51V52H45V47H40V41H45Z',f), 'A Mediterranean merchant hull under a cross-bearing square sail. An invented device for the Vandal court in Africa.'],
  TRT: ['tartessian-vessel', f => ship(f,'oared')+c(48,28,9)+ring(48,28,6,f,1.5), 'A trading vessel beneath a repoussé-style solar disc. An invented maritime and metalworking composition for Tartessos.'],
  BIT: ['bithynian-galley', f => ship(f)+p('M43 28 48 21 53 28 51 35H45Z',red), 'A galley with a red royal pennon, open rigging and a ram. A game composition distinguishing Bithynia’s maritime court.'],
  PAR: ['arsacid-archer', f => bow(f,'recurve')+l('M62 57V80M62 80 72 74M61 68H75',bronze,3), 'A recurved composite bow, drawn string and arrow, with a seat-like support referring to the seated archer of Arsacid coins.'],
  QDR: ['qedar-bow', f => bow(f,'simple')+l('M59 61 64 81M64 81 74 78M63 65 71 64',bronze,3), 'A large drawn bow with a wrapped grip, arrow and quiver. An original device referring to Qedar’s archery traditions.'],
  ITU: ['ituraean-archery', f => bow(f,'recurve')+p('M62 59 75 57 77 79 65 82Z',bronze)+l('M65 58 63 51M70 57V49M74 57 77 50M65 68 75 66',ivory,1.4), 'A mountain archer’s composite bow and leather quiver, with individual arrow shafts. An invented Ituraean standard.'],
  SCY: ['scythian-gorytos', f => g(bow(f,'recurve'),'translate(-6 0)')+p('M62 36 76 40 70 79 58 76Z',bronze)
    + l('M65 36 67 23M70 37 73 25M74 39 79 28M62 45 73 48M61 52 71 55M60 63 69 66',ivory,1.3), 'A recurved bow beside a decorated gorytos bow-case and arrow shafts. The fitted case distinguishes this regional arms composition.'],
  NOB: ['nubian-archery', f => bow(f,'simple')+g(bow(f,'simple'),'translate(96 0) scale(-1 1)')+c(48,48,4,bronze), 'Paired longbows and crossed arrows, an invented court composition referring to Nubian archery.'],
  BLM: ['blemmyan-camel-lances', f => spear(-25)+spear(25)+p('M54 16A12 12 0 1 0 65 35A15 15 0 0 1 54 16Z')
    + l('M37 60 59 60M39 64H57',bronze,2), 'Bound lances beneath a crescent. An invented desert-court device with shaped spearheads and ferrules.'],
  MDA: ['median-akinakes', f => sword(f)+mirror(p('M34 35Q21 33 21 44Q24 52 33 49L29 44Z',gold)), 'An akinakes-style short sword, with a fuller, shaped guard and paired scabbard mounts. A regional arms analogy, not an attested Median flag.'],
  SAK: ['saka-pointed-cap', f => p('M27 69Q37 50 38 34L48 12 57 34Q59 51 69 69Z',ivory)+p('M25 68H71V78Q48 85 25 78Z')
    + l('M48 18 48 66M31 65Q48 70 65 65M31 73H65',bronze,1.3)+repeat(7,i=>jewel(31+i*5.6,76,f)), 'A high pointed felt cap, with stitched seams and an appliqué band. An invented composition referring to Saka dress.'],
  PHR: ['phrygian-cap', f => p('M23 74C29 58 32 49 32 36C32 21 47 13 64 15C52 20 49 30 56 39C66 51 72 60 74 74Z',ivory)
    + p('M22 74H75V81H22Z')+l('M41 33C39 49 49 59 59 67M29 72H68M28 77H69',bronze,1.5), 'A soft forward-folded cap with a stitched brim and curved fabric seams, treated as a regional dress motif.'],
  SAB: ['sabaean-bull', f => bull(f,true)+c(48,15,4,gold), 'A long-horned bull head with muzzle and incised facial planes. An original South Arabian religious-art analogy.', 'arabia'],
  HMY: ["himyarite-eagle", FIGURE_REFINEMENTS.HMY, "A hooked-beaked bird of prey with spread wings, inspired by reliefs from Zafar and its surroundings. The crown and crescent are game additions. The late or post-Himyarite reliefs provide a retrospective motif for earlier chapters.", "himyarRelief"],
  HDR: ['hadrami-incense-burner', f => altar(f,true), 'A moulded incense burner with pedestal, rim, coals and curling smoke, referring to Hadramawt’s incense trade.'],
  SAS: ["sasanian-fire-altar", FIGURE_REFINEMENTS.SAS, "A stepped fire altar between crowned attendants holding staffs, with garment folds, diadem ties and separate altar mouldings, after Sasanian drachm reverses.", "sasanianCoin"],
  ARM: ['artaxiad-tiara', f => tiara(f), 'A tall Artaxiad-inspired tiara with serrated crown, star, lappets, bead band and engraved panels.'],
  ADI: ['adiabene-royal-tiara', f => tiara(f,false)+c(48,46,3,ivory), 'A low royal tiara with lappets, inset roundel and jewelled band. An original court design, distinct from the Artaxiad crown.'],
  OST: ["ostrogothic-eagle-buckle", FIGURE_REFINEMENTS.OST, "A chased silver buckle plate with spiral ornament, garnet settings, loop and hooked eagle terminal, after the Met’s Ostrogothic buckle. The banner composition is invented.", "ostrogothicBuckle"],
  GEP: ["gepid-eagle-fibula", FIGURE_REFINEMENTS.GEP, "An eagle fibula with a hooked profile head, garnet compartments and pearl pendants. The Walters object is Visigothic and supplies a regional Migration-period comparison; its assignment to the Gepids is invented.", "fibulaComparison"],
  SAX: ['paired-seaxes', f => mirror(g(p('M36 35 44 35 44 68 35 81 33 67Z',ivory)+r(35,17,7,17,bronze)+r(31,32,15,4,gold)
    + l('M37 40V65M37 20H40M37 25H40M37 29H40',f,1), 'rotate(-16 48 48)')), 'Paired single-edged seaxes with angled tips, fullers and bound grips. A regional weapon composition, rather than later territorial heraldry.'],
  FRK: ['frankish-francisca', f => l('M39 36 30 82',bronze,6)+p('M37 33C29 22 40 13 54 16L71 27Q59 46 40 42Z',ivory)
    + l('M41 22Q54 18 65 28M41 37Q55 38 66 29M35 57 39 59M33 66 37 68M31 75 35 77',f,1.3), 'A single asymmetrical francisca throwing axe, with curved edge, socket and bound wooden haft.'],
  SLV: ['sclavene-axe-oak', f => l('M48 34 39 81',bronze,5)+p('M43 31 46 18 68 23 73 41 49 40Z',ivory)
    + l('M50 23 67 26 69 36M29 73 24 44',gold,1.8)+p('M26 60Q13 63 15 53L21 53 18 45 25 48 28 39 31 48 37 47 33 56 38 59Q34 65 26 60Z')
    + l('M24 49 27 59M47 34H66',f,1), 'A socketed broad axe beside a lobed oak sprig. An invented regional device; it does not assert a documented Sclaveni banner.'],
  AQT: ['aquitanian-oak', f => l('M48 82V27M48 50 30 33M48 61 67 44',bronze,3)+mirror(p('M45 43C33 46 30 41 33 36C22 39 20 32 25 28C18 23 25 18 32 22C32 12 41 14 43 23C52 21 52 31 46 33Z',ivory)
    + l('M31 23 42 37',bronze,1))+p('M50 62Q64 53 72 57Q78 65 66 69Q68 78 58 76Z')+l('M52 63 66 65',f,1), 'A branching oak with lobed leaves and incised veins. An invented landscape device for the Aquitanian court.'],
  AES: ['baltic-amber', f => l('M16 29Q48 70 80 29',ivory,1.5)+[24,35,48,61,72].map((x,i)=>p(`M${x-4} ${37+Math.sin(i*Math.PI/4)*13}l5-3 5 6-2 8-7 1-4-5Z`,i%2?gold:bronze)
    +l(`M${x-1} ${39+Math.sin(i*Math.PI/4)*13}l3 3`,ivory,1)).join('')+wave(76)+wave(83,gold), 'Irregular amber beads on a curved cord above Baltic waves. An invented trade device, replacing the unrelated star.'],
  BRT: ['british-la-tene-bronze', f => c(48,48,32,bronze)+ring(48,48,30,gold,2)+repeat(3,i=>g(l('M48 48C27 45 24 25 40 24C54 23 57 40 44 40C37 39 40 32 44 33',ivory,3.5),`rotate(${i*120} 48 48)`))
    +c(48,48,4,gold)+repeat(12,i=>g(c(48,20,1,f),`rotate(${i*30} 48 48)`)), 'A La Tène-inspired bronze roundel with three curling arms, inlaid terminals and rim rivets. A regional art analogy.'],
  HIB: ['hibernian-triple-spiral', f => repeat(3,i=>g(l('M48 48C32 44 29 30 39 22C52 13 69 25 64 38C61 48 48 47 46 38C44 32 52 28 55 33Q58 38 53 39',gold,3),`rotate(${i*120} 48 48)`))
    +c(48,48,3,ivory), 'Three coiling spirals with retained inner turns. An invented court adaptation of much older Irish monumental ornament, rather than an Iron Age flag.'],
  CAL: ['pictish-crescent-vrod', f => p('M17 37Q48 61 79 37Q78 71 48 74Q18 71 17 37Z',ivory)
    +l('M24 47Q48 63 72 47Q65 76 42 66M34 54Q37 70 46 66M62 56Q57 73 51 67',bronze,1.5)
    +l('M21 20 48 59 75 20',gold,3)+mirror(p('M21 20 14 26 17 13 29 15Z',gold)), 'A decorated crescent crossed by a V-rod, following later Pictish symbol stones. Used retrospectively for this court across its earlier chapters.'],
  SUE: ['suebian-hair-knot', f => p('M31 78C19 67 20 45 26 31C33 16 52 13 63 25C72 34 69 47 59 50C48 54 40 44 45 36C50 28 61 35 56 41C53 45 49 41 51 39C45 48 60 53 65 42C71 25 48 17 38 33C28 50 44 59 53 61L49 79Z',gold)
    +l('M34 74C25 59 27 39 39 26M40 75C29 55 37 46 37 38M37 57 46 73M49 23Q67 28 62 40',f,1.4), 'A coiled and tied lock of hair with individual incised strands, referring to the Suebian knot described in ancient ethnography.'],
  CHE: ['cheruscan-broken-standards', f => l('M24 26V81M72 26V81M48 26V48L40 57M51 59 58 81',bronze,3)
    +[24,48,72].map(x=>g(p('M40 28 31 19 33 34 43 33 48 40 53 33 63 34 65 19 56 28 51 20 45 20Z')+c(48,18,3,ivory),'translate('+(x-48)+' 0)')).join('')
    +l('M42 48 48 52 47 59',ivory,1.5), 'Three eagle standards with a broken central staff. An invented narrative device referring to Rome’s losses in the Teutoburg Forest.'],
  VEN: ['venedae-forest', f => mirror(p('M30 25 16 45H23L12 61H23V80H30V61H40L33 45H41Z',bronze))
    +p('M48 13 34 34H41L28 53H38L25 69H44V83H52V69H71L58 53H68L55 34H62Z',ivory)
    +l('M48 26V77M40 43 48 48 56 43M37 58 48 64 59 58',gold,1.5), 'A stand of conifers with branches, trunks and incised needle planes. An invented landscape device for a poorly attested court identity.'],
  GRM: ['garamantian-chariot', f => ring(29,67,12,ivory,3)+ring(67,67,12,ivory,3)
    +[29,67].map(x=>c(x,67,3)+repeat(8,i=>g(l(`M${x} 55V64`,gold,1.2),`rotate(${i*45} ${x} 67)`))).join('')
    +p('M28 49H62L68 60H33Z',bronze)+l('M33 49V31H54M62 53 77 39M44 32 48 46M54 24V39',gold,2)
    +c(51,21,4,ivory)+l('M36 81H72',ivory,1), 'A two-wheeled chariot with visible spokes, platform and driver. An original composition referring to Saharan chariot imagery.'],
  MAU: ['mauretanian-atlas', f => p('M13 78 32 45 43 60 58 32 83 78Z',bronze)+p('M48 49 58 32 68 51 58 46Z',ivory)
    +p('M37 14A14 14 0 1 0 48 37A17 17 0 0 1 37 14Z')+l('M20 77 32 53 35 66M51 76 60 55 74 76',ivory,1.5)+wave(84,gold), 'The Atlas mountains beneath a crescent and above the sea. An invented geographic composition for Mauretania.'],
  CMG: ['commagene-sanctuary', f => p('M15 81 36 47 48 31 62 53 81 81Z',bronze)+star(48,20,8,9,4)
    +[29,48,67].map((x,i)=>p(`M${x-5} ${68-i%2*8}v-7q5-8 10 0v7l4 11h-18Z`,ivory)+r(x-7,77,14,4,gold)+l(`M${x-3} ${65-i%2*8}h6`,f,1)).join('')
    +l('M18 84H78',ivory,1), 'A mountain sanctuary with seated monumental figures beneath a star. An invented interpretation of Commagene’s royal mountain cult.'],
  BGD: ['burgundian-lawbook', f => p('M19 39Q35 31 48 40Q61 31 77 39V78Q61 71 48 81Q35 71 19 78Z',ivory)
    +l('M48 41V77M24 43Q35 38 43 43M53 43Q64 38 72 43M25 50H42M25 56H42M25 62H42M54 50H71M54 56H71M54 62H71',bronze,1.3)
    +p('M30 27 27 16 39 23 48 12 57 23 69 16 66 27Z')+r(30,28,36,4,gold)+repeat(5,i=>c(34+i*7,29.5,1,f)), 'A bound lawbook beneath a jewelled diadem, referring to the Burgundian law code. The combined standard is invented.'],
  VIS: ['visigothic-votive-crown', f => l('M48 13 26 40M48 13V36M48 13 70 40',ivory,1.3)+c(48,13,3)
    +p('M23 38Q48 30 73 38V56Q48 66 23 56Z')+l('M27 40Q48 35 69 40M27 54Q48 61 69 54',bronze,1.1)
    +repeat(7,i=>jewel(29+i*6.3,46, i%2?red:ivory))
    +[29,39,48,57,67].map((x,i)=>l(`M${x} 60V${72+i%2*5}`,ivory,1.2)+jewel(x,75+i%2*5,ivory)).join(''),
    'A suspended votive crown with chains, gem settings and pendants. Later Visigothic sacred metalwork serves as a retrospective court motif.'],
  LMB: ['lombard-panel-crown', f => p('M18 34Q48 24 78 34V67Q48 77 18 67Z')+l('M20 36Q48 27 76 36M20 65Q48 74 76 65',ivory,1.4)
    +repeat(6,i=>r(21+i*9.2,38,7.5,25,bronze)+jewel(25+i*9.2,50,i%2?ivory:red)+c(25+i*9.2,41,1,ivory)+c(25+i*9.2,60,1,ivory))
    +l('M20 32Q48 20 76 32',ivory,1.4), 'A segmented gold crown with gem-set panels and an inner band. A retrospective Iron Crown reference; its exact early history is disputed.'],
  AVA: ['avar-horsetail-standard', f => l('M48 17V83',gold,3)+ring(48,20,7,ivory,2)
    +mirror(p('M45 29C31 33 29 44 33 59L23 74Q41 70 43 51L46 38Z',bronze)+l('M40 34Q31 48 29 64M43 35Q38 54 33 65',ivory,1))
    +r(42,28,12,4,gold)+jewel(48,31,red), 'A horse-tail standard with a ring finial, binding and individual hanging strands. An invented steppe court device.'],
  TRK: ["ashina-wolf-standard", FIGURE_REFINEMENTS.TRK, "A wolf-head finial above a composite bow, with ears, jaws and staff bindings. An original device referring to Ashina wolf traditions."],
  BGR: ['bulgar-tamga-fitting', f => p('M25 18 20 24V73L25 79 30 73V24ZM66 24 71 18 76 24V73L71 79 66 73Z',ivory)
    +l('M37 24 48 42 59 24M48 42V76',gold,5)+jewel(48,57,red)+l('M24 28V68M72 28V68',bronze,1), 'The IYI-shaped mark interpreted as an engraved metal fitting. Its meaning and specific dynastic attribution remain uncertain; this is an invented standard.'],
  SRM: ['sarmatian-ring-tamga', f => ring(48,30,13,ivory,4)+l('M48 43V70M48 62 28 80M48 62 68 80',gold,4)
    +l('M23 21 23 70M73 21V70',bronze,2)+p('M23 13 28 24H18ZM73 13 78 24H68Z',ivory)+jewel(48,30,red), 'A ring-headed tamga between two lances. An original clan-mark composition, without asserting a single emblem for all Sarmatians.'],
  HEP: ['hephthalite-crescent-tamga', f => l('M48 16V78M27 26V39Q27 49 48 49Q69 49 69 39V26',ivory,4)
    +p('M32 65Q48 80 64 65Q60 88 48 85Q36 88 32 65Z')+star(48,25,6,7,3,bronze)
    +mirror(c(27,24,4,gold)+l('M24 56H30',gold,1.4)), 'A branched tamga above a crescent, with coin-like terminal pellets. An invented composition inspired by regional coin marks.'],
  RSH: ['early-islamic-liwa', f => l('M29 14V83',bronze,3)+p('M31 22H78L70 36 78 51H31Z',ivory)
    +l('M34 25H70M34 48H70M29 59 40 67 36 81',gold,1.6)+c(29,14,3), 'A plain light-coloured liwa on a lance with ties. An original interpretation; early reports do not establish a single standardized state flag.'],
  GHA: ['ghassanid-cross-pennon', f => l('M31 16V83',bronze,3)+p('M33 27H78L65 40 78 54H33Z',ivory)
    +p('M47 32H53V38H60V44H53V50H47V44H40V38H47Z',f)+p('M28 14 34 14 34 20H40V26H34V32H28V26H22V20H28Z')
    +l('M31 60 47 67 40 81',gold,1.6), 'A cross finial and cross-bearing lance pennon with trailing ties. An invented Christian Arab court composition.'],
  LKH: ['lakhmid-hira-palace', f => masonry(f,'palace')+p('M43 17H53L48 12Z',ivory)+l('M42 18H54M48 12V23',gold,1.8), 'An arcaded palace at al-Hira with a cross-like roof finial. An invented late antique Arab court device, replacing the generic crescent and star.'],
  GOT: ['gothonic-ring-spear', f => spear()+ring(48,53,9,gold,3)+l('M48 44V62M41 47 55 59M41 59 55 47',bronze,1)+jewel(48,27,red), 'A leaf-shaped spearhead above a ring fitting, with binding and inset ornament. An invented regional military device.'],
  BLG: ['belgic-spear-bundle', f => spear(-17)+spear()+spear(17)+r(35,61,26,5,gold)+l('M37 62 40 65M43 62 46 65M49 62 52 65M55 62 58 65',f,1), 'Three differently angled javelins with leaf blades and a bound crosspiece. An invented Belgic military composition.'],
  PLS: ['philistine-feather-headdress', f => repeat(7,i=>g(p('M44 48 42 24 46 14 50 24 49 48Z',ivory)+l('M46 22V43',bronze,.9),`rotate(${(i-3)*10} 48 58)`))
    +p('M24 49Q48 44 72 49L69 61H27Z')+l('M29 51Q48 48 67 51M29 57H67',f,1.4)
    +p('M27 60H36L33 79 26 75ZM60 60H69L70 75 63 79Z',bronze), 'A feathered headdress with a patterned band and cheek pieces, referring to Egyptian depictions associated with the Peleset. The identification does not establish a historical flag.'],
  MOB: ['mesha-stele', f => p('M26 82V34Q26 13 48 13Q70 13 70 34V82Z',bronze)+l('M30 80V34Q30 18 48 18Q66 18 66 34V80Z',gold,1.5)
    +repeat(9,i=>repeat(7,j=>l(`M${33+j*4.5} ${31+i*5}l${(i+j)%2?2:-1} 3m-2-1h3`,ivory,.65))), 'A rounded basalt stele with nine bands of inscription-like incisions. The marks suggest epigraphy and do not pretend to transcribe the Mesha text.'],
  EDM: ['edomite-sela', f => p('M15 81 27 28 40 18 49 48 61 26 73 37 82 81Z',bronze)
    +p('M28 29 40 18 43 51 36 76H24ZM61 26 64 61 72 76 77 76 71 38Z',ivory)
    +l('M30 41 34 31M28 53 31 46M55 68 60 46M44 63 50 56M18 83H81',gold,1.4), 'Split sandstone cliffs with a narrow cleft, ledges and cut rock planes. An invented geographic device referring to Sela and Edomite highlands.'],
  HMT: ["hamath-winged-solar-device", FIGURE_REFINEMENTS.HMT, "A solar disc between layered feathered wings and a pendant tail in a Syro-Anatolian relief idiom. An invented regional composition for Hamath."],
  URA: ['urartian-sacred-tree', f => l('M48 82V18',bronze,4)+repeat(4,i=>mirror(g(l('M47 44 32 35 27 26',gold,2)+p('M27 27C18 26 17 17 22 15C23 21 27 21 27 27ZM30 30C29 20 36 17 40 21C34 22 34 28 30 30Z',ivory),`translate(0 ${i*14})`)))
    +p('M48 14C35 22 38 31 48 35C58 31 61 22 48 14Z')+l('M48 19V29',f,1)+r(33,82,30,3,gold), 'A tiered sacred tree with palmettes, curling side branches and a stepped foot. A regional Urartian art analogy, rather than a generic conifer.'],
  TAB: ['ivriz-grain-grapes', f => l('M32 81V24M33 62 57 39M57 79V30',gold,2.2)+repeat(5,i=>g(mirror(p('M47 42C35 40 38 32 40 29C46 31 48 36 47 42Z',ivory)+l('M40 33 46 40',bronze,.55)),`translate(-16 ${i*8})`))
    +repeat(4,i=>repeat(4-i,j=>c(53+j*6+i*3,46+i*6,3,bronze)))+l('M54 32C64 17 79 29 70 35C63 39 62 29 68 28',ivory,1.5), 'A grain ear and grape bunch with individual kernels, berries and a vine tendril, referring to the Ivriz relief’s agricultural imagery.', 'ivriz'],
  DMS: ['hadad-forked-thunderbolt', f => l('M48 25V80M48 47 28 34V18M48 47 68 34V18',gold,4)
    +mirror(p('M24 13 32 13 32 28 26 37 18 33 25 27Z',ivory))+p('M44 13H52V30L48 36 44 30Z',ivory)
    +l('M36 60H60M39 65H57M42 70H54',bronze,2), 'A three-pronged storm weapon with branched lightning and a bound grip, referring to Hadad’s storm-god imagery.'],
  PNT: ['pontic-star-crescent', f => p('M41 13A30 30 0 1 0 77 65C49 77 26 39 41 13Z')+star(61,33,8,15,5,ivory)
    +l('M29 28C18 52 33 77 58 76M29 35C24 51 31 67 42 71',bronze,1.4), 'A many-rayed star beside a narrow crescent, with engraved inner arcs, following Pontic royal coin motifs.'],
  OSR: ['edessan-crescent', f => p('M39 17A29 29 0 1 0 74 70C40 75 23 39 39 17Z',ivory)+star(62,36,6,12,5)
    +l('M26 34Q18 60 47 75',bronze,2)+r(45,78,23,3,gold), 'An Edessan-inspired crescent and six-rayed star with a short ground line. An original coin-derived composition.'],
  PRG: ['pergamene-cista', f => p('M28 42Q48 35 68 42V73Q48 83 28 73Z',bronze)+ring(48,41,20,ivory,2)
    +l('M31 48H65M31 54H65M31 60H65M31 66H65M36 45V74M43 44V76M51 44V76M59 45V74',gold,1)
    +l('M48 38C29 29 46 17 58 25C72 35 53 49 43 32',ivory,3)+p('M40 29 46 26 49 31 45 35Z',ivory)+c(45,30,1,f)
    +p('M24 27 19 19 28 22 31 16 33 27Z'), 'A woven cista mystica with a curling serpent and ivy leaf, referring to Pergamene cistophoric coin imagery.', 'pergamon'],
  SYC: ['syracusan-arethusian-dolphins', f => ring(48,48,22,gold,2)+repeat(4,i=>g(p('M35 19C46 11 59 15 64 25L70 22 67 29 71 35 63 33C55 41 43 30 37 31L40 27Z',ivory)
    +c(42,22,1,f),`rotate(${i*90} 48 48)`))+c(48,48,7,bronze)+star(48,48,8,5,2,ivory), 'Four dolphins around a central water roundel, referring to the dolphin surrounds of Syracusan coinage. An original composition.', 'syracuse'],
  MIL: ["milesian-lion-star", FIGURE_REFINEMENTS.MIL, "A lion forepart beside a stellate device, referring to Milesian coin imagery, with the mane and open jaw retained."],
  SPT: ['spartan-shield', f => caetra(f)+p('M45 30H51L65 66H58L48 40 38 66H31Z',f), 'A bronze-rimmed shield bearing lambda, with boss and rivets. Lambda is a later Classical convention used retrospectively for early chapters.'],
  CRT: ['cretan-labyrinth', f => r(17,17,62,62,bronze)+l('M22 74V22H74V74H34V34H62V62H46V46H50V54H54V42H42V66H66V30H30V70H70V26H26V74',ivory,2)
    +c(19,80,2,gold)+c(77,16,2,gold), 'A square labyrinth with multiple continuous turns, inspired by Cretan coin types. The complete path remains visible when enlarged.'],
  MAC: ['macedonian-sun', f => rays(16,15,34)+c(48,48,13,gold)+ring(48,48,10,f,1.2)
    +repeat(8,i=>g(p('M48 38Q40 43 48 47Q56 43 48 38Z',ivory),`rotate(${i*45} 48 48)`))+c(48,48,3,bronze), 'A sixteen-rayed sun with an engraved floral centre. A Macedonian royal-art reference adapted to a game standard.'],
  GRC: ['hellenic-laurel', f => mirror(l('M47 81C23 69 18 40 33 17',gold,2.2)+repeat(6,i=>g(p('M29 66Q15 61 20 51Q30 56 29 66ZM29 66Q32 52 40 54Q39 65 29 66Z',ivory)
    +l('M24 57 29 64 36 58',bronze,.8),`rotate(${i*14} 48 48)`)))+l('M39 80 48 75 57 80',gold,2), 'A laurel wreath with separate leaves, veins and tied stems. An invented common Hellenic device; modern Greece keeps its separate era flag.'],
};

export function enrichCourtStandards(flags) {
  for (const [tag, [emblem, draw, note, source]] of Object.entries(DESIGNS)) {
    const prior = flags[tag];
    if (!prior?.fieldColor) throw new Error(`Detailed court standard has no base field: ${tag}`);
    const refined = FIGURE_REFINEMENTS[tag];
    const [dx, dy] = refined ? (({ GBA: [0,-5.5], DAC: [0,-5.8], HMT: [0,-5.4] })[tag] || [0, 0]) : (({ ATH: [8, -2.5], SEQ: [-7, -1.5], AES: [0, -9], SCN: [0, -9],
      TRT: [0, -5], DAC: [0, -5.2], GEP: [0, -4.8], SAB: [0, 4.8], AVN: [0, -6] })[tag] || [0, 0]);
    flags[tag] = { ...prior, emblem, note, source: source ? STANDARD_SOURCES[source] : null, detailed: true,
      body: r(0,0,96,96,prior.fieldColor) + `<g data-emblem="${emblem}" transform="translate(${dx} ${dy})">${draw(prior.fieldColor)}</g>` };
  }
}
