// Judaea Universalis — after the Great Revolt, 98–130 CE (SPEC §122).
// Content package. Zero imports; all effects run through ctx.helpers at
// runtime. Concatenated onto EVENTS_66 by the era registry.
//
// The 66 chapter's last card is `ev_domitian_dies` in 96, and then the same
// silence §121 found at the edge of 167: no end date, so the clock runs on with
// nothing in it. What makes this edge worse than that one is that the 66
// chapter has TWO roads and both of them arrive at 96 with unfinished business
// — so a single continuation would have been wrong twice over.
//
// The road where the House fell ends at Yavneh, with a nation that has just
// discovered it can survive without a Temple and does not yet know for how
// long. The road where the House stood (SPEC §112 made it reachable at all)
// ends with a sovereign Jewish kingdom, a Roman frontier, and a Parthian
// border thirty years before the largest war Rome ever fought on it.
//
// Both roads run into the same three decades, and those decades contain the
// one event that decides everything after them: Trajan's Parthian war of
// 114–117, and the rising that broke it. The diaspora revolt — Cyrene, Cyprus,
// Egypt, Mesopotamia — was retired as a playable chapter in v5.1 for good
// reasons (SPEC §50): it barely touched Judaea proper and wore a frame it never
// fit. It fits perfectly here, because here it is not the chapter. It is the
// question each road has to answer, and the two roads answer it from opposite
// ends of the same war:
//
//   The fallen road answers it as a subject people whose surviving authority
//   is a school. Yavneh has spent thirty years arguing that survival is the
//   commandment; now Cyrene is burning and the letters are arriving.
//
//   The standing road answers it as a state on the invasion route. Trajan's
//   army goes east past a Jewish kingdom's border, and its supply line goes
//   back the same way.
//
// Source spine: Cassius Dio LXVIII for Trajan's campaign and the rising behind
// it; Eusebius, HE IV.2 for Cyrene and Cyprus; the Oxyrhynchus and Apollonopolis
// papyri for what the Egyptian revolt did to the countryside; Dio LXIX and the
// standard reconstruction for Hadrian's abandonment of Mesopotamia and the
// founding of Aelia.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_66ce_after] ' + key, e || '');
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
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false);
}

function flag(ctx, key) {
  return !!(ctx.game.flags && ctx.game.flags[key]);
}

function warBetween(ctx, a, b) {
  for (const w of (ctx.game && ctx.game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(a) !== -1 && all.indexOf(b) !== -1) return true;
  }
  return false;
}

function setOpinion(ctx, a, b, val) {
  const t = ctx.game.tags && ctx.game.tags[a];
  if (!t) return;
  if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
  t.opinion[b] = Math.max(-200, Math.min(200, val));
}

// The two roads out of the chapter, as SPEC §119 records them. The marker is
// the road; live geography is not re-tested, because a road entered in 70 CE is
// still the road a player is on in 115 whatever the map has done since.
function houseFell(ctx) {
  return flag(ctx, 'templeBurned') && !flag(ctx, 'secondKingdom');
}
function houseStood(ctx) {
  return flag(ctx, 'secondKingdom') && !flag(ctx, 'templeBurned') && alive(ctx, 'JUD');
}

// Where the diaspora burned, in the map's own names.
const DIASPORA_FIRE = ['Cyrene', 'Marmarica', 'Alexandria', 'Leontopolis',
  'Oxyrhynchus', 'Nehardea', 'Babylon', 'Seleucia-Ctesiphon'];

function stir(ctx, tag, names, mod) {
  let touched = 0;
  for (const n of names) {
    const p = ctx.prov && ctx.prov(n);
    if (!p || p.impassable) continue;
    if (tag && p.owner !== tag) continue;
    ctx.helpers.addProvinceModifier(ctx, n, mod);
    touched++;
  }
  return touched;
}

