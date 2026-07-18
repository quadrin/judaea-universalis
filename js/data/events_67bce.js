// Judaea Universalis — event chain: The Judaean Civil War, 67–63 BCE.
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
// Source spine: Josephus, Antiquitates XIII.16–XIV.4, Bellum I.5–7; Cassius Dio
// XXXVII; Strabo XVI. Dates map to the real chronology (30-day game months;
// BCE years are negative).

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_67bce] ' + key, e || '');
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

function dateGE(ctx, y, m) {
  const d = ctx.game.date;
  return d.y > y || (d.y === y && d.m >= m);
}

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false);
}

function findBrothersWar(game) {
  const wars = (game && game.wars) || [];
  for (const w of wars) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf('HYR') !== -1 && all.indexOf('ARI') !== -1) return w;
  }
  return null;
}

export const EVENTS_67 = [
  // ── 1 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_salome_dies',
    title: 'The Queen Is Dead',
    desc: 'For nine years Salome Alexandra held the kingdom together with two hands — the '
      + 'Pharisees in one, her sons in the other. Now the hands are folded. Hyrcanus has '
      + 'the succession and the high priesthood; Aristobulus has already left the city '
      + 'quietly, and the commanders of twenty-two fortresses have stopped answering '
      + 'letters from Jerusalem. Everyone understands what comes next, and no one says it '
      + 'aloud at the funeral.',
    forTag: 'both',
    date: { y: -67, m: 4 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The kingdom holds its breath',
        tooltip: 'The fortress commanders declare for the younger brother: Aristobulus +5 legitimacy; Hyrcanus +10 governance points (the institutions, for what they are worth).',
        effects: guard('ev4_salome_dies:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ARI', { legitimacy: 5 });
          h.adjust(ctx, 'HYR', { gov: 10 });
        }),
      },
      {
        label: 'Riders to the fortresses',
        tooltip: 'Jerusalem asserts the succession before the funeral is cold: Hyrcanus +5 legitimacy; Aristobulus +10 martial points (the commanders drill for the answer).',
        effects: guard('ev4_salome_dies:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HYR', { legitimacy: 5 });
          h.adjust(ctx, 'ARI', { mar: 10 });
        }),
      },
    ],
  },

  // ── 2 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_antipater',
    title: 'The Idumean',
    desc: 'Antipater of Idumea is rich, tireless, and loyal to exactly one cause, which is '
      + 'not you — it is the arrangement whereby a weak king needs a strong servant. He '
      + 'has friends in Gaza, debtors in Ascalon, a wife from the Nabataean nobility, and '
      + 'a memorandum, already drafted, on how the war should be run. All he asks is that '
      + 'you keep being what you are.',
    forTag: 'HYR',
    date: { y: -67, m: 6 },
    aiOption: 0,
    options: [
      {
        label: 'Let him manage it',
        tooltip: '+25 influence points; "Antipater\'s Web": +10% income, permanently. His sons will inherit the arrangement.',
        effects: guard('ev4_antipater:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HYR', { infl: 25 });
          h.addTagModifier(ctx, 'HYR', {
            id: 'antipaters_web', name: 'Antipater\'s Web', months: -1,
            effects: { incomeMult: 1.1 },
          });
          h.setFlag(ctx, 'antipaterAscendant', true);
        }),
      },
      {
        label: 'A king needs no steward',
        tooltip: '+10 legitimacy — and the hardest-working man in the kingdom goes home to Idumea.',
        effects: guard('ev4_antipater:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'HYR', { legitimacy: 10 });
        }),
      },
    ],
  },

  // ── 3 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_aretas_price',
    title: 'The Price of Petra',
    requiresWar: ['HYR', 'ARI'],
    desc: 'Aretas the king receives your envoys under a fringed canopy and lets the '
      + 'silence do the bargaining. His price is written down, because Nabataeans write '
      + 'everything down: the twelve cities of Moab that Jannaeus took from his fathers, '
      + 'Medaba first among them — returned, not promised. In exchange: horsemen, as many '
      + 'as the war needs, under his own banner, against your brother.',
    forTag: 'HYR',
    date: { y: -66, m: 3 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Pay the price',
        tooltip: 'Medaba is ceded to Nabataea; Aretas enters the War of the Brothers on our side with 8,000 men.',
        effects: guard('ev4_aretas_price:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          h.changeOwner(ctx, 'Medaba', 'NAB');
          const w = findBrothersWar(g);
          if (w && alive(ctx, 'NAB')) {
            const side = (w.attackers || []).indexOf('HYR') >= 0 ? w.attackers : w.defenders;
            if (side.indexOf('NAB') === -1) side.push('NAB');
            if (w.warscore && w.warscore.NAB === undefined) w.warscore.NAB = 0;
            const nab = g.tags.NAB, ari = g.tags.ARI;
            if (nab && ari) {
              if (nab.atWarWith.indexOf('ARI') === -1) nab.atWarWith.push('ARI');
              if (ari.atWarWith.indexOf('NAB') === -1) ari.atWarWith.push('NAB');
            }
          }
          h.spawnArmy(ctx, 'NAB', 'Petra', {
            inf: 4, cav: 4, name: 'Lances of Aretas',
            general: { name: 'Aretas III', fire: 2, shock: 3, maneuver: 3 },
          });
          h.setFlag(ctx, 'aretasMarches', true);
          h.notify(ctx, {
            title: 'Aretas marches',
            text: 'The king of Nabataea enters the war against Aristobulus. His price: the cities of Moab.',
            type: 'war', provName: 'Medaba',
          });
        }),
      },
      {
        label: 'The cities are Israel\'s',
        tooltip: 'Refuse. Nabataea\'s opinion of us falls by 40, and the lances stay home.',
        effects: guard('ev4_aretas_price:1', (ctx) => {
          const nab = ctx.game.tags.NAB;
          if (nab && nab.opinion) nab.opinion.HYR = Math.max(-200, (nab.opinion.HYR || 0) - 40);
        }),
      },
    ],
  },

  // ── 4 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_honi',
    title: 'The Circle-Drawer',
    requiresWar: ['HYR', 'ARI'],
    desc: 'They found Honi, the old man whose prayers famously brought rain, hiding from '
      + 'the war, and dragged him before the camp to curse the men inside the walls. He '
      + 'stood in the ring of soldiers and prayed instead: "Lord of the universe — these '
      + 'are Your people, and those besieged are Your priests. Do not listen to either of '
      + 'them against the other." So they stoned him. The rain that year came anyway, and '
      + 'men remembered.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev4_honi', (ctx) =>
      dateGE(ctx, -65, 4) && alive(ctx, 'HYR') && alive(ctx, 'ARI') && !!findBrothersWar(ctx.game)),
    aiOption: 0,
    options: [
      {
        label: 'Do not listen to either of them',
        tooltip: 'Both brothers: -5 legitimacy. Jerusalem: +2 unrest for 12 months ("The Stoning of Honi").',
        effects: guard('ev4_honi:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HYR', { legitimacy: -5 });
          h.adjust(ctx, 'ARI', { legitimacy: -5 });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'honi_stoned', name: 'The Stoning of Honi', months: 12,
            effects: { unrest: 2 },
          });
        }),
      },
      {
        label: 'Let the old man go',
        tooltip: 'The prayer stands, unanswered and unbloodied: both armies −5% morale for 12 months ("Honi\'s Prayer") — but Jerusalem is spared the scandal.',
        effects: guard('ev4_honi:1', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'HYR', {
            id: 'honis_prayer', name: 'Honi\'s Prayer', months: 12,
            effects: { moraleMult: 0.95 },
          });
          h.addTagModifier(ctx, 'ARI', {
            id: 'honis_prayer', name: 'Honi\'s Prayer', months: 12,
            effects: { moraleMult: 0.95 },
          });
        }),
      },
    ],
  },

  // ── 5 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_paschal_beasts',
    title: 'The Beasts for the Sacrifice',
    requiresWar: ['HYR', 'ARI'],
    desc: 'The priests inside the walls lowered a basket of silver each day, and the '
      + 'besiegers sent up the paschal lambs, war or no war — until someone in the camp '
      + 'thought it clever to send up a pig. The chroniclers say the earth shook. What is '
      + 'certain is that every man on the walls saw it, and that the siege stopped being '
      + 'a quarrel between brothers and became something older and worse.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev4_paschal_beasts', (ctx) => {
      const p = ctx.prov('Jerusalem');
      return !!(p && p.siege && dateGE(ctx, -66, 1));
    }),
    aiOption: 0,
    options: [
      {
        label: 'An abomination in a basket',
        tooltip: 'Jerusalem: +2 unrest for 12 months. The defenders: +10% morale for 12 months — fury is fuel.',
        effects: guard('ev4_paschal_beasts:0', (ctx) => {
          const h = ctx.helpers;
          const p = ctx.prov('Jerusalem');
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'paschal_outrage', name: 'The Paschal Outrage', months: 12,
            effects: { unrest: 2 },
          });
          const defender = p ? p.controller : null;
          if (defender && (defender === 'HYR' || defender === 'ARI')) {
            h.addTagModifier(ctx, defender, {
              id: 'paschal_fury', name: 'Paschal Fury', months: 12,
              effects: { moraleMult: 1.1 },
            });
          }
        }),
      },
      {
        label: 'Send up the lambs, war or no war',
        tooltip: 'The silver goes down, the beasts go up, and the rite is kept: Hyrcanus and Aristobulus −50 talents each; Jerusalem −1 unrest for 12 months ("The Lambs Still Ascend").',
        effects: guard('ev4_paschal_beasts:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HYR', { treasury: -50 });
          h.adjust(ctx, 'ARI', { treasury: -50 });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'paschal_outrage', name: 'The Lambs Still Ascend', months: 12,
            effects: { unrest: -1 },
          });
        }),
      },
    ],
  },

  // ── 6 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_tigranes_bows',
    title: 'The King of Kings Kneels',
    desc: 'Tigranes the Great, who once styled himself King of Kings and moved whole '
      + 'peoples like furniture, has walked into Pompey\'s camp, taken the diadem from his '
      + 'own head, and laid it at the Roman\'s feet. Pompey handed it back — minus Syria, '
      + 'minus Phoenicia, minus everything that made it interesting. The lesson is not '
      + 'lost on any court in the East: this Roman prefers kneeling kings to burned '
      + 'cities, but he will take either.',
    forTag: 'both',
    date: { y: -66, m: 10 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Every court takes notes',
        tooltip: 'Armenia becomes a chastened friend of Rome and stands down. The settlement of the East has begun.',
        effects: guard('ev4_tigranes_bows:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (g.tags.ARM && g.tags.ARM.opinion) g.tags.ARM.opinion.ROM = 100;
          if (g.tags.ROM && g.tags.ROM.opinion) g.tags.ROM.opinion.ARM = 60;
          h.addTagModifier(ctx, 'ARM', {
            id: 'chastened', name: 'Chastened by Pompey', months: 36,
            effects: { aiPassive: true },
          });
          h.setFlag(ctx, 'tigranesBowed', true);
        }),
      },
      {
        label: 'Send gifts before he asks',
        tooltip: 'Armenia stands down as before — and both courts spend to be remembered kindly: Hyrcanus and Aristobulus −50 talents each; Rome\'s opinion of each +15.',
        effects: guard('ev4_tigranes_bows:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (g.tags.ARM && g.tags.ARM.opinion) g.tags.ARM.opinion.ROM = 100;
          if (g.tags.ROM && g.tags.ROM.opinion) g.tags.ROM.opinion.ARM = 60;
          h.addTagModifier(ctx, 'ARM', {
            id: 'chastened', name: 'Chastened by Pompey', months: 36,
            effects: { aiPassive: true },
          });
          h.setFlag(ctx, 'tigranesBowed', true);
          for (const t of ['HYR', 'ARI']) {
            if (!alive(ctx, t)) continue;
            h.adjust(ctx, t, { treasury: -50 });
            if (g.tags.ROM && g.tags.ROM.opinion) {
              g.tags.ROM.opinion[t] = Math.min(200, (g.tags.ROM.opinion[t] || 0) + 15);
            }
          }
        }),
      },
    ],
  },

  // ── 7 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_pompey_syria',
    title: 'The Settlement of the East',
    desc: 'Antiochus XIII came to Pompey\'s camp to be confirmed in his ancestors\' '
      + 'kingdom, and Pompey looked at the last Seleucid the way a surveyor looks at a '
      + 'ruin: with sympathy, and a measuring rod. "It would be wrong," he is reported to '
      + 'have said, "to give Syria to a king who cannot hold it." Syria is a Roman '
      + 'province by the stroke of a pen, Damascus has a garrison, and the road south '
      + 'from Antioch now ends wherever Pompey decides it does.',
    forTag: 'both',
    date: { y: -64, m: 5 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Syria is a province',
        tooltip: 'Every Seleucid province and Damascus become Roman; Pompey (4/4/5) lands at Antioch with 25,000 men. Rome\'s hands are free.',
        effects: guard('ev4_pompey_syria:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (p && !p.impassable && p.owner === 'SEL') h.changeOwner(ctx, p.name, 'ROM');
          }
          h.changeOwner(ctx, 'Damascus', 'ROM');
          for (const a of h.armiesOf(ctx, 'SEL')) h.removeArmy(ctx, a.id);
          h.removeModifier(ctx, 'ROM', 'wars_elsewhere');
          h.spawnArmy(ctx, 'ROM', 'Antioch', {
            inf: 20, cav: 5, name: 'Army of Pompey',
            general: { name: 'Pompeius Magnus', fire: 4, shock: 4, maneuver: 5 },
          });
          h.spawnArmy(ctx, 'ROM', 'Damascus', {
            inf: 5, cav: 1, name: 'Garrison of Damascus',
            general: { name: 'Aemilius Scaurus', fire: 2, shock: 2, maneuver: 2 },
          });
          h.setFlag(ctx, 'pompeyCame', true);
          h.notify(ctx, {
            title: 'Pompey is in Syria',
            text: 'The Seleucid kingdom is extinguished by decree. The settlement of the East has reached Damascus — one week\'s march from Judaea.',
            type: 'war', provName: 'Damascus',
          });
        }),
      },
    ],
  },

  // ── 8 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_embassy_hyr',
    title: 'Three Embassies at Damascus',
    requiresWar: [['HYR', 'ARI'], ['ROM', 'HYR'], ['ROM', 'ARI']],
    desc: 'Scaurus, then Pompey himself, receive the East in audience — and from Judaea '
      + 'come three embassies at once: your brother\'s, with a golden vine said to be worth '
      + 'five hundred talents; yours, with Antipater\'s arithmetic of legitimacy; and a '
      + 'third, from the people, asking Rome to rid them of kings altogether. The Roman '
      + 'listens to all three with the same face.',
    forTag: 'HYR',
    trigger: safeTrigger('ev4_embassy_hyr', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'pompeyCame') && alive(ctx, 'HYR')),
    aiOption: 0,
    options: [
      {
        label: 'Gold speaks Latin',
        tooltip: '-150 talents; Rome\'s opinion of us +40.',
        effects: guard('ev4_embassy_hyr:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          h.adjust(ctx, 'HYR', { treasury: -150 });
          if (g.tags.ROM && g.tags.ROM.opinion) {
            g.tags.ROM.opinion.HYR = Math.min(200, (g.tags.ROM.opinion.HYR || 0) + 40);
          }
        }),
      },
      {
        label: 'Plain speech and the law of succession',
        tooltip: '+5 legitimacy. Romans respect law — when convenient.',
        effects: guard('ev4_embassy_hyr:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'HYR', { legitimacy: 5 });
        }),
      },
    ],
  },
  {
    id: 'ev4_embassy_ari',
    title: 'Three Embassies at Damascus',
    requiresWar: [['HYR', 'ARI'], ['ROM', 'HYR'], ['ROM', 'ARI']],
    desc: 'Scaurus, then Pompey himself, receive the East in audience — and from Judaea '
      + 'come three embassies at once: yours, with a golden vine worth five hundred '
      + 'talents; your brother\'s, with Antipater\'s patient arithmetic; and a third, from '
      + 'the people, asking Rome to rid them of kings altogether. The Roman listens to '
      + 'all three with the same face.',
    forTag: 'ARI',
    trigger: safeTrigger('ev4_embassy_ari', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'pompeyCame') && alive(ctx, 'ARI')),
    aiOption: 0,
    options: [
      {
        label: 'Send the golden vine',
        tooltip: '-150 talents; Rome\'s opinion of us +40.',
        effects: guard('ev4_embassy_ari:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          h.adjust(ctx, 'ARI', { treasury: -150 });
          if (g.tags.ROM && g.tags.ROM.opinion) {
            g.tags.ROM.opinion.ARI = Math.min(200, (g.tags.ROM.opinion.ARI || 0) + 40);
          }
        }),
      },
      {
        label: 'A king does not plead',
        tooltip: '+5 legitimacy — and the Roman notices the tone.',
        effects: guard('ev4_embassy_ari:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ARI', { legitimacy: 5 });
        }),
      },
    ],
  },

  // ── 9 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_pompey_demands_hyr',
    title: 'Pompey Requires an Answer',
    requiresWar: [['HYR', 'ARI'], ['ROM', 'HYR'], ['ROM', 'ARI']],
    desc: 'The proconsul\'s letter is courteous the way a drawn blade is bright. Rome '
      + 'takes note of the disorders in Judaea; Rome desires the country quiet; the '
      + 'high priest will present himself, place his cause in Rome\'s hands, and open his '
      + 'fortresses to inspection. There is no threat anywhere in the document, which is '
      + 'the threat.',
    forTag: 'HYR',
    trigger: safeTrigger('ev4_pompey_demands_hyr', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'pompeyCame') && dateGE(ctx, -63, 4) && alive(ctx, 'HYR')
      && !(ctx.game.tags.HYR.atWarWith || []).includes('ROM')),
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Place our cause in Rome\'s hands',
        tooltip: 'Judaea (Hyrcanus) becomes a Roman client kingdom: tribute flows west, Rome\'s wars are ours — and Rome\'s legions stand behind our claim. +1 stability.',
        effects: guard('ev4_pompey_demands_hyr:0', (ctx) => {
          const g = ctx.game;
          const t = g.tags.HYR;
          if (t && !t.overlord && g.tags.ROM && g.tags.ROM.alive) t.overlord = 'ROM';
          ctx.helpers.adjust(ctx, 'HYR', { stability: 1 });
          ctx.helpers.setFlag(ctx, 'submittedHYR', true);
        }),
      },
      {
        label: 'The crown answers to Heaven',
        tooltip: 'Defy the proconsul: Rome declares war.',
        effects: guard('ev4_pompey_demands_hyr:1', (ctx) => {
          if (alive(ctx, 'ROM')) ctx.helpers.declareWar(ctx, 'ROM', 'HYR', 'Pompey\'s Judaean War');
        }),
      },
    ],
  },
  {
    id: 'ev4_pompey_demands_ari',
    title: 'Pompey Requires an Answer',
    requiresWar: [['HYR', 'ARI'], ['ROM', 'HYR'], ['ROM', 'ARI']],
    desc: 'The proconsul\'s letter is courteous the way a drawn blade is bright. Rome '
      + 'takes note of the disorders in Judaea; Rome desires the country quiet; the king '
      + 'will present himself, place his cause in Rome\'s hands, and open his fortresses '
      + 'to inspection. Your commanders read it over your shoulder and, to a man, look at '
      + 'the mountains.',
    forTag: 'ARI',
    trigger: safeTrigger('ev4_pompey_demands_ari', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'pompeyCame') && dateGE(ctx, -63, 4) && alive(ctx, 'ARI')
      && !(ctx.game.tags.ARI.atWarWith || []).includes('ROM')),
    major: true,
    aiOption: 1,
    options: [
      {
        label: 'Place our cause in Rome\'s hands',
        tooltip: 'Judaea (Aristobulus) becomes a Roman client kingdom: tribute flows west, Rome\'s wars are ours. +1 stability.',
        effects: guard('ev4_pompey_demands_ari:0', (ctx) => {
          const g = ctx.game;
          const t = g.tags.ARI;
          if (t && !t.overlord && g.tags.ROM && g.tags.ROM.alive) t.overlord = 'ROM';
          ctx.helpers.adjust(ctx, 'ARI', { stability: 1 });
          ctx.helpers.setFlag(ctx, 'submittedARI', true);
        }),
      },
      {
        label: 'Shut the fortresses',
        tooltip: 'Defy the proconsul, as Aristobulus did: Rome declares war.',
        effects: guard('ev4_pompey_demands_ari:1', (ctx) => {
          if (alive(ctx, 'ROM')) ctx.helpers.declareWar(ctx, 'ROM', 'ARI', 'Pompey\'s Judaean War');
        }),
      },
    ],
  },

  // ── 10 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_arbitration',
    title: 'Pompey Chooses the Elder',
    requiresWar: [['HYR', 'ARI'], ['ROM', 'HYR'], ['ROM', 'ARI']],
    desc: 'Both brothers knelt, so the Roman judged: the elder is the lawful heir, the '
      + 'younger the abler man — and Rome has no shortage of able men. Hyrcanus is '
      + 'confirmed; Aristobulus is invited, in the manner of an arrest warrant, to '
      + 'stand down his fortresses. The legions make the finding enforceable.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev4_arbitration', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'submittedHYR') && !!ctx.helpers.getFlag(ctx, 'submittedARI')
      && !!findBrothersWar(ctx.game) && alive(ctx, 'ROM')),
    aiOption: 0,
    options: [
      {
        label: 'Rome has judged',
        tooltip: 'Hyrcanus +15 legitimacy; Aristobulus -15. Rome declares war on Aristobulus to enforce the award.',
        effects: guard('ev4_arbitration:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HYR', { legitimacy: 15 });
          h.adjust(ctx, 'ARI', { legitimacy: -15 });
          if (alive(ctx, 'ARI')) h.declareWar(ctx, 'ROM', 'ARI', 'Pompey\'s Judaean War');
        }),
      },
      {
        label: 'Silver for the legate',
        tooltip: 'Aristobulus pays Scaurus to soften the finding: Aristobulus −100 talents, −5 legitimacy; Hyrcanus +10. Rome still declares war to enforce the award.',
        effects: guard('ev4_arbitration:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HYR', { legitimacy: 10 });
          h.adjust(ctx, 'ARI', { treasury: -100, legitimacy: -5 });
          if (alive(ctx, 'ARI')) h.declareWar(ctx, 'ROM', 'ARI', 'Pompey\'s Judaean War');
        }),
      },
    ],
  },

  // ── 11 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_holy_of_holies',
    title: 'The Roman in the Sanctuary',
    requiresWar: [['HYR', 'ARI'], ['ROM', 'HYR'], ['ROM', 'ARI']],
    desc: 'On the day the Temple fell to him, Pompey did what no living Jew had done: he '
      + 'walked through the Veil into the Holy of Holies, and found — nothing. No statue, '
      + 'no relic, no treasure hoard; an empty room, and the presence that empty rooms '
      + 'have. He touched none of the vessels and ordered the rites resumed the next '
      + 'morning, and was proud of his restraint. The city never forgave him the '
      + 'footprints.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev4_holy_of_holies', (ctx) =>
      alive(ctx, 'ROM') && ctx.helpers.controls(ctx, 'ROM', 'Jerusalem')),
    aiOption: 0,
    options: [
      {
        label: 'The footprints remain',
        tooltip: 'Both brothers: -10 legitimacy. Jerusalem and all Jewish provinces seethe ("The Profaned Veil": +2 unrest, 24 months).',
        effects: guard('ev4_holy_of_holies:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (alive(ctx, 'HYR')) h.adjust(ctx, 'HYR', { legitimacy: -10 });
          if (alive(ctx, 'ARI')) h.adjust(ctx, 'ARI', { legitimacy: -10 });
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.religion !== 'judaism') continue;
            h.addProvinceModifier(ctx, p.name, {
              id: 'profaned_veil', name: 'The Profaned Veil', months: 24,
              effects: { unrest: 2 },
            });
          }
          h.setFlag(ctx, 'veilProfaned', true);
        }),
      },
      {
        label: 'Purify the courts at dawn',
        tooltip: 'The rites resume before the rumor does: each brother −100 talents and −5 legitimacy; the provinces of the faith +1 unrest for 24 months ("The Rites Resumed").',
        effects: guard('ev4_holy_of_holies:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (alive(ctx, 'HYR')) h.adjust(ctx, 'HYR', { legitimacy: -5, treasury: -100 });
          if (alive(ctx, 'ARI')) h.adjust(ctx, 'ARI', { legitimacy: -5, treasury: -100 });
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.religion !== 'judaism') continue;
            h.addProvinceModifier(ctx, p.name, {
              id: 'profaned_veil', name: 'The Rites Resumed', months: 24,
              effects: { unrest: 1 },
            });
          }
          h.setFlag(ctx, 'veilProfaned', true);
        }),
      },
    ],
  },

  // ── 12 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_parthia_stirs',
    title: 'Phraates Weighs the Roman',
    desc: 'The King of Kings has watched Tigranes kneel and Syria become a province, and '
      + 'his councilors are divided: some say the Euphrates is a wall, some say it is a '
      + 'door, and all agree that the Roman on the far bank has never in his life stopped '
      + 'at a river because it was wide.',
    forTag: 'both',
    trigger: safeTrigger('ev4_parthia_stirs', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'pompeyCame') && dateGE(ctx, -63, 1) && alive(ctx, 'PAR') && alive(ctx, 'ROM')),
    chance: 0.35,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The river is a door',
        tooltip: 'Either Parthia masses and Rome garrisons the east ("Eastern Anxiety": passive 6 months) — or the King of Kings crosses.',
        effects: guard('ev4_parthia_stirs:0', (ctx) => {
          const h = ctx.helpers;
          if (ctx.rng.chance(0.3) && alive(ctx, 'PAR') && alive(ctx, 'ROM')) {
            h.declareWar(ctx, 'PAR', 'ROM', 'The Euphrates War');
            h.notify(ctx, {
              title: 'Parthia crosses the Euphrates',
              text: 'Phraates has chosen his moment — with the legions entangled in Judaea.',
              type: 'war',
            });
          } else {
            h.addTagModifier(ctx, 'ROM', {
              id: 'eastern_anxiety', name: 'Eastern Anxiety', months: 6,
              effects: { aiPassive: true },
            });
          }
        }),
      },
      {
        label: 'A gift for the far bank',
        tooltip: 'Phraates masses — or crosses — all the same, but the brothers hedge: each court alive −50 talents; Parthia\'s opinion of each +20.',
        effects: guard('ev4_parthia_stirs:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (ctx.rng.chance(0.3) && alive(ctx, 'PAR') && alive(ctx, 'ROM')) {
            h.declareWar(ctx, 'PAR', 'ROM', 'The Euphrates War');
            h.notify(ctx, {
              title: 'Parthia crosses the Euphrates',
              text: 'Phraates has chosen his moment — with the legions entangled in Judaea.',
              type: 'war',
            });
          } else {
            h.addTagModifier(ctx, 'ROM', {
              id: 'eastern_anxiety', name: 'Eastern Anxiety', months: 6,
              effects: { aiPassive: true },
            });
          }
          for (const t of ['HYR', 'ARI']) {
            if (!alive(ctx, t)) continue;
            h.adjust(ctx, t, { treasury: -50 });
            if (g.tags.PAR && g.tags.PAR.opinion) {
              g.tags.PAR.opinion[t] = Math.min(200, (g.tags.PAR.opinion[t] || 0) + 20);
            }
          }
        }),
      },
    ],
  },

  // ── THE ROMAN CLOCK CONTINUES ─────────────────────────────────────────────
  {
    id: 'ev4_first_triumvirate',
    title: 'Three Men Divide the Republic',
    worldLabel: 'Caesar, Pompey, and Crassus form their compact',
    desc: 'In Rome, Caesar, Pompey, and Crassus discover that three private ambitions '
      + 'can govern more efficiently than the public constitution. Eastern clients now '
      + 'have several Roman patrons to court—and several Roman quarrels in which to be '
      + 'spent.',
    forTag: 'both',
    date: { y: -60, m: 7 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'Every embassy needs three copies',
      tooltip: 'Rome gains influence and income for six years, but patronage competition costs legitimacy. Local Judaean outcomes are not rewritten.',
      effects: guard('ev4_first_triumvirate:0', (ctx) => {
        if (!alive(ctx, 'ROM')) return;
        ctx.helpers.adjust(ctx, 'ROM', { infl: 40, legitimacy: -10 });
        ctx.helpers.addTagModifier(ctx, 'ROM', {
          id: 'first_triumvirate', name: 'The Compact of Three', months: 72,
          effects: { incomeMult: 1.06 },
        });
        ctx.helpers.chronicle(ctx, 'diplomacy', 'Caesar, Pompey, and Crassus form the compact later called the First Triumvirate.');
      }),
    }],
  },
  {
    id: 'ev4_carrhae_campaign',
    title: 'Crassus Crosses the Euphrates',
    worldLabel: 'Crassus opens the campaign that leads to Carrhae',
    desc: 'Crassus has the wealth, the consulship, and no conquest to place beside those '
      + 'of his partners. He crosses the Euphrates in search of one. Surena gathers the '
      + 'Parthian horse. The old chronicle knows the name Carrhae; this one will let the '
      + 'armies decide whether it means the same thing.',
    forTag: 'both',
    date: { y: -53, m: 5 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'The eagles enter Mesopotamia',
      tooltip: 'Rome and Parthia go to war if both survive. Historical field armies appear, but Carrhae is fought rather than declared by text.',
      effects: guard('ev4_carrhae_campaign:0', (ctx) => {
        if (!alive(ctx, 'ROM') || !alive(ctx, 'PAR')) return;
        const already = (ctx.game.wars || []).some((w) => {
          const all = (w.attackers || []).concat(w.defenders || []);
          return all.indexOf('ROM') >= 0 && all.indexOf('PAR') >= 0;
        });
        if (!already) ctx.helpers.declareWar(ctx, 'ROM', 'PAR', "Crassus' Parthian War");
        ctx.helpers.spawnArmy(ctx, 'ROM', 'Carrhae', {
          inf: 12, cav: 3, name: 'Army of Crassus',
          general: { name: 'Marcus Licinius Crassus', fire: 2, shock: 2, maneuver: 1 },
        });
        ctx.helpers.spawnArmy(ctx, 'PAR', 'Dura-Europos', {
          inf: 2, cav: 10, name: 'Horse of Surena',
          general: { name: 'Surena', fire: 2, shock: 5, maneuver: 5 },
        });
        ctx.helpers.addTagModifier(ctx, 'PAR', {
          id: 'surenas_screen', name: "Surena's Screen", months: 12,
          effects: { moraleMult: 1.08 },
        });
        ctx.helpers.chronicle(ctx, 'war', 'Crassus crosses the Euphrates; Surena rides to meet him, and the result belongs to the field.');
      }),
    }],
  },
  {
    id: 'ev4_caesar_civil_war',
    title: 'The Republic Divides',
    worldLabel: 'Caesar and Pompey begin the Roman civil war',
    desc: 'Caesar crosses the Rubicon; Pompey and the Senate leave Rome; every governor '
      + 'and client king must decide which Roman Republic is the lawful one. The eastern '
      + 'garrisons remain on the map, but their orders, money, and reinforcements now look west.',
    forTag: 'both',
    date: { y: -49, m: 1 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'Rome has two centers and no peace',
      tooltip: 'Rome loses stability and reinforcement capacity for three years. Its eastern neighbors gain a strategic opening.',
      effects: guard('ev4_caesar_civil_war:0', (ctx) => {
        if (!alive(ctx, 'ROM')) return;
        ctx.helpers.adjust(ctx, 'ROM', { stability: -2, legitimacy: -20, manpower: -8000 });
        ctx.helpers.addTagModifier(ctx, 'ROM', {
          id: 'caesar_pompey_war', name: 'The Great Roman Civil War', months: 36,
          effects: { reinforceMult: 0.65, aiPassive: true },
        });
        ctx.helpers.chronicle(ctx, 'war', 'Caesar crosses the Rubicon; the Roman Republic divides against itself.');
      }),
    }],
  },

  // ── 13 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_kingdom_restored',
    title: 'One Crown',
    desc: 'The heralds have shouted themselves hoarse in every market from Gaza to '
      + 'Gischala: the war of the brothers is over, and the kingdom of Jannaeus stands '
      + 'whole under a single crown. In the Temple courts the priests read the psalm of '
      + 'brothers dwelling in unity, and manage to keep straight faces; in the villages '
      + 'they simply plant, for once, in ground no army will cross before harvest.',
    forTag: 'player',
    aiOption: 0,
    options: [
      {
        label: 'How good and how pleasant',
        tooltip: 'The kingdom is whole. +1 stability.',
        effects: guard('ev4_kingdom_restored:0', (ctx) => {
          ctx.helpers.adjust(ctx, ctx.game.playerTag, { stability: 1 });
        }),
      },
      {
        label: 'Open the granaries',
        tooltip: 'A year of the king\'s bread instead of a psalm: −100 talents; every province of the faith −1 unrest for 12 months ("The King\'s Bread").',
        effects: guard('ev4_kingdom_restored:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          h.adjust(ctx, g.playerTag, { treasury: -100 });
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.religion !== 'judaism') continue;
            h.addProvinceModifier(ctx, p.name, {
              id: 'kings_bread', name: 'The King\'s Bread', months: 12,
              effects: { unrest: -1 },
            });
          }
        }),
      },
    ],
  },

  // Fired by BOOKMARK_67.checkVictory when the unified kingdom reaches +40
  // war score against Rome (SPEC §32); never fires on its own. Pompey's
  // settlement is an OFFER — accepted, the war ends and every occupied
  // province outside the faith returns; refused, the legions keep coming.
  {
    id: 'ev4_rome_recoils',
    title: 'Rome Recoils',
    requiresWar: [['ROM', 'HYR'], ['ROM', 'ARI']],
    desc: 'The legions came expecting an arbitration and found a kingdom — one king, '
      + 'one army, and hill country that eats cohorts. Pompey, who never fights wars '
      + 'he might lose slowly, sends word: Rome will recognize the kingdom of Judaea, '
      + 'call the recognition his own wise settlement, and march elsewhere. The hills '
      + 'of the faith would be Judaea\u2019s; the Greek cities go home. Or the passes can '
      + 'keep eating cohorts.',
    forTag: 'player',
    major: true,
    trigger: safeTrigger('ev4_rome_recoils', () => false),
    aiOption: 0,
    options: [
      {
        label: 'Accept the settlement',
        tooltip: 'Victory (score 200). The Roman war ends; Judaea keeps the provinces of the faith it holds, and every other occupied town returns.',
        effects: guard('ev4_rome_recoils:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const me = g.playerTag;
          h.fireEvent(ctx, 'ev4_kingdom_restored');
          const w = (g.wars || []).find((x) => x
            && (x.attackers.concat(x.defenders)).indexOf(me) >= 0
            && (x.attackers.concat(x.defenders)).indexOf('ROM') >= 0);
          const key = w && (w.attackers || []).indexOf(me) >= 0 ? 'att' : 'def';
          h.endWar(ctx, me, 'ROM', key, { keep: (p) => p.religion === 'judaism' });
          h.endGame(ctx, {
            result: 'win',
            title: 'Rome Recoils',
            text: 'The legions came expecting an arbitration and found a kingdom. Pompey '
              + 'recognizes the kingdom of Judaea and calls it his own wise settlement.',
            score: 200,
          });
        }),
      },
      {
        label: 'The passes are not yet full',
        tooltip: 'The war goes on. +5 legitimacy; the settlement will not be offered twice.',
        effects: guard('ev4_rome_recoils:1', (ctx) => {
          ctx.helpers.adjust(ctx, ctx.game.playerTag, { legitimacy: 5 });
        }),
      },
    ],
  },
];
