import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { preview } from "vite";

// Run against dist, never Vite's source-module server. The same check covers
// root/Capacitor builds and project Pages URLs, where absolute assets break.
const basePath = process.argv[2] || "/";
assert.match(basePath, /^\/(?:[^/]+\/)*$/, "Pass a path such as /aniplanet/");
const server = await preview({
  base: basePath,
  preview: { host: "127.0.0.1", port: 5177, strictPort: true },
});
const base = `http://127.0.0.1:5177${basePath}`;
let browser;
try {
  browser = await chromium.launch({
    executablePath:
      (process.env.BROWSER_PATH ??
        (process.platform === "win32"
          ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
          : undefined)) || undefined,
    headless: true,
  });
  const errors = [];
  const unexpectedRequests = [];
  const badResponses = [];
  const loaded = new Set();
  const newPage = async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(15000);
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 400) badResponses.push(response.url());
      if (response.ok()) loaded.add(response.url());
    });
    await page.route("**/*", (route) => {
      const url = route.request().url();
      if (url.startsWith(base)) return route.continue();
      unexpectedRequests.push(url);
      return route.abort();
    });
    return page;
  };
  const checkImages = async (page) => {
    assert.ok((await page.locator("img").count()) > 0);
    await expect.poll(() => page.locator("img").evaluateAll((images) =>
      images.every((img) => img.complete && img.naturalWidth > 0),
    )).toBe(true);
  };
  const page = await newPage();
  await page.goto(base, { waitUntil: "networkidle" });
  await expect(page.locator(".species-row").first()).toBeVisible();
  await expect(page.locator(".globe-canvas canvas")).toBeVisible();
  await checkImages(page);
  for (const texture of ["earth.jpg", "earth-normal.jpg", "earth-specular.jpg", "earth-clouds.png"]) {
    assert.ok(loaded.has(`${base}images/${texture}`), `Globe texture: ${texture}`);
  }
  const favicon = await page.locator('link[rel="icon"]').getAttribute("href");
  assert.equal(new URL(favicon, base).href, `${base}favicon.svg`);
  const icon = await page.request.get(new URL(favicon, base).href);
  assert.ok(icon.ok());
  assert.match(icon.headers()["content-type"], /image\/svg\+xml/);

  await page.getByRole("button", { name: "查看详情", exact: true }).click();
  await expect(page.locator(".viewer-photo")).toBeVisible();
  await checkImages(page);
  await page.getByRole("button", { name: "来源", exact: true }).click();
  await expect(page.getByRole("link", { name: "原图与许可" })).toBeVisible();
  assert.ok(loaded.has(`${base}image-credits.json`));
  await page.getByRole("button", { name: "本地示意", exact: true }).click();
  await expect(page.locator(".animal-canvas canvas")).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "设置与说明", exact: true }).click();
  await page.getByRole("tab", { name: "使用说明", exact: true }).click();
  for (const [name, file] of [
    ["影像来源清单", "image-credits.json"],
    ["模型来源清单", "model-credits.json"],
  ]) {
    const href = await page.getByRole("link", { name }).getAttribute("href");
    assert.equal(new URL(href, base).href, `${base}${file}`);
    const response = await page.request.get(new URL(href, base).href);
    assert.ok(response.ok());
    const json = await response.json();
    assert.ok(file === "image-credits.json" ? json.length > 0 : Object.keys(json.models).length > 0);
  }

  // WebGL fallback photos must also remain inside the deployed subpath.
  const fallback = await newPage();
  await fallback.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type.includes("webgl")) return null;
      return getContext.call(this, type, ...args);
    };
  });
  await fallback.goto(base, { waitUntil: "networkidle" });
  await expect(fallback.locator(".globe-fallback img")).toBeVisible();
  await fallback.getByRole("button", { name: "查看详情", exact: true }).click();
  await fallback.getByRole("button", { name: "本地示意", exact: true }).click();
  await expect(fallback.locator(".scene-fallback img")).toBeVisible();
  await checkImages(fallback);
  assert.deepEqual(unexpectedRequests, [], "All local assets stay within the deployment base");
  assert.deepEqual(badResponses, [], "No missing assets");
  assert.deepEqual(errors, [], "No browser exceptions");
  console.log(`Production website verified at ${basePath}: photos, textures, credits, lazy 3D and WebGL fallbacks.`);
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}
