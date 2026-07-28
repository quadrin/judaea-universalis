// Judaea Universalis — the settlement after the victory, 71–135 CE.
// Content package. Zero imports; concatenated onto EVENTS_66 by the registry.
//
// The chapter's success road ends the war and asks what KIND of state Judaea
// becomes — altar, chamber, or useful kingdom — and that question is about
// character. This is the other one, and it is about the constitution, because
// a victory in 70 would not have settled anything.
//
// It did not settle anything DURING the war. The priestly aristocracy under
// Ananus ben Ananus formed a provisional government in 66; in the winter of
// 67–68 the Zealots and their Idumean allies killed him and took the city.
// Two governments in eighteen months, in sequence rather than in competition,
// and the second one was still there when Titus arrived. A Judaea that wins
// has the same three parties inside the same walls with Rome no longer
// available as the thing they all agree about.
//
// FOUR SETTLEMENTS, and every one of them is something somebody in Jerusalem
// actually did or actually argued for between 66 and 70:
//
//   THE TEMPLE-STATE. High Priest, Sanhedrin, the constitution Judaea had
//   under Persia and the Ptolemies and for most of the Hasmonean century. The
//   only one of the four with a working precedent, and the precedent is the
//   argument for it. It also hands the country back to the four priestly
//   houses — Boethus, Hanin, Kathros, Ishmael ben Phiabi — whom Pesachim 57a
//   curses by name, in a baraita that is remembered because everybody agreed
//   with it.
//
//   THE LOTTERY. The Zealots did this in 67, and drew Phanni ben Samuel of
//   Aphtia, a stonecutter, who had to be taught what the duties were. Josephus
//   is incandescent and calls it the abrogation of the law. Read the other
//   way, it is a principle with a text behind it: the office belongs to God's
//   choice and not to four families' arithmetic, and the lot is how Israel
//   asked God before there were dynasties. It ends hereditary priestly power
//   in an afternoon.
//
//   THE JUBILEE. Simon bar Giora proclaimed liberty for slaves; the Sicarii
//   burned the debt archives in 66, which Josephus says was the point of
//   taking the Record Office at all. Both are Leviticus 25, a law that had
//   fallen out of use precisely because it is unusable. A state that actually
//   enforces it obeys the Torah and destroys its own credit system in the same
//   act, and the men who lose by it are the men who funded the war.
//
//   NO RULER BUT GOD. The doctrine of Judas the Galilean, held for sixty years
//   and never once implemented: tribute is idolatry, the census is idolatry,
//   and no human sovereign is legitimate. This is not a religious monarchy —
//   it is the refusal of monarchy, and its own people enforced it. When
//   Menahem came into the Temple in royal dress, the followers of Eleazar ben
//   Ananias killed him for it.
//
// WHICH ARE OFFERED depends on who is strong when the war ends, which is the
// point: the settlement is not chosen from a menu, it is produced by a room.
// The temple-state is always available because exhausted elites reach for the
// last working arrangement; the other three need a party behind them.
//
// The settlement is stored ONCE, by name, under `constitutions['66ce']`,
// rather than as four booleans (SPEC §130) — it has sixty years of content to
// steer, including content nobody has written yet.
//
// Source spine: Josephus, BJ II.409–456 (Eleazar, the sacrifice, Menahem),
// IV.147–157 (the lottery and Phanni), IV.314–325 (Ananus killed), IV.508 and
// 534 (Simon bar Giora and the proclamation of liberty), II.427 (the Record
// Office); b.Pesachim 57a for the four houses; Leviticus 25; Ant. XVIII.4–10
// for Judas the Galilean.

const _warned = new Set();
function warnOnce(k, e) { if (_warned.has(k)) return; _warned.add(k); console.warn('[events_66ce_settlement] ' + k, e || ''); }
function guard(k, fn) { return function (ctx) { try { fn(ctx); } catch (e) { warnOnce('effects:' + k, e); } }; }
function safeTrigger(k, fn) { return function (ctx) { try { return !!fn(ctx); } catch (e) { warnOnce('trigger:' + k, e); return false; } }; }
function safeWhen(k, fn) { return function (ctx) { try { return !!fn(ctx); } catch (e) { warnOnce('when:' + k, e); return false; } }; }

