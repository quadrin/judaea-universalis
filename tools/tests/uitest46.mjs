// UI verification — SPEC §216, the report from a real table: two thrones, and
// money still crossing. This drives the REAL path a guest's spending takes —
// the guest's own proxied action, over a real data channel, executed on the
// host under the guest's crown — and watches BOTH purses on the host's world
// after every one of them. The headless sweeps call the host's actions
// directly; this is the only suite that spends over the wire.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
const BOOT_MS = Number(process.env.JU_BOOT_TIMEOUT || 480000);
const OUT = (process.env.JU_OUT || '/tmp') + '/';

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const browser = await chromium.launch({
  executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader', '--disable-features=WebRtcHideLocalIpsWithMdns'],
});

async function boot(ctxB) {
  const page = await ctxB.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.bm-card', { timeout: BOOT_MS });
  return { page, errors };
}

console.log('== a table with two thrones ==');
const ctxH = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const { page: host, errors: hostErrors } = await boot(ctxH);
await host.locator('[data-ref="mp"]').click();
await host.waitForSelector('#mp-lobby:not(.hidden)');
await host.locator('[data-ref="host"]').click();
await host.selectOption('[data-ref="bm"]', '1');       // The Judaean Civil War, 67 BCE
await host.selectOption('[data-ref="tag"]', 'HYR');
await host.locator('[data-ref="invite"]').click();
await host.waitForFunction(() => {
  const ta = document.querySelector('[data-ref="invcode"]');
  return ta && /^JU[12]\./.test(ta.value);
}, null, { timeout: 15000 });
const invite = await host.locator('[data-ref="invcode"]').inputValue();

const ctxG = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const { page: guest, errors: guestErrors } = await boot(ctxG);
await guest.locator('[data-ref="mp"]').click();
await guest.waitForSelector('#mp-lobby:not(.hidden)');
await guest.locator('[data-ref="join"]').click();
await guest.fill('[data-ref="invite"]', invite);
await guest.locator('[data-ref="answer"]').click();
await guest.waitForFunction(() => {
  const ta = document.querySelector('[data-ref="reply"]');
  return ta && /^JU[12]\./.test(ta.value);
}, null, { timeout: 15000 });
await host.fill('[data-ref="reply"]', await guest.locator('[data-ref="reply"]').inputValue());
await host.locator('[data-ref="accept"]').click();
await host.waitForSelector('.mp-seat', { timeout: 20000 });
await host.locator('[data-ref="begin"]').click();
await host.waitForFunction(() => !!window._ctx, null, { timeout: 15000 });
await guest.waitForFunction(() => !!window._ctx, null, { timeout: 20000 });

const seats = await host.evaluate(() => ({
  host: window._ctx.game.playerTag,
  guests: window._mp.guests.map((g) => g.tag),
  humans: window._ctx.game.humanTags,
}));
ok(seats.host === 'HYR' && seats.guests.join(',') === 'ARI', 'two thrones: ' + JSON.stringify(seats));

// Both purses filled to known, DIFFERENT figures, so a crossing is unmistakable.
await host.evaluate(() => {
  const g = window._ctx.game;
  g.paused = true;
  for (const [tag, gold] of [['HYR', 9000], ['ARI', 3000]]) {
    const t = g.tags[tag];
    t.treasury = gold;
    t.points = { gov: 500, infl: 500, mar: 500 };
    t.manpower = 40000;
  }
  window._mp.snapDirty = true;
});
await guest.waitForFunction(() => window._ctx.game.tags.ARI.treasury === 3000, null, { timeout: 10000 });
ok(true, 'the guest sees its own purse at 3000 and the host holds 9000');

// Every way a guest can spend, one at a time, over the wire.
const purses = () => host.evaluate(() => {
  const g = window._ctx.game;
  const of = (t) => ({
    gold: Math.round(g.tags[t].treasury),
    gov: Math.round(g.tags[t].points.gov),
    infl: Math.round(g.tags[t].points.infl),
    mar: Math.round(g.tags[t].points.mar),
  });
  return { HYR: of('HYR'), ARI: of('ARI') };
});
const spend = async (label, fn) => {
  const before = await purses();
  await guest.evaluate(fn);
  await host.waitForTimeout(900); // the command crosses and runs
  const after = await purses();
  const hostMoved = JSON.stringify(before.HYR) !== JSON.stringify(after.HYR);
  const guestMoved = JSON.stringify(before.ARI) !== JSON.stringify(after.ARI);
  ok(!hostMoved, label + ': the host\'s purse is untouched — ' + JSON.stringify(before.HYR)
    + ' -> ' + JSON.stringify(after.HYR));
  console.log('        (guest ' + JSON.stringify(before.ARI) + ' -> ' + JSON.stringify(after.ARI)
    + (guestMoved ? '' : ', unchanged') + ')');
};

console.log('== the guest spends, over the wire ==');
await spend('a gift to Nabataea', () => { window._actions.sendGift('NAB'); });
await spend('taking a loan', () => { window._actions.takeLoan(); });
await spend('buying stability', () => { window._actions.buyStability(); });
await spend('improving relations', () => { window._actions.improveRelations('ADI'); });
await spend('developing a province', () => {
  const g = window._ctx.game;
  const p = Object.values(g.provinces).find((x) => x && x.owner === 'ARI');
  if (p) window._actions.devProvince(p.id, 'tax');
});
await spend('recruiting', () => {
  const g = window._ctx.game;
  const p = Object.values(g.provinces).find((x) => x && x.owner === 'ARI');
  if (p) window._actions.recruit(p.id, 'infantry');
});
await spend('a national decision', () => { window._actions.enactDecision('grand_festival'); });
await spend('an idea', () => {
  const trees = window._actions.getIdeas ? window._actions.getIdeas() : null;
  const key = trees && trees[0] && (trees[0].key || trees[0].id);
  if (key) window._actions.buyIdea(key);
});
await spend('hiring an advisor', () => { window._actions.hireAdvisor('gov', 0); });
await spend('a subsidy', () => { window._actions.sendSubsidy('ADI'); });

console.log('== and the host spending does not reach the guest ==');
{
  const before = await purses();
  await host.evaluate(() => { window._actions.sendGift('NAB'); });
  await host.waitForTimeout(600);
  const after = await purses();
  ok(JSON.stringify(before.ARI) === JSON.stringify(after.ARI),
    'the guest\'s purse is untouched by the host\'s gift — ' + JSON.stringify(before.ARI)
    + ' -> ' + JSON.stringify(after.ARI));
  ok(after.HYR.gold < before.HYR.gold, 'while the host paid for it themselves');
}

await host.screenshot({ path: OUT + 'v216-purses-host.png' });
const errs = hostErrors.concat(guestErrors).filter((e) => !/stun|ice|turn/i.test(e));
ok(errs.length === 0, 'no page errors across both browsers: ' + JSON.stringify(errs.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
