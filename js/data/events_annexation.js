// Judaea Universalis — annexation, shared by every antique bookmark.
// Content package: zero imports; keyed on the player tag like the generic pool.
//
// The engine already annexes. `p.integration` climbs in three steps of 0.34
// under an integration program, communal unrest fades to match, and at 1.0 the
// owner writes its own name on the map. What it does silently is the only part
// anyone would remember: a Jewish state absorbing a town that is not Jewish has
// to decide what the people in it now are, and the engine currently emits a
// notification saying the province is 34% integrated.
//
// That decision is not invented for this game. It was made, twice, and both
// times by a Hasmonean: John Hyrcanus took Idumea and gave its people the
// choice of circumcision or the road (Josephus, Ant. XIII.257–8), and
// Aristobulus I did the same to the Itureans a generation later (XIII.318–9).
// It is the only large-scale forced conversion in Jewish history and it is the
// direct cause of the single most consequential fact in the next two hundred
// years, which is that the man who ruled Judaea from 37 to 4 BCE was the
// grandson of a converted Idumean. The policy worked, in the sense that Idumea
// became Jewish and stayed Jewish through the destruction. It also produced
// Herod. Both of those are the same fact and this package refuses to separate
// them.
//
// STRUCTURE. One card asks the question the first time it matters and sets a
// standing policy; the state does not re-litigate it at every town. Two later
// cards collect on it — one when the policy has run for two generations, one
// when the realm has grown past the point where the policy still describes it.
//
// TRIGGERS. No dates anywhere in this file. Conditions and bands only, and the
// bands are wide because the question arrives whenever conquest does.

function T(ctx) { return ctx.game.tags[ctx.game.playerTag]; }

function jewishCrown(ctx) {
  const t = T(ctx);
  return !!t && t.alive !== false && t.religion === 'judaism';
}

function flag(ctx, k) { return !!(ctx.game.flags && ctx.game.flags[k]); }

// Provinces held, controlled, not of the crown's religion, and not yet digested.
function undigested(ctx) {
  const g = ctx.game;
  const out = [];
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    if (p.owner !== g.playerTag || p.controller !== p.owner) continue;
    if (p.religion === 'judaism') continue;
    if (Number(p.integration || 0) >= 1) continue;
    out.push(p);
  }
  return out;
}

function gentileShare(ctx) {
  const h = ctx.helpers;
  const me = ctx.game.playerTag;
  const all = h.countOwned(ctx, me, {});
  if (!all) return 0;
  return (all - h.countOwned(ctx, me, { religion: 'judaism' })) / all;
}

function rulerAt(ctx, key, min) {
  const t = T(ctx);
  const r = t && t.ruler;
  return !!r && Number(r[key] || 0) >= min;
}

// The settlement the chapter adopted, where the chapter has one (SPEC §130).
// This pool is shared by six chapters and most of them never answer the
// question; where one has, it decides which answers about the conquered are
// even sayable.
function settlementOf(ctx) {
  try {
    const c = ctx.game.constitutions || {};
    return c[String(ctx.game.bookmarkId || '')] || '';
  } catch (e) { return ''; }
}

