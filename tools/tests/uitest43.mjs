// UI verification — SPEC §202: the chancery, in a real browser.
//
// The headless suite (smoke130) proves the arithmetic. This one proves the
// three things only a browser can:
//
//   1. The realm panel carries a Chancery block on The World: seats spent
//      over seats staffed, and it MOVES when a bond is written.
//   2. A full chancery greys the verbs that would write another — the
//      province panel's alliance button says why, in words, on the button.
//   3. The match has a way out that is not a war: the old dead "Houses
//      Joined" plate is a live "Annul the Match" button, one press frees the
//      seat, and the Chancery block counts down to prove it.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
const BOOT_MS = Number(process.env.JU_BOOT_TIMEOUT || 240000);

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const browser = await chromium.launch({
  executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.bm-card', { timeout: BOOT_MS });
// 66 CE, Judaea — the chapter every diplomacy suite convenes in.
for (let i = 0; i < 10; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('Great Revolt')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(500);

// The panel's Chancery row, as the player reads it.
const chancery = () => page.evaluate(() => {
  const secs = [...document.querySelectorAll('#nation-panel .np-dip-sec')];
  const head = secs.find((s) => /chancery/i.test(s.textContent || ''));
  if (!head) return null;
  const row = head.nextElementSibling;
  return {
    label: (row.querySelector('.np-dip-name') || {}).textContent || '',
    seats: (row.querySelector('.np-dip-ws') || {}).textContent || '',
    tip: row.dataset ? row.dataset.tt || '' : '',
    strain: !!document.querySelector('#nation-panel .np-dip-row .np-dip-name')
      && [...document.querySelectorAll('#nation-panel .np-dip-name')]
        .some((n) => /collars chafe/i.test(n.textContent || '')),
  };
});
const openPanel = async () => {
  await page.locator('.tb-flag').click();
  await page.waitForSelector('#nation-panel:not(.hidden)');
  await page.locator('#nation-panel .np-tab[data-tab-go="world"]').click();
  await page.waitForTimeout(150);
};
const closePanel = () => page.locator('#nation-panel [data-ref="close"]').click();

console.log('== the realm panel counts the establishment ==');
await openPanel();
{
  const c = await chancery();
  ok(!!c, 'The World carries a Chancery block');
  ok(/^\s*0 \/ [1-9]/.test(c.seats), 'a court with no standing bonds spends none of it: ' + c.seats.trim());
  ok(/standing bond/i.test(c.tip) && /peace table/i.test(c.tip),
    'and the tooltip explains the seats and the one door that ignores them');
}

console.log('== writing a bond moves the count ==');
{
  await page.evaluate(() => {
    const g = window._ctx.game;
    g.tags.JUD.marriages = ['NAB'];
    g.tags.NAB.marriages = ['JUD'];
    g.tags.NAB.opinion = g.tags.NAB.opinion || {};
    g.tags.NAB.opinion.JUD = 150;
    window._ctx.bus.emit('day', { date: { ...g.date } });
  });
  await page.waitForTimeout(200);
  const c = await chancery();
  ok(/^\s*1 \/ /.test(c.seats), 'the match takes a seat: ' + c.seats.trim());
  ok(/Royal marriage/i.test(c.tip), 'and the tooltip names what is holding it');
}

console.log('== the match has a way out that is not a war ==');
await closePanel();
{
  const nab = await page.evaluate(() => {
    const ctx = window._ctx;
    const g = ctx.game;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (p && !p.impassable && p.owner === 'NAB') {
        ctx.bus.emit('mapclick', { provId: i, armyId: null });
        return { id: i, name: p.name };
      }
    }
    return null;
  });
  ok(!!nab, 'a Nabataean province opens the diplomacy block');
  await page.waitForSelector('#province-panel:not(.hidden)');
  const btn = page.locator('#province-panel [data-ref="dipMarry"]');
  const label = ((await btn.textContent()) || '').trim();
  ok(label === 'Annul the Match', 'the joined houses offer an annulment, not a dead plate: ' + label);
  ok(!(await btn.evaluate((el) => el.classList.contains('disabled'))), 'and the button is live');
  const tip = await btn.evaluate((el) => el.dataset.tt || '');
  ok(/chancery/i.test(tip) && /regard for us falls/i.test(tip),
    'the tooltip prices it in a seat and in their regard');
  await btn.click();
  await page.waitForTimeout(200);
  const gone = await page.evaluate(() => {
    const g = window._ctx.game;
    return !(g.tags.JUD.marriages || []).length && !(g.tags.NAB.marriages || []).includes('JUD');
  });
  ok(gone, 'one press sends the match home, from both houses');
  await openPanel();
  const c = await chancery();
  ok(/^\s*0 \/ /.test(c.seats), 'and the seat is free again: ' + c.seats.trim());
}

console.log('== a full chancery says so on the button ==');
{
  await page.evaluate(() => {
    const ctx = window._ctx;
    const g = ctx.game;
    const cap = 12; // more bonds than any establishment staffs
    const others = Object.keys(g.tags).filter((k) => k !== 'JUD' && k !== 'NAB' && k !== 'REB'
      && g.tags[k] && g.tags[k].alive).slice(0, cap);
    g.tags.JUD.allies = others;
    for (const k of others) g.tags[k].allies = [...(g.tags[k].allies || []), 'JUD'];
    g.tags.NAB.opinion.JUD = 200;
    ctx.bus.emit('day', { date: { ...g.date } });
  });
  await page.waitForTimeout(200);
  const c = await chancery();
  ok(/overstretched/i.test(c.label), 'the panel calls an overstretched chancery what it is: ' + c.label.trim());
  ok(/influence a month/i.test(c.tip), 'and says what the overage costs every month');
  await closePanel();
  await page.evaluate(() => {
    const ctx = window._ctx;
    const g = ctx.game;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (p && !p.impassable && p.owner === 'NAB') { ctx.bus.emit('mapclick', { provId: i, armyId: null }); return; }
    }
  });
  await page.waitForSelector('#province-panel:not(.hidden)');
  const ally = page.locator('#province-panel [data-ref="dipAlly"]');
  ok(await ally.evaluate((el) => el.classList.contains('disabled')),
    'a devoted neighbour cannot be allied with every seat spent');
  const tip = await ally.evaluate((el) => el.dataset.tt || '');
  ok(/chancery is full/i.test(tip), 'and the button says why: ' + tip.split('\n')[0]);
}

console.log('== the collars chafe, and the panel shows it ==');
{
  await page.evaluate(() => {
    const ctx = window._ctx;
    const g = ctx.game;
    g.tags.JUD.allies = [];
    let collared = 0;
    for (const k of Object.keys(g.tags)) {
      const t = g.tags[k];
      if (!t || !t.alive || k === 'JUD' || k === 'REB' || k === 'ROM' || t.overlord) continue;
      t.overlord = 'JUD';
      t.allies = [];
      if (++collared >= 6) break;
    }
    ctx.bus.emit('day', { date: { ...g.date } });
  });
  await page.waitForTimeout(200);
  await openPanel();
  const c = await chancery();
  ok(c.strain, 'six collars put a chafing line on the panel');
  ok(/collars chafe/i.test(c.tip) || /client kingdoms/i.test(c.tip),
    'and the Chancery tooltip accounts for them');
}

ok(!errors.length, 'no console errors: ' + errors.slice(0, 2).join(' | '));
await browser.close();
console.log(failures ? `uitest43: ${failures} FAILURES` : 'uitest43: ALL PASS');
process.exit(failures ? 1 : 0);
