// Flat heraldic inks over the complete vector masters. Object colours are
// design choices; the source objects document motifs, not ancient flag colours.
const paper = '#f1ead7';
const palette = (ink, line, extra = {}) => ({ ink, light: ink, secondary: ink, line, dark: line, accent: '#b64a48', ...extra });
export const COURT_PALETTES = {
  ivory: palette(paper, '#38434a'),
  stone: palette('#e4c5a0', '#735344'),
  basalt: palette('#b2b5b4', '#36434a'),
  copper: palette('#c98968', '#663e38'),
  silver: palette('#d6e0df', '#405661'),
  foliage: palette('#adbf82', '#3d5944'),
  olive: palette('#40573b', '#e1dcad'),
  fruit: palette('#efa49a', '#783f49'),
  terracotta: palette('#e3ae91', '#794c42'),
  amber: palette('#d9a367', '#6d4435'),
  ship: palette(paper, '#644b3b', { secondary: '#b98c68', dark: '#4c3c33' }),
  portrait: palette('#b4ccd1', '#3b4d58', { light: '#eee0c7', secondary: '#eee0c7' }),
  eagle: palette(paper, '#41464a', { accent: '#bd7552' }),
  garnet: palette('#d8dfdc', '#47434c', { secondary: '#a44350', accent: '#a44350' }),
  bronze: palette('#ceae7c', '#62503e'),
};
const assignments = {};
const assign = (name, tags) => tags.split(' ').forEach(tag => { assignments[tag] = name; });
assign('stone', 'NAB AMM AMO CIL CAP DEC ION LKH SRD DLM DRD CHO KSH AXM IDU EDM MAU HPH LUK');
assign('basalt', 'MOA MOB EME');
assign('copper', 'CYP');
assign('silver', 'MED MDA IBE LST NOR FRK SAX SLV SMN BLG BLM GOT SCO CHA CTB LUS');
assign('foliage', 'HPA AGR JUD_REVOLT GRC AQT VEN CYR URA');
assign('olive', 'AQT');
assign('fruit', 'RHO CRC');
assign('terracotta', 'ETR');
assign('amber', 'AES');
assign('ship', 'MAS ARO SCN CHX OMA VAN TRT BIT PIR GRM');
assign('portrait', 'PAR SYC SUE');
assign('eagle', 'PTO ROM HMY');
assign('garnet', 'OST GEP');
assign('bronze', 'GLT AED BRT SEQ KMT HDR');
const MODERN = new Set('ISR HEJ KUR ALW DRZ'.split(' '));
const GOLD = new Set(['#f2c75b', '#e7bc64', '#e6c554', '#fdff00']);
const IVORY = new Set(['#f4e6be', '#d5e2e7']);
const BRONZE = new Set(['#bb8045', '#cf9350', '#bd8847']);
const DARK = new Set(['#49372d', '#654524']);

export function flattenCourtStandards(flags) {
  for (const [tag, art] of Object.entries(flags)) {
    // These designs already use flat historical colours / approved calligraphy.
    if (MODERN.has(tag) || tag === 'SAM' || tag === 'GAL') continue;
    const name = assignments[tag] || 'ivory', colors = COURT_PALETTES[name];
    const detail = colors.line || art.fieldColor;
    // Leave the field rectangle intact; recolour only the device. Never alter
    // paths, transforms, inscriptions, clip paths, or negative spaces.
    const start = art.body.indexOf('<g data-emblem=');
    if (start < 0) throw new Error('Missing vector device: ' + tag);
    const recolor = (attr, raw) => {
      const color = raw.toLowerCase();
      if (GOLD.has(color)) return colors.ink;
      if (IVORY.has(color)) return attr === 'fill' ? colors.light : colors.ink;
      if (BRONZE.has(color)) return attr === 'fill' ? colors.secondary : detail;
      if (DARK.has(color)) return colors.dark || detail;
      return raw;
    };
    const motif = art.body.slice(start)
      .replace(/\b(fill|stroke)="(#[\da-f]{6})"/gi, (_, attr, raw) => `${attr}="${recolor(attr, raw)}"`)
      .replace(/\b(fill|stroke):\s*(#[\da-f]{6})/gi, (_, attr, raw) => `${attr}:${recolor(attr, raw)}`);
    const inkName = { ivory:'ivory', stone:'sandstone', foliage:'olive green', olive:'olive green', silver:'silver', portrait:'blue and ivory' }[name] || name;
    const note = (art.note || '').replace(/\bengraved in gold and ivory\b/gi, 'drawn in ivory')
      .replace(/\bgold and ivory\b/gi, 'ivory').replace(/\bgold\b/gi, inkName)
      .replace(/\bengraved\b/gi, 'drawn').replace(/\bengraving\b/gi, 'linework');
    flags[tag] = { ...art, flatPalette: name, note,
      body: art.body.slice(0, start) + motif };
  }
}
