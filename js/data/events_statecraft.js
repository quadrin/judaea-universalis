// Judaea Universalis — statecraft, shared by every antique bookmark.
// Content package: zero imports; keyed on the player tag like the generic pool.
//
// WHY THIS FILE EXISTS. The game ships 645 cards and 623 of them fire once.
// Fifteen repeat, and twelve of those are the generic pool, and every one of
// the twelve is something that happens TO a realm: the rains fail, a comet is
// read, raiders cross the border, the earth moves. They are weather. They are
// also, once the scripted chain has run out, the entire remaining game — a
// twelve-card deck dealt at roughly two a year to a player who has seen all of
// them, which is what boredom in a grand-strategy campaign actually is.
//
// Playing well makes it worse, and that is the part worth stating plainly: a
// player who outruns history reaches the empty shelf SOONER than one who does
// not. The chapters end where the sources end. The kingdom does not.
//
// So this pool is the other half of the murmur — the things that happen
// BECAUSE a state rules. Nothing here is an omen. Every card is somebody in
// the player's own service asking for a decision the player's own success has
// produced: the collectors, the garrisons, the conquered cities, the client
// courts, the veterans of a war that is over, and the priesthood of a temple
// that has become worth buying.
//
// THREE BANDS, NOT DATES. There are no dates anywhere in this file, because
// there is no year in which a realm acquires an administration — there is a
// size at which it must have one. The bands ask how big the player is and
// what that bigness now costs:
//
//   1. A COURT AND COLLECTORS (4–19 provinces, two years in). The first
//      realm that is too large to govern by knowing everyone in it. Judges
//      who disagree, a garrison nobody paid, a tithe that came in short, a
//      second city that would like a charter of its own.
//   2. RULING PEOPLE WHO ARE NOT YOURS (10+ provinces, 3+ of another faith).
//      The questions that only exist because the conquests worked: a Greek
//      city's shut temple, a contractor bidding for a province's taxes, a
//      client king dead without an heir, and whose name goes on the coin.
//   3. NOBODY LEFT TO FIGHT (18+ provinces, at peace, an army in being).
//      The most dangerous band, historically. Veterans with no war, a
//      diaspora that writes as though you were a power, a High Priesthood
//      that has become an auction, and a prophet in the desert whom arresting
//      would not disperse.
//
// The bands overlap deliberately at their edges and band 1 CLOSES at twenty
// provinces: a short tithe is not an empire's problem, and a realm that has
// grown past the question should stop being asked it.
//
// ONE VOICE AT A TIME. Twenty repeatable cards on generic-pool odds would not
// be texture, it would be a queue. Every option in this file writes the month
// the pool may next speak into one shared key, so the whole package behaves
// like a single channel with a nine-month silence after any answer, on top of
// each card's own multi-year cooldown. The pool murmurs; it does not talk.
//
// WHAT IS DELIBERATELY NOT HERE. Whether to force the conquered to convert is
// already asked — properly, once, as a standing policy — by the annexation
// package (`ev_a_what_these_people_now_are`). Putting a repeatable version of
// Hyrcanus's ruling in this pool would let a player re-litigate the single
// most consequential decision in the whole period every four years, which is
// the opposite of what that card is for.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[data/statecraft]', key, e);
}
// Effects run inside the sim's tick. A content package that throws there takes
// the campaign with it, so every option is wrapped exactly once, here.
function guard(key, fn) {
  return (ctx) => { try { fn(ctx); } catch (e) { warnOnce(key, e); } };
}

function T(ctx) { return ctx.game.tags[ctx.game.playerTag]; }
function monthNow(ctx) {
  const d = ctx.game.date;
  return d.y * 12 + (d.m - 1);
}

// The shared channel. Set on resolution rather than on firing, because it is
// the player's answer that quiets the room — and because a trigger that wrote
// state would be lying about being a predicate.
function poolQuiet(ctx) {
  const until = ctx.game.flags && ctx.game.flags._statecraftUntil;
  return Number.isFinite(until) && monthNow(ctx) < until;
}
function answered(ctx, mark, months) {
  ctx.game.flags._statecraftUntil = monthNow(ctx) + (months || 9);
  ctx.game.flags[mark] = true;
}

function owned(ctx, filter) {
  const g = ctx.game;
  const out = [];
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== g.playerTag) continue;
    if (filter && !filter(p)) continue;
    out.push(p);
  }
  return out;
}
function devTotal(p) {
  return p.dev ? (p.dev.tax || 0) + (p.dev.prod || 0) + (p.dev.mp || 0) : 0;
}
// The province a card of this kind would actually be about: the biggest of
// its class, with a little spread so a long campaign does not keep naming the
// same town. Returns a province or null; every caller tolerates null.
function pickWeighty(ctx, list) {
  if (!list || !list.length) return null;
  const sorted = list.slice().sort((a, b) => devTotal(b) - devTotal(a));
  return ctx.rng.pick(sorted.slice(0, Math.max(1, Math.min(4, sorted.length))));
}
function atPeace(ctx) {
  const t = T(ctx);
  return !!t && !(t.atWarWith || []).some((e) => ctx.game.tags[e] && ctx.game.tags[e].alive);
}
// Provinces we own that do not keep the crown's religion — the people the
// second band is about. Not the same test as the annexation package's
// `undigested`, which also excludes anything already integrated: a Greek city
// whose temple is shut is still a Greek city when the paperwork says it is
// ours.
function strangers(ctx) {
  const t = T(ctx);
  const faith = t && t.religion;
  return owned(ctx, (p) => !!faith && p.religion !== faith);
}
function clientsOf(ctx) {
  const g = ctx.game;
  const me = g.playerTag;
  const out = [];
  for (const k of Object.keys(g.tags)) {
    const t = g.tags[k];
    if (t && t.alive && t.overlord === me) out.push(k);
  }
  return out;
}
function regiments(ctx) {
  let n = 0;
  try {
    for (const a of ctx.helpers.armiesOf(ctx, ctx.game.playerTag)) {
      const r = (a && a.regiments) || {};
      n += (r.inf || 0) + (r.cav || 0);
    }
  } catch (e) { warnOnce('regiments', e); }
  return n;
}
function years(ctx) {
  try { return ctx.helpers.chapterYears(ctx); } catch (e) { return 0; }
}
// A crown with a temple and a priesthood of its own. Four cards below are
// about that institution rather than about states in general, and the
// Keepers' chapter answers yes to this as surely as the Hasmoneans' does —
// Gerizim has a High Priest, a diaspora in Egypt, and its own restorer to
// wait for.
function templeCrown(ctx) {
  const t = T(ctx);
  const r = t && t.religion;
  return r === 'judaism' || r === 'samaritanism';
}

// ─────────────────────────────────────────────────────────────────────────────
// The seats of the court, by chapter and by crown.
//
// A shared package cannot name a faction, because every chapter names its own
// and a card that shifts an id the bookmark never defined is a silent no-op —
// the exact failure class the package suites were written to catch. So the
// roles are named here instead, once, for every playable court in the game:
//
//   strict     the party that guards the ancestral thing and objects to
//              accommodation with outsiders
//   worldly    the party that lives on revenue, foreigners and the wider world
//   soldiers   the party under arms
//
// Where a court has only three seats a role may double up, and where the
// honest answer is that a court has no such party the role is left null and
// every shift against it is skipped. The 167 chapter's pair are named at
// their EARLY ids on purpose: `seatedHeir` in sim/factions walks `succeeds`,
// so 'hasideans' resolves to the Pharisees after 140 BCE without this table
// having to know that the room changed.
const SEATS = {
  '167bce:HAS': { strict: 'hasideans', worldly: 'hellenizers', soldiers: 'warparty' },
  '167bce:SEL': { strict: 'court', worldly: 'cities', soldiers: 'phalanx' },
  '67bce:HYR': { strict: 'pharisees', worldly: 'sadducees', soldiers: 'antipater' },
  '67bce:ARI': { strict: 'pharisees', worldly: 'sadducees', soldiers: 'captains' },
  // Adiabene's strict seat changes faith with the house (SPEC §184): the
  // fire priests guard the ancestral thing before the conversion, the
  // proselyte court after it — same role, different altar.
  '67bce:ADI': { strict: 'magi', worldly: 'caravans', soldiers: 'riders' },
  '40bce:HER': { strict: 'sanhedrin', worldly: 'kin', soldiers: 'swords' },
  // Antigonus has no party of accommodation — his whole claim is that he is
  // the one who did not accommodate — so the street stands in for the
  // pressure that wants bread and quiet whatever it costs.
  '40bce:ATG': { strict: 'priesthood', worldly: 'street', soldiers: 'parthians' },
  '40bce:ADI': { strict: 'magi', worldly: 'caravans', soldiers: 'riders' },
  '66ce:JUD': { strict: 'zealots', worldly: 'notables', soldiers: 'zealots' },
  '66ce:ROM': { strict: 'senate', worldly: 'people', soldiers: 'legions' },
  '66ce:AGR': { strict: 'pious', worldly: 'stewards', soldiers: 'babylonians' },
  '66ce:ADI': { strict: 'proselytes', worldly: 'caravans', soldiers: 'riders' },
  '132ce:JUD': { strict: 'sages', worldly: 'captains', soldiers: 'captains' },
  '132ce:ROM': { strict: 'senate', worldly: 'people', soldiers: 'legions' },
  '132ce:ADI': { strict: 'proselytes', worldly: 'caravans', soldiers: 'riders' },
  '529ce:SAM': { strict: 'priesthood', worldly: 'council', soldiers: 'crowned' },
  '529ce:BYZ': { strict: 'church', worldly: 'landowners', soldiers: 'army' },
  '614ce:JUD': { strict: 'priests', worldly: 'exilarch', soldiers: 'fighters' },
  '614ce:BYZ': { strict: 'church', worldly: 'demes', soldiers: 'army' },
};
function seats(ctx) {
  const g = ctx.game;
  return SEATS[String(g.bookmarkId || '') + ':' + String(g.playerTag || '')] || null;
}
function shift(ctx, role, delta) {
  try {
    const s = seats(ctx);
    const id = s && s[role];
    if (!id) return;
    ctx.helpers.factionShift(ctx, ctx.game.playerTag, id, delta);
  } catch (e) { warnOnce('shift:' + role, e); }
}

