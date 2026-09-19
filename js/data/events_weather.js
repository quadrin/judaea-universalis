// js/data/events_weather.js — the sky and the rift (SPEC §272).
// Content package: zero imports; every effect runs through ctx.helpers.
//
// §170 gave the campaign a climate and §272 gave it a season. This is the
// third thing weather is, and the one a player actually remembers: the YEAR
// THAT WENT WRONG. A decade of drought is a modifier. The morning the
// earthquake brought down the colonnade is a card.
//
// Three rules shape the pool.
//
// IT IS THIS COUNTRY'S WEATHER AND NOBODY ELSE'S. The Levant is a rift valley
// on a plate boundary with a desert on one side and a sea on the other, and
// its disasters are specific: the earth moves along the Jordan and always
// has (31 BCE, 363, 749, 1033, 1202, 1927 — the list is the same fault every
// time); the Damiya landslides have dammed the river and stopped it dead
// within living memory more than once; the locust comes up out of the south
// in the spring of a wet year; the khamsin blows for three days out of the
// desert at the turn of the season and men die of it; and the winter sea
// takes the grain ships. None of these is generic bad luck. Each is a thing
// this ground does.
//
// IT KNOWS WHAT MONTH IT IS. Every card that belongs to a season says so in
// its trigger, through `ctx.helpers.season` — the latter rain cannot fail in
// Av, the cisterns cannot run dry in Shevat, and hail does not fall on
// standing grain in a month when there is no standing grain. A pool that
// fires its whole hand in any month is a slot machine; a pool that waits for
// its month is a calendar, and a calendar is something a player can plan
// against.
//
// AND IT ASKS FOR MONEY OR IT ASKS FOR ORDER. Almost every card here offers
// the same shape of decision, because it is the decision these events
// actually forced: you can pay for it out of the treasury now, or you can
// let the country carry it and pay in unrest later. That is not a lack of
// imagination. It is what a pre-modern state's disaster relief WAS, and the
// reason a king kept a reserve at all.
//
// Era bands follow the §52 convention exactly: `maxYear: 1799` for the
// antique voice, `minYear: 1900` for the modern one. Nothing here is
// timeless, because the way a state meets a bad year is the most era-bound
// thing about it.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[data/weather]', key, e);
}
// Effects run inside the sim's tick. A content package that throws there
// takes the campaign with it, so every option body is wrapped exactly once.
function guard(key, fn) {
  return (ctx) => { try { fn(ctx); } catch (e) { warnOnce(key, e); } };
}

