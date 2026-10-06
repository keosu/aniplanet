import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { expect } from "@playwright/test";

export async function checkPwa(browser, base) {
  // PWA installation is unavailable in incognito contexts. Use an isolated,
  // disposable profile, never the user's real browser profile.
  const profileRoot = resolve("test-results");
  await mkdir(profileRoot, { recursive: true });
  const profile = await mkdtemp(resolve(profileRoot, "pwa-profile-"));
  const context = await browser.browserType().launchPersistentContext(profile, {
    executablePath: (process.env.BROWSER_PATH ?? (process.platform === "win32"
      ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" : undefined)) || undefined,
    headless: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const swPath = new URL("../dist/sw.js", import.meta.url);
  const originalWorker = await readFile(swPath, "utf8");
  try {
    await page.goto(base);
    await page.getByRole("button", { name: "设置与说明", exact: true }).click();
    await expect(page.locator(".pwa-status")).toContainText("离线内容已就绪", { timeout: 60000 });
    const manifestUrl = await page.locator('link[rel="manifest"]').getAttribute("href");
    assert.equal(new URL(manifestUrl, base).href, `${base}manifest.webmanifest`);
    const manifest = await (await page.request.get(`${base}manifest.webmanifest`)).json();
    for (const field of ["id", "scope", "start_url"])
      assert.equal(new URL(manifest[field], `${base}manifest.webmanifest`).href, base, field);
    assert.equal(manifest.display, "standalone");
    for (const icon of manifest.icons) {
      assert.ok(new URL(icon.src, base).href.startsWith(base));
      const dimensions = await page.evaluate(async (url) => {
        const image = new Image();
        image.src = url;
        await image.decode();
        return `${image.naturalWidth}x${image.naturalHeight}`;
      }, new URL(icon.src, base).href);
      assert.equal(dimensions, icon.sizes);
    }
    const touchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
    assert.equal(new URL(touchIcon, base).href, `${base}icons/apple-touch-icon.png`);
    const registration = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return { scope: registration.scope, script: registration.active.scriptURL };
    });
    assert.deepEqual(registration, { scope: base, script: `${base}sw.js` });
    const cdp = await context.newCDPSession(page);
    const installation = await cdp.send("Page.getInstallabilityErrors");
    assert.deepEqual(installation.installabilityErrors, [], "Chromium installability requirements");
    const cached = await page.evaluate(async () => {
      const cachesForSite = await caches.keys();
      const entries = await Promise.all(cachesForSite.map(async (key) => (await (await caches.open(key)).keys()).map((request) => request.url)));
      return entries.flat();
    });
    for (const file of await readdir(new URL("../public/images/", import.meta.url))) {
      assert.ok(cached.some((url) => new URL(url).pathname === new URL(`images/${file}`, base).pathname), `Offline image: ${file}`);
    }
    assert.ok(cached.every((url) => url.startsWith(base)), "Cache stays inside this app's scope");
    await page.getByRole("button", { name: "English", exact: true }).click();
    await page.getByRole("button", { name: "Large", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Save animal", exact: true }).click();
    const preferences = await page.evaluate(() => ({
      settings: localStorage.getItem("wild-atlas-preferences"), saved: localStorage.getItem("wild-atlas-saved"),
    }));
    // Reopen while offline, including a species and a lazy 3D chunk never opened online.
    await context.setOffline(true);
    await page.close();
    const offline = await context.newPage();
    offline.on("pageerror", (error) => errors.push(error.message));
    await offline.goto(base);
    await expect(offline.locator("html")).toHaveAttribute("lang", "en");
    await expect(offline.locator("html")).toHaveAttribute("data-font-size", "large");
    await expect(offline.locator(".globe-canvas canvas")).toBeVisible();
    await offline.getByRole("textbox", { name: "Search species" }).fill("tiger");
    await offline.getByRole("button", { name: "Select Tiger", exact: true }).click();
    await offline.getByRole("button", { name: "View details", exact: true }).click();
    await expect.poll(() => offline.locator(".viewer-photo").evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
    await offline.getByRole("button", { name: "Sources", exact: true }).click();
    await expect(offline.getByRole("link", { name: "Original photo and license" })).toBeVisible();
    await offline.getByRole("button", { name: "Local 3D", exact: true }).click();
    await expect(offline.locator(".animal-canvas canvas")).toBeVisible();
    await offline.keyboard.press("Escape");
    await offline.getByRole("button", { name: "Settings and guide", exact: true }).click();
    await expect(offline.locator(".pwa-status")).toContainText("Ready for offline use");
    assert.equal(await offline.evaluate(() => localStorage.getItem("wild-atlas-saved")), preferences.saved);

    // Exercise a real waiting worker and the explicit update action. Restore dist
    // before CI uploads it; never publish this test-only service-worker revision.
    await context.setOffline(false);
    await writeFile(swPath, `${originalWorker}\n// PWA update verification\n`);
    await offline.evaluate(async () => (await navigator.serviceWorker.ready).update());
    await expect(offline.getByRole("button", { name: "Update and reopen" })).toBeVisible({ timeout: 30000 });
    await Promise.all([
      offline.waitForEvent("load"),
      offline.getByRole("button", { name: "Update and reopen" }).click(),
    ]);
    assert.deepEqual(await offline.evaluate(() => ({
      settings: localStorage.getItem("wild-atlas-preferences"), saved: localStorage.getItem("wild-atlas-saved"),
    })), preferences, "An update preserves preferences and favorites");
    assert.deepEqual(errors, []);
    const failed = await browser.newPage();
    try {
      await failed.addInitScript(() => {
        navigator.serviceWorker.register = async () => { throw new Error("Storage unavailable"); };
      });
      await failed.goto(base);
      await failed.getByRole("button", { name: "设置与说明", exact: true }).click();
      await expect(failed.locator(".pwa-status")).toContainText("离线内容尚未就绪");
      await failed.keyboard.press("Escape");
      await failed.getByRole("button", { name: "查看详情", exact: true }).click();
      await expect(failed.locator(".viewer-photo")).toBeVisible();
    } finally {
      await failed.close();
    }
    console.log("PWA verified: manifest, installability, scoped precache, offline cold start/photos/lazy 3D, and real service-worker update preserving user data.");
  } finally {
    await writeFile(swPath, originalWorker);
    await context.close();
    assert.ok(resolve(profile).startsWith(`${profileRoot}${sep}pwa-profile-`));
    await rm(profile, { recursive: true, force: true });
  }
}
