// js/data/songs.js — the score's songs (SPEC §289).
//
// Ten composed pieces for the generative score to hand over to: each age has
// its peace and its war, and the lament belongs to every age that lost
// something. They are original compositions written for this game, in the
// modes the open score already speaks (SPEC §51): Adonai Malakh for peace,
// Freygish (Ahava Rabbah) and the minor for war, the Misheberakh for the
// Galilee's evenings.
//
// Notation. A song is data, read by js/ui/song_engine.js.
//   key   the tonic of the melody, in Hz (degree 0)
//   mode  the scale the degrees count in (MODES below)
//   meter beats per bar; bpm the beat
//   parts.X.m  the melody: `degree:beats` tokens, `r:beats` a rest; a `#` or
//              `b` after the degree raises or lowers it a semitone; negative
//              degrees go below the tonic. `|` marks a bar — every bar must
//              add up to the meter (smoke200 checks).
//   parts.X.c  the harmony: `semitones[m|p]:beats` from the tonic — `m` a
//              minor chord, `p` an open fifth, nothing a major chord.
//   form  the arrangement, in order: `c` names the part whose harmony runs
//         (and so the section's length); `m` lists the melodic lines as
//         [part, voice, octave shift, level]; `harp`, `bass` and `drum` (a
//         key of `drums`) add the accompaniment; `pad` sets the strings.
//   drums  one bar of steps: D doum (low drum), T tek, k a soft tek, S snare,
//          B the big drum, `.` a rest.
//
// Voices: kinnor (the lyre), flute (the halil), reed, oud, horn, strings,
// choir, shofar.

export const MODES = {
  dorian: [0, 2, 3, 5, 7, 9, 10],
  freygish: [0, 1, 4, 5, 7, 8, 10],       // Ahava Rabbah
  adonai: [0, 2, 4, 5, 7, 9, 10],         // Adonai Malakh — major, flat 7
  minor: [0, 2, 3, 5, 7, 8, 10],
  misheberakh: [0, 2, 3, 6, 7, 9, 10],    // the "Ukrainian Dorian"
};

// The four ages of the score, by bookmark. The open score's three lead
// voices (lyre, reed, horns) still choose themselves by STYLE in sound.js;
// these decide which songs belong to a campaign.
export const SONG_AGES = {
  iron: 'Kings and Prophets',
  temple: 'The Second Temple',
  late: 'Rabbis and Emperors',
  state: 'The State',
};
const AGE_BY_BOOKMARK = {
  '931bce': 'iron', '732bce': 'iron', '597bce': 'iron',
  '167bce': 'temple', '67bce': 'temple', '40bce': 'temple', '66ce': 'temple',
  '132ce': 'late', '351ce': 'late', '529ce': 'late', '614ce': 'late',
  '1948ce': 'state',
};
export function songAgeOf(bookmarkId, year) {
  if (AGE_BY_BOOKMARK[bookmarkId]) return AGE_BY_BOOKMARK[bookmarkId];
  const y = Number(year) || 0;
  if (y >= 1900) return 'state';
  if (y < -539) return 'iron';
  if (y < 120) return 'temple';
  return 'late';
}

