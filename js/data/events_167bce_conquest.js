// Judaea Universalis — the wars the conquest took, 146 BCE–7 BCE (SPEC §257).
// Content package. Zero imports; all effects run through ctx.helpers at
// runtime. Concatenated onto EVENTS_167 by the era registry. BCE years are
// negative.
//
// §256 moved the boundary. This package is the two things §256 left undone,
// reported together: *make the Roman conquest of Greece and Egypt absolute —
// they still don't conquer everything, too few wars.*
//
// Both halves of that are right, and the second is the diagnosis of the first.
//
// TOO FEW WARS. §256 shipped one declared war — the Third Punic — and settled
// everything else by transfer. Greece changed hands in a card about a sack;
// Egypt changed hands in a card about a queen's death. The Republic did not
// acquire the Mediterranean by having a good year: it acquired it in named
// wars, most of which it began badly, several of which it nearly lost, and two
// of which — the Mithridatic and the one that ends at Actium — are the largest
// events in the chapter's second century and were not on the map at all. A
// player watching the boundary jump has been told an outcome. A player watching
// Mithridates take Asia and Greece in one season, and Sulla take them back
// four years later with an army his own government has outlawed, has been shown
// a war.
//
// STILL DON'T CONQUER EVERYTHING. Measured, not felt. Fire every dated card in
// the chapter and read the map at 6 CE against the two boards this chapter is
// supposed to hand to the chapters after it (js/data/political_maps.js, and
// the 40 and 66 bookmarks' own owners tables):
//
//   Pontus            Sinope, Trapezus, Phasis — still Mithridates', in a
//                     chapter with three Mithridatic wars in it and no Pontic
//                     card. Roman on the 40 board.
//   Anatolia          Caesarea Mazaca, Tyana, Iconium, Melitene — Armenian,
//                     Seleucid and Commagenian. Roman on the 40 board: Pompey's
//                     settlement organized every one of them and this chapter's
//                     Pompey card listed none.
//   Damascus, Emesa   held by the SOUTHERN Seleucid crown (`CYZ`), which the
//                     same card did not name as a loser, so Pompey annexed
//                     Syria around the two cities he actually took it from.
//   Caria             Halicarnassus, still a free Greek city sixty years after
//                     Aristonicus.
//   Celtiberia        Toletum, still Celtiberian, in a chapter whose own card
//                     says Celtiberia is finished.
//   The Rhine bank    Colonia Agrippina, Mogontiacum, Batavia, Atuatuca,
//                     Argentorate — Belgic and Sequanian. Roman on the 40
//                     board, because Caesar took the west bank and this
//                     chapter's Alesia list stopped short of the river.
//   The northwest     Bracara and Asturica: the Cantabrian war is 29–19, well
//                     inside a chapter that runs to 6 CE.
//   The Alps          Virunum, Augusta Vindelicorum — 16–15.
//   Illyricum         Delminium, Siscia — Octavian's own war, 35–33.
//   Moesia            Novae, Singidunum, Sirmium, Naissus — 29–28.
//   Pannonia          Carnuntum, Aquincum — 12–9.
//   Germania          Chatti, Teutoburgium, Frisia — a province from 7 BCE,
//                     and this chapter's last page is 6 CE.
//
// Eighteen cards. TEN of them belong to one of five declared wars, each with a
// card that opens it and puts armies on the board and a card that ends it and
// moves the boundary: the Achaean war, the first Mithridatic, the third, the
// Illyrian, and the war declared on a foreign queen. Two of those five settle
// in §256's own cards, which is why that package's Corinth and Alexandria cards
// now call `endWar` — Greece and Egypt are each taken BY a war rather than
// announced. The other eight cards are the Augustan decades, where what is
// being fought over is a frontier rather than a rival, and there is nobody left
// to declare war on.
//
// WHAT IS DELIBERATELY NOT TAKEN, because the boards say so and because it is
// true: Thrace stays a client crown at Serdica and Philippopolis (annexed 46
// CE, two chapters away). Commagene keeps Samosata (72 CE). Osroene keeps
// Edessa and Carrhae, which were Parthia's business. Ituraea keeps Chalcis.
// The Bosporus and Mauretania are client kingdoms and stay kingdoms. Armenia is
// beaten twice here and annexed never, which is the entire point of Armenia.
//
// Source spine: Pausanias VII.14–16 for the Achaean war; Strabo XIV.1.38 and
// Justin XXXVI for Aristonicus; Appian, Mithridatica, throughout, with
// Plutarch's Sulla for Chaeronea and Orchomenus and his Lucullus and Pompey for
// the rest; Memnon of Heraclea where Appian is alone; Plutarch's Antony and Dio
// L for Actium; Dio LI–LV and Velleius II for the Augustan wars; Florus II.33
// for Cantabria and II.24 for the Alps; the Res Gestae, which is a source about
// what a conquest was FOR and is read here as one; Suetonius, Claudius 1 and
// Tiberius 9 for Drusus; the trophy inscription at La Turbie (Pliny NH III.136)
// for the forty-five tribes, counted off it.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_167bce_conquest] ' + key, e || '');
}

// The letters this court answers to NOW (SPEC §135); see events_167bce_world.js.
function who(ctx, tag) {
  return (ctx && ctx.helpers && ctx.helpers.livingTag) ? ctx.helpers.livingTag(ctx, tag) : tag;
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

function safeTrigger(key, fn) {
  return function (ctx) {
    try { return !!fn(ctx); } catch (e) { warnOnce('trigger:' + key, e); return false; }
  };
}

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, tag)];
  return !!(t && t.alive !== false);
}

function crown(ctx) {
  for (const t of ['HAS', 'MLI']) {
    const held = who(ctx, t);
    if (alive(ctx, held)) return held;
  }
  return null;
}

function nudgeOpinion(ctx, a, b, d) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, a)];
  if (!t || t.alive === false) return;
  if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
  const k = who(ctx, b);
  t.opinion[k] = Math.max(-200, Math.min(200, (t.opinion[k] || 0) + d));
}

function setOpinion(ctx, a, b, val) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, a)];
  if (!t) return;
  if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
  t.opinion[who(ctx, b)] = Math.max(-200, Math.min(200, val));
}

// §111's transfer discipline, unchanged from the package this one continues:
// off the named losers only, never off a living court history did not take it
// from, and never off the player's own conquests.
function transfer(ctx, names, to, from) {
  const g = ctx.game;
  const losers = new Set([].concat(from));
  let n = 0;
  for (const name of names) {
    const p = ctx.prov && ctx.prov(name);
    if (!p || p.impassable) continue;
    if (!losers.has(p.owner)) {
      const owner = g.tags[p.owner];
      if (owner && owner.alive !== false) continue;
    }
    if (p.owner === who(ctx, to)) continue;
    ctx.helpers.changeOwner(ctx, p.canon || p.name, to);
    n++;
  }
  return n;
}

// §256's rule, carried forward: a card marks only ground its author's army is
// actually standing on.
function ifHeldBy(ctx, name, tag) {
  const p = ctx.prov && ctx.prov(name);
  return p && !p.impassable && p.owner === who(ctx, tag) ? p : null;
}

function mark(ctx, names, mod, by) {
  for (const n of [].concat(names)) {
    if (!ifHeldBy(ctx, n, by || 'ROM')) continue;
    ctx.helpers.addProvinceModifier(ctx, n, mod);
  }
}

// A foreign card's local weather, laid on the ground it happens to except the
// crown's own (SPEC §256): the border §111 draws around ownership is the border
// consequence stops at.
function stir(ctx, names, mod) {
  const me = crown(ctx);
  for (const n of [].concat(names)) {
    const p = ctx.prov && ctx.prov(n);
    if (!p || p.impassable || (me && p.owner === me)) continue;
    ctx.helpers.addProvinceModifier(ctx, n, mod);
  }
}

function warBetween(ctx, a, b) {
  const A = who(ctx, a), B = who(ctx, b);
  for (const w of (ctx.game && ctx.game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(A) >= 0 && all.indexOf(B) >= 0) return w;
  }
  return null;
}

// A war Rome opens against a court that is still standing, with the armies that
// made it a war rather than an announcement. Returns the war, or null where
// there is nobody to fight — a truce, a collar, a court already gone.
function romeGoesToWar(ctx, foe, name) {
  if (!alive(ctx, 'ROM') || !alive(ctx, foe)) return null;
  const already = warBetween(ctx, 'ROM', foe);
  if (already) return already;
  return ctx.helpers.declareWar(ctx, 'ROM', foe, name);
}

const EASTERN_COURTS = ['SEL', 'PTO', 'PAR', 'ARM', 'NAB', 'PNT', 'CMG', 'OSR', 'ITU'];
function theEastReads(ctx, d) {
  for (const t of EASTERN_COURTS) nudgeOpinion(ctx, t, 'ROM', d);
}

