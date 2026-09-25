// Judaea Universalis — the Assyrian Flood, the century between the two
// deportations: 731–609 BCE (SPEC §268). Content package. Zero imports; every
// effect runs through ctx.helpers.
//
// The chapter's own chain asks the five constitutional questions and then
// marches from Samaria to Megiddo without stopping, and what it marches past
// is most of what the century is actually about. This file is the stops. The
// northern districts taken first and the column that went east with a number
// attached to it; and then — the part that matters more to this game than to
// any chronicle — the people the empire marched IN: men of Babylon, Cuthah,
// Avva, Hamath and Sepharvaim, put into the emptied towns with seed corn and
// an allotment order, who lost stock to lions, petitioned Nineveh about the
// custom of the god of the land, were sent a deported priest at imperial
// expense to teach it to them, and ended up fearing the LORD and serving
// their own gods. That is the origin of a nation this game gives a chapter
// of its own, and it happens here, in an administrative file.
//
// The southern half is a reform, a tunnel, a siege and a very long reign: the
// platforms pulled down and the bronze serpent Moses made broken up and
// called a thing of brass; two gangs of quarrymen cutting toward each other
// under the hill and the six lines they carved where they met; the whole
// treasury shown to a Chaldean embassy and itemised afterwards by a prophet;
// the Rabshakeh at the conduit refusing to speak Aramaic; a camp that was
// there in the evening and not in the morning; fifty-five years of punctual
// tribute, altars in both courts and innocent blood from one end of the city
// to the other; a king walked to Babylon with a hook through his face; a king
// murdered by his own household; a purge that crossed the old border with
// mattocks; a passover such as had not been kept since the judges; and a
// chariot coming back down the ridge road out of the pass at Megiddo.
//
// Sources: 2 Kings 17-23; 2 Chronicles 29-35; Isaiah 1-39; the annals of
// Tiglath-Pileser III, Sargon II (the Nimrud and Khorsabad texts) and
// Sennacherib (the Rassam cylinder and the Taylor prism); the Siloam tunnel
// inscription; the Lachish reliefs; the LMLK jar stamps; Herodotus II.141.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_732bce_hezekiah] ' + key, e || '');
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
// After 722 the northern crown is not alive to be written to, and the lookup
// falls back to whoever is actually sitting in the chair.
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

