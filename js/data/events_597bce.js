// Judaea Universalis — the chain of The Yoke of Babylon, 597 BCE (SPEC §268).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// Four questions with markers in the §119 tree — the oath, the two prophets,
// the letter to the exiles, and what gets rebuilt first — and around them the
// eleven years, the siege, the burning, the governor at Mizpah, the flight to
// Egypt, and the two centuries in which a deported community does the thing no
// other deported community in this world's history manages: it stays itself.
//
// The chapter's quiet argument is in the dates. The northern kingdom was
// deported in 722 and vanishes from the record. This one is deported in 597
// and 586 and produces, in captivity, a literature, a legal system, a fixed
// calendar and a returning population with a genealogical register. The
// difference is not divine favour and the sources do not claim it was: it is
// that this deportation was settled in one place, kept its own elders, and was
// told in writing to build houses.
//
// Sources: 2 Kings 24-25; 2 Chronicles 36; Jeremiah 27-29, 32, 34, 37-44;
// Ezekiel 1-3, 8-11, 33, 40-48; Lamentations; Ezra 1-6; Nehemiah 1-6; Haggai;
// Zechariah 1-8; the Babylonian Chronicle ABC 5; the Jehoiachin ration
// tablets; the Lachish ostraca; the Cyrus Cylinder; the Elephantine papyri.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_597bce] ' + key, e || '');
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

function P(ctx) { return ctx.game.playerTag; }

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

