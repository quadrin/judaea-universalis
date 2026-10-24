// Additional episodes read against the uploaded Oxford World's Classics EPUB.
// Section numbers are Josephus' continuous book sections, not chapter numbers.
// Dates within a campaigning season are scheduling choices, not exact dates.
const source = (book, sections) => [{
  label: `Josephus, Jewish War ${book}.${sections}`,
  url: `https://penelope.uchicago.edu/josephus/war-${book}.html`,
}];
const who = (ctx, tag) => ctx.helpers.livingTag ? ctx.helpers.livingTag(ctx, tag) : tag;
const active = (ctx, tag) => !!ctx.game.tags[who(ctx, tag)] && ctx.game.tags[who(ctx, tag)].alive !== false;
const holds = (ctx, tag, place) => active(ctx, tag) && ctx.helpers.controls(ctx, who(ctx, tag), place);
const war = ctx => active(ctx, 'JUD') && active(ctx, 'ROM') && (ctx.game.wars || []).some(w =>
  (w.attackers || []).includes(who(ctx, 'JUD')) && (w.defenders || []).includes(who(ctx, 'ROM'))
  || (w.attackers || []).includes(who(ctx, 'ROM')) && (w.defenders || []).includes(who(ctx, 'JUD')));
function option(label, tooltip, changes, modifier, chronicle) {
  return { label, tooltip, effects(ctx) {
    const tag = who(ctx, 'JUD');
    ctx.helpers.adjust(ctx, tag, changes);
    if (modifier) ctx.helpers.addTagModifier(ctx, tag, modifier);
    ctx.helpers.chronicle(ctx, 'era', chronicle);
  } };
}

