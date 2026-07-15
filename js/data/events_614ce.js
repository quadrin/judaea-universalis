// Judaea Universalis — event chain: The Persian Gambit, 614–629 CE.
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
// Source spine: the Chronicon Paschale; Sebeos; Antiochus Strategos on the fall
// of Jerusalem; Theophanes on the counteroffensive; the piyyutim of the brief
// Return. Dates map to the real chronology (30-day game months).

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_614ce] ' + key, e || '');
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

function findWar(game, a, b) {
  for (const w of (game && game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(a) !== -1 && all.indexOf(b) !== -1) return w;
  }
  return null;
}

function addWarscore(ctx, war, tag, amount) {
  try {
    if (!war) return;
    if (!war.eventScore) war.eventScore = { att: 0, def: 0 };
    const side = (war.attackers || []).indexOf(tag) >= 0 ? 'att'
      : (war.defenders || []).indexOf(tag) >= 0 ? 'def' : null;
    if (side) war.eventScore[side] += amount;
  } catch (e) { warnOnce('addWarscore', e); }
}

export const EVENTS_614 = [
  // ── 1 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_jerusalem_falls',
    title: 'The Holy City Falls',
    desc: 'After a twenty-day siege the wall is mined, and for the first time since '
      + 'Pompey the city belongs to neither Rome nor its God\'s newer church. The True '
      + 'Cross is carried east as a trophy of the fire temples; the Jewish fighters who '
      + 'stormed the breach are given — for now — the governance of Jerusalem.',
    forTag: 'both',
    trigger: safeTrigger('ev_p_jerusalem', (ctx) =>
      dateGE(ctx, 614, 6)
      && (ctx.game.playerTag !== 'BYZ'
        || ctx.helpers.controls(ctx, 'JUD', 'Jerusalem')
        || ctx.helpers.controls(ctx, 'SAS', 'Jerusalem'))),
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'After five hundred years',
        tooltip: 'Jerusalem passes to the Return (owner) with a garrison. Byzantium: −15 legitimacy. Persia: +100 talents of relics and ransom.',
        effects: guard('ev_p_jerusalem:0', (ctx) => {
          ctx.helpers.changeOwner(ctx, 'Jerusalem', 'JUD');
          ctx.helpers.spawnArmy(ctx, 'JUD', 'Jerusalem', { inf: 3, name: 'Guard of the Return' });
          ctx.helpers.adjust(ctx, 'BYZ', { legitimacy: -15 });
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 15 });
          ctx.helpers.adjust(ctx, 'SAS', { treasury: 100 });
          ctx.helpers.chronicle(ctx, 'war', 'Jerusalem falls to Shahrbaraz and the fighters of the Return; the True Cross goes east to Ctesiphon.');
        }),
      },
    ],
  },

  // ── 1b ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_benjamin',
    title: 'Benjamin of Tiberias',
    desc: 'The richest Jew in Galilee opens his strongrooms: Benjamin of Tiberias '
      + 'arms and pays the men of Tiberias, Nazareth and the hill villages, and '
      + 'marches with them himself. He is buying, with his own silver, the thing his '
      + 'grandfathers only prayed for — a Jewish army on the road to Jerusalem.',
    forTag: 'both',
    date: { y: 614, m: 8 },
    aiOption: 0,
    options: [
      {
        label: 'The strongrooms open',
        tooltip: 'The Return: +100 talents, +1,500 manpower; the Fighters of the Return +8 approval.',
        effects: guard('ev_p_benjamin:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { treasury: 100, manpower: 1500 });
          ctx.helpers.factionShift(ctx, 'JUD', 'fighters', 8);
        }),
      },
    ],
  },

  // ── 1c ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_reckoning',
    title: 'The Reckoning in the City',
    desc: 'The city has fallen and the score-settling begins: churches fired, captives '
      + 'herded by the Mamilla pool, and men on both sides of a five-century grudge '
      + 'deciding what victory permits. The chroniclers who hate you will write down '
      + 'everything. What they write is, for one week, yours to choose.',
    forTag: 'JUD',
    trigger: safeTrigger('ev_p_reckoning', (ctx) =>
      !!(ctx.game.firedEvents && ctx.game.firedEvents.ev_p_jerusalem_falls)
      && ctx.helpers.controls(ctx, 'JUD', 'Jerusalem')),
    aiOption: 0,
    options: [
      {
        label: 'Stay the hand — ransom the captives',
        tooltip: '−80 talents; +10 legitimacy, Jerusalem −1 unrest for 12 months, and the Exilarch\'s House +8 approval.',
        effects: guard('ev_p_reckoning:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { treasury: -80, legitimacy: 10 });
          ctx.helpers.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'hand_stayed', name: 'The Hand Stayed', months: 12, effects: { unrest: -1 },
          });
          ctx.helpers.factionShift(ctx, 'JUD', 'exilarch', 8);
          ctx.helpers.chronicle(ctx, 'era', 'The Return stays the hand: captives ransomed at Mamilla, the score left unsettled.');
        }),
      },
      {
        label: 'Let the week run',
        tooltip: '+15 martial points; −10 legitimacy, Jerusalem +2 unrest for 24 months — and the chroniclers write everything.',
        effects: guard('ev_p_reckoning:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { mar: 15, legitimacy: -10 });
          ctx.helpers.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'week_ran', name: 'The Reckoning Remembered', months: 24, effects: { unrest: 2 },
          });
          ctx.helpers.chronicle(ctx, 'war', 'The reckoning runs its week in Jerusalem; Antiochus Strategos sharpens his pen.');
        }),
      },
    ],
  },

  // ── 1d ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_zacharias',
    title: 'The Patriarch Goes East',
    desc: 'Patriarch Zacharias walks into captivity beside the reliquary of the True '
      + 'Cross, and the Christian East walks with him in spirit: the lamentation '
      + 'literature begins before the column clears the Mount of Olives. Ctesiphon '
      + 'gains a hostage worth more than a province; Constantinople gains a grievance '
      + 'worth more than an army.',
    forTag: 'both',
    date: { y: 614, m: 9 },
    aiOption: 0,
    options: [
      {
        label: 'The Cross goes to Ctesiphon',
        tooltip: 'Persia: +50 talents of ransom traffic. Byzantium: −5 legitimacy now — and a cause that will pay for twenty years of war.',
        effects: guard('ev_p_zacharias:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'SAS', { treasury: 50 });
          ctx.helpers.adjust(ctx, 'BYZ', { legitimacy: -5 });
          ctx.helpers.chronicle(ctx, 'era', 'Zacharias and the True Cross go east in the Persian baggage train.');
        }),
      },
    ],
  },

  // ── 1e ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_piyyut',
    title: '"On That Day"',
    desc: 'In the synagogues the poets are already at work: piyyutim that read the '
      + 'Persian war as the birth-pangs of the end — the wicked kingdom fallen, the '
      + 'ingathering begun, the House about to descend rebuilt from heaven. The '
      + 'congregations sing them and weep. Messianic time is a fire: it warms the '
      + 'fighters, and it burns the patient.',
    forTag: 'JUD',
    trigger: safeTrigger('ev_p_piyyut', (ctx) =>
      dateGE(ctx, 615, 1) && ctx.helpers.controls(ctx, 'JUD', 'Jerusalem')),
    aiOption: 1,
    options: [
      {
        label: 'Proclaim the hour',
        tooltip: '+10 legitimacy; the Priests of the Mount +10 approval. The hour, once proclaimed, must arrive.',
        effects: guard('ev_p_piyyut:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 10 });
          ctx.helpers.factionShift(ctx, 'JUD', 'priests', 10);
        }),
      },
      {
        label: 'Counsel patience from the pulpits',
        tooltip: '+1 stability; the Exilarch\'s House +8 approval — Babylon has outlived four messianic hours.',
        effects: guard('ev_p_piyyut:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { stability: 1 });
          ctx.helpers.factionShift(ctx, 'JUD', 'exilarch', 8);
        }),
      },
    ],
  },

  // ── 2 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_governance',
    title: 'Governing the Ungovernable City',
    desc: 'Nehemiah ben Hushiel holds the city that every faith on earth claims. The '
      + 'community expects the altar restored on the Mount; the Christian majority of '
      + 'the countryside expects the sky to fall on whoever tries.',
    forTag: 'JUD',
    trigger: safeTrigger('ev_p_governance', (ctx) =>
      dateGE(ctx, 614, 8) && ctx.helpers.controls(ctx, 'JUD', 'Jerusalem')),
    aiOption: 1,
    options: [
      {
        label: 'Restore the sacrifice',
        tooltip: 'Judaea: +12 legitimacy. Every Christian province we hold: +2 unrest for 24 months.',
        effects: guard('ev_p_gov:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 12 });
          const g = ctx.game;
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.owner !== 'JUD' || p.religion !== 'christianity') continue;
            ctx.helpers.addProvinceModifier(ctx, p.name, {
              id: 'altar_restored', name: 'The Altar Restored', months: 24, effects: { unrest: 2 },
            });
          }
        }),
      },
      {
        label: 'A city held gently',
        tooltip: 'Jerusalem: −1 unrest for 24 months. Judaea: +4 legitimacy.',
        effects: guard('ev_p_gov:1', (ctx) => {
          ctx.helpers.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'held_gently', name: 'A City Held Gently', months: 24, effects: { unrest: -1 },
          });
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 4 });
        }),
      },
    ],
  },

  // ── 3 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_khosrow_letter',
    title: '"Khosrow, Greatest of Gods"',
    desc: 'The Senate\'s peace embassy returns with the King of Kings\' reply, addressed '
      + 'from "Khosrow, greatest of gods, master of the earth" to "Heraclius, his vile '
      + 'and insensate slave." He will consider mercy, the letter continues, when the '
      + 'Emperor abjures the crucified god and worships the sun.',
    forTag: 'BYZ',
    date: { y: 615, m: 2 },
    aiOption: 0,
    options: [
      {
        label: 'Read it to the army',
        tooltip: 'Byzantium: +25 martial points, +10% morale for 24 months ("The Blasphemy Answered").',
        effects: guard('ev_p_letter:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'BYZ', { mar: 25 });
          ctx.helpers.addTagModifier(ctx, 'BYZ', {
            id: 'blasphemy_answered', name: 'The Blasphemy Answered', months: 24, effects: { moraleMult: 1.1 },
          });
        }),
      },
    ],
  },

  // ── 4 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_betrayal',
    title: 'The Price of Empires',
    desc: 'The order arrives from Ctesiphon with royal seals: the Christian majority of '
      + 'Palestine is to be conciliated, and the Jewish garrison of Jerusalem is to be '
      + 'thanked, disbanded, and removed. Persia has weighed its new subjects against '
      + 'its old allies and found the allies lighter. Nehemiah is summoned to hear the '
      + 'decision — summoned, notably, without his guard.',
    forTag: 'both',
    date: { y: 617, m: 6 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Submit — and endure',
        tooltip: 'Jerusalem passes to Persia (if the Return holds it); the alliance survives; +150 talents of "gratitude."',
        effects: guard('ev_p_betrayal:0', (ctx) => {
          if (ctx.helpers.controls(ctx, 'JUD', 'Jerusalem')) {
            ctx.helpers.changeOwner(ctx, 'Jerusalem', 'SAS');
          }
          ctx.helpers.adjust(ctx, 'JUD', { treasury: 150, legitimacy: -10, stability: -1 });
          ctx.helpers.chronicle(ctx, 'peace', 'Persia trades the Return away: the Jewish garrison of Jerusalem is disbanded by its own ally.');
        }),
      },
      {
        label: 'Defy the King of Kings',
        tooltip: 'Keep everything — and Persia turns on us: war with SAS, a punitive column marching from Damascus, and no cheap peace while the King\'s anger is fresh.',
        effects: guard('ev_p_betrayal:1', (ctx) => {
          const g = ctx.game;
          const jud = g.tags.JUD, sas = g.tags.SAS;
          if (jud && sas) {
            jud.allies = (jud.allies || []).filter((t) => t !== 'SAS');
            sas.allies = (sas.allies || []).filter((t) => t !== 'JUD');
            if (jud.opinion) jud.opinion.SAS = -150;
            if (sas.opinion) sas.opinion.JUD = -150;
          }
          ctx.helpers.declareWar(ctx, 'SAS', 'JUD', 'The Betrayal Repaid');
          // Defiance has a price tag: the King of Kings sends an actual army,
          // not a diplomatic note — the war arrives, it is not merely declared.
          ctx.helpers.spawnArmy(ctx, 'SAS', 'Damascus', {
            inf: 5, cav: 2, name: 'The Punitive Column',
            general: { name: 'Shahin', fire: 2, shock: 3, maneuver: 3 },
          });
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 10, stability: 1 });
          ctx.helpers.chronicle(ctx, 'war', 'The Return refuses to be sold: Persia turns its lancers on its own allies, and a punitive column marches from Damascus.');
        }),
      },
    ],
  },

  // ── 5 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_egypt_falls',
    title: 'Egypt Falls',
    desc: 'Nicetas holds Alexandria until a traitor shows the Persians a dry canal under '
      + 'the walls. With Egypt gone, the grain dole of Constantinople ends after six '
      + 'centuries — the bread of empire is now barley, rationed, and prayed over.',
    forTag: 'both',
    trigger: safeTrigger('ev_p_egypt', (ctx) =>
      dateGE(ctx, 619, 3)
      && !!findWar(ctx.game, 'SAS', 'BYZ')
      && ctx.game.playerTag !== 'BYZ'
      && ctx.helpers.controls(ctx, 'BYZ', 'Alexandria')),
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The dry canal',
        tooltip: 'Alexandria, Memphis and Pelusium pass to Persia. Byzantium: −1 stability.',
        effects: guard('ev_p_egypt:0', (ctx) => {
          for (const n of ['Alexandria', 'Memphis', 'Pelusium']) {
            ctx.helpers.changeOwner(ctx, n, 'SAS');
          }
          ctx.helpers.adjust(ctx, 'BYZ', { stability: -1 });
          ctx.helpers.chronicle(ctx, 'war', 'Alexandria falls; the grain dole of Constantinople ends after six hundred years.');
        }),
      },
    ],
  },

  // ── 5b ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_carthage',
    title: 'The Ships for Carthage',
    desc: 'The treasure is crated on the wharves and the rumor runs through the City '
      + 'in a morning: the Emperor is leaving — moving the government to Carthage, '
      + 'where his family rose, beyond the King of Kings\' reach. The Patriarch bars '
      + 'his way at the Great Church with the whole city at his back and requires an '
      + 'oath at the altar: that he will live and die with the City.',
    forTag: 'BYZ',
    date: { y: 619, m: 6 },
    aiOption: 0,
    options: [
      {
        label: 'Swear at the altar',
        tooltip: '+1 stability, +5 legitimacy; the Church +10 approval. The City and the Emperor are one flesh now.',
        effects: guard('ev_p_carthage:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'BYZ', { stability: 1, legitimacy: 5 });
          ctx.helpers.factionShift(ctx, 'BYZ', 'church', 10);
          ctx.helpers.chronicle(ctx, 'era', 'Heraclius swears at the altar of the Great Church: he will live and die with the City.');
        }),
      },
      {
        label: 'Load the ships anyway',
        tooltip: '+150 talents reach safety; −15 legitimacy, and the Church −15 approval. Some oaths are refused at a price.',
        effects: guard('ev_p_carthage:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'BYZ', { treasury: 150, legitimacy: -15 });
          ctx.helpers.factionShift(ctx, 'BYZ', 'church', -15);
        }),
      },
    ],
  },

  // ── 6 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_heraclius_sails',
    title: 'The Emperor Sails East',
    desc: 'Heraclius does what no emperor has done since Theodosius: he leaves the City '
      + 'in God\'s hands and the Patriarch\'s, melts the church plate into soldiers\' pay, '
      + 'and sails — not for Syria, but for the heart of Persia itself, gambling the '
      + 'last army of Rome on the shortest road: the enemy\'s own country.',
    forTag: 'both',
    date: { y: 622, m: 4 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'God wills a reckoning',
        tooltip: 'Byzantium: the Emperor lands at Attalia with 13 regiments; +10% discipline for 36 months. The war can now be negotiated.',
        effects: guard('ev_p_sails:0', (ctx) => {
          ctx.helpers.spawnArmy(ctx, 'BYZ', 'Attalia', {
            inf: 10, cav: 3, name: 'The Emperor\'s Army',
            general: { name: 'Heraclius', fire: 3, shock: 4, maneuver: 4 },
          });
          ctx.helpers.addTagModifier(ctx, 'BYZ', {
            id: 'reformed_army', name: 'The Reformed Army', months: 36, effects: { disciplineMult: 1.1 },
          });
          const w = findWar(ctx.game, 'SAS', 'BYZ');
          if (w) w.noNegotiation = false;
          ctx.helpers.chronicle(ctx, 'war', 'Heraclius sails east with the melted plate of every church, gambling the Empire on one campaign.');
        }),
      },
    ],
  },

  // ── 7 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_constantinople',
    title: 'The City Under Siege',
    desc: 'Avar hordes on the European shore, a Persian army at Chalcedon, and the '
      + 'Emperor a thousand miles away in the Caucasus. For ten days the walls of '
      + 'Theodosius and the ships of the fleet decide whether there will be an empire '
      + 'to come home to. The Virgin, the citizens swear afterward, walked the walls.',
    forTag: 'both',
    date: { y: 626, m: 7 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The walls hold',
        tooltip: 'Byzantium: −100 talents (the fleet\'s cost), then +10% morale for 24 months. Persia: −1 stability — the gamble failed.',
        effects: guard('ev_p_cple:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'BYZ', { treasury: -100 });
          ctx.helpers.addTagModifier(ctx, 'BYZ', {
            id: 'city_held', name: 'The City Held', months: 24, effects: { moraleMult: 1.1 },
          });
          ctx.helpers.adjust(ctx, 'SAS', { stability: -1 });
          ctx.helpers.chronicle(ctx, 'war', 'Constantinople holds against Avar and Persian together; the Virgin, they say, walked the walls.');
        }),
      },
    ],
  },

  // ── 7b ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_turks',
    title: 'The Khagan\'s Bargain',
    desc: 'Before the walls of Tiflis the Emperor of the Romans takes the crown from '
      + 'his own head and sets it on the Khagan of the Turks, promises him his '
      + 'daughter\'s portrait and hand, and receives in return forty thousand horsemen '
      + 'who fight for plunder and keep their bargains. Rome has bought allies before; '
      + 'it has rarely needed them this badly or paid this personally.',
    forTag: 'both',
    trigger: safeTrigger('ev_p_turks', (ctx) =>
      dateGE(ctx, 626, 10) && !!findWar(ctx.game, 'SAS', 'BYZ')),
    aiOption: 0,
    options: [
      {
        label: 'The steppe rides south',
        tooltip: 'Byzantium: 2 regiments of Khazar horse at Attalia, +3 war score.',
        effects: guard('ev_p_turks:0', (ctx) => {
          ctx.helpers.spawnArmy(ctx, 'BYZ', 'Attalia', {
            cav: 2, name: 'The Khagan\'s Horsemen',
            general: { name: 'Ziebel', fire: 1, shock: 3, maneuver: 4 },
          });
          addWarscore(ctx, findWar(ctx.game, 'SAS', 'BYZ'), 'BYZ', 3);
        }),
      },
    ],
  },

  // ── 7c ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_intercepted',
    title: 'The Intercepted Letter',
    desc: 'Khosrow, who forgives nothing and learns less, orders his best marshal '
      + 'executed for the crime of retreating competently. The courier is taken; '
      + 'Heraclius reads the letter, adds four hundred names of Persian officers to '
      + 'the death list with a forger\'s patience, and sends it on to Shahrbaraz — '
      + 'who reads his own death warrant aloud to his staff. The army of the west '
      + 'sits down where it stands, and Persia\'s best sword stays in its sheath '
      + 'for the rest of the war.',
    forTag: 'both',
    trigger: safeTrigger('ev_p_intercepted', (ctx) =>
      dateGE(ctx, 627, 6) && !!findWar(ctx.game, 'SAS', 'BYZ')),
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The sword stays sheathed',
        tooltip: 'Persia: the army stands down for 4 months ("The Marshal Sits Still"), −1 stability. Byzantium: +5 war score.',
        effects: guard('ev_p_intercepted:0', (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'SAS', {
            id: 'marshal_sits', name: 'The Marshal Sits Still', months: 4, effects: { aiPassive: true },
          });
          ctx.helpers.adjust(ctx, 'SAS', { stability: -1 });
          addWarscore(ctx, findWar(ctx.game, 'SAS', 'BYZ'), 'BYZ', 5);
          ctx.helpers.chronicle(ctx, 'war', 'Shahrbaraz reads his own death warrant, forged fatter by Heraclius, and sits out the war.');
        }),
      },
    ],
  },

  // ── 8 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_nineveh',
    title: 'Nineveh',
    desc: 'On the plain by the ruins of Assyria\'s dead capital, Heraclius catches the '
      + 'last Persian field army and destroys it in an eleven-hour battle, killing its '
      + 'general with his own hand — so the chroniclers insist, and no soldier who was '
      + 'there contradicts them. The road to Ctesiphon is open.',
    forTag: 'both',
    trigger: safeTrigger('ev_p_nineveh', (ctx) =>
      dateGE(ctx, 627, 12) && !!findWar(ctx.game, 'SAS', 'BYZ')),
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The eleventh hour',
        tooltip: 'Byzantium: +15 war score. Persia: −2 stability.',
        effects: guard('ev_p_nineveh:0', (ctx) => {
          addWarscore(ctx, findWar(ctx.game, 'SAS', 'BYZ'), 'BYZ', 15);
          ctx.helpers.adjust(ctx, 'SAS', { stability: -2 });
          ctx.helpers.chronicle(ctx, 'war', 'Nineveh: the last Persian field army is destroyed among the ruins of Assyria.');
        }),
      },
    ],
  },

  // ── 9 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_khosrow_falls',
    title: 'The Fall of the House of Sasan',
    desc: 'Khosrow, who would not make peace while a Roman lived, is deposed by his own '
      + 'nobles and murdered in a dungeon by his own son. Kavad II\'s first act is to '
      + 'sue for peace on any terms; his second is to die of plague; and the empire of '
      + 'four centuries begins to eat itself alive.',
    forTag: 'both',
    trigger: safeTrigger('ev_p_khosrow_falls', (ctx) =>
      dateGE(ctx, 628, 2) && !!(ctx.game.firedEvents && ctx.game.firedEvents.ev_p_nineveh)),
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The wheel turns',
        tooltip: 'Kavad II takes the throne; the great war ends in a white peace; Persia stands down.',
        effects: guard('ev_p_khosrow:0', (ctx) => {
          ctx.helpers.setRuler(ctx, 'SAS', {
            name: 'Kavad II', title: 'King of Kings', gov: 1, infl: 2, mar: 1, age: 38,
          });
          ctx.helpers.endWar(ctx, 'SAS', 'BYZ', null);
          ctx.helpers.adjust(ctx, 'SAS', { stability: -1, legitimacy: -20 });
          ctx.helpers.addTagModifier(ctx, 'SAS', {
            id: 'house_eats_itself', name: 'The House Eats Itself', months: 24, effects: { aiPassive: true },
          });
          ctx.helpers.chronicle(ctx, 'peace', 'Khosrow is murdered by his own son; the last great war of antiquity ends where it began.');
        }),
      },
    ],
  },

  // ── 9b ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_plague',
    title: 'The Plague of Sheroe',
    desc: 'Kavad II — Sheroe to his subjects — signed the peace, murdered his '
      + 'brothers to secure a throne he would hold for eight months, and now dies of '
      + 'the plague that bears his name, leaving an infant king in a court of '
      + 'regicides. In four centuries the House of Sasan has survived Rome, the '
      + 'Huns and its own satraps; it will not survive its own peace.',
    forTag: 'both',
    trigger: safeTrigger('ev_p_plague', (ctx) =>
      dateGE(ctx, 628, 10)
      && !!(ctx.game.firedEvents && ctx.game.firedEvents.ev_p_khosrow_falls)),
    aiOption: 0,
    options: [
      {
        label: 'The house eats itself',
        tooltip: 'Persia: −2 stability, −10 legitimacy. The last great war of antiquity has no victor east of the Euphrates.',
        effects: guard('ev_p_plague:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'SAS', { stability: -2, legitimacy: -10 });
          ctx.helpers.chronicle(ctx, 'ruler', 'Kavad II dies of the plague named for him; an infant rules the House of Sasan.');
        }),
      },
    ],
  },

  // ── 10 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_cross_returns',
    title: 'The Cross Returns',
    desc: 'Heraclius carries the True Cross into Jerusalem on his own shoulders, barefoot, '
      + 'through the gate his enemies breached fifteen years before. It is the high-water '
      + 'mark of Christian Rome. To the Jewish communities that chose Persia, the '
      + 'Emperor\'s mercy will be brief and his memory long.',
    forTag: 'both',
    trigger: safeTrigger('ev_p_cross', (ctx) =>
      dateGE(ctx, 629, 3) && !findWar(ctx.game, 'SAS', 'BYZ')
      && ctx.helpers.controls(ctx, 'BYZ', 'Jerusalem')),
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Barefoot through the gate',
        tooltip: 'Byzantium: +20 legitimacy, +1 stability. The Return: −10 legitimacy, and the Emperor\'s eye upon it.',
        effects: guard('ev_p_cross:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'BYZ', { legitimacy: 20, stability: 1 });
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: -10 });
          const byz = ctx.game.tags.BYZ;
          if (byz && byz.opinion) byz.opinion.JUD = -180;
          ctx.helpers.chronicle(ctx, 'era', 'Heraclius restores the True Cross to Jerusalem, barefoot, through the breached gate.');
        }),
      },
    ],
  },

  // Fired by BOOKMARK_614.checkVictory when Byzantium reaches +35 war score
  // against Persia (SPEC §32); never fires on its own. Khosrow's peace is
  // an OFFER.
  {
    id: 'ev614_persia_sues',
    title: 'Persia Sues for Peace',
    desc: 'The King of Kings\u2019 court is done: the fire temples will pay for the churches '
      + 'they burned, the True Cross returns, and every Christian land the Emperor '
      + 'holds is his. Persia proper — the plateau and the fire — goes home. Or the '
      + 'Emperor can march on Ctesiphon and see what the arithmetic of empires says.',
    forTag: 'BYZ',
    major: true,
    trigger: safeTrigger('ev614_persia_sues', () => false),
    aiOption: 0,
    options: [
      {
        label: 'The Cross returns to Jerusalem',
        tooltip: 'Victory (score 200). The Persian war ends; Byzantium keeps the Christian provinces it holds, and occupied Persia proper returns.',
        effects: guard('ev614_persia_sues:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const w = (g.wars || []).find((x) => x
            && (x.attackers.concat(x.defenders)).indexOf('BYZ') >= 0
            && (x.attackers.concat(x.defenders)).indexOf('SAS') >= 0);
          const key = w && (w.attackers || []).indexOf('BYZ') >= 0 ? 'att' : 'def';
          h.endWar(ctx, 'BYZ', 'SAS', key, { keep: (p) => p.religion === 'christianity' });
          h.endGame(ctx, {
            result: 'win',
            title: 'The Empire Endures',
            text: 'The fire temples pay for the churches they burned; the Cross returns '
              + 'to Jerusalem on the Emperor\u2019s own shoulders. It is the greatest victory '
              + 'Rome ever won — and the last, though no one yet knows it.',
            score: 200,
          });
        }),
      },
      {
        label: 'March on Ctesiphon',
        tooltip: 'The war goes on. +5 legitimacy; the King of Kings will not sue twice.',
        effects: guard('ev614_persia_sues:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'BYZ', { legitimacy: 5 });
        }),
      },
    ],
  },
];
