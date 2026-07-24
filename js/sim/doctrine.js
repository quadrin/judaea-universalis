// Judaea Universalis — the doctrine axes (SPEC §85). DOM-free.
//
// The game already remembered what you chose: a hundred and sixty-five
// narrative flags, set by event options across seven eras. It simply never
// read them back. Worse, the content had already been written in opposed
// pairs — gerizimRazed against gerizimSpared, lawIsAWall against lawIsAGate,
// alignedRome against alignedParthia — so the moral architecture of every
// alternate timeline was sitting in the data with nothing to consume it.
//
// This module is the consumer. Four axes, each a live tension of the age:
//
//   zeal       The Wall and the Gate    — zealous ←→ accommodating
//   alignment  The Two Horizons         — westward ←→ eastward
//   authority  The Crown and the Council— crowned ←→ conciliar
//   conquest   The Sword and the Purse  — martial ←→ mercantile
//
// A score runs -10..+10. It comes from two sources, summed: the flags the
// existing content already sets (FLAG_AXES below, the retrofit), and explicit
// pushes from new content through `helpers.doctrine(ctx, axis, delta)`, which
// persist on `game.doctrine`. Nothing here migrates a save: flag-derived
// scores are computed fresh every read, and an absent `game.doctrine` reads
// as all zeros.
//
// Only CHOICE-DISCRIMINATING flags are mapped. Ninety of the game's flags are
// set by every option of their event — they record that a thing happened, not
// what was chosen — and a doctrine built on those would measure the calendar
// rather than the player. Those flags belong to the divergence ledger
// (SPEC §88), not here.

// Self-contained on purpose: military.js reads the axes (SPEC §86 gates an
// affinity on the realm's horizon), so this module must not read military.js
// back. Two three-line primitives are a cheaper price than an import cycle.
function num(v, d = 0) { return Number.isFinite(v) ? v : d; }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/doctrine]', ...args);
}

export const AXIS_MAX = 10;

// The four axes, with the name each pole wears in the realm panel. `hi` is the
// positive pole, `lo` the negative.
export const AXES = [
  {
    id: 'zeal',
    name: 'The Wall and the Gate',
    question: 'Is the Law a wall around Israel, or a gate into it?',
    hi: 'Zealous', lo: 'Accommodating',
    hiBlurb: 'The Law is a wall. Conquest means conversion, rival altars come down, and the realm is a kingdom apart.',
    loBlurb: 'The Law is a gate. Subject peoples keep their gods and pay their tribute, and the sages argue rather than the soldiers.',
  },
  {
    id: 'alignment',
    name: 'The Two Horizons',
    question: 'Which great power does the realm face when it needs a friend?',
    hi: 'Westward', lo: 'Eastward',
    hiBlurb: 'The treaties are with Rome and the ships sail west. The Senate remembers its friends — and its friends\' obligations.',
    loBlurb: 'The covenant is with the King of Kings. The Euphrates is a road home, not a border, and the west reads it as treason.',
  },
  {
    id: 'authority',
    name: 'The Crown and the Council',
    question: 'Where does the realm keep its sovereignty — on a head, or in a chamber?',
    hi: 'Crowned', lo: 'Conciliar',
    hiBlurb: 'One anointed head, one will. The diadem decides and the sages advise.',
    loBlurb: 'The Chamber of Hewn Stone decides. Kings are magistrates of the Law, and the schools outlive the dynasty.',
  },
  {
    id: 'conquest',
    name: 'The Sword and the Purse',
    question: 'Does the realm grow by taking, or by trading?',
    hi: 'Martial', lo: 'Mercantile',
    hiBlurb: 'The inheritance is taken, not bought. Terms are for the beaten, and a razed city teaches faster than a treaty.',
    loBlurb: 'Harbors, roads and tolls. A tributary pays every year; a sacked city pays once.',
  },
];
const AXIS_IDS = AXES.map((a) => a.id);

