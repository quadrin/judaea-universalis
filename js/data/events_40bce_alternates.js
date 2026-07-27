// Judaea Universalis — the two 40 BCE roads that stopped early, 31 BCE–6 CE
// (SPEC §120). Content package. Zero imports; all effects run through
// ctx.helpers at runtime. Concatenated onto EVENTS_40 by the era registry.
//
// Found the same way SPEC §118 was — by reading the branching path tree rather
// than by playing. The 40 chapter runs to 6 CE, where `ev5_provincia` deposes
// Archelaus and makes Judaea a Roman province, and the historical Herodian road
// runs all the way there. The other two do not:
//
//   The Hasmonean road. `ev5_atg_crowned` seats Antigonus in −37 and the
//   ev5_atg_* arc runs to −32. Then thirty-eight years of silence, through
//   Actium, the Augustan settlement of the East, and the entire span the
//   Herodian road fills with content. A player who beat Herod and Rome to keep
//   the Hasmonean crown got less chapter than one who lost.
//
//   The greater-Herod road. `ev5_her_leash` and `ev5_her_incense` fire at −26
//   and −25 for a Herod who has outgrown his leash — Antigonus gone, Jerusalem
//   his, and Damascus or Petra in hand — and then that road stops too. Worse
//   than stopping: `ev5_provincia` is a bare dated card with no guard at all,
//   so in 6 CE it deposes the ethnarch and annexes the province regardless.
//   A kingdom that took Damascus is handed to a prefect from Caesarea on the
//   same schedule as one that never left the hills.
//
// Both endings turn on the same fact, which is the interesting thing about the
// chapter: Rome in this period does not annex kingdoms it finds useful. It
// annexes kingdoms it finds embarrassing. Judaea became a province in 6 CE
// because Archelaus was bad at the job and his own subjects petitioned to be
// rid of him — not because Rome wanted the ground. A Hasmonean who is a
// competent Parthian-flank client, or a Herodian whose writ runs to Damascus,
// presents Rome with a very different question, and the answer to it is
// documented all over the first century: Commagene, Cappadocia, Emesa,
// Nabataea. Some were annexed. Some were not, for a hundred years, and the
// difference was almost never military.
//
// Source spine: Josephus, Antiquitates XV–XVII and Bellum I–II for the reign
// and the deposition; Dio LIV for the Augustan settlement of the East; the
// standard accounts of the client-kingdom system — Braund on Rome and the
// friendly king — for what actually determined whether a throne survived.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_40bce_alternates] ' + key, e || '');
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

function flag(ctx, key) {
  return !!(ctx.game.flags && ctx.game.flags[key]);
}

function after(ctx, y, m) {
  const d = ctx.game.date;
  return d.y > y || (d.y === y && d.m >= (m || 1));
}

function warBetween(ctx, a, b) {
  for (const w of (ctx.game && ctx.game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(a) !== -1 && all.indexOf(b) !== -1) return true;
  }
  return false;
}

function setOpinion(ctx, a, b, val) {
  const t = ctx.game.tags && ctx.game.tags[a];
  if (!t) return;
  if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
  t.opinion[b] = Math.max(-200, Math.min(200, val));
}

// The two predicates the existing chapter already uses, restated because a
// content package imports nothing.
function hasmoneanHolds(ctx) {
  const t = ctx.game.tags && ctx.game.tags.ATG;
  return flag(ctx, 'hasmoneanHolds')
    && alive(ctx, 'ATG') && !(t && t.overlord)
    && ctx.helpers.controls(ctx, 'ATG', 'Jerusalem');
}
function greaterHerod(ctx) {
  const g = ctx.game;
  if (!alive(ctx, 'HER')) return false;
  if (g.tags.HER && g.tags.HER.overlord) return false;
  if (!ctx.helpers.controls(ctx, 'HER', 'Jerusalem')) return false;
  const atg = g.tags.ATG;
  const atgGone = !atg || atg.alive === false || atg.overlord === 'HER';
  if (!atgGone) return false;
  return ctx.helpers.controls(ctx, 'HER', 'Damascus')
    || ctx.helpers.controls(ctx, 'HER', 'Petra');
}

