// Judaea Universalis — the Persian century: 499–461 BCE (SPEC §274).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// WHY THIS FILE EXISTS. The Babylonian chapter has a good beginning and a
// good end and a hole in the middle of its long tail. The house is finished
// in 516, the jar handles are stamped in 509, and then — measured over the
// whole span a player can actually play rather than over the chapter's
// generation horizon — there is one card in the 490s, one in the 480s' first
// year, and nothing at all for the twenty years between 481 and 461. Four
// decades in which nothing happens and then a scribe arrives from Babylon
// with a commission and the chapter resumes.
//
// Those forty years are not quiet. They are the years in which the empire
// Yehud belongs to fights the Greeks and loses, pulls down the temple of Bel
// in Babylon, loses Egypt twice and takes it back twice, and has a king
// murdered in his own bedchamber by the captain of his guard. Every one of
// those reaches Jerusalem, because the coast road runs through this country
// and an army going to Egypt walks down it.
//
// And two of them reach it as documents. Ezra 4 preserves, out of order and
// in the wrong reigns, the correspondence of a province that kept being
// denounced to the capital: an accusation written against the inhabitants of
// Judah in the first year of Xerxes, and a later letter from Rehum the
// chancellor and Shimshai the scribe that got the wall stopped by force of
// arms. Nobody in this chapter had ever been asked about either.
//
// WHAT IT IS. Twelve dated cards, 499–461. Seven are the empire's own
// business arriving as news — the fires in Ionia, the house of Bel, Salamis,
// the league at Delos, the king in his bedchamber, the lord of the marshes —
// and five are Yehud's: the levy for the great army, the seal of a governor
// nobody can name with certainty, the assessment of Beyond the River, and the
// two letters.
//
// Sources: Herodotus V-IX for the Ionian revolt and the invasion, including
// the Syrians of Palestine who served in the fleet (VII.89); the Babylonian
// astronomical diaries and the Persepolis Fortification tablets for the
// administration; Ezra 4:6-23 for the letters, read as documents of the fifth
// century rather than as a narrative sequence; the Yehud seal impressions and
// the bullae of Elnathan the governor and Shelomith the handmaid; Thucydides
// I.104-110 for the Egyptian expedition; and Ctesias, cautiously, for the
// murder of Xerxes.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_597bce_persia] ' + key, e || '');
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

// Opinion is not on the helper surface (SPEC §274): `ctx.helpers` carries no
// addOpinion, so a package that wants to move a court's regard writes the
// ledger itself, the way the Iron Age packages do. Same shape, same clamp.
function opinion(ctx, from, of, delta) {
  try {
    const t = ctx.game.tags && ctx.game.tags[from];
    if (!t) return;
    if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
    t.opinion[of] = Math.max(-200, Math.min(200, (t.opinion[of] || 0) + delta));
  } catch (e) { warnOnce('opinion', e); }
}

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false);
}

function mod(ctx, id, name, effects, months) {
  const me = ctx.game.playerTag;
  if (!me) return;
  ctx.helpers.addTagModifier(ctx, me, {
    id, name, months: Number.isFinite(months) ? months : -1, effects,
  });
}

// The cells the province of Yehud is actually made of, plus the road that
// every army bound for Egypt walks down.
const YEHUD = ['Jerusalem', 'Jericho', 'Hebron', 'Bethlehem'];
const COAST_ROAD = ['Joppa', 'Gaza'];

function stir(ctx, names, m) {
  for (const n of names) {
    const p = ctx.prov && ctx.prov(n);
    if (!p || p.impassable) continue;
    ctx.helpers.addProvinceModifier(ctx, n, m);
  }
}

// A dated card, two answers, the recorded one first — the same shape the
// destruction package uses, so the two files read as one hand.
function Y(id, title, y, m, forTag, desc, historical, a, b) {
  return {
    id, title, desc, historical, forTag, date: { y, m }, aiOption: 0,
    options: [
      { label: a.label, tooltip: a.tooltip, effects: guard(id + ':0', a.fx) },
      { label: b.label, tooltip: b.tooltip, effects: guard(id + ':1', b.fx) },
    ],
  };
}

