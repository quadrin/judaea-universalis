// Judaea Universalis — the cold war in Europe, 1948–1991 (SPEC §105's rule
// applied to the superpowers). Content package. Zero imports; all effects
// run through ctx.helpers at runtime. Concatenated onto EVENTS_1948 by the
// era registry.
//
// The 1948 chain models Washington and Moscow as weather — arms deals,
// opinion, the occasional ultimatum — and the weather had no fronts: no
// Berlin blockade in the chapter's own first summer, no Stalin's death, no
// Hungary rising in the same fortnight as Suez, no Prague Spring in the
// state that armed Israel's independence, no Helsinki basket behind the
// refuseniks, no 1989. The chapter's own cards kept reaching for these
// (the Czech arsenal, the Paris axis, the American era, the million-strong
// aliyah) without the events they hang from. This file is the hooks.
//
// The rule for admission is §104's: it must happen whichever way the
// independence war went. Everything here is a notice except Helsinki,
// where Israel genuinely chose a posture; nothing moves a border, and the
// one rebrand (the Soviet flag coming down) is the era's own.
//
// SPEC §135 note, carried from the chapter's other packages: 1948 keeps a
// RAW `alive` on purpose. The rename is the subject here too — Occupied
// Germany becomes West Germany becomes Germany, and the Soviet Union ends
// as Russia under the same three letters — so these cards ask the raw
// question and never forward through livingTag.
//
// Source spine: the airlift tonnage tables; the Slánský trial's published
// transcript, read as the script it was; Khrushchev's secret speech in the
// copy that travelled through Warsaw and Tel Aviv; the UN's Hungary
// report; Schabowski's press conference on tape; the Politburo minutes on
// Afghanistan ("the measures"); and for the last card, the televised pen
// that failed and the borrowed one that worked.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_1948_coldwar] ' + key, e || '');
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

// The 1948 exception to SPEC §135, deliberately (see header): raw alive.
function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false);
}

function stir(ctx, names, mod) {
  for (const n of names) ctx.helpers.addProvinceModifier(ctx, n, mod);
}

function setOpinion(ctx, a, b, val) {
  const t = ctx.game.tags && ctx.game.tags[a];
  if (!t) return;
  if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
  t.opinion[b] = Math.max(-200, Math.min(200, val));
}

function easeOpinion(ctx, a, b, delta) {
  const t = ctx.game.tags && ctx.game.tags[a];
  if (!t) return;
  if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
  t.opinion[b] = Math.max(-200, Math.min(200, (t.opinion[b] || 0) + delta));
}

// The Atlantic pact's founding table, as the game's map seats it.
const NATO_TAGS = ['USA', 'UK', 'FRA', 'ITA', 'NLD', 'DEN', 'POR'];
// The other alliance, ditto.
const PACT_TAGS = ['SOV', 'POL', 'CZE', 'HUN', 'BUL', 'ROU'];

