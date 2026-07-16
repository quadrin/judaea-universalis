// Browser regression — the settlement control (SPEC §43) renders in the province
// panel, gates on influence, and opening a real project shows its progress row.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
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
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

async function startBookmark(dot) {
  await page.waitForSelector('.bm-card');
  await page.locator(`.ss-dot[data-dot="${dot}"]`).click();
  await page.locator('.bm-card.current').click();
  await page.waitForSelector('.nation-card');
  await page.locator('.nation-card').first().click();
  await page.waitForFunction(() => !!window._ctx && !!window._renderer && !!window._camera);
  await page.waitForFunction(() => Math.abs(window._camera.zoom - 1.8) < 0.01);
}

// Screen point over a safely interior pixel of a named province.
async function clickPointFor(name) {
  return page.evaluate((provName) => {
    const ctx = window._ctx; const renderer = window._renderer;
    const id = ctx.MAP_DATA.provinces.findIndex((p) => p.name === provName) + 1;
    const c = ctx.geom.centroids[id];
    let best = -1; let bestD = Infinity;
    for (let i = 0; i < renderer.idArray.length; i++) {
      if (renderer.idArray[i] !== id) continue;
      const x = i % ctx.MAP_DATA.MAP_W; const y = Math.floor(i / ctx.MAP_DATA.MAP_W);
      const d = (x - c.x) ** 2 + (y - c.y) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    }
    const [sx, sy] = window._camera.mapToScreen(best % ctx.MAP_DATA.MAP_W,
      Math.floor(best / ctx.MAP_DATA.MAP_W));
    const rect = document.getElementById('map-container').getBoundingClientRect();
    return { x: rect.left + sx, y: rect.top + sy };
  }, name);
}

await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });

console.log('== settlement control in 1948 ==');
await startBookmark(7); // Israel, the only playable side in 1948

// Fund the crown's influence so the project is affordable, and record the
// starting state of an Israeli rural province the player can grow into a town.
const before = await page.evaluate(() => {
  window._ctx.game.tags.ISR.points.infl = 999;
  const id = window._ctx.MAP_DATA.provinces.findIndex((p) => p.name === 'Netanya') + 1;
  const p = window._ctx.game.provinces[id];
  return { habitation: p.habitation, owner: p.owner, infl: window._ctx.game.tags.ISR.points.infl };
});
ok(before.owner === 'ISR' && before.habitation === 'rural', 'Netanya is an Israeli rural province');

const netanya = await clickPointFor('Netanya');
await page.mouse.click(netanya.x, netanya.y);
await page.waitForSelector('#province-panel:not(.hidden)');
ok((await page.locator('#province-panel h2').textContent()) === 'Netanya',
  'the Netanya province panel opens');

const settleBtn = page.locator('#province-panel [data-integ="settle"]');
ok(await settleBtn.isVisible(), 'the Settle the Land control is offered on settleable owned land');
ok(!(await settleBtn.evaluate((b) => b.classList.contains('disabled'))),
  'with influence in hand the control is enabled');
ok(/town/i.test(await settleBtn.evaluate((b) => b.dataset.tt || '')),
  'its tooltip names the tier the project will reach');

await settleBtn.click();
await page.waitForSelector('#province-panel [data-ref="settleRow"]:not(.hidden)');
const after = await page.evaluate(() => {
  const id = window._ctx.MAP_DATA.provinces.findIndex((p) => p.name === 'Netanya') + 1;
  const p = window._ctx.game.provinces[id];
  return {
    settlement: !!p.settlement,
    months: p.settlement ? p.settlement.monthsLeft : 0,
    infl: window._ctx.game.tags.ISR.points.infl,
    rowText: document.querySelector('#province-panel [data-ref="settleRow"]').textContent,
  };
});
ok(after.settlement && after.months > 0, 'clicking opens a real settlement project in the sim');
ok(after.infl < before.infl, 'starting the project spends influence');
ok(/settlers arriving/i.test(after.rowText), 'the panel shows the project under way');
ok(!(await settleBtn.isVisible()), 'the settle button gives way to the progress row while it runs');

ok(errors.length === 0, 'no browser or WebGL errors: ' + JSON.stringify(errors.slice(0, 3)));
await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