export const EVENTS_597 = [

  {
    id: 'ev597_the_oath',
    title: 'The Oath Sworn by His God',
    desc: 'The new king was made to swear, and the oath was administered in the name of the '
      + 'god of this country rather than of Babylon\'s, which is a deliberate and very '
      + 'expensive piece of imperial policy: break it and you are not defying an empire, you '
      + 'are perjuring yourself before your own altar, and the empire will make sure '
      + 'everybody says so.\n\n'
      + 'The nobles who were not deported want it broken now, while Egypt has a new Pharaoh '
      + 'and a new army. The men who were deported — and who are still writing letters — '
      + 'point out that the last three kingdoms on this coast to try it are administrative '
      + 'districts.',
    forTag: 'JDH',
    date: { y: -597, m: 6 },
    major: true,
    aiOption: 0,
    historical: '2 Chronicles 36:13 and Ezekiel 17:13-19 both make the oath, sworn by the God of Israel, the specific charge against Zedekiah; the Babylonian vassal treaties used exactly this device.',
    options: [
      {
        label: 'Keep it: a vassal kingdom is still a kingdom',
        tooltip: '+20 legitimacy and "The Oath Kept" (−1 unrest everywhere, +8% income, +1 fort defence) permanently; Babylon\'s regard +60. The nobles are furious and the kingdom is intact.',
        effects: guard('oath:0', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'oathKept', true);
          h.adjust(ctx, 'JDH', { legitimacy: 20, gov: 30 });
          mod(ctx, 'the_oath_kept', 'The Oath Kept', { unrestAll: -1, incomeMult: 1.08, fortDefBonus: 1 });
          try { h.removeModifier(ctx, 'JDH', 'the_oath_by_his_god'); } catch (e) { warnOnce('oath:mod', e); }
          opinion(ctx, 'BBL', 'JDH', 60);
          h.chronicle(ctx, 'era', 'The oath is kept and the tribute goes to Riblah on time. The '
            + 'kingdom keeps its king, its house and its courts, and the party of the nobles '
            + 'begins meeting somewhere else.');
        }),
      },
      {
        label: 'Break it: Egypt has promised cavalry',
        tooltip: 'The recorded answer. War with Babylon, +25 legitimacy with the nobles and "The Revolt" (+12% morale, +10% manpower) for ten years — and a siege in eighteen months.',
        effects: guard('oath:1', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'oathBroken', true);
          h.adjust(ctx, 'JDH', { legitimacy: 25, mar: 50 });
          mod(ctx, 'the_revolt', 'The Revolt', { moraleMult: 1.12, manpowerMult: 1.1 }, 120);
          opinion(ctx, 'BBL', 'JDH', -160);
          opinion(ctx, 'MIZ', 'JDH', 60);
          try {
            const t = ctx.game.tags.JDH;
            if (t) t.overlord = null;
            h.declareWar(ctx, 'BBL', 'JDH', 'The Breaking of the Oath');
          } catch (e) { warnOnce('oath:war', e); }
          h.chronicle(ctx, 'era', 'The oath is broken and the envoys go to Egypt for horses and '
            + 'much people. The Babylonian army is on the road within the year.');
        }),
      },
    ],
  },

  {
    id: 'ev597_the_two_prophets',
    title: 'Two Men in the Temple Court',
    desc: 'One of them is wearing a yoke. Not a symbol of a yoke — an actual wooden ox-yoke, '
      + 'made to be worn, and he has been walking round the city in it telling everybody, '
      + 'including the envoys of Edom, Moab, Ammon, Tyre and Sidon who are in town to '
      + 'discuss a coalition, that the nations that put their necks under the king of '
      + 'Babylon will be left on their own land.\n\n'
      + 'The other has just walked up to him in the court, in front of the priests and all '
      + 'the people, broken the yoke off his neck, and announced that within two full years '
      + 'the vessels of the house and the king and all the captives will be back. Everyone '
      + 'present prefers the second man. The court has to rule, because the coalition envoys '
      + 'are waiting and both of these men are claiming the same authority.',
    forTag: 'JDH',
    date: { y: -594, m: 5 },
    major: true,
    aiOption: 1,
    historical: 'Jeremiah 27-28: the yoke, the coalition embassy, Hananiah breaking the yoke in the temple court, and the reply that the wooden yoke would be replaced by one of iron.',
    options: [
      {
        label: 'Two years: the vessels come home',
        tooltip: '+25 legitimacy and "The Yoke of Wood" (+10% morale, +8% manpower, +0.8 unrest everywhere) for fifteen years. The coalition envoys go home encouraged, which is the expensive part.',
        effects: guard('prophets:0', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'yokeOfWood', true);
          h.adjust(ctx, 'JDH', { legitimacy: 25, mar: 30 });
          mod(ctx, 'the_yoke_of_wood', 'The Yoke of Wood', {
            moraleMult: 1.1, manpowerMult: 1.08, unrestAll: 0.8,
          }, 180);
          opinion(ctx, 'EDM', 'JDH', 30); opinion(ctx, 'AMO', 'JDH', 30); opinion(ctx, 'MOB', 'JDH', 30);
          opinion(ctx, 'BBL', 'JDH', -40);
          h.chronicle(ctx, 'era', 'The court rules for the two years. The envoys of the coalition '
            + 'go home with an answer and the man in the yoke is told to stop wearing it.');
        }),
      },
      {
        label: 'Seventy: build houses and wait',
        tooltip: '−20 legitimacy now and "The Yoke of Iron" (−1 unrest everywhere, +10% income, −6% morale) permanently: the coalition collapses, Babylon\'s regard +50, and the court is governing for a generation it will not see.',
        effects: guard('prophets:1', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'yokeOfIron', true);
          h.adjust(ctx, 'JDH', { legitimacy: -20, gov: 40 });
          mod(ctx, 'the_yoke_of_iron', 'The Yoke of Iron', {
            unrestAll: -1, incomeMult: 1.1, moraleMult: 0.94,
          });
          opinion(ctx, 'BBL', 'JDH', 50);
          h.chronicle(ctx, 'era', 'The court rules for the seventy years, which nobody in the '
            + 'building wants to hear. The coalition envoys leave the same week and the '
            + 'coalition is not heard of again.');
        }),
      },
    ],
  },

  {
    id: 'ev597_the_letter_to_the_exiles',
    title: 'The Letter to the Exiles',
    desc: 'There is a draft going north with the next embassy, addressed to the elders, the '
      + 'priests, the prophets and all the people carried away to Babylon — and what it says '
      + 'is the most consequential sentence anybody in this chapter writes.\n\n'
      + 'Version one: build houses and live in them, plant gardens and eat their fruit, take '
      + 'wives and beget sons and daughters and take wives for your sons — and seek the peace '
      + 'of the city where you are, and pray for it, for in its peace you shall have peace. '
      + 'Version two: hold fast, sell nothing, marry nobody there, and be ready, because this '
      + 'will be over shortly. Every prophet in Babylonia is currently saying version two.',
    forTag: 'JDH',
    date: { y: -593, m: 7 },
    major: true,
    aiOption: 0,
    historical: 'Jeremiah 29:4-7. The exilic community in Babylonia produced the synagogue, the fixed calendar, the canonical text and a returning population with a register; no other deported people in the Assyrian or Babylonian records does anything comparable.',
    options: [
      {
        label: 'Build houses and seek the peace of the city',
        tooltip: '+50 influence points and "The Community in Babylonia" (+12% income, +0.25 legitimacy a month, +8% growth) permanently — a second centre of this people that survives whatever happens here, and the reason there is anything to come back.',
        effects: guard('exiles:0', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'exilesSettled', true);
          h.adjust(ctx, 'JDH', { infl: 50, legitimacy: 15 });
          mod(ctx, 'the_community_in_babylonia', 'The Community in Babylonia', {
            incomeMult: 1.12, legitimacyAdd: 0.25, growthMult: 1.08,
          });
          opinion(ctx, 'BBL', 'JDH', 30);
          h.chronicle(ctx, 'era', 'The letter goes north: build houses, plant gardens, and seek '
            + 'the peace of the city. Within a generation the community by the canal has '
            + 'elders, courts, a school and a copy of everything.');
        }),
      },
      {
        label: 'Sell nothing, marry nobody, be ready',
        tooltip: '+25 legitimacy and "The Bags Packed" (+10% manpower, +8% morale, −8% income) for forty years. The exiles stay a camp rather than a community, which keeps them angry and does not keep them.',
        effects: guard('exiles:1', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'exilesPromisedReturn', true);
          h.adjust(ctx, 'JDH', { legitimacy: 25, mar: 30 });
          mod(ctx, 'the_bags_packed', 'The Bags Packed', {
            manpowerMult: 1.1, moraleMult: 1.08, incomeMult: 0.92,
          }, 480);
          opinion(ctx, 'BBL', 'JDH', -30);
          h.chronicle(ctx, 'era', 'The letter goes north telling the exiles to hold fast and be '
            + 'ready. Two prophets in Babylonia are burned by the king for saying the same '
            + 'thing more loudly.');
        }),
      },
    ],
  },

  {
    id: 'ev597_the_lachish_letters',
    title: 'We Are Watching for the Signals of Lachish',
    desc: 'The Babylonian army is in the country and the fortified towns are going out one '
      + 'at a time. An officer at a guard post has written to his commander at Lachish, on a '
      + 'potsherd, in ink, and the last line of it is the most frightening sentence in the '
      + 'archaeology of this country: "we are watching for the signal fires of Lachish, '
      + 'according to all the signs which my lord has given, because we cannot see Azekah."\n\n'
      + 'Azekah has stopped signalling. Everything now depends on whether the capital can be '
      + 'held while there is still a kingdom around it, and on whether the Egyptian column '
      + 'that has crossed the frontier is coming further than the frontier.',
    forTag: 'JDH',
    date: { y: -588, m: 3 },
    when: safeTrigger('ev597_lachish:when', (ctx) => flag(ctx, 'oathBroken')),
    major: true,
    aiOption: 1,
    historical: 'Lachish ostracon IV, found in the burnt gatehouse; Jeremiah 34:7 names Lachish and Azekah as the last two fortified cities still holding out.',
    options: [
      {
        label: 'Hold the towns and wait for Pharaoh',
        tooltip: '−6,000 manpower and "The Towns Held" (+12% siege endurance, +8% morale) for fifteen years. The Egyptian column does come, the siege is lifted for a season, and then it comes back.',
        effects: guard('lachish597:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { manpower: -6000, legitimacy: 12, mar: 30 });
          mod(ctx, 'the_towns_held', 'The Towns Held', { siegeMult: 1.12, moraleMult: 1.08 }, 180);
          h.chronicle(ctx, 'era', 'The towns are held and the signal fires go on being watched for. '
            + 'An Egyptian column crosses the frontier, the siege lifts for a season, and the '
            + 'Egyptians go home.');
        }),
      },
      {
        label: 'Bring everything inside the capital',
        tooltip: '+4,000 manpower concentrated and "The City Alone" (+20% siege endurance at the capital, +1 fort defence) for fifteen years, at +1.5 unrest everywhere for ten: the country outside is given up and knows it.',
        effects: guard('lachish597:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { manpower: 4000, legitimacy: -10 });
          mod(ctx, 'the_city_alone', 'The City Alone', { siegeMult: 1.2, fortDefBonus: 1 }, 180);
          mod(ctx, 'the_country_given_up', 'The Country Given Up', { unrestAll: 1.5 }, 120);
          h.chronicle(ctx, 'era', 'Every garrison in the kingdom is pulled inside the capital. The '
            + 'signal fires stop, one post at a time, and nobody writes about it afterwards '
            + 'because the men who would have are inside the wall.');
        }),
      },
    ],
  },

  {
    id: 'ev597_the_governor_at_mizpah',
    title: 'The Governor at Mizpah',
    desc: 'There is no king. The empire has appointed a governor from one of the old scribal '
      + 'families — the grandson of the secretary who read the scroll to Josiah — and seated '
      + 'him not in the ruined capital but at Mizpah, a few miles north, with a garrison and '
      + 'an instruction to gather the vinedressers and the husbandmen and get the harvest in.\n\n'
      + 'It is working. People are coming back from Moab and Ammon and Edom where they fled, '
      + 'the wine and summer fruits are gathered "very much", and something like a country is '
      + 'reassembling under a man with no crown. The king of Ammon is also sponsoring a '
      + 'prince of the royal house who thinks the governor is a collaborator.',
    forTag: 'JDH',
    date: { y: -585, m: 7 },
    when: safeTrigger('ev597_gedaliah:when', (ctx) => !flag(ctx, 'oathKept')),
    major: true,
    aiOption: 0,
    historical: '2 Kings 25:22-26 and Jeremiah 40-41: Gedaliah ben Ahikam was murdered at Mizpah by Ishmael ben Nethaniah, of the seed royal, at Baalis of Ammon\'s instigation, and the remnant fled to Egypt.',
    options: [
      {
        label: 'Back the governor and take the warning seriously',
        tooltip: '−80 talents and "The Harvest Gathered" (+12% income, +8% growth, −0.8 unrest everywhere) permanently; the assassination does not happen and the country reassembles without a crown.',
        effects: guard('gedaliah:0', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'gedaliahLived', true);
          h.adjust(ctx, 'JDH', { treasury: -80, legitimacy: 15, gov: 40 });
          mod(ctx, 'the_harvest_gathered', 'The Harvest Gathered', {
            incomeMult: 1.12, growthMult: 1.08, unrestAll: -0.8,
          });
          opinion(ctx, 'BBL', 'JDH', 40);
          h.chronicle(ctx, 'era', 'The warning is believed, the guard is doubled, and the man from '
            + 'Ammon finds the gate shut. The wine and the summer fruits are gathered very much, '
            + 'and a country without a king goes on being a country.');
        }),
      },
      {
        label: 'Back the prince of the royal house',
        tooltip: '+20 legitimacy with the house and "The Seed Royal" (+10% morale, +1.5 unrest everywhere, −10% income) for twenty years, at Babylon\'s regard −60. A crown, a murder at a meal, and a general flight to Egypt.',
        effects: guard('gedaliah:1', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'gedaliahKilled', true);
          h.adjust(ctx, 'JDH', { legitimacy: 20, mar: 25 });
          mod(ctx, 'the_seed_royal', 'The Seed Royal', {
            moraleMult: 1.1, unrestAll: 1.5, incomeMult: 0.9,
          }, 240);
          opinion(ctx, 'BBL', 'JDH', -60);
          opinion(ctx, 'AMO', 'JDH', 40);
          h.chronicle(ctx, 'era', 'The governor is killed at a meal at Mizpah with the Babylonian '
            + 'garrison and the men who were eating with him, and everybody who can walk goes to '
            + 'Egypt, taking the prophet with them against his will.');
        }),
      },
    ],
  },

  {
    id: 'ev597_the_rations_tablet',
    title: 'A Clerk in Babylon Writes a Name',
    desc: 'A merchant back from Babylon has seen the storehouse lists. Among the standard '
      + 'ration entries — oil for the king\'s household, oil for the Ionian carpenters, oil '
      + 'for the men of Tyre — there is a line that reads: ten sila of oil to Yaukin, king '
      + 'of the land of Yahudu, and two and a half sila for his five sons.\n\n'
      + 'He is a prisoner. He is also, in the empire\'s own administrative record, in its own '
      + 'hand, for its own filing purposes, still being called king. Every document the '
      + 'exiles date, they date by his regnal year. As long as a clerk in Babylon writes that '
      + 'line, the question of who the king of this country is has not actually been closed.',
    forTag: 'JDH',
    trigger: safeTrigger('ev597_rations:trigger', (ctx) => ctx.game.date.y >= -592),
    maxYear: -560,
    aiOption: 0,
    historical: 'The Jehoiachin ration tablets from the South Palace at Babylon, dated to 592, name "Ya\'u-kinu king of the land of Yahudu" and his five sons.',
    options: [
      {
        label: 'Date our own documents by his years too',
        tooltip: '+40 influence points and "One King, Two Cities" (+0.25 legitimacy a month, −0.4 unrest everywhere) permanently. The dynasty is a fact in two archives at once.',
        effects: guard('rations:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { infl: 40, legitimacy: 12 });
          mod(ctx, 'one_king_two_cities', 'One King, Two Cities', {
            legitimacyAdd: 0.25, unrestAll: -0.4,
          });
          h.setFlag(ctx, 'exilicRegnalYears', true);
          h.chronicle(ctx, 'era', 'The court begins dating its own documents by the years of the '
            + 'king in Babylon, which is either loyalty or a claim and is probably both.');
        }),
      },
      {
        label: 'The king is whoever is in Jerusalem',
        tooltip: '+40 governance points and "The King Here" (+8% income, +0.15 legitimacy a month) permanently. The archive is consistent and the exiles read it as a repudiation.',
        effects: guard('rations:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { gov: 40 });
          mod(ctx, 'the_king_here', 'The King Here', { incomeMult: 1.08, legitimacyAdd: 0.15 });
          h.chronicle(ctx, 'era', 'The chancery rules that the regnal year is the year of the king '
            + 'in this city. The community in Babylonia goes on using the other one.');
        }),
      },
    ],
  },

  {
    id: 'ev597_the_edict_of_cyrus',
    title: 'The Edict',
    desc: 'Babylon has fallen — to a Persian, in a night, with the river diverted and the '
      + 'city gates opened from inside by people who had had enough of their own king. And '
      + 'the new master of the world has issued a policy: the peoples the Babylonians '
      + 'deported may go home, and the gods the Babylonians carried off go home with them, '
      + 'and the sanctuaries may be rebuilt at the crown\'s expense, and here is a list of '
      + 'the vessels, by count and by weight.\n\n'
      + 'It is not a favour to this people in particular. Every displaced cult in the empire '
      + 'is getting the same letter, because a god restored to his own house by a king prays '
      + 'for that king. What it means here is that after two generations there is a permit, '
      + 'a subsidy and an inventory — and a decision about what to build with them.',
    forTag: 'JDH',
    date: { y: -538, m: 4 },
    major: true,
    aiOption: 0,
    historical: 'Ezra 1 and 6:3-5 (the Aramaic memorandum) and the Cyrus Cylinder, which describes the same policy for Mesopotamian sanctuaries in the same terms.',
    options: [
      {
        label: 'The house first: lay the foundation on the Mount',
        tooltip: '+40 legitimacy and "The Second House" (+0.35 legitimacy a month, +15% from the pilgrims, +8% income) permanently; Jerusalem gets its wonder back. The people building it have no wall and the neighbours have noticed.',
        effects: guard('edict:0', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'houseRebuilt', true);
          h.adjust(ctx, 'JDH', { legitimacy: 40, treasury: 200, gov: 40 });
          mod(ctx, 'the_second_house', 'The Second House', {
            legitimacyAdd: 0.35, pilgrimMult: 1.15, incomeMult: 1.08,
          });
          try {
            const p = ctx.prov && ctx.prov('Jerusalem');
            if (p) p.wonder = 'temple';
          } catch (e) { warnOnce('edict:prov', e); }
          h.chronicle(ctx, 'era', 'The foundation is laid on the Mount and the old men who saw the '
            + 'first house weep out loud while the young men shout, and nobody outside the city '
            + 'can tell the weeping from the shouting.');
        }),
      },
      {
        label: 'The wall first: a community with no wall is not a community',
        tooltip: '+30 legitimacy and "The Wall First" (+1 fort defence, +10% manpower, −0.8 unrest everywhere) permanently; Jerusalem gets walls. The house waits a generation and the neighbours write to the king about it.',
        effects: guard('edict:1', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'wallsFirst', true);
          h.adjust(ctx, 'JDH', { legitimacy: 30, treasury: 150, mar: 40 });
          mod(ctx, 'the_wall_first', 'The Wall First', {
            fortDefBonus: 1, manpowerMult: 1.1, unrestAll: -0.8,
          });
          try {
            const p = ctx.prov && ctx.prov('Jerusalem');
            if (p) {
              if (!Array.isArray(p.buildings)) p.buildings = [];
              if (p.buildings.indexOf('walls') === -1) p.buildings.push('walls');
            }
          } catch (e) { warnOnce('edict:prov2', e); }
          h.chronicle(ctx, 'era', 'The wall goes up first, in fifty-two days, with every man '
            + 'building with one hand and holding a weapon in the other. The neighbours write to '
            + 'the king about it, at length, and are ignored.');
        }),
      },
    ],
  },

  // ── the terminals (SPEC §119) ─────────────────────────────────────────────
  {
    id: 'ev597_what_the_oath_was_worth',
    title: 'What the Oath Was Worth',
    desc: 'The account of the oath can be closed. The empire that administered it no longer '
      + 'exists; the god it was sworn by is still being sworn by; and the argument about '
      + 'whether a vassal\'s oath to a foreign king binds anybody has become, in the '
      + 'meantime, a body of law.',
    forTag: 'JDH',
    date: { y: -540, m: 3 },
    when: safeTrigger('ev597_oathEnd:when', (ctx) => flag(ctx, 'oathKept') || flag(ctx, 'oathBroken')),
    aiOption: 0,
    historical: 'Ezekiel 17 treats the broken oath as the specific ground of the catastrophe; the argument that a sworn undertaking binds regardless of whom it was sworn to is one of the oldest in this literature.',
    options: [
      {
        label: 'Enter it in the chronicle',
        tooltip: 'Keeping it bought a kingdom that was not burned; breaking it bought eighteen months and a literature. +30 legitimacy and the matching permanent modifier.',
        effects: guard('oathEnd:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { legitimacy: 30, gov: 40 });
          if (flag(ctx, 'oathKept')) {
            mod(ctx, 'the_word_that_held', 'The Word That Held', { incomeMult: 1.08, legitimacyAdd: 0.2 });
            h.chronicle(ctx, 'era', 'The oath was kept to an empire that has since ceased to exist, '
              + 'and the kingdom that kept it is still here with its house standing. There is no '
              + 'book of Lamentations.');
          } else {
            mod(ctx, 'the_word_that_broke', 'The Word That Broke', { moraleMult: 1.08, manpowerMult: 1.05 });
            h.chronicle(ctx, 'era', 'The oath was broken, the city was burned, and the argument '
              + 'about what a sworn word is worth has been running in this people\'s courts ever '
              + 'since, which is one way of not losing it.');
          }
        }),
      },
      {
        label: 'Leave it out, and let the scribes argue',
        tooltip: '+60 influence points and "The Question Left Open" (−0.3 unrest everywhere, +5% income) for forty years.',
        effects: guard('oathEnd:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { infl: 60 });
          mod(ctx, 'question_open_oath', 'The Question Left Open', { unrestAll: -0.3, incomeMult: 1.05 }, 480);
          h.chronicle(ctx, 'era', 'No official verdict on the oath is entered, and four separate '
            + 'accounts of it survive because of that.');
        }),
      },
    ],
  },

  {
    id: 'ev597_what_the_word_was',
    title: 'Which Man Was Right',
    desc: 'It has been settled the way these things are always settled, which is by the '
      + 'calendar. One of the two men in the temple court gave a date. The date has passed. '
      + 'What the court does with that now determines which of them gets copied.',
    forTag: 'JDH',
    date: { y: -560, m: 6 },
    when: safeTrigger('ev597_wordEnd:when', (ctx) => flag(ctx, 'yokeOfWood') || flag(ctx, 'yokeOfIron')),
    aiOption: 0,
    historical: 'Hananiah died within the year, according to Jeremiah 28:17; the test of a prophet by whether the thing came to pass is set out in Deuteronomy 18:22 and applied in exactly this case.',
    options: [
      {
        label: 'Enter it in the chronicle',
        tooltip: 'The two years bought a coalition and a catastrophe; the seventy bought a generation of government and a text. +25 legitimacy and the matching permanent modifier.',
        effects: guard('wordEnd:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { legitimacy: 25, infl: 40 });
          if (flag(ctx, 'yokeOfWood')) {
            mod(ctx, 'the_short_reckoning', 'The Short Reckoning', { moraleMult: 1.08, unrestAll: 0.3 });
            h.chronicle(ctx, 'era', 'The court ruled for the two years and the two years came and '
              + 'went. The archive keeps both prophecies, which is how anybody knows.');
          } else {
            mod(ctx, 'the_long_reckoning', 'The Long Reckoning', { adminMult: 0.92, legitimacyAdd: 0.2 });
            h.chronicle(ctx, 'era', 'The court ruled for the seventy years and then governed as if '
              + 'it meant it, which is the rarer half. The man who said so is the one who gets '
              + 'copied.');
          }
        }),
      },
      {
        label: 'Leave it out, and let the scribes argue',
        tooltip: '+60 influence points and "The Question Left Open" (−0.3 unrest everywhere, +5% income) for forty years.',
        effects: guard('wordEnd:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { infl: 60 });
          mod(ctx, 'question_open_word', 'The Question Left Open', { unrestAll: -0.3, incomeMult: 1.05 }, 480);
          h.chronicle(ctx, 'era', 'Both prophecies are copied without a ruling attached, and the '
            + 'test of which is which is left to the reader.');
        }),
      },
    ],
  },

  {
    id: 'ev597_what_the_letter_made',
    title: 'What the Letter Made',
    desc: 'Two generations by the canals of Babylonia, and the account can be closed. It is '
      + 'worth being precise about what happened, because it is the only instance of it in '
      + 'the records of either empire.',
    forTag: 'JDH',
    date: { y: -520, m: 8 },
    when: safeTrigger('ev597_letterEnd:when', (ctx) => flag(ctx, 'exilesSettled') || flag(ctx, 'exilesPromisedReturn')),
    aiOption: 0,
    historical: 'The Al-Yahudu tablets show a Judean community in Babylonia farming, leasing, litigating and paying taxes under its own names for over a century; Ezra 2 and Nehemiah 7 give the register of those who came back.',
    options: [
      {
        label: 'Enter it in the chronicle',
        tooltip: 'Building houses made a second centre that outlives every empire on this map; keeping the bags packed made a camp. +30 legitimacy and the matching permanent modifier.',
        effects: guard('letterEnd597:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { legitimacy: 30, infl: 50 });
          if (flag(ctx, 'exilesSettled')) {
            mod(ctx, 'the_second_centre', 'The Second Centre', {
              incomeMult: 1.1, legitimacyAdd: 0.25, growthMult: 1.05,
            });
            h.chronicle(ctx, 'era', 'The community by the canal has elders, courts, schools, land '
              + 'contracts in its own names and a complete copy of everything. It sends money '
              + 'west and opinions with it, and it will still be doing both a thousand years '
              + 'from now.');
          } else {
            mod(ctx, 'the_camp_that_waited', 'The Camp That Waited', { moraleMult: 1.08, manpowerMult: 1.06 });
            h.chronicle(ctx, 'era', 'The exiles waited, and waiting is not a form of organisation. '
              + 'What came back came back angry and unregistered, and the men who had stayed '
              + 'behind had forty years of possession.');
          }
        }),
      },
      {
        label: 'Leave it out, and let the scribes argue',
        tooltip: '+60 influence points and "The Question Left Open" (−0.3 unrest everywhere, +5% income) for forty years.',
        effects: guard('letterEnd597:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { infl: 60 });
          mod(ctx, 'question_open_exiles', 'The Question Left Open', { unrestAll: -0.3, incomeMult: 1.05 }, 480);
          h.chronicle(ctx, 'era', 'Nobody rules on what the letter was for, and both communities '
            + 'go on quoting the half of it they prefer.');
        }),
      },
    ],
  },

  {
    id: 'ev597_what_was_rebuilt',
    title: 'What Was Rebuilt',
    desc: 'A century after the edict, the shape of what came back out of Babylonia is fixed '
      + 'and will not change again for four hundred years: a small province with a temple, a '
      + 'wall, a high priest, a register of families and a governor answering to a satrap. '
      + 'Not a kingdom. The decision about which stones went down first is visible in every '
      + 'part of it.',
    forTag: 'JDH',
    date: { y: -450, m: 5 },
    when: safeTrigger('ev597_rebuiltEnd:when', (ctx) => flag(ctx, 'houseRebuilt') || flag(ctx, 'wallsFirst')),
    aiOption: 0,
    historical: 'The second house was dedicated in 516 and Nehemiah\'s wall finished in 445; the province of Yehud kept that shape until the Hasmoneans.',
    options: [
      {
        label: 'Enter it in the chronicle',
        tooltip: 'The house first made a cult centre with a priesthood at the top of it; the wall first made a community that could defend a decision. +35 legitimacy and the matching permanent modifier.',
        effects: guard('rebuiltEnd:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { legitimacy: 35, gov: 50 });
          if (flag(ctx, 'houseRebuilt')) {
            mod(ctx, 'a_house_and_a_priesthood', 'A House and a Priesthood', {
              pilgrimMult: 1.15, legitimacyAdd: 0.25, adminMult: 0.95,
            });
            h.chronicle(ctx, 'era', 'The house was raised first and the high priest ended up at '
              + 'the top of the province, which is the constitution this country keeps until the '
              + 'Maccabees inherit it.');
          } else {
            mod(ctx, 'a_wall_and_a_register', 'A Wall and a Register', {
              fortDefBonus: 1, manpowerMult: 1.08, unrestAll: -0.5,
            });
            h.chronicle(ctx, 'era', 'The wall went up first and the community inside it decided '
              + 'who belonged before it decided what to worship in. Both lists survive and they '
              + 'do not match.');
          }
        }),
      },
      {
        label: 'Leave it out, and let the scribes argue',
        tooltip: '+60 influence points and "The Question Left Open" (−0.3 unrest everywhere, +5% income) for forty years.',
        effects: guard('rebuiltEnd:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { infl: 60 });
          mod(ctx, 'question_open_rebuilt', 'The Question Left Open', { unrestAll: -0.3, incomeMult: 1.05 }, 480);
          h.chronicle(ctx, 'era', 'The two accounts of the rebuilding are filed side by side, '
            + 'disagreeing about the order of everything.');
        }),
      },
    ],
  },

  // ── the undated pressure of the age ───────────────────────────────────────
  {
    id: 'ev597_the_sabbath_and_the_sign',
    title: 'A Sign Without a Temple',
    desc: 'The community in Babylonia has a problem with no precedent: it is a people whose '
      + 'entire religious practice was a building and a calendar of pilgrimages to it, and '
      + 'it is nine hundred miles from the building, which in any case is no longer certain '
      + 'to be standing.\n\n'
      + 'What the elders there have started doing is this: keeping the seventh day rigidly, '
      + 'in public, as the marker of who they are; circumcising, for the same reason; and '
      + 'meeting to read and expound the text on that day, in a room, without an altar. The '
      + 'question in front of this court is whether to endorse it, because what is being '
      + 'invented is a religion that does not need a country.',
    forTag: 'JDH',
    trigger: safeTrigger('ev597_sabbath:trigger', (ctx) => ctx.game.date.y >= -590),
    maxYear: -500,
    aiOption: 0,
    historical: 'Sabbath and circumcision become identity markers in the exilic literature (Ezekiel 20, Isaiah 56); the synagogue as an institution has no pre-exilic evidence and abundant post-exilic evidence.',
    options: [
      {
        label: 'Endorse it: the practice is the people',
        tooltip: '+50 influence points and "A Faith Without a Country" (+0.3 legitimacy a month, +10% income, −0.6 unrest everywhere) permanently. It is the single most durable institution anybody in this game builds.',
        effects: guard('sabbath:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { infl: 50, legitimacy: 20 });
          mod(ctx, 'a_faith_without_a_country', 'A Faith Without a Country', {
            legitimacyAdd: 0.3, incomeMult: 1.1, unrestAll: -0.6,
          });
          h.setFlag(ctx, 'portableFaith', true);
          h.chronicle(ctx, 'era', 'The seventh day, the covenant of the flesh and a room where the '
            + 'text is read aloud and explained. It is a religion that can be carried, and no '
            + 'other people on this map has one.');
        }),
      },
      {
        label: 'The house is the religion; everything else is a substitute',
        tooltip: '+40 governance points and "The House Alone" (+12% from the pilgrims, +0.2 legitimacy a month) permanently. The centre stays here, and so does everything that depends on the centre standing.',
        effects: guard('sabbath:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { gov: 40, legitimacy: 12 });
          mod(ctx, 'the_house_alone', 'The House Alone', {
            pilgrimMult: 1.12, legitimacyAdd: 0.2,
          });
          h.chronicle(ctx, 'era', 'The court rules that sacrifice is the service and the rest is '
            + 'an aid to memory. The rooms in Babylonia go on filling every seventh day anyway.');
        }),
      },
    ],
  },

  {
    id: 'ev597_edom_in_the_negeb',
    title: 'Edom Comes Up From the South',
    desc: 'The Edomites have crossed the Arabah into the Negeb and are taking the fort line '
      + 'town by town while this kingdom\'s army is looking north. They are not raiding. '
      + 'They are settling — families, flocks, shrines — and in a hundred years the whole '
      + 'south country will be called Idumea and nobody will remember that it was not.\n\n'
      + 'The bitterness this produces is out of all proportion to the ground. Half the '
      + 'prophetic literature of the next two centuries is about Edom, and the reason is on '
      + 'every page: they were kin, and they came in while the house was burning.',
    forTag: 'JDH',
    trigger: safeTrigger('ev597_edom:trigger', (ctx) => {
      const t = ctx.game.tags.JDH;
      return !!t && ctx.game.date.y >= -588 && ((t.warExhaustion || 0) > 3 || (t.stability || 0) < 0);
    }),
    maxYear: -520,
    aiOption: 1,
    historical: 'Obadiah, Psalm 137:7, Ezekiel 35 and Lamentations 4:21-22 are all about Edom in 586; the archaeological record shows Edomite material culture across the Negev from the sixth century.',
    options: [
      {
        label: 'Send what can be spared south',
        tooltip: '−3,000 manpower and −100 talents, and "The South Contested" (+1 hill defence, +6% manpower) for twenty-five years; Edom to −60 regard. The fort line holds, at a cost the northern front will feel.',
        effects: guard('edom597:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { manpower: -3000, treasury: -100, mar: 30 });
          mod(ctx, 'the_south_contested', 'The South Contested', { hillDefBonus: 1, manpowerMult: 1.06 }, 300);
          opinion(ctx, 'EDM', 'JDH', -60);
          h.chronicle(ctx, 'era', 'A column goes south to the fort line and holds it, which nobody '
            + 'north of Hebron thanks anybody for.');
        }),
      },
      {
        label: 'Let the south go and hold the ridge',
        tooltip: '+3,000 manpower kept and "The Ridge Concentrated" (+1 fort defence, −0.5 unrest everywhere) for twenty-five years, at −15 legitimacy: the Negeb becomes Idumea and the grievance becomes literature.',
        effects: guard('edom597:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { manpower: 3000, legitimacy: -15 });
          mod(ctx, 'the_ridge_concentrated', 'The Ridge Concentrated', { fortDefBonus: 1, unrestAll: -0.5 }, 300);
          h.setFlag(ctx, 'negebLost', true);
          h.chronicle(ctx, 'era', 'The Negeb is left to the men coming up out of Seir. Within a '
            + 'century the whole south country has a different name, and every prophet in this '
            + 'one has a subject.');
        }),
      },
    ],
  },

  {
    id: 'ev597_the_neighbours_write_to_the_king',
    title: 'The Neighbours Write to the King',
    desc: 'A letter has gone to the Persian court from the officials of the province across '
      + 'the river — the governor at Samaria and his colleagues — and it is a masterpiece of '
      + 'its kind. Be it known unto the king, they write, that the Jews which came up from '
      + 'thee to us are come to Jerusalem, building the rebellious and the bad city, and have '
      + 'set up the walls thereof, and joined the foundations. Search the book of the records '
      + 'of thy fathers, and thou shalt find that this city is a rebellious city, hurtful '
      + 'unto kings and provinces, and that they have moved sedition within the same of old '
      + 'time: for which cause was this city destroyed.\n\n'
      + 'Every word of it is true. That is what makes it dangerous.',
    forTag: 'JDH',
    trigger: safeTrigger('ev597_neighbours:trigger', (ctx) => ctx.game.date.y >= -535),
    maxYear: -440,
    aiOption: 0,
    historical: 'Ezra 4:11-16, the letter of Rehum and Shimshai; the work was stopped by royal order and only resumed under Darius after the memorandum of Cyrus was found in the archive at Ecbatana.',
    options: [
      {
        label: 'Send to the archive: the permit is on file',
        tooltip: '−40 influence points and "The Memorandum Found" (+10% income, +0.2 legitimacy a month) permanently. A roll is found in the treasure house at Ecbatana and the work resumes with the crown paying for it.',
        effects: guard('neighbours:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { infl: -40, legitimacy: 20, treasury: 120 });
          mod(ctx, 'the_memorandum_found', 'The Memorandum Found', {
            incomeMult: 1.1, legitimacyAdd: 0.2,
          });
          h.chronicle(ctx, 'era', 'A search is made in the house of the rolls at Ecbatana and a '
            + 'memorandum is found, with the measurements and the order that the expenses be '
            + 'paid from the king\'s goods. The work resumes.');
        }),
      },
      {
        label: 'Buy the governor across the river instead',
        tooltip: '−200 talents and "The Province Squared" (−0.8 unrest everywhere, +8% income) for thirty years. Cheaper, faster, and it has to be done again with every new governor.',
        effects: guard('neighbours:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { treasury: -200, infl: 25 });
          mod(ctx, 'the_province_squared', 'The Province Squared', {
            unrestAll: -0.8, incomeMult: 1.08,
          }, 360);
          h.chronicle(ctx, 'era', 'The officials across the river are squared privately and the '
            + 'letter is not pursued. It will have to be done again the next time the satrapy '
            + 'changes hands, and it is.');
        }),
      },
    ],
  },
];