// The same thing on a cell of the map. Canonical province names only: the era
// label is what the bookmark prints, not what ctx.prov answers to.
function pmod(ctx, provName, id, name, effects, months) {
  ctx.helpers.addProvinceModifier(ctx, provName, {
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

// A dated card of the century, with two answers and the recorded one first.
function Y(id, title, y, m, forTag, desc, historical, a, b) {
  return {
    id, title, desc, historical, forTag, date: { y, m }, aiOption: 0,
    options: [
      { label: a.label, tooltip: a.tooltip, effects: guard(id + ':0', a.fx) },
      { label: b.label, tooltip: b.tooltip, effects: guard(id + ':1', b.fx) },
    ],
  };
}

export const EVENTS_732_HEZEKIAH = [

  // ── the north: taken, emptied, refilled ───────────────────────────────────
  Y('ev732h_the_districts_taken_first', 'The Districts Taken First', -731, 3, 'ISL',
    'The returns from the north have stopped coming, and the reason is in the tribute '
    + 'lists rather than the chronicle: Galilee, the land of Naphtali and everything '
    + 'across the river are no longer districts of this kingdom. They are provinces of '
    + 'the empire, with governors whose names have to be spelled out for the scribes '
    + 'here, a tax year that starts in a different month, and a garrison apiece.\n\n'
    + 'What is left is the hill country round the capital and a strip of the coast road. '
    + 'The muster rolls in the chancery still list the towns that were taken, the levy is '
    + 'still assessed on them, and the storehouses are still supposed to be filled by '
    + 'them. None of it is true and all of it is written down.',
    '2 Kings 15:29: Tiglath-Pileser III took Ijon, Abel-beth-maacah, Janoah, Kedesh, Hazor, Gilead and all Naphtali and carried the people to Assyria, turning the districts into the Assyrian provinces of Magidu, Du\'ru and Gal\'aza.',
    { label: 'Reassess the whole kingdom on what is left of it',
      tooltip: '−2,000 manpower and +35 governance points, with "The Smaller Kingdom" (−10% cost of governing, +7% income) permanently: a state whose books describe the country it actually has.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx);
        h.adjust(ctx, me, { manpower: -2000, gov: 35, legitimacy: -8 });
        mod(ctx, 'h732_the_smaller_kingdom', 'The Smaller Kingdom', { adminMult: 0.9, incomeMult: 1.07 });
        pmod(ctx, 'Sebaste', 'h732_capital_of_a_rump', 'Capital of What Is Left', { taxMult: 1.12 }, 240);
        h.chronicle(ctx, 'era', 'The rolls are cut down to the districts that still answer. The '
          + 'kingdom is a third of the size it was at the last census and the storehouses are '
          + 'full for the first time in four years.'); } },
    { label: 'Keep the old rolls and the old assessment',
      tooltip: '+15 legitimacy and "The Kingdom on Paper" (+9% manpower, +1.0 unrest everywhere, −8% income) for twenty years. The lost districts stay on the books; the levy officers come back from them empty-handed.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx);
        h.adjust(ctx, me, { legitimacy: 15, gov: -20 });
        mod(ctx, 'h732_kingdom_on_paper', 'The Kingdom on Paper', { manpowerMult: 1.09, unrestAll: 1, incomeMult: 0.92 }, 240);
        for (const n of ['Afula', 'Scythopolis', 'Safed', 'Caesarea Philippi']) {
          pmod(ctx, n, 'h732_claimed_not_held', 'Claimed, Not Held', { unrest: 1.2 }, 180);
        }
        h.chronicle(ctx, 'era', 'The chancery goes on assessing Naphtali and Gilead. Twice a year '
          + 'an officer rides north with a demand and comes back with a story about the roads.'); } }),

  Y('ev732h_the_high_places', 'The Platforms on the Hills', -726, 10, 'JDH',
    'There is a platform on the hill above almost every village in this kingdom: an '
    + 'altar, a standing stone, a pole, and a man whose family has served it for as long '
    + 'as the village has been there. Nothing about them is foreign. They are where a '
    + 'farmer takes a firstborn lamb without walking three days, and they have been in '
    + 'use since before there was a monarchy to disapprove of them.\n\n'
    + 'The reforming party wants every one of them broken, the stones pulled down and the '
    + 'poles burned, and the whole sacrifice of the country brought into one building in '
    + 'the capital. The objection from the treasury is that those priests have portions '
    + 'and the portions are a form of local pay; the objection from the districts is '
    + 'three days\' walk each way with a lamb.',
    '2 Kings 18:4: Hezekiah removed the high places, broke the pillars and cut down the Asherah — the first attempt at a single lawful altar, a century before Josiah repeated it.',
    { label: 'Break them, and bring the sacrifice into the city',
      tooltip: '−60 talents and +18 legitimacy, with "One Altar" (+18% pilgrimage, +6% income) permanently and +0.9 unrest everywhere for twenty-five years. Every village loses its own priest and its own hill.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -60, legitimacy: 18, gov: -15 });
        mod(ctx, 'h732_one_altar', 'One Altar', { pilgrimMult: 1.18, incomeMult: 1.06 });
        mod(ctx, 'h732_the_hills_stripped', 'The Hills Stripped', { unrestAll: 0.9 }, 300);
        pmod(ctx, 'Jerusalem', 'h732_the_only_altar', 'The Only Altar', { taxMult: 1.2, prodMult: 1.1 }, -1);
        h.chronicle(ctx, 'era', 'The platforms come down district by district and the stones are '
          + 'broken where they stand. The country priests are offered a portion in the capital; '
          + 'most of them do not take it.'); } },
    { label: 'License the platforms and tax the portions',
      tooltip: '+140 talents and +25 governance points, with "The Licensed Platforms" (+8% income, −0.6 unrest everywhere) for thirty years, at −12 legitimacy. The reforming party is told it has been heard.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: 140, gov: 25, legitimacy: -12 });
        mod(ctx, 'h732_licensed_platforms', 'The Licensed Platforms', { incomeMult: 1.08, unrestAll: -0.6 }, 360);
        h.chronicle(ctx, 'era', 'Every hilltop altar in the kingdom is registered, assessed and '
          + 'left standing. The revenue is immediate and the argument is deferred by a century.'); } }),

  Y('ev732h_the_king_bound', 'The King Bound in the Camp', -723, 4, 'ISL',
    'The king went down to the Assyrian camp under safe conduct to explain the missing '
    + 'instalment and the letters that went to Egypt. He has not come back. The empire\'s '
    + 'word is that he was found in conspiracy, and he is in irons somewhere behind the '
    + 'lines; the army that took him is now investing the capital.\n\n'
    + 'So the city is being besieged to punish a man the besiegers already hold. There is '
    + 'no king on the hill, no heir old enough to matter and no procedure for either. The '
    + 'council can put a name on the throne and fight, or it can send the elders down the '
    + 'road to find out what terms exist.',
    '2 Kings 17:4: Shalmaneser V found conspiracy in Hoshea, who had sent to So king of Egypt and brought no tribute, and shut him up and bound him in prison — and then besieged Samaria for three years.',
    { label: 'Shut the gates and hold without a king',
      tooltip: '+20 legitimacy and "No King on the Hill" (+20% siege endurance, +10% morale, −6% income) for twenty years. The record says three years; three years is what the cisterns and the grain have to be.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx);
        h.adjust(ctx, me, { legitimacy: 20, mar: 40, warExhaustion: 2 });
        mod(ctx, 'h732_no_king_on_the_hill', 'No King on the Hill', { siegeMult: 1.2, moraleMult: 1.1, incomeMult: 0.94 }, 240);
        opinion(ctx, 'ASR', me, -40);
        h.chronicle(ctx, 'era', 'The gates are shut with the throne empty and the council sitting '
          + 'in the king\'s place. The siege lines settle in and the city holds for three years.'); } },
    { label: 'Send the elders down to ask terms',
      tooltip: '−180 talents and Assyria to +40 regard, with "The City Treating" (−1.0 unrest everywhere, +6% income) for fifteen years, at −20 legitimacy. The terms on offer begin with a governor.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx);
        h.adjust(ctx, me, { treasury: -180, legitimacy: -20, gov: 20 });
        mod(ctx, 'h732_the_city_treating', 'The City Treating', { unrestAll: -1, incomeMult: 1.06 }, 180);
        opinion(ctx, 'ASR', me, 40);
        h.chronicle(ctx, 'era', 'The elders go down under a white cloth and are heard courteously. '
          + 'What is offered is a governor, a garrison and the survival of everybody in the room.'); } }),

  Y('ev732h_twenty_seven_thousand', 'Twenty-Seven Thousand Two Hundred and Ninety', -722, 9, 'ISL',
    'The city is taken and the procedure has begun. It is not a massacre and nobody in '
    + 'the column is in chains: the population is being counted household by household, '
    + 'registered by trade, issued rations and marched east with its tools. The number '
    + 'that goes into the annals is twenty-seven thousand two hundred and ninety, and '
    + 'fifty chariots have been taken out of it into the royal corps.\n\n'
    + 'The destinations are named: Halah, the Habor, the river of Gozan, the cities of '
    + 'the Medes. Four places, a thousand miles apart, chosen so that nobody arrives '
    + 'anywhere with enough of his own people to be anything in particular. The families '
    + 'on the road have one decision left, and it has to be made before the column moves.',
    'Sargon II\'s annals claim 27,290 deportees from Samaria and fifty chariots taken into his own corps; 2 Kings 17:6 names Halah, the Habor, the river of Gozan and the cities of the Medes.',
    { label: 'Go in the column, and keep the register whole',
      tooltip: '−40 talents to buy the clerks and "The Register Carried East" (+8% growth, −0.7 unrest everywhere) for thirty years, with Assyria to +30 regard. Families that stay written down beside each other stay a people.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx);
        h.adjust(ctx, me, { treasury: -40, legitimacy: 10 });
        mod(ctx, 'h732_register_carried_east', 'The Register Carried East', { growthMult: 1.08, unrestAll: -0.7 }, 360);
        opinion(ctx, 'ASR', me, 30);
        h.setFlag(ctx, 'samariaDeported', true);
        h.chronicle(ctx, 'era', 'The households are enrolled by father\'s house before the column '
          + 'moves, and the clerks are paid to keep the sheets together. Four settlements go east '
          + 'knowing each other\'s names.'); } },
    { label: 'Break south into the hill country before the count',
      tooltip: '+4,000 manpower to Judah and Jerusalem worked harder (+12% production, +1.0 unrest) permanently, at −25 legitimacy here. Those who run are off the register, which is the whole of their protection and the whole of their risk.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx);
        h.adjust(ctx, me, { legitimacy: -25 });
        h.adjust(ctx, 'JDH', { manpower: 4000 });
        h.setFlag(ctx, 'samariaDeported', true);
        pmod(ctx, 'Jerusalem', 'h732_the_northern_quarter', 'The Northern Quarter', { prodMult: 1.12, unrest: 1 });
        h.chronicle(ctx, 'era', 'Whole villages go over the watershed at night with what they can '
          + 'carry. Within a generation the capital in the south has doubled and a fifth of it '
          + 'speaks with a northern accent.'); } }),

  Y('ev732h_the_posts_through_israel', 'The Posts Sent Through Israel', -721, 2, 'JDH',
    'Runners are going north with letters, and the country they are going into is an '
    + 'Assyrian province with a governor in it. The letters invite the men of Ephraim and '
    + 'Manasseh and as far as Zebulun to come up to the house in Jerusalem and keep the '
    + 'passover in the second month, the first month having been missed while the house '
    + 'was being cleaned out.\n\n'
    + 'In most of the towns the runners are laughed at in the street. In some they are '
    + 'not. What nobody at this court can pretend is that the governor in Samaria will '
    + 'fail to notice a foreign king summoning his subjects across a border for a feast '
    + 'in his own capital.',
    '2 Chronicles 30: Hezekiah\'s posts went from city to city through Ephraim and Manasseh to Zebulun, where they were laughed to scorn, though men of Asher, Manasseh and Zebulun came to the passover at Jerusalem.',
    { label: 'Send the posts as far as Zebulun',
      tooltip: '−70 talents and +20 legitimacy, with "The Feast of the Second Month" (+15% pilgrimage, +7% growth) permanently, at Assyria to −30 regard. The province is being invited to remember whose country it was.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -70, legitimacy: 20 });
        mod(ctx, 'h732_feast_of_the_second_month', 'The Feast of the Second Month', { pilgrimMult: 1.15, growthMult: 1.07 });
        opinion(ctx, 'ASR', 'JDH', -30);
        h.setFlag(ctx, 'northInvited', true);
        h.chronicle(ctx, 'era', 'The runners get as far as Zebulun and are mocked in most of it. '
          + 'Men of Asher, Manasseh and Zebulun come down the ridge road anyway and are counted '
          + 'at the gate.'); } },
    { label: 'Keep the invitation south of the border',
      tooltip: '+30 governance points and "A Feast Within the Border" (+9% income, −0.5 unrest everywhere) for twenty-five years. A smaller passover, and no letter to Nineveh about it.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { gov: 30, legitimacy: -8 });
        mod(ctx, 'h732_feast_within_the_border', 'A Feast Within the Border', { incomeMult: 1.09, unrestAll: -0.5 }, 300);
        opinion(ctx, 'ASR', 'JDH', 20);
        h.chronicle(ctx, 'era', 'The posts are turned back at the old frontier. The feast is kept '
          + 'by this kingdom alone, correctly, and the north hears about it second-hand.'); } }),

  Y('ev732h_men_of_babylon_and_cuthah', 'Men of Babylon, Cuthah, Avva, Hamath and Sepharvaim', -720, 6, 'both',
    'A column has come up the northern road with its own registers, and it is not an '
    + 'army. It is a population: men of Babylon, of Cuthah, of Avva, of Hamath and of '
    + 'Sepharvaim, deported out of cities that revolted at the other end of the empire, '
    + 'arriving with tools, seed corn, and an allotment order naming the towns of Samaria '
    + 'they are to occupy instead of the children of Israel.\n\n'
    + 'The houses they are being given still have things in them. The terraces they are '
    + 'being given have been standing unworked for two seasons and are going back to '
    + 'scrub. Nobody in the column chose to be here either, which is a fact that the '
    + 'people already in the district are not yet in any condition to find interesting.',
    '2 Kings 17:24: the king of Assyria brought men from Babylon, Cuthah, Avva, Hamath and Sepharvaim and placed them in the cities of Samaria instead of the children of Israel, and they possessed Samaria and dwelt in the cities thereof.',
    { label: 'Let them take the fields, and deal with them as neighbours',
      tooltip: '−50 talents and "The New Cultivators" (+8% income, +6% growth) for forty years, with Samaria at +15% production and +1.2 unrest for twenty. The district produces again and stops being ours in the same season.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx);
        h.adjust(ctx, me, { treasury: -50, legitimacy: -10 });
        mod(ctx, 'h732_new_cultivators', 'The New Cultivators', { incomeMult: 1.08, growthMult: 1.06 }, 480);
        pmod(ctx, 'Sebaste', 'h732_settled_by_decree', 'Settled by Decree', { prodMult: 1.15, unrest: 1.2 }, 240);
        pmod(ctx, 'Neapolis', 'h732_settled_by_decree', 'Settled by Decree', { prodMult: 1.12, unrest: 1 }, 240);
        h.setFlag(ctx, 'samariaResettled', true);
        h.chronicle(ctx, 'era', 'The allotment orders are honoured, the terraces are cleared and '
          + 'sown, and the district has a harvest. Half the names on the tithe list cannot be '
          + 'pronounced by the man who keeps it.'); } },
    { label: 'Deny them the wells and the terraces',
      tooltip: '+18 legitimacy and "The Land Withheld" (+7% manpower, +0.8 unrest everywhere) for thirty years, at Assyria to −35 regard and Samaria at −20% production. The settlers stay; so does the quarrel, for two and a half millennia.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx);
        h.adjust(ctx, me, { legitimacy: 18, treasury: -30 });
        mod(ctx, 'h732_the_land_withheld', 'The Land Withheld', { manpowerMult: 1.07, unrestAll: 0.8 }, 360);
        pmod(ctx, 'Sebaste', 'h732_wells_denied', 'The Wells Denied', { prodMult: 0.8, unrest: 2 }, 300);
        opinion(ctx, 'ASR', me, -35);
        h.setFlag(ctx, 'samariaResettled', true);
        h.chronicle(ctx, 'era', 'The wells are held against the incomers and the boundary stones '
          + 'are moved back at night. Both populations spend the next four hundred years '
          + 'explaining whose district this is.'); } }),

  Y('ev732h_the_lions_in_the_land', 'The Lions', -718, 8, 'both',
    'The settlers are losing people and stock. Two seasons of empty terraces put the '
    + 'scrub back up the slopes, the game came down with it, and the lions came down '
    + 'after the game; the new villages are set among orchards nobody has pruned, and '
    + 'they are burying somebody most months.\n\n'
    + 'A petition has gone up the road to Nineveh in the settlers\' own words, and its '
    + 'argument is theological: the nations the king removed and placed here do not know '
    + 'the manner of the god of this land, therefore the god of the land is sending lions '
    + 'among them. In the files at Nineveh this is an agricultural problem — a province '
    + 'whose cultivators keep leaving does not produce a surplus — and it will be '
    + 'answered as one.',
    '2 Kings 17:25-26: lions killed some of the settlers, who petitioned the king of Assyria that they did not know the manner of the God of the land and that he had therefore sent lions among them.',
    { label: 'Let the petition go up, and let Nineveh answer it',
      tooltip: '+35 influence points and "The Question Referred" (−0.5 unrest everywhere, +5% income) for twenty years. The empire will decide what the god of this country requires, which is a precedent nobody here has thought through.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx);
        h.adjust(ctx, me, { infl: 35, legitimacy: -6 });
        mod(ctx, 'h732_the_question_referred', 'The Question Referred', { unrestAll: -0.5, incomeMult: 1.05 }, 240);
        h.setFlag(ctx, 'lionsPetition', true);
        h.chronicle(ctx, 'era', 'The petition goes north with the district returns. An empire that '
          + 'has never had an opinion about this god is about to issue one, in writing, as an '
          + 'administrative order.'); } },
    { label: 'Send our own hunters and clear the slopes',
      tooltip: '−90 talents and −1,500 manpower, with "The Slopes Cleared" (+10% income, +6% growth) permanently and Samaria at +20% production. The lions stop; the question of whose god this is stays open and answered by nobody.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx);
        h.adjust(ctx, me, { treasury: -90, manpower: -1500, gov: 20 });
        mod(ctx, 'h732_the_slopes_cleared', 'The Slopes Cleared', { incomeMult: 1.1, growthMult: 1.06 });
        pmod(ctx, 'Sebaste', 'h732_orchards_pruned', 'The Orchards Pruned', { prodMult: 1.2 }, 360);
        h.chronicle(ctx, 'era', 'Hunting parties work the slopes for a season and the orchards are '
          + 'pruned back. The lions go, the petition is never answered, and the settlers go on '
          + 'keeping whatever they brought with them.'); } }),

  Y('ev732h_the_priest_sent_back', 'A Priest Sent Back to Teach Them', -717, 5, 'both',
    'The empire\'s answer to a religious question is a posting order. One of the priests '
    + 'deported out of the northern towns four years ago is being sent back at imperial '
    + 'expense, with a travel ration and an escort, to live at Bethel and teach the '
    + 'incoming population how they should fear the god of the land.\n\n'
    + 'Nobody in Nineveh is going to check what he teaches or out of which books. He has '
    + 'no colleagues, no archive and no oversight, and he is about to found the practice '
    + 'of a whole district for the next several centuries. The file will record only that '
    + 'the lions stopped and the tithe came in.',
    '2 Kings 17:27-28: one of the deported priests was sent back and dwelt in Bethel, and taught them how they should fear the LORD — the imperial order behind a cult the sources afterwards treat as foreign.',
    { label: 'Let it be a priest of the old northern houses',
      tooltip: '−60 talents and "The Altar at Bethel Reopened" (+12% pilgrimage, +6% income) permanently, with Bethel at +15% tax. The practice that results is continuous with what was there, and answerable to nobody in the south.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx);
        h.adjust(ctx, me, { treasury: -60, legitimacy: 8 });
        mod(ctx, 'h732_bethel_reopened', 'The Altar at Bethel Reopened', { pilgrimMult: 1.12, incomeMult: 1.06 });
        pmod(ctx, 'Ramallah', 'h732_the_teaching_priest', 'The Teaching Priest', { taxMult: 1.15, unrest: -0.8 }, -1);
        h.setFlag(ctx, 'bethelPriestSent', true);
        h.chronicle(ctx, 'era', 'A priest of the old courses goes back up to Bethel under escort '
          + 'and begins teaching the feasts, the firstfruits and the sabbath to men who were '
          + 'farming outside Cuthah five years ago.'); } },
    { label: 'Petition to send a priest of the house in Jerusalem',
      tooltip: '−45 influence points and −80 talents, with "The Teaching Claimed" (+10% conversion, +0.6 unrest everywhere) for forty years and Assyria to −25 regard. The south writes the north\'s liturgy, if the province will take it.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx);
        h.adjust(ctx, me, { infl: -45, treasury: -80, legitimacy: 12 });
        mod(ctx, 'h732_the_teaching_claimed', 'The Teaching Claimed', { convertMult: 1.1, unrestAll: 0.6 }, 480);
        pmod(ctx, 'Ramallah', 'h732_a_southern_priest', 'A Southern Priest at Bethel', { unrest: 1.4 }, 300);
        opinion(ctx, 'ASR', me, -25);
        h.chronicle(ctx, 'era', 'A man of the Jerusalem courses is sent north with the imperial '
          + 'escort and the imperial ration. He is received politely at Bethel and ignored in the '
          + 'villages, where the old priests are already back at work.'); } }),

  Y('ev732h_nehushtan', 'Nehushtan', -715, 3, 'JDH',
    'There is a bronze serpent on a pole in the house. It is older than the building, it '
    + 'is older than the dynasty, and it is attributed to Moses. People burn incense to '
    + 'it: women bring it small things when a child is sick, men touch it on the way out '
    + 'to the roads, and the priests have been taking the offerings and entering them in '
    + 'the accounts for as long as there have been accounts.\n\n'
    + 'The reforming party wants it broken up. The objection in the room is not that the '
    + 'incense is lawful — nobody argues that — it is that this is the one object in the '
    + 'kingdom made by the man the whole law is attributed to. The king\'s answer is to '
    + 'stop calling it a serpent and start calling it what it is: a piece of brass.',
    '2 Kings 18:4: Hezekiah broke in pieces the bronze serpent Moses had made, to which the children of Israel had been burning incense, and called it Nehushtan — a thing of brass.',
    { label: 'Break it up, and give it the name',
      tooltip: '+16 legitimacy and "The Thing of Brass" (+15% conversion, −7% income) permanently, at +0.8 unrest everywhere for twenty-five years. An antiquity is destroyed to make a point about what an antiquity is.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { legitimacy: 16, gov: -15, treasury: -25 });
        mod(ctx, 'h732_the_thing_of_brass', 'The Thing of Brass', { convertMult: 1.15, incomeMult: 0.93 });
        mod(ctx, 'h732_the_incense_stopped', 'The Incense Stopped', { unrestAll: 0.8 }, 300);
        h.setFlag(ctx, 'nehushtanBroken', true);
        h.chronicle(ctx, 'era', 'The serpent is taken off the pole and broken up in the outer '
          + 'court, and the king gives it a name that turns it into an object. The women who '
          + 'brought it incense go on bringing it, to the place where it stood.'); } },
    { label: 'Leave it standing and keep the incense',
      tooltip: '+90 talents and "The Oldest Thing in the House" (+10% pilgrimage, −0.7 unrest everywhere) for thirty years, at −14 legitimacy. The reform stops at the door of the room that matters.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: 90, legitimacy: -14, gov: 20 });
        mod(ctx, 'h732_oldest_thing_in_the_house', 'The Oldest Thing in the House', { pilgrimMult: 1.1, unrestAll: -0.7 }, 360);
        h.chronicle(ctx, 'era', 'The serpent stays on its pole and the offerings go on being '
          + 'entered in the accounts. The reformers are told that a thing made by Moses is not '
          + 'the place to start.'); } }),

  Y('ev732h_feared_and_served', 'They Feared the LORD and Served Their Own Gods', -713, 11, 'both',
    'A generation on, the northern district keeps both. The altar the deported priest '
    + 'reopened runs the year — the feasts, the firstfruits, the sabbath, the tithe — and '
    + 'beside it every nation in the resettlement keeps what it brought: the men of '
    + 'Cuthah keep Nergal, the Hamathites keep Ashima, the men of Avva have their own '
    + 'pair, and what the Sepharvites do with their children in the fire is something no '
    + 'neighbouring village will describe to a scribe.\n\n'
    + 'The view from the south is that these are not Israelites and the cult is a '
    + 'counterfeit. The view from the district is that they hold this land and keep the '
    + 'god of it, which is the only definition of belonging anyone in this century has '
    + 'ever managed to enforce. A ruling either way will outlive everyone in the room.',
    '2 Kings 17:29-41: every nation made gods of its own and set them in the high places the Samaritans had made — "they feared the LORD, and served their own gods" — the passage later writers took as the origin of the Samaritans.',
    { label: 'Let them keep both, and let the district settle',
      tooltip: '−40 talents and "Two Practices, One District" (+10% income, +8% growth, −0.6 unrest everywhere) permanently. Samaria and Shechem keep the god of the land by a practice of their own, and "The Mixed District" (+10% tax, −0.5 unrest) stands there for good.',
      // Still Yahwism (SPEC §284): the district "feared the LORD", and a
      // Samaritan faith with its own canon and temple is a Persian- and
      // Hellenistic-age development, four centuries past this card. What the
      // ruling founds is a practice, not a religion — the modifiers carry it.
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx);
        h.adjust(ctx, me, { treasury: -40, legitimacy: -10, gov: 15 });
        mod(ctx, 'h732_two_practices', 'Two Practices, One District', { incomeMult: 1.1, growthMult: 1.08, unrestAll: -0.6 });
        for (const n of ['Sebaste', 'Neapolis']) {
          pmod(ctx, n, 'h732_the_mixed_district', 'The Mixed District', { taxMult: 1.1, unrest: -0.5 }, -1);
        }
        h.setFlag(ctx, 'samaritansSeated', true);
        h.chronicle(ctx, 'era', 'No ruling is issued and the district settles into its own '
          + 'practice: the god of the land kept by the feasts, and everything else kept in the '
          + 'house. They are still there, on the same mountain, twenty-seven centuries later.'); } },
    { label: 'Rule that the god of this land has one house, and it is not theirs',
      tooltip: '+22 legitimacy and "The Counterfeit Named" (+14% conversion, +12% morale) for forty years, at +1.5 unrest in Samaria and Shechem permanently and −8% income. The quarrel is now doctrinal and has no exit.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx);
        h.adjust(ctx, me, { legitimacy: 22, infl: -25 });
        mod(ctx, 'h732_the_counterfeit_named', 'The Counterfeit Named', { convertMult: 1.14, moraleMult: 1.12, incomeMult: 0.92 }, 480);
        for (const n of ['Sebaste', 'Neapolis']) {
          pmod(ctx, n, 'h732_district_under_anathema', 'The District Under Anathema', { unrest: 1.5, taxMult: 0.9 }, -1);
        }
        h.setFlag(ctx, 'samaritansRejected', true);
        h.chronicle(ctx, 'era', 'It is ruled from the capital that the northern altars are a '
          + 'foreign cult wearing this god\'s name. The district goes on keeping the feasts '
          + 'anyway, and the two liturgies diverge one custom at a time.'); } }),

  // ── the tunnel ────────────────────────────────────────────────────────────
  Y('ev732h_two_gangs_under_the_city', 'Two Gangs Under the Hill', -711, 6, 'JDH',
    'The spring is outside the wall and always has been, which is the single fact that '
    + 'decides how long this city can be besieged. The engineers have put two proposals '
    + 'on the table. The first is a covered channel along the slope: cheap, quick, and '
    + 'cuttable in an afternoon by anyone with a mattock and a reason.\n\n'
    + 'The second is to drive a shaft under the hill from the spring and another from the '
    + 'pool inside the wall and have the two gangs cut toward each other through five '
    + 'hundred metres of limestone, without instruments, on a line that will have to '
    + 'curve. If they miss they will cut doglegs and listen for each other through the '
    + 'rock. It takes a year, it takes the quarrymen off the terraces, and nobody has '
    + 'ever done it.',
    'The Siloam tunnel: 533 metres of rock cut in an S-curve by two gangs working from opposite ends, bringing the Gihon spring inside the walls of Jerusalem.',
    { label: 'Cut from both ends, and trust the men to hear each other',
      tooltip: '−160 talents and −2,500 manpower, with "The Water Under the Hill" (+18% siege endurance, +6% growth) permanently and Jerusalem at +10% tax. A year of the kingdom\'s stonemasons spent underground.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -160, manpower: -2500, mar: 20 });
        mod(ctx, 'h732_water_under_the_hill', 'The Water Under the Hill', { siegeMult: 1.18, growthMult: 1.06 });
        pmod(ctx, 'Jerusalem', 'h732_the_pool_inside', 'The Pool Inside the Wall', { taxMult: 1.1 }, -1);
        h.setFlag(ctx, 'siloamCut', true);
        h.chronicle(ctx, 'era', 'The gangs go in at both ends in the spring and are still under '
          + 'the hill at the next harvest. The quarry gangs are paid in grain from the royal '
          + 'stores because there is nobody left on the terraces to grow it.'); } },
    { label: 'Run a covered channel along the slope',
      tooltip: '−50 talents and +25 governance points, with "The Channel on the Slope" (+9% income, +7% growth) permanently and Jerusalem at +15% production. Water for the gardens, and a siege line that only has to find one ditch.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -50, gov: 25 });
        mod(ctx, 'h732_channel_on_the_slope', 'The Channel on the Slope', { incomeMult: 1.09, growthMult: 1.07 });
        pmod(ctx, 'Jerusalem', 'h732_the_watered_gardens', 'The Watered Gardens', { prodMult: 1.15 }, -1);
        h.chronicle(ctx, 'era', 'The channel is cut along the contour in six weeks and the gardens '
          + 'below the city come into bearing. The spring is still outside the wall, and every '
          + 'staff officer on this coast knows it.'); } }),

  Y('ev732h_twelve_hundred_cubits', 'Twelve Hundred Cubits', -709, 2, 'JDH',
    'The men who cut the tunnel have carved an account of it into the rock at the join, '
    + 'in six lines, about fifteen metres in from the pool. It describes the last three '
    + 'cubits: the quarrymen still lifting the pick each toward his fellow, and the voice '
    + 'of a man heard calling to his fellow through a fissure in the rock on the right '
    + 'hand and on the left; and then the water ran from the spring to the pool, twelve '
    + 'hundred cubits, with the height of the rock above the heads of the quarrymen a '
    + 'hundred cubits.\n\n'
    + 'There is no king in it. No regnal year, no name, no god thanked, no boast about '
    + 'who commissioned what. Every other monumental inscription cut in this century '
    + 'anywhere between here and the Tigris is a king telling you what he did, and this '
    + 'is six lines by the workmen about hearing each other through a wall.',
    'The Siloam inscription, found in 1880 on the tunnel wall: the only monumental Hebrew inscription of the kingdom, and it names no king.',
    { label: 'Leave it as the men cut it',
      tooltip: '+18 legitimacy and "The Workmen\'s Account" (+12% morale, −0.6 unrest everywhere) permanently. A state that lets its labourers own a piece of masonry is remembered by them for it.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { legitimacy: 18, gov: -10 });
        mod(ctx, 'h732_workmens_account', 'The Workmen\'s Account', { moraleMult: 1.12, unrestAll: -0.6 });
        h.chronicle(ctx, 'era', 'The six lines are left exactly as the gangs cut them, fifteen '
          + 'metres in from the pool, in the dark. They are still legible twenty-six centuries '
          + 'later and they still do not mention a king.'); } },
    { label: 'Cut the king\'s name and the regnal year above it',
      tooltip: '−30 talents and +30 governance points, with "The Work of the King" (+10% income, −8% cost of governing) permanently, at −10 legitimacy with the gangs. The building programme acquires a signature, which is what a building programme is for.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -30, gov: 30, legitimacy: -10 });
        mod(ctx, 'h732_the_work_of_the_king', 'The Work of the King', { incomeMult: 1.1, adminMult: 0.92 });
        h.chronicle(ctx, 'era', 'A second panel is cut above the first with the king\'s name and '
          + 'the year of the reign. The stonecutters do the work and are not asked what they '
          + 'think of it.'); } }),

  // ── the embassy, the coalition, the campaign ──────────────────────────────
  Y('ev732h_house_of_his_precious_things', 'The House of His Precious Things', -703, 3, 'JDH',
    'The chamberlain kept a list of what the Chaldean\'s envoys were shown, because the '
    + 'chamberlain keeps a list of everything: the silver, the gold, the spices, the '
    + 'precious ointment, the whole armoury, every vessel in the treasuries. The entry at '
    + 'the foot of it reads that there was nothing in the house, nor in all the dominion, '
    + 'that the king did not show them.\n\n'
    + 'The prophet\'s question afterwards was procedural — what did they see — and his '
    + 'conclusion was an inventory too: all that is in the house, and what the fathers '
    + 'have laid up, shall be carried to Babylon, and nothing shall be left. Whatever '
    + 'else that is, it is also true that an accurate valuation of this kingdom now exists '
    + 'in two copies and one of them went east on a mule.',
    '2 Kings 20:12-19 and Isaiah 39: Hezekiah showed Merodach-baladan\'s envoys all the house of his precious things, and was told that everything in it would one day be carried to Babylon.',
    { label: 'Let the list stand, and make the understanding worth what it cost',
      tooltip: '+40 influence points and "The Understanding With Babylon" (+9% army strength, +8% trade) for twenty-five years, with Babylon to +60 regard and Assyria to −55. The southern flank is a real thing and it is four hundred leagues away.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { infl: 40, mar: 20 });
        mod(ctx, 'h732_understanding_with_babylon', 'The Understanding With Babylon', { milPowerMult: 1.09, tradeMult: 1.08 }, 300);
        opinion(ctx, 'BBL', 'JDH', 60);
        opinion(ctx, 'ASR', 'JDH', -55);
        h.setFlag(ctx, 'babylonInventory', true);
        h.chronicle(ctx, 'era', 'The inventory is filed and the envoys go home with a copy of it '
          + 'and an understanding. Both documents outlive the arrangement by about a century, at '
          + 'which point one of them is used.'); } },
    { label: 'Recall the chamberlain and break the reserve up among the fortresses',
      tooltip: '−120 talents in carriage and loss, with "The Treasury Dispersed" (+12% siege endurance, −6% income) permanently and Babylon to −30 regard. What is in forty strongrooms cannot be taken in one afternoon — or spent in one.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -120, gov: 25 });
        mod(ctx, 'h732_treasury_dispersed', 'The Treasury Dispersed', { siegeMult: 1.12, incomeMult: 0.94 });
        for (const n of ['Kiryat Gat', 'Beit Shemesh', 'Lydda']) {
          pmod(ctx, n, 'h732_a_strongroom_here', 'A Strongroom Here', { taxMult: 1.08 }, 300);
        }
        opinion(ctx, 'BBL', 'JDH', -30);
        h.chronicle(ctx, 'era', 'The reserve goes out to the fortified towns in escorted loads and '
          + 'the chamberlain is replaced. In two years most of those towns will be administered '
          + 'from Ashdod and Ekron.'); } }),

  Y('ev732h_padi_in_chains', 'Padi in Chains', -702, 10, 'JDH',
    'The nobles of Ekron have deposed their own king for refusing to join the revolt, '
    + 'put him in iron fetters, and sent him here. He is in a house on the western hill '
    + 'with a guard on the door, and he is a vassal in good standing who kept an oath '
    + 'sworn to Assyria, which is precisely why his own council could not keep him.\n\n'
    + 'Holding him makes this kingdom the head of the coalition, in writing, under its own '
    + 'king\'s name, in an archive in Nineveh that is not going to be destroyed for ninety '
    + 'years. Sending him home ends the coalition in a week and tells the empire the name '
    + 'of every man in it, starting with the men who handed him over.',
    'Sennacherib\'s annals: the officials and people of Ekron threw Padi their king, who was bound by an oath to Assyria, into iron fetters and handed him over to Hezekiah the Judaean, who kept him in confinement like an enemy.',
    { label: 'Keep him, and take the head of the coalition',
      tooltip: '+45 martial points and "The Head of the League" (+10% manpower, +8% force limit) for fifteen years, with Philistia to +45 regard and Assyria to −80. The name in the annals will be this kingdom\'s.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { mar: 45, legitimacy: 12 });
        mod(ctx, 'h732_head_of_the_league', 'The Head of the League', { manpowerMult: 1.1, forceLimitMult: 1.08 }, 180);
        opinion(ctx, 'PLS', 'JDH', 45);
        opinion(ctx, 'ASR', 'JDH', -80);
        h.setFlag(ctx, 'padiHeld', true);
        h.chronicle(ctx, 'era', 'The king of Ekron stays under guard on the western hill and the '
          + 'coalition has a capital. A clerk in Nineveh writes the sentence that will be read out '
          + 'to this city from the wall in two years.'); } },
    { label: 'Send him back to Ekron under escort',
      tooltip: '+160 talents and Assyria to +50 regard, with "No Part in It" (−1.0 unrest everywhere, +8% income) for twenty years, at −15 legitimacy and Philistia to −60. The league dissolves in a fortnight and remembers who dissolved it.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: 160, legitimacy: -15, gov: 25 });
        mod(ctx, 'h732_no_part_in_it', 'No Part in It', { unrestAll: -1, incomeMult: 1.08 }, 240);
        opinion(ctx, 'ASR', 'JDH', 50);
        opinion(ctx, 'PLS', 'JDH', -60);
        h.chronicle(ctx, 'era', 'Padi goes back down to Ekron with an escort and his fetters in a '
          + 'sack. The coalition is over inside a fortnight and the Philistine cities settle their '
          + 'own accounts without asking this kingdom for anything again.'); } }),

  Y('ev732h_the_rabshakeh', 'The Rabshakeh at the Conduit', -701, 7, 'JDH',
    'Three officers of the empire are standing at the conduit of the upper pool, on the '
    + 'fuller\'s field road, close enough to the wall to be heard by the men on it. The '
    + 'king\'s steward asked them to speak Aramaic — the language of diplomacy, which the '
    + 'officials understand and the militia does not — and the Rabshakeh answered that he '
    + 'had not been sent to the master or the steward but to the men sitting on the wall, '
    + 'and went on in Hebrew, louder.\n\n'
    + 'The trouble is that most of what he is saying is accurate. Egypt is a bruised reed '
    + 'and has gone into a hand that leaned on it before. The platforms their own king '
    + 'pulled down were this god\'s altars, whatever the reformers say. No god of any city '
    + 'on this coast has stopped this army. He has offered two thousand horses if they can '
    + 'produce riders for them, which they cannot. The men on the wall have been ordered '
    + 'to say nothing at all.',
    '2 Kings 18:17-36: the Rabshakeh refused to speak Aramaic and addressed the men on the wall in Hebrew, and the people held their peace, for the king\'s commandment was, Answer him not.',
    { label: 'Answer him not a word',
      tooltip: '+15 legitimacy and "The Wall That Said Nothing" (+10% morale, +12% siege endurance) for fifteen years, at +0.8 unrest everywhere for five. Discipline in front of an argument that half the garrison finds convincing.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { legitimacy: 15, mar: 25 });
        mod(ctx, 'h732_wall_that_said_nothing', 'The Wall That Said Nothing', { moraleMult: 1.1, siegeMult: 1.12 }, 180);
        mod(ctx, 'h732_what_he_said_repeated', 'What He Said, Repeated', { unrestAll: 0.8 }, 60);
        h.chronicle(ctx, 'era', 'The garrison stands on the wall through the whole speech and does '
          + 'not answer. The steward and the scribe come down with their clothes torn and repeat '
          + 'it word for word to the king, which is how it survives.'); } },
    { label: 'Put our own man on the wall to answer him in Hebrew',
      tooltip: '−25 influence points and "The Answer From the Wall" (+14% morale, +0.7 unrest everywhere) for twenty years. The city hears its own case made, and also hears it argued with, in public, by an officer who has better material.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { infl: -25, legitimacy: 8 });
        mod(ctx, 'h732_answer_from_the_wall', 'The Answer From the Wall', { moraleMult: 1.14, unrestAll: 0.7 }, 240);
        h.chronicle(ctx, 'era', 'A herald is put up on the gate tower to answer in kind, and the '
          + 'exchange goes on until dark. Both speeches are still being repeated in the markets a '
          + 'month later, which suits exactly one of the two sides.'); } }),

  Y('ev732h_sackcloth_and_the_answer', 'Sackcloth, and the Answer', -701, 8, 'JDH',
    'The king has torn his clothes, put on sackcloth and gone up into the house, and has '
    + 'sent the steward, the scribe and the elders of the priests, all in sackcloth, to a '
    + 'man who has spent twenty years telling him not to do the thing he has just done. '
    + 'The letter from the Assyrian camp has been spread out on the floor of the house, '
    + 'which is either an act of faith or the only remaining filing system.\n\n'
    + 'The answer that comes back is short and has a mechanism in it: a spirit, a rumour, '
    + 'a return to his own country, and a sword there. It is not counsel, it is a '
    + 'prediction, and the court is being asked to run the defence of the kingdom on it. '
    + 'The other paper on the table is arithmetic — three hundred talents of silver and '
    + 'thirty of gold, which is the treasury, the temple doors and the pillar plating, '
    + 'and the army goes away this week.',
    '2 Kings 18:14-16 and 19:1-7: Hezekiah paid 300 talents of silver and 30 of gold, stripping the temple doors, and also sent to Isaiah in sackcloth and was told the king of Assyria would hear a rumour and return to his own land.',
    { label: 'Stand on the word and keep the gates shut',
      tooltip: '+22 legitimacy and +3 war exhaustion, with "The Word Stood On" (+12% morale, +15% siege endurance) for twenty-five years. Nothing is paid, nothing is stripped, and the whole thing rests on a sentence.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { legitimacy: 22, warExhaustion: 3, mar: 30 });
        mod(ctx, 'h732_the_word_stood_on', 'The Word Stood On', { moraleMult: 1.12, siegeMult: 1.15 }, 300);
        h.setFlag(ctx, 'isaiahAnswerTaken', true);
        h.chronicle(ctx, 'era', 'Nothing is weighed out and nothing is stripped. The court spends '
          + 'the rest of the summer running a siege on the strength of a short answer delivered by '
          + 'a man in the lower city.'); } },
    { label: 'Weigh out the indemnity and strip the doors',
      tooltip: '−300 talents and −20 legitimacy, with "The Doors Stripped" (−1.0 unrest everywhere, +10% income) for twenty years and Assyria to +45 regard. The gold on the doorposts was put there by this king three years ago.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -300, legitimacy: -20, gov: 20 });
        mod(ctx, 'h732_the_doors_stripped', 'The Doors Stripped', { unrestAll: -1, incomeMult: 1.1 }, 240);
        opinion(ctx, 'ASR', 'JDH', 45);
        h.setFlag(ctx, 'indemnityPaid701', true);
        h.chronicle(ctx, 'era', 'The plating is cut off the doors and the pillars and weighed in '
          + 'the outer court with the priests watching. Thirty talents of gold go north on carts '
          + 'and the siege lines come down.'); } }),

  Y('ev732h_the_camp_in_the_morning', 'The Camp in the Morning', -701, 9, 'JDH',
    'The lines went quiet in the night and by mid-morning the camp was being fired by its '
    + 'own rearguard. The figure that goes into the chronicle is a hundred and eighty-five '
    + 'thousand dead, which is more men than the empire has ever put into one field; the '
    + 'Egyptians will tell the story with field-mice eating the bowstrings; the physician '
    + 'attached to the garrison observes that an army sitting six weeks beside its own '
    + 'latrines in a Shephelah summer does not require an angel.\n\n'
    + 'However it happened, the column is on the coast road going north, the king is alive '
    + 'on the ridge, and forty-six walled towns are in other people\'s hands. What the '
    + 'court decides this was will be preached in this city for the next hundred and '
    + 'fifteen years.',
    '2 Kings 19:35-36: 185,000 died in the Assyrian camp and Sennacherib departed and dwelt at Nineveh; Herodotus II.141 tells a version with mice gnawing the bowstrings, and Sennacherib\'s own annals record no capture of Jerusalem.',
    { label: 'Say what it was: the city cannot be taken',
      tooltip: '+30 legitimacy and "The City Delivered" (+20% pilgrimage, +10% morale, −0.8 unrest everywhere) permanently. A doctrine that holds the country together and will be preached at this gate to a Chaldean army that is not going to leave.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { legitimacy: 30, infl: 20 });
        mod(ctx, 'h732_the_city_delivered', 'The City Delivered', { pilgrimMult: 1.2, moraleMult: 1.1, unrestAll: -0.8 });
        h.setFlag(ctx, 'cityInviolable', true);
        h.notify(ctx, { title: 'The Camp in the Morning', text: 'The siege is lifted and the doctrine is preached the same week: this city is not taken.', type: 'good', provName: 'Jerusalem' });
        h.chronicle(ctx, 'era', 'It is preached from the gate within the week that this city is '
          + 'not a city that falls. A hundred and fifteen years later the same sermon is given at '
          + 'the same gate to a Babylonian siege train, and it is wrong.'); } },
    { label: 'Say nothing, and spend the winter buying back the low country',
      tooltip: '−280 talents and +35 governance points, with "The Towns Bought Back" (+12% income, +7% growth) for thirty years and the Shephelah at +15% tax, at Philistia to −35 regard. No doctrine, and the grain plain answers to the capital again.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -280, gov: 35, legitimacy: -8 });
        mod(ctx, 'h732_towns_bought_back', 'The Towns Bought Back', { incomeMult: 1.12, growthMult: 1.07 }, 360);
        for (const n of ['Kiryat Gat', 'Beit Shemesh', 'Lydda']) {
          pmod(ctx, n, 'h732_bought_back', 'Bought Back', { taxMult: 1.15, unrest: 0.5 }, 360);
        }
        opinion(ctx, 'PLS', 'JDH', -35);
        h.chronicle(ctx, 'era', 'No sermon is preached and the winter goes on silver. The western '
          + 'villages pay their tithes to the capital again; the district lists in Nineveh still '
          + 'say Ashdod, Ekron and Gaza.'); } }),

  Y('ev732h_forty_six_walled_towns', 'Forty-Six Walled Towns', -700, 4, 'JDH',
    'A copy of the Assyrian account has come back up the road with a merchant, and it is '
    + 'a set of numbers and one phrase. Forty-six strong walled cities and the small towns '
    + 'around them, taken by ramps of stamped earth and battering rams. Two hundred '
    + 'thousand one hundred and fifty people counted out, with the horses, mules, asses, '
    + 'camels, cattle and sheep. And the king of this country shut up like a bird in a '
    + 'cage in his royal city.\n\n'
    + 'Most of the figures are wrong in the same direction, which is the direction imperial '
    + 'figures are always wrong in. The phrase is the interesting part. The annals of an '
    + 'empire that has never lost a campaign contain no sentence saying this city was '
    + 'taken, because it was not, and some scribe in Nineveh had to compose a line that '
    + 'avoided saying so.',
    'Sennacherib\'s Rassam cylinder claims forty-six walled towns of Judah and 200,150 people taken, and says Hezekiah was shut up in Jerusalem "like a bird in a cage" — the campaign\'s own record of what it did not capture.',
    { label: 'Copy the annal into our own archive, phrase and all',
      tooltip: '+45 influence points and +12 legitimacy, with "A Bird in a Cage" (+12% morale, −0.5 unrest everywhere) permanently. The enemy\'s own account, kept because of the sentence it could not write.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { infl: 45, legitimacy: 12 });
        mod(ctx, 'h732_a_bird_in_a_cage', 'A Bird in a Cage', { moraleMult: 1.12, unrestAll: -0.5 });
        h.chronicle(ctx, 'era', 'The Assyrian account is copied into the royal archive with the '
          + 'numbers left as they stand. The court reads the whole thing out once a year for the '
          + 'one clause it does not contain.'); } },
    { label: 'Survey the forty-six and count what is actually left',
      tooltip: '−70 talents and +40 governance points, with "The Survey of the Low Country" (−12% cost of governing, +8% income) permanently, at −15 legitimacy. An honest register of a kingdom that has lost half its people.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -70, gov: 40, legitimacy: -15 });
        mod(ctx, 'h732_survey_of_low_country', 'The Survey of the Low Country', { adminMult: 0.88, incomeMult: 1.08 });
        for (const n of ['Kiryat Gat', 'Beit Shemesh']) {
          pmod(ctx, n, 'h732_counted_and_empty', 'Counted, and Empty', { taxMult: 0.85, prodMult: 0.85 }, 300);
        }
        h.chronicle(ctx, 'era', 'The surveyors go down into the Shephelah for a season and come '
          + 'back with a figure the council asks them to check twice. The kingdom is administered '
          + 'accurately from that year, and it is a small kingdom.'); } }),

  // ── fifty-five years ──────────────────────────────────────────────────────
  Y('ev732h_altars_in_the_two_courts', 'Altars in the Two Courts', -696, 3, 'JDH',
    'Manasseh is twelve, and the men round him are the ones his father\'s reform put out '
    + 'of their portions. The platforms are going back up on the hills district by '
    + 'district, the pole is back, and there are now altars in both courts of the house '
    + 'itself for the host of heaven — the star-lists, read and served in the Assyrian '
    + 'manner, in the courtyard of a building whose entire claim is that there is nothing '
    + 'in it.\n\n'
    + 'It is also a foreign policy, and a legible one. An empire that spent the last '
    + 'generation demonstrating what it does to kingdoms with ideas of their own is being '
    + 'shown a capital that keeps the same gods its governors keep. The tribute will be '
    + 'punctual, the roads will stay open, and for fifty-five years nothing comes down '
    + 'them.',
    '2 Kings 21:1-5: Manasseh rebuilt the high places, reared altars for Baal, made an Asherah, worshipped all the host of heaven and built altars for them in the two courts of the house of the LORD.',
    { label: 'Let the courts hold what the age holds',
      tooltip: '+220 talents and "The Courts Furnished" (+12% income, −0.9 unrest everywhere) for fifty years, with Assyria to +60 regard, at −25 legitimacy. The quietest half-century this kingdom will ever have.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: 220, legitimacy: -25, gov: 30 });
        mod(ctx, 'h732_the_courts_furnished', 'The Courts Furnished', { incomeMult: 1.12, unrestAll: -0.9 }, 600);
        opinion(ctx, 'ASR', 'JDH', 60);
        h.setFlag(ctx, 'courtsFurnished', true);
        h.chronicle(ctx, 'era', 'The altars go up in both courts and the hill platforms are '
          + 'relicensed. The chronicle gives the reign one page and every line of it is an '
          + 'accusation; the treasury gives it fifty-five years of surplus.'); } },
    { label: 'Keep the two courts clear and pay for it in silver',
      tooltip: '−260 talents and +22 legitimacy, with "The Courts Kept Clear" (+12% pilgrimage, +0.9 unrest everywhere) for forty years and Assyria to −35 regard. The tribute has to be larger to buy what the courtyard no longer says.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -260, legitimacy: 22, gov: -15 });
        mod(ctx, 'h732_courts_kept_clear', 'The Courts Kept Clear', { pilgrimMult: 1.12, unrestAll: 0.9 }, 480);
        opinion(ctx, 'ASR', 'JDH', -35);
        h.chronicle(ctx, 'era', 'The courtyards stay empty and the difference is made up in '
          + 'silver, every year, for as long as the regency can find it. The party of the '
          + 'platforms is not dismissed; it is simply not obeyed.'); } }),

  Y('ev732h_innocent_blood', 'From One End to the Other', -692, 10, 'JDH',
    'The reforming party is being killed. Not exiled and not fined: killed, in the city, '
    + 'by a procedure with a court, a charge, a clerk and a sentence. The charge is '
    + 'generally sedition and it is generally true — the men in question spent the last '
    + 'reign arguing in public that the crown\'s policy was a covenant with death, and '
    + 'they have not stopped arguing it under a crown that agrees with the empire.\n\n'
    + 'One tradition, written down much later, says the old prophet was put inside a '
    + 'hollow log and sawn through. What the record says is a sentence with a quantity in '
    + 'it: he filled Jerusalem from one end to the other with innocent blood. It is the '
    + 'only charge in the chapter that is not about worship.',
    '2 Kings 21:16: Manasseh shed innocent blood very much, till he had filled Jerusalem from one end to another — the later tradition of Isaiah sawn in two belongs to this reign.',
    { label: 'Let the courts finish it',
      tooltip: '+40 governance points and "The City Quiet" (+10% income, −1.1 unrest everywhere) for forty years, at −30 legitimacy. The faction is destroyed; its scrolls leave the city in baskets with its students.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { gov: 40, legitimacy: -30, treasury: 60 });
        mod(ctx, 'h732_the_city_quiet', 'The City Quiet', { incomeMult: 1.1, unrestAll: -1.1 }, 480);
        h.setFlag(ctx, 'bloodInJerusalem', true);
        h.chronicle(ctx, 'era', 'The trials run for two years and the party is finished as a '
          + 'thing that meets. Its students go out to the country towns with the scrolls, which '
          + 'is why there are any.'); } },
    { label: 'Stop the trials and take the faction into the court',
      tooltip: '+25 legitimacy and "The Reformers at Court" (+10% morale, +1.0 unrest everywhere, −7% income) for thirty years, with Assyria to −30 regard. Both parties are now in the same room and neither of them will leave it.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { legitimacy: 25, gov: -25 });
        mod(ctx, 'h732_reformers_at_court', 'The Reformers at Court', { moraleMult: 1.1, unrestAll: 1, incomeMult: 0.93 }, 360);
        opinion(ctx, 'ASR', 'JDH', -30);
        h.chronicle(ctx, 'era', 'The trials are stopped and the survivors are given seats and '
          + 'portions. The court spends the next thirty years unable to decide anything, which is '
          + 'a form of toleration and a form of paralysis.'); } }),

  Y('ev732h_as_a_man_wipeth_a_dish', 'As a Man Wipeth a Dish', -658, 3, 'JDH',
    'The sentence being preached in the streets is not a warning, it is a verdict, and '
    + 'it comes with instruments. The line that was stretched over Samaria and the '
    + 'plummet of the house of Ahab will be stretched over this city — the same tools, '
    + 'the same standard, the same result — and the city will be wiped as a man wipes a '
    + 'dish, wiping it and turning it upside down.\n\n'
    + 'The men saying it are not received at the palace and do not ask to be. The king '
    + 'has reigned for forty years, the storehouses are full, the tribute has never been '
    + 'late, the contingent goes to Egypt when Nineveh asks for it and no foreign army '
    + 'has crossed this border in the lifetime of anyone under fifty. That is the whole '
    + 'of the case against the preachers and none of the answer to them.',
    '2 Kings 21:10-15: the prophets of Manasseh\'s reign announced that the line of Samaria and the plummet of the house of Ahab would be stretched over Jerusalem, and the city wiped as a man wipes a dish.',
    { label: 'Ignore them: the country has never been quieter',
      tooltip: '+180 talents and "Forty Years Without a Campaign" (+10% income, +8% growth) for thirty years, at −18 legitimacy. Every fact in the argument is on the crown\'s side and the argument is still lost.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: 180, legitimacy: -18, gov: 25 });
        mod(ctx, 'h732_forty_years_quiet', 'Forty Years Without a Campaign', { incomeMult: 1.1, growthMult: 1.08 }, 360);
        h.chronicle(ctx, 'era', 'The preachers are left alone in the streets and the reign goes '
          + 'on being prosperous. Their sentence is copied down by somebody and kept, which is '
          + 'all a sentence needs.'); } },
    { label: 'Have it taken down word for word and filed with the annals',
      tooltip: '+35 influence points and +15 legitimacy, with "The Verdict Filed" (−8% cost of governing, +0.5 unrest everywhere) for forty years. A state that keeps the case against itself in its own archive.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { infl: 35, legitimacy: 15, gov: -10 });
        mod(ctx, 'h732_the_verdict_filed', 'The Verdict Filed', { adminMult: 0.92, unrestAll: 0.5 }, 480);
        h.chronicle(ctx, 'era', 'A scribe is sent out to take the preaching down accurately and '
          + 'it goes into the archive beside the tribute receipts. Two generations later somebody '
          + 'reads both and draws the obvious conclusion.'); } }),

  Y('ev732h_hooks_and_fetters', 'Hooks, and Fetters of Brass', -648, 2, 'JDH',
    'The king was taken at the end of the campaigning season by the captains of the '
    + 'Assyrian host, put in bronze fetters with a hook through the face in the manner '
    + 'used for kings, and walked east. Not to Nineveh: to Babylon, which is where the '
    + 'empire is trying everyone found on the wrong side of the Chaldean revolt, and '
    + 'which has spent the last two years being starved into eating itself.\n\n'
    + 'He is alive and the empire has not named a successor, which means this is an '
    + 'interrogation rather than an execution. The regency in this city has to decide '
    + 'whether to buy him back on whatever terms are going, or to govern in his name and '
    + 'let the empire keep a hostage it is paying to feed.',
    '2 Chronicles 33:11-14: the captains of the Assyrian host took Manasseh with hooks, bound him with fetters and carried him to Babylon; he was afterwards returned to Jerusalem and built the outer wall of the city of David.',
    { label: 'Buy the terms, bring him home, and build the outer wall',
      tooltip: '−240 talents and "The Wall Outside the City" (+15% siege endurance, +8% manpower) permanently, with Assyria to +55 regard, at −12 legitimacy. A king comes back having seen what the empire does to its own second capital.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -240, legitimacy: -12, mar: 30 });
        mod(ctx, 'h732_wall_outside_the_city', 'The Wall Outside the City', { siegeMult: 1.15, manpowerMult: 1.08 });
        pmod(ctx, 'Jerusalem', 'h732_the_outer_wall', 'The Outer Wall', { taxMult: 1.08, unrest: -0.6 }, -1);
        opinion(ctx, 'ASR', 'JDH', 55);
        h.setFlag(ctx, 'kingReturnedFromBabylon', true);
        h.chronicle(ctx, 'era', 'The king comes back up the road with the fetters in a box and '
          + 'starts a wall the same season, west of Gihon and round the Ophel, and puts captains '
          + 'of war in every fenced town in the kingdom.'); } },
    { label: 'Govern in his name and leave him where he is',
      tooltip: '+50 governance points and +200 talents, with "The Regency" (−10% cost of governing, +1.0 unrest everywhere) for twenty-five years, at −22 legitimacy. The empire feeds him; this court decides everything and answers for none of it.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { gov: 50, treasury: 200, legitimacy: -22 });
        mod(ctx, 'h732_the_regency', 'The Regency', { adminMult: 0.9, unrestAll: 1 }, 300);
        h.chronicle(ctx, 'era', 'No embassy goes east. The council governs in the king\'s name for '
          + 'as long as the king is in Babylon, and discovers that a crown in another country\'s '
          + 'custody is an extremely convenient thing to sign with.'); } }),

  Y('ev732h_his_servants_conspired', 'His Servants Conspired Against Him', -641, 8, 'JDH',
    'The king has been killed in his own house by his own household officers, two years '
    + 'into a reign that was a continuation of his father\'s in every particular. No '
    + 'claimant has come forward, nothing has been seized, no foreign hand is visible and '
    + 'nobody has produced a reason. The conspirators appear to have had a plan for the '
    + 'murder and none whatever for the morning after it.\n\n'
    + 'The people of the land — the landholding families of the hill districts, who have '
    + 'put down a palace faction twice before in this dynasty — have killed everyone '
    + 'involved and produced the dead king\'s son, who is eight years old. The question is '
    + 'not who reigns. It is on whose terms he is brought up.',
    '2 Kings 21:23-24: the servants of Amon conspired and slew him in his own house, and the people of the land slew the conspirators and made Josiah his son king in his stead, at eight years old.',
    { label: 'Let the people of the land seat the boy and hold the regency',
      tooltip: '+20 legitimacy and "The People of the Land" (+10% manpower, −0.8 unrest everywhere, +6% cost of governing) permanently. The hill families own the crown\'s childhood and will present the account later.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { legitimacy: 20, gov: -15 });
        mod(ctx, 'h732_the_people_of_the_land', 'The People of the Land', { manpowerMult: 1.1, unrestAll: -0.8, adminMult: 1.06 });
        h.setFlag(ctx, 'peopleOfTheLandRegency', true);
        h.chronicle(ctx, 'era', 'The conspirators are killed to a man and the boy is anointed by '
          + 'the country families. The men who raise him are the men who will be standing behind '
          + 'him when the book is found.'); } },
    { label: 'Seat him under the palace and the priesthood',
      tooltip: '+45 governance points and "The Household Regency" (+11% income, −7% manpower, +0.7 unrest everywhere) for thirty years, at −15 legitimacy. The city governs; the districts send what they feel like sending.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { gov: 45, legitimacy: -15 });
        mod(ctx, 'h732_household_regency', 'The Household Regency', { incomeMult: 1.11, manpowerMult: 0.93, unrestAll: 0.7 }, 360);
        h.chronicle(ctx, 'era', 'The surviving household officers and the priesthood take the '
          + 'regency between them. The levy from the hill districts comes in late for thirty '
          + 'years and nobody can say why.'); } }),

  // ── the long reign, and the empire that made it possible (SPEC §274) ──────
  // The chapter's last full decade before Josiah's reform carried one card.
  // These two are the years that decade actually was: the end of the fifty-five
  // and the thing that was happening to Assyria while nobody in Jerusalem was
  // allowed to say so.

  Y('ev732h_fifty_five_years', 'The Longest Reign Anybody Remembers', -644, 6, 'JDH',
    'He has reigned for forty-eight years. Nobody at court remembers another king '
    + 'and nobody under fifty remembers a year in which the tribute was not paid, '
    + 'the Assyrian garrison was not in the country, or the high places were not '
    + 'open. The chronicle written a century later will say he did evil in the '
    + 'sight of the Lord and will give the reign eighteen verses, which is fewer '
    + 'verses than years.\n\nWhat it will not say is that the country was not '
    + 'invaded, the Shephelah towns that were levelled in his father\'s war were '
    + 'rebuilt, the population recovered, and the kingdom that is going to be able '
    + 'to afford a reform in twenty years can afford it because of these decades. '
    + 'The council is being asked to renew the arrangement for another seven years.',
    'Manasseh reigned fifty-five years (2 Kings 21:1), the longest in Judah\'s history. Archaeology shows recovery in the Shephelah and the Negev through his reign; Assyrian records list him among the loyal tributaries.',
    { label: 'Renew it — the arrangement has rebuilt the country',
      tooltip: '−90 talents a decade in tribute. "The Long Peace" permanently: +14% growth, +10% income, −1 unrest everywhere, and the Shephelah towns rebuilt (+1 development at Lachish\'s neighbours). The high places stay open, and the reform that closes them has a country to close them in.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -90 });
        mod(ctx, 'h732_the_long_peace', 'The Long Peace', { growthMult: 1.14, incomeMult: 1.1, unrestAll: -1 });
        pmod(ctx, 'Hebron', 'h732_shephelah_rebuilt', 'The Shephelah Rebuilt', { prodMult: 1.12 }, -1);
        pmod(ctx, 'Beersheba', 'h732_negev_forts', 'The Negev Forts', { prodMult: 1.1, unrest: -0.8 }, -1);
        h.setFlag(ctx, 'longPeace', true);
        h.chronicle(ctx, 'era', 'The arrangement is renewed for another seven years; the Shephelah towns are rebuilt on their own ruins and nobody writes any of it down.'); } },
    { label: 'Let it lapse and see what the empire is still capable of',
      tooltip: '+120 talents kept. +12% force limit and +15% siege defence for forty years — and "The Lapsed Tribute" (+1.5 unrest everywhere, −10% growth) permanently, because the empire is still perfectly capable and sends to find out.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: 120, legitimacy: 8 });
        mod(ctx, 'h732_lapsed_tribute', 'The Lapsed Tribute', { forceLimitMult: 1.12, siegeDefenseMult: 1.15 }, 480);
        mod(ctx, 'h732_lapsed_cost', 'What the Lapse Cost', { unrestAll: 1.5, growthMult: 0.9 });
        h.setFlag(ctx, 'tributeLapsed', true);
        h.chronicle(ctx, 'era', 'The tribute is allowed to lapse and the kingdom spends the difference on its walls; the empire is not yet too busy to notice.'); } }),

  Y('ev732h_the_empire_is_eating_itself', 'The News From the Two Rivers', -640, 9, 'JDH',
    'The reports have been consistent for three years and the merchants are more '
    + 'reliable than the envoys. Assyria has fought a civil war between two brothers '
    + 'and won it at a cost nobody has published; Elam has been erased so completely '
    + 'that its name has gone off the lists; and there are Scythian horsemen in '
    + 'districts that had garrisons in them last year.\n\nThe garrison in this '
    + 'country has not been reinforced since the old king died. The resident is '
    + 'still here and still writing, and the tribute is still being collected, and a '
    + 'careful man would notice that both of those things are now happening because '
    + 'this kingdom continues to do them rather than because anybody could compel '
    + 'it. That is a very different arrangement wearing the same clothes.',
    'Ashurbanipal died about 631 and Assyria collapsed within two decades; the Elamite campaigns of the 640s and the northern incursions are attested in the annals and in Herodotus I.103-106.',
    { label: 'Keep paying, keep counting, and say nothing to anybody',
      tooltip: '−40 talents and total silence. "We Counted the Garrisons" permanently: +12% administrative efficiency, +10 deterrent, +8% martial power. When the reform comes it comes from a court that already knows exactly how much room it has.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -40, gov: 20 });
        mod(ctx, 'h732_counted_the_garrisons', 'We Counted the Garrisons', { adminMult: 1.12, deterrent: 10, milPowerMult: 1.08 });
        h.setFlag(ctx, 'garrisonsCounted', true);
        h.chronicle(ctx, 'era', 'The tribute keeps going up the road on time and a quiet list is kept of every Assyrian post in the country and how many men are in it.'); } },
    { label: 'Begin taking the northern districts back, quietly, a village at a time',
      tooltip: 'No cost now. Bethel and the southern hill of the old north come under this crown\'s writ twenty years early: +1.5 development there and +10% integration permanently. It is also visible: −1 stability and +1.2 unrest everywhere for thirty years, and the empire has one more reason to come south while it still can.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { stability: -1, legitimacy: 12 });
        pmod(ctx, 'Neapolis', 'h732_quiet_reach', 'The Quiet Reach North', { prodMult: 1.15, unrest: -0.5 }, -1);
        mod(ctx, 'h732_quiet_reach_m', 'The Quiet Reach North', { integrateMult: 1.1 });
        mod(ctx, 'h732_visible_reach', 'A Visible Reach', { unrestAll: 1.2 }, 360);
        h.setFlag(ctx, 'earlyReachNorth', true);
        h.chronicle(ctx, 'era', 'Judaean headmen begin appearing in villages north of the old border, one at a time, twenty years before anybody marches an army up there.'); } }),

  // ── the reform, and the pass ──────────────────────────────────────────────
  Y('ev732h_the_altar_at_bethel', 'The Altar at Bethel', -622, 10, 'JDH',
    'The purge has crossed the old border. Bethel has been an Assyrian district for a '
    + 'century, and the empire that administers it is currently being taken apart on the '
    + 'Euphrates by Medes and Chaldeans, which is why the king\'s men are standing in it '
    + 'with mattocks pulling down an altar that has been in use since the kingdoms split.\n\n'
    + 'They have burned the high place and stamped it small, and then opened the tombs on '
    + 'the hill behind it and burned the bones on the altar, which makes it permanently '
    + 'unusable by anybody. One grave was left alone on the strength of the inscription on '
    + 'it. The priests of the platforms in that district were killed on their own altars. '
    + 'This is a religious reform and a territorial annexation carried out with the same '
    + 'tools, and it will be read as both, in both directions.',
    '2 Kings 23:15-20: Josiah broke down the altar at Bethel, burned the high place, took the bones out of the sepulchres and burned them on the altar, and slew the priests of the high places of Samaria upon their altars.',
    { label: 'Take the north with the reform',
      tooltip: 'Bethel annexed, −140 talents and +25 legitimacy, with "The Border Moved North" (+9% income, +7% manpower) permanently and +1.6 unrest in the annexed district. An empire is dying and this kingdom is taking its northern district while it does it.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -140, legitimacy: 25, mar: 25 });
        mod(ctx, 'h732_border_moved_north', 'The Border Moved North', { incomeMult: 1.09, manpowerMult: 1.07 });
        h.changeOwner(ctx, 'Ramallah', 'JDH');
        pmod(ctx, 'Ramallah', 'h732_the_altar_stamped_small', 'The Altar Stamped Small', { unrest: 1.6, taxMult: 1.1 }, 300);
        pmod(ctx, 'Sebaste', 'h732_the_purge_reaches_north', 'The Purge Reaches North', { unrest: 1.4 }, 240);
        opinion(ctx, 'ASR', 'JDH', -45);
        h.setFlag(ctx, 'bethelPurged', true);
        h.chronicle(ctx, 'era', 'The altar at Bethel comes down and the district goes onto this '
          + 'kingdom\'s tax rolls in the same month. The villages of Samaria take note of how the '
          + 'reform arrived, and remember it for a very long time.'); } },
    { label: 'Purge inside our own border and leave Bethel standing',
      tooltip: '+35 governance points and "The Reform Kept Home" (+10% income, −0.6 unrest everywhere) for thirty years, at −12 legitimacy. Every platform in this kingdom goes down and the oldest altar in the country is not touched.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { gov: 35, legitimacy: -12, treasury: -40 });
        mod(ctx, 'h732_reform_kept_home', 'The Reform Kept Home', { incomeMult: 1.1, unrestAll: -0.6 }, 360);
        h.chronicle(ctx, 'era', 'The mattocks stop at the old frontier. The reform is complete '
          + 'inside this kingdom and the altar at Bethel goes on taking firstfruits from villages '
          + 'four hours\' walk from the border.'); } }),

  Y('ev732h_such_a_passover', 'Such a Passover', -621, 1, 'JDH',
    'Every household in the kingdom is to come up, and the crown is providing the '
    + 'animals out of its own flocks: thirty thousand lambs and kids and three thousand '
    + 'bullocks, with the princes giving to the priests and the Levites out of theirs. The '
    + 'courses are posted by name, the singers are in their places, the flaying is '
    + 'organised in shifts, and the whole thing is to be done in a day.\n\n'
    + 'The scale is not the point. The point is that the feast is being kept in one place, '
    + 'by the whole country at once, out of a written text, with the treasury paying for '
    + 'the meat — which turns a household rite into a national one and makes the book '
    + 'found in the masonry two years ago into law by demonstration rather than by decree.',
    '2 Kings 23:21-23 and 2 Chronicles 35: Josiah kept the passover in the eighteenth year of his reign, and there was not kept such a passover from the days of the judges that judged Israel.',
    { label: 'Keep it as the book says, and pay for it out of the treasury',
      tooltip: '−200 talents and +28 legitimacy, with "Not Since the Judges" (+20% pilgrimage, −0.9 unrest everywhere, +6% growth) permanently. One feast, one place, one text, and the crown holding the bill.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -200, legitimacy: 28, infl: 20 });
        mod(ctx, 'h732_not_since_the_judges', 'Not Since the Judges', { pilgrimMult: 1.2, unrestAll: -0.9, growthMult: 1.06 });
        pmod(ctx, 'Jerusalem', 'h732_the_whole_country_at_once', 'The Whole Country at Once', { taxMult: 1.15, prodMult: 1.08 }, -1);
        h.setFlag(ctx, 'josiahPassover', true);
        h.chronicle(ctx, 'era', 'The country comes up in one week and the feast is kept out of '
          + 'the book, in one place, in a day. The chronicle says there was not such a passover '
          + 'from the days of the judges, and it is not exaggerating about the organisation.'); } },
    { label: 'Keep it in the towns, as it has always been kept',
      tooltip: '+120 talents and +30 governance points, with "Kept in the Towns" (+9% income, +8% growth) for thirty years, at −16 legitimacy. Nobody walks three days, nobody is counted, and the book stays a document rather than a practice.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: 120, gov: 30, legitimacy: -16 });
        mod(ctx, 'h732_kept_in_the_towns', 'Kept in the Towns', { incomeMult: 1.09, growthMult: 1.08 }, 360);
        h.chronicle(ctx, 'era', 'The feast is kept household by household in the towns, as it has '
          + 'been kept since before there were kings. The harvest is not interrupted and the book '
          + 'stays in the archive being a document.'); } }),

  Y('ev732h_the_chariot_out_of_the_pass', 'The Chariot Out of the Pass', -609, 8, 'JDH',
    'The body came back down the ridge road in a chariot with the archers\' work still in '
    + 'it, and the lament was being composed before it reached the gate. Eighteen years of '
    + 'reform — the platforms, the book, the passover, the border moved north — belonged '
    + 'to one man who went out into a pass to stop an Egyptian column that had sent ahead '
    + 'to say it was not looking for him.\n\n'
    + 'The people of the land have anointed the younger son rather than the elder, which '
    + 'is the same faction making the same kind of decision it made when it seated his '
    + 'father. The Egyptian army is still north of here and will come back down this road. '
    + 'When it does, the man they have just anointed will be in irons at Riblah within '
    + 'three months and his brother will be on the throne under a name Pharaoh gave him.',
    '2 Kings 23:30-34: Josiah\'s servants carried him dead in a chariot from Megiddo; the people of the land anointed Jehoahaz, whom Necho deposed after three months and replaced with Eliakim, renamed Jehoiakim.',
    { label: 'Anoint the younger son and stand by the reform',
      tooltip: '+22 legitimacy and "The Reform Outlives Him" (+12% morale, +10% pilgrimage, −8% income) for twenty-five years, with Egypt to −60 regard. Three months of it, and then a hundred talents and somebody else\'s nominee.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { legitimacy: 22, mar: 20 });
        mod(ctx, 'h732_reform_outlives_him', 'The Reform Outlives Him', { moraleMult: 1.12, pilgrimMult: 1.1, incomeMult: 0.92 }, 300);
        opinion(ctx, 'MIZ', 'JDH', -60);
        h.setFlag(ctx, 'jehoahazAnointed', true);
        h.chronicle(ctx, 'era', 'The younger son is anointed in the court of the house and the '
          + 'mourning for his father is still being sung when the summons comes down from Riblah.'); } },
    { label: 'Send to Riblah and take Pharaoh\'s nominee and Pharaoh\'s terms',
      tooltip: '−100 talents and "The Egyptian Settlement" (+12% income, −0.9 unrest everywhere) for twenty-five years, with Egypt to +55 regard, at −25 legitimacy. The kingdom keeps its army, its walls and none of its answer.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -100, legitimacy: -25, gov: 30 });
        mod(ctx, 'h732_egyptian_settlement', 'The Egyptian Settlement', { incomeMult: 1.12, unrestAll: -0.9 }, 300);
        opinion(ctx, 'MIZ', 'JDH', 55);
        h.setFlag(ctx, 'egyptianNominee', true);
        h.chronicle(ctx, 'era', 'An embassy goes north to Riblah with the tribute before it is '
          + 'asked for, and comes back with a king, a new name for him and an annual assessment '
          + 'in silver and gold.'); } }),
];

// --- SPEC §216: a card is answered by the court it is addressed to ---------
// One loop instead of a tag argument on every call site in the file. A card
// marked `player` or `both` is always the chair the player is sitting in and
// is left alone; a card marked ISL or JDH writes to that court whether or not
// the player is in it — and after 722 the northern crown is no longer there
// to be written to, so `P` falls back of its own accord.
for (const _c of EVENTS_732_HEZEKIAH) {
  if (!_c || (_c.forTag !== 'ISL' && _c.forTag !== 'JDH')) continue;
  for (const _o of _c.options || []) {
    if (typeof _o.effects !== 'function') continue;
    _o.effects = bindAudience(_c.forTag, _o.effects);
  }
}
