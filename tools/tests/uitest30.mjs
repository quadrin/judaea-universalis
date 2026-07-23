// UI verification — SPEC §78: the war overview names the objective and its
// ticking contribution, and the peace table marks a goal-aligned demand.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/pw') + '/');
const { chromium } = require('playwright');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const browser = await chromium.launch({
  executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(45000);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.bm-card');
for (let i = 0; i < 8; i++) {
  const card = page.locator('.bm-card.current');
  if (/Great Revolt/.test((await card.textContent()) || '')) { await card.click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(400);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card', { hasText: 'Judaea' }).first().click();
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(500);

const staged = await page.evaluate(() => {
  const ctx = window._ctx;
  const g = ctx.game;
  const war = g.wars.find((w) => w.attackers.includes('JUD') && w.defenders.includes('ROM'));
  const target = g.provinces.filter((p) => p && !p.impassable && p.owner === 'ROM')
    .sort((a, b) => (b.dev.tax + b.dev.prod + b.dev.mp) - (a.dev.tax + a.dev.prod + a.dev.mp))[0];
  g.tags.JUD.claims = Array.from(new Set([...(g.tags.JUD.claims || []), target.id]));
  war.cb = 'claim';
  delete war.goal;
  war._goalScore = 7;
  target.controller = 'JUD';
  war.warscore.JUD = 40;
  war.warscore.ROM = -40;
  ctx.bus.emit('war', {});
  return { warId: war.id, targetName: target.name };
});

console.log('== the war overview explains the objective ==');
await page.locator(`#outliner .ol-war[data-war="${staged.warId}"]`).click();
await page.waitForSelector('#war-modal:not(.hidden)');
const warText = await page.locator('#war-modal').textContent();
ok(/War goal: Seize/.test(warText) && warText.includes(staged.targetName),
  'the overview names the claimed objective: ' + staged.targetName);
ok(/From war goal/.test(warText) && /ticking score \+7 \/ 25/.test(warText),
  'the overview separates and explains the ticking contribution');

console.log('== the peace table marks aligned terms ==');
await page.locator('#war-modal [data-ref="negotiate"]').click();
await page.waitForSelector('#peace-modal:not(.hidden)');
const peaceText = await page.locator('#peace-modal').textContent();
ok(peaceText.includes(staged.targetName) && /war goal/.test(peaceText),
  'the claimed province is visibly marked as a war-goal demand');
ok(errors.length === 0, 'zero page errors');

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
