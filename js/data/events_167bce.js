// Judaea Universalis — event chain: The Maccabean Revolt, 167–140 BCE (SPEC §9.2, §13).
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
// Source spine: 1–2 Maccabees; Josephus, Antiquitates Judaicae XII–XIII. BCE years
// are negative. Every effects() body is guarded so nothing can throw in the tick loop.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_167bce] ' + key, e || '');
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

// Works for negative (BCE) years: -165 > -166.
function dateGE(ctx, y, m) {
  const d = ctx.game.date;
  return d.y > y || (d.y === y && d.m >= m);
}

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false);
}

function armyByGeneral(ctx, tag, generalName) {
  try {
    const armies = ctx.helpers.armiesOf(ctx, tag);
    for (const a of armies) {
      if (a && a.general && a.general.name === generalName) return a;
    }
    return null;
  } catch (e) { warnOnce('armyByGeneral', e); return null; }
}

function totalMen(ctx, tag) {
  try {
    return ctx.helpers.armiesOf(ctx, tag).reduce((s, a) => s + ((a && a.men) || 0), 0);
  } catch (e) { warnOnce('totalMen', e); return 0; }
}

function biggestArmy(ctx, tag, preferGeneralless) {
  try {
    const armies = ctx.helpers.armiesOf(ctx, tag);
    let best = null;
    if (preferGeneralless) {
      for (const a of armies) {
        if (a && !a.general && (!best || (a.men || 0) > (best.men || 0))) best = a;
      }
      if (best) return best;
    }
    for (const a of armies) {
      if (a && (!best || (a.men || 0) > (best.men || 0))) best = a;
    }
    return best;
  } catch (e) { warnOnce('biggestArmy', e); return null; }
}

function firstControlled(ctx, tag, preferred) {
  try {
    const h = ctx.helpers;
    for (const name of preferred) {
      if (h.controls(ctx, tag, name)) return name;
    }
    const provs = ctx.game.provinces || [];
    for (const p of provs) {
      if (p && !p.impassable && p.controller === tag) return p.name;
    }
  } catch (e) { warnOnce('firstControlled', e); }
  return null;
}

function findHasSelWar(game) {
  const wars = (game && game.wars) || [];
  for (const w of wars) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf('HAS') !== -1 && all.indexOf('SEL') !== -1) return w;
  }
  return null;
}

function findWar(game, a, b) {
  for (const w of (game && game.wars) || []) {
    const all = w ? (w.attackers || []).concat(w.defenders || []) : [];
    if (all.indexOf(a) >= 0 && all.indexOf(b) >= 0) return w;
  }
  return null;
}

// Scripted warscore swings persist in the war's eventScore side-bucket, which
// sideGross folds into every monthly rebuild (writing w.warscore directly gets
// clobbered by updateWarscores within the month). Same pattern as events_66ce.
function addWarscore(ctx, tag, amount) {
  try {
    const w = findHasSelWar(ctx.game);
    if (!w) return;
    if (!w.eventScore) w.eventScore = { att: 0, def: 0 };
    const side = (w.attackers || []).indexOf(tag) >= 0 ? 'att'
      : (w.defenders || []).indexOf(tag) >= 0 ? 'def' : null;
    if (side) w.eventScore[side] += amount;
  } catch (e) { warnOnce('addWarscore', e); }
}

function setOpinion(ctx, a, b, val) {
  try {
    const ta = ctx.game.tags && ctx.game.tags[a];
    if (!ta) return;
    if (!ta.opinion || typeof ta.opinion !== 'object') ta.opinion = {};
    ta.opinion[b] = Math.max(-200, Math.min(200, val));
  } catch (e) { warnOnce('setOpinion', e); }
}

// Total men of a tag's armies standing in the named provinces.
function menIn(ctx, tag, names) {
  try {
    const ids = new Set();
    for (const n of names) {
      const id = ctx.provId ? ctx.provId(n) : 0;
      if (id) ids.add(id);
    }
    let men = 0;
    for (const a of ctx.helpers.armiesOf(ctx, tag)) {
      if (a && ids.has(a.prov)) men += (a.men || 0);
    }
    return men;
  } catch (e) { warnOnce('menIn', e); return 0; }
}

// Remove `lostInf` infantry regiments from an army (min 1 kept), preserving its
// name and general — the removeArmy/spawnArmy pattern from events_66ce.
function maulArmy(ctx, army, lostInf) {
  try {
    const h = ctx.helpers;
    if (!army) return;
    const pv = ctx.byId ? ctx.byId(army.prov) : null;
    if (!pv || army.inBattle) return;
    const inf = army.regiments ? (army.regiments.inf || 0) : Math.round((army.men || 1000) / 1000);
    const cav = army.regiments ? (army.regiments.cav || 0) : 0;
    const keepInf = Math.max(1, inf - lostInf);
    const gen = army.general ? { ...army.general } : null;
    const nm = army.name;
    h.removeArmy(ctx, army.id);
    h.spawnArmy(ctx, army.tag, pv.name, { inf: keepInf, cav, name: nm, general: gen });
  } catch (e) { warnOnce('maulArmy', e); }
}

const JUDEAN_HILLS = ['Jerusalem', 'Emmaus', 'Hebron', 'Adora', 'Sebaste', 'Neapolis'];
const SOUTHERN_APPROACH = ['Hebron', 'Adora', 'Engaddi', 'Jerusalem', 'Emmaus'];
const EASTERN_PROVINCES = ['Ecbatana', 'Susa', 'Seleucia-Ctesiphon', 'Babylon', 'Nehardea',
  'Charax', 'Hatra', 'Singara', 'Nisibis', 'Arbela'];
const BABYLONIAN_PROVINCES = ['Babylon', 'Seleucia-Ctesiphon', 'Nehardea', 'Charax'];

