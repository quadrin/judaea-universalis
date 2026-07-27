// Judaea Universalis — the question that came back, 1967–2000. Content package.
// Zero imports; concatenated onto EVENTS_1948 by the registry.
//
// This package is the 1948 chapter's version of the rung the other four just
// got, and it needs a note the others did not, because the period is live.
//
// The rung in every other chapter is the same shape: a Jewish state gets larger
// than the institutions it was built out of, and has to decide what it is in
// relation to the people it now governs who are not of it. In 167 that card is
// `ev_law_of_the_nations` and it fires when the realm passes fifteen provinces
// with a gentile majority — the Law as a wall or the Law as a gate. It is the
// oldest live question in this game and the 1948 chapter is the one place where
// it is not history.
//
// So the design rule here is stricter than elsewhere. The card presents the
// positions as their own advocates state them, with mechanical costs and no
// authorial verdict; the `historical:` line reports what was actually argued
// and by whom, without adjudicating; and there is no option the game rewards
// for being correct. A player who wants the game to agree with them will not
// find it doing so. That is deliberate and it is the same standard the rest of
// the codebase applies to Pompey and to the Temple — the difference is only
// that this one is still going on.
//
// TRIGGERS. Bands and conditions. `mar` and `gov` gate here: a general and a
// negotiator do not reach the same question by the same road.

const _warned = new Set();
function warnOnce(k, e) { if (_warned.has(k)) return; _warned.add(k); console.warn('[events_1948_question] ' + k, e || ''); }
function guard(k, fn) { return function (ctx) { try { fn(ctx); } catch (e) { warnOnce('effects:' + k, e); } }; }
function safeTrigger(k, fn) { return function (ctx) { try { return !!fn(ctx); } catch (e) { warnOnce('trigger:' + k, e); return false; } }; }

function alive(ctx, tag) { const t = ctx.game.tags && ctx.game.tags[tag]; return !!(t && t.alive !== false); }
function flag(ctx, k) { return !!(ctx.game.flags && ctx.game.flags[k]); }
function rulerAt(ctx, tag, key, min) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  const r = t && t.ruler;
  return !!r && Number(r[key] || 0) >= min;
}

function sovereign(ctx) {
  if (!alive(ctx, 'ISR')) return false;
  const t = ctx.game.tags.ISR;
  return !(t && t.overlord);
}

// Reach, and the share of the realm that is not of the state's own community —
// the same measure `ev_law_of_the_nations` takes in 130 BCE.
function reach(ctx) {
  if (!sovereign(ctx)) return 0;
  const n = ctx.helpers.countControlled(ctx, 'ISR', {});
  if (n >= 18) return 2;
  if (n >= 13) return 1;
  return 0;
}
function otherShare(ctx) {
  const h = ctx.helpers;
  const all = h.countControlled(ctx, 'ISR', {});
  if (!all) return 0;
  return (all - h.countControlled(ctx, 'ISR', { religion: 'judaism' })) / all;
}

// The ground beyond the armistice lines, in the cells the chapter already
// names for it (events_1948.js draws the same three sets for the Sinai
// withdrawal), repeated here rather than imported so this package keeps the
// zero-import property its header promises.
const HILL_COUNTRY = ['Neapolis', 'Hebron', 'Jenin', 'Ramallah', 'Bethlehem', 'Jericho', 'Tulkarm', 'Qalqilya'];
const GAZA_STRIP = ['Gaza', 'Khan Yunis', 'Rafah'];
const SINAI_CELLS = ['Rhinocolura', 'Pelusium', 'Sinai Interior', 'Kadesh Barnea', 'Dizahab'];

function opinionDelta(ctx, a, b, delta) {
  const t = ctx.game.tags && ctx.game.tags[a];
  if (!t) return;
  t.opinion = t.opinion || {};
  t.opinion[b] = Math.max(-200, Math.min(200, Number(t.opinion[b] || 0) + delta));
}

