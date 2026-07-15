// UI verification — v2.4: 1948 era place-names on the live map, scaled develop
// buttons, guarantee/subsidy diplomacy buttons, reparations at the peace table.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/claude-0/-home-user-judaea-universalis/14e3ad23-6546-5a93-b028-f73783a98caf/scratchpad') + '/');
const { chromium } = require('playwright');
const OUT = (process.env.JU_OUT || '/tmp') + '/';

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.bm-card', { timeout: 20000 });
for (let i = 0; i < 10; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('Independence')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click(); // ISR
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(600);

console.log('== the map speaks 1948 ==');
const renamed = await page.evaluate(() => ({
  joppa: window._ctx.prov('Joppa').name,
  aliased: window._ctx.prov('Tel Aviv-Jaffa') === window._ctx.prov('Joppa'),
}));
ok(renamed.joppa === 'Tel Aviv-Jaffa' && renamed.aliased, 'Joppa is Tel Aviv-Jaffa in state (its raster sliver is too small to label)');
await page.evaluate(() => {
  const p = window._ctx.prov('Memphis'); // Cairo: a big, labelable cell
  window._camera.centerOn(p.x, p.y, 1.8);
});
await page.waitForTimeout(700);
const labels = await page.evaluate(() =>
  [...document.querySelectorAll('#labels-layer .mlabel')].map((d) => d.textContent));
ok(labels.some((t) => t === 'Cairo'), 'the map label reads Cairo: '
  + JSON.stringify(labels.filter((t) => /Cairo|Luxor|Port Said|Faiyum/.test(t))));
await page.screenshot({ path: OUT + 'v24-1948-names.png' });

console.log('== develop buttons with scaled costs ==');
await page.evaluate(() => {
  const id = window._ctx.provId('Joppa');
  window._ctx.game.ui.selectedProv = id;
  window._ctx.bus.emit('select', id);
});
// open via click on the map center (panel opens through UI paths) — use actions instead
const devInfo = await page.evaluate(() => window._actions.getDevelopInfo(window._ctx.provId('Joppa')));
ok(devInfo && devInfo.tax.cost === 50 + 5 * 30, 'Tel Aviv (30 dev) costs ' + devInfo.tax.cost + ' to develop');
const devWorks = await page.evaluate(() => {
  const g = window._ctx.game;
  g.tags.ISR.points.gov = 999;
  const before = window._ctx.prov('Joppa').dev.tax;
  window._actions.devProvince(window._ctx.provId('Joppa'), 'tax');
  return { before, after: window._ctx.prov('Joppa').dev.tax };
});
ok(devWorks.after === devWorks.before + 1, 'develop works in-browser: tax ' + devWorks.before + ' → ' + devWorks.after);

console.log('== guarantee & subsidy in the sim ==');
const dip = await page.evaluate(() => {
  const g = window._ctx.game;
  g.tags.ISR.points.infl = 200;
  g.tags.ISR.treasury = 300;
  // Turkey is neutral: a valid guarantee/subsidy target
  window._actions.guaranteeNation('TUR');
  window._actions.sendSubsidy('TUR');
  return {
    guarantees: g.tags.ISR.guarantees.slice(),
    subsidies: g.subsidies.map((s) => s.from + '->' + s.to + ':' + s.amount),
    dip: window._actions.getDiplomacy('TUR'),
  };
});
ok(dip.guarantees.indexOf('TUR') >= 0, 'guarantee recorded: ' + dip.guarantees.join(','));
ok(dip.subsidies.length === 1, 'subsidy flowing: ' + dip.subsidies.join(','));
ok(dip.dip.weGuarantee && dip.dip.subsidyOut, 'getDiplomacy reports both');

console.log('== reparations checkbox at the peace table ==');
const hasRepBox = await page.evaluate(() => {
  // open the peace dialog for the coalition war
  const w = window._ctx.game.wars[0];
  return new Promise((res) => {
    document.querySelector(`[data-peace="${w.id}"]`) ? null : null;
    res(!!w);
  });
});
ok(hasRepBox, 'the coalition war exists for the peace UI');
await page.evaluate(() => {
  const w = window._ctx.game.wars[0];
  w.noNegotiation = false;
});
await page.locator('.tb-flag').click();
await page.waitForTimeout(400);
await page.locator('.np-dove').first().click();
await page.waitForTimeout(400);
const repBox = await page.locator('#peace-modal [data-ref="reparations"]').count();
ok(repBox === 1, 'Demand war reparations is on the table');
await page.screenshot({ path: OUT + 'v24-peace.png' });

console.log('== no page errors ==');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
