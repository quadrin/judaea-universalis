// Judaea Universalis — the House, and the window it was built in, 137–210 CE.
// Content package. Zero imports; concatenated onto EVENTS_132.
//
// Two things the redemption road has been missing.
//
// ONE: an expansion ladder. The 167 chapter has eleven rungs from the Gophna
// hills to Antioch. The 132 chapter has none, and a Judaea that beat Julius
// Severus has an army and a frontier and nothing telling it what to do with
// them. But the ladder cannot be the Hasmonean one, because the situation is
// inverted. Judah Maccabee expanded into a vacuum: the Seleucid house was
// eating itself and every year it got weaker. Bar Kokhba would be expanding
// against an empire at the height of its power that has temporarily lost a
// war — and Rome does not stay lost. Hadrian recalled Severus from Britain and
// spent three and a half years and enough men that he dropped the customary
// "I and the army are well" from his address to the Senate. An empire that
// pays that much to lose comes back. So every rung on THIS ladder is also a
// clock, and the cards say so.
//
// TWO: the House. The chapter already has `ev2_third_house`, which raises the
// altar on the cleared Mount, and that card is correct as far as it goes —
// it is the Ezra move, and Ezra did exactly that, setting up the altar and
// resuming the offerings in the seventh month before the foundation of the
// Temple was laid at all (Ezra 3:2–6). An altar in the open air is a
// different order of undertaking from a sanctuary. The building brings three
// problems the altar does not:
//
//   PURITY. Anyone who has touched a corpse is unclean, and the only remedy is
//   the water of the red heifer (Num. 19). Mishnah Parah 3:5 counts the heifers
//   ever prepared and gets to nine. The last was three generations ago and its
//   ashes went with the sanctuary. A priest may approach an altar in the open
//   in a state the Heikhal will not tolerate, so the altar could be raised on
//   the ruling of a Nasi and the House cannot.
//
//   SCALE. Herod's House was a Hellenistic monument and everyone knew what it
//   was for. Zerubbabel's made the old men who had seen the first one weep
//   (Ezra 3:12). Building small is a judgement on Herod; building large is
//   agreeing with him.
//
//   THE PRIESTHOOD. The revolt's own coinage names Eleazar the Priest beside
//   Simon, which is a constitutional arrangement nobody wrote down. Who
//   appoints the High Priest of a restored House is the question that broke
//   the Hasmoneans, arriving two hundred years early.
//
// TRIGGERS. Bands plus state plus ruler. `mar` opens the ladder, `gov` and
// `age` open the House — you conquer with one kind of ruler and build with
// another, and a campaign rarely gets both.
//
// Source spine: Dio LXIX.13–14; Ezra 3; Mishnah Parah 3:5; Zevachim 62a on the
// altar site; the Bar Kokhba tetradrachms with the tetrastyle facade.

const _warned = new Set();
function warnOnce(k, e) { if (_warned.has(k)) return; _warned.add(k); console.warn('[events_132ce_house] ' + k, e || ''); }
function guard(k, fn) { return function (ctx) { try { fn(ctx); } catch (e) { warnOnce('effects:' + k, e); } }; }
function safeTrigger(k, fn) { return function (ctx) { try { return !!fn(ctx); } catch (e) { warnOnce('trigger:' + k, e); return false; } }; }

function alive(ctx, tag) { const t = ctx.game.tags && ctx.game.tags[tag]; return !!(t && t.alive !== false); }
function flag(ctx, k) { return !!(ctx.game.flags && ctx.game.flags[k]); }
function holds(ctx, tag, name) {
  try { const p = ctx.prov(name); return !!p && !p.impassable && p.owner === tag && p.controller === tag; }
  catch (e) { warnOnce('holds', e); return false; }
}
function holdsAll(ctx, tag, names) { for (const n of names) if (!holds(ctx, tag, n)) return false; return true; }
function rulerAt(ctx, tag, key, min) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  const r = t && t.ruler;
  return !!r && Number(r[key] || 0) >= min;
}

function redeemed(ctx) {
  if (!alive(ctx, 'JUD')) return false;
  const t = ctx.game.tags.JUD;
  return !(t && t.overlord) && holds(ctx, 'JUD', 'Jerusalem') && flag(ctx, 'redemptionEra');
}

