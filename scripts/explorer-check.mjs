import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

await fs.mkdir("test-results", { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_PATH ||
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const base = process.env.BASE_URL || "http://localhost:5175/";
const markerState = () =>
  page
    .locator(".map-pin")
    .evaluateAll((pins) =>
      pins.map((p) => [
        p.dataset.animal,
        p.style.transform,
        p.style.visibility,
      ]),
    );
await page.goto(base, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "全球 125", exact: true }).click();
await page.waitForTimeout(1000);
assert.equal(await page.locator(".map-pin").count(), 125);
assert.ok((await page.locator(".map-pin:visible").count()) > 3);
const before = await markerState();
const selected = await page.locator(".selection-title h2").textContent();
const first = await page.locator(".map-pin:visible").first().boundingBox();
await page.mouse.move(first.x + 20, first.y + 20);
await page.mouse.down();
await page.mouse.move(first.x + 150, first.y + 90, { steps: 14 });
await page.mouse.up();
await page.waitForTimeout(500);
assert.notDeepEqual(
  await markerState(),
  before,
  "Dragging from an emoji rotates the globe",
);
assert.equal(
  await page.locator(".selection-title h2").textContent(),
  selected,
  "A drag does not select a species",
);
assert.equal(await page.locator(".globe-species-group").count(), 0);
assert.equal(
  await page.getByRole("button", { name: "开启地球自转" }).count(),
  1,
);
console.log("PASS: mouse orbit from emoji and automatic rotation cancellation");

const cluster = page
  .locator(".map-pin:visible")
  .filter({ has: page.locator(".pin-count:not(:empty)") })
  .first();
await cluster.click();
await page.locator(".globe-species-group").waitFor();
const choice = page.locator(".globe-group-list button").last();
const name = await choice
  .locator("span")
  .nth(1)
  .evaluate((el) => el.childNodes[0].textContent);
await choice.click();
assert.equal(await page.locator(".selection-title h2").textContent(), name);
console.log(
  "PASS: cluster expands and selecting a species updates the spotlight",
);

const surface = page.locator(".globe-canvas");
await surface.focus();
const keyBefore = await markerState();
await page.keyboard.press("ArrowLeft");
await page.waitForTimeout(700);
assert.notDeepEqual(
  await markerState(),
  keyBefore,
  "Keyboard rotates the globe",
);
const box = await surface.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
const wheelBefore = await markerState();
const wheelScrollBefore = await page.evaluate(() => scrollY);
await page.mouse.wheel(0, -400);
await page.waitForTimeout(400);
assert.notDeepEqual(
  await markerState(),
  wheelBefore,
  "Wheel changes camera distance",
);
assert.equal(
  await page.evaluate(() => scrollY),
  wheelScrollBefore,
  "Zoom does not scroll the page",
);
await page.screenshot({ path: "test-results/globe-emoji-desktop.png" });
console.log("PASS: keyboard orbit and wheel zoom");

async function openAnimal(name) {
  await page.getByRole("textbox", { name: "搜索物种" }).fill(name);
  await page.locator(".species-row").first().click();
  await page.getByRole("button", { name: "查看详情", exact: true }).click();
}
await openAnimal("非洲狮");
await page.getByRole("button", { name: "下载", exact: true }).click();
assert.equal(
  await page.getByRole("link", { name: "查看写实模型原作" }).count(),
  1,
);
assert.ok(
  await page.getByText("作者未开放直接下载", { exact: false }).isVisible(),
);
const downloadEvent = page.waitForEvent("download");
await page.getByRole("button", { name: "下载本地示意模型 · GLB" }).click();
const download = await downloadEvent;
assert.equal(download.suggestedFilename(), "lion-schematic.glb");
await download.saveAs("test-results/lion-schematic.glb");
const glb = await fs.readFile("test-results/lion-schematic.glb");
assert.equal(glb.toString("utf8", 0, 4), "glTF");
assert.equal(glb.readUInt32LE(4), 2);
assert.equal(glb.readUInt32LE(8), glb.length);
const json = JSON.parse(glb.toString("utf8", 20, 20 + glb.readUInt32LE(12)));
assert.ok(
  json.meshes.length > 10 &&
    json.materials.length > 0 &&
    json.images.length > 0,
);
assert.ok(
  json.images.every((image) => image.bufferView !== undefined),
  "Textures are embedded",
);
await page.screenshot({ path: "test-results/model-downloads.png" });
await page.keyboard.press("Escape");
await openAnimal("长颈鹿");
await page.getByRole("button", { name: "下载", exact: true }).click();
const link = page.getByRole("link", { name: "前往原站下载写实模型" });
assert.match(await link.getAttribute("href"), /sketchfab.com\/3d-models\//);
await page.keyboard.press("Escape");
await openAnimal("考拉");
assert.equal(await page.locator(".viewer-photo").count(), 1);
assert.equal(
  await page.getByRole("button", { name: "本地示意", exact: true }).count(),
  0,
);
assert.equal(
  await page.getByRole("button", { name: "在线 3D ↗", exact: true }).count(),
  0,
);
await page.keyboard.press("Escape");
console.log(
  "PASS: accurate model availability, download links and valid self-contained GLB export",
);

const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
await mobile.goto(base, { waitUntil: "networkidle" });
const touchSurface = mobile.locator(".globe-canvas");
assert.equal(
  await touchSurface.evaluate((el) => getComputedStyle(el).touchAction),
  "none",
);
const rect = await touchSurface.boundingBox();
const cdp = await mobile.context().newCDPSession(mobile);
const x = rect.x + rect.width / 2,
  y = Math.min(rect.y + rect.height / 2, 700);
const beforeTouch = await mobile
  .locator(".map-pin")
  .evaluateAll((pins) => pins.map((p) => p.style.transform));
const scrollBefore = await mobile.evaluate(() => scrollY);
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: [{ x, y, id: 1 }],
});
for (let i = 1; i <= 12; i++) {
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: x + i * 3, y: y - i * 8, id: 1 }],
  });
}
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchEnd",
  touchPoints: [],
});
await mobile.waitForTimeout(400);
assert.equal(await mobile.evaluate(() => scrollY), scrollBefore);
assert.notDeepEqual(
  await mobile
    .locator(".map-pin")
    .evaluateAll((pins) => pins.map((p) => p.style.transform)),
  beforeTouch,
);
assert.equal(
  await mobile.getByRole("button", { name: "开启地球自转" }).count(),
  1,
);
const beforePinch = await mobile
  .locator(".map-pin")
  .evaluateAll((pins) =>
    pins.map((p) => [p.style.transform, p.style.visibility]),
  );
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: [
    { x: x - 35, y, id: 1 },
    { x: x + 35, y, id: 2 },
  ],
});
for (let i = 1; i <= 8; i++) {
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: x - 35 - i * 5, y, id: 1 },
      { x: x + 35 + i * 5, y, id: 2 },
    ],
  });
}
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchEnd",
  touchPoints: [],
});
await mobile.waitForTimeout(400);
assert.notDeepEqual(
  await mobile
    .locator(".map-pin")
    .evaluateAll((pins) =>
      pins.map((p) => [p.style.transform, p.style.visibility]),
    ),
  beforePinch,
  "Two-finger pinch zooms",
);
assert.equal(await mobile.evaluate(() => scrollY), scrollBefore);
assert.equal(
  await mobile.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  ),
  false,
);
await mobile.screenshot({
  path: "test-results/globe-emoji-mobile.png",
  fullPage: true,
});
console.log(
  "PASS: real touch dragging rotates instead of scrolling; mobile has no overflow",
);
assert.deepEqual(errors, []);
await browser.close();