// ---------------------------------------------------------------- the table
// flag -> [{ axis, d, text }]. `text` is the line the realm panel and the
// divergence ledger print for that decision — written from the realm's own
// side, in the past tense, because it is already history when it is read.
export const FLAG_AXES = {
  // ── 167 BCE: the Maccabean revolt and the kingdom it became ──────────────
  lawIsAWall: [{ axis: 'zeal', d: 2, text: 'The Law was declared a wall: Israel a kingdom apart.' }],
  lawIsAGate: [{ axis: 'zeal', d: -2, text: 'The Law was declared a gate: the nations were let in.' }],
  gerizimRazed: [{ axis: 'zeal', d: 2, text: 'The temple on Gerizim was cast down.' }],
  gerizimSpared: [{ axis: 'zeal', d: -2, text: 'Gerizim kept its altar and paid its tribute.' }],
  samariaRazed: [
    { axis: 'zeal', d: 1, text: 'Samaria was effaced and the streams turned through the ruin.' },
    { axis: 'conquest', d: 1, text: '' },
  ],
  samariaSpared: [
    { axis: 'zeal', d: -1, text: 'Samaria was spared and the hill garrisoned.' },
    { axis: 'conquest', d: -1, text: '' },
  ],
  idumeaConverted: [{ axis: 'zeal', d: 2, text: 'Idumea came under the Law — or out of the land.' }],
  idumeaTributary: [
    { axis: 'zeal', d: -1, text: 'Idumea was made tributary, not brethren.' },
    { axis: 'conquest', d: -1, text: '' },
  ],
  greekCitiesUnderLaw: [{ axis: 'zeal', d: 2, text: 'The Greek cities closed their gymnasia and opened synagogues.' }],
  greekCitiesTributary: [
    { axis: 'zeal', d: -1, text: 'The Greek cities kept their liberties, at a price.' },
    { axis: 'conquest', d: -1, text: '' },
  ],
  damascusUnderLaw: [{ axis: 'zeal', d: 1, text: 'Damascus was brought under the Law.' }],
  damascusTributary: [
    { axis: 'zeal', d: -1, text: 'Damascus was held as David held it: garrisons and gifts.' },
    { axis: 'conquest', d: -1, text: '' },
  ],
  watchmenRefused: [{ axis: 'zeal', d: 1, text: 'The Hasideans were told the empire was heaven\'s gift, and to keep it.' }],
  watchmenHeeded: [{ axis: 'zeal', d: -1, text: 'The Hasideans were heard: the Law is not a spoil of war.' }],
  philistineCoast: [{ axis: 'zeal', d: 1, text: 'The faithful were settled in the port towns of the coast.' }],
  davidsTombOpened: [{ axis: 'zeal', d: -1, text: 'The sepulchre of David was opened to pay the Seleucid bill.' }],
  alignedRome: [{ axis: 'alignment', d: 3, text: 'The friendship of Rome was renewed, as equals.' }],
  alignedParthia: [{ axis: 'alignment', d: -3, text: 'A covenant was cut with the King of Kings.' }],
  romanTreaty: [{ axis: 'alignment', d: 2, text: 'The Roman treaty was fixed in bronze on Mount Zion.' }],
  highPriesthood: [{ axis: 'authority', d: 2, text: 'The crown and the priesthood were taken together.' }],
  aristobulusKing: [{ axis: 'authority', d: 2, text: 'The diadem was assumed — the first king since the exile.' }],
  sadduceeBreach: [{ axis: 'authority', d: 2, text: 'The court went over to the Sadducees.' }],
  phariseesKept: [{ axis: 'authority', d: -2, text: 'The Pharisees were kept: one sage\'s insolence is not the schools\' sin.' }],
  syrianProtectorate: [
    { axis: 'authority', d: 1, text: 'A protectorate was declared over Syria itself.' },
    { axis: 'conquest', d: 2, text: '' },
  ],
  diademRefused: [
    { axis: 'authority', d: -2, text: 'The Seleucid diadem was cast down, and the army came home to Zion.' },
    { axis: 'conquest', d: -1, text: '' },
  ],
  termsRefused: [{ axis: 'conquest', d: 2, text: 'Antioch\'s envoys were sent home: the whole inheritance, or nothing.' }],
  gatesOfTheSea: [{ axis: 'conquest', d: -1, text: 'Keels were laid at Tyre and the sea-gates opened.' }],

  // ── 67 BCE: the brothers, Pompey, and the road not taken ─────────────────
  submittedHYR: [{ axis: 'alignment', d: 2, text: 'Hyrcanus placed his cause in Rome\'s hands.' }],
  submittedARI: [{ axis: 'alignment', d: 2, text: 'Aristobulus placed his cause in Rome\'s hands.' }],
  jvBackedCaesar: [{ axis: 'alignment', d: 2, text: 'Grain and gold went to Caesar.' }],
  jvBackedPompey: [{ axis: 'alignment', d: 1, text: 'Pompey\'s cause was honored to the end.' }],
  jvBackedOctavian: [{ axis: 'alignment', d: 2, text: 'The grain fleets sailed west, to Octavian.' }],
  jvBackedAntony: [{ axis: 'alignment', d: 1, text: 'The East was held with Antony.' }],
  parthianAccord: [{ axis: 'alignment', d: -3, text: 'The buffer kingdom took the Parthian hand.' }],
  eagleRefused: [
    { axis: 'alignment', d: -1, text: 'The gates were shut against Pompey, and held.' },
    { axis: 'conquest', d: 1, text: '' },
  ],
  antipaterAscendant: [{ axis: 'authority', d: 1, text: 'The Idumean was let to manage the kingdom.' }],
  herodRises: [{ axis: 'authority', d: 1, text: 'Galilee was given to the young Herod.' }],
  mariamneExecuted: [{ axis: 'conquest', d: 1, text: 'The sentence against Queen Mariamne was carried out.' }],
  aristobulusDrowned: [{ axis: 'conquest', d: 1, text: 'The young high priest drowned at a party in Jericho.' }],
  caravanTribute: [{ axis: 'conquest', d: -1, text: 'The incense road was taxed rather than seized.' }],

  // ── 40 BCE: Herod, Antigonus, and what Rome would allow ──────────────────
  herodSailed: [{ axis: 'alignment', d: 2, text: 'Herod sailed for Rome in winter.' }],
  aquileiaPeace: [{ axis: 'alignment', d: 1, text: 'The quarrel of the sons was carried to Augustus at Aquileia.' }],
  caesareaWorks: [{ axis: 'conquest', d: -2, text: 'The harbor at Caesarea was sunk in twenty fathoms.' }],
  templeBegun: [{ axis: 'conquest', d: -1, text: 'The Temple was begun again, vaster than Solomon\'s.' }],
  sonsExecuted: [{ axis: 'conquest', d: 2, text: 'The king\'s sons were strangled at Sebaste.' }],

  // ── 66 CE: the Great Revolt and the Second Kingdom ───────────────────────
  menahemLives: [
    { axis: 'zeal', d: 2, text: 'The Sicarii were armed and Menahem lived.' },
    { axis: 'authority', d: 1, text: '' },
  ],
  parthianSympathy: [{ axis: 'alignment', d: -2, text: 'Envoys were sent beyond the Euphrates.' }],
  parthianPact: [{ axis: 'alignment', d: -3, text: 'The outstretched Parthian hand was taken.' }],
  kingSimon: [{ axis: 'authority', d: 3, text: 'The sword made the state, and the state was crowned.' }],
  sanhedrinRule: [{ axis: 'authority', d: -3, text: 'Sovereignty was seated in the Chamber of Hewn Stone.' }],
  academiesChartered: [
    { axis: 'authority', d: -2, text: 'The academies were chartered: Yavneh and its sages.' },
    { axis: 'zeal', d: -1, text: '' },
  ],
  secondPeace: [{ axis: 'conquest', d: -2, text: 'What existed was recognized — at a price.' }],

  // ── 132 CE: Bar Kokhba, and the state that governed ──────────────────────
  messianicClaim: [
    { axis: 'zeal', d: 2, text: 'The name was embraced: Bar Kokhba, the Star.' },
    { axis: 'authority', d: 2, text: '' },
  ],
  redemptionEra: [{ axis: 'zeal', d: 2, text: 'The documents were dated by the Redemption of Israel.' }],
  freedomEra: [{ axis: 'zeal', d: -1, text: 'The documents were dated, more safely, for the Freedom of Jerusalem.' }],
  altarRaised: [{ axis: 'zeal', d: 2, text: 'The altar was raised by the Nasi\'s own hand.' }],
  altarDeferred: [{ axis: 'zeal', d: -2, text: 'The stones were stored, as the Maccabees stored them.' }],
  parthianCourtship: [{ axis: 'alignment', d: -2, text: 'Parthian silver was taken, and nothing sealed.' }],

  // ── 614 CE: the Return, and the world after the conquests ────────────────
  charterDavidic: [{ axis: 'authority', d: 2, text: 'The charter was written to the scepter of the exile-house.' }],

  // ── 1948: the state and its lines ────────────────────────────────────────
  // These are written straight onto game.flags by the 1948 package rather
  // than through setFlag; the reader below handles both the same way.
  landForPeacePosture: [{ axis: 'conquest', d: -2, text: 'The cabinet adopted the land-for-peace posture.' }],
  settlementArc: [{ axis: 'conquest', d: 2, text: 'The settlement arc was laid across the held ground.' }],
  gushEmunim: [{ axis: 'zeal', d: 2, text: 'The Bloc of the Faithful was let onto the hills.' }],
  earlyPeace48: [{ axis: 'conquest', d: -2, text: 'Peace was made early, before the lines hardened.' }],
  mobilizedEarly: [{ axis: 'conquest', d: 1, text: 'The reserves were rolling before the ultimatum expired.' }],
  hamtanaWaited: [{ axis: 'conquest', d: -1, text: 'The waiting was endured rather than pre-empted.' }],
};

