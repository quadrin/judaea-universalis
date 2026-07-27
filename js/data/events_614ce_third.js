// Judaea Universalis — the third power, 620–692 CE. Content package.
// Zero imports; concatenated onto EVENTS_614 by the registry.
//
// The 614 chapter's success roads are `charterDavidic` and `kingdomApart`: a
// Jewish authority in Jerusalem that outlives the Persian occupation. The
// chapter then carries the Rashidun century to the Dome of the Rock in 691.
// What it lacks is the rung where surviving becomes a policy rather than an
// outcome — because for this state, unlike the others in this game, survival is
// not a matter of strength. It cannot beat either neighbour and both of them
// know it. Everything depends on being worth more intact than absorbed.
//
// That is a genuinely different problem from the one the 167 and 132 chapters
// pose, and it wants different cards. There is no imperial rung here and no
// three-hundred-year rung. There is a small state on the only land route
// between two empires, holding the one site both of them have theological
// reasons to want, trying to convert a geographic accident into a reason to be
// left alone.
//
// The Mount is the sharpest of these. The community that took Jerusalem in 614
// appears to have attempted to restore sacrifice, and the attempt is the whole
// problem in miniature: it is the thing this state exists for, and it is the
// single act most likely to make both neighbours decide the state cannot be
// left standing.
//
// TRIGGERS. Bands plus conditions. `infl` gates the diplomacy card, because a
// buffer state's survival is an argument somebody has to be able to make.
//
// Source spine: Sebeos; the Doctrina Jacobi; al-Tabari on the conquest of Syria.

const _warned = new Set();
function warnOnce(k, e) { if (_warned.has(k)) return; _warned.add(k); console.warn('[events_614ce_third] ' + k, e || ''); }
function guard(k, fn) { return function (ctx) { try { fn(ctx); } catch (e) { warnOnce('effects:' + k, e); } }; }
function safeTrigger(k, fn) { return function (ctx) { try { return !!fn(ctx); } catch (e) { warnOnce('trigger:' + k, e); return false; } }; }

function alive(ctx, tag) { const t = ctx.game.tags && ctx.game.tags[tag]; return !!(t && t.alive !== false); }
function flag(ctx, k) { return !!(ctx.game.flags && ctx.game.flags[k]); }
function holds(ctx, tag, name) {
  try { const p = ctx.prov(name); return !!p && !p.impassable && p.owner === tag && p.controller === tag; }
  catch (e) { warnOnce('holds', e); return false; }
}
function rulerAt(ctx, tag, key, min) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  const r = t && t.ruler;
  return !!r && Number(r[key] || 0) >= min;
}

function thirdPower(ctx) {
  if (!alive(ctx, 'JUD')) return false;
  const t = ctx.game.tags.JUD;
  if (t && t.overlord) return false;
  if (!holds(ctx, 'JUD', 'Jerusalem')) return false;
  return flag(ctx, 'charterDavidic') || flag(ctx, 'kingdomApart');
}

function standing(ctx) {
  if (!thirdPower(ctx)) return 0;
  const n = ctx.helpers.countControlled(ctx, 'JUD', {});
  if (n >= 10) return 2;
  if (n >= 6) return 1;
  return 0;
}

