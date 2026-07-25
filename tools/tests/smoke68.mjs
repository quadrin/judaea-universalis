// smoke68 — the cloud shelf (SPEC §93). Drives server/worker.js directly over
// an in-memory KV: invite rooms (mint, fetch, answer once, expire) and save
// shelves (write, list, read, delete, prune, and the wall between two players).
//
//   node tools/tests/smoke68.mjs
import { startCloudMock } from './ju-cloud-mock.mjs';

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const { url, kv, stop } = await startCloudMock(8629);

async function call(path, { method = 'GET', body, key } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (key) headers['X-JU-Key'] = key;
  const res = await fetch(url + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  return { status: res.status, data };
}

console.log('== health ==');
{
  const r = await call('/health');
  ok(r.status === 200 && r.data.ok === true && r.data.service === 'ju-cloud', 'the shelf answers /health');
  const cors = await fetch(url + '/health', { method: 'OPTIONS' });
  ok(cors.status === 204 && cors.headers.get('access-control-allow-origin') === '*',
    'preflight is allowed from any origin (the game is a different origin)');
}

console.log('== invite rooms ==');
let code = '';
{
  const bad = await call('/room', { method: 'POST', body: {} });
  ok(bad.status === 400, 'a room with no offer is refused');

  const r = await call('/room', { method: 'POST', body: { offer: 'JU1.OFFER-A' } });
  code = r.data.code;
  ok(r.status === 200 && /^[A-Z0-9]{6}$/.test(code), 'minting returns a six-character code: ' + code);
  ok(!/[ILO01]/.test(code), 'the code avoids characters humans mistype (I, L, O, 0, 1)');
  ok(r.data.ttl === 900, 'the room announces its own fifteen-minute life');

  const got = await call('/room/' + code);
  ok(got.status === 200 && got.data.offer === 'JU1.OFFER-A', 'the guest can fetch the offer by code');
  ok(got.data.answer === null, 'no answer is waiting yet');

  const lower = await call('/room/' + code.toLowerCase());
  ok(lower.status === 200, 'a code typed in lower case still finds the room');

  const missing = await call('/room/ZZZZZZ');
  ok(missing.status === 404, 'an unknown code is a clean 404, not a crash');
  const malformed = await call('/room/nope');
  ok(malformed.status === 400, 'something that is not a code at all is rejected');

  const ans = await call('/room/' + code + '/answer', { method: 'POST', body: { answer: 'JU1.ANSWER-A' } });
  ok(ans.status === 200 && ans.data.ok === true, 'the guest posts its answer');

  const back = await call('/room/' + code);
  ok(back.data.answer === 'JU1.ANSWER-A', 'the host collects the answer from the same room');

  const second = await call('/room/' + code + '/answer', { method: 'POST', body: { answer: 'JU1.ANSWER-B' } });
  ok(second.status === 409, 'a second player cannot overwrite an answered invite');
  const still = await call('/room/' + code);
  ok(still.data.answer === 'JU1.ANSWER-A', 'and the first answer survives the attempt');
}

console.log('== rooms expire on their own ==');
{
  const rec = kv._store.get('room:' + code);
  ok(!!rec && rec.expiresAt > 0, 'the room was written with an expiry');
  rec.expiresAt = Date.now() - 1;
  const gone = await call('/room/' + code);
  ok(gone.status === 404, 'once expired the room is simply not there');
}

console.log('== saves need a player code ==');
const KEY_A = 'ABCDEFGHJKMNPQRSTUVW';
const KEY_B = 'XYZ23456789ABCDEFGHJ';
{
  const anon = await call('/saves');
  ok(anon.status === 401, 'no key, no shelf');
  const stub = await call('/saves', { key: 'SHORT' });
  ok(stub.status === 401, 'a truncated key cannot fall into somebody else\'s shelf');
}

console.log('== writing and reading a shelf ==');
{
  const put = await call('/saves/auto-66ce', {
    method: 'PUT', key: KEY_A,
    body: { meta: { savedAt: 1000, bookmarkId: '66ce', tag: 'JUD', kind: 'auto' }, save: { v: 1, game: { n: 1 } } },
  });
  ok(put.status === 200 && put.data.ok === true, 'a campaign lands on the shelf');
  ok(Array.isArray(put.data.saves) && put.data.saves.length === 1, 'the write hands back the new list');
  ok(put.data.saves[0].id === 'auto-66ce' && put.data.saves[0].tag === 'JUD',
    'the row carries the metadata the saves panel shows');

  const got = await call('/saves/auto-66ce', { key: KEY_A });
  ok(got.status === 200 && got.data.save.game.n === 1, 'and reads back verbatim');

  const list = await call('/saves', { key: KEY_A });
  ok(list.data.saves.length === 1, 'the shelf lists it');

  const miss = await call('/saves/auto-1948ce', { key: KEY_A });
  ok(miss.status === 404, 'a save that was never written is a 404');

  const noBody = await call('/saves/auto-40bce', { method: 'PUT', key: KEY_A, body: { meta: {} } });
  ok(noBody.status === 400, 'a write with no game body is refused');
}

console.log('== the player code is the whole wall ==');
{
  const other = await call('/saves', { key: KEY_B });
  ok(other.data.saves.length === 0, 'a different player sees an empty shelf');
  const peek = await call('/saves/auto-66ce', { key: KEY_B });
  ok(peek.status === 404, 'and cannot read the first player\'s campaign');

  const keys = [...kv._store.keys()].join('|');
  ok(!keys.includes(KEY_A), 'the raw player code is never written into the store');
  ok(/^save:[0-9a-f]{32}:/.test([...kv._store.keys()].find((k) => k.startsWith('save:'))),
    'shelves are namespaced by a hash of the code');

  const same = await call('/saves', { key: 'abcde-fghjk-mnpqr-stuvw' });
  ok(same.data.saves.length === 1, 'the same code in lower case with dashes finds the same shelf');
}

console.log('== ordering and pruning ==');
{
  for (let i = 0; i < 30; i++) {
    await call('/saves/manual-66ce-' + (2000 + i), {
      method: 'PUT', key: KEY_A,
      body: { meta: { savedAt: 2000 + i, bookmarkId: '66ce', tag: 'JUD', kind: 'manual' }, save: { v: 1, game: { n: i } } },
    });
  }
  const list = await call('/saves', { key: KEY_A });
  ok(list.data.saves.length === 24, 'the shelf holds at most twenty-four campaigns, got ' + list.data.saves.length);
  ok(list.data.saves[0].savedAt === 2029, 'newest first');
  ok(list.data.saves.every((s, i, a) => i === 0 || a[i - 1].savedAt >= s.savedAt), 'and strictly descending');
  ok(list.data.saves.some((s) => s.id === 'manual-66ce-2029'), 'the save just written is never the one pruned');
  ok(!list.data.saves.some((s) => s.id === 'auto-66ce'), 'the oldest rows went, as promised');
}

console.log('== deleting ==');
{
  const del = await call('/saves/manual-66ce-2029', { method: 'DELETE', key: KEY_A });
  ok(del.status === 200, 'a campaign can be struck from the shelf');
  ok(!del.data.saves.some((s) => s.id === 'manual-66ce-2029'), 'and the returned list no longer has it');
  const gone = await call('/saves/manual-66ce-2029', { key: KEY_A });
  ok(gone.status === 404, 'reading it back gives a 404');
}

console.log('== bad routes ==');
{
  ok((await call('/nope')).status === 404, 'an unknown route is a 404');
  ok((await call('/saves/has space', { key: KEY_A })).status === 400, 'a save id with whitespace is refused');
}

await stop();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