function alive(ctx, tag) { const t = ctx.game.tags && ctx.game.tags[tag]; return !!(t && t.alive !== false); }
function flag(ctx, k) { return !!(ctx.game.flags && ctx.game.flags[k]); }
function holds(ctx, tag, name) {
  try { const p = ctx.prov(name); return !!p && !p.impassable && p.owner === tag && p.controller === tag; }
  catch (e) { warnOnce('holds', e); return false; }
}
function atWarWithAnyone(ctx) {
  const t = ctx.game.tags && ctx.game.tags.JUD;
  if (!t) return false;
  return (t.atWarWith || []).some((e) => ctx.game.tags[e] && ctx.game.tags[e].alive !== false);
}

// Sovereign with the House standing — the chapter's own victory condition.
function standing(ctx) {
  if (!alive(ctx, 'JUD')) return false;
  const t = ctx.game.tags.JUD;
  return !(t && t.overlord) && holds(ctx, 'JUD', 'Jerusalem') && flag(ctx, 'secondKingdom');
}

// The court, read rather than pushed (SPEC §130). Null where no court sits, so
// an AI-run Judaea takes the settlement that needs nobody behind it.
function party(ctx, id) { return ctx.helpers.faction(ctx, 'JUD', id); }
function partyAt(ctx, id, min) { return ctx.helpers.factionAtLeast(ctx, 'JUD', id, min); }
function partyUnder(ctx, id, max) {
  const v = party(ctx, id);
  return Number.isFinite(v) && v < max;
}

const ERA = '66ce';
function settlement(ctx) { return ctx.helpers.constitutionOf(ctx, ERA); }

// Adopt one, once. The flag is kept beside the stored value for the older
// cards and the path tree, which read flags; the stored value is what new
// content should ask.
function adopt(ctx, name) {
  const h = ctx.helpers;
  h.setConstitution(ctx, ERA, name);
  h.setFlag(ctx, 'settlementChosen', true);
}

