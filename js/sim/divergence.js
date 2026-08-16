// Judaea Universalis — the road not taken (SPEC §89). DOM-free.
//
// The game generates an alternate history every time it is played and then
// never shows it to anyone. The player knows they refused Pompey; the game
// knows it too, in a flag; nothing ever puts the two records side by side.
//
// This module keeps the ledger. It needs no new authoring to do it, because
// every scripted event already carries the historical course: `aiOption` is
// the option the AI takes when it holds this decision, and the §70 decider
// notices are built on exactly that promise — "the historical course simply
// happens". So when the player resolves a spine event with any option OTHER
// than its aiOption, that is a departure from the record, and both halves are
// already on the card: what history did, and what we did instead.
//
// Content may add a `historical:` line to say what the record actually looked
// like in prose. It is optional; without it the ledger prints the option
// labels, which is enough to read the shape of the divergence.
//
// Everything lives on `game.divergences` as plain data. An older save has no
// array and simply starts recording from the moment it is loaded.

import { doctrineView, doctrineEpithet } from './doctrine.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/divergence]', ...args);
}
function num(v, d = 0) { return Number.isFinite(v) ? v : d; }

// A ledger this long is a book nobody reads; the spine of a campaign is
// nowhere near it.
const MAX_ENTRIES = 200;

// The alternate strands the content already gates on. When one of these flags
// is set, the campaign is running on rails history never laid — so the page
// can name the world the player is actually in, not merely the turnings that
// got them there.
export const STRANDS = [
  { flag: 'eagleRefused', era: '67 BCE', name: 'The Eagle Refused',
    blurb: 'Pompey came to organize the East and one small kingdom shut its gates and kept them shut. The settlement of the East has a hole in it shaped like Judaea.' },
  { flag: 'crownHealed', era: '67 BCE', name: 'The Crown Healed',
    blurb: 'The brothers\' war ended in one crown rather than a Roman arbitration, and the Hasmonean line goes on.' },
  { flag: 'parthianAccord', era: '67 BCE', name: 'The Eastern Accord',
    blurb: 'The buffer kingdom took the Parthian hand. The Euphrates is a road, not a border.' },
  { flag: 'hasmoneanHolds', era: '40 BCE', name: 'The Hasmonean Restoration',
    blurb: 'Antigonus held Jerusalem against the Senate\'s decree and the legions\' schedule. There is no Herodian kingdom.' },
  { flag: 'secondKingdom', era: '66 CE', name: 'The Second Kingdom',
    blurb: 'The House stands, the Revolt won, and a Jewish state governs where Josephus recorded ash.' },
  { flag: 'sanhedrinRule', era: '66 CE', name: 'The Chamber of Hewn Stone',
    blurb: 'Sovereignty was seated in a council rather than on a head: a commonwealth, not a kingdom.' },
  { flag: 'kingSimon', era: '66 CE', name: 'The Crowned Revolt',
    blurb: 'The sword that made the state was given a diadem to hold it.' },
  { flag: 'parthianPact', era: '66 CE', name: 'The Arsacid Pact',
    blurb: 'Judaea took the outstretched hand from beyond the Euphrates and became the west march of the east.' },
  { flag: 'redemptionEra', era: '132 CE', name: 'The Years of the Redemption',
    blurb: 'The documents are dated by the Redemption of Israel: the state has made a claim it must now be able to keep.' },
  { flag: 'altarRaised', era: '132 CE', name: 'The Altar Raised',
    blurb: 'The Nasi raised the altar with his own hands. Sixty years after the burning, there is a service on the Mount again.' },
  { flag: 'neverRenamed', era: '132 CE', name: 'The Name That Stood',
    blurb: 'No clerk ever struck Judaea from the rolls. There is no Syria Palaestina.' },
  { flag: 'westernMarchOfTheEast', era: '614 CE', name: 'The Western Wall of the East',
    blurb: 'The Return is written down as Ctesiphon\'s Levantine flank: the passes watched from Jerusalem, and neither court alone against an emperor again.' },
  { flag: 'kingdomApart', era: '614 CE', name: 'A Kingdom Apart',
    blurb: 'Neither empire\'s road runs through it. A third power in the seventh-century Levant, paid for out of everything else.' },
  { flag: 'everyonePrefersItIntact', era: '614 CE', name: 'The Kingdom Everyone Prefers Intact',
    blurb: 'Safe roads, honest coin, judgments foreigners accept. Any empire could take it in a season; all of them have done the arithmetic.' },
  { flag: 'kingdomOfTheAltar', era: '66 CE', name: 'The Kingdom of the Altar',
    blurb: 'A sacral monarchy that dates by the Temple and receives empires as a courtesy. Rome files it under unfinished business.' },
  { flag: 'commonwealthOfTheChamber', era: '66 CE', name: 'The Commonwealth of the Chamber',
    blurb: 'Sovereignty written into a council rather than onto a head: no one to bribe, no one to marry, no single death that changes anything.' },
  { flag: 'worthMoreStanding', era: '66 CE', name: 'Worth More Standing',
    blurb: 'A state that made itself expensive to invade and profitable to leave alone. Three imperial treasuries agree.' },
  { flag: 'charterDavidic', era: '614 CE', name: 'The Davidic Charter',
    blurb: 'The Return was written down as a polity with a scepter, not a permission that could be withdrawn.' },
  { flag: 'greaterVictory48', era: '1948', name: 'The Lines We Drew Ourselves',
    blurb: 'There is no Green Line. The war ended where the brigades stopped, and they stopped well past every map the diplomats prepared.' },
  { flag: 'tenMileState', era: '1948', name: 'The Ten-Mile State',
    blurb: 'The state survived, and it is a coastal strip. Everything after is played from there.' },
  { flag: 'earlyPeace48', era: '1948', name: 'The Early Peace',
    blurb: 'Peace was made before the lines hardened — the one thing the real 1949 never managed.' },
  { flag: 'yokeReversed', era: '167 BCE', name: 'The Yoke Reversed',
    blurb: 'Antioch pays as Jerusalem paid. The empire that outlawed the Law is the tributary now.' },
  { flag: 'syrianProtectorate', era: '167 BCE', name: 'The Syrian Protectorate',
    blurb: 'A Jewish protectorate over Syria: the Seleucid diadem is held, not worn, by a Maccabee.' },
  { flag: 'diademRefused', era: '167 BCE', name: 'The Diadem Refused',
    blurb: 'The crown of Asia was cast down and the army came home to Zion. A kingdom that chose to stay one.' },
];

