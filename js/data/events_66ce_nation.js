// Judaea Universalis — the nation larger than the state, 75–130 CE.
// Content package. Zero imports; concatenated onto EVENTS_66 by the registry.
//
// The 66 chapter's success road is `secondKingdom`: the House stands, the
// Revolt won, a Jewish state governs where Josephus recorded ash. The chapter
// then asks what KIND of state (altar, chamber, or useful kingdom) and carries
// it to 130. What it never asks is the question that a surviving Temple makes
// unavoidable and that no other chapter can ask at all.
//
// There were somewhere between four and six million Jews in the first-century
// world and perhaps a fifth of them lived in Judaea. Alexandria alone rivalled
// Jerusalem. Babylonia was larger than both. Every adult male among them sent
// a half-shekel to the Temple every year, and Rome understood exactly what
// that was — which is why, when the Temple burned, Vespasian did not abolish
// the tax but REDIRECTED it to Jupiter Capitolinus. The fiscus Judaicus is the
// Roman state conceding that the Temple levy was a fiscal instrument worth
// capturing.
//
// So a Judaea whose Temple still stands in 75 CE holds something no ancient
// state held: a revenue stream, a census, and a claim of allegiance running
// through every major city of an empire it does not govern. The Kitos War of
// 115–117 is what happened when that nation moved without the state. This
// package is the state discovering what it is attached to.
//
// TRIGGERS. Nothing here is dated except the terminal. Each card names a BAND
// of years and then waits for a state and a ruler that fit it — `gov`, `infl`
// and `mar` run 0–6 on every ruler object in the game and were, before this
// package, read by nothing.
//
// Source spine: Josephus, BJ II.398, VII.218; Philo, Legatio; Dio LXVIII.32.

const _warned = new Set();
function warnOnce(k, e) { if (_warned.has(k)) return; _warned.add(k); console.warn('[events_66ce_nation] ' + k, e || ''); }
function guard(k, fn) { return function (ctx) { try { fn(ctx); } catch (e) { warnOnce('effects:' + k, e); } }; }
function safeTrigger(k, fn) { return function (ctx) { try { return !!fn(ctx); } catch (e) { warnOnce('trigger:' + k, e); return false; } }; }

function alive(ctx, tag) { const t = ctx.game.tags && ctx.game.tags[tag]; return !!(t && t.alive !== false); }
function flag(ctx, k) { return !!(ctx.game.flags && ctx.game.flags[k]); }
function holds(ctx, tag, name) {
  try { const p = ctx.prov(name); return !!p && !p.impassable && p.owner === tag && p.controller === tag; }
  catch (e) { warnOnce('holds', e); return false; }
}

// The ruler, and the three numbers nothing has ever asked about.
function ruler(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  return (t && t.ruler) || null;
}
function rulerAt(ctx, tag, key, min) {
  const r = ruler(ctx, tag);
  return !!r && Number(r[key] || 0) >= min;
}

// Sovereign with the House standing. The 66 chapter's own success condition,
// restated locally so this package imports nothing.
function standing(ctx) {
  if (!alive(ctx, 'JUD')) return false;
  const t = ctx.game.tags.JUD;
  return !(t && t.overlord) && holds(ctx, 'JUD', 'Jerusalem') && flag(ctx, 'secondKingdom');
}

// 0 a surviving state, 1 a consolidated one, 2 a regional power.
function reach(ctx) {
  if (!standing(ctx)) return 0;
  const n = ctx.helpers.countControlled(ctx, 'JUD', {});
  if (n >= 16) return 2;
  if (n >= 11) return 1;
  return 0;
}

