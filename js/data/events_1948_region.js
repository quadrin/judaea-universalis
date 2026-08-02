// Judaea Universalis — the region's own quarrels, 1956–2000 (SPEC §105).
// Content package. Zero imports; all effects run through ctx.helpers at
// runtime. Concatenated onto EVENTS_1948 by the era registry.
//
// Four threads the 1948 chain had the shape of but not the substance of:
//
//   Suez was one card — the nationalization — and then a silence where the
//   war itself should be. The collusion at Sèvres, the paratroops at Mitla,
//   the landing at Port Said and the American ultimatum that ended it are the
//   reason the 1967 crisis has the shape it has, and none of them were here.
//
//   The union with Egypt never came apart. `ev_i_uar_union` merged Syria into
//   the UAR in 1958 and nothing dissolved it, so a campaign that saw the
//   union form lost the entire Syrian arc — the Ba'ath, Assad, the Golan,
//   Lebanon — because every one of those cards is gated on a tag that no
//   longer existed. September 1961 is that missing card: the union breaks up
//   into the two states that made it, Egypt gets its own name back, and Syria
//   comes out as a NEW tag — SAR, the Syrian Arab Republic, the name it took
//   the week it walked out and kept for the rest of the century.
//
//   Eli Cohen was nowhere, in a chapter that has Eichmann in the glass booth.
//
//   And the Iranian revolution was nowhere either, although the chain has the
//   war it caused (1980) and the enemy it created (narrated, unnamed, in
//   `ev_i_the_mire` as "an adversary that did not exist in 1982"). Tehran in
//   February 1979 is the upstream event of Israel's northern border for the
//   next forty years, and the line from the Shah's aircraft leaving Mehrabad
//   to a Revolutionary Guard training camp in the Beqaa is short and direct.
//
// Source spine: the Protocol of Sèvres as published by Avi Shlaim; Mordechai
// Bar-On on Kadesh; the Eisenhower–Eden correspondence; Patrick Seale on
// Syria and on Assad; Eli Cohen's Damascus transmissions as declassified,
// with the eucalyptus story flagged where it belongs; Ervand Abrahamian on
// the revolution; Augustus Richard Norton and Nicholas Blanford on Hezbollah;
// the Winograd and Kahan reports for the northern wars.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_1948_region] ' + key, e || '');
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

// The 1948 chapter is the exception to SPEC §135, deliberately. Everywhere else
// a renamed realm is the same court under new letters and `alive` should follow
// the forwarding address. Here the rename IS the subject: Cairo becomes the
// United Arab Republic and back again, Damascus walks out of the union as the
// Syrian Arab Republic, and a dozen cards turn on which of those banners is
// flying this decade. So this one asks the raw question, and the chapter's own
// cast resolvers (egyTag / syrTag / syrOwn) go on answering it name by name.
function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false);
}

// A war is filed under the names its belligerents wear NOW (SPEC §135), and a
// content package asks after them by the names its chapter shipped with. The
// forwarding address lives on the game state, so this reads it without needing
// a ctx it was never given.
function warTag(game, t) {
  if (!game || !t) return t;
  if (game.tags && game.tags[t]) return t;
  const to = game.tagAliases && game.tagAliases[t];
  return (to && game.tags && game.tags[to]) ? to : t;
}

function findWar(game, a, b) {
  const x = warTag(game, a);
  const y = warTag(game, b);
  for (const w of (game && game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(x) !== -1 && all.indexOf(y) !== -1) return w;
  }
  return null;
}

function clearEventTruce(ctx, a, b) {
  const g = ctx.game;
  if (!g.truces) return;
  delete g.truces[a < b ? a + '|' + b : b + '|' + a];
}

function spawnAt(ctx, tag, provNames, opts) {
  for (const n of provNames) {
    if (ctx.helpers.controls(ctx, tag, n)) return ctx.helpers.spawnArmy(ctx, tag, n, opts);
  }
  return null;
}

// A rebel host stands wherever there is ground: REB controls nothing, so a
// spawn helper that tests control silently spawns nothing at all.
function spawnRebels(ctx, provNames, opts) {
  if (!alive(ctx, 'REB')) return null;
  for (const n of provNames) {
    const p = ctx.prov(n);
    if (!p || p.impassable) continue;
    const id = ctx.helpers.spawnArmy(ctx, 'REB', n, opts);
    if (id) return n;
  }
  return null;
}

function unrestAcross(ctx, tag, names, mod) {
  let touched = 0;
  for (const n of names) {
    if (tag && !ctx.helpers.controls(ctx, tag, n)) continue;
    ctx.helpers.addProvinceModifier(ctx, n, mod);
    touched++;
  }
  return touched;
}

function setOpinion(ctx, a, b, val) {
  const t = ctx.game.tags && ctx.game.tags[a];
  if (!t) return;
  if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
  t.opinion[b] = Math.max(-200, Math.min(200, val));
}

// The map may have diverged: Egypt may be the UAR, and Damascus may answer to
// SYR (the mandate republic), SAR (the republic of 1961) or the union itself.
// Every card below resolves its cast at runtime rather than assuming an atlas.
function egyTag(ctx) {
  if (alive(ctx, 'EGY')) return 'EGY';
  if (alive(ctx, 'UAR')) return 'UAR';
  return null;
}
function syrTag(ctx) {
  if (alive(ctx, 'SAR')) return 'SAR';
  if (alive(ctx, 'SYR')) return 'SYR';
  if (alive(ctx, 'UAR')) return 'UAR';
  return null;
}
// Damascus as a polity in its own right — the union does not count, because
// the whole question these cards ask is whether there is a Syria to ask.
function syrOwn(ctx) {
  if (alive(ctx, 'SAR')) return 'SAR';
  if (alive(ctx, 'SYR')) return 'SYR';
  return null;
}

const SYRIA_CORE = ['Damascus', 'Emesa', 'Palmyra', 'Apamea', 'Beroea', 'Cyrrhus',
  'Laodicea', 'Aradus', 'Dura-Europos', 'Bostra', 'Syrian Desert', 'Nisibis',
  'Caesarea Philippi', 'Batanea', 'Gamala'];
const LEBANON = ['Tyre', 'Sidon', 'Berytus', 'Byblos', 'Tripolis', 'Chalcis'];
const SOUTH_LEBANON = ['Tyre', 'Sidon'];
const IRAN = ['Ecbatana', 'Susa', 'Gazaca', 'Persepolis', 'Gabae', 'Hyrcania'];

