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
const base = process.env.BASE_URL || "http://localhost:5175/";
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const errors = [],
    external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (route) => {
    if (!route.request().url().startsWith(base)) {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const data = await page.evaluate(
    async () => (await import("/src/data.ts")).animals,
  );
  assert.equal(data.length, 125);
  assert.equal(data.filter((a) => a.china).length, 42);
  assert.equal(await page.locator(".map-pin").count(), 42);
  assert.equal(
    (await page.locator(".catalog-heading h1").innerText()).replace(/\s/g, ""),
    "中国物种42",
  );
  assert.deepEqual(external, [], "No third-party dependency on initial load");
  await page.screenshot({ path: "test-results/app-desktop.png" });
  const firstIds = await page.locator(".species-row").allTextContents();
  await page.getByRole("button", { name: "下一页物种" }).click();
  assert.notDeepEqual(
    await page.locator(".species-row").allTextContents(),
    firstIds,
  );
  await page.getByRole("textbox", { name: "搜索物种" }).fill("雪豹");
  await page.getByRole("button", { name: "选择雪豹", exact: true }).click();
  await page.getByRole("button", { name: "查看详情", exact: true }).click();
  assert.ok(await page.locator(".viewer-photo").isVisible());
  assert.equal(await page.locator("iframe").count(), 0);
  assert.equal(
    await page.getByRole("button", { name: "在线 3D ↗", exact: true }).count(),
    0,
  );
  await page.getByRole("button", { name: "来源", exact: true }).click();
  await page.getByRole("link", { name: "原图与许可" }).waitFor();
  await page.getByRole("button", { name: "资料", exact: true }).click();
  await page.screenshot({ path: "test-results/app-detail.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "清空搜索" }).click();
  await page.getByRole("button", { name: "高山", exact: true }).click();
  const mountainIds = await page
    .locator(".map-pin")
    .evaluateAll((p) => p.map((x) => x.dataset.animal));
  assert.ok(
    mountainIds.includes("snow-leopard") &&
      mountainIds.includes("tibetan-antelope"),
  );
  assert.ok(
    mountainIds.every(
      (id) => data.find((a) => a.id === id).habitat === "mountain",
    ),
  );
  await page.getByRole("button", { name: "全球 125", exact: true }).click();
  assert.equal(await page.locator(".map-pin").count(), 125);
  await page.getByRole("textbox", { name: "搜索物种" }).fill("非洲狮");
  await page.getByRole("button", { name: "选择非洲狮", exact: true }).click();
  await page.getByRole("button", { name: "收藏动物", exact: true }).click();
  await page.getByRole("button", { name: "查看详情", exact: true }).click();
  assert.equal(await page.locator("iframe").count(), 0);
  await page.getByRole("button", { name: "本地示意", exact: true }).click();
  await page.locator(".animal-canvas canvas").waitFor();
  await page.getByRole("button", { name: "暂停动物动画", exact: true }).click();
  await page.getByRole("button", { name: "下载", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载本地示意模型 · GLB" }).click();
  const download = await downloadPromise;
  await download.saveAs("test-results/app-lion.glb");
  const bytes = await fs.readFile("test-results/app-lion.glb");
  assert.equal(bytes.toString("utf8", 0, 4), "glTF");
  await page.keyboard.press("Escape");
  assert.deepEqual(
    external,
    [],
    "Local 3D, photo and GLB export work with external requests blocked",
  );
  await page.reload({ waitUntil: "networkidle" });
  assert.ok(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("wild-atlas-saved")).includes("lion"),
    ),
  );
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [768, 1024],
    [390, 844],
    [360, 640],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(200);
    assert.equal(
      await page.evaluate(
        () =>
          document.documentElement.scrollHeight > innerHeight ||
          document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `${width}x${height}: no page overflow`,
    );
    if (width <= 850)
      await page
        .getByRole("button", { name: "打开物种列表", exact: true })
        .click();
    await page.waitForFunction(
      () =>
        document
          .querySelector(".species-row:last-child")
          .getBoundingClientRect().bottom <=
        document.querySelector(".species-list").getBoundingClientRect().bottom +
          1,
    );
    const bounds = await page.locator(".species-list").boundingBox();
    const lastRow = await page.locator(".species-row").last().boundingBox();
    assert.ok(
      lastRow.y + lastRow.height <= bounds.y + bounds.height + 1,
      "Pagination fits the panel height",
    );
    if (width <= 850)
      await page
        .getByRole("button", { name: "关闭物种列表", exact: true })
        .click();
    if (width === 390)
      await page.screenshot({ path: "test-results/app-mobile.png" });
    await page.getByRole("button", { name: "查看详情", exact: true }).click();
    const dialog = await page.getByRole("dialog").boundingBox();
    assert.ok(
      dialog.x >= 0 &&
        dialog.y >= 0 &&
        dialog.x + dialog.width <= width &&
        dialog.y + dialog.height <= height,
    );
    await page.getByRole("button", { name: "下载", exact: true }).click();
    await page.getByRole("button", { name: "来源", exact: true }).click();
    await page.keyboard.press("Escape");
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 125 species / 42 China; filters, pagination, local-only content, GLB, persistence, and six viewport layouts",
  );
} finally {
  await browser.close();
}