export const EVENTS_66_NATION = [

  {
    id: 'ev_n_half_shekel_of_the_world',
    title: 'The Half-Shekel of the World',
    desc: 'The treasury has finished counting a normal year and brought the number up '
      + 'because it is not a normal number. Rather more of the Temple\'s income arrived '
      + 'from outside the kingdom than from inside it, and the largest single '
      + 'consignment came from Babylonia, which is in another empire. The couriers who '
      + 'brought it travelled under armed escort with the consent of a Parthian king who '
      + 'was pleased to grant it. Nobody legislated this. Every adult man who counts '
      + 'himself of Israel sends half a shekel a year to a building he will probably '
      + 'never see, and has done so through a war that levelled the country, and the '
      + 'arithmetic of that habit has quietly made the Temple the wealthiest institution '
      + 'between the Tiber and the Tigris. The question in front of the council is not '
      + 'whether to take the money. It is what taking it says about who these people are.',
    forTag: 'JUD',
    major: true,
    minYear: 75,
    maxYear: 105,
    trigger: safeTrigger('ev_n_half_shekel_of_the_world', (ctx) => reach(ctx) >= 1 && !flag(ctx, 'shekelAnswered')),
    aiOption: 0,
    historical: 'Vespasian did not abolish the levy after 70; he redirected it to the temple of Jupiter Capitolinus as the fiscus Judaicus, and collected it from Jews across the empire for the next two centuries.',
    options: [
      {
        label: 'It is the Temple\'s, and the Temple is ours',
        tooltip: '+20% income and +2 stability (180 months); the treasury of a small kingdom is now funded by a nation. Rome reads a foreign power taxing its own subjects and does not care for it: −40 Roman opinion, +1 alignment eastward.',
        effects: guard('ev_n_half_shekel:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'JUD', { id: 'the_shekel_of_the_nations', name: 'The Half-Shekel of the World', months: 180, effects: { incomeMult: 1.20 } });
          h.adjust(ctx, 'JUD', { stability: 2 });
          h.factionShift(ctx, 'JUD', 'priesthood', 20);
          h.doctrine(ctx, 'alignment', 1);
          if (alive(ctx, 'ROM')) { const t = ctx.game.tags.ROM; if (t) { t.opinion = t.opinion || {}; t.opinion.JUD = Math.max(-200, (t.opinion.JUD || 0) - 40); } }
          h.setFlag(ctx, 'shekelAnswered', true);
          h.setFlag(ctx, 'shekelClaimed', true);
          h.chronicle(ctx, 'era', 'The Temple treasury opens its books and finds it is funded by men who live in two empires and are subjects of neither of its councils.');
        }),
      },
      {
        label: 'Take only what Judaea sends. Let the rest be freewill offering',
        tooltip: 'The claim is renounced before Rome has to contest it: no income bonus, but no foreign power is being taxed. +8 legitimacy, +25 Roman opinion, +1 stability, −1 alignment. The diaspora sends it anyway, and knows the crown declined to demand it.',
        effects: guard('ev_n_half_shekel:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 8, stability: 1 });
          h.factionShift(ctx, 'JUD', 'notables', 20);
          h.doctrine(ctx, 'alignment', -1);
          if (alive(ctx, 'ROM')) { const t = ctx.game.tags.ROM; if (t) { t.opinion = t.opinion || {}; t.opinion.JUD = Math.min(200, (t.opinion.JUD || 0) + 25); } }
          h.setFlag(ctx, 'shekelAnswered', true);
          h.setFlag(ctx, 'shekelRenounced', true);
          h.chronicle(ctx, 'ruler', 'The crown declines to levy on men who are not its subjects. The money arrives regardless, which is the part nobody can legislate.');
        }),
      },
    ],
  },

  {
    id: 'ev_n_the_greater_nation',
    title: 'More of Us Are Elsewhere',
    desc: 'The census the treasury ordered has come back and it says something the '
      + 'council already knew and had not written down. Four men in five who call '
      + 'themselves of Israel are not here. They are in Alexandria, which has a Jewish '
      + 'quarter larger than Jerusalem; in Antioch, in Cyrene, in Rome itself, and above '
      + 'all in Babylonia, where they have been for six hundred years and where their '
      + 'academies are beginning to answer questions without asking this city first. '
      + 'A state governs the people inside its borders. This one has been receiving '
      + 'money, pilgrims, lawsuits and appeals from people outside them for two '
      + 'generations, and answering. The clerks have started referring to those people '
      + 'as subjects in internal correspondence. Nobody has decided that they are.',
    forTag: 'JUD',
    major: true,
    minYear: 85,
    maxYear: 118,
    trigger: safeTrigger('ev_n_the_greater_nation', (ctx) => {
      if (reach(ctx) < 1 || flag(ctx, 'nationAnswered')) return false;
      // A ruler with the standing to make a claim like this, or one old enough
      // that the council will make it for him.
      return rulerAt(ctx, 'JUD', 'infl', 4) || rulerAt(ctx, 'JUD', 'age', 58);
    }),
    aiOption: 1,
    historical: 'The diaspora rose without Judaea in 115–117 — Cyrene, Egypt, Cyprus and Mesopotamia at once, while Trajan was on the Tigris. It was crushed, and Judaea, which had no state to commit, did not move.',
    options: [
      {
        label: 'A nation. Let the crown speak for Jews wherever they are',
        tooltip: '+15 legitimacy, +2 influence a month, +2 authority; the diaspora looks to Jerusalem and says so. Every Jewish community abroad is now a standing grievance between this kingdom and whoever governs them: −50 Roman opinion, and any diaspora rising will implicate the crown whether or not it moved.',
        effects: guard('ev_n_greater_nation:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 15 });
          h.addTagModifier(ctx, 'JUD', { id: 'speaker_for_the_nation', name: 'Speaker for the Nation', months: 240, effects: { incomeMult: 1.06, legitimacyAdd: 0.15 } });
          h.factionShift(ctx, 'JUD', 'zealots', 20);
          h.doctrine(ctx, 'authority', 2);
          if (alive(ctx, 'ROM')) { const t = ctx.game.tags.ROM; if (t) { t.opinion = t.opinion || {}; t.opinion.JUD = Math.max(-200, (t.opinion.JUD || 0) - 50); } }
          h.setFlag(ctx, 'nationAnswered', true);
          h.setFlag(ctx, 'speakerForTheNation', true);
          h.chronicle(ctx, 'era', 'Jerusalem claims to speak for Jews who are subjects of other kings. No ancient state has made this claim before and there is no law that covers it.');
        }),
      },
      {
        label: 'A state. We govern Judaea and pray for the rest',
        tooltip: 'The narrower and safer answer: sovereignty stops at the frontier. +3 stability, +30 Roman opinion, +1 zeal — and the academies of Babylonia, asked nothing and owed nothing, begin deciding matters for themselves. A second centre of authority forms outside the kingdom (permanent, and it does not answer to you).',
        effects: guard('ev_n_greater_nation:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 3 });
          h.factionShift(ctx, 'JUD', 'notables', 15);
          h.doctrine(ctx, 'zeal', 1);
          h.doctrine(ctx, 'authority', -1);
          if (alive(ctx, 'ROM')) { const t = ctx.game.tags.ROM; if (t) { t.opinion = t.opinion || {}; t.opinion.JUD = Math.min(200, (t.opinion.JUD || 0) + 30); } }
          h.setFlag(ctx, 'nationAnswered', true);
          h.setFlag(ctx, 'stateNotNation', true);
          h.chronicle(ctx, 'ruler', 'The crown answers that it governs a country, not a people. Babylonia takes the point and stops writing to ask.');
        }),
      },
    ],
  },

  {
    id: 'ev_n_the_east_is_burning',
    title: 'The Nation Moves Without the State',
    desc: 'Trajan is on the Tigris and behind him the whole east has gone up at once — '
      + 'Cyrene first, then Egypt, then Cyprus, then Mesopotamia in his rear, all of it '
      + 'Jewish, none of it ordered from here. The letters that reach the palace are not '
      + 'asking permission. They are asking whether the kingdom is coming, and they were '
      + 'written by men who assumed the answer was obvious. It is not obvious. The '
      + 'kingdom has an army, a frontier and a treaty, and every one of those things '
      + 'argues for staying where it is. What argues the other way is that a hundred '
      + 'thousand people have already moved on the assumption that a Jewish state '
      + 'existing at all meant something, and if it does not mean this, the council will '
      + 'have to explain what it does mean.',
    forTag: 'JUD',
    major: true,
    minYear: 115,
    maxYear: 118,
    trigger: safeTrigger('ev_n_the_east_is_burning', (ctx) => standing(ctx) && !flag(ctx, 'risingAnswered')),
    aiOption: 1,
    historical: 'The Kitos War. Cyrene, Egypt, Cyprus and Mesopotamia rose in 115 and were destroyed piecemeal over two years. There was no Jewish state to come.',
    options: [
      {
        label: 'March. This is what a Jewish state is for',
        tooltip: 'A martial answer, and one that needs a soldier on the throne. War with Rome, +3 war exhaustion, and the diaspora rises with a state behind it for the first time: +30% manpower and +10% morale for 48 months, +3 conquest, +2 zeal, Zealots +40.',
        effects: guard('ev_n_east_burning:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'JUD', { id: 'the_nation_in_arms', name: 'The Nation in Arms', months: 48, effects: { manpowerMult: 1.30, moraleMult: 1.10 } });
          h.adjust(ctx, 'JUD', { warExhaustion: 3 });
          h.factionShift(ctx, 'JUD', 'zealots', 40);
          h.factionShift(ctx, 'JUD', 'notables', -30);
          h.doctrine(ctx, 'conquest', 3);
          h.doctrine(ctx, 'zeal', 2);
          if (alive(ctx, 'ROM')) h.declareWar(ctx, 'JUD', 'ROM', 'The War of the Nations');
          h.setFlag(ctx, 'risingAnswered', true);
          h.setFlag(ctx, 'marchedForTheDiaspora', true);
          h.chronicle(ctx, 'era', 'The kingdom marches for communities it does not govern. Whatever happens next, the question of what a Jewish state was for has been answered in the only way that counts.');
        }),
      },
      {
        label: 'Hold the frontier. We cannot save them by dying with them',
        tooltip: 'The kingdom survives and the diaspora is destroyed without it. +2 stability, +40 Roman opinion, treaty intact — and a permanent mark on the crown that no legitimacy bonus will remove: −12 legitimacy, Zealots −40, and Alexandria and Cyrene are gone.',
        effects: guard('ev_n_east_burning:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 2, legitimacy: -12 });
          h.factionShift(ctx, 'JUD', 'zealots', -40);
          h.factionShift(ctx, 'JUD', 'notables', 30);
          h.doctrine(ctx, 'zeal', -2);
          if (alive(ctx, 'ROM')) { const t = ctx.game.tags.ROM; if (t) { t.opinion = t.opinion || {}; t.opinion.JUD = Math.min(200, (t.opinion.JUD || 0) + 40); } }
          h.setFlag(ctx, 'risingAnswered', true);
          h.setFlag(ctx, 'heldTheFrontier', true);
          h.chronicle(ctx, 'era', 'The kingdom holds its frontier and the communities of Egypt and Cyrene are destroyed. The letters stop arriving, which is its own kind of answer.');
        }),
      },
    ],
  },

  {
    id: 'ev_n_what_the_house_was_for',
    title: 'The House That Stood',
    desc: 'In the other history there is a city on this site with a different name, and '
      + 'a temple to Jupiter where the sanctuary was, and no Jewish state anywhere for '
      + 'eighteen centuries. There is no way for anyone here to know that. What they '
      + 'know is that the House has stood for sixty years past the year it was supposed '
      + 'to burn, that the men who saved it are dead, and that the country has spent '
      + 'those sixty years arguing about what saving it obliged them to do next.',
    forTag: 'JUD',
    world: true,
    major: true,
    date: { y: 130, m: 1 },
    when: (ctx) => standing(ctx),
    aiOption: 0,
    options: [
      {
        label: 'Let the chronicle close the account',
        tooltip: 'The record stands: a Temple that did not burn, and a state that had to decide what it owed the people it did not govern.',
        effects: guard('ev_n_what_the_house_was_for:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 10, stability: 1 });
          h.chronicle(ctx, 'era', flag(ctx, 'speakerForTheNation')
            ? 'Sixty years on, the House stands and Jerusalem answers for Jews in two empires. The claim has never been tested in a court because there is no court that could hear it.'
            : 'Sixty years on, the House stands and the kingdom governs a country. The academies of Babylonia have long since stopped writing to ask what the ruling is.');
          h.setFlag(ctx, 'houseEndured', true);
        }),
      },
    ],
  },

];