export const EVENTS_1948_COLDWAR = [

  // ── C1 · 1948 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_cw_berlin_blockade',
    title: 'The City Becomes an Island',
    worldLabel: 'The Soviets blockade Berlin; the airlift begins',
    desc: 'Six weeks after the State of Israel declares itself, the wartime '
      + 'alliance finishes dying in Berlin: the Soviet zone closes every road, '
      + 'rail line and canal into the city\'s western sectors, on the theory '
      + 'that two million people\'s groceries are a negotiating position. The '
      + 'western answer is a piece of logistical impudence nobody in Moscow '
      + 'believed possible — feed a city by air, indefinitely: coal in bomb '
      + 'bays, a landing every ninety seconds at Tempelhof, candy on little '
      + 'parachutes for the children standing on the rubble to watch the '
      + 'planes come in. It will run eleven months until the barriers '
      + 'quietly lift, having demonstrated the era\'s two ground rules at '
      + 'once: the victors of the last war can no longer agree on lunch, '
      + 'and neither of them will fire the first shot over it. Every small '
      + 'state watching — and the small state that declared itself in May '
      + 'is watching with professional attention — learns the same lesson: '
      + 'the world now has two patrons, the space between them is '
      + 'navigable, and the tolls are paid in alignment.',
    forTag: 'both',
    decider: 'SOV',
    date: { y: 1948, m: 6 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'The Soviet blockade of Berlin\'s western sectors began on 24 June 1948; the airlift supplied the city for eleven months until the blockade lifted in May 1949.',
    options: [
      {
        label: 'Coal in bomb bays, candy on parachutes',
        tooltip: 'Washington and Moscow set their opinion of each other at −150; Occupied Germany carries "The Airlift" (+1 unrest for 12 months) while the city lives off the runway. The world now has two patrons, and the tolls are paid in alignment.',
        effects: guard('ev_cw_berlin_blockade:0', (ctx) => {
          const h = ctx.helpers;
          setOpinion(ctx, 'USA', 'SOV', -150);
          setOpinion(ctx, 'SOV', 'USA', -150);
          stir(ctx, ['Semnones'], {
            id: 'the_airlift', name: 'The Airlift', months: 12,
            effects: { unrest: 1 },
          });
          h.setFlag(ctx, 'berlinBlockade', true);
          h.chronicle(ctx, 'era', 'The Soviets close the roads to Berlin and the West feeds the city by air for eleven months; the wartime alliance is over, and neither side fires a shot to prove it.');
        }),
      },
    ],
  },

  // ── C2 · 1949 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_cw_nato',
    title: 'Twelve Signatures in Washington',
    worldLabel: 'The North Atlantic Treaty is signed',
    desc: 'Twelve foreign ministers sign a treaty in Washington whose fifth '
      + 'article contains the entire architecture of the next four decades in '
      + 'one sentence: an armed attack against one shall be considered an '
      + 'attack against them all. The United States Senate — the same '
      + 'institution that declined the League of Nations on the grounds that '
      + 'permanent alliances were the Old World\'s disease — ratifies a '
      + 'permanent alliance with the Old World by eighty-two votes to '
      + 'thirteen, the Marine Band playing show tunes at the signing being '
      + 'the republic\'s way of keeping the occasion from feeling like what '
      + 'it is. The calculation is cold and correct on both sides of the '
      + 'ocean: Europe\'s recovery needs a guarantee no European can give, '
      + 'and the guarantee is only believed if American soldiers stand '
      + 'where the attack would land. For everyone outside the twelve, the '
      + 'signature page redraws the market: security is now a bloc product, '
      + 'sold on subscription, and the states that cannot subscribe — the '
      + 'new one on the Mediterranean\'s eastern shore among them — will '
      + 'spend decades pricing the alternatives.',
    forTag: 'both',
    decider: 'USA',
    date: { y: 1949, m: 4 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'The North Atlantic Treaty was signed in Washington on 4 April 1949 and ratified by the Senate 82–13; Article 5 made an attack on one an attack on all.',
    options: [
      {
        label: 'An attack against one is an attack against all',
        tooltip: 'The Atlantic capitals — Washington, London, Paris, Rome, The Hague, Copenhagen, Lisbon — set their mutual opinion at +100, and Moscow\'s opinion of each falls by 60. Security is a bloc product now, sold on subscription.',
        effects: guard('ev_cw_nato:0', (ctx) => {
          const h = ctx.helpers;
          for (const a of NATO_TAGS) {
            if (!alive(ctx, a)) continue;
            for (const b of NATO_TAGS) {
              if (a === b || !alive(ctx, b)) continue;
              const t = ctx.game.tags[a];
              if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
              t.opinion[b] = Math.max(t.opinion[b] || 0, 100);
            }
            easeOpinion(ctx, 'SOV', a, -60);
          }
          h.setFlag(ctx, 'natoSigned', true);
          h.chronicle(ctx, 'era', 'Twelve signatures in Washington make an attack on one an attack on all; security becomes a bloc product, sold on subscription.');
        }),
      },
    ],
  },

  // ── C3 · 1949 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_cw_two_germanies',
    title: 'Two Flags Over One People',
    worldLabel: 'The Federal Republic and the DDR are proclaimed',
    desc: 'The occupation gives birth to twins. In May, the western zones '
      + 'adopt a Basic Law — deliberately not called a constitution, '
      + 'because a constitution would make the division permanent and the '
      + 'document\'s own preamble insists it is provisional, a formula that '
      + 'will outlast everyone who drafted it — and the Federal Republic '
      + 'sets up its capital in Bonn, a university town chosen precisely '
      + 'because nobody could mistake it for a capital. In October the '
      + 'Soviet zone answers with the German Democratic Republic, whose '
      + 'name contains one true word. Each state claims to speak for the '
      + 'whole nation; each is recognized only by its own patron\'s half '
      + 'of the world; and along the line between them the century\'s '
      + 'strangest border begins to harden — not between two nations but '
      + 'through the middle of one. For Jerusalem the calculus is precise '
      + 'and painful: somewhere in the western twin\'s provisional '
      + 'chancellery, men are beginning to ask what, if anything, Germany '
      + 'can pay — and to whom — for what Germany did.',
    forTag: 'both',
    decider: 'SOV',
    date: { y: 1949, m: 10 },
    world: true,
    aiOption: 0,
    historical: 'The Federal Republic was proclaimed under the Basic Law in May 1949 and the DDR followed on 7 October; each claimed the whole nation and was recognized by half the world.',
    options: [
      {
        label: 'A Basic Law, deliberately not a constitution',
        tooltip: 'Occupied Germany becomes West Germany and begins the miracle: "The Wirtschaftswunder" (+10% income permanently). The eastern twin exists in prose and patrol maps. In Bonn, the reparations question is beginning to be asked.',
        effects: guard('ev_cw_two_germanies:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'GER')) {
            h.rebrandTag(ctx, 'GER', { name: 'West Germany' });
            h.addTagModifier(ctx, 'GER', {
              id: 'wirtschaftswunder', name: 'The Wirtschaftswunder', months: -1,
              effects: { incomeMult: 1.1 },
            });
          }
          h.setFlag(ctx, 'twoGermanies', true);
          h.chronicle(ctx, 'era', 'The occupation gives birth to twins — a Federal Republic under a deliberately provisional Basic Law, and a Democratic Republic whose name contains one true word.');
        }),
      },
    ],
  },

  // ── C4 · 1950 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_cw_korea',
    title: 'The War at the Other End of the World',
    worldLabel: 'North Korea invades the South; the UN goes to war',
    desc: 'At dawn on a June Sunday, the army of North Korea comes over the '
      + '38th parallel behind a Soviet-planned barrage, and the cold war '
      + 'discovers it can be hot as long as the principals hire out the '
      + 'dying. The United Nations — the same body whose partition map drew '
      + 'Israel into existence twenty-five months ago — votes to fight its '
      + 'first war, a vote that passes only because the Soviet delegate is '
      + 'boycotting the chamber and cannot veto it, a procedural accident '
      + 'neither superpower ever permits again. Sixteen nations send troops '
      + 'under an American general; China comes in when the line reaches '
      + 'its river; the front burns up and down the peninsula and freezes '
      + 'where it started. For the arsenals, everything changes: American '
      + 'defense spending triples in eighteen months, the surplus weapons '
      + 'of the last war stop being surplus, and every quartermaster from '
      + 'Cairo to Tel Aviv finds the second-hand market suddenly tight and '
      + 'the new-production market suddenly political. Rearmament is the '
      + 'world\'s business now. The Middle East\'s arms race adjusts its '
      + 'prices accordingly.',
    forTag: 'both',
    decider: 'SOV',
    date: { y: 1950, m: 6 },
    world: true,
    aiOption: 0,
    historical: 'North Korea invaded on 25 June 1950 with Stalin\'s prior approval; the UN fought its first war because the Soviet delegate was boycotting the veto, and rearmament tripled western defense budgets.',
    options: [
      {
        label: 'The principals hire out the dying',
        tooltip: 'Washington and Moscow set their opinion of each other at −180; the world\'s arms market tightens as production goes political. The UN has fought its first war on a procedural accident nobody will permit twice.',
        effects: guard('ev_cw_korea:0', (ctx) => {
          const h = ctx.helpers;
          setOpinion(ctx, 'USA', 'SOV', -180);
          setOpinion(ctx, 'SOV', 'USA', -180);
          h.setFlag(ctx, 'koreanWar', true);
          h.chronicle(ctx, 'era', 'The cold war turns hot at the other end of Asia, with the dying hired out; the arms market goes political, and the region\'s quartermasters adjust their prices.');
        }),
      },
    ],
  },

  // ── C5 · 1952 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_cw_slansky',
    title: 'The Trial in Prague',
    worldLabel: 'Czechoslovakia hangs its own as Zionist conspirators',
    desc: 'Four years ago Czechoslovakia armed Israel\'s independence — the '
      + 'Messerschmitts of Ad Halom flew from Czech fields, over Moscow\'s '
      + 'signature. This November, in the same state, fourteen leading '
      + 'Communists stand in a Prague courtroom reciting confessions '
      + 'rehearsed to the comma, and eleven of the fourteen are identified '
      + 'in the indictment as being "of Jewish origin." Rudolf Slánský, the '
      + 'party\'s own general secretary, is the lead defendant; the charge '
      + 'is a Trotskyist-Titoist-Zionist conspiracy in the service of '
      + 'American imperialism, and the evidence includes the arms deal '
      + 'itself — the very shipments that saved Tel Aviv now read into the '
      + 'record as treason. An Israeli citizen, Mordechai Oren, is in the '
      + 'dock to complete the geometry. Eleven hang; the ashes are spread '
      + 'on an icy road outside Prague by the security men, one of whom '
      + 'jokes about it in a report that survives. The signal is received '
      + 'in every capital that can read: the Soviet bloc has turned, '
      + 'officially and by name, against the state it helped arm — and '
      + 'against its own Jews, wherever they sit.',
    forTag: 'both',
    decider: 'CZE',
    date: { y: 1952, m: 11 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'The Slánský trial opened in Prague on 20 November 1952 with eleven of fourteen defendants labeled of Jewish origin; eleven were hanged, and the 1948 arms deal figured in the indictment as Zionist treason.',
    options: [
      {
        label: 'The arsenal of 1948 is read into the record as treason',
        tooltip: 'Prague\'s opinion of Israel is set at −120 and Moscow\'s falls to −100; Czechoslovakia −10 legitimacy and Boiohaemum +1 unrest for 24 months ("The Confessions"). The bloc has turned, officially and by name.',
        effects: guard('ev_cw_slansky:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'CZE')) {
            h.adjust(ctx, 'CZE', { legitimacy: -10 });
            setOpinion(ctx, 'CZE', 'ISR', -120);
          }
          setOpinion(ctx, 'SOV', 'ISR', -100);
          stir(ctx, ['Boiohaemum'], {
            id: 'the_confessions', name: 'The Confessions', months: 24,
            effects: { unrest: 1 },
          });
          h.setFlag(ctx, 'slanskyTrial', true);
          h.chronicle(ctx, 'era', 'Prague hangs eleven of its own leaders as Zionist conspirators, with the 1948 arms deal in the indictment; the bloc that armed the independence has turned against it by name.');
        }),
      },
    ],
  },

  // ── C6 · 1953 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_cw_stalin_dies',
    title: 'The Vozhd Is Dead',
    worldLabel: 'Stalin dies; the Doctors\' Plot dissolves with its author',
    desc: 'In January, Pravda announces that nine Kremlin doctors — six of '
      + 'them Jewish, the communiqué is particular on the point — have '
      + 'confessed to murdering Soviet leaders on the orders of an American '
      + 'Jewish organization. The arrests fan out, the denunciation '
      + 'quotas arrive at the provincial papers, and the oldest question in '
      + 'Jewish politics — how far does this one go — is being asked from '
      + 'Riga to Birobidzhan when, in March, the author of the script has a '
      + 'stroke at his dacha and lies untreated for hours, because his '
      + 'own best doctors are in the Lubyanka and nobody dares summon '
      + 'substitutes without instructions the patient can no longer give. '
      + 'He dies as he governed. Within a month the surviving doctors are '
      + 'released and the plot officially declared a fabrication — the '
      + 'first time the state has ever admitted inventing a case — and in '
      + 'Prague, Gottwald, who caught cold at the funeral, follows his '
      + 'patron in nine days, loyal past the end. The collective heirs '
      + 'begin, very carefully, to unclench. Nothing about the thaw is '
      + 'guaranteed; everything about it is negotiable; and for the '
      + 'communities inside the ice, negotiable is the first good news '
      + 'in years.',
    forTag: 'both',
    decider: 'SOV',
    date: { y: 1953, m: 3 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Stalin died on 5 March 1953, weeks after the Doctors\' Plot was announced; the surviving doctors were released in April and the case declared fabricated, and Gottwald died nine days after the funeral.',
    options: [
      {
        label: 'The doctors are released; the case is admitted invented',
        tooltip: 'Moscow seats Malenkov and the collective heirs: "The Thaw" (−0.5 unrest across the realm for 36 months), and the Kremlin\'s opinion of Israel eases by 60. Prague seats Zápotocký. Negotiable is the first good news in years.',
        effects: guard('ev_cw_stalin_dies:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'SOV')) {
            h.setRuler(ctx, 'SOV', { name: 'Georgy Malenkov', title: 'Chairman of the Council of Ministers', gov: 3, infl: 3, mar: 2, age: 51 });
            h.addTagModifier(ctx, 'SOV', {
              id: 'the_thaw', name: 'The Thaw', months: 36,
              effects: { unrestAll: -0.5 },
            });
            easeOpinion(ctx, 'SOV', 'ISR', 60);
          }
          if (alive(ctx, 'CZE')) {
            h.setRuler(ctx, 'CZE', { name: 'Antonín Zápotocký', title: 'President', gov: 2, infl: 2, mar: 1, age: 68 });
          }
          h.setFlag(ctx, 'stalinDead', true);
          h.chronicle(ctx, 'era', 'Stalin dies untreated because his doctors are in the Lubyanka; the plot is admitted invented, and the heirs begin, very carefully, to unclench.');
        }),
      },
    ],
  },

  // ── C7 · 1955 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_cw_warsaw_pact',
    title: 'The Answer to Bonn',
    worldLabel: 'West Germany joins NATO; the Warsaw Pact answers',
    desc: 'Ten years after the surrender, West Germany puts on a uniform '
      + 'again — admitted to NATO on the fifth of May, the new Bundeswehr '
      + 'capped, watched, and integrated into an alliance precisely so that '
      + 'it can never again be an army with a country attached. Nine days '
      + 'later, in Warsaw, the Soviet Union signs its eight-nation answer: '
      + 'a Treaty of Friendship, Cooperation and Mutual Assistance whose '
      + 'operative clause, unwritten, is that the armies of the people\'s '
      + 'democracies now have a single command and it sits in Moscow. '
      + 'Nothing on the ground changes — the divisions were already where '
      + 'the divisions are — but the paperwork completes the century\'s '
      + 'strangest map: two alliances facing each other along a line no '
      + 'treaty ever drew, from the Baltic to the Adriatic, fixed in 1945 '
      + 'by where the armies happened to stop and now consecrated by two '
      + 'sets of signatures. The line will hold for thirty-four years, '
      + 'and the first army the Pact ever fights will be a member\'s own '
      + 'population.',
    forTag: 'both',
    decider: 'SOV',
    date: { y: 1955, m: 5 },
    world: true,
    aiOption: 0,
    historical: 'West Germany entered NATO on 5 May 1955 and the Warsaw Pact was signed on 14 May; the two alliances faced each other along the line where the armies had stopped in 1945.',
    options: [
      {
        label: 'A single command, and it sits in Moscow',
        tooltip: 'The Pact capitals — Moscow, Warsaw, Prague, Budapest, Sofia, Bucharest — set their mutual opinion at +100. The map is complete: two alliances along a line no treaty drew, consecrated by two sets of signatures.',
        effects: guard('ev_cw_warsaw_pact:0', (ctx) => {
          const h = ctx.helpers;
          for (const a of PACT_TAGS) {
            if (!alive(ctx, a)) continue;
            for (const b of PACT_TAGS) {
              if (a === b || !alive(ctx, b)) continue;
              const t = ctx.game.tags[a];
              if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
              t.opinion[b] = Math.max(t.opinion[b] || 0, 100);
            }
          }
          h.setFlag(ctx, 'warsawPact', true);
          h.chronicle(ctx, 'era', 'Bonn puts on a uniform inside NATO and Moscow answers with the Warsaw Pact; the line the armies drew in 1945 is consecrated by two sets of signatures.');
        }),
      },
    ],
  },

  // ── C8 · 1956 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_cw_secret_speech',
    title: 'The Speech Behind Closed Doors',
    worldLabel: 'Khrushchev denounces Stalin to a closed congress',
    desc: 'On the last night of the Twentieth Party Congress, the foreign '
      + 'delegations are sent home and the doors are closed, and Nikita '
      + 'Khrushchev talks for four hours about the man whose portrait still '
      + 'hangs in every room in the country: the cult of personality, the '
      + 'fabricated cases, the tortured confessions, the war nearly lost to '
      + 'one man\'s purge of his own officer corps. Delegates faint and are '
      + 'carried out. Nothing is published — the text is read aloud at '
      + 'closed party meetings across the bloc, which is how a copy reaches '
      + 'a Polish translator, and from Warsaw, by a route that runs through '
      + 'a Jewish journalist and the Israeli embassy, to Tel Aviv, where '
      + 'the Shin Bet hands it to a CIA that has been chasing rumors of it '
      + 'for months. The State Department prints it entire; the New York '
      + 'Times runs every word. The empire\'s own indictment of its founder, '
      + 'delivered to the world by the smallest intelligence service in the '
      + 'game — it is the young state\'s first great coup, and the quietest. '
      + 'In the bloc, the speech lands like thaw water on packed ice: '
      + 'Poland\'s workers are in the streets by summer, and Budapest is '
      + 'listening very carefully.',
    forTag: 'both',
    decider: 'SOV',
    date: { y: 1956, m: 2 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Khrushchev delivered the secret speech on 25 February 1956; the copy the West published travelled from a Warsaw reading through Israeli intelligence to the CIA.',
    options: [
      {
        label: 'The copy travels through Warsaw and Tel Aviv',
        tooltip: 'Moscow seats Khrushchev in full: −10 legitimacy as the founder\'s cases are admitted fabricated. Poland and Hungary carry "The Thaw Stirs" (+0.5 unrest across each realm for 12 months). Israel +10 influence points — the smallest service in the game delivers the century\'s document.',
        effects: guard('ev_cw_secret_speech:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'SOV')) {
            h.setRuler(ctx, 'SOV', { name: 'Nikita Khrushchev', title: 'First Secretary', gov: 3, infl: 3, mar: 3, age: 61 });
            h.adjust(ctx, 'SOV', { legitimacy: -10 });
          }
          for (const t of ['POL', 'HUN']) {
            if (!alive(ctx, t)) continue;
            h.addTagModifier(ctx, t, {
              id: 'the_thaw_stirs', name: 'The Thaw Stirs', months: 12,
              effects: { unrestAll: 0.5 },
            });
          }
          if (alive(ctx, 'ISR')) h.adjust(ctx, 'ISR', { infl: 10 });
          h.setFlag(ctx, 'secretSpeech', true);
          h.chronicle(ctx, 'era', 'Khrushchev indicts the founder behind closed doors; the copy the world reads travels through Warsaw and Tel Aviv, and the thaw water lands on packed ice.');
        }),
      },
    ],
  },

  // ── C9 · 1956 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_cw_budapest',
    title: 'The Tanks Return in November',
    worldLabel: 'The Hungarian rising is crushed as the world watches Suez',
    desc: 'It begins with students marching for the Poles and ends with a '
      + 'city fighting armor with petrol bottles. Stalin\'s statue comes '
      + 'down on the first night, sawed off at the boots; the security '
      + 'police fire into the crowds and are hunted through the streets '
      + 'for it; Imre Nagy — a reform Communist swept along faster than '
      + 'he can steer — announces multiparty government, withdrawal from '
      + 'the Warsaw Pact, neutrality. For five days it appears to have '
      + 'worked; the Soviet withdrawal is even announced. Then the '
      + 'Presidium reverses itself — the deciding argument, in the minutes, '
      + 'is that the West is paralyzed by its own crisis at Suez, and so '
      + 'it proves: the same fortnight, the same front pages, each crisis '
      + 'the other\'s cover. Seventeen divisions come back in on the '
      + 'fourth of November. Budapest fights for a week; two hundred '
      + 'thousand people walk out through the marshes into Austria; Nagy '
      + 'is taken from the Yugoslav embassy under safe conduct, which by '
      + 'now no one believes, and will be hanged after a secret trial. '
      + 'János Kádár, installed by the tanks, will govern for thirty-two '
      + 'years. Radio Free Europe\'s broadcasts had promised more than '
      + 'anyone intended to send, and the bloc\'s populations file the '
      + 'lesson beside the corpses: nobody is coming.',
    forTag: 'both',
    decider: 'SOV',
    date: { y: 1956, m: 10 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'The rising began on 23 October 1956 and the second Soviet intervention crushed it from 4 November, under cover of the Suez fortnight; Nagy was hanged in 1958 and Kádár ruled thirty-two years.',
    options: [
      {
        label: 'Each crisis is the other\'s cover',
        tooltip: 'Moscow installs Kádár: Hungary −20 legitimacy, "The Normalization" (+1 unrest across the realm for 24 months), and Aquincum +3 unrest for 12 months ("The Pest Barricades"). Moscow −5 legitimacy, and the western capitals\' opinion of it falls by 60. Nobody is coming.',
        effects: guard('ev_cw_budapest:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'HUN')) {
            h.setRuler(ctx, 'HUN', { name: 'János Kádár', title: 'First Secretary', gov: 3, infl: 2, mar: 1, age: 44 });
            h.adjust(ctx, 'HUN', { legitimacy: -20 });
            h.addTagModifier(ctx, 'HUN', {
              id: 'the_normalization', name: 'The Normalization', months: 24,
              effects: { unrestAll: 1 },
            });
          }
          if (alive(ctx, 'SOV')) h.adjust(ctx, 'SOV', { legitimacy: -5 });
          for (const t of ['USA', 'UK', 'FRA', 'ITA', 'GER']) {
            if (alive(ctx, t)) easeOpinion(ctx, t, 'SOV', -60);
          }
          stir(ctx, ['Aquincum'], {
            id: 'pest_barricades', name: 'The Pest Barricades', months: 12,
            effects: { unrest: 3 },
          });
          h.setFlag(ctx, 'hungarianRising', true);
          h.chronicle(ctx, 'era', 'Budapest fights seventeen divisions with petrol bottles while the world watches Suez — each crisis the other\'s cover; two hundred thousand walk out through the marshes.');
        }),
      },
    ],
  },

  // ── C10 · 1957 ────────────────────────────────────────────────────────────
  {
    id: 'ev_cw_sputnik',
    title: 'A Moon Made by Hands',
    worldLabel: 'Sputnik crosses every sky on the planet',
    desc: 'A polished aluminum sphere the size of a beach ball, launched from '
      + 'a secret steppe cosmodrome on a rocket built to carry something '
      + 'much heavier and much worse, crosses the sky of every country on '
      + 'earth once every ninety-six minutes, transmitting a steady beep '
      + 'on frequencies chosen so that any radio amateur can hear it — '
      + 'which is the point: the demonstration is addressed to everyone. '
      + 'In Washington the shock is genuine and productive — within a year '
      + 'there is a space agency, an education act, and a research '
      + 'directorate whose projects will include, eventually, a network '
      + 'for computers to talk to each other. In the rest of the world '
      + 'the calculus is simpler: the power that was supposed to be the '
      + 'peasant empire has put the first object into orbit, and the '
      + 'argument about whose grandchildren will own the century is now '
      + 'audible on shortwave, twice an orbit, over every capital in the '
      + 'game.',
    forTag: 'both',
    decider: 'SOV',
    date: { y: 1957, m: 10 },
    world: true,
    aiOption: 0,
    historical: 'Sputnik 1 was launched on 4 October 1957 and beeped over every country for three weeks; the American answer included NASA, the education act and ARPA.',
    options: [
      {
        label: 'Audible on shortwave, twice an orbit',
        tooltip: 'Moscow +10 legitimacy and +15 military points — the R-7 that carried the sphere is built to carry something worse, and every general staff has done the subtraction. The argument about the century is now broadcast.',
        effects: guard('ev_cw_sputnik:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'SOV')) h.adjust(ctx, 'SOV', { legitimacy: 10, mar: 15 });
          h.setFlag(ctx, 'sputnik', true);
          h.chronicle(ctx, 'era', 'A beeping aluminum sphere crosses every sky twice an orbit; the argument about whose grandchildren own the century is now audible on shortwave.');
        }),
      },
    ],
  },

  // ── C11 · 1961 ────────────────────────────────────────────────────────────
  {
    id: 'ev_cw_berlin_wall',
    title: 'The Wall Goes Up on a Sunday',
    worldLabel: 'East Germany walls off West Berlin overnight',
    desc: 'Two months ago Walter Ulbricht told a press conference that nobody '
      + 'has the intention of building a wall — the first time the word had '
      + 'been said aloud, and in retrospect the announcement. In the small '
      + 'hours of an August Sunday the city wakes to soldiers unrolling '
      + 'barbed wire down the middle of streets, tram lines cut mid-route, '
      + 'the S-Bahn dead, families waving across a wire that will be '
      + 'concrete within the month. The republic\'s citizens had been '
      + 'leaving through the Berlin door at three thousand a week — '
      + 'doctors, engineers, whole graduating classes — and the state '
      + 'has solved its emigration problem with masonry, sealing its '
      + 'own people in and calling the structure an anti-fascist '
      + 'protective rampart, a name so exactly wrong that even its own '
      + 'guards do not use it. The West protests and does nothing, '
      + 'which is the true text of the crisis: a wall that keeps a '
      + 'population in is, by the cold war\'s accounting, stability. '
      + 'It will stand twenty-eight years, and be the one structure on '
      + 'earth whose demolition will be the good news.',
    forTag: 'both',
    decider: 'SOV',
    date: { y: 1961, m: 8 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'The sector border was wired shut in the night of 12–13 August 1961 and the wall stood twenty-eight years; Ulbricht had denied the intention two months before.',
    options: [
      {
        label: 'The emigration problem is solved with masonry',
        tooltip: 'The eastern zone quiets behind the concrete: Semnones carries "The Rampart" (−1 unrest permanently, −10% tax). West Germany\'s opinion of Moscow falls to −120. A wall that keeps a population in counts, by the era\'s accounting, as stability.',
        effects: guard('ev_cw_berlin_wall:0', (ctx) => {
          const h = ctx.helpers;
          stir(ctx, ['Semnones'], {
            id: 'the_rampart', name: 'The Rampart', months: -1,
            effects: { unrest: -1, taxMult: 0.9 },
          });
          if (alive(ctx, 'GER')) setOpinion(ctx, 'GER', 'SOV', -120);
          h.setFlag(ctx, 'berlinWall', true);
          h.chronicle(ctx, 'era', 'The city wakes to wire down the middle of its streets; the state has solved its emigration problem with masonry, and the West\'s protest is the doing of nothing.');
        }),
      },
    ],
  },

  // ── C12 · 1962 ────────────────────────────────────────────────────────────
  {
    id: 'ev_cw_cuba',
    title: 'Thirteen Days',
    worldLabel: 'The missiles of October: the world\'s closest pass',
    desc: 'An American reconnaissance aircraft photographs missile sites '
      + 'under construction on an island ninety miles from Florida, and '
      + 'for thirteen days in October the two arsenals stand closer to '
      + 'firing than they have ever stood or ever will again. The '
      + 'blockade is called a quarantine because a blockade is an act of '
      + 'war; the letters between Kennedy and Khrushchev arrive faster '
      + 'than the machinery for answering them; a Soviet submarine, '
      + 'depth-charged to the surface and out of contact with Moscow, '
      + 'comes within one officer\'s refusal of firing a nuclear torpedo, '
      + 'a fact both governments will be spared knowing for decades. The '
      + 'resolution is the era in miniature: public Soviet withdrawal '
      + 'for a public American pledge not to invade the island, plus a '
      + 'secret trade — the American missiles in Turkey, gone within '
      + 'months — that both capitals agree to lie about, so that the '
      + 'winner\'s version can be taught while the loser\'s concession is '
      + 'delivered. Afterward the two install a direct teletype line, '
      + 'having discovered that the end of the world had been, among '
      + 'other things, a clerical risk. The strategy of the following '
      + 'decades is written in these two weeks: never again this close, '
      + 'which means every future war will be fought somewhere else, '
      + 'by someone else — a rule the Middle East will spend the next '
      + 'twenty years illustrating.',
    forTag: 'both',
    decider: 'SOV',
    date: { y: 1962, m: 10 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'The crisis ran 16–28 October 1962 and ended with public withdrawal, a no-invasion pledge, and the secret Jupiter trade; the hotline followed in 1963.',
    options: [
      {
        label: 'Both capitals agree to lie about the terms',
        tooltip: 'Washington and Moscow each carry "The Brink" for 24 months (the AI stands down from adventures) and their mutual opinion eases by 40 afterward — never again this close, which means every future war is fought somewhere else, by someone else.',
        effects: guard('ev_cw_cuba:0', (ctx) => {
          const h = ctx.helpers;
          for (const t of ['USA', 'SOV']) {
            if (!alive(ctx, t)) continue;
            h.addTagModifier(ctx, t, {
              id: 'the_brink', name: 'The Brink', months: 24,
              effects: { aiPassive: 1 },
            });
          }
          easeOpinion(ctx, 'USA', 'SOV', 40);
          easeOpinion(ctx, 'SOV', 'USA', 40);
          h.setFlag(ctx, 'cubanMissiles', true);
          h.chronicle(ctx, 'era', 'For thirteen days the arsenals stand closer than they will ever stand again; the resolution is a public trade and a secret one, and both capitals agree to lie about the terms.');
        }),
      },
    ],
  },

  // ── C13 · 1964 ────────────────────────────────────────────────────────────
  {
    id: 'ev_cw_brezhnev',
    title: 'The Comrades Retire Him',
    worldLabel: 'Khrushchev is deposed by a vote; Brezhnev takes the chair',
    desc: 'Khrushchev is summoned back from holiday to a Presidium that has '
      + 'already counted itself, listens to an indictment of his '
      + '"hare-brained scheming" — Cuba, the corn campaigns, the crockery '
      + 'diplomacy — and discovers that the machine he built no longer '
      + 'needs him to operate it. He goes quietly, and is heard afterward, '
      + 'in the retirement no Soviet leader before him lived to have, '
      + 'making the one observation that matters: perhaps his real '
      + 'achievement is that they could remove him with a vote, which '
      + 'with his predecessor would have required a funeral. Leonid '
      + 'Brezhnev takes the general secretaryship — the eyebrows, the '
      + 'medals he awards himself by the row, and underneath the '
      + 'affability a genuine political gift for the only constituency '
      + 'that now matters, the apparatus itself, which wants exactly what '
      + 'he offers: stability of cadres, which means jobs for life, which '
      + 'means, over the coming eighteen years, a government aging in '
      + 'place while the economy underneath it quietly stops growing. '
      + 'The era will need a name and will get one from the man who '
      + 'ends it: stagnation.',
    forTag: 'both',
    decider: 'SOV',
    date: { y: 1964, m: 10 },
    world: true,
    aiOption: 0,
    historical: 'The Presidium removed Khrushchev on 14 October 1964; he noted from retirement that removing a leader by vote was itself his achievement. Brezhnev\'s stability of cadres became eighteen years of stagnation.',
    options: [
      {
        label: 'Stability of cadres, jobs for life',
        tooltip: 'Moscow seats Brezhnev: +1 stability now, and "The Era of Stagnation" (−10% growth permanently) as the government ages in place. Removal by vote rather than funeral is, as the retired man says, the achievement.',
        effects: guard('ev_cw_brezhnev:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'SOV')) {
            h.setRuler(ctx, 'SOV', { name: 'Leonid Brezhnev', title: 'General Secretary', gov: 2, infl: 3, mar: 2, age: 57 });
            h.adjust(ctx, 'SOV', { stability: 1 });
            h.addTagModifier(ctx, 'SOV', {
              id: 'era_of_stagnation', name: 'The Era of Stagnation', months: -1,
              effects: { growthMult: 0.9 },
            });
          }
          h.setFlag(ctx, 'khrushchevOut', true);
          h.chronicle(ctx, 'era', 'The comrades retire Khrushchev by a vote — with his predecessor it would have required a funeral; Brezhnev offers the apparatus jobs for life, and the era gets its name later.');
        }),
      },
    ],
  },

  // ── C14 · 1968 ────────────────────────────────────────────────────────────
  {
    id: 'ev_cw_prague_spring',
    title: 'The Tanks in Wenceslas Square',
    worldLabel: 'The Warsaw Pact invades Czechoslovakia',
    desc: 'For eight months Czechoslovakia has been conducting the bloc\'s '
      + 'most dangerous experiment: socialism with a human face, which in '
      + 'practice means a press that prints what happened, an economy '
      + 'debated in public, and a party leadership — Alexander Dubček, '
      + 'earnest, slow-moving, fatally decent — that believes the Soviet '
      + 'Union can be reasoned with about all of it. On the night of '
      + 'August twentieth, half a million men of five Pact armies answer '
      + 'the reasoning. There is no resistance to speak of, which is the '
      + 'point Prague makes instead with paint: street signs vanish '
      + 'overnight so the convoys navigate a country with no names, and '
      + 'the radio broadcasts to the end pleading no violence, only '
      + 'contempt. Dubček is flown to Moscow in handcuffs, returned '
      + 'broken to preside over his own dismantling; a philosophy student '
      + 'named Jan Palach will burn himself alive in Wenceslas Square in '
      + 'January to argue against the settling of the dust. The doctrine '
      + 'that follows bears Brezhnev\'s name — the sovereignty of any '
      + 'socialist state ends where socialism is judged at risk, judged '
      + 'by Moscow — and a generation of Western Communists hands in its '
      + 'card. Twenty years ago this state armed Israel\'s independence '
      + 'over Moscow\'s signature. The signature now countersigns tank '
      + 'orders, and the arsenal of 1948 has been a garrison of 1968 for '
      + 'one week short of twenty years.',
    forTag: 'both',
    decider: 'SOV',
    date: { y: 1968, m: 8 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Five Pact armies invaded on the night of 20–21 August 1968; Dubček was taken to Moscow in handcuffs and normalization followed under Husák, with Palach\'s protest in January.',
    options: [
      {
        label: 'A country with no street signs',
        tooltip: 'Prague is normalized under Husák: Czechoslovakia −15 legitimacy and Boiohaemum +2 unrest for 24 months ("The August Tanks"). Moscow −5 legitimacy, and the western capitals\' opinion of it falls by 40. The doctrine gets Brezhnev\'s name.',
        effects: guard('ev_cw_prague_spring:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'CZE')) {
            h.setRuler(ctx, 'CZE', { name: 'Gustáv Husák', title: 'First Secretary', gov: 2, infl: 2, mar: 1, age: 55 });
            h.adjust(ctx, 'CZE', { legitimacy: -15 });
          }
          if (alive(ctx, 'SOV')) h.adjust(ctx, 'SOV', { legitimacy: -5 });
          for (const t of ['USA', 'UK', 'FRA', 'ITA', 'GER']) {
            if (alive(ctx, t)) easeOpinion(ctx, t, 'SOV', -40);
          }
          stir(ctx, ['Boiohaemum'], {
            id: 'the_august_tanks', name: 'The August Tanks', months: 24,
            effects: { unrest: 2 },
          });
          h.setFlag(ctx, 'pragueSpring', true);
          h.chronicle(ctx, 'era', 'Half a million men answer the human face, and Prague takes down its street signs; the arsenal of 1948 has been a garrison for twenty years less a week.');
        }),
      },
    ],
  },

  // ── C15 · 1970 ────────────────────────────────────────────────────────────
  {
    id: 'ev_cw_kniefall',
    title: 'The Chancellor Falls to His Knees',
    worldLabel: 'Brandt kneels at the Warsaw Ghetto memorial',
    desc: 'Willy Brandt — who spent the war in the Norwegian resistance, '
      + 'which is why his enemies at home call him a traitor and why this '
      + 'moment is possible at all — comes to Warsaw to sign the treaty '
      + 'accepting Germany\'s eastern border, the one concession no West '
      + 'German government has been willing to put on paper. The '
      + 'ceremony\'s script has him lay a wreath at the memorial to the '
      + 'Ghetto rising. He straightens the ribbon, steps back, and then, '
      + 'unscripted, in the December drizzle, kneels — and stays kneeling, '
      + 'silent, for half a minute that the photographers cannot believe '
      + 'their luck at and the Polish officials cannot find a protocol '
      + 'for. Asked later, he says only that at the abyss of German '
      + 'history, carrying the burden of the millions murdered, he did '
      + 'what people do when words fail. Half his own country, polled '
      + 'that month, calls it excessive. The other half understands that '
      + 'a man with no personal guilt knelt for those who should have '
      + 'and never would — and in the same December week, on the Baltic '
      + 'coast, Polish shipyard workers are shot down by their own '
      + 'state over the price of food, Gomułka falls, and the century '
      + 'files another entry under both of its headings at once.',
    forTag: 'both',
    decider: 'GER',
    date: { y: 1970, m: 12 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Brandt knelt unscripted at the Warsaw Ghetto memorial on 7 December 1970 while signing the border treaty; the same month\'s coast riots brought down Gomułka.',
    options: [
      {
        label: 'What people do when words fail',
        tooltip: 'West Germany +10 legitimacy; its opinion with Israel and Poland eases by 60 each way. Poland seats Gierek after the December on the coast. The century files an entry under both of its headings at once.',
        effects: guard('ev_cw_kniefall:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'GER')) {
            h.adjust(ctx, 'GER', { legitimacy: 10 });
            easeOpinion(ctx, 'GER', 'ISR', 60);
            easeOpinion(ctx, 'ISR', 'GER', 60);
            easeOpinion(ctx, 'GER', 'POL', 60);
            easeOpinion(ctx, 'POL', 'GER', 60);
          }
          if (alive(ctx, 'POL')) {
            h.setRuler(ctx, 'POL', { name: 'Edward Gierek', title: 'First Secretary', gov: 3, infl: 2, mar: 1, age: 57 });
          }
          h.setFlag(ctx, 'kniefall', true);
          h.chronicle(ctx, 'era', 'The German chancellor kneels unscripted at the Ghetto memorial for half a silent minute; the same week, Polish workers are shot over the price of food.');
        }),
      },
    ],
  },

  // ── C16 · 1975 ────────────────────────────────────────────────────────────
  {
    id: 'ev_cw_helsinki',
    title: 'The Third Basket',
    worldLabel: 'Helsinki: borders recognized, and a basket nobody read',
    desc: 'Thirty-five states sign the Helsinki Final Act, the closest thing '
      + 'the divided continent will ever get to a peace treaty for the war '
      + 'that ended thirty years ago. Moscow gets what it has wanted since '
      + '1945 — the borders of Eastern Europe recognized as inviolable, the '
      + 'conquests legitimized in western ink. The price is the third '
      + 'basket, a catalogue of humanitarian undertakings: freer movement '
      + 'of people, reunification of families, the right to know and act '
      + 'upon one\'s rights. The Soviet negotiators sign it as decoration; '
      + 'the dissidents read it as a receipt. Within a year there are '
      + 'Helsinki monitoring groups in Moscow and Kyiv staffed by people '
      + 'prepared to be arrested for quoting their own government\'s '
      + 'signature, and the refuseniks — the Jews whose exit visas are '
      + 'refused, fired from their work for applying, and prosecuted as '
      + 'parasites for being fired — now have their case pinned to an '
      + 'international document. A movement with two addresses, Moscow '
      + 'and Jerusalem, has acquired its charter. What Israel does with '
      + 'it is a genuine choice of statecraft: the public campaign that '
      + 'names every prisoner, or the quiet channel that ransoms them '
      + 'one at a time.',
    forTag: 'both',
    date: { y: 1975, m: 8 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'The Final Act was signed on 1 August 1975; the third basket\'s humanitarian clauses armed the Helsinki groups and the Soviet Jewry movement, and the public campaign became the historical road.',
    options: [
      {
        label: 'Name every prisoner — the campaign goes public',
        tooltip: 'Israel +10 influence points and "The Struggle Public" (+5% income for 60 months — the diaspora mobilizes); Moscow\'s opinion of Israel falls by 40. The refuseniks\' names go on front pages and stay there.',
        effects: guard('ev_cw_helsinki:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ISR')) {
            h.adjust(ctx, 'ISR', { infl: 10 });
            h.addTagModifier(ctx, 'ISR', {
              id: 'struggle_public', name: 'The Struggle Public', months: 60,
              effects: { incomeMult: 1.05 },
            });
          }
          easeOpinion(ctx, 'SOV', 'ISR', -40);
          h.setFlag(ctx, 'helsinkiLoud', true);
          h.chronicle(ctx, 'era', 'Helsinki trades recognized borders for a basket the dissidents read as a receipt; the refuseniks\' names go on the front pages, and stay there.');
        }),
      },
      {
        label: 'Work the quiet channels',
        tooltip: 'Israel +10 governance points — the ransom diplomacy runs case by case through third capitals, and Moscow\'s opinion is not spent. Fewer names in the papers; some more names on the flights.',
        effects: guard('ev_cw_helsinki:1', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ISR')) h.adjust(ctx, 'ISR', { gov: 10 });
          h.setFlag(ctx, 'helsinkiQuiet', true);
          h.chronicle(ctx, 'era', 'Helsinki trades recognized borders for a basket the dissidents read as a receipt; Jerusalem works the clause through quiet channels, case by case.');
        }),
      },
    ],
  },

  // ── C17 · 1979 ────────────────────────────────────────────────────────────
  {
    id: 'ev_cw_afghanistan',
    title: 'The Airlift to Kabul',
    worldLabel: 'The Soviet army goes into Afghanistan',
    desc: 'On Christmas week the transports begin landing at Kabul airport '
      + 'in a stream, and by New Year the Soviet Union has done the thing '
      + 'its own doctrine reserved for Europe: invaded a country to fix '
      + 'its government. The client president — himself in power three '
      + 'months, having suffocated his predecessor with a pillow — is '
      + 'shot in his palace by the special forces sent, on paper, to '
      + 'protect him, and the Politburo minutes record the whole '
      + 'operation under a phrase of perfect bureaucratic anesthesia: '
      + '"the measures." The measures will run nine years, kill a '
      + 'million Afghans and fifteen thousand Soviet soldiers, and '
      + 'convert the empire\'s southern frontier into a subscription '
      + 'war financed from three directions — American money, Saudi '
      + 'money, Pakistani logistics — through which the century\'s next '
      + 'protagonists are, at this moment, being armed and introduced '
      + 'to one another. Détente is over: the grain embargo, the '
      + 'Olympic boycott, the missiles into Europe. Gorbachev, six '
      + 'years from power, will need only one phrase for it, and it '
      + 'will be a doctor\'s: the bleeding wound.',
    forTag: 'both',
    decider: 'SOV',
    date: { y: 1979, m: 12 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'The airlift into Kabul began on 24 December 1979 and Amin was shot on the 27th; the Politburo minutes called the invasion "the measures," and the war ran nine years.',
    options: [
      {
        label: 'The measures',
        tooltip: 'Moscow takes "The Bleeding Wound" (−5% manpower, −5% income permanently until history relieves it); Washington\'s opinion of Moscow falls to −180, and Riyadh\'s and Tehran\'s harden by 60. The next protagonists are being armed and introduced.',
        effects: guard('ev_cw_afghanistan:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'SOV')) {
            h.addTagModifier(ctx, 'SOV', {
              id: 'bleeding_wound', name: 'The Bleeding Wound', months: -1,
              effects: { manpowerMult: 0.95, incomeMult: 0.95 },
            });
          }
          setOpinion(ctx, 'USA', 'SOV', -180);
          for (const t of ['SAU', 'IRN']) {
            if (alive(ctx, t)) easeOpinion(ctx, t, 'SOV', -60);
          }
          h.setFlag(ctx, 'afghanistan', true);
          h.chronicle(ctx, 'era', 'The transports stream into Kabul and the Politburo files it as "the measures"; the bleeding wound opens, and the next protagonists are introduced to one another.');
        }),
      },
    ],
  },

  // ── C18 · 1981 ────────────────────────────────────────────────────────────
  {
    id: 'ev_cw_solidarity',
    title: 'The General\'s Winter',
    worldLabel: 'Martial law crushes Solidarity in Poland',
    desc: 'It began in August of last year with an electrician climbing the '
      + 'fence of the Lenin Shipyard in Gdańsk to lead a strike he was '
      + 'late for — and became, in sixteen months, the thing the doctrine '
      + 'said could not exist: an independent trade union of ten million '
      + 'members in a workers\' state, which is to say, the workers of a '
      + 'workers\' state organized against it, with the Church holding '
      + 'its coat. Warned repeatedly that the tanks of 1956 and 1968 '
      + 'were available, Solidarity restrained itself into legality; '
      + 'the state solved the contradiction from inside. On a December '
      + 'night General Jaruzelski — dark glasses, ramrod bearing, a '
      + 'biography that runs through Soviet labor camps to this desk — '
      + 'declares a state of war against his own country: the phones go '
      + 'dead at midnight, the tanks take the intersections in the snow, '
      + 'ten thousand are interned by morning, and at the Wujek mine '
      + 'nine strikers are shot dead by the riot police. The general '
      + 'will argue to his grave that he chose the lesser evil, a '
      + 'Polish martial law over a Soviet invasion, and the archives '
      + 'will keep the question honestly murky. The union goes '
      + 'underground with its printing presses and its priests. '
      + 'Nothing in the bloc is solved, and everyone knows the '
      + 'difference now between solved and postponed.',
    forTag: 'both',
    decider: 'POL',
    date: { y: 1981, m: 12 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Solidarity grew from the Gdańsk strike of August 1980 to ten million members; Jaruzelski declared martial law on 13 December 1981, interning thousands, with nine miners killed at Wujek.',
    options: [
      {
        label: 'A state of war against his own country',
        tooltip: 'Poland seats Jaruzelski: +1 stability, −20 legitimacy, and "The State of War" (−1 unrest across the realm, −10% income for 60 months) — suppression that works and impoverishes at once. The difference between solved and postponed is now public knowledge.',
        effects: guard('ev_cw_solidarity:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'POL')) {
            h.setRuler(ctx, 'POL', { name: 'Wojciech Jaruzelski', title: 'Chairman of the Military Council', gov: 3, infl: 2, mar: 3, age: 58 });
            h.adjust(ctx, 'POL', { stability: 1, legitimacy: -20 });
            h.addTagModifier(ctx, 'POL', {
              id: 'state_of_war', name: 'The State of War', months: 60,
              effects: { unrestAll: -1, incomeMult: 0.9 },
            });
          }
          h.setFlag(ctx, 'martialLawPoland', true);
          h.chronicle(ctx, 'era', 'The general declares a state of war against his own country and the tanks take the intersections in the snow; the union goes underground with its presses and its priests.');
        }),
      },
    ],
  },

  // ── C19 · 1985 ────────────────────────────────────────────────────────────
  {
    id: 'ev_cw_gorbachev',
    title: 'A Younger Man Takes the Chair',
    worldLabel: 'Gorbachev is General Secretary; the words are new',
    desc: 'Three general secretaries have died in office in three years — '
      + 'Brezhnev, then Andropov\'s kidneys, then Chernenko\'s emphysema, '
      + 'the state lying about each diagnosis until the funeral '
      + 'announced it, until the joke in Moscow is that the Politburo '
      + 'has season tickets to the Kremlin wall. The fourth choice '
      + 'breaks the pattern by arithmetic if nothing else: Mikhail '
      + 'Gorbachev is fifty-four, the first leader younger than the '
      + 'revolution\'s veterans, endorsed to his colleagues by the old '
      + 'foreign minister Gromyko with the era\'s most quoted '
      + 'testimonial — this man has a nice smile, but he has iron '
      + 'teeth. The new words arrive within the year: glasnost, '
      + 'openness, which will prove to mean that the state\'s account '
      + 'of itself becomes falsifiable; perestroika, rebuilding, which '
      + 'will prove to mean that the rebuilding is attempted on a '
      + 'structure whose load-bearing walls are the lies glasnost is '
      + 'removing. He intends, sincerely, to save the system. The '
      + 'system\'s problem is that it cannot survive sincerity. Nobody '
      + 'in this March knows that — but every chancery notes the age, '
      + 'the smile, the teeth, and begins, cautiously, to redraft its '
      + 'assumptions.',
    forTag: 'both',
    decider: 'SOV',
    date: { y: 1985, m: 3 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Gorbachev was elected General Secretary on 11 March 1985 after three deaths in office in three years; Gromyko\'s endorsement promised iron teeth behind the smile.',
    options: [
      {
        label: 'A nice smile, and iron teeth',
        tooltip: 'Moscow seats Gorbachev: the Era of Stagnation modifier is lifted, replaced by "Perestroika" (−5% income, +0.5 unrest across the realm for 84 months) — honest rebuilding on load-bearing lies. Every chancery redrafts its assumptions.',
        effects: guard('ev_cw_gorbachev:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'SOV')) {
            h.setRuler(ctx, 'SOV', { name: 'Mikhail Gorbachev', title: 'General Secretary', gov: 4, infl: 4, mar: 2, age: 54 });
            h.removeModifier(ctx, 'SOV', 'era_of_stagnation');
            h.addTagModifier(ctx, 'SOV', {
              id: 'perestroika', name: 'Perestroika', months: 84,
              effects: { incomeMult: 0.95, unrestAll: 0.5 },
            });
          }
          h.setFlag(ctx, 'gorbachev', true);
          h.chronicle(ctx, 'era', 'After three funerals in three years, a fifty-four-year-old takes the chair with a nice smile and iron teeth; the new words are glasnost and perestroika, and the system cannot survive sincerity.');
        }),
      },
    ],
  },

  // ── C20 · 1986 ────────────────────────────────────────────────────────────
  {
    id: 'ev_cw_chernobyl',
    title: 'The Reactor at the Edge of the Marsh',
    worldLabel: 'Chernobyl burns; the state\'s reflex is the lie',
    desc: 'At 1:23 in the morning, during a safety test conducted with the '
      + 'safety systems disabled, reactor four at Chernobyl tears itself '
      + 'apart and burns open to the sky. The state\'s reflex is the '
      + 'reflex of seventy years: say nothing, hold the May Day parades '
      + 'under the plume — children with paper flowers in Kyiv while the '
      + 'apparat\'s own families quietly leave town — until Swedish '
      + 'monitoring stations detect the cloud and the lie acquires an '
      + 'international audience with instruments. Then the other thing '
      + 'happens, the thing the era is named for: the firemen who stood '
      + 'on the roof are named, the generals\' bungling is printed, the '
      + 'trial is public, and glasnost\'s first fully honest document '
      + 'turns out to be an accident report. The direct cost is counted '
      + 'in the tens of billions and the indirect cost is the state '
      + 'itself: Gorbachev will say afterward that Chernobyl, more than '
      + 'anything he decreed, made the case that the system lied '
      + 'structurally, as a function of its design — a reactor with a '
      + 'positive void coefficient and a government to match. In the '
      + 'exclusion zone the villages are buried house by house. The '
      + 'sarcophagus goes up over the core, and over the century\'s '
      + 'confidence that the state\'s account of anything was the '
      + 'weather.',
    forTag: 'both',
    decider: 'SOV',
    date: { y: 1986, m: 4 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Reactor four exploded on 26 April 1986 during a test with safeties disabled; the parades were held under the plume until Sweden detected the cloud, and the honest accounting became glasnost\'s first document.',
    options: [
      {
        label: 'Detected by other people\'s instruments',
        tooltip: 'Moscow −300 talents, −15 legitimacy; Borysthenia carries "The Zone" (+2 unrest, −50% tax permanently) as the villages are buried house by house. The state\'s account of anything stops being the weather.',
        effects: guard('ev_cw_chernobyl:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'SOV')) h.adjust(ctx, 'SOV', { treasury: -300, legitimacy: -15 });
          stir(ctx, ['Borysthenia'], {
            id: 'the_zone', name: 'The Zone', months: -1,
            effects: { unrest: 2, taxMult: 0.5 },
          });
          h.setFlag(ctx, 'chernobyl', true);
          h.chronicle(ctx, 'era', 'The reactor burns open to the sky and the parades are held under the plume until foreign instruments end the lie; the first honest document of glasnost is an accident report.');
        }),
      },
    ],
  },

  // ── C21 · 1989 ────────────────────────────────────────────────────────────
  {
    id: 'ev_cw_wall_falls',
    title: 'The Gates Open',
    worldLabel: 'The Berlin Wall falls; the bloc dissolves in a season',
    desc: 'The year moves like water finding cracks: Hungary opens its '
      + 'Austrian border in May and the East Germans start leaving by the '
      + 'campsite-full; Poland votes in June and the party loses every '
      + 'seat it is possible to lose; and Moscow, decisively, does '
      + 'nothing — the doctrine of 1968 has been quietly replaced, a '
      + 'spokesman jokes, by the Sinatra doctrine: they do it their way. '
      + 'On the ninth of November a Politburo spokesman in East Berlin, '
      + 'handed a new travel regulation he has not read, announces on '
      + 'live television that the border is open — asked when, he '
      + 'shuffles his papers and improvises the two words that end an '
      + 'era: ab sofort. Immediately. By midnight the crowds are on top '
      + 'of the Wall with hammers, the guards standing aside with the '
      + 'expressions of men whose orders have simply run out. Prague '
      + 'follows in ten days and puts a playwright in the castle; '
      + 'Bulgaria retires its general secretary the morning after the '
      + 'Wall; Romania, in December, is the exception that proves the '
      + 'season — the one ruler who shoots is shot, with his wife, '
      + 'against a barracks wall on Christmas Day. And through the '
      + 'opened gates, at last, the other exodus begins: the Soviet '
      + 'Jews whose refusals defined a movement are suddenly holding '
      + 'exit visas, and the airport at Tel Aviv is about to become '
      + 'the busiest arrivals hall in the state\'s history.',
    forTag: 'both',
    decider: 'SOV',
    date: { y: 1989, m: 11 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Schabowski\'s "ab sofort" opened the Wall on 9 November 1989; Czechoslovakia\'s velvet revolution followed in ten days, Ceaușescu was shot on Christmas Day, and the Soviet exit doors opened.',
    options: [
      {
        label: 'Ab sofort — immediately',
        tooltip: 'Germany is renamed whole as the wall comes off the map: the Rampart lifts from Semnones. Prague seats Havel; the bloc\'s capitals ease toward the West by 80. The Soviet exit doors open — the great aliyah\'s gate flag is raised for the chapter\'s absorption arc.',
        effects: guard('ev_cw_wall_falls:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'GER')) {
            h.rebrandTag(ctx, 'GER', { name: 'Germany' });
            h.adjust(ctx, 'GER', { legitimacy: 10 });
          }
          h.removeModifier(ctx, 'Semnones', 'the_rampart');
          if (alive(ctx, 'CZE')) {
            h.setRuler(ctx, 'CZE', { name: 'Václav Havel', title: 'President', gov: 4, infl: 4, mar: 1, age: 53 });
            h.adjust(ctx, 'CZE', { legitimacy: 15 });
          }
          for (const t of ['POL', 'HUN', 'BUL', 'ROU', 'CZE']) {
            if (!alive(ctx, t)) continue;
            easeOpinion(ctx, t, 'USA', 80);
            easeOpinion(ctx, t, 'GER', 80);
          }
          if (alive(ctx, 'SOV')) easeOpinion(ctx, 'SOV', 'ISR', 80);
          h.setFlag(ctx, 'wallFell', true);
          h.setFlag(ctx, 'sovietGatesOpen', true);
          h.chronicle(ctx, 'era', 'A spokesman improvises "ab sofort" and the crowds are on the Wall with hammers by midnight; the bloc dissolves in a season, and the other exodus begins through the opened gates.');
        }),
      },
    ],
  },

  // ── C22 · 1991 ────────────────────────────────────────────────────────────
  {
    id: 'ev_cw_soviet_end',
    title: 'The Flag Comes Down at Dusk',
    worldLabel: 'The Soviet Union is dissolved; Russia remains',
    desc: 'The empire\'s last year is a succession of rooms: the August coup, '
      + 'in which the old guard interns Gorbachev at his dacha and loses '
      + 'to a crowd around a parliament and a president on a tank; the '
      + 'December hunting lodge in the Belovezha forest, where the '
      + 'leaders of Russia, Ukraine and Belarus sign the union out of '
      + 'existence over dinner, checking afterward — the detail history '
      + 'will keep — that the American president has been told before the '
      + 'Soviet one. On Christmas evening Gorbachev addresses the country '
      + 'that no longer exists, resigns an office that no longer exists, '
      + 'and signs the decree with a borrowed pen, his own having failed '
      + 'on live television — the CNN crew\'s ballpoint takes the Soviet '
      + 'Union off the map. At 7:32 the red flag comes down the Kremlin '
      + 'staff and the Russian tricolor goes up; the nuclear briefcase '
      + 'is walked across the compound like an office key at a change of '
      + 'management. For Jerusalem the ledger of this ending was already '
      + 'being written in the arrivals hall: diplomatic relations '
      + 'restored in October after twenty-four broken years, and the '
      + 'aliyah running at a scale not seen since the state\'s founding '
      + 'decade — the power that voted for partition, armed the '
      + 'independence through Prague, switched sides for forty years '
      + 'and barred its Jews for a generation, ends by sending them, '
      + 'a million strong, with engineering degrees.',
    forTag: 'both',
    decider: 'SOV',
    date: { y: 1991, m: 12 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'The union was signed away at Belovezha on 8 December and Gorbachev resigned on 25 December 1991, the flag coming down at 7:32 pm; relations with Israel had been restored in October, with the million-strong aliyah in flood.',
    options: [
      {
        label: 'Signed with a borrowed pen',
        tooltip: 'The Soviet Union becomes Russia under Yeltsin, carrying "The Hangover of Empire" (−20% income and manpower for 120 months); its opinion of Israel and Washington rises by 80. The state that barred its Jews for a generation ends by sending them.',
        effects: guard('ev_cw_soviet_end:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'SOV')) {
            h.rebrandTag(ctx, 'SOV', { name: 'Russia' });
            h.setRuler(ctx, 'SOV', { name: 'Boris Yeltsin', title: 'President of Russia', gov: 2, infl: 3, mar: 2, age: 60 });
            h.addTagModifier(ctx, 'SOV', {
              id: 'hangover_of_empire', name: 'The Hangover of Empire', months: 120,
              effects: { incomeMult: 0.8, manpowerMult: 0.8 },
            });
            easeOpinion(ctx, 'SOV', 'ISR', 80);
            easeOpinion(ctx, 'SOV', 'USA', 80);
          }
          h.setFlag(ctx, 'sovietUnionFell', true);
          h.chronicle(ctx, 'era', 'The red flag comes down the Kremlin staff at dusk and the union is signed away with a borrowed pen; the power that barred its Jews for a generation ends by sending them, a million strong.');
        }),
      },
    ],
  },
];
