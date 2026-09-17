// Judaea Universalis — the chain of The Assyrian Flood, 732 BCE (SPEC §268).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// Five questions, each asked once, each with a marker in the §119 tree: what
// is done about the tribute schedule; what stands in the court of the house
// in Jerusalem; what the last king in Samaria does about Egypt; what happens
// in the year an Assyrian king is killed in battle and every vassal from Elam
// to the sea has to decide the same thing in the same season; and what a court
// does with a scroll found in the masonry that says almost everything this
// country has ever done was forbidden.
//
// Between them, the century itself: the three-year siege that ends a nation,
// the tunnel under Jerusalem, the forty-six fortified towns, the reliefs at
// Lachish, the fifty-five years of a king the chronicle cannot forgive, and
// the summer a Judahite army marches out to stop an Egyptian one at Megiddo
// for reasons nobody has ever satisfactorily explained.
//
// Sources: 2 Kings 15-25; 2 Chronicles 28-35; Isaiah 1-39; Micah; the annals
// of Tiglath-Pileser III, Sargon II, Sennacherib, Esarhaddon and Ashurbanipal;
// the Sennacherib prism; the Lachish reliefs; the Siloam inscription; the LMLK
// stamps; the Babylonian Chronicle; Herodotus II.141 and 159.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_732bce] ' + key, e || '');
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

function flag(ctx, key) {
  return !!((ctx.game.flags || {})[key]);
}

function opinion(ctx, from, of, delta) {
  try {
    const t = ctx.game.tags && ctx.game.tags[from];
    if (!t) return;
    if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
    t.opinion[of] = Math.max(-200, Math.min(200, (t.opinion[of] || 0) + delta));
  } catch (e) { warnOnce('opinion', e); }
}