// The empire's own year, arriving as news. `world` marks it the way the
// chapter's world package marks its own.
function W(id, title, worldLabel, y, m, desc, historical, a, b) {
  const c = Y(id, title, y, m, 'both', desc, historical, a, b);
  c.world = true;
  c.worldLabel = worldLabel;
  return c;
}

export const EVENTS_597_PERSIA = [

  // ── the fires in Ionia ──────────────────────────────────────────────────

  W('ev597p_sardis_burns', 'They Have Burned the Satrap\'s City',
    'The Ionian cities revolt and burn Sardis', -499, 5,
    'The Greek cities on the western shore of the empire have put out their '
    + 'tyrants, and a force of them has walked inland to the satrapal capital and '
    + 'burned it. They did not mean to — a fire started in a reed house and Sardis '
    + 'is built of reed houses — but the temple of the local goddess went up with '
    + 'the rest, and that is the part that will be remembered and repaid.\n\nWhat '
    + 'this means here, four months\' march away, is that the levies and the '
    + 'requisitions are going west instead of south, and that the satrap of Beyond '
    + 'the River has been asked for ships and money in a year when the assessment '
    + 'was already set.',
    'The Ionian revolt began in 499; the burning of Sardis, including the temple of Cybele, gave Darius his pretext for the Greek campaigns (Herodotus V.100-102).',
    { label: 'Pay the extra assessment early and be seen to pay it',
      tooltip: '−45 talents now. "Paid Before Asked" (+10% administrative efficiency, +6 diplomatic weight) for twenty-five years: a small province that is never a problem is a small province that is left alone.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, ctx.game.playerTag, { treasury: -45 });
        mod(ctx, 'p597_paid_before_asked', 'Paid Before Asked', { adminMult: 1.1, diploSeats: 6 }, 300);
        h.chronicle(ctx, 'era', 'The extra assessment for the western war is sent up before the satrap\'s second letter arrives.'); } },
    { label: 'Plead the province\'s poverty and send what the old list says',
      tooltip: '+25 talents kept. "The Old List" (+8% income) for fifteen years, and the satrap\'s clerks make a note: −0.5 unrest relief foregone and +0.8 unrest in Yehud for fifteen years when the collectors come back twice.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, ctx.game.playerTag, { treasury: 25 });
        mod(ctx, 'p597_the_old_list', 'The Old List', { incomeMult: 1.08 }, 180);
        stir(ctx, YEHUD, { id: 'p597_collectors_twice', name: 'The Collectors Came Twice', months: 180, effects: { unrest: 0.8 } });
        h.chronicle(ctx, 'era', 'Yehud answers the war assessment with the old list and a letter about the poverty of the province.'); } }),

  W('ev597p_lade_and_miletus', 'The Sea Fight, and Then the City',
    'The revolt ends at Lade and Miletus is emptied', -494, 8,
    'It ended the way these things end. The allied fleet broke at Lade because '
    + 'half of it rowed away before the fighting, and Miletus was stormed, and the '
    + 'men were killed and the women and children taken and the survivors settled at '
    + 'the mouth of the Tigris, which is as far from the sea they knew as the empire '
    + 'could conveniently put them.\n\nA playwright in Athens will put it on the '
    + 'stage and the Athenians will fine him for reminding them of their own '
    + 'misfortunes. The lesson everybody in this empire is expected to draw is the '
    + 'obvious one. The lesson the Phoenician cities on this coast have drawn is '
    + 'that they rowed for the king and Miletus did not.',
    'Lade was fought in 494; Miletus was sacked and its people deported to the Persian Gulf (Herodotus VI.14-20).',
    { label: 'Send the customary gift to the satrap and say nothing about Miletus',
      tooltip: '−30 talents and +10 legitimacy with the satrapy. "Quiet Under the King" (−0.8 unrest in Yehud, +6% income) for twenty-five years.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, ctx.game.playerTag, { treasury: -30, legitimacy: 10 });
        stir(ctx, YEHUD, { id: 'p597_quiet_under_king', name: 'Quiet Under the King', months: 300, effects: { unrest: -0.8, taxMult: 1.06 } });
        h.chronicle(ctx, 'era', 'The customary gift goes up to the satrap in the year Miletus was emptied, and no letter from Jerusalem mentions Miletus.'); } },
    { label: 'Take in the traders the sack has put on the road',
      tooltip: 'A few hundred displaced Ionian and Phoenician households settle on the coast: +10% trade for twenty-five years and +1 development at Joppa — and +1 unrest on the coast permanently, because they keep their own gods and their own courts.',
      fx: (ctx) => { const h = ctx.helpers;
        mod(ctx, 'p597_ionian_traders', 'The Traders From the Sack', { tradeMult: 1.1 }, 300);
        stir(ctx, ['Joppa'], { id: 'p597_ionian_quarter', name: 'The Ionian Quarter', months: -1, effects: { unrest: 1, prodMult: 1.08 } });
        h.chronicle(ctx, 'era', 'Households off the Ionian road are settled at the port; they bring their trade, their gods and their own way of going to law.'); } }),

  // ── the accusation ──────────────────────────────────────────────────────

  Y('ev597p_the_accusation', 'An Accusation, in the Beginning of His Reign', -486, 3, 'JDH',
    'The old king is dead and the new one has been on the throne for four months, '
    + 'which is exactly the window in which a province\'s enemies write to the '
    + 'capital. A letter has gone up — the council has seen a copy and it is well '
    + 'drafted — accusing the inhabitants of Judah and Jerusalem, in general terms '
    + 'and at length, of being what they have always been accused of being: a '
    + 'rebellious and a bad city, hurtful unto kings and provinces.\n\nIt asks for '
    + 'nothing specific. That is what makes it dangerous. A letter that asks for '
    + 'nothing cannot be answered point by point, and a new king with Egypt in '
    + 'revolt does not read carefully.',
    'Ezra 4:6: "And in the reign of Ahasuerus, in the beginning of his reign, wrote they unto him an accusation against the inhabitants of Judah and Jerusalem."',
    { label: 'Send men to the capital to be present when it is read',
      tooltip: '−55 talents and a year of somebody\'s life on the road. The letter dies in the files: +18 legitimacy and "Present When It Was Read" (+12 diplomatic weight, +8% administrative efficiency) for thirty years.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -55, legitimacy: 18 });
        mod(ctx, 'p597_present_when_read', 'Present When It Was Read', { diploSeats: 12, adminMult: 1.08 }, 360);
        h.chronicle(ctx, 'era', 'Men from Jerusalem are standing in the chancery the week the accusation is read, and the accusation is filed rather than acted on.'); } },
    { label: 'Answer it in writing and trust the record',
      tooltip: 'No cost. The reply is filed beside the accusation and both sit there for twenty-five years: +1 stability now, and +1.2 unrest in Yehud for twenty years when the work is stopped by a letter nobody in Jerusalem was present to answer.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { stability: 1 });
        stir(ctx, YEHUD, { id: 'p597_filed_reply', name: 'A Reply in the Files', months: 240, effects: { unrest: 1.2 } });
        h.setFlag(ctx, 'accusationUnanswered', true);
        h.chronicle(ctx, 'era', 'Jerusalem answers the accusation with a letter; the letter is filed beside it, and both wait.'); } }),

  W('ev597p_the_house_of_bel', 'They Have Pulled Down the House of Bel',
    'Babylon revolts twice and the empire answers it', -484, 6,
    'Babylon put up two kings in one year and the second of them lasted a '
    + 'fortnight. What the empire has done in return is not a massacre: it is '
    + 'administrative. The satrapy has been split, the great estates have been taken '
    + 'from the old families and given to the king\'s people, the city\'s walls are '
    + 'reduced, and the golden statue in the Esagila has gone to the treasury.\n\nA '
    + 'great many people in this province still have relatives there — the community '
    + 'that did not come back is larger than the one that did — and the letters '
    + 'coming west this summer are about foreclosure and confiscation rather than '
    + 'about blood.',
    'Babylon revolted under Bel-shimanni and Shamash-eriba around 484; Xerxes reorganised the satrapy and confiscated the great Babylonian estates. The destruction of the Esagila is Herodotus (I.183) and is disputed.',
    { label: 'Open the province to the families the confiscations have ruined',
      tooltip: '−40 talents in settlement. Several hundred households come up: +1 development in Jerusalem, +8% growth for thirty years, and "The Letters From Babylon" (+10% trade) — the two halves of the people are connected by more than letters now.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -40 });
        stir(ctx, ['Jerusalem'], { id: 'p597_ruined_houses', name: 'The Houses That Came Up', months: -1, effects: { prodMult: 1.1 } });
        mod(ctx, 'p597_letters_from_babylon', 'The Letters From Babylon', { growthMult: 1.08, tradeMult: 1.1 }, 360);
        h.chronicle(ctx, 'era', 'Yehud opens itself to the Babylonian families the confiscations ruined, and several hundred households come up the road they had declined to take before.'); } },
    { label: 'Keep the province out of it — it is the king\'s quarrel with his own city',
      tooltip: '+1 stability and +35 talents not spent. Nothing happens, which is the point: a province that does not appear in the year Babylon is punished is a province nobody thinks about.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { stability: 1, treasury: 35 });
        h.chronicle(ctx, 'era', 'Jerusalem takes no part and offers no welcome in the year of the Babylonian confiscations; nothing at all is recorded of Yehud that year, which was the intention.'); } }),

  // ── the great army ──────────────────────────────────────────────────────

  Y('ev597p_the_army_goes_south', 'The Road Is Full From Dawn to Dark', -480, 5, 'JDH',
    'The army going west has been passing along the coast road for eleven days and '
    + 'has not finished passing. The ships are rowed by Phoenicians and Egyptians '
    + 'and by men from this coast — the muster lists call them the Syrians of '
    + 'Palestine, and they carry wicker shields and linen corselets and are '
    + 'perfectly good sailors.\n\nWhat Yehud is being asked for is not soldiers. It '
    + 'is grain, at a price the commissariat has set, delivered to dumps on the '
    + 'coast, in quantities calculated by somebody who has never seen these hills. '
    + 'The assessment is for two years and the harvest was ordinary.',
    'Herodotus VII.89 lists the Syrians of Palestine among the fleet\'s crews. The Persian commissariat established supply dumps along the Levantine coast for the invasion of 480.',
    { label: 'Deliver the grain in full and empty the storehouses',
      tooltip: '−120 talents of stores. "The Commissariat Was Satisfied" (+14 diplomatic weight, +10% administrative efficiency) for thirty years and +15 legitimacy — and a hungry province: +1.5 unrest in Yehud for four years.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -120, legitimacy: 15 });
        mod(ctx, 'p597_commissariat', 'The Commissariat Was Satisfied', { diploSeats: 14, adminMult: 1.1 }, 360);
        stir(ctx, YEHUD, { id: 'p597_empty_stores', name: 'The Storehouses Are Empty', months: 48, effects: { unrest: 1.5 } });
        h.chronicle(ctx, 'era', 'Yehud delivers the full grain assessment to the coastal dumps and goes into the winter with empty storehouses.'); } },
    { label: 'Deliver two thirds and keep the seed corn back',
      tooltip: '−70 talents. The province eats: −1 unrest in Yehud for ten years and +8% growth for twenty. The shortfall is recorded against Yehud in the satrapy\'s ledger: −10 legitimacy and +1 unrest on the coast road for ten years where the collectors come back.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -70, legitimacy: -10 });
        stir(ctx, YEHUD, { id: 'p597_seed_kept', name: 'The Seed Corn Was Kept', months: 120, effects: { unrest: -1 } });
        mod(ctx, 'p597_seed_growth', 'The Seed Corn Was Kept', { growthMult: 1.08 }, 240);
        stir(ctx, COAST_ROAD, { id: 'p597_shortfall', name: 'The Shortfall on the Ledger', months: 120, effects: { unrest: 1 } });
        h.chronicle(ctx, 'era', 'Two thirds of the grain goes to the coast and the seed corn stays in the villages; the shortfall is written against Yehud\'s name.'); } }),

  W('ev597p_the_straits', 'The King Watched From a Chair on the Hill',
    'The fleet is broken in the straits at Salamis', -480, 9,
    'The news is three months old by the time it is reliable and it is not what '
    + 'anybody expected. The fleet went into a narrow water against the advice of '
    + 'the only commander who had fought there, was crowded so that the rear '
    + 'squadrons rowed into the front ones, and lost. The king watched it from a '
    + 'chair on the hill and went home overland with part of the army, leaving the '
    + 'rest under a general.\n\nThe Phoenician captains have been blamed for it, '
    + 'publicly, and some have been executed. The coast cities are extremely quiet '
    + 'this autumn.',
    'Salamis was fought in September 480. Herodotus (VIII.90) reports Xerxes executing Phoenician captains who blamed others for the defeat.',
    { label: 'Say nothing at all, anywhere, about the king\'s fleet',
      tooltip: '+2 stability and "Nothing Was Said" (+8% administrative efficiency) for twenty years. Silence is a policy and in this empire it is usually the right one.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, ctx.game.playerTag, { stability: 2 });
        mod(ctx, 'p597_nothing_said', 'Nothing Was Said', { adminMult: 1.08 }, 240);
        h.chronicle(ctx, 'era', 'No word about the straits is spoken in any assembly the province controls, which is the whole of the province\'s policy that autumn.'); } },
    { label: 'Take the coast trade the Phoenician cities have lost this year',
      tooltip: '+95 talents and +12% trade for twenty years. The Phoenician cities are disgraced and their captains dead, and somebody is going to carry the cargoes: Tyre and Sidon −12 opinion, and they remember who did.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, ctx.game.playerTag, { treasury: 95 });
        mod(ctx, 'p597_coast_trade', 'The Cargoes Nobody Else Would Carry', { tradeMult: 1.12 }, 240);
        const me = ctx.game.playerTag;
        for (const t of ['TYR', 'SID']) if (alive(ctx, t) && me) opinion(ctx, t, me, -12);
        h.chronicle(ctx, 'era', 'With the Phoenician captains dead or disgraced, the province\'s carriers take the season\'s cargoes, and Tyre notices.'); } }),

  W('ev597p_the_league_at_delos', 'They Have Made a Treasury on an Island',
    'The Greek cities form a league and keep fighting', -477, 4,
    'The war did not end when the king went home. The Greek cities have formed a '
    + 'league with a common fleet and a common treasury kept on a small island in '
    + 'the middle of the Aegean, and they are using it — clearing the Thracian '
    + 'coast, taking the Persian garrisons on the straits, and raiding down the '
    + 'Asian shore.\n\nFor a province at the other end of the empire this is not a '
    + 'war. It is a permanent condition: an enemy that does not go away, a fleet '
    + 'that appears where it is not expected, and a standing reason for the '
    + 'satrapies of the west to be expensive.',
    'The Delian League was organised about 478-477 with its treasury on Delos; it kept up operations against Persian holdings for a generation.',
    { label: 'Lay in a coastal watch and a warning chain of our own',
      tooltip: '−35 talents. "The Watch on the Shore" (+10 deterrent, +8% morale) for forty years: nobody is going to defend this coast for us, and the fleet that comes to it will not be the king\'s.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, ctx.game.playerTag, { treasury: -35 });
        mod(ctx, 'p597_watch_on_shore', 'The Watch on the Shore', { deterrent: 10, moraleMult: 1.08 }, 480);
        stir(ctx, COAST_ROAD, { id: 'p597_shore_watch_p', name: 'The Watch on the Shore', months: 480, effects: { unrest: -0.6 } });
        h.chronicle(ctx, 'era', 'A chain of watch posts goes up along the province\'s shore, paid for locally, because the fleet that comes here will not be the king\'s.'); } },
    { label: 'Trade with them — a league with a treasury is a league with money',
      tooltip: '+14% trade for forty years and +60 talents. Greek silver comes into this country for the first time in quantity. It is also, technically, commerce with the enemy: −12 legitimacy and a line in the satrapy\'s ledger.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, ctx.game.playerTag, { treasury: 60, legitimacy: -12 });
        mod(ctx, 'p597_greek_silver', 'Greek Silver', { tradeMult: 1.14 }, 480);
        h.setFlag(ctx, 'greekSilver', true);
        h.chronicle(ctx, 'era', 'Attic silver begins arriving in this country in quantity, through the coast ports, against a background of the empire being at war with the people who mint it.'); } }),

  // ── who administers Yehud ───────────────────────────────────────────────

  Y('ev597p_the_governors_seal', 'A Seal With a Name on It', -474, 6, 'JDH',
    'The province has a governor, and the arrangement by which it has one has '
    + 'never been written down anywhere that survives. The seal impressions on the '
    + 'jars say Yehud and sometimes a name; one of them says Elnathan the governor '
    + 'and another says Shelomith the handmaid, and Shelomith is a woman and is '
    + 'holding a seal, which means she is holding property.\n\nThe question in the '
    + 'council this month is whether the governorship is the satrapy\'s appointment '
    + 'or the house of David\'s inheritance, and it is being asked now because the '
    + 'present holder is old and because both answers have been true within living '
    + 'memory.',
    'Bullae and seals name Elnathan the governor and Shelomith the amah; Shelomith may be the daughter of Zerubbabel named in 1 Chronicles 3:19, which would make the governorship a Davidic marriage settlement.',
    { label: 'Let the satrapy appoint, and keep the house out of the office',
      tooltip: '+2 authority, +12 legitimacy with the satrapy, and "An Office, Not an Inheritance" (+12% administrative efficiency, +10% integration) for forty years. The Davidic claim goes into the priesthood instead, where it stays for four hundred years.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { legitimacy: 12 });
        h.doctrine(ctx, 'authority', 2);
        mod(ctx, 'p597_office_not_inheritance', 'An Office, Not an Inheritance', { adminMult: 1.12, integrateMult: 1.1 }, 480);
        h.setFlag(ctx, 'governorAppointed', true);
        h.chronicle(ctx, 'era', 'The council settles that the governorship of Yehud is the satrapy\'s appointment and not the house of David\'s inheritance.'); } },
    { label: 'Keep it in the house — a seal in the family is a claim kept alive',
      tooltip: '+20 legitimacy and "The Seal in the House" (−1 unrest in Yehud, +0.06 legitimacy a month) for forty years. The satrapy files a query that is never withdrawn: −10 diplomatic weight and a governorship that has to be defended every time the satrap changes.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { legitimacy: 20 });
        mod(ctx, 'p597_seal_in_house', 'The Seal in the House', { legitimacyAdd: 0.06, diploSeats: -10 }, 480);
        stir(ctx, YEHUD, { id: 'p597_seal_in_house_p', name: 'The Seal in the House', months: 480, effects: { unrest: -1 } });
        h.setFlag(ctx, 'governorInherited', true);
        h.chronicle(ctx, 'era', 'The seal stays in the house; the satrapy files a query about it which is never answered and never withdrawn.'); } }),

  Y('ev597p_beyond_the_river', 'The Assessment of Beyond the River', -470, 3, 'JDH',
    'The satrapy this province belongs to runs from the Euphrates to the border of '
    + 'Egypt and is assessed as one unit, and the assessment has just been revised '
    + 'upward for the first time in a generation. The satrap\'s clerks apportion it '
    + 'downward among the districts, and the apportionment is done in a room in '
    + 'Damascus by men who respond to argument.\n\nYehud is small, poor, landlocked '
    + 'and has no port. It also has a Temple with an income, and the question the '
    + 'clerks keep circling is whether the Temple\'s revenue is part of the '
    + 'province\'s substance for the purposes of the list.',
    'Abar-Nahara ("Beyond the River") was assessed as a single satrapy; Herodotus III.91 gives its tribute as 350 talents. The status of temple revenue in imperial assessments is attested in the Egyptian and Babylonian records.',
    { label: 'Argue the Temple\'s income is the god\'s and not the province\'s',
      tooltip: '−35 talents in the arguing and a written ruling: "The God\'s Portion" (+12% income, −0.8 unrest in Yehud) permanently. The ruling is worth more than the money, and it is quoted for three hundred years.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -35 });
        mod(ctx, 'p597_gods_portion', 'The God\'s Portion', { incomeMult: 1.12 }, -1);
        stir(ctx, YEHUD, { id: 'p597_gods_portion_p', name: 'The God\'s Portion', months: -1, effects: { unrest: -0.8 } });
        h.setFlag(ctx, 'templeExempt', true);
        h.chronicle(ctx, 'era', 'The satrap\'s clerks rule that the Temple\'s revenue is the god\'s and not the province\'s; the ruling is copied and kept, and quoted for three centuries.'); } },
    { label: 'Pay on the whole and ask for the road and the garrison instead',
      tooltip: 'The higher assessment is accepted: −8% income permanently — for a garrisoned road and an imperial post: +15 deterrent, +10% trade permanently, and −1.2 unrest on the coast road. The province is safer and poorer.',
      fx: (ctx) => { const h = ctx.helpers;
        mod(ctx, 'p597_paid_on_the_whole', 'Assessed on the Whole', { incomeMult: 0.92, deterrent: 15, tradeMult: 1.1 }, -1);
        stir(ctx, COAST_ROAD, { id: 'p597_garrisoned_road', name: 'The Garrisoned Road', months: -1, effects: { unrest: -1.2 } });
        h.chronicle(ctx, 'era', 'Yehud is assessed on the whole of its substance, Temple and all, and buys a garrisoned road and a post station with the difference.'); } }),

  // ── the king in his bedchamber ──────────────────────────────────────────

  W('ev597p_the_king_in_his_chamber', 'The Captain of the Guard Went In',
    'Xerxes is murdered and the succession is settled by knife', -465, 8,
    'The king is dead, in his own bedchamber, killed by the captain of his guard '
    + 'with the connivance of the chief chamberlain. The captain then told the '
    + 'youngest son that the eldest had done it, and the youngest killed the eldest, '
    + 'and then discovered the truth and killed the captain, and is now king.\n\nA '
    + 'succession of that kind produces a year of letters. Every governor in every '
    + 'province is writing to establish that he was always loyal to the man who '
    + 'turned out to win, and every enemy of every governor is writing to say '
    + 'otherwise. Egypt is already in revolt.',
    'Xerxes was murdered in 465 by Artabanus, captain of the guard; Artaxerxes I emerged from the killings as king (Ctesias; Diodorus XI.69).',
    { label: 'Write once, early, and to the man who is actually on the throne',
      tooltip: '−25 talents by courier. "The Letter That Arrived First" (+15 diplomatic weight, +10% administrative efficiency) for forty years and +16 legitimacy. Getting this right is most of what a small province\'s government is for.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -25, legitimacy: 16 });
        mod(ctx, 'p597_letter_first', 'The Letter That Arrived First', { diploSeats: 15, adminMult: 1.1 }, 480);
        h.chronicle(ctx, 'era', 'One letter goes from Jerusalem in the year of the murder, early, and to the man who turned out to be king.'); } },
    { label: 'Wait until the succession is certain before writing anything',
      tooltip: '+1 stability and no risk of backing the wrong brother. "Late to the Chancery" for thirty years: −8 diplomatic weight and +0.8 unrest in Yehud, because the province\'s enemies wrote in the first month and Jerusalem wrote in the ninth.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { stability: 1 });
        mod(ctx, 'p597_late_to_chancery', 'Late to the Chancery', { diploSeats: -8 }, 360);
        stir(ctx, YEHUD, { id: 'p597_late_chancery_p', name: 'Late to the Chancery', months: 360, effects: { unrest: 0.8 } });
        h.chronicle(ctx, 'era', 'Jerusalem waits for the succession to settle before writing; the province\'s enemies do not wait.'); } }),

  W('ev597p_the_lord_of_the_marshes', 'A King in the Marshes, and Greek Ships in the Nile',
    'Inaros raises Egypt and Athens sends a fleet', -463, 5,
    'A Libyan prince out of the western Delta has raised Egypt against the new '
    + 'king, beaten a Persian army in the field and killed the satrap, who was the '
    + 'king\'s own uncle. He has asked Athens for help and Athens has sent two '
    + 'hundred ships, which are now in the Nile, and between them they hold '
    + 'Memphis except for one walled quarter.\n\nEverything the empire sends to '
    + 'retake Egypt comes down this coast. For the next eight years this province is '
    + 'a place armies stop in, and the difference between a province that feeds them '
    + 'well and a province that feeds them badly is a difference measured in '
    + 'decades.',
    'Inaros revolted about 463; the Athenian expedition to Egypt ended in disaster at Prosopitis in 454 (Thucydides I.104-110).',
    { label: 'Make the province the army\'s victualler and take the contracts',
      tooltip: '+160 talents over the campaigns and "The King\'s Victualler" (+14% income, +12 diplomatic weight) for thirty years. Eight years of soldiers billeted in these hills: +1.5 unrest in Yehud and on the coast road for eight years.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: 160, legitimacy: 10 });
        mod(ctx, 'p597_kings_victualler', 'The King\'s Victualler', { incomeMult: 1.14, diploSeats: 12 }, 360);
        stir(ctx, YEHUD.concat(COAST_ROAD), { id: 'p597_billeted', name: 'Billeted on the Hills', months: 96, effects: { unrest: 1.5 } });
        h.chronicle(ctx, 'era', 'Yehud takes the victualling contracts for the Egyptian campaigns; for eight years there are soldiers in these hills and money in the treasury.'); } },
    { label: 'Keep the province off the road and let the coast cities feed them',
      tooltip: '+1 stability and no billets: −1 unrest in Yehud for eight years. The contracts go to the Phoenician ports and so does the money — −8% income for thirty years — and the satrapy remembers who was useful.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { stability: 1 });
        stir(ctx, YEHUD, { id: 'p597_off_the_road', name: 'Off the Road', months: 96, effects: { unrest: -1 } });
        mod(ctx, 'p597_off_the_road_m', 'Off the Road', { incomeMult: 0.92, diploSeats: -6 }, 360);
        h.chronicle(ctx, 'era', 'The victualling contracts go to the coast cities; Yehud is quiet for eight years and is not thought of when the accounts are read.'); } }),

  // ── the letter that stopped the wall ────────────────────────────────────

  Y('ev597p_rehum_and_shimshai', 'Rehum the Chancellor and Shimshai the Scribe', -461, 9, 'JDH',
    'The wall has been going up for two years and it is not a secret and it has '
    + 'never been authorised by anybody, because nobody ever thought to ask. Now '
    + 'there is a letter in the capital, written by the chancellor of the district '
    + 'and his scribe and signed by every community on the list — the men of Susa '
    + 'and the Dinaites and the Apharsathchites and the rest — and it makes the one '
    + 'argument that works: search the records, and you will find that this city '
    + 'has a history of rebellion, and if it is walled the king will have no revenue '
    + 'beyond the river.\n\nThe records do say that. The reply, when it comes, will '
    + 'be an order to stop, and behind the order there will be soldiers.',
    'Ezra 4:7-23: the letter of Rehum and Shimshai to Artaxerxes and the reply ordering the work stopped "by force and power". The wall was not finished until Nehemiah\'s commission.',
    { label: 'Stop the work the day the order arrives, and keep the stones',
      tooltip: '−15 talents. The courses stand, unmortared, for fifteen years: "The Stones Were Kept" (+18% siege defence, +10% fortification value when the work resumes) permanently, and +1 stability. Obedience that costs nothing irrecoverable.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -15, stability: 1 });
        mod(ctx, 'p597_stones_kept', 'The Stones Were Kept', { hillDefBonus: 18 }, -1);
        stir(ctx, ['Jerusalem'], { id: 'p597_stones_kept_p', name: 'The Stones Were Kept', months: -1, effects: { unrest: -0.5 } });
        h.setFlag(ctx, 'wallStonesKept', true);
        h.chronicle(ctx, 'era', 'The work stops the day the order is read and not an hour before; the dressed stone is stacked and counted and left where it is.'); } },
    { label: 'Finish the north face before the soldiers get here',
      tooltip: '−70 talents and six frantic weeks. Jerusalem gains a real wall on the side it needs one: +25% siege defence permanently. The province is on record as having continued after an order: −20 legitimacy, −12 diplomatic weight for thirty years, and the next commission from the capital is harder to get.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -70, legitimacy: -20 });
        mod(ctx, 'p597_north_face', 'The North Face', { hillDefBonus: 25, diploSeats: -12 }, -1);
        stir(ctx, ['Jerusalem'], { id: 'p597_north_face_p', name: 'The North Face', months: -1, effects: { unrest: 0.6 } });
        h.setFlag(ctx, 'wallFinishedIllegally', true);
        h.chronicle(ctx, 'era', 'The north face is closed in six weeks and the order is obeyed on the seventh; Jerusalem has a wall on the side it needed one and a note in the imperial file.'); } }),
];