// The standing of the state with the courts this chapter actually models.
// There is no "world opinion" number in the engine and inventing one here
// would be a second source of truth for something the region already says.
function regionalOpinion(ctx, delta) {
  for (const tag of ['EGY', 'JOR', 'SYR', 'LEB', 'IRQ', 'SAU', 'TUR', 'IRN', 'UK']) {
    if (alive(ctx, tag)) opinionDelta(ctx, tag, 'ISR', delta);
  }
}

// Hand back what the state holds beyond the line, to whoever administered it
// before 1967 — and only that. The Golan is not on the list: the card's
// argument is a frontier the standing army can hold, and that is the piece
// the general staff has never said it could give up. Returns what moved.
function withdrawToTheLine(ctx) {
  const h = ctx.helpers;
  let n = 0;
  const give = (names, to) => {
    if (!alive(ctx, to)) return;
    for (const name of names) {
      let p = null;
      try { p = ctx.prov(name); } catch (e) { warnOnce('withdraw:' + name, e); continue; }
      if (!p || p.impassable || p.owner !== 'ISR') continue;
      h.changeOwner(ctx, name, to);
      n++;
    }
  };
  give(HILL_COUNTRY, 'JOR');
  give(GAZA_STRIP, 'EGY');
  give(SINAI_CELLS, 'EGY');
  return n;
}