export const EVENTS_167 = [

  // ── 1 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_modein',
    title: 'The Altar at Modein',
    desc: 'The king’s officer has come to Modein with soldiers and a pagan altar, to make '
      + 'the town sacrifice as every town in the land must. He called first on Mattathias '
      + 'ben Johanan, priest of the course of Joarib, to step forward and be an example to '
      + 'his city — and a certain Jew stepped forward instead, to obey. Mattathias killed '
      + 'him upon the altar, and killed the king’s officer, and pulled the altar down; and '
      + 'he cried through the town in a great voice: "Whoever is zealous for the Law, and '
      + 'stands by the covenant — let him come out after me." Then he fled with his sons '
      + 'into the hills, and left all that he had in the city.',
    forTag: 'HAS',
    date: { y: -167, m: 11 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Whoever is zealous, follow me',
        tooltip: '+10 legitimacy, +1,000 manpower; the Judean countryside rises against the king’s altars (+2 unrest in Seleucid Judea, 24 months).',
        effects: guard('ev_modein:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { legitimacy: 10, manpower: 1000 });
          for (const name of ['Jerusalem', 'Jericho', 'Hebron']) {
            h.addProvinceModifier(ctx, name, {
              id: 'countryside_rises', name: 'The Countryside Rises', months: 24,
              effects: { unrest: 2 },
            });
          }
          h.setFlag(ctx, 'modein', true);
        }),
      },
      {
        label: 'Gather only the sure men',
        tooltip: '+5 legitimacy; a smaller, harder band — "Chosen Companions" (+5% discipline, 24 months).',
        effects: guard('ev_modein:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { legitimacy: 5 });
          h.addTagModifier(ctx, 'HAS', {
            id: 'chosen_companions', name: 'Chosen Companions', months: 24,
            effects: { disciplineMult: 1.05 },
          });
          h.setFlag(ctx, 'modein', true);
        }),
      },
    ],
  },

  // ── 2 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_sabbath_question',
    title: 'The Thousand in the Caves',
    desc: 'A thousand of the faithful — men, wives, children, cattle — went down into '
      + 'hiding places in the wilderness rather than profane the Sabbath, and the king’s '
      + 'men found them there on the seventh day. They would not block the mouths of the '
      + 'caves, nor cast a stone, nor answer at all: "Let us die in our innocency," they '
      + 'said, calling heaven and earth to witness. They were a full day dying. In the '
      + 'camp in the hills Mattathias and his friends mourn them, and reason together '
      + 'that if all do as these brethren have done, the king will root Israel out of '
      + 'the earth in a single season.',
    forTag: 'HAS',
    date: { y: -167, m: 12 },
    aiOption: 0,
    options: [
      {
        label: 'If any man attack us on the Sabbath, we will fight',
        tooltip: 'The ruling of Mattathias. "The Sabbath Ruling": +5% discipline, permanent — and -5 legitimacy among the scrupulous.',
        effects: guard('ev_sabbath_question:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'HAS', {
            id: 'sabbath_ruling', name: 'The Sabbath Ruling', months: -1,
            effects: { disciplineMult: 1.05 },
          });
          h.adjust(ctx, 'HAS', { legitimacy: -5 });
        }),
      },
      {
        label: 'The Sabbath is not ours to unmake',
        tooltip: '+10 legitimacy — and the caves will keep filling. -1,000 manpower.',
        effects: guard('ev_sabbath_question:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'HAS', { legitimacy: 10, manpower: -1000 });
        }),
      },
    ],
  },

  // ── 3 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_hasidim',
    title: 'The Company of the Hasideans',
    desc: 'They have come up to the camp in the hills: the company of the Hasideans, '
      + 'mighty men of Israel, every one that offereth himself willingly for the Law. '
      + 'They are not Mattathias’ men; they are the Law’s, and they say so plainly — '
      + 'where a lawful high priest stands, there they will stand, whoever wears the '
      + 'diadem in Antioch. For now, the priest of Modein and the pious of the land '
      + 'want the same war. It will not always be so.',
    forTag: 'HAS',
    date: { y: -166, m: 2 },
    aiOption: 0,
    options: [
      {
        label: 'Mighty men, willing for the Law',
        tooltip: '2,000 Hasideans muster at Emmaus; +1,000 manpower, +5 legitimacy.',
        effects: guard('ev_hasidim:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HAS')) return;
          const at = firstControlled(ctx, 'HAS', ['Emmaus', 'Lydda']);
          if (at) h.spawnArmy(ctx, 'HAS', at, { inf: 2, name: 'Company of the Hasideans' });
          h.adjust(ctx, 'HAS', { manpower: 1000, legitimacy: 5 });
        }),
      },
      {
        label: 'Under one captain, or not at all',
        tooltip: '2,000 Hasideans muster at Emmaus under Hasmonean discipline; +1,000 manpower, −5 legitimacy among the scrupulous; "Under One Captain" (+5% discipline, 24 months).',
        effects: guard('ev_hasidim:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HAS')) return;
          const at = firstControlled(ctx, 'HAS', ['Emmaus', 'Lydda']);
          if (at) h.spawnArmy(ctx, 'HAS', at, { inf: 2, name: 'Company of the Hasideans' });
          h.adjust(ctx, 'HAS', { manpower: 1000, legitimacy: -5 });
          h.addTagModifier(ctx, 'HAS', {
            id: 'under_one_captain', name: 'Under One Captain', months: 24,
            effects: { disciplineMult: 1.05 },
          });
        }),
      },
    ],
  },

  // ── 4 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_death_of_mattathias',
    title: 'The Testament of Mattathias',
    desc: 'The old priest is dying in the first year of the war, and his sons gather to '
      + 'hear him number the fathers: Abraham found faithful in temptation, Joseph in his '
      + 'prison keeping the commandment, Elijah zealous for the Law received up into '
      + 'heaven. "Simon your brother is a man of counsel: hear him always, and he shall '
      + 'be a father to you. And Judah Maccabee, mighty and strong from his youth — he '
      + 'shall be your captain, and fight the battle of the people." They buried him in '
      + 'the sepulchre of his fathers at Modein, and all Israel made great lamentation '
      + 'for him.',
    forTag: 'HAS',
    date: { y: -166, m: 4 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Judah shall be our captain',
        tooltip: 'Judah Maccabee (2/4/3) commands the war. +5 legitimacy, +10 military points.',
        effects: guard('ev_death_of_mattathias:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HAS')) return;
          // Ensure Judah's generalship survives whatever the first winter did.
          if (!armyByGeneral(ctx, 'HAS', 'Judah Maccabee')) {
            const a = biggestArmy(ctx, 'HAS', true);
            if (a) {
              a.general = { name: 'Judah Maccabee', fire: 2, shock: 4, maneuver: 3 };
            } else {
              const at = firstControlled(ctx, 'HAS', ['Emmaus', 'Lydda', 'Jerusalem']);
              if (at) {
                h.spawnArmy(ctx, 'HAS', at, {
                  inf: 2, name: 'Band of the Maccabee',
                  general: { name: 'Judah Maccabee', fire: 2, shock: 4, maneuver: 3 },
                });
              }
            }
          }
          h.adjust(ctx, 'HAS', { legitimacy: 5, mar: 10 });
          h.setRuler(ctx, 'HAS', { name: 'Judah Maccabee', title: 'Captain of Israel', gov: 2, infl: 3, mar: 5, age: 26 });
          h.setHeir(ctx, 'HAS', { name: 'Jonathan Apphus', gov: 2, infl: 3, mar: 4, age: 24 });
          h.setFlag(ctx, 'judahCommands', true);
        }),
      },
      {
        label: 'Hear Simon always',
        tooltip: 'Judah Maccabee (2/4/3) commands the war, and Simon’s counsel governs the camp: +10 legitimacy, +10 governance.',
        effects: guard('ev_death_of_mattathias:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HAS')) return;
          if (!armyByGeneral(ctx, 'HAS', 'Judah Maccabee')) {
            const a = biggestArmy(ctx, 'HAS', true);
            if (a) {
              a.general = { name: 'Judah Maccabee', fire: 2, shock: 4, maneuver: 3 };
            } else {
              const at = firstControlled(ctx, 'HAS', ['Emmaus', 'Lydda', 'Jerusalem']);
              if (at) {
                h.spawnArmy(ctx, 'HAS', at, {
                  inf: 2, name: 'Band of the Maccabee',
                  general: { name: 'Judah Maccabee', fire: 2, shock: 4, maneuver: 3 },
                });
              }
            }
          }
          h.adjust(ctx, 'HAS', { legitimacy: 10, gov: 10 });
          h.setRuler(ctx, 'HAS', { name: 'Judah Maccabee', title: 'Captain of Israel', gov: 2, infl: 3, mar: 5, age: 26 });
          h.setHeir(ctx, 'HAS', { name: 'Jonathan Apphus', gov: 2, infl: 3, mar: 4, age: 24 });
          h.setFlag(ctx, 'judahCommands', true);
        }),
      },
    ],
  },

  // ── 5 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_apollonius',
    title: 'Apollonius Marches',
    requiresWar: ['HAS', 'SEL'],
    desc: 'The reports from the hill country can no longer be filed as banditry: the tax '
      + 'convoys do not arrive, the king’s altars burn in the night, and whatever is sent '
      + 'against the renegade priest’s son is ambushed in the passes. Apollonius has '
      + 'gathered the garrison of Samaria and the levies of the nations to go up and '
      + 'settle the matter with one blow, as such matters are settled everywhere else in '
      + 'the king’s dominions. The king himself is occupied with the affairs of an empire '
      + 'that runs from the sea to Persis, and expects to hear no more of Judea.',
    forTag: 'SEL',
    date: { y: -166, m: 6 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Send Apollonius up from Samaria',
        tooltip: 'The kingdom bestirs itself: armies unleashed, and the Samaria command reinforced (+2,000 men at Samaria).',
        effects: guard('ev_apollonius:0', (ctx) => {
          const h = ctx.helpers;
          h.removeModifier(ctx, 'SEL', 'empire_of_distractions');
          h.spawnArmy(ctx, 'SEL', 'Sebaste', { inf: 2, name: 'Levies of the Nations' });
          h.setFlag(ctx, 'apolloniusMarched', true);
          try {
            if (ctx.game.tags.SEL && ctx.game.tags.SEL.aiState) {
              ctx.game.tags.SEL.aiState.target = 'Emmaus';
            }
          } catch (e) { warnOnce('apollonius:aiState', e); }
          h.notify(ctx, {
            title: 'Apollonius Marches', type: 'war', provName: 'Sebaste',
            text: 'The garrison of Samaria moves south into the hill country.',
          });
        }),
      },
      {
        label: 'Refer the matter to the king',
        tooltip: 'Caution over dispatch: -5 legitimacy, three more idle months — and the rising gathers (+1,000 Hasmonean manpower).',
        effects: guard('ev_apollonius:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SEL', { legitimacy: -5 });
          h.addTagModifier(ctx, 'SEL', {
            id: 'empire_of_distractions', name: 'An Empire of Distractions', months: 3,
            effects: { aiPassive: true },
          });
          h.adjust(ctx, 'HAS', { manpower: 1000 });
          h.setFlag(ctx, 'apolloniusMarched', true);
        }),
      },
    ],
  },

  // ── 6 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_sword_of_apollonius',
    title: 'The Sword of Apollonius',
    requiresWar: ['HAS', 'SEL'],
    desc: 'Apollonius’ force is broken and Apollonius is dead on the field, and the man '
      + 'who killed him has taken his sword. Judah fought with it all the rest of his '
      + 'life — the chroniclers say it as plainly as that, because every man who followed '
      + 'him saw it at his side and knew whose it had been. From Samaria to the coast the '
      + 'garrisons are learning a new arithmetic: the bandit of the hills is a commander, '
      + 'and his men no longer scatter when the line advances.',
    forTag: 'HAS',
    major: true,
    trigger: safeTrigger('ev_sword_of_apollonius', (ctx) => {
      const h = ctx.helpers;
      if (!h.getFlag(ctx, 'apolloniusMarched')) return false;
      if (!alive(ctx, 'HAS')) return false;
      return !armyByGeneral(ctx, 'SEL', 'Apollonius');
    }),
    aiOption: 0,
    options: [
      {
        label: 'He fought with it all his days',
        tooltip: '+15 military points; "The Sword of Apollonius" (+5% morale, 24 months).',
        effects: guard('ev_sword_of_apollonius:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { mar: 15 });
          h.addTagModifier(ctx, 'HAS', {
            id: 'sword_of_apollonius', name: 'The Sword of Apollonius', months: 24,
            effects: { moraleMult: 1.05 },
          });
          h.setFlag(ctx, 'apolloniusFallen', true);
        }),
      },
      {
        label: 'Share out the arms of the fallen',
        tooltip: 'The spoils of the field arm the naked: +5 military points, +1,000 manpower, +20 treasury.',
        effects: guard('ev_sword_of_apollonius:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { mar: 5, manpower: 1000, treasury: 20 });
          h.setFlag(ctx, 'apolloniusFallen', true);
        }),
      },
    ],
  },

  // ── 7 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_beth_horon_ascent',
    title: 'The Ascent of Beth-Horon',
    requiresWar: ['HAS', 'SEL'],
    desc: 'Seron, commander of the army of Syria, heard that Judah had gathered a '
      + 'congregation of the faithful, and thought to make himself a name in the kingdom. '
      + 'He came up by the ascent of Beth-Horon, where the road climbs out of the plain '
      + 'in narrow steps, and his column was strung along it when Judah fell on him with '
      + 'a handful — men who had fasted that day and were afraid, and were told that '
      + 'heaven does not count heads. Eight hundred of Seron’s men died in the descent; '
      + 'the rest fled into the land of the Philistines. The fear of Judah has begun to '
      + 'fall upon the nations round about.',
    forTag: 'HAS',
    major: true,
    trigger: safeTrigger('ev_beth_horon_ascent', (ctx) => {
      const h = ctx.helpers;
      if (!dateGE(ctx, -166, 8)) return false;
      if (!alive(ctx, 'HAS')) return false;
      if (!h.getFlag(ctx, 'apolloniusMarched')) return false;
      for (const a of h.armiesOf(ctx, 'SEL')) {
        if (!a) continue;
        const pv = ctx.byId ? ctx.byId(a.prov) : null;
        if (!pv || JUDEAN_HILLS.indexOf(pv.name) === -1) continue;
        if (a.retreating) return true;
        // A small column caught deep in country the rising controls.
        if (pv.controller === 'HAS' && (a.men || 0) <= 4000 && totalMen(ctx, 'HAS') >= 2000) {
          return true;
        }
      }
      // The historical ambush: by early 165 the pass has closed behind someone.
      if (dateGE(ctx, -165, 2)
          && (h.controls(ctx, 'HAS', 'Emmaus') || h.controls(ctx, 'HAS', 'Lydda'))) {
        return true;
      }
      return false;
    }),
    aiOption: 0,
    options: [
      {
        label: 'Heaven does not count heads',
        tooltip: 'Seron’s column is broken in the pass. +15 military points, +10 legitimacy, +1,000 manpower, +10 warscore; the kingdom’s war-weariness grows.',
        effects: guard('ev_beth_horon_ascent:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { mar: 15, legitimacy: 10, manpower: 1000 });
          h.adjust(ctx, 'SEL', { warExhaustion: 1 });
          addWarscore(ctx, 'HAS', 10);
          h.setFlag(ctx, 'seronBroken', true);
          h.notify(ctx, {
            title: 'Seron Broken at Beth-Horon', type: 'good', provName: 'Emmaus',
            text: 'The column of Syria is shattered in the descent. The hill country holds.',
          });
        }),
      },
      {
        label: 'Pursue them into the plain',
        tooltip: 'The pursuit is pressed to the land of the Philistines: +15 military points, +15 warscore, −500 manpower; the kingdom’s war-weariness grows.',
        effects: guard('ev_beth_horon_ascent:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { mar: 15, manpower: -500 });
          h.adjust(ctx, 'SEL', { warExhaustion: 1 });
          addWarscore(ctx, 'HAS', 15);
          h.setFlag(ctx, 'seronBroken', true);
          h.notify(ctx, {
            title: 'Seron Broken at Beth-Horon', type: 'good', provName: 'Emmaus',
            text: 'The pursuit runs down out of the pass and into the plain, and does not stop cheaply.',
          });
        }),
      },
    ],
  },

  // ── 7b ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_anabasis',
    title: 'The King Marches East',
    requiresWar: ['HAS', 'SEL'],
    desc: 'The treasury is empty — the wars and the gifts have seen to that — and the '
      + 'upper satrapies pay nothing while Armenia and Persis drift. So the king has '
      + 'divided his forces: half the army of the kingdom crosses the Euphrates with him '
      + 'to shake down the temple treasuries of the east, and the other half is left in '
      + 'the hand of Lysias the regent, kinsman of the king — with the child heir, and '
      + 'with written orders concerning Judea: root them out. Lysias\' commission moves '
      + 'south by way of Damascus. The war for the hill country now has a second front '
      + 'no one in it can see: whatever happens in Persis happens here too.',
    forTag: 'both',
    date: { y: -165, m: 1 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Half the army beyond the Euphrates',
        tooltip: 'Lysias takes the field (+13,000 men at Damascus) — but the kingdom reinforces at half rate for 36 months (1 Macc 3:27-37).',
        effects: guard('ev_anabasis:0', (ctx) => {
          const h = ctx.helpers;
          h.spawnArmy(ctx, 'SEL', 'Damascus', {
            inf: 11, cav: 2, name: 'The Regent\'s Army',
            general: { name: 'Lysias', fire: 3, shock: 2, maneuver: 2 },
          });
          h.addTagModifier(ctx, 'SEL', {
            id: 'army_beyond_euphrates', name: 'Half the Army Beyond the Euphrates', months: 36,
            effects: { reinforceMult: 0.5 },
          });
          h.setFlag(ctx, 'anabasis', true);
          h.notify(ctx, {
            title: 'Lysias Takes the Field', type: 'war', provName: 'Damascus',
            text: 'The regent\'s army musters at Damascus with orders concerning Judea.',
          });
        }),
      },
      {
        label: 'Strip the satrapies for the regent',
        tooltip: 'Lysias takes the field in greater strength (+14,000 men at Damascus, Seleucids −100 treasury) — and the kingdom still reinforces at half rate for 36 months.',
        effects: guard('ev_anabasis:1', (ctx) => {
          const h = ctx.helpers;
          h.spawnArmy(ctx, 'SEL', 'Damascus', {
            inf: 12, cav: 2, name: 'The Regent\'s Army',
            general: { name: 'Lysias', fire: 3, shock: 2, maneuver: 2 },
          });
          h.adjust(ctx, 'SEL', { treasury: -100 });
          h.addTagModifier(ctx, 'SEL', {
            id: 'army_beyond_euphrates', name: 'Half the Army Beyond the Euphrates', months: 36,
            effects: { reinforceMult: 0.5 },
          });
          h.setFlag(ctx, 'anabasis', true);
          h.notify(ctx, {
            title: 'Lysias Takes the Field', type: 'war', provName: 'Damascus',
            text: 'The regent\'s army musters at Damascus in strength, and the satrapies pay for it.',
          });
        }),
      },
    ],
  },

  // ── 8 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_emmaus_night_march',
    title: 'The Night March to Emmaus',
    requiresWar: ['HAS', 'SEL'],
    desc: 'Gorgias took five thousand foot and a thousand chosen horse out of the great '
      + 'camp by night, to fall on the camp of Judah in the dark — and found it empty, '
      + 'and went looking for him in the mountains, saying, "They flee from us." At first '
      + 'light Judah stood in the plain before the camp at Emmaus with three thousand men '
      + 'who lacked the armor and the swords they wanted; the trumpets sounded; the camp '
      + 'was taken and burned. When Gorgias’ column came back over the ridge they saw the '
      + 'smoke rising and a line of battle drawn up in the plain awaiting them, and they '
      + 'fled, every man, into the land of the Philistines. And Israel took great '
      + 'spoils that day.',
    forTag: 'HAS',
    date: { y: -165, m: 3 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Strike the camp at dawn',
        tooltip: 'Judah’s finest maneuver. +20 military points, +10 legitimacy, +40 treasury (the spoils of the camp), +1,000 manpower, +10 warscore.',
        effects: guard('ev_emmaus_night_march:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HAS')) return;
          h.adjust(ctx, 'HAS', { mar: 20, legitimacy: 10, treasury: 40, manpower: 1000 });
          h.adjust(ctx, 'SEL', { warExhaustion: 1 });
          addWarscore(ctx, 'HAS', 10);
          h.setFlag(ctx, 'emmausBurned', true);
          h.notify(ctx, {
            title: 'The Camp at Emmaus Burns', type: 'good', provName: 'Emmaus',
            text: 'Gold and silver, and cloth dyed blue and sea-purple: great spoils, and greater fear.',
          });
        }),
      },
      {
        label: 'A portion for the widows and orphans',
        tooltip: 'The spoils are divided with the maimed, the widows, and the orphans: +20 military points, +20 legitimacy, +1,000 manpower, +10 warscore — and nothing for the treasury.',
        effects: guard('ev_emmaus_night_march:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HAS')) return;
          h.adjust(ctx, 'HAS', { mar: 20, legitimacy: 20, manpower: 1000 });
          h.adjust(ctx, 'SEL', { warExhaustion: 1 });
          addWarscore(ctx, 'HAS', 10);
          h.setFlag(ctx, 'emmausBurned', true);
          h.notify(ctx, {
            title: 'The Camp at Emmaus Burns', type: 'good', provName: 'Emmaus',
            text: 'The spoils go to the persecuted, the widows, and the orphans; the fear stays with the kingdom.',
          });
        }),
      },
    ],
  },

  // ── 9 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_beth_zur',
    title: 'Beth-Zur',
    requiresWar: ['HAS', 'SEL'],
    desc: 'Lysias, guardian of the king\'s son and vicegerent from the Euphrates to the borders of '
      + 'Egypt, has come up at last himself, by the road through Idumea, with a greater '
      + 'army than any yet sent — and at Beth-Zur, where the road narrows toward the hill '
      + 'country, the army of Israel met him and would not be moved. Lysias measured the '
      + 'boldness of men who fight to live by their own Law, and measured the cost of '
      + 'pressing on, and turned back to Antioch to hire mercenaries and come again with '
      + 'more. It is not a peace. It is a season.',
    forTag: 'both',
    date: { y: -164, m: 3 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The regent turns north',
        tooltip: 'Judaea: +10 legitimacy, +5 warscore. The kingdom must raise mercenaries: -20% reinforcements for 6 months, +1 war exhaustion.',
        effects: guard('ev_beth_zur:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { legitimacy: 10 });
          h.adjust(ctx, 'SEL', { warExhaustion: 1 });
          h.addTagModifier(ctx, 'SEL', {
            id: 'mercenaries_must_be_raised', name: 'Mercenaries Must Be Raised', months: 6,
            effects: { reinforceMult: 0.8 },
          });
          addWarscore(ctx, 'HAS', 5);
          h.setFlag(ctx, 'lysiasRepulsed', true);
        }),
      },
      {
        label: 'Harry the retreat through Idumea',
        tooltip: 'Judaea: +10 military points, +10 warscore, −500 manpower. The kingdom must raise mercenaries: −20% reinforcements for 6 months, +1 war exhaustion.',
        effects: guard('ev_beth_zur:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { mar: 10, manpower: -500 });
          h.adjust(ctx, 'SEL', { warExhaustion: 1 });
          h.addTagModifier(ctx, 'SEL', {
            id: 'mercenaries_must_be_raised', name: 'Mercenaries Must Be Raised', months: 6,
            effects: { reinforceMult: 0.8 },
          });
          addWarscore(ctx, 'HAS', 10);
          h.setFlag(ctx, 'lysiasRepulsed', true);
        }),
      },
    ],
  },

  // ── 10 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_rededication',
    title: 'The Dedication of the Altar',
    desc: 'They came up Mount Zion with an army at their backs and saw what three years '
      + 'had made of the holy place: the sanctuary desolate, the altar profaned, the '
      + 'gates burned, the priests’ chambers pulled down, and shrubs growing in the '
      + 'courts as in a forest or on some mountain. They rent their garments and made '
      + 'great lamentation, and put ashes on their heads, and fell on their faces to the '
      + 'ground — and then the trumpets sounded, and they set to work. Blameless priests '
      + 'pulled down the defiled altar and laid its stones apart on the mountain, until '
      + 'a prophet should come to answer for them, and built a new altar of unhewn '
      + 'stones after the Law, and lit the lamps upon the lampstand to give light in the '
      + 'Temple. In the month the city was retaken the years of desolation were ended: '
      + 'the morning sacrifice was offered on the new altar with songs and '
      + 'harps and cymbals; and all the people fell on their faces and worshipped, and '
      + 'the reproach of the nations was taken away. Eight days they kept the dedication, '
      + 'and ordained that it be kept in its season, from year to year.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev_rededication', (ctx) =>
      alive(ctx, 'HAS') && ctx.helpers.controls(ctx, 'HAS', 'Jerusalem')),
    aiOption: 0,
    options: [
      {
        label: 'A great and holy joy',
        tooltip: 'The Abomination is removed. Judaea: +25 legitimacy, +1 stability, +10 governance; Jerusalem keeps the "Feast of Dedication"; the army takes heart ("The Lamps Relit", +10% morale, 24 months).',
        effects: guard('ev_rededication:0', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'templeRededicated', true);
          h.setFlag(ctx, 'rededicatedYear', ctx.game.date.y);
          h.removeModifier(ctx, 'Jerusalem', 'abomination_of_desolation');
          h.adjust(ctx, 'HAS', { legitimacy: 25, stability: 1, gov: 10 });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'feast_of_dedication', name: 'Feast of Dedication', months: 60,
            effects: { unrest: -2, taxMult: 1.1 },
          });
          h.addTagModifier(ctx, 'HAS', {
            id: 'lamps_relit', name: 'The Lamps Relit', months: 24,
            effects: { moraleMult: 1.1 },
          });
          h.notify(ctx, {
            title: 'The Lamps Are Relit', type: 'good', provName: 'Jerusalem',
            text: 'The altar is rebuilt of unhewn stones, and the reproach of the nations is taken away.',
          });
        }),
      },
      {
        label: 'Wall the mountain even as they sing',
        tooltip: 'The Abomination is removed and Mount Zion is fortified: +15 legitimacy, +1 stability, −40 treasury; Jerusalem keeps the "Feast of Dedication" and gains +1 fort level.',
        effects: guard('ev_rededication:1', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'templeRededicated', true);
          h.setFlag(ctx, 'rededicatedYear', ctx.game.date.y);
          h.removeModifier(ctx, 'Jerusalem', 'abomination_of_desolation');
          h.adjust(ctx, 'HAS', { legitimacy: 15, stability: 1, treasury: -40 });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'feast_of_dedication', name: 'Feast of Dedication', months: 60,
            effects: { unrest: -2, taxMult: 1.1 },
          });
          const per = (ctx.DEFINES && ctx.DEFINES.BASE && ctx.DEFINES.BASE.fortGarrisonPerLevel) || 1000;
          const p = ctx.prov('Jerusalem');
          if (p && (p.fort || 0) < 3) { // the game's fort ceiling (walls contract, defines.js)
            p.fort = (p.fort || 0) + 1;
            if (typeof p.maxGarrison === 'number') {
              p.maxGarrison += per;
              p.garrison = Math.min((p.garrison || 0) + per, p.maxGarrison);
            }
          }
          h.notify(ctx, {
            title: 'The Lamps Are Relit', type: 'good', provName: 'Jerusalem',
            text: 'The altar is rebuilt of unhewn stones, and Mount Zion is walled about with towers.',
          });
        }),
      },
    ],
  },

  // ── 11 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_galilee_evacuation',
    title: 'The Brethren of Galilee and Gilead',
    desc: 'The letters came from Galilee and from Gilead in the same season, and said '
      + 'the same thing: the nations round about have gathered to blot out the remnant '
      + 'of the Jews among them. Simon took three thousand men north, and Judah crossed '
      + 'the Jordan eastward, and they fought their way to their people; and because '
      + 'what cannot be reached cannot be held, they brought them out — the Jews of '
      + 'Galilee and Arbatta, and those of Gilead, with their wives and children and all '
      + 'that they had — and led them into Judea with great gladness. The land of Judah '
      + 'grows more crowded, and more entirely its own.',
    forTag: 'HAS',
    date: { y: -163, m: 8 },
    aiOption: 0,
    options: [
      {
        label: 'Bring them home to Judea',
        tooltip: '+1,500 manpower, +10 legitimacy; the settled brethren strengthen the heartland (Emmaus and Lydda: -1 unrest, +10% tax, 36 months).',
        effects: guard('ev_galilee_evacuation:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HAS')) return;
          h.adjust(ctx, 'HAS', { manpower: 1500, legitimacy: 10 });
          for (const name of ['Emmaus', 'Lydda']) {
            if (!h.controls(ctx, 'HAS', name)) continue; // settle only behind our own lines
            h.addProvinceModifier(ctx, name, {
              id: 'settled_brethren', name: 'Brethren from Galilee', months: 36,
              effects: { unrest: -1, taxMult: 1.1 },
            });
          }
        }),
      },
      {
        label: 'Hold Galilee for the scattered brethren',
        tooltip: 'Garrisons are left with the brethren where they stand: −500 manpower, +15 legitimacy; the nation arms to shield its own ("Shield of the Scattered": +10% manpower, 24 months).',
        effects: guard('ev_galilee_evacuation:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HAS')) return;
          h.adjust(ctx, 'HAS', { manpower: -500, legitimacy: 15 });
          h.addTagModifier(ctx, 'HAS', {
            id: 'shield_of_the_scattered', name: 'Shield of the Scattered', months: 24,
            effects: { manpowerMult: 1.1 },
          });
        }),
      },
    ],
  },

  // ── 12 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_antiochus_dies',
    title: 'The King Dies in Persis',
    desc: 'The king is dead, far in the east. He had gone to shake down the temple '
      + 'treasuries of Elymais as he once shook down Jerusalem’s, and was driven off; '
      + 'and at Tabae in Persis, between that failure and the news that his armies in '
      + 'Judea had been turned back and the abomination overthrown, a wasting sickness '
      + 'took him. The chroniclers of the Jews record that at the end he remembered the '
      + 'evils he had done in Jerusalem. He leaves the diadem to a child of nine, his '
      + 'ring to one regent, and the child himself in the keeping of another — which is '
      + 'to say, he leaves a war.',
    forTag: 'both',
    date: { y: -164, m: 11 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Antiochus Epiphanes is dead',
        tooltip: 'The kingdom shakes: Seleucids -1 stability, -15 legitimacy.',
        effects: guard('ev_antiochus_dies:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SEL', { stability: -1, legitimacy: -15 });
          h.setRuler(ctx, 'SEL', { name: 'Lysias', title: 'Regent for Antiochus V', gov: 3, infl: 2, mar: 3, age: 50 });
          h.setHeir(ctx, 'SEL', { name: 'Antiochus V Eupator', gov: 1, infl: 1, mar: 1, age: 9 });
          h.setFlag(ctx, 'antiochusDead', true);
        }),
      },
      {
        label: 'Bury him as kings are buried',
        tooltip: 'A royal funeral steadies the diadem: Seleucids −1 stability, −5 legitimacy, −60 treasury.',
        effects: guard('ev_antiochus_dies:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SEL', { stability: -1, legitimacy: -5, treasury: -60 });
          h.setRuler(ctx, 'SEL', { name: 'Lysias', title: 'Regent for Antiochus V', gov: 3, infl: 2, mar: 3, age: 50 });
          h.setHeir(ctx, 'SEL', { name: 'Antiochus V Eupator', gov: 1, infl: 1, mar: 1, age: 9 });
          h.setFlag(ctx, 'antiochusDead', true);
        }),
      },
    ],
  },

  // ── 13 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_lysias_regency',
    title: 'The Regent and the Rival',
    desc: 'Philip has the dead king’s ring and the loyalty of the eastern army; Lysias '
      + 'has the child king in Antioch and does not intend to give him up. Every satrap '
      + 'from Cilicia to Media watches to see which regent to obey, and no man garrisons '
      + 'a frontier well while he is watching his own capital. The war in Judea is not '
      + 'ended. It is adjourned.',
    forTag: 'SEL',
    date: { y: -163, m: 2 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The child first; Judea after',
        tooltip: 'Secure the throne: armies stand down and reinforcements slow ("A Child on the Throne": passive, -25% reinforcements, 10 months).',
        effects: guard('ev_lysias_regency:0', (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'SEL', {
            id: 'child_on_the_throne', name: 'A Child on the Throne', months: 10,
            effects: { aiPassive: true, reinforceMult: 0.75 },
          });
        }),
      },
      {
        label: 'Judea cannot wait',
        tooltip: 'Press the war and let Philip scheme: -1 stability, -10 legitimacy — but the armies keep moving.',
        effects: guard('ev_lysias_regency:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'SEL', { stability: -1, legitimacy: -10 });
        }),
      },
    ],
  },

  // ── 14 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_royal_expedition',
    title: 'The Boy King Takes the Field',
    requiresWar: ['HAS', 'SEL'],
    desc: 'Antiochus Eupator is nine years old, and his regent has decided the boy will '
      + 'be seen to make war. The muster at Damascus is the greatest the south has known '
      + 'in a generation — phalanx and horse and the beasts of war in their mail, each '
      + 'elephant with a thousand foot and five hundred horse assigned to it, if the '
      + 'chroniclers of Israel can be believed, and they can at least be believed about '
      + 'the fear. The regency quarrel is set aside; the road runs south around the '
      + 'hills, by way of Idumea.',
    forTag: 'both',
    date: { y: -162, m: 2 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Phalanx, horse, and elephants',
        tooltip: 'The royal expedition musters: +16,000 men with the elephant corps at Damascus; any regency passivity ends.',
        effects: guard('ev_royal_expedition:0', (ctx) => {
          const h = ctx.helpers;
          h.removeModifier(ctx, 'SEL', 'child_on_the_throne');
          h.removeModifier(ctx, 'SEL', 'empire_of_distractions');
          h.spawnArmy(ctx, 'SEL', 'Damascus', {
            inf: 10, cav: 6, name: 'The King\'s Elephants',
            general: { name: 'Lysias', fire: 3, shock: 3, maneuver: 2 },
          });
          h.setFlag(ctx, 'royalExpedition', true);
        }),
      },
      {
        label: 'Hire the horse of Media besides',
        tooltip: 'The muster is swelled with mercenaries: +17,000 men with the elephant corps at Damascus, Seleucids −100 treasury; any regency passivity ends.',
        effects: guard('ev_royal_expedition:1', (ctx) => {
          const h = ctx.helpers;
          h.removeModifier(ctx, 'SEL', 'child_on_the_throne');
          h.removeModifier(ctx, 'SEL', 'empire_of_distractions');
          h.spawnArmy(ctx, 'SEL', 'Damascus', {
            inf: 11, cav: 6, name: 'The King\'s Elephants',
            general: { name: 'Lysias', fire: 3, shock: 3, maneuver: 2 },
          });
          h.adjust(ctx, 'SEL', { treasury: -100 });
          h.setFlag(ctx, 'royalExpedition', true);
        }),
      },
    ],
  },

  {
    id: 'ev_beth_zechariah',
    title: 'Beth-Zechariah',
    requiresWar: ['HAS', 'SEL'],
    desc: 'The regent came again, with the boy king in the camp, and this time the '
      + 'elephants came too — beasts in mail, each with its wooden tower and its '
      + 'fighting men, shown the blood of grapes and mulberries to rouse them for '
      + 'battle, the morning sun on bronze shields turning the mountainsides to lamps of '
      + 'fire. At Beth-Zechariah the lines met, and Eleazar called Avaran saw one beast '
      + 'taller than all the rest, harnessed in royal armor, and judged the king to be '
      + 'upon it. He ran through the middle of the phalanx alone, dealing death on '
      + 'either hand, and crept beneath the elephant and thrust upward — and the beast '
      + 'came down upon him, and he died there beneath it. The king was not on that '
      + 'elephant. The army of Israel bent and gave back before the weight of the royal '
      + 'host; but every man in both armies had seen what one man did, who gave himself '
      + 'to deliver his people and to win an everlasting name.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev_beth_zechariah', (ctx) => {
      if (!dateGE(ctx, -162, 3)) return false;
      if (!alive(ctx, 'HAS')) return false;
      // A royal mass south of Jerusalem — or, failing that, the scripted campaign.
      for (const a of ctx.helpers.armiesOf(ctx, 'SEL')) {
        if (!a || (a.men || 0) < 10000) continue;
        const pv = ctx.byId ? ctx.byId(a.prov) : null;
        if (pv && SOUTHERN_APPROACH.indexOf(pv.name) !== -1) return true;
      }
      // Calendar fallback only if a royal field force actually exists — a
      // dominant Judah is not narrated into a defeat by an army of ghosts.
      return dateGE(ctx, -162, 9)
        && totalMen(ctx, 'SEL') >= 1.5 * Math.max(1, totalMen(ctx, 'HAS'));
    }),
    aiOption: 0,
    options: [
      {
        label: 'An everlasting name',
        tooltip: 'Eleazar Avaran dies beneath the elephant, and the field is lost: Judaea’s largest army loses 2,000 men, -1 stability; the kingdom gains +10 warscore.',
        effects: guard('ev_beth_zechariah:0', (ctx) => {
          const h = ctx.helpers;
          h.killGeneral(ctx, 'HAS', 'Eleazar Avaran');
          maulArmy(ctx, biggestArmy(ctx, 'HAS', false), 2);
          h.adjust(ctx, 'HAS', { stability: -1, warExhaustion: 1 });
          addWarscore(ctx, 'SEL', 10);
          h.setFlag(ctx, 'bethZechariah', true);
          h.notify(ctx, {
            title: 'The Field Is Lost', type: 'bad', provName: 'Hebron',
            text: 'Eleazar lies beneath the beast he killed. The army falls back into the hills.',
          });
        }),
      },
      {
        label: 'Break off and save the army',
        tooltip: 'Eleazar Avaran dies beneath the elephant and the field is yielded in good order: Judaea’s largest army loses 1,000 men, −1 stability, −5 legitimacy; the kingdom gains +15 warscore.',
        effects: guard('ev_beth_zechariah:1', (ctx) => {
          const h = ctx.helpers;
          h.killGeneral(ctx, 'HAS', 'Eleazar Avaran');
          maulArmy(ctx, biggestArmy(ctx, 'HAS', false), 1);
          h.adjust(ctx, 'HAS', { stability: -1, legitimacy: -5, warExhaustion: 1 });
          addWarscore(ctx, 'SEL', 15);
          h.setFlag(ctx, 'bethZechariah', true);
          h.notify(ctx, {
            title: 'The Field Is Lost', type: 'bad', provName: 'Hebron',
            text: 'Eleazar lies beneath the beast he killed. The army breaks off whole, and the road lies open.',
          });
        }),
      },
    ],
  },

  // ── 14b ───────────────────────────────────────────────────────────────────
  {
    id: 'ev_demetrius',
    title: 'The King from Rome',
    desc: 'Demetrius son of Seleucus, held hostage in Rome these many years while lesser '
      + 'men wore his father\'s diadem, has slipped his keepers and landed at Tripolis '
      + 'with a handful of men and an unanswerable claim. The army went over to him. Of '
      + 'the boy king Antiochus and of Lysias the regent he said only: show me not their '
      + 'faces. The soldiers killed them both, and Demetrius sat upon the throne of his '
      + 'kingdom — and among his first letters was a commission for Bacchides, governor '
      + 'of the country beyond the river: take an army south, and settle Judea.',
    forTag: 'both',
    date: { y: -162, m: 10 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Show me not their faces',
        tooltip: 'Lysias and the boy king are put to death (1 Macc 7:2-4); Bacchides takes the southern command (+6,000 men at Damascus); Seleucids -1 stability.',
        effects: guard('ev_demetrius:0', (ctx) => {
          const h = ctx.helpers;
          h.killGeneral(ctx, 'SEL', 'Lysias');
          h.setRuler(ctx, 'SEL', { name: 'Demetrius I Soter', title: 'Basileus', gov: 3, infl: 2, mar: 3, age: 24 });
          h.setHeir(ctx, 'SEL', null);
          h.adjust(ctx, 'SEL', { stability: -1 });
          h.spawnArmy(ctx, 'SEL', 'Damascus', {
            inf: 6, name: 'Army of Bacchides',
            general: { name: 'Bacchides', fire: 2, shock: 2, maneuver: 2 },
          });
          h.setFlag(ctx, 'demetriusKing', true);
        }),
      },
      {
        label: 'Give Bacchides the strength of the kingdom',
        tooltip: 'Lysias and the boy king are put to death; Bacchides takes the southern command in force (+7,000 men at Damascus, −80 treasury); Seleucids −1 stability.',
        effects: guard('ev_demetrius:1', (ctx) => {
          const h = ctx.helpers;
          h.killGeneral(ctx, 'SEL', 'Lysias');
          h.setRuler(ctx, 'SEL', { name: 'Demetrius I Soter', title: 'Basileus', gov: 3, infl: 2, mar: 3, age: 24 });
          h.setHeir(ctx, 'SEL', null);
          h.adjust(ctx, 'SEL', { stability: -1, treasury: -80 });
          h.spawnArmy(ctx, 'SEL', 'Damascus', {
            inf: 7, name: 'Army of Bacchides',
            general: { name: 'Bacchides', fire: 2, shock: 2, maneuver: 2 },
          });
          h.setFlag(ctx, 'demetriusKing', true);
        }),
      },
    ],
  },

  // ── 15 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_roman_friendship',
    title: 'The Treaty with Rome',
    desc: 'Judah has heard the fame of the Romans: that they are mighty men, that they '
      + 'befriend whoever comes to them for friendship, and that for their friends they '
      + 'have broken kings — Philip and Perseus of Macedon, and great Antiochus himself '
      + 'at Magnesia. He has chosen Eupolemus son of John and Jason son of Eleazar and '
      + 'sent them the long road to Rome, and the Senate has answered on tablets of '
      + 'bronze: the Jews are the friends and allies of the Roman people, and if war '
      + 'come first upon them, the Romans will help with all their heart. It is a great '
      + 'name to carry as a shield. Nothing Rome lends comes back unbent.',
    forTag: 'HAS',
    date: { y: -161, m: 5 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Bronze tablets on Mount Zion',
        tooltip: '+15 legitimacy, +25 influence, +5 warscore; Antioch is furious, and Parthia takes cold note of Rome’s new friends.',
        effects: guard('ev_roman_friendship:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { legitimacy: 15, infl: 25 });
          setOpinion(ctx, 'SEL', 'HAS', -180);
          setOpinion(ctx, 'PAR', 'HAS', -30);
          addWarscore(ctx, 'HAS', 5);
          h.setFlag(ctx, 'romanTreaty', true);
        }),
      },
      {
        label: 'Heaven is shield enough',
        tooltip: 'No embassy, no entanglement: +5 legitimacy. A century of historians will wonder.',
        effects: guard('ev_roman_friendship:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'HAS', { legitimacy: 5 });
        }),
      },
    ],
  },

  // ── 16 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_elasa',
    title: 'Elasa',
    requiresWar: ['HAS', 'SEL'],
    desc: 'Bacchides came in the first month with the strength of the kingdom, and at '
      + 'the sight of it the army of Israel melted away, until there were left with '
      + 'Judah eight hundred men. Those who remained begged him to fall back and wait '
      + 'for a better day, and he answered: "God forbid that I should do this thing, and '
      + 'flee away from them. If our time is come, let us die manfully for our brethren, '
      + 'and let us not leave a stain upon our honor." The battle lasted from morning '
      + 'until evening; the right wing broke Bacchides’ right and pursued it to the '
      + 'mountain, and the left closed in behind, and there Judah fell. Jonathan and '
      + 'Simon carried their brother home and buried him at Modein, in the sepulchre of '
      + 'his fathers. How is the valiant man fallen, that delivered Israel!',
    forTag: 'HAS',
    major: true,
    trigger: safeTrigger('ev_elasa', (ctx) => {
      const h = ctx.helpers;
      if (!dateGE(ctx, -160, 2)) return false;
      if (!alive(ctx, 'HAS')) return false;
      if (!h.getFlag(ctx, 'judahCommands')) return false;
      const ja = armyByGeneral(ctx, 'HAS', 'Judah Maccabee');
      if (!ja) return true; // his army was destroyed in the field
      if ((ja.men || 0) <= 1200 && !ja.inBattle) return true; // eight hundred remain
      // Scripted only if the kingdom truly overshadows the rising — a dominant
      // Judah is not marched to Elasa by the calendar.
      return dateGE(ctx, -160, 4)
        && totalMen(ctx, 'SEL') >= 2.5 * Math.max(1, totalMen(ctx, 'HAS'));
    }),
    aiOption: 0,
    options: [
      {
        label: 'How is the valiant man fallen',
        tooltip: 'Judah Maccabee is dead. -1 stability, -10 legitimacy, +1 war exhaustion; the kingdom gains +10 warscore. Jonathan (2/3/4) takes up the war.',
        effects: guard('ev_elasa:0', (ctx) => {
          const h = ctx.helpers;
          h.killGeneral(ctx, 'HAS', 'Judah Maccabee');
          h.adjust(ctx, 'HAS', { stability: -1, legitimacy: -10, warExhaustion: 1 });
          addWarscore(ctx, 'SEL', 10);
          const a = biggestArmy(ctx, 'HAS', true);
          if (a) {
            a.general = { name: 'Jonathan Apphus', fire: 2, shock: 3, maneuver: 4 };
          } else {
            const at = firstControlled(ctx, 'HAS', ['Emmaus', 'Lydda', 'Jerusalem', 'Hebron']);
            if (at) {
              h.spawnArmy(ctx, 'HAS', at, {
                inf: 2, name: 'The Brothers’ Remnant',
                general: { name: 'Jonathan Apphus', fire: 2, shock: 3, maneuver: 4 },
              });
            }
          }
          h.setRuler(ctx, 'HAS', { name: 'Jonathan Apphus', title: 'Captain of Israel', gov: 2, infl: 4, mar: 4, age: 30 });
          h.setHeir(ctx, 'HAS', { name: 'Simon Thassi', gov: 4, infl: 3, mar: 3, age: 32 });
          h.setFlag(ctx, 'judahFallen', true);
          h.notify(ctx, {
            title: 'Judah Is Fallen', type: 'bad', provName: 'Emmaus',
            text: 'All Israel mourns many days. Jonathan his brother takes up the sword.',
          });
        }),
      },
      {
        label: 'Into the wilderness of Tekoa',
        tooltip: 'Judah Maccabee is dead, and the remnant withdraws to the wild country. −1 stability, −15 legitimacy, +1 war exhaustion; the kingdom gains +10 warscore. Jonathan (2/3/4) takes up the war ("Camp in the Wilderness": +1 hill defense, 24 months).',
        effects: guard('ev_elasa:1', (ctx) => {
          const h = ctx.helpers;
          h.killGeneral(ctx, 'HAS', 'Judah Maccabee');
          h.adjust(ctx, 'HAS', { stability: -1, legitimacy: -15, warExhaustion: 1 });
          addWarscore(ctx, 'SEL', 10);
          const a = biggestArmy(ctx, 'HAS', true);
          if (a) {
            a.general = { name: 'Jonathan Apphus', fire: 2, shock: 3, maneuver: 4 };
          } else {
            const at = firstControlled(ctx, 'HAS', ['Emmaus', 'Lydda', 'Jerusalem', 'Hebron']);
            if (at) {
              h.spawnArmy(ctx, 'HAS', at, {
                inf: 2, name: 'The Brothers’ Remnant',
                general: { name: 'Jonathan Apphus', fire: 2, shock: 3, maneuver: 4 },
              });
            }
          }
          h.addTagModifier(ctx, 'HAS', {
            id: 'camp_in_the_wilderness', name: 'Camp in the Wilderness', months: 24,
            effects: { hillDefBonus: 1 },
          });
          h.setRuler(ctx, 'HAS', { name: 'Jonathan Apphus', title: 'Captain of Israel', gov: 2, infl: 4, mar: 4, age: 30 });
          h.setHeir(ctx, 'HAS', { name: 'Simon Thassi', gov: 4, infl: 3, mar: 3, age: 32 });
          h.setFlag(ctx, 'judahFallen', true);
          h.notify(ctx, {
            title: 'Judah Is Fallen', type: 'bad', provName: 'Emmaus',
            text: 'All Israel mourns many days. Jonathan leads the remnant into the wilderness of Tekoa.',
          });
        }),
      },
    ],
  },

  // ── 17 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_bacchides',
    title: 'Bacchides Builds in Stone',
    requiresWar: ['HAS', 'SEL'],
    desc: 'The rebellion’s great captain is dead, and Bacchides intends that no '
      + 'successor shall find the country as Judah found it. He is building: Jericho and '
      + 'Emmaus, Beth-Horon and Bethel, Timnath, Pharathon and Tephon — walled, gated, '
      + 'and garrisoned; hostages of the great families taken into the citadel at '
      + 'Jerusalem; grain and arms laid up in every fort. Judea is to be held the way '
      + 'one holds a wolf country: with stone.',
    forTag: 'SEL',
    trigger: safeTrigger('ev_bacchides', (ctx) =>
      dateGE(ctx, -160, 6) && ctx.helpers.controls(ctx, 'SEL', 'Jerusalem')),
    aiOption: 0,
    options: [
      {
        label: 'Wall the hill country',
        tooltip: '+1 fort level and stronger garrisons in every Seleucid-held town of Judea.',
        effects: guard('ev_bacchides:0', (ctx) => {
          const h = ctx.helpers;
          const per = (ctx.DEFINES && ctx.DEFINES.BASE && ctx.DEFINES.BASE.fortGarrisonPerLevel) || 1000;
          for (const name of ['Jerusalem', 'Jericho', 'Emmaus', 'Lydda', 'Hebron']) {
            if (!h.controls(ctx, 'SEL', name)) continue;
            const p = ctx.prov(name);
            if (p && (p.fort || 0) < 4) {
              p.fort = (p.fort || 0) + 1;
              if (typeof p.maxGarrison === 'number') {
                p.maxGarrison += per;
                p.garrison = Math.min((p.garrison || 0) + per, p.maxGarrison);
              }
            }
          }
          h.setFlag(ctx, 'bacchidesForts', true);
        }),
      },
      {
        label: 'Take hostages of the great families',
        tooltip: 'The sons of the leading houses go into the citadel: −2 unrest in every Seleucid-held town of Judea for 36 months; Seleucids −5 legitimacy.',
        effects: guard('ev_bacchides:1', (ctx) => {
          const h = ctx.helpers;
          for (const name of ['Jerusalem', 'Jericho', 'Emmaus', 'Lydda', 'Hebron']) {
            if (!h.controls(ctx, 'SEL', name)) continue;
            h.addProvinceModifier(ctx, name, {
              id: 'hostages_in_the_citadel', name: 'Hostages in the Citadel', months: 36,
              effects: { unrest: -2 },
            });
          }
          h.adjust(ctx, 'SEL', { legitimacy: -5 });
          h.setFlag(ctx, 'bacchidesForts', true);
        }),
      },
    ],
  },

  // ── 18 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_balas_vs_demetrius',
    title: 'Two Kings Bid for Jonathan',
    desc: 'A young man has landed at Ptolemais who calls himself Alexander, son of '
      + 'Antiochus Epiphanes, and half the world finds it convenient to believe him. '
      + 'Demetrius the king and Alexander the pretender are now outbidding each other '
      + 'for every armed man in Syria — and both have written to Jonathan. Demetrius '
      + 'offers the release of the hostages and the right to muster troops; Alexander '
      + 'sends a purple robe and a golden crown, and with them the high priesthood of '
      + 'the nation, vacant these seven years. The brothers of Modein, who began as '
      + 'outlaws of the hill country, are courted by kings.',
    forTag: 'HAS',
    date: { y: -152, m: 6 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Take the crown and the priesthood from Alexander',
        tooltip: 'At Tabernacles the high priest puts on the sacred vestments: +20 legitimacy, +50 treasury, +10 governance, "The High Priesthood" (-1 unrest everywhere); the kingdom turns on itself for 18 months (+10 warscore).',
        effects: guard('ev_balas_vs_demetrius:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { legitimacy: 20, treasury: 50, gov: 10 });
          h.addTagModifier(ctx, 'HAS', {
            id: 'high_priesthood', name: 'The High Priesthood', months: -1,
            effects: { unrestAll: -1 },
          });
          h.addTagModifier(ctx, 'SEL', {
            id: 'war_of_two_kings', name: 'A War of Two Kings', months: 18,
            effects: { aiPassive: true, reinforceMult: 0.75 },
          });
          addWarscore(ctx, 'HAS', 10);
          h.setFlag(ctx, 'highPriesthood', true);
        }),
      },
      {
        label: 'Take Demetrius’ concessions, and no man’s office',
        tooltip: '+75 treasury, +5 legitimacy — and the kingdom’s civil war rages regardless (Seleucids passive 18 months, +5 warscore).',
        effects: guard('ev_balas_vs_demetrius:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { treasury: 75, legitimacy: 5 });
          h.addTagModifier(ctx, 'SEL', {
            id: 'war_of_two_kings', name: 'A War of Two Kings', months: 18,
            effects: { aiPassive: true, reinforceMult: 0.75 },
          });
          addWarscore(ctx, 'HAS', 5);
        }),
      },
    ],
  },

  // ── 19 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_wedding_at_ptolemais',
    title: 'The Wedding at Ptolemais',
    desc: 'Ptolemy Philometor has come up out of Egypt with his daughter Cleopatra, a '
      + 'fleet, and an army suitable to a wedding of kings, and at Ptolemais he has '
      + 'given her to Alexander with great pomp, as the manner of kings is. Jonathan was '
      + 'summoned, and came with silver and gold and raiment; and when certain pestilent '
      + 'fellows of Israel came to accuse him, the king clothed him in purple and seated '
      + 'him at his side, and the accusers fled. Egypt’s army on the coast road is '
      + 'called a wedding party. Armies have been called worse things.',
    forTag: 'HAS',
    date: { y: -150, m: 4 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Sit in purple beside kings',
        tooltip: '+10 legitimacy, +10 influence; Egypt warms to Judaea — and masses 6,000 men at Pelusium, watching Syria.',
        effects: guard('ev_wedding_at_ptolemais:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { legitimacy: 10, infl: 10 });
          setOpinion(ctx, 'PTO', 'HAS', 60);
          setOpinion(ctx, 'HAS', 'PTO', 60);
          setOpinion(ctx, 'PTO', 'SEL', -100);
          setOpinion(ctx, 'SEL', 'PTO', -100);
          if (alive(ctx, 'PTO')) {
            h.spawnArmy(ctx, 'PTO', 'Pelusium', { inf: 6, name: 'Army of Philometor' });
          }
        }),
      },
      {
        label: 'Come with gifts of silver and gold',
        tooltip: '−50 treasury, +5 legitimacy, +20 influence; Egypt warms to Judaea — and masses 6,000 men at Pelusium, watching Syria.',
        effects: guard('ev_wedding_at_ptolemais:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { treasury: -50, legitimacy: 5, infl: 20 });
          setOpinion(ctx, 'PTO', 'HAS', 60);
          setOpinion(ctx, 'HAS', 'PTO', 60);
          setOpinion(ctx, 'PTO', 'SEL', -100);
          setOpinion(ctx, 'SEL', 'PTO', -100);
          if (alive(ctx, 'PTO')) {
            h.spawnArmy(ctx, 'PTO', 'Pelusium', { inf: 6, name: 'Army of Philometor' });
          }
        }),
      },
    ],
  },

  // ── 20 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_mithridates_rises',
    title: 'The Arsacid Takes Media',
    desc: 'Mithridates the Arsacid, king of Parthia, is coming down out of the east the '
      + 'way winter comes — a province at a time, without hurry. His riders are in '
      + 'Media; Ecbatana, summer seat of kings since Cyrus, watches the passes and '
      + 'counts the horsemen on the ridgelines. The Seleucid east was won by '
      + 'Alexander’s veterans and is held by their grandsons’ taxes — and unless the '
      + 'satrapal armies stand beyond the Euphrates, the taxes will ride east.',
    forTag: 'both',
    date: { y: -148, m: 4 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'A province at a time',
        tooltip: 'Parthia opens a war against the live holder of Media. A prepared eastern army contains the advance; an unprepared frontier faces an Arsacid field host and lasting fiscal pressure.',
        effects: guard('ev_mithridates_rises:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'PAR')) return;
          const media = ctx.prov('Ecbatana');
          const target = media && media.owner !== 'PAR' ? media.owner : null;
          if (!target || !alive(ctx, target)) return;
          setOpinion(ctx, target, 'PAR', -100);
          setOpinion(ctx, 'PAR', target, -100);
          if (!findWar(ctx.game, 'PAR', target)) h.declareWar(ctx, 'PAR', target, 'The Arsacid Conquest of Media');
          if (menIn(ctx, target, EASTERN_PROVINCES) >= 8000) {
            // The east holds — for now, and at a price.
            h.addTagModifier(ctx, target, {
              id: 'holding_the_east', name: 'Holding the East', months: 24,
              effects: { incomeMult: 0.9 },
            });
            h.setFlag(ctx, 'mediaHeld', true);
            h.notify(ctx, {
              title: 'The East Holds', type: 'info', provName: 'Ecbatana',
              text: 'The satrapal armies stand, and the Arsacid waits for a thinner year.',
            });
          } else {
            const base = ctx.helpers.controls(ctx, 'PAR', 'Susa') ? 'Susa'
              : ctx.helpers.controls(ctx, 'PAR', 'Gazaca') ? 'Gazaca' : 'Ecbatana';
            h.spawnArmy(ctx, 'PAR', base, {
              inf: 6, cav: 8, name: 'Host of Mithridates',
              general: { name: 'Mithridates I', fire: 2, shock: 4, maneuver: 4 },
            });
            h.addTagModifier(ctx, target, {
              id: 'east_slips_away', name: 'The East Slips Away', months: -1,
              effects: { incomeMult: 0.9 },
            });
            h.addTagModifier(ctx, 'PAR', {
              id: 'arsacid_momentum', name: 'Arsacid Momentum', months: 24,
              effects: { siegeBonus: 1 },
            });
            h.adjust(ctx, 'PAR', { treasury: 50 });
            h.setFlag(ctx, 'mediaLost', true);
            h.notify(ctx, {
              title: 'The Arsacid comes west', type: 'war', provName: 'Ecbatana',
              text: 'Mithridates enters Media with a field army. Its cities must now be won on the live map.',
            });
          }
        }),
      },
    ],
  },

  // ── 21 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_parthia_babylon',
    title: 'The Horsemen Reach the Rivers',
    desc: 'The horsemen have reached the rivers. Seleucia on the Tigris — the eastern '
      + 'capital, the greatest of all the cities the Greeks ever built — debates behind '
      + 'its walls whether to open its gates to the Arsacid, and Babylon watches '
      + 'Seleucia; the date groves and the customs houses of the lowlands weigh where '
      + 'their silver will go. Unless the garrisons of Babylonia stand, the empire of '
      + 'Alexander’s heirs will be reduced, in one season, to Syria.',
    forTag: 'both',
    major: true,
    date: { y: -141, m: 4 },
    world: true,
    aiOption: 0,
    options: [
      {
        label: 'One king of kings for another',
        tooltip: 'Parthia presses the live holder of Babylonia. Ten thousand defenders can contain it; otherwise an Arsacid river army and siege momentum arrive. No province is transferred by script.',
        effects: guard('ev_parthia_babylon:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'PAR')) return;
          const river = ctx.prov('Seleucia-Ctesiphon');
          const target = river && river.owner !== 'PAR' ? river.owner : null;
          if (!target || !alive(ctx, target)) return;
          if (!findWar(ctx.game, 'PAR', target)) h.declareWar(ctx, 'PAR', target, 'The Arsacid Conquest of Babylonia');
          if (menIn(ctx, target, BABYLONIAN_PROVINCES) >= 10000) {
            h.addTagModifier(ctx, target, {
              id: 'king_in_the_east', name: 'The King in the East', months: 24,
              effects: { incomeMult: 0.95 },
            });
            h.notify(ctx, {
              title: 'Babylonia Holds', type: 'info', provName: 'Seleucia-Ctesiphon',
              text: 'The riverlands are held at ruinous cost. The Arsacid can afford patience.',
            });
          } else {
            const base = ctx.helpers.controls(ctx, 'PAR', 'Ecbatana') ? 'Ecbatana' : 'Susa';
            h.spawnArmy(ctx, 'PAR', base, {
              inf: 8, cav: 8, name: 'Army of the Rivers',
              general: { name: 'Mithridates I', fire: 2, shock: 4, maneuver: 4 },
            });
            h.removeModifier(ctx, target, 'east_slips_away');
            h.addTagModifier(ctx, target, {
              id: 'empire_of_syria_alone', name: 'An Empire of Syria Alone', months: -1,
              effects: { incomeMult: 0.85 },
            });
            h.addTagModifier(ctx, 'PAR', {
              id: 'horsemen_at_the_rivers', name: 'Horsemen at the Rivers', months: 24,
              effects: { siegeBonus: 1, reinforceMult: 1.08 },
            });
            h.adjust(ctx, 'PAR', { treasury: 100 });
            h.setFlag(ctx, 'babylonUnderPressure', true);
            h.notify(ctx, {
              title: 'The horsemen reach the rivers', type: 'war', provName: 'Seleucia-Ctesiphon',
              text: 'Mithridates has reached Babylonia. The cities will be decided by armies, not the event text.',
            });
          }
        }),
      },
    ],
  },

  // ── 22 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_tryphon',
    title: 'The Gates of Ptolemais',
    desc: 'Tryphon, who keeps a child king the way other men keep a seal-ring, feared '
      + 'Jonathan and dealt with him accordingly: he received him at Ptolemais with '
      + 'honors, persuaded him to send his army home, and shut the gates on him and the '
      + 'thousand men who remained. The thousand are dead. Jonathan is in chains. In '
      + 'Jerusalem, Simon stood up before the people in their fear and said: "You know '
      + 'what things I and my brethren and my father’s house have done for the laws and '
      + 'the sanctuary. All my brethren are slain for Israel’s sake, and I am left '
      + 'alone. Far be it from me to spare my own life in any time of trouble, for I am '
      + 'not better than my brethren." And the people answered with a great voice: "You '
      + 'are our leader, in the place of Judah and Jonathan your brothers."',
    forTag: 'HAS',
    major: true,
    trigger: safeTrigger('ev_tryphon', (ctx) =>
      dateGE(ctx, -143, 9) && alive(ctx, 'HAS') && !!ctx.helpers.getFlag(ctx, 'judahFallen')),
    aiOption: 0,
    options: [
      {
        label: 'I am not better than my brethren',
        tooltip: 'Jonathan is taken and will not return. -1 stability — and Simon (2/3/3) takes command, +5 legitimacy.',
        effects: guard('ev_tryphon:0', (ctx) => {
          const h = ctx.helpers;
          h.killGeneral(ctx, 'HAS', 'Jonathan Apphus');
          h.adjust(ctx, 'HAS', { stability: -1, legitimacy: 5 });
          const a = biggestArmy(ctx, 'HAS', true);
          if (a) {
            a.general = { name: 'Simon Thassi', fire: 2, shock: 3, maneuver: 3 };
          } else {
            const at = firstControlled(ctx, 'HAS', ['Jerusalem', 'Emmaus', 'Lydda']);
            if (at) {
              h.spawnArmy(ctx, 'HAS', at, {
                inf: 2, name: 'Army of Simon',
                general: { name: 'Simon Thassi', fire: 2, shock: 3, maneuver: 3 },
              });
            }
          }
          h.setRuler(ctx, 'HAS', { name: 'Simon Thassi', title: 'High Priest and Leader', gov: 4, infl: 3, mar: 3, age: 50 });
          h.setHeir(ctx, 'HAS', { name: 'John Hyrcanus', gov: 3, infl: 3, mar: 4, age: 21 });
          h.setFlag(ctx, 'jonathanTaken', true);
          h.notify(ctx, {
            title: 'Simon Takes Command', type: 'bad', provName: 'Ptolemais',
            text: 'Jonathan is seized by treachery at Ptolemais. The last brother leads.',
          });
        }),
      },
      {
        label: 'Pay the hundred talents, though it be a snare',
        tooltip: 'The silver and the children are sent, and Jonathan is not returned. −100 treasury, −1 stability, +15 legitimacy — none can say Simon grudged his brother’s ransom. Simon (2/3/3) takes command.',
        effects: guard('ev_tryphon:1', (ctx) => {
          const h = ctx.helpers;
          h.killGeneral(ctx, 'HAS', 'Jonathan Apphus');
          h.adjust(ctx, 'HAS', { stability: -1, legitimacy: 15, treasury: -100 });
          const a = biggestArmy(ctx, 'HAS', true);
          if (a) {
            a.general = { name: 'Simon Thassi', fire: 2, shock: 3, maneuver: 3 };
          } else {
            const at = firstControlled(ctx, 'HAS', ['Jerusalem', 'Emmaus', 'Lydda']);
            if (at) {
              h.spawnArmy(ctx, 'HAS', at, {
                inf: 2, name: 'Army of Simon',
                general: { name: 'Simon Thassi', fire: 2, shock: 3, maneuver: 3 },
              });
            }
          }
          h.setRuler(ctx, 'HAS', { name: 'Simon Thassi', title: 'High Priest and Leader', gov: 4, infl: 3, mar: 3, age: 50 });
          h.setHeir(ctx, 'HAS', { name: 'John Hyrcanus', gov: 3, infl: 3, mar: 4, age: 21 });
          h.setFlag(ctx, 'jonathanTaken', true);
          h.notify(ctx, {
            title: 'Simon Takes Command', type: 'bad', provName: 'Ptolemais',
            text: 'The ransom is paid and betrayed. Jonathan does not return; the last brother leads.',
          });
        }),
      },
    ],
  },

  // ── 23 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_spartan_letters',
    title: 'Brethren of the Stock of Abraham',
    desc: 'Letters have gone out under the seal of the leader of the Jews to Rome, and to '
      + 'Sparta, and to the cities: renewing friendship, and recalling that in the days '
      + 'of the high priest Onias the Spartans wrote that Spartans and Jews are '
      + 'brethren, of the stock of Abraham. Whether any Lacedaemonian ever traced that '
      + 'genealogy is a question for the schools. What the letters say beneath the '
      + 'greeting is what such letters always say: we are a nation among the nations '
      + 'now. Reckon with us.',
    forTag: 'HAS',
    date: { y: -144, m: 5 },
    aiOption: 0,
    options: [
      {
        label: 'A nation among the nations',
        tooltip: '+5 legitimacy, +10 influence.',
        effects: guard('ev_spartan_letters:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'HAS', { legitimacy: 5, infl: 10 });
        }),
      },
      {
        label: 'Send a shield of gold with the letters',
        tooltip: '−50 treasury, +5 legitimacy, +25 influence — a gift of a thousand pounds, that the nations may reckon with us.',
        effects: guard('ev_spartan_letters:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'HAS', { treasury: -50, legitimacy: 5, infl: 25 });
        }),
      },
    ],
  },

  // ── 24 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_akra_falls',
    title: 'The Akra Falls',
    desc: 'For a generation the citadel has stood over the Temple — the Akra, the '
      + 'king’s stone fist inside Jerusalem, provisioned and garrisoned and hated, the '
      + 'last argument of Antiochus in the city of David. Simon walled it round until no '
      + 'grain could enter, and hunger did what no assault had done. The garrison '
      + 'marched out under terms, and '
      + 'Israel entered with praise and palm branches, with harps and cymbals and viols, '
      + 'because a great enemy was destroyed out of Israel. The last Seleucid soldier '
      + 'has left Jerusalem.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev_akra_falls', (ctx) =>
      dateGE(ctx, -141, 3) && alive(ctx, 'HAS') && ctx.helpers.controls(ctx, 'HAS', 'Jerusalem')),
    aiOption: 0,
    options: [
      {
        label: 'With praise and palm branches',
        tooltip: '+15 legitimacy, +1 stability, +10 governance; Jerusalem: "The Citadel Cleansed" (-2 unrest, 36 months).',
        effects: guard('ev_akra_falls:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { legitimacy: 15, stability: 1, gov: 10 });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'citadel_cleansed', name: 'The Citadel Cleansed', months: 36,
            effects: { unrest: -2 },
          });
          h.setFlag(ctx, 'akraFallen', true);
          h.notify(ctx, {
            title: 'The Akra Falls', type: 'good', provName: 'Jerusalem',
            text: 'The citadel is starved out. No foreign garrison remains in the city of David.',
          });
        }),
      },
      {
        label: 'Cast the citadel down, stone from stone',
        tooltip: '+20 legitimacy, +1 stability, −40 treasury; Jerusalem: "The Citadel Cast Down" (−1 unrest, permanent) — no king shall garrison it again.',
        effects: guard('ev_akra_falls:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { legitimacy: 20, stability: 1, treasury: -40 });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'citadel_cast_down', name: 'The Citadel Cast Down', months: -1,
            effects: { unrest: -1 },
          });
          h.setFlag(ctx, 'akraFallen', true);
          h.notify(ctx, {
            title: 'The Akra Falls', type: 'good', provName: 'Jerusalem',
            text: 'The citadel is starved out and leveled to its foundations. The Temple stands over the city alone.',
          });
        }),
      },
    ],
  },

  // ── 25 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_hanukkah_pilgrims',
    title: 'The Days of Dedication',
    desc: 'A year has turned, and in the month of Kislev the roads climb again: pilgrims '
      + 'out of the Gophna hills and the Jordan valley and the villages of the south '
      + 'country, and the brethren lately brought home from Galilee, come up to keep '
      + 'the eight days ordained — the dedication of the altar, kept in its season from '
      + 'year to year. There are lamps in the doorways down the whole descent of the '
      + 'city. The old men who saw the courts grown up in brush like a mountainside '
      + 'walk through them now, and say the blessing for having been kept alive to '
      + 'see it.',
    forTag: 'HAS',
    trigger: safeTrigger('ev_hanukkah_pilgrims', (ctx) => {
      const h = ctx.helpers;
      if (!h.getFlag(ctx, 'templeRededicated')) return false;
      const y0 = h.getFlag(ctx, 'rededicatedYear');
      if (typeof y0 !== 'number') return false;
      return ctx.game.date.y > y0 && ctx.game.date.m === 12
        && h.controls(ctx, 'HAS', 'Jerusalem');
    }),
    aiOption: 0,
    options: [
      {
        label: 'From year to year',
        tooltip: '+5 legitimacy; Jerusalem: "Pilgrims of the Dedication" (+15% tax, -1 unrest, 12 months).',
        effects: guard('ev_hanukkah_pilgrims:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { legitimacy: 5 });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'dedication_pilgrims', name: 'Pilgrims of the Dedication', months: 12,
            effects: { taxMult: 1.15, unrest: -1 },
          });
        }),
      },
      {
        label: 'Keep the feast at the leader’s charge',
        tooltip: 'The gates stand open and no toll is taken: −30 treasury, +10 legitimacy; Jerusalem: "The Open Gates" (−2 unrest, 12 months).',
        effects: guard('ev_hanukkah_pilgrims:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { treasury: -30, legitimacy: 10 });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'dedication_pilgrims', name: 'The Open Gates', months: 12,
            effects: { unrest: -2 },
          });
        }),
      },
    ],
  },

  // ── 26 ────────────────────────────────────────────────────────────────────
  // Fired by BOOKMARK_167.checkVictory on the timed HAS win; never fires on its own.
  {
    id: 'ev_independence',
    title: 'The Great Assembly',
    desc: 'In the hundred and seventy-second year of the kingdom of the Greeks, the yoke of '
      + 'the heathen was taken away from Israel, and the people began to write in their '
      + 'instruments and contracts: "In the first year of the son of Mattathias, the great high priest, '
      + 'the commander and leader of the Jews." In a great assembly of the priests and '
      + 'the people and the princes of the nation it was engrossed on tables of brass '
      + 'and set up on Mount Zion: that Simon should be their leader and high priest for '
      + 'ever, until there should arise a faithful prophet. And the land of Judah had '
      + 'rest all his days; and they sat every man under his vine and his fig tree, and '
      + 'there was none to make them afraid.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev_independence', () => false),
    aiOption: 0,
    options: [
      {
        label: 'Until a faithful prophet arise',
        tooltip: 'Judaea: +25 legitimacy, +1 stability. The war of Mattathias is over.',
        effects: guard('ev_independence:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'HAS', { legitimacy: 25, stability: 1 });
        }),
      },
      {
        label: 'Leader and priest, but not king',
        tooltip: 'Simon takes no diadem, and the scribes set the nation’s instruments in order: Judaea +15 legitimacy, +1 stability, +10 governance, +10 influence. The war of Mattathias is over.',
        effects: guard('ev_independence:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'HAS', { legitimacy: 15, stability: 1, gov: 10, infl: 10 });
        }),
      },
    ],
  },

  // Fired by BOOKMARK_167.checkVictory when HAS reaches 50% war score; never
  // fires on its own. SPEC §31: the decree is an OFFER, not a verdict — the
  // player chooses. Accepting ends the revolt keeping only the provinces of
  // the faith (the hills the decree names); every other occupied town goes
  // back. Refusing stakes it all on the sword.
  {
    id: 'ev_terms_antioch',
    title: 'Terms from Antioch',
    requiresWar: ['HAS', 'SEL'],
    desc: 'Lysias speaks to the king’s council as he once spoke beneath Jerusalem’s walls, '
      + 'with Philip at his back: "We grow weaker daily, and the kingdom’s affairs press '
      + 'on every side. Let us give these men their right to live by their own laws, as '
      + 'before; for it was on account of their laws which we abolished that they were '
      + 'angered, and did all these things." The scribes wait with the royal seal. The '
      + 'elders of Judah may take the decree — the Law, the arms, the hills — or send '
      + 'the envoys home, and stake everything won and unwon on the sword.',
    forTag: 'HAS',
    major: true,
    trigger: safeTrigger('ev_terms_antioch', () => false),
    aiOption: 0,
    options: [
      {
        label: 'Take the decree — the Law, the arms, the hills',
        tooltip: 'Victory (score 200). The revolt ends: Judaea keeps the provinces of the faith it holds; every other occupied town returns to the kingdom of the Greeks.',
        effects: guard('ev_terms_antioch:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const w = (g.wars || []).find((x) => x
            && ((x.attackers || []).indexOf('HAS') >= 0 || (x.defenders || []).indexOf('HAS') >= 0)
            && ((x.attackers || []).indexOf('SEL') >= 0 || (x.defenders || []).indexOf('SEL') >= 0));
          const key = w && (w.attackers || []).indexOf('HAS') >= 0 ? 'att' : 'def';
          h.endWar(ctx, 'HAS', 'SEL', key, { keep: (p) => p.religion === 'judaism' });
          h.endGame(ctx, {
            result: 'win',
            title: 'Terms from Antioch',
            text: 'The decree goes out under the royal seal. Judea keeps its Law, its arms, '
              + 'and its hills — and the kingdom of the Greeks keeps its distance.',
            score: 200,
          });
        }),
      },
      {
        label: 'Send the envoys home — the whole inheritance',
        tooltip: 'The war goes on. +5 legitimacy for the defiance; the decree will not be offered twice. Win by the sword, or by the independence of 140 BCE.',
        effects: guard('ev_terms_antioch:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'HAS', { legitimacy: 5 });
          ctx.helpers.setFlag(ctx, 'termsRefused', true);
        }),
      },
    ],
  },

  // ═══ The post-independence decades: Simon, Hyrcanus, Aristobulus (1 Macc
  // 13–16; Josephus, Ant. XIII; Wars I). The campaign keeps running after the
  // verdict fires (helpers.endGame), and so does the chronicle. ═════════════

  // ── 27 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_bronze_tablets',
    title: 'The Tablets on Mount Zion',
    desc: 'In the third year of Simon the great high priest, the priests and the people '
      + 'and the rulers of the nation met in a great assembly and set down what the house '
      + 'of Mattathias had done, and what it should be. They wrote it on tables of brass '
      + 'and fixed them upon pillars on Mount Zion: that Simon should be their leader and '
      + 'high priest for ever, until there should arise a faithful prophet; that he should '
      + 'be obeyed of all, and all contracts written in his name; that he should be '
      + 'clothed in purple and wear gold; and that it should not be lawful for any of the '
      + 'people or the priests to gather an assembly without him, or to be clothed in '
      + 'purple, or wear a buckle of gold. A dynasty has been written into law by the men '
      + 'it will rule — with one clause left open, like a door, for heaven.',
    forTag: 'HAS',
    major: true,
    trigger: safeTrigger('ev_bronze_tablets', (ctx) =>
      dateGE(ctx, -140, 9) && alive(ctx, 'HAS') && ctx.helpers.controls(ctx, 'HAS', 'Jerusalem')),
    aiOption: 0,
    options: [
      {
        label: 'Fix the tablets upon pillars',
        tooltip: 'The charter of the house: +15 legitimacy, +1 stability; "The Tablets of Brass" (+0.1 legitimacy a month, permanent).',
        effects: guard('ev_bronze_tablets:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { legitimacy: 15, stability: 1 });
          h.addTagModifier(ctx, 'HAS', {
            id: 'tablets_of_brass', name: 'The Tablets of Brass', months: -1,
            effects: { legitimacyAdd: 0.1 },
          });
          h.setFlag(ctx, 'greatAssembly', true);
        }),
      },
      {
        label: 'Read the prophet-clause aloud first',
        tooltip: 'The scrupulous hear that the house holds its offices on loan from heaven: +10 legitimacy, +15 governance, +10 influence.',
        effects: guard('ev_bronze_tablets:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { legitimacy: 10, gov: 15, infl: 10 });
          h.setFlag(ctx, 'greatAssembly', true);
        }),
      },
    ],
  },

  // ── 28 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_numenius_returns',
    title: 'Numenius Returns from Rome',
    desc: 'Numenius son of Antiochus has come home from Rome, and the great shield of '
      + 'gold — a thousand minas’ weight — hangs no longer in Simon’s treasury but in the '
      + 'Capitol. He brings letters: the consul Lucius to king Ptolemy, to Demetrius, to '
      + 'Attalus, to Ariarathes and Arsaces, and to Sparta, Rhodes, and the cities — that '
      + 'the Jews are the friends of the Roman people, that no man make war upon them, '
      + 'and that whoever flees Judea with a price on his head be delivered up to Simon '
      + 'the high priest. It is only ink and bronze, and Rome is far away. But every '
      + 'chancery from Alexandria to Ecbatana now holds a copy, and files it where '
      + 'kingdoms file the things they dare not lose.',
    forTag: 'HAS',
    date: { y: -139, m: 6 },
    aiOption: 0,
    options: [
      {
        label: 'Read the letters in every court',
        tooltip: '+20 influence, +5 legitimacy; Rome warms to the friends it has chosen.',
        effects: guard('ev_numenius_returns:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HAS')) return;
          h.adjust(ctx, 'HAS', { infl: 20, legitimacy: 5 });
          setOpinion(ctx, 'ROM', 'HAS', 80);
          setOpinion(ctx, 'HAS', 'ROM', 60);
          h.setFlag(ctx, 'numeniusReturned', true);
        }),
      },
      {
        label: 'Send envoys on to Sparta and the isles',
        tooltip: '−30 treasury, +10 influence, +10 legitimacy — the friendship is renewed with every city the letters name.',
        effects: guard('ev_numenius_returns:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HAS')) return;
          h.adjust(ctx, 'HAS', { treasury: -30, infl: 10, legitimacy: 10 });
          setOpinion(ctx, 'ROM', 'HAS', 80);
          setOpinion(ctx, 'GRC', 'HAS', 40);
          h.setFlag(ctx, 'numeniusReturned', true);
        }),
      },
    ],
  },

  // ── 29 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_sidetes_rises',
    title: 'Antiochus Sidetes Comes for the Diadem',
    desc: 'A last son of the dynasty has come in from the islands: Antiochus, brother of '
      + 'captive Demetrius, called Sidetes for the city that raised him — young, sober, '
      + 'and in earnest, which the kingdom has not seen in a king for thirty years. He '
      + 'has landed against Tryphon the usurper, and the soldiers come over to him by '
      + 'companies. To Simon in Jerusalem he writes with the whole treasury of royal '
      + 'courtesy: the high priesthood confirmed, the exemptions confirmed, and leave to '
      + 'coin money for his own country with his own stamp — everything, in short, that '
      + 'costs a pretender nothing. What such letters are worth after the victory, the '
      + 'victory will show.',
    forTag: 'both',
    date: { y: -138, m: 4 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Court the high priest of the Jews',
        tooltip: 'Sidetes (3/3/4) takes the throne with 8,000 men at Antioch; Judaea is confirmed in everything — "Leave to Coin Money" (+10% income, 24 months).',
        effects: guard('ev_sidetes_rises:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'SEL')) {
            h.setRuler(ctx, 'SEL', { name: 'Antiochus VII Sidetes', title: 'Basileus', gov: 3, infl: 3, mar: 4, age: 20 });
            h.setHeir(ctx, 'SEL', null);
            h.adjust(ctx, 'SEL', { legitimacy: 15 });
            const at = firstControlled(ctx, 'SEL', ['Antioch', 'Seleucia Pieria', 'Damascus']);
            if (at) {
              h.spawnArmy(ctx, 'SEL', at, {
                inf: 8, name: 'Army of Sidetes',
                general: { name: 'Antiochus VII Sidetes', fire: 3, shock: 3, maneuver: 4 },
              });
            }
            setOpinion(ctx, 'SEL', 'HAS', 40);
          }
          if (alive(ctx, 'HAS')) {
            h.addTagModifier(ctx, 'HAS', {
              id: 'leave_to_coin_money', name: 'Leave to Coin Money', months: 24,
              effects: { incomeMult: 1.1 },
            });
            h.adjust(ctx, 'HAS', { legitimacy: 5 });
          }
          h.setFlag(ctx, 'sidetesKing', true);
        }),
      },
      {
        label: 'The dynasty first; the Jew after',
        tooltip: 'Sidetes (3/3/4) takes the throne with 9,000 men at Antioch, −40 treasury — and no letters go south.',
        effects: guard('ev_sidetes_rises:1', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'SEL')) {
            h.setRuler(ctx, 'SEL', { name: 'Antiochus VII Sidetes', title: 'Basileus', gov: 3, infl: 3, mar: 4, age: 20 });
            h.setHeir(ctx, 'SEL', null);
            h.adjust(ctx, 'SEL', { legitimacy: 15, treasury: -40 });
            const at = firstControlled(ctx, 'SEL', ['Antioch', 'Seleucia Pieria', 'Damascus']);
            if (at) {
              h.spawnArmy(ctx, 'SEL', at, {
                inf: 9, name: 'Army of Sidetes',
                general: { name: 'Antiochus VII Sidetes', fire: 3, shock: 3, maneuver: 4 },
              });
            }
          }
          h.setFlag(ctx, 'sidetesKing', true);
        }),
      },
    ],
  },

  // ── 30 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_tryphon_ends',
    title: 'The Usurper Runs Out of Sea',
    desc: 'Tryphon — who murdered Jonathan at Ptolemais, murdered the child king he '
      + 'pretended to serve, and wore a diadem no assembly ever voted him — has been '
      + 'shut up in Dora by land and sea. He slipped out by ship to Orthosia while the '
      + 'engines battered the wall, and ran along his shrinking coast to Apamea, where '
      + 'he began; and there it ended. The chroniclers do not agree whether he died by '
      + 'the sword or by his own hand, and no one has thought it worth settling. The '
      + 'kingdom has one king again — young, victorious, and no longer in need of the '
      + 'friends the war made him.',
    forTag: 'SEL',
    date: { y: -138, m: 10 },
    aiOption: 0,
    options: [
      {
        label: 'Hunt him from Dora to Apamea',
        tooltip: 'No second usurper learns the trade: Seleucids +15 legitimacy, +1 stability, −30 treasury.',
        effects: guard('ev_tryphon_ends:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'SEL')) return;
          h.adjust(ctx, 'SEL', { legitimacy: 15, stability: 1, treasury: -30 });
          h.setFlag(ctx, 'tryphonDead', true);
        }),
      },
      {
        label: 'Let the coast finish him; muster the kingdom',
        tooltip: 'The garrisons come over whole: Seleucids +10 legitimacy, +1 stability; "The Kingdom Reunited" (+10% reinforcements, 24 months).',
        effects: guard('ev_tryphon_ends:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'SEL')) return;
          h.adjust(ctx, 'SEL', { legitimacy: 10, stability: 1 });
          h.addTagModifier(ctx, 'SEL', {
            id: 'kingdom_reunited', name: 'The Kingdom Reunited', months: 24,
            effects: { reinforceMult: 1.1 },
          });
          h.setFlag(ctx, 'tryphonDead', true);
        }),
      },
    ],
  },

  // ── 31 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_athenobius',
    title: 'Athenobius Names the Price',
    desc: 'The king who wrote so warmly from the islands writes differently from a '
      + 'throne. Athenobius, one of the king’s Friends, has come up to Jerusalem and '
      + 'recited the demand: Joppa, Gazara, and the citadel of Jerusalem, taken by force '
      + 'from the kingdom — return them, or pay a thousand talents of silver. He was '
      + 'shown the glory of Simon’s house, the gold and silver plate and the great '
      + 'attendance, and heard the old man’s answer: "We have neither taken other men’s '
      + 'land, nor hold that which appertaineth to others, but the inheritance of our '
      + 'fathers, which our enemies had wrongfully in possession a certain time. For '
      + 'Joppa and Gazara, which did great harm unto our people — for them we will give '
      + 'a hundred talents." Athenobius answered him not a word, but returned in a rage '
      + 'to the king.',
    forTag: 'HAS',
    date: { y: -138, m: 12 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'A hundred talents, and not a stone',
        tooltip: 'The offer goes with the envoy: −50 treasury, +10 legitimacy. The king will not take it — but the nations hear who offered peace.',
        effects: guard('ev_athenobius:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HAS')) return;
          h.adjust(ctx, 'HAS', { treasury: -50, legitimacy: 10 });
          setOpinion(ctx, 'SEL', 'HAS', -160);
          h.setFlag(ctx, 'sidetesBreach', true);
        }),
      },
      {
        label: 'Not a talent: it is the inheritance of our fathers',
        tooltip: '+15 legitimacy; Antioch’s rage is complete — the raids will come.',
        effects: guard('ev_athenobius:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HAS')) return;
          h.adjust(ctx, 'HAS', { legitimacy: 15 });
          setOpinion(ctx, 'SEL', 'HAS', -200);
          h.setFlag(ctx, 'sidetesBreach', true);
        }),
      },
    ],
  },

  // ── 32 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_kendebaios',
    title: 'Kendebaios at Jamnia',
    desc: 'The king has gone north after Tryphon’s remnants and left the coast to '
      + 'Kendebaios, captain of the seaboard, with orders that require no interpreting: '
      + 'build Kedron in the plain, hold the roads, and make war upon the people of '
      + 'Judea. His horsemen ride up the ascents by day and burn by night, and take men '
      + 'captive out of the villages of the low country. Simon is old, and grown grey in '
      + 'the harness; and he called his two eldest sons and said: "I and my brethren '
      + 'have fought the wars of Israel from our youth; but I am old. Be ye instead of '
      + 'me and my brother, and go forth and fight for our nation, and the help of '
      + 'heaven be with you."',
    forTag: 'SEL',
    date: { y: -137, m: 6 },
    aiOption: 0,
    options: [
      {
        label: 'Build Kedron and bar the plain',
        tooltip: 'Kendebaios (2/2/2) musters 5,000 at Jamnia and fortifies it (+1 fort level); the old war reopens.',
        effects: guard('ev_kendebaios:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'SEL')) return;
          const at = firstControlled(ctx, 'SEL', ['Jamnia', 'Azotus', 'Ascalon', 'Damascus']);
          if (at) {
            h.spawnArmy(ctx, 'SEL', at, {
              inf: 4, cav: 1, name: 'Host of Kendebaios',
              general: { name: 'Kendebaios', fire: 2, shock: 2, maneuver: 2 },
            });
          }
          if (h.controls(ctx, 'SEL', 'Jamnia')) {
            const per = (ctx.DEFINES && ctx.DEFINES.BASE && ctx.DEFINES.BASE.fortGarrisonPerLevel) || 1000;
            const p = ctx.prov('Jamnia');
            if (p && (p.fort || 0) < 3) {
              p.fort = (p.fort || 0) + 1;
              if (typeof p.maxGarrison === 'number') {
                p.maxGarrison += per;
                p.garrison = Math.min((p.garrison || 0) + per, p.maxGarrison);
              }
            }
          }
          if (alive(ctx, 'HAS') && !findWar(ctx.game, 'HAS', 'SEL')) {
            h.declareWar(ctx, 'SEL', 'HAS', 'The War of Antiochus Sidetes');
          }
          try {
            if (ctx.game.tags.SEL && ctx.game.tags.SEL.aiState) {
              ctx.game.tags.SEL.aiState.target = 'Lydda';
            }
          } catch (e) { warnOnce('kendebaios:aiState', e); }
          h.setFlag(ctx, 'kendebaiosMarched', true);
          h.notify(ctx, {
            title: 'Kendebaios at Jamnia', type: 'war', provName: 'Jamnia',
            text: 'The captain of the seaboard fortifies Kedron and raids the ascents of Judea.',
          });
        }),
      },
      {
        label: 'Raid the ascents before the walls are dry',
        tooltip: 'Kendebaios (2/2/2) musters 5,000 at Jamnia and burns the low country: +1 unrest and −10% tax in Judaea’s border towns for 12 months.',
        effects: guard('ev_kendebaios:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'SEL')) return;
          const at = firstControlled(ctx, 'SEL', ['Jamnia', 'Azotus', 'Ascalon', 'Damascus']);
          if (at) {
            h.spawnArmy(ctx, 'SEL', at, {
              inf: 4, cav: 1, name: 'Host of Kendebaios',
              general: { name: 'Kendebaios', fire: 2, shock: 2, maneuver: 2 },
            });
          }
          for (const name of ['Lydda', 'Emmaus']) {
            if (!ctx.helpers.controls(ctx, 'HAS', name)) continue;
            h.addProvinceModifier(ctx, name, {
              id: 'kendebaios_raids', name: 'The Horsemen of Kendebaios', months: 12,
              effects: { unrest: 1, taxMult: 0.9 },
            });
          }
          if (alive(ctx, 'HAS') && !findWar(ctx.game, 'HAS', 'SEL')) {
            h.declareWar(ctx, 'SEL', 'HAS', 'The War of Antiochus Sidetes');
          }
          h.setFlag(ctx, 'kendebaiosMarched', true);
          h.notify(ctx, {
            title: 'Kendebaios at Jamnia', type: 'war', provName: 'Jamnia',
            text: 'The captain of the seaboard raids the villages of the low country.',
          });
        }),
      },
    ],
  },

  // ── 33 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_kedron',
    title: 'The Young Men at Kedron',
    desc: 'Judas and John, the sons of Simon, took twenty thousand men and horsemen — '
      + 'the first horsemen Israel has fielded in this long war — and lodged at Modein, '
      + 'where their grandfather pulled the altar down. In the morning a brook lay '
      + 'between the armies, and the men feared to cross; so John crossed first, and the '
      + 'people after him. Kendebaios’ host broke and ran for the towers of Kedron and '
      + 'the fields of Azotus, and John smote them until the evening. Judas was wounded '
      + 'in the arm; John pursued. The old men in Jerusalem, hearing it, said what old '
      + 'men say: that the sons are become as the fathers — and for once the old men '
      + 'were right.',
    forTag: 'HAS',
    major: true,
    trigger: safeTrigger('ev_kedron', (ctx) => {
      const h = ctx.helpers;
      if (!h.getFlag(ctx, 'kendebaiosMarched')) return false;
      if (!alive(ctx, 'HAS')) return false;
      if (!dateGE(ctx, -137, 9)) return false;
      if (!findWar(ctx.game, 'HAS', 'SEL')) return false;
      const ka = armyByGeneral(ctx, 'SEL', 'Kendebaios');
      if (!ka) return true; // his host was destroyed in the field
      if (ka.retreating) return true;
      // Calendar fallback: by spring 136 the sons have marched, if Israel can.
      return dateGE(ctx, -136, 4) && totalMen(ctx, 'HAS') >= 2000;
    }),
    aiOption: 0,
    options: [
      {
        label: 'John crosses the brook first',
        tooltip: 'Kendebaios is broken: +15 military points, +10 legitimacy, +1,000 manpower, +10 warscore; John Hyrcanus (3/3/4) takes a command. The kingdom’s war-weariness grows.',
        effects: guard('ev_kedron:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { mar: 15, legitimacy: 10, manpower: 1000 });
          h.adjust(ctx, 'SEL', { warExhaustion: 1 });
          addWarscore(ctx, 'HAS', 10);
          if (!armyByGeneral(ctx, 'HAS', 'John Hyrcanus')) {
            const a = biggestArmy(ctx, 'HAS', true);
            if (a) a.general = { name: 'John Hyrcanus', fire: 3, shock: 3, maneuver: 4 };
          }
          h.setFlag(ctx, 'kedronWon', true);
          h.notify(ctx, {
            title: 'Victory at Kedron', type: 'good', provName: 'Lydda',
            text: 'The sons of Simon break the host of Kendebaios in the plain.',
          });
        }),
      },
      {
        label: 'Pursue to the towers of Azotus',
        tooltip: 'The towers burn: +15 military points, +30 treasury, −500 manpower, +15 warscore; John Hyrcanus (3/3/4) takes a command. The kingdom’s war-weariness grows.',
        effects: guard('ev_kedron:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { mar: 15, treasury: 30, manpower: -500 });
          h.adjust(ctx, 'SEL', { warExhaustion: 1 });
          addWarscore(ctx, 'HAS', 15);
          if (!armyByGeneral(ctx, 'HAS', 'John Hyrcanus')) {
            const a = biggestArmy(ctx, 'HAS', true);
            if (a) a.general = { name: 'John Hyrcanus', fire: 3, shock: 3, maneuver: 4 };
          }
          h.setFlag(ctx, 'kedronWon', true);
          h.notify(ctx, {
            title: 'Victory at Kedron', type: 'good', provName: 'Lydda',
            text: 'The pursuit runs to Azotus, and the towers of Kedron burn behind it.',
          });
        }),
      },
    ],
  },

  // ── 34 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_death_of_simon',
    title: 'Murder at the Fortress of Dok',
    desc: 'Simon went down in the eleventh month to visit the cities of the country, and '
      + 'came to Jericho with his sons Mattathias and Judas — and Ptolemy son of Abubus, '
      + 'his own son-in-law, captain of the plain of Jericho, received them into the '
      + 'little fortress called Dok that he had built above the springs, and made them a '
      + 'great banquet. When Simon and his sons had drunk well, Ptolemy and his men rose '
      + 'up, and took their weapons, and slew the old man and both his sons and certain '
      + 'of his servants. So died the last of the five brothers of Modein — not in the '
      + 'passes, not before the phalanx, but at his own kinsman’s table. Ptolemy’s '
      + 'assassins are already riding for Gazara, where John is; and Ptolemy has written '
      + 'to the king to send him forces, promising to deliver him the country.',
    forTag: 'HAS',
    date: { y: -135, m: 2 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Ride for Jerusalem before the murderer',
        tooltip: 'John kills the assassins sent for him and takes the city first: John Hyrcanus (4/3/4) rules; −1 stability, −10 legitimacy, then +10 legitimacy as Jerusalem holds for the son of Simon.',
        effects: guard('ev_death_of_simon:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HAS')) return;
          h.killGeneral(ctx, 'HAS', 'Simon Thassi');
          h.adjust(ctx, 'HAS', { stability: -1 });
          if (!armyByGeneral(ctx, 'HAS', 'John Hyrcanus')) {
            const a = biggestArmy(ctx, 'HAS', true);
            if (a) {
              a.general = { name: 'John Hyrcanus', fire: 3, shock: 3, maneuver: 4 };
            } else {
              const at = firstControlled(ctx, 'HAS', ['Jerusalem', 'Emmaus', 'Lydda']);
              if (at) {
                h.spawnArmy(ctx, 'HAS', at, {
                  inf: 2, name: 'Army of Hyrcanus',
                  general: { name: 'John Hyrcanus', fire: 3, shock: 3, maneuver: 4 },
                });
              }
            }
          }
          h.setRuler(ctx, 'HAS', { name: 'John Hyrcanus', title: 'High Priest', gov: 4, infl: 3, mar: 4, age: 30 });
          h.setHeir(ctx, 'HAS', { name: 'Aristobulus', gov: 2, infl: 2, mar: 3, age: 18 });
          if (h.controls(ctx, 'HAS', 'Jerusalem')) {
            h.adjust(ctx, 'HAS', { legitimacy: 10 });
            h.addProvinceModifier(ctx, 'Jerusalem', {
              id: 'city_holds_for_john', name: 'The City Holds for John', months: 12,
              effects: { unrest: -1 },
            });
          }
          h.setFlag(ctx, 'simonMurdered', true);
          h.notify(ctx, {
            title: 'Simon Is Murdered at Dok', type: 'bad', provName: 'Jericho',
            text: 'The last brother of Modein dies at his kinsman’s table. John Hyrcanus reaches Jerusalem first.',
          });
        }),
      },
      {
        label: 'Besiege Ptolemy in Dok',
        tooltip: 'Vengeance before the crown: John Hyrcanus (4/3/4) rules; −1 stability, −5 legitimacy, −30 treasury, +10 military points; Jericho suffers the siege (+1 unrest, 12 months) — and the sabbatical year lets Ptolemy slip away.',
        effects: guard('ev_death_of_simon:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HAS')) return;
          h.killGeneral(ctx, 'HAS', 'Simon Thassi');
          h.adjust(ctx, 'HAS', { stability: -1, legitimacy: -5, treasury: -30, mar: 10 });
          if (!armyByGeneral(ctx, 'HAS', 'John Hyrcanus')) {
            const a = biggestArmy(ctx, 'HAS', true);
            if (a) {
              a.general = { name: 'John Hyrcanus', fire: 3, shock: 3, maneuver: 4 };
            } else {
              const at = firstControlled(ctx, 'HAS', ['Jerusalem', 'Emmaus', 'Lydda']);
              if (at) {
                h.spawnArmy(ctx, 'HAS', at, {
                  inf: 2, name: 'Army of Hyrcanus',
                  general: { name: 'John Hyrcanus', fire: 3, shock: 3, maneuver: 4 },
                });
              }
            }
          }
          h.setRuler(ctx, 'HAS', { name: 'John Hyrcanus', title: 'High Priest', gov: 4, infl: 3, mar: 4, age: 30 });
          h.setHeir(ctx, 'HAS', { name: 'Aristobulus', gov: 2, infl: 2, mar: 3, age: 18 });
          if (h.controls(ctx, 'HAS', 'Jericho')) {
            h.addProvinceModifier(ctx, 'Jericho', {
              id: 'siege_of_dok', name: 'The Siege of Dok', months: 12,
              effects: { unrest: 1 },
            });
          }
          h.setFlag(ctx, 'simonMurdered', true);
          h.notify(ctx, {
            title: 'Simon Is Murdered at Dok', type: 'bad', provName: 'Jericho',
            text: 'The last brother of Modein dies at his kinsman’s table. John besieges the murderer above the springs.',
          });
        }),
      },
    ],
  },

  // ── 35 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_sidetes_siege',
    title: 'Sidetes Before Jerusalem',
    desc: 'The king has come south himself, in the first year of the new high priest, '
      + 'with the whole strength of a kingdom that for once is not fighting itself. He '
      + 'wasted the country, shut Hyrcanus up in Jerusalem, and drew a double ditch '
      + 'about the city with a hundred towers of wood upon it. Within the walls the '
      + 'grain fails, and the useless mouths are put outside the gates and wander '
      + 'between the armies, dying in the ditch, until Hyrcanus takes them in again for '
      + 'pity. Yet this Antiochus is not that Antiochus: when the feast of Tabernacles '
      + 'came he granted a truce of seven days, and sent in bulls with gilded horns and '
      + 'cups of gold and silver for the sacrifices — and the city, that had braced for '
      + 'an Epiphanes, began to call him Antiochus the Pious.',
    forTag: 'both',
    date: { y: -134, m: 5 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'A hundred towers about the city',
        tooltip: 'The king (3/3/4) invests Jerusalem with 14,000 men; famine in the city (+2 unrest, −20% tax, 12 months); Seleucid siege engines (+1 siege, 12 months).',
        effects: guard('ev_sidetes_siege:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'SEL') || !alive(ctx, 'HAS')) return;
          if (!findWar(ctx.game, 'HAS', 'SEL')) {
            h.declareWar(ctx, 'SEL', 'HAS', 'The War of Antiochus Sidetes');
          }
          const at = firstControlled(ctx, 'SEL', ['Sebaste', 'Jamnia', 'Damascus', 'Antioch']);
          if (at) {
            h.spawnArmy(ctx, 'SEL', at, {
              inf: 12, cav: 2, name: 'The King’s Own',
              general: { name: 'Antiochus VII Sidetes', fire: 3, shock: 3, maneuver: 4 },
            });
          }
          if (h.controls(ctx, 'HAS', 'Jerusalem')) {
            h.addProvinceModifier(ctx, 'Jerusalem', {
              id: 'famine_in_the_city', name: 'Famine in the City', months: 12,
              effects: { unrest: 2, taxMult: 0.8 },
            });
          }
          h.addTagModifier(ctx, 'SEL', {
            id: 'towers_of_sidetes', name: 'The Hundred Towers', months: 12,
            effects: { siegeBonus: 1 },
          });
          try {
            if (ctx.game.tags.SEL && ctx.game.tags.SEL.aiState) {
              ctx.game.tags.SEL.aiState.target = 'Jerusalem';
            }
          } catch (e) { warnOnce('sidetes_siege:aiState', e); }
          h.setFlag(ctx, 'sidetesBesieges', true);
          h.notify(ctx, {
            title: 'Sidetes Before Jerusalem', type: 'war', provName: 'Jerusalem',
            text: 'The king draws a double ditch about the city, with a hundred towers of wood upon it.',
          });
        }),
      },
      {
        label: 'Let hunger and the feast do the work',
        tooltip: 'The king (3/3/4) invests Jerusalem with 14,000 men and sends in the Tabernacles sacrifices: famine in the city (+2 unrest, −20% tax, 12 months); Seleucids +10 legitimacy, Judaea +5 legitimacy — "the Pious" spares the altar.',
        effects: guard('ev_sidetes_siege:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'SEL') || !alive(ctx, 'HAS')) return;
          if (!findWar(ctx.game, 'HAS', 'SEL')) {
            h.declareWar(ctx, 'SEL', 'HAS', 'The War of Antiochus Sidetes');
          }
          const at = firstControlled(ctx, 'SEL', ['Sebaste', 'Jamnia', 'Damascus', 'Antioch']);
          if (at) {
            h.spawnArmy(ctx, 'SEL', at, {
              inf: 12, cav: 2, name: 'The King’s Own',
              general: { name: 'Antiochus VII Sidetes', fire: 3, shock: 3, maneuver: 4 },
            });
          }
          if (h.controls(ctx, 'HAS', 'Jerusalem')) {
            h.addProvinceModifier(ctx, 'Jerusalem', {
              id: 'famine_in_the_city', name: 'Famine in the City', months: 12,
              effects: { unrest: 2, taxMult: 0.8 },
            });
          }
          h.adjust(ctx, 'SEL', { legitimacy: 10 });
          h.adjust(ctx, 'HAS', { legitimacy: 5 });
          h.setFlag(ctx, 'sidetesBesieges', true);
          h.notify(ctx, {
            title: 'Sidetes Before Jerusalem', type: 'war', provName: 'Jerusalem',
            text: 'The king invests the city — and sends bulls with gilded horns for the feast within it.',
          });
        }),
      },
    ],
  },

  // ── 36 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_jerusalem_terms',
    title: 'The Honorable Terms',
    desc: 'The terms are written, and they astonish both camps by their decency. The '
      + 'king’s hard men — the ones who remember Epiphanes, and urge him nightly to '
      + 'root the nation out — are refused: there will be no garrison in Jerusalem, no '
      + 'altar to any god but Israel’s, no touching of the Law. Hyrcanus gives '
      + 'hostages, among them his own brother; the battlements of the wall are thrown '
      + 'down; and tribute is set for Joppa and the towns held outside Judea proper. '
      + 'Five hundred talents of silver must be found at once — and Hyrcanus knows '
      + 'where silver sleeps: the sepulchre of David, untouched these eight hundred '
      + 'years, holds more than any living treasury in the land.',
    forTag: 'HAS',
    major: true,
    trigger: safeTrigger('ev_jerusalem_terms', (ctx) => {
      const h = ctx.helpers;
      if (!h.getFlag(ctx, 'sidetesBesieges')) return false;
      if (!alive(ctx, 'HAS') || !alive(ctx, 'SEL')) return false;
      if (!findWar(ctx.game, 'HAS', 'SEL')) return false;
      return dateGE(ctx, -133, 6);
    }),
    aiOption: (ctx) => {
      try { return (ctx.game.tags.HAS.treasury || 0) < 120 ? 1 : 0; } catch (e) { return 0; }
    },
    options: [
      {
        label: 'Pay from the treasury, and spare the tomb',
        tooltip: 'Peace with the kingdom (occupations revert): −100 treasury, −5 legitimacy (the hostages), +1 stability; Jerusalem loses 1 fort level; "Tribute for Joppa" (−10% income until the kingdom breaks).',
        effects: guard('ev_jerusalem_terms:0', (ctx) => {
          const h = ctx.helpers;
          h.endWar(ctx, 'HAS', 'SEL', null);
          h.adjust(ctx, 'HAS', { treasury: -100, legitimacy: -5, stability: 1 });
          const per = (ctx.DEFINES && ctx.DEFINES.BASE && ctx.DEFINES.BASE.fortGarrisonPerLevel) || 1000;
          const p = ctx.prov('Jerusalem');
          if (p && (p.fort || 0) > 0) {
            p.fort -= 1;
            if (typeof p.maxGarrison === 'number') {
              p.maxGarrison = Math.max(0, p.maxGarrison - per);
              p.garrison = Math.min(p.garrison || 0, p.maxGarrison);
            }
          }
          h.addTagModifier(ctx, 'HAS', {
            id: 'tribute_of_joppa', name: 'Tribute for Joppa', months: -1,
            effects: { incomeMult: 0.9 },
          });
          h.removeModifier(ctx, 'Jerusalem', 'famine_in_the_city');
          h.setFlag(ctx, 'jerusalemTerms', true);
          h.notify(ctx, {
            title: 'The Honorable Terms', type: 'info', provName: 'Jerusalem',
            text: 'No garrison, no idolatry — but hostages, tribute, and the battlements thrown down.',
          });
        }),
      },
      {
        label: 'Open the sepulchre of David',
        tooltip: 'Peace with the kingdom (occupations revert): +50 treasury remains after the tribute, −15 legitimacy (the pious murmur at the opened tomb), +1 stability; Jerusalem loses 1 fort level; "Tribute for Joppa" (−10% income until the kingdom breaks).',
        effects: guard('ev_jerusalem_terms:1', (ctx) => {
          const h = ctx.helpers;
          h.endWar(ctx, 'HAS', 'SEL', null);
          h.adjust(ctx, 'HAS', { treasury: 50, legitimacy: -15, stability: 1 });
          const per = (ctx.DEFINES && ctx.DEFINES.BASE && ctx.DEFINES.BASE.fortGarrisonPerLevel) || 1000;
          const p = ctx.prov('Jerusalem');
          if (p && (p.fort || 0) > 0) {
            p.fort -= 1;
            if (typeof p.maxGarrison === 'number') {
              p.maxGarrison = Math.max(0, p.maxGarrison - per);
              p.garrison = Math.min(p.garrison || 0, p.maxGarrison);
            }
          }
          h.addTagModifier(ctx, 'HAS', {
            id: 'tribute_of_joppa', name: 'Tribute for Joppa', months: -1,
            effects: { incomeMult: 0.9 },
          });
          h.removeModifier(ctx, 'Jerusalem', 'famine_in_the_city');
          h.setFlag(ctx, 'jerusalemTerms', true);
          h.setFlag(ctx, 'davidsTombOpened', true);
          h.notify(ctx, {
            title: 'The Honorable Terms', type: 'info', provName: 'Jerusalem',
            text: 'The tribute is paid in silver eight hundred years asleep. The pious count the cost differently.',
          });
        }),
      },
    ],
  },

  // ── 37 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_hyrcanus_east',
    title: 'The Vassal Rides East',
    desc: 'Antiochus has turned at last to the wound that matters: the east, where the '
      + 'Arsacid sits in the palaces of Media and the tribute of half the world rides '
      + 'away on horseback. The muster is the greatest since Ipsus, they say — and in '
      + 'its ranks, under the terms of the peace, march the Jews, with Hyrcanus the '
      + 'high priest at their head. The chroniclers of Israel will remember one thing '
      + 'above all: when the feast of Shavuot fell after a Sabbath, the whole army of '
      + 'Asia stood in camp two days, because the king would not make the Jews march. '
      + 'Kings have bought loyalty with cities and failed; this one bought it with two '
      + 'days of patience.',
    forTag: 'HAS',
    major: true,
    trigger: safeTrigger('ev_hyrcanus_east', (ctx) => {
      const h = ctx.helpers;
      if (!h.getFlag(ctx, 'jerusalemTerms')) return false;
      if (!alive(ctx, 'HAS') || !alive(ctx, 'SEL')) return false;
      return dateGE(ctx, -130, 4);
    }),
    aiOption: 0,
    options: [
      {
        label: 'Ride with the king, and keep the feast',
        tooltip: 'The Grand Army of the East musters (Sidetes +18,000 men at Antioch, war with Parthia); Judaea sends its contingent: −1,000 manpower, +15 military points, +10 influence; "The King Keeps Shavuot" (+5% morale, 12 months).',
        effects: guard('ev_hyrcanus_east:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'PAR') && !findWar(ctx.game, 'SEL', 'PAR')) {
            h.declareWar(ctx, 'SEL', 'PAR', 'The Anabasis of Antiochus Sidetes');
          }
          const at = firstControlled(ctx, 'SEL', ['Antioch', 'Damascus', 'Zeugma']);
          if (at) {
            h.spawnArmy(ctx, 'SEL', at, {
              inf: 14, cav: 4, name: 'Grand Army of the East',
              general: { name: 'Antiochus VII Sidetes', fire: 3, shock: 3, maneuver: 4 },
            });
          }
          h.adjust(ctx, 'HAS', { manpower: -1000, mar: 15, infl: 10 });
          setOpinion(ctx, 'SEL', 'HAS', 60);
          h.addTagModifier(ctx, 'HAS', {
            id: 'king_keeps_shavuot', name: 'The King Keeps Shavuot', months: 12,
            effects: { moraleMult: 1.05 },
          });
          h.setFlag(ctx, 'hyrcanusEast', true);
        }),
      },
      {
        label: 'Send the tribute’s men and stay in Jerusalem',
        tooltip: 'The Grand Army of the East musters (Sidetes +18,000 men at Antioch, war with Parthia); Judaea sends less and keeps its priest: −500 manpower, +10 governance.',
        effects: guard('ev_hyrcanus_east:1', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'PAR') && !findWar(ctx.game, 'SEL', 'PAR')) {
            h.declareWar(ctx, 'SEL', 'PAR', 'The Anabasis of Antiochus Sidetes');
          }
          const at = firstControlled(ctx, 'SEL', ['Antioch', 'Damascus', 'Zeugma']);
          if (at) {
            h.spawnArmy(ctx, 'SEL', at, {
              inf: 14, cav: 4, name: 'Grand Army of the East',
              general: { name: 'Antiochus VII Sidetes', fire: 3, shock: 3, maneuver: 4 },
            });
          }
          h.adjust(ctx, 'HAS', { manpower: -500, gov: 10 });
          setOpinion(ctx, 'SEL', 'HAS', 20);
          h.setFlag(ctx, 'hyrcanusEast', false);
        }),
      },
    ],
  },

  // ── 38 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_sidetes_falls',
    title: 'The Ambush in Media',
    desc: 'It went well for a year — three battles won, Babylonia recovered, the Arsacid '
      + 'suing for terms — and then the army wintered dispersed in the towns of Media, '
      + 'eating the country bare, and the country rose on an appointed day. The king '
      + 'ran to the nearest fighting with the handful around him, was cut off in a '
      + 'valley, and died there; whether by a Parthian arrow or his own sword, the '
      + 'accounts do not agree. He was the last. The kingdom of the house of Seleucus '
      + 'will quarrel on for decades yet, but it will never again cross the Euphrates '
      + 'in strength; and every chancery from Rome to Jerusalem, reading the dispatch, '
      + 'strikes the same line from its ledgers — the one where the kingdom of the '
      + 'Greeks was still counted among the powers of the earth.',
    forTag: 'both',
    date: { y: -129, m: 3 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The kingdom never again crosses the Euphrates',
        tooltip: 'Sidetes dies in Media: Seleucids −1 stability, −15 legitimacy, "The Kingdom Draws In" (−10% reinforcements, permanent); Parthia +100 treasury, +10 legitimacy and keeps what it holds; Judaea’s tribute lapses (+10 legitimacy).',
        effects: guard('ev_sidetes_falls:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'SEL')) {
            h.killGeneral(ctx, 'SEL', 'Antiochus VII Sidetes');
            h.setRuler(ctx, 'SEL', { name: 'Demetrius II Nicator', title: 'Basileus', gov: 2, infl: 2, mar: 2, age: 31 });
            h.setHeir(ctx, 'SEL', null);
            h.adjust(ctx, 'SEL', { stability: -1, legitimacy: -15 });
            h.addTagModifier(ctx, 'SEL', {
              id: 'kingdom_draws_in', name: 'The Kingdom Draws In', months: -1,
              effects: { reinforceMult: 0.9 },
            });
          }
          if (alive(ctx, 'PAR')) {
            h.adjust(ctx, 'PAR', { treasury: 100, legitimacy: 10 });
            const w = findWar(ctx.game, 'SEL', 'PAR');
            if (w) {
              const key = (w.attackers || []).indexOf('PAR') >= 0 ? 'att' : 'def';
              h.endWar(ctx, 'PAR', 'SEL', key);
            }
          }
          if (alive(ctx, 'HAS')) {
            h.removeModifier(ctx, 'HAS', 'tribute_of_joppa');
            h.adjust(ctx, 'HAS', { legitimacy: 10 });
            if (h.getFlag(ctx, 'hyrcanusEast')) {
              // Josephus: Hyrcanus was home before the winter dispersal.
              h.adjust(ctx, 'HAS', { legitimacy: 5 });
            }
          }
          h.setFlag(ctx, 'sidetesFallen', true);
          h.notify(ctx, {
            title: 'Antiochus Sidetes Is Dead', type: 'info', provName: 'Ecbatana',
            text: 'The last soldier-king of the Greeks dies in a Median valley. The tribute of Judea lapses with him.',
          });
        }),
      },
      {
        label: 'The Parthian sends the body home in silver',
        tooltip: 'As above, but the coffin of silver steadies the succession: Seleucids −1 stability, −10 legitimacy, −40 treasury for the funeral; Parthia +100 treasury, +10 legitimacy; Judaea’s tribute lapses (+10 legitimacy).',
        effects: guard('ev_sidetes_falls:1', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'SEL')) {
            h.killGeneral(ctx, 'SEL', 'Antiochus VII Sidetes');
            h.setRuler(ctx, 'SEL', { name: 'Demetrius II Nicator', title: 'Basileus', gov: 2, infl: 2, mar: 2, age: 31 });
            h.setHeir(ctx, 'SEL', null);
            h.adjust(ctx, 'SEL', { stability: -1, legitimacy: -10, treasury: -40 });
            h.addTagModifier(ctx, 'SEL', {
              id: 'kingdom_draws_in', name: 'The Kingdom Draws In', months: -1,
              effects: { reinforceMult: 0.9 },
            });
          }
          if (alive(ctx, 'PAR')) {
            h.adjust(ctx, 'PAR', { treasury: 100, legitimacy: 10 });
            const w = findWar(ctx.game, 'SEL', 'PAR');
            if (w) {
              const key = (w.attackers || []).indexOf('PAR') >= 0 ? 'att' : 'def';
              h.endWar(ctx, 'PAR', 'SEL', key);
            }
          }
          if (alive(ctx, 'HAS')) {
            h.removeModifier(ctx, 'HAS', 'tribute_of_joppa');
            h.adjust(ctx, 'HAS', { legitimacy: 10 });
          }
          h.setFlag(ctx, 'sidetesFallen', true);
          h.notify(ctx, {
            title: 'Antiochus Sidetes Is Dead', type: 'info', provName: 'Ecbatana',
            text: 'The Arsacid returns the king in a coffin of silver — a courtesy, and a receipt.',
          });
        }),
      },
    ],
  },

  // ── 39 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_yehohanan_coinage',
    title: 'Yehohanan the High Priest',
    desc: 'The dispatch from Media has been read aloud on the Temple mount, and Hyrcanus '
      + 'has drawn the conclusion a statesman draws: there is no longer anyone to pay '
      + 'tribute to. The mint strikes small bronze, and the legend is its own '
      + 'declaration — no king’s head, no god’s face, but a wreath and the plain words: '
      + '"Yehohanan the High Priest and the Council of the Jews." Not a king; a priest '
      + 'and a council, on money that no kingdom licenses. The men who weigh coins in '
      + 'Gaza and Damascus understand the legend perfectly.',
    forTag: 'HAS',
    date: { y: -128, m: 2 },
    aiOption: 0,
    options: [
      {
        label: 'Strike our own bronze',
        tooltip: '+10 legitimacy; "The Mint of Yehohanan" (+10% income, permanent).',
        effects: guard('ev_yehohanan_coinage:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HAS')) return;
          h.adjust(ctx, 'HAS', { legitimacy: 10 });
          h.addTagModifier(ctx, 'HAS', {
            id: 'mint_of_yehohanan', name: 'The Mint of Yehohanan', months: -1,
            effects: { incomeMult: 1.1 },
          });
          h.setFlag(ctx, 'hyrcanusCoinage', true);
        }),
      },
      {
        label: 'Rebuild the battlements first',
        tooltip: '−40 treasury, +5 legitimacy; Jerusalem regains +1 fort level — the wall Sidetes threw down stands again.',
        effects: guard('ev_yehohanan_coinage:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HAS')) return;
          h.adjust(ctx, 'HAS', { treasury: -40, legitimacy: 5 });
          const per = (ctx.DEFINES && ctx.DEFINES.BASE && ctx.DEFINES.BASE.fortGarrisonPerLevel) || 1000;
          const p = ctx.prov('Jerusalem');
          if (p && p.controller === 'HAS' && (p.fort || 0) < 3) {
            p.fort = (p.fort || 0) + 1;
            if (typeof p.maxGarrison === 'number') {
              p.maxGarrison += per;
              p.garrison = Math.min((p.garrison || 0) + per, p.maxGarrison);
            }
          }
          h.setFlag(ctx, 'hyrcanusCoinage', true);
        }),
      },
    ],
  },

  // ── 40 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_medaba_campaign',
    title: 'Beyond the Jordan: Medaba',
    desc: 'The first campaign of the freedom is aimed east, at Medaba on the king’s '
      + 'highway beyond the Jordan, where the caravan tolls of half Arabia pass a '
      + 'single gate. The siege will take six months, the engineers say, and sieges '
      + 'cost what wars of movement never do. Hyrcanus has silver — the tomb’s, or the '
      + 'treasury’s — and a thought no ruler of Israel has had before him: silver can '
      + 'carry a spear. The pious will note, in time, that the high priest keeps '
      + 'foreign soldiers. The high priest will note that he keeps them paid.',
    forTag: 'HAS',
    trigger: safeTrigger('ev_medaba_campaign', (ctx) =>
      dateGE(ctx, -128, 8) && alive(ctx, 'HAS') && totalMen(ctx, 'HAS') >= 3000
      && !ctx.helpers.controls(ctx, 'HAS', 'Medaba')),
    aiOption: (ctx) => {
      try { return (ctx.game.tags.HAS.treasury || 0) >= 100 ? 0 : 1; } catch (e) { return 1; }
    },
    options: [
      {
        label: 'Hire mercenaries — the first of Israel’s rulers to do it',
        tooltip: '−60 treasury, −5 legitimacy; an army musters for the Jordan under Hyrcanus if he lacks one; "Hired Spears" (+15% reinforcements, 24 months).',
        effects: guard('ev_medaba_campaign:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { treasury: -60, legitimacy: -5 });
          if (!armyByGeneral(ctx, 'HAS', 'John Hyrcanus')) {
            const at = firstControlled(ctx, 'HAS', ['Jericho', 'Jerusalem', 'Emmaus']);
            if (at) {
              h.spawnArmy(ctx, 'HAS', at, {
                inf: 5, cav: 1, name: 'Army of Hyrcanus',
                general: { name: 'John Hyrcanus', fire: 3, shock: 3, maneuver: 4 },
              });
            }
          }
          h.addTagModifier(ctx, 'HAS', {
            id: 'hired_spears', name: 'Hired Spears', months: 24,
            effects: { reinforceMult: 1.15 },
          });
          try {
            if (ctx.game.tags.HAS && ctx.game.tags.HAS.aiState) {
              ctx.game.tags.HAS.aiState.target = 'Medaba';
            }
          } catch (e) { warnOnce('medaba:aiState', e); }
          h.setFlag(ctx, 'medabaCampaign', true);
        }),
      },
      {
        label: 'The levies of Judah suffice',
        tooltip: '+1,500 manpower as the hill villages muster; an army forms for the Jordan under Hyrcanus if he lacks one; "The Levies of Judah" (+5% morale, 12 months).',
        effects: guard('ev_medaba_campaign:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { manpower: 1500 });
          if (!armyByGeneral(ctx, 'HAS', 'John Hyrcanus')) {
            const at = firstControlled(ctx, 'HAS', ['Jericho', 'Jerusalem', 'Emmaus']);
            if (at) {
              h.spawnArmy(ctx, 'HAS', at, {
                inf: 5, cav: 1, name: 'Army of Hyrcanus',
                general: { name: 'John Hyrcanus', fire: 3, shock: 3, maneuver: 4 },
              });
            }
          }
          h.addTagModifier(ctx, 'HAS', {
            id: 'levies_of_judah', name: 'The Levies of Judah', months: 12,
            effects: { moraleMult: 1.05 },
          });
          try {
            if (ctx.game.tags.HAS && ctx.game.tags.HAS.aiState) {
              ctx.game.tags.HAS.aiState.target = 'Medaba';
            }
          } catch (e) { warnOnce('medaba:aiState2', e); }
          h.setFlag(ctx, 'medabaCampaign', true);
        }),
      },
    ],
  },

  // ── 41 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_gerizim',
    title: 'The Temple on Gerizim',
    desc: 'Shechem is taken, and above it stands the question two centuries old: the '
      + 'temple on Mount Gerizim, built when Sanballat’s people were shut out of the '
      + 'Second Temple, serving the same Law with a different mountain. To the men of '
      + 'the Gophna hills there is one sanctuary, and its name is not Gerizim; to the '
      + 'Samaritans, Gerizim is the mountain Moses meant, and Jerusalem the usurper. '
      + 'Hyrcanus’ engineers wait on the slope with their orders unwritten. Whatever '
      + 'is decided here will be remembered longer than any border drawn this century — '
      + 'a thing both peoples, for once, agree on.',
    forTag: 'HAS',
    major: true,
    trigger: safeTrigger('ev_gerizim', (ctx) =>
      dateGE(ctx, -127, 1) && alive(ctx, 'HAS') && ctx.helpers.controls(ctx, 'HAS', 'Neapolis')),
    aiOption: 0,
    options: [
      {
        label: 'Cast down the temple on Gerizim',
        tooltip: 'One Law, one Temple: +10 legitimacy; Shechem passes to the faith of Jerusalem — and seethes (+2 unrest, 36 months).',
        effects: guard('ev_gerizim:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { legitimacy: 10 });
          const p = ctx.prov('Neapolis');
          if (p) p.religion = 'judaism';
          h.addProvinceModifier(ctx, 'Neapolis', {
            id: 'gerizim_cast_down', name: 'Gerizim Cast Down', months: 36,
            effects: { unrest: 2 },
          });
          h.setFlag(ctx, 'gerizimRazed', true);
          h.notify(ctx, {
            title: 'Gerizim Cast Down', type: 'info', provName: 'Neapolis',
            text: 'The rival sanctuary is razed. The Samaritans will keep the day as a grief for two thousand years.',
          });
        }),
      },
      {
        label: 'Leave the mountain its altar; take the tribute',
        tooltip: 'The schism endures, taxed: +10 governance; Shechem pays double ("Tribute of Gerizim": +15% tax, permanent) and stays quiet (−1 unrest, 36 months).',
        effects: guard('ev_gerizim:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { gov: 10 });
          h.addProvinceModifier(ctx, 'Neapolis', {
            id: 'tribute_of_gerizim', name: 'Tribute of Gerizim', months: -1,
            effects: { taxMult: 1.15 },
          });
          h.addProvinceModifier(ctx, 'Neapolis', {
            id: 'gerizim_spared', name: 'Gerizim Spared', months: 36,
            effects: { unrest: -1 },
          });
          h.setFlag(ctx, 'gerizimSpared', true);
        }),
      },
    ],
  },

  // ── 42 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_idumea_policy',
    title: 'Idumea Kneels',
    desc: 'Adora and Marisa have opened their gates, and with them all Idumea — the old '
      + 'south country of Esau, pressed against Judah since the exile. Hyrcanus has '
      + 'done what no conqueror of the age does: he has offered the conquered not '
      + 'tribute but kinship. Let them be circumcised and live by the laws of the '
      + 'Jews, and they may keep their land and be counted Israel; or let them go. '
      + 'They stayed, nearly all of them — Josephus will write that from that time '
      + 'forth they were none other than Jews. The chroniclers who tell it add a dry '
      + 'note in the margin: out of this same Idumea, in the fullness of time, will '
      + 'come a family with a talent for thrones — and the crown of the house that '
      + 'converted them.',
    forTag: 'HAS',
    major: true,
    trigger: safeTrigger('ev_idumea_policy', (ctx) =>
      dateGE(ctx, -126, 1) && alive(ctx, 'HAS')
      && ctx.helpers.controls(ctx, 'HAS', 'Hebron') && ctx.helpers.controls(ctx, 'HAS', 'Adora')),
    aiOption: 0,
    options: [
      {
        label: 'Under the Law, or out of the land',
        tooltip: 'Idumea becomes Israel: +1,500 manpower, +10 legitimacy; "The Idumean Levies" (+10% manpower, 24 months); Hebron and Adora chafe under the new Law (+1 unrest, 36 months).',
        effects: guard('ev_idumea_policy:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { manpower: 1500, legitimacy: 10 });
          h.addTagModifier(ctx, 'HAS', {
            id: 'idumean_levies', name: 'The Idumean Levies', months: 24,
            effects: { manpowerMult: 1.1 },
          });
          for (const name of ['Hebron', 'Adora']) {
            h.addProvinceModifier(ctx, name, {
              id: 'idumea_under_the_law', name: 'Idumea Under the Law', months: 36,
              effects: { unrest: 1 },
            });
          }
          h.setFlag(ctx, 'idumeaConverted', true);
          h.notify(ctx, {
            title: 'Idumea Kneels', type: 'good', provName: 'Adora',
            text: 'The Idumeans take the covenant and keep their land. Time will show what they make of it.',
          });
        }),
      },
      {
        label: 'Tributaries, not brethren',
        tooltip: 'The south pays and keeps its gods: +10 governance; Hebron and Adora pay double ("Idumean Tribute": +20% tax, permanent) — and send no sons to the muster.',
        effects: guard('ev_idumea_policy:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { gov: 10 });
          for (const name of ['Hebron', 'Adora']) {
            h.addProvinceModifier(ctx, name, {
              id: 'idumean_tribute', name: 'Idumean Tribute', months: -1,
              effects: { taxMult: 1.2 },
            });
          }
          h.setFlag(ctx, 'idumeaTributary', true);
        }),
      },
    ],
  },

  // ── 43 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_pharisee_breach',
    title: 'Let the Crown Suffice Thee',
    desc: 'At the high priest’s own table, at a feast for the sages, Hyrcanus asked the '
      + 'Pharisees to tell him plainly if they saw him depart from the right way — and '
      + 'one Eleazar took him at his word: "Since thou desirest the truth: give up the '
      + 'high priesthood, and let the crown of rule suffice thee." The old slander '
      + 'stood behind the words — that his mother had been a captive in the days of '
      + 'Epiphanes, and the priesthood therefore never lawfully his. The table went '
      + 'silent. Jonathan the Sadducee, at the king’s elbow, murmured that Eleazar '
      + 'spoke the mind of all the schools; the schools swear he spoke for himself '
      + 'alone. On the sentence given to one sharp-tongued sage now turns the whole '
      + 'question of who interprets the Law in Israel — the schools of the people, or '
      + 'the priests and the great houses.',
    forTag: 'HAS',
    date: { y: -114, m: 2 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Go over to the Sadducees',
        tooltip: 'The great houses take the courts: −10 legitimacy; "The Sadducee Court" (+8% income, +1 unrest everywhere, permanent). The Hasideans’ heirs will not forgive it.',
        effects: guard('ev_pharisee_breach:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HAS')) return;
          h.adjust(ctx, 'HAS', { legitimacy: -10 });
          h.addTagModifier(ctx, 'HAS', {
            id: 'sadducee_court', name: 'The Sadducee Court', months: -1,
            effects: { incomeMult: 1.08, unrestAll: 1 },
          });
          h.factionShift(ctx, 'HAS', 'hasideans', -20);
          h.factionShift(ctx, 'HAS', 'hellenizers', 10);
          h.setFlag(ctx, 'sadduceeBreach', true);
        }),
      },
      {
        label: 'One sage’s insolence is not the schools’ sin',
        tooltip: 'Eleazar is punished; the Pharisees keep the courts: +10 legitimacy; "The Schools Stand With Us" (−1 unrest everywhere, −5% income, permanent).',
        effects: guard('ev_pharisee_breach:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HAS')) return;
          h.adjust(ctx, 'HAS', { legitimacy: 10 });
          h.addTagModifier(ctx, 'HAS', {
            id: 'schools_stand_with_us', name: 'The Schools Stand With Us', months: -1,
            effects: { unrestAll: -1, incomeMult: 0.95 },
          });
          h.factionShift(ctx, 'HAS', 'hasideans', 15);
          h.setFlag(ctx, 'phariseesKept', true);
        }),
      },
    ],
  },

  // ── 44 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_samaria_falls',
    title: 'The Year-Long Siege of Samaria',
    desc: 'A full year the sons of Hyrcanus — Antigonus and Aristobulus — have lain '
      + 'about Samaria, walling it in with a double wall of fourscore furlongs, beating '
      + 'off the relief columns that came up from the coast with Egyptian mercenaries. '
      + 'And on the day of the last battle, Hyrcanus, offering incense alone in the '
      + 'Temple, heard a voice out of the sanctuary saying that his sons had that very '
      + 'hour conquered — and it was so, to the hour, as the runners confirmed two days '
      + 'after. The city is taken and the question is what a city is for. Hyrcanus’ '
      + 'answer will be quoted with a shudder for a century: he effaced it, digging '
      + 'trenches and turning the mountain streams through the foundations, until no '
      + 'man could say a city had stood there.',
    forTag: 'HAS',
    major: true,
    trigger: safeTrigger('ev_samaria_falls', (ctx) => {
      if (!alive(ctx, 'HAS')) return false;
      if (!dateGE(ctx, -108, 4)) return false;
      if (ctx.helpers.controls(ctx, 'HAS', 'Sebaste')) return true;
      // Calendar fallback: by 107 the campaign marches if Israel can field it.
      return dateGE(ctx, -107, 6) && totalMen(ctx, 'HAS') >= 5000;
    }),
    aiOption: 0,
    options: [
      {
        label: 'Efface it — turn the streams through the ruin',
        tooltip: '+15 legitimacy, +15 military points; "A Voice in the Sanctuary" (+5% morale, 12 months); Samaria is razed (−40% tax, −2 unrest, permanent). The Greeks of the coast will not forget.',
        effects: guard('ev_samaria_falls:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { legitimacy: 15, mar: 15 });
          h.addTagModifier(ctx, 'HAS', {
            id: 'voice_in_the_sanctuary', name: 'A Voice in the Sanctuary', months: 12,
            effects: { moraleMult: 1.05 },
          });
          if (h.controls(ctx, 'HAS', 'Sebaste')) {
            h.addProvinceModifier(ctx, 'Sebaste', {
              id: 'samaria_razed', name: 'Samaria Razed', months: -1,
              effects: { taxMult: 0.6, unrest: -2 },
            });
          } else if (!armyByGeneral(ctx, 'HAS', 'Aristobulus son of Hyrcanus')) {
            const at = firstControlled(ctx, 'HAS', ['Neapolis', 'Jerusalem', 'Emmaus', 'Lydda']);
            if (at) {
              h.spawnArmy(ctx, 'HAS', at, {
                inf: 5, name: 'The Young Men',
                general: { name: 'Aristobulus son of Hyrcanus', fire: 2, shock: 3, maneuver: 3 },
              });
            }
          }
          h.setFlag(ctx, 'samariaRazed', true);
          h.notify(ctx, {
            title: 'Samaria Falls', type: 'good', provName: 'Sebaste',
            text: 'The young men have conquered — the voice in the sanctuary said so before the runners came.',
          });
        }),
      },
      {
        label: 'Spare the city; garrison the hill',
        tooltip: '+10 legitimacy, +10 governance; "A Voice in the Sanctuary" (+5% morale, 12 months); Samaria is held and taxed (+10% tax, +1 unrest, 36 months).',
        effects: guard('ev_samaria_falls:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { legitimacy: 10, gov: 10 });
          h.addTagModifier(ctx, 'HAS', {
            id: 'voice_in_the_sanctuary', name: 'A Voice in the Sanctuary', months: 12,
            effects: { moraleMult: 1.05 },
          });
          if (h.controls(ctx, 'HAS', 'Sebaste')) {
            h.addProvinceModifier(ctx, 'Sebaste', {
              id: 'samaria_garrisoned', name: 'Samaria Garrisoned', months: 36,
              effects: { taxMult: 1.1, unrest: 1 },
            });
          } else if (!armyByGeneral(ctx, 'HAS', 'Aristobulus son of Hyrcanus')) {
            const at = firstControlled(ctx, 'HAS', ['Neapolis', 'Jerusalem', 'Emmaus', 'Lydda']);
            if (at) {
              h.spawnArmy(ctx, 'HAS', at, {
                inf: 5, name: 'The Young Men',
                general: { name: 'Aristobulus son of Hyrcanus', fire: 2, shock: 3, maneuver: 3 },
              });
            }
          }
          h.setFlag(ctx, 'samariaSpared', true);
          h.notify(ctx, {
            title: 'Samaria Falls', type: 'good', provName: 'Sebaste',
            text: 'The young men have conquered, and the city is spared to pay for its own garrison.',
          });
        }),
      },
    ],
  },

  // ── 45 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_hyrcanus_dies',
    title: 'The Three Privileges',
    desc: 'John Hyrcanus is dead, full of years, in the thirty-first year of his rule — '
      + 'and even the chroniclers who quarrel over his sons do not quarrel over him. He '
      + 'was accounted by God worthy, Josephus writes, of the three greatest '
      + 'privileges: the rule of the nation, the dignity of the high priesthood, and '
      + 'prophecy. He doubled the land, freed it, and died in his bed — a sentence no '
      + 'other man of his century can carry. His testament left the government to his '
      + 'wife; his eldest son Aristobulus has other views. The mother is in prison '
      + 'before the month is out, and the brothers with her, save Antigonus whom he '
      + 'loves — and on the head of Aristobulus sits a thing no son of Israel has worn '
      + 'since the carrying away to Babylon: the diadem, and the name of KING.',
    forTag: 'HAS',
    date: { y: -104, m: 1 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The diadem — the first king since the exile',
        tooltip: 'Aristobulus I (2/2/3) takes crown and priesthood both: −1 stability (the mother and brothers in chains), +10 military points; "The Diadem" (+5% income, permanent). Heir: Alexander Jannaeus.',
        effects: guard('ev_hyrcanus_dies:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HAS')) return;
          h.killGeneral(ctx, 'HAS', 'John Hyrcanus');
          h.setRuler(ctx, 'HAS', { name: 'Aristobulus I', title: 'Basileus and High Priest', gov: 2, infl: 2, mar: 3, age: 40 });
          h.setHeir(ctx, 'HAS', { name: 'Alexander Jannaeus', gov: 2, infl: 2, mar: 4, age: 22 });
          h.adjust(ctx, 'HAS', { stability: -1, mar: 10 });
          h.addTagModifier(ctx, 'HAS', {
            id: 'the_diadem', name: 'The Diadem', months: -1,
            effects: { incomeMult: 1.05 },
          });
          h.setFlag(ctx, 'hyrcanusDead', true);
          h.setFlag(ctx, 'aristobulusKing', true);
          h.notify(ctx, {
            title: 'A King in Israel', type: 'info', provName: 'Jerusalem',
            text: 'Aristobulus takes the diadem — the first since the exile. His mother learns of it in prison.',
          });
        }),
      },
      {
        label: 'High priest, as his fathers were',
        tooltip: 'Aristobulus I (2/2/3) rules without the diadem, and the testament is honored in part: +10 legitimacy, +10 governance, no stability loss. Heir: Alexander Jannaeus.',
        effects: guard('ev_hyrcanus_dies:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HAS')) return;
          h.killGeneral(ctx, 'HAS', 'John Hyrcanus');
          h.setRuler(ctx, 'HAS', { name: 'Aristobulus I', title: 'High Priest', gov: 2, infl: 2, mar: 3, age: 40 });
          h.setHeir(ctx, 'HAS', { name: 'Alexander Jannaeus', gov: 2, infl: 2, mar: 4, age: 22 });
          h.adjust(ctx, 'HAS', { legitimacy: 10, gov: 10 });
          h.setFlag(ctx, 'hyrcanusDead', true);
          h.notify(ctx, {
            title: 'Hyrcanus Is Dead', type: 'info', provName: 'Jerusalem',
            text: 'The high priesthood passes to Aristobulus. The diadem, for now, stays in its box.',
          });
        }),
      },
    ],
  },

  // ── 46 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_galilee_iturea',
    title: 'Galilee and the Itureans',
    desc: 'The new reign opens northward. Aristobulus and his brother Antigonus have '
      + 'taken the war into Galilee and against the Itureans of the high country about '
      + 'Panion — hill tribes half-Hellenized and wholly armed — and a great part of '
      + 'their land is added to Judea. The policy is his father’s in Idumea, applied '
      + 'with less patience: the inhabitants may remain if they will be circumcised '
      + 'and live according to the laws of the Jews. Even the Greek historians pause '
      + 'over him here: Timagenes calls him a kindly man, who did the Jews much '
      + 'service, and gained them a portion of the nation of the Itureans. Galilee, '
      + 'thick with villages and quick to anger, is being stitched to Jerusalem — a '
      + 'seam that will hold through every war to come.',
    forTag: 'HAS',
    trigger: safeTrigger('ev_galilee_iturea', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'hyrcanusDead') && alive(ctx, 'HAS') && dateGE(ctx, -104, 6)),
    aiOption: 0,
    options: [
      {
        label: 'Under the Law, as Idumea came',
        tooltip: 'An army musters for the north under Antigonus (2/3/2); +1,000 manpower; "Brethren of Galilee" (+10% manpower, 24 months); −5 legitimacy among the scrupulous, who mislike conversion at spear-point.',
        effects: guard('ev_galilee_iturea:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { manpower: 1000, legitimacy: -5 });
          if (!armyByGeneral(ctx, 'HAS', 'Antigonus son of Hyrcanus')) {
            const at = firstControlled(ctx, 'HAS', ['Sebaste', 'Neapolis', 'Jerusalem', 'Emmaus']);
            if (at) {
              h.spawnArmy(ctx, 'HAS', at, {
                inf: 5, cav: 1, name: 'Army of Galilee',
                general: { name: 'Antigonus son of Hyrcanus', fire: 2, shock: 3, maneuver: 2 },
              });
            }
          }
          h.addTagModifier(ctx, 'HAS', {
            id: 'brethren_of_galilee', name: 'Brethren of Galilee', months: 24,
            effects: { manpowerMult: 1.1 },
          });
          try {
            if (ctx.game.tags.HAS && ctx.game.tags.HAS.aiState) {
              ctx.game.tags.HAS.aiState.target = 'Sepphoris';
            }
          } catch (e) { warnOnce('galilee:aiState', e); }
          h.setFlag(ctx, 'galileeCampaign', true);
        }),
      },
      {
        label: 'Let the hills keep their gods and pay',
        tooltip: 'An army musters for the north under Antigonus (2/3/2); +10 governance; "Tribute of the North" (+8% income, 24 months) — and no new brethren.',
        effects: guard('ev_galilee_iturea:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HAS', { gov: 10 });
          if (!armyByGeneral(ctx, 'HAS', 'Antigonus son of Hyrcanus')) {
            const at = firstControlled(ctx, 'HAS', ['Sebaste', 'Neapolis', 'Jerusalem', 'Emmaus']);
            if (at) {
              h.spawnArmy(ctx, 'HAS', at, {
                inf: 5, cav: 1, name: 'Army of Galilee',
                general: { name: 'Antigonus son of Hyrcanus', fire: 2, shock: 3, maneuver: 2 },
              });
            }
          }
          h.addTagModifier(ctx, 'HAS', {
            id: 'tribute_of_the_north', name: 'Tribute of the North', months: 24,
            effects: { incomeMult: 1.08 },
          });
          try {
            if (ctx.game.tags.HAS && ctx.game.tags.HAS.aiState) {
              ctx.game.tags.HAS.aiState.target = 'Sepphoris';
            }
          } catch (e) { warnOnce('galilee:aiState2', e); }
          h.setFlag(ctx, 'galileeCampaign', true);
        }),
      },
    ],
  },

  // ── 47 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_aristobulus_dies',
    title: 'The Queen Opens the Prisons',
    desc: 'The reign lasted one year, and ended the way reigns built on imprisoned '
      + 'brothers end. The courtiers persuaded the sick king that Antigonus — the one '
      + 'brother he loved, home from Galilee in his armor — was coming for the crown; '
      + 'the guards in the dark passage under the tower did the rest. When the king '
      + 'learned what his suspicion had bought, the disease took him quickly; the '
      + 'chroniclers say he vomited blood, and the servant carrying the basin stumbled '
      + 'on the very spot where Antigonus bled. His widow Salome Alexandra wasted no '
      + 'hour on grief: she opened the prisons, brought out the brothers, and set the '
      + 'diadem on the eldest, Alexander called Jannaeus — a soldier of twenty-three '
      + 'whom his father could never abide. The house of Mattathias now has kings, '
      + 'and the habits of kings; whether it keeps the other inheritance is a '
      + 'question for the new century.',
    forTag: 'HAS',
    date: { y: -103, m: 11 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Salome opens the prisons',
        tooltip: 'Alexander Jannaeus (2/2/4) is crowned: +10 legitimacy, +1 stability — the succession is settled in a day.',
        effects: guard('ev_aristobulus_dies:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HAS') || !h.getFlag(ctx, 'hyrcanusDead')) return;
          h.killGeneral(ctx, 'HAS', 'Antigonus son of Hyrcanus');
          h.killGeneral(ctx, 'HAS', 'Aristobulus son of Hyrcanus');
          h.setRuler(ctx, 'HAS', { name: 'Alexander Jannaeus', title: 'Basileus and High Priest', gov: 2, infl: 2, mar: 4, age: 23 });
          h.setHeir(ctx, 'HAS', null);
          h.adjust(ctx, 'HAS', { legitimacy: 10, stability: 1 });
          h.setFlag(ctx, 'jannaeusKing', true);
          h.notify(ctx, {
            title: 'Alexander Jannaeus', type: 'info', provName: 'Jerusalem',
            text: 'The widow frees the brothers and crowns the eldest. A soldier-king takes the house into the new century.',
          });
        }),
      },
      {
        label: 'A donative to steady the city first',
        tooltip: 'Alexander Jannaeus (2/2/4) is crowned with silver in the streets: −20 treasury, +5 legitimacy; "The City Steadied" (−1 unrest everywhere, 12 months).',
        effects: guard('ev_aristobulus_dies:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'HAS') || !h.getFlag(ctx, 'hyrcanusDead')) return;
          h.killGeneral(ctx, 'HAS', 'Antigonus son of Hyrcanus');
          h.killGeneral(ctx, 'HAS', 'Aristobulus son of Hyrcanus');
          h.setRuler(ctx, 'HAS', { name: 'Alexander Jannaeus', title: 'Basileus and High Priest', gov: 2, infl: 2, mar: 4, age: 23 });
          h.setHeir(ctx, 'HAS', null);
          h.adjust(ctx, 'HAS', { treasury: -20, legitimacy: 5 });
          h.addTagModifier(ctx, 'HAS', {
            id: 'city_steadied', name: 'The City Steadied', months: 12,
            effects: { unrestAll: -1 },
          });
          h.setFlag(ctx, 'jannaeusKing', true);
          h.notify(ctx, {
            title: 'Alexander Jannaeus', type: 'info', provName: 'Jerusalem',
            text: 'The widow frees the brothers, crowns the eldest, and pays the city to cheer.',
          });
        }),
      },
    ],
  },
];
