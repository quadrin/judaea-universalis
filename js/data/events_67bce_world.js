// Judaea Universalis — the West while Pompey's settlement holds, 63–42 BCE
// (SPEC §111 applied to the 67 chapter). Content package. Zero imports; all
// effects run through ctx.helpers at runtime. Concatenated onto EVENTS_67 by
// the era registry. BCE years are negative.
//
// The 67 chapter's world spine is the Roman civil war as the East felt it:
// Pompey, the triumvirate, Carrhae, the Rubicon, Pharsalus, the Ides, the
// Parthian flood, Actium. What it never showed was the other half of the
// same machine — the decade in Gaul that built Caesar's army, the conspiracy
// that showed the Republic its own basement, the deaths at Utica and
// Philippi that emptied the field of every alternative. A court in Jerusalem
// deciding which Roman to pay this year was reading dispatches about
// Alesia and the Aventine; the player deciding the same thing should get
// them too.
//
// The rule for admission is §104's: it must happen whichever way the
// brothers' war went. The one province transfer in this file is the one the
// inter-chapter maps already assume — Gaul is tribal in this bookmark's
// atlas and Roman in the next one, and Alesia is where that happened, by
// explicit list, off the named losers only (the transfer() rule, SPEC §111).
//
// Source spine: Sallust, Bellum Catilinae; Cicero's Catilinarians, taken at
// about half strength; Caesar, Bellum Gallicum, taken likewise; Plutarch's
// Caesar, Cato Minor, Brutus and Antony; Appian, Civil Wars II–IV; Strabo
// VII on Burebista; the fasti for the twenty days of thanksgiving.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_67bce_world] ' + key, e || '');
}

// The letters this court answers to NOW (SPEC §135); see events_167bce_world.js.
function who(ctx, tag) {
  return (ctx && ctx.helpers && ctx.helpers.livingTag) ? ctx.helpers.livingTag(ctx, tag) : tag;
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, tag)];
  return !!(t && t.alive !== false);
}

function stir(ctx, names, mod) {
  for (const n of names) ctx.helpers.addProvinceModifier(ctx, n, mod);
}

function setOpinion(ctx, a, b, val) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, a)];
  if (!t) return;
  if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
  t.opinion[who(ctx, b)] = Math.max(-200, Math.min(200, val));
}

// Hand a named list over, but never take a province off a living court that is
// not one of the named losers (SPEC §111).
function transfer(ctx, names, to, from) {
  const g = ctx.game;
  const losers = new Set([].concat(from));
  let n = 0;
  for (const name of names) {
    const p = ctx.prov && ctx.prov(name);
    if (!p || p.impassable) continue;
    if (!losers.has(p.owner)) {
      const owner = g.tags[p.owner];
      if (owner && owner.alive !== false) continue;
    }
    if (p.owner === who(ctx, to)) continue;
    ctx.helpers.changeOwner(ctx, p.canon || p.name, to);
    n++;
  }
  return n;
}

// Caesar's Gaul, by name: the interior the eight years actually conquered.
// Narbonensis was Roman before him and is not listed; the Rhine bank cells
// stay with the peoples who held them, because Caesar bridged the river to
// demonstrate that he could, not to stay.
const CAESARS_GAUL = [
  'Lugdunum', 'Augustodunum', 'Avaricum', 'Limonum', 'Condate', 'Darioritum',
  'Lutetia', 'Rotomagus', 'Samarobriva', 'Gesoriacum', 'Durocortorum',
  'Augusta Treverorum', 'Vesontio', 'Genava', 'Burdigala',
];