export const EVENTS_66_JOSEPHUS = [
  {
    id: 'ev66j_oil_for_syria', title: 'John’s Oil for Syria',
    forTag: 'JUD', requiresWar: ['JUD', 'ROM'], date: { y: 66, m: 12 }, aiOption: 0,
    when: ctx => war(ctx) && holds(ctx, 'JUD', 'Gischala'),
    desc: 'John of Gischala seeks permission to supply olive oil to the Jews of Syria, who want oil prepared by their own community. Galilee has a plentiful crop; across the border it commands a much higher price. A trading licence could bring money into the revolt. It could also leave a provincial leader with funds that Jerusalem cannot supervise.\n\nJosephus says he granted the permission and that John used the profits against him. We have that accusation from John’s rival. Our decision is whether the licence should carry public accounts.',
    historical: 'War 2.590–594 describes John’s wall-building contract and oil trade. Josephus alleges an eightfold resale price and presents the profits as financing attacks on his governorship. This is a hostile account of a personal rival. The audit and its game effects are playable alternatives; December is a scheduling date.',
    sources: source(2, '590–594'),
    options: [
      option('Grant the licence with public accounts', 'Gain 20 treasury and 6 governance points. Supervised oil contracts give +3% income for 18 months.', { treasury: 20, gov: 6 },
        { id: 'ev66j_oil_accounts', name: 'Supervised Oil Contracts', months: 18, effects: { incomeMult: 1.03 } },
        'The Syrian oil licence is granted on condition that its receipts are entered in public accounts.'),
      option('Let John run the trade himself', 'Gain 40 treasury and lose 5 legitimacy. A privately funded faction adds +0.5 unrest everywhere for 18 months.', { treasury: 40, legitimacy: -5 },
        { id: 'ev66j_private_oil', name: 'A Privately Funded Faction', months: 18, effects: { unrestAll: 0.5 } },
        'John receives the oil licence without an audit. The revolt receives a contribution, but his remaining receipts are his own.'),
    ],
  },
  {
    id: 'ev66j_royal_baggage', title: 'The King’s Baggage at Tarichaea',
    forTag: 'JUD', requiresWar: ['JUD', 'ROM'], date: { y: 67, m: 1 }, aiOption: 0,
    when: ctx => war(ctx) && holds(ctx, 'JUD', 'Tarichaea') && active(ctx, 'AGR'),
    desc: 'Men from Dabarittha have intercepted the baggage of Agrippa and Berenice’s steward: costly clothing, silver cups, and gold. They bring it to the Galilaean command expecting a share. Returning it would invite accusations of dealings with the royal house; distributing it would reward an attack on its servants.\n\nJosephus says he first put the goods into safekeeping with Annaeus of Tarichaea, intending to return them. When an angry crowd confronted him, he instead promised to spend the proceeds on Tarichaea’s walls. Other towns also have soldiers who expect to be paid.',
    historical: 'War 2.595–610 gives the robbery, custody of the goods and confrontation at Tarichaea. Josephus reports 600 gold pieces and a crowd of 100,000: these are his figures, not independently established totals or game currency. His narrative defends his own conduct. The choices adapt this dispute; January is a scheduling date.',
    sources: source(2, '595–610'),
    options: [
      {
        label: 'Reserve the proceeds for Tarichaea',
        tooltip: 'Tarichaea gains −1 unrest for 24 months as its claim is accepted. Gain 6 governance points; lose 4 legitimacy among rival claimants.',
        effects(ctx) {
          const tag = who(ctx, 'JUD');
          ctx.helpers.adjust(ctx, tag, { gov: 6, legitimacy: -4 });
          ctx.helpers.addProvinceModifier(ctx, 'Tarichaea', { id: 'ev66j_baggage_defences', name: 'Tarichaea’s Share', months: 24, effects: { unrest: -1 } });
          ctx.helpers.chronicle(ctx, 'era', 'The seized royal baggage is reserved for Tarichaea; the other towns dispute its claim to the proceeds.');
        },
      },
      option('Sell the goods for the common war chest', 'Gain 35 treasury; lose 6 legitimacy. The proceeds enter the common treasury rather than a single town’s defences.', { treasury: 35, legitimacy: -6 }, null,
        'The royal baggage is sold for the common war chest. Tarichaea receives no exclusive claim on the proceeds.'),
    ],
  },
  {
    id: 'ev66j_joppa_shipping', title: 'Refugees on the Joppa Shore',
    forTag: 'JUD', requiresWar: ['JUD', 'ROM'], date: { y: 67, m: 7 }, aiOption: 0,
    when: ctx => war(ctx) && holds(ctx, 'JUD', 'Joppa'),
    desc: 'Exiles and refugees have gathered at Joppa and fitted out vessels for raids on the shipping between Syria, Phoenicia, and Egypt. This gives people driven from the land a means of fighting and feeding themselves. It also invites a Roman expedition against a town with a dangerously exposed anchorage.\n\nA north wind can drive boats onto the reefs beneath the town. We can provision the refugees ashore and stop the raids, or support the flotilla and accept the danger to its crews and to coastal trade.',
    historical: 'War 3.414–431 describes refugees turning Joppa into a raiding base, a Roman night occupation, and a destructive north wind that trapped the boats against the shore. Josephus calls the vessels pirate ships. This card precedes that reported disaster and offers alternatives; it does not destroy a player’s fleet or impose the historical capture. July is approximate.',
    sources: source(3, '414–431'),
    options: [
      option('Provision the refugees and end the raids', 'Spend 30 treasury; gain 5 legitimacy. Coastal relief reduces unrest everywhere by 0.4 for 18 months.', { treasury: -30, legitimacy: 5 },
        { id: 'ev66j_coastal_relief', name: 'Coastal Relief', months: 18, effects: { unrestAll: -0.4 } },
        'Supplies are sent to the refugees at Joppa on condition that the attacks on shipping cease.'),
      option('Support the raiding flotilla', 'Gain 25 treasury and 8 martial points. Disrupted coastal trade reduces income by 5% for 18 months.', { treasury: 25, mar: 8 },
        { id: 'ev66j_coastal_disruption', name: 'Disrupted Coastal Trade', months: 18, effects: { incomeMult: 0.95 } },
        'The Joppa flotilla receives support. Its raids bring in proceeds and disrupt the coastal trade.'),
    ],
  },
  {
    id: 'ev66j_antioch_charters', title: 'The Bronze Charters of Antioch',
    forTag: 'player', date: { y: 71, m: 3 }, aiOption: 0,
    when: ctx => !!ctx.game.flags?.templeBurned && holds(ctx, 'ROM', 'Antioch'),
    desc: 'Petitioners at Antioch have asked Titus to expel the city’s Jews. When he refuses, they ask him to remove the bronze tablets recording their rights. A community can survive the refusal of one demand and still be threatened by the next.\n\nJosephus says Titus rejected both petitions and left the community’s status intact. Advocates now ask our court to help preserve copies of the charters and the decision. The protection depends on documents that later officials must be willing to recognise.',
    historical: 'War 7.100–111 records the demands for expulsion and removal of the bronze tablets, and Titus’ refusal. Read alongside 7.43–62 on accusations against Antioch’s Jews. Josephus presents Titus as a protector here; this does not establish that all local danger ended. Funding copies or relief is a fictional court response. March is a scheduling date.',
    sources: source(7, '43–62, 100–111'),
    options: [
      {
        label: 'Fund advocates and copies of the charters',
        tooltip: 'Your court spends 25 treasury and gains 8 influence points and 5 legitimacy. This records support for the charters; it does not grant new rights or change Antioch’s ownership.',
        effects(ctx) {
          ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: -25, infl: 8, legitimacy: 5 });
          ctx.helpers.chronicle(ctx, 'era', 'Advocates receive funds to preserve Antioch’s Jewish charters and the decision refusing their removal.');
        },
      },
      {
        label: 'Send relief to the threatened households',
        tooltip: 'Your court spends 15 treasury and gains 6 legitimacy. Relief reaches the community without a new diplomatic commitment.',
        effects(ctx) {
          ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: -15, legitimacy: 6 });
          ctx.helpers.chronicle(ctx, 'era', 'Relief is sent to Jewish households threatened by the petitions at Antioch.');
        },
      },
    ],
  },
];
