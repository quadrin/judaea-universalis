// Judaea Universalis — the years the chain skips: 618–697 CE (SPEC §240).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// The Persian chapter is the densest in the game for its first twenty-five
// years and then thins out into the caliphate's own political calendar —
// fitna, succession, siege, fitna. What it does not have is the thing that
// actually happened to this region in that century, which is that a world
// with two empires in it became a world with one, and every institution in
// the Levant had to be re-founded underneath the new one inside a generation:
// the coinage, the canal, the registers, the courts, the head of the exile,
// and the letters that turned two schools in Iraq into the government of a
// nation on three continents.
//
// The seven-century pattern this chapter closes is worth stating once. The
// nation has been governed from the land, then from a book, then from a
// circuit of couriers, then from an assembly, and from 647 it is governed by
// post from Mesopotamia — because that is where the capital of the world is,
// and it stays there until the capital moves again.
//
// Sources: Sebeos and the Khuzistan Chronicle for the deportations and the
// oath; Theophanes for the grain and the fast; the plague of Amwas in
// al-Tabari and al-Baladhuri; al-Baladhuri for the canal, the mints and the
// harbour at Acre; the geonic responsa and Sherira's letter for the academies
// and the exilarchate; the Arab-Byzantine and reform coinages for 658 and 696.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_614ce_years] ' + key, e || '');
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

// Addressed to the chapter's own court, so the modifiers land on the chair
// that answered the card.
function P(ctx) { return ctx.game.playerTag; }

function mod(ctx, id, name, effects, months) {
  ctx.helpers.addTagModifier(ctx, P(ctx), {
    id, name, months: Number.isFinite(months) ? months : -1, effects,
  });
}