// ── the ground, by name ────────────────────────────────────────────────────

// Pontus, all of it: the kingdom on the 167 board, and Roman on the 40 board.
const PONTUS = ['Sinope', 'Trapezus', 'Phasis'];
// The Spanish northwest — the last corner of the peninsula, two hundred years
// after the first Roman landed on it.
const SPAIN_NORTHWEST = ['Bracara', 'Asturica'];
// Illyricum and the Save: Octavian's own war, and the base he built for the
// next one.
const ILLYRICUM = ['Delminium', 'Siscia'];
// Moesia and the Dardanian road, from Crassus' campaign to the organization of
// the province.
const MOESIA = ['Novae', 'Singidunum', 'Sirmium', 'Naissus'];
// Pannonia between the Save and the Danube.
const PANNONIA = ['Carnuntum', 'Aquincum'];
// Noricum and Raetia — one summer, two armies, forty-five tribes on a trophy.
const THE_ALPS = ['Virunum', 'Augusta Vindelicorum'];
// The west bank, which Caesar took and Agrippa and Drusus turned into a line.
const RHINE_BANK = ['Colonia Agrippina', 'Mogontiacum', 'Batavia', 'Atuatuca', 'Argentorate'];
// Germania between the Rhine and the Elbe: a province for sixteen years.
const GERMANIA = ['Frisia', 'Chatti', 'Teutoburgium'];

