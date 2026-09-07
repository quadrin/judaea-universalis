// Reproducible experiment selection. These profiles vary AI personality only;
// they are sensitivity checks, not scripted human strategies.
export const PROFILES = {
  historical: null,
  cautious: { aggression: 0.3, caution: 1.7 },
  bold: { aggression: 1.5, caution: 0.75 },
};

export function parseOptions(argv) {
  const out = { years: 8, bookmark: null, seeds: 1, seed: 1234567,
    factions: 'first', profiles: ['historical'], difficulty: 'normal', json: null, quiet: false };
  const positional = [];
  const integer = (value, name, min, max) => {
    const n = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(n) || n < min || n > max)
      throw new Error(`${name} must be an integer from ${min} to ${max}`);
    return n;
  };
  for (const arg of argv) {
    if (arg === '--quiet') { out.quiet = true; continue; }
    if (arg === '--help') { out.help = true; continue; }
    if (!arg.startsWith('--')) { positional.push(arg); continue; }
    const eq = arg.indexOf('=');
    const key = arg.slice(2, eq < 0 ? undefined : eq), value = eq < 0 ? '' : arg.slice(eq + 1);
    if (key === 'seeds') out.seeds = integer(value, key, 1, 1000);
    else if (key === 'seed') out.seed = integer(value, key, 1, 0xffffffff);
    else if (key === 'factions' && value) out.factions = value;
    else if (key === 'profiles' && value) {
      out.profiles = [...new Set(value.split(','))];
      if (out.profiles.some(p => !Object.hasOwn(PROFILES, p))) throw new Error('Unknown profile: ' + value);
    } else if (key === 'difficulty' && ['normal', 'hard'].includes(value)) out.difficulty = value;
    else if (key === 'json' && value) out.json = value;
    else throw new Error('Unknown or incomplete option: ' + arg);
  }
  if (positional.length > 2) throw new Error('Expected [years] [bookmarkId]');
  if (positional[0]) out.years = integer(positional[0], 'years', 1, 300);
  out.bookmark = positional[1] || null;
  if (out.seed + out.seeds - 1 > 0xffffffff) throw new Error('Seed range exceeds uint32');
  return out;
}

export function experiments(books, options) {
  const selected = books.filter(([id]) => !options.bookmark || id === options.bookmark);
  if (!selected.length) throw new Error('Unknown bookmark: ' + options.bookmark);
  const out = [];
  for (const entry of selected) {
    let tags = entry[1].playableTags.map(p => p.tag);
    if (options.factions === 'first') tags = tags.slice(0, 1);
    else if (options.factions !== 'all') tags = tags.filter(t => t === options.factions);
    if (!tags.length && options.bookmark) throw new Error('Faction is not playable here: ' + options.factions);
    for (const tag of tags) for (const profile of options.profiles) for (let i = 0; i < options.seeds; i++)
      out.push({ entry, tag, profile, seed: options.seed + i, years: options.years, difficulty: options.difficulty });
  }
  if (!out.length) throw new Error('No playable factions match: ' + options.factions);
  return out;
}

export function summarize(runs) {
  const groups = new Map();
  for (const r of runs) {
    const key = [r.id, r.tag, r.profile, r.difficulty].join('/');
    if (!groups.has(key)) groups.set(key, { key, runs: 0, completed: 0, crashes: 0,
      wins: 0, losses: 0, unresolved: 0, survived: 0, bankruptcies: 0, debtSpirals: 0 });
    const g = groups.get(key);
    g.runs++;
    if (r.error) { g.crashes++; continue; }
    g.completed++;
    g[r.metrics.result === 'win' ? 'wins' : r.metrics.result === 'loss' ? 'losses' : 'unresolved']++;
    if (r.metrics.aliveAtEnd) g.survived++;
    if (r.metrics.firstBankruptcyDay !== null) g.bankruptcies++;
    if (r.metrics.firstDebtSpiralDay !== null) g.debtSpirals++;
  }
  return [...groups.values()];
}
