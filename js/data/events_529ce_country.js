// Judaea Universalis — the country, not the court: 534–611 CE (SPEC §247).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// The third register, in the chapter where the country is at its richest and
// then loses more of it in one decade than in the previous two centuries. This
// is the age of the Negev wine towns, the mosaic floors, the Madaba map and
// the biggest population this land carries until the twentieth century — and
// it is also the age of the Justinianic plague, which takes perhaps a third of
// it and never gives it back.
//
// Seven cards. The chapter is the two-chair one (SPEC §135): the Samaritan
// crown and the Himyarite crown are both playable, so every card names its
// tags rather than reaching for the player's chair, and `mod` takes a tag.
// Nothing in this file reaches for the player's chair, deliberately, and the
// suite scans the source to prove it — a card that assumed the player was the
// Samaritans would silently apply the Samaritan answer to a Himyarite
// campaign. (The scan is a plain text search for that helper's name, so this
// comment does not spell it: a comment mentioning it would defeat the check.)
//
// Sources: Procopius, Wars II.22–23 and the Secret History for the plague and
// the tax remissions; the Nessana and Petra papyri for the Negev wine trade
// and its collapse; the Madaba map; Antoninus of Piacenza's itinerary of c.570.

const _warned = new Set();
function warnOnce(key, e) { if (_warned.has(key)) return; _warned.add(key); console.warn('[events_529ce_country] ' + key, e || ''); }
function guard(key, fn) { return function (ctx) { try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); } }; }
function alive(ctx, tag) { return !!(ctx && ctx.game && ctx.game.tags && ctx.game.tags[tag]); }
function mod(ctx, tag, id, name, effects, months) {
  if (!alive(ctx, tag)) return;
  ctx.helpers.addTagModifier(ctx, tag, { id, name, months: Number.isFinite(months) ? months : -1, effects });
}
function give(ctx, tag, delta) { if (alive(ctx, tag)) ctx.helpers.adjust(ctx, tag, delta); }
// A dated card whose world has moved on is retired into §75's ledger rather
// than fired at a court that no longer exists.
function safeWhen(tag) { return function (ctx) { return alive(ctx, tag); }; }