export const EVENTS_1948_REGION = [

  // ═══ SUEZ, 1956 ══════════════════════════════════════════════════════════
  // The existing chain has the nationalization (ev_i_suez) and then jumps a
  // decade. These four are the crisis itself.

  {
    id: 'ev_i_sevres',
    title: 'The Protocol Nobody Signed Three Copies Of',
    worldLabel: 'The collusion at Sèvres',
    desc: 'A villa outside Paris, three delegations, and a document so compromising '
      + 'that the British Foreign Secretary will later send a man to France to get '
      + 'the copy back and burn it. The scheme: Israel attacks across Sinai; Britain '
      + 'and France issue an ultimatum to both sides to withdraw from the canal, '
      + 'which Egypt must refuse because the canal is in Egypt; and the two powers '
      + 'then intervene to separate combatants they have arranged. Ben-Gurion thinks '
      + 'it is a squalid business and says so, and signs, because what Israel gets is '
      + 'the fedayeen bases cleared and the Straits of Tiran opened, and nobody else '
      + 'has offered either.',
    forTag: 'both',
    date: { y: 1956, m: 10 },
    world: true,
    major: true,
    minYear: 1956,
    maxYear: 1957,
    when: safeTrigger('ev_i_sevres:when', (ctx) => alive(ctx, 'ISR') && !!egyTag(ctx)),
    aiOption: 0,
    historical: 'Israel signed the protocol and attacked on the 29th of October.',
    options: [
      {
        label: 'Sign, and hold the copy',
        tooltip: 'Israel: +150 funds and +25 martial points of French equipment — AMX tanks, Mystères, and the technical protocol that comes with them. The campaign in Sinai opens at the end of the month.',
        effects: guard('ev_i_sevres:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ISR')) return;
          h.adjust(ctx, 'ISR', { treasury: 150, mar: 25 });
          h.addTagModifier(ctx, 'ISR', {
            id: 'french_equipment', name: 'The French Connection', months: 72,
            effects: { disciplineMult: 1.06, reinforceMult: 1.1 },
          });
          ctx.game.flags.sevresProtocol = true;
          h.chronicle(ctx, 'diplomacy', 'At Sèvres three delegations write down a war and agree the order in which to start it; one copy goes to Jerusalem and is not returned.');
        }),
      },
      {
        label: 'Refuse to be anybody\'s pretext',
        tooltip: 'Israel: +10 legitimacy and no collusion to explain for the next forty years — but the fedayeen bases stay, the Straits stay shut, and the arms deal that came with the protocol does not happen (no Sinai campaign, and the Straits problem waits for 1967).',
        effects: guard('ev_i_sevres:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ISR')) return;
          h.adjust(ctx, 'ISR', { legitimacy: 10 });
          h.addTagModifier(ctx, 'ISR', {
            id: 'no_collusion', name: 'No Great Power\'s Pretext', months: 120,
            effects: { unrestAll: -0.5 },
          });
          ctx.game.flags.sevresRefused = true;
          h.chronicle(ctx, 'diplomacy', 'Jerusalem will not be the pretext in somebody else\'s ultimatum; the Straits stay shut and the raids go on.');
        }),
      },
    ],
  },

  {
    id: 'ev_i_kadesh',
    title: 'The Paratroops at the Mitla',
    worldLabel: 'The Sinai campaign opens',
    desc: 'A battalion drops at the eastern end of the Mitla Pass, a hundred and fifty '
      + 'miles inside Egypt, to give the ultimatum something to be about. The rest of '
      + 'the army comes overland behind it and the whole of Sinai falls in a hundred '
      + 'hours. The one real fight is the one nobody ordered: Sharon sends a '
      + 'reconnaissance into the pass that becomes a seven-hour battle in a defile '
      + 'against dug-in positions nobody had scouted, and thirty-eight of his men are '
      + 'killed for ground the plan never asked for. The army will still be arguing '
      + 'about it when he is Prime Minister.',
    forTag: 'both',
    date: { y: 1956, m: 10 },
    world: true,
    major: true,
    minYear: 1956,
    maxYear: 1957,
    when: safeTrigger('ev_i_kadesh:when', (ctx) =>
      alive(ctx, 'ISR') && !!egyTag(ctx) && !!ctx.game.flags.sevresProtocol),
    decider: 'ISR',
    aiOption: 0,
    options: [
      {
        label: 'Take the peninsula in a hundred hours',
        tooltip: 'Israel opens the Sinai campaign: war with Egypt, two armies in the Negev and the Straits force at Eilat, +20 martial points and −800 manpower. Egypt −12,000 manpower, −2 stability and Sinai and Gaza in Israeli hands — which the ultimatum and the Americans will shortly take back.',
        effects: guard('ev_i_kadesh:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const egy = egyTag(ctx);
          if (!alive(ctx, 'ISR') || !egy) return;
          clearEventTruce(ctx, 'ISR', egy);
          if (!findWar(g, 'ISR', egy)) h.declareWar(ctx, 'ISR', egy, 'The Sinai Campaign');
          spawnAt(ctx, 'ISR', ['Beersheba', 'Mitzpe Ramon', 'Dimona'], {
            inf: 5, cav: 3, name: 'The Sinai Force',
            general: { name: 'Assaf Simhoni', fire: 3, shock: 3, maneuver: 4 },
          });
          spawnAt(ctx, 'ISR', ['Eilat', 'Paran', 'Mitzpe Ramon'], {
            inf: 3, name: 'The Straits Force',
            general: { name: 'Avraham Yoffe', fire: 2, shock: 2, maneuver: 4 },
          });
          h.adjust(ctx, 'ISR', { mar: 20, manpower: -800 });
          h.adjust(ctx, egy, { manpower: -12000, stability: -2, legitimacy: -10 });
          g.flags.sinaiCampaign = true;
          h.chronicle(ctx, 'war', 'A battalion drops at the Mitla to give the ultimatum something to be about; Sinai falls in a hundred hours, and the pass costs thirty-eight men nobody had ordered into it.');
        }),
      },
    ],
  },

  {
    id: 'ev_i_port_said',
    title: 'The Ultimatum Arrives On Schedule',
    worldLabel: 'Britain and France land at Port Said',
    desc: 'The ultimatum goes out to both governments to withdraw ten miles from a '
      + 'canal that only one of them is anywhere near, and when Cairo declines, the '
      + 'bombers go in against Egyptian airfields and the paratroops drop on Port '
      + 'Said. Militarily it works. Everything else about it does not: the Americans '
      + 'were not told and are furious, the Soviets — who are at that exact moment '
      + 'putting tanks into Budapest and are delighted to be asked about somebody '
      + 'else\'s empire — send a note mentioning rockets, and sterling begins to go '
      + 'out of the Bank of England faster than anyone in the Cabinet has a plan for.',
    forTag: 'both',
    date: { y: 1956, m: 11 },
    world: true,
    major: true,
    minYear: 1956,
    maxYear: 1957,
    when: safeTrigger('ev_i_port_said:when', (ctx) => !!ctx.game.flags.sinaiCampaign),
    decider: 'UK',
    aiOption: 0,
    options: [
      {
        label: 'The bombers go in',
        tooltip: 'Britain and France intervene: Egypt −8,000 manpower and Port Said (Pelusium) and Alexandria +2 unrest for 36 months; the canal is blocked with sunk hulls and Egypt loses 15% income for 24 months. Britain −20 legitimacy — this is the operation that ends its standing east of Suez.',
        effects: guard('ev_i_port_said:0', (ctx) => {
          const h = ctx.helpers;
          const egy = egyTag(ctx);
          if (egy) {
            h.adjust(ctx, egy, { manpower: -8000 });
            h.addTagModifier(ctx, egy, {
              id: 'canal_blocked', name: 'The Canal Blocked', months: 24,
              effects: { incomeMult: 0.85 },
            });
            unrestAcross(ctx, egy, ['Pelusium', 'Alexandria'], {
              id: 'port_said', name: 'The Landing at Port Said', months: 36, effects: { unrest: 2 },
            });
          }
          if (alive(ctx, 'UK')) h.adjust(ctx, 'UK', { legitimacy: -20, stability: -1 });
          ctx.game.flags.portSaid = true;
          h.chronicle(ctx, 'war', 'The ultimatum expires and the paratroops drop on Port Said; the operation succeeds, and it is the last time Britain gives an order in this sea.');
        }),
      },
      {
        label: 'The Cabinet loses its nerve',
        tooltip: 'No landing: Britain keeps +10 legitimacy and its reserves, and Egypt keeps its canal traffic. Israel is left in Sinai alone, holding a peninsula with no ultimatum to justify it (−10 legitimacy, +1 war exhaustion).',
        effects: guard('ev_i_port_said:1', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'UK')) h.adjust(ctx, 'UK', { legitimacy: 10 });
          if (alive(ctx, 'ISR')) h.adjust(ctx, 'ISR', { legitimacy: -10, warExhaustion: 1 });
          ctx.game.flags.portSaidAborted = true;
          h.chronicle(ctx, 'diplomacy', 'London loses its nerve before the ships arrive; Israel is left holding Sinai with nobody\'s ultimatum to hide behind.');
        }),
      },
    ],
  },

  {
    id: 'ev_i_suez_ultimatum',
    title: 'The Americans Say No',
    worldLabel: 'Eisenhower ends the Suez crisis',
    desc: 'The president of the United States, eight days from an election he is going '
      + 'to win anyway, declines to distinguish between his allies and anybody else. '
      + 'The Treasury blocks the loan Britain needs to defend the pound; the American '
      + 'note to Israel is not a request. Everyone withdraws. What Israel keeps is not '
      + 'territory — it is a UN force in Sinai, an open Straits of Tiran, and ten '
      + 'quiet years on the southern border. What it does not notice it has acquired '
      + 'is a tripwire: the day a future Egyptian president asks that force to leave '
      + 'and it goes, the Straits close again, and everyone will already know what '
      + 'that means.',
    forTag: 'both',
    date: { y: 1957, m: 3 },
    world: true,
    major: true,
    minYear: 1956,
    maxYear: 1958,
    when: safeTrigger('ev_i_suez_ultimatum:when', (ctx) => !!ctx.game.flags.sinaiCampaign),
    decider: 'ISR',
    aiOption: 0,
    historical: 'Israel withdrew from Sinai and Gaza in March 1957 in exchange for UNEF and the open Straits.',
    options: [
      {
        label: 'Withdraw, and take the Straits',
        tooltip: 'The war with Egypt ends; every Egyptian province Israel occupies goes back. Israel: +15 legitimacy, "The Straits Are Open" (+10% income, −1 unrest, 120 months) and the southern border goes quiet — but the tripwire is set, and 1967 begins the day the UN force is asked to leave.',
        effects: guard('ev_i_suez_ultimatum:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const egy = egyTag(ctx);
          if (egy && findWar(g, 'ISR', egy)) h.endWar(ctx, 'ISR', egy, null);
          if (alive(ctx, 'ISR')) {
            h.adjust(ctx, 'ISR', { legitimacy: 15, warExhaustion: -2 });
            h.addTagModifier(ctx, 'ISR', {
              id: 'straits_open', name: 'The Straits Are Open', months: 120,
              effects: { incomeMult: 1.1, unrestAll: -1 },
            });
          }
          if (egy) h.adjust(ctx, egy, { legitimacy: 25, stability: 1 });
          g.flags.unefDeployed = true;
          g.flags.straitsOpen = true;
          h.chronicle(ctx, 'diplomacy', 'Washington declines to distinguish between its allies and anybody else; everyone withdraws, a UN force takes Sinai, and the Straits open for ten years.');
        }),
      },
      {
        label: 'Keep Sinai and take the consequences',
        tooltip: 'Israel holds the peninsula against the Americans: +15 martial points and the ground — but "Alone in the Chamber" permanently (−12% income, −10 legitimacy, +1 unrest), no UN force, no guarantee on the Straits, and the war with Egypt stays open.',
        effects: guard('ev_i_suez_ultimatum:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ISR')) return;
          h.adjust(ctx, 'ISR', { mar: 15, legitimacy: -10 });
          h.addTagModifier(ctx, 'ISR', {
            id: 'alone_in_the_chamber', name: 'Alone in the Chamber', months: -1,
            effects: { incomeMult: 0.88, unrestAll: 1 },
          });
          ctx.game.flags.sinaiKept = true;
          h.chronicle(ctx, 'diplomacy', 'Jerusalem keeps the peninsula and the note from Washington; there is no UN force, no guarantee, and no friend in the chamber.');
        }),
      },
    ],
  },

  // ═══ THE UNION COMES APART, 1961 ═════════════════════════════════════════

  {
    id: 'ev_i_secession',
    title: 'The Twenty-Eighth of September',
    worldLabel: 'Syria leaves the United Arab Republic',
    desc: 'Three and a half years of union have taught Damascus what union means in '
      + 'practice: the Syrian parties dissolved, the Syrian army posted to Egyptian '
      + 'commands, the land reform written in Cairo, and a Syrian officer corps '
      + 'discovering that its promotion board is now four hundred miles away and '
      + 'speaks a different dialect. A brigade takes the radio station before dawn. '
      + 'Nasser orders a landing at Latakia, hears within hours that the paratroops '
      + 'have surrendered to the people they were sent to reunify, and calls it off '
      + 'rather than fight Arabs on television. The union breaks into the two '
      + 'countries that made it. Egypt is Egypt again — Nasser will keep the union\'s '
      + 'name on the letterhead for another decade out of pure refusal to concede the '
      + 'point, and nobody outside the ministry of information is fooled — and what '
      + 'stands up in Damascus keeps the name it takes this week, the Syrian Arab '
      + 'Republic, and keeps it for the rest of the century.',
    forTag: 'both',
    date: { y: 1961, m: 9 },
    world: true,
    major: true,
    minYear: 1961,
    maxYear: 1963,
    aiOption: 0,
    historical: 'Syria seceded; Nasser let it go rather than fight Arabs on television, and kept the name.',
    options: [
      {
        label: 'The brigade takes the radio station',
        tooltip: 'The union breaks up into the two states that made it. Syria leaves as a NEW state — the Syrian Arab Republic (SAR) — taking the Syrian provinces, a third of the treasury and the garrisons standing on its own ground; what is left goes back to being Egypt. If the union never formed, Syria takes the new name in place: either way SAR exists from this month, and every later Syrian card answers to it.',
        effects: guard('ev_i_secession:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const ruler = { name: 'Nazim al-Kudsi', title: 'President', gov: 2, infl: 2, mar: 1, age: 55 };
          if (alive(ctx, 'UAR')) {
            // Syria walks out first — it must take its provinces with it while
            // there is still a union for them to be walking out of.
            const born = h.secedeTag(ctx, 'UAR', 'SAR', {
              provinces: SYRIA_CORE,
              share: 0.34,
              flag: 'SAR',
              ruler,
              stability: -1,
              legitimacy: 40,
              opinion: -60,
            });
            if (born) {
              h.removeModifier(ctx, 'UAR', 'arab_union_1958');
              // ...and what is left is Egypt. Nasser kept the union's name on
              // the letterhead for another decade out of pure refusal to
              // concede the point; the map is not required to indulge him.
              if (h.switchTag(ctx, 'UAR', 'EGY')) {
                const egy = g.tags.EGY;
                if (egy) egy.flag = 'EGY_REP'; // the Free Officers' republic, as before the union
                h.setRuler(ctx, 'EGY', {
                  name: 'Gamal Abdel Nasser', title: 'President', gov: 4, infl: 5, mar: 3, age: 43,
                });
                h.adjust(ctx, 'EGY', { legitimacy: -20, stability: -1 });
                h.addTagModifier(ctx, 'EGY', {
                  id: 'the_secession', name: 'The Secession', months: 120,
                  effects: { legitimacyAdd: -0.1 },
                });
              }
            }
          } else if (alive(ctx, 'SYR')) {
            // No union to leave: Syria takes the name anyway, which is what
            // the name was for — a republic asserting it is nobody's region.
            if (h.switchTag(ctx, 'SYR', 'SAR')) {
              const t = g.tags.SAR;
              if (t) t.flag = 'SAR';
              h.setRuler(ctx, 'SAR', ruler);
              h.adjust(ctx, 'SAR', { legitimacy: 5, infl: 15 });
            }
          }
          if (alive(ctx, 'SAR')) {
            h.addTagModifier(ctx, 'SAR', {
              id: 'republic_of_officers', name: 'A Republic of Officers', months: -1,
              effects: { manpowerMult: 1.06, unrestAll: 0.5, legitimacyAdd: -0.05 },
            });
            g.flags.syrianSecession = true;
          }
          h.chronicle(ctx, 'ruler', 'A brigade takes the radio station in Damascus and the union ends before breakfast; Nasser declines to fight Arabs on television, and Syria keeps the name it takes this week.');
        }),
      },
      {
        label: 'Cairo lands the paratroops at Latakia',
        tooltip: 'Nasser fights for the union: the UAR holds (if it exists) with +10 legitimacy and +1 stability, but every Syrian province takes +2.5 unrest for 120 months ("The Union Held By Force") and the union carries −10% income forever. The state survives; the idea of it does not.',
        effects: guard('ev_i_secession:1', (ctx) => {
          const h = ctx.helpers;
          const holder = alive(ctx, 'UAR') ? 'UAR' : syrOwn(ctx);
          if (!holder) return;
          h.adjust(ctx, holder, { legitimacy: 10, stability: 1, manpower: -4000 });
          h.addTagModifier(ctx, holder, {
            id: 'union_by_force', name: 'The Union Held By Force', months: -1,
            effects: { incomeMult: 0.9 },
          });
          unrestAcross(ctx, holder, SYRIA_CORE, {
            id: 'union_by_force_p', name: 'The Union Held By Force', months: 120,
            effects: { unrest: 2.5 },
          });
          ctx.game.flags.unionHeldByForce = true;
          h.chronicle(ctx, 'war', 'The paratroops land at Latakia and this time they do not surrender; the union survives as an occupation of one of its own halves.');
        }),
      },
    ],
  },

  // ═══ ELI COHEN, 1962–65 ══════════════════════════════════════════════════

  {
    id: 'ev_i_kamel_amin_thaabet',
    title: 'Kamel Amin Thaabet',
    worldLabel: 'A Mossad officer reaches the Damascus establishment',
    desc: 'He arrives from Buenos Aires as a rich Syrian exile coming home — an '
      + 'importer with money, no family to check on, and a genuinely charming manner '
      + 'about which everyone who met him agrees. Within two years his flat in '
      + 'Damascus is where officers go to drink, and he is close enough to the men '
      + 'who matter that the party newspaper is discussing him as a candidate for '
      + 'deputy minister of defence. He is Eliyahu ben Shaul Cohen, from Alexandria, '
      + 'rejected once by the Mossad as unsuitable, and he is sending Israel the '
      + 'Syrian order of battle. The famous story is that he suggested planting '
      + 'eucalyptus at the Golan positions for shade and thereby marked every one of '
      + 'them for the air force — it is a very good story and the archives do not '
      + 'support it. What is documented is duller and worth more: three years of '
      + 'fortification maps, unit strengths and the arguments inside the Syrian '
      + 'general staff, arriving in Tel Aviv while they were still going on.',
    forTag: 'ISR',
    minYear: 1962,
    maxYear: 1966,
    trigger: safeTrigger('ev_i_kamel_amin_thaabet', (ctx) => {
      const d = ctx.game.date;
      return alive(ctx, 'ISR') && !!syrOwn(ctx)
        && (d.y > 1962 || (d.y === 1962 && d.m >= 6));
    }),
    decider: 'ISR',
    aiOption: 0,
    options: [
      {
        label: 'Run him as long as he will run',
        tooltip: 'Israel: +30 martial points and "The Damascus File" — +2 siege bonus and +8% discipline for 120 months against the Syrian front, plus a permanent claim on the Golan approaches. Damascus loses 1 stability and its counter-intelligence spends three years looking in the wrong place.',
        effects: guard('ev_i_kamel_amin_thaabet:0', (ctx) => {
          const h = ctx.helpers;
          const sy = syrOwn(ctx);
          if (!alive(ctx, 'ISR')) return;
          h.adjust(ctx, 'ISR', { mar: 30 });
          h.addTagModifier(ctx, 'ISR', {
            id: 'damascus_file', name: 'The Damascus File', months: 120,
            effects: { siegeBonus: 2, disciplineMult: 1.08 },
          });
          if (sy) h.adjust(ctx, sy, { stability: -1 });
          ctx.game.flags.eliCohen = true;
          h.chronicle(ctx, 'diplomacy', 'A returning exile named Kamel Amin Thaabet takes a flat in Damascus where officers come to drink, and the Syrian order of battle begins arriving in Tel Aviv.');
        }),
      },
      {
        label: 'Pull him out while he is ahead',
        tooltip: 'Three years of product and a live officer at the end of it: Israel +15 martial points and "The Damascus File" at half strength (+1 siege bonus, 60 months) — and no hanging in Marjeh Square, which is a card this chain then never plays.',
        effects: guard('ev_i_kamel_amin_thaabet:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ISR')) return;
          h.adjust(ctx, 'ISR', { mar: 15, legitimacy: 3 });
          h.addTagModifier(ctx, 'ISR', {
            id: 'damascus_file', name: 'The Damascus File', months: 60,
            effects: { siegeBonus: 1 },
          });
          ctx.game.flags.eliCohenExtracted = true;
          h.chronicle(ctx, 'diplomacy', 'The Damascus source is brought home while the going is good; his wife is not, in the end, made to write to three presidents.');
        }),
      },
    ],
  },

  {
    id: 'ev_i_marjeh_square',
    title: 'Marjeh Square',
    worldLabel: 'Eli Cohen is hanged in Damascus',
    desc: 'Soviet-supplied direction-finding equipment and a decision to impose radio '
      + 'silence across Damascus so the one remaining transmitter would stand out: he '
      + 'is taken mid-transmission in January and the trial is a formality conducted '
      + 'by a military court which declines every appeal, including the ones from the '
      + 'Pope, from Paris and from three heads of government. He is hanged in the '
      + 'public square before a crowd, and left hanging for six hours under a placard, '
      + 'and Syrian television broadcasts it. His last letter asks his wife to '
      + 'remarry. Israel is still asking for the body sixty years later, which is the '
      + 'part of this that never resolves: everything else about the operation '
      + 'eventually became a file that could be closed.',
    forTag: 'both',
    date: { y: 1965, m: 5 },
    world: true,
    major: true,
    minYear: 1965,
    maxYear: 1967,
    when: safeTrigger('ev_i_marjeh_square:when', (ctx) =>
      !!ctx.game.flags.eliCohen && !ctx.game.flags.eliCohenExtracted && !!syrOwn(ctx)),
    decider: 'SAR',
    aiOption: 0,
    options: [
      {
        label: 'In the square, before a crowd, on television',
        tooltip: 'Damascus: +8 legitimacy and +1 stability — the counter-intelligence service has produced a public triumph. Israel: −5 legitimacy and −8% discipline against the Syrian front for 24 months as the network goes dark; but "The Damascus File" keeps running to its term, because what he sent was already sent.',
        effects: guard('ev_i_marjeh_square:0', (ctx) => {
          const h = ctx.helpers;
          const sy = syrOwn(ctx);
          if (sy) {
            h.adjust(ctx, sy, { legitimacy: 8, stability: 1, mar: 10 });
            h.addTagModifier(ctx, sy, {
              id: 'the_hanging', name: 'A Public Triumph', months: 36,
              effects: { legitimacyAdd: 0.1 },
            });
          }
          if (alive(ctx, 'ISR')) {
            h.adjust(ctx, 'ISR', { legitimacy: -5 });
            h.addTagModifier(ctx, 'ISR', {
              id: 'network_dark', name: 'The Network Goes Dark', months: 24,
              effects: { disciplineMult: 0.92 },
            });
          }
          ctx.game.flags.cohenHanged = true;
          h.chronicle(ctx, 'diplomacy', 'Eli Cohen is hanged in Marjeh Square before a crowd and left under a placard for six hours; the request for the body outlives everyone who signed the sentence.');
        }),
      },
      {
        label: 'Trade him — there is always somebody in a cell',
        tooltip: 'An exchange instead of a hanging: Damascus +120 funds and +10 governance points, Israel +8 legitimacy and no dark network. The intelligence service that was going to be famous for this stays anonymous, and both capitals treat it as a transaction, which it is.',
        effects: guard('ev_i_marjeh_square:1', (ctx) => {
          const h = ctx.helpers;
          const sy = syrOwn(ctx);
          if (sy) h.adjust(ctx, sy, { treasury: 120, gov: 10 });
          if (alive(ctx, 'ISR')) h.adjust(ctx, 'ISR', { legitimacy: 8, treasury: -120 });
          ctx.game.flags.cohenTraded = true;
          h.chronicle(ctx, 'diplomacy', 'The Damascus source is traded rather than hanged; two governments call it a transaction and neither publishes the terms.');
        }),
      },
    ],
  },

  // ═══ THE SYRIAN REPUBLIC COMES APART IN ITS TURN, 1979–82 ════════════════

  {
    id: 'ev_i_brotherhood_uprising',
    title: 'The Artillery School',
    worldLabel: 'The Islamist insurgency opens in Syria',
    desc: 'A duty officer at the artillery school in Aleppo separates the Alawite '
      + 'cadets from the rest at morning assembly and gunmen come through the door: '
      + 'thirty-two dead in ten minutes. It is the beginning of a five-year '
      + 'insurgency, and the thing it is about is the thing nobody in the government '
      + 'is allowed to name — that a republic of the Sunni majority has been run for '
      + 'a decade by a minority sect through the officer corps and the intelligence '
      + 'directorates, and that this is either a triumph of secular nationalism or a '
      + 'sectarian occupation depending entirely on who is asked. Professional '
      + 'syndicates strike, bombs go off in Damascus, and the government answers with '
      + 'the Defence Companies and a law making membership of the Brotherhood a '
      + 'capital offence, retroactively.',
    forTag: 'both',
    date: { y: 1979, m: 6 },
    world: true,
    major: true,
    minYear: 1979,
    maxYear: 1984,
    when: safeTrigger('ev_i_brotherhood_uprising:when', (ctx) => !!syrOwn(ctx)),
    decider: 'SAR',
    aiOption: 0,
    options: [
      {
        label: 'The Defence Companies answer it',
        tooltip: 'Damascus: +20 martial points, −1 stability, −10 legitimacy, and Aleppo (Beroea), Emesa and Apamea take +2.5 unrest for 60 months ("The Insurgency"). The state holds and pays for it in the coin it has: the army becomes a sect and everyone can see it.',
        effects: guard('ev_i_brotherhood_uprising:0', (ctx) => {
          const h = ctx.helpers;
          const sy = syrOwn(ctx);
          if (!sy) return;
          h.adjust(ctx, sy, { mar: 20, stability: -1, legitimacy: -10 });
          unrestAcross(ctx, sy, ['Beroea', 'Emesa', 'Apamea', 'Damascus'], {
            id: 'the_insurgency', name: 'The Insurgency', months: 60, effects: { unrest: 2.5 },
          });
          h.addTagModifier(ctx, sy, {
            id: 'defence_companies', name: 'The Defence Companies', months: 96,
            effects: { manpowerMult: 1.05, incomeMult: 0.94 },
          });
          ctx.game.flags.syrianUprising = true;
          h.chronicle(ctx, 'war', 'The artillery school at Aleppo: thirty-two cadets separated by sect and shot, and a five-year insurgency about the one thing the republic is not allowed to name.');
        }),
      },
      {
        label: 'Open the syndicates and the mosques',
        tooltip: 'Damascus tries the other answer: +15 governance points and +10 legitimacy, the insurgency modifiers halved (30 months) — and a permanent "The Front Is Inside" (−6% manpower, +0.5 unrest), because the officer corps regards this as the beginning of its own liquidation and says so.',
        effects: guard('ev_i_brotherhood_uprising:1', (ctx) => {
          const h = ctx.helpers;
          const sy = syrOwn(ctx);
          if (!sy) return;
          h.adjust(ctx, sy, { gov: 15, legitimacy: 10 });
          unrestAcross(ctx, sy, ['Beroea', 'Emesa', 'Apamea'], {
            id: 'the_insurgency', name: 'The Insurgency', months: 30, effects: { unrest: 1.2 },
          });
          h.addTagModifier(ctx, sy, {
            id: 'front_inside', name: 'The Front Is Inside', months: -1,
            effects: { manpowerMult: 0.94, unrestAll: 0.5 },
          });
          ctx.game.flags.syrianUprisingEased = true;
          h.chronicle(ctx, 'ruler', 'Damascus opens the syndicates and the mosques instead of the armouries; the officer corps reads it as the first move in its own liquidation.');
        }),
      },
    ],
  },

  {
    id: 'ev_i_hama',
    title: 'Hama',
    worldLabel: 'The rising at Hama is put down',
    desc: 'A search party is ambushed in the old city and the muezzins call a general '
      + 'uprising from the minarets, and the government does not send police. It '
      + 'sends the Defence Companies, special forces and artillery, and it seals the '
      + 'city for three weeks and shells the quarters where the fighting is, and then '
      + 'bulldozes them. Nobody will ever agree on the number. The government does '
      + 'not deny the operation and does not intend to: the message is the operation, '
      + 'and it works — the insurgency ends that month and there is not another one '
      + 'for twenty-nine years. It is also the reason that when there is another one, '
      + 'it starts in the same places and nobody on either side expects mercy.',
    forTag: 'both',
    date: { y: 1982, m: 2 },
    world: true,
    major: true,
    minYear: 1982,
    maxYear: 1986,
    when: safeTrigger('ev_i_hama:when', (ctx) => !!syrOwn(ctx) && !!ctx.game.flags.syrianUprising),
    decider: 'SAR',
    aiOption: 0,
    historical: 'The city was sealed, shelled and cleared; the insurgency ended that month.',
    options: [
      {
        label: 'Seal the city',
        tooltip: 'The insurgency ends: Damascus +2 stability, +25 martial points, the "The Insurgency" unrest lifts everywhere — and permanently: −15 legitimacy, "What Was Done at Hama" (−8% income, and the state cannot be popular again). Apamea (Hama) loses 3 development.',
        effects: guard('ev_i_hama:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const sy = syrOwn(ctx);
          if (!sy) return;
          for (const n of ['Beroea', 'Emesa', 'Apamea', 'Damascus']) h.removeModifier(ctx, n, 'the_insurgency');
          h.adjust(ctx, sy, { stability: 2, mar: 25, legitimacy: -15 });
          h.addTagModifier(ctx, sy, {
            id: 'what_was_done_at_hama', name: 'What Was Done at Hama', months: -1,
            effects: { incomeMult: 0.92, legitimacyAdd: -0.05 },
          });
          const p = ctx.prov && ctx.prov('Apamea');
          if (p && p.dev) {
            p.dev.tax = Math.max(1, (p.dev.tax || 1) - 1);
            p.dev.prod = Math.max(1, (p.dev.prod || 1) - 2);
          }
          g.flags.hama = true;
          h.chronicle(ctx, 'war', 'Hama is sealed for three weeks, shelled and then bulldozed; the insurgency ends that month, and nobody will ever agree on the number.');
        }),
      },
      {
        label: 'The city holds and the country goes with it',
        tooltip: 'The republic of officers comes apart (SPEC §105): the rebels take Hama and the north, a rebel host stands in the field, Damascus loses 2 stability, 25 legitimacy, 30% of its income and 20% of its manpower permanently, and every Syrian province carries +3 unrest. The state survives as a government in its own capital.',
        effects: guard('ev_i_hama:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const sy = syrOwn(ctx);
          if (!sy) return;
          h.adjust(ctx, sy, { stability: -2, legitimacy: -25 });
          h.addTagModifier(ctx, sy, {
            id: 'the_country_comes_apart', name: 'The Country Comes Apart', months: -1,
            effects: { incomeMult: 0.7, manpowerMult: 0.8, unrestAll: 1 },
          });
          unrestAcross(ctx, sy, SYRIA_CORE, {
            id: 'the_rising', name: 'The Rising', months: 240, effects: { unrest: 3 },
          });
          spawnRebels(ctx, ['Apamea', 'Beroea', 'Emesa'], {
            inf: 6, name: 'The Fighting Vanguard',
            general: { name: 'Adnan Uqla', fire: 2, shock: 3, maneuver: 2 },
          });
          g.flags.syrianCollapse = true;
          h.chronicle(ctx, 'war', 'Hama holds, and the north goes with it: the republic of officers keeps its capital and loses the country around it.');
        }),
      },
    ],
  },

  // ═══ TEHRAN, 1979 ════════════════════════════════════════════════════════

  {
    id: 'ev_i_iranian_revolution',
    title: 'The Shah Leaves; the Ayatollah Lands',
    worldLabel: 'The Iranian revolution',
    desc: 'The Shah goes to the airport with a box of Iranian soil and cries on the '
      + 'aircraft steps, and the newspaper headline that afternoon is one word: SHAH '
      + 'RAFT. The Shah went. Two weeks later an Air France 747 brings back a '
      + 'seventy-six-year-old cleric who has been in exile for fifteen years, and '
      + 'several million people come out to meet it; asked on the flight what he '
      + 'feels returning to Iran, he says nothing. The army declares neutrality in '
      + 'February and there is no longer a government. What replaces it is a thing '
      + 'nobody\'s political vocabulary has a word for yet, and its foreign policy '
      + 'has two operative commitments: the export of the revolution, and the '
      + 'proposition that Israel is an occupation to be ended rather than a state to '
      + 'be negotiated with. The embassy in Tehran is handed to the PLO within the '
      + 'month. The most reliably pro-Israeli capital between Ankara and the Indus '
      + 'has become the one that will still be arming its enemies in fifty years.',
    forTag: 'both',
    date: { y: 1979, m: 2 },
    world: true,
    major: true,
    minYear: 1979,
    maxYear: 1982,
    when: safeTrigger('ev_i_iranian_revolution:when', (ctx) => alive(ctx, 'IRN')),
    decider: 'IRN',
    aiOption: 0,
    historical: 'The monarchy fell; the Islamic Republic was proclaimed in April and the Israeli embassy became the PLO mission.',
    options: [
      {
        label: 'The army declares itself neutral',
        tooltip: 'Iran becomes the Islamic Republic: a theocracy, +25 legitimacy and +40 influence points, −2 stability and −30% of its army for a decade (the officer corps is purged) — and every alignment reverses. The periphery understanding with Israel ends, opinion falls to −180 both ways, and Tehran begins looking for a border with Israel to reach. It finds one in Lebanon.',
        effects: guard('ev_i_iranian_revolution:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (!alive(ctx, 'IRN')) return;
          const irn = g.tags.IRN;
          irn.govType = 'theocracy';
          irn.heir = null;
          irn.regency = false;
          h.rebrandTag(ctx, 'IRN', { name: 'Islamic Republic of Iran', flag: 'IRN_IR' });
          h.setRuler(ctx, 'IRN', {
            name: 'Ruhollah Khomeini', title: 'Supreme Leader', gov: 3, infl: 6, mar: 1, age: 76,
          });
          h.adjust(ctx, 'IRN', { legitimacy: 25, infl: 40, stability: -2, manpower: -20000 });
          // The officer corps the monarchy built is shot, retired or in exile;
          // the war next door will be fought by the men who replaced it.
          h.addTagModifier(ctx, 'IRN', {
            id: 'the_purged_officers', name: 'The Officer Corps Purged', months: 120,
            effects: { disciplineMult: 0.8, moraleMult: 1.15, manpowerMult: 1.2 },
          });
          h.addTagModifier(ctx, 'IRN', {
            id: 'export_the_revolution', name: 'Export the Revolution', months: -1,
            effects: { unrestAll: -0.5, incomeMult: 0.94 },
          });
          for (const t of ['UK', 'ISR', 'TUR']) {
            const other = g.tags[t];
            if (!other) continue;
            irn.allies = (irn.allies || []).filter((x) => x !== t);
            irn.guarantees = (irn.guarantees || []).filter((x) => x !== t);
            other.allies = (other.allies || []).filter((x) => x !== 'IRN');
            other.guarantees = (other.guarantees || []).filter((x) => x !== 'IRN');
          }
          if (alive(ctx, 'ISR')) {
            setOpinion(ctx, 'IRN', 'ISR', -180);
            setOpinion(ctx, 'ISR', 'IRN', -140);
          }
          unrestAcross(ctx, 'IRN', IRAN, {
            id: 'the_revolution_1979', name: 'The Revolution', months: 36, effects: { unrest: 2 },
          });
          g.flags.iranianRevolution = true;
          h.chronicle(ctx, 'ruler', 'SHAH RAFT: the monarchy leaves by aircraft and the Islamic Republic is proclaimed; the embassy in Tehran is handed to the PLO within the month.');
        }),
      },
      {
        label: 'The generals move on the crowds',
        tooltip: 'The army does not stand aside: Iran stays a monarchy with +2 stability and +30 martial points, and a permanent "The Army Chose" (−20% income, +2 unrest everywhere, −15 legitimacy). No Islamic Republic, no Revolutionary Guard in the Beqaa, and no Hezbollah — the northern border of the eighties belongs to somebody else.',
        effects: guard('ev_i_iranian_revolution:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'IRN')) return;
          h.adjust(ctx, 'IRN', { stability: 2, mar: 30, legitimacy: -15 });
          h.addTagModifier(ctx, 'IRN', {
            id: 'the_army_chose', name: 'The Army Chose', months: -1,
            effects: { incomeMult: 0.8, unrestAll: 2 },
          });
          ctx.game.flags.iranianRevolutionCrushed = true;
          h.chronicle(ctx, 'war', 'The generals move on the crowds in Tehran; the monarchy survives on the terms that survival leaves it, and the Beqaa gets no visitors.');
        }),
      },
    ],
  },

  {
    id: 'ev_i_hostage_crisis',
    title: 'Four Hundred and Forty-Four Days',
    worldLabel: 'The embassy in Tehran is seized',
    desc: 'Students climb the wall of the American embassy expecting a sit-in of a few '
      + 'days and are still there fourteen months later, because the government '
      + 'discovers that the occupation is the most popular thing in the country and '
      + 'that anybody who objects can be accused of being on the other side of it. '
      + 'The rescue attempt ends with wrecked helicopters and eight dead servicemen '
      + 'in a desert two hundred miles from Tehran. What the crisis actually settles '
      + 'is internal: every moderate in the provisional government is finished by it, '
      + 'the revolution\'s clerical wing wins the argument outright, and the new '
      + 'republic acquires the isolation it will build its whole political economy '
      + 'around.',
    forTag: 'both',
    date: { y: 1979, m: 11 },
    world: true,
    minYear: 1979,
    maxYear: 1982,
    when: safeTrigger('ev_i_hostage_crisis:when', (ctx) => !!ctx.game.flags.iranianRevolution),
    decider: 'IRN',
    aiOption: 0,
    options: [
      {
        label: 'The students hold the compound',
        tooltip: 'Iran: +15 legitimacy and +1 stability at home, and a permanent "The Isolation" (−15% income, −10% reinforcement) — the sanctions, the frozen assets and the spare parts that never arrive, which is what the war next door will be fought without.',
        effects: guard('ev_i_hostage_crisis:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'IRN')) return;
          h.adjust(ctx, 'IRN', { legitimacy: 15, stability: 1 });
          h.addTagModifier(ctx, 'IRN', {
            id: 'the_isolation', name: 'The Isolation', months: -1,
            effects: { incomeMult: 0.85, reinforceMult: 0.9 },
          });
          ctx.game.flags.hostageCrisis = true;
          h.chronicle(ctx, 'diplomacy', 'The embassy in Tehran is seized and held for four hundred and forty-four days; every moderate in the provisional government is finished by it.');
        }),
      },
      {
        label: 'The government clears the compound',
        tooltip: 'Tehran chooses the state over the street: +150 funds and +20 governance points, no isolation modifier — and −15 legitimacy with the revolution\'s own clerical wing, which does not forget being overruled (+1 unrest for 60 months).',
        effects: guard('ev_i_hostage_crisis:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'IRN')) return;
          h.adjust(ctx, 'IRN', { treasury: 150, gov: 20, legitimacy: -15 });
          h.addTagModifier(ctx, 'IRN', {
            id: 'the_street_overruled', name: 'The Street Overruled', months: 60,
            effects: { unrestAll: 1 },
          });
          h.chronicle(ctx, 'diplomacy', 'The provisional government clears the embassy compound and survives the week; the clerical wing files the fact away.');
        }),
      },
    ],
  },

  // ═══ THE NORTHERN BORDER, 1982–2000 ══════════════════════════════════════

  {
    id: 'ev_i_hezbollah',
    title: 'The Guard in the Beqaa',
    worldLabel: 'The Revolutionary Guard founds Hezbollah',
    desc: 'Fifteen hundred Revolutionary Guards arrive in the Beqaa by way of Damascus '
      + '— Syria lets them through because Syria has just watched its air force taken '
      + 'apart over the valley and will take help from any direction — and they set '
      + 'up in a barracks at Baalbek. What they build is not another militia. It '
      + 'recruits from the community that has been at the bottom of Lebanon\'s '
      + 'confessional arithmetic since the country was invented and has just watched '
      + 'two armies drive over it; it pays salaries, runs clinics and schools, and '
      + 'keeps its military wing separate from all of that; and its first operational '
      + 'idea is the thing nobody has a counter to — a man who intends to die in the '
      + 'attack and therefore needs no extraction plan. The occupation has produced '
      + 'the adversary. It will take eighteen years to leave, and the adversary will '
      + 'still be there.',
    forTag: 'both',
    date: { y: 1982, m: 11 },
    world: true,
    major: true,
    minYear: 1982,
    maxYear: 1990,
    when: safeTrigger('ev_i_hezbollah:when', (ctx) =>
      !!ctx.game.flags.lebanonWar82 && !!ctx.game.flags.iranianRevolution),
    decider: 'IRN',
    aiOption: 0,
    historical: 'The Guard came through Damascus to Baalbek and stayed; the organization it built outlasted everyone who authorized it.',
    options: [
      {
        label: 'Baalbek: salaries, clinics, and a separate military wing',
        tooltip: 'Hezbollah is founded. The Beqaa (Chalcis), Tyre and Sidon carry "The Party of God" permanently (+2 unrest); an Israel holding ground in Lebanon takes "The Attrition in the South" (−6% income, −4% morale) for as long as it stays; Iran −60 funds a year of it and +15 influence points. Israel gains no way to end this by taking ground — that is the point of it.',
        effects: guard('ev_i_hezbollah:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          for (const n of ['Chalcis', 'Tyre', 'Sidon']) {
            h.addProvinceModifier(ctx, n, {
              id: 'party_of_god', name: 'The Party of God', months: -1,
              effects: { unrest: 2 },
            });
          }
          if (alive(ctx, 'IRN')) h.adjust(ctx, 'IRN', { treasury: -60, infl: 15 });
          if (alive(ctx, 'ISR')) {
            h.addTagModifier(ctx, 'ISR', {
              id: 'attrition_in_the_south', name: 'The Attrition in the South', months: -1,
              effects: { incomeMult: 0.94, moraleMult: 0.96 },
            });
          }
          const sy = syrTag(ctx);
          if (sy) h.adjust(ctx, sy, { infl: 10 });
          g.flags.hezbollah = true;
          h.chronicle(ctx, 'war', 'Fifteen hundred Revolutionary Guards reach the Beqaa through Damascus and set up at Baalbek; the occupation has produced the adversary that will outlast it.');
        }),
      },
      {
        label: 'Damascus refuses the transit',
        tooltip: 'Syria will not have a second army of somebody else\'s in its own back garden: Damascus +10 governance points and +1 stability, Iran −10 legitimacy. No Party of God modifiers and no attrition on Israel — and the south of Lebanon belongs to whoever is standing on it, which for now is the organizations Israel came to expel.',
        effects: guard('ev_i_hezbollah:1', (ctx) => {
          const h = ctx.helpers;
          const sy = syrTag(ctx);
          if (sy) h.adjust(ctx, sy, { gov: 10, stability: 1 });
          if (alive(ctx, 'IRN')) h.adjust(ctx, 'IRN', { legitimacy: -10 });
          for (const n of SOUTH_LEBANON) {
            h.addProvinceModifier(ctx, n, {
              id: 'the_old_organizations', name: 'The Old Organizations', months: 120,
              effects: { unrest: 1 },
            });
          }
          ctx.game.flags.hezbollahBlocked = true;
          h.chronicle(ctx, 'diplomacy', 'Damascus refuses the transit through the Beqaa; Tehran finds no border with Israel to reach, and the south stays what it was.');
        }),
      },
    ],
  },

  {
    id: 'ev_i_barracks',
    title: 'Two Trucks, Six Seconds Apart',
    worldLabel: 'The barracks bombings in Beirut',
    desc: 'A yellow Mercedes truck goes through the wire at the airport and into the '
      + 'lobby of the building where a Marine battalion is sleeping, and the '
      + 'four-storey structure comes down on top of them; two hundred and forty-one '
      + 'American servicemen are killed, the worst single-day loss the Corps has had '
      + 'since Iwo Jima. Six seconds later a second truck takes the French paratroop '
      + 'building two miles away. Within four months the multinational force that '
      + 'came to Lebanon to guarantee a peace is offshore, and within six it is gone. '
      + 'Nobody is ever prosecuted. The lesson taken away by everybody watching is '
      + 'the same one and it is correct: this works, it is cheap, and there is no '
      + 'address to retaliate against.',
    forTag: 'both',
    date: { y: 1983, m: 10 },
    world: true,
    major: true,
    minYear: 1983,
    maxYear: 1990,
    // The multinational force is the whole subject of this card, and it came to
    // Lebanon to guarantee a peace between Lebanese factions. Where there is no
    // Lebanon there is no such peace and no such force — SPEC §113 gives that
    // road its own truck, aimed at the occupier's headquarters instead.
    when: safeTrigger('ev_i_barracks:when', (ctx) =>
      !!ctx.game.flags.hezbollah && !ctx.game.flags.hezbollahUnderOccupation),
    decider: 'ISR',
    aiOption: 0,
    options: [
      {
        label: 'The multinational force goes offshore',
        tooltip: 'The guarantors leave: Lebanon −1 stability and Beirut +2 unrest for 96 months; Israel is alone in the south — "No One Else Is Coming" (−8% income, +1 war exhaustion) for 120 months, and the pressure to withdraw begins here rather than at the Mire.',
        effects: guard('ev_i_barracks:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'LEB')) h.adjust(ctx, 'LEB', { stability: -1, legitimacy: -10 });
          h.addProvinceModifier(ctx, 'Berytus', {
            id: 'the_barracks', name: 'The Barracks', months: 96, effects: { unrest: 2 },
          });
          if (alive(ctx, 'ISR')) {
            h.adjust(ctx, 'ISR', { warExhaustion: 1 });
            h.addTagModifier(ctx, 'ISR', {
              id: 'no_one_else_is_coming', name: 'No One Else Is Coming', months: 120,
              effects: { incomeMult: 0.92 },
            });
          }
          ctx.game.flags.barracksBombing = true;
          h.chronicle(ctx, 'war', 'Two trucks six seconds apart take the American and French barracks in Beirut; within six months the guarantors are gone and nobody is ever prosecuted.');
        }),
      },
    ],
  },

  {
    id: 'ev_i_accountability',
    title: 'Seven Days in July',
    worldLabel: 'Operation Accountability',
    desc: 'The zone bleeds a soldier at a time and the answer, when the government '
      + 'finally reaches for one, is artillery and air strikes at the villages the '
      + 'rockets are fired from, and a deliberate decision to push the civilian '
      + 'population of the south north toward Beirut so that the Lebanese government '
      + 'has to deal with three hundred thousand refugees and therefore has to deal '
      + 'with Hezbollah. The population moves. The government does not do the second '
      + 'thing, because it cannot. What comes out of it instead is an American-brokered '
      + 'understanding, unwritten, that neither side will fire at the other\'s '
      + 'civilians — which formalizes the war rather than ending it, and which both '
      + 'sides will then accuse each other of breaking for the next three years.',
    forTag: 'both',
    date: { y: 1993, m: 7 },
    world: true,
    minYear: 1993,
    maxYear: 2000,
    when: safeTrigger('ev_i_accountability:when', (ctx) =>
      alive(ctx, 'ISR') && !!ctx.game.flags.hezbollah && !ctx.game.flags.blueLine),
    decider: 'ISR',
    aiOption: 0,
    options: [
      {
        label: 'Move the population and make it Beirut\'s problem',
        tooltip: 'Israel: +10 martial points, −8 legitimacy; Tyre and Sidon +2 unrest for 48 months, Beirut +1.5 for 48 (the refugees). The unwritten understanding is set: "The July Understanding" caps the attrition (Israel\'s southern bleed halved) for 36 months, and the war becomes a set of rules.',
        effects: guard('ev_i_accountability:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ISR')) return;
          h.adjust(ctx, 'ISR', { mar: 10, legitimacy: -8 });
          for (const n of SOUTH_LEBANON) {
            h.addProvinceModifier(ctx, n, {
              id: 'accountability', name: 'Seven Days in July', months: 48, effects: { unrest: 2 },
            });
          }
          h.addProvinceModifier(ctx, 'Berytus', {
            id: 'the_refugees', name: 'Three Hundred Thousand', months: 48, effects: { unrest: 1.5 },
          });
          h.addTagModifier(ctx, 'ISR', {
            id: 'july_understanding', name: 'The July Understanding', months: 36,
            effects: { incomeMult: 1.03 },
          });
          ctx.game.flags.accountability = true;
          h.chronicle(ctx, 'war', 'Seven days of artillery push the south of Lebanon north toward Beirut; what comes out of it is an unwritten understanding that formalizes the war instead of ending it.');
        }),
      },
      {
        label: 'Hold the zone and answer nothing',
        tooltip: 'No operation: Israel +5 legitimacy and no refugee crisis to answer for — and the zone goes on bleeding at its own rate ("The Zone Bleeds" deepened: −4% income, −3% morale, 84 months).',
        effects: guard('ev_i_accountability:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ISR')) return;
          h.adjust(ctx, 'ISR', { legitimacy: 5 });
          h.addTagModifier(ctx, 'ISR', {
            id: 'the_slow_subtraction', name: 'The Slow Subtraction', months: 84,
            effects: { incomeMult: 0.96, moraleMult: 0.97 },
          });
          h.chronicle(ctx, 'war', 'Jerusalem declines the operation and the zone goes on bleeding at its own rate: a jeep a week, a convoy a month.');
        }),
      },
    ],
  },

  {
    id: 'ev_i_grapes_of_wrath',
    title: 'Qana',
    worldLabel: 'Operation Grapes of Wrath and the shelling at Qana',
    desc: 'The same operation again three years later and with the same reasoning, and '
      + 'on the fourth day a battery firing counter-mortar radar solutions puts '
      + 'shells into a UN compound at Qana where eight hundred people are sheltering. '
      + 'A hundred and six of them are killed. The Israeli account is a targeting '
      + 'error; the UN investigation finds the error unlikely; a helicopter-borne '
      + 'video that would settle part of it is not initially disclosed. Whatever the '
      + 'sequence was, the political result is immediate and durable: the operation '
      + 'stops, the understanding is rewritten as a written one with a monitoring '
      + 'group, and the Israeli electorate is three weeks from an election that turns '
      + 'partly on this and is decided by less than one percent.',
    forTag: 'both',
    date: { y: 1996, m: 4 },
    world: true,
    major: true,
    minYear: 1996,
    maxYear: 2000,
    when: safeTrigger('ev_i_grapes_of_wrath:when', (ctx) =>
      alive(ctx, 'ISR') && !!ctx.game.flags.hezbollah && !ctx.game.flags.blueLine),
    decider: 'ISR',
    aiOption: 0,
    historical: 'The operation ended after the Qana shelling; the understanding was rewritten with a monitoring group.',
    options: [
      {
        label: 'Stop the operation and sign the understanding',
        tooltip: 'Israel: −15 legitimacy and −1 stability (the compound, and the video); the written April Understanding holds the northern line for 48 months (+1 stability worth of quiet, −1 unrest in the north) — and Hezbollah ends the round with the standing of a party that fought the region\'s strongest army to a written agreement.',
        effects: guard('ev_i_grapes_of_wrath:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (!alive(ctx, 'ISR')) return;
          h.adjust(ctx, 'ISR', { legitimacy: -15, stability: -1 });
          h.addTagModifier(ctx, 'ISR', {
            id: 'april_understanding', name: 'The April Understanding', months: 48,
            effects: { unrestAll: -1 },
          });
          for (const n of SOUTH_LEBANON) {
            h.addProvinceModifier(ctx, n, {
              id: 'qana', name: 'Qana', months: 96, effects: { unrest: 2.5 },
            });
          }
          g.flags.qana = true;
          h.chronicle(ctx, 'war', 'Shells fall on the UN compound at Qana and the operation stops within days; the understanding is rewritten, this time on paper, with a committee to argue about it.');
        }),
      },
      {
        label: 'Press on past the compound',
        tooltip: 'The operation continues: Israel +15 martial points and Hezbollah\'s launchers pushed back for 24 months — and permanently, "After Qana" (−12% income, −12 legitimacy, +1 unrest), a diplomatic bill that does not come due all at once and never stops arriving.',
        effects: guard('ev_i_grapes_of_wrath:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ISR')) return;
          h.adjust(ctx, 'ISR', { mar: 15, legitimacy: -12 });
          h.addTagModifier(ctx, 'ISR', {
            id: 'after_qana', name: 'After Qana', months: -1,
            effects: { incomeMult: 0.88, unrestAll: 1 },
          });
          for (const n of SOUTH_LEBANON) {
            h.addProvinceModifier(ctx, n, {
              id: 'qana', name: 'Qana', months: 120, effects: { unrest: 3 },
            });
          }
          ctx.game.flags.qana = true;
          h.chronicle(ctx, 'war', 'The operation presses on past the compound at Qana; the launchers move back a season and the bill does not stop arriving.');
        }),
      },
    ],
  },

  {
    id: 'ev_i_blue_line',
    title: 'The Line the UN Drew',
    worldLabel: 'Israel withdraws from Lebanon',
    desc: 'Eighteen years, and the end of it takes about thirty-six hours. The '
      + 'government has an election commitment and a date; what it does not have is a '
      + 'Lebanese army willing to come south or a Syrian agreement to cover the exit, '
      + 'so the withdrawal happens on its own, at night, faster than planned, because '
      + 'the militia Israel spent two decades paying for begins dissolving as soon as '
      + 'it understands what is happening. Its officers cross the fence with their '
      + 'families or go to prison in Beirut. The UN draws a line of withdrawal on a '
      + 'map — not a border, a line — and both sides declare the other still owes '
      + 'them a farm at one end of it. In the north, for the first time since the '
      + 'sixties, the villages are quiet. In the argument that will be had about '
      + 'everything else, it is the last thing everyone agrees was correct and the '
      + 'first thing everyone blames.',
    forTag: 'both',
    date: { y: 2000, m: 5 },
    world: true,
    major: true,
    minYear: 2000,
    maxYear: 2004,
    when: safeTrigger('ev_i_blue_line:when', (ctx) =>
      alive(ctx, 'ISR') && !!ctx.game.flags.securityBelt),
    decider: 'ISR',
    aiOption: 0,
    historical: 'Israel withdrew to the Blue Line in May 2000 and the South Lebanon Army dissolved within days.',
    options: [
      {
        label: 'Out, at night, in thirty-six hours',
        tooltip: 'Israel leaves Lebanon: any Israeli–Lebanese war ends, "The Zone Bleeds" and "The Attrition in the South" are lifted, +15 legitimacy, −2 war exhaustion, +6% income. The client militia dissolves (Tyre and Sidon +1 unrest for 60 months) and the party that is left declares it won, which — on the only question that was being asked — it did.',
        effects: guard('ev_i_blue_line:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (!alive(ctx, 'ISR')) return;
          if (findWar(g, 'ISR', 'LEB')) h.endWar(ctx, 'ISR', 'LEB', null);
          h.removeModifier(ctx, 'ISR', 'the_zone_bleeds');
          h.removeModifier(ctx, 'ISR', 'attrition_in_the_south');
          h.removeModifier(ctx, 'ISR', 'the_slow_subtraction');
          h.removeModifier(ctx, 'ISR', 'no_one_else_is_coming');
          h.adjust(ctx, 'ISR', { legitimacy: 15, warExhaustion: -2 });
          h.addTagModifier(ctx, 'ISR', {
            id: 'the_north_is_quiet', name: 'The North Is Quiet', months: 120,
            effects: { incomeMult: 1.06, unrestAll: -0.5 },
          });
          for (const n of SOUTH_LEBANON) {
            h.removeModifier(ctx, n, 'security_belt');
            h.addProvinceModifier(ctx, n, {
              id: 'the_militia_dissolves', name: 'The Militia Dissolves', months: 60,
              effects: { unrest: 1 },
            });
          }
          g.flags.blueLine = true;
          g.flags.lebanonWithdrawal = true;
          h.chronicle(ctx, 'war', 'Eighteen years end in thirty-six hours, at night: the militia dissolves before the last vehicle is across, and the UN draws a line that is not a border.');
        }),
      },
      {
        label: 'Stay for an agreement that covers the exit',
        tooltip: 'Israel holds the zone pending a Syrian deal that does not come: +10 martial points, and "The Zone Bleeds" deepened permanently (−8% income, −4% morale, +1 war exhaustion). Every year the zone is held is a year of the same arithmetic, and the arithmetic does not improve.',
        effects: guard('ev_i_blue_line:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ISR')) return;
          h.adjust(ctx, 'ISR', { mar: 10, warExhaustion: 1 });
          h.addTagModifier(ctx, 'ISR', {
            id: 'the_zone_bleeds', name: 'The Zone Bleeds', months: -1,
            effects: { incomeMult: 0.92, moraleMult: 0.96 },
          });
          ctx.game.flags.zoneHeld = true;
          h.chronicle(ctx, 'war', 'The zone is held for an agreement that never arrives; the arithmetic of it does not improve with another year of practice.');
        }),
      },
    ],
  },

  // ═══ THE UNION THAT DID NOT COME APART (SPEC §120) ═══════════════════════
  //
  // `ev_i_secession` offers two roads and the path tree only recorded one. The
  // second — Cairo lands the paratroops and this time they do not surrender —
  // sets `unionHeldByForce` and then had nowhere to go: the United Arab
  // Republic survived on the map and the chapter went on addressing a Syria
  // that, on this road, is a province of it. A fork with an unfinished branch
  // is the §119 failure mode exactly, and this is that branch finished.
  //
  // What a surviving union actually changes is not military. It is that the
  // most-populous Arab state and the most ideologically committed one are the
  // same government, which means the arguments that were conducted between
  // Cairo and Damascus for forty years are now conducted inside one cabinet,
  // with no border to lose them across and no second capital to defect to.

  {
    id: 'ev_i_union_endures',
    title: 'One Cabinet, Two Countries',
    worldLabel: 'The United Arab Republic is still a state',
    desc: 'The union held, and the decade since has been spent discovering what that '
      + 'costs. Damascus is governed from Cairo by men who do not speak its Arabic and '
      + 'have replaced its officer corps twice; the Syrian bourgeoisie, whose land was '
      + 'nationalised by a decree drafted in another country, has moved its money to '
      + 'Beirut and its sons to Paris. But the thing works. There is one army, one '
      + 'foreign ministry, one voice on the radio that the whole Arab world listens to '
      + 'without the irritation of hearing it contradicted from a second capital the '
      + 'following week — and when the crisis comes, as it is plainly coming, there '
      + 'will be no question of coordinating two general staffs, because there is only '
      + 'the one.',
    forTag: 'both',
    decider: (ctx) => (alive(ctx, 'UAR') ? 'UAR' : (syrOwn(ctx) || 'EGY')),
    date: { y: 1966, m: 4 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_union_endures:when', (ctx) =>
      !!ctx.game.flags.unionHeldByForce && !alive(ctx, 'SAR')
      && (alive(ctx, 'UAR') || !!syrOwn(ctx))),
    aiOption: 0,
    historical: 'The union lasted three and a half years. Every Arab coalition after 1961 had to be assembled out of governments that had already fallen out with each other.',
    options: [
      {
        label: 'One army, one staff, one plan',
        tooltip: 'The union is consolidated as a single military establishment: +12,000 manpower, +8% morale permanently, +1 stability, and "One General Staff" (no coalition penalty — the two fronts are one command). The Syrian provinces keep their occupation unrest; a union held by force is still held by force, and the cabinet knows it.',
        effects: guard('ev_i_union_endures:0', (ctx) => {
          const h = ctx.helpers;
          const me = alive(ctx, 'UAR') ? 'UAR' : syrOwn(ctx);
          if (!me) return;
          h.adjust(ctx, me, { manpower: 12000, stability: 1, legitimacy: 8 });
          h.addTagModifier(ctx, me, {
            id: 'one_general_staff', name: 'One General Staff', months: -1,
            effects: { moraleMult: 1.08 },
          });
          ctx.game.flags.unionEndures = true;
          h.chronicle(ctx, 'era', 'The United Arab Republic consolidates into a single military establishment: one army, one staff, and no second capital to lose an argument in.');
        }),
      },
      {
        label: 'Give Damascus its own ministries and hope that is enough',
        tooltip: 'Devolution rather than consolidation: the Syrian provinces lose 1.5 unrest permanently and the union gains +10% income as the Damascene money comes home from Beirut — but no unified command (−4% morale), and the arrangement is now a federation that both halves describe differently. The quieter answer, and the one that keeps the union recognisable to the people inside it.',
        effects: guard('ev_i_union_endures:1', (ctx) => {
          const h = ctx.helpers;
          const me = alive(ctx, 'UAR') ? 'UAR' : syrOwn(ctx);
          if (!me) return;
          h.adjust(ctx, me, { legitimacy: 12 });
          h.addTagModifier(ctx, me, {
            id: 'the_federation', name: 'A Federation, Described Two Ways', months: -1,
            effects: { incomeMult: 1.1, moraleMult: 0.96 },
          });
          unrestAcross(ctx, me, SYRIA_CORE, {
            id: 'damascene_ministries', name: 'Ministries in Damascus', months: -1,
            effects: { unrest: -1.5 },
          });
          ctx.game.flags.unionEndures = true;
          ctx.game.flags.unionDevolved = true;
          h.chronicle(ctx, 'era', 'Damascus gets its own ministries and its money comes home from Beirut; the union survives as a federation that each half describes differently to its own people.');
        }),
      },
    ],
  },

  {
    id: 'ev_i_what_the_union_was',
    title: 'What the Union Was',
    worldLabel: 'The century closes on a state that should not have lasted',
    desc: 'It has outlasted the man who made it, the ideology he made it out of, and '
      + 'every prediction filed about it in 1961 — including, in the archives of three '
      + 'foreign ministries, some very confident ones. What it did not outlast is the '
      + 'argument about what it is. To Cairo it is the natural condition of a people '
      + 'the map divided by accident and the union corrected. To a great many people '
      + 'in Aleppo it is the longest occupation in modern Arab history, conducted by '
      + 'men who arrive speaking a dialect they have to slow down for. Both of those '
      + 'have been true the whole time, which is the ordinary condition of large '
      + 'states and not a scandal peculiar to this one. The century ends with the '
      + 'question open, the state intact, and both halves of it certain the other '
      + 'half got the better of the arrangement.',
    forTag: 'both',
    decider: (ctx) => (alive(ctx, 'UAR') ? 'UAR' : (syrOwn(ctx) || 'EGY')),
    date: { y: 2000, m: 2 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_what_the_union_was:when', (ctx) =>
      !!ctx.game.flags.unionEndures && !alive(ctx, 'SAR')),
    aiOption: 0,
    historical: 'There was no union to have the argument about. Syria and Egypt spent the rest of the century as separate states that agreed about very little.',
    options: [
      {
        label: 'Enter it in the record and leave the question open',
        tooltip: 'The chapter closes on the union: +20 legitimacy, +1 stability, and "The State That Should Not Have Lasted" permanently (+10% income). A union that devolved carries it quietly (−1 unrest everywhere); one held by a single staff to the end carries the occupation with it (+0.5 unrest in the Syrian provinces) — each answer keeping what it earned.',
        effects: guard('ev_i_what_the_union_was:0', (ctx) => {
          const h = ctx.helpers;
          const me = alive(ctx, 'UAR') ? 'UAR' : syrOwn(ctx);
          if (!me) return;
          const devolved = !!ctx.game.flags.unionDevolved;
          h.adjust(ctx, me, { legitimacy: 20, stability: 1 });
          h.addTagModifier(ctx, me, {
            id: 'should_not_have_lasted', name: 'The State That Should Not Have Lasted',
            months: -1, effects: { incomeMult: 1.1, unrestAll: devolved ? -1 : 0 },
          });
          if (!devolved) {
            unrestAcross(ctx, me, SYRIA_CORE, {
              id: 'the_longest_occupation', name: 'The Longest Occupation', months: -1,
              effects: { unrest: 0.5 },
            });
          }
          ctx.game.flags.unionOutlasted = true;
          h.chronicle(ctx, 'era', devolved
            ? 'The century closes on a United Arab Republic that devolved rather than garrisoned, and is argued about rather than resented.'
            : 'The century closes on a United Arab Republic still held by one general staff — the natural condition of a divided people to one half of it, and the longest occupation in modern Arab history to the other.');
        }),
      },
    ],
  },

  // ── SPEC §206: the region's other histories, at the map's new edges. The
  // chapter's own rule (§105) extends south and east: the arcs of the powers
  // the §205 frame seated — Tehran's oil decade, the Negus' federation and
  // what he did to it, and the war in the Yemeni mountains that bled Egypt
  // white before 1967. Same convention as the rest of the file: raw tags on
  // purpose (this chapter's subject is which banner each capital flies), and
  // every card happens whichever way the Palestine war went. ────────────────

  // ── Y1 · 1951 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_s48_mossadegh',
    title: 'The Concession Is Cancelled',
    worldLabel: 'Iran nationalizes the oil; the Royal Navy answers with a blockade of lawyers',
    desc: 'The largest industrial enterprise in the Middle East — the refinery at '
      + 'Abadan, the fields, the pipelines, the company town with its English '
      + 'lawns — belongs, by a concession signed under another shah in another '
      + 'age, to a company in which His Majesty\'s Government holds the '
      + 'controlling share. In March the Majlis votes nationalization; in '
      + 'April the author of the bill, Mohammad Mossadegh — an old '
      + 'aristocrat who conducts politics from an iron bedstead, weeping and '
      + 'fainting with formidable precision — becomes prime minister to '
      + 'carry it out. Britain does not send the fleet, or rather sends it '
      + 'only to hover: the answer is an embargo enforced by injunction, '
      + 'insurers, and the simple fact that nobody else owns tankers. The '
      + 'refinery runs down; the technicians sail home; the treasury '
      + 'empties month by month while the old man argues Iran\'s case at '
      + 'The Hague and wins, at the United Nations and wins, and at the '
      + 'bank and loses.',
    forTag: 'both',
    decider: 'IRN',
    date: { y: 1951, m: 5 },
    world: true,
    major: true,
    aiOption: 0,
    when: safeTrigger('ev_s48_mossadegh:when', (ctx) => alive(ctx, 'IRN')),
    historical: 'The Majlis nationalized Anglo-Iranian in March 1951 and Mossadegh took office in April; the British embargo shut Abadan down by September and Iran\'s oil revenue fell to nearly nothing.',
    options: [
      {
        label: 'Win at The Hague, lose at the bank',
        tooltip: 'Iran gains "The Boycott Years" (−15% income for 28 months) and −1 stability, but +10 legitimacy — the concession\'s end is the most popular act of the reign. London is furious (UK opinion of Iran −60).',
        effects: guard('ev_s48_mossadegh:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'IRN', { stability: -1, legitimacy: 10 });
          h.addTagModifier(ctx, 'IRN', {
            id: 'boycott_years', name: 'The Boycott Years', months: 28,
            effects: { incomeMult: 0.85 },
          });
          setOpinion(ctx, 'UK', 'IRN', -60);
          h.setFlag(ctx, 'oilNationalized', true);
          h.chronicle(ctx, 'era', 'Iran nationalizes the oil and the old man on the iron bedstead wins every court but the bank: Abadan runs down, and the boycott years begin.');
        }),
      },
    ],
  },

  // ── Y2 · 1952 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_s48_eritrea_federated',
    title: 'A Federation With One Partner',
    worldLabel: 'The UN federates Eritrea with Ethiopia under the imperial crown',
    desc: 'The last piece of the Italian empire is disposed of by resolution. '
      + 'Eritrea — ex-Italian, British-administered since 1941, and split '
      + 'down the middle between unionists who look to the highlands and '
      + 'independents who look to the sea — is federated to Ethiopia by UN '
      + 'Resolution 390A: an autonomous unit with its own elected assembly, '
      + 'its own flag, its own official languages, "under the sovereignty '
      + 'of the Ethiopian Crown." The Emperor\'s men fly to Asmara for the '
      + 'ceremony; the arrangement gives Haile Selassie what four hundred '
      + 'years of highland kings never had, a coastline; and every clause '
      + 'about autonomy is written in a document whose only guarantor is '
      + 'the sovereign it limits. Diplomats note the design flaw politely '
      + 'and move on. The design flaw is the next forty years of the '
      + 'region\'s history.',
    forTag: 'both',
    decider: 'ETH',
    date: { y: 1952, m: 9 },
    world: true,
    aiOption: 0,
    when: safeTrigger('ev_s48_eritrea_federated:when', (ctx) => {
      if (!alive(ctx, 'ETH')) return false;
      const p = ctx.prov('Adulis');
      return !!(p && p.owner === 'UK');
    }),
    historical: 'UN Resolution 390A(V) federated Eritrea with Ethiopia; the British Military Administration handed over in September 1952.',
    options: [
      {
        label: 'Under the sovereignty of the Crown',
        tooltip: 'Massawa and the Eritrean shore pass from British administration to Ethiopia; the empire gains its coastline (+5 legitimacy). The autonomy clauses have one guarantor.',
        effects: guard('ev_s48_eritrea_federated:0', (ctx) => {
          const h = ctx.helpers;
          h.changeOwner(ctx, 'Adulis', 'ETH');
          h.adjust(ctx, 'ETH', { legitimacy: 5 });
          h.setFlag(ctx, 'eritreaFederated', true);
          h.chronicle(ctx, 'era', 'The UN federates Eritrea to the Ethiopian Crown: the empire gains a coastline, and the autonomy clauses gain a guarantor who is also their only threat.');
        }),
      },
    ],
  },

  // ── Y3 · 1953 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_s48_mordad',
    title: 'The 28th of Mordad',
    worldLabel: 'The Mossadegh government falls in a royalist coup; the Shah flies home',
    desc: 'It takes four days and two tries. The first attempt misfires — the '
      + 'officer delivering the dismissal decree is arrested at the prime '
      + 'minister\'s door, and the Shah, without waiting for the morning, '
      + 'flies his own plane to Baghdad and on to Rome, where he is '
      + 'photographed at a café table looking like a man rehearsing exile. '
      + 'Then, on the 28th of Mordad by Tehran\'s calendar, the second try '
      + 'takes: crowds hired and otherwise, led by the strongmen of the '
      + 'wrestling clubs, converge from the bazaar; army units decide, '
      + 'street by street, which orders they recognize; and by evening the '
      + 'radio has changed hands, the old man is in a cellar awaiting a '
      + 'polite treason trial, and the Shah is flying home to a throne he '
      + 'will hold for twenty-five years and never quite trust again. The '
      + 'oil returns as a consortium — the British share diluted with '
      + 'American — and the words "foreign hand", already old in Persian '
      + 'politics, acquire their modern meaning.',
    forTag: 'both',
    decider: 'IRN',
    date: { y: 1953, m: 8 },
    world: true,
    major: true,
    aiOption: 0,
    when: safeTrigger('ev_s48_mordad:when', (ctx) => alive(ctx, 'IRN') && !!(ctx.game.flags && ctx.game.flags.oilNationalized)),
    historical: 'The coup of 19 August 1953 (28 Mordad) removed Mossadegh after a first failed attempt and the Shah\'s flight to Rome; the oil returned as a consortium in 1954.',
    options: [
      {
        label: 'The radio changes hands by evening',
        tooltip: 'The boycott ends and the consortium signs: Iran +1 stability, the Boycott Years lapse, and the western capitals warm (+40 UK and US opinion). The words "foreign hand" acquire their modern meaning (−10 legitimacy).',
        effects: guard('ev_s48_mordad:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'IRN', { stability: 1, legitimacy: -10 });
          h.removeModifier(ctx, 'IRN', 'boycott_years');
          setOpinion(ctx, 'UK', 'IRN', 40);
          setOpinion(ctx, 'USA', 'IRN', 40);
          h.setFlag(ctx, 'mordadCoup', true);
          h.chronicle(ctx, 'era', 'The second try takes: the Mossadegh government falls on the 28th of Mordad, the Shah flies home, and the oil returns as a consortium. The foreign hand acquires its modern meaning.');
        }),
      },
    ],
  },

  // ── Y4 · 1962 · September ─────────────────────────────────────────────────
  {
    id: 'ev_s48_sanaa_officers',
    title: 'The Imam Is Dead a Week',
    worldLabel: 'Revolution at Sana\'a: republic in the lowlands, Imamate in the mountains, Egypt in the middle',
    desc: 'Imam Ahmad — who survived his father\'s assassination, a palace coup, '
      + 'and by legend so many attempts on his own life that the tribes '
      + 'called him the Djinn — dies at last in his bed, and his heir lasts '
      + 'a week. Tanks under Colonel Sallal shell the palace at Sana\'a; a '
      + 'Yemen Arab Republic is proclaimed over the radio; and the new '
      + 'Imam, al-Badr, climbs out of a back window and into the northern '
      + 'mountains, where the tribes are already gathering for the counter- '
      + 'revolution. Then the region arrives. Nasser, needing a victory at '
      + 'a manageable distance, sends first a battalion, then a division, '
      + 'then seventy thousand men into mountains that have never obeyed a '
      + 'lowland government of any description; Saudi silver and Jordanian '
      + 'rifles come down the wadis to the royalists; and Egypt settles '
      + 'into the war its own officers will call, without affection, our '
      + 'Vietnam — the army\'s best formations, its poison-gas squadrons '
      + 'and its budget bleeding into the Yemen for five years, until a '
      + 'June morning in 1967 finds them still there.',
    forTag: 'both',
    decider: 'YEM',
    date: { y: 1962, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    when: safeTrigger('ev_s48_sanaa_officers:when', (ctx) => alive(ctx, 'YEM')),
    historical: 'Imam Ahmad died on 19 September 1962 and Sallal\'s coup followed on the 26th; the civil war drew in some 70,000 Egyptian troops against Saudi-backed royalists and ran past 1967.',
    options: [
      {
        label: 'Republic on the radio, Imamate in the hills',
        tooltip: 'Yemen −2 stability and "The War in the Mountains" (+3 unrest across its provinces for 5 years). If Egypt stands, it is drawn in: −150 talents, and "Our Vietnam" (−8% income and −7% manpower for 5 years).',
        effects: guard('ev_s48_sanaa_officers:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'YEM', { stability: -2 });
          unrestAcross(ctx, 'YEM', ['Zafar', 'Muza', 'Marib'], {
            id: 'war_in_mountains', name: 'The War in the Mountains', months: 60,
            effects: { unrest: 3 },
          });
          if (alive(ctx, 'EGY')) {
            h.adjust(ctx, 'EGY', { treasury: -150 });
            h.addTagModifier(ctx, 'EGY', {
              id: 'our_vietnam', name: 'Our Vietnam', months: 60,
              effects: { incomeMult: 0.92, manpowerMult: 0.93 },
            });
            setOpinion(ctx, 'SAU', 'EGY', -80);
          }
          h.setFlag(ctx, 'yemenRevolution', true);
          h.chronicle(ctx, 'era', 'The Imam is dead a week when the tanks shell the palace: republic in the lowlands, Imamate in the mountains, and Egypt marching seventy thousand men into the war its officers will call our Vietnam.');
        }),
      },
    ],
  },

  // ── Y5 · 1962 · November ──────────────────────────────────────────────────
  {
    id: 'ev_s48_eritrea_annexed',
    title: 'The Federation With One Partner Ends',
    worldLabel: 'The Eritrean assembly votes itself out of existence; the long war begins',
    desc: 'The design flaw matures on schedule. Ten years of imperial pressure — '
      + 'the Eritrean flag banned, the languages of administration changed, '
      + 'the assembly\'s powers filed away one by one — end in November '
      + '1962 with the assembly, police at the doors, voting to abolish '
      + 'the federation and itself, and Eritrea becomes the empire\'s '
      + 'fourteenth province. The UN, guarantor of the arrangement, files '
      + 'no objection; the resolution had no enforcement clause, and the '
      + 'Emperor is by now the continent\'s elder statesman, host of the '
      + 'new Organization of African Unity. But the fuse is already lit: '
      + 'a year before the vote, a police sergeant named Hamid Idris '
      + 'Awate fired the first shots in the hills near Agordat, and the '
      + 'war he started will outlive the Emperor, his successors, and '
      + 'very nearly the century — thirty years to prove the diplomats\' '
      + 'polite note correct.',
    forTag: 'both',
    decider: 'ETH',
    date: { y: 1962, m: 11 },
    world: true,
    aiOption: 0,
    when: safeTrigger('ev_s48_eritrea_annexed:when', (ctx) => {
      if (!alive(ctx, 'ETH')) return false;
      const p = ctx.prov('Adulis');
      return !!(p && p.owner === 'ETH');
    }),
    historical: 'The Eritrean assembly voted the federation\'s abolition on 14 November 1962; the armed struggle dated from Awate\'s first action at Mount Adal in September 1961 and ran to 1991.',
    options: [
      {
        label: 'The fourteenth province',
        tooltip: 'Massawa and the Eritrean shore carry "The Long War Begins" (+3 unrest, −10% tax for 10 years); Ethiopia +5 legitimacy now, and a mark history will collect on.',
        effects: guard('ev_s48_eritrea_annexed:0', (ctx) => {
          const h = ctx.helpers;
          unrestAcross(ctx, 'ETH', ['Adulis'], {
            id: 'long_war_begins', name: 'The Long War Begins', months: 120,
            effects: { unrest: 3, taxMult: 0.9 },
          });
          h.adjust(ctx, 'ETH', { legitimacy: 5 });
          h.setFlag(ctx, 'eritreaAnnexed', true);
          h.chronicle(ctx, 'era', 'The Eritrean assembly, police at the doors, votes itself out of existence; the sergeant in the hills has already fired the first shots of a thirty-year answer.');
        }),
      },
    ],
  },
];