export const EVENTS_1948_QUESTION = [

  {
    id: 'ev_z_the_question_that_came_back',
    title: 'The Oldest Question in the File',
    desc: 'The cabinet secretary has circulated a paper that is causing trouble because '
      + 'nobody can find anything wrong with it. The state now administers territory '
      + 'containing a large population that holds no citizenship in it and is not going '
      + 'anywhere. Every arrangement currently in force was designed as temporary and '
      + 'several of them are older than the officials administering them. The paper makes '
      + 'no recommendation. It observes only that there are a limited number of stable '
      + 'answers to this, that every one of them costs something the government has so far '
      + 'declined to pay, and that the cost of not choosing compounds annually. An adviser '
      + 'with a classical education has pointed out that a Jewish state asked itself a '
      + 'structurally identical question in the reign of Alexander Jannaeus and split into '
      + 'two parties over it that were still fighting when Pompey arrived. Nobody found '
      + 'this helpful.',
    forTag: 'ISR',
    major: true,
    minYear: 1968,
    maxYear: 1995,
    trigger: safeTrigger('ev_z_the_question_that_came_back', (ctx) => {
      if (reach(ctx) < 1 || flag(ctx, 'questionAnswered')) return false;
      if (otherShare(ctx) < 0.30) return false;
      return rulerAt(ctx, 'ISR', 'gov', 4) || rulerAt(ctx, 'ISR', 'infl', 4);
    }),
    aiOption: 2,
    historical: 'All three positions below were argued in Israeli politics from 1967 onward — full annexation with citizenship, territorial withdrawal in exchange for recognition, and indefinite administration — by parties that won elections on each. None was adopted outright.',
    options: [
      {
        label: 'One state, one citizenship: annex, and enfranchise everyone in it',
        tooltip: 'The territory becomes the state and its residents become voters. +4 stability and no further occupation costs (−2 unrest everywhere, permanent); +15 opinion with every court in the region. The electorate is transformed and the coalition that governs on this basis is not the one that took office: Coalition −40, Revisionists −25, and the state\'s founding demographic premise is now an open question rather than an assumption.',
        effects: guard('ev_z_question:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ISR', { stability: 4 });
          h.addTagModifier(ctx, 'ISR', { id: 'one_citizenship', name: 'One Citizenship', months: 360, effects: { unrestAll: -2, incomeMult: 1.05 } });
          h.factionShift(ctx, 'ISR', 'coalition', -40);
          h.factionShift(ctx, 'ISR', 'revisionists', -25);
          h.doctrine(ctx, 'zeal', -3);
          h.doctrine(ctx, 'authority', -1);
          regionalOpinion(ctx, 15);
          h.setFlag(ctx, 'questionAnswered', true);
          h.setFlag(ctx, 'oneCitizenship', true);
          h.chronicle(ctx, 'era', 'The state extends citizenship to everyone it governs. The register of voters is republished and is not the register the founders drew up.');
        }),
      },
      {
        label: 'Two states: withdraw to a defensible line and trade the rest for recognition',
        tooltip: 'Territory exchanged for settled borders. The hill country goes back to Jordan and Gaza and the Sinai to Egypt, and letters of recognition are exchanged with whoever takes them: +25 opinion with every court in the region, +3 stability, −2 unrest everywhere, +8% income from a frontier that no longer has to be held in depth, and the line shortens to something the standing army can hold. Revisionists −45, Kibbutzim −20, and the withdrawal is irreversible whether or not the recognition holds.',
        effects: guard('ev_z_question:1', (ctx) => {
          const h = ctx.helpers;
          const released = withdrawToTheLine(ctx);
          h.adjust(ctx, 'ISR', { stability: 3 });
          h.addTagModifier(ctx, 'ISR', { id: 'the_settled_line', name: 'The Settled Line', months: 360, effects: { unrestAll: -2, incomeMult: 1.08 } });
          h.factionShift(ctx, 'ISR', 'revisionists', -45);
          h.factionShift(ctx, 'ISR', 'kibbutzim', -20);
          h.factionShift(ctx, 'ISR', 'coalition', 20);
          h.doctrine(ctx, 'conquest', -3);
          regionalOpinion(ctx, 25);
          // The other half of the trade. Recognition is the thing being bought
          // and the engine already knows how to exchange the letters (SPEC §96):
          // it ends the bilateral war, floors the opinion and retires the
          // rivalry. A court that will not take the ground is not offered them.
          for (const tag of ['JOR', 'EGY']) {
            if (alive(ctx, tag)) { try { h.recognize(ctx, 'ISR', tag); } catch (e) { warnOnce('recognize:' + tag, e); } }
          }
          h.setFlag(ctx, 'questionAnswered', true);
          h.setFlag(ctx, 'theSettledLine', true);
          h.chronicle(ctx, 'era', released
            ? 'The government trades territory for recognised borders: ' + released + ' districts change hands and the letters are exchanged. The line is drawn where the army says it can be held and where the cabinet says it can be defended in public.'
            : 'The government settles its borders where they already run. There is nothing beyond the line to give back, and the letters are exchanged on that basis.');
        }),
      },
      {
        label: 'Neither yet: administer, and leave the status to be settled later',
        tooltip: 'The arrangement in force continues and is not called permanent. No stability change and no diplomatic cost now; the administration bill runs at −10% income and +1 unrest everywhere, rising every decade it is not resolved (360 months). Revisionists +25. Every option above remains open and gets more expensive.',
        effects: guard('ev_z_question:2', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'ISR', { id: 'to_be_settled_later', name: 'To Be Settled Later', months: 360, effects: { incomeMult: 0.90, unrestAll: 1 } });
          h.factionShift(ctx, 'ISR', 'revisionists', 25);
          h.factionShift(ctx, 'ISR', 'coalition', -10);
          h.setFlag(ctx, 'questionAnswered', true);
          h.setFlag(ctx, 'settledLater', true);
          h.chronicle(ctx, 'ruler', 'The cabinet declines to decide. The paper is filed, the arrangements continue, and the officials administering them begin to retire.');
        }),
      },
    ],
  },

  {
    id: 'ev_z_the_length_of_the_line',
    title: 'The Length of the Line',
    desc: 'The general staff has costed the frontier properly for the first time since '
      + 'it moved, and the number is not a number about equipment. A line this long needs '
      + 'a standing establishment that a country of this size can only produce by keeping '
      + 'a large part of its working population in uniform for a large part of their '
      + 'working lives, and the economists have arrived at the meeting with their own '
      + 'paper about what that does to an economy over thirty years. The soldiers do not '
      + 'dispute the economics. They observe only that the line is where it is, that '
      + 'nobody in the room chose most of it, and that shortening it is a political act '
      + 'they are not authorised to perform.',
    forTag: 'ISR',
    major: true,
    minYear: 1970,
    maxYear: 1998,
    trigger: safeTrigger('ev_z_the_length_of_the_line', (ctx) => {
      if (reach(ctx) < 2 || flag(ctx, 'lineAnswered')) return false;
      return rulerAt(ctx, 'ISR', 'mar', 4) || rulerAt(ctx, 'ISR', 'age', 62);
    }),
    aiOption: 0,
    options: [
      {
        label: 'Pay for the line. Mobilise the reserves properly and fund it',
        tooltip: '+20% manpower and +8% discipline (240 months) and the frontier is genuinely held — paid for out of the civilian economy: −15% income, −1 stability, +2 conquest. Kibbutzim +20, Coalition −15.',
        effects: guard('ev_z_line:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'ISR', { id: 'the_nation_in_uniform', name: 'The Nation in Uniform', months: 240, effects: { manpowerMult: 1.20, disciplineMult: 1.08, incomeMult: 0.85 } });
          h.adjust(ctx, 'ISR', { stability: -1 });
          h.factionShift(ctx, 'ISR', 'kibbutzim', 20);
          h.factionShift(ctx, 'ISR', 'coalition', -15);
          h.doctrine(ctx, 'conquest', 2);
          h.setFlag(ctx, 'lineAnswered', true);
          h.setFlag(ctx, 'paidForTheLine', true);
          h.chronicle(ctx, 'ruler', 'The reserves are put on a permanent footing. The economists are thanked for their paper and the paper is filed.');
        }),
      },
      {
        label: 'Buy the line instead: technology, barriers and early warning',
        tooltip: 'Capital substituted for manpower. +12% discipline and +10% reinforcement at a third of the manpower cost (240 months), +10% income relative to mobilisation — and a frontier that works against armies and not against anything smaller. +1 unrest in every province beyond the line.',
        effects: guard('ev_z_line:1', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'ISR', { id: 'the_bought_frontier', name: 'The Bought Frontier', months: 240, effects: { disciplineMult: 1.12, reinforceMult: 1.10, unrestAll: 1 } });
          h.factionShift(ctx, 'ISR', 'coalition', 15);
          h.doctrine(ctx, 'conquest', -1);
          h.setFlag(ctx, 'lineAnswered', true);
          h.setFlag(ctx, 'boughtTheFrontier', true);
          h.chronicle(ctx, 'era', 'The state buys its frontier rather than manning it. The line holds against everything it was designed against.');
        }),
      },
    ],
  },

  {
    id: 'ev_z_what_the_century_asked',
    title: 'What the Century Asked',
    desc: 'A historian at the university has published an essay pointing out that this '
      + 'state is now older than the Hasmonean kingdom was when Pompey arrived, and that '
      + 'the two of them spent their middle decades on the same argument: what a Jewish '
      + 'state owes the people inside it who are not Jews, and what it becomes depending '
      + 'on the answer. The essay is careful to say that the parallel proves nothing. '
      + 'It has been read anyway, by people on every side of the question, each of whom '
      + 'has found in it what they went in with.',
    forTag: 'ISR',
    world: true,
    major: true,
    date: { y: 2000, m: 1 },
    when: (ctx) => sovereign(ctx) && reach(ctx) >= 1,
    aiOption: 0,
    options: [
      {
        label: 'Let the record stand as it is',
        tooltip: 'The century closes with the question answered, deferred, or still being argued — whichever the campaign actually did.',
        effects: guard('ev_z_century:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ISR', { legitimacy: 6 });
          const line = flag(ctx, 'oneCitizenship')
            ? 'The century closes with one state and one citizenship, and an argument about what the state is for that is now conducted between voters rather than across a line.'
            : flag(ctx, 'theSettledLine')
              ? 'The century closes with two states and a border, and an argument about whether the border was worth what was paid for it.'
              : 'The century closes with the arrangements still called temporary, administered now by the second generation of officials to inherit them.';
          h.chronicle(ctx, 'era', line);
          h.setFlag(ctx, 'centuryClosed', true);
        }),
      },
    ],
  },

];
