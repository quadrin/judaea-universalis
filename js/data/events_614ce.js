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

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false);
}

function warBetween(ctx, a, b) {
  return !!findWar(ctx.game, a, b);
}

// The gate of the whole victory strand (events V1–V9 below): the Return still
// stands as a polity AND still holds Jerusalem. Historically false from 617
// on — Persia trades the city away in ev_p_betrayal and Heraclius takes it
// back — so none of the alternate-decades events ever fire on the real rails.
function returnStands(ctx) {
  return alive(ctx, 'JUD') && ctx.helpers.controls(ctx, 'JUD', 'Jerusalem');
}

function stagingProvince(ctx) {
  for (const name of ['Yathrib', 'Khaybar', 'Tayma', 'Hegra', 'Dumatha']) {
    const p = ctx.prov(name);
    if (p && p.owner === 'RSH') return name;
  }
  return 'Hegra';
}

function awakenCaliphate(ctx) {
  const h = ctx.helpers;
  const r = ctx.game.tags.RSH;
  if (!r) return false;
  r.alive = true;
  r.govType = 'theocracy';
  h.setRuler(ctx, 'RSH', {
    name: 'Abu Bakr', title: 'Successor to the Messenger', gov: 3, infl: 4, mar: 3, age: 59,
  });
  h.adjust(ctx, 'RSH', { treasury: 240, manpower: 18000, stability: 2, legitimacy: 75, mar: 40 });
  h.addTagModifier(ctx, 'RSH', {
    id: 'armies_of_the_ridda', name: 'The Armies of the Ridda', months: 48,
    effects: { moraleMult: 1.1, reinforceMult: 1.1 },
  });
  // v5.0: the movement's true home is on the map. Yathrib — Medina — has
  // belonged to the dormant tag since the start; the awakening makes it the
  // City of the Prophet. (Khaybar keeps its Jewish farmers until the sword
  // settles that too.) The old Tayma bridge remains only for saves from the
  // smaller map, where Yathrib does not exist.
  const yathrib = ctx.prov('Yathrib');
  if (yathrib && yathrib.owner === 'RSH') {
    yathrib.religion = 'islam';
  } else {
    const tayma = ctx.prov('Tayma');
    if (tayma && tayma.owner !== ctx.game.playerTag && tayma.controller !== ctx.game.playerTag) {
      h.changeOwner(ctx, 'Tayma', 'RSH');
      tayma.religion = 'islam';
    }
  }
  h.spawnArmy(ctx, 'RSH', stagingProvince(ctx), {
    inf: 5, cav: 5, name: 'Army of the Ridda',
    general: { name: 'Khalid ibn al-Walid', fire: 2, shock: 5, maneuver: 5 },
  });
  return true;
}

function ownerOf(ctx, names, preferred) {
  if (preferred && alive(ctx, preferred)) {
    for (const name of names) {
      const p = ctx.prov(name);
      if (p && p.owner === preferred) return preferred;
    }
  }
  for (const name of names) {
    const p = ctx.prov(name);
    const tag = p && p.owner;
    if (tag && tag !== 'RSH' && tag !== 'REB' && tag !== 'WASTE' && alive(ctx, tag)) return tag;
  }
  return null;
}