export const EVENTS_614_YEARS = [

  // ── 618 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev614y_the_men_in_the_quarries',
    title: 'The Men in the Quarries',
    desc: 'Word comes back up the road from Ctesiphon about the deportees. Thousands of them '
      + 'went east after the city fell — craftsmen mostly, because craftsmen are what a Persian '
      + 'king takes — and they are alive, and they are working: stonecutters on the palace '
      + 'terraces, glassmakers, a whole quarter of weavers in a town that did not have a '
      + 'weaving trade four years ago.\n\n'
      + 'The Jewish communities of Babylonia have found them, fed them and started buying the '
      + 'ones who can be bought. What they are asking is whether the court wants them home, '
      + 'and it is not a rhetorical question. Some of them do not want to come. They are '
      + 'earning, they are unmolested, and they have relatives in Nehardea now; and every '
      + 'skilled man who stays east is a skilled man this country will have to train again '
      + 'from nothing.',
    forTag: 'player',
    date: { y: 618, m: 9 },
    aiOption: 0,
    historical: 'The Persians deported the craftsmen of Jerusalem in 614. The Babylonian Jewish communities are recorded ransoming and absorbing captives from the Roman provinces throughout the war.',
    options: [
      {
        label: 'Buy them out and bring them home',
        tooltip: '−80 talents through the Babylonian communities: +12 legitimacy, +1 stability, and "The Craftsmen Home" (+8% income, +6% growth, +4% manpower) for twenty years.',
        effects: guard('quarries:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -80, legitimacy: 12, stability: 1 });
          mod(ctx, 'the_craftsmen_home', 'The Craftsmen Home', { incomeMult: 1.08, growthMult: 1.06, manpowerMult: 1.04 }, 240);
          h.setFlag(ctx, 'craftsmenRedeemed', true);
          h.chronicle(ctx, 'era', 'The deported craftsmen are bought out of the eastern cities '
            + 'and brought back up the road. The trades they took with them come back with '
            + 'them.');
        }),
      },
      {
        label: 'Let those who wish to stay, stay — and keep the road open',
        tooltip: '−35 talents: +12 influence points and "The Road to the Rivers" (+9% income, +6% trade) for twenty-five years. A community on both ends of the same road is worth more than a headcount.',
        effects: guard('quarries:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, infl: 12 });
          mod(ctx, 'road_to_the_rivers', 'The Road to the Rivers', { incomeMult: 1.09, tradeMult: 1.06 }, 300);
          h.setFlag(ctx, 'roadToTheRivers', true);
          h.chronicle(ctx, 'diplomacy', 'Those who wish to stay in the east are left there with '
            + 'the court\'s blessing and a standing correspondence. What comes back down that '
            + 'road for the next eighty years is worth more than the men would have been.');
        }),
      },
      {
        label: 'Demand them back as a matter of treaty',
        tooltip: '+10 legitimacy, +8 influence points, and "The Demand Filed" (+4% income) for fifteen years. The King of Kings does not answer letters of this kind, and it is on the record that we sent one.',
        effects: guard('quarries:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10, infl: 8 });
          mod(ctx, 'the_demand_filed', 'The Demand Filed', { incomeMult: 1.04 }, 180);
          h.chronicle(ctx, 'diplomacy', 'The return of the deported is demanded as a matter of '
            + 'treaty. No answer is received and the demand is preserved, which is the whole '
            + 'of what it was for.');
        }),
      },
    ],
  },

  // ── 624 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev614y_the_grain_ships_stop',
    title: 'The Grain Ships Stop',
    desc: 'Egypt has been in Persian hands for five years and the consequence has finally '
      + 'reached the capital: the free bread of Constantinople is discontinued. It has been '
      + 'issued without a break since the city was founded, it is the arrangement that makes a '
      + 'capital of half a million people possible, and it has ended not by decree but by '
      + 'arithmetic, because the fleet that carried it is loading for a different empire.\n\n'
      + 'This coast lives off the same sea lanes. The ships that used to call here on the way '
      + 'north are calling somewhere else or not sailing, the price of everything that arrives '
      + 'by water has doubled in two seasons, and the harbours are full of hulls with no '
      + 'cargo and crews who will work for food. It is a catastrophe for anybody who imports '
      + 'and an opening for anybody with money and nerve.',
    forTag: 'player',
    date: { y: 624, m: 7 },
    world: true,
    worldLabel: 'The Egyptian grain fleet stops; Constantinople ends the free bread',
    aiOption: 1,
    historical: 'The Persian occupation of Egypt ended the Constantinopolitan grain dole in 618–626. It was never fully restored.',
    options: [
      {
        label: 'Buy the idle hulls and the crews with them',
        tooltip: '−65 talents at distress prices: "The Bought Fleet" (+8% income, +7% trade, +6% fleet strength) for twenty-five years. Nobody will ever sell shipping this cheaply again.',
        effects: guard('grain:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -65 });
          mod(ctx, 'the_bought_fleet', 'The Bought Fleet', { incomeMult: 1.08, tradeMult: 1.07, navalMult: 1.06 }, 300);
          h.setFlag(ctx, 'boughtFleet', true);
          h.chronicle(ctx, 'era', 'Hulls and crews are bought off the quays at the bottom of '
            + 'the market. In ten years the coast has a merchant marine that cost a tenth of '
            + 'what building one would have.');
        }),
      },
      {
        label: 'Put the money into the land instead',
        tooltip: '−55 talents into terraces, presses and seed grain: "Fed From Our Own Fields" (+9% income, +7% growth, −0.5 unrest everywhere) for twenty-five years. A country that eats what it grows cannot be starved by somebody else\'s war.',
        effects: guard('grain:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55 });
          mod(ctx, 'fed_from_our_own', 'Fed From Our Own Fields', { incomeMult: 1.09, growthMult: 1.07, unrestAll: -0.5 }, 300);
          h.setFlag(ctx, 'fedFromOwnFields', true);
          h.chronicle(ctx, 'era', 'The money goes into seed, presses and terracing rather than '
            + 'into shipping. Within five years the country is feeding itself, which nobody in '
            + 'it has been able to say for four hundred years.');
        }),
      },
      {
        label: 'Ration the ports and hold the price of bread down',
        tooltip: '−45 talents in subsidy: +12 legitimacy, +1 stability, and "The Fixed Loaf" (−1.0 unrest everywhere, +3% growth) for fifteen years. Nobody starves and the merchants of the coast are furious.',
        effects: guard('grain:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, legitimacy: 12, stability: 1 });
          mod(ctx, 'the_fixed_loaf', 'The Fixed Loaf', { unrestAll: -1.0, growthMult: 1.03 }, 180);
          h.chronicle(ctx, 'era', 'The price of bread is fixed and the difference is paid out '
            + 'of the treasury. The merchants of the coast petition three times and are '
            + 'refused three times.');
        }),
      },
    ],
  },

  // ── 628 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev614y_the_oath_and_the_fast',
    title: 'The Oath and the Fast',
    desc: 'The emperor comes back. The Persian war is over, the Cross is going up to Jerusalem '
      + 'in his own hands, and on the road the delegations meet him — including one from the '
      + 'Jews of Galilee, whose leader had entertained him at Tiberias and had his safety '
      + 'sworn to, in writing, by the emperor himself.\n\n'
      + 'The monks and the clergy of the city put the argument to him: that an oath sworn to '
      + 'the enemies of Christ does not bind, and that the sin of breaking it, if it is a sin, '
      + 'will be taken on by the church, which will keep a fast every year in perpetuity in '
      + 'expiation. He accepts the argument. The reprisals begin in the spring. The fast is '
      + 'still being kept by Coptic congregations twelve centuries later, which is the only '
      + 'part of the transaction anybody afterwards is proud of.',
    forTag: 'player',
    date: { y: 628, m: 4 },
    aiOption: 0,
    historical: 'The sources record Heraclius\' sworn amnesty, the clerical argument that it did not bind, the massacres that followed, and the annual fast of atonement the Egyptian church undertook.',
    options: [
      {
        label: 'Get the villages out before the spring',
        tooltip: '−70 talents on the movement: +12 legitimacy, +1 stability, and "The Warned Villages" (+6% manpower, −0.6 unrest everywhere) for twenty years. Most of the people who would have been killed are somewhere else when it starts.',
        effects: guard('oath614:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -70, legitimacy: 12, stability: 1 });
          mod(ctx, 'the_warned_villages', 'The Warned Villages', { manpowerMult: 1.06, unrestAll: -0.6 }, 240);
          h.setFlag(ctx, 'villagesWarned', true);
          h.chronicle(ctx, 'war', 'The word goes out before the winter is over and the '
            + 'villages of the north empty into the hills and across the frontier. The '
            + 'reprisals arrive in the spring and find fields.');
        }),
      },
      {
        label: 'Hold him to the writing, in every court that will hear it',
        tooltip: '−45 talents on advocates and copies: +10 influence points and "The Broken Oath Recorded" (+5% income, +4% manpower) for twenty-five years. It saves nobody this year and it is quoted at the next emperor, and the one after.',
        effects: guard('oath614:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, infl: 10 });
          mod(ctx, 'broken_oath_recorded', 'The Broken Oath Recorded', { incomeMult: 1.05, manpowerMult: 1.04 }, 300);
          h.chronicle(ctx, 'era', 'The text of the sworn amnesty is copied and lodged in every '
            + 'archive that will take it. It saves nobody in that spring. It is read out at '
            + 'the negotiation of every treaty this court signs for eighty years.');
        }),
      },
      {
        label: 'Arm the hill villages and make the reprisal expensive',
        tooltip: '−55 talents: +12 martial points and "The Hills Answer" (+7% manpower, +1 defence in hill country, +1.0 unrest everywhere) for fifteen years.',
        effects: guard('oath614:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, mar: 12 });
          mod(ctx, 'the_hills_answer', 'The Hills Answer', { manpowerMult: 1.07, hillDefBonus: 1, unrestAll: 1.0 }, 180);
          h.chronicle(ctx, 'war', 'The hill villages are armed and told what is coming. The '
            + 'reprisal is carried out at a cost the men who ordered it had not budgeted for.');
        }),
      },
    ],
  },

  // ── 639 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev614y_the_year_of_ashes',
    title: 'The Year of Ashes',
    desc: 'The rains fail across the whole Levant and then the plague comes into the army camps '
      + 'at Amwas and out of them into everything. The new empire loses a fifth of its field '
      + 'force in Syria and most of its senior commanders in a single season — men who had '
      + 'been at the founding, dead in tents, inside eight weeks.\n\n'
      + 'On the ground it is simply the worst year anybody remembers. The famine and the '
      + 'sickness do not distinguish between conqueror and conquered, and the administration '
      + 'that was being assembled all summer simply stops: no registers, no assessments, no '
      + 'garrisons where they were meant to be. For one year there is effectively no '
      + 'government between the desert and the sea, and whatever anybody does now with the '
      + 'stores, the wells and the empty land is what they will still hold when somebody comes '
      + 'back to write it down.',
    forTag: 'player',
    date: { y: 639, m: 6 },
    aiOption: 0,
    historical: 'The plague of Amwas and the accompanying famine killed perhaps twenty-five thousand of the Arab army in Syria in 638–639, including Abu Ubayda, Yazid ibn Abi Sufyan and Mu\'adh ibn Jabal.',
    options: [
      {
        label: 'Open the stores to everybody who comes, and count nobody',
        tooltip: '−75 talents: +15 legitimacy, +1 stability, and "The Year We Fed Them" (−1.0 unrest everywhere, +5% income) for twenty-five years. The men who administer this country for the next century were fed by us in the worst year of their lives.',
        effects: guard('ashes:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -75, legitimacy: 15, stability: 1 });
          mod(ctx, 'the_year_we_fed_them', 'The Year We Fed Them', { unrestAll: -1.0, incomeMult: 1.05 }, 300);
          h.setFlag(ctx, 'yearOfAshesFed', true);
          h.chronicle(ctx, 'era', 'The stores are opened to whoever comes to the door, without '
            + 'a register and without a question. It is remembered in the right places for '
            + 'sixty years.');
        }),
      },
      {
        label: 'Take the empty land while there is nobody to record it',
        tooltip: '+90 talents\' worth of ground and "The Quiet Year" (+11% income, +5% growth) for twenty-five years, with −6 legitimacy. Nobody is administering anything and the deeds written this year are the deeds that stand.',
        effects: guard('ashes:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 90, legitimacy: -6 });
          mod(ctx, 'the_quiet_year', 'The Quiet Year', { incomeMult: 1.11, growthMult: 1.05 }, 300);
          h.setFlag(ctx, 'quietYearDeeds', true);
          h.chronicle(ctx, 'era', 'While there is nobody left to keep a register, the empty '
            + 'ground is surveyed, deeded and occupied. Every one of those deeds is still good '
            + 'in eighty years.');
        }),
      },
      {
        label: 'Shut the roads and save the people we have',
        tooltip: '−40 talents in lost trade: +10 legitimacy and "The Roads Shut" (+6% manpower, +5% growth, −0.6 unrest everywhere) for twenty years. Fewer die here than anywhere within four hundred miles.',
        effects: guard('ashes:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, legitimacy: 10 });
          mod(ctx, 'the_roads_shut', 'The Roads Shut', { manpowerMult: 1.06, growthMult: 1.05, unrestAll: -0.6 }, 240);
          h.chronicle(ctx, 'era', 'The roads are shut and the wells are guarded. It is '
            + 'ungenerous, it is effective, and the count of the dead here is the lowest in '
            + 'the province.');
        }),
      },
    ],
  },

  // ── 643 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev614y_the_canal_to_the_sea',
    title: 'The Canal to the Sea',
    desc: 'The old channel from the Nile to the Red Sea has been reopened — cleared, deepened '
      + 'and put back into service — and grain is going down it from Egypt to the ports of the '
      + 'Hijaz by water instead of over the desert by camel. It is the sort of thing empires '
      + 'do in their first confident decade and stop doing later.\n\n'
      + 'The consequences for this coast are immediate and mostly bad. The overland routes '
      + 'north from Arabia, which have paid tolls to somebody in this country since before '
      + 'anybody was keeping records, have just been undercut by a ditch. The consequences '
      + 'are also, if the court moves quickly, an opportunity, because a canal has two ends '
      + 'and the traffic on it will need everything that traffic ever needs — brokers, '
      + 'warehousing, credit, and people who know both languages.',
    forTag: 'player',
    date: { y: 643, m: 5 },
    aiOption: 1,
    historical: 'Amr ibn al-As reopened the Nile–Red Sea canal in the 640s to carry Egyptian grain to Arabia. It silted up again within a century.',
    options: [
      {
        label: 'Put our brokers and our credit at both ends of it',
        tooltip: '−50 talents to establish the houses: +12 influence points and "The Two Ends of the Ditch" (+10% income, +8% trade) for twenty-five years.',
        effects: guard('canal:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, infl: 12 });
          mod(ctx, 'two_ends_of_the_ditch', 'The Two Ends of the Ditch', { incomeMult: 1.10, tradeMult: 1.08 }, 300);
          h.setFlag(ctx, 'canalBrokers', true);
          h.chronicle(ctx, 'era', 'Brokerage and credit houses are established at both ends of '
            + 'the new canal. The cargo belongs to other people and the paperwork belongs to '
            + 'us.');
        }),
      },
      {
        label: 'Cut the tolls on the northern road and keep the caravans',
        tooltip: '−35 talents in forgone revenue: "The Cheaper Road" (+7% income, +6% trade, −0.4 unrest everywhere) for twenty-five years. The overland trade survives because it is now the cheap option.',
        effects: guard('canal:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35 });
          mod(ctx, 'the_cheaper_road', 'The Cheaper Road', { incomeMult: 1.07, tradeMult: 1.06, unrestAll: -0.4 }, 300);
          h.chronicle(ctx, 'era', 'The tolls on the northern road are cut to the bone. The '
            + 'caravans keep coming, at a margin nobody at the customs house enjoys reading.');
        }),
      },
      {
        label: 'Let the overland trade go and build for the sea',
        tooltip: '−60 talents into quays, warehouses and hulls: "The Sea Instead" (+9% income, +7% trade, +4% fleet strength) for thirty years. The caravan towns of the interior lose their century.',
        effects: guard('canal:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60 });
          mod(ctx, 'the_sea_instead', 'The Sea Instead', { incomeMult: 1.09, tradeMult: 1.07, navalMult: 1.04 }, 360);
          h.chronicle(ctx, 'era', 'The money leaves the caravan road and goes into quays, '
            + 'warehouses and hulls. The inland towns are told what has happened to them by '
            + 'the customs figures.');
        }),
      },
    ],
  },

  // ── 647 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev614y_the_head_of_the_exile',
    title: 'The Head of the Exile',
    desc: 'There is an office in Mesopotamia that predates every state currently on the map. '
      + 'The head of the exile claims descent from the kings of Judah in an unbroken male line, '
      + 'holds a seal, keeps a court with a bodyguard, appoints judges over the Jews of the '
      + 'whole east and collects a tax from them, and has been recognised in that capacity by '
      + 'the Parthians, the Sasanians, and now by the men who have replaced them both.\n\n'
      + 'The new power has confirmed him with almost no discussion, because it is administering '
      + 'an empire through communal heads and he is exactly the kind of institution the system '
      + 'is built out of. Which puts a question to this court that nobody enjoys. There is a '
      + 'Davidic authority over the Jews of the east, recognised by the empire that now also '
      + 'governs this coast — and either it is the senior office of the nation or this one is, '
      + 'and both of them are about to have to say so in writing.',
    forTag: 'player',
    date: { y: 647, m: 4 },
    aiOption: 1,
    historical: 'The exilarchate was confirmed under the caliphate as it had been under the Sasanians. From the seventh century onward the Babylonian centre, not the Palestinian one, governed most of the Jewish world.',
    options: [
      {
        label: 'Concede the precedence and take the alliance',
        tooltip: '+12 influence points and "One Head, Two Courts" (+9% income, +5% trade, −0.4 unrest everywhere) for thirty years, with −10 legitimacy. The nation has one recognised authority under the new empire, and it is four hundred miles east of here.',
        effects: guard('exile:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 12, legitimacy: -10 });
          mod(ctx, 'one_head_two_courts', 'One Head, Two Courts', { incomeMult: 1.09, tradeMult: 1.05, unrestAll: -0.4 }, 360);
          h.setFlag(ctx, 'exilarchPrecedence', true);
          h.chronicle(ctx, 'diplomacy', 'The precedence of the head of the exile is conceded in '
            + 'writing and an alliance is made of it. One nation, one recognised head, and the '
            + 'head is in Mesopotamia.');
        }),
      },
      {
        label: 'The land is the land. State the counter-claim',
        tooltip: '+15 legitimacy and "The Claim of the Land" (+5% income, −0.3 unrest everywhere) for twenty-five years, with −8 influence points and a correspondence that stays cold for three generations.',
        effects: guard('exile:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 15, infl: -8 });
          mod(ctx, 'claim_of_the_land', 'The Claim of the Land', { incomeMult: 1.05, unrestAll: -0.3 }, 300);
          h.chronicle(ctx, 'era', 'The counter-claim is stated: that authority over the nation '
            + 'belongs where the nation\'s land is. It is stated politely and it is not '
            + 'withdrawn, and the letters between the two courts get shorter every decade.');
        }),
      },
      {
        label: 'Divide it: his court for the east, ours for the west, and one calendar',
        tooltip: '+15 governance points, +8 influence points, and "The Two Jurisdictions" (+7% income, −0.6 unrest everywhere) for thirty years. It holds for two hundred years and then there is a fight about the calendar, which everybody could have predicted.',
        effects: guard('exile:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 15, infl: 8 });
          mod(ctx, 'two_jurisdictions_614', 'The Two Jurisdictions', { incomeMult: 1.07, unrestAll: -0.6 }, 360);
          h.setFlag(ctx, 'jurisdictionsDivided', true);
          h.chronicle(ctx, 'diplomacy', 'The jurisdictions are divided at the desert: his court '
            + 'for the east, this one for the west, and one calendar between them, reckoned '
            + 'here. The last clause is the one that is fought over.');
        }),
      },
    ],
  },

  // ── 658 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev614y_the_weights_and_the_mints',
    title: 'The Weights and the Mints',
    desc: 'The coin in circulation is a strange object. It is struck locally, on the Byzantine '
      + 'standard, with a Byzantine emperor on the front holding a cross that some die-cutters '
      + 'have quietly turned into a bar — and an Arabic legend on the back naming a governor '
      + 'nobody in Constantinople has heard of. The new empire has not yet made a currency and '
      + 'is running the richest provinces in the world on somebody else\'s, defaced.\n\n'
      + 'It cannot last and nobody knows what replaces it. Meanwhile every market in the region '
      + 'is running on trust in local weights, the moneychangers are the most powerful men in '
      + 'any port, and a state that established an honest standard now — one weight, one '
      + 'fineness, one assayer — would be handing every merchant between Egypt and the '
      + 'Euphrates a reason to settle their accounts here.',
    forTag: 'player',
    date: { y: 658, m: 5 },
    aiOption: 0,
    historical: 'Arab-Byzantine coinage circulated for two generations before Abd al-Malik\'s reform. Local weights and assay standards were the practical currency of the transitional decades.',
    options: [
      {
        label: 'One weight, one fineness, one assayer, published',
        tooltip: '−40 talents to set up the assay: +15 governance points and "The Honest Weight" (+11% income, +7% trade) for thirty years. Merchants settle where the scales can be trusted, and there is nowhere else.',
        effects: guard('mints:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, gov: 15 });
          mod(ctx, 'the_honest_weight', 'The Honest Weight', { incomeMult: 1.11, tradeMult: 1.07 }, 360);
          h.setFlag(ctx, 'honestWeight', true);
          h.chronicle(ctx, 'era', 'One weight, one fineness and a published assay. Within a '
            + 'decade contracts from four provinces are being settled in this country because '
            + 'the scales here can be trusted.');
        }),
      },
      {
        label: 'Strike our own coin while nobody is enforcing a standard',
        tooltip: '+70 talents in seigniorage and +10 legitimacy, with "The Coin of the Kingdom" (+7% income, +0.7 unrest everywhere) for eighteen years. It is a sovereign act and somebody in Damascus will eventually read it as one.',
        effects: guard('mints:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 70, legitimacy: 10 });
          mod(ctx, 'coin_of_the_kingdom', 'The Coin of the Kingdom', { incomeMult: 1.07, unrestAll: 0.7 }, 216);
          h.setFlag(ctx, 'ownCoinage', true);
          h.chronicle(ctx, 'era', 'The mint strikes in the crown\'s own name, in the window '
            + 'while nobody is enforcing anything. The coins are good and the legend on them '
            + 'is a claim.');
        }),
      },
      {
        label: 'Take the moneychanging and leave the minting alone',
        tooltip: '−30 talents: +10 governance points and "The Changers\' Tables" (+8% income, +6% trade) for twenty-five years. Whoever ends up striking the coin, the tables in the ports are ours.',
        effects: guard('mints:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, gov: 10 });
          mod(ctx, 'the_changers_tables', 'The Changers\' Tables', { incomeMult: 1.08, tradeMult: 1.06 }, 300);
          h.chronicle(ctx, 'era', 'The crown takes the moneychanging rather than the minting. '
            + 'Empires will fight over whose face is on the coin; the commission is charged '
            + 'either way.');
        }),
      },
    ],
  },

  // ── 666 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev614y_the_harbour_at_acre',
    title: 'The Harbour at Acre',
    desc: 'The new empire is building a navy, and it is building it here. The yards at Acre are '
      + 'being enlarged, shipwrights are being brought in from Egypt and the Syrian coast, '
      + 'timber is coming down from the Lebanon, and the whole coastline from Tyre to Ascalon '
      + 'has been reorganised around producing hulls for a fleet that will be fighting the '
      + 'Romans within a decade.\n\n'
      + 'It is an enormous amount of money arriving in a small number of towns. It is also a '
      + 'permanent military presence on a coast that has spent four hundred years being '
      + 'somebody\'s rear area, and it means that the next time this sea is contested, the '
      + 'contest happens here, in these harbours, against an enemy with fire.',
    forTag: 'player',
    date: { y: 666, m: 9 },
    aiOption: 0,
    historical: 'Mu\'awiya made Acre the principal shipyard of the Syrian coast; the fleets that fought Byzantium off Phoenix and before Constantinople were largely built there.',
    options: [
      {
        label: 'Take the contracts, the timber and the trades',
        tooltip: '−45 talents to set up: "The Yards" (+11% income, +6% trade, +5% force limit) for thirty years, and a coast full of men who can build a ship.',
        effects: guard('acre:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45 });
          mod(ctx, 'the_yards', 'The Yards', { incomeMult: 1.11, tradeMult: 1.06, forceLimitMult: 1.05 }, 360);
          h.setFlag(ctx, 'theYards', true);
          h.chronicle(ctx, 'era', 'The shipbuilding contracts, the timber trade and the trades '
            + 'that go with them are taken. In twenty years there is no port on this coast '
            + 'that cannot lay down a hull.');
        }),
      },
      {
        label: 'Build our own squadron alongside theirs',
        tooltip: '−80 talents: "The Coast Squadron" (+9% fleet strength, +6% income, −0.05 legitimacy a month) for thirty years, while somebody in Damascus decides whether a client with warships is a client.',
        effects: guard('acre:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -80 });
          mod(ctx, 'the_coast_squadron', 'The Coast Squadron', { navalMult: 1.09, incomeMult: 1.06, legitimacyAdd: -0.05 }, 360);
          h.setFlag(ctx, 'coastSquadron', true);
          h.chronicle(ctx, 'war', 'Hulls are laid down for the crown\'s own account beside the '
            + 'imperial ones. Nobody objects, which is not the same as nobody noticing.');
        }),
      },
      {
        label: 'Keep the towns out of it and take the timber trade only',
        tooltip: '+50 talents and "The Timber Road" (+7% income, +5% trade) for twenty-five years. When the fire comes to this coast it comes to somebody else\'s yards.',
        effects: guard('acre:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 50, gov: 8 });
          mod(ctx, 'the_timber_road', 'The Timber Road', { incomeMult: 1.07, tradeMult: 1.05 }, 300);
          h.chronicle(ctx, 'era', 'The towns are kept out of the shipbuilding and the timber is '
            + 'sold down the road at a profit. When the Roman fire arrives it arrives at '
            + 'somebody else\'s slipways.');
        }),
      },
    ],
  },

  // ── 676 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev614y_the_court_answers_damascus',
    title: 'The Court at Tiberias Answers Damascus',
    desc: 'A query arrives from the caliph\'s administration and it is not a threat. It is a '
      + 'form. The empire governs its non-Muslim subjects through their own communal '
      + 'authorities and it would like to know, for the register, who this community\'s '
      + 'authority is: who appoints the judges, whose rulings bind, who collects, and who is '
      + 'answerable when a judgment is disputed.\n\n'
      + 'It is the most consequential document this court will handle in a generation and it '
      + 'looks like nothing. What is being offered is legal recognition of a Jewish '
      + 'jurisdiction over Jews, enforceable by the state, in exchange for a name at the top '
      + 'of it — a name that becomes the person the empire holds responsible for everything '
      + 'the community does, and the person the community can no longer get rid of without '
      + 'the empire\'s consent.',
    forTag: 'player',
    date: { y: 676, m: 5 },
    aiOption: 0,
    historical: 'The early caliphate administered its subject communities through recognised heads with real judicial authority — a system that gave Jewish courts more enforceable power than they had held under Rome.',
    options: [
      {
        label: 'Fill in the form, and put the assembly at the top of it',
        tooltip: '+18 governance points and "The Recognised Bench" (+9% income, −0.7 unrest everywhere, −6% cost of governing) for thirty years. A body rather than a man: harder to co-opt, slower to answer, and impossible to depose.',
        effects: guard('damascus:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 18 });
          mod(ctx, 'the_recognised_bench', 'The Recognised Bench', { incomeMult: 1.09, unrestAll: -0.7, adminMult: 0.94 }, 360);
          h.setFlag(ctx, 'recognisedBench', true);
          h.chronicle(ctx, 'diplomacy', 'The form goes back to Damascus with an assembly at the '
            + 'top of it rather than a man. The jurisdiction is recognised and there is nobody '
            + 'in it to summon.');
        }),
      },
      {
        label: 'Put the crown at the top of it',
        tooltip: '+12 legitimacy, +10 influence points, and "The Answerable Crown" (+10% income, −0.4 unrest everywhere) for thirty years. Everything runs faster and there is now one person the empire can lean on.',
        effects: guard('damascus:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 12, infl: 10 });
          mod(ctx, 'the_answerable_crown', 'The Answerable Crown', { incomeMult: 1.10, unrestAll: -0.4 }, 360);
          h.chronicle(ctx, 'diplomacy', 'The crown is named as the community\'s authority. '
            + 'Everything is faster, and there is exactly one door for a governor to knock '
            + 'on.');
        }),
      },
      {
        label: 'Answer that we have no such office',
        tooltip: '+10 legitimacy and +12 governance points, with "Unregistered" (−5% income, −0.3 unrest everywhere) for twenty years. Nothing is enforceable and nothing is on file, and both of those cut both ways.',
        effects: guard('damascus:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10, gov: 12 });
          mod(ctx, 'unregistered', 'Unregistered', { incomeMult: 0.95, unrestAll: -0.3 }, 240);
          h.chronicle(ctx, 'era', 'The form is returned saying that the community has no such '
            + 'office. Its courts go on sitting, binding nobody in law and everybody in '
            + 'practice.');
        }),
      },
    ],
  },

  // ── 687 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev614y_the_letters_of_the_academies',
    title: 'The Letters of the Academies',
    desc: 'The question comes from Kairouan, and there are others behind it from Fustat, from '
      + 'Cordoba, from a town on the Rhône whose name the clerk has spelled three ways. They '
      + 'are ordinary questions — a disputed inheritance, whether a particular oath binds, what '
      + 'to do about a widow whose husband\'s ship did not arrive — and they are being sent, by '
      + 'merchant, over thousands of miles, to two schools in Iraq, because those schools '
      + 'answer.\n\n'
      + 'The answer comes back signed, dated, copied into the school\'s own register, and it is '
      + 'treated as binding by a community that has never seen the man who wrote it and lives '
      + 'under a different government. This is a legal system operating by post across three '
      + 'continents with no enforcement of any kind — and it is, from this decade onward, the '
      + 'actual government of the Jewish people, and it is not sitting in this country.',
    forTag: 'player',
    date: { y: 687, m: 7 },
    aiOption: 1,
    historical: 'The geonic responsa turned the Babylonian academies into the effective legislature of the Jewish world for four centuries. The Palestinian schools answered too, and were answered less.',
    options: [
      {
        label: 'Answer everything, faster, and pay the couriers ourselves',
        tooltip: '−55 talents a decade on scribes and passages: +15 governance points and "The Answered Letters" (+9% income, +5% trade, −0.5 unrest everywhere) for thirty years. Whoever answers is the authority, and answering is a question of logistics.',
        effects: guard('letters:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, gov: 15 });
          mod(ctx, 'the_answered_letters', 'The Answered Letters', { incomeMult: 1.09, tradeMult: 1.05, unrestAll: -0.5 }, 360);
          h.setFlag(ctx, 'answeredLetters', true);
          h.chronicle(ctx, 'era', 'The court pays for the scribes and the passages and answers '
            + 'everything within the season. Authority in this nation goes to whoever replies, '
            + 'and replying is a matter of couriers.');
        }),
      },
      {
        label: 'Refer the hard ones east and answer the rest',
        tooltip: '+12 governance points, +8 influence points, and "The Divided Docket" (+7% income, −0.4 unrest everywhere) for thirty years. Sensible, cheap, and it concedes the difficult questions for ever.',
        effects: guard('letters:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12, infl: 8 });
          mod(ctx, 'the_divided_docket', 'The Divided Docket', { incomeMult: 1.07, unrestAll: -0.4 }, 360);
          h.chronicle(ctx, 'era', 'The routine questions are answered here and the hard ones '
            + 'are referred east with a covering letter. Within two generations everybody '
            + 'writes east first.');
        }),
      },
      {
        label: 'Publish a book of rulings so the questions stop being asked',
        tooltip: '−45 talents: +18 governance points and "The Book of Answers" (+8% income, −0.6 unrest everywhere) for thirty-five years. A code travels better than a correspondence and settles less.',
        effects: guard('letters:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, gov: 18 });
          mod(ctx, 'the_book_of_answers', 'The Book of Answers', { incomeMult: 1.08, unrestAll: -0.6 }, 420);
          h.setFlag(ctx, 'bookOfAnswers', true);
          h.chronicle(ctx, 'era', 'A book of settled rulings is compiled and copied out to '
            + 'every community that has ever written in. Half the questions stop coming, which '
            + 'is either efficiency or abdication depending on the decade you ask.');
        }),
      },
    ],
  },

  // ── 696 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev614y_the_word_on_the_coin',
    title: 'The Word on the Coin',
    desc: 'The new coinage has no picture on it. Not a ruler, not a figure, not a symbol of any '
      + 'kind — both faces are writing, in Arabic, and what is written is a creed. It is the '
      + 'first currency in the history of this sea that carries no image at all, it is '
      + 'beautiful, and it is a statement of policy in the most widely handled object anybody '
      + 'produces.\n\n'
      + 'What it announces is that the transitional period is over. There was a generation in '
      + 'which the new empire ran on Byzantine coin and Greek registers and inherited officials '
      + 'and made no claims about what it was; that generation has ended, and everything from '
      + 'the money to the language of government to the great building on the platform in '
      + 'Jerusalem is now saying the same thing in the same voice. Everybody living under it '
      + 'has to decide what kind of subject they are going to be, and the decision is no longer '
      + 'deferrable.',
    forTag: 'player',
    date: { y: 696, m: 9 },
    aiOption: 0,
    historical: 'Abd al-Malik\'s reform coinage of 696–698 was purely epigraphic. It coincided with the Arabisation of the registers and the completion of the Dome of the Rock.',
    options: [
      {
        label: 'Adopt it entirely and be the best subjects in the empire',
        tooltip: '+12 influence points and "Inside the New Order" (+11% income, +6% trade, −0.5 unrest everywhere) for thirty years, with −8 legitimacy from everybody who thinks a nation that adapts this well has stopped being one.',
        effects: guard('word:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 12, legitimacy: -8 });
          mod(ctx, 'inside_the_new_order', 'Inside the New Order', { incomeMult: 1.11, tradeMult: 1.06, unrestAll: -0.5 }, 360);
          h.setFlag(ctx, 'insideNewOrder', true);
          h.chronicle(ctx, 'era', 'The new coin, the new registers and the new language of '
            + 'government are adopted without reservation. Nobody in the administration has a '
            + 'complaint about this country for forty years.');
        }),
      },
      {
        label: 'Use their coin and keep our own writing on everything else',
        tooltip: '+15 governance points, +8 legitimacy, and "Two Scripts" (+8% income, −0.4 unrest everywhere) for thirty years. The money is theirs, the deeds and the tombstones and the schoolbooks are not.',
        effects: guard('word:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 15, legitimacy: 8 });
          mod(ctx, 'two_scripts', 'Two Scripts', { incomeMult: 1.08, unrestAll: -0.4 }, 360);
          h.chronicle(ctx, 'era', 'The coin is theirs and the writing is ours: deeds, contracts, '
            + 'gravestones and schoolbooks in the old letters, and nobody in any chancery '
            + 'cares.');
        }),
      },
      {
        label: 'Strike our own, in our own letters, and see what happens',
        tooltip: '+15 legitimacy and "The Letters of the Kingdom" (+6% income, +5% manpower, +1.2 unrest everywhere) for eighteen years. In the empire that has just told everybody what it is, this is not a small thing to do.',
        effects: guard('word:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 15 });
          mod(ctx, 'letters_of_the_kingdom', 'The Letters of the Kingdom', { incomeMult: 1.06, manpowerMult: 1.05, unrestAll: 1.2 }, 216);
          h.setFlag(ctx, 'ownLetters', true);
          h.chronicle(ctx, 'era', 'The mint strikes in the old letters, in the year the empire '
            + 'put its creed on every coin between Spain and the Indus. Somebody in Damascus '
            + 'is shown one within the month.');
        }),
      },
    ],
  },

  // ── 697 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev614y_the_registers_change_tongue',
    title: 'The Registers Change Tongue',
    desc: 'The order is administrative and it ends an era: the registers of the province are to '
      + 'be kept in Arabic. They have been kept in Greek since Alexander, by the same families, '
      + 'in the same hands, through four changes of government — the same clerks who served the '
      + 'emperor served the King of Kings and then served the caliph, because whoever conquers '
      + 'a province needs somebody who can find the tax rolls.\n\n'
      + 'Those families have a decade to learn a language or lose a profession that has fed '
      + 'them for twenty generations. Some of them will manage it and hand the same desks to '
      + 'their sons. Most will not. And the deeper consequence is the one nobody writes down: '
      + 'from this order onward, a man who wants to be anything in this country has to be '
      + 'educated in the language of the people who govern it — which is how a province stops '
      + 'being conquered territory and starts being part of a civilisation.',
    forTag: 'player',
    date: { y: 697, m: 6 },
    aiOption: 0,
    historical: 'Abd al-Malik ordered the diwan translated from Greek and Persian into Arabic in the 690s. It is the administrative moment the Near East becomes Arabic-speaking.',
    options: [
      {
        label: 'Put our own sons in the schools and keep the desks',
        tooltip: '−50 talents on teachers and stipends: +15 governance points, +10 influence points, and "The Clerks Who Stayed" (+10% income, −6% cost of governing) for thirty years.',
        effects: guard('registers:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, gov: 15, infl: 10 });
          mod(ctx, 'the_clerks_who_stayed', 'The Clerks Who Stayed', { incomeMult: 1.10, adminMult: 0.94 }, 360);
          h.setFlag(ctx, 'clerksStayed', true);
          h.chronicle(ctx, 'era', 'The community pays to have its own sons taught the new '
            + 'language of government. In one generation the same families are keeping the '
            + 'same registers in a different hand.');
        }),
      },
      {
        label: 'Keep our own records in our own tongue and let theirs be theirs',
        tooltip: '+12 legitimacy, +12 governance points, and "Our Own Rolls" (+6% income, −0.5 unrest everywhere) for thirty years. Nobody outside can read what this community owns, owes or decides, which is a defence and a ceiling.',
        effects: guard('registers:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 12, gov: 12 });
          mod(ctx, 'our_own_rolls', 'Our Own Rolls', { incomeMult: 1.06, unrestAll: -0.5 }, 360);
          h.chronicle(ctx, 'era', 'The community keeps its own rolls in its own letters and '
            + 'lets the province keep its. Nothing this court records can be read by anybody '
            + 'who did not grow up in it.');
        }),
      },
      {
        label: 'Translate everything both ways and sell the service',
        tooltip: '−35 talents: +12 governance points and "The Two-Tongued Houses" (+9% income, +7% trade) for thirty years. Every deed, contract and judgment in the province passes across our tables twice.',
        effects: guard('registers:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, gov: 12 });
          mod(ctx, 'two_tongued_houses', 'The Two-Tongued Houses', { incomeMult: 1.09, tradeMult: 1.07 }, 360);
          h.chronicle(ctx, 'era', 'Houses of translation are set up in every port and market '
            + 'town. Every deed and judgment in the province crosses one of those tables '
            + 'twice, and is charged for twice.');
        }),
      },
    ],
  },
];
