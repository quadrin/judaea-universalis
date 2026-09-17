// Judaea Universalis — the chain of The Kingdom Divided, 931 BCE (SPEC §268).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// The chapter's own crisis is four questions asked in the first six years and
// answered for two centuries afterwards: what the new king says to the
// assembly, where the ten tribes are going to sacrifice, what is paid to
// Pharaoh when he comes up the coast road in 925, and — fifty years on —
// whether the house in Samaria marries Tyre. Each is a fork in the §119 tree
// with its own marker, its own entry card, and a terminal in the eighth
// century that says what the answer was worth.
//
// Everything between them is the ninth century as the sources have it: the
// wars over the Gilead, Mesha's rebellion carved on his own stone, the
// prophets who are a political institution and not a literary one, Jehu's
// purge, and the arrival — first as a rumour, then as a tribute demand — of
// the thing coming from the Tigris.
//
// Sources: 1 Kings 12-22, 2 Kings 1-14; 2 Chronicles 10-25; the Bubastite
// Portal; the Mesha stele (KAI 181); the Tel Dan stele; the Kurkh monolith
// and the Black Obelisk of Shalmaneser III; the Zakkur stele; the Samaria
// ostraca; Amos and Hosea for the eighth-century north.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_931bce] ' + key, e || '');
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

// Addressed to the chapter's own court, so the modifiers land on the chair
// that answered the card.
// The court a card is currently being answered by (SPEC §216). This chapter
// seats two crowns, so a card addressed to one of them fires in the other's
// campaign as well — silently, on its recorded course — and an effect body
// that reached for `playerTag` would hang Judah's modifier on Israel's
// ledger. The binding at the foot of this file sets this for the length of
// one answer; everywhere else it is null and `P` means what it always meant.
let AUDIENCE = null;

function bindAudience(tag, fn) {
  return function (ctx) {
    const prev = AUDIENCE;
    AUDIENCE = tag;
    try { fn(ctx); } finally { AUDIENCE = prev; }
  };
}

function P(ctx) {
  const t = AUDIENCE && ctx.game.tags && ctx.game.tags[AUDIENCE];
  return (t && t.alive !== false) ? AUDIENCE : ctx.game.playerTag;
}

function mod(ctx, id, name, effects, months) {
  ctx.helpers.addTagModifier(ctx, P(ctx), {
    id, name, months: Number.isFinite(months) ? months : -1, effects,
  });
}

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false);
}

function flag(ctx, key) {
  return !!((ctx.game.flags || {})[key]);
}

function opinion(ctx, from, of, delta) {
  try {
    const t = ctx.game.tags && ctx.game.tags[from];
    if (!t) return;
    if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
    const v = (t.opinion[of] || 0) + delta;
    t.opinion[of] = Math.max(-200, Math.min(200, v));
  } catch (e) { warnOnce('opinion', e); }
}

