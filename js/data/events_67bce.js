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

// ── Helpers for the alternate-history victory strand ────────────────────────
// (fires only in worlds that beat the parchment; never in historical ones).

// The player's Hasmonean tag, or null when playing someone else.
function playerHasmonean(ctx) {
  const me = ctx.game.playerTag;
  return (me === 'HYR' || me === 'ARI') ? me : null;
}

// True while any province of the faith answers to Rome.
function romHoldsJudaea(ctx) {
  const g = ctx.game;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.religion !== 'judaism') continue;
    if (p.owner === 'ROM' || p.controller === 'ROM') return true;
  }
  return false;
}

// The brothers' war actually WON: the rival line dead, annexed, or bent to clienthood.
function unifiedUnder(ctx, tag) {
  const rival = tag === 'HYR' ? 'ARI' : 'HYR';
  const r = ctx.game.tags && ctx.game.tags[rival];
  return !r || r.alive === false || r.overlord === tag;
}

// Alive, no Roman collar, and no Roman war still burning.
function freeOfRome(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false && !t.overlord
    && (t.atWarWith || []).indexOf('ROM') === -1);
}

function bumpOpinion(g, of, toward, delta) {
  const t = g.tags && g.tags[of];
  if (!t) return;
  if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
  t.opinion[toward] = Math.max(-200, Math.min(200, (t.opinion[toward] || 0) + delta));
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
    decider: 'ARI',
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

  // ══ THE HERODIAN DECADES, 48–29 BCE ═══════════════════════════════════════
  // The chronicle continues past the bookmark's verdicts (SPEC §32: a chapter
  // verdict never closes the book). Source spine: Josephus, Antiquitates XIV–XV;
  // Bellum I.9–22; Cassius Dio XLII–LI; Suetonius, Divus Iulius 84. The house of
  // Antipater rides the Hyrcanan line (HYR); Antigonus inherits his father's
  // cause (ARI). Every effect is guarded — by 48 BCE the world may have
  // diverged far from the parchment.

  // ── 14 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_pharsalus',
    title: 'No Grave but the Sand',
    worldLabel: 'Pharsalus — Caesar breaks Pompey; murder at Pelusium',
    desc: 'At Pharsalus in Thessaly, Caesar\'s thin veterans broke the largest army the '
      + 'Republic ever raised against itself, and Pompey the Great — conqueror of the '
      + 'East, organizer of Syria, the man who walked through the Veil into the Holy of '
      + 'Holies and touched nothing — fled to Egypt in a hired ship. The boy-king\'s '
      + 'ministers met him in the shallows off Pelusium and stabbed him in the back as he '
      + 'read over his landing speech. In Jerusalem the news is repeated slowly, like a '
      + 'verse: the profaner of the sanctuary has no grave but the sand.',
    forTag: 'both',
    date: { y: -48, m: 8 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The Lord repays; the sand receives',
        tooltip: 'Rome consolidates under one master (+10 legitimacy). The Profaned Veil is lifted from every province of the faith; each surviving Judaean court +5 legitimacy.',
        effects: guard('ev4_pharsalus:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: 10 });
          if (h.getFlag(ctx, 'veilProfaned')) {
            for (let i = 1; i < g.provinces.length; i++) {
              const p = g.provinces[i];
              if (!p || p.impassable || p.religion !== 'judaism') continue;
              h.removeModifier(ctx, p.name, 'profaned_veil');
            }
          }
          for (const t of ['HYR', 'ARI']) {
            if (alive(ctx, t)) h.adjust(ctx, t, { legitimacy: 5 });
          }
          h.setFlag(ctx, 'pompeyDead', true);
          h.chronicle(ctx, 'war', 'Pharsalus: Caesar breaks Pompey, who is murdered on the beach at Pelusium.');
        }),
      },
      {
        label: 'Light no lamps; count the consequences',
        tooltip: 'Rome consolidates (+10 legitimacy). The courts study the new order instead of the old grudge: each surviving Judaean court +15 governance points.',
        effects: guard('ev4_pharsalus:1', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: 10 });
          for (const t of ['HYR', 'ARI']) {
            if (alive(ctx, t)) h.adjust(ctx, t, { gov: 15 });
          }
          h.setFlag(ctx, 'pompeyDead', true);
          h.chronicle(ctx, 'war', 'Pharsalus: Caesar breaks Pompey, who is murdered on the beach at Pelusium.');
        }),
      },
    ],
  },

  // ── 15 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_jewish_legion_alexandria',
    title: 'The Road to Alexandria',
    desc: 'Caesar has chased his dead rival into Egypt with two under-strength legions and '
      + 'is now besieged in Alexandria by the whole Ptolemaic army — the conqueror of the '
      + 'world trapped in a palace quarter. Mithridates of Pergamon marches to relieve him '
      + 'and stalls at Pelusium, and it is Antipater who unsticks the war: three thousand '
      + 'Jewish heavy infantry down the coast road, and a letter from the high priest that '
      + 'persuades the Jews of Onias\' land to open the road to Memphis. Caesar keeps '
      + 'accounts. Everyone knows Caesar keeps accounts.',
    forTag: 'HYR',
    date: { y: -47, m: 2 },
    major: true,
    // The AI sends the men when it can spare them (engine catches throws).
    aiOption: (ctx) => {
      try {
        const t = ctx.game.tags.HYR;
        return t && (t.manpower || 0) > 2500 ? 0 : 1;
      } catch (e) { return 0; }
    },
    options: [
      {
        label: 'Three thousand men down the coast road',
        tooltip: '−1,500 manpower, −50 talents. Rome\'s opinion of us +40; the land of Onias opens its gates (Leontopolis −1 unrest, 12 months). Caesar will remember.',
        effects: guard('ev4_jewish_legion_alexandria:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          h.adjust(ctx, 'HYR', { manpower: -1500, treasury: -50 });
          if (g.tags.ROM && g.tags.ROM.opinion) {
            g.tags.ROM.opinion.HYR = Math.min(200, (g.tags.ROM.opinion.HYR || 0) + 40);
          }
          h.addProvinceModifier(ctx, 'Leontopolis', {
            id: 'onias_gate', name: 'The Land of Onias Opens the Road', months: 12,
            effects: { unrest: -1 },
          });
          h.setFlag(ctx, 'jewsOpenedTheRoad', true);
          h.notify(ctx, {
            title: 'Antipater marches for Caesar',
            text: 'Three thousand Jewish soldiers cross the frontier at Pelusium; the Jews of Onias\' land open the road to Memphis.',
            type: 'info', provName: 'Pelusium',
          });
        }),
      },
      {
        label: 'Egypt\'s wars are Egypt\'s',
        tooltip: 'Keep the men home. Rome\'s opinion of us −10 — Caesar keeps those accounts too.',
        effects: guard('ev4_jewish_legion_alexandria:1', (ctx) => {
          const g = ctx.game;
          if (g.tags.ROM && g.tags.ROM.opinion) {
            g.tags.ROM.opinion.HYR = Math.max(-200, (g.tags.ROM.opinion.HYR || 0) - 10);
          }
        }),
      },
    ],
  },

  // ── 16 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_caesars_charter',
    title: 'Caesar\'s Gratitude',
    desc: 'The dictator pays his debts in parchment, which outlasts silver: Hyrcanus is '
      + 'confirmed ethnarch and high priest of the Jews in perpetuity; the walls Pompey '
      + 'threw down may rise again; Joppa and its harbor dues come home; the tribute is '
      + 'remitted in every seventh year, because Caesar has read that the land itself '
      + 'keeps the Sabbath. And a line near the bottom, easy to miss: Antipater the '
      + 'Idumean, citizen of Rome, free of tribute, procurator of Judaea — the servant '
      + 'now holds a Roman title the master cannot revoke.',
    forTag: 'both',
    decider: 'HYR',
    date: { y: -47, m: 7 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Read the charters in every synagogue',
        tooltip: 'Hyrcanus: +15 legitimacy, +1 stability; "Caesar\'s Charter" (+8% income, permanent); Jerusalem rebuilds her walls (−1 unrest, permanent); Joppa returns if Rome holds it; Rome\'s opinion +30.',
        effects: guard('ev4_caesars_charter:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (!alive(ctx, 'HYR')) return;
          h.adjust(ctx, 'HYR', { legitimacy: 15, stability: 1 });
          h.addTagModifier(ctx, 'HYR', {
            id: 'caesars_charter', name: 'Caesar\'s Charter', months: -1,
            effects: { incomeMult: 1.08 },
          });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'walls_rebuilt', name: 'The Walls Rise Again', months: -1,
            effects: { unrest: -1 },
          });
          const joppa = ctx.prov('Joppa');
          if (joppa && joppa.controller === 'ROM') h.changeOwner(ctx, 'Joppa', 'HYR');
          if (g.tags.ROM && g.tags.ROM.opinion) {
            g.tags.ROM.opinion.HYR = Math.min(200, (g.tags.ROM.opinion.HYR || 0) + 30);
          }
          h.setFlag(ctx, 'caesarsCharter', true);
          h.chronicle(ctx, 'diplomacy', 'Caesar confirms Hyrcanus as ethnarch and high priest; Antipater is made procurator of Judaea and citizen of Rome.');
        }),
      },
      {
        label: 'Bank the sabbatical remission',
        tooltip: 'The quieter reading: Hyrcanus +10 legitimacy, +150 talents held back from the tax farmers; Rome\'s opinion +15. No charter modifier — parchment unread is parchment spent.',
        effects: guard('ev4_caesars_charter:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (!alive(ctx, 'HYR')) return;
          h.adjust(ctx, 'HYR', { legitimacy: 10, treasury: 150 });
          if (g.tags.ROM && g.tags.ROM.opinion) {
            g.tags.ROM.opinion.HYR = Math.min(200, (g.tags.ROM.opinion.HYR || 0) + 15);
          }
          h.setFlag(ctx, 'caesarsCharter', true);
          h.chronicle(ctx, 'diplomacy', 'Caesar confirms Hyrcanus as ethnarch; the sabbatical-year remission is banked before it is read aloud.');
        }),
      },
    ],
  },

  // ── 17 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_sons_of_antipater',
    title: 'The Procurator Sets His Sons',
    desc: 'Antipater, who never takes anything for himself twice when once will do, '
      + 'distributes the kingdom the way a careful man banks a fortune: Phasael, the '
      + 'steady elder, receives Jerusalem and the hill country; Galilee — bandit-ridden, '
      + 'frontier Galilee, where reputations are made — goes to the younger son, Herod, '
      + 'who is twenty-five and already walks like a man who has read his own future. The '
      + 'ethnarch signs the appointments. It is not entirely clear he read them first.',
    forTag: 'HYR',
    date: { y: -47, m: 10 },
    aiOption: 0,
    options: [
      {
        label: 'Galilee for the young one',
        tooltip: '+10 influence points; Herod (2/3/4) takes command of new Galilean levies at Sepphoris. The house of Antipater grows a second head.',
        effects: guard('ev4_sons_of_antipater:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HYR')) return;
          h.adjust(ctx, 'HYR', { infl: 10 });
          h.spawnArmy(ctx, 'HYR', 'Sepphoris', {
            inf: 2, cav: 1, name: 'Levies of Galilee',
            general: { name: 'Herod', fire: 2, shock: 3, maneuver: 4 },
          });
          h.setFlag(ctx, 'herodRises', true);
        }),
      },
      {
        label: 'The offices stay Hasmonean',
        tooltip: '+5 legitimacy — and the House of Antipater takes note of the slight (faction approval falls).',
        effects: guard('ev4_sons_of_antipater:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HYR')) return;
          h.adjust(ctx, 'HYR', { legitimacy: 5 });
          h.factionShift(ctx, 'HYR', 'antipater', -15);
        }),
      },
    ],
  },

  // ── 18 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_sanhedrin_herod',
    title: 'The Young Man in Purple',
    desc: 'Herod\'s first act in Galilee was to hunt down Hezekiah the brigand-chief and '
      + 'execute him with his whole band — no trial, no Sanhedrin, no law but the sword '
      + 'and the applause of the Syrian towns. The mothers of the slain cried out in the '
      + 'Temple daily until the council summoned him. He came: in purple, hair dressed, '
      + 'a bodyguard at the door, and the judges studied the floor — all but old Sameas, '
      + 'who rose and said: "Know this, that he whom you would acquit for fear will one '
      + 'day punish you." The ethnarch, catching a look from the Roman legate\'s man, '
      + 'adjourned the court. Herod rode for Damascus before nightfall, and he will '
      + 'remember every face in that room.',
    forTag: 'HYR',
    date: { y: -46, m: 6 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Adjourn the trial',
        tooltip: 'Galilee is quiet (−1 unrest in Sepphoris and Gischala, 12 months); +10 martial points — but −5 legitimacy, the Pharisees seethe, and Herod remembers.',
        effects: guard('ev4_sanhedrin_herod:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HYR')) return;
          h.adjust(ctx, 'HYR', { legitimacy: -5, mar: 10 });
          h.factionShift(ctx, 'HYR', 'pharisees', -10);
          for (const pn of ['Sepphoris', 'Gischala']) {
            h.addProvinceModifier(ctx, pn, {
              id: 'hezekiah_broken', name: 'The Brigands Broken', months: 12,
              effects: { unrest: -1 },
            });
          }
          h.setFlag(ctx, 'herodRemembers', true);
        }),
      },
      {
        label: 'Let Sameas be heard',
        tooltip: 'The court condemns; Herod flees his command to Damascus (Herod is removed as general). +10 legitimacy, the Pharisees approve, Galilee still quiet — but −10 martial points.',
        effects: guard('ev4_sanhedrin_herod:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HYR')) return;
          h.adjust(ctx, 'HYR', { legitimacy: 10, mar: -10 });
          h.factionShift(ctx, 'HYR', 'pharisees', 15);
          h.killGeneral(ctx, 'HYR', 'Herod');
          for (const pn of ['Sepphoris', 'Gischala']) {
            h.addProvinceModifier(ctx, pn, {
              id: 'hezekiah_broken', name: 'The Brigands Broken', months: 12,
              effects: { unrest: -1 },
            });
          }
          h.setFlag(ctx, 'herodRemembers', true);
        }),
      },
    ],
  },

  // ── 19 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_ides_of_march',
    title: 'The Ides of March',
    worldLabel: 'Caesar is assassinated in the Senate house',
    desc: 'Twenty-three wounds in the Senate house, at the foot of Pompey\'s statue. '
      + 'Caesar — who confirmed the ethnarch, rebuilt the walls, remitted the seventh '
      + 'year, and never once asked the Jews to break their Law — is dead, and the men '
      + 'who killed him call it liberty. Suetonius will record that of all the foreign '
      + 'peoples who mourned at the pyre, the Jews came longest: night after night in the '
      + 'Forum, chanting the dirges each in their own fashion, for the one Roman who had '
      + 'been, in his way, a friend.',
    forTag: 'both',
    date: { y: -44, m: 3 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Night after night at the pyre',
        tooltip: 'Rome: −1 stability, −15 legitimacy. Each surviving Judaean court: +5 legitimacy; Rome\'s opinion of each +10 — grief, publicly kept, is also policy.',
        effects: guard('ev4_ides_of_march:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { stability: -1, legitimacy: -15 });
          for (const t of ['HYR', 'ARI']) {
            if (!alive(ctx, t)) continue;
            h.adjust(ctx, t, { legitimacy: 5 });
            if (g.tags.ROM && g.tags.ROM.opinion) {
              g.tags.ROM.opinion[t] = Math.min(200, (g.tags.ROM.opinion[t] || 0) + 10);
            }
          }
          h.setFlag(ctx, 'caesarDead', true);
          h.chronicle(ctx, 'war', 'Caesar is assassinated; of all foreigners, the Jews mourn longest at the pyre.');
        }),
      },
      {
        label: 'Guard the charters before the pyre cools',
        tooltip: 'Rome: −1 stability, −15 legitimacy. Each surviving Judaean court: +20 governance points — the dead man\'s grants must outlive the dead man\'s party.',
        effects: guard('ev4_ides_of_march:1', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { stability: -1, legitimacy: -15 });
          for (const t of ['HYR', 'ARI']) {
            if (alive(ctx, t)) h.adjust(ctx, t, { gov: 20 });
          }
          h.setFlag(ctx, 'caesarDead', true);
          h.chronicle(ctx, 'war', 'Caesar is assassinated; his eastern charters are copied and hidden before the pyre cools.');
        }),
      },
    ],
  },

  // ── 20 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_cassius_talents',
    title: 'Seven Hundred Talents',
    desc: 'Cassius the tyrannicide holds Syria now, and a man raising an army against '
      + 'Antony and the young Caesar does not ask; he assesses. Judaea\'s share is seven '
      + 'hundred talents, due at once. Herod delivers Galilee\'s hundred first, wrapped '
      + 'and inventoried, and is made stratégos of Coele-Syria for his promptness. The '
      + 'towns that cannot pay learn the other arithmetic: Gophna, Emmaus, Lydda and '
      + 'Thamna are marked for the slave-dealers, populations and all, to balance the '
      + 'ledger.',
    forTag: 'both',
    date: { y: -43, m: 5 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Pay, by any means, in full',
        tooltip: 'Each surviving Judaean court −120 talents; Rome\'s opinion of each +20. Hyrcanus\' court: +10 martial points (Herod, stratégos of Coele-Syria, delivers first).',
        effects: guard('ev4_cassius_talents:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          for (const t of ['HYR', 'ARI']) {
            if (!alive(ctx, t)) continue;
            h.adjust(ctx, t, { treasury: -120 });
            if (g.tags.ROM && g.tags.ROM.opinion) {
              g.tags.ROM.opinion[t] = Math.min(200, (g.tags.ROM.opinion[t] || 0) + 20);
            }
          }
          if (alive(ctx, 'HYR')) h.adjust(ctx, 'HYR', { mar: 10 });
          h.chronicle(ctx, 'diplomacy', 'Cassius exacts 700 talents from Judaea; Herod delivers Galilee\'s share first and is named stratégos of Coele-Syria.');
        }),
      },
      {
        label: 'The quota fails; the dealers come',
        tooltip: 'Each surviving court −40 talents only — but Emmaus and Lydda are sold into slavery (+3 unrest, 24 months) and Rome\'s opinion of each −30.',
        effects: guard('ev4_cassius_talents:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          for (const t of ['HYR', 'ARI']) {
            if (!alive(ctx, t)) continue;
            h.adjust(ctx, t, { treasury: -40 });
            if (g.tags.ROM && g.tags.ROM.opinion) {
              g.tags.ROM.opinion[t] = Math.max(-200, (g.tags.ROM.opinion[t] || 0) - 30);
            }
          }
          for (const pn of ['Emmaus', 'Lydda']) {
            h.addProvinceModifier(ctx, pn, {
              id: 'sold_into_slavery', name: 'Sold by the Tyrannicide', months: 24,
              effects: { unrest: 3 },
            });
          }
          h.chronicle(ctx, 'war', 'Four towns fail Cassius\' quota and are sold into slavery: Gophna, Emmaus, Lydda, Thamna.');
        }),
      },
    ],
  },

  // ── 21 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_antipater_poisoned',
    title: 'Poison at the Ethnarch\'s Table',
    desc: 'Malichus wanted the procuratorship and took the shortest road: the cupbearer '
      + 'was bought, and Antipater the Idumean — who had survived three Roman civil wars '
      + 'by always being useful to the winner before the war started — died at Hyrcanus\' '
      + 'own table, between the fish and the wine. Malichus weeps loudest at the funeral. '
      + 'Herod, in Galilee, writes to Cassius for permission of a certain kind, and '
      + 'receives it by return courier.',
    forTag: 'HYR',
    date: { y: -43, m: 11 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Roman daggers on the beach at Tyre',
        tooltip: 'Antipater is dead; his arrangements fray (lose Antipater\'s modifiers). Herod avenges his father — Malichus dies at Tyre: +10 martial points, −5 legitimacy (murder answers murder at court).',
        effects: guard('ev4_antipater_poisoned:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HYR')) return;
          h.killGeneral(ctx, 'HYR', 'Antipater the Idumean');
          h.removeModifier(ctx, 'HYR', 'antipaters_web');
          h.removeModifier(ctx, 'HYR', 'antipaters_credit');
          h.adjust(ctx, 'HYR', { mar: 10, legitimacy: -5 });
          h.setFlag(ctx, 'antipaterDead', true);
          h.notify(ctx, {
            title: 'Malichus dies at Tyre',
            text: 'Roman daggers, borrowed with Cassius\' blessing, kill Antipater\'s poisoner on the beach outside Tyre. Herod is head of his house now.',
            type: 'war', provName: 'Tyre',
          });
        }),
      },
      {
        label: 'Let the law have Malichus',
        tooltip: 'Antipater is dead; his arrangements fray. The courts move slowly: +10 governance points, but "The Web Unravels" (−10% income, 12 months) while the fixer\'s debtors test the heirs.',
        effects: guard('ev4_antipater_poisoned:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HYR')) return;
          h.killGeneral(ctx, 'HYR', 'Antipater the Idumean');
          h.removeModifier(ctx, 'HYR', 'antipaters_web');
          h.removeModifier(ctx, 'HYR', 'antipaters_credit');
          h.adjust(ctx, 'HYR', { gov: 10 });
          h.addTagModifier(ctx, 'HYR', {
            id: 'web_unravels', name: 'The Web Unravels', months: 12,
            effects: { incomeMult: 0.9 },
          });
          h.setFlag(ctx, 'antipaterDead', true);
        }),
      },
    ],
  },

  // ── 22 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_antony_daphne',
    title: 'Antony at Daphne',
    desc: 'Philippi has changed the East\'s master again, and Antony holds court in the '
      + 'pleasure-groves of Daphne outside Antioch. A hundred notables of the Jews come '
      + 'to accuse the sons of Antipater; Antony, who remembers young Herod from '
      + 'Gabinius\' campaigns and remembers Antipater\'s money from his own thin years, '
      + 'listens with the patience of a man who has already decided. Herod and Phasael '
      + 'are named tetrarchs of the Jews. A second delegation, a thousand strong, tries '
      + 'again at Tyre; his soldiers meet it on the shore, and not gently.',
    forTag: 'both',
    decider: 'HYR',
    date: { y: -41, m: 10 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Tetrarchs by Antony\'s word',
        tooltip: 'Hyrcanus\' court: +20 influence points, +5 legitimacy; Rome\'s opinion +20 — but the delegation whipped at Tyre is not forgotten (Jerusalem +1 unrest, 12 months).',
        effects: guard('ev4_antony_daphne:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (!alive(ctx, 'HYR')) return;
          h.adjust(ctx, 'HYR', { infl: 20, legitimacy: 5 });
          if (g.tags.ROM && g.tags.ROM.opinion) {
            g.tags.ROM.opinion.HYR = Math.min(200, (g.tags.ROM.opinion.HYR || 0) + 20);
          }
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'tyre_scourging', name: 'The Delegation Scourged at Tyre', months: 12,
            effects: { unrest: 1 },
          });
          h.setFlag(ctx, 'tetrarchsNamed', true);
          h.chronicle(ctx, 'diplomacy', 'Antony names Herod and Phasael tetrarchs of the Jews; the protesting delegation at Tyre is driven off by soldiers.');
        }),
      },
      {
        label: 'Buy the delegations a hearing',
        tooltip: 'Each surviving Judaean court −80 talents to keep the accusers and the soldiers apart. No tetrarchy boost, no scourging, no unrest — Antony pockets the silver and decides nothing.',
        effects: guard('ev4_antony_daphne:1', (ctx) => {
          const h = ctx.helpers;
          for (const t of ['HYR', 'ARI']) {
            if (alive(ctx, t)) h.adjust(ctx, t, { treasury: -80 });
          }
          h.setFlag(ctx, 'tetrarchsNamed', true);
          h.chronicle(ctx, 'diplomacy', 'Antony at Daphne hears the Jewish delegations, takes their gifts, and confirms everyone in ambiguity.');
        }),
      },
    ],
  },

  // ── 23 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_parthian_flood',
    title: 'The Parthian Flood',
    worldLabel: 'Pacorus and Barzapharnes overrun Syria',
    desc: 'The Euphrates has finally been a door. Pacorus the king\'s son and the satrap '
      + 'Barzapharnes pour across the river and Syria goes down like a tent in a storm — '
      + 'and riding with the horse-archers comes Antigonus, son of Aristobulus, who has '
      + 'bought the invasion of his own country at a quoted price: a thousand talents of '
      + 'silver and five hundred women, payable on delivery of Jerusalem. The Hasmonean '
      + 'claim rides home under Parthian lances.',
    forTag: 'both',
    date: { y: -40, m: 6 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The river is a door',
        tooltip: 'Parthian armies enter Syria; Parthia declares war on Rome and on Hyrcanus\' court. If the Aristobulid line survives, Antigonus (2/3/3) takes its crown, +10 legitimacy, and turns on Hyrcanus.',
        effects: guard('ev4_parthian_flood:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (!alive(ctx, 'PAR')) return;
          h.spawnArmy(ctx, 'PAR', 'Damascus', {
            inf: 4, cav: 8, name: 'Horse of Pacorus',
            general: { name: 'Pacorus', fire: 3, shock: 4, maneuver: 4 },
          });
          h.spawnArmy(ctx, 'PAR', 'Chalcis', {
            inf: 3, cav: 5, name: 'Riders of Barzapharnes',
            general: { name: 'Barzapharnes', fire: 2, shock: 3, maneuver: 4 },
          });
          const atWar = (a, b) => (g.wars || []).some((w) => {
            const all = (w.attackers || []).concat(w.defenders || []);
            return all.indexOf(a) >= 0 && all.indexOf(b) >= 0;
          });
          if (alive(ctx, 'ROM') && !atWar('PAR', 'ROM')) h.declareWar(ctx, 'PAR', 'ROM', 'The Parthian Invasion of Syria');
          if (alive(ctx, 'HYR') && !atWar('PAR', 'HYR')) h.declareWar(ctx, 'PAR', 'HYR', 'The Parthian Invasion of Syria');
          if (alive(ctx, 'ARI')) {
            h.setRuler(ctx, 'ARI', { name: 'Antigonus II Mattathias', title: 'King and High Priest', gov: 2, infl: 3, mar: 3, age: 38 });
            h.adjust(ctx, 'ARI', { legitimacy: 10 });
            if (g.tags.ARI && g.tags.ARI.opinion) g.tags.ARI.opinion.PAR = 100;
            if (g.tags.PAR && g.tags.PAR.opinion) g.tags.PAR.opinion.ARI = 80;
            if (alive(ctx, 'HYR') && !atWar('ARI', 'HYR')) h.declareWar(ctx, 'ARI', 'HYR', 'Antigonus\' Bid for the Crown');
          }
          h.setFlag(ctx, 'parthianFlood', true);
          h.notify(ctx, {
            title: 'The Parthians cross the Euphrates',
            text: 'Pacorus and Barzapharnes overrun Syria. Antigonus son of Aristobulus rides with them, the price of Jerusalem already agreed.',
            type: 'war', provName: 'Damascus',
          });
        }),
      },
      {
        label: 'Silver for the satrap, before he asks',
        tooltip: 'The flood comes all the same — but each surviving Judaean court pays −100 talents to be warned of its hour ("Forewarned": +5% morale, 12 months).',
        effects: guard('ev4_parthian_flood:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          for (const t of ['HYR', 'ARI']) {
            if (!alive(ctx, t)) continue;
            h.adjust(ctx, t, { treasury: -100 });
            h.addTagModifier(ctx, t, {
              id: 'forewarned', name: 'Forewarned', months: 12,
              effects: { moraleMult: 1.05 },
            });
          }
          if (!alive(ctx, 'PAR')) return;
          h.spawnArmy(ctx, 'PAR', 'Damascus', {
            inf: 4, cav: 8, name: 'Horse of Pacorus',
            general: { name: 'Pacorus', fire: 3, shock: 4, maneuver: 4 },
          });
          h.spawnArmy(ctx, 'PAR', 'Chalcis', {
            inf: 3, cav: 5, name: 'Riders of Barzapharnes',
            general: { name: 'Barzapharnes', fire: 2, shock: 3, maneuver: 4 },
          });
          const atWar = (a, b) => (g.wars || []).some((w) => {
            const all = (w.attackers || []).concat(w.defenders || []);
            return all.indexOf(a) >= 0 && all.indexOf(b) >= 0;
          });
          if (alive(ctx, 'ROM') && !atWar('PAR', 'ROM')) h.declareWar(ctx, 'PAR', 'ROM', 'The Parthian Invasion of Syria');
          if (alive(ctx, 'HYR') && !atWar('PAR', 'HYR')) h.declareWar(ctx, 'PAR', 'HYR', 'The Parthian Invasion of Syria');
          if (alive(ctx, 'ARI')) {
            h.setRuler(ctx, 'ARI', { name: 'Antigonus II Mattathias', title: 'King and High Priest', gov: 2, infl: 3, mar: 3, age: 38 });
            h.adjust(ctx, 'ARI', { legitimacy: 10 });
            if (g.tags.ARI && g.tags.ARI.opinion) g.tags.ARI.opinion.PAR = 100;
            if (g.tags.PAR && g.tags.PAR.opinion) g.tags.PAR.opinion.ARI = 80;
            if (alive(ctx, 'HYR') && !atWar('ARI', 'HYR')) h.declareWar(ctx, 'ARI', 'HYR', 'Antigonus\' Bid for the Crown');
          }
          h.setFlag(ctx, 'parthianFlood', true);
        }),
      },
    ],
  },

  // ── 24 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_night_flight',
    title: 'The Night Flight',
    desc: 'Jerusalem is betrayed by parley: Phasael and old Hyrcanus, invited to treat '
      + 'with Barzapharnes, wake in chains. Phasael, denied a sword, dashes out his own '
      + 'brains against the stone of his cell. Hyrcanus\' ears are cropped — some say by '
      + 'Antigonus\' own teeth — so that no blemished man may ever again stand as high '
      + 'priest. And Herod, who never went to a parley in his life, loads his household, '
      + 'his mother, his betrothed Mariamne and eight hundred fighting men onto the night '
      + 'road south, beating back pursuit at every defile, toward the rock of Masada and '
      + 'the long way to Petra.',
    forTag: 'both',
    decider: 'HYR',
    date: { y: -40, m: 8 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The night road to Masada',
        tooltip: 'Hyrcanus\' court: −15 legitimacy (the high priest mutilated, the tetrarch dead), +10 martial points — the escape hardens the survivor. A household garrison holds Masada if we still control it.',
        effects: guard('ev4_night_flight:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HYR')) return;
          h.adjust(ctx, 'HYR', { legitimacy: -15, mar: 10 });
          if (h.controls(ctx, 'HYR', 'Masada')) {
            h.spawnArmy(ctx, 'HYR', 'Masada', {
              inf: 1, name: 'Household of Herod',
            });
          }
          h.setFlag(ctx, 'nightFlight', true);
          h.chronicle(ctx, 'war', 'Jerusalem betrayed: Phasael dead by his own hand, Hyrcanus\' ears cropped, Herod on the night road to Masada and Petra.');
        }),
      },
      {
        label: 'Stand and die at the walls',
        tooltip: 'No flight: −1,500 manpower and −10 legitimacy as the household is spent in the streets — but "Blood in the Gates" (+10% morale, 6 months) for those who remember it.',
        effects: guard('ev4_night_flight:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HYR')) return;
          h.adjust(ctx, 'HYR', { manpower: -1500, legitimacy: -10 });
          h.addTagModifier(ctx, 'HYR', {
            id: 'blood_in_the_gates', name: 'Blood in the Gates', months: 6,
            effects: { moraleMult: 1.1 },
          });
          h.setFlag(ctx, 'nightFlight', true);
          h.chronicle(ctx, 'war', 'The household stands at the walls of Jerusalem and is spent there; Phasael dead, Hyrcanus mutilated.');
        }),
      },
    ],
  },

  // ── 25 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_king_without_kingdom',
    title: 'A King with No Kingdom',
    desc: 'Rome, in winter. Herod came to beg a crown for Mariamne\'s young brother and '
      + 'walked out with one for himself: Antony moved it, Octavian seconded it, the '
      + 'Senate voted it in an afternoon — rex socius et amicus populi Romani, king of '
      + 'Judaea. He left the Senate house between Antony and Caesar\'s heir and went up '
      + 'to sacrifice on the Capitol, an Idumean commoner with a Hasmonean bride promised '
      + 'and not one city in his kingdom actually his. The Senate has given him a title. '
      + 'The sword must give him everything else.',
    forTag: 'both',
    decider: 'HYR',
    date: { y: -40, m: 12 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Between Antony and Caesar\'s heir',
        tooltip: 'Herod (4/4/5) becomes ruler of Hyrcanus\' realm: +20 legitimacy, Rome\'s opinion +60 — but every province of the faith murmurs ("An Idumean on the Throne": +1 unrest, 24 months).',
        effects: guard('ev4_king_without_kingdom:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (!alive(ctx, 'HYR')) return;
          h.setRuler(ctx, 'HYR', { name: 'Herod', title: 'King of Judaea', gov: 4, infl: 4, mar: 5, age: 33 });
          h.setHeir(ctx, 'HYR', null);
          h.adjust(ctx, 'HYR', { legitimacy: 20 });
          if (g.tags.ROM && g.tags.ROM.opinion) {
            g.tags.ROM.opinion.HYR = Math.min(200, (g.tags.ROM.opinion.HYR || 0) + 60);
          }
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.religion !== 'judaism') continue;
            h.addProvinceModifier(ctx, p.name, {
              id: 'idumean_throne', name: 'An Idumean on the Throne', months: 24,
              effects: { unrest: 1 },
            });
          }
          h.setFlag(ctx, 'herodKing', true);
          h.notify(ctx, {
            title: 'The Senate names Herod king',
            text: 'On Antony\'s motion, with Octavian consenting, Herod is voted king of Judaea — a king with no kingdom, and a sword to win one with.',
            type: 'info', provName: 'Jerusalem',
          });
          h.chronicle(ctx, 'diplomacy', 'The Roman Senate names Herod king of Judaea; he sacrifices on the Capitol between Antony and Octavian.');
        }),
      },
      {
        label: 'Regent for the Hasmoneans',
        tooltip: 'Herod takes the power but not the diadem: ruler of Hyrcanus\' realm as regent, +10 legitimacy, Rome\'s opinion +20, and no unrest — the throne stays formally Hasmonean.',
        effects: guard('ev4_king_without_kingdom:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (!alive(ctx, 'HYR')) return;
          h.setRuler(ctx, 'HYR', { name: 'Herod', title: 'Regent for the Hasmoneans', gov: 4, infl: 4, mar: 5, age: 33 });
          h.adjust(ctx, 'HYR', { legitimacy: 10 });
          if (g.tags.ROM && g.tags.ROM.opinion) {
            g.tags.ROM.opinion.HYR = Math.min(200, (g.tags.ROM.opinion.HYR || 0) + 20);
          }
          h.setFlag(ctx, 'herodKing', true);
          h.chronicle(ctx, 'diplomacy', 'The Senate offers Herod a crown; he takes the power and leaves the diadem, ruling as regent for the Hasmonean line.');
        }),
      },
    ],
  },

  // ── 26 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_arbela_caves',
    title: 'The Caves of Arbela',
    desc: 'The reconquest goes by the book Antipater never wrote down: Joppa first, so the '
      + 'sea is a friend; Masada relieved, so the family debt is paid; then Galilee, where '
      + 'the brigands of the cliffs above Magdala live in caves no ladder reaches. Herod '
      + 'lowers soldiers down the cliff face in cradles on iron chains, with grappling '
      + 'hooks and fire, and hauls the brigands out of the rock like mussels out of a '
      + 'shell. One old man at a cave mouth kills his seven children and his wife rather '
      + 'than surrender, and steps off the cliff. Galilee is quiet after that, in the way '
      + 'of quiet things.',
    forTag: 'HYR',
    date: { y: -38, m: 3 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Cradles, chains, and fire',
        tooltip: 'An army of the reconquest lands at Joppa. Galilee is scoured (−2 unrest in Sepphoris, Jotapata, Gischala and Tarichaea, 12 months); +10 martial points; −500 manpower.',
        effects: guard('ev4_arbela_caves:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HYR')) return;
          h.spawnArmy(ctx, 'HYR', 'Joppa', {
            inf: 5, cav: 1, name: 'Army of the King\'s Return',
            general: { name: 'Herod', fire: 3, shock: 4, maneuver: 4 },
          });
          h.adjust(ctx, 'HYR', { mar: 10, manpower: -500 });
          for (const pn of ['Sepphoris', 'Jotapata', 'Gischala', 'Tarichaea']) {
            h.addProvinceModifier(ctx, pn, {
              id: 'arbela_scoured', name: 'The Caves of Arbela Cleared', months: 12,
              effects: { unrest: -2 },
            });
          }
          h.setFlag(ctx, 'arbelaCleared', true);
          h.notify(ctx, {
            title: 'The cliff-caves fall',
            text: 'Soldiers in cradles on iron chains clear the brigand caves above Magdala. Galilee is quiet, in the way of quiet things.',
            type: 'war', provName: 'Tarichaea',
          });
        }),
      },
      {
        label: 'Offer the caves terms first',
        tooltip: 'The army lands at Joppa all the same. Mercy where mercy is taken: −1 unrest in the four Galilean towns for 12 months, +5 legitimacy — but no martial gain, and the cliffs stay half-wild.',
        effects: guard('ev4_arbela_caves:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HYR')) return;
          h.spawnArmy(ctx, 'HYR', 'Joppa', {
            inf: 5, cav: 1, name: 'Army of the King\'s Return',
            general: { name: 'Herod', fire: 3, shock: 4, maneuver: 4 },
          });
          h.adjust(ctx, 'HYR', { legitimacy: 5 });
          for (const pn of ['Sepphoris', 'Jotapata', 'Gischala', 'Tarichaea']) {
            h.addProvinceModifier(ctx, pn, {
              id: 'arbela_scoured', name: 'Terms at the Cave Mouths', months: 12,
              effects: { unrest: -1 },
            });
          }
          h.setFlag(ctx, 'arbelaCleared', true);
        }),
      },
    ],
  },

  // ── 27 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_siege_37',
    title: 'Sosius Marches on Jerusalem',
    desc: 'Antony has finally sent a general instead of a letter: Gaius Sosius, governor '
      + 'of Syria, with legions enough to end the question of Judaea. The army closes on '
      + 'Jerusalem where Antigonus holds the walls Pompey once breached, and the '
      + 'engineers begin the ramps in the same scars the old ones left. Five months, the '
      + 'veterans reckon, studying the stone. The men on the walls reckon in psalms.',
    forTag: 'both',
    date: { y: -37, m: 4 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The ramps rise in the old scars',
        tooltip: 'Sosius\' legions (10 inf, 2 cav) land at Emmaus; Rome and Hyrcanus\' court go to war with the Aristobulid line if they are not already.',
        effects: guard('ev4_siege_37:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const atWar = (a, b) => (g.wars || []).some((w) => {
            const all = (w.attackers || []).concat(w.defenders || []);
            return all.indexOf(a) >= 0 && all.indexOf(b) >= 0;
          });
          if (alive(ctx, 'ROM')) {
            h.spawnArmy(ctx, 'ROM', 'Emmaus', {
              inf: 10, cav: 2, name: 'Legions of Sosius',
              general: { name: 'Gaius Sosius', fire: 3, shock: 3, maneuver: 3 },
            });
            if (alive(ctx, 'ARI') && !atWar('ROM', 'ARI')) h.declareWar(ctx, 'ROM', 'ARI', 'The War for Jerusalem');
          }
          if (alive(ctx, 'HYR') && alive(ctx, 'ARI') && !atWar('HYR', 'ARI')) {
            h.declareWar(ctx, 'HYR', 'ARI', 'The War for Jerusalem');
          }
          h.setFlag(ctx, 'sosiusMarched', true);
          h.notify(ctx, {
            title: 'Sosius marches',
            text: 'Antony\'s governor of Syria brings his legions against Jerusalem. The engineers build their ramps in the scars Pompey left.',
            type: 'war', provName: 'Jerusalem',
          });
        }),
      },
      {
        label: 'Give the walls the winter',
        tooltip: 'The same war, begun deliberately: Sosius\' legions land, but the defenders dig in first ("Zion Fortified": +10% morale for the Aristobulid line, 12 months) and Hyrcanus\' court loses 5 legitimacy for the delay.',
        effects: guard('ev4_siege_37:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const atWar = (a, b) => (g.wars || []).some((w) => {
            const all = (w.attackers || []).concat(w.defenders || []);
            return all.indexOf(a) >= 0 && all.indexOf(b) >= 0;
          });
          if (alive(ctx, 'ROM')) {
            h.spawnArmy(ctx, 'ROM', 'Emmaus', {
              inf: 10, cav: 2, name: 'Legions of Sosius',
              general: { name: 'Gaius Sosius', fire: 3, shock: 3, maneuver: 3 },
            });
            if (alive(ctx, 'ARI') && !atWar('ROM', 'ARI')) h.declareWar(ctx, 'ROM', 'ARI', 'The War for Jerusalem');
          }
          if (alive(ctx, 'HYR') && alive(ctx, 'ARI') && !atWar('HYR', 'ARI')) {
            h.declareWar(ctx, 'HYR', 'ARI', 'The War for Jerusalem');
          }
          if (alive(ctx, 'ARI')) {
            h.addTagModifier(ctx, 'ARI', {
              id: 'zion_fortified', name: 'Zion Fortified', months: 12,
              effects: { moraleMult: 1.1 },
            });
          }
          if (alive(ctx, 'HYR')) h.adjust(ctx, 'HYR', { legitimacy: -5 });
          h.setFlag(ctx, 'sosiusMarched', true);
        }),
      },
    ],
  },

  // ── 28 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_city_stormed',
    title: 'Pay the Soldiers Not to Sack',
    desc: 'Five months, as the veterans reckoned, and then the storming: the outer wall, '
      + 'the inner, the Temple courts, and a killing in the streets that stopped '
      + 'answering to orders. Antigonus came out of the citadel and fell at Sosius\' feet '
      + 'weeping, and the Roman looked down and said "Antigone" — a woman\'s name for a '
      + 'kneeling king — and sent him to Antony at Antioch, where he was scourged at the '
      + 'post and beheaded: the first king Rome ever executed. Somewhere between the '
      + 'second wall and the citadel, Herod found time to be married — Mariamne, '
      + 'granddaughter of both warring brothers, the two bloods made one bed. Now his '
      + 'own soldiers and Sosius\' legionaries look at the richest city in the south the '
      + 'way soldiers look at a thing they have paid five months for.',
    forTag: 'HYR',
    major: true,
    trigger: safeTrigger('ev4_city_stormed', (ctx) =>
      dateGE(ctx, -37, 6) && alive(ctx, 'HYR')
      && !!ctx.helpers.getFlag(ctx, 'sosiusMarched')
      && ctx.helpers.controls(ctx, 'HYR', 'Jerusalem')),
    aiOption: 0,
    options: [
      {
        label: 'Empty the treasury into their fists',
        tooltip: '−150 talents to buy back our own capital from its conquerors: Jerusalem is spared (−1 unrest, 12 months), +15 legitimacy (the city spared, the Hasmonean bride wed). Antigonus dies at Antioch.',
        effects: guard('ev4_city_stormed:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HYR', { treasury: -150, legitimacy: 15 });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'city_spared', name: 'The City Bought Back', months: 12,
            effects: { unrest: -1 },
          });
          if (alive(ctx, 'ARI')) h.adjust(ctx, 'ARI', { legitimacy: -20 });
          h.setFlag(ctx, 'antigonusExecuted', true);
          h.chronicle(ctx, 'war', 'Jerusalem stormed; Herod pays the soldiers not to sack his own capital, marries Mariamne, and Antigonus — scourged and beheaded at Antioch — becomes the first king Rome ever executed.');
        }),
      },
      {
        label: 'The laws of war are the laws of war',
        tooltip: 'Let the soldiers have three hours: +150 talents in plunder shares — but Jerusalem is sacked (+3 unrest, 24 months) and the new reign opens with −10 legitimacy.',
        effects: guard('ev4_city_stormed:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HYR', { treasury: 150, legitimacy: -10 });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'city_sacked', name: 'The Sack of Jerusalem', months: 24,
            effects: { unrest: 3 },
          });
          if (alive(ctx, 'ARI')) h.adjust(ctx, 'ARI', { legitimacy: -20 });
          h.setFlag(ctx, 'antigonusExecuted', true);
          h.chronicle(ctx, 'war', 'Jerusalem stormed and given to the soldiers; Antigonus is scourged and beheaded at Antioch, the first king Rome ever executed.');
        }),
      },
    ],
  },

  // ── 29 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_cleopatra_balsam',
    title: 'The Queen\'s Appetite',
    desc: 'Cleopatra collects kingdoms the way other queens collect pearls, and Antony, '
      + 'who can refuse her nothing that is not actually Rome\'s, has given her the best '
      + 'of Judaea without moving a single border stone: the balsam groves of Jericho — '
      + 'the most valuable orchard on earth, ounce for ounce — and the coastal tolls. The '
      + 'title stays with the king; the income sails to Alexandria. Her steward arrives '
      + 'with the lease documents already drawn: the king may rent his own Jericho back '
      + 'from Egypt\'s queen, at a rate she has set herself.',
    forTag: 'HYR',
    date: { y: -36, m: 9 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Rent your own garden back',
        tooltip: '"Cleopatra\'s Rent": −8% income until her fall. Egypt\'s opinion of us +30 — she is paid, therefore pleasant.',
        effects: guard('ev4_cleopatra_balsam:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (!alive(ctx, 'HYR')) return;
          h.addTagModifier(ctx, 'HYR', {
            id: 'cleopatras_rent', name: 'Cleopatra\'s Rent', months: -1,
            effects: { incomeMult: 0.92 },
          });
          if (g.tags.PTO && g.tags.PTO.opinion) {
            g.tags.PTO.opinion.HYR = Math.min(200, (g.tags.PTO.opinion.HYR || 0) + 30);
          }
          h.chronicle(ctx, 'diplomacy', 'Antony gives Cleopatra the balsam of Jericho and the coast; Herod rents his own groves back from Egypt\'s queen.');
        }),
      },
      {
        label: 'Refuse the queen her rent',
        tooltip: 'Keep the income — but Egypt\'s opinion of us −60, −5 legitimacy as Antony frowns, and "The Queen\'s Grudge" (−4% income, 48 months) as her agents work the coast.',
        effects: guard('ev4_cleopatra_balsam:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (!alive(ctx, 'HYR')) return;
          h.adjust(ctx, 'HYR', { legitimacy: -5 });
          if (g.tags.PTO && g.tags.PTO.opinion) {
            g.tags.PTO.opinion.HYR = Math.max(-200, (g.tags.PTO.opinion.HYR || 0) - 60);
          }
          h.addTagModifier(ctx, 'HYR', {
            id: 'cleopatras_grudge', name: 'The Queen\'s Grudge', months: 48,
            effects: { incomeMult: 0.96 },
          });
          h.chronicle(ctx, 'diplomacy', 'Herod refuses Cleopatra her rents; her agents begin their patient work along the coast.');
        }),
      },
    ],
  },

  // ── 30 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_fishponds_jericho',
    title: 'A Game in the Water',
    desc: 'Aristobulus, Mariamne\'s brother, is seventeen, beautiful, Hasmonean to the '
      + 'fingertips, and since his investiture as high priest the crowds in the Temple '
      + 'court weep when he raises his hands. The king watches the weeping with great '
      + 'attention. At Jericho, after dinner, the young men swim in the fishponds in the '
      + 'evening cool, and the king\'s Gauls hold the high priest under, in sport, a '
      + 'little too long, laughing, until the sport is over. A drowning at a party. '
      + 'Antony summons Herod to Laodicea to explain; Herod brings money, and explains.',
    forTag: 'HYR',
    date: { y: -35, m: 9 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'A drowning at a party',
        tooltip: 'The last plausible Hasmonean is gone: −10 legitimacy; Jerusalem and Jericho mourn (+2 unrest, 12 months); −100 talents to satisfy Antony at Laodicea. No rival remains.',
        effects: guard('ev4_fishponds_jericho:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HYR')) return;
          h.adjust(ctx, 'HYR', { legitimacy: -10, treasury: -100 });
          for (const pn of ['Jerusalem', 'Jericho']) {
            h.addProvinceModifier(ctx, pn, {
              id: 'drowned_priest', name: 'The Drowned High Priest', months: 12,
              effects: { unrest: 2 },
            });
          }
          h.factionShift(ctx, 'HYR', 'priesthood', -15);
          h.setFlag(ctx, 'aristobulusDrowned', true);
          h.chronicle(ctx, 'war', 'The young high priest Aristobulus III drowns in the fishponds at Jericho — a game in the water. Herod talks his way home from Laodicea.');
        }),
      },
      {
        label: 'Let the boy live and be loved',
        tooltip: 'The crowds keep their high priest: +5 legitimacy, the priesthood approves — but "The Hasmonean Shadow" (−0.2 legitimacy a month, 36 months) as every procession measures the king against the boy.',
        effects: guard('ev4_fishponds_jericho:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HYR')) return;
          h.adjust(ctx, 'HYR', { legitimacy: 5 });
          h.factionShift(ctx, 'HYR', 'priesthood', 15);
          h.addTagModifier(ctx, 'HYR', {
            id: 'hasmonean_shadow', name: 'The Hasmonean Shadow', months: 36,
            effects: { legitimacyAdd: -0.2 },
          });
          h.chronicle(ctx, 'diplomacy', 'The young high priest lives; the crowds weep when he raises his hands, and the king watches the weeping.');
        }),
      },
    ],
  },

  // ── 31 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_earthquake_31',
    title: 'The Year the Ground Moved',
    desc: 'In the seventh year of the reign the earth convulsed — Josephus will write '
      + 'thirty thousand dead, villages swallowed whole, the herds crushed in their '
      + 'folds. And the timing is Cleopatra\'s: she has maneuvered Antony into loosing '
      + 'Judaea against Nabataea over unpaid rents, so that whichever kingdom bleeds, '
      + 'her lease-book grows. The Arab raiders cross the ruined frontier the week the '
      + 'aftershocks stop, reasoning that a flattened country cannot form a line of '
      + 'battle. The army, camped in the open, is untouched.',
    forTag: 'both',
    decider: 'HYR',
    date: { y: -31, m: 4 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The dead cannot hear the living',
        tooltip: 'Earthquake: +2 unrest in every province of the faith (12 months), Hyrcanus\' court −3,000 manpower. Herod\'s oration rallies the army (+10% morale, 12 months; +10 martial points) and the Nabataean war begins.',
        effects: guard('ev4_earthquake_31:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.religion !== 'judaism') continue;
            h.addProvinceModifier(ctx, p.name, {
              id: 'earthquake_31', name: 'The Great Earthquake', months: 12,
              effects: { unrest: 2 },
            });
          }
          if (!alive(ctx, 'HYR')) return;
          h.adjust(ctx, 'HYR', { manpower: -3000, mar: 10 });
          h.addTagModifier(ctx, 'HYR', {
            id: 'herods_oration', name: 'The King\'s Oration', months: 12,
            effects: { moraleMult: 1.1 },
          });
          const atWar = (a, b) => (g.wars || []).some((w) => {
            const all = (w.attackers || []).concat(w.defenders || []);
            return all.indexOf(a) >= 0 && all.indexOf(b) >= 0;
          });
          if (alive(ctx, 'NAB') && !atWar('HYR', 'NAB')) {
            h.declareWar(ctx, 'HYR', 'NAB', 'The Nabataean War');
          }
          h.chronicle(ctx, 'war', 'The great earthquake kills thirty thousand in Judaea; the war with Nabataea that Cleopatra engineered begins over the rubble.');
        }),
      },
      {
        label: 'Bury the dead before the war',
        tooltip: 'Earthquake as above, −3,000 manpower — and −150 talents in relief carts ("The King\'s Relief": net +1 unrest instead of +2). No Nabataean war this year.',
        effects: guard('ev4_earthquake_31:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.religion !== 'judaism') continue;
            h.addProvinceModifier(ctx, p.name, {
              id: 'earthquake_31', name: 'The Great Earthquake', months: 12,
              effects: { unrest: 2 },
            });
            h.addProvinceModifier(ctx, p.name, {
              id: 'kings_relief', name: 'The King\'s Relief', months: 12,
              effects: { unrest: -1 },
            });
          }
          if (!alive(ctx, 'HYR')) return;
          h.adjust(ctx, 'HYR', { manpower: -3000, treasury: -150 });
          h.chronicle(ctx, 'war', 'The great earthquake kills thirty thousand in Judaea; the kingdom buries its dead before it answers the raiders.');
        }),
      },
    ],
  },

  // ── 32 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_actium',
    title: 'Actium',
    worldLabel: 'Octavian breaks Antony and Cleopatra at sea',
    desc: 'Off a promontory in western Greece the world was decided in an afternoon: '
      + 'Cleopatra\'s squadron broke through and ran for Egypt with the war chest, Antony '
      + 'ran after her, and the greatest fleet the East ever manned surrendered at its '
      + 'moorings when it understood it had been abandoned. Octavian — Caesar\'s heir, '
      + 'the cold young man who seconds motions and forgets nothing — is now simply the '
      + 'master of the world. Every eastern king who took Antony\'s coin, made Antony\'s '
      + 'war, or married by Antony\'s leave is composing the same letter tonight, and '
      + 'knows every other king is composing it too.',
    forTag: 'both',
    date: { y: -31, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The world has one master',
        tooltip: 'Rome: +1 stability, +15 legitimacy — the civil wars end. Egypt: −2 stability, −20 legitimacy; the queen\'s kingdom has a year to live.',
        effects: guard('ev4_actium:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { stability: 1, legitimacy: 15 });
          if (alive(ctx, 'PTO')) h.adjust(ctx, 'PTO', { stability: -2, legitimacy: -20 });
          h.setFlag(ctx, 'actiumFought', true);
          h.chronicle(ctx, 'war', 'Actium: Octavian breaks Antony and Cleopatra at sea. The Roman civil wars are ending; the East has backed the loser.');
        }),
      },
      {
        label: 'Corn for the victor\'s fleet',
        tooltip: 'The same verdict — and each surviving Judaean court spends −80 talents provisioning Octavian\'s squadrons before being asked. Rome\'s opinion of each +20.',
        effects: guard('ev4_actium:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { stability: 1, legitimacy: 15 });
          if (alive(ctx, 'PTO')) h.adjust(ctx, 'PTO', { stability: -2, legitimacy: -20 });
          for (const t of ['HYR', 'ARI']) {
            if (!alive(ctx, t)) continue;
            h.adjust(ctx, t, { treasury: -80 });
            if (g.tags.ROM && g.tags.ROM.opinion) {
              g.tags.ROM.opinion[t] = Math.min(200, (g.tags.ROM.opinion[t] || 0) + 20);
            }
          }
          h.setFlag(ctx, 'actiumFought', true);
          h.chronicle(ctx, 'war', 'Actium: Octavian breaks Antony at sea, and the corn ships from the Judaean coast reach his fleet before his quartermasters ask.');
        }),
      },
    ],
  },

  // ── 33 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_rhodes_diadem',
    title: 'The Diadem at Rhodes',
    desc: 'Before sailing, the king closed the last account: old Hyrcanus II, eighty and '
      + 'earless, was shown letters — real or manufactured — proving correspondence with '
      + 'Nabataea, and executed. The last male Hasmonean of his line, who had been high '
      + 'priest, ethnarch, prisoner and pensioner, ended as an exhibit in a treason file. '
      + 'Then Rhodes: Herod came before Octavian without his diadem, set it on the table '
      + 'between them, and offered no excuses — only the accounting of what he had done '
      + 'for Antony: the money, the grain, the soldiers, the loyalty kept to the end. '
      + '"Consider not whose friend I was," he said, "but what kind of friend I am." '
      + 'Octavian, who valued exactly one quality in kings, picked up the diadem and '
      + 'handed it back — with Jericho, and more besides.',
    forTag: 'both',
    decider: 'HYR',
    date: { y: -30, m: 5 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Not whose friend, but what kind',
        tooltip: 'Cleopatra\'s rents are void. Hyrcanus\' court: +15 legitimacy, Rome\'s opinion +40, "Friend of Caesar" (+10% income, permanent, replacing Caesar\'s Charter) — and the priesthood remembers the old man in the treason file.',
        effects: guard('ev4_rhodes_diadem:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (!alive(ctx, 'HYR')) return;
          h.removeModifier(ctx, 'HYR', 'cleopatras_rent');
          h.removeModifier(ctx, 'HYR', 'cleopatras_grudge');
          h.removeModifier(ctx, 'HYR', 'caesars_charter');
          h.addTagModifier(ctx, 'HYR', {
            id: 'friend_of_caesar', name: 'Friend of Caesar', months: -1,
            effects: { incomeMult: 1.1 },
          });
          h.adjust(ctx, 'HYR', { legitimacy: 15 });
          if (g.tags.ROM && g.tags.ROM.opinion) {
            g.tags.ROM.opinion.HYR = Math.min(200, (g.tags.ROM.opinion.HYR || 0) + 40);
          }
          h.factionShift(ctx, 'HYR', 'priesthood', -10);
          h.setFlag(ctx, 'rhodesForgiven', true);
          h.chronicle(ctx, 'diplomacy', 'At Rhodes, Herod lays his diadem before Octavian and offers loyalty instead of excuses; Octavian returns it and enlarges the kingdom. Old Hyrcanus II, the last male Hasmonean of his line, was executed before the king sailed.');
        }),
      },
      {
        label: 'Excuses, gifts, and intermediaries',
        tooltip: 'The safer speech: −200 talents, +5 legitimacy, Rome\'s opinion +20. Cleopatra\'s rents still void — but no "Friend of Caesar," and the old man dies in the file all the same.',
        effects: guard('ev4_rhodes_diadem:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (!alive(ctx, 'HYR')) return;
          h.removeModifier(ctx, 'HYR', 'cleopatras_rent');
          h.removeModifier(ctx, 'HYR', 'cleopatras_grudge');
          h.adjust(ctx, 'HYR', { treasury: -200, legitimacy: 5 });
          if (g.tags.ROM && g.tags.ROM.opinion) {
            g.tags.ROM.opinion.HYR = Math.min(200, (g.tags.ROM.opinion.HYR || 0) + 20);
          }
          h.factionShift(ctx, 'HYR', 'priesthood', -10);
          h.setFlag(ctx, 'rhodesForgiven', true);
          h.chronicle(ctx, 'diplomacy', 'Herod sends gifts and intermediaries ahead of himself to Octavian at Rhodes, and keeps his crown at a price.');
        }),
      },
    ],
  },

  // ── 34 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_mariamne',
    title: 'The King Calls for the Queen',
    desc: 'The whispers did their work by relay: his sister swore Mariamne mocked him, '
      + 'the cupbearer swore she had bought poison, the old chamberlain broke under '
      + 'questioning and confirmed whatever was put to him. Mariamne — Hasmonean on both '
      + 'sides, the marriage that made an Idumean adventurer a dynasty — went to the '
      + 'block without weeping, which the court found insolent, and her mother shrieked '
      + 'accusations at her to save herself, which the court found prudent. Afterward the '
      + 'king was seen walking the palace corridors calling her name, ordering the '
      + 'servants to fetch the queen, raging when they did not; and for the rest of his '
      + 'reign, Josephus says, the dead woman governed him more absolutely than the '
      + 'living one ever had.',
    forTag: 'HYR',
    date: { y: -29, m: 11 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The sentence stands',
        tooltip: 'The queen dies: −10 legitimacy; "The King\'s Grief" (+0.5 unrest everywhere, −0.2 legitimacy a month, 24 months). The Hasmonean line now survives only in her children.',
        effects: guard('ev4_mariamne:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HYR')) return;
          h.adjust(ctx, 'HYR', { legitimacy: -10 });
          h.addTagModifier(ctx, 'HYR', {
            id: 'herods_grief', name: 'The King\'s Grief', months: 24,
            effects: { unrestAll: 0.5, legitimacyAdd: -0.2 },
          });
          h.setHeir(ctx, 'HYR', { name: 'Alexander son of Mariamne', gov: 2, infl: 2, mar: 2, age: 6 });
          h.setFlag(ctx, 'mariamneExecuted', true);
          h.chronicle(ctx, 'war', 'Mariamne the Hasmonean is executed on sworn whispers; afterward the king walks the palace calling for the queen as though she lived.');
        }),
      },
      {
        label: 'Stay the sentence',
        tooltip: 'The queen lives, watched: +5 legitimacy — but the court of whispers keeps its knives (−20 influence points, and "The Court of Whispers": −0.1 legitimacy a month, 36 months).',
        effects: guard('ev4_mariamne:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HYR')) return;
          h.adjust(ctx, 'HYR', { legitimacy: 5, infl: -20 });
          h.addTagModifier(ctx, 'HYR', {
            id: 'court_of_whispers', name: 'The Court of Whispers', months: 36,
            effects: { legitimacyAdd: -0.1 },
          });
          h.setHeir(ctx, 'HYR', { name: 'Alexander son of Mariamne', gov: 2, infl: 2, mar: 2, age: 6 });
          h.chronicle(ctx, 'diplomacy', 'The sentence against Queen Mariamne is stayed; the whispers that swore it continue their work.');
        }),
      },
    ],
  },

  // ══ THE ROAD NOT TAKEN — the victory strand ═══════════════════════════════
  // Alternate history for the worlds that beat the parchment: a Hasmonean line
  // that repels Pompey, heals the brothers' schism, and rides out Rome's civil
  // wars as a sovereign. Every trigger is gated on world-state (independence,
  // unification, Rome holding no Judaean soil) so none of these can fire in a
  // world that followed Josephus.

  // ── V1 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_v_eagle_refused',
    title: 'The Eagle Refused',
    desc: 'It has never happened before, and every chancery from Alexandria to '
      + 'Ecbatana is checking its archives to be sure: Pompey came to organize the '
      + 'East, and one small kingdom shut its gates, kept its hills, and is still '
      + 'standing. The settlement of the East has a hole in it shaped like Judaea. In '
      + 'Rome the proconsul\'s friends explain, at length, why the hills were not worth '
      + 'the cohorts; in Ctesiphon the King of Kings has the dispatch read to him '
      + 'twice, and smiles at the second reading.',
    forTag: 'player',
    major: true,
    trigger: safeTrigger('ev4_v_eagle_refused', (ctx) => {
      const me = playerHasmonean(ctx);
      return !!me && !!ctx.helpers.getFlag(ctx, 'pompeyCame')
        && dateGE(ctx, -62, 6) && alive(ctx, 'ROM')
        && freeOfRome(ctx, me) && !romHoldsJudaea(ctx);
    }),
    aiOption: 0,
    options: [
      {
        label: 'Let every harbor tell it',
        tooltip: 'The kingdom that shut its gates: +10 legitimacy; "The Gates That Held" (+0.1 legitimacy a month, permanent). Rome\'s opinion of us −60; Parthia\'s +40.',
        effects: guard('ev4_v_eagle_refused:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const me = playerHasmonean(ctx);
          if (!me) return;
          h.adjust(ctx, me, { legitimacy: 10 });
          h.addTagModifier(ctx, me, {
            id: 'gates_that_held', name: 'The Gates That Held', months: -1,
            effects: { legitimacyAdd: 0.1 },
          });
          bumpOpinion(g, 'ROM', me, -60);
          bumpOpinion(g, 'PAR', me, 40);
          h.setFlag(ctx, 'eagleRefused', true);
          h.chronicle(ctx, 'war', 'Pompey turns away from Judaea: the one gate in the East that shut and held. The settlement of the East has a hole in it.');
        }),
      },
      {
        label: 'Courtesies for the disappointed proconsul',
        tooltip: 'Gild the refusal: −100 talents in gifts; Rome\'s opinion −20 only, Parthia\'s +20, +15 governance points. The gates still held — quietly.',
        effects: guard('ev4_v_eagle_refused:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const me = playerHasmonean(ctx);
          if (!me) return;
          h.adjust(ctx, me, { treasury: -100, gov: 15 });
          bumpOpinion(g, 'ROM', me, -20);
          bumpOpinion(g, 'PAR', me, 20);
          h.setFlag(ctx, 'eagleRefused', true);
          h.chronicle(ctx, 'diplomacy', 'Pompey turns away from Judaea; the refusal travels wrapped in gifts, and both parties pretend it was a treaty.');
        }),
      },
    ],
  },

  // ── V2 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_v_parthian_embassy',
    title: 'An Embassy from the King of Kings',
    desc: 'They arrive without hurry, because Parthians are never seen to hurry: forty '
      + 'riders, a chamberlain with a written speech, and gifts chosen by someone who '
      + 'did research — a Torah scroll cased in ivory, taken west by some forgotten '
      + 'exile and now formally returned. The speech is short. The King of Kings has '
      + 'observed that there is exactly one power between the Euphrates and the sea '
      + 'that has refused Rome and lived. He proposes that it remain living, and that '
      + 'between great Parthia and small Judaea there should stand — nothing at all, '
      + 'except friendship.',
    forTag: 'player',
    major: true,
    trigger: safeTrigger('ev4_v_parthian_embassy', (ctx) => {
      const me = playerHasmonean(ctx);
      return !!me && !!ctx.helpers.getFlag(ctx, 'eagleRefused')
        && dateGE(ctx, -61, 1) && alive(ctx, 'PAR') && freeOfRome(ctx, me);
    }),
    aiOption: 1,
    options: [
      {
        label: 'The buffer kingdom takes the hand',
        tooltip: 'Alliance with Parthia; Parthia\'s opinion of us +60, ours of Parthia +60 — and Rome\'s opinion of us −30. The Euphrates now has a western friend.',
        effects: guard('ev4_v_parthian_embassy:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const me = playerHasmonean(ctx);
          if (!me || !alive(ctx, 'PAR')) return;
          const mine = g.tags[me], par = g.tags.PAR;
          if (mine && par && Array.isArray(mine.allies) && Array.isArray(par.allies)) {
            if (mine.allies.indexOf('PAR') === -1) mine.allies.push('PAR');
            if (par.allies.indexOf(me) === -1) par.allies.push(me);
          }
          bumpOpinion(g, 'PAR', me, 60);
          bumpOpinion(g, me, 'PAR', 60);
          bumpOpinion(g, 'ROM', me, -30);
          h.setFlag(ctx, 'parthianAccord', true);
          h.chronicle(ctx, 'diplomacy', 'Judaea and Parthia swear friendship: the buffer-kingdom gambit, with the buffer holding the pen.');
        }),
      },
      {
        label: 'Polite gifts, no oaths',
        tooltip: 'Keep the scroll, return the riders: Parthia\'s opinion +20, Rome\'s +10 (restraint is noticed), +10 governance points. No alliance, no entanglement.',
        effects: guard('ev4_v_parthian_embassy:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const me = playerHasmonean(ctx);
          if (!me) return;
          h.adjust(ctx, me, { gov: 10 });
          bumpOpinion(g, 'PAR', me, 20);
          bumpOpinion(g, 'ROM', me, 10);
          h.chronicle(ctx, 'diplomacy', 'The Parthian embassy departs with courtesies and without oaths; the scroll in the ivory case stays.');
        }),
      },
    ],
  },

  // ── V3 ────────────────────────────────────────────────────────────────────
  // The war of the brothers WON outright by the younger: the soldier-king must
  // now heal the split his father's party made (the bookmark's ARI is the
  // Sadducee strand — the great houses, the fortress captains, the diadem
  // worn over the ephod).
  {
    id: 'ev4_v_one_crown_ari',
    title: 'The Soldier-King\'s Peace',
    desc: 'The war is won the way your father would have won it: outright. Now the '
      + 'harder arithmetic. Half the kingdom prayed against you from behind your '
      + 'brother\'s walls, and their sages — the Pharisees your mother raised up and '
      + 'your Sadducees pulled down — wait to learn whether the soldier-king intends '
      + 'to be king of them too. The great houses say hang the ringleaders and seal '
      + 'the estates. The old men of the Sanhedrin say a kingdom of half its people '
      + 'is a garrison. Both are watching your hands.',
    forTag: 'ARI',
    major: true,
    trigger: safeTrigger('ev4_v_one_crown_ari', (ctx) =>
      alive(ctx, 'ARI') && unifiedUnder(ctx, 'ARI') && freeOfRome(ctx, 'ARI')
      && ctx.helpers.controls(ctx, 'ARI', 'Jerusalem')),
    aiOption: 0,
    options: [
      {
        label: 'Recall the Pharisees from exile',
        tooltip: 'The schools reconciled: +1 stability, +10 legitimacy; "One Law, One Crown" (−0.5 unrest everywhere, permanent). The Sadducees mutter (faction approval −10).',
        effects: guard('ev4_v_one_crown_ari:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ARI', { stability: 1, legitimacy: 10 });
          h.addTagModifier(ctx, 'ARI', {
            id: 'schools_reconciled', name: 'One Law, One Crown', months: -1,
            effects: { unrestAll: -0.5 },
          });
          h.factionShift(ctx, 'ARI', 'sadducees', -10);
          h.setFlag(ctx, 'crownHealed', true);
          h.chronicle(ctx, 'diplomacy', 'The soldier-king recalls the Pharisees and seats both schools; the priesthood and the crown stop being two prizes.');
        }),
      },
      {
        label: 'The great houses have won; let them govern',
        tooltip: 'The Sadducee settlement: faction approval +15; "The Great Houses Triumphant" (+6% income, permanent) — but Jerusalem\'s synagogues seethe (+1 unrest, 24 months).',
        effects: guard('ev4_v_one_crown_ari:1', (ctx) => {
          const h = ctx.helpers;
          h.factionShift(ctx, 'ARI', 'sadducees', 15);
          h.addTagModifier(ctx, 'ARI', {
            id: 'great_houses', name: 'The Great Houses Triumphant', months: -1,
            effects: { incomeMult: 1.06 },
          });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'synagogues_seethe', name: 'The Synagogues Seethe', months: 24,
            effects: { unrest: 1 },
          });
          h.setFlag(ctx, 'crownHealed', true);
          h.chronicle(ctx, 'diplomacy', 'The Sadducee settlement: estates sealed, offices filled, and the sages sent home to wait for another queen.');
        }),
      },
    ],
  },

  // ── V4 ────────────────────────────────────────────────────────────────────
  // The mirror: the elder wins outright. The bookmark's HYR is the
  // Pharisee-backed priest strand — the high priesthood, the law of
  // succession, the sages preaching the elder line.
  {
    id: 'ev4_v_one_crown_hyr',
    title: 'The Priest-King\'s Peace',
    desc: 'Nobody expected the weak brother to win, which is one reason he did. Now the '
      + 'high priest holds crown and altar both, the Pharisees who preached his right '
      + 'expect the kingdom their sermons bought, and the Sadducee houses that armed '
      + 'your brother wait behind shut doors to learn the price of losing. Your '
      + 'grandmother faced this exact morning and gave the sages everything; the '
      + 'kingdom got nine quiet years and this war. The scrolls do not say what the '
      + 'other choice would have bought.',
    forTag: 'HYR',
    major: true,
    trigger: safeTrigger('ev4_v_one_crown_hyr', (ctx) =>
      alive(ctx, 'HYR') && unifiedUnder(ctx, 'HYR') && freeOfRome(ctx, 'HYR')
      && ctx.helpers.controls(ctx, 'HYR', 'Jerusalem')),
    aiOption: 0,
    options: [
      {
        label: 'Seat both schools in the Sanhedrin',
        tooltip: 'The schools reconciled: +1 stability, +10 legitimacy; "One Law, One Crown" (−0.5 unrest everywhere, permanent). The Pharisees mutter at sharing (faction approval −10).',
        effects: guard('ev4_v_one_crown_hyr:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HYR', { stability: 1, legitimacy: 10 });
          h.addTagModifier(ctx, 'HYR', {
            id: 'schools_reconciled', name: 'One Law, One Crown', months: -1,
            effects: { unrestAll: -0.5 },
          });
          h.factionShift(ctx, 'HYR', 'pharisees', -10);
          h.setFlag(ctx, 'crownHealed', true);
          h.chronicle(ctx, 'diplomacy', 'The priest-king seats both schools in the council; the crown and the ephod stop quarreling through proxies.');
        }),
      },
      {
        label: 'The sages write the settlement',
        tooltip: 'The Pharisee kingdom: faction approval +15; "The Sages Preach One Crown" (+0.15 legitimacy a month, permanent) — but the great houses\' city seethes (Jerusalem +1 unrest, 24 months).',
        effects: guard('ev4_v_one_crown_hyr:1', (ctx) => {
          const h = ctx.helpers;
          h.factionShift(ctx, 'HYR', 'pharisees', 15);
          h.addTagModifier(ctx, 'HYR', {
            id: 'sages_settlement', name: 'The Sages Preach One Crown', months: -1,
            effects: { legitimacyAdd: 0.15 },
          });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'great_houses_shut', name: 'The Great Houses Shut Their Doors', months: 24,
            effects: { unrest: 1 },
          });
          h.setFlag(ctx, 'crownHealed', true);
          h.chronicle(ctx, 'diplomacy', 'The sages write the settlement of the kingdom; the Sadducee houses shut their doors and keep their ledgers.');
        }),
      },
    ],
  },

  // ── V5 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_v_caesar_or_pompey',
    title: 'The Sovereign\'s Choice',
    desc: 'Rome has split down the middle, and for once nobody is asking Judaea to '
      + 'kneel — both halves are too busy asking it to help. Caesar\'s agent wants '
      + 'grain shipped to Greece and a loan at interest; Pompey\'s wants the old '
      + 'settlement honored and the ports closed to his enemy. A generation ago this '
      + 'letter would have been an ultimatum with a legion behind it. It is pleasant, '
      + 'the old councilors agree, to be courted instead of collected — and everyone '
      + 'in the room knows the courtship lasts exactly until one Roman is left.',
    forTag: 'player',
    major: true,
    trigger: safeTrigger('ev4_v_caesar_or_pompey', (ctx) => {
      const me = playerHasmonean(ctx);
      return !!me && dateGE(ctx, -49, 2) && alive(ctx, 'ROM')
        && freeOfRome(ctx, me) && unifiedUnder(ctx, me);
    }),
    aiOption: 0,
    options: [
      {
        label: 'Grain and gold for Caesar',
        tooltip: 'Back the new man: −100 talents; Rome\'s opinion of us +10. A sovereign\'s wager, not a vassal\'s tribute — the settlement waits on Pharsalus.',
        effects: guard('ev4_v_caesar_or_pompey:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const me = playerHasmonean(ctx);
          if (!me) return;
          h.adjust(ctx, me, { treasury: -100 });
          bumpOpinion(g, 'ROM', me, 10);
          h.setFlag(ctx, 'jvBackedCaesar', true);
          h.chronicle(ctx, 'diplomacy', 'Sovereign Judaea wagers on Caesar: grain and gold sail west, by treaty and not by tribute.');
        }),
      },
      {
        label: 'Honor Pompey\'s settlement — such as it was',
        tooltip: 'Back the old order: +5 legitimacy (treaties kept are legitimacy banked); Rome\'s opinion of us +10. The settlement waits on Pharsalus.',
        effects: guard('ev4_v_caesar_or_pompey:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const me = playerHasmonean(ctx);
          if (!me) return;
          h.adjust(ctx, me, { legitimacy: 5 });
          bumpOpinion(g, 'ROM', me, 10);
          h.setFlag(ctx, 'jvBackedPompey', true);
          h.chronicle(ctx, 'diplomacy', 'Sovereign Judaea holds to the old settlement and closes its ports to Caesar — a kingdom keeping a treaty with a ghost.');
        }),
      },
    ],
  },

  // ── V6 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_v_pharsalus_wager',
    title: 'The Wager Comes Due',
    desc: 'Pharsalus has sorted the Romans, and the couriers fan out across the East '
      + 'with the accounting. In Jerusalem the council convenes to learn what its '
      + 'wager bought: a kingdom that backed the victor may name its price while the '
      + 'gratitude is warm; a kingdom that backed the corpse must decide how much a '
      + 'pardon costs when purchased from a man who forgets nothing and forgives at '
      + 'interest. Either way — and this is the novelty the chroniclers will note — '
      + 'the letter goes out from a free city, under the kingdom\'s own seal.',
    forTag: 'player',
    major: true,
    trigger: safeTrigger('ev4_v_pharsalus_wager', (ctx) => {
      const me = playerHasmonean(ctx);
      const h = ctx.helpers;
      return !!me && dateGE(ctx, -47, 3) && alive(ctx, 'ROM') && freeOfRome(ctx, me)
        && (!!h.getFlag(ctx, 'jvBackedCaesar') || !!h.getFlag(ctx, 'jvBackedPompey'));
    }),
    aiOption: 0,
    options: [
      {
        label: 'Send envoys to the victor',
        tooltip: 'Backed Caesar: "Amicitia" treaty (+5% income, permanent), Rome\'s opinion +40, +10 legitimacy. Backed Pompey: −150 talents buys the pardon, Rome\'s opinion +15.',
        effects: guard('ev4_v_pharsalus_wager:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const me = playerHasmonean(ctx);
          if (!me) return;
          if (h.getFlag(ctx, 'jvBackedCaesar')) {
            h.adjust(ctx, me, { legitimacy: 10 });
            h.addTagModifier(ctx, me, {
              id: 'amicitia', name: 'Amicitia — Treaty with Rome', months: -1,
              effects: { incomeMult: 1.05 },
            });
            bumpOpinion(g, 'ROM', me, 40);
            h.chronicle(ctx, 'diplomacy', 'Caesar receives the envoys of a kingdom that backed him freely, and signs a treaty between sovereigns: amicitia, not clientela.');
          } else {
            h.adjust(ctx, me, { treasury: -150 });
            bumpOpinion(g, 'ROM', me, 15);
            h.chronicle(ctx, 'diplomacy', 'The pardon is purchased at the victor\'s rate; expensive, but invoiced to a kingdom, not a province.');
          }
        }),
      },
      {
        label: 'A sovereign owes no accounting',
        tooltip: 'Send nothing: +15 governance points, +5 legitimacy at home — but Rome\'s opinion of us −15. The ledgers stay open in Roman memory.',
        effects: guard('ev4_v_pharsalus_wager:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const me = playerHasmonean(ctx);
          if (!me) return;
          h.adjust(ctx, me, { gov: 15, legitimacy: 5 });
          bumpOpinion(g, 'ROM', me, -15);
          h.chronicle(ctx, 'diplomacy', 'No envoys go west; the kingdom lets the Roman civil war settle its own accounts.');
        }),
      },
    ],
  },

  // ── V7 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_v_caravan_tribute',
    title: 'The Tribute of the Caravans',
    desc: 'The maps in the counting house have been redrawn, and the clerks keep '
      + 'reaching the same delightful total: the incense road now runs mile after '
      + 'mile through the king\'s territory. Frankincense out of Arabia, silk off the '
      + 'Euphrates ferries, balsam from the king\'s own Jericho — and at the end of '
      + 'every route, a customs house flying the kingdom\'s colors where the caravan '
      + 'masters queue with the particular patience of men calculating what they will '
      + 'add to their prices. Petra\'s old monopoly is broken. The question is what to '
      + 'do with the pieces.',
    forTag: 'player',
    major: true,
    trigger: safeTrigger('ev4_v_caravan_tribute', (ctx) => {
      const me = playerHasmonean(ctx);
      const h = ctx.helpers;
      return !!me && alive(ctx, me) && !ctx.game.tags[me].overlord
        && (h.controls(ctx, me, 'Damascus') || h.controls(ctx, me, 'Petra'))
        && h.controls(ctx, me, 'Gaza');
    }),
    aiOption: 0,
    options: [
      {
        label: 'Tax the incense road',
        tooltip: '"The Tribute of the Caravans": +10% income, permanently — but Nabataea\'s opinion of us −30. Monopolies make money and enemies at the same counter.',
        effects: guard('ev4_v_caravan_tribute:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const me = playerHasmonean(ctx);
          if (!me) return;
          h.addTagModifier(ctx, me, {
            id: 'caravan_tribute', name: 'The Tribute of the Caravans', months: -1,
            effects: { incomeMult: 1.1 },
          });
          bumpOpinion(g, 'NAB', me, -30);
          h.setFlag(ctx, 'caravanTribute', true);
          h.chronicle(ctx, 'diplomacy', 'The incense road pays its tribute to Jerusalem: the customs of Damascus, the desert road, and the sea at Gaza under one seal.');
        }),
      },
      {
        label: 'Low tolls, long friendship',
        tooltip: 'The open road: +5% income permanently, Nabataea\'s opinion +20, Parthia\'s +10 — half the tribute, twice the traffic, and no one sharpening knives.',
        effects: guard('ev4_v_caravan_tribute:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const me = playerHasmonean(ctx);
          if (!me) return;
          h.addTagModifier(ctx, me, {
            id: 'caravan_tribute', name: 'The Open Road', months: -1,
            effects: { incomeMult: 1.05 },
          });
          bumpOpinion(g, 'NAB', me, 20);
          bumpOpinion(g, 'PAR', me, 10);
          h.setFlag(ctx, 'caravanTribute', true);
          h.chronicle(ctx, 'diplomacy', 'The kingdom sets its tolls low and its scales honest; the caravan masters spread the word from Charax to Alexandria.');
        }),
      },
    ],
  },

  // ── V8 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_v_antony_or_octavian',
    title: 'Two Romans, One World',
    desc: 'The Republic has run out of republic: Antony holds the East with Egypt\'s '
      + 'queen and Egypt\'s treasury, Octavian holds Italy with Caesar\'s name and '
      + 'Caesar\'s veterans, and between them the last neutral harbors are being asked, '
      + 'politely, to stop being neutral. Both send ambassadors to Jerusalem in the '
      + 'same season — a compliment the councilors savor for exactly one meeting, '
      + 'because a kingdom courted by two Romans is a kingdom one Roman will '
      + 'eventually invoice. The grandfathers chose between Caesar and Pompey. Now the '
      + 'same dice, thrown by the same free hand.',
    forTag: 'player',
    major: true,
    trigger: safeTrigger('ev4_v_antony_or_octavian', (ctx) => {
      const me = playerHasmonean(ctx);
      const h = ctx.helpers;
      return !!me && dateGE(ctx, -33, 6) && alive(ctx, 'ROM')
        && freeOfRome(ctx, me) && unifiedUnder(ctx, me)
        && !h.getFlag(ctx, 'actiumFought');
    }),
    aiOption: 0,
    options: [
      {
        label: 'The grain fleets sail west, to Octavian',
        tooltip: 'Back the cold young man: −80 talents in grain and pilots. The wager settles at Actium.',
        effects: guard('ev4_v_antony_or_octavian:0', (ctx) => {
          const h = ctx.helpers;
          const me = playerHasmonean(ctx);
          if (!me) return;
          h.adjust(ctx, me, { treasury: -80 });
          h.setFlag(ctx, 'jvBackedOctavian', true);
          h.chronicle(ctx, 'diplomacy', 'Sovereign Judaea provisions Octavian\'s squadrons: a wager on the cold young man who forgets nothing.');
        }),
      },
      {
        label: 'The East holds with Antony',
        tooltip: 'Back the near Roman: −80 talents; Egypt\'s opinion of us +20 — the queen approves of neighbors who choose her side. The wager settles at Actium.',
        effects: guard('ev4_v_antony_or_octavian:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const me = playerHasmonean(ctx);
          if (!me) return;
          h.adjust(ctx, me, { treasury: -80 });
          bumpOpinion(g, 'PTO', me, 20);
          h.setFlag(ctx, 'jvBackedAntony', true);
          h.chronicle(ctx, 'diplomacy', 'Sovereign Judaea holds with Antony and the East; the queen of Egypt approves, which is worth something, for now.');
        }),
      },
    ],
  },

  // ── V9 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev4_v_actium_sovereign',
    title: 'The Kingdom That Kept Its Gates',
    desc: 'Actium is decided, the world has one master, and every client king in the '
      + 'East is sailing to Rhodes to grovel with the diadem in his luggage. One '
      + 'kingdom is not sailing anywhere. Judaea backed its Roman as a sovereign backs '
      + 'an ally — by treaty, for value received — and whatever Octavian thinks of the '
      + 'choice, his clerks confirm the legal novelty: there is no submission on file '
      + 'to revoke, no crown of his giving to take back. The master of the world must '
      + 'now do the one thing masters of the world find hardest: negotiate.',
    forTag: 'player',
    major: true,
    trigger: safeTrigger('ev4_v_actium_sovereign', (ctx) => {
      const me = playerHasmonean(ctx);
      const h = ctx.helpers;
      return !!me && !!h.getFlag(ctx, 'actiumFought') && alive(ctx, 'ROM')
        && freeOfRome(ctx, me)
        && (!!h.getFlag(ctx, 'jvBackedOctavian') || !!h.getFlag(ctx, 'jvBackedAntony'));
    }),
    aiOption: 0,
    options: [
      {
        label: 'A treaty between sovereigns',
        tooltip: 'Backed Octavian: "Friend, Not Subject" (+8% income, permanent), Rome\'s opinion +50, +15 legitimacy. Backed Antony: −200 talents indemnity, Rome\'s opinion −30, −5 legitimacy — but the kingdom stays free.',
        effects: guard('ev4_v_actium_sovereign:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const me = playerHasmonean(ctx);
          if (!me) return;
          if (h.getFlag(ctx, 'jvBackedOctavian')) {
            h.adjust(ctx, me, { legitimacy: 15 });
            h.addTagModifier(ctx, me, {
              id: 'friend_not_subject', name: 'Friend, Not Subject', months: -1,
              effects: { incomeMult: 1.08 },
            });
            bumpOpinion(g, 'ROM', me, 50);
            h.chronicle(ctx, 'diplomacy', 'Octavian signs with the one eastern crown he never gave: a treaty between sovereigns, filed under amicitia and read, in Jerusalem, as vindication.');
          } else {
            h.adjust(ctx, me, { treasury: -200, legitimacy: -5 });
            bumpOpinion(g, 'ROM', me, -30);
            h.chronicle(ctx, 'diplomacy', 'The indemnity for backing Antony is paid in full and on time — by a kingdom, to a treasury, with no diadem changing hands.');
          }
        }),
      },
      {
        label: 'Neither tribute nor treaty',
        tooltip: 'The gates stay shut: +10 legitimacy; "The Watchful Frontier" (+5% morale, 36 months) — but Rome\'s opinion of us −40. Let the master of the world blink first.',
        effects: guard('ev4_v_actium_sovereign:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const me = playerHasmonean(ctx);
          if (!me) return;
          h.adjust(ctx, me, { legitimacy: 10 });
          h.addTagModifier(ctx, me, {
            id: 'watchful_frontier', name: 'The Watchful Frontier', months: 36,
            effects: { moraleMult: 1.05 },
          });
          bumpOpinion(g, 'ROM', me, -40);
          h.chronicle(ctx, 'war', 'No envoys to the master of the world: the kingdom that kept its gates keeps them still, and drills its levies in sight of the coast road.');
        }),
      },
    ],
  },

  // ── V10 ───────────────────────────────────────────────────────────────────
  // The closing chronicle of the road not taken: survive united, free, and
  // unconquered into the mid-thirties, and the scribes get to write the
  // sentence no scribe of the other world ever wrote.
  {
    id: 'ev4_v_never_renamed',
    title: 'The Kingdom They Never Renamed',
    desc: 'In the other history — the one the court astrologers deal in after wine — '
      + 'there is a Roman province here by now. Its ports have Latin charters, its '
      + 'high priest holds office by a prefect\'s letter, and in time even the land\'s '
      + 'name is taken away and a conqueror\'s word written over it. In this history '
      + 'the scribes take the census in Hebrew, the Temple treasury audits itself, and '
      + 'the road tolls from Damascus to Gaza are payable to the house of the '
      + 'Maccabees. Two generations of Romans came east to organize the world, and the '
      + 'world is organized — around one kingdom-shaped exception that no one in Rome '
      + 'can quite explain, and no one in Jerusalem will ever stop explaining.',
    forTag: 'player',
    major: true,
    trigger: safeTrigger('ev4_v_never_renamed', (ctx) => {
      const me = playerHasmonean(ctx);
      return !!me && dateGE(ctx, -35, 1) && freeOfRome(ctx, me)
        && unifiedUnder(ctx, me) && ctx.helpers.controls(ctx, me, 'Jerusalem')
        && !romHoldsJudaea(ctx);
    }),
    aiOption: 0,
    options: [
      {
        label: 'Write it in the chronicle',
        tooltip: 'The line unbroken: +1 stability; "No Roman Name" (+0.1 legitimacy a month, permanent). The verdict of the scribes, entered in ink.',
        effects: guard('ev4_v_never_renamed:0', (ctx) => {
          const h = ctx.helpers;
          const me = playerHasmonean(ctx);
          if (!me) return;
          h.adjust(ctx, me, { stability: 1 });
          h.addTagModifier(ctx, me, {
            id: 'no_roman_name', name: 'No Roman Name', months: -1,
            effects: { legitimacyAdd: 0.1 },
          });
          h.setFlag(ctx, 'neverRenamed', true);
          h.chronicle(ctx, 'diplomacy', 'The chronicle enters its proudest sentence: two generations of Romans organized the East, and the kingdom kept its name, its Law, and its gates.');
        }),
      },
      {
        label: 'Strike the jubilee shekels',
        tooltip: 'Silver for every hand: −100 talents; +5 legitimacy; every province of the faith −1 unrest for 24 months ("The Jubilee Shekels").',
        effects: guard('ev4_v_never_renamed:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const me = playerHasmonean(ctx);
          if (!me) return;
          h.adjust(ctx, me, { treasury: -100, legitimacy: 5 });
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.religion !== 'judaism') continue;
            h.addProvinceModifier(ctx, p.name, {
              id: 'jubilee_shekels', name: 'The Jubilee Shekels', months: 24,
              effects: { unrest: -1 },
            });
          }
          h.setFlag(ctx, 'neverRenamed', true);
          h.chronicle(ctx, 'diplomacy', 'Jubilee shekels — freedom of Zion, year of the unbroken line — ring on every counter from Akko to Petra.');
        }),
      },
    ],
  },
];
