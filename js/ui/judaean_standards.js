// Original game standards adapted from specific Judaean coin types.
// The 192-unit masters retain every path at every display size. Colours,
// borders and combinations of obverse/reverse devices are game choices.
const G = '#f2c75b', I = '#f4e6be', B = '#bd8847', D = '#654524', S = '#d5e2e7';
const p = (d, fill = G) => `<path d="${d}" fill="${fill}"/>`;
const l = (d, ink = B, width = 1.2) => `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const c = (x, y, radius, fill = G) => `<circle cx="${x}" cy="${y}" r="${radius}" fill="${fill}"/>`;
const rect = (x, y, w, h, fill = G) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
const group = (body, transform) => `<g transform="${transform}">${body}</g>`;
const mirror = body => body + group(body, 'translate(192 0) scale(-1 1)');
const repeat = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');
const master = body => group(body, 'scale(.5)');

export const JUDAEAN_COIN_SOURCES = {
  hasmonean: ['British Museum · Hasmonean double cornucopia and pomegranate', 'https://www.britishmuseum.org/collection/object/C_1908-0110-103'],
  herod: ['British Museum · Herod’s helmet and tripod coin', 'https://www.britishmuseum.org/collection/object/C_1908-0110-263'],
  antigonus: ['Jewish Museum · Mattathias Antigonus menorah prutah, X1968-1', 'https://collections.thejewishmuseum.org/collection/26737-coin-prutah-of-king-mattathias-antigonus'],
  antipas: ['Oxford RPC I 4918 · Antipas reed and Tiberias wreath', 'https://rpc.ashmus.ox.ac.uk/coins/1/4918'],
  philip: ['British Museum · Philip’s tetrastyle temple coin', 'https://www.britishmuseum.org/collection/object/C_1947-0606-1273'],
  agrippa: ['Oxford RPC I 4989 · Agrippa II’s Neronian wreath type', 'https://rpc.ashmus.ox.ac.uk/coins/1/4989'],
  revolt: ['Walters 59.518 · First Revolt shekel with chalice', 'https://art.thewalters.org/object/59.518/'],
  lulav: ['Zissu et al. · Meʿarat Ha-Teʾomim zuz finds, nos. A33–A42', "https://www.researchgate.net/publication/285890131_Coins_from_the_Bar_Kokhba_Revolt_Hidden_in_Me'arat_Ha-Te'omim_Mugharet_Umm_et_Tueimin_Western_Jerusalem_Hills"],
};

function beads(radius = 77, n = 56, ink = G) {
  return repeat(n, i => {
    const a = i * 2 * Math.PI / n;
    return c(96 + Math.cos(a) * radius, 96 + Math.sin(a) * radius, 1.4, ink);
  });
}

function wreath(ink = G, accent = B) {
  const stem = l('M92 164C54 155 34 127 38 96C37 64 55 41 80 26', ink, 2.8);
  const leaves = repeat(13, i => {
    const a = (25 + i * 130 / 12) * Math.PI / 180;
    const x = 96 - 58 * Math.sin(a), y = 96 + 70 * Math.cos(a);
    const angle = Math.atan2(-70 * Math.sin(a), -58 * Math.cos(a)) * 180 / Math.PI + 90;
    return group(p('M0 0C-13-2-15-12-13-17C-5-14-1-7 0 0Z', ink)
      + p('M0 0C10-4 14-11 12-17C5-13 1-7 0 0Z', ink)
      + l('M-11-13-1-2M10-13 1-2', accent, .85), `translate(${x} ${y}) rotate(${angle})`);
  });
  return mirror(stem + leaves)
    + p('M90 158 84 171 93 167 96 159 99 167 108 171 102 158Z', ink)
    + l('M89 158Q96 154 103 158M92 161 87 167M100 161 105 167', accent, 1.1);
}

function cornucopias(field, withWreath) {
  const horn = p('M88 151C63 146 44 131 38 110C31 88 38 65 45 53L66 62C52 81 48 104 57 122C64 136 75 143 88 151Z')
    + p('M40 49 68 59 65 70 36 60Z', I)
    + l('M43 53 63 61M40 58 62 66M45 73C35 100 43 125 64 139M49 79C43 103 48 122 64 133M53 89C48 106 53 125 70 138', D, 1.2)
    + repeat(6, i => l(`M${41 + i * 1.8} ${79 + i * 8}q7 6 ${15 + i} 5`, B, 1.15))
    + p('M45 54C31 47 34 31 43 27C51 34 53 43 50 54Z', I)
    + p('M51 56C47 43 56 30 66 33C68 44 61 52 54 58Z', G)
    + c(57, 46, 4.5, I) + c(62, 48, 4, I) + c(59, 53, 4, I)
    + l('M43 33 47 49M62 36 55 51', B, .9)
    + p('M41 63C27 64 28 75 37 77L42 71C37 73 34 70 41 68ZM47 66C43 76 43 90 37 96L44 91 50 70Z', I)
    + l('M42 67Q30 69 36 74M47 72 42 87', B, .9);
  const fruit = p('M88 87 85 75 93 80 96 71 99 80 107 75 104 87C122 98 117 123 96 129C75 123 70 98 88 87Z', G)
    + l('M86 88Q96 93 106 88M84 98C79 110 87 120 92 122M99 96C108 103 108 115 102 120', B, 1.3)
    + l('M89 83 94 86H100L103 83', I, 1.1);
  const device = mirror(horn) + fruit;
  return withWreath ? wreath() + group(device, 'translate(28 28) scale(.7083333333333334)') : beads() + device;
}

function helmet(field) {
  const palms = mirror(l('M35 150C28 125 27 91 35 65', G, 2.4)
    + repeat(9, i => {
      const y = 75 + i * 7.5;
      return p(`M32 ${y}Q${15 + i * .7} ${y - 15} 19 ${y - 22}Q31 ${y - 14} 32 ${y}Z`, G)
        + p(`M32 ${y}Q43 ${y - 17} 44 ${y - 22}Q48 ${y - 8} 32 ${y}Z`, I)
        + l(`M23 ${y - 15} 31 ${y - 2}M42 ${y - 15} 34 ${y - 3}`, B, .7);
    }));
  const dome = p('M52 109C49 76 57 46 80 38C91 34 104 34 115 39C139 48 145 77 140 109Z', G)
    + p('M58 100C57 73 67 48 89 42C68 57 65 80 65 100Z', I)
    + l('M70 49C59 66 60 83 61 96M79 44Q103 35 120 51M125 55Q137 72 135 96M97 40V92', B, 1.2)
    + p('M51 99Q96 87 141 99L143 111Q96 101 49 112Z', I)
    + l('M54 103Q96 93 139 103M55 109Q96 100 138 109', D, 1.15)
    + repeat(13, i => {
      const x = 57 + i * 6.4, y = 102 - Math.sin(i * Math.PI / 12) * 5;
      return p(`M${x} ${y}q-3-8 1-9q5 3 2 8Z`, G) + l(`M${x + 1} ${y - 6}v5`, B, .6);
    });
  const cheeks = mirror(p('M55 113 78 109 81 139 70 150 54 144Z', G)
    + p('M59 117 69 115 73 137 65 142 59 139Z', I)
    + l('M56 113 60 143 70 148M73 115 76 138 70 144', D, 1.15)
    + c(64, 122, 1.6, B) + l('M68 149 72 163 84 165', G, 2.5));
  const star = p('M96 17 100 26 110 25 104 33 110 41 100 40 96 49 92 40 82 41 88 33 82 25 92 26Z', I)
    + c(96, 33, 3.4, G);
  return palms + dome + cheeks + star;
}

function antigonusMenorah() {
  const branches = [22, 44, 66].map(radius => l(`M${96 - radius} 54V64A${radius} ${radius} 0 0 0 ${96 + radius} 64V54`, G, 5.2)).join('');
  const cups = repeat(7, i => {
    const x = 30 + i * 22;
    return p(`M${x - 9} 41H${x + 9}L${x + 6} 53H${x - 6}Z`, G)
      + l(`M${x - 8} 43H${x + 8}M${x - 5} 50H${x + 5}`, I, 1.15)
      + l(`M${x - 8} 54H${x + 8}`, B, 1.25);
  });
  return branches + l('M96 52V139', G, 6)
    + [86, 106, 124].map(y => rect(90, y, 12, 3.2, I)).join('') + cups
    + p('M92 137H100L118 158 114 165H78L74 158Z', G)
    + l('M94 141 83 157H109L98 141M79 160H113M85 164H107', B, 1.15)
    + l('M31 59V65M53 59V65M75 59V65M117 59V65M139 59V65M161 59V65', I, 1);
}

function reed() {
  return wreath() + l('M96 151C94 112 97 70 101 31', G, 3.2)
    + p('M100 33C87 43 87 58 98 68C106 57 109 43 100 33Z', I)
    + l('M99 38 98 62M94 44 95 59M103 44 100 59', B, 1)
    + p('M96 104C74 96 63 76 61 60C80 65 91 85 96 104ZM96 128C111 99 130 88 140 88C133 108 116 123 96 128Z', G)
    + l('M64 66 92 99M135 92 101 123', B, 1.2)
    + [79, 102, 127, 145].map(y => l(`M92 ${y}h8`, I, 1.5)).join('');
}

function philipTemple(field) {
  const stone = S;
  const columns = [48, 76, 116, 144].map(x => rect(x - 5, 87, 10, 57, stone)
    + rect(x - 9, 79, 18, 5, G) + rect(x - 7, 84, 14, 4, stone)
    + rect(x - 8, 144, 16, 5, G)
    + l(`M${x - 2} 91V140M${x + 2} 91V140`, B, .9)
    + l(`M${x - 8} 81q-5-6-7-1t7 3M${x + 8} 81q5-6 7-1t-7 3`, stone, 1.4)).join('');
  return p('M26 64 96 25 166 64Z', stone)
    + p('M46 60 96 33 146 60Z', field)
    + l('M31 65H161M44 59 96 31 148 59', G, 1.7)
    + c(96, 48, 5.2, G) + c(96, 48, 2.3, field)
    + rect(28, 66, 136, 7, G) + rect(32, 74, 128, 5, stone)
    + repeat(20, i => rect(35 + i * 6.3, 73, 2, 3, B))
    + columns
    + c(96, 103, 8.3, G) + c(96, 103, 4.9, field)
    + rect(36, 150, 120, 6, stone) + rect(30, 157, 132, 6, G)
    + rect(24, 164, 144, 5, stone) + l('M40 152H152M33 159H159M28 167H164', B, .9);
}

// Vector letterforms for two exact excerpts from RPC I 4989. They are Greek
// abbreviations in the recorded legend, not a reconstructed full inscription.
const GREEK = {
  'Β': 'M1 16V0H6Q13 0 11 5L8 8Q14 9 12 13Q11 16 6 16Z M2 8H8',
  'Α': 'M0 16 6 0 12 16M3 10H9', 'Σ': 'M12 0H0L7 8 0 16H12',
  'Ι': 'M3 0H9M6 0V16M3 16H9', 'Λ': 'M0 16 6 0 12 16',
  'Ε': 'M12 0H0V16H12M0 8H10', 'Γ': 'M0 16V0H12',
  'Ρ': 'M0 16V0H7Q14 0 12 5Q11 8 7 8H0', 'Π': 'M0 16V0H12V16',
};
function greekWord(word, y) {
  return [...word].map((letter, i) => group(l(GREEK[letter], I, 1.8), `translate(${(192 - word.length * 17) / 2 + i * 17} ${y})`)).join('');
}
function agrippaWreath() {
  return wreath() + greekWord('ΒΑΣΙΛΕ', 77) + greekWord('ΑΓΡΙΠΠ', 103)
    + l('M62 98H130', G, .85);
}

function revoltChalice(field) {
  const bowl = p('M49 59H143C142 95 125 111 102 116H90C67 111 50 95 49 59Z', S)
    + l('M55 64C57 89 70 104 89 109M137 64C135 89 122 104 103 109M62 68Q96 77 130 68', B, 1.2)
    + rect(47, 54, 98, 7, I) + rect(46, 61, 100, 4, S)
    + repeat(12, i => c(51 + i * 8.2, 56, 2.4, G));
  const foot = p('M89 115H103V141Q115 145 131 146V153H61V146Q77 145 89 141Z', S)
    + l('M94 118V141M99 118V141M67 148H125', B, 1.2)
    + l('M70 153V160H122V153', I, 2.1)
    + rect(64, 160, 64, 4, G);
  return beads() + bowl + foot;
}

function lulav() {
  // Standalone palm frond of the silver zuz, not the temple/sela reverse or
  // the separate jug-and-branch type. No invented year or Hebrew legend.
  const leaf = p('M94 165C96 121 92 77 97 24C102 65 102 119 99 165Z', S)
    + l('M97 31V161', I, 1.2)
    + repeat(18, i => {
      const y = 42 + i * 5.7, width = 7 + Math.sin(i / 17 * Math.PI) * 24;
      return p(`M96 ${y + 8}Q${96 - width} ${y + 1} ${96 - width - 3} ${y - 8}Q${96 - width + 9} ${y - 4} 96 ${y + 3}Z`, S)
        + p(`M99 ${y + 8}Q${99 + width} ${y + 1} ${99 + width + 2} ${y - 7}Q${99 + width - 8} ${y - 4} 99 ${y + 3}Z`, S)
        + l(`M${96 - width + 2} ${y - 4} 95 ${y + 5}M${99 + width - 2} ${y - 3} 100 ${y + 5}`, B, .8);
    });
  return beads(76, 56, G) + leaf + rect(92, 150, 12, 3, G) + rect(92, 156, 12, 3, G);
}

function coinStandard(fieldColor, emblem, drawing, note, source) {
  return { viewBox: '0 0 96 96', flatBanner: true, fieldColor, emblem, note,
    detailed: true, source: JUDAEAN_COIN_SOURCES[source],
    body: rect(0, 0, 96, 96, fieldColor) + `<g data-emblem="${emblem}" transform="translate(0 0)">${master(drawing(fieldColor))}</g>` };
}

function inheritedStandard(base, fieldColor, kingdom) {
  const emblem = `${kingdom ? 'judaean-kingdom' : 'judaean-ethnarchy'}-${base.emblem}`;
  // Reuse the entire source device and its transforms. The border and field
  // identify the new court; no detail is removed from the inherited drawing.
  const drawing = base.body.slice(base.body.indexOf('<g data-emblem='));
  const border = kingdom
    ? `<path d="M7 19V7H19M77 7H89V19M89 77V89H77M19 89H7V77" fill="none" stroke="${G}" stroke-width="1.4"/>`
    : repeat(4, side => group(repeat(7, i => c(8 + i * 3.5, 7, .7, G)), `rotate(${side * 90} 48 48)`));
  return { ...base, fieldColor, emblem, detailed: true,
    note: `${kingdom ? 'Kingdom' : 'Ethnarchy'} of Judaea: the complete ${base.emblem === 'bar-kokhba-lulav-zuz' ? 'Bar Kokhba lulav-zuz device' : 'Judaean menorah'}, with an invented ${kingdom ? 'corner-band' : 'beaded-corner'} border. The source motif follows the founding chapter. ${base.note}`,
    body: rect(0, 0, 96, 96, fieldColor) + `<g data-emblem="${emblem}" transform="translate(0 0)">${drawing}${border}</g>` };
}

export function enrichJudaeanStandards(flags) {
  const designs = {
    HYR: ['hasmonean-cornucopias-wreath', f => cornucopias(f, true), 'Paired cornucopias, pomegranate, fruit and ribbon ties within a wreath. An invented Hasmonean-family arrangement for Hyrcanus II, not an attribution of this coin to him. The rival courts share a dynastic motif; personal coin attributions remain disputed.', 'hasmonean'],
    ARI: ['hasmonean-cornucopias-beads', f => cornucopias(f, false), 'Paired cornucopias with fruit, ribbons and a pomegranate, within a dotted coin border. An invented Hasmonean-family arrangement for Aristobulus II, not an attribution of an Aristobulus I coin to him.', 'hasmonean'],
    HER: ['herodian-helmet', helmet, 'A decorated helmet with cheekpieces, hanging straps, acanthus-like band, star and flanking palms, after Herod’s helmet-and-tripod coin. The coin’s regnal-year-three motif is used retrospectively for the 40 BCE opening; the banner colours and arrangement are invented.', 'herod'],
    ATG: ['antigonus-coin-menorah', antigonusMenorah, 'The seven-branched menorah with broad lamp cups and a conical foot, after Mattathias Antigonus’ 40–37 BCE prutah. Its base and sockets distinguish it from the stepped-base Judaean menorah. The coin legends are not reproduced.', 'antigonus'],
    HPA: ['antipas-reed-wreath', reed, 'A jointed reed with pointed leaves, inside a tied wreath. Combines the two sides of Antipas’ Tiberias coin, RPC I 4918, dated 20/21 CE; retrospective when the tetrarchy first appears in 4 BCE. Colours and the combined composition are game inventions.', 'antipas'],
    HPH: ['philip-coin-temple', philipTemple, 'Philip’s four-column temple on a high stepped platform, with column capitals, fluting, pediment and central round object. Based on his early-first-century coin type; retrospective when the tetrarchy first appears. This is not a claim that Philip used a Jerusalem Temple banner.', 'philip'],
    AGR: ['agrippa-neronian-wreath', agrippaWreath, 'A tied wreath with the exact Greek excerpts ΒΑΣΙΛΕ / ΑΓΡΙΠΠ from the longer royal legend of RPC I 4989, under Nero. The excerpt arrangement is invented. This Neronian type suits the 66 CE chapter; later Flavian Victory coins are not used.', 'agrippa'],
  };
  for (const [tag, [emblem, draw, note, source]] of Object.entries(designs)) {
    if (!flags[tag]?.fieldColor) throw new Error(`Coin standard has no base court: ${tag}`);
    flags[tag] = coinStandard(flags[tag].fieldColor, emblem, draw, note, source);
  }
  flags.JUD_REVOLT = coinStandard(flags.JUD.fieldColor, 'first-revolt-chalice', revoltChalice,
    'A silver chalice with a pearled rim, shaped bowl, stem and raised foot, after First Revolt shekels. The cited specimen is dated 69–70 CE; the motif is used across the 66 CE chapter without copying its year-four legend. Colours and the dotted border are game choices.', 'revolt');
  flags.JUD_BK = coinStandard(flags.JUD.fieldColor, 'bar-kokhba-lulav-zuz', lulav,
    'The standalone lulav (palm frond) of Bar Kokhba silver zuzim, with individual leaflets, central rib and stalk. The Meʿarat Ha-Teʾomim finds include this reverse in 133–134 CE; used across the 132 CE chapter. The border is a game composition and no coin legend is fabricated.', 'lulav');
  for (const [tag, kingdom] of [['EPJ', false], ['KGJ', true]]) {
    flags[tag] = inheritedStandard(flags.JUD, flags[tag].fieldColor, kingdom);
    flags[`${tag}_BK`] = inheritedStandard(flags.JUD_BK, flags[tag].fieldColor, kingdom);
  }
}
