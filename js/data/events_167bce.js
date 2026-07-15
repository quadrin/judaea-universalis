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
    ],
  },

  // ── 5 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_apollonius',
    title: 'Apollonius Marches',
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
    ],
  },

  // ── 7 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_beth_horon_ascent',
    title: 'The Ascent of Beth-Horon',
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
    ],
  },

  // ── 7b ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_anabasis',
    title: 'The King Marches East',
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
    ],
  },

  // ── 8 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_emmaus_night_march',
    title: 'The Night March to Emmaus',
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
    ],
  },

  // ── 9 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_beth_zur',
    title: 'Beth-Zur',
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
    ],
  },

  {
    id: 'ev_beth_zechariah',
    title: 'Beth-Zechariah',
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
    ],
  },

  // ── 17 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_bacchides',
    title: 'Bacchides Builds in Stone',
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
];
