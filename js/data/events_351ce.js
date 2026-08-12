// Judaea Universalis — event chain: The Rising Against Gallus, 351 CE (SPEC §235).
// Content package. Zero imports; every effect runs through ctx.helpers, every
// effects() body is guarded so nothing can throw in the tick loop.
//
// This is the chapter's own chain: the six weeks in which a town decides what
// it has done, the counter-stroke that historically ended it, and the seventy
// years afterwards in which the thing the rising was fought inside — a
// province becoming Christian, and a Jewish office negotiating with the
// emperor who is making it so — finishes either way.
//
// The register is not 132's. Bar Kokhba's chapter opens with a prepared state
// and a plan; this one opens with a robbery. Everything the rising has on the
// first morning is a chest of somebody else's weapons, and every card in the
// first year is about what a robbery can be turned into before the owner
// notices. The forks are correspondingly small and correspondingly permanent:
// what the man is called, whether the Patriarch answers, who keeps the
// calendar, and what happens to a state that is offered the Temple by an
// emperor with two years to live.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_351ce] ' + key, e || '');
}

// The letters this court answers to NOW (SPEC §135).
function who(ctx, tag) {
  return (ctx && ctx.helpers && ctx.helpers.livingTag) ? ctx.helpers.livingTag(ctx, tag) : tag;
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
  const t = ctx.game.tags && ctx.game.tags[who(ctx, tag)];
  return !!(t && t.alive !== false);
}

function flag(ctx, k) { return !!(ctx.game.flags && ctx.game.flags[k]); }

function controls(ctx, tag, name) {
  try { return !!ctx.helpers.controls(ctx, tag, name); } catch (e) { warnOnce('controls', e); return false; }
}

// The rising has survived somewhere — a low bar deliberately, and the one
// most of this chapter's later cards are written against: a state that took
// to the hills in 352 and still has men in them is still playing.
function risingSurvives(ctx) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, 'JUD')];
  if (!alive(ctx, 'JUD')) return false;
  try { return ctx.helpers.countControlled(ctx, 'JUD', {}) >= 1 || !!(t && (t.manpower || 0) > 0); } catch (e) {
    warnOnce('risingSurvives', e); return false;
  }
}

function stir(ctx, names, mod) {
  for (const n of names) ctx.helpers.addProvinceModifier(ctx, n, mod);
}

// The towns the sources name — the ones that rose, and the ones that were
// burned for it.
const THE_LAKE = ['Sepphoris', 'Tiberias', 'Tarichaea'];