export const EVENTS_67_WORLD = [

  // ── W1 · -63 ──────────────────────────────────────────────────────────────
  {
    id: 'ev4_w_catilina',
    title: 'The Republic\'s Other Army',
    worldLabel: 'The conspiracy of Catiline is strangled in the Tullianum',
    desc: 'A bankrupt patrician named Catiline, twice beaten for the consulship, '
      + 'stops running for the Republic and starts recruiting against it: debtors, '
      + 'Sullan veterans whose farms failed, young men whose creditors have opinions. '
      + 'The consul Cicero — a new man, the first in a generation — reads the '
      + 'conspiracy\'s own letters aloud in the Senate, having obtained them by the '
      + 'oldest method there is: the conspirators tried to recruit a Gallic embassy, '
      + 'and the Gauls did the arithmetic and informed. Catiline dies at the head of '
      + 'his rabble in the new year, fighting well, which everyone finds easier to '
      + 'praise than the rest of him. The five conspirators taken in the city are '
      + 'strangled in the Tullianum without trial, on a Senate vote, over the '
      + 'objection of a young senator named Caesar who argues — with a care that '
      + 'will be quoted back at him — that executing citizens without trial is a '
      + 'precedent, and precedents outlive their emergencies. Cicero will spend the '
      + 'rest of his life explaining that afternoon. So, in a way, will Rome.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -63, m: 11 },
    world: true,
    aiOption: 0,
    historical: 'Cicero exposed the conspiracy in November 63 and the Senate voted death; the five in custody were strangled in the Tullianum, and Catiline fell at Pistoria in January.',
    options: [
      {
        label: 'They have lived — the consul\'s one-word bulletin',
        tooltip: 'Rome +1 stability and −5 legitimacy — the emergency is mastered by the method that makes the next emergency easier. Roma +1 unrest for 24 months ("The Basement Shown") while the city digests what was under it.',
        effects: guard('ev4_w_catilina:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { stability: 1, legitimacy: -5 });
          stir(ctx, ['Roma'], {
            id: 'the_basement_shown', name: 'The Basement Shown', months: 24,
            effects: { unrest: 1 },
          });
          h.setFlag(ctx, 'catilina', true);
          h.chronicle(ctx, 'era', 'The conspiracy of Catiline is read aloud in the Senate and strangled in the Tullianum without trial; the Republic has seen its own basement.');
        }),
      },
    ],
  },

  // ── W2 · -58 ──────────────────────────────────────────────────────────────
  {
    id: 'ev4_w_gallic_war',
    title: 'The Proconsul Finds His War',
    worldLabel: 'Caesar takes his legions into Gaul',
    desc: 'Caesar leaves for his province owing more money than most kingdoms hold, '
      + 'with a five-year command, four legions, and a precise understanding of what '
      + 'the two are for. The pretext arrives on schedule: the Helvetii, a third of '
      + 'a million people by his own count, burn their towns and set out west across '
      + 'the Roman road. He stops them, breaks them, sends the survivors home — and '
      + 'then, the migration handled, does not stop. Ariovistus and his Germans are '
      + 'beaten at Vesontio before the year is out, on the reasoning that somebody '
      + 'was going to dominate Gaul and it had better be the somebody writing the '
      + 'dispatches. The dispatches are the other weapon: a book a year, clean as '
      + 'arithmetic, third person, in which the proconsul does nothing that is not '
      + 'forced upon him. Every court in the East knows how to read a governor '
      + 'with debts, an army, and a talent for being forced. The Hasmonean court '
      + 'has been reading them for a century.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -58, m: 4 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Caesar stopped the Helvetian migration and broke Ariovistus at Vesontio in his first proconsular year; the command ran eight years and conquered Gaul entire.',
    options: [
      {
        label: 'Somebody was going to; better the man writing it down',
        tooltip: 'Rome +10 martial points. The Aedui warm to Rome (+60 opinion); the Arverni, Sequani and Belgae cool hard (−60). Augustodunum, Avaricum and Vesontio carry "The Roman Column" (+1 unrest for 24 months) — the legions have arrived, and they winter where they please.',
        effects: guard('ev4_w_gallic_war:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { mar: 10 });
          if (alive(ctx, 'AED')) setOpinion(ctx, 'AED', 'ROM', 60);
          for (const t of ['AVN', 'SEQ', 'BLG']) {
            if (alive(ctx, t)) setOpinion(ctx, t, 'ROM', -60);
          }
          stir(ctx, ['Augustodunum', 'Avaricum', 'Vesontio'], {
            id: 'the_roman_column', name: 'The Roman Column', months: 24,
            effects: { unrest: 1 },
          });
          h.setFlag(ctx, 'gallicWar', true);
          h.chronicle(ctx, 'era', 'Caesar takes his legions into Gaul behind the Helvetian pretext; the dispatches home are a book a year, and nobody in them does anything he is not forced to.');
        }),
      },
    ],
  },

  // ── W3 · -55 ──────────────────────────────────────────────────────────────
  {
    id: 'ev4_w_ocean',
    title: 'Beyond the Edge of the Map',
    worldLabel: 'Caesar bridges the Rhine and crosses to Britain',
    desc: 'In one campaigning season Caesar builds a timber bridge over the Rhine in '
      + 'ten days, marches across, burns some villages while the Suebi decline '
      + 'battle, marches back and takes the bridge up behind him — engineering as '
      + 'rhetoric, since a river that can be bridged in ten days is no longer a '
      + 'boundary, merely a fact. Then he does the same to the Ocean itself: two '
      + 'legions to Britain, an island the geographers put at the edge of the '
      + 'inhabited world, half of educated Rome doubting it existed at all. The '
      + 'landing is nearly a disaster, the cavalry never arrives, the fleet is '
      + 'wrecked by a tide no Mediterranean sailor thought to plan for, and he '
      + 'winters back in Gaul with hostages and no conquest. It does not matter. '
      + 'The Senate votes twenty days of public thanksgiving — for a reconnaissance '
      + '— because the point was never Britain. The point is that there is no '
      + 'longer anywhere the legions categorically do not go, and everyone with a '
      + 'sea border or a river border has taken the point.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -55, m: 8 },
    world: true,
    aiOption: 0,
    historical: 'Caesar bridged the Rhine in ten days and crossed twice to Britain in 55 and 54; the Senate voted twenty days of thanksgiving for the first crossing.',
    options: [
      {
        label: 'Twenty days of thanksgiving for a reconnaissance',
        tooltip: 'Rome +8 legitimacy — prestige of a kind no eastern crown can mint. The Britons cool toward Rome (−40 opinion) and Britannia carries "The Ships Off the Chalk" (+1 unrest for 12 months). The Suebi note the ten-day bridge and file it.',
        effects: guard('ev4_w_ocean:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: 8 });
          if (alive(ctx, 'BRT')) setOpinion(ctx, 'BRT', 'ROM', -40);
          if (alive(ctx, 'SUE')) setOpinion(ctx, 'SUE', 'ROM', -40);
          stir(ctx, ['Britannia'], {
            id: 'ships_off_the_chalk', name: 'The Ships Off the Chalk', months: 12,
            effects: { unrest: 1 },
          });
          h.setFlag(ctx, 'oceanCrossed', true);
          h.chronicle(ctx, 'era', 'The Rhine is bridged in ten days and the Ocean crossed to Britain; there is no longer anywhere the legions categorically do not go.');
        }),
      },
    ],
  },

  // ── W4 · -52 ──────────────────────────────────────────────────────────────
  {
    id: 'ev4_w_alesia',
    title: 'The Whole of Gaul, at Alesia',
    worldLabel: 'Vercingetorix surrenders; Gaul is Roman',
    desc: 'In the eighth year Gaul finally produces the thing Caesar\'s books had '
      + 'been quietly insisting it could not: a general. Vercingetorix of the '
      + 'Arverni unites the peoples, burns the towns and the granaries ahead of the '
      + 'legions — his own included, a decision it takes a real state to make — and '
      + 'wins at Gergovia outright. Then he lets himself be penned in Alesia, '
      + 'counting on the relief army of all Gaul, and Caesar builds two walls: one '
      + 'facing in at the town, one facing out at the quarter-million came to break '
      + 'him, and holds both. When it is over, Vercingetorix rides out alone, '
      + 'circles Caesar\'s tribunal once, and lays his arms at the man\'s feet '
      + 'without a word. He will be kept six years for the triumph and then '
      + 'strangled in the Tullianum, where the Catilinarians went. The '
      + 'accounting the ancients themselves offered — a million dead, a million '
      + 'enslaved — is not an audit, but it is not a lie either. Gaul will be '
      + 'Latin for five hundred years, and the army that did it now belongs to '
      + 'one man, is owed farms by one man, and is six days\' march from Italy.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -52, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Vercingetorix surrendered at Alesia in 52 after the double wall held against the relief of all Gaul; he was kept for the triumph of 46 and then strangled.',
    options: [
      {
        label: 'Two walls, one facing each direction',
        tooltip: 'The Gallic interior passes to Rome by name — fifteen provinces, off the Arverni, Aedui, Sequani, Belgae, Armoricans and Aquitani only; living courts elsewhere keep their own. The Arverni take "The Pacification" (−20% income and manpower permanently) and −25 legitimacy. Rome +15 legitimacy, +20 martial points — and one man now owns the army that did it.',
        effects: guard('ev4_w_alesia:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          const took = transfer(ctx, CAESARS_GAUL, 'ROM', ['AVN', 'AED', 'SEQ', 'BLG', 'ARO', 'AQT']);
          h.adjust(ctx, 'ROM', { legitimacy: 15, mar: 20 });
          if (alive(ctx, 'AVN')) {
            h.adjust(ctx, 'AVN', { legitimacy: -25 });
            h.addTagModifier(ctx, 'AVN', {
              id: 'the_pacification', name: 'The Pacification', months: -1,
              effects: { incomeMult: 0.8, manpowerMult: 0.8 },
            });
          }
          h.setFlag(ctx, 'alesia', true);
          h.chronicle(ctx, 'era', 'Vercingetorix lays his arms at Caesar\'s feet at Alesia; Gaul (' + took + ' provinces) is Roman, and the army that did it belongs to one man.');
        }),
      },
    ],
  },

  // ── W5 · -46 ──────────────────────────────────────────────────────────────
  {
    id: 'ev4_w_cato',
    title: 'The Republic Dies at Utica',
    worldLabel: 'Cato dies by his own hand rather than be pardoned',
    desc: 'After Pharsalus the war has a second act in Africa, and at Thapsus it '
      + 'ends: fifty thousand dead against a few hundred, the clemency Caesar is '
      + 'famous for arriving too late to be exercised. In Utica, Cato — the man who '
      + 'has spent thirty years being the Republic\'s conscience at maximum volume, '
      + 'wrong often, purchasable never — organizes the evacuation of everyone who '
      + 'wants to leave, dines, reads Plato on the immortality of the soul twice, '
      + 'and opens his own belly with his sword. The first attempt fails; his '
      + 'household finds him, a doctor sews the wound; he waits for them to leave '
      + 'and tears it open with his hands. Caesar, arriving, says he begrudges '
      + 'Cato his death as Cato would have begrudged him the pardon — which is '
      + 'exactly right, and is the whole problem stated in one sentence. Clemency '
      + 'is a sovereign\'s virtue. Accepting it is a subject\'s act, and Cato '
      + 'declined the demotion. Every senator who does take the pardon now owes '
      + 'his life to a private citizen, and the arithmetic of that is not '
      + 'republican arithmetic.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -46, m: 4 },
    world: true,
    aiOption: 0,
    historical: 'Cato killed himself at Utica in April 46 after Thapsus rather than accept Caesar\'s pardon; Caesar said he begrudged him the death.',
    options: [
      {
        label: 'The pardon is declined, permanently',
        tooltip: 'Rome −5 legitimacy and Roma +1 unrest for 12 months ("The Last Republican") — the clemency works on everyone it reaches, and the one man it could not reach becomes more argument dead than he ever was alive.',
        effects: guard('ev4_w_cato:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: -5 });
          stir(ctx, ['Roma'], {
            id: 'the_last_republican', name: 'The Last Republican', months: 12,
            effects: { unrest: 1 },
          });
          h.setFlag(ctx, 'catoUtica', true);
          h.chronicle(ctx, 'era', 'Cato opens his own belly at Utica rather than owe his life to a private citizen; the pardon is declined, permanently.');
        }),
      },
    ],
  },

  // ── W6 · -44 ──────────────────────────────────────────────────────────────
  {
    id: 'ev4_w_burebista',
    title: 'The Other Dictator Dies the Same Spring',
    worldLabel: 'Burebista of Dacia is assassinated; his kingdom breaks in four',
    desc: 'North of the Danube there has been, for thirty years, a second new '
      + 'monarchy nobody in the East spends enough time thinking about: Burebista '
      + 'of the Getae, who took a scatter of hill tribes, banned their wine by '
      + 'priestly decree — Strabo reports the vineyards actually cut, which as '
      + 'statecraft commands a certain appalled respect — and hammered them into a '
      + 'power that broke the Celts of the middle Danube and taxed the Greek '
      + 'towns from Olbia westward. He backed Pompey in the civil war, and Caesar '
      + 'was assembling the eastern expedition that would have answered for it '
      + 'when the Ides intervened. Weeks later, Burebista is dead too — his own '
      + 'nobles, no philosophy about it, just the oldest argument against '
      + 'centralization there is. The kingdom breaks into four parts, then five. '
      + 'The two deaths rhyme, and the difference is the lesson: Caesar\'s state '
      + 'survives its founder because it has an heir, a treasury and a name to '
      + 'inherit. Burebista\'s does not, because it was a man wearing a kingdom, '
      + 'and the kingdom went home.',
    forTag: 'both',
    decider: 'DAC',
    date: { y: -44, m: 6 },
    world: true,
    aiOption: 0,
    historical: 'Burebista was assassinated by his own nobles within weeks of Caesar; the Getic kingdom split into four and then five parts and did not reunite until Decebalus.',
    options: [
      {
        label: 'The kingdom goes home',
        tooltip: 'Dacia: the high priest Deceneus takes what remains — −20 legitimacy, −2 stability, and "The Kingdom in Four Parts" (−35% manpower permanently). The Danube stops being a border with a policy and goes back to being a river with tribes.',
        effects: guard('ev4_w_burebista:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'DAC')) {
            h.setRuler(ctx, 'DAC', { name: 'Deceneus', title: 'High Priest of the Getae', gov: 3, infl: 4, mar: 1, age: 60 });
            h.adjust(ctx, 'DAC', { legitimacy: -20, stability: -2 });
            h.addTagModifier(ctx, 'DAC', {
              id: 'kingdom_in_four_parts', name: 'The Kingdom in Four Parts', months: -1,
              effects: { manpowerMult: 0.65 },
            });
          }
          h.setFlag(ctx, 'burebistaSlain', true);
          h.chronicle(ctx, 'era', 'Burebista is killed by his own nobles the same spring as Caesar; his kingdom breaks in four, because it was a man wearing a kingdom.');
        }),
      },
    ],
  },

  // ── W7 · -42 ──────────────────────────────────────────────────────────────
  {
    id: 'ev4_w_philippi',
    title: 'Two Battles at Philippi',
    worldLabel: 'Brutus and Cassius die at Philippi; the field is cleared',
    desc: 'The men who killed Caesar to prevent a monarchy have spent two years '
      + 'proving they could run one: Brutus and Cassius squeezed the East — Judaea\'s '
      + 'seven hundred talents among the rest — and marched twenty legions to '
      + 'Philippi in Macedonia. Two battles, three weeks apart. In the first, '
      + 'Cassius, beaten on his wing and unable to see that Brutus has won on the '
      + 'other, has his freedman kill him on his own birthday — the best soldier of '
      + 'the conspiracy dead of bad visibility. In the second, Brutus\'s army is '
      + 'ground down and he falls on his sword quoting tragedy, as he had lived. '
      + 'The victors split the world like an estate: Antony takes the East and its '
      + 'revenues, the boy Caesar takes Italy and the unpaid veterans, which looks '
      + 'like the lesser share and is the controlling one. For every court from '
      + 'the Adriatic to the Euphrates the arithmetic is now simple, and simple is '
      + 'worse: there used to be a Senate to appeal past whichever proconsul was '
      + 'squeezing you. Now there are two men, and the appeal goes to whichever '
      + 'one is not squeezing you yet.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -42, m: 10 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Cassius killed himself on his birthday after the first battle of Philippi in October 42; Brutus fell on his sword three weeks later, and the triumvirs divided the world.',
    options: [
      {
        label: 'The estate is divided between two heirs',
        tooltip: 'Rome +5 legitimacy and −150 talents — the legions\' pay for two battles comes due at once. Thessalonica and Dyrrhachium carry "The Armies Ate the Coast" (+2 unrest, −20% tax for 24 months): twenty legions wintered on the Via Egnatia, and the towns fed them.',
        effects: guard('ev4_w_philippi:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: 5, treasury: -150 });
          stir(ctx, ['Thessalonica', 'Dyrrhachium'], {
            id: 'armies_ate_the_coast', name: 'The Armies Ate the Coast', months: 24,
            effects: { unrest: 2, taxMult: 0.8 },
          });
          h.setFlag(ctx, 'philippi', true);
          h.chronicle(ctx, 'era', 'Brutus and Cassius die at Philippi three weeks apart; the world is divided like an estate, and appeals now go to whichever heir is not squeezing you yet.');
        }),
      },
    ],
  },
];