// ── the bands ────────────────────────────────────────────────────────────────
function band1(ctx) {
  const t = T(ctx);
  if (!t || t.alive === false || poolQuiet(ctx)) return false;
  if (years(ctx) < 2) return false;
  const n = owned(ctx).length;
  return n >= 4 && n < 20;
}
function band2(ctx) {
  const t = T(ctx);
  if (!t || t.alive === false || poolQuiet(ctx)) return false;
  if (years(ctx) < 2) return false;
  return owned(ctx).length >= 10 && strangers(ctx).length >= 3;
}
function band3(ctx) {
  const t = T(ctx);
  if (!t || t.alive === false || poolQuiet(ctx)) return false;
  if (years(ctx) < 3) return false;
  return owned(ctx).length >= 18 && atPeace(ctx) && regiments(ctx) >= 8;
}

// Era window, on every card: these are undated triggered cards, so without a
// ceiling the §121 generation horizon retires them the moment a chapter runs
// past its own last year — which for the 167 chapter is 60 BCE, and this pool
// is precisely for the campaign that outlives the chapter. `maxYear: 1799` is
// the same belt the generic and annexation pools wear: no tax farmers and no
// desert prophets in a state with a radio. The floor is the earliest year any
// antique bookmark opens, with room to spare.
const WINDOW = { minYear: -400, maxYear: 1799 };

