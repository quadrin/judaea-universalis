// Judaea Universalis — the other side of the line: 621–699 CE (SPEC §241).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// In this chapter the ring is replaced twice inside one lifetime. A man born
// in 610 grows up under Rome, is governed by a Persian marzban in his teens,
// sees Rome return in his thirties and the caliphate arrive in his forties,
// and dies with a garrison city on the Euphrates as the capital of his world.
// Every neighbour in this file is either brand new or has just changed
// masters: the marzban, the restored patriarchates, the amsar, the Copts, the
// Armenians who have to choose, the Khazars appearing on the northern steppe,
// and the two hierarchies claiming the same city.
//
// §240 gave this chapter its institutions. This is who those institutions had
// to deal with, and the answer changes about every fifteen years.
//
// Sources: Sebeos and the Armenian historians for the marzbans and the
// Armenian choice; al-Baladhuri and al-Tabari for the garrison cities and the
// treaties; John of Nikiu and the Coptic sources for Egypt; the Khazar
// correspondence and Theophanes for the northern steppe; the Jerusalem
// patriarchal lists for the hierarchies.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_614ce_neighbours] ' + key, e || '');
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

function P(ctx) { return ctx.game.playerTag; }

function mod(ctx, id, name, effects, months) {
  ctx.helpers.addTagModifier(ctx, P(ctx), {
    id, name, months: Number.isFinite(months) ? months : -1, effects,
  });
}

