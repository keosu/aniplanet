import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.BASE_URL || "http://localhost:5175/";
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base, { waitUntil: "networkidle" });
  const species = await page.evaluate(async () => (await import("/src/data.ts")).animals);
  assert.equal(species.length, 125);
  assert.equal(new Set(species.map(a => a.id)).size, 125);
  assert.equal(new Set(species.map(a => a.latin)).size, 125);
  const credits = JSON.parse(await fs.readFile("public/image-credits.json", "utf8"));
  const availableOnly = process.argv.includes("--available");
  const pool = availableOnly ? species.filter(a => credits.find(c => c.id === a.id)) : species;
  const results = await page.evaluate(async animals => Promise.all(animals.map(async a => {
    const image = new Image();
    image.src = `/images/${a.id}.jpg`;
    try { await image.decode(); return { id: a.id, width: image.naturalWidth, height: image.naturalHeight }; }
    catch { return { id: a.id, width: 0, height: 0 }; }
  })), pool);
  assert.deepEqual(results.filter(a => a.width < 200 || a.height < 150), [], "Every species has a decodable photograph");
  for (const a of pool) {
    const credit = credits.find(c => c.id === a.id);
    assert.ok(credit?.license && credit?.artist && credit?.source, `${a.id}: attribution is complete`);
    assert.ok(a.lat >= -90 && a.lat <= 90 && a.lng >= -180 && a.lng <= 180);
  }
  console.log(`PASS: ${pool.length} local photographs decode; all have author, license and source`);
  const extra = pool.filter(a => !a.shape);
  await page.goto(`${base}image-credits.json`);
  for (let i = 0; i < extra.length; i += 32) {
    await page.setContent(`<meta charset="utf-8"><style>body{margin:0;background:#17241e;color:#dceacb;font:12px sans-serif;display:grid;grid-template-columns:repeat(8,1fr);gap:8px;padding:12px}figure{margin:0}img{width:100%;height:132px;object-fit:cover}figcaption{padding:6px 0}small{display:block;color:#8da28b;font-size:10px}</style>${extra.slice(i, i + 32).map(a => `<figure><img src="${base}images/${a.id}.jpg" style="object-position:${a.imagePosition || "50% 50%"}"><figcaption>${a.name}<small>${a.id}</small></figcaption></figure>`).join("")}`);
    await page.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
    await page.screenshot({ path: `test-results/species-contact-${Math.floor(i / 32) + 1}.png`, fullPage: true });
  }
} finally { await browser.close(); }