// 0 the hills, 1 the country, 2 the province and its coast, 3 beyond it.
function grasp(ctx) {
  if (!redeemed(ctx)) return 0;
  const n = ctx.helpers.countControlled(ctx, 'JUD', {});
  const north = holds(ctx, 'JUD', 'Sepphoris') || holds(ctx, 'JUD', 'Tiberias');
  if (n >= 16 && holdsAll(ctx, 'JUD', ['Damascus'])) return 3;
  if (n >= 11 && north) return 2;
  if (n >= 7) return 1;
  return 0;
}

export const EVENTS_132_HOUSE = [

  // ── The ladder, and the clock under it ──────────────────────────────────

  {
    id: 'ev_h_the_galilee_that_stayed_out',
    title: 'The Country That Did Not Rise',
    desc: 'The Galilee did not come out. It has been noted in this room before and '
      + 'nobody has said it plainly: while Judaea was in the caves for three and a half '
      + 'years, the north went on paying its taxes and bringing in its harvests, and the '
      + 'cities of Sepphoris and Tiberias sent no men and no money and no messages. There '
      + 'are two ways to read that and the reading determines the policy. Either the '
      + 'Galilee is a Jewish country that failed a test, in which case there is an account '
      + 'to settle. Or it is a Jewish country that made a colder assessment than Judaea '
      + 'did and turned out to be wrong, in which case it is owed nothing and neither is '
      + 'it owed anything, and the sensible thing is to take it in and never mention this '
      + 'again. The captains want the first. The sages, who lost less in the caves, are '
      + 'quietly urging the second.',
    forTag: 'JUD',
    major: true,
    minYear: 137,
    maxYear: 170,
    trigger: safeTrigger('ev_h_galilee', (ctx) => {
      if (!redeemed(ctx) || flag(ctx, 'galileeAnswered')) return false;
      return grasp(ctx) >= 1 && !flag(ctx, 'galileeKingdom');
    }),
    aiOption: 1,
    historical: 'The Galilee appears not to have joined the revolt; the fighting and the hiding complexes are Judaean. After 135 it became the centre of Jewish life in the land precisely because it had not been destroyed.',
    options: [
      {
        label: 'Settle the account. The north answers for the years it sat out',
        tooltip: 'Sepphoris and Tiberias are brought in under the captains\' terms. +2 authority, +3 conquest, Captains +30 — and the country that was not ruined is now garrisoned by the country that was: +3 unrest in Sepphoris and Tiberias (permanent), Sages −30, −8 legitimacy.',
        effects: guard('ev_h_galilee:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: -8 });
          for (const p of ['Sepphoris', 'Tiberias']) h.addProvinceModifier(ctx, p, { id: 'the_account_settled', name: 'The Account Settled', months: 240, effects: { unrest: 3 } });
          h.factionShift(ctx, 'JUD', 'captains', 30);
          h.factionShift(ctx, 'JUD', 'sages', -30);
          h.doctrine(ctx, 'authority', 2);
          h.doctrine(ctx, 'conquest', 3);
          h.setFlag(ctx, 'galileeAnswered', true);
          h.setFlag(ctx, 'galileePunished', true);
          h.chronicle(ctx, 'era', 'The north is brought into the kingdom by men who spent three years in the caves and have not been asked to forget it.');
        }),
      },
      {
        label: 'Take it in and never mention the war again',
        tooltip: 'An amnesty nobody has to sign, because the subject is simply never raised. +12 legitimacy, +3 stability, Sages +30, +10% income from an intact northern economy — and the captains are told to their faces that the years in the caves bought no standing. Captains −30.',
        effects: guard('ev_h_galilee:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 12, stability: 3 });
          h.addTagModifier(ctx, 'JUD', { id: 'the_intact_north', name: 'The Intact North', months: 240, effects: { incomeMult: 1.10 } });
          h.factionShift(ctx, 'JUD', 'sages', 30);
          h.factionShift(ctx, 'JUD', 'captains', -30);
          h.doctrine(ctx, 'authority', -1);
          h.setFlag(ctx, 'galileeAnswered', true);
          h.setFlag(ctx, 'galileeForgiven', true);
          h.chronicle(ctx, 'ruler', 'The Galilee enters the kingdom without conditions. It is the last time the war is mentioned in an official document for forty years.');
        }),
      },
    ],
  },

  {
    id: 'ev_h_the_window',
    title: 'The Difference Between Us and the Maccabees',
    desc: 'A sage who has been reading the chronicles of the first liberation has brought '
      + 'the council an argument it does not want. The Maccabees, he says, won because the '
      + 'house they beat was dying anyway — every year the Seleucids were weaker, every '
      + 'year there was another claimant, and Judah\'s generation had only to keep standing '
      + 'while an empire came apart around them. That is not this. Rome lost a war and paid '
      + 'for losing it in a way that no one alive has seen an empire pay, and Rome is not '
      + 'dying. It is embarrassed. The frontier this kingdom is now holding is being held '
      + 'against a power that will take a generation to decide whether to come back and '
      + 'has never once in three hundred years decided not to. Everything taken from here '
      + 'is taken inside a window, and the window is not a metaphor; it is roughly the '
      + 'length of the reign of whichever emperor is prepared to write off his '
      + 'predecessor\'s war.',
    forTag: 'JUD',
    major: true,
    minYear: 140,
    maxYear: 200,
    trigger: safeTrigger('ev_h_window', (ctx) => grasp(ctx) >= 2 && !flag(ctx, 'windowAnswered')),
    aiOption: 1,
    historical: 'Rome returned to every province it lost, without exception, for four hundred years. The Bar Kokhba war cost it a legion — XXII Deiotariana disappears from the record around this time — and it still came back.',
    options: [
      {
        label: 'Take everything the window allows and fortify behind it',
        tooltip: 'Expansion at speed while the frontier is soft: +25% manpower, +10% siege, +3 conquest (120 months), Captains +35. Rome is watching every mile of it: −60 Roman opinion, and the reckoning when it comes will be against a bigger and more provoking target.',
        effects: guard('ev_h_window:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'JUD', { id: 'inside_the_window', name: 'Inside the Window', months: 120, effects: { manpowerMult: 1.25, siegeBonus: 1, moraleMult: 1.05 } });
          h.factionShift(ctx, 'JUD', 'captains', 35);
          h.doctrine(ctx, 'conquest', 3);
          if (alive(ctx, 'ROM')) { const t = ctx.game.tags.ROM; if (t) { t.opinion = t.opinion || {}; t.opinion.JUD = Math.max(-200, (t.opinion.JUD || 0) - 60); } }
          h.setFlag(ctx, 'windowAnswered', true);
          h.setFlag(ctx, 'tookTheWindow', true);
          h.chronicle(ctx, 'era', 'The kingdom expands as fast as it can march, on the reasoning that whatever is held when the window shuts is what will have to be defended.');
        }),
      },
      {
        label: 'Stop at a line Rome can accept and spend the window on walls',
        tooltip: 'Growth traded for permanence: no expansion bonus, +4 stability, +15% fortification and reinforcement (240 months), +35 Roman opinion, −2 conquest. A smaller kingdom that Rome may decide is not worth the second war.',
        effects: guard('ev_h_window:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 4 });
          h.addTagModifier(ctx, 'JUD', { id: 'the_defensible_line', name: 'The Defensible Line', months: 240, effects: { reinforceMult: 1.15, hillDefBonus: 1, disciplineMult: 1.05 } });
          h.factionShift(ctx, 'JUD', 'captains', -20);
          h.factionShift(ctx, 'JUD', 'villages', 25);
          h.doctrine(ctx, 'conquest', -2);
          if (alive(ctx, 'ROM')) { const t = ctx.game.tags.ROM; if (t) { t.opinion = t.opinion || {}; t.opinion.JUD = Math.min(200, (t.opinion.JUD || 0) + 35); } }
          h.setFlag(ctx, 'windowAnswered', true);
          h.setFlag(ctx, 'spentItOnWalls', true);
          h.chronicle(ctx, 'ruler', 'The Nasi halts the advance at a line the engineers can hold and spends the rest of the window building on it.');
        }),
      },
    ],
  },

  // ── The House ───────────────────────────────────────────────────────────

  {
    id: 'ev_h_the_house_itself',
    title: 'The House Itself',
    desc: 'The altar has been standing on the cleared platform for some years now and the '
      + 'offerings go up twice daily, and the arrangement has begun to feel less like a '
      + 'beginning than like a settlement. Ezra did it this way and had the foundation '
      + 'laid within two years. It has been longer than that. The coins the revolt struck '
      + 'showed a building with four columns and a doorway — not an altar, a House — and '
      + 'they were minted and spent and are in every purse in the country, and people who '
      + 'cannot read the legend can see the picture. The masons have submitted two '
      + 'drawings. One is Herod\'s, on Herod\'s platform, at Herod\'s scale, because the '
      + 'foundations are still there and it would be perverse not to use them. The other '
      + 'is smaller, and its author has written across the bottom of it a line from Ezra '
      + 'about the old men who had seen the first House and wept aloud when they saw the '
      + 'second.',
    forTag: 'JUD',
    major: true,
    minYear: 142,
    maxYear: 210,
    trigger: safeTrigger('ev_h_house', (ctx) => {
      if (!redeemed(ctx) || flag(ctx, 'houseAnswered')) return false;
      if (!flag(ctx, 'altarRaised')) return false;
      // Building is a governing act and it needs a reign long enough to finish.
      return grasp(ctx) >= 1 && (rulerAt(ctx, 'JUD', 'gov', 4) || rulerAt(ctx, 'JUD', 'age', 50));
    }),
    aiOption: 0,
    historical: 'The revolt\'s silver shows a tetrastyle facade with what is usually read as the Ark inside it. Whether Bar Kokhba ever held Jerusalem is disputed — no coins of his have been found in the city itself.',
    options: [
      {
        label: 'Build it as Herod built it. The foundations are there',
        tooltip: 'The great House, on the great platform. Costs 200 talents and twenty years (−20% income, 240 months); +30 legitimacy, +4 stability, +0.3 legitimacy a month permanently, and every Jew alive knows within two years. Sages divided (−10); the kingdom has agreed with Herod about something.',
        effects: guard('ev_h_house:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 30, stability: 4, treasury: -200 });
          h.addTagModifier(ctx, 'JUD', { id: 'the_great_house', name: 'The Great House', months: 240, effects: { incomeMult: 0.80, legitimacyAdd: 0.3 } });
          h.addProvinceModifier(ctx, 'Jerusalem', { id: 'the_house_rebuilt', name: 'The House Rebuilt', months: -1, effects: { unrest: -2, incomeMult: 1.15 } });
          h.factionShift(ctx, 'JUD', 'sages', -10);
          h.factionShift(ctx, 'JUD', 'villages', 30);
          h.doctrine(ctx, 'zeal', 3);
          h.doctrine(ctx, 'authority', 2);
          h.setFlag(ctx, 'houseAnswered', true);
          h.setFlag(ctx, 'houseBuiltGreat', true);
          h.chronicle(ctx, 'era', 'The Third House rises on Herod\'s platform at Herod\'s scale. The men who cut the stones are the grandsons of the men who carried the last ones away.');
        }),
      },
      {
        label: 'Build it as Zerubbabel built it. Small, and enough',
        tooltip: 'A working sanctuary rather than a monument. 60 talents and eight years (−8% income, 96 months); +18 legitimacy, +2 stability, +25 Sages, +2 zeal — and a permanent argument, conducted in every generation, about whether this is the House the coins promised. −5 legitimacy every time it is raised.',
        effects: guard('ev_h_house:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 18, stability: 2, treasury: -60 });
          h.addTagModifier(ctx, 'JUD', { id: 'the_small_house', name: 'The Small House', months: 96, effects: { incomeMult: 0.92 } });
          h.addProvinceModifier(ctx, 'Jerusalem', { id: 'the_house_rebuilt', name: 'The House Rebuilt', months: -1, effects: { unrest: -1, incomeMult: 1.08 } });
          h.factionShift(ctx, 'JUD', 'sages', 25);
          h.doctrine(ctx, 'zeal', 2);
          h.setFlag(ctx, 'houseAnswered', true);
          h.setFlag(ctx, 'houseBuiltSmall', true);
          h.chronicle(ctx, 'era', 'The Third House is finished in eight years and is smaller than the second. The dedication is well attended and the old arguments start the following week.');
        }),
      },
      {
        label: 'The altar suffices. A House needs a prophet and none has come',
        tooltip: 'The platform keeps its altar and nothing else. No cost, +2 stability, +20 Sages — and a promise on the currency that the kingdom has now visibly declined to keep: −15 legitimacy, Villages −25, and the question returns in every reign.',
        effects: guard('ev_h_house:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 2, legitimacy: -15 });
          h.factionShift(ctx, 'JUD', 'sages', 20);
          h.factionShift(ctx, 'JUD', 'villages', -25);
          h.doctrine(ctx, 'zeal', -1);
          h.setFlag(ctx, 'houseAnswered', true);
          h.setFlag(ctx, 'houseDeclined', true);
          h.chronicle(ctx, 'ruler', 'The council rules that the altar suffices until a prophet says otherwise. The coins in every purse in the country go on showing a building that is not there.');
        }),
      },
    ],
  },

  {
    id: 'ev_h_the_tenth_heifer',
    title: 'The Tenth Heifer',
    desc: 'The problem was always going to arrive and the priests have brought it in '
      + 'writing because nobody wanted to be the one who said it aloud. Everyone in this '
      + 'country has touched a corpse or stood under the same roof as one, which after the '
      + 'war is not a figure of speech, and there is exactly one remedy for it: water '
      + 'mixed with the ashes of a red heifer burnt outside the camp. There are no ashes. '
      + 'The last of them went with the House. Nine heifers have been prepared since Moses '
      + 'by the reckoning the sages keep, and a tenth has to be found — a beast without '
      + 'blemish, entirely red, that has never borne a yoke — and then burnt by a priest '
      + 'who is himself clean, which is the part of the sentence that has the council '
      + 'staring at the table. An altar in the open air is forgiving of this. A sanctuary '
      + 'is not. Every stone now going up on the Mount is going up towards a building that '
      + 'no living man is permitted to enter.',
    forTag: 'JUD',
    major: true,
    minYear: 145,
    maxYear: 215,
    trigger: safeTrigger('ev_h_heifer', (ctx) => {
      if (!redeemed(ctx) || flag(ctx, 'heiferAnswered')) return false;
      return flag(ctx, 'houseBuiltGreat') || flag(ctx, 'houseBuiltSmall');
    }),
    aiOption: 0,
    historical: 'Mishnah Parah 3:5 counts nine heifers from Moses to the destruction and says the tenth belongs to the Messiah. The ashes were the practical precondition of the entire sacrificial system and they did not survive 70 CE.',
    options: [
      {
        label: 'Search for the heifer, and keep searching',
        tooltip: 'Herds bought and bred across the kingdom and beyond it for as long as it takes. 80 talents and −6% income (permanent); the search is a standing state undertaking. +15 legitimacy, Priests and Sages both +25, +2 zeal — and until it succeeds, the Heikhal stands finished and shut.',
        effects: guard('ev_h_heifer:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 15, treasury: -80 });
          h.addTagModifier(ctx, 'JUD', { id: 'the_search_for_the_heifer', name: 'The Search for the Heifer', months: -1, effects: { incomeMult: 0.94, legitimacyAdd: 0.15 } });
          h.factionShift(ctx, 'JUD', 'sages', 25);
          h.doctrine(ctx, 'zeal', 2);
          h.setFlag(ctx, 'heiferAnswered', true);
          h.setFlag(ctx, 'heiferSought', true);
          h.chronicle(ctx, 'era', 'The kingdom begins buying red cattle. It will go on buying them, in every reign, for as long as there is a kingdom to do it.');
        }),
      },
      {
        label: 'Rule around it. The court has the authority and this is what authority is for',
        tooltip: 'The Sanhedrin legislates a purification the Torah does not name, on the reasoning that a shut sanctuary serves nobody. +3 stability, the House opens, +20% income from the pilgrim traffic (240 months) — and a ruling that a large minority will not accept: Sages −35, +2 unrest everywhere, −10 legitimacy, and a schism the kingdom now carries.',
        effects: guard('ev_h_heifer:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 3, legitimacy: -10 });
          h.addTagModifier(ctx, 'JUD', { id: 'the_house_opened', name: 'The House Opened', months: 240, effects: { incomeMult: 1.20, unrestAll: 2 } });
          h.factionShift(ctx, 'JUD', 'sages', -35);
          h.factionShift(ctx, 'JUD', 'villages', 20);
          h.doctrine(ctx, 'authority', 3);
          h.setFlag(ctx, 'heiferAnswered', true);
          h.setFlag(ctx, 'heiferLegislated', true);
          h.chronicle(ctx, 'era', 'The court rules a way into the sanctuary. The offerings resume, the pilgrims come, and a party forms that will not eat of them.');
        }),
      },
    ],
  },

  {
    id: 'ev_h_who_serves',
    title: 'Eleazar the Priest',
    desc: 'The revolt\'s own money settled this and nobody noticed at the time. On one '
      + 'face, Simon, Prince of Israel. On the other, Eleazar the Priest. Two names, two '
      + 'offices, no explanation of how they relate, struck in silver and spent for three '
      + 'years by people who had other things on their minds. There is now a House, and it '
      + 'requires a High Priest, and the question of who appoints him has become the only '
      + 'item on the agenda. The Nasi\'s clerks have prepared a brief showing that the '
      + 'crown has appointed since Herod and that this is settled practice. The priests '
      + 'have prepared a brief showing what happened the last time a ruling house held both '
      + 'offices, which ran from Jonathan to Aristobulus and finished with two brothers '
      + 'asking Pompey to arbitrate. Both briefs are correct.',
    forTag: 'JUD',
    major: true,
    minYear: 148,
    maxYear: 220,
    trigger: safeTrigger('ev_h_who_serves', (ctx) => {
      if (!redeemed(ctx) || flag(ctx, 'priesthoodSettled')) return false;
      return flag(ctx, 'houseBuiltGreat') || flag(ctx, 'houseBuiltSmall');
    }),
    aiOption: 1,
    historical: 'The coinage of the revolt names Eleazar the Priest beside Simon. What the arrangement was, and whether it survived the first year, is unknown.',
    options: [
      {
        label: 'The Nasi appoints, as the crown has appointed since Herod',
        tooltip: 'One authority, the Hasmonean answer. +3 stability, +2 authority, +10% income — and the same fault line that produced the civil war of 67, opened deliberately, with the parties already named. Sages −30, +1 unrest everywhere (permanent).',
        effects: guard('ev_h_serves:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 3 });
          h.addTagModifier(ctx, 'JUD', { id: 'the_crown_appoints', name: 'The Crown Appoints', months: -1, effects: { incomeMult: 1.10, unrestAll: 1 } });
          h.factionShift(ctx, 'JUD', 'sages', -30);
          h.doctrine(ctx, 'authority', 2);
          h.setFlag(ctx, 'priesthoodSettled', true);
          h.setFlag(ctx, 'crownAppoints', true);
          h.chronicle(ctx, 'ruler', 'The Nasi takes the appointment of the High Priest. The briefs are filed and the priests are thanked for theirs.');
        }),
      },
      {
        label: 'The courses choose their own, as the coinage implied',
        tooltip: 'Two offices, separately held, as the silver said. +15 legitimacy, +35 Sages, +2 stability, −1 authority — and a High Priest the crown did not choose and cannot remove, in the richest building in the kingdom.',
        effects: guard('ev_h_serves:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 15, stability: 2 });
          h.factionShift(ctx, 'JUD', 'sages', 35);
          h.factionShift(ctx, 'JUD', 'captains', -15);
          h.doctrine(ctx, 'authority', -1);
          h.setFlag(ctx, 'priesthoodSettled', true);
          h.setFlag(ctx, 'coursesChoose', true);
          h.chronicle(ctx, 'era', 'The priestly courses elect their own High Priest for the first time since the Hasmoneans took the office by conquest. Simon and Eleazar are both on the coins and both, it turns out, meant it.');
        }),
      },
    ],
  },

];