export const EVENTS_167_CONQUEST = [

  // ── W1 · -146 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pw_achaean_defiance',
    title: 'War Declared on Sparta, and Therefore on Rome',
    worldLabel: 'The Achaean League defies the Senate; Rome declares war',
    desc: 'The Achaean League has spent ten years being told by Roman commissioners '
      + 'which of its members it is allowed to keep, and the commissioners have just '
      + 'told it the largest thing yet: Sparta, Corinth, Argos and two more are to be '
      + 'detached from the confederacy altogether. The embassy that says so is abused '
      + 'in the street at Corinth and some of its slaves are beaten, which is as close '
      + 'to a declaration as a league of cities can come. Then the strategos Critolaus '
      + 'tours the towns cancelling debts and suspending the courts for anyone who '
      + 'enlists, which is a war measure and an admission at once: the men who will '
      + 'fight Rome have to be paid for in advance out of the property of the men who '
      + 'will not. Polybius, who is Achaean, who is in Rome, and who spends four books '
      + 'explaining why this is the worst decision his countrymen ever took, calls it a '
      + 'madness — and then records, because he is honest, that the Senate had been '
      + 'waiting for it. Metellus is already in Macedonia with the army that finished '
      + 'Andriscus, sixty miles from the Achaean frontier, and does not have to be sent '
      + 'for.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -146, m: 5 },
    world: true,
    major: true,
    when: safeTrigger('ev_pw_achaean_defiance:when', (ctx) => alive(ctx, 'ROM') && alive(ctx, 'GRC')),
    aiOption: 0,
    historical: 'The Achaean League declared war on Sparta in 146 in defiance of a Senate ruling; Metellus broke its army at Scarpheia within months.',
    options: [
      {
        label: 'Metellus does not have to be sent for',
        tooltip: 'Rome declares the Achaean War. Hellas raises the debt-cancellation army — "The Cancelled Debts" (+30% manpower, +10% morale, −35% income while it lasts) and a league host at Corinth — and Rome marches the army of Macedonia south from Thessalonica. Every eastern court cools 10, having watched a Senate arbitration end in a war.',
        effects: guard('ev_pw_achaean_defiance:0', (ctx) => {
          const h = ctx.helpers;
          if (!romeGoesToWar(ctx, 'GRC', 'The Achaean War')) return;
          h.addTagModifier(ctx, 'GRC', {
            id: 'the_cancelled_debts', name: 'The Cancelled Debts', months: -1,
            effects: { manpowerMult: 1.3, moraleMult: 1.1, incomeMult: 0.65 },
          });
          h.adjust(ctx, 'GRC', { legitimacy: 10, manpower: 6000 });
          h.spawnArmy(ctx, 'GRC', 'Corinth', {
            inf: 9, cav: 1, name: 'The League Levy',
            general: { name: 'Critolaus', fire: 1, shock: 2, maneuver: 2 },
          });
          h.spawnArmy(ctx, 'ROM', 'Thessalonica', {
            inf: 10, cav: 2, name: 'The Army of Macedonia',
            general: { name: 'Caecilius Metellus', fire: 3, shock: 3, maneuver: 3 },
          });
          theEastReads(ctx, -10);
          h.setFlag(ctx, 'achaeanWarOpens', true);
          h.chronicle(ctx, 'era', 'The Achaean League cancels its debts, raises an army and declares war on Sparta; Rome, which has been waiting, declares war on the League.');
        }),
      },
    ],
  },

  // ── W2 · -129 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pw_aristonicus',
    title: 'The Citizens of the Sun',
    worldLabel: 'Aristonicus is beaten; western Asia becomes the province of Asia',
    desc: 'Attalus left his kingdom to Rome by will and a bastard of the house named '
      + 'Aristonicus declines to be inherited. He loses the coastal cities, which are '
      + 'rich and would rather be taxed than fought over, and then does the thing that '
      + 'makes this war remembered: he goes inland, frees the slaves and the serfs of '
      + 'the interior, and calls the people who follow him Heliopolitans, citizens of '
      + 'the Sun. A Stoic philosopher, Blossius of Cumae, who had been Tiberius '
      + 'Gracchus\'s teacher and is wanted at Rome for it, comes out to join them. What '
      + 'that city of the Sun was meant to be is a question the sources are not '
      + 'interested in and historians have been arguing about ever since. It takes Rome '
      + 'three years and two consuls — one killed in an ambush and his head sent to '
      + 'Aristonicus, one dead of illness in the field — before Perperna and then '
      + 'Aquillius finish it, Aquillius by poisoning the wells of the towns that will '
      + 'not open, which is noted at the time as new. Aristonicus is strangled in the '
      + 'Tullianum. Blossius kills himself. And the province of Asia is organized: the '
      + 'richest ground Rome has ever administered, its taxes auctioned as a single '
      + 'contract in the Forum to companies of Roman knights, which is a decision that '
      + 'will cost eighty thousand Italian lives in one day sixty years from now.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -129, m: 6 },
    world: true,
    major: true,
    when: safeTrigger('ev_pw_aristonicus:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Aristonicus raised the interior of Pergamon as the Heliopolitans and was defeated in 129; Asia became a province and its taxes were farmed by publicani.',
    options: [
      {
        label: 'Organize the province and auction the taxes',
        tooltip: 'Halicarnassus passes to Rome off the Greek cities only, completing the province of Asia. Rome +250 talents and "The Contract for Asia" (+10% income permanently) — and Smyrna, Attalia and Halicarnassus carry "The Publicani" (+1 unrest, +20% tax for 300 months), which is exactly the arrangement that produces the Vespers.',
        effects: guard('ev_pw_aristonicus:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          transfer(ctx, ['Halicarnassus'], 'ROM', 'GRC');
          h.adjust(ctx, 'ROM', { treasury: 250, legitimacy: 6 });
          h.addTagModifier(ctx, 'ROM', {
            id: 'contract_for_asia', name: 'The Contract for Asia', months: -1,
            effects: { incomeMult: 1.1 },
          });
          mark(ctx, ['Smyrna', 'Attalia', 'Halicarnassus'], {
            id: 'the_publicani', name: 'The Publicani', months: 300,
            effects: { unrest: 1, taxMult: 1.2 },
          });
          if (alive(ctx, 'GRC')) h.adjust(ctx, 'GRC', { legitimacy: -10 });
          h.setFlag(ctx, 'provinceOfAsia', true);
          h.chronicle(ctx, 'era', 'Aristonicus and his citizens of the Sun are put down after three years; Asia becomes a province and its taxes are auctioned in the Forum.');
        }),
      },
    ],
  },

  // ── W3 · -88 ──────────────────────────────────────────────────────────────
  {
    id: 'ev_pw_mithridates_crosses',
    title: 'A King Who Has Been Preparing Since He Was Eleven',
    worldLabel: 'Mithridates overruns Asia and Greece; the First Mithridatic War',
    desc: 'Mithridates VI of Pontus has spent thirty years assembling the largest '
      + 'kingdom on the Black Sea, learning twenty-two languages so that he can judge '
      + 'his subjects without an interpreter, and taking small daily doses of every '
      + 'poison he can identify. Rome has spent the same thirty years being busy '
      + 'elsewhere and sending him letters. When a Roman legate he has bribed pushes a '
      + 'client king into raiding Pontic territory to recover the bribe, the king '
      + 'finally moves, and Roman Asia — a province that has been farmed by tax '
      + 'companies for forty years and hates them with a completeness the Senate has '
      + 'never troubled to measure — does not resist. It welcomes him. Cities open '
      + 'their gates; the Roman commander is taken at Pergamon and executed by having '
      + 'molten gold poured down his throat, a joke about what Rome came for. Then the '
      + 'king writes to every city in the province naming a single day, and on that day '
      + 'eighty thousand Italians — merchants, tax agents, their households, their '
      + 'children — are killed by their neighbours. Athens declares for him. His fleet '
      + 'takes the Aegean. In one season Rome has lost everything east of the Adriatic, '
      + 'and the only general who can go and get it back has just been declared a '
      + 'public enemy by his own government.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -88, m: 6 },
    world: true,
    major: true,
    when: safeTrigger('ev_pw_mithridates_crosses:when', (ctx) => alive(ctx, 'ROM') && alive(ctx, 'PNT')),
    aiOption: 0,
    historical: 'Mithridates VI overran Roman Asia in 89–88, ordered the massacre of the Italians, and sent an army into Greece; Athens joined him.',
    options: [
      {
        label: 'The province opens its gates to him',
        tooltip: 'The First Mithridatic War opens. Pontus takes "The King of Twenty-Two Languages" (+40% manpower, +15% morale, +25% income while it lasts), +25 legitimacy, and puts armies into Asia and Attica; Smyrna, Attalia and Halicarnassus take "The Vespers" (+3 unrest for 60 months) and Rome loses their revenue while the king holds them. Every eastern court warms 20 toward Pontus: somebody has finally done it.',
        effects: guard('ev_pw_mithridates_crosses:0', (ctx) => {
          const h = ctx.helpers;
          if (!romeGoesToWar(ctx, 'PNT', 'The First Mithridatic War')) return;
          h.setRuler(ctx, 'PNT', { name: 'Mithridates VI Eupator', title: 'King of Kings of Pontus', gov: 4, infl: 4, mar: 5, age: 47 });
          h.addTagModifier(ctx, 'PNT', {
            id: 'king_of_twentytwo_tongues', name: 'The King of Twenty-Two Languages', months: -1,
            effects: { manpowerMult: 1.4, moraleMult: 1.15, incomeMult: 1.25 },
          });
          h.adjust(ctx, 'PNT', { legitimacy: 25, treasury: 250, manpower: 14000, mar: 15 });
          h.spawnArmy(ctx, 'PNT', 'Smyrna', {
            inf: 14, cav: 3, name: 'The Army of Asia',
            general: { name: 'Archelaus', fire: 3, shock: 2, maneuver: 3 },
          });
          h.spawnArmy(ctx, 'PNT', 'Athens', {
            inf: 9, cav: 1, name: 'The Army of Attica',
            general: { name: 'Aristion', fire: 1, shock: 1, maneuver: 2 },
          });
          h.spawnFleet(ctx, 'PNT', 'Sinope', 8, { name: 'The Pontic Fleet' });
          stir(ctx, ['Smyrna', 'Attalia', 'Halicarnassus'], {
            id: 'the_vespers', name: 'The Vespers', months: 60,
            effects: { unrest: 3, taxMult: 0.5 },
          });
          setOpinion(ctx, 'PNT', 'ROM', -200);
          for (const t of EASTERN_COURTS) nudgeOpinion(ctx, t, 'PNT', 20);
          h.setFlag(ctx, 'firstMithridaticWar', true);
          h.chronicle(ctx, 'era', 'Mithridates takes Roman Asia in a season and Athens declares for him; eighty thousand Italians are killed on one appointed day.');
        }),
      },
    ],
  },

  // ── W4 · -86 ──────────────────────────────────────────────────────────────
  {
    id: 'ev_pw_chaeronea',
    title: 'Two Battles in Boeotia',
    worldLabel: 'Sulla destroys the Pontic armies at Chaeronea and Orchomenus',
    desc: 'Sulla has five legions, no fleet, no treasury, no government behind him — '
      + 'the one at Rome has outlawed him and sent a second army east with orders that '
      + 'include dealing with the first — and he is facing Archelaus with something '
      + 'between four and six times his numbers, depending on which ancient liar you '
      + 'prefer. At Chaeronea he wins by refusing to let the scythed chariots reach '
      + 'speed: stakes driven in ahead of the line, the front ranks opening to let them '
      + 'through, and the Roman rear applauding them past like spectators at the games, '
      + 'which Plutarch says broke the Pontic infantry\'s nerve before a spear was '
      + 'thrown. Then Archelaus is reinforced and it has to be done again at Orchomenus, '
      + 'in marshland, where the Roman line does break, and Sulla takes a standard, '
      + 'walks into the gap alone and shouts at his own men that if anyone asks where '
      + 'they left their general, they are to say at Orchomenus. They come back. The '
      + 'ditch is filled and the marsh, Plutarch says, was still giving up bows and '
      + 'helmets two hundred years later. What is left of the king\'s European army is '
      + 'a garrison in one town, and Sulla starts the long walk east to make peace with '
      + 'him quickly, because he has a civil war to get to.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -86, m: 8 },
    world: true,
    major: true,
    when: safeTrigger('ev_pw_chaeronea:when', (ctx) => alive(ctx, 'ROM') && alive(ctx, 'PNT')),
    aiOption: 0,
    historical: 'Sulla destroyed Archelaus\' armies at Chaeronea and Orchomenus in 86; Greece was cleared within the year.',
    options: [
      {
        label: 'Say that you left him at Orchomenus',
        tooltip: 'Greece is cleared: the Pontic army in Attica is destroyed, and Pontus loses 12,000 manpower, 12 legitimacy and 1 stability. Rome +20 martial points and "The Army That Was Outlawed" (+10% morale, +8% discipline for 120 months) — five legions that have now beaten a king without a government behind them, which is a fact with consequences at home.',
        effects: guard('ev_pw_chaeronea:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          for (const a of h.armiesOf(ctx, 'PNT')) {
            const p = ctx.game.provinces[a.prov];
            const n = p && (p.canon || p.name);
            if (n === 'Athens' || n === 'Corinth' || n === 'Sparta' || n === 'Thessalonica') h.removeArmy(ctx, a.id);
          }
          if (alive(ctx, 'PNT')) h.adjust(ctx, 'PNT', { manpower: -12000, legitimacy: -12, stability: -1 });
          h.adjust(ctx, 'ROM', { mar: 20, legitimacy: 8 });
          h.addTagModifier(ctx, 'ROM', {
            id: 'army_that_was_outlawed', name: 'The Army That Was Outlawed', months: 120,
            effects: { moraleMult: 1.1, disciplineMult: 1.08 },
          });
          h.setFlag(ctx, 'chaeronea', true);
          h.chronicle(ctx, 'era', 'Sulla breaks the scythed chariots at Chaeronea and fills the marsh at Orchomenus; Greece is clear, and the army that did it has been outlawed at home.');
        }),
      },
    ],
  },

  // ── W5 · -85 ──────────────────────────────────────────────────────────────
  {
    id: 'ev_pw_dardanus',
    title: 'The Peace Sulla Had to Make',
    worldLabel: 'The peace of Dardanus: Asia is Roman again, and Mithridates keeps his kingdom',
    desc: 'They meet at Dardanus on the Hellespont with two hundred ships and twenty '
      + 'thousand men drawn up behind the king and four cohorts behind the proconsul, '
      + 'and the terms are extraordinary for the position each of them is in. '
      + 'Mithridates gives back the province of Asia, hands over seventy ships and two '
      + 'thousand talents, and returns to Pontus with his crown, his kingdom and his '
      + 'title. That is all. The man who ordered eighty thousand Italians killed on an '
      + 'appointed day walks away from the war that started with it, because Sulla '
      + 'needs the army for Italy this year and cannot spend two more seasons in '
      + 'Anatolia getting a better sentence out of him. When the king offers his hand '
      + 'Sulla takes it, and Sulla\'s own officers say afterwards that they could hardly '
      + 'look. Then the proconsul turns round and fines the province he has just '
      + 'liberated twenty thousand talents — five years of back taxes and the whole cost '
      + 'of the war, from the cities that were massacring Italians eighteen months ago — '
      + 'and the cities borrow it from Roman financiers at rates that will multiply the '
      + 'debt sixfold in fourteen years. Asia is Roman again. It will take a generation '
      + 'to stop paying for the day it was not.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -85, m: 8 },
    world: true,
    major: true,
    when: safeTrigger('ev_pw_dardanus:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'The peace of Dardanus in 85 restored Asia to Rome and left Mithridates his kingdom; Sulla then fined the province 20,000 talents.',
    options: [
      {
        label: 'Take the king\'s hand and fine the province',
        tooltip: 'The war ends and Asia comes back: Smyrna, Attalia and Halicarnassus revert to Rome off Pontus only, the Vespers are lifted, and "The Twenty Thousand Talents" replaces them (+2 unrest, −30% tax for 180 months). Rome +500 talents. Pontus keeps its kingdom: the war modifier goes, −20 legitimacy, −8,000 manpower, and 70 ships handed over. Every eastern court cools 15 toward Rome, having priced what a Roman peace costs a city that was on the wrong side.',
        effects: guard('ev_pw_dardanus:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          h.endWar(ctx, 'ROM', 'PNT', 'att');
          transfer(ctx, ['Smyrna', 'Attalia', 'Halicarnassus', 'Athens', 'Corinth'], 'ROM', 'PNT');
          for (const n of ['Smyrna', 'Attalia', 'Halicarnassus']) h.removeModifier(ctx, n, 'the_vespers');
          mark(ctx, ['Smyrna', 'Attalia', 'Halicarnassus'], {
            id: 'twenty_thousand_talents', name: 'The Twenty Thousand Talents', months: 180,
            effects: { unrest: 2, taxMult: 0.7 },
          });
          h.adjust(ctx, 'ROM', { treasury: 500, legitimacy: 5 });
          if (alive(ctx, 'PNT')) {
            h.removeModifier(ctx, 'PNT', 'king_of_twentytwo_tongues');
            h.adjust(ctx, 'PNT', { legitimacy: -20, manpower: -8000, treasury: -150 });
            for (const f of Object.values(ctx.game.fleets || {})) {
              if (f && f.tag === who(ctx, 'PNT')) f.ships = Math.max(1, Math.round(f.ships * 0.3));
            }
            setOpinion(ctx, 'PNT', 'ROM', -150);
          }
          theEastReads(ctx, -15);
          h.setFlag(ctx, 'dardanus', true);
          h.chronicle(ctx, 'era', 'Sulla makes peace at Dardanus because he needs the army for Italy; Asia is Roman again and is fined twenty thousand talents for the year it was not.');
        }),
      },
    ],
  },

  // ── W6 · -69 ──────────────────────────────────────────────────────────────
  {
    id: 'ev_pw_lucullus',
    title: 'Too Many for an Embassy',
    worldLabel: 'Lucullus storms Tigranocerta; the Third Mithridatic War goes to Armenia',
    desc: 'The third war has been running four years — it began the month Nicomedes '
      + 'left Bithynia to Rome in his will and Mithridates read the will as a border '
      + 'closing — and Lucullus has done everything right and is about to discover what '
      + 'that is worth. He relieved Cyzicus by starving the besiegers instead of '
      + 'fighting them, broke the Pontic army, drove the king out of his own kingdom, '
      + 'and then, because the king had fled to his son-in-law Tigranes of Armenia and '
      + 'Tigranes declined to give him up, crossed the Euphrates with two legions into '
      + 'an empire that runs from the Caspian to the Mediterranean. At Tigranocerta — a '
      + 'capital the King of Kings built by deporting the populations of twelve Greek '
      + 'cities into it — Tigranes looks down at the Roman column and says the line '
      + 'everyone remembers: if they have come as ambassadors there are too many of '
      + 'them, and if they have come as soldiers there are too few. Lucullus takes the '
      + 'city the same day. He also, in the same years, audits the province of Asia, '
      + 'caps the interest rate at twelve per cent, forbids compounding, and clears in '
      + 'four years a debt Sulla\'s fine had multiplied sixfold — which is the single '
      + 'most useful thing any Roman does in the East in this century, and which is why '
      + 'the tax companies have his command taken away from him and given to Pompey '
      + 'before the war is finished.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -69, m: 10 },
    world: true,
    major: true,
    when: safeTrigger('ev_pw_lucullus:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Lucullus took Tigranocerta in 69 and settled the debts of Asia; the publicani had his command transferred to Pompey in 66.',
    options: [
      {
        label: 'Cap the interest and take the city',
        tooltip: 'The Third Mithridatic War is opened if it is not already running. Armenia −20 legitimacy, −1 stability and "The Cities He Deported" (−15% income, −20% manpower for 180 months); Pontus −15 legitimacy and −10,000 manpower. Asia is relieved: "The Twenty Thousand Talents" is lifted from Smyrna, Attalia and Halicarnassus four years early, and Rome takes +12 legitimacy for it and loses 150 talents the tax companies will not forgive.',
        effects: guard('ev_pw_lucullus:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          romeGoesToWar(ctx, 'PNT', 'The Third Mithridatic War');
          if (alive(ctx, 'ARM')) {
            h.adjust(ctx, 'ARM', { legitimacy: -20, stability: -1 });
            h.addTagModifier(ctx, 'ARM', {
              id: 'cities_he_deported', name: 'The Cities He Deported', months: 180,
              effects: { incomeMult: 0.85, manpowerMult: 0.8 },
            });
            setOpinion(ctx, 'ARM', 'ROM', -120);
          }
          if (alive(ctx, 'PNT')) h.adjust(ctx, 'PNT', { legitimacy: -15, manpower: -10000 });
          for (const n of ['Smyrna', 'Attalia', 'Halicarnassus']) h.removeModifier(ctx, n, 'twenty_thousand_talents');
          h.adjust(ctx, 'ROM', { legitimacy: 12, treasury: -150 });
          h.setFlag(ctx, 'tigranocerta', true);
          h.chronicle(ctx, 'era', 'Lucullus takes Tigranocerta with two legions and caps the interest rate in Asia at twelve per cent; the tax companies take his command away for the second one.');
        }),
      },
    ],
  },

  // ── W7 · -63 ──────────────────────────────────────────────────────────────
  {
    id: 'ev_pw_pompey_finishes_it',
    title: 'The King Who Could Not Be Poisoned',
    worldLabel: 'Mithridates dies at Panticapaeum; Pontus becomes a province',
    desc: 'Pompey takes the command Lucullus won the war with, and finishes it the way '
      + 'a man finishes something somebody else started: efficiently, in public, and '
      + 'with better press. He catches the king at night on the Lycus and destroys the '
      + 'last Pontic army by moonlight, and Mithridates gets away with eight hundred '
      + 'horse and then with three companions, and crosses the whole northern coast of '
      + 'the Black Sea — through country nobody has ever marched an army through — to '
      + 'his own kingdom of the Bosporus, where he is sixty-eight years old and begins '
      + 'raising another one. It is his son who ends it. Pharnaces buys the fleet and '
      + 'then the army, and the troops proclaim him outside the citadel at '
      + 'Panticapaeum. The king watches from the wall, poisons his daughters, and takes '
      + 'poison himself; and the poison does not work, because he has spent fifty years '
      + 'taking small doses of everything to make certain that it would not. So he asks '
      + 'a Gallic officer of his guard named Bituitus to do it with a sword, and '
      + 'Bituitus does. Pompey is at Jericho when the news reaches him. Pontus west of '
      + 'the Halys is joined to Bithynia as one province; the east and the Bosporus go '
      + 'to client kings; and there is no longer a power on the Black Sea that is not '
      + 'answerable to Rome.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -63, m: 3 },
    world: true,
    major: true,
    when: safeTrigger('ev_pw_pompey_finishes_it:when', (ctx) => alive(ctx, 'ROM') && alive(ctx, 'PNT')),
    aiOption: 0,
    historical: 'Mithridates VI died at Panticapaeum in 63 after his son\'s revolt; Pontus was joined to Bithynia and the Bosporus became a client kingdom.',
    options: [
      {
        label: 'Ask the Gaul to do it with a sword',
        tooltip: 'The kingdom of Pontus ceases to exist: Sinope, Trapezus and Phasis pass to Rome, and everything else the crown still held goes with them. Rome +400 talents of royal treasure, +15 legitimacy and +1 stability. The Bosporan kingdom is confirmed as a client and warms 60 toward Rome; every eastern court cools 20, because the last crown in the north that could say no to Rome has just been buried at Sinope by Rome\'s own order, with honours.',
        effects: guard('ev_pw_pompey_finishes_it:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM') || !alive(ctx, 'PNT')) return;
          h.endWar(ctx, 'ROM', 'PNT', 'att');
          transfer(ctx, PONTUS, 'ROM', 'PNT');
          if (alive(ctx, 'BOS')) {
            setOpinion(ctx, 'BOS', 'ROM', 60);
            h.setRuler(ctx, 'BOS', { name: 'Pharnaces II', title: 'King of the Bosporus', gov: 2, infl: 2, mar: 3, age: 34 });
          }
          // The crown itself, and not only its ground: the kingdom of Pontus
          // ends here. What survives it is the son's Bosporus, which is a
          // client and stays on the map as one.
          h.dissolveTag(ctx, 'PNT', 'ROM');
          h.adjust(ctx, 'ROM', { treasury: 400, legitimacy: 15, stability: 1 });
          theEastReads(ctx, -20);
          h.setFlag(ctx, 'mithridatesDead', true);
          h.chronicle(ctx, 'era', 'Mithridates, immune to his own poisons, has a Gaul of his guard kill him at Panticapaeum; Pontus becomes a province and the Black Sea has no independent crown left.');
        }),
      },
    ],
  },

  // ── W8 · -35 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pw_metulum',
    title: 'The Gangway at Metulum',
    worldLabel: 'Octavian opens the Illyrian war and is wounded on the wall',
    desc: 'Octavian needs three things before he fights Antony and Illyricum has all '
      + 'of them: an army that has done something, a reputation that is not entirely '
      + 'about proscription lists, and a base on the Save from which the Danube can be '
      + 'reached. So he goes himself, which nobody expects of him, and then does the '
      + 'thing nobody expects at all. At Metulum, the Iapydian hill town, the gangways '
      + 'run up to the wall and the storming party will not go along them; Caesar\'s '
      + 'heir walks out onto one in front of the whole army to shame them into '
      + 'following, and the gangway collapses under the weight of the men who do, and '
      + 'he comes down into the ditch with them and is hurt in the leg and the arm. He '
      + 'is on the tribunal the next morning where everybody can see him. The town '
      + 'surrenders and then changes its mind, kills its own women and children and '
      + 'burns itself; nothing of it is left to garrison. Something else is: from this '
      + 'month the veterans of the Illyrian army talk about him differently, and they '
      + 'will be the ones who decide the next war.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -35, m: 6 },
    world: true,
    when: safeTrigger('ev_pw_metulum:when', (ctx) => alive(ctx, 'ROM') && alive(ctx, 'DLM')),
    aiOption: 0,
    historical: 'Octavian opened the Illyrian war in 35, was wounded storming Metulum, and the town burned itself rather than surrender.',
    options: [
      {
        label: 'Walk out onto the gangway yourself',
        tooltip: 'Rome declares the Illyrian War on the Delmatae and marches from Salona. The Delmatae raise the hill forts — "Nothing Left to Garrison" (+20% morale, +15% manpower, −25% income while it lasts) — and Rome +8 legitimacy and +10 martial points, because the story reaches Italy before the army does.',
        effects: guard('ev_pw_metulum:0', (ctx) => {
          const h = ctx.helpers;
          if (!romeGoesToWar(ctx, 'DLM', 'The Illyrian War')) return;
          h.addTagModifier(ctx, 'DLM', {
            id: 'nothing_left_to_garrison', name: 'Nothing Left to Garrison', months: -1,
            effects: { moraleMult: 1.2, manpowerMult: 1.15, incomeMult: 0.75 },
          });
          h.adjust(ctx, 'DLM', { legitimacy: 10, manpower: 4000 });
          h.spawnArmy(ctx, 'DLM', 'Delminium', {
            inf: 7, cav: 1, name: 'The Hill Forts',
            general: { name: 'Versus', fire: 1, shock: 3, maneuver: 3 },
          });
          h.spawnArmy(ctx, 'ROM', 'Salona', {
            inf: 10, cav: 2, name: 'The Army of Illyricum',
            general: { name: 'Caesar Octavianus', fire: 2, shock: 3, maneuver: 3 },
          });
          h.adjust(ctx, 'ROM', { legitimacy: 8, mar: 10 });
          h.setFlag(ctx, 'illyrianWarOpens', true);
          h.chronicle(ctx, 'era', 'Octavian walks out onto the gangway at Metulum in front of his own army and comes down with it; the Iapydes burn the town over their families.');
        }),
      },
    ],
  },

  // ── W9 · -33 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pw_illyricum',
    title: 'The Wound at Setovia',
    worldLabel: 'Siscia falls; Illyricum is Roman and the Save has a depot on it',
    desc: 'The second and third seasons are the ones that are worth something. At '
      + 'Siscia the siege runs thirty days and the town is not destroyed, because it is '
      + 'not a punishment: it is a depot, on the river, with twenty-five cohorts left '
      + 'in it and grain bought in for an army that has not been raised yet. At Setovia '
      + 'a slingstone breaks Octavian\'s knee. He comes home with the legionary '
      + 'standards Gabinius lost to the Delmatae twenty years ago — which is the '
      + 'rehearsal for the far more famous recovery of Crassus\' standards from Parthia '
      + 'nine years later, and the man doing it has clearly worked out what standards '
      + 'are worth in a Forum — hands back the triumph he is voted, and spends the '
      + 'money on the roads and the grain dole. What Illyricum was for becomes visible '
      + 'the following spring, when the war with Antony starts and the army that fights '
      + 'it is the army that has just spent three years in the mountains under the man '
      + 'it is going to fight for.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -33, m: 8 },
    world: true,
    when: safeTrigger('ev_pw_illyricum:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Octavian took Siscia after a thirty-day siege, was wounded at Setovia in 34, and recovered the standards Gabinius had lost.',
    options: [
      {
        label: 'Keep Siscia, and take the standards home',
        tooltip: 'The Illyrian war ends. Delminium passes to Rome off the Delmatae and Siscia off the Scordisci, neither off anybody else. The Delmatae −20 legitimacy and their hill-fort levy is gone; the Scordisci −15. Rome +8 legitimacy, and Siscia carries "The Depot on the Save" (+15% tax permanently) — it was taken to be kept.',
        effects: guard('ev_pw_illyricum:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          h.endWar(ctx, 'ROM', 'DLM', 'att');
          transfer(ctx, ['Delminium'], 'ROM', 'DLM');
          transfer(ctx, ['Siscia'], 'ROM', 'SCO');
          if (alive(ctx, 'DLM')) {
            h.removeModifier(ctx, 'DLM', 'nothing_left_to_garrison');
            h.adjust(ctx, 'DLM', { legitimacy: -20, stability: -1 });
          }
          if (alive(ctx, 'SCO')) h.adjust(ctx, 'SCO', { legitimacy: -15 });
          mark(ctx, ['Siscia'], {
            id: 'depot_on_the_save', name: 'The Depot on the Save', months: -1,
            effects: { taxMult: 1.15 },
          });
          h.adjust(ctx, 'ROM', { legitimacy: 8, mar: 10 });
          h.setFlag(ctx, 'illyricumTaken', true);
          h.chronicle(ctx, 'era', 'Siscia falls after thirty days and is kept as a depot; Octavian comes home with the standards Gabinius lost and gives the triumph back.');
        }),
      },
    ],
  },

  // ── W10 · -32 ──────────────────────────────────────────────────────────────
  {
    id: 'ev_pw_war_on_the_queen',
    title: 'War Declared on a Foreign Queen',
    worldLabel: 'Rome declares war on Cleopatra; Italy swears the oath',
    desc: 'The problem with fighting Antony is that fighting Antony is a civil war, '
      + 'and Italy has had four of them in sixty years and will not be enthusiastic. '
      + 'So Octavian solves the problem with a document and a ritual. He goes to the '
      + 'temple of Vesta, takes Antony\'s will from the Vestals — which is sacrilege, '
      + 'and which he does in front of witnesses so that nobody can pretend it was not '
      + '— and reads it aloud in the Senate: Antony acknowledges Caesarion as Caesar\'s '
      + 'son, leaves enormous legacies to his children by the queen, and asks to be '
      + 'buried in Alexandria. Whether the will is genuine is a question that has been '
      + 'open for two thousand years. It does not matter, because the last clause is '
      + 'the one that works. Then war is declared — not on Antony, on Cleopatra: the '
      + 'fetial priest throws the spear into the ground of the enemy at the temple of '
      + 'Bellona, in a rite so old the Senate has to reconstruct it, and Rome is at war '
      + 'with the queen of Egypt, a foreign monarch, in a foreign war, and Antony is '
      + 'merely a Roman who has chosen to stand with her. Italy swears an oath of '
      + 'personal allegiance to Octavian — spontaneously, he writes in his own account '
      + 'of it, thirty years later. The last of Alexander\'s kingdoms is now the enemy '
      + 'of the Roman people by statute and by rite, which is a thing that had to be '
      + 'arranged and was.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -32, m: 10 },
    world: true,
    major: true,
    when: safeTrigger('ev_pw_war_on_the_queen:when', (ctx) => alive(ctx, 'ROM') && alive(ctx, 'PTO')),
    aiOption: 0,
    historical: 'Octavian read Antony\'s will in the Senate and had war declared on Cleopatra by the fetial rite in 32; Italy swore the oath of allegiance.',
    options: [
      {
        label: 'Throw the spear at the temple of Bellona',
        tooltip: 'Rome declares war on Ptolemaic Egypt, and it is a foreign war rather than a civil one: Rome +12 legitimacy, +1 stability and "The Oath of All Italy" (+15% manpower, +10% morale for 120 months). Egypt raises the fleet the war will be decided by — "The Queen\'s Squadron" (+20% naval, +15% income, −10% morale) — and two hundred hulls at Alexandria.',
        effects: guard('ev_pw_war_on_the_queen:0', (ctx) => {
          const h = ctx.helpers;
          if (!romeGoesToWar(ctx, 'PTO', 'The War with the Queen of Egypt')) return;
          h.adjust(ctx, 'ROM', { legitimacy: 12, stability: 1 });
          h.addTagModifier(ctx, 'ROM', {
            id: 'oath_of_all_italy', name: 'The Oath of All Italy', months: 120,
            effects: { manpowerMult: 1.15, moraleMult: 1.1 },
          });
          h.addTagModifier(ctx, 'PTO', {
            id: 'the_queens_squadron', name: 'The Queen\'s Squadron', months: -1,
            effects: { navalMult: 1.2, incomeMult: 1.15, moraleMult: 0.9 },
          });
          h.spawnFleet(ctx, 'PTO', 'Alexandria', 14, { name: 'The Queen\'s Squadron' });
          h.spawnArmy(ctx, 'PTO', 'Alexandria', {
            inf: 12, cav: 2, name: 'The Army of the Two Commanders',
            general: { name: 'Marcus Antonius', fire: 3, shock: 4, maneuver: 2 },
          });
          setOpinion(ctx, 'PTO', 'ROM', -200);
          theEastReads(ctx, -10);
          h.setFlag(ctx, 'warOnTheQueen', true);
          h.chronicle(ctx, 'era', 'Antony\'s will is taken from the Vestals and read in the Senate; the fetial spear is thrown, and Rome is at war with the queen of Egypt rather than with a Roman.');
        }),
      },
    ],
  },

  // ── W11 · -31 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pw_actium',
    title: 'The Squadron That Went Through the Line',
    worldLabel: 'Actium: the eastern fleet is lost and the army changes sides',
    desc: 'Agrippa wins the campaign before the battle by taking Methone and Leucas '
      + 'and Patrae and closing the sea road to Egypt, so that by the end of the summer '
      + 'the largest army in the world is sitting in a marsh at the mouth of the '
      + 'Ambracian Gulf with malaria in it and no grain coming in, and a third of the '
      + 'rowers are dead. The council decides to break out. On the second of September '
      + 'the fleet comes out of the gulf and the two lines sit and look at each other '
      + 'for most of the morning, because Antony\'s ships are bigger and slower and '
      + 'cannot chase, and Octavian\'s are smaller and faster and will not close. Then '
      + 'the wind gets up in the afternoon, the northern wing extends, a gap opens in '
      + 'the middle of it, and the queen\'s sixty ships — which have been lying behind '
      + 'the line all day with the war chest aboard, which was the plan — hoist sail '
      + 'and go straight through it and away south. Antony leaves his flagship, takes a '
      + 'quinquereme, and follows her. The fleet he has left behind fights on for '
      + 'several hours and then surrenders, and the nineteen legions on shore wait a '
      + 'week for a commander who is not coming and then change sides entire, without '
      + 'a battle, on terms. Whether it was a breakout that half-succeeded or a defeat '
      + 'dressed up as one is the oldest argument in Roman history. What is not in '
      + 'doubt is the arithmetic the next morning: one man now has every legion.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -31, m: 9 },
    world: true,
    major: true,
    when: safeTrigger('ev_pw_actium:when', (ctx) => alive(ctx, 'ROM') && alive(ctx, 'PTO')),
    aiOption: 0,
    historical: 'Actium was fought on 2 September 31; Cleopatra\'s squadron broke out, Antony followed, and the land army surrendered a week later.',
    options: [
      {
        label: 'The wind gets up in the afternoon',
        tooltip: 'Egypt loses the war at sea: its fleets are cut to a third, its army outside Egypt dissolves, −25 legitimacy, −2 stability, −15,000 manpower, and "The Legions That Changed Sides" (−30% manpower, −20% morale) until the end. Rome +25 martial points, +10 legitimacy and 250 talents of captured pay chest. Every eastern court cools 12 toward Egypt, which is what courts do.',
        effects: guard('ev_pw_actium:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM') || !alive(ctx, 'PTO')) return;
          const egypt = who(ctx, 'PTO');
          for (const f of Object.values(ctx.game.fleets || {})) {
            if (f && f.tag === egypt) f.ships = Math.max(1, Math.round(f.ships * 0.33));
          }
          for (const a of h.armiesOf(ctx, 'PTO')) {
            const p = ctx.game.provinces[a.prov];
            if (!p || p.owner !== egypt) h.removeArmy(ctx, a.id);
          }
          h.adjust(ctx, 'PTO', { legitimacy: -25, stability: -2, manpower: -15000, treasury: -200 });
          h.addTagModifier(ctx, 'PTO', {
            id: 'legions_that_changed_sides', name: 'The Legions That Changed Sides', months: -1,
            effects: { manpowerMult: 0.7, moraleMult: 0.8 },
          });
          h.removeModifier(ctx, 'PTO', 'the_queens_squadron');
          h.adjust(ctx, 'ROM', { mar: 25, legitimacy: 10, treasury: 250 });
          for (const t of EASTERN_COURTS) nudgeOpinion(ctx, t, 'PTO', -12);
          h.setFlag(ctx, 'actium', true);
          h.chronicle(ctx, 'era', 'The queen\'s squadron goes through the line at Actium and Antony follows; the fleet surrenders and nineteen legions change sides on terms.');
        }),
      },
    ],
  },

  // ── W12 · -28 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pw_moesia',
    title: 'The Spoils He Was Not Allowed to Dedicate',
    worldLabel: 'Crassus takes Moesia; the Danube is the frontier',
    desc: 'Marcus Licinius Crassus — grandson of the one who died at Carrhae — is sent '
      + 'against the Bastarnae, who have crossed the Danube into Thrace, and does the '
      + 'whole thing in two campaigning seasons: beats them, kills their king Deldo '
      + 'with his own hand in the fighting, takes the Moesian towns, storms the '
      + 'Dardanian country, and brings the Roman frontier to the Danube along its '
      + 'entire lower course, which is where it will stay for four hundred years. Then '
      + 'he asks to dedicate the spolia opima — the arms of an enemy commander killed '
      + 'in single combat by a Roman commander, an honour claimed three times in seven '
      + 'centuries and never by anyone who was not the head of the state. The princeps '
      + 'discovers, with excellent timing, a linen corselet in a temple bearing an '
      + 'inscription which proves that the honour requires a commander holding his own '
      + 'auspices, which Crassus, technically, as a proconsul under a superior, does '
      + 'not. Crassus is voted a triumph, celebrates it, and is never heard of again in '
      + 'any source, at any date, for anything. The frontier stays.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -28, m: 6 },
    world: true,
    when: safeTrigger('ev_pw_moesia:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'M. Licinius Crassus campaigned on the lower Danube in 29–28, killed the Bastarnian king Deldo in single combat, and was refused the spolia opima.',
    options: [
      {
        label: 'Voted a triumph, refused the corselet',
        tooltip: 'Novae passes to Rome off the Thracians, Singidunum and Sirmium off the Scordisci, Naissus off the Dardani — none of it off anybody else, and the Odrysian crown keeps Serdica and Philippopolis, because Thrace is a client kingdom for another seventy-four years. The Scordisci −20 legitimacy, the Dardani −20 and −1 stability. Rome +100 talents and +8 legitimacy.',
        effects: guard('ev_pw_moesia:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          transfer(ctx, ['Novae'], 'ROM', 'THR');
          transfer(ctx, ['Singidunum', 'Sirmium'], 'ROM', 'SCO');
          transfer(ctx, ['Naissus'], 'ROM', 'DRD');
          if (alive(ctx, 'SCO')) h.adjust(ctx, 'SCO', { legitimacy: -20, stability: -1 });
          if (alive(ctx, 'DRD')) h.adjust(ctx, 'DRD', { legitimacy: -20, stability: -1 });
          if (alive(ctx, 'THR')) {
            h.adjust(ctx, 'THR', { legitimacy: -10 });
            setOpinion(ctx, 'THR', 'ROM', 40);
          }
          h.adjust(ctx, 'ROM', { treasury: 100, legitimacy: 8 });
          h.setFlag(ctx, 'moesiaTaken', true);
          h.chronicle(ctx, 'era', 'Crassus kills the Bastarnian king with his own hand, brings the frontier to the Danube, and is refused the spoils on a technicality found in a temple.');
        }),
      },
    ],
  },

  // ── W13 · -25 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pw_galatia',
    title: 'A Kingdom Left by a King Killed by a Widow',
    worldLabel: 'Amyntas dies in ambush; Galatia and the Anatolian interior are annexed',
    desc: 'Amyntas of Galatia is the last of the useful client kings of the Anatolian '
      + 'interior — he backed Antony, changed sides at Actium in good time, and was '
      + 'confirmed in a kingdom that runs from the Halys to the Pisidian mountains. He '
      + 'dies putting down the Homonadenses, a highland people of the Taurus who have '
      + 'no towns worth the name and no interest in being anybody\'s subjects, and the '
      + 'ambush that kills him is arranged, Strabo says, by the widow of a chief he had '
      + 'executed. He leaves no arrangement anyone can work with, and Rome does not '
      + 'look for one: Galatia becomes a province in the same year, governed from '
      + 'Ancyra, and the Lycaonian plain and the road through Iconium go with it. The '
      + 'Homonadenses themselves are dealt with a generation later by a governor of '
      + 'Syria who blockades their valleys, starves out four thousand men, and '
      + 'distributes them among the cities of the neighbouring provinces so that they '
      + 'will never again be one people — which works, and is the last time an '
      + 'independent people exists anywhere between the Aegean and the Euphrates.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -25, m: 5 },
    world: true,
    when: safeTrigger('ev_pw_galatia:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Amyntas of Galatia was killed by the Homonadenses in 25; his kingdom was annexed as the province of Galatia.',
    options: [
      {
        label: 'Do not look for a successor',
        tooltip: 'Iconium passes to Rome, off the Seleucid rump or a dead court only, and Ancyra carries "The Province of Galatia" (+15% tax permanently). Rome +80 talents and +6 legitimacy. Every eastern court cools 10: the estates Rome inherits are no longer even being left to it.',
        effects: guard('ev_pw_galatia:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          transfer(ctx, ['Iconium'], 'ROM', ['SEL', 'GRC', 'CYZ']);
          mark(ctx, ['Ancyra'], {
            id: 'province_of_galatia', name: 'The Province of Galatia', months: -1,
            effects: { taxMult: 1.15 },
          });
          h.adjust(ctx, 'ROM', { treasury: 80, legitimacy: 6 });
          theEastReads(ctx, -10);
          h.setFlag(ctx, 'galatiaAnnexed', true);
          h.chronicle(ctx, 'era', 'Amyntas is killed in a Taurus ambush arranged by a widow; Galatia is annexed, and the Anatolian interior stops being anybody\'s kingdom.');
        }),
      },
    ],
  },

  // ── W14 · -19 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pw_cantabria',
    title: 'Two Hundred Years for a Corner',
    worldLabel: 'The Cantabrian war ends; Hispania is Roman entire',
    desc: 'Rome has been in Spain since 218 and has never held the northwest, and the '
      + 'princeps comes in person with seven legions to finish it, and cannot. He '
      + 'spends the first year at Tarraco too ill to take the field. The Cantabri and '
      + 'the Astures do not give battle where a battle can be won; they hold ridges, '
      + 'they raid the column, and when a position falls the defenders kill each other, '
      + 'or their families, or take the yew — a poison the Romans learn to recognize '
      + 'before they learn the names of the valleys. The one Roman victory that decides '
      + 'anything is not won: the Astures\' plan to fall on three Roman camps at once is '
      + 'betrayed by their own allies the Brigaecini, and the legions arrive first. The '
      + 'war is declared over three times, and the temple of Janus is closed twice, and '
      + 'both times it has to be reopened. It ends when Agrippa is sent — with a legion '
      + 'that refuses to march and has to be broken and disbanded first, its name '
      + 'struck off — and does the arithmetic nobody wanted to do: the fighting men are '
      + 'killed, the survivors are moved down out of the hills onto the plain where '
      + 'they can be watched and taxed, and the mountains are emptied. He declines the '
      + 'triumph he is voted. Two hundred years after the first Roman soldier landed at '
      + 'Emporion, the peninsula is one country under one government, and the gold of '
      + 'Las Médulas starts moving.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -19, m: 7 },
    world: true,
    major: true,
    when: safeTrigger('ev_pw_cantabria:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'The Cantabrian and Asturian wars ran 29–19; Agrippa finished them in 19 after disbanding a mutinous legion, and declined the triumph.',
    options: [
      {
        label: 'Move them down out of the hills',
        tooltip: 'Bracara and Asturica pass to Rome off the Lusitani only, and Toletum off the Celtiberians — the last unconquered ground in Hispania. Both peoples take −30 legitimacy and "The Emptied Mountains" (−40% manpower permanently). Rome +200 talents, +10 legitimacy, and the northwest carries "The Gold of the Northwest" (+25% tax permanently), which is what the war was actually about.',
        effects: guard('ev_pw_cantabria:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          const took = transfer(ctx, SPAIN_NORTHWEST, 'ROM', 'LUS')
            + transfer(ctx, ['Toletum'], 'ROM', 'CTB');
          for (const t of ['LUS', 'CTB']) {
            if (!alive(ctx, t)) continue;
            h.adjust(ctx, t, { legitimacy: -30, stability: -1 });
            h.addTagModifier(ctx, t, {
              id: 'the_emptied_mountains', name: 'The Emptied Mountains', months: -1,
              effects: { manpowerMult: 0.6 },
            });
          }
          mark(ctx, SPAIN_NORTHWEST, {
            id: 'gold_of_the_northwest', name: 'The Gold of the Northwest', months: -1,
            effects: { taxMult: 1.25 },
          });
          h.adjust(ctx, 'ROM', { treasury: 200, legitimacy: 10 });
          h.setFlag(ctx, 'hispaniaWhole', true);
          h.chronicle(ctx, 'era', 'Agrippa ends the Cantabrian war by emptying the mountains and declines the triumph; two hundred years on, Hispania (' + took + ' provinces) is one country.');
        }),
      },
    ],
  },

  // ── W15 · -15 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pw_the_alps',
    title: 'Forty-Five Tribes on One Trophy',
    worldLabel: 'Drusus and Tiberius take the Alps in a single summer',
    desc: 'The Alps have been in the middle of the empire for a century and have never '
      + 'been in it: the passes are held by peoples who charge tolls, take hostages and '
      + 'occasionally cut up a column, and the road from Italy to Gaul and the road from '
      + 'Italy to the Danube both run through them. The princeps\' two stepsons are sent '
      + 'to close the question in one season and do it as a pincer nobody in the '
      + 'mountains sees the shape of until it has shut: Drusus comes up from Italy '
      + 'through the Tridentine valleys, Tiberius comes east from Gaul and across the '
      + 'lake of Constance in boats, and they meet. Noricum, which has been Rome\'s '
      + 'friend and iron supplier since 186 and has never been fought at all, is taken '
      + 'over without a war and becomes a province because the frontier now needs to be '
      + 'a line rather than a friendship. The trophy raised at La Turbie above Monaco '
      + 'lists the peoples subdued on it, by name, in a single inscription: there are '
      + 'forty-five of them, and most of them are not otherwise recorded anywhere, '
      + 'because being listed on that stone is the last thing that happened to them.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -15, m: 8 },
    world: true,
    when: safeTrigger('ev_pw_the_alps:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Drusus and Tiberius subdued the Alpine peoples in a single campaign in 15; the trophy at La Turbie names forty-five tribes.',
    options: [
      {
        label: 'Two armies, one summer, one stone',
        tooltip: 'Virunum and Augusta Vindelicorum pass to Rome off Noricum only — an iron kingdom that was never fought and is annexed anyway. Noricum −25 legitimacy. Rome +90 talents, +8 legitimacy, and Virunum carries "The Noric Iron" (+20% production permanently): the best steel in the empire, now inside it.',
        effects: guard('ev_pw_the_alps:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          transfer(ctx, THE_ALPS, 'ROM', 'NOR');
          if (alive(ctx, 'NOR')) h.adjust(ctx, 'NOR', { legitimacy: -25, stability: -1 });
          mark(ctx, ['Virunum'], {
            id: 'the_noric_iron', name: 'The Noric Iron', months: -1,
            effects: { prodMult: 1.2 },
          });
          h.adjust(ctx, 'ROM', { treasury: 90, legitimacy: 8 });
          h.setFlag(ctx, 'alpsTaken', true);
          h.chronicle(ctx, 'era', 'Drusus and Tiberius close on the Alps from both sides in one summer; forty-five peoples are named on a trophy above Monaco and most are never mentioned again.');
        }),
      },
    ],
  },

  // ── W16 · -12 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pw_the_rhine',
    title: 'A Line With Sixty Forts On It',
    worldLabel: 'Drusus fortifies the Rhine and takes the fleet into the northern sea',
    desc: 'The Rhine has been the edge of Caesar\'s conquest for forty years and has '
      + 'been a river rather than a frontier: raids cross it in both directions and '
      + 'Agrippa has twice moved whole peoples — the Ubii, and then the Sugambri — from '
      + 'one bank to the other to make the arithmetic work. Drusus turns it into an '
      + 'installation. Fifty or sixty forts along the west bank, a road behind them, a '
      + 'bridge-head at Mogontiacum, an altar to Rome and Augustus at the Ubian town '
      + 'that will one day be Cologne, and — because the sea is a road nobody has used '
      + 'yet — a canal dug from the Rhine to the lake at its mouth so that a fleet can '
      + 'get into the northern ocean without going round the Batavian shoals. He takes '
      + 'the fleet out through it, receives the submission of the Frisians on the way, '
      + 'runs aground on a coast with a tidal range no Mediterranean sailor has ever '
      + 'imagined, and is pulled off by the Frisians he has just conquered. The '
      + 'Chauci see Roman warships for the first time in their history. From this year '
      + 'the west bank is not a border zone, it is provincial ground with an army on '
      + 'it, and the army on it is the largest concentration of soldiers anywhere in '
      + 'the world.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -12, m: 5 },
    world: true,
    when: safeTrigger('ev_pw_the_rhine:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Drusus fortified the Rhine from 12 BCE, dug the fossa Drusiana to the northern sea, and took the submission of the Frisians.',
    options: [
      {
        label: 'Dig the canal and take the fleet out',
        tooltip: 'The west bank passes to Rome — Colonia Agrippina, Mogontiacum, Batavia and Atuatuca off the Belgae, Argentorate off the Sequani, neither off anybody else. Both peoples −20 legitimacy. The four Rhine cells carry "The Army of the Rhine" (+1 unrest, +25% production for 300 months) — the largest garrison in the world, and everything it eats is bought locally. Rome +6 legitimacy and +15 martial points.',
        effects: guard('ev_pw_the_rhine:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          transfer(ctx, ['Colonia Agrippina', 'Mogontiacum', 'Batavia', 'Atuatuca'], 'ROM', 'BLG');
          transfer(ctx, ['Argentorate'], 'ROM', 'SEQ');
          for (const t of ['BLG', 'SEQ']) if (alive(ctx, t)) h.adjust(ctx, t, { legitimacy: -20 });
          mark(ctx, RHINE_BANK, {
            id: 'the_army_of_the_rhine', name: 'The Army of the Rhine', months: 300,
            effects: { unrest: 1, prodMult: 1.25 },
          });
          h.adjust(ctx, 'ROM', { legitimacy: 6, mar: 15 });
          h.setFlag(ctx, 'rhineFortified', true);
          h.chronicle(ctx, 'era', 'Drusus lines the Rhine with sixty forts and digs a canal to the northern sea; the Frisians pull his flagship off a sandbank the year they submit.');
        }),
      },
    ],
  },

  // ── W17 · -9 ──────────────────────────────────────────────────────────────
  {
    id: 'ev_pw_pannonia',
    title: 'The Country Between the Rivers',
    worldLabel: 'Tiberius finishes the Pannonian war; the Danube is one frontier',
    desc: 'Between the Save and the Danube there is a country of marsh, oak forest and '
      + 'horse-raising peoples that has been raiding Italy\'s back door since before '
      + 'anyone kept records, and closing it is the last piece of joining Illyricum to '
      + 'Moesia and making the Danube a single line from the Alps to the Black Sea. '
      + 'Tiberius spends three years on it and it is the campaign that makes his '
      + 'military reputation: no battle anyone can name, a great deal of moving in '
      + 'winter, and a policy — the fighting men of a defeated people are sold as '
      + 'slaves outside their own country, so that nothing regrows behind the column. '
      + 'The old Boian country on the middle Danube, empty since the Dacians broke them '
      + 'a generation ago, is walked into. When it is finished the frontier runs on one '
      + 'river for fifteen hundred miles and an army can be moved along it, and the '
      + 'empire has the shape it will keep. The Pannonians rise again in 6 CE, in the '
      + 'year this chapter\'s last page is dated, and Suetonius calls that one the most '
      + 'serious war Rome fought since Hannibal.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -9, m: 8 },
    world: true,
    when: safeTrigger('ev_pw_pannonia:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Tiberius concluded the Bellum Pannonicum in 9 BCE by selling the fighting men abroad; Pannonia rose again in 6 CE.',
    options: [
      {
        label: 'Sell the fighting men outside their own country',
        tooltip: 'Carnuntum and Aquincum pass to Rome, off the Boii, Noricum and the Dacians only. Whoever held them −20 legitimacy and −1 stability. Rome +110 talents and +8 legitimacy, and both cells carry "Nothing Regrows Behind the Column" (+2 unrest for 180 months) — the policy works and is remembered.',
        effects: guard('ev_pw_pannonia:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          transfer(ctx, PANNONIA, 'ROM', ['BOI', 'NOR', 'DAC', 'SCO']);
          for (const t of ['BOI', 'DAC']) {
            if (alive(ctx, t)) h.adjust(ctx, t, { legitimacy: -20, stability: -1 });
          }
          mark(ctx, PANNONIA, {
            id: 'nothing_regrows', name: 'Nothing Regrows Behind the Column', months: 180,
            effects: { unrest: 2 },
          });
          h.adjust(ctx, 'ROM', { treasury: 110, legitimacy: 8, mar: 10 });
          h.setFlag(ctx, 'pannoniaTaken', true);
          h.chronicle(ctx, 'era', 'Tiberius closes the country between the Save and the Danube; the frontier is one river from the Alps to the Black Sea.');
        }),
      },
    ],
  },

  // ── W18 · -7 ──────────────────────────────────────────────────────────────
  {
    id: 'ev_pw_germania',
    title: 'A Province for Sixteen Years',
    worldLabel: 'Germania to the Elbe is organized as a province',
    desc: 'Drusus went four times over the river and reached the Elbe on the last of '
      + 'them, where — the story his own family told — a woman of more than human size '
      + 'met him on the bank and told him in Latin to go back, that his end was near, '
      + 'and he turned round; and on the way home his horse fell on him and he died of '
      + 'it thirty days later, aged twenty-nine, with his brother riding two hundred '
      + 'miles in a day and a night to be there. Tiberius takes over and completes it '
      + 'without the poetry: the Cherusci, the Chatti, the Chauci, the Langobardi and '
      + 'the Sugambri submit, forty thousand of the last are moved bodily to the west '
      + 'bank, and by this year there is a Roman province between the Rhine and the '
      + 'Elbe with assizes being held in it, markets being taxed, a town being laid out '
      + 'at Waldgirmes with a forum and a gilded equestrian statue in it, and the sons '
      + 'of German chiefs being educated as Roman equestrians. One of them is a young '
      + 'Cheruscan who will command an auxiliary wing, be given citizenship and '
      + 'equestrian rank, and in the year 9 will take three legions into a wood near '
      + 'Kalkriese and destroy them, and the province of Germania will end and never be '
      + 'attempted again. That is fifteen years after this card and three years after '
      + 'the last page of this chapter. On the date printed here it is a province, with '
      + 'a governor and a tax roll, and everyone in it expects it to stay one.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -7, m: 9 },
    world: true,
    major: true,
    when: safeTrigger('ev_pw_germania:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Drusus reached the Elbe in 9 BCE and died; Tiberius completed the submission, and Germania was administered as a province until the Varian disaster of 9 CE.',
    options: [
      {
        label: 'Lay out a forum at Waldgirmes',
        tooltip: 'Frisia, the Chatti and the Cherusci pass to Rome, off those peoples only: Germania between the Rhine and the Elbe is a province. Each takes −25 legitimacy. Rome +12 legitimacy, +10 martial points, and the three cells carry "The Province That Was Expected to Last" (+2 unrest permanently) — because it was administered, and because it did not.',
        effects: guard('ev_pw_germania:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          const took = transfer(ctx, GERMANIA, 'ROM', ['FRS', 'CHA', 'CHE', 'SUE']);
          for (const t of ['FRS', 'CHA', 'CHE']) {
            if (alive(ctx, t)) h.adjust(ctx, t, { legitimacy: -25, stability: -1 });
          }
          mark(ctx, GERMANIA, {
            id: 'province_expected_to_last', name: 'The Province That Was Expected to Last', months: -1,
            effects: { unrest: 2 },
          });
          h.adjust(ctx, 'ROM', { legitimacy: 12, mar: 10 });
          h.setFlag(ctx, 'germaniaProvincia', true);
          h.chronicle(ctx, 'era', 'Drusus dies of a fall on the way back from the Elbe; Tiberius finishes it, and Germania (' + took + ' provinces) is a province with assizes, a forum and a tax roll.');
        }),
      },
    ],
  },

];