export const SONGS = [
  {
    id: 'well',
    title: 'Song of the Well',
    blurb: '"Spring up, O well — sing to it." A kinnor and a shepherd\'s halil.',
    ages: ['iron', 'temple'], moods: ['peace'],
    key: 293.66, mode: 'dorian', meter: 4, bpm: 84,
    parts: {
      I: { c: '0m:4 | 10:4' },
      A: {
        m: '0:1 2:1 4:1.5 3:.5 | 2:1 1:1 0:2 | 0:1 2:1 4:1 5:1 | 4:3 r:1 | 7:1.5 6:.5 5:1 4:1 | 5:1 4:1 2:2 | 3:1 2:1 1:1 2:1 | 0:3 r:1',
        c: '0m:4 | 10:4 | 0m:4 | 7m:4 | 10:4 | 5:4 | 10:4 | 0m:4',
      },
      Ac: { m: '4:4 | 4:2 2:2 | 4:4 | 2:2 4:2 | 4:4 | 3:4 | 4:2 1:2 | 2:4' },
      B: {
        m: '4:1 5:1 7:2 | 8:1 7:1 6:1 5:1 | 6:2 5:1 4:1 | 5:3 r:1 | 4:1 5:1 7:1.5 6:.5 | 5:1 4:1 3:1 2:1 | 1:1.5 2:.5 3:1 1:1 | 0:4',
        c: '5:4 | 10:4 | 3:4 | 5:4 | 7m:4 | 5:4 | 10:4 | 0m:4',
      },
      O: { c: '10:4 | 0m:4' },
    },
    drums: { soft: 'D...k...' },
    form: [
      { c: 'I', harp: 1, pad: 0.05 },
      { c: 'A', m: [['A', 'kinnor', 0, 1]], harp: 1, bass: 1, pad: 0.045 },
      { c: 'A', m: [['A', 'flute', 0, 1], ['Ac', 'strings', -1, 0.5]], harp: 1, bass: 1, drum: 'soft' },
      { c: 'B', m: [['B', 'kinnor', 0, 1]], harp: 1, bass: 1, drum: 'soft' },
      { c: 'B', m: [['B', 'flute', 0, 1]], bass: 1, drum: 'soft', pad: 0.06 },
      { c: 'A', m: [['A', 'kinnor', 0, 1], ['A', 'flute', 0, 0.5], ['Ac', 'strings', -1, 0.45]], harp: 1, bass: 1, drum: 'soft' },
      { c: 'O', harp: 1, pad: 0.05 },
    ],
  },
  {
    id: 'hills',
    title: 'The Hill Country',
    blurb: 'A shepherd\'s waltz over the terraces of Ephraim, in Adonai Malakh.',
    ages: ['iron', 'temple'], moods: ['peace'],
    key: 196, mode: 'adonai', meter: 3, bpm: 96,
    parts: {
      I: { c: '0:3 | 10:3' },
      A: {
        m: '4:1 7:1 6:1 | 7:2 4:1 | 5:1 4:1 2:1 | 4:3 | 2:1 4:1 5:1 | 6:1 5:1 4:1 | 2:1 1:1 2:1 | 0:3',
        c: '0:3 | 0:3 | 9m:3 | 7m:3 | 0:3 | 10:3 | 7m:3 | 0:3',
      },
      B: {
        m: '7:1 8:1 9:1 | 8:2 7:1 | 6:1 5:1 6:1 | 7:3 | 5:1 6:1 7:1 | 4:2 2:1 | 3:1 2:1 1:1 | 0:3',
        c: '0:3 | 2m:3 | 10:3 | 0:3 | 5:3 | 0:3 | 10:3 | 0:3',
      },
      O: { c: '10:3 | 0:3' },
    },
    drums: { step: 'D...k.' },
    form: [
      { c: 'I', harp: 1, pad: 0.04 },
      { c: 'A', m: [['A', 'flute', 1, 0.9]], harp: 1, bass: 1 },
      { c: 'A', m: [['A', 'kinnor', 1, 1]], harp: 1, bass: 1, drum: 'step' },
      { c: 'B', m: [['B', 'flute', 1, 0.9]], bass: 1, drum: 'step', pad: 0.055 },
      { c: 'A', m: [['A', 'kinnor', 1, 1], ['A', 'flute', 1, 0.45]], harp: 1, bass: 1, drum: 'step' },
      { c: 'B', m: [['B', 'kinnor', 1, 1]], harp: 1, bass: 1 },
      { c: 'A', m: [['A', 'flute', 1, 0.9]], harp: 1, bass: 1 },
      { c: 'O', harp: 1, pad: 0.04 },
    ],
  },
  {
    id: 'rivers',
    title: 'By the Rivers',
    blurb: '"There we sat down, and wept." The lament of every age that lost a city.',
    ages: ['iron', 'temple', 'late'], moods: ['peace', 'war'],
    key: 220, mode: 'minor', meter: 3, bpm: 66,
    parts: {
      I: { c: '0m:3 | 8:3' },
      A: {
        m: '0:1 2:1 4:1 | 5:2 4:1 | 3:1 2:1 1:1 | 2:2 r:1 | 4:1 5:1 7:1 | 6:2 5:1 | 4:1 3:1 1:1 | 0:3',
        c: '0m:3 | 8:3 | 10:3 | 3:3 | 0m:3 | 10:3 | 7:3 | 0m:3',
      },
      B: {
        m: '7:1.5 8:.5 9:1 | 8:2 7:1 | 6:1 7:1 5:1 | 4:3 | 5:1 4:1 3:1 | 2:1 3:1 4:1 | 3:1.5 2:.5 1:1 | 0:3',
        c: '8:3 | 10:3 | 8:3 | 7:3 | 5m:3 | 3:3 | 7:3 | 0m:3',
      },
      O: { c: '7:3 | 0m:3' },
    },
    drums: {},
    form: [
      { c: 'I', pad: 0.06 },
      { c: 'A', m: [['A', 'choir', 0, 1]], pad: 0.05, bass: 1 },
      { c: 'A', m: [['A', 'kinnor', 0, 0.9]], harp: 1, pad: 0.06, bass: 1 },
      { c: 'B', m: [['B', 'choir', 0, 1]], pad: 0.06, bass: 1 },
      { c: 'A', m: [['A', 'choir', 0, 0.9], ['A', 'kinnor', 1, 0.5]], pad: 0.055, bass: 1 },
      { c: 'O', harp: 1, pad: 0.05 },
    ],
  },
  {
    id: 'hammer',
    title: 'The Hammer',
    blurb: 'The shofar calls in Modi\'in. A march in Freygish for the Maccabees.',
    ages: ['temple'], moods: ['war', 'battle'],
    key: 293.66, mode: 'freygish', meter: 4, bpm: 112,
    parts: {
      S: { m: '0:.5 4:3.5 | r:4 | 0:.5 4:1 0:.5 4:2 | r:4', c: '0p:4 | 0p:4 | 0p:4 | 0p:4' },
      A: {
        m: '0:.5 0:.5 2:.5 3:.5 4:1 4:1 | 5:.5 4:.5 3:.5 2:.5 1:2 | 0:.5 0:.5 2:.5 3:.5 4:1 7:1 | 6:.5 5:.5 4:1 4:2 | 7:1 6:.5 5:.5 4:1 3:1 | 4:.5 5:.5 4:.5 3:.5 2:2 | 3:.5 2:.5 1:.5 2:.5 3:1 1:1 | 0:3 r:1',
        c: '0:4 | 1:4 | 0:4 | 10m:2 0:2 | 5m:4 | 0:4 | 1:4 | 0:4',
      },
      B: {
        m: '7:1.5 7:.5 8:1 7:1 | 6:.5 5:.5 6:1 4:2 | 5:1.5 5:.5 6:1 5:1 | 4:.5 3:.5 4:1 2:2 | 3:1 4:1 5:1 6:1 | 7:2 8:1 7:1 | 6:.5 5:.5 4:.5 3:.5 2:1 1:1 | 0:2 4:1 0:1',
        c: '0:4 | 10m:2 0:2 | 5m:4 | 0:4 | 10m:4 | 5m:4 | 10m:2 1:2 | 0:4',
      },
      O: { c: '1:4 | 0:4' },
    },
    drums: { call: 'B.......', war: 'D...D.T.', hard: 'D.TTD.T.' },
    form: [
      { c: 'S', m: [['S', 'shofar', -1, 1]], drum: 'call', pad: 0.04 },
      { c: 'A', m: [['A', 'horn', 0, 1]], bass: 1, drum: 'war' },
      { c: 'A', m: [['A', 'horn', 0, 1], ['A', 'kinnor', 1, 0.45]], bass: 1, drum: 'hard' },
      { c: 'B', m: [['B', 'horn', 0, 1]], bass: 1, drum: 'war', pad: 0.07 },
      { c: 'B', m: [['B', 'horn', 0, 1], ['B', 'kinnor', 1, 0.45]], bass: 1, drum: 'hard', pad: 0.07 },
      { c: 'A', m: [['A', 'horn', 0, 1], ['A', 'strings', -1, 0.5]], bass: 1, drum: 'hard' },
      { c: 'O', drum: 'call', pad: 0.06 },
    ],
  },
  {
    id: 'watchfires',
    title: 'Watchfires on the Walls',
    blurb: 'Lachish signals to Azekah through the night. A march in A Dorian.',
    ages: ['iron', 'temple'], moods: ['war', 'battle'],
    key: 220, mode: 'dorian', meter: 4, bpm: 92,
    parts: {
      I: { c: '0m:4 | 10:4' },
      A: {
        m: '0:1 0:.5 1:.5 2:1 4:1 | 3:1.5 2:.5 1:2 | 0:1 0:.5 1:.5 2:1 3:1 | 4:3 r:1 | 5:1 6:.5 5:.5 4:1 3:1 | 4:1.5 3:.5 2:2 | 1:1 2:.5 1:.5 -1:1 1:1 | 0:3 r:1',
        c: '0m:4 | 10:4 | 0m:4 | 7m:4 | 5:4 | 3:4 | 10:4 | 0m:4',
      },
      B: {
        m: '4:1 7:1 7:1.5 6:.5 | 5:1 6:1 4:2 | 3:1 5:1 5:1.5 4:.5 | 3:1 4:1 2:2 | 1:1 2:1 3:1 4:1 | 5:1 4:.5 3:.5 4:2 | 2:1 1:1 -1:1 1:1 | 0:4',
        c: '0m:4 | 7m:4 | 5:4 | 3:4 | 10:4 | 5:4 | 10:4 | 0m:4',
      },
      O: { c: '10:4 | 0m:4' },
    },
    drums: { march: 'D.k.D.kk', far: 'D...k...' },
    form: [
      { c: 'I', drum: 'far', pad: 0.05 },
      { c: 'A', m: [['A', 'kinnor', 0, 1]], bass: 1, drum: 'march' },
      { c: 'A', m: [['A', 'strings', 0, 0.9]], harp: 1, bass: 1, drum: 'march' },
      { c: 'B', m: [['B', 'kinnor', 0, 1], ['B', 'flute', 1, 0.4]], bass: 1, drum: 'march', pad: 0.065 },
      { c: 'B', m: [['B', 'strings', 0, 0.9]], bass: 1, drum: 'march', pad: 0.065 },
      { c: 'A', m: [['A', 'kinnor', 0, 1], ['A', 'strings', -1, 0.6]], bass: 1, drum: 'march' },
      { c: 'O', drum: 'far', pad: 0.05 },
    ],
  },
  {
    id: 'tiberias',
    title: 'Lamps of Tiberias',
    blurb: 'An evening by the lake in the Misheberakh mode; a reed, and an oud answering.',
    ages: ['late'], moods: ['peace'],
    key: 293.66, mode: 'misheberakh', meter: 4, bpm: 80,
    parts: {
      I: { c: '0m:4 | 2:4' },
      A: {
        m: '4:1.5 3:.5 4:1 5:1 | 6:1 5:.5 4:.5 3:2 | 4:1 2:1 3:1 1:1 | 2:3 r:1 | 2:1 3:.5 4:.5 5:1 6:1 | 7:1.5 6:.5 5:1 4:1 | 3:1 2:.5 1:.5 3:1 1:1 | 0:3 r:1',
        c: '0m:4 | 7m:2 2:2 | 0m:2 2:2 | 0m:4 | 0m:4 | 7m:4 | 2:4 | 0m:4',
      },
      B: {
        m: '7:1 7:.5 8:.5 9:1 7:1 | 8:1.5 7:.5 6:2 | 6:1 6:.5 7:.5 6:1 5:1 | 4:3 r:1 | 4:1 5:1 6:1 7:1 | 6:1 5:.5 4:.5 3:2 | 4:1 3:.5 2:.5 1:1 2:1 | 0:4',
        c: '0m:4 | 10:4 | 3:4 | 7m:4 | 0m:4 | 7m:2 2:2 | 0m:2 2:2 | 0m:4',
      },
      O: { c: '2:4 | 0m:4' },
    },
    drums: { lake: 'D..k..k.' },
    form: [
      { c: 'I', harp: 'oud', pad: 0.045 },
      { c: 'A', m: [['A', 'reed', 0, 1]], harp: 'oud', bass: 1 },
      { c: 'A', m: [['A', 'oud', 0, 1]], bass: 1, drum: 'lake', pad: 0.055 },
      { c: 'B', m: [['B', 'reed', 0, 1]], harp: 'oud', bass: 1, drum: 'lake' },
      { c: 'A', m: [['A', 'reed', 0, 1], ['A', 'oud', -1, 0.6]], bass: 1, drum: 'lake' },
      { c: 'O', harp: 'oud', pad: 0.045 },
    ],
  },
  {
    id: 'wedding',
    title: 'The Wedding at Sepphoris',
    blurb: 'A Freygish dance in three-three-two: the reed leads, the frame drums answer.',
    ages: ['late', 'temple', 'state'], moods: ['peace'],
    key: 220, mode: 'freygish', meter: 4, bpm: 138,
    parts: {
      I: { c: '0:4 | 0:4' },
      A: {
        m: '4:.5 4:.5 4:.5 5:.5 4:.5 3:.5 2:1 | 3:.5 2:.5 1:.5 2:.5 0:2 | 4:.5 4:.5 4:.5 5:.5 6:.5 5:.5 4:1 | 5:.5 4:.5 3:.5 2:.5 3:2 | 3:.5 3:.5 3:.5 4:.5 5:.5 4:.5 3:1 | 4:.5 3:.5 2:.5 1:.5 2:2 | 1:.5 2:.5 3:.5 2:.5 1:.5 0:.5 1:1 | 0:2 r:2',
        c: '0:4 | 1:2 0:2 | 0:4 | 5m:4 | 5m:4 | 0:4 | 1:4 | 0:4',
      },
      B: {
        m: '7:1 7:.5 6:.5 7:1 4:1 | 6:.5 5:.5 4:.5 5:.5 6:2 | 6:1 6:.5 5:.5 6:1 3:1 | 5:.5 4:.5 3:.5 4:.5 5:2 | 4:.5 5:.5 6:.5 7:.5 8:1 7:1 | 6:.5 5:.5 4:.5 5:.5 4:2 | 3:.5 2:.5 1:.5 2:.5 3:.5 2:.5 1:1 | 0:2 r:2',
        c: '0:4 | 10m:4 | 10m:4 | 5m:4 | 0:4 | 10m:2 0:2 | 1:4 | 0:4',
      },
      O: { c: '1:4 | 0:4' },
    },
    drums: { bulgar: 'D..T..T.', light: 'D..k..k.' },
    form: [
      { c: 'I', drum: 'bulgar', pad: 0.03 },
      { c: 'A', m: [['A', 'reed', 0, 1]], bass: 1, drum: 'bulgar' },
      { c: 'A', m: [['A', 'reed', 0, 1], ['A', 'oud', -1, 0.55]], bass: 1, drum: 'bulgar' },
      { c: 'B', m: [['B', 'reed', 0, 1]], bass: 1, drum: 'bulgar', pad: 0.045 },
      { c: 'B', m: [['B', 'flute', 0, 0.9]], harp: 'oud', bass: 1, drum: 'light' },
      { c: 'A', m: [['A', 'reed', 0, 1], ['A', 'flute', 1, 0.35]], bass: 1, drum: 'bulgar' },
      { c: 'O', drum: 'bulgar', pad: 0.04 },
    ],
  },
  {
    id: 'return',
    title: 'The Banner of the Return',
    blurb: 'Six-fourteen: the Persian columns ride for Jerusalem, and the exiles ride with them.',
    ages: ['late'], moods: ['war', 'battle'],
    key: 293.66, mode: 'minor', meter: 4, bpm: 104,
    parts: {
      I: { c: '0m:4 | 7:4' },
      A: {
        m: '0:1.5 0:.5 4:1 3:.5 2:.5 | 3:1 2:1 1:2 | 0:1.5 0:.5 5:1 4:.5 3:.5 | 4:3 r:1 | 7:1.5 6:.5 5:1 4:1 | 5:1.5 4:.5 3:1 2:1 | 3:1 2:.5 1:.5 2:1 1:1 | 0:3 r:1',
        c: '0m:4 | 7:4 | 0m:2 8:2 | 7:4 | 8:4 | 5m:4 | 7:4 | 0m:4',
      },
      B: {
        m: '4:1 7:1 7:1 6:.5 5:.5 | 6:1.5 5:.5 4:2 | 3:1 6:1 6:1 5:.5 4:.5 | 5:1.5 4:.5 3:2 | 2:1 3:1 4:1 5:1 | 6:1 7:1 8:2 | 9:1 8:1 7:1 6:.5 5:.5 | 4:2 7:2',
        c: '0m:4 | 3:4 | 10:4 | 5m:4 | 0m:4 | 10:4 | 8:4 | 7:2 0m:2',
      },
      O: { c: '7:4 | 0m:4' },
    },
    drums: { ride: 'D.TkD.Tk', toll: 'B...B...' },
    form: [
      { c: 'I', drum: 'toll', pad: 0.06 },
      { c: 'A', m: [['A', 'strings', 0, 1]], bass: 1, drum: 'ride' },
      { c: 'A', m: [['A', 'horn', 0, 1]], bass: 1, drum: 'ride' },
      { c: 'B', m: [['B', 'horn', 0, 1]], bass: 1, drum: 'ride', pad: 0.07 },
      { c: 'B', m: [['B', 'strings', 0, 1], ['B', 'reed', 0, 0.4]], bass: 1, drum: 'ride', pad: 0.07 },
      { c: 'A', m: [['A', 'strings', 0, 1], ['A', 'horn', 0, 0.6]], bass: 1, drum: 'ride' },
      { c: 'O', drum: 'toll', pad: 0.06 },
    ],
  },
  {
    id: 'negev',
    title: 'Dawn over the Negev',
    blurb: 'The first light on a new kibbutz. Horns and a halil, in Adonai Malakh.',
    ages: ['state'], moods: ['peace'],
    key: 293.66, mode: 'adonai', meter: 4, bpm: 76,
    parts: {
      I: { c: '0:4 | 10:4' },
      A: {
        m: '4:2 3:1 2:1 | 3:1.5 2:.5 1:2 | 2:1 3:1 4:1 5:1 | 4:3 r:1 | 7:2 6:1 5:1 | 4:1.5 5:.5 4:1 3:1 | 2:1 1:1 3:1 1:1 | 0:3 r:1',
        c: '0:4 | 10:4 | 9m:4 | 0:4 | 5:4 | 7m:4 | 10:4 | 0:4',
      },
      B: {
        m: '7:1 8:1 9:2 | 8:1 7:1 6:2 | 5:1 6:1 7:2 | 4:3 r:1 | 3:1 4:1 5:1.5 4:.5 | 3:1 2:1 4:2 | 3:1.5 2:.5 1:1 2:1 | 0:4',
        c: '0:4 | 10:4 | 5:4 | 0:4 | 2m:4 | 0:4 | 2m:2 7m:2 | 0:4',
      },
      O: { c: '10:4 | 0:4' },
    },
    drums: { soft: 'D.......' },
    form: [
      { c: 'I', harp: 1, pad: 0.045 },
      { c: 'A', m: [['A', 'flute', 0, 1]], harp: 1, bass: 1 },
      { c: 'A', m: [['A', 'horn', 0, 0.9]], harp: 1, bass: 1, pad: 0.055 },
      { c: 'B', m: [['B', 'horn', 0, 0.9]], bass: 1, drum: 'soft', pad: 0.06 },
      { c: 'B', m: [['B', 'flute', 0, 1]], harp: 1, bass: 1, drum: 'soft' },
      { c: 'A', m: [['A', 'horn', 0, 0.8], ['A', 'flute', 1, 0.4]], harp: 1, bass: 1, drum: 'soft' },
      { c: 'O', harp: 1, pad: 0.045 },
    ],
  },
  {
    id: 'road',
    title: 'The Road to Jerusalem',
    blurb: 'Bab al-Wad, 1948: a minor hora for the convoys, horns over a snare.',
    ages: ['state'], moods: ['war', 'battle'],
    key: 220, mode: 'minor', meter: 4, bpm: 126,
    parts: {
      I: { c: '0m:4 | 7:4' },
      A: {
        m: '0:.5 1:.5 2:.5 3:.5 4:1 4:1 | 5:.5 4:.5 3:.5 2:.5 4:2 | 3:.5 2:.5 1:.5 0:.5 1:1 2:1 | 1:1 0:1 -1#:2 | 0:.5 1:.5 2:.5 3:.5 4:1 7:1 | 6:.5 5:.5 4:.5 3:.5 2:2 | 3:.5 2:.5 1:.5 2:.5 1:1 -1#:1 | 0:2 r:2',
        c: '0m:4 | 5m:2 0m:2 | 5m:2 0m:2 | 7:4 | 0m:4 | 10:2 3:2 | 5m:2 7:2 | 0m:4',
      },
      B: {
        m: '4:1 4:.5 5:.5 6:1 7:1 | 8:1 7:.5 6:.5 7:2 | 7:1 7:.5 6:.5 5:1 6:1 | 4:3 r:1 | 3:1 3:.5 4:.5 5:1 3:1 | 2:1 2:.5 3:.5 4:1 2:1 | 1:1 2:.5 1:.5 0:1 -1#:1 | 0:3 r:1',
        c: '0m:4 | 10:4 | 8:4 | 7:4 | 5m:4 | 3:4 | 7:4 | 0m:4',
      },
      O: { c: '7:4 | 0m:4' },
    },
    drums: { hora: 'D.S.D.SS', roll: 'SSSSSSSS' },
    form: [
      { c: 'I', drum: 'hora', pad: 0.05 },
      { c: 'A', m: [['A', 'horn', 0, 1]], bass: 1, drum: 'hora' },
      { c: 'A', m: [['A', 'horn', 0, 1], ['A', 'reed', 1, 0.4]], bass: 1, drum: 'hora' },
      { c: 'B', m: [['B', 'horn', 0, 1], ['B', 'strings', -1, 0.5]], bass: 1, drum: 'hora', pad: 0.065 },
      { c: 'B', m: [['B', 'horn', 0, 1]], bass: 1, drum: 'hora', pad: 0.065 },
      { c: 'A', m: [['A', 'horn', 0, 1], ['A', 'strings', 0, 0.5], ['A', 'reed', 1, 0.35]], bass: 1, drum: 'hora' },
      { c: 'O', drum: 'roll', pad: 0.06 },
    ],
  },
];

// The catalogue as the settings window lists it.
export function songCatalogue() {
  return SONGS.map((s) => ({
    id: s.id, title: s.title, blurb: s.blurb,
    age: SONG_AGES[s.ages[0]], ages: s.ages.slice(), moods: s.moods.slice(),
  }));
}