function T(ctx) { return ctx.game.tags[ctx.game.playerTag]; }
function season(ctx) {
  try { return ctx.helpers.season(ctx); } catch (e) { return 'spring'; }
}
function ownedProvinces(ctx, filter) {
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
function pickWeighty(ctx, list) {
  if (!list.length) return null;
  const sorted = list.slice().sort((a, b) => devTotal(b) - devTotal(a));
  return ctx.rng.pick(sorted.slice(0, Math.max(1, Math.min(5, sorted.length))));
}
function pickAny(ctx, list) {
  return list.length ? ctx.rng.pick(list) : null;
}
// The rift itself: the cells the Jordan–Arabah fault runs through, named
// rather than inferred, because "near the rift" is a fact about the map and
// not about a province's terrain string. A chapter that folds one of these
// away simply has fewer of them, which is correct — the fault does not move,
// but the towns on it come and go.
const RIFT = new Set(['Tiberias', 'Tarichaea', 'Scythopolis', 'Jericho', 'Engaddi',
  'Masada', 'Zoara', 'Pella', 'Gadara', 'Safed', 'Caesarea Philippi', 'Machaerus',
  'Aila', 'Eilat', 'Medaba', 'Petra', 'Gerasa', 'Philadelphia', 'Sepphoris',
  'Neapolis', 'Sebaste', 'Jerusalem', 'Hebron', 'Bethlehem', 'Ramallah',
  'Kiryat Shmona', 'Afula', 'Jenin', 'Beit Shemesh', 'Emmaus', 'Gischala',
  'Batanea', 'Gamala', 'Quneitra', 'Mount Hermon', 'Berytus', 'Sidon', 'Tyre',
  'Ptolemais', 'Tripolis', 'Byblos', 'Chalcis', 'Heliopolis', 'Damascus']);
function riftProvinces(ctx) {
  return ownedProvinces(ctx, (p) => RIFT.has(p.name));
}
// Grain country — where a hailstorm or a locust has anything to eat.
function grainProvinces(ctx) {
  return ownedProvinces(ctx, (p) => p.terrain === 'farmland' || p.terrain === 'coast' || p.terrain === 'drylands');
}
function coastProvinces(ctx) {
  return ownedProvinces(ctx, (p) => p.terrain === 'coast');
}
// Hosts standing in the open on ground the realm does not hold — the column
// a khamsin or a flash flood has something to do to.
function fieldArmies(ctx) {
  try {
    const me = ctx.game.playerTag;
    return (ctx.helpers.armiesOf(ctx, me) || []).filter((a) => {
      const p = a && ctx.byId(a.prov);
      return p && p.controller !== me;
    });
  } catch (e) { return []; }
}
// Take a share off every host in the list, and dispose of anything the wind
// finished — the same convention `monthlyAttrition` uses, because an army
// left standing at zero men is a ghost that garrisons provinces, joins
// battles and never dies. A card may not import `removeArmy`, so it goes
// through the helper.
function bleed(ctx, armies, share) {
  let lost = 0;
  for (const a of armies) {
    if (!a || !(a.men > 0)) continue;
    const n = Math.floor(a.men * share);
    if (n <= 0) continue;
    a.men = Math.max(0, a.men - n);
    lost += n;
    if (a.men <= 0) {
      ctx.helpers.notify(ctx, {
        title: 'A host is gone',
        text: (a.name || 'A column') + ' did not come out of it.',
        type: 'bad',
      });
      ctx.helpers.removeArmy(ctx, a.id);
    }
  }
  return lost;
}

export const WEATHER_EVENTS = [
  // ── the rift moves ───────────────────────────────────────────────────────
  {
    id: 'wx_earthquake',
    maxYear: 1799,
    title: 'The Earth Shakes',
    desc: 'It came in the afternoon, and it came twice. The second was the one that '
      + 'brought the colonnade down. In the streets people are sleeping outdoors because '
      + 'nobody will go back inside, the springs have changed their taste, and from the '
      + 'valley they say the river ran backwards for a morning.',
    forTag: 'player', once: false, cooldownMonths: 180, chance: 0.0055,
    trigger: (ctx) => riftProvinces(ctx).length > 0,
    aiOption: 1,
    options: [
      {
        label: 'Rebuild — and be seen to rebuild',
        tooltip: '−120 talents. The stricken town loses a third of its production for a year, and no more.',
        effects: guard('quake_rebuild', (ctx) => {
          const p = pickWeighty(ctx, riftProvinces(ctx));
          if (!p) return;
          ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: -120 });
          ctx.helpers.addProvinceModifier(ctx, p.name, {
            id: 'quake', name: 'Thrown Down', months: 12, effects: { prodMult: 0.66 },
          });
          ctx.helpers.notify(ctx, {
            title: 'The earth shakes at ' + p.name,
            text: 'The masons are paid before the dust settles. It will be a year before the town earns as it did.',
            type: 'bad', provName: p.name,
          });
          ctx.helpers.chronicle(ctx, 'era', 'An earthquake threw down much of ' + p.name + '. The crown paid for the rebuilding.');
        }),
      },
      {
        label: 'The stones will keep. The people must see to themselves',
        tooltip: 'The stricken town: −45% production and +3 unrest for two years.',
        effects: guard('quake_endure', (ctx) => {
          const p = pickWeighty(ctx, riftProvinces(ctx));
          if (!p) return;
          ctx.helpers.addProvinceModifier(ctx, p.name, {
            id: 'quake', name: 'Thrown Down', months: 24, effects: { prodMult: 0.55, unrest: 3 },
          });
          ctx.helpers.notify(ctx, {
            title: 'The earth shakes at ' + p.name,
            text: 'Nothing is ordered and nothing is paid. The rubble is still there in the spring.',
            type: 'bad', provName: p.name,
          });
          ctx.helpers.chronicle(ctx, 'era', 'An earthquake threw down much of ' + p.name + ', and nothing was done about it.');
        }),
      },
    ],
  },
  {
    id: 'wx_jordan_stopped',
    maxYear: 1799,
    title: 'The River Stands Still',
    desc: 'A cliff came down at the Damiya ford in the night and took half the valley '
      + 'wall with it. The Jordan is dammed. Below the slide the bed is drying in the sun '
      + 'and men are walking across it dry-shod, which every one of them knows is a thing '
      + 'that happened once before, to a generation that was going somewhere.',
    forTag: 'player', once: false, cooldownMonths: 240, chance: 0.003,
    trigger: (ctx) => riftProvinces(ctx).length >= 2 && season(ctx) !== 'rains',
    aiOption: 0,
    options: [
      {
        label: 'Let the priests say what it means',
        tooltip: '+1 stability, and "A Sign at the Ford" — −1 unrest everywhere for a year.',
        effects: guard('jordan_sign', (ctx) => {
          ctx.helpers.adjust(ctx, ctx.game.playerTag, { stability: 1 });
          ctx.helpers.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'ford_sign', name: 'A Sign at the Ford', months: 12, effects: { unrestAll: -1 },
          });
          ctx.helpers.chronicle(ctx, 'era', 'The Jordan was dammed at the ford and ran dry below it. The priests were asked what it meant.');
        }),
      },
      {
        label: 'Send men to cut the slide before the valley floods',
        tooltip: '−50 talents, +150 manpower back when the work is done.',
        effects: guard('jordan_cut', (ctx) => {
          ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: -50, manpower: 150 });
          ctx.helpers.chronicle(ctx, 'era', 'The Jordan was dammed at the ford. Gangs were sent down to cut the slide open.');
        }),
      },
    ],
  },

  // ── what the sky does to the harvest ─────────────────────────────────────
  {
    id: 'wx_locusts',
    weather: 'good', // a wet spring is what breeds them — the swarm follows the grass
    maxYear: 1799,
    title: 'A Darkness Out of the South',
    desc: 'The watchmen saw it as weather, low and brown along the horizon, and were '
      + 'still calling it weather when the sound arrived. What the cutter left the swarmer '
      + 'ate and what the swarmer left the crawler ate. In three days the barley country '
      + 'is the colour of the road.',
    forTag: 'player', once: false, cooldownMonths: 96, chance: 0.012,
    trigger: (ctx) => grainProvinces(ctx).length >= 2 && (season(ctx) === 'spring' || season(ctx) === 'harvest'),
    aiOption: 1,
    options: [
      {
        label: 'Buy grain from abroad before the price moves',
        tooltip: '−90 talents. The country eats.',
        effects: guard('locust_buy', (ctx) => {
          ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: -90 });
          ctx.helpers.chronicle(ctx, 'era', 'Locusts took the barley. The crown bought grain abroad.');
        }),
      },
      {
        label: 'Proclaim a fast and a solemn assembly',
        tooltip: 'Two grain provinces: −40% tax for 18 months. +1 legitimacy for meeting it in the old way.',
        effects: guard('locust_fast', (ctx) => {
          const fields = grainProvinces(ctx);
          for (let i = 0; i < 2 && fields.length; i++) {
            const p = pickWeighty(ctx, fields);
            if (!p) break;
            fields.splice(fields.indexOf(p), 1);
            ctx.helpers.addProvinceModifier(ctx, p.name, {
              id: 'locust', name: 'Eaten Bare', months: 18, effects: { taxMult: 0.6 },
            });
          }
          ctx.helpers.adjust(ctx, ctx.game.playerTag, { legitimacy: 4 });
          ctx.helpers.chronicle(ctx, 'era', 'Locusts took the barley, and a fast was proclaimed.');
        }),
      },
    ],
  },
  {
    id: 'wx_latter_rain_fails',
    weather: 'bad',
    maxYear: 1799,
    title: 'The Latter Rain Does Not Come',
    desc: 'Adar went out clear. The barley is in the ear and there is no water behind '
      + 'it, and every farmer in the hill country can already tell you the number of the '
      + 'harvest to within a tenth. The early rain was enough to plant on. The late one '
      + 'was the one that mattered.',
    forTag: 'player', once: false, cooldownMonths: 60, chance: 0.05,
    trigger: (ctx) => season(ctx) === 'spring' && grainProvinces(ctx).length >= 1,
    aiOption: 1,
    options: [
      {
        label: 'Remit this year\'s tax in the hill country',
        tooltip: '−70 talents, and the country remembers it: +1 stability.',
        effects: guard('latter_remit', (ctx) => {
          ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: -70, stability: 1 });
          ctx.helpers.chronicle(ctx, 'era', 'The latter rain failed. The crown remitted the tax.');
        }),
      },
      {
        label: 'The assessment stands',
        tooltip: '"A Thin Year": −1 income and +1 unrest across the realm for a year.',
        effects: guard('latter_stand', (ctx) => {
          ctx.helpers.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'thin_year', name: 'A Thin Year', months: 12,
            effects: { incomeMult: 0.88, unrestAll: 1 },
          });
          ctx.helpers.chronicle(ctx, 'era', 'The latter rain failed and the assessment stood.');
        }),
      },
    ],
  },
  {
    id: 'wx_hail',
    maxYear: 1799,
    title: 'Hail on the Standing Grain',
    desc: 'It lasted the length of a psalm and it flattened everything it touched. '
      + 'Where the storm went there is no harvest; two hours\' walk either side of it the '
      + 'year is untouched, which is somehow the part nobody can be consoled about.',
    forTag: 'player', once: false, cooldownMonths: 72, chance: 0.014,
    trigger: (ctx) => grainProvinces(ctx).length >= 1 && (season(ctx) === 'spring' || season(ctx) === 'harvest'),
    aiOption: 0,
    options: [
      {
        label: 'One district loses its year',
        tooltip: 'A grain province: −50% tax and production for a year.',
        effects: guard('hail', (ctx) => {
          const p = pickAny(ctx, grainProvinces(ctx));
          if (!p) return;
          ctx.helpers.addProvinceModifier(ctx, p.name, {
            id: 'hail', name: 'Beaten Flat', months: 12, effects: { taxMult: 0.5, prodMult: 0.5 },
          });
          ctx.helpers.notify(ctx, {
            title: 'Hail at ' + p.name, text: 'The standing grain of ' + p.name + ' is on the ground.',
            type: 'bad', provName: p.name,
          });
        }),
      },
    ],
  },
  {
    id: 'wx_early_rain_on_time',
    weather: 'good',
    maxYear: 1799,
    title: 'The Early Rain, on the Day',
    desc: 'It began in the afternoon of the seventeenth of Marheshvan, which is the day '
      + 'the sages say it ought to begin, and it did not stop until the cisterns were '
      + 'talking. Ploughing started the same week. The whole country is in a good mood, '
      + 'and a country in a good mood is a fact a treasury can spend.',
    forTag: 'player', once: false, cooldownMonths: 48, chance: 0.03,
    trigger: (ctx) => season(ctx) === 'rains' && grainProvinces(ctx).length >= 1,
    aiOption: 0,
    options: [
      {
        label: 'A good year is coming',
        tooltip: '"The Rains Came Right": +10% income and −1 unrest across the realm for a year.',
        effects: guard('early_rain', (ctx) => {
          ctx.helpers.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'rains_right', name: 'The Rains Came Right', months: 12,
            effects: { incomeMult: 1.1, unrestAll: -1 },
          });
        }),
      },
    ],
  },
  {
    id: 'wx_springs_rise',
    weather: 'good',
    maxYear: 1799,
    title: 'The Springs Rise',
    desc: 'The spring at the foot of the town has come up a hand\'s breadth and held '
      + 'there since Tishri, and the old men who measure such things against a particular '
      + 'stone say they have not seen it this high in forty years. The watered land below '
      + 'it has quietly doubled.',
    forTag: 'player', once: false, cooldownMonths: 96, chance: 0.01,
    trigger: (ctx) => ownedProvinces(ctx).length >= 3,
    aiOption: 0,
    options: [
      {
        // Bounded at twenty years rather than permanent, and the bound is
        // the honest one: a spring that came up in a wet cycle goes down in
        // the dry one that follows it, and §170's cycle turns over in about
        // twenty-five. An unbounded +25% that a repeatable card can stack
        // across a dozen provinces in a long campaign is not a good year, it
        // is a leak.
        label: 'Dig the channels out to the new line',
        tooltip: '−40 talents. A province gains +25% production for twenty years, while the water holds.',
        effects: guard('springs', (ctx) => {
          const p = pickWeighty(ctx, ownedProvinces(ctx, (q) => q.terrain !== 'desert'));
          if (!p) return;
          ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: -40 });
          ctx.helpers.addProvinceModifier(ctx, p.name, {
            id: 'new_springs', name: 'The Springs Rose', months: 240, effects: { prodMult: 1.25 },
          });
          ctx.helpers.notify(ctx, {
            title: 'Water at ' + p.name, text: 'The channels are cut to the new line. ' + p.name + ' waters land it never watered.',
            type: 'econ', provName: p.name,
          });
        }),
      },
    ],
  },

  // ── the wind, and what it does to armies ─────────────────────────────────
  {
    id: 'wx_khamsin',
    maxYear: 1799,
    title: 'The Khamsin',
    desc: 'It comes up out of the desert at the turn of the season and it blows for '
      + 'three days. The air is the colour of brass, the temperature climbs through the '
      + 'night instead of falling, and everything anyone owns is full of sand. Men in the '
      + 'open drink their ration by noon and then have the rest of the day to get through.',
    forTag: 'player', once: false, cooldownMonths: 30, chance: 0.05,
    trigger: (ctx) => fieldArmies(ctx).length > 0 && (season(ctx) === 'spring' || season(ctx) === 'heat'),
    aiOption: 1,
    options: [
      {
        label: 'Halt the columns and sit it out',
        tooltip: 'Nothing is lost but three days — and whatever those three days were for.',
        effects: guard('khamsin_halt', (ctx) => {
          for (const a of fieldArmies(ctx)) { if (a) { a.path = []; a.moveDaysLeft = 0; } }
          ctx.helpers.chronicle(ctx, 'war', 'A khamsin blew for three days and the army sat down where it stood.');
        }),
      },
      {
        label: 'March. The enemy is in it too',
        tooltip: 'Every host in the field loses 4% of its men to the wind.',
        effects: guard('khamsin_march', (ctx) => {
          const lost = bleed(ctx, fieldArmies(ctx), 0.04);
          if (!lost) return;
          ctx.helpers.notify(ctx, {
            title: 'The wind takes its toll',
            text: lost.toLocaleString() + ' men fell out of the column in three days of khamsin.',
            type: 'war',
          });
          ctx.helpers.chronicle(ctx, 'war', 'The army marched through the khamsin and left ' + lost.toLocaleString() + ' men in the dust.');
        }),
      },
    ],
  },
  {
    id: 'wx_wadi_flood',
    maxYear: 1799,
    title: 'The Wadi Comes Down',
    desc: 'It had not rained where the column was. It had rained somewhere up the '
      + 'catchment, two hours earlier, and the first anyone knew of it was the noise. A '
      + 'dry bed forty cubits wide went to chest-deep in the time it takes to shout, and '
      + 'took the baggage with it.',
    forTag: 'player', once: false, cooldownMonths: 36, chance: 0.045,
    trigger: (ctx) => fieldArmies(ctx).length > 0 && season(ctx) === 'rains',
    aiOption: 0,
    options: [
      {
        label: 'Count what is left',
        tooltip: 'A host in the field loses 3% of its men and the crown 35 talents of baggage.',
        effects: guard('wadi', (ctx) => {
          const armies = fieldArmies(ctx);
          const one = armies.length ? [ctx.rng.pick(armies)] : [];
          const lost = bleed(ctx, one, 0.03);
          ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: -35 });
          if (lost) {
            ctx.helpers.notify(ctx, {
              title: 'A wadi in flood',
              text: 'The baggage is gone and ' + lost.toLocaleString() + ' men with it.',
              type: 'war',
            });
          }
        }),
      },
    ],
  },
  {
    id: 'wx_snow_passes',
    maxYear: 1799,
    title: 'Snow on the Passes',
    desc: 'Snow in Jerusalem is a thing that happens perhaps twice in a reign, and it '
      + 'is happening. The highland roads are shut, the Hermon is white to its foot, and '
      + 'nothing is moving between the ridge and the coast until it goes.',
    forTag: 'player', once: false, cooldownMonths: 60, chance: 0.022,
    trigger: (ctx) => season(ctx) === 'rains' && ownedProvinces(ctx, (p) => p.terrain === 'hills' || p.terrain === 'mountains').length >= 1,
    aiOption: 0,
    options: [
      {
        label: 'Nothing moves until it goes',
        tooltip: 'The highland provinces: −25% tax for four months. Every column in the field halts.',
        effects: guard('snow', (ctx) => {
          const high = ownedProvinces(ctx, (p) => p.terrain === 'hills' || p.terrain === 'mountains');
          for (const p of high.slice(0, 4)) {
            ctx.helpers.addProvinceModifier(ctx, p.name, {
              id: 'snowbound', name: 'Snowbound', months: 4, effects: { taxMult: 0.75 },
            });
          }
          for (const a of fieldArmies(ctx)) { if (a) { a.path = []; a.moveDaysLeft = 0; } }
          ctx.helpers.chronicle(ctx, 'era', 'Snow shut the highland roads.');
        }),
      },
    ],
  },

  // ── water, and the lack of it ────────────────────────────────────────────
  {
    id: 'wx_cisterns_fail',
    weather: 'bad',
    maxYear: 1799,
    title: 'The Cisterns Are Going Down',
    desc: 'The engineer has been sounding them every week since Sivan and he has stopped '
      + 'reporting the depth and started reporting the days. The rock cisterns of the '
      + 'highland hold one winter, and this winter did not fill them. Nobody will say the '
      + 'word siege out loud, but that is the number he is counting.',
    forTag: 'player', once: false, cooldownMonths: 84, chance: 0.028,
    trigger: (ctx) => season(ctx) === 'heat'
      && ownedProvinces(ctx, (p) => (p.fort | 0) > 0 || devTotal(p) >= 8).length >= 1,
    aiOption: 1,
    options: [
      {
        label: 'Cut a new shaft to the spring, whatever it costs',
        tooltip: '−110 talents. The fortress province gains +1 to its walls, permanently.',
        effects: guard('cistern_shaft', (ctx) => {
          const p = pickWeighty(ctx, ownedProvinces(ctx, (q) => (q.fort | 0) > 0 || devTotal(q) >= 8));
          if (!p) return;
          ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: -110 });
          p.fort = Math.min(6, (p.fort | 0) + 1);
          ctx.helpers.notify(ctx, {
            title: 'Water for ' + p.name,
            text: 'The shaft is cut and the town can hold through a dry summer. Its walls are worth more than they were.',
            type: 'good', provName: p.name,
          });
          ctx.helpers.chronicle(ctx, 'era', 'A water shaft was cut at ' + p.name + '.');
        }),
      },
      {
        label: 'Ration it and pray for Marheshvan',
        tooltip: 'A town: +3 unrest and −30% production until the rains.',
        effects: guard('cistern_ration', (ctx) => {
          const p = pickWeighty(ctx, ownedProvinces(ctx, (q) => (q.fort | 0) > 0 || devTotal(q) >= 8));
          if (!p) return;
          ctx.helpers.addProvinceModifier(ctx, p.name, {
            id: 'thirst', name: 'Rationed Water', months: 5, effects: { unrest: 3, prodMult: 0.7 },
          });
          ctx.helpers.notify(ctx, {
            title: 'Water rationed at ' + p.name,
            text: 'One jar a household a day, and a queue at the shaft that starts before dawn.',
            type: 'bad', provName: p.name,
          });
        }),
      },
    ],
  },
  {
    id: 'wx_great_heat',
    weather: 'bad',
    maxYear: 1799,
    title: 'A Summer Without Mercy',
    desc: 'Forty days and the wind has not turned once. The flocks are being driven '
      + 'north two months early, the shallow wells are sand, and in the villages of the '
      + 'plain they are burying the very old and the very young at a rate the scribes '
      + 'have started writing down.',
    forTag: 'player', once: false, cooldownMonths: 96, chance: 0.02,
    trigger: (ctx) => season(ctx) === 'heat' && ownedProvinces(ctx).length >= 3,
    aiOption: 1,
    options: [
      {
        label: 'Open the royal wells and the stores',
        tooltip: '−80 talents, +1 stability.',
        effects: guard('heat_open', (ctx) => {
          ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: -80, stability: 1 });
          ctx.helpers.chronicle(ctx, 'era', 'A hard summer. The royal wells were opened.');
        }),
      },
      {
        label: 'Endure it',
        tooltip: '"The Hard Summer": +1.5 unrest and −8% manpower across the realm for eight months.',
        effects: guard('heat_endure', (ctx) => {
          ctx.helpers.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'hard_summer', name: 'The Hard Summer', months: 8,
            effects: { unrestAll: 1.5, manpowerMult: 0.92 },
          });
        }),
      },
    ],
  },

  // ── the winter sea ───────────────────────────────────────────────────────
  {
    id: 'wx_winter_sea',
    maxYear: 1799,
    title: 'The Sea Takes Them',
    desc: 'They sailed in Kislev because the price was good in Kislev, which is the '
      + 'same reason anyone ever sails in Kislev. The first anyone at the harbour knew '
      + 'was cargo coming ashore down the whole length of the beach for a week, and then '
      + 'a spar with a name on it.',
    forTag: 'player', once: false, cooldownMonths: 48, chance: 0.03,
    trigger: (ctx) => season(ctx) === 'rains' && coastProvinces(ctx).length >= 1,
    aiOption: 0,
    options: [
      {
        label: 'Post the loss',
        tooltip: '−55 talents, and a port town takes +2 unrest for half a year.',
        effects: guard('winter_sea', (ctx) => {
          const p = pickWeighty(ctx, coastProvinces(ctx));
          ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: -55 });
          if (p) {
            ctx.helpers.addProvinceModifier(ctx, p.name, {
              id: 'sea_loss', name: 'The Winter Sea', months: 6, effects: { unrest: 2 },
            });
          }
          ctx.helpers.chronicle(ctx, 'trade', 'A ship was lost out of season in the winter sea.');
        }),
      },
      {
        label: 'Forbid sailing between the rains — by proclamation',
        tooltip: '−15% trade for the four winter months, but it will not happen again this year.',
        effects: guard('winter_sea_ban', (ctx) => {
          ctx.helpers.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'mare_clausum', name: 'The Sea Is Shut', months: 4, effects: { tradeMult: 0.85 },
          });
          ctx.helpers.chronicle(ctx, 'trade', 'Sailing was forbidden between the early rain and the latter rain.');
        }),
      },
    ],
  },

  // ── signs ────────────────────────────────────────────────────────────────
  {
    id: 'wx_eclipse',
    maxYear: 1799,
    title: 'The Sun Is Eaten',
    desc: 'In the month of Simanu the sun went out at midday and the stars came out '
      + 'with it. The birds went to roost. It lasted the length of a slow walk across a '
      + 'courtyard and then it came back, and not one person who saw it will ever describe '
      + 'it the same way twice. The scribes have written it into the year\'s heading, '
      + 'which is how a date gets fixed for a thousand years.',
    forTag: 'player', once: false, cooldownMonths: 240, chance: 0.004,
    trigger: (ctx) => !!T(ctx),
    aiOption: 0,
    options: [
      {
        label: 'A sign against our enemies',
        tooltip: '+5 legitimacy and "The Sign" — +10% morale for six months.',
        effects: guard('eclipse_us', (ctx) => {
          ctx.helpers.adjust(ctx, ctx.game.playerTag, { legitimacy: 5 });
          ctx.helpers.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_sign', name: 'The Sign', months: 6, effects: { moraleMult: 1.1 },
          });
          ctx.helpers.chronicle(ctx, 'era', 'The sun was darkened at midday, and the court read it as a sign against our enemies.');
        }),
      },
      {
        label: 'A sign against us. Let the king fast',
        tooltip: '+1 stability. The court is steadied and the country sees the crown afraid of the right things.',
        effects: guard('eclipse_them', (ctx) => {
          ctx.helpers.adjust(ctx, ctx.game.playerTag, { stability: 1 });
          ctx.helpers.chronicle(ctx, 'era', 'The sun was darkened at midday, and the king fasted.');
        }),
      },
    ],
  },
  {
    id: 'wx_comet',
    maxYear: 1799,
    title: 'A Sword Over the City',
    desc: 'It has hung in the north-west for a month now and it is getting longer. '
      + 'Everyone agrees on what it looks like, which is the trouble: a star with a sword '
      + 'behind it, standing over the city. The people who are certain it means nothing '
      + 'have stopped saying so in the market.',
    forTag: 'player', once: false, cooldownMonths: 180, chance: 0.006,
    trigger: (ctx) => !!T(ctx),
    aiOption: 1,
    options: [
      {
        label: 'Let the preachers preach it',
        tooltip: '+1.5 unrest across the realm for a year — and +12% manpower while men believe the end is worth fighting for.',
        effects: guard('comet_preach', (ctx) => {
          ctx.helpers.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'the_sword_sign', name: 'A Sword Over the City', months: 12,
            effects: { unrestAll: 1.5, manpowerMult: 1.12 },
          });
          ctx.helpers.chronicle(ctx, 'era', 'A comet stood over the city like a sword, and the preachers were not silenced.');
        }),
      },
      {
        label: 'The astronomers will explain it. Publicly',
        tooltip: '−25 talents for the assembly and the proclamation. Nothing happens, which is the point.',
        effects: guard('comet_explain', (ctx) => {
          ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: -25 });
          ctx.helpers.chronicle(ctx, 'era', 'A comet stood over the city, and the court had it explained away.');
        }),
      },
    ],
  },
  {
    id: 'wx_red_dust',
    maxYear: 1799,
    title: 'The Dust Falls Red',
    desc: 'The wind came round to the south-east and for two days everything under the '
      + 'sky took a coat of fine red dust — the roofs, the cisterns, the washing, the white '
      + 'stone of the temple court. It is only the desert, blown a long way. It does not '
      + 'look like only the desert.',
    forTag: 'player', once: false, cooldownMonths: 54, chance: 0.02,
    trigger: (ctx) => season(ctx) === 'spring' || season(ctx) === 'heat',
    aiOption: 0,
    options: [
      {
        label: 'Wash it off and say nothing',
        tooltip: '+0.5 unrest across the realm for three months. It passes.',
        effects: guard('red_dust', (ctx) => {
          ctx.helpers.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'red_dust', name: 'The Red Dust', months: 3, effects: { unrestAll: 0.5 },
          });
        }),
      },
    ],
  },

  // ── 1948: the same sky, a different state ────────────────────────────────
  {
    id: 'wx_modern_mud',
    minYear: 1900,
    title: 'The Road Is Mud to the Axles',
    desc: 'Thirty vehicles left the plain before dawn and the lead three are in the ditch '
      + 'at the second bend, and the rest of the column is behind them in the dark with '
      + 'nowhere to turn. The engineers are laying brushwood by hand. Whoever is up on the '
      + 'ridge does not need to do anything at all except wait for the light.',
    forTag: 'player', once: false, cooldownMonths: 24, chance: 0.055,
    trigger: (ctx) => season(ctx) === 'rains' && fieldArmies(ctx).length > 0,
    aiOption: 1,
    options: [
      {
        label: 'Turn the column around',
        tooltip: 'Every column in the field stops where it is.',
        effects: guard('mud_turn', (ctx) => {
          for (const a of fieldArmies(ctx)) { if (a) { a.path = []; a.moveDaysLeft = 0; } }
          ctx.helpers.chronicle(ctx, 'war', 'The winter road beat the convoy and it turned back.');
        }),
      },
      {
        label: 'Corduroy the road and push through tonight',
        tooltip: '−45 talents and 2% of the men in the field, but the column arrives.',
        effects: guard('mud_push', (ctx) => {
          ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: -45 });
          bleed(ctx, fieldArmies(ctx), 0.02);
          ctx.helpers.chronicle(ctx, 'war', 'Brushwood was laid the length of the bend and the convoy went through in the dark.');
        }),
      },
    ],
  },
  {
    id: 'wx_modern_khamsin',
    minYear: 1900,
    title: 'Khamsin Over the Line',
    desc: 'Forty-one degrees at nine in the morning and climbing. Half the men on the '
      + 'ridge came up last week from a boat and have never been warm in their lives, let '
      + 'alone this. The water truck is one truck. The reports coming back are not about '
      + 'the enemy at all; they are about how many men are still standing up.',
    forTag: 'player', once: false, cooldownMonths: 30, chance: 0.05,
    trigger: (ctx) => (season(ctx) === 'spring' || season(ctx) === 'heat') && fieldArmies(ctx).length > 0,
    aiOption: 0,
    options: [
      {
        label: 'Water forward before anything else',
        tooltip: '−40 talents. The line holds.',
        effects: guard('mkhamsin_water', (ctx) => {
          ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: -40 });
          ctx.helpers.chronicle(ctx, 'war', 'A khamsin over the line. Everything that could carry water went forward.');
        }),
      },
      {
        label: 'The attack goes in as ordered',
        tooltip: '5% of the men in the field, and −8% morale for two months.',
        effects: guard('mkhamsin_attack', (ctx) => {
          const lost = bleed(ctx, fieldArmies(ctx), 0.05);
          ctx.helpers.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'heat_exhaustion', name: 'Heat Exhaustion', months: 2, effects: { moraleMult: 0.92 },
          });
          if (lost) {
            ctx.helpers.notify(ctx, {
              title: 'The heat, not the enemy',
              text: lost.toLocaleString() + ' men went down in the khamsin.',
              type: 'war',
            });
          }
        }),
      },
    ],
  },
  {
    id: 'wx_modern_drought',
    minYear: 1900,
    weather: 'bad',
    title: 'The Reservoirs Are Measured in Weeks',
    desc: 'The hydrological service has stopped issuing monthly figures and started '
      + 'issuing weekly ones, which is the only announcement it needed to make. The '
      + 'agricultural settlements are asking what the allocation will be. The answer '
      + 'depends on a pipeline that is not built.',
    forTag: 'player', once: false, cooldownMonths: 72, chance: 0.025,
    trigger: (ctx) => ownedProvinces(ctx).length >= 4,
    aiOption: 0,
    options: [
      {
        label: 'Fund the pipeline',
        tooltip: '−150 talents. Two provinces gain +20% production, permanently.',
        effects: guard('mdrought_pipe', (ctx) => {
          ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: -150 });
          const list = ownedProvinces(ctx, (p) => p.terrain !== 'mountains');
          for (let i = 0; i < 2 && list.length; i++) {
            const p = pickWeighty(ctx, list);
            if (!p) break;
            list.splice(list.indexOf(p), 1);
            ctx.helpers.addProvinceModifier(ctx, p.name, {
              id: 'water_line', name: 'On the Water Line', months: -1, effects: { prodMult: 1.2 },
            });
          }
          ctx.helpers.chronicle(ctx, 'era', 'The water line was funded.');
        }),
      },
      {
        label: 'Ration the allocation',
        tooltip: '−12% income and +1 unrest across the realm for a year.',
        effects: guard('mdrought_ration', (ctx) => {
          ctx.helpers.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'water_ration', name: 'Water Rationing', months: 12,
            effects: { incomeMult: 0.88, unrestAll: 1 },
          });
        }),
      },
    ],
  },
  {
    id: 'wx_modern_storm',
    minYear: 1900,
    title: 'Weather Closes the Field',
    desc: 'Low cloud on the deck and a crosswind off the sea, and the strip is a strip '
      + 'of mud with a windsock on it. Nothing is going up today and nothing is coming in, '
      + 'and the one thing that was supposed to arrive today was arriving by air.',
    forTag: 'player', once: false, cooldownMonths: 18, chance: 0.04,
    trigger: (ctx) => season(ctx) === 'rains',
    aiOption: 0,
    options: [
      {
        label: 'Everything waits for the ceiling to lift',
        tooltip: '"Field Closed": −20% naval strength for a month, and nothing flies.',
        effects: guard('mstorm', (ctx) => {
          ctx.helpers.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'field_closed', name: 'Field Closed', months: 1, effects: { navalMult: 0.8 },
          });
          ctx.helpers.chronicle(ctx, 'war', 'Weather closed the field for a week.');
        }),
      },
    ],
  },
];
