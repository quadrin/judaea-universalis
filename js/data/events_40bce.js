// Judaea Universalis — event chain: Herod's Rise, 40–37 BCE.
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
// Source spine: Josephus, Antiquitates XIV.13–16, Bellum I.13–18; Cassius Dio
// XLVIII–XLIX; Plutarch, Antonius. BCE years are negative.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_40bce] ' + key, e || '');
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

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false);
}

function crownWar(game) {
  for (const w of (game && game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf('ATG') !== -1 && all.indexOf('HER') !== -1) return w;
  }
  return null;
}

function warBetween(game, a, b) {
  for (const w of (game && game.wars) || []) {
    const all = w ? (w.attackers || []).concat(w.defenders || []) : [];
    if (all.indexOf(a) >= 0 && all.indexOf(b) >= 0) return w;
  }
  return null;
}

function countOwned(ctx, tag) {
  let n = 0;
  for (const p of ctx.game.provinces || []) if (p && !p.impassable && p.owner === tag) n++;
  return n;
}

// Rome enters the crown war at Herod's side and wakes from passivity.
function romeJoins(ctx) {
  const g = ctx.game;
  const w = crownWar(g);
  if (!w || w.defenders.indexOf('ROM') >= 0) return;
  w.defenders.push('ROM');
  for (const [a, b] of [['ROM', 'ATG'], ['ATG', 'ROM'], ['ROM', 'PAR'], ['PAR', 'ROM']]) {
    const t = g.tags[a];
    if (t && t.atWarWith.indexOf(b) < 0) t.atWarWith.push(b);
  }
  ctx.helpers.removeModifier(ctx, 'ROM', 'wars_elsewhere');
  const her = g.tags.HER, rom = g.tags.ROM;
  if (her && rom) {
    if (her.allies.indexOf('ROM') === -1) her.allies.push('ROM');
    if (rom.allies.indexOf('HER') === -1) rom.allies.push('HER');
  }
}