export const EVENTS_ANNEX = [

  {
    id: 'ev_a_what_these_people_now_are',
    title: 'What These People Now Are',
    desc: 'The town surrendered on terms, the terms have been honoured, and the '
      + 'garrison commander has written for instructions because the terms did not cover '
      + 'the only question anyone in the town is asking. They are not Jews. They are now '
      + 'inside a Jewish kingdom, permanently, and there is no precedent for what that '
      + 'makes them, because the last Jewish state large enough to have the problem had it '
      + 'solved by prophets and the prophets have stopped. The clerks have found four '
      + 'answers in the archive and none of them is obviously right. What everyone in this '
      + 'room understands, and nobody will write down, is that whatever is decided this '
      + 'week will be quoted as settled law within ten years and will still be being '
      + 'applied when every person present is dead.',
    forTag: 'player',
    major: true,
    maxYear: 1799,
    trigger: (ctx) => {
      try {
        if (!jewishCrown(ctx) || flag(ctx, 'annexPolicySet')) return false;
        return undigested(ctx).length >= 2;
      } catch (e) { return false; }
    },
    aiOption: 1,
    historical: 'Hyrcanus gave the Idumeans circumcision or the road; Aristobulus did the same to the Itureans. Idumea became and stayed Jewish, and three generations later an Idumean family held the throne.',
    options: [
      {
        label: 'Circumcision or the road, as Hyrcanus ruled',
        tooltip: 'The Hasmonean answer. Conquered provinces convert and integrate at double speed; +20% integration and conversion rate, +2 zeal, +2 authority, and the realm stays Jewish however large it gets. −15 legitimacy abroad, +2 unrest in every unconverted province, and the converted are Jews in law with everything that follows from it.',
        effects: (ctx) => {
          try {
            const h = ctx.helpers; const me = ctx.game.playerTag;
            h.addTagModifier(ctx, me, { id: 'circumcision_or_the_road', name: 'Circumcision or the Road', months: -1, effects: { convertMult: 1.20, integrateMult: 1.20, unrestAll: 2 } });
            h.adjust(ctx, me, { legitimacy: -15 });
            h.doctrine(ctx, 'zeal', 2);
            h.doctrine(ctx, 'authority', 2);
            h.setFlag(ctx, 'annexPolicySet', true);
            h.setFlag(ctx, 'annexConvert', true);
            h.chronicle(ctx, 'era', 'The crown rules that the conquered are to be circumcised or to leave. Most of them stay, which is the part the ruling was counting on and the part that will matter longest.');
          } catch (e) { /* content guard */ }
        },
      },
      {
        label: 'Tribute and their own law. They are subjects, not converts',
        when: (ctx) => {
          // A government founded on cancelling debt cannot open a tribute roll
          // on somebody else, and a government that refuses the census cannot
          // assess one. Both answers are closed by their own first principle.
          try { const s = settlementOf(ctx); return s !== 'jubilee' && s !== 'noRuler'; }
          catch (e) { return true; }
        },
        tooltip: 'The lightest hand and the cheapest: conquered towns keep their gods, their courts and their customs and pay for the privilege. +15% income from the tribute, +2 stability, −1 zeal — and integration runs at half speed forever, so the realm accumulates provinces that are inside it without being of it.',
        effects: (ctx) => {
          try {
            const h = ctx.helpers; const me = ctx.game.playerTag;
            h.addTagModifier(ctx, me, { id: 'tribute_and_their_own_law', name: 'Tribute and Their Own Law', months: -1, effects: { incomeMult: 1.15, convertMult: 0.50, integrateMult: 0.50 } });
            h.adjust(ctx, me, { stability: 2 });
            h.doctrine(ctx, 'zeal', -1);
            h.setFlag(ctx, 'annexPolicySet', true);
            h.setFlag(ctx, 'annexTribute', true);
            h.chronicle(ctx, 'era', 'The conquered keep their law and pay for it. The arrangement is efficient, profitable, and creates a category of person the kingdom has no word for.');
          } catch (e) { /* content guard */ }
        },
      },
      {
        label: 'Settle our own among them and let the generations do it',
        tooltip: 'Neither conversion nor tribute: Jewish settlement in the conquered districts, and demography left to finish the argument. +10% integration rate and +5% manpower from the new districts, +1 conquest — and every settled town is a standing grievance: +3 unrest in unconverted provinces, −20 opinion with every neighbour.',
        effects: (ctx) => {
          try {
            const h = ctx.helpers; const me = ctx.game.playerTag;
            h.addTagModifier(ctx, me, { id: 'settle_among_them', name: 'Settle Among Them', months: -1, effects: { convertMult: 1.10, integrateMult: 1.10, manpowerMult: 1.05, unrestAll: 3 } });
            h.doctrine(ctx, 'conquest', 1);
            h.setFlag(ctx, 'annexPolicySet', true);
            h.setFlag(ctx, 'annexSettle', true);
            h.chronicle(ctx, 'era', 'The crown plants its own people in the conquered districts and lets the generations settle what the terms did not.');
          } catch (e) { /* content guard */ }
        },
      },
      {
        label: 'One law for the citizen and the stranger among you',
        tooltip: 'The verse read at its widest: the conquered are subjects of the same law with the same standing, converted or not. +3 stability, −2 unrest everywhere (permanent), +12 legitimacy, −2 zeal — and no mechanism at all for keeping the realm Jewish as it grows. The question of what this state is for is now permanently open. A state that enforced the Jubilee is not choosing generously here; it is applying the chapter of Leviticus it already lives under, and the stranger in the land is in that chapter too.',
        effects: (ctx) => {
          try {
            const h = ctx.helpers; const me = ctx.game.playerTag;
            h.addTagModifier(ctx, me, { id: 'one_law_for_the_stranger', name: 'One Law for the Stranger', months: -1, effects: { unrestAll: -2, incomeMult: 1.05 } });
            h.adjust(ctx, me, { stability: 3, legitimacy: 12 });
            h.doctrine(ctx, 'zeal', -2);
            // Consistency is cheap for a state already committed to it.
            if (settlementOf(ctx) === 'jubilee') {
              h.adjust(ctx, me, { legitimacy: 10 });
              h.chronicle(ctx, 'ruler', 'The ruling cites the chapter the state is already living under, which saves the drafters a week and the argument entirely.');
            }
            h.setFlag(ctx, 'annexPolicySet', true);
            h.setFlag(ctx, 'annexOneLaw', true);
            h.chronicle(ctx, 'era', 'One law is proclaimed for the citizen and the stranger. The lawyers note that the verse says exactly this and that nobody has ever tried to run a country on it.');
          } catch (e) { /* content guard */ }
        },
      },
    ],
  },

  {
    id: 'ev_a_the_grandson',
    title: 'The Grandson of a Man We Converted',
    desc: 'The officer who has just been given the southern command is extremely '
      + 'competent, entirely loyal, and observant in a way that his colleagues describe, '
      + 'when they think he cannot hear, as conspicuous. His grandfather was circumcised at '
      + 'the edge of a sword by soldiers of this kingdom and had the choice of that or the '
      + 'road. His father held a treasury appointment. He is a Jew in law and has been since '
      + 'birth, which is precisely what the ruling of two generations ago said he would be, '
      + 'and the men objecting to his promotion are objecting to the success of their own '
      + 'grandfathers\' policy. Somebody at the council has done the arithmetic aloud: the '
      + 'converted districts now supply a quarter of the officer corps, they are '
      + 'demographically younger than the old country, and there is nothing in the law that '
      + 'distinguishes them from anyone else. There was not supposed to be. That was the point.',
    forTag: 'player',
    major: true,
    maxYear: 1799,
    trigger: (ctx) => {
      try {
        if (!jewishCrown(ctx) || !flag(ctx, 'annexConvert') || flag(ctx, 'grandsonAnswered')) return false;
        return gentileShare(ctx) < 0.55 && ctx.helpers.countOwned(ctx, ctx.game.playerTag, {}) >= 10;
      } catch (e) { return false; }
    },
    aiOption: 0,
    historical: 'Antipater the Idumean, whose people Hyrcanus had converted, became procurator of Judaea under Caesar. His son Herod took the throne in 37 BCE and held it for thirty-three years.',
    options: [
      {
        label: 'A Jew is a Jew. Confirm the appointment',
        tooltip: 'The ruling of two generations ago honoured in full. +15% manpower and +8% discipline from the converted districts (permanent), +3 stability, +10 legitimacy — and a class of families with power, no old-country pedigree, and a long memory of how they got here.',
        effects: (ctx) => {
          try {
            const h = ctx.helpers; const me = ctx.game.playerTag;
            h.addTagModifier(ctx, me, { id: 'the_converted_houses', name: 'The Converted Houses', months: -1, effects: { manpowerMult: 1.15, disciplineMult: 1.08 } });
            h.adjust(ctx, me, { stability: 3, legitimacy: 10 });
            h.doctrine(ctx, 'authority', 1);
            h.setFlag(ctx, 'grandsonAnswered', true);
            h.setFlag(ctx, 'convertedHousesRise', true);
            h.chronicle(ctx, 'era', 'The southern command goes to the grandson of a convert. Nobody can find a law against it, because two generations ago this kingdom took some trouble to make sure there was not one.');
          } catch (e) { /* content guard */ }
        },
      },
      {
        label: 'Keep the old families in the great offices',
        tooltip: 'An unwritten bar on the converted, enforced by custom and denied in public. +20 favour with the pious and the old houses, +1 zeal — and a quarter of the realm learns that the conversion its grandparents were compelled into bought them nothing: −12 legitimacy, +2 unrest in the converted districts, and the resentment is inherited.',
        effects: (ctx) => {
          try {
            const h = ctx.helpers; const me = ctx.game.playerTag;
            h.adjust(ctx, me, { legitimacy: -12 });
            h.addTagModifier(ctx, me, { id: 'the_unwritten_bar', name: 'The Unwritten Bar', months: -1, effects: { unrestAll: 2, manpowerMult: 0.95 } });
            h.doctrine(ctx, 'zeal', 1);
            h.doctrine(ctx, 'authority', -1);
            h.setFlag(ctx, 'grandsonAnswered', true);
            h.setFlag(ctx, 'theUnwrittenBar', true);
            h.chronicle(ctx, 'era', 'The great offices stay with the old families. No decree says so and every family in the converted districts could recite the rule by the end of the year.');
          } catch (e) { /* content guard */ }
        },
      },
    ],
  },

  {
    id: 'ev_a_the_policy_no_longer_describes_us',
    title: 'The Policy No Longer Describes Us',
    desc: 'The standing policy on the conquered was written for a kingdom that had '
      + 'conquered a few districts and it is now being applied to more people than the '
      + 'kingdom originally contained. Whatever was decided back then — the sword, the '
      + 'tribute roll, the settlements, the single law — was decided at a scale where it '
      + 'was administrable and where its costs fell on somebody else. It is now the '
      + 'governing arrangement of the realm rather than a border policy, and the treasury, '
      + 'the army and the courts have all separately written to say that it has stopped '
      + 'working in ways they can each document. Nobody is proposing to reverse it. What '
      + 'they are asking is whether the kingdom is prepared to say out loud that the rule '
      + 'it has been applying for a century was a rule for a different country.',
    forTag: 'player',
    major: true,
    maxYear: 1799,
    trigger: (ctx) => {
      try {
        if (!jewishCrown(ctx) || !flag(ctx, 'annexPolicySet') || flag(ctx, 'policyRevisited')) return false;
        if (gentileShare(ctx) < 0.45) return false;
        return rulerAt(ctx, 'gov', 4) || rulerAt(ctx, 'age', 55);
      } catch (e) { return false; }
    },
    aiOption: 1,
    options: [
      {
        label: 'Hold the policy. It is what made this kingdom',
        tooltip: 'No revision, whatever the arithmetic says. +15 legitimacy, +2 zeal, +25 favour with the party that wrote it — and the documented costs go on being documented: −10% income and +2 unrest everywhere, permanently.',
        effects: (ctx) => {
          try {
            const h = ctx.helpers; const me = ctx.game.playerTag;
            h.adjust(ctx, me, { legitimacy: 15 });
            h.addTagModifier(ctx, me, { id: 'the_policy_held', name: 'The Policy Held', months: -1, effects: { incomeMult: 0.90, unrestAll: 2 } });
            h.doctrine(ctx, 'zeal', 2);
            h.setFlag(ctx, 'policyRevisited', true);
            h.setFlag(ctx, 'policyHeld', true);
            h.chronicle(ctx, 'era', 'The council declines to revise the rule on the conquered. The three departments that asked are thanked and the files are returned to them.');
          } catch (e) { /* content guard */ }
        },
      },
      {
        label: 'Revise it. A rule for a different country is not a rule',
        tooltip: 'The policy replaced with one written for the realm as it actually is: +4 stability, −3 unrest everywhere, +12% income (permanent), −2 zeal, −10 legitimacy. The party that wrote the old rule takes it as a repudiation, which it is.',
        effects: (ctx) => {
          try {
            const h = ctx.helpers; const me = ctx.game.playerTag;
            h.adjust(ctx, me, { stability: 4, legitimacy: -10 });
            h.addTagModifier(ctx, me, { id: 'the_policy_revised', name: 'The Policy Revised', months: -1, effects: { unrestAll: -3, incomeMult: 1.12 } });
            h.doctrine(ctx, 'zeal', -2);
            h.doctrine(ctx, 'authority', 1);
            h.setFlag(ctx, 'policyRevisited', true);
            h.setFlag(ctx, 'policyRevised', true);
            h.chronicle(ctx, 'era', 'The rule on the conquered is rewritten for the country that exists. The men who drafted the original are mostly dead and the ones who are not do not attend the reading.');
          } catch (e) { /* content guard */ }
        },
      },
    ],
  },

];
