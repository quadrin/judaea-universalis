// Judaea Universalis — the window both empires left open, 628–690 CE.
// Content package. Zero imports; concatenated onto EVENTS_614.
//
// The `events_614ce_third.js` package treats this state as a buffer that cannot
// expand, and that was a design choice rather than a fact. It is wrong for one
// specific decade, and it is the most important decade in the chapter.
//
// The Byzantine–Sasanian war of 602–628 was the last and worst of a series that
// had run for four hundred years, and it did not end with a winner. Khosrow II
// was murdered by his own nobility in 628 and Persia went through something like
// a dozen rulers in four years, including two queens, while the currency
// collapsed and the Nahrawan canal system flooded. Heraclius won and was
// bankrupt, plague-struck, and had just spent a generation's manpower. Neither
// empire could field an army in Syria in 634. That is the whole reason the Arab
// conquest moved at the speed it did — not that the Rashidun were unstoppable,
// but that the ground in front of them was empty.
//
// A Jewish state holding Jerusalem in 630 with an army in being is standing in
// exactly the same empty ground, and the game should let it act on that.
//
// The great prize is not Damascus. It is Babylonia. The largest Jewish
// population in the world was there, had been for a thousand years, was richer
// and more numerous than the one in Palestine, and had its own government: the
// Exilarch, claiming descent from the house of David, with the academies behind
// him. There has been no single Jewish authority over both centres since the
// First Temple. A state that takes Mesopotamia from a collapsing Persia does not
// gain a province, it gains — or collides with — the other half of its own
// people, and the Exilarch's claim is at least as good as Jerusalem's.
//
// The precedent is real: Mar Zutra II, Exilarch, is said to have held an
// independent Jewish state around Mahoza for some seven years about 495–502,
// before Kavad crucified him on the bridge at Ctesiphon.
//
// TRIGGERS. Bands and conditions. `mar` opens the window card; `infl` opens the
// Exilarch negotiation, because the second one is not a military problem.
//
// Source spine: Sebeos; al-Tabari; Sherira Gaon's Epistle on the Exilarchate and
// on Mar Zutra; the baqt treaty with Nubia, 652.

const _warned = new Set();
function warnOnce(k, e) { if (_warned.has(k)) return; _warned.add(k); console.warn('[events_614ce_power] ' + k, e || ''); }
function guard(k, fn) { return function (ctx) { try { fn(ctx); } catch (e) { warnOnce('effects:' + k, e); } }; }
function safeTrigger(k, fn) { return function (ctx) { try { return !!fn(ctx); } catch (e) { warnOnce('trigger:' + k, e); return false; } }; }

function alive(ctx, tag) { const t = ctx.game.tags && ctx.game.tags[who(ctx, tag)]; return !!(t && t.alive !== false); }
function flag(ctx, k) { return !!(ctx.game.flags && ctx.game.flags[k]); }
function holds(ctx, tag, name) {
  try {
    const held = who(ctx, tag);
    const p = ctx.prov(name);
    return !!p && !p.impassable && p.owner === held && p.controller === held;
  } catch (e) { warnOnce('holds', e); return false; }
}

// The letters this court answers to NOW (SPEC §135). A realm that has taken a
// greater crown files its provinces, armies and wars under the new tag, while
// this chapter was written against the old one; the sim keeps the forwarding
// address and hands it back through ctx.helpers. Defensive about `helpers`
// because the content packages are also read cold, with no game to resolve
// against.
function who(ctx, tag) {
  return (ctx && ctx.helpers && ctx.helpers.livingTag) ? ctx.helpers.livingTag(ctx, tag) : tag;
}
function holdsAny(ctx, tag, names) { for (const n of names) if (holds(ctx, tag, n)) return true; return false; }
function rulerAt(ctx, tag, key, min) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, tag)];
  const r = t && t.ruler;
  return !!r && Number(r[key] || 0) >= min;
}

function thirdPower(ctx) {
  if (!alive(ctx, 'JUD')) return false;
  const t = ctx.game.tags.JUD;
  if (t && t.overlord) return false;
  if (!holds(ctx, 'JUD', 'Jerusalem')) return false;
  return flag(ctx, 'charterDavidic') || flag(ctx, 'kingdomApart');
}

