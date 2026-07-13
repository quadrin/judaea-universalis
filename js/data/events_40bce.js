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