export const EVENTS_732 = [

  {
    id: 'ev732_the_tribute_schedule',
    title: 'The Schedule',
    desc: 'The envoys have brought a list. It is itemised, it is dated, and it is not a '
      + 'demand for plunder — it is an assessment, calculated from a survey, payable '
      + 'annually, with a named official to receive it and a named official to audit him. '
      + 'Silver, gold, tin, iron, coloured cloth, horses of the yoke.\n\n'
      + 'What is actually being sold here is the difference between a vassal and a province. '
      + 'A vassal keeps its king, its gods, its courts and its army, and pays. A province '
      + 'gets a governor, an Assyrian garrison and a new population. The schedule is the '
      + 'price of the first, and the empire has just finished demonstrating the second '
      + 'three days\' march to the north.',
    forTag: 'player',
    date: { y: -732, m: 5 },
    major: true,
    aiOption: 0,
    historical: 'Tiglath-Pileser III\'s tribute lists name Jehoahaz (Ahaz) of Judah, Hoshea of Israel, the kings of Moab, Ammon, Edom, Ashkelon and Gaza, and the king of Tyre, in one column.',
    options: [
      {
        label: 'Pay it, on time and in full',
        tooltip: 'The recorded answer, from every king in this country. −250 talents and "The Annual Assessment" (−15% income) for forty years — and "A Vassal, Not a Province" (−1 unrest everywhere, +1 fort defence): the empire has no reason to come, and the crown, the courts and the gods stay.',
        effects: guard('tribute:0', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.setFlag(ctx, 'tributeAssyria', true);
          h.adjust(ctx, me, { treasury: -250, legitimacy: -8, infl: 30 });
          mod(ctx, 'the_annual_assessment', 'The Annual Assessment', { incomeMult: 0.85 }, 480);
          mod(ctx, 'a_vassal_not_a_province', 'A Vassal, Not a Province', { unrestAll: -1, fortDefBonus: 1 });
          opinion(ctx, 'ASR', me, 60);
          h.chronicle(ctx, 'era', 'The schedule is signed and the first instalment goes north with '
            + 'the envoys. The kingdom keeps its king, its courts and its gods, which is what it '
            + 'has just bought.');
        }),
      },
      {
        label: 'Send them back with it unsigned',
        tooltip: 'The road almost nobody took. War with Assyria, +25 legitimacy and "No Man\'s Vassal" (+12% morale, +10% manpower) for thirty years — against an empire with a standing army, a siege train and a population policy.',
        effects: guard('tribute:1', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.setFlag(ctx, 'tributeRefused', true);
          h.adjust(ctx, me, { legitimacy: 25, mar: 50 });
          mod(ctx, 'no_mans_vassal_732', 'No Man\'s Vassal', { moraleMult: 1.12, manpowerMult: 1.1 }, 360);
          opinion(ctx, 'ASR', me, -120);
          try {
            const t = ctx.game.tags[me];
            if (t) t.overlord = null;
            h.declareWar(ctx, 'ASR', me, 'The Refusal of the Schedule');
          } catch (e) { warnOnce('tribute:war', e); }
          h.chronicle(ctx, 'era', 'The schedule goes back unsigned. The eponym list for the next '
            + 'year records a campaign, and the campaign has a destination.');
        }),
      },
    ],
  },

  {
    id: 'ev732_the_altar_at_damascus',
    title: 'The Altar at Damascus',
    desc: 'The king has been to Damascus to do homage, and while he was there he saw an '
      + 'altar. It is enormous, it is Syrian, and he has sent the pattern of it back to the '
      + 'priest in Jerusalem with instructions and a deadline, so that it is built and '
      + 'standing before he gets home.\n\n'
      + 'The priest has built it. The question in front of the court is what happens to the '
      + 'bronze altar that has stood in that courtyard since Solomon — moved aside to the '
      + 'north, the king says, for him to enquire by. Nobody in the building thinks this is '
      + 'about masonry. A king who worships on a Syrian pattern in the house of the god of '
      + 'this country is making a statement about who the country answers to, and the '
      + 'statement is being made in the one place where everyone can see it.',
    forTag: 'JDH',
    date: { y: -732, m: 9 },
    major: true,
    aiOption: 0,
    historical: '2 Kings 16:10-16. Ahaz sent the pattern from Damascus and Urijah the priest built it before the king returned; the bronze altar was moved to the north side.',
    options: [
      {
        label: 'Let it stand: the great altar is the king\'s',
        tooltip: '−30 legitimacy with the priesthood and "The Syrian Pattern" (+10% income, +0.6 unrest everywhere) permanently, with Assyria\'s regard +40. A court that is visibly in the empire\'s system is a court the empire leaves alone.',
        effects: guard('altar:0', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'damascusAltar', true);
          h.adjust(ctx, 'JDH', { legitimacy: -20, gov: 25 });
          mod(ctx, 'the_syrian_pattern', 'The Syrian Pattern', { incomeMult: 1.1, unrestAll: 0.6 });
          opinion(ctx, 'ASR', 'JDH', 40);
          h.chronicle(ctx, 'era', 'The great altar stands in the court and the bronze one is moved '
            + 'to the north side, for the king to enquire by. The priest builds what he is sent '
            + 'and writes nothing down about it.');
        }),
      },
      {
        label: 'Take it down before he is home',
        tooltip: 'The road not taken. +30 legitimacy, "The Pattern Refused" (−0.8 unrest everywhere, +0.2 legitimacy a month) permanently, at −150 talents and Assyria\'s regard −30. The priesthood is the crown\'s for a generation.',
        effects: guard('altar:1', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'damascusAltarRefused', true);
          h.adjust(ctx, 'JDH', { legitimacy: 30, treasury: -150 });
          mod(ctx, 'the_pattern_refused', 'The Pattern Refused', { unrestAll: -0.8, legitimacyAdd: 0.2 });
          opinion(ctx, 'ASR', 'JDH', -30);
          h.chronicle(ctx, 'era', 'The new altar is broken up in the court before the king is back '
            + 'over the Jordan, and the bronze one is put back where it was. The priesthood '
            + 'remembers who gave that order for four generations.');
        }),
      },
    ],
  },

  {
    id: 'ev732_the_letter_to_so',
    title: 'The Letter to So, King of Egypt',
    desc: 'The tribute has been paid for seven years and the kingdom is four districts and '
      + 'a hill. On the table is a draft letter to Egypt — to "So", which is either a king, '
      + 'a general or a city depending on which scribe you ask, because nobody at this court '
      + 'is entirely sure who is in charge in the Delta this year.\n\n'
      + 'What is certain is that Assyria opens its vassals\' correspondence, that the '
      + 'governor at Megiddo is two days away, and that every kingdom in this country that '
      + 'has tried this in the last thirty years has been annexed for it. What is also '
      + 'certain is that paying has not made the kingdom any bigger, and that the tribute '
      + 'schedule is assessed on land that was taken away.',
    forTag: 'ISL',
    date: { y: -725, m: 2 },
    major: true,
    aiOption: 0,
    historical: '2 Kings 17:4: "the king of Assyria found conspiracy in Hoshea: for he had sent messengers to So king of Egypt, and brought no present to the king of Assyria." The siege of Samaria began that year.',
    options: [
      {
        label: 'Send it, and stop the tribute',
        tooltip: 'The recorded answer. War with Assyria, +20 legitimacy and "The Egyptian Alliance" (+8% morale, +10% manpower) for fifteen years — and Egypt is four governments that will send nobody.',
        effects: guard('letter:0', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'egyptLetterSent', true);
          h.adjust(ctx, 'ISL', { legitimacy: 20, mar: 40 });
          mod(ctx, 'the_egyptian_alliance', 'The Egyptian Alliance', { moraleMult: 1.08, manpowerMult: 1.1 }, 180);
          opinion(ctx, 'MIZ', 'ISL', 60);
          opinion(ctx, 'ASR', 'ISL', -150);
          try {
            const t = ctx.game.tags.ISL;
            if (t) t.overlord = null;
            h.declareWar(ctx, 'ASR', 'ISL', 'The Conspiracy of Hoshea');
          } catch (e) { warnOnce('letter:war', e); }
          h.chronicle(ctx, 'era', 'The letter goes south and the tribute does not go north. The '
            + 'Assyrian finds conspiracy in Hoshea, which is the phrase the chronicle uses, and '
            + 'shuts him up and binds him in prison.');
        }),
      },
      {
        label: 'Burn the draft and pay the assessment',
        tooltip: 'The road not taken. −200 talents and "The Tribute Kept Up" (−1 unrest everywhere, +1 fort defence) permanently, with Assyria\'s regard +50 — a kingdom that is still a kingdom in ten years, which is more than the sources record.',
        effects: guard('letter:1', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'egyptLetterBurned', true);
          h.adjust(ctx, 'ISL', { treasury: -200, gov: 30, legitimacy: -6 });
          mod(ctx, 'the_tribute_kept_up', 'The Tribute Kept Up', { unrestAll: -1, fortDefBonus: 1 });
          opinion(ctx, 'ASR', 'ISL', 50);
          h.chronicle(ctx, 'era', 'The draft is burned in the brazier and the assessment goes north '
            + 'on time. It is the least glorious decision in the history of this kingdom and the '
            + 'only one that keeps it.');
        }),
      },
    ],
  },

  {
    id: 'ev732_the_siege_of_samaria',
    title: 'Three Years Before the Wall',
    desc: 'The Assyrian army is round Samaria and has been since the spring. The city is on '
      + 'a hill, the wall is casemate, the cisterns are deep, and the siege lines have '
      + 'settled into the shape of something that will take years rather than months.\n\n'
      + 'Everything now depends on what is inside: the grain, the water, and whether the '
      + 'men on the wall believe that anything is coming.',
    forTag: 'both',
    date: { y: -725, m: 6 },
    when: safeTrigger('ev732_siege:when', (ctx) => !flag(ctx, 'egyptLetterBurned')),
    major: true,
    aiOption: 1,
    historical: '2 Kings 17:5: "the king of Assyria came up throughout all the land, and went up to Samaria, and besieged it three years." Shalmaneser V began the siege and died; Sargon II finished it and claimed it.',
    options: [
      {
        label: 'Empty the storehouses into the city',
        tooltip: '−200 talents and "The City Provisioned" (+20% siege endurance, +1 fort defence) for twenty years. What the sources record is three years; grain is what three years is made of.',
        effects: guard('siege:0', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.adjust(ctx, me, { treasury: -200, legitimacy: 12 });
          mod(ctx, 'the_city_provisioned', 'The City Provisioned', { siegeMult: 1.2, fortDefBonus: 1 }, 240);
          h.chronicle(ctx, 'era', 'The royal storehouses go into the city and the gates are shut. '
            + 'The siege lines settle in for a stay.');
        }),
      },
      {
        label: 'Keep the field army out of the trap',
        tooltip: '+5,000 manpower and "The Army in the Hills" (+10% morale, +1 hill defence) for twenty years, at +1.2 unrest everywhere for ten. The city may fall; the kingdom is whatever is still marching.',
        effects: guard('siege:1', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.adjust(ctx, me, { manpower: 5000, mar: 35 });
          mod(ctx, 'the_army_in_the_hills', 'The Army in the Hills', { moraleMult: 1.1, hillDefBonus: 1 }, 240);
          mod(ctx, 'the_capital_invested', 'The Capital Invested', { unrestAll: 1.2 }, 120);
          h.chronicle(ctx, 'era', 'The field army goes into the hill country rather than into the '
            + 'city. Whatever happens on that hill, there is still an army.');
        }),
      },
    ],
  },

  {
    id: 'ev732_the_envoys_of_merodach_baladan',
    title: 'The Envoys From Babylon',
    desc: 'A delegation has arrived from a Chaldean who has made himself king in Babylon and '
      + 'held it against Assyria for ten years. Officially they are here to congratulate the '
      + 'king on his recovery from an illness and to present a gift. Actually they are here '
      + 'to find out how much of a nuisance this country could make of itself on the '
      + 'Assyrian\'s southern flank if the Chaldean made one on his eastern.\n\n'
      + 'The king has shown them everything: the treasury, the armoury, the storehouses, the '
      + 'spice, the silver, "all the house of his precious things." There is a prophet in '
      + 'the corridor who has just asked what exactly they were shown, and has not liked the '
      + 'answer.',
    forTag: 'JDH',
    date: { y: -712, m: 4 },
    aiOption: 1,
    historical: '2 Kings 20:12-19 and Isaiah 39. Merodach-baladan II held Babylon 721-710 and again briefly in 703, and his diplomacy in the west is attested from the Assyrian side.',
    options: [
      {
        label: 'Take the alliance',
        tooltip: '+40 influence points and "The Southern Flank" (+8% army strength, +6% income) for twenty-five years; Babylon to +70 regard and Assyria to −50. When Babylon rises, this country rises with it — which has worked exactly once in recorded history.',
        effects: guard('merodach:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { infl: 40 });
          mod(ctx, 'the_southern_flank', 'The Southern Flank', { milPowerMult: 1.08, incomeMult: 1.06 }, 300);
          opinion(ctx, 'BBL', 'JDH', 70);
          opinion(ctx, 'ASR', 'JDH', -50);
          h.setFlag(ctx, 'babylonianEmbassy', true);
          h.chronicle(ctx, 'era', 'The Chaldean\'s envoys are shown the treasury and go home with '
            + 'an understanding. The prophet asks what they were shown and is told: everything.');
        }),
      },
      {
        label: 'Feast them, praise the gift, promise nothing',
        tooltip: '+40 governance points and "Nothing Promised" (−0.5 unrest everywhere) for twenty years. The envoys go home with a courteous letter and no arithmetic.',
        effects: guard('merodach:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { gov: 40 });
          mod(ctx, 'nothing_promised', 'Nothing Promised', { unrestAll: -0.5 }, 240);
          h.chronicle(ctx, 'era', 'The envoys are feasted for a week, shown the view, and sent '
            + 'home with a letter that commits this kingdom to nothing whatever.');
        }),
      },
    ],
  },

  {
    id: 'ev732_the_death_of_sargon',
    title: 'The Year the King Was Killed',
    desc: 'An Assyrian king has been killed in battle in the mountains and his body was not '
      + 'recovered. Nothing like this has happened in living memory, and the scribes at '
      + 'Nineveh are writing anxious commentaries about what sin caused it. Meanwhile every '
      + 'vassal between Elam and the sea is having the same conversation in the same season, '
      + 'and the Chaldean is back in Babylon.\n\n'
      + 'The case for refusing is that the empire will never be weaker. The case against is '
      + 'that the empire has been weak before and the towns that assumed otherwise are '
      + 'archaeological layers. Egypt has promised cavalry. Egypt always promises cavalry.',
    forTag: 'JDH',
    date: { y: -705, m: 8 },
    major: true,
    aiOption: 1,
    historical: 'Sargon II was killed in 705 in Tabal and his body was not recovered. Hezekiah, Sidon, Ashkelon and Ekron all revolted; Sennacherib came west in 701 and took forty-six fortified towns.',
    options: [
      {
        label: 'Refuse the tribute and fortify',
        tooltip: 'War with Assyria when it comes, +25 legitimacy and "The Kingdom in Arms" (+12% morale, +20% siege endurance, +1 fort defence) for twenty-five years. The empire arrives in four years with everything it has.',
        effects: guard('sargon:0', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'sennacheribDefied', true);
          h.adjust(ctx, 'JDH', { legitimacy: 25, mar: 60 });
          mod(ctx, 'the_kingdom_in_arms', 'The Kingdom in Arms', {
            moraleMult: 1.12, siegeMult: 1.2, fortDefBonus: 1,
          }, 300);
          opinion(ctx, 'ASR', 'JDH', -140);
          try {
            const t = ctx.game.tags.JDH;
            if (t) t.overlord = null;
          } catch (e) { warnOnce('sargon:vassal', e); }
          h.chronicle(ctx, 'era', 'The tribute is refused, the Philistine cities are brought in, '
            + 'and the Shephelah is provisioned. The empire will be four years arriving and it '
            + 'will arrive with everything.');
        }),
      },
      {
        label: 'Pay, and let the coast revolt without us',
        tooltip: '−300 talents and "The Quiet Vassal" (−1 unrest everywhere, +8% income) for thirty years. The Assyrian burns Ashkelon and Ekron and this kingdom watches from the ridge with the gates shut.',
        effects: guard('sargon:1', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'sennacheribPaid', true);
          h.adjust(ctx, 'JDH', { treasury: -300, legitimacy: -10, gov: 30 });
          mod(ctx, 'the_quiet_vassal', 'The Quiet Vassal', { unrestAll: -1, incomeMult: 1.08 }, 360);
          opinion(ctx, 'ASR', 'JDH', 70);
          h.chronicle(ctx, 'era', 'The instalment goes north on time in the year everybody else '
            + 'stopped paying. The Shephelah is not burned, forty-six towns are not taken, and '
            + 'nobody writes a prism about it.');
        }),
      },
    ],
  },

  {
    id: 'ev732_the_reliefs_at_lachish',
    title: 'What They Did at Lachish',
    desc: 'The empire has come, and it has not come to the capital first. It has come to '
      + 'Lachish — the second city of this kingdom, in the Shephelah, walled, gated, on a '
      + 'mound — and it has built a siege ramp of rammed earth against the southwest corner '
      + 'and put battering rams up it under archery.\n\n'
      + 'The reason it is Lachish and not Jerusalem is arithmetic: a ridge fortress with a '
      + 'water supply can be left, but a kingdom that keeps its grain, its levies and its '
      + 'chariots in the Shephelah cannot be. And when it is over, the whole of it will be '
      + 'carved in relief on the walls of a room in Nineveh: the ramp, the rams, the '
      + 'defenders on the tower, the files of prisoners with their bundles, and the king on '
      + 'his throne receiving the spoil.',
    forTag: 'JDH',
    date: { y: -701, m: 5 },
    when: safeTrigger('ev732_lachish:when', (ctx) => flag(ctx, 'sennacheribDefied')),
    major: true,
    aiOption: 1,
    historical: 'The Lachish reliefs from Sennacherib\'s South-West Palace at Nineveh are the most detailed depiction of an ancient siege that exists, and the excavated ramp is still there.',
    options: [
      {
        label: 'Hold the Shephelah and fight for every mound',
        tooltip: '−8,000 manpower and −250 talents, and "Forty-Six Towns" (+15% siege endurance, +10% morale) for twenty-five years. Every month spent at Lachish is a month not spent at the capital.',
        effects: guard('lachish:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { manpower: -8000, treasury: -250, legitimacy: 15 });
          mod(ctx, 'forty_six_towns', 'Forty-Six Towns', { siegeMult: 1.15, moraleMult: 1.1 }, 300);
          h.chronicle(ctx, 'era', 'The Shephelah is fought for mound by mound. It costs this '
            + 'kingdom its second city and most of a generation, and it buys the capital a '
            + 'summer.');
        }),
      },
      {
        label: 'Pull everything back behind the ridge',
        tooltip: '+6,000 manpower kept and "The Ridge Only" (+1 hill defence, +20% siege endurance at the capital) for twenty-five years, at −20 legitimacy and +1.5 unrest everywhere for fifteen: the Shephelah is given to the empire and knows it.',
        effects: guard('lachish:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { manpower: 6000, legitimacy: -20 });
          mod(ctx, 'the_ridge_only', 'The Ridge Only', { hillDefBonus: 1, siegeMult: 1.2 }, 300);
          mod(ctx, 'the_shephelah_abandoned', 'The Shephelah Abandoned', { unrestAll: 1.5 }, 180);
          h.chronicle(ctx, 'era', 'The Shephelah garrisons are pulled back to the ridge and the '
            + 'lowland towns make their own arrangements. Several of them are still standing '
            + 'afterwards, under other management.');
        }),
      },
    ],
  },

  {
    id: 'ev732_the_tunnel',
    title: 'While There Was Yet the Pick',
    desc: 'Two gangs of quarrymen have been cutting towards each other through five hundred '
      + 'and thirty-three metres of limestone under the city, starting from opposite ends, '
      + 'with no instruments and no straight line. This morning they met. The inscription '
      + 'they have cut at the join describes the last moments: "while there was yet three '
      + 'cubits to be bored through, there was heard the voice of a man calling to his '
      + 'fellow, for there was a fissure in the rock on the right hand and on the left."\n\n'
      + 'The spring is now inside the wall and the old outlet outside it has been stopped '
      + 'and buried. An army camped around this city can no longer drink from the thing the '
      + 'city drinks from.',
    forTag: 'JDH',
    trigger: safeTrigger('ev732_tunnel:trigger', (ctx) => {
      const t = ctx.game.tags.JDH;
      return !!t && ctx.game.date.y >= -710 && (t.treasury || 0) >= 200;
    }),
    maxYear: -650,
    aiOption: 0,
    historical: 'The Siloam tunnel and its inscription, cut under Hezekiah: 533 metres of rock, two gangs, and a meeting point still visible.',
    options: [
      {
        label: 'Finish it, and stop the outlet outside',
        tooltip: '−200 talents and "The Waters Within" (+20% siege endurance, +6% growth) permanently. Jerusalem gains a granary and walls if it has none.',
        effects: guard('tunnel:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { treasury: -200, legitimacy: 15, gov: 20 });
          mod(ctx, 'the_waters_within', 'The Waters Within', { siegeMult: 1.2, growthMult: 1.06 });
          try {
            const p = ctx.prov && ctx.prov('Jerusalem');
            if (p) {
              if (!Array.isArray(p.buildings)) p.buildings = [];
              for (const b of ['walls', 'granary']) if (p.buildings.indexOf(b) === -1) p.buildings.push(b);
            }
          } catch (e) { warnOnce('tunnel:prov', e); }
          h.chronicle(ctx, 'era', 'The two gangs meet under the city and the water runs from the '
            + 'spring to the pool inside the wall. The men who cut it carve an account of the '
            + 'last three cubits into the rock.');
        }),
      },
      {
        label: 'Spend it on the wall instead',
        tooltip: '−200 talents and "The Broad Wall" (+1 fort defence, +8% manpower) permanently: the western hill brought inside the defences, which is where everybody who walked out of the north is living.',
        effects: guard('tunnel:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { treasury: -200, legitimacy: 10, mar: 25 });
          mod(ctx, 'the_broad_wall_built', 'The Broad Wall', { fortDefBonus: 1, manpowerMult: 1.08 });
          try {
            const p = ctx.prov && ctx.prov('Jerusalem');
            if (p) {
              if (!Array.isArray(p.buildings)) p.buildings = [];
              if (p.buildings.indexOf('walls') === -1) p.buildings.push('walls');
              const d = p.dev || (p.dev = { tax: 0, prod: 0, mp: 0 });
              d.mp += 2; d.tax += 1;
            }
          } catch (e) { warnOnce('tunnel:prov2', e); }
          h.chronicle(ctx, 'era', 'A wall seven metres thick goes up across the western hill, '
            + 'through the houses, and the houses are pulled down to build it. The city is twice '
            + 'the size it was a generation ago and every one of the new people came from the '
            + 'north.');
        }),
      },
    ],
  },

  {
    id: 'ev732_the_fifty_five_years',
    title: 'The Longest Reign',
    desc: 'The king has reigned for a generation and will reign for another, and the '
      + 'chronicle that records it cannot find a good word: he rebuilt the high places, put '
      + 'altars in the two courts of the house, made his son pass through the fire, used '
      + 'enchantments, and shed innocent blood very much. He also paid his tribute, sent his '
      + 'contingent to Egypt when Nineveh asked for it, kept the roads open and did not once '
      + 'in fifty-five years give the empire a reason to come.\n\n'
      + 'Both of those are the same policy, and the court has to decide whether to keep it.',
    forTag: 'JDH',
    date: { y: -687, m: 6 },
    aiOption: 0,
    historical: '2 Kings 21; Manasseh reigned fifty-five years, longer than any other king of Judah, and appears in Esarhaddon\'s and Ashurbanipal\'s vassal lists as a reliable tributary.',
    options: [
      {
        label: 'Keep it: fifty-five quiet years',
        tooltip: '−15 legitimacy and "The Long Peace" (+12% income, +8% growth, −0.8 unrest everywhere) for fifty years. The kingdom is rich, intact and thoroughly condemned.',
        effects: guard('manasseh:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { legitimacy: -15, treasury: 200, gov: 30 });
          mod(ctx, 'the_long_peace', 'The Long Peace', {
            incomeMult: 1.12, growthMult: 1.08, unrestAll: -0.8,
          }, 600);
          h.setFlag(ctx, 'longPeaceKept', true);
          h.chronicle(ctx, 'era', 'Fifty-five years without a campaign in this country. The '
            + 'chronicle gives the reign one page and every line of it is an accusation.');
        }),
      },
      {
        label: 'Break with it, and take the consequences',
        tooltip: '+25 legitimacy and "The Altars Thrown Down" (+0.25 legitimacy a month, +1.2 unrest everywhere) for thirty years, at −200 talents and Assyria\'s regard −40.',
        effects: guard('manasseh:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { legitimacy: 25, treasury: -200 });
          mod(ctx, 'the_altars_thrown_down', 'The Altars Thrown Down', {
            legitimacyAdd: 0.25, unrestAll: 1.2,
          }, 360);
          opinion(ctx, 'ASR', 'JDH', -40);
          h.chronicle(ctx, 'era', 'The altars in the courts are thrown down and the enchanters '
            + 'dismissed, and the empire is informed by letter that the tribute will be late.');
        }),
      },
    ],
  },

  {
    id: 'ev732_the_book_found',
    title: 'The Book Found in the House',
    desc: 'The house is being repaired — the silver counted out to the workmen, the masons '
      + 'and the carpenters paid without accounting because they deal faithfully — and the '
      + 'high priest has come out with a scroll. He has given it to the secretary, who has '
      + 'read it, and then read it to the king, who has torn his clothes.\n\n'
      + 'What the scroll says is that there is one lawful place of sacrifice and it is this '
      + 'one; that every hilltop platform in the kingdom is an abomination; that the '
      + 'covenant carries curses which are set out at length; and that essentially every '
      + 'king who has ever sat on this throne, including the good ones, has been in breach. '
      + 'Nobody at court has seen it before. Nobody can say where it came from. Every word '
      + 'of it is what the reforming party has been arguing for a century.',
    forTag: 'JDH',
    date: { y: -622, m: 8 },
    major: true,
    aiOption: 0,
    historical: '2 Kings 22-23. The scroll found in the eighteenth year of Josiah is generally identified with the core of Deuteronomy; the reform that followed is the most thorough religious reorganisation in the history of either kingdom.',
    options: [
      {
        label: 'Enforce it: every altar in the kingdom but this one',
        tooltip: '−80 governance points and −250 talents; "The Covenant Enforced" (+15% income, +0.3 legitimacy a month, −6% manpower) permanently and +2 unrest everywhere for twenty years. One altar, one book, one law — and a text that outlives every state on this map.',
        effects: guard('book:0', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'scrollEnforced', true);
          h.setFlag(ctx, 'altarsPurged', true);
          h.adjust(ctx, 'JDH', { gov: -80, treasury: -250, legitimacy: 30 });
          mod(ctx, 'the_covenant_enforced', 'The Covenant Enforced', {
            incomeMult: 1.15, legitimacyAdd: 0.3, manpowerMult: 0.94,
          });
          mod(ctx, 'the_ridges_stripped', 'The Ridges Stripped', { unrestAll: 2 }, 240);
          h.chronicle(ctx, 'era', 'The high places are defiled from Geba to Beersheba, the altar '
            + 'at Bethel is pulled down and its stones ground to powder, and a passover is kept '
            + 'such as had not been kept since the days of the judges. The book is read aloud in '
            + 'the house to all the people, great and small.');
        }),
      },
      {
        label: 'Shelve it: the kingdom cannot afford a covenant this year',
        tooltip: '+60 governance points and "The Scroll in the Chamber" (−0.6 unrest everywhere, +8% manpower) permanently. The reform waits for a king with a quieter frontier, and the text waits with it.',
        effects: guard('book:1', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'scrollShelved', true);
          h.adjust(ctx, 'JDH', { gov: 60, legitimacy: -8 });
          mod(ctx, 'the_scroll_in_the_chamber', 'The Scroll in the Chamber', {
            unrestAll: -0.6, manpowerMult: 1.08,
          });
          h.chronicle(ctx, 'era', 'The scroll is deposited in the chamber of the secretary and '
            + 'the repairs continue. The men who found it go on copying it, which turns out to '
            + 'be the part that mattered.');
        }),
      },
    ],
  },

  {
    id: 'ev732_megiddo',
    title: 'The Pass at Megiddo',
    desc: 'Nineveh has fallen and the Assyrian remnant is at Harran, and an Egyptian army is '
      + 'marching north up the coast road to prop it up — because Pharaoh has worked out, '
      + 'correctly, that a weak Assyria on the Euphrates is worth more to Egypt than a '
      + 'strong Babylon there.\n\n'
      + 'The road goes through the pass at Megiddo, and this kingdom is standing in it. '
      + 'Pharaoh has sent ahead to say that his quarrel is not with this country and that '
      + 'God is with him and would the king kindly stand aside. There is no record anywhere '
      + 'of what the king thought he was doing. He went out against him, and he was shot by '
      + 'the archers in the pass, and his servants carried him dead in a chariot from '
      + 'Megiddo and brought him to Jerusalem.',
    forTag: 'JDH',
    date: { y: -609, m: 6 },
    major: true,
    aiOption: 1,
    historical: '2 Kings 23:29 and 2 Chronicles 35:20-24. Josiah intercepted Necho II at Megiddo and was killed; Judah became an Egyptian dependency within three months and a Babylonian one within four years.',
    options: [
      {
        label: 'Stand in the pass',
        tooltip: 'War with Egypt, −5,000 manpower and "The Pass Contested" (+10% morale, +1 hill defence) for twenty years, at −20 legitimacy if the crown falls with it. Nobody has ever explained why this was worth it; the chronicler does not try.',
        effects: guard('megiddo:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { manpower: -5000, mar: 40, legitimacy: 10 });
          mod(ctx, 'the_pass_contested', 'The Pass Contested', { moraleMult: 1.1, hillDefBonus: 1 }, 240);
          opinion(ctx, 'MIZ', 'JDH', -90);
          try { h.declareWar(ctx, 'MIZ', 'JDH', 'The Pass at Megiddo'); } catch (e) { warnOnce('megiddo:war', e); }
          h.chronicle(ctx, 'era', 'The army goes out into the pass at Megiddo against an Egyptian '
            + 'column that had said it was not looking for a fight.');
        }),
      },
      {
        label: 'Let him pass, and take the toll',
        tooltip: '+250 talents and "The Road Sold" (+10% trade, −0.5 unrest everywhere) for twenty-five years, at −10 legitimacy. Egypt props up Assyria, Babylon wins anyway, and this kingdom still has its king and its army.',
        effects: guard('megiddo:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { treasury: 250, legitimacy: -10, infl: 30 });
          mod(ctx, 'the_road_sold', 'The Road Sold', { tradeMult: 1.1, unrestAll: -0.5 }, 300);
          opinion(ctx, 'MIZ', 'JDH', 50);
          h.setFlag(ctx, 'megiddoPassGranted', true);
          h.chronicle(ctx, 'era', 'The Egyptian column goes through the pass, pays the toll, and '
            + 'marches on to Harran to lose the battle it was going to lose anyway. The king '
            + 'comes home alive, which the chronicle finds difficult to praise.');
        }),
      },
    ],
  },

  // ── the terminals (SPEC §119) ─────────────────────────────────────────────
  {
    id: 'ev732_what_the_tribute_bought',
    title: 'What the Schedule Bought',
    desc: 'Eighty years of instalments, or eighty years of consequences. The account can be '
      + 'closed now, because the empire that wrote the schedule is being fought over by '
      + 'Medes and Chaldeans and there is nobody left to send it to.',
    forTag: 'player',
    date: { y: -650, m: 4 },
    when: safeTrigger('ev732_tribEnd:when', (ctx) => flag(ctx, 'tributeAssyria') || flag(ctx, 'tributeRefused')),
    aiOption: 0,
    historical: 'Assyria collected tribute from this country for a century and a quarter. Every kingdom that paid it survived the century; the one that stopped did not.',
    options: [
      {
        label: 'Enter it in the chronicle',
        tooltip: 'Paying bought a kingdom and emptied it; refusing bought a reputation and cost a generation. +30 governance points and the matching permanent modifier.',
        effects: guard('tribEnd:0', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.adjust(ctx, me, { gov: 30, legitimacy: 15 });
          if (flag(ctx, 'tributeAssyria')) {
            mod(ctx, 'the_price_of_surviving', 'The Price of Surviving', { incomeMult: 1.08, unrestAll: -0.4 });
            h.chronicle(ctx, 'era', 'The schedule was met for eighty years and the empire never '
              + 'came. What it cost is an entire century of somebody else\'s revenue, and what it '
              + 'bought is that there is still a court here to write this down.');
          } else {
            mod(ctx, 'the_kingdom_that_refused', 'The Kingdom That Refused', { moraleMult: 1.08, manpowerMult: 1.06 });
            h.chronicle(ctx, 'era', 'The schedule went back unsigned and the empire came, and the '
              + 'country is smaller and harder and knows exactly what it is. No other kingdom on '
              + 'this coast said no and was still saying it a lifetime later.');
          }
        }),
      },
      {
        label: 'Leave it out, and let the scribes argue',
        tooltip: '+60 influence points and "The Question Left Open" (−0.3 unrest everywhere, +5% income) for forty years.',
        effects: guard('tribEnd:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 60 });
          mod(ctx, 'question_open_tribute', 'The Question Left Open', { unrestAll: -0.3, incomeMult: 1.05 }, 480);
          h.chronicle(ctx, 'era', 'No official verdict is entered on the tribute years, and two '
            + 'generations of scribes settle it differently every time they copy the archive.');
        }),
      },
    ],
  },

  {
    id: 'ev732_what_the_altar_meant',
    title: 'What the Altar Meant',
    desc: 'Two generations on, the courtyard of the house is the only place in this kingdom '
      + 'where what the crown believes is visible to everybody at once, and what has stood '
      + 'in it since the king came back from Damascus has decided a great deal more than '
      + 'anybody expected of a piece of masonry.',
    forTag: 'JDH',
    date: { y: -660, m: 5 },
    when: safeTrigger('ev732_altarEnd:when', (ctx) => flag(ctx, 'damascusAltar') || flag(ctx, 'damascusAltarRefused')),
    aiOption: 0,
    historical: 'The altar of Ahaz is the last thing 2 Kings records about his reign, and the reforms of Hezekiah and Josiah are both described as undoing what he did.',
    options: [
      {
        label: 'Enter it in the chronicle',
        tooltip: 'The Syrian pattern bought a court the empire trusted; refusing it bought a priesthood that trusted the crown. +25 legitimacy and the matching permanent modifier.',
        effects: guard('altarEnd:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { legitimacy: 25, gov: 30 });
          if (flag(ctx, 'damascusAltar')) {
            mod(ctx, 'the_kings_pattern', 'The King\'s Pattern', { incomeMult: 1.08, adminMult: 0.94 });
            h.chronicle(ctx, 'era', 'The great altar is still standing and the empire has never '
              + 'once had to ask whose system this kingdom is in. The reformers have a list, and '
              + 'it begins with the masonry.');
          } else {
            mod(ctx, 'the_bronze_kept', 'The Bronze Kept', { legitimacyAdd: 0.2, unrestAll: -0.4 });
            h.chronicle(ctx, 'era', 'The bronze altar Solomon made is still in the middle of the '
              + 'court where it was put, and the priesthood has spent two generations being on '
              + 'the crown\'s side, which is not a thing this kingdom can usually afford.');
          }
        }),
      },
      {
        label: 'Leave it out, and let the scribes argue',
        tooltip: '+60 influence points and "The Question Left Open" (−0.3 unrest everywhere, +5% income) for forty years.',
        effects: guard('altarEnd:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { infl: 60 });
          mod(ctx, 'question_open_altar', 'The Question Left Open', { unrestAll: -0.3, incomeMult: 1.05 }, 480);
          h.chronicle(ctx, 'era', 'The archive contains two accounts of what was built in the '
            + 'court and neither of them is signed.');
        }),
      },
    ],
  },

  {
    id: 'ev732_what_the_letter_cost',
    title: 'What the Letter Cost',
    desc: 'The account of the northern kingdom can be closed. What is being weighed is not '
      + 'whether it was defeated — it was always going to be outmatched — but whether the '
      + 'particular thing it reached for was the thing that killed it.',
    forTag: 'ISL',
    date: { y: -712, m: 9 },
    when: safeTrigger('ev732_letterEnd:when', (ctx) => flag(ctx, 'egyptLetterSent') || flag(ctx, 'egyptLetterBurned')),
    aiOption: 0,
    historical: 'Assyria annexed the northern kingdom in 722/720 and deported 27,290 people; the Egyptian help Hoshea wrote for never came and probably never existed.',
    options: [
      {
        label: 'Enter it in the chronicle',
        tooltip: 'The letter bought a war and a deportation; burning it bought years nobody in the sources gets. +25 legitimacy and the matching permanent modifier.',
        effects: guard('letterEnd:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ISL', { legitimacy: 25, gov: 30 });
          if (flag(ctx, 'egyptLetterSent')) {
            mod(ctx, 'the_reed_that_broke', 'The Reed That Broke', { moraleMult: 1.08, manpowerMult: 1.05 });
            h.chronicle(ctx, 'era', 'The embassy went south and nothing came north, and the '
              + 'kingdom found out what an Assyrian conspiracy charge costs. Whatever is still '
              + 'standing after it is standing on its own.');
          } else {
            mod(ctx, 'the_years_bought', 'The Years Bought', { incomeMult: 1.08, unrestAll: -0.4 });
            h.chronicle(ctx, 'era', 'There was no letter, no charge of conspiracy and no siege. '
              + 'The kingdom that the annals of Sargon were supposed to be about is still paying '
              + 'its assessment, which the annals cannot make interesting.');
          }
        }),
      },
      {
        label: 'Leave it out, and let the scribes argue',
        tooltip: '+60 influence points and "The Question Left Open" (−0.3 unrest everywhere, +5% income) for forty years.',
        effects: guard('letterEnd:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ISL', { infl: 60 });
          mod(ctx, 'question_open_letter', 'The Question Left Open', { unrestAll: -0.3, incomeMult: 1.05 }, 480);
          h.chronicle(ctx, 'era', 'The correspondence with Egypt is not entered in the annals at '
            + 'all, which is its own kind of verdict.');
        }),
      },
    ],
  },

  {
    id: 'ev732_what_701_left',
    title: 'What the Year 701 Left',
    desc: 'A generation after the empire came west with everything it had, the account can '
      + 'be closed: the towns it took, the towns it did not, the tribute that was sent after '
      + 'the siege was lifted, and the single fact that the capital of this kingdom is the '
      + 'only one on the whole coast that the Assyrian prisms do not claim.',
    forTag: 'JDH',
    date: { y: -680, m: 7 },
    when: safeTrigger('ev732_701End:when', (ctx) => flag(ctx, 'sennacheribDefied') || flag(ctx, 'sennacheribPaid')),
    aiOption: 0,
    historical: 'Sennacherib\'s prism claims forty-six fortified towns and 200,150 people, and says he shut Hezekiah up "like a bird in a cage" — a phrase that concedes the city was not taken.',
    options: [
      {
        label: 'Enter it in the chronicle',
        tooltip: 'Defiance bought a ruined lowland and a capital nobody took; loyalty bought an intact kingdom and a reputation for it. +30 legitimacy and the matching permanent modifier.',
        effects: guard('701End:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { legitimacy: 30, mar: 40 });
          if (flag(ctx, 'sennacheribDefied')) {
            mod(ctx, 'like_a_bird_in_a_cage', 'Like a Bird in a Cage', { siegeMult: 1.12, moraleMult: 1.08 });
            h.chronicle(ctx, 'era', 'Forty-six towns and their innumerable villages, says the '
              + 'prism, and then it stops. The capital is not in the list, and every scribe in '
              + 'Nineveh who copied that text knew it.');
          } else {
            mod(ctx, 'the_kingdom_intact', 'The Kingdom Intact', { incomeMult: 1.1, growthMult: 1.05 });
            h.chronicle(ctx, 'era', 'The Shephelah was never burned, the reliefs at Nineveh are '
              + 'about somebody else\'s town, and the kingdom came out of the century with its '
              + 'second city and most of its people.');
          }
        }),
      },
      {
        label: 'Leave it out, and let the scribes argue',
        tooltip: '+60 influence points and "The Question Left Open" (−0.3 unrest everywhere, +5% income) for forty years.',
        effects: guard('701End:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { infl: 60 });
          mod(ctx, 'question_open_701', 'The Question Left Open', { unrestAll: -0.3, incomeMult: 1.05 }, 480);
          h.chronicle(ctx, 'era', 'Three accounts of the year 701 are kept in the archive and they '
            + 'disagree about everything except the date.');
        }),
      },
    ],
  },

  {
    id: 'ev732_what_the_book_became',
    title: 'What the Book Became',
    desc: 'Ten years after the scroll came out of the masonry, the kingdom that found it is '
      + 'between an Egypt going north and a Babylon coming west, and the question of what '
      + 'was done with the book has turned out to be the most consequential decision any '
      + 'court in this chapter made — for reasons that have nothing at all to do with the '
      + 'kingdom\'s survival.',
    forTag: 'JDH',
    date: { y: -612, m: 9 },
    when: safeTrigger('ev732_bookEnd:when', (ctx) => flag(ctx, 'scrollEnforced') || flag(ctx, 'scrollShelved')),
    aiOption: 0,
    historical: 'The Deuteronomic reform is the organising event of the Hebrew Bible\'s editorial history; the books of Kings are written from inside the party that won this argument.',
    options: [
      {
        label: 'Enter it in the chronicle',
        tooltip: 'Enforcing it produced one altar, one law and a literature; shelving it produced a kingdom with its manpower and its hill shrines intact. +30 legitimacy and the matching permanent modifier.',
        effects: guard('bookEnd:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { legitimacy: 30, gov: 40 });
          if (flag(ctx, 'scrollEnforced')) {
            mod(ctx, 'one_book_one_law', 'One Book, One Law', { adminMult: 0.9, legitimacyAdd: 0.25 });
            h.chronicle(ctx, 'era', 'One altar, one book and one law, and a scribal class that has '
              + 'begun writing the history of this country from inside the party that won the '
              + 'argument. Everything anybody ever knows about the last three hundred years will '
              + 'come through them.');
          } else {
            mod(ctx, 'the_country_unstripped', 'The Country Unstripped', { manpowerMult: 1.08, unrestAll: -0.5 });
            h.chronicle(ctx, 'era', 'The high places are still on the ridges, the villages still '
              + 'muster, and the scroll is still in the chamber being copied by men who have '
              + 'stopped expecting a king to enforce it and started expecting something else to.');
          }
        }),
      },
      {
        label: 'Leave it out, and let the scribes argue',
        tooltip: '+60 influence points and "The Question Left Open" (−0.3 unrest everywhere, +5% income) for forty years.',
        effects: guard('bookEnd:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { infl: 60 });
          mod(ctx, 'question_open_book', 'The Question Left Open', { unrestAll: -0.3, incomeMult: 1.05 }, 480);
          h.chronicle(ctx, 'era', 'No official account of the finding of the book is entered, and '
            + 'the men copying it go on copying it without one.');
        }),
      },
    ],
  },

  // ── the undated pressure of the century ───────────────────────────────────
  {
    id: 'ev732_the_deportation_policy',
    title: 'A Population Is Moved',
    desc: 'The empire has a procedure and it is being applied within sight of this court. A '
      + 'district that has revolted twice is not punished: it is replaced. The inhabitants '
      + 'are counted, registered by household and trade, issued rations and marched — not '
      + 'driven, marched, with their tools, because they are an asset — to a province nine '
      + 'hundred miles away where they have no kin, no land claim and no language in common '
      + 'with the neighbours. Other people, similarly counted, arrive to take their fields.\n\n'
      + 'In two generations neither group is anything in particular. That is the point of '
      + 'the procedure, and no state before this one has ever thought of it.',
    forTag: 'player',
    trigger: safeTrigger('ev732_deport:trigger', (ctx) => {
      const t = ctx.game.tags[P(ctx)];
      return !!t && ctx.game.date.y >= -722;
    }),
    maxYear: -640,
    aiOption: 1,
    historical: 'Assyrian royal inscriptions record roughly 1.2 million deportees over three centuries; Sargon II alone claims 27,290 from Samaria and the practice is documented in the provincial administrative letters.',
    options: [
      {
        label: 'Take in what walks south',
        tooltip: '−120 talents and "The Refugees Housed" (+10% growth, +8% manpower, +0.6 unrest everywhere) permanently. The capital doubles in a generation and a fifth of it has a northern accent.',
        effects: guard('deport:0', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.setFlag(ctx, 'deportationsBegun', true);
          h.adjust(ctx, me, { treasury: -120, legitimacy: 12 });
          mod(ctx, 'the_refugees_housed', 'The Refugees Housed', {
            growthMult: 1.1, manpowerMult: 1.08, unrestAll: 0.6,
          });
          h.chronicle(ctx, 'era', 'The roads south fill and are not turned back. Within a '
            + 'generation the capital has spread across the western hill and a fifth of it '
            + 'speaks with a northern accent.');
        }),
      },
      {
        label: 'Close the border: this kingdom cannot feed them',
        tooltip: '+150 talents and "The Border Closed" (−0.8 unrest everywhere, +6% income) permanently, at −15 legitimacy. The people on the road go somewhere else, or nowhere.',
        effects: guard('deport:1', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.setFlag(ctx, 'deportationsBegun', true);
          h.adjust(ctx, me, { treasury: 150, legitimacy: -15 });
          mod(ctx, 'the_border_closed', 'The Border Closed', { unrestAll: -0.8, incomeMult: 1.06 });
          h.chronicle(ctx, 'era', 'The passes are held against the people coming south. The '
            + 'chronicle does not record what happened to them, which is itself a record.');
        }),
      },
    ],
  },

  {
    id: 'ev732_the_prophet_and_the_king',
    title: 'The Prophet in the Palace Yard',
    desc: 'There is a man in the outer court with a following, and what he is saying is not '
      + 'a prediction — it is a policy critique with a theological warrant attached, '
      + 'delivered in public, in verse, and memorable enough that people are repeating it in '
      + 'the market by afternoon. Do not trust in horses. Do not go down to Egypt for help. '
      + 'The alliance you are negotiating is a covenant with death.\n\n'
      + 'He is also, uncomfortably often, right. The last three kings who ignored men like '
      + 'him are in the chronicle with a sentence each and a verdict.',
    forTag: 'player',
    trigger: safeTrigger('ev732_prophet:trigger', (ctx) => {
      const t = ctx.game.tags[P(ctx)];
      return !!t && ((t.warExhaustion || 0) > 5 || (t.legitimacy || 0) < 45);
    }),
    maxYear: -600,
    aiOption: 0,
    historical: 'Isaiah, Micah, Nahum, Zephaniah, Habakkuk and Jeremiah all operate as public political voices in this century, and the sources treat their interventions as events.',
    options: [
      {
        label: 'Bring him inside and take the counsel',
        tooltip: '−30 influence points, +18 legitimacy and "The Word Taken" (+0.25 legitimacy a month, −0.5 unrest everywhere) for twenty-five years.',
        effects: guard('prophet732:0', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.adjust(ctx, me, { infl: -30, legitimacy: 18 });
          mod(ctx, 'the_word_taken', 'The Word Taken', { legitimacyAdd: 0.25, unrestAll: -0.5 }, 300);
          h.chronicle(ctx, 'era', 'He is brought in through the side gate and heard, and the '
            + 'embassy that was being drafted is not sent.');
        }),
      },
      {
        label: 'Clear the yard',
        tooltip: '+35 governance points and "The Court Undisturbed" (+7% income) for twenty years, at −12 legitimacy and +0.8 unrest everywhere for fifteen. His disciples write it down.',
        effects: guard('prophet732:1', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.adjust(ctx, me, { gov: 35, legitimacy: -12 });
          mod(ctx, 'the_court_undisturbed_732', 'The Court Undisturbed', { incomeMult: 1.07 }, 240);
          mod(ctx, 'the_market_repeats_it', 'The Market Repeats It', { unrestAll: 0.8 }, 180);
          h.chronicle(ctx, 'era', 'The yard is cleared. By evening the verses are being repeated '
            + 'accurately in three markets, which is how they survive and the king\'s reply does '
            + 'not.');
        }),
      },
    ],
  },
];

// --- SPEC §216: a card is answered by the court it is addressed to ---------
// One loop instead of a tag argument on every call site in the file. A card
// marked `player` or `both` is always the chair the player is sitting in and
// is left alone; a card marked ISL or JDH writes to that court whether or not
// the player is in it.
for (const _c of EVENTS_732) {
  if (!_c || (_c.forTag !== 'ISL' && _c.forTag !== 'JDH')) continue;
  for (const _o of _c.options || []) {
    if (typeof _o.effects !== 'function') continue;
    _o.effects = bindAudience(_c.forTag, _o.effects);
  }
}