// ---------------------------------------------------------------- the reads
function flagIsSet(g, key) {
  const v = g.flags ? g.flags[key] : undefined;
  return v !== undefined && v !== null && v !== false && v !== 0;
}

// The raw scores, unclamped contributions summed then clamped. Pure: computed
// from game.flags and game.doctrine on every call, so no save is migrated and
// a mid-campaign load reads exactly what the campaign earned.
export function doctrineScores(ctx) {
  const out = {};
  for (const id of AXIS_IDS) out[id] = 0;
  try {
    const g = ctx.game;
    if (!g) return out;
    for (const flag of Object.keys(FLAG_AXES)) {
      if (!flagIsSet(g, flag)) continue;
      for (const e of FLAG_AXES[flag]) {
        if (out[e.axis] === undefined) continue;
        out[e.axis] += num(e.d);
      }
    }
    const explicit = g.doctrine;
    if (explicit && typeof explicit === 'object') {
      for (const id of AXIS_IDS) out[id] += num(explicit[id]);
    }
    for (const id of AXIS_IDS) out[id] = clamp(Math.round(out[id]), -AXIS_MAX, AXIS_MAX);
  } catch (e) { warnOnce('scores', 'doctrineScores failed', e); }
  return out;
}

// The one-axis read the rest of the sim uses: `axis(ctx, 'zeal') >= 4`.
export function axisOf(ctx, id) {
  const s = doctrineScores(ctx);
  return num(s[id]);
}