function countOwned(ctx, tag) {
  let n = 0;
  for (const p of ctx.game.provinces || []) if (p && !p.impassable && p.owner === tag) n++;
  return n;
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
    requiresWar: [['SAS', 'BYZ'], ['JUD', 'BYZ']],
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
      {
        label: 'Man the walls before the psalms',
        tooltip: 'Jerusalem passes to the Return (owner) with a heavier garrison (4 regiments); −60 talents for the works. The Return: +8 legitimacy. Byzantium: −15 legitimacy. Persia: +100 talents of relics and ransom.',
        effects: guard('ev_p_jerusalem:1', (ctx) => {
          ctx.helpers.changeOwner(ctx, 'Jerusalem', 'JUD');
          ctx.helpers.spawnArmy(ctx, 'JUD', 'Jerusalem', { inf: 4, name: 'Guard of the Return' });
          ctx.helpers.adjust(ctx, 'JUD', { treasury: -60, legitimacy: 8 });
          ctx.helpers.adjust(ctx, 'BYZ', { legitimacy: -15 });
          ctx.helpers.adjust(ctx, 'SAS', { treasury: 100 });
          ctx.helpers.chronicle(ctx, 'war', 'Jerusalem falls to Shahrbaraz and the fighters of the Return, who repair the breach before they sing in it; the True Cross goes east to Ctesiphon.');
        }),
      },
    ],
  },

  // ── 1b ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_benjamin',
    title: 'Benjamin of Tiberias',
    requiresWar: ['JUD', 'BYZ'],
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
      {
        label: 'The silver marches alone',
        tooltip: 'The Return: +150 talents, +500 manpower; the Fighters of the Return +3 approval — Benjamin pays in full, but the hill villages stay to bring in the harvest.',
        effects: guard('ev_p_benjamin:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { treasury: 150, manpower: 500 });
          ctx.helpers.factionShift(ctx, 'JUD', 'fighters', 3);
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
      {
        label: 'The Queen intercedes',
        tooltip: 'Persia: −25 talents to keep the Patriarch as an honored guest of Shirin\'s court, +5 legitimacy. Byzantium: −5 legitimacy — the grievance goes east with the Cross regardless.',
        effects: guard('ev_p_zacharias:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'SAS', { treasury: -25, legitimacy: 5 });
          ctx.helpers.adjust(ctx, 'BYZ', { legitimacy: -5 });
          ctx.helpers.chronicle(ctx, 'era', 'Zacharias and the True Cross go east; Shirin the queen houses the Patriarch as a guest, not a trophy.');
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
    requiresWar: ['SAS', 'BYZ'],
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
      {
        label: 'Buy another season',
        tooltip: 'Byzantium: −100 talents send the embassy back with gifts — +1 stability, −1 war exhaustion. The blasphemy goes unanswered, for now.',
        effects: guard('ev_p_letter:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'BYZ', { treasury: -100, stability: 1, warExhaustion: -1 });
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
        tooltip: 'Jerusalem passes to Persia (if the Return holds it); Persian supply support ends; the alliance survives; +150 talents of "gratitude."',
        effects: guard('ev_p_betrayal:0', (ctx) => {
          if (ctx.helpers.controls(ctx, 'JUD', 'Jerusalem')) {
            ctx.helpers.changeOwner(ctx, 'Jerusalem', 'SAS');
          }
          ctx.helpers.removeModifier(ctx, 'JUD', 'persian_supply_trains');
          ctx.helpers.adjust(ctx, 'JUD', { treasury: 150, legitimacy: -10, stability: -1 });
          ctx.helpers.chronicle(ctx, 'peace', 'Persia trades the Return away: the Jewish garrison of Jerusalem is disbanded by its own ally.');
        }),
      },
      {
        label: 'Defy the King of Kings',
        tooltip: 'Keep everything — Persian supply support ends, and Persia turns on us: war with SAS, a punitive column marching from Damascus, and no cheap peace while the King\'s anger is fresh.',
        effects: guard('ev_p_betrayal:1', (ctx) => {
          const g = ctx.game;
          const jud = g.tags.JUD, sas = g.tags.SAS;
          if (jud && sas) {
            jud.allies = (jud.allies || []).filter((t) => t !== 'SAS');
            sas.allies = (sas.allies || []).filter((t) => t !== 'JUD');
            if (jud.opinion) jud.opinion.SAS = -150;
            if (sas.opinion) sas.opinion.JUD = -150;
          }
          ctx.helpers.removeModifier(ctx, 'JUD', 'persian_supply_trains');
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
    requiresWar: ['SAS', 'BYZ'],
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
      {
        label: 'Burn what cannot be held',
        tooltip: 'Alexandria, Memphis and Pelusium still pass to Persia. Byzantium: −1 stability, −5 legitimacy; Alexandria\'s granaries burn — −15% income there for 24 months.',
        effects: guard('ev_p_egypt:1', (ctx) => {
          for (const n of ['Alexandria', 'Memphis', 'Pelusium']) {
            ctx.helpers.changeOwner(ctx, n, 'SAS');
          }
          ctx.helpers.adjust(ctx, 'BYZ', { stability: -1, legitimacy: -5 });
          ctx.helpers.addProvinceModifier(ctx, 'Alexandria', {
            id: 'granaries_burned', name: 'The Granaries Burned', months: 24, effects: { taxMult: 0.85, prodMult: 0.85 },
          });
          ctx.helpers.chronicle(ctx, 'war', 'Alexandria falls with its granaries alight; Persia takes a hungry prize, and the grain dole of Constantinople ends all the same.');
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
    requiresWar: ['SAS', 'BYZ'],
    desc: 'Heraclius does what no emperor has done since Theodosius: he leaves the City '
      + 'in God\'s hands and the Patriarch\'s, melts the church plate into soldiers\' pay, '
      + 'and sails — not for Syria, but for the heart of Persia itself, gambling the '
      + 'last army of Rome on the shortest road: the enemy\'s own country.',
    forTag: 'both',
    date: { y: 622, m: 4 },
    world: true,
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
    requiresWar: ['SAS', 'BYZ'],
    desc: 'Avar hordes on the European shore, a Persian army at Chalcedon, and the '
      + 'Emperor a thousand miles away in the Caucasus. For ten days the walls of '
      + 'Theodosius and the ships of the fleet decide whether there will be an empire '
      + 'to come home to. The Virgin, the citizens swear afterward, walked the walls.',
    forTag: 'both',
    date: { y: 626, m: 7 },
    world: true,
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
    requiresWar: ['SAS', 'BYZ'],
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
      {
        label: 'Pay the steppe in full',
        tooltip: 'Byzantium: −120 talents of gifts to the Khagan buy 3 regiments of Khazar horse at Attalia, +3 war score.',
        effects: guard('ev_p_turks:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'BYZ', { treasury: -120 });
          ctx.helpers.spawnArmy(ctx, 'BYZ', 'Attalia', {
            cav: 3, name: 'The Khagan\'s Horsemen',
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
    requiresWar: ['SAS', 'BYZ'],
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
      {
        label: 'Court the marshal in secret',
        tooltip: 'Persia: the army stands down for 4 months ("The Marshal Sits Still"), −1 stability. Byzantium: +3 war score and +15 influence points — a marshal courted outlasts a marshal shamed.',
        effects: guard('ev_p_intercepted:1', (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'SAS', {
            id: 'marshal_sits', name: 'The Marshal Sits Still', months: 4, effects: { aiPassive: true },
          });
          ctx.helpers.adjust(ctx, 'SAS', { stability: -1 });
          addWarscore(ctx, findWar(ctx.game, 'SAS', 'BYZ'), 'BYZ', 3);
          ctx.helpers.adjust(ctx, 'BYZ', { infl: 15 });
          ctx.helpers.chronicle(ctx, 'war', 'Shahrbaraz reads his own death warrant — and, folded beneath it, the Emperor\'s discreet letters; the army of the west sits out the war.');
        }),
      },
    ],
  },

  // ── 8 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_nineveh',
    title: 'Nineveh',
    requiresWar: ['SAS', 'BYZ'],
    desc: 'On the plain by the ruins of Assyria\'s dead capital, Heraclius catches the '
      + 'last Persian field army and destroys it in an eleven-hour battle, killing its '
      + 'general with his own hand — so the chroniclers insist, and no soldier who was '
      + 'there contradicts them. The road to Ctesiphon is open.',
    forTag: 'both',
    world: true,
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
    world: true,
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
      {
        label: 'Silver holds what blood cannot',
        tooltip: 'Persia: −100 talents in donatives to the court; −1 stability, −10 legitimacy. The infant king is bought a quieter cradle.',
        effects: guard('ev_p_plague:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'SAS', { treasury: -100, stability: -1, legitimacy: -10 });
          ctx.helpers.chronicle(ctx, 'ruler', 'Kavad II dies of the plague named for him; donatives from the treasury keep the court, for now, around an infant king.');
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
    world: true,
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

  // ── THE WORLD SOUTH OF THE MAP ────────────────────────────────────────────
  {
    id: 'ev_p_hijra',
    title: 'The Hijra',
    worldLabel: 'The Hijra establishes a new polity in Arabia',
    desc: 'South of the imperial roads, Muhammad and his followers leave Mecca for '
      + 'Yathrib. The journey creates more than a refuge: Medina becomes a political '
      + 'community with treaties, obligations, and an army. Rome and Persia are too '
      + 'occupied with one another to notice what has begun beyond their maps.',
    forTag: 'both',
    date: { y: 622, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'A new reckoning begins',
      tooltip: 'The Medinan polity forms off-map. No province changes hands; Arabia now advances on its own historical clock.',
      effects: guard('ev_p_hijra:0', (ctx) => {
        ctx.helpers.setFlag(ctx, 'hijra', true);
        ctx.helpers.chronicle(ctx, 'era', 'The Hijra: a new political community takes shape at Medina, beyond the southern edge of the imperial war.');
      }),
    }],
  },
  {
    id: 'ev_p_mecca',
    title: 'Arabia Consolidates',
    worldLabel: 'Mecca submits and Arabia begins to consolidate',
    desc: 'While Khosrow\'s heirs consume one another and Heraclius restores the old '
      + 'frontier, the balance inside Arabia changes. Mecca submits to Muhammad. The '
      + 'sanctuary remains; the idols do not. Tribes that once negotiated separately '
      + 'must now reckon with a single expanding center.',
    forTag: 'both',
    date: { y: 630, m: 1 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'The peninsula is no longer a strategic void',
      tooltip: 'Records the consolidation of Arabia. The northern empires receive no arbitrary penalty yet.',
      effects: guard('ev_p_mecca:0', (ctx) => {
        ctx.helpers.setFlag(ctx, 'arabiaConsolidated', true);
        ctx.helpers.chronicle(ctx, 'diplomacy', 'Mecca submits; Arabia begins to act as one political theater rather than a collection of distant tribes.');
      }),
    }],
  },
  {
    id: 'ev_p_rashidun',
    title: 'The Succession in Medina',
    worldLabel: 'Muhammad dies; the Rashidun succession begins',
    desc: 'Muhammad is dead, and the community does not dissolve. Abu Bakr is acclaimed '
      + 'as successor. The tribes that break their agreements are fought back into the '
      + 'new order; commanders and armies emerge from the Ridda wars with the peninsula '
      + 'behind them and two exhausted empires ahead.',
    forTag: 'both',
    date: { y: 632, m: 6 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'The polity survives its founder',
      tooltip: 'The Rashidun Caliphate becomes active off-map. A mobile field army gathers at the northern Arabian edge.',
      effects: guard('ev_p_rashidun:0', (ctx) => {
        if (!awakenCaliphate(ctx)) return;
        ctx.helpers.chronicle(ctx, 'era', 'Muhammad dies; Abu Bakr succeeds him, and the armies of the Ridda gather beyond the desert frontier.');
      }),
    }],
  },
  {
    id: 'ev_p_iraq_raids',
    title: 'The Raids Become a War',
    worldLabel: 'Arab armies move into Iraq',
    desc: 'Columns out of northeastern Arabia cross the waste toward the lower rivers. '
      + 'They are not bound to the old roads, the old frontier forts, or the diplomatic '
      + 'arithmetic of Rome and Persia. Whoever now holds Iraq discovers that the desert '
      + 'edge has become a front.',
    forTag: 'both',
    date: { y: 633, m: 4 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'The southern frontier opens',
      tooltip: 'The Caliphate declares war on the live holder of lower Iraq and fields a second army. No province is transferred by script.',
      effects: guard('ev_p_iraq_raids:0', (ctx) => {
        if (!alive(ctx, 'RSH')) awakenCaliphate(ctx);
        const target = ownerOf(ctx, ['Charax', 'Uruk', 'Babylon', 'Seleucia-Ctesiphon'], 'SAS');
        if (target && !warBetween(ctx, 'RSH', target)) ctx.helpers.declareWar(ctx, 'RSH', target, 'The Conquest of Iraq');
        ctx.helpers.spawnArmy(ctx, 'RSH', stagingProvince(ctx), {
          inf: 6, cav: 4, name: 'Army of al-Muthanna',
          general: { name: 'al-Muthanna ibn Haritha', fire: 2, shock: 4, maneuver: 4 },
        });
        ctx.helpers.chronicle(ctx, 'war', 'Arab columns move into Iraq against whoever holds the rivers; the desert edge becomes a front.');
      }),
    }],
  },
  {
    id: 'ev_p_levant_campaign',
    title: 'The Armies Enter the Levant',
    worldLabel: 'The Rashidun campaign enters the Levant',
    desc: 'Separate columns move north through the steppe, converging on Bostra and '
      + 'Damascus. The target is not a vanished historical border but the power that '
      + 'actually holds Syria now. The victors of the last great war have had only a few '
      + 'years to rebuild; the new war does not wait for them.',
    forTag: 'both',
    date: { y: 634, m: 4 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'Syria is a battlefield again',
      tooltip: 'The Caliphate declares war on the current Levantine power—preferentially Byzantium if it still holds the region—and reinforces from Arabia.',
      effects: guard('ev_p_levant_campaign:0', (ctx) => {
        if (!alive(ctx, 'RSH')) awakenCaliphate(ctx);
        const target = ownerOf(ctx, ['Damascus', 'Bostra', 'Jerusalem', 'Emesa'], 'BYZ');
        if (target && !warBetween(ctx, 'RSH', target)) ctx.helpers.declareWar(ctx, 'RSH', target, 'The Conquest of the Levant');
        ctx.helpers.spawnArmy(ctx, 'RSH', stagingProvince(ctx), {
          inf: 8, cav: 4, name: 'Army of Syria',
          general: { name: 'Abu Ubayda ibn al-Jarrah', fire: 3, shock: 3, maneuver: 4 },
        });
        ctx.helpers.chronicle(ctx, 'war', 'The Rashidun armies enter the Levant against the power that now holds Syria.');
      }),
    }],
  },
  {
    id: 'ev_p_yarmouk',
    title: 'The Yarmouk Campaign',
    requiresWar: ['RSH', 'BYZ'],
    worldLabel: 'The armies converge around the Yarmouk',
    desc: 'The armies maneuver among the tributaries east of the Jordan. If Rome still '
      + 'contests Syria, this is the campaign on which its eastern provinces turn. If an '
      + 'alternate power has replaced Rome, there is no predestined battle—only the same '
      + 'mobile army and the same strategic crossing.',
    forTag: 'both',
    date: { y: 636, m: 8 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'Let the live map decide the field',
      tooltip: 'If Byzantium and the Caliphate are at war, both receive campaign armies and short military modifiers. The result is fought in the simulation.',
      effects: guard('ev_p_yarmouk:0', (ctx) => {
        if (warBetween(ctx, 'RSH', 'BYZ')) {
          ctx.helpers.addTagModifier(ctx, 'RSH', {
            id: 'yarmouk_maneuver', name: 'Maneuver at the Yarmouk', months: 12,
            effects: { moraleMult: 1.08 },
          });
          ctx.helpers.addTagModifier(ctx, 'BYZ', {
            id: 'last_army_of_the_east', name: 'The Last Army of the East', months: 12,
            effects: { reinforceMult: 1.08 },
          });
          ctx.helpers.spawnArmy(ctx, 'BYZ', ctx.helpers.controls(ctx, 'BYZ', 'Damascus') ? 'Damascus' : 'Antioch', {
            inf: 8, cav: 2, name: 'Army of Vahan',
            general: { name: 'Vahan', fire: 3, shock: 3, maneuver: 2 },
          });
        } else {
          ctx.helpers.addTagModifier(ctx, 'RSH', {
            id: 'unopposed_levant', name: 'No Imperial Field Army', months: 12,
            effects: { siegeBonus: 1 },
          });
        }
        ctx.helpers.chronicle(ctx, 'war', 'The armies converge around the Yarmouk; history supplies the pressure, and the living map supplies the result.');
      }),
    }],
  },
  {
    id: 'ev_p_ctesiphon_pressure',
    title: 'The Road to Ctesiphon',
    worldLabel: 'The campaign reaches the Persian capital',
    desc: 'The lower rivers and the royal road lead toward Ctesiphon. If Arab armies '
      + 'already hold it, the Sasanian court breaks into flight. If they do not, the '
      + 'campaign receives engineers and replacements—but no chronicler is permitted to '
      + 'capture a city the player has successfully defended.',
    forTag: 'both',
    date: { y: 637, m: 6 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'The rivers decide',
      tooltip: 'Control is checked live. A captured Ctesiphon shakes Persia; a defended one faces renewed siege pressure, never a scripted transfer.',
      effects: guard('ev_p_ctesiphon_pressure:0', (ctx) => {
        if (ctx.helpers.controls(ctx, 'RSH', 'Seleucia-Ctesiphon')) {
          ctx.helpers.adjust(ctx, 'SAS', { stability: -2, legitimacy: -25 });
          ctx.helpers.adjust(ctx, 'RSH', { legitimacy: 15, treasury: 100 });
          ctx.helpers.chronicle(ctx, 'fall', 'Ctesiphon is lost and the Sasanian court flees east.');
        } else if (alive(ctx, 'RSH')) {
          ctx.helpers.addTagModifier(ctx, 'RSH', {
            id: 'road_to_ctesiphon', name: 'The Road to Ctesiphon', months: 18,
            effects: { siegeBonus: 1, reinforceMult: 1.08 },
          });
          ctx.helpers.chronicle(ctx, 'war', 'Ctesiphon still stands; the campaign on the rivers receives men and engines, not a scripted victory.');
        }
      }),
    }],
  },
  {
    id: 'ev_p_jerusalem_pressure',
    title: 'The Southern Gate of Jerusalem',
    worldLabel: 'The new power reaches Palestine',
    desc: 'The campaign reaches Palestine. Jerusalem may be Byzantine, Persian, Jewish, '
      + 'or something no earlier chronicle imagined. Its actual ruler now receives the '
      + 'demand, and its actual walls must answer it.',
    forTag: 'both',
    date: { y: 638, m: 2 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'No city changes hands in a sentence',
      tooltip: 'If the Caliphate already holds Jerusalem it gains legitimacy. Otherwise the live holder receives frontier unrest and the war continues normally.',
      effects: guard('ev_p_jerusalem_pressure:0', (ctx) => {
        if (ctx.helpers.controls(ctx, 'RSH', 'Jerusalem')) {
          ctx.helpers.adjust(ctx, 'RSH', { legitimacy: 15, infl: 20 });
          ctx.helpers.chronicle(ctx, 'diplomacy', 'Jerusalem submits to the Caliphate under terms negotiated with its live defenders.');
        } else {
          ctx.helpers.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'southern_armies_approach', name: 'The Southern Armies Approach', months: 18,
            effects: { unrest: 1.5 },
          });
          ctx.helpers.chronicle(ctx, 'war', 'The armies from Arabia reach Palestine; Jerusalem remains in the hands that can defend it.');
        }
      }),
    }],
  },
  {
    id: 'ev_p_sasanian_horizon',
    title: 'The Last King of the House of Sasan',
    worldLabel: 'The Sasanian succession reaches its historical horizon',
    desc: 'The old chronology ends here with Yazdegerd III dead in the east. But this '
      + 'chronicle has counted the provinces and armies that actually survive. A shattered '
      + 'Persia loses its dynasty; a restored one earns the right to defy the date.',
    forTag: 'both',
    date: { y: 651, m: 6 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'Judge the living realm, not the old atlas',
      tooltip: 'A Sasanian rump enters dynastic collapse. A Persia still holding more than four provinces instead gains a restoration bonus.',
      effects: guard('ev_p_sasanian_horizon:0', (ctx) => {
        const sas = ctx.game.tags.SAS;
        if (!sas || !sas.alive) return;
        if (countOwned(ctx, 'SAS') <= 4) {
          sas.name = 'Persian Interregnum';
          ctx.helpers.setRuler(ctx, 'SAS', { name: 'The Provincial Lords', title: 'Interregnum', gov: 1, infl: 1, mar: 2, age: 45 });
          ctx.helpers.adjust(ctx, 'SAS', { stability: -3, legitimacy: -60 });
          ctx.helpers.setFlag(ctx, 'sasanianDynastyEnded', true);
          ctx.helpers.chronicle(ctx, 'fall', 'The House of Sasan ends; the remaining Persian banners belong to provincial lords.');
        } else {
          ctx.helpers.addTagModifier(ctx, 'SAS', {
            id: 'sasanian_restoration', name: 'The Dynasty Defies the Horizon', months: -1,
            effects: { moraleMult: 1.08, legitimacyAdd: 0.1 },
          });
          ctx.helpers.adjust(ctx, 'SAS', { stability: 1, legitimacy: 20 });
          ctx.helpers.chronicle(ctx, 'era', 'The Sasanian state survives beyond its historical horizon, restored by victories the old chronicle never knew.');
        }
      }),
    }],
  },

  // Fired by BOOKMARK_614.checkVictory when Byzantium reaches +35 war score
  // against Persia (SPEC §32); never fires on its own. Khosrow's peace is
  // an OFFER.
  {
    id: 'ev614_persia_sues',
    title: 'Persia Sues for Peace',
    requiresWar: ['SAS', 'BYZ'],
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

  // ══ THE WORLD AFTER THE CONQUESTS, 653–692 ═══════════════════════════════
  // The chronicle keeps counting after every verdict. Dated cards fire on the
  // calendar even in a diverged world; each one checks who is actually alive
  // and who actually holds the cities before it moves a single talent.
  // Sources: al-Tabari on the fitnas; Theophanes on the sea war; the Geniza's
  // memory of the seventy families; the building inscription in the Dome.

  // ── 11 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_uthman_codex',
    title: 'The Standard Codices',
    worldLabel: 'Uthman sends one Qur\'an to every garrison city',
    desc: 'In Medina the third successor — Umar died under an assassin\'s knife at '
      + 'prayer; Uthman rules now, old and open-handed to his kinsmen — orders one '
      + 'text of the revelation copied fair and sent to every garrison city, and the '
      + 'variant leaves burned. The misr system hardens around the codices: soldiers '
      + 'on the registers, stipends from the conquered land, an empire administered '
      + 'from tent-cities that have begun, awkwardly, to become capitals.',
    forTag: 'both',
    date: { y: 653, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'One reading for one empire',
        tooltip: 'The Caliphate: Uthman enthroned, +10 legitimacy, +1 stability, and "The Standard Codices" (+0.1 legitimacy a month, −15% administration) for 10 years. The garrison cities of Iraq it holds: +1 unrest for 24 months — Kufa liked its own reading.',
        effects: guard('ev_p_uthman_codex:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.setRuler(ctx, 'RSH', { name: 'Uthman ibn Affan', title: 'Commander of the Faithful', gov: 3, infl: 3, mar: 2, age: 74 });
          h.adjust(ctx, 'RSH', { legitimacy: 10, stability: 1 });
          h.addTagModifier(ctx, 'RSH', {
            id: 'standard_codices', name: 'The Standard Codices', months: 120,
            effects: { legitimacyAdd: 0.1, adminMult: 0.85 },
          });
          for (const n of ['Babylon', 'Uruk', 'Nehardea']) {
            if (h.controls(ctx, 'RSH', n)) {
              h.addProvinceModifier(ctx, n, {
                id: 'variant_readers', name: 'The Variant Readers', months: 24, effects: { unrest: 1 },
              });
            }
          }
          h.chronicle(ctx, 'era', 'Uthman\'s codices go out to the garrison cities, and the variant leaves burn; the conquests acquire a single book.');
        }),
      },
      {
        label: 'Let every misr keep its reading',
        tooltip: 'The Caliphate: Uthman enthroned, +5 legitimacy, +20 influence points; no unrest in Iraq — and no single text either.',
        effects: guard('ev_p_uthman_codex:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.setRuler(ctx, 'RSH', { name: 'Uthman ibn Affan', title: 'Commander of the Faithful', gov: 3, infl: 3, mar: 2, age: 74 });
          h.adjust(ctx, 'RSH', { legitimacy: 5, infl: 20 });
          h.chronicle(ctx, 'era', 'Uthman rules from Medina; the garrison cities keep their own readings, and the reciters of Kufa and Damascus begin a long argument.');
        }),
      },
    ],
  },

  // ── 12 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_first_fleet',
    title: 'The Governor Builds a Fleet',
    worldLabel: 'Mu\'awiya launches the first Arab fleet; Cyprus is raided',
    desc: 'Mu\'awiya, governor of Syria, has spent fifteen years looking at the sea '
      + 'that the desert armies cannot cross, and has now hired the men who can: '
      + 'Syrian shipwrights, Coptic crews, Roman deserters who know which way the '
      + 'currents run off Cyprus. The Caliph in Medina distrusts water. The governor '
      + 'in Damascus launches anyway, and Constantia learns what the new flag looks '
      + 'like from its own harbor.',
    forTag: 'both',
    date: { y: 654, m: 6 },
    world: true,
    aiOption: 0,
    options: [
      {
        label: 'The sea learns Arabic',
        tooltip: 'The Caliphate: 6 ships at its nearest held port. Cyprus (Constantia), if it is not the Caliphate\'s: raided — +2 unrest and −15% tax for 24 months; its Byzantine owner loses 5 legitimacy.',
        effects: guard('ev_p_first_fleet:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          const port = ['Laodicea', 'Tyre', 'Sidon', 'Berytus', 'Ptolemais', 'Caesarea Maritima', 'Alexandria']
            .find((n) => h.controls(ctx, 'RSH', n));
          if (port) h.spawnFleet(ctx, 'RSH', port, 6, { name: 'The Fleet of Mu\'awiya' });
          if (!h.controls(ctx, 'RSH', 'Salamis')) {
            h.addProvinceModifier(ctx, 'Salamis', {
              id: 'cyprus_raided', name: 'The Island Raided', months: 24,
              effects: { unrest: 2, taxMult: 0.85 },
            });
            const p = ctx.prov('Salamis');
            if (p && p.owner === 'BYZ') h.adjust(ctx, 'BYZ', { legitimacy: -5 });
          }
          h.chronicle(ctx, 'war', 'The first Arab fleet stands out from the Syrian coast; Cyprus is raided, and the sea stops being a wall.');
        }),
      },
      {
        label: 'Raid, but keep no station',
        tooltip: 'The Caliphate: 4 ships and +60 talents of plunder — the treasure comes home, the sea-lanes do not. Cyprus suffers the same raid.',
        effects: guard('ev_p_first_fleet:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          const port = ['Laodicea', 'Tyre', 'Sidon', 'Berytus', 'Ptolemais', 'Caesarea Maritima', 'Alexandria']
            .find((n) => h.controls(ctx, 'RSH', n));
          if (port) h.spawnFleet(ctx, 'RSH', port, 4, { name: 'The Fleet of Mu\'awiya' });
          h.adjust(ctx, 'RSH', { treasury: 60 });
          if (!h.controls(ctx, 'RSH', 'Salamis')) {
            h.addProvinceModifier(ctx, 'Salamis', {
              id: 'cyprus_raided', name: 'The Island Raided', months: 24,
              effects: { unrest: 2, taxMult: 0.85 },
            });
          }
          h.chronicle(ctx, 'war', 'Arab ships raid Cyprus and sail home heavy; the governor of Syria has proved his point and banked it.');
        }),
      },
    ],
  },

  // ── 13 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_masts',
    title: 'The Battle of the Masts',
    worldLabel: 'The fleets meet off Lycia — the Battle of the Masts',
    desc: 'Off the Lycian coast the two fleets lash their hulls together and fight it '
      + 'out as infantry, deck to deck, until the water — Theophanes says — ran red '
      + 'to the shore. The sea was Rome\'s last uncontested element; after Phoenix '
      + 'it is contested. If no Arab fleet exists in this world, the chroniclers '
      + 'record instead a summer of Roman squadrons burning empty Syrian slipways.',
    forTag: 'both',
    date: { y: 655, m: 8 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Deck to deck',
        tooltip: 'If the Caliphate has ships: Byzantium\'s fleets are halved, −1 stability, −5 legitimacy; the Caliphate +25 martial points (and +10 war score if they are at war). If it has none: Byzantium +15 martial points instead.',
        effects: guard('ev_p_masts:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'BYZ')) return;
          let rshShips = 0;
          for (const f of Object.values(ctx.game.fleets || {})) {
            if (f && f.tag === 'RSH') rshShips += f.ships || 0;
          }
          if (alive(ctx, 'RSH') && rshShips > 0) {
            for (const f of Object.values(ctx.game.fleets || {})) {
              if (f && f.tag === 'BYZ' && f.ships > 1) f.ships = Math.max(1, Math.floor(f.ships / 2));
            }
            h.adjust(ctx, 'BYZ', { stability: -1, legitimacy: -5 });
            h.adjust(ctx, 'RSH', { mar: 25 });
            addWarscore(ctx, findWar(ctx.game, 'RSH', 'BYZ'), 'RSH', 10);
            h.chronicle(ctx, 'war', 'The Battle of the Masts: the fleets grapple off Lycia and the Roman line breaks; the sea is uncontested no more.');
          } else {
            h.adjust(ctx, 'BYZ', { mar: 15 });
            h.chronicle(ctx, 'war', 'Roman squadrons sweep the Syrian coast and find no enemy fleet worth the name; the sea, this year, stays Roman.');
          }
        }),
      },
      {
        label: 'The Emperor escapes in another man\'s cloak',
        tooltip: 'The same battle — but the sovereign\'s flight is seen: Byzantium\'s fleets halved, −12 legitimacy, stability spared; the Caliphate +25 martial points (and +10 war score at war).',
        effects: guard('ev_p_masts:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'BYZ')) return;
          let rshShips = 0;
          for (const f of Object.values(ctx.game.fleets || {})) {
            if (f && f.tag === 'RSH') rshShips += f.ships || 0;
          }
          if (alive(ctx, 'RSH') && rshShips > 0) {
            for (const f of Object.values(ctx.game.fleets || {})) {
              if (f && f.tag === 'BYZ' && f.ships > 1) f.ships = Math.max(1, Math.floor(f.ships / 2));
            }
            h.adjust(ctx, 'BYZ', { legitimacy: -12 });
            h.adjust(ctx, 'RSH', { mar: 25 });
            addWarscore(ctx, findWar(ctx.game, 'RSH', 'BYZ'), 'RSH', 10);
            h.chronicle(ctx, 'war', 'The Battle of the Masts: the fleet is lost and the sovereign leaves the flagship in a common soldier\'s cloak — the sailors remember both.');
          } else {
            h.adjust(ctx, 'BYZ', { mar: 15 });
            h.chronicle(ctx, 'war', 'Roman squadrons sweep the Syrian coast unopposed; there is no fleet to flee from.');
          }
        }),
      },
    ],
  },

  // ── 14 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_uthman_slain',
    title: 'The Caliph at His Doorway',
    worldLabel: 'Uthman is murdered; the First Fitna opens',
    desc: 'Mutineers from the garrisons of Egypt and Iraq camp in Medina for weeks with '
      + 'their grievances — stipends, governors, cousins promoted over believers — and '
      + 'on a June day they climb the wall of the Caliph\'s house and kill the old man '
      + 'over his open Qur\'an. Ali accepts the oath in a city that smells of the '
      + 'crime. The empire of the conquests, having run out of enemies it is willing '
      + 'to name, turns inward.',
    forTag: 'both',
    date: { y: 656, m: 6 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The empire turns inward',
        tooltip: 'The Caliphate: Ali enthroned; −2 stability, −15 legitimacy, and "The First Fitna" (−10% morale, −10% income) for 60 months.',
        effects: guard('ev_p_uthman_slain:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.setRuler(ctx, 'RSH', { name: 'Ali ibn Abi Talib', title: 'Commander of the Faithful', gov: 3, infl: 3, mar: 4, age: 55 });
          h.adjust(ctx, 'RSH', { stability: -2, legitimacy: -15 });
          h.addTagModifier(ctx, 'RSH', {
            id: 'first_fitna', name: 'The First Fitna', months: 60,
            effects: { moraleMult: 0.9, incomeMult: 0.9 },
          });
          h.setFlag(ctx, 'firstFitna', true);
          h.chronicle(ctx, 'era', 'Uthman is killed at his own doorway in Medina; Ali takes the oath, Damascus withholds it, and the First Fitna opens.');
        }),
      },
      {
        label: 'Buy the garrisons quiet',
        tooltip: 'The Caliphate: Ali enthroned; −120 talents in stipend arrears paid at once — −1 stability, −15 legitimacy, and the same "First Fitna" modifier. Silver slows a civil war; it has never yet stopped one.',
        effects: guard('ev_p_uthman_slain:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.setRuler(ctx, 'RSH', { name: 'Ali ibn Abi Talib', title: 'Commander of the Faithful', gov: 3, infl: 3, mar: 4, age: 55 });
          h.adjust(ctx, 'RSH', { treasury: -120, stability: -1, legitimacy: -15 });
          h.addTagModifier(ctx, 'RSH', {
            id: 'first_fitna', name: 'The First Fitna', months: 60,
            effects: { moraleMult: 0.9, incomeMult: 0.9 },
          });
          h.setFlag(ctx, 'firstFitna', true);
          h.chronicle(ctx, 'era', 'Uthman is killed at his doorway; Ali pays the garrisons their arrears and takes an oath that Damascus still refuses.');
        }),
      },
    ],
  },

  // ── 15 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_camel_siffin',
    title: 'The Camel and the Lances',
    worldLabel: 'Muslim fights Muslim: the Camel, then Siffin',
    desc: 'At Basra the Prophet\'s widow directs a battle from her camel-litter until '
      + 'the litter bristles with arrows like a hedgehog and the beast is hamstrung '
      + 'under her. Months later, on the Euphrates at Siffin, Ali\'s Iraqis are '
      + 'grinding through Mu\'awiya\'s Syrians when the Syrian ranks raise leaves of '
      + 'the Qur\'an on their lance-points: let the Book judge between us. The armies '
      + 'stop. The arbitration begins. And the men who wanted neither caliph walk '
      + 'out of the camp declaring that judgment belongs to God alone.',
    forTag: 'both',
    date: { y: 657, m: 7 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Raise the leaves on the lances',
        tooltip: 'The Caliphate: −6,000 manpower, −5 legitimacy; the Kharijites walk out — "Judgment Belongs to God Alone" (+1 unrest everywhere) for 48 months.',
        effects: guard('ev_p_camel_siffin:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.adjust(ctx, 'RSH', { manpower: -6000, legitimacy: -5 });
          h.addTagModifier(ctx, 'RSH', {
            id: 'kharijite_secession', name: '"Judgment Belongs to God Alone"', months: 48,
            effects: { unrestAll: 1 },
          });
          h.setFlag(ctx, 'kharijites', true);
          h.chronicle(ctx, 'war', 'The Camel, then Siffin: the Qur\'an goes up on the lances, the arbitration begins, and the Kharijites walk out of both camps.');
        }),
      },
      {
        label: 'Fight Siffin to the finish',
        tooltip: 'The Caliphate: −10,000 manpower, −10 legitimacy — no arbitration, no walkout, and a generation of Syrian and Iraqi widows on the same pension rolls.',
        effects: guard('ev_p_camel_siffin:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.adjust(ctx, 'RSH', { manpower: -10000, legitimacy: -10 });
          h.chronicle(ctx, 'war', 'The Camel, then Siffin fought to the end: the Book stays in its satchels and the river carries the cost downstream.');
        }),
      },
    ],
  },

  // ── 16 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_nahrawan',
    title: 'Nahrawan',
    desc: 'The men who walked out at Siffin have made a camp on the Nahrawan canal and '
      + 'a doctrine out of the walkout: every believer who accepted the arbitration is '
      + 'an apostate, and apostates may be killed on the road. Ali, who wanted to march '
      + 'on Damascus, marches on his own former soldiers instead — and wins the kind '
      + 'of victory over the pious that the pious never stop avenging.',
    forTag: 'both',
    trigger: safeTrigger('ev_p_nahrawan', (ctx) =>
      dateGE(ctx, 658, 7) && alive(ctx, 'RSH') && !!ctx.helpers.getFlag(ctx, 'kharijites')),
    aiOption: 0,
    options: [
      {
        label: 'Cut them down at the canal',
        tooltip: 'The Caliphate: +10 martial points, −2,000 manpower, −5 legitimacy — the field is won and the grudge is planted.',
        effects: guard('ev_p_nahrawan:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.adjust(ctx, 'RSH', { mar: 10, manpower: -2000, legitimacy: -5 });
          h.chronicle(ctx, 'war', 'Nahrawan: the Kharijite camp is destroyed on its canal; the survivors scatter, and begin to sharpen shorter blades.');
        }),
      },
      {
        label: 'Offer amnesty at the water\'s edge',
        tooltip: 'The Caliphate: −1,000 manpower, +5 legitimacy; the secession endures — "Judgment Belongs to God Alone" extended to 60 months.',
        effects: guard('ev_p_nahrawan:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.adjust(ctx, 'RSH', { manpower: -1000, legitimacy: 5 });
          h.addTagModifier(ctx, 'RSH', {
            id: 'kharijite_secession', name: '"Judgment Belongs to God Alone"', months: 60,
            effects: { unrestAll: 1 },
          });
          h.chronicle(ctx, 'war', 'Amnesty at Nahrawan: most of the seceders take it and go home; the rest keep the doctrine and the roads stay dangerous.');
        }),
      },
    ],
  },

  // ── 17 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_ali_falls',
    title: 'The Poisoned Blade at Kufa',
    worldLabel: 'Ali is struck down; Mu\'awiya takes the oath',
    desc: 'A Kharijite waits in the mosque at Kufa through the dawn prayer and opens '
      + 'Ali\'s skull with a poisoned sword. With him dies the last caliph Medina will '
      + 'ever give the empire. Mu\'awiya — who has governed Syria for twenty years and '
      + 'commanded its treasury, its army and its bishops like a man playing an '
      + 'instrument he built himself — receives the oath, the tradition says, at '
      + 'Jerusalem, and prays at Golgotha and Gethsemane so the whole city can watch. '
      + 'The capital is Damascus now. Medina keeps the tombs.',
    forTag: 'both',
    date: { y: 661, m: 1 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'An empire ruled from Damascus',
        tooltip: 'The Caliphate becomes the Umayyad Caliphate: Mu\'awiya enthroned, +2 stability, +10 legitimacy, the Fitna modifier ends. If it holds Jerusalem: +15 influence points and the city −1 unrest for 24 months.',
        effects: guard('ev_p_ali_falls:0', (ctx) => {
          const h = ctx.helpers;
          const r = ctx.game.tags.RSH;
          if (!r || r.alive === false) return;
          h.setRuler(ctx, 'RSH', { name: 'Mu\'awiya ibn Abi Sufyan', title: 'Commander of the Faithful', gov: 5, infl: 5, mar: 3, age: 59 });
          r.name = 'Umayyad Caliphate';
          h.removeModifier(ctx, 'RSH', 'first_fitna');
          h.adjust(ctx, 'RSH', { stability: 2, legitimacy: 10 });
          h.setFlag(ctx, 'muawiyaCaliph', true);
          if (h.controls(ctx, 'RSH', 'Jerusalem')) {
            h.adjust(ctx, 'RSH', { infl: 15 });
            h.addProvinceModifier(ctx, 'Jerusalem', {
              id: 'oath_at_jerusalem', name: 'The Oath at Jerusalem', months: 24, effects: { unrest: -1 },
            });
            h.chronicle(ctx, 'era', 'Ali dies at prayer in Kufa; Mu\'awiya takes the oath at Jerusalem and prays at Golgotha with the holy city for a stage.');
          } else {
            h.chronicle(ctx, 'era', 'Ali dies at prayer in Kufa; Mu\'awiya takes the oath at Damascus, and the caliphate becomes a Syrian state.');
          }
        }),
      },
      {
        label: 'Keep Medina\'s stipends flowing',
        tooltip: 'The same succession, softened south: −120 talents to the old families of Medina; +1 stability, +15 legitimacy. The pious are not reconciled, merely paid.',
        effects: guard('ev_p_ali_falls:1', (ctx) => {
          const h = ctx.helpers;
          const r = ctx.game.tags.RSH;
          if (!r || r.alive === false) return;
          h.setRuler(ctx, 'RSH', { name: 'Mu\'awiya ibn Abi Sufyan', title: 'Commander of the Faithful', gov: 5, infl: 5, mar: 3, age: 59 });
          r.name = 'Umayyad Caliphate';
          h.removeModifier(ctx, 'RSH', 'first_fitna');
          h.adjust(ctx, 'RSH', { treasury: -120, stability: 1, legitimacy: 15 });
          h.setFlag(ctx, 'muawiyaCaliph', true);
          h.chronicle(ctx, 'era', 'Ali dies at prayer in Kufa; Mu\'awiya rules from Damascus and pensions Medina into a dignified quiet.');
        }),
      },
    ],
  },

  // ── 18 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_seventy_families',
    title: 'Seventy Families from Tiberias',
    desc: 'The Umayyad peace, for the Jews of the land, is a ledger: the dhimma, the '
      + 'poll-tax, and in exchange a quiet that Heraclius never offered. Now the '
      + 'governor grants what five centuries of emperors refused — seventy families '
      + 'from Tiberias may settle in Jerusalem, in the quarter south of the bare '
      + 'Mount. Centuries on, letters in a Cairo storeroom will still remember the '
      + 'negotiation and the names.',
    forTag: 'both',
    trigger: safeTrigger('ev_p_seventy_families', (ctx) =>
      dateGE(ctx, 662, 4) && alive(ctx, 'RSH')
      && !!ctx.helpers.getFlag(ctx, 'muawiyaCaliph')
      && ctx.helpers.controls(ctx, 'RSH', 'Jerusalem')),
    aiOption: 0,
    options: [
      {
        label: 'Take the houses by the Mount',
        tooltip: '500 Jews move from Tiberias to Jerusalem; Jerusalem gains "The Returned Community" (+5% production, permanent). If the Return still stands as a polity: +5 legitimacy and the Priests of the Mount +5 approval.',
        effects: guard('ev_p_seventy_families:0', (ctx) => {
          const h = ctx.helpers;
          h.addPopulation(ctx, 'Tiberias', { r: 'judaism', c: 'galilean', n: -500 });
          h.addPopulation(ctx, 'Jerusalem', { r: 'judaism', c: 'galilean', n: 500 });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'returned_community', name: 'The Returned Community', months: -1,
            effects: { prodMult: 1.05 },
          });
          if (alive(ctx, 'JUD')) {
            h.adjust(ctx, 'JUD', { legitimacy: 5 });
            h.factionShift(ctx, 'JUD', 'priests', 5);
          }
          h.chronicle(ctx, 'era', 'Seventy families from Tiberias settle in Jerusalem by the caliph\'s leave — the first Jewish quarter in the city since the emperors banned even mourning visits.');
        }),
      },
      {
        label: 'Stay by the lake, send the poets',
        tooltip: 'No one moves; Tiberias remains the community\'s head. If the Return stands: +15 influence points — the academies keep their weight, and Jerusalem stays a pilgrimage, not an address.',
        effects: guard('ev_p_seventy_families:1', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'JUD')) h.adjust(ctx, 'JUD', { infl: 15 });
          h.chronicle(ctx, 'era', 'The governor\'s offer is weighed in Tiberias and declined with thanks; the poets go up to Jerusalem for the festivals and come home to the lake.');
        }),
      },
    ],
  },

  // ── 19 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_constans_west',
    title: 'The Emperor Abandons the City',
    worldLabel: 'Constans II moves the court west, to Rome and Syracuse',
    desc: 'Constans II — grandson of Heraclius, and an emperor who had his own brother '
      + 'ordained and then executed — can no longer sleep in Constantinople, where the '
      + 'crowds call him Cain in the Hippodrome. He takes the court west: twelve days '
      + 'in Rome, the first emperor there in two centuries, long enough to strip the '
      + 'gilded bronze from the Pantheon\'s roof; then Syracuse, where he plans to '
      + 'move the empire\'s center and the empire declines to follow.',
    forTag: 'both',
    date: { y: 663, m: 7 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Strip the Pantheon\'s roof',
        tooltip: 'Byzantium: Constans II enthroned; +120 talents of bronze, −10 legitimacy. Rome it holds: +2 unrest for 36 months. Constantinople: "The City Without Its Emperor" (+1 unrest) for 60 months.',
        effects: guard('ev_p_constans_west:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'BYZ')) return;
          h.setRuler(ctx, 'BYZ', { name: 'Constans II', title: 'Basileus', gov: 2, infl: 1, mar: 3, age: 32 });
          h.adjust(ctx, 'BYZ', { treasury: 120, legitimacy: -10 });
          if (h.controls(ctx, 'BYZ', 'Roma')) {
            h.addProvinceModifier(ctx, 'Roma', {
              id: 'bronze_stripped', name: 'The Bronze Stripped', months: 36, effects: { unrest: 2 },
            });
          }
          if (h.controls(ctx, 'BYZ', 'Byzantion')) {
            h.addProvinceModifier(ctx, 'Byzantion', {
              id: 'city_abandoned', name: 'The City Without Its Emperor', months: 60, effects: { unrest: 1 },
            });
          }
          h.chronicle(ctx, 'era', 'Constans II abandons Constantinople for the west: twelve days in Rome, the Pantheon\'s roof in his baggage, and a new court at Syracuse.');
        }),
      },
      {
        label: 'Leave Rome its bronze',
        tooltip: 'Byzantium: Constans II enthroned; −5 legitimacy only — the Pope keeps his roof, the court still goes to Syracuse, and Constantinople still gets the +1 unrest for 60 months.',
        effects: guard('ev_p_constans_west:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'BYZ')) return;
          h.setRuler(ctx, 'BYZ', { name: 'Constans II', title: 'Basileus', gov: 2, infl: 1, mar: 3, age: 32 });
          h.adjust(ctx, 'BYZ', { legitimacy: -5 });
          if (h.controls(ctx, 'BYZ', 'Byzantion')) {
            h.addProvinceModifier(ctx, 'Byzantion', {
              id: 'city_abandoned', name: 'The City Without Its Emperor', months: 60, effects: { unrest: 1 },
            });
          }
          h.chronicle(ctx, 'era', 'Constans II moves the court west to Syracuse; Rome keeps its bronze and the Queen of Cities keeps her grievance.');
        }),
      },
    ],
  },

  // ── 20 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_sufyani_order',
    title: 'The Sufyani Order',
    worldLabel: 'Damascus keeps the old administrators at their desks',
    desc: 'Mu\'awiya\'s empire runs on other people\'s clerks: the chancery of Damascus '
      + 'is Greek, headed by the Christian Sarjun son of Mansur, whose family kept the '
      + 'ledgers for Heraclius and whose grandson will write hymns the Church still '
      + 'sings. The coins are Byzantine dies with the crosses filed off. Every summer '
      + 'the cavalry rides into Anatolia and comes back with plunder and captives, '
      + 'regular as harvest.',
    forTag: 'both',
    date: { y: 664, m: 5 },
    world: true,
    aiOption: 0,
    options: [
      {
        label: 'Keep the old desks',
        tooltip: 'The Caliphate: +20 governance points, "The Old Desks Kept" (+8% income, −15% administration) for 10 years. Byzantine Cappadocia (Caesarea Mazaca, Tyana, Ancyra): "The Yearly Raids" (+1 unrest) for 60 months.',
        effects: guard('ev_p_sufyani_order:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.adjust(ctx, 'RSH', { gov: 20 });
          h.addTagModifier(ctx, 'RSH', {
            id: 'sufyani_order', name: 'The Old Desks Kept', months: 120,
            effects: { incomeMult: 1.08, adminMult: 0.85 },
          });
          if (alive(ctx, 'BYZ')) {
            for (const n of ['Caesarea Mazaca', 'Tyana', 'Ancyra']) {
              if (h.controls(ctx, 'BYZ', n)) {
                h.addProvinceModifier(ctx, n, {
                  id: 'yearly_raids', name: 'The Yearly Raids', months: 60, effects: { unrest: 1 },
                });
              }
            }
          }
          h.chronicle(ctx, 'era', 'The Sufyani order: Sarjun\'s Greek chancery, coins with the crosses filed off, and the cavalry into Anatolia every summer, regular as harvest.');
        }),
      },
      {
        label: 'Arabize the chancery at once',
        tooltip: 'The Caliphate: +10 legitimacy, but "The Chancery Stumbles" (−8% income) for 36 months — the new clerks learn double-entry the expensive way. The raids ride regardless.',
        effects: guard('ev_p_sufyani_order:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.adjust(ctx, 'RSH', { legitimacy: 10 });
          h.addTagModifier(ctx, 'RSH', {
            id: 'chancery_stumbles', name: 'The Chancery Stumbles', months: 36,
            effects: { incomeMult: 0.92 },
          });
          if (alive(ctx, 'BYZ')) {
            for (const n of ['Caesarea Mazaca', 'Tyana', 'Ancyra']) {
              if (h.controls(ctx, 'BYZ', n)) {
                h.addProvinceModifier(ctx, n, {
                  id: 'yearly_raids', name: 'The Yearly Raids', months: 60, effects: { unrest: 1 },
                });
              }
            }
          }
          h.chronicle(ctx, 'era', 'Damascus dismisses the Greek chancery a generation early; the ledgers suffer in a new alphabet while the summer raids ride on schedule.');
        }),
      },
    ],
  },

  // ── 21 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_soap_dish',
    title: 'A Soap Dish in Syracuse',
    worldLabel: 'Constans II is murdered in his bath; Constantine IV succeeds',
    desc: 'In the baths of Syracuse a chamberlain named Andreas waits until the '
      + 'Emperor\'s head is lathered, brains him with the soap dish, and walks out. So '
      + 'ends the reign that killed a brother, deposed a pope and abandoned the '
      + 'Bosporus. His son Constantine, seventeen and already harder than the father, '
      + 'sails from Constantinople to collect the crown and the corpse.',
    forTag: 'both',
    date: { y: 668, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The fleet sails home to the Bosporus',
        tooltip: 'Byzantium: Constantine IV enthroned (Justinian, an infant heir, in the cradle); −1 stability, +5 legitimacy, and "The City Without Its Emperor" lifted from Constantinople.',
        effects: guard('ev_p_soap_dish:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'BYZ')) return;
          h.setRuler(ctx, 'BYZ', { name: 'Constantine IV', title: 'Basileus', gov: 3, infl: 3, mar: 4, age: 17 });
          h.setHeir(ctx, 'BYZ', { name: 'Justinian', gov: 3, infl: 2, mar: 3, age: 0 });
          h.adjust(ctx, 'BYZ', { stability: -1, legitimacy: 5 });
          h.removeModifier(ctx, 'Byzantion', 'city_abandoned');
          h.chronicle(ctx, 'ruler', 'Constans II is murdered in his bath at Syracuse with a soap dish; Constantine IV brings the court home to Constantinople.');
        }),
      },
      {
        label: 'Punish Sicily first',
        tooltip: 'Byzantium: the same succession; +80 talents of confiscations from the conspirators, −5 legitimacy, and Syracuse +2 unrest for 24 months. The modifier on Constantinople lifts all the same.',
        effects: guard('ev_p_soap_dish:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'BYZ')) return;
          h.setRuler(ctx, 'BYZ', { name: 'Constantine IV', title: 'Basileus', gov: 3, infl: 3, mar: 4, age: 17 });
          h.setHeir(ctx, 'BYZ', { name: 'Justinian', gov: 3, infl: 2, mar: 3, age: 0 });
          h.adjust(ctx, 'BYZ', { treasury: 80, stability: -1, legitimacy: -5 });
          if (h.controls(ctx, 'BYZ', 'Syracusae')) {
            h.addProvinceModifier(ctx, 'Syracusae', {
              id: 'usurper_purged', name: 'The Usurper Purged', months: 24, effects: { unrest: 2 },
            });
          }
          h.removeModifier(ctx, 'Byzantion', 'city_abandoned');
          h.chronicle(ctx, 'ruler', 'Constans II dies under a soap dish; his son scours Syracuse for conspirators before sailing the court home.');
        }),
      },
    ],
  },

  // ── 22 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_cyzicus',
    title: 'The Fleet Winters at Cyzicus',
    worldLabel: 'The long assault on Constantinople begins',
    desc: 'Mu\'awiya commits the empire\'s whole weight to the one prize that would end '
      + 'the war of the faiths in a sentence. The Arab fleet takes the peninsula of '
      + 'Cyzicus, across the Marmara from the City, and winters there — and returns, '
      + 'and winters again, year upon year, probing the sea walls each sailing season. '
      + 'Whoever holds Constantinople is now besieged by a calendar as much as by a '
      + 'fleet.',
    forTag: 'both',
    date: { y: 670, m: 4 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Year upon year',
        tooltip: 'If Byzantium holds Constantinople and the Caliphate can reach it: war between them (if not already), 8 Caliphate ships, "Winter Harbors at Cyzicus" (+8% reinforcement, 96 months), and Constantinople +1 unrest for 96 months.',
        effects: guard('ev_p_cyzicus:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH') || !alive(ctx, 'BYZ')) return;
          if (!h.controls(ctx, 'BYZ', 'Byzantion')) {
            h.chronicle(ctx, 'war', 'The great expedition against Constantinople is mustered — and finds the City no longer Roman; the fleets look for a different war.');
            return;
          }
          const base = ['Antioch', 'Tarsus', 'Laodicea', 'Damascus', 'Alexandria', 'Emesa']
            .find((n) => h.controls(ctx, 'RSH', n));
          if (!base) {
            h.chronicle(ctx, 'war', 'Damascus plans the great expedition against the City, but holds no Syrian base to launch it from; the plan stays on parchment.');
            return;
          }
          if (!warBetween(ctx, 'RSH', 'BYZ')) h.declareWar(ctx, 'RSH', 'BYZ', 'The War for the City');
          const port = ['Laodicea', 'Tyre', 'Sidon', 'Berytus', 'Ptolemais', 'Caesarea Maritima', 'Alexandria']
            .find((n) => h.controls(ctx, 'RSH', n));
          if (port) h.spawnFleet(ctx, 'RSH', port, 8, { name: 'The Fleet of the Long Assault' });
          h.addTagModifier(ctx, 'RSH', {
            id: 'winter_at_cyzicus', name: 'Winter Harbors at Cyzicus', months: 96,
            effects: { reinforceMult: 1.08 },
          });
          h.addProvinceModifier(ctx, 'Byzantion', {
            id: 'long_assault', name: 'The Long Assault', months: 96, effects: { unrest: 1 },
          });
          h.chronicle(ctx, 'war', 'The Arab fleet takes Cyzicus and winters across the water from the City; the siege becomes a calendar.');
        }),
      },
      {
        label: 'One great storm instead',
        tooltip: 'The same conditions, spent faster: −150 talents, 10 ships, "The Great Storm" (+1 siege ability, +8% reinforcement) for 48 months only. All or nothing before the treasury objects.',
        effects: guard('ev_p_cyzicus:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH') || !alive(ctx, 'BYZ')) return;
          if (!h.controls(ctx, 'BYZ', 'Byzantion')) {
            h.chronicle(ctx, 'war', 'The great expedition against Constantinople is mustered — and finds the City no longer Roman; the fleets look for a different war.');
            return;
          }
          const base = ['Antioch', 'Tarsus', 'Laodicea', 'Damascus', 'Alexandria', 'Emesa']
            .find((n) => h.controls(ctx, 'RSH', n));
          if (!base) {
            h.chronicle(ctx, 'war', 'Damascus plans the great expedition against the City, but holds no Syrian base to launch it from; the plan stays on parchment.');
            return;
          }
          if (!warBetween(ctx, 'RSH', 'BYZ')) h.declareWar(ctx, 'RSH', 'BYZ', 'The War for the City');
          const port = ['Laodicea', 'Tyre', 'Sidon', 'Berytus', 'Ptolemais', 'Caesarea Maritima', 'Alexandria']
            .find((n) => h.controls(ctx, 'RSH', n));
          if (port) h.spawnFleet(ctx, 'RSH', port, 10, { name: 'The Fleet of the Long Assault' });
          h.adjust(ctx, 'RSH', { treasury: -150 });
          h.addTagModifier(ctx, 'RSH', {
            id: 'winter_at_cyzicus', name: 'The Great Storm', months: 48,
            effects: { siegeBonus: 1, reinforceMult: 1.08 },
          });
          h.addProvinceModifier(ctx, 'Byzantion', {
            id: 'long_assault', name: 'The Long Assault', months: 48, effects: { unrest: 1 },
          });
          h.chronicle(ctx, 'war', 'Damascus stakes a treasury on one great assault against the City rather than ten patient ones.');
        }),
      },
    ],
  },

  // ── 23 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_mardaites',
    title: 'The Mardaites Come Down the Mountain',
    desc: 'While the caliphate\'s fleets point at Constantinople, its own coast begins '
      + 'to bleed: the Mardaites — Christian highlanders of the Lebanon and Amanus, '
      + 'paid in Roman gold and joined by every runaway slave and deserter between '
      + 'the mountains and the sea — raid down to the coast roads behind the lines. '
      + 'Damascus discovers what Rome has known for centuries: a mountain is a '
      + 'frontier that never signs anything.',
    forTag: 'both',
    trigger: safeTrigger('ev_p_mardaites', (ctx) =>
      dateGE(ctx, 672, 6) && alive(ctx, 'BYZ') && alive(ctx, 'RSH')
      && ['Tyre', 'Sidon', 'Berytus', 'Byblos', 'Tripolis']
        .some((n) => ctx.helpers.controls(ctx, 'RSH', n))),
    aiOption: 0,
    options: [
      {
        label: 'Pay the mountain men',
        tooltip: 'Byzantium: −60 talents, +15 influence points. The Caliphate\'s Phoenician coast: "Mardaite Raids" (+2 unrest, −10% tax) for 48 months.',
        effects: guard('ev_p_mardaites:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'BYZ', { treasury: -60, infl: 15 });
          for (const n of ['Tyre', 'Sidon', 'Berytus', 'Byblos', 'Tripolis']) {
            if (h.controls(ctx, 'RSH', n)) {
              h.addProvinceModifier(ctx, n, {
                id: 'mardaite_raids', name: 'Mardaite Raids', months: 48,
                effects: { unrest: 2, taxMult: 0.9 },
              });
            }
          }
          h.chronicle(ctx, 'war', 'Roman gold goes up the Lebanon and Mardaite raids come down it; the caliphate\'s coast bleeds behind its own lines.');
        }),
      },
      {
        label: 'Let them raid unpaid',
        tooltip: 'No talents spent; the raids run on plunder alone — the same coastal modifier, but for 24 months. Enthusiasm without wages has a shorter season.',
        effects: guard('ev_p_mardaites:1', (ctx) => {
          const h = ctx.helpers;
          for (const n of ['Tyre', 'Sidon', 'Berytus', 'Byblos', 'Tripolis']) {
            if (h.controls(ctx, 'RSH', n)) {
              h.addProvinceModifier(ctx, n, {
                id: 'mardaite_raids', name: 'Mardaite Raids', months: 24,
                effects: { unrest: 2, taxMult: 0.9 },
              });
            }
          }
          h.chronicle(ctx, 'war', 'The Mardaites raid the caliphate\'s coast for plunder alone; without Roman wages the mountain\'s enthusiasm has a season.');
        }),
      },
    ],
  },

  // ── 24 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_greek_fire',
    title: 'The Fire on the Water',
    worldLabel: 'Kallinikos\' siphons burn the fleet before Constantinople',
    desc: 'A Syrian refugee architect named Kallinikos has given the City a weapon its '
      + 'enemies will spend eight centuries failing to copy: a siphon that throws '
      + 'burning liquid that water feeds rather than quenches. Off the sea walls the '
      + 'dromons close with the wintering fleet and set the water itself alight; '
      + 'sailors who dive from their burning decks surface in a burning sea.',
    forTag: 'both',
    date: { y: 678, m: 6 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The sea burns',
        tooltip: 'If Byzantium holds Constantinople: the Caliphate\'s fleets are halved, +2 war exhaustion; Byzantium +10 legitimacy, +1 stability, "The Siphons of Kallinikos" (+5% morale, permanent) — and +10 war score if at war.',
        effects: guard('ev_p_greek_fire:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'BYZ') || !h.controls(ctx, 'BYZ', 'Byzantion')) return;
          h.adjust(ctx, 'BYZ', { legitimacy: 10, stability: 1 });
          h.addTagModifier(ctx, 'BYZ', {
            id: 'kallinikos_siphons', name: 'The Siphons of Kallinikos', months: -1,
            effects: { moraleMult: 1.05 },
          });
          if (alive(ctx, 'RSH')) {
            for (const f of Object.values(ctx.game.fleets || {})) {
              if (f && f.tag === 'RSH' && f.ships > 1) f.ships = Math.max(1, Math.floor(f.ships / 2));
            }
            h.adjust(ctx, 'RSH', { warExhaustion: 2 });
            addWarscore(ctx, findWar(ctx.game, 'RSH', 'BYZ'), 'BYZ', 10);
          }
          h.chronicle(ctx, 'war', 'Greek fire: Kallinikos\' siphons burn the besieging fleet on the water before Constantinople, and the sea itself takes the Roman side.');
        }),
      },
      {
        label: 'Guard the secret jealously',
        tooltip: 'The same burning — Byzantium takes +10 legitimacy and +20 influence points instead of the stability, and the formula becomes a state secret worth embassies.',
        effects: guard('ev_p_greek_fire:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'BYZ') || !h.controls(ctx, 'BYZ', 'Byzantion')) return;
          h.adjust(ctx, 'BYZ', { legitimacy: 10, infl: 20 });
          h.addTagModifier(ctx, 'BYZ', {
            id: 'kallinikos_siphons', name: 'The Siphons of Kallinikos', months: -1,
            effects: { moraleMult: 1.05 },
          });
          if (alive(ctx, 'RSH')) {
            for (const f of Object.values(ctx.game.fleets || {})) {
              if (f && f.tag === 'RSH' && f.ships > 1) f.ships = Math.max(1, Math.floor(f.ships / 2));
            }
            h.adjust(ctx, 'RSH', { warExhaustion: 2 });
            addWarscore(ctx, findWar(ctx.game, 'RSH', 'BYZ'), 'BYZ', 10);
          }
          h.chronicle(ctx, 'war', 'Greek fire burns the fleet before the City; the formula goes into the palace vaults, and foreign envoys begin asking very polite questions.');
        }),
      },
    ],
  },

  // ── 25 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_thirty_years',
    title: 'The Thirty Years\' Peace',
    worldLabel: 'The caliph pays tribute to the emperor — the tide stops',
    desc: 'The arithmetic of the long assault has finally been done in Damascus, and it '
      + 'does not favor continuing. The caliph\'s envoys come to Constantinople with '
      + 'terms no one under forty believed possible: thirty years of peace, and '
      + 'tribute paid by the caliph to the emperor — gold, horses, and captives, '
      + 'yearly. For the first time since the columns came out of Arabia, the tide '
      + 'visibly stops.',
    forTag: 'both',
    date: { y: 679, m: 3 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The tide visibly stops',
        tooltip: 'If both stand and the City is Roman: the war ends (white peace); the Caliphate pays 150 talents and "Tribute Paid to Rome" (−5% income, 120 months); Byzantium gains the 150, +15 legitimacy and "The Caliph\'s Tribute" (+5% income, 120 months).',
        effects: guard('ev_p_thirty_years:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH') || !alive(ctx, 'BYZ')) return;
          if (!h.controls(ctx, 'BYZ', 'Byzantion')) {
            h.chronicle(ctx, 'diplomacy', 'There is no peace of the thirty years in this world; the City that would have collected the tribute is not Rome\'s to bargain with.');
            return;
          }
          h.endWar(ctx, 'RSH', 'BYZ', null);
          h.adjust(ctx, 'RSH', { treasury: -150, legitimacy: -10 });
          h.adjust(ctx, 'BYZ', { treasury: 150, legitimacy: 15 });
          h.addTagModifier(ctx, 'RSH', {
            id: 'tribute_to_rome', name: 'Tribute Paid to Rome', months: 120, effects: { incomeMult: 0.95 },
          });
          h.addTagModifier(ctx, 'BYZ', {
            id: 'caliphs_tribute', name: 'The Caliph\'s Tribute', months: 120, effects: { incomeMult: 1.05 },
          });
          const byz = ctx.game.tags.BYZ, rsh = ctx.game.tags.RSH;
          if (byz && byz.opinion) byz.opinion.RSH = -50;
          if (rsh && rsh.opinion) rsh.opinion.BYZ = -50;
          h.chronicle(ctx, 'peace', 'The Thirty Years\' Peace: tribute paid by the caliph to the emperor, yearly — the conquest tide visibly stops for the first time.');
        }),
      },
      {
        label: 'Refuse the tribute clause',
        tooltip: 'Pride over arithmetic: no peace is signed. The Caliphate keeps its 150 talents and gains +5 legitimacy; the war — if there is one — grinds on with both fleets already spent.',
        effects: guard('ev_p_thirty_years:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.adjust(ctx, 'RSH', { legitimacy: 5 });
          h.chronicle(ctx, 'diplomacy', 'Damascus reads the tribute clause aloud once and burns the draft; the war continues on pride\'s account.');
        }),
      },
    ],
  },

  // ── 26 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_yazid',
    title: 'The Oath for Yazid',
    worldLabel: 'Mu\'awiya dies; his son inherits the caliphate',
    desc: 'Mu\'awiya dies in his bed at Damascus — alone among the first five rulers of '
      + 'the conquests to manage it — having spent his last years collecting oaths for '
      + 'his son Yazid: a hunting, verse-writing prince who will inherit the empire '
      + 'the way one inherits an orchard. It is succession by blood, kingship by any '
      + 'other name, and the pious of Medina and Kufa say the word aloud and never '
      + 'forgive it.',
    forTag: 'both',
    date: { y: 680, m: 5 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Kingship enters Islam',
        tooltip: 'The Caliphate: Yazid enthroned; −10 legitimacy, −1 stability. The oath was collected in advance; the resentment collects itself.',
        effects: guard('ev_p_yazid:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.setRuler(ctx, 'RSH', { name: 'Yazid ibn Mu\'awiya', title: 'Commander of the Faithful', gov: 2, infl: 2, mar: 3, age: 34 });
          h.adjust(ctx, 'RSH', { legitimacy: -10, stability: -1 });
          h.chronicle(ctx, 'ruler', 'Mu\'awiya dies at Damascus with the oath for his son already sworn; kingship enters Islam, and the pious keep the receipt.');
        }),
      },
      {
        label: 'Summon the notables to swear again',
        tooltip: 'The Caliphate: Yazid enthroned; −100 talents in robes and gifts for a second, public oath — −5 legitimacy, −1 stability. Two refusals are recorded: Husayn ibn Ali, and Ibn al-Zubayr.',
        effects: guard('ev_p_yazid:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.setRuler(ctx, 'RSH', { name: 'Yazid ibn Mu\'awiya', title: 'Commander of the Faithful', gov: 2, infl: 2, mar: 3, age: 34 });
          h.adjust(ctx, 'RSH', { treasury: -100, legitimacy: -5, stability: -1 });
          h.chronicle(ctx, 'ruler', 'Yazid buys a second oath in public robes; two names decline the invitation, and both will cost more than the robes did.');
        }),
      },
    ],
  },

  // ── 27 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_karbala',
    title: 'Karbala',
    worldLabel: 'Husayn ibn Ali dies at Karbala',
    desc: 'Husayn, the Prophet\'s grandson, rides for Kufa with his family and a '
      + 'handful of companions to answer letters begging him to come and lead. The '
      + 'letters\' authors stay home. On the plain of Karbala the governor\'s cavalry '
      + 'pens the little caravan away from the Euphrates for eight days, and on the '
      + 'tenth of Muharram kills Husayn and seventy-two others, thirsty, within sound '
      + 'of the water. Damascus has won the field. What it has lost will take '
      + 'centuries to count.',
    forTag: 'both',
    date: { y: 680, m: 10 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Pen them from the river',
        tooltip: 'The Caliphate: −15 legitimacy; "The Blood of Karbala" (+0.5 unrest everywhere, permanent), and its cities of lower Iraq mourn (+2 unrest for 60 months).',
        effects: guard('ev_p_karbala:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.adjust(ctx, 'RSH', { legitimacy: -15 });
          h.addTagModifier(ctx, 'RSH', {
            id: 'blood_of_karbala', name: 'The Blood of Karbala', months: -1,
            effects: { unrestAll: 0.5 },
          });
          for (const n of ['Babylon', 'Nehardea', 'Uruk', 'Seleucia-Ctesiphon']) {
            if (h.controls(ctx, 'RSH', n)) {
              h.addProvinceModifier(ctx, n, {
                id: 'mourning_of_kufa', name: 'The Mourning of Kufa', months: 60, effects: { unrest: 2 },
              });
            }
          }
          h.chronicle(ctx, 'era', 'Karbala: Husayn and seventy-two companions die thirsty within sound of the Euphrates; the tenth of Muharram acquires its meaning.');
        }),
      },
      {
        label: 'Send the survivors to Damascus in chains',
        tooltip: 'The Caliphate: −10 legitimacy and −20 influence points — the women of the house preach the dead man\'s case in the caliph\'s own audience hall, and the story leaves the city faster than the chains did.',
        effects: guard('ev_p_karbala:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.adjust(ctx, 'RSH', { legitimacy: -10, infl: -20 });
          h.addTagModifier(ctx, 'RSH', {
            id: 'blood_of_karbala', name: 'The Blood of Karbala', months: -1,
            effects: { unrestAll: 0.5 },
          });
          h.chronicle(ctx, 'era', 'Karbala, then the procession of chained survivors to Damascus — where Zaynab bint Ali turns the caliph\'s audience hall into the first majlis of mourning.');
        }),
      },
    ],
  },

  // ── 28 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_second_fitna',
    title: 'The Second Fitna',
    worldLabel: 'Ibn al-Zubayr claims the caliphate; Syria sickens',
    desc: 'Yazid is dead at thirty-seven, his son follows him in weeks, and the empire '
      + 'has two caliphs: a Zubayrid in Mecca, acclaimed from Iraq to Egypt, whose '
      + 'sanctuary has already burned once under a besieger\'s stones — and whatever '
      + 'the Umayyad house can salvage from a Syria that plague and famine are '
      + 'working through like a second army.',
    forTag: 'both',
    date: { y: 683, m: 7 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Hold Syria, lose the rest',
        tooltip: 'The Caliphate: a caretaker in Damascus; −2 stability, −10 legitimacy, "The Second Fitna" (−8% morale, −10% income) for 96 months; its Syrian cities take "Plague and Famine" (+2 unrest, −15% tax) for 36 months.',
        effects: guard('ev_p_second_fitna:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.setRuler(ctx, 'RSH', { name: 'Mu\'awiya II', title: 'Commander of the Faithful', gov: 1, infl: 1, mar: 1, age: 22 });
          h.adjust(ctx, 'RSH', { stability: -2, legitimacy: -10 });
          h.addTagModifier(ctx, 'RSH', {
            id: 'second_fitna', name: 'The Second Fitna', months: 96,
            effects: { moraleMult: 0.92, incomeMult: 0.9 },
          });
          for (const n of ['Damascus', 'Emesa', 'Chalcis', 'Beroea']) {
            if (h.controls(ctx, 'RSH', n)) {
              h.addProvinceModifier(ctx, n, {
                id: 'plague_in_syria', name: 'Plague and Famine', months: 36,
                effects: { unrest: 2, taxMult: 0.85 },
              });
            }
          }
          h.setFlag(ctx, 'secondFitna', true);
          h.chronicle(ctx, 'era', 'The Second Fitna: Ibn al-Zubayr is caliph in Mecca, the Kaaba bears siege-scorch, and plague works through Syria like a second army.');
        }),
      },
      {
        label: 'Treat with Mecca for a season',
        tooltip: 'The Caliphate: −20 legitimacy, −1 stability — half the empire prays for Ibn al-Zubayr by name while Damascus pretends not to hear. Syria takes the same plague; the Fitna modifier still lands.',
        effects: guard('ev_p_second_fitna:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.setRuler(ctx, 'RSH', { name: 'Mu\'awiya II', title: 'Commander of the Faithful', gov: 1, infl: 1, mar: 1, age: 22 });
          h.adjust(ctx, 'RSH', { stability: -1, legitimacy: -20 });
          h.addTagModifier(ctx, 'RSH', {
            id: 'second_fitna', name: 'The Second Fitna', months: 96,
            effects: { moraleMult: 0.92, incomeMult: 0.9 },
          });
          for (const n of ['Damascus', 'Emesa', 'Chalcis', 'Beroea']) {
            if (h.controls(ctx, 'RSH', n)) {
              h.addProvinceModifier(ctx, n, {
                id: 'plague_in_syria', name: 'Plague and Famine', months: 36,
                effects: { unrest: 2, taxMult: 0.85 },
              });
            }
          }
          h.setFlag(ctx, 'secondFitna', true);
          h.chronicle(ctx, 'era', 'The Second Fitna: Damascus buys a truce with Mecca it does not intend to keep, while half the empire prays for Ibn al-Zubayr by name.');
        }),
      },
    ],
  },

  // ── 29 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_marj_rahit',
    title: 'Marj Rahit',
    desc: 'On the meadow north of Damascus the Umayyad cause, reduced to Syria and an '
      + 'old man\'s nerve, fights the Qaysi tribes who declared for Mecca — and wins. '
      + 'Marwan, of the house\'s other branch, takes the oath that evening. The dynasty '
      + 'holds Syria by the sword-edge; the blood feud between Qays and Kalb that '
      + 'begins on this meadow will outlive everyone who can remember why.',
    forTag: 'both',
    trigger: safeTrigger('ev_p_marj_rahit', (ctx) =>
      dateGE(ctx, 684, 8) && alive(ctx, 'RSH') && !!ctx.helpers.getFlag(ctx, 'secondFitna')),
    aiOption: 0,
    options: [
      {
        label: 'The sword-edge holds',
        tooltip: 'The Caliphate: Marwan enthroned, Abd al-Malik heir; +10 martial points, +5 legitimacy, −2,000 manpower; Damascus +1 unrest for 24 months (the feud begins).',
        effects: guard('ev_p_marj_rahit:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.setRuler(ctx, 'RSH', { name: 'Marwan ibn al-Hakam', title: 'Commander of the Faithful', gov: 3, infl: 4, mar: 2, age: 61 });
          h.setHeir(ctx, 'RSH', { name: 'Abd al-Malik', gov: 5, infl: 4, mar: 3, age: 38 });
          h.adjust(ctx, 'RSH', { mar: 10, legitimacy: 5, manpower: -2000 });
          if (h.controls(ctx, 'RSH', 'Damascus')) {
            h.addProvinceModifier(ctx, 'Damascus', {
              id: 'qays_kalb_feud', name: 'The Qays–Kalb Feud', months: 24, effects: { unrest: 1 },
            });
          }
          h.chronicle(ctx, 'war', 'Marj Rahit: the Umayyads hold Syria by the sword-edge, Marwan takes the oath, and the Qays–Kalb feud opens its long account.');
        }),
      },
      {
        label: 'Reconcile the Qays after the field',
        tooltip: 'The Caliphate: the same succession; −100 talents in blood-money paid at once, −1,500 manpower — no feud modifier. Cheaper than a century of it.',
        effects: guard('ev_p_marj_rahit:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.setRuler(ctx, 'RSH', { name: 'Marwan ibn al-Hakam', title: 'Commander of the Faithful', gov: 3, infl: 4, mar: 2, age: 61 });
          h.setHeir(ctx, 'RSH', { name: 'Abd al-Malik', gov: 5, infl: 4, mar: 3, age: 38 });
          h.adjust(ctx, 'RSH', { treasury: -100, mar: 10, legitimacy: 5, manpower: -1500 });
          h.chronicle(ctx, 'war', 'Marj Rahit, then blood-money for the Qaysi dead before the funerals end; the meadow is paid for while it is still trampled.');
        }),
      },
    ],
  },

  // ── 30 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_abd_al_malik',
    title: 'The Caliph\'s Creed for the Caliph\'s Face',
    worldLabel: 'Abd al-Malik rebuilds the state',
    desc: 'Marwan\'s son inherits a half-empire and rebuilds it as a state: the chancery '
      + 'ordered into Arabic from Egypt to Iraq, the tax rolls audited, and the coinage '
      + 'struck anew — no emperor\'s portrait, no filed crosses, no image at all, only '
      + 'the creed in fine Kufic circles. Where every currency on earth carries a '
      + 'sovereign\'s face, the caliph\'s carries the caliph\'s God.',
    forTag: 'both',
    date: { y: 685, m: 4 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Arabic in the ledgers, the creed on the coin',
        tooltip: 'The Caliphate: Abd al-Malik enthroned; +25 governance points, +10 legitimacy, and "The Marwanid State" (+10% income, −20% administration, permanent).',
        effects: guard('ev_p_abd_al_malik:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.setRuler(ctx, 'RSH', { name: 'Abd al-Malik', title: 'Commander of the Faithful', gov: 5, infl: 4, mar: 3, age: 39 });
          h.setHeir(ctx, 'RSH', { name: 'al-Walid', gov: 3, infl: 3, mar: 3, age: 11 });
          h.adjust(ctx, 'RSH', { gov: 25, legitimacy: 10 });
          h.addTagModifier(ctx, 'RSH', {
            id: 'marwanid_state', name: 'The Marwanid State', months: -1,
            effects: { incomeMult: 1.1, adminMult: 0.8 },
          });
          h.chronicle(ctx, 'era', 'Abd al-Malik rebuilds the state: Arabic in the chancery, audited rolls, and coins that carry the caliph\'s creed where every other realm carries a face.');
        }),
      },
      {
        label: 'Keep Sarjun\'s Greek a while yet',
        tooltip: 'The Caliphate: the same accession; +25 governance points, +5 legitimacy, +1 stability, and a gentler "Marwanid State" (+5% income, −10% administration, permanent) — reform at the speed the clerks can survive.',
        effects: guard('ev_p_abd_al_malik:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.setRuler(ctx, 'RSH', { name: 'Abd al-Malik', title: 'Commander of the Faithful', gov: 5, infl: 4, mar: 3, age: 39 });
          h.setHeir(ctx, 'RSH', { name: 'al-Walid', gov: 3, infl: 3, mar: 3, age: 11 });
          h.adjust(ctx, 'RSH', { gov: 25, legitimacy: 5, stability: 1 });
          h.addTagModifier(ctx, 'RSH', {
            id: 'marwanid_state', name: 'The Marwanid State', months: -1,
            effects: { incomeMult: 1.05, adminMult: 0.9 },
          });
          h.chronicle(ctx, 'era', 'Abd al-Malik rebuilds the state at the speed the clerks can survive; Sarjun\'s Greek retires with a pension instead of a purge.');
        }),
      },
    ],
  },

  // ── 31 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_dome_rock',
    title: 'The Dome of the Rock',
    worldLabel: 'A gold dome rises on the Temple platform',
    desc: 'On the platform where two Houses stood and burned, Byzantine-trained '
      + 'craftsmen raise an octagon for the new faith: gold above, marble and mosaic '
      + 'below, over the bare rock where Abraham bound his son. Its inscriptions '
      + 'argue with the churches in their own medium — God has no son, say the '
      + 'tesserae, in letters of gold. In Tiberias and in the small returned quarter '
      + 'the liturgical poets look up at the mountain of the House bearing a house '
      + 'again, and write — some in grief, some in awe, the honest ones in both.',
    forTag: 'both',
    date: { y: 691, m: 9 },
    world: true,
    major: true,
    aiOption: (ctx) => {
      try { return ctx.helpers.controls(ctx, 'JUD', 'Jerusalem') ? 1 : 0; } catch (e) { return 0; }
    },
    options: [
      {
        label: 'Gold above the rock of the binding',
        tooltip: 'If the Caliphate holds Jerusalem: −200 talents, +15 legitimacy, +20 influence points; the Dome stands on the platform (wonder, if the Mount is bare) and Jerusalem gains "+10% tax, −0.5 unrest" permanently. The Return, if it lives: the poets\' grief — −5 legitimacy, +10 influence points.',
        effects: guard('ev_p_dome_rock:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'RSH') && h.controls(ctx, 'RSH', 'Jerusalem')) {
            h.adjust(ctx, 'RSH', { treasury: -200, legitimacy: 15, infl: 20 });
            const p = ctx.prov('Jerusalem');
            if (p && !p.wonder) p.wonder = 'dome';
            h.addProvinceModifier(ctx, 'Jerusalem', {
              id: 'dome_of_the_rock', name: 'The Dome of the Rock', months: -1,
              effects: { taxMult: 1.1, unrest: -0.5 },
            });
            if (alive(ctx, 'JUD')) h.adjust(ctx, 'JUD', { legitimacy: -5, infl: 10 });
            h.chronicle(ctx, 'era', 'The Dome of the Rock rises on the Temple platform, gold-crowned, its mosaics arguing with the churches; the mountain of the House bears a house again — not the poets\' own.');
          } else if (alive(ctx, 'JUD') && h.controls(ctx, 'JUD', 'Jerusalem')) {
            h.adjust(ctx, 'JUD', { legitimacy: 10 });
            h.chronicle(ctx, 'era', 'The year the chronicles promised a gold dome over the rock, the platform belongs to the Return; whatever rises on the Mount will rise in Hebrew.');
          } else {
            h.chronicle(ctx, 'era', 'The year of the great dome passes without one; the bare rock on the platform waits for whichever power can afford an octagon.');
          }
        }),
      },
      {
        label: 'The poets answer in verse',
        tooltip: 'The same world takes its course — but the Return, if it lives, turns grief to liturgy: "Grief and Awe" (+0.1 legitimacy a month) for 60 months instead of the legitimacy loss.',
        effects: guard('ev_p_dome_rock:1', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'RSH') && h.controls(ctx, 'RSH', 'Jerusalem')) {
            h.adjust(ctx, 'RSH', { treasury: -200, legitimacy: 15, infl: 20 });
            const p = ctx.prov('Jerusalem');
            if (p && !p.wonder) p.wonder = 'dome';
            h.addProvinceModifier(ctx, 'Jerusalem', {
              id: 'dome_of_the_rock', name: 'The Dome of the Rock', months: -1,
              effects: { taxMult: 1.1, unrest: -0.5 },
            });
            if (alive(ctx, 'JUD')) {
              h.addTagModifier(ctx, 'JUD', {
                id: 'grief_and_awe', name: 'Grief and Awe', months: 60,
                effects: { legitimacyAdd: 0.1 },
              });
            }
            h.chronicle(ctx, 'era', 'The Dome rises gold over the rock of the binding, and the piyyutim answer it — grief set in the same meters as awe, sung by the lake and under the platform\'s shadow.');
          } else if (alive(ctx, 'JUD') && h.controls(ctx, 'JUD', 'Jerusalem')) {
            h.adjust(ctx, 'JUD', { legitimacy: 10 });
            h.chronicle(ctx, 'era', 'The year the chronicles promised a gold dome over the rock, the platform belongs to the Return; the poets write of the house that never had to be mourned.');
          } else {
            h.chronicle(ctx, 'era', 'The year of the great dome passes without one; the bare rock on the platform waits for whichever power can afford an octagon.');
          }
        }),
      },
    ],
  },

  // ── 32 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_zubayr_falls',
    title: 'The Stones of al-Hajjaj',
    worldLabel: 'Ibn al-Zubayr falls at Mecca; the civil war ends',
    desc: 'Al-Hajjaj — schoolmaster turned commander, the most efficient instrument the '
      + 'Marwanid house will ever own — besieges Mecca for months, his catapults '
      + 'working through prayer times, until Ibn al-Zubayr, past seventy and out of '
      + 'everything but manner, takes his mother\'s counsel, puts on perfume, and dies '
      + 'fighting at the sanctuary door. The Second Fitna is over. What remains is not '
      + 'the community of Medina grown large; it is an empire, and it knows it.',
    forTag: 'both',
    date: { y: 692, m: 11 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The catapults do not pause for the sanctuary',
        tooltip: 'The Caliphate: +2 stability, +10 legitimacy, +10 martial points; "The Second Fitna" modifier ends. The imperial caliphate begins.',
        effects: guard('ev_p_zubayr_falls:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.removeModifier(ctx, 'RSH', 'second_fitna');
          h.setFlag(ctx, 'secondFitna', false);
          h.adjust(ctx, 'RSH', { stability: 2, legitimacy: 10, mar: 10 });
          h.chronicle(ctx, 'era', 'Ibn al-Zubayr dies at the sanctuary door under al-Hajjaj\'s stones; the civil war ends, and the imperial caliphate begins.');
        }),
      },
      {
        label: 'Starve the city instead',
        tooltip: 'The Caliphate: −100 talents for the longer siege; +1 stability, +15 legitimacy — the sanctuary is taken unbombarded, and the chroniclers note it.',
        effects: guard('ev_p_zubayr_falls:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'RSH')) return;
          h.removeModifier(ctx, 'RSH', 'second_fitna');
          h.setFlag(ctx, 'secondFitna', false);
          h.adjust(ctx, 'RSH', { treasury: -100, stability: 1, legitimacy: 15 });
          h.chronicle(ctx, 'era', 'Mecca is starved rather than stoned; Ibn al-Zubayr falls at the sanctuary door all the same, and the civil war closes its books.');
        }),
      },
    ],
  },

  // ══ THE ROAD NOT TAKEN — THE RETURN THAT STOOD, 622–695 ══════════════════
  // The victory strand: the Persian-sponsored autonomy of 614 SURVIVING the
  // decades that history denied it. Every event here runs through
  // returnStands() — the Return alive AND holding Jerusalem — so on the real
  // rails (Persia's trade of 617, Heraclius' return of 629, the conquests)
  // none of them ever fires. They complement, never duplicate, the historical
  // cards: ev_p_dome_rock already knows what to do when the platform is
  // Hebrew, and the Third Temple is raised by the mission chain, not here —
  // these events write its consequences.

  // ── V1 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_v_charter',
    title: 'The Charter of the Return',
    desc: 'Persia weighed selling the Return and found it too expensive to sell; the '
      + 'eighth year finds Jewish courts still sitting in Jerusalem, and a war-camp '
      + 'must finally say what it is. The genealogists trace Nehemiah ben Hushiel\'s '
      + 'house to the exilarchs — David\'s line kept alive through Babylon — and ask '
      + 'for a written charter of Davidic rule. The priests answer that a state on '
      + 'this mountain has an older constitution, and a mitre in it.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev_p_v_charter', (ctx) =>
      dateGE(ctx, 622, 1) && returnStands(ctx)
      && !!(ctx.game.firedEvents && ctx.game.firedEvents.ev_p_betrayal)),
    aiOption: 0,
    options: [
      {
        label: 'The scepter of the exile-house',
        tooltip: 'Davidic rule made law: +1 stability, +20 governance points; the Exilarch\'s House +10 approval; "The Line of David Restored" (+0.15 legitimacy a month, permanent).',
        effects: guard('ev_p_v_charter:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 1, gov: 20 });
          h.factionShift(ctx, 'JUD', 'exilarch', 10);
          h.addTagModifier(ctx, 'JUD', {
            id: 'line_of_david', name: 'The Line of David Restored', months: -1,
            effects: { legitimacyAdd: 0.15 },
          });
          h.setFlag(ctx, 'charterDavidic', true);
          h.chronicle(ctx, 'era', 'The Charter of the Return: the exilarch-line of Nehemiah ben Hushiel is written into law, and the autonomy Persia granted becomes a constitution Persia was never asked about.');
        }),
      },
      {
        label: 'The mitre beside the scepter',
        tooltip: 'A priestly co-regency: +12 legitimacy; the Priests of the Mount +10 approval, the Exilarch\'s House −5; "The Two Anointings" (+0.1 legitimacy a month, permanent) — and the old argument gets a standing budget (+0.5 unrest everywhere for 24 months).',
        effects: guard('ev_p_v_charter:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 12 });
          h.factionShift(ctx, 'JUD', 'priests', 10);
          h.factionShift(ctx, 'JUD', 'exilarch', -5);
          h.addTagModifier(ctx, 'JUD', {
            id: 'two_anointings', name: 'The Two Anointings', months: -1,
            effects: { legitimacyAdd: 0.1 },
          });
          h.addTagModifier(ctx, 'JUD', {
            id: 'charter_dispute', name: 'Scepter and Mitre Dispute the Charter', months: 24,
            effects: { unrestAll: 0.5 },
          });
          h.setFlag(ctx, 'charterDavidic', false);
          h.chronicle(ctx, 'era', 'The Charter of the Return: prince and priest are anointed side by side, as in the days of Zerubbabel and Joshua — and argue from the first morning, as in those days too.');
        }),
      },
    ],
  },

  // ── V2 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_v_heraclius_terms',
    title: 'The Emperor\'s Protection',
    desc: 'Heraclius has broken Persia and wants his city back, but the arithmetic of '
      + 'his exhausted empire is against a second siege. His envoys arrive with the '
      + 'next best thing: a charter of Roman "protection" — tribute, the churches '
      + 'reopened, and the prince\'s sons educated at Constantinople, where the '
      + 'baptistery is conveniently near the schoolroom. The God-Bearing Emperor '
      + 'does not name what happens to those who refuse; his chroniclers have '
      + 'already written it for him.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev_p_v_heraclius_terms', (ctx) =>
      dateGE(ctx, 629, 6) && returnStands(ctx) && alive(ctx, 'BYZ')
      && !findWar(ctx.game, 'SAS', 'BYZ') && !warBetween(ctx, 'JUD', 'BYZ')),
    aiOption: 0,
    options: [
      {
        label: 'Buy the seal, keep the walls',
        tooltip: '−150 talents and "Tribute to the Basileus" (−5% income) for 120 months; Jerusalem −1 unrest for 60 months (the churches reopen); +1 stability. Byzantine enmity cools to a watch (opinion −40).',
        effects: guard('ev_p_v_heraclius_terms:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: -150, stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'tribute_to_basileus', name: 'Tribute to the Basileus', months: 120,
            effects: { incomeMult: 0.95 },
          });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'churches_reopened', name: 'The Churches Reopened', months: 60, effects: { unrest: -1 },
          });
          const byz = ctx.game.tags.BYZ, jud = ctx.game.tags.JUD;
          if (byz && byz.opinion) byz.opinion.JUD = -40;
          if (jud && jud.opinion) jud.opinion.BYZ = -40;
          h.chronicle(ctx, 'diplomacy', 'The Return buys the Emperor\'s seal: tribute to Constantinople, the churches of Jerusalem reopened, and the sons of the prince pointedly educated at home.');
        }),
      },
      {
        label: 'The walls answer the envoys',
        tooltip: '+12 legitimacy, +15 martial points; the Fighters of the Return +8 approval. Byzantium\'s opinion falls to −180 — the Emperor\'s memory is long, and his chroniclers are patient.',
        effects: guard('ev_p_v_heraclius_terms:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 12, mar: 15 });
          h.factionShift(ctx, 'JUD', 'fighters', 8);
          const byz = ctx.game.tags.BYZ, jud = ctx.game.tags.JUD;
          if (byz && byz.opinion) byz.opinion.JUD = -180;
          if (jud && jud.opinion) jud.opinion.BYZ = -170;
          h.chronicle(ctx, 'diplomacy', 'The Emperor\'s envoys are shown the repaired breach of 614 and escorted to the gate; the Return will be protected by its own walls or not at all.');
        }),
      },
    ],
  },

  // ── V3 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_v_last_embassy',
    title: 'The Last Embassy from Ctesiphon',
    desc: 'The ally that once weighed selling the Return now comes to be weighed '
      + 'itself: Persian envoys — threadbare, magnificent, out of everything but '
      + 'protocol — ask the Jewish state their king once sponsored for silver and '
      + 'swords against the armies out of Arabia. The letter recalls fifteen years '
      + 'of friendship with great care and omits one summer of it with greater.',
    forTag: 'JUD',
    trigger: safeTrigger('ev_p_v_last_embassy', (ctx) =>
      dateGE(ctx, 636, 1) && returnStands(ctx) && alive(ctx, 'SAS') && alive(ctx, 'RSH')
      && !warBetween(ctx, 'JUD', 'SAS')
      && !ctx.helpers.getFlag(ctx, 'sasanianDynastyEnded')),
    aiOption: 1,
    options: [
      {
        label: 'Silver for the old ally',
        tooltip: '−80 talents; +15 influence points; Persia\'s opinion rises to +100. The debt of 614 is remembered — and priced.',
        effects: guard('ev_p_v_last_embassy:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: -80, infl: 15 });
          h.adjust(ctx, 'SAS', { treasury: 80 });
          const sas = ctx.game.tags.SAS, jud = ctx.game.tags.JUD;
          if (sas && sas.opinion) sas.opinion.JUD = 100;
          if (jud && jud.opinion) jud.opinion.SAS = 60;
          h.chronicle(ctx, 'diplomacy', 'Silver goes east to the dying House of Sasan: the Return repays the sponsor of 614, minus a discount for the summer of 617.');
        }),
      },
      {
        label: 'The sold do not ransom the seller',
        tooltip: '+5 legitimacy; the Exilarch\'s House +5 approval — Babylon\'s communities must live under whoever wins Iraq, and prefer their kin in Jerusalem uncommitted.',
        effects: guard('ev_p_v_last_embassy:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 5 });
          h.factionShift(ctx, 'JUD', 'exilarch', 5);
          h.chronicle(ctx, 'diplomacy', 'The Persian envoys are fed, honored, and refused; the clerk who drafts the reply was a boy in Jerusalem the year Ctesiphon ordered the garrison disbanded.');
        }),
      },
    ],
  },

  // ── V4 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_v_dhimma',
    title: 'The Letter from the Commander of the Faithful',
    desc: 'The armies that took Damascus from Rome now stand a march from Jerusalem, '
      + 'and their master writes ahead: the People of the Book holding the city of '
      + 'the prophets may keep their law, their courts, and their Mount — under the '
      + 'tax and under the peace, dhimma with more honor than any emperor ever '
      + 'drafted. The alternative is not stated. The seventy years of chronicles '
      + 'that follow will depend on the next sentence written in Jerusalem.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev_p_v_dhimma', (ctx) =>
      dateGE(ctx, 637, 10) && returnStands(ctx) && alive(ctx, 'RSH')),
    aiOption: 0,
    options: [
      {
        label: 'Terms with honor',
        tooltip: 'Peace with the Caliphate (any war between you ends); −100 talents now and "The Covenant of the Book" (−7% income, permanent tribute); +1 stability; mutual opinion set to +60.',
        effects: guard('ev_p_v_dhimma:0', (ctx) => {
          const h = ctx.helpers;
          if (warBetween(ctx, 'RSH', 'JUD')) h.endWar(ctx, 'RSH', 'JUD', null);
          h.adjust(ctx, 'JUD', { treasury: -100, stability: 1 });
          h.adjust(ctx, 'RSH', { treasury: 100 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'covenant_of_the_book', name: 'The Covenant of the Book', months: -1,
            effects: { incomeMult: 0.93 },
          });
          const rsh = ctx.game.tags.RSH, jud = ctx.game.tags.JUD;
          if (rsh && rsh.opinion) rsh.opinion.JUD = 60;
          if (jud && jud.opinion) jud.opinion.RSH = 60;
          h.chronicle(ctx, 'peace', 'The Covenant of the Book: Jerusalem pays the tax and keeps its law, its courts and its Mount — a dhimma negotiated by a state, not granted to a remnant.');
        }),
      },
      {
        label: 'The city is not granted twice',
        tooltip: '+15 legitimacy, +20 martial points; the Fighters of the Return +10 approval. The Caliphate\'s opinion falls to −150, and if there is no war yet, its army of Palestine marches to make one.',
        effects: guard('ev_p_v_dhimma:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 15, mar: 20 });
          h.factionShift(ctx, 'JUD', 'fighters', 10);
          const rsh = ctx.game.tags.RSH, jud = ctx.game.tags.JUD;
          if (rsh && rsh.opinion) rsh.opinion.JUD = -150;
          if (jud && jud.opinion) jud.opinion.RSH = -100;
          if (!warBetween(ctx, 'RSH', 'JUD')) {
            h.declareWar(ctx, 'RSH', 'JUD', 'The Reduction of the Holy House');
            const base = ['Damascus', 'Bostra', 'Emesa'].find((n) => h.controls(ctx, 'RSH', n)) || stagingProvince(ctx);
            h.spawnArmy(ctx, 'RSH', base, {
              inf: 8, cav: 4, name: 'Army of Palestine',
              general: { name: 'Amr ibn al-As', fire: 3, shock: 3, maneuver: 4 },
            });
          }
          h.chronicle(ctx, 'war', 'Jerusalem answers the Commander of the Faithful: the city was granted once, by Heaven, and is not in the gift of any second empire. The army of Palestine turns south.');
        }),
      },
    ],
  },

  // ── V5 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_v_house_standing',
    title: 'Smoke on the Mount',
    desc: 'The Third House stands, and the morning sacrifice has stopped being news '
      + 'and started being the calendar. Now come the consequences: pilgrim roads '
      + 'filling from Babylon and Egypt at the three festivals; Byzantine preachers '
      + 'in genuine theological pain — the ruined Temple was their proof text, and '
      + 'it has stopped being ruined; and long letters from the academies of the '
      + 'rivers asking, with citations, whether an altar without a prophet to '
      + 'sanctify it binds anyone at all.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev_p_v_house_standing', (ctx) => {
      if (!returnStands(ctx)) return false;
      const p = ctx.prov('Jerusalem');
      return !!(p && p.wonder === 'temple');
    }),
    aiOption: 0,
    options: [
      {
        label: 'Open the festivals to every exile',
        tooltip: 'Jerusalem gains "The Pilgrim Roads" (+10% tax, +5% production, permanent) and 500 souls settle from the diaspora; +10 legitimacy. Byzantium, if it lives: −10 legitimacy and its opinion falls to −180 — the proof text un-ruined.',
        effects: guard('ev_p_v_house_standing:0', (ctx) => {
          const h = ctx.helpers;
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'pilgrim_roads', name: 'The Pilgrim Roads', months: -1,
            effects: { taxMult: 1.1, prodMult: 1.05 },
          });
          h.addPopulation(ctx, 'Jerusalem', { r: 'judaism', c: 'judean', n: 500 });
          h.adjust(ctx, 'JUD', { legitimacy: 10 });
          if (alive(ctx, 'BYZ')) {
            h.adjust(ctx, 'BYZ', { legitimacy: -10 });
            const byz = ctx.game.tags.BYZ;
            if (byz && byz.opinion) byz.opinion.JUD = -180;
          }
          h.chronicle(ctx, 'era', 'The pilgrim roads fill at the three festivals for the first time in five centuries; the House on the Mount collects what the exile only counted.');
        }),
      },
      {
        label: 'A House with guarded courts',
        tooltip: 'Purity before traffic: +5 legitimacy; the Priests of the Mount +10 approval, the Exilarch\'s House −5 (Babylon reads the rulings as a rebuke); Jerusalem −1 unrest for 120 months. Byzantium, if it lives: −5 legitimacy.',
        effects: guard('ev_p_v_house_standing:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 5 });
          h.factionShift(ctx, 'JUD', 'priests', 10);
          h.factionShift(ctx, 'JUD', 'exilarch', -5);
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'guarded_courts', name: 'The Guarded Courts', months: 120, effects: { unrest: -1 },
          });
          if (alive(ctx, 'BYZ')) h.adjust(ctx, 'BYZ', { legitimacy: -5 });
          h.chronicle(ctx, 'era', 'The Third House keeps its courts narrow and its purity codes narrower; the pilgrims wait at the barriers, and the priests count that as the point.');
        }),
      },
    ],
  },

  // ── V6 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_v_written_law',
    title: 'The Written and the Spoken',
    desc: 'A sovereign community needs statutes, and the old argument the exile could '
      + 'defer now has a courtroom to happen in: teachers by the lake hold that the '
      + 'written Torah alone binds the judge — search the Scripture, not the chain '
      + 'of the sages — while the academies answer that the oral Law IS the law, '
      + 'and its chain of transmission the state\'s true constitution. Every '
      + 'inheritance case is now a theology exam.',
    forTag: 'JUD',
    trigger: safeTrigger('ev_p_v_written_law', (ctx) =>
      dateGE(ctx, 648, 1) && returnStands(ctx)),
    aiOption: 0,
    options: [
      {
        label: 'The chain of the sages holds the bench',
        tooltip: '+1 stability, +15 governance points; "The Oral Crown" (+0.1 legitimacy a month) for 120 months; the Exilarch\'s House +8 approval — Babylon\'s own jurisprudence enthroned in Zion.',
        effects: guard('ev_p_v_written_law:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 1, gov: 15 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'oral_crown', name: 'The Oral Crown', months: 120,
            effects: { legitimacyAdd: 0.1 },
          });
          h.factionShift(ctx, 'JUD', 'exilarch', 8);
          h.chronicle(ctx, 'era', 'The courts of the Return rule that the oral Law is the law: the chain of the sages holds the bench, and the lake teachers keep their reading circles and lose their dockets.');
        }),
      },
      {
        label: 'Scripture alone in the courts',
        tooltip: '+15 influence points and "The Bare Text" (−15% administration — simpler statutes, cheaper clerks) for 120 months; −5 legitimacy, and the Exilarch\'s House −10 approval — Babylon\'s academies are the chain being cut.',
        effects: guard('ev_p_v_written_law:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { infl: 15, legitimacy: -5 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'bare_text', name: 'The Bare Text', months: 120,
            effects: { adminMult: 0.85 },
          });
          h.factionShift(ctx, 'JUD', 'exilarch', -10);
          h.chronicle(ctx, 'era', 'The courts of the Return seat the written text alone on the bench; the academies of the rivers reply in eleven volumes, and the argument acquires a border.');
        }),
      },
    ],
  },

  // ── V7 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_v_vowel_points',
    title: 'The Crowns of the Letters',
    desc: 'In Tiberias — Benjamin\'s city, still the community\'s second capital — the '
      + 'masters of the tradition have begun a work of patient audacity: points and '
      + 'marks above and below the consonants, fixing forever how the unwritten '
      + 'vowels of Scripture are to be sounded. A text every synagogue from Spain '
      + 'to Persia will read identically: it is a kind of empire, built entirely '
      + 'of diacritics.',
    forTag: 'JUD',
    trigger: safeTrigger('ev_p_v_vowel_points', (ctx) =>
      dateGE(ctx, 660, 1) && returnStands(ctx)
      && ctx.helpers.controls(ctx, 'JUD', 'Tiberias')),
    aiOption: 0,
    options: [
      {
        label: 'Endow the pointing of the Books',
        tooltip: '−60 talents; +10 influence points; "The Tiberian Pointing" (+0.1 legitimacy a month, permanent), and Tiberias +5% production permanently — the scriptorium becomes an industry.',
        effects: guard('ev_p_v_vowel_points:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: -60, infl: 10 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'tiberian_pointing', name: 'The Tiberian Pointing', months: -1,
            effects: { legitimacyAdd: 0.1 },
          });
          h.addProvinceModifier(ctx, 'Tiberias', {
            id: 'masoretic_scriptorium', name: 'The Masoretic Scriptorium', months: -1,
            effects: { prodMult: 1.05 },
          });
          h.chronicle(ctx, 'era', 'The crown endows the pointing of the Books at Tiberias: every synagogue on earth will one day sound its Scripture in the accent of a sovereign Galilee.');
        }),
      },
      {
        label: 'Let every synagogue keep its song',
        tooltip: 'No cost; +5 influence points; the Exilarch\'s House +5 approval — Babylon\'s rival pointing gains ground, and the readings stay a family of dialects rather than a law.',
        effects: guard('ev_p_v_vowel_points:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { infl: 5 });
          h.factionShift(ctx, 'JUD', 'exilarch', 5);
          h.chronicle(ctx, 'era', 'The masoretes of Tiberias work on without a royal endowment; Babylon points its own Books, and for a century the Scriptures sing in two accents.');
        }),
      },
    ],
  },

  // ── V8 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_v_two_crowns',
    title: 'Two Crowns, One Torah',
    desc: 'For five centuries authority sat where the money and the safety were: '
      + 'Babylon. Now Sura and Pumbedita write to a Jerusalem that ordains its own '
      + 'judges, fixes its own calendar, and collects its own half-shekel — and the '
      + 'letters have begun to read less like rulings and more like negotiations. '
      + 'The exilarch is owed honor; the question is whether he is still owed '
      + 'obedience, and every community from Spain to Persia is waiting on the '
      + 'answer to address its questions accordingly.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev_p_v_two_crowns', (ctx) =>
      dateGE(ctx, 668, 1) && returnStands(ctx)),
    aiOption: 0,
    options: [
      {
        label: 'The calendar is set from Zion',
        tooltip: '+15 legitimacy, +1 stability; "The Calendar Set from Zion" (+0.1 legitimacy a month, permanent); the Exilarch\'s House −10 approval — primacy comes home, and Babylon feels the door close.',
        effects: guard('ev_p_v_two_crowns:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 15, stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'calendar_from_zion', name: 'The Calendar Set from Zion', months: -1,
            effects: { legitimacyAdd: 0.1 },
          });
          h.factionShift(ctx, 'JUD', 'exilarch', -10);
          h.chronicle(ctx, 'era', 'The intercalation is proclaimed from Jerusalem and the diaspora keeps the festivals by it: after five centuries the seat of authority crosses the desert westward.');
        }),
      },
      {
        label: 'Honor the academies of the rivers',
        tooltip: '+25 influence points and +80 talents (Babylonian silver resumes); the Exilarch\'s House +10 approval — two crowns, one Torah, and the questions keep flowing to both addresses.',
        effects: guard('ev_p_v_two_crowns:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { infl: 25, treasury: 80 });
          h.factionShift(ctx, 'JUD', 'exilarch', 10);
          h.chronicle(ctx, 'era', 'Jerusalem writes to Sura as a colleague, not a sovereign: two crowns share one Torah, and the silver of the rivers flows west without a ruling ever forcing it.');
        }),
      },
    ],
  },

  // ── V9 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_v_outlived',
    title: 'The State That Outlived Them Both',
    desc: 'Eighty years since Shahrbaraz mined the wall. The King of Kings who '
      + 'sponsored the Return is dust and so is his empire; the God-Bearing Emperor '
      + 'who swore to undo it died with the East already lost; the successors of '
      + 'the Prophet have buried two civil wars and an octagon\'s worth of '
      + 'ambitions. And the polity that every chancery in three empires filed '
      + 'under "temporary" is still here — still Jewish, still sovereign, still '
      + 'Jerusalem\'s. The chroniclers who hate it have begun, resentfully, to '
      + 'date things by it.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev_p_v_outlived', (ctx) =>
      dateGE(ctx, 694, 1) && returnStands(ctx)
      && ctx.helpers.countControlled(ctx, 'JUD', {}) >= 4),
    aiOption: 0,
    options: [
      {
        label: 'Let the chronicle say it plainly',
        tooltip: '+20 legitimacy, +1 stability; "The Return That Stood" (+5% morale, +0.1 legitimacy a month, permanent).',
        effects: guard('ev_p_v_outlived:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 20, stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'return_that_stood', name: 'The Return That Stood', months: -1,
            effects: { moraleMult: 1.05, legitimacyAdd: 0.1 },
          });
          h.chronicle(ctx, 'era', 'The eightieth year of the Return: the state that outlived the God-Bearing Emperor of the Romans and the successors of the Prophet alike still keeps its courts in Jerusalem.');
        }),
      },
      {
        label: 'Cut it into the wall by the gate',
        tooltip: '−100 talents; +15 legitimacy; the same "The Return That Stood" (+5% morale, +0.1 legitimacy a month, permanent), and Jerusalem gains "The Inscription at the Gate" (−0.5 unrest, permanent).',
        effects: guard('ev_p_v_outlived:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: -100, legitimacy: 15 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'return_that_stood', name: 'The Return That Stood', months: -1,
            effects: { moraleMult: 1.05, legitimacyAdd: 0.1 },
          });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'inscription_at_gate', name: 'The Inscription at the Gate', months: -1,
            effects: { unrest: -0.5 },
          });
          h.chronicle(ctx, 'era', 'By the breach Shahrbaraz opened, masons cut the tally into the repaired stone: the kings who came against this city, and the dates on which the city outlived them.');
        }),
      },
    ],
  },
];