// The historical course of an event: the option `aiOption` names. Content may
// give it as a number or as a function of ctx (both already supported by the
// event engine), so it is resolved the same way here.
export function historicalOption(ctx, ev) {
  if (!ev || !Array.isArray(ev.options) || !ev.options.length) return 0;
  let idx = 0;
  try {
    idx = typeof ev.aiOption === 'function' ? (ev.aiOption(ctx) | 0) : (ev.aiOption | 0);
  } catch (e) { warnOnce('aiopt:' + ev.id, 'aiOption threw for', ev.id, e); idx = 0; }
  return Math.max(0, Math.min(ev.options.length - 1, idx));
}

// Only the spine is worth recording. A `major` event is the content's own
// word for "this mattered"; an explicit `historical:` line is an author
// insisting on it. Everything else is texture and stays out of the ledger.
function worthRecording(ev) {
  return !!ev && (ev.major === true || typeof ev.historical === 'string');
}

// …and the pages that are not the record's to keep (SPEC §252). A card
// carrying `verdict` is ONE ROAD of a drawn outcome — who won the civil war,
// which claimant the army acclaimed — and its siblings are the other roads.
// Exactly one of them fires and the rest retire in the same month, so listing
// the retirements under "Chapters that never came" would do two wrong things
// at once: it would report a page as missing that was never owed to this
// world, and it would tell the reader that the page which DID come was drawn
// rather than fated. A campaign should feel like a century, not like a table
// of odds it can audit afterwards.
function isVerdictRoad(ev) {
  return !!ev && typeof ev.verdict === 'string' && !!ev.verdict;
}

