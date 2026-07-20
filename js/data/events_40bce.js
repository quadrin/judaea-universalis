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

// Scripted warscore swings persist in the crown war's eventScore side-bucket.
function addCrownScore(ctx, tag, amount) {
  try {
    const w = crownWar(ctx.game);
    if (!w) return;
    if (!w.eventScore) w.eventScore = { att: 0, def: 0 };
    const side = (w.attackers || []).indexOf(tag) >= 0 ? 'att'
      : (w.defenders || []).indexOf(tag) >= 0 ? 'def' : null;
    if (side) w.eventScore[side] += amount;
  } catch (e) { warnOnce('addCrownScore', e); }
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
      {
        label: 'Five hundred talents, promised',
        tooltip: 'Antigonus: −60 talents sent east, and the Parthian Party +10 approval — the patron\'s bill is paid before it is presented. Herod: +5 influence points as the city\'s silver rides away.',
        effects: guard('ev5_parthians:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ATG', { treasury: -60 });
          ctx.helpers.factionShift(ctx, 'ATG', 'parthians', 10);
          ctx.helpers.adjust(ctx, 'HER', { infl: 5 });
        }),
      },
    ],
  },

  // ── 1b: the Parthian tide in Asia ─────────────────────────────────────────
  {
    id: 'ev5_labienus',
    title: 'The Parthian Roman',
    desc: 'Quintus Labienus — son of Caesar\'s best officer, ambassador of the assassins, '
      + 'and now, by the strange bookkeeping of civil war, a Roman general in Parthian '
      + 'service — has overrun Asia Minor with Pacorus\' horsemen. He mints coins reading '
      + 'PARTHICUS IMPERATOR: conqueror of Parthia, by Parthia\'s leave. Rome\'s East is '
      + 'a rumor this year, and every throne in Syria knows it.',
    forTag: 'both',
    date: { y: -40, m: 9 },
    aiOption: 0,
    options: [
      {
        label: 'The East belongs to the horsemen',
        tooltip: 'Parthia: +25 martial points, +1 stability. Antigonus: +5 legitimacy — his patron bestrides the world.',
        effects: guard('ev5_labienus:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'PAR', { mar: 25, stability: 1 });
          ctx.helpers.adjust(ctx, 'ATG', { legitimacy: 5 });
        }),
      },
      {
        label: 'Asia pays for its conquerors',
        tooltip: 'Parthia: +40 talents from the plundered cities, +10 martial points — the lancers are paid, not inspired. Antigonus: +5 legitimacy.',
        effects: guard('ev5_labienus:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'PAR', { treasury: 40, mar: 10 });
          ctx.helpers.adjust(ctx, 'ATG', { legitimacy: 5 });
        }),
      },
    ],
  },

  // ── 1c: the rock holds ────────────────────────────────────────────────────
  {
    id: 'ev5_masada',
    title: 'The Cisterns of Masada',
    requiresWar: ['HER', 'ATG'],
    desc: 'On the rock above the Dead Sea, Herod\'s family and eight hundred fighters '
      + 'watch Antigonus\' siege lines and their own water jars. When the jars are nearly '
      + 'dry, rain comes in the night — enough to fill every cistern in the casemates. '
      + 'The garrison takes it as a verdict from heaven; the besiegers, watching the '
      + 'gutters run on a desert fortress, privately agree.',
    forTag: 'both',
    date: { y: -40, m: 12 },
    aiOption: 0,
    options: [
      {
        label: 'Heaven keeps its own garrisons',
        tooltip: 'Herod: +10 influence points, +5 legitimacy (the family endures; the story travels). Antigonus: −5 legitimacy.',
        effects: guard('ev5_masada:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'HER', { infl: 10, legitimacy: 5 });
          ctx.helpers.adjust(ctx, 'ATG', { legitimacy: -5 });
        }),
      },
      {
        label: 'Press the siege through the rains',
        tooltip: 'Antigonus: +10 martial points, +1 war exhaustion — the lines hold under the downpour, whatever heaven thinks. Herod: +5 legitimacy (the rock still stands).',
        effects: guard('ev5_masada:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ATG', { mar: 10, warExhaustion: 1 });
          ctx.helpers.adjust(ctx, 'HER', { legitimacy: 5 });
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
      {
        label: 'Borrow against the decree',
        tooltip: 'Herod is King by decree: +15 legitimacy, +100 talents raised on the Senate\'s word, the herodKing flag; Rome enters the War for the Crown at his side.',
        effects: guard('ev5_senate:1', (ctx) => {
          ctx.helpers.setFlag(ctx, 'herodKing', true);
          ctx.helpers.adjust(ctx, 'HER', { legitimacy: 15, treasury: 100 });
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

  // ── 3b: the priest-king's silver ──────────────────────────────────────────
  {
    id: 'ev5_coins',
    title: 'Mattathias, High Priest',
    desc: 'Antigonus\' mint hammers out the answer to the Senate\'s decree: bronze coins '
      + 'with MATTATHIAS THE HIGH PRIEST in Hebrew on one face and KING ANTIGONUS in '
      + 'Greek on the other — the last coins a Hasmonean will ever strike. A crown from '
      + 'Rome is paper; the altar and the language of the fathers are an argument every '
      + 'marketplace understands.',
    forTag: 'ATG',
    date: { y: -39, m: 3 },
    aiOption: 0,
    options: [
      {
        label: 'Strike the double legend',
        tooltip: '−30 talents; +8 legitimacy, and the Priesthood +10 approval. Every purse in Judaea carries your claim.',
        effects: guard('ev5_coins:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ATG', { treasury: -30, legitimacy: 8 });
          ctx.helpers.factionShift(ctx, 'ATG', 'priesthood', 10);
        }),
      },
      {
        label: 'Melt the temple gifts for pay',
        tooltip: '+40 talents; the Priesthood −10 approval. Wars are won with soldiers, not slogans.',
        effects: guard('ev5_coins:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ATG', { treasury: 40 });
          ctx.helpers.factionShift(ctx, 'ATG', 'priesthood', -10);
        }),
      },
    ],
  },

  // ── 3c: the paper king lands ──────────────────────────────────────────────
  {
    id: 'ev5_joppa',
    title: 'The Landing at Joppa',
    requiresWar: ['HER', 'ATG'],
    desc: 'Herod comes back from Rome with a title and no army, lands at Ptolemais, and '
      + 'discovers what a title is for: Galilee begins to declare — village strongmen, '
      + 'old clients of his father, men who can read a Senate decree and a weather vane '
      + 'alike. He takes Joppa to open the coast, and the road to Masada with it.',
    forTag: 'both',
    trigger: safeTrigger('ev5_joppa', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'herodKing')
      && (ctx.game.date.y > -39 || (ctx.game.date.y === -39 && ctx.game.date.m >= 4))
      && alive(ctx, 'HER')),
    aiOption: 0,
    options: [
      {
        label: 'Galilee declares',
        tooltip: 'Herod: 2 regiments of Galilean recruits at Ptolemais, +1,500 manpower, +60 talents — the customs of the coast start paying their king.',
        effects: guard('ev5_joppa:0', (ctx) => {
          ctx.helpers.spawnArmy(ctx, 'HER', 'Ptolemais', { inf: 2, name: 'Galilean Recruits' });
          ctx.helpers.adjust(ctx, 'HER', { manpower: 1500, treasury: 60 });
        }),
      },
      {
        label: 'Buy the strongmen outright',
        tooltip: 'Herod: 3 regiments of Galilean recruits at Ptolemais, +1,000 manpower — but the bounties cost 40 talents, and the customs of the coast stay in local hands.',
        effects: guard('ev5_joppa:1', (ctx) => {
          ctx.helpers.spawnArmy(ctx, 'HER', 'Ptolemais', { inf: 3, name: 'Galilean Recruits' });
          ctx.helpers.adjust(ctx, 'HER', { manpower: 1000, treasury: -40 });
        }),
      },
    ],
  },

  // ── 3d: Ventidius turns the tide ──────────────────────────────────────────
  {
    id: 'ev5_cilician_gates',
    title: 'The Cilician Gates',
    requiresWar: ['ROM', 'PAR'],
    desc: 'Ventidius — who marched in Pompey\'s triumph as a boy captive and sold mules '
      + 'to legions before he commanded them — meets Labienus at the passes and breaks '
      + 'him. The renegade dies in flight; the Parthian horse learns that slingers on '
      + 'high ground kill cataphracts. The tide that flooded Asia last year has met '
      + 'its first wall.',
    forTag: 'both',
    date: { y: -39, m: 6 },
    aiOption: 0,
    options: [
      {
        label: 'The mule-seller\'s first lesson',
        tooltip: 'Parthia: −1 stability. Rome: +10 legitimacy. Antigonus\' Parthian Party −10 approval — the patron looks mortal.',
        effects: guard('ev5_gates:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'PAR', { stability: -1 });
          ctx.helpers.adjust(ctx, 'ROM', { legitimacy: 10 });
          ctx.helpers.factionShift(ctx, 'ATG', 'parthians', -10);
        }),
      },
      {
        label: 'Hound them to the Euphrates',
        tooltip: 'Rome: +15 martial points, +1 war exhaustion — the pursuit is paid for in marching flesh. Parthia: −1 stability. Antigonus\' Parthian Party −5 approval.',
        effects: guard('ev5_cilician_gates:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ROM', { mar: 15, warExhaustion: 1 });
          ctx.helpers.adjust(ctx, 'PAR', { stability: -1 });
          ctx.helpers.factionShift(ctx, 'ATG', 'parthians', -5);
        }),
      },
    ],
  },

  // ── 3e: the Roman shadow takes bribes ─────────────────────────────────────
  {
    id: 'ev5_silo',
    title: 'Silo\'s Winter',
    requiresWar: ['HER', 'ATG'],
    desc: 'The legate Silo was sent to help the new king take his kingdom. Antigonus '
      + 'pays him better to be helpless: the legions discover urgent needs in winter '
      + 'quarters, provisioning difficulties, the impossibility of siegework before '
      + 'spring. Everyone involved understands the transaction perfectly, which is '
      + 'what makes it Roman.',
    forTag: 'HER',
    date: { y: -39, m: 11 },
    aiOption: 1,
    options: [
      {
        label: 'Outbid Antigonus for your own allies',
        tooltip: '−80 talents; Silo\'s men stay in the field: +4% discipline for 6 months.',
        effects: guard('ev5_silo:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'HER', { treasury: -80 });
          ctx.helpers.addTagModifier(ctx, 'HER', {
            id: 'silo_bought', name: 'Silo, Paid Twice', months: 6,
            effects: { disciplineMult: 1.04 },
          });
        }),
      },
      {
        label: 'Let him winter — fight with your own',
        tooltip: 'The Hired Swords +8 approval (the king trusts his own steel); Antigonus +5 legitimacy for the respite.',
        effects: guard('ev5_silo:1', (ctx) => {
          ctx.helpers.factionShift(ctx, 'HER', 'swords', 8);
          ctx.helpers.adjust(ctx, 'ATG', { legitimacy: 5 });
        }),
      },
    ],
  },

  // ── 3f: the caves above the lake ──────────────────────────────────────────
  {
    id: 'ev5_caves',
    title: 'The Caves of the Cliffs',
    requiresWar: ['HER', 'ATG'],
    desc: 'The brigand clans of Galilee — Antigonus\' irregulars, or bandits, depending '
      + 'on who is paying — hole up in caves set into cliffs above the lake, where no '
      + 'path leads. Herod\'s answer is remembered for a century: soldiers lowered from '
      + 'the clifftop in great baskets, swinging at the cave mouths with fire and '
      + 'grappling hooks. One old man kills his own family rather than surrender.',
    forTag: 'HER',
    date: { y: -38, m: 2 },
    aiOption: 0,
    options: [
      {
        label: 'The baskets go down',
        tooltip: 'Galilee is broken to the king: +20 martial points, Tarichaea and Sepphoris −2 unrest for 12 months. The Sanhedrin −8 approval.',
        effects: guard('ev5_caves:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'HER', { mar: 20 });
          for (const n of ['Tarichaea', 'Sepphoris']) {
            ctx.helpers.addProvinceModifier(ctx, n, {
              id: 'caves_cleared', name: 'The Caves Cleared', months: 12, effects: { unrest: -2 },
            });
          }
          ctx.helpers.factionShift(ctx, 'HER', 'sanhedrin', -8);
        }),
      },
      {
        label: 'Offer the clans terms',
        tooltip: '+15 influence points; the clans melt away instead of dying: Galilee +1 unrest for 6 months.',
        effects: guard('ev5_caves:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'HER', { infl: 15 });
          for (const n of ['Tarichaea', 'Sepphoris']) {
            ctx.helpers.addProvinceModifier(ctx, n, {
              id: 'clans_dispersed', name: 'The Clans Disperse', months: 6, effects: { unrest: 1 },
            });
          }
        }),
      },
    ],
  },

  // ── 4: Gindarus — Parthia broken ──────────────────────────────────────────
  {
    id: 'ev5_gindarus',
    title: 'The Day at Gindarus',
    requiresWar: ['ROM', 'PAR'],
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

  // ── 4b: friend and foe alike ──────────────────────────────────────────────
  {
    id: 'ev5_machaeras',
    title: 'Machaeras Kills Everyone',
    requiresWar: ['HER', 'ATG'],
    desc: 'The Roman officer Machaeras, sent with two legions and no judgment, takes '
      + 'Antigonus\' bribe, is refused the city anyway, and avenges the insult on the '
      + 'countryside — killing Herod\'s partisans and Antigonus\' with democratic '
      + 'thoroughness. Herod rides for Samosata to put the complaint to Antony in '
      + 'person. There are allies, and there are weather events wearing armor.',
    forTag: 'HER',
    date: { y: -38, m: 8 },
    aiOption: 0,
    options: [
      {
        label: 'Take the complaint to Antony himself',
        tooltip: '−800 manpower (the villages pay for Rome\'s discipline); +15 influence points — the road to Samosata is open.',
        effects: guard('ev5_machaeras:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'HER', { manpower: -800, infl: 15 });
        }),
      },
      {
        label: 'Stand between Rome and your villages',
        tooltip: '−300 manpower; +5 legitimacy — the king shields his partisans in person, and the complaint travels to Antony by letter, which is to say slowly.',
        effects: guard('ev5_machaeras:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'HER', { manpower: -300, legitimacy: 5 });
        }),
      },
    ],
  },

  // ── 4c: the embrace at Samosata ───────────────────────────────────────────
  {
    id: 'ev5_samosata',
    title: 'The Walls of Samosata',
    requiresWar: ['HER', 'ATG'],
    desc: 'Herod arrives at Antony\'s siege of Samosata with reinforcements gathered on '
      + 'the road and a convoy rescued from ambush on the way in — the kind of arrival '
      + 'generals remember. Antony embraces him before the officers, and when the town '
      + 'falls he sends Sosius south with two legions and unambiguous orders: make the '
      + 'paper king a king in fact.',
    forTag: 'both',
    trigger: safeTrigger('ev5_samosata', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'herodKing')
      && (ctx.game.date.y > -38 || (ctx.game.date.y === -38 && ctx.game.date.m >= 10))
      && alive(ctx, 'HER') && alive(ctx, 'ATG')),
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Sosius marches south',
        tooltip: 'Rome: two legions under Sosius (6 regiments) at Antioch. Herod: +15 legitimacy, +2,000 manpower, +5 war score in the crown war.',
        effects: guard('ev5_samosata:0', (ctx) => {
          ctx.helpers.spawnArmy(ctx, 'ROM', 'Antioch', {
            inf: 5, cav: 1, name: 'Sosius\' Legions',
            general: { name: 'Gaius Sosius', fire: 2, shock: 3, maneuver: 2 },
          });
          ctx.helpers.adjust(ctx, 'HER', { legitimacy: 15, manpower: 2000, treasury: 80 });
          addCrownScore(ctx, 'HER', 5);
        }),
      },
      {
        label: 'Feast the legions on the road south',
        tooltip: 'Rome: two legions under Sosius (6 regiments) at Antioch. Herod feasts the army at his own table: −40 talents, +20 legitimacy, +1,500 manpower, +5 war score in the crown war.',
        effects: guard('ev5_samosata:1', (ctx) => {
          ctx.helpers.spawnArmy(ctx, 'ROM', 'Antioch', {
            inf: 5, cav: 1, name: 'Sosius\' Legions',
            general: { name: 'Gaius Sosius', fire: 2, shock: 3, maneuver: 2 },
          });
          ctx.helpers.adjust(ctx, 'HER', { legitimacy: 20, manpower: 1500, treasury: -40 });
          addCrownScore(ctx, 'HER', 5);
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
    requiresWar: ['HER', 'ATG'],
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
      {
        label: 'Ransom the head for burial',
        tooltip: 'Herod: −50 talents to Antigonus for his brother\'s head, +10 influence points — the family buries its dead whole. Antigonus: +50 talents.',
        effects: guard('ev5_joseph:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'HER', { treasury: -50, infl: 10 });
          ctx.helpers.adjust(ctx, 'ATG', { treasury: 50 });
        }),
      },
    ],
  },

  // ── 6b: Joseph avenged ────────────────────────────────────────────────────
  {
    id: 'ev5_pappus',
    title: 'Pappus at Isana',
    requiresWar: ['HER', 'ATG'],
    desc: 'Antigonus\' best general meets Herod in open field at Isana and loses '
      + 'everything: the battle, the army, and — because wars between kings are wars '
      + 'between families — his head, which Herod sends to Pheroras as consolation for '
      + 'their brother Joseph. The road to Jerusalem has no more armies on it, only '
      + 'winter and the walls.',
    forTag: 'both',
    trigger: safeTrigger('ev5_pappus', (ctx) =>
      !!(ctx.game.firedEvents && ctx.game.firedEvents.ev5_joseph)
      && (ctx.game.date.y > -37 || (ctx.game.date.y === -37 && ctx.game.date.m >= 1))
      && alive(ctx, 'HER') && alive(ctx, 'ATG')),
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'A head for a head',
        tooltip: 'Herod: +8 war score, +20 martial points. Antigonus: −10 legitimacy, and the Street of Jerusalem −10 approval as the field armies fail.',
        effects: guard('ev5_pappus:0', (ctx) => {
          addCrownScore(ctx, 'HER', 8);
          ctx.helpers.adjust(ctx, 'HER', { mar: 20 });
          ctx.helpers.adjust(ctx, 'ATG', { legitimacy: -10 });
          ctx.helpers.factionShift(ctx, 'ATG', 'street', -10);
        }),
      },
      {
        label: 'Spare the routed rank and file',
        tooltip: 'Herod: +5 war score, +15 influence points — mercy to the beaten travels ahead of the army. Antigonus: −10 legitimacy, but the Street of Jerusalem is not stirred.',
        effects: guard('ev5_pappus:1', (ctx) => {
          addCrownScore(ctx, 'HER', 5);
          ctx.helpers.adjust(ctx, 'HER', { infl: 15 });
          ctx.helpers.adjust(ctx, 'ATG', { legitimacy: -10 });
        }),
      },
    ],
  },

  // ── 6c: the omen at Jericho ───────────────────────────────────────────────
  {
    id: 'ev5_roof',
    title: 'The Roof at Jericho',
    requiresWar: ['HER', 'ATG'],
    desc: 'After the day\'s skirmish Herod dines with his officers in a house at '
      + 'Jericho; the company has barely walked out when the roof drops into the '
      + 'dining room behind them. No one is hurt. An army that has just watched its '
      + 'general outlive a falling building will follow him through anything — soldiers '
      + 'keep theological ledgers too.',
    forTag: 'HER',
    trigger: safeTrigger('ev5_roof', (ctx) =>
      (ctx.game.date.y > -37 || (ctx.game.date.y === -37 && ctx.game.date.m >= 2))
      && alive(ctx, 'HER') && alive(ctx, 'ATG')),
    aiOption: 0,
    options: [
      {
        label: 'Heaven audits its investments',
        tooltip: '+10 legitimacy; +5% morale for 12 months ("The Preserved King").',
        effects: guard('ev5_roof:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'HER', { legitimacy: 10 });
          ctx.helpers.addTagModifier(ctx, 'HER', {
            id: 'preserved_king', name: 'The Preserved King', months: 12,
            effects: { moraleMult: 1.05 },
          });
        }),
      },
      {
        label: 'Check the roofs, double the watch',
        tooltip: '+10 governance points; +4% discipline for 6 months ("The Careful King") — a king who inspects his lodgings outlives his omens.',
        effects: guard('ev5_roof:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'HER', { gov: 10 });
          ctx.helpers.addTagModifier(ctx, 'HER', {
            id: 'careful_king', name: 'The Careful King', months: 6,
            effects: { disciplineMult: 1.04 },
          });
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
      {
        label: 'Grain ships from Alexandria',
        tooltip: 'Antigonus: −60 talents for Egyptian grain, and the famine runs 4 months instead of 8. Herod\'s coastal lands import as before: −50 talents.',
        effects: guard('ev5_sabbath:1', (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ATG', {
            id: 'shmita', name: 'The Seventh Year', months: 4,
            effects: { unrestAll: 1.5 },
          });
          ctx.helpers.adjust(ctx, 'ATG', { treasury: -60 });
          ctx.helpers.adjust(ctx, 'HER', { treasury: -50 });
        }),
      },
    ],
  },

  // ── 8: the works begin ────────────────────────────────────────────────────
  {
    id: 'ev5_works',
    title: 'The Works Begin',
    requiresWar: ['HER', 'ATG'],
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
      {
        label: 'Heralds before the rams',
        tooltip: 'The besieger of Jerusalem gains +15% siege progress for 6 months and +10 influence points — terms are offered before the assault, and refused with dignity.',
        effects: guard('ev5_works:1', (ctx) => {
          const jer = ctx.prov('Jerusalem');
          const by = jer && jer.siege && jer.siege.by;
          if (by) {
            ctx.helpers.addTagModifier(ctx, by, {
              id: 'siege_parley', name: 'Terms Before the Walls', months: 6,
              effects: { siegeMult: 1.15 },
            });
            ctx.helpers.adjust(ctx, by, { infl: 10 });
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
    requiresWar: ['ROM', 'PTO'],
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
    requiresWar: ['HER', 'ATG'],
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
      {
        label: 'Pay for the precedent',
        tooltip: 'Herod: −100 talents to Antony; +10 legitimacy — the axe is bought as well as borrowed, and no one will crown a Hasmonean against him again.',
        effects: guard('ev5_antigonus_end:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'HER', { treasury: -100, legitimacy: 10 });
        }),
      },
    ],
  },

  // ── 11: the coda — the king counts the votes ──────────────────────────────
  {
    id: 'ev5_forty_five',
    title: 'The Forty-Five',
    desc: 'The lists are drawn up within the week: forty-five of Jerusalem\'s richest '
      + 'men — the Sanhedrin\'s core, Antigonus\' council — marked for the executioner, '
      + 'their estates for the new king\'s empty treasury. Guards at the gates search '
      + 'even the coffins going out for hidden silver. Or the list can be burned, and '
      + 'the new reign opened with a pardon nobody in the room believes.',
    forTag: 'HER',
    trigger: safeTrigger('ev5_forty_five', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'herodKing') && alive(ctx, 'HER') && !alive(ctx, 'ATG')),
    aiOption: 0,
    options: [
      {
        label: 'The list is signed',
        tooltip: '+150 talents from the confiscations; −5 legitimacy, and the Sanhedrin −20 approval. The debt of the trial in Galilee is paid.',
        effects: guard('ev5_forty_five:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'HER', { treasury: 150, legitimacy: -5 });
          ctx.helpers.factionShift(ctx, 'HER', 'sanhedrin', -20);
          ctx.helpers.chronicle(ctx, 'era', 'Herod opens his reign with the Forty-Five: the executioner works, the treasury fills, the Sanhedrin learns silence.');
        }),
      },
      {
        label: 'Burn the list',
        tooltip: '+10 legitimacy, and the Sanhedrin +15 approval — mercy from a king who owes none is remembered.',
        effects: guard('ev5_forty_five:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'HER', { legitimacy: 10 });
          ctx.helpers.factionShift(ctx, 'HER', 'sanhedrin', 15);
          ctx.helpers.chronicle(ctx, 'era', 'The list of the Forty-Five is burned unsigned: the new king opens his reign with a pardon.');
        }),
      },
    ],
  },

  // ═══ THE AUGUSTAN KINGDOM, 27 BCE – 6 CE ═══════════════════════════════════
  // The war is long over; the reign is the story now. Source spine: Josephus,
  // Antiquitates XV–XVII; Bellum I–II. Dated chapters fire even in a diverged
  // world — every effect is guarded on tag survival and actual control.

  // ── 12: Samaria becomes Sebaste ───────────────────────────────────────────
  {
    id: 'ev5_sebaste',
    title: 'Sebaste',
    worldLabel: 'Herod rebuilds Samaria as Sebaste',
    desc: 'Samaria — where the kings of Israel reigned, where Herod married Mariamne '
      + 'in the middle of a war — is rebuilt and renamed for Sebastos, which is Greek '
      + 'for Augustus. Six thousand veterans and country settlers take allotments '
      + 'inside a wall two miles around, and on the summit, over Omri\'s old palace, '
      + 'rises a temple to Roma and the emperor. Loyal, Greek, and garrisoned: a city '
      + 'the king can retreat to if Jerusalem ever remembers what it thinks of him.',
    forTag: 'both',
    date: { y: -27, m: 10 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Veterans, walls, and a temple to the emperor',
        tooltip: 'Herod: −120 talents. Sebaste permanently +15% tax, −1 unrest; +5 legitimacy; Rome\'s opinion +20. The Sanhedrin −8 approval — an idol\'s house on Israel\'s old high place.',
        effects: guard('ev5_sebaste:0', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.adjust(ctx, 'HER', { treasury: -120, legitimacy: 5 });
          if (ctx.helpers.controls(ctx, 'HER', 'Sebaste')) {
            ctx.helpers.addProvinceModifier(ctx, 'Sebaste', {
              id: 'sebaste_founded', name: 'The City of Sebastos', months: -1,
              effects: { taxMult: 1.15, unrest: -1 },
            });
          }
          const rom = ctx.game.tags.ROM;
          if (rom) {
            if (!rom.opinion) rom.opinion = {};
            rom.opinion.HER = Math.min(200, (rom.opinion.HER || 0) + 20);
          }
          ctx.helpers.factionShift(ctx, 'HER', 'sanhedrin', -8);
          ctx.helpers.chronicle(ctx, 'era', 'Samaria is reborn as Sebaste: veterans on the land, the emperor\'s temple on the summit.');
        }),
      },
      {
        label: 'Walls and veterans — no temple',
        tooltip: 'Herod: −80 talents. Sebaste permanently +10% tax; the Sanhedrin is not provoked — but Rome\'s opinion −20. Augustus notices what his client did not build.',
        effects: guard('ev5_sebaste:1', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.adjust(ctx, 'HER', { treasury: -80 });
          if (ctx.helpers.controls(ctx, 'HER', 'Sebaste')) {
            ctx.helpers.addProvinceModifier(ctx, 'Sebaste', {
              id: 'sebaste_founded', name: 'The Veterans\' City', months: -1,
              effects: { taxMult: 1.1 },
            });
          }
          const rom = ctx.game.tags.ROM;
          if (rom) {
            if (!rom.opinion) rom.opinion = {};
            rom.opinion.HER = Math.max(-200, (rom.opinion.HER || 0) - 20);
          }
        }),
      },
    ],
  },

  // ── 13: the great famine ──────────────────────────────────────────────────
  {
    id: 'ev5_famine',
    title: 'The Great Famine',
    desc: 'The rains fail, then fail again; after drought comes pestilence, and after '
      + 'pestilence the discovery that last year\'s seed corn was eaten in the winter. '
      + 'The countryside walks to the cities and the cities have nothing either. In '
      + 'the palace there is gold plate, ornament, the furniture of majesty — and in '
      + 'Egypt there is grain, if the prefect Petronius can be persuaded to sell it '
      + 'against his own export rules.',
    forTag: 'player',
    date: { y: -25, m: 3 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Strip the palace plate for Egyptian grain',
        tooltip: '−150 talents (the plate goes to the mint, the silver goes to Alexandria). Egyptian corn: −1 unrest everywhere for 12 months, +10 legitimacy — the executions are, for a season, forgiven.',
        effects: guard('ev5_famine:0', (ctx) => {
          const me = ctx.game.playerTag;
          if (!alive(ctx, me)) return;
          ctx.helpers.adjust(ctx, me, { treasury: -150, legitimacy: 10 });
          ctx.helpers.addTagModifier(ctx, me, {
            id: 'egyptian_corn', name: 'Corn from Egypt', months: 12,
            effects: { unrestAll: -1 },
          });
          ctx.helpers.chronicle(ctx, 'era', 'The king strips his own palace of its plate and buys Egyptian grain: the famine is fought with the furniture of majesty.');
        }),
      },
      {
        label: 'The treasury is the kingdom — guard it',
        tooltip: 'Keep the silver. The famine runs its course: +1.5 unrest everywhere and −15% manpower for 18 months, −10 legitimacy. The hungry keep their own ledgers.',
        effects: guard('ev5_famine:1', (ctx) => {
          const me = ctx.game.playerTag;
          if (!alive(ctx, me)) return;
          ctx.helpers.adjust(ctx, me, { legitimacy: -10 });
          ctx.helpers.addTagModifier(ctx, me, {
            id: 'great_famine', name: 'The Great Famine', months: 18,
            effects: { unrestAll: 1.5, manpowerMult: 0.85 },
          });
        }),
      },
    ],
  },

  // ── 13b: Petronius delivers ───────────────────────────────────────────────
  {
    id: 'ev5_petronius',
    title: 'The Prefect\'s Grain Ships',
    desc: 'Petronius, prefect of Egypt, lets the convoys sail — for Herod\'s silver and '
      + 'Herod\'s friendship, in roughly that order. The ships bring corn for the '
      + 'hungry, seed for the spring fields, and wool for a population that sold its '
      + 'cloaks in the summer of the hunger. Bread is distributed by the king\'s own '
      + 'officers, baked in the king\'s own ovens, and nobody is allowed to forget '
      + 'whose ovens they were.',
    forTag: 'player',
    trigger: safeTrigger('ev5_petronius', (ctx) =>
      !!(ctx.game.firedEvents && ctx.game.firedEvents.ev5_famine)
      && (ctx.game.date.y > -25 || (ctx.game.date.y === -25 && ctx.game.date.m >= 10))
      && alive(ctx, ctx.game.playerTag)),
    aiOption: 0,
    options: [
      {
        label: 'Corn, seed, and wool for winter',
        tooltip: '−80 talents. The fields are resown and the flocks reclothed: +6% income and +8% manpower for 12 months, +5 legitimacy.',
        effects: guard('ev5_petronius:0', (ctx) => {
          const me = ctx.game.playerTag;
          if (!alive(ctx, me)) return;
          ctx.helpers.adjust(ctx, me, { treasury: -80, legitimacy: 5 });
          ctx.helpers.addTagModifier(ctx, me, {
            id: 'seed_and_wool', name: 'Seed Corn and Winter Wool', months: 12,
            effects: { incomeMult: 1.06, manpowerMult: 1.08 },
          });
        }),
      },
      {
        label: 'Corn only — count the change',
        tooltip: '−30 talents. The hungry are fed and the accounts stay tidy: −0.5 unrest everywhere for 6 months, +5 governance points. The spring fields fend for themselves.',
        effects: guard('ev5_petronius:1', (ctx) => {
          const me = ctx.game.playerTag;
          if (!alive(ctx, me)) return;
          ctx.helpers.adjust(ctx, me, { treasury: -30, gov: 5 });
          ctx.helpers.addTagModifier(ctx, me, {
            id: 'corn_alone', name: 'The Grain Dole', months: 6,
            effects: { unrestAll: -0.5 },
          });
        }),
      },
    ],
  },

  // ── 14: Strato's Tower becomes Caesarea ───────────────────────────────────
  {
    id: 'ev5_caesarea_start',
    title: 'A Harbor Where None Was',
    worldLabel: 'Herod begins the works at Caesarea',
    desc: 'Strato\'s Tower is a fishing anchorage on a harborless coast, and Herod has '
      + 'decided it will be the greatest port between Alexandria and Piraeus. The '
      + 'engineers propose the impossible in the flat voice engineers use for it: '
      + 'blocks of stone fifty feet long, sunk in twenty fathoms of open sea, until a '
      + 'breakwater stands where there was only weather. Twelve years, they say. A '
      + 'city on the grid behind it, a theater facing the sea, and the whole of it '
      + 'named for Caesar.',
    forTag: 'HER',
    date: { y: -24, m: 5 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Sink the stones in twenty fathoms',
        tooltip: '−200 talents to open the works; +10 governance points. Twelve years of wages: −1 unrest at Caesarea while the works run. The full harbor Sebastos will be dedicated around 10 BCE.',
        effects: guard('ev5_caesarea_start:0', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.setFlag(ctx, 'caesareaWorks', true);
          ctx.helpers.adjust(ctx, 'HER', { treasury: -200, gov: 10 });
          if (ctx.helpers.controls(ctx, 'HER', 'Caesarea Maritima')) {
            ctx.helpers.addProvinceModifier(ctx, 'Caesarea Maritima', {
              id: 'harbor_works', name: 'The Works of Caesarea', months: 168,
              effects: { unrest: -1 },
            });
          }
          ctx.helpers.chronicle(ctx, 'era', 'At Strato\'s Tower the divers begin sinking stones into open sea: Caesarea is begun.');
        }),
      },
      {
        label: 'A modest anchorage will serve',
        tooltip: '−80 talents; +0.5 fewer unrest at Caesarea for 6 years of smaller works. Cheaper — but the dedication, when it comes, will crown a lesser harbor.',
        effects: guard('ev5_caesarea_start:1', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.adjust(ctx, 'HER', { treasury: -80 });
          if (ctx.helpers.controls(ctx, 'HER', 'Caesarea Maritima')) {
            ctx.helpers.addProvinceModifier(ctx, 'Caesarea Maritima', {
              id: 'harbor_works', name: 'The Lesser Works', months: 72,
              effects: { unrest: -0.5 },
            });
          }
        }),
      },
    ],
  },

  // ── 15: the palace, and the brigand-lands ─────────────────────────────────
  {
    id: 'ev5_tetrarchies',
    title: 'The Lands Beyond Jordan',
    desc: 'Augustus has a problem shaped like a gift: Trachonitis, Batanaea and '
      + 'Auranitis — cave country, brigand country, land that pays no tax because '
      + 'no collector comes back from it. He offers it to Herod, who alone of the '
      + 'client kings treats banditry as an engineering problem. Meanwhile in '
      + 'Jerusalem\'s upper city the masons wait to begin the royal palace: two wings, '
      + 'to be named Caesareum and Agrippium — flattery in load-bearing form.',
    forTag: 'HER',
    date: { y: -23, m: 4 },
    aiOption: 0,
    options: [
      {
        label: 'Clear the brigand-lands for Caesar',
        tooltip: '−60 talents of columns and cavalry sweeps; Batanea joins the kingdom if Rome holds it; +10 martial points; Rome\'s opinion +20. The palace waits a season.',
        effects: guard('ev5_tetrarchies:0', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.adjust(ctx, 'HER', { treasury: -60, mar: 10 });
          const p = ctx.prov('Batanea');
          if (alive(ctx, 'ROM') && p && p.owner === 'ROM') {
            ctx.helpers.changeOwner(ctx, 'Batanea', 'HER');
            ctx.helpers.notify(ctx, {
              title: 'The kingdom grows',
              text: 'Augustus adds the brigand-lands beyond Jordan to Herod\'s realm.',
              type: 'good', provName: 'Batanea',
            });
          }
          const rom = ctx.game.tags.ROM;
          if (rom) {
            if (!rom.opinion) rom.opinion = {};
            rom.opinion.HER = Math.min(200, (rom.opinion.HER || 0) + 20);
          }
        }),
      },
      {
        label: 'The palace first — the caves can wait',
        tooltip: '−100 talents. Jerusalem gains the upper-city palace: permanently +10% tax; +5 legitimacy. The brigand-lands stay Rome\'s problem, and Rome remembers being told so.',
        effects: guard('ev5_tetrarchies:1', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.adjust(ctx, 'HER', { treasury: -100, legitimacy: 5 });
          if (ctx.helpers.controls(ctx, 'HER', 'Jerusalem')) {
            ctx.helpers.addProvinceModifier(ctx, 'Jerusalem', {
              id: 'upper_city_palace', name: 'The Palace of the Upper City', months: -1,
              effects: { taxMult: 1.1 },
            });
          }
          const rom = ctx.game.tags.ROM;
          if (rom) {
            if (!rom.opinion) rom.opinion = {};
            rom.opinion.HER = Math.max(-200, (rom.opinion.HER || 0) - 10);
          }
        }),
      },
    ],
  },

  // ── 16: Augustus in Syria ─────────────────────────────────────────────────
  {
    id: 'ev5_zenodorus',
    title: 'Augustus in Syria',
    desc: 'The emperor comes east to settle the province in person, and the client '
      + 'kings assemble like schoolboys at inspection. Zenodorus — the tetrarch who '
      + 'rented out his own territory to bandits and took a percentage — has died of a '
      + 'burst intestine at Antioch, leaving his lands conveniently vacant. Augustus '
      + 'walks Herod through Syria at his side, and gives him Panion, the grotto '
      + 'country under Hermon where the Jordan rises.',
    forTag: 'both',
    date: { y: -20, m: 4 },
    aiOption: 0,
    options: [
      {
        label: 'The grotto country joins the kingdom',
        tooltip: 'Panion joins Herod\'s realm if Rome holds it; +5 legitimacy; Rome\'s opinion +20. The kingdom now runs from the desert to the springs of Jordan.',
        effects: guard('ev5_zenodorus:0', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.adjust(ctx, 'HER', { legitimacy: 5 });
          const p = ctx.prov('Caesarea Philippi');
          if (alive(ctx, 'ROM') && p && p.owner === 'ROM') {
            ctx.helpers.changeOwner(ctx, 'Caesarea Philippi', 'HER');
          }
          const rom = ctx.game.tags.ROM;
          if (rom) {
            if (!rom.opinion) rom.opinion = {};
            rom.opinion.HER = Math.min(200, (rom.opinion.HER || 0) + 20);
          }
          ctx.helpers.chronicle(ctx, 'era', 'Augustus tours Syria with Herod at his side and adds Zenodorus\' lands to the kingdom.');
        }),
      },
      {
        label: 'A temple at Panion, in white marble',
        tooltip: 'Panion joins the realm if Rome holds it, and gains a temple to Augustus: −80 talents; Rome\'s opinion +40; the Sanhedrin −6 approval. Gratitude, in load-bearing form.',
        effects: guard('ev5_zenodorus:1', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.adjust(ctx, 'HER', { treasury: -80 });
          const p = ctx.prov('Caesarea Philippi');
          if (alive(ctx, 'ROM') && p && p.owner === 'ROM') {
            ctx.helpers.changeOwner(ctx, 'Caesarea Philippi', 'HER');
          }
          const rom = ctx.game.tags.ROM;
          if (rom) {
            if (!rom.opinion) rom.opinion = {};
            rom.opinion.HER = Math.min(200, (rom.opinion.HER || 0) + 40);
          }
          ctx.helpers.factionShift(ctx, 'HER', 'sanhedrin', -6);
        }),
      },
    ],
  },

  // ── 17: the Temple ────────────────────────────────────────────────────────
  {
    id: 'ev5_temple',
    title: 'The Temple Shall Be Rebuilt',
    worldLabel: 'Herod announces the rebuilding of the Temple',
    desc: 'In the Temple court the king announces the unthinkable: Zerubbabel\'s '
      + 'modest sanctuary will come down, and in its place will rise a house vaster '
      + 'than Solomon\'s — the platform doubled, porticoes on a scale no Greek city '
      + 'can match. The crowd\'s first reaction is terror: a king who demolishes the '
      + 'Temple may not rebuild it. So Herod stages the answer first: a thousand '
      + 'priests trained as masons and carpenters, so no profane hand ever touches '
      + 'the sanctuary, and every stone stockpiled before the first one is moved.',
    forTag: 'HER',
    date: { y: -20, m: 11 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Vaster than Solomon\'s',
        tooltip: '−300 talents, and the works run for a generation: Jerusalem −1 unrest and +10% tax while pilgrims and wages flow. +10 legitimacy; the Sanhedrin +15 approval.',
        effects: guard('ev5_temple:0', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.setFlag(ctx, 'templeBegun', true);
          ctx.helpers.adjust(ctx, 'HER', { treasury: -300, legitimacy: 10 });
          if (ctx.helpers.controls(ctx, 'HER', 'Jerusalem')) {
            ctx.helpers.addProvinceModifier(ctx, 'Jerusalem', {
              id: 'temple_rising', name: 'The Temple Rising', months: 216,
              effects: { unrest: -1, taxMult: 1.1 },
            });
          }
          ctx.helpers.factionShift(ctx, 'HER', 'sanhedrin', 15);
          ctx.helpers.chronicle(ctx, 'era', 'Herod announces the rebuilding of the Temple: a thousand priests take up the mason\'s hammer.');
        }),
      },
      {
        label: 'Repair and gild — spare the treasury',
        tooltip: '−100 talents. Zerubbabel\'s house is restored, not replaced: Jerusalem −0.5 unrest for 5 years; +5 legitimacy; the Sanhedrin +5 approval. No one will ever say they have seen a beautiful thing.',
        effects: guard('ev5_temple:1', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.adjust(ctx, 'HER', { treasury: -100, legitimacy: 5 });
          if (ctx.helpers.controls(ctx, 'HER', 'Jerusalem')) {
            ctx.helpers.addProvinceModifier(ctx, 'Jerusalem', {
              id: 'temple_regilded', name: 'The Temple Regilded', months: 60,
              effects: { unrest: -0.5 },
            });
          }
          ctx.helpers.factionShift(ctx, 'HER', 'sanhedrin', 5);
        }),
      },
    ],
  },

  // ── 17b: the sanctuary stands ─────────────────────────────────────────────
  {
    id: 'ev5_sanctuary',
    title: 'The Sanctuary in Eighteen Months',
    desc: 'The priest-masons finish the sanctuary itself in a year and a half — white '
      + 'stone and gold plate, so bright at sunrise that men look away — and the story '
      + 'runs that in all that time it rained only at night, so the work never stopped. '
      + 'The courts and porticoes will take a lifetime more; the outer works will '
      + 'still be building when the kingdom that ordered them is gone. In the days of '
      + 'the rabbis men will say: he who has not seen Herod\'s building has never '
      + 'seen a beautiful thing.',
    forTag: 'HER',
    trigger: safeTrigger('ev5_sanctuary', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'templeBegun')
      && (ctx.game.date.y > -18 || (ctx.game.date.y === -18 && ctx.game.date.m >= 6))
      && alive(ctx, 'HER')),
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'A feast of dedication for the city',
        tooltip: '−60 talents; +10 legitimacy; the Sanhedrin +10 approval; −1 unrest everywhere for 6 months. Three hundred oxen for the altar, and no one counts the king\'s old sins today.',
        effects: guard('ev5_sanctuary:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'HER', { treasury: -60, legitimacy: 10 });
          ctx.helpers.factionShift(ctx, 'HER', 'sanhedrin', 10);
          ctx.helpers.addTagModifier(ctx, 'HER', {
            id: 'dedication_feast', name: 'The Feast of the Dedication', months: 6,
            effects: { unrestAll: -1 },
          });
          ctx.helpers.chronicle(ctx, 'era', 'The sanctuary stands, raised in eighteen months by priests with masons\' hands; the city feasts.');
        }),
      },
      {
        label: 'No feast — back to the porticoes',
        tooltip: '+10 governance points; the Sanhedrin +5 approval. The scaffolding never comes down; neither does the payroll, and the payroll is the point.',
        effects: guard('ev5_sanctuary:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'HER', { gov: 10 });
          ctx.helpers.factionShift(ctx, 'HER', 'sanhedrin', 5);
        }),
      },
    ],
  },

  // ── 18: Agrippa in Judaea ─────────────────────────────────────────────────
  {
    id: 'ev5_agrippa',
    title: 'Agrippa Comes to Jerusalem',
    desc: 'Marcus Agrippa — Augustus\' general, son-in-law, and other half — comes to '
      + 'Judaea as a guest and does everything right: a hecatomb of a hundred oxen at '
      + 'the Temple altar, no image carried past the gates, a feast for the whole city. '
      + 'Jerusalem, which reserves judgment on kings, decides it likes this Roman. '
      + 'Herod glows like a man showing his two families to each other. Next season '
      + 'there is talk of sailing with him to the Black Sea, where the fleet has '
      + 'business and a king who owns twenty ships would be welcome.',
    forTag: 'HER',
    date: { y: -14, m: 5 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'A hecatomb and a feasted city',
        tooltip: '−80 talents for the feast; +10 legitimacy, +10 influence points; the Sanhedrin +8 approval; Rome\'s opinion +30.',
        effects: guard('ev5_agrippa:0', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.adjust(ctx, 'HER', { treasury: -80, legitimacy: 10, infl: 10 });
          ctx.helpers.factionShift(ctx, 'HER', 'sanhedrin', 8);
          const rom = ctx.game.tags.ROM;
          if (rom) {
            if (!rom.opinion) rom.opinion = {};
            rom.opinion.HER = Math.min(200, (rom.opinion.HER || 0) + 30);
          }
          ctx.helpers.chronicle(ctx, 'era', 'Agrippa sacrifices a hecatomb in the Temple and feasts the people; Jerusalem cheers a Roman.');
        }),
      },
      {
        label: 'Sail with him to the Black Sea',
        tooltip: '−60 talents; +20 influence points, +5 martial points; Rome\'s opinion +40 — but the king abroad: +0.5 unrest everywhere for 6 months.',
        effects: guard('ev5_agrippa:1', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.adjust(ctx, 'HER', { treasury: -60, infl: 20, mar: 5 });
          const rom = ctx.game.tags.ROM;
          if (rom) {
            if (!rom.opinion) rom.opinion = {};
            rom.opinion.HER = Math.min(200, (rom.opinion.HER || 0) + 40);
          }
          ctx.helpers.addTagModifier(ctx, 'HER', {
            id: 'king_abroad', name: 'The King on the Euxine', months: 6,
            effects: { unrestAll: 0.5 },
          });
        }),
      },
    ],
  },

  // ── 18b: the rights of the diaspora ───────────────────────────────────────
  {
    id: 'ev5_ionia',
    title: 'The Pleading at Ionia',
    desc: 'The Greek cities of Ionia have been dragging their Jews into court on the '
      + 'sabbath, taxing the Temple contributions, conscripting men the Law exempts. '
      + 'Before Agrippa\'s tribunal, Herod\'s minister Nicolaus of Damascus argues the '
      + 'diaspora\'s case like a paid professional, because he is one — and wins. The '
      + 'edicts go out under Roman seal: the sabbath protected, the Temple tax '
      + 'inviolate, from Asia to Cyrene. A king of Judaea has just become something '
      + 'larger: the patron of every Jew in the world.',
    forTag: 'HER',
    trigger: safeTrigger('ev5_ionia', (ctx) =>
      !!(ctx.game.firedEvents && ctx.game.firedEvents.ev5_agrippa)
      && (ctx.game.date.y > -14 || (ctx.game.date.y === -14 && ctx.game.date.m >= 11))
      && alive(ctx, 'HER')),
    aiOption: 0,
    options: [
      {
        label: 'The edicts, read aloud in every agora',
        tooltip: 'The Temple tax flows unmolested: +5% income for 10 years; +10 influence points, +5 legitimacy.',
        effects: guard('ev5_ionia:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'HER', { infl: 10, legitimacy: 5 });
          ctx.helpers.addTagModifier(ctx, 'HER', {
            id: 'diaspora_edicts', name: 'The Edicts of Agrippa', months: 120,
            effects: { incomeMult: 1.05 },
          });
          ctx.helpers.chronicle(ctx, 'era', 'Roman edicts protect the sabbath and the Temple tax across the diaspora: Herod is patron of every Jew in the world.');
        }),
      },
      {
        label: 'Press further — citizenship itself',
        tooltip: '−50 talents of advocacy; +20 influence points. The greater ask sours the hearing: the edicts are confirmed but narrowly, and no income follows.',
        effects: guard('ev5_ionia:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'HER', { treasury: -50, infl: 20 });
        }),
      },
    ],
  },

  // ── 19: the house begins to eat itself ────────────────────────────────────
  {
    id: 'ev5_sons_accused',
    title: 'The Sons of Mariamne',
    desc: 'Alexander and Aristobulus have come home from their Roman education: tall, '
      + 'Hasmonean on their dead mother\'s side, adored in the street — and loathed by '
      + 'Antipater, the firstborn of the repudiated first wife, who has spent the '
      + 'years learning what whispers cost and where to buy them. Now the whispers '
      + 'reach the king: the boys talk of vengeance for their mother. Augustus, at '
      + 'Aquileia, has offered to hear the family himself.',
    forTag: 'HER',
    date: { y: -12, m: 6 },
    aiOption: 0,
    options: [
      {
        label: 'Sail to Augustus, all three of you',
        tooltip: '−60 talents of travel and gifts; the emperor reconciles father and sons: +1 stability, the House of Antipater +8 approval. For now.',
        effects: guard('ev5_sons_accused:0', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.setFlag(ctx, 'aquileiaPeace', true);
          ctx.helpers.adjust(ctx, 'HER', { treasury: -60, stability: 1 });
          ctx.helpers.factionShift(ctx, 'HER', 'kin', 8);
          ctx.helpers.chronicle(ctx, 'era', 'At Aquileia Augustus reconciles Herod and the sons of Mariamne; the family sails home smiling.');
        }),
      },
      {
        label: 'Let Antipater manage the court',
        tooltip: '+10 governance points — the firstborn is efficient. The House of Antipater −10 approval, and the whispers institutionalize: +0.25 unrest everywhere for 36 months.',
        effects: guard('ev5_sons_accused:1', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.adjust(ctx, 'HER', { gov: 10 });
          ctx.helpers.factionShift(ctx, 'HER', 'kin', -10);
          ctx.helpers.addTagModifier(ctx, 'HER', {
            id: 'court_whispers', name: 'The Court of Whispers', months: 36,
            effects: { unrestAll: 0.25 },
          });
        }),
      },
    ],
  },

  // ── 20: the harbor Sebastos ───────────────────────────────────────────────
  {
    id: 'ev5_caesarea_done',
    title: 'Caesarea Dedicated',
    worldLabel: 'The harbor Sebastos is dedicated at Caesarea',
    desc: 'Twelve years after the first stones went down in twenty fathoms, the '
      + 'breakwater stands and ships ride inside it: the harbor Sebastos, larger than '
      + 'Piraeus, on a coast that had none. Behind it a city on the grid — theater '
      + 'facing the sea, amphitheater, aqueduct, a temple of Roma and Augustus '
      + 'visible far offshore. Herod dedicates it with games and proposes to repeat '
      + 'them every fifth year, forever, which is how a king says the word forever.',
    forTag: 'both',
    date: { y: -10, m: 9 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Games every fifth year',
        tooltip: '−100 talents for the games; +10 legitimacy; Rome\'s opinion +20. Caesarea becomes the kingdom\'s port: permanent tax and production bonus (larger if the full works were funded).',
        effects: guard('ev5_caesarea_done:0', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.adjust(ctx, 'HER', { treasury: -100, legitimacy: 10 });
          if (ctx.helpers.controls(ctx, 'HER', 'Caesarea Maritima')) {
            const full = !!ctx.helpers.getFlag(ctx, 'caesareaWorks');
            ctx.helpers.addProvinceModifier(ctx, 'Caesarea Maritima', {
              id: 'sebastos_harbor', name: full ? 'The Harbor Sebastos' : 'The Anchorage of Caesarea', months: -1,
              effects: full ? { taxMult: 1.2, prodMult: 1.2, unrest: -1 } : { taxMult: 1.1, prodMult: 1.1 },
            });
          }
          const rom = ctx.game.tags.ROM;
          if (rom) {
            if (!rom.opinion) rom.opinion = {};
            rom.opinion.HER = Math.min(200, (rom.opinion.HER || 0) + 20);
          }
          ctx.helpers.chronicle(ctx, 'era', 'Caesarea and the harbor Sebastos are dedicated with games: a port larger than Piraeus where there was only weather.');
        }),
      },
      {
        label: 'The harbor is spectacle enough',
        tooltip: 'No games: the harbor dues start the same afternoon (+50 talents). Caesarea gains the permanent harbor bonus; Rome\'s opinion unchanged, and the crowds go home unfed.',
        effects: guard('ev5_caesarea_done:1', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.adjust(ctx, 'HER', { treasury: 50 });
          if (ctx.helpers.controls(ctx, 'HER', 'Caesarea Maritima')) {
            const full = !!ctx.helpers.getFlag(ctx, 'caesareaWorks');
            ctx.helpers.addProvinceModifier(ctx, 'Caesarea Maritima', {
              id: 'sebastos_harbor', name: full ? 'The Harbor Sebastos' : 'The Anchorage of Caesarea', months: -1,
              effects: full ? { taxMult: 1.2, prodMult: 1.2, unrest: -1 } : { taxMult: 1.1, prodMult: 1.1 },
            });
          }
        }),
      },
    ],
  },

  // ── 21: the Nabataean blunder ─────────────────────────────────────────────
  {
    id: 'ev5_syllaeus',
    title: 'Syllaeus at Rome',
    desc: 'Herod\'s border war against the Nabataean raiders was legal to the letter — '
      + 'debts unpaid, raiders sheltered, the Syrian governor\'s permission in writing. '
      + 'But Syllaeus, the Nabataean minister, reaches Rome first and tells it his '
      + 'way: an old king invading a neighbor unprovoked. Augustus writes Herod the '
      + 'coldest sentence of the reign: that having long treated him as a friend, he '
      + 'will now treat him as a subject. No audience. No appeal, yet.',
    forTag: 'HER',
    date: { y: -9, m: 6 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Send Nicolaus to unsay it',
        tooltip: '−60 talents of embassy. The displeasure runs 12 months (−0.25 legitimacy a month) before Nicolaus exposes Syllaeus\' lies; Nabataea\'s opinion −20.',
        effects: guard('ev5_syllaeus:0', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.adjust(ctx, 'HER', { treasury: -60 });
          ctx.helpers.addTagModifier(ctx, 'HER', {
            id: 'augustus_displeasure', name: 'The Emperor\'s Displeasure', months: 12,
            effects: { legitimacyAdd: -0.25 },
          });
          const nab = ctx.game.tags.NAB;
          if (nab) {
            if (!nab.opinion) nab.opinion = {};
            nab.opinion.HER = Math.max(-200, (nab.opinion.HER || 0) - 20);
          }
          ctx.helpers.chronicle(ctx, 'era', 'Augustus writes that he has long treated Herod as a friend and will now treat him as a subject; Nicolaus sails to unsay it.');
        }),
      },
      {
        label: 'A subject, then — press the border war',
        tooltip: 'No embassy: +10 martial points against the raiders, but the displeasure runs 24 months (−0.25 legitimacy a month) and Nabataea\'s opinion −40.',
        effects: guard('ev5_syllaeus:1', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.adjust(ctx, 'HER', { mar: 10 });
          ctx.helpers.addTagModifier(ctx, 'HER', {
            id: 'augustus_displeasure', name: 'The Emperor\'s Displeasure', months: 24,
            effects: { legitimacyAdd: -0.25 },
          });
          const nab = ctx.game.tags.NAB;
          if (nab) {
            if (!nab.opinion) nab.opinion = {};
            nab.opinion.HER = Math.max(-200, (nab.opinion.HER || 0) - 40);
          }
        }),
      },
    ],
  },

  // ── 22: the trial at Berytus ──────────────────────────────────────────────
  {
    id: 'ev5_berytus',
    title: 'The Trial at Berytus',
    worldLabel: 'Herod tries the sons of Mariamne',
    desc: 'The reconciliation of Aquileia did not hold; nothing in this family holds. '
      + 'Antipater\'s evidence has widened with every torture session, and now, with '
      + 'Augustus\' weary permission, a court of Roman assessors convenes at Berytus '
      + 'to try Alexander and Aristobulus for designs on their father\'s life. The '
      + 'sons are not present. The verdict is not in doubt. The only question left '
      + 'to the king is what a father does with it.',
    forTag: 'HER',
    date: { y: -7, m: 4 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Strangled at Sebaste',
        tooltip: 'The sentence is carried out where their parents were married: −1 stability, −5 legitimacy, the House of Antipater −12 approval. Augustus\' joke travels the empire: better to be Herod\'s pig than his son.',
        effects: guard('ev5_berytus:0', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.setFlag(ctx, 'sonsExecuted', true);
          ctx.helpers.adjust(ctx, 'HER', { stability: -1, legitimacy: -5 });
          ctx.helpers.factionShift(ctx, 'HER', 'kin', -12);
          ctx.helpers.chronicle(ctx, 'fall', 'Alexander and Aristobulus are strangled at Sebaste, where their father married their mother. Augustus\' joke travels the empire: better to be Herod\'s pig than his son.');
        }),
      },
      {
        label: 'Prison at Sebaste — not the cord',
        tooltip: 'Mercy at the last step: +10 legitimacy, the House of Antipater +10 approval — but Antipater keeps working: +0.5 unrest everywhere for 36 months while two live claimants breathe.',
        effects: guard('ev5_berytus:1', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.adjust(ctx, 'HER', { legitimacy: 10 });
          ctx.helpers.factionShift(ctx, 'HER', 'kin', 10);
          ctx.helpers.addTagModifier(ctx, 'HER', {
            id: 'living_claimants', name: 'Two Living Claimants', months: 36,
            effects: { unrestAll: 0.5 },
          });
          ctx.helpers.chronicle(ctx, 'era', 'At the last step Herod sends the sons of Mariamne to prison, not the cord; the house holds its breath.');
        }),
      },
    ],
  },

  // ── 23: Antipater's turn ──────────────────────────────────────────────────
  {
    id: 'ev5_antipater',
    title: 'The Cup for Antipater',
    desc: 'The heir apparent has grown impatient with his father\'s dying, and bought '
      + 'poison to help it along. The plot unravels the way plots do — a widow\'s '
      + 'testimony, a freedman\'s panic — and the drug itself is produced in court and '
      + 'tested, in the Roman manner, on a condemned prisoner, who obliges everyone '
      + 'by dying at once. The old king, rotting alive at Jericho, signs with a '
      + 'steady hand. Antipater has five days to live; Herod, as it will turn out, '
      + 'has ten.',
    forTag: 'HER',
    date: { y: -5, m: 11 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The kingdom\'s last execution',
        tooltip: 'Antipater dies; his estates escheat: +80 talents, −1 stability. Archelaus becomes heir. The kingdom\'s heir apparent, the kingdom\'s last execution.',
        effects: guard('ev5_antipater:0', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.adjust(ctx, 'HER', { treasury: 80, stability: -1 });
          ctx.helpers.setHeir(ctx, 'HER', { name: 'Archelaus', gov: 1, infl: 2, mar: 1, age: 18 });
          ctx.helpers.chronicle(ctx, 'fall', 'Antipater is executed five days before his father\'s death: the kingdom\'s heir apparent, the kingdom\'s last execution.');
        }),
      },
      {
        label: 'Chains, and a letter to Augustus',
        tooltip: 'Send him to Rome for the emperor\'s verdict: −30 talents, +10 influence points. Archelaus becomes heir anyway — but the plotter breathes, and the court knows it: +0.5 unrest everywhere for 12 months.',
        effects: guard('ev5_antipater:1', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.adjust(ctx, 'HER', { treasury: -30, infl: 10 });
          ctx.helpers.setHeir(ctx, 'HER', { name: 'Archelaus', gov: 1, infl: 2, mar: 1, age: 18 });
          ctx.helpers.addTagModifier(ctx, 'HER', {
            id: 'plotter_breathes', name: 'The Plotter in Chains', months: 12,
            effects: { unrestAll: 0.5 },
          });
        }),
      },
    ],
  },

  // ── 24: the golden eagle ──────────────────────────────────────────────────
  {
    id: 'ev5_eagle',
    title: 'The Golden Eagle',
    desc: 'Over the great gate of the Temple hangs a golden eagle — Rome\'s bird, on '
      + 'the house where no image may be. When the rumor runs that the king is dead, '
      + 'the students of the teachers Judas and Matthias go up by rope in broad '
      + 'daylight and hack it down before a cheering crowd. The king is not dead. He '
      + 'has himself carried to the tribunal to pass sentence, and that night — the '
      + 'one night in Josephus a man can date — the moon goes into eclipse over '
      + 'Jericho.',
    forTag: 'HER',
    date: { y: -4, m: 2 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Burn the teachers alive',
        tooltip: 'The sentence of a dying king: −5 legitimacy, the Sanhedrin −15 approval, Jerusalem +2 unrest for 12 months. No one hacks at what is his while he breathes.',
        effects: guard('ev5_eagle:0', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.adjust(ctx, 'HER', { legitimacy: -5 });
          ctx.helpers.factionShift(ctx, 'HER', 'sanhedrin', -15);
          if (ctx.helpers.controls(ctx, 'HER', 'Jerusalem')) {
            ctx.helpers.addProvinceModifier(ctx, 'Jerusalem', {
              id: 'eagle_burnings', name: 'The Teachers Burned', months: 12,
              effects: { unrest: 2 },
            });
          }
          ctx.helpers.chronicle(ctx, 'fall', 'The golden eagle is hacked from the Temple gate; the teachers are burned alive; the moon goes into eclipse over Jericho.');
        }),
      },
      {
        label: 'Depose the high priest, spare the students',
        tooltip: 'The ringleaders alone answer for it: +5 legitimacy, the Sanhedrin +8 approval — but the eagle stays down, and Rome\'s opinion −20.',
        effects: guard('ev5_eagle:1', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.adjust(ctx, 'HER', { legitimacy: 5 });
          ctx.helpers.factionShift(ctx, 'HER', 'sanhedrin', 8);
          const rom = ctx.game.tags.ROM;
          if (rom) {
            if (!rom.opinion) rom.opinion = {};
            rom.opinion.HER = Math.max(-200, (rom.opinion.HER || 0) - 20);
          }
        }),
      },
    ],
  },

  // ── 25: the death of Herod ────────────────────────────────────────────────
  {
    id: 'ev5_herod_dies',
    title: 'The King Is Dead',
    worldLabel: 'Herod dies at Jericho',
    desc: 'Herod dies at Jericho in the spring, in an agony the physicians catalogue '
      + 'and cannot name, five days after Antipater and thirty-four years after the '
      + 'axe fell on the last Hasmonean. The testament — the sixth — divides the '
      + 'realm: Archelaus to rule Judaea as ethnarch, Antipas to hold Galilee and '
      + 'Peraea, Philip the northern wilds, all of it subject to Augustus\' pleasure. '
      + 'The funeral procession is a mile of purple and gold. The mourning, by most '
      + 'accounts, is shorter.',
    forTag: 'both',
    date: { y: -4, m: 3 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The testament stands',
        tooltip: 'Archelaus rules as Ethnarch (Antipas heir). The divided testament: −10% income and +0.5 unrest everywhere for 36 months as the tetrarchies pull apart.',
        effects: guard('ev5_herod_dies:0', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.setRuler(ctx, 'HER', { name: 'Archelaus', title: 'Ethnarch of Judaea', gov: 1, infl: 2, mar: 1, age: 19 });
          ctx.helpers.setHeir(ctx, 'HER', { name: 'Herod Antipas', gov: 2, infl: 3, mar: 2, age: 16 });
          ctx.helpers.addTagModifier(ctx, 'HER', {
            id: 'divided_testament', name: 'The Divided Testament', months: 36,
            effects: { incomeMult: 0.9, unrestAll: 0.5 },
          });
          ctx.helpers.chronicle(ctx, 'ruler', 'Herod dies at Jericho; by testament Archelaus takes Judaea as ethnarch, Antipas Galilee, Philip the north.');
        }),
      },
      {
        label: 'The army acclaims Antipas alone',
        tooltip: 'Overturn the testament: Antipas rules the whole realm undivided (−10 legitimacy, −1 stability for defying the dead king\'s seal — and Augustus\' arithmetic).',
        effects: guard('ev5_herod_dies:1', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.setRuler(ctx, 'HER', { name: 'Herod Antipas', title: 'King of the Jews', gov: 3, infl: 3, mar: 2, age: 16 });
          ctx.helpers.setHeir(ctx, 'HER', null);
          ctx.helpers.adjust(ctx, 'HER', { legitimacy: -10, stability: -1 });
          ctx.helpers.chronicle(ctx, 'ruler', 'The testament is set aside: the army acclaims Antipas over the whole undivided realm.');
        }),
      },
    ],
  },

  // ── 25b: the war of Varus ─────────────────────────────────────────────────
  {
    id: 'ev5_varus',
    title: 'The War of Varus',
    worldLabel: 'Judaea rises after Herod\'s death',
    desc: 'The dam breaks with the king dead: Archelaus opens his rule by killing '
      + 'three thousand pilgrims in the Temple courts at Passover, and the country '
      + 'answers in kind. Judas son of Hezekiah raises Galilee; Simon of Peraea burns '
      + 'the Jericho palace and wears a diadem; Athronges the shepherd holds the hills '
      + 'with four brothers and a crown of his own. Sabinus the procurator loots '
      + 'whatever is not on fire. It ends the way these things end: Varus comes down '
      + 'from Syria with the legions, Sepphoris burns, and two thousand men die on '
      + 'crosses before Jerusalem\'s walls.',
    forTag: 'both',
    date: { y: -4, m: 7 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Send for Varus and the legions',
        tooltip: 'Rome fields the Legions of Varus at Antioch. The realm bleeds: −2,000 manpower, −1 stability, +2 war exhaustion; Jerusalem, Sepphoris and Jericho +2 unrest for 12 months.',
        effects: guard('ev5_varus:0', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          if (alive(ctx, 'ROM')) {
            ctx.helpers.spawnArmy(ctx, 'ROM', 'Antioch', {
              inf: 5, cav: 1, name: 'Legions of Varus',
              general: { name: 'Publius Quinctilius Varus', fire: 2, shock: 2, maneuver: 2 },
            });
          }
          ctx.helpers.adjust(ctx, 'HER', { manpower: -2000, stability: -1, warExhaustion: 2 });
          const marks = [
            ['Jerusalem', 'varus_passover', 'The Passover Massacre'],
            ['Sepphoris', 'varus_sepphoris', 'Sepphoris Burned'],
            ['Jericho', 'varus_jericho', 'The Palace in Ashes'],
          ];
          for (const [prov, id, name] of marks) {
            if (ctx.prov(prov)) {
              ctx.helpers.addProvinceModifier(ctx, prov, {
                id, name, months: 12, effects: { unrest: 2 },
              });
            }
          }
          ctx.helpers.chronicle(ctx, 'war', 'The war of Varus: Sepphoris burns, and two thousand men die on crosses before Jerusalem\'s walls.');
        }),
      },
      {
        label: 'The ethnarch\'s own sword',
        tooltip: 'Put it down without Rome: −3,000 manpower, −100 talents, +10 martial points — and the wounds fester longer: the same three provinces +2 unrest for 18 months.',
        effects: guard('ev5_varus:1', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.adjust(ctx, 'HER', { manpower: -3000, treasury: -100, mar: 10 });
          const marks = [
            ['Jerusalem', 'varus_passover', 'The Passover Massacre'],
            ['Sepphoris', 'varus_sepphoris', 'Sepphoris Burned'],
            ['Jericho', 'varus_jericho', 'The Palace in Ashes'],
          ];
          for (const [prov, id, name] of marks) {
            if (ctx.prov(prov)) {
              ctx.helpers.addProvinceModifier(ctx, prov, {
                id, name, months: 18, effects: { unrest: 2 },
              });
            }
          }
          ctx.helpers.chronicle(ctx, 'war', 'The succession revolt is drowned by the ethnarch\'s own troops; the countryside remembers whose troops they were.');
        }),
      },
    ],
  },

  // ── 26: Judaea a Roman province ───────────────────────────────────────────
  {
    id: 'ev5_provincia',
    title: 'Provincia Iudaea',
    worldLabel: 'Archelaus deposed; Judaea becomes a Roman province',
    desc: 'Ten years of Archelaus have achieved the impossible: a joint embassy of '
      + 'Jews and Samaritans, agreeing on one thing, which is him. Augustus hears '
      + 'them, strips the ethnarch, and ships him to Vienne in Gaul — the empire\'s '
      + 'polite oubliette. There will be no third Herod in Jerusalem: Judaea passes '
      + 'under direct rule, a minor province governed by a prefect of the equestrian '
      + 'order from Caesarea, the vestments of the high priest locked in the Antonia '
      + 'between feasts. Rome will appoint the high priests now, and unmake them at '
      + 'pleasure.',
    forTag: 'both',
    date: { y: 6, m: 6 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'A prefect from Caesarea',
        tooltip: 'Coponius governs as Prefect of Judaea: −20 legitimacy (a foreign hand on the vestments), +1 stability — Roman order is at least order. Rome\'s peace: −0.5 unrest everywhere for 10 years.',
        effects: guard('ev5_provincia:0', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          if (!alive(ctx, 'ROM')) {
            // No Rome to annex anyone: the ethnarchy stumbles on alone.
            ctx.helpers.adjust(ctx, 'HER', { stability: -1 });
            ctx.helpers.chronicle(ctx, 'era', 'With no Rome left to depose him, Archelaus keeps his diminished throne — alternate history keeps its own counsel.');
            return;
          }
          ctx.helpers.setRuler(ctx, 'HER', { name: 'Coponius', title: 'Prefect of Judaea', gov: 2, infl: 1, mar: 2, age: 40 });
          ctx.helpers.setHeir(ctx, 'HER', null);
          ctx.helpers.adjust(ctx, 'HER', { legitimacy: -20, stability: 1 });
          ctx.helpers.addTagModifier(ctx, 'HER', {
            id: 'provincia_iudaea', name: 'Provincia Iudaea', months: 120,
            effects: { unrestAll: -0.5 },
          });
          ctx.helpers.chronicle(ctx, 'era', 'Archelaus is deposed to Vienne in Gaul; Judaea becomes a Roman province under a prefect of the equestrian order.');
        }),
      },
      {
        label: 'Beg the emperor for Antipas instead',
        tooltip: '−100 talents of embassy and gifts: a Herodian keeps the throne (Antipas rules, +10 legitimacy) — but Rome\'s opinion −30, and no Roman peace follows.',
        effects: guard('ev5_provincia:1', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.adjust(ctx, 'HER', { treasury: -100, legitimacy: 10 });
          ctx.helpers.setRuler(ctx, 'HER', { name: 'Herod Antipas', title: 'Ethnarch of Judaea', gov: 3, infl: 3, mar: 2, age: 26 });
          const rom = ctx.game.tags.ROM;
          if (rom) {
            if (!rom.opinion) rom.opinion = {};
            rom.opinion.HER = Math.max(-200, (rom.opinion.HER || 0) - 30);
          }
          ctx.helpers.chronicle(ctx, 'era', 'Gold and pleading keep a Herodian in Jerusalem: Antipas takes the ethnarchy his brother lost.');
        }),
      },
    ],
  },

  // ── 27: the census, and the fourth philosophy ─────────────────────────────
  {
    id: 'ev5_census',
    title: 'The Census of Quirinius',
    worldLabel: 'The census of Quirinius; the fourth philosophy is born',
    desc: 'Quirinius, legate of Syria, orders what every new province gets: a census, '
      + 'so that Rome may know what it owns. Property is declared, valued, registered '
      + '— and in Galilee a teacher named Judas begins to preach that the registration '
      + 'itself is slavery, that God alone is master, and that a man who writes his '
      + 'field into a Roman ledger has written himself out of the covenant. The high '
      + 'priest talks most of the country into compliance. The rest become something '
      + 'new — a fourth philosophy beside the three old schools — and its harvest is '
      + 'sixty years off.',
    forTag: 'both',
    date: { y: 6, m: 10 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The assessment proceeds',
        tooltip: 'Rome counts everything: +120 talents of assessed revenue — and the fourth philosophy takes root: +0.5 unrest everywhere, permanently. Sixty years from now, this bill comes due.',
        effects: guard('ev5_census:0', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.setFlag(ctx, 'fourthPhilosophy', true);
          ctx.helpers.adjust(ctx, 'HER', { treasury: 120 });
          ctx.helpers.addTagModifier(ctx, 'HER', {
            id: 'fourth_philosophy', name: 'The Fourth Philosophy', months: -1,
            effects: { unrestAll: 0.5 },
          });
          ctx.helpers.chronicle(ctx, 'era', 'The census of Quirinius registers Judaea into the Roman ledger; Judas the Galilean preaches no master but God. The fourth philosophy is born, and its harvest is sixty years off.');
        }),
      },
      {
        label: 'Register gently, assess lightly',
        tooltip: 'The high priest\'s compromise: only +40 talents assessed, the Sanhedrin +8 approval — and the new zeal finds thinner soil: +0.25 unrest everywhere, permanently.',
        effects: guard('ev5_census:1', (ctx) => {
          if (!alive(ctx, 'HER')) return;
          ctx.helpers.setFlag(ctx, 'fourthPhilosophy', true);
          ctx.helpers.adjust(ctx, 'HER', { treasury: 40 });
          ctx.helpers.factionShift(ctx, 'HER', 'sanhedrin', 8);
          ctx.helpers.addTagModifier(ctx, 'HER', {
            id: 'fourth_philosophy', name: 'The Fourth Philosophy', months: -1,
            effects: { unrestAll: 0.25 },
          });
          ctx.helpers.chronicle(ctx, 'era', 'The census passes gently under the high priest\'s hand — but in Galilee the fourth philosophy is preached all the same.');
        }),
      },
    ],
  },
];