// Content's explicit lever. Persists on game.doctrine so a new event can move
// the realm's character without inventing a flag for the table above.
export function pushDoctrine(ctx, id, delta) {
  try {
    if (AXIS_IDS.indexOf(id) < 0) { warnOnce('push:' + id, 'unknown doctrine axis', id); return; }
    const g = ctx.game;
    if (!g.doctrine || typeof g.doctrine !== 'object') g.doctrine = {};
    g.doctrine[id] = clamp(num(g.doctrine[id]) + num(delta), -AXIS_MAX * 2, AXIS_MAX * 2);
  } catch (e) { warnOnce('push', 'pushDoctrine failed', e); }
}

// Five bands per axis. The middle band is genuinely middling — a realm that
// has not committed reads as undecided, not as balanced-by-design.
export function axisBand(score) {
  const s = num(score);
  if (s >= 6) return 'strongHi';
  if (s >= 2) return 'hi';
  if (s <= -6) return 'strongLo';
  if (s <= -2) return 'lo';
  return 'mid';
}
export function axisLabel(def, score) {
  const b = axisBand(score);
  if (b === 'strongHi') return 'Wholly ' + def.hi.toLowerCase();
  if (b === 'hi') return def.hi;
  if (b === 'strongLo') return 'Wholly ' + def.lo.toLowerCase();
  if (b === 'lo') return def.lo;
  return 'Undecided';
}

// True when the realm leans far enough along an axis for content to gate on
// it. `lean(ctx, 'zeal', 1)` — the sign is the pole, the magnitude the band.
export function lean(ctx, id, sign, strong) {
  const s = axisOf(ctx, id);
  const need = strong ? 6 : 2;
  return sign >= 0 ? s >= need : s <= -need;
}

// The realm panel's read (init.js getDoctrine): display data only. `marks`
// are the decisions that actually moved the axis, newest content last — the
// realm's character with its reasons attached.
export function doctrineView(ctx) {
  try {
    const g = ctx.game;
    if (!g) return null;
    const scores = doctrineScores(ctx);
    const marks = {};
    for (const id of AXIS_IDS) marks[id] = [];
    for (const flag of Object.keys(FLAG_AXES)) {
      if (!flagIsSet(g, flag)) continue;
      for (const e of FLAG_AXES[flag]) {
        if (!e.text || !marks[e.axis]) continue;
        marks[e.axis].push({ text: e.text, d: num(e.d) });
      }
    }
    let decided = 0;
    const axes = AXES.map((def) => {
      const score = num(scores[def.id]);
      const band = axisBand(score);
      if (band !== 'mid') decided++;
      return {
        id: def.id,
        name: def.name,
        question: def.question,
        hi: def.hi,
        lo: def.lo,
        score,
        band,
        label: axisLabel(def, score),
        blurb: band === 'mid' ? 'The realm has not yet answered this one.'
          : (score > 0 ? def.hiBlurb : def.loBlurb),
        marks: marks[def.id],
      };
    });
    return { axes, decided, max: AXIS_MAX };
  } catch (e) { warnOnce('view', 'doctrineView failed', e); return null; }
}

// A single line naming the realm's character, for the chronicle and the
// divergence ledger: the two strongest commitments, or silence.
export function doctrineEpithet(ctx) {
  try {
    const scores = doctrineScores(ctx);
    const ranked = AXES
      .map((def) => ({ def, score: num(scores[def.id]) }))
      .filter((r) => axisBand(r.score) !== 'mid')
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, 2);
    if (!ranked.length) return '';
    return ranked.map((r) => axisLabel(r.def, r.score)).join(', ');
  } catch (e) { warnOnce('epithet', 'doctrineEpithet failed', e); return ''; }
}