export const EVENTS_40 = [
  // ── 1: scene-setter ───────────────────────────────────────────────────────
  {
    id: 'ev5_parthians',
    title: 'The Parthians in Jerusalem',
    desc: 'Five hundred horsemen ride through the Fish Gate with Antigonus among them, '
      + 'and the city that hated the Romans discovers it can cheer for anyone. Hyrcanus '
      + 'the old high priest is carried east in chains — his ears cropped so he may never '
      + 'serve at the altar again. On the walls of Masada, a small garrison watches the '
      + 'dust of the king\'s riders and waits for Herod\'s signal fires.',
    forTag: 'both',
    date: { y: -40, m: 7 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'A crown from the King of Kings',
        tooltip: 'Antigonus +10 legitimacy; Herod +10 martial points (nothing concentrates the mind like exile).',
        effects: guard('ev5_parthians:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ATG', { legitimacy: 10 });
          ctx.helpers.adjust(ctx, 'HER', { mar: 10 });
        }),
      },
    ],
  },

  // ── 2: the flight to Rome (Herod's choice) ────────────────────────────────
  {
    id: 'ev5_flight',
    title: 'The Voyage to Rome',
    desc: 'Petra was polite and useless; Alexandria offered a command in Cleopatra\'s '
      + 'service, which is a gilded way of disappearing. There remains the sea in winter, '
      + 'and at the end of it Rome — where Antony remembers Antipater\'s son, and where a '
      + 'Senate that cannot spare a legion can spare a title. It is a gamble of months, '
      + 'with the family besieged on Masada the whole while.',
    forTag: 'HER',
    date: { y: -40, m: 10 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Sail — winter be damned',
        tooltip: 'Set the course for Rome: the Senate will crown you (January). +25 influence points now; Rome joins the war when the decree is read.',
        effects: guard('ev5_flight:0', (ctx) => {
          ctx.helpers.setFlag(ctx, 'herodSailed', true);
          ctx.helpers.adjust(ctx, 'HER', { infl: 25 });
        }),
      },
      {
        label: 'A king needs no patron',
        tooltip: 'Fight it out with Idumea\'s own strength: +25 martial points, +1 stability — but no Roman decree, and Rome stays home.',
        effects: guard('ev5_flight:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'HER', { mar: 25, stability: 1 });
        }),
      },
    ],
  },

  // ── 3: Rex Iudaeorum ──────────────────────────────────────────────────────
  {
    id: 'ev5_senate',
    title: 'Rex Iudaeorum',
    desc: 'Antony walks Herod into the Senate house between himself and Octavian — the '
      + 'two men dividing the world agreeing, for one afternoon, on this. The fathers '
      + 'vote him King of Judaea; the party climbs the Capitol to sacrifice, a pagan rite '
      + 'for a Jewish crown, and nobody present finds it strange. The decree is paper. '
      + 'Ventidius\' legions will make it iron.',
    forTag: 'both',
    trigger: safeTrigger('ev5_senate', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'herodSailed')
      && (ctx.game.date.y > -39 || (ctx.game.date.y === -39 && ctx.game.date.m >= 1))
      && alive(ctx, 'HER')),
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The Senate has spoken',
        tooltip: 'Herod is King by decree: +25 legitimacy, the herodKing flag; Rome enters the War for the Crown at his side.',
        effects: guard('ev5_senate:0', (ctx) => {
          ctx.helpers.setFlag(ctx, 'herodKing', true);
          ctx.helpers.adjust(ctx, 'HER', { legitimacy: 25 });
          romeJoins(ctx);
          ctx.helpers.notify(ctx, {
            title: 'Rome takes the field',
            text: 'The legions of Syria now fight for Herod\'s crown.',
            type: 'war',
          });
        }),
      },
    ],
  },

  // ── 4: Gindarus — Parthia broken ──────────────────────────────────────────
  {
    id: 'ev5_gindarus',
    title: 'The Day at Gindarus',
    desc: 'Ventidius, who was once paraded as a captive in a Roman triumph, now gives '
      + 'Rome the neatest victory of the age: he lets the Parthian horse charge uphill '
      + 'into slingers and legionaries, and Pacorus — the best of Orodes\' sons, the '
      + 'prince Syria half-loved — dies in the press. It is the anniversary of Carrhae, '
      + 'to the day. The Parthians ride home over the Euphrates and do not come back.',
    forTag: 'both',
    date: { y: -38, m: 6 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Carrhae is repaid',
        tooltip: 'Parthian Syria falls to Rome; Parthia quits the War for the Crown; Antigonus loses his shield (−10 legitimacy, morale modifier expires).',
        effects: guard('ev5_gindarus:0', (ctx) => {
          const g = ctx.game;
          const h = ctx.helpers;
          for (const name of ['Zeugma', 'Samosata', 'Cyrrhus', 'Beroea', 'Chalcis', 'Emesa',
            'Apamea', 'Palmyra', 'Damascus', 'Batanea', 'Caesarea Philippi']) {
            const p = ctx.prov(name);
            if (p && p.owner === 'PAR') h.changeOwner(ctx, name, 'ROM');
          }
          const w = crownWar(g);
          if (w) {
            const i = w.attackers.indexOf('PAR');
            if (i >= 0) w.attackers.splice(i, 1);
            for (const t of ['HER', 'ROM']) {
              const tt = g.tags[t];
              if (tt) tt.atWarWith = tt.atWarWith.filter((x) => x !== 'PAR');
            }
            const par = g.tags.PAR;
            if (par) par.atWarWith = par.atWarWith.filter((x) => x !== 'HER' && x !== 'ROM');
          }
          // the host of Pacorus limps home
          for (const a of h.armiesOf(ctx, 'PAR')) a.men = Math.max(500, Math.round(a.men * 0.5));
          h.removeModifier(ctx, 'ATG', 'parthian_favor');
          h.adjust(ctx, 'ATG', { legitimacy: -10 });
          h.adjust(ctx, 'PAR', { stability: -2 });
        }),
      },
    ],
  },

  // ── 5: the Hasmonean bride ────────────────────────────────────────────────
  {
    id: 'ev5_mariamne',
    title: 'The Hasmonean Bride',
    desc: 'Mariamne is Hyrcanus\' granddaughter — which is to say, she is legitimacy '
      + 'with dark eyes. Betrothed to Herod years ago, the marriage now would graft the '
      + 'Idumean onto the Maccabean stock and steal half of Antigonus\' argument. It '
      + 'would also put a Hasmonean in his bed and Hasmonean heirs in his house, and '
      + 'some debts compound.',
    forTag: 'HER',
    date: { y: -38, m: 9 },
    aiOption: 0,
    options: [
      {
        label: 'Marry her at Samaria',
        tooltip: '+20 legitimacy; Antigonus −10 legitimacy. The dynasty question is settled — expensively, later.',
        effects: guard('ev5_mariamne:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'HER', { legitimacy: 20 });
          ctx.helpers.adjust(ctx, 'ATG', { legitimacy: -10 });
        }),
      },
      {
        label: 'A king marries no one\'s granddaughter',
        tooltip: '+15 governance points; the Hasmonean claim stays whole against you (+5 Antigonus legitimacy).',
        effects: guard('ev5_mariamne:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'HER', { gov: 15 });
          ctx.helpers.adjust(ctx, 'ATG', { legitimacy: 5 });
        }),
      },
    ],
  },

  // ── 6: Joseph at Jericho ──────────────────────────────────────────────────
  {
    id: 'ev5_joseph',
    title: 'Joseph at Jericho',
    desc: 'Herod\'s brother Joseph, told to hold and wait, does neither: he takes raw '
      + 'recruits harvesting toward Jericho and Antigonus\' men catch him in the hills. '
      + 'The head is brought to Antigonus, who — the age being what it is — has it '
      + 'struck about with a rod. Wars between kings are wars between families.',
    forTag: 'both',
    date: { y: -38, m: 11 },
    trigger: safeTrigger('ev5_joseph', (ctx) => alive(ctx, 'HER') && alive(ctx, 'ATG')),
    aiOption: 0,
    options: [
      {
        label: 'Blood calls for blood',
        tooltip: 'Herod: −1 stability, +20 martial points (grief is fuel). Antigonus: +5 legitimacy among the defiant.',
        effects: guard('ev5_joseph:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'HER', { stability: -1, mar: 20 });
          ctx.helpers.adjust(ctx, 'ATG', { legitimacy: 5 });
        }),
      },
    ],
  },

  // ── 7: the sabbatical year ────────────────────────────────────────────────
  {
    id: 'ev5_sabbath',
    title: 'The Seventh Year',
    desc: 'The land keeps its own law: this is the sabbatical year, when fields lie '
      + 'fallow and granaries run on memory. Armies do not observe shmita. In Jerusalem '
      + 'the storehouses are counted twice a week, and the countryside eats seed corn.',
    forTag: 'both',
    date: { y: -37, m: 3 },
    aiOption: 0,
    options: [
      {
        label: 'The law is the law',
        tooltip: 'Antigonus: unrest rises across his realm (famine modifier, 8 months). Herod\'s coastal lands import grain: −50 talents.',
        effects: guard('ev5_sabbath:0', (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ATG', {
            id: 'shmita', name: 'The Seventh Year', months: 8,
            effects: { unrestAll: 1.5 },
          });
          ctx.helpers.adjust(ctx, 'HER', { treasury: -50 });
        }),
      },
    ],
  },

  // ── 8: the works begin ────────────────────────────────────────────────────
  {
    id: 'ev5_works',
    title: 'The Works Begin',
    desc: 'Like Pompey a generation ago, the attackers come at Jerusalem from the '
      + 'north, where the ground allows engines. Three ramparts rise; the defenders '
      + 'sally by night and burn what they can. Sosius sends more timber.',
    forTag: 'player',
    trigger: safeTrigger('ev5_works', (ctx) => {
      const g = ctx.game;
      const jer = ctx.prov('Jerusalem');
      return !!(jer && jer.siege && (g.date.y > -38 || (g.date.y === -38 && g.date.m >= 6)));
    }),
    aiOption: 0,
    options: [
      {
        label: 'Feed the engines',
        tooltip: 'The besieger of Jerusalem gains +30% siege progress for a year.',
        effects: guard('ev5_works:0', (ctx) => {
          const jer = ctx.prov('Jerusalem');
          const by = jer && jer.siege && jer.siege.by;
          if (by) {
            ctx.helpers.addTagModifier(ctx, by, {
              id: 'siege_works', name: 'The Siege Works', months: 12,
              effects: { siegeMult: 1.3 },
            });
          }
        }),
      },
    ],
  },

  // ── 9: Cleopatra's price ──────────────────────────────────────────────────
  {
    id: 'ev5_cleopatra',
    title: 'The Queen of Egypt Names a Price',
    desc: 'Cleopatra has convinced Antony that the balsam groves of Jericho — the most '
      + 'profitable acres on earth — would look well among her revenues. Whoever rules '
      + 'in Judaea when this war ends will rent their own best land from Egypt. Her '
      + 'agents are already measuring.',
    forTag: 'player',
    date: { y: -37, m: 6 },
    aiOption: 1,
    options: [
      {
        label: 'Pay her agents to misplace the survey',
        tooltip: '−100 talents; Egypt\'s opinion of you +40.',
        effects: guard('ev5_cleopatra:0', (ctx) => {
          const me = ctx.game.playerTag;
          ctx.helpers.adjust(ctx, me, { treasury: -100 });
          const pto = ctx.game.tags.PTO;
          if (pto) {
            if (!pto.opinion) pto.opinion = {};
            pto.opinion[me] = Math.min(200, (pto.opinion[me] || 0) + 40);
          }
        }),
      },
      {
        label: 'Let the future pay its own debts',
        tooltip: 'Egypt\'s opinion of you −40. A problem for the victor.',
        effects: guard('ev5_cleopatra:1', (ctx) => {
          const me = ctx.game.playerTag;
          const pto = ctx.game.tags.PTO;
          if (pto) {
            if (!pto.opinion) pto.opinion = {};
            pto.opinion[me] = Math.max(-200, (pto.opinion[me] || 0) - 40);
          }
        }),
      },
    ],
  },

  // ── THE TRIUMVIRAL WORLD CONTINUES ────────────────────────────────────────
  {
    id: 'ev5_antony_parthia',
    title: 'Antony Marches East',
    worldLabel: 'Antony opens his Parthian campaign',
    desc: 'Antony assembles the greatest Roman army yet seen in the East and chooses '
      + 'the Armenian road toward Media. The old chronology records a ruinous retreat. '
      + 'Here the invasion still begins on time, but its result belongs to the armies and '
      + 'frontiers that survived the War for the Crown.',
    forTag: 'both',
    date: { y: -36, m: 5 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'The standards turn toward Media',
      tooltip: 'If Rome and Parthia survive, Antony opens a war and fields a large eastern army. No Roman defeat is hard-coded.',
      effects: guard('ev5_antony_parthia:0', (ctx) => {
        if (!alive(ctx, 'ROM') || !alive(ctx, 'PAR')) return;
        if (!warBetween(ctx.game, 'ROM', 'PAR')) ctx.helpers.declareWar(ctx, 'ROM', 'PAR', "Antony's Parthian Campaign");
        // This is a Roman–Arsacid imperial campaign, not a license for every
        // small Tigris client to annex Syria while the great armies pass.
        const war = warBetween(ctx.game, 'ROM', 'PAR');
        if (war) {
          for (const client of ['OSR', 'ADI', 'CHX']) {
            war.attackers = (war.attackers || []).filter((t) => t !== client);
            war.defenders = (war.defenders || []).filter((t) => t !== client);
            const ct = ctx.game.tags[client];
            if (ct) ct.atWarWith = (ct.atWarWith || []).filter((t) => t !== 'ROM');
            const rom = ctx.game.tags.ROM;
            if (rom) rom.atWarWith = (rom.atWarWith || []).filter((t) => t !== client);
          }
        }
        const base = ctx.helpers.controls(ctx, 'ROM', 'Antioch') ? 'Antioch' : 'Tarsus';
        ctx.helpers.spawnArmy(ctx, 'ROM', base, {
          inf: 12, cav: 4, name: "Antony's Eastern Army",
          general: { name: 'Marcus Antonius', fire: 3, shock: 4, maneuver: 3 },
        });
        ctx.helpers.addTagModifier(ctx, 'ROM', {
          id: 'antony_east', name: 'The Eastern Gamble', months: 72,
          effects: { reinforceMult: 0.85, siegeBonus: 1, maintMult: 0.45 },
        });
        ctx.helpers.chronicle(ctx, 'war', 'Antony marches through Armenia toward Media; the campaign begins, but its ending is unwritten.');
      }),
    }],
  },
  {
    id: 'ev5_actium',
    title: 'The War of Actium',
    worldLabel: 'Octavian and Antony fight for the Roman world',
    desc: 'The compact of the triumvirs has narrowed to two courts: Octavian in the west, '
      + 'Antony and Cleopatra in the east. Client kings count ships and old favors. If '
      + 'Egypt still stands, war comes to it; if it has already fallen, Octavian consolidates '
      + 'without pretending to defeat a ghost.',
    forTag: 'both',
    date: { y: -31, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'The Roman world chooses between two courts',
      tooltip: 'A surviving Ptolemaic Egypt enters war with Rome and receives Antony’s remaining strength. If Egypt is gone, Rome receives a consolidation bonus instead.',
      effects: guard('ev5_actium:0', (ctx) => {
        if (!alive(ctx, 'ROM')) return;
        ctx.helpers.setRuler(ctx, 'ROM', { name: 'Gaius Octavianus', title: 'Caesar', gov: 4, infl: 5, mar: 4, age: 32 });
        if (alive(ctx, 'PTO')) {
          if (!warBetween(ctx.game, 'ROM', 'PTO')) ctx.helpers.declareWar(ctx, 'ROM', 'PTO', 'The War of Actium');
          ctx.helpers.addTagModifier(ctx, 'PTO', {
            id: 'antony_and_cleopatra', name: 'The Court of Antony and Cleopatra', months: 18,
            effects: { moraleMult: 1.08, maintMult: 0.9 },
          });
          ctx.helpers.spawnArmy(ctx, 'PTO', 'Alexandria', {
            inf: 10, cav: 3, name: 'Army of Antony and Cleopatra',
            general: { name: 'Marcus Antonius', fire: 3, shock: 4, maneuver: 2 },
          });
          ctx.helpers.chronicle(ctx, 'war', 'Octavian and the eastern court go to war; Actium opens the final struggle of the Republic.');
        } else {
          ctx.helpers.adjust(ctx, 'ROM', { stability: 1, legitimacy: 10 });
          ctx.helpers.chronicle(ctx, 'era', 'With the eastern court already gone, Octavian consolidates the Roman world without an Actium to fight.');
        }
      }),
    }],
  },
  {
    id: 'ev5_alexandria',
    title: 'Alexandria and the Last Ptolemy',
    worldLabel: 'Octavian reaches the historical end of Ptolemaic rule',
    desc: 'Octavian reaches Egypt. The received history ends Antony and Cleopatra here, '
      + 'but this campaign first asks who actually holds Alexandria and whether Egypt still '
      + 'possesses a kingdom worth ending.',
    forTag: 'both',
    date: { y: -30, m: 8 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'Count the banners on the walls',
      tooltip: 'If Rome controls Alexandria or Egypt is a three-province rump, Rome closes the war. A strong independent Egypt instead survives into alternate history.',
      effects: guard('ev5_alexandria:0', (ctx) => {
        if (!alive(ctx, 'ROM')) return;
        if (!alive(ctx, 'PTO')) {
          ctx.helpers.chronicle(ctx, 'fall', 'The Ptolemaic court had already vanished before Octavian reached its historical horizon.');
          return;
        }
        const romeAtAlexandria = ctx.helpers.controls(ctx, 'ROM', 'Alexandria');
        if (romeAtAlexandria || countOwned(ctx, 'PTO') <= 3) {
          const w = warBetween(ctx.game, 'ROM', 'PTO');
          const winner = w && (w.attackers || []).indexOf('ROM') >= 0 ? 'att' : 'def';
          ctx.helpers.endWar(ctx, 'ROM', 'PTO', winner);
          ctx.helpers.adjust(ctx, 'PTO', { stability: -3, legitimacy: -50 });
          ctx.helpers.addTagModifier(ctx, 'ROM', {
            id: 'egypt_annexed', name: 'The Wealth of Egypt', months: 60,
            effects: { incomeMult: 1.1 },
          });
          ctx.helpers.chronicle(ctx, 'fall', 'Alexandria falls to Octavian; the Ptolemaic court reaches its end on the live map.');
        } else {
          ctx.helpers.addTagModifier(ctx, 'PTO', {
            id: 'egypt_defies_octavian', name: 'Egypt Defies Octavian', months: -1,
            effects: { moraleMult: 1.08, legitimacyAdd: 0.1 },
          });
          ctx.helpers.adjust(ctx, 'PTO', { stability: 1, legitimacy: 20 });
          ctx.helpers.chronicle(ctx, 'era', 'Alexandria remains free: the Ptolemaic kingdom survives beyond its historical horizon.');
        }
      }),
    }],
  },
  {
    id: 'ev5_augustus',
    title: 'Augustus',
    worldLabel: 'Octavian becomes Augustus',
    desc: 'The Senate grants Octavian the name Augustus and dresses one-man rule in the '
      + 'forms of a restored republic. Whether won at Actium or assembled from an altered '
      + 'East, the Roman state now has an emperor in everything but its preferred vocabulary.',
    forTag: 'both',
    date: { y: -27, m: 1 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'The Republic keeps its offices and loses its uncertainty',
      tooltip: 'A surviving Rome becomes an imperial monarchy under Augustus, with a long stability and income bonus.',
      effects: guard('ev5_augustus:0', (ctx) => {
        const rom = ctx.game.tags.ROM;
        if (!rom || !rom.alive) return;
        rom.govType = 'monarchy';
        rom.electionIn = 48;
        ctx.helpers.setRuler(ctx, 'ROM', { name: 'Augustus', title: 'Princeps', gov: 5, infl: 5, mar: 4, age: 36 });
        ctx.helpers.adjust(ctx, 'ROM', { stability: 2, legitimacy: 30 });
        ctx.helpers.addTagModifier(ctx, 'ROM', {
          id: 'augustan_settlement', name: 'The Augustan Settlement', months: 120,
          effects: { incomeMult: 1.08, legitimacyAdd: 0.1 },
        });
        ctx.helpers.chronicle(ctx, 'ruler', 'Octavian becomes Augustus; the Roman Republic acquires an emperor while preserving its old names.');
      }),
    }],
  },

  // ── 10: fired by victory ──────────────────────────────────────────────────
  {
    id: 'ev5_antigonus_end',
    title: 'The Axe for a King',
    desc: 'Antigonus is taken to Antioch in chains. He clings to Sosius\' feet and is '
      + 'called "Antigone" for it — soldiers are cruel about lost dignity. Antony '
      + 'decides a live Hasmonean is more dangerous than a precedent: for the first '
      + 'time, Rome puts a crowned king under the axe. In Jerusalem, Herod counts '
      + 'which of the Sanhedrin voted against him.',
    forTag: 'both',
    // fired by checkVictory / never by date
    trigger: safeTrigger('ev5_antigonus_end', () => false),
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'So die the Maccabees',
        tooltip: 'The age of the Hasmoneans ends; the age of Herod begins.',
        effects: guard('ev5_antigonus_end:0', () => {}),
      },
    ],
  },
];