export const EVENTS_614_NEIGHBOURS = [

  // ── 621 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev614n_the_marzbans_province',
    title: 'The Marzban\'s Province',
    desc: 'The new administration is a satrapy and it behaves like one. A marzban at Caesarea '
      + 'with a small staff and a large military escort, a fixed tribute assessed on districts '
      + 'rather than on heads, the old municipal machinery left running because replacing it '
      + 'would cost more than it collects, and a stated indifference to what anybody believes '
      + 'that is genuine and is also a policy.\n\n'
      + 'For the communities of this country the change is enormous and almost entirely '
      + 'procedural. The empire that legislated about synagogue building and inheritance and '
      + 'testimony has been replaced by one that wants a number by a date. Nobody knows how '
      + 'long it lasts. Everybody can see what to do with it while it does.',
    forTag: 'player',
    date: { y: 621, m: 5 },
    aiOption: 0,
    historical: 'Sasanian administration of the Levant, 614–628, ran on district tribute and existing municipal structures, with markedly less religious legislation than its predecessor.',
    options: [
      {
        label: 'Take the district assessment onto our own books',
        tooltip: '−40 talents to organise the collection: +16 governance points and "The District Assessment" (+9% income, −0.6 unrest everywhere, −5% cost of governing) for twenty years. One number, one date, and everything inside it decided here.',
        effects: guard('marz:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, gov: 16 });
          mod(ctx, 'the_district_assessment', 'The District Assessment', { incomeMult: 1.09, unrestAll: -0.6, adminMult: 0.95 }, 240);
          h.setFlag(ctx, 'districtAssessment', true);
          h.chronicle(ctx, 'era', 'The tribute is taken onto the community\'s own books and paid '
            + 'as one sum on one date. Everything about how it is raised is decided in this '
            + 'country for the first time in six hundred years.');
        }),
      },
      {
        label: 'Get the privileges written down while the writing is cheap',
        tooltip: '−30 talents: +14 influence points and "The Satrapal Charter" (+7% income, −0.5 unrest everywhere) for twenty years. A document from an administration that does not care is worth more than one from an administration that does.',
        effects: guard('marz:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, infl: 14 });
          mod(ctx, 'the_satrapal_charter', 'The Satrapal Charter', { incomeMult: 1.07, unrestAll: -0.5 }, 240);
          h.chronicle(ctx, 'diplomacy', 'Every privilege anybody could think of is written down '
            + 'and sealed by an administration with no opinion about any of it. Some of the '
            + 'clauses are still being cited under three later governments.');
        }),
      },
      {
        label: 'Assume it is temporary and commit to nothing',
        tooltip: '+12 governance points and "The Interval" (−0.5 unrest everywhere, +4% income) for fifteen years. It is temporary — fourteen years — and a community that took nothing from it has nothing to give back.',
        effects: guard('marz:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12 });
          mod(ctx, 'the_interval', 'The Interval', { unrestAll: -0.5, incomeMult: 1.04 }, 180);
          h.chronicle(ctx, 'era', 'Nothing is taken from the new administration and nothing is '
            + 'promised to it. When it ends, fourteen years later, there is nothing to be '
            + 'produced against anybody.');
        }),
      },
    ],
  },

  // ── 631 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev614n_the_patriarchates_return',
    title: 'The Patriarchates Return',
    desc: 'The emperor has restored the hierarchies, and restoring a hierarchy in this century '
      + 'means restoring an administration. The patriarch is back in the city with his estates, '
      + 'his courts and his clergy; the sees along the coast are refilled; the endowments are '
      + 'returned; and the men who spent fourteen years running their towns in the absence of '
      + 'all of it are being asked to hand the keys back.\n\n'
      + 'The emperor has also arrived with a doctrinal formula designed to reconcile the '
      + 'churches, which pleases nobody and creates a third party. Every neighbour in every '
      + 'town is now sorting itself into one of three positions, and for once this community '
      + 'is not the thing anybody is arguing about.',
    forTag: 'player',
    date: { y: 631, m: 8 },
    aiOption: 1,
    historical: 'Heraclius restored the eastern hierarchies after 629 and promoted Monotheletism as a reconciling formula; it produced a third contested party instead of a settlement.',
    options: [
      {
        label: 'Settle the property questions before the courts reopen',
        tooltip: '−45 talents on the surveys and the agreements: +14 governance points and "Settled Before the Bench" (+7% income, −0.6 unrest everywhere) for twenty years. Fourteen years of transfers, agreed by negotiation instead of litigated for a generation.',
        effects: guard('patr:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, gov: 14 });
          mod(ctx, 'settled_before_the_bench', 'Settled Before the Bench', { incomeMult: 1.07, unrestAll: -0.6 }, 240);
          h.setFlag(ctx, 'settledBeforeBench', true);
          h.chronicle(ctx, 'era', 'Every property question from the fourteen years is settled by '
            + 'agreement before a single court reopens. It costs money and it avoids a '
            + 'generation of suits.');
        }),
      },
      {
        label: 'Deal with all three parties and be indispensable to each',
        tooltip: '−35 talents: +14 influence points and "Three Parties" (+8% income, −0.5 unrest everywhere) for twenty-five years. A quarrel among three churches is the safest weather this community has had in three centuries.',
        effects: guard('patr:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, infl: 14 });
          mod(ctx, 'three_parties', 'Three Parties', { incomeMult: 1.08, unrestAll: -0.5 }, 300);
          h.chronicle(ctx, 'diplomacy', 'Relations are kept with all three ecclesiastical '
            + 'parties and taken with none. Each of them has a reason to want this community '
            + 'undisturbed, which is a novelty worth the expense.');
        }),
      },
      {
        label: 'Keep what was taken up in the interval',
        tooltip: '+70 talents\' worth of buildings, land and offices retained, and "What We Kept" (+8% income) for fifteen years, with +1.1 unrest everywhere for eight and a restored hierarchy that has a list.',
        effects: guard('patr:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 70, legitimacy: -6 });
          mod(ctx, 'what_we_kept', 'What We Kept', { incomeMult: 1.08, unrestAll: 1.1 }, 180);
          h.chronicle(ctx, 'era', 'What was taken up during the interval is kept. It is worth a '
            + 'great deal and it is itemised, by somebody, in a document that does not go '
            + 'away.');
        }),
      },
    ],
  },

  // ── 641 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev614n_the_garrison_cities',
    title: 'The Garrison Cities',
    desc: 'The new power is not settling in the old cities. It is building its own — on the '
      + 'desert edge, at the head of the Gulf, beside the Nile — laid out by tribe, with a '
      + 'mosque and a governor\'s house at the centre and a register of who is entitled to a '
      + 'share of the revenue. Within a decade they are the largest cities in their regions '
      + 'and they contain almost nobody who was born there.\n\n'
      + 'The design is deliberate and it changes everything for the old towns. The conquerors '
      + 'are not moving into Damascus and Caesarea and becoming their governing class; they '
      + 'are living apart, drawing a stipend, and administering through whoever was already '
      + 'doing it. Which means the men who ran these provinces last year are running them this '
      + 'year, for a different treasury, and the question in front of every notable in this '
      + 'country is whether to be one of them.',
    forTag: 'player',
    date: { y: 641, m: 6 },
    aiOption: 0,
    historical: 'The amsar — Kufa, Basra, Fustat — were founded as tribal garrison cities with stipend registers; the conquered provinces were administered through existing local officials for two generations.',
    options: [
      {
        label: 'Take the administration: our clerks, their treasury',
        tooltip: '−35 talents on the training and the placements: +16 governance points and "The Clerks of the New Order" (+10% income, −5% cost of governing, −0.5 unrest everywhere) for thirty years.',
        effects: guard('amsar:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, gov: 16 });
          mod(ctx, 'clerks_of_the_new_order', 'The Clerks of the New Order', { incomeMult: 1.10, adminMult: 0.95, unrestAll: -0.5 }, 360);
          h.setFlag(ctx, 'clerksOfNewOrder', true);
          h.chronicle(ctx, 'era', 'The community\'s clerks take the provincial administration '
            + 'under the new treasury. The same registers, the same hands, a different name at '
            + 'the top of the page.');
        }),
      },
      {
        label: 'Supply the new cities: they build, eat and buy everything',
        tooltip: '−45 talents to establish the trade: "The Amsar Trade" (+12% income, +8% trade) for thirty years. A hundred thousand people in a new town on a desert edge need every single thing brought to them.',
        effects: guard('amsar:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45 });
          mod(ctx, 'the_amsar_trade', 'The Amsar Trade', { incomeMult: 1.12, tradeMult: 1.08 }, 360);
          h.setFlag(ctx, 'amsarTrade', true);
          h.chronicle(ctx, 'era', 'Timber, cloth, glass, grain and craftsmen go to the new '
            + 'garrison cities. They are building from nothing and they pay in a currency that '
            + 'is arriving from three conquered empires.');
        }),
      },
      {
        label: 'Keep to our own towns and let the new world come to us',
        tooltip: '+12 governance points and "The Old Towns" (+6% income, −0.5 unrest everywhere) for twenty-five years. Nothing is risked, nothing is learned, and the men who took the placements are the notables of the next century.',
        effects: guard('amsar:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12 });
          mod(ctx, 'the_old_towns', 'The Old Towns', { incomeMult: 1.06, unrestAll: -0.5 }, 300);
          h.chronicle(ctx, 'era', 'The community keeps to its own towns and waits. The families '
            + 'who went to the new cities are the notables of the next century, and everybody '
            + 'here knows their names.');
        }),
      },
    ],
  },

  // ── 649 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev614n_the_keepers_under_the_new_order',
    title: 'The Keepers Under the New Order',
    desc: 'The Samaritans have come out of the last forty years worse than anybody. Two risings '
      + 'put down under the empire, the disabilities that emptied their estates, the wars '
      + 'across their district twice, and a population that the men who count these things say '
      + 'has fallen by more than half in a lifetime. What is left is the mountain, some '
      + 'villages, a priesthood and a book.\n\n'
      + 'Under the new order they are a protected community like any other — assessed, '
      + 'registered, and left alone — which is a better position than they have held in a '
      + 'century and has arrived about eighty years too late to be a rescue. They have sent, '
      + 'for the first time in anybody\'s memory, to ask whether the two communities on this '
      + 'ridge might make their arrangements with the new power together.',
    forTag: 'player',
    date: { y: 649, m: 4 },
    aiOption: 1,
    historical: 'The Samaritan community was catastrophically reduced by the sixth-century revolts and their aftermath; under the caliphate it held protected status and stabilised at a fraction of its former size.',
    options: [
      {
        label: 'One approach for both, and one schedule',
        tooltip: '−30 talents: +12 influence points and "The Ridge Together" (+7% income, −0.6 unrest everywhere) for twenty-five years, with −8 legitimacy from the houses for whom a thousand years is a thousand years.',
        effects: guard('keep:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, infl: 12, legitimacy: -8 });
          mod(ctx, 'the_ridge_together', 'The Ridge Together', { incomeMult: 1.07, unrestAll: -0.6 }, 300);
          h.setFlag(ctx, 'ridgeTogether', true);
          h.chronicle(ctx, 'diplomacy', 'Both communities of the ridge approach the new '
            + 'administration on one schedule. It is a thousand-year quarrel adjourned for '
            + 'administrative convenience, and it holds.');
        }),
      },
      {
        label: 'Help them separately and take no credit',
        tooltip: '−40 talents in quiet assistance: +12 legitimacy and "The Quiet Help" (−0.5 unrest everywhere, +4% income) for twenty years. Advocates, money and advice, sent by people who are careful not to be seen sending it.',
        effects: guard('keep:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, legitimacy: 12 });
          mod(ctx, 'the_quiet_help', 'The Quiet Help', { unrestAll: -0.5, incomeMult: 1.04 }, 240);
          h.chronicle(ctx, 'era', 'Money, advocates and advice go quietly across the ridge and '
            + 'nobody on either side is asked to say anything about it in public.');
        }),
      },
      {
        label: 'Their arrangements are theirs',
        tooltip: '+10 legitimacy and +25 talents unspent, with "Separately, As Always" (−0.3 unrest everywhere) for fifteen years. Both communities register separately and the smaller one goes on getting smaller.',
        effects: guard('keep:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10, treasury: 25 });
          mod(ctx, 'separately_as_always', 'Separately, As Always', { unrestAll: -0.3 }, 180);
          h.chronicle(ctx, 'era', 'The approach from the ridge is declined and both communities '
            + 'register separately, as they have for a thousand years. One of them goes on '
            + 'getting smaller.');
        }),
      },
    ],
  },

  // ── 657 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev614n_the_copts_of_egypt',
    title: 'The Copts of Egypt',
    desc: 'The largest Christian population in the world has changed masters and, from its own '
      + 'point of view, improved its position. Under the empire its church was proscribed, its '
      + 'patriarch was in hiding and its bishops were being replaced by men flown in from '
      + 'Constantinople; under the new order it is a registered community with its own '
      + 'hierarchy, its own courts and a tax it can calculate.\n\n'
      + 'Their patriarch has written — the first letter between these two communities in living '
      + 'memory that is not a polemic — proposing something narrow and useful: a shared '
      + 'understanding of what the new order\'s protected status actually entitles a community '
      + 'to, worked out by the two largest bodies that hold it, before anybody\'s local '
      + 'governor decides for them.',
    forTag: 'player',
    date: { y: 657, m: 7 },
    aiOption: 0,
    historical: 'The Coptic church emerged from the conquest with its hierarchy restored after decades of imperial suppression; the protected-community framework was worked out largely by precedent in the first century.',
    options: [
      {
        label: 'Work out the terms jointly, and write them down',
        tooltip: '−40 talents on the conference and the copies: +16 governance points and "The Terms Agreed" (+8% income, −0.7 unrest everywhere) for thirty years. What protection means, settled by the communities that hold it before any governor improvises.',
        effects: guard('copt:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, gov: 16 });
          mod(ctx, 'the_terms_agreed', 'The Terms Agreed', { incomeMult: 1.08, unrestAll: -0.7 }, 360);
          h.setFlag(ctx, 'termsAgreed', true);
          h.chronicle(ctx, 'diplomacy', 'The two largest protected communities in the new order '
            + 'work out what protection means and write it down. It is cited by both of them '
            + 'for three hundred years.');
        }),
      },
      {
        label: 'Take the practical half: trade, credit and the river',
        tooltip: '−35 talents: +12 influence points and "The Nile Correspondence" (+9% income, +7% trade) for thirty years. Egypt is the granary and the largest market on this sea, and its communities now answer letters.',
        effects: guard('copt:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, infl: 12 });
          mod(ctx, 'the_nile_correspondence', 'The Nile Correspondence', { incomeMult: 1.09, tradeMult: 1.07 }, 360);
          h.chronicle(ctx, 'era', 'A standing correspondence is opened with the communities of '
            + 'the river: grain, credit, shipping and the price of everything, monthly.');
        }),
      },
      {
        label: 'Answer courteously and settle our own terms alone',
        tooltip: '+12 governance points and "Our Own Terms" (+6% income, −0.4 unrest everywhere) for twenty-five years. Nothing is coordinated, nothing is shared, and this community\'s settlement depends entirely on its own governor\'s mood.',
        effects: guard('copt:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12 });
          mod(ctx, 'our_own_terms', 'Our Own Terms', { incomeMult: 1.06, unrestAll: -0.4 }, 300);
          h.chronicle(ctx, 'era', 'The letter from the river is answered courteously and this '
            + 'community settles its own terms alone, with whoever happens to be governing the '
            + 'district that year.');
        }),
      },
    ],
  },

  // ── 665 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev614n_the_armenians_choose',
    title: 'The Armenians Choose',
    desc: 'Armenia has spent three centuries being partitioned between whichever two empires '
      + 'existed, and it is doing it again with new participants. Its princes are being '
      + 'courted from Damascus and from Constantinople simultaneously; the terms on offer from '
      + 'the new power are lighter, the terms from the old one come with a doctrinal '
      + 'requirement, and the princes are negotiating exactly like men who have done this four '
      + 'times before.\n\n'
      + 'What they have worked out, and are quietly telling anybody who asks, is the general '
      + 'rule of the century: the empire that has just arrived always offers better terms than '
      + 'the empire that is trying to come back, and the terms are best in the first ten years '
      + 'and never improve afterwards. It is the most useful piece of political advice '
      + 'available on this map and it is being given away for the price of a dinner.',
    forTag: 'player',
    date: { y: 665, m: 9 },
    aiOption: 0,
    historical: 'The Armenian princes negotiated repeatedly between the caliphate and Byzantium through the seventh century, generally securing lighter terms from the newer power.',
    options: [
      {
        label: 'Take the advice: settle everything in the first decade',
        tooltip: '−45 talents on the embassies: +16 influence points and "The First Ten Years" (+9% income, −0.6 unrest everywhere) for thirty years. Every arrangement this community will hold for two centuries is made now, while the terms are still generous.',
        effects: guard('arm665:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, infl: 16 });
          mod(ctx, 'the_first_ten_years', 'The First Ten Years', { incomeMult: 1.09, unrestAll: -0.6 }, 360);
          h.setFlag(ctx, 'firstTenYears', true);
          h.chronicle(ctx, 'diplomacy', 'Everything that can be asked for is asked for in the '
            + 'first decade, on the Armenian principle. Most of it is granted, and nothing '
            + 'like it is granted again for two hundred years.');
        }),
      },
      {
        label: 'Keep the Armenian correspondence itself',
        tooltip: '−30 talents: +14 influence points and "The Northern Letters" (+6% income, +5% manpower, +4% trade) for thirty years. A people who have negotiated with every power in this region for three centuries, and who will tell you what they learned.',
        effects: guard('arm665:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, infl: 14 });
          mod(ctx, 'the_northern_letters', 'The Northern Letters', { incomeMult: 1.06, manpowerMult: 1.05, tradeMult: 1.04 }, 360);
          h.chronicle(ctx, 'diplomacy', 'A standing correspondence is kept with the Armenian '
            + 'houses. What they know about negotiating with empires is three centuries deep '
            + 'and they are generous with it.');
        }),
      },
      {
        label: 'Note it, and wait to see which empire wins',
        tooltip: '+12 governance points and "Waiting to See" (+5% income, −0.4 unrest everywhere) for twenty years. Neither wins for another century, and the terms available at the end of it are worse than the ones on offer now.',
        effects: guard('arm665:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12 });
          mod(ctx, 'waiting_to_see', 'Waiting to See', { incomeMult: 1.05, unrestAll: -0.4 }, 240);
          h.chronicle(ctx, 'era', 'The Armenian advice is noted and not acted on. Neither empire '
            + 'wins for a century, and every set of terms offered in that century is worse than '
            + 'the ones declined this year.');
        }),
      },
    ],
  },

  // ── 673 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev614n_the_ships_from_india',
    title: 'The Ships From India',
    desc: 'For the first time in recorded history one authority holds every port from the Nile '
      + 'to the Indus, and the consequence has arrived in the harbours this season: a cargo can '
      + 'be shipped from the Malabar coast to Egypt under a single jurisdiction, in one '
      + 'currency, with one set of customs, and nobody in the middle to fight a war about it.\n\n'
      + 'The volumes are unlike anything in living memory and the prices have collapsed '
      + 'accordingly: pepper is a kitchen commodity, silk is merely expensive, and the eastern '
      + 'goods that were an aristocratic luxury are turning into ordinary trade. Whoever puts '
      + 'houses, credit and factors into that route in the next ten years is establishing a '
      + 'position for four centuries, and the men who did it in the last comparable moment are '
      + 'families whose names everybody still knows.',
    forTag: 'player',
    date: { y: 673, m: 5 },
    aiOption: 0,
    historical: 'The unification of the trade routes from Egypt to India under one polity transformed the volume and price structure of eastern commerce; Jewish merchant networks on those routes are documented from this period onward.',
    options: [
      {
        label: 'Put houses and factors along the whole route',
        tooltip: '−80 talents: "The Long Route" (+14% income, +10% trade) for thirty-five years. Fustat, Aden, the Gulf and the Malabar coast, staffed by families who write to each other, for as long as the route exists.',
        effects: guard('india:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -80 });
          mod(ctx, 'the_long_route', 'The Long Route', { incomeMult: 1.14, tradeMult: 1.10 }, 420);
          h.setFlag(ctx, 'longRoute', true);
          h.chronicle(ctx, 'era', 'Houses are established the whole length of the route, from '
            + 'the Nile to the Malabar coast, staffed by relations. It is the largest thing '
            + 'this community has ever built and it outlives four dynasties.');
        }),
      },
      {
        label: 'Take the western end and the credit business',
        tooltip: '−50 talents: "The Bills of Exchange" (+11% income, +7% trade) for thirty years. Not the cargo — the paper: letters of credit that move money without moving silver, which is the actual innovation of this century.',
        effects: guard('india:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, gov: 10 });
          mod(ctx, 'the_bills_of_exchange', 'The Bills of Exchange', { incomeMult: 1.11, tradeMult: 1.07 }, 360);
          h.setFlag(ctx, 'billsOfExchange', true);
          h.chronicle(ctx, 'era', 'The credit business is taken rather than the cargo: bills '
            + 'that move money from one end of the route to the other without a single coin '
            + 'travelling. It is the most profitable idea of the century.');
        }),
      },
      {
        label: 'Sell to whoever brings it here and keep the capital at home',
        tooltip: '+40 talents and "The Home Market" (+7% income, +5% growth) for twenty-five years. Safe, local, and the families who sailed are the ones written about.',
        effects: guard('india:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 40 });
          mod(ctx, 'the_home_market', 'The Home Market', { incomeMult: 1.07, growthMult: 1.05 }, 300);
          h.chronicle(ctx, 'era', 'The capital stays at home and the eastern goods are bought '
            + 'from whoever brings them. It is prudent, it pays, and the fortunes are made by '
            + 'other people.');
        }),
      },
    ],
  },

  // ── 682 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev614n_the_northern_steppe',
    title: 'The Northern Steppe',
    desc: 'A new power has appeared north of the Caucasus, and the reports about it are '
      + 'confused in an interesting way. It is a steppe confederation with a khagan, it has '
      + 'stopped the caliphate\'s armies at the mountains twice, it controls the north end of '
      + 'every route between the two worlds, and it has an unusual policy of hosting anybody\'s '
      + 'merchants and anybody\'s clergy without adopting any of them.\n\n'
      + 'The merchants who come back from it say three things consistently: that it is very '
      + 'rich, that its court hears arguments about religion for entertainment, and that there '
      + 'are Jewish traders settled in its towns who are doing extremely well. It is at the '
      + 'edge of the world and everything about it is second-hand. It is also the only large '
      + 'power on any horizon that has not yet decided what it is.',
    forTag: 'player',
    date: { y: 682, m: 6 },
    aiOption: 1,
    historical: 'The Khazar khaganate emerged north of the Caucasus in the mid-seventh century, halted Arab expansion there, and hosted merchant and religious communities of every kind; its ruling house adopted Judaism in the following century.',
    options: [
      {
        label: 'Send a proper embassy, with teachers and books',
        tooltip: '−70 talents on a two-year journey: +14 influence points and "The Road to the Khagan" (+8% income, +6% trade) for thirty years. It is at the end of the world, it costs a fortune, and the court up there is listening to everybody.',
        effects: guard('khaz:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -70, infl: 14 });
          mod(ctx, 'the_road_to_the_khagan', 'The Road to the Khagan', { incomeMult: 1.08, tradeMult: 1.06 }, 360);
          h.setFlag(ctx, 'khazarEmbassy', true);
          h.chronicle(ctx, 'diplomacy', 'An embassy goes north with teachers, books and two '
            + 'years of travelling. The khagan\'s court receives it, argues with it at length, '
            + 'and asks it to come back.');
        }),
      },
      {
        label: 'Support the traders who are already there',
        tooltip: '−35 talents in credit and letters: +10 influence points and "The Northern Houses" (+9% income, +7% trade) for thirty years. There is already a community up there; what it lacks is capital and correspondents.',
        effects: guard('khaz:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, infl: 10 });
          mod(ctx, 'the_northern_houses', 'The Northern Houses', { incomeMult: 1.09, tradeMult: 1.07 }, 360);
          h.chronicle(ctx, 'era', 'Credit, correspondents and letters of introduction go north '
            + 'to the traders already settled in the khaganate. Within a generation they are '
            + 'the richest men in those towns.');
        }),
      },
      {
        label: 'File the reports. It is a rumour with a river in it',
        tooltip: '+10 governance points and +35 talents unspent. In sixty years the ruling house of that confederation takes this nation\'s faith, and this court reads about it in a letter from Spain.',
        effects: guard('khaz:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 10, treasury: 35 });
          h.chronicle(ctx, 'era', 'The northern reports are filed as travellers\' tales. What '
            + 'happens at that court in the following century is learned here, eventually, '
            + 'from a letter written in Spain.');
        }),
      },
    ],
  },

  // ── 691 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev614n_two_hierarchies_one_city',
    title: 'Two Hierarchies, One City',
    desc: 'The holy city now contains two complete Christian hierarchies that do not recognise '
      + 'each other, a new government building on the platform, a resident Jewish population '
      + 'for the first time in five centuries, and a set of overlapping claims to the same '
      + 'twelve buildings that nobody has ever written down in one document.\n\n'
      + 'The new administration would like the arrangements regularised, because it is being '
      + 'asked to adjudicate a dispute a month and has no theory of any of it. What it is '
      + 'proposing is a register: who holds which building, who has right of access on which '
      + 'day, and who pays for the repairs — enforced by the state and revised by nobody. '
      + 'Every community in the city is about to be defined, for centuries, by what somebody '
      + 'writes in a column this year.',
    forTag: 'player',
    date: { y: 691, m: 4 },
    aiOption: 0,
    historical: 'The status quo of the Jerusalem holy places was fixed by successive administrations into a register of rights and access that later governments inherited and froze.',
    options: [
      {
        label: 'Get into the register, in writing, for everything we hold',
        tooltip: '−50 talents on the surveys and the advocates: +16 governance points and "In the Register" (+8% income, +6% festival draw, −0.6 unrest everywhere) for thirty-five years. Whatever is written this year is what this community holds in six hundred.',
        effects: guard('two:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, gov: 16 });
          mod(ctx, 'in_the_register', 'In the Register', { incomeMult: 1.08, pilgrimMult: 1.06, unrestAll: -0.6 }, 420);
          h.setFlag(ctx, 'inTheRegister', true);
          h.chronicle(ctx, 'era', 'Every building, right of access and day of the year this '
            + 'community holds goes into the register, surveyed and witnessed. It is still the '
            + 'operative document six centuries later.');
        }),
      },
      {
        label: 'Ask for access rather than property',
        tooltip: '+14 governance points and "The Right of Access" (+7% festival draw, +5% income, −0.5 unrest everywhere) for thirty-five years. Property invites a claim from somebody; a day in the year and a road to walk it on does not.',
        effects: guard('two:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 14 });
          mod(ctx, 'the_right_of_access', 'The Right of Access', { pilgrimMult: 1.07, incomeMult: 1.05, unrestAll: -0.5 }, 420);
          h.chronicle(ctx, 'era', 'Access is asked for rather than property: the days, the '
            + 'gates and the roads. It is a smaller claim and nobody has ever successfully '
            + 'litigated against it.');
        }),
      },
      {
        label: 'Stay out of the register entirely',
        tooltip: '+10 legitimacy and "Nothing Registered" (−0.5 unrest everywhere) for twenty years, with −5% festival draw. Nothing is claimed, nothing is contested, and a document that will govern the city for centuries does not mention this community.',
        effects: guard('two:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10 });
          mod(ctx, 'nothing_registered', 'Nothing Registered', { unrestAll: -0.5, pilgrimMult: 0.95 }, 240);
          h.chronicle(ctx, 'era', 'No claim is entered in the register. The document that '
            + 'governs the holy places for the next six hundred years does not mention this '
            + 'community anywhere in it.');
        }),
      },
    ],
  },

  // ── 699 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev614n_the_neighbours_at_the_end',
    title: 'The Neighbours at the End of the Century',
    desc: 'A clerk has been asked to list the powers, and the list is unrecognisable to anybody '
      + 'who was alive when this chapter opened. There is one empire from Spain to the Indus, '
      + 'and its provincial administration is now conducted in a language nobody here spoke a '
      + 'lifetime ago. There is a much-reduced Roman state behind mountains, holding on. There '
      + 'is a khaganate on the northern steppe. There is a Persia that does not exist. And '
      + 'there is this country, in the middle of the only land route between three '
      + 'continents, more securely governed than it has been in two hundred years.\n\n'
      + 'The chapter opened with two empires ruining each other over this ground. It closes '
      + 'with one power that is not especially interested in it, a tax that is calculable, and '
      + 'the largest single question anybody here has faced since the Temple: what a nation '
      + 'does with a period of quiet.',
    forTag: 'player',
    date: { y: 699, m: 8 },
    aiOption: 0,
    historical: 'By 700 the Umayyad caliphate held the entire Near East under a single, largely indifferent administration. The Jewish communities of the region entered their most stable period since the second century.',
    options: [
      {
        label: 'Spend the quiet on the schools and the books',
        tooltip: '−70 talents: +18 governance points and "What the Quiet Bought" (+9% income, −0.7 unrest everywhere) for forty years. Every generation of this nation that has had thirty peaceful years has produced something that outlived the state that allowed it.',
        effects: guard('endc:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -70, gov: 18 });
          mod(ctx, 'what_the_quiet_bought', 'What the Quiet Bought', { incomeMult: 1.09, unrestAll: -0.7 }, 480);
          h.setFlag(ctx, 'quietSpentOnSchools', true);
          h.chronicle(ctx, 'era', 'The quiet is spent on schools, copying and the codification '
            + 'of everything anybody could still remember. It is the most productive fifty '
            + 'years this nation has had since the Temple.');
        }),
      },
      {
        label: 'Spend it on the ground: land, water and the villages',
        tooltip: '−75 talents: +12 legitimacy and "The Country Rebuilt" (+10% income, +8% growth, +5% manpower) for forty years. A century of wars has emptied half the hill country and there is finally a decade in which to put it back.',
        effects: guard('endc:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -75, legitimacy: 12 });
          mod(ctx, 'the_country_rebuilt', 'The Country Rebuilt', { incomeMult: 1.10, growthMult: 1.08, manpowerMult: 1.05 }, 480);
          h.setFlag(ctx, 'countryRebuilt', true);
          h.chronicle(ctx, 'era', 'Terraces, cisterns, roads and villages, for forty years. The '
            + 'hill country carries more people at the end of it than at any time since the '
            + 'second century.');
        }),
      },
      {
        label: 'Spend it on the position: agents, letters and the long routes',
        tooltip: '−65 talents: +16 influence points and "The Standing Position" (+11% income, +8% trade) for forty years. One empire, three continents, and a community with correspondents in every part of it.',
        effects: guard('endc:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -65, infl: 16 });
          mod(ctx, 'the_standing_position', 'The Standing Position', { incomeMult: 1.11, tradeMult: 1.08 }, 480);
          h.setFlag(ctx, 'standingPosition', true);
          h.chronicle(ctx, 'era', 'The quiet is spent on the position: agents, correspondents '
            + 'and credit in every province of a single empire that runs from Spain to the '
            + 'Indus. Nothing like the opportunity has existed before and it is taken.');
        }),
      },
    ],
  },
];