export const EVENTS_529_COUNTRY = [
  {
    id: 'ev529c_the_wine_of_the_dry_country',
    title: 'The Wine of the Dry Country',
    desc: 'There should be nothing out there. It is sixty miles of chalk and wind, and it is '
      + 'covered in vineyards — terraced wadis, run-off walls catching every winter flood, and '
      + 'presses at Nessana and Shivta turning it into a white wine that sells in Alexandria and '
      + 'Constantinople under the name of the place it is shipped from.\n\n'
      + 'The whole thing rests on water engineering that has to be maintained every year by '
      + 'people who have no other reason to be there. The question in front of this court is '
      + 'whether to pay for the maintenance, or let the desert have it back.',
    forTag: 'SAM',
    when: safeWhen('SAM'),
    date: { y: 534, m: 9 },
    aiOption: 0,
    historical: 'The Negev towns — Nessana, Shivta, Avdat, Elusa — ran an export wine trade on run-off irrigation through the sixth century. The system needed constant upkeep and was abandoned within a century of the Arab conquest.',
    options: [
      {
        label: 'Pay for the channels, every year, out of the treasury',
        tooltip: '−55 talents: "The Run-off Walls" (+12% trade, +7% income) for forty years. A desert that pays for itself, as long as somebody keeps clearing the channels.',
        effects: guard('wine:0', (ctx) => {
          const h = ctx.helpers;
          give(ctx, 'SAM', { treasury: -55 });
          mod(ctx, 'SAM', 'the_runoff_walls', 'The Run-off Walls', { tradeMult: 1.12, incomeMult: 1.07 }, 480);
          h.setFlag(ctx, 'negevChannelsKept', true);
          h.chronicle(ctx, 'era', 'The run-off walls of the dry country are put on the treasury\'s '
            + 'books. The wine of Gaza goes on reaching Constantinople for another century.');
        }),
      },
      {
        label: 'Charge the towns for their own water',
        tooltip: '+30 talents: "The Towns Pay" (+6% income) for twenty-five years and +0.8 unrest out there. They can afford it in a good year, which is not every year.',
        effects: guard('wine:1', (ctx) => {
          const h = ctx.helpers;
          give(ctx, 'SAM', { treasury: 30 });
          mod(ctx, 'SAM', 'the_towns_pay', 'The Towns Pay', { incomeMult: 1.06, unrestAll: 0.8 }, 300);
          h.chronicle(ctx, 'era', 'The desert towns are made to keep their own channels. Most of '
            + 'them manage it, most years.');
        }),
      },
    ],
  },
  {
    id: 'ev529c_it_came_from_pelusium',
    title: 'It Came from Pelusium',
    desc: 'It reached Pelusium in the spring and Gaza before the summer and it is in every port on '
      + 'this coast by the autumn. The accounts agree on the swellings, on the speed, and on the '
      + 'number, which nobody believes and everybody repeats.\n\n'
      + 'There is nothing to be decided about the sickness. There is a great deal to be decided '
      + 'about what is left: fields with no one on them, contracts with no one to honour them, '
      + 'and a tax assessment written for a country that had half again as many people in it.',
    forTag: 'SAM',
    when: safeWhen('SAM'),
    date: { y: 542, m: 8 },
    aiOption: 1,
    historical: 'The Justinianic plague arrived at Pelusium in 541 and spread through the Mediterranean; Procopius describes both the mortality and the imperial government continuing to levy the old assessments on the survivors.',
    options: [
      {
        label: 'Reassess everything, honestly, on who is left',
        tooltip: '−70 talents of revenue written off: +1 stability, −2 unrest and "The Honest Roll" (+10% population growth, +0.15 legitimacy a month) for forty years. The empire is about to do the opposite.',
        effects: guard('plague:0', (ctx) => {
          const h = ctx.helpers;
          give(ctx, 'SAM', { treasury: -70, stability: 1, legitimacy: 8 });
          mod(ctx, 'SAM', 'the_honest_roll', 'The Honest Roll', { growthMult: 1.10, legitimacyAdd: 0.15, unrestAll: -2 }, 480);
          h.setFlag(ctx, 'plagueRollHonest', true);
          h.chronicle(ctx, 'era', 'The assessment is rewritten on the living. It costs the treasury '
            + 'a third of its revenue and it keeps the villages from walking away.');
        }),
      },
      {
        label: 'Hold the old assessment and let the survivors carry it',
        tooltip: '+65 talents: +3 unrest and "The Dead Man\'s Share" (−8% population growth) for thirty years. It is what Justinian does, and Procopius never forgives him for it.',
        effects: guard('plague:1', (ctx) => {
          const h = ctx.helpers;
          give(ctx, 'SAM', { treasury: 65, stability: -1 });
          mod(ctx, 'SAM', 'the_dead_mans_share', 'The Dead Man\'s Share', { growthMult: 0.92, unrestAll: 3 }, 360);
          h.chronicle(ctx, 'era', 'The old assessment is held. Every survivor pays his neighbour\'s '
            + 'share as well as his own, and the villages remember which crown asked it.');
        }),
      },
      {
        label: 'Remit for three years and then reassess',
        tooltip: '−40 talents: −1 unrest and "Three Years\' Grace" (+7% population growth, +6% income) for thirty years. Long enough to bury the dead and bring in a harvest.',
        effects: guard('plague:2', (ctx) => {
          const h = ctx.helpers;
          give(ctx, 'SAM', { treasury: -40, stability: 1 });
          mod(ctx, 'SAM', 'three_years_grace', 'Three Years\' Grace', { growthMult: 1.07, incomeMult: 1.06, unrestAll: -1 }, 360);
          h.chronicle(ctx, 'era', 'Three years are remitted outright and the rolls are rewritten in '
            + 'the fourth. The country comes back slowly and it does come back.');
        }),
      },
    ],
  },
  {
    id: 'ev529c_the_map_on_the_floor',
    title: 'The Map on the Floor',
    desc: 'The church at Madaba is laying a mosaic floor that is a map — the whole country from '
      + 'Byblos to the Delta, every town named in Greek, the Jordan with fish in it, and Jerusalem '
      + 'in the middle at four times the scale of anything else, drawn street by street.\n\n'
      + 'It is a work of enormous care and it is an argument: this is whose country this is, and '
      + 'here is the proof, in stone, on a floor people will walk on for a thousand years. There '
      + 'is a case for answering it in kind.',
    forTag: 'SAM',
    when: safeWhen('SAM'),
    date: { y: 560, m: 6 },
    aiOption: 1,
    historical: 'The Madaba mosaic map, laid in the second half of the sixth century, is the oldest surviving cartographic representation of the Holy Land and is explicitly a Christian sacred geography.',
    options: [
      {
        label: 'Answer it: our own floors, our own names, our own map',
        tooltip: '−50 talents: +0.18 legitimacy a month and "Our Own Geography" (+9% conversion resistance, +6% income) for forty years. Argument by mosaic is the argument of this century.',
        effects: guard('madaba:0', (ctx) => {
          const h = ctx.helpers;
          give(ctx, 'SAM', { treasury: -50, legitimacy: 8 });
          mod(ctx, 'SAM', 'our_own_geography', 'Our Own Geography', { convertMult: 0.91, incomeMult: 1.06, legitimacyAdd: 0.18 }, 480);
          h.chronicle(ctx, 'era', 'Floors are laid in our own towns with our own names on them. '
            + 'Two geographies of the same country, in stone, a day\'s walk apart.');
        }),
      },
      {
        label: 'Send the best mosaicists and take the commissions',
        tooltip: '+45 talents: "The Craft, Whoever Pays" (+10% trade, +5% income) for thirty years. The men who lay those floors are ours, and a floor does not ask who cut it.',
        effects: guard('madaba:1', (ctx) => {
          const h = ctx.helpers;
          give(ctx, 'SAM', { treasury: 45 });
          mod(ctx, 'SAM', 'the_craft_whoever_pays', 'The Craft, Whoever Pays', { tradeMult: 1.10, incomeMult: 1.05 }, 360);
          h.chronicle(ctx, 'era', 'Our workshops take the church commissions. The finest Christian '
            + 'floors of the century are laid by hands that will not walk on them.');
        }),
      },
    ],
  },
  {
    id: 'ev529c_the_pilgrim_from_piacenza',
    title: 'The Pilgrim from Piacenza',
    desc: 'He has walked from Italy, written down everything, and been received everywhere. His '
      + 'account will be copied across Europe: what the country grows, what the roads are like, '
      + 'what things cost, which shrines are worth the journey, and what sort of people live here.\n\n'
      + 'He is at the door asking for a guide and a bed. Whatever he is told this week is what '
      + 'the west will believe about this country for four hundred years.',
    forTag: 'SAM',
    when: safeWhen('SAM'),
    date: { y: 571, m: 4 },
    aiOption: 0,
    historical: 'The anonymous pilgrim of Piacenza travelled Palestine around 570 and left one of the fullest descriptions of the late antique countryside, including its agriculture, prices and inhabitants.',
    options: [
      {
        label: 'Show him everything and let him write what he sees',
        tooltip: '−15 talents: +8 influence points and "What the West Was Told" (+8% trade, +0.1 legitimacy a month) for forty years. The country is prosperous, and it does not hurt for that to be known.',
        effects: guard('piac:0', (ctx) => {
          const h = ctx.helpers;
          give(ctx, 'SAM', { treasury: -15, infl: 8 });
          mod(ctx, 'SAM', 'what_the_west_was_told', 'What the West Was Told', { tradeMult: 1.08, legitimacyAdd: 0.1 }, 480);
          h.chronicle(ctx, 'diplomacy', 'The pilgrim is shown the country as it is. His account is '
            + 'copied for four centuries and brings merchants after it.');
        }),
      },
      {
        label: 'Guide him carefully past what we would rather not be famous for',
        tooltip: '−25 talents: +10 influence points and "The Route He Was Given" (+6% trade, +5% income) for thirty years. Every country shows a visitor the good road.',
        effects: guard('piac:1', (ctx) => {
          const h = ctx.helpers;
          give(ctx, 'SAM', { treasury: -25, infl: 10 });
          mod(ctx, 'SAM', 'the_route_he_was_given', 'The Route He Was Given', { tradeMult: 1.06, incomeMult: 1.05 }, 360);
          h.chronicle(ctx, 'diplomacy', 'The pilgrim is guided along a route chosen for him. He '
            + 'writes warmly, and about the parts he was shown.');
        }),
      },
    ],
  },
  {
    id: 'ev529c_the_olive_and_the_ledger',
    title: 'The Olive and the Ledger',
    desc: 'A press costs more than a village has and lasts longer than a family does, which is why '
      + 'they are held in common and why every one of them is the subject of a dispute. Who built '
      + 'it, who repairs it, whose oil goes through it first in a season when the fruit will not '
      + 'wait.\n\n'
      + 'There are enough of these now to be a standing burden on every court in the country. The '
      + 'proposal is a written rule: shares in a press recorded like shares in a field, and a '
      + 'season order that does not have to be argued every autumn.',
    forTag: 'SAM',
    when: safeWhen('SAM'),
    date: { y: 585, m: 10 },
    aiOption: 0,
    historical: 'Communally owned olive presses were the standard rural capital of late antique Palestine; the Nessana and Petra papyri show the resulting share-ownership disputes in detail.',
    options: [
      {
        label: 'Write the rule and register the shares',
        tooltip: '−30 talents: +9 governance points and "The Press Register" (−8% cost of governing, +9% income) permanently. The dullest possible reform, and the one every village asks for.',
        effects: guard('olive:0', (ctx) => {
          const h = ctx.helpers;
          give(ctx, 'SAM', { treasury: -30, gov: 9 });
          mod(ctx, 'SAM', 'the_press_register', 'The Press Register', { adminMult: 0.92, incomeMult: 1.09 });
          h.setFlag(ctx, 'pressRegister', true);
          h.chronicle(ctx, 'era', 'Shares in the presses are registered and the season order is '
            + 'written down. The autumn quarrels stop being court business.');
        }),
      },
      {
        label: 'Buy the disputed presses for the crown and rent them out',
        tooltip: '−60 talents: "The Crown\'s Presses" (+12% income, −0.5 unrest) for forty years. It ends the disputes by ending the shares.',
        effects: guard('olive:1', (ctx) => {
          const h = ctx.helpers;
          give(ctx, 'SAM', { treasury: -60 });
          mod(ctx, 'SAM', 'the_crowns_presses', 'The Crown\'s Presses', { incomeMult: 1.12, unrestAll: -0.5 }, 480);
          h.chronicle(ctx, 'era', 'The crown buys the contested presses outright and rents them by '
            + 'the season. Nobody argues with a landlord the way they argue with a cousin.');
        }),
      },
    ],
  },
  {
    id: 'ev529c_the_roads_before_the_armies',
    title: 'The Roads Before the Armies',
    desc: 'The war between the empires has been going on so long that it has stopped being news, '
      + 'and the country has quietly reorganised itself around it. The coast road carries military '
      + 'traffic and pays military prices. The inland routes carry everything else. Grain that '
      + 'used to go north goes south.\n\n'
      + 'The men who run the caravans want to know whether the crown intends to protect the '
      + 'inland routes properly, because if it does they will invest in them, and if it does not '
      + 'they will move their money somewhere quieter.',
    forTag: 'SAM',
    when: safeWhen('SAM'),
    date: { y: 599, m: 5 },
    aiOption: 0,
    historical: 'The long Byzantine–Sasanian wars of the late sixth century shifted eastern trade away from the exposed routes; the Palestinian interior roads carried an increasing share of civil traffic.',
    options: [
      {
        label: 'Garrison the inland roads and say so publicly',
        tooltip: '−45 talents: "The Inland Roads Held" (+11% trade, +6% income, −0.5 unrest) for thirty years. Money follows a guarantee more reliably than it follows a profit.',
        effects: guard('roads:0', (ctx) => {
          const h = ctx.helpers;
          give(ctx, 'SAM', { treasury: -45 });
          mod(ctx, 'SAM', 'the_inland_roads_held', 'The Inland Roads Held', { tradeMult: 1.11, incomeMult: 1.06, unrestAll: -0.5 }, 360);
          h.chronicle(ctx, 'era', 'The inland roads are garrisoned and the guarantee is published. '
            + 'The caravan money stays, and builds.');
        }),
      },
      {
        label: 'Take the military traffic on the coast instead and charge for it',
        tooltip: '+70 talents: "The Army\'s Road" (+9% income) for twenty-five years and +1 unrest from the towns it passes through. Armies are terrible customers and they always pay.',
        effects: guard('roads:1', (ctx) => {
          const h = ctx.helpers;
          give(ctx, 'SAM', { treasury: 70 });
          mod(ctx, 'SAM', 'the_armys_road', 'The Army\'s Road', { incomeMult: 1.09, unrestAll: 1 }, 300);
          h.chronicle(ctx, 'era', 'The coast road is given over to the army\'s traffic and billed '
            + 'for. The towns along it grow rich and hate every season of it.');
        }),
      },
    ],
  },
  {
    id: 'ev529c_the_last_good_harvest',
    title: 'The Last Good Harvest',
    desc: 'It is a very good year. The rain came when it should, the presses ran until December, '
      + 'and the granaries are full for the first time since the sickness. Anyone doing the '
      + 'arithmetic can see that the country has finally climbed back to where it stood before the '
      + 'plague took a third of it.\n\n'
      + 'The men who watch the north say it is also the last quiet year they expect. There is a '
      + 'case for spending the surplus and a case for burying it.',
    forTag: 'SAM',
    when: safeWhen('SAM'),
    date: { y: 611, m: 11 },
    aiOption: 1,
    historical: 'The Persian invasion of Palestine came in 613–614, ending a long period of prosperity that had recovered from the sixth-century plague.',
    options: [
      {
        label: 'Spend it: presses, channels, roads, walls',
        tooltip: '−80 talents: "What the Good Year Built" (+13% income, +8% population growth) for thirty years. Whatever comes, it comes to a richer country.',
        effects: guard('harvest:0', (ctx) => {
          const h = ctx.helpers;
          give(ctx, 'SAM', { treasury: -80 });
          mod(ctx, 'SAM', 'what_the_good_year_built', 'What the Good Year Built', { incomeMult: 1.13, growthMult: 1.08 }, 360);
          h.chronicle(ctx, 'era', 'The surplus of the good year is spent on the country itself. It '
            + 'is the last building this land does for a generation.');
        }),
      },
      {
        label: 'Bury it: fill the granaries and the treasury and wait',
        tooltip: '+90 talents held: +1 stability and "The Buried Year" (+5% manpower, −0.6 unrest) for twenty-five years. A full granary is worth more than a full market in the year that is coming.',
        effects: guard('harvest:1', (ctx) => {
          const h = ctx.helpers;
          give(ctx, 'SAM', { treasury: 90, stability: 1 });
          mod(ctx, 'SAM', 'the_buried_year', 'The Buried Year', { manpowerMult: 1.05, unrestAll: -0.6 }, 300);
          h.setFlag(ctx, 'granariesFilled', true);
          h.chronicle(ctx, 'era', 'The surplus is buried in granaries and in the treasury against '
            + 'a year nobody names out loud. It is there when it is wanted.');
        }),
      },
    ],
  },
];