// Called from resolveEventOption once the option's effects have run.
export function noteEventChoice(ctx, ev, idx) {
  try {
    if (!worthRecording(ev)) return;
    const g = ctx.game;
    const hist = historicalOption(ctx, ev);
    if (idx === hist) return; // the record and the campaign agree
    const chose = ev.options[idx];
    const instead = ev.options[hist];
    if (!chose || !instead) return;
    if (!Array.isArray(g.divergences)) g.divergences = [];
    if (g.divergences.some((d) => d && d.id === ev.id)) return; // once per event
    g.divergences.push({
      id: ev.id,
      y: g.date.y, m: g.date.m,
      title: ev.title || ev.id,
      // What the record says happened. The authored line if there is one,
      // otherwise the label of the course history actually took.
      historical: typeof ev.historical === 'string' ? ev.historical : (instead.label || ''),
      histLabel: instead.label || '',
      chose: chose.label || '',
    });
    if (g.divergences.length > MAX_ENTRIES) g.divergences.shift();
    try {
      ctx.helpers.chronicle(ctx, 'divergence',
        'The record parts from the road: where the chronicles have "' + (instead.label || '—')
        + '", this age has "' + (chose.label || '—') + '".');
    } catch (e) { warnOnce('chron', 'divergence chronicle failed', e); }
  } catch (e) { warnOnce('note', 'noteEventChoice failed', e); }
}

// A dated chapter whose month arrived in a world it no longer fits (the §75
// `when` gate, or a war already settled) is a divergence of a different kind:
// not a choice made differently, but a page of the record that never got
// written at all.
export function noteRetired(ctx, ev, why) {
  try {
    if (!worthRecording(ev) || isVerdictRoad(ev)) return;
    const g = ctx.game;
    if (!Array.isArray(g.retiredChapters)) g.retiredChapters = [];
    if (g.retiredChapters.some((r) => r && r.id === ev.id)) return;
    g.retiredChapters.push({
      id: ev.id,
      y: g.date.y, m: g.date.m,
      title: ev.title || ev.id,
      why: why || 'the world it needed no longer exists',
    });
    if (g.retiredChapters.length > MAX_ENTRIES) g.retiredChapters.shift();
  } catch (e) { warnOnce('retire', 'noteRetired failed', e); }
}

// The live alternate strands — the worlds the campaign is actually running in.
export function liveStrands(ctx) {
  const g = ctx.game;
  const flags = (g && g.flags) || {};
  return STRANDS.filter((s) => {
    const v = flags[s.flag];
    return v !== undefined && v !== null && v !== false && v !== 0;
  }).map((s) => ({ era: s.era, name: s.name, blurb: s.blurb }));
}

// The page's read (init.js getDivergence): display data only.
export function divergenceView(ctx) {
  try {
    const g = ctx.game;
    if (!g) return null;
    const entries = (Array.isArray(g.divergences) ? g.divergences : [])
      .map((d) => ({ ...d }))
      .sort((a, b) => (a.y - b.y) || (a.m - b.m));
    const retired = (Array.isArray(g.retiredChapters) ? g.retiredChapters : [])
      .map((r) => ({ ...r }))
      .sort((a, b) => (a.y - b.y) || (a.m - b.m));
    const dox = doctrineView(ctx);
    return {
      bookmark: g.bookmarkId || '',
      entries,
      retired,
      strands: liveStrands(ctx),
      epithet: doctrineEpithet(ctx),
      axes: dox ? dox.axes.map((a) => ({
        name: a.name, label: a.label, score: a.score, band: a.band,
        hi: a.hi, lo: a.lo, blurb: a.blurb,
      })) : [],
      count: entries.length,
    };
  } catch (e) { warnOnce('view', 'divergenceView failed', e); return null; }
}

// One line for the verdict card and the chronicle: how far this campaign
// walked from the record.
export function divergenceSummary(ctx) {
  const v = divergenceView(ctx);
  if (!v) return '';
  const n = v.count;
  const strands = v.strands.length;
  if (!n && !strands) return 'This age followed the record it was given.';
  const bits = [];
  if (n) bits.push(n + ' turning' + (n === 1 ? '' : 's') + ' where the chronicles say otherwise');
  if (strands) bits.push(strands + ' world' + (strands === 1 ? '' : 's') + ' history never wrote');
  return 'The road not taken: ' + bits.join(', ') + '.'
    + (v.epithet ? ' The realm that walked it: ' + v.epithet.toLowerCase() + '.' : '');
}