// 0 a city and its hinterland, 1 a country, 2 a Levantine power, 3 both centres.
function power(ctx) {
  if (!thirdPower(ctx)) return 0;
  const n = ctx.helpers.countControlled(ctx, 'JUD', {});
  const east = holdsAny(ctx, 'JUD', ['Nehardea', 'Babylon']);
  if (east && n >= 14) return 3;
  if (n >= 10 && holds(ctx, 'JUD', 'Damascus')) return 2;
  if (n >= 6) return 1;
  return 0;
}

export const EVENTS_614_POWER = [

  {
    id: 'ev_w_both_empires_died',
    title: 'The Year Nobody Could Field an Army',
    desc: 'The reports from both directions read like the same report written twice. In '
      + 'Ctesiphon they have killed Khosrow and then killed most of the men who killed him, '
      + 'and the throne has changed hands so often this year that the mint has stopped '
      + 'putting a name on the silver; the canals in the Sawad have broken and nobody has '
      + 'the authority to order them repaired. In Constantinople the emperor has won his '
      + 'war, returned the Cross, and discovered that he cannot pay the army that did it; '
      + 'the plague is in the cities and the treasury has been empty since the Persians '
      + 'took Egypt. Neither of them can put a field force into Syria this year. Neither of '
      + 'them can put one in next year either. The kingdom has eleven thousand men under '
      + 'arms, which is a trivial number by the standard of either empire and the largest '
      + 'organised force between Antioch and the desert.',
    forTag: 'JUD',
    major: true,
    minYear: 628,
    maxYear: 642,
    trigger: safeTrigger('ev_w_both_died', (ctx) => {
      if (!thirdPower(ctx) || flag(ctx, 'windowAnswered614')) return false;
      return power(ctx) >= 1 && (rulerAt(ctx, 'JUD', 'mar', 4) || rulerAt(ctx, 'JUD', 'gov', 5));
    }),
    aiOption: 0,
    historical: 'This is the ground the Arab armies walked into in 634. Neither empire could contest Syria, and the conquest of the Levant took six years against forces that had destroyed each other beforehand.',
    options: [
      {
        label: 'March. Take Syria while there is nothing in it',
        tooltip: 'Expansion into a vacuum: +30% manpower, +12% morale, +2 siege (96 months), +3 conquest, Fighters +35. The kingdom becomes a power by taking what nobody is holding — and will be the largest thing in the Levant when somebody finally arrives to look.',
        effects: guard('ev_w_both_died:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'JUD', { id: 'the_empty_ground', name: 'The Empty Ground', months: 96, effects: { manpowerMult: 1.30, moraleMult: 1.12, siegeBonus: 2 } });
          h.factionShift(ctx, 'JUD', 'fighters', 35);
          h.doctrine(ctx, 'conquest', 3);
          h.setFlag(ctx, 'windowAnswered614', true);
          h.setFlag(ctx, 'tookTheEmptyGround', true);
          h.chronicle(ctx, 'era', 'The kingdom marches north into a country with no government in it. The cities open because there is nobody left whose job it was to keep them shut.');
        }),
      },
      {
        label: 'Consolidate. Whoever fills this vacuum will be worse than what left it',
        tooltip: 'The window spent on depth rather than reach: +4 stability, +18% income, +15% fortification (180 months), −2 conquest — and a compact, wealthy, defensible state facing whatever comes out of the south.',
        effects: guard('ev_w_both_died:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 4 });
          h.addTagModifier(ctx, 'JUD', { id: 'depth_not_reach', name: 'Depth, Not Reach', months: 180, effects: { incomeMult: 1.18, reinforceMult: 1.15, disciplineMult: 1.05 } });
          h.factionShift(ctx, 'JUD', 'exilarch', 20);
          h.doctrine(ctx, 'conquest', -2);
          h.setFlag(ctx, 'windowAnswered614', true);
          h.setFlag(ctx, 'depthNotReach', true);
          h.chronicle(ctx, 'ruler', 'The council declines Syria and spends the years on walls, granaries and the coast road. The judgement is that the vacuum will be filled by somebody and that being small may matter more than being large when it is.');
        }),
      },
    ],
  },

  {
    id: 'ev_w_the_other_half',
    title: 'The Other Half of the People',
    desc: 'Beyond the Euphrates there are more Jews than there are in this kingdom, and '
      + 'there have been since Nebuchadnezzar, and they have a government. The Exilarch '
      + 'sits at Mahoza with a court, a prison, the right to appoint judges and a pedigree '
      + 'from the house of David that is written down and older than anything this crown '
      + 'can produce. Behind him are the academies, which have spent four centuries '
      + 'deciding what the Law is without asking anyone in Palestine and have got very used '
      + 'to it. Persia is coming apart and that authority is now unattached. The '
      + 'possibility in front of the council has not existed since the First House: one '
      + 'Jewish government over both centres. So has the difficulty, which is that there '
      + 'are two claims to the same descent and only one of them can be senior, and that '
      + 'the larger community is the one that would be joining.',
    forTag: 'JUD',
    major: true,
    minYear: 630,
    maxYear: 680,
    trigger: safeTrigger('ev_w_other_half', (ctx) => {
      if (!thirdPower(ctx) || flag(ctx, 'exilarchateAnswered')) return false;
      return power(ctx) >= 2 && (rulerAt(ctx, 'JUD', 'infl', 4) || holdsAny(ctx, 'JUD', ['Nehardea', 'Babylon']));
    }),
    aiOption: 1,
    historical: 'Mar Zutra II, Exilarch, is said to have held an independent Jewish state around Mahoza for some seven years about 495–502, before Kavad had him crucified on the bridge at Ctesiphon.',
    options: [
      {
        label: 'One crown. The Exilarch comes under Jerusalem',
        tooltip: 'The two centres united under the king in Jerusalem: +25% income and +20% manpower from Babylonia (240 months), +20 legitimacy, +3 authority. The academies are now subject to a court they have never answered to: Exilarch\'s house −40, +2 unrest in the eastern provinces, and four centuries of independent jurisprudence do not surrender quietly.',
        effects: guard('ev_w_other_half:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 20 });
          h.addTagModifier(ctx, 'JUD', { id: 'both_centres', name: 'Both Centres', months: 240, effects: { incomeMult: 1.25, manpowerMult: 1.20, unrestAll: 1 } });
          h.factionShift(ctx, 'JUD', 'exilarch', -40);
          h.factionShift(ctx, 'JUD', 'fighters', 20);
          h.doctrine(ctx, 'authority', 3);
          h.setFlag(ctx, 'exilarchateAnswered', true);
          h.setFlag(ctx, 'oneCrownBothCentres', true);
          h.chronicle(ctx, 'era', 'For the first time since the First House there is one Jewish government from the Nile to the Tigris. The academies of the east send their congratulations and go on ruling as they did.');
        }),
      },
      {
        label: 'Two houses, one people: the Exilarch keeps the east and the Law',
        tooltip: 'A federation rather than a conquest: the crown governs, the Exilarch keeps jurisdiction and the academies keep the Law. +18% income, +2 stability, +30 legitimacy, Exilarch\'s house +40 — and no authority over what the largest Jewish community in the world is taught. −2 authority.',
        effects: guard('ev_w_other_half:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 30, stability: 2 });
          h.addTagModifier(ctx, 'JUD', { id: 'two_houses_one_people', name: 'Two Houses, One People', months: 240, effects: { incomeMult: 1.18, legitimacyAdd: 0.2 } });
          h.factionShift(ctx, 'JUD', 'exilarch', 40);
          h.doctrine(ctx, 'authority', -2);
          h.setFlag(ctx, 'exilarchateAnswered', true);
          h.setFlag(ctx, 'twoHousesOnePeople', true);
          h.chronicle(ctx, 'era', 'Jerusalem and Mahoza agree to be one people under two houses. The document is signed by both and is careful never to say which is senior.');
        }),
      },
    ],
  },

  {
    id: 'ev_w_the_treaty_state',
    title: 'What the Caliph Will Sign',
    desc: 'The negotiator has come back with the shape of a deal and it is not the shape '
      + 'anyone expected, because the new power has categories nobody here had heard of '
      + 'four years ago and one of them is useful. There is submission, which makes this a '
      + 'protected community paying its assessment and governing nothing. And there is '
      + 'treaty — a state, left standing, with its own ruler and its own army, paying an '
      + 'agreed tribute in exchange for peace and passage. They have offered exactly that '
      + 'to Nubia and the Nubians have taken it. The second is sovereignty and costs money '
      + 'annually and forever; the first is cheaper this year and is not sovereignty. The '
      + 'caliph\'s envoy has been notably relaxed about which one is chosen, which the '
      + 'negotiator reads as the most alarming thing about the conversation.',
    forTag: 'JUD',
    major: true,
    minYear: 638,
    maxYear: 685,
    trigger: safeTrigger('ev_w_treaty_state', (ctx) => {
      if (!thirdPower(ctx) || flag(ctx, 'recognitionAnswered')) return false;
      return power(ctx) >= 1 && alive(ctx, 'RSH');
    }),
    aiOption: 0,
    historical: 'The baqt agreed with Nubia in 652 left a non-Muslim kingdom sovereign, armed and paying an annual tribute, and held for roughly six hundred years — the longest-lasting treaty of its kind.',
    options: [
      {
        label: 'Treaty. Pay the tribute and stay a kingdom',
        tooltip: 'Sovereignty bought annually: −15% income permanently, +50 Rashidun opinion, +3 stability, +2 authority. The crown, the army and the courts remain the kingdom\'s own, and the price is a line in the budget that no future ruler will be able to remove.',
        effects: guard('ev_w_treaty:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 3 });
          h.addTagModifier(ctx, 'JUD', { id: 'the_tribute', name: 'The Tribute', months: -1, effects: { incomeMult: 0.85 } });
          h.doctrine(ctx, 'authority', 2);
          if (alive(ctx, 'RSH')) { const t = ctx.game.tags.RSH; if (t) { t.opinion = t.opinion || {}; t.opinion.JUD = Math.min(200, (t.opinion.JUD || 0) + 50); } }
          h.setFlag(ctx, 'recognitionAnswered', true);
          h.setFlag(ctx, 'theTreatyState', true);
          h.chronicle(ctx, 'era', 'The kingdom signs a treaty of tribute and remains a kingdom. The sum is agreed in gold and slaves and the clause about the army is the one the negotiator fought hardest for.');
        }),
      },
      {
        label: 'Refuse both. We did not take this city to rent it',
        tooltip: 'No tribute, no protection, no category. +20 legitimacy, +3 zeal, Fighters +35, full income — and a frontier with the fastest-expanding power in the world and no agreement governing it. −70 Rashidun opinion, +2 unrest everywhere.',
        effects: guard('ev_w_treaty:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 20 });
          h.addTagModifier(ctx, 'JUD', { id: 'no_category', name: 'In No Category', months: 240, effects: { unrestAll: 2, moraleMult: 1.08 } });
          h.factionShift(ctx, 'JUD', 'fighters', 35);
          h.factionShift(ctx, 'JUD', 'exilarch', -20);
          h.doctrine(ctx, 'zeal', 3);
          h.doctrine(ctx, 'conquest', 1);
          if (alive(ctx, 'RSH')) { const t = ctx.game.tags.RSH; if (t) { t.opinion = t.opinion || {}; t.opinion.JUD = Math.max(-200, (t.opinion.JUD || 0) - 70); } }
          h.setFlag(ctx, 'recognitionAnswered', true);
          h.setFlag(ctx, 'refusedTheCategory', true);
          h.chronicle(ctx, 'era', 'The kingdom declines both the treaty and the protection. The envoy is given an escort to the frontier and thanked, and the frontier is thereafter watched rather more closely.');
        }),
      },
    ],
  },

  // ═══ THE ROADS CLOSE (SPEC §119) ══════════════════════════════════════════
  // The Exilarchate question and the caliph's categories were forks the file
  // asked and never answered for: each set its markers and then the chapter
  // carried on as if nothing had been decided. These two cards are their
  // terminals — what a generation does with each arrangement, priced by the
  // road that produced it.

  {
    id: 'ev_w_what_the_centres_became',
    title: 'What the Two Centres Became',
    desc: 'A generation has grown up inside the arrangement, which is the only test '
      + 'arrangements ever get. The couriers between Jerusalem and Mahoza ride a road '
      + 'that has become ordinary — a thing nobody alive under the First House ever '
      + 'saw — and the question the founding generation shouted about has gone quiet '
      + 'without going away: where does the Law live, and who signs the calendar?\n\n'
      + 'This year both centres\' academies have dated the festivals differently. It is '
      + 'a small discrepancy, two days, arising from an honest dispute about witnesses. '
      + 'It is also the whole constitutional question wearing a holiday costume, and '
      + 'every court in the Jewish world is watching which letter gets obeyed.',
    forTag: 'JUD',
    major: true,
    minYear: 655,
    maxYear: 690,
    trigger: safeTrigger('ev_w_centres_became', (ctx) => {
      if (!alive(ctx, 'JUD')) return false;
      return (flag(ctx, 'oneCrownBothCentres') || flag(ctx, 'twoHousesOnePeople'))
        && !flag(ctx, 'centresSettled');
    }),
    aiOption: 0,
    historical: 'There was no crown to ask. The academies of Babylonia won the argument '
      + 'over the centuries by answering more letters than anybody else, and when a '
      + 'Palestinian academy disputed the calendar with them in 921, the east\'s ruling '
      + 'held. Authority had followed the correspondence.',
    options: [
      {
        label: 'One calendar, sealed where the crown sits',
        tooltip: 'Under one crown: the king\'s court fixes the date and the east complies — '
          + '+15 legitimacy, +1 stability, "One Calendar" (+0.15 legitimacy a month, '
          + 'permanent), Exilarch\'s house −15. Under two houses: Jerusalem\'s letter '
          + 'prevails this once, by negotiation, and the precedent is written down as '
          + 'narrowly as both chanceries can manage — +10 legitimacy, +1 stability.',
        effects: guard('ev_w_centres_became:0', (ctx) => {
          const h = ctx.helpers;
          if (flag(ctx, 'oneCrownBothCentres')) {
            h.adjust(ctx, 'JUD', { legitimacy: 15, stability: 1 });
            h.addTagModifier(ctx, 'JUD', {
              id: 'one_calendar', name: 'One Calendar', months: -1,
              effects: { legitimacyAdd: 0.15 },
            });
            h.factionShift(ctx, 'JUD', 'exilarch', -15);
            h.chronicle(ctx, 'era', 'The festival date is fixed under the king\'s seal and '
              + 'kept on the same day from the Nile to the Tigris. The academies of the east '
              + 'comply, and file their dissent where they file everything: permanently.');
          } else {
            h.adjust(ctx, 'JUD', { legitimacy: 10, stability: 1 });
            h.chronicle(ctx, 'era', 'The two houses negotiate one date for one year, in '
              + 'language drafted not to decide anything else. The festival is kept '
              + 'together, and the question is returned to its box, which both sides now '
              + 'know how to open.');
          }
          h.setFlag(ctx, 'centresSettled', true);
          h.setFlag(ctx, 'oneCalendarSealed', true);
        }),
      },
      {
        label: 'Let each centre keep its own reckoning',
        tooltip: 'The discrepancy stands: the east keeps its date and the west keeps its '
          + 'own. +10 governance points, the Exilarch\'s house +20 — and "Two Reckonings" '
          + 'for 120 months (−0.1 legitimacy a month): a people that cannot agree what day '
          + 'it is has told the world something, and the world was listening.',
        effects: guard('ev_w_centres_became:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { gov: 10 });
          h.factionShift(ctx, 'JUD', 'exilarch', 20);
          h.addTagModifier(ctx, 'JUD', {
            id: 'two_reckonings', name: 'Two Reckonings', months: 120,
            effects: { legitimacyAdd: -0.1 },
          });
          h.setFlag(ctx, 'centresSettled', true);
          h.setFlag(ctx, 'twoReckoningsKept', true);
          h.chronicle(ctx, 'era', 'The festivals are kept two days apart in the two centres, '
            + 'each according to its own witnesses. The arrangement is called temporary in '
            + 'both places, in the tone reserved for things that are not.');
        }),
      },
    ],
  },

  {
    id: 'ev_w_the_rate_is_renegotiated',
    title: 'The Rate Is Renegotiated',
    desc: 'The power that set the terms has fallen into its own war of succession, and '
      + 'every arrangement it made is suddenly a question again. The garrisons that '
      + 'watched this frontier have marched east to fight each other; the governor who '
      + 'signed the schedules is dead or a rebel depending on the week.\n\n'
      + 'A treaty state discovers what its treaty is worth when the counterparty '
      + 'cannot enforce it — or collect it. A state in no category discovers the same '
      + 'thing about its frontier. Either way the council meets over the same map: the '
      + 'assessment routes are unwatched for the first time in a generation, and '
      + 'whatever is decided this year becomes the precedent the next caliph inherits.',
    forTag: 'JUD',
    major: true,
    minYear: 660,
    maxYear: 692,
    trigger: safeTrigger('ev_w_rate_renegotiated', (ctx) => {
      if (!alive(ctx, 'JUD')) return false;
      return (flag(ctx, 'theTreatyState') || flag(ctx, 'refusedTheCategory'))
        && !flag(ctx, 'rateRenegotiated');
    }),
    aiOption: 0,
    historical: 'The first and second fitnas each suspended the caliphate\'s reach for '
      + 'years at a time, and every tributary on the map — Nubia above all — used the '
      + 'pauses to re-argue its rate. The baqt survived every renegotiation, which is '
      + 'why it lasted six centuries.',
    options: [
      {
        label: 'Renegotiate now, and pay the smaller sum forever',
        tooltip: 'Treaty state: the tribute is re-set at the distracted rate — the old '
          + '"Tribute" penalty eases to −8% income, +2 stability, and the precedent binds. '
          + 'No category: a first, minimal agreement is signed from strength — "The Late '
          + 'Treaty" (−8% income, permanent), +1 stability, the frontier finally has a '
          + 'document governing it.',
        effects: guard('ev_w_rate_renegotiated:0', (ctx) => {
          const h = ctx.helpers;
          if (flag(ctx, 'theTreatyState')) {
            h.removeModifier(ctx, 'JUD', 'the_tribute');
            h.addTagModifier(ctx, 'JUD', {
              id: 'the_tribute', name: 'The Tribute, Renegotiated', months: -1,
              effects: { incomeMult: 0.92 },
            });
            h.adjust(ctx, 'JUD', { stability: 2 });
            h.chronicle(ctx, 'era', 'The tribute is re-argued while the counterparty is '
              + 'busy with itself, and the smaller sum is written into the renewal. The '
              + 'next caliph inherits the rate, and the precedent that set it.');
          } else {
            h.removeModifier(ctx, 'JUD', 'no_category');
            h.addTagModifier(ctx, 'JUD', {
              id: 'the_late_treaty', name: 'The Late Treaty', months: -1,
              effects: { incomeMult: 0.92 },
            });
            h.adjust(ctx, 'JUD', { stability: 1 });
            h.chronicle(ctx, 'era', 'The kingdom that refused every category signs its '
              + 'first document with the caliphate — drafted in Jerusalem, priced at the '
              + 'distracted rate, and governing a frontier that has needed governing for '
              + 'thirty years.');
          }
          h.setFlag(ctx, 'rateRenegotiated', true);
          h.setFlag(ctx, 'rateResetEarly', true);
        }),
      },
      {
        label: 'Suspend everything, and bank the difference',
        tooltip: 'No payment while there is nobody to pay: +200 talents banked over the '
          + 'interregnum, +15 martial points — and no precedent, no document, and a '
          + 'restored caliphate that reopens the whole question at its own rate ("The '
          + 'Reopened Question": +1.5 unrest everywhere, 60 months).',
        effects: guard('ev_w_rate_renegotiated:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: 200, mar: 15 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_reopened_question', name: 'The Reopened Question', months: 60,
            effects: { unrestAll: 1.5 },
          });
          h.setFlag(ctx, 'rateRenegotiated', true);
          h.setFlag(ctx, 'tributeSuspended', true);
          h.chronicle(ctx, 'era', 'The payments stop and the silver stays home, there being '
            + 'nobody in a position to collect it. The ledger is kept carefully all the '
            + 'same, by clerks who know that interregna end and ledgers do not.');
        }),
      },
    ],
  },

];