export const EVENTS_STATECRAFT = [

  // ═══ Band 1 — a court and collectors ══════════════════════════════════════

  {
    id: 'ev_sc_two_judges_one_custom',
    ...WINDOW,
    title: 'Two Judges, One Custom',
    desc: 'The same case has been tried twice in two districts and decided both ways: a '
      + 'field sold in a drought year, redeemed in one town and not in the other. Both '
      + 'judges are honest, both are respected, and both cite the custom of their fathers, '
      + 'which is the difficulty — the customs of their fathers are not the same custom. '
      + 'The litigants have come up to the capital because there is now a capital to come '
      + 'up to, and that is new. Whatever is said to them will be said to everyone.',
    historical: 'Local halakhic and customary variation between Judea, Galilee and the '
      + 'coastal districts is attested throughout the period; the Mishnah still records '
      + 'cases where "in Judea they do thus, and in Galilee thus".',
    forTag: 'player', once: false, cooldownMonths: 54, chance: 0.014,
    trigger: band1,
    aiOption: 0,
    options: [
      {
        label: 'One ruling, and it is the capital\'s',
        tooltip: 'A single law, cheaper to run and quicker to digest new land: −8% administrative cost and +10% integration for five years. The districts that lose their custom resent it: +1 unrest everywhere, and the party of the ancestral thing loses 6 approval.',
        effects: guard('two_judges:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'one_ruling_for_all', name: 'One Ruling for All', months: 60,
            effects: { adminMult: 0.92, integrateMult: 1.10, unrestAll: 1 },
          });
          shift(ctx, 'strict', -6);
          answered(ctx, 'statecraftJudges');
        }),
      },
      {
        label: 'Each district keeps what it has always done',
        tooltip: 'Nobody is overruled: −1 unrest everywhere for five years. Nobody is governed either: +8% administrative cost and −20% integration, and the courts stay local. The party of the ancestral thing gains 6 approval.',
        effects: guard('two_judges:1', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_custom_of_the_place', name: 'The Custom of the Place', months: 60,
            effects: { adminMult: 1.08, integrateMult: 0.80, unrestAll: -1 },
          });
          shift(ctx, 'strict', 6);
          answered(ctx, 'statecraftJudges');
        }),
      },
      {
        label: 'Send it to the elders and abide by what they say',
        tooltip: 'The crown does not decide, which is itself a decision: +0.05 legitimacy a month and −0.5 unrest everywhere for four years, and the strict party gains 10. The court that could have ruled did not: −4% income while the case sits, and the worldly party loses 5.',
        effects: guard('two_judges:2', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'referred_to_the_elders', name: 'Referred to the Elders', months: 48,
            effects: { legitimacyAdd: 0.05, unrestAll: -0.5, incomeMult: 0.96 },
          });
          shift(ctx, 'strict', 10);
          shift(ctx, 'worldly', -5);
          answered(ctx, 'statecraftJudges');
        }),
      },
    ],
  },

  {
    id: 'ev_sc_the_garrison_nobody_paid',
    ...WINDOW,
    title: 'A Garrison Nobody Has Paid',
    desc: 'The commander of an outlying post has written four times and has now stopped '
      + 'writing, which is worse. His men have been in place since the campaign that put '
      + 'them there, the campaign is over, the district they sit in is quiet, and quiet '
      + 'districts are the last to be remembered when the chest is opened. They have not '
      + 'mutinied. They have begun to live off the town, which is how garrisons stop '
      + 'being garrisons.',
    historical: 'Unpaid garrison troops living off their host districts are a standing '
      + 'complaint in Hellenistic and Roman provincial administration alike; it is the '
      + 'ordinary way a frontier post turns into a grievance.',
    forTag: 'player', once: false, cooldownMonths: 40, chance: 0.018,
    trigger: band1,
    aiOption: 0,
    options: [
      {
        label: 'Pay the arrears out of the chest',
        tooltip: '−140 talents now. The men remember it: +6% morale and +10% reinforcement for three years, and the soldiers\' party gains 8.',
        effects: guard('garrison:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: -140 });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_arrears_paid', name: 'The Arrears Paid', months: 36,
            effects: { moraleMult: 1.06, reinforceMult: 1.10 },
          });
          shift(ctx, 'soldiers', 8);
          answered(ctx, 'statecraftGarrison');
        }),
      },
      {
        label: 'Let the district that keeps them feed them',
        tooltip: 'Nothing leaves the chest and −10% army upkeep for three years. The district pays instead: +2 unrest there for three years, +0.5 unrest everywhere as the practice spreads, and the strict party loses 5.',
        effects: guard('garrison:1', (ctx) => {
          const h = ctx.helpers;
          const p = pickWeighty(ctx, owned(ctx));
          if (p) {
            h.addProvinceModifier(ctx, p.canon || p.name, {
              id: 'quartered_without_pay', name: 'Quartered Without Pay', months: 36,
              effects: { unrest: 2, taxMult: 0.90 },
            });
          }
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_army_feeds_itself', name: 'The Army Feeds Itself', months: 36,
            effects: { maintMult: 0.90, unrestAll: 0.5 },
          });
          shift(ctx, 'strict', -5);
          answered(ctx, 'statecraftGarrison');
        }),
      },
      {
        label: 'Discharge them and hold the post with fewer',
        tooltip: '+60 talents from the saved wages and −8% army upkeep for four years. The establishment shrinks: −8% force limit and −5% manpower for four years, and the soldiers\' party loses 8.',
        effects: guard('garrison:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: 60 });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_post_held_thin', name: 'The Post Held Thin', months: 48,
            effects: { maintMult: 0.92, forceLimitMult: 0.92, manpowerMult: 0.95 },
          });
          shift(ctx, 'soldiers', -8);
          answered(ctx, 'statecraftGarrison');
        }),
      },
    ],
  },

  {
    id: 'ev_sc_the_tithe_came_short',
    ...WINDOW,
    title: 'The Tithe Came In Short',
    desc: 'The figure from one district is down by a third on a year in which nothing '
      + 'happened to it — no drought, no raid, no plague, and the neighbouring districts '
      + 'are level. The collector\'s account is orderly and adds up perfectly, which the '
      + 'chief scribe considers the most suspicious feature of it. He also points out, '
      + 'without being asked, that the collector is the only man in that district who can '
      + 'read the old roll.',
    historical: 'Every ancient revenue system ran on local men who were simultaneously '
      + 'the only ones who understood the assessment and the only ones with a reason to '
      + 'misstate it.',
    forTag: 'player', once: false, cooldownMonths: 44, chance: 0.016,
    trigger: band1,
    aiOption: 1,
    options: [
      {
        label: 'Send assessors, and let them be seen arriving',
        tooltip: '+9% income for four years as the rolls are corrected. The countryside learns what an assessor looks like: +1 unrest everywhere for four years, and the strict party loses 4.',
        effects: guard('tithe:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_assessors_ride', name: 'The Assessors Ride', months: 48,
            effects: { incomeMult: 1.09, unrestAll: 1 },
          });
          shift(ctx, 'strict', -4);
          answered(ctx, 'statecraftTithe');
        }),
      },
      {
        label: 'Take the figure and say nothing',
        tooltip: '−0.5 unrest everywhere for three years and the strict party gains 4. The figure becomes the precedent: −6% income for five years, because next year three districts will be down by a third.',
        effects: guard('tithe:1', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_figure_accepted', name: 'The Figure Accepted', months: 60,
            effects: { incomeMult: 0.94, unrestAll: -0.5 },
          });
          shift(ctx, 'strict', 4);
          answered(ctx, 'statecraftTithe');
        }),
      },
      {
        label: 'Replace the collector with one of your own household',
        tooltip: '+70 talents recovered and +5% income for three years. Your man does not know the district and the district knows it: +2 unrest there for two years, and the worldly party loses 5.',
        effects: guard('tithe:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: 70 });
          const p = pickWeighty(ctx, owned(ctx));
          if (p) {
            h.addProvinceModifier(ctx, p.canon || p.name, {
              id: 'a_stranger_on_the_roll', name: 'A Stranger on the Roll', months: 24,
              effects: { unrest: 2 },
            });
          }
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_household_collects', name: 'The Household Collects', months: 36,
            effects: { incomeMult: 1.05 },
          });
          shift(ctx, 'worldly', -5);
          answered(ctx, 'statecraftTithe');
        }),
      },
    ],
  },

  {
    id: 'ev_sc_a_charter_for_the_second_city',
    ...WINDOW,
    title: 'A Charter for the Second City',
    desc: 'The elders of the realm\'s second town have come with a request they have '
      + 'clearly rehearsed: their own council, their own market court, their own weights, '
      + 'and the right to hear cases below a certain sum without sending them up. They '
      + 'are careful to say this is not a claim against the crown. Everyone in the room '
      + 'understands that a town which judges its own cases is a town that has begun to '
      + 'be somewhere, and that the capital has exactly one second city at a time.',
    historical: 'Civic charters — a council, a market court, local jurisdiction — were '
      + 'the standard currency of Hellenistic and Roman city-crown bargaining, and the '
      + 'standard first step toward a city that negotiates rather than obeys.',
    forTag: 'player', once: false, cooldownMonths: 60, chance: 0.013,
    trigger: band1,
    aiOption: 1,
    options: [
      {
        label: 'Grant the charter in full',
        tooltip: 'That town: +20% tax and −2 unrest for ten years. The realm: +6% trade for six years, but −6% administrative reach and −15% integration while the precedent stands, and the worldly party gains 8.',
        effects: guard('charter:0', (ctx) => {
          const h = ctx.helpers;
          const p = pickWeighty(ctx, owned(ctx));
          if (p) {
            h.addProvinceModifier(ctx, p.canon || p.name, {
              id: 'a_charter_of_its_own', name: 'A Charter of Its Own', months: 120,
              effects: { taxMult: 1.20, unrest: -2 },
            });
          }
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_chartered_town', name: 'The Chartered Town', months: 72,
            effects: { tradeMult: 1.06, adminMult: 1.06, integrateMult: 0.85 },
          });
          shift(ctx, 'worldly', 8);
          answered(ctx, 'statecraftCharter');
        }),
      },
      {
        label: 'Refuse, and say why in writing',
        tooltip: 'The realm stays one realm: +6% integration and −4% administrative cost for six years. The town remembers being told: +3 unrest there for five years, and the worldly party loses 7.',
        effects: guard('charter:1', (ctx) => {
          const h = ctx.helpers;
          const p = pickWeighty(ctx, owned(ctx));
          if (p) {
            h.addProvinceModifier(ctx, p.canon || p.name, {
              id: 'the_petition_refused', name: 'The Petition Refused', months: 60,
              effects: { unrest: 3 },
            });
          }
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'one_realm_one_court', name: 'One Realm, One Court', months: 72,
            effects: { integrateMult: 1.06, adminMult: 0.96 },
          });
          shift(ctx, 'worldly', -7);
          answered(ctx, 'statecraftCharter');
        }),
      },
      {
        label: 'Grant it, and seat your own men on the council',
        tooltip: '−90 talents to place them. That town: +10% tax and −1 unrest for ten years. The realm keeps its reach: +3% trade for six years at no cost to integration — but nobody is fooled, +0.5 unrest everywhere for four years.',
        effects: guard('charter:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: -90 });
          const p = pickWeighty(ctx, owned(ctx));
          if (p) {
            h.addProvinceModifier(ctx, p.canon || p.name, {
              id: 'a_charter_and_a_watcher', name: 'A Charter, and a Watcher', months: 120,
              effects: { taxMult: 1.10, unrest: -1 },
            });
          }
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_councils_we_seat', name: 'The Councils We Seat', months: 72,
            effects: { tradeMult: 1.03, unrestAll: 0.5 },
          });
          answered(ctx, 'statecraftCharter');
        }),
      },
    ],
  },

  {
    id: 'ev_sc_the_weights_of_the_market',
    ...WINDOW,
    title: 'The Weights of the Market',
    desc: 'A caravan master has refused to unload, on the grounds that the measure used '
      + 'in this market is not the measure he loaded against three towns back, and he is '
      + 'right. There are four standards in use inside the realm, all of them ancient, '
      + 'all of them local, and every one of them slightly favourable to the town that '
      + 'keeps it. The merchants want one standard. The towns want theirs to be it.',
    historical: 'Weights and measures were a live sovereign question in every ancient '
      + 'state; the Hasmoneans, like the Seleucids before them, stamped standards as an '
      + 'assertion of who ruled the market.',
    forTag: 'player', once: false, cooldownMonths: 66, chance: 0.012,
    trigger: band1,
    aiOption: 0,
    options: [
      {
        label: 'One standard, cut and stamped in the capital',
        tooltip: '+8% trade and +5% income for eight years. Three towns lose an advantage they have had for generations: +1 unrest everywhere for three years.',
        effects: guard('weights:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_stamped_measure', name: 'The Stamped Measure', months: 96,
            effects: { tradeMult: 1.08, incomeMult: 1.05 },
          });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_towns_that_lost_the_measure', name: 'The Towns That Lost the Measure',
            months: 36, effects: { unrestAll: 1 },
          });
          answered(ctx, 'statecraftWeights');
        }),
      },
      {
        label: 'Let the merchants agree it among themselves',
        tooltip: '+5% trade for eight years and the worldly party gains 6, at no cost in unrest. The standard belongs to the men who set it rather than to the crown: −3% income for eight years.',
        effects: guard('weights:1', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_merchants_measure', name: 'The Merchants\' Measure', months: 96,
            effects: { tradeMult: 1.05, incomeMult: 0.97 },
          });
          shift(ctx, 'worldly', 6);
          answered(ctx, 'statecraftWeights');
        }),
      },
    ],
  },

  {
    id: 'ev_sc_the_roll_and_the_recopying',
    ...WINDOW,
    title: 'The Roll Is Coming Apart',
    desc: 'The land register is a generation old, written on skins that are splitting at '
      + 'the folds, and the only man who can read the whole of it without help is the '
      + 'scribe who inherited it from his father. Recopying it takes two years and a room '
      + 'full of clerks. It also means every boundary in the realm is read aloud, argued '
      + 'over and written down again — which is why the districts that have quietly grown '
      + 'since the last copy would rather it were left alone.',
    historical: 'Land registers were the spine of ancient revenue and the most contested '
      + 'documents any state kept; recopying one was always an audit whether or not it '
      + 'was meant as one.',
    forTag: 'player', once: false, cooldownMonths: 72, chance: 0.012,
    trigger: band1,
    aiOption: 0,
    options: [
      {
        label: 'Recopy it, and read every boundary aloud',
        tooltip: '−110 talents and +1.5 unrest everywhere for two years while it is done. Then it pays: +10% income and −5% administrative cost for ten years.',
        effects: guard('roll:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: -110 });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_roll_read_aloud', name: 'The Roll Read Aloud', months: 24,
            effects: { unrestAll: 1.5 },
          });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_roll_recopied', name: 'The Roll Recopied', months: 120,
            effects: { incomeMult: 1.10, adminMult: 0.95 },
          });
          answered(ctx, 'statecraftRoll');
        }),
      },
      {
        label: 'Copy it as it stands, changing nothing',
        tooltip: '−40 talents, no unrest, and the document survives: −3% administrative cost for ten years. Every error in it survives too: −5% income for ten years.',
        effects: guard('roll:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: -40 });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'copied_as_it_stood', name: 'Copied as It Stood', months: 120,
            effects: { adminMult: 0.97, incomeMult: 0.95 },
          });
          answered(ctx, 'statecraftRoll');
        }),
      },
      {
        label: 'Leave it with the scribe and his son',
        tooltip: 'Nothing is spent and nothing is disturbed: −1 unrest everywhere for four years. One household now owns the realm\'s memory of who holds what: +6% administrative cost and −8% income for eight years, and the worldly party gains 5.',
        effects: guard('roll:2', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_scribe_and_his_son', name: 'The Scribe and His Son', months: 96,
            effects: { adminMult: 1.06, incomeMult: 0.92 },
          });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'nothing_disturbed', name: 'Nothing Disturbed', months: 48,
            effects: { unrestAll: -1 },
          });
          shift(ctx, 'worldly', 5);
          answered(ctx, 'statecraftRoll');
        }),
      },
    ],
  },

  {
    id: 'ev_sc_the_road_that_wants_mending',
    ...WINDOW,
    title: 'The Road That Wants Mending',
    desc: 'The road that carries the harvest down to the coast has washed out at the same '
      + 'two places for four years running, and the engineers have stopped proposing '
      + 'repairs and started proposing a new line. The old road serves six villages that '
      + 'have been on it since anyone can remember. The new line is shorter, drier, and '
      + 'passes none of them.',
    historical: 'Route changes were among the sharpest local politics of the ancient '
      + 'world: a road moved is a village stranded, and the villages knew it.',
    forTag: 'player', once: false, cooldownMonths: 60, chance: 0.013,
    trigger: band1,
    aiOption: 1,
    options: [
      {
        label: 'Cut the new line',
        tooltip: '−160 talents. +9% trade and +4% development growth for ten years. Six villages are left off the road: +1.5 unrest everywhere for four years, and the strict party loses 5.',
        effects: guard('road:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: -160 });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_new_line', name: 'The New Line', months: 120,
            effects: { tradeMult: 1.09, growthMult: 1.04 },
          });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_villages_left_off', name: 'The Villages Left Off', months: 48,
            effects: { unrestAll: 1.5 },
          });
          shift(ctx, 'strict', -5);
          answered(ctx, 'statecraftRoad');
        }),
      },
      {
        label: 'Mend the old road again',
        tooltip: '−70 talents and +3% trade for six years — and it will wash out again. The villages keep their road: −1 unrest everywhere for six years, and the strict party gains 5.',
        effects: guard('road:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: -70 });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_old_road_mended', name: 'The Old Road Mended', months: 72,
            effects: { tradeMult: 1.03, unrestAll: -1 },
          });
          shift(ctx, 'strict', 5);
          answered(ctx, 'statecraftRoad');
        }),
      },
      {
        label: 'Neither — the carters can pay for their own crossing',
        tooltip: '+80 talents from the toll now, and nothing leaves the chest. Trade goes the long way round: −5% trade for five years, and the worldly party loses 6.',
        effects: guard('road:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: 80 });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_carters_toll', name: 'The Carters\' Toll', months: 60,
            effects: { tradeMult: 0.95 },
          });
          shift(ctx, 'worldly', -6);
          answered(ctx, 'statecraftRoad');
        }),
      },
    ],
  },

  // ═══ Band 2 — ruling people who are not yours ═════════════════════════════

  {
    id: 'ev_sc_the_temple_they_want_reopened',
    ...WINDOW,
    title: 'The Temple They Want Reopened',
    desc: 'The city surrendered, the terms were kept, and the temple was shut — not '
      + 'thrown down, shut, with the door sealed and the priesthood pensioned. Its people '
      + 'have petitioned every year since and this year they have done it properly: '
      + 'through the city council, in writing, offering to pay for the reopening '
      + 'themselves and to keep the rites indoors. The petition points out, politely, '
      + 'that they have paid every assessment on time throughout.',
    historical: 'Every ancient empire that ruled other people\'s gods faced this, and '
      + 'the Hasmoneans faced it in the sharpest possible form: the state existed because '
      + 'a king had done the same thing to their Temple.',
    forTag: 'player', once: false, cooldownMonths: 50, chance: 0.016,
    trigger: band2,
    major: true,
    aiOption: 2,
    options: [
      {
        label: 'Let them open it',
        tooltip: 'That city: −3 unrest and +15% tax for eight years. The realm: −25% conversion for eight years and +1 unrest everywhere, and the strict party loses 12.',
        effects: guard('temple:0', (ctx) => {
          const h = ctx.helpers;
          const p = pickWeighty(ctx, strangers(ctx));
          if (p) {
            h.addProvinceModifier(ctx, p.canon || p.name, {
              id: 'the_door_unsealed', name: 'The Door Unsealed', months: 96,
              effects: { unrest: -3, taxMult: 1.15 },
            });
          }
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_gods_of_the_cities', name: 'The Gods of the Cities', months: 96,
            effects: { convertMult: 0.75, unrestAll: 1 },
          });
          shift(ctx, 'strict', -12);
          shift(ctx, 'worldly', 6);
          answered(ctx, 'statecraftTemple');
        }),
      },
      {
        label: 'The door stays sealed',
        tooltip: 'The realm: +20% conversion for eight years and the strict party gains 12. That city: +4 unrest and −15% tax for eight years, and the worldly party loses 8.',
        effects: guard('temple:1', (ctx) => {
          const h = ctx.helpers;
          const p = pickWeighty(ctx, strangers(ctx));
          if (p) {
            h.addProvinceModifier(ctx, p.canon || p.name, {
              id: 'the_door_stays_sealed', name: 'The Door Stays Sealed', months: 96,
              effects: { unrest: 4, taxMult: 0.85 },
            });
          }
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'one_altar_in_the_realm', name: 'One Altar in the Realm', months: 96,
            effects: { convertMult: 1.20 },
          });
          shift(ctx, 'strict', 12);
          shift(ctx, 'worldly', -8);
          answered(ctx, 'statecraftTemple');
        }),
      },
      {
        label: 'The rites, but no image and no public sacrifice',
        tooltip: 'The lawyer\'s answer: −60 talents to police it. That city: −1 unrest for eight years. The realm: −10% conversion for eight years, the strict party loses 5 and the worldly party loses 3 — neither side got what it asked for.',
        effects: guard('temple:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: -60 });
          const p = pickWeighty(ctx, strangers(ctx));
          if (p) {
            h.addProvinceModifier(ctx, p.canon || p.name, {
              id: 'the_rites_indoors', name: 'The Rites Indoors', months: 96,
              effects: { unrest: -1 },
            });
          }
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'no_image_no_sacrifice', name: 'No Image, No Sacrifice', months: 96,
            effects: { convertMult: 0.90 },
          });
          shift(ctx, 'strict', -5);
          shift(ctx, 'worldly', -3);
          answered(ctx, 'statecraftTemple');
        }),
      },
    ],
  },

  {
    id: 'ev_sc_the_bid_for_a_province',
    ...WINDOW,
    title: 'A Bid for a Province\'s Taxes',
    desc: 'A contractor with the capital to back it has offered to buy the right to '
      + 'collect one district\'s assessment for the next five years. He pays the whole sum '
      + 'up front, at a discount, and keeps whatever he can get. The treasury likes it '
      + 'because the money is here now and the risk is his. The men who have collected in '
      + 'that district for twenty years have asked, through an intermediary, what '
      + 'protection they will have when he arrives.',
    historical: 'Tax farming financed Rome\'s provinces and much of the Hellenistic east; '
      + 'it also produced the specific grievance that the collector and the state were '
      + 'the same thing, which outlasted every regime that used it.',
    forTag: 'player', once: false, cooldownMonths: 48, chance: 0.017,
    trigger: band2,
    aiOption: 0,
    options: [
      {
        label: 'Sell the contract',
        tooltip: '+220 talents now. For six years: −7% income and +1.5 unrest everywhere, and that district takes +4 unrest and −20% tax. The worldly party gains 10, the strict party loses 8.',
        effects: guard('taxfarm:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: 220 });
          const p = pickWeighty(ctx, strangers(ctx).length ? strangers(ctx) : owned(ctx));
          if (p) {
            h.addProvinceModifier(ctx, p.canon || p.name, {
              id: 'the_contract_sold', name: 'The Contract Sold', months: 72,
              effects: { unrest: 4, taxMult: 0.80 },
            });
          }
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_farm_of_the_taxes', name: 'The Farm of the Taxes', months: 72,
            effects: { incomeMult: 0.93, unrestAll: 1.5 },
          });
          shift(ctx, 'worldly', 10);
          shift(ctx, 'strict', -8);
          answered(ctx, 'statecraftTaxFarm');
        }),
      },
      {
        label: 'Collect it yourself, slowly',
        tooltip: 'Nothing now. For six years: +5% income and −0.5 unrest everywhere, and +6% administrative cost, because the clerks doing it are yours to pay. The worldly party loses 6.',
        effects: guard('taxfarm:1', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_crowns_own_collectors', name: 'The Crown\'s Own Collectors', months: 72,
            effects: { incomeMult: 1.05, adminMult: 1.06, unrestAll: -0.5 },
          });
          shift(ctx, 'worldly', -6);
          answered(ctx, 'statecraftTaxFarm');
        }),
      },
      {
        label: 'Sell it to the district\'s own leading house',
        tooltip: '+110 talents now — half the outsider\'s bid. For six years: −3% income, and that district takes +1 unrest and −8% tax. A local grievance instead of a foreign one: the worldly party gains 5 and nobody riots.',
        effects: guard('taxfarm:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: 110 });
          const p = pickWeighty(ctx, strangers(ctx).length ? strangers(ctx) : owned(ctx));
          if (p) {
            h.addProvinceModifier(ctx, p.canon || p.name, {
              id: 'farmed_by_their_own', name: 'Farmed by Their Own', months: 72,
              effects: { unrest: 1, taxMult: 0.92 },
            });
          }
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_local_contract', name: 'The Local Contract', months: 72,
            effects: { incomeMult: 0.97 },
          });
          shift(ctx, 'worldly', 5);
          answered(ctx, 'statecraftTaxFarm');
        }),
      },
    ],
  },

  {
    id: 'ev_sc_the_client_king_dies',
    ...WINDOW,
    title: 'The Client King Is Dead',
    desc: 'The tributary king is dead and there are three men with a claim: a son by a '
      + 'wife his own nobles never accepted, a brother who has spent nine years at your '
      + 'court being useful, and a cousin holding the citadel with the late king\'s guard. '
      + 'All three have written to you within the same fortnight. All three letters say '
      + 'the same thing in different words, which is that whoever you name will be king '
      + 'and will owe you for it — and that whoever you do not name will remember.',
    historical: 'Managing client-kingdom successions was the ordinary business of every '
      + 'imperial power in the Near East, and the ordinary way client kingdoms turned '
      + 'into provinces.',
    forTag: 'player', once: false, cooldownMonths: 60, chance: 0.020,
    trigger: (ctx) => {
      try { return band2(ctx) && clientsOf(ctx).length > 0; } catch (e) { return false; }
    },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Name the man who owes you',
        tooltip: '−130 talents to seat him. He holds: the client gains 1 stability and 20 legitimacy, and your tribute runs clean — +5% income for six years. The strict party loses 5 for meddling in another people\'s house.',
        effects: guard('client:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: -130 });
          const c = clientsOf(ctx)[0];
          if (c) h.adjust(ctx, c, { stability: 1, legitimacy: 20 });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_king_we_made', name: 'The King We Made', months: 72,
            effects: { incomeMult: 1.05 },
          });
          shift(ctx, 'strict', -5);
          answered(ctx, 'statecraftClient');
        }),
      },
      {
        label: 'Let them settle it themselves',
        tooltip: 'Nothing spent, and the strict party gains 6. Whoever wins owes you nothing: the client loses 1 stability and 20 legitimacy, and for six years −4% income and −0.03 legitimacy a month as a throne in your gift goes unclaimed.',
        effects: guard('client:1', (ctx) => {
          const h = ctx.helpers;
          const c = clientsOf(ctx)[0];
          if (c) h.adjust(ctx, c, { stability: -1, legitimacy: -20 });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'a_throne_we_did_not_fill', name: 'A Throne We Did Not Fill', months: 72,
            effects: { incomeMult: 0.96, legitimacyAdd: -0.03 },
          });
          shift(ctx, 'strict', 6);
          answered(ctx, 'statecraftClient');
        }),
      },
      {
        label: 'Rule that the succession is referred to you — permanently',
        tooltip: '+8% income for eight years and the worldly party gains 8: the kingdom is now administered, whatever it is called. The client loses 2 stability and 25 legitimacy and takes +3 unrest across its own provinces for five years — which is how client kingdoms revolt. The strict party loses 8.',
        effects: guard('client:2', (ctx) => {
          const h = ctx.helpers;
          const c = clientsOf(ctx)[0];
          if (c) {
            h.adjust(ctx, c, { stability: -2, legitimacy: -25 });
            const g = ctx.game;
            for (let i = 1; i < g.provinces.length; i++) {
              const p = g.provinces[i];
              if (!p || p.impassable || p.owner !== c) continue;
              h.addProvinceModifier(ctx, p.canon || p.name, {
                id: 'the_succession_referred', name: 'The Succession Referred', months: 60,
                effects: { unrest: 3 },
              });
            }
          }
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'a_kingdom_administered', name: 'A Kingdom Administered', months: 96,
            effects: { incomeMult: 1.08 },
          });
          shift(ctx, 'worldly', 8);
          shift(ctx, 'strict', -8);
          answered(ctx, 'statecraftClient');
        }),
      },
    ],
  },

  {
    id: 'ev_sc_the_language_of_the_decree',
    ...WINDOW,
    title: 'The Language of the Decree',
    desc: 'The chancery has sent up a decree for sealing and attached a question it has '
      + 'been avoiding for two years: in which language does the realm publish? The '
      + 'ancestral tongue is what the crown is for and what half the country reads. Greek '
      + 'is what the cities read, what the merchants keep their books in, and what any '
      + 'foreign court will actually answer. Publishing in both costs twice and pleases '
      + 'the party that wanted one.',
    historical: 'Hasmonean and Herodian administration ran bilingually and the balance '
      + 'shifted with the politics; the coinage, which published in both, is the surviving '
      + 'record of the argument.',
    forTag: 'player', once: false, cooldownMonths: 66, chance: 0.013,
    trigger: band2,
    aiOption: 2,
    options: [
      {
        label: 'The ancestral tongue alone',
        tooltip: '+0.06 legitimacy a month and +15% conversion for eight years, and the strict party gains 10. The cities and the foreign courts read it late or not at all: −7% trade for eight years and the worldly party loses 10.',
        effects: guard('language:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'published_in_the_tongue', name: 'Published in the Tongue', months: 96,
            effects: { legitimacyAdd: 0.06, convertMult: 1.15, tradeMult: 0.93 },
          });
          shift(ctx, 'strict', 10);
          shift(ctx, 'worldly', -10);
          answered(ctx, 'statecraftLanguage');
        }),
      },
      {
        label: 'Greek, as every chancery in the world uses',
        tooltip: '+9% trade and +10% integration for eight years, and the worldly party gains 10. The crown publishes in the language of the kings it broke: −0.05 legitimacy a month, +1 unrest everywhere, and the strict party loses 12.',
        effects: guard('language:1', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'published_in_greek', name: 'Published in Greek', months: 96,
            effects: { tradeMult: 1.09, integrateMult: 1.10, legitimacyAdd: -0.05, unrestAll: 1 },
          });
          shift(ctx, 'worldly', 10);
          shift(ctx, 'strict', -12);
          answered(ctx, 'statecraftLanguage');
        }),
      },
      {
        label: 'Both, on the same sheet',
        tooltip: 'Everyone can read it and nobody is satisfied: +4% trade and +4% integration for eight years, at +8% administrative cost. Both parties lose 3.',
        effects: guard('language:2', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'both_on_one_sheet', name: 'Both on One Sheet', months: 96,
            effects: { tradeMult: 1.04, integrateMult: 1.04, adminMult: 1.08 },
          });
          shift(ctx, 'strict', -3);
          shift(ctx, 'worldly', -3);
          answered(ctx, 'statecraftLanguage');
        }),
      },
    ],
  },

  {
    id: 'ev_sc_quartered_on_the_city',
    ...WINDOW,
    title: 'Quartered on the City',
    desc: 'The city has sent an accounting rather than a complaint, which its council '
      + 'evidently thinks is cleverer: so many houses occupied, so much grain requisitioned '
      + 'at the crown\'s price, so many months. The sum at the bottom is close to a year\'s '
      + 'assessment. They do not ask for the garrison to leave. They ask to have the sum '
      + 'set against what they owe, and they have had it copied to three other cities.',
    historical: 'Billeting was the most resented ordinary burden of ancient occupation, '
      + 'and remitting taxes against it was the standard way empires bought quiet without '
      + 'withdrawing troops.',
    forTag: 'player', once: false, cooldownMonths: 46, chance: 0.016,
    trigger: band2,
    aiOption: 1,
    options: [
      {
        label: 'Set it against what they owe',
        tooltip: '−4% income for five years — the other three cities will send the same letter. That city: −3 unrest for five years, and +6% integration across the realm as the practice is noticed.',
        effects: guard('quarter:0', (ctx) => {
          const h = ctx.helpers;
          const p = pickWeighty(ctx, strangers(ctx));
          if (p) {
            h.addProvinceModifier(ctx, p.canon || p.name, {
              id: 'set_against_the_assessment', name: 'Set Against the Assessment', months: 60,
              effects: { unrest: -3 },
            });
          }
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_billet_remitted', name: 'The Billet Remitted', months: 60,
            effects: { incomeMult: 0.96, integrateMult: 1.06 },
          });
          answered(ctx, 'statecraftQuarter');
        }),
      },
      {
        label: 'The garrison is their protection and they will pay for it',
        tooltip: 'Nothing given: −8% army upkeep for five years. That city: +4 unrest and −10% tax for five years, and +0.5 unrest everywhere as the copies are read.',
        effects: guard('quarter:1', (ctx) => {
          const h = ctx.helpers;
          const p = pickWeighty(ctx, strangers(ctx));
          if (p) {
            h.addProvinceModifier(ctx, p.canon || p.name, {
              id: 'the_billet_refused', name: 'The Billet Refused', months: 60,
              effects: { unrest: 4, taxMult: 0.90 },
            });
          }
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_city_pays_the_billet', name: 'The City Pays the Billet', months: 60,
            effects: { maintMult: 0.92, unrestAll: 0.5 },
          });
          shift(ctx, 'soldiers', 5);
          answered(ctx, 'statecraftQuarter');
        }),
      },
      {
        label: 'Move the garrison outside the walls and build it a camp',
        tooltip: '−170 talents for the camp. That city: −2 unrest for eight years. The troops are out of the houses and harder to feed: +6% army upkeep for eight years, and the soldiers\' party loses 6.',
        effects: guard('quarter:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: -170 });
          const p = pickWeighty(ctx, strangers(ctx));
          if (p) {
            h.addProvinceModifier(ctx, p.canon || p.name, {
              id: 'the_camp_outside_the_walls', name: 'The Camp Outside the Walls', months: 96,
              effects: { unrest: -2 },
            });
          }
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'quartered_in_the_field', name: 'Quartered in the Field', months: 96,
            effects: { maintMult: 1.06 },
          });
          shift(ctx, 'soldiers', -6);
          answered(ctx, 'statecraftQuarter');
        }),
      },
    ],
  },

  {
    id: 'ev_sc_whose_name_is_on_the_coin',
    ...WINDOW,
    title: 'Whose Name Is on the Coin',
    desc: 'The mint wants a decision before it cuts new dies. Coin is the one thing every '
      + 'subject handles, so whatever is on it is the realm\'s statement about itself, '
      + 'repeated in every market for a generation. The cities want a portrait, because '
      + 'that is what a king looks like everywhere they have ever traded. The Law does not '
      + 'permit the likeness. There is a third way, which is to put the office on it '
      + 'instead of the face, and it satisfies nobody who cares.',
    historical: 'Hasmonean coinage is aniconic — palm branch, cornucopiae, star, and a '
      + 'legend naming the High Priest and the assembly of the Jews — while Herod\'s and '
      + 'his sons\' coinages edge toward the ordinary Hellenistic royal type.',
    forTag: 'player', once: false, cooldownMonths: 72, chance: 0.012,
    trigger: (ctx) => {
      try { return band2(ctx) && templeCrown(ctx); } catch (e) { return false; }
    },
    aiOption: 1,
    options: [
      {
        label: 'A portrait, as kings are minted',
        tooltip: '+8% trade and +8% integration for ten years, and the worldly party gains 10. The likeness is on every coin in the country: +1.5 unrest everywhere, −0.06 legitimacy a month, and the strict party loses 15.',
        effects: guard('coin:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_royal_likeness', name: 'The Royal Likeness', months: 120,
            effects: { tradeMult: 1.08, integrateMult: 1.08, unrestAll: 1.5, legitimacyAdd: -0.06 },
          });
          shift(ctx, 'worldly', 10);
          shift(ctx, 'strict', -15);
          answered(ctx, 'statecraftCoin');
        }),
      },
      {
        label: 'No likeness — the office, and the assembly of the people',
        tooltip: '+0.08 legitimacy a month and −1 unrest everywhere for ten years, and the strict party gains 12. Foreign markets discount a coin with no king on it: −5% trade for ten years and the worldly party loses 8.',
        effects: guard('coin:1', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_office_and_the_assembly', name: 'The Office and the Assembly', months: 120,
            effects: { legitimacyAdd: 0.08, unrestAll: -1, tradeMult: 0.95 },
          });
          shift(ctx, 'strict', 12);
          shift(ctx, 'worldly', -8);
          answered(ctx, 'statecraftCoin');
        }),
      },
      {
        label: 'Two coinages — one for the country, one for the ports',
        tooltip: '−100 talents for the second mint, then +5% trade and +0.03 legitimacy a month for ten years. Running two truths costs: +8% administrative cost for ten years, and both parties lose 4 for the evasion.',
        effects: guard('coin:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: -100 });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'two_coinages', name: 'Two Coinages', months: 120,
            effects: { tradeMult: 1.05, legitimacyAdd: 0.03, adminMult: 1.08 },
          });
          shift(ctx, 'strict', -4);
          shift(ctx, 'worldly', -4);
          answered(ctx, 'statecraftCoin');
        }),
      },
    ],
  },

  // ═══ Band 3 — nobody left to fight ════════════════════════════════════════

  {
    id: 'ev_sc_veterans_without_a_war',
    ...WINDOW,
    title: 'Veterans Without a War',
    desc: 'There is no enemy in the field and there are still the men who beat the last '
      + 'one. They are in their camps, they are paid, and they are the most dangerous '
      + 'single institution the realm now contains — not because they are disloyal, but '
      + 'because an army with nothing to do develops opinions about who ought to be '
      + 'ruling, and because every man in it knows exactly what he is owed and has begun '
      + 'to calculate it in land.',
    historical: 'What to do with a victorious army in peacetime destroyed more ancient '
      + 'states than any invasion: settlement, standing pay, or hire abroad were the only '
      + 'three answers, and each one cost something a state could not easily get back.',
    forTag: 'player', once: false, cooldownMonths: 54, chance: 0.020,
    trigger: band3,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Settle them on the land',
        tooltip: '−200 talents for the allotments. For ten years: +8% manpower, +5% development growth, −10% army upkeep — and −10% force limit and −5% morale, because a farmer is not a soldier. The soldiers\' party gains 6.',
        effects: guard('veterans:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: -200 });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_veterans_settled', name: 'The Veterans Settled', months: 120,
            effects: {
              manpowerMult: 1.08, growthMult: 1.05, maintMult: 0.90,
              forceLimitMult: 0.90, moraleMult: 0.95,
            },
          });
          shift(ctx, 'soldiers', 6);
          answered(ctx, 'statecraftVeterans');
        }),
      },
      {
        label: 'Keep them under arms and keep paying them',
        tooltip: 'For ten years: +8% morale, +6% discipline, +10% force limit and +12% reinforcement — and +18% army upkeep and −4% income. The soldiers\' party gains 12; the strict party loses 6 at the sight of a standing army in peacetime.',
        effects: guard('veterans:1', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_standing_host', name: 'The Standing Host', months: 120,
            effects: {
              moraleMult: 1.08, disciplineMult: 1.06, forceLimitMult: 1.10,
              reinforceMult: 1.12, maintMult: 1.18, incomeMult: 0.96,
            },
          });
          shift(ctx, 'soldiers', 12);
          shift(ctx, 'strict', -6);
          answered(ctx, 'statecraftVeterans');
        }),
      },
      {
        label: 'Hire them out to a king who has a war',
        tooltip: '+280 talents now and −15% army upkeep for six years — they are somebody else\'s to feed. For six years: −12% manpower and −8% force limit while they are away, and whatever they learn abroad they learn from a foreign paymaster: +0.5 unrest everywhere. The worldly party gains 8.',
        effects: guard('veterans:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: 280 });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'let_out_to_a_foreign_king', name: 'Let Out to a Foreign King', months: 72,
            effects: {
              maintMult: 0.85, manpowerMult: 0.88, forceLimitMult: 0.92, unrestAll: 0.5,
            },
          });
          shift(ctx, 'worldly', 8);
          answered(ctx, 'statecraftVeterans');
        }),
      },
    ],
  },

  {
    id: 'ev_sc_the_letter_from_alexandria',
    ...WINDOW,
    title: 'The Letter from Alexandria',
    desc: 'The community in Alexandria has written, and the striking thing about the '
      + 'letter is what it assumes. It does not petition. It reports — a magistrate\'s '
      + 'ruling gone against them, a synagogue attacked in a quarter where the watch did '
      + 'not come, the terms on which they hold their old privileges now in doubt — and it '
      + 'reports these things the way a province reports to its capital. They are not '
      + 'your subjects. They live under a king who has never sworn anything to you. They '
      + 'have written to you anyway, because there is now somewhere to write.',
    historical: 'Alexandria held the largest Jewish community outside the land, with '
      + 'Samaritan communities beside it; both looked to the homeland\'s institutions in '
      + 'ways that repeatedly outran what any homeland state could actually do for them.',
    forTag: 'player', once: false, cooldownMonths: 50, chance: 0.017,
    trigger: (ctx) => {
      try { return band3(ctx) && templeCrown(ctx); } catch (e) { return false; }
    },
    aiOption: 1,
    options: [
      {
        label: 'Answer as a power answers: an embassy, and money',
        tooltip: '−180 talents. +0.08 legitimacy a month and +6% trade for eight years as the diaspora routes turn homeward. You have told a foreign king his Jews are your business: +1 unrest everywhere for four years, and the worldly party gains 8.',
        effects: guard('alexandria:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: -180 });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'answered_as_a_power', name: 'Answered as a Power', months: 96,
            effects: { legitimacyAdd: 0.08, tradeMult: 1.06 },
          });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'a_kings_jews_are_our_business', name: 'A King\'s Jews Are Our Business',
            months: 48, effects: { unrestAll: 1 },
          });
          shift(ctx, 'worldly', 8);
          answered(ctx, 'statecraftAlexandria');
        }),
      },
      {
        label: 'Answer as a temple answers: a ruling, and prayers',
        tooltip: 'Nothing spent. +0.04 legitimacy a month and −0.5 unrest everywhere for eight years, and the strict party gains 10. It is not what they asked for and they will not ask again soon: −3% trade for eight years.',
        effects: guard('alexandria:1', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'a_ruling_and_prayers', name: 'A Ruling, and Prayers', months: 96,
            effects: { legitimacyAdd: 0.04, unrestAll: -0.5, tradeMult: 0.97 },
          });
          shift(ctx, 'strict', 10);
          answered(ctx, 'statecraftAlexandria');
        }),
      },
      {
        label: 'Invite them home, and pay their passage',
        tooltip: '−240 talents. For ten years: +10% manpower, +6% development growth and +4% income. They arrive into a country that did not ask for them: +2 unrest everywhere for five years, and the strict party loses 6.',
        effects: guard('alexandria:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: -240 });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_passage_paid', name: 'The Passage Paid', months: 120,
            effects: { manpowerMult: 1.10, growthMult: 1.06, incomeMult: 1.04 },
          });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'a_country_that_did_not_ask', name: 'A Country That Did Not Ask',
            months: 60, effects: { unrestAll: 2 },
          });
          shift(ctx, 'strict', -6);
          answered(ctx, 'statecraftAlexandria');
        }),
      },
    ],
  },

  {
    id: 'ev_sc_the_priesthood_has_a_price',
    ...WINDOW,
    title: 'The Priesthood Has a Price',
    desc: 'Nobody says the office is for sale. What has happened is that the houses which '
      + 'might supply a High Priest have become the houses which can afford to, and the '
      + 'sums involved are now discussed openly enough that a figure was mentioned to the '
      + 'chief steward this week by a man who expected him to be pleased. The office is '
      + 'the holiest thing the nation has and it has become the most reliable revenue in '
      + 'the realm. Both of those sentences are true and the second is why this is hard.',
    historical: 'The High Priesthood was bought under Jason and Menelaus before the '
      + 'revolt and traded again by Herod and the prefects afterward; the intervening '
      + 'Hasmonean solution — the ruler holding it himself — created the objection that '
      + 'produced the Pharisees.',
    forTag: 'player', once: false, cooldownMonths: 60, chance: 0.016,
    trigger: (ctx) => {
      try { return band3(ctx) && templeCrown(ctx); } catch (e) { return false; }
    },
    major: true,
    aiOption: 2,
    options: [
      {
        label: 'Take the money and appoint the payer',
        tooltip: '+320 talents now and +6% income for eight years. For eight years: −0.10 legitimacy a month and +2 unrest everywhere, and the strict party loses 18. This is the grievance the last revolt was made of.',
        effects: guard('priesthood:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: 320 });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_office_sold', name: 'The Office Sold', months: 96,
            effects: { incomeMult: 1.06, legitimacyAdd: -0.10, unrestAll: 2 },
          });
          shift(ctx, 'strict', -18);
          shift(ctx, 'worldly', 8);
          answered(ctx, 'statecraftPriesthood');
        }),
      },
      {
        label: 'Hold the office yourself and end the bidding',
        tooltip: 'For ten years: +0.10 legitimacy a month, +8% conversion and −4% administrative cost — one head, one authority. A ruler in the vestments is the objection the strict party exists to make: +1.5 unrest everywhere, and the strict party loses 10.',
        effects: guard('priesthood:1', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_crown_in_the_vestments', name: 'The Crown in the Vestments', months: 120,
            effects: {
              legitimacyAdd: 0.10, convertMult: 1.08, adminMult: 0.96, unrestAll: 1.5,
            },
          });
          shift(ctx, 'strict', -10);
          answered(ctx, 'statecraftPriesthood');
        }),
      },
      {
        label: 'Give it back to the courses, by lot, for life',
        tooltip: 'The strict party gains 16 and for ten years −1.5 unrest everywhere and +0.05 legitimacy a month. You have given away the most reliable revenue and the most useful appointment in the realm: −8% income for ten years, and the worldly party loses 10.',
        effects: guard('priesthood:2', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'restored_to_the_courses', name: 'Restored to the Courses', months: 120,
            effects: { unrestAll: -1.5, legitimacyAdd: 0.05, incomeMult: 0.92 },
          });
          shift(ctx, 'strict', 16);
          shift(ctx, 'worldly', -10);
          answered(ctx, 'statecraftPriesthood');
        }),
      },
    ],
  },

  {
    id: 'ev_sc_the_voice_in_the_wilderness',
    ...WINDOW,
    title: 'The Voice in the Wilderness',
    desc: 'A man is preaching beyond the last cultivated ground and the crowds going out '
      + 'to him are no longer only the poor. He has not called for a rising. He has said '
      + 'that the present order is a temporary arrangement, that its offices are held by '
      + 'men who will not hold them long, and that the people should make themselves '
      + 'ready — and the trouble with all three statements is that they are the ones this '
      + 'state was founded on. The captain of the guard wants him arrested. The captain '
      + 'of the guard has also, when pressed, admitted that arresting him will not send '
      + 'the crowds home.',
    historical: 'Josephus records a steady succession of wilderness prophets and sign-'
      + 'promisers drawing crowds out of the settled land, and a steady succession of '
      + 'governors meeting them with cavalry; the Samaritan expectation of the Taheb '
      + 'produced the same scene on Gerizim under Pilate.',
    forTag: 'player', once: false, cooldownMonths: 56, chance: 0.017,
    trigger: (ctx) => {
      try { return band3(ctx) && templeCrown(ctx); } catch (e) { return false; }
    },
    major: true,
    aiOption: 1,
    options: [
      {
        label: 'Take him, quietly, at night',
        tooltip: 'For six years: −6% development growth and +2.5 unrest everywhere — the crowds do not disperse, they acquire a grievance with a name. The strict party loses 12; the soldiers\' party gains 6 for a firm hand.',
        effects: guard('prophet:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'taken_at_night', name: 'Taken at Night', months: 72,
            effects: { unrestAll: 2.5, growthMult: 0.94 },
          });
          shift(ctx, 'strict', -12);
          shift(ctx, 'soldiers', 6);
          answered(ctx, 'statecraftProphet');
        }),
      },
      {
        label: 'Leave him alone and let the desert answer him',
        tooltip: 'Nothing done, which is the cheapest and least certain answer: +1 unrest everywhere for six years while the crowds grow, and −3% income as the harvest labour walks out to hear him. No party is angered.',
        effects: guard('prophet:1', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_desert_answers_him', name: 'The Desert Answers Him', months: 72,
            effects: { unrestAll: 1, incomeMult: 0.97 },
          });
          answered(ctx, 'statecraftProphet');
        }),
      },
      {
        label: 'Send the elders out to hear him, and print what he says',
        tooltip: '−80 talents for the delegation. For eight years: +0.06 legitimacy a month and −1.5 unrest everywhere — the movement is inside the tent rather than outside it. It is also now inside the tent: +10% conversion, +5% administrative cost, and the strict party gains 8 while the worldly party loses 8.',
        effects: guard('prophet:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: -80 });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_elders_went_out', name: 'The Elders Went Out', months: 96,
            effects: {
              legitimacyAdd: 0.06, unrestAll: -1.5, convertMult: 1.10, adminMult: 1.05,
            },
          });
          shift(ctx, 'strict', 8);
          shift(ctx, 'worldly', -8);
          answered(ctx, 'statecraftProphet');
        }),
      },
    ],
  },

  {
    id: 'ev_sc_the_generation_that_never_marched',
    ...WINDOW,
    title: 'The Generation That Never Marched',
    desc: 'The muster returns show something the old captains find hard to say out loud: '
      + 'more than half the men on the rolls have never been in a battle. They are '
      + 'healthier than their fathers, better fed, and considerably less use, and the '
      + 'fathers are retiring. There is no war to teach them in. There is only the choice '
      + 'between manufacturing hardship for them at the state\'s expense and finding out '
      + 'what they are worth the first time it matters.',
    historical: 'The problem of a military establishment with no living combat experience '
      + 'is as old as standing armies; the Hasmonean state met it within two generations '
      + 'of Modein.',
    forTag: 'player', once: false, cooldownMonths: 60, chance: 0.014,
    trigger: band3,
    aiOption: 0,
    options: [
      {
        label: 'Drill them until they hate you',
        tooltip: '−150 talents and +12% army upkeep for eight years. For eight years: +10% discipline, +8% morale and +8% reinforcement. The soldiers\' party gains 8; +0.5 unrest everywhere, because the drafts fall on the villages.',
        effects: guard('generation:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: -150 });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'drilled_until_they_hate_us', name: 'Drilled Until They Hate Us', months: 96,
            effects: {
              disciplineMult: 1.10, moraleMult: 1.08, reinforceMult: 1.08,
              maintMult: 1.12, unrestAll: 0.5,
            },
          });
          shift(ctx, 'soldiers', 8);
          answered(ctx, 'statecraftGeneration');
        }),
      },
      {
        label: 'Cut the establishment and keep the veterans who are left',
        tooltip: '+120 talents and −15% army upkeep for eight years, with +6% discipline from a smaller, better core. The realm can field far less: −15% force limit and −10% manpower for eight years, and the soldiers\' party loses 10.',
        effects: guard('generation:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: 120 });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_smaller_better_host', name: 'The Smaller, Better Host', months: 96,
            effects: {
              maintMult: 0.85, disciplineMult: 1.06,
              forceLimitMult: 0.85, manpowerMult: 0.90,
            },
          });
          shift(ctx, 'soldiers', -10);
          answered(ctx, 'statecraftGeneration');
        }),
      },
      {
        label: 'Hire foreign officers to teach them',
        tooltip: '−190 talents and +8% army upkeep for eight years. For eight years: +9% discipline and +6% army power. Foreign officers in the ranks of a national army: +1 unrest everywhere, the strict party loses 8 and the worldly party gains 6.',
        effects: guard('generation:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: -190 });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_foreign_officers', name: 'The Foreign Officers', months: 96,
            effects: {
              disciplineMult: 1.09, milPowerMult: 1.06, maintMult: 1.08, unrestAll: 1,
            },
          });
          shift(ctx, 'strict', -8);
          shift(ctx, 'worldly', 6);
          answered(ctx, 'statecraftGeneration');
        }),
      },
    ],
  },

  {
    id: 'ev_sc_the_frontier_that_does_not_pay',
    ...WINDOW,
    title: 'The Frontier That Does Not Pay',
    desc: 'The ledger for the outer districts has been laid on the table with the columns '
      + 'the treasurer wants seen: what they yield, what their garrisons cost, and the '
      + 'difference, which has been negative for eleven years. They were taken because '
      + 'they were the road an enemy came down. There is no enemy on that road now. '
      + 'There is a strong argument for pulling the line back to where the country pays '
      + 'for itself, and there is the fact that a border which moves once has shown that '
      + 'it moves.',
    historical: 'Holding unprofitable marches for strategic depth against the cost of '
      + 'garrisoning them is the oldest argument in imperial finance, and the side that '
      + 'wins it is usually the one holding the ledger.',
    forTag: 'player', once: false, cooldownMonths: 66, chance: 0.013,
    trigger: band3,
    aiOption: 1,
    options: [
      {
        label: 'Hold the line where it stands',
        tooltip: '−6% income and +8% army upkeep for eight years. The frontier holds and is seen to hold: +8% force limit, +5% morale, +0.04 legitimacy a month, and the soldiers\' party gains 8.',
        effects: guard('frontier:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_line_where_it_stands', name: 'The Line Where It Stands', months: 96,
            effects: {
              incomeMult: 0.94, maintMult: 1.08, forceLimitMult: 1.08,
              moraleMult: 1.05, legitimacyAdd: 0.04,
            },
          });
          shift(ctx, 'soldiers', 8);
          answered(ctx, 'statecraftFrontier');
        }),
      },
      {
        label: 'Pull the garrisons back to the paying country',
        tooltip: '+9% income and −12% army upkeep for eight years, and +4% development growth as the money goes inward. A border that has moved once: −0.06 legitimacy a month and +1 unrest everywhere for eight years, and the soldiers\' party loses 10.',
        effects: guard('frontier:1', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'pulled_back_to_the_paying_country', name: 'Pulled Back to the Paying Country',
            months: 96,
            effects: {
              incomeMult: 1.09, maintMult: 0.88, growthMult: 1.04,
              legitimacyAdd: -0.06, unrestAll: 1,
            },
          });
          shift(ctx, 'soldiers', -10);
          answered(ctx, 'statecraftFrontier');
        }),
      },
      {
        label: 'Let the border tribes hold it, on a subsidy',
        tooltip: '−4% income for the subsidy but −18% army upkeep for eight years, and +6% manpower from the levies it buys. The line is held by men who are not yours: −5% army power, −0.03 legitimacy a month, and the strict party loses 6.',
        effects: guard('frontier:2', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_border_on_a_subsidy', name: 'The Border on a Subsidy', months: 96,
            effects: {
              incomeMult: 0.96, maintMult: 0.82, manpowerMult: 1.06,
              milPowerMult: 0.95, legitimacyAdd: -0.03,
            },
          });
          shift(ctx, 'strict', -6);
          answered(ctx, 'statecraftFrontier');
        }),
      },
    ],
  },

  {
    id: 'ev_sc_the_offices_multiply',
    ...WINDOW,
    title: 'The Offices Multiply',
    desc: 'The steward has produced a list of everyone drawing on the household and it '
      + 'runs to four columns. Some of them do necessary things nobody else knows how to '
      + 'do. Some of them are the sons of men who did necessary things. It is no longer '
      + 'possible to tell which is which from the roll alone, and the men who could tell '
      + 'you are on it. A court that has become an institution is how a conquest becomes '
      + 'a state, and it is also how a treasury quietly stops being able to pay for a war.',
    historical: 'Household offices hardening into a hereditary administration is the '
      + 'standard life-cycle of every successful ancient monarchy, including the one that '
      + 'started at Modein.',
    forTag: 'player', once: false, cooldownMonths: 60, chance: 0.013,
    trigger: band3,
    aiOption: 2,
    options: [
      {
        label: 'Strike the roll back to what the work needs',
        tooltip: '+100 talents and −10% administrative cost for eight years. Every struck name belongs to a house: +2 unrest everywhere for four years, −0.04 legitimacy a month for eight, and the worldly party loses 12.',
        effects: guard('offices:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: 100 });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_roll_struck', name: 'The Roll Struck', months: 96,
            effects: { adminMult: 0.90, legitimacyAdd: -0.04 },
          });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_houses_struck_off', name: 'The Houses Struck Off', months: 48,
            effects: { unrestAll: 2 },
          });
          shift(ctx, 'worldly', -12);
          answered(ctx, 'statecraftOffices');
        }),
      },
      {
        label: 'Make the offices hereditary and be done pretending',
        tooltip: 'For ten years: −1.5 unrest everywhere, +0.05 legitimacy a month and +6% integration — a settled governing class governs. It cannot be cut again: +12% administrative cost and −5% income for ten years. The worldly party gains 12, the strict party loses 6.',
        effects: guard('offices:1', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_offices_made_hereditary', name: 'The Offices Made Hereditary',
            months: 120,
            effects: {
              unrestAll: -1.5, legitimacyAdd: 0.05, integrateMult: 1.06,
              adminMult: 1.12, incomeMult: 0.95,
            },
          });
          shift(ctx, 'worldly', 12);
          shift(ctx, 'strict', -6);
          answered(ctx, 'statecraftOffices');
        }),
      },
      {
        label: 'Sell the offices, and let the buyers pay for the work',
        tooltip: '+260 talents now and −6% administrative cost for eight years. Men who bought an office recover it from the people the office is over: −5% income, +2.5 unrest everywhere and −0.05 legitimacy a month for eight years, and the strict party loses 10.',
        effects: guard('offices:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: 260 });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_offices_sold', name: 'The Offices Sold', months: 96,
            effects: {
              adminMult: 0.94, incomeMult: 0.95, unrestAll: 2.5, legitimacyAdd: -0.05,
            },
          });
          shift(ctx, 'strict', -10);
          shift(ctx, 'worldly', 6);
          answered(ctx, 'statecraftOffices');
        }),
      },
    ],
  },
];