export const EVENTS_66_AFTER = [

  // ═══ THE ROAD WHERE THE HOUSE FELL ═══════════════════════════════════════

  {
    id: 'ev_a_the_school_and_the_century',
    title: 'A School, and a Century to Fill',
    worldLabel: 'Yavneh outlives the generation that founded it',
    desc: 'The men who argued the academy into existence are dying, and what they '
      + 'leave behind is stranger than any of them planned. There is no Temple, no '
      + 'state, no army and no priest whose office means anything outside a memory — '
      + 'and there is a functioning national institution with a curriculum, a court, '
      + 'a calendar and correspondents in six provinces, run by men whose only claim '
      + 'to authority is that they are right about the text. Nothing in the ancient '
      + 'world works like this. The Romans, who understand temples and understand '
      + 'kings, have filed the arrangement under "priests" because there is no other '
      + 'box, and are collecting the half-shekel as a tax to Jupiter and thinking no '
      + 'more about it. The interesting question is not whether the school survives '
      + 'Rome. It is what the school decides the nation is FOR, now that the answer '
      + 'is no longer "to hold the country".',
    forTag: 'both',
    decider: 'JUD',
    date: { y: 100, m: 4 },
    world: true,
    major: true,
    when: safeTrigger('ev_a_the_school_and_the_century:when', (ctx) => houseFell(ctx)),
    aiOption: 0,
    historical: 'Yavneh became the centre and the patriarchate grew out of it; the Temple was not rebuilt and the argument about what came instead is still running.',
    options: [
      {
        label: 'The nation is the Law, and the Law can be carried',
        tooltip: 'The academy settles it: portability over restoration. −1 zeal, +2 stability, and "The Nation Is the Law" permanently (−1 unrest in every Jewish province anywhere on the map, +10% income as communities that expected to be dissolved instead organise) — but the claim to the land becomes a prayer rather than a programme, and a later rising will find the schools against it.',
        effects: guard('ev_a_the_school_and_the_century:0', (ctx) => {
          const h = ctx.helpers;
          const me = alive(ctx, 'JUD') ? 'JUD' : null;
          if (me) {
            h.adjust(ctx, me, { stability: 2 });
            h.addTagModifier(ctx, me, {
              id: 'the_nation_is_the_law', name: 'The Nation Is the Law', months: -1,
              effects: { unrestAll: -1, incomeMult: 1.1 },
            });
            h.doctrine(ctx, 'zeal', -1);
          }
          h.setFlag(ctx, 'nationIsTheLaw', true);
          h.chronicle(ctx, 'era', 'Yavneh settles what the nation is for: the Law, which can be carried, rather than the land, which cannot. The communities that expected to be dissolved organise instead.');
        }),
      },
      {
        label: 'The school keeps the accounts of a debt, not a memory',
        tooltip: 'The curriculum is built around restoration: every tractate on sacrifice, tithe and Temple service taught as law in abeyance rather than history. +2 zeal, +25 legitimacy, "The Debt Is Kept" permanently (+8% morale everywhere, +0.5 unrest in Jewish provinces Rome holds) — the nation stays mobilisable, which is precisely what Rome will eventually notice.',
        effects: guard('ev_a_the_school_and_the_century:1', (ctx) => {
          const h = ctx.helpers;
          const me = alive(ctx, 'JUD') ? 'JUD' : null;
          if (me) {
            h.adjust(ctx, me, { legitimacy: 25 });
            h.addTagModifier(ctx, me, {
              id: 'the_debt_is_kept', name: 'The Debt Is Kept', months: -1,
              effects: { moraleMult: 1.08 },
            });
            h.doctrine(ctx, 'zeal', 2);
          }
          if (alive(ctx, 'ROM')) {
            h.addTagModifier(ctx, 'ROM', {
              id: 'a_mobilisable_nation', name: 'A Mobilisable Nation', months: -1,
              effects: { unrestAll: 0.3 },
            });
          }
          h.setFlag(ctx, 'theDebtIsKept', true);
          h.chronicle(ctx, 'era', 'The academy teaches the orders of sacrifice as law in abeyance rather than as history; the nation stays mobilisable, which is precisely what Rome will eventually notice.');
        }),
      },
    ],
  },

  {
    id: 'ev_a_the_east_is_burning',
    title: 'The East Is Burning',
    worldLabel: 'Cyrene, Cyprus and Egypt rise behind Trajan\'s army',
    desc: 'Trajan is across the Tigris and the whole of the Jewish East has risen '
      + 'behind him. It starts in Cyrene, where the reports are of a slaughter so '
      + 'complete the province has to be resettled afterwards; it takes Cyprus, where '
      + 'Salamis is destroyed and after which no Jew may set foot on the island on '
      + 'pain of death, shipwreck no excuse; it takes Egypt, where the countryside '
      + 'fights for two years and the papyri record villages arguing about grain '
      + 'levies for a war nobody named. In Judaea nothing has happened yet. Letters '
      + 'are arriving daily at the academy asking whether it should, and they are '
      + 'addressed to men who have spent thirty years teaching that the nation '
      + 'survives by not doing this. What the school says now will be quoted for a '
      + 'thousand years, by people who were not there and did not have to decide.',
    forTag: 'both',
    decider: 'JUD',
    date: { y: 116, m: 5 },
    world: true,
    major: true,
    minYear: 115,
    maxYear: 122,
    when: safeTrigger('ev_a_the_east_is_burning:when', (ctx) => houseFell(ctx)),
    aiOption: 1,
    historical: 'Judaea did not rise in 115–117. The diaspora communities that did were destroyed, and the centre of Jewish life shifted decisively to the land and to Babylonia.',
    options: [
      {
        label: 'Answer that the hour has come, and rise',
        tooltip: 'Judaea joins the rising: war with Rome, +14,000 manpower, +3 zeal and "The Hour Has Come" (+12% morale for 60 months) — and the diaspora fights with a homeland behind it for the first time since Titus. Rome answers with the army that has just taken Ctesiphon. Whatever happens, the schools that opposed this are broken by it (−30 Sages approval, permanent).',
        effects: guard('ev_a_the_east_is_burning:0', (ctx) => {
          const h = ctx.helpers;
          const me = alive(ctx, 'JUD') ? 'JUD' : null;
          if (me) {
            h.adjust(ctx, me, { manpower: 14000, legitimacy: 15 });
            h.addTagModifier(ctx, me, {
              id: 'the_hour_has_come', name: 'The Hour Has Come', months: 60,
              effects: { moraleMult: 1.12 },
            });
            h.doctrine(ctx, 'zeal', 3);
            try { h.factionShift(ctx, me, 'sages', -30); } catch (e) {}
            if (alive(ctx, 'ROM') && !warBetween(ctx, me, 'ROM')) {
              h.declareWar(ctx, me, 'ROM', 'The Rising of the East');
            }
          }
          stir(ctx, null, DIASPORA_FIRE, {
            id: 'the_east_burns', name: 'The East Burns', months: 96, effects: { unrest: 3 },
          });
          h.setFlag(ctx, 'joinedTheRising', true);
          h.chronicle(ctx, 'war', 'Judaea rises with the diaspora while Trajan is across the Tigris; for the first time since Titus the communities of the East fight with a homeland behind them.');
        }),
      },
      {
        label: 'Answer that the hour has not come, and be hated for it',
        tooltip: 'The academy forbids it in writing and the letters go out that week. The land is spared what Cyrene is not: +2 stability, Rome\'s opinion +50, and "The Land Was Spared" permanently (−1 unrest in Jewish provinces, +12% income) — but the diaspora burns without it (+3 unrest in Cyrene, Cyprus, Egypt and Babylonia for 96 months), the Sages take −20 approval from a community that will remember, and the centre of Jewish life shifts to the land and to Babylonia for good.',
        effects: guard('ev_a_the_east_is_burning:1', (ctx) => {
          const h = ctx.helpers;
          const me = alive(ctx, 'JUD') ? 'JUD' : null;
          if (me) {
            h.adjust(ctx, me, { stability: 2 });
            h.addTagModifier(ctx, me, {
              id: 'the_land_was_spared', name: 'The Land Was Spared', months: -1,
              effects: { unrestAll: -1, incomeMult: 1.12 },
            });
            try { h.factionShift(ctx, me, 'sages', -20); } catch (e) {}
            if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', me, 50);
          }
          stir(ctx, null, DIASPORA_FIRE, {
            id: 'burned_without_us', name: 'Burned Without Us', months: 96, effects: { unrest: 3 },
          });
          h.setFlag(ctx, 'refusedTheRising', true);
          h.chronicle(ctx, 'era', 'The academy forbids the rising in writing and the letters go out that week. The land is spared what Cyrene is not, and the communities that burned will remember who answered them and how.');
        }),
      },
    ],
  },

  {
    id: 'ev_a_a_city_with_another_name',
    title: 'A City With Another Name',
    worldLabel: 'Aelia Capitolina is surveyed on the ruins',
    desc: 'The emperor comes east on his endless tour of the provinces, sees the ruin '
      + 'that has been sitting in the middle of Judaea for sixty years, and does what '
      + 'he does everywhere: orders a city. It will be laid out on the Roman grid with '
      + 'a forum where the markets were, a temple to Capitoline Jupiter on the '
      + 'platform, and a name compounded from his own family and the god\'s. He does '
      + 'not appear to understand that this is not urban renewal. Nobody in his party '
      + 'understands it either, because the men who could have explained it are '
      + 'exactly the men nobody in his party talks to. The surveyors are already at '
      + 'work. Everything that happens in this country for the next twenty years '
      + 'happens because of what is being measured out this summer.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 130, m: 6 },
    world: true,
    major: true,
    when: safeTrigger('ev_a_a_city_with_another_name:when', (ctx) => houseFell(ctx)),
    aiOption: 0,
    historical: 'Hadrian founded Aelia Capitolina and the revolt of Bar Kokhba followed within two years.',
    options: [
      {
        label: 'Let the surveyors work, and count what it costs later',
        tooltip: 'The chapter closes on the eve of the next war: every Jewish province Rome holds takes +2 unrest permanently ("The Surveyors"), Rome +10 legitimacy and a colony, and the record notes what this chapter decided — whether the school taught the Law as portable or as a debt, and whether Judaea rose with the East or refused it. A nation that kept the debt and refused the rising is the most dangerous combination on the board.',
        effects: guard('ev_a_a_city_with_another_name:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: 10 });
          const debt = flag(ctx, 'theDebtIsKept');
          const refused = flag(ctx, 'refusedTheRising');
          for (const n of ['Jerusalem', 'Lydda', 'Emmaus', 'Jericho', 'Hebron']) {
            const p = ctx.prov && ctx.prov(n);
            if (!p || p.impassable) continue;
            h.addProvinceModifier(ctx, n, {
              id: 'the_surveyors', name: 'The Surveyors', months: -1,
              effects: { unrest: debt && refused ? 3 : 2 },
            });
          }
          h.setFlag(ctx, 'aeliaSurveyed', true);
          h.chronicle(ctx, 'era', debt && refused
            ? 'The surveyors lay out Aelia Capitolina in a country whose schools have taught restoration as law in abeyance for thirty years and whose fighting generation was told to wait. It has been waiting.'
            : 'The surveyors lay out Aelia Capitolina on the ruins, and everything this country does for the next twenty years follows from what is measured out this summer.');
        }),
      },
    ],
  },

  // ═══ THE ROAD WHERE THE HOUSE STOOD ══════════════════════════════════════

  {
    id: 'ev_b_the_soldier_emperor',
    title: 'The Soldier Emperor',
    worldLabel: 'Trajan intends to finish what Crassus started',
    desc: 'The new emperor is a Spaniard, a soldier, and the first man in a century to '
      + 'hold the office who genuinely wants the East rather than merely wanting it '
      + 'quiet. He has said, to people who write things down, that he regrets being '
      + 'too old to do what Alexander did. What that means in practice is that the '
      + 'Parthian frontier is about to stop being a frontier and start being a '
      + 'campaign, and every kingdom along it is being visited by staff officers '
      + 'asking friendly questions about roads, granaries and fords. Judaea has all '
      + 'three, and a treaty, and the officers are very interested in the treaty. '
      + 'The kingdom that came through the Great Revolt with its house standing is '
      + 'about to discover the price of being useful to a man in a hurry.',
    forTag: 'both',
    decider: 'JUD',
    date: { y: 98, m: 3 },
    world: true,
    major: true,
    when: safeTrigger('ev_b_the_soldier_emperor:when', (ctx) => houseStood(ctx)),
    aiOption: 0,
    historical: 'There was no Jewish kingdom for the staff officers to visit. Trajan took Armenia, Mesopotamia and Ctesiphon, and lost all three to a rising behind him.',
    options: [
      {
        label: 'Answer the questions and build the granaries',
        tooltip: 'Judaea becomes part of the eastern establishment: −200 treasury on roads and stores, but +350 in Roman contracts, Rome\'s opinion +55, and "The Road to the East" permanently (+12% income, +1 stability). The kingdom is now inside Rome\'s war planning, which is protection and is also a commitment nobody has asked it to sign.',
        effects: guard('ev_b_the_soldier_emperor:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: 150, stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_road_to_the_east', name: 'The Road to the East', months: -1,
            effects: { incomeMult: 1.12 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', 'JUD', 55);
          h.setFlag(ctx, 'insideThePlanning', true);
          h.chronicle(ctx, 'era', 'The staff officers get their roads, their granaries and their fords; Judaea is inside Rome\'s eastern war planning, which is protection and is also a commitment nobody asked it to sign.');
        }),
      },
      {
        label: 'Answer politely and build nothing',
        tooltip: 'The questions are answered and the works are not undertaken: +15 legitimacy, +1 authority, no expense — and Rome\'s opinion −25 with "Not On the Road" permanently (−4% income as the contracts go to Nabataea instead). A kingdom that is not on the supply route is also not on the retreat route, which will matter more than anyone currently thinks.',
        effects: guard('ev_b_the_soldier_emperor:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 15 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'not_on_the_road', name: 'Not On the Road', months: -1,
            effects: { incomeMult: 0.96 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', 'JUD', -25);
          h.doctrine(ctx, 'authority', 1);
          h.setFlag(ctx, 'notOnTheRoad', true);
          h.chronicle(ctx, 'era', 'The staff officers are answered politely and the granaries are not built; the contracts go to Nabataea, and a kingdom off the supply route is also off the retreat route.');
        }),
      },
    ],
  },

  {
    id: 'ev_b_the_flank_of_the_war',
    title: 'The Flank of the War',
    worldLabel: 'Trajan takes Ctesiphon and the East rises behind him',
    desc: 'It has gone exactly as the staff papers said until the moment it stopped '
      + 'going that way at all. Armenia is annexed, Mesopotamia is a province, '
      + 'Ctesiphon has fallen and the emperor has been down to the Persian Gulf to '
      + 'look at a ship sailing for India and say aloud that he wishes he were younger. '
      + 'And behind him the whole Jewish East has risen — Cyrene first and worst, then '
      + 'Cyprus, then Egypt, then the new province itself, with the Roman garrison of '
      + 'Mesopotamia fighting for its life among communities that greeted it as '
      + 'liberators eighteen months ago. Judaea sits on the road between the emperor '
      + 'and his empire. Nobody in the council needs the map explained. Three men have '
      + 'already said the word Parthia out loud and one of them is the high priest.',
    forTag: 'both',
    decider: 'JUD',
    date: { y: 116, m: 6 },
    world: true,
    major: true,
    minYear: 115,
    maxYear: 122,
    when: safeTrigger('ev_b_the_flank_of_the_war:when', (ctx) => houseStood(ctx)),
    aiOption: 0,
    historical: 'There was no kingdom on that road. The rising broke Trajan\'s campaign anyway, and Hadrian gave up everything beyond the Euphrates within a year of taking the purple.',
    options: [
      {
        label: 'Hold the road open and let the army come home through us',
        tooltip: 'Judaea keeps the corridor while the East burns on both sides of it: −8,000 manpower and −250 treasury policing it, but Rome\'s opinion to +90, "The Road Held Open" permanently (+15% income, +1 stability), and a debt the empire has to acknowledge in public. The diaspora communities that rose are not helped, and they know exactly who did not help them (+2 unrest in Jewish provinces abroad, permanent).',
        effects: guard('ev_b_the_flank_of_the_war:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { manpower: -8000, treasury: -250, stability: 1, legitimacy: 10 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_road_held_open', name: 'The Road Held Open', months: -1,
            effects: { incomeMult: 1.15 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', 'JUD', 90);
          stir(ctx, null, DIASPORA_FIRE, {
            id: 'they_know_who_did_not_come', name: 'They Know Who Did Not Come',
            months: -1, effects: { unrest: 2 },
          });
          h.setFlag(ctx, 'roadHeldOpen', true);
          h.chronicle(ctx, 'war', 'Judaea holds the corridor open while the East burns on both sides of it; the army comes home through a Jewish kingdom, and the communities that rose know exactly who did not come.');
        }),
      },
      {
        label: 'Close the road and let the war end itself',
        tooltip: 'Neutrality with teeth: the corridor is shut to both sides and the kingdom sits on it. +20 legitimacy, +2 authority, +10,000 manpower mobilised on the border — and both empires cool 40, because a neutral on your retreat route is a threat by geometry whatever it intends. No war, and no friends, and the strongest bargaining position anyone in this chapter has ever held.',
        effects: guard('ev_b_the_flank_of_the_war:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 20, manpower: 10000 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_road_is_shut', name: 'The Road Is Shut', months: -1,
            effects: { moraleMult: 1.06 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', 'JUD', -40);
          if (alive(ctx, 'PAR')) setOpinion(ctx, 'PAR', 'JUD', -40);
          h.doctrine(ctx, 'authority', 2);
          h.setFlag(ctx, 'roadShut', true);
          h.chronicle(ctx, 'era', 'The corridor is closed to both sides and the kingdom sits on it: a neutral on your retreat route is a threat by geometry whatever it intends.');
        }),
      },
      {
        label: 'Rise with them, and take the road for Ctesiphon',
        tooltip: 'The kingdom joins the rising with the emperor on the wrong side of it: war with Rome, +16,000 manpower, +3 zeal, "With the Whole East" (+15% morale for 72 months) and Parthia\'s opinion to +80. Trajan\'s army has to come back through a hostile kingdom. This is the largest thing any Jewish state does in the chapter and it is being decided by men who can all remember Titus.',
        effects: guard('ev_b_the_flank_of_the_war:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { manpower: 16000, legitimacy: 20 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'with_the_whole_east', name: 'With the Whole East', months: 72,
            effects: { moraleMult: 1.15 },
          });
          h.doctrine(ctx, 'zeal', 3);
          if (alive(ctx, 'PAR')) setOpinion(ctx, 'PAR', 'JUD', 80);
          if (alive(ctx, 'ROM')) {
            setOpinion(ctx, 'ROM', 'JUD', -150);
            if (!warBetween(ctx, 'JUD', 'ROM')) {
              h.declareWar(ctx, 'JUD', 'ROM', 'The Rising of the Whole East');
            }
          }
          stir(ctx, null, DIASPORA_FIRE, {
            id: 'the_whole_east', name: 'The Whole East', months: 96, effects: { unrest: 3 },
          });
          h.setFlag(ctx, 'roseWithTheEast', true);
          h.chronicle(ctx, 'war', 'Judaea rises with the whole East while Trajan is at the Gulf; the army that took Ctesiphon has to come home through a hostile kingdom.');
        }),
      },
    ],
  },

  {
    id: 'ev_b_no_aelia',
    title: 'No City of Another Name',
    worldLabel: 'The year Aelia Capitolina was founded, in a history without it',
    desc: 'The emperor is touring the provinces and founding cities, which is what he '
      + 'does — Hadrianopolis, Hadrianoutherae, Antinoopolis, a dozen more, each with '
      + 'a grid and a forum and his family name on the gate. In the history that did '
      + 'not happen here he founded one on a ruin in the middle of Judaea, put a '
      + 'temple to Capitoline Jupiter on the platform, called it Aelia Capitolina, and '
      + 'got a war that cost him a legion and depopulated a province. There is no ruin '
      + 'here to found it on. There is a working city with a functioning cult, a court '
      + 'that receives ambassadors, and a treaty; the imperial party is received, '
      + 'shown the sights, and given a very good dinner. The emperor admires the '
      + 'masonry. Somebody in his staff makes a note about the water supply, which '
      + 'they will act on, and which will be the whole of the Roman contribution to '
      + 'this city for a century.',
    forTag: 'both',
    decider: 'JUD',
    date: { y: 130, m: 6 },
    world: true,
    major: true,
    when: safeTrigger('ev_b_no_aelia:when', (ctx) => houseStood(ctx)),
    aiOption: 0,
    historical: 'Hadrian founded Aelia Capitolina on the ruins in 130 and Bar Kokhba followed within two years.',
    options: [
      {
        label: 'Receive the emperor, and let him admire the masonry',
        tooltip: 'The chapter closes with the city Jewish and the century open: +30 legitimacy, +1 stability, "The City That Was Not Renamed" permanently (+12% income, −1 unrest everywhere, +0.1 legitimacy a month). The record reads back what the road did with Trajan\'s war — held the corridor, shut it, or rose — and prices the settlement accordingly.',
        effects: guard('ev_b_no_aelia:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 30, stability: 1 });
          const held = flag(ctx, 'roadHeldOpen');
          const rose = flag(ctx, 'roseWithTheEast');
          h.addTagModifier(ctx, 'JUD', {
            id: 'city_not_renamed', name: 'The City That Was Not Renamed', months: -1,
            effects: {
              incomeMult: held ? 1.16 : 1.12,
              unrestAll: rose ? -0.5 : -1,
              legitimacyAdd: 0.1,
            },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', 'JUD', held ? 80 : (rose ? -60 : 10));
          h.setFlag(ctx, 'noAelia', true);
          h.chronicle(ctx, 'era', rose
            ? 'The emperor tours a Jerusalem that fought his predecessor and is still Jewish; there is no ruin to found a colony on, and the staff make a note about the water supply.'
            : 'The emperor is received in a working city with a functioning cult and a court that keeps ambassadors; he admires the masonry, and the only Roman mark on Jerusalem this century is an improved aqueduct.');
        }),
      },
    ],
  },
];
