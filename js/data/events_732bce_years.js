// Judaea Universalis — the years the chain skips: 699–665 BCE (SPEC §241,
// §268). Content package. Zero imports; every effect runs through ctx.helpers.
//
// The Assyrian chapter's own chain is dense at both ends — Samaria and
// Sennacherib at the front, Josiah and Nineveh at the back — and thin in the
// middle, because the middle is the half-century in which nothing happens to
// Judah except that it pays. The §241 decade rule will not accept that as an
// excuse, and it is right not to: the decades after 701 are exactly when a
// tributary state learns what tribute is for. So this file is four years out
// of the quiet stretch — the survey of what was left of the Shephelah, the
// shipwrights carried inland to build a fleet on the wrong river, the night
// Babylon was unmade, and a prism from Nineveh with this kingdom's king
// listed on it between Tyre and Ashdod.
//
// Sources: 2 Kings 18-21 and 2 Chronicles 32-33; Sennacherib's Rassam
// cylinder and the Bavian inscription; the Nineveh annals of the sixth
// campaign; Ashurbanipal's Prism C; the Assyrian eponym canon.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_732bce_years] ' + key, e || '');
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

// The court a card is currently being answered by (SPEC §216). This chapter
// seats two crowns, so a card addressed to one of them fires in the other's
// campaign as well — silently, on its recorded course — and an effect body
// that reached for `playerTag` would hang Judah's modifier on Israel's
// ledger. The binding at the foot of this file sets this for the length of
// one answer; everywhere else it is null and `P` means what it always meant.
let AUDIENCE = null;

function bindAudience(tag, fn) {
  return function (ctx) {
    const prev = AUDIENCE;
    AUDIENCE = tag;
    try { fn(ctx); } finally { AUDIENCE = prev; }
  };
}

function P(ctx) {
  const t = AUDIENCE && ctx.game.tags && ctx.game.tags[AUDIENCE];
  return (t && t.alive !== false) ? AUDIENCE : ctx.game.playerTag;
}

function mod(ctx, id, name, effects, months) {
  ctx.helpers.addTagModifier(ctx, P(ctx), {
    id, name, months: Number.isFinite(months) ? months : -1, effects,
  });
}

function opinion(ctx, from, of, delta) {
  try {
    const t = ctx.game.tags && ctx.game.tags[from];
    if (!t) return;
    if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
    t.opinion[of] = Math.max(-200, Math.min(200, (t.opinion[of] || 0) + delta));
  } catch (e) { warnOnce('opinion', e); }
}

// A dated card of the years, with two answers and the recorded one first.
function Y(id, title, y, m, forTag, desc, historical, a, b) {
  return {
    id, title, desc, historical, forTag, date: { y, m }, aiOption: 0,
    options: [
      { label: a.label, tooltip: a.tooltip, effects: guard(id + ':0', a.fx) },
      { label: b.label, tooltip: b.tooltip, effects: guard(id + ':1', b.fx) },
    ],
  };
}