export const EVENTS_351 = [

  // ── 1 · 351 ────────────────────────────────────────────────────────────────
  // The chapter opens with a robbery, because that is what the sources
  // describe: arma corripiunt, in the night, from a garrison that was not
  // expecting to be robbed by the town it was billeted in.
  {
    id: 'ev351_the_arms_of_the_night',
    title: 'The Arms of the Night',
    worldLabel: 'The garrison of Diocaesarea is disarmed in the night',
    desc: 'It took less than an hour and nobody planned it for more than a week. The '
      + 'detachment quartered in Diocaesarea keeps its weapons in one building with one '
      + 'door, because it has been quartered in a quiet town for twenty years and quiet '
      + 'towns do not require imagination. By first light the arms are in Jewish hands, the '
      + 'soldiers who resisted are dead, and every man in the market has understood the same '
      + 'thing at the same moment: this cannot be given back.\n\n'
      + 'What is in the chest is a cohort\'s equipment — spears, shields, sixty swords, and '
      + 'a quantity of iron a town of this size could not buy in a year. What is not in the '
      + 'chest is a government, a treasury, a wall that has been maintained since Hadrian, '
      + 'or any reason to believe that the Caesar in Antioch will be slower than his '
      + 'predecessors. The men who did it are standing in the square waiting to be told what '
      + 'they are.',
    forTag: 'both',
    date: { y: 351, m: 6 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'The rising began at Diocaesarea — Sepphoris — with the seizure of a garrison\'s '
      + 'weapons (Aurelius Victor 42.11; Jerome, Chron. s.a. 352; Socrates HE II.33). It '
      + 'spread to Tiberias and Diospolis and was put down within the year.',
    options: [
      {
        label: 'Call the villages in. Make it a levy',
        tooltip: 'The upper Galilee comes down: +6,000 manpower, +1 stability, and "The '
          + 'Villages Came In" (+10% manpower, +6% morale, 36 months). The men of Diocaesarea '
          + '+20, the Patriarch\'s house −15.',
        effects: guard('ev351_the_arms_of_the_night:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { manpower: 6000, stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_villages_came_in', name: 'The Villages Came In', months: 36,
            effects: { manpowerMult: 1.1, moraleMult: 1.06 },
          });
          h.factionShift(ctx, 'JUD', 'armed', 20);
          h.factionShift(ctx, 'JUD', 'nasi', -15);
          h.setFlag(ctx, 'villagesCalled', true);
          h.chronicle(ctx, 'era', 'The arms of the Diocaesarea garrison are taken in the night, '
            + 'and by the end of the week the villages of the upper Galilee have come down to the town.');
        }),
      },
      {
        label: 'Send to Tiberias before anything else',
        tooltip: 'The Patriarch\'s house is asked first, which costs a fortnight of the only '
          + 'advantage this rising has. +40 talents and +25 influence points; the house +20, '
          + 'the men of Diocaesarea −15, and Rome gets its fortnight ("The Fortnight Lost", '
          + '−10% reinforcement for 12 months).',
        effects: guard('ev351_the_arms_of_the_night:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: 40, infl: 25 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_fortnight_lost', name: 'The Fortnight Lost', months: 12,
            effects: { reinforceMult: 0.9 },
          });
          h.factionShift(ctx, 'JUD', 'nasi', 20);
          h.factionShift(ctx, 'JUD', 'armed', -15);
          h.setFlag(ctx, 'tiberiasAskedFirst', true);
          h.chronicle(ctx, 'era', 'Before anything else the rising writes to Tiberias, and waits '
            + 'a fortnight for an answer it could have had by walking.');
        }),
      },
      {
        label: 'Take the road south while nobody is on it',
        tooltip: 'Scythopolis and the valley road before the province wakes up: +1 stability, '
          + '"The Road Taken First" (+8% morale and +1 siege for 18 months), and Rome loses '
          + '150 talents of the province\'s cash. The academies −15 — this is not what they '
          + 'were promised it was.',
        effects: guard('ev351_the_arms_of_the_night:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_road_taken_first', name: 'The Road Taken First', months: 18,
            effects: { moraleMult: 1.08, siegeBonus: 1 },
          });
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { treasury: -150 });
          h.factionShift(ctx, 'JUD', 'armed', 12);
          h.factionShift(ctx, 'JUD', 'schools', -15);
          h.setFlag(ctx, 'valleyRoadTaken', true);
          h.chronicle(ctx, 'era', 'The rising goes for the valley road in its first week, on the '
            + 'correct assumption that the province has not yet been told.');
        }),
      },
    ],
  },

  // ── 2 · 351 · FORK: what he is called ─────────────────────────────────────
  {
    id: 'ev351_what_he_is_called',
    title: 'What He Is Called',
    desc: 'Socrates says they proclaimed him king. Jerome says they made him the leader of '
      + 'their rebellion. The difference between those two sentences is the difference '
      + 'between a police action and a war of succession, and it will be decided this week '
      + 'by people who have never decided anything larger than a boundary dispute.\n\n'
      + 'Patricius himself is a competent man of about forty whom nobody outside this valley '
      + 'had heard of in April. A diadem makes him answerable for a claim: the Empire files '
      + 'a pretender differently from a bandit, treats with him differently, and executes him '
      + 'differently. It also gives every Jew from Antioch to Alexandria something to be for '
      + 'or against, which is not a small thing when the whole rising is three towns.',
    forTag: 'JUD',
    date: { y: 351, m: 7 },
    major: true,
    aiOption: 1,
    historical: 'The Greek ecclesiastical historians say a king was proclaimed; the Latin '
      + 'chroniclers say only a leader. Both were writing about a rising that was over before '
      + 'either of them was born.',
    options: [
      {
        label: 'A king in Israel, and let the Empire read it in the East',
        tooltip: 'The diadem: +25 legitimacy, +1 stability, "A King Proclaimed" (+10% morale '
          + 'and +0.2 legitimacy a month, permanent) — and Rome is told what this is, which '
          + 'costs 25 opinion and hardens the response.',
        effects: guard('ev351_what_he_is_called:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 25, stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'a_king_proclaimed', name: 'A King Proclaimed', months: -1,
            effects: { moraleMult: 1.1, legitimacyAdd: 0.2 },
          });
          h.setRuler(ctx, 'JUD', { name: 'Patricius', title: 'King', gov: 1, infl: 3, mar: 3, age: 40 });
          h.factionShift(ctx, 'JUD', 'armed', 15);
          h.factionShift(ctx, 'JUD', 'nasi', -20);
          if (alive(ctx, 'ROM')) {
            h.addTagModifier(ctx, 'ROM', {
              id: 'a_pretender_in_the_east', name: 'A Pretender in the East', months: 36,
              effects: { moraleMult: 1.06 },
            });
          }
          h.setFlag(ctx, 'patriciusCrowned', true);
          h.chronicle(ctx, 'era', 'Patricius is proclaimed king at Diocaesarea. The Empire has a '
            + 'category for that, and it is not the one that ends in a fine.');
        }),
      },
      {
        label: 'Captain of the muster, and nothing written down',
        tooltip: 'No diadem and no claim: +50 governance points, "Nothing In Writing" (−0.5 '
          + 'unrest everywhere and +10% income, permanent), and the Empire keeps filing this '
          + 'as a disturbance for one more year (Rome −8% morale against you, 24 months). '
          + 'The men of Diocaesarea −10.',
        effects: guard('ev351_what_he_is_called:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { gov: 50 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'nothing_in_writing', name: 'Nothing In Writing', months: -1,
            effects: { unrestAll: -0.5, incomeMult: 1.1 },
          });
          if (alive(ctx, 'ROM')) {
            h.addTagModifier(ctx, 'ROM', {
              id: 'a_disturbance_only', name: 'Filed as a Disturbance', months: 24,
              effects: { moraleMult: 0.92 },
            });
          }
          h.factionShift(ctx, 'JUD', 'armed', -10);
          h.factionShift(ctx, 'JUD', 'nasi', 15);
          h.setFlag(ctx, 'patriciusCaptain', true);
          h.chronicle(ctx, 'era', 'Diocaesarea declines to crown anybody, which keeps the affair '
            + 'in the category of things a governor handles for another year.');
        }),
      },
    ],
  },

  // ── 3 · 351 · FORK: the house down the shore ──────────────────────────────
  {
    id: 'ev351_the_house_of_the_nasi',
    title: 'The House Down the Shore',
    desc: 'Three miles from the rebel outposts, in a city the Empire still governs, lives the '
      + 'Patriarch of the Jews. He holds the rank of an honorary prefect, he is written to by '
      + 'emperors, he ordains judges from Spain to Babylonia, he collects a tax from every '
      + 'congregation in the world, and he proclaims the new moon on which the festivals of a '
      + 'scattered people depend. Everything he has, he has because the Empire finds it '
      + 'convenient that somebody hold it.\n\n'
      + 'His court is not debating whether the rising is just. It is debating arithmetic: '
      + 'three towns, one season, and the certain knowledge that whatever the Galilee does, '
      + 'the letters still have to go out to Alexandria and Rome next year over somebody\'s '
      + 'seal. He will answer the embassy. What he answers is the only thing about this year '
      + 'that will still matter in a century.',
    forTag: 'JUD',
    date: { y: 351, m: 9 },
    major: true,
    aiOption: 1,
    historical: 'No source records the Patriarch\'s position on the rising, which is itself the '
      + 'answer most historians read: the office survived it, and offices that endorse failed '
      + 'risings do not.',
    options: [
      {
        label: 'Ask for the blessing, and take the house with you',
        tooltip: 'The letters, the courts and the crown gold come over: +200 talents, +30 '
          + 'legitimacy, "The Patriarch\'s Letters" (+12% income and +0.25 legitimacy a month, '
          + 'permanent), the house +30. Rome now treats the patriarchate as a belligerent '
          + '(−40 opinion, and the office\'s imperial protection is gone).',
        effects: guard('ev351_the_house_of_the_nasi:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: 200, legitimacy: 30 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_patriarchs_letters', name: 'The Patriarch\'s Letters', months: -1,
            effects: { incomeMult: 1.12, legitimacyAdd: 0.25 },
          });
          h.factionShift(ctx, 'JUD', 'nasi', 30);
          h.factionShift(ctx, 'JUD', 'schools', 10);
          const rom = ctx.game.tags[who(ctx, 'ROM')];
          if (rom && rom.opinion) rom.opinion.JUD = Math.max(-200, (rom.opinion.JUD || 0) - 40);
          h.setFlag(ctx, 'nasiBlessed', true);
          h.chronicle(ctx, 'era', 'The Patriarch\'s house comes over to the rising, and takes with '
            + 'it the one Jewish address in the world that emperors write to.');
        }),
      },
      {
        label: 'Leave the house out of it',
        tooltip: 'The office is left where it is, which is the only reason it survives this '
          + 'century: +40 influence points, "The Office Untouched" (+8% income, permanent), '
          + 'and the rising fights with no letters and no crown gold (−10% manpower, 48 '
          + 'months). The men of Diocaesarea +10.',
        effects: guard('ev351_the_house_of_the_nasi:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { infl: 40 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_office_untouched', name: 'The Office Untouched', months: -1,
            effects: { incomeMult: 1.08 },
          });
          h.addTagModifier(ctx, 'JUD', {
            id: 'no_letters_no_gold', name: 'No Letters, No Gold', months: 48,
            effects: { manpowerMult: 0.9 },
          });
          h.factionShift(ctx, 'JUD', 'armed', 10);
          h.factionShift(ctx, 'JUD', 'nasi', -10);
          h.setFlag(ctx, 'nasiStoodAside', true);
          h.chronicle(ctx, 'era', 'The Patriarch is left out of the rising, and the rising is left '
            + 'out of the Patriarch\'s letters. Both parties understand the arrangement exactly.');
        }),
      },
    ],
  },

  // ── 4 · 351 ────────────────────────────────────────────────────────────────
  {
    id: 'ev351_diospolis',
    title: 'Diospolis Declares',
    desc: 'A hundred kilometres south, in a town that has been called Lydda by everybody who '
      + 'lives there and Diospolis by everybody who taxes it, the Jews have driven out the '
      + 'garrison and sent word north. It is a magnificent gesture and a strategic disaster: '
      + 'Diospolis sits in the coastal plain on the main road from Caesarea, is walled the way '
      + 'a market town is walled, and cannot be reached from the Galilee without crossing '
      + 'everything the Empire still holds.\n\n'
      + 'The men who sent the message are asking for help. What they are actually asking is '
      + 'whether this rising is a country, in which case its towns get relieved, or a Galilean '
      + 'affair, in which case they have made a mistake that will be explained to them by '
      + 'somebody from Antioch.',
    forTag: 'JUD',
    date: { y: 351, m: 11 },
    aiOption: 1,
    historical: 'Aurelius Victor and Jerome both name Diospolis among the towns punished with '
      + 'Diocaesarea and Tiberias, so the town rose and was dealt with.',
    options: [
      {
        label: 'Relieve it. A country relieves its towns',
        tooltip: 'Diospolis comes over and a column goes south to it. +2,500 manpower there, '
          + '"The South Rose Too" (+8% morale, 24 months) — and the rising is now committed to '
          + 'ground it cannot hold (+1 unrest everywhere for 24 months).',
        effects: guard('ev351_diospolis:0', (ctx) => {
          const h = ctx.helpers;
          h.changeOwner(ctx, 'Lydda', 'JUD');
          h.spawnArmy(ctx, 'JUD', 'Lydda', { inf: 2, name: 'The Men of Diospolis' });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_south_rose_too', name: 'The South Rose Too', months: 24,
            effects: { moraleMult: 1.08 },
          });
          h.addTagModifier(ctx, 'JUD', {
            id: 'ground_we_cannot_hold', name: 'Ground We Cannot Hold', months: 24,
            effects: { unrestAll: 1 },
          });
          h.factionShift(ctx, 'JUD', 'armed', 15);
          h.setFlag(ctx, 'diospolisHeld', true);
          h.chronicle(ctx, 'era', 'Diospolis declares for the rising and the rising declares for '
            + 'Diospolis, which is the first decision this year that costs more than it pays.');
        }),
      },
      {
        label: 'Tell them to put the weapons back',
        tooltip: 'The message goes south and is not believed, and the town is punished anyway. '
          + '+60 governance points and −1 war exhaustion equivalent ("The Line Kept Short", '
          + '−0.5 unrest everywhere for 24 months); the men of Diocaesarea −20 and the '
          + 'academies −10, because everyone can read what it means.',
        effects: guard('ev351_diospolis:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { gov: 60 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_line_kept_short', name: 'The Line Kept Short', months: 24,
            effects: { unrestAll: -0.5 },
          });
          h.addProvinceModifier(ctx, 'Lydda', {
            id: 'diospolis_punished', name: 'Diospolis Punished', months: 60,
            effects: { unrest: 2, taxMult: 0.8 },
          });
          h.factionShift(ctx, 'JUD', 'armed', -20);
          h.factionShift(ctx, 'JUD', 'schools', -10);
          h.setFlag(ctx, 'diospolisAbandoned', true);
          h.chronicle(ctx, 'era', 'Diocaesarea tells Diospolis to sit down. Diospolis is punished '
            + 'for having stood up at all, which was always the likelier reading.');
        }),
      },
    ],
  },

  // ── 5 · 351 ────────────────────────────────────────────────────────────────
  // The reason there is a chapter here at all.
  {
    id: 'ev351_mursa',
    title: 'The Field at Mursa',
    worldLabel: 'Constantius destroys Magnentius at Mursa — and his own army with him',
    desc: 'On the 28th of September, on the Drava near Mursa, two Roman armies spend an entire '
      + 'day killing each other, and the eastern one wins. Constantius spends the battle in a '
      + 'church outside the town with the bishop; Magnentius rides west with what is left. The '
      + 'butcher\'s bill is somewhere above fifty thousand men, and every one of them was a '
      + 'trained soldier of the Roman Empire — the cavalry of the East, the Gallic legions, '
      + 'the Illyrian infantry that both sides drew on.\n\n'
      + 'Zosimus says it broke Rome\'s strength permanently, and for once the rhetoric is '
      + 'close to the arithmetic. There is no reserve behind those men. Whatever the Empire '
      + 'now sends against Persia, or the Rhine, or a town in the Galilee, it is sending '
      + 'instead of something else.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 351, m: 10 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Mursa (28 September 351) was the costliest battle Romans ever fought against '
      + 'Romans. Modern estimates of the dead run from thirty thousand to fifty-five; the '
      + 'field armies of the West never recovered their quality.',
    options: [
      {
        label: 'The Empire wins, and pays for it',
        tooltip: 'Rome: −14,000 manpower, −1 stability, and "The Dead of Mursa" (−12% '
          + 'reinforcement and −6% morale, 60 months). Every other court on the map has just '
          + 'been handed five years.',
        effects: guard('ev351_mursa:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { manpower: -14000, stability: -1 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'the_dead_of_mursa', name: 'The Dead of Mursa', months: 60,
              effects: { reinforceMult: 0.88, moraleMult: 0.94 },
            });
          }
          h.setFlag(ctx, 'mursaFought', true);
          h.chronicle(ctx, 'era', 'Fifty thousand Roman soldiers are killed by Roman soldiers at '
            + 'Mursa. The Empire wins, and spends the next generation discovering what it cost.');
        }),
      },
    ],
  },

  // ── 6 · 352 ────────────────────────────────────────────────────────────────
  // The counter-stroke that ended it in the history that happened.
  {
    id: 'ev351_ursicinus_marches',
    title: 'Ursicinus Comes Down',
    desc: 'The Caesar has finally been given an answer from Milan, or has decided to stop '
      + 'waiting for one, and the man who commands the East is on the road south with what '
      + 'the frontier can spare: field cavalry, two detachments off the Persian line, and the '
      + 'siege train that has been sitting at Antioch since the last time somebody needed it.\n\n'
      + 'Ursicinus is not Cestius Gallus and this is not 66. He is the best soldier the '
      + 'eastern establishment has, he will still be commanding armies eight years from now '
      + 'at Amida, and Ammianus — who is riding with him as a young staff officer — thinks '
      + 'the world of him. He has been told to end this before the campaigning season opens '
      + 'against Persia. He does not have long, and he knows exactly what that means for the '
      + 'towns.',
    forTag: 'JUD',
    date: { y: 352, m: 4 },
    major: true,
    aiOption: 2,
    historical: 'Ursicinus, magister equitum per Orientem, suppressed the rising; the sources '
      + 'agree the towns were burned and disagree wildly about how many died.',
    options: [
      {
        label: 'Meet him in the valley',
        tooltip: 'A battle on ground of your choosing against the best general in the East. '
          + '"The Valley Stand" (+15% morale and +2 siege for 12 months) — and 3,000 men who '
          + 'will not be replaced.',
        effects: guard('ev351_ursicinus_marches:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_valley_stand', name: 'The Valley Stand', months: 12,
            effects: { moraleMult: 1.15, siegeBonus: 2 },
          });
          h.adjust(ctx, 'JUD', { manpower: -3000 });
          h.factionShift(ctx, 'JUD', 'armed', 20);
          h.setFlag(ctx, 'metUrsicinus', true);
          h.chronicle(ctx, 'era', 'The rising forms up in the valley and waits for Ursicinus, '
            + 'which is either the bravest or the last decision it makes.');
        }),
      },
      {
        label: 'Hold the towns and make him besiege every one',
        tooltip: 'Walls, cisterns, and the summer: +2,000 manpower and "The Towns Shut" '
          + '(+1 hill defence and +5% manpower, 24 months). The academies −10: the schools '
          + 'are inside those walls, and the gates are shut on their students too.',
        effects: guard('ev351_ursicinus_marches:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { manpower: 2000 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_towns_shut', name: 'The Towns Shut', months: 24,
            effects: { hillDefBonus: 1, manpowerMult: 1.05 },
          });
          stir(ctx, THE_LAKE, {
            id: 'the_town_shut', name: 'The Town Shut', months: 24,
            effects: { unrest: 1, taxMult: 0.9 },
          });
          h.factionShift(ctx, 'JUD', 'schools', -10);
          h.setFlag(ctx, 'townsShut', true);
          h.chronicle(ctx, 'era', 'The towns of the lake shut their gates and make the Empire pay '
            + 'for each of them separately.');
        }),
      },
      {
        label: 'Into the hills. Let him have the towns',
        tooltip: 'The classic answer of a small country to a professional army, and the one '
          + 'that costs the towns: "The Hills Kept" (+12% morale, +1 hill defence and −25% '
          + 'maintenance, 36 months) — and Diocaesarea, Tiberias and Tarichaea take +3 unrest '
          + 'and a third of their trade for five years.',
        effects: guard('ev351_ursicinus_marches:2', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_hills_kept', name: 'The Hills Kept', months: 36,
            effects: { moraleMult: 1.12, hillDefBonus: 1, maintMult: 0.75 },
          });
          stir(ctx, THE_LAKE, {
            id: 'the_town_given_up', name: 'The Town Given Up', months: 60,
            effects: { unrest: 3, taxMult: 0.7 },
          });
          h.factionShift(ctx, 'JUD', 'armed', 10);
          h.factionShift(ctx, 'JUD', 'nasi', -15);
          h.setFlag(ctx, 'tookToTheHills', true);
          h.chronicle(ctx, 'era', 'The rising goes into the hills and leaves the towns to be made '
            + 'an example of, which is the decision that keeps it alive and the one it is hated for.');
        }),
      },
    ],
  },

  // ── 7 · the burning ───────────────────────────────────────────────────────
  {
    id: 'ev351_the_towns_of_the_lake',
    title: 'The Towns of the Lake',
    desc: 'Diocaesarea is levelled. Not sacked — levelled, in the specific administrative sense '
      + 'the Empire reserves for a place it intends to be an argument: the walls thrown down, '
      + 'the population dispersed, and the name kept in the tax registers so that the ruin can '
      + 'go on being assessed. Tiberias and Diospolis are punished more conventionally.\n\n'
      + 'What actually goes with the buildings is the thing nobody writing the report thinks '
      + 'to record. These towns are the academies: the courts that ordain, the benches where a '
      + 'tractate is being argued into its final shape, the archive of a century and a half of '
      + 'rulings. Some of it walks to Babylonia and finishes there in somebody else\'s '
      + 'language. Most of it stops.',
    forTag: 'both',
    trigger: safeTrigger('ev351_the_towns_of_the_lake', (ctx) => ctx.game.date.y >= 352
      && alive(ctx, 'ROM') && controls(ctx, 'ROM', 'Sepphoris') && !flag(ctx, 'townsBurned')),
    maxYear: 365,
    // A dispatch rather than a decision: this is the Empire acting, and there
    // is no answer to be given to it from inside the burning towns.
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Diocaesarea was destroyed; Tiberias and Diospolis were damaged. The Galilean '
      + 'academies never regained the position they held before 351, and the Talmud of the '
      + 'Land of Israel breaks off unfinished within the generation.',
    options: [
      {
        label: 'The register keeps the name',
        tooltip: 'Sepphoris, Tiberias and Tarichaea: −2 development each, +3 unrest and a third '
          + 'of the trade gone for six years. Rome +40 talents of confiscations. The flag is '
          + 'set: the schools of the Galilee are scattered.',
        effects: guard('ev351_the_towns_of_the_lake:0', (ctx) => {
          const h = ctx.helpers;
          for (const name of THE_LAKE) {
            const p = ctx.prov && ctx.prov(name);
            if (p && p.dev) {
              p.dev.tax = Math.max(1, (p.dev.tax || 1) - 1);
              p.dev.prod = Math.max(1, (p.dev.prod || 1) - 1);
            }
            h.addProvinceModifier(ctx, name, {
              id: 'ursicinus_came_through_351', name: 'Ursicinus Came Through', months: 72,
              effects: { unrest: 3, taxMult: 0.7 },
            });
          }
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { treasury: 40 });
          if (alive(ctx, 'JUD')) h.factionShift(ctx, 'JUD', 'schools', -25);
          h.setFlag(ctx, 'townsBurned', true);
          h.chronicle(ctx, 'era', 'Diocaesarea is levelled and the towns of the lake are punished. '
            + 'The buildings are the part of the loss that gets written down.');
        }),
      },
    ],
  },

  // ── 8 · 355 ────────────────────────────────────────────────────────────────
  {
    id: 'ev351_gallus_at_pola',
    title: 'The Caesar Is Recalled',
    worldLabel: 'Gallus is stripped of the purple and executed at Pola',
    desc: 'It takes Constantius three years to decide what to do about the cousin he made '
      + 'Caesar, and when he decides, he does it the way this family does everything: by '
      + 'summons, by stages, and with a change of escort at each one. Gallus is invited west, '
      + 'relieved of his guard at Petovio, relieved of the purple at Pola, questioned about '
      + 'the deaths at Antioch — the prefect Theophilus torn apart in the street by a mob over '
      + 'the grain price, the notables condemned on evidence supplied by his wife — and '
      + 'beheaded.\n\n'
      + 'For everybody in the East this means a season with no government: the Caesar\'s '
      + 'appointments are void, the orders in transit are worthless, and the next authority '
      + 'is whoever Milan sends, whenever Milan sends him.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 355, m: 1 },
    world: true,
    aiOption: 0,
    historical: 'Gallus was executed at Pola in late 354 after three years of misrule in '
      + 'Antioch. Ammianus, who served in the East throughout, is the source and is not fond '
      + 'of him.',
    options: [
      {
        label: 'The East has no government for a season',
        tooltip: 'Rome: −1 stability and "No Caesar in the East" (−10% income and −8% '
          + 'reinforcement, 18 months). Everybody else gets a winter.',
        effects: guard('ev351_gallus_at_pola:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { stability: -1 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'no_caesar_in_the_east', name: 'No Caesar in the East', months: 18,
              effects: { incomeMult: 0.9, reinforceMult: 0.92 },
            });
          }
          h.setFlag(ctx, 'gallusDead', true);
          h.chronicle(ctx, 'era', 'Gallus is beheaded at Pola, and the East spends a season '
            + 'without anybody who can lawfully sign anything.');
        }),
      },
    ],
  },

  // ── 9 · FORK: the bishops' terms ──────────────────────────────────────────
  {
    id: 'ev351_the_bishops_terms',
    title: 'The Other Half of the Province',
    desc: 'A Jewish state that has taken Caesarea, or Aelia, or both, now governs Christians — '
      + 'not a scattering of them, but bishops with correspondents in Antioch and Rome, '
      + 'basilicas built with imperial money on ground the Empire bought for the purpose, and '
      + 'congregations who have spent thirty years learning that the government is theirs.\n\n'
      + 'The bishop of Caesarea has asked for an audience, which is itself the concession: he '
      + 'is treating this court as a court. What he wants is written terms — the endowments '
      + 'left alone, the pilgrim roads open, the clergy exempt as they are under the Empire. '
      + 'What he is offering is that the churches stop being an imperial party inside your '
      + 'borders. Every option here has been taken by somebody, and the ones who refused are '
      + 'the ones history has more to say about.',
    forTag: 'JUD',
    trigger: safeTrigger('ev351_the_bishops_terms', (ctx) => risingSurvives(ctx)
      && (controls(ctx, 'JUD', 'Caesarea Maritima') || controls(ctx, 'JUD', 'Jerusalem'))
      && !flag(ctx, 'bishopsSettled') && !flag(ctx, 'bishopsRefused')),
    maxYear: 410,
    major: true,
    aiOption: 0,
    historical: 'No Jewish state governed Christian Palestine, so this is the chapter\'s '
      + 'invention — but the terms are the ones the fourth century actually negotiated '
      + 'everywhere else it happened, in both directions.',
    options: [
      {
        label: 'Terms, in writing, with the endowments left alone',
        tooltip: 'The Emperor\'s Church stops being the Emperor\'s: the foreign-patron unrest '
          + 'ends permanently, +1 stability, +25 legitimacy — and the endowments stay in '
          + 'Christian hands (−6% income, permanent).',
        effects: guard('ev351_the_bishops_terms:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 1, legitimacy: 25 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_endowments_left', name: 'The Endowments Left Alone', months: -1,
            effects: { incomeMult: 0.94 },
          });
          h.setFlag(ctx, 'bishopsSettled', true);
          h.chronicle(ctx, 'era', 'The bishops of Palestine sign terms with a Jewish government, '
            + 'which is a sentence no fourth-century writer on either side expected to have to write.');
        }),
      },
      {
        label: 'They may keep their faith and pay for it like anybody else',
        tooltip: 'The endowments are assessed and the exemptions end: +400 talents and +10% '
          + 'income permanently — and the churches stay what they are (the Emperor\'s Church '
          + 'unrest continues, +0.5 unrest everywhere permanently).',
        effects: guard('ev351_the_bishops_terms:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: 400 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_endowments_assessed', name: 'The Endowments Assessed', months: -1,
            effects: { incomeMult: 1.1, unrestAll: 0.5 },
          });
          h.setFlag(ctx, 'bishopsRefused', true);
          h.chronicle(ctx, 'era', 'The Jewish government assesses the churches like any other '
            + 'landholder, and the bishops write to Antioch about it by the next post.');
        }),
      },
    ],
  },

  // ── 10 · 358 · FORK: the moon and the reckoning ───────────────────────────
  {
    id: 'ev351_the_fixed_calendar',
    title: 'The Moon and the Reckoning',
    desc: 'For as long as there has been a court in this country, the year has begun when the '
      + 'court says it begins. Witnesses come in, the new moon is confirmed, the fires or the '
      + 'messengers go out, and from Babylonia to Spain the festivals are kept on the days a '
      + 'Palestinian court named. It is the single most powerful thing the Land still does for '
      + 'the people outside it, and it works only as long as there is a Land with a court in '
      + 'it and roads a messenger can use.\n\n'
      + 'The house has the tables. Astronomy is not the difficulty and has not been for two '
      + 'centuries; the nineteen-year cycle is arithmetic any competent computist can do. '
      + 'Publish it, and no congregation anywhere ever needs to wait for a messenger from '
      + 'Tiberias again. That is the argument for it, and it is also, precisely and '
      + 'irreversibly, the argument against.',
    forTag: 'JUD',
    date: { y: 358, m: 9 },
    major: true,
    aiOption: 0,
    historical: 'Hillel II is credited with fixing the calendar by computation in 358/9 — the '
      + 'tradition is late and disputed, but the shift from proclamation to reckoning happens '
      + 'in this century, and it is what allowed Jewish life to survive the end of the '
      + 'Palestinian court.',
    options: [
      {
        label: 'Publish the reckoning',
        tooltip: 'The insurance policy: +80 influence points, "The Reckoning Published" (+0.3 '
          + 'legitimacy a month and +10% income from a diaspora that no longer waits, '
          + 'permanent) — and the Land is no longer necessary to the calendar (−0.15 '
          + 'legitimacy a month, permanent, and the academies −15).',
        effects: guard('ev351_the_fixed_calendar:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { infl: 80 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_reckoning_published', name: 'The Reckoning Published', months: -1,
            effects: { legitimacyAdd: 0.15, incomeMult: 1.1 },
          });
          h.factionShift(ctx, 'JUD', 'nasi', 15);
          h.factionShift(ctx, 'JUD', 'schools', -15);
          h.setFlag(ctx, 'reckoningPublished', true);
          h.chronicle(ctx, 'era', 'The calendar is fixed by computation and sent out. Every '
            + 'congregation on earth can now keep the festivals without asking anybody in this country.');
        }),
      },
      {
        label: 'The moon is proclaimed from the Land, as it always has been',
        tooltip: 'The centre held on purpose: "The Courts of the Land" (+0.35 legitimacy a '
          + 'month and −0.5 unrest everywhere, permanent) and the academies +20 — and the '
          + 'whole arrangement depends on this state surviving (−8% income, and if the courts '
          + 'ever stop, so does the calendar).',
        effects: guard('ev351_the_fixed_calendar:1', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_courts_of_the_land', name: 'The Courts of the Land', months: -1,
            effects: { legitimacyAdd: 0.35, unrestAll: -0.5, incomeMult: 0.92 },
          });
          h.factionShift(ctx, 'JUD', 'schools', 20);
          h.factionShift(ctx, 'JUD', 'nasi', -10);
          h.setFlag(ctx, 'moonKept', true);
          h.chronicle(ctx, 'era', 'The court keeps the proclamation of the moon in its own hands, '
            + 'and with it the one thing that makes the Land indispensable to everybody outside it.');
        }),
      },
    ],
  },

  // ── 11 · 362 ──────────────────────────────────────────────────────────────
  {
    id: 'ev351_the_letter_to_the_congregations',
    title: 'The Letter to the Congregations',
    desc: 'The new Augustus writes to the Jews, and the letter is genuine, and it is very '
      + 'strange. He calls the tax that has been collected from every congregation in the '
      + 'world an intolerable burden and abolishes it. He instructs his officials to stop '
      + 'requiring what he calls the tribute of Jewry. He refers to the Patriarch — in a '
      + 'document going out under the imperial seal — as his brother, the venerable Iulos.\n\n'
      + 'Julian has been on the throne for a year and has spent it dismantling his family\'s '
      + 'church with the enthusiasm of a man who was raised in it. He is not a philosemite; he '
      + 'is a Hellenist who has noticed that the strongest available argument against the '
      + 'Galileans is a Jewish people practising a functioning ancestral cult with sacrifices. '
      + 'The abolition costs the Patriarch\'s house its income and gains the congregations '
      + 'theirs, and every party in this state has a different opinion about that.',
    forTag: 'JUD',
    date: { y: 362, m: 8 },
    aiOption: 0,
    historical: 'Julian\'s Letter to the Community of the Jews (ep. 51 Wright) abolished the '
      + 'aurum coronarium and addressed the patriarch as "my brother the most venerable '
      + 'Iulos". Some scholars doubt its authenticity; most do not.',
    options: [
      {
        label: 'Take the relief and let the house find another income',
        tooltip: '+300 talents to the congregations of this state and "The Burden Lifted" '
          + '(+10% income, 60 months); the Patriarch\'s house −20, the academies +10.',
        effects: guard('ev351_the_letter_to_the_congregations:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: 300 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_burden_lifted', name: 'The Burden Lifted', months: 60,
            effects: { incomeMult: 1.1 },
          });
          h.factionShift(ctx, 'JUD', 'nasi', -20);
          h.factionShift(ctx, 'JUD', 'schools', 10);
          h.setFlag(ctx, 'crownGoldAbolished', true);
          h.chronicle(ctx, 'era', 'Julian abolishes the crown gold, which delights every '
            + 'congregation that paid it and ruins the office that collected it.');
        }),
      },
      {
        label: 'Thank him, and keep collecting it ourselves',
        tooltip: 'The tax survives its abolition because this court, not the Empire, now '
          + 'collects it: +150 talents, the house +25, and "The Purse Kept" (+8% income and '
          + '+0.15 legitimacy a month, permanent). The congregations abroad notice (−15 '
          + 'opinion with every court that hosts one).',
        effects: guard('ev351_the_letter_to_the_congregations:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: 150 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_purse_kept', name: 'The Purse Kept', months: -1,
            effects: { incomeMult: 1.08, legitimacyAdd: 0.15 },
          });
          h.factionShift(ctx, 'JUD', 'nasi', 25);
          h.setFlag(ctx, 'crownGoldKept', true);
          h.chronicle(ctx, 'era', 'The crown gold is abolished by the Emperor and collected by '
            + 'the Jewish state instead, which the congregations regard as a distinction without a refund.');
        }),
      },
    ],
  },

  // ── 12 · 363 · FORK: the Emperor's offer ──────────────────────────────────
  {
    id: 'ev351_the_stone_is_laid',
    title: 'The Emperor Orders the House Rebuilt',
    desc: 'Alypius of Antioch, lately vicarius of Britain, arrives in Jerusalem with imperial '
      + 'authority, imperial money, and instructions to rebuild the Temple. The governor of '
      + 'the province is to assist him. The Emperor has written to say that when he has '
      + 'finished with the Persian war he intends to worship there himself.\n\n'
      + 'Every part of this is real and none of it is friendly. Julian wants the sacrifices '
      + 'resumed because a functioning Jewish cult refutes a Christian prophecy, and he is '
      + 'perfectly clear about that in his own writings. The offer is nevertheless the offer: '
      + 'stone, money, engineers, and the one authority on earth that can grant it. The rabbis '
      + 'of this generation have views about who is permitted to build the House and on what '
      + 'authority, and the imperial treasury is not among the answers any of them gave.',
    forTag: 'JUD',
    date: { y: 363, m: 3 },
    major: true,
    aiOption: 0,
    historical: 'Julian ordered the Temple rebuilt in 363 and work began; Ammianus (XXIII.1.3) '
      + 'says balls of fire burst from the foundations and stopped it. There was a severe '
      + 'earthquake in the region that May, and Julian was dead by June.',
    options: [
      {
        label: 'Lay the stone',
        tooltip: 'The foundations are cleared and begun: +40 legitimacy, +1 stability, "The '
          + 'Work Begun" (+15% morale and +0.3 legitimacy a month, 24 months) — and every '
          + 'Christian province you hold gains +2 unrest for five years.',
        effects: guard('ev351_the_stone_is_laid:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 40, stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_work_begun', name: 'The Work Begun', months: 24,
            effects: { moraleMult: 1.15, legitimacyAdd: 0.3 },
          });
          const g = ctx.game;
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.religion !== 'christianity') continue;
            if (p.owner !== who(ctx, 'JUD')) continue;
            h.addProvinceModifier(ctx, p.canon || p.name, {
              id: 'the_work_on_the_mount', name: 'The Work on the Mount', months: 60,
              effects: { unrest: 2 },
            });
          }
          h.factionShift(ctx, 'JUD', 'armed', 15);
          h.setFlag(ctx, 'julianStoneLaid', true);
          h.chronicle(ctx, 'era', 'The foundations on the Mount are cleared with imperial money '
            + 'and a pagan emperor\'s blessing, which is not how anybody had imagined this.');
        }),
      },
      {
        label: 'Not on this authority',
        tooltip: 'The offer is declined on the grounds that the House is not the Emperor\'s to '
          + 'grant: +70 governance points, the academies +25, and "The Refusal" (+0.25 '
          + 'legitimacy a month and −0.5 unrest everywhere, permanent). The men of Diocaesarea '
          + '−20, and they say so.',
        effects: guard('ev351_the_stone_is_laid:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { gov: 70 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_refusal_363', name: 'The Refusal', months: -1,
            effects: { legitimacyAdd: 0.25, unrestAll: -0.5 },
          });
          h.factionShift(ctx, 'JUD', 'schools', 25);
          h.factionShift(ctx, 'JUD', 'armed', -20);
          h.setFlag(ctx, 'julianOfferDeclined', true);
          h.chronicle(ctx, 'era', 'The Emperor\'s offer to rebuild the House is declined, on the '
            + 'grounds that it was never his to make.');
        }),
      },
    ],
  },

  // ── 13 · 363 · terminal of the stone road ─────────────────────────────────
  {
    id: 'ev351_the_fire_in_the_foundations',
    title: 'The Fire in the Foundations',
    desc: 'Ammianus, a pagan, a soldier and a man with no reason to invent it, writes that as '
      + 'the workmen dug at the old foundations, terrifying balls of flame burst out near the '
      + 'bases and made the site inaccessible, and that after several men had been burned the '
      + 'work was abandoned. There was a serious earthquake in the region that May. Trapped '
      + 'gas in sealed vaults will do exactly what he describes.\n\n'
      + 'It does not matter. Within a month the Emperor who ordered the work is dead outside '
      + 'Samarra with a spear in him, the money stops, Alypius is recalled, and every '
      + 'Christian writer for the next thousand years has a story about the fire. The stones '
      + 'that were cleared stay cleared. What was begun stays begun, which is either a wound '
      + 'or a foundation depending on what this state does next.',
    forTag: 'JUD',
    trigger: safeTrigger('ev351_the_fire_in_the_foundations', (ctx) => flag(ctx, 'julianStoneLaid')
      && (ctx.game.date.y > 363 || (ctx.game.date.y === 363 && ctx.game.date.m >= 5))),
    maxYear: 375,
    major: true,
    aiOption: 0,
    historical: 'Ammianus XXIII.1.3. The work stopped; Julian died on 26 June 363; no emperor '
      + 'ever offered again.',
    options: [
      {
        label: 'Clear the site again and keep the stones',
        tooltip: 'The work is not abandoned, only interrupted: +50 governance points, "The '
          + 'Stones Kept" (+0.2 legitimacy a month, permanent), and Jerusalem gains a '
          + 'permanent claim on this state\'s attention (+1 unrest there, 120 months).',
        effects: guard('ev351_the_fire_in_the_foundations:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { gov: 50 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_stones_kept', name: 'The Stones Kept', months: -1,
            effects: { legitimacyAdd: 0.2 },
          });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'the_cleared_platform', name: 'The Cleared Platform', months: 120,
            effects: { unrest: 1 },
          });
          h.setFlag(ctx, 'stonesKept', true);
          h.chronicle(ctx, 'era', 'The fire stops the work and the state clears the site again '
            + 'anyway. The stones stay where they were put.');
        }),
      },
      {
        label: 'Leave it. It was never our authority',
        tooltip: '+1 stability, the academies +20, and "The Ground Left Alone" (−0.75 unrest '
          + 'everywhere, permanent).',
        effects: guard('ev351_the_fire_in_the_foundations:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_ground_left_alone', name: 'The Ground Left Alone', months: -1,
            effects: { unrestAll: -0.75 },
          });
          h.factionShift(ctx, 'JUD', 'schools', 20);
          h.setFlag(ctx, 'groundLeftAlone', true);
          h.chronicle(ctx, 'era', 'The site is left as the fire left it, and the generation that '
            + 'would have served in it grows old arguing about whose fault that was.');
        }),
      },
    ],
  },

  // ── 14 · terminal of the declined road ────────────────────────────────────
  {
    id: 'ev351_what_declining_bought',
    title: 'What the Refusal Bought',
    desc: 'Twenty years on, the refusal has aged better than anything else this state decided '
      + 'in the sixties. Julian is a cautionary tale in three religions; the emperors after '
      + 'him are Christians again and legislating like it; and the one accusation that is not '
      + 'available against the Jews of this country is that they took a pagan\'s money to '
      + 'rebuild their House against the Church.\n\n'
      + 'The academies have made a great deal of this, and are not wrong to. It is also true '
      + 'that the Mount is still bare, that the men who wanted to build are dead of old age, '
      + 'and that nobody has offered since or ever will.',
    forTag: 'JUD',
    trigger: safeTrigger('ev351_what_declining_bought', (ctx) => flag(ctx, 'julianOfferDeclined')
      && ctx.game.date.y >= 383 && risingSurvives(ctx)),
    maxYear: 425,
    aiOption: 0,
    historical: 'The Temple was not rebuilt. The refusal is the chapter\'s counterfactual; '
      + 'the aging of it is not.',
    options: [
      {
        label: 'A state that kept its own authority',
        tooltip: '+40 legitimacy, +1 stability, and "Our Own Authority" (+0.25 legitimacy a '
          + 'month and −0.5 unrest everywhere, permanent).',
        effects: guard('ev351_what_declining_bought:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 40, stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'our_own_authority', name: 'Our Own Authority', months: -1,
            effects: { legitimacyAdd: 0.25, unrestAll: -0.5 },
          });
          h.chronicle(ctx, 'era', 'A generation later the refusal of 363 is the decision this '
            + 'state is proudest of, and the one it is least able to explain to its own young men.');
        }),
      },
      {
        label: 'Then build it ourselves, on our own authority',
        tooltip: 'What the refusal was actually reserving: the state clears and begins the '
          + 'work with its own money. −400 talents, +50 legitimacy, "The Work of Our Own Hands" '
          + '(+0.35 legitimacy a month and +8% morale, permanent) — and every Christian province '
          + 'held gains +2 unrest for ten years.',
        effects: guard('ev351_what_declining_bought:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          h.adjust(ctx, 'JUD', { treasury: -400, legitimacy: 50 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'work_of_our_own_hands', name: 'The Work of Our Own Hands', months: -1,
            effects: { legitimacyAdd: 0.35, moraleMult: 1.08 },
          });
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.religion !== 'christianity') continue;
            if (p.owner !== who(ctx, 'JUD')) continue;
            h.addProvinceModifier(ctx, p.canon || p.name, {
              id: 'the_work_of_our_own_hands', name: 'The Work on the Mount', months: 120,
              effects: { unrest: 2 },
            });
          }
          h.setFlag(ctx, 'builtItOurselves', true);
          h.chronicle(ctx, 'era', 'Twenty years after refusing an emperor\'s money, the state '
            + 'begins the work with its own, which is what the refusal was always reserving.');
        }),
      },
    ],
  },

  // ── 15 · terminals of the calendar fork ───────────────────────────────────
  {
    id: 'ev351_the_diaspora_keeps_its_own_time',
    title: 'The Diaspora Keeps Its Own Time',
    desc: 'The letters still go out from this country, and they are still read, and they no '
      + 'longer decide anything. A congregation in Spain that has the tables does not need to '
      + 'be told when Passover is; it needs to be told nothing at all, which is a condition no '
      + 'Jewish community has been in since the exile. The reckoning did what it was published '
      + 'to do: it made the calendar indestructible, and it made this court optional.\n\n'
      + 'Whether that is a rescue or an abdication is the argument in every study house in the '
      + 'Land, and the honest answer is that it is both, and that the men who published it '
      + 'knew it and published it anyway.',
    forTag: 'JUD',
    trigger: safeTrigger('ev351_the_diaspora_keeps_its_own_time', (ctx) => flag(ctx, 'reckoningPublished')
      && ctx.game.date.y >= 400),
    maxYear: 429,
    aiOption: 0,
    historical: 'The computed calendar outlived the Palestinian patriarchate by fifteen '
      + 'centuries, which is what it was for.',
    options: [
      {
        label: 'It was insurance. It has paid',
        tooltip: '+60 influence points and "Indestructible" (+0.2 legitimacy a month and +8% '
          + 'income from the congregations, permanent).',
        effects: guard('ev351_the_diaspora_keeps_its_own_time:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { infl: 60 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'indestructible_calendar', name: 'Indestructible', months: -1,
            effects: { legitimacyAdd: 0.2, incomeMult: 1.08 },
          });
          h.chronicle(ctx, 'era', 'The reckoning has made the festivals independent of this '
            + 'country, which was the point, and of this country\'s court, which was the price.');
        }),
      },
      {
        label: 'Put the court back on top of the tables',
        tooltip: 'The computation stands and the confirmation returns to a court sitting here, '
          + 'which is more work than it sounds and the only way the centre is a centre. Costs '
          + '60 governance; the academies +20, "The Tables Confirmed" (+0.3 legitimacy a month '
          + 'and −0.4 unrest everywhere, permanent) and −5% income.',
        effects: guard('ev351_the_diaspora_keeps_its_own_time:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { gov: -60 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_tables_confirmed', name: 'The Tables Confirmed', months: -1,
            effects: { legitimacyAdd: 0.3, unrestAll: -0.4, incomeMult: 0.95 },
          });
          h.factionShift(ctx, 'JUD', 'schools', 20);
          h.chronicle(ctx, 'era', 'The tables stand and the confirmation comes back to a court '
            + 'in the Land, which nobody needs and everybody notices.');
        }),
      },
    ],
  },
  {
    id: 'ev351_the_courts_of_the_land',
    title: 'The Courts of the Land',
    desc: 'Fifty years on, the witnesses still come in, the moon is still confirmed by a court '
      + 'sitting in this country, and the messengers still go out — to Antioch, to Alexandria, '
      + 'over the Euphrates to academies that have been quietly computing their own tables for '
      + 'a century and keeping the days this court names anyway, because it names them.\n\n'
      + 'It is an extraordinary thing to have held. It is also a thread: every year of it '
      + 'depends on there being a court here, in a country, with roads. The men who refused to '
      + 'publish the reckoning were not sentimental. They understood exactly what they were '
      + 'wagering, and they wagered that this state would last.',
    forTag: 'JUD',
    trigger: safeTrigger('ev351_the_courts_of_the_land', (ctx) => flag(ctx, 'moonKept')
      && ctx.game.date.y >= 400 && risingSurvives(ctx)),
    maxYear: 429,
    aiOption: 0,
    historical: 'Proclamation by a Palestinian court is what the fixed calendar replaced. Where '
      + 'the court survived, so did the practice.',
    options: [
      {
        label: 'The centre held, because there was a state to hold it',
        tooltip: '+50 legitimacy and "The Centre Held" (+0.35 legitimacy a month and −0.5 '
          + 'unrest everywhere, permanent).',
        effects: guard('ev351_the_courts_of_the_land:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 50 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_centre_held', name: 'The Centre Held', months: -1,
            effects: { legitimacyAdd: 0.35, unrestAll: -0.5 },
          });
          h.chronicle(ctx, 'era', 'Half a century after the rising, the moon is still proclaimed '
            + 'from the Land, by a court in a country that is still there to hold one.');
        }),
      },
      {
        label: 'Send the tables east, and keep proclaiming here',
        tooltip: 'The wager hedged: Babylonia gets the computation in writing and the '
          + 'proclamation goes on from the Land for whoever still waits for it. +250 talents '
          + 'from the eastern academies, "The Hedge" (+8% income and +0.15 legitimacy a month, '
          + 'permanent); the academies −12, because they can see what it means.',
        effects: guard('ev351_the_courts_of_the_land:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: 250 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_hedge', name: 'The Hedge', months: -1,
            effects: { incomeMult: 1.08, legitimacyAdd: 0.15 },
          });
          h.factionShift(ctx, 'JUD', 'schools', -12);
          h.setFlag(ctx, 'calendarHedged', true);
          h.chronicle(ctx, 'era', 'The tables go east and the moon goes on being proclaimed at '
            + 'home, which is either prudence or the first half of giving in.');
        }),
      },
    ],
  },

  // ── 16 · terminals of the bishops' fork ───────────────────────────────────
  {
    id: 'ev351_the_two_congregations',
    title: 'Two Congregations, One Assize',
    desc: 'The terms have held for a generation, which nobody expected, least of all the men '
      + 'who signed them. The basilicas are full, the pilgrims still come — they come in '
      + 'greater numbers than before, because a pilgrimage under a Jewish government is a '
      + 'story worth telling at home — and the bishops litigate in this state\'s courts about '
      + 'property, precedence and each other, which is what bishops do under any government '
      + 'that lets them.\n\n'
      + 'The thing that was actually bought is invisible: there is no imperial party inside '
      + 'these borders. When Constantinople legislates about the Jews, and it does, every '
      + 'decade, more sharply, it is legislating about somebody else\'s subjects.',
    forTag: 'JUD',
    trigger: safeTrigger('ev351_the_two_congregations', (ctx) => flag(ctx, 'bishopsSettled')
      && ctx.game.date.y >= 397 && risingSurvives(ctx)),
    maxYear: 429,
    aiOption: 0,
    historical: 'The nearest real analogue is Sasanian Mesopotamia, where a Christian church '
      + 'under a non-Christian crown was made to stop being a foreign embassy by exactly this '
      + 'kind of settlement.',
    options: [
      {
        label: 'A province with two peoples and one law',
        tooltip: '+1 stability, +30 legitimacy and "One Assize" (−0.75 unrest everywhere and '
          + '+8% income, permanent).',
        effects: guard('ev351_the_two_congregations:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 1, legitimacy: 30 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'one_assize', name: 'One Assize', months: -1,
            effects: { unrestAll: -0.75, incomeMult: 1.08 },
          });
          h.chronicle(ctx, 'era', 'A generation on, the bishops of this country litigate in its '
            + 'courts and write to Constantinople about the weather.');
        }),
      },
      {
        label: 'Their own courts, for their own people',
        tooltip: 'Two jurisdictions under one crown — the arrangement every later empire in '
          + 'this country arrives at: +1 stability, −0.6 unrest everywhere permanently and '
          + '−6% cost of governing; the crown\'s own law reaches less far (−5% integration).',
        effects: guard('ev351_the_two_congregations:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'two_jurisdictions', name: 'Two Jurisdictions', months: -1,
            effects: { unrestAll: -0.6, adminMult: 0.94, integrateMult: 0.95 },
          });
          h.setFlag(ctx, 'twoJurisdictions', true);
          h.chronicle(ctx, 'era', 'The bishops keep their own courts for their own people, which '
            + 'buys a quiet province and concedes that there are two peoples in it.');
        }),
      },
    ],
  },
  {
    id: 'ev351_the_law_of_the_other_side',
    title: 'The Law of the Other Side',
    desc: 'The churches were assessed like landholders, and the answer arrives in the form the '
      + 'fourth century always uses: not an army, a statute. Constantinople has been building a '
      + 'body of law about Jews for thirty years — no new synagogues, no jurisdiction over '
      + 'Christians, no proselytes, no honours — and every congregation of this people living '
      + 'outside this state\'s borders now lives under it. The bishops here write the briefs '
      + 'that supply the examples.\n\n'
      + 'Inside the borders the treasury is fuller than it has ever been. Outside them, a '
      + 'people that was a tolerated nation is becoming a legal category, and the two facts '
      + 'have the same cause.',
    forTag: 'JUD',
    trigger: safeTrigger('ev351_the_law_of_the_other_side', (ctx) => flag(ctx, 'bishopsRefused')
      && ctx.game.date.y >= 397),
    maxYear: 429,
    aiOption: 0,
    historical: 'Codex Theodosianus XVI.8 collects the legislation: the fourth century\'s '
      + 'answer to a Jewish question was always a rescript.',
    options: [
      {
        label: 'Pay for the diaspora\'s protection out of the endowments',
        tooltip: '−250 talents and +50 influence points: the money bought here goes to the '
          + 'congregations abroad, and "Bought Their Quiet" (+0.2 legitimacy a month, permanent).',
        effects: guard('ev351_the_law_of_the_other_side:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: -250, infl: 50 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'bought_their_quiet', name: 'Bought Their Quiet', months: -1,
            effects: { legitimacyAdd: 0.2 },
          });
          h.chronicle(ctx, 'era', 'The endowments taken from the churches of the Galilee are spent '
            + 'buying quiet for congregations the Galilee cannot protect.');
        }),
      },
      {
        label: 'They are outside our borders and outside our reach',
        tooltip: '+300 talents kept and "The Full Chest" (+10% income, permanent); −20 '
          + 'legitimacy, and the diaspora communities remember it.',
        effects: guard('ev351_the_law_of_the_other_side:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: 300, legitimacy: -20 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_full_chest', name: 'The Full Chest', months: -1,
            effects: { incomeMult: 1.1 },
          });
          h.chronicle(ctx, 'era', 'The Galilee keeps its money and the congregations of the Empire '
            + 'keep their statutes, and both parties are told this is realism.');
        }),
      },
    ],
  },

  // ── 17 · terminals of the name fork ───────────────────────────────────────
  {
    id: 'ev351_what_the_crown_was_worth',
    title: 'What the Crown Was Worth',
    desc: 'A generation of it, now, and the diadem has done what diadems do: it has made this '
      + 'thing a state in every chancery that keeps files. Ctesiphon corresponds with it. The '
      + 'Empire, which does not recognize it, negotiates with it in the specific language it '
      + 'reserves for people it will not recognize. There is a succession, and everybody in '
      + 'the country knows what it is, which no Jewish polity has been able to say since the '
      + 'Hasmoneans.\n\n'
      + 'The cost is on the same page of the ledger. A crown is a thing that can be taken, and '
      + 'every enemy this state has now knows exactly which one man to take.',
    forTag: 'JUD',
    trigger: safeTrigger('ev351_what_the_crown_was_worth', (ctx) => flag(ctx, 'patriciusCrowned')
      && ctx.game.date.y >= 378 && risingSurvives(ctx)),
    maxYear: 429,
    aiOption: 0,
    historical: 'The rising\'s king, if he was one, was dead within the year in the history that '
      + 'happened, and nobody recorded his end.',
    options: [
      {
        label: 'A throne with a succession',
        tooltip: '+40 legitimacy, +1 stability, and "The Succession Known" (+0.25 legitimacy a '
          + 'month and −0.5 unrest everywhere, permanent).',
        effects: guard('ev351_what_the_crown_was_worth:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 40, stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_succession_known', name: 'The Succession Known', months: -1,
            effects: { legitimacyAdd: 0.25, unrestAll: -0.5 },
          });
          h.chronicle(ctx, 'era', 'The crown proclaimed at Diocaesarea has a succession, which is '
            + 'more than the office it replaced ever managed to guarantee.');
        }),
      },
      {
        label: 'Put the crown under the court',
        tooltip: 'A king who is judged like anybody else, which the Law says and no Jewish '
          + 'monarchy has ever done: +80 governance points and "The King Under the Law" (−0.75 '
          + 'unrest everywhere and +0.2 legitimacy a month, permanent), −6% morale.',
        effects: guard('ev351_what_the_crown_was_worth:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { gov: 80 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'king_under_the_law', name: 'The King Under the Law', months: -1,
            effects: { unrestAll: -0.75, legitimacyAdd: 0.2, moraleMult: 0.94 },
          });
          h.factionShift(ctx, 'JUD', 'schools', 20);
          h.factionShift(ctx, 'JUD', 'armed', -10);
          h.setFlag(ctx, 'crownUnderTheCourt', true);
          h.chronicle(ctx, 'era', 'The king of the Galilee is made answerable to the court, '
            + 'which the Law has required of kings since Deuteronomy and no king had yet allowed.');
        }),
      },
    ],
  },
  {
    id: 'ev351_the_captains_country',
    title: 'The Captains\' Country',
    desc: 'There was never a king, and after thirty years that has hardened into a '
      + 'constitution: the muster elects, the court of the sages confirms, and the captain of '
      + 'the year signs what the council has settled. It is cumbersome, it is slow in a war, '
      + 'and its great advantage is that there is nobody in it whose death ends the country.\n\n'
      + 'Rome has never worked out what to file this as. The chanceries want a name and a '
      + 'seal and a man; what they get is a letter from a body, and a body cannot be invited '
      + 'to Antioch and relieved of its escort at Petovio.',
    forTag: 'JUD',
    trigger: safeTrigger('ev351_the_captains_country', (ctx) => flag(ctx, 'patriciusCaptain')
      && ctx.game.date.y >= 378 && risingSurvives(ctx)),
    maxYear: 429,
    aiOption: 0,
    historical: 'Nothing like this existed. The Jewish polities of the period were a '
      + 'patriarchate and a set of communities, which is precisely why the chapter offers it.',
    options: [
      {
        label: 'Nobody whose death ends the country',
        tooltip: '+70 governance points and "No Single Neck" (−0.75 unrest everywhere and +8% '
          + 'income, permanent); −5% morale, because a council is slower than a king.',
        effects: guard('ev351_the_captains_country:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { gov: 70 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'no_single_neck', name: 'No Single Neck', months: -1,
            effects: { unrestAll: -0.75, incomeMult: 1.08, moraleMult: 0.95 },
          });
          h.chronicle(ctx, 'era', 'Thirty years without a king have produced a constitution, and '
            + 'the Empire still does not know whose name to put on the summons.');
        }),
      },
      {
        label: 'Name a captain for life and be done with the elections',
        tooltip: 'The council concedes what thirty years of war has taught it about deciding '
          + 'things in a fortnight: +30 legitimacy, "The Captain For Life" (+10% morale, +6% '
          + 'discipline and +0.2 legitimacy a month, permanent) and +0.5 unrest everywhere.',
        effects: guard('ev351_the_captains_country:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 30 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_captain_for_life', name: 'The Captain For Life', months: -1,
            effects: { moraleMult: 1.1, disciplineMult: 1.06, legitimacyAdd: 0.2, unrestAll: 0.5 },
          });
          h.factionShift(ctx, 'JUD', 'armed', 20);
          h.factionShift(ctx, 'JUD', 'schools', -15);
          h.setFlag(ctx, 'captainForLife', true);
          h.chronicle(ctx, 'era', 'The council names a captain for life, and discovers over the '
            + 'following decade what the word it refused in 351 actually meant.');
        }),
      },
    ],
  },

  // ── 18 · terminals of the Nasi fork ───────────────────────────────────────
  {
    id: 'ev351_the_house_that_chose',
    title: 'The House That Chose',
    desc: 'The patriarchate is not an imperial office any more. It cannot be: the moment it '
      + 'blessed the rising it forfeited the rank, the salary, the protection and the standing '
      + 'to write to emperors, and Constantinople has spent forty years making that formal. '
      + 'What it has instead is this state — a court that ordains, collects and rules because '
      + 'a government here enforces it, over exactly as much of the world as that government '
      + 'can reach.\n\n'
      + 'The congregations of the West are the loss and they are not a small one. What was '
      + 'gained is that the office is now answerable to Jews, which it had not been for two '
      + 'hundred years.',
    forTag: 'JUD',
    trigger: safeTrigger('ev351_the_house_that_chose', (ctx) => flag(ctx, 'nasiBlessed')
      && ctx.game.date.y >= 395 && risingSurvives(ctx)),
    maxYear: 429,
    aiOption: 0,
    historical: 'The historical patriarchate kept the rank and the salary, and was abolished by '
      + 'the emperor who paid them.',
    options: [
      {
        label: 'An office that answers to us',
        tooltip: '+50 legitimacy, the house +20, and "The Office Ours" (+0.3 legitimacy a month '
          + 'and +6% income, permanent) — the Western congregations are lost (−10% income from '
          + 'abroad, permanent).',
        effects: guard('ev351_the_house_that_chose:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 50 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_office_ours', name: 'The Office Ours', months: -1,
            effects: { legitimacyAdd: 0.3, incomeMult: 0.96 },
          });
          h.factionShift(ctx, 'JUD', 'nasi', 20);
          h.chronicle(ctx, 'era', 'The patriarchate ends its career as an imperial dignity and '
            + 'begins one as a Jewish institution, at the price of half the world it used to reach.');
        }),
      },
      {
        label: 'Buy the West back — pay for the ordinations the Empire will not carry',
        tooltip: 'The apostoloi ride again at this state\'s expense, into a legal system that '
          + 'has just outlawed them: −350 talents, +60 influence points and "The Post Restored" '
          + '(+0.2 legitimacy a month and +6% trade, permanent).',
        effects: guard('ev351_the_house_that_chose:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: -350, infl: 60 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_post_restored', name: 'The Post Restored', months: -1,
            effects: { legitimacyAdd: 0.2, tradeMult: 1.06 },
          });
          h.factionShift(ctx, 'JUD', 'nasi', 15);
          h.setFlag(ctx, 'postRestored', true);
          h.chronicle(ctx, 'era', 'The Galilee pays for its own apostoloi to ride into an empire '
            + 'that has made carrying their letters an offence.');
        }),
      },
    ],
  },
  {
    id: 'ev351_the_house_that_waited',
    title: 'The House That Waited',
    desc: 'Forty years of standing aside, and the office is exactly what it was: a rank, a '
      + 'salary, an ordination that runs from Spain to Babylonia, and an absolute refusal to '
      + 'be drawn on anything happening in the Galilee. Emperors still write to it. It still '
      + 'writes back.\n\n'
      + 'It is the most successful Jewish institution in the world and it is standing on a '
      + 'floor that belongs to somebody else. Gamaliel is the sixth of his line, the '
      + 'correspondence is as courteous as ever, and the last three rescripts about him have '
      + 'been about things he may no longer do.',
    forTag: 'JUD',
    trigger: safeTrigger('ev351_the_house_that_waited', (ctx) => flag(ctx, 'nasiStoodAside')
      && ctx.game.date.y >= 395),
    maxYear: 429,
    aiOption: 0,
    historical: 'The patriarchate survived the rising, the century, and every emperor until '
      + 'Theodosius II, who ended it by not replacing the last incumbent.',
    options: [
      {
        label: 'It survived, which was the whole plan',
        tooltip: '+40 influence points and "The Office Survives" (+8% income and +0.15 '
          + 'legitimacy a month, permanent).',
        effects: guard('ev351_the_house_that_waited:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { infl: 40 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_office_survives', name: 'The Office Survives', months: -1,
            effects: { incomeMult: 1.08, legitimacyAdd: 0.15 },
          });
          h.chronicle(ctx, 'era', 'The patriarchate has survived everything by being on nobody\'s '
            + 'side, and the rescripts about it are getting shorter.');
        }),
      },
      {
        label: 'Ask it in, now that there is a floor to stand on',
        tooltip: 'Forty years of neutrality ended by an offer the house can finally afford to '
          + 'accept: +300 talents of crown gold rerouted, the house +25, and "The House Comes '
          + 'In Late" (+10% income and +0.2 legitimacy a month, permanent). Rome\'s opinion −25.',
        effects: guard('ev351_the_house_that_waited:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: 300 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_house_comes_in_late', name: 'The House Comes In Late', months: -1,
            effects: { incomeMult: 1.1, legitimacyAdd: 0.2 },
          });
          h.factionShift(ctx, 'JUD', 'nasi', 25);
          const rom = ctx.game.tags[who(ctx, 'ROM')];
          if (rom && rom.opinion) rom.opinion.JUD = Math.max(-200, (rom.opinion.JUD || 0) - 25);
          h.setFlag(ctx, 'houseCameInLate', true);
          h.chronicle(ctx, 'era', 'The house that stood aside in 351 comes in at last, in the '
            + 'year the rescripts stop being courteous.');
        }),
      },
    ],
  },

  // ── 19 · 415 · FORK: the last Nasi ────────────────────────────────────────
  {
    id: 'ev351_the_last_nasi',
    title: 'The Rescript About Gamaliel',
    desc: 'The rescript is dated 415 and it is a masterpiece of the genre. The Patriarch '
      + 'Gamaliel is to be stripped of the honorary prefecture. He is to build no new '
      + 'synagogues and demolish those he has built. He may not judge between a Jew and a '
      + 'Christian. He may not circumcise a Christian slave, on pain of losing him and worse. '
      + 'The document is addressed to the man himself, courteously, and it takes away, item by '
      + 'item, everything the office was.\n\n'
      + 'There is no persecution here and no soldiers. There is a filing cabinet, and a '
      + 'century in which every rescript about this people has removed one more thing and '
      + 'granted nothing. When Gamaliel dies, ten years from now, the Empire will simply not '
      + 'appoint a successor, and the money the congregations of the world send to the '
      + 'Patriarch will be collected by the imperial treasury instead.',
    forTag: 'JUD',
    date: { y: 415, m: 10 },
    major: true,
    aiOption: 1,
    historical: 'Cod. Theod. XVI.8.22 (415) demoted Gamaliel VI; the patriarchate lapsed by 425 '
      + 'and the aurum coronarium was diverted to the imperial treasury in 429.',
    options: [
      {
        label: 'The office is ours to fill, and we fill it',
        tooltip: 'The succession is declared and seated by this state: +50 legitimacy, +1 '
          + 'stability, "The Office Kept" (+0.3 legitimacy a month and +8% income, permanent); '
          + 'the Empire\'s opinion −30.',
        effects: guard('ev351_the_last_nasi:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 50, stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_office_kept', name: 'The Office Kept', months: -1,
            effects: { legitimacyAdd: 0.3, incomeMult: 1.08 },
          });
          h.factionShift(ctx, 'JUD', 'nasi', 25);
          const rom = ctx.game.tags[who(ctx, 'ROM')];
          if (rom && rom.opinion) rom.opinion.JUD = Math.max(-200, (rom.opinion.JUD || 0) - 30);
          h.setFlag(ctx, 'officeKept', true);
          h.chronicle(ctx, 'era', 'The patriarchate is filled by a Jewish government instead of '
            + 'lapsing by imperial inattention, which is the difference this whole chapter is about.');
        }),
      },
      {
        label: 'Let it lapse. The country is the institution now',
        tooltip: 'The office is allowed to end and its functions pass to the courts and the '
          + 'crown: +80 governance points and "The Country Is the Institution" (−0.5 unrest '
          + 'everywhere and +10% income, permanent); the house −25.',
        effects: guard('ev351_the_last_nasi:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { gov: 80 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'country_is_the_institution', name: 'The Country Is the Institution', months: -1,
            effects: { unrestAll: -0.5, incomeMult: 1.1 },
          });
          h.factionShift(ctx, 'JUD', 'nasi', -25);
          h.setFlag(ctx, 'officeLapsed', true);
          h.chronicle(ctx, 'era', 'The patriarchate is allowed to lapse, its work divided between '
            + 'the courts and the treasury of a state that did not exist when the office was invented.');
        }),
      },
    ],
  },

  // ── 20 · 429 · terminals of the last fork ─────────────────────────────────
  {
    id: 'ev351_the_office_after_the_office',
    title: 'The Office After the Office',
    desc: 'In the year the Empire redirects the crown gold of the whole Jewish world into its '
      + 'own treasury, the congregations of this country send theirs to a Nasi seated in the '
      + 'Land by a government of Jews. The sum is smaller. The list of places it comes from is '
      + 'shorter. It arrives every year, and the man who receives it holds his office because '
      + 'this state exists and for no other reason.\n\n'
      + 'Which is either the whole point or the whole problem, and the study houses have been '
      + 'arguing about that for seventy years without either side conceding a word.',
    forTag: 'JUD',
    trigger: safeTrigger('ev351_the_office_after_the_office', (ctx) => flag(ctx, 'officeKept')
      && ctx.game.date.y >= 429),
    maxYear: 460,
    aiOption: 0,
    historical: 'In 429 the imperial treasury took over the patriarchal tax. There was no '
      + 'patriarch left to object.',
    options: [
      {
        label: 'Seated in the Land, by Jews',
        tooltip: '+60 legitimacy and "The Nasi Seated" (+0.35 legitimacy a month and −0.5 '
          + 'unrest everywhere, permanent).',
        effects: guard('ev351_the_office_after_the_office:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 60 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_nasi_seated', name: 'The Nasi Seated', months: -1,
            effects: { legitimacyAdd: 0.35, unrestAll: -0.5 },
          });
          h.chronicle(ctx, 'era', 'The Empire takes the crown gold of the Jewish world, and one '
            + 'country goes on sending its own to a Nasi it seated itself.');
        }),
      },
      {
        label: 'Spend it on the congregations the Empire just taxed',
        tooltip: 'The office keeps its title and gives away its income to the communities that '
          + 'have lost theirs: −300 talents, +45 legitimacy and "The Purse Sent Outward" (+0.25 '
          + 'legitimacy a month and +8% trade, permanent).',
        effects: guard('ev351_the_office_after_the_office:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: -300, legitimacy: 45 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_purse_sent_outward', name: 'The Purse Sent Outward', months: -1,
            effects: { legitimacyAdd: 0.25, tradeMult: 1.08 },
          });
          h.chronicle(ctx, 'era', 'The Nasi in the Land spends his collection on the '
            + 'congregations whose own has just been taken by the imperial treasury.');
        }),
      },
    ],
  },
  {
    id: 'ev351_the_courts_inherit',
    title: 'The Courts Inherit',
    desc: 'There is no Patriarch, and there has not been for a decade, and the thing everybody '
      + 'expected to follow — the collapse of ordination, of the courts, of any address at '
      + 'which the people can be reached — has not happened, because the functions were moved '
      + 'before the office fell rather than after.\n\n'
      + 'What ordains now is a court. What collects is a treasury. What answers the letters '
      + 'from Alexandria is a chancery with a seal on it, and the seal is a state\'s. It is '
      + 'less venerable than the office it replaced and considerably harder to abolish by '
      + 'rescript.',
    forTag: 'JUD',
    trigger: safeTrigger('ev351_the_courts_inherit', (ctx) => flag(ctx, 'officeLapsed')
      && ctx.game.date.y >= 429),
    maxYear: 460,
    aiOption: 0,
    historical: 'In the history that happened the functions did not move, and their loss is why '
      + 'the centre of Jewish life is in Babylonia by the sixth century.',
    options: [
      {
        label: 'Harder to abolish by rescript',
        tooltip: '+80 governance points and "The Chancery Inherits" (+10% income, −0.5 unrest '
          + 'everywhere and +0.2 legitimacy a month, permanent).',
        effects: guard('ev351_the_courts_inherit:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { gov: 80 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_chancery_inherits', name: 'The Chancery Inherits', months: -1,
            effects: { incomeMult: 1.1, unrestAll: -0.5, legitimacyAdd: 0.2 },
          });
          h.chronicle(ctx, 'era', 'The patriarchate is gone and nothing it did has stopped, '
            + 'because a state was holding all of it before the office fell.');
        }),
      },
      {
        label: 'Re-found it under a name of our own',
        tooltip: 'The functions are back in one pair of hands and the hands are this state\'s: '
          + '+40 legitimacy, the house +20, and "The Office Re-Founded" (+0.3 legitimacy a '
          + 'month and +6% income, permanent); +0.4 unrest everywhere, because a chancery that '
          + 'has just been given away does not enjoy being asked for it back.',
        effects: guard('ev351_the_courts_inherit:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 40 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_office_refounded', name: 'The Office Re-Founded', months: -1,
            effects: { legitimacyAdd: 0.3, incomeMult: 1.06, unrestAll: 0.4 },
          });
          h.factionShift(ctx, 'JUD', 'nasi', 20);
          h.chronicle(ctx, 'era', 'Four years after letting the patriarchate lapse, the state '
            + 're-founds it under a name of its own, which the chancery regards as a demotion.');
        }),
      },
    ],
  },
];