export const EVENTS_40_ALTERNATES = [

  // ═══ THE HASMONEAN ROAD, 31 BCE – 6 CE ═══════════════════════════════════

  {
    id: 'ev5_a_after_actium',
    title: 'The Patron at the Bottom of the Sea',
    worldLabel: 'Actium leaves a Parthian-seated king with no Roman friend',
    desc: 'Antony is finished off Greece and the East belongs to a young man in Italy '
      + 'who has never been here, owes nothing to anyone in it, and is known to keep '
      + 'lists. Every throne between the Taurus and the desert is now working out what '
      + 'it can say for itself, and most of them have something: they backed the wrong '
      + 'Roman, which is forgivable, because backing a Roman at all is the behaviour of '
      + 'a client. Jerusalem cannot say that. Jerusalem was seated by Parthian cavalry '
      + 'in the year Rome\'s nominee was run out of the country, and has spent the '
      + 'decade since being visibly a kingdom rather than visibly a client. There is a '
      + 'ship at Caesarea that could be at Rhodes in eight days, and the council has '
      + 'been arguing about whether to put anybody on it since the news came.',
    forTag: 'ATG',
    major: true,
    minYear: -31,
    maxYear: -20,
    trigger: safeTrigger('ev5_a_after_actium', (ctx) =>
      after(ctx, -31, 9) && hasmoneanHolds(ctx) && !flag(ctx, 'actiumAnswered')),
    aiOption: 0,
    historical: 'Herod went to Rhodes, admitted he had been Antony\'s man, argued that a loyal friend is worth having whoever he was loyal to, and came back with his crown. Antigonus never got the chance: Antony had already beheaded him at Antioch.',
    options: [
      {
        label: 'Go to Rhodes and make Herod\'s argument without Herod',
        tooltip: 'The crown is laid on the table and the case is put plainly: a king who kept faith with one Roman will keep it with another. −150 treasury and −15 legitimacy (the priesthood watches a Hasmonean ask), but Rome\'s opinion to +50, "Confirmed at Rhodes" permanently (+8% income, −0.5 unrest everywhere), and the Parthian connection is dropped. The kingdom survives as something Rome has decided to keep.',
        effects: guard('ev5_a_after_actium:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ATG', { treasury: -150, legitimacy: -15, stability: 1 });
          h.addTagModifier(ctx, 'ATG', {
            id: 'confirmed_at_rhodes', name: 'Confirmed at Rhodes', months: -1,
            effects: { incomeMult: 1.08, unrestAll: -0.5 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', 'ATG', 50);
          if (alive(ctx, 'PAR')) setOpinion(ctx, 'PAR', 'ATG', -40);
          h.doctrine(ctx, 'alignment', 2);
          h.setFlag(ctx, 'actiumAnswered', 'rhodes');
          h.chronicle(ctx, 'era', 'A Hasmonean king goes to Rhodes and makes the argument Herod made in the other history: the crown is laid down and picked up again, and the Parthian friendship is quietly not mentioned.');
        }),
      },
      {
        label: 'Send nobody. The crown was not Rome\'s to confirm',
        tooltip: 'No embassy: +25 legitimacy, +2 zeal, the Parthian alliance holds (+30 with Ctesiphon and 6,000 manpower from the eastern levies) — and Rome\'s opinion to −60 with "On the List" permanently (+0.5 unrest in border provinces, −4% income as the coastal trade prices in a frontier). Rome does not move this year. Rome is not in a hurry, and it keeps lists.',
        effects: guard('ev5_a_after_actium:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ATG', { legitimacy: 25, manpower: 6000 });
          h.addTagModifier(ctx, 'ATG', {
            id: 'on_the_list', name: 'On the List', months: -1,
            effects: { unrestAll: 0.5, incomeMult: 0.96 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', 'ATG', -60);
          if (alive(ctx, 'PAR')) setOpinion(ctx, 'PAR', 'ATG', 30);
          h.doctrine(ctx, 'zeal', 2);
          h.setFlag(ctx, 'actiumAnswered', 'refused');
          h.chronicle(ctx, 'era', 'No embassy sails for Rhodes. The Hasmonean crown was not Rome\'s to confirm, and the young man in Italy adds a line to a list he is in no hurry to act on.');
        }),
      },
    ],
  },

  {
    id: 'ev5_a_the_settlement_of_the_east',
    title: 'The Settlement of the East',
    worldLabel: 'Augustus files every throne between the Taurus and the desert',
    desc: 'Augustus comes east and does the thing he is actually good at, which is not '
      + 'war: he sits down with a list of kingdoms and decides, one at a time, which '
      + 'continue and on what terms. Commagene continues. Cappadocia continues. Emesa '
      + 'continues, under a house nobody outside Syria has heard of, because it is '
      + 'cheap and it works. Some do not continue, and the pattern in the ones that do '
      + 'not is not military at all — nobody is annexed for being strong. They are '
      + 'annexed for being embarrassing: for petitions from their own subjects, for '
      + 'succession quarrels that spill into the next province, for being unable to '
      + 'collect a road tax without a legion. The question the clerks put to Jerusalem '
      + 'is therefore very boring and entirely decisive. What is the yield, who '
      + 'complains, and how often.',
    forTag: 'ATG',
    major: true,
    minYear: -20,
    maxYear: -4,
    trigger: safeTrigger('ev5_a_the_settlement_of_the_east', (ctx) =>
      after(ctx, -20, 4) && hasmoneanHolds(ctx) && flag(ctx, 'actiumAnswered')
      && !flag(ctx, 'easternSettlement')),
    aiOption: 0,
    historical: 'Judaea was Herod\'s and Herod was very good at exactly this: the yield was high, the complaints went to him rather than past him, and Augustus left him alone for thirty years.',
    options: [
      {
        label: 'Answer the clerks: audited books, and nobody petitions past us',
        tooltip: 'The dull answer, which is the winning one: −200 treasury on the survey and the roads, but "A Kingdom That Files Its Returns" permanently (+14% income, −0.75 unrest everywhere), +1 stability, and Rome\'s opinion +30. A throne that is administratively boring is a throne nobody in Italy has a reason to think about, which is the whole art of surviving this century.',
        effects: guard('ev5_a_the_settlement_of_the_east:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ATG', { treasury: -200, stability: 1 });
          h.addTagModifier(ctx, 'ATG', {
            id: 'files_its_returns', name: 'A Kingdom That Files Its Returns', months: -1,
            effects: { incomeMult: 1.14, unrestAll: -0.75 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', 'ATG', 30);
          h.doctrine(ctx, 'authority', 1);
          h.setFlag(ctx, 'easternSettlement', 'filed');
          h.chronicle(ctx, 'era', 'Jerusalem answers the Augustan clerks with audited books and a road survey; a throne that is administratively boring is one nobody in Italy has a reason to think about.');
        }),
      },
      {
        label: 'Answer that a kingdom is not a province with a king on it',
        tooltip: 'The proud answer: +20 legitimacy, +2 authority, +6% morale permanently — and the file stays open. Rome\'s opinion −35, "The File Stays Open" permanently (+0.5 unrest everywhere), and every later Roman question about this kingdom starts from a worse page than it needed to. Dignity is real and it is not free.',
        effects: guard('ev5_a_the_settlement_of_the_east:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ATG', { legitimacy: 20 });
          h.addTagModifier(ctx, 'ATG', {
            id: 'the_file_stays_open', name: 'The File Stays Open', months: -1,
            effects: { moraleMult: 1.06, unrestAll: 0.5 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', 'ATG', -35);
          h.doctrine(ctx, 'authority', 2);
          h.setFlag(ctx, 'easternSettlement', 'refused');
          h.chronicle(ctx, 'era', 'Jerusalem tells the Augustan commission that a kingdom is not a province with a king on it. The commission writes that down, which is the problem with saying it.');
        }),
      },
    ],
  },

  {
    id: 'ev5_a_not_a_province',
    title: 'The Year It Did Not Become a Province',
    worldLabel: 'Judaea is not annexed',
    desc: 'This is the year, in the history that did not happen here, when the '
      + 'Herodian ethnarch was deposed on the petition of his own subjects, the '
      + 'kingdom was made a province of the third rank, a prefect arrived from '
      + 'Caesarea, and a census was taken that started a war forty years early and a '
      + 'philosophy that never afterwards went away. None of that happens. The reason '
      + 'is not that Rome is weaker or the kingdom stronger. It is that Rome annexes '
      + 'thrones it finds embarrassing rather than thrones it finds inconvenient, and '
      + 'nobody has come to Rome about this one — no delegation of notables asking to '
      + 'be governed by Syria instead, no succession fought out in front of a Roman '
      + 'court, no road tax uncollectable without a legion. The clerks file the year '
      + 'and close it. It is the least dramatic thing that could possibly happen and '
      + 'it is the whole of the difference.',
    forTag: 'both',
    decider: 'ATG',
    date: { y: 6, m: 6 },
    world: true,
    major: true,
    // Same rule: the road was entered when Antigonus was crowned, and this card
    // closes it. Requiring the full live predicate again would let a single
    // month without Jerusalem retire the chapter's ending.
    when: safeTrigger('ev5_a_not_a_province:when', (ctx) => {
      const t = ctx.game.tags && ctx.game.tags.ATG;
      return flag(ctx, 'hasmoneanHolds')
        && !!t && t.alive !== false && !t.overlord;
    }),
    aiOption: 0,
    historical: 'Archelaus was deposed in 6 CE and Judaea became a province; Coponius came from Caesarea and Quirinius took the census.',
    options: [
      {
        label: 'Close the year, and let the clerks find nothing to write',
        tooltip: 'The chapter ends with the crown intact: +25 legitimacy, +1 stability, and "No Prefect Came" permanently (+10% income, −1 unrest everywhere). If the books were filed in −20 the settlement holds firmly (a further −0.5 unrest); if the commission was refused, the kingdom keeps its throne and its open file, and the next century will be conducted on those terms.',
        effects: guard('ev5_a_not_a_province:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ATG', { legitimacy: 25, stability: 1 });
          h.addTagModifier(ctx, 'ATG', {
            id: 'no_prefect_came', name: 'No Prefect Came', months: -1,
            effects: { incomeMult: 1.1, unrestAll: flag(ctx, 'easternSettlement') === 'filed' ? -1.5 : -1 },
          });
          if (alive(ctx, 'ROM')) {
            setOpinion(ctx, 'ROM', 'ATG',
              flag(ctx, 'easternSettlement') === 'filed' ? 45 : -25);
          }
          h.setFlag(ctx, 'notAProvince', true);
          h.chronicle(ctx, 'era', flag(ctx, 'easternSettlement') === 'filed'
            ? 'The year 6 passes with no prefect, no census and no philosophy: the kingdom files its returns and the clerks in Antioch find nothing to write down.'
            : 'The year 6 passes and no prefect comes — not because Rome approves of this kingdom, but because it has not yet been given a reason to do anything about it.');
        }),
      },
    ],
  },

  // ═══ THE GREATER-HEROD ROAD, 20 BCE – 6 CE ═══════════════════════════════

  {
    id: 'ev5_h_too_large_to_be_a_favour',
    title: 'Too Large to Be a Favour',
    worldLabel: 'A client kingdom that has outgrown the word',
    desc: 'The arrangement was always a favour. Rome named a man king of a small '
      + 'awkward country nobody else wanted to garrison, and he was grateful in the '
      + 'particular way of someone who knows exactly what he is worth and to whom. '
      + 'That arrangement assumed a certain size. A kingdom holding Jerusalem and '
      + 'Damascus, or Jerusalem and Petra, is not a favour any more — it is the '
      + 'largest thing between the province of Syria and the desert, it controls a '
      + 'road the legions use, and its king is now somebody the governor of Syria has '
      + 'to write to rather than send for. Nobody has done anything wrong. That is '
      + 'what makes it difficult: there is no complaint to answer, only a shape on a '
      + 'map that has stopped fitting the word being used for it.',
    forTag: 'HER',
    major: true,
    minYear: -20,
    maxYear: -4,
    trigger: safeTrigger('ev5_h_too_large_to_be_a_favour', (ctx) =>
      after(ctx, -20, 4) && greaterHerod(ctx) && !flag(ctx, 'largerThanTheFavour')),
    aiOption: 0,
    historical: 'Herod never held Damascus or Petra, and the word "client" fitted him until he died.',
    options: [
      {
        label: 'Make the size useful: garrison the road and bill nobody',
        tooltip: 'The kingdom polices the desert road at its own expense and Rome notices what that saves: −250 treasury and −4% income permanently, but Rome\'s opinion to +60 and "The Road Is Kept" permanently (−1 unrest everywhere, +1 stability). Being indispensable is the only defence a client kingdom has ever had, and it is bought rather than argued.',
        effects: guard('ev5_h_too_large_to_be_a_favour:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HER', { treasury: -250, stability: 1 });
          h.addTagModifier(ctx, 'HER', {
            id: 'the_road_is_kept', name: 'The Road Is Kept', months: -1,
            effects: { incomeMult: 0.96, unrestAll: -1 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', 'HER', 60);
          h.setFlag(ctx, 'largerThanTheFavour', 'useful');
          h.chronicle(ctx, 'era', 'The kingdom garrisons the desert road at its own expense and sends Syria no bill; being indispensable is the only defence a client has ever had.');
        }),
      },
      {
        label: 'Use the size: a court, a coinage, and letters signed as an equal',
        tooltip: 'The kingdom starts behaving like what it is: +30 legitimacy, +2 authority, "A Court of Its Own" permanently (+12% income, +6% morale) — and Rome\'s opinion to −50, because the one thing the arrangement never permitted was noticing out loud that it had changed. A throne that looks like a rival is a throne with a file, and the file is now open.',
        effects: guard('ev5_h_too_large_to_be_a_favour:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HER', { legitimacy: 30 });
          h.addTagModifier(ctx, 'HER', {
            id: 'a_court_of_its_own', name: 'A Court of Its Own', months: -1,
            effects: { incomeMult: 1.12, moraleMult: 1.06 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', 'HER', -50);
          h.doctrine(ctx, 'authority', 2);
          h.setFlag(ctx, 'largerThanTheFavour', 'equal');
          h.chronicle(ctx, 'era', 'The kingdom mints its own coin, keeps its own court and signs its letters as an equal — and the one thing the old arrangement never permitted was saying out loud that it had changed.');
        }),
      },
    ],
  },

  {
    id: 'ev5_h_no_prefect_for_this_one',
    title: 'No Prefect for This One',
    worldLabel: 'The kingdom is not reduced to a province',
    desc: 'In the history that did not happen here the ethnarch was deposed this year '
      + 'and the country went to a prefect of the third rank, because it was small, '
      + 'because its own notables had asked, and because nobody in Italy could think '
      + 'of a reason to keep it. None of those three is true now. The kingdom is not '
      + 'small: it runs from the Jordan to the desert road and its revenues appear in '
      + 'the Syrian accounts as a line rather than a footnote. Its notables have not '
      + 'petitioned, having noticed that the alternative to this king is a procurator '
      + 'with no interest in their harvest. And the reason to keep it is written in '
      + 'every governor\'s dispatch from the last twenty years: the alternative is two '
      + 'more legions on that frontier, and there are not two more legions.',
    forTag: 'both',
    decider: 'HER',
    date: { y: 6, m: 7 },
    world: true,
    major: true,
    // SPEC §119, the rule that the first road entered IS the road. The terminal
    // must not re-run the geography test that opened the road twenty-six years
    // earlier: a kingdom can lose Petra in 12 BCE and still be the kingdom this
    // card is about, and `when` retires rather than waits, so one bad tick would
    // delete the ending. The flag is the road; the tag being alive and its own
    // master is all that still has to be true.
    when: safeTrigger('ev5_h_no_prefect_for_this_one:when', (ctx) => {
      const t = ctx.game.tags && ctx.game.tags.HER;
      return flag(ctx, 'largerThanTheFavour')
        && !!t && t.alive !== false && !t.overlord;
    }),
    aiOption: 0,
    historical: 'Archelaus was deposed and Judaea became a province, on a petition from its own leading men.',
    options: [
      {
        label: 'The kingdom continues, and the century is conducted on its terms',
        tooltip: 'The chapter closes with the crown: +25 legitimacy, +1 stability, and "Not Reduced" permanently (+12% income, −1 unrest everywhere). A kingdom that made itself useful keeps Rome\'s goodwill with it (+40 opinion, a further −0.5 unrest); one that made itself an equal keeps the throne and the open file, and will be conducting the next hundred years from there.',
        effects: guard('ev5_h_no_prefect_for_this_one:0', (ctx) => {
          const h = ctx.helpers;
          const useful = flag(ctx, 'largerThanTheFavour') === 'useful';
          h.adjust(ctx, 'HER', { legitimacy: 25, stability: 1 });
          h.addTagModifier(ctx, 'HER', {
            id: 'not_reduced', name: 'Not Reduced', months: -1,
            effects: { incomeMult: 1.12, unrestAll: useful ? -1.5 : -1 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', 'HER', useful ? 40 : -30);
          h.setFlag(ctx, 'notReduced', true);
          h.chronicle(ctx, 'era', useful
            ? 'No prefect is sent: the kingdom polices a frontier Rome would otherwise need two legions for, and everyone in Antioch can do that arithmetic.'
            : 'No prefect is sent, and not out of affection: the kingdom is too large to reduce cheaply and everyone concerned has decided to find out later.');
        }),
      },
    ],
  },
];