export const EVENTS_66_SETTLEMENT = [

  {
    id: 'ev_s_the_second_government',
    title: 'The Second Government',
    desc: 'The war is over and the provisional government is still, on paper, '
      + 'provisional. It was formed in the first autumn by the men who had spent the '
      + 'spring trying to prevent the war, and it lasted eighteen months before the '
      + 'Zealots and the Idumeans came through the gates in the snow and killed Ananus '
      + 'and left him unburied, which is the single act everyone in this room has '
      + 'agreed not to raise. There is now no Roman army. That was the last thing all '
      + 'three parties had in common and it has been taken away from them. The '
      + 'treasury clerk who called the meeting has put it in the flattest possible '
      + 'terms: the emergency under which everything since 66 has been done is over, '
      + 'and either somebody says what this country is or the question gets settled '
      + 'the way it was settled the first time.',
    forTag: 'JUD',
    major: true,
    minYear: 71,
    maxYear: 96,
    trigger: safeTrigger('ev_s_the_second_government', (ctx) => {
      if (!standing(ctx) || flag(ctx, 'settlementChosen')) return false;
      // Not while there is still an army in the field to agree about.
      return !atWarWithAnyone(ctx);
    }),
    aiOption: 0,
    historical: 'Ananus ben Ananus\' provisional government of 66 was destroyed by the Zealots and the Idumeans in the winter of 67–68. Josephus, who served it, dates the loss of the war to the day Ananus died.',
    options: [
      {
        // Always available. An exhausted elite reaches for the last
        // arrangement that worked, and this one worked for four hundred years.
        label: 'Restore the temple-state: High Priest, Sanhedrin, the ancient constitution',
        tooltip: 'The only settlement with a working precedent — Persia, the Ptolemies and most of the Hasmonean century ran on it. +3 stability, +20 legitimacy, +15% income and −1 unrest everywhere, permanently, because everybody knows how this is supposed to work. It also hands the country back to the four priestly houses that Pesachim 57a curses by name: Priesthood +40, Zealots −35, and the grievance that started the war is now the constitution.',
        effects: guard('ev_s_settlement:temple', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 3, legitimacy: 20 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_temple_state', name: 'The Temple-State', months: -1,
            effects: { incomeMult: 1.15, unrestAll: -1, legitimacyAdd: 0.1 },
          });
          h.factionShift(ctx, 'JUD', 'priesthood', 40);
          h.factionShift(ctx, 'JUD', 'notables', 25);
          h.factionShift(ctx, 'JUD', 'zealots', -35);
          h.doctrine(ctx, 'authority', 1);
          adopt(ctx, 'templeState');
          h.setFlag(ctx, 'settlementTempleState', true);
          h.chronicle(ctx, 'era', 'The ancient constitution is restored: a High Priest, a Sanhedrin, and the four houses back in the offices their fathers held. The men who burned the debt archives in the first summer of the war are told the emergency is over.');
        }),
      },
      {
        label: 'Draw the High Priest by lot, as the Zealots did',
        when: safeWhen('settlement:lot', (ctx) => partyAt(ctx, 'zealots', 60)),
        tooltip: 'Phanni ben Samuel of Aphtia was a stonecutter and had to be taught the duties. Josephus calls it the abrogation of the Law; read the other way it is the oldest principle there is, that God chooses and four families do not. Hereditary priestly power ends this afternoon: Zealots +35, Priesthood −50, Notables −20. +12 legitimacy with everyone who is not a priest, −1 stability, and no High Priest will ever again be able to promise anything to anybody, because he will not be in office long enough.',
        effects: guard('ev_s_settlement:lot', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 12, stability: -1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_lot_of_aphtia', name: 'The Lot', months: -1,
            effects: { unrestAll: -0.5, incomeMult: 0.95, manpowerMult: 1.08 },
          });
          h.factionShift(ctx, 'JUD', 'zealots', 35);
          h.factionShift(ctx, 'JUD', 'priesthood', -50);
          h.factionShift(ctx, 'JUD', 'notables', -20);
          h.doctrine(ctx, 'zeal', 2);
          h.doctrine(ctx, 'authority', -1);
          adopt(ctx, 'lottery');
          h.setFlag(ctx, 'settlementLottery', true);
          h.chronicle(ctx, 'era', 'The High Priesthood is filled by lot. The first man drawn is a stonecutter from Aphtia who has to be shown how the vestments fasten, and four families discover in one afternoon that they are no longer anything in particular.');
        }),
      },
      {
        label: 'Proclaim the Jubilee: liberty in the land, and the debts are gone',
        when: safeWhen('settlement:jubilee', (ctx) => partyAt(ctx, 'zealots', 55) && partyUnder(ctx, 'notables', 45)),
        tooltip: 'Leviticus 25, enforced — which nobody has done, because it cannot be done twice. Slaves freed, debts cancelled, land reverting: +25 legitimacy, +2 zeal, Zealots +40, and a countryside that will fight for this state because it now owns something. And the credit system is gone: −30% income for 120 months, Notables −60, Priesthood −25, and no one will lend to this government inside a generation.',
        effects: guard('ev_s_settlement:jubilee', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 25, stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_jubilee_enforced', name: 'The Jubilee Enforced', months: 120,
            effects: { incomeMult: 0.70, manpowerMult: 1.25, unrestAll: -1 },
          });
          h.factionShift(ctx, 'JUD', 'zealots', 40);
          h.factionShift(ctx, 'JUD', 'notables', -60);
          h.factionShift(ctx, 'JUD', 'priesthood', -25);
          h.doctrine(ctx, 'zeal', 2);
          adopt(ctx, 'jubilee');
          h.setFlag(ctx, 'settlementJubilee', true);
          h.chronicle(ctx, 'era', 'The Jubilee is proclaimed and, for the first time in the recorded history of the law, enforced. The archives are already ash; what burns this year is the ledgers that were rebuilt from memory afterwards.');
        }),
      },
      {
        label: 'No ruler but God. No tribute, no census, no king',
        when: safeWhen('settlement:noruler', (ctx) => partyAt(ctx, 'zealots', 70)
          && partyUnder(ctx, 'notables', 40) && partyUnder(ctx, 'priesthood', 40)),
        tooltip: 'The doctrine of Judas the Galilean, held for sixty years and never once implemented, because implementing it means having no state to implement it with. No sovereign, no census, no tribute to anyone: +3 zeal, −3 authority, Zealots +50, and a country that cannot be bought, taxed at scale, or negotiated with. −40% income permanently, −2 stability, and every neighbour must deal with a polity that has no address. Menahem came into the Temple in royal dress and his own side killed him for it; this is the settlement that means it.',
        effects: guard('ev_s_settlement:noruler', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 10, stability: -2 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'no_ruler_but_god', name: 'No Ruler But God', months: -1,
            effects: { incomeMult: 0.60, manpowerMult: 1.30, moraleMult: 1.12, unrestAll: 1 },
          });
          h.factionShift(ctx, 'JUD', 'zealots', 50);
          h.factionShift(ctx, 'JUD', 'notables', -70);
          h.factionShift(ctx, 'JUD', 'priesthood', -40);
          h.doctrine(ctx, 'zeal', 3);
          h.doctrine(ctx, 'authority', -3);
          adopt(ctx, 'noRuler');
          h.setFlag(ctx, 'settlementNoRuler', true);
          h.chronicle(ctx, 'era', 'The assembly resolves that there is no ruler but God, and adjourns without appointing anybody to enforce the resolution, which is the resolution. Judas the Galilean has been dead sixty-five years and has just won the argument.');
        }),
      },
    ],
  },

  // ── The king with nowhere to go ─────────────────────────────────────────

  {
    id: 'ev_s_the_king_at_caesarea',
    title: 'The King With Nowhere To Go',
    desc: 'Agrippa is still alive, still styled king by a Rome that no longer holds '
      + 'anything he could be king of, and still — this is the part the council keeps '
      + 'coming back to — the man to whom the emperors gave custody of the Temple '
      + 'vestments and the right to appoint the High Priest. He spent the spring of 66 '
      + 'making a speech in Jerusalem begging the city not to do this, was shouted '
      + 'down, and left. He then fought on the Roman side for four years. He has a '
      + 'household, a treasury, a sister the last emperor was in love with, and a '
      + 'legal claim to appoint the man who enters the Holy of Holies. What he does '
      + 'not have is anywhere to be.',
    forTag: 'JUD',
    major: true,
    minYear: 72,
    maxYear: 100,
    trigger: safeTrigger('ev_s_the_king_at_caesarea', (ctx) => {
      if (!standing(ctx) || !flag(ctx, 'settlementChosen')) return false;
      if (flag(ctx, 'agrippaAnswered')) return false;
      return true;
    }),
    aiOption: 0,
    historical: 'Agrippa II outlived the revolt by roughly thirty years, kept his kingdom in the north, and died the last of the Herodians. Rome never asked him to give up the right to appoint High Priests, because after 70 there were none to appoint.',
    options: [
      {
        // Every settlement can do this; what it MEANS differs, and the
        // chronicle says which meaning applied.
        label: 'Settle with him on the terms this constitution allows',
        tooltip: 'The answer is read off the settlement. A temple-state has an office he can be fitted into and quietly buys his claim out. The lottery cannot: his one prerogative was appointing the High Priest and there is no longer any such appointment to make. The Jubilee looks at a Herodian estate and sees land under the law. And a state with no ruler but God has no category for a king at all, including the category of exile.',
        effects: guard('ev_s_agrippa:0', (ctx) => {
          const h = ctx.helpers;
          const kind = settlement(ctx);
          h.setFlag(ctx, 'agrippaAnswered', true);
          const bought = alive(ctx, 'AGR');
          if (kind === 'templeState') {
            h.adjust(ctx, 'JUD', { treasury: -200, legitimacy: 8, stability: 1 });
            if (bought) {
              const t = ctx.game.tags.AGR;
              t.opinion = t.opinion || {}; t.opinion.JUD = 90;
            }
            h.factionShift(ctx, 'JUD', 'priesthood', 15);
            h.setFlag(ctx, 'agrippaRehabilitated', true);
            h.chronicle(ctx, 'ruler', 'The king is bought out: two hundred talents, the vestments transferred to the Temple treasury, and a seat at the festivals for as long as he lives. He takes it, because the alternative is Rome, and Rome has just lost.');
          } else if (kind === 'lottery') {
            h.adjust(ctx, 'JUD', { legitimacy: 10 });
            h.factionShift(ctx, 'JUD', 'zealots', 15);
            if (bought) { const t = ctx.game.tags.AGR; t.opinion = t.opinion || {}; t.opinion.JUD = -60; }
            h.setFlag(ctx, 'agrippaObsolete', true);
            h.chronicle(ctx, 'era', 'The council writes to the king that his prerogative is not withdrawn, merely unexercisable: there is no appointment to make, because the appointment is made by lot. It is the politest letter anyone has ever used to abolish an office.');
          } else if (kind === 'jubilee') {
            h.adjust(ctx, 'JUD', { treasury: 350, legitimacy: -5 });
            h.addTagModifier(ctx, 'JUD', {
              id: 'the_herodian_estates', name: 'The Herodian Estates', months: 240,
              effects: { incomeMult: 1.10 },
            });
            if (bought) { const t = ctx.game.tags.AGR; t.opinion = t.opinion || {}; t.opinion.JUD = -140; }
            h.factionShift(ctx, 'JUD', 'notables', -20);
            h.setFlag(ctx, 'agrippaDispossessed', true);
            h.chronicle(ctx, 'era', 'The Herodian estates are read as land under the law like any other, and the law says what it says in the fiftieth year. The king is not exiled, condemned or insulted. He is simply, and with full procedural courtesy, no longer a landowner.');
          } else if (kind === 'noRuler') {
            h.adjust(ctx, 'JUD', { legitimacy: 6, stability: -1 });
            if (bought) { const t = ctx.game.tags.AGR; t.opinion = t.opinion || {}; t.opinion.JUD = -100; }
            h.factionShift(ctx, 'JUD', 'zealots', 20);
            h.setFlag(ctx, 'agrippaUnrecognised', true);
            h.chronicle(ctx, 'era', 'The assembly declines to discuss the king, on the grounds that there is no such thing and therefore no question. He remains at Caesarea, addressed in correspondence as Agrippa son of Agrippa, and answers to it.');
          } else {
            h.adjust(ctx, 'JUD', { stability: -1 });
            h.chronicle(ctx, 'ruler', 'Nobody can say on whose authority the king should be dealt with, so he is not dealt with, and remains at Caesarea being a question.');
          }
        }),
      },
      {
        label: 'Leave him where he is. A Herodian at Caesarea is Rome\'s problem',
        tooltip: 'No settlement, no purchase and no ruling: the claim stays alive and so does the man. No cost now — and a Roman-recognised king with a legal right to appoint the High Priest is a standing instrument for any future emperor who wants one. +1 stability, and a permanent −0.1 legitimacy a month for as long as the office of King of the Jews exists and is not held here.',
        effects: guard('ev_s_agrippa:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_claim_left_alive', name: 'The Claim Left Alive', months: -1,
            effects: { legitimacyAdd: -0.1 },
          });
          h.setFlag(ctx, 'agrippaAnswered', true);
          h.setFlag(ctx, 'agrippaLeftAlive', true);
          h.chronicle(ctx, 'ruler', 'The king is left at Caesarea with his claim intact, on the reasoning that he is harmless and the reasoning is correct for exactly as long as no emperor needs him.');
        }),
      },
    ],
  },

  // ── What the settlement was worth ───────────────────────────────────────

  {
    id: 'ev_s_the_argument_at_sixty',
    title: 'The Argument at Sixty',
    worldLabel: 'Sixty years of the settlement the victory produced',
    desc: 'A clerk in the record office has done the arithmetic because it is the kind '
      + 'of year in which people do arithmetic: the constitution adopted after the war '
      + 'has now lasted longer than the Roman province did, and longer than anybody '
      + 'expected on the day it was adopted, including the men who adopted it. Nobody '
      + 'in public office was alive for the vote. The three parties that lost that '
      + 'argument are all still here — inside the same walls, in the same city, '
      + 'because Rome was beaten and did not remove them — and every one of them has '
      + 'spent sixty years being governed under an arrangement it opposed.',
    forTag: 'JUD',
    world: true,
    major: true,
    date: { y: 130, m: 3 },
    when: (ctx) => { try { return standing(ctx) && !!settlement(ctx); } catch (e) { return false; } },
    aiOption: 0,
    options: [
      {
        label: 'Let the record say what was adopted, and what it cost',
        tooltip: 'The chapter closes on the settlement rather than on the victory. Whichever was chosen is read out with the bill attached.',
        effects: guard('ev_s_sixty:0', (ctx) => {
          const h = ctx.helpers;
          const kind = settlement(ctx);
          h.adjust(ctx, 'JUD', { legitimacy: 10, stability: 1 });
          const line = kind === 'templeState'
            ? 'Sixty years of the ancient constitution. It has worked, in the sense that it has continued; the four houses hold what their fathers held, and the argument that began the war has been the government for two generations.'
            : kind === 'lottery'
              ? 'Sixty years of the lot. Fourteen High Priests, of whom two could read the service unaided and one was a fuller from the lower city, and not one of them has been able to promise anything to anybody — which the men who instituted it would say was the entire point.'
              : kind === 'jubilee'
                ? 'Sixty years since the Jubilee. The countryside owns itself and fights like it; the money markets moved to Alexandria within the decade and have not come back, and the treasury has spent two generations discovering exactly which functions of a state require credit.'
                : 'Sixty years without a ruler. Nothing has been ratified, no census has been taken, the tribute lists are blank, and the country has not been conquered, which is either a vindication or a very long run of luck, and the assembly has never been able to agree which.';
          h.chronicle(ctx, 'era', line);
          h.setFlag(ctx, 'settlementEndured', true);
        }),
      },
    ],
  },

];