export const EVENTS_931 = [

  // ── −931: the assembly, and the answer ────────────────────────────────────
  {
    id: 'ev931_the_yoke',
    title: 'The Assembly at Shechem',
    desc: 'They have come to Shechem rather than to Jerusalem, which is itself the '
      + 'message: the ten tribes will be made a king, not given one. The spokesman is '
      + 'Jeroboam son of Nebat, who ran Solomon\'s corvée over the house of Joseph until '
      + 'he had to run for Egypt, and he is back, and the request is one sentence long. '
      + 'Your father made our yoke heavy. Lighten it, and we will serve you.\n\n'
      + 'The old men who stood in Solomon\'s court say: be a servant to this people today '
      + 'and they will be your servants for ever. The men you grew up with say: tell them '
      + 'your little finger is thicker than your father\'s loins. Both pieces of advice '
      + 'are recorded, word for word, by people who knew how it turned out.',
    forTag: 'JDH',
    date: { y: -931, m: 3 },
    major: true,
    aiOption: 0,
    historical: '1 Kings 12:1-16. Rehoboam took the young men\'s advice; Israel answered "What portion have we in David?" and went home, and the united monarchy lasted seventy-three years in total.',
    options: [
      {
        label: 'My father chastised you with whips; I will chastise you with scorpions',
        tooltip: 'The recorded answer. +15 legitimacy with the house and "The Word at Shechem" (+8% manpower, +1 unrest everywhere) for twenty years — and the ten tribes are gone for good, which the chapter is built on either way.',
        effects: guard('yoke:0', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'scorpionsAnswer', true);
          h.adjust(ctx, 'JDH', { legitimacy: 15, gov: -10 });
          mod(ctx, 'the_word_at_shechem', 'The Word at Shechem', { manpowerMult: 1.08, unrestAll: 1 }, 240);
          opinion(ctx, 'ISL', 'JDH', -40);
          h.chronicle(ctx, 'era', 'At Shechem the king answers the assembly roughly, and the '
            + 'assembly answers back: "To your tents, O Israel." The man sent to collect the '
            + 'labour levy is stoned to death on the road.');
        }),
      },
      {
        label: 'Take the old men\'s advice and lighten the yoke',
        tooltip: 'The road nobody took. −140 talents and −8 legitimacy with the house, "The Lightened Yoke" (−0.6 unrest everywhere, +6% income) permanently, and Israel\'s regard improves by 45 — the division still happens, because Ahijah of Shiloh had already torn his cloak into twelve pieces, but it happens without a blood feud attached.',
        effects: guard('yoke:1', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'yokeLightened', true);
          h.adjust(ctx, 'JDH', { treasury: -140, legitimacy: -8, gov: 20 });
          mod(ctx, 'the_lightened_yoke', 'The Lightened Yoke', { unrestAll: -0.6, incomeMult: 1.06 });
          opinion(ctx, 'ISL', 'JDH', 45);
          opinion(ctx, 'JDH', 'ISL', 30);
          h.chronicle(ctx, 'era', 'The corvée is cut and the northern districts are assessed '
            + 'afresh. The ten tribes still go — the prophet had already promised them a king '
            + '— but they go arguing about tax rates rather than swearing revenge.');
        }),
      },
    ],
  },

  {
    id: 'ev931_shemaiah_forbids_the_war',
    title: 'Shemaiah Forbids the War',
    desc: 'A hundred and eighty thousand chosen men are mustered at Jerusalem to bring the '
      + 'north back by force — and a man named Shemaiah walks into the muster and says the '
      + 'thing is from God, and that they are to go home. The astonishing part, which the '
      + 'chronicler records without comment, is that they do.\n\n'
      + 'The council is divided down the middle. A kingdom that will not fight for half of '
      + 'itself in the first summer may never get another chance that cheap; a kingdom that '
      + 'burns its own villages to keep them has learned nothing from the assembly.',
    forTag: 'JDH',
    date: { y: -931, m: 6 },
    aiOption: 0,
    historical: '1 Kings 12:21-24. The campaign was called off; sporadic border war between the two kingdoms ran for the next sixty years anyway.',
    options: [
      {
        label: 'Send the muster home',
        tooltip: '+18 legitimacy, +40 governance points, and "The Word of the Prophet" (+0.2 legitimacy a month) for thirty years. The war between the houses stays a border war.',
        effects: guard('shemaiah:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { legitimacy: 18, gov: 40 });
          mod(ctx, 'word_of_the_prophet', 'The Word of the Prophet', { legitimacyAdd: 0.2 }, 360);
          h.setFlag(ctx, 'shemaiahObeyed', true);
          // The campaign of reconquest is called off, which is what the source
          // records and what the next two centuries actually look like: a
          // standing rivalry and a border that moves by villages, not a war of
          // conquest between two states that could each field an army the
          // other could not destroy.
          try { h.endWar(ctx, 'JDH', 'ISL', null); } catch (e) { warnOnce('shemaiah:peace', e); }
          h.chronicle(ctx, 'era', 'The muster is dismissed at the prophet\'s word. It is the '
            + 'first time in this country\'s history that a man with no office stops an army, '
            + 'and it will not be the last.');
        }),
      },
      {
        label: 'March north anyway',
        tooltip: '+6,000 manpower and "The Summer Campaign" (+10% army strength) for six years, at −12 legitimacy and +1 unrest everywhere for ten. The priesthood and the country both remember that the word was ignored.',
        effects: guard('shemaiah:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { manpower: 6000, legitimacy: -12, mar: 30 });
          mod(ctx, 'the_summer_campaign', 'The Summer Campaign', { milPowerMult: 1.1 }, 72);
          mod(ctx, 'the_word_ignored', 'The Word Ignored', { unrestAll: 1 }, 120);
          h.setFlag(ctx, 'shemaiahDefied', true);
          h.chronicle(ctx, 'era', 'The army goes north over the prophet\'s objection. The '
            + 'border villages of Benjamin change hands twice before the first harvest.');
        }),
      },
    ],
  },

  // ── −930: the calves ──────────────────────────────────────────────────────
  {
    id: 'ev931_the_two_calves',
    title: 'The Calves of Gold',
    desc: 'The problem is arithmetic, not theology. Three times a year every household in '
      + 'this kingdom is expected to go up to a building in the other kingdom\'s capital, '
      + 'carrying its firstborn and its tithe, and be told there by that kingdom\'s '
      + 'priesthood whose house God chose. "If this people go up to sacrifice at Jerusalem, '
      + 'then shall the heart of this people turn again unto their lord."\n\n'
      + 'The proposal on the table is two shrines — one at Bethel on the southern border, '
      + 'one at Dan in the far north — each with a gilded bull calf for the god to stand '
      + 'on, the way every god in this part of the world stands on a bull. A new '
      + 'priesthood, recruited from anyone willing. And the autumn feast moved one month '
      + 'later, so that nobody has to choose between the two.',
    forTag: 'ISL',
    date: { y: -930, m: 8 },
    major: true,
    aiOption: 0,
    historical: '1 Kings 12:26-33. Jeroboam built both shrines; every northern king after him is condemned in one formula — "he walked in the sins of Jeroboam son of Nebat, who made Israel to sin."',
    options: [
      {
        label: 'Behold thy gods, O Israel, which brought thee up out of Egypt',
        tooltip: 'Two shrines, a new priesthood and a moved festival: +25 legitimacy, +120 talents a year of tithe redirected north as "The Two Houses" (+10% income, +0.2 legitimacy a month) permanently — and the southern chronicle condemns every king of this kingdom for ever, which costs 0.4 unrest everywhere.',
        effects: guard('calves:0', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'calvesRaised', true);
          h.adjust(ctx, 'ISL', { legitimacy: 25, treasury: 120, infl: 30 });
          mod(ctx, 'the_two_houses', 'The Two Houses', { incomeMult: 1.1, legitimacyAdd: 0.2 });
          mod(ctx, 'the_sin_of_jeroboam', 'The Sin of Jeroboam', { unrestAll: 0.4 });
          opinion(ctx, 'JDH', 'ISL', -35);
          h.chronicle(ctx, 'era', 'Two calves of gold are set up, at Bethel and at Dan, and the '
            + 'feast of the eighth month is proclaimed. Nobody in Israel need cross a border to '
            + 'sacrifice again.');
        }),
      },
      {
        label: 'Let them go up: the house in Jerusalem is ours too',
        tooltip: 'The road not taken. −10% income permanently ("The Tithe Goes South") and Judah\'s regard improves by 50, but +20 legitimacy with the strict houses, −0.6 unrest everywhere, and the one charge the southern chronicle never gets to lay against this kingdom.',
        effects: guard('calves:1', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'pilgrimageKept', true);
          h.adjust(ctx, 'ISL', { legitimacy: 20, gov: 20 });
          mod(ctx, 'the_tithe_goes_south', 'The Tithe Goes South', { incomeMult: 0.9 });
          mod(ctx, 'one_house_for_two_kingdoms', 'One House for Two Kingdoms', { unrestAll: -0.6 });
          opinion(ctx, 'JDH', 'ISL', 50);
          opinion(ctx, 'ISL', 'JDH', 30);
          h.chronicle(ctx, 'era', 'No shrine is built. Three times a year the roads south fill '
            + 'with Israelite pilgrims, and three times a year the king of Israel watches them '
            + 'go and counts what leaves with them.');
        }),
      },
    ],
  },

  // ── −925: Pharaoh comes north ─────────────────────────────────────────────
  {
    id: 'ev931_shishak_comes_north',
    title: 'Shishak Comes Up Against Jerusalem',
    desc: 'Twelve hundred chariots, sixty thousand horsemen and "people without number out '
      + 'of Egypt" — the numbers are the chronicler\'s and the campaign is real: Shoshenq '
      + 'will carve a hundred and fifty town names on the wall at Karnak when he gets home, '
      + 'and archaeologists will dig burn layers at a dozen of them. Megiddo will have his '
      + 'victory stele standing in it.\n\n'
      + 'He is not here to annex anything. He is here to be paid, to reopen the coast road '
      + 'to Egyptian traffic, and to remind two new kingdoms which of them used to shelter '
      + 'whom. The envoys make it plain that the price is negotiable and the alternative '
      + 'is not.',
    forTag: 'player',
    date: { y: -925, m: 5 },
    major: true,
    aiOption: 0,
    historical: '1 Kings 14:25-28 and 2 Chronicles 12; the Bubastite Portal. Rehoboam bought him off with the treasures of the house of the Lord and the king\'s house, including Solomon\'s gold shields, and replaced them with bronze.',
    options: [
      {
        label: 'Pay him: the gold of the house and the palace',
        tooltip: 'The recorded answer. −400 talents and "The Bronze Shields" (−12% income) for fifteen years, but no campaign, no burned towns, and "Pharaoh Passes By" (−1 unrest everywhere) for ten.',
        effects: guard('shishak:0', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.setFlag(ctx, 'shishakTributePaid', true);
          h.adjust(ctx, me, { treasury: -400, legitimacy: -8 });
          mod(ctx, 'the_bronze_shields', 'The Bronze Shields', { incomeMult: 0.88 }, 180);
          mod(ctx, 'pharaoh_passes_by', 'Pharaoh Passes By', { unrestAll: -1 }, 120);
          opinion(ctx, 'MIZ', me, 40);
          h.chronicle(ctx, 'era', 'The treasures of the house and of the palace go south on '
            + 'Egyptian carts, Solomon\'s gold shields among them. The guard is issued bronze '
            + 'ones and told to carry them the same way.');
        }),
      },
      {
        label: 'Hold the gates and let him burn what he can reach',
        tooltip: 'The road not taken. War with Egypt, +20 legitimacy and "The Gates Held" (+10% morale, +1 fort defence) for twenty years — and the country outside the walls pays for it: +1.5 unrest everywhere for eight years and −6,000 manpower.',
        effects: guard('shishak:1', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.setFlag(ctx, 'shishakGatesHeld', true);
          h.adjust(ctx, me, { legitimacy: 20, manpower: -6000, mar: 40 });
          mod(ctx, 'the_gates_held', 'The Gates Held', { moraleMult: 1.1, fortDefBonus: 1 }, 240);
          mod(ctx, 'the_burned_country', 'The Burned Country', { unrestAll: 1.5 }, 96);
          opinion(ctx, 'MIZ', me, -60);
          try { h.declareWar(ctx, 'MIZ', me, 'The Campaign of Shoshenq'); } catch (e) { warnOnce('shishak:war', e); }
          h.chronicle(ctx, 'era', 'The gates stay shut. Pharaoh takes what is outside them, '
            + 'which is most of the country, and writes the names of the towns on a wall at '
            + 'Karnak — but not the name of the capital.');
        }),
      },
    ],
  },

  // ── −913: the border war of Abijah and Jeroboam ───────────────────────────
  {
    id: 'ev931_the_battle_of_zemaraim',
    title: 'The Sermon on Mount Zemaraim',
    desc: 'Two armies face each other across a valley in the hill country of Ephraim, and '
      + 'before the fighting the king of Judah climbs a hill and makes a speech to the '
      + 'enemy: the kingdom of the Lord is in the hand of the sons of David, your priests '
      + 'are anybody who turns up with a bullock and seven rams, and we still have the '
      + 'golden candlestick and the shewbread. It is a theological argument delivered at '
      + 'shouting distance to men holding spears.\n\n'
      + 'The chronicler says Judah won and took Bethel. The northern towns of the border — '
      + 'Bethel, Jeshanah, Ephron — change hands in this generation more than once, and '
      + 'whoever holds Bethel holds an argument as well as a ridge.',
    forTag: 'both',
    date: { y: -913, m: 4 },
    aiOption: 1,
    historical: '2 Chronicles 13. The northern kingdom kept Bethel in the end; the shrine there is still functioning three hundred years later, which is how we know.',
    options: [
      {
        label: 'Fight for the border ridge',
        tooltip: '+4,000 manpower and "The Border War" (+8% army strength) for twelve years, at −80 talents and +0.5 unrest everywhere for six.',
        effects: guard('zemaraim:0', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.adjust(ctx, me, { manpower: 4000, treasury: -80, mar: 25 });
          mod(ctx, 'the_border_war', 'The Border War', { milPowerMult: 1.08 }, 144);
          mod(ctx, 'the_ridge_villages', 'The Ridge Villages', { unrestAll: 0.5 }, 72);
          h.chronicle(ctx, 'era', 'The border ridge is fought over village by village. Both '
            + 'chronicles record a victory.');
        }),
      },
      {
        label: 'Buy the ridge instead — hire Damascus to raid the other side',
        tooltip: '−250 talents and Aram\'s regard improves by 40: "The Hired Ally" (+6% army strength, −0.4 unrest everywhere) for fifteen years, and the other kingdom takes the damage. Aram remembers that this country pays.',
        effects: guard('zemaraim:1', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.adjust(ctx, me, { treasury: -250, infl: 25 });
          mod(ctx, 'the_hired_ally', 'The Hired Ally', { milPowerMult: 1.06, unrestAll: -0.4 }, 180);
          opinion(ctx, 'DMS', me, 40);
          h.setFlag(ctx, 'aramHired', true);
          h.chronicle(ctx, 'era', 'Silver goes to Damascus and Aramean cavalry appear in the '
            + 'north country the following spring. It is cheaper than a campaign and it teaches '
            + 'Damascus exactly how cheap this country will sell its quarrels.');
        }),
      },
    ],
  },

  // ── −885: a new house, and a new capital ──────────────────────────────────
  {
    id: 'ev931_a_hill_called_shemer',
    title: 'A Hill Called Shemer',
    desc: 'Tirzah has burned — the last king shut himself in the palace and set fire to it '
      + 'when the army proclaimed somebody else — and the man who came out of that on the '
      + 'throne wants a capital that belongs to the crown and not to a tribe. There is a '
      + 'hill west of Shechem, bought outright from a man called Shemer for two talents of '
      + 'silver, with water, a view of the coast road and no elders with ancestral claims '
      + 'on it.\n\n'
      + 'Building a city from nothing is the most expensive thing a kingdom this size can '
      + 'do. It is also the only way to stop the next chariot captain from walking into an '
      + 'existing one and being acclaimed in it.',
    forTag: 'ISL',
    date: { y: -885, m: 3 },
    major: true,
    aiOption: 0,
    historical: '1 Kings 16:23-24. Omri bought the hill and built Samaria; the Assyrians called the whole kingdom Bit-Humri — the house of Omri — for a century after his dynasty was extinct.',
    options: [
      {
        label: 'Buy the hill and build',
        tooltip: '−350 talents and the seat moves: Samaria gains walls and a market, "The King\'s Own City" (+0.25 legitimacy a month, +1 fort defence) permanently, and +30 legitimacy.',
        effects: guard('shemer:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ISL', { treasury: -350, legitimacy: 30 });
          mod(ctx, 'the_kings_own_city', 'The King\'s Own City', { legitimacyAdd: 0.25, fortDefBonus: 1 });
          h.setFlag(ctx, 'samariaBuilt', true);
          try {
            const p = ctx.prov && ctx.prov('Sebaste');
            if (p) {
              p.name = 'Samaria';
              if (!Array.isArray(p.buildings)) p.buildings = [];
              for (const b of ['walls', 'market']) if (p.buildings.indexOf(b) === -1) p.buildings.push(b);
              const d = p.dev || (p.dev = { tax: 0, prod: 0, mp: 0 });
              d.tax += 2; d.prod += 2;
            }
          } catch (e) { warnOnce('shemer:prov', e); }
          h.chronicle(ctx, 'era', 'The hill of Shemer is bought for two talents and a city is '
            + 'laid out on it in ashlar, with a casemate wall and a palace of ivory inlay. It '
            + 'is called Samaria, after the man who sold the field.');
        }),
      },
      {
        label: 'Rebuild Tirzah — a kingdom does not need a vanity',
        tooltip: '−120 talents, Tirzah regains its walls and "The Old Seat" (+7% income, −0.3 unrest everywhere) for twenty-five years. Cheaper, and the elders of the district keep a hand on the capital, which is exactly the problem.',
        effects: guard('shemer:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ISL', { treasury: -120, gov: 25 });
          mod(ctx, 'the_old_seat', 'The Old Seat', { incomeMult: 1.07, unrestAll: -0.3 }, 300);
          try {
            const p = ctx.prov && ctx.prov('Sebaste');
            if (p && Array.isArray(p.buildings) && p.buildings.indexOf('walls') === -1) p.buildings.push('walls');
          } catch (e) { warnOnce('shemer:prov2', e); }
          h.chronicle(ctx, 'era', 'Tirzah is rebuilt where it stood. The court keeps its old '
            + 'neighbours, and its old neighbours keep the court.');
        }),
      },
    ],
  },

  // ── −874: the Tyrian marriage ─────────────────────────────────────────────
  {
    id: 'ev931_the_tyrian_marriage',
    title: 'The King of Tyre Offers a Daughter',
    desc: 'Tyre has the sea, the purple, the cedar and the silver of the western trade, and '
      + 'no grain at all. Israel has the Jezreel and the Sharon and nowhere to sell them. '
      + 'The two economies have been one system since Hiram and Solomon, and the proposal '
      + 'on the table makes it a dynasty: Ethbaal\'s daughter for the crown prince, with a '
      + 'commercial treaty, a fleet share and a shipyard at Akko attached.\n\n'
      + 'There is one condition, and it is not negotiable and not unusual: a foreign queen '
      + 'brings her own god. There will be a temple of Baal in the capital and a household '
      + 'of four hundred and fifty prophets on the royal payroll. Every king in the region '
      + 'makes this trade. In this country it produces Elijah.',
    forTag: 'ISL',
    date: { y: -874, m: 4 },
    major: true,
    aiOption: 0,
    historical: '1 Kings 16:31. Ahab married Jezebel of Sidon; the northern kingdom reached its commercial and military peak in that generation and its own prophets never forgave it.',
    options: [
      {
        label: 'Take the marriage and the treaty',
        tooltip: '+400 talents, "The Sidonian Queen" (+18% trade, +10% income, +6% army strength) permanently and Tyre at +90 regard — against "The Prophets in the Hills" (+1.2 unrest everywhere, −0.2 legitimacy a month) until a court settles the altars, and the Canaanite cults begin spreading in earnest.',
        effects: guard('marriage:0', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'tyrianMarriage', true);
          h.setFlag(ctx, 'baalEstablished', true);
          h.adjust(ctx, 'ISL', { treasury: 400, infl: 40 });
          mod(ctx, 'the_sidonian_queen', 'The Sidonian Queen', { tradeMult: 1.18, incomeMult: 1.1, milPowerMult: 1.06 });
          mod(ctx, 'prophets_in_the_hills', 'The Prophets in the Hills', { unrestAll: 1.2, legitimacyAdd: -0.2 });
          opinion(ctx, 'TYR', 'ISL', 90);
          opinion(ctx, 'ISL', 'TYR', 80);
          h.chronicle(ctx, 'era', 'The daughter of Ethbaal comes to the capital with her '
            + 'household, her priests and a treaty, and the kingdom is suddenly rich. A man '
            + 'from Gilead in a hair cloak begins telling anyone who will listen that it will '
            + 'not rain.');
        }),
      },
      {
        label: 'No foreign queen, and no foreign altar',
        tooltip: 'The road not taken. Tyre\'s regard falls by 40 and the grain stays in the barns: −8% trade permanently. But +25 legitimacy, "The Altars Kept" (−0.8 unrest everywhere, +0.15 legitimacy a month) permanently, and the prophets are the crown\'s men rather than its opposition.',
        effects: guard('marriage:1', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'tyrianMarriageRefused', true);
          h.adjust(ctx, 'ISL', { legitimacy: 25, gov: 30 });
          mod(ctx, 'the_altars_kept', 'The Altars Kept', { tradeMult: 0.92, unrestAll: -0.8, legitimacyAdd: 0.15 });
          opinion(ctx, 'TYR', 'ISL', -40);
          h.chronicle(ctx, 'era', 'The offer is declined, courteously and completely. Tyre sells '
            + 'its cedar elsewhere; the hill country sleeps easier; and no prophet of this '
            + 'generation becomes famous.');
        }),
      },
    ],
  },

  // ── −853: Qarqar ──────────────────────────────────────────────────────────
  {
    id: 'ev931_the_twelve_kings_at_qarqar',
    title: 'Twelve Kings on the Orontes',
    desc: 'The Assyrian is at Aleppo with the largest army anybody in the Levant has ever '
      + 'had to think about, and for the first time in living memory the kings of this '
      + 'coast are in one room. Hadadezer of Damascus brings twelve hundred chariots. '
      + 'Irhuleni of Hamath brings seven hundred. Israel is asked for two thousand, which '
      + 'is more than both of them together and more than the kingdom can field without '
      + 'stripping every garrison it has.\n\n'
      + 'Damascus has been at war with this kingdom for forty years and will be again the '
      + 'summer after this one. That is not the question. The question is whether there '
      + 'will be anybody left to fight in forty years.',
    forTag: 'both',
    date: { y: -853, m: 5 },
    major: true,
    aiOption: 0,
    historical: 'The Kurkh monolith of Shalmaneser III credits "Ahab the Israelite" with 2,000 chariots and 10,000 foot at Qarqar — the largest chariot force in the coalition. Shalmaneser claimed a victory and went home; he did not come back for twelve years.',
    options: [
      {
        label: 'Send the chariots — every one of them',
        tooltip: '−8,000 manpower for six years and "The Line at Qarqar" (+12% morale, +1 diplomatic seat) for thirty — Aram and Hamath both to +70 regard, and the Assyrian advance stops for a generation.',
        effects: guard('qarqar:0', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.adjust(ctx, me, { manpower: -8000, mar: 40, legitimacy: 15 });
          mod(ctx, 'the_line_at_qarqar', 'The Line at Qarqar', { moraleMult: 1.12, diploSeats: 1 }, 360);
          opinion(ctx, 'DMS', me, 70); opinion(ctx, 'HMT', me, 70);
          opinion(ctx, 'ASR', me, -50);
          h.setFlag(ctx, 'qarqarJoined', true);
          h.chronicle(ctx, 'era', 'Twelve kings stand on the Orontes and the Assyrian goes home '
            + 'calling it a victory. He does not come back for twelve years, which is what the '
            + 'coalition was for.');
        }),
      },
      {
        label: 'Stay home and let Damascus bleed',
        tooltip: '+6,000 manpower kept and "The Garrisons Full" (+8% manpower, +1 fort defence) for twenty years — and Aram and Hamath both to −60 regard, Assyria to +40, and the coalition breaks. Whoever wins on the Orontes comes south next.',
        effects: guard('qarqar:1', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.adjust(ctx, me, { manpower: 6000, gov: 25 });
          mod(ctx, 'the_garrisons_full', 'The Garrisons Full', { manpowerMult: 1.08, fortDefBonus: 1 }, 240);
          opinion(ctx, 'DMS', me, -60); opinion(ctx, 'HMT', me, -60);
          opinion(ctx, 'ASR', me, 40);
          h.setFlag(ctx, 'qarqarDeclined', true);
          h.chronicle(ctx, 'era', 'The muster stays in its own country. The coalition on the '
            + 'Orontes is weaker by two thousand chariots, and every king in it writes that '
            + 'down.');
        }),
      },
    ],
  },

  // ── −840: Mesha's stone ───────────────────────────────────────────────────
  {
    id: 'ev931_mesha_rebels',
    title: 'The Stone at Dibon',
    desc: 'The king of Moab has stopped sending the hundred thousand lambs and the wool of '
      + 'a hundred thousand rams, has taken back the towns of the plateau one at a time, '
      + 'and — this is the part that will matter for three thousand years — has had the '
      + 'whole account carved on a block of basalt at Dibon in his own language: Omri king '
      + 'of Israel oppressed Moab many days, for Chemosh was angry with his land. And his '
      + 'son said, I too will oppress Moab. In my days he said so, but I saw my desire upon '
      + 'him and upon his house, and Israel perished with an everlasting destruction.\n\n'
      + 'It is the earliest inscription in which any neighbour of this country writes about '
      + 'it, and the theology is identical: a national god, angry with his own people, who '
      + 'gives them into the hand of an enemy and then takes them back.',
    forTag: 'both',
    date: { y: -840, m: 6 },
    aiOption: 1,
    historical: '2 Kings 3 and the Mesha stele (KAI 181). Moab stayed free; the campaign against it ended when Mesha sacrificed his eldest son on the wall and "there came great wrath upon Israel," and the army went home.',
    options: [
      {
        label: 'Go down and take the plateau back',
        tooltip: '−150 talents and −3,000 manpower, "The Plateau Campaign" (+10% army strength, +1 hill defence) for fifteen years and Moab to −80 regard. The road is the King\'s Highway and whoever holds it taxes the incense.',
        effects: guard('mesha:0', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.adjust(ctx, me, { treasury: -150, manpower: -3000, mar: 30 });
          mod(ctx, 'the_plateau_campaign', 'The Plateau Campaign', { milPowerMult: 1.1, hillDefBonus: 1 }, 180);
          opinion(ctx, 'MOB', me, -80);
          h.chronicle(ctx, 'era', 'The army goes round by the wilderness of Edom and up onto the '
            + 'plateau. The towns are taken and the wells stopped, and the campaign ends at the '
            + 'wall of Kir-Hareseth without a treaty.');
        }),
      },
      {
        label: 'Let Moab go and hold the fords instead',
        tooltip: '+120 talents saved and "The Jordan Line" (+1 fort defence, −0.5 unrest everywhere, +6% income) for twenty-five years — a smaller kingdom that costs less to hold, and a neighbour that carves its version into stone.',
        effects: guard('mesha:1', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.adjust(ctx, me, { treasury: 120, gov: 25 });
          mod(ctx, 'the_jordan_line', 'The Jordan Line', { fortDefBonus: 1, unrestAll: -0.5, incomeMult: 1.06 }, 300);
          opinion(ctx, 'MOB', me, 20);
          h.setFlag(ctx, 'moabLetGo', true);
          h.chronicle(ctx, 'era', 'The plateau is written off and the fords of the Jordan are '
            + 'garrisoned instead. At Dibon a stone goes up saying that Israel has perished '
            + 'with an everlasting destruction, which is premature by a hundred and twenty '
            + 'years.');
        }),
      },
    ],
  },

  // ── −841: the black obelisk ───────────────────────────────────────────────
  {
    id: 'ev931_the_tribute_of_the_obelisk',
    title: 'The Assyrian Sends for Tribute',
    desc: 'The coalition that held the Orontes is gone — Damascus fought the last battle '
      + 'alone and lost it — and the Assyrian envoys are at the gate with a schedule: '
      + 'silver, gold, a golden bowl, a golden vase, golden cups, tin, a staff for the '
      + 'king\'s hand, and javelins. They also want the king to come in person and do '
      + 'obeisance, and they have brought a sculptor.\n\n'
      + 'What is actually being sold is the northern frontier. Pay, and Assyria treats '
      + 'this kingdom as an asset to be protected from Damascus. Refuse, and the next army '
      + 'through the Jezreel is not Aramean.',
    forTag: 'both',
    date: { y: -841, m: 9 },
    major: true,
    aiOption: 0,
    historical: 'The Black Obelisk of Shalmaneser III shows "Jehu son of Omri" — who was neither a son of Omri nor his heir — prostrate before the king of Assyria. It is the earliest picture of an Israelite that exists.',
    options: [
      {
        label: 'Pay, and let the sculptor work',
        tooltip: '−300 talents and −15 legitimacy, but Assyria to +60 regard and "The Assyrian Guarantee" (−0.5 unrest everywhere, +8% income) for twenty-five years. Damascus is told to leave this country alone, and for a while it does.',
        effects: guard('obelisk:0', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.adjust(ctx, me, { treasury: -300, legitimacy: -15, infl: 20 });
          mod(ctx, 'the_assyrian_guarantee', 'The Assyrian Guarantee', { unrestAll: -0.5, incomeMult: 1.08 }, 300);
          opinion(ctx, 'ASR', me, 60);
          opinion(ctx, 'DMS', me, -40);
          h.setFlag(ctx, 'assyrianTribute', true);
          h.chronicle(ctx, 'era', 'The tribute goes north with the envoys and a relief is cut '
            + 'showing the king on his face before the Assyrian. It is the earliest picture of '
            + 'anybody from this country that will survive.');
        }),
      },
      {
        label: 'Send them away empty',
        tooltip: '+20 legitimacy and "No Man\'s Vassal" (+10% morale, +6% manpower) for twenty years, at Assyria −80 regard and the certainty that the schedule will be presented again, by an army.',
        effects: guard('obelisk:1', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.adjust(ctx, me, { legitimacy: 20, mar: 30 });
          mod(ctx, 'no_mans_vassal', 'No Man\'s Vassal', { moraleMult: 1.1, manpowerMult: 1.06 }, 240);
          opinion(ctx, 'ASR', me, -80);
          h.setFlag(ctx, 'assyrianTributeRefused', true);
          h.chronicle(ctx, 'era', 'The envoys go home with the schedule unsigned and the '
            + 'sculptor unemployed. The Assyrian scribes note the refusal in the eponym list '
            + 'for the year, which is a kind of appointment.');
        }),
      },
    ],
  },

  // ── the terminals (SPEC §119): what each road was worth ───────────────────
  {
    id: 'ev931_what_the_yoke_bought',
    title: 'What the Answer at Shechem Bought',
    desc: 'Two hundred years on, the answer given at Shechem in the first spring is still '
      + 'the shape of this kingdom\'s politics. It is worth writing down what it actually '
      + 'produced, because the chroniclers on both sides of the border have spent the '
      + 'interval explaining that it was inevitable.',
    forTag: 'JDH',
    date: { y: -760, m: 4 },
    when: safeTrigger('ev931_what_the_yoke_bought:when', (ctx) => flag(ctx, 'scorpionsAnswer') || flag(ctx, 'yokeLightened')),
    aiOption: 0,
    historical: 'The border between the two kingdoms settled a few miles north of Jerusalem and stayed there, with adjustments, until the Assyrians removed one of the two parties to the argument.',
    options: [
      {
        label: 'Enter it in the chronicle',
        tooltip: 'A hard answer bought a kingdom that never had to argue about the succession; a soft one bought a border that was quiet. +25 legitimacy and the matching permanent modifier.',
        effects: guard('yokeEnd:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { legitimacy: 25, gov: 40 });
          if (flag(ctx, 'scorpionsAnswer')) {
            mod(ctx, 'the_scorpions_legacy', 'What the Scorpions Bought', { legitimacyAdd: 0.2, manpowerMult: 1.06 });
            h.chronicle(ctx, 'era', 'The house of David has ruled for two centuries without a '
              + 'disputed succession, in a kingdom whose entire political tradition is that the '
              + 'king does not negotiate with assemblies. It also has a third of the country it '
              + 'started with.');
          } else {
            mod(ctx, 'the_lightened_legacy', 'What the Lighter Yoke Bought', { incomeMult: 1.08, unrestAll: -0.4 });
            h.chronicle(ctx, 'era', 'Two kingdoms that separated over a tax assessment rather '
              + 'than over a blood insult have spent two centuries trading instead of raiding. '
              + 'The chroniclers find it very difficult to write about.');
          }
        }),
      },
      {
        label: 'Leave it out, and let both chronicles argue',
        tooltip: '+60 influence points and "The Question Left Open" (−0.3 unrest everywhere, +5% income) for forty years. No official version, and therefore no official grievance.',
        effects: guard('yokeOpen', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JDH', { infl: 60 });
          mod(ctx, 'the_question_left_open_yokeOpen', 'The Question Left Open', { unrestAll: -0.3, incomeMult: 1.05 }, 480);
          h.chronicle(ctx, 'era', 'The court declines to settle what the decision was worth, and '
            + 'two chronicles go on saying opposite things about it for as long as either '
            + 'kingdom keeps one.');
        }),
      },
    ],
  },

  {
    id: 'ev931_what_the_calves_became',
    title: 'What the Calves Became',
    desc: 'The shrines at Bethel and Dan have been standing, or not standing, for a hundred '
      + 'and eighty years, and the country has grown up around the decision either way. A '
      + 'priest at Bethel has just told a shepherd from Tekoa to take his prophesying '
      + 'somewhere else, because Bethel is the king\'s sanctuary and the king\'s court. '
      + 'That sentence is either the whole problem or the whole achievement.',
    forTag: 'ISL',
    date: { y: -750, m: 7 },
    when: safeTrigger('ev931_what_the_calves_became:when', (ctx) => flag(ctx, 'calvesRaised') || flag(ctx, 'pilgrimageKept')),
    aiOption: 0,
    historical: 'Amos 7:10-13. The shrine at Bethel was still the royal sanctuary of the northern kingdom in the 750s; Josiah of Judah pulled its altar down in 622.',
    options: [
      {
        label: 'Enter it in the chronicle',
        tooltip: 'An establishment of its own bought this kingdom a religion it could govern; keeping the pilgrimage bought it a claim on the other kingdom\'s capital. +25 legitimacy and the matching permanent modifier.',
        effects: guard('calvesEnd:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ISL', { legitimacy: 25, infl: 40 });
          if (flag(ctx, 'calvesRaised')) {
            mod(ctx, 'the_kings_sanctuary', 'The King\'s Sanctuary', { legitimacyAdd: 0.25, incomeMult: 1.06 });
            h.chronicle(ctx, 'era', 'Bethel is the king\'s sanctuary and the king\'s court, and '
              + 'says so to anybody who comes to prophesy in it. The kingdom has an '
              + 'establishment, a calendar and a priesthood of its own, and the other kingdom\'s '
              + 'chroniclers have a formula for it.');
          } else {
            mod(ctx, 'the_road_south_open', 'The Road South Kept Open', { unrestAll: -0.5, legitimacyAdd: 0.2 });
            h.chronicle(ctx, 'era', 'Three times a year the roads south still fill, and the '
              + 'northern kingdom has spent a hundred and eighty years with a standing claim on '
              + 'the one building both kingdoms recognise. No chronicler has ever worked out '
              + 'how to condemn it.');
          }
        }),
      },
      {
        label: 'Leave it out, and let both chronicles argue',
        tooltip: '+60 influence points and "The Question Left Open" (−0.3 unrest everywhere, +5% income) for forty years. No official version, and therefore no official grievance.',
        effects: guard('calvesOpen', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ISL', { infl: 60 });
          mod(ctx, 'the_question_left_open_calvesOpen', 'The Question Left Open', { unrestAll: -0.3, incomeMult: 1.05 }, 480);
          h.chronicle(ctx, 'era', 'The court declines to settle what the decision was worth, and '
            + 'two chronicles go on saying opposite things about it for as long as either '
            + 'kingdom keeps one.');
        }),
      },
    ],
  },

  {
    id: 'ev931_what_pharaoh_left',
    title: 'What Pharaoh Left Behind',
    desc: 'Two hundred years after Shoshenq came up the coast road, Egypt is four '
      + 'governments arguing in the Delta and a Kushite dynasty at Thebes, and the road he '
      + 'came up is about to carry something considerably worse in the other direction. '
      + 'What the campaign of 925 actually left behind was a lesson about what this '
      + 'country is worth to an empire, and both kingdoms learned it differently.',
    forTag: 'player',
    date: { y: -730, m: 5 },
    when: safeTrigger('ev931_what_pharaoh_left:when', (ctx) => flag(ctx, 'shishakTributePaid') || flag(ctx, 'shishakGatesHeld')),
    aiOption: 0,
    historical: 'Shoshenq\'s was the last Egyptian campaign into Asia for three centuries. Egypt spent the interval fragmenting, and every later king of Judah who leaned on it found out what the Assyrians meant by "a broken reed."',
    options: [
      {
        label: 'Enter it in the chronicle',
        tooltip: 'Paying bought the walls and emptied the treasury; refusing burned the country and kept the capital. +30 governance points and the matching permanent modifier.',
        effects: guard('pharaohEnd:0', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.adjust(ctx, me, { gov: 30, legitimacy: 15 });
          if (flag(ctx, 'shishakTributePaid')) {
            mod(ctx, 'the_price_of_walls', 'The Price of the Walls', { incomeMult: 1.06, fortDefBonus: 1 });
            h.chronicle(ctx, 'era', 'Nothing was burned, and the treasury took two generations '
              + 'to refill. The fortified towns that were not sacked in 925 are the same towns '
              + 'the next empire will have to besiege.');
          } else {
            mod(ctx, 'the_towns_that_burned', 'The Towns That Burned', { moraleMult: 1.08, manpowerMult: 1.06 });
            h.chronicle(ctx, 'era', 'The burn layers are still under the floors of a dozen '
              + 'towns, and the capital was never entered. It is a different kind of memory '
              + 'from a paid tribute, and the men who muster remember it.');
          }
        }),
      },
      {
        label: 'Leave it out, and let both chronicles argue',
        tooltip: '+60 influence points and "The Question Left Open" (−0.3 unrest everywhere, +5% income) for forty years. No official version, and therefore no official grievance.',
        effects: guard('pharaohOpen', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 60 });
          mod(ctx, 'the_question_left_open_pharaohOpen', 'The Question Left Open', { unrestAll: -0.3, incomeMult: 1.05 }, 480);
          h.chronicle(ctx, 'era', 'The court declines to settle what the decision was worth, and '
            + 'two chronicles go on saying opposite things about it for as long as either '
            + 'kingdom keeps one.');
        }),
      },
    ],
  },

  {
    id: 'ev931_what_the_marriage_cost',
    title: 'What the Marriage Cost',
    desc: 'A century and a third after the Sidonian queen came up the coast road, the '
      + 'account can be closed. Nothing in the northern kingdom\'s history divides its own '
      + 'chroniclers so completely: the same generation produced the richest state this '
      + 'country has ever been and the tradition that has spent every year since '
      + 'explaining why that did not matter.',
    forTag: 'ISL',
    date: { y: -740, m: 8 },
    when: safeTrigger('ev931_what_the_marriage_cost:when', (ctx) => flag(ctx, 'tyrianMarriage') || flag(ctx, 'tyrianMarriageRefused')),
    aiOption: 0,
    historical: 'Jezebel\'s marriage produced the Omride peak — Qarqar, the ivory house, the Moabite tribute — and the Elijah cycle, and ended with Jehu\'s purge in 841 and a kingdom half the size.',
    options: [
      {
        label: 'Enter it in the chronicle',
        tooltip: 'The marriage bought a generation of wealth and a permanent quarrel; refusing it bought a poorer kingdom nobody had to purge. +25 legitimacy and the matching permanent modifier.',
        effects: guard('marriageEnd:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ISL', { legitimacy: 25, treasury: 150 });
          if (flag(ctx, 'tyrianMarriage')) {
            mod(ctx, 'the_ivory_generation', 'The Ivory Generation', { tradeMult: 1.1, incomeMult: 1.06 });
            h.chronicle(ctx, 'era', 'The ivory inlays, the ostraca, the two thousand chariots and '
              + 'the prophets in the hills all belong to the same fifty years, and no chronicle '
              + 'written afterwards manages to say so in one sentence.');
          } else {
            mod(ctx, 'the_quiet_hills', 'The Quiet Hills', { unrestAll: -0.5, legitimacyAdd: 0.2 });
            h.chronicle(ctx, 'era', 'There was no temple of Baal in the capital, no purge, and '
              + 'no Elijah. The kingdom is poorer by a third and has not lost a king to its own '
              + 'army in a hundred years.');
          }
        }),
      },
      {
        label: 'Leave it out, and let both chronicles argue',
        tooltip: '+60 influence points and "The Question Left Open" (−0.3 unrest everywhere, +5% income) for forty years. No official version, and therefore no official grievance.',
        effects: guard('marriageOpen', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ISL', { infl: 60 });
          mod(ctx, 'the_question_left_open_marriageOpen', 'The Question Left Open', { unrestAll: -0.3, incomeMult: 1.05 }, 480);
          h.chronicle(ctx, 'era', 'The court declines to settle what the decision was worth, and '
            + 'two chronicles go on saying opposite things about it for as long as either '
            + 'kingdom keeps one.');
        }),
      },
    ],
  },

  // ── the undated pressure of the age ───────────────────────────────────────
  {
    id: 'ev931_the_high_places',
    title: 'The High Places',
    desc: 'Every ridge in this country has a shrine on it: a platform, a standing stone, a '
      + 'pole for the goddess and a place to burn a lamb. Most of them are older than the '
      + 'monarchy. The people using them are not apostates and would be baffled to be told '
      + 'they were — they are sacrificing to the God of their fathers, in the place their '
      + 'fathers did, because that is what a place of sacrifice is.\n\n'
      + 'A party at court wants them shut. Not because the god is wrong but because a '
      + 'kingdom with four hundred altars has four hundred priesthoods, four hundred sets '
      + 'of local revenues, and no way of telling any of them what to do.',
    forTag: 'player',
    trigger: safeTrigger('ev931_the_high_places:trigger', (ctx) => {
      const t = ctx.game.tags[P(ctx)];
      return !!t && (t.stability || 0) >= 1 && ctx.game.date.y >= -900;
    }),
    aiOption: 2,
    historical: 'The refrain of the book of Kings about the good kings of Judah is "howbeit the high places were not taken away." Only Hezekiah and Josiah are credited with trying, and both attempts are late.',
    options: [
      {
        label: 'Shut them: one altar, and the crown\'s',
        tooltip: '−60 governance points and "The Altars Purged" (+12% income, +0.25 legitimacy a month) permanently, at +1.5 unrest everywhere for fifteen years. The Canaanite drift stops dead.',
        effects: guard('highplaces:0', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.setFlag(ctx, 'altarsPurged', true);
          h.adjust(ctx, me, { gov: -60, legitimacy: 15 });
          mod(ctx, 'the_altars_purged', 'The Altars Purged', { incomeMult: 1.12, legitimacyAdd: 0.25 });
          mod(ctx, 'the_ridges_resent_it', 'The Ridges Resent It', { unrestAll: 1.5 }, 180);
          h.chronicle(ctx, 'era', 'The platforms are broken, the stones thrown down and the '
            + 'poles burned, and the revenue of four hundred local sanctuaries is redirected to '
            + 'one. Nobody in any village thinks this is piety.');
        }),
      },
      {
        label: 'License them: a royal priest at every one',
        tooltip: '−40 influence points and "The Licensed Shrines" (+8% income, −0.6 unrest everywhere) permanently. The altars stay, the revenue is shared, and the argument is postponed for three centuries.',
        effects: guard('highplaces:1', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.adjust(ctx, me, { infl: -40, gov: 20 });
          mod(ctx, 'the_licensed_shrines', 'The Licensed Shrines', { incomeMult: 1.08, unrestAll: -0.6 });
          h.setFlag(ctx, 'shrinesLicensed', true);
          h.chronicle(ctx, 'era', 'A royal priest is appointed to every hilltop with a platform '
            + 'on it, and the tithe is split between the shrine and the treasury. The reformers '
            + 'call it a compromise with idolatry; the treasury calls it revenue.');
        }),
      },
      {
        label: 'Leave them alone',
        tooltip: 'Nothing spent and nothing gained: "The Old Places" (−0.3 unrest everywhere) for twenty years, and the question is left to a king three hundred years from now who will be remembered for it.',
        effects: guard('highplaces:2', (ctx) => {
          const h = ctx.helpers;
          mod(ctx, 'the_old_places', 'The Old Places', { unrestAll: -0.3 }, 240);
          h.chronicle(ctx, 'era', 'The high places are not taken away. The chronicle will note '
            + 'it, in the same words, about every reign for the next three hundred years.');
        }),
      },
    ],
  },

  {
    id: 'ev931_a_prophet_in_the_court',
    title: 'A Prophet in the Court',
    desc: 'A man with no office, no land and no army has walked past the guard and told the '
      + 'king to his face that the campaign will fail, the harvest will fail, or the '
      + 'dynasty will fail. There is no procedure for this. He is not a priest, so the '
      + 'priesthood cannot discipline him; he holds nothing, so nothing can be taken away; '
      + 'and half the court believes him.\n\n'
      + 'Every kingdom in this region has diviners, and they work for the palace. This '
      + 'country has produced something else — a tradition of men who work for nobody, and '
      + 'whose whole authority comes from having been right about the last king.',
    forTag: 'player',
    trigger: safeTrigger('ev931_a_prophet_in_the_court:trigger', (ctx) => {
      const t = ctx.game.tags[P(ctx)];
      return !!t && ((t.legitimacy || 0) < 50 || (t.warExhaustion || 0) > 6);
    }),
    aiOption: 0,
    historical: 'Nathan, Ahijah, Shemaiah, Elijah, Micaiah ben Imlah, Amos, Hosea, Isaiah, Jeremiah — the office does not exist in any neighbouring state in this form, and it outlasts both kingdoms.',
    options: [
      {
        label: 'Hear him out, and pay for the word',
        tooltip: '−30 influence points and +15 legitimacy: "The Word Is Heard" (+0.2 legitimacy a month, −0.5 unrest everywhere) for twenty years.',
        effects: guard('prophet:0', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.adjust(ctx, me, { infl: -30, legitimacy: 15 });
          mod(ctx, 'the_word_is_heard', 'The Word Is Heard', { legitimacyAdd: 0.2, unrestAll: -0.5 }, 240);
          h.chronicle(ctx, 'era', 'The man is heard in open court and sent away with an escort '
            + 'and a gift. Both halves of that are deliberate.');
        }),
      },
      {
        label: 'Put him in the prison house on bread and water',
        tooltip: '+30 governance points and "The Court Undisturbed" (+6% income) for fifteen years, at −10 legitimacy and +0.8 unrest everywhere for ten. The account of it will be written by his disciples.',
        effects: guard('prophet:1', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.adjust(ctx, me, { gov: 30, legitimacy: -10 });
          mod(ctx, 'the_court_undisturbed', 'The Court Undisturbed', { incomeMult: 1.06 }, 180);
          mod(ctx, 'the_disciples_write', 'The Disciples Write It Down', { unrestAll: 0.8 }, 120);
          h.chronicle(ctx, 'era', 'He goes to the prison house on the bread of affliction and the '
            + 'water of affliction. His disciples write down what he said on the way, which is '
            + 'how it survives and the king\'s answer does not.');
        }),
      },
    ],
  },

  {
    id: 'ev931_the_captain_of_the_chariots',
    title: 'A Captain Is Anointed',
    desc: 'A prophet\'s servant has poured oil on the head of a chariot commander in a '
      + 'muster camp and run out of the door, and the man has come out of the tent to find '
      + 'his colleagues asking why the madman came. He tells them. They take off their '
      + 'cloaks, throw them on the bare steps under him, blow a trumpet and say: Jehu is '
      + 'king.\n\n'
      + 'This is how four of this kingdom\'s nine dynasties begin, and every one of them '
      + 'begins in an army camp with a prophet\'s oil and a trumpet. There is no procedure '
      + 'for the succession here that is stronger than a trumpet.',
    forTag: 'ISL',
    trigger: safeTrigger('ev931_the_captain:trigger', (ctx) => {
      const t = ctx.game.tags.ISL;
      return !!t && (t.legitimacy || 0) < 40 && (t.stability || 0) < 1 && ctx.game.date.y >= -900;
    }),
    aiOption: 1,
    historical: '2 Kings 9. Jehu drove furiously, killed two kings in one afternoon, and founded the longest dynasty the northern kingdom ever had.',
    options: [
      {
        label: 'Buy the camp before the trumpet sounds',
        tooltip: '−250 talents and −40 martial points: the proclamation does not happen. "The Camp Bought" (+0.2 legitimacy a month) for fifteen years, and the captains learn what a crown is worth in silver.',
        effects: guard('captain:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ISL', { treasury: -250, mar: -40, legitimacy: 10 });
          mod(ctx, 'the_camp_bought', 'The Camp Bought', { legitimacyAdd: 0.2 }, 180);
          h.chronicle(ctx, 'era', 'The donative reaches the camp before the oil does. Nobody '
            + 'blows a trumpet and nobody writes it down, which is the point.');
        }),
      },
      {
        label: 'Let him come, and meet him in the field',
        tooltip: 'A rising: +2 unrest everywhere for five years and −4,000 manpower, but +25 legitimacy if the crown survives it and "The Throne Defended" (+10% morale) for twenty years.',
        effects: guard('captain:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ISL', { manpower: -4000, legitimacy: 25, mar: 20 });
          mod(ctx, 'the_throne_defended', 'The Throne Defended', { moraleMult: 1.1 }, 240);
          mod(ctx, 'the_camp_in_arms', 'The Camp in Arms', { unrestAll: 2 }, 60);
          h.chronicle(ctx, 'era', 'The captain is met in the field by the household troops. The '
            + 'chronicle of the kings of Israel records the year, the name and nothing else.');
        }),
      },
    ],
  },

  {
    id: 'ev931_the_ostraca_of_the_vintage',
    title: 'The Ostraca of the Vintage',
    desc: 'The steward has brought in the season\'s receipts and they are potsherds — a '
      + 'line of ink on each: in the ninth year, from Kosoh, to Gaddiyaw, a jar of old '
      + 'wine. In the tenth year, from Hazeroth, to Gaddiyaw, a jar of fine oil. Dozens of '
      + 'them, from named villages to named men at court, dated by regnal year.\n\n'
      + 'It is the dullest document this kingdom produces and the most important: it means '
      + 'there is a tax district, a clerk who can write, a storehouse that expects the jar, '
      + 'and a man at court who is accountable for it. Almost nobody else on this map has '
      + 'all four.',
    forTag: 'player',
    trigger: safeTrigger('ev931_ostraca:trigger', (ctx) => {
      const t = ctx.game.tags[P(ctx)];
      return !!t && (((t.reforms || {}).civ | 0) >= 1) && ctx.game.date.y >= -890;
    }),
    aiOption: 0,
    historical: 'The Samaria ostraca: sixty-three inked potsherds from the royal storehouse, dated to regnal years 9, 10 and 15, recording deliveries of oil and wine from named estates to named officials.',
    options: [
      {
        label: 'Put a clerk in every district',
        tooltip: '−50 governance points and "The Storehouse Receipts" (+10% income, +5% growth) permanently.',
        effects: guard('ostraca:0', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.adjust(ctx, me, { gov: -50 });
          mod(ctx, 'the_storehouse_receipts', 'The Storehouse Receipts', { incomeMult: 1.1, growthMult: 1.05 });
          h.chronicle(ctx, 'era', 'A clerk, a sherd and a jar: the kingdom can now tell the '
            + 'difference between a village that has paid and a village that says it has.');
        }),
      },
      {
        label: 'Farm the districts out to the men who own them',
        tooltip: '+250 talents now and "The Farmed Districts" (+6% income, +0.5 unrest everywhere) permanently. Cheaper today, and the great houses of the valleys become a constituency.',
        effects: guard('ostraca:1', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.adjust(ctx, me, { treasury: 250 });
          mod(ctx, 'the_farmed_districts', 'The Farmed Districts', { incomeMult: 1.06, unrestAll: 0.5 });
          h.chronicle(ctx, 'era', 'The districts are farmed to the men who already own most of '
            + 'them. The receipts stop being written, because the men who would have written '
            + 'them now work for the men they would have audited.');
        }),
      },
    ],
  },

  {
    id: 'ev931_the_name_of_the_god_on_a_jar',
    title: 'A Blessing Written on a Wall',
    desc: 'A caravan station in the desert south of the kingdom has a plastered wall with '
      + 'travellers\' blessings inked on it, and the wording has reached the court: "I '
      + 'bless you by YHWH of Samaria and by his asherah." There is another, on a storage '
      + 'jar: "by YHWH of Teman and by his asherah."\n\n'
      + 'Nobody who wrote these thought they were doing anything remarkable. The court has '
      + 'to decide whether it agrees — and the decision is not about a caravan station. It '
      + 'is about whether the god of this kingdom is one of a family or the only one there '
      + 'is, which is a question no other state on this map has ever had to rule on.',
    forTag: 'player',
    trigger: safeTrigger('ev931_asherah:trigger', (ctx) => ctx.game.date.y >= -830 && !flag(ctx, 'altarsPurged')),
    maxYear: -722,
    aiOption: 1,
    historical: 'The Kuntillet Ajrud inscriptions, c. 800 BCE, found on plaster and pithoi at a desert way-station in the north Sinai.',
    options: [
      {
        label: 'Rule against it: he has no consort',
        tooltip: '−40 influence points, +20 legitimacy with the strict houses and "The Sole Name" (+0.25 legitimacy a month, −6% income) permanently — a doctrine, four centuries before anybody else on this map has one.',
        effects: guard('asherah:0', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.adjust(ctx, me, { infl: -40, legitimacy: 20 });
          mod(ctx, 'the_sole_name', 'The Sole Name', { legitimacyAdd: 0.25, incomeMult: 0.94 });
          h.setFlag(ctx, 'soleNameRuled', true);
          h.chronicle(ctx, 'era', 'The court rules that the god of this kingdom has no consort. '
            + 'It is an extraordinary thing for a state to say out loud in the ninth century, '
            + 'and it will take another three hundred years to be generally believed.');
        }),
      },
      {
        label: 'Rule nothing: a blessing on a wall is a blessing on a wall',
        tooltip: '+30 governance points and "The Wall at the Waystation" (−0.5 unrest everywhere, +5% trade) permanently. The caravans keep writing what they like, and so does everybody else.',
        effects: guard('asherah:1', (ctx) => {
          const h = ctx.helpers;
          const me = P(ctx);
          h.adjust(ctx, me, { gov: 30 });
          mod(ctx, 'the_wall_at_the_waystation', 'The Wall at the Waystation', { unrestAll: -0.5, tradeMult: 1.05 });
          h.chronicle(ctx, 'era', 'No ruling is issued. The plaster at the waystation is '
            + 'replastered in due course, and the blessings underneath survive because of it.');
        }),
      },
    ],
  },
];

// --- SPEC §216: a card is answered by the court it is addressed to ---------
// One loop instead of a tag argument on every call site in the file. A card
// marked `player` or `both` is always the chair the player is sitting in and
// is left alone; a card marked ISL or JDH writes to that court whether or not
// the player is in it.
for (const _c of EVENTS_931) {
  if (!_c || (_c.forTag !== 'ISL' && _c.forTag !== 'JDH')) continue;
  for (const _o of _c.options || []) {
    if (typeof _o.effects !== 'function') continue;
    _o.effects = bindAudience(_c.forTag, _o.effects);
  }
}
