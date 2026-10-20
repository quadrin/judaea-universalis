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
  revolt: ['British Museum · First Revolt vine-leaf prutah, 1908,0110.623', 'https://www.britishmuseum.org/collection/object/C_1908-0110-623'],
  harp: ['Center for Jewish Art · Bar Kokhba three-string lyre denar, 27505', 'https://cja.huji.ac.il/?id=27505&mode=set'],
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

// Expand the abbreviated royal title/name recorded by RPC I 4989.
// Complete local vector letters retain their strokes at every display size.
const GREEK = {
  'Β': 'M0 16V0H4Q10 0 8 5L5 8Q10 9 8 13Q7 16 4 16Z M0 8H5',
  'Α': 'M0 16 4 0 8 16M2 10H6', 'Σ': 'M8 0H0L5 8 0 16H8',
  'Ι': 'M1 0H7M4 0V16M1 16H7', 'Λ': 'M0 16 4 0 8 16',
  'Ε': 'M8 0H0V16H8M0 8H6', 'Γ': 'M0 16V0H8',
  'Ρ': 'M0 16V0H4Q10 0 8 5Q7 8 4 8H0', 'Π': 'M0 16V0H8V16',
  'Ω': 'M0 16H3V13C-1 11-1 1 4 1C9 1 9 11 5 13V16H8',
};
function greekWord(word, y) {
  const advance = 11, width = (word.length - 1) * advance + 8;
  return `<g data-word="${word}">` + [...word].map((letter, i) =>
    group(l(GREEK[letter], I, 1.7), `translate(${(192 - width) / 2 + i * advance} ${y})`)).join('') + '</g>';
}
function agrippaWreath() {
  // Open the wreath sideways to leave clear space beside both full words.
  // The leaves and ribbon retain every path of the original master.
  return group(wreath(), 'translate(-9.6 0) scale(1.1 1)')
    + '<g data-inscription="ΒΑΣΙΛΕΩΣ ΑΓΡΙΠΠΑ">'
    + greekWord('ΒΑΣΙΛΕΩΣ', 77) + greekWord('ΑΓΡΙΠΠΑ', 103)
    + l('M62 98H130', G, .85) + '</g>';
}

function revoltLeaf() {
  // Vine leaf, branching veins and curling tendril from the bronze prutah.
  // Unequal serrated lobes preserve the botanical device of the coin.
  const leaf = p('M96 57C86 49 79 39 77 30L69 39 57 35 59 48 45 46 49 59 32 61 42 73 29 81 45 89 35 101 52 104 48 119 65 117 65 132 78 126 83 146 96 160 105 144 108 127 122 134 123 119 139 124 135 108 152 106 142 94 160 85 147 77 158 65 141 62 145 49 130 51 132 38 119 43 115 30 106 43Z', G)
    + l('M96 60C92 92 95 125 96 153M95 85 76 62 67 49M94 97 65 82 47 67M94 113 67 105 48 100M95 132 79 121 65 119M96 85 118 63 126 50M95 99 125 83 144 69M95 115 125 105 142 99M96 133 111 121 123 122', D, 2)
    + l('M76 62 73 46M65 82 52 81M67 105 57 113M118 63 116 46M125 83 140 83M125 105 135 115', B, 1.15)
    + l('M99 68C97 93 99 124 99 146', I, 1.25);
  const stem = l('M96 62C105 42 102 28 90 23C81 19 70 22 70 29C70 36 79 39 83 34', G, 3.2)
    + l('M101 44C117 22 139 24 143 39C148 57 124 59 123 45C122 38 131 35 135 40', G, 2.3);
  return beads() + stem + leaf;
}

