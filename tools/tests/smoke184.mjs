// A matrix entry must match the same campaign run alone, including events,
// counters and the player's first-year finances. Also exercises live crisis cards.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const scratch = mkdtempSync(join(tmpdir(), 'ju-balance-'));
const runner = fileURLToPath(new URL('../autorun.mjs', import.meta.url));
try {
  const run = (name, faction) => {
    const path = join(scratch, name + '.json');
    execFileSync(process.execPath, [...process.execArgv, runner, '1', '66ce',
      '--factions=' + faction, '--quiet', '--json=' + path], { stdio: 'pipe' });
    return JSON.parse(readFileSync(path, 'utf8'));
  };
  const matrix = run('matrix', 'all');
  assert.equal(matrix.runs.length, 3);
  const solo = run('solo', 'AGR');
  assert.deepEqual(matrix.runs.find(r => r.tag === 'AGR'), solo.runs[0]);
  assert(matrix.runs.every(r => !r.error && r.metrics.observedMonths === 12));
  assert(matrix.runs.every(r => r.metrics.finalTag === r.tag));
  console.log('ALL PASS: matrix and standalone campaign results match exactly');
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
