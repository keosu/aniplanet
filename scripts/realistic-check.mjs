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
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.BASE_URL || "http://localhost:5175/", {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "全球 125", exact: true }).click();
  const models = JSON.parse(
    await fs.readFile("src/realistic-models.json", "utf8"),
  );
  const animals = await page.evaluate(
    async () => (await import("/src/data.ts")).animals,
  );
  async function open(id) {
    if (page.viewportSize().width <= 850)
      await page
        .getByRole("button", { name: "打开物种列表", exact: true })
        .click();
    await page
      .getByRole("textbox", { name: "搜索物种" })
      .fill(animals.find((a) => a.id === id).name);
    await page
      .getByRole("button", {
        name: `选择${animals.find((a) => a.id === id).name}`,
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: "查看详情", exact: true }).click();
    assert.equal(
      await page.locator("iframe").count(),
      0,
      "Online model is opt-in",
    );
    await page.getByRole("button", { name: "在线 3D ↗", exact: true }).click();
  }
  for (const id of process.argv.includes("--all-models")
    ? Object.keys(models)
    : ["lion"]) {
    await open(id);
    await page.locator('[data-model-status="ready"]').waitFor();
    await page.waitForFunction(() =>
      document
        .querySelector(".realistic-viewer")
        ?.getAttribute("data-active-animation"),
    );
    await page
      .getByRole("button", { name: "暂停动物动画", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "播放动物动画", exact: true })
        .count(),
      1,
    );
    await page.screenshot({ path: `test-results/realistic-${id}.png` });
    await page.getByRole("button", { name: "摄影", exact: true }).click();
    assert.ok(await page.locator(".viewer-photo").isVisible());
    assert.equal(
      await page.evaluate(() => window.sketchfabAPIinstances?.length || 0),
      0,
    );
    await page.keyboard.press("Escape");
    console.log("READY", id);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await open("lion");
  await page.locator('[data-model-status="ready"]').waitFor();
  await page.screenshot({ path: "test-results/realistic-mobile.png" });
  const buttons = await page.locator(".model-control-bar").boundingBox();
  assert.ok(buttons.y + buttons.height < 844);
  await page.keyboard.press("Escape");
  await page.route("**/sketchfab.com/models/**/embed?**", (route) =>
    route.abort(),
  );
  await open("lion");
  await page
    .getByRole("button", { name: "查看本地摄影", exact: true })
    .waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: "查看本地摄影", exact: true }).click();
  assert.ok(await page.locator(".viewer-photo").isVisible());
  assert.equal(await page.locator("iframe").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: opt-in online 3D, animation, cleanup, mobile controls and network failure fallback",
  );
} finally {
  await browser.close();
}