function barKokhbaHarp(field) {
  // The coin's lyre (the requested David-harp motif), with horn arms,
  // three strings, a bridge and four incised marks on the bowl soundbox.
  const arm = p('M71 119C61 96 64 70 59 54C56 44 48 39 42 40C49 28 65 31 71 43C78 59 74 88 82 114Z', G)
    + l('M49 38C60 37 66 47 67 61C70 80 67 98 76 115', I, 1.7)
    + l('M62 47C71 66 66 95 74 111', D, 1.2);
  const body = p('M70 111Q96 122 122 111L133 126C137 148 117 164 96 165C75 164 55 148 59 126Z', G)
    + p('M75 121Q96 130 117 121L123 132C123 147 109 156 96 156C83 156 69 147 69 132Z', B)
    + l('M67 126C61 143 79 160 96 160C113 160 131 143 125 126M76 125Q96 133 116 125', I, 1.5)
    + repeat(4, i => l(`M${82 + i * 9} 139v8`, D, 2.1));
  const yoke = p('M55 48Q96 39 137 48L135 57Q96 50 57 57Z', G)
    + l('M59 50Q96 43 133 50', I, 1.4)
    + repeat(11, i => c(62 + i * 6.8, 51 - Math.sin(i * Math.PI / 10) * 3.2, 1.4, D));
  const strings = [84, 96, 108].map(x => l(`M${x} 53V130`, I, 1.6)
    + c(x, 53, 2.3, G)).join('');
  return beads() + mirror(arm) + body + strings + yoke
    + rect(78, 129, 36, 4, I) + l('M80 133H112', D, 1.1);
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
    note: `${kingdom ? 'Kingdom' : 'Ethnarchy'} of Judaea: the complete ${base.emblem === 'bar-kokhba-coin-harp' ? 'Bar Kokhba coin harp/lyre' : 'Judaean menorah'}, with an invented ${kingdom ? 'corner-band' : 'beaded-corner'} border. The source motif follows the founding chapter. ${base.note}`,
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
    AGR: ['agrippa-neronian-wreath', agrippaWreath, 'A tied wreath surrounding the complete royal title and name ΒΑΣΙΛΕΩΣ / ΑΓΡΙΠΠΑ (of King Agrippa), expanded from the abbreviated ΒΑΣΙΛΕ / ΑΓΡΙΠΠ recorded in RPC I 4989, under Nero. The two-line arrangement and expanded spelling are game adaptations. This Neronian type suits the 66 CE chapter; later Flavian Victory coins are not used.', 'agrippa'],
  };
  for (const [tag, [emblem, draw, note, source]] of Object.entries(designs)) {
    if (!flags[tag]?.fieldColor) throw new Error(`Coin standard has no base court: ${tag}`);
    flags[tag] = coinStandard(flags[tag].fieldColor, emblem, draw, note, source);
  }
  flags.JUD_REVOLT = coinStandard(flags.JUD.fieldColor, 'first-revolt-vine-leaf', revoltLeaf,
    'A lobed vine leaf on a branch with curling tendril and a dotted border, after the First Revolt bronze prutah, British Museum 1908,0110.623. The specimen dates to 67–68 CE; its motif is used across the 66 CE chapter. Vein detail and banner colours are artistic adaptations; no year or coin legend is reproduced.', 'revolt');
  flags.JUD_BK = coinStandard(flags.JUD.fieldColor, 'bar-kokhba-coin-harp', barKokhbaHarp,
    'The requested David-harp motif, drawn as the lyre on Bar Kokhba’s silver denar: curved horn arms, three strings, raised yoke, bridge and four incisions on the bowl-shaped soundbox. CJA 27505 dates to 133–134 CE; used across the 132 CE chapter. The ancient instrument’s precise name is uncertain. Colours and arrangement are game choices; no coin legend is fabricated.', 'harp');
  for (const [tag, kingdom] of [['EPJ', false], ['KGJ', true]]) {
    flags[tag] = inheritedStandard(flags.JUD, flags[tag].fieldColor, kingdom);
    flags[`${tag}_BK`] = inheritedStandard(flags.JUD_BK, flags[tag].fieldColor, kingdom);
  }
}