export const EVENTS_614_THIRD = [

  {
    id: 'ev_t_the_altar_rebuilt',
    title: 'The Altar on the Mount',
    desc: 'The platform has been cleared and the priests have produced, from somewhere, '
      + 'the genealogies. It is the oldest ambition anyone in this room has and it has '
      + 'been an ambition for five hundred and fifty years, and it is now four months of '
      + 'masonry away. The argument against is not theological. It is that both empires '
      + 'have watched this city change hands three times in a generation and have so far '
      + 'treated the change as an administrative fact, and that an altar with smoke coming '
      + 'off it is not an administrative fact. It is a claim, in public, permanently, that '
      + 'this place belongs to a specific god and a specific people — made on the one site '
      + 'about which the Church has an official position and the new power out of the '
      + 'Hijaz is developing one.',
    forTag: 'JUD',
    major: true,
    minYear: 620,
    maxYear: 670,
    trigger: safeTrigger('ev_t_the_altar_rebuilt', (ctx) => standing(ctx) >= 1 && !flag(ctx, 'mountAnswered')),
    aiOption: 1,
    historical: 'The Jewish administration of Jerusalem in 614–617 appears to have begun exactly this, and the Persians reversed their patronage within three years.',
    options: [
      {
        label: 'Build it. This is what the return was for',
        tooltip: '+25 legitimacy, +3 stability, Priests of the Mount +40, +3 zeal, and every Jewish community from Spain to Khorasan hears of it within the year (+15% income from the offerings). Both neighbours now have a standing reason to want this city: −50 Byzantine and −50 Rashidun opinion, +2 unrest everywhere.',
        effects: guard('ev_t_altar:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 25, stability: 3 });
          h.addTagModifier(ctx, 'JUD', { id: 'the_altar_restored', name: 'The Altar Restored', months: 240, effects: { incomeMult: 1.15, unrestAll: 2, legitimacyAdd: 0.3 } });
          h.factionShift(ctx, 'JUD', 'priests', 40);
          h.doctrine(ctx, 'zeal', 3);
          for (const tag of ['BYZ', 'RSH']) if (alive(ctx, tag)) { const t = ctx.game.tags[tag]; if (t) { t.opinion = t.opinion || {}; t.opinion.JUD = Math.max(-200, (t.opinion.JUD || 0) - 50); } }
          h.setFlag(ctx, 'mountAnswered', true);
          h.setFlag(ctx, 'altarRestored', true);
          h.chronicle(ctx, 'era', 'Sacrifice resumes on the Mount for the first time since Titus. Two empires are informed by their own couriers before the crown gets round to telling them.');
        }),
      },
      {
        label: 'Not yet. A cleared platform offends nobody',
        tooltip: 'The Mount is held, swept and kept — and left empty. +2 stability, +25 Byzantine and +25 Rashidun opinion, +1 alignment, and the state stays a fact rather than a claim. Priests −30, −10 legitimacy, and the generation that took the city dies without seeing it.',
        effects: guard('ev_t_altar:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 2, legitimacy: -10 });
          h.factionShift(ctx, 'JUD', 'priests', -30);
          h.factionShift(ctx, 'JUD', 'exilarch', 15);
          h.doctrine(ctx, 'zeal', -2);
          for (const tag of ['BYZ', 'RSH']) if (alive(ctx, tag)) { const t = ctx.game.tags[tag]; if (t) { t.opinion = t.opinion || {}; t.opinion.JUD = Math.min(200, (t.opinion.JUD || 0) + 25); } }
          h.setFlag(ctx, 'mountAnswered', true);
          h.setFlag(ctx, 'mountKeptEmpty', true);
          h.chronicle(ctx, 'ruler', 'The Mount is cleared, swept, and left as it is. The priests are told the word is not never; it is not yet, which they have heard before.');
        }),
      },
    ],
  },

  {
    id: 'ev_t_worth_more_standing',
    title: 'Worth More Standing',
    desc: 'The envoy has come back from the caliph\'s camp with an assessment nobody '
      + 'wanted written down, so he has delivered it aloud. This state cannot defeat '
      + 'either neighbour and cannot be defended against either if it is seriously tried. '
      + 'What it has is a position: the road from Egypt to Syria runs through it, the '
      + 'grain and the pilgrim traffic and the couriers run through it, and both powers '
      + 'currently find it cheaper to have that road administered by somebody who is not '
      + 'the other one. That is the whole basis of the kingdom\'s existence. It is not a '
      + 'shameful basis — half the states that have ever lasted lasted on it — but it is a '
      + 'basis that has to be maintained deliberately, and maintaining it means being '
      + 'genuinely useful to two powers who are at war with each other.',
    forTag: 'JUD',
    major: true,
    minYear: 636,
    maxYear: 685,
    trigger: safeTrigger('ev_t_worth_more_standing', (ctx) => {
      if (standing(ctx) < 1 || flag(ctx, 'buffAnswered')) return false;
      // Somebody has to be able to make the argument.
      return rulerAt(ctx, 'JUD', 'infl', 4) || rulerAt(ctx, 'JUD', 'gov', 5);
    }),
    aiOption: 0,
    options: [
      {
        label: 'Be the road. Serve both, favour neither, charge everyone',
        tooltip: 'The buffer state made deliberate: +25% income and +2 stability (240 months), +30 opinion with both neighbours, +2 authority. The kingdom is now structurally dependent on the war continuing — if either power wins outright, the reason to leave it alone goes with them.',
        effects: guard('ev_t_worth:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'JUD', { id: 'be_the_road', name: 'Be the Road', months: 240, effects: { incomeMult: 1.25, taxMult: 1.10 } });
          h.adjust(ctx, 'JUD', { stability: 2 });
          h.doctrine(ctx, 'authority', 2);
          h.doctrine(ctx, 'conquest', -2);
          for (const tag of ['BYZ', 'RSH']) if (alive(ctx, tag)) { const t = ctx.game.tags[tag]; if (t) { t.opinion = t.opinion || {}; t.opinion.JUD = Math.min(200, (t.opinion.JUD || 0) + 30); } }
          h.setFlag(ctx, 'buffAnswered', true);
          h.setFlag(ctx, 'beTheRoad', true);
          h.chronicle(ctx, 'era', 'The kingdom formalises what it had been doing by accident: it sells passage, escort and silence to both sides, and is scrupulous about the silence.');
        }),
      },
      {
        label: 'Pick the winner early and be indispensable to one',
        tooltip: 'A client\'s bargain taken before anyone has to impose it: +60 opinion with the stronger neighbour, +15% manpower from their subsidy, +2 stability — and −80 with the other, permanently. If the wrong horse is backed there is no second bargain to make.',
        effects: guard('ev_t_worth:1', (ctx) => {
          const h = ctx.helpers;
          const rsh = alive(ctx, 'RSH');
          const patron = rsh ? 'RSH' : 'BYZ';
          const other = rsh ? 'BYZ' : 'RSH';
          h.addTagModifier(ctx, 'JUD', { id: 'the_patron', name: 'The Patron\'s Subsidy', months: 240, effects: { manpowerMult: 1.15, incomeMult: 1.08 } });
          h.adjust(ctx, 'JUD', { stability: 2 });
          h.doctrine(ctx, 'alignment', rsh ? -2 : 2);
          if (alive(ctx, patron)) { const t = ctx.game.tags[patron]; if (t) { t.opinion = t.opinion || {}; t.opinion.JUD = Math.min(200, (t.opinion.JUD || 0) + 60); } }
          if (alive(ctx, other)) { const t = ctx.game.tags[other]; if (t) { t.opinion = t.opinion || {}; t.opinion.JUD = Math.max(-200, (t.opinion.JUD || 0) - 80); } }
          h.setFlag(ctx, 'buffAnswered', true);
          h.setFlag(ctx, 'pickedThePatron', true);
          h.chronicle(ctx, 'era', 'The kingdom stops pretending to be neutral and takes a patron. The other power files the fact and keeps it.');
        }),
      },
    ],
  },

  {
    id: 'ev_t_what_was_built_instead',
    title: 'What Was Built on the Mount',
    desc: 'In the other history an octagon goes up on the platform this year with an '
      + 'inscription running round the inside of it, in the new script, addressing the '
      + 'People of the Book directly and telling them where they have gone wrong. It is '
      + 'the oldest surviving building of its faith and it is built on the site of this '
      + 'city\'s destroyed sanctuary, by a state that arrived sixty years ago, and it is '
      + 'still standing thirteen hundred years later. The question this chapter has been '
      + 'asking since 614 is what is on that platform in the year 692, and the answer is '
      + 'about to be entered in the record.',
    forTag: 'JUD',
    world: true,
    major: true,
    date: { y: 692, m: 1 },
    when: (ctx) => thirdPower(ctx),
    aiOption: 0,
    options: [
      {
        label: 'Let the chronicle enter what stands there',
        tooltip: 'The record closes on a small state that outlasted the Persian war, the Roman reconquest and the Arab conquest, and still holds the Mount.',
        effects: guard('ev_t_what_built:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 15, stability: 2 });
          h.chronicle(ctx, 'era', flag(ctx, 'altarRestored')
            ? 'In the year the Dome was raised in another history, there is an altar on the Mount and smoke going up from it, and a kingdom that has spent seventy years being too useful to remove.'
            : 'In the year the Dome was raised in another history, the platform is swept and empty, and the kingdom that keeps it that way has outlived three empires\' plans for it.');
          h.setFlag(ctx, 'thirdPowerEndured', true);
        }),
      },
    ],
  },

];