export const EVENTS_732_YEARS = [

  Y('ev732y_what_the_shephelah_is_now', 'What Is Left of the Low Country', -699, 5, 'JDH',
    'The survey of the western districts is finished and it is short. Forty-six walled '
    + 'towns were taken two years ago and the ones that mattered — Lachish, Azekah, '
    + 'Libnah, Mareshah — were not given back; they were handed to the kings of Ashdod, '
    + 'Ekron and Gaza, who are now administering the grain plain this kingdom used to '
    + 'feed itself from.\n\nWhat is left is the ridge, the capital, and the tribute. The '
    + 'question in front of the council is whether to rebuild downhill, where the wheat '
    + 'is and the Assyrian road is, or uphill, where nobody has ever taken a town from '
    + 'this kingdom in one season.',
    'Sennacherib\'s Rassam cylinder: forty-six fortified towns taken and their districts given to Mitinti of Ashdod, Padi of Ekron and Sillibel of Gaza. Judah never recovered the Shephelah.',
    { label: 'Rebuild on the ridge', tooltip: '−120 talents and "The Kingdom of the Ridge" (+1 fort defence, +1 hill defence, −8% income) permanently: a country that cannot be starved out and cannot get rich.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -120, mar: 25 });
        mod(ctx, 'y732_kingdom_of_the_ridge', 'The Kingdom of the Ridge', { fortDefBonus: 1, hillDefBonus: 1, incomeMult: 0.92 });
        h.chronicle(ctx, 'era', 'The works go up along the watershed. The wheat plain is written off, and the country learns to eat what the terraces give it.'); } },
    { label: 'Buy back the grain plain', tooltip: '−260 talents, Assyria to −20 regard, and "The Low Country Bought Back" (+12% income, +6% growth) for forty years — until somebody in Nineveh reads the district returns.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -260, infl: 15 });
        mod(ctx, 'y732_low_country_bought', 'The Low Country Bought Back', { incomeMult: 1.12, growthMult: 1.06 }, 480);
        opinion(ctx, 'ASR', 'JDH', -20);
        h.chronicle(ctx, 'era', 'Silver goes to Ashdod and Ekron and the western villages quietly pay their tithes to the capital again. The district returns in Nineveh still say otherwise.'); } }),

  Y('ev732y_the_ships_built_inland', 'Ships Built on the Wrong River', -694, 6, 'both',
    'The empire has had Phoenician and Cypriot shipwrights marched four hundred miles '
    + 'inland to Nineveh, where they have built a war fleet on the Tigris — a sea people\'s '
    + 'ships, on a river, crewed by sailors who have been walked there under guard. The '
    + 'fleet has gone down to the marshes at the head of the Gulf and landed soldiers on '
    + 'the Elamite coast.\n\nIt is a demonstration, and the demonstration is not about '
    + 'Elam. It is that the empire can pick up a craft that exists only on one coast, '
    + 'carry it to a place it has never existed, and have it working within the year. '
    + 'Every court on the seaboard has been told so in a letter.',
    'Sennacherib\'s sixth campaign, 694 BCE: ships built at Nineveh and Til-Barsip by Tyrian, Sidonian and Cypriot shipwrights, floated down to the Gulf to attack the Chaldean refuge in Elam.',
    { label: 'Send our own craftsmen, and be counted useful', tooltip: '−3,000 manpower, Assyria to +35 regard, and "Named Among the Useful" (−10% cost of governing, +6% income) for thirty years.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { manpower: -3000, infl: 20 });
        mod(ctx, 'y732_named_among_useful', 'Named Among the Useful', { adminMult: 0.9, incomeMult: 1.06 }, 360);
        opinion(ctx, 'ASR', me, 35);
        h.chronicle(ctx, 'era', 'A draft of masons and carpenters goes north with the tribute, and this court\'s name is entered on the good list in Nineveh.'); } },
    { label: 'Keep our craftsmen at home', tooltip: '+25 governance points and "The Trades Kept" (+8% manpower, +1 fort defence) permanently, at Assyria to −15 regard. The skill stays in the country.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { gov: 25, legitimacy: 8 });
        mod(ctx, 'y732_trades_kept', 'The Trades Kept', { manpowerMult: 1.08, fortDefBonus: 1 });
        opinion(ctx, 'ASR', me, -15);
        h.chronicle(ctx, 'era', 'The draft is answered with a list of men who are all, unfortunately, dead or elsewhere. The trades stay where they are.'); } }),

  Y('ev732y_babylon_unmade', 'The City That Was Unmade', -689, 11, 'both',
    'Babylon has not been sacked. Babylon has been deleted. The walls and the temples '
    + 'were pulled down into the canals, the canals were cut into the streets, and the '
    + 'site was flooded until the king could write that he made it like a meadow — that '
    + 'in future days nobody would recognise the place of the city or its shrines.\n\n'
    + 'The statue of Marduk has been carried to Assyria. The empire\'s own scribes have '
    + 'gone quiet about the year; the ones in the southern cities have not gone quiet at '
    + 'all, and are writing down what was done and who did it, in a form that keeps.',
    'Sennacherib\'s destruction of Babylon in 689 BCE, described in his own Bavian inscription. His murder eight years later was read across the Near East as the answer to it.',
    { label: 'Pay on the day, and say nothing', tooltip: '−80 talents and "Punctual" (+0.2 legitimacy a month, −0.5 unrest everywhere) for twenty-five years, with Assyria to +25 regard. A court that is never mentioned in a report.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -80, infl: 15 });
        mod(ctx, 'y732_punctual', 'Punctual', { legitimacyAdd: 0.2, unrestAll: -0.5 }, 300);
        opinion(ctx, 'ASR', me, 25);
        h.chronicle(ctx, 'era', 'The tribute is weighed out early and nobody in this court is recorded as having an opinion about Babylon.'); } },
    { label: 'Let the priests say what it means', tooltip: '+22 legitimacy and "A Sentence Passed on an Empire" (+10% morale, −0.6 unrest everywhere) for thirty years, at Assyria to −25 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { legitimacy: 22, gov: -20 });
        mod(ctx, 'y732_sentence_on_empire', 'A Sentence Passed on an Empire', { moraleMult: 1.1, unrestAll: -0.6 }, 360);
        opinion(ctx, 'ASR', me, -25);
        h.chronicle(ctx, 'era', 'The sanctuary preaches on the flooding of Babylon: that a king who unmakes a city is himself a thing that can be unmade. It is remembered in 681.'); } }),

  Y('ev732y_twenty_two_kings', 'Twenty-Two Kings of the Seashore', -665, 8, 'JDH',
    'A copy of the muster order has come down the coast road. The empire is going back '
    + 'into Egypt, and the prism being cut for it lists the kings of Hatti and the '
    + 'seashore who are to supply troops, ships and cedar for the march: twenty-two of '
    + 'them, in order, and this kingdom\'s king is on it — between the king of Tyre and '
    + 'the king of Ashdod.\n\nBeing on the list is the whole of this kingdom\'s foreign '
    + 'policy in one line. It is also a levy: a contingent has to be raised here, walked '
    + 'to the Nile, and spent there on somebody else\'s quarrel with the Kushites.',
    'Ashurbanipal\'s Prism C lists Manasseh of Judah among the twenty-two kings of the seashore who supplied troops and materiel for the Egyptian campaigns of the 660s.',
    { label: 'Send the contingent', tooltip: '−5,000 manpower and −60 talents, Assyria to +45 regard, and "On the Prism" (+8% income, −6% cost of governing) permanently. The name is cut in stone in Nineveh.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { manpower: -5000, treasury: -60, infl: 25 });
        mod(ctx, 'y732_on_the_prism', 'On the Prism', { incomeMult: 1.08, adminMult: 0.94 });
        opinion(ctx, 'ASR', 'JDH', 45);
        h.chronicle(ctx, 'era', 'The contingent marches south with the Tyrians and does not all come back. The king\'s name is cut into the prism between Baal of Tyre and Ahimilki of Ashdod.'); } },
    { label: 'Send timber and silver, and plead the harvest', tooltip: '−180 talents kept at home and "The Men Kept Back" (+10% manpower, +5% growth) for thirty years, at Assyria to −20 regard and a summons that may follow.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -180, mar: 15 });
        mod(ctx, 'y732_men_kept_back', 'The Men Kept Back', { manpowerMult: 1.1, growthMult: 1.05 }, 360);
        opinion(ctx, 'ASR', 'JDH', -20);
        h.chronicle(ctx, 'era', 'Cedar, silver and a careful letter go north. The men stay on the terraces, and a clerk in Nineveh makes a note beside the entry.'); } }),
];

// --- SPEC §216: a card is answered by the court it is addressed to ---------
// One loop instead of a tag argument on every call site in the file. A card
// marked `player` or `both` is always the chair the player is sitting in and
// is left alone; a card marked ISL or JDH writes to that court whether or not
// the player is in it.
for (const _c of EVENTS_732_YEARS) {
  if (!_c || (_c.forTag !== 'ISL' && _c.forTag !== 'JDH')) continue;
  for (const _o of _c.options || []) {
    if (typeof _o.effects !== 'function') continue;
    _o.effects = bindAudience(_c.forTag, _o.effects);
  }
}
